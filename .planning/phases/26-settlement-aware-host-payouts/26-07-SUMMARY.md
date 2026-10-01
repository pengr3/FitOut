---
phase: 26-settlement-aware-host-payouts
plan: 07
subsystem: legal-publication
tags: [host-payouts, terms, settlement, publication-gate]
requires:
  - phase: 26-06
    provides: Friday cutoff exceptions and payout recovery visibility
  - phase: 25.1-paymongo-production-release-readiness-controlled-proofs
    provides: Recorded production money-movement HOLD
provides:
  - Exact candidate Friday-after-receipt host payout clause for product and legal review
  - Explicit nonbinding publication gate, approval fields, comparison, and correction path with HOLD disposition
affects: [26-08, 26-09, HPAY-05, HPAY-07, terms-publication]
plan_head_before: bd380b9b44dda7b8124ebfe7748467dc504de1ab
actuals:
  tokens: 2516
  tasks: 2
  commits: 2
commits: 2
tech-stack:
  added: []
  patterns: [human-approved-publication-decision, source-gated-nonbinding-terms]
key-files:
  created: [.planning/phases/26-settlement-aware-host-payouts/26-LEGAL-PUBLICATION-DECISION.md]
  modified: []
key-decisions:
  - "HOLD remains the legal publication disposition until named product and legal owners approve the exact full agreement, effective cohort, publication action, and correction owner."
  - "The candidate Friday clause separates payout eligibility, transfer dispatch, and bank arrival; a missed Friday cutoff enters the next consideration cycle without a payment guarantee."
  - "Phase 25.1 production money-movement HOLD is independent of this terms proposal and passing source tests."
patterns-established:
  - "Keep a reviewable contract candidate outside the public route until a separately authorized one-way publication change."
requirements-completed: []
requirements-progressed: [HPAY-05, HPAY-07]
coverage:
  - id: proposed-payout-clause
    description: Reviewable Friday-after-receipt clause, promise comparison, and approval/correction record
    requirement: HPAY-05
    verification:
      - kind: other
        ref: node -e legal proposal fields present
        status: pass
    human_judgment: true
    rationale: Product and counsel must approve exact operative wording and effective cohort before publication.
  - id: nonbinding-terms-gate
    description: Current terms route remains a nonbinding outline under the legal-copy source gate
    requirement: HPAY-07
    verification:
      - kind: unit
        ref: tests/design/legal-copy.test.ts (22 cases)
        status: pass
    human_judgment: false
  - id: publication-hold
    description: No product or legal approval, publication, effective date, or money-movement authority is inferred
    requirement: HPAY-07
    verification:
      - kind: manual_procedural
        ref: Named product and legal decision on final agreement, date, owner, and correction path
        status: unknown
    human_judgment: true
    rationale: Authority to publish binding terms and release money cannot be inferred from source or tests.
duration: 5min
completed: 2026-09-29
status: complete
---

# Phase 26 Plan 07: Legal Publication Decision Summary

**A concrete Friday-after-receipt host payout clause and correction procedure are ready for review while `/terms` remains nonbinding and publication stays HOLD.**

## Performance

- **Started:** 2026-09-29T10:00:55Z
- **Completed:** 2026-09-29T10:05:00Z
- **Tasks:** 2
- **Files created:** 1 decision packet; this summary is execution metadata

## Accomplishments

- Drafted an exact candidate clause covering Friday 12:00 Asia/Manila eligibility, hourly retries through 23:00, a minimum 24-hour review hold, booking-specific deposited settlement, missed-cutoff treatment, no promised off-cycle transfer, and separate transfer/bank-arrival events.
- Compared the former prelaunch 24-hour promise with the proposed timing rule and recorded missing product/legal approvers, exact final wording, publication owner, effective cohort, refund/cancellation cross-reference, and correction owner as HOLD.
- Confirmed the present `/terms` page still states it is not binding and Phase 25.1's money-movement HOLD remains independent. The legal-copy test passed 22 cases.

## Task Commits

1. **Task 1: Reviewable terms clause** — `e7698116` (`docs`)
2. **Task 2: Publication and correction gate** — `e0889e9f` (`docs`)

## Decisions Made

- HOLD is the recorded publication outcome; PM timing choices are design input, not product/legal approval of contract wording.
- The next Friday is a consideration cycle when the cutoff is missed or a transfer is blocked; no unconditional host payment or bank-arrival deadline is created.
- A later authorized terms replacement must preserve the separate privacy-page protection while updating the terms-specific legal-copy gate in the same reviewed change.

## Verification

- Required legal proposal field check: **passed**.
- Legal packet HOLD/product/legal/nonbinding field check: **passed**.
- `node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts tests/design/legal-copy.test.ts`: **1 file, 22 cases passed**.
- `git diff --check` for the packet: **passed**.
- No public terms code, production migration, provider action, transfer, or release was performed.

## Deviations from Plan

None. The packet includes limited official-source review to keep refund wording and provider capability uncertainty visible; it does not decide legal sufficiency or account entitlement.

## Issues Encountered

The sandbox denied the prescribed ledger write inside `.git`. A temporary ledger in the writable phase directory preserved the pre-plan HEAD for the measured two-task commit count; it is removed at close-out. The shared checkout already contained unrelated dirty files, which were left unstaged.

## Next Phase Readiness

Plan 26-08 can consume the candidate and HOLD record. Publication is blocked until named product and legal authorities approve one exact complete agreement, effective date and booking cohort, publication owner/action, refund/cancellation cross-reference, host notice, and correction owner. HPAY-05 and HPAY-07 remain pending. Phase 25.1 production money movement remains HOLD.

## Self-Check: PASSED

The decision packet and summary exist; both task commit objects exist; the persisted pre-plan base measures two task commits at summary creation.
