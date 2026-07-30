// OPEN-04 (search half) / OC-12 — a drop-in listing must be FINDABLE, priced per person, and filtered by
// SPOTS LEFT ON A DATE rather than by an hour window.
//
// The first block is the pure half: the `/person` branch of the shared all-in rate helper (D-75 — the ONE
// place the service fee is composed into an advertised price, so the browse rate and the checkout breakdown
// can never use different rates). The DB-backed `searchListings` cases follow it.
//
// THE LOAD-BEARING CASE is the priceMax pair. Before this plan Stage-1's ceiling read
// `l.hourly_rate_cents <= ${priceMax}`, which is NULL on a listing that prices only per head — and
// `NULL <= n` is NULL, not false — so a price filter silently DELETED every drop-in listing from results,
// while the identical expression on the ORDER BY buried them last. That case is written so it CANNOT pass
// against the old expression (see its own comment), and the sort case pins the ranking half.
//
// Integration harness mirrors tests/search/availability-filter.test.ts: isolated schema, Asia/Manila, a
// fixed venue day, and a fixed injected `now` so past/horizon display state is deterministic regardless of
// the wall clock. Occupancy is seeded as CONFIRMED rows, which occupy independently of any expires_at.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TZDate } from "@date-fns/tz";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, hostPayout, listing, operatingHours, booking } from "@/lib/db/schema";
import { searchParamsSchema } from "@/lib/validation/booking";
import { searchListings, type SearchResultRow } from "@/lib/search/query";
import { allInRateParts, hasAllInRate } from "@/lib/booking/all-in-rate";
import { computeServiceFee } from "@/lib/payments/service-fee";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";

describe("allInRateParts — open capacity (OC-02 / D-125 / 09-UI-SPEC § 4)", () => {
  it("advertises exactly one all-in `/person` part for an open-capacity listing", () => {
    const parts = allInRateParts({
      hourlyRateCents: null,
      dayRateCents: null,
      perHeadPriceCents: 35000,
      occupancyMode: "open_capacity",
    });
    expect(parts).toHaveLength(1);
    expect(parts[0].endsWith("/person")).toBe(true);
    // Fee-composed SERVER-SIDE with the SAME computeServiceFee the checkout breakdown uses (D-75).
    expect(parts[0]).toBe(
      `${formatMoney(computeServiceFee(35000).allInCents, DISPLAY_CURRENCY)}/person`,
    );
  });

  it("ignores the hourly/day columns a drop-in listing may STILL carry (09-06 never clears them)", () => {
    // 09-07's lesson: a drop-in listing can genuinely hold hourly/day rates, because the publish gate
    // REQUIRES a per-head price but never nulls the exclusive columns, and OC-17 permits the mode switch.
    // Advertising an hourly rate for a day pass would be a lie about what the booker gets (OC-02:
    // duration never scales the price).
    const parts = allInRateParts({
      hourlyRateCents: 50000,
      dayRateCents: 250000,
      perHeadPriceCents: 35000,
      occupancyMode: "open_capacity",
    });
    expect(parts).toHaveLength(1);
    expect(parts[0].endsWith("/person")).toBe(true);
    expect(parts.join(" ")).not.toContain("/hr");
    expect(parts.join(" ")).not.toContain("/day");
  });

  it("is byte-identical to today for an exclusive listing passing NO new props", () => {
    // 50000 + 5% = 52500 all-in. The literal pins BOTH the 500 bps default and the shared formatter, so a
    // regression in either (or the open branch firing on an absent occupancyMode) fails here.
    expect(allInRateParts({ hourlyRateCents: 50000, dayRateCents: null })).toEqual([
      `${formatMoney(52500, DISPLAY_CURRENCY)}/hr`,
    ]);
    expect(allInRateParts({ hourlyRateCents: null, dayRateCents: 250000 })).toEqual([
      `${formatMoney(262500, DISPLAY_CURRENCY)}/day`,
    ]);
    expect(allInRateParts({ hourlyRateCents: null, dayRateCents: null })).toEqual([]);
    // An open-capacity listing with no per-head price advertises nothing — the caller's existing
    // "Price on request" fallback, exactly as for a rate-less exclusive listing.
    expect(
      allInRateParts({ hourlyRateCents: 50000, dayRateCents: null, perHeadPriceCents: null, occupancyMode: "open_capacity" }),
    ).toEqual([]);
  });

  it("hasAllInRate carries the SAME open branch, so `Service fee included` cannot go missing", () => {
    const open = { hourlyRateCents: null, dayRateCents: null, occupancyMode: "open_capacity" as const };
    expect(hasAllInRate({ ...open, perHeadPriceCents: 35000 })).toBe(true);
    expect(hasAllInRate({ ...open, perHeadPriceCents: null })).toBe(false);
    // The qualifier gate and the price parts must AGREE, or a drop-in card shows an all-in price with no
    // statement that it is all-in — the exact browse-vs-checkout mismatch D-75 exists to prevent.
    expect(hasAllInRate({ ...open, perHeadPriceCents: 35000 })).toBe(
      allInRateParts({ ...open, perHeadPriceCents: 35000 }).length > 0,
    );
    expect(hasAllInRate({ ...open, perHeadPriceCents: null })).toBe(
      allInRateParts({ ...open, perHeadPriceCents: null }).length > 0,
    );
    // Exclusive behaviour unchanged.
    expect(hasAllInRate({ hourlyRateCents: 50000, dayRateCents: null })).toBe(true);
    expect(hasAllInRate({ hourlyRateCents: null, dayRateCents: null })).toBe(false);
  });
});

let testDb: TestDb;

const MANILA = "Asia/Manila";
const DATE = "2026-08-03"; // a Monday (dow 1) in every timezone — same anchor as availability-filter.test.ts
const CLOSED_DATE = "2026-08-04"; // the Tuesday after: no operating_hours row is seeded for dow 2
const NOW = new Date("2026-07-15T00:00:00.000Z"); // ~19 days out ⇒ future and inside BOOKING_HORIZON_DAYS

const HOST = "oc_search_host";
const BOOKER = "oc_search_booker";

const OPEN_ID = "OC_open";
const EXCL_ID = "OC_exclusive";
const OPEN_CAP = 4;
const OPEN_PER_HEAD = 35000; // ₱350 per person
const OPEN_HOURLY = 90000; // deliberately ABOVE the exclusive control's, so the sort case can only pass
const EXCL_HOURLY = 40000; //   by reading the per-head price (see the sort test)

/** Aug 3 2026, venue-local `hour`:00 → the UTC instant (identical TZDate→epoch convention as slots.ts). */
function localHourUtc(hour: number, tz: string): Date {
  return new Date(new TZDate(2026, 7, 3, hour, 0, 0, tz).getTime());
}

beforeAll(async () => {
  testDb = await setupTestDb();

  await testDb.db.insert(user).values({
    id: HOST, name: "OC Host", email: "oc_search_host@fitout.seed", firstName: "OC",
    emailVerified: true, canHost: true,
  });
  await testDb.db.insert(hostPayout).values({
    userId: HOST, activationStatus: "activated", payoutsEnabled: true, onboardingComplete: true,
  });
  await testDb.db.insert(user).values({
    id: BOOKER, name: "OC Booker", email: "oc_search_booker@fitout.seed", firstName: "Booker",
    emailVerified: true, canBook: true,
  });

  // The drop-in listing. It DELIBERATELY keeps hourly/day rates (09-07's lesson: 09-06 requires a per-head
  // price but never clears the exclusive columns, and OC-17 permits the mode switch), so every assertion
  // below can only pass by keying on the persisted occupancy_mode — never on the accident of a NULL column.
  await testDb.db.insert(listing).values({
    id: OPEN_ID,
    hostId: HOST,
    title: OPEN_ID,
    primarySpaceType: "gym_fitness_floor", // D-08 vocabulary value
    city: "Makati",
    location: { x: 121.0244, y: 14.5547 },
    hourlyRateCents: OPEN_HOURLY,
    dayRateCents: 400000,
    perHeadPriceCents: OPEN_PER_HEAD,
    occupancyMode: "open_capacity",
    maxOccupancy: OPEN_CAP,
    currency: "php",
    unitCount: 1,
    timezone: MANILA,
    status: "published",
    publishedAt: new Date(),
  });
  await testDb.db.insert(operatingHours).values({
    id: `${OPEN_ID}_oh`, listingId: OPEN_ID, dayOfWeek: 1, openTime: "06:00:00", closeTime: "22:00:00",
  });

  // The exclusive control: same weekday, an hour grid opening LATER (12:00), nothing occupying.
  await testDb.db.insert(listing).values({
    id: EXCL_ID,
    hostId: HOST,
    title: EXCL_ID,
    primarySpaceType: "gym_fitness_floor",
    city: "Makati",
    location: { x: 121.0244, y: 14.5547 },
    hourlyRateCents: EXCL_HOURLY,
    dayRateCents: 250000,
    currency: "php",
    unitCount: 1,
    timezone: MANILA,
    status: "published",
    publishedAt: new Date(),
  });
  await testDb.db.insert(operatingHours).values({
    id: `${EXCL_ID}_oh`, listingId: EXCL_ID, dayOfWeek: 1, openTime: "12:00:00", closeTime: "22:00:00",
  });
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

function search(overrides: Record<string, unknown> = {}) {
  return searchParamsSchema.parse(overrides);
}

async function rowsFor(overrides: Record<string, unknown> = {}): Promise<SearchResultRow[]> {
  const { results } = await searchListings(testDb.db, search(overrides), NOW);
  return results;
}

async function idsFor(overrides: Record<string, unknown> = {}): Promise<string[]> {
  return (await rowsFor(overrides)).map((r) => r.id);
}

async function openRowFor(overrides: Record<string, unknown>): Promise<SearchResultRow | undefined> {
  return (await rowsFor(overrides)).find((r) => r.id === OPEN_ID);
}

/**
 * Occupy `heads` admissions on the tested date. Written as an ordinary CONFIRMED open row — the unit-1
 * sentinel spanning the venue's whole operating day, with `open_capacity = true` and `declared_pax` set —
 * exactly the shape createOpenCapacityHold persists, so the read model's shared SUM(declared_pax) counts it.
 * Two such rows coexist because drizzle/0022 narrowed booking_no_overlap to `open_capacity = false`.
 */
async function occupy(id: string, heads: number): Promise<void> {
  await testDb.db.insert(booking).values({
    id,
    listingId: OPEN_ID,
    unit: 1,
    bookerId: BOOKER,
    startsAt: localHourUtc(6, MANILA),
    endsAt: localHourUtc(22, MANILA),
    status: "confirmed",
    openCapacity: true,
    declaredPax: heads,
  });
}

describe("searchListings — open capacity browse view, no date (OC-12)", () => {
  it("returns a drop-in listing with a `/person` rate and NO scarcity number at all", async () => {
    const rows = await rowsFor({});
    expect(rows.map((r) => r.id)).toContain(EXCL_ID);

    const open = rows.find((r) => r.id === OPEN_ID);
    expect(open).toBeDefined();
    expect(open!.occupancyMode).toBe("open_capacity");
    expect(open!.perHeadPriceCents).toBe(OPEN_PER_HEAD);
    // OC-12: with no date in play the card shows the badge and the rate and no number.
    expect(open!.spots).toBeNull();
    expect(open!.allInRateParts).toEqual([
      `${formatMoney(computeServiceFee(OPEN_PER_HEAD).allInCents, DISPLAY_CURRENCY)}/person`,
    ]);
    expect(open!.allInRateParts[0].endsWith("/person")).toBe(true);

    // The exclusive control is untouched: hourly parts, no per-head price, no scarcity.
    const excl = rows.find((r) => r.id === EXCL_ID)!;
    expect(excl.occupancyMode).toBe("exclusive");
    expect(excl.perHeadPriceCents).toBeNull();
    expect(excl.spots).toBeNull();
    expect(excl.allInRateParts).toEqual([
      `${formatMoney(computeServiceFee(EXCL_HOURLY).allInCents, DISPLAY_CURRENCY)}/hr`,
      `${formatMoney(computeServiceFee(250000).allInCents, DISPLAY_CURRENCY)}/day`,
    ]);
  });
});

describe("searchListings — open capacity date filter (OC-12 / OC-11)", () => {
  it("keeps the listing on an open date and carries the SERVER-derived scarcity state", async () => {
    const open = await openRowFor({ date: DATE });
    expect(open).toBeDefined();
    // cap 4 ⇒ lowStockThreshold = clamp(floor(4/2), 1, 5) = 2, so a full 4 remaining is `open`, not `low`.
    expect(open!.spots).toEqual({ remaining: OPEN_CAP, cap: OPEN_CAP, state: "open" });
  });

  it("reports `low` once the date crosses the server-side scarcity threshold", async () => {
    await occupy("OC_bk_two", 2); // 4 − 2 = 2 remaining, which is ≤ the threshold of 2
    const open = await openRowFor({ date: DATE });
    expect(open).toBeDefined();
    // The row carries the discrete state, not {remaining, cap} alone — the card renders it straight
    // through and never re-derives the threshold (OC-11 / T-09-13).
    expect(open!.spots).toEqual({ remaining: 2, cap: OPEN_CAP, state: "low" });
  });

  it("DROPS the listing on a fully-booked date — `full` never reaches a search card", async () => {
    await occupy("OC_bk_rest", 2); // 2 + 2 = 4 = cap ⇒ remaining 0
    const ids = await idsFor({ date: DATE });
    expect(ids).not.toContain(OPEN_ID);
    expect(ids).toContain(EXCL_ID); // the exclusive control survives — this is not a blanket drop
    // …and the same listing is still in the no-date browse view (Stage-2 is skipped there, D-30).
    expect(await idsFor({})).toContain(OPEN_ID);
  });

  it("DROPS the listing on a weekday the venue does not operate", async () => {
    // Only dow 1 (Monday) has operating hours. Stage-1's weekday EXISTS pre-filter excludes the Tuesday;
    // this case pins that the open branch never re-admits a closed date (getAvailability returns
    // openCapacity: null for one, which the branch must treat as not keepable).
    const ids = await idsFor({ date: CLOSED_DATE });
    expect(ids).not.toContain(OPEN_ID);
    expect(ids).not.toContain(EXCL_ID);
  });
});

describe("searchListings — a searched TIME is ignored for an open listing (OC-02 / 09-UI-SPEC O2)", () => {
  beforeAll(async () => {
    // Free the date back up (the fully-booked case consumed it) so the WINDOW is the only variable.
    await testDb.db.delete(booking);
  });

  it("keeps the drop-in listing for a start/end window while the exclusive control is filtered by it", async () => {
    // 09:00–11:00 sits inside the drop-in venue's 06:00–22:00 day but BEFORE the exclusive control opens at
    // 12:00. A pass is not an hour window, so the drop-in listing is kept on the DATE alone; the exclusive
    // control is filtered by the window exactly as it is today.
    const ids = await idsFor({ date: DATE, start: "09:00", end: "11:00" });
    expect(ids).toContain(OPEN_ID);
    expect(ids).not.toContain(EXCL_ID);

    // The row still carries date-scoped scarcity — a window never narrows, re-scopes or captions it.
    const open = await openRowFor({ date: DATE, start: "09:00", end: "11:00" });
    expect(open!.spots).toEqual({ remaining: OPEN_CAP, cap: OPEN_CAP, state: "open" });

    // A window the exclusive control DOES cover keeps both, proving the drop above was the window.
    const both = await idsFor({ date: DATE, start: "12:00", end: "14:00" });
    expect(both).toContain(OPEN_ID);
    expect(both).toContain(EXCL_ID);
  });
});

describe("searchListings — the price ceiling and the price sort both see an open listing", () => {
  it("keeps an open listing under a priceMax ABOVE its per-head price, and drops it below", async () => {
    // ⚠️ THE LATENT TRAP THIS PLAN CLOSES, written so it cannot pass against the OLD expression.
    // The old predicate was `l.hourly_rate_cents <= ${priceMax}` and OPEN_ID's hourly rate is 90000, so at
    // a 50000 ceiling the old expression evaluated 90000 <= 50000 → false and dropped the row. Had the
    // fixture instead left hourly_rate_cents NULL — the shape a pure drop-in listing has — the old
    // expression would have yielded NULL and dropped it at EVERY ceiling. Both directions of the old bug
    // fail this assertion; only the effective (per-head) price passes it.
    const above = await idsFor({ priceMax: 50000 }); // 50000 > per-head 35000, < hourly 90000
    expect(above).toContain(OPEN_ID);
    expect(above).toContain(EXCL_ID); // exclusive hourly 40000 ≤ 50000 — unchanged behaviour

    const below = await idsFor({ priceMax: 30000 }); // below BOTH the per-head 35000 and the hourly 40000
    expect(below).not.toContain(OPEN_ID);
    expect(below).not.toContain(EXCL_ID);
  });

  it("ranks an open listing by its per-head price under sort=price, not by its ignored hourly rate", async () => {
    // per-head 35000 < exclusive hourly 40000 ⇒ the drop-in listing sorts FIRST. Against the old
    // expression its hourly 90000 would have sorted it LAST — the burial half of the same trap.
    const ids = await idsFor({ sort: "price" });
    expect(ids).toContain(OPEN_ID);
    expect(ids.indexOf(OPEN_ID)).toBeLessThan(ids.indexOf(EXCL_ID));
  });
});
