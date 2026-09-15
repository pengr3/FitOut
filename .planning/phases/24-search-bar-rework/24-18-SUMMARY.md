---
phase: 24-search-bar-rework
plan: 18
subsystem: ui
tags: [react, nextjs, tailwind, playwright, chromium, responsive-ui]
requires:
  - phase: 24-search-bar-rework
    provides: "The reducer-owned progressive search flow, responsive Popover/Dialog host, and geometry scenario."
provides:
  - "A centered 48rem desktop idle search pill without changing the shared Button recipe."
  - "Chromium geometry coverage for the initial and post-Cancel idle-pill midpoint."
affects: [public-search, progressive-search, responsive-ui]
tech-stack:
  added: []
  patterns:
    - "Use a local responsive display override when a caller needs auto margins to center a shared inline-flex primitive."
    - "Measure viewport-relative layout recovery in the existing semantic browser journey."
key-files:
  created: []
  modified:
    - src/components/search/search-experience.tsx
    - e2e/progressive-search.spec.ts
key-decisions:
  - "Keep the shared Button inline-flex recipe unchanged and apply sm:flex only to the affected idle trigger."
  - "Prove centering from live Chromium bounding boxes before opening and after cancelling the desktop journey."
requirements-completed: [D-01]
actuals:
  tokens: 804
  tasks: 2
  commits: 3
plan_head_before: f7e466246e90935d7a0f64615f967f98ed59e953
coverage:
  - id: D1
    description: "The 1280px idle search pill remains centered within one CSS pixel on initial load and after Cancel returns the route to cold browse."
    requirement: D-01
    verification:
      - kind: e2e
        ref: "e2e/progressive-search.spec.ts#overlay and sheet geometry anchor the progressive flow without route reflow"
        status: pass
      - kind: other
        ref: "node node_modules/eslint/bin/eslint.js src/components/search/search-experience.tsx e2e/progressive-search.spec.ts"
        status: pass
    human_judgment: false
duration: 1h
completed: 2026-09-15
status: complete
---

# Phase 24 Plan 18: Desktop Search Pill Centering Summary

**A locally flex-level desktop idle trigger now centers its 48rem pill at 1280px, with Chromium proof before engagement and after Cancel recovery.**

## Performance

- **Duration:** 1h
- **Tasks:** 2
- **Files modified:** 2
- **Final verification:** one focused Chromium geometry scenario passed; scoped ESLint passed.

## Accomplishments

- Added `sm:flex` only to the idle `Start your search` trigger, allowing its existing desktop auto margins to center the pill while preserving the shared Button recipe and 375px full-width presentation.
- Extended the existing rendered geometry journey with a live initial viewport-midpoint assertion that went RED with a 176px error before the correction.
- Re-measured the restored idle trigger after the real Cancel-to-`/` route recovery while retaining the scenario's Popover-anchor, results no-reflow, and mobile-sheet checks.

## Task Commits

1. **Task 1: Center the idle desktop pill through its local display context**
   - `b5cf946` `test(24-18): cover desktop search pill centering`
   - `e8e6989` `feat(24-18): center desktop search pill`
2. **Task 2: Pin centering across Cancel-to-idle recovery**
   - `10a8269` `test(24-18): retain centered pill after cancel`

## Files Created/Modified

- `src/components/search/search-experience.tsx` — makes only the desktop idle trigger a flex-level item so its existing `sm:mx-auto sm:max-w-3xl` utilities center the pill.
- `e2e/progressive-search.spec.ts` — measures initial and recovered desktop trigger midpoints against the live viewport in Chromium.

## Decisions Made

- Retained the `SearchExperienceCoordinator` client boundary, reducer, navigation, Popover anchor, and mobile breakpoint behavior.
- Kept the proof in the existing real public-route geometry case using accessible role locators rather than source-level class checks or a duplicate journey.

## TDD Evidence

- **RED:** the new initial midpoint assertion failed in the named Chromium scenario with an expected tolerance of `<= 1` and an actual offset of `176` CSS pixels.
- **GREEN:** the local `sm:flex` utility made the focused Chromium scenario pass; no refactor was needed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Playwright correctly refused to adopt a process already listening on port 3000 because this repository requires `reuseExistingServer: false`. After the orchestrator freed the port, all focused runs used an owned fresh server. The runner left owned development-server children after completion, which were stopped before subsequent runs; no product configuration changed.

## User Setup Required

None - no external service configuration, dependency, migration, or environment change was introduced.

## Next Phase Readiness

G-24-2 has rendered Chromium coverage for both desktop idle states. The local correction leaves the existing public-search, Popover, reducer, and mobile-sheet contracts intact.

## Self-Check: PASSED

Both scoped artifacts exist, and all three task commits are present in Git history.
