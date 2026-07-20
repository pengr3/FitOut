---
phase: 06-full-booking-payment-integration
plan: 09
subsystem: uat
type: checkpoint:human-verify
tags: [uat, human-verify, pay-on-approval, paymongo, webhook, gap-found]
outcome: issues-found

key-files:
  created: []
  modified: []

requirements-completed: []  # gaps_found — PAY-05/BOOK-06 (and BOOK-04 confirm) blocked by a webhook signature-parse bug surfaced here; request lifecycle (BOOK-05/HOST-01) verified live.

# Metrics
duration: ~90min (interactive UAT)
completed: 2026-07-20
---

# Phase 6 Plan 09: Human-Verify Checkpoint — Result: ISSUES FOUND

**The request-to-book lifecycle was walked end-to-end against a real local stack (app + Postgres + ngrok tunnel + PayMongo test mode). Steps 1–5 and 7 passed live; 3b/8/9 are covered by automated tests. Step 6 (payment → webhook confirm) FAILED and surfaced a critical, previously-latent bug in the webhook signature parser that rejects every real PayMongo signature (test AND live). Phase is NOT complete → routed to formal gap closure.**

## UAT Walkthrough Results

| Step | What | Result |
|------|------|--------|
| 1 | Host sets a listing to "Request to book" (D-61 copy) | ✅ PASS — listing in `request` mode, published |
| 2 | Booker requests a slot → "Request sent — awaiting host", "You'll pay if approved" (not charged), no Pay CTA, calm | ✅ PASS (live, real signup `pogi@gmail.com`) |
| 3 | Host inbox `/host/requests` — venue-local window (`Wed, Jul 22, 3:00–4:00 PM (Makati time)`), guest, ₱ price, "Expires in Nh Mm" countdown, pending-count nudge (hidden at 0) | ✅ PASS (live) |
| 3b | Cross-host read isolation (host-B can't see host-A's requests) | ✅ PASS (via 06-07's committed owner-scope automated test; predicate confirmed live in `/host/requests`) |
| 4 | Host **Approve** → `requested → approved` | ✅ PASS (live; DB verified: `expires_at` reset to now + 24h payment window, slot still occupying, `payment_id` null — no charge, D-63) |
| 5 | Booker "approved / Pay now" state — "Your request was approved", payment-window countdown, one coral Pay now | ✅ PASS (live, after a manual refresh — see Design Note) |
| 6 | Booker pays (PayMongo test card) → `payment.paid` webhook → on-screen "Booking confirmed" + email | ❌ **FAIL — see Gap G-06-01** |
| 7 | Host **Decline** → neutral (not red) confirm dialog → slot frees + booker email | ✅ PASS (live; DB verified: `declined`, `expires_at=NULL`, 0 occupying rows on the slot) |
| 8 | Expiry cron (requested→declined / approved→cancelled, DB clock) | ✅ via 06-06 automated tests (not driven live — needs the Inngest Dev Server) |
| 9 | Instant-book unregressed | ⚠️ 06-04 automated test green for the fork, BUT instant-book **real-payment confirm shares the same broken webhook** (G-06-01) — so instant confirm is also affected in real mode |

## Punch List (for gap closure)

### G-06-01 — CRITICAL (code bug): webhook signature parser rejects every real PayMongo signature
- **File:** `src/app/api/paymongo/webhook/route.ts:91` (`parseSignature`)
- **Defect:** `if (!parts.t || !parts.te || !parts.li) return null;` requires **all three** of `t`/`te`/`li` to be non-empty. PayMongo's real `Paymongo-Signature` header is `t=<ts>,te=<64hex>,li=` in **test** mode (empty `li`) and `t=<ts>,te=,li=<64hex>` in **live** mode (empty `te`) — it only ever signs with ONE of the two. So `parseSignature` returns `null` for every real signature → the handler `return new Response("Invalid signature", { status: 400 })` on **every** webhook, in **both** modes. No booking ever confirms via a real payment (breaks PAY-05, BOOK-06, and BOOK-04's confirm).
- **Proof (runtime, this UAT):** booker paid the PayMongo test checkout successfully (`pay_afhCbPSHLzBQrWrCovQh69Fv`), but booking `257862dc` stayed `approved` / `payment_id` empty. The captured event through ngrok was the correct `checkout_session.payment.paid` with the right `reference_number` (`257862dc…`) and a valid `Paymongo-Signature`. Recomputing `HMAC-SHA256(secret_from_.env.local, "{t}.{rawBody}")` **matched the `te` digest exactly**; body was intact (2181 bytes == `Content-Length`); only `li` was empty. So the secret, body, and HMAC scheme are all correct — the sole failure is the over-strict parse gate. A manual replay of the exact captured event to `/api/paymongo/webhook` returned **400 Invalid signature**, confirming the parser (not the network) is the block.
- **Why automated tests missed it:** the 06-05 / Phase-5 webhook tests construct synthetic signature headers with **both** `te` and `li` populated, so they never exercise the real empty-`li` (test) / empty-`te` (live) shape. This is a test-vs-reality gap in the fixture, not just the parser.
- **Fix (one predicate + a regression test):**
  ```js
  // require t AND at least one of te/li (mode-dependent), not all three
  if (!parts.t || (!parts.te && !parts.li)) return null;
  return { t: parts.t, te: parts.te ?? "", li: parts.li ?? "" };
  ```
  `verifySignature` already iterates `[sig.te, sig.li]` and length-guards empties (line 103), so the verify path needs no change. **Add a regression test** using the real test-mode header shape (`te` = valid HMAC, `li` = empty) — and ideally a live-shape case (`te` empty, `li` valid) — asserting a 200 confirm.

### G-06-02 — SETUP (user config, not a code bug): webhook endpoint URL missing its path
- The webhook was registered in the PayMongo dashboard at the ngrok **root** (`https://…ngrok-free.dev`) instead of `https://…ngrok-free.dev/api/paymongo/webhook`. PayMongo POSTed the event to `/`, which the Next.js home page answered with **200**, so PayMongo considered delivery successful and will **not retry**.
- **Fix (dashboard, when re-testing):** set the endpoint URL to include `/api/paymongo/webhook`. Note free ngrok URLs change on restart, so re-check the URL each session.

## Design Note (not a bug) — booker page needs a manual refresh on approval
On the `requested → approved` transition, the booker's already-open `/bookings/[id]` doesn't live-update; `approveRequest` revalidates `/host/requests` + `/host` only, and `revalidatePath` can't push to an open tab. This is intended v1 behavior (D-65: freshness via revalidate, no websockets/polling for the request lifecycle) — the designed path is the "approved — pay now" email link, which loads the page fresh. Candidate for a future polish (a poller or "check again" nudge on the requested/approved states); logged here, out of scope for this phase.

## Verification Environment
- Local stack: `npm run dev` (:3000), Docker Postgres `fitout-db-1`, official ngrok v3.39.9 tunnel (`eloquent-pounce-entangled.ngrok-free.dev`), PayMongo **test** mode with real `sk_test_`/`pk_test_`/`whsk_` keys in `.env.local`.
- Full automated suite before UAT: **372 passed**, 1 known pre-existing flake (`tests/auth/secret-config.test.ts`, passes in isolation).

## Outcome
**ISSUES FOUND — checkpoint not signed off.** Phase 6 is NOT marked complete. Per the 06-09 plan's blocking-gate contract, the punch list above routes to a gap-closure plan (`/gsd:plan-phase 6 --gaps`). The request-to-book lifecycle (BOOK-05/HOST-01 + the request/approve/decline/inbox/countdown surfaces) is verified live; the payment **confirm** path (PAY-05/BOOK-06, and BOOK-04's confirm) is blocked by G-06-01 until the parser fix lands and a real (or real-shaped) webhook confirms a booking.

## Self-Check: DONE (checkpoint executed; result = issues-found)
- Checkpoint ran end-to-end against a real stack; every step recorded with live evidence.
- One critical code gap (G-06-01) root-caused with runtime proof (HMAC match + 400 replay) and a concrete fix + test.
- One setup gap (G-06-02) identified.
- No code changed in this plan (verification only). Phase left `gaps_found` for formal gap closure.

---
*Phase: 06-full-booking-payment-integration*
*Completed: 2026-07-20 (checkpoint — issues found)*
