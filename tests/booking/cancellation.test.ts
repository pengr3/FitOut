// BOOK-07 / PAY-06 — the nine invariants the booker cancellation flow rests on (07-09).
//
// ROADMAP SC#2 says the booker must see "the EXACT refund amount before confirming". The word `exact` is
// load-bearing and it is what most of this file exists to pin: the number the review page computes and the
// number the action writes and dispatches must be the same number, always, including at a rung boundary
// where a minute's drift flips the tier.
//
// Harness: the REAL cancelBookingAsBooker / cancelUnpaidHold driven through the vi.doMock idiom (mock
// next/headers, @/lib/auth, @/lib/db, @/lib/paymongo, next/cache → import the actions) against an isolated
// schema. Cloned from tests/booking/host-requests.test.ts. `@/lib/paymongo` is mocked so NO live PayMongo
// call can fire; `mockPayMongo.createRefund` is the probe for "did money get dispatched, and how often".

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, booking } from "@/lib/db/schema";
import { quoteRefund, tierOrDefault } from "@/lib/payments/cancellation";
import { readDbNow } from "@/lib/booking/bookings-query";
import type { RateLimitOptions, RateLimitResult } from "@/lib/rate-limit";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const HOST_EMAIL = "cx_host@example.com";
const BOOKER_EMAIL = "cx_booker@example.com";
const PASSWORD = "averylongpassword";
const HOURLY = 100000; // ₱1,000 space price for a 1h window — the UI-SPEC worked example
const DAY_RATE = 300000;
const SERVICE_FEE = 5000; // ₱50 (5% of ₱1,000)

// The mocked next/headers reads this at CALL time, so login() can swap the session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

/**
 * The Inngest client, stubbed at the MODULE the action's graph actually resolves. `vi.spyOn` on an import
 * held by this file would patch the pre-`resetModules` instance and silently miss — `emitNotify` swallows
 * its own errors, so the miss would look exactly like a pass. Stubbing the module makes the emission
 * observable and, in case (9), controllably broken.
 */
/** The `fitout/notify` envelope, exactly as `emitNotify` hands it to the client. */
type NotifyEnvelope = { name: string; data: { type: string; recipientId: string; bookingId: string | null } };
const inngestSend = vi.fn(async (event: NotifyEnvelope) => ({ ids: [event.name] }));

/**
 * The rate limiter, stubbed for two reasons. (a) The real limiter is a MODULE-LEVEL Map keyed on user id
 * with a 5-per-60s budget, so twelve cancels by one seeded booker in one file would exhaust it and every
 * case after the fifth would assert against a rate-limit denial rather than the behaviour it names — a
 * fixture artefact masquerading as a result. (b) A stub makes the budget OBSERVABLE: we can assert the
 * action consults the limiter with the right key and the right numbers, which spying on the real one
 * cannot. `tests/security/rate-limit.test.ts` covers the limiter's own arithmetic.
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
let cancelBookingAsBooker: CancelActions["cancelBookingAsBooker"];
let cancelUnpaidHold: CancelActions["cancelUnpaidHold"];

let hostId: string;
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
  policy: "flexible" | "standard" | "strict" | null = "standard",
): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: `Listing ${id}`,
    status: "published",
    bookingMode: "instant",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Makati",
    hourlyRateCents: HOURLY,
    dayRateCents: DAY_RATE,
    cancellationPolicy: policy,
  });
}

type SeedOpts = {
  status?: "confirmed" | "requested" | "approved";
  /** The BOOKING's snapshotted tier (D-67) — deliberately settable apart from the listing's. */
  policy?: "flexible" | "standard" | "strict" | null;
  spacePriceCents?: number;
  serviceFeeCents?: number;
  paymentMethod?: string | null;
  paymentId?: string | null;
  bookerId?: string;
};

/** Seed a booking whose session starts `msToStart` from the DB clock. Returns its startsAt. */
async function seedBooking(
  id: string,
  listingId: string,
  msToStart: number,
  opts: SeedOpts = {},
): Promise<Date> {
  const base = await readDbNow(testDb.db);
  const startsAt = new Date(base.getTime() + msToStart);
  const space = opts.spacePriceCents ?? HOURLY;
  const fee = opts.serviceFeeCents ?? SERVICE_FEE;
  await testDb.db.insert(booking).values({
    id,
    listingId,
    unit: 1,
    bookerId: opts.bookerId ?? bookerId,
    startsAt,
    endsAt: new Date(startsAt.getTime() + HOUR),
    status: opts.status ?? "confirmed",
    bookingMode: "instant",
    cancellationPolicy: opts.policy === undefined ? "standard" : opts.policy,
    spacePriceCents: space,
    serviceFeeCents: fee,
    quotedTotalCents: space + fee,
    currency: "php",
    paymentId: opts.paymentId === undefined ? `pay_${id}` : opts.paymentId,
    paymentMethod: opts.paymentMethod === undefined ? "gcash" : opts.paymentMethod,
    expiresAt: opts.status === "requested" || opts.status === "approved" ? startsAt : null,
  });
  return startsAt;
}

async function readRow(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      refundCents: booking.refundCents,
      retainedSpaceCents: booking.retainedSpaceCents,
      spacePriceCents: booking.spacePriceCents,
      cancelledBy: booking.cancelledBy,
      cancelledAt: booking.cancelledAt,
      expiresAt: booking.expiresAt,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

/**
 * Recompute the quote EXACTLY as the review RSC does — same module, same snapshot fields, same DB clock
 * reader. This is the "preview" half of the preview-equals-action assertion.
 */
async function previewQuote(bookingId: string) {
  const [row] = await testDb.db
    .select({
      cancellationPolicy: booking.cancellationPolicy,
      spacePriceCents: booking.spacePriceCents,
      serviceFeeCents: booking.serviceFeeCents,
      quotedTotalCents: booking.quotedTotalCents,
      startsAt: booking.startsAt,
    })
    .from(booking)
    .where(eq(booking.id, bookingId));
  const now = await readDbNow(testDb.db);
  return quoteRefund({
    tier: tierOrDefault(row.cancellationPolicy),
    spacePriceCents: row.spacePriceCents ?? row.quotedTotalCents ?? 0,
    serviceFeeCents: row.serviceFeeCents ?? 0,
    startsAt: row.startsAt,
    now,
  });
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "CX Host",
    firstName: "CXHost",
    intent: "host",
  });
  await signUp(testAuth, {
    email: BOOKER_EMAIL,
    password: PASSWORD,
    name: "CX Booker",
    firstName: "Cassie",
    intent: "book",
  });
  const [h] = await testDb.db.select({ id: user.id }).from(user).where(eq(user.email, HOST_EMAIL));
  const [b] = await testDb.db.select({ id: user.id }).from(user).where(eq(user.email, BOOKER_EMAIL));
  hostId = h.id;
  bookerId = b.id;

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  // NO live PayMongo call may fire from a test. createRefund is also the probe for "was money dispatched".
  vi.doMock("@/lib/paymongo", () => ({
    createRefund: mockPayMongo.createRefund,
    createCheckoutSession: mockPayMongo.createCheckoutSession,
    createBatchTransfer: mockPayMongo.createBatchTransfer,
    listWalletAccounts: mockPayMongo.listWalletAccounts,
  }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/inngest/client", () => ({ inngest: { send: inngestSend } }));
  vi.doMock("@/lib/rate-limit", () => ({
    rateLimit: fakeRateLimit,
    requireWithinRateLimit: fakeRateLimit,
  }));
  vi.resetModules();
  ({ cancelBookingAsBooker, cancelUnpaidHold } = await import("@/app/actions/cancel-booking"));
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
  inngestSend.mockClear();
  inngestSend.mockResolvedValue({ ids: [] });
  rateLimitCalls.length = 0;
  rateLimitAllows = true;
});

describe("cancelBookingAsBooker — the SC#2 money invariants", () => {
  it("(1) uses the booking's SNAPSHOTTED tier, not the listing's current one (T-07-51)", async () => {
    // A booking made under STRICT, then the host retiers the listing to FLEXIBLE, then a cancel 30h out.
    // Strict at 30h sits in the 48h→24h rung = 50%. Flexible would award 100% (anything ≥12h).
    // If the action read the listing, the booker would walk away with ₱1,000 instead of ₱500 — a host's
    // later edit rewriting the terms of a booking already agreed.
    await seedListing("L_snap", "strict");
    await seedBooking("bk_snap", "L_snap", 30 * HOUR, { policy: "strict" });

    await testDb.db
      .update(listing)
      .set({ cancellationPolicy: "flexible" })
      .where(eq(listing.id, "L_snap"));

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker("bk_snap");

    expect(res).toEqual({ ok: true, refundCents: 50000 }); // 50% of ₱1,000 — STRICT
    const row = await readRow("bk_snap");
    expect(row.refundCents).toBe(50000);
    expect(row.refundCents).not.toBe(100000); // emphatically NOT flexible's 100%
  });

  it("(2) the previewed refund EQUALS the executed refund, at a rung boundary and away from one", async () => {
    // THE SC#2 assertion. Two fixtures: one comfortably mid-rung (10h under standard → the 24h→6h 50%
    // rung) and one placed a hair INSIDE the 24h boundary (23h59m → the same 50% rung, but one minute the
    // other side of a sharp edge). Both must satisfy previewed === written === returned.
    await seedListing("L_eq_mid", "standard");
    await seedListing("L_eq_edge", "standard");
    await seedBooking("bk_eq_mid", "L_eq_mid", 10 * HOUR, { policy: "standard" });
    await seedBooking("bk_eq_edge", "L_eq_edge", 24 * HOUR - MIN, { policy: "standard" });

    await login(BOOKER_EMAIL);

    for (const id of ["bk_eq_mid", "bk_eq_edge"]) {
      const preview = await previewQuote(id); // exactly what the review page renders
      const res = await cancelBookingAsBooker(id);
      const row = await readRow(id);

      expect(res.ok).toBe(true);
      if (res.ok) expect(res.refundCents).toBe(preview.totalRefundCents);
      expect(row.refundCents).toBe(preview.totalRefundCents);
      // And the dispatched amount is the same figure — the three never diverge.
      expect(mockPayMongo.createRefund).toHaveBeenLastCalledWith(
        expect.objectContaining({ amountCents: preview.totalRefundCents }),
      );
    }

    // Both landed in the 50% rung: the mid case comfortably, the edge case by one minute. Pinning the
    // literal makes the boundary itself part of the assertion rather than something the test infers.
    expect((await readRow("bk_eq_mid")).refundCents).toBe(50000);
    expect((await readRow("bk_eq_edge")).refundCents).toBe(50000);
  });

  it("(2b) the sharp 24h edge: one minute either side of it awards a different rung", async () => {
    // The reason (2) matters. 24h+1m out is 100%; 24h−1m out is 50%. If preview and action ever read
    // different clocks, THIS is the gap they would fall through — so the boundary is asserted directly.
    await seedListing("L_edge_above", "standard");
    await seedListing("L_edge_below", "standard");
    await seedBooking("bk_edge_above", "L_edge_above", 24 * HOUR + MIN, { policy: "standard" });
    await seedBooking("bk_edge_below", "L_edge_below", 24 * HOUR - MIN, { policy: "standard" });

    await login(BOOKER_EMAIL);
    const above = await previewQuote("bk_edge_above");
    const below = await previewQuote("bk_edge_below");
    expect(above.refundBps).toBe(10000);
    expect(below.refundBps).toBe(5000);

    expect(await cancelBookingAsBooker("bk_edge_above")).toEqual({ ok: true, refundCents: 100000 });
    expect(await cancelBookingAsBooker("bk_edge_below")).toEqual({ ok: true, refundCents: 50000 });
    expect((await readRow("bk_edge_above")).refundCents).toBe(above.totalRefundCents);
    expect((await readRow("bk_edge_below")).refundCents).toBe(below.totalRefundCents);
  });

  it("(3) refuses a cancel once the session has started, leaving the row UNCHANGED (D-94)", async () => {
    await seedListing("L_past", "standard");
    await seedBooking("bk_past", "L_past", -MIN, { policy: "standard" }); // started 1 minute ago

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker("bk_past");

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/already started/i);

    // The row is untouched — no status flip, no refund column, no cancellation stamp.
    const row = await readRow("bk_past");
    expect(row.status).toBe("confirmed");
    expect(row.refundCents).toBeNull();
    expect(row.retainedSpaceCents).toBeNull();
    expect(row.cancelledAt).toBeNull();
    // And no money was moved for a session the host may already be delivering.
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();
  });

  it("(4) a second cancel is a CALM no-op — refund written once, dispatched at most once (T-07-49)", async () => {
    await seedListing("L_dbl", "standard");
    await seedBooking("bk_dbl", "L_dbl", 30 * HOUR, { policy: "standard" });

    await login(BOOKER_EMAIL);
    const first = await cancelBookingAsBooker("bk_dbl");
    const written = (await readRow("bk_dbl")).refundCents;

    const second = await cancelBookingAsBooker("bk_dbl");

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/no longer active/i);

    // Real money: the amount must be written exactly once and dispatched at most once. The status-scoped
    // UPDATE claims 0 rows on the replay, so the whole money block below it is unreachable.
    expect((await readRow("bk_dbl")).refundCents).toBe(written);
    expect(mockPayMongo.createRefund).toHaveBeenCalledTimes(1);
  });

  it("(5) refund + retained sum EXACTLY to the space price, and retained is the payout basis (D-69)", async () => {
    await seedListing("L_split", "standard");
    await seedBooking("bk_split", "L_split", 10 * HOUR, { policy: "standard" });

    await login(BOOKER_EMAIL);
    expect((await cancelBookingAsBooker("bk_split")).ok).toBe(true);

    const row = await readRow("bk_split");
    expect(row.refundCents).toBe(50000);
    expect(row.retainedSpaceCents).toBe(50000);
    // Integer cents, no rounding drift: the split is exact by construction (subtraction, not a 2nd round).
    expect(row.refundCents! + row.retainedSpaceCents!).toBe(row.spacePriceCents);
    expect(row.cancelledBy).toBe("booker");
    expect(row.cancelledAt).not.toBeNull();
    // The hold TTL is cleared so no expiry sweep can ever revisit a terminal row.
    expect(row.expiresAt).toBeNull();
  });

  it("(6) the service fee is NEVER refunded — not at any rung, including 100% (D-74)", async () => {
    // Three rungs on one tier, each with a ₱50 fee. At every rung the refund must be bounded by the SPACE
    // price: the moment it exceeded that, the platform would be refunding its own revenue.
    const cases: Array<[string, number, number]> = [
      ["bk_fee_100", 30 * HOUR, 100000], // strict ≥48h? no — standard ≥24h ⇒ 100%
      ["bk_fee_50", 10 * HOUR, 50000], // standard 24h→6h ⇒ 50%
      ["bk_fee_0", 2 * HOUR, 0], // standard <6h ⇒ 0%
    ];
    await login(BOOKER_EMAIL);
    for (const [id, ms, expected] of cases) {
      await seedListing(`L_${id}`, "standard");
      await seedBooking(id, `L_${id}`, ms, { policy: "standard", serviceFeeCents: SERVICE_FEE });
      const res = await cancelBookingAsBooker(id);
      expect(res).toEqual({ ok: true, refundCents: expected });
      const row = await readRow(id);
      expect(row.refundCents).toBe(expected);
      // The invariant, stated as an inequality so it holds for every rung including the 100% one.
      expect(row.refundCents!).toBeLessThanOrEqual(row.spacePriceCents!);
      // ₱1,050 was charged; at most ₱1,000 can ever come back.
      expect(row.refundCents!).toBeLessThan(HOURLY + SERVICE_FEE);
    }
  });

  it("(7) cancelUnpaidHold reuses the CANONICAL terminal mapping and moves no money", async () => {
    // requested → declined, approved → cancelled. This mapping is documented in request-expiry.ts and
    // mirrored by the in-tx sweep in units.ts:257; diverging here would desync all three.
    await seedListing("L_unpaid_r", "standard");
    await seedListing("L_unpaid_a", "standard");
    await seedBooking("bk_unpaid_r", "L_unpaid_r", 30 * HOUR, {
      status: "requested",
      paymentId: null,
      paymentMethod: null,
    });
    await seedBooking("bk_unpaid_a", "L_unpaid_a", 30 * HOUR, {
      status: "approved",
      paymentId: null,
      paymentMethod: null,
    });

    await login(BOOKER_EMAIL);
    expect(await cancelUnpaidHold("bk_unpaid_r")).toEqual({ ok: true, refundCents: 0 });
    expect(await cancelUnpaidHold("bk_unpaid_a")).toEqual({ ok: true, refundCents: 0 });

    expect((await readRow("bk_unpaid_r")).status).toBe("declined");
    expect((await readRow("bk_unpaid_a")).status).toBe("cancelled");
    // No money moved — no refund column written, no PayMongo call.
    expect((await readRow("bk_unpaid_r")).refundCents).toBeNull();
    expect((await readRow("bk_unpaid_a")).refundCents).toBeNull();
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();
    // A paid-path cancel must refuse an unpaid hold outright (it is status-scoped to `confirmed`).
    expect((await cancelBookingAsBooker("bk_unpaid_r")).ok).toBe(false);
  });

  it("(8) a cancelled slot is IMMEDIATELY rebookable — the D-21 regression gate", async () => {
    // The whole cancellation flow's load-bearing structural property. D-79 keeps the single `cancelled`
    // status precisely so the GiST EXCLUDE predicate (the COMPLEMENT: status NOT IN
    // ('cancelled','declined','completed')) never changes — a new status value would default to OCCUPYING
    // and permanently block the slot of every partially-refunded cancellation. This test is what would
    // catch that: after the cancel, the IDENTICAL window on the IDENTICAL unit must insert cleanly.
    await seedListing("L_rebook", "standard");
    const startsAt = await seedBooking("bk_rebook", "L_rebook", 30 * HOUR, { policy: "standard" });

    // Sanity: while it is live, the window is genuinely occupied — otherwise the re-book below proves
    // nothing at all (an EXCLUDE that never fires would pass this test in every state).
    await expect(
      testDb.db.insert(booking).values({
        id: "bk_rebook_blocked",
        listingId: "L_rebook",
        unit: 1,
        bookerId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + HOUR),
        status: "confirmed",
        currency: "php",
      }),
    ).rejects.toThrow();

    await login(BOOKER_EMAIL);
    expect((await cancelBookingAsBooker("bk_rebook")).ok).toBe(true);

    // Now the identical window on the identical unit inserts cleanly. No slot manipulation happened —
    // freeing is automatic because `cancelled` left the occupying set.
    await testDb.db.insert(booking).values({
      id: "bk_rebook_after",
      listingId: "L_rebook",
      unit: 1,
      bookerId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + HOUR),
      status: "confirmed",
      currency: "php",
    });
    expect((await readRow("bk_rebook_after")).status).toBe("confirmed");
  });

  it("(9) a notification-transport failure never fails the cancellation (MANAGE-03)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    inngestSend.mockRejectedValue(new Error("inngest unreachable"));

    await seedListing("L_notify", "standard");
    await seedBooking("bk_notify", "L_notify", 10 * HOUR, { policy: "standard" });

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker("bk_notify");

    // The durable write already committed and the money already moved. An action that surfaced a failure
    // here would tell the booker their cancellation did not happen when it demonstrably did.
    expect(res).toEqual({ ok: true, refundCents: 50000 });
    const row = await readRow("bk_notify");
    expect(row.status).toBe("cancelled");
    expect(row.refundCents).toBe(50000);
    expect(mockPayMongo.createRefund).toHaveBeenCalledTimes(1);
    // Both emissions were genuinely attempted and both genuinely failed — the guarantee is that the action
    // survived them, not that they were skipped.
    expect(inngestSend).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith("[notify] enqueue_failed", expect.anything());

    errorSpy.mockRestore();
  });

  it("(12) both sides are notified AFTER the commit, host always, booker only when money moved", async () => {
    await seedListing("L_emit_paid", "standard");
    await seedListing("L_emit_hold", "standard");
    await seedBooking("bk_emit_paid", "L_emit_paid", 30 * HOUR, { policy: "standard" });
    await seedBooking("bk_emit_hold", "L_emit_hold", 30 * HOUR, {
      status: "approved",
      paymentId: null,
      paymentMethod: null,
    });

    await login(BOOKER_EMAIL);
    expect((await cancelBookingAsBooker("bk_emit_paid")).ok).toBe(true);
    const paidEvents = inngestSend.mock.calls.map((c) => c[0].data);
    expect(paidEvents.map((e) => e.type)).toEqual([
      "booking_cancelled_by_booker",
      "refund_issued",
    ]);
    expect(paidEvents[0].recipientId).toBe(hostId);
    expect(paidEvents[1].recipientId).toBe(bookerId);

    inngestSend.mockClear();
    expect((await cancelUnpaidHold("bk_emit_hold")).ok).toBe(true);
    const holdEvents = inngestSend.mock.calls.map((c) => c[0].data);
    // The host still learns their slot is free. The booker gets NO refund notice — nothing was charged,
    // and a "₱0 refunded" message would invent an event that never happened.
    expect(holdEvents.map((e) => e.type)).toEqual(["booking_cancelled_by_booker"]);
  });

  it("(13) the money-moving action is rate-limited per identity, and the denial is audited (T-07-52)", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    await seedListing("L_rl", "standard");
    await seedBooking("bk_rl", "L_rl", 30 * HOUR, { policy: "standard" });

    await login(BOOKER_EMAIL);
    rateLimitAllows = false;
    const res = await cancelBookingAsBooker("bk_rl");

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/going a little fast/i);

    // Keyed on the AUTHENTICATED identity (never an IP), on the money-adjacent 5-per-60s budget.
    expect(rateLimitCalls).toEqual([{ key: `cancel-booking:${bookerId}`, opts: { window: 60, max: 5 } }]);
    // Nothing was written and no money moved — the limiter sits BEFORE the flip.
    expect((await readRow("bk_rl")).status).toBe("confirmed");
    expect((await readRow("bk_rl")).refundCents).toBeNull();
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();

    const audits = infoSpy.mock.calls
      .filter((c) => c[0] === "[audit]")
      .map((c) => JSON.parse(String(c[1])) as { action: string; outcome: string });
    expect(audits).toContainEqual(
      expect.objectContaining({ action: "cancel_booking", outcome: "denied" }),
    );
    infoSpy.mockRestore();
  });

  it("(10) an unrefundable rail takes the operator-alert path instead of a call that would 4xx", async () => {
    // isApiRefundable fails CLOSED. QRPh cannot be API-refunded (Pitfall 1), so the money owed is surfaced
    // as needs_attention rather than sent to an endpoint that would reject it and leave a booker in limbo.
    // This branch is also the SINGLE documented seam Plan 16's D-72 form hangs off.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    await seedListing("L_qrph", "standard");
    await seedBooking("bk_qrph", "L_qrph", 10 * HOUR, { policy: "standard", paymentMethod: "qrph" });

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker("bk_qrph");

    // The booking still cancels and the slot still frees — refusing to cancel would be worse for everyone.
    expect(res).toEqual({ ok: true, refundCents: 50000 });
    expect((await readRow("bk_qrph")).status).toBe("cancelled");
    // No API call on a rail PayMongo cannot refund.
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();
    // The owed money is LOUD, never silently kept.
    expect(errorSpy).toHaveBeenCalledWith(
      "[CANCEL_ALERT] refund_needs_manual",
      expect.objectContaining({ bookingId: "bk_qrph", method: "qrph" }),
    );
    const audits = infoSpy.mock.calls
      .filter((c) => c[0] === "[audit]")
      .map((c) => JSON.parse(String(c[1])) as { action: string; outcome: string });
    expect(audits).toContainEqual(
      expect.objectContaining({ action: "refund_manual_required", outcome: "needs_attention" }),
    );

    errorSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it("(11) a refund-dispatch failure does NOT unwind the durable flip", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockPayMongo.createRefund.mockRejectedValueOnce(new Error("paymongo 503"));

    await seedListing("L_dispatch_fail", "standard");
    await seedBooking("bk_dispatch_fail", "L_dispatch_fail", 10 * HOUR, { policy: "standard" });

    await login(BOOKER_EMAIL);
    const res = await cancelBookingAsBooker("bk_dispatch_fail");

    // The slot is already freed and that is the correct outcome — rolling back would resurrect an occupied
    // slot nobody is going to use. The failure surfaces to operators instead.
    expect(res.ok).toBe(true);
    const row = await readRow("bk_dispatch_fail");
    expect(row.status).toBe("cancelled");
    expect(row.refundCents).toBe(50000);
    expect(errorSpy).toHaveBeenCalledWith(
      "[CANCEL_ALERT] refund_dispatch_failed",
      expect.objectContaining({ bookingId: "bk_dispatch_fail" }),
    );

    errorSpy.mockRestore();
  });
});
