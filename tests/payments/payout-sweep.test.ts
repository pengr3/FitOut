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
import { and, eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { mockPayMongo } from "../helpers/mocks";
import { makeVerifiedHost } from "../helpers/seed";
import { user, listing, hostPayoutLedger, booking } from "@/lib/db/schema";
import { PAYOUT_DELAY_HOURS } from "@/lib/payments/config";
import type { DuePayout } from "@/inngest/functions/payout-sweep";

let testDb: TestDb;
type SweepModule = typeof import("@/inngest/functions/payout-sweep");
let queryDuePayouts: SweepModule["queryDuePayouts"];
let payOne: SweepModule["payOne"];

const BOOKER = "sweep_booker";

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
  spacePriceCents?: number;
  serviceFeeCents?: number;
  /** D-69: the retained (non-refunded) space price on a cancellation. null ⇒ not cancelled. */
  retainedSpaceCents?: number | null;
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
    quotedTotalCents: opts.quotedTotalCents,
    // 07-04 Finding 2: the sweep's payout basis is space_price_cents, NOT the all-in charged total. With
    // no service fee the two are equal — exactly what drizzle/0014 backfilled for pre-Phase-7 rows.
    spacePriceCents: opts.spacePriceCents ?? opts.quotedTotalCents,
    serviceFeeCents: opts.serviceFeeCents ?? 0,
    retainedSpaceCents: opts.retainedSpaceCents ?? null,
    currency: "php",
    expiresAt: opts.status === "pending" ? endsAt : null,
  });
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
    paymentId: null,
    paymongoAccountId: opts.accountId,
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
  testDb = await setupTestDb();
  await testDb.db.insert(user).values({
    id: BOOKER,
    name: "Sweep Booker",
    email: "sweep_booker@example.com",
    firstName: "Booker",
  });
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("@/lib/paymongo", () => ({
    createBatchTransfer: mockPayMongo.createBatchTransfer,
    listWalletAccounts: mockPayMongo.listWalletAccounts,
    createCheckoutSession: mockPayMongo.createCheckoutSession,
    createRefund: mockPayMongo.createRefund,
  }));
  vi.resetModules();
  ({ queryDuePayouts, payOne } = await import("@/inngest/functions/payout-sweep"));
});

afterAll(async () => {
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

    // The returned row carries the host's correlating Linked-Account id (the wallet is matched against it).
    const row = due.find((d) => d.bookingId === dueId)!;
    expect(row.paymongoAccountId).toBe(A.accountId);
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
    expect(arg.destination.number).toBe("9990001111");
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
    // A→AAA, B→BBB, and neither payout ever addressed the OTHER host's wallet.
    expect(numbers).toEqual(["AAA", "BBB"]);
    const [rowA, rowB] = [await readLedger(bkA), await readLedger(bkB)];
    expect(rowA.transferId).toBe("tr_test_123");
    expect(rowB.transferId).toBe("tr_test_123");
  });
});

describe("payout sweep — no matching wallet (T-05-27 / CR-01)", () => {
  it("rolls the claim back (no dead-end held row), fires NO transfer, and raises a [payout-alert]", async () => {
    const C = await makeHost();
    // Only OTHER hosts' wallets are activated — host C's Linked-Account id is absent.
    mockPayMongo.listWalletAccounts.mockResolvedValue([
      { id: "acct_other_A", accountNumber: "AAA", accountName: "Host A Wallet", status: "activated" },
      { id: "acct_other_B", accountNumber: "BBB", accountName: "Host B Wallet", status: "activated" },
    ]);
    const L = await makeListing(C.hostId);
    const bkC = await makeBooking({ listingId: L, status: "confirmed", quotedTotalCents: 200000, endsAtMs: dueMs() });

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await payOne(
      testDb.db,
      duePayout({ bookingId: bkC, listingId: L, hostId: C.hostId, accountId: C.accountId, payoutGrossCents: 200000 }),
    );

    expect(res.status).toBe("skipped-no-wallet");
    expect(mockPayMongo.createBatchTransfer).not.toHaveBeenCalled();

    // CR-01: the claim is ROLLED BACK — no held row is left behind, so the NEXT sweep re-selects this booking
    // and retries once the host's wallet activates (a held row would be a permanent dead end). The money
    // never left the platform wallet, so this is still fail-closed.
    const row = await readLedger(bkC);
    expect(row).toBeUndefined();

    expect(spy).toHaveBeenCalledWith(
      "[payout-alert] no activated wallet for host",
      expect.objectContaining({ bookingId: bkC, paymongoAccountId: C.accountId }),
    );
    spy.mockRestore();
  });
});

describe("payout sweep — failed payout is retryable (WR-04)", () => {
  it("re-claims a `failed` ledger row on a later pass and releases it — exactly one row throughout", async () => {
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

    // First pass: a transient PayMongo error throws from createBatchTransfer → the claim is marked `failed`
    // (never a silent held), and a [payout-alert] fires.
    mockPayMongo.createBatchTransfer.mockRejectedValueOnce(new Error("paymongo 503"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const first = await payOne(testDb.db, b);
    expect(first.status).toBe("failed");
    expect((await readLedger(bkId)).state).toBe("failed");

    // Second pass: the transfer now succeeds → the `failed` row is RE-CLAIMED (failed → held) and RELEASED to
    // processing. The stable payout:<bookingId> Idempotency-Key makes this re-attempt double-pay-safe.
    mockPayMongo.createBatchTransfer.mockResolvedValueOnce({
      batchId: "batch_tr_retry",
      transferId: "tr_retry_1",
      status: "pending",
    });
    const second = await payOne(testDb.db, b);
    expect(second.status).toBe("paid");
    spy.mockRestore();

    // Exactly ONE ledger row throughout (the re-claim never mints a second), now released to processing with
    // the retry's transfer id.
    const rows = await testDb.db
      .select()
      .from(hostPayoutLedger)
      .where(eq(hostPayoutLedger.bookingId, bkId));
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe("processing");
    expect(rows[0].transferId).toBe("tr_retry_1");
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
