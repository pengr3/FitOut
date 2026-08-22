import "server-only";

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE RETIRE POLICY (13.1-CONTEXT D-113) — when a hold lapses, the ability to pay lapses with it.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
//
// ── RULE 1, AND IT IS THE HEADLINE: `retireCheckoutForBooking` NEVER THROWS AND NEVER REJECTS. ──────────
// For ANY input, under ANY provider or database failure. Freeing a slot is FitOut's OWN act and must never
// depend on a third party answering (D-113, verbatim: *"FREEING THE SLOT MUST NEVER DEPEND ON THE PROVIDER
// ANSWERING"*). This is enforced STRUCTURALLY, not by discipline: the entire body of both exported
// functions sits inside one `try` whose `catch` returns `"failed"`. That catch also covers `recordAudit`
// itself failing, which is why the guarantee does not rest on `recordAudit`'s own "cannot throw" contract.
//
// ⚠ WHY THIS IS NOT DEFENSIVE PROGRAMMING BUT A LOAD-BEARING CONTRACT. 13.1-05 calls this policy from
// inside `createPendingHold`'s existing `try`, whose `catch` runs `mapBookingError`, which RE-THROWS
// unknown errors. A policy that could throw would therefore turn a PayMongo outage into a FAILED BOOKING
// for a booker who has done nothing wrong — the provider's availability would become FitOut's availability.
// The three never-throw cases in `tests/payments/retire-checkout.test.ts` (probe rejects / expire rejects /
// recordAudit rejects, each asserted with `.resolves`) are what hold this, and they must never be softened
// into a try/catch that can pass by never running.
//
// ── RULE 2: THIS MODULE WRITES NO `booking` ROW. NOT ONE. ───────────────────────────────────────────────
// No status flip, no `checkout_session_id` nulling, no marker column, no UPDATE of any kind. In particular
// it NEVER flips a lapsed `pending` row to `cancelled`, which is the single most likely thing for a future
// reader to "tidy up" and would silently destroy the phase this file belongs to:
//
//   `pending` is precisely and ONLY the status plan 13.1-02's `queryUnconfirmedPaid` selects. Cancelling a
//   lapsed hold removes it from that selection, so a booker who paid AT THE LAST SECOND — the exact person
//   this whole phase exists for — would never be reconciled, never be confirmed, and never be told.
//
// Retiring the SESSION and retiring the BOOKING are two different facts and only the first is D-113's.
//
// ── PROBE FIRST, EXPIRE SECOND — AND NEVER EXPIRE A PAID SESSION ────────────────────────────────────────
// Four reasons, all load-bearing:
//
//   1. EVIDENCE PRESERVATION IN ITS STRONGEST FORM. A session the provider reports `paid` is never sent to
//      `expireCheckoutSession` AT ALL. Evidence cannot be destroyed by a call that is never made. This is
//      strictly stronger than relying on the wrapper's own `paid` throw, because it is a call count of
//      ZERO rather than an error that happened not to be swallowed.
//   2. `already-retired` IS THE STEADY STATE. After the first retire the session reads `expired`, so every
//      later visit costs ONE GET and zero POSTs — instead of a POST(400) plus a recovery GET each time.
//   3. `probeCheckoutSession` CANNOT THROW (`checkout-probe.ts`: it resolves `null` on anything at all), so
//      the classification below is TOTAL and this module's never-throw contract is structural.
//   4. THE RESIDUAL TOCTOU IS OBSERVABLE, NOT SILENT. Probe says `active`, the booker pays in the
//      milliseconds that follow, the expire lands on a now-`paid` session — that is exactly the case
//      `expireCheckoutSession` THROWS on, and it becomes a `needs_attention` row carrying
//      `probedStatus: "active"`, which is the operator's handle on the window.
//
// `src/lib/paymongo.ts` is NOT edited by this module's plan. Its two behaviours are inherited verbatim: the
// LW-01 inner catch that tolerates a repeat-expire 400 only when the provider itself re-reports `expired`,
// and its deliberate THROW on `paid`. So is its discipline — strict raw-string equality, no normalisation,
// no enumerated reject-list, and provider prose NEVER chained into an audit or a response
// (T-05-15 / T-08-44).
//
// ── D-110: A FAILED RETIRE IS OPERATOR-VISIBLE, THROUGH MACHINERY THAT ALREADY EXISTS ───────────────────
// `recordAudit({ action: "checkout_expire_failed", outcome: "needs_attention" })` — the SAME action name
// the re-price path already writes (`src/app/actions/booking.ts`), so the existing ops digest reaches it
// through `listUnresolvedAlerts`'s `needs_attention AND resolved_at IS NULL` predicate with no parallel
// alerting system and no booker-facing support affordance.
//
// ── D-104: NO BROWSER INPUT REACHES ANY OF THIS ─────────────────────────────────────────────────────────
// Every caller reads the session id from a `booking` ROW. There is no `searchParams`, header, body or
// client field anywhere in this module's graph, and no surface calls it.

import { probeCheckoutSession } from "@/lib/payments/checkout-probe";
import { expireCheckoutSession } from "@/lib/paymongo";
import { recordAudit } from "@/lib/audit";

/**
 * The columns the retire decision is made on — and deliberately nothing else.
 *
 * `checkoutSessionId` is nullable because NULL is NORMAL, not an error: a hold that never reached checkout
 * has nothing to retire. `bookingStatus` is a plain string rather than a union because the four call sites
 * read it straight out of the row, and narrowing it here would only invite a cast at every one of them.
 */
export type RetirableSession = {
  bookingId: string;
  checkoutSessionId: string | null;
  bookingStatus: string;
};

/**
 * WHICH LAPSE PRODUCED THIS RETIRE. A closed union of exactly the four call sites, named here so an audit
 * row says where it came from and so the POLICY stays the one owner rather than a thing each site
 * re-derives.
 *
 *   - `retire-sweep`          — `src/inngest/functions/checkout-retire.ts`, THE GUARANTEE (13.1-04).
 *   - `stale-hold-reclaim`    — the exclusive in-tx reclaim inside `createPendingHold` (13.1-05).
 *   - `open-capacity-reclaim` — the SECOND reclaim, inside `createOpenCapacityHold` (13.1-05).
 *   - `request-expiry`        — `expireOne`'s `approved → cancelled` payment-window release (13.1-05).
 *
 * Only the first has a caller today. The other three are named now on purpose: 13.1-05 wires them, and a
 * union that already contains them cannot be widened by a call site inventing its own string.
 */
export type RetireTrigger =
  | "retire-sweep"
  | "stale-hold-reclaim"
  | "open-capacity-reclaim"
  | "request-expiry";

/**
 * The most sessions ONE booker-facing hold placement will retire before leaving the rest to the sweep.
 *
 * WHY A BOUND EXISTS AT ALL: 13.1-05's reclaim paths run inside a booker's own request. A single
 * `createPendingHold` can reclaim several lapsed holds at once, and each retire costs up to one 3s probe
 * plus one POST. A booker placing a hold must not pay unbounded provider latency for OTHER people's
 * abandoned checkouts.
 *
 * WHY IT IS SAFE TO DROP THE REST ON THE FLOOR: the sweep is the guarantee. Anything skipped here is still
 * inside `RETIRE_LOOKBACK_MINUTES` and is retired on the next tick. The inline wiring is an ACCELERANT —
 * it makes a lapsed session die in seconds instead of minutes; it is not the promise.
 */
export const RETIRE_INLINE_LIMIT = 3;

/**
 * What one retire attempt did. A CLOSED union — six members, each a distinct fact about the provider's
 * record, never a proxy for "success".
 *
 *   - `no-session`      — the row holds no `checkout_session_id`. NO provider call was made.
 *   - `unknown`         — the probe did not answer. We DID NOT LEARN; nothing was posted, nothing audited.
 *   - `already-retired` — the provider already reports `expired`. The steady state, and silent by design.
 *   - `paid-left-intact`— the provider reports `paid`. The session was NOT expired and NOT touched.
 *   - `retired`         — the expire resolved: the provider says this session can no longer take money.
 *   - `failed`          — the expire threw, or something unexpected did. An operator alert, not a rollback.
 */
export type RetireOutcome =
  | "no-session"
  | "already-retired"
  | "paid-left-intact"
  | "retired"
  | "unknown"
  | "failed";

/**
 * Retire the checkout session of ONE lapsed hold: probe, classify, expire only what is still payable,
 * alert what failed — and NEVER throw.
 *
 * The caller is expected to have ALREADY freed the slot in its own database (or to be about to). This
 * function's answer is advisory: it reports what happened at the provider, and no caller may make its own
 * durable work conditional on it.
 */
export async function retireCheckoutForBooking(
  row: RetirableSession,
  trigger: RetireTrigger,
): Promise<RetireOutcome> {
  // ⚠ THE NEVER-THROW BOUNDARY. Everything below is inside this try — including every `recordAudit` call —
  // so the contract holds even when the audit sink is the thing that failed. See the header's Rule 1.
  try {
    // NULL IS NORMAL, NOT AN ERROR. A hold that never reached checkout has nothing to retire, and calling
    // PayMongo for it would be a FABRICATED REQUEST (the `updateDeclaredPax` precedent, 08-12 contract 2:
    // the same reasoning that makes `booking.ts`'s expire gate null-checked rather than optimistic).
    if (row.checkoutSessionId == null) return "no-session";

    const probe = await probeCheckoutSession(row.checkoutSessionId);

    // `null` MEANS "WE DID NOT LEARN" — and it means that and nothing else. `checkout-probe.ts` resolves
    // `null` on a timeout, a network error, a non-2xx, an unreadable body and a missing secret ALIKE, so it
    // is never evidence that the session is "not payable" and never evidence that it is "not paid". Acting
    // on it in either direction would be inventing a fact out of a failure.
    //
    // So: NO POST and NO AUDIT. The recovery is the next sweep tick — the row stays inside
    // `RETIRE_LOOKBACK_MINUTES` for several more passes, and an alert on a transient provider blip would
    // be a non-event in the operator's queue, which is how a real alert gets filtered to trash
    // (`ops-alert-digest.ts`, D-J3Z-05).
    if (probe === null) return "unknown";

    // Strict equality on the RAW provider string throughout — `expireCheckoutSession`'s discipline
    // (paymongo.ts) and `readPaymentState`'s. No trimming, no lower-casing, no `includes`: any
    // normalisation would widen these branches by an unknown amount.

    // ALREADY RETIRED — the steady state after the first successful retire, and it must stay SILENT. An
    // alert channel that fires on non-events gets filtered to trash, and once filtered, the one day it
    // carries real stranded money is the day nobody opens it.
    if (probe.status === "expired") return "already-retired";

    // ── THE EVIDENCE BRANCH. DO NOT CALL `expireCheckoutSession` HERE. ────────────────────────────────
    // The money is REAL and the session is the only handle on it. This is not "expire and tolerate the
    // throw" — it is a provider call that is never made at all.
    if (probe.status === "paid") {
      // THE ALERT RULE, WRITTEN AS A RULE. A `paid` session on a still-`pending` row is DELIBERATELY
      // SILENT, because `pending` is precisely and only the status plan 13.1-02's `queryUnconfirmedPaid`
      // selects: that row WILL be confirmed and alerted by `payment-reconcile`, and a second row here
      // would be one payment counted TWICE in the operator's queue.
      //
      // ⚠ `queryUnconfirmedPaid` IS NAMED HERE ON PURPOSE. If anyone ever widens or narrows that
      // selector, this line is what they must revisit — narrowing it (dropping `pending`) would make this
      // branch the ONLY report of a real capture, and silencing it would strand the money in silence.
      //
      // Every other status — `approved` (which `queryUnconfirmedPaid` also selects today, but whose
      // session may be retired by 13.1-05's request-expiry wiring), or a row already flipped terminal by a
      // reclaim — is the case NO reconciler reaches. That is exactly why this alert exists.
      if (row.bookingStatus !== "pending") {
        await recordAudit({
          actorId: "system",
          action: "checkout_paid_after_lapse",
          outcome: "needs_attention",
          meta: {
            ...retireMeta(row, trigger, probe.status),
            // The `pay_...` plan 13.1-01 added to `CheckoutSessionState`, plus the instant PayMongo says
            // it was paid — so an operator can act on this BY HAND without a psql session. Ids and
            // instants only; see `retireMeta` for what D-72 keeps out.
            paymentId: probe.paymentId,
            paidAt: probe.paidAt === null ? null : probe.paidAt.toISOString(),
          },
        });
      }
      return "paid-left-intact";
    }

    // ── EVERY OTHER STATUS FALLS THROUGH TO THE EXPIRE, DELIBERATELY. ────────────────────────────────
    // Including `active` and including anything PayMongo adds later. This is NOT an enumerated allow-list
    // of `active`, and the direction is the point: on a LAPSED hold an unrecognised status must be treated
    // as POSSIBLY-PAYABLE and retired, because the cost of not retiring is money taken for a booking
    // FitOut no longer holds.
    //
    // That is the OPPOSITE direction from `readPaymentState`'s fall-through, and for the opposite reason:
    // there an unknown pair must not license COPY, so it reads `indeterminate`; here an unknown status
    // must not license a PAYMENT, so it is retired. Both fail toward the harmless answer for their own
    // surface, which is why they differ.
    try {
      await expireCheckoutSession(row.checkoutSessionId);
    } catch {
      // DELIBERATELY EMPTY BINDING — the caught value is PayMongo's prose and it stops here, exactly as
      // `checkout-probe.ts` and `booking.ts`'s expire gate already discard it (T-05-15 / T-08-44). It is
      // not chained, not `cause`-attached, not logged and not put in the meta below.
      //
      // A FAILED EXPIRE IS AN OPERATOR ALERT, NEVER A ROLLBACK AND NEVER A THROW (D-113). The slot is
      // FitOut's to free and it stays freed; what failed is only our ability to close the session at the
      // provider, and that is exactly the kind of outstanding money-adjacent condition the
      // `needs_attention` queue exists for. The action name is the one the re-price path already writes,
      // per D-113's instruction to follow that precedent rather than invent a shape.
      await recordAudit({
        actorId: "system",
        action: "checkout_expire_failed",
        outcome: "needs_attention",
        meta: retireMeta(row, trigger, probe.status),
      });
      return "failed";
    }

    // A durable trail of the retire itself. `ok`, NOT `needs_attention` — this is the system working, and
    // filing it in the operator's queue would bury the rows that are not.
    await recordAudit({
      actorId: "system",
      action: "checkout_retired",
      outcome: "ok",
      meta: retireMeta(row, trigger, probe.status),
    });
    return "retired";
  } catch {
    // THE STRUCTURAL NEVER-THROW CATCH. Reached when something OUTSIDE the branches above fails — most
    // realistically `recordAudit` itself, which is why this module does not lean on that function's own
    // contract. The caught value is deliberately NOT included in the log line: it may be a provider error,
    // and the discard discipline is absolute (see the header).
    console.error("[checkout-retire] unexpected", {
      bookingId: row.bookingId,
      trigger,
    });
    return "failed";
  }
}

/**
 * Retire a BATCH of lapsed holds, sequentially and under a hard bound.
 *
 * SEQUENTIAL, NEVER `Promise.all`. A reclaim retiring three sessions must not open three concurrent
 * provider connections from a booker's own request path — the latency a booker feels is the sum either
 * way, but the connections and the provider's rate budget are not.
 *
 * BOUNDED by `opts.limit ?? RETIRE_INLINE_LIMIT`. Rows with no session consume NO budget, because they
 * cost no provider call: skipping them is free and spending budget on them would let a handful of
 * never-checked-out holds crowd out the ones that actually hold a payable session.
 *
 * Returns one outcome per row it PROCESSED, in order, and stops when the budget is spent. It deliberately
 * does NOT pad the array out to `rows.length`: an unvisited row is not a `"no-session"` row, and reporting
 * it as one would be the policy claiming knowledge it does not have. Inherits the never-throw contract by
 * construction — every element comes from `retireCheckoutForBooking`, which cannot reject.
 */
export async function retireCheckoutsForBookings(
  rows: RetirableSession[],
  trigger: RetireTrigger,
  opts?: { limit?: number },
): Promise<RetireOutcome[]> {
  const limit = opts?.limit ?? RETIRE_INLINE_LIMIT;
  const outcomes: RetireOutcome[] = [];
  let spent = 0;

  for (const row of rows) {
    if (row.checkoutSessionId == null) {
      // No provider call ⇒ no budget consumed. Recorded so the caller still sees the row was visited.
      outcomes.push("no-session");
      continue;
    }
    if (spent >= limit) break;
    spent += 1;
    // Awaited INSIDE the loop — this is the sequentiality, and `tests/payments/retire-checkout.test.ts`
    // asserts it by measuring maximum in-flight concurrency (1), not merely by counting calls.
    outcomes.push(await retireCheckoutForBooking(row, trigger));
  }

  return outcomes;
}

/**
 * The audit `meta` every row in this module carries, and EXACTLY this — five fields.
 *
 * D-72 binds `audit.meta` as a STORED jsonb COLUMN ("not in this audit meta, not in any log line, not in
 * any column"), and these rows are rendered into the ops digest EMAIL, which is an external service that
 * forwards, archives and indexes. So: no amount, no email address, no account identifier, no name, no
 * PayMongo prose and no `cause`. The session id belongs here precisely BECAUSE an operator needs it to
 * retire the session by hand — it is an API resource identifier, not a bearer credential.
 *
 * The same class of meta `handleGoneSlot` and `payment-reconcile` already carry.
 */
function retireMeta(
  row: RetirableSession,
  trigger: RetireTrigger,
  probedStatus: string,
): Record<string, unknown> {
  return {
    bookingId: row.bookingId,
    checkoutSessionId: row.checkoutSessionId,
    trigger,
    bookingStatus: row.bookingStatus,
    probedStatus,
  };
}
