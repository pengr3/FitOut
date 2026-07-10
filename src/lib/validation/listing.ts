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
  showExactAddress: z.boolean().optional(),
  amenities: z.array(z.enum(amenityValues)).optional(),
  activityTags: z.array(z.enum(activityTagValues)).optional(),
});

export type DraftListingInput = z.infer<typeof draftSchema>;
export type PublishListingInput = z.infer<typeof publishSchema>;
