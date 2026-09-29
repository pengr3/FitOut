---
phase: "26"
slug: "settlement-aware-host-payouts"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-29"
---

# Phase 26 — Validation Strategy

> Per-phase validation contract. Reconcile provisional task rows with the final PLAN.md files before execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest for unit, integration, and component tests; Playwright for browser flows |
| **Config file** | `vitest.config.ts`; `playwright.config.ts` for browser flows |
| **Quick run command** | `node node_modules/vitest/vitest.mjs run tests/payments/payout-sweep.test.ts tests/payments/payout-reconcile.test.ts` |
| **Full relevant suite command** | `node node_modules/vitest/vitest.mjs run tests/payments tests/paymongo tests/host tests/ops` |
| **Prerequisite** | Isolated `fitout_test` database prepared by `scripts/db-test-setup.ts`; never point tests at a live or development database |
| **Estimated runtime** | Measure on the target machine before setting a feedback budget; the database and full suite were not run during planning |

## Sampling Rate

- **After each implementation task:** Run the smallest affected test file, plus typecheck when TypeScript changed.
- **After every plan wave:** Run the relevant payment, PayMongo, host, and ops suites above after isolated database setup.
- **Before `$gsd-verify-work`:** Run the full project test and static checks, then separately review the account-specific proof and release decision.
- **Max feedback latency:** To be measured from the first execution wave; split the suite by changed area if the full relevant run is slow.

## Per-Task Verification Map

Plan and wave IDs remain provisional until PLAN.md files exist. Every implementation task must gain an `<automated>` check or an explicit Wave 0 dependency.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | HPAY-01 | Settlement spoofing/mis-correlation | Exact payment, payout, status, destination, pagination, freshness, and reversal checks fail closed | integration | `node node_modules/vitest/vitest.mjs run tests/payments/settlement-proof.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | HPAY-02 | Off-window transfer | Manila Friday noon cohort and 23:00 retry boundary; no other-day dispatch | integration | `node node_modules/vitest/vitest.mjs run tests/payments/payout-sweep.test.ts` | ✅ | ⬜ pending |
| TBD | TBD | TBD | HPAY-03 | Unfunded transfer | Unknown or insufficient available Wallet funds, including fee and concurrent claims, block transfer | integration | `node node_modules/vitest/vitest.mjs run tests/payments/payout-sweep.test.ts` | ✅ | ⬜ pending |
| TBD | TBD | TBD | HPAY-04 | Duplicate or excess transfer | Claim, uncertain-outcome read-back, frozen commission, debit/refund netting, and terminal reconciliation remain intact | integration | `node node_modules/vitest/vitest.mjs run tests/payments/payout-sweep.test.ts tests/payments/payout-reconcile.test.ts tests/payments/ledger-freeze.test.ts tests/payments/cancellation.test.ts` | ✅ | ⬜ pending |
| TBD | TBD | TBD | HPAY-05 | Cross-host disclosure/false promise | Preclaim earnings are owner-scoped and labels/dates match actual evidence and transfer state | integration/component | `node node_modules/vitest/vitest.mjs run tests/payments/earnings-view.test.ts` | ✅ | ⬜ pending |
| TBD | TBD | TBD | HPAY-06 | Unowned money exception | Missing/returned settlement, missed cutoff, insufficient funds, and failed/stuck transfer yield durable actionable alert without sensitive data | integration | `node node_modules/vitest/vitest.mjs run tests/ops/alerts.test.ts tests/ops/alert-digest.test.ts` | ✅ | ⬜ pending |
| TBD | TBD | TBD | HPAY-07 | Unauthorized release | Code cannot change HOLD or authorize live money movement; proof packet names authority and redacted observations | static contract | `node node_modules/vitest/vitest.mjs run tests/paymongo/preview-environment.test.ts` | ✅ | ⬜ pending |

## Wave 0 Requirements

- [ ] Add `tests/payments/settlement-proof.test.ts` with provider payout and transaction-list fixtures, including incomplete pagination and returned/out-of-order observations.
- [ ] Extend payout sweep fixtures for Manila time boundaries, Wallet balance and transfer fee, concurrent bookings, and uncertain provider outcomes after the documented 24-hour idempotency window.
- [ ] Extend earnings and ops tests for owner-scoped preclaim rows, supported schedule labels, durable exceptions, and redaction.
- [ ] Measure quick and full relevant suite runtimes after isolated database setup, then replace the provisional latency entry above.
- [ ] Reconcile this table's task IDs and commands with the final plans; do not leave a missing test file as a green verification step.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual merchant settlement weekday, verified Wallet destination, payout-transaction field mapping and pagination, available-balance access, transfer fee | HPAY-01, HPAY-03, HPAY-07 | Account-specific capabilities and settings cannot be inferred from docs or fixtures | Account authority records redacted observations; any inaccessible or contradictory field retains HOLD. |
| Controlled settlement-to-host-transfer proof with terminal read-back and operator alert ownership | HPAY-06, HPAY-07 | Requires explicit joint authorization under Phase 25.1 HOLD | Only after authorization, use a capped controlled transaction, reconcile exactly one transfer, exercise stop/return and alerts, and record a release decision. |
| Host-facing Friday copy and contractual wording | HPAY-05 | A human must approve the promise and review rendered copy | Product and legal owners inspect earnings, payment copy, and terms at mobile and desktop widths; unresolved terms publication retains HOLD. |

## Validation Sign-Off

- [ ] Every plan task has an automated check or Wave 0 dependency.
- [ ] No three consecutive implementation tasks lack automated verification.
- [ ] All missing test references above are created before their first use.
- [ ] Commands run once and exit; no watch-mode flags.
- [ ] Feedback latency has been measured and a practical limit recorded.
- [ ] `nyquist_compliant: true` is set only after validation against the completed plans.

**Approval:** pending
