---
status: partial
phase: 05-payments-payouts
source: [05-VERIFICATION.md]
started: 2026-07-16T14:13:42Z
updated: 2026-08-05T03:40:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Real hosted checkout + webhook confirm end-to-end (test-mode PayMongo)
expected: Complete a real booking through the hosted PayMongo Checkout Session (test mode) on each rail (card, GCash, Maya, QR Ph), forward the webhook via ngrok/cloudflared, and confirm the booking flips pending→confirmed and `/bookings/[id]` resolves off the PendingPaymentState interstitial to Confirmed within the ~20s poll window (or the "taking longer" fallback resolves on manual refresh).
result: partial — card and QR Ph are genuinely proven by hand; GCash and Maya are NOT.
reconciled: |
  2026-08-05 — this item was carried as fully `[pending]` while real, hand-paid `sk_test_` hosted
  checkouts already existed in the record. It is now `partial`, because the item's own wording is
  "on each rail (card, GCash, Maya, QR Ph)" and only two of those four rails were individually walked.

  PROVEN — a human paid on the real PayMongo hosted page:
  - **card** — Phase 6 live re-UAT 2026-07-20 (`06-HUMAN-UAT.md`): booking `42132ab1-…-234887435adc`
    flipped to `confirmed` with `payment_id=pay_C4PW6fRGtUTNm6GsKCpt4P36` (read back directly in
    Postgres, `expires_at=null`), the browser landed on the confirmed on-screen state rather than a stuck
    interstitial, and the BOOK-06 confirmation email was delivered via Resend (id
    `faa1481e-…-763112829036`) and confirmed received.
  - **QR Ph** — the Phase-7 Plan-16 refundability probe, recorded verbatim in the module header of
    `src/lib/payments/refund-rail.ts` (observed 2026-07-23, test mode): QRPh-only checkout session
    `cs_809b1190ba4c3d44b7a77cdc` (₱100.00) "was paid by a human on the hosted page", captured payment
    `pay_ru6sXqhRJto1NW3T83cqak4q` with `source.type: "qrph"`.
  - Three FURTHER real confirms on the same rail plumbing, 2026-07-31 (`09-16-SUMMARY.md`):
    `evt_oGtPa9Vd7ZqWFiPRntuSjacm` → `215d2739`, `evt_zBVdHpjZL1N6hmVtasiZ5K6X` → `340b5323`,
    `evt_BRQR1Xx9FQcJhy2Dgvmti6m4` → `5b992c46` — each a real `checkout_session.payment.paid` delivered
    through the tunnel to the webhook route, each followed by a `booking_confirmed` notification row
    within one second. This is the pending→confirmed flip and the notification leg, observed live.

  NOT PROVEN — **GCash** and **Maya** have never been individually walked end to end. Nothing in the
  record shows a hand-paid checkout on either rail. They share the same hosted-Checkout-Session and the
  same `checkout_session.payment.paid` webhook branch as the confirms above, which is a real reason to
  expect them to behave identically — but "expected to behave identically" is inference, not
  observation, and this file exists to record observation. Closing this item fully needs one hand-paid
  test-mode checkout on each of GCash and Maya.

### 2. Real inhouse payout transfer + wallet correlation (PayMongo /v2 beta)
expected: Once PayMongo enables the money-movement /v2 beta (batch_transfers, wallet enumeration), run the sweep against a real confirmed + past-T+24h booking; the transfer lands the correct net_cents in the correct host's real wallet and the reconcile cron polls it to Paid (ledger Held→Processing→Paid). Confirm mapTransferStatus's terminal-enum mapping (A4 assumption) matches the real PayMongo response shape.
result: [pending] — OPEN, unchanged. The single largest residual risk in the milestone.
reconciled: |
  2026-08-05 — re-checked, still blocked, and nothing in the record moves it. PayMongo's /v2
  money-movement endpoints are absent on this account, probed directly on 2026-07-23 and recorded
  verbatim in `src/lib/payments/refund-rail.ts`: `GET /v2/wallets?status=activated` → HTTP 200 with ZERO
  wallets, and `GET /v2/transfers/receiving_institutions?provider=instapay` → HTTP 404
  (`failed to get transfer: resource not found`) — the router resolving the path as a transfer-id lookup,
  i.e. the endpoints do not exist until PayMongo enables the feature.

  Stated without softening: **real host payouts have never moved real money.** The sweep and reconcile
  are proven only against `mockPayMongo`. The booker-side rail is proven against the real API (see item
  1); the host-side leg is not. External dependency, not unfinished engineering — and deliberately kept
  visible.

### 3. QRPh operator-alert manual-refund workflow
expected: Trigger a genuinely-gone-slot payment on the QRPh rail (test mode); the `[PAYMENT_ALERT] needs_manual_refund` + `recordAudit(needs_attention)` signal reaches wherever operators actually monitor, and an operator can discover and act on it to refund the booker out-of-band (no alerting/paging integration ships this phase — this checks the operational side of "never silently retain money").
result: [pending] — OPEN, unchanged.
reconciled: |
  2026-08-05 — re-checked, still open, and not closable by code evidence. The alert path is a
  `console.error` plus a `recordAudit(needs_attention)` row; no alerting or paging integration ships.
  What this item asks is whether the signal reaches a human who can act on it, which is an operational
  process question — there is no operator monitoring destination to verify against, so there is nothing
  to observe. It stays open until such a destination exists.

## Summary

total: 3
passed: 0
partial: 1
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

- **Item 1 is `partial`, not closed.** Card and QR Ph were hand-paid on the real PayMongo hosted page
  (`pay_C4PW6fRGtUTNm6GsKCpt4P36`; `pay_ru6sXqhRJto1NW3T83cqak4q` on `cs_809b1190ba4c3d44b7a77cdc`), plus
  three further real `checkout_session.payment.paid` confirms on 2026-07-31. **GCash and Maya were never
  individually walked** — one hand-paid test-mode checkout on each closes it.
- **Item 2 is the standing blocker.** PayMongo's /v2 money-movement beta is not enabled on this account
  (zero wallets; `receiving_institutions` 404s), so no real host payout has ever moved real money.
- **Item 3 needs an operational process**, not a code check — there is no monitoring destination to
  verify the `needs_manual_refund` signal against.

Phase status stays `partial`, and the phase's verification status stays `human_needed`, on items 2 and 3
plus the unwalked half of item 1.
