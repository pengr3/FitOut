---
phase: 22-ops-decides-with-the-whole-picture-queue-removal-enforcement
plan: 01
subsystem: ops-review-queue
tags: [nextjs, react, postgres, drizzle, playwright, vitest]
requires:
  - phase: 20
    provides: staff-gated terminal ops queue and protected decision controls
provides:
  - server-projected listing description and ordered amenity evidence
  - one batched listing cancellation-impact read for the ops page
  - in-place listing evidence disclosure with existing queue primitives
affects: [ops-review-queue, ops-enforcement, phase-22-plan-02]
actuals:
  tokens: 8902
  tasks: 2
  commits: 2
plan_head_before: cfeaa579d17d1d3e7e1dcfcb4175154f3d95999c
tech-stack:
  added: []
  patterns:
    - Listing review evidence is projected in the queue query rather than fetched by the client.
    - Batch cancellation impacts preserve the single-listing response contract in a map keyed by listing id.
key-files:
  created:
    - e2e/ops-queue.spec.ts
  modified:
    - src/lib/ops/review-queue.ts
    - src/lib/ops/cancel-impact.ts
    - src/app/(ops)/ops/page.tsx
    - src/components/ops/ops-queue-row.tsx
    - tests/ops/queue-query.test.ts
    - tests/ops/ops-queue-row.test.tsx
requirements-completed: [OPS-13, OPS-14, OPS-15]
key-decisions:
  - "Use a local native disclosure with serializable server evidence instead of a detail destination or fetch state."
patterns-established:
  - "Ops queue page discovers listing ids once, reads all impacts in one query, then performs a pure final row map."
coverage:
  - id: D1
    description: Pending listing rows receive description and deterministic amenity evidence while batch impacts retain every established single-listing value.
    requirement: OPS-13
    verification:
      - kind: integration
        ref: tests/ops/queue-query.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: A listing can reveal its existing gallery, facts, and contact in one terminal row without adding another decision widget.
    requirement: OPS-13
    verification:
      - kind: unit
        ref: tests/ops/ops-queue-row.test.tsx
        status: pass
      - kind: e2e
        ref: e2e/ops-queue.spec.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Staff-only page composition performs queue impact reads before a pure final row map.
    requirement: OPS-14
    verification:
      - kind: other
        ref: src/app/(ops)/ops/page.tsx
        status: pass
    human_judgment: false
completed: 2026-09-10
status: complete
---

# Phase 22 Plan 01: Queue Evidence Data and Tracer Summary

Pending listing rows now deliver all review evidence in place: description, ordered amenities, photos, material facts, fail-closed host standing, and contact reveal. The ops page replaces its per-row cancellation-impact reads with one grouped query and maps the completed values synchronously.

## Accomplishments

- Extended the review-queue DTO and query with nullable description and deterministic amenity aggregation, normalizing absent collections to an empty array.
- Added `loadOpsCancelImpacts`, preserving the existing individual-impact contract for every requested listing while avoiding N+1 page reads.
- Kept `requireStaff()` ahead of data loading and composed the already-finished impact map into rows without widening the client boundary.
- Added the protected, local-only authenticated browser tracer that Phase 22 Plan 02 expands into its responsive matrix.

## Task Commits

1. `662b7be` — `feat(22-01): add in-place listing evidence`
2. `b54ccb4` — `test(22-01): prove queue evidence contracts`

## Verification

- `npm.cmd test -- tests/ops/queue-query.test.ts tests/ops/ops-queue-row.test.tsx` — 32 passed during this plan; the final combined run reports 34 passed.
- node node_modules/eslint/bin/eslint.js on the changed implementation and test files — passed.
- `git diff --check` — passed.

## Deviations from Plan

None retained. The initial global `npx` shim was unavailable on this Windows host, so the project-local package scripts and checked-in Playwright entry point were used instead.

## Known Stubs

None.

## Self-Check: PASSED

- All seven planned source, test, and tracer files exist.
- Both task commits exist after the recorded plan head.
- No migration, package, schema, route, or additional decision surface was introduced.
