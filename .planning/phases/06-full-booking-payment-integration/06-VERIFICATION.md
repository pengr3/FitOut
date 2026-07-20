---
phase: 06-full-booking-payment-integration
verified: 2026-07-20T14:30:00Z
status: gaps_found
score: 3/4 success-criteria verified (1 blocked by a runtime gap)
overrides_applied: 0
source: 06-09 human-verify checkpoint (issues-found) + orchestrator runtime diagnosis
---

# Phase 6: Full Booking + Payment Integration — Verification Report

**Phase Goal:** The booking and payment building blocks are wired into one complete lifecycle that forks on the host's booking mode — instant-book captures payment immediately and confirms, while request-to-book holds the slot with no charge, lets the host approve or decline within an SLA, and on approval has the booker pay (pay-on-approval) to confirm, freeing the slot on decline/expiry/non-payment.

**Verified:** 2026-07-20 (automated suites across Waves 1–5 + a live human-verify checkpoint, 06-09)
**Status:** gaps_found — the request-to-book lifecycle is verified end-to-end, but the payment **confirm** authority (shared by instant and pay-on-approval) is blocked by a runtime bug in the webhook signature parser surfaced by real PayMongo test-mode UAT.
**Re-verification:** No — initial verification.

## Goal Achievement — Success Criteria

| # | Success Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Instant-book listing confirms immediately on successful payment and the slot is locked | **GAP** | The fork + hold + checkout are correct (06-04, `placeHold` byte-for-byte unchanged for instant; automated tests green). BUT confirmation for BOTH modes flows through `checkout_session.payment.paid` in `src/app/api/paymongo/webhook/route.ts`, whose `parseSignature` (line 91) rejects every real PayMongo signature — see **Gap G-06-01**. So instant-book cannot confirm on a real payment either. |
| 2 | Request-to-book creates a pending request that holds the slot with **no charge**; host can approve/decline; auto-declines after SLA | **VERIFIED** | Live UAT (06-09): booker request → `requested` hold, "You'll pay if approved" (no charge, `payment_id` null), slot occupied. Host `/host/requests` inbox renders venue-local window + ticking countdown + pending-count nudge. Approve → `approved` (DB: `expires_at` = now + 24h payment window, slot still occupying); Decline → `declined` (DB: 0 occupying rows, slot freed). SLA auto-decline proven by 06-06 automated tests (`request-expiry.test.ts`). Owner-scope read isolation proven by 06-07's committed test. |
| 3 | On approval the booker pays via the Phase-5 checkout and the booking confirms; on decline/SLA/non-payment the slot frees — nothing refunded/voided | **PARTIAL / GAP** | Slot-freeing half is **VERIFIED** (decline live; SLA/payment-window release via 06-06 tests; `declined`/`cancelled` non-occupying, nothing refunded — D-63). The **confirm-on-pay** half **FAILS**: the booker completed a real PayMongo test checkout (`pay_afhCbPSHLzBQrWrCovQh69Fv`) but the booking stayed `approved` (`payment_id` null) because the webhook 400s on the signature parse — **Gap G-06-01**. |
| 4 | Booker receives on-screen and email confirmation of a confirmed booking | **GAP** | The confirmed on-screen state + BOOK-06 `sendBookingConfirmed` email fire on the webhook's ≥1-row confirm branch (06-05) — which is never reached because the webhook 400s before confirming (**G-06-01**). Requested/approved/declined on-screen states themselves are VERIFIED live. |

**Score:** 3/4 criteria substantially built and verified for the request lifecycle; **1 blocking runtime gap** on the payment-confirm authority (which also degrades #1 and #4).

## Gaps

### G-06-01 — CRITICAL: webhook signature parser rejects every real PayMongo signature (test AND live)
- **Location:** `src/app/api/paymongo/webhook/route.ts:91` — `parseSignature`.
- **Defect:** requires all three of `t`/`te`/`li` non-empty. Real PayMongo signs with `te` in test mode (empty `li`) and `li` in live mode (empty `te`) — never both. Every real signature → `parseSignature` returns `null` → handler returns `400 Invalid signature` before confirming. Blocks PAY-05, BOOK-06, and BOOK-04's confirm.
- **Runtime proof (06-09 UAT):** paid test checkout succeeded; booking `257862dc` never confirmed. Captured event was a valid `checkout_session.payment.paid` with the correct `reference_number`; recomputed `HMAC-SHA256(secret, "{t}.{rawBody}")` matched the `te` digest exactly (body intact, 2181 == Content-Length); only `li` empty. Manual replay to the correct endpoint returned 400 — parser, not network.
- **Why tests missed it:** 06-05 / Phase-5 fixtures build signature headers with both `te` and `li` populated; the real single-mode shape is never exercised.
- **Fix + acceptance for the gap plan:**
  - Change line 91 to `if (!parts.t || (!parts.te && !parts.li)) return null;` and tolerate an empty part: `return { t: parts.t, te: parts.te ?? "", li: parts.li ?? "" };`. (`verifySignature` already skips empty candidates.)
  - Add a regression test with the **real test-mode header shape** (`te` = valid HMAC over `{t}.{body}`, `li` empty) asserting a 200 confirm + the booking flips; add a live-shape mirror (`te` empty, `li` valid). This closes the fixture gap that let the bug through.
  - Acceptance: a real (or real-shaped) `checkout_session.payment.paid` confirms an `approved`/`pending` booking (`payment_id` set) and fires the confirmed email.

### G-06-02 — SETUP (non-code, informational): webhook endpoint URL must include `/api/paymongo/webhook`
- During UAT the PayMongo webhook was registered at the ngrok root, so events hit the home page (200) and never reached the handler. Not a code defect — a re-test prerequisite. Recorded so the gap re-UAT registers the full path.

## Notes
- Verified live (06-09): request creation, booker requested/approved/declined states, host inbox + countdown + nudge, approve/decline atomicity + slot-freeing, owner-scope isolation. These are solid.
- The blocking gap is narrow (one predicate) but critical — it sits on the core-value path ("a real booking"). Recommend closing G-06-01 with the fix + the real-shaped-signature regression test, then re-running the 06-09 UAT (with G-06-02's URL corrected).

---
*Phase: 06-full-booking-payment-integration*
*Verified: 2026-07-20 — gaps_found*
