---
phase: 24-search-bar-rework
plan: "04"
subsystem: public-search-result-composition
tags: [nextjs, react, streaming, accessibility, vitest]
requires: [progressive-search-coordinator, party-size-search-contract]
provides: [canonical-public-search-query, shared-answer-result-states, inert-streaming-search-shell]
affects: [public-home, search-results, search-loading]
tech-stack:
  added: []
  patterns: [server-canonical-query-projection, coordinator-owned-answer-chips, inert-streaming-fallback]
key-files:
  created: []
  modified:
    - src/app/(public)/page.tsx
    - src/app/(public)/loading.tsx
    - src/components/search/search-results.tsx
    - tests/search/search-results-states.test.tsx
decisions:
  - Public search executes only a validated category, coordinates, location label, party size, sort, and bounded page projection; retired URL fields cannot influence the query or client navigation.
  - SearchExperience remains the single shared owner of editable answers across populated, empty, error, and soft-loading result outcomes.
  - The route-level fallback is server-only inert pill geometry; CardGridSkeleton remains the sole named loading status.
plan_head_before: c2a37f5
commits: 3
actuals:
  tokens: 14618
  tasks: 2
  commits: 3
metrics:
  duration: 46m
  completed: 2026-09-15
status: complete
---

# Phase 24 Plan 04: Canonical Search Results Summary

Public search results now remain one progressive conversation: only validated activity, location, party, sort, and page state reach the server query; every resolved state retains the coordinator’s three direct-edit chips; and hard navigation reserves the compact pill without a second interactive search tree.

## Completed Work

- Replaced the public page’s broad parsed-query handoff with a canonical validated projection, preserving cumulative paging, bounded page count, and code-only server diagnostics.
- Removed public result-shell refinement, relaxation, and date-window prop paths. Result cards now receive only server rows.
- Kept populated, calm empty, generic error, soft-pending, and cold-browse branches in `SearchResults`; the completed empty state now says `No spaces match those answers` and directs the visitor to edit an answer above.
- Replaced the route fallback’s live form with an `aria-hidden` geometry-matched pill shell and neutral visual strokes. `CardGridSkeleton` remains the only loading-status owner.
- Rewrote the focused state suite around a `SearchExperience` completed-search harness, including shared-chip parity, canonical sort/page navigation, retry, soft-pending, cold browse, and loading-fallback coverage.

## Usage Census

### Runtime surfaces disconnected by 24-04

- `src/app/(public)/page.tsx` no longer feeds date-aware inputs or any retired refinement result into the public result tree.
- `src/components/search/search-results.tsx` no longer imports or renders the legacy band, retired controls, or a searched-window card handoff.
- `src/app/(public)/loading.tsx` no longer imports the old interactive search form.

### Tracked retirement contracts assigned to 24-05

- Dead modules retained for the dedicated retirement: `src/components/search/search-bar.tsx`, `src/components/search/relax-band.tsx`, and `src/lib/search/relaxation.ts`.
- Focused/dead-contract suites: `tests/search/relaxation-ladder.test.ts` and `e2e/zero-result-relax.spec.ts`.
- Browser/design inventory and visual-baseline contracts: `src/lib/design/visual-baselines.ts` plus `e2e/visual/surfaces.spec.ts-snapshots/search-relax-band-320-court-visual-linux.png` and `e2e/visual/surfaces.spec.ts-snapshots/search-relax-band-1280-court-visual-linux.png`.

## Verification

- Passed: `node node_modules/vitest/vitest.mjs run tests/search/search-results-states.test.tsx` — 7 focused tests; the test harness used the running `fitout-db-1` container and reported no leaked writes.
- Passed: `docker ps --format "{{.Names}}\t{{.Status}}"` — `fitout-db-1` was `Up`.
- Passed: `git diff --check c2a37f5..HEAD` for all four plan-owned files.
- Ran: `node node_modules/typescript/bin/tsc --noEmit`. It remains blocked only by pre-existing `.next` generated-route disagreement and unrelated auth, design, ops, progressive-search, and verification test diagnostics; no Plan 24-04 file is reported.

## TDD Gate Compliance

| Task | RED | GREEN | Status |
| --- | --- | --- | --- |
| 1: canonical result-state composition | `bde4242` intentionally failed on the required calm empty copy | `4476dd4` | Pass |
| 2: inert streaming pill fallback | `bde4242` intentionally failed because the inert shell did not exist | `6ac784d` | Pass |

## Deviations from Plan

### Auto-fixed Issues

1. [Rule 3 - Test environment] Added a local `scrollIntoView` stub and a controlled `useTransition` mock in the focused jsdom suite.
- **Found during:** Task 1 verification.
- **Fix:** Kept browser-only Radix behavior out of the assertions while still proving the soft-pending loading owner.
- **Files modified:** `tests/search/search-results-states.test.tsx`

## Known Stubs

None.

## Self-Check: PASSED

- Plan commits `bde4242`, `4476dd4`, and `6ac784d` exist.
- All four plan-owned source and test files exist and are committed.
