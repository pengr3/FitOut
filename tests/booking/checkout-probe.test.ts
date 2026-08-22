// D-84 / D-85 — the booker-facing checkout probe: bounded, silent on failure, and the four-way reading.
//
// WHY THIS WRAPPER EXISTS AT ALL. There is NO row-level signal separating a reversed booking from a
// swept unpaid hold: both land `status='cancelled'`, `cancelled_by=NULL`, `payment_id=NULL`, and both may
// carry a non-null `checkout_session_id` (13-RESEARCH Example 3, measured against
// `src/lib/availability/units.ts:484-490`). `booking.payment_method` is NULL on every reversed row by
// construction. So the rail, the paid-at instant and the reversed/swept distinction are all recoverable
// ONLY from the provider — and the surface that needs them is a page whose entire job is to explain a
// payment failure. A third-party call on that render path must never be able to make the page worse.
//
// THE PROPERTY UNDER TEST IS AN ABSENCE, so it is proved directly rather than asserted: the harness hands
// the wrapper a `fetch` that REJECTS, and the assertion is that the returned promise RESOLVES. An absence
// assertion that has never been watched failing is indistinguishable from a query that matches nothing —
// so the try/catch was removed and case (3) was watched going red before this file was committed (the
// verbatim output is in 13-03-SUMMARY.md).
//
// Harness: the GLOBAL `fetch` is stubbed and the REAL probe + REAL `@/lib/paymongo` client are imported,
// the `tests/payments/paymongo-calls.test.ts` idiom. The secret this file runs under is DECLARED by the
// harness (HARNESS_SECRET below), never inherited from the ambient environment. No REAL key is needed —
// which is the whole point of the wrapper existing (D-35's CI secret boundary: a spec that needs a real
// `sk_test_` has left that boundary and must be split).
//
// ⚠ THAT LINE USED TO READ "nothing here needs a PayMongo secret", and it was wrong in a way no local run
// could show. The probe reads `process.env.PAYMONGO_SECRET_KEY` through its own no-request short-circuit,
// so this file DID depend on the variable — it just always found one, because `tests/setup.ts` loads
// `.env.local` on this machine. In CI, where the key is absent BY DESIGN, cases (1) and (7) failed and
// (3), (4) and (5) passed for the wrong reason. 13-17-SUMMARY.md records the verbatim red.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  probeCheckoutSession,
  readPaymentState,
  CHECKOUT_PROBE_TIMEOUT_MS,
  type PaymentStateReading,
} from "@/lib/payments/checkout-probe";

/** A 200 Response carrying a JSON body (paymongoFetch does res.text() → JSON.parse). */
function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

/** A GET /v1/checkout_sessions/<id> body in PayMongo's documented shape. */
function sessionBody(id: string, attributes: Record<string, unknown>): Response {
  return jsonResponse({ data: { id, attributes } });
}

/**
 * The PayMongo credential this file runs under — DECLARED here, never inherited.
 *
 * WHY THIS CONSTANT EXISTS. `probeCheckoutSession` answers `null` WITH NO REQUEST when no secret is
 * configured (checkout-probe.ts:73-75). That short-circuit is correct, deliberate and load-bearing for
 * D-35's boundary — but it is also an AMBIENT INPUT to every case below, and on a developer machine it
 * is invisible, because `tests/setup.ts` loads `.env.local` and hands the suite a real key. So each case
 * that mocks `fetch` was taking one of two different branches depending on whose machine ran it: the
 * fetch path here, the short-circuit in CI. Stubbing the variable removes the input entirely, and the
 * same branch then runs everywhere.
 *
 * Case (6) — the one case whose SUBJECT is the short-circuit — overrides this back to empty. That is now
 * a deliberate distinction it asserts rather than the ambient default it silently agreed with.
 *
 * The value is deliberately NOT shaped like a PayMongo key. The only thing that reads it is `authHeader()`
 * (paymongo.ts:58-61), which base64s it into a Basic credential that the mocked `fetch` never inspects —
 * so a realistic `sk_test_…` literal would buy no fidelity and would plant a secret-shaped string in the
 * repo for a scanner to trip over. D-35 is untouched: no real key is needed, and none is added to CI.
 */
const HARNESS_SECRET = "declared-by-this-harness-not-a-real-paymongo-credential";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  // `vi.unstubAllEnvs()` in afterEach restores whatever the environment actually had (a real key here,
  // nothing in CI), so no other spec in the worker sees this value.
  vi.stubEnv("PAYMONGO_SECRET_KEY", HARNESS_SECRET);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("probeCheckoutSession — the D-84 booker-facing probe", () => {
  it("(1) returns the widened session state on success — the rail and the paid-at instant", async () => {
    fetchMock.mockResolvedValue(
      sessionBody("cs_ok", {
        status: "paid",
        paid_at: 1_755_600_000,
        payments: [{ id: "pay_1", attributes: { source: { type: "qrph" }, status: "paid" } }],
      }),
    );

    const state = await probeCheckoutSession("cs_ok");

    expect(state).not.toBeNull();
    expect(state!.status).toBe("paid");
    expect(state!.sourceType).toBe("qrph");
    expect(state!.paidAt?.getTime()).toBe(1_755_600_000_000);
  });

  it("(2) returns null for a null id and makes NO request at all", async () => {
    const state = await probeCheckoutSession(null);

    expect(state).toBeNull();
    // The assertion that matters: a booking with no session id must not cost a round trip on render.
    expect(fetchMock.mock.calls).toHaveLength(0);
  });

  it("(3) NEVER RAISES: a rejecting fetch underneath RESOLVES to null", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNRESET talking to the provider"));

    // `resolves` is the whole assertion. If the wrapper let the error out, this line reports a rejection.
    await expect(probeCheckoutSession("cs_boom")).resolves.toBeNull();
    // …and it resolved to null because the rejection was ABSORBED, not because nothing was ever asked.
    // `null` is also what the no-secret short-circuit returns, so without this line the case is satisfied
    // by an absent request — which is exactly how it stayed green in CI while (1) and (7) went red.
    expect(fetchMock.mock.calls).toHaveLength(1);
  });

  it("(4) a NON-2xx from the provider also resolves to null, and its prose does not escape", async () => {
    // paymongoFetch raises a descriptive Error carrying PayMongo's own `errors[0].detail`. That prose must
    // not reach a booker response or an audit row (T-13-03-PROBELEAK), so the wrapper discards it whole.
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ errors: [{ detail: "No such checkout session cs_gone" }] }),
        { status: 404 },
      ),
    );

    await expect(probeCheckoutSession("cs_gone")).resolves.toBeNull();
    // The 404 was reached and discarded — not skipped. See case (3)'s note on why this line is required.
    expect(fetchMock.mock.calls).toHaveLength(1);
  });

  it("(5) an UNRECOGNISED response shape resolves to null rather than a half-built state", async () => {
    // Two shapes: no `data` at all (the client dereferences it and the wrapper absorbs that), and a `data`
    // with no id (which parses fine and would otherwise yield a state whose id is undefined).
    for (const body of [{}, { data: { attributes: { status: "paid" } } }]) {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(jsonResponse(body));
      await expect(probeCheckoutSession("cs_weird")).resolves.toBeNull();
      // The body was fetched and rejected as unrecognised — see case (3)'s note.
      expect(fetchMock.mock.calls).toHaveLength(1);
    }
  });

  it("(6) returns null WITHOUT a request when no PayMongo secret is configured", async () => {
    // D-35: the probe must be callable from a spec that has no `sk_test_`. With no key, paymongoFetch
    // would send an empty Basic credential and collect a 401 — a pointless round trip on a render path.
    //
    // This OVERRIDES the harness default set in beforeEach, and the override is the point: emptiness is
    // now a condition this case creates and asserts against, rather than the ambient state of whichever
    // machine happened to run it. In CI it used to be indistinguishable from every other case here.
    vi.stubEnv("PAYMONGO_SECRET_KEY", "");

    await expect(probeCheckoutSession("cs_nokey")).resolves.toBeNull();
    expect(fetchMock.mock.calls).toHaveLength(0);
  });

  it("(7) applies a DECLARED deadline — an AbortSignal reaches fetch, and a hung provider yields null", async () => {
    // Both halves matter. The signal proves the constant is actually threaded (a call site cannot choose
    // its own); the resolution proves the deadline FIRES and is absorbed rather than surfacing.
    expect(CHECKOUT_PROBE_TIMEOUT_MS).toBeGreaterThan(0);

    fetchMock.mockImplementation(
      (_url: string, init: RequestInit = {}) =>
        new Promise((_resolve, reject) => {
          const signal = init.signal;
          if (!signal) return; // hang forever — the test times out and names this line
          signal.addEventListener("abort", () => reject(signal.reason));
        }),
    );

    const started = Date.now();
    await expect(probeCheckoutSession("cs_hung")).resolves.toBeNull();
    const elapsed = Date.now() - started;

    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].signal).toBeInstanceOf(AbortSignal);
    // The deadline is REAL, not a value nobody reads: the call ended near it, not immediately and not never.
    expect(elapsed).toBeGreaterThanOrEqual(CHECKOUT_PROBE_TIMEOUT_MS - 250);
    expect(elapsed).toBeLessThan(CHECKOUT_PROBE_TIMEOUT_MS + 5_000);
  }, 30_000);
});

describe("readPaymentState — 13-RESEARCH Example 3's table, in one place", () => {
  /**
   * Build just enough of a session state for the reading.
   *
   * `paymentId` is null here on purpose: 13.1-01 widened `CheckoutSessionState` with the captured
   * `pay_...` so a probe-driven confirm can persist it, but `readPaymentState` discriminates on the
   * BOOKING status + the SESSION status alone. Setting it would suggest the reading consults it.
   */
  function session(status: string) {
    return { id: "cs_1", status, sourceType: null, paidAt: null, paymentId: null };
  }

  const table: Array<[string, string, PaymentStateReading]> = [
    ["pending", "active", "not-completed"],
    ["pending", "expired", "hold-expired"],
    ["cancelled", "paid", "reversed"],
    ["cancelled", "expired", "unpaid-hold-swept"],
  ];

  for (const [bookingStatus, sessionStatus, expected] of table) {
    it(`(${bookingStatus} + ${sessionStatus}) reads as ${expected}`, () => {
      expect(readPaymentState(bookingStatus, session(sessionStatus))).toBe(expected);
    });
  }

  it("reads INDETERMINATE when the probe fell back — the surface must use rail-free copy, not guess", () => {
    for (const bookingStatus of ["pending", "cancelled", "confirmed"]) {
      expect(readPaymentState(bookingStatus, null)).toBe("indeterminate");
    }
  });

  it("reads INDETERMINATE for any pair the table does not name — enum drift fails open to honest copy", () => {
    // Deliberately NOT an enumerated reject-list (the `expireCheckoutSession` fall-through rule): a status
    // PayMongo adds later must land here, not be silently absorbed into one of the four readings.
    expect(readPaymentState("cancelled", session("active"))).toBe("indeterminate");
    expect(readPaymentState("pending", session("paid"))).toBe("indeterminate");
    expect(readPaymentState("confirmed", session("paid"))).toBe("indeterminate");
    expect(readPaymentState("cancelled", session("voided"))).toBe("indeterminate");
    expect(readPaymentState("cancelled", session(""))).toBe("indeterminate");
  });
});
