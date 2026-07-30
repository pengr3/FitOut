// Phase 9 / OPEN-03 (D-123, RESEARCH Pitfall 1) — the DDL proof for drizzle/0022's NARROW.
//
// This file proves ONE fact about the shipped constraint: rows carrying `booking.open_capacity = true`
// are REMOVED from `booking_no_overlap`, while exclusive rows are still arbitrated by it exactly as
// before. It goes RED if 0022 stops applying in EITHER direction:
//   - an UN-NARROWED predicate breaks case 1 (the 2nd same-date drop-in booking is rejected 23P01 as a
//     double-book — that IS Pitfall 1, and it is a functional break `exclusion-race.test.ts` can never
//     catch because its whole fixture is exclusive);
//   - an OVER-WIDE narrow breaks case 2 (the SC#4 double-booking keystone would stop rejecting an
//     overlapping exclusive booking — threat T-09-01).
//
// Modelled on `tests/availability/exclusion-race.test.ts`: raw postgres.js INSERTs (never Drizzle) so the
// driver error, with its SQLSTATE on `.code`, reaches the test. The arbiter for open rows is NOT here —
// it is the advisory-lock admissions counter, proven in `open-capacity-race.test.ts`.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { isPgError } from "@/lib/pg";
import { user, listing } from "@/lib/db/schema";
import type postgres from "postgres";

let testDb: TestDb;

const LISTING = "listing_open_excl";
const HOST = "host_open_excl";
const BOOKER = "booker_open_excl";

// Raw INSERT via a given postgres.js client (search_path already bound to the isolated schema), extended
// to carry the `open_capacity` column drizzle/0022's predicate keys on. `declared_pax` is always set
// because every open row carries the heads it claimed (the counter sums that column) — schema.ts
// booking.declaredPax.
const ins = (
  c: postgres.Sql,
  id: string,
  unit: number,
  start: string,
  end: string,
  openCapacity: boolean,
  status = "confirmed",
) => c`
  INSERT INTO booking (id, listing_id, unit, booker_id, starts_at, ends_at, status, open_capacity, declared_pax)
  VALUES (${id}, ${LISTING}, ${unit}, ${BOOKER}, ${start}, ${end}, ${status}, ${openCapacity}, 1)`;

// Assert a promise rejects specifically with the exclusion-violation SQLSTATE (23P01), never a message
// string (locale-fragile). These overlap cases are SEQUENTIAL — the prior row is already committed — so
// the outcome is always exclusion_violation, never a deadlock. Uses isPgError (src/lib/pg.ts).
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
    {
      id: HOST,
      name: "Open Host",
      email: "host_open_excl@example.com",
      firstName: "Open",
      emailVerified: true,
    },
    {
      id: BOOKER,
      name: "Open Booker",
      email: "booker_open_excl@example.com",
      firstName: "Open",
      emailVerified: true,
    },
  ]);
  // A drop-in listing's shape (09-06 publish gate): single unit, a per-head price, a real cap. None of it
  // is read by the constraint — the EXCLUDE keys on (listing, unit, range) + the row's own flag — but the
  // fixture stays honest to what an open listing actually looks like.
  await testDb.db.insert(listing).values({
    id: LISTING,
    hostId: HOST,
    title: "Drop-in floor",
    status: "published",
    maxOccupancy: 20,
    unitCount: 1,
    perHeadPriceCents: 35000,
  });
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

// Every case owns its OWN date so a committed row from one case can never pre-fill (or pre-block) another.
describe("booking_no_overlap after the 0022 narrow (OPEN-03 — drop-in rows are not double-books)", () => {
  it("admits many open bookings on the same date, same unit, identical window", async () => {
    // The OC-03 whole-day envelope: every drop-in pass on a date carries unit 1 and the IDENTICAL
    // [opening, closing) window, so before `AND open_capacity = false` joined the predicate the SECOND
    // row here raised 23P01 — an open listing would have accepted exactly one booking per date and then
    // reported "just taken". That is Pitfall 1, and this case is the only place it is caught.
    await ins(testDb.client, "bk_open_1", 1, "2026-09-01T22:00:00Z", "2026-09-02T14:00:00Z", true);
    await ins(testDb.client, "bk_open_2", 1, "2026-09-01T22:00:00Z", "2026-09-02T14:00:00Z", true);
    await ins(testDb.client, "bk_open_3", 1, "2026-09-01T22:00:00Z", "2026-09-02T14:00:00Z", true);

    const [{ n }] = await testDb.client`
      SELECT count(*)::int AS n FROM booking
      WHERE listing_id = ${LISTING} AND starts_at = '2026-09-01T22:00:00Z'`;
    expect(n).toBe(3);
  });

  it("still rejects the second EXCLUSIVE overlapping booking on the same unit (the keystone is untouched)", async () => {
    // SC#4 is not weakened by Phase 9: an exclusive row is still arbitrated by the EXCLUDE. If the narrow
    // were written too wide (e.g. dropping the predicate entirely, or keying on the window instead of the
    // flag) this case goes RED — threat T-09-01.
    await ins(testDb.client, "bk_excl_1", 1, "2026-09-03T02:00:00Z", "2026-09-03T03:00:00Z", false);
    await expect23P01(
      ins(testDb.client, "bk_excl_2", 1, "2026-09-03T02:00:00Z", "2026-09-03T03:00:00Z", false),
    );
  });

  it("an open row does not block an exclusive row and vice versa", async () => {
    // In production a listing is exactly ONE occupancy mode, so this combination never occurs on real data.
    // The case exists to pin that the narrow keys on the ROW's own `open_capacity` value and not on some
    // incidental property of the window (identical ranges here still collide for two exclusive rows — see
    // the case above).
    await ins(testDb.client, "bk_mix_open", 1, "2026-09-04T02:00:00Z", "2026-09-04T03:00:00Z", true);
    await ins(testDb.client, "bk_mix_excl", 1, "2026-09-04T02:00:00Z", "2026-09-04T03:00:00Z", false);
    // …and in the other order: an already-committed exclusive row does not keep an `open_capacity = true`
    // row out either, because that row is never entered into the GiST index at all.
    await ins(testDb.client, "bk_mix_excl2", 1, "2026-09-05T02:00:00Z", "2026-09-05T03:00:00Z", false);
    await ins(testDb.client, "bk_mix_open2", 1, "2026-09-05T02:00:00Z", "2026-09-05T03:00:00Z", true);

    const [{ n }] = await testDb.client`
      SELECT count(*)::int AS n FROM booking
      WHERE id IN ('bk_mix_open', 'bk_mix_excl', 'bk_mix_excl2', 'bk_mix_open2')`;
    expect(n).toBe(4);
  });

  it("the live constraint definition carries the narrow", async () => {
    // Read the constraint back out of the ISOLATED schema's catalog (the dev `public` schema carries a
    // same-named constraint, so the namespace scope is load-bearing, not decoration). Behavior above is
    // the real proof; this pins the TEXT so a future migration that re-ADDs the constraint without the
    // narrow — or without the unchanged free-status complement — cannot land silently.
    const [{ def }] = (await testDb.client`
      SELECT pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE c.conname = 'booking_no_overlap' AND n.nspname = ${testDb.schema}`) as unknown as {
      def: string;
    }[];
    expect(def).toContain("open_capacity = false");
    expect(def).toContain("'cancelled'"); // the occupying complement set is unchanged
  });
});
