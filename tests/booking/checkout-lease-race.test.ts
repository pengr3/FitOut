// T-08-79 (quick task 260801-kv2) — the CHECKOUT LEASE must admit exactly ONE concurrent checkout attempt
// per booking. This is the Phase-3 SC#4 / Phase-9 SC#3 analog for the money path, and it is proven the same
// way: a GENUINE multi-connection race via `makeRacingClients`, NEVER a single shared max:1 client (which
// serializes and proves nothing — RESEARCH Pitfall 1), and never a mock.
//
// WHAT IS BEING PROVEN. `confirmBooking`'s expire-before-create gate is READ-THEN-ACT: two CONCURRENT calls
// for one holdId both read a stale/NULL checkout_session_id, both skip the expire, and both mint an
// independently payable PayMongo session — and both can be paid. On the qrph rail an already-captured
// overcharge is not API-refundable, so the second capture costs an out-of-band operator refund. The
// compare-and-swap lease closes that: one atomic `UPDATE ... WHERE <lease is free> RETURNING` claims the
// booking BEFORE any PayMongo call, and the loser's claim matches zero rows.
//
// ⚠️ IDENTITY NOTE, AND IT IS THE INVERSE OF open-capacity-race.test.ts's WARNING. There, every racer needed
// its OWN bookerId or the de-dup pre-check would hand losers a replay and the cap would never be contested.
// HERE every racer deliberately SHARES one bookerId and one holdId — because THAT IS THE THREAT: one booker,
// one booking, two tabs (or one double-click). A reader who "fixes" this to distinct bookers has deleted the
// test: distinct bookers are refused by the owner term instead, and the lease itself would never be raced.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THIS FILE HAS TWO LAYERS AND THEREFORE TWO SEPARATE MUTATIONS, each against its OWN file. Run BOTH —
// neither substitutes for the other. (Phase 8 measured what happens when only one exists: deleting the
// PRODUCTION lock left the race file GREEN, all of tests/group/ GREEN and a 792-test suite GREEN while
// shipping an over-cap bug, because the only proof INLINED the SQL. seat-claim-race.test.ts:26-30.)
//
//   LAYER 1 — the PATTERN proof (`raceInlinedClaim`, cases 1-2). The CAS UPDATE is INLINED in this file and
//     fired in AUTOCOMMIT (a bare tagged template, never `client.begin`), one INDEPENDENT connection per
//     racer, precisely so the CAS predicate ITSELF is the thing under test. These cases never touch
//     production code, by design.
//     ▶ MUTATION 1: delete the `AND (checkout_lock_at IS NULL OR checkout_lock_at < ...)` predicate from the
//       inlined UPDATE IN THIS FILE (marked at its call site below) → cases 1-2 go RED (3 claimants) →
//       restore → GREEN.
//
//   LAYER 2 — the SHIPPED proof (cases 3-8), driving the REAL `claimCheckoutLease` /
//     `releaseCheckoutLease` from @/lib/payments/checkout-lease through `drizzle(client)` over one
//     INDEPENDENT connection per racer.
//     ▶ MUTATION 2, in src/lib/payments/checkout-lease.ts (the PRODUCTION file):
//         2a. delete the whole lease predicate → cases 3, 4, 5 go RED. (NOT case 7: with the
//             staleness/IS NULL term gone, case 7 is still refused by the UNTOUCHED owner term, so it stays
//             GREEN — its isolation is 2c. NOT case 6 either: the release round-trip does not depend on the
//             predicate.)
//         2b. restore, then delete ONLY the `checkout_lock_at < now() - make_interval(...)` half → case 4
//             goes RED (a stale lease is no longer re-claimable — the self-heal is gone).
//         2c. restore, then delete ONLY the `eq(booking.bookerId, bookerId)` term → case 7 goes RED.
//
// Mutations are reverted BY EDITING THE FILE BACK, never via git: checkout-lease.ts is brand new and
// UNTRACKED, so `git diff --exit-code` on it is vacuous — and `git add -N` does not fix that. It pins an
// EMPTY index baseline (the gate then fails on ANY content, including a correct restore) and it turns
// `git checkout -- <file>` into a 0-byte TRUNCATION. Both verified empirically. The restore evidence is the
// verbatim log below plus this file's eight cases passing.
//
// ALL FOUR MUTATIONS WERE EXECUTED 2026-08-01. A mutation that is described but never run is a comment;
// these are the OBSERVED failures, verbatim, with the observed red SET named alongside each:
//   MUTATION 1 (inlined CAS predicate deleted, THIS file) — Tests 2 failed | 6 passed (8)
//     (1) AssertionError: expected 3 to be 1 // Object.is equality      [claimants, free lease]
//     (2) AssertionError: expected 3 to be 1 // Object.is equality      [claimants, stale lease]
//     RED SET {1,2} — as predicted.
//   MUTATION 2a (whole lease predicate deleted, src/lib/payments/checkout-lease.ts) — 3 failed | 5 passed
//     (3) AssertionError: expected 3 to be 1 // Object.is equality      [winners, free lease]
//     (4) AssertionError: expected 3 to be 1 // Object.is equality      [winners, stale lease]
//     (5) AssertionError: expected 1785570848503 to be 1785570768500 // Object.is equality
//         [the LIVE, not-yet-stale lease was overwritten — the committed instant moved]
//     RED SET {3,4,5} — as predicted, and 6, 7, 8 stayed GREEN exactly as the plan reasoned: case 7 is still
//     refused by the UNTOUCHED owner term, and case 6's release round-trip does not read the predicate.
//   MUTATION 2b (only the `< now() - make_interval(...)` half deleted) — 1 failed | 7 passed
//     (4) AssertionError: expected 1785570713098 to be greater than 1785570713098
//         [nobody re-claimed the STALE lease — the self-heal is gone]
//     RED SET {4} — as predicted.
//   MUTATION 2c (only the `eq(booking.bookerId, bookerId)` term deleted) — 1 failed | 7 passed
//     (7) AssertionError: expected 'DIFFERENT BOOKER CLAIMED IT' to be null
//     RED SET {7} — as predicted.
//   Each restored by editing the file back → this file 8/8 green, and the constraint-#2 grep gate on
//   src/lib/payments/checkout-lease.ts passes.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// Every case asserts the COMMITTED column FIRST, read back through `testDb.client` (an INDEPENDENT
// connection), so a mutation's failure message names the DATABASE TRUTH and not a returned-value proxy.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { user, listing, booking } from "@/lib/db/schema";
import { claimCheckoutLease, releaseCheckoutLease } from "@/lib/payments/checkout-lease";
import { CHECKOUT_LEASE_TTL_SECONDS } from "@/lib/payments/config";

let testDb: TestDb;

const HOST = "host_lease_race";
const BOOKER = "booker_lease_race"; // THE shared identity — one booker, one booking, two tabs.
const OTHER = "booker_lease_race_other"; // case 7 only: a DIFFERENT owner, which must be refused.
const LISTING = "listing_lease_race";

// One fixture booking per case, so no case can pre-fill another's lease. Each gets its own hour window on
// the same listing/unit so the booking_no_overlap EXCLUDE is irrelevant to this file.
const B_INLINE_FRESH = "bk_lease_inline_fresh"; // case 1
const B_INLINE_STALE = "bk_lease_inline_stale"; // case 2
const B_REAL_FRESH = "bk_lease_real_fresh"; // case 3
const B_REAL_STALE = "bk_lease_real_stale"; // case 4
const B_NOT_STALE = "bk_lease_not_stale"; // case 5
const B_RELEASE = "bk_lease_release"; // case 6
const B_OWNER = "bk_lease_owner"; // case 7
const B_NEIGHBOUR_A = "bk_lease_neighbour_a"; // case 8 — the one claimed
const B_NEIGHBOUR_B = "bk_lease_neighbour_b"; // case 8 — the one that must stay untouched

const HOUR = 3_600_000;
const BASE = Date.now() + 30 * 24 * HOUR; // ~30 days out: never in the past, never past the booking horizon

/**
 * The COMMITTED lease, read through an INDEPENDENT connection. This is the database truth every case
 * asserts first.
 *
 * ⚠️ THE TIMESTAMP IS FORMATTED BY POSTGRES, NOT PARSED BY postgres.js, AND THAT IS DELIBERATE.
 * `drizzle(client)` MUTATES the postgres.js client it is handed — drizzle-orm/postgres-js installs a
 * transparent parser for every date/time OID (1184 timestamptz included) so Drizzle can do its own column
 * mapping. `setupTestDb` calls `drizzle(client)` on `testDb.client`, so a bare `SELECT checkout_lock_at`
 * through it comes back as the RAW Postgres string ("2026-08-01 07:53:04.498074+00"), not a Date. Asking
 * Postgres for an unambiguous ISO string sidesteps that entirely and costs nothing.
 *
 * `micros` is the six-digit microseconds field, and it is the direct evidence that
 * `date_trunc('milliseconds', now())` did its job: a truncated value ends in "000", a raw `now()` does not.
 */
async function readLease(id: string): Promise<{ at: Date | null; micros: string | null }> {
  const [row] = (await testDb.client`
    SELECT to_char(checkout_lock_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS iso,
           to_char(checkout_lock_at AT TIME ZONE 'UTC', 'US') AS micros
    FROM booking WHERE id = ${id}`) as unknown as {
    iso: string | null;
    micros: string | null;
  }[];
  const iso = row?.iso ?? null;
  return { at: iso === null ? null : new Date(iso), micros: row?.micros ?? null };
}

/** The committed lease instant alone — the shape most cases assert on. */
async function readLock(id: string): Promise<Date | null> {
  return (await readLease(id)).at;
}

/** Force a lease to an age relative to the POSTGRES clock (negative seconds = in the past). */
async function setLeaseAge(id: string, secondsAgo: number): Promise<void> {
  await testDb.client`
    UPDATE booking
    SET checkout_lock_at = date_trunc('milliseconds', now() - make_interval(secs => ${secondsAgo}::int))
    WHERE id = ${id}`;
}

// LAYER 1 — the CAS, INLINED. Fired in AUTOCOMMIT: a bare tagged template, NOT `client.begin`. That is the
// property under test — the claim must be atomic WITHOUT a transaction, because a transaction is exactly
// what may not span the PayMongo round-trips the caller makes next. Each racer supplies its own independent
// connection, so the statements genuinely contend on the row.
function raceInlinedClaim(client: TestDb["client"], holdId: string, bookerId: string) {
  return client`
    UPDATE booking
    SET checkout_lock_at = date_trunc('milliseconds', now())
    WHERE id = ${holdId}
      AND booker_id = ${bookerId}
      AND (checkout_lock_at IS NULL
           OR checkout_lock_at < now() - make_interval(secs => ${CHECKOUT_LEASE_TTL_SECONDS}::int))
    RETURNING checkout_lock_at` as unknown as Promise<{ checkout_lock_at: Date }[]>;
  // ↑ MUTATION 1 TARGET: delete the two-line `AND (checkout_lock_at IS NULL OR ...)` predicate above (in
  //   THIS file) to mutation-verify the pattern proof, then restore. This is NOT the production predicate —
  //   that is MUTATION 2, in src/lib/payments/checkout-lease.ts, covered by cases 3-8 below.
}

// LAYER 2 — the SHIPPED claim. One racer = one INDEPENDENT postgres.js connection wrapped in its OWN
// `drizzle(...)`, which is exactly the `DbConn` (PostgresJsDatabase<Record<string, unknown>>) the module
// takes. Sharing `testDb.db` (max: 1) across racers would serialize and prove nothing.
function realClaim(client: TestDb["client"], holdId: string, bookerId: string) {
  return claimCheckoutLease(drizzle(client), { holdId, bookerId });
}

beforeAll(async () => {
  testDb = await setupTestDb();

  await testDb.db.insert(user).values([
    {
      id: HOST,
      name: "Lease Host",
      email: "host_lease_race@example.com",
      firstName: "Lease",
      emailVerified: true,
    },
    {
      id: BOOKER,
      name: "Lease Booker",
      email: "booker_lease_race@example.com",
      firstName: "Lease",
    },
    {
      id: OTHER,
      name: "Other Booker",
      email: "booker_lease_race_other@example.com",
      firstName: "Other",
    },
  ]);

  await testDb.db.insert(listing).values({
    id: LISTING,
    hostId: HOST,
    title: "Lease Court",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Makati",
    hourlyRateCents: 50_000,
    maxOccupancy: 8,
    currency: "php",
  });

  // A distinct one-hour window per fixture booking, so the GiST EXCLUDE never enters this file's story.
  const fixtures = [
    B_INLINE_FRESH,
    B_INLINE_STALE,
    B_REAL_FRESH,
    B_REAL_STALE,
    B_NOT_STALE,
    B_RELEASE,
    B_OWNER,
    B_NEIGHBOUR_A,
    B_NEIGHBOUR_B,
  ];
  await testDb.db.insert(booking).values(
    fixtures.map((id, i) => ({
      id,
      listingId: LISTING,
      unit: 1,
      bookerId: BOOKER,
      startsAt: new Date(BASE + i * 2 * HOUR),
      endsAt: new Date(BASE + i * 2 * HOUR + HOUR),
      status: "pending" as const,
      expiresAt: new Date(BASE),
      quotedTotalCents: 50_000,
      currency: "php",
    })),
  );
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("checkout lease — exactly one concurrent checkout attempt per booking (T-08-79)", () => {
  // ── LAYER 1: the pattern. MUTATION 1 targets the inlined predicate in raceInlinedClaim, above. ────────
  it("(1) 3 concurrent INLINED claims on a FREE lease — exactly ONE claims", async () => {
    const clients = makeRacingClients(testDb.schema, 3); // 3 INDEPENDENT connections, one schema
    try {
      expect(await readLock(B_INLINE_FRESH)).toBeNull(); // free by construction (backfill-free column)

      const results = await Promise.allSettled(
        clients.map((client) => raceInlinedClaim(client, B_INLINE_FRESH, BOOKER)),
      );

      // DATABASE TRUTH FIRST: the lease is committed and held. Without the CAS predicate all three UPDATEs
      // succeed and the claimant count below reads 3 — that is MUTATION 1.
      expect(await readLock(B_INLINE_FRESH)).not.toBeNull();

      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
      const claimants = results.filter((r) => r.status === "fulfilled" && r.value.length === 1);
      expect(claimants.length).toBe(1);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  it("(2) 3 concurrent INLINED claims on a STALE lease — still exactly ONE claims", async () => {
    // A lease abandoned by a dead process. It is re-claimable — but by ONE racer, not by all of them.
    await setLeaseAge(B_INLINE_STALE, CHECKOUT_LEASE_TTL_SECONDS + 60);
    const before = await readLock(B_INLINE_STALE);
    expect(before).not.toBeNull();

    const clients = makeRacingClients(testDb.schema, 3);
    try {
      const results = await Promise.allSettled(
        clients.map((client) => raceInlinedClaim(client, B_INLINE_STALE, BOOKER)),
      );

      // DATABASE TRUTH FIRST: the stale value was replaced by a FRESH one — the self-heal happened...
      const after = await readLock(B_INLINE_STALE);
      expect(after).not.toBeNull();
      expect(after!.getTime()).toBeGreaterThan(before!.getTime());
      // ...exactly once.
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
      const claimants = results.filter((r) => r.status === "fulfilled" && r.value.length === 1);
      expect(claimants.length).toBe(1);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  // ── LAYER 2: the SHIPPED claimCheckoutLease. These cases are the ONLY thing standing between a one-line
  //    deletion in src/lib/payments/checkout-lease.ts and a fully green suite. MUTATION 2 targets it.
  it("(3) 3 concurrent SHIPPED claims on a FREE lease — exactly ONE { claimed: true }", async () => {
    const clients = makeRacingClients(testDb.schema, 3);
    try {
      expect(await readLock(B_REAL_FRESH)).toBeNull();

      const results = await Promise.allSettled(
        clients.map((client) => realClaim(client, B_REAL_FRESH, BOOKER)),
      );

      // DATABASE TRUTH FIRST — the committed column, read on an independent connection.
      expect(await readLock(B_REAL_FRESH)).not.toBeNull();

      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
      const values = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      const winners = values.filter((v) => v.claimed);
      expect(winners.length).toBe(1);
      expect(values.filter((v) => !v.claimed).length).toBe(2);

      // The winner's timestamp IS the committed value — that exact instant is what releases the lease, and
      // the millisecond round-trip has to be exact for that to work (case 6 is the dedicated proof).
      const winner = winners[0];
      expect(winner.claimed && winner.lockedAt.getTime()).toBe((await readLock(B_REAL_FRESH))!.getTime());
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  it("(4) 3 concurrent SHIPPED claims on a STALE lease — exactly ONE claims (THE SELF-HEAL PROOF)", async () => {
    // A crashed or SIGKILLed attempt must not wedge the booking. Past the TTL the lease is re-claimable with
    // no sweep, no cron and no operator — and re-claimable by exactly one racer.
    await setLeaseAge(B_REAL_STALE, CHECKOUT_LEASE_TTL_SECONDS + 60);
    const before = await readLock(B_REAL_STALE);
    expect(before).not.toBeNull();

    const clients = makeRacingClients(testDb.schema, 3);
    try {
      const results = await Promise.allSettled(
        clients.map((client) => realClaim(client, B_REAL_STALE, BOOKER)),
      );

      const after = await readLock(B_REAL_STALE);
      expect(after).not.toBeNull();
      expect(after!.getTime()).toBeGreaterThan(before!.getTime());

      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
      const values = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      expect(values.filter((v) => v.claimed).length).toBe(1);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  it("(5) a NOT-YET-STALE lease is refused — the TTL boundary", async () => {
    // 10 seconds INSIDE the TTL. This case is what dies if the interval is widened or the staleness term is
    // dropped: a live attempt would be overtaken and the double-charge race would re-open.
    await setLeaseAge(B_NOT_STALE, CHECKOUT_LEASE_TTL_SECONDS - 10);
    const before = await readLock(B_NOT_STALE);
    expect(before).not.toBeNull();

    const result = await claimCheckoutLease(testDb.db, { holdId: B_NOT_STALE, bookerId: BOOKER });

    // DATABASE TRUTH FIRST: the live lease was NOT overwritten.
    expect((await readLock(B_NOT_STALE))!.getTime()).toBe(before!.getTime());
    expect(result.claimed).toBe(false);
  });

  it("(6) release clears the lease — and ONLY for the exact instant that claimed it", async () => {
    const first = await claimCheckoutLease(testDb.db, { holdId: B_RELEASE, bookerId: BOOKER });
    expect(first.claimed).toBe(true);
    if (!first.claimed) return;
    const held0 = await readLease(B_RELEASE);
    expect(held0.at).not.toBeNull();

    // THE PRECISION PROOF, stated directly against the stored value: the microseconds field is all zeros,
    // i.e. the claim wrote `date_trunc('milliseconds', now())` and not a bare `now()`. A raw now() lands on
    // something like "498074" here.
    expect(held0.micros).toMatch(/000$/);
    expect(held0.at!.getTime()).toBe(first.lockedAt.getTime());

    // The round-trip must be EXACT. If the claim stored microsecond precision, the Date Drizzle hands back
    // is millisecond-truncated, this release would match zero rows and silently no-op, and every refusal
    // path in confirmBooking would wedge the booking for the whole TTL. That is what this half catches.
    await releaseCheckoutLease(testDb.db, B_RELEASE, first.lockedAt);
    expect(await readLock(B_RELEASE)).toBeNull();

    // THE OVERTAKE GUARD: a stale holder must not be able to clear its SUCCESSOR's fresh lease. Release with
    // a different timestamp matches nothing and leaves the lease exactly as it was.
    const second = await claimCheckoutLease(testDb.db, { holdId: B_RELEASE, bookerId: BOOKER });
    expect(second.claimed).toBe(true);
    if (!second.claimed) return;
    const held = await readLock(B_RELEASE);
    expect(held).not.toBeNull();

    await releaseCheckoutLease(testDb.db, B_RELEASE, new Date(second.lockedAt.getTime() - 5_000));
    expect((await readLock(B_RELEASE))!.getTime()).toBe(held!.getTime());
  });

  it("(7) a DIFFERENT booker cannot claim the lease — the owner term", async () => {
    expect(await readLock(B_OWNER)).toBeNull();

    const result = await claimCheckoutLease(testDb.db, { holdId: B_OWNER, bookerId: OTHER });

    // DATABASE TRUTH FIRST, with a message that names the failure rather than a boolean proxy.
    const after = await readLock(B_OWNER);
    expect(after === null ? null : "DIFFERENT BOOKER CLAIMED IT").toBeNull();
    expect(result.claimed).toBe(false);

    // ...and the rightful owner is not blocked by the refused attempt.
    const owner = await claimCheckoutLease(testDb.db, { holdId: B_OWNER, bookerId: BOOKER });
    expect(owner.claimed).toBe(true);
  });

  it("(8) claiming one booking's lease leaves another booking's lease untouched", async () => {
    // The CAS is keyed on the booking id — never on the listing or the booker alone. Both fixtures here share
    // one listing AND one booker, so a predicate that lost the id term would take both.
    expect(await readLock(B_NEIGHBOUR_A)).toBeNull();
    expect(await readLock(B_NEIGHBOUR_B)).toBeNull();

    const result = await claimCheckoutLease(testDb.db, { holdId: B_NEIGHBOUR_A, bookerId: BOOKER });

    expect(await readLock(B_NEIGHBOUR_A)).not.toBeNull();
    expect(await readLock(B_NEIGHBOUR_B)).toBeNull();
    expect(result.claimed).toBe(true);
  });
});
