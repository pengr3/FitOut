// The ONE definition of "the venue timezone VARIES on this list" — the rule that decides whether a host
// LIST row names its venue's city or not (quick task 260824-ej2, PM ruling of 2026-08-24).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE RULING THIS FILE IMPLEMENTS, AND THE SHIPPED RULE IT WALKS BACK
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Phase 14's UAT filed finding F-2: at 1280px the Approve control on `/host/bookings` sits 69 of its
// 90 pixels past its container's clip edge. Measured against the SEEDED CATALOGUE's own five titles
// and cities (`scripts/seed.ts:48-52`), the widest column by a distance is **When at 357px** — because
// every row repeats ` ({City} time)`. Two fixes were put to the PM and one was chosen:
//
//     "Show the timezone only when it varies." Drop the suffix when all the rendered rows share one
//     venue clock; keep it when they do not.
//
// THE COST WAS STATED AND ACCEPTED. This walks back the shipped rule that EVERY time on a host surface
// names its venue's timezone (SC#2 / D-105) — a single-zone host stops seeing it. That rule is now
// amended rather than abandoned: it still holds unconditionally on every surface that renders ONE
// booking (`/host/bookings/[id]`, the emails, the whole booker path), where there is no second row to
// be confused with and no "varies" to compute. It is relaxed only on the host LIST surfaces that
// repeat the label once per row.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS IS A CALL-SITE MODULE AND NOT A CHANGE TO `when-label.ts`
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `composeWhenLabelShort` ALREADY omits the suffix when `city` is null — its `WhenLabelInput.city`
// docblock says so and its `compose` body implements it. So the shortening is available to any caller
// that hands over a null city, and no formatter change is needed OR wanted: `when-label.ts` is the
// single shared venue-local formatter and the BOOKER path renders through it too, so a rule added
// there would silently restyle surfaces this ruling says nothing about. The decision belongs to the
// SURFACE — which rows are on screen together is a fact only the surface knows — and the formatter
// stays a pure function of its input.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE TWO DEFINITIONAL CHOICES, BOTH DELIBERATE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// 1. "VARIES" IS ABOUT THE TIMEZONE, NEVER ABOUT THE CITY NAME. The suffix exists to disambiguate a
//    CLOCK, and a city is only ever a human-readable proxy for one. The seeded catalogue is five
//    listings in five different cities — Makati, Mandaluyong, Pasig, Quezon City, Muntinlupa — and one
//    single timezone, so every one of those rows names the same instant as every other. Keying the
//    rule on the city would have kept all five suffixes, kept all 357px of the When column, and fixed
//    nothing; keying it on the timezone is both the honest definition and the one that answers F-2.
//
// 2. IT IS COMPUTED OVER THE RENDERED SET, NOT OVER THE HOST'S LISTINGS. The alternative was the
//    host's distinct listing timezones, which never flickers under the `?listing=` filter but shows a
//    suffix on lists that do not need one. The rendered set was chosen because it is TRUTHFUL BY
//    CONSTRUCTION — the suffix is present exactly when two rows on screen together could be read as
//    the same clock while being different ones — and because it needs no new read: every one of the
//    three call sites already projects `timezone` and `city` for the formatter. A rule that needs a
//    query is a rule that can be adopted wrongly by the fourth surface.
//
//    ⚠ THE ACCEPTED CONSEQUENCE, STATED SO IT IS NOT DISCOVERED. "Rendered set" means the rows on
//    THIS page of THIS tab under THIS filter. So on `/host/bookings` a two-zone host who filters to
//    one space loses the suffix, and a host whose second zone only appears on page two sees the
//    suffix appear when they press *Load more*. Both are truthful at the moment they are read, which
//    is the property that was ranked above never-changing.
//
// ⚠ WALK A OF THE PHASE 14 UAT PASSED ON THIS EXACT CASE AND MUST STAY PASSING. A host owning a
// Makati court and a Venice Beach studio sees the two rows straddle a date boundary under one heading
// reading *Today*, and the PM's verdict was that the CITY NAME ON EACH LINE is what makes that read as
// two real sessions rather than as a bug. Two rendered rows, two timezones — so this rule keeps both
// suffixes, by construction rather than by luck. `tests/booking/venue-clock-scope.test.ts` reproduces
// that fixture and asserts the two labels the UAT log records verbatim.
//
// Pure/isomorphic, exactly like `when-label.ts` beside it: no client and no server directive, so a
// Server Component, a server action and an Inngest function can all import it.

/**
 * The two fields a row must carry for this rule to be computable — the same two every host list
 * already projects for `composeWhenLabelShort`.
 *
 * Structural, so no ORM row type leaks in here and every call site can pass its own richer shape.
 */
export type VenueClockRow = {
  /** IANA venue timezone, e.g. "Asia/Manila" — the CLOCK, and the only thing "varies" is measured on. */
  timezone: string;
  /** Venue city, the human-readable proxy for that clock. Already nullable everywhere upstream. */
  city: string | null;
};

/**
 * Do the rows on screen together span more than one venue clock?
 *
 * Exported for its own test rather than for a call site: every surface should go through
 * `resolveListCity` below, so that the decision and its application cannot be written apart.
 *
 * A list of fewer than two rows can never be misread as two clocks, so it never varies — which is
 * also why the single-booking detail surfaces are not callers of this module at all.
 */
export function venueClocksVary(rows: readonly VenueClockRow[]): boolean {
  if (rows.length < 2) return false;
  const first = rows[0].timezone;
  return rows.some((row) => row.timezone !== first);
}

/**
 * The `city` to hand `composeWhenLabelShort` for each row of a host LIST.
 *
 * Returns a PROJECTOR rather than a boolean on purpose. The decision is a property of the whole
 * rendered set and must be taken exactly once, before the map; handing back a per-row function makes
 * that shape the only one a call site can write. The alternative — export the predicate and let each
 * page spell its own ternary — is three chances to compute "varies" inside the loop, against one row,
 * where it is always false and the suffix would vanish everywhere.
 *
 * A row whose city is null still gets null: the formatter has always omitted the suffix rather than
 * render a dangling " ( time)", and this rule adds no reason to change that.
 */
export function resolveListCity<R extends VenueClockRow>(
  rows: readonly R[],
): (row: R) => string | null {
  const varies = venueClocksVary(rows);
  return (row) => (varies ? row.city : null);
}
