// GROUP-05 / SC#4 — the Phase-8 acceptance gate (D-112): concurrent →yes RSVPs can NEVER exceed
// capacity_snapshot. This is the ONE genuinely new correctness surface of Phase 8, and it is proven
// exactly like Phase 3's exclusion-race.test.ts: a GENUINE two-connection race via `makeRacingClients`,
// NOT a single shared max:1 client (which serializes and proves nothing — RESEARCH Pitfall 1).
//
// THE CRITICAL DIVERGENCE FROM exclusion-race.test.ts (RESEARCH Pattern 2 / Pitfall 1): the EXCLUDE
// constraint is atomic at STATEMENT level, so that test fires single autocommit INSERTs. The seat-claim
// is atomic only across `SELECT capacity_snapshot FOR UPDATE → count('yes') → conditional INSERT`, so
// each racer here runs a FULL TRANSACTION via `client.begin(...)`. A raw single INSERT would pass even
// against a broken (unlocked) claim — the lock window would never actually be raced.
//
// The seat-claim SQL is INLINED inside each racer's transaction (not routed through claimSeat) precisely
// so the FOR UPDATE lock is the thing under test — the same discipline as exclusion-race.test.ts testing
// the constraint directly. MUTATION-VERIFY (the non-negotiable gate): delete `FOR UPDATE` from the SELECT
// below, run this file, watch it go RED (2+ committed 'yes' at snapshot=1), then restore → GREEN.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { user, listing, booking, bookingGroup } from "@/lib/db/schema";

let testDb: TestDb;

const HOST = "host_seat_race";
const BOOKER = "booker_seat_race";
const LISTING = "listing_seat_race";

// Two independent groups so the two race scenarios never share rsvp state.
const CAP1_BOOKING = "bk_seat_race_1";
const CAP1_GID = "grp_seat_race_1";
const CAP2_BOOKING = "bk_seat_race_2";
const CAP2_GID = "grp_seat_race_2";

beforeAll(async () => {
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: HOST, name: "Seat Host", email: "seat_host@example.com", firstName: "Seat", emailVerified: true },
    { id: BOOKER, name: "Seat Booker", email: "seat_booker@example.com", firstName: "Seat", emailVerified: true },
  ]);
  // maxOccupancy here is DELIBERATELY large (10) — the race must be capped by capacity_snapshot on the
  // group row, NEVER by live listing.maxOccupancy (D-111). If the claim ever read maxOccupancy, this file
  // would let 10 through and the snapshot=1 assertion would fail — a second guard on top of the lock.
  await testDb.db.insert(listing).values({
    id: LISTING,
    hostId: HOST,
    title: "Seat court",
    status: "published",
    maxOccupancy: 10,
    unitCount: 1,
  });
  // A confirmed booking per group (booking_id is a UNIQUE FK on booking_group). Distinct windows so the
  // booking_no_overlap EXCLUDE constraint is irrelevant to the fixture.
  await testDb.db.insert(booking).values([
    {
      id: CAP1_BOOKING,
      listingId: LISTING,
      bookerId: BOOKER,
      unit: 1,
      startsAt: new Date("2026-09-01T02:00:00Z"),
      endsAt: new Date("2026-09-01T03:00:00Z"),
      status: "confirmed",
    },
    {
      id: CAP2_BOOKING,
      listingId: LISTING,
      bookerId: BOOKER,
      unit: 1,
      startsAt: new Date("2026-09-02T02:00:00Z"),
      endsAt: new Date("2026-09-02T03:00:00Z"),
      status: "confirmed",
    },
  ]);
  await testDb.db.insert(bookingGroup).values([
    { id: CAP1_GID, bookingId: CAP1_BOOKING, capacitySnapshot: 1, accessToken: "tok_seat_race_1" },
    { id: CAP2_GID, bookingId: CAP2_BOOKING, capacitySnapshot: 2, accessToken: "tok_seat_race_2" },
  ]);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

// A single seat-claim, inlined into ONE racer's transaction. Each racer opens its own independent
// connection (makeRacingClients), so `client.begin` genuinely races the FOR UPDATE lock window.
// The row lock on the single booking_group row is the atomic authority — the app never adjudicates.
function raceClaim(client: TestDb["client"], groupId: string) {
  return client.begin(async (sql) => {
    // (1) LOCK the single group row — the atomic no-overflow authority (D-112). ← delete `FOR UPDATE`
    //     here to mutation-verify this gate (it must go RED).
    const [g] = (await sql`
      SELECT capacity_snapshot FROM booking_group WHERE id = ${groupId} FOR UPDATE
    `) as unknown as { capacity_snapshot: number }[];
    // (2) count confirmed 'yes' UNDER the lock — drift-free.
    const [{ yes }] = (await sql`
      SELECT count(*)::int AS yes FROM rsvp WHERE group_id = ${groupId} AND status = 'yes'
    `) as unknown as { yes: number }[];
    // (3) a →yes that would exceed the snapshot loses the race.
    if (yes >= g.capacity_snapshot) return { claimed: false as const };
    const id = randomUUID();
    await sql`
      INSERT INTO rsvp (id, group_id, user_id, guest_name, guest_email_norm, status)
      VALUES (${id}, ${groupId}, ${null}, ${"Racer"}, ${null}, 'yes')
    `;
    return { claimed: true as const, id };
  });
}

describe("seat-claim no-overflow (GROUP-05 / SC#4 — the D-112 acceptance gate)", () => {
  it("caps 3 concurrent →yes at capacity_snapshot=1 — exactly ONE 'yes' ever survives", async () => {
    const clients = makeRacingClients(testDb.schema, 3); // 3 INDEPENDENT connections, one schema
    try {
      const results = await Promise.allSettled(clients.map((client) => raceClaim(client, CAP1_GID)));

      // Every racer's transaction resolves (a loser commits without inserting — a calm "just filled up",
      // never a crash). Exactly one actually claimed a seat.
      const claimed = results.filter(
        (r): r is PromiseFulfilledResult<{ claimed: true; id: string }> =>
          r.status === "fulfilled" && r.value.claimed === true,
      );
      expect(claimed).toHaveLength(1);

      // The load-bearing assertion: re-count committed 'yes' rows through the shared connection. Snapshot=1
      // → exactly one 'yes' survives, ever. Without the FOR UPDATE lock two racers both read count=0 and
      // both insert → n=2 and this goes RED (the mutation-verification).
      const [{ n }] = await testDb.client`
        SELECT count(*)::int AS n FROM rsvp WHERE group_id = ${CAP1_GID} AND status = 'yes'`;
      expect(n).toBe(1);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  it("caps 4 concurrent →yes at capacity_snapshot=2 — exactly TWO 'yes' survive (not merely 'one')", async () => {
    // A second snapshot proves the gate tracks the snapshot value, not a hardcoded 1.
    const clients = makeRacingClients(testDb.schema, 4);
    try {
      const results = await Promise.allSettled(clients.map((client) => raceClaim(client, CAP2_GID)));

      const claimed = results.filter(
        (r): r is PromiseFulfilledResult<{ claimed: true; id: string }> =>
          r.status === "fulfilled" && r.value.claimed === true,
      );
      expect(claimed).toHaveLength(2);

      const [{ n }] = await testDb.client`
        SELECT count(*)::int AS n FROM rsvp WHERE group_id = ${CAP2_GID} AND status = 'yes'`;
      expect(n).toBe(2);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });
});
