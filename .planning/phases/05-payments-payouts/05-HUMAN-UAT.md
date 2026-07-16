---
status: partial
phase: 05-payments-payouts
source: [05-VERIFICATION.md]
started: 2026-07-16T14:13:42Z
updated: 2026-07-16T14:13:42Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Real hosted checkout + webhook confirm end-to-end (test-mode PayMongo)
expected: Complete a real booking through the hosted PayMongo Checkout Session (test mode) on each rail (card, GCash, Maya, QR Ph), forward the webhook via ngrok/cloudflared, and confirm the booking flips pending→confirmed and `/bookings/[id]` resolves off the PendingPaymentState interstitial to Confirmed within the ~20s poll window (or the "taking longer" fallback resolves on manual refresh).
result: [pending]

### 2. Real inhouse payout transfer + wallet correlation (PayMongo /v2 beta)
expected: Once PayMongo enables the money-movement /v2 beta (batch_transfers, wallet enumeration), run the sweep against a real confirmed + past-T+24h booking; the transfer lands the correct net_cents in the correct host's real wallet and the reconcile cron polls it to Paid (ledger Held→Processing→Paid). Confirm mapTransferStatus's terminal-enum mapping (A4 assumption) matches the real PayMongo response shape.
result: [pending]

### 3. QRPh operator-alert manual-refund workflow
expected: Trigger a genuinely-gone-slot payment on the QRPh rail (test mode); the `[PAYMENT_ALERT] needs_manual_refund` + `recordAudit(needs_attention)` signal reaches wherever operators actually monitor, and an operator can discover and act on it to refund the booker out-of-band (no alerting/paging integration ships this phase — this checks the operational side of "never silently retain money").
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
