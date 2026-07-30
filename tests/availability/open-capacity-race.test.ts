// OPEN-03 / SC#3 — the Phase-9 acceptance gate (D-123): concurrent drop-in claims can NEVER commit more
// heads than the listing's cap. This is the Phase-3 SC#4 analog for a SHARED slot, and it is proven the
// same way: a GENUINE multi-connection race via `makeRacingClients`, NEVER a single shared max:1 client
// (which serializes and proves nothing — 09-RESEARCH Pitfall 1).
//
// THE CRITICAL DIVERGENCE FROM exclusion-race.test.ts: the EXCLUDE constraint is atomic at STATEMENT
// level, so that test fires single autocommit INSERTs. An open-capacity claim is a SUM-of-heads cap, which
// no exclusion constraint can express (drizzle/0022 removes open rows from booking_no_overlap entirely).
// It is atomic only across `advisory lock → SUM(declared_pax) → conditional INSERT`, so each racer here
// runs a FULL TRANSACTION. A raw single INSERT would pass even against a broken (unlocked) claim — the
// lock window would never actually be raced. The guarantee is PROCEDURAL: it holds only while the shipped
// claim really takes the lock before it counts.
//
// ⚠️ THE RACERS' IDENTITY IS THE SUBTLE HALF, NOT THE CONNECTIONS. `createOpenCapacityHold` carries a D-42
// own-hold pre-check keyed on (booker_id, listing_id, starts_at). If every racer shared ONE bookerId, the
// losers would MATCH the winner's hold and return { ok: true, replayed: true } — the cap would never be
// contested and this file would be green while proving nothing (the Phase-8 name-only-identity lesson,
// restated for a different de-dup predicate). So every racer gets its OWN seeded `user` row and its own
// distinct bookerId, with idempotencyKey: null. Case 6 is the deliberate inverse: the SAME booker twice,
// which MUST replay (threat T-09-08).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THIS FILE HAS TWO LAYERS AND THEREFORE TWO SEPARATE MUTATIONS, each against its OWN file and line.
// Run BOTH — neither substitutes for the other. (Phase 8 measured what happens when only one exists:
// deleting the PRODUCTION lock left the race file GREEN 2/2, all of tests/group/ GREEN and the full
// 792-test suite GREEN while shipping an over-cap bug, because the only proof INLINED the SQL.)
//
//   LAYER 1 — the PATTERN proof (`raceInlinedClaim`, cases 1-2). The critical section is INLINED inside
//     each racer's transaction precisely so the advisory lock ITSELF is the thing under test — the same
//     discipline as exclusion-race.test.ts testing the EXCLUDE directly. These cases never touch
//     production code, by design.
//     ▶ MUTATION 1: delete the `SELECT pg_advisory_xact_lock(...)` statement from `raceInlinedClaim`
//       IN THIS FILE (marked at its call site below) → cases 1-2 go RED with a committed SUM over the
//       cap → restore → GREEN.
//
//   LAYER 2 — the SHIPPED proof (`realClaim`, cases 3-6). Layer 1 proves the *pattern* is race-free; it
//     does NOT prove the *shipped* claim still carries the lock, because it never imports
//     createOpenCapacityHold. So cases 3-6 drive the REAL claim from @/lib/availability/units, with one
//     `drizzle(client)` over one INDEPENDENT connection PER RACER (a shared max:1 `testDb.db` would
//     serialize the lock window and prove nothing — RESEARCH Pitfall 1, the whole reason
//     `makeRacingClients` exists).
//     ▶ MUTATION 2: delete the `await tx.execute(sql\`SELECT pg_advisory_xact_lock(...)\`)` line from
//       createOpenCapacityHold in src/lib/availability/units.ts (the PRODUCTION file) → cases 3-4 go RED
//       with a committed SUM over the cap → restore → GREEN, then confirm
//       `git diff --exit-code src/lib/availability/units.ts` exits 0.
//
// Every case asserts the COMMITTED rows FIRST, read back through `testDb.client` (an INDEPENDENT
// connection), so a mutation's failure message names the DATABASE TRUTH — a committed SUM over the cap —
// and not a returned-value proxy.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { user, listing } from "@/lib/db/schema";
import { createOpenCapacityHold, type OpenHoldResult } from "@/lib/availability/units";
import { SOLD_OUT_MESSAGE } from "@/lib/availability/open-capacity";
import { computeServiceFee } from "@/lib/payments/service-fee";

let testDb: TestDb;

const HOST = "host_open_race";
const PER_HEAD_CENTS = 35000;

// One DISTINCT booker per racer (see the identity warning in the header). Ten is enough for every case;
// a case never shares a booker id with another racer inside the same case.
const BOOKERS = Array.from({ length: 10 }, (_, i) => `booker_open_race_${i + 1}`);

// A separate listing per case, so one case's committed heads can never pre-fill the cap another case
// races for (the seat-claim-race.test.ts fixture-isolation rule). The cap differs per case anyway.
const L_PATTERN_CAP3 = "listing_open_race_p3"; // case 1 — Layer 1, cap 3
const L_PATTERN_CAP5 = "listing_open_race_p5"; // case 2 — Layer 1, cap 5
const L_REAL_CAP3 = "listing_open_race_r3"; // case 3 — Layer 2, cap 3 (the SC#3 gate)
const L_REAL_CAP5 = "listing_open_race_r5"; // case 4 — Layer 2, cap 5 (OC-07 partial fill)
const L_RELEASE_CAP1 = "listing_open_race_rel"; // case 5 — Layer 2, cap 1 (OC-15 release)
const L_REPLAY_CAP5 = "listing_open_race_rep"; // case 6 — Layer 2, cap 5 (D-42 replay)

// The OC-03 whole-day envelope, anchored ~30 days out and computed from the CLOCK rather than written as
// a calendar literal on purpose: the shipped claim refuses a date whose pass window has already closed and
// one beyond the 90-day booking horizon, so a hardcoded 2026 date would quietly turn every claim in this
// file into a PAST_DATE refusal the moment the calendar passed it — the gate would go green-by-vacuum.
const anchor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const DAY_OPEN = new Date(
  Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate(), 22, 0, 0),
); // 6:00 AM Manila
const DAY_CLOSE = new Date(DAY_OPEN.getTime() + 16 * 60 * 60 * 1000); // 10:00 PM Manila
const DAY_OPEN_ISO = DAY_OPEN.toISOString();
const DAY_CLOSE_ISO = DAY_CLOSE.toISOString();

/**
 * The committed head count for one (listing, date), read through an INDEPENDENT connection and over the
 * OCCUPYING set — confirmed, or pending and not yet lapsed. Deliberately re-typed here instead of importing
 * `openTakenSql`: the assertion must not inherit a bug from the very fragment the claim under test uses.
 * This is the DATABASE TRUTH every case asserts first.
 */
async function committedHeads(listingId: string): Promise<number> {
  const [{ heads }] = (await testDb.client`
    SELECT COALESCE(SUM(b.declared_pax), 0)::int AS heads
    FROM booking b
    WHERE b.listing_id = ${listingId}
      AND b.open_capacity = true
      AND b.starts_at = ${DAY_OPEN_ISO}::timestamptz
      AND (b.status = 'confirmed' OR (b.status = 'pending' AND b.expires_at > now()))`) as unknown as {
    heads: number;
  }[];
  return heads;
}

// LAYER 1 — one admissions claim, INLINED into a single racer's transaction. Each racer opens its own
// independent connection (makeRacingClients), so `client.begin` genuinely races the lock window. The
// advisory lock is the atomic authority; the app never adjudicates a cap it read outside the lock. This
// helper is the PATTERN proof and is deliberately independent of production code.
function raceInlinedClaim(
  client: TestDb["client"],
  listingId: string,
  cap: number,
  heads: number,
  bookerId: string,
) {
  return client.begin(async (sql) => {
    // (1) TAKE THE LOCK — transaction-scoped, keyed on (listing, dayOpen) so only same-date claimers
    //     contend, and released on COMMIT *and* ROLLBACK. ← MUTATION 1 TARGET: delete the next statement
    //     (in THIS file) to mutation-verify the pattern proof, then restore. This is NOT the production
    //     lock — that is MUTATION 2, in src/lib/availability/units.ts, covered by cases 3-6 below.
    await sql`SELECT pg_advisory_xact_lock(
      hashtextextended(${listingId}::text || ':' || ${DAY_OPEN_ISO}::text, 0))`;
    // (2) SUM the occupied heads UNDER the lock — drift-free, no stored counter (Pitfall 3).
    const [{ taken }] = (await sql`
      SELECT COALESCE(SUM(b.declared_pax), 0)::int AS taken
      FROM booking b
      WHERE b.listing_id = ${listingId}
        AND b.open_capacity = true
        AND b.starts_at = ${DAY_OPEN_ISO}::timestamptz
        AND (b.status = 'confirmed' OR (b.status = 'pending' AND b.expires_at > now()))`) as unknown as {
      taken: number;
    }[];
    // (3) grant min(requested, remaining); a claim with nothing left loses the race calmly.
    const remaining = cap - taken;
    if (remaining <= 0) return { claimed: false as const, granted: 0 };
    const granted = Math.min(heads, remaining);
    const id = randomUUID();
    await sql`
      INSERT INTO booking (id, listing_id, unit, booker_id, starts_at, ends_at, status,
                           open_capacity, declared_pax, expires_at)
      VALUES (${id}, ${listingId}, 1, ${bookerId}, ${DAY_OPEN_ISO}, ${DAY_CLOSE_ISO}, 'pending',
              true, ${granted}, ${DAY_CLOSE_ISO})`;
    return { claimed: true as const, granted, id };
  });
}

// LAYER 2 — the SHIPPED claim. One racer = one INDEPENDENT postgres.js connection, wrapped in its OWN
// `drizzle(...)` so it satisfies createOpenCapacityHold's `DbConn` first parameter. Sharing `testDb.db`
// (max: 1) across racers would serialize the lock window and prove nothing.
function realClaim(
  client: TestDb["client"],
  listingId: string,
  bookerId: string,
  heads: number,
): Promise<OpenHoldResult> {
  return createOpenCapacityHold(drizzle(client), {
    listingId,
    bookerId,
    dayOpenUtc: DAY_OPEN,
    dayCloseUtc: DAY_CLOSE,
    requestedHeads: heads,
    // NULL on purpose: the idempotency TOKEN must not be what separates the racers. Identity does
    // (distinct bookerIds) — see the header. A shared token would make every loser a replay.
    idempotencyKey: null,
  });
}

const isOk = (r: OpenHoldResult): r is Extract<OpenHoldResult, { ok: true }> => "ok" in r;

beforeAll(async () => {
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    {
      id: HOST,
      name: "Race Host",
      email: "host_open_race@example.com",
      firstName: "Race",
      emailVerified: true,
    },
    ...BOOKERS.map((id, i) => ({
      id,
      name: `Race Booker ${i + 1}`,
      email: `${id}@example.com`,
      firstName: "Race",
      emailVerified: true,
    })),
  ]);
  // Every fixture listing is shaped like a published drop-in listing (09-06 publish gate): unitCount 1,
  // a per-head price, an explicit cancellation tier the claim snapshots (D-67), and the case's own cap.
  // maxOccupancy IS the cap the claim reads INSIDE its transaction — a client number can only request less.
  const openListing = (id: string, cap: number) => ({
    id,
    hostId: HOST,
    title: "Drop-in floor",
    status: "published" as const,
    occupancyMode: "open_capacity" as const,
    bookingMode: "instant" as const, // OC-10 — open capacity is instant-only
    cancellationPolicy: "standard" as const,
    maxOccupancy: cap,
    unitCount: 1,
    perHeadPriceCents: PER_HEAD_CENTS,
  });
  await testDb.db
    .insert(listing)
    .values([
      openListing(L_PATTERN_CAP3, 3),
      openListing(L_PATTERN_CAP5, 5),
      openListing(L_REAL_CAP3, 3),
      openListing(L_REAL_CAP5, 5),
      openListing(L_RELEASE_CAP1, 1),
      openListing(L_REPLAY_CAP5, 5),
    ]);
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("open-capacity admissions claim (OPEN-03 / SC#3 — the D-123 acceptance gate)", () => {
  // ── LAYER 1: the pattern. MUTATION 1 targets the inlined lock in raceInlinedClaim, above. ──────────
  it("caps 4 concurrent inlined single-head claims at cap 3 — exactly THREE heads commit", async () => {
    const clients = makeRacingClients(testDb.schema, 4); // 4 INDEPENDENT connections, one schema
    try {
      const results = await Promise.allSettled(
        clients.map((client, i) => raceInlinedClaim(client, L_PATTERN_CAP3, 3, 1, BOOKERS[i])),
      );

      // The load-bearing assertion FIRST: the COMMITTED head SUM. Without the advisory lock two racers
      // both read taken=0 and both insert → the SUM exceeds 3 and this goes RED (MUTATION 1).
      expect(await committedHeads(L_PATTERN_CAP3)).toBe(3);

      // Every racer's transaction resolves — a loser commits without inserting (a calm "just sold out"),
      // never a crash. Exactly one of the four found nothing left.
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
      const refused = results.filter((r) => r.status === "fulfilled" && r.value.claimed === false);
      expect(refused).toHaveLength(1);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  it("never overshoots cap 5 with 3 concurrent inlined MULTI-head claims", async () => {
    // 3 × 2 heads against a cap of 5: the boundary racer must be cut to exactly `remaining` (1), never
    // allowed to round up to its request. Unlocked, two racers read taken=0 and the SUM lands at 6.
    const clients = makeRacingClients(testDb.schema, 3);
    try {
      const results = await Promise.allSettled(
        clients.map((client, i) => raceInlinedClaim(client, L_PATTERN_CAP5, 5, 2, BOOKERS[i])),
      );

      expect(await committedHeads(L_PATTERN_CAP5)).toBeLessThanOrEqual(5);
      expect(await committedHeads(L_PATTERN_CAP5)).toBe(5);
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  // ── LAYER 2: the SHIPPED claim. These cases are the ONLY thing standing between a one-line deletion
  //    in src/lib/availability/units.ts and a fully green suite. MUTATION 2 targets that line.
  it("caps 4 concurrent REAL claims at cap 3 — the SHIPPED lock is the authority (SC#3)", async () => {
    const clients = makeRacingClients(testDb.schema, 4); // 4 INDEPENDENT connections, one schema
    try {
      const results = await Promise.allSettled(
        // Four DISTINCT bookers: with one shared booker the D-42 own-hold pre-check would hand three
        // losers a replay of the winner's hold and the cap would never be contested.
        clients.map((client, i) => realClaim(client, L_REAL_CAP3, BOOKERS[i], 1)),
      );

      // (1) DATABASE TRUTH FIRST — committed heads on this (listing, date). Delete the
      //     pg_advisory_xact_lock line from createOpenCapacityHold and every racer reads taken=0, all
      //     four insert, and this reads 4. That is MUTATION 2, and it is asserted ahead of the returned
      //     values so the failure message names the over-cap SUM, not a proxy.
      const [{ heads }] = (await testDb.client`
        SELECT COALESCE(SUM(b.declared_pax), 0)::int AS heads
        FROM booking b
        WHERE b.listing_id = ${L_REAL_CAP3}
          AND b.open_capacity = true
          AND b.starts_at = ${DAY_OPEN_ISO}::timestamptz
          AND b.status = 'pending'`) as unknown as { heads: number }[];
      expect(heads).toBe(3);

      // (2) No racer throws: the loser resolves to the calm OC-13 sold-out copy, never a rejected promise.
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
      const values = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      const winners = values.filter(isOk);
      const losers = values.filter((v) => !isOk(v));
      expect(winners).toHaveLength(3);
      expect(losers).toHaveLength(1);
      expect(losers[0]).toMatchObject({ error: SOLD_OUT_MESSAGE, soldOut: true });

      // (3) Each winner took exactly the one head it asked for, and none of them was a replay.
      expect(winners.every((w) => w.granted === 1)).toBe(true);
      expect(winners.every((w) => w.replayed === false)).toBe(true);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  it("fills the last spot partially instead of overshooting cap 5 — REAL claim, OC-07", async () => {
    const clients = makeRacingClients(testDb.schema, 3);
    try {
      const results = await Promise.allSettled(
        clients.map((client, i) => realClaim(client, L_REAL_CAP5, BOOKERS[i + 4], 2)),
      );

      // (1) DATABASE TRUTH FIRST: 5, never 6. Two racers take 2 each; whoever arrives last finds 1 left.
      expect(await committedHeads(L_REAL_CAP5)).toBe(5);

      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
      const values = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      const winners = values.filter(isOk);
      expect(winners).toHaveLength(3);

      // (2) The boundary racer was granted exactly `remaining` and REPORTED it — a partial fill is always
      //     visible to the caller (granted < requested), never a silent reduction, and it is NOT a
      //     sold-out refusal: there was still one spot to sell.
      expect(winners.map((w) => w.granted).sort()).toEqual([1, 2, 2]);
      expect(winners.every((w) => w.requested === 2)).toBe(true);
      const boundary = winners.find((w) => w.granted < w.requested);
      expect(boundary).toBeDefined();
      expect(values.some((v) => !isOk(v))).toBe(false);

      // (3) The money was frozen for the GRANTED heads, never the requested ones (OC-07 / O6): the
      //     boundary booker is charged for 1 head, not the 2 they asked for. Read straight off the rows.
      const rows = (await testDb.client`
        SELECT declared_pax, space_price_cents, quoted_total_cents
        FROM booking
        WHERE listing_id = ${L_REAL_CAP5} AND open_capacity = true
        ORDER BY declared_pax ASC`) as unknown as {
        declared_pax: number;
        space_price_cents: number;
        quoted_total_cents: number;
      }[];
      expect(rows).toHaveLength(3);
      for (const row of rows) {
        expect(row.space_price_cents).toBe(PER_HEAD_CENTS * row.declared_pax);
        expect(row.quoted_total_cents).toBe(
          computeServiceFee(PER_HEAD_CENTS * row.declared_pax).allInCents,
        );
      }
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  it("frees the head when the occupying booking is cancelled — REAL claim, OC-15", async () => {
    // There is NO release code anywhere, and that is the point (Pitfall 3): `remaining` is a LIVE SUM over
    // the occupying set, so a cancelled row simply leaves the set and its head is sellable again. A stored
    // spots_left counter would need an explicit decrement here — and would drift the first time one was missed.
    const first = await realClaim(testDb.client, L_RELEASE_CAP1, BOOKERS[7], 1);
    expect(isOk(first)).toBe(true);
    expect(await committedHeads(L_RELEASE_CAP1)).toBe(1);

    // A different booker, same date: the single head is taken, so this is a genuine sold-out refusal
    // (not a D-42 replay — the identity differs).
    const second = await realClaim(testDb.client, L_RELEASE_CAP1, BOOKERS[8], 1);
    expect(second).toMatchObject({ error: SOLD_OUT_MESSAGE, soldOut: true });

    const firstId = isOk(first) ? first.id : "";
    await testDb.client`UPDATE booking SET status = 'cancelled' WHERE id = ${firstId}`;

    // A third booker now succeeds — the freed head was re-sold with no release path involved.
    const third = await realClaim(testDb.client, L_RELEASE_CAP1, BOOKERS[9], 1);
    expect(isOk(third)).toBe(true);
    expect(await committedHeads(L_RELEASE_CAP1)).toBe(1); // the cancelled row no longer occupies
  });

  it("replays the SAME booking for a repeat claim by the same booker — REAL claim, D-42 / T-09-08", async () => {
    // The inverse of the identity rule in the header: when the identity is genuinely the same (a
    // double-submit), the claim MUST hand back the original hold instead of claiming a second set of heads.
    const first = await realClaim(testDb.client, L_REPLAY_CAP5, BOOKERS[0], 2);
    const second = await realClaim(testDb.client, L_REPLAY_CAP5, BOOKERS[0], 2);

    // DATABASE TRUTH FIRST: 2 heads, not 4 — the double-submit claimed nothing extra.
    expect(await committedHeads(L_REPLAY_CAP5)).toBe(2);

    expect(isOk(first)).toBe(true);
    expect(isOk(second)).toBe(true);
    if (!isOk(first) || !isOk(second)) return;
    expect(second.id).toBe(first.id);
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.granted).toBe(2);
    // The replay hands back exactly what the original insert FROZE, never a fresh recompute (D-49).
    expect(second.quotedTotalCents).toBe(first.quotedTotalCents);
  });
});
