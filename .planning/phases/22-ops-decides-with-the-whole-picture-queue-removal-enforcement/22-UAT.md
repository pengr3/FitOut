---
status: diagnosed
phase: 22-ops-decides-with-the-whole-picture-queue-removal-enforcement
source: [22-01-SUMMARY.md, 22-02-SUMMARY.md]
started: 2026-09-10T10:30:00Z
updated: 2026-09-10T12:03:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Complete queue evidence projection
expected: Pending listing rows receive description and deterministic amenity evidence while batch impacts retain every established single-listing value.
result: pass
source: automated
coverage_id: D1

### 2. Terminal in-place listing evidence
expected: A listing can reveal its existing gallery, facts, and contact in one terminal row without adding another decision widget.
result: pass
source: automated
coverage_id: D2

### 3. Staff-gated completed impact map
expected: Staff-only page composition performs queue impact reads before a pure final row map.
result: pass
source: automated
coverage_id: D3

### 4. Disclosure semantics and fallbacks
expected: Listing evidence is a single conditional region with native disclosure state, semantic order, partial-data fallbacks, and one decision widget outside the region.
result: pass
source: automated
coverage_id: D1

### 5. Authority and terminality guardrails
expected: Staff authority, protected action composition, terminal row behavior, and the positive queue-zero copy remain unchanged.
result: pass
source: automated
coverage_id: D2

### 6. Responsive browser acceptance
expected: Court and Grove at 320px and 1280px retain visible 44px decision controls, evidence below controls, no horizontal overflow, one decision widget, and the terminal queue URL.
result: pass
source: automated
coverage_id: D3

### 7. Confirm the staff queue inspection flow
expected: The automated evidence has passed for all six deliverables: the queue projects complete listing evidence, opens one terminal in-place disclosure, keeps one decision widget before evidence, preserves staff authority and fail-closed standing, and stays contained at 320px and 1280px in Court and Grove. Confirm this is the staff-review experience you intended.
result: pass
reported: User approved the staff queue inspection flow on 2026-09-10.

### 8. Inspect host-set operating hours before deciding
expected: A staff reviewer can inspect the host-set weekly operating hours within the expanded listing evidence before approving or rejecting the listing.
result: issue
reported: "minor but it is a must before we close phase 22"
severity: minor

## Summary

total: 8
passed: 7
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-22-8
  truth: "A staff reviewer can inspect the host-set weekly operating hours within the expanded listing evidence before approving or rejecting the listing."
  status: failed
  reason: "User reported: minor but it is a must before we close phase 22"
  severity: minor
  test: 8
  root_cause: "The queue projection drops listing-owned operating_hours before the DTO reaches the expanded row; the row and all Phase 22 queue fixtures and assertions omit the schedule as well."
  artifacts:
    - path: "src/lib/ops/review-queue.ts"
      issue: "The explicit listing DTO and SQL aggregates omit operating_hours."
    - path: "src/components/ops/ops-queue-row.tsx"
      issue: "The expanded evidence section has no Operating hours fact."
    - path: "e2e/ops-queue.spec.ts"
      issue: "The complete pending-listing fixture and assertions omit hours."
    - path: "tests/ops/queue-query.test.ts"
      issue: "The queue projection fixture and assertions omit hours."
    - path: "tests/ops/ops-queue-row.test.tsx"
      issue: "The row fixture and ordered-evidence assertions omit hours."
  missing:
    - "A bounded, deterministically ordered operating-hours projection in the listing queue DTO."
    - "An Operating hours fact in the expanded listing evidence that reuses the shared week-strip formatting rules."
    - "Projection, row, and authenticated browser coverage for populated, multi-window, closed-day, and empty-hour states."
  debug_session: ".planning/debug/g-22-8-operating-hours-evidence.md"
