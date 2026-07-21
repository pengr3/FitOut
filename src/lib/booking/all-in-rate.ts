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
// Pure/isomorphic: no client and no server directive, so an RSC and the search query mapping can both
// import it. It formats only — every amount it is handed is already an integer number of centavos.

import { computeServiceFee } from "@/lib/payments/service-fee";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";

/**
 * The advertised rate parts for a listing, fee-inclusive: `["₱525/hr", "₱2,625/day"]`. A null rate is
 * omitted (a listing may offer only one of the two), so the result may be empty — callers render their
 * own "Price on request" fallback, exactly as they did before the fee existed.
 */
export function allInRateParts(
  listing: { hourlyRateCents: number | null; dayRateCents: number | null },
  currency: string = DISPLAY_CURRENCY,
): string[] {
  const parts: string[] = [];
  if (listing.hourlyRateCents != null) {
    parts.push(`${formatMoney(computeServiceFee(listing.hourlyRateCents).allInCents, currency)}/hr`);
  }
  if (listing.dayRateCents != null) {
    parts.push(`${formatMoney(computeServiceFee(listing.dayRateCents).allInCents, currency)}/day`);
  }
  return parts;
}

/** Whether any all-in rate is being shown — i.e. whether the `Service fee included` qualifier applies. */
export function hasAllInRate(listing: {
  hourlyRateCents: number | null;
  dayRateCents: number | null;
}): boolean {
  return listing.hourlyRateCents != null || listing.dayRateCents != null;
}
