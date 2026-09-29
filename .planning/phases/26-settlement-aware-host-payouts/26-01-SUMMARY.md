---
phase: 26-settlement-aware-host-payouts
plan: 01
subsystem: payments
tags: [paymongo, settlement, postgres, inngest, tdd]
requires:
  - phase: 25.1-paymongo-production-release-readiness-controlled-proofs
    provides: controlled payment release HOLD and account-evidence gates
provides:
  - append-only booking settlement observations and current proof projection
  - bounded, read-only provider payout reconciliation with fail-closed account mapping
affects: [26-02, 26-03, 26-04, 26-06, 26-09]
plan_head_before: e062ea6904ae3df547501ed967b681c8c1e45ca1
actuals:
  tokens: 11405
  tasks: 2
  commits: 4
tech-stack:
  added: []
  patterns: [append-only provider observations, monotonic current projection, injected provider reader]
key-files:
  created: [drizzle/0033_booking_settlement_observation.sql, src/lib/payments/settlement.ts, src/inngest/functions/settlement-reconcile.ts, tests/payments/settlement-proof.test.ts, .planning/phases/26-settlement-aware-host-payouts/26-01-RED-EVIDENCE.json]
  modified: [.env.example, drizzle/meta/_journal.json, src/lib/db/schema.ts, src/lib/paymongo.ts, src/app/api/inngest/route.ts]
key-decisions:
  - "Keep account-specific payment-field and Wallet destination mapping on HOLD until account-authority evidence is supplied."
  - "Re-read payout detail after complete transaction pagination and let later returns revoke deposited proof."
  - "Store immutable observations separately from a current projection so repeated reads do not multiply history."
requirements-completed: []
coverage:
  - id: settlement-proof
    description: Booking-linked deposited proof, revocation, and idempotent history
    requirement: HPAY-01
    verification:
      - kind: integration
        ref: "node node_modules/vitest/vitest.mjs run tests/payments/settlement-proof.test.ts tests/payments/payout-reconcile.test.ts"
        status: pass
    human_judgment: true
    rationale: Live account payment-field and destination authority remain unverified.
  - id: provider-refresh
    description: Bounded provider GET reconciliation with no money movement
    requirement: HPAY-01
    verification:
      - kind: unit
        ref: "tests/payments/settlement-proof.test.ts"
        status: pass
    human_judgment: true
    rationale: Fixture validation does not prove account-specific provider response fields.
duration: 47min
completed: 2026-09-29
status: complete
---

# Phase 26 Plan 01: Booking Settlement Proof Summary

Booking-level settlement evidence now persists as append-only observations with a current proof, and a read-only reconciler refreshes it from complete payout reads while account-specific mapping remains on HOLD.

## Performance

- **Started:** 2026-09-29T06:47:41Z
- **Completed:** 2026-09-29T07:34:36Z
- **Tasks:** 2
- **Production/test commits:** 4
- **Files changed:** 9

## Accomplishments

- Added migration 0033 with restrictive booking and payment links, immutable provider observations, and a separate current projection. Existing bookings receive no inferred settlement or payout-state backfill.
- Correlated exact captured payment, complete transaction pages, deposited payout status, verified Wallet destination, mode, organization, and currency. Later returned observations revoke current eligibility without erasing history.
- Added bounded payout list/detail/transaction GET reads and a non-dispatching Inngest refresh. Exceptions are durable but contain no raw provider payload or Wallet account identifiers.
- Kept account payment-field and Wallet mapping unconfigured by default. No live provider call, production migration, or transfer was made.

## Task Commits

1. **Task 1 RED:** `37c0b8c1` — define fail-first settlement proof cases.
2. **Task 1 GREEN:** `d58f08a9` — persist booking settlement observations and current proof.
3. **Task 2 RED:** `50ca19f5` — define fail-first provider payout refresh cases.
4. **Task 2 GREEN:** `4d806df7` — refresh settlement from complete provider payout reads.

## Verification

- Isolated `fitout_test` database setup and migration replay: passed.
- Focused Vitest files: **25/25 tests passed**; database leak report clean.
- `tsc --noEmit`: passed.
- Focused ESLint over payment, reconciler, route, tests, and schema: passed.
- `git diff --cached --check` before each task commit: passed.

## TDD Gate Compliance

Both tasks have test-only RED commits before production GREEN commits. Task 1's intentional RED is preserved in `26-01-RED-EVIDENCE.json`: `isCorrelatedSettlement` returned false when the exact deposited fixture expected true. Task 2's RED was observed against the stub refresh implementation. The GSD `tdd-red-evidence` helper reported `INVALID_RED` because it expects flat `node --test` TAP footer syntax and did not parse Vitest's nested TAP; the assertion failure and nonzero test exit were observed directly. All final focused tests pass.

## Decisions Made

- Account-specific transaction payment-field mapping and Wallet destination are release premises. Without authority evidence, refresh remains HOLD and cannot prove settlement.
- Current status uses monotonic observation ordering, so a stale deposited response cannot restore proof after a later return.
- The refresh schedule only reads provider data and records observations; it never initiates transfers.

## Deviations from Plan

- **Rule 2 — current projection:** The single additive migration includes a mutable current pointer alongside immutable observations. This prevents repeated reads from multiplying audit rows and permits freshness updates without changing history. Verified by isolated database tests; committed in `d58f08a9`.
- **Rule 3 — test database access:** Local Docker access required an escalated Docker command. Isolated setup and tests then passed; no production database was touched.

## Release Boundary

HPAY-01's code path is implemented, but live account field mapping and Wallet authority are unverified. HPAY-07 remains open. Phase 25.1's HOLD and joint product, account, and money-operations approval remain in force. Friday dispatch, balance preflight, and live controlled payout proof are later plans.

## Self-Check: PASSED

The migration, implementation, fixture test, RED evidence, and all four task commits were confirmed present before this summary was committed.
