---
phase: 26-settlement-aware-host-payouts
fixed_at: 2026-09-29T10:43:00Z
review_path: .planning/phases/26-settlement-aware-host-payouts/26-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 26: Code Review Fix Report

**Fixed at:** 2026-09-29T10:43:00Z  
**Source review:** `.planning/phases/26-settlement-aware-host-payouts/26-REVIEW.md`  
**Iteration:** 1

**Summary:** Six findings in scope; six fixed; none skipped. Each is a logic change and requires human review of the intended payout and settlement policy before release.

## Fixed Issues

### CR-01: Settlement refresh trusts the first matching merchant payout

**Files modified:** `src/inngest/functions/settlement-reconcile.ts`, `src/inngest/functions/payout-sweep.ts`, `tests/payments/settlement-proof.test.ts`, `tests/payments/payout-sweep.test.ts`  
**Commit:** `b93ad21e`  
**Applied fix:** Complete the bounded payout scan before writing proof. Multiple matches create a durable exception, and unresolved exceptions block transfer creation despite an earlier fresh deposit.  
**Verification status:** fixed: requires human verification.

### CR-02: A failed Wallet destination check can renew an old valid settlement proof

**Files modified:** `src/lib/payments/settlement.ts`, `tests/payments/settlement-proof.test.ts`  
**Commit:** `a48d6d11`  
**Applied fix:** Compare all stored proof fields before refreshing a duplicate version. Contradictory or invalid reads create a durable blocking exception; current proof denies while it remains unresolved. Identical reads still refresh freshness.  
**Verification status:** fixed: requires human verification.

### CR-03: Terminal transfer GET does not require exact booking identity

**Files modified:** `src/inngest/functions/payout-reconcile.ts`, `src/lib/paymongo.ts`, `tests/payments/payout-reconcile.test.ts`  
**Commit:** `9a3e96ed`  
**Applied fix:** Require the terminal GET to carry the exact transfer ID, booking reference, amount, and currency. Missing or mismatched fields leave the ledger nonterminal and record an exception.  
**Verification status:** fixed: requires human verification.

### CR-04: Fully netted payouts are shown as failed instead of settled

**Files modified:** `src/components/host/payout-ledger-status.ts`, `tests/payments/earnings-view.test.ts`  
**Commit:** `016b4149`  
**Applied fix:** Recognize Paid rows with a paid instant, no transfer ID, and full fee recovery as settled with zero cash payout. Earnings and booking projections share the result.  
**Verification status:** fixed: requires human verification.

### WR-01: Friday retry window is displayed as next week's release

**Files modified:** `src/components/host/payout-ledger-status.ts`, `tests/payments/earnings-view.test.ts`  
**Commit:** `1a1a1800`  
**Applied fix:** Retain the current Friday cohort through 23:00 Manila time for bookings eligible by noon, and show active checks and retries during that window.  
**Verification status:** fixed: requires human verification.

### WR-02: Sweep reports Paid before provider terminal confirmation

**Files modified:** `src/inngest/functions/payout-sweep.ts`, `tests/payments/payout-sweep.test.ts`, `tests/payments/host-cancel.test.ts`  
**Commit:** `5f6829e6`  
**Applied fix:** Transfer creation returns Processing; terminal Paid remains a reconciliation outcome. Tests assert that `paid_at` is absent after creation.  
**Verification status:** fixed: requires human verification.

## Verification

Checks ran in the **main checkout** because `workflow.use_worktrees=false`. Local isolated-schema Vitest files passed: settlement proof 21, payout reconciliation 16, earnings view 26, payout sweep 39, and host cancellation 17 tests. `node node_modules/typescript/bin/tsc --noEmit` and ESLint on all modified source and test files passed. No live PayMongo call or production/shared database migration was made. The review findings concern money logic, so syntax and automated tests do not replace account-specific evidence or the phase's human release gates.

---

_Fixed: 2026-09-29T10:43:00Z_  
_Fixer: Codex (gsd-code-fixer)_  
_Iteration: 1_
