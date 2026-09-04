// D-108 pax surcharge FROZEN AT HOLD CREATION (08-03) — the integration proof that createPendingHold reads
// the listing's OWN included/extra_head_fee server-side and folds the surcharge into spacePriceCents (A1),
// which makes it the payout gross basis AND the service-fee basis, while a flat listing stays byte-identical.
//
// What is proven here, against a real Postgres on an isolated schema:
//   surcharge fold  — a listing that charges per head freezes spacePriceCents = base + (pax − included)×fee,
//                     serviceFeeCents = computeServiceFee(that space), quoted == space + fee (A1 / T-08-07).
//   declaredPax kept— when extra_head_fee > 0 the declared headcount is persisted onto the booking row.
//   organizer-only  — declaredPax = included = 1 adds no surcharge (D-113) but STILL records declaredPax
//                     (the listing charges per head, so the field is meaningful).
//   floor at 0      — declaredPax below included never produces a negative surcharge (Math.max).
//   backward-compat — a flat listing (extra_head_fee NULL) freezes the SAME space/quoted as today AND leaves
//                     booking.declared_pax NULL, no matter what declaredPax the client sends (zero leak).
//   client cannot   — the fee/included come from the LISTING row, never the caller: the same declaredPax on a
//   move a flat price  flat listing changes nothing (T-08-06 — a tampered pax cannot move the charge).
//
// Money discipline: every expectation is derived from computeServiceFee — the shared pure module — never a
// hand-written percentage, so a rate change moves the test with the code.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking } from "@/lib/db/schema";
import { createPendingHold } from "@/lib/availability/units";
import { computeServiceFee } from "@/lib/payments/service-fee";
import { bookingCreateSchema } from "@/lib/validation/booking";

let testDb: TestDb;

const HOST = "px_host";
const BOOKER = "px_booker";
const HOUR = 3_600_000;
const LEAD_MS = 3 * HOUR; // comfortably past MIN_LEAD_INSTANT_MINUTES so the D-96 guard never interferes

let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;

type ListingOpts = {
  hourlyRateCents?: number | null;
  dayRateCents?: number | null;
  included?: number | null;
  extraHeadFee?: number | null;
  maxOccupancy?: number | null;
};

/**
 * The default capacity every case inherits unless it names its own. CR-03 made `maxOccupancy` load-bearing
 * at hold time: the clamp fails CLOSED to a headcount of 1 when the listing records no capacity, so a
 * fixture that leaves it NULL can no longer express an at-or-below-cap surcharge. This default is
 * comfortably above every headcount the pre-CR-03 cases use (1-12) so those cases keep their meaning; the
 * fail-closed case passes `maxOccupancy: null` explicitly, and the over-cap cases pass a small cap.
 */
const DEFAULT_MAX_OCCUPANCY = 12;

/** A dedicated listing per case so seeded holds never collide on the booking_no_overlap EXCLUDE. */
async function makeListing(opts: ListingOpts = {}): Promise<string> {
  const id = uid("L_px");
  await testDb.db.insert(listing).values({
    id,
    hostId: HOST,
    title: `Listing ${id}`,
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Makati",
    hourlyRateCents: opts.hourlyRateCents === undefined ? 50000 : opts.hourlyRateCents,
    dayRateCents: opts.dayRateCents === undefined ? 300000 : opts.dayRateCents,
    included: opts.included ?? null,
    extraHeadFee: opts.extraHeadFee ?? null,
    maxOccupancy: opts.maxOccupancy === undefined ? DEFAULT_MAX_OCCUPANCY : opts.maxOccupancy,
    currency: "php",
  });
  return id;
}

/** The frozen money split + the declaredPax snapshot, read straight back off the persisted row. */
async function readRow(bookingId: string) {
  const [row] = await testDb.db
    .select({
      spacePriceCents: booking.spacePriceCents,
      serviceFeeCents: booking.serviceFeeCents,
      quotedTotalCents: booking.quotedTotalCents,
      declaredPax: booking.declaredPax,
    })
    .from(booking)
    .where(eq(booking.id, bookingId));
  return row;
}

/** Place an instant hold `hours` long, starting LEAD_MS out. Throws on the error branch (never expected). */
async function hold(listingId: string, opts: { hours?: number; declaredPax?: number } = {}) {
  const startsAt = new Date(Date.now() + LEAD_MS);
  const endsAt = new Date(startsAt.getTime() + (opts.hours ?? 1) * HOUR);
  const res = await createPendingHold(testDb.db, {
    listingId,
    bookerId: BOOKER,
    startsAt,
    endsAt,
    fullDay: false,
    idempotencyKey: null,
    declaredPax: opts.declaredPax,
  });
  if ("error" in res) throw new Error(`hold refused: ${res.error}`);
  return res;
}

beforeAll(async () => {
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: HOST, name: "PX Host", email: "px_host@example.com", firstName: "Host", canHost: true },
    { id: BOOKER, name: "PX Booker", email: "px_booker@example.com", firstName: "Booker", canBook: true },
  ]);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

// ── 1. The surcharge folds into spacePriceCents (A1 / T-08-07) ─────────────────────────────────────────
describe("D-108 the pax surcharge folds into the frozen space price (A1)", () => {
  it("₱500/hr × 2h, included 2, ₱15/head, declaredPax 5 ⇒ space 104500, fee on 104500, quoted = space+fee", async () => {
    const listingId = await makeListing({ hourlyRateCents: 50000, included: 2, extraHeadFee: 1500 });
    const res = await hold(listingId, { hours: 2, declaredPax: 5 });
    const row = await readRow(res.id);

    const base = 50000 * 2; // 100000
    const surcharge = (5 - 2) * 1500; // 4500
    const space = base + surcharge; // 104500
    const expectedFee = computeServiceFee(space);

    // The surcharge is IN the payout basis (A1) — space is base+surcharge, not just base.
    expect(row.spacePriceCents).toBe(space);
    expect(res.spacePriceCents).toBe(space);
    // The service fee is computed on the surcharged space, and quoted == space + fee by construction.
    expect(row.serviceFeeCents).toBe(expectedFee.serviceFeeCents);
    expect(row.quotedTotalCents).toBe(expectedFee.allInCents);
    expect(row.quotedTotalCents).toBe(row.spacePriceCents! + row.serviceFeeCents!);
    // declaredPax is captured because the listing charges per head.
    expect(row.declaredPax).toBe(5);
  });

  it("organizer-only (declaredPax = included = 1) adds no surcharge but STILL records declaredPax (D-113)", async () => {
    const listingId = await makeListing({ hourlyRateCents: 50000, included: 1, extraHeadFee: 1500 });
    const res = await hold(listingId, { hours: 2, declaredPax: 1 });
    const row = await readRow(res.id);

    expect(row.spacePriceCents).toBe(100000); // base only — attendee #1 is folded into the base
    expect(row.declaredPax).toBe(1); // fee > 0, so the field is meaningful and recorded
  });

  it("declaredPax below included never produces a negative surcharge (floors at 0)", async () => {
    const listingId = await makeListing({ hourlyRateCents: 50000, included: 4, extraHeadFee: 1500 });
    const res = await hold(listingId, { hours: 2, declaredPax: 2 });
    const row = await readRow(res.id);

    expect(row.spacePriceCents).toBe(100000); // base only — max(0, 2 − 4) = 0
    expect(row.declaredPax).toBe(2);
  });
});

// ── 2. A flat listing is byte-identical to today (backward-compat / T-08-06) ───────────────────────────
describe("D-108 a flat listing is unchanged and a client-sent declaredPax cannot move its price", () => {
  it("extra_head_fee NULL freezes the SAME space/quoted as today AND leaves declared_pax NULL", async () => {
    const listingId = await makeListing({ hourlyRateCents: 50000 }); // no included / extra_head_fee
    // Even a large declaredPax from the client must not move a flat listing's price (T-08-06).
    const res = await hold(listingId, { hours: 2, declaredPax: 12 });
    const row = await readRow(res.id);

    const base = 50000 * 2; // 100000
    const expectedFee = computeServiceFee(base);
    expect(row.spacePriceCents).toBe(base);
    expect(row.serviceFeeCents).toBe(expectedFee.serviceFeeCents);
    expect(row.quotedTotalCents).toBe(expectedFee.allInCents);
    // No surcharge machinery on a flat listing ⇒ no declaredPax recorded (D-108).
    expect(row.declaredPax).toBeNull();
  });

  it("the SAME window on a flat listing prices identically whether or not declaredPax is sent", async () => {
    const withPax = await makeListing({ hourlyRateCents: 50000 });
    const withoutPax = await makeListing({ hourlyRateCents: 50000 });
    const a = await readRow((await hold(withPax, { hours: 2, declaredPax: 9 })).id);
    const b = await readRow((await hold(withoutPax, { hours: 2 })).id);

    expect(a.spacePriceCents).toBe(b.spacePriceCents);
    expect(a.quotedTotalCents).toBe(b.quotedTotalCents);
    expect(a.declaredPax).toBeNull();
    expect(b.declaredPax).toBeNull();
  });
});

// ── 3. CR-03: an over-cap declaredPax NEVER reaches the frozen price ───────────────────────────────────
//
// The pre-CR-03 code passed `input.declaredPax` verbatim into `quoteWindow` and into `declared_pax`, and
// `createPendingHold` never even SELECTed `listing.max_occupancy`. So a crafted POST multiplied an
// attacker-chosen headcount straight into `space_price_cents` — the payout gross basis, the service-fee
// basis and the refundable basis — and a large enough one overflowed the int4 money columns into a
// Postgres 22003 that `mapBookingError` re-throws as a raw 500 (T-08-30 / T-08-31).
//
// Every case below is written to go RED if either half of the fix is deleted: the clamp in
// `src/lib/availability/units.ts` (cases 1-3) or the `.max(10_000)` in `src/lib/validation/booking.ts`
// (case 4). Each asserts on the PERSISTED row, because the frozen row — not the return value — is what
// the payout and refund paths read back.
describe("CR-03 declaredPax is clamped to the LISTING's maxOccupancy inside the price-freezing tx", () => {
  it("declaredPax 500 against maxOccupancy 6 freezes the price for 6, and persists declared_pax = 6", async () => {
    const listingId = await makeListing({
      hourlyRateCents: 50000,
      included: 1,
      extraHeadFee: 1500,
      maxOccupancy: 6,
    });
    const res = await hold(listingId, { hours: 2, declaredPax: 500 });
    const row = await readRow(res.id);

    const base = 50000 * 2; // 100000
    const space = base + (6 - 1) * 1500; // clamped to the CAP, not to the submitted 500 ⇒ 107500
    const expectedFee = computeServiceFee(space);

    expect(row.declaredPax).toBe(6); // never the submitted number
    expect(row.spacePriceCents).toBe(space);
    expect(res.spacePriceCents).toBe(space);
    expect(row.serviceFeeCents).toBe(expectedFee.serviceFeeCents);
    expect(row.quotedTotalCents).toBe(expectedFee.allInCents);
    // The D-74 triple still holds on the clamped row — CR-03 may not be closed by breaking it.
    expect(row.quotedTotalCents).toBe(row.spacePriceCents! + row.serviceFeeCents!);
  });

  it("an int4-overflowing declaredPax resolves cleanly and freezes the SAME clamped figures (no 22003)", async () => {
    const listingId = await makeListing({
      hourlyRateCents: 50000,
      included: 1,
      extraHeadFee: 1500,
      maxOccupancy: 6,
    });
    // Unclamped this is (2_000_000_000 − 1) × 1500 ≈ 3e12 centavos into an `integer` column: Postgres 22003,
    // re-thrown by mapBookingError as a raw 500. Clamped, it is indistinguishable from the case above.
    const res = await hold(listingId, { hours: 2, declaredPax: 2_000_000_000 });
    const row = await readRow(res.id);

    const space = 50000 * 2 + (6 - 1) * 1500; // 107500 — byte-identical to declaredPax 500
    const expectedFee = computeServiceFee(space);

    expect(row.declaredPax).toBe(6);
    expect(row.spacePriceCents).toBe(space);
    expect(row.serviceFeeCents).toBe(expectedFee.serviceFeeCents);
    expect(row.quotedTotalCents).toBe(expectedFee.allInCents);
    expect(row.quotedTotalCents).toBe(row.spacePriceCents! + row.serviceFeeCents!);
  });

  it("a listing with NO recorded maxOccupancy fails CLOSED: declared_pax = 1 and no surcharge", async () => {
    const listingId = await makeListing({
      hourlyRateCents: 50000,
      included: 1,
      extraHeadFee: 1500,
      maxOccupancy: null,
    });
    const res = await hold(listingId, { hours: 2, declaredPax: 9 });
    const row = await readRow(res.id);

    const base = 50000 * 2; // 100000 — max(0, 1 − 1) = 0 heads over the included one
    const expectedFee = computeServiceFee(base);

    // Deliberately UNLIKE updateDeclaredPax, which falls back to the client's own value on a null cap.
    // This is the creation path reachable by a crafted POST, so an uncapped listing charges for nobody
    // extra rather than for whoever asked.
    expect(row.declaredPax).toBe(1);
    expect(row.spacePriceCents).toBe(base);
    expect(row.serviceFeeCents).toBe(expectedFee.serviceFeeCents);
    expect(row.quotedTotalCents).toBe(expectedFee.allInCents);
    expect(row.quotedTotalCents).toBe(row.spacePriceCents! + row.serviceFeeCents!);
  });
});

// ── 4. CR-03 shape ceiling: the schema itself keeps the value away from the int4 columns ───────────────
describe("CR-03 bookingCreateSchema bounds declaredPax before it can reach the quote", () => {
  const payload = (declaredPax: number) => ({
    listingId: "L_shape",
    startUtc: new Date(Date.now() + LEAD_MS).toISOString(),
    endUtc: new Date(Date.now() + LEAD_MS + HOUR).toISOString(),
    declaredPax,
  });

  it("rejects declaredPax = 10_001", () => {
    expect(bookingCreateSchema.safeParse(payload(10_001)).success).toBe(false);
  });

  it("accepts declaredPax = 10_000 (the ceiling itself is valid — the LISTING is the real cap)", () => {
    expect(bookingCreateSchema.safeParse(payload(10_000)).success).toBe(true);
  });
});
