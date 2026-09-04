// The host "Your listings" tile's price line, composed SERVER-SIDE (D-130 / GATE-05).
//
// WHY THIS MODULE EXISTS. `listing-card.tsx` is a `"use client"` shell and it used to compose this line
// itself, which put `allInRateParts` — and therefore `SERVICE_FEE_BPS` — into the browser bundle. A
// non-`NEXT_PUBLIC_` env override does not reach the browser, so the tile would silently keep showing 5%
// while checkout charged the configured rate. The card now receives FINISHED STRINGS and does zero
// arithmetic; this is where the arithmetic went. Same seam `src/lib/search/query.ts` already puts between
// `allInRateParts` and `SearchResultCard`.
//
// It is server-only by TRANSITIVITY rather than by its own directive: it imports the guarded
// `@/lib/booking/all-in-rate`, so Turbopack fails the build if a client graph ever reaches it. That is
// deliberate — the guard belongs on the computation, and re-declaring it here would be a second place to
// keep in sync (D-34: the deny-list is drawn at computation modules).
//
// THE FORK IS THE CONTRACT (09-14 / 09-UI-SPEC § 4). A drop-in listing is priced PER PERSON and an
// exclusive one by the hour/day, and the fork keys on the PERSISTED MODE — never on the accident of a null
// rate column. 09-06 requires a per-head price but never CLEARS hourly/day, and OC-17 lets a host switch
// modes, so a drop-in listing can genuinely still carry both exclusive rates (09-07's lesson). A fork
// written against `hourlyRateCents == null` is wrong and is asserted against in tests.
//
// NOTE THE DELIBERATE ASYMMETRY, which 09-UI-SPEC § 4 asks for and which is NOT a drift: the `/person`
// part is the ADVERTISED ALL-IN rate (what a booker is quoted, D-75), while `/hr` and `/day` print the RAW
// rate the host set. This is a MANAGEMENT surface — the host wants to see the number they typed — and the
// drop-in line is deliberately the number their own listing shows in search.

import { allInRateParts } from "@/lib/booking/all-in-rate";
import { formatMoney } from "@/lib/money";

export type CardPriceSource = {
  hourlyRateCents: number | null;
  dayRateCents: number | null;
  perHeadPriceCents: number | null;
  occupancyMode: "exclusive" | "open_capacity";
  currency: string;
};

/**
 * The pre-formatted price parts for a host listing tile — e.g. `["₱307.50/hr", "₱1,800.00/day"]` or the
 * single `["₱367.50/person"]`. May be empty (a listing with no rates set yet); the card renders its own
 * "No pricing yet" fallback for that case, exactly as it always has.
 */
export function listingCardPriceParts(listing: CardPriceSource): string[] {
  if (listing.occupancyMode === "open_capacity") {
    return allInRateParts(
      {
        hourlyRateCents: listing.hourlyRateCents,
        dayRateCents: listing.dayRateCents,
        perHeadPriceCents: listing.perHeadPriceCents,
        occupancyMode: listing.occupancyMode,
      },
      listing.currency,
    );
  }
  const parts: string[] = [];
  if (listing.hourlyRateCents != null) {
    parts.push(`${formatMoney(listing.hourlyRateCents, listing.currency)}/hr`);
  }
  if (listing.dayRateCents != null) {
    parts.push(`${formatMoney(listing.dayRateCents, listing.currency)}/day`);
  }
  return parts;
}
