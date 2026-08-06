// createPendingHold — the WR-03 two-phase booking keystone (BOOK-02/03, D-42/D-47/D-48).
//
// Mirrors tests/availability/exclusion-race.test.ts: correctness rests ENTIRELY on the
// booking_no_overlap GiST EXCLUDE constraint, and a GENUINE race needs INDEPENDENT connections
// (makeRacingClients — a shared max:1 client serializes and proves nothing). Each racer wraps its own
// connection in its own drizzle() so createPendingHold opens a real transaction per connection.
//
// The four load-bearing proofs:
//   concurrent  — two overlapping holds on a 1-unit listing → exactly ONE wins; the loser maps to a
//                 clean "just taken" (23P01/40P01), never a raw 500. Exactly one row survives.
//   idempotency — a repeat submit (own-hold pre-check) AND two concurrent same-key submits (23505/23P01
//                 backstop) both return the SAME booking id, never a false "just taken" (the D-42 trap).
//   savepoint   — on a 2-unit listing two racers collide on unit 1; the loser's 23P01 rolls back only
//                 that attempt (SAVEPOINT) and it retries unit 2 within the SAME outer tx — both WIN on
//                 distinct units, and no 25P02 ("current transaction is aborted") ever leaks as a reject.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// MUTATION, EXECUTED 2026-08-06 (quick task 260806-gwt, TIER1-01). The pinned window this file used to
// carry ("2026-09-01T02:00Z") became derived — and a conversion can hollow a file out as silently as a
// bad refactor, so it had to be PROVEN this file still asserts. The mutation targets what THIS file
// uniquely owns (the WR-03 hold transaction) on cases that run through the DERIVED window:
//
//   src/lib/availability/units.ts: neuter the D-42 own-hold idempotency lookup (findOwnActiveHold's
//   SELECT gated to `AND false`, so a caller's own live hold is never found and a repeat submit falls
//   through to a fresh insert that the EXCLUDE constraint rejects)
//     → "idempotency (own-hold)" RED: `AssertionError: expected false to be true // Object.is equality`
//       at `expect(isOk(second)).toBe(true)` (line 125) — the repeat submit came back as the FALSE
//       "just taken" the D-42 trap is named for.
//     → DIVERGENCE FROM PREDICTION (recorded, not smoothed over): the plan expected the own-hold case
//       ONLY. "idempotency (concurrent same key)" ALSO went RED, at `expect(values.every(isOk))
//       .toBe(true)` (line 149) — correct and informative: the 23505/23P01 backstop RE-READS through
//       the same lookup to resolve the loser to the winner's row, so both D-42 arms depend on it.
// Restored by EDITING THE LINE BACK; `git status --porcelain -- src/` clean before this file shipped.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { randomUUID } from "node:crypto";
import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { venueWindow, assertBookableWindow } from "../helpers/dates";
import { user, listing } from "@/lib/db/schema";
import { createPendingHold } from "@/lib/availability/units";

type HoldResult = Awaited<ReturnType<typeof createPendingHold>>;

let testDb: TestDb;

const HOST = "ph_host";
const BOOKER = "ph_booker";
const BOOKER2 = "ph_booker2";

// A DERIVED future window — never a calendar literal (DEF-IR9-01; see @tests/helpers/dates.ts for the
// full why). createPendingHold's D-96 lead-time guard is a SQL expression evaluated against POSTGRES's
// now(), NOT the JS clock, so a pinned window is refused the moment real time passes it. The literal
// that used to sit here ("2026-09-01T02:00Z") was one of the two Tier-1 sites fused to fire on the same
// day. Venue-local hour 10 IS 02:00Z in Asia/Manila, so this is the same window it always was.
// No `weekday` is passed: this file seeds no operating_hours, and createPendingHold does not consult
// them on the write path — pinning a weekday here would be pure noise.
// createPendingHold works on absolute UTC instants, so the venue tz is irrelevant to the transaction
// logic (window/operating-hours validity is re-derived at the action layer, next plan).
const W = venueWindow({ hour: 10, minDaysOut: 3 });
const START = W.startUtc;
const END = W.endUtc;
const HOURLY = 5000; // ₱50.00/hr
const DAY = 30000; // ₱300.00/day

async function makeListing(id: string, unitCount: number): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId: HOST,
    title: `Listing ${id}`,
    status: "published",
    unitCount,
    timezone: "Asia/Manila",
    hourlyRateCents: HOURLY,
    dayRateCents: DAY,
  });
}

// Collapse a settled race into its resolved HoldResult values (createPendingHold never throws for a DB
// conflict — it maps internally — so any REJECT here is a genuine failure, e.g. a leaked 25P02).
function resolved(results: PromiseSettledResult<HoldResult>[]): HoldResult[] {
  const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (rejected.length > 0) {
    // Surface the raw reason — a reject here means createPendingHold let a DB error escape mapping.
    const why = rejected
      .map((r) => `${(r.reason as { code?: string })?.code ?? ""} ${(r.reason as Error)?.message ?? String(r.reason)}`)
      .join(" | ");
    throw new Error(`createPendingHold rejected (expected a mapped result): ${why}`);
  }
  return results.map((r) => (r as PromiseFulfilledResult<HoldResult>).value);
}

const isOk = (v: HoldResult): v is Extract<HoldResult, { ok: true }> => "ok" in v && v.ok === true;

beforeAll(async () => {
  assertBookableWindow(W); // assert the derivation, don't assume it — a loud setup failure, not a
  // confusing "just taken" three cases later.
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: HOST, name: "PH Host", email: "ph_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "PH Booker", email: "ph_booker@example.com", firstName: "Booker", emailVerified: true },
    { id: BOOKER2, name: "PH Booker Two", email: "ph_booker2@example.com", firstName: "Booker2", emailVerified: true },
  ]);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("createPendingHold — WR-03 pending-hold transaction (BOOK-02/03)", () => {
  it("concurrent: exactly one overlapping hold wins; the loser maps to 'just taken' (never a 500)", async () => {
    await makeListing("L_conc", 1);
    const [a, b] = makeRacingClients(testDb.schema, 2); // two INDEPENDENT connections
    try {
      const values = resolved(
        await Promise.allSettled([
          createPendingHold(drizzle(a), { listingId: "L_conc", bookerId: BOOKER, startsAt: START, endsAt: END }),
          createPendingHold(drizzle(b), { listingId: "L_conc", bookerId: BOOKER2, startsAt: START, endsAt: END }),
        ]),
      );

      expect(values.filter(isOk)).toHaveLength(1); // exactly one winner
      const errs = values.filter((v) => "error" in v) as { error: string }[];
      expect(errs).toHaveLength(1);
      expect(errs[0].error).toMatch(/just taken/i); // the clean SC#4 copy, not a raw error

      // The double-book cannot exist: exactly one pending row for the window.
      const [{ n }] = await testDb.client`
        SELECT count(*)::int AS n FROM booking WHERE listing_id = 'L_conc' AND status = 'pending'`;
      expect(n).toBe(1);
    } finally {
      await a.end();
      await b.end();
    }
  });

  it("idempotency (own-hold): a repeat submit returns the SAME booking, never 'just taken' (D-42)", async () => {
    await makeListing("L_idem_seq", 1);
    const first = await createPendingHold(testDb.db, { listingId: "L_idem_seq", bookerId: BOOKER, startsAt: START, endsAt: END });
    const second = await createPendingHold(testDb.db, { listingId: "L_idem_seq", bookerId: BOOKER, startsAt: START, endsAt: END });

    expect(isOk(first)).toBe(true);
    expect(isOk(second)).toBe(true);
    if (isOk(first) && isOk(second)) {
      expect(second.id).toBe(first.id); // the SAME booking, not a new hold
      expect(second.replayed).toBe(true);
      expect(first.replayed).toBe(false);
    }
    const [{ n }] = await testDb.client`
      SELECT count(*)::int AS n FROM booking WHERE listing_id = 'L_idem_seq'`;
    expect(n).toBe(1); // exactly one row
  });

  it("idempotency (concurrent same key): both submits return the SAME booking, exactly one row (D-42 backstop)", async () => {
    await makeListing("L_idem_race", 1);
    const key = randomUUID();
    const [a, b] = makeRacingClients(testDb.schema, 2);
    try {
      const values = resolved(
        await Promise.allSettled([
          createPendingHold(drizzle(a), { listingId: "L_idem_race", bookerId: BOOKER, startsAt: START, endsAt: END, idempotencyKey: key }),
          createPendingHold(drizzle(b), { listingId: "L_idem_race", bookerId: BOOKER, startsAt: START, endsAt: END, idempotencyKey: key }),
        ]),
      );

      // NEITHER is "just taken"; BOTH ok with the SAME id (the D-42 conflation the constraint alone causes).
      expect(values.every(isOk)).toBe(true);
      const ids = new Set(values.map((v) => (isOk(v) ? v.id : "ERR")));
      expect(ids.size).toBe(1);

      const [{ n }] = await testDb.client`
        SELECT count(*)::int AS n FROM booking WHERE listing_id = 'L_idem_race'`;
      expect(n).toBe(1);
    } finally {
      await a.end();
      await b.end();
    }
  });

  it("savepoint: a 23P01 on unit 1 retries unit 2 within one outer tx — both win, no 25P02", async () => {
    await makeListing("L_sp", 2);
    const [a, b] = makeRacingClients(testDb.schema, 2);
    try {
      const values = resolved(
        await Promise.allSettled([
          createPendingHold(drizzle(a), { listingId: "L_sp", bookerId: BOOKER, startsAt: START, endsAt: END }),
          createPendingHold(drizzle(b), { listingId: "L_sp", bookerId: BOOKER2, startsAt: START, endsAt: END }),
        ]),
      );

      // Both collide on the lowest free unit (1); the loser's 23P01 rolls back to its SAVEPOINT and it
      // lands unit 2 within the SAME outer tx. If the savepoint were missing, the loser's re-probe would
      // hit 25P02 and reject — so "both fulfilled + both ok" is the proof no 25P02 leaked.
      expect(values.every(isOk)).toBe(true);
      const units = values.map((v) => (isOk(v) ? v.unit : -1)).sort();
      expect(units).toEqual([1, 2]); // multi-unit venues book in parallel; distinct units

      const [{ n }] = await testDb.client`
        SELECT count(*)::int AS n FROM booking WHERE listing_id = 'L_sp' AND status = 'pending'`;
      expect(n).toBe(2);
    } finally {
      await a.end();
      await b.end();
    }
  });
});
