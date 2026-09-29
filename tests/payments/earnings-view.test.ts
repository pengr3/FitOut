// HOST-03 earnings view (D-59) — proves the three load-bearing invariants of the host earnings page:
//   1. STATE DERIVATION (pure): derivePayoutLedgerView maps each payout state to the calm presentation view
//      (Paid → positive/"Paid"; Held → neutral + the "Held until after the session" helper/"Expected";
//      Refunded → the refunded helper; Processing → neutral). No DB.
//      DS-10 (plan 10-10) retyped `tone` to `StatusTone`, the closed four-tone vocabulary shared with the
//      booking status view. The two in-flight/closed treatments this file used to name collapse to
//      `neutral` and the success treatment is `positive`; the STATE MEANINGS are unchanged, and what these
//      assertions protect — Paid is the one positive signal, Failed is the only attention edge, and no
//      happy state is ever the attention edge — is unchanged with them.
//   2. SUMMARY SUMMING (pure): summarizePayouts → Upcoming = sum(Held+Processing net), Paid out = sum(Paid
//      net); Refunded/Failed contribute to neither. This is the exact helper the RSC calls, so the page's
//      totals can never drift from the test.
//   3. OWNER-SCOPING (Security V4 / T-05-29): the owner-scoped ledger read (WHERE host_id = signed-in host,
//      the SAME join the page runs) returns ONLY that host's rows — host A never sees host B, and a
//      guessed/absent host sees nothing. Plus: a row exposes the frozen gross/commission/net so the host
//      sees the fee (D-59). Runs against an isolated Postgres schema.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { and, desc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, listing, booking, hostPayoutLedger } from "@/lib/db/schema";
import { computeCommission } from "@/lib/payments/commission";
import {
  derivePayoutLedgerView,
  projectHostEarnings,
  summarizeHostEarnings,
  type EarningSource,
  summarizePayouts,
  type PayoutLedgerState,
} from "@/components/host/payout-ledger-status";
import * as earningsProjection from "@/components/host/payout-ledger-status";
import { bookingPayoutView } from "@/lib/host/booking-payout";

// ---------------------------------------------------------------------------
// 1. Pure state derivation (no DB)
// ---------------------------------------------------------------------------

describe("derivePayoutLedgerView — calm state presentation (05-UI-SPEC)", () => {
  it("uses the Friday settlement vocabulary rather than the old 24-hour promise", () => {
    expect(derivePayoutLedgerView("held").label).toBe("Payment clearing");
    expect(derivePayoutLedgerView("held").helper).toContain("reach FitOut");
    expect(derivePayoutLedgerView("processing").helper).toContain("confirmed");
  });

  it("exposes a booking projection that can represent confirmed preclaim earnings", () => {
    expect(typeof (earningsProjection as Record<string, unknown>).projectHostEarnings).toBe("function");
  });
  it("Paid → positive tone, 'Paid' label + date prefix", () => {
    const v = derivePayoutLedgerView("paid");
    expect(v.tone).toBe("positive");
    expect(v.label).toBe("Paid");
    expect(v.datePrefix).toBe("Paid");
  });

  it("Held → neutral clearing copy", () => {
    const v = derivePayoutLedgerView("held");
    expect(v.tone).toBe("neutral");
    expect(v.helper).toContain("reach FitOut");
    expect(v.datePrefix).toBe("Expected");
  });

  it("Refunded → neutral tone with the refunded helper + 'Refunded' date prefix", () => {
    const v = derivePayoutLedgerView("refunded");
    expect(v.tone).toBe("neutral");
    expect(v.helper).toBe("This booking was refunded — no payout.");
    expect(v.datePrefix).toBe("Refunded");
  });

  it("Processing → neutral, and distinct from Held by its LABEL and icon rather than by its tone", () => {
    // DS-10: Processing used to carry a bordered treatment of its own. It is in-flight, which is what
    // `neutral` means, and the ArrowLeftRight icon is what separates it from Held's Clock — the badge
    // recipe map in payout-state-badge.tsx keys by STATE for exactly that reason.
    const v = derivePayoutLedgerView("processing");
    expect(v.tone).toBe("neutral");
    expect(v.label).toBe("Processing");
    expect(v.datePrefix).toBe("Expected");
    expect(derivePayoutLedgerView("held").label).not.toBe(v.label);
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

const projectionNow = new Date("2026-10-01T02:00:00.000Z");
const source = (id: string, overrides: Partial<EarningSource> = {}): EarningSource => ({
  bookingId: id, hostId: "host-A", createdAt: new Date("2026-09-01T00:00:00Z"),
  startsAt: new Date("2026-09-27T04:00:00Z"), endsAt: new Date("2026-09-27T05:00:00Z"),
  bookingStatus: "confirmed", spacePriceCents: 200_000, retainedSpaceCents: null,
  currency: "php", title: "Court 🏸 <script>alert(1)</script>", timezone: "Asia/Manila",
  ledger: null, settlement: null, ...overrides,
});
const project = (rows: EarningSource[], policy = false, debit = 0) =>
  projectHostEarnings(rows, "host-A", projectionNow, 24, 1000, policy, debit);

describe("host earnings booking projection (HPAY-05)", () => {
  it("shows zero, one, and many owner-scoped preclaim rows newest first with booking-ID ties", () => {
    expect(project([])).toEqual([]);
    expect(project([source("other", { hostId: "host-B" })])).toEqual([]);
    expect(project([source("a")])).toHaveLength(1);
    const rows = project([source("a"), source("b"), source("new", { createdAt: new Date("2026-09-02T00:00:00Z") }), source("B", { hostId: "host-B" })]);
    expect(rows.map((r) => r.bookingId)).toEqual(["new", "b", "a"]);
    expect(rows[2].title).toContain("<script>"); // renderers escape this as text
  });

  it("replaces a booking estimate by exact ID with the frozen ledger amount", () => {
    const ledger = { grossCents: 120_000, commissionCents: 12_000, netCents: 108_000,
      recoveredCents: 8_000, state: "processing" as const, transferId: "tr_1", paidAt: null };
    const [row] = project([source("same"), source("same", { ledger })]);
    expect(row.estimated).toBe(false);
    expect(row.grossCents).toBe(120_000);
    expect(row.netCents).toBe(100_000);
    expect(row.status).toBe("processing");
  });

  it("uses retained space basis and host debit but excludes unknown amounts", () => {
    const rows = project([source("partial", { bookingStatus: "cancelled", retainedSpaceCents: 100_000 }),
      source("unknown", { spacePriceCents: null })], false, 9_000);
    expect(rows.find((r) => r.bookingId === "partial")?.netCents).toBe(81_000);
    expect(rows.find((r) => r.bookingId === "unknown")?.netCents).toBeNull();
    expect(summarizeHostEarnings(rows)).toEqual({ upcomingCents: 81_000, paidCents: 0, hasEstimate: true });
  });

  it("withdraws an exact Friday for missing proof and shows it only with fresh validated proof", () => {
    const proof = { depositedAt: new Date("2026-09-30T04:00:00Z"), verifiedAt: new Date("2026-09-30T04:10:00Z") };
    expect(project([source("x", { settlement: proof })])[0].fridayNoon).toBeNull();
    const backed = project([source("x", { settlement: proof })], true)[0];
    expect(backed.status).toBe("scheduled");
    expect(backed.timing).toContain("Oct 2, 2026 at 12:00 Manila time");
    expect(project([source("x", { settlement: null })], true)[0].status).toBe("clearing");
    expect(project([source("x", { settlement: { ...proof, verifiedAt: new Date("2026-09-28T04:00:00Z") } })], true)[0].fridayNoon).toBeNull();
  });

  it("shows the current Friday cohort during its retry window and advances only after closing", () => {
    const settlement = { depositedAt: new Date("2026-10-01T14:00:00Z"), verifiedAt: new Date("2026-10-01T15:05:00Z") };
    for (const instant of ["2026-10-02T04:01:00Z", "2026-10-02T14:59:00Z"]) {
      const [row] = projectHostEarnings([source("retry", { settlement })], "host-A", new Date(instant), 24, 1000, true);
      expect(row.fridayNoon?.toISOString()).toBe("2026-10-02T04:00:00.000Z");
      expect(row.timing).toContain("checks and retries are in progress");
      expect(row.timing).not.toContain("Next eligible release");
    }
    const [after] = projectHostEarnings([source("retry", { settlement })], "host-A", new Date("2026-10-02T15:00:01Z"), 24, 1000, true);
    expect(after.fridayNoon?.toISOString()).toBe("2026-10-09T04:00:00.000Z");
    expect(after.timing).toContain("Next eligible release");
  });

  it("never calls a held or in-flight claim Paid and requires a terminal transfer ID plus paid instant", () => {
    const ledger = { grossCents: 200_000, commissionCents: 20_000, netCents: 180_000,
      recoveredCents: 0, state: "paid" as const, transferId: null, paidAt: null };
    expect(project([source("x", { ledger })])[0].status).toBe("failed");
    const paid = project([source("x", { ledger: { ...ledger, transferId: "tr_1", paidAt: projectionNow } })])[0];
    expect(paid.status).toBe("paid");
    expect(summarizeHostEarnings([paid]).paidCents).toBe(180_000);
  });

  it("shows a fully netted paid payout as settled in earnings and booking views", () => {
    const ledger = { grossCents: 100_000, commissionCents: 10_000, netCents: 90_000,
      recoveredCents: 90_000, state: "paid" as const, transferId: null, paidAt: projectionNow };
    const [earning] = project([source("netted", { ledger })]);
    expect(earning.status).toBe("paid");
    expect(earning.netCents).toBe(0);
    expect(earning.timing).toContain("Settled by cancellation fee offset");
    expect(summarizeHostEarnings([earning])).toEqual({ upcomingCents: 0, paidCents: 0, hasEstimate: false });
    const bookingView = bookingPayoutView(earning);
    expect(bookingView.status).toBe("paid");
    expect(bookingView.timing).toBe(earning.timing);
    expect(bookingView.amountLabel).toContain("₱0.00");
  });
});

describe("earnings route recovery", () => {
  it("has a dedicated neutral boundary with the installed unstable_retry contract", () => {
    const path = resolve(process.cwd(), "src/app/(host)/host/earnings/error.tsx");
    expect(existsSync(path)).toBe(true);
    const source = readFileSync(path, "utf8");
    expect(source).toContain("unstable_retry");
    expect(source).toContain("We couldn&apos;t load your earnings. Try again.");
    expect(source).not.toContain("Paid out");
  });
});

describe("booking detail payout wiring (HPAY-05)", () => {
  it("uses the same projected status view as booking list and earnings", () => {
    const detail = readFileSync(resolve(process.cwd(), "src/app/(host)/host/bookings/[id]/page.tsx"), "utf8");
    expect(detail).toContain("loadBookingPayouts");
    expect(detail).toContain("<HostPayoutCell view=");
    expect(detail).not.toContain("<HostPayoutCell state=");
  });

  it("carries the earnings status, timing and supported amount through every booking state", () => {
    const frozen = { grossCents: 200_000, commissionCents: 20_000, netCents: 180_000,
      recoveredCents: 0, state: "processing" as const, transferId: null, paidAt: null };
    const proof = { depositedAt: new Date("2026-09-30T04:00:00Z"), verifiedAt: new Date("2026-09-30T04:10:00Z") };
    const cases: Array<[string, EarningSource, boolean]> = [
      ["upcoming", source("upcoming", { endsAt: new Date("2026-10-02T05:00:00Z") }), false],
      ["review", source("review", { endsAt: new Date("2026-09-30T20:00:00Z") }), false],
      ["clearing", source("clearing"), false],
      ["scheduled", source("scheduled", { settlement: proof }), true],
      ["processing", source("processing", { ledger: frozen }), false],
      ["paid", source("paid", { ledger: { ...frozen, state: "paid", transferId: "tr_1", paidAt: projectionNow } }), false],
      ["refunded", source("refunded", { bookingStatus: "cancelled", retainedSpaceCents: 0 }), false],
      ["failed", source("failed", { ledger: { ...frozen, state: "failed" } }), false],
    ];
    for (const [expected, input, policy] of cases) {
      const earning = project([input], policy)[0];
      const bookingView = bookingPayoutView(earning);
      expect(bookingView.status).toBe(expected);
      expect(bookingView.timing).toBe(earning.timing);
      if (expected === "paid") expect(bookingView.timing).toContain("Paid Oct 1, 2026");
      if (expected === "scheduled") expect(bookingView.timing).toContain("Oct 2, 2026 at 12:00 Manila time");
      if (expected === "refunded") expect(bookingView.amountLabel).toBeNull();
      else expect(bookingView.amountLabel).toContain(earning.estimated ? "Estimated payout" : "Your payout");
    }
  });

  it("withdraws a previously supported Friday when current settlement proof is returned", () => {
    const proof = { depositedAt: new Date("2026-09-30T04:00:00Z"), verifiedAt: new Date("2026-09-30T04:10:00Z") };
    expect(bookingPayoutView(project([source("x", { settlement: proof })], true)[0]).status).toBe("scheduled");
    const returned = bookingPayoutView(project([source("x", { settlement: null })], true)[0]);
    expect(returned.status).toBe("clearing");
    expect(returned.timing).not.toContain("Oct 2");
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

/** Booking-first owner read: unlike the legacy ledger-only reader, it includes unclaimed confirmed bookings. */
function loadHostBookingEarnings(db: PostgresJsDatabase<Record<string, unknown>>, hostId: string) {
  return db.select({ bookingId: booking.id, hostId: listing.hostId,
    createdAt: booking.createdAt, ledgerId: hostPayoutLedger.id })
    .from(booking).innerJoin(listing, eq(booking.listingId, listing.id))
    .leftJoin(hostPayoutLedger, and(eq(hostPayoutLedger.bookingId, booking.id),
      eq(hostPayoutLedger.hostId, hostId), eq(hostPayoutLedger.kind, "payout")))
    .where(and(eq(listing.hostId, hostId), eq(booking.status, "confirmed")))
    .orderBy(desc(booking.createdAt), desc(booking.id));
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
  it("shows an owner's confirmed booking before a payout claim and replaces it by booking ID", async () => {
    const booker = await makeUser("bookerPreclaim", false);
    const hostA = await makeUser("hostPreclaimA");
    const hostB = await makeUser("hostPreclaimB");
    const listingA = await makeListing(hostA);
    const listingB = await makeListing(hostB);
    const endsAt = new Date(Date.now() + 7 * 86_400_000);
    const bookingId = uid("preclaim");
    await testDb.db.insert(booking).values({ id: bookingId, listingId: listingA, unit: 1,
      bookerId: booker, startsAt: new Date(endsAt.getTime() - 3_600_000), endsAt,
      status: "confirmed", spacePriceCents: 200_000, quotedTotalCents: 210_000 });
    await testDb.db.insert(booking).values({ id: uid("otherBooking"), listingId: listingB, unit: 1,
      bookerId: booker, startsAt: new Date(endsAt.getTime() - 3_600_000), endsAt,
      status: "confirmed", spacePriceCents: 300_000 });
    const before = await loadHostBookingEarnings(testDb.db, hostA);
    expect(before).toEqual([expect.objectContaining({ bookingId, ledgerId: null, hostId: hostA })]);
    await testDb.db.insert(hostPayoutLedger).values({ id: uid("claim"), bookingId, hostId: hostA,
      grossCents: 200_000, commissionRateBps: 1000, commissionCents: 20_000,
      netCents: 180_000, currency: "php", state: "processing" });
    const after = await loadHostBookingEarnings(testDb.db, hostA);
    expect(after).toHaveLength(1);
    expect(after[0].bookingId).toBe(bookingId);
    expect(after[0].ledgerId).not.toBeNull();
  });
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
