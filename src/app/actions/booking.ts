"use server";

// Booking mutations (BOOK-01/02/03, D-40/D-41/D-42/D-44). Clones the blocks.ts server-action skeleton
// (session → gate → Zod re-validate → mutate → revalidate) but swaps the HOST-ownership guard for a
// BOOKER-CAPABILITY guard (canBook, D-41) + a server RE-DERIVATION of deriveBookable (the reserve route
// group is NEVER the gate — Security V4). Both actions end in a redirect (next/navigation), not a JSON ok.
//
// SECURITY CONTRACT:
//   - SESSION (D-41): placeHold/confirmBooking require an authenticated session — an unauthenticated
//     caller gets a calm sign-in result (the return-to-checkout callbackURL is threaded by the CTA in
//     Plan 07), never a hold.
//   - CAPABILITY (T-04-BOOKCAP): placeHold re-reads the booker's canBook AND re-derives deriveBookable for
//     the listing+host server-side. The route group / a client flag is never trusted (Security V4, D-41).
//   - OWNERSHIP / IDOR (T-04-HOLDIDOR / T-05-13): confirmBooking owner-gates booking.bookerId ===
//     session.userId before ANY state transition or charge — the opaque URL id is never the gate.
//   - CONFIRM AUTHORITY (D-57): confirmBooking NO LONGER flips pending→confirmed — the
//     checkout_session.payment.paid webhook (Plan 04) is the SOLE confirm authority. This action instead
//     EXTENDS the hold (D-58, now()+PAYMENT_WINDOW so the sweep can't take the slot mid-payment) and
//     creates a hosted PayMongo checkout, then redirects off-site to pay.
//   - CHARGE INTEGRITY (D-49 / T-05-11): the charge amount is read from booking.quotedTotalCents
//     SERVER-SIDE; confirmBooking takes only holdId, so a client can never inject a charge amount.
//   - IDEMPOTENCY (D-42 / T-05-14): a re-confirm of the caller's OWN already-'confirmed' booking is a
//     no-op SUCCESS (redirect to the confirmation) — short-circuited BEFORE the charge, never a second
//     checkout; the stable Idempotency-Key checkout:<bookingId> makes even a race reuse the same session.
//   - POST-ONLY (T-04-GETHOLD): placeHold mints the hold via this POST server action + redirect, never a
//     GET render side-effect (Pitfall 2 — a GET duplicates holds on prefetch/refresh/Back).

import { and, eq, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing, user, hostPayout } from "@/lib/db/schema";
import { deriveBookable } from "@/lib/bookability";
import { bookingCreateSchema } from "@/lib/validation/booking";
import { createPendingHold } from "@/lib/availability/units";
import { createCheckoutSession } from "@/lib/paymongo";
import { PAYMENT_WINDOW_MINUTES } from "@/lib/payments/config";
import { bookingReference } from "@/lib/booking/reference";
import { rateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

/** placeHold failure shapes (success redirects to the reserve page, so it never returns ok:true). */
export type PlaceHoldResult =
  | { ok: false; reason: "sign-in"; error: string }
  | { ok: false; reason: "activate-booking"; error: string }
  | { ok: false; reason: "not-bookable"; error: string }
  | { ok: false; reason: "invalid"; error: string; fieldErrors?: Record<string, string[]> }
  | { ok: false; reason: "taken"; error: string };

/**
 * confirmBooking failure shapes (SUCCESS redirects — off-site to the hosted checkout on a fresh pay, or to
 * the confirmation page on an idempotent already-confirmed re-entry). `checkout` is the calm "couldn't
 * start checkout / going too fast" retry state (the hold is still active — never a red error).
 */
export type ConfirmResult =
  | { ok: false; reason: "sign-in"; error: string }
  | { ok: false; reason: "denied"; error: string }
  | { ok: false; reason: "expired"; error: string }
  | { ok: false; reason: "checkout"; error: string };

// WR-06: money-adjacent budget — mirrors the payout-onboarding action (5/60s per authenticated identity).
const CONFIRM_PAY_RATE_LIMIT = { window: 60, max: 5 } as const;

/** Resolve the signed-in user's id, or null if there is no session (cloned from blocks.ts). */
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

/**
 * placeHold — the entering-checkout mutation (D-39/SC#3). A POST server action, NEVER a GET side-effect
 * (Pitfall 2). Gates on a signed-in canBook user (D-41) + a server re-derivation of deriveBookable
 * (Security V4), then mints a pending hold via createPendingHold and redirects to the reserve page. A
 * double-submit (same idempotency key / window) returns the SAME booking (delegated to createPendingHold).
 */
export async function placeHold(input: unknown): Promise<PlaceHoldResult> {
  // (1) Session gate (D-41). The CTA (Plan 07) threads the return-to-checkout callbackURL; here we only
  // report that sign-in is required.
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, reason: "sign-in", error: "Sign in to book this space." };
  }

  // (2) Capability gate (T-04-BOOKCAP) — re-read canBook from the DB (canBook is input:false, so the row
  // is the source of truth; a client flag is never trusted).
  const [me] = await db.select({ canBook: user.canBook }).from(user).where(eq(user.id, userId));
  if (!me?.canBook) {
    return { ok: false, reason: "activate-booking", error: "Turn on booking to reserve this space." };
  }

  // (3) Re-validate the untrusted selection SHAPE (T-04 input validation). The stronger invariants
  // (on-the-hour, inside operating hours, a free unit, the frozen price) are re-derived inside
  // createPendingHold — the client is never trusted for price/time.
  const parsed = bookingCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid",
      error: "Please check your selection and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const { listingId, startUtc, endUtc, fullDay, idempotencyKey } = parsed.data;

  // (4) Re-derive bookability SERVER-SIDE (Security V4 — the reserve route group is NOT the gate). Mirrors
  // the listing page's deriveBookable call (listings/[id]/page.tsx:113-119): published + host emailVerified
  // + host payoutsEnabled. Keep this join in sync with bookability.ts (Pitfall 5).
  const [lr] = await db
    .select({
      status: listing.status,
      emailVerified: user.emailVerified,
      payoutsEnabled: hostPayout.payoutsEnabled,
    })
    .from(listing)
    .innerJoin(user, eq(listing.hostId, user.id))
    .leftJoin(hostPayout, eq(hostPayout.userId, user.id))
    .where(and(eq(listing.id, listingId), isNull(listing.deletedAt)));
  const bookable =
    !!lr &&
    deriveBookable(
      { status: lr.status },
      { emailVerified: lr.emailVerified, payoutsEnabled: lr.payoutsEnabled ?? false },
    );
  if (!bookable) {
    return { ok: false, reason: "not-bookable", error: "This space isn't accepting bookings right now." };
  }

  // (5) Mint the pending hold (the WR-03 transaction: SAVEPOINT + outer-retry + in-tx sweep + own-hold
  // idempotency). createPendingHold returns a mapped calm result on a conflict — it never throws for a race.
  const res = await createPendingHold(db, {
    listingId,
    bookerId: userId,
    startsAt: startUtc,
    endsAt: endUtc,
    fullDay,
    idempotencyKey: idempotencyKey ?? null,
  });
  if ("error" in res) {
    return { ok: false, reason: "taken", error: res.error }; // "That time was just taken." (SC#4)
  }

  // (6) The pending hold immediately occupies the slot in the calendar + search (both treat pending as
  // occupying), so revalidate BOTH before redirecting to the reserve page.
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/");
  redirect(`/listings/${listingId}/book?hold=${res.id}`);
}

/**
 * confirmBooking — "Confirm & pay" (D-57). The Phase-4 synchronous pending→confirmed flip is RETIRED: the
 * booking confirms ONLY when the checkout_session.payment.paid webhook lands (Plan 04 — the single confirm
 * authority). This action instead:
 *   1. owner-gates the hold (IDOR, T-05-13) and reads the SERVER-FROZEN amount (D-49);
 *   2. short-circuits an already-'confirmed' own booking to the confirmation (idempotent, D-42);
 *   3. EXTENDS the hold to now()+PAYMENT_WINDOW so the sweep can't take the slot mid-payment (D-58);
 *   4. creates a hosted PayMongo Checkout Session charging EXACTLY booking.quotedTotalCents;
 *   5. redirects off-site to pay.
 * Rate-limited + audited (WR-06). Any PayMongo failure returns a calm retry result — never a raw 500 or a
 * leaked secret (T-05-15).
 */
export async function confirmBooking(holdId: string): Promise<ConfirmResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, reason: "sign-in", error: "Sign in to confirm your booking." };
  }

  // Owner-gated load (T-04-HOLDIDOR / T-05-13). A missing row OR a different booker both return the SAME
  // calm "can't show this booking" so a leaked/guessed id reveals nothing (owner-gate, D-43). The frozen
  // amount + currency + listing are read HERE — the charge is server-side only (the action takes no amount).
  const [bk] = await db
    .select({
      bookerId: booking.bookerId,
      status: booking.status,
      listingId: booking.listingId,
      quotedTotalCents: booking.quotedTotalCents,
      currency: booking.currency,
    })
    .from(booking)
    .where(eq(booking.id, holdId));
  if (!bk || bk.bookerId !== userId) {
    return { ok: false, reason: "denied", error: "We can't show this booking." };
  }

  // Idempotent short-circuit (D-42 / T-05-14): an already-'confirmed' OWN booking is a no-op SUCCESS —
  // redirect to the confirmation WITHOUT creating a second checkout. Must precede the rate-limit + charge.
  if (bk.status === "confirmed") {
    redirect(`/bookings/${holdId}`);
  }

  // Any non-pending, non-confirmed status (cancelled/declined/…) has no live hold left to pay for.
  if (bk.status !== "pending") {
    return {
      ok: false,
      reason: "expired",
      error: "Your hold is no longer active. Check availability again.",
    };
  }

  // WR-06: bound the money-adjacent action per identity; audit the denial (non-repudiable). Reuses the
  // paymongo-connect.ts pattern (session → rateLimit → recordAudit on denial → calm result).
  const limit = rateLimit(`confirm-pay:${userId}`, CONFIRM_PAY_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: userId,
      action: "confirm_pay",
      outcome: "denied",
      meta: { reason: "rate_limit", holdId, retryAfter: limit.retryAfter },
    });
    return { ok: false, reason: "checkout", error: "You're going a little fast. Please try again in a moment." };
  }

  // Charge-integrity guard (D-49): a mis-frozen (null) quote must NEVER charge 0 — bail calmly.
  if (bk.quotedTotalCents == null) {
    await recordAudit({
      actorId: userId,
      action: "confirm_pay",
      outcome: "error",
      meta: { reason: "no_quote", holdId },
    });
    return { ok: false, reason: "checkout", error: "We couldn't start checkout. Please try again." };
  }

  // EXTEND the hold BEFORE creating the checkout (D-58 / T-05-16): push expires_at to now()+PAYMENT_WINDOW
  // (DB clock) so the lazy-expiry sweep can't free — and someone else can't take — the slot while the
  // booker pays. Scoped to the owner + still-'pending' so it can never touch a confirmed/other row.
  await db.execute(sql`
    UPDATE booking SET expires_at = now() + make_interval(mins => ${PAYMENT_WINDOW_MINUTES})
    WHERE id = ${holdId} AND booker_id = ${userId} AND status = 'pending'`);

  // Create the hosted checkout for the SERVER-FROZEN amount (D-49). The stable Idempotency-Key
  // checkout:<bookingId> makes a double-click / retry reuse the SAME session — never a second charge.
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const ref = bookingReference(holdId);
  let checkout: { id: string; checkoutUrl: string };
  try {
    checkout = await createCheckoutSession({
      amountCents: bk.quotedTotalCents,
      currency: bk.currency ?? "php",
      name: `Booking ${ref}`,
      referenceNumber: holdId,
      metadata: { booking_id: holdId },
      successUrl: `${base}/bookings/${holdId}?paid=1`,
      cancelUrl: `${base}/listings/${bk.listingId}/book?hold=${holdId}`,
      idempotencyKey: `checkout:${holdId}`,
    });
  } catch {
    // A PayMongo failure is surfaced as a calm retryable result — never a raw 500 or a leaked secret.
    await recordAudit({
      actorId: userId,
      action: "confirm_pay",
      outcome: "error",
      meta: { reason: "paymongo_error", holdId },
    });
    return { ok: false, reason: "checkout", error: "We couldn't start checkout. Please try again." };
  }

  await recordAudit({ actorId: userId, action: "confirm_pay", outcome: "ok", meta: { holdId } });
  // The webhook (Plan 04) — NOT this browser return — is the confirm authority (D-57); we only send the
  // booker off-site to pay. On return, /bookings/[id]?paid=1 renders the "finalizing…" interstitial.
  redirect(checkout.checkoutUrl);
}
