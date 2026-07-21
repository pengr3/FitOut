// D-74/D-76 service fee FROZEN AT HOLD CREATION (07-08) — the integration proof that every new booking
// carries THREE frozen money values rather than one, and that a later policy change can never rewrite them.
//
// Why three and not one (07-RESEARCH Finding 2):
//   space_price_cents  — the listing-priced portion. The PAYOUT basis. The host is paid space − commission.
//   service_fee_cents  — platform revenue, NON-REFUNDABLE (D-74). Never enters a payout.
//   quoted_total_cents — space + fee. The CHARGE basis: what PayMongo charges and what a refund references.
// Freezing only the all-in total would hand the host 90% of the platform's own service fee, inverting the
// entire purpose of D-74. 07-04 already made the sweep read space_price_cents and FAIL CLOSED when it is
// null — until this plan landed, every newly created booking had a null basis and refused to pay out.
//
// What is proven here, against a real Postgres on an isolated schema:
//   frozen triple      — an hourly hold on a ₱500/hr listing for 2 hours persists 100000 / 5000 / 105000.
//   exact split        — quoted == space + fee at every price in a sweep chosen to include odd centavo
//                        remainders (1, 99, 12345) and both ends of the plausible range. No rounding drift.
//   applied rate       — the fee equals computeServiceFee's output at SERVICE_FEE_BPS, never a literal.
//   freeze (D-51 idiom)— a LATER rate change never rewrites an existing booking: the persisted amount is
//                        the one computed at creation, not a live recompute.
//   replay identity    — an idempotent replay returns the SAME frozen triple as the fresh insert.
//   tier snapshot      — booking.cancellation_policy is captured from the listing at creation (D-67)…
//   tier immutability  — …and a host RETIERING the listing afterwards does NOT rewrite it.
//   pure seam intact   — quoteWindow still returns the SPACE price only; it never learns about the fee.
//   payout end-to-end  — a booking created through this path sweeps on the SPACE price, with the service
//                        fee excluded from both the gross and the transfer (the 07-04 contract, closed).
//
// Money discipline: every expectation is derived from computeServiceFee / computeCommission — the shared
// pure modules — never from a hand-written percentage, so a rate change moves the test with the code.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, booking, hostPayout, hostPayoutLedger } from "@/lib/db/schema";
import { createPendingHold } from "@/lib/availability/units";
import { quoteWindow } from "@/lib/booking/pricing";
import { computeServiceFee } from "@/lib/payments/service-fee";
import { computeCommission } from "@/lib/payments/commission";
import { SERVICE_FEE_BPS, PAYOUT_DELAY_HOURS } from "@/lib/payments/config";

let testDb: TestDb;
type SweepModule = typeof import("@/inngest/functions/payout-sweep");
let queryDuePayouts: SweepModule["queryDuePayouts"];
let payOne: SweepModule["payOne"];

const HOST = "sf_host";
const BOOKER = "sf_booker";
const HOUR = 3_600_000;

/** Every hold is placed comfortably past MIN_LEAD_INSTANT_MINUTES so the D-96 guard never interferes. */
const LEAD_MS = 3 * HOUR;

let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;

type ListingOpts = {
  hourlyRateCents?: number | null;
  dayRateCents?: number | null;
  cancellationPolicy?: "flexible" | "standard" | "strict" | null;
};

/** A dedicated listing per case, so seeded holds never collide on the booking_no_overlap EXCLUDE. */
async function makeListing(opts: ListingOpts = {}): Promise<string> {
  const id = uid("L_sf");
  await testDb.db.insert(listing).values({
    id,
    hostId: HOST,
    title: `Listing ${id}`,
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Makati",
    hourlyRateCents: opts.hourlyRateCents === undefined ? 50000 : opts.hourlyRateCents,
    dayRateCents: opts.dayRateCents === undefined ? 300000 : opts.dayRateCents,
    cancellationPolicy: opts.cancellationPolicy ?? null,
    currency: "php",
  });
  return id;
}

/** The three frozen money columns + the tier snapshot, read straight back off the persisted row. */
async function readFrozen(bookingId: string) {
  const [row] = await testDb.db
    .select({
      spacePriceCents: booking.spacePriceCents,
      serviceFeeCents: booking.serviceFeeCents,
      quotedTotalCents: booking.quotedTotalCents,
      cancellationPolicy: booking.cancellationPolicy,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
    })
    .from(booking)
    .where(eq(booking.id, bookingId));
  return row;
}

/** Place an instant hold `hours` long, starting LEAD_MS out. Throws on the error branch (never expected). */
async function hold(
  listingId: string,
  opts: { hours?: number; fullDay?: boolean; idempotencyKey?: string } = {},
) {
  const startsAt = new Date(Date.now() + LEAD_MS);
  const endsAt = new Date(startsAt.getTime() + (opts.hours ?? 1) * HOUR);
  const res = await createPendingHold(testDb.db, {
    listingId,
    bookerId: BOOKER,
    startsAt,
    endsAt,
    fullDay: opts.fullDay ?? false,
    idempotencyKey: opts.idempotencyKey ?? null,
  });
  if ("error" in res) throw new Error(`hold refused: ${res.error}`);
  return res;
}

beforeAll(async () => {
  testDb = await setupTestDb();
  await testDb.db.insert(user).values([
    { id: HOST, name: "SF Host", email: "sf_host@example.com", firstName: "Host", canHost: true },
    { id: BOOKER, name: "SF Booker", email: "sf_booker@example.com", firstName: "Booker" },
  ]);
  await testDb.db.insert(hostPayout).values({
    userId: HOST,
    paymongoAccountId: "acct_sf_host",
    activationStatus: "activated",
    payoutsEnabled: true,
  });

  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("@/lib/paymongo", () => ({
    createBatchTransfer: mockPayMongo.createBatchTransfer,
    listWalletAccounts: mockPayMongo.listWalletAccounts,
    getTransfer: mockPayMongo.getTransfer,
    createRefund: mockPayMongo.createRefund,
  }));
  const mod = await import("@/inngest/functions/payout-sweep");
  queryDuePayouts = mod.queryDuePayouts;
  payOne = mod.payOne;
});

afterAll(async () => {
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  await teardownTestDb(testDb);
});

// ── 1. The frozen triple ──────────────────────────────────────────────────────────────────────────────
describe("D-74 every new hold freezes space + fee + all-in", () => {
  it("₱500/hr × 2 hours persists space 100000, fee 5000, all-in 105000", async () => {
    const listingId = await makeListing({ hourlyRateCents: 50000 });
    const res = await hold(listingId, { hours: 2 });

    const row = await readFrozen(res.id);
    expect(row.spacePriceCents).toBe(100000);
    expect(row.serviceFeeCents).toBe(5000);
    expect(row.quotedTotalCents).toBe(105000);
  });

  it("the all-in total is EXACTLY space + fee at every price point (no rounding drift)", async () => {
    // Chosen to straddle the rounding rule: 1 and 99 round to 0 fee, 12345 leaves an odd remainder, and
    // 999999 is a large total. If allInCents were ever re-rounded rather than derived by addition, the
    // identity below is the assertion that catches it.
    for (const price of [1, 99, 100, 999, 12345, 999999]) {
      const listingId = await makeListing({ dayRateCents: price, hourlyRateCents: null });
      const res = await hold(listingId, { fullDay: true });
      const row = await readFrozen(res.id);
      const expected = computeServiceFee(price);

      expect(row.spacePriceCents).toBe(price);
      expect(row.serviceFeeCents).toBe(expected.serviceFeeCents);
      expect(row.quotedTotalCents).toBe(expected.allInCents);
      // The load-bearing identity, asserted directly off the persisted integers.
      expect(row.quotedTotalCents).toBe(row.spacePriceCents! + row.serviceFeeCents!);
    }
  });

  it("the applied rate is SERVICE_FEE_BPS — never a literal at the call site", async () => {
    const listingId = await makeListing({ hourlyRateCents: 77777 });
    const res = await hold(listingId, { hours: 3 });
    const row = await readFrozen(res.id);

    const space = 77777 * 3;
    expect(row.spacePriceCents).toBe(space);
    expect(row.serviceFeeCents).toBe(computeServiceFee(space, SERVICE_FEE_BPS).serviceFeeCents);
  });

  it("a LATER rate change never rewrites an existing booking (the D-51 freeze idiom)", async () => {
    const listingId = await makeListing({ hourlyRateCents: 50000 });
    const res = await hold(listingId, { hours: 2 });
    const before = await readFrozen(res.id);

    // Simulate the platform doubling the fee AFTER this booking exists. The persisted amount must stay the
    // one computed at creation — a live recompute at read time would produce the larger figure below.
    const atDoubleRate = computeServiceFee(before.spacePriceCents!, SERVICE_FEE_BPS * 2);
    expect(atDoubleRate.serviceFeeCents).not.toBe(before.serviceFeeCents);

    // Mutate the listing's rates too — nothing about the listing may reach back into a frozen booking.
    await testDb.db
      .update(listing)
      .set({ hourlyRateCents: 999999, dayRateCents: 999999 })
      .where(eq(listing.id, listingId));

    const after = await readFrozen(res.id);
    expect(after.spacePriceCents).toBe(before.spacePriceCents);
    expect(after.serviceFeeCents).toBe(before.serviceFeeCents);
    expect(after.quotedTotalCents).toBe(before.quotedTotalCents);
  });

  it("an idempotent replay returns the SAME frozen triple as the fresh insert", async () => {
    const listingId = await makeListing({ hourlyRateCents: 50000 });
    const key = uid("idem");
    const first = await hold(listingId, { hours: 2, idempotencyKey: key });
    const replay = await hold(listingId, { hours: 2, idempotencyKey: key });

    expect(replay.replayed).toBe(true);
    expect(replay.id).toBe(first.id);
    expect(replay.spacePriceCents).toBe(first.spacePriceCents);
    expect(replay.serviceFeeCents).toBe(first.serviceFeeCents);
    expect(replay.quotedTotalCents).toBe(first.quotedTotalCents);

    // …and the replayed values are the PERSISTED ones, not a recompute.
    const row = await readFrozen(first.id);
    expect(replay.spacePriceCents).toBe(row.spacePriceCents);
    expect(replay.serviceFeeCents).toBe(row.serviceFeeCents);
    expect(replay.quotedTotalCents).toBe(row.quotedTotalCents);
  });
});

// ── 2. The D-67 cancellation-tier snapshot ────────────────────────────────────────────────────────────
describe("D-67 the cancellation tier is snapshotted at creation", () => {
  it("a 'strict' listing mints a booking with cancellation_policy = 'strict'", async () => {
    const listingId = await makeListing({ cancellationPolicy: "strict" });
    const res = await hold(listingId);
    expect((await readFrozen(res.id)).cancellationPolicy).toBe("strict");
  });

  it("each tier is captured verbatim", async () => {
    for (const tier of ["flexible", "standard", "strict"] as const) {
      const listingId = await makeListing({ cancellationPolicy: tier });
      const res = await hold(listingId);
      expect((await readFrozen(res.id)).cancellationPolicy).toBe(tier);
    }
  });

  it("RETIERING the listing afterwards does NOT rewrite the in-flight booking's terms", async () => {
    const listingId = await makeListing({ cancellationPolicy: "strict" });
    const res = await hold(listingId);
    expect((await readFrozen(res.id)).cancellationPolicy).toBe("strict");

    // The host relaxes the listing's policy. A booking already taken under Strict keeps Strict — the
    // refund calculator reads THIS column, never the listing's current value (T-07-43).
    await testDb.db
      .update(listing)
      .set({ cancellationPolicy: "flexible" })
      .where(eq(listing.id, listingId));

    expect((await readFrozen(res.id)).cancellationPolicy).toBe("strict");
  });

  it("a listing with no tier yet (pre-D-77 rows) snapshots NULL rather than guessing one", async () => {
    const listingId = await makeListing({ cancellationPolicy: null });
    const res = await hold(listingId);
    expect((await readFrozen(res.id)).cancellationPolicy).toBeNull();
  });
});

// ── 3. The Phase-4 pure-pricing seam is untouched ─────────────────────────────────────────────────────
describe("quoteWindow stays fee-free", () => {
  it("still returns the SPACE price only — it never learns about platform fees", () => {
    const startUtc = new Date("2027-03-01T02:00:00Z");
    const endUtc = new Date("2027-03-01T04:00:00Z");
    const quote = quoteWindow({ startUtc, endUtc, fullDay: false, hourlyRateCents: 50000, dayRateCents: null });

    expect(quote.totalCents).toBe(100000); // NOT 105000 — the fee is composed at the caller
  });
});

// ── 4. The 07-04 payout contract, closed end to end ───────────────────────────────────────────────────
describe("the payout sweep pays on the SPACE price, with the service fee excluded", () => {
  it("a booking created through createPendingHold grosses on space, never on the all-in charge", async () => {
    // Correlate a wallet to THIS host's Linked-Account id — payOne matches by id, never wallet[0].
    mockPayMongo.listWalletAccounts.mockResolvedValue([
      { id: "acct_sf_host", accountNumber: "9990001111", accountName: "SF Host Wallet", status: "activated" },
    ]);
    const listingId = await makeListing({ hourlyRateCents: 50000 });
    const res = await hold(listingId, { hours: 2 });
    const frozen = await readFrozen(res.id);

    // Move the session into the past and confirm it, so the sweep's due predicate selects it. The frozen
    // money columns are untouched by this — which is the whole point of freezing them at creation.
    const endsAt = new Date(Date.now() - (PAYOUT_DELAY_HOURS + 1) * HOUR);
    const startsAt = new Date(endsAt.getTime() - 2 * HOUR);
    await testDb.db
      .update(booking)
      .set({ status: "confirmed", startsAt, endsAt, expiresAt: null })
      .where(eq(booking.id, res.id));

    const due = (await queryDuePayouts(testDb.db)).filter((d) => d.bookingId === res.id);
    expect(due).toHaveLength(1);
    // The 07-04 fail-closed guard is satisfied: the basis is a real integer, and it is the SPACE price.
    expect(due[0].payoutGrossCents).toBe(frozen.spacePriceCents);
    expect(due[0].payoutGrossCents).not.toBe(frozen.quotedTotalCents);

    const result = await payOne(testDb.db, due[0]);
    expect(result.status).toBe("paid");

    const [ledger] = await testDb.db
      .select()
      .from(hostPayoutLedger)
      .where(and(eq(hostPayoutLedger.bookingId, res.id), eq(hostPayoutLedger.kind, "payout")));

    const expected = computeCommission(frozen.spacePriceCents!);
    expect(ledger.grossCents).toBe(frozen.spacePriceCents);
    expect(ledger.netCents).toBe(expected.netCents);
    // The service fee never reaches the host: the net is strictly below what the booker was charged, by
    // more than the commission alone would explain.
    expect(ledger.netCents).toBeLessThan(frozen.quotedTotalCents! - expected.commissionCents);
  });
});
