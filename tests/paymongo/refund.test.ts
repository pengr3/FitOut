// The PayMongo refund CALL contract (07-16 Task 2) — the REAL src/lib/paymongo.ts createRefund driven
// against a stubbed global fetch that emulates PayMongo's Idempotency-Key semantics.
//
// WHY THIS FILE EXISTS. Every other suite mocks `@/lib/paymongo` wholesale, so nothing before this file
// ever looked at the HTTP request createRefund actually builds. Two properties live only at that level:
//
//   (1) POSITIVE MONEY MOVEMENT (inherited hazard: vacuous assertions). A partial refund must POST the
//       exact centavo amount with an `Idempotency-Key` header PRESENT. An "at most once" bound passes
//       with zero calls — this case is what makes the suite's guard assertions meaningful, because it
//       proves the call genuinely fires and carries the right figure.
//
//   (2) ONE-REFUND-PER-PAYMENT, made VISIBLE rather than latent. createRefund keys its Idempotency-Key
//       on the PAYMENT id alone (`refund:<paymentId>` — see the comment at src/lib/paymongo.ts), so a
//       SECOND createRefund for the same payment does NOT produce a second refund resource: PayMongo
//       replays the first response, whatever amount the second call asked for. Safe today (one refund
//       per booking, booking↔payment is 1:1); a TRAP for any future partial-then-top-up flow, which
//       would silently no-op and appear successful. If that flow is ever built, THIS test goes red and
//       forces the key-shape decision.
//
// The fetch stub emulates the documented idempotent-replay behaviour: a repeated Idempotency-Key returns
// the STORED response verbatim and creates nothing. That emulation is the point — it is the exact
// behaviour the latent assumption depends on.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRefund } from "@/lib/paymongo";

type CapturedRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: {
    data: { attributes: { amount: number; payment_id: string; reason: string; notes?: string } };
  };
};

/** Every request createRefund fired, in order. */
let requests: CapturedRequest[] = [];
/** The emulated PayMongo refund store: Idempotency-Key → the response body it replays. */
let responsesByIdemKey: Map<string, unknown>;
/** Refund resources the emulated PayMongo actually CREATED (replays do not append here). */
let refundsCreated: string[] = [];

function paymongoFetchStub(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const headers = Object.fromEntries(
    Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [k, v]),
  );
  const body = JSON.parse(String(init?.body ?? "{}")) as CapturedRequest["body"];
  requests.push({ url, method: init?.method ?? "GET", headers, body });

  const idemKey = headers["Idempotency-Key"];
  // Idempotent replay: a seen key returns the FIRST call's stored response — no new resource, no error.
  if (idemKey && responsesByIdemKey.has(idemKey)) {
    return Promise.resolve(
      new Response(JSON.stringify(responsesByIdemKey.get(idemKey)), { status: 200 }),
    );
  }
  const id = `ref_${refundsCreated.length + 1}`;
  refundsCreated.push(id);
  const responseBody = { data: { id, attributes: { status: "pending" } } };
  if (idemKey) responsesByIdemKey.set(idemKey, responseBody);
  return Promise.resolve(new Response(JSON.stringify(responseBody), { status: 200 }));
}

beforeEach(() => {
  requests = [];
  responsesByIdemKey = new Map();
  refundsCreated = [];
  vi.stubGlobal("fetch", vi.fn(paymongoFetchStub));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createRefund — the HTTP contract", () => {
  it("(1) a PARTIAL refund POSTs the exact centavo amount with an Idempotency-Key header present", async () => {
    // ₱400 of a ₱1,000 payment — a genuinely partial figure, so an implementation that hardcoded a full
    // refund (or echoed some other field) could not pass.
    const res = await createRefund({
      amountCents: 40000,
      paymentId: "pay_partial_1",
      notes: "Booker cancellation (bk_partial)",
    });

    // The call FIRED — positive movement, the anti-vacuity anchor for every "at most once" bound.
    expect(requests).toHaveLength(1);
    const req = requests[0];
    expect(req.method).toBe("POST");
    expect(req.url).toBe("https://api.paymongo.com/v1/refunds");

    // The exact centavos, in the documented body shape — never a peso float, never a client echo.
    expect(req.body.data.attributes.amount).toBe(40000);
    expect(req.body.data.attributes.payment_id).toBe("pay_partial_1");

    // The Idempotency-Key header is PRESENT and payment-scoped (the retry/double-click guard).
    expect(req.headers["Idempotency-Key"]).toBe("refund:pay_partial_1");
    // And authenticated — Basic auth with the secret key as username.
    expect(req.headers["Authorization"]).toMatch(/^Basic /);

    expect(res).toEqual({ id: "ref_1", status: "pending" });
  });

  it("(2) a SECOND createRefund for the same payment does NOT produce a second refund resource", async () => {
    // The one-refund-per-payment assumption, exercised end to end. The second call asks for a DIFFERENT
    // amount — the exact shape a future partial-then-top-up flow would take.
    const first = await createRefund({ amountCents: 60000, paymentId: "pay_once_1" });
    const second = await createRefund({ amountCents: 40000, paymentId: "pay_once_1" });

    // Both calls reached PayMongo (this is not client-side dedupe)…
    expect(requests).toHaveLength(2);
    expect(requests[0].headers["Idempotency-Key"]).toBe("refund:pay_once_1");
    expect(requests[1].headers["Idempotency-Key"]).toBe("refund:pay_once_1");

    // …but exactly ONE refund resource exists: the key collides, PayMongo replays the first response.
    expect(refundsCreated).toEqual(["ref_1"]);
    expect(second.id).toBe(first.id);

    // The dangerous half of the property, stated as an assertion: the second call LOOKED successful
    // (resolved, no throw, a plausible refund id) while creating nothing and moving no further money.
    // Today that is the double-refund guard working as designed. For a top-up flow it would be a silent
    // no-op wearing a success shape — which is why this test exists.
    expect(second.status).toBe("pending");

    // A DIFFERENT payment still gets its own refund — the key is payment-scoped, not global.
    const other = await createRefund({ amountCents: 40000, paymentId: "pay_once_2" });
    expect(other.id).toBe("ref_2");
    expect(refundsCreated).toEqual(["ref_1", "ref_2"]);
  });
});
