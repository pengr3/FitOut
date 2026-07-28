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
  createBatchTransfer,
  createRefund,
  listWalletAccounts,
} from "@/lib/paymongo";

/** Build a 200 Response with a JSON body (paymongoFetch does res.text() → JSON.parse). */
function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
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
function lastCall(fetchMock: ReturnType<typeof vi.fn>): {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
} {
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

  it("uses the IDENTICAL Idempotency-Key on a retry of the same session, so a duplicate expire is a no-op", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "cs_abc", attributes: { status: "expired" } } }));

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
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "cs_two", attributes: { status: "expired" } } }));

    await expireCheckoutSession("cs_one");
    await expireCheckoutSession("cs_two");

    expect(callAt(fetchMock, 0).headers["Idempotency-Key"]).toBe("checkout-expire:cs_one");
    expect(callAt(fetchMock, 1).headers["Idempotency-Key"]).toBe("checkout-expire:cs_two");
    expect(callAt(fetchMock, 1).headers["Idempotency-Key"]).not.toBe(
      callAt(fetchMock, 0).headers["Idempotency-Key"],
    );
  });

  it("THROWS the module's descriptive error on a non-2xx — a failed expire is never swallowed", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ detail: "Checkout session is already paid." }] }), {
        status: 400,
      }),
    );

    // The caller (08-13) refuses the re-price on a throw; swallowing here would let a re-price proceed
    // with two payable sessions and no signal.
    await expect(expireCheckoutSession("cs_abc")).rejects.toThrow(
      "PayMongo POST /v1/checkout_sessions/cs_abc/expire failed (400): Checkout session is already paid.",
    );
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
