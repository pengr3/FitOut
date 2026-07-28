// GROUP-05 / SC#4 — the Phase-8 acceptance gate (D-112): concurrent →yes RSVPs can NEVER exceed
// capacity_snapshot. This is the ONE genuinely new correctness surface of Phase 8, and it is proven
// exactly like Phase 3's exclusion-race.test.ts: a GENUINE multi-connection race via `makeRacingClients`,
// NOT a single shared max:1 client (which serializes and proves nothing — RESEARCH Pitfall 1).
//
// THE CRITICAL DIVERGENCE FROM exclusion-race.test.ts (RESEARCH Pattern 2 / Pitfall 1): the EXCLUDE
// constraint is atomic at STATEMENT level, so that test fires single autocommit INSERTs. The seat-claim
// is atomic only across `SELECT capacity_snapshot FOR UPDATE → count('yes') → conditional INSERT`, so
// each racer here runs a FULL TRANSACTION. A raw single INSERT would pass even against a broken
// (unlocked) claim — the lock window would never actually be raced.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THIS FILE HAS TWO LAYERS AND THEREFORE TWO SEPARATE MUTATIONS, each against its OWN file and line.
// Run BOTH — neither substitutes for the other. (08-09 executed the gate with only one of them
// stated, discovered the stated one was not executable as written, and logged it as deferred item 4.)
//
//   LAYER 1 — the PATTERN proof (`raceClaim`, cases 1-2). The seat-claim SQL is INLINED inside each
//     racer's transaction precisely so the `FOR UPDATE` lock ITSELF is the thing under test — the same
//     discipline as exclusion-race.test.ts testing the EXCLUDE constraint directly. These cases never
//     touch production code, by design.
//     ▶ MUTATION 1: delete `FOR UPDATE` from the SELECT inside `raceClaim` IN THIS FILE
//       (tests/group/seat-claim-race.test.ts, marked at its call site below) → this file goes RED
//       (2+ committed 'yes' at snapshot=1) → restore → GREEN.
//
//   LAYER 2 — the SHIPPED proof (`realClaim`, cases 3-4). Layer 1 proves the *pattern* is race-free; it
//     does NOT prove the *shipped* claim still carries the lock, because it never imports `claimSeat`.
//     Measured in 08-09: deleting the production lock left this file GREEN (2/2), all of tests/group/
//     GREEN and the full 792-test suite GREEN while shipping an over-cap bug. So cases 3-4 drive the
//     REAL `claimSeat` from @/lib/group/seat-claim, with one `drizzle(client)` over one INDEPENDENT
//     connection PER RACER (a shared max:1 `testDb.db` would serialize and prove nothing).
//     ▶ MUTATION 2: delete `FOR UPDATE` from src/lib/group/seat-claim.ts:54 (the PRODUCTION file) →
//       this file goes RED (2+ committed 'yes' at snapshot=1) → restore → GREEN, then confirm
//       `git diff --exit-code src/lib/group/seat-claim.ts` exits 0.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { user, listing, booking, bookingGroup } from "@/lib/db/schema";
import { claimSeat } from "@/lib/group/seat-claim";

let testDb: TestDb;

const HOST = "host_seat_race";
const BOOKER = "booker_seat_race";
const LISTING = "listing_seat_race";

// Four independent groups so no race scenario ever shares rsvp state with another. Layers 1 and 2
// deliberately get their OWN groups: a shared group would let the inlined cases' committed rows
// pre-fill the cap the real-claimSeat cases race for.
const CAP1_BOOKING = "bk_seat_race_1";
const CAP1_GID = "grp_seat_race_1";
const CAP2_BOOKING = "bk_seat_race_2";
const CAP2_GID = "grp_seat_race_2";
// Layer 2 (the SHIPPED claimSeat) fixtures.
const REAL1_BOOKING = "bk_seat_race_real_1";
const REAL1_GID = "grp_seat_race_real_1";
const REAL2_BOOKING = "bk_seat_race_real_2";
const REAL2_GID = "grp_seat_race_real_2";

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
    {
      id: REAL1_BOOKING,
      listingId: LISTING,
      bookerId: BOOKER,
      unit: 1,
      startsAt: new Date("2026-09-03T02:00:00Z"),
      endsAt: new Date("2026-09-03T03:00:00Z"),
      status: "confirmed",
    },
    {
      id: REAL2_BOOKING,
      listingId: LISTING,
      bookerId: BOOKER,
      unit: 1,
      startsAt: new Date("2026-09-04T02:00:00Z"),
      endsAt: new Date("2026-09-04T03:00:00Z"),
      status: "confirmed",
    },
  ]);
  // voided_at is left NULL on every group — the SHIPPED claimSeat scopes its lock with
  // `voided_at IS NULL` and fails closed ({ ok:false, reason:"full" }) on a voided group, which would
  // make cases 3-4 pass for entirely the wrong reason.
  await testDb.db.insert(bookingGroup).values([
    { id: CAP1_GID, bookingId: CAP1_BOOKING, capacitySnapshot: 1, accessToken: "tok_seat_race_1" },
    { id: CAP2_GID, bookingId: CAP2_BOOKING, capacitySnapshot: 2, accessToken: "tok_seat_race_2" },
    { id: REAL1_GID, bookingId: REAL1_BOOKING, capacitySnapshot: 1, accessToken: "tok_seat_race_real_1" },
    { id: REAL2_GID, bookingId: REAL2_BOOKING, capacitySnapshot: 2, accessToken: "tok_seat_race_real_2" },
  ]);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

// LAYER 1 — a single seat-claim, inlined into ONE racer's transaction. Each racer opens its own
// independent connection (makeRacingClients), so `client.begin` genuinely races the FOR UPDATE lock
// window. The row lock on the single booking_group row is the atomic authority — the app never
// adjudicates. This helper is the PATTERN proof and is deliberately independent of production code.
function raceClaim(client: TestDb["client"], groupId: string) {
  return client.begin(async (sql) => {
    // (1) LOCK the single group row — the atomic no-overflow authority (D-112). ← MUTATION 1 TARGET:
    //     delete `FOR UPDATE` on the next SELECT (in THIS file) to mutation-verify the pattern proof
    //     (this file must go RED), then restore. This is NOT the production lock — that is MUTATION 2,
    //     at src/lib/group/seat-claim.ts:54, covered by cases 3-4 below.
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

// LAYER 2 — the SHIPPED claim. One racer = one INDEPENDENT postgres.js connection, wrapped in its OWN
// `drizzle(...)` so it satisfies claimSeat's `DbConn` first parameter (read-model.ts:27 —
// `PostgresJsDatabase<Record<string, unknown>>`, exactly what `drizzle(client)` produces). Sharing
// `testDb.db` (max: 1) across racers would serialize the lock window and prove nothing (RESEARCH
// Pitfall 1) — that is the whole reason `makeRacingClients` exists.
//
// The identity is a NAME-ONLY guest (userId: null, guestEmailNorm: null) with a distinct name, so
// claimSeat's de-dup predicate resolves to `sql\`false\`` (seat-claim.ts:60-65) and EVERY racer
// genuinely attempts a fresh INSERT. An identity that de-duped would let a loser return { ok: true }
// by matching an existing row, and the race would test nothing.
function realClaim(client: TestDb["client"], groupId: string, name: string) {
  return claimSeat(drizzle(client), {
    groupId,
    answer: "yes",
    userId: null,
    guestEmailNorm: null,
    name,
  });
}

describe("seat-claim no-overflow (GROUP-05 / SC#4 — the D-112 acceptance gate)", () => {
  it("caps 3 concurrent →yes at capacity_snapshot=1 — exactly ONE 'yes' ever survives", async () => {
    const clients = makeRacingClients(testDb.schema, 3); // 3 INDEPENDENT connections, one schema
    try {
      const results = await Promise.allSettled(clients.map((client) => raceClaim(client, CAP1_GID)));

      // Every racer's transaction resolves (a loser commits without inserting — a calm "just filled up",
      // never a crash). Exactly one actually claimed a seat.
      const claimedCount = results.filter((r) => r.status === "fulfilled" && r.value.claimed === true).length;
      expect(claimedCount).toBe(1);

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

      const claimedCount = results.filter((r) => r.status === "fulfilled" && r.value.claimed === true).length;
      expect(claimedCount).toBe(2);

      const [{ n }] = await testDb.client`
        SELECT count(*)::int AS n FROM rsvp WHERE group_id = ${CAP2_GID} AND status = 'yes'`;
      expect(n).toBe(2);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  // ── LAYER 2: the same race, driven through the SHIPPED claimSeat. These two cases are the ONLY
  //    thing standing between a one-line deletion at src/lib/group/seat-claim.ts:54 and a fully green
  //    suite (deferred item 4 / 08-09). MUTATION 2 targets that line, NOT the inlined SELECT above.
  it("caps 3 concurrent REAL claimSeat →yes at capacity_snapshot=1 — the SHIPPED lock is the authority", async () => {
    const clients = makeRacingClients(testDb.schema, 3); // 3 INDEPENDENT connections, one schema
    try {
      const results = await Promise.allSettled(
        clients.map((client, i) => realClaim(client, REAL1_GID, `Real racer ${i + 1}`)),
      );

      // No racer throws: a loser resolves to the calm { ok:false, reason:"full" } the UI renders as
      // "just filled up", never a rejected promise (D-112).
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);

      // The load-bearing assertion FIRST, read back through an INDEPENDENT connection: exactly one
      // 'yes' is COMMITTED. Without the FOR UPDATE at seat-claim.ts:54 every racer reads count=0 and
      // inserts → n=3 and this goes RED. That is MUTATION 2, and it is asserted ahead of the returned
      // results so the mutation's failure message names the DB truth (committed rows), not a proxy.
      const [{ n }] = await testDb.client`
        SELECT count(*)::int AS n FROM rsvp WHERE group_id = ${REAL1_GID} AND status = 'yes'`;
      expect(n).toBe(1);

      const values = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      const winners = values.filter((v) => v.ok === true);
      const losers = values.filter((v) => v.ok === false);
      expect(winners).toHaveLength(1);
      expect(winners[0]).toMatchObject({ ok: true, status: "yes" });
      expect(losers).toHaveLength(2);
      expect(losers.every((l) => l.ok === false && l.reason === "full")).toBe(true);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  it("caps 4 concurrent REAL claimSeat →yes at capacity_snapshot=2 — the shipped cap tracks the snapshot", async () => {
    // A second snapshot proves the SHIPPED guard reads capacity_snapshot, not a hardcoded 1.
    const clients = makeRacingClients(testDb.schema, 4);
    try {
      const results = await Promise.allSettled(
        clients.map((client, i) => realClaim(client, REAL2_GID, `Real racer ${i + 1}`)),
      );

      expect(results.every((r) => r.status === "fulfilled")).toBe(true);

      const [{ n }] = await testDb.client`
        SELECT count(*)::int AS n FROM rsvp WHERE group_id = ${REAL2_GID} AND status = 'yes'`;
      expect(n).toBe(2);

      const values = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      expect(values.filter((v) => v.ok === true)).toHaveLength(2);
      const losers = values.filter((v) => v.ok === false);
      expect(losers).toHaveLength(2);
      expect(losers.every((l) => l.ok === false && l.reason === "full")).toBe(true);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });
});
