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
import { MAX_OPEN_CAPACITY } from "@/lib/validation/listing";
// The two strict param parsers, from the isomorphic leaf rather than from `@/lib/search/query` — that
// module transitively imports the `server-only` read model and this file is in the client graph via
// `search-bar.tsx`. `window-params.ts`'s header carries the measured build failure.
import { parsePickedDate, parseWindowHour, type PickedDate } from "@/lib/search/window-params";

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

/**
 * Radius presets (km) — UI-SPEC §Discretionary: 2 / 5 / 10 / 25, default 10. A tampered radius is
 * rejected (not silently clamped) so only a known preset reaches the ST_DWithin query.
 *
 * EXPORTED as of plan 12-12 because the STATE-03 relaxation ladder's first rung is "the next preset
 * up, to a declared max" (D-52) and it must step through THIS list, not a fourth copy of it — the
 * ladder being the one consumer whose correctness is a claim about the ORDER of the values rather
 * than about membership.
 *
 * THIS IS NOW THE ONLY COPY (12-REVIEW WR-03). The note here used to record that three shipped —
 * `search-bar.tsx`'s radius Select and `search-results.tsx`'s escape hatches each restated the array
 * beside this one — as a known cost of exporting late. Both now import from here. That matters
 * because adding a preset (a 50 km rung, say) touched three files and only ONE of them, the refine
 * below, would have failed to compile if a copy were missed; the other two would have silently
 * offered a booker a radius the schema rejects, or refused to climb to one it accepts.
 */
export const RADIUS_PRESETS = [2, 5, 10, 25] as const;

/** The declared max the radius rung may climb to — the last preset, never a number of its own. */
export const MAX_RADIUS_KM = RADIUS_PRESETS[RADIUS_PRESETS.length - 1];

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
    // A submitted search is party-aware, but the configured listing capacity remains the server-side
    // authority. The label is presentation-only; coordinates are the only location query authority.
    partySize: z.coerce.number().int().min(1).max(MAX_OPEN_CAPACITY).optional(),
    locationLabel: z.string().trim().min(1).max(120).optional(),
    // Sort control (T-04-VOCAB) — only a known key reaches the ORDER BY. Default nearest-first (D-37).
    sort: z.enum(["nearest", "price"]).default("nearest"),
    // Load-more page index (D-32). Non-negative int, default 0.
    page: z.coerce.number().int().min(0).default(0),
    /**
     * STATE-03's SUPPRESSION FLAG (D-52/D-53, plan 12-12). `1` (the default) lets the zero-result
     * relaxation ladder run; `0` means DO NOT RELAX.
     *
     * IT IS HERE, AND NOT PARSED AD-HOC IN THE RSC, FOR TWO REASONS. The first is the same one every
     * other field above is here for (T-12-12-PARAMTAMPER / Security V5): it is attacker-controllable
     * and it decides whether four more queries run, so it gets the same bounded coerced-int posture —
     * a crafted `relax=99` or `relax=abc` fails `safeParse` and the page falls back to the default
     * view, exactly as a crafted `radius` does, rather than being clamped somewhere downstream.
     *
     * The second is the one that made the flag necessary at all. The band's `Undo` must restore the
     * booker's ORIGINAL query — and re-issuing that query is precisely what makes the ladder fire
     * again, so "Undo" without a flag is an infinite loop the booker experiences as a button that
     * does nothing (RESEARCH Pitfall 5). Undo is therefore an ADDITION of `relax=0` to the original
     * query, not a removal of anything, which is why this had to be decided before the band could be
     * written. `e2e/zero-result-relax.spec.ts` case (c) is unsatisfiable without it.
     */
    relax: z.coerce.number().int().min(0).max(1).default(1),
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), {
    message: "Provide both lat and lng for a radius search.",
    path: ["lng"],
  });

export type SearchParams = z.infer<typeof searchParamsSchema>;

/**
 * The canonical SEARCHED WINDOW — what a booker asked for on `/`, carried onto the listing link by
 * `search-result-card.tsx` as `?date=YYYY-MM-DD&start=HH:mm&end=HH:mm`.
 *
 * `date` is a canonicalised `PickedDate` (or null); `startHour`/`endHour` are on-the-hour integers 0–23
 * in the VENUE's local time (or both null). There is no partial window: see the transform.
 */
export type SearchedWindow = {
  date: PickedDate | null;
  startHour: number | null;
  endHour: number | null;
};

/**
 * The searched-window URL contract (D-59 #1 — "never make the booker tell us something twice").
 *
 * ⚠ THE COLLISION THIS SCHEMA EXISTS TO SURVIVE (RESEARCH Pitfall 4). On `/listings/[id]`, `start` has
 * TWO live formats: the search card writes a VENUE-LOCAL `HH:mm`, and the D-41 sign-in resume path
 * writes a UTC ISO instant that `slotSelectionSchema` parses with `z.string().datetime()`. Same param
 * name, same route. This schema owns the FIRST format and only the first; `slotSelectionSchema` is
 * byte-unchanged and keeps owning the second, with `resume=1` as the discriminator. Widening either one
 * to accept both is the thing that must never happen — the two would then agree to disagree silently on
 * what "17:00" means. `tests/validation/search-window.test.ts` asserts the mutual rejection from BOTH
 * directions, so the separation is a measured property rather than a convention.
 *
 * FAILURE MODE IS "NO WINDOW", NEVER A THROW (T-12-02-PARAMTAMPER). Every field is optional and every
 * value is run through the same strict parser the search page uses; a garbage `date`, an off-the-hour
 * `start`, a UTC instant in `start`, or `end <= start` all degrade to null and the listing page simply
 * opens on venue-local today. A stale link naming a past date must render a listing, not a 404 and not
 * an error region.
 *
 * A PARTIAL WINDOW IS DISCARDED WHOLE. `start` without `end` (or `end` not strictly after `start`)
 * clears BOTH hours while leaving `date` intact — half-seeding a selection is worse than not seeding
 * one, because a booker who sees 5 PM highlighted with no end hour has to work out what the page did to
 * their request before they can undo it.
 *
 * SEEDING A SELECTION IS NOT AUTHORISING ONE (T-12-02-SEEDTRUST). This produces a REQUEST shape and
 * nothing more; the listing RSC only seeds a selection when the read model reports those hours free, and
 * `placeHold` re-derives availability and price inside its own transaction regardless (D-130).
 */
export const searchedWindowSchema = z
  .object({
    date: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
  })
  .transform((raw): SearchedWindow => {
    const date = parsePickedDate(raw.date);
    const startHour = parseWindowHour(raw.start);
    const endHour = parseWindowHour(raw.end);
    const wholeWindow = startHour !== null && endHour !== null && endHour > startHour;
    return {
      date,
      startHour: wholeWindow ? startHour : null,
      endHour: wholeWindow ? endHour : null,
    };
  });

/** The empty window — what a caller uses when `searchedWindowSchema.safeParse` itself fails (e.g. a
 *  repeated param arriving as `string[]`). Same shape, so no call site needs a null branch. */
export const NO_SEARCHED_WINDOW: SearchedWindow = { date: null, startHour: null, endHour: null };

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
    // WR-04 — WHAT THIS `.max()` IS, AND WHAT IT IS NOT. It is a SHAPE ceiling: it bounds an UNTRUSTED
    // REQUEST before it reaches the DB, so a crafted body cannot make the server carry an absurd number
    // around. It is NOT the overflow protection, and the comment that used to stand here said it was.
    // A request can only ever ask for LESS than the listing allows — the effective headcount is clamped to
    // the listing's own `maxOccupancy` inside `createPendingHold`'s transaction (D-111 / Security V4) —
    // so the size of the money product is decided by the HOST's numbers, not by this one.
    //
    // THE CHAIN THAT IS REAL, in order:
    //   1. host-input ceilings — `MAX_OPEN_CAPACITY` and `MAX_PER_HEAD_PRICE_CENTS` in
    //      `publishSchema`/`draftSchema` (src/lib/validation/listing.ts), whose product is arithmetically
    //      proven below int4 in the comment that declares them;
    //   2. the runtime product guard in the admissions claim, against `MAX_MONEY_CENTS`
    //      (src/lib/booking/pricing.ts), which catches rows written before (1) existed;
    //   3. this shape bound, which only keeps a nonsense request out of the machinery.
    // `MAX_MONEY_CENTS` is int4's own limit on `space_price_cents` / `service_fee_cents` /
    // `quoted_total_cents`; exceeding it is a Postgres 22003 that `mapBookingError` re-raises as a raw 500
    // (T-03-500), which is why layers (1) and (2) exist at all.
    //
    // Same ceiling as `declaredPaxSchema` on the re-price path (`src/app/actions/booking.ts:81`): one shape
    // bound, one number.
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
 * WR-04 restated for passes: the `.max()` is a SHAPE ceiling and NOTHING MORE. It bounds an untrusted
 * request before it reaches the machinery; it does not and cannot bound the money product, because
 * `granted` is `min(requested, remaining)` and `remaining` comes from the HOST's `max_occupancy`, read
 * inside `createOpenCapacityHold`'s transaction against the live admissions SUM (D-124 / Security V4). A
 * booker asking for fewer passes than are left cannot make the product smaller than the host's own numbers
 * already allow, so a ceiling on the request was never the thing standing between
 * `per_head_price_cents × passes` and a Postgres 22003 on the `integer` money columns — the raw 500
 * `mapBookingError` would produce (T-03-500).
 *
 * What actually stands there: `MAX_OPEN_CAPACITY` × `MAX_PER_HEAD_PRICE_CENTS` in
 * `publishSchema`/`draftSchema` (src/lib/validation/listing.ts), whose product plus the D-74 service fee is
 * arithmetically proven below `MAX_MONEY_CENTS` where those two are declared — plus the runtime product
 * guard in the claim itself, for listings priced before those ceilings existed.
 */
export const openHoldSchema = z.object({
  listingId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a day to book."),
  requestedPasses: z.coerce.number().int().min(1).max(10_000),
  idempotencyKey: z.string().max(200).optional(),
});

export type OpenHoldInput = z.infer<typeof openHoldSchema>;
