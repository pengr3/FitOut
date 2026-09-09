---
phase: 21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit
plan: 06
subsystem: listing-review-history
tags: [nextjs, react, postgres, drizzle, vitest, tdd]
requires:
  - phase: 21-02
    provides: owner-scoped bounded review-history loader and host-safe display DTO
  - phase: 21-03
    provides: rejected-only Fix and resubmit dialog with nullable current-reason input
  - phase: 21-04
    provides: byte-frozen deliberate-resubmit transition and authoritative acknowledgement path
provides:
  - Newest rejected-row observation that is independent of nullable reason content
  - Real-database proof for newest null and whitespace-only reasons over older non-empty reasons
  - Visible-dialog proof that historical explanations never become current guidance
affects: [21-07, phase-21-verification, host-listings, listing-review]
actuals:
  tokens: 2204
  tasks: 2
  commits: 3
plan_head_before: 51dad935b9e32db4b999fbb9c9d7c546b4824b5e
tech-stack:
  added: []
  patterns:
    - Private observation sentinel separated from nullable domain data
    - Current guidance supplied only through the server-derived nullable prop
    - Mutation-validated regression coverage for behavior already present in the component
key-files:
  created:
    - .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-06-TASK-1-RED-EVIDENCE.json
    - .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-06-TASK-2-RED-EVIDENCE.json
  modified:
    - src/lib/listing/review-history.ts
    - tests/listing/review-history.test.ts
    - tests/listing/listing-card.test.tsx
key-decisions:
  - "The first rejected row observed per listing is authoritative even when its normalized reason is null; nullable content is never reused as observation state."
  - "The Fix and resubmit dialog continues to trust only its nullable rejectionReason prop and never searches reviewHistory for fallback guidance."
patterns-established:
  - "Nullable-state separation: track whether a row was observed independently from the nullable value derived from that row."
requirements-completed: [LVER-06]
coverage:
  - id: D1
    description: "The newest rejected review row remains the sole current-reason authority when its reason is null or whitespace-only, while older text remains attached to its own historical cycle."
    requirement: LVER-06
    verification:
      - kind: integration
        ref: "tests/listing/review-history.test.ts#keeps a newest null or whitespace-only rejection authoritative over an older non-empty reason"
        status: pass
    human_judgment: false
  - id: D2
    description: "The visible Fix and resubmit dialog omits historical text for null and whitespace-only current reasons while retaining its seven-item checklist and Continue to edit action."
    requirement: LVER-06
    verification:
      - kind: unit
        ref: "tests/listing/listing-card.test.tsx#keeps an older historical reason out of current guidance"
        status: pass
    human_judgment: false
duration: 10min
completed: 2026-09-09
status: complete
---

# Phase 21 Plan 06: Current Rejection Fidelity Summary

**Newest blank rejection outcomes now remain truthful current guidance, with older explanations confined to their historical cycles and excluded from the visible recovery dialog.**

## Performance

- **Duration:** 10 minutes
- **Started:** 2026-09-09T15:36:37Z
- **Completed:** 2026-09-09T15:46:47Z
- **Tasks:** 2
- **Files modified:** 5 implementation, test, and RED-evidence files

## Accomplishments

- Separated rejected-row observation from nullable reason content with one private per-listing sentinel, preserving the existing SQL, DTO, ordering, and bounds.
- Added real-database regressions proving both null and whitespace-only newest reasons remain null while the older sentence stays on its historical cycle.
- Added dialog regressions proving historical text is not promoted into current guidance and that the tuple-backed checklist and edit action remain available.
- Preserved `src/lib/listing/re-review.ts` byte-for-byte and introduced no schema, dependency, endpoint, query, or client-boundary change.

## Task Commits

1. **Task 1 RED: newest null/blank reason regressions** — `390acf0` (test)
2. **Task 1 GREEN: independent rejected-row observation** — `1f2a361` (fix)
3. **Task 2: mutation-validated visible-dialog regressions** — `2eeab87` (test)

## Files Created/Modified

- `src/lib/listing/review-history.ts` — Tracks first rejected-row observation independently from its normalized nullable reason.
- `tests/listing/review-history.test.ts` — Covers newest null and whitespace-only reasons followed by an older non-empty rejection.
- `tests/listing/listing-card.test.tsx` — Covers null/blank current guidance with an older reason present in review history.
- `21-06-TASK-1-RED-EVIDENCE.json` — Validated real-database RED evidence for the sentinel collision.
- `21-06-TASK-2-RED-EVIDENCE.json` — Validated mutation RED evidence for prohibited historical fallback in the dialog.

## Decisions Made

- Used a private `Set<string>` keyed by listing ID so the first rejected row is consumed before reason normalization; the public DTO remains unchanged.
- Kept all selection authority in the server loader and nullable prop. The page and client dialog do not inspect older history for current guidance.

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

| Task | RED evidence | RED commit | GREEN result | Status |
|------|--------------|------------|--------------|--------|
| 1 | `21-06-TASK-1-RED-EVIDENCE.json` — both newest-null/blank cases returned the older sentence | `390acf0` | `1f2a361`; targeted suite 40/40 | PASS |
| 2 | `21-06-TASK-2-RED-EVIDENCE.json` — an intentional historical-fallback mutation made both dialog cases fail | `2eeab87` | Component restored byte-for-byte; targeted suite 40/40 | PASS |

Task 2 was deliberately test-only: its assertions passed against the shipped component, confirming the implementation was already correct. The test was then mutation-checked against the prohibited fallback, which failed intentionally, before the component was restored and the GREEN suite rerun.

## Verification

- `npm.cmd test -- tests/listing/review-history.test.ts tests/listing/listing-card.test.tsx` — **40 passed** across both files.
- Plan-local ESLint over the loader and both test files — **passed with no findings**.
- `git diff --exit-code da2232c4 -- src/lib/listing/re-review.ts` — **passed**, frozen helper unchanged.
- `git diff --check 390acf0^..HEAD` — **passed**.
- Scope inspection confirmed the owner/deleted predicates, ranked SQL order, six-row query bound, five-cycle projection, and host-safe DTO shape are unchanged.

## Known Stubs

None. No placeholder data, TODO, FIXME, skipped test, empty UI source, or mock-only production path was introduced.

## Issues Encountered

- Task 2's new tests passed immediately because the dialog already respected the nullable prop. A temporary, uncommitted historical-fallback mutation proved the assertions fail for the prohibited behavior; the component was restored before the test commit.

## Authentication Gates

None.

## User Setup Required

None. No environment variable, schema, migration, dependency, or external-service configuration changed.

## Next Phase Readiness

- LVER-06's sole verifier blocker is closed in both the real-database derivation and visible dialog path.
- Plan 21-07 can address the separate payout-action rejection warning without reopening listing history or deliberate resubmit semantics.
- Existing browser backstops in `21-VERIFICATION.md` remain human-verification evidence and were not recast by this source/jsdom gap closure.

## Self-Check: PASSED

- All five claimed implementation/test/evidence files exist.
- Task commits `390acf0`, `1f2a361`, and `2eeab87` exist in history.
- The persisted plan ledger measures three task commits from `51dad935b9e32db4b999fbb9c9d7c546b4824b5e` through Task 2.
- No deletion, dependency, schema, endpoint, threat-surface, or frozen-helper drift was found.

---
*Phase: 21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit*
*Completed: 2026-09-09*
