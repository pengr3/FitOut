// The two SEARCHED-WINDOW param parsers — `date` (`YYYY-MM-DD`) and `start`/`end` (venue-local `HH:mm`).
//
// WHY THIS FILE EXISTS AS A FILE, MEASURED RATHER THAN PREFERRED (plan 12-02, Rule 3).
// Both functions shipped inside `src/lib/search/query.ts` and both are pure, string-in/number-out, with
// no I/O and no imports. `query.ts` itself is NOT pure: it imports `getAvailability` from
// `@/lib/availability/read-model`, whose first line is `import "server-only"`.
//
// Plan 12-02 asks `src/lib/validation/booking.ts` to canonicalise the searched window through these two
// functions. `booking.ts` is imported by `src/components/search/search-bar.tsx`, which is `"use client"`
// — so a value import of `query.ts` from `booking.ts` puts the guarded read model in the browser graph.
// MEASURED, not assumed (2026-08-18, `npx next build` with exactly that import added):
//
//   Error: Turbopack build failed with 10 errors:
//     'server-only' cannot be imported from a Client Component module
//     > 1 | import "server-only";
//
// It is also an import CYCLE — `query.ts` already imports `type SearchParams` from `booking.ts` — which
// is inert only because that import is type-only and therefore erased.
//
// So the parsers move DOWN to a leaf both sides may depend on, and `query.ts` RE-EXPORTS them. That
// keeps the rule the plan actually cares about: one implementation of each parser, reused rather than
// re-derived. Timezone/date math re-derived per call site is the top booking-app failure mode
// (CLAUDE.md), and two strict parsers that drift apart would put a different notion of "on the hour" on
// the search page and the listing page.
//
// KEEP THIS FILE ISOMORPHIC. It must import nothing that is not itself isomorphic — no DB, no read
// model, no `server-only` module, no money graph. That property is the entire reason it exists.

/** A picked venue-local calendar day. `month` is 1-based (getAvailability's convention). */
export type PickedDate = { year: number; month: number; day: number; iso: string };

/**
 * Strictly parse a `YYYY-MM-DD` search-param date into calendar components, or null when absent/malformed.
 * Strict on purpose: `date` is attacker-controllable and flows into a `::date` cast — a canonical literal
 * (never the raw string) is what reaches SQL, so a crafted value can never raise `22007` mid-query. When
 * this returns null the weekday pre-filter and the Stage-2 availability filter are both skipped (the
 * default browse view, D-30).
 */
export function parsePickedDate(date: string | undefined): PickedDate | null {
  if (!date) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Round-trip guard: rejects impossible dates (e.g. 2026-02-31) by checking the Date recomposes exactly.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day, iso: `${m[1]}-${m[2]}-${m[3]}` };
}

/**
 * Parse a venue-local wall-clock `HH:mm` (or `HH`) search-param time into an on-the-hour integer 0–23, or
 * null when absent / malformed / off-the-hour (D-22). Like `date`, the time is attacker-controllable and
 * only ever interpreted per-venue in Stage-2 (never bound into SQL) — a non-conforming value simply
 * degrades to the date-only filter, never a crash.
 *
 * IT IS ALSO WHAT KEEPS THE TWO `start` FORMATS ON `/listings/[id]` APART (RESEARCH Pitfall 4). The
 * search card writes `start` as this venue-local `HH:mm`; the `resume=1` path parses `start` through
 * `slotSelectionSchema`, where it is a `z.string().datetime()` UTC ISO instant. Same param name, same
 * route, two formats. A UTC ISO instant fails the regex below on its first character group, which is
 * why the searched-window reader can be unconditional without widening `slotSelectionSchema`.
 */
export function parseWindowHour(t: string | undefined): number | null {
  if (!t) return null;
  const m = /^(\d{1,2})(?::(\d{2}))?$/.exec(t);
  if (!m) return null;
  const hour = Number(m[1]);
  const min = m[2] === undefined ? 0 : Number(m[2]);
  if (hour < 0 || hour > 23 || min !== 0) return null; // on-the-hour only (D-22)
  return hour;
}
