---
phase: 24-search-bar-rework
reviewed: 2026-09-15T02:30:14Z
depth: standard
files_reviewed: 34
files_reviewed_list:
  - e2e/axe-sweep.spec.ts
  - e2e/helpers/booker-seed.ts
  - e2e/helpers/visual-drive.ts
  - e2e/one-tree.spec.ts
  - e2e/price-parity.spec.ts
  - e2e/progressive-search.spec.ts
  - e2e/search-and-book.spec.ts
  - e2e/visual/surfaces.spec.ts
  - e2e/zero-result-relax.spec.ts
  - src/app/(public)/loading.tsx
  - src/app/(public)/page.tsx
  - src/app/dev/theme/fixtures.ts
  - src/app/dev/theme/page.tsx
  - src/components/listing/address-autocomplete.tsx
  - src/components/search/activity-step.tsx
  - src/components/search/location-step.tsx
  - src/components/search/party-step.tsx
  - src/components/search/relax-band.tsx
  - src/components/search/search-bar.tsx
  - src/components/search/search-experience.tsx
  - src/components/search/search-results.tsx
  - src/lib/design/live-regions.ts
  - src/lib/design/selector-contract.ts
  - src/lib/design/visual-baselines.ts
  - src/lib/search/query.ts
  - src/lib/search/relaxation.ts
  - src/lib/validation/booking.ts
  - tests/design/brand-recipe.test.ts
  - tests/design/elevation-z.test.ts
  - tests/search/party-size-filter.test.ts
  - tests/search/progressive-search.test.tsx
  - tests/search/relaxation-ladder.test.ts
  - tests/search/search-results-states.test.tsx
  - tests/validation/booking-schemas.test.ts
findings:
  critical: 2
  warning: 1
  info: 0
  total: 3
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-09-15T02:30:14Z
**Depth:** standard
**Files Reviewed:** 34
**Status:** issues_found

## Summary

The progressive client/server handoff, schema boundary, parameterized capacity predicate, result states, retired paths, and dependent browser/design coverage were reviewed against the Phase 24 plans and commits after `d7db523f70f5019210631218d8bb0180f8f884de`. The earlier browser-Back stale-chip defect is fixed by the keyed coordinator. However, the public address path can still show and commit a stale geocoder result, and a legitimate long selected address traps the journey by sending the user back to activity selection. A manually shared completed URL without its optional display label also renders an unidentified location chip.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: A stale Photon response can be selected for the new query

**Classification:** BLOCKER

**File:** `src/components/listing/address-autocomplete.tsx:214-242, 248-253`

**Issue:** Cleanup only clears the prior debounce timer. Once request A has started, changing the text to query B does not abort or invalidate A until B's new 250 ms timer fires. If A resolves during that window, lines 227-231 replace `results` and line 238 clears `loading` while `query` already holds B. The combobox then displays A's addresses as matches for B; selecting one advances the new progressive search with the wrong coordinates. A late A response can also hide B's loading state and display the empty state prematurely. The new public journey relies on this component, but its stale-callback tests cover browser geolocation only, not address lookup.

**Fix:** Tie every lookup to an effect-local `AbortController` and request generation, abort it in cleanup, and update results/loading only while that generation remains current. Add a component or progressive-journey test that delays request A, changes to B after A starts, resolves A first, and proves no A option can be selected.

```tsx
useEffect(() => {
  const controller = new AbortController();
  let active = true;
  const timer = setTimeout(async () => {
    try {
      const response = await fetch(url, { signal: controller.signal });
      const data = await response.json();
      if (active) setResults(toSuggestions(data));
    } catch (error) {
      if (active && (error as DOMException).name !== "AbortError") setError(LOOKUP_ERROR);
    } finally {
      if (active) setLoading(false);
    }
  }, 250);
  return () => { active = false; clearTimeout(timer); controller.abort(); };
}, [query]);
```

### CR-02: Long valid address labels make party submission jump back to activity

**Classification:** BLOCKER

**File:** `src/components/search/search-experience.tsx:81-83, 146-156, 167-170`

**Issue:** `addressLabel` concatenates unbounded Photon address fields, but `locationLabel` is constrained to 120 characters by `searchParamsSchema`. A real street/city/region/country combination longer than 120 characters progresses normally to the party step, then `submitPartySize` fails its candidate parse. Instead of preserving the location correction, lines 154-155 dispatch `EDIT` for `activity`; the visitor is silently returned to the first question and cannot finish the selected address flow. This violates the planned bounded presentation-label contract and is not covered by the address fixture, whose label is short.

**Fix:** Bound the derived display label before storing it (without changing coordinates) and make a failed submission return to the invalid answer's step with an actionable status. Add a test using a `ResolvedAddress` whose rendered label exceeds 120 characters and assert that the canonical URL still submits with a bounded label.

```tsx
function addressLabel(address: ResolvedAddress) {
  const label = [address.addressLine1, address.city, address.region, address.country]
    .filter(Boolean)
    .join(", ")
    .trim();
  return label.slice(0, 120);
}
```

## Warnings

### WR-01: A valid shared result URL can render a blank location answer

**Classification:** WARNING

**File:** `src/app/(public)/page.tsx:49-50, 100-108`; `src/components/search/search-experience.tsx:242-244`

**Issue:** The server defines a completed search from category, coordinate pair, and party size, while `locationLabel` remains optional in the URL schema. Thus a valid shared URL such as `/?category=...&lat=...&lng=...&partySize=1` displays completed answer chips but the location button has no answer text (`Location: `). This is especially confusing for a link opened in a fresh session, because the result is location-filtered yet its editable answer does not identify the location.

**Fix:** Provide an explicit, neutral fallback label for completed URLs without `locationLabel` (for example, `Selected location`), or require a label whenever `hasCompletedSearch` is true and redirect/recover incomplete legacy links to the location step. Cover the label-omitted URL in the result-state suite.

---

_Reviewed: 2026-09-15T02:30:14Z_
_Reviewer: Codex (gsd-code-reviewer)_
_Depth: standard_
