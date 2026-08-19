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
//
// ── STATE-03 (plan 12-12): WHAT THE RELAXATION BAND ADDED, AND WHAT IT REMOVED ────────────────────
// This file used to receive a prop carrying the result of ONE broadened query that dropped radius,
// category, priceMax, date, start and end together, and rendered it under an unlabelled divider
// beneath the empty state. Six constraints vanished and the page said which one gave: none. The prop,
// the divider and its caption string are DELETED, along with the escape-hatch handler that let a
// booker do the same all-at-once broadening by hand. The names are described rather than quoted here
// on purpose: plan 12-12's own acceptance grep for them must come back empty, and a comment that
// spells a deleted identifier is indistinguishable from code to a grep.
//
// What replaces them is `relaxation`: the RSC runs a server-side ladder that relaxes ONE constraint at
// a time and hands down the rung that gave plus its rows. This component renders the band above the
// grid and NOTHING ELSE — it performs no filtering, no re-ranking and no second query
// (T-12-12-CLIENTFILTER). `Undo` is one more `pushWith` that ADDS `relax=0` to the booker's original
// query; the suppression flag is what stops the RSC simply relaxing again (RESEARCH Pitfall 5).

import * as React from "react";
import { useRouter } from "next/navigation";
import { SearchXIcon, SparklesIcon } from "lucide-react";

// The preset ladder and its declared max come from the authority rather than a third copy (12-REVIEW
// WR-03). `MAX_RADIUS_KM` is the same `RADIUS_PRESETS[length - 1]` derivation this file used to write
// out for itself — imported, not re-derived, so the escape hatches below and the STATE-03 ladder in
// `lib/search/relaxation.ts` step through one list.
import { MAX_RADIUS_KM, RADIUS_PRESETS } from "@/lib/validation/booking";
import { SearchResultCard, type SearchedWindow } from "@/components/search/search-result-card";
import { RelaxBand, type RelaxBandProps } from "@/components/search/relax-band";
import type { SearchResultRow } from "@/lib/search/query";
import type { RelaxationRungId } from "@/lib/search/relaxation";
import { CardGridSkeleton } from "@/components/patterns/card-grid-skeleton";
import { EmptyState } from "@/components/patterns/empty-state";
import { Button } from "@/components/ui/button";
import { RESULT_GRID_GAP } from "@/lib/design/measurements";
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
  /**
   * STATE-03. Present ONLY when a rung of the server-side ladder actually returned rows — the band
   * names that one rung and the grid shows its rows. `null`/absent means either the ladder was not
   * entered (cold start, `relax=0`) or every applicable rung came back empty.
   */
  relaxation?: {
    readonly rung: RelaxationRungId;
    readonly results: SearchResultRow[];
    /** The BOOKER'S original values — the band's first line names what was asked for. */
    readonly asked: RelaxBandProps["asked"];
    /** The radius the ladder actually used, so the band's phrase and the control agree (AC#30). */
    readonly effectiveRadiusKm: number;
    /**
     * The EFFECTIVE window, not the booker's. A card found by dropping the date must not carry an
     * "Available 9–11 AM on Fri, Aug 21" line about a day it was not checked against.
     */
    readonly searchedWindow?: SearchedWindow;
  } | null;
  /**
   * True when the ladder RAN and every applicable rung came back empty — which is what entitles the
   * empty state to say "we widened the search and still came up empty". A zero-result page that never
   * ran the ladder (`relax=0` after an Undo) keeps the shipped body, because the stronger sentence
   * would be a claim about work nobody did.
   */
  relaxExhausted?: boolean;
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
    // THE GUTTER COMES FROM `RESULT_GRID_GAP` (D-57 / `[11-17]`). This grid and the skeleton that
    // stands in for it on the same route used to own a gutter each, ±4px apart in opposite
    // directions either side of `lg` — invisible to jsdom (D-131) and to review. One imported string
    // means they cannot disagree again. The `lg:` gutter step is gone with the drift: a third gutter
    // value at a third breakpoint is a number nobody can justify, and the grid already changes
    // COLUMN COUNT at `sm:` and `lg:`, which is the change a reader actually perceives.
    <div className={cn(RESULT_GRID_GAP, "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
      {rows.map((row) => (
        <SearchResultCard key={row.id} listing={row} searchedWindow={searchedWindow} />
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
  relaxation = null,
  relaxExhausted = false,
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

  const atMaxRadius = currentRadius >= MAX_RADIUS_KM;
  const onBroadenRadius = () =>
    pushWith((p) => {
      const next = RADIUS_PRESETS.find((r) => r > currentRadius) ?? MAX_RADIUS_KM;
      p.set("radius", String(next));
    }, { resetPage: true });
  const onClearFilters = () => startTransition(() => router.push("/"));
  // ⚠ THE ACTIVITY IS NO LONGER IN THIS LIST, AND THAT ONE OMISSION IS THE WHOLE EDIT (D-52).
  // The handler this replaces cleared `category` alongside the rest, so pressing "Show nearby spaces"
  // after searching for a badminton court answered with yoga studios — the same all-at-once broadening
  // the RSC's fallback did, reachable by hand. The hatch keeps its shipped label and its shipped
  // meaning ("forget my time and price, show me what's around"); what it may not forget is the thing
  // the booker came for.
  const onWidenToNearby = () =>
    pushWith((p) => {
      p.set("radius", String(MAX_RADIUS_KM));
      for (const k of ["priceMax", "date", "start", "end"]) p.delete(k);
    }, { resetPage: true });
  // STATE-03's Undo. An ADDITION of `relax=0` to the BOOKER'S query — `queryString` is that query, not
  // the relaxed one — never a removal. Without the flag the RSC re-runs the ladder on the restored
  // query, the band comes straight back, and Undo is a button that visibly does nothing
  // (T-12-12-UNDOLOOP; `e2e/zero-result-relax.spec.ts` case (c) is the watched red).
  const onUndoRelaxation = () => pushWith((p) => p.set("relax", "0"), { resetPage: true });

  const hasResults = results.length > 0;

  return (
    <section className="space-y-6" aria-busy={isPending}>
      {/* Header (heading + sort) shows only when populated — the empty states carry their own heading. */}
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
        </div>
      )}

      {/* Body: error → skeleton (searching) → results → zero-result → cold-start. */}

      {/* ⚠ NOT AN EMPTY STATE, AND DELIBERATELY NOT CONVERTED BY PLAN 11-16 (which had it listed as one
          of its eight conversion sites). This block is the shipped inline ERROR: `role="alert"`, "Something
          went wrong loading spaces", one "Try again". `patterns/error-state.tsx:37-39` names these exact
          lines as the shape STATE-02's `ErrorState` was extracted FROM, and rendering a failure through
          `EmptyState` would say "there is nothing here" about a search that never ran — the precise
          inversion of the T-11-FALSEALARM rule the same plan is enforcing on `/host/requests`.

          It is not converted to `ErrorState` here either. That was OPEN when 11-16 wrote it — the pattern
          REQUIRES a `routeOut` second action, and where a failed search sends you was a product decision
          belonging to the five boundaries plan 11-18 owns. **11-18 has now answered it, and the answer is
          that this block keeps one action permanently.** `ErrorState`'s two-action rule exists because a
          BOUNDARY replaces the whole screen, so without a way out the only recourse is the back button into
          the same error. This block is not that: the header, the filters, the footer and the search form
          above it are all still mounted, so the page IS the way out — and the only candidate destination is
          `/`, the page the user is already on, which would render a button that visibly does nothing.
          A dead action rendered to satisfy a required prop makes "two actions, always" mean less everywhere
          it is enforced. Carried as a declared, reasoned — and now PERMANENT — row in
          `NON_EMPTY_STATE_DASHED` (tests/design/empty-state-adoption.test.ts), with the full argument in
          the phase's deferred-items.md under [11-18]. */}
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
        // STATE-01 (plan 11-17) — THE SAME COMPONENT `src/app/(public)/loading.tsx` renders, and the
        // reason it has to be. `/` genuinely has two loading states: `pushWith` wraps `router.push` in
        // `startTransition`, so React keeps this UI mounted and flags `isPending` instead of falling
        // back to `loading.tsx`, which therefore only ever covers first load and hard navigation. Both
        // are correct; if they were two different components the same page would shimmer two different
        // ways depending on how the visitor arrived at it.
        //
        // What this replaces: a locally-declared grid of six cells, each an `aspect-[4/3]` box over two
        // `h-4` bars — the same four literals `(host)/host/listings/loading.tsx` carried, i.e. a THIRD
        // copy of a geometry that `measurements.ts` now owns. It also announced through
        // `aria-live="polite" aria-busy="true"` on a div with no role and no name, which announces the
        // busy state to nobody: `role="status"` is `nameFrom:author`, so the pattern's `aria-label` is
        // what makes it a named live region (measured in plan 11-07 with `dom-accessibility-api`).
        //
        // THE MEASURED RESIDUAL `[11-17]` RECORDED HERE IS CLOSED (plan 12-01 / D-57). This pattern
        // and `ResultsGrid` above each owned a gutter, ±4px apart in opposite directions either side
        // of `lg`; both now read `RESULT_GRID_GAP` from `measurements.ts` and cannot disagree again,
        // which is a stronger resolution than the spacing prop that was considered and rejected — a
        // pattern that takes its geometry from the call site has stopped deciding anything, which is
        // `invite-card.tsx`'s argument for owning its own rhythm. The residual was NOT closed by
        // review: jsdom cannot see a rendered gutter at all (D-131), so `e2e/skeleton-geometry.spec.ts`
        // measures both states' `boundingBox()`es on `/` itself and asserts they agree AND that they
        // agree at 16/24px.
        <CardGridSkeleton label="Loading spaces" />
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
      ) : relaxation ? (
        // STATE-03 — the ladder found rows by relaxing ONE constraint. The band names it, the grid
        // shows what it found, and `Undo` puts the booker's query back.
        //
        // NO HEADING AND NO SORT CONTROL HERE, and that is deliberate rather than an omission: the
        // header block above renders on `hasResults`, which is FALSE — the booker's own search returned
        // nothing, and a `{N} spaces near you` heading over a relaxed set would be a count of results
        // for a query that produced none. The band's first line is the heading this state has.
        <div className={isPending ? "opacity-60 transition-opacity" : undefined}>
          <div className="space-y-6">
            {/* Directly above the grid, below the filter controls; never inside the grid.
                `key={rung}` IS LOAD-BEARING, not a list-diffing habit: the band latches its copy in a
                read-once initializer so a re-render carrying the same outcome cannot re-announce, and
                the key is what lets a genuinely DIFFERENT rung remount and be announced. Without it a
                second relaxation would render silently under the first one's sentence. */}
            <RelaxBand
              key={relaxation.rung}
              rung={relaxation.rung}
              count={relaxation.results.length}
              asked={relaxation.asked}
              effectiveRadiusKm={relaxation.effectiveRadiusKm}
              onUndo={onUndoRelaxation}
            />
            <ResultsGrid rows={relaxation.results} searchedWindow={relaxation.searchedWindow} />
          </div>
        </div>
      ) : hasQuery ? (
        // Zero-result after filtering (D-31) — the escape hatches. The broadened row that used to sit
        // under them, behind an unlabelled divider, is DELETED (see the header): the relaxation branch
        // above is what shows alternatives now, and it says which single constraint bought them.
        <div className="space-y-8">
          {/* STATE-04 — the shared shell (plan 11-16). This block WAS the geometry that won: shell A's
              `rounded-xl … p-8 text-center` moved into the pattern verbatim, so nothing here changes
              shape. What DID change is the title element: it was a `<p className="font-semibold">`, a
              heading in appearance only, and `titleAs="h2"` makes it the real one. `h2` because the
              populated branch's own results heading above is an `h2` under the page `<h1>` — the empty
              state stands in the same slot in the outline.

              Copy: the title and all three escape-hatch labels are byte-identical shipped strings. The
              BODY forks on `relaxExhausted` — the Copywriting Contract's "every rung exhausted" row is
              a claim about work that was actually done, so it is only said when the ladder ran and
              every applicable rung came back empty. After an Undo (`relax=0`) nothing was widened, and
              the shipped sentence is the true one. */}
          <EmptyState
            icon={SearchXIcon}
            titleAs="h2"
            title="No spaces match those filters"
            body={
              relaxExhausted
                ? "We widened the search and still came up empty. Try a different day, or a different part of the city."
                : "Try widening your search."
            }
            actions={
              <>
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
                <Button variant="secondary" className="min-h-11" onClick={onWidenToNearby}>
                  Show nearby spaces
                </Button>
              </>
            }
          />
        </div>
      ) : (
        // Cold start (D-30 liquidity floor) — no filter blame, no escape hatches.
        //
        // `actions={null}` IS THE POINT OF THIS BLOCK, not an omission. D-30 says the cold-start state
        // must not blame a filter, and every escape hatch on the zero-result state above is a filter
        // control — offering "Broaden radius" to someone in a city with no supply is a button that
        // cannot work. The body names what happens next in words instead ("Check back soon"), which is
        // the copywriting contract's requirement; the contract asks for a next step, not for a control.
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
