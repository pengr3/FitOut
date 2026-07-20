---
status: partial
phase: 06-full-booking-payment-integration
source: [06-VERIFICATION.md]
started: 2026-07-20T17:20:00Z
updated: 2026-07-20T17:20:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Re-run 06-09 live UAT payment-confirm step (with G-06-02 corrected)
expected: With the local stack running (app + Docker Postgres + a tunnel), register the PayMongo test-mode webhook at the FULL path `https://<tunnel>/api/paymongo/webhook` (NOT the tunnel root — G-06-02). Walk an `approved` pay-on-approval booking (or an instant-book listing) through a real PayMongo test-mode checkout to completion. PayMongo delivers a real `checkout_session.payment.paid`; the webhook returns 200 (not 400); the booking flips to `confirmed` with `payment_id` set; the booker's browser lands on the confirmed on-screen state (not a stuck "finalizing" interstitial); a real BOOK-06 confirmation email is delivered via Resend.
why_human: The G-06-01 fix is proven correct by regression tests (Case A te-only / Case B li-only in webhook-payment-paid.test.ts) built from the exact signature shape captured in the failed 06-09 UAT — but those POST directly to the exported route handler with a mocked DB and mocked Resend. This is the actual live surface that failed in 06-09 (real ngrok routing, real PayMongo delivery to the corrected URL, real browser redirect, real Resend email). Money + booking-confirm correctness is the project's core value, so the live confirm must be re-observed, not inferred.
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
