// PAY-04 — the PayMongo webhook route (POST /api/paymongo/webhook) signature verification + idempotency.
//
// Two parts:
//  1. GREEN now — the Wave-0 signing contract. Plan 06 verifies the `Paymongo-Signature` header by
//     recomputing HMAC-SHA256(secret, `${t}.${rawBody}`); mockPayMongo.signWebhook produces exactly
//     that header. We assert the helper is deterministic + well-formed so Plan 06 can sign a body and
//     drive the real handler. (Testing the Wave-0 mock, NOT Plan-06 code.)
//  2. RED until Plan 06 — the route behaviors (invalid/malformed sig → 400; duplicate event id is
//     idempotent). Plan 06's <verify> replaces the it.todo entries with real assertions that POST a
//     signed body (mockPayMongo.signWebhook) to the exported route handler.

import { describe, it, expect } from "vitest";
import { mockPayMongo } from "../helpers/mocks";

const SECRET = "whsec_test_123";
const BODY = JSON.stringify({ data: { id: "evt_1", attributes: { type: "merchant.activated" } } });

describe("Paymongo-Signature signing contract (mockPayMongo) — GREEN Wave-0 anchor", () => {
  it("produces a t=<ts>,te=<64-hex>,li=<64-hex> header", () => {
    const header = mockPayMongo.signWebhook(BODY, SECRET, 1_700_000_000);
    expect(header).toMatch(/^t=1700000000,te=[0-9a-f]{64},li=[0-9a-f]{64}$/);
  });

  it("is deterministic for a fixed body + secret + timestamp", () => {
    const a = mockPayMongo.signWebhook(BODY, SECRET, 1_700_000_000);
    const b = mockPayMongo.signWebhook(BODY, SECRET, 1_700_000_000);
    expect(a).toBe(b);
  });

  it("changes when the body changes (tamper-evident)", () => {
    const good = mockPayMongo.signWebhook(BODY, SECRET, 1_700_000_000);
    const tampered = mockPayMongo.signWebhook(BODY + " ", SECRET, 1_700_000_000);
    expect(tampered).not.toBe(good);
  });

  it("badSignature() differs from a valid signature (the 400 path input)", () => {
    const good = mockPayMongo.signWebhook(BODY, SECRET, 1_700_000_000);
    const bad = mockPayMongo.badSignature(1_700_000_000);
    expect(bad).not.toBe(good);
  });
});

describe("webhook route signature + idempotency (PAY-04) — RED until Plan 06", () => {
  it.todo("rejects an invalid Paymongo-Signature with 400 (mockPayMongo.badSignature)");
  it.todo("rejects a malformed / length-mismatched signature header with 400 (timingSafeEqual length-guard)");
  it.todo("accepts a valid signed body (mockPayMongo.signWebhook) and returns 200");
  it.todo("is idempotent — a duplicate event id is processed at most once");
});
