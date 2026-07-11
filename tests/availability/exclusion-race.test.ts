// SC#4 — the double-booking keystone gate (D-21/D-28).
//
// Proves the Postgres GiST EXCLUDE constraint (drizzle/0005_booking_exclusion.sql) is the ONLY
// double-booking authority — no app-level conflict check anywhere. The load-bearing case is a
// GENUINE two-connection race: firing "two" inserts on the shared max:1 client would serialize and
// prove nothing (RESEARCH Pitfall 1), so we open independent connections via `makeRacingClients`
// and fire with Promise.allSettled. Exactly one wins; the loser is rejected with SQLSTATE 23P01.
//
// Regression guard: every rejection asserts `code === "23P01"` (via isPgError). If the constraint
// were absent, the two overlapping inserts would BOTH succeed and these expectations would fail —
// this test goes RED the moment 0005 stops applying. Do not weaken it to only assert fulfilled inserts.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { isPgError } from "@/lib/pg";
import { user, listing } from "@/lib/db/schema";
import type postgres from "postgres";

let testDb: TestDb;

const LISTING = "listing_race";
const HOST = "host_race";
const BOOKER = "booker_race";

// Raw INSERT via a given postgres.js client (search_path already bound to the isolated schema).
// Kept raw (not Drizzle) so the postgres.js error — with its SQLSTATE on `.code` — reaches the test.
const ins = (
  c: postgres.Sql,
  id: string,
  unit: number,
  start: string,
  end: string,
  status = "confirmed",
) => c`
  INSERT INTO booking (id, listing_id, unit, booker_id, starts_at, ends_at, status)
  VALUES (${id}, ${LISTING}, ${unit}, ${BOOKER}, ${start}, ${end}, ${status})`;

// DB-atomic rejection codes for a double-book attempt against the EXCLUDE constraint:
//   23P01 exclusion_violation — one row was already committed when the other inserted (sequential).
//   40P01 deadlock_detected   — two backends inserted then each waited on the other's uncommitted
//                               conflicting row; Postgres aborts exactly one (genuine concurrent race).
// BOTH prevent the double-book (exactly one row survives). Phase-4 booking error-mapping must treat
// 40P01 like 23P01 ("that time was just taken — retry"), not as an unexpected server error.
const CONFLICT_CODES = ["23P01", "40P01"] as const;
const isConflict = (e: unknown): boolean => CONFLICT_CODES.some((c) => isPgError(e, c));

// Assert a promise rejects specifically with the exclusion-violation SQLSTATE (23P01), never a
// message string (locale-fragile). Used for the DETERMINISTIC (sequential) overlap cases where the
// prior row is already committed, so the outcome is always exclusion_violation. Uses isPgError (src/lib/pg.ts).
async function expect23P01(promise: Promise<unknown>): Promise<void> {
  let caught: unknown;
  try {
    await promise;
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeDefined();
  expect(isPgError(caught, "23P01")).toBe(true);
}

beforeAll(async () => {
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: HOST, name: "Race Host", email: "host_race@example.com", firstName: "Race", emailVerified: true },
    { id: BOOKER, name: "Race Booker", email: "booker_race@example.com", firstName: "Booker", emailVerified: true },
  ]);
  // unitCount 8 is irrelevant to the constraint (it enforces PER-unit) but lets the multi-unit case run.
  await testDb.db.insert(listing).values({
    id: LISTING,
    hostId: HOST,
    title: "Race court",
    status: "published",
    unitCount: 8,
  });
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("booking_no_overlap EXCLUDE constraint (SC#4 — the double-booking guarantee)", () => {
  it("rejects the 2nd of two CONCURRENT overlapping inserts with 23P01 (genuine two-connection race)", async () => {
    const [a, b] = makeRacingClients(testDb.schema, 2); // two INDEPENDENT connections, one schema
    try {
      const results = await Promise.allSettled([
        ins(a, "bk_a", 1, "2026-08-01T02:00:00Z", "2026-08-01T03:00:00Z"),
        ins(b, "bk_b", 1, "2026-08-01T02:00:00Z", "2026-08-01T03:00:00Z"),
      ]);

      // Exactly one insert wins; the other loses the race and is DB-rejected.
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      expect(rejected).toBeDefined();
      // The loser is rejected with a conflict SQLSTATE — 23P01 (exclusion_violation) if the winner
      // committed first, or 40P01 (deadlock_detected) if both inserted-then-blocked simultaneously.
      // Either way the double-book is prevented at the DB. Both are asserted as expected outcomes.
      expect(isConflict(rejected!.reason)).toBe(true);

      // Exactly one row survives for that (listing, unit, window) — the double-book cannot exist.
      const [{ n }] = await testDb.client`
        SELECT count(*)::int AS n FROM booking
        WHERE listing_id = ${LISTING} AND unit = 1 AND starts_at = '2026-08-01T02:00:00Z'`;
      expect(n).toBe(1);
    } finally {
      await a.end();
      await b.end();
    }
  });

  it("allows different units in the same window; rejects a 3rd overlapping insert on a taken unit", async () => {
    // unit 1 and unit 2 both hold the same window — multi-unit venues book in parallel.
    await ins(testDb.client, "bk_u1", 1, "2026-08-02T05:00:00Z", "2026-08-02T06:00:00Z");
    await ins(testDb.client, "bk_u2", 2, "2026-08-02T05:00:00Z", "2026-08-02T06:00:00Z");
    // a third overlapping insert on the now-taken unit 1 is rejected.
    await expect23P01(ins(testDb.client, "bk_u1b", 1, "2026-08-02T05:00:00Z", "2026-08-02T06:00:00Z"));
  });

  it("allows back-to-back hours ('[)' half-open) but rejects a genuine partial overlap", async () => {
    // 10:00-11:00 and 11:00-12:00 share only the 11:00 instant, which '[)' excludes → BOTH succeed.
    await ins(testDb.client, "bk_bb1", 1, "2026-08-03T10:00:00Z", "2026-08-03T11:00:00Z");
    await ins(testDb.client, "bk_bb2", 1, "2026-08-03T11:00:00Z", "2026-08-03T12:00:00Z");

    // 10:00-11:00 and 10:30-11:30 genuinely overlap → the second is rejected.
    await ins(testDb.client, "bk_ov1", 1, "2026-08-04T10:00:00Z", "2026-08-04T11:00:00Z");
    await expect23P01(ins(testDb.client, "bk_ov2", 1, "2026-08-04T10:30:00Z", "2026-08-04T11:30:00Z"));
  });

  it("frees the slot when the occupying row leaves the partial WHERE (cancelled)", async () => {
    await ins(testDb.client, "bk_free1", 1, "2026-08-05T08:00:00Z", "2026-08-05T09:00:00Z");
    // Cancelling drops the row out of the partial WHERE ('pending','confirmed') occupying set.
    await testDb.client`UPDATE booking SET status = 'cancelled' WHERE id = 'bk_free1'`;
    // An overlapping 'confirmed' insert on the SAME unit now succeeds (the slot is freed).
    await ins(testDb.client, "bk_free2", 1, "2026-08-05T08:00:00Z", "2026-08-05T09:00:00Z");

    const [{ n }] = await testDb.client`
      SELECT count(*)::int AS n FROM booking WHERE id IN ('bk_free1', 'bk_free2')`;
    expect(n).toBe(2); // both rows exist; only bk_free2 currently occupies
  });
});
