// STATE-03 — the zero-result relaxation ladder (D-52 / D-53, plan 12-12).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS REPLACES, AND WHY THE REPLACEMENT IS A LADDER RATHER THAN A BIGGER QUERY
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `(public)/page.tsx` used to answer a zero-result search with ONE broadened query that dropped radius,
// category, priceMax, date, start AND end together, and rendered the result under an unlabelled
// "You might also like" divider. Six constraints vanished and the page said which one gave: none. That
// is exactly the gap STATE-03 names, and it is why this module relaxes ONE constraint at a time, in a
// FIXED order, stopping at the first rung that returns rows — so the band above the grid can name a
// single thing and be telling the truth.
//
// THE ACTIVITY IS NEVER RELAXED (D-52). `category` is a single combined space-type-OR-activity-tag
// param, and dropping it is precisely what the old fallback did. Someone searching for a badminton
// court will not take a yoga studio; a page that swaps it has stopped answering the question it was
// asked. No rung below touches `category`, and `tests/search/relaxation-ladder.test.ts` asserts that
// over the transforms themselves as well as over the rows they return.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE MEASURED COST, AND WHY THE CHEAPEST RUNG IS LAST
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The ladder's cost is NOT "four PostGIS round-trips". `searchListings`' Stage-2 is a SEQUENTIAL
// per-candidate `getAvailability` loop, and its fetch limit derives to 41 whenever a date is picked:
//
//   rung 1  radius -> the next preset up      Stage-1 ST_DWithin bound only    Stage-1 + a FULL Stage-2 loop
//   rung 2  price ceiling -> removed          Stage-1 predicate dropped        Stage-1 + a FULL Stage-2 loop
//   rung 3  time-of-day -> removed, date kept Stage-2's date-only branch       Stage-1 + a FULL Stage-2 loop
//   rung 4  date -> removed, time-of-day kept Stage-2 SKIPPED ENTIRELY         Stage-1 only — THE CHEAPEST
//
// So the cheapest rung is the LAST one, and the order is a product decision (relax the least
// consequential thing first) rather than a performance one. Two mitigations, both cheap and both taken
// here: every rung query runs with `page: 0`, and the caller passes `RELAX_FETCH_LIMIT` so a rung pays
// for the six cards the band will show instead of for 41 candidates (`SearchListingsOptions.fetchLimit`).
//
// RUNNING ALL FOUR CONCURRENTLY IS REJECTED, and the reason is in the shape of the cost above: a fan-out
// pays for EVERY rung on EVERY zero-result search in order to buy bounded latency on the rarest path.
// Sequential-with-stop-at-first-hit pays for exactly as many rungs as it takes to find an answer, and
// the only search that pays for all four is the one where the answer is genuinely "nothing" — which is
// also the search whose booker is about to see the empty state anyway.
//
// THE DECLARED BUDGET (12-UI-SPEC). If the four-rung worst case ever measures above 2000 ms against the
// canonical seed set, the fallback is `maxRungs: 2` (radius and price — the UI-SPEC's own bound), NEVER
// a fan-out. `runRelaxationLadder` takes that bound as a parameter and `log`s whatever it caps, because
// a silent truncation reads as "we tried everything" when it did not.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHERE THE RELAXED STATE LIVES (RESEARCH Open Question 3, resolved in the plan)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The URL keeps the BOOKER'S query. `effectiveParams` below is what the RSC feeds `barDefaults`, so the
// radius control can read `25 km` while `activeQueryString` still carries the 10 km that `Undo` restores.
// Rewriting the booker's URL to the relaxed query would destroy the very thing Undo puts back.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// KEEP THIS MODULE FREE OF `server-only` IMPORTS
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `relax-band.tsx` is a Client Component and imports `RelaxationRungId` from here. That import is a TYPE
// and is erased — but the moment this file gains a VALUE import that reaches `@/lib/availability/read-model`
// (which `./query` does), the band drags `server-only` into the client graph and the build fails with the
// ten errors `./window-params.ts`'s header records verbatim. The query runner is INJECTED for exactly
// that reason: this module names `searchListings`' types and never its implementation.

import {
  MAX_RADIUS_KM,
  RADIUS_PRESETS,
  type SearchParams,
} from "@/lib/validation/booking";
import { parsePickedDate, parseWindowHour } from "./window-params";
import type { SearchResult, SearchResultRow } from "./query";

/** The four rungs, by name. Ordered; the order IS the requirement (D-52). */
export type RelaxationRungId = "radius" | "price" | "time-of-day" | "date";

/**
 * One rung: the constraint it relaxes and the transform that relaxes it.
 *
 * `relax` returns `null` when this rung has NOTHING to relax for this particular query — no origin (so
 * no radius applies), no price ceiling, no searched window, no date. A rung that cannot change anything
 * is skipped WITHOUT a query, which is what keeps a category-only search from paying for four round
 * trips that would each return the same empty set.
 */
export type RelaxationRung = {
  readonly id: RelaxationRungId;
  /** The `SearchParams` key(s) this rung touches, for the test that asserts `category` is in none of them. */
  readonly relaxes: readonly (keyof SearchParams)[];
  readonly relax: (params: SearchParams) => SearchParams | null;
};

/**
 * THE LADDER. Data, in the fixed order radius -> price -> time-of-day -> date, and `category` appears in
 * no rung's `relaxes` and in no rung's transform.
 *
 * Every transform derives from the BOOKER'S ORIGINAL params, never from the previous rung's output —
 * that is what "one constraint at a time" means. Rung 2 does not run against rung 1's widened radius.
 */
export const RELAXATION_LADDER: readonly RelaxationRung[] = [
  {
    id: "radius",
    relaxes: ["radius"],
    // The next preset UP, to the declared max. Not "jump to 25": a booker who asked for 2 km is told
    // about 5 km, which is a change they can still recognise as their own search.
    relax: (p) => {
      if (p.lat === undefined || p.lng === undefined) return null; // no origin ⇒ no radius predicate
      const next = RADIUS_PRESETS.find((r) => r > p.radius);
      if (next === undefined || p.radius >= MAX_RADIUS_KM) return null; // already at the declared max
      return { ...p, radius: next };
    },
  },
  {
    id: "price",
    relaxes: ["priceMax"],
    relax: (p) => (p.priceMax === undefined ? null : { ...p, priceMax: undefined }),
  },
  {
    id: "time-of-day",
    relaxes: ["start", "end"],
    // The DATE is kept; only the hours go. Stage-2 then takes its date-only branch, which keeps a
    // listing if ANY hour that day is free.
    relax: (p) => {
      if (parsePickedDate(p.date) === null) return null;
      const startHour = parseWindowHour(p.start);
      const endHour = parseWindowHour(p.end);
      // No whole window ⇒ nothing to relax. A partial or inverted window was already discarded by the
      // query itself (`hasWindow`), so relaxing it would change no predicate and buy a round trip.
      if (startHour === null || endHour === null || endHour <= startHour) return null;
      return { ...p, start: undefined, end: undefined };
    },
  },
  {
    id: "date",
    relaxes: ["date"],
    // The hours are KEPT and the date goes. `start`/`end` are inert once `picked` is null (Stage-2 is
    // skipped entirely), and they are kept anyway because the band says "same area and time" and
    // because `effectiveParams` feeds the search bar — a control that silently cleared the booker's
    // hours would disagree with the sentence above it.
    relax: (p) => (parsePickedDate(p.date) === null ? null : { ...p, date: undefined }),
  },
];

/** The hard cap. Four rungs, ever — asserted by invocation count, not by reading this constant. */
export const RELAXATION_MAX_RUNGS = RELAXATION_LADDER.length;

/** How many cards the band shows. The UI-SPEC's number, and the reason `RELAX_FETCH_LIMIT` is 7. */
export const RELAX_BAND_CARDS = 6;

/**
 * The `fetchLimit` a rung query asks for: six cards plus the has-more probe.
 *
 * This is the T-12-12-LADDERCOST mitigation. Without it a dated rung fetches 41 candidates and runs 41
 * sequential availability reads to render six tiles.
 */
export const RELAX_FETCH_LIMIT = RELAX_BAND_CARDS + 1;

/** The declared budget for the four-rung worst case (12-UI-SPEC). Over it, bound the ladder at two. */
export const RELAXATION_BUDGET_MS = 2000;

/** What the ladder found. `null` is the honest answer when nothing did. */
export type RelaxationOutcome = {
  /** The ONE constraint that gave. The band names this and nothing else. */
  readonly rung: RelaxationRungId;
  /** The booker's params with exactly that one constraint relaxed — what `barDefaults` is built from. */
  readonly effectiveParams: SearchParams;
  /** At most `RELAX_BAND_CARDS` rows, already sliced. */
  readonly results: readonly SearchResultRow[];
  /** How many rung QUERIES actually ran. Never more than the bound; often fewer. */
  readonly rungsRun: number;
};

/** The injected query runner — `searchListings` bound to a db, in production. */
export type RelaxationQueryRunner = (params: SearchParams) => Promise<SearchResult>;

export type RelaxationOptions = {
  /** Bound the ladder. Defaults to all four; the UI-SPEC's over-budget fallback is 2. */
  readonly maxRungs?: number;
  /** Where a capped ladder says so. Defaults to a no-op; the RSC passes `console.warn`. */
  readonly log?: (message: string) => void;
};

/**
 * Run the ladder: sequential, stop at the first rung that returns rows, never a fan-out.
 *
 * Returns `null` — meaning "the empty state is the honest answer" — when `relax` is 0, when no rung has
 * anything to relax for this query, or when every attempted rung came back empty.
 */
export async function runRelaxationLadder(
  params: SearchParams,
  run: RelaxationQueryRunner,
  options: RelaxationOptions = {},
): Promise<RelaxationOutcome | null> {
  // THE SUPPRESSION FLAG, CHECKED BEFORE ANYTHING ELSE. `relax=0` is what `Undo` adds to the booker's
  // original query, and it must short-circuit before a single query runs — otherwise pressing Undo
  // re-relaxes, the band comes back, and the control the booker just put back moves again.
  if (params.relax === 0) return null;

  const log = options.log ?? (() => {});
  const requested = options.maxRungs ?? RELAXATION_MAX_RUNGS;
  const bound = Math.max(0, Math.min(requested, RELAXATION_LADDER.length));

  if (bound < RELAXATION_LADDER.length) {
    // NAMED, never silent. A truncated ladder that logged nothing would read, in every downstream
    // artefact, as "we tried everything and there is nothing" — which is a different and stronger claim
    // than the one a bounded run is entitled to make.
    log(
      `[relaxation] ladder bounded at ${bound} of ${RELAXATION_LADDER.length} rungs; not attempted: ` +
        RELAXATION_LADDER.slice(bound)
          .map((r) => r.id)
          .join(", "),
    );
  }

  let rungsRun = 0;
  for (let i = 0; i < bound; i++) {
    const rung = RELAXATION_LADDER[i];
    const relaxed = rung.relax(params);
    if (relaxed === null) continue; // nothing to relax here — skipped WITHOUT a query

    // `page: 0` on every rung: the band shows one bounded set and has no pager, and a crafted `?page=`
    // must not be able to walk the relaxed query (T-12-12-LADDERCOST).
    const effectiveParams: SearchParams = { ...relaxed, page: 0 };
    rungsRun += 1;
    const { results } = await run(effectiveParams);

    if (results.length > 0) {
      return {
        rung: rung.id,
        effectiveParams,
        results: results.slice(0, RELAX_BAND_CARDS),
        rungsRun,
      };
    }
  }

  return null;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this module
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • THE LADDER DOES NOT COMBINE RUNGS. If a query needs BOTH a wider radius and no price ceiling, the
//     ladder returns null and the booker gets the empty state. That is the requirement (D-52 names one
//     constraint at a time) and it is also the only shape the band can describe truthfully.
//   • IT SAYS NOTHING ABOUT RANKING. A rung's rows come back in `searchListings`' own order; the band
//     shows the first six. Whether those six are the six a booker would most want is a relevance
//     question this module does not have an opinion about.
//   • THE COST FIGURES ABOVE ARE STRUCTURAL, NOT A BENCHMARK. The number that matters is measured in
//     `tests/search/relaxation-ladder.test.ts` against the canonical seed set, and recorded in the
//     plan's SUMMARY with the branch taken against `RELAXATION_BUDGET_MS`.
