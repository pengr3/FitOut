// Hold expiry — the D-48 lazy-read + sweep-on-write PAIR, proven end-to-end (BOOK-02).
//
// Integration test (isolated schema), mirroring tests/availability/read-model.test.ts conventions. It
// proves why BOTH halves of D-48 are required — neither alone is sufficient (RESEARCH Pattern 3):
//   - LAZY READS keep the UI honest: a pending hold past its expires_at reads as FREE in getAvailability.
//   - SWEEP-ON-WRITE keeps the write path from failing against a slot the UI showed free: the
//     booking_no_overlap EXCLUDE constraint has NO time awareness, so a stale-but-not-yet-cancelled
//     pending row would still 23P01 an insert. createPendingHold flips it to 'cancelled' in the SAME tx
//     before inserting, so the constraint sees the freed slot.
// The inverse guards the guarantee: a LIVE (future-expiry) hold still occupies the slot AND blocks a new
// overlapping hold by someone else — mapped to the clean "just taken", never a double-book.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, operatingHours, booking } from "@/lib/db/schema";
import { getAvailability } from "@/lib/availability/read-model";
import { createPendingHold } from "@/lib/availability/units";

let testDb: TestDb;

// A fixed "now" before the Aug 3 2026 (Monday) test day → the slot is future & within the 90-day horizon.
const NOW = new Date("2026-07-15T00:00:00.000Z");
const DAY = { year: 2026, month: 8, day: 3 } as const; // month 1-based; Aug 3 2026 = Monday (dow 1)
// The 06:00-07:00 Asia/Manila slot on Aug 3 2026 = UTC [2026-08-02T22:00Z, 2026-08-02T23:00Z).
const SLOT_0600_START = "2026-08-02T22:00:00.000Z";
const S = new Date("2026-08-02T22:00:00.000Z");
const E = new Date("2026-08-02T23:00:00.000Z");

const HOST = "he_host";
const BOOKER = "he_booker";
const OTHER = "he_booker_other";
const HOURLY = 5000;
const DAYRATE = 30000;

async function makeListing(id: string): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId: HOST,
    title: `Listing ${id}`,
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: HOURLY,
    dayRateCents: DAYRATE,
  });
  await testDb.db.insert(operatingHours).values({
    id: `oh_${id}`,
    listingId: id,
    dayOfWeek: 1, // Monday
    openTime: "06:00:00",
    closeTime: "09:00:00",
  });
}

beforeAll(async () => {
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: HOST, name: "HE Host", email: "he_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "HE Booker", email: "he_booker@example.com", firstName: "Booker", emailVerified: true },
    { id: OTHER, name: "HE Other", email: "he_booker_other@example.com", firstName: "Other", emailVerified: true },
  ]);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("hold expiry — lazy reads + sweep-on-write (D-48)", () => {
  it("a stale pending hold reads FREE (lazy) AND a new hold on it succeeds (sweep frees the slot)", async () => {
    await makeListing("L_stale");
    // A pending hold whose expiry already passed vs the DB clock (SQL now()), covering the 06:00 slot.
    const pastExpiry = new Date(Date.now() - 60 * 60 * 1000);
    await testDb.db.insert(booking).values({
      id: "stale_hold",
      listingId: "L_stale",
      unit: 1,
      bookerId: BOOKER,
      startsAt: S,
      endsAt: E,
      status: "pending",
      expiresAt: pastExpiry,
    });

    // (a) LAZY READ: the read model reports the slot FREE despite the (stale) pending row.
    const avail = await getAvailability(testDb.db, "L_stale", DAY, NOW);
    const slot = avail.slots.find((s) => s.startUtc === SLOT_0600_START)!;
    expect(slot.state).toBe("available");
    expect(slot.freeUnits).toBe(1);

    // (b) SWEEP-ON-WRITE: a new hold on the SAME window succeeds — the sweep flips the stale hold to
    // cancelled in the SAME tx so the EXCLUDE constraint sees the freed slot (lazy reads alone can't).
    const res = await createPendingHold(testDb.db, {
      listingId: "L_stale",
      bookerId: OTHER,
      startsAt: S,
      endsAt: E,
    });
    expect("ok" in res && res.ok).toBe(true);

    // The stale row is now cancelled; exactly the fresh pending hold occupies unit 1.
    const staleRows = await testDb.client`SELECT status FROM booking WHERE id = 'stale_hold'`;
    expect(staleRows[0].status).toBe("cancelled");
    const [{ n }] = await testDb.client`
      SELECT count(*)::int AS n FROM booking WHERE listing_id = 'L_stale' AND status = 'pending'`;
    expect(n).toBe(1);
  });

  it("a LIVE (future-expiry) pending hold still occupies the slot AND blocks a new overlapping hold", async () => {
    await makeListing("L_live");
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await testDb.db.insert(booking).values({
      id: "live_hold",
      listingId: "L_live",
      unit: 1,
      bookerId: BOOKER,
      startsAt: S,
      endsAt: E,
      status: "pending",
      expiresAt: futureExpiry,
    });

    // Lazy read: the slot is (correctly) occupied by the live hold.
    const avail = await getAvailability(testDb.db, "L_live", DAY, NOW);
    const slot = avail.slots.find((s) => s.startUtc === SLOT_0600_START)!;
    expect(slot.state).toBe("unavailable");
    expect(slot.freeUnits).toBe(0);

    // A DIFFERENT booker cannot hold the still-live slot — it maps to the clean "just taken" (not a
    // replay: that would only happen for the hold's OWN booker, the D-42 own-hold path).
    const res = await createPendingHold(testDb.db, {
      listingId: "L_live",
      bookerId: OTHER,
      startsAt: S,
      endsAt: E,
    });
    expect("error" in res).toBe(true);
    if ("error" in res) expect(res.error).toMatch(/just taken/i);

    // Still exactly one pending hold (the live one) — the sweep did NOT touch it; no double-book.
    const [{ n }] = await testDb.client`
      SELECT count(*)::int AS n FROM booking WHERE listing_id = 'L_live' AND status = 'pending'`;
    expect(n).toBe(1);
  });
});
