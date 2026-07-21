// HOST-03 earnings view (D-59) — proves the three load-bearing invariants of the host earnings page:
//   1. STATE DERIVATION (pure): derivePayoutLedgerView maps each payout state to the calm presentation view
//      (Paid → success/"Paid"; Held → muted + the "Held until after the session" helper/"Expected";
//      Refunded → the refunded helper; Processing → outline). No DB.
//   2. SUMMARY SUMMING (pure): summarizePayouts → Upcoming = sum(Held+Processing net), Paid out = sum(Paid
//      net); Refunded/Failed contribute to neither. This is the exact helper the RSC calls, so the page's
//      totals can never drift from the test.
//   3. OWNER-SCOPING (Security V4 / T-05-29): the owner-scoped ledger read (WHERE host_id = signed-in host,
//      the SAME join the page runs) returns ONLY that host's rows — host A never sees host B, and a
//      guessed/absent host sees nothing. Plus: a row exposes the frozen gross/commission/net so the host
//      sees the fee (D-59). Runs against an isolated Postgres schema.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, desc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking, hostPayoutLedger } from "@/lib/db/schema";
import { computeCommission } from "@/lib/payments/commission";
import {
  derivePayoutLedgerView,
  summarizePayouts,
  type PayoutLedgerState,
} from "@/components/host/payout-ledger-status";

// ---------------------------------------------------------------------------
// 1. Pure state derivation (no DB)
// ---------------------------------------------------------------------------

describe("derivePayoutLedgerView — calm state presentation (05-UI-SPEC)", () => {
  it("Paid → success tone, 'Paid' label + date prefix", () => {
    const v = derivePayoutLedgerView("paid");
    expect(v.tone).toBe("success");
    expect(v.label).toBe("Paid");
    expect(v.datePrefix).toBe("Paid");
  });

  it("Held → muted tone with the 'Held until after the session' helper + 'Expected' date prefix", () => {
    const v = derivePayoutLedgerView("held");
    expect(v.tone).toBe("muted");
    expect(v.helper).toBe("Held until after the session");
    expect(v.datePrefix).toBe("Expected");
  });

  it("Refunded → muted tone with the refunded helper + 'Refunded' date prefix", () => {
    const v = derivePayoutLedgerView("refunded");
    expect(v.tone).toBe("muted");
    expect(v.helper).toBe("This booking was refunded — no payout.");
    expect(v.datePrefix).toBe("Refunded");
  });

  it("Processing → outline (bordered, not filled) tone, distinct from Held", () => {
    const v = derivePayoutLedgerView("processing");
    expect(v.tone).toBe("outline");
    expect(v.datePrefix).toBe("Expected");
  });

  it("Failed → the attention edge (never a happy state)", () => {
    const v = derivePayoutLedgerView("failed");
    expect(v.tone).toBe("attention");
  });
});

// ---------------------------------------------------------------------------
// 2. Pure summary summing (no DB) — the exact helper the earnings page calls
// ---------------------------------------------------------------------------

describe("summarizePayouts — earnings summary totals", () => {
  it("Upcoming = Held+Processing net; Paid out = Paid net; Refunded contributes to neither", () => {
    const totals = summarizePayouts([
      { state: "held", netCents: 90000 },
      { state: "processing", netCents: 45000 },
      { state: "paid", netCents: 180000 },
      { state: "refunded", netCents: 30000 },
    ]);
    expect(totals.upcomingCents).toBe(135000); // 90000 + 45000
    expect(totals.paidCents).toBe(180000); // paid only
  });

  it("no rows → both totals zero", () => {
    expect(summarizePayouts([])).toEqual({ upcomingCents: 0, paidCents: 0 });
  });
});

// ---------------------------------------------------------------------------
// 3. Owner-scoped ledger read (integration) — Security V4 / T-05-29
// ---------------------------------------------------------------------------

let testDb: TestDb;
let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;

/** The owner-scoped earnings read — the SAME join/filter the RSC (earnings/page.tsx) runs. Owner-scoping
 *  is `WHERE host_id = <signed-in host>`; the route group is NOT the gate. */
function loadHostEarnings(db: PostgresJsDatabase<Record<string, unknown>>, hostId: string) {
  return db
    .select({
      bookingId: hostPayoutLedger.bookingId,
      hostId: hostPayoutLedger.hostId,
      grossCents: hostPayoutLedger.grossCents,
      commissionCents: hostPayoutLedger.commissionCents,
      netCents: hostPayoutLedger.netCents,
      state: hostPayoutLedger.state,
    })
    .from(hostPayoutLedger)
    .innerJoin(booking, eq(hostPayoutLedger.bookingId, booking.id))
    .innerJoin(listing, eq(booking.listingId, listing.id))
    // 07-04 / D-71: kind-scoped, exactly as the RSC is. A host_cancel_fee row is a SIGNED DEBIT with no
    // booking payout behind it — unscoped it renders as a nonsense row AND subtracts from the Upcoming
    // total, understating what the host is actually owed.
    .where(and(eq(hostPayoutLedger.hostId, hostId), eq(hostPayoutLedger.kind, "payout")))
    .orderBy(desc(hostPayoutLedger.createdAt));
}

/** The D-71 outstanding-debt query the earnings RSC runs — unrecovered host_cancel_fee, owner-scoped. */
async function loadOutstandingDebt(
  db: PostgresJsDatabase<Record<string, unknown>>,
  hostId: string,
): Promise<number> {
  const [{ outstandingDebitCents = 0 } = { outstandingDebitCents: 0 }] = (await db.execute(sql`
    SELECT COALESCE(SUM(-net_cents - recovered_cents), 0)::int AS "outstandingDebitCents"
    FROM host_payout_ledger
    WHERE host_id = ${hostId}
      AND kind = 'host_cancel_fee'
      AND recovered_cents < -net_cents
  `)) as unknown as { outstandingDebitCents: number }[];
  return outstandingDebitCents;
}

async function makeUser(prefix: string, canHost = true): Promise<string> {
  const id = uid(prefix);
  await testDb.db.insert(user).values({
    id,
    name: prefix,
    email: `${id}@example.com`,
    firstName: prefix,
    canHost,
  });
  return id;
}

async function makeListing(hostId: string): Promise<string> {
  const id = uid("listing");
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: "Earnings Listing",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 200000,
    currency: "php",
  });
  return id;
}

/** Seed a confirmed booking + its payout-ledger row (commission FROZEN via computeCommission) for `hostId`. */
let windowSlot = 0;
async function makePayout(opts: {
  hostId: string;
  listingId: string;
  bookerId: string;
  grossCents: number;
  state: PayoutLedgerState;
}): Promise<string> {
  const bookingId = uid("bk");
  // Each booking gets its own past 1-hour window, 2h apart, so same-listing rows never trip the
  // booking_no_overlap GiST EXCLUDE constraint.
  const slot = windowSlot++;
  const endsAt = new Date(Date.now() - (slot + 1) * 2 * 3_600_000);
  await testDb.db.insert(booking).values({
    id: bookingId,
    listingId: opts.listingId,
    unit: 1,
    bookerId: opts.bookerId,
    startsAt: new Date(endsAt.getTime() - 3_600_000),
    endsAt,
    status: "confirmed",
    quotedTotalCents: opts.grossCents,
    currency: "php",
  });
  const { rateBps, commissionCents, netCents } = computeCommission(opts.grossCents);
  await testDb.db.insert(hostPayoutLedger).values({
    id: uid("ledger"),
    bookingId,
    hostId: opts.hostId,
    grossCents: opts.grossCents,
    commissionRateBps: rateBps,
    commissionCents,
    netCents,
    currency: "php",
    state: opts.state,
  });
  return bookingId;
}

beforeAll(async () => {
  testDb = await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

describe("earnings read is owner-scoped — a host only ever sees their own rows (T-05-29)", () => {
  it("host A sees ONLY A's payout rows, never host B's", async () => {
    const booker = await makeUser("booker", false);
    const hostA = await makeUser("hostA");
    const hostB = await makeUser("hostB");
    const listingA = await makeListing(hostA);
    const listingB = await makeListing(hostB);

    const a1 = await makePayout({ hostId: hostA, listingId: listingA, bookerId: booker, grossCents: 200000, state: "held" });
    const a2 = await makePayout({ hostId: hostA, listingId: listingA, bookerId: booker, grossCents: 150000, state: "paid" });
    const b1 = await makePayout({ hostId: hostB, listingId: listingB, bookerId: booker, grossCents: 300000, state: "held" });

    const aRows = await loadHostEarnings(testDb.db, hostA);
    const aIds = aRows.map((r) => r.bookingId);
    expect(aIds).toHaveLength(2);
    expect(aIds).toEqual(expect.arrayContaining([a1, a2]));
    expect(aIds).not.toContain(b1);
    // Every returned row belongs to host A — no cross-host leakage.
    expect(aRows.every((r) => r.hostId === hostA)).toBe(true);

    // And host B's read is symmetric — it never surfaces A's rows.
    const bRows = await loadHostEarnings(testDb.db, hostB);
    expect(bRows.map((r) => r.bookingId)).toEqual([b1]);
  });

  it("a guessed / absent host id sees nothing", async () => {
    const rows = await loadHostEarnings(testDb.db, "nonexistent-host-id");
    expect(rows).toEqual([]);
  });

  it("a returned row exposes the frozen gross/commission/net so the host sees the fee (D-59)", async () => {
    const booker = await makeUser("booker2", false);
    const host = await makeUser("hostC");
    const listingC = await makeListing(host);
    await makePayout({ hostId: host, listingId: listingC, bookerId: booker, grossCents: 200000, state: "held" });

    const [row] = await loadHostEarnings(testDb.db, host);
    expect(row.grossCents).toBe(200000);
    expect(row.commissionCents).toBe(20000); // 10% — the host-visible fee
    expect(row.netCents).toBe(180000); // gross − commission (D-52)
    expect(row.commissionCents).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 4. 07-04 / D-71 — the signed debit row must not pollute the earnings view
// ---------------------------------------------------------------------------

describe("earnings view — a host_cancel_fee debit never pollutes the payout rows (07-04, D-71)", () => {
  it("excludes the debit from the row list and from the Upcoming total, and surfaces it separately", async () => {
    const booker = await makeUser("booker3", false);
    const host = await makeUser("hostD");
    const listingD = await makeListing(host);

    const paidBk = await makePayout({
      hostId: host,
      listingId: listingD,
      bookerId: booker,
      grossCents: 200000,
      state: "held",
    });

    // A D-71 signed debit keyed to a DIFFERENT (host-cancelled) booking, partially recovered:
    // 30000 owed, 10000 already netted off an earlier payout ⇒ 20000 still outstanding.
    const debitBk = await makePayout({
      hostId: host,
      listingId: listingD,
      bookerId: booker,
      grossCents: 60000,
      state: "held",
    });
    await testDb.db.insert(hostPayoutLedger).values({
      id: uid("debit"),
      bookingId: debitBk,
      hostId: host,
      grossCents: -30000,
      commissionRateBps: 0,
      commissionCents: 0,
      netCents: -30000,
      recoveredCents: 10000,
      currency: "php",
      state: "held",
      kind: "host_cancel_fee",
    });

    // The row list is kind-scoped: two payout rows, and the debit is not among them.
    const rows = await loadHostEarnings(testDb.db, host);
    expect(rows.map((r) => r.bookingId).sort()).toEqual([paidBk, debitBk].sort());
    expect(rows.every((r) => r.netCents > 0)).toBe(true); // no negative row leaked in

    // Unscoped, the debit's −30000 would have been summed into Upcoming, understating what the host is
    // owed by exactly the debit amount. Upcoming = 180000 + 54000, with no −30000 term.
    const { upcomingCents } = summarizePayouts(
      rows.map((r) => ({ state: r.state, netCents: r.netCents })),
    );
    expect(upcomingCents).toBe(234000);

    // The debt is not hidden — it is surfaced on its own line, net of what has already been recovered.
    expect(await loadOutstandingDebt(testDb.db, host)).toBe(20000);
  });

  it("reports zero outstanding debt for a host with no cancellations", async () => {
    const host = await makeUser("hostE");
    expect(await loadOutstandingDebt(testDb.db, host)).toBe(0);
  });
});
