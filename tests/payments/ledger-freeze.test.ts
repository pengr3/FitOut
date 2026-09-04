// PAY-02 commission FREEZE (D-51): the applied commission (rate + amount) is frozen on the payout-ledger
// row at payout time, so a LATER rate change never retroactively rewrites a past payout. The
// UNIQUE(booking_id) claim (ON CONFLICT DO NOTHING) means a re-sweep can never re-price an existing row.
//
// Isolated schema; @/lib/paymongo mocked so no live PayMongo call fires.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { mockPayMongo } from "../helpers/mocks";
import { makeVerifiedHost } from "../helpers/seed";
import { user, listing, hostPayoutLedger, booking } from "@/lib/db/schema";
import { computeCommission } from "@/lib/payments/commission";
import { PAYOUT_DELAY_HOURS } from "@/lib/payments/config";
import type { DuePayout } from "@/inngest/functions/payout-sweep";

let testDb: TestDb;
type SweepModule = typeof import("@/inngest/functions/payout-sweep");
let payOne: SweepModule["payOne"];

const BOOKER = "freeze_booker";
let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;
const dueMs = () => Date.now() - (PAYOUT_DELAY_HOURS + 1) * 3_600_000;

async function makeHost(): Promise<{ hostId: string; accountId: string }> {
  const hostId = uid("host");
  const accountId = uid("acct");
  // user + an ACTIVATED host_payout + the ops-APPROVED host_verification row (phase 18, D-224), through
  // the one shared fixture expression, so "a host who can sell" means the same three rows suite-wide.
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
    title: "Freeze Listing",
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

async function makeConfirmedBooking(listingId: string, quotedTotalCents: number): Promise<string> {
  const id = uid("bk");
  const endsAt = new Date(dueMs());
  await testDb.db.insert(booking).values({
    id,
    listingId,
    unit: 1,
    bookerId: BOOKER,
    startsAt: new Date(dueMs() - 3_600_000),
    endsAt,
    status: "confirmed",
    quotedTotalCents,
    currency: "php",
    expiresAt: null,
  });
  return id;
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
    name: "Freeze Booker",
    email: "freeze_booker@example.com",
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
  ({ payOne } = await import("@/inngest/functions/payout-sweep"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  await teardownTestDb(testDb);
});

describe("commission freeze (PAY-02, D-51)", () => {
  it("a later rate change never rewrites an existing ledger row's commission_rate_bps / commission_cents", async () => {
    const A = await makeHost();
    mockPayMongo.listWalletAccounts.mockResolvedValue([
      { id: A.accountId, accountNumber: "9990001111", accountName: "Host A Wallet", status: "activated" },
    ]);
    const L = await makeListing(A.hostId);
    const bkId = await makeConfirmedBooking(L, 200000);
    const b: DuePayout = {
      bookingId: bkId,
      listingId: L,
      // 07-04 Finding 2: the payout basis is the SPACE price, never the all-in quoted total.
      payoutGrossCents: 200000,
      currency: "php",
      hostId: A.hostId,
      paymentId: null,
      paymongoAccountId: A.accountId,
    };

    // First sweep at the default 10% rate → the ledger FREEZES 1000 bps / 20000 c.
    const first = await payOne(testDb.db, b);
    expect(first.status).toBe("paid");
    const frozen = await readLedger(bkId);
    expect(frozen.commissionRateBps).toBe(1000);
    expect(frozen.commissionCents).toBe(20000);
    expect(frozen.netCents).toBe(180000);

    // A DIFFERENT rate WOULD have produced a different amount (proof the number isn't inherently fixed) ...
    expect(computeCommission(200000, 2000).commissionCents).toBe(40000);

    // ... but re-running the sweep is a no-op claim (ON CONFLICT DO NOTHING): the frozen row is UNCHANGED.
    const second = await payOne(testDb.db, b);
    expect(second.status).toBe("skipped-claimed");
    const after = await readLedger(bkId);
    expect(after.commissionRateBps).toBe(1000);
    expect(after.commissionCents).toBe(20000);
    expect(after.netCents).toBe(180000);
  });
});
