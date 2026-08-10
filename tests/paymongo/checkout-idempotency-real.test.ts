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
       
      console.log(`[case2] pre-expire status=${before.status}`);
      expect(before.status).toBe("active");

      await expect(expireCheckoutSession(s.id)).resolves.toBeDefined();

      const after = await getCheckoutSession(s.id);
       
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
       
      console.log(`[case3] superseded=${s1.id}:${superseded.status} replacement=${s2.id}:${replacement.status}`);
      // This is the live assertion the 08-17 UAT never exercised (it submitted the SAME headcount twice).
      expect(superseded.status).toBe("expired"); // the old session can no longer be paid
      expect(replacement.status).toBe("active"); // exactly one payable session survives the re-price
    },
    30_000,
  );

  // (4) W2(a) — a REPEAT expire of the SAME session id. 08-19 FOUND here (probed live) that PayMongo does
  // NOT honor the Idempotency-Key on the expire endpoint: the second expire returns HTTP 400 "Checkout
  // session is already expired", not a replayed 200. 08-18's fail-closed catch would have permanently
  // refused a legitimate retry whose prior session was already expired by an earlier attempt — a
  // recovery-path livelock.
  //
  //   PROBED (sk_test_, 2026-07-29): the underlying second expire is rejected 400 "already expired".
  //
  // 08-21 FIXED that, and LW-01 (quick task 260810-i0v, 2026-08-10) changed WHY it works. The wrapper no
  // longer tolerates the 400 because its TEXT matched a regex. It now issues exactly ONE
  // getCheckoutSession(id) re-probe and tolerates the error only because THE PROVIDER ITSELF REPORTS THE
  // SESSION `expired` — expire's postcondition (this session can never be paid) read back as a fact rather
  // than inferred from an error sentence. A PayMongo reword or localization can no longer re-open the
  // livelock. `paid`, `active`, any unknown status, and a failed probe all rethrow the ORIGINAL error.
  //
  // This case is therefore the LIVE proof of BOTH halves: the second expireCheckoutSession on the same id
  // must RESOLVE against the real API, and it can only do so if the real GET came back `expired`. (The
  // underlying provider 400 is unchanged; the wrapper absorbs it on provider-verified evidence.)
  it(
    "a repeat expire of the same session id RESOLVES — the wrapper re-probes and the provider reports it expired (LW-01 / 08-21)",
    async () => {
      // The repeat expire resolves because the LW-01 re-probe read back `status === "expired"` from the
      // live API, not because a regex matched PayMongo's 400 prose. This is the live proof of the fix for
      // the livelock 08-19 originally FOUND here.
      const s = await newSession(50_000, `repeat-${randomUUID()}`);

      await expect(expireCheckoutSession(s.id)).resolves.toBeDefined(); // first expire — retires it
      await expect(expireCheckoutSession(s.id)).resolves.toBeDefined(); // repeat — tolerated, no throw

       
      console.log(`[case4] repeat-expire of ${s.id} RESOLVED (wrapper tolerated the underlying 400 'already expired')`);
      // s.id is already in `created`; the afterAll re-expire now also resolves (same tolerated 400).
    },
    30_000,
  );
});
