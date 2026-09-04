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
//
// THE STORE IS HARD-BOUNDED (CR-04, Phase-8 review). Every caller through Phase 7 keyed on an
// authenticated `userId`, so the key space was bounded by the user table and "a Map that is never
// evicted from" was harmless. Phase 8 shipped `submitRsvp` — the app's ONE session-less write — and a
// caller-chosen invite token as a key is `32^20` selectable values, each buying a permanent
// ~150-200 byte entry with no session and no database row behind it. That is memory exhaustion
// against the whole process, and it takes the booking path (the core value) down with it. So:
//
//   INVARIANT: after every `rateLimit` call, `buckets.size <= MAX_BUCKETS`. Whatever a caller keys on.
//
// It is held by an expired-sweep plus, when that is not enough, insertion-order eviction — a `Map`
// iterates in insertion order, so it is already an LRU-by-insertion for this purpose and needs no
// dependency. A flood of distinct keys INSIDE one window expires nothing, which is exactly why the
// sweep alone is not a ceiling and the hard eviction is not optional.
//
// TRADEOFF, stated so it is not a surprise (T-08-36): under sustained pressure a still-LIVE key can be
// evicted and get a fresh window on its next hit. Bounded memory beats an exact budget under attack —
// the alternative is unbounded memory, i.e. losing every budget along with the app. Pinned by a test
// (tests/security/rate-limit-bound.test.ts) rather than left implicit.
//
// THIS CEILING IS THE SECOND LINE, NOT THE FIRST. A caller keying on UNAUTHENTICATED input must ALSO
// bound its own key space, so an unresolvable value never mints a bucket at all. `submitRsvp`
// (src/app/actions/group.ts) is the worked example: it resolves the invite token against the database
// FIRST and keys its budget on the resolved `group.groupId`, so the key space is real `booking_group`
// rows rather than anything a caller can type.

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
 * The hard ceiling on live buckets (CR-04). 50,000 entries is ~10MB at the observed ~150-200 bytes
 * each — comfortably above any legitimate single-instance working set (the whole user table plus every
 * active invite link) and far below anything that threatens the process.
 */
const MAX_BUCKETS = 50_000;

/** Exported so a test can assert against the REAL number rather than a copy that could drift from it. */
export const RATE_LIMIT_MAX_BUCKETS = MAX_BUCKETS;

/**
 * A full sweep is O(size), so a sustained flood must not turn every single call into one. Throttled to
 * at most once a second: the sweep is the CHEAP win (it reclaims corpses for free), while the hard
 * eviction below — which is O(1) and runs unconditionally — is what actually holds the invariant.
 */
const SWEEP_INTERVAL_MS = 1_000;
let lastSweepAt = 0;

/** Drop every bucket whose window has already elapsed. */
function sweepExpired(now: number): void {
  for (const k of buckets.keys()) {
    const b = buckets.get(k);
    if (b && now >= b.resetAt) buckets.delete(k);
  }
  lastSweepAt = now;
}

/**
 * Make room for one more bucket, so the post-condition `size <= MAX_BUCKETS` holds after the insert
 * that follows. Sweep first (free), then evict in `Map` insertion order until the store is strictly
 * under the ceiling — see the T-08-36 tradeoff note in the file header.
 */
function enforceCeiling(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;

  if (now - lastSweepAt >= SWEEP_INTERVAL_MS) sweepExpired(now);
  if (buckets.size < MAX_BUCKETS) return;

  // The sweep found nothing reclaimable — a flood of distinct keys inside a single window expires
  // nothing at all — so drop the oldest-inserted entries until there is room.
  for (const k of buckets.keys()) {
    if (buckets.size < MAX_BUCKETS) break;
    buckets.delete(k);
  }
}

/**
 * Fixed-window limiter. Returns `{ ok: true }` while `key` is under `max` hits in the current
 * `window`, otherwise `{ ok: false, retryAfter }` where `retryAfter` is whole seconds until the
 * window resets. Called with `{ window: 60, max: 5 }` it mirrors the Better-Auth
 * credential-endpoint budget used in src/lib/auth.ts.
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowMs = opts.window * 1000;

  // CR-04 — hold the ceiling BEFORE the write below can breach it. Runs on every call because the
  // key that breaches it is, by definition, one nobody predicted.
  enforceCeiling(now);

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

// ── Test seams (NOT part of the production contract) ────────────────────────────────────────────────
// Prefixed with `__` to mark them as such. They exist for the CR-04 regression tests
// (tests/security/rate-limit-bound.test.ts, tests/group/rsvp-rate-limit.test.ts), which assert facts
// about the STORE — "an unknown token minted no bucket", "the flood stayed under the ceiling" — that
// are unobservable through the RateLimitResult contract. No production code may call either one.

/** The number of live buckets. */
export function __rateLimitBucketCount(): number {
  return buckets.size;
}

/** Clear the store (and the sweep clock) so one test file cannot inherit another's module state. */
export function __resetRateLimit(): void {
  buckets.clear();
  lastSweepAt = 0;
}
