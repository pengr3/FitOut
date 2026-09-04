// THE RETIRE POLICY IS A MONEY CLAIM, SO IT IS DEMONSTRATED — NOT DESCRIBED.
//
// `src/lib/payments/retire-checkout.ts` claims four things, and every one of them is the kind of claim this
// repository has previously shipped GREEN and FALSE:
//
//   1. a session the provider reports `paid` is NEVER SENT TO EXPIRE AT ALL;
//   2. the policy cannot throw or reject, for any input, under any provider or database failure;
//   3. no `booking` row is written anywhere;
//   4. no PayMongo prose and no PII ever reaches `audit.meta`, which is a stored column rendered into an
//      operator EMAIL.
//
// So nothing here asserts that something did not throw. Claim (1) is asserted as a CALL COUNT OF ZERO on a
// stubbed `expireCheckoutSession` — never as "the call did not reject", which would pass just as happily
// against a policy that expired the session and swallowed the error, destroying the only handle on a real
// capture. Claim (2) is asserted with `.resolves`, never a try/catch that can pass by never running.
//
// ⚠ THE FIRST CASE IN THE FILE IS A GUARD-THE-GUARD, and it is not ceremony. If `expireCheckoutSession`
// were never wired at all — a bad mock path, a renamed import, a short-circuit above the branch — then
// EVERY "did not expire" assertion below would read zero calls and pass vacuously, and the file would be
// measuring nothing. Case (1) proves the stub is reached and counted before any absence is claimed.
//
// WHY THE PROVIDER IS STUBBED UNDERNEATH THE PROBE. `mockPayMongo.getCheckoutSession` replaces the HTTP
// call, NOT `probeCheckoutSession`. The REAL probe therefore runs — its id validation, its no-secret
// short-circuit and, the one that matters here, its "resolves `null` on ANY failure" guarantee, which the
// `unknown` case drives by making the provider REJECT rather than by handing the policy a hand-written
// `null`. Stubbing the probe would replace exactly the fail-closed behaviour this module's never-throw
// contract is built on with the test's own assumption.
//
// ⚠ `PAYMONGO_SECRET_KEY` is stubbed for this file. Without it the probe answers `null` with NO request at
// all (D-35's CI secret boundary) and every case below would read `"unknown"` — the suite would be
// measuring the short-circuit instead of the policy. `vi.unstubAllEnvs()` restores it in afterAll.
//
// NO DATABASE. This file touches none: the policy performs no read and no write of any `booking` row, and
// proving that here would only be proving it against a schema. `tests/payments/checkout-retire.test.ts`
// asserts the no-write claim the strong way — by reading the row back after a real sweep pass.

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { mockPayMongo } from "../helpers/mocks";

type PolicyModule = typeof import("@/lib/payments/retire-checkout");
let retireCheckoutForBooking: PolicyModule["retireCheckoutForBooking"];
let retireCheckoutsForBookings: PolicyModule["retireCheckoutsForBookings"];
let RETIRE_INLINE_LIMIT: PolicyModule["RETIRE_INLINE_LIMIT"];

/** See the header: without a secret the probe makes no request at all and every case reads `unknown`. */
const HARNESS_SECRET = "declared-by-this-harness-not-a-real-paymongo-credential";

type AuditCall = { actorId: string; action: string; outcome: string; meta?: Record<string, unknown> };

/** The operator-alert sink, mocked so a record is COUNTABLE — never merely absent. */
const recordAuditMock = vi.fn(async (_entry: AuditCall) => {});

/** Every audit record raised so far, as a captured array, so "exactly one" is a LENGTH. */
function auditRecords(): AuditCall[] {
  return recordAuditMock.mock.calls.map((c) => c[0]);
}

/** Every session id `expireCheckoutSession` was asked to retire, in call order. */
function expiredIds(): string[] {
  return mockPayMongo.expireCheckoutSession.mock.calls.map((c) => c[0] as string);
}

/** Every session id the PROVIDER was asked about, in call order. */
function probedIds(): string[] {
  return mockPayMongo.getCheckoutSession.mock.calls.map((c) => c[0] as string);
}

/** A provider session state, in `CheckoutSessionState`'s exact shape. */
function session(id: string, status: string, extra?: { paymentId?: string | null; paidAt?: Date | null }) {
  return {
    id,
    status,
    sourceType: status === "paid" ? "gcash" : null,
    paidAt: extra?.paidAt === undefined ? (status === "paid" ? new Date("2026-08-22T03:00:00Z") : null) : extra.paidAt,
    paymentId: extra?.paymentId === undefined ? (status === "paid" ? `pay_${id}` : null) : extra.paymentId,
  };
}

function rowFor(id: string, bookingStatus = "pending", checkoutSessionId: string | null = `cs_${id}`) {
  return { bookingId: id, checkoutSessionId, bookingStatus };
}

beforeAll(async () => {
  vi.stubEnv("PAYMONGO_SECRET_KEY", HARNESS_SECRET);
  vi.doMock("@/lib/paymongo", () => ({
    getCheckoutSession: mockPayMongo.getCheckoutSession,
    expireCheckoutSession: mockPayMongo.expireCheckoutSession,
  }));
  vi.doMock("@/lib/audit", () => ({ recordAudit: recordAuditMock }));
  vi.resetModules();
  ({ retireCheckoutForBooking, retireCheckoutsForBookings, RETIRE_INLINE_LIMIT } = await import(
    "@/lib/payments/retire-checkout"
  ));
});

beforeEach(() => {
  recordAuditMock.mockClear();
  recordAuditMock.mockResolvedValue(undefined);
  // `mockReset` + an explicit INERT default rather than `mockClear`: a case that installs a persistent
  // rejection must not leak it into the next case, and the default is the branch that changes nothing.
  mockPayMongo.getCheckoutSession.mockReset();
  mockPayMongo.getCheckoutSession.mockImplementation(async (id: string = "cs_default") =>
    session(id, "expired"),
  );
  mockPayMongo.expireCheckoutSession.mockReset();
  mockPayMongo.expireCheckoutSession.mockImplementation(async (id: string = "cs_default") => ({ id }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  vi.doUnmock("@/lib/paymongo");
  vi.doUnmock("@/lib/audit");
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// THE SIX OUTCOMES — each asserted by BOTH the returned outcome AND the provider call counts
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("retireCheckoutForBooking — the six outcomes", () => {
  it("(1) GUARD-THE-GUARD — an `active` session IS expired, exactly once, with ITS OWN id", async () => {
    // If this reads zero calls, every "did not expire" assertion in this file is vacuous — the stub would
    // simply never be reachable and an absence would prove nothing at all.
    mockPayMongo.getCheckoutSession.mockImplementation(async (id: string = "cs_x") => session(id, "active"));

    const outcome = await retireCheckoutForBooking(rowFor("bk_active"), "retire-sweep");

    expect(outcome).toBe("retired");
    expect(
      expiredIds(),
      "the expire stub was never reached for a still-payable session — every ZERO-call assertion below " +
        "this case would then pass vacuously and this file would be measuring nothing",
    ).toEqual(["cs_bk_active"]);
    expect(probedIds()).toEqual(["cs_bk_active"]);
  });

  it("(2) `no-session` — a NULL session id makes NO provider call of any kind", async () => {
    const outcome = await retireCheckoutForBooking(rowFor("bk_null", "pending", null), "retire-sweep");

    expect(outcome).toBe("no-session");
    // NULL is normal, not an error. Probing or posting for it would be a FABRICATED request.
    expect(probedIds()).toHaveLength(0);
    expect(expiredIds()).toHaveLength(0);
    expect(auditRecords()).toHaveLength(0);
  });

  it("(3) `unknown` — the provider REJECTED, so nothing is posted and nothing is audited", async () => {
    // Driven through the REAL probe's fail-closed guarantee: the underlying call rejects and
    // `probeCheckoutSession` resolves `null`. `null` means "we did not learn", never "not payable".
    mockPayMongo.getCheckoutSession.mockRejectedValue(new Error("connect ETIMEDOUT 52.74.0.1:443"));

    const outcome = await retireCheckoutForBooking(rowFor("bk_unknown"), "retire-sweep");

    expect(outcome).toBe("unknown");
    expect(probedIds()).toEqual(["cs_bk_unknown"]); // the provider WAS asked — this is not a short-circuit
    expect(expiredIds()).toHaveLength(0);
    expect(auditRecords()).toHaveLength(0);
  });

  it("(4) `already-retired` — an `expired` session costs ONE GET, zero POSTs and zero alerts", async () => {
    // The steady state after the first retire, and it must stay SILENT: an alert channel that fires on
    // non-events gets filtered to trash, and then the day it carries real stranded money nobody opens it.
    const outcome = await retireCheckoutForBooking(rowFor("bk_expired"), "retire-sweep");

    expect(outcome).toBe("already-retired");
    expect(probedIds()).toEqual(["cs_bk_expired"]);
    expect(expiredIds()).toHaveLength(0);
    expect(auditRecords()).toHaveLength(0);
  });

  it("(5) `retired` — one probe, one expire, and an `ok` audit that never enters the digest", async () => {
    mockPayMongo.getCheckoutSession.mockImplementation(async (id: string = "cs_x") => session(id, "active"));

    const outcome = await retireCheckoutForBooking(rowFor("bk_ret", "approved"), "request-expiry");

    expect(outcome).toBe("retired");
    expect(probedIds()).toHaveLength(1);
    expect(expiredIds()).toHaveLength(1);

    const records = auditRecords();
    expect(records).toHaveLength(1);
    expect(records[0].action).toBe("checkout_retired");
    // `ok`, NOT `needs_attention`: this is the system WORKING, and filing it in the operator's queue would
    // bury the rows that are not.
    expect(records[0].outcome).toBe("ok");
    expect(records[0].meta).toEqual({
      bookingId: "bk_ret",
      checkoutSessionId: "cs_bk_ret",
      trigger: "request-expiry",
      bookingStatus: "approved",
      probedStatus: "active",
    });
  });

  it("(6) `failed` — the expire REJECTED: one needs_attention row, and no throw", async () => {
    mockPayMongo.getCheckoutSession.mockImplementation(async (id: string = "cs_x") => session(id, "active"));
    mockPayMongo.expireCheckoutSession.mockRejectedValue(new Error("PayMongo 500 gateway"));

    const outcome = await retireCheckoutForBooking(rowFor("bk_fail"), "stale-hold-reclaim");

    expect(outcome).toBe("failed");
    expect(probedIds()).toHaveLength(1);
    expect(expiredIds()).toHaveLength(1); // the POST WAS attempted — the failure is real, not skipped

    const records = auditRecords();
    expect(records).toHaveLength(1);
    // The SAME action name the re-price path already writes (`src/app/actions/booking.ts`), so the
    // existing ops digest reaches it — no parallel alerting system (D-110).
    expect(records[0].action).toBe("checkout_expire_failed");
    expect(records[0].outcome).toBe("needs_attention");
    expect(records[0].actorId).toBe("system");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// THE EVIDENCE CASE — a `paid` session is NEVER SENT TO EXPIRE. A COUNT OF ZERO, not an unthrown error.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("retireCheckoutForBooking — a paid session is never expired", () => {
  beforeEach(() => {
    mockPayMongo.getCheckoutSession.mockImplementation(async (id: string = "cs_x") => session(id, "paid"));
  });

  it("(7) a `pending` row: ZERO expires, and ZERO audits — plan 02's queryUnconfirmedPaid owns it", async () => {
    const outcome = await retireCheckoutForBooking(rowFor("bk_paid_pending", "pending"), "retire-sweep");

    expect(outcome).toBe("paid-left-intact");
    expect(probedIds()).toEqual(["cs_bk_paid_pending"]); // the provider WAS asked
    expect(
      mockPayMongo.expireCheckoutSession.mock.calls.length,
      "a session PayMongo reports as PAID was sent to expire. The money is real and the session is the " +
        "only handle on it; the policy must never make this call at all. Case (1) proves this stub is " +
        "reachable, so a zero here is a real zero.",
    ).toBe(0);
    // Silent on purpose: `pending` is precisely and only what `queryUnconfirmedPaid` selects, so 13.1-02's
    // sweep will confirm AND alert this row. A second record here is one payment counted twice.
    expect(auditRecords()).toHaveLength(0);
  });

  it("(8) a `cancelled` row: ZERO expires, and exactly ONE needs_attention row carrying the pay_...", async () => {
    // The case NO reconciler reaches — `queryUnconfirmedPaid` does not select terminal rows — which is
    // exactly why this alert exists.
    const outcome = await retireCheckoutForBooking(
      rowFor("bk_paid_cancelled", "cancelled"),
      "stale-hold-reclaim",
    );

    expect(outcome).toBe("paid-left-intact");
    expect(mockPayMongo.expireCheckoutSession.mock.calls.length).toBe(0);

    const records = auditRecords();
    expect(records).toHaveLength(1);
    expect(records[0].action).toBe("checkout_paid_after_lapse");
    expect(records[0].outcome).toBe("needs_attention");
    expect(records[0].meta).toEqual({
      bookingId: "bk_paid_cancelled",
      checkoutSessionId: "cs_bk_paid_cancelled",
      trigger: "stale-hold-reclaim",
      bookingStatus: "cancelled",
      probedStatus: "paid",
      // The handle an operator acts on BY HAND. Without it the alert names a problem and no way to fix it.
      paymentId: "pay_cs_bk_paid_cancelled",
      paidAt: "2026-08-22T03:00:00.000Z",
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// THE NEVER-THROW CONTRACT — asserted three ways, each on its own, each with `.resolves`
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("retireCheckoutForBooking — it cannot throw", () => {
  // ⚠ 13.1-05 calls this policy from inside `createPendingHold`'s existing `try`, whose `catch` runs
  // `mapBookingError`, which RE-THROWS unknown errors. A policy that could throw would therefore turn a
  // PayMongo outage into a FAILED BOOKING. `.resolves` is used deliberately — a try/catch wrapper here
  // could pass by never running its assertion at all.

  it("(9a) the PROBE rejects — resolves `unknown`", async () => {
    mockPayMongo.getCheckoutSession.mockRejectedValue(new Error("socket hang up"));

    await expect(retireCheckoutForBooking(rowFor("bk_nt_a"), "retire-sweep")).resolves.toBe("unknown");
  });

  it("(9b) the EXPIRE rejects — resolves `failed`", async () => {
    mockPayMongo.getCheckoutSession.mockImplementation(async (id: string = "cs_x") => session(id, "active"));
    mockPayMongo.expireCheckoutSession.mockRejectedValue(new Error("PayMongo 503"));

    await expect(retireCheckoutForBooking(rowFor("bk_nt_b"), "retire-sweep")).resolves.toBe("failed");
  });

  it("(9c) recordAudit itself rejects — resolves `failed`, and the guarantee does not rest on its contract", async () => {
    // `recordAudit`'s own docblock says it cannot throw. This module deliberately does not RELY on that:
    // the structural outer `try` is what holds the contract, and this case is the proof.
    mockPayMongo.getCheckoutSession.mockImplementation(async (id: string = "cs_x") => session(id, "active"));
    recordAuditMock.mockRejectedValue(new Error("audit insert deadlock"));

    await expect(retireCheckoutForBooking(rowFor("bk_nt_c"), "retire-sweep")).resolves.toBe("failed");
    // The expire still happened — the session IS retired at the provider even though the trail failed.
    expect(expiredIds()).toEqual(["cs_bk_nt_c"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// D-72 — audit.meta is a STORED COLUMN rendered into an operator EMAIL
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("audit.meta carries ids and statuses, and nothing else", () => {
  // A rejection message deliberately stuffed with everything that must NOT reach the column: an email
  // address, an account identifier, an amount, and PayMongo-flavoured prose.
  const PROSE =
    "PayMongo refused: unprocessable_entity for merchant acct_9xQ7 — reach billing@paymongo.test about the 105000 centavo capture";
  const PROSE_TOKENS = [
    "PayMongo",
    "refused",
    "unprocessable_entity",
    "merchant",
    "acct_9xQ7",
    "billing@paymongo.test",
    "105000",
    "centavo",
    "capture",
  ];

  it("(10) no PayMongo prose, no `@`, no email/account/amount key survives into any meta", async () => {
    mockPayMongo.getCheckoutSession.mockImplementation(async (id: string = "cs_x") => session(id, "active"));
    mockPayMongo.expireCheckoutSession.mockRejectedValue(new Error(PROSE));

    const outcome = await retireCheckoutForBooking(rowFor("bk_meta", "approved"), "open-capacity-reclaim");
    expect(outcome).toBe("failed");

    const records = auditRecords();
    expect(records).toHaveLength(1); // the presence half — an empty list would make everything below vacuous
    const serialised = JSON.stringify(records[0].meta);

    expect(serialised, "an `@` in audit.meta is an email address in an emailed operator digest").not.toContain(
      "@",
    );
    for (const key of Object.keys(records[0].meta ?? {})) {
      expect(
        key,
        `audit.meta key "${key}" names an email, an account, a person or an amount — D-72 binds this column`,
      ).not.toMatch(/email|account|amount|name|phone|cents|total/i);
    }
    for (const token of PROSE_TOKENS) {
      expect(
        serialised,
        `PayMongo's own error prose ("${token}") reached audit.meta. The caught error must be discarded ` +
          `WHOLE — not chained, not cause-attached, not logged (T-05-15 / T-08-44)`,
      ).not.toContain(token);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// THE BATCH FORM — sequential, bounded, and null-session rows cost no budget
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("retireCheckoutsForBookings — bounded and sequential", () => {
  /**
   * Instrument the provider stub so CONCURRENCY is measurable, not merely inferred. Each call holds the
   * connection open across a real macrotask; a `Promise.all` implementation would therefore show three
   * simultaneous in-flight calls, while a sequential one can never exceed one.
   */
  function instrumentConcurrency() {
    const state = { inFlight: 0, max: 0 };
    mockPayMongo.getCheckoutSession.mockImplementation(async (id: string = "cs_x") => {
      state.inFlight += 1;
      state.max = Math.max(state.max, state.inFlight);
      await new Promise((r) => setTimeout(r, 5));
      state.inFlight -= 1;
      return session(id, "active");
    });
    return state;
  }

  it("(11) five rows at the default limit spend exactly RETIRE_INLINE_LIMIT provider round trips", async () => {
    const state = instrumentConcurrency();
    const rows = ["a", "b", "c", "d", "e"].map((s) => rowFor(`bk_${s}`));

    const outcomes = await retireCheckoutsForBookings(rows, "stale-hold-reclaim");

    expect(RETIRE_INLINE_LIMIT).toBe(3);
    expect(probedIds()).toEqual(["cs_bk_a", "cs_bk_b", "cs_bk_c"]);
    expect(expiredIds()).toEqual(["cs_bk_a", "cs_bk_b", "cs_bk_c"]);
    expect(outcomes).toEqual(["retired", "retired", "retired"]);
    // THE SEQUENTIALITY ASSERTION, and it is not a call count: a booker's own request path must never open
    // three concurrent provider connections for other people's abandoned checkouts.
    expect(
      state.max,
      `${state.max} provider calls were in flight at once — the batch is running concurrently ` +
        `(Promise.all or equivalent), which is exactly what the sequential contract forbids`,
    ).toBe(1);
  });

  it("(12) null-session rows are visited but consume NO budget", async () => {
    const state = instrumentConcurrency();
    const rows = [
      rowFor("bk_n1", "pending", null),
      rowFor("bk_p1"),
      rowFor("bk_n2", "pending", null),
      rowFor("bk_p2"),
      rowFor("bk_n3", "pending", null),
      rowFor("bk_p3"),
      rowFor("bk_p4"),
    ];

    const outcomes = await retireCheckoutsForBookings(rows, "open-capacity-reclaim");

    // Three real retires still happen despite three null rows interleaved ahead of and among them — if
    // NULLs consumed budget, `bk_p3` would never have been reached.
    expect(probedIds()).toEqual(["cs_bk_p1", "cs_bk_p2", "cs_bk_p3"]);
    expect(outcomes).toEqual([
      "no-session",
      "retired",
      "no-session",
      "retired",
      "no-session",
      "retired",
      // bk_p4 is past the budget and is NOT reported — an unvisited row is not a `no-session` row.
    ]);
    expect(state.max).toBe(1);
  });

  it("(13) an explicit limit overrides the default, and the batch inherits the never-throw contract", async () => {
    mockPayMongo.getCheckoutSession.mockImplementation(async (id: string = "cs_x") => session(id, "active"));
    mockPayMongo.expireCheckoutSession.mockRejectedValue(new Error("PayMongo 500"));
    const rows = ["a", "b", "c", "d"].map((s) => rowFor(`bk_l${s}`));

    await expect(
      retireCheckoutsForBookings(rows, "retire-sweep", { limit: 2 }),
    ).resolves.toEqual(["failed", "failed"]);
    expect(probedIds()).toHaveLength(2);
  });
});
