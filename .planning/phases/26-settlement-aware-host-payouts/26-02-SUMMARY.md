---
phase: 26-settlement-aware-host-payouts
plan: 02
subsystem: payments
tags: [paymongo, wallet, payouts, inngest, postgres, tdd]
requires:
  - phase: 26-01
    provides: Booking-specific settlement proof and current-proof reader
provides:
  - Friday noon Manila payout cohort with an exact 24-hour minimum hold
  - Fresh funded Wallet preflight with fee-aware serialized reservations
  - Durable transfer claim before provider dispatch and uncertain-response hold
affects: [26-03, 26-04, 26-06, 26-09]
plan_head_before: d1c9fb820687d91f781268437c850d6458341bd9
actuals:
  tokens: 22307
  tasks: 2
  commits: 4
commits: 4
tech-stack:
  added: []
  patterns: [Manila cohort window, booking-specific proof gate, Wallet-scoped advisory lock, durable pre-dispatch claim]
key-files:
  created: [tests/paymongo/wallet-funding.test.ts]
  modified: [src/inngest/functions/payout-sweep.ts, src/lib/payments/config.ts, src/lib/paymongo.ts, tests/payments/payout-sweep.test.ts, tests/payments/payout-suspension-freeze.test.ts, tests/payments/ledger-freeze.test.ts, tests/payments/host-cancel.test.ts, .env.example]
key-decisions:
  - "A booking enters a Friday cohort only when its own deposited proof was verified by noon; later re-verification refreshes that proof without changing its initial cohort qualification."
  - "A Wallet read must identify the configured account, mode, currency, available balance, and verified fee before a payout can claim funds."
  - "An uncertain provider response retains a durable held claim; it cannot be retried blindly after the idempotency key window."
patterns-established:
  - "Reserve available Wallet funds plus fees under a Wallet-scoped database lock before committing a transfer claim."
requirements-completed: [HPAY-02, HPAY-03, HPAY-04]
coverage:
  - id: friday-cohort
    description: Friday 12:00-23:00 Asia/Manila release window, exact hold, and noon-qualified settlement cohort
    requirement: HPAY-02
    verification:
      - kind: integration
        ref: tests/payments/payout-sweep.test.ts
        status: pass
    human_judgment: false
  - id: wallet-funding
    description: Fresh account-specific Wallet available balance and fee gate before transfer
    requirement: HPAY-03
    verification:
      - kind: unit
        ref: tests/paymongo/wallet-funding.test.ts
        status: pass
      - kind: integration
        ref: tests/payments/payout-sweep.test.ts
        status: pass
    human_judgment: true
    rationale: Live account mapping, fee evidence, and provider responses remain under the existing release HOLD and require controlled account verification.
  - id: preserved-protections
    description: Existing host, destination, cancellation, commission, and debit protections remain enforced
    requirement: HPAY-04
    verification:
      - kind: integration
        ref: tests/payments/payout-suspension-freeze.test.ts
        status: pass
      - kind: integration
        ref: tests/payments/ledger-freeze.test.ts
        status: pass
      - kind: integration
        ref: tests/payments/host-cancel.test.ts
        status: pass
    human_judgment: false
duration: 30min
completed: 2026-09-29
status: complete
---

# Phase 26 Plan 02: Settlement-aware host payout gate Summary

Friday Manila payouts now require a noon-qualified booking settlement proof and fresh Wallet funds sufficient for the transfer and verified fee.

## Performance

- **Duration:** About 30 minutes
- **Started:** 2026-09-29 07:38 UTC
- **Completed:** 2026-09-29 08:08 UTC
- **Tasks:** 2
- **Files changed:** 11, including two TDD evidence records

## Accomplishments

- Restricted both the cron and internal payout path to Friday 12:00-23:00 Asia/Manila, with an exact minimum 24-hour hold and booking-specific deposited proof verified by noon.
- Added a fresh PayMongo Wallet read and configured account/fee validation. Missing, stale, pending-only, or insufficient funds leave a booking unclaimed and pending.
- Serialized Wallet reservations, retained existing payout protection gates, and committed a durable claim before provider transfer creation. An uncertain provider result remains held for reconciliation.

## Task Commits

1. **Task 1 RED:** `88a953f6` — Friday cohort and settlement tests.
2. **Task 1 GREEN:** `5e409c46` — Friday window and settlement gate.
3. **Task 2 RED:** `e96b62df` — Wallet funding and race tests.
4. **Task 2 GREEN:** `9787e247` — Wallet preflight, reservation, and durable dispatch.

## Verification

- Focused Vitest gate: 6 files, 112 tests passed, using isolated `fitout_test` and mocked provider calls.
- `tsc --noEmit` passed.
- ESLint passed on changed production and test files.
- Both intentional RED runs were recorded and accepted by `gsd_run check tdd-red-evidence`.
- No live provider request or real transfer was made.

## Decisions Made

- Used the immutable first qualifying observation for noon cohort membership and the current proof timestamp for freshness. This permits safe Friday retries after the proof is refreshed.
- Kept Wallet account identity and fee evidence as explicit configuration requirements. The values remain unset until the existing production release HOLD is resolved.
- Retained uncertain transfer outcomes as held claims for reconciliation; repeated sweeps cannot issue another provider POST for that booking.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserve the noon cohort through settlement re-verification**
- **Found during:** Task 2 retry and concurrency tests.
- **Issue:** Using only the mutable current-proof verification time would eject a noon-qualified booking when its proof was refreshed in the afternoon.
- **Fix:** Compare the immutable first verified observation with noon while continuing to require fresh current proof.
- **Files modified:** `src/inngest/functions/payout-sweep.ts`, `tests/payments/payout-sweep.test.ts`.
- **Verification:** Focused Vitest gate.
- **Committed in:** `9787e247`.

**2. [Rule 2 - Missing critical functionality] Hold uncertain provider outcomes**
- **Found during:** Task 2 transfer dispatch.
- **Issue:** Treating a timed-out or ambiguous POST as an ordinary failure could issue a second transfer after the provider idempotency window.
- **Fix:** Persist the claim before POST and retain an uncertain claim for reconciliation instead of auto-retrying.
- **Files modified:** `src/inngest/functions/payout-sweep.ts`, `tests/payments/payout-sweep.test.ts`.
- **Verification:** Focused Vitest gate.
- **Committed in:** `9787e247`.

## Release Boundary

Phase 25.1 and PayMongo account mapping remain HOLD. The Wallet ID, merchant organization, platform Wallet identity, and verified fee must be established through controlled account evidence before live payout enablement. The tests used mocks and isolated database state only.

## Self-Check: PASSED

The summary file exists, all four task commits resolve, and the plan diff passes `git diff --check`.
