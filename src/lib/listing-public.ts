// Public listing projection (D-09 / D-11 — the address-privacy information-disclosure boundary).
//
// This module is the LISTING analog of src/lib/profile.ts's publicProfile(): the single place that
// decides what an ANONYMOUS viewer of a listing may see. It is an explicit ALLOW-LIST (never a
// deny-list) so that adding a new private column to the `listing` table can never silently leak it to
// the public detail page (threat T-05-PII). Keep it pure (no DB/IO) so it is unit-testable exactly
// like profile.ts / bookability.ts.
//
// THE PRIVACY RULE (D-09): each listing has a `showExactAddress` toggle defaulting to FALSE.
//   - showExactAddress = false (default, "approximate"): DROP addressLine1/addressLine2/postalCode and
//     FUZZ the coordinates (coarsen to ~2 decimal places ≈ a neighbourhood, not a doorstep) so the
//     exact point never leaves the server. Only neighborhood/city/region/country + the fuzzed point
//     are exposed — the map draws a fuzzed circle over that area (D-11).
//   - showExactAddress = true (host opted in, e.g. a commercial venue): include the exact street + the
//     exact coordinates; the map draws an exact pin.
// Revealing the exact street only AFTER a confirmed booking is a FUTURE-PHASE reveal — Phase 2 honors
// the toggle only. This function is where that boundary is enforced regardless of what the row holds.

import type { SpaceTypeValue } from "@/lib/listing-vocab";

/** Listing status enum (mirrors the listing_status pgEnum). */
type ListingStatus = "draft" | "published" | "unlisted";

/** A single public-safe photo (Cloudinary secure_url + ordering position; 0 = cover, D-04). */
export type PublicListingPhoto = {
  id: string;
  url: string;
  position: number;
};

/**
 * The superset the projection reads from — the `listing` row's columns plus its related photos,
 * amenities, and activity tags (assembled by the caller). `location` is a PostGIS point in
 * { x: lng, y: lat } order (Pitfall 1).
 */
export type PublicListingInput = {
  id: string;
  title: string | null;
  description: string | null;
  primarySpaceType: SpaceTypeValue | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  neighborhood: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  location: { x: number; y: number } | null;
  hourlyRateCents: number | null;
  dayRateCents: number | null;
  currency: string;
  maxOccupancy: number | null;
  status: ListingStatus;
  photos: PublicListingPhoto[];
  amenities: string[];
  activityTags: string[];
};

/**
 * The EXACT public subset an anonymous viewer receives. addressLine1/addressLine2/postalCode are
 * present ONLY when the host shows the exact address; otherwise they are null and lat/lng are fuzzed.
 * Anything not enumerated here (hostId, deletedAt, publishedAt, raw PostGIS point, …) is intentionally
 * dropped so it can never be sent to the public.
 */
export type PublicListing = {
  id: string;
  title: string | null;
  description: string | null;
  primarySpaceType: SpaceTypeValue | null;
  // Location — approximate by default (D-09). Exact street present ONLY when showExactAddress.
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  neighborhood: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  lat: number | null; // fuzzed unless showExactAddress
  lng: number | null; // fuzzed unless showExactAddress
  hourlyRateCents: number | null;
  dayRateCents: number | null;
  currency: string;
  maxOccupancy: number | null;
  photos: PublicListingPhoto[];
  amenities: string[];
  activityTags: string[];
  status: ListingStatus;
  showExactAddress: boolean;
};

/**
 * Coarsen a coordinate to ~2 decimal places (~1.1km at the equator) so the fuzzed public point lands
 * in the right neighbourhood but never at the host's doorstep. Rounding is deterministic and one-way
 * for the viewer: the exact value is simply never sent (it is dropped on the server before response).
 */
function fuzzCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Project a listing row (+ its photos/amenities/tags) down to ONLY the public fields, honoring the
 * `showExactAddress` toggle (D-09). Explicit allow-list — see the module header. Pure: no DB, no I/O.
 *
 * @param input  the listing columns + related collections
 * @param opts.showExactAddress  the host's toggle (the caller passes row.showExactAddress); when false
 *   the exact street is dropped and coordinates are fuzzed, so the exact location never leaves here.
 */
export function publicListing(
  input: PublicListingInput,
  opts: { showExactAddress: boolean },
): PublicListing {
  const showExactAddress = opts.showExactAddress;

  // Coordinates: PostGIS stores x=lng, y=lat. Expose exact only when the host shows the exact address;
  // otherwise coarsen so the precise point is never disclosed pre-booking.
  const exactLat = input.location ? input.location.y : null;
  const exactLng = input.location ? input.location.x : null;
  const lat =
    exactLat === null ? null : showExactAddress ? exactLat : fuzzCoordinate(exactLat);
  const lng =
    exactLng === null ? null : showExactAddress ? exactLng : fuzzCoordinate(exactLng);

  // Photos ordered by position ascending (cover = 0 first). Copy to a new array — never mutate input.
  const photos = [...input.photos]
    .sort((a, b) => a.position - b.position)
    .map((p) => ({ id: p.id, url: p.url, position: p.position }));

  return {
    id: input.id,
    title: input.title ?? null,
    description: input.description ?? null,
    primarySpaceType: input.primarySpaceType ?? null,
    // Exact street: allow-listed ONLY when the host opted in (D-09). Never leaked otherwise.
    addressLine1: showExactAddress ? (input.addressLine1 ?? null) : null,
    addressLine2: showExactAddress ? (input.addressLine2 ?? null) : null,
    postalCode: showExactAddress ? (input.postalCode ?? null) : null,
    // Coarse location is always public — it's how guests know the general area.
    neighborhood: input.neighborhood ?? null,
    city: input.city ?? null,
    region: input.region ?? null,
    country: input.country ?? null,
    lat,
    lng,
    hourlyRateCents: input.hourlyRateCents ?? null,
    dayRateCents: input.dayRateCents ?? null,
    currency: input.currency,
    maxOccupancy: input.maxOccupancy ?? null,
    photos,
    amenities: [...input.amenities],
    activityTags: [...input.activityTags],
    status: input.status,
    showExactAddress,
  };
}
