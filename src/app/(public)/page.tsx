// The demand-side front door (D-29) — the search / browse home at `/`, replacing the Next.js scaffold.
//
// A public RSC (mirrors the listings/[id] public pattern): it awaits `searchParams`, RE-VALIDATES them
// through `searchParamsSchema` (T-04-PARAMTAMPER — no unvalidated param reaches the query; a garbage param
// falls back to the default city view, never a crash), and runs the two-stage `searchListings` server-side
// so the raw SQL never reaches the client. The SearchBar serializes filters to the URL; this page reads +
// validates them and renders the results. deriveBookable inclusion is enforced INSIDE the search SQL
// (Stage-1), never re-derived per card (D-16/D-30).
//
// States (UI-SPEC § Screen contract): default city view (D-30) · populated grid + sort + Load more (D-32) ·
// zero-result relaxation band + escape hatches (STATE-03 / D-52, D-53) · cold-start liquidity floor ·
// fetch error. Coral appears exactly once on the page — the SearchBar's Search button.
//
// ── STATE-03, AND THE THING THIS FILE STOPPED DOING (plan 12-12) ───────────────────────────────────
// A zero-result search used to run ONE broadened query here that dropped radius, category, priceMax,
// date, start AND end together, and handed the answer to the results shell as a prop it rendered under
// an unlabelled divider. Six constraints vanished and the page said which one gave: none — which is
// precisely the gap STATE-03 names. That block is DELETED. In its place `runRelaxationLadder` relaxes
// ONE constraint at a time, in the fixed order radius -> price -> time-of-day -> date, stopping at the
// first rung that returns rows and NEVER relaxing the activity (D-52).
//
// ── WHERE THE TWO QUERIES LIVE, WHICH IS THE WHOLE OF D-53's SECOND HALF ───────────────────────────
// The URL keeps the BOOKER'S query — `activeQueryString(parsed, page)` is built from `parsed`, not from
// the ladder's output — while `barDefaults` is built from the EFFECTIVE params. That is what lets the
// radius control read `25 km` while `Undo` still has the booker's original `10 km` to restore, and it
// is why Undo is an ADDITION of `relax=0` rather than a rewrite of anything.

import { db } from "@/lib/db";
import { searchListings, type SearchResultRow } from "@/lib/search/query";
import {
  RELAXATION_LADDER,
  RELAX_FETCH_LIMIT,
  runRelaxationLadder,
  type RelaxationOutcome,
} from "@/lib/search/relaxation";
import { searchParamsSchema, type SearchParams } from "@/lib/validation/booking";
import { SearchBar, type SearchBarDefaults } from "@/components/search/search-bar";
import { SearchResults } from "@/components/search/search-results";

// Single-city launch (CLAUDE.md): the default browse header + cold-start copy name the launch city.
const LAUNCH_CITY = "Manila";
// Cap the cumulative Load-more fetch so a crafted `?page=` can't spin the query loop (T-04-PARAMTAMPER).
const MAX_PAGES = 50;

/** Serialize the validated params back to the URL contract — the base the client mutates for sort / pager. */
function activeQueryString(p: SearchParams, page: number): string {
  const q = new URLSearchParams();
  if (p.lat !== undefined && p.lng !== undefined) {
    q.set("lat", String(p.lat));
    q.set("lng", String(p.lng));
  }
  if (p.category) q.set("category", p.category);
  if (p.date) q.set("date", p.date);
  if (p.start) q.set("start", p.start);
  if (p.end) q.set("end", p.end);
  if (p.priceMax !== undefined) q.set("priceMax", String(p.priceMax));
  if (p.radius !== 10) q.set("radius", String(p.radius));
  if (p.sort !== "nearest") q.set("sort", p.sort);
  if (page !== 0) q.set("page", String(page));
  // `relax` is serialized only in its non-default form, exactly like `radius` and `sort` above, so a
  // relaxing search keeps the URL the booker would recognise. `Undo` is what adds `relax=0`, and once
  // it is in the URL this keeps it there through a sort change or a Load more — otherwise the next
  // click the booker made would silently re-enter the ladder they just left.
  if (p.relax !== 1) q.set("relax", String(p.relax));
  return q.toString();
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  // Re-validate every URL param before it can reach the query; a tampered/garbage param falls back to the
  // default city view (D-30) rather than crashing (T-04-PARAMTAMPER, Security V5).
  const result = searchParamsSchema.safeParse(sp);
  const parsed: SearchParams = result.success ? result.data : searchParamsSchema.parse({});

  const hasSet = (v?: string) => v !== undefined && v !== "";
  const hasOrigin = parsed.lat !== undefined && parsed.lng !== undefined;
  const hasQuery =
    hasOrigin || hasSet(parsed.category) || parsed.priceMax !== undefined || hasSet(parsed.date);

  const page = Math.min(parsed.page, MAX_PAGES);

  // Cumulative fetch pages 0..page so "Load more" appends without a dedicated client fetch endpoint; the
  // last page's probe drives whether more remain (D-32). Bounded + stops early once exhausted.
  let results: SearchResultRow[] = [];
  let hasMore = false;
  let fetchError = false;
  try {
    const acc: SearchResultRow[] = [];
    for (let pg = 0; pg <= page; pg++) {
      const res = await searchListings(db, { ...parsed, page: pg });
      acc.push(...res.results);
      hasMore = res.hasMore;
      if (!res.hasMore) break; // exhausted — no point fetching further pages
    }
    results = acc;
  } catch (error) {
    // This is a deliberately terse production diagnostic. The page still renders the existing safe fallback,
    // while the operation and database error code (never the error text, which may contain connection data)
    // let the deployment log distinguish a bad query from an unavailable data service.
    const databaseCode =
      typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
        ? error.code
        : undefined;
    console.error("public-search-failed", { databaseCode });
    fetchError = true;
  }

  // ── STATE-03: the ladder (D-52 / D-53) ─────────────────────────────────────────────────────────
  // Entered only on a zero-result search that HAD a query and that has not been suppressed. Cold start
  // is excluded by `hasQuery` — D-54: no band, no ladder, no escape hatches, because every hatch is a
  // filter control and offering one to someone in a city with no supply is a button that cannot work.
  const zeroResult = !fetchError && hasQuery && results.length === 0;
  // Which rungs COULD change a predicate for this query — no queries run, just the transforms. It is
  // what entitles the empty state to say "we widened the search and still came up empty": a query with
  // no origin, no price and no date has nothing to widen, and saying otherwise would be a claim about
  // work nobody did.
  const applicableRungs =
    zeroResult && parsed.relax !== 0
      ? RELAXATION_LADDER.filter((rung) => rung.relax(parsed) !== null).length
      : 0;

  let relaxation: RelaxationOutcome | null = null;
  // ⚠ "THE LADDER FOUND NOTHING" AND "THE LADDER NEVER FINISHED" ARE THE SAME `relaxation === null`, AND
  // THEY ARE NOT THE SAME CLAIM (12-REVIEW WR-01). `relaxExhausted` below entitles the empty state to
  // say *"We widened the search and still came up empty"* — which `search-results.tsx` states plainly is
  // "a claim about work that was actually done". A ladder that THREW mid-rung (a transient DB error
  // inside one of the `searchListings` calls it drives) leaves `relaxation` at exactly the null the
  // all-rungs-empty case leaves it at, so without this flag the booker is told, specifically and
  // falsely, that four queries ran and came back empty when none of them completed. `applicableRungs` is
  // a STATIC count of what could be widened, computed before any query runs, so it cannot tell the two
  // apart either. This is the one bit that can.
  let ladderFailed = false;
  if (zeroResult && applicableRungs > 0) {
    try {
      relaxation = await runRelaxationLadder(
        parsed,
        // Every rung reuses `searchListings` — its parameter-bound Drizzle `sql` templates and its
        // `parsePickedDate` canonicalisation (T-12-12-SQLI). No rung builds a predicate string, and the
        // whole ladder runs HERE, on the server (T-12-12-CLIENTFILTER).
        (p) => searchListings(db, p, undefined, { fetchLimit: RELAX_FETCH_LIMIT }),
        { log: (message) => console.warn(message) },
      );
    } catch {
      // Best-effort, exactly as the fallback it replaces was: a failed rung yields the empty state with
      // its escape hatches, never an error on a search that DID run and simply found nothing. What is
      // recorded rather than swallowed is the FACT of the failure — the swallowing was right, the
      // silence about it was not.
      ladderFailed = true;
    }
  }

  const count = results.length;
  const heading = !hasQuery
    ? `Browse spaces in ${LAUNCH_CITY}`
    : hasOrigin
      ? `${count} ${count === 1 ? "space" : "spaces"} near you`
      : `${count} ${count === 1 ? "space" : "spaces"} found`;

  // THE CONTROL SHOWS WHAT WAS USED; THE URL KEEPS WHAT WAS ASKED (D-53). `effective` is the ladder's
  // relaxed params when a rung fired and the booker's own params otherwise, so the bar and the results
  // can never disagree — while `activeQueryString(parsed, …)` below still carries the original query,
  // which is the thing `Undo` restores.
  const effective: SearchParams = relaxation?.effectiveParams ?? parsed;
  const barDefaults: SearchBarDefaults = {
    lat: effective.lat,
    lng: effective.lng,
    category: effective.category,
    date: effective.date,
    start: effective.start,
    end: effective.end,
    priceMaxCents: effective.priceMax,
    radius: effective.radius,
    relaxed: relaxation?.rung ?? null,
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-display">Find a space to play</h1>
          <p className="text-muted-foreground">
            Search fitness and recreational spaces you can book by the hour or the day.
          </p>
        </header>

        {/* ⚠ THE `key` IS WHAT MAKES THE MOVED CONTROL ACTUALLY MOVE, AND IT WAS MEASURED RATHER THAN
            REASONED ABOUT. `SearchBar` is a react-hook-form form, and RHF reads `defaultValues` ONCE,
            at mount. A soft `router.push` re-runs this RSC and hands down new `defaults`, but React
            reuses the same component instance — so the bar kept rendering the booker's own `10 km`
            while the band beside it said `25 km`. Observed as a red in
            `e2e/zero-result-relax.spec.ts` case (b), verbatim: `Expected: "10 km" / Received: "25 km"`,
            with both strings read from the DOM. That is precisely the disagreement D-53 exists to
            prevent, arriving through the mechanism meant to fix it.

            The key changes ONLY when the ladder's outcome changes, so the ordinary browse path still
            never remounts the bar and nothing a booker has typed is disturbed by a plain search. It is
            the same read-once-plus-key pairing `relax-band.tsx`'s latch uses one component over. */}
        <SearchBar
          key={
            relaxation === null
              ? "booker-query"
              : [
                  "relaxed",
                  relaxation.rung,
                  effective.radius,
                  effective.priceMax ?? "",
                  effective.date ?? "",
                  effective.start ?? "",
                  effective.end ?? "",
                ].join(":")
          }
          defaults={barDefaults}
          sort={parsed.sort}
        />

        <SearchResults
          results={results}
          hasMore={hasMore}
          hasOrigin={hasOrigin}
          hasQuery={hasQuery}
          sort={parsed.sort}
          page={page}
          currentRadius={parsed.radius}
          heading={heading}
          city={LAUNCH_CITY}
          queryString={activeQueryString(parsed, page)}
          searchedWindow={{ date: parsed.date, start: parsed.start, end: parsed.end }}
          relaxation={
            relaxation === null
              ? null
              : {
                  rung: relaxation.rung,
                  results: [...relaxation.results],
                  asked: {
                    category: parsed.category,
                    // Only meaningful with an origin — without one no radius predicate was in play and
                    // line 1 must not claim one was.
                    radiusKm: hasOrigin ? parsed.radius : undefined,
                    priceMaxCents: parsed.priceMax,
                    date: parsed.date,
                    start: parsed.start,
                    end: parsed.end,
                  },
                  effectiveRadiusKm: effective.radius,
                  // The EFFECTIVE window, not the booker's: a card found by dropping the date must not
                  // carry an "Available 9–11 AM on Fri, Aug 21" line about a day nothing checked it
                  // against (D-37's "never advertise a reservation the booker is not buying", one rung
                  // over).
                  searchedWindow: {
                    date: effective.date,
                    start: effective.start,
                    end: effective.end,
                  },
                }
          }
          relaxExhausted={
            // A CRASHED LADDER IS NOT "WORK THAT WAS ACTUALLY DONE" (WR-01) — see `ladderFailed` above.
            // Falling back to the shipped `Try widening your search.` body is the honest answer: it is
            // the same sentence a booker gets after an Undo, where nothing was widened either. It is
            // deliberately NOT `fetchError`: that copy is about the search itself failing, and the
            // booker's OWN search succeeded here and genuinely returned nothing.
            relaxation === null && applicableRungs > 0 && !ladderFailed
          }
          fetchError={fetchError}
        />
      </div>
    </main>
  );
}
