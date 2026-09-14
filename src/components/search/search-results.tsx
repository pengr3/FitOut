"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SearchXIcon, SparklesIcon } from "lucide-react";

import { SearchResultCard } from "@/components/search/search-result-card";
import { CardGridSkeleton } from "@/components/patterns/card-grid-skeleton";
import { EmptyState } from "@/components/patterns/empty-state";
import { Button } from "@/components/ui/button";
import { RESULT_GRID_GAP } from "@/lib/design/measurements";
import type { SearchResultRow } from "@/lib/search/query";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORT_HINT_ID = "search-sort-hint";

type SearchResultsProps = {
  results: SearchResultRow[];
  hasMore: boolean;
  hasOrigin: boolean;
  hasQuery: boolean;
  sort: "nearest" | "price";
  page: number;
  heading: string;
  city: string;
  /** Trusted, server-serialized answers that sort and paging can extend but never broaden. */
  queryString: string;
  fetchError?: boolean;
};

function ResultsGrid({ rows }: { rows: SearchResultRow[] }) {
  return (
    <div className={cn(RESULT_GRID_GAP, "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
      {rows.map((row) => (
        <SearchResultCard key={row.id} listing={row} />
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
  heading,
  city,
  queryString,
  fetchError = false,
}: SearchResultsProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const pushWith = React.useCallback(
    (mutate: (params: URLSearchParams) => void, options?: { resetPage?: boolean }) => {
      const params = new URLSearchParams(queryString);
      mutate(params);
      if (options?.resetPage) params.delete("page");
      const nextQuery = params.toString();
      startTransition(() => router.push(nextQuery ? `/?${nextQuery}` : "/"));
    },
    [queryString, router],
  );

  const onSortChange = (value: string) => pushWith((params) => params.set("sort", value), { resetPage: true });
  const onLoadMore = () => pushWith((params) => params.set("page", String(page + 1)));
  const hasResults = results.length > 0;

  return (
    <section data-testid="search-results-region" className="space-y-6" aria-busy={isPending}>
      {hasResults && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{heading}</h2>
          <div className="flex flex-col items-end gap-1">
            <Select value={sort} onValueChange={onSortChange}>
              <SelectTrigger
                className="h-9 min-w-[190px]"
                aria-label="Sort results"
                aria-describedby={!hasOrigin ? SORT_HINT_ID : undefined}
              >
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nearest" disabled={!hasOrigin}>Nearest first</SelectItem>
                <SelectItem value="price">Price: low to high</SelectItem>
              </SelectContent>
            </Select>
            {!hasOrigin && <p id={SORT_HINT_ID} className="text-xs text-muted-foreground">Enter a location to sort by distance</p>}
          </div>
        </div>
      )}

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
        <CardGridSkeleton label="Loading spaces" />
      ) : hasResults ? (
        <div className={isPending ? "opacity-60 transition-opacity" : undefined}>
          <ResultsGrid rows={results} />
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button variant="secondary" className="min-h-11 px-8" onClick={onLoadMore} disabled={isPending}>
                {isPending ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </div>
      ) : hasQuery ? (
        <EmptyState
          icon={SearchXIcon}
          titleAs="h2"
          title="No spaces match those answers"
          body="Edit an answer above to try a different search."
          actions={null}
        />
      ) : (
        <EmptyState
          icon={SparklesIcon}
          titleAs="h2"
          title="No spaces are bookable here yet"
          body={`We're just getting started in ${city}. Check back soon — new spaces are being added.`}
          actions={null}
        />
      )}
    </section>
  );
}
