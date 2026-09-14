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
import { searchParamsSchema, type SearchParams } from "@/lib/validation/booking";
import { SearchExperience } from "@/components/search/search-experience";
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
  if (p.locationLabel) q.set("locationLabel", p.locationLabel);
  if (p.partySize !== undefined) q.set("partySize", String(p.partySize));
  if (p.sort !== "nearest") q.set("sort", p.sort);
  if (page !== 0) q.set("page", String(page));
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

  const hasOrigin = parsed.lat !== undefined && parsed.lng !== undefined;
  const hasQuery =
    parsed.category !== undefined && hasOrigin && parsed.partySize !== undefined;

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
    const causeCode =
      typeof error === "object" &&
      error !== null &&
      "cause" in error &&
      typeof error.cause === "object" &&
      error.cause !== null &&
      "code" in error.cause &&
      typeof error.cause.code === "string"
        ? error.cause.code
        : undefined;
    console.error("public-search-failed", { databaseCode, causeCode });
    fetchError = true;
  }

  const count = results.length;
  const heading = !hasQuery
    ? `Browse spaces in ${LAUNCH_CITY}`
    : hasOrigin
      ? `${count} ${count === 1 ? "space" : "spaces"} near you`
      : `${count} ${count === 1 ? "space" : "spaces"} found`;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-display">Find a space to play</h1>
          <p className="text-muted-foreground">
            Search fitness and recreational spaces you can book by the hour or the day.
          </p>
        </header>

        <SearchExperience
          hasCompletedSearch={hasQuery}
          initialAnswers={{
            category: parsed.category,
            locationLabel: parsed.locationLabel,
            lat: parsed.lat,
            lng: parsed.lng,
            partySize: parsed.partySize,
          }}
        >
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
            relaxation={null}
            relaxExhausted={false}
            fetchError={fetchError}
          />
        </SearchExperience>
      </div>
    </main>
  );
}
