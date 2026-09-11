"use server";

// PayMongo payout-onboarding server action (PAY-04, D-12/D-14, threats T-06-IDOR/T-06-PRIV/T-06-LINK).
//
// This is the host's entry into PayMongo hosted payout onboarding (Platforms / Linked Accounts). It is
// invoked LAZILY — only when the host clicks "Set up payouts" (D-12: nudge, never block publish). It
// does three things, in order:
//   1. SESSION GATE — resolve the caller's session LOCALLY via auth.api.getSession (we need BOTH the
//      user id AND the email; capability.ts's requireUserId is module-private and email-less, so we do
//      NOT import it — we read the session inline here).
//   2. RATE-LIMIT + AUDIT (WR-06) — bound every authenticated invocation to 5/60s per identity before
//      it can write a denial audit record or reach a provider-facing operation.
//   3. HOST-CAPABILITY GATE — re-read canHost from the caller's user row; a host route layout can be
//      bypassed by a direct Server Action POST, so it is not this action's authorization boundary.
//   4. CREATE-ONCE UNDER A ROW LOCK — ensure at most ONE PayMongo Linked Account per host even under
//      concurrent clicks (a plain check-then-act races and orphans a second account), then ALWAYS mint
//      a FRESH single-use onboarding link (never cache the URL) and hand its URL back to the client.
//
// paymongoAccountId is persisted SERVER-SIDE here; payoutsEnabled is NEVER touched by this action —
// only the merchant.activated webhook may set it (single writer; mirrors the input:false discipline).

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { absolutePublicUrl } from "@/lib/app-origins";
import { db } from "@/lib/db";
import { hostPayout, user } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { createLinkedAccount, createOnboardingLink } from "@/lib/paymongo";

export type OnboardingResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

// WR-06: same 5/60s per-identity budget as the capability-activate actions (keyed on the user id).
const ONBOARD_RATE_LIMIT = { window: 60, max: 5 } as const;

/**
 * Resolve the signed-in user's id AND email, or null when there is no session. Read inline (NOT via
 * capability.ts's private, email-less requireUserId) because createLinkedAccount needs the email.
 */
async function resolveSession(): Promise<{ userId: string; email: string } | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) return null;
  return { userId, email };
}

/**
 * Create-once under a row lock: ensure the caller's host_payout row exists, SELECT ... FOR UPDATE it to
 * serialize concurrent callers, and INSIDE the lock create the Linked Account only if one is not already
 * stored. Returns the (existing or freshly created) paymongoAccountId. Because the create happens under
 * the lock, at most ONE Linked Account is ever created per host (D-14).
 */
async function ensureLinkedAccount(userId: string, email: string): Promise<string> {
  return db.transaction(async (tx) => {
    // Ensure a row exists so FOR UPDATE has something to lock (idempotent; other columns default).
    await tx.insert(hostPayout).values({ userId }).onConflictDoNothing();

    // Row-lock the caller's own row — concurrent onboarding starts now serialize here.
    const locked = await tx
      .select({ paymongoAccountId: hostPayout.paymongoAccountId })
      .from(hostPayout)
      .where(eq(hostPayout.userId, userId))
      .for("update");

    const existing = locked[0]?.paymongoAccountId;
    if (existing) return existing;

    // No account yet — create EXACTLY one and persist its id server-side (never client-settable).
    const account = await createLinkedAccount({ email });
    await tx
      .update(hostPayout)
      .set({ paymongoAccountId: account.id })
      .where(eq(hostPayout.userId, userId));
    return account.id;
  });
}

/**
 * Start (or resume) PayMongo hosted payout onboarding for the signed-in host. Lazily creates the
 * host's single Linked Account (row-lock guarded), mints a fresh single-use onboarding link, and
 * returns its URL for the client to redirect to. Rate-limited + audited (WR-06).
 */
export async function startPayoutOnboarding(): Promise<OnboardingResult> {
  const resolved = await resolveSession();
  if (!resolved) {
    return { ok: false, error: "You must be signed in to set up payouts." };
  }
  const { userId, email } = resolved;

  // WR-06: bound every authenticated attempt before any audit or payout work. A booker can directly
  // POST this Server Action too, so placing this after the capability gate would permit audit-log spam.
  const limit = rateLimit(`pmonboard:${userId}`, ONBOARD_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: userId,
      action: "startPayoutOnboarding",
      outcome: "denied",
      meta: { reason: "rate_limit", retryAfter: limit.retryAfter },
    });
    return { ok: false, error: "Too many attempts. Please try again in a moment." };
  }

  // Server Actions are directly POST-reachable, so the host layout is not an authorization boundary.
  // Re-read the capability from the caller's row: a booker-only session must never mint a payout link.
  const [caller] = await db.select({ canHost: user.canHost }).from(user).where(eq(user.id, userId));
  if (!caller?.canHost) {
    await recordAudit({
      actorId: userId,
      action: "startPayoutOnboarding",
      outcome: "denied",
      meta: { reason: "host_capability" },
    });
    return { ok: false, error: "Start hosting before setting up payouts." };
  }

  try {
    const accountId = await ensureLinkedAccount(userId, email);
    // ALWAYS mint a FRESH single-use link (never cache the URL — T-06-LINK).
    const link = await createOnboardingLink({
      accountId,
      returnUrl: absolutePublicUrl("/host/payouts/return"),
      refreshUrl: absolutePublicUrl("/host/payouts/refresh"),
    });
    await recordAudit({ actorId: userId, action: "startPayoutOnboarding", outcome: "ok" });
    return { ok: true, url: link.url };
  } catch {
    // A PayMongo failure is surfaced as a retryable error (no secret/PII leaks to the client).
    await recordAudit({
      actorId: userId,
      action: "startPayoutOnboarding",
      outcome: "error",
      meta: { reason: "paymongo_error" },
    });
    return { ok: false, error: "We couldn't start payout setup. Please try again." };
  }
}

/**
 * Re-mint a fresh onboarding link for the refresh_url landing (single-use links expire). Semantically
 * identical to startPayoutOnboarding (the Linked Account is reused under the row lock); named for the
 * refresh page's intent.
 */
export async function refreshOnboardingLink(): Promise<OnboardingResult> {
  return startPayoutOnboarding();
}
