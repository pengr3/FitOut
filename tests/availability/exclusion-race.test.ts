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
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// OBSERVED RED — Phase 11 / GATE-04 (D-33). The claim in the paragraph directly above is no longer
// asserted from memory: the double-booking guarantee has been WATCHED FAILING with
// `booking_no_overlap` removed. Performed BY HAND, exactly once, 13 August 2026, against a THROWAWAY
// `fitout_test` (a disposable postgis/postgis:18-3.6 container on port 55432, matching CI's `gate-db`
// service; removed afterwards). Nothing destructive was left behind, and nothing destructive lives in
// this suite — D-33's standing guard is the read-only `pg_constraint` assertion in
// `tests/availability/open-capacity-exclude.test.ts`.
//
// HEAD = 0c51a36 at the time of the run; `git status --short -- src/ tests/` EMPTY.
//
// ─── FIRST: THE PROBE THAT DOES NOT WORK. Read this before designing a mutation of your own. ───
//
// The obvious mutation — connect to `fitout_test` and issue
//   ALTER TABLE booking DROP CONSTRAINT booking_no_overlap;
// — is VACUOUS against this spec, and it is vacuous in the most dangerous way available: it looks
// exactly like a completed proof. Measured, not reasoned:
//
//   $ psql -d fitout_test -c "ALTER TABLE booking DROP CONSTRAINT booking_no_overlap;"
//   ALTER TABLE
//   $ psql -d fitout_test -At -c "SELECT count(*) FROM pg_constraint WHERE conname='booking_no_overlap';"
//   0
//   $ npx vitest run tests/availability/exclusion-race.test.ts
//    Test Files  1 passed (1)
//         Tests  4 passed (4)                                              ← exit code 0
//
// The constraint is provably gone from the entire database and this spec is still GREEN. The cause is
// structural, not timing: `setupTestDb()` (tests/helpers/db.ts) creates a BRAND-NEW schema per test
// file and replays every `drizzle/*.sql` into it, so 0005/0012/0022 re-create `booking_no_overlap`
// inside `test_<pid>_<worker>_<counter>` on every single run. Every insert below goes to THAT schema.
// An unqualified `ALTER TABLE booking` from psql resolves against `public` on the default
// `search_path`, which this spec never reads. A DDL mutation to `public` therefore cannot reach this
// spec BY CONSTRUCTION. Anyone who runs that drop, sees green, and concludes "the gate still holds"
// has measured nothing at all.
//
// ─── THE MUTATION THAT ACTUALLY REACHES THE SPEC ───
//
// The same statement, relocated to the only moment at which the isolated schema exists — inside
// `setupTestDb()`, immediately after the migration replay and before the spec's client is opened:
//
//   await bootstrap.unsafe(
//     `SET search_path TO "${schema}", public; ALTER TABLE booking DROP CONSTRAINT booking_no_overlap`,
//   );
//
// This form is strictly SAFER than dropping the constraint from a persistent schema, which is why it
// was the one used. The mutated schema is EPHEMERAL — `teardownTestDb`'s `DROP SCHEMA … CASCADE`
// removes it when the file ends — so there is no manual re-ADD step to get wrong and no window in
// which a persistent test database sits unconstrained. That window is precisely the risk D-33 named
// (a failed rollback leaving the test DB with no constraint and every later test silently green).
// The edit was made in the working tree, NEVER committed, and reverted with
// `git checkout -- tests/helpers/db.ts`; `git diff -- tests/helpers/db.ts` came back empty, and
// `grep -rn "DROP CONSTRAINT" tests/` returns nothing.
//
// ─── THE RUN ───
//
// COMMAND, VERBATIM — exit code 1:
//
//   TEST_DATABASE_URL="postgres://fitout:fitout@localhost:55432/fitout_test" \
//     npx vitest run tests/availability/exclusion-race.test.ts
//
// OUTPUT, VERBATIM (the `91|` / `115|` / `125|` / `57|` line pointers are AS-RUN, i.e. taken before
// this block was inserted above the imports. This block is 176 lines, so each pointer now sits
// exactly 176 lines lower: `:91` → `:267`, `:115` → `:291`, `:125` → `:301`, `:57` → `:233`):
//
//    ❯ tests/availability/exclusion-race.test.ts (4 tests | 3 failed) 854ms
//        × rejects the 2nd of two CONCURRENT overlapping inserts with 23P01 (genuine two-connection race) 63ms
//        × allows different units in the same window; rejects a 3rd overlapping insert on a taken unit 13ms
//        × allows back-to-back hours ('[)' half-open) but rejects a genuine partial overlap 13ms
//
//   ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
//
//    FAIL  tests/availability/exclusion-race.test.ts > booking_no_overlap EXCLUDE constraint (SC#4 —
//    the double-booking guarantee) > rejects the 2nd of two CONCURRENT overlapping inserts with 23P01
//    (genuine two-connection race)
//   AssertionError: expected [ …(2) ] to have a length of 1 but got 2
//
//   - Expected
//   + Received
//
//   - 1
//   + 2
//
//    ❯ tests/availability/exclusion-race.test.ts:91:63
//        89|
//        90|       // Exactly one insert wins; the other loses the race and is DB-r…
//        91|       expect(results.filter((r) => r.status === "fulfilled")).toHaveLe…
//          |                                                               ^
//        92|       const rejected = results.find((r) => r.status === "rejected") as…
//        93|       expect(rejected).toBeDefined();
//
//   ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯
//
//    FAIL  tests/availability/exclusion-race.test.ts > booking_no_overlap EXCLUDE constraint (SC#4 —
//    the double-booking guarantee) > allows different units in the same window; rejects a 3rd
//    overlapping insert on a taken unit
//   AssertionError: expected undefined to be defined
//    ❯ expect23P01 tests/availability/exclusion-race.test.ts:57:18
//        55|     caught = e;
//        56|   }
//        57|   expect(caught).toBeDefined();
//          |                  ^
//        58|   expect(isPgError(caught, "23P01")).toBe(true);
//        59| }
//    ❯ tests/availability/exclusion-race.test.ts:115:5
//
//   ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯
//
//    FAIL  tests/availability/exclusion-race.test.ts > booking_no_overlap EXCLUDE constraint (SC#4 —
//    the double-booking guarantee) > allows back-to-back hours ('[)' half-open) but rejects a genuine
//    partial overlap
//   AssertionError: expected undefined to be defined
//    ❯ expect23P01 tests/availability/exclusion-race.test.ts:57:18
//        55|     caught = e;
//        56|   }
//        57|   expect(caught).toBeDefined();
//          |                  ^
//        58|   expect(isPgError(caught, "23P01")).toBe(true);
//        59| }
//    ❯ tests/availability/exclusion-race.test.ts:125:5
//
//   ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯
//
//    Test Files  1 failed (1)
//         Tests  3 failed | 1 passed (4)
//
// ─── READING THAT OUTPUT PRECISELY ───
//
// • `expected [ …(2) ] to have a length of 1 but got 2` IS the (N+1)th booking succeeding. Two
//   independent connections inserted the SAME (listing, unit, [02:00,03:00)) window and BOTH were
//   fulfilled. That is a real double-book: one court, one hour, two paying bookers.
// • The row-count assertion at `:103` as-run (now `:279`, `expect(n).toBe(1)`) was NOT reached and does NOT appear
//   above — Vitest aborts a test at its first failing `expect`, so `:91` shadows it. The plan
//   predicted that assertion would receive 2; it never ran. Recorded as observed, not as predicted.
// • NEITHER conflict code was seen, and that is the point. `CONFLICT_CODES = ["23P01", "40P01"]`
//   (this file, `:44-45` as-run; now `:220-221`) is the accepted set — `23P01` exclusion_violation when the winner
//   committed first, `40P01` deadlock_detected when both backends inserted then blocked. With the
//   constraint gone there is no loser to carry either code: `expect(caught).toBeDefined()` receives
//   `undefined` because the insert that should have been rejected simply succeeded. Quote both codes,
//   not just `23P01` — a record naming only `23P01` misreads what this file accepts.
//
// ─── WHAT DID *NOT* FAIL — proof this is a targeted mutation, not one that breaks everything ───
//
// The same mutation, same container, run across the whole directory
// (`npx vitest run tests/availability/`, exit 1):
//
//    Test Files  2 failed | 17 passed (19)
//         Tests  5 failed | 165 passed (170)
//
// 17 of 19 files were completely unaffected — including `open-capacity-race.test.ts`, whose arbiter is
// the advisory-lock admissions counter rather than the EXCLUDE, and every slot/pricing/horizon spec in
// the directory. The 5 failures were the 3 above plus exactly 2 in `open-capacity-exclude.test.ts`:
// its exclusive-overlap behaviour case (`:132`) and — the positive control for the work done in this
// plan — the standing catalog guard (`:180`), which reported:
//
//   AssertionError: booking_no_overlap is MISSING from schema "test_7824_10_0" (got 0 catalog rows,
//   expected exactly 1). The double-booking guarantee (SC#4) is NOT in force in this test schema —
//   every overlap assertion in tests/availability/** is meaningless until this is restored.
//
// So the standing guard is not a walker that reads nothing: it has been watched going red on a
// genuinely unconstrained schema, and it names both the constraint and the schema when it does.
//
// ─── RESTORATION, VERIFIED ───
//
// The constraint definition was captured FROM THE CATALOG BEFORE anything was dropped — never retyped
// from the migration — and that captured string was the restore script:
//
//   EXCLUDE USING gist (listing_id WITH =, unit WITH =, tstzrange(starts_at, ends_at, '[)'::text)
//   WITH &&) WHERE (((status <> ALL (ARRAY['cancelled'::booking_status, 'declined'::booking_status,
//   'completed'::booking_status])) AND (open_capacity = false)))
//
// After restoration the catalog was re-read and compared with `cmp` against the captured file:
// BYTE-EQUAL: YES (251 bytes). The developer database and the real `fitout_test` were never targets
// of any DDL in this exercise; the probe container was removed. `drizzle/` was not touched — it stays
// at 0025 (GATE-06), and no migration file was written.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

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
