---
phase: 22-ops-decides-with-the-whole-picture-queue-removal-enforcement
verified: 2026-09-10
status: passed
verifier: Codex
plans_verified: [22-01, 22-02, 22-03]
requirements: [OPS-13, OPS-14, OPS-15]
---

# Phase 22 Verification

## Goal

Staff can review complete pending-listing evidence in one terminal, staff-gated queue row and make a single protected decision.

## Goal-Backward Evidence

| Requirement | Evidence | Result |
| --- | --- | --- |
| OPS-13 — complete listing evidence | `getOpsReviewQueue` projects each row's description, amenities, gallery, contacts, and a lateral `operating_hours` aggregate correlated by `h.listing_id = l.id`; the row renders its canonical weekly schedule. | Pass |
| OPS-14 — terminal, protected decisions | The existing server-side staff gate, queue-empty behavior, one in-row decision widget, and post-decision removal flow remain intact. Authenticated Chromium coverage passes at 320px and 1280px. | Pass |
| OPS-15 — visible host standing | Host standing remains visible in the expanded evidence after the operating-hours fact. Component coverage asserts the ordered evidence terms. | Pass |

## Operating-hours Closure Check

This implementation is not tied to a fixture or seed. The SQL projection evaluates the `operating_hours` table for every returned pending listing using `h.listing_id = l.id`, serializes its ordered windows into that listing's DTO, and normalizes no matching rows to `[]`. The shared week-strip formatter renders the real stored weekly hours; an empty schedule renders seven explicit closed-day entries.

## Automated Evidence

- Focused queue-query and row tests: 36 passing.
- Authenticated Chromium queue acceptance: Court and Grove at 320px and 1280px passing.
- Design invariants: 8 passing.
- Focused ESLint, `tsc --noEmit`, and `git diff --check`: passing.
- Final standard-depth code review: clean, with no critical, warning, or info findings.

## Verdict

**Passed.** Phase 22 meets its goal, including the mandatory UAT gap G-22-8. No remaining phase-scoped blockers were found.
