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

/** D-109 occupancy modes, mirroring the `occupancy_mode` pgEnum. Phase 9 adds the second mode (D-123 / OC-01)
 *  and with it the wizard's occupancy step, so the "there is deliberately NO host-facing control" note that
 *  stood here is RETIRED — it would otherwise read as this change's own alibi. Exported so the wizard's mode
 *  cards and the publish gate below share ONE source of truth (the CANCELLATION_POLICY_VALUES idiom at the
 *  foot of this file). A client still cannot smuggle a value outside the enum. */
const occupancyModeValues = ["exclusive", "open_capacity"] as const;

/** The D-123 mode union, exported so the wizard cards and the publish gate share ONE source of truth. */
export type OccupancyModeValue = (typeof occupancyModeValues)[number];
export const OCCUPANCY_MODE_VALUES = occupancyModeValues;

/**
 * The ONE user-facing reject copy for the surcharge-reachability rule (`included < maxOccupancy` whenever
 * `extraHeadFee > 0`). Exported so the two enforcement points can never drift apart: the publishSchema
 * superRefine below (08-20, publish-time gate) AND the saveListingStep edit-path guard (08-22, HG-01) both
 * reference this single constant. Keeping the reject copy in exactly one place also preserves 08-20's grep
 * gate that the surcharge message literal appears exactly once in this file.
 */
export const SURCHARGE_UNREACHABLE_MESSAGE =
  "Base price covers must be fewer than the maximum capacity, or the extra guest fee never applies.";

// ── Phase-9 reject copy (OPEN-01). Same single-literal discipline SURCHARGE_UNREACHABLE_MESSAGE established:
// every one of these is exported and appears EXACTLY ONCE in this file, so the publish gate, the wizard
// checklist and the tests can never drift into three slightly different sentences. Host-facing voice per
// 09-UI-SPEC § Copywriting O1 — never "occupancy mode", "exclusive", "open capacity", "per-head", or "cap"
// as a bare noun; say whole space, drop-in passes, price per person, people per day.

/** The unchanged Phase-2/D-03 both-rates requirement, now stated in host words because the requirement MOVED
 *  into the superRefine (see publishSchema) and a moved requirement needs its own voice. */
export const EXCLUSIVE_RATES_REQUIRED_MESSAGE = "Set an hourly rate and a day rate to publish.";
export const PER_HEAD_PRICE_REQUIRED_MESSAGE = "Set a price per person to publish drop-in passes.";
export const DROP_IN_CAP_REQUIRED_MESSAGE =
  "Set how many people you'll let in each day to publish drop-in passes.";
/** OC-10 — drop-in passes are instant only. */
export const DROP_IN_INSTANT_ONLY_MESSAGE =
  "Drop-in passes are always instant — people book without waiting for your approval.";
/** 09-RESEARCH A4 / Q3 — open capacity is many bookers sharing ONE bookable unit. */
export const DROP_IN_SINGLE_SPACE_MESSAGE =
  "Drop-in passes work on one space. List each court or room separately.";
/** D-110 — open capacity never combines with the Phase-8 per-extra-head surcharge. */
export const DROP_IN_NO_GUEST_PRICING_MESSAGE =
  "Drop-in passes are priced per person, so extra guest pricing doesn't apply.";
/** OC-17 / 09-UI-SPEC § 1f title. The lock ALWAYS names why, when it lifts, and a way out (O7) — the alert
 *  copy supplies the last two; THIS is the reason. Consumed by saveListingStep's server-side refusal. */
export const MODE_LOCKED_MESSAGE = "You can't change this while bookings are still to come";

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
  // D-123 open-capacity price per person. ≥ 0 rather than .positive() so a half-typed value (the instant the
  // host has typed "0" on the way to "350") still AUTOSAVES — the draft schema never blocks progress (D-01).
  // The publish gate below is where it must actually be positive. Integer CENTAVOS (Pitfall 5).
  perHeadPriceCents: z.number().int().min(0).optional(),
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
  // ── THE MODE FORK (OPEN-01). These two were `.positive()` REQUIRED here from Phase 2 until Phase 9. ──
  // They had to become optional AT THE OBJECT LEVEL because an open-capacity listing has no hourly or day
  // rate at all (OC-08: one flat price per person, and the wizard never renders the rate inputs), so a
  // top-level requirement would make every drop-in listing permanently unpublishable. The requirement did
  // NOT weaken — it MOVED: the superRefine at the foot of this schema re-imposes it for `exclusive` exactly
  // as before, and the both-rates test cases that guarded it still go red if that branch is deleted.
  hourlyRateCents: z.number().int().positive().optional(),
  dayRateCents: z.number().int().positive().optional(),
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
  // D-123 — required to publish in OPEN mode only (enforced in the superRefine, never here).
  perHeadPriceCents: z.number().int().positive().optional(),
  // D-21 unit count. Read-only from the host's point of view (there is no wizard control), but it is
  // re-parsed from the PERSISTED row at publish so the open-mode single-space rule below can see it.
  unitCount: z.number().int().positive().optional(),
  showExactAddress: z.boolean().optional(),
  amenities: z.array(z.enum(amenityValues)).optional(),
  activityTags: z.array(z.enum(activityTagValues)).optional(),
}).superRefine((data, ctx) => {
  // Every pre-Phase-9 listing carries NULL/absent here and must read as `exclusive` — the column's own
  // NOT NULL DEFAULT says the same thing, so the two can never disagree.
  const mode = data.occupancyMode ?? "exclusive";

  if (mode === "exclusive") {
    // ── UNCHANGED Phase-2/D-03 gate, re-imposed HERE now that the object-level rule had to move (see the
    // rate fields above). BOTH rates are still required to publish a whole-space listing; the only thing
    // that changed is where the requirement is written.
    if (data.hourlyRateCents == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hourlyRateCents"],
        message: EXCLUSIVE_RATES_REQUIRED_MESSAGE,
      });
    }
    if (data.dayRateCents == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dayRateCents"],
        message: EXCLUSIVE_RATES_REQUIRED_MESSAGE,
      });
    }

    // Gap C (deferred item 7): when a per-head surcharge is set, the base-included headcount MUST be
    // STRICTLY below max capacity, or the surcharge is mathematically unreachable. declaredPax is clamped
    // to maxOccupancy BEFORE the surcharge is computed (units.ts + paxSurcharge), so
    // extraHeads = max(0, pax − included) is ALWAYS 0 when included >= maxOccupancy — the host would
    // collect nothing extra forever, silently. `included ?? 1` and `extraHeadFee ?? 0` match paxSurcharge's
    // own coalescing so the gate and the pricing engine can never disagree. A flat listing (fee 0/absent)
    // has no surcharge to lose, so the rule does not apply and every pre-Phase-8 listing still publishes.
    // Scoped to exclusive because an open listing rejects extraHeadFee outright below (D-110).
    const fee = data.extraHeadFee ?? 0;
    const included = data.included ?? 1;
    if (fee > 0 && included >= data.maxOccupancy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["included"],
        message: SURCHARGE_UNREACHABLE_MESSAGE,
      });
    }
    return;
  }

  // ── open_capacity (OPEN-01) ──────────────────────────────────────────────────────────────────────────
  // OC-08: ONE flat price per person plus a daily people cap. Hourly/day rates are NOT required and the
  // wizard does not render them; a converted listing that still carries them is simply ignored — the open
  // path never reads them (quoteOpenCapacity takes per_head_price_cents only).
  if (data.perHeadPriceCents == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["perHeadPriceCents"],
      message: PER_HEAD_PRICE_REQUIRED_MESSAGE,
    });
  }
  // maxOccupancy is already .positive() at the object level, so this issue is not what BLOCKS publish —
  // it is what the host READS. A2 reuses that same number as the daily admissions cap (D-124), so a bad
  // value must be explained in drop-in words rather than as a generic "expected a positive number".
  if (!Number.isInteger(data.maxOccupancy) || data.maxOccupancy < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maxOccupancy"],
      message: DROP_IN_CAP_REQUIRED_MESSAGE,
    });
  }
  // OC-10: instant only. Approval on a SHARED counter would need a held-seat-pending-approval lifecycle
  // for no real use case, and the wizard removes the booking-mode step entirely in this mode — so a
  // `request` value here can only have come from a stale or crafted client.
  if (data.bookingMode !== "instant") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["bookingMode"],
      message: DROP_IN_INSTANT_ONLY_MESSAGE,
    });
  }
  // 09-RESEARCH A4/Q3: open capacity is defined as many bookers sharing ONE bookable unit. Multi-unit +
  // open is out of scope and would silently MIS-COUNT, because the admissions claim inserts the sentinel
  // unit = 1 — N units' worth of inventory would be sold against one unit's counter.
  if ((data.unitCount ?? 1) !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["unitCount"],
      message: DROP_IN_SINGLE_SPACE_MESSAGE,
    });
  }
  // D-110: open capacity never combines with the Phase-8 per-extra-head surcharge. Two per-head pricing
  // models on one listing is two different answers to "what does one more person cost".
  if ((data.extraHeadFee ?? 0) > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["extraHeadFee"],
      message: DROP_IN_NO_GUEST_PRICING_MESSAGE,
    });
  }
});

/** The D-67 tier union, exported so the wizard cards and the publish gate share ONE source of truth. */
export type CancellationPolicyValue = (typeof cancellationPolicyValues)[number];
export const CANCELLATION_POLICY_VALUES = cancellationPolicyValues;

export type DraftListingInput = z.infer<typeof draftSchema>;
export type PublishListingInput = z.infer<typeof publishSchema>;
