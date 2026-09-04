// THE SWEEP IS THE GUARANTEE, SO IT IS DEMONSTRATED — NOT DESCRIBED.
//
// `src/inngest/functions/payment-reconcile.ts` claims that a booking PayMongo records as paid reaches
// `confirmed` on a schedule even when its webhook never arrives, that it reaches it through ONE confirm
// path, that it touches nothing else, and that the missed webhook becomes an operator-reachable alert.
// Every one of those is a money claim, and this repository has a documented history of money claims that
// were committed as green tests and turned out to be false: a fail-closed guard asserted by the value it
// returned (five vacuous cases, the tell was a 32ms runtime where 3s was required), a closed-set walk that
// stayed 44/44 green with its predicate hardwired `true`. So nothing here asserts that something did not
// throw, and no absence is asserted without a matching PRESENCE:
//
//   - every "exactly one" is the LENGTH of a captured array (notify emissions, `recordAudit` calls,
//     `createRefund` calls), never an un-thrown error;
//   - every "nothing happened" case also asserts the PROVIDER WAS ACTUALLY ASKED (`getCheckoutSession`
//     call count), so a probe that silently short-circuited could not masquerade as a fail-closed pass;
//   - the file opens with a guard-the-guard case on the SELECTOR, because if `queryUnconfirmedPaid`
//     returned nothing, every exclusion case below it would pass vacuously against an empty list — the
//     exact failure `tests/design/money-path-invariants.test.ts:44-49` exists to prevent.
//
// WHY THE PROVIDER IS STUBBED UNDERNEATH THE PROBE. `mockPayMongo.getCheckoutSession` replaces the HTTP
// call, NOT `probeCheckoutSession`. The real probe therefore runs: its id validation, its no-secret
// short-circuit, and its "resolves `null` on ANY failure" guarantee — which case (10) drives by making the
// provider REJECT rather than by handing the sweep a hand-written `null`. Stubbing the probe itself would
// have replaced precisely the fail-closed behaviour the sweep leans on with a test's own assumption.
//
// ⚠ `PAYMONGO_SECRET_KEY` is stubbed for this file. Without it the probe answers `null` with no request at
// all (D-35's CI secret boundary), every "probe says paid" case would read `"unknown"`, and the suite would
// be measuring the short-circuit instead of the sweep. `vi.unstubAllEnvs()` restores it in afterAll.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// THE BUG THIS FILE FOUND ON ITS FIRST RUN — why the sweep is proven by running and not by reading
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// `queryUnconfirmedPaid` originally bound `RECONCILE_EPOCH` as a Date OBJECT. It type-checked, it linted,
// and it threw on every single call:
//
//   TypeError: The "string" argument must be of type string or an instance of Buffer or ArrayBuffer.
//   Received an instance of Date       (ERR_INVALID_ARG_TYPE, types: [1184, 23, 20])
//
// Drizzle tags the parameter timestamptz (OID 1184) and postgres.js's serializer for that OID expects a
// string. Six of the eighteen cases below reported it as `Failed query:` before a single behaviour was
// measured. Shipped, the sweep — the one job standing between a booker who paid and nothing — would have
// failed its query on every pass forever. The fix is `.toISOString()::timestamptz`, recorded at the
// constant's declaration.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// TWO DELIBERATE BREAKS, OBSERVED 2026-08-22 — the candidate set's two scopes are load-bearing
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// A selectivity case that has never been seen to fail is a case that might just be asserting an empty
// list. Both breaks were applied to `src/inngest/functions/payment-reconcile.ts`, run, and reverted from a
// saved copy in the scratchpad (never `git checkout --`).
//
// ── BREAK A: the status scope widened to admit terminal rows ────────────────────────────────────────────
//   WHERE status IN ('pending', 'approved')
//     →  WHERE status IN ('pending', 'approved', 'cancelled', 'confirmed', 'requested')
//
//    ❯ tests/payments/payment-reconcile.test.ts (18 tests | 1 failed) 3932ms
//   ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
//   AssertionError: expected [ 'bk_pr_control', …(4) ] to not include 'bk_pr_confirmed'
//    ❯ tests/payments/payment-reconcile.test.ts:312:21
//
// ── BREAK B: D-111's epoch removed ──────────────────────────────────────────────────────────────────────
//   AND created_at >= ${RECONCILE_EPOCH.toISOString()}::timestamptz  →  AND created_at >= '1970-01-01…'
//
//    ❯ tests/payments/payment-reconcile.test.ts (18 tests | 1 failed) 4547ms
//   ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
//    FAIL  … > (4) D-111 NO BACKFILL — a pre-epoch row is not selected AND is still untouched after a pass
//   AssertionError: expected [ 'bk_pr_preepoch', …(2) ] to not include 'bk_pr_preepoch'
//    ❯ tests/payments/payment-reconcile.test.ts:357:43
//
// Each break reddened EXACTLY the case that owns it and nothing else, which is also how the cases are
// known not to be measuring one another. (The line numbers above are verbatim from those runs and predate
// this header block — the assertions they name are cases (1) and (4) below.)

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { mockPayMongo } from "../helpers/mocks";
import { user, listing, booking, audit } from "@/lib/db/schema";
import { listUnresolvedAlerts } from "@/lib/ops/alerts";
import { bookingReference } from "@/lib/booking/reference";

let testDb: TestDb;
type SweepModule = typeof import("@/inngest/functions/payment-reconcile");
let queryUnconfirmedPaid: SweepModule["queryUnconfirmedPaid"];
let reconcileOne: SweepModule["reconcileOne"];
let RECONCILE_EPOCH: SweepModule["RECONCILE_EPOCH"];
let RECONCILE_MIN_AGE_MINUTES: SweepModule["RECONCILE_MIN_AGE_MINUTES"];

const HOST = "pr_host";
const BOOKER = "pr_booker";
const BOOKER_EMAIL = "pr_booker@example.com";
const LISTING = "L_pr";

/** See the header: the probe makes no request at all without a secret, so every case would read `unknown`. */
const HARNESS_SECRET = "declared-by-this-harness-not-a-real-paymongo-credential";

/** The operator-alert sink. Mocked so a `needs_attention` record is COUNTABLE, never merely absent. */
const recordAuditMock = vi.fn(async () => {});

/** The `fitout/notify` envelope, exactly as `emitNotify` hands it to the Inngest client. */
type NotifyEnvelope = {
  name: string;
  data: {
    type: string;
    recipientId: string;
    bookingId: string | null;
    email: string | null;
    payload: { referenceLabel?: string };
  };
};

/**
 * The Inngest client, stubbed at the MODULE the sweep's graph resolves. `createFunction` is stubbed too
 * because the module builds `paymentReconcile` at import time. A `vi.spyOn` on an import held by THIS file
 * would patch the pre-`resetModules` instance and silently miss, and `emitNotify` swallows its own
 * transport errors — so the miss would look EXACTLY like a pass. Case (0b) is the floor that catches it.
 */
const inngestSend = vi.fn(async (event: NotifyEnvelope) => ({ ids: [event.name] }));
const inngestCreateFunction = vi.fn((opts: { id: string }) => ({ id: opts.id }));

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

type AuditCall = { actorId: string; action: string; outcome: string; meta?: Record<string, unknown> };

/** Every audit record raised so far — a captured array, so "exactly one" is a length. */
function auditRecords(): AuditCall[] {
  return recordAuditMock.mock.calls.map((c) => (c as unknown as [AuditCall])[0]);
}

/** Every `createRefund` call so far, as its argument object. */
function refundCalls(): Array<{ amountCents: number; paymentId: string }> {
  return mockPayMongo.createRefund.mock.calls.map(
    (c) => c[0] as { amountCents: number; paymentId: string },
  );
}

/** A distinct 1-hour UTC window per booking so seeded rows never collide on the booking_no_overlap EXCLUDE. */
let hourSeq = 0;
function nextWindow(): { startsAt: Date; endsAt: Date } {
  const hour = hourSeq++;
  const day = 1 + Math.floor(hour / 24);
  const h = String(hour % 24).padStart(2, "0");
  const h1 = String((hour % 24) + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return {
    startsAt: new Date(`2027-03-${d}T${h}:00:00.000Z`),
    endsAt: new Date(`2027-03-${d}T${h1}:00:00.000Z`),
  };
}

const MINUTE_MS = 60_000;

async function seedBooking(opts: {
  id: string;
  status: "pending" | "approved" | "requested" | "confirmed" | "cancelled";
  /** Explicit `created_at` — the column the epoch and the min-age floor both key on. */
  createdAt: Date;
  checkoutSessionId?: string | null;
  expiresAt?: Date | null;
  quotedTotalCents?: number;
  paymentId?: string | null;
}): Promise<string> {
  const { startsAt, endsAt } = nextWindow();
  await testDb.db.insert(booking).values({
    id: opts.id,
    listingId: LISTING,
    unit: 1,
    bookerId: BOOKER,
    startsAt,
    endsAt,
    status: opts.status,
    quotedTotalCents: opts.quotedTotalCents ?? 150000,
    currency: "php",
    expiresAt: opts.expiresAt ?? null,
    paymentId: opts.paymentId ?? null,
    checkoutSessionId: opts.checkoutSessionId === undefined ? `cs_${opts.id}` : opts.checkoutSessionId,
    createdAt: opts.createdAt,
  });
  return opts.id;
}

async function readBooking(id: string) {
  const [row] = await testDb.db
    .select({
      status: booking.status,
      expiresAt: booking.expiresAt,
      paymentId: booking.paymentId,
      paymentMethod: booking.paymentMethod,
    })
    .from(booking)
    .where(eq(booking.id, id));
  return row;
}

/** An age comfortably past the min-age floor, and comfortably after the epoch. */
function sweepableCreatedAt(): Date {
  return new Date(Date.now() - 10 * MINUTE_MS);
}

/** A paid session as the provider reports it. */
function paidSession(opts: {
  id: string;
  rail?: string | null;
  paidAt?: Date | null;
  paymentId?: string | null;
}) {
  return {
    id: opts.id,
    status: "paid",
    sourceType: opts.rail === undefined ? "gcash" : opts.rail,
    paidAt: opts.paidAt === undefined ? new Date() : opts.paidAt,
    paymentId: opts.paymentId === undefined ? `pay_${opts.id}` : opts.paymentId,
  };
}

beforeAll(async () => {
  testDb = await setupTestDb();

  await testDb.db.insert(user).values([
    { id: HOST, name: "PR Host", email: "pr_host@example.com", firstName: "Host", emailVerified: true },
    { id: BOOKER, name: "PR Booker", email: BOOKER_EMAIL, firstName: "Booker" },
  ]);
  await testDb.db.insert(listing).values({
    id: LISTING,
    hostId: HOST,
    title: "PR Listing",
    status: "published",
    unitCount: 1,
    timezone: "Asia/Manila",
    hourlyRateCents: 150000,
    dayRateCents: 300000,
    currency: "php",
  });

  vi.stubEnv("PAYMONGO_SECRET_KEY", HARNESS_SECRET);
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
  ({ queryUnconfirmedPaid, reconcileOne, RECONCILE_EPOCH, RECONCILE_MIN_AGE_MINUTES } = await import(
    "@/inngest/functions/payment-reconcile"
  ));
});

beforeEach(() => {
  recordAuditMock.mockClear();
  inngestSend.mockClear();
  inngestSend.mockResolvedValue({ ids: [] });
  // `mockReset` + an explicit safe DEFAULT, rather than `mockClear`: a case that sets a persistent
  // `mockResolvedValue` must not leak its answer into the next case, and the default is the INERT branch
  // (a still-payable, unpaid session) so a case that forgets to override cannot get a spurious confirm.
  mockPayMongo.getCheckoutSession.mockReset();
  mockPayMongo.getCheckoutSession.mockResolvedValue({
    id: "cs_default_unpaid",
    status: "active",
    sourceType: null,
    paidAt: null,
    paymentId: null,
  });
  mockPayMongo.createRefund.mockClear();
  mockPayMongo.createRefund.mockResolvedValue({ id: "ref_pr", status: "pending" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(async () => {
  vi.doUnmock("@/lib/db");
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("@/lib/audit");
  vi.doUnmock("@/inngest/client");
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await teardownTestDb(testDb);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// SELECTIVITY — what the sweep will and will not spend a provider round trip on
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

/** The control row every exclusion case below is measured against. Seeded once, by case (0a). */
const CONTROL = "bk_pr_control";

describe("queryUnconfirmedPaid — the candidate set", () => {
  it("(0a) GUARD-THE-GUARD — a sweepable pending row IS selected, so the exclusions below mean something", async () => {
    await seedBooking({ id: CONTROL, status: "pending", createdAt: sweepableCreatedAt() });

    const rows = await queryUnconfirmedPaid(testDb.db);

    expect(
      rows.map((r) => r.id),
      "the selector returned nothing for a row that satisfies every predicate — every exclusion case " +
        "below would pass vacuously against an empty list, proving nothing at all",
    ).toEqual([CONTROL]);
    expect(rows[0].checkoutSessionId).toBe(`cs_${CONTROL}`);
    expect(rows[0].status).toBe("pending");
  });

  it("(0b) an APPROVED row is ALSO selected — a pay-on-approval request loses the same webhook", async () => {
    // `confirmPaidBooking` confirms from `pending` OR `approved` (PAY-05 / D-63). If the sweep only asked
    // about `pending`, the entire request-to-book payment mode would have NO reconciliation at all — the
    // booker pays, the webhook is lost, and nothing on any schedule ever notices.
    const id = await seedBooking({
      id: "bk_pr_approved",
      status: "approved",
      createdAt: sweepableCreatedAt(),
    });

    const ids = (await queryUnconfirmedPaid(testDb.db)).map((r) => r.id);

    expect(ids).toContain(id);
    expect(ids).toContain(CONTROL);
  });

  it("(1) EXCLUDES terminal and not-yet-payable statuses — confirmed, cancelled, requested", async () => {
    // `cancelled` is the load-bearing one. MEASURED by 13.1-01 (confirm-idempotency case 5, and row 1 of
    // this phase's deferred-items.md): `handleGoneSlot` short-circuits on `confirmed` but NOT on
    // `cancelled`, so handing a dead row to the confirm writes a FRESH needs_attention record every pass.
    // At a 5-minute cadence that is one alert every five minutes forever off a single dead booking, and
    // D-110 dies of its own noise. Keeping terminal rows out of the candidate set is the fix.
    const confirmed = await seedBooking({
      id: "bk_pr_confirmed",
      status: "confirmed",
      createdAt: sweepableCreatedAt(),
    });
    const cancelled = await seedBooking({
      id: "bk_pr_cancelled",
      status: "cancelled",
      createdAt: sweepableCreatedAt(),
    });
    const requested = await seedBooking({
      id: "bk_pr_requested",
      status: "requested",
      createdAt: sweepableCreatedAt(),
    });

    const ids = (await queryUnconfirmedPaid(testDb.db)).map((r) => r.id);

    expect(ids).toContain(CONTROL); // the control is still there — the selector did not simply go blind
    expect(ids).not.toContain(confirmed);
    expect(ids).not.toContain(cancelled);
    expect(ids).not.toContain(requested);
  });

  it("(2) EXCLUDES a pending row with no checkout session — there is nothing to ask the provider about", async () => {
    const noSession = await seedBooking({
      id: "bk_pr_nosession",
      status: "pending",
      createdAt: sweepableCreatedAt(),
      checkoutSessionId: null,
    });

    const ids = (await queryUnconfirmedPaid(testDb.db)).map((r) => r.id);

    expect(ids).toContain(CONTROL);
    expect(ids).not.toContain(noSession); // a probe here would be a round trip spent to learn nothing
  });

  it("(3) EXCLUDES a row younger than RECONCILE_MIN_AGE_MINUTES — never race a healthy webhook", async () => {
    const tooYoung = await seedBooking({
      id: "bk_pr_young",
      status: "pending",
      createdAt: new Date(Date.now() - 20_000), // 20s: a webhook in flight, not a webhook that was lost
    });

    const ids = (await queryUnconfirmedPaid(testDb.db)).map((r) => r.id);

    expect(RECONCILE_MIN_AGE_MINUTES).toBeGreaterThan(0);
    expect(ids).toContain(CONTROL);
    expect(
      ids,
      "a 20-second-old booking was swept — the sweep is racing healthy settlements and will file " +
        "'missed webhook' alerts on payments that were about to land normally",
    ).not.toContain(tooYoung);
  });

  it("(4) D-111 NO BACKFILL — a pre-epoch row is not selected AND is still untouched after a full pass", async () => {
    const preEpoch = await seedBooking({
      id: "bk_pr_preepoch",
      status: "pending",
      createdAt: new Date(RECONCILE_EPOCH.getTime() - 24 * 60 * MINUTE_MS), // a day before the epoch
    });

    const selected = await queryUnconfirmedPaid(testDb.db);
    expect(selected.map((r) => r.id)).not.toContain(preEpoch);

    // Exclusion proven by STATE, not only by a query result: run the whole selected batch through the
    // sweep with the provider answering "paid" to everything, then re-read the pre-epoch row. If the epoch
    // leaked anywhere downstream, this row would have moved.
    // The mock's id parameter is optional (it carries a default), so the implementation must accept
    // `undefined` or tsc rejects the assignment — vitest does not typecheck, so this only shows up in tsc.
    mockPayMongo.getCheckoutSession.mockImplementation(async (id?: string) =>
      paidSession({ id: id ?? "cs_unknown" }),
    );
    for (const row of selected) await reconcileOne(row, testDb.db);

    const row = await readBooking(preEpoch);
    expect(
      row.status,
      "the two 2026-08 evidence bookings are FIXTURES (D-111). A pre-epoch row that moves means the " +
        "sweep reaches back over history and would confirm them.",
    ).toBe("pending");
    expect(row.paymentId).toBeNull();
    expect(row.paymentMethod).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// BEHAVIOUR — what one pass over one row actually does
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("reconcileOne — the provider says PAID", () => {
  it("(5) confirms the booking through the ONE path, with the probe's payment id and rail (D-105)", async () => {
    const id = await seedBooking({
      id: "bk_pr_paid",
      status: "pending",
      createdAt: sweepableCreatedAt(),
      expiresAt: new Date(Date.now() + 10 * MINUTE_MS),
    });
    mockPayMongo.getCheckoutSession.mockResolvedValueOnce(
      paidSession({ id: `cs_${id}`, rail: "gcash", paymentId: "pay_pr_paid" }),
    );

    const res = await reconcileOne(
      { id, checkoutSessionId: `cs_${id}`, expiresAt: new Date(Date.now() + 10 * MINUTE_MS), status: "pending" },
      testDb.db,
    );

    expect(res).toEqual({ bookingId: id, outcome: "confirmed" });
    // The provider WAS asked — an absence assertion anywhere in this file is only meaningful because this
    // presence assertion holds.
    expect(mockPayMongo.getCheckoutSession).toHaveBeenCalledTimes(1);

    const row = await readBooking(id);
    expect(row.status).toBe("confirmed");
    expect(row.expiresAt).toBeNull();
    expect(row.paymentId).toBe("pay_pr_paid"); // the pay_… survived the probe (13.1-01's widening)
    expect(row.paymentMethod).toBe("gcash");

    expect(confirmedEmissions(id)).toHaveLength(1); // exactly one BOOK-06 receipt
    expect(refundCalls()).toHaveLength(0);
  });

  it("(6) D-110 — writes EXACTLY ONE needs_attention 'webhook_missed' record, and its meta carries no PII", async () => {
    const id = await seedBooking({
      id: "bk_pr_alert",
      status: "pending",
      createdAt: sweepableCreatedAt(),
      expiresAt: new Date(Date.now() + 10 * MINUTE_MS),
    });
    mockPayMongo.getCheckoutSession.mockResolvedValueOnce(
      paidSession({ id: `cs_${id}`, rail: "qrph", paymentId: "pay_pr_alert" }),
    );

    await reconcileOne(
      { id, checkoutSessionId: `cs_${id}`, expiresAt: new Date(Date.now() + 10 * MINUTE_MS), status: "pending" },
      testDb.db,
    );

    const records = auditRecords();
    expect(records).toHaveLength(1);
    expect(records[0].actorId).toBe("system");
    expect(records[0].action).toBe("webhook_missed");
    expect(records[0].outcome).toBe("needs_attention");
    expect(records[0].meta?.bookingId).toBe(id);
    expect(records[0].meta?.method).toBe("qrph");

    // D-72 binds `audit.meta` as a COLUMN-level rule, and these rows are rendered into the ops digest
    // EMAIL — an external service that forwards, archives and indexes. Asserted POSITIVELY on the
    // serialised value rather than by reading the source: no address, no account/email-shaped key.
    const serialised = JSON.stringify(records[0].meta);
    expect(serialised).not.toContain("@");
    for (const key of Object.keys(records[0].meta ?? {})) {
      expect(
        /email|account|name|phone/i.test(key),
        `audit.meta key "${key}" names an identity field — D-72 forbids it in this column`,
      ).toBe(false);
    }
  });

  it("(7) D-110 REACHABILITY — a row of that exact shape is returned by the ops digest's own query", async () => {
    // Writing a durable row nothing queries is a record, not redress. This asserts the row SATISFIES
    // `listUnresolvedAlerts`'s predicate (outcome='needs_attention' AND resolved_at IS NULL — byte-
    // identical to audit_needs_attention_idx), which is what puts it in the daily operator digest.
    const auditId = randomUUID();
    await testDb.db.insert(audit).values({
      id: auditId,
      actorId: "system",
      action: "webhook_missed",
      outcome: "needs_attention",
      meta: { bookingId: "bk_pr_reach", method: "gcash", paidWithinHold: true },
    });

    const alerts = await listUnresolvedAlerts(testDb.db, { limit: 200 });

    const hit = alerts.find((a) => a.id === auditId);
    expect(
      hit,
      "the sweep's alert row is NOT returned by listUnresolvedAlerts — it exists in the table but can " +
        "never reach the operator's digest, which is the same as not alerting at all",
    ).toBeDefined();
    expect(hit!.action).toBe("webhook_missed");
    expect(hit!.actorId).toBe("system");
  });
});

describe("reconcileOne — D-106 classifies the payment, it never gates the confirm", () => {
  async function runWithHoldWindow(
    id: string,
    expiresAt: Date | null,
    paidAt: Date,
  ): Promise<AuditCall> {
    await seedBooking({ id, status: "pending", createdAt: sweepableCreatedAt(), expiresAt });
    mockPayMongo.getCheckoutSession.mockResolvedValueOnce(
      paidSession({ id: `cs_${id}`, rail: "gcash", paidAt, paymentId: `pay_${id}` }),
    );
    const res = await reconcileOne(
      { id, checkoutSessionId: `cs_${id}`, expiresAt, status: "pending" },
      testDb.db,
    );
    // In ALL THREE cases the booking still reaches `confirmed`: D-106 records which situation this was,
    // it does not decide whether the booker gets their booking.
    expect(res.outcome).toBe("confirmed");
    expect((await readBooking(id)).status).toBe("confirmed");
    const records = auditRecords();
    expect(records).toHaveLength(1);
    return records[0];
  }

  it("(8) paid INSIDE the hold window records paidWithinHold: true", async () => {
    const expiresAt = new Date(Date.now() + 10 * MINUTE_MS);
    const record = await runWithHoldWindow("bk_pr_within", expiresAt, new Date(Date.now() - MINUTE_MS));
    expect(record.meta?.paidWithinHold).toBe(true);
  });

  it("(9) paid AFTER the hold expired records paidWithinHold: false", async () => {
    const expiresAt = new Date(Date.now() - 30 * MINUTE_MS);
    const record = await runWithHoldWindow("bk_pr_late", expiresAt, new Date());
    expect(record.meta?.paidWithinHold).toBe(false);
  });

  it("(10) an unknown hold window records NULL — never a definite 'paid late' about a booking we cannot place", async () => {
    const record = await runWithHoldWindow("bk_pr_nohold", null, new Date());
    expect(record.meta?.paidWithinHold).toBeNull();
    expect(record.meta?.paidWithinHold).not.toBe(false);
  });
});

describe("reconcileOne — D-104 fail-closed: only the provider saying PAID moves anything", () => {
  it("(11) a probe that LEARNED NOTHING leaves the row pending — and the provider was genuinely asked", async () => {
    const id = await seedBooking({ id: "bk_pr_unknown", status: "pending", createdAt: sweepableCreatedAt() });
    // The REAL probe's catch-all: the provider call rejects, and `probeCheckoutSession` resolves `null`.
    // This is the fail-closed guarantee the sweep depends on, exercised rather than simulated.
    mockPayMongo.getCheckoutSession.mockRejectedValueOnce(new Error("ECONNRESET talking to the provider"));

    const res = await reconcileOne(
      { id, checkoutSessionId: `cs_${id}`, expiresAt: null, status: "pending" },
      testDb.db,
    );

    expect(res.outcome).toBe("unknown");
    // THE PRESENCE THAT MAKES THE ABSENCES BELOW MEAN SOMETHING. Without this, a probe short-circuiting
    // before the request would produce the identical "nothing happened" result.
    expect(mockPayMongo.getCheckoutSession).toHaveBeenCalledTimes(1);
    expect((await readBooking(id)).status).toBe("pending");
    expect(confirmedEmissions(id)).toHaveLength(0);
    expect(auditRecords()).toHaveLength(0);
    expect(refundCalls()).toHaveLength(0);
  });

  for (const status of ["active", "expired"] as const) {
    it(`(12/${status}) a session the provider reports as "${status}" leaves the row pending`, async () => {
      const id = await seedBooking({
        id: `bk_pr_${status}`,
        status: "pending",
        createdAt: sweepableCreatedAt(),
      });
      mockPayMongo.getCheckoutSession.mockResolvedValueOnce({
        id: `cs_${id}`,
        status,
        sourceType: null,
        paidAt: null,
        paymentId: null,
      });

      const res = await reconcileOne(
        { id, checkoutSessionId: `cs_${id}`, expiresAt: null, status: "pending" },
        testDb.db,
      );

      expect(res.outcome).toBe("not-paid");
      expect(mockPayMongo.getCheckoutSession).toHaveBeenCalledTimes(1);
      expect((await readBooking(id)).status).toBe("pending");
      expect(confirmedEmissions(id)).toHaveLength(0);
      expect(auditRecords()).toHaveLength(0);
    });
  }
});

describe("reconcileOne — D-105 re-entry: a pass over settled work is inert", () => {
  it("(13) the SECOND pass over the same row is already-confirmed: no second email, no second alert", async () => {
    const id = await seedBooking({
      id: "bk_pr_reentry",
      status: "pending",
      createdAt: sweepableCreatedAt(),
      expiresAt: new Date(Date.now() + 10 * MINUTE_MS),
    });
    const row = {
      id,
      checkoutSessionId: `cs_${id}`,
      expiresAt: new Date(Date.now() + 10 * MINUTE_MS),
      status: "pending",
    };
    mockPayMongo.getCheckoutSession.mockResolvedValue(
      paidSession({ id: `cs_${id}`, rail: "gcash", paymentId: "pay_pr_reentry" }),
    );

    const first = await reconcileOne(row, testDb.db);
    const second = await reconcileOne(row, testDb.db);

    expect(first.outcome).toBe("confirmed");
    expect(second.outcome).toBe("already-confirmed");
    // Both passes really did ask the provider — the second's inertness is the CONFIRM's guard doing its
    // job, not the sweep quietly skipping the row.
    expect(mockPayMongo.getCheckoutSession).toHaveBeenCalledTimes(2);
    expect(confirmedEmissions(id)).toHaveLength(1);
    expect(auditRecords()).toHaveLength(1); // the FIRST pass's webhook_missed, and only that
    expect(auditRecords()[0].action).toBe("webhook_missed");
  });

  it("(14) a row the webhook already confirmed raises NO alert — losing the race is the system working", async () => {
    const id = await seedBooking({
      id: "bk_pr_webhookwon",
      status: "confirmed",
      createdAt: sweepableCreatedAt(),
      paymentId: "pay_from_webhook",
    });
    mockPayMongo.getCheckoutSession.mockResolvedValueOnce(
      paidSession({ id: `cs_${id}`, rail: "gcash", paymentId: "pay_from_sweep" }),
    );

    const res = await reconcileOne(
      { id, checkoutSessionId: `cs_${id}`, expiresAt: null, status: "pending" },
      testDb.db,
    );

    expect(res.outcome).toBe("already-confirmed");
    expect(
      auditRecords(),
      "the sweep alerted on a booking whose webhook DID arrive — at a 5-minute cadence that is a " +
        "needs_attention row per healthy settlement, and the operator queue becomes unreadable",
    ).toHaveLength(0);
    expect(confirmedEmissions(id)).toHaveLength(0);
    // The webhook's payment id was NOT overwritten by the sweep's.
    expect((await readBooking(id)).paymentId).toBe("pay_from_webhook");
  });
});

describe("reconcileOne — D-108: a slot gone by confirm time routes to the RETAINED backstop", () => {
  it("(15) reports a gone outcome and adds NO webhook_missed alert on top of the backstop's own", async () => {
    const id = await seedBooking({
      id: "bk_pr_gone",
      status: "pending",
      createdAt: sweepableCreatedAt(),
      quotedTotalCents: 99900,
    });

    // Selected while still payable…
    const selected = await queryUnconfirmedPaid(testDb.db);
    expect(selected.map((r) => r.id)).toContain(id);

    // …and gone by the time the confirm runs: the slot was retaken during payment and the hold swept.
    await testDb.db.update(booking).set({ status: "cancelled" }).where(eq(booking.id, id));

    // qrph: NOT API-refundable (D-81, re-probed 2026-08-21, identical HTTP 400). The backstop must raise
    // the manual-return alert and must never claim a refund.
    mockPayMongo.getCheckoutSession.mockResolvedValueOnce(
      paidSession({ id: `cs_${id}`, rail: "qrph", paymentId: "pay_pr_gone" }),
    );

    const res = await reconcileOne(
      { id, checkoutSessionId: `cs_${id}`, expiresAt: null, status: "pending" },
      testDb.db,
    );

    expect(["gone-refunded", "gone-manual-return"]).toContain(res.outcome);
    expect(res.outcome).toBe("gone-manual-return"); // the unrefundable rail — money did NOT move
    expect(refundCalls()).toHaveLength(0); // never call the refund API on qrph (it 4xxs)

    // The backstop wrote its own operator alert; the sweep adds nothing on top. One stranded payment must
    // appear ONCE in the operator's queue, not twice.
    const records = auditRecords();
    expect(records).toHaveLength(1);
    expect(records[0].action).toBe("auto_refund_manual");
    expect(records.filter((r) => r.action === "webhook_missed")).toHaveLength(0);
    expect(confirmedEmissions(id)).toHaveLength(0);
  });
});
