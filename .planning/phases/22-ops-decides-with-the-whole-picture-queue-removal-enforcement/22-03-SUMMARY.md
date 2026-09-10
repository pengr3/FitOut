---
phase: 22-ops-decides-with-the-whole-picture-queue-removal-enforcement
plan: "03"
subsystem: ops
tags: [ops, review-queue, operating-hours, react, postgres, playwright]
requires:
  - phase: 22-02
    provides: terminal, staff-gated expanded listing evidence with one decision widget
provides:
  - Ordered, serializable operating-hours windows in the staff review queue DTO
  - Canonical Sunday-first operating-hours evidence in expanded listing rows
  - Integration, component, and authenticated browser coverage for populated and empty schedules
affects: [ops queue, listing review, availability]
tech-stack:
  added: []
  patterns:
    - Existing lateral JSON aggregation for bounded listing-owned evidence
    - Canonical deriveWeekStrip formatting reused across the server-to-client boundary
key-files:
  created: []
  modified:
    - src/lib/ops/review-queue.ts
    - src/components/ops/ops-queue-row.tsx
    - tests/ops/queue-query.test.ts
    - tests/ops/ops-queue-row.test.tsx
    - e2e/ops-queue.spec.ts
key-decisions:
  - "Project plain day/time values through the existing staff-only queue DTO; add no endpoint, fetch, migration, or dependency."
  - "Delegate weekday order, closed-day copy, time labels, and multi-window conjunctions exclusively to deriveWeekStrip."
requirements-completed: [OPS-13, OPS-14, OPS-15]
actuals:
  tokens: 3145
  tasks: 2
  commits: 3
commits: 3
plan_head_before: b77a25f21533d72a78ad2ab71e745580001d1260
duration: 12min
completed: 2026-09-10
status: complete
coverage:
  - id: D1
    description: "Staff queue rows project ordered host-set weekly windows and show canonical populated and all-closed evidence."
    requirement: OPS-13
    verification:
      - kind: integration
        ref: "tests/ops/queue-query.test.ts"
        status: pass
      - kind: unit
        ref: "tests/ops/ops-queue-row.test.tsx"
        status: pass
      - kind: e2e
        ref: "e2e/ops-queue.spec.ts (chromium, Court/Grove x 320px/1280px)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The terminal staff queue keeps its one decision widget before complete expanded evidence."
    requirement: OPS-14
    verification:
      - kind: e2e
        ref: "e2e/ops-queue.spec.ts (chromium, Court/Grove x 320px/1280px)"
        status: pass
      - kind: unit
        ref: "tests/design/ops-host-invariants.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Host standing remains adjacent, visible listing evidence after the operating-hours fact is added."
    requirement: OPS-15
    verification:
      - kind: unit
        ref: "tests/ops/ops-queue-row.test.tsx"
        status: pass
    human_judgment: false
---

# Phase 22 Plan 03: Host-set operating-hours evidence Summary

**Staff reviewers can inspect canonical host-set weekly operating hours inside the existing terminal queue row before deciding a pending listing.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-10T20:14:00+08:00
- **Completed:** 2026-09-10T20:25:50+08:00
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Added a bounded, ordered lateral `operating_hours` aggregate to the explicit staff queue DTO, normalizing absent schedules to `[]`.
- Rendered all seven Sunday-first canonical week-strip sentences in an `Operating hours` evidence fact between Price and Host.
- Proved populated multi-window, closed-day, empty-schedule, evidence-order, responsive, and authenticated staff behavior without changing the staff gate, terminal row, schema, routes, or dependencies.

## Task Commits

1. **Task 1: Trace one host-set weekly schedule from queue projection to staff-visible evidence**
   - `0325aef` — `test(22-03): add failing operating-hours queue contracts`
   - `504782f` — `feat(22-03): show operating hours in ops queue evidence`
2. **Task 2: Lock ordered, empty, closed-day, and row-order operating-hours contracts**
   - `b35e62d` — `test(22-03): lock operating-hours evidence contracts`

## Files Created/Modified

- `src/lib/ops/review-queue.ts` — projects deterministic, serializable operating-hours evidence.
- `src/components/ops/ops-queue-row.tsx` — renders canonical weekly hours through `deriveWeekStrip`.
- `tests/ops/queue-query.test.ts` — proves ordered populated and empty queue DTO schedules.
- `tests/ops/ops-queue-row.test.tsx` — proves semantic evidence order and populated/empty weekly sentences.
- `e2e/ops-queue.spec.ts` — seeds out-of-order Monday windows and verifies canonical evidence through a real staff session.

## TDD Gate Compliance

- **RED:** `0325aef` intentionally failed the focused suite because the queue DTO omitted `operatingHours` and the evidence had no `Operating hours` fact.
- **GREEN:** `504782f` made the focused suite pass with the minimal projection and renderer.
- **REFACTOR:** Not needed.

## Decisions Made

- Kept operating-hours values as plain `{ dayOfWeek, openTime, closeTime }` data across the existing server/client boundary.
- Reused `deriveWeekStrip` rather than creating a queue-specific formatter, preserving canonical labels, range order, conjunctions, and explicit closed days.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Scoped an existing empty-amenities assertion to its own fact.**
- **Found during:** Task 1
- **Issue:** The prior generic `ul` absence check treated the newly required semantic operating-hours list as an amenities list.
- **Fix:** Asserted that only the Amenities fact has no list and extended the already-ordered terms with Operating hours.
- **Files modified:** `tests/ops/ops-queue-row.test.tsx`
- **Verification:** Focused component and integration suites passed.
- **Committed in:** `504782f`

**Total deviations:** 1 auto-fixed (Rule 1).

## Issues Encountered

- The prescribed Playwright command could not start its own server because a pre-existing Next dev server held port 3000. The process was left untouched; the exact authenticated Chromium spec then passed against that active local server using an ephemeral, uncommitted no-web-server configuration.

## Verification

- `npm.cmd test -- tests/ops/queue-query.test.ts tests/ops/ops-queue-row.test.ts` — pass (36 tests).
- `node node_modules/@playwright/test/cli.js test e2e/ops-queue.spec.ts --project=chromium --reporter=list --workers=1` — server startup blocked by existing port-3000 listener; the same spec passed against the active local server with an ephemeral configuration.
- `npm.cmd run test:design -- tests/design/ops-host-invariants.test.ts` — pass (8 tests).
- Focused ESLint and `tsc --noEmit` — pass.
- `git diff --check` — pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

G-22-8 is closed in the established staff-only queue path. The queue remains terminal and responsive, with no migrations or dependencies added.

---

*Phase: 22-ops-decides-with-the-whole-picture-queue-removal-enforcement*
*Completed: 2026-09-10*

## Self-Check: PASSED

- Summary file exists and all three task commits are present in Git history.
