---
phase: 26-settlement-aware-host-payouts
reviewed: 2026-09-29T10:22:24Z
depth: standard
files_reviewed: 40
files_reviewed_list:
  - .env.example
  - drizzle/0033_booking_settlement_observation.sql
  - e2e/overflow-320.spec.ts
  - package.json
  - scripts/ops-alerts.ts
  - src/app/(host)/host/bookings/[id]/page.tsx
  - src/app/(host)/host/bookings/page.tsx
  - src/app/(host)/host/earnings/error.tsx
  - src/app/(host)/host/earnings/page.tsx
  - src/app/api/inngest/route.ts
  - src/components/host/host-booking-row.tsx
  - src/components/host/payout-ledger-status.ts
  - src/components/host/payout-row.tsx
  - src/components/host/payout-state-badge.tsx
  - src/components/host/payout-summary.tsx
  - src/inngest/functions/ops-alert-digest.ts
  - src/inngest/functions/payout-reconcile.ts
  - src/inngest/functions/payout-sweep.ts
  - src/inngest/functions/settlement-reconcile.ts
  - src/lib/db/schema.ts
  - src/lib/host/booking-payout.ts
  - src/lib/payments/config.ts
  - src/lib/payments/payout-exceptions.ts
  - src/lib/payments/settlement.ts
  - src/lib/paymongo.ts
  - tests/booking/host-booking-row.test.tsx
  - tests/design/earnings-freeze.test.ts
  - tests/design/error-boundaries.test.ts
  - tests/ops/alert-digest.test.ts
  - tests/ops/alerts.test.ts
  - tests/payments/earnings-ui.test.tsx
  - tests/payments/earnings-view.test.ts
  - tests/payments/host-cancel.test.ts
  - tests/payments/ledger-freeze.test.ts
  - tests/payments/payout-attention.test.ts
  - tests/payments/payout-reconcile.test.ts
  - tests/payments/payout-suspension-freeze.test.ts
  - tests/payments/payout-sweep.test.ts
  - tests/payments/settlement-proof.test.ts
  - tests/paymongo/wallet-funding.test.ts
findings:
  critical: 4
  warning: 2
  info: 0
  total: 6
status: issues_found
---

# Phase 26: Code Review Report

**Reviewed:** 2026-09-29T10:22:24Z  
**Depth:** standard  
**Files Reviewed:** 40  
**Status:** issues_found

## Summary

The committed phase-26 payout and host-view changes were reviewed against `da1db10b..HEAD`; unrelated unstaged edits and the prerequisite `0032` migration were excluded. Four defects can make settlement or transfer evidence unsafe or display a settled payout as failed. Two further issues make the host timing and internal payout result inaccurate. The tests exercise single matching merchant payouts and terminal GET fixtures, but do not cover the conflicting evidence below. No provider or production database call was made.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01 [BLOCKER]: Settlement refresh trusts the first matching merchant payout

**File:** `src/inngest/functions/settlement-reconcile.ts:146-162`  
**Issue:** The loop returns as soon as one payout contains the booking payment. It never checks the remaining payouts or pages. If an earlier deposited payout is encountered before a later returned or contradictory payout for the same payment, it refreshes deposited proof and can authorize Friday dispatch from obsolete evidence. Its per-payout pagination check does not establish a complete booking-wide read.  
**Fix:** Finish the bounded payout scan, collect all matches for the booking payment, and require one unambiguous current match or a verified ordering of all status versions before writing current proof. Treat incomplete scans and conflicting matches as an exception that blocks dispatch. Add a two-payout fixture with deposited first and returned or conflicting second.

### CR-02 [BLOCKER]: A failed Wallet destination check can renew an old valid settlement proof

**File:** `src/lib/payments/settlement.ts:74-112`; `drizzle/0033_booking_settlement_observation.sql:17`  
**Issue:** The version unique key excludes `wallet_destination_matched` and mapping evidence. A second read of the same payout/status/timestamp with a mismatched Wallet destination conflicts with the earlier matched row, selects that earlier row's ID, and advances `booking_settlement_current.verified_at`. `currentSettlementProof` then reads the earlier `wallet_destination_matched=true` value as fresh, although the latest read found a mismatch. This is a direct route from contradictory provider evidence to a transfer-eligible proof.  
**Fix:** Never renew a duplicate observation unless every proof-relevant field matches the stored row. For changed destination/mapping evidence, append a distinct version or persist a separate blocking observation/current state, then deny proof. Add a matched-then-mismatched same-status-version test.

### CR-03 [BLOCKER]: Terminal transfer GET does not require exact booking identity

**File:** `src/inngest/functions/payout-reconcile.ts:173-175`; `src/lib/paymongo.ts:857-870`  
**Issue:** Reconciliation rejects reference, amount, and currency only when the provider supplies them. `getTransfer` returns all three as optional. A GET containing only the expected ID and `succeeded` marks the booking Paid, without proving that the terminal result belongs to this booking, frozen amount, and currency. This also affects a held claim discovered by a prior list read; the exact terminal GET can omit the fields that would confirm the discovery. The returned-settlement test currently demonstrates acceptance of a terminal response with these fields absent.  
**Fix:** Require exact equality for ID, reference number, amount, and currency on the terminal GET, with missing fields treated as `transfer_read_unavailable` or an identity exception. If the endpoint truly omits these fields, obtain another account-verified exact read before allowing Paid or Failed. Add missing-field terminal cases for both discovered and stored transfer IDs.

### CR-04 [BLOCKER]: Fully netted payouts are shown as failed instead of settled

**File:** `src/inngest/functions/payout-sweep.ts:370-374`; `src/components/host/payout-ledger-status.ts:77-81`  
**Issue:** When a cancellation-fee debit consumes the entire host payout, the sweep deliberately writes `state='paid'`, `paid_at=now()`, and `transfer_id=NULL` without a provider transfer. The host projector treats every Paid row lacking a transfer ID as `failed` and shows “Needs attention”; the paid total also omits it. This is a reachable, intended ledger branch, so the host booking and earnings views contradict the ledger.  
**Fix:** In the projection, recognize a fully netted Paid row when `recoveredCents === netCents`, `transferId === null`, and `paidAt` exists. Present it as settled by fee offset with the appropriate zero cash payout, while retaining terminal transfer proof for positive cash payouts. Add the zero-transfer branch to earnings and booking parity tests.

## Warnings

### WR-01 [WARNING]: Friday retry window is displayed as next week's release

**File:** `src/components/host/payout-ledger-status.ts:44-49`  
**Issue:** `nextSupportedFriday` advances seven days whenever current time is after Friday noon. At 12:01–23:00 Friday, a noon-qualified booking can still be retried by `payoutSweep`, yet the host view says its next eligible release is the following Friday.  
**Fix:** Use the same cohort/window rule as dispatch. During the active Friday retry window, show the current Friday cohort with honest “processing/retry checks” wording; advance after the window closes or when the booking missed the noon cohort. Add a Friday 12:01 and 22:59 projection case.

### WR-02 [WARNING]: Sweep reports Paid before provider terminal confirmation

**File:** `src/inngest/functions/payout-sweep.ts:387-392`  
**Issue:** A successful transfer-create response only updates the ledger to `processing`, but `payOne` returns `{ status: "paid" }`. The Inngest step result and any consumer of `PayOneResult` therefore claim a terminal outcome that only `payout-reconcile` may establish.  
**Fix:** Return a `processing` or `submitted` result after create and reserve `paid` for exact terminal reconciliation; update the result type and tests accordingly.

---

_Reviewed: 2026-09-29T10:22:24Z_  
_Reviewer: Codex (gsd-code-reviewer)_  
_Depth: standard_
