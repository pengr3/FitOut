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
