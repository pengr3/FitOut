---
phase: 26-settlement-aware-host-payouts
plan: 05
subsystem: host-bookings
tags: [payouts, settlement, nextjs, court, postgres, tdd]
requires:
  - phase: 26-04
    provides: Evidence-aware host earnings projector and Friday timing gate
provides:
  - Owner-scoped booking list and detail payout views using the earnings status projector
  - Shared mobile, desktop, and detail payout cell with supported amount and timing
affects: [26-06, host-bookings, host-earnings, payout-verification]
plan_head_before: d5724a0e3f58cadf8fc090150c640c273d76dad0
actuals:
  tokens: 5493
  tasks: 2
  commits: 4
commits: 4
tech-stack:
  added: []
  patterns: [owner-scoped payout evidence read, shared earnings projection, server-rendered booking payout view]
key-files:
  created: [src/lib/host/booking-payout.ts]
  modified: [src/components/host/host-booking-row.tsx, src/app/(host)/host/bookings/page.tsx, src/app/(host)/host/bookings/[id]/page.tsx, tests/booking/host-booking-row.test.tsx, tests/payments/earnings-view.test.ts]
key-decisions:
  - "Confirmed bookings use the earnings projector before a payout ledger claim; null is reserved for bookings without host earnings."
  - "Friday dates require current settlement proof and the same account and host-readiness gates as earnings."
  - "HPAY-05 remains open until the separately gated legal publication and populated 320px browser check."
patterns-established:
  - "Keep payout status, supported amount, and timing together in one server-derived view for booking surfaces."
requirements-completed: []
requirements-progressed: [HPAY-05]
coverage:
  - id: host-booking-payout-parity
    description: Booking list, mobile card, and detail display the projected earnings state and amount
    requirement: HPAY-05
    verification:
      - kind: integration
        ref: tests/booking/host-booking-row.test.tsx
        status: pass
      - kind: integration
        ref: tests/payments/earnings-view.test.ts
        status: pass
      - kind: integration
        ref: tests/security/bookings-owner-scope.test.ts
        status: pass
    human_judgment: false
  - id: court-booking-payout-layout
    description: Long payout labels and timing remain readable in populated host booking routes at 320px
    requirement: HPAY-05
    verification:
      - kind: e2e
        ref: Court 320px authenticated host booking and earnings review
        status: unknown
    human_judgment: true
    rationale: The shared development database lacks migration 0033, so a populated authenticated browser check cannot complete against it.
duration: 14min
completed: 2026-09-29
status: complete
---

# Phase 26 Plan 05: Host Booking Payout Parity Summary

Confirmed host bookings now show the same evidence-derived payout state, supported amount, and timing in booking list, booking detail, and earnings.

## Performance

- **Started:** 2026-09-29T09:08:00Z
- **Completed:** 2026-09-29T09:22:00Z
- **Tasks:** 2
- **Production/test commits:** 4
- **Files changed:** 8, including two RED evidence records

## Accomplishments

- Added an owner-scoped booking payout read with payout-kind ledger and current correlated settlement proof. It passes the same account policy, destination, and suspension gates into `projectHostEarnings` as the earnings route.
- Replaced the confirmed-booking `No payout yet` contradiction with the shared status badge, projected or frozen amount, and evidence-supported timing in the desktop list, mobile card, and detail page. Bookings without host earnings retain the em dash.
- Added the Friday-after-receipt and at-least-24-hour-review explanation to the booking surfaces. The 24-hour period is presented as a review minimum, and exact Friday timing comes only from current proof.
- Preserved the booking owner gates, booking lifecycle badge, guest payment figure, cancellation flow, Court shell, and the separate legal publication gate.

## Task Commits

1. **Task 1 RED:** `c8b56622` — proved a confirmed preclaim booking still showed `No payout yet`.
2. **Task 1 GREEN:** `7e7a3a3d` — projected earnings into booking list and shared desktop/mobile cell.
3. **Task 2 RED:** `fc99224c` — proved detail still passed raw ledger state to the payout cell.
4. **Task 2 GREEN:** `bbd9ad05` — used the projected view on detail and added status/timing parity cases.

## Verification

- Booking component and owner-scope suites: **23/23 passed**.
- Booking component and earnings projection suites: **32/32 passed**.
- Focused Court design, legal-copy, and workflow guards: **80/80 passed** using `vitest.design.config.ts`.
- `node node_modules/typescript/bin/tsc --noEmit` — passed.
- Focused ESLint over six changed production/test files — passed.
- Both RED records returned `RED_EVIDENCE_OK` before their GREEN changes.

## Decisions Made

- A payout view is null only when the booking genuinely has no host earnings. A confirmed booking before claim receives the earnings projection.
- The booking surfaces use the earnings projector, including its `Paid` transfer proof and Friday proof rules. The booking route read is currently separate from the earnings route read, so changes to the evidence query must be kept aligned.
- HPAY-05 remains pending. This plan does not publish operative terms or authorize a live transfer.

## Deviations from Plan

None — the owner-scoped read and shared view were necessary parts of the planned booking projection.

## Browser Evidence Limit

The populated Court 320px check remains unrun because the shared development database lacks migration 0033, as recorded by Plan 26-04 in `.planning/WINDOWS.md`. This plan did not migrate that shared database for a screenshot. The responsive wrapping classes and render tests pass, but they do not substitute for a populated browser inspection. No provider call, transfer, or release occurred.

## Known Stubs

None introduced. The `No payout yet` em dash remains intentional for request or decline states without host earnings. Friday policy remains gated on account evidence.

## Threat Flags

None. The new read repeats the existing owner, payout-kind, and settlement proof scopes described in the plan threat model.

## Self-Check: PASSED

All six production/test files, this summary, and the four task commits were found. The persisted plan ledger measures four commits from `plan_head_before`.
