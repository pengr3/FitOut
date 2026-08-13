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

import { computeServiceFee } from "@/lib/payments/service-fee";
import { ALL_IN_TABLE_MAX_HOURS } from "@/lib/availability/horizon";

/**
 * All-in integer centavos, keyed by the selection the booker actually made. A MISSING KEY means the rail
 * renders no estimate line — the shipped behaviour when a rate is null — and is never a cue to compute one
 * on the client.
 */
export type AllInTable = {
  /** Keyed 1…ALL_IN_TABLE_MAX_HOURS. Empty when the listing has no hourly rate. */
  hourly: Record<number, number>;
  /** The full-day selection's all-in figure, or null when the listing has no day rate. */
  fullDay: number | null;
  /** Keyed 1…passCap. Empty when the listing is not sold as day passes. */
  perPass: Record<number, number>;
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

  const hourly: Record<number, number> = {};
  if (hourlyRateCents != null) {
    for (let h = 1; h <= ALL_IN_TABLE_MAX_HOURS; h++) {
      hourly[h] = computeServiceFee(hourlyRateCents * h).allInCents;
    }
  }

  const perPass: Record<number, number> = {};
  if (perHeadPriceCents != null) {
    for (let n = 1; n <= passCap; n++) {
      perPass[n] = computeServiceFee(perHeadPriceCents * n).allInCents;
    }
  }

  return {
    hourly,
    fullDay: dayRateCents == null ? null : computeServiceFee(dayRateCents).allInCents,
    perPass,
  };
}
