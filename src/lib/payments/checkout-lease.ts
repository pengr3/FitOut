// THE CHECKOUT LEASE (T-08-79, quick task 260801-kv2) — the single authority for "at most one checkout
// attempt per booking may be talking to PayMongo right now".
//
// WHAT T-08-79 WAS. `confirmBooking`'s expire-before-create gate closed the SEQUENTIAL double-submit: a
// booking that already NAMES a checkout session has that session retired before the next is minted. But the
// gate is READ-THEN-ACT and was UNLOCKED, so two CONCURRENT calls for one holdId both read a stale/NULL
// `checkout_session_id`, both skip the expire, and both mint an independently payable session. Both can be
// paid. The sequential form of this already cost a real PHP 1,470.00 capture against a PHP 735.00 booking in
// Phase-8 UAT, and on the `qrph` rail an already-captured overcharge is NOT API-refundable at all
// (`isApiRefundable`, src/lib/payments/refund-rail.ts, fails closed) — so the second capture needs an
// out-of-band operator refund. The concurrent form was recorded as an ACCEPTED residual and is what this
// module closes.
//
// ── THE ONE RULE THAT GOVERNS THIS FILE ───────────────────────────────────────────────────────────────
// NO DATABASE LOCK MAY BE HELD ACROSS A PAYMONGO HTTP ROUND-TRIP. That is why the residual was accepted in
// the first place: a `SELECT ... FOR UPDATE` spanning expire+create would pin a row lock across two
// external, UNTIMED network calls, which is a worse failure than the race it closes. The claim below is not
// that. It is ONE autocommit `UPDATE ... WHERE <lease is free> RETURNING` whose row lock lives for the
// duration of that single statement and is GONE before `fetch` is ever called. The no-lock-across-the-
// network property is therefore structural, not a matter of discipline.
//
// ⚠️ DO NOT "HARDEN" THE CLAIM. Do not wrap it in a transaction and do not add `FOR UPDATE`. Both are
// unnecessary and the latter re-introduces exactly the anti-pattern above. The load-bearing Postgres fact:
// under READ COMMITTED, when racer B's UPDATE meets the row racer A's uncommitted UPDATE holds, B BLOCKS,
// and then — after A commits — RE-EVALUATES its WHERE clause against the NEW row version (EvalPlanQual). B
// therefore sees `checkout_lock_at = <A's now()>`, fails the predicate, updates zero rows, and RETURNING
// comes back empty. That re-evaluation is precisely what makes a single `UPDATE ... RETURNING` a valid
// compare-and-swap while `SELECT`-then-`UPDATE` is not.
//
// WHY A COLUMN AND NOT AN ADVISORY LOCK: src/lib/db/index.ts is `drizzle(postgres(DATABASE_URL))` with no
// options — postgres.js's default pool of max: 10. A session-scoped `pg_try_advisory_lock` belongs to the
// backend connection that took it, and Drizzle pins no connection across `await` boundaries without an
// explicit transaction (forbidden above), so the release could land on a different backend and leak the lock
// with no TTL to heal it. The transaction-scoped variant releases at COMMIT, which is BEFORE the HTTP calls
// begin. The full argument, and the inertness of the column for occupancy, live in the schema docblock.
//
// SELF-HEALING: the TTL is a TERM OF THE PREDICATE, evaluated against the POSTGRES clock, so a lease left
// behind by a dead process frees itself with no sweep, no cron and no operator.
//
// WHY THE BOOKER-FACING COPY LIVES HERE: with the module that owns the state, the same rationale as
// HOURS_MISSING_* in src/lib/listing/hours-signal.ts and SOLD_OUT_MESSAGE in
// src/lib/availability/open-capacity.ts. It is defined exactly ONCE in src/.
//
// Plain server module — NOT "use server", NOT "use client" — so a server action and an integration test can
// both import it (the src/lib/group/seat-claim.ts shape). It takes a `DbConn` rather than reaching for the
// singleton db, which is what lets a race test drive it over its own independent connection.

import { and, eq, sql } from "drizzle-orm";
import { booking } from "@/lib/db/schema";
import type { DbConn } from "@/lib/availability/read-model";
import { CHECKOUT_LEASE_TTL_SECONDS } from "@/lib/payments/config";

/**
 * The one sentence a refused booker sees (09-UI-SPEC copywriting contract: calm, sentence case, no vendor
 * or DB vocabulary, name the state and give a way out). NOTHING WENT WRONG here — the booker's own other
 * attempt is winning the race — so this is never red and never an error.
 *
 * It is honest in every reachable case: a same-tab double-click (the other click is winning), two tabs (the
 * other tab is winning), and a crashed attempt (the TTL frees it within CHECKOUT_LEASE_TTL_SECONDS — "a
 * moment" is literally true). "Try again" always lands somewhere correct: if the winner paid, the retry hits
 * the already-'confirmed' short-circuit and redirects to the confirmation; if the hold lapsed meanwhile, the
 * retry hits the existing expiry copy.
 */
export const CHECKOUT_IN_FLIGHT_MESSAGE =
  "We're already starting checkout for this booking. Give it a moment, then try again.";

/**
 * The outcome of a claim. The winner receives `lockedAt` — the exact instant it claimed — and that is the
 * ONLY way to release the lease. A loser receives nothing, so it is STRUCTURALLY incapable of releasing the
 * winner's lease.
 */
export type CheckoutLeaseClaim = { claimed: true; lockedAt: Date } | { claimed: false };

/**
 * Claim the checkout lease on one booking. ONE atomic statement, in AUTOCOMMIT: it has fully committed
 * before the caller makes any PayMongo call. Zero rows back means another attempt holds a live lease, and
 * the caller must refuse with CHECKOUT_IN_FLIGHT_MESSAGE rather than mint a second payable session.
 */
export async function claimCheckoutLease(
  dbConn: DbConn,
  input: { holdId: string; bookerId: string },
): Promise<CheckoutLeaseClaim> {
  const claimed = await dbConn
    .update(booking)
    // `date_trunc('milliseconds', now())` and NOT bare `now()`, and this is load-bearing rather than
    // tidiness: postgres.js parses a timestamptz into a JS Date, which is MILLISECOND precision, so a
    // microsecond-precision stored value could never be matched back by releaseCheckoutLease below. The
    // release would silently no-op and every refusal path would wedge the booking for the whole TTL.
    // Truncating at write time makes the round-trip exact. Case 6 of the race test catches a regression.
    //
    // The clock is POSTGRES's, never JS — this system's zero-JS-clock rule (units.ts), and the same
    // authority every other expiry decision uses. A skewed process clock must never decide a lease.
    .set({ checkoutLockAt: sql`date_trunc('milliseconds', now())` })
    .where(
      and(
        eq(booking.id, input.holdId),
        // The owner term is unreachable-by-construction behind the action's own owner gate, so it costs no
        // copy honesty — but it makes this module safe for any future caller that forgets to gate.
        eq(booking.bookerId, input.bookerId),
        // The lease is free when it was never claimed, or when the attempt that claimed it is older than the
        // TTL. `::int` on the interval bind is the shipped units.ts idiom.
        //
        // NO STATUS TERM, DELIBERATELY. Adding `status IN ('pending','approved')` would make a zero-row
        // result AMBIGUOUS between "another attempt is in flight" (retryable — the copy above) and "this
        // hold is no longer live" (a different state with its own shipped copy), AND it would not close the
        // window it appears to, because a webhook confirm can land AFTER this statement and before the
        // session is created. It buys ambiguity for nothing. The status guard stays where it is, four
        // statements above the call site in confirmBooking.
        sql`(${booking.checkoutLockAt} IS NULL
             OR ${booking.checkoutLockAt} < now() - make_interval(secs => ${CHECKOUT_LEASE_TTL_SECONDS}::int))`,
      ),
    )
    .returning({ lockedAt: booking.checkoutLockAt });

  const lockedAt = claimed[0]?.lockedAt;
  if (!lockedAt) return { claimed: false };
  return { claimed: true, lockedAt };
}

/**
 * Release a lease this caller actually holds. `lockedAt` is REQUIRED, and that is a design property rather
 * than an ergonomic accident:
 *   - a racer that LOST the claim never receives a timestamp, so it cannot release the winner's lease; and
 *   - scoping to the exact claimed instant stops a slow attempt that was legitimately overtaken past the TTL
 *     from clearing its SUCCESSOR's fresh lease.
 *
 * BEST-EFFORT by design: the body is swallowed on failure. A failed release is bounded by the TTL, and it
 * must never convert a calm refusal into a thrown 500 on the money path.
 */
export async function releaseCheckoutLease(
  dbConn: DbConn,
  holdId: string,
  lockedAt: Date,
): Promise<void> {
  try {
    await dbConn
      .update(booking)
      .set({ checkoutLockAt: null })
      .where(and(eq(booking.id, holdId), eq(booking.checkoutLockAt, lockedAt)));
  } catch {
    // Swallowed on purpose — see the best-effort note above.
  }
}
