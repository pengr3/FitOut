// 13.1-06 · RESIDUAL 1 — the FOURTH session-orphaning path, and the only one that ever had NO backstop.
//
// `cancelUnpaidHold` (`src/app/actions/cancel-booking.ts`) is a booker WITHDRAWING THEIR OWN unpaid hold.
// An `approved` row is by definition one whose booker was sent to checkout (`src/app/actions/booking.ts`
// claims the checkout lease under `status IN ('pending','approved')`), so until this file existed the
// withdrawal freed the slot in FitOut's database and left a LIVE, PAYABLE PayMongo session pointing at it.
//
// ⚠ WHY THIS ONE IS DIFFERENT FROM THE OTHER THREE INLINE WIRINGS (13.1-05) — AND WHY IT IS NOT AN
// ACCELERANT. The reclaim wirings in `units.ts` and `request-expiry.ts` are accelerants: delete them and
// `checkout-retire-sweep` still retires those sessions within RETIRE_LOOKBACK_MINUTES, because their rows
// are still `pending`/`approved` with a lapsed `expires_at` when the sweep looks. THIS path has no such
// fallback and the sweep is not a superset of it:
//
//   `queryRetirableSessions` selects `status IN ('pending','approved') AND expires_at <= now() AND …`.
//   `cancelUnpaidHold` writes `status = 'cancelled'` (or `'declined'`) AND `expires_at = NULL` in ONE
//   statement. EITHER of those two writes on its own removes the row from that candidate set forever, and
//   `payment-reconcile`'s `status IN ('pending','approved')` excludes it too. So the session was reachable
//   by NOTHING — not the sweep, not the reconciler, not `handleGoneSlot` (which only ever runs when the
//   confirming webhook arrives, and this failure mode is precisely a webhook that did not).
//
// That is why every case below asserts a GUARANTEE rather than a promptness. If the lines this file covers
// were deleted tomorrow, nothing else in the codebase would close these sessions.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// THE PROPERTIES THAT WOULD BREAK PRODUCTION, AND HOW EACH IS MEASURED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
//
// (A) THE PROVIDER CALL HAPPENS AFTER THE FLIP IS DURABLE — asserted BEHAVIOURALLY, never positionally.
//     A test that greps for where a line sits proves nothing. So the retire mock's own implementation
//     reads the cancelled booking back through a SECOND, INDEPENDENT connection (`makeRacingClients`) and
//     records what it saw. Case (2) asserts it saw `cancelled`. This action opens no transaction of its
//     own, so the fact under test is ordering rather than isolation — but the measurement is identical to
//     `tests/booking/hold-lapse-retires-session.test.ts`'s and it fails identically if anyone ever wraps
//     this action's flip + side-effects in a `db.transaction` (which would make the provider call happen
//     inside it, against a flip a rollback could still undo).
//
// (B) A DEAD PAYMONGO CANNOT FAIL A CANCELLATION — asserted at THIS CALL SITE, not inherited.
//     13.1-04 asserts the policy's never-throw contract three ways in `tests/payments/retire-checkout.test.ts`,
//     so in production the policy cannot reject at all. Case (3) makes the mock reject ANYWAY, because what
//     needs proving here is a different fact: that THIS site survives it. 13.1-05 measured what happens when
//     a call site trusts the contract instead of guarding — `createPendingHold` threw a provider outage out
//     to its caller with the slot already freed, refusing a booker because PayMongo was down. The same
//     shape here would refuse a booker the ability to WITHDRAW, which is worse: they would be left holding
//     a booking they had already decided to abandon, and the session would stay payable anyway.
//
// (C) THE SESSION ID COMES FROM THE FLIP'S OWN `RETURNING`, NEVER FROM THE PRE-READ ROW.
//     `loadBookingRow` — the shared loader all three cancel actions use — selects 22 columns and
//     `checkout_session_id` is NOT one of them. So the RETURNING is not merely the better source, it is the
//     ONLY source that does not require widening a loader two other actions depend on. Case (4) makes that
//     falsifiable rather than structural: it seeds a `requested` row that carries a session id (a shape
//     production cannot produce today, but the column permits) and asserts the policy is handed exactly
//     that id. Drop `checkout_session_id` from the RETURNING and the case reddens with `undefined`.
//     The same reasoning as `request-expiry.ts`'s, for the same reason: a booker can claim a checkout lease
//     between the read and the write, and a retire keyed off a stale-NULL read would leave the live session
//     payable while looking perfectly correct.
//
// (D) PROBE FIRST — A SESSION PAYMONGO REPORTS `paid` IS NEVER SENT TO EXPIRE, AT THIS CALL SITE.
//     A call count of ZERO, over the REAL policy, guarded by a case that proves the count can move. See the
//     third describe block.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// TWO MODULE INSTANCES, ON PURPOSE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// The first two describe blocks import `cancel-booking.ts` with `@/lib/payments/retire-checkout` MOCKED
// WHOLESALE, so the CALL — its arguments, its count, and the database state visible AT CALL TIME — is the
// observable. That proves the WIRING and nothing about what the wiring reaches.
//
// The third imports it with the REAL policy and only `@/lib/paymongo` stubbed underneath, so the whole
// chain runs: flip → policy → probe → (expire | NOT). It exists because D-113's evidence rule is a call
// count of ZERO, and a zero asserted only against a mocked-out policy would be unfalsifiable here.
//
// The policy's own internals (six outcomes, never-throw, the D-72 audit meta) are 13.1-04's subject and are
// covered by 15 cases in `tests/payments/retire-checkout.test.ts`. Re-asserting them here would duplicate
// that file and let this one pass while the WIRING was wrong.
//
// ⚠ THE D-111 FIXTURES ARE UNTOUCHABLE. This file runs against an isolated schema
// (`tests/helpers/db.ts`), never the dev database, so `09f32400…` / `408e054a…` are structurally out of
// reach. Do not "improve" any case here into reading `@/lib/db`'s real connection.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// THE FIRST RUN, AND THE FOUR DELIBERATE BREAKS. ALL OBSERVED 2026-08-22, VERBATIM.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
//
// ── RUN 0 — this file against the UNWIRED `cancelUnpaidHold`. 8 failed | 2 passed (10 at the time). ────
//   × (1) an `approved` hold's session is handed to the policy ONCE, with the NEW terminal status
//   × (2) THE POST-FLIP PROOF — the retire sees the COMMITTED `cancelled` row on a second connection
//   × (3) A REJECTING POLICY CANNOT FAIL THE WITHDRAWAL — the booker is still released
//   × (4) THE SESSION ID COMES FROM THE FLIP'S OWN RETURNING — the pre-read row does not carry one
//   × (5) a hold that never reached checkout is still VISITED, and costs no provider call
//   × (8) GUARD-THE-GUARD — an `active` session IS expired through the real policy, exactly once
//   × (9) A `paid` SESSION IS NEVER SENT TO EXPIRE — a provider call count of ZERO, and the row untouched
//   × (10) a failed expire is an operator ALERT, never a failed withdrawal
//
//   AssertionError: the withdrawal did not reach the retire policy at all — this is the FOURTH orphaning
//   path, and unlike the three 13.1-05 wired there is NO sweep behind it: `queryRetirableSessions`
//   selects `status IN ('pending','approved')` and this statement writes `cancelled`, so the row leaves
//   every candidate set in the same statement that orphans its session: expected [] to have a length of
//   1 but got +0                                                                            ← case (1)
//
//   ⚠ CASES (6) AND (7) PASSED ON THE UNWIRED CODE, AND THAT IS CORRECT. They assert that nothing is
//   retired on a 0-row withdrawal and that `checkout_session_id` is never nulled — properties the unwired
//   code satisfied by doing nothing at all. They are regression guards on the WIRING, not proofs of it,
//   and this run is the record that they are not what turns this file green.
//
// ── BREAK 1 — the call site's own `try/catch` REMOVED (the 13.1-05 placement re-created here). ─────────
//   × (3) A REJECTING POLICY CANNOT FAIL THE WITHDRAWAL — the booker is still released
//   Error: PayMongo is down
//   1 failed | 11 passed. The SAME shape 13.1-05 measured in `createPendingHold`: the rejection travels
//   straight out to the caller, with the flip already COMMITTED. The booker is told their withdrawal
//   failed when it succeeded, and the session stays payable anyway.
//
// ── BREAK 2 — `checkout_session_id` dropped from the flip's `RETURNING`. 6 failed | 6 passed. ──────────
//   × (1) × (4) × (5) × (8) × (9) × (10)
//   AssertionError: expected [] to deeply equal [ 'cs_cuh_ACTIVE' ]                          ← case (8)
//   The provider call disappears ENTIRELY and every downstream audit with it — the silent-orphan defect
//   in its purest form, and the reason case (8)'s guard-the-guard exists.
//
// ── BREAK 3 — the PRE-FLIP `row.status` handed to the policy instead of the RETURNING's. 3 failed. ─────
//   × (1) × (4) × (5)
//   Each reddens on `bookingStatus`. On a `requested → declined` row this is the drift that matters: the
//   policy's alert rule keys on the status, and telling it `requested` for a row the database says is
//   `declined` is the policy being lied to about which reconciler owns the row.
//
// ── BREAK 4 — `queryRetirableSessions` widened to `('pending','approved','cancelled','declined')`, i.e.
//    option (b)'s premise made true by force. 1 failed | 11 passed. ──────────────────────────────────
//   × (12) OPTION (b) MEASURED — a withdrawn row is invisible to the sweep even with `expires_at`
//     PRESERVED
//   AssertionError: OPTION (b) WOULD HAVE WORKED and this file's whole call site is redundant […]:
//   expected [ 'bk_cuh_12', 'bk_cuh_11' ] to not include 'bk_cuh_12'
//   This is what makes case (12) a measurement rather than an opinion. It also shows the price option (b)
//   would really have cost: that same widening reddens case (2) of `tests/payments/checkout-retire.test.ts`
//   — "a CONFIRMED booking is never selected — its session was paid, and retiring it destroys evidence".
//
// All four restored from saved copies in the scratchpad, never `git checkout --`; `git diff --stat
// origin/dev -- src/inngest/functions/checkout-retire.ts` is EMPTY afterwards.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, booking } from "@/lib/db/schema";
import { readDbNow } from "@/lib/booking/bookings-query";
import type { RateLimitOptions, RateLimitResult } from "@/lib/rate-limit";
import type { RetirableSession, RetireOutcome } from "@/lib/payments/retire-checkout";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const HOST_EMAIL = "cuh_host@example.com";
const BOOKER_EMAIL = "cuh_booker@example.com";
const PASSWORD = "averylongpassword";
const HOURLY = 100000;
const SERVICE_FEE = 5000;

// The mocked next/headers reads this at CALL time, so login() can swap the session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

let testDb: TestDb;
let testAuth: TestAuth;
type CancelActions = typeof import("@/app/actions/cancel-booking");
/** `cancel-booking.ts` with the retire policy MOCKED — the call is the observable. */
let actions: CancelActions;
/** `cancel-booking.ts` with the REAL policy over a stubbed provider — the CHAIN is the observable. */
let actionsReal: CancelActions;
/** 13.1-04's sweep selector — the thing option (b) claimed would reach these rows. It does not. */
let queryRetirableSessions: typeof import("@/inngest/functions/checkout-retire").queryRetirableSessions;

/** THE SECOND, INDEPENDENT CONNECTION. Property (A) is unprovable without it — see the header. */
let watcher: ReturnType<typeof makeRacingClients>[number];

let hostId: string;
let bookerId: string;

/** What the retire mock SAW in the database, on a DIFFERENT connection, at the instant it was called. */
const seenAtCallTime: Array<{ bookingId: string; status: string | null }> = [];

/** The default implementation: observe first (that is the proof), then answer `retired` for every row. */
async function observeThenRetire(rows: RetirableSession[]): Promise<RetireOutcome[]> {
  for (const r of rows) {
    const found = (await watcher`
      SELECT status FROM booking WHERE id = ${r.bookingId}`) as unknown as { status: string }[];
    seenAtCallTime.push({ bookingId: r.bookingId, status: found[0]?.status ?? null });
  }
  return rows.map(() => "retired" as const);
}

const retireBatchMock = vi.fn(observeThenRetire);
/** Never expected to be called from the action — it calls the BATCH form. Present so the mock is total. */
const retireOneMock = vi.fn(async (): Promise<RetireOutcome> => "retired");
/** The audit sink, mocked so the REAL policy's alert is countable and never reaches a database. */
const recordAuditMock = vi.fn(async (_r: { action: string; outcome: string }) => {});

/** The mock's calls flattened to the two things every case asserts on: the rows, and the trigger. */
function retireCalls(): Array<{ rows: RetirableSession[]; trigger: string }> {
  return retireBatchMock.mock.calls.map((c) => ({
    rows: c[0] as RetirableSession[],
    trigger: (c as unknown as [RetirableSession[], string])[1],
  }));
}

const inngestSend = vi.fn(async (event: { name: string }) => ({ ids: [event.name] }));

/** The rate limiter, stubbed so twelve cancels by one seeded booker cannot exhaust a 5-per-60s budget. */
const fakeRateLimit = (_key: string, _opts: RateLimitOptions): RateLimitResult => ({ ok: true });

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

/** A dedicated listing per case, so seeded rows never collide on the booking_no_overlap EXCLUDE. */
async function seedListing(id: string): Promise<void> {
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: `Listing ${id}`,
    status: "published",
    bookingMode: "request",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Makati",
    hourlyRateCents: HOURLY,
    cancellationPolicy: "standard",
  });
}

type SeedOpts = {
  status?: "requested" | "approved";
  checkoutSessionId?: string | null;
};

/** Seed an UNPAID hold 3h out, with a live payment window. Returns nothing — the id is the handle. */
async function seedHold(id: string, listingId: string, opts: SeedOpts = {}): Promise<void> {
  const base = await readDbNow(testDb.db);
  const startsAt = new Date(base.getTime() + 3 * HOUR);
  await testDb.db.insert(booking).values({
    id,
    listingId,
    unit: 1,
    bookerId,
    startsAt,
    endsAt: new Date(startsAt.getTime() + HOUR),
    status: opts.status ?? "approved",
    bookingMode: "request",
    cancellationPolicy: "standard",
    spacePriceCents: HOURLY,
    serviceFeeCents: SERVICE_FEE,
    quotedTotalCents: HOURLY + SERVICE_FEE,
    currency: "php",
    paymentId: null,
    paymentMethod: null,
    // A LIVE window — this hold has not lapsed. That is the whole point: the sweep's `expires_at <= now()`
    // could not reach it even if the status flip did not already exclude it.
    expiresAt: new Date(base.getTime() + 2 * HOUR),
    checkoutSessionId: opts.checkoutSessionId ?? null,
  });
}

/** The columns the "this path writes no booking row of its own" claim is read back on. */
async function rowOf(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      expiresAt: booking.expiresAt,
      checkoutSessionId: booking.checkoutSessionId,
      cancelledBy: booking.cancelledBy,
      paymentId: booking.paymentId,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

/** A PayMongo Checkout Session body in the shape `getCheckoutSession` returns. */
function session(id: string, status: string) {
  return {
    id,
    status,
    sourceType: status === "paid" ? "gcash" : null,
    paidAt: status === "paid" ? new Date("2026-08-22T03:00:00Z") : null,
    paymentId: status === "paid" ? `pay_${id}` : null,
  };
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);
  [watcher] = makeRacingClients(testDb.schema, 1);

  await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "CUH Host",
    firstName: "CUHHost",
    intent: "host",
  });
  await signUp(testAuth, {
    email: BOOKER_EMAIL,
    password: PASSWORD,
    name: "CUH Booker",
    firstName: "Cassie",
    intent: "book",
  });
  const [h] = await testDb.db.select({ id: user.id }).from(user).where(eq(user.email, HOST_EMAIL));
  const [b] = await testDb.db.select({ id: user.id }).from(user).where(eq(user.email, BOOKER_EMAIL));
  hostId = h.id;
  bookerId = b.id;

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  // `createFunction` is stubbed alongside `send` because the final describe block imports
  // `checkout-retire.ts`, whose module body defines an Inngest function at import time.
  vi.doMock("@/inngest/client", () => ({
    inngest: { send: inngestSend, createFunction: () => ({}) },
  }));
  vi.doMock("@/lib/rate-limit", () => ({
    rateLimit: fakeRateLimit,
    requireWithinRateLimit: fakeRateLimit,
  }));
  vi.doMock("@/lib/audit", () => ({ recordAudit: recordAuditMock }));
  // ⚠ Without a secret the REAL probe answers `null` with no request at all (D-35's CI secret boundary)
  // and the probe-first block below would be measuring that short-circuit instead of the policy.
  vi.stubEnv("PAYMONGO_SECRET_KEY", "declared-by-this-harness-not-a-real-paymongo-credential");
  // NO live PayMongo call may fire from a test. The four the action imports, plus the two the REAL policy
  // reaches through `checkout-probe.ts` and its own expire.
  vi.doMock("@/lib/paymongo", () => ({
    createRefund: mockPayMongo.createRefund,
    createCheckoutSession: mockPayMongo.createCheckoutSession,
    createBatchTransfer: mockPayMongo.createBatchTransfer,
    listWalletAccounts: mockPayMongo.listWalletAccounts,
    // Not in `tests/helpers/mocks.ts` — declared here so the named import resolves. No case below
    // reaches them: `cancelUnpaidHold` never moves money (D-63, pay-on-approval).
    createRefundTransfer: vi.fn(async () => ({ transferId: "xfer_unreachable" })),
    listReceivingInstitutions: vi.fn(async () => []),
    INSTAPAY_CEILING_CENTS: 5000000,
    // The two the REAL policy reaches, through `checkout-probe.ts` and its own expire.
    getCheckoutSession: mockPayMongo.getCheckoutSession,
    expireCheckoutSession: mockPayMongo.expireCheckoutSession,
  }));

  // INSTANCE 1 — the policy replaced by a counting/observing mock.
  vi.doMock("@/lib/payments/retire-checkout", () => ({
    retireCheckoutsForBookings: retireBatchMock,
    retireCheckoutForBooking: retireOneMock,
    RETIRE_INLINE_LIMIT: 3,
  }));
  vi.resetModules();
  actions = await import("@/app/actions/cancel-booking");

  // INSTANCE 2 — the REAL policy, over the stubbed provider.
  vi.doUnmock("@/lib/payments/retire-checkout");
  vi.resetModules();
  actionsReal = await import("@/app/actions/cancel-booking");
  // The SWEEP's own selector, imported against this file's isolated schema. The last describe block uses
  // it to measure what "just stop nulling `expires_at`" would and would not have bought.
  ({ queryRetirableSessions } = await import("@/inngest/functions/checkout-retire"));

  await login(BOOKER_EMAIL);
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/cache");
  vi.doUnmock("@/inngest/client");
  vi.doUnmock("@/lib/rate-limit");
  vi.doUnmock("@/lib/audit");
  vi.doUnmock("@/lib/paymongo");
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await watcher.end();
  await teardownTestDb(testDb);
});

beforeEach(() => {
  retireBatchMock.mockReset();
  retireBatchMock.mockImplementation(observeThenRetire);
  retireOneMock.mockClear();
  recordAuditMock.mockClear();
  inngestSend.mockClear();
  seenAtCallTime.length = 0;
  mockPayMongo.getCheckoutSession.mockReset();
  mockPayMongo.expireCheckoutSession.mockReset();
  mockPayMongo.expireCheckoutSession.mockImplementation(async (id: string = "cs_d") => ({ id }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
describe("cancelUnpaidHold retires the session its withdrawal orphans", () => {
  // ═════════════════════════════════════════════════════════════════════════════════════════════════════

  it("(1) an `approved` hold's session is handed to the policy ONCE, with the NEW terminal status", async () => {
    await seedListing("L_cuh_1");
    await seedHold("bk_cuh_1", "L_cuh_1", { checkoutSessionId: "cs_cuh_A" });

    const res = await actions.cancelUnpaidHold("bk_cuh_1");

    // THE DATABASE TRUTH FIRST — the withdrawal really happened.
    expect(res).toEqual({ ok: true, refundCents: 0 });
    const row = await rowOf("bk_cuh_1");
    expect(row.status).toBe("cancelled");
    expect(row.cancelledBy).toBe("booker");

    const calls = retireCalls();
    expect(
      calls,
      "the withdrawal did not reach the retire policy at all — this is the FOURTH orphaning path, and " +
        "unlike the three 13.1-05 wired there is NO sweep behind it: `queryRetirableSessions` selects " +
        "`status IN ('pending','approved')` and this statement writes `cancelled`, so the row leaves " +
        "every candidate set in the same statement that orphans its session",
    ).toHaveLength(1);
    expect(calls[0].trigger).toBe("booker-cancel-hold");
    expect(calls[0].rows).toEqual([
      {
        bookingId: "bk_cuh_1",
        // Asserted on the ARGUMENT, not the count: expiring the WRONG session leaves the payable one live.
        checkoutSessionId: "cs_cuh_A",
        // The NEW terminal status, never the pre-flip `approved`. The policy stays silent about a `paid`
        // session only while the row is still `pending` (13.1-02's reconciler owns those); a withdrawn row
        // is the case NO reconciler reaches, and is precisely the one that must land in the alert queue.
        bookingStatus: "cancelled",
      },
    ]);
  });

  it("(2) THE POST-FLIP PROOF — the retire sees the COMMITTED `cancelled` row on a second connection", async () => {
    await seedListing("L_cuh_2");
    await seedHold("bk_cuh_2", "L_cuh_2", { checkoutSessionId: "cs_cuh_B" });

    await actions.cancelUnpaidHold("bk_cuh_2");

    expect(seenAtCallTime).toHaveLength(1);
    expect(
      seenAtCallTime[0].status,
      "THE RETIRE RAN BEFORE THE FLIP WAS VISIBLE. A second, independent connection read this booking at " +
        "the moment the policy was called and did NOT see the withdrawal. D-113 requires the provider " +
        "call to happen after the slot is durably freed — retiring a session for a flip that has not " +
        "landed (or that a transaction could still roll back) revokes a live customer's ability to pay " +
        "for a booking that still exists. Do NOT fix this by relaxing the assertion.",
    ).toBe("cancelled");
    expect(seenAtCallTime[0].bookingId).toBe("bk_cuh_2");
  });

  it("(3) A REJECTING POLICY CANNOT FAIL THE WITHDRAWAL — the booker is still released", async () => {
    await seedListing("L_cuh_3");
    await seedHold("bk_cuh_3", "L_cuh_3", { checkoutSessionId: "cs_cuh_C" });
    retireBatchMock.mockRejectedValue(new Error("PayMongo is down"));

    const res = await actions.cancelUnpaidHold("bk_cuh_3");

    expect(
      res,
      "a rejecting retire policy FAILED a withdrawal. The flip has ALREADY COMMITTED at this point, so " +
        "the booker is told their cancellation failed while it actually succeeded — and the session " +
        "stays payable anyway. 13.1-CONTEXT D-113, verbatim: FREEING THE SLOT MUST NEVER DEPEND ON THE " +
        "PROVIDER ANSWERING. The call site needs its OWN catch; 13.1-04's never-throw contract makes " +
        "that catch unreachable today, and it is there for the day somebody changes the policy.",
    ).toEqual({ ok: true, refundCents: 0 });
    expect((await rowOf("bk_cuh_3")).status).toBe("cancelled");
    expect(retireCalls()).toHaveLength(1);
  });

  it("(4) THE SESSION ID COMES FROM THE FLIP'S OWN RETURNING — the pre-read row does not carry one", async () => {
    // A `requested` row carrying a session id is a shape production cannot produce today (the checkout
    // lease is claimed under `status IN ('pending','approved')`), but the column permits it and that is
    // what makes this case a DISCRIMINATOR: `loadBookingRow` selects 22 columns and `checkout_session_id`
    // is not among them, so an implementation reading the id off the pre-read row cannot produce this
    // value at all. Drop `checkout_session_id` from the RETURNING and this reddens with `undefined`.
    await seedListing("L_cuh_4");
    await seedHold("bk_cuh_4", "L_cuh_4", { status: "requested", checkoutSessionId: "cs_cuh_D" });

    const res = await actions.cancelUnpaidHold("bk_cuh_4");

    expect(res).toEqual({ ok: true, refundCents: 0 });
    // The CANONICAL terminal mapping: `requested → declined`, not `cancelled`.
    expect((await rowOf("bk_cuh_4")).status).toBe("declined");

    const calls = retireCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].rows).toEqual([
      {
        bookingId: "bk_cuh_4",
        checkoutSessionId: "cs_cuh_D",
        bookingStatus: "declined",
      },
    ]);
  });

  it("(5) a hold that never reached checkout is still VISITED, and costs no provider call", async () => {
    // The call site is UNCONDITIONAL by design: no `if (sessionId)` guard, because the policy already
    // answers `no-session` at zero provider cost and a guard here would be a second place to get the rule
    // wrong. This case is what stops every assertion above from being satisfiable by a conditional site.
    await seedListing("L_cuh_5");
    await seedHold("bk_cuh_5", "L_cuh_5", { checkoutSessionId: null });

    await actions.cancelUnpaidHold("bk_cuh_5");

    expect(retireCalls()).toEqual([
      { rows: [{ bookingId: "bk_cuh_5", checkoutSessionId: null, bookingStatus: "cancelled" }], trigger: "booker-cancel-hold" },
    ]);
  });

  it("(6) a 0-ROW withdrawal makes NO provider call — a fabricated request is worse than none", async () => {
    // A second click, or a hold the request-expiry cron already swept. The action returns NOT_ACTIVE and
    // must not retire anything: the session, if any, belongs to whatever path DID flip the row, and that
    // path retired it under its own trigger. Retiring here would be this action claiming a flip it did
    // not make — the `updateDeclaredPax` fabricated-request precedent.
    await seedListing("L_cuh_6");
    await seedHold("bk_cuh_6", "L_cuh_6", { checkoutSessionId: "cs_cuh_F" });
    await actions.cancelUnpaidHold("bk_cuh_6");
    retireBatchMock.mockClear();
    seenAtCallTime.length = 0;

    const second = await actions.cancelUnpaidHold("bk_cuh_6");

    expect("ok" in second && second.ok).toBe(false);
    expect(retireCalls()).toEqual([]);
  });

  it("(7) the withdrawal NEVER nulls `checkout_session_id` — the handle on the money outlives the hold", async () => {
    // THE TRAP, in its second coat. 13.1-04's policy writes no `booking` row; this call site must not
    // write one either. If a paid session is ever found on one of these rows, the id is the ONLY way an
    // operator can reach the payment — there is no `paid_at` column and `paymongo_event` cannot be joined
    // to a booking (D-85).
    await seedListing("L_cuh_7");
    await seedHold("bk_cuh_7", "L_cuh_7", { checkoutSessionId: "cs_cuh_G" });

    await actions.cancelUnpaidHold("bk_cuh_7");

    const row = await rowOf("bk_cuh_7");
    expect(row.checkoutSessionId).toBe("cs_cuh_G");
    expect(row.paymentId).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
describe("PROBE FIRST AT THE CALL SITE — the REAL policy, over a stubbed provider", () => {
  // The block above replaces the policy, so it proves the WIRING and nothing about what the wiring
  // reaches. This one runs `cancel-booking.ts` against the REAL `retire-checkout` with only
  // `@/lib/paymongo` stubbed underneath, so the whole chain is exercised: flip → policy → probe →
  // (expire | not).
  //
  // ⚠ THE EVIDENCE RULE IS A CALL COUNT OF ZERO, AND IT HAS TO BE A ZERO THAT CAN ACTUALLY FAIL — hence
  // the guard-the-guard case first. D-113's own words: expiry closes the ABILITY TO PAY; it must not
  // erase a payment that already happened.
  // ═════════════════════════════════════════════════════════════════════════════════════════════════════

  it("(8) GUARD-THE-GUARD — an `active` session IS expired through the real policy, exactly once", async () => {
    await seedListing("L_cuh_8");
    await seedHold("bk_cuh_8", "L_cuh_8", { checkoutSessionId: "cs_cuh_ACTIVE" });
    mockPayMongo.getCheckoutSession.mockImplementation(async (id: string = "cs_d") =>
      session(id, "active"),
    );

    const res = await actionsReal.cancelUnpaidHold("bk_cuh_8");

    expect(res).toEqual({ ok: true, refundCents: 0 });
    expect((await rowOf("bk_cuh_8")).status).toBe("cancelled");
    // Without this case the ZERO asserted below would be unfalsifiable — it would pass just as happily if
    // the withdrawal never reached the policy at all.
    expect(mockPayMongo.expireCheckoutSession.mock.calls.map((c) => c[0])).toEqual([
      "cs_cuh_ACTIVE",
    ]);
    // The retire's own durable trail — `ok`, never `needs_attention`: this is the system working.
    expect(recordAuditMock.mock.calls.map((c) => c[0].action)).toContain("checkout_retired");
  });

  it("(9) A `paid` SESSION IS NEVER SENT TO EXPIRE — a provider call count of ZERO, and the row untouched", async () => {
    await seedListing("L_cuh_9");
    await seedHold("bk_cuh_9", "L_cuh_9", { checkoutSessionId: "cs_cuh_PAID" });
    mockPayMongo.getCheckoutSession.mockImplementation(async (id: string = "cs_d") =>
      session(id, "paid"),
    );

    const res = await actionsReal.cancelUnpaidHold("bk_cuh_9");

    // The withdrawal still stands — that half never depends on the provider.
    expect(res).toEqual({ ok: true, refundCents: 0 });

    // THE EVIDENCE RULE. Not "expire and tolerate the throw" — a provider call that is NEVER MADE.
    expect(
      mockPayMongo.expireCheckoutSession,
      "a session PayMongo reports as PAID was sent to expire from a booker's own withdrawal. This is the " +
        "D-113 evidence constraint: the money is real and the session is the only handle on it. Expiry " +
        "closes the ABILITY to pay; it must never erase a payment that already happened.",
    ).not.toHaveBeenCalled();

    // …and the row keeps its handle on the money.
    const row = await rowOf("bk_cuh_9");
    expect(row.status).toBe("cancelled");
    expect(row.checkoutSessionId).toBe("cs_cuh_PAID");

    // A withdrawn row is terminal, so NO reconciler reaches it — which is exactly why the policy alerts
    // here rather than staying silent as it does for a still-`pending` row (13.1-02 owns those). This is
    // the ONLY report this payment will ever produce.
    expect(recordAuditMock.mock.calls.map((c) => c[0])).toContainEqual(
      expect.objectContaining({ action: "checkout_paid_after_lapse", outcome: "needs_attention" }),
    );
  });

  it("(10) a failed expire is an operator ALERT, never a failed withdrawal", async () => {
    await seedListing("L_cuh_10");
    await seedHold("bk_cuh_10", "L_cuh_10", { checkoutSessionId: "cs_cuh_FAIL" });
    mockPayMongo.getCheckoutSession.mockImplementation(async (id: string = "cs_d") =>
      session(id, "active"),
    );
    mockPayMongo.expireCheckoutSession.mockRejectedValue(new Error("PayMongo 500"));

    const res = await actionsReal.cancelUnpaidHold("bk_cuh_10");

    expect(res).toEqual({ ok: true, refundCents: 0 });
    expect((await rowOf("bk_cuh_10")).status).toBe("cancelled");
    expect(recordAuditMock.mock.calls.map((c) => c[0])).toContainEqual(
      expect.objectContaining({ action: "checkout_expire_failed", outcome: "needs_attention" }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
describe("WHY THE SWEEP IS NOT AN ALTERNATIVE — the measurement that chose the shape of this fix", () => {
  // 13.1-06's brief offered a second, simpler shape: stop nulling `expires_at` in `cancelUnpaidHold` so
  // 13.1-04's existing sweep could reach the row "naturally", with no fifth `RetireTrigger` and no call
  // site. `deferred-items.md` and the verification report both name the nulling as "precisely what puts
  // the row beyond the retire sweep".
  //
  // ⚠ THAT IS ONE OF **TWO INDEPENDENT** EXCLUSIONS, AND REMOVING IT LEAVES THE OTHER IN FORCE. The
  // selector's FIRST clause is `status IN ('pending','approved')`, and this statement writes `cancelled`
  // (or `declined`) in the SAME UPDATE. The two cases below measure both halves rather than reasoning
  // about them, so nobody re-proposes option (b) from the same partial description.
  // ═════════════════════════════════════════════════════════════════════════════════════════════════════

  it("(11) GUARD-THE-GUARD — the sweep DOES select an untouched lapsed hold on this schema", async () => {
    await seedListing("L_cuh_11");
    await seedHold("bk_cuh_11", "L_cuh_11", { checkoutSessionId: "cs_cuh_SWEEPABLE" });
    // Lapse it WITHOUT changing status — the shape the sweep exists for.
    await testDb.db
      .update(booking)
      .set({ expiresAt: new Date(Date.now() - 60 * 1000) })
      .where(eq(booking.id, "bk_cuh_11"));

    const ids = (await queryRetirableSessions(testDb.db)).map((r) => r.bookingId);
    expect(
      ids,
      "the sweep selected nothing at all on this schema — case (12) below would then prove nothing, " +
        "because an empty result is not evidence that a status excluded anything",
    ).toContain("bk_cuh_11");
  });

  it("(12) OPTION (b) MEASURED — a withdrawn row is invisible to the sweep even with `expires_at` PRESERVED", async () => {
    await seedListing("L_cuh_12");
    await seedHold("bk_cuh_12", "L_cuh_12", { checkoutSessionId: "cs_cuh_OPTB" });

    await actions.cancelUnpaidHold("bk_cuh_12");

    // Simulate option (b) exactly: hand the row back the lapsed-but-inside-lookback `expires_at` the
    // withdrawal nulled. Everything else about the row is as the shipped statement leaves it.
    await testDb.db
      .update(booking)
      .set({ expiresAt: new Date(Date.now() - 60 * 1000) })
      .where(eq(booking.id, "bk_cuh_12"));

    const ids = (await queryRetirableSessions(testDb.db)).map((r) => r.bookingId);
    expect(
      ids,
      "OPTION (b) WOULD HAVE WORKED and this file's whole call site is redundant — re-read " +
        "`queryRetirableSessions`. If this ever goes red, the sweep's `status IN ('pending','approved')` " +
        "clause has been widened to admit terminal rows, which is a far larger problem: it would let the " +
        "sweep retire the session of a CONFIRMED booking and destroy the evidence of a real payment.",
    ).not.toContain("bk_cuh_12");
    // And the row is otherwise exactly the shape the sweep wants — so the ONLY thing excluding it is the
    // status. That is the fact option (b) could not have changed without breaking case (2) of
    // `tests/payments/checkout-retire.test.ts`.
    const row = await rowOf("bk_cuh_12");
    expect(row.status).toBe("cancelled");
    expect(row.checkoutSessionId).toBe("cs_cuh_OPTB");
  });
});
