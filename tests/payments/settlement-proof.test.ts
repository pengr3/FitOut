import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { booking, listing, user } from "@/lib/db/schema";
import { currentSettlementProof, isCorrelatedSettlement, recordSettlementObservation } from "@/lib/payments/settlement";
import { refreshBookingSettlement, type ProviderReader, type SettlementAccountEvidence } from "@/inngest/functions/settlement-reconcile";
import { getMerchantPayout, listMerchantPayouts, listMerchantPayoutTransactions } from "@/lib/paymongo";

let testDb: TestDb;
let serial = 0;
const id = (prefix: string) => `${prefix}_${serial++}`;

async function seedBooking(paymentId: string | null = "pay_exact") {
  const hostId = id("host");
  const bookerId = id("booker");
  const listingId = id("listing");
  const bookingId = id("booking");
  for (const userId of [hostId, bookerId]) {
    await testDb.db.insert(user).values({ id: userId, name: userId, firstName: "Test", email: `${userId}@example.com` });
  }
  await testDb.db.insert(listing).values({
    id: listingId, hostId, title: "Settlement fixture", status: "published", unitCount: 1,
    timezone: "Asia/Manila", hourlyRateCents: 200000, dayRateCents: 300000, currency: "php",
  });
  await testDb.db.insert(booking).values({
    id: bookingId, listingId, bookerId, unit: 1, status: "confirmed", paymentId,
    startsAt: new Date("2026-09-01T01:00:00Z"), endsAt: new Date("2026-09-01T02:00:00Z"),
    quotedTotalCents: 200000, currency: "php",
  });
  return bookingId;
}

const deposited = {
  paymentId: "pay_exact", payoutId: "po_exact", transactionId: "txn_exact",
  transactionType: "payment" as const, currency: "PHP", liveMode: true,
  providerStatus: "deposited", destinationMatched: true, paginationComplete: true,
  mappingVerified: true, providerStatusAt: new Date(Date.now() - 3_600_000),
  verifiedAt: new Date(),
};

const accountEvidence: SettlementAccountEvidence = {
  paymentField: "attributes.payment_id", transactionType: "payment",
  walletAccountNumber: "wallet_test_only", walletBankId: "bank_test",
  organizationId: "org_test", liveMode: true,
};

function fixtureReader(options: {
  status?: string; statusAt?: number; paymentId?: string; liveMode?: boolean;
  wallet?: string; payoutId?: string; cursor?: string | null;
} = {}): ProviderReader {
  const payoutId = options.payoutId ?? "po_exact";
  return {
    listPayouts: async () => ({ data: [{ id: payoutId }], pagination: { next_cursor: null } }),
    getPayout: async () => ({ data: { id: payoutId, type: "payout", attributes: {
      status: options.status ?? "deposited",
      status_updated_at: options.statusAt ?? Math.floor(Date.now() / 1000) - 60,
      currency: "PHP", bank_account_number: options.wallet ?? "wallet_test_only",
      bank_id: "bank_test", organization: { id: "org_test" },
    } } }),
    listTransactions: async () => ({ data: [{ id: "txn_exact", type: "payment", attributes: {
      payment_id: options.paymentId ?? "pay_exact", payout_id: payoutId,
      currency: "PHP", livemode: options.liveMode ?? true, organization_id: "org_test",
    } }], pagination: { next_cursor: options.cursor ?? null } }),
  };
}

it("correlates only a complete deposited payment into the verified Wallet", () => {
  expect(isCorrelatedSettlement(deposited, "pay_exact", "php", true)).toBe(true);
  expect(isCorrelatedSettlement({ ...deposited, paginationComplete: false }, "pay_exact", "php", true)).toBe(false);
  expect(isCorrelatedSettlement({ ...deposited, destinationMatched: false }, "pay_exact", "php", true)).toBe(false);
});

it("uses only authenticated GETs for payout list, detail and cursor pages", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    new Response(JSON.stringify({ data: [], pagination: { next_cursor: null } }), { status: 200 }));
  try {
    await listMerchantPayouts("page one");
    await getMerchantPayout("po_exact");
    await listMerchantPayoutTransactions("po_exact", "page two");
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "https://api.paymongo.com/v1/payouts?limit=20&after=page%20one",
      "https://api.paymongo.com/v1/payouts/po_exact",
      "https://api.paymongo.com/v1/payouts/po_exact/transactions?limit=20&after=page%20two",
    ]);
    for (const [, init] of fetchMock.mock.calls) expect(init?.method).toBe("GET");
  } finally {
    fetchMock.mockRestore();
  }
});

describe("booking settlement proof", () => {
  beforeAll(async () => { testDb = await setupTestDb(); });
  afterAll(async () => { if (testDb) await teardownTestDb(testDb); });

  it("leaves a legacy captured booking unknown until provider evidence is recorded", async () => {
    const bookingId = await seedBooking();
    expect(await currentSettlementProof(bookingId, testDb.db)).toBeNull();
  });
  it("persists one exact deposited payment and Wallet observation as current proof", async () => {
    const bookingId = await seedBooking();
    await recordSettlementObservation(bookingId, deposited, testDb.db);
    expect(await currentSettlementProof(bookingId, testDb.db)).toMatchObject({ bookingId, paymentId: "pay_exact", payoutId: "po_exact" });
  });

  it("does not prove a booking without a captured matching payment or complete pages", async () => {
    const bookingId = await seedBooking(null);
    await recordSettlementObservation(bookingId, deposited, testDb.db);
    expect(await currentSettlementProof(bookingId, testDb.db)).toBeNull();
    const otherId = await seedBooking();
    await recordSettlementObservation(otherId, { ...deposited, paginationComplete: false }, testDb.db);
    expect(await currentSettlementProof(otherId, testDb.db)).toBeNull();
  });

  it("retains deposit history while a later returned observation revokes proof", async () => {
    const bookingId = await seedBooking();
    await recordSettlementObservation(bookingId, deposited, testDb.db);
    await recordSettlementObservation(bookingId, {
      ...deposited, providerStatus: "returned", providerStatusAt: new Date(Date.now() - 1_800_000),
      verifiedAt: new Date(),
    }, testDb.db);
    expect(await currentSettlementProof(bookingId, testDb.db)).toBeNull();
    const rows = await testDb.db.execute(sql`SELECT provider_status FROM booking_settlement_observation WHERE booking_id = ${bookingId}`);
    expect(rows.map((row) => row.provider_status).sort()).toEqual(["deposited", "returned"]);
  });

  it("keeps older deposits from overwriting a return even when responses arrive out of order", async () => {
    const bookingId = await seedBooking();
    const returnedAt = new Date(Date.now() - 30_000);
    await recordSettlementObservation(bookingId, { ...deposited, providerStatus: "returned", providerStatusAt: returnedAt }, testDb.db);
    await Promise.all([
      recordSettlementObservation(bookingId, deposited, testDb.db),
      recordSettlementObservation(bookingId, deposited, testDb.db),
    ]);
    expect(await currentSettlementProof(bookingId, testDb.db)).toBeNull();
    const rows = await testDb.db.execute(sql`SELECT id FROM booking_settlement_observation WHERE booking_id = ${bookingId}`);
    expect(rows).toHaveLength(2);
  });

  it("rejects wrong payment, currency, mode and absent Wallet match", async () => {
    const bookingId = await seedBooking();
    for (const bad of [
      { paymentId: "pay_other" }, { currency: "USD" }, { liveMode: false },
      { paginationComplete: false }, { mappingVerified: false },
    ]) {
      expect(await recordSettlementObservation(bookingId, { ...deposited, ...bad }, testDb.db)).toBe(false);
    }
    expect(await currentSettlementProof(bookingId, testDb.db)).toBeNull();
    await recordSettlementObservation(bookingId, { ...deposited, destinationMatched: false }, testDb.db);
    expect(await currentSettlementProof(bookingId, testDb.db)).toBeNull();
  });

  it("expires a deposited read without erasing the observation", async () => {
    const bookingId = await seedBooking();
    await recordSettlementObservation(bookingId, deposited, testDb.db);
    expect(await currentSettlementProof(bookingId, testDb.db, new Date(Date.now() + 25 * 3_600_000))).toBeNull();
  });

  it("renews verification freshness for the same provider version without multiplying history", async () => {
    const bookingId = await seedBooking();
    const first = { ...deposited, providerStatusAt: new Date(Date.now() - 26 * 3_600_000), verifiedAt: new Date(Date.now() - 25 * 3_600_000) };
    await recordSettlementObservation(bookingId, first, testDb.db);
    expect(await currentSettlementProof(bookingId, testDb.db)).toBeNull();
    await recordSettlementObservation(bookingId, { ...first, verifiedAt: new Date() }, testDb.db);
    expect(await currentSettlementProof(bookingId, testDb.db)).not.toBeNull();
    const rows = await testDb.db.execute(sql`SELECT id FROM booking_settlement_observation WHERE booking_id = ${bookingId}`);
    expect(rows).toHaveLength(1);
    const ledger = await testDb.db.execute(sql`SELECT id FROM host_payout_ledger WHERE booking_id = ${bookingId}`);
    expect(ledger).toHaveLength(0);
  });

  it("refreshes a booking only after a complete two-page transaction read", async () => {
    const bookingId = await seedBooking();
    const observedAt = Math.floor(Date.now() / 1000) - 60;
    const account: SettlementAccountEvidence = {
      paymentField: "attributes.payment_id", transactionType: "payment", walletAccountNumber: "wallet_test_only",
      walletBankId: "bank_test", organizationId: "org_test", liveMode: true,
    };
    const reader: ProviderReader = {
      listPayouts: async () => ({ data: [{ id: "po_exact" }], pagination: { next_cursor: null } }),
      getPayout: async () => ({ data: { id: "po_exact", type: "payout", attributes: {
        status: "deposited", status_updated_at: observedAt, currency: "PHP",
        bank_account_number: "wallet_test_only", bank_id: "bank_test",
        organization: { id: "org_test" },
      } } }),
      listTransactions: async (_payoutId, after) => after
        ? ({ data: [{ id: "txn_exact", type: "payment", attributes: {
          payment_id: "pay_exact", payout_id: "po_exact", currency: "PHP",
          livemode: true, organization_id: "org_test",
        } }], pagination: { next_cursor: null } })
        : ({ data: [{ id: "txn_other", type: "refund", attributes: {
          payment_id: "pay_other", payout_id: "po_exact", currency: "PHP",
          livemode: true, organization_id: "org_test",
        } }], pagination: { next_cursor: "page2" } }),
    };
    expect(await refreshBookingSettlement(bookingId, reader, account, testDb.db)).toMatchObject({ state: "proved" });
    expect(await currentSettlementProof(bookingId, testDb.db)).not.toBeNull();
  });

  it("leaves zero-page and wrong-payment payout listings unproved", async () => {
    const emptyId = await seedBooking();
    const emptyReader: ProviderReader = {
      ...fixtureReader(), listPayouts: async () => ({ data: [], pagination: { next_cursor: null } }),
    };
    expect((await refreshBookingSettlement(emptyId, emptyReader, accountEvidence, testDb.db)).state).toBe("unproved");
    const wrongId = await seedBooking();
    expect((await refreshBookingSettlement(wrongId, fixtureReader({ paymentId: "pay_other" }), accountEvidence, testDb.db)).state).toBe("unproved");
    expect(await currentSettlementProof(wrongId, testDb.db)).toBeNull();
  });

  it("rejects partial transaction pagination and wrong mode or Wallet", async () => {
    const partialId = await seedBooking();
    expect((await refreshBookingSettlement(partialId, fixtureReader({ cursor: "never_ends" }), accountEvidence, testDb.db)).state).toBe("exception");
    expect(await currentSettlementProof(partialId, testDb.db)).toBeNull();
    const wrongModeId = await seedBooking();
    expect((await refreshBookingSettlement(wrongModeId, fixtureReader({ liveMode: false }), accountEvidence, testDb.db)).state).toBe("exception");
    const wrongWalletId = await seedBooking();
    expect((await refreshBookingSettlement(wrongWalletId, fixtureReader({ wallet: "other_wallet" }), accountEvidence, testDb.db)).state).toBe("unproved");
    expect(await currentSettlementProof(wrongWalletId, testDb.db)).toBeNull();
  });

  it("reorders returned reads over a previously deposited payout", async () => {
    const bookingId = await seedBooking();
    const before = Math.floor(Date.now() / 1000) - 120;
    expect((await refreshBookingSettlement(bookingId, fixtureReader({ statusAt: before }), accountEvidence, testDb.db)).state).toBe("proved");
    expect((await refreshBookingSettlement(bookingId, fixtureReader({ status: "returned", statusAt: before + 60 }), accountEvidence, testDb.db)).state).toBe("unproved");
    expect((await refreshBookingSettlement(bookingId, fixtureReader({ statusAt: before }), accountEvidence, testDb.db)).state).toBe("unproved");
    expect(await currentSettlementProof(bookingId, testDb.db)).toBeNull();
  });

  it("records provider denial and unverified account mapping as exceptions without proof", async () => {
    const deniedId = await seedBooking();
    const denied: ProviderReader = { ...fixtureReader(), listPayouts: async () => { throw new Error("403 provider denied"); } };
    expect((await refreshBookingSettlement(deniedId, denied, accountEvidence, testDb.db)).state).toBe("exception");
    expect((await refreshBookingSettlement(deniedId, denied, accountEvidence, testDb.db)).state).toBe("exception");
    const alerts = await testDb.db.execute(sql`
      SELECT id FROM audit WHERE action = 'settlement_refresh' AND meta->>'bookingId' = ${deniedId}
    `);
    expect(alerts).toHaveLength(1);
    const unmappedId = await seedBooking();
    expect((await refreshBookingSettlement(unmappedId, fixtureReader(), { ...accountEvidence, walletAccountNumber: "" }, testDb.db)).state).toBe("exception");
    expect(await currentSettlementProof(unmappedId, testDb.db)).toBeNull();
  });

  it("never guesses a payment field or accepts a conflicting payout/currency", async () => {
    const bookingId = await seedBooking();
    const ambiguous: ProviderReader = {
      ...fixtureReader(), listTransactions: async () => ({ data: [{
        id: "pay_exact", type: "payment", attributes: {
          payout_id: "po_exact", currency: "PHP", livemode: true, organization_id: "org_test",
        },
      }], pagination: { next_cursor: null } }),
    };
    expect((await refreshBookingSettlement(bookingId, ambiguous, accountEvidence, testDb.db)).state).toBe("exception");
    const conflicting: ProviderReader = {
      ...fixtureReader(), listTransactions: async () => ({ data: [{
        id: "txn_exact", type: "payment", attributes: {
          payment_id: "pay_exact", payout_id: "po_other", currency: "USD", livemode: true,
          organization_id: "org_test",
        },
      }], pagination: { next_cursor: null } }),
    };
    expect((await refreshBookingSettlement(bookingId, conflicting, accountEvidence, testDb.db)).state).toBe("exception");
    expect(await currentSettlementProof(bookingId, testDb.db)).toBeNull();
  });

  it("does not treat an unfinished payout list as proof of absence", async () => {
    const bookingId = await seedBooking();
    const incomplete: ProviderReader = {
      ...fixtureReader(), listPayouts: async () => ({ data: [], pagination: { next_cursor: "same_cursor" } }),
    };
    expect((await refreshBookingSettlement(bookingId, incomplete, accountEvidence, testDb.db)).state).toBe("exception");
    expect(await currentSettlementProof(bookingId, testDb.db)).toBeNull();
  });

  it("uses a returned status observed after transaction pagination", async () => {
    const bookingId = await seedBooking();
    const first = Math.floor(Date.now() / 1000) - 120;
    const base = fixtureReader({ statusAt: first });
    let detailReads = 0;
    const changing: ProviderReader = {
      ...base,
      getPayout: async (payoutId) => {
        detailReads++;
        return fixtureReader({ status: detailReads === 1 ? "deposited" : "returned", statusAt: first + detailReads * 60 }).getPayout(payoutId);
      },
    };
    expect((await refreshBookingSettlement(bookingId, changing, accountEvidence, testDb.db)).state).toBe("unproved");
    expect(detailReads).toBe(2);
    expect(await currentSettlementProof(bookingId, testDb.db)).toBeNull();
  });
});
