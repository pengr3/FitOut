---
phase: 24-search-bar-rework
plan: 16
subsystem: progressive-search
tags: [dialog, responsive-ui, playwright, vitest, chromium]
requires:
  - phase: 24-11
    provides: one reducer-owned responsive Dialog/Popover search host
  - phase: 24-13
    provides: strict live Chromium viewport geometry assertions
  - phase: 24-15
    provides: reducer-owned browser-location invalidation boundaries
provides:
  - Mobile progressive-search Dialog entry and exit motion that remains at unit scale
  - Consecutive-frame Chromium proof of the 375 px full-viewport sheet geometry
affects: [progressive-search, D-09, mobile-search, browser-regression]
tech-stack:
  added: []
  patterns: [search-local Dialog class composition, consecutive animation-frame bounding-box assertions]
key-files:
  created: []
  modified:
    - src/components/search/progressive-search-overlay.tsx
    - tests/search/progressive-search.test.tsx
    - e2e/progressive-search.spec.ts
decisions:
  - "Override the shared Dialog zoom only in the progressive-search mobile consumer, retaining the shared primitive and desktop Popover unchanged."
  - "Measure the rendered mobile sheet both immediately and after one animation frame rather than widening viewport tolerances."
metrics:
  duration: ~12 min
  completed: 2026-09-15
status: complete
plan_head_before: 677b8be04ef4c1115f4b82d89ea137c161e9c8b5
commits: 3
actuals:
  tokens: 12738
  tasks: 2
  commits: 3
---

# Phase 24 Plan 16: Mobile Dialog Geometry Closure Summary

The progressive-search mobile Dialog now uses unit-scale open and close motion, so its fixed dynamic-viewport sheet stays flush to the viewport from the first measured frame through the next animation frame.

## Accomplishments

- Added a search-local `max-sm` override for the shared Dialog's opening and closing scale states without modifying the shared primitive, reducer, desktop Popover, or route layout.
- Extended focused component coverage to require the full-viewport, centring-neutralization, and unit-scale class composition while preserving one heading and one named progress status owner.
- Strengthened the existing Chromium geometry journey to apply the unchanged one-pixel viewport bounds before and after one `requestAnimationFrame`, while retaining its desktop anchoring, Back, Cancel, and cold-browse recovery checks.

## Task Commits

1. **Task 1: Make the mobile Dialog a full-viewport sheet on its opening frame**
   - `723c9c6` — RED regression for the local unit-scale mobile Dialog composition.
   - `eba253d` — GREEN search-local mobile Dialog unit-scale override.
2. **Task 2: Prove viewport geometry on consecutive mobile browser frames and re-run the suite**
   - `54fb905` — Chromium browser proof on consecutive rendered mobile frames.

## Verification

- PASS — `node node_modules/vitest/vitest.mjs run tests/search/progressive-search.test.tsx` (22 tests).
- PASS — `node node_modules/eslint/bin/eslint.js src/components/search/progressive-search-overlay.tsx tests/search/progressive-search.test.tsx e2e/progressive-search.spec.ts`.
- PASS — named Chromium geometry journey at 375 px.
- PASS — complete Chromium `e2e/progressive-search.spec.ts` file (11 cases).
- PASS — `node node_modules/vitest/vitest.mjs run --reporter=dot --silent`.

## Decisions Made

- The fixed full-screen mobile sheet remains a local consumer of `DialogContent`; shared Dialog geometry and motion stay unchanged for every other caller.
- Consecutive rendered-frame geometry is asserted against the original one-pixel limits, not a relaxed threshold or source-class substitute.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Cleared a transient Playwright-owned Node worker tree from port 3000.**
- **Found during:** Task 2 complete Chromium run.
- **Issue:** The successful named Playwright run left its own temporary Next worker tree long enough for the next run to fail the configured exclusive port-3000 bind.
- **Fix:** Stopped only the five Node processes created by that focused run, verified port 3000 was free, and re-ran the complete Chromium file successfully.
- **Files modified:** None.

The unrelated uncommitted Plan 24-15 stale-callback test hunk in `tests/search/progressive-search.test.tsx` was intentionally left unstaged and uncommitted.

## Self-Check: PASSED

- Confirmed all three plan commits exist in Git history.
- Confirmed the three plan-owned source/test artifacts exist and contain the committed changes.
