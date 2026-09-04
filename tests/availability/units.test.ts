// Integration test for createBooking (src/lib/availability/units.ts) against the REAL
// booking_no_overlap EXCLUDE constraint (Plan 01). Clones the read-model.test.ts harness shape.
//
// Plan 01's exclusion-race test proves the constraint rejects a concurrent double-book at the DB
// level. This test proves the code path Phase 4 will actually call:
//   - AUTO-ASSIGN: unitCount=2, unit 1 already occupied for the window → createBooking skips unit 1 and
//     returns unit 2; a fresh non-overlapping window returns unit 1 (lowest free).
//   - EXHAUSTION → CLEAN MESSAGE: unitCount=1, the only unit occupied → createBooking throws
//     NoUnitAvailableError (not a raw pg throw), and funneling that through mapBookingError yields the
//     exact SC#4 copy.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking } from "@/lib/db/schema";
import { createBooking, mapBookingError, NoUnitAvailableError } from "@/lib/availability/units";

let testDb: TestDb;

const BOOKER = "u_booker";
// A window and a disjoint fresh window (well in the future; the constraint is time-based only).
const T = new Date("2026-08-10T02:00:00.000Z");
const T1 = new Date("2026-08-10T03:00:00.000Z"); // [T, T1)
const T2 = new Date("2026-08-10T04:00:00.000Z");
const T3 = new Date("2026-08-10T05:00:00.000Z"); // [T2, T3) — disjoint from [T, T1)

async function makeHost(id: string): Promise<void> {
  await testDb.db.insert(user).values({
    id,
    name: "U Host",
    email: `${id}@example.com`,
    firstName: "U",
    emailVerified: true,
  });
}

async function makeListing(id: string, hostId: string, unitCount: number): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: `Listing ${id}`,
    status: "published",
    unitCount,
  });
}

beforeAll(async () => {
  testDb = await setupTestDb();
  await makeHost("u_host");
  await testDb.db.insert(user).values({
    id: BOOKER,
    name: "U Booker",
    email: "u_booker@example.com",
    firstName: "Booker",
    emailVerified: true,
  });

  // Auto-assign listing: 2 units, unit 1 occupied for [T, T1).
  await makeListing("L_auto", "u_host", 2);
  await testDb.db.insert(booking).values({
    id: "seed_u1",
    listingId: "L_auto",
    unit: 1,
    bookerId: BOOKER,
    startsAt: T,
    endsAt: T1,
    status: "confirmed",
  });

  // Exhaustion listing: 1 unit, occupied for [T, T1).
  await makeListing("L_exhaust", "u_host", 1);
  await testDb.db.insert(booking).values({
    id: "seed_only",
    listingId: "L_exhaust",
    unit: 1,
    bookerId: BOOKER,
    startsAt: T,
    endsAt: T1,
    status: "confirmed",
  });
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("createBooking — find-free-unit + retry-on-conflict (RESEARCH Pattern 2)", () => {
  it("auto-assigns unit 2 when unit 1 is occupied for the overlapping window (unitCount=2)", async () => {
    const unit = await createBooking(testDb.db, {
      listingId: "L_auto",
      bookerId: BOOKER,
      startsAt: T,
      endsAt: T1,
      unitCount: 2,
    });
    expect(unit).toBe(2); // find-free SELECT skips occupied unit 1
  });

  it("assigns the lowest free unit (1) for a fresh non-overlapping window", async () => {
    const unit = await createBooking(testDb.db, {
      listingId: "L_auto",
      bookerId: BOOKER,
      startsAt: T2,
      endsAt: T3,
      unitCount: 2,
    });
    expect(unit).toBe(1); // nothing occupies [T2, T3) → lowest unit
  });

  it("throws NoUnitAvailableError when the only unit is exhausted (not a raw pg throw)", async () => {
    await expect(
      createBooking(testDb.db, {
        listingId: "L_exhaust",
        bookerId: BOOKER,
        startsAt: T,
        endsAt: T1,
        unitCount: 1,
      }),
    ).rejects.toBeInstanceOf(NoUnitAvailableError);
  });

  it("funnels an exhausted booking through mapBookingError to the clean SC#4 message", async () => {
    const res = await createBooking(testDb.db, {
      listingId: "L_exhaust",
      bookerId: BOOKER,
      startsAt: T,
      endsAt: T1,
      unitCount: 1,
    })
      .then((unit) => ({ ok: true as const, unit }))
      .catch(mapBookingError);
    expect(res).toEqual({ error: "That time was just taken. Pick another slot." });
  });
});
