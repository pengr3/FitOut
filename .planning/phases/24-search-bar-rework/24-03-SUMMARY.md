---
phase: 24-search-bar-rework
plan: 03
subsystem: search validation and database query contract
tags: [zod, drizzle, postgres, vitest, party-size]
requires:
  - phase: 24-01
    provides: Canonical partySize URL handoff and its stage-one capacity predicate
provides:
  - Server-validated scalar party-size bounds and engaged-URL normalization
  - Database-backed coverage for capacity filtering before pagination
affects: [public-search, progressive-search, search-results]
actuals:
  tokens: 4000
  tasks: 2
  commits: 4
tech-stack:
  added: []
  patterns: ["Optional party-size SQL predicate remains server-owned and pre-pagination", "Database fixtures use zero-padded ISO timestamps"]
key-files:
  created:
    - tests/search/party-size-filter.test.ts
  modified:
    - src/lib/validation/booking.ts
    - tests/validation/booking-schemas.test.ts
key-decisions:
  - "Treat partySize as the engaged-search signal that retires date, price, radius, and relaxation inputs while leaving cold browse URLs compatible."
  - "Keep configured capacity in SQL predicates only; returned rows expose no capacity value or no-date remaining-spots claim."
patterns-established:
  - "Capacity eligibility is proved with real Postgres fixtures for both occupancy modes and for pre-pagination ordering."
requirements-completed: [D-06, D-07]
coverage:
  - id: D1
    description: Optional bounded scalar partySize validation and engaged-search normalization
    verification:
      - kind: unit
        ref: tests/validation/booking-schemas.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Capacity predicate remains pre-pagination, occupancy-mode-neutral, and non-projecting
    verification:
      - kind: integration
        ref: tests/search/party-size-filter.test.ts
        status: pass
    human_judgment: false
duration: interrupted recovery
completed: 2026-09-15
status: complete
---

# Phase 24: Search Bar Rework Summary

**Server-owned exact party-size validation now normalizes engaged URLs and has real-Postgres proof that configured capacity filters results before pagination without becoming public inventory.**

## Performance

- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments

- Added scalar, bounded party-size parsing with engaged-search retirement of legacy refinements.
- Added a database-backed matrix covering NULL, below, equal, and above capacities across exclusive and open-capacity listings.
- Proved capacity is filtered before pagination, omitted-party compatibility remains intact, and no configured capacity leaks into result rows.

## Task Commits

1. **Task 1: Bound partySize and normalize retired refinements after engagement** — `a3d9fc9` (RED evidence), `b6f896b` (implementation)
2. **Task 2: Prove the parameterized capacity predicate before pagination for both occupancy modes** — recorded in the Plan 24-01 predicate implementation; `243a026` (database-backed coverage)

## Files Created/Modified

- `src/lib/validation/booking.ts` — validates partySize and normalizes retired engaged-search fields.
- `tests/validation/booking-schemas.test.ts` — asserts scalar/boundary/legacy compatibility behavior.
- `tests/search/party-size-filter.test.ts` — verifies the real database capacity matrix and pagination ordering.

## Decisions Made

- Reused the capacity predicate introduced by Plan 24-01 and added the dedicated D-06/D-07 integration proof in this recovery.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1 - Bug] Corrected invalid single-digit ISO timestamps in the new Postgres fixture.**
- **Verification:** `tests/search/party-size-filter.test.ts` passes all three tests.

---

**Total deviations:** 1 auto-fixed.

## Issues Encountered

- The original executor was interrupted after Task 1 commits and before it could commit Task 2 coverage. This summary closes the committed work after inspecting the recovery diff and re-running both focused suites.

## User Setup Required

None.

## Next Phase Readiness

Plans 24-04 and later can rely on the validated party-size URL contract and the capacity-honest query behavior.

---
*Phase: 24-search-bar-rework*
*Completed: 2026-09-15*
