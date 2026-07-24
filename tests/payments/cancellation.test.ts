// BOOK-07 / PAY-06 refund ladder (D-68) — the pure, integer-cents quote every peso of a booker
// cancellation flows from.
//
// PURE table-driven unit test — no DB/IO — mirroring tests/payments/commission.test.ts. It proves the
// correctness facts SC#2 ("exact refund amount before confirming") rests on:
//   - quoteRefund derives the rung SOLELY from (tier, startsAt, now); rungs are DESCENDING by minHours and
//     the FIRST satisfied rung wins, with the boundary INCLUSIVE (hoursToStart >= minHours).
//   - SINGLE defined rounding rule: spaceRefundCents = Math.round(spacePrice*refundBps/10000), and
//     retainedSpaceCents = spacePrice − spaceRefundCents by SUBTRACTION. Rounding both independently can
//     lose or invent a centavo — the exact class of bug commission.ts guards against. The property test
//     below sweeps the price range and asserts the exact identity.
//   - serviceFeeRefundCents is 0 in EVERY quote (D-74 — the fee is non-refundable), including on a 100%
//     refund, and totalRefundCents === spaceRefundCents (the fee is excluded from what goes back).
//   - The module NEVER reads a clock: `now` is a required parameter, ALWAYS the DB clock. If the preview
//     RSC and the cancel action straddled a rung boundary on two different clocks, the booker would be
//     shown one number and given another.
//   - It is a money guard: throws on a negative/non-integer amount rather than freeze a nonsense refund.

import { describe, it, expect } from "vitest";
import {
  LADDER,
  quoteRefund,
  rungBoundaries,
  bestFutureRungIndex,
  tierOrDefault,
  type CancellationTier,
} from "@/lib/payments/cancellation";

const TIERS: CancellationTier[] = ["flexible", "standard", "strict"];
const HOUR_MS = 3_600_000;

/** A fixed, arbitrary session start. All `now` values are derived from it, so nothing here reads a clock. */
const STARTS_AT = new Date("2026-08-14T10:00:00.000Z");

/** The `now` that sits exactly `hours` before STARTS_AT. Negative `hours` = the session already started. */
const nowAtHoursBefore = (hours: number) => new Date(STARTS_AT.getTime() - hours * HOUR_MS);

/** Quote at a given hours-to-start with the standard ₱1,000 space + ₱50 fee fixture. */
const quoteAt = (tier: CancellationTier, hours: number, spacePriceCents = 100000) =>
  quoteRefund({
    tier,
    spacePriceCents,
    serviceFeeCents: 5000,
    startsAt: STARTS_AT,
    now: nowAtHoursBefore(hours),
  });

describe("LADDER — the D-68 rungs (compressed for FitOut's real lead time)", () => {
  it("flexible is a single 100% rung at 12h", () => {
    expect(LADDER.flexible).toEqual([{ minHours: 12, refundBps: 10000 }]);
  });

  it("standard is 100% >=24h then 50% down to 6h", () => {
    expect(LADDER.standard).toEqual([
      { minHours: 24, refundBps: 10000 },
      { minHours: 6, refundBps: 5000 },
    ]);
  });

  it("strict is 100% >=48h then 50% down to 24h", () => {
    expect(LADDER.strict).toEqual([
      { minHours: 48, refundBps: 10000 },
      { minHours: 24, refundBps: 5000 },
    ]);
  });

  it("every tier's rungs are DESCENDING by minHours (first-match-wins depends on this)", () => {
    for (const tier of TIERS) {
      const mins = LADDER[tier].map((r) => r.minHours);
      expect([...mins].sort((a, b) => b - a)).toEqual(mins);
    }
  });
});

describe("quoteRefund — the ladder matrix (D-68), ₱1,000 space + ₱50 fee", () => {
  it("flexible: 13h before start → 100% refund", () => {
    expect(quoteAt("flexible", 13)).toMatchObject({
      tier: "flexible",
      refundBps: 10000,
      spaceRefundCents: 100000,
      retainedSpaceCents: 0,
      serviceFeeRefundCents: 0,
      totalRefundCents: 100000,
    });
  });

  it("flexible: 12h EXACTLY → 100% (the boundary is inclusive)", () => {
    expect(quoteAt("flexible", 12).refundBps).toBe(10000);
    expect(quoteAt("flexible", 12).spaceRefundCents).toBe(100000);
  });

  it("flexible: 11.9h → 0%, the whole space price is retained", () => {
    expect(quoteAt("flexible", 11.9)).toMatchObject({
      refundBps: 0,
      spaceRefundCents: 0,
      retainedSpaceCents: 100000,
      serviceFeeRefundCents: 0,
      totalRefundCents: 0,
    });
  });

  it("standard: 25h → 100%, 24h EXACTLY → 100%, 23h → 50%", () => {
    expect(quoteAt("standard", 25).refundBps).toBe(10000);
    expect(quoteAt("standard", 24).refundBps).toBe(10000);
    expect(quoteAt("standard", 23).refundBps).toBe(5000);
    expect(quoteAt("standard", 23).spaceRefundCents).toBe(50000);
    expect(quoteAt("standard", 23).retainedSpaceCents).toBe(50000);
  });

  it("standard: 6h EXACTLY → 50%, 5h → 0%", () => {
    expect(quoteAt("standard", 6).refundBps).toBe(5000);
    expect(quoteAt("standard", 5).refundBps).toBe(0);
    expect(quoteAt("standard", 5).retainedSpaceCents).toBe(100000);
  });

  it("strict: 49h → 100%, 48h EXACTLY → 100%, 47h → 50%", () => {
    expect(quoteAt("strict", 49).refundBps).toBe(10000);
    expect(quoteAt("strict", 48).refundBps).toBe(10000);
    expect(quoteAt("strict", 47).refundBps).toBe(5000);
  });

  it("strict: 24h EXACTLY → 50%, 23h → 0%", () => {
    expect(quoteAt("strict", 24).refundBps).toBe(5000);
    expect(quoteAt("strict", 24).spaceRefundCents).toBe(50000);
    expect(quoteAt("strict", 23).refundBps).toBe(0);
  });

  it("every rung boundary: minHours EXACTLY and minHours+1 award the rung, minHours−0.1 does not", () => {
    for (const tier of TIERS) {
      LADDER[tier].forEach((rung, i) => {
        expect(quoteAt(tier, rung.minHours).refundBps).toBe(rung.refundBps);
        expect(quoteAt(tier, rung.minHours + 1).refundBps).toBe(
          // One hour above a rung still sits below the NEXT rung up, unless it crosses it.
          (LADDER[tier].find((r) => rung.minHours + 1 >= r.minHours) ?? rung).refundBps,
        );
        // A hair below this rung drops to the next rung DOWN (or to 0 if this was the last one).
        const below = LADDER[tier][i + 1];
        expect(quoteAt(tier, rung.minHours - 0.1).refundBps).toBe(below?.refundBps ?? 0);
      });
    }
  });

  it("a session that has ALREADY started → 0% for every tier (negative hoursToStart)", () => {
    for (const tier of TIERS) {
      const q = quoteAt(tier, -1);
      expect(q.refundBps).toBe(0);
      expect(q.hoursToStart).toBeLessThan(0);
      expect(q.spaceRefundCents).toBe(0);
      expect(q.retainedSpaceCents).toBe(100000);
      expect(q.totalRefundCents).toBe(0);
    }
  });

  it("reports hoursToStart as the exact fractional distance to startsAt", () => {
    expect(quoteAt("standard", 23.5).hoursToStart).toBeCloseTo(23.5, 10);
    expect(quoteAt("standard", 0).hoursToStart).toBe(0);
  });

  it("echoes the tier it was given back (the SNAPSHOT, never the listing's current tier)", () => {
    for (const tier of TIERS) expect(quoteAt(tier, 100).tier).toBe(tier);
  });
});

describe("quoteRefund — D-74: the service fee is NEVER refunded", () => {
  it("serviceFeeRefundCents === 0 in EVERY quote, including a 100% refund", () => {
    for (const tier of TIERS) {
      for (const hours of [-5, 0, 5, 6, 12, 23, 24, 47, 48, 100]) {
        expect(quoteAt(tier, hours).serviceFeeRefundCents).toBe(0);
      }
    }
  });

  it("totalRefundCents === spaceRefundCents in every quote (the fee is excluded)", () => {
    for (const tier of TIERS) {
      for (const hours of [-5, 0, 5, 6, 12, 23, 24, 47, 48, 100]) {
        const q = quoteAt(tier, hours);
        expect(q.totalRefundCents).toBe(q.spaceRefundCents);
      }
    }
  });

  it("a 100% refund still returns nothing of the fee — the one place a booker could be surprised", () => {
    const q = quoteAt("flexible", 48);
    expect(q.refundBps).toBe(10000);
    expect(q.spaceRefundCents).toBe(100000);
    expect(q.serviceFeeRefundCents).toBe(0);
    expect(q.totalRefundCents).toBe(100000); // NOT 105000 — the ₱50 fee stays with the platform.
  });

  it("the fee amount passed in never influences the space refund", () => {
    const a = quoteRefund({
      tier: "standard",
      spacePriceCents: 100001,
      serviceFeeCents: 0,
      startsAt: STARTS_AT,
      now: nowAtHoursBefore(23),
    });
    const b = quoteRefund({
      tier: "standard",
      spacePriceCents: 100001,
      serviceFeeCents: 999999,
      startsAt: STARTS_AT,
      now: nowAtHoursBefore(23),
    });
    expect(a).toEqual(b);
  });
});

describe("quoteRefund — rounding discipline (no centavo lost or invented)", () => {
  const SWEEP = [0, 1, 3, 7, 99, 101, 999, 1001, 12345, 99999, 100001];

  it("property: spaceRefundCents + retainedSpaceCents === spacePriceCents, every tier × rung × price", () => {
    for (const tier of TIERS) {
      // Every rung boundary plus one hour on each side of it, plus the below-all-rungs and started cases.
      const hourPoints = [
        ...LADDER[tier].flatMap((r) => [r.minHours - 0.1, r.minHours, r.minHours + 1]),
        0,
        -3,
        1000,
      ];
      for (const hours of hourPoints) {
        for (const spacePriceCents of SWEEP) {
          const q = quoteAt(tier, hours, spacePriceCents);
          expect(q.spaceRefundCents + q.retainedSpaceCents).toBe(spacePriceCents);
          expect(Number.isInteger(q.spaceRefundCents)).toBe(true);
          expect(Number.isInteger(q.retainedSpaceCents)).toBe(true);
          expect(q.spaceRefundCents).toBeGreaterThanOrEqual(0);
          expect(q.retainedSpaceCents).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("an odd price at 50% rounds the refund and derives the remainder by subtraction", () => {
    // 101 * 5000 / 10000 = 50.5 → Math.round → 51 (refund); retained = 101 − 51 = 50. Sum is exactly 101.
    const q = quoteAt("standard", 23, 101);
    expect(q.spaceRefundCents).toBe(51);
    expect(q.retainedSpaceCents).toBe(50);
    expect(q.spaceRefundCents + q.retainedSpaceCents).toBe(101);
  });

  it("a 1-cent space price at 50% rounds the refund UP to 1 → retained 0", () => {
    // 1 * 5000 / 10000 = 0.5 → Math.round → 1; retained = 0. Still sums exactly.
    const q = quoteAt("standard", 23, 1);
    expect(q.spaceRefundCents).toBe(1);
    expect(q.retainedSpaceCents).toBe(0);
  });

  it("price 0 → all zeros for every tier and rung", () => {
    for (const tier of TIERS) {
      const q = quoteAt(tier, 1000, 0);
      expect(q.spaceRefundCents).toBe(0);
      expect(q.retainedSpaceCents).toBe(0);
      expect(q.totalRefundCents).toBe(0);
    }
  });
});

describe("quoteRefund — money guards and clock discipline", () => {
  it("throws on a non-integer space price (integer minor units only)", () => {
    expect(() =>
      quoteRefund({
        tier: "standard",
        spacePriceCents: 1.5,
        serviceFeeCents: 5000,
        startsAt: STARTS_AT,
        now: nowAtHoursBefore(10),
      }),
    ).toThrow("space price must be a non-negative integer number of centavos");
  });

  it("throws on a negative space price (money guard — never a nonsense refund)", () => {
    expect(() =>
      quoteRefund({
        tier: "standard",
        spacePriceCents: -1,
        serviceFeeCents: 5000,
        startsAt: STARTS_AT,
        now: nowAtHoursBefore(10),
      }),
    ).toThrow("space price must be a non-negative integer number of centavos");
  });

  it("throws on a negative or non-integer service fee", () => {
    const base = { tier: "standard" as const, spacePriceCents: 100000, startsAt: STARTS_AT };
    expect(() =>
      quoteRefund({ ...base, serviceFeeCents: -1, now: nowAtHoursBefore(10) }),
    ).toThrow("service fee must be a non-negative integer number of centavos");
    expect(() =>
      quoteRefund({ ...base, serviceFeeCents: 0.5, now: nowAtHoursBefore(10) }),
    ).toThrow("service fee must be a non-negative integer number of centavos");
  });

  it("is a PURE function of its inputs — same inputs, same output, every time", () => {
    const input = {
      tier: "strict" as const,
      spacePriceCents: 123457,
      serviceFeeCents: 6173,
      startsAt: STARTS_AT,
      now: nowAtHoursBefore(30),
    };
    expect(quoteRefund(input)).toEqual(quoteRefund(input));
  });

  it("hours-to-start is absolute-instant math, so it is DST-safe", () => {
    // A window spanning a US DST transition (2026-11-01 06:00Z). The wall clock shifts; the instants do not.
    const startsAt = new Date("2026-11-01T18:00:00.000Z");
    const now = new Date("2026-10-31T18:00:00.000Z"); // exactly 24h earlier as an instant
    const q = quoteRefund({
      tier: "standard",
      spacePriceCents: 100000,
      serviceFeeCents: 5000,
      startsAt,
      now,
    });
    expect(q.hoursToStart).toBe(24);
    expect(q.refundBps).toBe(10000); // NOT 5000 — a wall-clock diff would have read 25h or 23h here.
  });
});

describe("rungBoundaries — D-81 concrete-date disclosure", () => {
  it("standard returns the 24h and 6h instants before startsAt, in that order", () => {
    const b = rungBoundaries("standard", STARTS_AT);
    expect(b).toHaveLength(2);
    expect(b[0].refundBps).toBe(10000);
    expect(b[0].boundary.getTime()).toBe(STARTS_AT.getTime() - 24 * HOUR_MS);
    expect(b[1].refundBps).toBe(5000);
    expect(b[1].boundary.getTime()).toBe(STARTS_AT.getTime() - 6 * HOUR_MS);
  });

  it("flexible returns a single 12h boundary; strict returns 48h then 24h", () => {
    const f = rungBoundaries("flexible", STARTS_AT);
    expect(f).toHaveLength(1);
    expect(f[0].boundary.getTime()).toBe(STARTS_AT.getTime() - 12 * HOUR_MS);

    const s = rungBoundaries("strict", STARTS_AT);
    expect(s.map((r) => r.boundary.getTime())).toEqual([
      STARTS_AT.getTime() - 48 * HOUR_MS,
      STARTS_AT.getTime() - 24 * HOUR_MS,
    ]);
  });

  it("agrees with quoteRefund: at a boundary instant EXACTLY, that rung is awarded", () => {
    for (const tier of TIERS) {
      for (const { refundBps, boundary } of rungBoundaries(tier, STARTS_AT)) {
        expect(
          quoteRefund({
            tier,
            spacePriceCents: 100000,
            serviceFeeCents: 5000,
            startsAt: STARTS_AT,
            now: boundary,
          }).refundBps,
        ).toBe(refundBps);
      }
    }
  });

  it("does not format anything — boundaries are raw instants for the caller to localise", () => {
    for (const { boundary } of rungBoundaries("standard", STARTS_AT)) {
      expect(boundary).toBeInstanceOf(Date);
    }
  });
});

describe("bestFutureRungIndex — the best rung STILL OPEN at `now` (T4-rung)", () => {
  // Because rungs are DESCENDING by minHours, their boundaries (startsAt − minHours) are ASCENDING in
  // time. The "best rung still open" is therefore the FIRST index whose boundary is strictly in the
  // future — the same array `rungBoundaries` returns, index-aligned with `LADDER[tier]`.

  it("standard: BETWEEN the 24h and 6h boundaries → 1 (the 50% rung is the best still open)", () => {
    // now = 12h before start: the 100% (24h) boundary has lapsed, the 50% (6h) boundary has not.
    expect(bestFutureRungIndex("standard", STARTS_AT, nowAtHoursBefore(12))).toBe(1);
  });

  it("standard: well before start (both boundaries still future) → 0 (the 100% rung is open)", () => {
    expect(bestFutureRungIndex("standard", STARTS_AT, nowAtHoursBefore(30))).toBe(0);
  });

  it("standard: near/after start (both boundaries lapsed) → -1 (no rung open)", () => {
    expect(bestFutureRungIndex("standard", STARTS_AT, nowAtHoursBefore(3))).toBe(-1);
    expect(bestFutureRungIndex("standard", STARTS_AT, nowAtHoursBefore(-1))).toBe(-1);
  });

  it("flexible: 0 while the single 12h boundary is future, -1 once it has passed", () => {
    expect(bestFutureRungIndex("flexible", STARTS_AT, nowAtHoursBefore(13))).toBe(0);
    expect(bestFutureRungIndex("flexible", STARTS_AT, nowAtHoursBefore(6))).toBe(-1);
  });

  it("is the FIRST boundary STRICTLY in the future, agreeing with rungBoundaries at every tier", () => {
    for (const tier of TIERS) {
      const boundaries = rungBoundaries(tier, STARTS_AT);
      // A hair before the earliest boundary: the most generous rung (index 0) is open.
      const beforeFirst = new Date(boundaries[0].boundary.getTime() - 1);
      expect(bestFutureRungIndex(tier, STARTS_AT, beforeFirst)).toBe(0);
      // A hair before the LAST boundary: only that last rung is still open.
      const beforeLast = new Date(boundaries[boundaries.length - 1].boundary.getTime() - 1);
      expect(bestFutureRungIndex(tier, STARTS_AT, beforeLast)).toBe(boundaries.length - 1);
      // Exactly ON the last boundary: not strictly future → the summary shows no window (display-only,
      // conservative; the ENGINE still awards the inclusive rung — this feeds copy, never money).
      expect(bestFutureRungIndex(tier, STARTS_AT, boundaries[boundaries.length - 1].boundary)).toBe(-1);
    }
  });
});

describe("tierOrDefault — pre-Phase-7 bookings with a NULL tier", () => {
  it("falls back to flexible, the most booker-friendly option (D-62 precedent)", () => {
    expect(tierOrDefault(null)).toBe("flexible");
    expect(tierOrDefault(undefined)).toBe("flexible");
  });

  it("passes a real tier through untouched", () => {
    for (const tier of TIERS) expect(tierOrDefault(tier)).toBe(tier);
  });
});
