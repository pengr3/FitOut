// The booking horizon constant, split out of src/lib/availability/slots.ts and DELIBERATELY UNGUARDED
// (D-34 / GATE-05, the second split).
//
// Pure/isomorphic, and NO `server-only` guard: this is a plain number describing how far ahead the
// calendar may be paged, not a computation over money or availability. Two shipped CLIENT components
// import it legitimately — `availability-calendar.tsx` and `date-pass-picker.tsx`, both to bound
// react-day-picker's `endMonth` — and neither is a violation.
//
// WHY THE SPLIT EXISTS. `slots.ts` is a COMPUTATION module on D-34's deny-list (it turns venue-local wall
// clocks into UTC instants and every slot in the system flows through it), so it carries the guard. But it
// was also the home of this constant. Guarding it unsplit would have failed `next build` naming those two
// client components — the exact false-positive shape the fees.ts/config.ts split avoids on the money side.
// The deny-list is drawn at computation modules, not at whole trees.
//
// `slots.ts` re-exports this name so its own importers (and ~2 shipped test files) keep resolving it from
// where they always have; a CLIENT importer must use THIS module's path, because the re-export sits behind
// the guard.

/** Platform-wide booking horizon (D-26): a slot beyond this many days from now is not yet bookable. */
export const BOOKING_HORIZON_DAYS = 90;

/**
 * How many hourly rows the server-computed all-in price table carries (D-130 / GATE-05).
 *
 * 24 because a selection longer than a day IS a full-day selection, which the table keys separately, and
 * because A2 forbids a window crossing midnight — so no reachable hourly selection exceeds this. A
 * selection whose hour count is not a key in the table renders NO estimate line, which is the shipped
 * behaviour when a rate is null; it does not fall back to arithmetic.
 *
 * Lives HERE, beside the horizon and outside the guard, so the RSC that BUILDS the table
 * (`src/app/listings/[id]/page.tsx`) and the `"use client"` component that READS it
 * (`availability-calendar.tsx`) can both import the one constant instead of each spelling 24.
 */
export const ALL_IN_TABLE_MAX_HOURS = 24;
