import "server-only";

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE PAYMENT RECONCILE SWEEP (13.1-CONTEXT D-104…D-111) — money coming IN, the mirror of payout-reconcile.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE ASYMMETRY THIS FILE CLOSES. `src/inngest/functions/payout-reconcile.ts` polls what we OWE: every
// `processing` payout row is asked "did the transfer land?", because PayMongo publishes no transfer webhook
// and a host who is never paid would otherwise be discovered only by their complaint. Nothing polled what we
// have been GIVEN. A booker's payment reached FitOut over exactly ONE transport — a `checkout_session.
// payment.paid` webhook, an HTTP request over the public internet — and if that request is lost to a deploy,
// a process recycle or a provider incident, the money is captured and the booking stays `pending` forever
// with nothing anywhere failing to say so.
//
// That is not hypothetical. On 2026-08-21 every `pending` booking holding a `checkout_session_id` was probed
// against PayMongo and TWO had taken the customer's money and never confirmed; the second had sat unnoticed
// for THREE DAYS. Both are dev rows and are deliberately left in place as fixtures (D-111) — on a live
// launch each is a person who paid and got nothing.
//
// ⚠ THIS FUNCTION IS THE GUARANTEE, AND IT MUST STAND ALONE. Plan 13.1-03's settling-screen probe is an
// ACCELERANT: it answers someone who is actually watching in seconds instead of minutes. It is not a
// second guarantee and it does not share this one's job. If that surface were deleted tomorrow this module
// must remain correct and SUFFICIENT — every paid-but-unconfirmed booking still reaches `confirmed` on a
// schedule. Never move work out of here on the grounds that the fast path also does it.
//
// ── THE SHAPE IS DELIBERATELY payout-reconcile.ts's ─────────────────────────────────────────────────────
// Same 2-arg `inngest.createFunction` form with `triggers`, same `concurrency: 1` singleton, same
// `dbConn: DbConn = db` parameterisation so an isolated-schema test can inject a connection, same one
// `step.run` per row so a mid-batch failure retries ONLY that row, and the same "the guard is the
// authority" discipline — except the guard is not ours. It lives in `confirmPaidBooking`'s status-scoped
// UPDATE, which is why this module owns no UPDATE of its own (D-105, below).
//
// ── D-104: THE PROVIDER IS AUTHORITATIVE; THE BROWSER NEVER IS ──────────────────────────────────────────
// PROJECT D-57 bans confirming on `?paid=1` because a URL is spoofable, and this phase does not weaken that
// by one line. What runs here is a SERVER-TO-SERVER read of PayMongo's own record — the same source of
// truth as the webhook, over a different transport. Reconciling from it is legitimate exactly where
// trusting a redirect is not, and the distinction is structural rather than remembered: this module runs on
// a CRON, where no browser, no `Request`, no header and no query parameter exists. There is nothing here
// for a client to reach.
//
// ── D-105: ONE ROAD TO `confirmed` ──────────────────────────────────────────────────────────────────────
// The sweep calls `confirmPaidBooking` and writes NO booking UPDATE itself. Two roads to `confirmed` is how
// one payment produces two payout-ledger rows and two emails. A pass over an already-confirmed row is a
// zero-effect no-op because that function's status-scoped claim says so — not because we checked first.
//
// ── FAIL-CLOSED IN EVERY DIRECTION ──────────────────────────────────────────────────────────────────────
// A `null` probe means "we did not learn", NEVER "not paid" — `checkout-probe.ts` resolves `null` on a
// timeout, a network error, a non-2xx, an unrecognised body and a missing secret alike, so treating it as
// evidence of anything would be inventing a fact out of a failure. `active` and `expired` leave the row
// alone too. ONLY the provider's own record saying `paid` moves anything.
//
// ── BOUNDED, BECAUSE A SWEEP THAT PROBES EVERYTHING IS A PROVIDER-LOAD BUG ───────────────────────────────
// Four independent bounds, all in `queryUnconfirmedPaid`: the payable-status scope, `checkout_session_id
// IS NOT NULL` (never spend a round trip on a row with nothing to ask about), `RECONCILE_EPOCH` (D-111) and
// `RECONCILE_BATCH_LIMIT`. Each probe is itself capped at `CHECKOUT_PROBE_TIMEOUT_MS` (3s), so a saturated
// pass is bounded in wall time too, and `concurrency: 1` means passes can never pile up on each other.

import { sql } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import type { DbConn } from "@/lib/availability/read-model";
import { probeCheckoutSession } from "@/lib/payments/checkout-probe";
import { confirmPaidBooking, type ConfirmOutcome } from "@/lib/payments/confirm-booking-payment";
import { recordAudit } from "@/lib/audit";

/**
 * D-107 — HOW OFTEN THE SWEEP RUNS. **DERIVED, NOT PREFERRED.**
 *
 * A 5-minute sweep runs THREE TIMES inside a 15-minute hold (`HOLD_TTL_MINUTES`,
 * `src/lib/availability/units.ts`). So a lost webhook is reconciled *while the booker's own hold still
 * occupies the slot* under the GiST EXCLUDE in `drizzle/0005_booking_exclusion.sql` — nobody else can have
 * taken it in the meantime, and the booker keeps the slot they actually paid for. That is what makes the
 * PM's "this should never happen" nearly true in practice rather than merely aspirational.
 *
 * ⚠ LENGTHEN THIS AND THE GUARANTEE DIES SILENTLY — the sweep would still run, still confirm, still look
 * healthy, and just arrive after the hold had lapsed and the slot had been swept out from under the person
 * who paid for it. That is why the relationship is pinned as an ASSERTION over the real imported
 * `HOLD_TTL_MINUTES` in `tests/payments/payment-reconcile-cadence.test.ts` and not as a comment here: a
 * comment cannot go red. Raising this number to 20 was performed on purpose during 13.1-02 and made that
 * spec fail; see the verbatim output in its header.
 */
export const RECONCILE_INTERVAL_MINUTES = 5;

/**
 * The MINIMUM AGE a booking must reach before the sweep will probe it.
 *
 * WHY A FLOOR EXISTS AT ALL: without it the sweep races HEALTHY webhooks. A payment that settled four
 * seconds ago is not a missed webhook — it is a webhook in flight — and probing it would confirm through a
 * second road for no reason and, worse, file a D-110 "webhook missed" alert on a settlement that was about
 * to land normally. An alert channel that fires on non-events gets filtered to trash
 * (`ops-alert-digest.ts`, D-J3Z-05), and once filtered, the one day it carries real stranded money is the
 * day nobody opens it.
 *
 * WHY TWO MINUTES: `src/lib/payments/config.ts` records the MEASURED normal cost of two PayMongo round
 * trips plus two local UPDATEs at ~2 SECONDS, so a healthy settlement is done roughly sixty times over
 * inside this window. The ceiling is D-107's inequality — min-age plus interval must stay strictly under
 * `HOLD_TTL_MINUTES`, which is what stops this number growing "just to be safe" until the guarantee is
 * gone. Same floor-and-ceiling reasoning `CHECKOUT_PROBE_TIMEOUT_MS` and `SUPPORT_ESCALATION_MS` carry.
 */
export const RECONCILE_MIN_AGE_MINUTES = 2;

/**
 * D-111 — NO BACKFILL. The sweep reconciles from SHIP-FORWARD and never reaches back over history.
 *
 * PM decision, verbatim: *"only new ones, we are on dev, everything we do is experimental, and ensure we
 * don't break on real-world transactions."* The two evidence bookings this whole phase exists because of —
 * `09f32400-b636-46e1-973a-b930a073a936` and `408e054a-cb5a-4dbb-9282-9883e0bfc628` — are deliberately
 * left `pending` as FIXTURES. A sweep that reached back would confirm them, destroy the fixtures, and move
 * real (if experimental) money on rows nobody asked it to touch.
 *
 * MEASURED, NOT ASSUMED: the later fixture's `created_at` is **2026-08-21T18:17:12.839383Z** (read from
 * dev's `booking` table on 2026-08-22). The 13.1-02 plan's prose named the bound as
 * `2026-08-21T18:17:00+08:00`, i.e. 10:17Z — eight hours EARLIER than the row it was meant to exclude, so
 * an epoch honouring the prose literally would have swept the very fixture D-111 protects. The instant
 * below is after both fixtures by more than nine hours; the assertion in the cadence spec is written
 * against the measured value.
 *
 * NOT READ FROM THE ENVIRONMENT, deliberately. An unset variable would either backfill silently (falling
 * back to epoch zero) or disable the sweep silently (falling back to a far-future instant), and both are
 * worse than a constant somebody has to edit on purpose in a reviewed commit.
 */
export const RECONCILE_EPOCH = new Date("2026-08-22T12:00:00+08:00");

/**
 * The hard bound on ONE pass. Each row costs at most one 3s probe, so 50 bounds the pass in provider calls
 * AND in wall time; `concurrency: 1` means the next pass cannot start on top of a slow one. Rows are taken
 * oldest-first, so a backlog drains in order and nothing starves.
 */
export const RECONCILE_BATCH_LIMIT = 50;

/**
 * The minute the sweep's schedule starts on. Not 0, 15, 30, 45 or 50 — the five slots the existing crons
 * already occupy (payout sweep :00, request expiry :15, payout reconcile :30, reminders :45, ops digest
 * 08:50). Pitfall 4's offset discipline: crons that tick together contend for the same database.
 */
const RECONCILE_START_MINUTE = 2;

/**
 * The cron trigger string, BUILT from the constants above rather than typed out.
 *
 * Deriving it is the point: a hand-written schedule and a hand-written interval constant can drift apart,
 * and if they do, D-107's inequality would be guarding a number the deployed cron no longer honours. Here
 * the schedule the sweep actually ships with and the number the inequality protects are the same value,
 * and `payment-reconcile-cadence.test.ts` parses this string back out to prove it.
 *
 * The minute field is spelled `START-59/STEP` rather than `START/STEP`: the bare `2/5` form is a Quartz
 * extension, while `2-59/5` is valid POSIX/vixie cron and is accepted by every parser in the chain.
 */
export function reconcileCron(): string {
  return `TZ=Asia/Manila ${RECONCILE_START_MINUTE}-59/${RECONCILE_INTERVAL_MINUTES} * * * *`;
}

/** One paid-but-unconfirmed candidate, exactly the columns the reconcile decides on. */
export type UnconfirmedPaidRow = {
  id: string;
  checkoutSessionId: string;
  /** The hold's expiry, read BEFORE the confirm nulls it — D-106 has no other chance to see it. */
  expiresAt: Date | string | null;
  status: string;
};

/** What one reconcile pass over one row did. `ConfirmOutcome` plus the two "we did not act" answers. */
export type ReconcileOutcome = "unknown" | "not-paid" | ConfirmOutcome;

/** JSON-serializable so it can be the body of a `step.run`. */
export type ReconcileResult = { bookingId: string; outcome: ReconcileOutcome };

/**
 * The candidate set: recent, still-payable bookings that hold a checkout session we can ask about.
 *
 * ⚠ THE STATUS SCOPE IS LOAD-BEARING TWICE OVER, and it is the reason this query is bounded the way it is:
 *
 *   1. It matches `confirmPaidBooking`'s own claim — `status IN ('pending','approved')` — so the sweep can
 *      never hand the confirm a row it would refuse. `pending` is an instant hold; `approved` is a
 *      host-approved request whose booker is paying through the same checkout (PAY-05 / D-63). BOTH are
 *      payable and BOTH lose the same webhook, so reconciling only one of them would leave an entire
 *      payment mode unguaranteed. `requested` is NOT payable (no approval yet) and is correctly out.
 *
 *   2. It keeps TERMINAL rows out, which is what stops D-110 dying of its own noise. MEASURED by 13.1-01
 *      (`tests/payments/confirm-idempotency.test.ts` case 5, and row 1 of this phase's `deferred-items.md`):
 *      `handleGoneSlot`'s re-read short-circuits on `confirmed` but NOT on `cancelled`, so a dead row
 *      handed to the confirm writes a fresh `needs_attention` audit record on EVERY pass. At a 5-minute
 *      cadence that is one alert every five minutes forever off a single dead booking, and an operator
 *      queue nobody can read is worse than no queue at all. The money-critical half is already safe
 *      (`createRefund` stays at zero across re-runs, T-13.1-06); it is the ALERTING that degrades, and the
 *      fix belongs here — in the candidate set — because a sweep has no `paymongo_event` ledger in front
 *      of it the way the webhook does.
 *
 * The AGE comparison uses the POSTGRES clock (`now()`), not `Date.now()`. This predicate decides whether
 * real money gets probed and possibly confirmed; `payout-reconcile.ts` reserves the JS clock for advisory
 * alert timing only, and this is not that.
 *
 * Takes an explicit `dbConn` so an isolated-schema test can inject a connection; defaults to the prod `db`.
 */
export async function queryUnconfirmedPaid(dbConn: DbConn = db): Promise<UnconfirmedPaidRow[]> {
  return (await dbConn.execute(sql`
    SELECT id,
           checkout_session_id AS "checkoutSessionId",
           expires_at          AS "expiresAt",
           status
    FROM booking
    WHERE status IN ('pending', 'approved')
      AND checkout_session_id IS NOT NULL
      AND created_at >= ${RECONCILE_EPOCH}
      AND created_at <= now() - make_interval(mins => ${RECONCILE_MIN_AGE_MINUTES}::int)
    ORDER BY created_at ASC
    LIMIT ${RECONCILE_BATCH_LIMIT}
  `)) as unknown as UnconfirmedPaidRow[];
}

/**
 * Reconcile ONE candidate: ask PayMongo what it already knows, and route a paid session through the one
 * confirm path. Every branch fails closed toward doing NOTHING.
 *
 * D-110 — A MISSED WEBHOOK IS LOUD, and it fires on outcome `"confirmed"` and on NOTHING ELSE:
 *
 *   - `"already-confirmed"` means we raced the webhook and lost. That is the system WORKING, and alerting
 *     on it would file one `needs_attention` row per healthy settlement.
 *   - `"gone-refunded"` / `"gone-manual-return"` already wrote their own `needs_attention` record inside
 *     the D-58 backstop. A second one here is the same stranded money counted twice in the operator's
 *     queue, which is how a real alert gets lost among duplicates of itself.
 *   - `"unknown"` / `"not-paid"` learned nothing and changed nothing. There is no event to report.
 *
 * Returns its outcome rather than throwing on anything the caller could act on: the cron's job is to keep
 * sweeping, and a per-row failure is retried by its own `step.run`.
 */
export async function reconcileOne(
  row: UnconfirmedPaidRow,
  dbConn: DbConn = db,
): Promise<ReconcileResult> {
  const probe = await probeCheckoutSession(row.checkoutSessionId);

  // `null` = WE DID NOT LEARN (timeout, network, non-2xx, unreadable body, no secret configured). It is
  // never evidence that the booking was not paid, so it can never be a reason to touch the row.
  if (probe === null) return { bookingId: row.id, outcome: "unknown" };

  // Strict equality on the RAW provider string — the `expireCheckoutSession` / `readPaymentState`
  // discipline. No trimming, no lower-casing, no `includes`: any normalisation would widen the ONE status
  // that is allowed to move money-adjacent state by an unknown amount.
  if (probe.status !== "paid") return { bookingId: row.id, outcome: "not-paid" };

  // D-105: the ONLY route to `confirmed`. No UPDATE of our own, and deliberately NO hold-expiry gate in
  // front of it — a legitimately paid but lapsed hold MUST still confirm (the GiST EXCLUDE, not the TTL, is
  // the double-confirm authority; re-imposing the Phase-4 `expires_at > now()` check here would charge a
  // booker and give them nothing, which is the exact failure 05-04 exists to prevent).
  const outcome = await confirmPaidBooking(
    {
      bookingId: row.id,
      paymentId: probe.paymentId,
      // The rail resolved the SAME way both callers resolve it — it feeds `isApiRefundable`, which fails
      // closed, so a rail resolved one way at confirm and another at refund time is a silent money bug.
      paymentMethod: probe.sourceType ?? "unknown",
    },
    dbConn,
  );

  if (outcome === "confirmed") {
    // A GENUINE transition: this booking was paid at the provider, its webhook never arrived, and the
    // sweep is the only reason the booker has a booking. The transport failing must be OBSERVABLE — today
    // it is not — so it goes to the machinery that already exists (`recordAudit` + `needs_attention` +
    // the daily ops digest), never a parallel alerting system. Server-side ONLY: this raises no
    // booker-facing support affordance, and `SUPPORT_EMAIL` stays null (D-110 / site-contacts).
    const expiresAt = row.expiresAt === null ? null : new Date(row.expiresAt);
    const paidAt = probe.paidAt;

    // D-106, REALISED AS A RECORDED CLASSIFICATION AND NOT AS A GATE.
    // Paid INSIDE the hold window ⇒ the slot was rightfully theirs and any loss of it is FitOut's failure,
    // not the booker's. Paid AFTER expiry ⇒ they paid on a dead hold and D-108's retained gone-slot
    // backstop governs what happens to the money. Either way the confirm above ALREADY RAN: this decides
    // nothing, it tells the operator which of the two situations they are looking at.
    // `null` when either instant is unknown — never `false`, which would read as a definite "paid late"
    // about a booking we simply cannot place.
    const paidWithinHold =
      paidAt !== null && expiresAt !== null ? paidAt.getTime() <= expiresAt.getTime() : null;

    // Ids, the rail, instants and one boolean — nothing else. D-72 binds `audit.meta` as a COLUMN-level
    // rule ("not in this audit meta, not in any log line, not in any column"), and these rows are rendered
    // into the ops digest EMAIL, which is an external service that forwards, archives and indexes. No
    // email address, no account identifier, no name, no amount-holder — the same class of meta
    // `handleGoneSlot` already carries.
    const meta = {
      bookingId: row.id,
      checkoutSessionId: row.checkoutSessionId,
      paymentId: probe.paymentId,
      method: probe.sourceType ?? "unknown",
      paidAt: paidAt === null ? null : paidAt.toISOString(),
      expiresAt: expiresAt === null ? null : expiresAt.toISOString(),
      paidWithinHold,
    };

    console.error("[PAYMENT_ALERT] webhook_missed", meta);
    await recordAudit({
      actorId: "system",
      action: "webhook_missed",
      outcome: "needs_attention",
      meta,
    });
  }

  return { bookingId: row.id, outcome };
}

/**
 * The D-107 sweep: a 5-minute, timezone-aware, SINGLETON (`concurrency: 1`) cron on an offset minute so it
 * never contends with the five existing crons. Each candidate is reconciled inside its OWN Inngest step, so
 * one row whose probe times out retries just that row rather than re-probing the whole batch.
 *
 * The 2-arg `createFunction(options, handler)` form with the trigger in `options.triggers` is inngest
 * 4.13.0's API — the same Rule-3 correction `payout-sweep.ts` and `payout-reconcile.ts` already carry.
 */
export const paymentReconcile = inngest.createFunction(
  {
    id: "payment-reconcile",
    concurrency: 1, // singleton — passes never overlap, so provider load stays bounded per pass
    triggers: [{ cron: reconcileCron() }],
  },
  async ({ step }) => {
    const candidates = await step.run("find-unconfirmed-paid", () => queryUnconfirmedPaid(db));

    const tally: Record<string, number> = {};
    for (const row of candidates) {
      const result = (await step.run(`reconcile-${row.id}`, () =>
        reconcileOne(row, db),
      )) as ReconcileResult;
      tally[result.outcome] = (tally[result.outcome] ?? 0) + 1;
    }

    return { scanned: candidates.length, outcomes: tally };
  },
);
