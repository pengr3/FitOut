// PAY-01 / PAY-03 / D-60 — the four PayMongo money-movement calls (src/lib/paymongo.ts).
//
// This suite mocks the GLOBAL `fetch` (NOT the paymongo module) and imports the REAL client, so it
// proves the actual wire behavior the whole payments phase rests on:
//   - /v1 vs /v2 base routing is correct — a /v2 call hits `https://api.paymongo.com/v2/...`, NEVER
//     the Pitfall-3 `/v1/v2/...` (T-05-06).
//   - Every POST carries a stable, per-call Idempotency-Key (T-05-07): `payout:<bookingId>` /
//     `refund:<paymentId>` / the caller-supplied checkout key.
//   - The hosted checkout body offers the full PH rail set (D-53) and charges the EXACT passed amount.
//   - The inhouse transfer sends `provider:"paymongo"` and `amount === netCents` verbatim (D-52,
//     T-05-10) — never reduced by a gateway fee.
//
// We assert against `fetch.mock.calls` (URL, method, headers, parsed body) and restore fetch after.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createCheckoutSession,
  expireCheckoutSession,
  getCheckoutSession,
  createBatchTransfer,
  createRefund,
  listReceivingInstitutions,
  listWalletAccounts,
} from "@/lib/paymongo";

/** Build a 200 Response with a JSON body (paymongoFetch does res.text() → JSON.parse). */
function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

/** A non-2xx Response carrying PayMongo's error envelope, exactly as paymongoFetch parses it. */
function errorResponse(status: number, detail: string): Response {
  return new Response(JSON.stringify({ errors: [{ detail }] }), { status });
}

/**
 * Install a fetch stub that BRANCHES on the request — the expire POST and the LW-01 re-probe GET now
 * share one global `fetch`.
 *
 * ⚠️ `mockResolvedValue` is no longer a valid strategy for ANY case that reaches the probe: it hands the
 * SAME Response instance to both calls, and a Response body can be read only once, so the probe's own
 * `res.text()` would throw and the test would "pass" because the probe FAILED — not because the rule
 * under test held. Every branch below returns a FRESH Response per call.
 *
 *   `expire` — a thunk producing the Response the POST /v1/checkout_sessions/<id>/expire returns
 *   `probe`  — the status the GET /v1/checkout_sessions/<id> reports, or an Error to REJECT the probe
 *              with. The empty string means the provider omitted `status` altogether, which
 *              getCheckoutSession substitutes to "" (src/lib/paymongo.ts:293) — so we omit the field.
 */
function stubExpireAndProbe(
  mock: ReturnType<typeof vi.fn>,
  opts: { expire: () => Response; probe: string | Error },
): void {
  mock.mockImplementation(async (url: string, init: RequestInit = {}) => {
    if (url.endsWith("/expire") && (init.method ?? "GET") === "POST") {
      return opts.expire();
    }
    // Otherwise this is the re-probe: GET /v1/checkout_sessions/<id>.
    if (opts.probe instanceof Error) throw opts.probe;
    const id = url.slice(url.lastIndexOf("/") + 1);
    const attributes = opts.probe === "" ? {} : { status: opts.probe };
    return jsonResponse({ data: { id, attributes } });
  });
}

/** The Nth fetch call recorded on the stub: [url, init]. `rawBody` is the UNPARSED init.body, so a
 *  test can distinguish "no body was sent at all" (undefined) from "an empty JSON body was sent". */
function callAt(
  fetchMock: ReturnType<typeof vi.fn>,
  index: number,
): {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  rawBody: BodyInit | null | undefined;
} {
  const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit];
  return {
    url,
    method: (init.method ?? "GET") as string,
    headers: init.headers as Record<string, string>,
    body: init.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : {},
    rawBody: init.body,
  };
}

/** The single fetch call recorded on the stub: [url, init]. */
function lastCall(fetchMock: ReturnType<typeof vi.fn>): ReturnType<typeof callAt> {
  return callAt(fetchMock, 0);
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createCheckoutSession — hosted charge (/v1, D-53/54)", () => {
  it("POSTs to /v1/checkout_sessions with the full PH rail set, exact amount, and an Idempotency-Key", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { id: "cs_x", attributes: { checkout_url: "https://checkout.test/cs_x" } } }),
    );

    const result = await createCheckoutSession({
      amountCents: 150000,
      name: "FitOut booking",
      referenceNumber: "FIT-ABC12345",
      successUrl: "https://fitout.test/ok",
      cancelUrl: "https://fitout.test/cancel",
      idempotencyKey: "checkout:bk_1",
    });
    expect(result).toEqual({ id: "cs_x", checkoutUrl: "https://checkout.test/cs_x" });

    const call = lastCall(fetchMock);
    expect(call.url).toBe("https://api.paymongo.com/v1/checkout_sessions");
    expect(call.method).toBe("POST");
    expect(call.headers["Idempotency-Key"]).toBe("checkout:bk_1");

    const attributes = (call.body as { data: { attributes: Record<string, unknown> } }).data.attributes;
    expect(attributes.payment_method_types).toEqual(["card", "gcash", "paymaya", "qrph"]);
    expect((attributes.line_items as Array<{ amount: number }>)[0].amount).toBe(150000);
    expect(attributes.reference_number).toBe("FIT-ABC12345");
  });
});

// CR-02 (08-12): a re-priced hold mints a SECOND payable session under D-108's amount-scoped key, and
// nothing could retire the first. These cases pin the retire call itself — the URL (which session gets
// expired), the key (whether a retry is a no-op), and that a failure is THROWN rather than swallowed.
describe("expireCheckoutSession — retire a superseded session (/v1, CR-02)", () => {
  it("POSTs to /v1/checkout_sessions/<id>/expire with Basic auth and a session-scoped Idempotency-Key", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "cs_abc", attributes: { status: "expired" } } }));

    const result = await expireCheckoutSession("cs_abc");
    expect(result).toEqual({ id: "cs_abc" });

    const call = lastCall(fetchMock);
    // Full path, not a substring match on `expire` — the SESSION ID in the path is the whole point:
    // expiring the wrong session leaves the payable one live and kills the one the booker is looking at.
    expect(call.url).toBe("https://api.paymongo.com/v1/checkout_sessions/cs_abc/expire");
    expect(call.method).toBe("POST");
    expect(call.headers["Idempotency-Key"]).toBe("checkout-expire:cs_abc");
    expect(call.headers.Authorization).toMatch(/^Basic /);
  });

  it("sends NO request body (the endpoint takes none)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "cs_abc", attributes: { status: "expired" } } }));

    await expireCheckoutSession("cs_abc");

    expect(lastCall(fetchMock).rawBody).toBeUndefined();
  });

  // NT-01 (corrected 2026-08-10, quick task 260810-i0v). The old title claimed "so a duplicate expire is
  // a no-op", which is FALSE at the wire level: 08-19 probed the live API and a repeat expire returns
  // HTTP 400, not a replayed 200 — PayMongo does not honor the Idempotency-Key on this endpoint. What
  // this case actually pins is that the duplicate is SENT identically. The 200-vs-400 behaviour, and the
  // wrapper's postcondition-verified tolerance of it, are proven in the LW-01 describe block below and
  // live against the real API in tests/paymongo/checkout-idempotency-real.test.ts (case 4).
  it("uses the IDENTICAL Idempotency-Key on a retry of the same session — the duplicate expire is SENT identically", async () => {
    // A FRESH Response per call — a Response body can only be read once, and paymongoFetch reads it.
    fetchMock.mockImplementation(async () =>
      jsonResponse({ data: { id: "cs_abc", attributes: { status: "expired" } } }),
    );

    await expireCheckoutSession("cs_abc");
    await expireCheckoutSession("cs_abc");

    expect(fetchMock.mock.calls).toHaveLength(2);
    expect(callAt(fetchMock, 0).headers["Idempotency-Key"]).toBe("checkout-expire:cs_abc");
    expect(callAt(fetchMock, 1).headers["Idempotency-Key"]).toBe("checkout-expire:cs_abc");
    expect(callAt(fetchMock, 1).headers["Idempotency-Key"]).toBe(
      callAt(fetchMock, 0).headers["Idempotency-Key"],
    );
  });

  it("scopes the key to the SESSION, not the booking — two sessions of one booking expire independently", async () => {
    // A booking legitimately has more than one session over its life (that is what a re-price creates).
    // A booking-scoped key would make the SECOND expire replay the FIRST response and silently leave a
    // live session payable — the createRefund trap, restated here. Different id ⇒ different key.
    // A FRESH Response per call (see the retry case above).
    fetchMock.mockImplementation(async () =>
      jsonResponse({ data: { id: "cs_two", attributes: { status: "expired" } } }),
    );

    await expireCheckoutSession("cs_one");
    await expireCheckoutSession("cs_two");

    expect(callAt(fetchMock, 0).headers["Idempotency-Key"]).toBe("checkout-expire:cs_one");
    expect(callAt(fetchMock, 1).headers["Idempotency-Key"]).toBe("checkout-expire:cs_two");
    expect(callAt(fetchMock, 1).headers["Idempotency-Key"]).not.toBe(
      callAt(fetchMock, 0).headers["Idempotency-Key"],
    );
  });

  it("THROWS the module's descriptive error on a non-2xx — a failed expire is never swallowed", async () => {
    // Made DELIBERATE 2026-08-10 (LW-01). This case used to pass for an accidental reason: under
    // `mockResolvedValue` the re-probe got the SAME already-consumed Response, its body read threw, and
    // the ORIGINAL error surfaced. It now uses the branching stub with the provider explicitly reporting
    // `paid`, so it is the second, independent pin on the `paid` rule at this older call site.
    stubExpireAndProbe(fetchMock, {
      expire: () => errorResponse(400, "Checkout session is already paid."),
      probe: "paid",
    });

    // The caller (08-13) refuses the re-price on a throw; swallowing here would let a re-price proceed
    // with two payable sessions and no signal.
    await expect(expireCheckoutSession("cs_abc")).rejects.toThrow(
      "PayMongo POST /v1/checkout_sessions/cs_abc/expire failed (400): Checkout session is already paid.",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// LW-01 — POSTCONDITION-VERIFIED IDEMPOTENT EXPIRE (rewritten 2026-08-10 by quick task 260810-i0v).
//
// 08-19 case 4 probed the REAL API: a repeat expire of a previously-expired session returns HTTP 400,
// NOT the 200-replay the session-scoped Idempotency-Key was once believed to give. 08-21 made
// expireCheckoutSession tolerate that 400 — but it did so by STRING-MATCHING PayMongo's prose
// (`/\(400\)/` AND `/already\b.*\bexpired/i`). That is inferring a money-path fact from a third party's
// sentence: a reword, a localization, or a status-code change silently stops matching, the tolerance
// reverts to genuine-failure behaviour, and the T-08-84 recovery livelock re-opens with no detector.
//
// The tolerance is now VERIFIED FROM THE PROVIDER: on ANY error the wrapper does exactly ONE
// getCheckoutSession(id) re-probe and resolves only if the provider itself reports `status === "expired"`.
// `active` (still payable), `paid` (money captured on a session we were retiring), any unknown or empty
// status, and a probe that itself fails ALL rethrow the ORIGINAL expire error — so both callers'
// fail-closed double-charge guard is fully preserved.
//
// ══ MUTATION-VERIFY ═══════════════════════════════════════════════════════════════════════════════════
// Five mutations of src/lib/paymongo.ts (never of this file), each run with
// `npx vitest run tests/payments/paymongo-calls.test.ts`, each observed RED, each restored with
// `git checkout -- src/lib/paymongo.ts` before the next. Every fail-closed rule has its OWN dedicated
// case AND its OWN dedicated mutant — no rule borrows another's RED.
//
// ── M1 · tolerate-on-`active` ─────────────────────────────────────────────────────────────────────────
// EDIT: `if (probed.status === "expired") {` → `if (probed.status !== "paid") {`
// TARGET: case (3). OBSERVED RED (case 3 + case 8 collaterally — `!== "paid"` also tolerates unknowns):
//
//   ❯ tests/payments/paymongo-calls.test.ts (17 tests | 2 failed) 63ms
//        × (3) THROWS when the provider still reports the session `active` — it is STILL PAYABLE 10ms
//        × (8) THROWS on an UNKNOWN or EMPTY provider status — enum drift fails closed exactly like wording drift 4ms
//
//   FAIL … > (3) THROWS when the provider still reports the session `active` — it is STILL PAYABLE
//   AssertionError: promise resolved "{ id: 'cs_live' }" instead of rejecting
//
//   - Expected
//   + Received
//
//   - Error {
//   -   "message": "rejected promise",
//   + {
//   +   "id": "cs_live",
//     }
//
//    ❯ tests/payments/paymongo-calls.test.ts:290:50
//       Tests  2 failed | 15 passed (17)
//
// ── M2 · tolerate-on-`paid` ───────────────────────────────────────────────────────────────────────────
// EDIT: `if (probed.status === "expired") {` → `if (probed.status !== "active") {`
// TARGET: case (4). OBSERVED RED — case 4, the older `paid` pin in the CR-02 block (which is exactly what
// making that case deliberate bought us), and case 8 collaterally:
//
//   ❯ tests/payments/paymongo-calls.test.ts (17 tests | 3 failed) 97ms
//        × THROWS the module's descriptive error on a non-2xx — a failed expire is never swallowed 18ms
//        × (4) THROWS when the provider reports the session `paid` — captured on a superseded session 3ms
//        × (8) THROWS on an UNKNOWN or EMPTY provider status — enum drift fails closed exactly like wording drift 2ms
//
//   FAIL … > (4) THROWS when the provider reports the session `paid` — captured on a superseded session
//   AssertionError: promise resolved "{ id: 'cs_captured' }" instead of rejecting
//
//   - Expected
//   + Received
//
//   - Error {
//   -   "message": "rejected promise",
//   + {
//   +   "id": "cs_captured",
//     }
//
//    ❯ tests/payments/paymongo-calls.test.ts:306:54
//       Tests  3 failed | 14 passed (17)
//
// ── M3 · tolerate-on-unknown-status (the ENUMERATED REJECT-LIST) ──────────────────────────────────────
// EDIT: `if (probed.status === "expired") {`
//     → `if (probed.status !== "active" && probed.status !== "paid") {`
// TARGET: case (8), AND ONLY case (8). ⚠️ THE SPLIT IS THE MEASUREMENT — cases 3 and 4 stayed GREEN,
// because an enumerated reject-list still handles every status it NAMES and silently tolerates every
// status it does not. This mutant is precisely the staleness bug the single `expired`-only allow with a
// fall-through `throw` exists to prevent, and it is why the implementation must never enumerate rejects.
// OBSERVED RED (exactly one failure):
//
//   ❯ tests/payments/paymongo-calls.test.ts (17 tests | 1 failed) 77ms
//        × (8) THROWS on an UNKNOWN or EMPTY provider status — enum drift fails closed exactly like wording drift 13ms
//
//   FAIL … > (8) THROWS on an UNKNOWN or EMPTY provider status — enum drift fails closed exactly like wording drift
//   AssertionError: promise resolved "{ id: 'cs_drift' }" instead of rejecting
//
//   - Expected
//   + Received
//
//   - Error {
//   -   "message": "rejected promise",
//   + {
//   +   "id": "cs_drift",
//     }
//
//    ❯ tests/payments/paymongo-calls.test.ts:379:53
//       Tests  1 failed | 16 passed (17)
//
// ── M4 · tolerate-on-probe-failure ────────────────────────────────────────────────────────────────────
// EDIT: in the probe's own catch, `throw err;` → `return { id };`
// TARGET: case (6). OBSERVED RED (exactly one failure):
//
//   ❯ tests/payments/paymongo-calls.test.ts (17 tests | 1 failed) 72ms
//        × (6) THROWS the ORIGINAL expire error — never the probe's — when the re-probe itself fails 10ms
//
//   FAIL … > (6) THROWS the ORIGINAL expire error — never the probe's — when the re-probe itself fails
//   AssertionError: expected 'expireCheckoutSession resolved — a se…' to contain 'failed (400)'
//
//   Expected: "failed (400)"
//   Received: "expireCheckoutSession resolved — a session of UNKNOWN status must never be tolerated"
//
//    ❯ tests/payments/paymongo-calls.test.ts:342:21
//       Tests  1 failed | 16 passed (17)
//
// ── M5 · the whole point: revert to the ORIGINAL string-match ─────────────────────────────────────────
// EDIT: replaced the probe block with the pre-change implementation verbatim —
//       `const msg = err instanceof Error ? err.message : String(err);`
//       `if (/\(400\)/.test(msg) && /already\b.*\bexpired/i.test(msg)) { return { id }; }` + `throw err;`
// TARGET: case (2). OBSERVED RED — 7 cases, and the SPREAD is itself the finding:
//
//   ❯ tests/payments/paymongo-calls.test.ts (17 tests | 7 failed) 82ms
//        × (1) RESOLVES on a repeat-expire 400 when the provider reports the session `expired` 13ms
//        × (2) RESOLVES on the SAME 400 carrying COMPLETELY DIFFERENT prose — the tolerance is wording-independent 3ms
//        × (3) THROWS when the provider still reports the session `active` — it is STILL PAYABLE 4ms
//        × (4) THROWS when the provider reports the session `paid` — captured on a superseded session 3ms
//        × (5) RESOLVES on a 500 when the provider reports `expired` — the tolerance is not status-code-scoped either 1ms
//        × (6) THROWS the ORIGINAL expire error — never the probe's — when the re-probe itself fails 4ms
//        × (8) THROWS on an UNKNOWN or EMPTY provider status — enum drift fails closed exactly like wording drift 1ms
//
//   FAIL … > (2) RESOLVES on the SAME 400 carrying COMPLETELY DIFFERENT prose — the tolerance is wording-independent
//   AssertionError: promise rejected "Error: PayMongo POST /v1/checkout_session…" instead of resolving
//    ❯ tests/payments/paymongo-calls.test.ts:278:54
//
//   Caused by: Error: PayMongo POST /v1/checkout_sessions/cs_reworded/expire failed (400): This checkout
//   session has already lapsed and can no longer be paid
//    ❯ paymongoFetch src/lib/paymongo.ts:98:11
//    ❯ expireCheckoutSession src/lib/paymongo.ts:273:18
//       Tests  7 failed | 10 passed (17)
//
//   ⚠️ READ CASES 3 AND 4 IN THAT LIST. Under the restored string-match they fail by RESOLVING
//   ("promise resolved \"{ id: 'cs_live' }\" instead of rejecting"). The old implementation keyed ONLY on
//   the error sentence, so a still-`active` session — and, far worse, a `paid` one — was tolerated as a
//   clean expire whenever PayMongo's 400 happened to read "already expired". Cases 1 and 5 fail on the
//   probe-count assertion, confirming the restored branch is genuinely reached and no probe is issued.
//
// AFTERWARDS: `git checkout -- src/lib/paymongo.ts` → `git diff --exit-code -- src/` exits 0, and this
// file is back to 17 passed.
// ══════════════════════════════════════════════════════════════════════════════════════════════════════
describe("expireCheckoutSession — postcondition-verified idempotent expire (LW-01 / 08-21 / 08-19 case 4)", () => {
  /** The re-probe actually happened: 2 calls, the second a bare GET on THIS session (no Idempotency-Key). */
  function expectProbed(mock: ReturnType<typeof vi.fn>, id: string): void {
    expect(mock.mock.calls).toHaveLength(2);
    const probe = callAt(mock, 1);
    expect(probe.url).toBe(`https://api.paymongo.com/v1/checkout_sessions/${id}`);
    expect(probe.method).toBe("GET");
    expect(probe.headers["Idempotency-Key"]).toBeUndefined();
  }

  it("(1) RESOLVES on a repeat-expire 400 when the provider reports the session `expired`", async () => {
    stubExpireAndProbe(fetchMock, {
      expire: () => errorResponse(400, "Checkout session is already expired"),
      probe: "expired",
    });

    // The tolerate path parses no 200 body, so the id is echoed from the argument.
    await expect(expireCheckoutSession("cs_x")).resolves.toEqual({ id: "cs_x" });

    // The request shape is unchanged — still a POST to THIS session's /expire path.
    const call = lastCall(fetchMock);
    expect(call.url).toBe("https://api.paymongo.com/v1/checkout_sessions/cs_x/expire");
    expect(call.method).toBe("POST");
    expectProbed(fetchMock, "cs_x");
  });

  it("(2) RESOLVES on the SAME 400 carrying COMPLETELY DIFFERENT prose — the tolerance is wording-independent", async () => {
    // ⚠️ THIS IS THE WHOLE POINT OF LW-01. The detail below is one the OLD implementation provably could
    // not match: it contains "already" but never "expired", so `/already\b.*\bexpired/i` fails and the
    // pre-change wrapper would have THROWN — re-opening the T-08-84 recovery livelock on nothing more
    // than a PayMongo copy edit. That claim is not left as prose: mutation M5 in the header above
    // restores the original string-match implementation and records this case going RED.
    stubExpireAndProbe(fetchMock, {
      expire: () => errorResponse(400, "This checkout session has already lapsed and can no longer be paid"),
      probe: "expired",
    });

    await expect(expireCheckoutSession("cs_reworded")).resolves.toEqual({ id: "cs_reworded" });
    expectProbed(fetchMock, "cs_reworded");
  });

  it("(3) THROWS when the provider still reports the session `active` — it is STILL PAYABLE", async () => {
    // The double-charge case the callers' fail-closed refusal exists for. Whatever the 400 said, the
    // provider says this session can still take money, so expire's postcondition does NOT hold.
    stubExpireAndProbe(fetchMock, {
      expire: () => errorResponse(400, "Checkout session is already expired"),
      probe: "active",
    });

    await expect(expireCheckoutSession("cs_live")).rejects.toThrow(
      "PayMongo POST /v1/checkout_sessions/cs_live/expire failed (400): Checkout session is already expired",
    );
    expectProbed(fetchMock, "cs_live");
  });

  it("(4) THROWS when the provider reports the session `paid` — captured on a superseded session", async () => {
    // ⚠️ THE SINGLE MOST IMPORTANT RULE IN THIS BLOCK. `paid` means money was CAPTURED on a session we
    // were retiring. Swallowing it as a successful expire would HIDE A REAL CAPTURE from the only path
    // that can act on it — the caller's recordAudit(needs_attention) refusal in updateDeclaredPax /
    // confirmBooking. It must throw, and the error must be the ORIGINAL expire error.
    stubExpireAndProbe(fetchMock, {
      expire: () => errorResponse(400, "Checkout session is already expired"),
      probe: "paid",
    });

    await expect(expireCheckoutSession("cs_captured")).rejects.toThrow(
      "PayMongo POST /v1/checkout_sessions/cs_captured/expire failed (400): Checkout session is already expired",
    );
    expectProbed(fetchMock, "cs_captured");
  });

  it("(5) RESOLVES on a 500 when the provider reports `expired` — the tolerance is not status-code-scoped either", async () => {
    // The old implementation required `/\(400\)/`. The postcondition does not care which status code the
    // provider chose to report a retired session with; it cares whether the session can still be paid.
    stubExpireAndProbe(fetchMock, {
      expire: () => errorResponse(500, "internal server error"),
      probe: "expired",
    });

    await expect(expireCheckoutSession("cs_500")).resolves.toEqual({ id: "cs_500" });
    expectProbed(fetchMock, "cs_500");
  });

  it("(6) THROWS the ORIGINAL expire error — never the probe's — when the re-probe itself fails", async () => {
    // A failed probe teaches us NOTHING about the session, so we fail closed on what we already knew.
    // The probe's own message must not surface: both callers deliberately never touch the caught error
    // (T-05-15 / T-08-44), and PayMongo prose must not gain a new route into an audit row or a response.
    stubExpireAndProbe(fetchMock, {
      expire: () => errorResponse(400, "Checkout session is already expired"),
      probe: new Error("ECONNRESET probing the session"),
    });

    let caught: unknown;
    try {
      await expireCheckoutSession("cs_blind");
      expect.fail("expireCheckoutSession resolved — a session of UNKNOWN status must never be tolerated");
    } catch (err) {
      caught = err;
    }
    const message = (caught as Error).message;
    // Identity, not merely "it threw": this is the expire POST's error, verbatim.
    expect(message).toContain("failed (400)");
    expect(message).toContain("/v1/checkout_sessions/cs_blind/expire");
    expect(message).not.toContain("ECONNRESET");
    // Exactly ONE probe — no retry loop on the error path.
    expect(fetchMock.mock.calls).toHaveLength(2);
  });

  it("(7) SUCCESS PATH: exactly ONE fetch, NO probe, and the provider's id is returned", async () => {
    // A probe here would double the request count of every healthy expire. The success path must be
    // byte-identical in observable behaviour to the pre-change implementation.
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "cs_z", attributes: { status: "expired" } } }));

    await expect(expireCheckoutSession("cs_z")).resolves.toEqual({ id: "cs_z" });

    expect(fetchMock.mock.calls).toHaveLength(1);
    expect(lastCall(fetchMock).method).toBe("POST");
    expect(lastCall(fetchMock).url).toBe("https://api.paymongo.com/v1/checkout_sessions/cs_z/expire");
  });

  it("(8) THROWS on an UNKNOWN or EMPTY provider status — enum drift fails closed exactly like wording drift", async () => {
    // ⚠️ PERMANENT, COMMITTED CASE — not a scaffold. WHY IT IS MANDATORY: an implementation that
    // special-cased the empty string, or any enumerated REJECT-list such as
    //   `if (probed.status !== "active" && probed.status !== "paid") return { id };`
    // would still throw correctly on `active` and `paid` and would therefore pass every OTHER case and
    // every OTHER mutation in this block UNDETECTED — while silently tolerating every status PayMongo
    // adds in future. That is the same class of silent, unmeasured gap LW-01 itself is. Mutation M3
    // reddens THIS case and only this case.
    //
    // "" is what getCheckoutSession substitutes when the provider omits `status` altogether
    // (src/lib/paymongo.ts:293); "voided" is a synthetic plausible-but-unhandled provider value.
    for (const status of ["", "voided"]) {
      fetchMock.mockClear();
      stubExpireAndProbe(fetchMock, {
        expire: () => errorResponse(400, "Checkout session is already expired"),
        probe: status,
      });

      await expect(expireCheckoutSession("cs_drift")).rejects.toThrow(
        "PayMongo POST /v1/checkout_sessions/cs_drift/expire failed (400): Checkout session is already expired",
      );
      expectProbed(fetchMock, "cs_drift");
    }
  });
});

describe("createBatchTransfer — inhouse payout (/v2, D-52/PAY-03)", () => {
  it("POSTs to /v2/batch_transfers (NOT /v1/v2/...) sending provider=paymongo, amount=netCents, stable Idempotency-Key", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: { id: "batch_x", attributes: { transfers: [{ id: "tr_x", status: "pending" }] } },
      }),
    );

    const result = await createBatchTransfer({
      netCents: 135000,
      bookingId: "bk_1",
      description: "Payout for booking bk_1",
      destination: { number: "9990001111", name: "Host Wallet" },
    });
    expect(result).toEqual({ batchId: "batch_x", transferId: "tr_x", status: "pending" });

    const call = lastCall(fetchMock);
    expect(call.url).toBe("https://api.paymongo.com/v2/batch_transfers");
    // Pitfall 3 — the /v2 call must NOT be prefixed by /v1.
    expect(call.url).not.toContain("/v1/v2");
    expect(call.method).toBe("POST");
    expect(call.headers["Idempotency-Key"]).toBe("payout:bk_1");

    const transfer = (call.body as { transfers: Array<Record<string, unknown>> }).transfers[0];
    expect(transfer.provider).toBe("paymongo");
    expect(transfer.amount).toBe(135000); // net, verbatim — no gateway-fee subtraction (D-52)
  });
});

describe("createRefund — refund mechanism (/v1, D-60)", () => {
  it("POSTs to /v1/refunds with payment_id, reason=others, and a refund:<paymentId> Idempotency-Key", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "ref_x", attributes: { status: "pending" } } }));

    const result = await createRefund({ amountCents: 150000, paymentId: "pay_1", notes: "auto-refund" });
    expect(result).toEqual({ id: "ref_x", status: "pending" });

    const call = lastCall(fetchMock);
    expect(call.url).toBe("https://api.paymongo.com/v1/refunds");
    expect(call.method).toBe("POST");
    expect(call.headers["Idempotency-Key"]).toBe("refund:pay_1");

    const attributes = (call.body as { data: { attributes: Record<string, unknown> } }).data.attributes;
    expect(attributes.payment_id).toBe("pay_1");
    expect(attributes.reason).toBe("others");
  });
});

describe("listWalletAccounts — activated wallets (/v2, GET)", () => {
  it("GETs /v2/wallets?status=activated with no Idempotency-Key and maps the nested account shape", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: "wal_x",
            account: { account_number: "9990001111", account_name: "Host Wallet" },
            status: "activated",
          },
        ],
      }),
    );

    const result = await listWalletAccounts();
    expect(result).toEqual([
      { id: "wal_x", accountNumber: "9990001111", accountName: "Host Wallet", status: "activated" },
    ]);

    const call = lastCall(fetchMock);
    expect(call.url).toBe("https://api.paymongo.com/v2/wallets?status=activated");
    expect(call.method).toBe("GET");
    // GET carries no Idempotency-Key (only POSTs do).
    expect(call.headers["Idempotency-Key"]).toBeUndefined();
  });
});

describe("listReceivingInstitutions — InstaPay destination directory (/v1 Wallets, GET)", () => {
  it("GETs the Wallet directory route and maps its supported name/BIC entries", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [
          { attributes: { name: "Test Bank", bic: "TESTPHM2XXX" } },
          { name: "Test E-Wallet", bic: "TESTPHM2EW1" },
          { attributes: { name: "", bic: "IGNORED" } },
        ],
      }),
    );

    await expect(listReceivingInstitutions()).resolves.toEqual([
      { name: "Test Bank", bic: "TESTPHM2XXX" },
      { name: "Test E-Wallet", bic: "TESTPHM2EW1" },
    ]);

    const call = lastCall(fetchMock);
    expect(call.url).toBe("https://api.paymongo.com/v1/wallets/receiving_institutions?provider=instapay");
    expect(call.method).toBe("GET");
    expect(call.headers["Idempotency-Key"]).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════════════
// D-84 — getCheckoutSession WIDENED to the rail + the paid-at instant, with an OPT-IN deadline (13-03).
// ══════════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE POINT OF THIS BLOCK IS THE WORD *OPT-IN*. `paymongoFetch` set no `AbortSignal` anywhere in `src/`
// before this change (the gap `src/lib/payments/config.ts` records against CHECKOUT_LEASE_TTL_SECONDS),
// so a deadline is NET-NEW infrastructure on the money path. It is threaded per call rather than made a
// default because `getCheckoutSession` is load-bearing INSIDE `expireCheckoutSession`'s double-charge
// guard (LW-01): there, a deadline converts "the provider says this session is retired" — the one
// tolerated outcome — into a new way to fail closed, on a path whose failure costs an unrefunded double
// capture. The booker-facing surfaces that need a deadline are NEW callers, and they ask for one.
//
// So the two assertions that actually protect the money path are the NEGATIVE ones: no signal reaches
// `fetch` when no options are passed, and no signal reaches the expire recovery probe. T-13-03-EXPIREREG
// is those two lines. A default timeout would redden them both, which is exactly what they are for.
//
// THE RESPONSE SHAPE, as the fixtures below encode it (PayMongo's documented Checkout Session resource —
// `attributes.payments` is an array of FULL Payment resources, so the rail is TWO `attributes` deep):
//
//   { data: { id, attributes: { status, paid_at, payments: [ { id, attributes: { source: { type } } } ] } } }
//
// `paid_at` is Unix SECONDS (PayMongo's convention for every timestamp it returns), which is why the
// assertion below multiplies rather than comparing the raw number.
describe("getCheckoutSession — the D-84 widening + the opt-in deadline (/v1, GET)", () => {
  /** A GET /v1/checkout_sessions/<id> body in PayMongo's documented shape. */
  function sessionBody(
    id: string,
    attributes: Record<string, unknown>,
  ): Response {
    return jsonResponse({ data: { id, attributes } });
  }

  /** The RequestInit recorded on the Nth fetch call — the only place `signal` is observable. */
  function initAt(index: number): RequestInit {
    return (fetchMock.mock.calls[index] as [string, RequestInit])[1];
  }

  it("(1) reads the rail out of payments[0].attributes.source.type and paid_at as a Date", async () => {
    fetchMock.mockResolvedValue(
      sessionBody("cs_paid", {
        status: "paid",
        paid_at: 1_755_600_000,
        payments: [{ id: "pay_1", attributes: { source: { type: "gcash" }, status: "paid" } }],
      }),
    );

    const state = await getCheckoutSession("cs_paid");

    expect(state.id).toBe("cs_paid");
    expect(state.status).toBe("paid");
    expect(state.sourceType).toBe("gcash");
    // Unix SECONDS → ms. Comparing the raw number would pass against a broken ×1 implementation.
    expect(state.paidAt).toBeInstanceOf(Date);
    expect(state.paidAt!.getTime()).toBe(1_755_600_000_000);

    expect(lastCall(fetchMock).url).toBe("https://api.paymongo.com/v1/checkout_sessions/cs_paid");
    expect(lastCall(fetchMock).method).toBe("GET");
  });

  it("(2) defaults DEFENSIVELY when the provider omits payments, source or paid_at", async () => {
    // Three shapes an unpaid / partially-populated session really returns. None may throw, and none may
    // invent a rail: a fabricated `card` here would print a payment method the booker never used.
    const shapes: Array<Record<string, unknown>> = [
      {}, // nothing at all — the shape the existing "" status case already relies on
      { status: "active", payments: [] }, // an unpaid session: the array exists and is empty
      { status: "active", payments: [{ id: "pay_x", attributes: {} }] }, // a payment with no source
    ];
    for (const attributes of shapes) {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(sessionBody("cs_thin", attributes));

      const state = await getCheckoutSession("cs_thin");
      expect(state.sourceType).toBeNull();
      expect(state.paidAt).toBeNull();
    }
  });

  it("(3) ignores a paid_at that is not a finite number rather than minting an Invalid Date", async () => {
    for (const paid_at of [null, "2026-08-20", Number.NaN]) {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(sessionBody("cs_odd", { status: "paid", paid_at }));
      const state = await getCheckoutSession("cs_odd");
      // An Invalid Date is truthy and formats as "Invalid Date" on a receipt — worse than a null.
      expect(state.paidAt).toBeNull();
    }
  });

  it("(4) T-13-03-EXPIREREG: with NO options, NO signal reaches fetch — the default is unchanged", async () => {
    fetchMock.mockResolvedValue(sessionBody("cs_nosig", { status: "active" }));

    await getCheckoutSession("cs_nosig");

    expect(initAt(0).signal).toBeUndefined();
  });

  it("(5) with { timeoutMs }, an AbortSignal DOES reach fetch", async () => {
    fetchMock.mockResolvedValue(sessionBody("cs_sig", { status: "active" }));

    await getCheckoutSession("cs_sig", { timeoutMs: 5_000 });

    const signal = initAt(0).signal;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal!.aborted).toBe(false);
  });

  it("(6) the abort SURFACES as a rejection — never as a silently-empty result", async () => {
    // A hung provider: fetch resolves only when the deadline fires. If the abort were swallowed, the
    // caller would receive a session state with no rail and treat a timeout as "the rail is unknown"
    // — a different fact, and the one D-85 forbids printing as a payment date.
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit = {}) =>
        new Promise((_resolve, reject) => {
          const signal = init.signal;
          if (!signal) return; // hang forever — the test times out and names this line
          signal.addEventListener("abort", () => reject(signal.reason));
        }),
    );

    await expect(getCheckoutSession("cs_hung", { timeoutMs: 20 })).rejects.toThrow();
  });

  it("(7) T-13-03-EXPIREREG: expireCheckoutSession's recovery probe still passes NO deadline", async () => {
    stubExpireAndProbe(fetchMock, {
      expire: () => errorResponse(400, "Checkout session is already expired"),
      probe: "expired",
    });

    await expect(expireCheckoutSession("cs_recover")).resolves.toEqual({ id: "cs_recover" });

    expect(fetchMock.mock.calls).toHaveLength(2);
    expect(initAt(0).signal).toBeUndefined(); // the expire POST
    expect(initAt(1).signal).toBeUndefined(); // the LW-01 re-probe — the line that must never gain one
  });

  // ────────────────────────────────────────────────────────────────────────────────────────────────
  // 13.1-01 — the CAPTURED PAYMENT ID (`pay_...`) now survives the read.
  //
  // WHY THESE THREE CASES EXIST. A confirm driven by a server-side PROBE (13.1's reconciliation sweep)
  // has no webhook event to read the `pay_...` off, so this response is its only source. If it comes
  // back null the reconciled booking lands `payment_id = NULL`, `isApiRefundable` fails CLOSED, and
  // every later cancellation refund on that booking is permanently downgraded to the manual-return
  // path — the booker's money surfaced to an operator instead of moved. So the id is money-critical,
  // not metadata.
  //
  // THE RECORDED COLLISION. The 13.1-01 plan's prose located the id at `payments[0].attributes.id`.
  // The fixtures in THIS FILE — which the plan itself calls the contract — and the webhook route both
  // put it on the resource ENVELOPE at `payments[0].id`, which is PayMongo's `{ id, type, attributes }`
  // shape. Implementing only the prose path would have returned null for the very fixture that pins
  // the contract. Both placements are therefore read and both are pinned here; neither can regress
  // while the shape stays un-live-verified.
  // ────────────────────────────────────────────────────────────────────────────────────────────────

  it("(8) captures the pay_... off the payment resource ENVELOPE (payments[0].id) — the fixture-pinned shape", async () => {
    fetchMock.mockResolvedValue(
      sessionBody("cs_withpay", {
        status: "paid",
        paid_at: 1_755_600_000,
        payments: [
          { id: "pay_env_1", attributes: { source: { type: "gcash" }, status: "paid" } },
        ],
      }),
    );

    const state = await getCheckoutSession("cs_withpay");

    // Read from the fixture BODY, not a hand-built object: the fixture is the contract here.
    expect(state.paymentId).toBe("pay_env_1");
    // …and the pre-existing fields are untouched by the widening (additive only).
    expect(state.sourceType).toBe("gcash");
    expect(state.status).toBe("paid");
  });

  it("(9) also captures it from payments[0].attributes.id — the 13.1-01 prose placement (collision, both read)", async () => {
    fetchMock.mockResolvedValue(
      sessionBody("cs_nestedpay", {
        status: "paid",
        paid_at: 1_755_600_000,
        // NO envelope id at all: the ONLY place the pay_... appears is two `attributes` deep.
        payments: [{ attributes: { id: "pay_nested_1", source: { type: "card" }, status: "paid" } }],
      }),
    );

    const state = await getCheckoutSession("cs_nestedpay");

    expect(state.paymentId).toBe("pay_nested_1");
    expect(state.sourceType).toBe("card");
  });

  it("(10) a body with NO payments array yields paymentId === null — STRICTLY null, never undefined", async () => {
    // `undefined` is the dangerous value: `payment_id = undefined` is not a fact, and a caller reading
    // it as "not asked" would keep polling a session that will never carry one. `?? null` makes the
    // absence a decided answer, the same discipline sourceType/paidAt already follow.
    for (const attributes of [
      {} as Record<string, unknown>,
      { status: "active" },
      { status: "active", payments: [] },
      { status: "active", payments: [{ attributes: {} }] },
    ]) {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(sessionBody("cs_nopay", attributes));

      const state = await getCheckoutSession("cs_nopay");

      expect(state.paymentId).toBeNull();
      expect(state.paymentId).not.toBeUndefined();
    }
  });
});
