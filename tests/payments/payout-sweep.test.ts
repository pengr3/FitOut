// PAY-03 payout sweep (D-55/D-56) + PAY-02 commission freeze, exercised against an isolated schema with
// @/lib/paymongo mocked (mockPayMongo) so no live PayMongo call fires. Proves the load-bearing invariants:
//   - DUE SELECTION: only `confirmed` bookings past ends_at + PAYOUT_DELAY_HOURS (DB clock) with no ledger
//     row are swept; a future/not-yet-due confirmed booking and a pending booking are never selected —
//     the host is NEVER paid at booking time / before the session.
//   - HAPPY PAYOUT: exactly one `processing` ledger row, commission FROZEN (rate 1000 bps / 20000 c on a
//     200000 gross → net 180000), and createBatchTransfer fired once with net_cents to THIS host's wallet.
//   - AT-MOST-ONCE UNDER CONCURRENCY: two independent connections sweeping the SAME booking → exactly one
//     ledger row and ≤1 transfer (the ON CONFLICT loser fires nothing).
//   - MULTI-HOST CORRELATION: booking A resolves to host A's wallet, booking B to host B's — never crossed.
//   - NO-MATCH: a host with no activated wallet → money stays Held, NO transfer, a [payout-alert] fires.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { mockPayMongo } from "../helpers/mocks";
import { makeVerifiedHost } from "../helpers/seed";
import { user, listing, hostPayoutLedger, hostVerification, hostPayoutDestination, booking } from "@/lib/db/schema";
import { PAYOUT_DELAY_HOURS, PAYOUT_HOLD_HOURS } from "@/lib/payments/config";
import type { DuePayout } from "@/inngest/functions/payout-sweep";
import { encryptPayoutRecipientValue } from "@/lib/payout-recipient-crypto";
import { recordSettlementObservation } from "@/lib/payments/settlement";
import { bookingExceptionRef } from "@/lib/payments/payout-exceptions";

let testDb: TestDb;
type SweepModule = typeof import("@/inngest/functions/payout-sweep");
let queryDuePayouts: SweepModule["queryDuePayouts"];
let payOne: SweepModule["payOne"];
let recordMissedFridayPayouts: SweepModule["recordMissedFridayPayouts"];
let fridayPayoutWindow: ((now: Date) => { cohortNoon: Date } | null) | undefined;
const mockWalletFunding = vi.fn(async () => ({
  walletId: "wallet_fitout_test", availableCents: 10_000_000, feeCents: 1_000,
  observedAt: new Date("2026-10-02T04:00:00.000Z"),
}));
const mockLookup = vi.fn<(...args: [string]) => Promise<Array<{
  id: string; status: string; referenceNumber: string; amount: number; currency: string;
}>>>(async () => []);

const BOOKER = "sweep_booker";
const FRIDAY_NOON = new Date("2026-10-02T04:00:00.000Z");

let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;

/** A due timestamp: comfortably past ends_at + PAYOUT_DELAY_HOURS (payOne itself ignores time). */
const dueMs = () => Date.now() - (PAYOUT_DELAY_HOURS + 1) * 3_600_000;

/**
 * Insert a host user + an ACTIVATED host_payout with a unique Linked-Account id + the ops-APPROVED
 * host_verification row deriveBookable's sixth term reads (phase 18, D-224) — through the one shared
 * fixture expression, so "a host who can sell" means the same three rows across the whole suite.
 */
async function makeHost(): Promise<{ hostId: string; accountId: string }> {
  const hostId = uid("host");
  const accountId = uid("acct");
  await makeVerifiedHost(testDb.db, hostId, {
    name: "Host",
    email: `${hostId}@example.com`,
    firstName: "Host",
    paymongoAccountId: accountId,
    payoutDestinationNumber: accountId,
  });
  return { hostId, accountId };
}

async function makeListing(hostId: string): Promise<string> {
  const id = uid("listing");
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: "Sweep Listing",
    status: "published",
    reviewState: "approved",
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 150000,
    dayRateCents: 300000,
    currency: "php",
  });
  return id;
}

async function makeBooking(opts: {
  listingId: string;
  status: "pending" | "confirmed" | "cancelled";
  quotedTotalCents: number;
  endsAtMs: number;
  /** Defaults to quotedTotalCents (the pre-service-fee shape drizzle/0014 backfilled). */
  spacePriceCents?: number | null;
  serviceFeeCents?: number;
  /** D-69: the retained (non-refunded) space price on a cancellation. null ⇒ not cancelled. */
  retainedSpaceCents?: number | null;
  settled?: boolean;
}): Promise<string> {
  const id = uid("bk");
  const endsAt = new Date(opts.endsAtMs);
  const startsAt = new Date(opts.endsAtMs - 3_600_000); // 1-hour window
  await testDb.db.insert(booking).values({
    id,
    listingId: opts.listingId,
    unit: 1,
    bookerId: BOOKER,
    startsAt,
    endsAt,
    status: opts.status,
    paymentId: `pay_${id}`,
    quotedTotalCents: opts.quotedTotalCents,
    // 07-04 Finding 2: the sweep's payout basis is space_price_cents, NOT the all-in charged total. With
    // no service fee the two are equal — exactly what drizzle/0014 backfilled for pre-Phase-7 rows.
    spacePriceCents: opts.spacePriceCents === undefined ? opts.quotedTotalCents : opts.spacePriceCents,
    serviceFeeCents: opts.serviceFeeCents ?? 0,
    retainedSpaceCents: opts.retainedSpaceCents ?? null,
    currency: "php",
    expiresAt: opts.status === "pending" ? endsAt : null,
  });
  if (opts.settled !== false) {
    await recordSettlementObservation(id, {
      paymentId: `pay_${id}`, payoutId: `po_${id}`, transactionId: `txn_${id}`,
      transactionType: "payment", currency: "PHP", liveMode: true,
      providerStatus: "deposited", destinationMatched: true, paginationComplete: true,
      mappingVerified: true, providerStatusAt: new Date(FRIDAY_NOON.getTime() - 3_600_000),
      verifiedAt: new Date(FRIDAY_NOON.getTime() - 60_000),
    }, testDb.db);
  }
  return id;
}

/**
 * Seed a D-71 SIGNED DEBIT row (kind='host_cancel_fee') for a host. gross/net are NEGATIVE and commission
 * is 0 — a debit never transfers, it only nets against a future payout, accumulating recovered_cents
 * toward -net_cents. Inserted `held`, which is precisely why every payout query must be kind-scoped.
 */
async function seedDebit(hostId: string, bookingId: string, feeCents: number): Promise<void> {
  await testDb.db.insert(hostPayoutLedger).values({
    id: uid("debit"),
    bookingId,
    hostId,
    paymentId: null,
    grossCents: -feeCents,
    commissionRateBps: 0,
    commissionCents: 0,
    netCents: -feeCents,
    currency: "php",
    state: "held",
    kind: "host_cancel_fee",
  });
}

/** Read a host's debit rows (kind-scoped — the payout row for the same booking must never be returned). */
async function readDebits(hostId: string) {
  return testDb.db
    .select()
    .from(hostPayoutLedger)
    .where(
      and(eq(hostPayoutLedger.hostId, hostId), eq(hostPayoutLedger.kind, "host_cancel_fee")),
    );
}

function duePayout(opts: {
  bookingId: string;
  listingId: string;
  hostId: string;
  accountId: string | null;
  payoutGrossCents: number;
}): DuePayout {
  return {
    bookingId: opts.bookingId,
    listingId: opts.listingId,
    payoutGrossCents: opts.payoutGrossCents,
    currency: "php",
    hostId: opts.hostId,
    paymentId: `pay_${opts.bookingId}`,
    paymongoAccountId: opts.accountId,
    institutionBic: "TESTPHM2XXX",
    accountNameCiphertext: encryptPayoutRecipientValue("Test Host"),
    accountNumberCiphertext: encryptPayoutRecipientValue(opts.accountId ?? "9990001111"),
  };
}

/** Read a booking's PAYOUT row. kind-scoped so a coexisting host_cancel_fee debit is never picked up. */
async function readLedger(bookingId: string) {
  const [row] = await testDb.db
    .select()
    .from(hostPayoutLedger)
    .where(
      and(eq(hostPayoutLedger.bookingId, bookingId), eq(hostPayoutLedger.kind, "payout")),
    );
  return row;
}

/** All payout rows for a booking — used to assert "exactly one" without the kind scope masking a dupe. */
async function readPayoutRows(bookingId: string) {
  return testDb.db
    .select()
    .from(hostPayoutLedger)
    .where(
      and(eq(hostPayoutLedger.bookingId, bookingId), eq(hostPayoutLedger.kind, "payout")),
    );
}

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY_NOON);
  testDb = await setupTestDb();
  await testDb.db.insert(user).values({
    id: BOOKER,
    name: "Sweep Booker",
    email: "sweep_booker@example.com",
    firstName: "Booker",
  });
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("@/lib/paymongo", () => ({
    readPayoutWalletFunding: mockWalletFunding,
    findHostPayoutTransfers: mockLookup,
    createExternalHostPayout: mockPayMongo.createBatchTransfer,
    createBatchTransfer: mockPayMongo.createBatchTransfer,
    listWalletAccounts: mockPayMongo.listWalletAccounts,
    createCheckoutSession: mockPayMongo.createCheckoutSession,
    createRefund: mockPayMongo.createRefund,
  }));
  vi.resetModules();
  const sweep = await import("@/inngest/functions/payout-sweep");
  ({ queryDuePayouts, payOne, recordMissedFridayPayouts } = sweep);
  fridayPayoutWindow = (sweep as unknown as { fridayPayoutWindow?: typeof fridayPayoutWindow }).fridayPayoutWindow;
});

describe("Friday Wallet funding preflight (HPAY-03)", () => {
  async function candidate(grossCents = 200000) {
    const host = await makeHost();
    const listingId = await makeListing(host.hostId);
    const bookingId = await makeBooking({ listingId, status: "confirmed", quotedTotalCents: grossCents,
      endsAtMs: FRIDAY_NOON.getTime() - 48 * 3_600_000 });
    return { bookingId, b: duePayout({ bookingId, listingId, hostId: host.hostId,
      accountId: host.accountId, payoutGrossCents: grossCents }) };
  }

  it("permits exact available coverage of the net amount and fee", async () => {
    const { b } = await candidate();
    mockWalletFunding.mockResolvedValueOnce({ walletId: "wallet_fitout_test", availableCents: 181000,
      feeCents: 1000, observedAt: FRIDAY_NOON });
    mockPayMongo.createBatchTransfer.mockClear();
    expect((await payOne(testDb.db, b)).status).toBe("paid");
    expect(mockPayMongo.createBatchTransfer).toHaveBeenCalledTimes(1);
  });

  it("waits unclaimed when available funds are one centavo short", async () => {
    const { bookingId, b } = await candidate();
    mockWalletFunding.mockResolvedValueOnce({ walletId: "wallet_fitout_test", availableCents: 180999,
      feeCents: 1000, observedAt: FRIDAY_NOON });
    mockPayMongo.createBatchTransfer.mockClear();
    expect((await payOne(testDb.db, b)).status).toBe("skipped-no-wallet");
    expect(await readLedger(bookingId)).toBeUndefined();
    expect(mockPayMongo.createBatchTransfer).not.toHaveBeenCalled();
  });

  it("never spends pending-only funds or an unknown fee", async () => {
    const first = await candidate();
    const second = await candidate();
    mockWalletFunding.mockResolvedValueOnce({ walletId: "wallet_fitout_test", availableCents: 0,
      feeCents: 1000, observedAt: FRIDAY_NOON });
    mockWalletFunding.mockResolvedValueOnce({ walletId: "wallet_fitout_test", availableCents: 500000,
      feeCents: Number.NaN, observedAt: FRIDAY_NOON });
    expect((await payOne(testDb.db, first.b)).status).toBe("skipped-no-wallet");
    expect((await payOne(testDb.db, second.b)).status).toBe("skipped-no-wallet");
    expect(await readLedger(first.bookingId)).toBeUndefined();
    expect(await readLedger(second.bookingId)).toBeUndefined();
  });

  it("treats a stale or inaccessible Wallet read as waiting without a failed claim", async () => {
    const first = await candidate();
    const second = await candidate();
    mockWalletFunding.mockResolvedValueOnce({ walletId: "wallet_fitout_test", availableCents: 500000,
      feeCents: 1000, observedAt: new Date(FRIDAY_NOON.getTime() - 10 * 60_000) });
    mockWalletFunding.mockRejectedValueOnce(new Error("wallet unavailable"));
    expect((await payOne(testDb.db, first.b)).status).toBe("skipped-no-wallet");
    expect((await payOne(testDb.db, second.b)).status).toBe("skipped-no-wallet");
    expect(await readLedger(first.bookingId)).toBeUndefined();
    expect(await readLedger(second.bookingId)).toBeUndefined();
  });

  it("does not apply a host debit while Wallet funding waits", async () => {
    const { bookingId, b } = await candidate();
    await seedDebit(b.hostId, bookingId, 30000);
    mockWalletFunding.mockResolvedValueOnce({ walletId: "wallet_fitout_test", availableCents: 150999,
      feeCents: 1000, observedAt: FRIDAY_NOON });
    expect((await payOne(testDb.db, b)).status).toBe("skipped-no-wallet");
    expect(await readLedger(bookingId)).toBeUndefined();
    expect((await readDebits(b.hostId))[0].recoveredCents).toBe(0);
  });

  it("rechecks a suspension and destination revocation after due selection", async () => {
    const suspended = await candidate();
    const revoked = await candidate();
    const due = await queryDuePayouts(testDb.db, FRIDAY_NOON);
    expect(due.map((row) => row.bookingId)).toEqual(expect.arrayContaining([
      suspended.bookingId, revoked.bookingId,
    ]));
    await testDb.db.update(hostVerification).set({ status: "suspended" })
      .where(eq(hostVerification.userId, suspended.b.hostId));
    await testDb.db.update(hostPayoutDestination).set({ verificationStatus: "pending" })
      .where(eq(hostPayoutDestination.userId, revoked.b.hostId));
    mockPayMongo.createBatchTransfer.mockClear();
    expect((await payOne(testDb.db, suspended.b)).status).toBe("skipped-claimed");
    expect((await payOne(testDb.db, revoked.b)).status).toBe("skipped-claimed");
    expect(await readLedger(suspended.bookingId)).toBeUndefined();
    expect(await readLedger(revoked.bookingId)).toBeUndefined();
    expect(mockPayMongo.createBatchTransfer).not.toHaveBeenCalled();
  });

  it("commits the held claim before the provider can accept a transfer", async () => {
    const { bookingId, b } = await candidate();
    mockPayMongo.createBatchTransfer.mockImplementationOnce(async () => {
      expect((await readLedger(bookingId)).state).toBe("held");
      return { batchId: "batch_claim_first", transferId: "tr_claim_first", status: "pending" };
    });
    expect((await payOne(testDb.db, b)).status).toBe("paid");
    expect((await readLedger(bookingId)).state).toBe("processing");
  });

  it("serializes two bookings against one balance snapshot", async () => {
    const first = await candidate();
    const second = await candidate();
    const [{ reserved }] = (await testDb.db.execute(sql`
      SELECT (COALESCE(SUM(GREATEST(net_cents - recovered_cents, 0)), 0)
        + COUNT(*) * 1000)::int AS "reserved"
      FROM host_payout_ledger WHERE kind = 'payout' AND state IN ('held', 'processing')
    `)) as unknown as Array<{ reserved: number }>;
    mockWalletFunding.mockResolvedValue({ walletId: "wallet_fitout_test", availableCents: reserved + 181000,
      feeCents: 1000, observedAt: FRIDAY_NOON });
    const clients = makeRacingClients(testDb.schema, 2);
    try {
      const results = await Promise.all([
        payOne(drizzle(clients[0]), first.b), payOne(drizzle(clients[1]), second.b),
      ]);
      expect(results.filter((result) => result.status === "paid")).toHaveLength(1);
      expect(results.filter((result) => result.status === "skipped-no-wallet")).toHaveLength(1);
      expect([await readLedger(first.bookingId), await readLedger(second.bookingId)]
        .filter(Boolean)).toHaveLength(1);
    } finally {
      await Promise.all(clients.map((client) => client.end()));
      mockWalletFunding.mockResolvedValue({ walletId: "wallet_fitout_test", availableCents: 10_000_000,
        feeCents: 1000, observedAt: FRIDAY_NOON });
    }
  });
});

describe("Friday Manila dispatch window (HPAY-02)", () => {
  const cases: Array<[string, string, string | null]> = [
    ["Thursday", "2026-10-01T04:00:00.000Z", null],
    ["Friday one second before noon", "2026-10-02T03:59:59.000Z", null],
    ["Friday noon", "2026-10-02T04:00:00.000Z", "2026-10-02T04:00:00.000Z"],
    ["Friday 23:00", "2026-10-02T15:00:00.000Z", "2026-10-02T04:00:00.000Z"],
    ["Friday one second after 23:00", "2026-10-02T15:00:01.000Z", null],
    ["Saturday", "2026-10-03T04:00:00.000Z", null],
  ];
  it.each(cases)("%s maps to the fixed noon cohort only inside the release window", (_label, instant, expected) => {
    expect(fridayPayoutWindow?.(new Date(instant))?.cohortNoon.toISOString() ?? null).toBe(expected);
  });

  it("does not select an otherwise due booking without its own deposited settlement proof", async () => {
    const host = await makeHost();
    const listingId = await makeListing(host.hostId);
    const bookingId = await makeBooking({ listingId, status: "confirmed", quotedTotalCents: 200000,
      endsAtMs: new Date("2026-09-20T00:00:00.000Z").getTime(), settled: false });
    const due = await queryDuePayouts(testDb.db, new Date("2026-10-02T04:00:00.000Z"));
    expect(due.map((row) => row.bookingId)).not.toContain(bookingId);
  });

  it("keeps the post-session review hold at least 24 hours", () => {
    expect(PAYOUT_HOLD_HOURS).toBeGreaterThanOrEqual(24);
  });

  it("requires the hold at Friday noon to the millisecond, including a Thursday afternoon end", async () => {
    const host = await makeHost();
    const exact = await makeBooking({ listingId: await makeListing(host.hostId), status: "confirmed", quotedTotalCents: 200000,
      endsAtMs: FRIDAY_NOON.getTime() - PAYOUT_HOLD_HOURS * 3_600_000 });
    const oneMsLate = await makeBooking({ listingId: await makeListing(host.hostId), status: "confirmed", quotedTotalCents: 200000,
      endsAtMs: FRIDAY_NOON.getTime() - PAYOUT_HOLD_HOURS * 3_600_000 + 1 });
    const thursdayAfternoon = await makeBooking({ listingId: await makeListing(host.hostId), status: "confirmed", quotedTotalCents: 200000,
      endsAtMs: new Date("2026-10-01T08:00:00.000Z").getTime() });
    const ids = (await queryDuePayouts(testDb.db, FRIDAY_NOON)).map((row) => row.bookingId);
    expect(ids).toContain(exact);
    expect(ids).not.toContain(oneMsLate);
    expect(ids).not.toContain(thursdayAfternoon);
  });

  it("holds a deposit first verified after noon until a later Friday", async () => {
    const host = await makeHost();
    const listingId = await makeListing(host.hostId);
    const bookingId = await makeBooking({ listingId, status: "confirmed", quotedTotalCents: 200000,
      endsAtMs: FRIDAY_NOON.getTime() - 48 * 3_600_000, settled: false });
    await recordSettlementObservation(bookingId, {
      paymentId: `pay_${bookingId}`, payoutId: `po_${bookingId}`, transactionId: `txn_${bookingId}`,
      transactionType: "payment", currency: "PHP", liveMode: true,
      providerStatus: "deposited", destinationMatched: true, paginationComplete: true,
      mappingVerified: true, providerStatusAt: new Date(FRIDAY_NOON.getTime() - 3_600_000),
      verifiedAt: new Date(FRIDAY_NOON.getTime() + 60_000),
    }, testDb.db);
    const fridayAfternoon = new Date(FRIDAY_NOON.getTime() + 3_600_000);
    expect((await queryDuePayouts(testDb.db, fridayAfternoon)).map((row) => row.bookingId))
      .not.toContain(bookingId);
  });

  it("keeps a noon-qualified deposit eligible when the same provider version is refreshed after noon", async () => {
    const host = await makeHost();
    const listingId = await makeListing(host.hostId);
    const bookingId = await makeBooking({ listingId, status: "confirmed", quotedTotalCents: 200000,
      endsAtMs: FRIDAY_NOON.getTime() - 48 * 3_600_000 });
    await recordSettlementObservation(bookingId, {
      paymentId: `pay_${bookingId}`, payoutId: `po_${bookingId}`, transactionId: `txn_${bookingId}`,
      transactionType: "payment", currency: "PHP", liveMode: true,
      providerStatus: "deposited", destinationMatched: true, paginationComplete: true,
      mappingVerified: true, providerStatusAt: new Date(FRIDAY_NOON.getTime() - 3_600_000),
      verifiedAt: new Date(FRIDAY_NOON.getTime() + 30 * 60_000),
    }, testDb.db);
    const fridayAfternoon = new Date(FRIDAY_NOON.getTime() + 3_600_000);
    expect((await queryDuePayouts(testDb.db, fridayAfternoon)).map((row) => row.bookingId))
      .toContain(bookingId);
  });

  it("refuses off-window direct dispatch even with a due booking", async () => {
    const host = await makeHost();
    const listingId = await makeListing(host.hostId);
    const bookingId = await makeBooking({ listingId, status: "confirmed", quotedTotalCents: 200000,
      endsAtMs: FRIDAY_NOON.getTime() - 48 * 3_600_000 });
    const b = duePayout({ bookingId, listingId, hostId: host.hostId,
      accountId: host.accountId, payoutGrossCents: 200000 });
    expect((await payOne(testDb.db, b, new Date("2026-10-01T04:00:00.000Z"))).status)
      .toBe("skipped-claimed");
    expect(await readLedger(bookingId)).toBeUndefined();
  });
});

describe("Friday 23:00 exception handoff (HPAY-06)", () => {
  it("keeps a missing-settlement booking in the owned queue once, but excludes a next-week joiner", async () => {
    const host = await makeHost();
    const due = await makeBooking({ listingId: await makeListing(host.hostId), status: "confirmed",
      quotedTotalCents: 200000, endsAtMs: FRIDAY_NOON.getTime() - 48 * 3_600_000, settled: false });
    const nextWeek = await makeBooking({ listingId: await makeListing(host.hostId), status: "confirmed",
      quotedTotalCents: 200000, endsAtMs: FRIDAY_NOON.getTime() - 2 * 3_600_000, settled: false });
    const cutoff = new Date("2026-10-02T15:00:00.000Z");
    await recordMissedFridayPayouts(testDb.db, cutoff);
    await recordMissedFridayPayouts(testDb.db, cutoff);
    const rows = (await testDb.db.execute(sql`
      SELECT meta->>'bookingRef' AS ref, meta->>'cause' AS cause FROM audit
      WHERE action = 'host_payout_recovery' AND outcome = 'needs_attention'
    `)) as unknown as Array<{ ref: string; cause: string }>;
    expect(rows.filter((row) => row.ref === bookingExceptionRef(due) && row.cause === "missed_friday_cutoff")).toHaveLength(1);
    expect(rows.filter((row) => row.ref === bookingExceptionRef(due) && row.cause === "settlement_missing")).toHaveLength(1);
    expect(rows.some((row) => row.ref === bookingExceptionRef(nextWeek))).toBe(false);
    expect(await readPayoutRows(due)).toHaveLength(0);
  });
});

afterAll(async () => {
  vi.useRealTimers();
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  await teardownTestDb(testDb);
});

describe("payout sweep — due selection (PAY-03, D-55/56)", () => {
  it("selects only confirmed bookings past ends_at + PAYOUT_DELAY_HOURS with no ledger row", async () => {
    const A = await makeHost();
    const L = await makeListing(A.hostId);

    const dueId = await makeBooking({
      listingId: L,
      status: "confirmed",
      quotedTotalCents: 200000,
      endsAtMs: dueMs(), // ended > PAYOUT_DELAY_HOURS ago → DUE
    });
    const notDueId = await makeBooking({
      listingId: L,
      status: "confirmed",
      quotedTotalCents: 200000,
      endsAtMs: Date.now() + 3_600_000, // session in the future → NOT due (never paid before the session)
    });
    const pendingId = await makeBooking({
      listingId: L,
      status: "pending",
      quotedTotalCents: 200000,
      endsAtMs: Date.now() - 5 * 3_600_000, // past, but unpaid hold → excluded by status
    });

    const due = await queryDuePayouts(testDb.db);
    const ids = due.map((d) => d.bookingId);
    expect(ids).toContain(dueId);
    expect(ids).not.toContain(notDueId);
    expect(ids).not.toContain(pendingId);

    // The returned row carries an institution allow-list identifier, never an arbitrary global wallet id.
    const row = due.find((d) => d.bookingId === dueId)!;
    expect(row.institutionBic).toBe("TESTPHM2XXX");
    // Finding 2: the sweep's basis is the SPACE price, exposed as payoutGrossCents (never the all-in total).
    expect(row.payoutGrossCents).toBe(200000);
  });
});

describe("payout sweep — happy payout (PAY-03/PAY-02, D-51/52/56)", () => {
  it("writes ONE processing ledger row with frozen commission and transfers net to the host's own wallet", async () => {
    const A = await makeHost();
    mockPayMongo.listWalletAccounts.mockResolvedValue([
      { id: A.accountId, accountNumber: "9990001111", accountName: "Host A Wallet", status: "activated" },
    ]);
    const L = await makeListing(A.hostId);
    const bkId = await makeBooking({
      listingId: L,
      status: "confirmed",
      quotedTotalCents: 200000,
      endsAtMs: dueMs(),
    });

    const res = await payOne(
      testDb.db,
      duePayout({ bookingId: bkId, listingId: L, hostId: A.hostId, accountId: A.accountId, payoutGrossCents: 200000 }),
    );
    expect(res.status).toBe("paid");

    // Exactly one ledger row, released to Processing, commission FROZEN (10% of 200000), transfer id set.
    const rows = await testDb.db
      .select()
      .from(hostPayoutLedger)
      .where(eq(hostPayoutLedger.bookingId, bkId));
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.state).toBe("processing");
    expect(row.commissionRateBps).toBe(1000);
    expect(row.commissionCents).toBe(20000);
    expect(row.netCents).toBe(180000);
    expect(row.transferId).toBe("tr_test_123");

    // createBatchTransfer fired once, sending exactly net_cents to HOST A's wallet number.
    expect(mockPayMongo.createBatchTransfer).toHaveBeenCalledTimes(1);
    const arg = mockPayMongo.createBatchTransfer.mock.calls[0][0] as {
      netCents: number;
      destination: { number: string };
    };
    expect(arg.netCents).toBe(180000);
    expect(arg.destination.number).toBe(A.accountId);
  });
});

describe("payout sweep — at-most-once under concurrency (T-05-23)", () => {
  it("two independent sweeps of the SAME booking → exactly one ledger row and at most one transfer", async () => {
    const A = await makeHost();
    mockPayMongo.listWalletAccounts.mockResolvedValue([
      { id: A.accountId, accountNumber: "9990002222", accountName: "Host A Wallet", status: "activated" },
    ]);
    const L = await makeListing(A.hostId);
    const bkId = await makeBooking({
      listingId: L,
      status: "confirmed",
      quotedTotalCents: 200000,
      endsAtMs: dueMs(),
    });
    const b = duePayout({
      bookingId: bkId,
      listingId: L,
      hostId: A.hostId,
      accountId: A.accountId,
      payoutGrossCents: 200000,
    });

    // Two GENUINELY concurrent connections (makeRacingClients — the max:1 shared client would serialize).
    const [c1, c2] = makeRacingClients(testDb.schema, 2);
    try {
      const results = await Promise.all([payOne(drizzle(c1), b), payOne(drizzle(c2), b)]);
      const paid = results.filter((r) => r.status === "paid").length;
      const skipped = results.filter((r) => r.status === "skipped-claimed").length;
      expect(paid).toBe(1); // exactly one sweep won the claim and fired the transfer
      expect(skipped).toBe(1); // the ON CONFLICT loser fired nothing
    } finally {
      await c1.end();
      await c2.end();
    }

    // The DB — not app code — enforces at-most-once: exactly one ledger row, ≤1 transfer for this booking.
    const rows = await testDb.db
      .select()
      .from(hostPayoutLedger)
      .where(eq(hostPayoutLedger.bookingId, bkId));
    expect(rows).toHaveLength(1);
    expect(mockPayMongo.createBatchTransfer.mock.calls.length).toBeLessThanOrEqual(1);
  });
});

describe("payout sweep — multi-host wallet correlation (T-05-33)", () => {
  it("booking A pays host A's wallet and booking B pays host B's — never cross-delivered", async () => {
    const A = await makeHost();
    const B = await makeHost();
    mockPayMongo.listWalletAccounts.mockResolvedValue([
      { id: A.accountId, accountNumber: "AAA", accountName: "Host A Wallet", status: "activated" },
      { id: B.accountId, accountNumber: "BBB", accountName: "Host B Wallet", status: "activated" },
    ]);
    const LA = await makeListing(A.hostId);
    const LB = await makeListing(B.hostId);
    const bkA = await makeBooking({ listingId: LA, status: "confirmed", quotedTotalCents: 200000, endsAtMs: dueMs() });
    const bkB = await makeBooking({ listingId: LB, status: "confirmed", quotedTotalCents: 200000, endsAtMs: dueMs() });

    await payOne(
      testDb.db,
      duePayout({ bookingId: bkA, listingId: LA, hostId: A.hostId, accountId: A.accountId, payoutGrossCents: 200000 }),
    );
    await payOne(
      testDb.db,
      duePayout({ bookingId: bkB, listingId: LB, hostId: B.hostId, accountId: B.accountId, payoutGrossCents: 200000 }),
    );

    const numbers = mockPayMongo.createBatchTransfer.mock.calls.map(
      (c) => (c[0] as { destination: { number: string } }).destination.number,
    );
    // A and B retain independently encrypted, host-bound destinations; no global wallet enumeration is used.
    expect(numbers).toEqual([A.accountId, B.accountId]);
    const [rowA, rowB] = [await readLedger(bkA), await readLedger(bkB)];
    expect(rowA.transferId).toBe("tr_test_123");
    expect(rowB.transferId).toBe("tr_test_123");
  });
});

describe("payout sweep — external destination isolation (T-05-27 / CR-01)", () => {
  it("does not inspect or select any global PayMongo wallet when releasing a verified destination", async () => {
    const C = await makeHost();
    // Only OTHER hosts' wallets are activated — host C's Linked-Account id is absent.
    mockPayMongo.listWalletAccounts.mockResolvedValue([
      { id: "acct_other_A", accountNumber: "AAA", accountName: "Host A Wallet", status: "activated" },
      { id: "acct_other_B", accountNumber: "BBB", accountName: "Host B Wallet", status: "activated" },
    ]);
    const L = await makeListing(C.hostId);
    const bkC = await makeBooking({ listingId: L, status: "confirmed", quotedTotalCents: 200000, endsAtMs: dueMs() });

    const res = await payOne(
      testDb.db,
      duePayout({ bookingId: bkC, listingId: L, hostId: C.hostId, accountId: C.accountId, payoutGrossCents: 200000 }),
    );

    expect(res.status).toBe("paid");
    expect(mockPayMongo.listWalletAccounts).not.toHaveBeenCalled();
    expect(mockPayMongo.createBatchTransfer).toHaveBeenCalledTimes(1);

    // The verified destination is released and the legacy wallets were never an input to the decision.
    const row = await readLedger(bkC);
    expect(row?.state).toBe("processing");
  });
});

describe("payout sweep — uncertain create recovery (HPAY-04)", () => {
  it("finds an accepted timeout by exact booking reference after key expiry without a second POST", async () => {
    const A = await makeHost();
    mockPayMongo.listWalletAccounts.mockResolvedValue([
      { id: A.accountId, accountNumber: "9990003333", accountName: "Host A Wallet", status: "activated" },
    ]);
    const L = await makeListing(A.hostId);
    const bkId = await makeBooking({
      listingId: L,
      status: "confirmed",
      quotedTotalCents: 200000,
      endsAtMs: dueMs(),
    });
    const b = duePayout({
      bookingId: bkId,
      listingId: L,
      hostId: A.hostId,
      accountId: A.accountId,
      payoutGrossCents: 200000,
    });

    // An uncertain provider response leaves a durable held claim and cannot be blindly retried.
    mockPayMongo.createBatchTransfer.mockRejectedValueOnce(new Error("paymongo 503"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const first = await payOne(testDb.db, b);
    expect(first.status).toBe("held-uncertain");
    expect((await readLedger(bkId)).state).toBe("held");
    expect((await payOne(testDb.db, b)).status).toBe("held-uncertain");

    mockLookup.mockResolvedValueOnce([{
      id: "tr_accepted", status: "pending", referenceNumber: `host-payout-${bkId}`,
      amount: 180000, currency: "PHP",
    }]);
    const second = await payOne(testDb.db, b, new Date(FRIDAY_NOON.getTime() + 7 * 24 * 3_600_000));
    expect(second.status).toBe("skipped-claimed");
    spy.mockRestore();

    // Exactly ONE ledger row throughout (the re-claim never mints a second), now released to processing with
    // the retry's transfer id.
    const rows = await testDb.db
      .select()
      .from(hostPayoutLedger)
      .where(eq(hostPayoutLedger.bookingId, bkId));
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe("processing");
    expect(rows[0].transferId).toBe("tr_accepted");
    expect(mockLookup).toHaveBeenCalledWith(bkId);
    expect(mockPayMongo.createBatchTransfer).toHaveBeenCalledTimes(1);
  });

  it("keeps an ambiguous or inaccessible prior claim held and never resends", async () => {
    const A = await makeHost();
    const L = await makeListing(A.hostId);
    const bkId = await makeBooking({ listingId: L, status: "confirmed", quotedTotalCents: 200000,
      endsAtMs: dueMs() });
    const b = duePayout({ bookingId: bkId, listingId: L, hostId: A.hostId,
      accountId: A.accountId, payoutGrossCents: 200000 });
    mockPayMongo.createBatchTransfer.mockRejectedValueOnce(new Error("timeout"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await payOne(testDb.db, b);
    mockLookup.mockResolvedValueOnce([
      { id: "tr_1", status: "pending", referenceNumber: `host-payout-${bkId}`, amount: 180000, currency: "PHP" },
      { id: "tr_2", status: "pending", referenceNumber: `host-payout-${bkId}`, amount: 180000, currency: "PHP" },
    ]).mockRejectedValueOnce(new Error("403"));
    expect((await payOne(testDb.db, b)).status).toBe("held-uncertain");
    expect((await payOne(testDb.db, b)).status).toBe("held-uncertain");
    expect((await readLedger(bkId)).state).toBe("held");
    expect(mockPayMongo.createBatchTransfer).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("treats a crash after the durable claim and a wrong-reference response as unresolved", async () => {
    const A = await makeHost();
    const L = await makeListing(A.hostId);
    const bkId = await makeBooking({ listingId: L, status: "confirmed", quotedTotalCents: 200000,
      endsAtMs: dueMs() });
    const b = duePayout({ bookingId: bkId, listingId: L, hostId: A.hostId,
      accountId: A.accountId, payoutGrossCents: 200000 });
    await testDb.db.insert(hostPayoutLedger).values({ id: uid("ledger"), bookingId: bkId,
      hostId: A.hostId, paymentId: `pay_${bkId}`, grossCents: 200000,
      commissionRateBps: 1000, commissionCents: 20000, netCents: 180000,
      currency: "php", state: "held", kind: "payout" });
    mockLookup.mockResolvedValueOnce([{ id: "tr_foreign", status: "succeeded",
      referenceNumber: "host-payout-someone-else", amount: 180000, currency: "PHP" }]);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await payOne(testDb.db, b)).status).toBe("held-uncertain");
    expect((await readLedger(bkId)).transferId).toBeNull();
    expect(mockPayMongo.createBatchTransfer).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("queryDuePayouts re-selects a backed-off `failed` row within the retry window", async () => {
    const A = await makeHost();
    const L = await makeListing(A.hostId);
    const bkId = await makeBooking({
      listingId: L,
      status: "confirmed",
      quotedTotalCents: 200000,
      endsAtMs: dueMs(),
    });
    // A `failed` row whose last attempt (updated_at) is well past the 1h backoff but whose original claim
    // (created_at) is still inside the 72h max-age window → eligible for an automated retry.
    await testDb.db.insert(hostPayoutLedger).values({
      id: uid("ledger"),
      bookingId: bkId,
      hostId: A.hostId,
      paymentId: null,
      grossCents: 200000,
      commissionRateBps: 1000,
      commissionCents: 20000,
      netCents: 180000,
      currency: "php",
      state: "failed",
      createdAt: new Date(Date.now() - 3 * 3_600_000),
      updatedAt: new Date(Date.now() - 3 * 3_600_000),
    });

    const due = await queryDuePayouts(testDb.db);
    expect(due.map((d) => d.bookingId)).toContain(bkId);
  });
});

// ---------------------------------------------------------------------------
// 07-04 — the Phase-7 payout invariants (07-RESEARCH Findings 1/2/3, D-69/D-71/D-74).
// ---------------------------------------------------------------------------

describe("payout sweep — retained cancellation IS swept (Finding 1, D-69)", () => {
  it("selects a cancelled booking with retained > 0 and grosses the payout on the RETAINED amount", async () => {
    const A = await makeHost();
    mockPayMongo.listWalletAccounts.mockResolvedValue([
      { id: A.accountId, accountNumber: "RET0001", accountName: "Host A Wallet", status: "activated" },
    ]);
    const L = await makeListing(A.hostId);
    // A Standard-tier booking cancelled at the 50% rung: 100000 space + 5000 fee, 50000 refunded, 50000 kept.
    const bkId = await makeBooking({
      listingId: L,
      status: "cancelled",
      quotedTotalCents: 105000,
      spacePriceCents: 100000,
      serviceFeeCents: 5000,
      retainedSpaceCents: 50000,
      endsAtMs: dueMs(),
    });

    // Before this plan the sweep's status='confirmed' predicate skipped this row forever — the host was
    // owed 45000 of the retained 50000 (D-69) and would NEVER have received it.
    const due = await queryDuePayouts(testDb.db);
    const row = due.find((d) => d.bookingId === bkId);
    expect(row).toBeDefined();
    expect(row!.payoutGrossCents).toBe(50000); // the RETAINED space price — not 100000, not 105000

    const res = await payOne(
      testDb.db,
      duePayout({ bookingId: bkId, listingId: L, hostId: A.hostId, accountId: A.accountId, payoutGrossCents: 50000 }),
    );
    expect(res.status).toBe("paid");

    const rows = await readPayoutRows(bkId);
    expect(rows).toHaveLength(1); // exactly ONE ledger row
    expect(rows[0].grossCents).toBe(50000);
    expect(rows[0].netCents).toBe(45000); // retained − 10% commission (D-69)
  });
});

describe("payout sweep — a host-cancelled booking produces NOTHING (D-70/D-71)", () => {
  it("is never selected and writes zero ledger rows when retained is 0", async () => {
    const A = await makeHost();
    const L = await makeListing(A.hostId);
    // A HOST cancellation refunds the booker in full, so retained = 0: the host gets no payout AND owes
    // the D-71 fee. The "retained > 0" half of the widened predicate is what enforces that.
    const bkId = await makeBooking({
      listingId: L,
      status: "cancelled",
      quotedTotalCents: 105000,
      spacePriceCents: 100000,
      serviceFeeCents: 5000,
      retainedSpaceCents: 0,
      endsAtMs: dueMs(),
    });

    const due = await queryDuePayouts(testDb.db);
    expect(due.map((d) => d.bookingId)).not.toContain(bkId);
    expect(await readPayoutRows(bkId)).toHaveLength(0);
  });
});

describe("payout sweep — the service fee is NEVER paid out (Finding 2 / T-07-16, D-74)", () => {
  it("grosses on the space price, not the all-in charged total", async () => {
    const A = await makeHost();
    mockPayMongo.listWalletAccounts.mockResolvedValue([
      { id: A.accountId, accountNumber: "FEE0001", accountName: "Host A Wallet", status: "activated" },
    ]);
    const L = await makeListing(A.hostId);
    const CHARGED_TOTAL = 105000; // what the booker PAID: space 100000 + the 5% service fee 5000
    const bkId = await makeBooking({
      listingId: L,
      status: "confirmed",
      quotedTotalCents: CHARGED_TOTAL,
      spacePriceCents: 100000,
      serviceFeeCents: 5000,
      endsAtMs: dueMs(),
    });

    const due = await queryDuePayouts(testDb.db);
    expect(due.find((d) => d.bookingId === bkId)!.payoutGrossCents).toBe(100000);

    await payOne(
      testDb.db,
      duePayout({ bookingId: bkId, listingId: L, hostId: A.hostId, accountId: A.accountId, payoutGrossCents: 100000 }),
    );

    const row = await readLedger(bkId);
    expect(row.grossCents).toBe(100000);
    // The load-bearing assertion: grossing on the CHARGED total would pay the host 90% of the platform's
    // OWN service fee, inverting the entire purpose of D-74.
    expect(row.grossCents).not.toBe(CHARGED_TOTAL);
    expect(row.netCents).toBe(90000); // 100000 − 10%, NOT 94500 (= 105000 − 10%)
  });
});

describe("payout sweep — D-71 debit netting (netting floor)", () => {
  it("deducts an outstanding host_cancel_fee from the transfer and marks the debit paid once recovered", async () => {
    const A = await makeHost();
    mockPayMongo.listWalletAccounts.mockResolvedValue([
      { id: A.accountId, accountNumber: "NET0001", accountName: "Host A Wallet", status: "activated" },
    ]);
    const L = await makeListing(A.hostId);

    // A previously host-cancelled booking carrying a 30000 debit...
    const cancelledId = await makeBooking({
      listingId: L,
      status: "cancelled",
      quotedTotalCents: 60000,
      retainedSpaceCents: 0,
      endsAtMs: dueMs() - 48 * 3_600_000,
    });
    await seedDebit(A.hostId, cancelledId, 30000);

    // ...and a later due payout of net 90000 (gross 100000 − 10%).
    const bkId = await makeBooking({
      listingId: L,
      status: "confirmed",
      quotedTotalCents: 100000,
      endsAtMs: dueMs(),
    });

    const res = await payOne(
      testDb.db,
      duePayout({ bookingId: bkId, listingId: L, hostId: A.hostId, accountId: A.accountId, payoutGrossCents: 100000 }),
    );
    expect(res).toMatchObject({ status: "paid", netCents: 60000, deductedCents: 30000 });

    // The TRANSFER carries the NETTED amount, never the raw net.
    expect(mockPayMongo.createBatchTransfer).toHaveBeenCalledTimes(1);
    const arg = mockPayMongo.createBatchTransfer.mock.calls[0][0] as { netCents: number };
    expect(arg.netCents).toBe(60000);

    // The debit is fully recovered → terminal paid; the payout row memoises the deduction it applied.
    const [debit] = await readDebits(A.hostId);
    expect(debit.recoveredCents).toBe(30000);
    expect(debit.state).toBe("paid");
    const payoutRow = await readLedger(bkId);
    expect(payoutRow.recoveredCents).toBe(30000);
  });
});

describe("payout sweep — a ZERO transfer is never fired (D-71, T-07-19)", () => {
  it("settles by netting instead: payout paid with transfer_id NULL, no PayMongo call", async () => {
    const A = await makeHost();
    mockPayMongo.listWalletAccounts.mockResolvedValue([
      { id: A.accountId, accountNumber: "ZER0001", accountName: "Host A Wallet", status: "activated" },
    ]);
    const L = await makeListing(A.hostId);

    const cancelledId = await makeBooking({
      listingId: L,
      status: "cancelled",
      quotedTotalCents: 90000,
      retainedSpaceCents: 0,
      endsAtMs: dueMs() - 48 * 3_600_000,
    });
    await seedDebit(A.hostId, cancelledId, 90000); // exactly equal to the coming payout's net

    const bkId = await makeBooking({
      listingId: L,
      status: "confirmed",
      quotedTotalCents: 100000, // net 90000
      endsAtMs: dueMs(),
    });

    const res = await payOne(
      testDb.db,
      duePayout({ bookingId: bkId, listingId: L, hostId: A.hostId, accountId: A.accountId, payoutGrossCents: 100000 }),
    );
    expect(res).toEqual({ status: "settled-by-netting", deductedCents: 90000 });

    // PayMongo rejects / mis-handles a zero transfer — it must never be attempted.
    expect(mockPayMongo.createBatchTransfer).not.toHaveBeenCalled();

    const row = await readLedger(bkId);
    expect(row.state).toBe("paid");
    expect(row.transferId).toBeNull();

    const [debit] = await readDebits(A.hostId);
    expect(debit.recoveredCents).toBe(90000);
    expect(debit.state).toBe("paid");
  });
});

describe("payout sweep — netting can never drive a transfer negative (T-07-19)", () => {
  it("clamps the deduction at the payout net and carries the residual debt forward", async () => {
    const A = await makeHost();
    mockPayMongo.listWalletAccounts.mockResolvedValue([
      { id: A.accountId, accountNumber: "NEG0001", accountName: "Host A Wallet", status: "activated" },
    ]);
    const L = await makeListing(A.hostId);

    const cancelledId = await makeBooking({
      listingId: L,
      status: "cancelled",
      quotedTotalCents: 200000,
      retainedSpaceCents: 0,
      endsAtMs: dueMs() - 48 * 3_600_000,
    });
    await seedDebit(A.hostId, cancelledId, 200000); // MORE than this payout can cover

    const bkId = await makeBooking({
      listingId: L,
      status: "confirmed",
      quotedTotalCents: 100000, // net 90000
      endsAtMs: dueMs(),
    });

    const res = await payOne(
      testDb.db,
      duePayout({ bookingId: bkId, listingId: L, hostId: A.hostId, accountId: A.accountId, payoutGrossCents: 100000 }),
    );
    // deduction = min(200000, 90000) = 90000 ⇒ transferAmt = 0, never negative.
    expect(res).toEqual({ status: "settled-by-netting", deductedCents: 90000 });
    expect(mockPayMongo.createBatchTransfer).not.toHaveBeenCalled();

    const [debit] = await readDebits(A.hostId);
    expect(debit.recoveredCents).toBe(90000); // increased by EXACTLY the payout net
    expect(debit.state).toBe("held"); // still outstanding — 110000 remains for a future payout
    expect(debit.recoveredCents).toBeLessThan(-debit.netCents);

    // No ledger value went negative beyond the debit's own (deliberately signed) net_cents.
    const payoutRow = await readLedger(bkId);
    expect(payoutRow.grossCents).toBeGreaterThanOrEqual(0);
    expect(payoutRow.netCents).toBeGreaterThanOrEqual(0);
    expect(payoutRow.recoveredCents).toBeGreaterThanOrEqual(0);
    expect(debit.recoveredCents).toBeGreaterThanOrEqual(0);
  });
});

describe("payout sweep — concurrent cancel × sweep race (T-07-17)", () => {
  it("two genuinely concurrent payOne calls on a retained cancellation → ONE ledger row, at most one transfer", async () => {
    const A = await makeHost();
    mockPayMongo.listWalletAccounts.mockResolvedValue([
      { id: A.accountId, accountNumber: "RAC0001", accountName: "Host A Wallet", status: "activated" },
    ]);
    const L = await makeListing(A.hostId);
    const bkId = await makeBooking({
      listingId: L,
      status: "cancelled",
      quotedTotalCents: 105000,
      spacePriceCents: 100000,
      serviceFeeCents: 5000,
      retainedSpaceCents: 50000,
      endsAtMs: dueMs(),
    });
    const b = duePayout({
      bookingId: bkId,
      listingId: L,
      hostId: A.hostId,
      accountId: A.accountId,
      payoutGrossCents: 50000,
    });

    // Genuinely concurrent connections — the shared max:1 client would serialize and prove nothing.
    const [c1, c2] = makeRacingClients(testDb.schema, 2);
    try {
      const results = await Promise.all([payOne(drizzle(c1), b), payOne(drizzle(c2), b)]);
      expect(results.filter((r) => r.status === "paid")).toHaveLength(1);
      expect(results.filter((r) => r.status === "skipped-claimed")).toHaveLength(1);
    } finally {
      await c1.end();
      await c2.end();
    }

    // The DB — the widened UNIQUE(booking_id, kind), not app code — enforces at-most-once.
    expect(await readPayoutRows(bkId)).toHaveLength(1);
    expect(mockPayMongo.createBatchTransfer.mock.calls.length).toBeLessThanOrEqual(1);
  });
});

describe("payout sweep — a booking with no frozen payout basis fails CLOSED", () => {
  it("alerts and skips rather than guessing a gross from the all-in charged total", async () => {
    const A = await makeHost();
    const L = await makeListing(A.hostId);
    const bkId = await makeBooking({
      listingId: L,
      status: "confirmed",
      quotedTotalCents: 105000,
      endsAtMs: dueMs(),
      spacePriceCents: null,
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    // space_price_cents was never frozen on this row ⇒ the sweep receives a null basis.
    const b: DuePayout = {
      ...duePayout({ bookingId: bkId, listingId: L, hostId: A.hostId, accountId: A.accountId, payoutGrossCents: 0 }),
      payoutGrossCents: null,
    };
    const res = await payOne(testDb.db, b);

    expect(res.status).toBe("skipped-no-basis");
    expect(mockPayMongo.createBatchTransfer).not.toHaveBeenCalled();
    expect(await readPayoutRows(bkId)).toHaveLength(0); // nothing claimed — retried on the next sweep
    expect(spy).toHaveBeenCalledWith(
      "[payout-alert] booking has no frozen payout basis",
      expect.objectContaining({ bookingId: bkId }),
    );
    spy.mockRestore();
  });
});
