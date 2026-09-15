---
phase: 24-search-bar-rework
plan: 12
subsystem: search
tags: [nextjs, server-components, postgis, vitest, drizzle]
requires:
  - phase: 24-10
    provides: validated progressive-search location state
provides:
  - server-owned, immutable 25 km public search reach
  - coordinate-based PostGIS regression coverage across municipal labels
affects: [public search route, search query contract, progressive search]
tech-stack:
  added: []
  patterns:
    - server-only normalization module between validated URL state and searchListings
    - isolated PostGIS fixtures for geographic inclusion and ordering assertions
key-files:
  created:
    - src/lib/search/public-search-contract.ts
    - tests/search/public-search-contract.test.ts
    - tests/search/public-search-geography.test.ts
  modified:
    - src/app/(public)/page.tsx
key-decisions:
  - "The public Server Component replaces every validated URL radius with PUBLIC_SEARCH_RADIUS_KM before calling searchListings."
  - "Municipal labels remain display data; point coordinates alone determine geographic eligibility and distance ranking."
patterns-established:
  - "Keep product-owned public query authority in a server-only pure contract module, not in the client URL surface."
requirements-completed: [D-10, D-11]
coverage:
  - id: D-10
    description: "Completed public searches use submitted coordinates as a fixed 25 km origin, crossing municipal labels and ranking nearest first."
    requirement: D-10
    verification:
      - kind: integration
        ref: "tests/search/public-search-geography.test.ts#public search geography"
        status: pass
    human_judgment: false
  - id: D-11
    description: "The public Server Component owns the fixed reach and canonical public URLs omit radius."
    requirement: D-11
    verification:
      - kind: unit
        ref: "tests/search/public-search-contract.test.ts#public search contract"
        status: pass
    human_judgment: false
actuals:
  tokens: 2749
  tasks: 2
  commits: 2
plan_head_before: a95324e486a0e5a5a1c1867982e9c71fdf02a69c
duration: 8min
completed: 2026-09-15
status: complete
---

# Phase 24 Plan 12: Public Search Geography Summary

**A server-only 25 km public-search contract now overrides URL radius input, while isolated PostGIS tests prove cross-city inclusion, nearest-first ordering, and outside-reach exclusion.**

## Performance

- **Duration:** 8 min
- **Tasks:** 2/2 complete
- **Files modified:** 4
- **Commits:** 2 task commits; metadata commit pending

## Accomplishments

- Added `PUBLIC_SEARCH_RADIUS_KM` and a pure, server-only derivation that retains only the supported progressive-search state before `searchListings` runs.
- Replaced the public page's private 10 km assignment and local serializer with the route contract, so canonical public URLs do not expose a radius parameter.
- Added an isolated PostGIS geography suite that proves a Makati listing inside the point radius remains eligible from a Mandaluyong origin, is ordered after the nearer local listing, and that an otherwise matching row outside 25 km is excluded.

## Task Commits

1. **Task 1: Give the public Server Component one immutable 25 km search contract** — `8c9d916` (`feat`)
2. **Task 2: Prove the 25 km point-radius query crosses city labels and ranks by distance** — `d35126d` (`test`)

## Verification

- `node node_modules/vitest/vitest.mjs run tests/search/public-search-contract.test.ts` — passed: 1 file, 3 tests.
- `node node_modules/eslint/bin/eslint.js src/lib/search/public-search-contract.ts src/app/(public)/page.tsx tests/search/public-search-contract.test.ts` — passed with no diagnostics.
- `docker info --format '{{.ServerVersion}}'` and `docker compose ps db --format json` — confirmed Docker 29.6.1 and the `postgis/postgis:18-3.6` database container running before the database-backed task.
- `node node_modules/vitest/vitest.mjs run tests/search/public-search-geography.test.ts` — passed: 1 file, 3 tests; the isolated schema was cleaned successfully.
- `node node_modules/vitest/vitest.mjs run tests/search/public-search-contract.test.ts tests/search/public-search-geography.test.ts` — passed: 2 files, 6 tests.
- `node node_modules/eslint/bin/eslint.js src/lib/search/public-search-contract.ts src/app/(public)/page.tsx tests/search/public-search-contract.test.ts tests/search/public-search-geography.test.ts` — passed with no diagnostics.

## Decisions Made

- The route owns `PUBLIC_SEARCH_RADIUS_KM = 25`; legacy and crafted-but-valid URL radius values are validated but then overwritten before they can reach the parameterized PostGIS query.
- The cold-browse path remains coordinate-free. Its fixed radius field is inert because the existing query applies `ST_DWithin` only when it has both coordinates.
- Geography coverage asserts observable IDs and `distanceM` ordering against real PostGIS rather than inspecting generated SQL.

## Deviations from Plan

### Execution Configuration

**1. Task-level TDD markers ran under a disabled TDD workflow gate.**
- **Found during:** Task 1
- **Context:** `.planning/config.json` has `tdd_mode: false` and this plan is `type: execute`; the parent execution instruction also required one atomic commit per task.
- **Outcome:** Task 1 combines its implementation and direct behavior test in one atomic feature commit rather than separate RED/GREEN commits. The required focused test and tracer verification both passed.
- **Impact:** No behavior, scope, dependency, or security deviation.

**Total deviations:** 1 execution-process note; no code deviations.

## Issues Encountered

- The initial non-elevated Docker readiness probe could not access Docker Desktop's named pipe. A read-only elevated retry confirmed the running PostGIS container; no test or environment change was made.

## Known Stubs

None.

## Next Phase Readiness

The public route now has a named, server-owned spatial reach with focused route and real-database regression coverage. No radius control, municipal filter, migration, dependency, or client authority was introduced.

## Self-Check: PASSED

All four plan-owned source/test files and both task commits (`8c9d916`, `d35126d`) exist. The stub-pattern scan found no tracked stubs in plan-owned files.

*Phase: 24-search-bar-rework*
*Completed: 2026-09-15*
