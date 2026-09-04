// D-72 / D-82 / D-83 — DID THE MONEY ACTUALLY LEAVE? The one reader of that fact, derived from rows
// that already exist.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS MODULE EXISTS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A cancellation writes `booking.refund_cents` and then TRIES to move the money. The write and the move
// are deliberately separate (`cancel-booking.ts`: "a refund-dispatch failure must NOT unwind the
// durable flip"), which means a row can carry a perfectly real refund figure while NOTHING has been
// dispatched — the PayMongo call raised, the rail is not API-refundable, the destination could not be
// verified, or the amount is above the InstaPay ceiling.
//
// On every one of those paths the action writes a `needs_attention` audit row and an operator moves the
// money by hand. Until this module existed, the ONLY place a booker was told any of that was a
// `toast.warning` on the cancel form — a surface that removes itself on a timer, on the one sentence in
// the product a person is most likely to want to re-read. STATE-08 forbids exactly that, and the
// booking detail page then told them "{₱X} refund on its way", which on these four paths is false.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ ZERO SCHEMA MIGRATIONS (D-80) — THE CONSTRAINT THAT DECIDED THE DESIGN
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The obvious implementation is a `refund_dispatched_at` column. This phase may not add one, and that
// turned out to be the better answer rather than a workaround: the fact is ALREADY persisted, exactly
// once, by the code that discovers it. Every non-dispatch path writes an `audit` row (durable since
// drizzle `0024_audit_table.sql`) whose `meta.bookingId` names the booking. A second representation of
// the same fact would be a second thing to keep in sync, and the half that drifted would be the half a
// booker reads.
//
// SO THE OPERATOR QUEUE IS THE SOURCE OF TRUTH FOR THE BOOKER'S SENTENCE, and that is the correct
// coupling rather than an accidental one: the booker's caveat is true precisely WHEN an operator owes
// them a transfer. One row, two audiences, no way for them to disagree.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY `resolved_at` IS DELIBERATELY NOT CONSULTED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `audit.resolved_at` (drizzle `0025_audit_resolved_by.sql`) records that an OPERATOR CLOSED THE ALERT.
// It does not record that money reached the booker's account — nothing in this system does, because the
// transfer that would prove it happens outside it. Filtering on it would therefore delete the booker's
// only durable record of a payment that was never sent back automatically, and replace it with the
// "{₱X} refund on its way" sentence, which was FALSE on this path the whole time. The caveat is
// fail-closed toward telling the booker, and stays.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT `server-only`, AND THAT IS THE SHIPPED PATTERN RATHER THAN AN OMISSION
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-34's deny-list (GATE-05, `tests/design/server-only-guards.test.ts`) guards MONEY COMPUTATION —
// rates, fees, ladders — from crossing into a client bundle. This module computes nothing and returns a
// boolean; its sibling read layers under `src/lib/booking/` (`bookings-query.ts`) carry no guard for the
// same reason. What keeps it server-side is `@/lib/db`, exactly as it keeps them there.

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { audit } from "@/lib/db/schema";

/**
 * THE CLOSED SET OF AUDIT ACTIONS THAT MEAN "MONEY IS OWED AND NOTHING WAS DISPATCHED".
 *
 * All four are written by `src/app/actions/cancel-booking.ts`, and the list is exhaustive over the two
 * cancellation entry points as of this commit. Each one is a DIFFERENT CAUSE with the SAME consequence
 * for the booker — a person has to move the money — which is why the surface states one sentence rather
 * than four (see `manual-return-notice.tsx` for that argument in full).
 *
 *   `refund_dispatch_failed`        the rail WAS API-refundable and `createRefund` raised. Booker path
 *                                   and host path both write it; there is deliberately no retry.
 *   `refund_transfer_failed`        the D-72 InstaPay transfer to the booker's named account raised.
 *   `refund_manual_required`        no usable destination, no captured payment id, an unrefundable rail
 *                                   (QR Ph — the 2026-08-21 re-probe returned the same HTTP 400), or an
 *                                   amount below PayMongo's floor.
 *   `refund_over_instapay_ceiling`  above the InstaPay ceiling, so the transfer is doomed and is never
 *                                   fired.
 *
 * ⚠ EVERY ROW HERE MUST ALSO BE WRITTEN WITH `outcome: "needs_attention"`. The query below requires
 * both, so an action added to this list but recorded as `ok` would silently never match. That pairing
 * is asserted directly in `tests/booking/refund-dispatch.test.ts` rather than assumed, and the walk
 * over this list is probed with a control action so a green run cannot come from a dead predicate.
 */
export const REFUND_NOT_DISPATCHED_ACTIONS = [
  "refund_dispatch_failed",
  "refund_transfer_failed",
  "refund_manual_required",
  "refund_over_instapay_ceiling",
] as const;

/**
 * Did this booking's refund fail to dispatch — i.e. does an operator still owe the booker a transfer?
 *
 * `true` means: money is owed, nothing was sent automatically, and the destination surface must state
 * that rather than claiming a transfer that has not happened.
 *
 * THE CALLER GATES THE CALL ON `refund_cents > 0`. A booking with no refund owed has nothing to say
 * either way, and the round trip is not spent on it — the same discipline the cancelled branch already
 * applies to its payment probe.
 *
 * `meta->>'bookingId'` is a jsonb text extraction on a nullable column: a row with `meta IS NULL`
 * yields NULL, which is not equal to anything, so it cannot match. Parameterised through Drizzle's
 * `sql` template, so the id is a bind parameter and never string-concatenated into the statement.
 */
export async function refundNeedsManualReturn(bookingId: string): Promise<boolean> {
  const rows = await db
    .select({ id: audit.id })
    .from(audit)
    .where(
      and(
        eq(audit.outcome, "needs_attention"),
        inArray(audit.action, [...REFUND_NOT_DISPATCHED_ACTIONS]),
        sql`${audit.meta}->>'bookingId' = ${bookingId}`,
      ),
    )
    .limit(1);

  return rows.length > 0;
}
