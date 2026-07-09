// In-memory, per-identity fixed-window rate limiter (WR-06 closure).
//
// WHY THIS EXISTS: Phase-1 review deferred WR-06 (01-REVIEW.md) — the capability-activate server
// actions (activateHosting/activateBooking) are privileged escalations (canHost later unlocks
// PayMongo payouts in Plan 06) that had NO rate limit and NO audit trail, so a logged-in session
// could call them unboundedly. This module is the reusable limiter that closes the rate-limit half;
// src/lib/audit.ts closes the audit half. Plan 04's Cloudinary sign endpoint and Plan 06's
// onboarding action reuse this SAME limiter (that reuse is the reason it is a shared helper).
//
// v1 SCOPE (documented tradeoff): the counter store is a single module-level Map — correct for the
// single-region / single-instance launch (CLAUDE.md "single city/region at launch"; STATE.md "do
// not over-build"). A DISTRIBUTED store (e.g. Redis) is the future hardening once we run more than
// one instance; a per-process limiter is the right, un-over-built choice until then. Callers MUST
// key on the AUTHENTICATED identity (e.g. `activate:${userId}`), never the client IP, for
// session-gated privileged actions — mirroring the Better-Auth privileged-endpoint budget (5/60s).

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

export interface RateLimitOptions {
  /** Window length in seconds. */
  window: number;
  /** Max allowed hits per key per window. */
  max: number;
}

type Bucket = { count: number; resetAt: number };

// Module-level store. Persists for the life of the process (single instance, v1).
const buckets = new Map<string, Bucket>();

/**
 * Fixed-window limiter. Returns `{ ok: true }` while `key` is under `max` hits in the current
 * `window`, otherwise `{ ok: false, retryAfter }` where `retryAfter` is whole seconds until the
 * window resets. Called with `{ window: 60, max: 5 }` it mirrors the Better-Auth
 * credential-endpoint budget used in src/lib/auth.ts.
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowMs = opts.window * 1000;
  const bucket = buckets.get(key);

  // No bucket yet, or the previous window has elapsed -> start a fresh window.
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  // Still inside the window and under budget -> count this hit.
  if (bucket.count < opts.max) {
    bucket.count += 1;
    return { ok: true };
  }

  // Over budget inside the window -> reject with a whole-seconds retry hint (>= 1).
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return { ok: false, retryAfter };
}

/**
 * Ergonomic wrapper so server actions / route handlers can early-return the structured result
 * without re-deriving it. Semantically identical to {@link rateLimit}; named for caller intent
 * ("require this call is within the rate limit, else bail").
 */
export function requireWithinRateLimit(
  key: string,
  opts: RateLimitOptions,
): RateLimitResult {
  return rateLimit(key, opts);
}
