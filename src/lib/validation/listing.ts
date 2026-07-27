// Shared listing validation schemas (Zod 4). The SAME schema validates in the RHF wizard form
// (via @hookform/resolvers/zod) and again at the top of every listing server action — the client
// is never trusted for price/capacity/status (RESEARCH §Shared Zod schema, mirrors auth.ts/profile.ts).
//
// TWO schemas (D-01/D-02/D-03):
//   - draftSchema   : every field .optional() so the wizard can autosave a partial listing between
//                     steps (D-01). No hard requirements — a half-filled draft must always save.
//   - publishSchema : the strict draft→publish gate — all core fields required, BOTH rates as
//                     positive integer cents (D-03/LIST-03), lat/lng present (D-10).
//
// NOTE: the ≥3-photos and host-email-verified checks are asserted in the PUBLISH ACTION (Plan 03),
// not here — they are not form fields (D-02). Money is integer minor units (cents), never float.

import { z } from "zod";
import { spaceTypeValues, activityTagValues, amenityValues } from "@/lib/listing-vocab";

const bookingModeValues = ["instant", "request"] as const;

/** The D-67 named cancellation tiers. Mirrors the `cancellation_policy` pgEnum and the D-68 `LADDER`
 *  keys in src/lib/payments/cancellation.ts — the tier a host picks here is snapshotted onto every
 *  booking at creation (D-67) and is what `quoteRefund` later applies. */
const cancellationPolicyValues = ["flexible", "standard", "strict"] as const;

/** D-109 occupancy modes. EXACTLY ONE value in v1 (`exclusive`) — Phase 9 adds open-capacity. Mirrors the
 *  `occupancy_mode` pgEnum. There is deliberately NO host-facing control for this in v1 (08-UI-SPEC § 6 /
 *  Open Q8): a picker with one choice is noise. The field is accepted here so the shape is forward-compatible
 *  and so a client can never smuggle a value outside the enum. */
const occupancyModeValues = ["exclusive"] as const;

/** Draft autosave (D-01) — everything optional; the wizard saves partial progress between steps. */
export const draftSchema = z.object({
  title: z.string().max(120).optional(),
  description: z.string().max(5000).optional(),
  primarySpaceType: z.enum(spaceTypeValues).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(120).optional(),
  neighborhood: z.string().max(120).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  maxOccupancy: z.number().int().optional(),
  hourlyRateCents: z.number().int().optional(),
  dayRateCents: z.number().int().optional(),
  bookingMode: z.enum(bookingModeValues).optional(),
  // D-77: OPTIONAL at draft time, on purpose. The tier gates PUBLISHING, not creation (see publishSchema),
  // so every listing drafted before Phase 7 — which all carry NULL — stays editable and saveable.
  cancellationPolicy: z.enum(cancellationPolicyValues).optional(),
  // ── D-108 group pricing (GROUP-01/GROUP-05) — OPTIONAL everywhere, on purpose (see publishSchema). ──
  occupancyMode: z.enum(occupancyModeValues).optional(),
  included: z.number().int().positive().optional(),
  // ≥ 0, not positive: ₱0 IS the meaningful "flat pricing, no surcharge" value and is the default the
  // wizard shows. Integer CENTAVOS (Pitfall 5 — money is never a float).
  extraHeadFee: z.number().int().min(0).optional(),
  showExactAddress: z.boolean().optional(),
  amenities: z.array(z.enum(amenityValues)).optional(),
  activityTags: z.array(z.enum(activityTagValues)).optional(),
});

/**
 * Strict draft→publish gate (D-02/D-03/LIST-03). All core fields required; BOTH rates required and
 * validated as positive INTEGER cents (never float — Pitfall 5); coordinates required (D-10).
 */
export const publishSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  primarySpaceType: z.enum(spaceTypeValues),
  addressLine1: z.string().min(1),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1),
  region: z.string().min(1),
  // OSM/Photon frequently returns no postcode (esp. PH) — requiring it created a publish dead-end
  // (UAT). Postcode isn't needed for bookability (city + coordinates are), so it's optional.
  postalCode: z.string().max(20).optional(),
  country: z.string().min(1),
  neighborhood: z.string().max(120).optional(),
  lat: z.number(),
  lng: z.number(),
  maxOccupancy: z.number().int().positive(),
  hourlyRateCents: z.number().int().positive(),
  dayRateCents: z.number().int().positive(),
  bookingMode: z.enum(bookingModeValues),
  // D-77: REQUIRED to publish, and deliberately with NO default. This breaks the D-62 precedent of
  // defaulting to the most booker-friendly option, because the tier governs real money: it decides how
  // much of a booker's payment comes back, and a host must not set that by accident.
  //
  // The gate is on PUBLISH, not on creation — mirroring how bookability (not listing creation) is gated
  // on payout-readiness. An existing NULL-tier draft is therefore never bricked; it simply cannot go live
  // until the host chooses. And because this schema runs server-side inside publishListing against the
  // PERSISTED row, a stale or tampered client that skips the wizard step cannot bypass it.
  cancellationPolicy: z.enum(cancellationPolicyValues),
  // ── D-108 group pricing — OPTIONAL AT PUBLISH, DELIBERATELY. ────────────────────────────────────────
  // These mirror `postalCode` (:64 — optional in the strict gate), NOT `cancellationPolicy` (required).
  // They are NOT publish requirements and must NOT enter the publish checklist: both are backward-compatible
  // with app-level defaults (a NULL/0 extraHeadFee means flat pricing, `included` defaults to 1), so every
  // listing that predates Phase 8 — i.e. all of them — stays publishable without the host touching a group
  // field. 07-15's "a new publish requirement must land in TWO places" rule cuts the other way here: adding
  // them to this schema is exactly how a requirement becomes real, so they stay optional on purpose.
  occupancyMode: z.enum(occupancyModeValues).optional(),
  included: z.number().int().positive().optional(),
  extraHeadFee: z.number().int().min(0).optional(),
  showExactAddress: z.boolean().optional(),
  amenities: z.array(z.enum(amenityValues)).optional(),
  activityTags: z.array(z.enum(activityTagValues)).optional(),
});

/** The D-67 tier union, exported so the wizard cards and the publish gate share ONE source of truth. */
export type CancellationPolicyValue = (typeof cancellationPolicyValues)[number];
export const CANCELLATION_POLICY_VALUES = cancellationPolicyValues;

export type DraftListingInput = z.infer<typeof draftSchema>;
export type PublishListingInput = z.infer<typeof publishSchema>;
