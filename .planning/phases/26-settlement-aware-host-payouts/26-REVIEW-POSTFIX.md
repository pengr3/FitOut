---
phase: 26-settlement-aware-host-payouts
reviewed: 2026-09-29T10:52:29Z
depth: standard
review_range: b93ad21e^..5f6829e6
files_reviewed: 11
files_reviewed_list:
  - src/components/host/payout-ledger-status.ts
  - src/inngest/functions/payout-reconcile.ts
  - src/inngest/functions/payout-sweep.ts
  - src/inngest/functions/settlement-reconcile.ts
  - src/lib/payments/settlement.ts
  - src/lib/paymongo.ts
  - tests/payments/earnings-view.test.ts
  - tests/payments/host-cancel.test.ts
  - tests/payments/payout-reconcile.test.ts
  - tests/payments/payout-sweep.test.ts
  - tests/payments/settlement-proof.test.ts
findings:
  critical: 1
  warning: 0
  info: 0
  total: 1
status: issues_found
---

# Phase 26: Post-Fix Code Review

**Reviewed:** 2026-09-29T10:52:29Z  
**Depth:** standard  
**Files Reviewed:** 11  
**Status:** issues_found

## Summary

The six original findings were checked against the committed fixes and their regression cases. CR-01 through CR-04 and WR-01 through WR-02 are addressed in the changed paths. One new blocker was introduced by the CR-01 fix: its pre-transfer alert guard treats every open payout exception as a settlement contradiction and permanently suppresses normal Wallet and missed-cutoff retries. No source file was changed, and no provider call or database migration was made.

## Original Finding Closure

| Finding | Post-fix result | Evidence |
| --- | --- | --- |
| CR-01 | Closed, with regression below | `refreshBookingSettlement` completes the bounded payout scan and rejects multiple payment matches; `currentSettlementProof` denies unresolved settlement-read exceptions. |
| CR-02 | Closed | Duplicate versions compare proof-relevant fields before freshness renewal; a contradiction records a blocking exception. |
| CR-03 | Closed | Exact terminal GET requires matching transfer ID, booking reference, frozen amount, and currency before a terminal ledger update. |
| CR-04 | Closed | A fully netted Paid row with `paidAt` and no transfer ID projects as settled with zero cash payout. |
| WR-01 | Closed | The projector keeps a noon-qualified Friday cohort visible through the active retry window and advances after 23:00 Manila. |
| WR-02 | Closed | Transfer creation now returns `processing`; terminal Paid remains a reconciliation result. |

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-POST-01 [BLOCKER]: The settlement alert guard disables all future automatic payout retries

**File:** `src/inngest/functions/payout-sweep.ts:253-256`; `src/lib/payments/payout-exceptions.ts:77-86`  
**Issue:** The new pre-transfer check calls `unresolvedPayoutAttention`, which returns a booking for **any** unresolved `host_payout_recovery` cause. That includes `wallet_unavailable`, `wallet_insufficient`, `destination_action_required`, `settlement_missing`, and `missed_friday_cutoff`, not just the contradictory settlement read it was intended to block. A first Friday Wallet shortfall records `wallet_insufficient` at payout-sweep lines 332-334; when funding later arrives, every hourly and following-Friday `payOne` call exits at line 255 before its fresh Wallet read or transfer claim. The 23:00 cutoff also records `missed_friday_cutoff` for every unpaid cohort booking, so an otherwise recovered booking cannot release next Friday until an operator manually resolves old alert rows. This contradicts the configured Friday retry and next-cohort behavior. The new test covers only `settlement_read_unavailable` and misses the ordinary recovery path.  
**Fix:** Remove this broad attention check or replace it with a narrowly scoped settlement-blocker query. `currentSettlementProof` already rejects unresolved `settlement_read_unavailable` at `src/lib/payments/settlement.ts:143-149`, so the broad check is redundant for CR-01/CR-02. Keep non-settlement exceptions visible to operators without using them as a universal dispatch gate. Add a case that records `wallet_insufficient` or `missed_friday_cutoff`, then supplies fresh proof and funds on a later eligible Friday and verifies one guarded transfer POST.

---

_Reviewed: 2026-09-29T10:52:29Z_  
_Reviewer: Codex (gsd-code-reviewer)_  
_Depth: standard_
