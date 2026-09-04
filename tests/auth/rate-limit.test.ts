// CR-01 regression: prove the tightened rate-limit customRules ACTUALLY fire on the live
// mounted endpoints — and prove they are OUR rules, not just Better Auth's built-in defaults.
//
// The earlier config asserted only that the rules existed in the object; it could not detect a
// non-matching key, which is exactly the silent-inert failure mode the review flagged. This test
// drives the REAL production `auth.handler` (the same handler toNextJsHandler wraps at
// /api/auth/[...all]) with over-limit bursts and asserts a 429.
//
// LOAD-BEARING DETAIL: Better Auth ships built-in "special rules" that ALSO throttle /sign-in*
// and /sign-up* at 3 per 10s. If we merely sent 6 sign-in requests, the BUILT-IN default would
// 429 the 4th and the test would pass even if OUR customRule key were broken (e.g. mis-prefixed
// with /api/auth so it never matched). To prove OUR rule (max 5 per 60s) is the one in force, we
// send exactly 4 requests: under the built-in cap of 3 the 4th would be 429, but under our cap of
// 5 the 4th must be ALLOWED. So the 4th request passing is positive proof that the bare-key
// customRule matched and overrode the default. A broken key collapses back to the built-in 3/10s
// and the 4th request becomes 429 — failing this test.
//
// Better Auth matches customRules keys against the request path AFTER stripping the /api/auth
// basePath (normalizePathname), with EXACT equality — so the keys MUST be the bare endpoint paths.
//
// Storage: rateLimit.storage defaults to "memory" here (no secondaryStorage) — an in-process Map,
// so no DB table is needed. Each test uses a UNIQUE client IP (x-forwarded-for) so the per-IP+path
// counter never bleeds across cases.

import { describe, it, expect } from "vitest";
import { auth } from "@/lib/auth";

const ORIGIN = "http://localhost:3000";

/** Fire one request at a Better Auth endpoint through the production handler with a fixed client IP. */
function hit(path: string, ip: string, body: Record<string, unknown>) {
  return auth.handler(
    new Request(`${ORIGIN}/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify(body),
    }),
  );
}

/** Fire `count` sequential requests and return the array of HTTP statuses. */
async function burst(
  path: string,
  ip: string,
  body: Record<string, unknown>,
  count: number,
): Promise<number[]> {
  const statuses: number[] = [];
  for (let i = 0; i < count; i++) {
    const res = await hit(path, ip, body);
    statuses.push(res.status);
  }
  return statuses;
}

describe("rate limiting actually fires on the live auth endpoints (CR-01, threat T-02-05)", () => {
  it("sign-in/email uses OUR 5/60s rule, not the built-in 3/10s — the 4th attempt is NOT throttled", async () => {
    // Built-in special rule for /sign-in* is 3/10s; our customRule "/sign-in/email" is 5/60s.
    // Sending 4 requests: the 4th would be 429 under the default (max 3) but must pass under ours
    // (max 5). The 4th passing therefore proves our bare-key customRule matched and overrode it.
    const statuses = await burst(
      "/sign-in/email",
      "203.0.113.10",
      { email: "ratelimit.signin@example.com", password: "wrong-password-attempt" },
      4,
    );
    expect(statuses[3]).not.toBe(429);
  });

  it("sign-in/email is throttled at OUR limit — the 6th attempt within 60s returns 429", async () => {
    // customRule "/sign-in/email" => { window: 60, max: 5 }: 5 allowed, the 6th is throttled.
    const statuses = await burst(
      "/sign-in/email",
      "203.0.113.11",
      { email: "ratelimit.signin6@example.com", password: "wrong-password-attempt" },
      6,
    );
    expect(statuses[5]).toBe(429);
  });

  it("sign-up/email uses OUR 5/60s rule, not the built-in 3/10s — the 4th attempt is NOT throttled", async () => {
    // Same distinguishing logic for sign-up: built-in 3/10s vs our customRule 5/60s.
    const statuses = await burst(
      "/sign-up/email",
      "203.0.113.40",
      {
        // Deliberately invalid (too-short password) so no user is actually created; the limiter
        // runs in the response phase regardless of the business outcome.
        email: "ratelimit.signup@example.com",
        password: "short",
        name: "RL",
        firstName: "RL",
      },
      4,
    );
    expect(statuses[3]).not.toBe(429);
  });

  it("request-password-reset is limited to 3 per 60s — the 4th attempt returns 429", async () => {
    // customRule "/request-password-reset" => { window: 60, max: 3 } (matches the built-in cap; the
    // explicit rule documents the chosen value). The 4th must be throttled.
    const statuses = await burst(
      "/request-password-reset",
      "203.0.113.20",
      { email: "ratelimit.reset@example.com", redirectTo: "/reset-password" },
      4,
    );
    expect(statuses[3]).toBe(429);
  });

  it("a request from a DIFFERENT IP is not affected by another IP's burst (per-IP keying)", async () => {
    // Saturate one IP, then a single request from a fresh IP must still pass the limiter (not 429).
    await burst(
      "/sign-in/email",
      "203.0.113.30",
      { email: "ratelimit.iso@example.com", password: "wrong-password-attempt" },
      6,
    );
    const res = await hit(
      "/sign-in/email",
      "203.0.113.31",
      { email: "ratelimit.iso2@example.com", password: "wrong-password-attempt" },
    );
    expect(res.status).not.toBe(429);
  });
});
