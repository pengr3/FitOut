// WR-06 (Phase-1 deferred, closed in Phase-2 Plan 02): per-identity rate limiting on privileged
// server actions. This unit-tests the reusable limiter (src/lib/rate-limit.ts) that the
// capability-activate actions — and later the Plan-04 Cloudinary sign endpoint + Plan-06 onboarding
// action — wrap around their privileged work.
//
// Contract under test (mirrors the Better-Auth credential-endpoint budget, 5/60s per identity):
//   - the SAME key called > max times inside the window is rejected (with a retryAfter hint)
//   - a DIFFERENT key is unaffected (per-identity isolation, not a global bucket)
//   - the window RESETS once it elapses (fixed-window, driven off Date.now)

import { describe, it, expect, vi } from "vitest";
import { rateLimit, requireWithinRateLimit } from "@/lib/rate-limit";

describe("rateLimit — per-identity fixed window (WR-06)", () => {
  it("allows up to `max` hits then rejects the next one within the window", () => {
    const key = "activate:user-A";
    const opts = { window: 60, max: 5 };

    // The first `max` (5) calls are allowed.
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, opts).ok).toBe(true);
    }

    // The 6th call inside the same window is rejected with a positive retry hint.
    const sixth = rateLimit(key, opts);
    expect(sixth.ok).toBe(false);
    if (!sixth.ok) {
      expect(sixth.retryAfter).toBeGreaterThan(0);
      expect(sixth.retryAfter).toBeLessThanOrEqual(60);
    }
  });

  it("tracks identities independently — a different id is unaffected", () => {
    const opts = { window: 60, max: 5 };

    // Exhaust user-B's budget.
    for (let i = 0; i < 5; i++) rateLimit("activate:user-B", opts);
    expect(rateLimit("activate:user-B", opts).ok).toBe(false);

    // A different identity has its own fresh bucket.
    expect(rateLimit("activate:user-C", opts).ok).toBe(true);
  });

  it("resets the window after it elapses", () => {
    vi.useFakeTimers();
    try {
      const t0 = new Date("2026-07-09T00:00:00.000Z");
      vi.setSystemTime(t0);

      const key = "activate:user-D";
      const opts = { window: 60, max: 5 };

      for (let i = 0; i < 5; i++) rateLimit(key, opts);
      expect(rateLimit(key, opts).ok).toBe(false); // exhausted inside the window

      // Advance past the 60s window — the bucket resets.
      vi.setSystemTime(new Date(t0.getTime() + 61_000));
      expect(rateLimit(key, opts).ok).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("requireWithinRateLimit returns the structured result for early-return", () => {
    const key = "activate:user-E";
    const opts = { window: 60, max: 1 };

    // First hit ok.
    const first = requireWithinRateLimit(key, opts);
    expect(first).toEqual({ ok: true });

    // Second hit over the max-1 budget is a structured denial.
    const blocked = requireWithinRateLimit(key, opts);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfter).toBeGreaterThan(0);
  });
});
