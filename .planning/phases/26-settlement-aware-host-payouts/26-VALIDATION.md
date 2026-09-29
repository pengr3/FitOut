---
phase: "26"
slug: "settlement-aware-host-payouts"
status: in_progress
nyquist_compliant: false
wave_0_complete: true
created: "2026-09-29"
---

# Phase 26 — Validation Strategy

> Current local validation record. Account and publication checkpoints remain HOLD.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest for unit, integration, and component tests; Playwright for browser flows |
| **Config file** | `vitest.config.ts`; `playwright.config.ts` for browser flows |
| **Quick run command** | `node node_modules/vitest/vitest.mjs run tests/payments/payout-sweep.test.ts tests/payments/payout-reconcile.test.ts` |
| **Full relevant suite command** | `node node_modules/vitest/vitest.mjs run tests/payments tests/paymongo tests/host tests/ops` |
| **Prerequisite** | Isolated `fitout_test` database prepared by `scripts/db-test-setup.ts`; never point tests at a live or development database |
| **Measured runtime** | Full relevant money suite: 74.66 s (63 passed files, 758 passed tests); full project suite: 346.59 s (six failures, described below) |

## Sampling Rate

- **After each implementation task:** Run the smallest affected test file, plus typecheck when TypeScript changed.
- **After every plan wave:** Run the relevant payment, PayMongo, host, and ops suites above after isolated database setup.
- **Before `$gsd-verify-work`:** Run the full project test and static checks, then separately review the account-specific proof and release decision.
- **Max feedback latency:** Use focused files after an edit (the payout booking fixture ran in 2.81 s); allow about 90 s for the relevant money suite and about 6 minutes for the full project suite on this machine.

## Per-Task Verification Map

The final plans supply these task and wave IDs. Passing local fixtures verifies code behavior, not account entitlement or live money movement.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-1/2 | 26-01 | 1 | HPAY-01 | Settlement spoofing/mis-correlation | Exact payment, payout, status, destination, pagination, freshness, and reversal checks fail closed | integration | `tests/payments/settlement-proof.test.ts` | ✅ | ✅ local; account fields HOLD |
| 02-1/2 | 26-02 | 2 | HPAY-02/03 | Off-window or unfunded transfer | Manila Friday cohort and fee-inclusive Wallet availability gate | integration | `tests/payments/payout-sweep.test.ts`, `tests/paymongo/wallet-funding.test.ts` | ✅ | ✅ local; account funding HOLD |
| 03-1/2 | 26-03 | 3 | HPAY-04 | Duplicate or excess transfer | Claim, uncertain read-back, frozen money and terminal reconciliation | integration | `tests/payments/payout-sweep.test.ts`, `tests/payments/payout-reconcile.test.ts`, `tests/payments/ledger-freeze.test.ts` | ✅ | ✅ local; second-attempt resend HOLD |
| 04/05 | 26-04/05 | 3/4 | HPAY-05 | Cross-host disclosure or false promise | Owner-scoped preclaim earnings and booking projection | integration/design | `tests/payments/earnings-view.test.ts`, `tests/design/legal-copy.test.ts` | ✅ | ✅ local; operative terms HOLD |
| 06-1/2 | 26-06 | 5 | HPAY-06 | Unowned money exception | Durable, redacted payout alert and owner-scoped attention | integration | `tests/ops/alerts.test.ts`, `tests/ops/alert-digest.test.ts`, `tests/payments/payout-attention.test.ts` | ✅ | ✅ local; monitored owner HOLD |
| 07/08/09 | 26-07/08/09 | 6/7 | HPAY-07 | Unauthorized release | HOLD packets, guarded placeholder and bounded proof template | static/design | `tests/paymongo/preview-environment.test.ts`, `tests/design/legal-copy.test.ts`, account packet field check | ✅ | ✅ local; human checkpoints HOLD |

## Wave 0 Requirements

- [x] Settlement proof fixtures include incomplete pagination and returned/out-of-order observations.
- [x] Payout sweep fixtures cover Friday boundaries, Wallet and fee, concurrency, and lost responses after key expiry.
- [x] Earnings and ops fixtures cover owner scope, status labels, durable exceptions, and redaction.
- [x] Quick, relevant, and full project suite runtimes measured against the isolated test database.
- [x] Task IDs, waves, commands, and existing files reconciled with final plans.

## Full project gate — 2026-09-29

The full `vitest run` finished with 245 files passing, 2 skipped and 4 failing; 3,081 tests passed, 5 skipped and 6 failed. One failed booking test still assumed that a confirmed booking without settlement proof was due and that dispatch immediately meant Paid. Its fixture now supplies exact deposited proof, Friday time and a funded Wallet, and expects Processing; its focused rerun passed 11/11. The other five failures are in `tests/auth/public-origin-callers.test.ts`, `tests/availability/slot-picker-end-boundary.test.tsx`, and `tests/validation/listing-schema.test.ts`, outside the Phase 26 payout change. The full run also reported two escaped `public.audit` rows (`guest-email`, `notify`) in the dedicated test database; this is an isolation gap to fix before a full-suite PASS claim. Do not report the full suite as green from the focused rerun.

The full design run had 19 failures in 12 files. Follow-up payout-specific repairs made `brand-recipe`, `host-tone-census`, and `status-vocab` pass. `loading-coverage` now recognizes the async payout setup page and its loading file, but its remaining failure names unrelated dimensions in `src/app/(public)/loading.tsx`. Other full design failures include search, email, ops-panel and source-inventory changes outside this payout slice. TypeScript passed; repository-wide ESLint exited 0 with 33 warnings and no errors. Rerun the full gates after the other work in this shared checkout is settled.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual merchant settlement weekday, verified Wallet destination, payout-transaction field mapping and pagination, available-balance access, transfer fee | HPAY-01, HPAY-03, HPAY-07 | Account-specific capabilities and settings cannot be inferred from docs or fixtures | Account authority records redacted observations; any inaccessible or contradictory field retains HOLD. |
| Controlled settlement-to-host-transfer proof with terminal read-back and operator alert ownership | HPAY-06, HPAY-07 | Requires explicit joint authorization under Phase 25.1 HOLD | Only after authorization, use a capped controlled transaction, reconcile exactly one transfer, exercise stop/return and alerts, and record a release decision. |
| Host-facing Friday copy and contractual wording | HPAY-05 | A human must approve the promise and review rendered copy | Product and legal owners inspect earnings, payment copy, and terms at mobile and desktop widths; unresolved terms publication retains HOLD. |

## Validation Sign-Off

- [x] Every automated implementation task has a test or an explicit external evidence gate.
- [x] No three consecutive implementation tasks lack automated verification.
- [x] All referenced test files exist.
- [x] Commands run once and exit; no watch-mode flags.
- [x] Feedback latency has been measured and recorded above.
- [ ] Full project and design gates are green, or outstanding failures are closed with scoped evidence.
- [ ] Account, publication, and one-operation checkpoints are decided with the required authority.

**Approval:** pending; `nyquist_compliant` remains false while external and full-suite gates are open.
