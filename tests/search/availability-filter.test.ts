// SEARCH-03 / D-34 — the Stage-2 TRUE free-window filter. A search result must be a GENUINE offer:
// only listings with an actual free unit for the picked date/time window survive. Stage-2 reuses the
// SAME `getAvailability` read model the listing calendar uses (RESEARCH Pattern 1 / Anti-Pattern "a
// second SQL availability predicate") — so search results and the listing page structurally cannot
// diverge. Mirrors tests/availability/read-model.test.ts (isolated schema, Asia/Manila, Aug 3 2026 Mon,
// the SAME '[)' overlap as the booking_no_overlap EXCLUDE).
//
// Cases: date-only keep/drop · date+time keep/drop · whole-listing block honored · venue-tz per-candidate.
// `now` is threaded so slot past/horizon state is deterministic regardless of the wall clock (mirrors the
// read-model test's fixed NOW); occupancy here is CONFIRMED bookings + blocks, independent of the clock.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TZDate } from "@date-fns/tz";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeVerifiedHost } from "../helpers/seed";
import { user, listing, operatingHours, availabilityBlock, booking } from "@/lib/db/schema";
import { searchParamsSchema } from "@/lib/validation/booking";
import { searchListings } from "@/lib/search/query";

let testDb: TestDb;

const MANILA = "Asia/Manila";
const NY = "America/New_York";
const DATE = "2026-08-03"; // a Monday (dow 1) in every timezone
const NOW = new Date("2026-07-15T00:00:00.000Z"); // ~19 days before the test day → all slots future & in-horizon

const HOST = "avail_host";
const BOOKER = "avail_booker";

/** Aug 3 2026, venue-local `hour`:00 → the UTC instant (identical TZDate→epoch convention as slots.ts). */
function localHourUtc(hour: number, tz: string): Date {
  return new Date(new TZDate(2026, 7, 3, hour, 0, 0, tz).getTime());
}

async function seedListing(id: string, tz: string, unitCount: number, open: string, close: string): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId: HOST,
    title: id,
    primarySpaceType: "gym_fitness_floor",
    city: "Makati",
    location: { x: 121.0244, y: 14.5547 },
    hourlyRateCents: 40000,
    dayRateCents: 250000,
    currency: "php",
    unitCount,
    timezone: tz,
    status: "published",
    reviewState: "approved",
    publishedAt: new Date(),
  });
  await testDb.db.insert(operatingHours).values({
    id: `${id}_oh`,
    listingId: id,
    dayOfWeek: 1, // Monday
    openTime: open,
    closeTime: close,
  });
}

async function addBooking(id: string, unit: number, startHour: number, endHour: number, tz: string): Promise<void> {
  await testDb.db.insert(booking).values({
    id: `${id}_bk_${startHour}`,
    listingId: id,
    unit,
    bookerId: BOOKER,
    startsAt: localHourUtc(startHour, tz),
    endsAt: localHourUtc(endHour, tz),
    status: "confirmed",
  });
}

beforeAll(async () => {
  testDb = await setupTestDb();

  // The search sell-gate host: verified email + activated payouts + an ops-APPROVED host_verification
  // row (phase 18, D-224). Without the third, Stage-1 drops every fixture and this file measures nothing.
  await makeVerifiedHost(testDb.db, HOST, {
    name: "Avail Host", email: "avail_host@fitout.seed", firstName: "Avail",
  });
  await testDb.db.insert(user).values({
    id: BOOKER, name: "Avail Booker", email: "avail_booker@fitout.seed", firstName: "Booker",
    emailVerified: true, canBook: true,
  });

  // L_free — Manila, 06:00–21:00, unit 1, nothing occupying → always available.
  await seedListing("L_free", MANILA, 1, "06:00:00", "21:00:00");

  // L_daybooked — Manila, 06:00–09:00 ONLY, unit 1, every hour confirmed-booked → no free slot that day.
  await seedListing("L_daybooked", MANILA, 1, "06:00:00", "09:00:00");
  await addBooking("L_daybooked", 1, 6, 7, MANILA);
  await addBooking("L_daybooked", 1, 7, 8, MANILA);
  await addBooking("L_daybooked", 1, 8, 9, MANILA);

  // L_partial — Manila, 06:00–21:00, unit 1, a single 07–08 booking → free except that hour.
  await seedListing("L_partial", MANILA, 1, "06:00:00", "21:00:00");
  await addBooking("L_partial", 1, 7, 8, MANILA);

  // L_wholeblock — Manila, 06:00–21:00, unit 2, a WHOLE-listing block (unit NULL) over 06–09.
  await seedListing("L_wholeblock", MANILA, 2, "06:00:00", "21:00:00");
  await testDb.db.insert(availabilityBlock).values({
    id: "L_wholeblock_blk",
    listingId: "L_wholeblock",
    unit: null, // whole listing → zeroes every unit (RESEARCH Pattern 3)
    startsAt: localHourUtc(6, MANILA),
    endsAt: localHourUtc(9, MANILA),
    reason: "venue closed",
  });

  // L_ny_free / L_ny_booked — New_York, 06:00–21:00 LOCAL, unit 1. The booked one has a confirmed hold at
  // NY-local 06–07 (a DIFFERENT UTC instant than Manila 06:00), so it proves per-venue-tz interpretation.
  await seedListing("L_ny_free", NY, 1, "06:00:00", "21:00:00");
  await seedListing("L_ny_booked", NY, 1, "06:00:00", "21:00:00");
  await addBooking("L_ny_booked", 1, 6, 7, NY);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

function search(overrides: Record<string, unknown>) {
  return searchParamsSchema.parse(overrides);
}

async function idsFor(overrides: Record<string, unknown>): Promise<string[]> {
  const { results } = await searchListings(testDb.db, search(overrides), NOW);
  return results.map((r) => r.id);
}

describe("searchListings Stage-2 — date-only true availability (D-34)", () => {
  it("keeps listings with any free hour that day and DROPS a fully-booked listing", async () => {
    const ids = await idsFor({ date: DATE });
    expect(ids).toContain("L_free");
    expect(ids).toContain("L_partial"); // free hours outside 07–08
    expect(ids).not.toContain("L_daybooked"); // 06–09 fully booked, no other operating hours
  });

  it("skips Stage-2 when no date is supplied (default browse shows even a fully-booked-that-day listing)", async () => {
    const ids = await idsFor({});
    expect(ids).toContain("L_daybooked"); // Stage-2 skipped → the bookable listing still appears (D-30)
  });
});

describe("searchListings Stage-2 — date+time free-window (D-34)", () => {
  it("keeps a fully-free window and DROPS a listing with any occupied hour inside it", async () => {
    const ids = await idsFor({ date: DATE, start: "06:00", end: "09:00" });
    expect(ids).toContain("L_free"); // 06,07,08 all free
    expect(ids).not.toContain("L_partial"); // 07–08 occupied inside the window
    expect(ids).not.toContain("L_wholeblock"); // whole-listing block over 06–09
  });

  it("keeps a listing when the picked window avoids its occupied hour", async () => {
    const ids = await idsFor({ date: DATE, start: "06:00", end: "07:00" });
    expect(ids).toContain("L_partial"); // only the free 06–07 hour is in the window
  });

  it("honors a whole-listing block over the window and frees the same listing outside it", async () => {
    expect(await idsFor({ date: DATE, start: "06:00", end: "09:00" })).not.toContain("L_wholeblock");
    // A window AFTER the block → available again (proves the drop was the block, not the listing).
    expect(await idsFor({ date: DATE, start: "09:00", end: "10:00" })).toContain("L_wholeblock");
  });
});

describe("searchListings Stage-2 — venue timezone per candidate (D-34)", () => {
  it("interprets the picked local window in each candidate's OWN timezone", async () => {
    const ids = await idsFor({ date: DATE, start: "06:00", end: "07:00" });
    // The picked LOCAL 06:00–07:00 resolves to NY-local 06:00 for the NY listings. If Stage-2 had used a
    // fixed tz, the NY window would miss the NY slots entirely and L_ny_free would be wrongly dropped.
    expect(ids).toContain("L_ny_free"); // NY-local 06–07 is free
    expect(ids).not.toContain("L_ny_booked"); // NY-local 06–07 is booked
  });
});
