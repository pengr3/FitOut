---
phase: 24-search-bar-rework
plan: "05"
subsystem: public-search-browser-evidence
tags: [playwright, chromium, axe, nextjs, postgres, accessibility]
requires:
  - phase: 24-02
    provides: correctable progressive search reducer, focus targets, and geolocation callback safety
  - phase: 24-03
    provides: canonical party-size URL validation and pre-pagination capacity filtering
  - phase: 24-04
    provides: canonical result composition and inert streaming fallback
provides:
  - Deterministic Chromium proof for desktop and 375px progressive-search journeys
  - Canonical URL entry helper for booking suites
  - Client-state hydration for answer chips after App Router result replacement
affects: [search-and-book-e2e, progressive-search, public-search-results]
tech-stack:
  added: []
  patterns: [server-answer rehydration after client navigation, deterministic Photon interception, capacity-honest result fixtures]
key-files:
  created: []
  modified:
    - e2e/progressive-search.spec.ts
    - e2e/helpers/booker-seed.ts
    - src/components/search/search-experience.tsx
    - tests/search/progressive-search.test.tsx
key-decisions:
  - "Use the canonical completed-search URL in booking helpers so dependent booking specs do not duplicate the progressive journey."
  - "Hydrate server-confirmed answers only when their canonical tuple changes, preserving direct-edit state during local correction."
patterns-established:
  - "Browser location fixtures intercept Photon at `/api**`, because its query is attached directly to `/api` rather than a child path."
  - "Axe scans assert a reachable state and the settled single-tree contract before evaluating the shared helper."
requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08]
plan_head_before: d545bfc
commits: 2
actuals:
  tokens: 5958
  tasks: 2
  commits: 2
metrics:
  duration: 54m
  completed: 2026-09-15
status: complete
coverage:
  - id: D1
    description: Desktop and 375px progressive search journeys preserve answers through Back/Edit/Cancel, exact activity selection, address or geolocation, and solo/group completion.
    verification:
      - kind: e2e
        ref: e2e/progressive-search.spec.ts#journey-and-group-matrix
        status: pass
    human_judgment: false
  - id: D2
    description: Canonical URLs reload and open in a fresh page with capacity-eligible results and calm empty-state answer chips, without public capacity claims.
    verification:
      - kind: e2e
        ref: e2e/progressive-search.spec.ts#group-reload-and-share
        status: pass
    human_judgment: false
  - id: D3
    description: Keyboard focus, one status owner per mounted surface, reduced motion, axe reachability, and one settled responsive tree are exercised at both widths.
    verification:
      - kind: e2e
        ref: e2e/progressive-search.spec.ts#keyboard-focus-status-reduced-motion-axe
        status: pass
    human_judgment: false
---

# Phase 24 Plan 05: Progressive Browser Matrix Summary

**Chromium now proves the complete responsive progressive-search journey, canonical reload/share behavior, capacity-honest outcomes, and reachable accessibility states while booking suites enter through one validated URL helper.**

## Completed Work

- Expanded the serial, Docker-backed browser matrix to exercise the activity → location → party flow at 1280px and 375px, including unmatched local typing, Back/Edit retention, Cancel-to-browse, solo/group submission, address/geolocation recovery, reload, fresh shared navigation, and calm empty results.
- Seeded equal, above, undersized, and NULL capacity listings and asserted only eligible public cards appear without exposing configured capacity or no-date availability claims.
- Added keyboard, focus, status-owner, reduced-motion, one-tree, and shared-axe coverage for idle, each question, populated, and empty states.
- Replaced the obsolete helper interaction with one canonical completed-search URL before clicking a uniquely seeded listing.
- Fixed the coordinator’s missing App Router rehydration, which otherwise left result answer chips absent after `router.push` replaced Server Component children.

## Verification

- Passed: `node node_modules/vitest/vitest.mjs run tests/search/progressive-search.test.tsx` — 11 tests.
- Passed focused Chromium runs (all with `--project=chromium --workers=1`): desktop journey, desktop group/reload/share, both 375px functional journeys, denied/stale location recovery, desktop accessibility matrix, and 375px accessibility matrix — 8 named cases total.
- Passed: `git diff --check` for the plan-owned browser files.
- Ran: `node node_modules/typescript/bin/tsc --noEmit`. It remains blocked by pre-existing `.next` route-validator disagreement plus unrelated auth, design, ops, and verification-test diagnostics. Neither `e2e/progressive-search.spec.ts` nor `e2e/helpers/booker-seed.ts` is reported.

## Task Commits

1. **Task 1: correction, location, party, reload-safe results** — `8d637b3`
2. **Task 2: keyboard focus, status ownership, reduced motion, axe, and single-tree behavior** — `8d637b3`

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1 - Bug] Rehydrated completed answers after client-side result navigation.**
- **Found during:** Task 1 browser verification.
- **Issue:** App Router preserved the client coordinator while replacing Server Component children, so a submitted result rendered cards but no direct-edit answer chips.
- **Fix:** Synchronize a changed canonical answer tuple into coordinator state and cover the replacement with a focused unit test.
- **Files modified:** `src/components/search/search-experience.tsx`, `tests/search/progressive-search.test.tsx`
- **Verification:** Focused Vitest suite passed; the desktop/mobile browser journeys now find and use direct-edit chips.
- **Commit:** `52a0a88`

2. **[Rule 1 - Test infrastructure] Corrected semantic locators and Photon interception.**
- **Found during:** Task 1 browser verification.
- **Issue:** The address trigger is a combobox, cmdk exposes a stable input slot, and Photon queries `/api` directly; the original generic test paths could not reliably observe the shipped controls or intercept the provider.
- **Fix:** Use the real ARIA roles/slot contract and intercept `https://photon.komoot.io/api**` deterministically.
- **Files modified:** `e2e/progressive-search.spec.ts`
- **Verification:** All eight focused Chromium cases passed.
- **Commit:** `8d637b3`

## Known Stubs

None.

## Self-Check: PASSED

- Commits `52a0a88` and `8d637b3` exist.
- All four modified source/test files exist, and the plan’s two primary E2E artifacts are committed.

