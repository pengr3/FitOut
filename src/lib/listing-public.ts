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

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE POST-PAYMENT ADDRESS BOUNDARY (D-91 · TRUST-01) — the ONE route to a booked listing's street
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// WHAT THIS IS, IN ONE SENTENCE: the exception to THE PRIVACY RULE above, expressed as a named
// function so that the exception is auditable and cannot spread.
//
// ── WHY AN EXCEPTION IS LEGITIMATE AT ALL, IN THE HOST'S OWN WORDS ───────────────────────────────
//
// `showExactAddress` defaults to FALSE, so the projection above drops the street for effectively every
// listing. TRUST-01 nonetheless requires the full address on the booking detail page — and that is not
// a conflict, because the host-facing control that sets this toggle
// (`src/app/(host)/host/listings/[id]/edit/wizard.tsx:878`) already tells the host, in their own
// settings screen:
//
//     "Off by default — guests see an approximate area until they book."
//
// **Until they book.** Handing the street to a booker who HAS booked is that promise being kept. It is
// not a widening of it, no host-facing copy changes, and no column changes (D-80: zero migrations —
// every column this reads already exists).
//
// ⚠ AND THE OTHER HALF OF THE SAME SENTENCE IS THE HARD PART. The street is NOT revealed on:
//     - `requested`            — anybody can create one of these. It is not a booking, it is an ask.
//     - `approved` (unpaid)    — the host said yes; nobody has paid. Still an ask.
//     - `pending`              — a checkout that is settling, or one that did not finish. Not booked.
//     - `declined`             — it never became a booking.
//     - `cancelled`            — including the party cancellation, the D-97 lapsed approval and the
//                                D-58/D-87 reversed payment. None of the three is "booked", and the
//                                reversed one is precisely the case where money moved and then did not.
// Getting any of those wrong breaks a promise made to the HOST, who is not in the room. That is why the
// gate is a whitelist of two statuses rather than a blacklist of the rest: a booking status added later
// is non-booked by default, which is the safe direction to fail.
//
// ── WHY IT IS A FUNCTION IN THIS MODULE AND NOT A READ AT THE CALL SITE ──────────────────────────
//
// One named boundary means one place to audit, one place to test, and — if the PM reverses the product
// call flagged in 13-UI-SPEC § Open Questions 2 — one line to change. A call site that reached for
// `listing.addressLine1` directly would be a second boundary nobody declared, and the third would be
// written by copying the second. `bookings/[id]/page.tsx` therefore reads NO raw address column at any
// render site; a grep over that file for the raw column names is part of this plan's acceptance.
//
// ── THE DUPLICATION WITH `publicListing()` IS DELIBERATE AND IS PINNED BY A TEST ─────────────────
//
// The three allow-list ternaries and the coordinate coarsening below are the same logic
// `publicListing()` runs, and the obvious refactor is to extract a shared helper. It is deliberately
// NOT done: `publicListing()` is the anonymous-viewer boundary that has shipped since Phase 2, and
// editing it in the same commit that opens an exception to it is how a privacy rule acquires an
// exception it never agreed to. Not one line of it moves.
//
// The drift that duplication invites is closed mechanically instead:
// `tests/listing/booked-address.test.ts` asserts that for EVERY non-booked status, and for BOTH
// positions of the host's toggle, this function's nine address fields are FIELD-FOR-FIELD equal to
// `publicListing()`'s. If the two ever diverge, that is the assertion that fails.
//
// PURE — no DB, no I/O, no clock. The `completed` status it accepts is DERIVED against the Postgres
// clock by the caller (D-102: it is never stored); a boundary that read a clock itself could disagree
// with the status the page rendered.

/**
 * The booking's DISPLAY status, as the caller derived it.
 *
 * Declared here rather than imported from `@/components/booking/booking-status`, following this
 * module's own `ListingStatus` precedent: a pure lib does not depend on `src/components`. The cost of
 * that choice is drift, and it is paid in `tests/listing/booked-address.test.ts`, which asserts the two
 * unions are mutually assignable — so neither can gain or lose a value without a compile failure.
 *
 * `completed` is DERIVED at read time (D-102) and never stored.
 */
export type BookedAddressStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "declined"
  | "completed"
  | "requested"
  | "approved";

/** The address columns this boundary reads, plus the host's toggle. Nothing else is needed or taken. */
export type BookedListingAddressInput = {
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  neighborhood: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  /** PostGIS point in { x: lng, y: lat } order (Pitfall 1). */
  location: { x: number; y: number } | null;
  /** The host's D-09 toggle, read from the row. Ignored for the two BOOKED statuses — see the header. */
  showExactAddress: boolean;
};

/**
 * The projected address. Identical in shape to the address half of `PublicListing`, plus one flag.
 */
export type BookedListingAddress = {
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  neighborhood: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  lat: number | null; // fuzzed unless the exact address is disclosed
  lng: number | null; // fuzzed unless the exact address is disclosed
  /**
   * The address as DISPLAYABLE LINES, already composed — empty when the row holds nothing.
   *
   * ⚠ THIS FIELD IS THE REASON THE BOUNDARY IS ACTUALLY AUDITABLE, and it is not a convenience. If a
   * page composed the lines itself it would have to name `addressLine1` / `postalCode` at a render
   * site, and "the exact street is only reachable through this function" would go back to being a
   * convention rather than a fact — the next surface would copy the composition, not the call. Composed
   * here, the column names appear in exactly two places in the whole product: this module, and a SELECT
   * clause. A grep over `bookings/[id]/page.tsx` for those column names outside its select returns
   * ZERO, and that is this plan's acceptance criterion.
   *
   * The lines are ordered street → area → postal code, and the street and postal lines are simply
   * ABSENT (not blanked, not placeholdered) when the projection is approximate — so a caller that
   * renders `lines` in order cannot accidentally render an empty row where the street would be.
   */
  lines: string[];
  /**
   * TRUE ⇒ the exact street and the exact point are present. It is a fact ABOUT THE PROJECTION, so a
   * caller renders the precise-vs-approximate framing from this rather than re-deriving the rule and
   * risking a label that disagrees with the value beside it.
   */
  exact: boolean;
};

/** Drop nulls and blanks, then join. Local to this boundary; it composes nothing else. */
function joinParts(parts: readonly (string | null)[], separator: string): string | null {
  const kept = parts.filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  return kept.length === 0 ? null : kept.join(separator);
}

/**
 * THE TWO STATUSES AT WHICH A BOOKING IS "BOOKED" in the sense the host was promised.
 *
 * A whitelist, never a blacklist: a booking status added later is non-booked until somebody decides
 * otherwise in this file, which is the direction this boundary must fail in.
 */
const BOOKED_STATUSES: readonly BookedAddressStatus[] = ["confirmed", "completed"];

/**
 * Project a listing row's address for a BOOKER viewing their OWN booking (D-91 / TRUST-01).
 *
 * @param input  the listing's address columns + the host's `showExactAddress` toggle
 * @param opts.displayStatus  the booking's DISPLAY status, derived by the caller against the DB clock
 *   (`deriveDisplayStatus`) — `completed` is never stored, so passing the raw column would silently
 *   drop the address the instant a session ended.
 *
 * @see the boundary block above before widening this in any way.
 */
export function bookedListingAddress(
  input: BookedListingAddressInput,
  opts: { displayStatus: BookedAddressStatus },
): BookedListingAddress {
  // The whole decision, in one line. `booked` is the exception D-91 grants; the toggle is the rule that
  // otherwise applies, unchanged and unweakened.
  const booked = BOOKED_STATUSES.includes(opts.displayStatus);
  const exact = booked || input.showExactAddress;

  const exactLat = input.location ? input.location.y : null;
  const exactLng = input.location ? input.location.x : null;

  // The displayable lines, composed from the SAME `exact` decision as the fields — never from the raw
  // columns — so the two can never disagree about what was disclosed.
  const lines = [
    exact ? joinParts([input.addressLine1, input.addressLine2], ", ") : null,
    joinParts([input.neighborhood, input.city, input.region], ", "),
    exact ? joinParts([input.postalCode], "") : null,
  ].filter((line): line is string => line !== null);

  return {
    // Exact street: allow-listed ONLY for a booked status, or where the host already opted in.
    addressLine1: exact ? (input.addressLine1 ?? null) : null,
    addressLine2: exact ? (input.addressLine2 ?? null) : null,
    postalCode: exact ? (input.postalCode ?? null) : null,
    // Coarse location is always disclosed — it is how a booker knows the general area, on every status.
    neighborhood: input.neighborhood ?? null,
    city: input.city ?? null,
    region: input.region ?? null,
    country: input.country ?? null,
    // THE COORDINATE IS THE LEAK THAT SURVIVES A COPY EDIT. A pin at the doorstep discloses the address
    // whether or not the text does, so it is coarsened by the SAME rule and through the same helper.
    lat: exactLat === null ? null : exact ? exactLat : fuzzCoordinate(exactLat),
    lng: exactLng === null ? null : exact ? exactLng : fuzzCoordinate(exactLng),
    lines,
    exact,
  };
}
