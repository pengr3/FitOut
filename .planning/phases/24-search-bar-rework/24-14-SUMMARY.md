---
phase: 24-search-bar-rework
plan: 14
subsystem: search-ui
tags: [react, nextjs, radix-ui, popover, playwright, vitest, accessibility]
requires:
  - phase: 24-11
    provides: controlled desktop Popover/mobile Dialog search host
  - phase: 24-13
    provides: overlay geometry and fixed-reach Chromium coverage
provides:
  - Result-chip-anchored desktop direct edits using Radix virtual references
  - Collision-aware, viewport-bounded desktop question Popover content
  - Browser evidence that direct-edit Cancel remains visible and restores cold browse
affects: [progressive-search, public-search, D-02, D-08, D-09]
tech-stack:
  added: []
  patterns: [local Radix virtual anchor, controlled Popover direct-edit handoff, measured Chromium viewport assertions]
key-files:
  created: []
  modified:
    - src/components/search/progressive-search-overlay.tsx
    - src/components/search/search-experience.tsx
    - tests/search/progressive-search.test.tsx
    - e2e/progressive-search.spec.ts
key-decisions:
  - "Use the exact result-chip HTMLElement as the direct-edit Popover virtual reference; keep the idle pill as the normal Popover trigger."
  - "Constrain only the local desktop Popover with Radix's available-height CSS variable; leave shared primitives and the mobile Dialog unchanged."
requirements-completed: [D-02, D-08, D-09]
plan_head_before: fbc2fa7
commits: 3
actuals:
  tokens: 3276
  tasks: 2
  commits: 3
duration: 30 min
completed: 2026-09-15
status: complete
coverage:
  - id: D1
    description: "A result Activity chip supplies the desktop Popover's virtual anchor while one reducer-owned question host retains Back, Cancel, focus, and status ownership."
    requirement: D-08
    verification:
      - kind: unit
        ref: "tests/search/progressive-search.test.tsx#positions a direct Activity-chip edit in one reachable desktop question host"
        status: pass
    human_judgment: false
  - id: D2
    description: "The desktop direct-edit Popover remains chip-adjacent and its Cancel control is fully contained by the overlay and 1280 px viewport before returning to cold browse."
    requirement: D-02
    verification:
      - kind: browser
        ref: "e2e/progressive-search.spec.ts#direct-edit desktop popover reachability"
        status: pass
    human_judgment: false
  - id: D3
    description: "The full Chromium progressive-search regression set retains mobile, geometry, accessibility, and fixed 25 km cross-municipality coverage."
    requirement: D-09
    verification:
      - kind: browser
        ref: "node node_modules/@playwright/test/cli.js test e2e/progressive-search.spec.ts --project=chromium --workers=1"
        status: pass
    human_judgment: false
---

# Phase 24 Plan 14: Desktop Direct-Edit Popover Summary

**Completed result answers now reopen the desktop question Popover from the clicked chip, with a viewport-reachable Cancel path and no change to the existing pill or mobile sheet.**

## Performance

- **Duration:** 30 min
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- Retained each direct-edit answer chip as the Popover's current Radix virtual reference while preserving normal idle-pill trigger anchoring.
- Bounded desktop Popover content by Radix's collision-aware available height and preserved reducer-owned focus, Escape/outside dismissal, status, Cancel, and Dialog behavior.
- Added focused and Chromium coverage for direct Activity-chip edits; the browser scenario measures chip/overlay adjacency and full Cancel containment before verifying cold-route recovery.
- Committed the already-pending fixed-25-km cross-municipality scenario verbatim alongside the browser regression and confirmed it during the complete file run.

## Task Commits

1. **Task 1: Anchor a direct desktop answer edit to its initiating chip**
   - `4a0360e` — RED component regression for direct Activity edits
   - `4702470` — virtual-anchor handoff and collision-aware Popover height bound
2. **Task 2: Measure populated-result direct-edit reachability in Chromium**
   - `4a30e41` — direct-edit browser geometry/recovery regression plus preserved fixed-reach coverage

## Verification

- PASS — `node node_modules/vitest/vitest.mjs run tests/search/progressive-search.test.tsx` (20 tests)
- PASS — `node node_modules/eslint/bin/eslint.js src/components/search/progressive-search-overlay.tsx src/components/search/search-experience.tsx tests/search/progressive-search.test.tsx`
- PASS — named Chromium direct-edit scenario (1 test)
- PASS — all 11 individual Chromium progressive-search cases, including fixed 25 km cross-municipality reach

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking environment] Recovered the local browser server from orphaned Windows processes and a stale generated cache.**
- **Found during:** Task 2
- **Issue:** Previous interrupted Playwright runs left Node processes holding port 3000; after cleanup, the generated `.next` cache served a persistent 404 at `/`, preventing Playwright's configured server health check.
- **Fix:** Terminated only the verified Playwright process trees, then recoverably moved the generated cache aside so a fresh configured server could rebuild it. Task-only logs and the cache backup were removed after verification.
- **Verification:** The named direct-edit test passed; the fresh-server run completed all 11 Chromium cases.

**2. [Rule 3 - Blocking environment] Recorded the Windows Playwright shutdown hang after all tests finished.**
- **Found during:** Task 2
- **Issue:** The runner did not naturally exit after its final green test because its Windows child-process cleanup hung.
- **Fix:** Captured the complete per-case output (11 green cases), then terminated only the verified runner tree to release its child processes and port.
- **Verification:** Every named case in the required spec reported `ok`; no product assertion failed.

**Total deviations:** 2 Rule 3 environment recoveries. No production scope expansion.

## TDD Note

Task 1 used an intentional RED → GREEN sequence. The direct-edit test initially observed Radix's off-screen `translate(0, -200%)` measuring transform. After the virtual-anchor implementation, the focused suite passed all 20 tests.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `src/components/search/progressive-search-overlay.tsx`
- FOUND: `src/components/search/search-experience.tsx`
- FOUND: `tests/search/progressive-search.test.tsx`
- FOUND: `e2e/progressive-search.spec.ts`
- FOUND commits: `4a0360e`, `4702470`, `4a30e41`

## Next Phase Readiness

The desktop result-correction path is now covered through the actual browser journey; Phase 24 can proceed to final verification.

*Phase: 24-search-bar-rework*
*Completed: 2026-09-15*
