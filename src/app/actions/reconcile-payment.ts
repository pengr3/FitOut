"use server";

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE FAST PATH (13.1-CONTEXT D-109) — one authenticated, one-shot reconcile for the person who is
// actually sitting there watching the settling screen.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠ THIS IS AN ACCELERANT, NOT THE GUARANTEE, AND THE ASYMMETRY IS THE DESIGN.
// `src/inngest/functions/payment-reconcile.ts` is the guarantee: a 5-minute sweep that reaches every
// paid-but-unconfirmed booking on a schedule with no browser involved. If this whole module were deleted
// tomorrow, a booker who paid would STILL always end up with a booking — up to five minutes later. That
// is the only thing this file costs when it fails, and it is why every branch below is free to refuse.
// Nothing in the guarantee may ever be moved here on the grounds that the fast path also does it.
//
// ── D-104: THE BROWSER IS NEVER THE AUTHORITY. STATED AS A RULE, NOT AS AN OBSERVATION ──────────────────
// This action reads NOTHING from the URL. It does not receive `searchParams`, it does not look for the
// checkout-return parameter, and it would behave identically if that parameter had never existed — the
// only thing that crosses this boundary from a browser is a booking id, which is then checked against the
// caller's own session before it is used for anything. PROJECT D-57 bans confirming on a redirect because
// a URL is typable and spoofable, and this phase does not weaken that by one line.
//
// What IS authoritative is the server-to-server read of PayMongo's own record that happens inside
// `reconcileOne` — the same source of truth as the webhook, over a different transport. So arriving at the
// settling surface confirms nothing whatsoever; only the provider's record saying `paid` moves anything,
// and it moves exactly as much when a cron asks as when a booker's page asks.
//
// ── D-105: ONE ROAD TO `confirmed`. THIS MODULE OWNS NO MONEY LOGIC ─────────────────────────────────────
// No UPDATE, no probe of its own, no alert policy, no state transition. It resolves WHO IS ASKING and then
// delegates to the sweep's own `reconcileOne` body. Two roads to `confirmed` is how one payment produces
// two payout-ledger rows and two receipt emails; two alert policies is how one missing webhook is counted
// twice in the operator queue until nobody reads it. If reconciliation behaviour ever needs to change it
// changes in ONE place, and that place is not here.
//
// ── THE RETURN VALUE IS A CLOSED ENUM, AND THAT IS A SECURITY PROPERTY ──────────────────────────────────
// `ReconcileNowOutcome` has exactly four members. No branch below interpolates a provider string, an error
// message, a `cause` or a retry hint into it. `checkout-probe.ts`'s discard discipline ends at a `null` —
// the caught provider error stops there and is never chained, logged or rendered — and a server-action
// return value lands directly in a browser, so a message-carrying result would re-open precisely the route
// out of it that the probe closes. It also means the caller CANNOT render a branch on failure, which is
// what keeps D-102's copy and STATE-05's ban on an error affordance intact by construction.

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { reconcileOne } from "@/inngest/functions/payment-reconcile";

/**
 * What the one-shot reconcile did, in four words the caller may branch on — and nothing else, ever.
 *
 *   reconciled   the provider's own record said paid, and the booking is now `confirmed`
 *   unchanged    nothing moved: not payable, nothing to ask about, or the provider did not say paid
 *   denied       no session, not the caller's booking, or no such booking (deliberately one value)
 *   rate-limited this identity has asked too often; no provider call was made
 *
 * `denied` deliberately collapses "not yours" and "does not exist". Splitting them would turn this action
 * into an oracle for whether a guessed booking id is real — the IDOR discipline `cancel-booking.ts` states
 * at T-07-48, applied to a surface that also costs an outbound provider call.
 */
export type ReconcileNowOutcome = "reconciled" | "unchanged" | "denied" | "rate-limited";

/**
 * THE BUDGET — a named constant rather than literals at the call site (the discipline `CANCEL_RATE_LIMIT`
 * sets at `cancel-booking.ts:109`), and the SAME 5-per-60s shape every session-gated privileged action in
 * this repository uses, mirroring the Better-Auth credential-endpoint budget.
 *
 * FLOOR — a booker must never be limited by using the page normally. The client fires this exactly ONCE
 * per mount, behind a `useRef` latch, and only after the poller's ~20s cap has elapsed. So a booker
 * refreshing the settling screen as fast as the cap allows produces at most THREE calls in sixty seconds,
 * and a booker who reloads a couple of times produces one or two. Five is comfortably clear of all of it.
 *
 * CEILING — a scripted loop must not be able to turn one signed-in session into provider load. Five reads
 * per minute per identity is bounded, and each one is itself capped at `CHECKOUT_PROBE_TIMEOUT_MS` (3s)
 * inside the probe, so the worst case an authenticated attacker can buy is small and finite.
 *
 * ⚠ NOT EXPORTED, AND THAT IS NOT AN OVERSIGHT — see the note below the constant.
 */
const RECONCILE_RATE_LIMIT = { window: 60, max: 5 } as const;

// ⚠ WHY `RECONCILE_RATE_LIMIT` IS MODULE-PRIVATE. The 13.1-03 plan asks for it to be EXPORTED. It cannot
// be: a `"use server"` module may only export async functions, Next enforces that at MODULE EVALUATION,
// and a single exported constant therefore kills the whole module — `reconcilePaymentNow` would never run
// in a browser at all. That is not theoretical here; it is exactly the shipped defect
// `tests/use-server-exports.test.ts` was written for (`avatar.ts` exported a number and avatar upload had
// never worked since Phase 1), and that same test is one of this task's own acceptance criteria. So the
// plan's two instructions cannot both hold, and the half worth keeping is the one that lets the action
// load. `cancel-booking.ts` sets the precedent exactly: `CANCEL_RATE_LIMIT` is `const`, not `export const`.
// `tests/booking/reconcile-fast-path.test.ts` therefore asserts the budget BEHAVIOURALLY — it discovers
// where the limit falls by calling until it is refused — which needs no exported number and cannot drift
// from one.
//
// MEASURED, NOT ARGUED (2026-08-22). The `export` keyword was added here on purpose and the guard was run:
//
//     × every "use server" module in src/ exports only async functions
//   AssertionError: expected [ Array(1) ] to deeply equal []
//   + [
//   +   "src/app/actions/reconcile-payment.ts:81 exports RECONCILE_RATE_LIMIT — not an async function:
//   +    `{ window: 60, max: 5 } as const`",
//   + ]
//
// Then reverted from a saved copy. The plan's export list is not a matter of taste here; it is a module
// that would not evaluate.

/**
 * Reconcile ONE booking on demand, for a caller who owns it.
 *
 * THE ORDER OF THE CHECKS BELOW IS THE SECURITY DESIGN and is written in that order deliberately: every
 * refusal happens BEFORE any outbound provider call, so a caller who is not allowed to do this can never
 * make FitOut spend a PayMongo round trip. `tests/booking/reconcile-fast-path.test.ts` asserts each refusal
 * by the provider's CALL COUNT rather than by the value returned, because a guard that answers correctly
 * while still probing is the failure that matters.
 */
export async function reconcilePaymentNow(bookingId: string): Promise<ReconcileNowOutcome> {
  // (1) SESSION FIRST. An unauthenticated caller must not be able to make FitOut hit PayMongo, so this
  // gate sits above everything including the rate limiter — an anonymous flood must mint no buckets and
  // cost no round trips.
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;
  if (!userId) return "denied";

  // (2) RATE-LIMIT ON THE AUTHENTICATED IDENTITY, never on anything a caller can type (the key-space rule
  // in `rate-limit.ts`'s header). Still no provider call at this point.
  const limit = rateLimit(`reconcile-payment:${userId}`, RECONCILE_RATE_LIMIT);
  if (!limit.ok) return "rate-limited";

  // (3) OWNERSHIP. Missing row and cross-user row return the SAME value — see `ReconcileNowOutcome`.
  const [row] = await db
    .select({
      id: booking.id,
      bookerId: booking.bookerId,
      status: booking.status,
      checkoutSessionId: booking.checkoutSessionId,
      expiresAt: booking.expiresAt,
    })
    .from(booking)
    .where(eq(booking.id, bookingId));

  if (!row || row.bookerId !== userId) return "denied";

  // (4) IS THERE ANYTHING TO ASK ABOUT? The status scope is `confirmPaidBooking`'s own claim — `pending`
  // is an instant hold, `approved` is a host-approved request being paid through the same checkout — and
  // it is the same scope the sweep's candidate query uses, deliberately: the fast path may not reach a row
  // the guarantee would not. A row with no checkout session has no provider record to read.
  if (row.status !== "pending" && row.status !== "approved") return "unchanged";
  if (row.checkoutSessionId === null) return "unchanged";

  // (5) DELEGATE. This is the sweep's body, verbatim, including its fail-closed probe handling, its single
  // road to `confirmed` and its single D-110 alert on a genuine transition. Nothing is added on top: a
  // missed webhook is reported ONCE no matter which trigger found it.
  //
  // ⚠ THE ROW SHAPE IS `UnconfirmedPaidRow`, MEASURED FROM THE MODULE — `{ id, checkoutSessionId,
  // expiresAt, status }`. The 13.1-03 plan's interface block describes a different shape
  // (`{ bookingId, …, createdAt }`) which does not exist; `bookingId` and `createdAt` are not fields of
  // that type and `reconcileOne` reads neither. Built from what the type actually declares.
  const result = await reconcileOne(
    {
      id: row.id,
      checkoutSessionId: row.checkoutSessionId,
      expiresAt: row.expiresAt,
      status: row.status,
    },
    db,
  );

  // Only a GENUINE transition is `reconciled`. `already-confirmed` (we raced the webhook and lost),
  // `not-paid`, `unknown` and both gone-slot branches are all `unchanged` from this caller's point of
  // view: the settling screen re-renders itself from the database either way, and the database is the only
  // thing it is allowed to believe.
  return result.outcome === "confirmed" ? "reconciled" : "unchanged";
}
