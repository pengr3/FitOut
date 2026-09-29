---
phase: 26-settlement-aware-host-payouts
plan: 04
subsystem: host-earnings
tags: [payouts, settlement, nextjs, court, postgres, tdd]
requires:
  - phase: 26-02
    provides: Friday noon Manila cohort, booking-specific settlement gate, and frozen payout claim
  - phase: 26-03
    provides: Exact terminal transfer read-back before Paid
provides:
  - Owner-scoped booking earnings before payout claim, replaced by frozen ledger rows at booking ID
  - Evidence-aware Court status, amounts, totals, and Friday timing
  - Neutral earnings route error recovery through Next 16.2.7 unstable_retry
affects: [26-05, 26-06, host-earnings, payout-verification]
plan_head_before: d73965c869e2f0147b7bcb32e136940c2d333514
actuals:
  tokens: 19243
  tasks: 2
  commits: 4
commits: 4
tech-stack:
  added: []
  patterns: [booking-first owner read, booking-ID projection merge, evidence-aware host status, route-local retry]
key-files:
  created: [src/app/(host)/host/earnings/error.tsx, tests/payments/earnings-ui.test.tsx]
  modified: [src/app/(host)/host/earnings/page.tsx, src/components/host/payout-ledger-status.ts, src/components/host/payout-row.tsx, src/components/host/payout-summary.tsx, src/components/host/payout-state-badge.tsx, tests/payments/earnings-view.test.ts]
key-decisions:
  - "An exact Friday requires fresh current deposited proof, explicit account Friday-policy validation, enabled payout setup, verified destination, and no host suspension."
  - "A booking's payout-kind ledger row replaces its estimate by booking ID; unknown estimates are excluded from pending totals."
  - "The shared development database was not migrated for the browser backstop; Phase 25.1 release remains HOLD."
patterns-established:
  - "Project owner-scoped booking rows once, then derive status, supported net, and timing without client money arithmetic."
requirements-completed: []
requirements-progressed: [HPAY-05]
coverage:
  - id: booking-earnings-projection
    description: Confirmed owner bookings show before claim and frozen payout rows replace estimates once
    requirement: HPAY-05
    verification:
      - kind: integration
        ref: tests/payments/earnings-view.test.ts
        status: pass
    human_judgment: false
  - id: court-earnings-states
    description: Court loading, error, status badges, and long-text rendering
    requirement: HPAY-05
    verification:
      - kind: automated_ui
        ref: tests/payments/earnings-ui.test.tsx
        status: pass
      - kind: e2e
        ref: e2e/overflow-320.spec.ts#/host/earnings · court
        status: unknown
    human_judgment: true
    rationale: The shared dev database lacks migration 0033, so the authenticated 320px route did not reach a populated earnings page.
duration: 26min
completed: 2026-09-29
status: complete
---

# Phase 26 Plan 04: Settlement-Aware Host Earnings Summary

Confirmed host bookings now appear in earnings before payout claim, with estimates replaced by frozen ledger amounts and Friday timing shown only from current settlement and account policy evidence.

## Performance

- **Started:** 2026-09-29T08:39:00Z
- **Completed:** 2026-09-29T09:05:00Z
- **Tasks:** 2
- **Production/test commits:** 4
- **Files changed:** 12

## Accomplishments

- Changed the earnings read to start from the signed-in host's listings and confirmed or retained bookings. The payout-kind ledger left join retains one row per booking, preserves frozen cents after claim, and orders equal booking timestamps by booking ID.
- Added server-side projected commission and host-debit offsets from the frozen space basis. An absent defensible amount reads `Amount being confirmed` and is omitted from pending totals; paid totals require terminal transfer evidence.
- Replaced the 24-hour payment expectation with the Friday-after-receipt explanation. Current deposited proof and validated host gates can yield a full-year Friday noon Manila label; a missing or returned current proof removes it.
- Added a route-local neutral error boundary using installed Next 16.2.7's `unstable_retry`. The existing loading shell keeps `PageHeader` and `RowListSkeleton` without totals or payout actions. Desktop table and mobile cards share status text and timing.

## Task Commits

1. **Task 1 RED:** `fdf6df09` — asserted the obsolete Held promise and missing preclaim projection.
2. **Task 1 GREEN:** `7818afb0` — owner-scoped booking-first earnings and evidence-aware amounts/status.
3. **Task 2 RED:** `4ec9acfa` — asserted the missing route-specific retry boundary.
4. **Task 2 GREEN:** `081dcdac` — Court retry/loading/status tests, Friday host-gate hardening, and updated copy guards.

## Verification

- `node node_modules/vitest/vitest.mjs run tests/payments/earnings-view.test.ts tests/payments/earnings-ui.test.tsx tests/payments/ledger-freeze.test.ts` — **26/26 passed** using isolated `fitout_test`; leak report clean.
- Focused design copy and error-boundary guards — **30/30 passed**.
- `node node_modules/typescript/bin/tsc --noEmit` — passed.
- Focused ESLint over earnings source and tests — passed.
- The existing Court 320px Playwright case was attempted. The route failed its SQL read because the shared development database has no `booking_settlement_current` table from migration 0033 (Postgres 42P01). The case timed out at its resolved-page marker and was stopped; its error-boundary rendering is not evidence for the five populated-page backstop truths. The shared database was left unchanged.

## TDD Gate Compliance

Both tasks have intentional assertion-failing RED runs before their GREEN implementation commits. The RED evidence records `26-04-red-task1.json` and `26-04-red-task2.json` each returned `RED_EVIDENCE_OK` from the runtime checker. No refactor commit was needed.

## Decisions Made

- Kept `HOST_FRIDAY_POLICY_VALIDATED=false` by default and required account evidence plus enabled setup, verified destination, and no suspension before displaying an exact Friday.
- Used ledger `paid` only when a transfer ID and paid instant are present. A held or processing claim never renders Paid.
- Left host booking-list/detail parity to Plan 26-05, which explicitly owns those routes and the old `No payout yet` cell.
- Kept HPAY-05 open at the requirement level until Plan 26-05 booking parity, publication, and the browser backstop are verified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Gate a dated Friday on the host's release readiness**
- **Found during:** Task 2 status review.
- **Issue:** Current settlement and account policy alone could date a Friday for a suspended host or unverified destination.
- **Fix:** Added enabled payout, verified destination, and non-suspension checks before passing Friday policy validation into the projection.
- **Files modified:** `src/app/(host)/host/earnings/page.tsx`, `.env.example`.
- **Verification:** TypeScript, focused earnings tests, design tests.
- **Committed in:** `081dcdac`.

**2. [Rule 3 - Blocking design gates] Rebaseline the approved Phase-26 earnings copy**
- **Found during:** Task 2 design test run.
- **Issue:** Earlier token-only and six-boundary guards intentionally rejected the approved new Friday copy and route-local boundary. The old freeze inventory also contained already drifted payout banner wording and omitted an existing payout destination form.
- **Fix:** Pinned the current earnings copy inventory and declared the route-local error boundary while keeping the global error-text disclosure scan. Updated the existing overflow route marker to `Pending earnings`.
- **Files modified:** `tests/design/earnings-freeze.test.ts`, `tests/design/error-boundaries.test.ts`, `e2e/overflow-320.spec.ts`.
- **Verification:** Focused design suite 30/30.
- **Committed in:** `081dcdac`.

## Browser Evidence Limit

The five Court 320px backstop truths remain unverified because the local shared development database is behind migration 0033. `.planning/WINDOWS.md` records this as an open `unrun-verify` entry. A future isolated or approved migrated fixture can rerun the existing `/host/earnings · court` case and inspect long labels, notices, totals, and controls at 320px. No provider call, transfer, or production release occurred.

## Requirement State

HPAY-05 remains pending. The SDK's requirement handler marked only its traceability cell complete while the requirement checkbox stayed open. Its scope also includes booking-list/detail parity, terms publication, and the browser backstop, so the traceability cell was restored to pending rather than claiming the wider requirement is complete from this plan.

## Known Stubs

None in the plan-owned implementation. The Friday-policy flag is deliberately false until account authority confirms the policy.

## Self-Check: PASSED

The source, tests, summary file, and all four task commits were confirmed present. The summary diff has no whitespace errors.
