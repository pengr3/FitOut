// T-11-PRICEDRIFT (D-130 / GATE-05) — the booking rail's all-in table agrees with what checkout freezes,
// and the alternative that was rejected does not.
//
// WHY THIS FILE EXISTS. Plan 11-01 moved the rail's price arithmetic off the client, and it had a choice
// of two shapes: ship a per-unit all-in RATE and multiply in the browser, or ship a TABLE keyed by the
// selection. Both keep SERVICE_FEE_BPS out of the bundle, so the leak grep cannot tell them apart and
// neither can the build. The reason the table won is a ROUNDING property, and a rounding property stated
// only in a comment is one a future "simplification" will delete. Case (2) below is the whole argument,
// executable.
//
// The rail summaries have no render test of their own — they did not have one before this plan either —
// so this file asserts the CONTRACT they consume rather than the pixels they draw. That boundary is
// deliberate and is restated in the NOT COVERED footer.

import { describe, it, expect } from "vitest";
import { buildAllInTable } from "@/lib/booking/all-in-table";
import { computeServiceFee } from "@/lib/payments/service-fee";
import { quoteWindow } from "@/lib/booking/pricing";
import { ALL_IN_TABLE_MAX_HOURS } from "@/lib/availability/horizon";

const HOURLY = 30750; // ₱307.50 — the seeded court rate the card tests also use
const DAY = 180000; // ₱1,800.00
const PER_HEAD = 35000; // ₱350.00

describe("the rail's all-in table (T-11-PRICEDRIFT)", () => {
  it("(1) every hourly row equals the fee applied to the SAME space price checkout freezes", () => {
    const table = buildAllInTable({
      hourlyRateCents: HOURLY,
      dayRateCents: DAY,
      perHeadPriceCents: null,
      passCap: null,
    });

    for (let hours = 1; hours <= ALL_IN_TABLE_MAX_HOURS; hours++) {
      // What the hold actually freezes for a window of this length (D-45: hourlyRate × N, no cap).
      const start = new Date("2026-09-01T02:00:00.000Z");
      const end = new Date(start.getTime() + hours * 3_600_000);
      const frozenSpaceCents = quoteWindow({
        startUtc: start,
        endUtc: end,
        fullDay: false,
        hourlyRateCents: HOURLY,
        dayRateCents: DAY,
      }).totalCents;

      expect(frozenSpaceCents, `hours=${hours}`).toBe(HOURLY * hours);
      // Byte-identical, not merely close: the browsed figure IS the charged figure (D-75).
      expect(table.hourly[hours], `hours=${hours}`).toBe(
        computeServiceFee(frozenSpaceCents).allInCents,
      );
    }
  });

  it("(2) the REJECTED shape — a client-side multiply of an all-in unit rate — really does drift", () => {
    // This is the measurement that decided the props contract. If it ever stops holding, the table is no
    // longer buying anything and the decision should be revisited deliberately rather than by accident.
    const table = buildAllInTable({
      hourlyRateCents: HOURLY,
      dayRateCents: null,
      perHeadPriceCents: null,
      passCap: null,
    });
    const allInUnit = computeServiceFee(HOURLY).allInCents; // what the rejected shape would have shipped

    const drifts: number[] = [];
    for (let hours = 1; hours <= ALL_IN_TABLE_MAX_HOURS; hours++) {
      drifts.push(allInUnit * hours - table.hourly[hours]);
    }

    // At ₱307.50 the fee is 1537.5 centavos, so the single rounding gains half a centavo per hour and the
    // multiply runs AHEAD — i.e. the rejected shape would have quoted MORE than checkout charges, which is
    // the D-75 failure ("the number goes up between browsing and paying") in its exact forbidden direction.
    expect(drifts.some((d) => d !== 0)).toBe(true);
    expect(Math.max(...drifts)).toBeGreaterThan(0);
    // Bounded by n−1 centavos, as the module header claims.
    for (let i = 0; i < drifts.length; i++) {
      expect(Math.abs(drifts[i])).toBeLessThanOrEqual(i); // i = hours − 1
    }
  });

  it("(3) per-pass rows equal the fee on the linear space price, and are capped by the cap", () => {
    const table = buildAllInTable({
      hourlyRateCents: null,
      dayRateCents: null,
      perHeadPriceCents: PER_HEAD,
      passCap: 4,
    });

    expect(Object.keys(table.perPass)).toEqual(["1", "2", "3", "4"]);
    for (let n = 1; n <= 4; n++) {
      expect(table.perPass[n]).toBe(computeServiceFee(PER_HEAD * n).allInCents);
    }
    // The rail renders no estimate for a key it does not have — never a computed fallback.
    expect(table.perPass[5]).toBeUndefined();
  });

  it("(4) a null rate yields an ABSENT branch, not a zero", () => {
    // A zero here would render "Est. ₱0.00" — a wrong number is worse than no number on a money surface.
    const none = buildAllInTable({
      hourlyRateCents: null,
      dayRateCents: null,
      perHeadPriceCents: null,
      passCap: 10,
    });
    expect(none.hourly).toEqual({});
    expect(none.perPass).toEqual({});
    expect(none.fullDay).toBeNull();

    const dayOnly = buildAllInTable({
      hourlyRateCents: null,
      dayRateCents: DAY,
      perHeadPriceCents: null,
      passCap: null,
    });
    expect(dayOnly.fullDay).toBe(computeServiceFee(DAY).allInCents);
    expect(dayOnly.hourly).toEqual({});
  });

  it("(5) the full-day figure is the DAY rate, never a capped or auto-switched hourly run", () => {
    // D-45 is DISTINCT pricing: a full day costs the day rate verbatim even when 24 hourly hours is
    // cheaper. Asserted here because the table is the surface where the two sit side by side and an
    // "obvious" min() would look like a kindness.
    const table = buildAllInTable({
      hourlyRateCents: 1000, // 24h = ₱240.00, far cheaper than the ₱1,800 day rate
      dayRateCents: DAY,
      perHeadPriceCents: null,
      passCap: null,
    });
    expect(table.fullDay).toBe(computeServiceFee(DAY).allInCents);
    expect(table.fullDay).not.toBe(table.hourly[ALL_IN_TABLE_MAX_HOURS]);
  });

  it("(6) a null/absent pass cap yields no pass rows rather than an unbounded loop", () => {
    const table = buildAllInTable({
      hourlyRateCents: null,
      dayRateCents: null,
      perHeadPriceCents: PER_HEAD,
      passCap: null,
    });
    expect(table.perPass).toEqual({});
  });
});

// NOT COVERED — blind spots, so the next reader under-trusts this file rather than over-trusts it:
//   • It does not render RailSelectionSummary or RailPassSummary. That the components look up
//     `allIn.hourly[hours]` / `allIn.perPass[passes]` — rather than the wrong key, or a stale prop — is
//     unasserted here and was unasserted before this plan too.
//   • It does not prove `listings/[id]/page.tsx` calls buildAllInTable with the right listing columns.
//     A page passing `dayRateCents` where `hourlyRateCents` belongs would pass every case above.
//   • Case (2)'s DIRECTION (the multiply running ahead rather than behind) is a property of this
//     particular rate, not of the arithmetic. The bound in the loop below it is the general claim.
