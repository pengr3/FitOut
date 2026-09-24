// HOST-02 / PAY-06 — the host-cancellation invariants (07-11). ROADMAP SC#3: "a host-initiated cancellation
// produces a full refund to the booker with defined consequences."
//
// THE FIVE INVARIANTS UNDER TEST, stated before any code, because each one is a place money or a slot can
// silently go wrong:
//
//   I1. FULL REFUND, TIER IGNORED (D-70). A host cancellation refunds 100% of the CHARGED total — space
//       price AND the D-74 service fee — no matter which cancellation tier the booking snapshotted. The
//       refund ladder answers "what does the BOOKER forfeit for changing their mind"; it has no meaning when
//       the booker did nothing. Case (1) runs a STRICT-tier booking one hour out — the exact rung that would
//       award a BOOKER 0% — and asserts 100%.
//
//   I2. THE FEE IS CAPPED AT WRITE TIME (D-71). Never at netting time: the row would already misstate the
//       debt, every consumer that reads it would show the uncapped figure, and the cap would have to be
//       re-derived on every sweep. Cases (2)/(3).
//
//   I3. THE DEBIT IS AT-MOST-ONCE, AND IT DOES NOT CORRUPT PAYOUT ACCOUNTING. This file writes the FIRST
//       REAL `kind='host_cancel_fee'` row in the system's history — 07-04 scoped every ledger query to
//       `kind='payout'` specifically so this row could exist without breaking things, but until now no test
//       could prove the scoping holds against a debit the PRODUCT actually produced rather than one a
//       fixture seeded. Cases (4), (7), (8), (11), (12).
//
//   I4. THE PUNITIVE BLOCK SURVIVES THE HOST (D-70 / 07-RESEARCH Open Question 3). The anti-resell block is
//       the consequence that actually closes the abuse vector, and it is worthless if the host can delete it
//       through the shipped unblock button. Cases (5)/(6) — (6) also proves ORDINARY blocks stay deletable,
//       so the hardening did not break the Phase-3 path.
//
//   I5. THE OWNER GATE IS REAL AND IS NOT AN ENUMERATION ORACLE (T-07-61). Case (10), with a POSITIVE
//       CONTROL so the file cannot pass against an action hardcoded to return DENIED.
//
// Harness: the REAL cancelBookingAsHost / removeBlock driven through the vi.doMock idiom against an isolated
// schema, cloned from tests/booking/cancellation.test.ts. `@/lib/paymongo` is mocked so NO live call fires;
// `mockPayMongo.createRefund` is the probe for "did money get dispatched, and how often".

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { and, eq } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo } from "../helpers/mocks";
import { makeVerifiedHost } from "../helpers/seed";
import {
  user,
  listing,
  booking,
  availabilityBlock,
  hostPayoutLedger,
} from "@/lib/db/schema";
import { readDbNow } from "@/lib/booking/bookings-query";
import { formatMoney } from "@/lib/money";
import { quoteRefund, tierOrDefault } from "@/lib/payments/cancellation";
import { PAYOUT_DELAY_HOURS } from "@/lib/payments/config";
import { HOST_CANCEL_FEE_CENTS } from "@/lib/payments/fees";
import { summarizePayouts } from "@/components/host/payout-ledger-status";
import type { RateLimitOptions, RateLimitResult } from "@/lib/rate-limit";
import type { DuePayout } from "@/inngest/functions/payout-sweep";
import { encryptPayoutRecipientValue } from "@/lib/payout-recipient-crypto";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const HOST_EMAIL = "hc_host@example.com";
const OTHER_HOST_EMAIL = "hc_other_host@example.com";
/**
 * A THIRD host, used only by the netting case (8). The main host accumulates a debit from nearly every case
 * in this file, so by case (8) their outstanding debt exceeds a single payout and the sweep correctly
 * returns `settled-by-netting` — a true result, but not the one that case is trying to pin. A dedicated host
 * makes the arithmetic exact: ONE debit, ONE payout, an assertable transfer amount.
 */
const NET_HOST_EMAIL = "hc_net_host@example.com";
const BOOKER_EMAIL = "hc_booker@example.com";
const PASSWORD = "averylongpassword";

const HOURLY = 100000; // ₱1,000 space price for a 1h window
const DAY_RATE = 300000;
const SERVICE_FEE = 5000; // ₱50 (5% of ₱1,000)
const TOTAL = HOURLY + SERVICE_FEE; // ₱1,050 all-in — what the booker actually paid

/** The wallet id mockPayMongo.listWalletAccounts returns by default; host_payout must correlate to it. */
const WALLET_ID = "wal_123";
/** The netting host's own wallet — `host_payout.paymongo_account_id` is UNIQUE, so it cannot share one. */
const NET_WALLET_ID = "wal_net_456";

// The mocked next/headers reads this at CALL time, so login() can swap the session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

/** The `fitout/notify` envelope, exactly as `emitNotify` hands it to the client. `side`/`feeLabel`
 *  exposed for the 07-17 WR-04 content assertions (case 17). */
type NotifyEnvelope = {
  name: string;
  data: {
    type: string;
    recipientId: string;
    bookingId: string | null;
    payload: { href: string; refundLabel?: string; side?: string; feeLabel?: string };
  };
};
const inngestSend = vi.fn(async (event: NotifyEnvelope) => ({ ids: [event.name] }));

/**
 * The rate limiter, stubbed. The real one is a module-level Map with a 5-per-60s budget keyed on user id;
 * this file cancels far more than five bookings as the same host, so every case after the fifth would assert
 * against a rate-limit denial rather than the behaviour it names — a fixture artefact wearing a result's
 * name. The stub also makes the key and budget OBSERVABLE.
 */
const rateLimitCalls: Array<{ key: string; opts: RateLimitOptions }> = [];
let rateLimitAllows = true;
const fakeRateLimit = (key: string, opts: RateLimitOptions): RateLimitResult => {
  rateLimitCalls.push({ key, opts });
  return rateLimitAllows ? { ok: true } : { ok: false, retryAfter: 42 };
};

let testDb: TestDb;
let testAuth: TestAuth;

type CancelActions = typeof import("@/app/actions/cancel-booking");
let cancelBookingAsHost: CancelActions["cancelBookingAsHost"];
let cancelBookingAsBooker: CancelActions["cancelBookingAsBooker"];
let previewHostCancelFee: CancelActions["previewHostCancelFee"];
type BlockActions = typeof import("@/app/actions/blocks");
let removeBlock: BlockActions["removeBlock"];
type SweepModule = typeof import("@/inngest/functions/payout-sweep");
let queryDuePayouts: SweepModule["queryDuePayouts"];
let payOne: SweepModule["payOne"];
type ReconcileModule = typeof import("@/inngest/functions/payout-reconcile");
let alertStuckHeld: ReconcileModule["alertStuckHeld"];

let hostId: string;
let otherHostId: string;
let netHostId: string;
let bookerId: string;

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

/** A dedicated listing per case, so seeded rows never collide on the booking_no_overlap EXCLUDE. */
async function seedListing(
  id: string,
  opts: { policy?: "flexible" | "standard" | "strict"; hostId?: string; unitCount?: number } = {},
): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId: opts.hostId ?? hostId,
    title: `Listing ${id}`,
    status: "published",
    reviewState: "approved",
    bookingMode: "instant",
    unitCount: opts.unitCount ?? 1,
    timezone: "Asia/Manila",
    city: "Makati",
    hourlyRateCents: HOURLY,
    dayRateCents: DAY_RATE,
    cancellationPolicy: opts.policy ?? "standard",
  });
}

type SeedOpts = {
  status?: "confirmed" | "requested" | "approved";
  policy?: "flexible" | "standard" | "strict";
  spacePriceCents?: number;
  serviceFeeCents?: number;
  unit?: number;
};

/** Seed a booking whose session starts `msToStart` from the DB clock (negative = already started). */
async function seedBooking(
  id: string,
  listingId: string,
  msToStart: number,
  opts: SeedOpts = {},
): Promise<{ startsAt: Date; endsAt: Date }> {
  const base = await readDbNow(testDb.db);
  const startsAt = new Date(base.getTime() + msToStart);
  const endsAt = new Date(startsAt.getTime() + HOUR);
  const space = opts.spacePriceCents ?? HOURLY;
  const fee = opts.serviceFeeCents ?? SERVICE_FEE;
  await testDb.db.insert(booking).values({
    id,
    listingId,
    unit: opts.unit ?? 1,
    bookerId,
    startsAt,
    endsAt,
    status: opts.status ?? "confirmed",
    bookingMode: "instant",
    cancellationPolicy: opts.policy ?? "standard",
    spacePriceCents: space,
    serviceFeeCents: fee,
    quotedTotalCents: space + fee,
    currency: "php",
    paymentId: `pay_${id}`,
    paymentMethod: "gcash",
    expiresAt: null,
  });
  return { startsAt, endsAt };
}

async function readRow(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      refundCents: booking.refundCents,
      retainedSpaceCents: booking.retainedSpaceCents,
      quotedTotalCents: booking.quotedTotalCents,
      cancelledBy: booking.cancelledBy,
      cancelledAt: booking.cancelledAt,
      declineReason: booking.declineReason,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      unit: booking.unit,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

/** The DEBIT rows for a booking — kind-scoped, so a coexisting payout row can never stand in for one. */
async function readDebits(bookingId: string) {
  return testDb.db
    .select()
    .from(hostPayoutLedger)
    .where(
      and(
        eq(hostPayoutLedger.bookingId, bookingId),
        eq(hostPayoutLedger.kind, "host_cancel_fee"),
      ),
    );
}

/** The PAYOUT rows for a booking — kind-scoped the other way. */
async function readPayoutRows(bookingId: string) {
  return testDb.db
    .select()
    .from(hostPayoutLedger)
    .where(
      and(eq(hostPayoutLedger.bookingId, bookingId), eq(hostPayoutLedger.kind, "payout")),
    );
}

async function readBlocks(listingId: string) {
  return testDb.db
    .select()
    .from(availabilityBlock)
    .where(eq(availabilityBlock.listingId, listingId));
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "HC Host",
    firstName: "Hana",
    intent: "host",
  });
  await signUp(testAuth, {
    email: OTHER_HOST_EMAIL,
    password: PASSWORD,
    name: "HC Other Host",
    firstName: "Otto",
    intent: "host",
  });
  await signUp(testAuth, {
    email: NET_HOST_EMAIL,
    password: PASSWORD,
    name: "HC Net Host",
    firstName: "Nina",
    intent: "host",
  });
  await signUp(testAuth, {
    email: BOOKER_EMAIL,
    password: PASSWORD,
    name: "HC Booker",
    firstName: "Bea",
    intent: "book",
  });

  const ids = await testDb.db.select({ id: user.id, email: user.email }).from(user);
  hostId = ids.find((r) => r.email === HOST_EMAIL)!.id;
  otherHostId = ids.find((r) => r.email === OTHER_HOST_EMAIL)!.id;
  netHostId = ids.find((r) => r.email === NET_HOST_EMAIL)!.id;
  bookerId = ids.find((r) => r.email === BOOKER_EMAIL)!.id;

  // ACTIVATED payout wallets. queryDuePayouts JOINs host_payout, so without these rows no booking of these
  // hosts is ever payout-eligible — plus the ops-APPROVED host_verification row deriveBookable's sixth
  // term reads (phase 18, D-224), so the booker-side placeHold cases still reach the money path.
  await makeVerifiedHost(testDb.db, hostId, { insertUser: false, paymongoAccountId: WALLET_ID });
  await makeVerifiedHost(testDb.db, netHostId, { insertUser: false, paymongoAccountId: NET_WALLET_ID });

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("@/lib/paymongo", () => ({
    createExternalHostPayout: mockPayMongo.createBatchTransfer,
    createRefund: mockPayMongo.createRefund,
    createCheckoutSession: mockPayMongo.createCheckoutSession,
    createBatchTransfer: mockPayMongo.createBatchTransfer,
    listWalletAccounts: mockPayMongo.listWalletAccounts,
    getTransfer: mockPayMongo.getTransfer,
  }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  // `createFunction` is stubbed alongside `send` because this file imports payout-sweep / payout-reconcile
  // for their PURE, dbConn-taking exports (queryDuePayouts / payOne / alertStuckHeld) — and both modules
  // build their cron function at MODULE LOAD, so a send-only stub throws on import before any test runs.
  vi.doMock("@/inngest/client", () => ({
    inngest: {
      send: inngestSend,
      createFunction: (opts: { id: string }) => ({ id: opts.id }),
    },
  }));
  vi.doMock("@/lib/rate-limit", () => ({
    rateLimit: fakeRateLimit,
    requireWithinRateLimit: fakeRateLimit,
  }));
  vi.resetModules();
  ({ cancelBookingAsHost, cancelBookingAsBooker, previewHostCancelFee } = await import(
    "@/app/actions/cancel-booking"
  ));
  ({ removeBlock } = await import("@/app/actions/blocks"));
  ({ queryDuePayouts, payOne } = await import("@/inngest/functions/payout-sweep"));
  ({ alertStuckHeld } = await import("@/inngest/functions/payout-reconcile"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("next/cache");
  vi.doUnmock("@/inngest/client");
  vi.doUnmock("@/lib/rate-limit");
  await teardownTestDb(testDb);
});

beforeEach(() => {
  mockPayMongo.createRefund.mockClear();
  mockPayMongo.createRefund.mockResolvedValue({ id: "ref_test_123", status: "pending" });
  mockPayMongo.createBatchTransfer.mockClear();
  mockPayMongo.createBatchTransfer.mockResolvedValue({
    batchId: "batch_tr_123",
    transferId: "tr_test_123",
    status: "pending",
  });
  mockPayMongo.listWalletAccounts.mockClear();
  inngestSend.mockClear();
  inngestSend.mockResolvedValue({ ids: [] });
  rateLimitCalls.length = 0;
  rateLimitAllows = true;
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// I1 — the booker is made whole, whatever the tier says
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("cancelBookingAsHost — I1: full refund, tier deliberately not consulted", () => {
  it("(1) a STRICT booking cancelled 1h out refunds 100% — the rung that would give a BOOKER nothing", async () => {
    await seedListing("L_strict", { policy: "strict" });
    const win = await seedBooking("bk_strict", "L_strict", 1 * HOUR, { policy: "strict" });

    // First, prove the fixture is genuinely at the 0% rung. Without this the case could pass on a booking
    // that happened to sit in a 100% rung anyway, and would assert nothing at all.
    const bookerWouldGet = quoteRefund({
      tier: tierOrDefault("strict"),
      spacePriceCents: HOURLY,
      serviceFeeCents: SERVICE_FEE,
      startsAt: win.startsAt,
      now: await readDbNow(testDb.db),
    });
    expect(bookerWouldGet.refundBps).toBe(0);
    expect(bookerWouldGet.totalRefundCents).toBe(0);

    await login(HOST_EMAIL);
    const res = await cancelBookingAsHost("bk_strict", "space_unavailable");

    // 100% of the ALL-IN charge — including the D-74 service fee, which is non-refundable in every OTHER
    // cancellation path in the system. This is the one case where the platform absorbs it.
    expect(res).toEqual({ ok: true, refundCents: TOTAL });

    const row = await readRow("bk_strict");
    expect(row.refundCents).toBe(TOTAL);
    expect(row.refundCents).not.toBe(0); // emphatically NOT the strict ladder's answer
    expect(row.refundCents).not.toBe(HOURLY); // and not "space price only" either — the fee comes back too
    expect(row.status).toBe("cancelled");
    expect(row.cancelledBy).toBe("host");
    expect(row.declineReason).toBe("space_unavailable");

    // retained = 0 is what makes the 07-04 sweep predicate exclude this booking (case 7 proves the effect).
    expect(row.retainedSpaceCents).toBe(0);

    // The money was genuinely dispatched, for the full amount — not merely recorded.
    expect(mockPayMongo.createRefund).toHaveBeenCalledTimes(1);
    expect(mockPayMongo.createRefund).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: TOTAL, paymentId: "pay_bk_strict" }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// I2 — the fee is capped where it is written
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("cancelBookingAsHost — I2: the D-71 fee cap, at WRITE time", () => {
  it("(2) the fee is capped at the booking value, and is the flat fee when the booking is bigger", async () => {
    // The cap only means anything if the flat fee genuinely exceeds one of the two bookings. Pin that.
    expect(HOST_CANCEL_FEE_CENTS).toBe(30000);

    // (a) a ₱200 booking — SMALLER than the ₱300 flat fee. The host must never owe more than they'd earn.
    await seedListing("L_cap_small");
    await seedBooking("bk_cap_small", "L_cap_small", 5 * HOUR, { spacePriceCents: 20000 });
    // (b) a ₱1,000 booking — larger, so the flat fee applies untouched.
    await seedListing("L_cap_big");
    await seedBooking("bk_cap_big", "L_cap_big", 5 * HOUR, { spacePriceCents: 100000 });

    await login(HOST_EMAIL);

    // The PREVIEW the dialog renders is the same capped figure — it must not be able to disagree with the
    // number the host is then charged, in either direction.
    expect((await previewHostCancelFee("bk_cap_small"))?.feeCents).toBe(20000);
    expect((await previewHostCancelFee("bk_cap_big"))?.feeCents).toBe(30000);

    await cancelBookingAsHost("bk_cap_small", "maintenance");
    await cancelBookingAsHost("bk_cap_big", "maintenance");

    const [small] = await readDebits("bk_cap_small");
    const [big] = await readDebits("bk_cap_big");

    expect(small.netCents).toBe(-20000); // CAPPED at the booking value, not the flat -30000
    expect(small.netCents).not.toBe(-HOST_CANCEL_FEE_CENTS);
    expect(big.netCents).toBe(-30000); // uncapped — the booking is worth more than the fee
  });

  it("(3) the debit row has the exact shape 07-04's netting expects", async () => {
    await seedListing("L_shape");
    await seedBooking("bk_shape", "L_shape", 5 * HOUR);

    await login(HOST_EMAIL);
    await cancelBookingAsHost("bk_shape", "double_booked");

    const rows = await readDebits("bk_shape");
    expect(rows).toHaveLength(1);
    const [debit] = rows;

    expect(debit.kind).toBe("host_cancel_fee");
    expect(debit.netCents).toBe(-30000);
    // gross === net and commission === 0: a debit never transfers, so a commission on it is meaningless.
    // Keeping gross === net means the arithmetic stays coherent if anything ever sums the column.
    expect(debit.grossCents).toBe(debit.netCents);
    expect(debit.commissionCents).toBe(0);
    expect(debit.commissionRateBps).toBe(0);
    expect(debit.recoveredCents).toBe(0); // nothing netted yet
    expect(debit.state).toBe("held");
    expect(debit.hostId).toBe(hostId);
    expect(debit.transferId).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// I3 — at-most-once, and the debit does not corrupt payout accounting
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("cancelBookingAsHost — I3: the debit is at-most-once and payout-safe", () => {
  it("(4) a double submit produces exactly ONE debit row and exactly ONE refund", async () => {
    await seedListing("L_twice");
    await seedBooking("bk_twice", "L_twice", 5 * HOUR);

    await login(HOST_EMAIL);
    const first = await cancelBookingAsHost("bk_twice", "other");
    const second = await cancelBookingAsHost("bk_twice", "other");

    expect(first.ok).toBe(true);
    // The second call is a calm 0-row result on the status-scoped UPDATE — a message, never a 500 and never
    // a second charge.
    expect(second.ok).toBe(false);

    // The row count is asserted DIRECTLY rather than inferred from the second result: the UNIQUE
    // (booking_id, kind) INSERT-as-lock is the guarantee, and the status guard merely gets there first.
    expect(await readDebits("bk_twice")).toHaveLength(1);
    expect(mockPayMongo.createRefund).toHaveBeenCalledTimes(1);

    // And exactly one auto-block, not two.
    const blocks = await readBlocks("L_twice");
    expect(blocks.filter((b) => b.reason === "host_cancellation")).toHaveLength(1);
  });

  it("(7) the host-cancelled booking is NEVER selected for payout, and writes no payout row", async () => {
    // A booking whose session has already ended and whose payout delay has fully elapsed — i.e. one that
    // WOULD be swept if retained were non-zero — but which was host-cancelled before it started.
    await seedListing("L_nopayout");
    await seedBooking("bk_nopayout", "L_nopayout", 2 * HOUR);

    await login(HOST_EMAIL);
    await cancelBookingAsHost("bk_nopayout", "maintenance");

    // Age it past ends_at + PAYOUT_DELAY_HOURS so time is not what excludes it — only retained = 0 is.
    await testDb.db
      .update(booking)
      .set({
        startsAt: new Date(Date.now() - (PAYOUT_DELAY_HOURS + 3) * HOUR),
        endsAt: new Date(Date.now() - (PAYOUT_DELAY_HOURS + 2) * HOUR),
      })
      .where(eq(booking.id, "bk_nopayout"));

    const due = await queryDuePayouts(testDb.db);
    expect(due.map((d) => d.bookingId)).not.toContain("bk_nopayout");
    expect(await readPayoutRows("bk_nopayout")).toHaveLength(0);

    // The debit is still there — the host gets no payout AND owes the fee. Both halves matter.
    expect(await readDebits("bk_nopayout")).toHaveLength(1);
  });

  it("(8) a REAL debit is netted off the host's next payout, and the transfer is reduced by exactly it", async () => {
    // The seam into 07-04's netting. Every prior test of it seeded the debit by hand; this one uses the row
    // the PRODUCT wrote, which is the only version that proves the two halves agree on the shape.
    //
    // Runs as the DEDICATED netting host so the outstanding debt is exactly one debit — see NET_HOST_EMAIL.
    await seedListing("L_net_cancel", { hostId: netHostId });
    await seedBooking("bk_net_cancel", "L_net_cancel", 5 * HOUR, { spacePriceCents: 100000 });

    await login(NET_HOST_EMAIL);
    await cancelBookingAsHost("bk_net_cancel", "guest_requested");

    const [debitBefore] = await readDebits("bk_net_cancel");
    expect(debitBefore.netCents).toBe(-30000);
    expect(debitBefore.recoveredCents).toBe(0);

    // An UNRELATED, genuinely payable booking for the SAME host. Gross ₱2,000 → commission ₱200 → net ₱1,800.
    await seedListing("L_net_payable", { hostId: netHostId });
    await seedBooking("bk_net_payable", "L_net_payable", 5 * HOUR, { spacePriceCents: 200000 });

    // This host's own wallet — the sweep correlates `wallet.id === paymongoAccountId` and never takes [0].
    mockPayMongo.listWalletAccounts.mockResolvedValueOnce([
      {
        id: NET_WALLET_ID,
        accountNumber: "9990002222",
        accountName: "Net Host Wallet",
        status: "activated",
      },
    ]);

    const duePayout: DuePayout = {
      bookingId: "bk_net_payable",
      listingId: "L_net_payable",
      payoutGrossCents: 200000,
      currency: "php",
      hostId: netHostId,
      paymentId: "pay_bk_net_payable",
      paymongoAccountId: NET_WALLET_ID,
      institutionBic: "TESTPHM2XXX",
      accountNameCiphertext: encryptPayoutRecipientValue("Net Host"),
      accountNumberCiphertext: encryptPayoutRecipientValue("9990002222"),
    };
    const result = await payOne(testDb.db, duePayout);

    expect(result.status).toBe("paid");
    // 180000 net − 30000 debit = 150000 transferred. The host is paid, less exactly the fee they owe.
    expect(mockPayMongo.createBatchTransfer).toHaveBeenCalledTimes(1);
    expect(mockPayMongo.createBatchTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ netCents: 150000 }),
    );
    if (result.status === "paid") {
      expect(result.netCents).toBe(150000);
      expect(result.deductedCents).toBe(30000);
    }

    // The debit is now fully recovered and terminal — it can never be netted a second time.
    const [debitAfter] = await readDebits("bk_net_cancel");
    expect(debitAfter.recoveredCents).toBe(30000);
    expect(debitAfter.recoveredCents).toBe(-debitAfter.netCents);
    expect(debitAfter.state).toBe("paid");

    // The payout row memoises the applied deduction (07-04 Deviation 2) so a WR-04 retry cannot forgive it.
    const [payoutRow] = await readPayoutRows("bk_net_payable");
    expect(payoutRow.recoveredCents).toBe(30000);
    expect(payoutRow.grossCents).toBe(200000); // the SPACE price, never the all-in charged total
  });

  it("(11) a real debit does NOT trip the reconcile stuck-`held` operator alert", async () => {
    // The debit is inserted `held` and STAYS held until fully netted — for a host who never hosts again,
    // forever. Unscoped, the stuck-held query would fire a false [payout-alert] on every host cancellation,
    // and operators who learn to ignore that channel miss a real transfer failure. This is the failure mode
    // 07-04's kind scoping exists to prevent, now exercised against a debit the product actually wrote.
    await seedListing("L_stuck");
    await seedBooking("bk_stuck", "L_stuck", 5 * HOUR);

    await login(HOST_EMAIL);
    await cancelBookingAsHost("bk_stuck", "maintenance");

    const [debit] = await readDebits("bk_stuck");
    // Age it well past the 48h stuck threshold — if kind scoping were absent this WOULD alert.
    await testDb.db
      .update(hostPayoutLedger)
      .set({ createdAt: new Date(Date.now() - 200 * HOUR) })
      .where(eq(hostPayoutLedger.id, debit.id));

    const alertSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const stuck = await alertStuckHeld(testDb.db);
      expect(stuck).toBe(0);
      expect(alertSpy).not.toHaveBeenCalled();
    } finally {
      alertSpy.mockRestore();
    }

    // And the row is genuinely still sitting there, `held` and aged — the alert is silent because it is
    // correctly scoped, not because the fixture failed to produce a candidate.
    const [still] = await readDebits("bk_stuck");
    expect(still.state).toBe("held");
  });

  it("(12) the /host/earnings view excludes the debit from its rows AND its totals", async () => {
    // The most user-visible way a debit could corrupt accounting: silently inflating or deflating the
    // host's "Upcoming payouts" figure. Runs the page's own kind-scoped read and its own summing helper.
    await seedListing("L_earn");
    await seedBooking("bk_earn", "L_earn", 5 * HOUR);
    await login(HOST_EMAIL);
    await cancelBookingAsHost("bk_earn", "other");

    // A real payout row for the same host, so there is a genuine total for the debit to corrupt.
    await seedListing("L_earn_paid");
    await seedBooking("bk_earn_paid", "L_earn_paid", 5 * HOUR);
    await testDb.db.insert(hostPayoutLedger).values({
      id: "led_earn_paid",
      bookingId: "bk_earn_paid",
      hostId,
      grossCents: 100000,
      commissionRateBps: 1000,
      commissionCents: 10000,
      netCents: 90000,
      currency: "php",
      state: "held",
    });

    // The EXACT predicate /host/earnings runs: owner-scoped AND kind-scoped.
    const rows = await testDb.db
      .select({ state: hostPayoutLedger.state, netCents: hostPayoutLedger.netCents })
      .from(hostPayoutLedger)
      .where(
        and(eq(hostPayoutLedger.hostId, hostId), eq(hostPayoutLedger.kind, "payout")),
      );

    expect(rows.some((r) => r.netCents < 0)).toBe(false); // no debit ever reaches the row list
    const { upcomingCents } = summarizePayouts(rows);
    // Unscoped, the -30000 debit would drag this total down and the host would see a smaller "Upcoming"
    // figure than they are actually owed, with no line explaining it.
    expect(upcomingCents).toBeGreaterThanOrEqual(90000);
    expect(upcomingCents % 10).toBe(0);

    // The debt is not hidden — it surfaces through the SEPARATE outstanding query the page runs for it.
    const [{ outstandingCents }] = (await testDb.db.execute(
      (await import("drizzle-orm")).sql`
        SELECT COALESCE(SUM(-net_cents - recovered_cents), 0)::int AS "outstandingCents"
        FROM host_payout_ledger
        WHERE host_id = ${hostId} AND kind = 'host_cancel_fee' AND recovered_cents < -net_cents
      `,
    )) as unknown as { outstandingCents: number }[];
    expect(outstandingCents).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// I4 — the punitive block, and its undeletability
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("cancelBookingAsHost — I4: the anti-resell auto-block (D-70)", () => {
  it("(5) the freed window is auto-blocked on the same listing, unit and [startsAt, endsAt)", async () => {
    await seedListing("L_block", { unitCount: 3 });
    const win = await seedBooking("bk_block", "L_block", 6 * HOUR, { unit: 2 });

    await login(HOST_EMAIL);
    await cancelBookingAsHost("bk_block", "double_booked");

    const blocks = await readBlocks("L_block");
    expect(blocks).toHaveLength(1);
    const [b] = blocks;

    expect(b.reason).toBe("host_cancellation");
    // The SAME unit the booking occupied — blocking the whole listing would punish the host's other two
    // units for a cancellation that only ever freed one of them.
    expect(b.unit).toBe(2);
    expect(b.startsAt.getTime()).toBe(win.startsAt.getTime());
    expect(b.endsAt.getTime()).toBe(win.endsAt.getTime());
  });

  it("(6) the host CANNOT unblock a punitive block — but ordinary blocks are still deletable", async () => {
    await seedListing("L_unblock");
    await seedBooking("bk_unblock", "L_unblock", 7 * HOUR);

    await login(HOST_EMAIL);
    await cancelBookingAsHost("bk_unblock", "space_unavailable");

    const [punitive] = (await readBlocks("L_unblock")).filter(
      (b) => b.reason === "host_cancellation",
    );
    expect(punitive).toBeDefined();

    // The owning host, through the shipped unblock action, on their own listing — every gate satisfied
    // EXCEPT the sentinel. This is exactly the move D-70's abuse vector requires.
    const refused = await removeBlock("L_unblock", punitive.id);
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.error).toBe("That block was created by a cancellation and can't be removed.");
    }

    // And it genuinely survived — the refusal is not merely a message over a completed delete.
    const survivors = await readBlocks("L_unblock");
    expect(survivors.map((b) => b.id)).toContain(punitive.id);

    // POSITIVE CONTROL for the hardening: an ORDINARY block (reason NULL) must still delete. Without this
    // the case would also pass against a removeBlock that refused everything, which would silently break
    // the shipped Phase-3 unblock button for every host.
    await testDb.db.insert(availabilityBlock).values({
      id: "blk_ordinary",
      listingId: "L_unblock",
      unit: null,
      startsAt: new Date(Date.now() + 40 * HOUR),
      endsAt: new Date(Date.now() + 42 * HOUR),
      reason: null,
    });
    const removed = await removeBlock("L_unblock", "blk_ordinary");
    expect(removed.ok).toBe(true);
    expect((await readBlocks("L_unblock")).map((b) => b.id)).not.toContain("blk_ordinary");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// I5 — the gates
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("cancelBookingAsHost — I5: refusals and the owner gate", () => {
  it("(9) a booking whose session has already started is refused, and NOTHING happens", async () => {
    await seedListing("L_past");
    await seedBooking("bk_past", "L_past", -30 * MIN); // started half an hour ago

    await login(HOST_EMAIL);
    const res = await cancelBookingAsHost("bk_past", "maintenance");

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("already started");

    const row = await readRow("bk_past");
    expect(row.status).toBe("confirmed"); // untouched
    expect(row.refundCents).toBeNull();
    expect(row.cancelledAt).toBeNull();
    expect(await readBlocks("L_past")).toHaveLength(0); // no block
    expect(await readDebits("bk_past")).toHaveLength(0); // no debit
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled(); // no money
  });

  it("(10) a host cannot cancel another host's booking, and cannot tell it apart from a missing id", async () => {
    await seedListing("L_theirs", { hostId: otherHostId });
    await seedBooking("bk_theirs", "L_theirs", 8 * HOUR);

    await login(HOST_EMAIL); // our host — NOT the owner of L_theirs
    const crossHost = await cancelBookingAsHost("bk_theirs", "other");
    const missing = await cancelBookingAsHost("bk_does_not_exist", "other");

    expect(crossHost.ok).toBe(false);
    expect(missing.ok).toBe(false);
    // Asserted BETWEEN the two paths rather than each against a literal: what makes this a non-oracle is
    // that the two are indistinguishable, and only a direct comparison can prove that.
    expect(crossHost).toEqual(missing);

    // The other host's booking is BYTE-FOR-BYTE unmodified.
    const row = await readRow("bk_theirs");
    expect(row.status).toBe("confirmed");
    expect(row.refundCents).toBeNull();
    expect(row.retainedSpaceCents).toBeNull();
    expect(row.cancelledBy).toBeNull();
    expect(await readDebits("bk_theirs")).toHaveLength(0);
    expect(await readBlocks("L_theirs")).toHaveLength(0);
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();

    // The preview leaks nothing either — a cross-host fee quote would confirm the booking exists.
    expect(await previewHostCancelFee("bk_theirs")).toBeNull();

    // POSITIVE CONTROL — without it this whole file would pass against an action hardcoded to return DENIED.
    await login(OTHER_HOST_EMAIL);
    const owner = await cancelBookingAsHost("bk_theirs", "other");
    expect(owner).toEqual({ ok: true, refundCents: TOTAL });
    expect((await readRow("bk_theirs")).status).toBe("cancelled");
  });

  it("(13) an unknown reason is a calm denial and changes nothing (server-action args are not runtime-typed)", async () => {
    await seedListing("L_badreason");
    await seedBooking("bk_badreason", "L_badreason", 9 * HOUR);

    await login(HOST_EMAIL);
    const res = await cancelBookingAsHost(
      "bk_badreason",
      "'; DROP TABLE booking; --" as never,
    );

    expect(res.ok).toBe(false);
    expect((await readRow("bk_badreason")).status).toBe("confirmed");
    expect(await readDebits("bk_badreason")).toHaveLength(0);
  });

  it("(14) host-cancel spam is rate-limited on its own key, audited, and moves nothing", async () => {
    await seedListing("L_rl");
    await seedBooking("bk_rl", "L_rl", 10 * HOUR);

    await login(HOST_EMAIL);
    rateLimitAllows = false;
    const res = await cancelBookingAsHost("bk_rl", "other");

    expect(res.ok).toBe(false);
    expect(rateLimitCalls.at(-1)).toEqual({
      key: `host-cancel:${hostId}`,
      opts: { window: 60, max: 5 },
    });
    expect((await readRow("bk_rl")).status).toBe("confirmed");
    expect(await readDebits("bk_rl")).toHaveLength(0);
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// Notifications — including the 07-10 dead-href regression
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("cancelBookingAsHost — notifications", () => {
  it("(15) both sides are told, and EVERY href is ABSOLUTE (the 07-10 dead-link regression)", async () => {
    await seedListing("L_notify");
    await seedBooking("bk_notify", "L_notify", 11 * HOUR);

    await login(HOST_EMAIL);
    await cancelBookingAsHost("bk_notify", "space_unavailable");

    const sent = inngestSend.mock.calls.map((c) => c[0]);
    expect(sent).toHaveLength(2);

    const toBooker = sent.find((e) => e.data.recipientId === bookerId);
    const toHost = sent.find((e) => e.data.recipientId === hostId);
    expect(toBooker?.data.type).toBe("booking_cancelled_by_host");
    expect(toHost?.data.type).toBe("booking_cancelled_by_host");
    // The booker is told the figure in writing — the whole point of the notice.
    expect(toBooker?.data.payload.refundLabel).toBe("₱1,050.00");

    // ⚠️ REGRESSION GUARD (found by 07-10). One payload string feeds BOTH channels (D-91). An email client
    // has no origin to resolve `/bookings/123` against, so a root-relative href is a DEAD LINK in the email
    // half — silently, in the one message the recipient most needs to act on.
    for (const e of sent) {
      expect(e.data.payload.href).toMatch(/^https?:\/\//);
    }
  });

  it("(17 · WR-04) each envelope declares its audience: booker side sans fee, host side with the exact fee", async () => {
    // The emission half of WR-04. Pre-fix both recipients got the SAME payload shape and the host read
    // the booker's copy — "You're getting a full refund" — while the D-71 fee appeared in no channel.
    await seedListing("L_sides");
    await seedBooking("bk_sides", "L_sides", 12 * HOUR); // space ₱1,000 > flat fee ₱300 → fee uncapped, > 0

    await login(HOST_EMAIL);
    const res = await cancelBookingAsHost("bk_sides", "maintenance");
    expect(res.ok).toBe(true);

    const sent = inngestSend.mock.calls
      .map((c) => c[0])
      .filter((e) => e.name === "fitout/notify" && e.data.bookingId === "bk_sides");
    const toBooker = sent.find((e) => e.data.recipientId === bookerId);
    const toHost = sent.find((e) => e.data.recipientId === hostId);
    expect(toBooker).toBeDefined();
    expect(toHost).toBeDefined();

    // The booker's payload declares the booker audience and carries NO fee — the fee is the host's
    // consequence, not the booker's business (asserted on payload CONTENT, never call counts).
    expect(toBooker!.data.payload.side).toBe("booker");
    expect(toBooker!.data.payload.feeLabel).toBeUndefined();

    // The host's payload declares the host audience and carries the EXACT charged fee, through the same
    // formatter the action uses.
    expect(toHost!.data.payload.side).toBe("host");
    expect(toHost!.data.payload.feeLabel).toBe(
      formatMoney(Math.min(HOST_CANCEL_FEE_CENTS, HOURLY), "php"),
    );
  });

  it("(16) the BOOKER path's hrefs are absolute too — the same defect, the other action", async () => {
    await seedListing("L_notify_booker");
    await seedBooking("bk_notify_booker", "L_notify_booker", 30 * HOUR);

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker("bk_notify_booker");
    expect(res.ok).toBe(true);

    const sent = inngestSend.mock.calls.map((c) => c[0]);
    expect(sent.length).toBeGreaterThan(0);
    for (const e of sent) {
      expect(e.data.payload.href).toMatch(/^https?:\/\//);
    }
  });
});
