---
phase: 24-search-bar-rework
plan: 11
subsystem: ui
tags: [react, nextjs, radix-ui, popover, dialog, accessibility, vitest]
requires:
  - phase: 24-10
    provides: reducer-owned progressive search answers, canonical URL coordination, and result edit chips
provides:
  - One responsive portalled question host for the progressive search journey
  - Desktop pill-anchored popover and mobile full-screen dialog presentation
  - Regression coverage for correction, dismissal, focus, status, and motion contracts
affects: [24-12, 24-13, progressive search, public search UI]
tech-stack:
  added: []
  patterns: [controlled Radix Popover/Dialog breakpoint host, reducer-owned question content]
key-files:
  created:
    - src/components/search/progressive-search-overlay.tsx
  modified:
    - src/components/search/search-experience.tsx
    - tests/search/progressive-search.test.tsx
key-decisions:
  - "Select exactly one existing Radix portal host at runtime so breakpoints never duplicate question trees or status owners."
  - "Keep the desktop pill mounted as the Popover trigger throughout the active journey so anchoring and focus restoration survive step changes."
  - "Route Popover/Dialog close events through the existing Cancel reducer boundary and constant cold-browse navigation."
requirements-completed: [D-09]
plan_head_before: 582597d
commits: 3
actuals:
  tokens: 3836
  tasks: 2
  commits: 3
duration: 19min
completed: 2026-09-15
status: complete
coverage:
  - id: D1
    description: "The desktop search pill opens one portalled, anchored current-question host without a normal-flow question branch."
    requirement: D-09
    verification:
      - kind: unit
        ref: "tests/search/progressive-search.test.tsx#opens the idle pill in one desktop portal anchored to its trigger"
        status: pass
    human_judgment: false
  - id: D2
    description: "At 375px-equivalent media conditions, the same reducer-owned question tree opens in one full-screen modal sheet."
    requirement: D-09
    verification:
      - kind: unit
        ref: "tests/search/progressive-search.test.tsx#opens the same active question in one full-screen mobile sheet"
        status: pass
    human_judgment: false
  - id: D3
    description: "Correction, cancellation, focus, live-region, and reduced-motion contracts remain intact in the responsive host."
    requirement: D-09
    verification:
      - kind: unit
        ref: "node node_modules/vitest/vitest.mjs run tests/search/progressive-search.test.tsx"
        status: pass
      - kind: other
        ref: "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts tests/design/live-regions.test.tsx tests/design/motion-budget.test.ts"
        status: pass
    human_judgment: false
---

# Phase 24 Plan 11: Responsive Progressive Search Overlay Summary

**A reducer-owned search journey now opens above page content as a pill-anchored desktop popover or a full-screen mobile dialog, without duplicating its active question tree.**

## Performance

- **Duration:** 19 min
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments

- Added a search-specific, controlled overlay host using only installed Radix wrappers.
- Moved the question panel and Back/Cancel controls out of document flow while retaining the existing reducer, URL serialization, result chips, and child results owner.
- Added viewport, single-tree/status, retained Back, cancellation, Escape, and focus-return regression coverage.

## Task Commits

1. **Task 1: Portal one active progressive question from the pill without reflowing the route**
   - `db8ba37` — RED: desktop and mobile portal-host assertions
   - `5974bd2` — GREEN: responsive Popover/Dialog host and coordinator migration
2. **Task 2: Preserve correction, dismissal, and focus behavior inside the responsive question host**
   - `82a2653` — regression coverage for Back, Escape, direct-edit cancellation, and focus return

## Files Created/Modified

- `src/components/search/progressive-search-overlay.tsx` — one controlled desktop Popover/mobile Dialog host with one mounted question slot.
- `src/components/search/search-experience.tsx` — supplies reducer-owned current step to the host and retains trigger/focus behavior for pill and result-chip entry points.
- `tests/search/progressive-search.test.tsx` — focused desktop/mobile structural and recovery regressions.

## Verification

- PASS — `node node_modules/vitest/vitest.mjs run tests/search/progressive-search.test.tsx` (19 tests)
- PASS — `node node_modules/eslint/bin/eslint.js src/components/search/progressive-search-overlay.tsx src/components/search/search-experience.tsx tests/search/progressive-search.test.tsx`
- PASS — `node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts tests/design/live-regions.test.tsx tests/design/motion-budget.test.ts` (49 tests)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed render-time ref access from focus restoration.**
- **Found during:** Task 1
- **Issue:** ESLint correctly rejected reading a mutable ref while rendering the overlay host.
- **Fix:** Stored the direct-edit focus origin in state and let Radix restore focus only when that origin remains connected.
- **Files modified:** `src/components/search/search-experience.tsx`, `src/components/search/progressive-search-overlay.tsx`
- **Verification:** Focused ESLint and progressive-search tests pass.
- **Committed in:** `5974bd2`

**2. [Rule 1 - Bug] Made responsive-host detection safe in test environments without `matchMedia`.**
- **Found during:** Task 1
- **Issue:** Tests that did not set a viewport stub crashed when their environment lacked `window.matchMedia`.
- **Fix:** Kept the desktop default and subscribe only when the browser API exists.
- **Files modified:** `src/components/search/progressive-search-overlay.tsx`
- **Verification:** Focused progressive-search suite passes all 19 tests.
- **Committed in:** `5974bd2`

**Total deviations:** 2 auto-fixed Rule 1 bugs. No scope expansion.

## TDD Note

Task 1 completed an intentional RED → GREEN sequence. Task 2's newly added correction and dismissal assertions were unexpectedly green because the Task 1 tracer already supplied the required behavior; no redundant implementation change was made.

## Known Stubs

None.

## Next Phase Readiness

Plan 24-13 can perform its planned browser geometry proof against stable `progressive-search-desktop-overlay` and `progressive-search-mobile-sheet` test identifiers.

## Self-Check: PASSED

- FOUND: `src/components/search/progressive-search-overlay.tsx`
- FOUND: `src/components/search/search-experience.tsx`
- FOUND: `tests/search/progressive-search.test.tsx`
- FOUND commits: `db8ba37`, `5974bd2`, `82a2653`

*Phase: 24-search-bar-rework*
*Completed: 2026-09-15*
