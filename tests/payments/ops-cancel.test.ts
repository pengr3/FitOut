// ENF-03 — THE OPS-FORCED CANCELLATION, MEASURED AT EVERY PLACE IT COULD SILENTLY DO THE WRONG THING.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE IS FOR
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `cancelBookingAsOps` is the only path in FitOut where the platform cancels somebody else's booking
// and sends somebody else's money back. It shares a module with `cancelBookingAsHost` and forks from
// it in five named places — and TWO of those forks, left unforked, fail SILENTLY rather than loudly:
// the host path's window guard would quietly protect exactly the bookings most worth undoing, and
// `cancelled_by = 'host'` would durably blame the host for FitOut's own decision. A third would tell a
// defrauded booker their host cancelled on them. Nothing would error in any of the three.
//
// So every case here asserts on a DURABLE ARTEFACT — a row read back out of the table, a mock's call
// list, the sweep's own output — never on a return value alone.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE SEVEN CLAIMS
// ════════════════════════════════════════════════════════════════════════════════════════════════
//   C1. THE REFUND BASIS, UNDER BOTH VALUES OF THE POLICY CONSTANT (D-209 / D-236). Shipped (`false`):
//       the booker gets the SPACE PRICE and FitOut retains the D-74 service fee. Flipped (`true`): the
//       booker gets the whole charged total. Case (2) is what makes "flipping it is one line" a
//       MEASURED claim rather than a promise — the PM has to be able to re-decide this cheaply.
//
//   C2. NO CANCELLATION-FEE DEBIT IS WRITTEN (D-235) — an ABSENCE, not a zero. Case (4), and it is
//       paired with a POSITIVE CONTROL (case 5) that drives the HOST path over a comparable booking
//       and shows the debit row IS written there. Without that control the absence would also pass
//       against a broken query, a wrong kind, or an action that returned before doing anything.
//       Case (4) additionally asserts the code path RAN THROUGH the position where the debit would
//       have gone — the auto-block insert lands before it, the refund dispatch after it — because an
//       absence a short-circuit would satisfy is the `checkout-probe.test.ts` bug in a new place.
//
//   C3. `cancelled_by = 'ops'` (D-244), never `'host'` and never `'system'`. Case (6).
//
//   C4. `retained_space_cents = 0`, AND THE SWEEP THEREFORE EXCLUDES THE BOOKING. Case (7) drives
//       `queryDuePayouts` BEFORE and AFTER, so the exclusion is a change this action caused rather
//       than a booking the sweep never wanted. NULL there would fall through to
//       `COALESCE(retained, space_price)` and pay the host the full space price.
//
//   C5. D-241, BOTH DIRECTIONS. An already-started session IS cancellable (case 8). A booking whose
//       payout has left is NOT, and is refused WITH THE REASON — cases (9) `processing` and (10)
//       `paid` — never a silent no-op. Case (11) asserts the console's own impact read counts it
//       under `notCancellableCount`, which is where an operator sees it before committing.
//
//   C6. NO HOST-CANCEL NOTIFICATION IS EMITTED (Pitfall 5). Case (12) asserts on the EMISSION
//       OBSERVER, with a positive control in the same case proving the observer is live.
//
//   C7. THE TRAIL ROW, with `actorId` = the id the STAFF GATE returned (D-218/OPS-03) and a verb
//       distinct from the host path's. Case (13). Case (14): a non-staff caller is refused before any
//       write, with a positive control. Case (15): the D-233 escalation cannot be reached by default.
//       Case (16): fork 2's ops scope actually scopes.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// HARNESS
// ════════════════════════════════════════════════════════════════════════════════════════════════
// The REAL actions driven through the `vi.doMock` idiom against an isolated schema (the
// tests/payments/host-cancel.test.ts shape) with a REAL Better Auth session (the
// tests/ops/ops-audit.test.ts shape), so the `role` additionalField under test is the one the app
// ships. `next/navigation`'s `notFound` raises a NAMED error, because the real one raises a
// Next-internal digest only the framework can interpret. `@/lib/paymongo` is mocked so no live call
// fires and `createRefund` is the probe for "did money get dispatched, and how much".

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { and, eq, sql } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { mockPayMongo } from "../helpers/mocks";
import { makeVerifiedHost } from "../helpers/seed";
import { audit, availabilityBlock, booking, hostPayoutLedger, listing, user } from "@/lib/db/schema";
import { readDbNow } from "@/lib/booking/bookings-query";
import { formatMoney } from "@/lib/money";
import { OPS_CANCEL_REFUNDS_SERVICE_FEE } from "@/lib/payments/fees";
import { LISTING_REJECT_REASONS } from "@/lib/validation/ops";
import type { RateLimitOptions, RateLimitResult } from "@/lib/rate-limit";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const STAFF_EMAIL = "oc_staff@example.com";
const CIVILIAN_EMAIL = "oc_civilian@example.com";
const HOST_EMAIL = "oc_host@example.com";
const BOOKER_EMAIL = "oc_booker@example.com";
const PASSWORD = "averylongpassword";

const HOURLY = 100000; // ₱1,000 space price for a 1h window
const SERVICE_FEE = 5000; // ₱50 — the D-74 fee, 5% of the space price
const TOTAL = HOURLY + SERVICE_FEE; // ₱1,050 all-in — what the booker actually paid
const WALLET_ID = "wal_ops_123";

/** The taxonomy sentence an ops cancellation carries (the LISTING column — the listing was rejected). */
const REASON = LISTING_REJECT_REASONS[3]; // "We couldn't confirm this space is real."
/** The D-233 escalation. Never the default; see case (15). */
const ESCALATE = "block_new_and_cancel" as const;

const NOT_FOUND = "NEXT_NOT_FOUND";

// The mocked next/headers reads this at CALL time, so login() can swap the session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

/** The `fitout/notify` envelope, exactly as `emitNotify` hands it to the client. */
type NotifyEnvelope = {
  name: string;
  data: { type: string; recipientId: string; bookingId: string | null; payload: { href: string } };
};
const inngestSend = vi.fn(async (event: NotifyEnvelope) => ({ ids: [event.name] }));

/**
 * The rate limiter, stubbed — the real one is a module-level Map, and this file makes far more than a
 * handful of privileged calls as one staff member, so later cases would measure a rate-limit denial
 * rather than the behaviour they name. The stub also makes the key and budget OBSERVABLE.
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
let cancelBookingAsOps: CancelActions["cancelBookingAsOps"];
let cancelBookingAsHost: CancelActions["cancelBookingAsHost"];
type ImpactModule = typeof import("@/lib/ops/cancel-impact");
let loadOpsCancelImpact: ImpactModule["loadOpsCancelImpact"];
type SweepModule = typeof import("@/inngest/functions/payout-sweep");
let queryDuePayouts: SweepModule["queryDuePayouts"];

let staffId: string;
let civilianId: string;
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

/** A dedicated listing per case, so seeded bookings never collide on the booking_no_overlap EXCLUDE. */
async function seedListing(id: string): Promise<string> {
  await testDb.db.insert(listing).values({
    id,
    hostId,
    title: `Listing ${id}`,
    status: "published",
    reviewState: "approved",
    bookingMode: "instant",
    unitCount: 1,
    timezone: "Asia/Manila",
    city: "Makati",
    hourlyRateCents: HOURLY,
    cancellationPolicy: "standard",
  });
  return id;
}

/** Seed a CONFIRMED, PAID booking whose session starts `msToStart` from the DB clock (negative = started). */
async function seedBooking(
  id: string,
  listingId: string,
  msToStart: number,
): Promise<{ startsAt: Date; endsAt: Date }> {
  const base = await readDbNow(testDb.db);
  const startsAt = new Date(base.getTime() + msToStart);
  const endsAt = new Date(startsAt.getTime() + HOUR);
  await testDb.db.insert(booking).values({
    id,
    listingId,
    unit: 1,
    bookerId,
    startsAt,
    endsAt,
    status: "confirmed",
    bookingMode: "instant",
    cancellationPolicy: "standard",
    spacePriceCents: HOURLY,
    serviceFeeCents: SERVICE_FEE,
    quotedTotalCents: TOTAL,
    currency: "php",
    paymentId: `pay_${id}`,
    paymentMethod: "gcash",
    expiresAt: null,
  });
  return { startsAt, endsAt };
}

/** A PAYOUT ledger row in a chosen state — D-241's "the payout has already left" fixture. */
async function seedPayoutRow(bookingId: string, state: "processing" | "paid"): Promise<void> {
  await testDb.db.insert(hostPayoutLedger).values({
    id: `led_${bookingId}_${state}`,
    bookingId,
    hostId,
    kind: "payout",
    grossCents: HOURLY,
    commissionRateBps: 1000,
    commissionCents: 10000,
    netCents: HOURLY - 10000,
    currency: "php",
    state,
  });
}

async function readRow(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      refundCents: booking.refundCents,
      retainedSpaceCents: booking.retainedSpaceCents,
      cancelledBy: booking.cancelledBy,
      cancelledAt: booking.cancelledAt,
      declineReason: booking.declineReason,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

/** THE ABSENCE INSTRUMENT — kind-scoped, so a coexisting payout row can never stand in for a debit. */
async function readDebits(bookingId: string) {
  return testDb.db
    .select()
    .from(hostPayoutLedger)
    .where(
      and(eq(hostPayoutLedger.bookingId, bookingId), eq(hostPayoutLedger.kind, "host_cancel_fee")),
    );
}

async function trailRows(action: string, outcome: "ok" | "denied" | "needs_attention") {
  return testDb.db
    .select()
    .from(audit)
    .where(and(eq(audit.action, action), eq(audit.outcome, outcome)));
}

/**
 * Re-import the action with `OPS_CANCEL_REFUNDS_SERVICE_FEE` flipped to `true`, run one call against
 * it, and put the module registry back.
 *
 * THIS IS WHAT MAKES "ONE LINE FLIPS IT" MEASURED. The constant is a literal in a module that both the
 * action and the console's impact read import, so the ONLY thing this helper changes is that literal —
 * exactly the edit a PM re-deciding D-236 would ask for. Nothing in `cancel-booking.ts` is touched.
 */
async function withFlippedConstant<T>(fn: (mod: CancelActions) => Promise<T>): Promise<T> {
  vi.doMock("@/lib/payments/fees", async () => {
    const actual =
      await vi.importActual<typeof import("@/lib/payments/fees")>("@/lib/payments/fees");
    return { ...actual, OPS_CANCEL_REFUNDS_SERVICE_FEE: true };
  });
  vi.resetModules();
  try {
    const mod = (await import("@/app/actions/cancel-booking")) as CancelActions;
    return await fn(mod);
  } finally {
    vi.doUnmock("@/lib/payments/fees");
    vi.resetModules();
  }
}

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);

  await signUp(testAuth, {
    email: STAFF_EMAIL,
    password: PASSWORD,
    name: "Ops Staff",
    firstName: "Ola",
    intent: "book",
  });
  await signUp(testAuth, {
    email: CIVILIAN_EMAIL,
    password: PASSWORD,
    name: "Civ Ilian",
    firstName: "Cai",
    intent: "book",
  });
  await signUp(testAuth, {
    email: HOST_EMAIL,
    password: PASSWORD,
    name: "OC Host",
    firstName: "Hana",
    intent: "host",
  });
  await signUp(testAuth, {
    email: BOOKER_EMAIL,
    password: PASSWORD,
    name: "OC Booker",
    firstName: "Bea",
    intent: "book",
  });

  const ids = await testDb.db.select({ id: user.id, email: user.email }).from(user);
  staffId = ids.find((r) => r.email === STAFF_EMAIL)!.id;
  civilianId = ids.find((r) => r.email === CIVILIAN_EMAIL)!.id;
  hostId = ids.find((r) => r.email === HOST_EMAIL)!.id;
  bookerId = ids.find((r) => r.email === BOOKER_EMAIL)!.id;

  // The CLI's privileged Drizzle flip — never `auth.api.updateUser`, which `input: false` makes
  // structurally incapable of writing this field.
  await testDb.db.update(user).set({ role: "staff" }).where(eq(user.id, staffId));

  // An ACTIVATED payout wallet: `queryDuePayouts` JOINs host_payout, so without it case (7)'s
  // before/after sweep control would return nothing in BOTH directions and prove nothing.
  await makeVerifiedHost(testDb.db, hostId, { insertUser: false, paymongoAccountId: WALLET_ID });

  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.doMock("next/navigation", () => ({
    notFound: () => {
      throw new Error(NOT_FOUND);
    },
  }));
  vi.doMock("@/lib/paymongo", () => ({
    createRefund: mockPayMongo.createRefund,
    createCheckoutSession: mockPayMongo.createCheckoutSession,
    createRefundTransfer: mockPayMongo.createBatchTransfer,
    createBatchTransfer: mockPayMongo.createBatchTransfer,
    listReceivingInstitutions: mockPayMongo.listWalletAccounts,
    listWalletAccounts: mockPayMongo.listWalletAccounts,
    getTransfer: mockPayMongo.getTransfer,
    INSTAPAY_CEILING_CENTS: 5000000,
  }));
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  // `createFunction` is stubbed alongside `send` because payout-sweep builds its cron function at
  // MODULE LOAD, so a send-only stub throws on import before any test runs.
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
  ({ cancelBookingAsOps, cancelBookingAsHost } = await import("@/app/actions/cancel-booking"));
  ({ loadOpsCancelImpact } = await import("@/lib/ops/cancel-impact"));
  ({ queryDuePayouts } = await import("@/inngest/functions/payout-sweep"));
}, 120_000);

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  vi.doUnmock("next/navigation");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("next/cache");
  vi.doUnmock("@/inngest/client");
  vi.doUnmock("@/lib/rate-limit");
  await teardownTestDb(testDb);
});

beforeEach(async () => {
  rateLimitAllows = true;
  rateLimitCalls.length = 0;
  inngestSend.mockClear();
  mockPayMongo.reset();
  await login(STAFF_EMAIL);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// C1 — THE REFUND BASIS, UNDER BOTH VALUES OF THE CONSTANT (D-209 / D-236)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("ENF-03 / D-209 — what an ops-forced cancellation refunds", () => {
  it("case 1 — SHIPPED (constant false): the booker gets the SPACE PRICE and FitOut retains the D-74 service fee", async () => {
    // The constant this case is written against. If somebody flips it in `fees.ts`, this assertion
    // fails FIRST and names the reason, rather than cases 1 and 2 mysteriously swapping results.
    expect(
      OPS_CANCEL_REFUNDS_SERVICE_FEE,
      "case 1 asserts the SHIPPED (false) basis — swap cases 1 and 2 if D-236 is re-decided",
    ).toBe(false);

    const l = await seedListing("oc_l_basis");
    await seedBooking("oc_b_basis", l, 3 * HOUR);

    const res = await cancelBookingAsOps({
      bookingId: "oc_b_basis",
      listingId: l,
      lever: ESCALATE,
      reason: REASON,
    });

    expect(res).toEqual({ ok: true, refundCents: HOURLY });

    // EXPLICIT CENTAVOS, off the frozen row. ₱1,000 back, ₱50 retained out of ₱1,050 charged.
    const row = await readRow("oc_b_basis");
    expect(row.refundCents).toBe(100000);
    expect(TOTAL - row.refundCents!).toBe(5000);

    // …and the same figure is what was DISPATCHED. The written amount and the moved amount are one
    // number, which is the whole promise the money path makes.
    expect(mockPayMongo.createRefund).toHaveBeenCalledTimes(1);
    expect(mockPayMongo.createRefund.mock.calls[0][0]).toMatchObject({ amountCents: 100000 });
  });

  it("case 2 — FLIPPED (constant true): the same shape of booking refunds the whole charged total, and nothing else changes", async () => {
    const l = await seedListing("oc_l_flip");
    await seedBooking("oc_b_flip", l, 3 * HOUR);

    const res = await withFlippedConstant((mod) =>
      mod.cancelBookingAsOps({
        bookingId: "oc_b_flip",
        listingId: l,
        lever: ESCALATE,
        reason: REASON,
      }),
    );

    // ₱1,050, not ₱1,000 — the D-74 service fee comes back too, which is what the host-cancel
    // precedent at cancel-booking.ts:1134-1137 already does and what D-236 leaves the PM to settle.
    expect(res).toEqual({ ok: true, refundCents: TOTAL });
    const row = await readRow("oc_b_flip");
    expect(row.refundCents).toBe(105000);
    expect(TOTAL - row.refundCents!).toBe(0);
    expect(mockPayMongo.createRefund.mock.calls[0][0]).toMatchObject({ amountCents: 105000 });

    // EVERY OTHER CONSEQUENCE IS UNCHANGED BY THE FLIP. The constant decides one number and nothing
    // else — which is the property that makes flipping it a one-line change rather than a project.
    expect(row.cancelledBy).toBe("ops");
    expect(row.retainedSpaceCents).toBe(0);
    expect(await readDebits("oc_b_flip")).toHaveLength(0);
  });

  it("case 3 — the impact figures the operator is shown agree with the money the action moves, under BOTH values", async () => {
    const l = await seedListing("oc_l_agree");
    await seedBooking("oc_b_agree_1", l, 3 * HOUR);
    await seedBooking("oc_b_agree_2", l, 6 * HOUR);

    // Two bookings, so the aggregate is a real sum rather than a single row wearing one.
    const shipped = await loadOpsCancelImpact(testDb.db, l);
    expect(shipped.cancellableCount).toBe(2);
    expect(shipped.refundTotal).toBe(formatMoney(2 * HOURLY, "php"));
    expect(shipped.retainedTotal).toBe(formatMoney(2 * SERVICE_FEE, "php"));
    expect(shipped.hostPaid).toBe("Nothing");
    expect(shipped.notCancellableCount).toBe(0);

    // The dialog and the action read ONE expression, so the flip moves both together. A dialog that
    // could disagree with the server about a refund is the D-130 / GATE-05 failure.
    const flipped = await withFlippedConstant(async () => {
      const mod = (await import("@/lib/ops/cancel-impact")) as ImpactModule;
      return mod.loadOpsCancelImpact(testDb.db, l);
    });
    expect(flipped.refundTotal).toBe(formatMoney(2 * TOTAL, "php"));
    expect(flipped.retainedTotal).toBe(formatMoney(0, "php"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// C2 — NO CANCELLATION-FEE DEBIT (D-235), AS AN ABSENCE, WITH A CONTROL
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("D-235 — the host-cancellation fee debit is suppressed on the ops path", () => {
  it("case 4 — no debit row exists, and the path provably RAN THROUGH the position where one would be written", async () => {
    const l = await seedListing("oc_l_fee");
    const { startsAt } = await seedBooking("oc_b_fee", l, 4 * HOUR);

    const res = await cancelBookingAsOps({
      bookingId: "oc_b_fee",
      listingId: l,
      lever: ESCALATE,
      reason: REASON,
    });
    expect(res.ok).toBe(true);

    // ── THE PROOF THE PATH RAN, WHICH IS WHAT KEEPS THE ABSENCE BELOW FROM BEING VACUOUS. ─────────
    // The auto-block insert happens BEFORE the position where the host path charges its fee; the
    // refund dispatch happens AFTER it. Observing both means execution passed straight THROUGH that
    // position — so the missing row is a suppression, not a short-circuit, a throw, or an early
    // return. (`checkout-probe.test.ts` shipped exactly the opposite: three cases that passed for the
    // wrong reason, where the tell was runtime rather than output.)
    const blocks = await testDb.db
      .select()
      .from(availabilityBlock)
      .where(eq(availabilityBlock.listingId, l));
    expect(
      blocks,
      "consequence 3 (auto-block) did not run — the absence below proves nothing",
    ).toHaveLength(1);
    expect(blocks[0].startsAt.getTime()).toBe(startsAt.getTime());
    expect(
      mockPayMongo.createRefund,
      "consequence 1 (the refund dispatch) did not run — the absence below proves nothing",
    ).toHaveBeenCalledTimes(1);

    // ── THE CLAIM. ABSENT, not zero-valued. ──────────────────────────────────────────────────────
    const debits = await readDebits("oc_b_fee");
    expect(debits).toHaveLength(0);

    // Stated the second way the plan asks for, so a future reader cannot mistake "no rows" for "a row
    // whose amount happened to be zero".
    const [{ count }] = (await testDb.db.execute(sql`
      SELECT COUNT(*)::int AS "count" FROM host_payout_ledger
      WHERE booking_id = 'oc_b_fee' AND kind = 'host_cancel_fee'
    `)) as unknown as { count: number }[];
    expect(count).toBe(0);
  });

  it("case 5 — POSITIVE CONTROL: the HOST path over a comparable booking DOES write the debit row", async () => {
    // Without this, case 4's absence would also pass against a broken query, the wrong ledger kind, or
    // a fixture that never wrote a ledger row under any circumstances.
    const l = await seedListing("oc_l_fee_control");
    await seedBooking("oc_b_fee_control", l, 5 * HOUR);

    await login(HOST_EMAIL);
    const res = await cancelBookingAsHost("oc_b_fee_control", "maintenance");
    expect(res.ok).toBe(true);

    const debits = await readDebits("oc_b_fee_control");
    expect(debits, "the control failed — case 4's absence is not measuring anything").toHaveLength(1);
    expect(debits[0].netCents).toBeLessThan(0);

    // And the two paths differ in the durable record of WHO decided, which is C3's claim seen from
    // the other side.
    expect((await readRow("oc_b_fee_control")).cancelledBy).toBe("host");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// C3 + C4 — THE ACTOR ON THE ROW, AND THE HOST BEING PAID NOTHING
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("D-244 / ENF-03 — the durable record of who decided, and what the host gets", () => {
  it("case 6 — cancelled_by is 'ops': not 'host' (which would blame them), not 'system' (which would mean nobody decided)", async () => {
    const l = await seedListing("oc_l_actor");
    await seedBooking("oc_b_actor", l, 2 * HOUR);

    await cancelBookingAsOps({
      bookingId: "oc_b_actor",
      listingId: l,
      lever: ESCALATE,
      reason: REASON,
    });

    const row = await readRow("oc_b_actor");
    expect(row.cancelledBy).toBe("ops");
    expect(row.cancelledBy).not.toBe("host");
    expect(row.cancelledBy).not.toBe("system");
    expect(row.status).toBe("cancelled");
    expect(row.cancelledAt).not.toBeNull();
    // The taxonomy SENTENCE lands in the durable column; the operator's free text does not (D-72).
    expect(row.declineReason).toBe(REASON);
  });

  it("case 7 — retained_space_cents = 0, and the payout sweep therefore EXCLUDES the booking (before/after)", async () => {
    // Ended 25h ago, so `ends_at + PAYOUT_DELAY_HOURS <= now()` and the sweep genuinely wants it.
    const l = await seedListing("oc_l_sweep");
    await seedBooking("oc_b_sweep", l, -26 * HOUR);

    // BEFORE — the control. Without it the exclusion below would also pass for a booking the sweep
    // never selected in the first place.
    const before = await queryDuePayouts(testDb.db);
    expect(
      before.map((d) => d.bookingId),
      "the sweep never wanted this booking — case 7's exclusion would prove nothing",
    ).toContain("oc_b_sweep");

    await cancelBookingAsOps({
      bookingId: "oc_b_sweep",
      listingId: l,
      lever: ESCALATE,
      reason: REASON,
    });

    // `retained_space_cents = 0` is the whole mechanism. NULL here would fall through to
    // `COALESCE(retained, space_price)` and pay the host the full ₱1,000 — the exact inversion.
    const row = await readRow("oc_b_sweep");
    expect(row.retainedSpaceCents).toBe(0);
    expect(row.retainedSpaceCents).not.toBeNull();

    // AFTER — "the host is paid nothing", enforced by an EXISTING predicate with no new code.
    const after = await queryDuePayouts(testDb.db);
    expect(after.map((d) => d.bookingId)).not.toContain("oc_b_sweep");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// C5 — D-241, BOTH DIRECTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("D-241 — the replacement guard: reach a started session, refuse a paid-out one WITH the reason", () => {
  it("case 8 — a CONFIRMED booking whose session has ALREADY STARTED is cancellable (the host path's guard is not inherited)", async () => {
    // Started 30 minutes ago and still running. `cancelBookingAsHost` refuses this outright; an ops
    // cancel must reach it, because a space confirmed fake is fake whether or not the clock started.
    const l = await seedListing("oc_l_started");
    await seedBooking("oc_b_started", l, -30 * MIN);

    const res = await cancelBookingAsOps({
      bookingId: "oc_b_started",
      listingId: l,
      lever: ESCALATE,
      reason: REASON,
    });

    expect(res).toEqual({ ok: true, refundCents: HOURLY });
    expect((await readRow("oc_b_started")).cancelledBy).toBe("ops");
  });

  it("case 9 — a booking whose payout is 'processing' is REFUSED, naming the reason — never a silent no-op", async () => {
    const l = await seedListing("oc_l_processing");
    await seedBooking("oc_b_processing", l, 3 * HOUR);
    await seedPayoutRow("oc_b_processing", "processing");

    const res = await cancelBookingAsOps({
      bookingId: "oc_b_processing",
      listingId: l,
      lever: ESCALATE,
      reason: REASON,
    });

    expect(res.ok).toBe(false);
    // THE REASON, not a generic "no longer active" — that distinction is the whole of D-241's
    // "surfaced with the reason, never a silent no-op".
    expect(res.ok === false && res.error).toContain("payout has already left FitOut");

    // NOTHING MOVED. The refusal is a refusal, not a partial cancellation.
    const row = await readRow("oc_b_processing");
    expect(row.status).toBe("confirmed");
    expect(row.cancelledBy).toBeNull();
    expect(row.refundCents).toBeNull();
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();

    // …and the refusal is AUDITED under its own reason, so it is non-repudiable.
    const denials = await trailRows("ops_cancel_booking", "denied");
    const mine = denials.find(
      (r) => (r.meta as { bookingId?: string })?.bookingId === "oc_b_processing",
    );
    expect(mine, "the refusal was not audited").toBeDefined();
    expect((mine!.meta as { reason?: string }).reason).toBe("payout_already_sent");
    expect(mine!.actorId).toBe(staffId);
  });

  it("case 10 — the same refusal for a payout in 'paid'", async () => {
    const l = await seedListing("oc_l_paid");
    await seedBooking("oc_b_paid", l, 3 * HOUR);
    await seedPayoutRow("oc_b_paid", "paid");

    const res = await cancelBookingAsOps({
      bookingId: "oc_b_paid",
      listingId: l,
      lever: ESCALATE,
      reason: REASON,
    });

    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toContain("payout has already left FitOut");
    expect((await readRow("oc_b_paid")).status).toBe("confirmed");
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();
  });

  it("case 11 — the console's impact read counts a paid-out booking under notCancellableCount, with its reason", async () => {
    // The operator has to see this BEFORE they commit, not discover it as a refusal afterwards.
    const l = await seedListing("oc_l_impact");
    await seedBooking("oc_b_impact_ok_1", l, 2 * HOUR);
    await seedBooking("oc_b_impact_ok_2", l, 5 * HOUR);
    await seedBooking("oc_b_impact_gone", l, 8 * HOUR);
    await seedPayoutRow("oc_b_impact_gone", "paid");

    const impact = await loadOpsCancelImpact(testDb.db, l);

    expect(impact.cancellableCount).toBe(2);
    expect(impact.notCancellableCount).toBe(1);
    expect(impact.notCancellableReason).toBe("their payout has already left FitOut");
    // The money figures cover the CANCELLABLE set only — the paid-out booking's ₱1,050 is not money
    // that would go back, and counting it would over-state the refund the operator is authorising.
    expect(impact.refundTotal).toBe(formatMoney(2 * HOURLY, "php"));
    expect(impact.retainedTotal).toBe(formatMoney(2 * SERVICE_FEE, "php"));
    expect(impact.hostPaid).toBe("Nothing");
    // Every money field is a FINISHED STRING — the console performs no arithmetic (D-130 / GATE-05).
    expect(typeof impact.refundTotal).toBe("string");
    expect(typeof impact.retainedTotal).toBe("string");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// C6 — THE NOTIFICATION THAT MUST NOT BE SENT (Pitfall 5)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("Fork 5 — the ops path emits no host-cancellation notification", () => {
  it("case 12 — no host-cancel notification reaches either party, and the observer is proven live", async () => {
    const l = await seedListing("oc_l_notify");
    await seedBooking("oc_b_notify", l, 3 * HOUR);

    await cancelBookingAsOps({
      bookingId: "oc_b_notify",
      listingId: l,
      lever: ESCALATE,
      reason: REASON,
    });

    // THE CLAIM, asserted on the EMISSION OBSERVER — not on the absence of an error. Both of that
    // notification's sentences are false here: the booker's says their host cancelled on them, and
    // the host's quotes a fee D-235 suppresses.
    const opsSent = inngestSend.mock.calls.map((c) => c[0]);
    expect(opsSent.map((e) => e.data.type)).not.toContain("booking_cancelled_by_host");
    expect(opsSent.filter((e) => e.data.bookingId === "oc_b_notify")).toHaveLength(0);

    // POSITIVE CONTROL — the observer WOULD have caught it. The host path over a comparable booking
    // emits exactly that type, twice, so case 12's silence is the action's and not the harness's.
    const lc = await seedListing("oc_l_notify_control");
    await seedBooking("oc_b_notify_control", lc, 7 * HOUR);
    inngestSend.mockClear();
    await login(HOST_EMAIL);
    await cancelBookingAsHost("oc_b_notify_control", "maintenance");

    const hostSent = inngestSend.mock.calls
      .map((c) => c[0])
      .filter((e) => e.data.type === "booking_cancelled_by_host");
    expect(
      hostSent,
      "the emission observer is not live — case 12's negative proves nothing",
    ).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// C7 — THE TRAIL, THE GATE, THE LEVER AND THE SCOPE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("OPS-03 / D-215 / D-218 — the audit trail is the control", () => {
  it("case 13 — the trail row carries the AUTHENTICATED staff id and a verb distinct from the host path's", async () => {
    const l = await seedListing("oc_l_audit");
    await seedBooking("oc_b_audit", l, 3 * HOUR);

    await cancelBookingAsOps({
      bookingId: "oc_b_audit",
      listingId: l,
      lever: ESCALATE,
      reason: REASON,
    });

    // Read back OUT OF THE TABLE — `recordAudit` swallows its own insert failure, so a return value
    // is evidence of nothing about the trail row.
    const rows = await trailRows("ops_cancel_booking", "ok");
    const row = rows.find((r) => (r.meta as { bookingId?: string })?.bookingId === "oc_b_audit");
    expect(row, "no trail row was written for the ops cancellation").toBeDefined();
    expect(row!.actorId).toBe(staffId);

    const meta = row!.meta as { hostId?: string; listingId?: string; refundCents?: number };
    // Findable BY HOST — an enforcement action against a fraudulent host is queried that way.
    expect(meta.hostId).toBe(hostId);
    expect(meta.listingId).toBe(l);
    expect(meta.refundCents).toBe(HOURLY);

    // The verb is DISTINCT: the host path's rows must not absorb FitOut's own decisions.
    const hostVerb = await trailRows("host_cancel_booking", "ok");
    expect(
      hostVerb.some((r) => (r.meta as { bookingId?: string })?.bookingId === "oc_b_audit"),
    ).toBe(false);

    // And the budget is keyed on the AUTHENTICATED identity, never on an id a caller supplied.
    expect(rateLimitCalls.some((c) => c.key === `ops-cancel-booking:${staffId}`)).toBe(true);
  });

  it("case 14 — a NON-STAFF caller is refused before any write, and nothing moved (with a positive control)", async () => {
    const l = await seedListing("oc_l_gate");
    await seedBooking("oc_b_gate", l, 3 * HOUR);

    await login(CIVILIAN_EMAIL);
    await expect(
      cancelBookingAsOps({
        bookingId: "oc_b_gate",
        listingId: l,
        lever: ESCALATE,
        reason: REASON,
      }),
    ).rejects.toThrow(NOT_FOUND);

    // Refused BEFORE any write: the booking is untouched, no money was dispatched, and the refusal
    // consumed nobody's rate-limit budget (the gate runs first, by design).
    const row = await readRow("oc_b_gate");
    expect(row.status).toBe("confirmed");
    expect(row.cancelledBy).toBeNull();
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();
    expect(rateLimitCalls).toHaveLength(0);
    expect(civilianId).not.toBe(staffId); // the two identities are genuinely different rows

    // POSITIVE CONTROL — the same call as STAFF succeeds, so case 14 is not passing against an action
    // hardcoded to refuse everybody.
    await login(STAFF_EMAIL);
    const res = await cancelBookingAsOps({
      bookingId: "oc_b_gate",
      listingId: l,
      lever: ESCALATE,
      reason: REASON,
    });
    expect(res.ok).toBe(true);
  });

  it("case 15 — D-233: the escalation cannot be reached by default; the lighter lever cancels nothing", async () => {
    const l = await seedListing("oc_l_lever");
    await seedBooking("oc_b_lever", l, 3 * HOUR);

    // `lever` omitted ⇒ parses to the LIGHTER lever. A `"use server"` export is reachable by POST
    // whatever the UI shows, so the deliberate act is re-asserted server-side.
    const res = await cancelBookingAsOps({ bookingId: "oc_b_lever", listingId: l, reason: REASON });

    expect(res.ok).toBe(false);
    const row = await readRow("oc_b_lever");
    expect(row.status).toBe("confirmed");
    expect(row.cancelledBy).toBeNull();
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();

    const denials = await trailRows("ops_cancel_booking", "denied");
    const mine = denials.find((r) => (r.meta as { bookingId?: string })?.bookingId === "oc_b_lever");
    expect(mine).toBeDefined();
    expect((mine!.meta as { reason?: string }).reason).toBe("lever_not_escalated");
  });

  it("case 16 — fork 2: a booking id from ANOTHER listing cannot be smuggled into this listing's enforcement", async () => {
    const lA = await seedListing("oc_l_scope_a");
    const lB = await seedListing("oc_l_scope_b");
    await seedBooking("oc_b_scope", lA, 3 * HOUR);

    const res = await cancelBookingAsOps({
      bookingId: "oc_b_scope",
      listingId: lB, // the operator was looking at B; this booking belongs to A
      lever: ESCALATE,
      reason: REASON,
    });

    expect(res.ok).toBe(false);
    expect((await readRow("oc_b_scope")).status).toBe("confirmed");
    expect(mockPayMongo.createRefund).not.toHaveBeenCalled();
  });
});
