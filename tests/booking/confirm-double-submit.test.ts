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
import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, booking } from "@/lib/db/schema";
import { createPendingHold } from "@/lib/availability/units";
import { CHECKOUT_IN_FLIGHT_MESSAGE } from "@/lib/payments/checkout-lease";
import { CHECKOUT_LEASE_TTL_SECONDS } from "@/lib/payments/config";
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
      // T-08-79 — the checkout lease. The (6)-(10) block asserts the PERSISTED column, never the action's
      // return value alone, for the same reason every other assertion in this file does.
      checkoutLockAt: booking.checkoutLockAt,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

/** Force a booking's checkout lease to an age relative to the POSTGRES clock (0 = claimed just now). */
async function setLease(id: string, secondsAgo: number): Promise<void> {
  await testDb.client`
    UPDATE booking
    SET checkout_lock_at = date_trunc('milliseconds', now() - make_interval(secs => ${secondsAgo}::int))
    WHERE id = ${id}`;
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

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// T-08-79 (quick task 260801-kv2) — THE CALL SITE. tests/booking/checkout-lease-race.test.ts proves the
// LEASE; it never imports confirmBooking, so without this block deleting the call site would leave the whole
// suite green. That is not hypothetical — Phase 8 measured it: deleting the production lock left the race
// file GREEN, all of tests/group/ GREEN and a 792-test suite GREEN while shipping an over-cap bug
// (seat-claim-race.test.ts:26-30).
//
// ⚠️ CASES (1)-(5) ABOVE ARE THEMSELVES A RELEASE GUARD, and must not be edited beyond readRow's new column.
// Each fires confirmBooking two or three times SEQUENTIALLY against ONE booking. If the lease were not
// released on every completing path, the second call would be refused with `in-flight` and they would all go
// RED immediately.
//
// MUTATIONS, ALL FOUR EXECUTED 2026-08-01 against src/app/actions/booking.ts. Observed output verbatim —
// and TWO of the four came back BROADER than the plan predicted. That divergence is recorded here, not
// reconciled away, and both are the same mechanism: the release-guard property of cases (1)-(5) above.
//
//   MUTATION A (the `if (!lease.claimed)` refusal disabled) — Tests 1 failed | 9 passed (10)
//     (6) RedirectError: NEXT_REDIRECT:https://checkout.paymongo.test/cs_test_123
//     RED SET {6} — as predicted. Note WHAT the failure is: not a wrong result shape but a REDIRECT. The
//     refused caller ran the whole flow, expired the lease-holder's cs_held and minted a second
//     independently payable session — i.e. it reproduced the exact T-08-79 double charge, live, in a test.
//     (The claim CALL is kept in this mutation so `lease.lockedAt` stays defined on the two release paths;
//     deleting the call as well would ReferenceError inside those catches and confound C and D.)
//
//   MUTATION B (remove `checkoutLockAt: null` from the persist .set()) — Tests 8 failed | 2 passed (10)
//     RED SET {1,2,3,5,7,8,9,10} — BROADER THAN THE PREDICTED {7}, and correctly so. The prediction did not
//     carry through this file's own release-guard property: cases (1)-(5) fire confirmBooking two or three
//     times SEQUENTIALLY against ONE booking, so a lease never cleared on success refuses their second
//     submit with `in-flight`. (8)(9)(10) then inherit a queued-session desync, because a refused call
//     consumes no queued session. Case (7) run in isolation (`-t "STALE lease SELF-HEALS"`) gives the clean
//     signal:
//     (7) AssertionError: expected 2026-08-01T08:01:17.551Z to be null
//
//   MUTATION C (delete releaseCheckoutLease from the expire-failure branch) — 1 failed | 9 passed
//     (8) AssertionError: expected 2026-08-01T08:01:47.997Z to be null
//     RED SET {8} — as predicted.
//
//   MUTATION D (delete releaseCheckoutLease from the paymongo_error catch) — Tests 5 failed | 5 passed (10)
//     RED SET {5,7,8,9,10} — BROADER THAN THE PREDICTED {9}, same mechanism. Case (5) is the pre-existing
//     NOT-TRAPPED recovery, which fires confirmBooking THREE times; without this release its third submit is
//     refused, so it fails with `Error: expected the action to redirect, but it returned normally` — a
//     genuine second signal, not noise, and precisely the "one retry becomes a 90-second dead end" cost the
//     release exists to prevent. (7)(8)(10) inherit the same desync. Case (9) in isolation:
//     (9) AssertionError: expected 2026-08-01T08:02:32.443Z to be null
//
//   Each restored by editing the file back, then this file 10/10 green.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────
describe("T-08-79 — the checkout lease admits ONE attempt per booking, and every exit defines its state", () => {
  it("(6) a HELD lease REFUSES: no expire, no create, nothing written", async () => {
    const listingId = await makePerHeadListing();
    const { id } = await hold(listingId, { declaredPax: 3 });

    // Stand in for a concurrent attempt that has already claimed: a live lease and a session it is about to
    // supersede. If the claim were missing, this call would expire cs_held and mint a SECOND payable session.
    await testDb.client`UPDATE booking SET checkout_session_id = 'cs_held' WHERE id = ${id}`;
    await setLease(id, 0);
    const before = await readRow(id);
    expect(before.checkoutLockAt).not.toBeNull();

    const res = await confirmBooking(id);

    // The exact shipped shape, with the copy IMPORTED rather than re-typed — a copy change must be a
    // deliberate act in one place, not a silently diverging duplicate.
    expect(res).toEqual({ ok: false, reason: "in-flight", error: CHECKOUT_IN_FLIGHT_MESSAGE });

    // NOTHING reached PayMongo. This is the whole point: the refusal happens BEFORE either round-trip.
    expect(mockPayMongo.expireCheckoutSession).not.toHaveBeenCalled();
    expect(mockPayMongo.createCheckoutSession).not.toHaveBeenCalled();

    // And the loser wrote nothing — in particular it did NOT release the winner's lease (it never received
    // the claimed instant, so it is structurally incapable of doing so).
    const after = await readRow(id);
    expect(after.checkoutSessionId).toBe("cs_held");
    expect(after.checkoutLockAt).toEqual(before.checkoutLockAt);

    // Non-repudiable, mirroring the shipped rate-limit denial (WR-06).
    const audit = auditLines().find(
      (a) => a.action === "confirm_pay" && a.meta?.reason === "checkout_in_flight",
    );
    expect(audit).toBeDefined();
    expect(audit!.outcome).toBe("denied");
    expect(audit!.meta).toMatchObject({ holdId: id });
  });

  it("(7) a STALE lease SELF-HEALS: the flow proceeds and clears it in the persist write", async () => {
    // A process that died mid-checkout. Past the TTL the booker recovers with no operator action — and the
    // success path leaves the lease CLEAR, in the same statement that names the session.
    const listingId = await makePerHeadListing();
    const { id } = await hold(listingId, { declaredPax: 3 });
    await setLease(id, CHECKOUT_LEASE_TTL_SECONDS + 60);
    expect((await readRow(id)).checkoutLockAt).not.toBeNull();

    nextSession("cs_heal");
    expect(await expectRedirect(confirmBooking(id))).toBe("https://checkout.paymongo.test/cs_heal");

    const after = await readRow(id);
    expect(after.checkoutLockAt).toBeNull();
    expect(after.checkoutSessionId).toBe("cs_heal");
  });

  it("(8) the EXPIRE-FAILURE refusal releases the lease — and is otherwise byte-identical to case (3)", async () => {
    const listingId = await makePerHeadListing();
    const { id } = await hold(listingId, { declaredPax: 3 });

    nextSession("cs_1");
    await expectRedirect(confirmBooking(id));
    expect((await readRow(id)).checkoutSessionId).toBe("cs_1");
    expect((await readRow(id)).checkoutLockAt).toBeNull(); // the first submit already cleared it

    mockPayMongo.expireCheckoutSession.mockRejectedValueOnce(
      new Error("PayMongo POST /v1/checkout_sessions/cs_1/expire failed (500): sk_test_LEAKY"),
    );
    const createsBefore = mockPayMongo.createCheckoutSession.mock.calls.length;

    const res = await confirmBooking(id);

    // The SHIPPED refusal is unchanged — the lease adds a path, it does not move an existing one.
    expect(res).toEqual({ ok: false, reason: "checkout", error: CALM_RETRY });
    expect(mockPayMongo.createCheckoutSession.mock.calls.length).toBe(createsBefore);
    const after = await readRow(id);
    expect(after.checkoutSessionId).toBe("cs_1");
    const audit = auditLines().find((a) => a.action === "checkout_expire_failed");
    expect(audit?.outcome).toBe("needs_attention");

    // ...and the lease is RELEASED, so the documented recovery (the retry whose repeat expire returns the
    // tolerated already-expired 400 and proceeds) is available immediately rather than in 90 seconds.
    expect(after.checkoutLockAt).toBeNull();
  });

  it("(9) the CREATE-FAILURE refusal releases the lease — and is otherwise byte-identical to case (5)", async () => {
    const listingId = await makePerHeadListing();
    const { id } = await hold(listingId, { declaredPax: 3 });

    nextSession("cs_1");
    await expectRedirect(confirmBooking(id));
    expect((await readRow(id)).checkoutSessionId).toBe("cs_1");

    mockPayMongo.createCheckoutSession.mockRejectedValueOnce(
      new Error("PayMongo POST /v1/checkout_sessions failed (503): service unavailable"),
    );
    const res = await confirmBooking(id);

    expect(res).toEqual({ ok: false, reason: "checkout", error: CALM_RETRY });
    const after = await readRow(id);
    expect(after.checkoutSessionId).toBe("cs_1"); // the persist write never ran
    expect(after.checkoutLockAt).toBeNull(); // ...but the lease was released on the way out
  });

  it("(10) NO TRANSACTION SURVIVES THE FLOW — measured with a FOR UPDATE NOWAIT probe", async () => {
    // The grep gate proves confirmBooking's SOURCE opens no transaction. This proves it BEHAVIOURALLY, which
    // is the assertion that would survive a refactor the grep did not anticipate.
    //
    // NOT via pg_stat_activity: Vitest runs test FILES in parallel worker threads against ONE physical
    // database, and pg_stat_activity is CLUSTER-scoped — an unrelated file legitimately mid-transaction
    // (createOpenCapacityHold, claimSeat) would show `idle in transaction` at the sampling instant and fail
    // this case with nothing wrong. The observation is scoped to THIS test's own row instead.
    const listingId = await makePerHeadListing();
    const { id } = await hold(listingId, { declaredPax: 3 });

    // (a) A successful flow. The success path WRITES the booking row, so a surviving transaction would still
    //     hold that row's lock.
    nextSession("cs_probe");
    await expectRedirect(confirmBooking(id));
    expect((await readRow(id)).checkoutSessionId).toBe("cs_probe");

    // (b) ONE INDEPENDENT connection. It MUST be a different one: testDb.db IS drizzle(testDb.client) and is
    //     the very connection confirmBooking ran on, and a backend can always re-lock rows it already holds.
    const [probe] = makeRacingClients(testDb.schema, 1);
    try {
      // (c) INSTRUMENT CHECK — prove the probe can actually DETECT a held lock, so that a green result in
      //     (d) means something. NOWAIT is what makes this deterministic: it fails or succeeds INSTANTLY,
      //     with no polling window and no sampling race.
      await testDb.client.begin(async (tx) => {
        await tx`SELECT id FROM booking WHERE id = ${id} FOR UPDATE`;
        await expect(
          probe`SELECT id FROM booking WHERE id = ${id} FOR UPDATE NOWAIT`,
        ).rejects.toMatchObject({ code: "55P03" }); // lock_not_available
      });

      // (d) THE ASSERTION: with no transaction outstanding, the same statement now RESOLVES.
      const rows = await probe`SELECT id FROM booking WHERE id = ${id} FOR UPDATE NOWAIT`;
      expect(rows.length).toBe(1);
    } finally {
      await probe.end();
    }
  });
});
