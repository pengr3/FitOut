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
// zero-result escape hatches + a broadened-fallback "You might also like" row (D-31) · cold-start liquidity
// floor · fetch error. Coral appears exactly once on the page — the SearchBar's Search button.

import { db } from "@/lib/db";
import { searchListings, type SearchResultRow } from "@/lib/search/query";
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
  } catch {
    fetchError = true;
  }

  // Zero-result after filtering (D-31): run a broadened fallback (max radius, drop the narrowest filters)
  // for the "You might also like" cards. Skipped for cold start (no query) and when the fetch already failed.
  let nearbyAlternatives: SearchResultRow[] = [];
  if (!fetchError && hasQuery && results.length === 0) {
    try {
      const broadened = await searchListings(db, {
        ...parsed,
        radius: 25,
        category: undefined,
        priceMax: undefined,
        date: undefined,
        start: undefined,
        end: undefined,
        page: 0,
      });
      nearbyAlternatives = broadened.results.slice(0, 6);
    } catch {
      // Nearby alternatives are best-effort — a failure just yields the escape hatches with no divider.
    }
  }

  const count = results.length;
  const heading = !hasQuery
    ? `Browse spaces in ${LAUNCH_CITY}`
    : hasOrigin
      ? `${count} ${count === 1 ? "space" : "spaces"} near you`
      : `${count} ${count === 1 ? "space" : "spaces"} found`;

  const barDefaults: SearchBarDefaults = {
    lat: parsed.lat,
    lng: parsed.lng,
    category: parsed.category,
    date: parsed.date,
    start: parsed.start,
    end: parsed.end,
    priceMaxCents: parsed.priceMax,
    radius: parsed.radius,
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

        <SearchBar defaults={barDefaults} sort={parsed.sort} />

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
          nearbyAlternatives={nearbyAlternatives}
          fetchError={fetchError}
        />
      </div>
    </main>
  );
}
