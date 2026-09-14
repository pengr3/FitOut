---
phase: 24-search-bar-rework
plan: "06"
subsystem: testing
tags: [playwright, axe, progressive-search, booking, postgres]
requires:
  - phase: 24-05
    provides: Progressive search UI and deterministic seeded browser fixtures
provides:
  - Retained booking, one-tree, price-parity, and axe suites entered through the progressive search journey
  - Accessibility coverage for no-match, results, empty, cancel, and booking-continuation states
affects: [24-07 legacy search retirement, browser regression coverage]
tech-stack:
  added: []
  patterns: [Shared Playwright progressive-search entry helper, state-by-state axe scanning]
key-files:
  created: []
  modified:
    - e2e/helpers/booker-seed.ts
    - e2e/search-and-book.spec.ts
    - e2e/one-tree.spec.ts
    - e2e/price-parity.spec.ts
    - e2e/axe-sweep.spec.ts
    - src/components/search/activity-step.tsx
key-decisions:
  - "Dependent browser suites use one geolocation-backed production journey instead of legacy selectors or result URLs."
  - "The no-match catalogue state remains a disabled listbox option so cmdk's ARIA controls retain a valid target."
requirements-completed: [D-02, D-06, D-07, D-08]
plan_head_before: 63fb6bc
actuals:
  tokens: 5033
  tasks: 2
  commits: 2
metrics:
  duration: 48m
  completed: 2026-09-15
status: complete
---

# Phase 24 Plan 06: Dependent Browser Journey Migration Summary

**Booking, structural, parity, and accessibility browser coverage now use the production activity → location → party search journey before exercising their existing downstream contracts.**

## Accomplishments

- Added `submitProgressiveSearch`, a deterministic geolocation-backed entry helper, and made `openSeededListing` assert the seeded identity before selection.
- Migrated booking, one-tree, and price-parity entry paths away from legacy filter controls and permanent pre-seeded result URLs.
- Added focused axe coverage for validation, location, party, populated results, empty results, cancel-to-browse, and listing booking continuation at 320px and 1280px.
- Repaired the no-match command state so its listbox retains a valid disabled option, fixing the axe violation without changing the accessibility threshold or exclusions.

## Task Commits

1. **Task 1: Migrate booking and one-tree suites through the canonical seeded result** — `c9a539d` (`test`)
2. **Task 2: Migrate price-parity and accessibility sweeps without weakening their contracts** — `cc62b97` (`test`)

## Verification

- `node node_modules/@playwright/test/cli.js test e2e/search-and-book.spec.ts --project=chromium --workers=1 --grep "live instant hold" --reporter=list` — passed.
- `node node_modules/@playwright/test/cli.js test e2e/price-parity.spec.ts --project=chromium --workers=1 --reporter=list` — passed.
- `node node_modules/@playwright/test/cli.js test e2e/axe-sweep.spec.ts --project=chromium --workers=1 --grep "progressive search states.*320px" --reporter=list` — passed.
- `node node_modules/@playwright/test/cli.js test e2e/axe-sweep.spec.ts --project=chromium --workers=1 --grep "progressive search states.*1280px" --reporter=list` — passed.
- `node node_modules/eslint/bin/eslint.js src/components/search/activity-step.tsx e2e/helpers/booker-seed.ts e2e/search-and-book.spec.ts e2e/one-tree.spec.ts e2e/price-parity.spec.ts e2e/axe-sweep.spec.ts` — passed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Accessibility bug] Repaired the empty catalogue command listbox**
- **Found during:** Task 2
- **Issue:** Axe reported `aria-required-children` for the production no-match state, then exposed that removing the listbox broke the input's `aria-controls` target.
- **Fix:** Retained a disabled `CommandItem` containing the calm no-match copy, preserving the listbox's required option and its controlled target.
- **Files modified:** `src/components/search/activity-step.tsx`
- **Verification:** Focused 320px and 1280px progressive axe journeys passed.
- **Committed in:** `cc62b97`

**Total deviations:** 1 auto-fixed (Rule 1).

## Next Phase Readiness

Plan 24-07 can census and remove legacy relaxation-era search consumers; the retained dependent browser suites no longer rely on their old entry contract.

## Self-Check: PASSED

- All six migrated source and browser-test files exist in commits `c9a539d` and `cc62b97`.
- Both task commits are present in the repository history.

