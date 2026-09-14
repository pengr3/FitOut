---
phase: 24-search-bar-rework
reviewed: 2026-09-14T23:51:58Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - src/app/(public)/page.tsx
  - src/app/(public)/loading.tsx
  - src/components/search/search-experience.tsx
  - src/components/search/activity-step.tsx
  - src/components/search/location-step.tsx
  - src/components/search/party-step.tsx
  - src/components/search/search-results.tsx
  - src/components/listing/address-autocomplete.tsx
  - src/lib/validation/booking.ts
  - src/lib/search/query.ts
  - src/lib/design/visual-baselines.ts
  - src/lib/design/live-regions.ts
  - src/lib/design/selector-contract.ts
  - src/app/dev/theme/page.tsx
  - e2e/progressive-search.spec.ts
  - e2e/helpers/booker-seed.ts
  - e2e/search-and-book.spec.ts
  - e2e/one-tree.spec.ts
  - e2e/price-parity.spec.ts
  - e2e/axe-sweep.spec.ts
  - e2e/helpers/visual-drive.ts
  - e2e/visual/surfaces.spec.ts
  - tests/search/progressive-search.test.tsx
  - tests/search/party-size-filter.test.ts
  - tests/search/search-results-states.test.tsx
  - tests/validation/booking-schemas.test.ts
  - tests/design/brand-recipe.test.ts
  - tests/design/elevation-z.test.ts
  - tests/design/live-regions.test.tsx
findings:
  critical: 1
  warning: 0
  info: 0
  total: 1
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-09-14T23:51:58Z
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

The progressive search implementation, its canonical server query boundary, and its migrated browser/design coverage were reviewed. One state-synchronization defect remains: browser history navigation from a submitted search back to the cold browse URL leaves the preserved client coordinator showing the prior search's answer chips.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Browser Back retains stale completed-search answers

**Classification:** BLOCKER

**File:** `src/components/search/search-experience.tsx:113-129`

**Issue:** The prop synchronization effect returns immediately when `hasCompletedSearch` becomes `false`. App Router navigation on the same `/` route preserves this client component (the preceding comment explicitly relies on that behavior). Therefore, after submitting a search and pressing the browser Back button to reach `/`, `state.resultsVisible` and `state.answers` still hold the completed search. The cold-browse server child is rendered underneath stale Activity, Location, and Party chips. Those chips then reopen and can submit a query the current URL did not contain. The existing test covers only `false -> true` rehydration, not this `true -> false` history transition.

**Fix:** Synchronize both directions of the canonical tuple. When `hasCompletedSearch` is false, replace the retained state with an idle, non-result state (and clear answers); retain a no-op equality guard so the initial render and ordinary local interactions are not reset. Add a rerender test from a completed tuple to `{ initialAnswers: {}, hasCompletedSearch: false }` that asserts the chips are absent and the idle trigger returns.

```tsx
useEffect(() => {
  setState((current) => {
    const next = initialState(
      hasCompletedSearch ? initialAnswers : {},
      hasCompletedSearch,
    );
    const unchanged =
      current.screen === next.screen &&
      current.resultsVisible === next.resultsVisible &&
      current.answers.category === next.answers.category &&
      current.answers.locationLabel === next.answers.locationLabel &&
      current.answers.lat === next.answers.lat &&
      current.answers.lng === next.answers.lng &&
      current.answers.partySize === next.answers.partySize;
    return unchanged ? current : next;
  });
}, [hasCompletedSearch, initialAnswers.category, initialAnswers.lat, initialAnswers.lng, initialAnswers.locationLabel, initialAnswers.partySize]);
```

---

_Reviewed: 2026-09-14T23:51:58Z_
_Reviewer: Codex (gsd-code-reviewer)_
_Depth: standard_
