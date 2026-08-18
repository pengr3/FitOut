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
//
// ── PHASE 12 (D-38) — THE SHAPE WIDENED AND BOTH HALVES HAD TO SURVIVE IT ───────────────────────────
// Each value became `{space, fee, total}` so the rail can render the REAL itemised `PriceBreakdown`.
// Every assertion below now reads `.total` where it read a bare number, and NOT ONE of them was
// weakened to accommodate that. Case (5) is where the trap actually was: `expect(table.fullDay).not
// .toBe(table.hourly[24])` used to compare two INTEGERS, and over two freshly-built objects it would
// have passed on reference inequality alone — green forever, including for a table that had started
// quoting the cheaper hourly run as the day rate. It compares the two `.total` integers now.
//
// Case (7) is the new invariant the widening earned: `space + fee === total`, per key, over a rate that
// lands the fee on a .5 rounding tie. It is what makes the table safe to render as three lines — the
// three figures a booker reads must add up to the one they agree to pay.

import { describe, it, expect } from "vitest";
import { buildAllInTable, type AllInParts } from "@/lib/booking/all-in-table";
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
      expect(table.hourly[hours].total, `hours=${hours}`).toBe(
        computeServiceFee(frozenSpaceCents).allInCents,
      );
      // D-38 — and the OTHER TWO figures are the same call's, not a plausible reconstruction. `space`
      // is the quote's own space price and `fee` is the guarded module's `serviceFeeCents`, so the
      // three lines the rail draws are the three lines checkout draws for this same selection.
      expect(table.hourly[hours].space, `hours=${hours}`).toBe(frozenSpaceCents);
      expect(table.hourly[hours].fee, `hours=${hours}`).toBe(
        computeServiceFee(frozenSpaceCents).serviceFeeCents,
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
      drifts.push(allInUnit * hours - table.hourly[hours].total);
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
      const fee = computeServiceFee(PER_HEAD * n);
      expect(table.perPass[n].total).toBe(fee.allInCents);
      expect(table.perPass[n].space).toBe(PER_HEAD * n);
      expect(table.perPass[n].fee).toBe(fee.serviceFeeCents);
    }
    // The rail renders no price block for a key it does not have — never a computed fallback.
    expect(table.perPass[5]).toBeUndefined();
  });

  it("(4) a null rate yields an ABSENT branch, not a zero", () => {
    // A zero here would render a ₱0.00 line — a wrong number is worse than no number on a money surface.
    // Still `null` / `{}` after the widening, and NOT a zero-filled `{space:0, fee:0, total:0}`: an
    // AllInParts of zeroes is exactly the shape that renders three convincing ₱0.00 lines.
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
    expect(dayOnly.fullDay).toEqual({
      space: DAY,
      fee: computeServiceFee(DAY).serviceFeeCents,
      total: computeServiceFee(DAY).allInCents,
    });
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
    expect(table.fullDay?.total).toBe(computeServiceFee(DAY).allInCents);
    // `.total` on BOTH sides, deliberately. `expect(objectA).not.toBe(objectB)` is reference inequality
    // between two freshly-built objects — true for every possible table, including one that had silently
    // started pricing a full day as 24 hourly hours. See the D-38 note in the header.
    expect(table.fullDay?.total).not.toBe(table.hourly[ALL_IN_TABLE_MAX_HOURS].total);
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

  // ─────────────────────────────────────────────────────────────────────────────────────────────────
  // (7) D-38 — THE INVARIANT THAT MAKES THE WIDENED TABLE SAFE TO RENDER AS THREE LINES
  // ─────────────────────────────────────────────────────────────────────────────────────────────────
  it("(7) space + fee === total, exactly, on every populated key — across the rounding edge", () => {
    // WHY THIS ASSERTION EXISTS AT ALL. Before D-38 the rail showed ONE figure, so a wrong split was not
    // expressible. It now shows three, and a booker reads them as arithmetic: run line, service fee,
    // Total. If those three ever fail to add up, the surface is telling a booker something false about
    // money — and `PriceBreakdown` cannot catch it, because its whole contract is that it computes
    // nothing. The invariant has to be guaranteed by the module that produces the figures.
    //
    // THE RATES ARE CHOSEN, NOT ARBITRARY. `SERVICE_FEE_BPS` is 500 (5%), so the fee is spacePrice / 20:
    //   • 30750  → 1537.5   — the exact .5 TIE, where `Math.round` has to break a draw. Multiplied by an
    //                          even hour count it lands back on an integer, so ONE rate exercises both
    //                          sides of the branch across the 24 keys.
    //   • 33333  → 1666.65  — a non-tie fraction, rounding DOWN.
    //   • 30     → 1.5      — the tie again at a magnitude where a one-centavo split error is 3% of the
    //                          fee rather than invisible.
    //   • 1      → 0.05     — rounds to ZERO. `fee: 0` with `space === total` is a legitimate row, and a
    //                          derivation that treated a zero fee as "no figure" would break here.
    //   • 999983 → 49999.15 — a large prime-ish rate; ×24 crosses ₱240,000 with a fraction the whole way.
    const EDGE_RATES = [30750, 33333, 30, 1, 999983] as const;

    let populated = 0;
    for (const rate of EDGE_RATES) {
      const table = buildAllInTable({
        hourlyRateCents: rate,
        dayRateCents: rate * 7,
        perHeadPriceCents: rate,
        passCap: 6,
      });

      const rows: Array<[string, AllInParts]> = [];
      for (const [k, v] of Object.entries(table.hourly)) rows.push([`rate=${rate} hourly[${k}]`, v]);
      for (const [k, v] of Object.entries(table.perPass)) rows.push([`rate=${rate} perPass[${k}]`, v]);
      if (table.fullDay !== null) rows.push([`rate=${rate} fullDay`, table.fullDay]);

      for (const [where, parts] of rows) {
        populated += 1;
        // The invariant itself. `toBe` and not `toBeCloseTo`: these are integer centavos, and "close"
        // is precisely the failure mode a money surface must not have.
        expect(parts.space + parts.fee, where).toBe(parts.total);
        // …and all three are integers. A float here would render as "₱1,537.5" through `formatMoney`'s
        // fixed-2 fallback and, worse, would mean the fee was never rounded at all.
        expect(Number.isInteger(parts.space), where).toBe(true);
        expect(Number.isInteger(parts.fee), where).toBe(true);
        expect(Number.isInteger(parts.total), where).toBe(true);
        expect(parts.fee, where).toBeGreaterThanOrEqual(0);
        // The split is the GUARDED module's split, not a plausible reconstruction of one. This is what
        // rules out the shape where `fee` is recomputed from `total` by a second rounding — it would
        // agree with the line above on most keys and disagree exactly on the ties.
        const authoritative = computeServiceFee(parts.space);
        expect(parts.fee, where).toBe(authoritative.serviceFeeCents);
        expect(parts.total, where).toBe(authoritative.allInCents);
      }
    }

    // GUARD-THE-GUARD. Every assertion above is inside a loop over table entries, and a `buildAllInTable`
    // that returned empty objects would satisfy all of them by iterating nothing. 5 rates x (24 hourly +
    // 6 passes + 1 fullDay) = 155.
    expect(
      populated,
      "the invariant loop ran over an empty table — every `space + fee === total` above is green " +
        "because nothing was checked, which is the one way this assertion can lie.",
    ).toBe(EDGE_RATES.length * (ALL_IN_TABLE_MAX_HOURS + 6 + 1));

    // The tie really was exercised, rather than asserted about a table that happened to round cleanly.
    // 30750 / 20 = 1537.5 — `Math.round` breaks it upward, so the fee is 1538 and NOT 1537.
    expect(computeServiceFee(30750).serviceFeeCents).toBe(1538);
    expect(buildAllInTable({
      hourlyRateCents: 30750,
      dayRateCents: null,
      perHeadPriceCents: null,
      passCap: null,
    }).hourly[1]).toEqual({ space: 30750, fee: 1538, total: 32288 });
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
//   • Case (7) proves the three figures ADD UP. It says nothing about whether the component that
//     renders them puts each on the right LINE — a table whose `space` and `fee` were swapped would
//     satisfy every assertion here and would label platform revenue as the host's. That is a render
//     claim; `e2e/price-one-fact.spec.ts` (plan 12-05) is where it belongs.
//   • Nothing here measures the RSC PAYLOAD the widening costs. That was measured once, at the shape
//     change, and the number is recorded in `.planning/…/12-04-SUMMARY.md`; it is not a property a unit
//     test can watch, because the serialised size depends on the page rather than on this module.
