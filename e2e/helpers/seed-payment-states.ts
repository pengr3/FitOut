// THE PAYMENT-STATE FIXTURE — six booking shapes, one INSERT column list, one ordered teardown.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `13-VALIDATION.md § Wave 0` names this module "the single highest-leverage Wave 0 item — today only
// `confirmed` rows are seeded anywhere". That is literally true and it is the whole problem: every
// `INSERT INTO "booking"` in `e2e/` writes a paid, confirmed row, so the four branches of
// `(app)/bookings/[id]/page.tsx` that exist to explain a payment that did NOT complete —
// `PendingPaymentState` (D-57/D-71), the expired-hold landing (D-70), `PaymentReversedState` (D-58/D-83/
// D-87) and `ExpiredApprovalState` (D-97) — had never been reachable from a test at all. Not
// under-covered: unreachable. A spec cannot assert on a state it cannot get the database into.
//
// Driving these states through the UI is not an option and that is not a shortcut being taken. A pending
// row needs a real hosted PayMongo checkout to have been opened and not paid; a reversed row needs a
// payment to land for a slot that was swept away between checkout and webhook. Playwright can drive
// neither. The rows are therefore written directly, exactly as the shipped `confirmed` seeds already are.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE COLUMN LIST IS INHERITED, NOT INVENTED
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The sixteen columns `e2e/shell.spec.ts` already names are carried verbatim and EXTENDED with the five
// this file's shapes turn on: `expires_at`, `checkout_session_id`, `refund_cents`, `cancelled_by` and
// `cancelled_at`. A shorter list would not have been simpler — it would have been a list of defaults,
// and every column below is read by a branch predicate in `page.tsx`. Writing them all out, including
// the NULLs, is what makes each shape's docblock a claim that can be checked against the page.
//
// ⚠️ WHY THE NULLS ON THE REVERSED SHAPE ARE THE POINT, NOT AN OMISSION (13-RESEARCH Pitfall 1). It is
// tempting to give a "payment was reversed" row a `payment_id` — a payment did happen, after all. That
// row cannot exist. The confirm UPDATE is the ONLY statement in the codebase that writes `payment_id`
// and `payment_method`, and it writes them in the same statement that flips the row to `confirmed`. A
// reversal is BY DEFINITION the branch where that UPDATE matched zero rows: the webhook arrived, found
// the slot gone, auto-refunded and cancelled — so the columns the confirm would have written were never
// written. `refund_cents` is NULL for the same reason from the other end: D-79's refund figure is
// written by the booker-cancellation path, and nobody cancelled this. What the row DOES carry is
// `checkout_session_id`, because `confirmBooking` persists that BEFORE the booker ever pays (CR-02).
// A reversed row is therefore recognisable as "reached checkout, never confirmed, ended cancelled".
//
// ⚠️ AND THE LAPSED-APPROVAL SHAPE DIFFERS FROM THE REVERSED ONE BY EXACTLY ONE COLUMN. Both are
// `status='cancelled'` with `cancelled_by IS NULL` and `payment_id IS NULL`. `page.tsx`'s D-97 predicate
// is `cancelledBy === null && bookingMode === 'request' && paymentId === null` — so `booking_mode` is
// the ONLY thing separating "your payment was reversed" from "this approval expired", two states that
// say completely different things to a booker about their money. That is worth knowing before editing
// either fixture: change `booking_mode` on one of these rows and it silently becomes the other one.
// (`page.tsx` records the same collision from its own side as a KNOWN EDGE.)
//
// ⚠️ AND SHAPE 6 IS THE ONLY ROW IN THIS FIXTURE ON WHICH MONEY CAME BACK (added by plan 13-13). The five
// original shapes cover every way a payment can FAIL to complete; none of them covers the way it can
// complete and then be partly UNDONE. That gap had a consequence rather than being untidy: D-76 renders
// the refund as its OWN row on `/bookings/[id]/receipt`, below the Total and never netted into it, and
// with no `refund_cents` anywhere in `e2e/` that row had never been rendered by a real request. The one
// assertion that catches a receipt quietly subtracting a refund from its total — *the Total still equals
// `quoted_total_cents` while a second, different figure sits beneath it* — was therefore unmakeable.
// `e2e/receipt-parity.spec.ts` case (2) is what this shape exists for.
//
// Its columns are the mirror image of the reversed shape's, and deliberately so: `payment_id` and
// `payment_method` ARE populated, because the confirm UPDATE — the only writer of those two columns —
// genuinely ran against this row before anybody cancelled it. `refund_cents` is populated because
// `cancelBookingAsBooker` computed and wrote it, and `cancelled_by = 'booker'` because that is who
// cancelled. A row with `cancelled_by IS NULL` and `payment_id IS NULL` is the reversal; this one is
// neither, and reading the two side by side is the fastest way to see what separates them.
//
// The refund is PARTIAL and its value collides with nothing else on the page — see `REFUND_CENTS`.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// TWO PROPERTIES A CALLER MUST NOT BREAK
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   1. THE SIX WINDOWS DO NOT OVERLAP, AND THEY CANNOT BE COLLAPSED. `booking_no_overlap`
//      (drizzle/0022) excludes on `(listing_id, unit, tstzrange(starts_at, ends_at, '[)'))` WHERE
//      `status NOT IN ('cancelled','declined','completed') AND open_capacity = false`. `confirmed` and
//      BOTH `pending` shapes are inside that set, so three of the six rows genuinely occupy the slot and
//      seeding them on one window raises 23P01. Note that the EXPIRED hold occupies too: D-48's lazy
//      expiry is a READ-MODEL rule, and the constraint has never heard of it. Each shape therefore gets
//      its own hour, three hours apart, all on the same day and all well after `now()`.
//   2. EVERY VALUE GOES THROUGH THE TAGGED TEMPLATE (T-13-01-SEED). `seed.sql` is postgres.js's
//      parameterising handle; nothing below is string-concatenated into SQL. Ids are `randomUUID()`
//      suffixed onto a PER-SHAPE prefix, so (a) two runs cannot collide on the primary key, (b) a
//      fixture id can never be mistaken for a real booking, and (c) a failing assertion prints
//      `e2e_pay_reversed_…` and names its own fixture without the reader cross-referencing anything.

import { randomUUID } from "node:crypto";

import type { SeededListing } from "./booker-seed";

/**
 * The six shapes, named after the BRANCH each one drives rather than after its `status`.
 *
 * Naming them by status would put four of them in two buckets (`pending` ×2, `cancelled` ×3) and lose
 * the only thing a caller actually selects on — which page the booker lands on.
 */
export type PaymentStateShape =
  | "confirmed"
  | "pendingLiveHold"
  | "pendingExpiredHold"
  | "reversed"
  | "lapsedApproval"
  | "cancelledRefunded";

export type SeededPaymentStates = {
  /** The seeded booking id per shape. */
  readonly bookingIds: Readonly<Record<PaymentStateShape, string>>;
  /** Every id above, in insertion order — for a bulk assertion or a bulk delete. */
  readonly allBookingIds: readonly string[];
  /**
   * Delete the seeded rows, group rows FIRST.
   *
   * Call it BEFORE `seed.teardown()` and never after: `teardown()` ends the connection these statements
   * run on. It deliberately does NOT end the connection itself — the listing seed owns that.
   */
  teardown(): Promise<void>;
};

/** Frozen money, identical on every shape that has any. Copied from `shell.spec.ts`'s confirmed seed. */
const SPACE_PRICE_CENTS = 100_000;
const SERVICE_FEE_CENTS = 5_000;
const QUOTED_TOTAL_CENTS = SPACE_PRICE_CENTS + SERVICE_FEE_CENTS;
const CURRENCY = "php";

/**
 * What came back on the `cancelledRefunded` shape — a PARTIAL refund, and the number is chosen rather
 * than arbitrary.
 *
 * It must not equal, and must not be derivable from, any other figure the receipt renders: the quote is
 * ₱1,050.00, the space cost ₱1,000.00 and the service fee ₱50.00. ₱787.50 is none of those, is not their
 * difference in any pairing, and is not the total minus any of them — so an assertion that finds it on
 * the page has found the refund row and nothing else, and a Total that had been quietly netted
 * (105,000 − 78,750 = 26,250) would render a figure that appears nowhere in this file.
 *
 * A FULL refund would be the weaker fixture: `refund_cents = quoted_total_cents` makes "the Total is the
 * quote" and "the Total is the refund" the same assertion, and a receipt that printed the refund in the
 * Total's place would pass. It is exported so a spec can name it in a failure message, never so a spec
 * can assert against it — the parity discipline is to read the column back from Postgres (GATE-05).
 */
export const REFUND_CENTS = 78_750;

/**
 * Seed every shape as an OPEN-CAPACITY booking instead of an exclusive one (13-13).
 *
 * ⚠ OCCUPANCY IS A PROPERTY OF THE LISTING, NOT OF A PAYMENT STATE — which is why this is an option on
 * the whole call rather than a seventh shape. A `pending` open-capacity hold and a `pending` exclusive
 * hold reach the same branch of `page.tsx`; what differs is the listing they sit on. A shape would have
 * put an open-capacity booking on whatever listing the caller happened to pass, which for an exclusive
 * listing means `listing.per_head_price_cents IS NULL` and a per-head line that silently does not render.
 *
 * ⚠ THE CALLER MUST PASS A LISTING SEEDED `occupancy: "open_capacity"`, and this module CANNOT check it:
 * it is handed a `SeededListing`, which carries the id and the `sql` handle and not the row. A caller
 * that gets this wrong sees no error — the booking is written, the receipt renders, and D-86's per-head
 * line is simply absent. Any spec asserting that line must therefore read `per_head_price_cents` back
 * from the listing row FIRST, and `receipt-parity.spec.ts` case (3) does exactly that.
 *
 * ⚠ AND `declaredPax` MUST SATISFY THE POSITIVE MATCH, or the line is correctly absent for a second and
 * indistinguishable reason. `receipt/page.tsx` renders the unit only when
 * `per_head_price_cents × declared_pax === space_price_cents` EXACTLY — a deliberate positive match,
 * because the rejected alternative (dividing the frozen total to recover a unit) cannot fail and would
 * print a per-person figure for bookings that were never priced per person. With `booker-seed.ts`'s
 * `PER_HEAD_PRICE_CENTS` at ₱250.00 and this module's `SPACE_PRICE_CENTS` at ₱1,000.00, the one value
 * that matches is **4**.
 *
 * Open-capacity rows are outside `booking_no_overlap` altogether (drizzle/0022 narrows its partial WHERE
 * with `AND open_capacity = false`), so these six rows cannot collide with anything — including each
 * other. The three-hour spacing is kept anyway, so a reader sees the same fixture in the same order.
 */
export type OpenCapacityOptions = {
  /** Granted passes, frozen at payment. Must satisfy the positive match above — see the ⚠. */
  declaredPax: number;
};

/**
 * Hours from `now()` at which each shape's session starts; every session is one hour long.
 *
 * Three hours apart so the three OCCUPYING shapes cannot touch under `booking_no_overlap` (see property
 * 1 in the header) and so a reader scanning `/bookings` sees them in a stable, obvious order. The
 * earliest is +10h, which is `shell.spec.ts`'s own confirmed window — deliberately, because that offset
 * is what makes `…/cancel` render its LIVE branch rather than the "already started" refusal.
 */
const START_HOURS: Record<PaymentStateShape, number> = {
  confirmed: 10,
  pendingLiveHold: 13,
  pendingExpiredHold: 16,
  reversed: 19,
  lapsedApproval: 22,
  cancelledRefunded: 25,
};

/**
 * Seed one booking row per payment state against an already-seeded listing and an already-signed-up
 * booker.
 *
 * @param seed      A `seedBookableListing()` result — supplies `listingId` and the live `sql` handle.
 * @param bookerId  The `user.id` of the booker the driving session is signed in as. The owner gate
 *                  (T-04-CONFIRMIDOR) 404s every route otherwise, and a landmark counted on the
 *                  not-found boundary is a measurement of the wrong document.
 * @param options.idPrefix  Distinguishes concurrent fixtures in the same database. Defaults to
 *                  `e2e_pay`; the shape name and a UUID are always appended.
 * @param options.openCapacity  Seed every shape as an open-capacity booking — see `OpenCapacityOptions`
 *                  for the two things the caller has to get right and this module cannot check.
 * @param options.hoursOffset  Added to EVERY shape's start hour. Its only job is collision avoidance:
 *                  a caller that ALSO seeds its own occupying booking on the same listing and unit —
 *                  `shell.spec.ts` seeds a `confirmed` row at +10h, which is exactly where this
 *                  fixture's own `confirmed` shape starts — must move this whole block off it or the
 *                  INSERT dies 23P01 on `booking_no_overlap`. Shifting the block (rather than one
 *                  shape) keeps the three-hour spacing that makes the shapes mutually legal.
 */
export async function seedPaymentStates(
  seed: SeededListing,
  bookerId: string,
  options: { idPrefix?: string; hoursOffset?: number; openCapacity?: OpenCapacityOptions } = {},
): Promise<SeededPaymentStates> {
  const { idPrefix = "e2e_pay", hoursOffset = 0, openCapacity } = options;
  const sql = seed.sql;

  const id = (shape: PaymentStateShape) => `${idPrefix}_${shape}_${randomUUID()}`;

  const bookingIds: Record<PaymentStateShape, string> = {
    confirmed: id("confirmed"),
    pendingLiveHold: id("pendingLiveHold"),
    pendingExpiredHold: id("pendingExpiredHold"),
    reversed: id("reversed"),
    lapsedApproval: id("lapsedApproval"),
    cancelledRefunded: id("cancelledRefunded"),
  };

  /**
   * The ONE INSERT every shape goes through — the sixteen columns `shell.spec.ts:544-558` names, plus
   * the five that decide which branch renders. One statement rather than six means a column added to
   * the table is added to every fixture at once, and a shape can only ever differ from its siblings in
   * the VALUES a reader can see side by side below.
   */
  async function insert(shape: PaymentStateShape, row: PaymentStateRow): Promise<void> {
    await sql`
      INSERT INTO "booking" (
        id, listing_id, unit, booker_id, starts_at, ends_at, status, booking_mode,
        cancellation_policy, space_price_cents, service_fee_cents, quoted_total_cents,
        currency, payment_id, payment_method, expires_at, checkout_session_id,
        refund_cents, cancelled_by, cancelled_at, open_capacity, declared_pax, created_at
      ) VALUES (
        ${bookingIds[shape]}, ${seed.listingId}, ${1}, ${bookerId},
        now() + make_interval(hours => ${START_HOURS[shape] + hoursOffset}),
        now() + make_interval(hours => ${START_HOURS[shape] + hoursOffset + 1}),
        ${row.status}::booking_status, ${row.bookingMode}::booking_mode,
        ${"standard"}::cancellation_policy,
        ${SPACE_PRICE_CENTS}, ${SERVICE_FEE_CENTS}, ${QUOTED_TOTAL_CENTS}, ${CURRENCY},
        ${row.paymentId}, ${row.paymentMethod},
        ${row.expiresAtMinutes === null ? null : sql`now() + make_interval(mins => ${row.expiresAtMinutes})`},
        ${row.checkoutSessionId}, ${row.refundCents},
        ${row.cancelledBy}::cancelled_by, ${row.cancelled ? sql`now()` : null},
        ${openCapacity !== undefined}, ${openCapacity?.declaredPax ?? null},
        now()
      )
    `;
  }

  // ── 1. `confirmed` — the receipt and booking-detail fixture. ────────────────────────────────────────
  // The only shape whose money columns are ALL populated, because the confirm UPDATE is the only writer
  // of `payment_id`/`payment_method` and this is the one row it ran against. `expires_at` is NULL: a
  // hold TTL is meaningful only while a row is `pending` and the confirm clears it.
  await insert("confirmed", {
    status: "confirmed",
    bookingMode: "instant",
    paymentId: `pay_e2e_${randomUUID()}`,
    paymentMethod: "gcash",
    expiresAtMinutes: null,
    checkoutSessionId: `cs_e2e_${randomUUID()}`,
    refundCents: null,
    cancelledBy: null,
    cancelled: false,
  });

  // ── 2. `pending` + LIVE hold — the D-70 not-completed and D-71 pending fixtures. ────────────────────
  // `expires_at` in the FUTURE and a non-null `checkout_session_id`: the booker opened the hosted
  // checkout and has not paid (or the webhook has not landed). `/bookings/[id]?paid=1` renders
  // `PendingPaymentState`; the same URL WITHOUT `?paid=1` redirects back to the reserve page, which is
  // the shipped abandoned-hold behaviour and not a defect of this fixture.
  await insert("pendingLiveHold", {
    status: "pending",
    bookingMode: "instant",
    paymentId: null,
    paymentMethod: null,
    expiresAtMinutes: 10,
    checkoutSessionId: `cs_e2e_${randomUUID()}`,
    refundCents: null,
    cancelledBy: null,
    cancelled: false,
  });

  // ── 3. `pending` + EXPIRED hold — the fixture that proves the boundary (D-70 ⚠). ────────────────────
  // Identical to shape 2 except `expires_at` is in the PAST. It exists so a later spec can prove the
  // not-completed state never steals `hold-expired-state.tsx`'s landing: the two are distinguished by
  // this column alone, so a fixture that only ever carries a live TTL can assert the first state and
  // learn nothing about whether the second is still reachable.
  //
  // It still OCCUPIES its slot, which is why it needs its own window: D-48's lazy expiry is a read-model
  // rule and `booking_no_overlap` does not implement it.
  await insert("pendingExpiredHold", {
    status: "pending",
    bookingMode: "instant",
    paymentId: null,
    paymentMethod: null,
    expiresAtMinutes: -5,
    checkoutSessionId: `cs_e2e_${randomUUID()}`,
    refundCents: null,
    cancelledBy: null,
    cancelled: false,
  });

  // ── 4. `cancelled`-REVERSED — the D-83/D-87 fixture. ───────────────────────────────────────────────
  // See the header for why `payment_id`, `payment_method` and `refund_cents` are ALL NULL on a row whose
  // whole story is that money moved: the confirm UPDATE that writes those columns is exactly the
  // statement that claimed zero rows here. `booking_mode='instant'` is what keeps this row OFF the D-97
  // lapse branch — see the header's one-column warning.
  await insert("reversed", {
    status: "cancelled",
    bookingMode: "instant",
    paymentId: null,
    paymentMethod: null,
    expiresAtMinutes: null,
    checkoutSessionId: `cs_e2e_${randomUUID()}`,
    refundCents: null,
    cancelledBy: null,
    cancelled: true,
  });

  // ── 5. `cancelled`-LAPSED-APPROVAL — the D-97 fixture. ─────────────────────────────────────────────
  // `booking_mode='request'` is the ONLY column distinguishing it from shape 4. `checkout_session_id` is
  // NULL because this booking never reached checkout — the approval's payment window closed first — and
  // `expires_at` is NULL because BOTH retirement paths (the request-expiry cron and the in-transaction
  // stale-hold sweep) CLEAR it when they flip the hold terminal. That NULL is not laziness: it is the
  // common case the component's deadline-free copy variant exists for.
  await insert("lapsedApproval", {
    status: "cancelled",
    bookingMode: "request",
    paymentId: null,
    paymentMethod: null,
    expiresAtMinutes: null,
    checkoutSessionId: null,
    refundCents: null,
    cancelledBy: null,
    cancelled: true,
  });

  // ── 6. `cancelled`-REFUNDED — the D-76 refund-row fixture (13-13). ─────────────────────────────────
  // The ONE shape on which money moved and then partly came back. `payment_id`/`payment_method` ARE
  // written here — see the header: the confirm UPDATE really did run against this row — and it is that
  // pair, together with `cancelled_by='booker'`, that keeps this row off BOTH cancelled branches above.
  // `receipt/page.tsx`'s D-76 predicate admits it on its own columns with no probe at all
  // (`status === 'cancelled' && (refundCents !== null || paymentId !== null)`), which is why this fixture
  // needs no PayMongo key to reach the receipt — the CI secret boundary (D-35) is untouched by it.
  // The rail is `gcash`, which `isApiRefundable` answers TRUE for, so the refund row's term is D-83's
  // `Refunded` rather than `Returned by hand`. A spec asserting the row exists should accept either word
  // and assert the AMOUNT; a spec asserting the word is asserting this line, not the receipt.
  await insert("cancelledRefunded", {
    status: "cancelled",
    bookingMode: "instant",
    paymentId: `pay_e2e_${randomUUID()}`,
    paymentMethod: "gcash",
    expiresAtMinutes: null,
    checkoutSessionId: `cs_e2e_${randomUUID()}`,
    refundCents: REFUND_CENTS,
    cancelledBy: "booker",
    cancelled: true,
  });

  const allBookingIds = Object.values(bookingIds);

  return {
    bookingIds,
    allBookingIds,
    async teardown() {
      // ORDER IS LOAD-BEARING, and it is not this module's order — it is the FK's.
      // `booking_group.booking_id` is ON DELETE RESTRICT (`schema.ts:970-975` — "a booking that owns a
      // group cannot be hard-deleted"), so any group a spec hung off one of these bookings must go
      // FIRST. This helper creates no groups, and that is precisely why the DELETE is here rather than
      // left to the caller: `shell.spec.ts` already had to discover the trap once, and a fixture whose
      // teardown fails leaves rows that block `seed.teardown()` too — the whole seed becomes
      // undeletable and the next run reads it as a teardown bug rather than as a missing DELETE.
      await sql`DELETE FROM booking_group WHERE booking_id = ANY(${allBookingIds})`;
      await sql`DELETE FROM notification WHERE booking_id = ANY(${allBookingIds})`;
      await sql`DELETE FROM booking WHERE id = ANY(${allBookingIds})`;
    },
  };
}

/** The per-shape VALUES. Every field is spelled out on every shape, including the NULLs. */
type PaymentStateRow = {
  status: "confirmed" | "pending" | "cancelled";
  bookingMode: "instant" | "request";
  paymentId: string | null;
  paymentMethod: string | null;
  /** Minutes from `now()` for `expires_at`; negative is a lapsed hold, `null` writes SQL NULL. */
  expiresAtMinutes: number | null;
  checkoutSessionId: string | null;
  refundCents: number | null;
  cancelledBy: "booker" | "host" | "system" | null;
  /** Whether `cancelled_at` is stamped `now()`. Never a party — `cancelled_by` carries that. */
  cancelled: boolean;
};
