// Exercise the staff-controlled payout against an isolated database. Every PayMongo call is
// replaced: these tests cannot send money, even when .env.local contains a live key.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeVerifiedHost } from "../helpers/seed";
import { booking, listing, user } from "@/lib/db/schema";
import { encryptPayoutRecipientValue } from "@/lib/payout-recipient-crypto";
import { recordSettlementObservation } from "@/lib/payments/settlement";
import type { ManualTransferDetails } from "@/lib/paymongo";
import { projectHostEarnings, summarizeHostEarnings } from "@/components/host/payout-ledger-status";

const BOOKING_ID = "911c28f2-328c-42cc-8f79-98181b0c399e";
const HOST_ID = "test_host_api_payout";
const STAFF_ID = "test_staff_api_payout";
const PAYMENT_ID = "pay_test_api_payout";
const DESTINATION = { number: "09999999701", name: "Test Host", bic: "GXCHPHM2XXX" };
const SOURCE = { number: "0000000099", name: "Test Merchant Wallet", bic: "PAEYPHM2XXX" };
const TRANSFER_ID = "tr_testapi12345678";

let testDb: TestDb;
let prepare: (staffId: string) => Promise<string>;
let dispatch: (staffId: string) => Promise<string>;
let recover: () => Promise<string>;
let availableCents = 3955;
let postCount = 0;
let createdTransfer: ManualTransferDetails | null = null;
let createLosesResponse = false;
let lookupIsAmbiguous = false;
let priorTransfer = false;

const createTransfer = vi.fn(async () => {
  postCount += 1;
  createdTransfer = {
    id: TRANSFER_ID, status: "pending", amountCents: 1710, feeCents: 1000,
    currency: "PHP", provider: "instapay", merchantId: "org_test_live",
    liveMode: true, referenceNumber: `host-payout-${BOOKING_ID}`,
    createdAt: new Date(), source: SOURCE, destination: DESTINATION,
  };
  if (createLosesResponse) throw new Error("simulated accepted POST with lost response");
  return { batchId: "btr_test_api_12345678", transferId: TRANSFER_ID, status: "pending" };
});
const referenceLookup = vi.fn(async () => {
  const row = { id: TRANSFER_ID, status: createdTransfer?.status ?? "pending",
    referenceNumber: `host-payout-${BOOKING_ID}`, amount: 1710, currency: "PHP" };
    if (priorTransfer || createdTransfer) return lookupIsAmbiguous ? [row, { ...row, id: "tr_other12345678" }] : [row];
  return [];
});
const detailsLookup = vi.fn(async () => {
  if (!createdTransfer) throw new Error("no simulated transfer");
  return createdTransfer;
});

async function claim() {
  const rows = (await testDb.db.execute(sql`
    SELECT a.state AS "attemptState", a.transfer_id AS "attemptTransferId",
      a.actual_fee_cents AS "actualFeeCents", l.state AS "ledgerState",
      l.transfer_id AS "ledgerTransferId", l.paid_at AS "paidAt"
    FROM manual_host_payout_attempt a JOIN host_payout_ledger l ON l.id = a.claim_id
    WHERE a.booking_id = ${BOOKING_ID}
  `)) as unknown as Array<{ attemptState: string; attemptTransferId: string | null;
    actualFeeCents: number | null; ledgerState: string; ledgerTransferId: string | null;
    paidAt: Date | null }>;
  return rows[0];
}

async function exceptionCauses() {
  const rows = (await testDb.db.execute(sql`
    SELECT meta->>'cause' AS cause FROM audit WHERE action = 'host_payout_recovery'
      AND outcome = 'needs_attention'
  `)) as unknown as Array<{ cause: string }>;
  return rows.map((row) => row.cause);
}

async function seedPreparedClaim() {
  await testDb.db.execute(sql`TRUNCATE TABLE "user" CASCADE`);
  // Recovery exceptions use a hashed booking reference rather than a booking FK.
  await testDb.db.execute(sql`TRUNCATE TABLE audit`);
  await makeVerifiedHost(testDb.db, HOST_ID, {
    name: DESTINATION.name, payoutDestinationNumber: DESTINATION.number,
  });
  await testDb.db.execute(sql`
    UPDATE host_payout_destination SET institution_bic = ${DESTINATION.bic},
      institution_name = 'G-Xchange, Inc.',
      account_name_ciphertext = ${encryptPayoutRecipientValue(DESTINATION.name)}
    WHERE user_id = ${HOST_ID}
  `);
  await testDb.db.insert(user).values([
    { id: STAFF_ID, name: "Test Staff", firstName: "Test", email: "staff.api.payout@test.invalid" },
    { id: "test_booker_api_payout", name: "Test Booker", firstName: "Test",
      email: "booker.api.payout@test.invalid" },
  ]);
  await testDb.db.insert(listing).values({
    id: "listing_test_api_payout", hostId: HOST_ID, title: "Test payout listing",
    status: "published", reviewState: "approved", unitCount: 1,
    timezone: "Asia/Manila", hourlyRateCents: 1900, dayRateCents: 1900, currency: "php",
  });
  await testDb.db.insert(booking).values({
    id: BOOKING_ID, listingId: "listing_test_api_payout", bookerId: "test_booker_api_payout",
    unit: 1, status: "confirmed", paymentId: PAYMENT_ID,
    startsAt: new Date(Date.now() - 4 * 86_400_000),
    endsAt: new Date(Date.now() - 3 * 86_400_000),
    spacePriceCents: 1900, quotedTotalCents: 1995, currency: "php",
  });
  const observedAt = new Date(Date.now() - 60_000);
  await recordSettlementObservation(BOOKING_ID, {
    paymentId: PAYMENT_ID, payoutId: "po_test_api_payout", transactionId: "txn_test_api_payout",
    transactionType: "payment", currency: "PHP", liveMode: true,
    providerStatus: "deposited", destinationMatched: true, paginationComplete: true,
    mappingVerified: true, providerStatusAt: observedAt, verifiedAt: new Date(),
  }, testDb.db);
  expect(await prepare(STAFF_ID)).toBe("prepared");
  expect((await claim()).ledgerState).toBe("held");
}

beforeAll(async () => {
  // The test runner overrides DATABASE_URL with fitout_test before this file loads.
  vi.stubEnv("PAYOUT_RECIPIENT_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
  vi.stubEnv("PAYMONGO_SECRET_KEY", "sk_live_test_only_never_sent");
  vi.stubEnv("PAYMONGO_ORGANIZATION_ID", "org_test_live");
  vi.stubEnv("PAYMONGO_WALLET_ID", "wal_test_live");
  vi.stubEnv("PLATFORM_WALLET_NUMBER", SOURCE.number);
  vi.stubEnv("PLATFORM_WALLET_NAME", SOURCE.name);
  vi.stubEnv("PAYOUT_MANUAL_TEST_BOOKING_ID", BOOKING_ID);
  vi.stubEnv("PAYOUT_MANUAL_TEST_MAX_DEBIT_CENTS", "1710");
  vi.stubEnv("PAYOUT_API_TEST_BOOKING_ID", BOOKING_ID);
  vi.stubEnv("PAYOUT_API_TEST_EXPECTED_MAX_DEBIT_CENTS", "2710");
  vi.stubEnv("PAYOUT_DISPATCH_MODE", "hold");
  testDb = await setupTestDb();
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("@/lib/paymongo", () => ({
    inspectManualPayoutWalletFunding: async () => ({
      funding: { walletId: "wal_test_live", availableCents }, reason: "ok",
    }),
    readManualPayoutWalletFunding: async () => ({ walletId: "wal_test_live", availableCents }),
    findHostPayoutTransfers: referenceLookup,
    listPossibleHostTransfers: async () => [],
    createExternalHostPayout: createTransfer,
    getManualTransferDetails: detailsLookup,
  }));
  vi.resetModules();
  const payout = await import("@/lib/payments/manual-host-payout");
  prepare = payout.prepareManualTestPayout;
  dispatch = payout.dispatchControlledApiTestPayout;
  recover = payout.recoverControlledApiTestPayout;
});

afterAll(async () => {
  if (testDb) await teardownTestDb(testDb);
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  availableCents = 3955;
  postCount = 0;
  createdTransfer = null;
  createLosesResponse = false;
  lookupIsAmbiguous = false;
  priorTransfer = false;
  createTransfer.mockClear();
  referenceLookup.mockClear();
  detailsLookup.mockClear();
  await seedPreparedClaim();
});

describe("controlled API payout orchestration", () => {
  it("keeps the frozen recipient readable after an API attempt is reserved", async () => {
    const previousEnv = process.env.VERCEL_ENV;
    const previousToken = process.env.PAYOUT_RECIPIENT_READBACK_TOKEN;
    process.env.VERCEL_ENV = "production";
    process.env.PAYOUT_RECIPIENT_READBACK_TOKEN = "test-readback-token-with-at-least-32-chars";
    try {
      await testDb.db.execute(sql`
        UPDATE manual_host_payout_attempt SET state = 'api_reserved'
        WHERE booking_id = ${BOOKING_ID}
      `);
      const { POST } = await import("@/app/api/internal/manual-payout-recipient/route");
      const response = await POST(new Request("https://fitout.live/api/internal/manual-payout-recipient", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.PAYOUT_RECIPIENT_READBACK_TOKEN}` },
      }));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ bic: DESTINATION.bic, name: DESTINATION.name,
        number: DESTINATION.number });
      expect(postCount).toBe(0);
    } finally {
      if (previousEnv === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = previousEnv;
      if (previousToken === undefined) delete process.env.PAYOUT_RECIPIENT_READBACK_TOKEN;
      else process.env.PAYOUT_RECIPIENT_READBACK_TOKEN = previousToken;
    }
  });

  it("reserves one durable attempt, records pending, and never POSTs twice", async () => {
    expect(await dispatch(STAFF_ID)).toBe("processing");
    expect(await claim()).toMatchObject({ attemptState: "api_submitted", ledgerState: "processing",
      attemptTransferId: TRANSFER_ID, ledgerTransferId: TRANSFER_ID, actualFeeCents: 1000 });
    expect(await dispatch(STAFF_ID)).toBe("processing");
    expect(postCount).toBe(1);
  });

  it.each([0, 1000, 1200])("marks only a verified success paid at fee %i", async (feeCents) => {
    expect(await dispatch(STAFF_ID)).toBe("processing");
    createdTransfer = { ...createdTransfer!, status: "succeeded", feeCents };
    expect(await recover()).toBe("paid");
    expect(await claim()).toMatchObject({ attemptState: "api_submitted", ledgerState: "paid",
      actualFeeCents: feeCents, ledgerTransferId: TRANSFER_ID });
    expect((await claim()).paidAt).not.toBeNull();
    expect(await exceptionCauses()).toEqual(feeCents > 1000 ? ["api_fee_over_budget"] : []);
    const [earned] = projectHostEarnings([{
      bookingId: BOOKING_ID, hostId: HOST_ID, createdAt: new Date(),
      startsAt: new Date(Date.now() - 4 * 86_400_000),
      endsAt: new Date(Date.now() - 3 * 86_400_000),
      bookingStatus: "confirmed", spacePriceCents: 1900, retainedSpaceCents: null,
      currency: "php", title: "Test payout listing", timezone: "Asia/Manila",
      ledger: { grossCents: 1900, commissionCents: 190, netCents: 1710,
        recoveredCents: 0, state: (await claim()).ledgerState as "paid",
        transferId: (await claim()).ledgerTransferId,
        paidAt: new Date((await claim()).paidAt!) },
      settlement: null,
    }], HOST_ID, new Date(), 24, 1000, false);
    expect(earned.status).toBe("paid");
    expect(summarizeHostEarnings([earned]).paidCents).toBe(1710);
    expect(postCount).toBe(1);
  });

  it("serializes competing staff dispatches onto one provider POST", async () => {
    const outcomes = await Promise.all([dispatch(STAFF_ID), dispatch(STAFF_ID)]);
    expect(outcomes).toEqual(["processing", "processing"]);
    expect(postCount).toBe(1);
    expect((await claim()).ledgerState).toBe("processing");
  });

  it("records terminal failure and cannot dispatch a replacement", async () => {
    expect(await dispatch(STAFF_ID)).toBe("processing");
    createdTransfer = { ...createdTransfer!, status: "failed" };
    expect(await recover()).toBe("failed");
    expect(await dispatch(STAFF_ID)).toBe("claim_not_prepared");
    expect((await claim()).ledgerState).toBe("failed");
    expect(postCount).toBe(1);
  });

  it("recovers an accepted POST whose response was lost without sending again", async () => {
    createLosesResponse = true;
    expect(await dispatch(STAFF_ID)).toBe("processing");
    expect((await claim()).attemptTransferId).toBe(TRANSFER_ID);
    expect(await dispatch(STAFF_ID)).toBe("processing");
    expect(postCount).toBe(1);
  });

  it("holds an ambiguous reference lookup and never makes a second POST", async () => {
    createLosesResponse = true;
    lookupIsAmbiguous = true;
    expect(await dispatch(STAFF_ID)).toBe("provider_result_unresolved");
    expect((await claim()).attemptState).toBe("api_reserved");
    expect(await dispatch(STAFF_ID)).toBe("provider_result_unresolved");
    expect(postCount).toBe(1);
  });

  it("leaves an unknown provider status under the same claim", async () => {
    expect(await dispatch(STAFF_ID)).toBe("processing");
    createdTransfer = { ...createdTransfer!, status: "unknown" };
    expect(await recover()).toBe("provider_status_unresolved");
    expect((await claim()).ledgerState).toBe("processing");
    expect(await dispatch(STAFF_ID)).toBe("provider_status_unresolved");
    expect(postCount).toBe(1);
  });

  it("does not mark paid when provider identity readback contradicts the claim", async () => {
    expect(await dispatch(STAFF_ID)).toBe("processing");
    createdTransfer = { ...createdTransfer!, status: "succeeded", destination: {
      ...DESTINATION, number: "09999999702",
    } };
    expect(await recover()).toBe("transfer_identity_mismatch");
    expect((await claim()).ledgerState).toBe("processing");
    expect(postCount).toBe(1);
  });

  it.each([
    ["low balance", async () => { availableCents = 2709; }],
    ["changed destination", async () => { await testDb.db.execute(sql`
      UPDATE host_payout_destination SET account_number_ciphertext = ${encryptPayoutRecipientValue("09999999702")}
      WHERE user_id = ${HOST_ID}
    `); }],
    ["stale settlement", async () => { await testDb.db.execute(sql`
      UPDATE booking_settlement_current SET verified_at = now() - interval '2 days'
      WHERE booking_id = ${BOOKING_ID}
    `); }],
    ["ineligible host", async () => { await testDb.db.execute(sql`
      UPDATE host_verification SET status = 'suspended' WHERE user_id = ${HOST_ID}
    `); }],
    ["existing transfer", async () => { priorTransfer = true; }],
  ] as const)("makes no POST with %s", async (_label, change) => {
    await change();
    expect(await dispatch(STAFF_ID)).not.toBe("processing");
    expect((await claim()).ledgerState).toBe("held");
    expect(postCount).toBe(0);
  });
});
