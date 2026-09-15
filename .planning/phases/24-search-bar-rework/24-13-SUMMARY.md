---
phase: 24-search-bar-rework
plan: 13
subsystem: testing
tags: [playwright, chromium, search, postgis, responsive-ui]
requires:
  - phase: 24-11
    provides: responsive desktop Popover and mobile Dialog progressive-search host
  - phase: 24-12
    provides: server-owned fixed 25 km public-search contract
provides:
  - Chromium geometry evidence for desktop pill anchoring without document reflow
  - Chromium mobile full-viewport sheet and single-question-flow evidence
  - Browser proof of fixed 25 km, cross-municipality nearest-first public search
affects: [progressive-search, public-search, D-09, D-10, D-11]
tech-stack:
  added: []
  patterns: [viewport bounding-box assertions, deterministic Photon interception, seeded PostGIS browser journeys]
key-files:
  created: []
  modified:
    - e2e/progressive-search.spec.ts
key-decisions:
  - "Measure the live Radix overlay and results region in Chromium instead of inferring geometry from source or snapshots."
  - "Keep the fixed-reach test on the normal activity → address → For me path, with no radius URL key or route shortcut."
  - "Attribute the fixed-reach scenario to 24-14's browser commit because its direct-edit repair was required for the full suite to complete."
requirements-completed: [D-09, D-10, D-11]
actuals:
  tokens: 2500
  tasks: 2
  commits: 2
duration: continued across plans 24-13 and 24-14
completed: 2026-09-15
status: complete
coverage:
  - id: D-09-geometry
    description: "Desktop progressive search remains pill-adjacent without moving the results region; the 375 px presentation fills the viewport with one active question flow."
    requirement: D-09
    verification:
      - kind: e2e
        ref: "e2e/progressive-search.spec.ts#overlay and sheet geometry anchor the progressive flow without route reflow"
        status: pass
    human_judgment: true
    rationale: "Automated bounding boxes prove placement and coverage; the planned visual assessment of attachment, clipping, and motion remains a human judgment."
  - id: D-10-fixed-reach
    description: "A Mandaluyong address-selected browser journey includes a nearer Makati listing inside 25 km and excludes a matching listing beyond the server reach."
    requirement: D-10
    verification:
      - kind: e2e
        ref: "e2e/progressive-search.spec.ts#fixed 25 km cross-municipality reach keeps nearby Makati results nearest-first"
        status: pass
    human_judgment: false
  - id: D-11-server-authority
    description: "The submitted browser URL serializes the selected coordinates and no mutable radius key."
    requirement: D-11
    verification:
      - kind: e2e
        ref: "e2e/progressive-search.spec.ts#fixed 25 km cross-municipality reach keeps nearby Makati results nearest-first"
        status: pass
    human_judgment: false
---

# Phase 24 Plan 13: Chromium Overlay and Fixed-Reach Search Summary

**Chromium now measures the progressive search overlay at both target viewports and proves that a selected Mandaluyong coordinate uses the server-owned 25 km reach across city labels.**

## Performance

- **Tasks:** 2/2
- **Files modified:** 1
- **Completion:** Reconciled after Plan 24-14 repaired the direct-edit popover regression that blocked the full suite.

## Accomplishments

- Added a desktop bounding-box assertion that keeps the results-region Y coordinate fixed while the active question is adjacent to the search pill, plus a 375 px full-viewport sheet assertion with exactly one active question heading.
- Kept the normal activity, address, party, Back, and Cancel interactions in the geometry journey for both presentations.
- Added the seeded Mandaluyong/Makati/outside-reach browser journey, asserting selected coordinates, no radius query key, rendered inclusion/exclusion, and nearest-first card order.

## Task Commits

1. **Task 1: Measure the desktop anchored overlay and mobile full-screen sheet in Chromium** — `bfad1e2` (`test`)
2. **Task 2: Drive a cross-municipality fixed-reach search through the public browser route** — `4a30e41` (`test`, preserved and committed by Plan 24-14 alongside its required direct-edit regression repair)

## Verification

- PASS — `node node_modules/@playwright/test/cli.js test e2e/progressive-search.spec.ts --project=chromium --workers=1 --grep "overlay and sheet geometry"`.
- PASS — `node node_modules/@playwright/test/cli.js test e2e/progressive-search.spec.ts --project=chromium --workers=1 --grep "fixed 25 km cross-municipality reach"`.
- PASS — `node node_modules/eslint/bin/eslint.js e2e/progressive-search.spec.ts`.
- PASS — the final Plan 24-14 handoff ran all 11 Chromium cases in `e2e/progressive-search.spec.ts` with the fixed-reach scenario included.

## Decisions Made

- Browser geometry checks use the existing `progressive-search-desktop-overlay`, `progressive-search-mobile-sheet`, and results-region test IDs; production selectors and snapshot baselines were not changed.
- The cross-municipality fixture writes only temporary rows through each existing `seedBookableListing` connection, then tears them down through the same helper.
- Plan 24-14 owned the production correction for the direct-edit popover whose existing desktop Cancel assertion was off-screen; its Task 2 commit therefore carries Plan 24-13's pending E2E scenario unchanged.

## Deviations from Plan

### Handoff Required for Full-Suite Completion

**1. [Rule 3 - Blocking] Deferred the full-suite regression repair to Plan 24-14.**
- **Found during:** Task 2 full Chromium verification.
- **Issue:** The pre-existing desktop direct-edit `Cancel` control was outside the viewport, causing the unchanged full-suite assertion to time out.
- **Resolution:** Plan 24-14 implemented and verified the narrowly scoped direct-edit Popover anchor and collision-bound repair; it preserved this plan's fixed-reach test in `4a30e41`.
- **Impact:** No source, configuration, fixture helper, or snapshot change was made by Plan 24-13 beyond its owned E2E spec additions.

## Issues Encountered

- On Windows, interrupted Playwright runs left verified configured-server child processes on port 3000. They were stopped only after their owning run was identified; the final handoff run completed all 11 cases.

## Known Stubs

None.

## Next Phase Readiness

The automated geometry and geographic seams are proven. The remaining planned human check is a bounded visual review at 1280 px and 375 px for overlay attachment, clipping, and calm reduced-motion presentation.

## Self-Check: PASSED

- FOUND: `e2e/progressive-search.spec.ts`
- FOUND commits: `bfad1e2`, `4a30e41`

*Phase: 24-search-bar-rework*
*Completed: 2026-09-15*
