// REAL PayMongo test-mode proof (deferred items 5 + 6). This is the ONE test that hits the live sk_test_
// API — a mock that echoes the idempotency key back is exactly what let the double-charge belief survive
// four plans of coverage. GATED on an sk_test_ key so the default `npm test` and CI (placeholder key)
// SKIP cleanly. Every session created here is EXPIRED in cleanup — no live payable session may leak, and
// this file makes zero DB calls.

import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { createCheckoutSession, expireCheckoutSession, getCheckoutSession } from "@/lib/paymongo";

// PRIMARY gate: an explicit opt-in flag, NOT the key prefix — .env.local carries a real sk_test_ key that
// tests/setup.ts loads first, so a prefix-only gate would make the DEFAULT suite hit the live API forever.
const runLive =
  process.env.RUN_LIVE_PAYMONGO_PROBE === "1" &&
  !!process.env.PAYMONGO_SECRET_KEY &&
  process.env.PAYMONGO_SECRET_KEY.startsWith("sk_test_");

const created: string[] = []; // every session id we mint — expired in afterAll
async function newSession(amountCents: number, key: string) {
  const ref = `gap-${randomUUID()}`;
  const s = await createCheckoutSession({
    amountCents,
    currency: "php",
    name: "Gap A/B probe",
    referenceNumber: ref,
    metadata: { booking_id: ref },
    successUrl: "https://example.test/ok",
    cancelUrl: "https://example.test/cancel",
    idempotencyKey: key,
  });
  created.push(s.id);
  return s;
}
afterAll(async () => {
  for (const id of created) {
    try {
      await expireCheckoutSession(id);
    } catch {
      /* already expired — a repeat expire is itself the case-4 no-op */
    }
  }
});

describe.skipIf(!runLive)("PayMongo checkout — real test-mode invariants", () => {
  // (1) Gap A — two byte-identical POSTs mint two DIFFERENT payable session ids.
  it(
    "duplicate checkout POSTs with a byte-identical Idempotency-Key mint DIFFERENT payable session ids",
    async () => {
      const key = `probe-${randomUUID()}`;
      const s1 = await newSession(50_000, key);
      const s2 = await newSession(50_000, key); // same amount + same key => byte-identical body

      expect(s1.id.startsWith("cs_")).toBe(true);
      expect(s2.id.startsWith("cs_")).toBe(true);
      // Falsifies "the Idempotency-Key collapses duplicate checkout POSTs onto one session" — it does not.
      expect(s1.id).not.toBe(s2.id);
      // Surface the observed ids for the SUMMARY's provider-probed evidence.
      // eslint-disable-next-line no-console
      console.log(`[case1] s1=${s1.id} s2=${s2.id}`);
    },
    30_000,
  );

  // (2) Gap A guard — expireCheckoutSession retires a session; the provider then reports it non-payable.
  it(
    "expireCheckoutSession retires a session — its status flips from active to expired",
    async () => {
      const s = await newSession(50_000, `guard-${randomUUID()}`);

      const before = await getCheckoutSession(s.id);
      // eslint-disable-next-line no-console
      console.log(`[case2] pre-expire status=${before.status}`);
      expect(before.status).toBe("active");

      await expect(expireCheckoutSession(s.id)).resolves.toBeDefined();

      const after = await getCheckoutSession(s.id);
      // eslint-disable-next-line no-console
      console.log(`[case2] post-expire status=${after.status}`);
      // The session can no longer be paid: post-expire status differs from active AND is the expired marker.
      expect(after.status).not.toBe(before.status);
      expect(after.status).toBe("expired");
    },
    30_000,
  );

  // (3) Gap B / CR-02 — the re-price supersession holds at the provider (exactly one payable session).
  it(
    "a re-priced hold leaves exactly one payable session — the superseded one is expired at the provider",
    async () => {
      const s1 = await newSession(50_000, `rp-${randomUUID()}-50000`); // the OLD amount
      await expireCheckoutSession(s1.id); // the supersession step updateDeclaredPax performs
      const s2 = await newSession(73_500, `rp-${randomUUID()}-73500`); // the NEW amount

      expect(s1.id).not.toBe(s2.id);
      const superseded = await getCheckoutSession(s1.id);
      const replacement = await getCheckoutSession(s2.id);
      // eslint-disable-next-line no-console
      console.log(`[case3] superseded=${s1.id}:${superseded.status} replacement=${s2.id}:${replacement.status}`);
      // This is the live assertion the 08-17 UAT never exercised (it submitted the SAME headcount twice).
      expect(superseded.status).toBe("expired"); // the old session can no longer be paid
      expect(replacement.status).toBe("active"); // exactly one payable session survives the re-price
    },
    30_000,
  );

  // (4) W2(a) — a REPEAT expire of the SAME session id. 08-12 contract 1 and 08-18's not-trapped recovery
  // ASSUMED the session-scoped Idempotency-Key `checkout-expire:<id>` replays the prior 200, making a
  // second expire a harmless no-op. This probe FALSIFIES that against the real API:
  //
  //   PROBED (sk_test_, 2026-07-29): the second expire is REJECTED, not replayed —
  //   `PayMongo POST /v1/checkout_sessions/{id}/expire failed (400): Checkout session is already expired`.
  //
  // So the Idempotency-Key is NOT honored on the expire endpoint either (same class of bug as POST
  // /v1/checkout_sessions). This is a NEW finding: 08-18's fail-closed catch, which REFUSES the checkout
  // when expireCheckoutSession throws, would permanently refuse a legitimate retry whose prior session was
  // already expired by an earlier attempt. 08-18's catch must be hardened to treat a 400 "already expired"
  // as a benign no-op. Surfaced prominently in 08-19-SUMMARY.md (Provider-Probed Findings) as a
  // recommended follow-up for 08-18 hardening; asserted here as the true contract.
  it(
    "a repeat expire of the same session id is REJECTED with 400 'already expired' (PROBED — not a no-op)",
    async () => {
      const s = await newSession(50_000, `repeat-${randomUUID()}`);

      await expect(expireCheckoutSession(s.id)).resolves.toBeDefined(); // first expire → 200

      // Second expire on the SAME, now-expired id. The real endpoint throws — capture the exact shape.
      let repeatError: unknown;
      try {
        await expireCheckoutSession(s.id);
      } catch (err) {
        repeatError = err;
      }
      expect(repeatError).toBeInstanceOf(Error);
      const message = (repeatError as Error).message;
      // eslint-disable-next-line no-console
      console.log(`[case4] repeat-expire of ${s.id} THREW: ${message}`);
      expect(message).toMatch(/\(400\)/);
      expect(message).toMatch(/already expired/i);
      // s.id is already in `created`; the afterAll re-expire is itself another already-expired throw,
      // swallowed by the afterAll try/catch — so the harness leaks no payable session despite the throw.
    },
    30_000,
  );
});
