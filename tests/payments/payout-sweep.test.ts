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
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, hostPayout, hostPayoutLedger, booking } from "@/lib/db/schema";
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

/** Insert a host user + an ACTIVATED host_payout with a unique Linked-Account id. */
async function makeHost(): Promise<{ hostId: string; accountId: string }> {
  const hostId = uid("host");
  const accountId = uid("acct");
  await testDb.db.insert(user).values({
    id: hostId,
    name: "Host",
    email: `${hostId}@example.com`,
    firstName: "Host",
    canHost: true,
  });
  await testDb.db.insert(hostPayout).values({
    userId: hostId,
    paymongoAccountId: accountId,
    activationStatus: "activated",
    payoutsEnabled: true,
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
  status: "pending" | "confirmed";
  quotedTotalCents: number;
  endsAtMs: number;
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
    currency: "php",
    expiresAt: opts.status === "pending" ? endsAt : null,
  });
  return id;
}

function duePayout(opts: {
  bookingId: string;
  listingId: string;
  hostId: string;
  accountId: string | null;
  quotedTotalCents: number;
}): DuePayout {
  return {
    bookingId: opts.bookingId,
    listingId: opts.listingId,
    quotedTotalCents: opts.quotedTotalCents,
    currency: "php",
    hostId: opts.hostId,
    paymentId: null,
    paymongoAccountId: opts.accountId,
  };
}

async function readLedger(bookingId: string) {
  const [row] = await testDb.db
    .select()
    .from(hostPayoutLedger)
    .where(eq(hostPayoutLedger.bookingId, bookingId));
  return row;
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
    expect(row.quotedTotalCents).toBe(200000);
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
      duePayout({ bookingId: bkId, listingId: L, hostId: A.hostId, accountId: A.accountId, quotedTotalCents: 200000 }),
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
      quotedTotalCents: 200000,
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
      duePayout({ bookingId: bkA, listingId: LA, hostId: A.hostId, accountId: A.accountId, quotedTotalCents: 200000 }),
    );
    await payOne(
      testDb.db,
      duePayout({ bookingId: bkB, listingId: LB, hostId: B.hostId, accountId: B.accountId, quotedTotalCents: 200000 }),
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
      duePayout({ bookingId: bkC, listingId: L, hostId: C.hostId, accountId: C.accountId, quotedTotalCents: 200000 }),
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
