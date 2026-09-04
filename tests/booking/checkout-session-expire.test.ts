// CR-02 — the ONE-LIVE-SESSION invariant, both branches (08-13).
//
// WHAT THIS FILE IS REALLY GUARDING. D-108 scoped the checkout Idempotency-Key to the frozen AMOUNT for
// per-head bookings, which fixed "the booker is charged a total they were never shown" and created a new
// exposure in the same stroke: a re-priced hold mints a genuinely NEW session while the SUPERSEDED one stays
// payable in a second tab or one Back away. The confirm webhook keys purely on `reference_number` and
// confirms on `status='pending'` alone (D-57), so a stale payment is captured, never refunded, and raises no
// alert. Two things close it, and this file pins BOTH:
//
//   1. `confirmBooking` NAMES every session it creates on its own booking row (there is nothing to retire
//      otherwise), for per-head AND flat bookings alike — the column is not conditional on `declared_pax`.
//   2. `updateDeclaredPax` EXPIRES that session BEFORE it freezes a new amount, and REFUSES the re-price if
//      the expire fails — so the row and the payable session can never disagree about the price.
//
// THE ORDER IS THE FIX, so it is asserted as an order and not merely as an outcome: the expire stub reads
// `quoted_total_cents` OUT OF THE DATABASE at call time, and the failure case asserts the FULL frozen tuple
// is unchanged (a partial write is the shape of this bug, so one column would not catch it).
//
// MUTATION-VERIFY (08-13, all three measured before this file was committed):
//   A. delete the `expireCheckoutSession` call from `updateDeclaredPax`  → this file goes RED.
//   B. move the expire gate to AFTER the re-freeze                      → the failure-branch case goes RED.
//   C. delete the `checkoutSessionId` write from `confirmBooking`       → the persistence cases go RED.
//
// Harness: the REAL actions driven against real Postgres (isolated schema), with @/lib/paymongo swapped for
// mockPayMongo so no live session is created or expired. Assertions read the PERSISTED row back out of the
// database, never the action's return value alone.

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, booking } from "@/lib/db/schema";
import { createPendingHold } from "@/lib/availability/units";
import { computeServiceFee } from "@/lib/payments/service-fee";
import type { RateLimitResult } from "@/lib/rate-limit";

const HOUR = 3_600_000;
const LEAD_MS = 3 * HOUR; // past MIN_LEAD_INSTANT_MINUTES so the D-96 guard never interferes

const HOURLY = 50_000; // ₱500/hr
const DAY_RATE = 300_000;
const FEE_PER_HEAD = 1_500; // ₱15 per extra guest
const INCLUDED = 2;
const MAX_OCCUPANCY = 8;

/** The SHIPPED refusal, asserted as a constant so a copy change is a deliberate act. */
const CALM_RETRY = "We couldn't update your booking. Please try again.";

// --- Redirect capture (the tests/payments/checkout-create.test.ts idiom) ---------------------------------
class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
    this.name = "RedirectError";
  }
}
async function expectRedirect(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof RedirectError) return e.url;
    throw e;
  }
  throw new Error("expected the action to redirect, but it returned normally");
}

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

/** The mocked session identity — set per test to drive the owner gate. */
const session: { userId: string | null } = { userId: null };

/** The limiter is stubbed so a dozen seeded confirm/re-price calls don't exhaust the real module-level Map.
 *  Takes no parameters on purpose — this file asserts nothing about the budget (tests/booking/pax-reprice
 *  case 9 owns that), and a zero-arg function satisfies every rateLimit(key, opts) call site. */
const fakeRateLimit = (): RateLimitResult => ({ ok: true });

let testDb: TestDb;
type BookingActions = typeof import("@/app/actions/booking");
let confirmBooking: BookingActions["confirmBooking"];
let updateDeclaredPax: BookingActions["updateDeclaredPax"];

const HOST = "cse_host";
const BOOKER = "cse_booker";

let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;

/** A dedicated listing per case, so seeded holds never collide on the booking_no_overlap EXCLUDE. */
async function makeListing(
  opts: { included?: number | null; extraHeadFee?: number | null } = {},
): Promise<string> {
  const id = uid("L_cse");
  await testDb.db.insert(listing).values({
    id,
    hostId: HOST,
    title: `Listing ${id}`,
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Makati",
    hourlyRateCents: HOURLY,
    dayRateCents: DAY_RATE,
    maxOccupancy: MAX_OCCUPANCY,
    included: opts.included ?? null,
    extraHeadFee: opts.extraHeadFee ?? null,
    currency: "php",
  });
  return id;
}

/** A per-head-priced listing (the surcharge machinery is live) vs. a flat one (it is inert). */
const makePerHeadListing = () => makeListing({ included: INCLUDED, extraHeadFee: FEE_PER_HEAD });
const makeFlatListing = () => makeListing();

/** Place a real live hold through the shipped transaction, so the row shape is production-accurate. */
async function hold(listingId: string, opts: { declaredPax?: number } = {}) {
  const startsAt = new Date(Date.now() + LEAD_MS);
  const endsAt = new Date(startsAt.getTime() + 2 * HOUR);
  const res = await createPendingHold(testDb.db, {
    listingId,
    bookerId: BOOKER,
    startsAt,
    endsAt,
    fullDay: false,
    idempotencyKey: null,
    declaredPax: opts.declaredPax,
  });
  if ("error" in res) throw new Error(`hold refused: ${res.error}`);
  return res;
}

/** The persisted truth — every assertion below reads THIS, not the action's return value. */
async function readRow(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      declaredPax: booking.declaredPax,
      spacePriceCents: booking.spacePriceCents,
      serviceFeeCents: booking.serviceFeeCents,
      quotedTotalCents: booking.quotedTotalCents,
      checkoutSessionId: booking.checkoutSessionId,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

// recordAudit's v1 sink is a single structured `console.info("[audit]", <json>)` line (src/lib/audit.ts —
// deliberately NOT a table yet), so the needs_attention assertion reads the emitted line.
let infoSpy: ReturnType<typeof vi.spyOn>;
type AuditLine = { action: string; outcome: string; meta?: Record<string, unknown> };
function auditLines(): AuditLine[] {
  // `calls` is re-typed once here rather than annotating each callback — a hand-written spy type is exactly
  // what let vitest pass while tsc failed in 08-12.
  const calls = infoSpy.mock.calls as unknown as unknown[][];
  return calls
    .filter((c) => c[0] === "[audit]")
    .map((c) => JSON.parse(String(c[1])) as AuditLine);
}

beforeAll(async () => {
  testDb = await setupTestDb();

  await testDb.db.insert(user).values([
    { id: HOST, name: "CSE Host", email: "cse_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "CSE Booker", email: "cse_booker@example.com", firstName: "Booker" },
  ]);

  vi.doMock("@/lib/auth", () => ({
    auth: {
      api: {
        getSession: async () => (session.userId ? { user: { id: session.userId } } : null),
      },
    },
  }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("@/lib/paymongo", () => ({
    createCheckoutSession: mockPayMongo.createCheckoutSession,
    expireCheckoutSession: mockPayMongo.expireCheckoutSession,
    createRefund: mockPayMongo.createRefund,
    createBatchTransfer: mockPayMongo.createBatchTransfer,
    listWalletAccounts: mockPayMongo.listWalletAccounts,
  }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("@/lib/rate-limit", () => ({
    rateLimit: fakeRateLimit,
    requireWithinRateLimit: fakeRateLimit,
  }));
  vi.doMock("next/navigation", () => ({
    redirect: (url: string) => {
      throw new RedirectError(url);
    },
    notFound: () => {
      throw new Error("NEXT_NOT_FOUND");
    },
  }));
  vi.resetModules();
  ({ confirmBooking, updateDeclaredPax } = await import("@/app/actions/booking"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("next/cache");
  vi.doUnmock("@/lib/rate-limit");
  vi.doUnmock("next/navigation");
  await teardownTestDb(testDb);
});

beforeEach(() => {
  session.userId = BOOKER;
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  infoSpy.mockRestore();
});

describe("CR-02 — at most ONE payable checkout session per booking", () => {
  it("(1) confirmBooking NAMES the session it just created on the booking row (per-head pricing)", async () => {
    const listingId = await makePerHeadListing();
    const { id } = await hold(listingId, { declaredPax: 3 });
    expect((await readRow(id)).checkoutSessionId).toBeNull(); // nothing to retire before checkout

    // A distinctive id, so this pins "persist what PayMongo RETURNED", not "persist a constant".
    mockPayMongo.createCheckoutSession.mockResolvedValueOnce({
      id: "cs_perhead_A",
      checkoutUrl: "https://checkout.paymongo.test/cs_perhead_A",
    });

    const url = await expectRedirect(confirmBooking(id));
    expect(url).toBe("https://checkout.paymongo.test/cs_perhead_A");

    // Written BEFORE the booker left the app — a session nobody recorded can never be expired.
    expect((await readRow(id)).checkoutSessionId).toBe("cs_perhead_A");
  });

  it("(2) a FLAT-priced booking keeps its stable key AND still records the session (not conditional on declared_pax)", async () => {
    const listingId = await makeFlatListing();
    const { id } = await hold(listingId, { declaredPax: 4 });
    expect((await readRow(id)).declaredPax).toBeNull(); // D-108 zero-leak: no headcount on a flat listing

    mockPayMongo.createCheckoutSession.mockResolvedValueOnce({
      id: "cs_flat_B",
      checkoutUrl: "https://checkout.paymongo.test/cs_flat_B",
    });
    await expectRedirect(confirmBooking(id));

    // The flat path is byte-identical to today: the key carries NO amount.
    const arg = mockPayMongo.createCheckoutSession.mock.calls[0][0] as { idempotencyKey: string };
    expect(arg.idempotencyKey).toBe(`checkout:${id}`);
    // …and the column is filled all the same. A flat booking cannot be re-priced today, but the row must
    // still name its live session — the invariant is about sessions, not about pricing modes.
    expect((await readRow(id)).checkoutSessionId).toBe("cs_flat_B");
  });

  it("(3) a re-price EXPIRES the recorded session BEFORE the amount moves, then clears the column", async () => {
    const listingId = await makePerHeadListing();
    const { id } = await hold(listingId, { declaredPax: 1 });

    mockPayMongo.createCheckoutSession.mockResolvedValueOnce({
      id: "cs_reprice_C",
      checkoutUrl: "https://checkout.paymongo.test/cs_reprice_C",
    });
    await expectRedirect(confirmBooking(id));
    const before = await readRow(id);
    expect(before.checkoutSessionId).toBe("cs_reprice_C");
    expect(before.spacePriceCents).toBe(HOURLY * 2); // organizer only ⇒ no surcharge yet

    // THE ORDER, asserted as an order: the stub reads the row out of the database at the instant it is
    // called. If the re-freeze ran first, this would observe the NEW total.
    let quotedSeenByExpire: number | null | undefined;
    mockPayMongo.expireCheckoutSession.mockImplementationOnce(async (sessionId = "") => {
      quotedSeenByExpire = (await readRow(id)).quotedTotalCents;
      return { id: sessionId };
    });

    expect(await updateDeclaredPax(id, 5)).toEqual({ ok: true });

    // Exactly once, on THAT session — expiring the wrong id kills the session the booker is looking at
    // while the stale payable one lives on.
    expect(mockPayMongo.expireCheckoutSession).toHaveBeenCalledTimes(1);
    expect(mockPayMongo.expireCheckoutSession).toHaveBeenCalledWith("cs_reprice_C");
    expect(quotedSeenByExpire).toBe(before.quotedTotalCents);

    const after = await readRow(id);
    const space = HOURLY * 2 + (5 - INCLUDED) * FEE_PER_HEAD;
    const fee = computeServiceFee(space);
    expect(after.declaredPax).toBe(5);
    expect(after.spacePriceCents).toBe(space);
    expect(after.serviceFeeCents).toBe(fee.serviceFeeCents);
    expect(after.quotedTotalCents).toBe(fee.allInCents);
    expect(after.quotedTotalCents).toBe(after.spacePriceCents! + after.serviceFeeCents!);
    // The row stops claiming a live session in the same write that moved the amount.
    expect(after.checkoutSessionId).toBeNull();
  });

  it("(4) a FAILED expire REFUSES the re-price — the whole frozen tuple is untouched and an operator is told", async () => {
    const listingId = await makePerHeadListing();
    const { id } = await hold(listingId, { declaredPax: 2 });

    mockPayMongo.createCheckoutSession.mockResolvedValueOnce({
      id: "cs_fail_D",
      checkoutUrl: "https://checkout.paymongo.test/cs_fail_D",
    });
    await expectRedirect(confirmBooking(id));
    const before = await readRow(id);
    expect(before.checkoutSessionId).toBe("cs_fail_D");

    mockPayMongo.expireCheckoutSession.mockRejectedValueOnce(
      new Error("PayMongo 500 POST /v1/checkout_sessions/cs_fail_D/expire: sk_test_LEAKY_SECRET"),
    );

    const res = await updateDeclaredPax(id, 7);

    // A calm retryable sentence, and NOT PayMongo's text (T-05-15 / T-08-44).
    expect(res).toEqual({ ok: false, error: CALM_RETRY });
    expect(JSON.stringify(res)).not.toContain("sk_test");
    expect(JSON.stringify(res)).not.toContain("PayMongo");

    // The load-bearing assertion: the ENTIRE frozen tuple is unchanged. A booking left quoted at the NEW
    // amount with a session still payable at the OLD one is exactly the defect this gate exists to prevent,
    // and a partial write is the shape that bug takes.
    const after = await readRow(id);
    expect(after.declaredPax).toBe(before.declaredPax);
    expect(after.spacePriceCents).toBe(before.spacePriceCents);
    expect(after.serviceFeeCents).toBe(before.serviceFeeCents);
    expect(after.quotedTotalCents).toBe(before.quotedTotalCents);
    // Still named — the session is alive, so the row must keep saying so (and an operator needs the id).
    expect(after.checkoutSessionId).toBe("cs_fail_D");

    // Non-repudiable: silence was the CR-02 defect ("captured, never refunded, and raises no alert").
    const audit = auditLines().find((a) => a.action === "checkout_expire_failed");
    expect(audit).toBeDefined();
    expect(audit!.outcome).toBe("needs_attention");
    expect(audit!.meta).toMatchObject({ holdId: id, checkoutSessionId: "cs_fail_D" });
  });

  it("(5) a hold that never reached checkout has NO session to retire — zero expire calls, normal re-price", async () => {
    const listingId = await makePerHeadListing();
    const { id } = await hold(listingId, { declaredPax: 1 });
    expect((await readRow(id)).checkoutSessionId).toBeNull();

    expect(await updateDeclaredPax(id, 4)).toEqual({ ok: true });

    // NULL is a normal state, not a failure — calling PayMongo for it would be a fabricated request.
    expect(mockPayMongo.expireCheckoutSession).not.toHaveBeenCalled();
    const after = await readRow(id);
    const space = HOURLY * 2 + (4 - INCLUDED) * FEE_PER_HEAD;
    expect(after.declaredPax).toBe(4);
    expect(after.spacePriceCents).toBe(space);
    expect(after.quotedTotalCents).toBe(computeServiceFee(space).allInCents);
    expect(after.checkoutSessionId).toBeNull();
  });

  it("(6) a FLAT listing makes ZERO PayMongo calls of any kind and writes nothing (D-108 zero leak)", async () => {
    const listingId = await makeFlatListing();
    const { id } = await hold(listingId, { declaredPax: 6 });
    const before = await readRow(id);

    expect(await updateDeclaredPax(id, 8)).toEqual({ ok: true });

    // The flat no-op returns before the expire gate is even reached — no headcount, no price to move, and
    // so no session that could have been superseded.
    expect(mockPayMongo.expireCheckoutSession).not.toHaveBeenCalled();
    expect(mockPayMongo.createCheckoutSession).not.toHaveBeenCalled();
    const after = await readRow(id);
    expect(after.declaredPax).toBeNull();
    expect(after.spacePriceCents).toBe(before.spacePriceCents);
    expect(after.serviceFeeCents).toBe(before.serviceFeeCents);
    expect(after.quotedTotalCents).toBe(before.quotedTotalCents);
    expect(after.checkoutSessionId).toBeNull();
  });
});
