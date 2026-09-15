import "server-only";

import type { SearchParams } from "@/lib/validation/booking";

/** Product-owned reach for completed public location searches. */
export const PUBLIC_SEARCH_RADIUS_KM = 25;

type PublicSearchFields = Pick<
  SearchParams,
  "lat" | "lng" | "category" | "locationLabel" | "partySize" | "sort"
>;

/**
 * Discard public URL keys that no longer define the progressive search journey, then
 * attach the route-owned reach before the database query runs. The fixed radius is
 * inert for cold browse because searchListings only applies it when both coordinates
 * are present.
 */
export function derivePublicSearchInput(
  params: SearchParams,
  maxPages: number,
): SearchParams {
  const fields: PublicSearchFields = {
    lat: params.lat,
    lng: params.lng,
    category: params.category,
    locationLabel: params.locationLabel,
    partySize: params.partySize,
    sort: params.sort,
  };

  return {
    ...fields,
    radius: PUBLIC_SEARCH_RADIUS_KM,
    page: Math.min(params.page, maxPages),
    relax: 1,
  };
}

/** Serialize only the public, explainable progressive-search state. */
export function publicSearchQueryString(params: SearchParams, page: number): string {
  const query = new URLSearchParams();
  if (params.lat !== undefined && params.lng !== undefined) {
    query.set("lat", String(params.lat));
    query.set("lng", String(params.lng));
  }
  if (params.category) query.set("category", params.category);
  if (params.locationLabel) query.set("locationLabel", params.locationLabel);
  if (params.partySize !== undefined) query.set("partySize", String(params.partySize));
  if (params.sort !== "nearest") query.set("sort", params.sort);
  if (page !== 0) query.set("page", String(page));
  return query.toString();
}
