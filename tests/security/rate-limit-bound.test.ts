// CR-04 (BLOCKER) — the rate-limit store must be HARD-BOUNDED.
//
// THE THREAT, stated plainly: `src/lib/rate-limit.ts` keeps its counters in a module-level `Map` that,
// until this plan, was never evicted from. Every caller before Phase 8 keyed on an AUTHENTICATED
// `userId`, so the key space was bounded by the user table. `submitRsvp` (the app's one session-less
// write) then keyed on a caller-supplied invite token — `32^20` selectable values, each buying a
// permanent ~150-200 byte entry with no session, no group and no database row behind it. On a
// container host that is memory exhaustion against the whole app, and it takes the booking path — the
// core value — down with it.
//
// This file pins the SECOND of the two independent bounds (the first, "an unresolvable token mints no
// bucket at all", lives in tests/group/rsvp-rate-limit.test.ts):
//
//   1. A flood of DISTINCT keys inside ONE window cannot push the store past `RATE_LIMIT_MAX_BUCKETS`.
//      The sweep alone cannot do this — nothing expires inside a single window — so this case is what
//      makes the hard insertion-order eviction non-optional. Deleting the eviction loop turns it RED.
//   2. Buckets whose window has ELAPSED are swept, so a long-lived process does not pay the eviction
//      price for corpses. Asserted as an EXACT count so eviction cannot be mistaken for the sweep.
//   3. The shipped budget contract is UNCHANGED by either mechanism (first hit ok, `max`-th hit ok,
//      `max + 1`-th hit a structured denial with `retryAfter >= 1`).
//   4. The accepted tradeoff (T-08-36) is asserted rather than assumed: a still-LIVE key evicted under
//      pressure gets a fresh window on its next hit. Bounded memory beats an exact budget under attack;
//      writing it down as a test is how it stays a stated tradeoff instead of a latent surprise.
//
// `__resetRateLimit()` runs in `beforeEach` because the store is module-level state that outlives a
// single test — without it these cases would be at the mercy of whatever else ran first in the worker.

import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  rateLimit,
  RATE_LIMIT_MAX_BUCKETS,
  __rateLimitBucketCount,
  __resetRateLimit,
} from "@/lib/rate-limit";

/** One window, wide enough that nothing under test expires by accident. */
const OPTS = { window: 60, max: 30 } as const;

beforeEach(() => {
  __resetRateLimit();
});

describe("CR-04 — the bucket store has a pinned hard ceiling", () => {
  it("pins the ceiling at 50,000 (the number, not a copy of it)", () => {
    expect(RATE_LIMIT_MAX_BUCKETS).toBe(50_000);
  });

  it("stays at or below the ceiling after 60,000 DISTINCT keys inside one window", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-07-28T00:00:00.000Z"));
      expect(__rateLimitBucketCount()).toBe(0);

      const FLOOD = 60_000;
      let allowed = 0;
      for (let i = 0; i < FLOOD; i++) {
        // Distinct keys, first hit each — this is the unauthenticated attacker's shape exactly.
        if (rateLimit(`flood:${i}`, OPTS).ok) allowed += 1;
      }

      // Every first hit is ALLOWED: bounding the store must not turn into a stealth global limiter.
      expect(allowed).toBe(FLOOD);

      // THE ASSERTION CR-04 EXISTS FOR.
      expect(__rateLimitBucketCount()).toBeLessThanOrEqual(RATE_LIMIT_MAX_BUCKETS);

      // POSITIVE CONTROL: the keys really were distinct, so an unbounded store WOULD have held 60,000.
      // Without this the case above would also pass against a limiter that silently stored nothing.
      expect(__rateLimitBucketCount()).toBeLessThan(FLOOD);
      expect(__rateLimitBucketCount()).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("SWEEPS elapsed buckets rather than evicting live ones, so corpses do not accumulate", () => {
    vi.useFakeTimers();
    try {
      const t0 = new Date("2026-07-28T00:00:00.000Z");
      vi.setSystemTime(t0);

      // Fill the store exactly to the ceiling. No eviction runs during this fill.
      for (let i = 0; i < RATE_LIMIT_MAX_BUCKETS; i++) rateLimit(`stale:${i}`, OPTS);
      expect(__rateLimitBucketCount()).toBe(RATE_LIMIT_MAX_BUCKETS);

      // Walk past every one of those windows, then touch the store once.
      vi.setSystemTime(new Date(t0.getTime() + 61_000));
      expect(rateLimit("fresh:1", OPTS).ok).toBe(true);

      // EXACTLY one. Insertion-order eviction alone would have removed a single entry and left ~50,000,
      // so this count is what proves the SWEEP ran and not merely the eviction loop.
      expect(__rateLimitBucketCount()).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("CR-04 — the shipped budget contract is unchanged", () => {
  it("allows the first hit, allows the `max`-th, and denies the next with retryAfter >= 1", () => {
    const key = "bound:contract";

    expect(rateLimit(key, OPTS)).toEqual({ ok: true });
    for (let i = 1; i < OPTS.max; i++) {
      expect(rateLimit(key, OPTS).ok).toBe(true);
    }

    const overBudget = rateLimit(key, OPTS);
    expect(overBudget.ok).toBe(false);
    if (!overBudget.ok) {
      expect(overBudget.retryAfter).toBeGreaterThanOrEqual(1);
      expect(overBudget.retryAfter).toBeLessThanOrEqual(OPTS.window);
    }
  });

  it("isolates keys from each other — the ceiling is not a shared global bucket", () => {
    const opts = { window: 60, max: 2 } as const;
    rateLimit("bound:A", opts);
    rateLimit("bound:A", opts);
    expect(rateLimit("bound:A", opts).ok).toBe(false);
    expect(rateLimit("bound:B", opts).ok).toBe(true);
  });
});

describe("T-08-36 — the accepted eviction tradeoff, written down", () => {
  it("gives a LIVE key evicted under flood a fresh window on its next hit", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-07-28T00:00:00.000Z"));
      const opts = { window: 60, max: 1 } as const;

      // The victim goes in FIRST, so insertion-order eviction reaches it first.
      expect(rateLimit("victim", opts).ok).toBe(true);
      expect(rateLimit("victim", opts).ok).toBe(false); // exhausted, still inside its window

      // Flood past the ceiling. Nothing has expired — the eviction loop is the only thing that can act.
      for (let i = 0; i < RATE_LIMIT_MAX_BUCKETS + 100; i++) rateLimit(`evictor:${i}`, opts);
      expect(__rateLimitBucketCount()).toBeLessThanOrEqual(RATE_LIMIT_MAX_BUCKETS);

      // The victim lost its window. This is the DOCUMENTED tradeoff (bounded memory over an exact budget
      // under attack), not a silent bug — and it is still a real window: the very next hit is denied.
      expect(rateLimit("victim", opts).ok).toBe(true);
      expect(rateLimit("victim", opts).ok).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
