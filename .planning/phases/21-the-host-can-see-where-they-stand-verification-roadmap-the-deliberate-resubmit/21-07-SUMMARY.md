---
phase: 21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit
plan: 07
subsystem: host-verification-roadmap
tags: [nextjs, react, server-actions, payout-onboarding, vitest, tdd]
requires:
  - phase: 21-01
    provides: server-derived host verification roadmap and existing payout action surface
  - phase: 21-05
    provides: responsive and accessible roadmap presentation contract
provides:
  - Rejected payout Server Action promises converted to bounded inline recovery feedback
  - Success-only navigation with resolved refusals preserved as authoritative inline feedback
  - Two-attempt retry proof covering stale-error clearing and current-result replacement
affects: [phase-21-verification, host-dashboard, payout-onboarding]
actuals:
  tokens: 2122
  tasks: 2
  commits: 5
plan_head_before: 5e72218aec5e1f66d4d754547de74749bc7baf4d
tech-stack:
  added: []
  patterns:
    - Local rejected-promise boundary around an independently authorized Server Action
    - Attempt-scoped inline feedback cleared before each transition
    - Mutation-validated RED evidence for behavior already present in production
key-files:
  created:
    - .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-07-TASK-1-RED-EVIDENCE.json
    - .planning/phases/21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit/21-07-TASK-2-RED-EVIDENCE.json
  modified:
    - src/components/host/verification-roadmap.tsx
    - tests/host/verification-roadmap.test.tsx
key-decisions:
  - "Only thrown or rejected payout action calls use the deterministic fallback; explicit resolved refusals retain their server-authored error text."
  - "Browser navigation remains inside the explicit result.ok success branch, while every failure stays in the roadmap."
  - "Each attempt clears prior feedback before entering the transition so a retry never presents a stale failure as current."
patterns-established:
  - "Async action recovery: catch transport/runtime rejection at the client transition boundary without duplicating server authorization or eligibility."
requirements-completed: [HVER-10]
coverage:
  - id: D1
    description: "Rejected payout onboarding promises remain inside the roadmap as deterministic, retryable inline feedback without browser navigation."
    requirement: HVER-10
    verification:
      - kind: unit
        ref: "tests/host/verification-roadmap.test.tsx#keeps a rejected payout action inline and available for retry without navigating"
        status: pass
    human_judgment: false
  - id: D2
    description: "A retry clears the stale fallback while pending and replaces it with the second attempt's authoritative resolved refusal, with one action call per click."
    requirement: HVER-10
    verification:
      - kind: unit
        ref: "tests/host/verification-roadmap.test.tsx#clears a stale rejection during retry and replaces it with the new refusal"
        status: pass
    human_judgment: false
duration: 15min
completed: 2026-09-10
status: complete
---

# Phase 21 Plan 07: Payout Onboarding Recovery Summary

**The host roadmap now catches unexpected payout-onboarding rejection, keeps the failure inline, and supports a clean retry whose current result replaces stale feedback.**

## Performance

- **Duration:** 15 minutes
- **Started:** 2026-09-09T16:00:43Z
- **Completed:** 2026-09-09T16:15:41Z
- **Tasks:** 2
- **Files modified:** 4 implementation, test, and RED-evidence files

## Accomplishments

- Added a local failure boundary around the existing payout Server Action so transport/runtime rejection renders the exact bounded fallback and never escapes the roadmap.
- Preserved the Server Action as the sole eligibility and authorization authority: only an explicit success navigates, while resolved refusals retain their server-authored message.
- Proved recovery across two attempts: the stale fallback clears during the pending retry, the second refusal becomes the sole message, no failure navigates, and two clicks produce exactly two calls.

## Task Commits

1. **Task 1 RED: rejected-promise recovery regression** — `1b45738` (test)
2. **Task 1 GREEN: local rejected-promise boundary** — `ae65a54` (feat)
3. **Task 2: mutation-validated retry replacement regression** — `6af53f3` (test)
4. **Task 2 test stability: await transition pending completion** — `9d52757` (test)
5. **Task 2 test stability: await stale-error clearing** — `47c1845` (test)

## Files Created/Modified

- `src/components/host/verification-roadmap.tsx` — Catches rejected payout action calls and maps them to the existing inline error surface.
- `tests/host/verification-roadmap.test.tsx` — Covers rejection containment, retry availability, stale-error clearing, resolved-refusal replacement, call counts, and no-navigation behavior.
- `21-07-TASK-1-RED-EVIDENCE.json` — Validated intentional RED for the escaping rejected promise.
- `21-07-TASK-2-RED-EVIDENCE.json` — Validated mutation RED for stale feedback when the attempt-start clear is removed.

## Decisions Made

- Kept the catch boundary inside the existing client transition and left `startPayoutOnboarding` unchanged, preserving its independent authentication, authorization, rate-limit, and provider orchestration.
- Returned immediately after explicit success navigation so neither a resolved success nor a thrown value can fall through into a refusal branch.
- Retained `setError(null)` before every attempt; current-attempt feedback is then supplied only by the resolved refusal or deterministic rejected-promise fallback.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced unavailable DOM matchers in the new rejection test**

- **Found during:** Task 1 GREEN verification
- **Issue:** This Vitest setup does not register the `toBeVisible` or `toBeEnabled` Chai extensions, so the newly present fallback reached an invalid matcher after production behavior was corrected.
- **Fix:** Used the suite's existing primitive DOM assertions for element presence and the disabled attribute.
- **Files modified:** `tests/host/verification-roadmap.test.tsx`
- **Verification:** Targeted roadmap suite passed 24/24 after the correction.
- **Committed in:** `ae65a54`

**2. [Rule 1 - Bug] Awaited React transition state before asserting retry availability and stale-error clearing**

- **Found during:** Overall verification after Task 2
- **Issue:** The fallback can render one scheduler tick before `useTransition` clears pending state, and a subsequent click's error clear can likewise flush asynchronously; immediate assertions were timing-sensitive.
- **Fix:** Wrapped both transition-boundary assertions in `waitFor` while preserving the mutation-sensitive behavioral checks.
- **Files modified:** `tests/host/verification-roadmap.test.tsx`
- **Verification:** The focused 25-test suite passed repeatedly and on the final run.
- **Committed in:** `9d52757`, `47c1845`

---

**Total deviations:** 2 auto-fixed (1 blocking test-harness mismatch, 1 test timing bug).
**Impact on plan:** Both fixes make the planned regression deterministic without changing the production contract or widening scope.

## TDD Gate Compliance

| Task | RED evidence | RED commit | GREEN result | Status |
|------|--------------|------------|--------------|--------|
| 1 | `21-07-TASK-1-RED-EVIDENCE.json` — rejection escaped, roadmap unmounted, fallback absent | `1b45738` | `ae65a54`; targeted suite 24/24 | PASS |
| 2 | `21-07-TASK-2-RED-EVIDENCE.json` — removing the attempt-start clear retained stale fallback during retry | `6af53f3` | Production restored byte-for-byte; targeted suite 25/25 | PASS |

Both evidence files returned `RED_EVIDENCE_OK` before their GREEN verification. Task 2 is deliberately test-only because the production `setError(null)` behavior already satisfied the planned contract; an uncommitted mutation proved the regression fails when that behavior is removed.

## Verification

- `npm.cmd test -- tests/host/verification-roadmap.test.tsx tests/host/verification-roadmap-state.test.ts` — **25 passed** across both files.
- `npm.cmd exec eslint -- src/components/host/verification-roadmap.tsx tests/host/verification-roadmap.test.tsx` — **passed with no findings**.
- Both TDD evidence records returned `RED_EVIDENCE_OK` from `gsd-tools check tdd-red-evidence`.
- `git diff --check 5e72218a..HEAD` — **passed** before summary creation.
- Scope inspection found no Server Action, authorization, eligibility, package, lockfile, schema, migration, route, or external-integration change.

## Known Stubs

None. No placeholder data, TODO, FIXME, skipped test, empty UI source, or mock-only production path was introduced.

## Issues Encountered

- Task 2's new test passed against the shipped `setError(null)` behavior. An intentional uncommitted mutation removing that line produced the required RED failure; the component was restored before the test commit and final suite.

## Authentication Gates

None.

## User Setup Required

None. No dependency, environment variable, schema, migration, endpoint, or external-service configuration changed.

## Next Phase Readiness

- WR-01's rejected-promise warning is closed with regression evidence, and HVER-10's payout action now has visible recovery for resolved refusals and rejected calls.
- Phase 21's remaining browser and judgment-tier backstops in `21-VERIFICATION.md` remain verifier/human evidence; this plan does not reclassify them.
- Phase 21 has no remaining gap plan after 21-07 and is ready for re-verification.

## Self-Check: PASSED

- Both modified source/test files and both RED-evidence files exist.
- Task commits `1b45738`, `ae65a54`, `6af53f3`, `9d52757`, and `47c1845` exist in history.
- The persisted ledger measures five task commits from `5e72218aec5e1f66d4d754547de74749bc7baf4d` through the final test-stability commit.
- No deletion, dependency, schema, endpoint, auth-authority, or threat-surface drift was found.

---
*Phase: 21-the-host-can-see-where-they-stand-verification-roadmap-the-deliberate-resubmit*
*Completed: 2026-09-10*
