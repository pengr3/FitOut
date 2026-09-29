import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { booking, listing, user } from "@/lib/db/schema";
import { currentSettlementProof, isCorrelatedSettlement, recordSettlementObservation } from "@/lib/payments/settlement";

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

it("correlates only a complete deposited payment into the verified Wallet", () => {
  expect(isCorrelatedSettlement(deposited, "pay_exact", "php", true)).toBe(true);
  expect(isCorrelatedSettlement({ ...deposited, paginationComplete: false }, "pay_exact", "php", true)).toBe(false);
  expect(isCorrelatedSettlement({ ...deposited, destinationMatched: false }, "pay_exact", "php", true)).toBe(false);
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

});
