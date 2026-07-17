---
status: partial
phase: 05-payments-payouts
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05a-SUMMARY.md, 05-05b-SUMMARY.md, 05-06-SUMMARY.md]
started: 2026-07-17T06:51:03Z
updated: 2026-07-17T07:22:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing paused — 5 items outstanding (Tests 4–8, real-PayMongo, deferred to a dedicated session)]

Runbook to resume with zero setup: 05-UAT-RUNBOOK.md
Resume: /gsd-verify-work 5 (picks up from Test 4)

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service and clear ephemeral state. Start the app from scratch (Docker DB up → `npm run dev`). Server boots without errors, migration 0008 (host_payout_ledger + listing.currency usd→php) is applied, and http://localhost:3000 loads live data (homepage / a listing renders).
result: pass
evidence: Claude-driven. Stopped the running dev server (PID 19036) and restarted `next dev` cold → "✓ Ready in 1072ms", GET / 200, no boot errors (only the generic Next 16 middleware→proxy deprecation warning; no PLATFORM_WALLET/PAYMONGO/INNGEST fail-closed throw). Migration 0008 confirmed live in Postgres: `host_payout_ledger` table with UNIQUE(booking_id) + restrict FKs, `listing.currency` = only 'php', `booking.payment_id` column present, inngest 4.13.0 installed. Homepage rendered 6 live DB listings with ₱ pricing.

### 2. Booker "Confirm & pay" checkout UI (copy + no-fee breakdown)
expected: On a bookable listing's reserve page (`/listings/[id]/book`), the primary CTA reads **"Confirm & pay"** (not "Confirm booking"). The reassurance names the charged amount + rails — e.g. "You'll pay ₱{total} now — cards, GCash, Maya, or QR Ph". The price breakdown shows **subtotal = total** with a final line like "Final price — no added fees. You'll pay this now." and **no** commission/service-fee line anywhere in the booker's view.
result: pass
evidence: Claude-driven. Seeded a pending hold, authed as host@fitout.test (canBook), fetched the rendered `/listings/[id]/book?hold=` RSC. Observed: CTA button = "Confirm & pay"; reassurance = "You'll pay ₱500 now — cards, GCash, Maya, or QR Ph. Payments are processed securely."; breakdown = "₱500/hr × 1 hour / Total ₱500 / Final price — no added fees. You'll pay this now." (subtotal == total); NO service-fee/commission line in the booker view (only "no added fees" copy). Also renders the hold countdown ("Held for 58:05").

### 3. Host earnings page — HOST-03 (`/host/earnings`)
expected: Logged in as the seeded host (host@fitout.test), an **Earnings** link appears in the host dashboard action row and the host header. `/host/earnings` is owner-gated (a host only ever sees their own payout rows; a non-host is redirected). With no payout rows yet it shows a calm **"No earnings yet"** empty state (plus the onboarding nudge if not fully onboarded). When rows exist, each shows a Held/Processing/Paid/Refunded state badge and the host-visible breakdown **Booking ₱gross / FitOut service fee (10%) −₱commission / Your payout ₱net**, with Upcoming-vs-Paid summary totals — never a red badge on a happy state.
result: pass
evidence: Claude-driven. Empty state first: `/host/earnings` (200) rendered "No earnings yet" + "Upcoming payouts"/"Paid out" ₱0 labels with 0 ledger rows. Then seeded one ledger row per state (Held/Processing/Paid/Refunded) → re-fetch rendered all four state badges, the "FitOut service fee (10%)" + "Your payout" host-visible lines, per-row gross→−10%→net figures (Held ₱500/−₱50/₱450, Processing ₱1,000/−₱100/₱900, Paid ₱800/−₱80/₱720, Refunded ₱500/−₱50/₱450), and correct summary totals (Upcoming ₱1,350 = Held+Processing net; Paid out ₱720 = Paid net; Refunded excluded). Owner-scope (WHERE host_id=session.user.id) is code+test-verified (earnings-view.test.ts). Synthetic rows cleaned up afterward.

### 4. Confirm & pay → hosted PayMongo checkout redirect
expected: Clicking "Confirm & pay" extends the pending hold and redirects **off-site** to a hosted PayMongo Checkout Session that offers card / GCash / Maya / QR Ph for exactly the frozen booking total. (Requires a real PayMongo test-mode secret key configured — the checkout-session create is a live PayMongo call.)
result: blocked
blocked_by: third-party
reason: "Deferred by user to a dedicated real-PayMongo session (2026-07-17). Test-mode setup (secret key, tunnel, /v2 beta) confirmed available; deferred for focus, not capability. Zero-setup runbook: 05-UAT-RUNBOOK.md. Must-complete, not abandoned."

### 5. Webhook confirms booking → interstitial resolves to Confirmed
expected: After completing a test-mode payment (webhook forwarded to the local endpoint via ngrok/cloudflared), returning to `/bookings/[id]?paid=1` shows the neutral "finalizing…" PendingPaymentState, which auto-resolves to **Confirmed** within the ~20s poll window (or the "taking longer" fallback resolves on manual refresh). The booking flips `pending→confirmed` only on the `checkout_session.payment.paid` webhook — never on the browser redirect alone. Exercise each rail (card, GCash, Maya, QR Ph).
result: blocked
blocked_by: third-party
reason: "Deferred by user to a dedicated real-PayMongo session (2026-07-17). Test-mode setup (secret key, tunnel, /v2 beta) confirmed available; deferred for focus, not capability. Zero-setup runbook: 05-UAT-RUNBOOK.md. Must-complete, not abandoned."

### 6. Gone-slot auto-refund → PaymentReversedState
expected: If the slot is taken by someone else during payment (double-book-during-payment edge), a payment on a **refundable** rail (card/GCash/Maya) is auto-refunded and the return renders the calm **PaymentReversedState** landing (never a red error); the booking ends `cancelled`. Money is never silently retained for an undeliverable slot.
result: blocked
blocked_by: third-party
reason: "Deferred by user to a dedicated real-PayMongo session (2026-07-17). Test-mode setup (secret key, tunnel, /v2 beta) confirmed available; deferred for focus, not capability. Zero-setup runbook: 05-UAT-RUNBOOK.md. Must-complete, not abandoned."

### 7. QRPh gone-slot → operator-alert manual-refund path
expected: A gone-slot payment on the **QRPh** rail (unrefundable via API) does NOT call the refund API; instead it emits a structured `[PAYMENT_ALERT] needs_manual_refund` log + a `recordAudit(needs_attention)` row so an operator can discover it and refund the booker out-of-band. (No paging/alerting UI ships this phase — this checks the operational signal exists and is reachable.)
result: blocked
blocked_by: third-party
reason: "Deferred by user to a dedicated real-PayMongo session (2026-07-17). Test-mode setup (secret key, tunnel, /v2 beta) confirmed available; deferred for focus, not capability. Zero-setup runbook: 05-UAT-RUNBOOK.md. Must-complete, not abandoned."

### 8. Host payout sweep + reconcile (T+24h inhouse transfer)
expected: For a `confirmed` booking whose session ended ≥24h ago, the hourly Inngest sweep pays the host **price − commission** via an inhouse `/v2/batch_transfers` to that host's own wallet, **at most once** per booking, moving the ledger Held→Processing; the reconcile cron then polls the transfer to Paid (Held→Processing→Paid). The host is never paid at booking time. (Requires PayMongo's money-movement `/v2` beta enabled — batch_transfers + wallet enumeration.)
result: blocked
blocked_by: third-party
reason: "Deferred by user to a dedicated real-PayMongo session (2026-07-17). Test-mode setup (secret key, tunnel, /v2 beta) confirmed available; deferred for focus, not capability. Zero-setup runbook: 05-UAT-RUNBOOK.md. Must-complete, not abandoned."

## Summary

total: 8
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 5

## Gaps

[none yet]
