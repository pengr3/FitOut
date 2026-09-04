import "server-only";

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE CHECKOUT-RETIRE SWEEP (13.1-CONTEXT D-113) — the ability to pay dies with the hold.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠ (1) THIS FUNCTION IS THE GUARANTEE, AND IT STANDS ALONE.
// 13.1-05 wires the same policy into the three in-transaction reclaim paths (`createPendingHold`'s stale-
// hold reclaim, `createOpenCapacityHold`'s second reclaim, and `request-expiry`'s `approved → cancelled`
// payment-window release) so a lapsed session dies in SECONDS instead of minutes. Those wirings are an
// ACCELERANT. If 13.1-05 were never written, D-113 is still true — because of this file, and only because
// of this file. Never move work out of here on the grounds that an inline wiring also does it.
//
// AND THAT IS NOT A STYLISTIC PREFERENCE — IT IS WHAT THE ENUMERATION MEASURED. The three reclaim paths do
// not cover the common case. A lapsed `pending` instant-book hold is flipped by NOTHING unless another
// booker happens to place an overlapping hold: `request-expiry.ts` only selects `requested` and `approved`,
// and no other cron sweeps lapsed `pending`. The 06-02 lazy read predicates free the slot for DISPLAY, so
// the system looks healthy — while the row sits `pending` forever and ITS CHECKOUT SESSION STAYS PAYABLE
// FOREVER. An open tab or an unscanned QR can still take the booker's money for a booking FitOut no longer
// holds. A plan that wired only the three enumerated reclaims would have satisfied the letter of the
// enumeration and left the DOMINANT case wide open.
//
// ⚠ (2) THIS SWEEP WRITES NO `booking` ROW. NOT ONE — and specifically it NEVER flips a lapsed `pending`
// row to `cancelled`. That is the single most likely "tidy-up" a future reader will reach for, and it would
// silently delete this phase's own guarantee:
//
//   `pending` is precisely and ONLY the status plan 13.1-02's `queryUnconfirmedPaid` selects. A cancelled
//   row drops out of that selection, so a booker who paid AT THE LAST SECOND — the exact person this whole
//   phase exists for — would never be reconciled, never be confirmed and never be told.
//
// Retiring the SESSION and retiring the BOOKING are two different facts. Only the first is D-113's. The
// slot is already free between ticks (the lazy read predicates), and the durable status flip belongs to the
// paths that already own it.
//
// ⚠ (3) THE BOOKER-VISIBLE CONSEQUENCE IS ALREADY NAMED, SO THIS SHIPS ZERO NEW COPY.
// Once the session reads `expired`, `readPaymentState("pending", session)` returns `"hold-expired"` and
// `hold-expired-state.tsx` owns that landing. The visible change — a lapsed hold stops offering "finish
// paying in place" (the D-70 `not-completed` branch) — IS what D-113 asks for. No new strings, and no edit
// to the bookings detail page, which 13.1-03 owns.
//
// ── D-104: NO BROWSER INPUT REACHES ANY OF THIS ─────────────────────────────────────────────────────────
// The session id is read from the `booking` row inside a CRON, where no `Request`, no header, no query
// parameter and no client field exists. There is nothing here for a browser to reach — which is D-104 from
// the other side: PROJECT D-57's ban on trusting `?paid=1` is untouched and unweakened.
//
// ── THE SHAPE IS DELIBERATELY request-expiry.ts's AND payment-reconcile.ts's ────────────────────────────
// Same 2-arg `inngest.createFunction` form with the trigger in `options.triggers` (inngest 4.13.0), same
// `concurrency: 1` singleton so passes never overlap, same `dbConn: DbConn = db` parameterisation so an
// isolated-schema test can inject a connection, and the same "THE DB CLOCK now() IS THE SOLE EXPIRY
// AUTHORITY" rule (T-06-16) — never a JS clock, in the statement that selects.

import { sql } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import type { DbConn } from "@/lib/availability/read-model";
import {
  retireCheckoutForBooking,
  type RetirableSession,
  type RetireOutcome,
} from "@/lib/payments/retire-checkout";

/**
 * HOW LONG A LAPSED HOLD CAN STILL BE PAID FOR — the maximum EXTRA time, past the hold's own expiry, that
 * a checkout session stays live.
 *
 * ⚠ IT MUST STAY WELL UNDER `HOLD_TTL_MINUTES` (15) OR D-113's PROMISE STOPS MEANING ANYTHING. "The
 * ability to pay dies with the hold" is only true if the retire arrives while the lapse is still recent;
 * a retire interval at or past the hold's own lifetime would mean a booker could pay for a slot that had
 * been lapsed longer than it was ever held. That relationship is pinned as an ASSERTION over the real
 * imported constant in `tests/payments/checkout-retire.test.ts`, not as a comment here — a comment cannot
 * go red. Raising this to 20 was performed on purpose during 13.1-04; the verbatim failure is in that
 * spec's header.
 *
 * Five also matches the phase's other sweep (`RECONCILE_INTERVAL_MINUTES`), which is not a coincidence:
 * both are bounded by the same hold TTL for the same reason.
 */
export const RETIRE_INTERVAL_MINUTES = 5;

/**
 * THE OFFSET. Residue 4 mod 5 collides with NOTHING already scheduled:
 *
 *   :00 payout sweep · :15 request expiry · :30 payout reconcile · :45 reminders · 08:50 daily ops digest
 *      — all hourly/daily, all residue 0 mod 5
 *   minute 2 step 5 — plan 13.1-02's `payment-reconcile`, residue 2 mod 5
 *
 * Pitfall 4's offset discipline, applied to the SECOND sub-hourly cron in the codebase: crons that tick
 * together contend for the same database and the same provider rate budget. With residues {0, 2, 4} taken
 * by the three families, no two of them ever land on the same minute.
 */
export const RETIRE_START_MINUTE = 4;

/**
 * HOW FAR BACK A LAPSE IS STILL SWEPT. A row is a candidate only while its `expires_at` is inside this
 * window — lapsed, but by less than thirty minutes.
 *
 * THIS IS THE NO-MIGRATION ANSWER TO "HAVE WE ALREADY RETIRED THIS ONE" (D-112). A marker column would buy
 * exactly one thing: skipping a GET on a row already retired. The window buys the same bound for free, at
 * the cost of a few cheap GETs, and costs no schema change — so GATE-06 and Phase 17 SC#4 stay untouched.
 *
 * THE COST, STATED HONESTLY: an abandoned hold is visited up to SIX times (30 / 5). The FIRST visit costs
 * one GET plus one POST; every visit after that costs ONE GET and returns `already-retired`, because
 * probe-first means the steady state is a read, never a POST(400) plus a recovery GET. Then the row leaves
 * the window forever.
 *
 * IT IS ALSO D-111's NO-BACKFILL MECHANISM, and structurally rather than by an epoch constant: a window
 * measured in MINUTES cannot reach an August fixture, and because `expires_at` is fixed while `now()` only
 * grows, a row that has left the window can never re-enter it. MEASURED against the two evidence bookings
 * on 2026-08-22: `09f32400…` lapsed at 19:17Z on 08-21 and `408e054a…` at 03:30Z on 08-18 — 11 hours and
 * 4 days outside a 30-minute window respectively. Neither is selectable, now or ever.
 *
 * THE RESIDUAL, NAMED: a hold that lapses while this cron is DOWN for more than ~25 minutes leaves the
 * window unswept, and its session stays payable. That is the price of not adding a column. It is bounded
 * (the D-108 gone-slot backstop still governs a payment that lands afterwards) and it is the reason
 * 13.1-05's inline wirings are worth having — they retire at the moment of reclaim, with no window at all.
 */
export const RETIRE_LOOKBACK_MINUTES = 30;

/**
 * The hard bound on ONE pass. Each row costs at most one 3s probe (`CHECKOUT_PROBE_TIMEOUT_MS`) plus one
 * POST, so 50 bounds the pass in provider calls AND in wall time. `concurrency: 1` means a slow pass can
 * never have the next one pile up on top of it.
 */
export const RETIRE_BATCH_LIMIT = 50;

/**
 * The cron trigger string, BUILT from the constants above rather than typed out.
 *
 * Deriving it is the point: a hand-written schedule and a hand-written interval constant drift apart
 * silently, and if they do, the inequality guarding D-113's promise would be guarding a number the deployed
 * cron no longer honours. Here the schedule that actually ships and the number under assertion are the
 * same value, and the spec parses this string back out to prove it.
 *
 * The minute field is spelled `START-59/STEP` rather than `START/STEP`: the bare `4/5` form is a Quartz
 * extension, while `4-59/5` is valid POSIX/vixie cron and is accepted by every parser in the chain.
 */
export function retireCron(): string {
  return `TZ=Asia/Manila ${RETIRE_START_MINUTE}-59/${RETIRE_INTERVAL_MINUTES} * * * *`;
}

/** JSON-serializable so it can be the return value of a `step.run`. */
export type RetireResult = { bookingId: string; outcome: RetireOutcome };

/**
 * The candidate set: holds that have LAPSED RECENTLY and still hold a session we can retire.
 *
 * Takes an explicit `dbConn` so an isolated-schema test can inject a connection; defaults to the prod `db`.
 *
 * Ordered `expires_at DESC` — MOST RECENTLY LAPSED FIRST, which is the opposite of `payment-reconcile`'s
 * oldest-first drain and deliberately so. The freshest lapse is the one whose session is most likely still
 * `active` and whose booker most likely still has the tab open; everything older in the window has almost
 * certainly been retired on an earlier tick and costs a single `already-retired` GET. Under a backlog at
 * `RETIRE_BATCH_LIMIT`, this order spends the budget where money can actually still move.
 */
export async function queryRetirableSessions(dbConn: DbConn = db): Promise<RetirableSession[]> {
  return (await dbConn.execute(sql`
    SELECT id                  AS "bookingId",
           checkout_session_id AS "checkoutSessionId",
           status              AS "bookingStatus"
    FROM booking
    -- The two payable statuses, mirroring plan 13.1-02's candidate set exactly. A 'pending' row is an
    -- instant hold; an 'approved' row is a host-approved request whose booker is paying through the same
    -- checkout (PAY-05 / D-63). Both hold a live session; both must lose the ability to pay when their
    -- hold lapses. 'requested' is not payable and is correctly out; terminal rows are out because their
    -- session was either already paid (retiring it would destroy evidence) or already retired by the path
    -- that ended them.
    --
    -- NOTE FOR THE NEXT EDITOR: no backtick may appear anywhere inside this sql template, however
    -- comment-like the surrounding text looks -- a backtick TERMINATES the template literal and the whole
    -- module dies at parse time with [PARSE_ERROR] Expected ',' or ')'. Measured here on this file's first
    -- run, and measured before that by 13.1-02 on payment-reconcile.ts.
    WHERE status IN ('pending', 'approved')
      -- Never spend a provider round trip on a row with nothing to ask about. NULL is normal, not an error.
      AND checkout_session_id IS NOT NULL
      -- A hold with no expiry has not lapsed and never will by this predicate. Without this clause the
      -- comparison below would be against NULL, which is neither true nor false — but leaving it implicit
      -- is exactly the kind of thing a later rewrite "simplifies" away, so it is stated.
      AND expires_at IS NOT NULL
      -- ⚠⚠ THE MOST DANGEROUS LINE IN THIS PLAN. ⚠⚠
      -- This is the ONLY thing separating "the hold is over" from "the booker is mid-payment". Widen it by
      -- even a sign -- flipping the comparison, adding an interval, or reading the clock in JS instead of
      -- in Postgres -- and this cron REVOKES A LIVE CUSTOMER'S ABILITY TO PAY. Every other scheduled job
      -- in this codebase adds capability or moves state forward; this one takes something away from a
      -- paying customer, so the predicate deciding WHO is the whole safety story.
      -- now() is the POSTGRES clock, evaluated in the statement that selects (T-06-16) -- the same
      -- authority every other expiry decision in the system uses, never a clock from this process.
      AND expires_at <= now()
      -- The lookback window (see RETIRE_LOOKBACK_MINUTES): six ticks of coverage, no marker column, and
      -- D-111's no-backfill guarantee as a structural fact rather than a constant somebody must maintain.
      AND expires_at > now() - make_interval(mins => ${RETIRE_LOOKBACK_MINUTES}::int)
    ORDER BY expires_at DESC
    LIMIT ${RETIRE_BATCH_LIMIT}
  `)) as unknown as RetirableSession[];
}

/**
 * Retire ONE lapsed hold's session. It calls the policy and returns its outcome. That is the whole body.
 *
 * NO BRANCH, NO AUDIT, NO WRITE HERE ON PURPOSE. `src/lib/payments/retire-checkout.ts` is the ONE owner of
 * what happens to a session; 13.1-05's three call sites will reach the same policy, and any classification
 * that lived here instead would be a second, drifting copy of it.
 *
 * ⚠ IT TAKES NO `dbConn`, AND THE ABSENCE IS DELIBERATE. The 13.1-04 plan's prose names a `dbConn?`
 * parameter by analogy with `reconcileOne`, but there is nothing to thread it into: the policy performs no
 * `booking` read and no `booking` write (that is Rule 2 of both module headers), and its only database
 * touch is `recordAudit`, which owns its own connection and accepts none. A parameter that is accepted and
 * ignored would be worse than absent — a test could inject an isolated schema and believe its audit rows
 * landed there.
 *
 * It cannot throw, because `retireCheckoutForBooking` cannot. That matters inside a `step.run`: a throw
 * would retry the step and re-POST the expire.
 */
export async function retireOne(row: RetirableSession): Promise<RetireResult> {
  const outcome = await retireCheckoutForBooking(row, "retire-sweep");
  return { bookingId: row.bookingId, outcome };
}

/**
 * The D-113 sweep: a 5-minute, timezone-aware, SINGLETON (`concurrency: 1`) cron on an offset minute no
 * other job occupies. Each candidate is retired inside its OWN Inngest step, so one row whose probe times
 * out retries just that row rather than re-probing the whole batch.
 */
export const checkoutRetireSweep = inngest.createFunction(
  {
    id: "checkout-retire-sweep",
    concurrency: 1, // singleton — passes never overlap, so provider load stays bounded per pass
    triggers: [{ cron: retireCron() }],
  },
  async ({ step }) => {
    const candidates = await step.run("find-retirable-sessions", () => queryRetirableSessions(db));

    const tally: Record<string, number> = {};
    for (const row of candidates) {
      const result = (await step.run(`retire-${row.bookingId}`, () => retireOne(row))) as RetireResult;
      tally[result.outcome] = (tally[result.outcome] ?? 0) + 1;
    }

    return { scanned: candidates.length, outcomes: tally };
  },
);
