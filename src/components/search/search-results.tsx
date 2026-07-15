"use client";

// Search results shell (SEARCH-01..05 · D-30/D-31/D-32/D-37). Renders the results header + a compact
// sort Select, a 1/2/3-col card grid, a neutral "Load more" pager, a skeleton loading state, and BOTH
// empty states (zero-result escape hatches + cold-start). This is the ONE client boundary on the search
// home: all filter/sort/pagination state lives in the URL (shareable/SEO, Back works, D-32) — this
// component only pushes new URLs; the RSC re-reads them, re-validates via searchParamsSchema, and re-runs
// the two-stage search. The current URL params are passed in as `queryString` (not read via
// useSearchParams) so no Suspense boundary is required and the wiring stays deterministic.
//
// Coral appears nowhere here — the sort control, Load more, and every escape-hatch button are neutral
// (UI-SPEC § Color: the single coral focal point is the Search button in the SearchBar).

import * as React from "react";
import { useRouter } from "next/navigation";
import { SearchXIcon, SparklesIcon } from "lucide-react";

import { SearchResultCard, type SearchedWindow } from "@/components/search/search-result-card";
import type { SearchResultRow } from "@/lib/search/query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RADIUS_PRESETS = [2, 5, 10, 25] as const;
const MAX_RADIUS = RADIUS_PRESETS[RADIUS_PRESETS.length - 1];
const SORT_HINT_ID = "search-sort-hint";

type SearchResultsProps = {
  results: SearchResultRow[];
  hasMore: boolean;
  /** Whether the search had a location origin — drives the distance line + the "Nearest" sort option. */
  hasOrigin: boolean;
  /** Whether ANY filter/query was applied (distinguishes zero-result from the cold-start liquidity floor). */
  hasQuery: boolean;
  sort: "nearest" | "price";
  page: number;
  currentRadius: number;
  heading: string;
  city: string;
  /** The serialized current URL params — the base the client mutates for sort / Load more / escape hatches. */
  queryString: string;
  searchedWindow?: SearchedWindow;
  /** Broadened-fallback listings rendered under a "You might also like" divider in the zero-result state. */
  nearbyAlternatives?: SearchResultRow[];
  fetchError?: boolean;
};

function ResultsGrid({
  rows,
  searchedWindow,
}: {
  rows: SearchResultRow[];
  searchedWindow?: SearchedWindow;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {rows.map((row) => (
        <SearchResultCard key={row.id} listing={row} searchedWindow={searchedWindow} />
      ))}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
      aria-live="polite"
      aria-busy="true"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function SearchResults({
  results,
  hasMore,
  hasOrigin,
  hasQuery,
  sort,
  page,
  currentRadius,
  heading,
  city,
  queryString,
  searchedWindow,
  nearbyAlternatives = [],
  fetchError = false,
}: SearchResultsProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  /** Mutate the current params and navigate (soft push) so the RSC re-runs the search. */
  const pushWith = React.useCallback(
    (mutate: (p: URLSearchParams) => void, opts?: { resetPage?: boolean }) => {
      const p = new URLSearchParams(queryString);
      mutate(p);
      if (opts?.resetPage) p.delete("page");
      const qs = p.toString();
      startTransition(() => router.push(qs ? `/?${qs}` : "/"));
    },
    [queryString, router],
  );

  const onSortChange = (value: string) => pushWith((p) => p.set("sort", value), { resetPage: true });
  const onLoadMore = () => pushWith((p) => p.set("page", String(page + 1)));

  const atMaxRadius = currentRadius >= MAX_RADIUS;
  const onBroadenRadius = () =>
    pushWith((p) => {
      const next = RADIUS_PRESETS.find((r) => r > currentRadius) ?? MAX_RADIUS;
      p.set("radius", String(next));
    }, { resetPage: true });
  const onClearFilters = () => startTransition(() => router.push("/"));
  const onShowNearby = () =>
    pushWith((p) => {
      p.set("radius", String(MAX_RADIUS));
      for (const k of ["category", "priceMax", "date", "start", "end"]) p.delete(k);
    }, { resetPage: true });

  const hasResults = results.length > 0;

  return (
    <section className="space-y-6" aria-busy={isPending}>
      {/* Header: heading + (when populated) the sort Select. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{heading}</h2>
        {hasResults && (
          <div className="flex flex-col items-end gap-1">
            <Select value={sort} onValueChange={onSortChange}>
              <SelectTrigger className="h-9 min-w-[190px]" aria-label="Sort results" aria-describedby={!hasOrigin ? SORT_HINT_ID : undefined}>
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nearest" disabled={!hasOrigin}>
                  Nearest first
                </SelectItem>
                <SelectItem value="price">Price: low to high</SelectItem>
              </SelectContent>
            </Select>
            {!hasOrigin && (
              <p id={SORT_HINT_ID} className="text-xs text-muted-foreground">
                Enter a location to sort by distance
              </p>
            )}
          </div>
        )}
      </div>

      {/* Body: error → skeleton (searching) → results → zero-result → cold-start. */}
      {fetchError ? (
        <div className="rounded-xl border border-dashed p-8 text-center" role="alert">
          <p className="font-semibold">Something went wrong loading spaces</p>
          <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
            We couldn&apos;t load spaces just now. Try again.
          </p>
          <Button
            variant="secondary"
            className="mt-4 min-h-11"
            onClick={() => startTransition(() => router.refresh())}
          >
            Try again
          </Button>
        </div>
      ) : isPending && !hasResults ? (
        <ResultsSkeleton />
      ) : hasResults ? (
        <div className={isPending ? "opacity-60 transition-opacity" : undefined}>
          <ResultsGrid rows={results} searchedWindow={searchedWindow} />
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="secondary"
                className="min-h-11 px-8"
                onClick={onLoadMore}
                disabled={isPending}
              >
                {isPending ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </div>
      ) : hasQuery ? (
        // Zero-result after filtering (D-31) — escape hatches + optional "You might also like" cards.
        <div className="space-y-8">
          <div className="rounded-xl border border-dashed p-8 text-center">
            <SearchXIcon className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 font-semibold">No spaces match those filters</p>
            <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
              Try widening your search.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="secondary"
                className="min-h-11"
                onClick={onBroadenRadius}
                disabled={!hasOrigin || atMaxRadius}
                title={!hasOrigin ? "Set a location to broaden the radius" : undefined}
              >
                Broaden radius
              </Button>
              <Button variant="secondary" className="min-h-11" onClick={onClearFilters}>
                Clear filters
              </Button>
              <Button variant="secondary" className="min-h-11" onClick={onShowNearby}>
                Show nearby spaces
              </Button>
            </div>
          </div>

          {nearbyAlternatives.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <p className="text-sm font-semibold text-muted-foreground">You might also like</p>
                <Separator className="flex-1" />
              </div>
              <ResultsGrid rows={nearbyAlternatives} />
            </div>
          )}
        </div>
      ) : (
        // Cold start (D-30 liquidity floor) — no filter blame, no escape hatches.
        <div className="rounded-xl border border-dashed p-8 text-center">
          <SparklesIcon className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 font-semibold">No spaces are bookable here yet</p>
          <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
            We&apos;re just getting started in {city}. Check back soon — new spaces are being added.
          </p>
        </div>
      )}
    </section>
  );
}
