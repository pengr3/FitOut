// D-130 / GATE-05 — the booking rail's all-in price TABLE, built server-side.
//
// WHY IT IS A MODULE AND NOT TEN LINES IN `listings/[id]/page.tsx`. The table is the mitigation the threat
// register records for T-11-PRICEDRIFT, and a mitigation that lives inline in a page is one nothing can
// assert. Extracted, the property that justifies the whole shape — that a table is byte-identical to what
// checkout freezes where a client-side multiply is NOT — is a test rather than a paragraph.
//
// Server-only by TRANSITIVITY: it imports the guarded `@/lib/payments/service-fee`, so Turbopack fails the
// build if a client graph ever reaches it. The guard belongs on the computation (D-34), not restated here.
//
// ── WHY A TABLE, MEASURED ────────────────────────────────────────────────────────────────────────────
// The rejected alternative was to ship ONE all-in unit rate and let the client multiply. It keeps
// SERVICE_FEE_BPS out of the bundle just as well, and it is wrong: `computeServiceFee` rounds ONCE, over
// the whole space price, so
//
//     n × allIn(unit)   ≠   allIn(n × unit)
//
// and the two drift by up to n−1 centavos. Both rail call sites state in their own comments that their
// figure is EXACT — the same arithmetic checkout freezes (D-75) — so a multiply would have quietly made
// those sentences false while every gate stayed green. `tests/booking/all-in-table.test.ts` pins both
// halves: the table agrees with checkout, and the multiply does not.
//
// ── D-38 — WHY EACH VALUE IS THREE FIGURES AND NOT ONE ───────────────────────────────────────────────
// The rail renders the REAL `PriceBreakdown` (plan 12-05), which is an ITEMISED surface: a run line, a
// `Service fee` line and a `Total`. So the table hands over `{space, fee, total}` per key instead of the
// single all-in figure it used to. That is a SHAPE change, not a computation move — the fee rate, the
// formula and `computeServiceFee` itself stay exactly where they were, on this side of the boundary.
//
// `fee` IS COMPUTED HERE, AND THAT PLACEMENT IS THE POINT. It is `allInCents − spacePriceCents` from the
// SAME `computeServiceFee` call that produced `total`, evaluated inside this guarded module. The obvious
// alternative — ship `space` and `total` and let the breakdown subtract — would have put a subtraction in
// the browser, and a client that subtracts is a client that can be handed the wrong two numbers and asked
// to produce a plausible third (D-130). The client receives three FINISHED figures and renders them.
//
// The subtraction is exact by construction rather than by luck: `computeServiceFee` rounds ONCE and then
// ADDS (`allInCents = spacePriceCents + serviceFeeCents`, service-fee.ts), so `allInCents − spacePriceCents`
// is that same `serviceFeeCents` integer and never a second rounding. `space + fee === total` is asserted
// per key in the test file, over a rate that lands on the .5 rounding tie.

import { computeServiceFee } from "@/lib/payments/service-fee";
import { ALL_IN_TABLE_MAX_HOURS } from "@/lib/availability/horizon";

/**
 * ONE key's three finished figures, all integer centavos, all computed on the server.
 *
 * `space` is the listing-priced portion (the host payout basis), `fee` is the booker-facing D-74 service
 * fee, and `total` is what would actually be charged. They are the same three values `PriceBreakdown`
 * takes as its frozen money props at checkout, which is what lets ONE component render both surfaces.
 *
 * `space + fee === total` always — but a consumer must never RE-DERIVE any one of the three from the other
 * two. The invariant is a property this module guarantees, not a licence to compute downstream.
 */
export type AllInParts = {
  /** The space price this key prices — `hourlyRate × hours`, the day rate, or `perHead × passes`. */
  space: number;
  /** `computeServiceFee(space)`'s fee, obtained as `allInCents − space` inside this guarded module. */
  fee: number;
  /** `computeServiceFee(space).allInCents` — the figure checkout freezes for this selection. */
  total: number;
};

/**
 * All-in figures, keyed by the selection the booker actually made. A MISSING KEY means the rail renders no
 * price block — the shipped behaviour when a rate is null — and is never a cue to compute one on the client.
 */
export type AllInTable = {
  /** Keyed 1…ALL_IN_TABLE_MAX_HOURS. Empty when the listing has no hourly rate. */
  hourly: Record<number, AllInParts>;
  /** The full-day selection's figures, or null when the listing has no day rate. */
  fullDay: AllInParts | null;
  /** Keyed 1…passCap. Empty when the listing is not sold as day passes. */
  perPass: Record<number, AllInParts>;
};

export type AllInTableInput = {
  hourlyRateCents: number | null;
  dayRateCents: number | null;
  /** Phase-9 (D-125). Present only on an open-capacity listing. */
  perHeadPriceCents: number | null;
  /** `listing.maxOccupancy` — the daily admissions cap, and therefore the most passes anyone can select. */
  passCap: number | null;
};

/**
 * Build the rail's price table.
 *
 * `computeServiceFee`'s rate argument is omitted DELIBERATELY: its default IS `SERVICE_FEE_BPS`, so this
 * table is produced by the same call checkout makes, and there is no second place a rate could be passed
 * differently. That is the whole of the D-75 guarantee — one rate, one rounding, one number.
 */
export function buildAllInTable(input: AllInTableInput): AllInTable {
  const { hourlyRateCents, dayRateCents, perHeadPriceCents } = input;
  const passCap = Math.max(0, input.passCap ?? 0);

  const hourly: Record<number, AllInParts> = {};
  if (hourlyRateCents != null) {
    for (let h = 1; h <= ALL_IN_TABLE_MAX_HOURS; h++) {
      hourly[h] = parts(hourlyRateCents * h);
    }
  }

  const perPass: Record<number, AllInParts> = {};
  if (perHeadPriceCents != null) {
    for (let n = 1; n <= passCap; n++) {
      perPass[n] = parts(perHeadPriceCents * n);
    }
  }

  return {
    hourly,
    fullDay: dayRateCents == null ? null : parts(dayRateCents),
    perPass,
  };
}

/**
 * ONE key's three figures, from ONE `computeServiceFee` call.
 *
 * Not exported, and that is deliberate: the only supported way to obtain an `AllInParts` is to build the
 * table, so there is no second entry point where the rate argument could be supplied differently. The
 * subtraction lives HERE — inside the module the `server-only` guard reaches by transitivity — rather than
 * in the component that renders the three lines. See the D-38 note in the header.
 */
function parts(spaceCents: number): AllInParts {
  const { allInCents } = computeServiceFee(spaceCents);
  return { space: spaceCents, fee: allInCents - spaceCents, total: allInCents };
}
