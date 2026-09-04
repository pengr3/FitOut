// STATE-01 — the loading state for `/`, the demand-side front door.
//
// ── THE CONVENTION EVERY `loading.tsx` IN THIS PHASE FOLLOWS (see `(app)/bookings/loading.tsx`) ────
//   1. The page's own outer container element and classes, verbatim.
//   2. The page's STATIC heading block, verbatim — h1 + lede when both are fixed strings, the h1
//      alone when the lede is data-derived, and NOTHING when the h1 itself is data-derived. A
//      loading state that invents a title gets either the words or the type scale wrong, and both
//      are the layout shift the skeleton exists to prevent.
//   3. Exactly one of the three declared skeleton shapes, in the page's own data-region wrapper.
//
// ── WHY `/` HAS TWO LOADING STATES AND THIS IS ONLY ONE OF THEM ───────────────────────────────────
// `search-results.tsx` wraps `router.push` in `startTransition`, so every filter/sort/pager change
// keeps the current UI mounted and flags `isPending` — React never falls back to this file. THIS one
// covers first load and hard navigation only. Both render `CardGridSkeleton`, and they must: two
// components would make the same page shimmer two different ways depending on how the visitor
// arrived. Deleting either half is a regression; the other one does not cover its case.
//
// ── THE SEARCH BAR IS THE REAL COMPONENT, AND THAT IS THE WHOLE REASON THIS FILE IS WORTH HAVING ──
// `SearchBar` is ~180px of form between the title and the results. A fallback that skips it puts the
// placeholder grid where the search bar will be and then shoves it down the moment the page lands —
// a loading state that CAUSES the shift it exists to prevent (11-12 measured that failure at 132px
// on the notification bell). It takes `defaults` and `sort` as optional props and its box does not
// depend on either: every control renders unconditionally, and the two conditional fragments live
// inside popovers or behind client state that starts false in both cases. So the real component is
// exact where a placeholder would be a guess, and it is genuinely usable while the results load.
//
// RESIDUAL, MEASURED AND RECORDED: `SearchResults` renders an `h2` + sort row above the grid ONLY
// when it has results, so the grid here sits ~44px higher than a populated page. It is not faked,
// because the alternative — a bar standing in for a heading whose text is a count — asserts a shape
// on a page that may be about to render an `EmptyState` instead.

import { SearchBar } from "@/components/search/search-bar";
import { CardGridSkeleton } from "@/components/patterns/card-grid-skeleton";

export default function PublicLoading() {
  return (
    // Container, `space-y-8`, header and both sentences are `(public)/page.tsx`'s own, verbatim.
    // The title is Display scale here rather than `PageHeader`'s `text-xl`; composing the pattern
    // would shrink the largest text on the page for the duration of the fallback.
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-display">
            Find a space to play
          </h1>
          <p className="text-muted-foreground">
            Search fitness and recreational spaces you can book by the hour or the day.
          </p>
        </header>

        <SearchBar />

        <CardGridSkeleton label="Loading spaces" />
      </div>
    </main>
  );
}
