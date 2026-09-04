// THE FAST PATH'S REFUSALS ARE PROVEN BY WHAT IT DID NOT ASK THE PROVIDER — NOT BY WHAT IT RETURNED.
//
// `src/app/actions/reconcile-payment.ts` is the sharpest new surface in this phase: an internet-reachable
// server action that can transition a booking to `confirmed` and cause an outbound PayMongo call. Every
// claim it makes is therefore asserted here in BOTH halves —
//
//   • the returned value, AND
//   • `mockPayMongo.getCheckoutSession`'s CALL COUNT before and after.
//
// The second half is the point. A guard that returns "denied" and then probes anyway satisfies every
// value assertion perfectly while handing an unauthenticated caller a lever on FitOut's provider budget,
// and this repository has already shipped a fail-closed guard whose five specs were vacuous because they
// asserted only the value it returned. So the file opens with a GUARD-THE-GUARD case that proves the
// provider stub can be reached at all: if that case reads zero calls, every "did not probe" assertion
// below it is measuring nothing.
//
// ── WHY THE PROVIDER IS STUBBED UNDERNEATH THE PROBE ────────────────────────────────────────────────────
// `mockPayMongo.getCheckoutSession` replaces the HTTP call, NOT `probeCheckoutSession`. The real probe
// therefore runs — its id validation, its no-secret short-circuit, and its "resolves `null` on ANY
// failure" guarantee, which case (8b) drives by making the provider REJECT rather than by handing the
// action a hand-written `null`. Stubbing the probe itself would replace exactly the fail-closed behaviour
// the fast path leans on with this file's own assumption. (13.1-02's idiom, reused verbatim.)
//
// ⚠ `PAYMONGO_SECRET_KEY` is stubbed for this file. Without it the probe answers `null` with NO REQUEST at
// all (D-35's CI secret boundary), so every provider-call count would be 0 and the whole file would be
// green while measuring the short-circuit instead of the action.
//
// ── THE RATE LIMITER IS REAL HERE, DELIBERATELY ─────────────────────────────────────────────────────────
// `tests/booking/cancellation.test.ts` stubs it, because twelve cancels by one seeded booker would
// otherwise exhaust the budget and every later case would assert against a rate-limit denial. This file
// asserts the OPPOSITE property — that a budget exists and that the provider stops being called AT it —
// so a stub would assert the test's own arithmetic. `__resetRateLimit()` runs between cases, imported
// from the same module instance the action holds (after `vi.resetModules()`), so one case cannot inherit
// another's bucket.
//
// The budget is discovered BEHAVIOURALLY rather than imported: `RECONCILE_RATE_LIMIT` is module-private
// because a `"use server"` module may only export async functions (see the action's header, where the
// watched-red run is recorded). Case (7) calls until it is refused and asserts against where the refusal
// actually fell — which cannot drift from a constant it never reads.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// TWO DELIBERATE BREAKS, OBSERVED 2026-08-22 — and the second is the one that matters
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// Both were applied to `src/app/actions/reconcile-payment.ts`, run, and reverted from a saved copy in the
// scratchpad (never `git checkout --`).
//
// ── BREAK A: the cross-user half of the ownership gate dropped ───────────────────────────────────────────
//   if (!row || row.bookerId !== userId) return "denied";   →   if (!row) return "denied";
//
//    ❯ tests/booking/reconcile-fast-path.test.ts (10 tests | 2 failed)
//      × (3) a session belonging to someone else — `denied`, zero provider calls
//   AssertionError: expected 'unchanged' to be 'denied'
//      × (4) a booking id that does not exist — … BYTE-IDENTICAL to the not-yours answer
//   AssertionError: `does not exist` and `not yours` returned DIFFERENT values, so this action tells any
//   signed-in user whether a guessed booking id is real…: expected 'denied' to be 'unchanged'
//
//   Exactly the two cases that own T-13.1-20 and T-13.1-21, and nothing else. ⚠ Note that (3)'s VALUE
//   assertion fired first, so its provider-count assertion never ran on that break — which is precisely
//   why break B exists.
//
// ── BREAK B: the payable-status gate removed, so a `confirmed` row is probed anyway ──────────────────────
//   if (row.status !== "pending" && row.status !== "approved") …   →   if (row.status === "__never__") …
//
//      × (5) a booking that is already `confirmed` — `unchanged`, and nothing was asked about it
//   AssertionError: a terminal-for-this-purpose row still cost a provider round trip. There is nothing to
//   ask about: the confirm has already happened.: expected 1 to be +0
//
// ── BREAK C: D-111's epoch bound removed from the action ────────────────────────────────────────────────
//   if (new Date(row.createdAt).getTime() < RECONCILE_EPOCH.getTime()) …   →   … < 0) …
//
//      × (6b) D-111 — a PRE-EPOCH booking is `unchanged` and is never asked about, however it was reached
//   AssertionError: expected 'reconciled' to be 'unchanged'
//
//   READ THAT VALUE. Not "unchanged with an extra probe" — `reconciled`. A row carrying the later
//   evidence booking's exact measured `created_at` was CONFIRMED by the fast path, which is what would
//   have happened to a fixture holding a real ₱1,050.00 GCash capture the first time the seeded UAT
//   booker opened its checkout-return URL. The hole was measured, not imagined.
//
//   THE RETURNED VALUE WAS STILL CORRECT. `unchanged` came back exactly as the spec requires, and the only
//   thing that went red was the CALL COUNT. That is this file's whole thesis in one run: a version of this
//   action that answers every case correctly and probes the provider anyway is caught here, and would be
//   invisible to a spec that asserted only what it returned.

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, booking } from "@/lib/db/schema";
import { bookingReference } from "@/lib/booking/reference";

const HOST_EMAIL = "rfp_host@example.com";
const OWNER_EMAIL = "rfp_owner@example.com";
const STRANGER_EMAIL = "rfp_stranger@example.com";
const PASSWORD = "averylongpassword";
const LISTING = "L_rfp";

/** See the header: the probe makes no request at all without a secret, so every count would be 0. */
const HARNESS_SECRET = "declared-by-this-harness-not-a-real-paymongo-credential";

// The mocked next/headers reads this at CALL time, so `login()` / `signOut()` can swap the session.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

/** The operator-alert sink. Mocked so a `needs_attention` record is COUNTABLE, never merely absent. */
const recordAuditMock = vi.fn(async () => {});

type NotifyEnvelope = {
  name: string;
  data: {
    type: string;
    recipientId: string;
    bookingId: string | null;
    payload: { referenceLabel?: string };
  };
};

/**
 * The Inngest client, stubbed at the MODULE the action's graph resolves. `createFunction` is stubbed too
 * because `payment-reconcile.ts` builds its cron at import time and the action imports that module for
 * `reconcileOne`. `emitNotify` swallows its own transport errors, so a missed stub would look exactly
 * like a pass — which is what case (1) is the floor against.
 */
const inngestSend = vi.fn(async (event: NotifyEnvelope) => ({ ids: [event.name] }));
const inngestCreateFunction = vi.fn((opts: { id: string }) => ({ id: opts.id }));

let testDb: TestDb;
let testAuth: TestAuth;
type ActionModule = typeof import("@/app/actions/reconcile-payment");
let reconcilePaymentNow: ActionModule["reconcilePaymentNow"];
let resetRateLimit: () => void;

let ownerId: string;
let strangerId: string;

async function login(email: string): Promise<void> {
  const res = await testAuth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  });
  const setCookie = res.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
}

/** No cookie at all — the unauthenticated caller. */
function signOut(): void {
  sessionHeaders.cookie = "";
}

/** A distinct 1-hour UTC window per booking so seeded rows never collide on booking_no_overlap. */
let hourSeq = 0;
function nextWindow(): { startsAt: Date; endsAt: Date } {
  const hour = hourSeq++;
  const day = 1 + Math.floor(hour / 24);
  const h = String(hour % 24).padStart(2, "0");
  const h1 = String((hour % 24) + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return {
    startsAt: new Date(`2027-05-${d}T${h}:00:00.000Z`),
    endsAt: new Date(`2027-05-${d}T${h1}:00:00.000Z`),
  };
}

const MINUTE_MS = 60_000;

async function seedBooking(opts: {
  id: string;
  status?: "pending" | "approved" | "confirmed" | "cancelled";
  bookerId?: string;
  checkoutSessionId?: string | null;
  expiresAt?: Date | null;
  /** Explicit `created_at` — the column D-111's epoch keys on. Defaults to now, i.e. post-epoch. */
  createdAt?: Date;
}): Promise<string> {
  const { startsAt, endsAt } = nextWindow();
  await testDb.db.insert(booking).values({
    id: opts.id,
    listingId: LISTING,
    unit: 1,
    bookerId: opts.bookerId ?? ownerId,
    startsAt,
    endsAt,
    status: opts.status ?? "pending",
    quotedTotalCents: 150000,
    currency: "php",
    expiresAt: opts.expiresAt === undefined ? new Date(Date.now() + 10 * MINUTE_MS) : opts.expiresAt,
    checkoutSessionId:
      opts.checkoutSessionId === undefined ? `cs_${opts.id}` : opts.checkoutSessionId,
    ...(opts.createdAt === undefined ? {} : { createdAt: opts.createdAt }),
  });
  return opts.id;
}

async function readBooking(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      paymentId: booking.paymentId,
      paymentMethod: booking.paymentMethod,
      expiresAt: booking.expiresAt,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

/** A paid session as the provider reports it. */
function paidSession(id: string) {
  return {
    id,
    status: "paid",
    sourceType: "gcash",
    paidAt: new Date(),
    paymentId: `pay_${id}`,
  };
}

/** How many times the PROVIDER was actually asked, across everything so far in this case. */
function providerCalls(): number {
  return mockPayMongo.getCheckoutSession.mock.calls.length;
}

type AuditCall = { actorId: string; action: string; outcome: string; meta?: Record<string, unknown> };

function auditRecords(): AuditCall[] {
  return recordAuditMock.mock.calls.map((c) => (c as unknown as [AuditCall])[0]);
}

/** Every `booking_confirmed` emission for `bookingId`, keyed on the deterministic FIT- reference. */
function confirmedEmissions(bookingId: string): NotifyEnvelope[] {
  const ref = bookingReference(bookingId);
  return inngestSend.mock.calls
    .map((c) => c[0])
    .filter(
      (e) =>
        e.name === "fitout/notify" &&
        e.data.type === "booking_confirmed" &&
        e.data.payload.referenceLabel === ref,
    );
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "RFP Host",
    firstName: "Rafa",
    intent: "host",
  });
  await signUp(testAuth, {
    email: OWNER_EMAIL,
    password: PASSWORD,
    name: "RFP Owner",
    firstName: "Owen",
    intent: "book",
  });
  await signUp(testAuth, {
    email: STRANGER_EMAIL,
    password: PASSWORD,
    name: "RFP Stranger",
    firstName: "Stan",
    intent: "book",
  });

  // `select`, not `db.query.*`: the test db is built by `drizzle(client)` with NO bound schema (see
  // tests/helpers/auth.ts's note), so the relational query builder is undefined on it.
  const rows = await testDb.db.select({ id: user.id, email: user.email }).from(user);
  ownerId = rows.find((r) => r.email === OWNER_EMAIL)!.id;
  strangerId = rows.find((r) => r.email === STRANGER_EMAIL)!.id;
  const hostId = rows.find((r) => r.email === HOST_EMAIL)!.id;

  await testDb.db.insert(listing).values({
    id: LISTING,
    hostId,
    title: "RFP Listing",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 150000,
    dayRateCents: 300000,
    currency: "php",
  });

  vi.stubEnv("PAYMONGO_SECRET_KEY", HARNESS_SECRET);
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("@/lib/paymongo", () => ({
    getCheckoutSession: mockPayMongo.getCheckoutSession,
    createRefund: mockPayMongo.createRefund,
  }));
  vi.doMock("@/lib/audit", () => ({ recordAudit: recordAuditMock }));
  vi.doMock("@/inngest/client", () => ({
    inngest: { send: inngestSend, createFunction: inngestCreateFunction },
  }));
  vi.resetModules();
  ({ reconcilePaymentNow } = await import("@/app/actions/reconcile-payment"));
  // The SAME module instance the action holds — imported after resetModules, so clearing it here really
  // clears the buckets the action counts against.
  ({ __resetRateLimit: resetRateLimit } = await import("@/lib/rate-limit"));
});

beforeEach(async () => {
  resetRateLimit();
  recordAuditMock.mockClear();
  inngestSend.mockClear();
  inngestSend.mockResolvedValue({ ids: [] });
  // `mockReset` + an explicit INERT default: a case that sets a persistent answer must not leak it into
  // the next case, and a case that forgets to override must not get a spurious confirm.
  mockPayMongo.getCheckoutSession.mockReset();
  mockPayMongo.getCheckoutSession.mockResolvedValue({
    id: "cs_default_unpaid",
    status: "active",
    sourceType: null,
    paidAt: null,
    paymentId: null,
  });
  mockPayMongo.createRefund.mockClear();
  mockPayMongo.createRefund.mockResolvedValue({ id: "ref_rfp", status: "pending" });
  vi.spyOn(console, "error").mockImplementation(() => {});
  await login(OWNER_EMAIL);
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("@/lib/audit");
  vi.doUnmock("@/inngest/client");
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await teardownTestDb(testDb);
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// (1) GUARD THE GUARD — the provider CAN be reached, so every zero below means something
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

describe("reconcilePaymentNow — the happy path, asserted first", () => {
  it("(1) GUARD-THE-GUARD — an owner of a paid-but-unconfirmed booking gets `reconciled`, and the provider WAS asked exactly once", async () => {
    const id = await seedBooking({ id: "bk_rfp_ok" });
    mockPayMongo.getCheckoutSession.mockResolvedValueOnce(paidSession(`cs_${id}`));

    const outcome = await reconcilePaymentNow(id);

    expect(outcome).toBe("reconciled");
    expect(
      providerCalls(),
      "the provider stub was never called on the ONE case that must reach it. Every `did not probe` " +
        "assertion in this file is then vacuous — they would all pass against an action that cannot " +
        "probe at all.",
    ).toBe(1);

    const row = await readBooking(id);
    expect(row.status).toBe("confirmed");
    expect(row.paymentId).toBe(`pay_cs_${id}`); // the pay_… survived the probe (13.1-01's widening)
    expect(row.paymentMethod).toBe("gcash");
    expect(row.expiresAt).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// (2)-(7) THE REFUSALS — every one asserts the PROVIDER CALL COUNT, not merely the returned value
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

describe("every refusal happens BEFORE any provider call", () => {
  it("(2) no session — `denied`, and FitOut never touched PayMongo", async () => {
    const id = await seedBooking({ id: "bk_rfp_nosession" });
    signOut();

    const outcome = await reconcilePaymentNow(id);

    expect(outcome).toBe("denied");
    expect(
      providerCalls(),
      "an UNAUTHENTICATED caller made FitOut spend a PayMongo round trip. The session check must sit " +
        "above everything, including the rate limiter — otherwise an anonymous loop is a provider-load " +
        "lever that costs the caller nothing (T-13.1-20 / T-13.1-22).",
    ).toBe(0);

    expect((await readBooking(id)).status).toBe("pending");
  });

  it("(3) a session belonging to someone else — `denied`, zero provider calls", async () => {
    const id = await seedBooking({ id: "bk_rfp_notmine" });
    await login(STRANGER_EMAIL);

    const outcome = await reconcilePaymentNow(id);

    expect(outcome).toBe("denied");
    expect(
      providerCalls(),
      "a signed-in stranger made FitOut probe a booking that is not theirs. The route group is not the " +
        "gate; `booker_id` equality is, and it must be checked BEFORE the provider read (T-13.1-20).",
    ).toBe(0);
    expect((await readBooking(id)).status).toBe("pending");
  });

  it("(4) a booking id that does not exist — `denied`, zero calls, and BYTE-IDENTICAL to the not-yours answer", async () => {
    // The two branches are asserted against EACH OTHER rather than against a literal, so they cannot
    // drift apart into an existence oracle: whatever one says, the other must say (T-13.1-21).
    const mine = await seedBooking({ id: "bk_rfp_oracle", bookerId: strangerId });

    const notYours = await reconcilePaymentNow(mine);
    const doesNotExist = await reconcilePaymentNow("bk_rfp_no_such_booking_at_all");

    expect(doesNotExist).toBe("denied");
    expect(
      doesNotExist,
      "`does not exist` and `not yours` returned DIFFERENT values, so this action tells any signed-in " +
        "user whether a guessed booking id is real. Collapsing them is the whole reason there is one " +
        "`denied` member rather than two.",
    ).toBe(notYours);
    expect(providerCalls()).toBe(0);
  });

  it("(5) a booking that is already `confirmed` — `unchanged`, and nothing was asked about it", async () => {
    const id = await seedBooking({ id: "bk_rfp_confirmed", status: "confirmed", expiresAt: null });

    const outcome = await reconcilePaymentNow(id);

    expect(outcome).toBe("unchanged");
    expect(
      providerCalls(),
      "a terminal-for-this-purpose row still cost a provider round trip. There is nothing to ask about: " +
        "the confirm has already happened.",
    ).toBe(0);
    expect((await readBooking(id)).status).toBe("confirmed");
  });

  it("(6) a `pending` booking with NO checkout session — `unchanged`, and nothing was asked about it", async () => {
    const id = await seedBooking({ id: "bk_rfp_nosession_id", checkoutSessionId: null });

    const outcome = await reconcilePaymentNow(id);

    expect(outcome).toBe("unchanged");
    expect(
      providerCalls(),
      "there is no session id to ask the provider about, so a call here is a round trip spent to learn " +
        "nothing — the same bound the sweep's candidate query holds with `checkout_session_id IS NOT NULL`.",
    ).toBe(0);
    expect((await readBooking(id)).status).toBe("pending");
  });

  it("(6b) D-111 — a PRE-EPOCH booking is `unchanged` and is never asked about, however it was reached", async () => {
    // ⚠ NOT A CASE THE PLAN ASKED FOR. The two evidence bookings this phase exists because of are
    // `pending`, hold a checkout session, carry a real GCash capture at the provider, and belong to the
    // seeded UAT booker — so without this bound, that booker opening either one's checkout-return URL
    // would confirm a fixture PM explicitly ruled out of scope. 13.1-02 barred the CRON from those rows
    // with `RECONCILE_EPOCH`; this asserts the fast path is barred by the SAME constant, so the
    // accelerant can never reach further back than the guarantee it accelerates.
    const id = await seedBooking({
      id: "bk_rfp_preepoch",
      createdAt: new Date("2026-08-21T18:17:12.839Z"), // the later fixture's MEASURED created_at
    });
    mockPayMongo.getCheckoutSession.mockResolvedValueOnce(paidSession(`cs_${id}`));

    const outcome = await reconcilePaymentNow(id);

    expect(outcome).toBe("unchanged");
    expect(
      providerCalls(),
      "a pre-epoch booking was probed. The provider holds a REAL capture for both evidence rows, so a " +
        "probe here is one step from confirming a fixture D-111 exists to protect.",
    ).toBe(0);
    const row = await readBooking(id);
    expect(row.status).toBe("pending");
    expect(row.paymentId).toBeNull();
  });

  it("(7) past the budget — `rate-limited`, and the provider call count STOPS AT the limit, not after it", async () => {
    // The budget is discovered rather than imported (see the header). Each call is on a still-payable
    // row whose session the provider reports `active`, so nothing here can confirm and the ONLY thing
    // that changes between iterations is the limiter.
    const id = await seedBooking({ id: "bk_rfp_ratelimit" });

    const outcomes: string[] = [];
    const callsAfter: number[] = [];
    for (let i = 0; i < 12; i++) {
      outcomes.push(await reconcilePaymentNow(id));
      callsAfter.push(providerCalls());
    }

    const firstRefusal = outcomes.indexOf("rate-limited");
    expect(
      firstRefusal,
      "twelve consecutive calls from ONE session were all allowed through. There is no budget on this " +
        "action, so a scripted loop turns one signed-in session into unbounded provider load " +
        "(T-13.1-22).",
    ).toBeGreaterThan(0);
    // …and the budget is not so tight that a booker using the page normally could hit it. The client
    // fires once per mount, after a ~20s poll cap, so at most three calls are reachable in a minute.
    expect(
      firstRefusal,
      "the budget refuses before the fourth call, which a booker CAN reach legitimately by reloading " +
        "the settling screen each time the poller gives up.",
    ).toBeGreaterThanOrEqual(4);

    // Every allowed call probed; every refused call did not. Asserted as the SEQUENCE, so a limiter that
    // refuses the value while still probing (or that probes one extra time at the boundary) is red.
    expect(outcomes.slice(0, firstRefusal).every((o) => o === "unchanged")).toBe(true);
    expect(outcomes.slice(firstRefusal).every((o) => o === "rate-limited")).toBe(true);
    expect(
      callsAfter[callsAfter.length - 1],
      "the provider was called MORE times than the budget allowed, so the limit is being applied after " +
        "the round trip rather than before it — which is the one place it has to be.",
    ).toBe(firstRefusal);
    expect((await readBooking(id)).status).toBe("pending");
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// (8) D-104 — ARRIVING AT THE SETTLING SURFACE CONFIRMS NOTHING. ONLY THE PROVIDER'S RECORD DOES.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

describe("D-104 — the booking moves ONLY on the provider's own record saying paid", () => {
  it("(8a) the owner asks, the session is `active` (payable, unpaid) — the booking is STILL pending afterwards", async () => {
    // This is the case the whole action exists to make unfalsifiable. The caller is authenticated, owns
    // the booking, and reached this action from the checkout-return surface — the exact position in
    // which `?paid=1` would be present in the URL. The action never sees that parameter and could not
    // act on it if it did: PayMongo says the session is still merely payable, so nothing moves.
    const id = await seedBooking({ id: "bk_rfp_active" });
    mockPayMongo.getCheckoutSession.mockResolvedValueOnce({
      id: `cs_${id}`,
      status: "active",
      sourceType: null,
      paidAt: null,
      paymentId: null,
    });

    const outcome = await reconcilePaymentNow(id);

    expect(outcome).toBe("unchanged");
    expect(providerCalls(), "the provider was not asked, so the inertness above is a short-circuit " +
      "rather than a decision — read back from PayMongo's answer.").toBe(1);

    const row = await readBooking(id);
    expect(
      row.status,
      "a booking reached `confirmed` while the provider's own record said the session was merely " +
        "PAYABLE. PROJECT D-57 is unweakened by this phase: a browser arriving somewhere is not a " +
        "payment, and this action has no other input.",
    ).toBe("pending");
    expect(row.paymentId).toBeNull();
  });

  it("(8b) the owner asks, the probe learns NOTHING (the provider call rejects) — the booking is STILL pending", async () => {
    // Driven by making the provider REJECT, so the REAL probe's "resolves null on any failure" guarantee
    // is what produces the null — never a hand-written one. `null` means WE DID NOT LEARN; it is not
    // evidence of anything and can never be a reason to touch the row in either direction.
    const id = await seedBooking({ id: "bk_rfp_unknown" });
    mockPayMongo.getCheckoutSession.mockRejectedValueOnce(new Error("provider is having a day"));

    const outcome = await reconcilePaymentNow(id);

    expect(outcome).toBe("unchanged");
    expect(providerCalls()).toBe(1);

    const row = await readBooking(id);
    expect(
      row.status,
      "an unreadable provider answer moved a booking. `null` from the probe means we did not learn — " +
        "treating it as evidence in either direction invents a fact out of a failure.",
    ).toBe("pending");
    expect(row.paymentId).toBeNull();
    // And the failure did not leak: the outcome is a closed-enum member, not provider prose.
    expect(["reconciled", "unchanged", "denied", "rate-limited"]).toContain(outcome);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// (9) D-105 — ONE BODY, ONE ALERT POLICY. THE FAST PATH ADDS NEITHER A SECOND CONFIRM NOR A SECOND ALERT.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

describe("D-105 — the fast path and the cron run ONE reconciliation body", () => {
  it("(9) a fast-path confirm emits exactly ONE receipt and exactly ONE needs_attention record — the same counts the cron asserts", async () => {
    const id = await seedBooking({ id: "bk_rfp_counts" });
    mockPayMongo.getCheckoutSession.mockResolvedValueOnce(paidSession(`cs_${id}`));

    const first = await reconcilePaymentNow(id);

    expect(first).toBe("reconciled");
    expect(confirmedEmissions(id), "the BOOK-06 receipt was sent zero times or twice").toHaveLength(1);

    const alerts = auditRecords().filter((r) => r.action === "webhook_missed");
    expect(
      alerts,
      "the fast path raised a SECOND `webhook_missed` alert on top of the one `reconcileOne` already " +
        "files. A missing webhook must be counted ONCE in the operator queue however it was found — " +
        "double-counting is how D-110's loud channel degrades into noise nobody opens.",
    ).toHaveLength(1);
    expect(alerts[0].actorId).toBe("system");
    expect(alerts[0].outcome).toBe("needs_attention");
    expect(alerts[0].meta?.bookingId).toBe(id);

    // …and a SECOND call on the now-confirmed row changes nothing and says nothing. The idempotency is
    // `confirmPaidBooking`'s status-scoped claim, reached through the same one body — not a check here.
    inngestSend.mockClear();
    recordAuditMock.mockClear();

    const second = await reconcilePaymentNow(id);

    expect(second).toBe("unchanged");
    expect(confirmedEmissions(id), "a second receipt for one payment").toHaveLength(0);
    expect(
      auditRecords().filter((r) => r.action === "webhook_missed"),
      "a second alert for one missing webhook",
    ).toHaveLength(0);
    expect(mockPayMongo.createRefund).toHaveBeenCalledTimes(0);
    expect((await readBooking(id)).status).toBe("confirmed");
  });
});
