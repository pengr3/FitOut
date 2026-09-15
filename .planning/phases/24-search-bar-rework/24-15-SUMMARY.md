---
phase: 24-search-bar-rework
plan: 15
subsystem: progressive-search
tags: [react, reducer, geolocation, vitest, playwright, chromium]
requires:
  - phase: 24-14
    provides: responsive progressive-search host with direct-edit recovery
provides:
  - Reducer-owned browser geolocation attempt validity
  - Deterministic 375 px stale-callback regression coverage
affects: [progressive-search, D-05, mobile-search, browser-regression]
tech-stack:
  added: []
  patterns: [monotonic callback token minted locally and accepted only by reducer-owned active state]
key-files:
  created: []
  modified:
    - src/components/search/search-experience.tsx
    - tests/search/progressive-search.test.tsx
    - e2e/progressive-search.spec.ts
key-decisions:
  - "Keep attempt minting local, but make the reducer the only authority that activates, clears, or accepts a browser-geolocation attempt."
  - "Release the mobile browser callback only after semantic Back and focus assertions instead of a wall-clock delay."
requirements-completed: [D-05]
coverage:
  - id: D1
    description: "A stale mobile browser-geolocation callback cannot advance a journey after Back."
    requirement: D-05
    verification:
      - kind: unit
        ref: "tests/search/progressive-search.test.tsx#accepts a browser location callback only for the active location attempt"
        status: pass
      - kind: e2e
        ref: "e2e/progressive-search.spec.ts#stale location callback cannot advance after Back and address remains usable"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cancel, edit, correction, address resolution, replacement attempts, and browser failures invalidate an older callback without blocking address recovery."
    requirement: D-05
    verification:
      - kind: unit
        ref: "tests/search/progressive-search.test.tsx#invalidates an active browser attempt at every reducer-owned location boundary"
        status: pass
      - kind: e2e
        ref: "node node_modules/@playwright/test/cli.js test e2e/progressive-search.spec.ts --project=chromium --workers=1"
        status: pass
    human_judgment: false
actuals:
  tokens: 4062
  tasks: 2
  commits: 4
plan_head_before: af0b7796f6dd4066d98f5cfd608675cfcd4b6075
duration: ~40 min
completed: 2026-09-15
status: complete
---

# Phase 24 Plan 15: Reducer-Owned Geolocation Invalidation Summary

Browser-geolocation callbacks now carry a monotonic attempt identity that the progressive-search reducer accepts only while the matching location-screen attempt is active, preventing a late mobile callback from overwriting a recovered journey.

## Accomplishments

- Added reducer-owned active browser-location attempt state and guarded success/failure events.
- Cleared active attempts atomically on Back, Cancel, direct Edit, correction, address resolution, and replacement attempts.
- Replaced the mobile Chromium test's timer with a test-owned callback released only after Back restores activity focus.
- Proved focused component behavior, named 375 px stale-callback flow, and the later all-green 11-case Chromium and full Vitest confirmations.

## Task Commits

1. **Task 1: Make Back invalidate one in-flight browser-location attempt end to end**
   - `3345e3c` — RED mobile callback-ordering and reducer acceptance coverage.
   - `2dfc22d` — GREEN reducer-owned active-attempt guard and mobile focus proof.
2. **Task 2: Expand invalidation-boundary proof and close the full Chromium regression**
   - `c3e7dc9` — RED invalidation-boundary and recovery coverage.
   - `34b8f3d` — stale success/failure no-op assertions after every invalidation boundary.

## Verification

- PASS — focused Vitest suite: 22 tests.
- PASS — scoped ESLint for the coordinator, focused component suite, and Chromium spec.
- PASS — named 375 px Chromium stale-callback journey.
- PASS — subsequent complete Chromium `e2e/progressive-search.spec.ts` run: 11 cases, confirmed by Plan 24-16.
- PASS — subsequent full Vitest run, confirmed by Plan 24-16.

## Decisions Made

- A browser API callback is not itself an answer: its identity must match reducer state on the location screen before it can advance to party.
- The mutable ref only mints identities; it no longer invalidates or authorizes callbacks outside reducer state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Cleared Playwright-owned Node workers from port 3000 before rerunning the complete Chromium file.**
- **Found during:** Task 2 verification.
- **Issue:** A focused Playwright invocation left its temporary Next worker listening after the command returned, conflicting with the configured exclusive test server.
- **Fix:** Stopped only the verified Playwright-owned process tree and verified the port was free before retrying.
- **Files modified:** None.

The initial full Chromium retry then exposed the pre-existing mobile Dialog geometry failure. Plan 24-16 repaired that separate responsive-host contract and independently confirmed the complete Chromium and Vitest gates before this plan was closed.

## Known Stubs

None.

## Self-Check: PASSED

- Confirmed `3345e3c`, `c3e7dc9`, `2dfc22d`, and `34b8f3d` exist in Git history.
- Confirmed the coordinator, focused component suite, and Chromium regression spec exist with the committed D-05 coverage.

## Next Phase Readiness

D-05's stale browser-location lifecycle gap is closed without changing URL serialization, address resolution ownership, or the responsive Popover/Dialog structure.
