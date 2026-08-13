import "server-only";

// D-75 all-in browse pricing — the SINGLE place a listing's advertised rate has the D-74 service fee
// composed into it, so the search grid and the listing detail page can never drift apart.
//
// D-75: search and listing pages display the ALL-IN rate so the number never goes up between browsing
// and paying. These surfaces create no hold, so nothing is frozen here and the frozen-quote contract is
// unaffected — the invariant holds because both surfaces and checkout use the SAME SERVICE_FEE_BPS.
//
// A RATE, never a promised total. 5% of an hourly rate × N hours can differ by one centavo from 5% of
// (rate × N hours). Labelling these `/hr` and `/day` means no total is promised until checkout, so the
// rounding edge cannot break D-75's "never goes up". Do NOT add a computed "estimated total" to a search
// card — that would create a promise the checkout could break by a centavo.
//
// Why a shared module rather than the formula inline on each surface: two copies of "apply the fee, then
// format" is two places for a future rate or rounding change to be applied to only one of them — and the
// failure mode is a browse price that disagrees with checkout, which is precisely what D-75 forbids. The
// components themselves do ZERO arithmetic; they receive these finished strings as props.
//
// SERVER-ONLY (D-34 / GATE-05). Pure and no-I/O, but NOT isomorphic any more: `import "server-only"` on
// line 1 makes Turbopack hard-FAIL `next build` if any client component's import graph reaches this
// module. An RSC and the search query mapping still import it freely; a CLIENT component receives the
// finished strings as props, which is what the last sentence of the paragraph above already required and
// what `search-result-card.tsx:131-139` has always done. It formats only — every amount it is handed is
// already an integer number of centavos.

import { computeServiceFee } from "@/lib/payments/service-fee";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";

/**
 * What a listing advertises a price FOR. The Phase-9 fields are OPTIONAL (the D-108 optional-props
 * precedent, price-breakdown.tsx:56-67) rather than a discriminated union, so all three shipped exclusive
 * call sites keep compiling untouched and keep rendering byte-for-byte what they render today.
 */
type RateSource = {
  hourlyRateCents: number | null;
  dayRateCents: number | null;
  /** Phase-9 (D-125). Present only on an open-capacity listing. */
  perHeadPriceCents?: number | null;
  /**
   * Phase-9 (OC-01). When the listing is sold as day passes, the hourly/day rate columns are IRRELEVANT and
   * must not be advertised — 09-06 requires a per-head price but never CLEARS the exclusive rate columns, so
   * a drop-in listing can genuinely still carry them (09-07's lesson). Quoting one for a drop-in listing
   * would be a lie about what the booker gets: duration never scales the price (OC-02).
   */
  occupancyMode?: "exclusive" | "open_capacity" | null;
};

/**
 * The advertised rate parts for a listing, fee-inclusive: `["₱525/hr", "₱2,625/day"]`. A null rate is
 * omitted (a listing may offer only one of the two), so the result may be empty — callers render their
 * own "Price on request" fallback, exactly as they did before the fee existed.
 *
 * An open-capacity listing advertises exactly ONE part, `₱367/person` (09-UI-SPEC § 4): what one person pays
 * for one day pass, all-in. Still a rate, not a total — the booker may buy several passes at checkout.
 */
export function allInRateParts(
  listing: RateSource,
  currency: string = DISPLAY_CURRENCY,
): string[] {
  if (listing.occupancyMode === "open_capacity") {
    return listing.perHeadPriceCents == null
      ? []
      : [`${formatMoney(computeServiceFee(listing.perHeadPriceCents).allInCents, currency)}/person`];
  }
  const parts: string[] = [];
  if (listing.hourlyRateCents != null) {
    parts.push(`${formatMoney(computeServiceFee(listing.hourlyRateCents).allInCents, currency)}/hr`);
  }
  if (listing.dayRateCents != null) {
    parts.push(`${formatMoney(computeServiceFee(listing.dayRateCents).allInCents, currency)}/day`);
  }
  return parts;
}

/**
 * Whether any all-in rate is being shown — i.e. whether the `Service fee included` qualifier applies.
 *
 * This MUST carry the same open-capacity branch as `allInRateParts` above, or a drop-in card would show the
 * fee-inclusive `/person` price with the muted qualifier missing: a price silently composed all-in and never
 * said to be, which is the exact browse-vs-checkout mismatch D-75 exists to prevent.
 */
export function hasAllInRate(listing: RateSource): boolean {
  if (listing.occupancyMode === "open_capacity") return listing.perHeadPriceCents != null;
  return listing.hourlyRateCents != null || listing.dayRateCents != null;
}
