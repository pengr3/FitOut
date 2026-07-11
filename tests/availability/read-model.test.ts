// Integration test for the on-the-fly availability read model (src/lib/availability/read-model.ts).
//
// Clones the geo-roundtrip.test.ts harness shape (setupTestDb → migrated isolated schema → seed →
// assert). Proves AVAIL-03 free-unit math from operating hours − blocks − occupying bookings, in the
// venue tz, with the SAME '[)' half-open overlap as the booking_no_overlap EXCLUDE constraint:
//   - no hours for the day        → hasHours:false, empty slots
//   - Mon 06:00-09:00 window      → 3 available slots (Asia/Manila)
//   - unit-scoped block (u3 of 8) → that slot's freeUnits drops to 7 (still available)
//   - whole-listing block (NULL)  → freeUnits 0 (unavailable)
//   - occupying booking, 1 unit   → unavailable
//   - CANCELLED booking           → does NOT reduce freeUnits (only pending/confirmed occupy)

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, operatingHours, availabilityBlock, booking } from "@/lib/db/schema";
import { getAvailability } from "@/lib/availability/read-model";

let testDb: TestDb;

// A fixed "now" well before the Aug 3 2026 (Monday) test day → every slot is future & within horizon.
const NOW = new Date("2026-07-15T00:00:00.000Z");
// The venue-local day under test (month is 1-based here; Aug 3 2026 is a Monday → dow 1).
const DAY = { year: 2026, month: 8, day: 3 } as const;

// The 06:00-07:00 Asia/Manila slot on Aug 3 2026 = UTC [2026-08-02T22:00Z, 2026-08-02T23:00Z).
const SLOT_0600_START = "2026-08-02T22:00:00.000Z";
const S = new Date("2026-08-02T22:00:00.000Z");
const E = new Date("2026-08-02T23:00:00.000Z");

const BOOKER = "rm_booker";

async function makeHost(id: string): Promise<void> {
  await testDb.db.insert(user).values({
    id,
    name: "RM Host",
    email: `${id}@example.com`,
    firstName: "RM",
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
    timezone: "Asia/Manila",
  });
}

async function addMondayHours(listingId: string, open = "06:00:00", close = "09:00:00"): Promise<void> {
  await testDb.db.insert(operatingHours).values({
    id: `oh_${listingId}`,
    listingId,
    dayOfWeek: 1, // Monday
    openTime: open,
    closeTime: close,
  });
}

beforeAll(async () => {
  testDb = await setupTestDb();
  await makeHost("rm_host");
  await testDb.db.insert(user).values({
    id: BOOKER,
    name: "RM Booker",
    email: "rm_booker@example.com",
    firstName: "Booker",
    emailVerified: true,
  });

  // Case a: listing with NO operating hours.
  await makeListing("L_nohours", "rm_host", 1);

  // Case b: open Mon 06-09, unitCount 1.
  await makeListing("L_open", "rm_host", 1);
  await addMondayHours("L_open");

  // Case c: unitCount 8, a unit-scoped block on unit 3 covering the 06:00 slot.
  await makeListing("L_unitblock", "rm_host", 8);
  await addMondayHours("L_unitblock");
  await testDb.db.insert(availabilityBlock).values({
    id: "blk_unit3",
    listingId: "L_unitblock",
    unit: 3,
    startsAt: S,
    endsAt: E,
    reason: "court 3 maintenance",
  });

  // Case d: unitCount 8, a WHOLE-listing block (unit NULL) covering the 06:00 slot.
  await makeListing("L_wholeblock", "rm_host", 8);
  await addMondayHours("L_wholeblock");
  await testDb.db.insert(availabilityBlock).values({
    id: "blk_whole",
    listingId: "L_wholeblock",
    unit: null, // whole listing
    startsAt: S,
    endsAt: E,
    reason: "venue closed",
  });

  // Case e: unitCount 1, a CONFIRMED booking on unit 1 covering the 06:00 slot.
  await makeListing("L_booked", "rm_host", 1);
  await addMondayHours("L_booked");
  await testDb.db.insert(booking).values({
    id: "bk_confirmed",
    listingId: "L_booked",
    unit: 1,
    bookerId: BOOKER,
    startsAt: S,
    endsAt: E,
    status: "confirmed",
  });

  // Case f: unitCount 1, a CANCELLED booking on unit 1 covering the 06:00 slot (must NOT occupy).
  await makeListing("L_cancelled", "rm_host", 1);
  await addMondayHours("L_cancelled");
  await testDb.db.insert(booking).values({
    id: "bk_cancelled",
    listingId: "L_cancelled",
    unit: 1,
    bookerId: BOOKER,
    startsAt: S,
    endsAt: E,
    status: "cancelled",
  });
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("getAvailability — on-the-fly free-unit read model (AVAIL-03)", () => {
  it("returns hasHours:false and an empty slot list when the day has no operating hours", async () => {
    const res = await getAvailability(testDb.db, "L_nohours", DAY, NOW);
    expect(res.hasHours).toBe(false);
    expect(res.slots).toEqual([]);
    expect(res.timezone).toBe("Asia/Manila");
  });

  it("enumerates a Mon 06:00-09:00 window as 3 available slots in the venue tz", async () => {
    const res = await getAvailability(testDb.db, "L_open", DAY, NOW);
    expect(res.hasHours).toBe(true);
    expect(res.slots).toHaveLength(3);
    expect(res.slots.every((s) => s.state === "available")).toBe(true);
    expect(res.slots.every((s) => s.freeUnits === 1 && s.unitCount === 1)).toBe(true);
    // First slot is the venue-local 06:00 → UTC 22:00Z the prior day (SC#2 venue-tz correctness).
    expect(res.slots[0].startUtc).toBe(SLOT_0600_START);
  });

  it("reduces freeUnits by exactly one for a unit-scoped block (unit 3 of 8), still available", async () => {
    const res = await getAvailability(testDb.db, "L_unitblock", DAY, NOW);
    const slot0600 = res.slots.find((s) => s.startUtc === SLOT_0600_START)!;
    expect(slot0600.freeUnits).toBe(7); // 8 − 1 blocked unit
    expect(slot0600.state).toBe("available");
    // Non-overlapped slots keep all 8 units free.
    const others = res.slots.filter((s) => s.startUtc !== SLOT_0600_START);
    expect(others.every((s) => s.freeUnits === 8 && s.state === "available")).toBe(true);
  });

  it("zeroes freeUnits for a whole-listing block (unit NULL) → unavailable", async () => {
    const res = await getAvailability(testDb.db, "L_wholeblock", DAY, NOW);
    const slot0600 = res.slots.find((s) => s.startUtc === SLOT_0600_START)!;
    expect(slot0600.freeUnits).toBe(0);
    expect(slot0600.state).toBe("unavailable");
    // Other slots are unaffected by a block that doesn't overlap them.
    const others = res.slots.filter((s) => s.startUtc !== SLOT_0600_START);
    expect(others.every((s) => s.freeUnits === 8)).toBe(true);
  });

  it("marks a slot unavailable when the only unit is occupied by a confirmed booking", async () => {
    const res = await getAvailability(testDb.db, "L_booked", DAY, NOW);
    const slot0600 = res.slots.find((s) => s.startUtc === SLOT_0600_START)!;
    expect(slot0600.freeUnits).toBe(0);
    expect(slot0600.state).toBe("unavailable");
  });

  it("does NOT reduce freeUnits for a cancelled booking (only pending/confirmed occupy)", async () => {
    const res = await getAvailability(testDb.db, "L_cancelled", DAY, NOW);
    const slot0600 = res.slots.find((s) => s.startUtc === SLOT_0600_START)!;
    expect(slot0600.freeUnits).toBe(1);
    expect(slot0600.state).toBe("available");
  });
});
