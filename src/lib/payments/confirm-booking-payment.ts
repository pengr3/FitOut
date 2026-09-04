import "server-only";

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE ONE CONFIRM PATH (13.1-CONTEXT D-105). A booking reaches `confirmed` HERE and nowhere else.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
//
// WHY THIS MODULE EXISTS, AND WHY IT IS AN EXTRACTION RATHER THAN A REDESIGN.
// Until 13.1-01 the confirm lived inline inside `export async function POST` in
// `src/app/api/paymongo/webhook/route.ts`. It was already SAFELY RE-ENTRANT at the row level (see the
// idempotency rule below) — the problem was purely structural: there was no exported function a cron or a
// server action could call, so a reconciliation sweep that finds a paid-but-unconfirmed booking had no way
// to reach `confirmed` except by writing a SECOND confirm. Two roads to `confirmed` is how one payment
// produces two payout-ledger rows and two emails. So the statements below were MOVED here verbatim — the
// arguments moved with them — and the webhook now CALLS this instead of owning it.
//
// ⚠ ADDING A SECOND CONFIRM SITE IS THE THING D-105 FORBIDS. If a future caller needs different
// behaviour, widen THIS function's inputs or its outcome union. Never write another
// `UPDATE booking SET status = 'confirmed'`.
//
// ── TWO RULES, NOT TWO OBSERVATIONS ─────────────────────────────────────────────────────────────────────
//
// (a) THE CONFIRM KEYS ON STATUS ALONE. Do NOT re-impose the Phase-4 `expires_at > now()` guard, and do
//     NOT add a `starts_at`/capacity/hold-window condition. A legitimately-paid-but-lapsed hold MUST still
//     confirm — otherwise the booker is charged with no booking and no automatic recovery, which is exactly
//     the failure 05-04 was built to prevent (D-57 / Pitfall 4). The GiST EXCLUDE
//     (`drizzle/0005_booking_exclusion.sql`), not the TTL, is the double-confirm authority.
//     `tests/paymongo/webhook-payment-paid.test.ts` carries the boxed guard case for this; do not "fix" it.
//
// (b) `REFUNDABLE_RAILS` IS NOT WIDENED, AND THE UNREFUNDABLE BRANCH NEVER CLAIMS A REFUND (D-108).
//     QRPh was re-probed on 2026-08-21 and returned the identical `HTTP 400` PayMongo returned on
//     2026-07-23 — PayMongo's published docs say otherwise and are wrong for this account. The gone-slot
//     backstop is RETAINED here, not deleted: deleting it would leave a booker who genuinely paid on a
//     long-dead hold with no slot AND no refund, which is worse than the case being fixed.
//
// ── THE IDEMPOTENCY CLAIM, STATED PRECISELY ─────────────────────────────────────────────────────────────
// The status-scoped UPDATE is the claim — `WHERE id = $1 AND status IN ('pending','approved') RETURNING id`.
// Under READ COMMITTED a concurrent second UPDATE of the same row BLOCKS on the row lock, then re-evaluates
// its WHERE against the committed version, sees `confirmed`, and returns zero rows. Exactly one caller can
// ever get ≥1 row — concurrently or sequentially — and EVERY side effect is gated on winning that claim.
// This is the same discipline `src/inngest/functions/payout-reconcile.ts` records for `AND state='processing'`.
//
// ⚠ THE `WHERE` SCOPE *IS* THE GUARANTEE. Widening it (dropping the status list, or "helpfully" allowing
// `confirmed` so a re-run refreshes the payment id) converts a re-entrant confirm into a duplicate-email,
// duplicate-side-effect machine. `tests/payments/confirm-idempotency.test.ts` fails on demand when it is
// dropped, and that break was observed rather than assumed.
//
// The `paymongo_event` table is NOT this guard: it dedupes redeliveries of the same PayMongo EVENT ID and
// lives in the route. A reconciliation sweep has no event id, so that ledger neither guards nor can guard
// it — and it must not fabricate one, which would be a second, weaker idempotency mechanism.
//
// ── D-104: THIS MODULE CANNOT BE TOLD A BOOKING IS PAID BY A BROWSER ────────────────────────────────────
// The input is three SERVER-DERIVED facts and nothing else: no `Request`, no headers, no query parameters,
// no session. Both shipped call sites derive them from a signature-verified PayMongo event or from a
// server-side read of PayMongo's own record. A `?paid=1` on a redirect is a UX signal and never an input
// here; the control proving that (`the browser return does NOT confirm`) lives in the webhook suite.

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { booking, listing, user } from "@/lib/db/schema";
import { createRefund } from "@/lib/paymongo";
// The rail-refundability question is answered in exactly ONE place (07-03). Do not re-inline the set here —
// if a later probe refutes the QRPh premise, that module is the only file that changes.
import { isApiRefundable } from "@/lib/payments/refund-rail";
import { recordAudit } from "@/lib/audit";
import { emitNotify } from "@/lib/notifications";
import { bookingReference } from "@/lib/booking/reference";
import { composeWhenLabel } from "@/lib/booking/when-label";
// TRUST-03 — the emailed cancellation-policy sentence, composed HERE (server-side, in the emitter's
// read) because the payload may carry a finished display string and never the Date/cents/tz it needs
// (D-86 / D-130 / GATE-05). `readDbNow` is the DB clock the whole ladder is contracted to
// (cancellation.ts:78) — never `new Date()`.
import { composePolicyEmailLine } from "@/lib/booking/policy-disclosure";
import { readDbNow } from "@/lib/booking/bookings-query";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import type { DbConn } from "@/lib/availability/read-model";

/**
 * What one call to {@link confirmPaidBooking} actually did. Reported so a caller can decide whether to
 * ALERT (13.1 D-110: a webhook that never arrived must be operator-visible) — never so a caller can
 * decide whether to retry the confirm, which is this module's own business.
 *
 *  - `confirmed`          — this call won the status-scoped claim: the row moved to `confirmed`, the
 *                           BOOK-06 receipt was emitted exactly once. The ONLY branch with side effects.
 *  - `already-confirmed`  — a benign replay/race: the booking was already `confirmed`. Nothing was written,
 *                           no email, and — critically — NO refund. Never refund a paid+confirmed booking.
 *  - `gone-refunded`      — the slot was genuinely gone and the rail was API-refundable, so the frozen
 *                           amount was refunded in full and the booking left terminal.
 *  - `gone-manual-return` — the slot was genuinely gone and the money could NOT be returned by API (an
 *                           unrefundable rail, no captured payment id, or a refund call that failed). An
 *                           operator alert was raised. ⚠ This outcome must NEVER be reported as refunded.
 *  - `not-found`          — no such booking. Nothing was read further and NOTHING was written.
 */
export type ConfirmOutcome =
  | "confirmed"
  | "already-confirmed"
  | "gone-refunded"
  | "gone-manual-return"
  | "not-found";

/**
 * The three SERVER-DERIVED payment facts the confirm needs.
 *
 * `paymentMethod` is a RESOLVED string, deliberately not a PayMongo event. This module must not know the
 * shape of a webhook event, because its second caller holds a probe rather than an event — the event-shape
 * resolver stays at the webhook, and each caller hands over an already-resolved rail. Both callers must
 * resolve it the SAME way, because the rail feeds `isApiRefundable`, which fails closed: a rail resolved
 * one way at confirm and another way at refund time is a silent divergence in which money moves.
 */
export type ConfirmPaidBookingInput = {
  bookingId: string;
  /** The captured `pay_...`, or null when the provider gave none. Persisted so a later refund can cite it. */
  paymentId: string | null;
  /** "card" | "gcash" | "paymaya" | "qrph" | … or "unknown" — never a client-supplied field. */
  paymentMethod: string;
};

/**
 * D-58 auto-refund backstop, RETAINED VERBATIM (D-108) — only its return type is new.
 *
 * A confirm that claimed 0 rows means one of two things: a BENIGN REPLAY (the booking is already
 * `confirmed` — do NOTHING, never refund a paid+confirmed booking) OR the slot is GENUINELY GONE (the hold
 * was swept and the slot retaken during payment — e.g. the double-book-during-payment loser). For the gone
 * case we must NEVER silently keep the money: refund on a refundable rail, or raise an operator alert on
 * QRPh/UBP (which PayMongo cannot API-refund, Pitfall 1) or on a failed refund. In BOTH gone-slot branches
 * we set the booking terminal (`cancelled`) so the booker's `?paid=1` return renders PaymentReversedState
 * rather than a stuck interstitial.
 *
 * WHY IT NOW RETURNS ITS BRANCH INSTEAD OF `void` — the ONE behavioural addition in the 13.1-01 extraction.
 * A sweep caller needs to distinguish "nothing to do, this was a replay" from "money is stranded and a
 * human must return it". It changes no audit row and no log line: both `[PAYMENT_ALERT]` lines and both
 * `needs_attention` records are moved byte-for-byte.
 */
async function handleGoneSlot(
  bookingId: string,
  paymentId: string | null,
  paymentMethod: string,
  dbConn: DbConn,
): Promise<Exclude<ConfirmOutcome, "confirmed">> {
  // Re-read to distinguish a benign replay (already confirmed → no-op) from a genuinely gone slot, and to
  // read the SERVER-FROZEN amount to refund (mismatch-proof full refund — never trust a client body field).
  const [current] = await dbConn
    .select({ status: booking.status, quotedTotalCents: booking.quotedTotalCents })
    .from(booking)
    .where(eq(booking.id, bookingId));
  if (!current) return "not-found";
  if (current.status === "confirmed") return "already-confirmed"; // never refund an already-confirmed booking

  const method = paymentMethod;
  const amountCents = current.quotedTotalCents ?? 0;
  let outcome: Exclude<ConfirmOutcome, "confirmed" | "already-confirmed" | "not-found">;

  if (isApiRefundable(method) && paymentId && amountCents > 0) {
    // Refundable rail (card / GCash / GrabPay / Maya) — auto-refund the full frozen amount (D-60: no % tiers).
    try {
      await createRefund({
        amountCents,
        paymentId,
        notes: `Auto-refund: slot unavailable (${bookingId})`,
      });
      console.info("[PAYMENT] auto_refund_ok", { bookingId, paymentId, method, amountCents });
      outcome = "gone-refunded";
    } catch {
      // A refund API failure falls through to the operator-alert path — never swallow held money. The
      // outcome is `gone-manual-return` and NOT `gone-refunded`: the money did not move, so no caller may
      // be handed a value that reads as if it did (D-108 — the manual-return branch never claims a refund).
      console.error("[PAYMENT_ALERT] auto_refund_failed", { bookingId, paymentId, method, amountCents });
      await recordAudit({
        actorId: "system",
        action: "auto_refund_failed",
        outcome: "needs_attention",
        meta: { bookingId, paymentId, method, amountCents },
      });
      outcome = "gone-manual-return";
    }
  } else {
    // Unrefundable rail (qrph / dob_ubp / unknown) or no captured payment id → DO NOT call the API (it
    // would 4xx, Pitfall 1). Raise an operator alert so the held money is surfaced, never silently kept.
    console.error("[PAYMENT_ALERT] needs_manual_refund", { bookingId, paymentId, method, amountCents });
    await recordAudit({
      actorId: "system",
      action: "auto_refund_manual",
      outcome: "needs_attention",
      meta: { bookingId, paymentId, method, amountCents },
    });
    outcome = "gone-manual-return";
  }

  // Both gone-slot branches: set the booking terminal (idempotency guard — never clobber a confirmed row)
  // so the ?paid=1 return renders PaymentReversedState (D-58) rather than a stuck finalizing interstitial.
  await dbConn.execute(sql`
    UPDATE booking SET status = 'cancelled' WHERE id = ${bookingId} AND status <> 'confirmed'`);

  return outcome;
}

/**
 * BOOK-06 booking-confirmed notification — emitted on a SUCCESSFUL confirm (≥1 row), covering BOTH an
 * instant pay (confirmed from `pending`) and a pay-on-approval request (confirmed from `approved`). Never
 * fired on a 0-row confirm (replay / gone-slot): only a genuine transition to `confirmed` earns the receipt,
 * and that is what makes a PayMongo REDELIVERY — or a reconciliation sweep racing the webhook — produce no
 * second notification. The status-scoped UPDATE is the dedupe claim, one layer above the `paymongo_event`
 * id ledger.
 *
 * 07-10 / D-83: this was `await sendBookingConfirmed(...)` behind a `void` call. It now emits the
 * `fitout/notify` event, so the send gains retry, backoff and per-run observability, and the durable in-app
 * notification row lands at parity (D-91).
 *
 * WHY THIS IS AWAITED RATHER THAN `void`ed. The old `void` existed to keep a slow Resend call off the
 * 200-ACK path (T-06-15) — a rejected ACK makes PayMongo retry an already-confirmed event forever. Two
 * things changed. First, `emitNotify` is an enqueue, not a delivery: it hands off one small event and
 * returns, and it CANNOT reject (it swallows and logs its own transport errors), so it can never turn into
 * a non-200. Second, `void`ing an enqueue is actively worse than awaiting it here — the handler can return
 * and the runtime can freeze the process before an un-awaited outbound request has flushed, silently losing
 * the notification. The bounded read + enqueue below is the correct trade for that guarantee.
 *
 * The `try/catch` remains for the READ (a DB hiccup on the join): the confirm already succeeded and is
 * durable, so nothing here may affect the caller's ACK.
 */
async function emitBookingConfirmed(bookingId: string, dbConn: DbConn): Promise<void> {
  try {
    const [row] = await dbConn
      .select({
        bookerId: booking.bookerId,
        email: user.email,
        title: listing.title,
        timezone: listing.timezone,
        city: listing.city,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        spacePriceCents: booking.spacePriceCents,
        quotedTotalCents: booking.quotedTotalCents,
        currency: booking.currency,
        // WR-06 pricing-mode snapshot + the formatter's pre-0016 positive-match reference (08-15).
        fullDay: booking.fullDay,
        // The OC-03 mode SNAPSHOT (drizzle 0021). The payment receipt is the most quoted-back surface in
        // the app, so a drop-in pass must read as a pass here above all (09-08).
        openCapacity: booking.openCapacity,
        dayRateCents: listing.dayRateCents,
        // The booking's OWN D-67 snapshot (never the listing's current tier — T-07-90) and the fee
        // portion of the frozen quote, so the emailed policy sentence is composed against the same
        // terms `quoteRefund` will apply at cancel time.
        cancellationPolicy: booking.cancellationPolicy,
        serviceFeeCents: booking.serviceFeeCents,
      })
      .from(booking)
      .innerJoin(user, eq(booking.bookerId, user.id))
      .innerJoin(listing, eq(booking.listingId, listing.id))
      .where(eq(booking.id, bookingId));
    if (!row) return;

    // The SHARED venue-local formatter (07-02). This replaced a verbatim inline copy that INFERRED the
    // mode by comparing a frozen price against a rate run-total — an inference that has since been deleted
    // outright (08-15 / CR-01), because the D-108 per-head surcharge is folded into `spacePriceCents` and
    // made it true of ordinary surcharged hourly bookings, printing "Full day" on this very receipt. The
    // mode now comes from the booking's own PERSISTED `full_day` snapshot, and the price is consulted only
    // by the formatter's pre-0016 positive day-rate match.
    const whenLabel = composeWhenLabel({
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      timezone: row.timezone,
      city: row.city,
      fullDay: row.fullDay,
      openCapacity: row.openCapacity,
      spacePriceCents: row.spacePriceCents,
      quotedTotalCents: row.quotedTotalCents,
      dayRateCents: row.dayRateCents,
    });
    // TRUST-03 — the policy sentence, composed ONCE here from the row's own snapshot and the DB clock.
    // `null` when the row has no tier to disclose (D-67), which writes no key at all rather than an
    // empty clause. The `??` fallbacks mirror the booking detail page's call site verbatim.
    const now = await readDbNow(dbConn);
    const policyLabel = composePolicyEmailLine({
      tier: row.cancellationPolicy,
      startsAt: row.startsAt,
      now,
      timezone: row.timezone,
      city: row.city,
      openCapacity: row.openCapacity,
      spacePriceCents: row.spacePriceCents ?? row.quotedTotalCents ?? 0,
      serviceFeeCents: row.serviceFeeCents ?? 0,
    });
    const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    await emitNotify({
      type: "booking_confirmed",
      recipientId: row.bookerId,
      bookingId,
      email: row.email,
      payload: {
        type: "booking_confirmed",
        listingTitle: row.title ?? "your space",
        whenLabel,
        totalLabel: formatMoney(row.quotedTotalCents ?? 0, row.currency ?? DISPLAY_CURRENCY),
        referenceLabel: bookingReference(bookingId),
        // ABSENT, not empty, when there is nothing to disclose (D-RPT-01 / the CR-01 rule).
        ...(policyLabel === null ? {} : { policyLabel }),
        href: `${base}/bookings/${bookingId}`,
      },
    });
  } catch (err) {
    // The confirm already succeeded and the caller's ACK is (or will be) sent regardless. A read failure
    // must never affect that ACK (T-06-15) — log for operators and move on.
    console.error("[NOTIFY] booking_confirmed_emit_failed", { bookingId, err });
  }
}

/**
 * Confirm a booking whose payment is a SERVER-ESTABLISHED fact. The single writer of `booking → confirmed`.
 *
 * Confirm on `status IN ('pending','approved')` — an instant pay confirms from `pending`, a pay-on-approval
 * request from `approved` (PAY-05 / D-63); BOTH transition through this ONE writer. WIDEN the WHERE if a
 * new payable state ever appears; never add a second confirm path. The `pay_...` and the rail are captured
 * on the same statement, because a booker cancellation happens hours or days later with no event in hand
 * and `isApiRefundable` fails closed — if the rail is not persisted HERE, every later cancellation refund
 * would be judged unrefundable and routed to the operator-alert path instead of actually moving money.
 *
 * `dbConn` follows the `payout-reconcile.ts` precedent so an isolated-schema test can inject a connection;
 * it defaults to the shared `db`. Passing two INDEPENDENT connections is also how the concurrency proof in
 * `tests/payments/confirm-idempotency.test.ts` makes the row-lock race real rather than serialized.
 *
 * Never throws for an unknown booking: an unknown id resolves `"not-found"` having written nothing.
 */
export async function confirmPaidBooking(
  input: ConfirmPaidBookingInput,
  dbConn: DbConn = db,
): Promise<ConfirmOutcome> {
  const { bookingId, paymentId, paymentMethod } = input;

  const rows = (await dbConn.execute(sql`
    UPDATE booking
    SET status = 'confirmed', expires_at = NULL,
        payment_id = ${paymentId}, payment_method = ${paymentMethod}
    WHERE id = ${bookingId} AND status IN ('pending','approved') RETURNING id`)) as unknown as {
    id: string;
  }[];

  if (rows.length === 0) {
    // 0 rows ⇒ benign replay (already confirmed), a genuinely gone slot, or no such booking. The D-58
    // backstop distinguishes them and auto-refunds / operator-alerts — never a silent money retention.
    return handleGoneSlot(bookingId, paymentId, paymentMethod, dbConn);
  }

  // ≥1 row ⇒ a GENUINE confirm (instant OR pay-on-approval — never a replay), which is what makes a
  // redelivery, or a sweep that loses the race to the webhook, emit NOTHING. Emit the BOOK-06
  // booking-confirmed notification (D-83). The helper owns its own error handling and `emitNotify` cannot
  // reject, so awaiting it can never turn a webhook's 200 ACK into a retry storm (T-06-15).
  await emitBookingConfirmed(bookingId, dbConn);
  return "confirmed";
}
