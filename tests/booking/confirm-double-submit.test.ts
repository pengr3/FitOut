// deferred item 5 — the double-charge BLOCKER: a SEQUENTIAL double-submit of "Confirm & pay" must not
// leave two payable PayMongo checkout sessions.
//
// WHAT THIS FILE IS REALLY GUARDING. PayMongo does NOT honor the Idempotency-Key on
// POST /v1/checkout_sessions (probed against sk_test_: two byte-identical POSTs mint two DIFFERENT,
// independently payable session ids). So a plain double-submit — a tab-switch, or Back-then-reconfirm —
// mints a SECOND payable session and the booker is charged twice, unrefundable on a qrph rail; the confirm
// webhook keys purely on reference_number and confirms on status='pending' alone (D-57), so it cannot tell
// the two apart. The ONLY real retirement mechanism is expire, so confirmBooking now EXPIRES any session
// its row already named BEFORE it creates the next — mirroring updateDeclaredPax, for per-head AND flat
// bookings alike. A thrown expire REFUSES the new checkout (fail-closed) with a needs_attention audit; a
// create failure AFTER a successful expire recovers on the booker's retry (the repeat expire is a 200-
// replay no-op via the session-scoped Idempotency-Key), so the booker is never trapped.
//
// MUTATION-VERIFY (run before committing): delete the expire-before-create block from
// src/app/actions/booking.ts confirmBooking → cases (1),(2),(3),(5) go RED [case (4) stays GREEN]. Restore → GREEN.
// A green run against THIS mock is NOT evidence that PayMongo collapses duplicate POSTs — the mock
// returns a constant session id. That invariant is proven against the real API in 08-19.
//
// Harness: the REAL confirmBooking driven against real Postgres (isolated schema), with @/lib/paymongo
// swapped for mockPayMongo so no live session is created or expired. Assertions read the PERSISTED row back
// out of the database, never the action's return value alone (cloned from checkout-session-expire.test.ts).

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, booking } from "@/lib/db/schema";
import { createPendingHold } from "@/lib/availability/units";
import type { RateLimitResult } from "@/lib/rate-limit";

const HOUR = 3_600_000;
const LEAD_MS = 3 * HOUR; // past MIN_LEAD_INSTANT_MINUTES so the D-96 guard never interferes

const HOURLY = 50_000; // ₱500/hr
const DAY_RATE = 300_000;
const FEE_PER_HEAD = 1_500; // ₱15 per extra guest
const INCLUDED = 2;
const MAX_OCCUPANCY = 8;

/** The SHIPPED refusal, asserted as a constant so a copy change is a deliberate act. */
const CALM_RETRY = "We couldn't start checkout. Please try again.";

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

/** The limiter is stubbed so several seeded confirm calls don't exhaust the real module-level Map. Takes no
 *  parameters on purpose — this file asserts nothing about the budget, and a zero-arg function satisfies
 *  every rateLimit(key, opts) call site. */
const fakeRateLimit = (): RateLimitResult => ({ ok: true });

let testDb: TestDb;
type BookingActions = typeof import("@/app/actions/booking");
let confirmBooking: BookingActions["confirmBooking"];

const HOST = "cds_host";
const BOOKER = "cds_booker";

let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;

/** A dedicated listing per case, so seeded holds never collide on the booking_no_overlap EXCLUDE. */
async function makeListing(
  opts: { included?: number | null; extraHeadFee?: number | null } = {},
): Promise<string> {
  const id = uid("L_cds");
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

/** A per-head-priced listing (declared_pax is written) vs. a flat one (declared_pax stays NULL). */
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

/** Queue the NEXT createCheckoutSession result (the mock otherwise returns a constant cs_test_123). */
function nextSession(id: string) {
  mockPayMongo.createCheckoutSession.mockResolvedValueOnce({
    id,
    checkoutUrl: `https://checkout.paymongo.test/${id}`,
  });
}

beforeAll(async () => {
  testDb = await setupTestDb();

  await testDb.db.insert(user).values([
    { id: HOST, name: "CDS Host", email: "cds_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "CDS Booker", email: "cds_booker@example.com", firstName: "Booker" },
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
  ({ confirmBooking } = await import("@/app/actions/booking"));
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

describe("deferred item 5 — a SEQUENTIAL double-submit cannot leave two payable checkout sessions", () => {
  it("(1) per-head: the second submit EXPIRES the first session before minting the second", async () => {
    const listingId = await makePerHeadListing();
    const { id } = await hold(listingId, { declaredPax: 3 });

    // First submit: no session recorded yet, so nothing to retire — the row names cs_1 afterwards.
    nextSession("cs_1");
    expect(await expectRedirect(confirmBooking(id))).toBe("https://checkout.paymongo.test/cs_1");
    expect((await readRow(id)).checkoutSessionId).toBe("cs_1");
    expect(mockPayMongo.expireCheckoutSession).not.toHaveBeenCalled();

    // Second submit (the double-submit): the row already names cs_1, so it is expired FIRST — exactly once,
    // with cs_1 — before cs_2 is minted, and the row now names cs_2. At most ONE session left payable.
    nextSession("cs_2");
    expect(await expectRedirect(confirmBooking(id))).toBe("https://checkout.paymongo.test/cs_2");
    expect(mockPayMongo.expireCheckoutSession).toHaveBeenCalledTimes(1);
    expect(mockPayMongo.expireCheckoutSession).toHaveBeenCalledWith("cs_1");
    expect((await readRow(id)).checkoutSessionId).toBe("cs_2");
  });

  it("(2) flat booking is protected too — the gate is NOT conditional on declared_pax", async () => {
    const listingId = await makeFlatListing();
    const { id } = await hold(listingId, { declaredPax: 4 });
    expect((await readRow(id)).declaredPax).toBeNull(); // D-108 zero-leak: no headcount on a flat listing

    nextSession("cs_1");
    await expectRedirect(confirmBooking(id));
    expect((await readRow(id)).checkoutSessionId).toBe("cs_1");
    expect(mockPayMongo.expireCheckoutSession).not.toHaveBeenCalled();

    nextSession("cs_2");
    await expectRedirect(confirmBooking(id));
    expect(mockPayMongo.expireCheckoutSession).toHaveBeenCalledTimes(1);
    expect(mockPayMongo.expireCheckoutSession).toHaveBeenCalledWith("cs_1");
    expect((await readRow(id)).checkoutSessionId).toBe("cs_2");
  });

  it("(3) a FAILED expire on the second submit REFUSES — no new session, column unchanged, operator told", async () => {
    const listingId = await makePerHeadListing();
    const { id } = await hold(listingId, { declaredPax: 3 });

    nextSession("cs_1");
    await expectRedirect(confirmBooking(id));
    expect((await readRow(id)).checkoutSessionId).toBe("cs_1");

    // The expire throws with PayMongo's raw text (secret key included) — none of it may reach the booker.
    mockPayMongo.expireCheckoutSession.mockRejectedValueOnce(
      new Error("PayMongo POST /v1/checkout_sessions/cs_1/expire failed (500): sk_test_LEAKY"),
    );
    const createsBefore = mockPayMongo.createCheckoutSession.mock.calls.length;

    const res = await confirmBooking(id);

    // Fail-closed: a calm retryable result, and NOT PayMongo's text (T-05-15 / T-08-44 / T-08-73).
    expect(res).toEqual({ ok: false, reason: "checkout", error: CALM_RETRY });
    expect(JSON.stringify(res)).not.toContain("sk_test");
    expect(JSON.stringify(res)).not.toContain("PayMongo");

    // No SECOND payable session was minted — the create was never reached after the expire threw.
    expect(mockPayMongo.createCheckoutSession.mock.calls.length).toBe(createsBefore);
    // The row still names the (still-live) cs_1 — an operator needs the id to retire it by hand.
    expect((await readRow(id)).checkoutSessionId).toBe("cs_1");

    // Non-repudiable: silence is the exact CR-02/item-5 failure mode ("captured, never refunded, no alert").
    const audit = auditLines().find((a) => a.action === "checkout_expire_failed");
    expect(audit).toBeDefined();
    expect(audit!.outcome).toBe("needs_attention");
    expect(audit!.meta).toMatchObject({ holdId: id, checkoutSessionId: "cs_1" });
  });

  it("(4) a first submit on a FRESH hold makes ZERO expire calls", async () => {
    const listingId = await makePerHeadListing();
    const { id } = await hold(listingId, { declaredPax: 2 });
    expect((await readRow(id)).checkoutSessionId).toBeNull(); // nothing recorded ⇒ nothing to retire

    nextSession("cs_1");
    await expectRedirect(confirmBooking(id));

    // NULL is a normal state, not a failure — calling PayMongo for it would be a fabricated request.
    expect(mockPayMongo.expireCheckoutSession).not.toHaveBeenCalled();
    expect((await readRow(id)).checkoutSessionId).toBe("cs_1");
  });

  it("(5) NOT-TRAPPED recovery — a create failure AFTER a successful expire recovers on retry", async () => {
    const listingId = await makePerHeadListing();
    const { id } = await hold(listingId, { declaredPax: 3 });

    // First submit persists cs_1.
    nextSession("cs_1");
    await expectRedirect(confirmBooking(id));
    expect((await readRow(id)).checkoutSessionId).toBe("cs_1");

    // Second submit: expire RESOLVES (default echo), but the create then fails — the existing paymongo_error
    // branch returns the calm result and the persist write never runs, so the row STILL names cs_1.
    mockPayMongo.createCheckoutSession.mockRejectedValueOnce(
      new Error("PayMongo POST /v1/checkout_sessions failed (503): service unavailable"),
    );
    const res = await confirmBooking(id);
    expect(res).toEqual({ ok: false, reason: "checkout", error: CALM_RETRY });
    expect(mockPayMongo.expireCheckoutSession).toHaveBeenCalledWith("cs_1");
    expect((await readRow(id)).checkoutSessionId).toBe("cs_1");

    // Third submit (the retry): the REPEAT expire of the already-expired cs_1 is a NO-OP the mock resolves
    // (standing in for PayMongo's idempotent 200-replay — it must NOT throw), so the retry proceeds and mints
    // cs_3. The booker recovered; no permanent fail-closed loop.
    nextSession("cs_3");
    expect(await expectRedirect(confirmBooking(id))).toBe("https://checkout.paymongo.test/cs_3");
    expect(mockPayMongo.expireCheckoutSession).toHaveBeenCalledWith("cs_1");
    expect(mockPayMongo.expireCheckoutSession).toHaveBeenCalledTimes(2); // both the failed-create submit and the retry
    expect((await readRow(id)).checkoutSessionId).toBe("cs_3");
  });
});
