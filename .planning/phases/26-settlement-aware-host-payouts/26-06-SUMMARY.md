---
phase: 26-settlement-aware-host-payouts
plan: 06
subsystem: payments-operations
tags: [payouts, settlement, postgres, inngest, ops-alerts, tdd]
requires:
  - phase: 26-03
    provides: Friday Wallet-funded payout sweep and guarded claim
  - phase: 26-05
    provides: Shared host booking and earnings payout projection
provides:
  - Deterministic durable payout exceptions with safe cause, booking reference, cohort, next action, and observation history
  - Friday 23:00 cutoff detection with prompt event delivery, 23:10 fallback, and daily unresolved digest
  - Owner-scoped host Needs attention category and local operator payout queue, booking lookup, and asserted resolve path
affects: [26-07, 26-08, 26-09, payout-release-readiness]
plan_head_before: 519deb16c2931bf9093d99a1579c27153b8d89a8
actuals:
  tokens: 7741
  tasks: 2
  commits: 4
commits: 4
tech-stack:
  added: []
  patterns: [deterministic audit primary key, redacted booking reference, safe public category, event plus cron fallback]
key-files:
  created: [src/lib/payments/payout-exceptions.ts, tests/payments/payout-attention.test.ts]
  modified: [src/inngest/functions/payout-sweep.ts, src/inngest/functions/payout-reconcile.ts, src/inngest/functions/settlement-reconcile.ts, src/inngest/functions/ops-alert-digest.ts, src/app/(host)/host/earnings/page.tsx, src/lib/host/booking-payout.ts, src/components/host/payout-ledger-status.ts, scripts/ops-alerts.ts, .planning/ops/NEEDS-ATTENTION-RUNBOOK.md]
key-decisions:
  - "Audit primary-key conflict is the concurrency guard for one booking/cause/Friday cohort; resolving a row cannot be undone by worker replay."
  - "Email carries only existing safe audit fields, while the local payout queue derives fixed cause and next action from allowlisted codes."
  - "Delivery status records an attempt, not acknowledgement; the CLI resolver name remains asserted provenance, and release stays HOLD pending named monitored-owner evidence."
patterns-established:
  - "Money workers write a fixed cause through recordMoneyException and fail loudly if durable storage fails."
requirements-completed: []
requirements-progressed: [HPAY-06, HPAY-05]
coverage:
  - id: payout-exception-persistence
    description: Blocked settlement, Wallet, transfer, and missed-cutoff outcomes produce replay-safe unresolved rows
    requirement: HPAY-06
    verification:
      - kind: integration
        ref: tests/ops/alerts.test.ts and tests/payments/payout-sweep.test.ts
        status: pass
    human_judgment: false
  - id: payout-alert-delivery
    description: Prompt Friday cutoff event and fallback send a bounded redacted digest, retaining unresolved rows on failed delivery
    requirement: HPAY-06
    verification:
      - kind: integration
        ref: tests/ops/alert-digest.test.ts
        status: pass
      - kind: manual_procedural
        ref: Named monitored money-operations owner, controlled receipt, and acknowledgement
        status: unknown
    human_judgment: true
    rationale: A fixture email and configured address cannot prove a monitored owner or live receipt.
  - id: host-safe-payout-attention
    description: Host booking and earnings projections show only Needs attention and neutral copy for unresolved exceptions
    requirement: HPAY-05
    verification:
      - kind: unit
        ref: tests/payments/payout-attention.test.ts
        status: pass
    human_judgment: false
duration: 25min
completed: 2026-09-29
status: complete
---

# Phase 26 Plan 06: Durable Payout Exceptions and Alert Delivery Summary

Blocked Friday payouts now leave one durable, actionable audit row per booking, cause, and Friday cohort. The cutoff pass reaches money operations promptly, while hosts see only a safe attention state.

## Performance

- Started: 2026-09-29T09:28:11Z
- Completed: 2026-09-29T09:53:00Z
- Tasks: 2
- Production and RED commits: 4
- Changed files: 19

## Accomplishments

- Replaced the race-prone `WHERE NOT EXISTS` alert writer with a deterministic audit id and `ON CONFLICT` update guarded by `resolved_at IS NULL`. Metadata contains a hashed booking reference, fixed cause, first and last observations, Friday cohort, and next action. No provider payload, Wallet balance, or account detail is stored.
- Settlement return and read errors, unavailable or insufficient Wallet funding, missing payout basis, failed or stuck transfers, unknown read-back, and the final Friday unpaid cohort now write durable exceptions. A booking not yet eligible for Friday noon is excluded from the missed-cutoff pass. Waiting bookings do not gain a false failed-transfer ledger state.
- The sweep emits a cutoff alert event after recording exceptions. The existing digest handles that event, retries unsent cutoff rows at 23:10 Manila, and retains its daily 08:50 unresolved run. Email remains capped at 200 with an honest truncation notice and no audit metadata. Attempts are marked `attempting`, `sent`, `failed`, or `no_recipient` without resolving the row.
- Added a complete local payout exception queue with fixed cause, next action, redacted booking reference, and local booking lookup. Earnings and booking views read an owner-scoped boolean and render only `Needs attention` with approved neutral copy; a host payout-details link appears only when destination setup actually requires action.

## Task Commits

1. Task 1 RED: `70a89fc5` — concurrent exception persistence assertion.
2. Task 1 GREEN: `9e745712` — durable money-path exceptions and Friday cutoff pass.
3. Task 2 RED: `2abf68c7` — prompt delivery and safe host state assertions.
4. Task 2 GREEN: `31305c4b` — digest, operator queue, and owner-scoped host state.

## Verification

- Focused payment, settlement, ops, earnings, and booking suites: **137/137 passed** across eight files. No live provider call or transfer was made.
- `node node_modules/typescript/bin/tsc --noEmit` — passed.
- Focused ESLint over changed implementation and tests — passed.
- Both RED evidence records returned `RED_EVIDENCE_OK`; their target assertions failed before the corresponding implementation.
- Self-check confirmed the new source, tests, RED evidence records, and all four commits exist. No tracked file was deleted.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 1 - Bug] Cron start latency at the final minute.** The public Friday window intentionally ends at exact 23:00:00. An Inngest invocation a few milliseconds later would skip its own final pass. The handler now normalizes an invocation during the 23:00 minute to the scheduled instant before due selection, without widening the public dispatch window. Verified by the existing Friday boundary cases and the cutoff integration test. Commit: `9e745712`.
2. **[Rule 2 - Missing critical functionality] Local recovery from a redacted reference.** A hash-only audit row was safe to email but could not identify the booking to an operator. Added a local-only booking lookup, complete payout exception queue, and runbook procedure. Commit: `31305c4b`.
3. **[Rule 2 - Missing critical functionality] Booking surface parity.** The plan named earnings, but booking list/detail share the payout projector and would otherwise contradict earnings after an exception. The owner-scoped attention read now feeds both. Commit: `31305c4b`.

## Release Boundary

Phase 25.1 and payout release remain **HOLD**. The monitored `OPS_ALERT_EMAIL` recipient, named money-operations owner, controlled receipt/triage/acknowledgement, settlement mapping, Wallet funding, and exactly-one terminal transfer still require account-authority evidence in the release plan. `resolved_by` is asserted CLI provenance, not authenticated identity. No production provider call, real transfer, or release was attempted.

## Self-Check: PASSED

The created files and commits named above exist; required automated checks passed. No known stubs, skipped tests, or unrun plan verification remain. The controlled owner/account proof is an explicit release gate, not a stub in this plan.
