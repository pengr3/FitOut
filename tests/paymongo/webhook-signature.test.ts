// PAY-04 — the PayMongo webhook route (POST /api/paymongo/webhook) signature verification + idempotency.
//
// Two parts:
//  1. GREEN Wave-0 — the signing contract. The route verifies the `Paymongo-Signature` header by
//     recomputing HMAC-SHA256(secret, `${t}.${rawBody}`); mockPayMongo.signWebhook produces exactly
//     that header. We assert the helper is deterministic + well-formed so the route can be driven by it.
//  2. GREEN as of Plan 06 — the real route behaviors: an invalid/malformed/length-mismatched signature
//     → 400 (never a 500, T-06-SPOOF); a valid signed body → 200; a duplicate event id is idempotent
//     (processed at most once, T-06-REPLAY). These POST a signed body to the exported POST handler,
//     bound to the isolated test schema (tests/helpers/db.ts).

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { paymongoEvent } from "@/lib/db/schema";
import { mockPayMongo } from "../helpers/mocks";

const SECRET = "whsec_test_123";
const TS = 1_700_000_000;
const BODY = JSON.stringify({ data: { id: "evt_1", attributes: { type: "merchant.activated" } } });

describe("Paymongo-Signature signing contract (mockPayMongo) — GREEN Wave-0 anchor", () => {
  it("produces a t=<ts>,te=<64-hex>,li=<64-hex> header", () => {
    const header = mockPayMongo.signWebhook(BODY, SECRET, TS);
    expect(header).toMatch(/^t=1700000000,te=[0-9a-f]{64},li=[0-9a-f]{64}$/);
  });

  it("is deterministic for a fixed body + secret + timestamp", () => {
    const a = mockPayMongo.signWebhook(BODY, SECRET, TS);
    const b = mockPayMongo.signWebhook(BODY, SECRET, TS);
    expect(a).toBe(b);
  });

  it("changes when the body changes (tamper-evident)", () => {
    const good = mockPayMongo.signWebhook(BODY, SECRET, TS);
    const tampered = mockPayMongo.signWebhook(BODY + " ", SECRET, TS);
    expect(tampered).not.toBe(good);
  });

  it("badSignature() differs from a valid signature (the 400 path input)", () => {
    const good = mockPayMongo.signWebhook(BODY, SECRET, TS);
    const bad = mockPayMongo.badSignature(TS);
    expect(bad).not.toBe(good);
  });
});

// ---------------------------------------------------------------------------
// The real route: signature verify + idempotency (drives the exported POST handler).
// ---------------------------------------------------------------------------
let testDb: TestDb;
let POST: (typeof import("@/app/api/paymongo/webhook/route"))["POST"];
let prevSecret: string | undefined;

beforeAll(async () => {
  testDb = await setupTestDb();
  prevSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  process.env.PAYMONGO_WEBHOOK_SECRET = SECRET; // the route verifies against this at call time.
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.resetModules();
  ({ POST } = await import("@/app/api/paymongo/webhook/route"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/db");
  process.env.PAYMONGO_WEBHOOK_SECRET = prevSecret;
  await teardownTestDb(testDb);
});

/** Build a POST Request for the webhook with a raw body + Paymongo-Signature header. */
function webhookRequest(rawBody: string, signature: string): Request {
  return new Request("http://localhost/api/paymongo/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "paymongo-signature": signature },
    body: rawBody,
  });
}

describe("webhook route signature + idempotency (PAY-04, T-06-SPOOF/REPLAY)", () => {
  it("rejects an invalid Paymongo-Signature with 400 (mockPayMongo.badSignature)", async () => {
    const body = JSON.stringify({ data: { id: "evt_badsig", attributes: { type: "merchant.activated" } } });
    const res = await POST(webhookRequest(body, mockPayMongo.badSignature(TS)));
    expect(res.status).toBe(400);
  });

  it("rejects a malformed / length-mismatched signature header with 400 (timingSafeEqual length-guard)", async () => {
    const body = JSON.stringify({ data: { id: "evt_malformed", attributes: { type: "merchant.activated" } } });
    // te/li are far too short to match a 64-hex digest — the byte-length guard must 400, not throw a 500.
    const shortSig = `t=${TS},te=abc,li=abc`;
    const res1 = await POST(webhookRequest(body, shortSig));
    expect(res1.status).toBe(400);

    // A header missing the te/li parts entirely is also a clean 400.
    const missingParts = `t=${TS}`;
    const res2 = await POST(webhookRequest(body, missingParts));
    expect(res2.status).toBe(400);

    // A wholly absent header is a clean 400 too (never a 500).
    const res3 = await POST(
      new Request("http://localhost/api/paymongo/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    );
    expect(res3.status).toBe(400);
  });

  it("accepts a valid signed body (mockPayMongo.signWebhook) and returns 200", async () => {
    const body = JSON.stringify({ data: { id: "evt_valid_200", attributes: { type: "merchant.activated" } } });
    const res = await POST(webhookRequest(body, mockPayMongo.signWebhook(body, SECRET, TS)));
    expect(res.status).toBe(200);
  });

  it("is idempotent — a duplicate event id is processed at most once", async () => {
    const body = JSON.stringify({ data: { id: "evt_idem", attributes: { type: "merchant.activated" } } });
    const sig = mockPayMongo.signWebhook(body, SECRET, TS);

    const first = await POST(webhookRequest(body, sig));
    const second = await POST(webhookRequest(body, sig));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200); // duplicate is acknowledged, not re-processed.

    // Exactly ONE ledger row exists for the event id — the second delivery was skipped.
    const rows = await testDb.db
      .select()
      .from(paymongoEvent)
      .where(eq(paymongoEvent.id, "evt_idem"));
    expect(rows.length).toBe(1);
  });
});
