// Shared booking / slot-selection validation (Zod 4). Clones the listing.ts contract: the SAME schema
// validates the booker's client-side selection (the SlotPicker → rail summary) and is re-validated
// server-side when the real booking is inserted — the client is NEVER trusted for times/units
// (CLAUDE.md "never trust the client"; mirrors src/lib/validation/listing.ts).
//
// Phase 3 uses this only for the client selection CONTRACT + the rail summary shape (real booking,
// pricing, and the pending hold are Phase 4). The stronger invariants that must hold at booking time —
// on-the-hour (:00) starts, the window sitting inside the listing's operating hours, and the free-unit
// count — are RE-DERIVED server-side from the read model in Phase 4 (the client can never assert them).

import { z } from "zod";
import { spaceTypeValues, activityTagValues } from "@/lib/listing-vocab";

// The selected-window shape, reused by BOTH the client-selection contract (`slotSelectionSchema`) and
// the booking-create payload (`bookingCreateSchema`) so the window fields + the end>start refine can
// never drift between them.
const slotWindowShape = {
  startUtc: z.string().datetime(),
  endUtc: z.string().datetime(),
  fullDay: z.boolean().default(false),
};
const endAfterStart = (v: { startUtc: string; endUtc: string }) => v.endUtc > v.startUtc;
const endAfterStartIssue = { message: "End must be after start.", path: ["endUtc"] };

/**
 * A booker's selected time window: a contiguous run of hours OR a full operating day (fullDay). Times
 * are UTC ISO instants (the venue-tz display happens at the edge). `endUtc` must be strictly after
 * `startUtc`; everything else is re-derived server-side in Phase 4.
 */
export const slotSelectionSchema = z.object(slotWindowShape).refine(endAfterStart, endAfterStartIssue);

export type SlotSelection = z.infer<typeof slotSelectionSchema>;

// Radius presets (km) — UI-SPEC §Discretionary: 2 / 5 / 10 / 25, default 10. A tampered radius is
// rejected (not silently clamped) so only a known preset reaches the ST_DWithin query.
const RADIUS_PRESETS = [2, 5, 10, 25] as const;

/**
 * The search-page URL contract (V5 input-validation control). Every param here is attacker-controllable
 * (T-04-ORIGIN / T-04-VOCAB / T-04-PRICEIN) and is bounds-validated BEFORE any SQL runs. URL params
 * arrive as strings, so numeric fields use `z.coerce.number()`; the min/max (and `.int()`) bounds make a
 * crafted `NaN`/"abc" FAIL safeParse rather than throw — every NaN comparison is false, so it can never
 * satisfy a bound and never reaches the radius/price query. Mirrors the runtime arg-validation shape in
 * `actions/availability.ts` (`dayLocalSchema.safeParse`). Unknown params are stripped (non-strict), so
 * real URLs carrying `utm_*` etc. are tolerated. All missing params are allowed (default city view, D-30).
 */
export const searchParamsSchema = z
  .object({
    // Radius origin — bounded lat/lng (T-04-ORIGIN). Both optional, but must be present TOGETHER (a lone
    // coordinate can't form an origin — see the object-level refine below).
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    // Radius restricted to the UI presets (default 10 km). Applies only once an origin is set; the
    // default no-query city view ignores it.
    radius: z.coerce
      .number()
      .refine((n) => (RADIUS_PRESETS as readonly number[]).includes(n), {
        message: "Radius must be one of 2, 5, 10, or 25 km.",
      })
      .default(10),
    // Price ceiling on the hourly axis (₱ integer minor units — UI-SPEC §Price-filter). Non-negative int.
    priceMax: z.coerce.number().int().min(0).optional(),
    // Free-form date/time strings — SHAPE ONLY. The venue-tz instant + on-the-hour/operating-hours
    // invariants are re-derived server-side from the read model (never trust the client for time).
    date: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    // A SINGLE combined activity/type filter (D-35). The two vocabularies are DISJOINT, so one value
    // uniquely names its column; the search SQL checks it against BOTH `primary_space_type` and the
    // activity tag. Deliberately NOT split into separate `type`/`activity` params (which would no-op an
    // activity-tag-only search). Sourced from the single vocab authority (`@/lib/listing-vocab`).
    category: z.union([z.enum(spaceTypeValues), z.enum(activityTagValues)]).optional(),
    // Sort control (T-04-VOCAB) — only a known key reaches the ORDER BY. Default nearest-first (D-37).
    sort: z.enum(["nearest", "price"]).default("nearest"),
    // Load-more page index (D-32). Non-negative int, default 0.
    page: z.coerce.number().int().min(0).default(0),
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), {
    message: "Provide both lat and lng for a radius search.",
    path: ["lng"],
  });

export type SearchParams = z.infer<typeof searchParamsSchema>;

/**
 * The booking-create payload (POST — `placeHold`). Shape-validated here; the stronger invariants
 * (on-the-hour, inside operating hours, a free unit, the frozen price) are RE-DERIVED server-side from
 * the read model before the hold is inserted — the client is never trusted for price/time. The optional
 * `idempotencyKey` is a display/UX backstop; the real double-click guarantee is the DB partial-unique
 * index `booking_idem_uq`.
 */
export const bookingCreateSchema = z
  .object({
    listingId: z.string().min(1),
    ...slotWindowShape,
    idempotencyKey: z.string().min(1).optional(),
    // D-108 group pricing: the organizer-declared attendee headcount. SHAPE-ONLY here (an optional coerced
    // positive int) — the PRICE is re-derived server-side inside createPendingHold from the listing's OWN
    // included/extra_head_fee, and this only drives the charge when extra_head_fee > 0.
    //
    // CR-03: the `.max()` is a SHAPE ceiling, not the cap. It exists so no accepted value can multiply
    // through `(pax − included) × extra_head_fee` into the `integer` money columns
    // (space_price_cents / service_fee_cents / quoted_total_cents) and raise a Postgres 22003 that
    // `mapBookingError` would re-throw as a raw 500 (T-03-500). The REAL cap is the listing's own
    // `maxOccupancy`, read inside `createPendingHold`'s transaction and applied there (D-111 / Security V4)
    // — never a client-supplied bound. Same ceiling as `declaredPaxSchema` on the re-price path
    // (`src/app/actions/booking.ts:81`): one shape bound, one number.
    declaredPax: z.coerce.number().int().min(1).max(10_000).optional(),
  })
  .refine(endAfterStart, endAfterStartIssue);

export type BookingCreate = z.infer<typeof bookingCreateSchema>;

/**
 * The OPEN-CAPACITY hold payload (OC-02/OC-06). A drop-in booker picks a DATE — never a time window — and a
 * number of passes. There is deliberately no window shape here at all (no start/end instants, no full-day
 * flag): the entry window is derived SERVER-SIDE from the listing's operating hours for that date (OC-03),
 * so the client cannot choose, widen or shift the window the refund ladder and payout sweep will later key
 * on. Zod strips unknown keys, so a payload that smuggles the exclusive path's fields loses them here
 * (threat T-09-26) rather than carrying them into the claim.
 *
 * `date` is a venue-local calendar day. The regex is a SHAPE gate only: it accepts syntactically-well-formed
 * but impossible days (2026-02-31). Those die in the action, at `parsePickedDate` (src/lib/search/query.ts),
 * which canonicalizes the value and round-trip-guards it before anything reaches SQL.
 *
 * CR-03 restated for passes: the `.max()` is a SHAPE ceiling, not the cap. It exists so no accepted value
 * can multiply through `per_head_price_cents × passes` into the `integer` money columns and raise a
 * Postgres 22003 that `mapBookingError` would re-throw as a raw 500 (T-03-500). The REAL cap is the
 * listing's own `max_occupancy`, read inside `createOpenCapacityHold`'s transaction and applied there
 * against the live admissions SUM (D-124 / Security V4) — never a client-supplied bound.
 */
export const openHoldSchema = z.object({
  listingId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a day to book."),
  requestedPasses: z.coerce.number().int().min(1).max(10_000),
  idempotencyKey: z.string().max(200).optional(),
});

export type OpenHoldInput = z.infer<typeof openHoldSchema>;
