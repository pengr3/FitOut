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
result: partial — discovery, daily push delivery, a written redress runbook and a discharge command all exist now (2026-08-10); still no ops UI, and the QRPh rail is still not refundable.
reconciled: |
  2026-08-05 — re-checked, still open, and not closable by code evidence. The alert path is a
  `console.error` plus a `recordAudit(needs_attention)` row; no alerting or paging integration ships.
  What this item asks is whether the signal reaches a human who can act on it, which is an operational
  process question — there is no operator monitoring destination to verify against, so there is nothing
  to observe. It stays open until such a destination exists.
reconciled_2: |
  2026-08-06 — MOVED TO PARTIAL by quick task 260806-p3y. Two things changed, and the distinction
  matters.

  FIRST, a correction to the note above: it said the alert path is "a `console.error` plus a
  `recordAudit(needs_attention)` ROW". There was no row. `recordAudit`'s entire body was
  `console.info("[audit]", JSON.stringify(line))` — no audit table existed in the schema or in the live
  database. So the alert was TWO console lines, and an operator had no way to discover held money at all
  without log access. Both this file and 05-VERIFICATION.md described a row that was never written.

  SECOND, that is now fixed. `recordAudit` writes a durable row to a new `audit` table (migration 0024),
  indexed for exactly this question:

      audit_needs_attention_idx ON (created_at DESC) WHERE outcome='needs_attention' AND resolved_at IS NULL

  So "what money is outstanding, newest first?" is now a query rather than a log grep, and the QRPh
  unrefundable-rail alert (`auto_refund_manual`, webhook `handleGoneSlot`) lands in it along with the
  other ~11 money seams. Zero call-site changes across all 57 awaited sites; `recordAudit` is proven
  unable to throw (independently driven through a sync throw, a rejected promise, a circular `meta` and a
  BigInt `meta`), which matters because it is awaited inside `catch` blocks on the webhook's 200-ACK path.

  WHY THIS IS PARTIAL AND NOT PASSED: the item asks whether the signal "reaches wherever operators
  actually monitor" and whether "an operator can discover and act on it". Discovery is now MECHANICALLY
  possible and it was not before. But nothing runs that query on a schedule, no UI surfaces it, nothing
  pages anyone, and `resolved_at` has no code writer — an operator closes a row by hand. Calling that
  "passed" would be claiming an operational routine that does not exist. What remains is a process
  decision plus (optionally) an ops surface, not code correctness.
reconciled_3: |
  2026-08-10 — STAYS PARTIAL, with the gap materially shortened by quick task 260810-j3z. The four
  reasons `reconciled_2` gave for withholding a pass are re-assessed here ONE BY ONE, because three of
  them stopped being true and one did not.

    1. "nothing runs that query on a schedule" — NO LONGER TRUE.
       `src/inngest/functions/ops-alert-digest.ts` is registered in `serve()` and runs daily at
       08:50 Asia/Manila (minute :50, colliding with none of the four existing hourly crons).

    2. "nothing pages anyone" — CHANGED, AND STATED PRECISELY. It is a daily EMAIL DIGEST to
       `OPS_ALERT_EMAIL`. That is a PUSH channel, which is the thing that did not exist before: the
       alert now arrives without anyone going to look for it. It is NOT paging, and this note declines
       to call it paging — paging is a latency claim, and a once-a-day email cannot back one. Money
       held overnight still waits until 08:50. If a real latency guarantee is ever required, that is a
       further piece of work, not something this closed.

    3. "`resolved_at` has no code writer" — NO LONGER TRUE.
       `resolveAlert` (`src/lib/ops/alerts.ts`) is its first code writer, reachable as
       `npm run ops:alerts:resolve -- <audit-id>`. It is idempotent, it cannot rewrite an original
       discharge time (the `AND resolved_at IS NULL` guard), and it exits non-zero on an unknown id.

    4. "no UI surfaces it" — **STILL TRUE.** There is still no ops UI anywhere in this project. The two
       surfaces are an EMAIL and a COMMAND LINE. A CLI is not a UI and a digest is not a UI: redress
       still requires shell access to a machine with a database connection, and reading a row's `meta`
       still requires psql or Drizzle Studio.

  THEREFORE STILL `partial`, not `passed`. One of the item's own stated reasons remains true verbatim,
  so flipping the result would be claiming something this task did not deliver. What HAS changed is that
  the discovery-and-redress routine `reconciled_2` said "does not exist" now exists and is written down:
  see **`.planning/ops/NEEDS-ATTENTION-RUNBOOK.md`** for the end-to-end operator procedure (how the alert
  arrives, how to look the row up including where `meta` is readable, triage by `action` across all 13
  real action names, the QRPh out-of-band manual refund, and how to discharge the row).

  AND, UNCHANGED AND PERMANENT: none of this makes the QRPh overcharge refundable. A captured QRPh
  payment cannot be refunded through the PayMongo API at all — a rail limitation, not a code gap.
  **T-08-74 remains OPEN and AR-08-01 stands.** This item's underlying money problem still requires a
  human executing a manual, out-of-band refund; what shipped is that the human now finds out.

## Summary

total: 3
passed: 0
partial: 2
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

- **Item 1 is `partial`, not closed.** Card and QR Ph were hand-paid on the real PayMongo hosted page
  (`pay_C4PW6fRGtUTNm6GsKCpt4P36`; `pay_ru6sXqhRJto1NW3T83cqak4q` on `cs_809b1190ba4c3d44b7a77cdc`), plus
  three further real `checkout_session.payment.paid` confirms on 2026-07-31. **GCash and Maya were never
  individually walked** — one hand-paid test-mode checkout on each closes it.
- **Item 2 is the standing blocker.** PayMongo's /v2 money-movement beta is not enabled on this account
  (zero wallets; `receiving_institutions` 404s), so no real host payout has ever moved real money.
- **Item 3: the monitoring destination now exists; the remaining gap is narrower.** *(Updated 2026-08-10,
  quick task `260810-j3z` — supersedes "there is no monitoring destination to verify the
  `needs_manual_refund` signal against", which is no longer true.)* The signal is now pushed daily to
  `OPS_ALERT_EMAIL` at 08:50 Asia/Manila, the queue is listable via `npm run ops:alerts`, a row is
  dischargeable via `npm run ops:alerts:resolve -- <audit-id>`, and the end-to-end operator procedure is
  written down at `.planning/ops/NEEDS-ATTENTION-RUNBOOK.md`. **What genuinely remains:** (a) **no ops
  UI** — the surfaces are an email and a CLI, so redress still needs shell + DB access; (b) the delivery
  is a daily digest, not paging, so an overnight alert waits until morning; (c) a discharge records
  **who CLAIMS to have made it**, and that claim is not verified *(Updated 2026-08-11, quick task
  `260811-fh6` — supersedes "`resolved_at` records *that* a row was discharged but not *by whom* (no
  `resolved_by` column — accepted, `T-J3Z-06`)", which is no longer true; `T-J3Z-06` is closed as
  narrowed, not as eliminated)*: migration `0025` added `audit.resolved_by` and
  `npm run ops:alerts:resolve` now REQUIRES an explicit `--by "<your name>"` with no default of any kind,
  so **discharges made from 2026-08-11 onward record an asserted discharger**; the **27 historical
  discharges remain unattributed forever** and render as `unrecorded` (never back-filled — inventing a
  discharger for a past act would be fabricating an audit record); and
  the identity is **asserted, not authenticated** — the CLI has no session, so the column records who
  *claims* to have discharged the row, meaningful only in combination with shell / database access
  control, and **not proof of identity on its own**. Treating a `BY` value as proof of who discharged an
  alert is exactly the misreading to avoid;
  and (d) **the underlying QRPh rail is unchanged and permanent** — a captured QRPh payment is not
  refundable through the PayMongo API, so redress is still a manual out-of-band refund. **T-08-74 stays
  OPEN and AR-08-01 stands** — a discharger name is not a refund, and clause (c) narrowing changes nothing
  about items 1 and 2.

Phase status stays `partial`, and the phase's verification status stays `human_needed`, on items 2 and 3
plus the unwalked half of item 1.
