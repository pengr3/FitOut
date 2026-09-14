import { SearchExperience } from "@/components/search/search-experience";
import { SearchResults } from "@/components/search/search-results";
import { db } from "@/lib/db";
import { searchListings, type SearchResultRow } from "@/lib/search/query";
import { searchParamsSchema, type SearchParams } from "@/lib/validation/booking";

const LAUNCH_CITY = "Manila";
const MAX_PAGES = 50;

/** Serialize only the validated progressive-search answers plus supported sort and pagination state. */
function activeQueryString(params: SearchParams, page: number): string {
  const query = new URLSearchParams();
  if (params.lat !== undefined && params.lng !== undefined) {
    query.set("lat", String(params.lat));
    query.set("lng", String(params.lng));
  }
  if (params.category) query.set("category", params.category);
  if (params.locationLabel) query.set("locationLabel", params.locationLabel);
  if (params.partySize !== undefined) query.set("partySize", String(params.partySize));
  if (params.sort !== "nearest") query.set("sort", params.sort);
  if (page !== 0) query.set("page", String(page));
  return query.toString();
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16 supplies this request-time plain object asynchronously; validate it before query projection.
  const rawSearchParams = await searchParams;
  const parsedResult = searchParamsSchema.safeParse(rawSearchParams);
  const parsed = parsedResult.success ? parsedResult.data : searchParamsSchema.parse({});
  const page = Math.min(parsed.page, MAX_PAGES);

  // Retired URL keys may be accepted for compatibility by the validation layer, but are deliberately
  // absent from this public query. The only fixed internal default is the ordinary 10 km origin bound.
  const activeSearch: SearchParams = {
    lat: parsed.lat,
    lng: parsed.lng,
    radius: 10,
    category: parsed.category,
    locationLabel: parsed.locationLabel,
    partySize: parsed.partySize,
    sort: parsed.sort,
    page,
    relax: 1,
  };
  const hasOrigin = activeSearch.lat !== undefined && activeSearch.lng !== undefined;
  const hasQuery = activeSearch.category !== undefined && hasOrigin && activeSearch.partySize !== undefined;

  let results: SearchResultRow[] = [];
  let hasMore = false;
  let fetchError = false;
  try {
    const cumulativeResults: SearchResultRow[] = [];
    for (let currentPage = 0; currentPage <= page; currentPage += 1) {
      const response = await searchListings(db, { ...activeSearch, page: currentPage });
      cumulativeResults.push(...response.results);
      hasMore = response.hasMore;
      if (!response.hasMore) break;
    }
    results = cumulativeResults;
  } catch (error) {
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
            category: activeSearch.category,
            locationLabel: activeSearch.locationLabel,
            lat: activeSearch.lat,
            lng: activeSearch.lng,
            partySize: activeSearch.partySize,
          }}
        >
          <SearchResults
            results={results}
            hasMore={hasMore}
            hasOrigin={hasOrigin}
            hasQuery={hasQuery}
            sort={activeSearch.sort}
            page={page}
            heading={heading}
            city={LAUNCH_CITY}
            queryString={activeQueryString(activeSearch, page)}
            fetchError={fetchError}
          />
        </SearchExperience>
      </div>
    </main>
  );
}
