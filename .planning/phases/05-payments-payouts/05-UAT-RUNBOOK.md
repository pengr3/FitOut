# Phase 5 UAT — Real-PayMongo Runbook (Tests 4–8)

> **Status: DEFERRED** (2026-07-17). Tests 1–3 passed (Claude-driven; see `05-UAT.md`).
> Tests 4–8 require real PayMongo test-mode money-movement and are deferred to a
> dedicated session. User confirmed the test-mode setup (secret key, tunnel, `/v2` beta)
> exists. This runbook is zero-setup-to-resume. **This is a must-do, not abandoned.**

Grounded facts (verified against the live code + DB on 2026-07-17):
- Book as **`host@fitout.test` / `FitoutHost!2026`** — has `canBook`+`canHost`; self-booking
  `uat_listing_bookable` is allowed (an existing self-booked confirmed row proves it). One account.
- Bookable listing: **`uat_listing_bookable`** ("Sunlit Yoga Studio (bookable)", ₱500/hr, Asia/Manila).
- Webhook route: **`POST /api/paymongo/webhook`**. Refundable rails = `card, gcash, grab_pay, paymaya`.
  QRPh/UBP → operator-alert (no API refund).
- Operator alert (test 7) is a **server-log line**, not a DB row: `recordAudit` emits
  `console.info("[audit]", {…outcome:"needs_attention"…})` + the route logs `[PAYMENT_ALERT] needs_manual_refund`.
- Gone-slot (tests 6/7) is forced by flipping the booking out of `pending` (the confirm UPDATE keys on
  `status='pending'` alone — expiry does NOT trigger it, by D-57/D-58 design). Cancel the hold in the DB
  mid-checkout.
- Test 8 hard prereq: `host_payout.paymongo_account_id` is the seed placeholder `acct_uat_AcW4AhUf`.
  The sweep correlates `wallet.id === paymongo_account_id` against the real `/v2` wallet list — **set it to
  the real linked-account wallet id** or the sweep alerts "no wallet" and never transfers.

---

## Part 0 — Setup (once)

1. `.env.local` test-mode values: `PAYMONGO_SECRET_KEY=sk_test_…`, `PAYMONGO_PUBLIC_KEY=pk_test_…`,
   `PAYMONGO_WEBHOOK_SECRET=whsk_…` (from step 3), `PLATFORM_WALLET_NUMBER/NAME/BIC` (real platform wallet),
   `BETTER_AUTH_URL=http://localhost:3000` (checkout returns to your local browser).
2. Tunnel: `cloudflared tunnel --url http://localhost:3000` (or `ngrok http 3000`). Copy the https URL.
3. PayMongo dashboard (test mode) → Webhooks → add `https://<tunnel>/api/paymongo/webhook`, subscribe
   `checkout_session.payment.paid`, `payment.refunded`, `payment.refund.updated` (keep `merchant.*`).
   Copy its signing secret → `PAYMONGO_WEBHOOK_SECRET`.
4. Restart `npm run dev` (loads new env).
5. Test 8 only: 2nd terminal `npm run dev:inngest` (dashboard `http://localhost:8288`); set real wallet:
   `docker compose exec db psql -U fitout -d fitout -c "UPDATE host_payout SET paymongo_account_id='<REAL_WALLET_ID>' WHERE user_id='AcW4AhUfkMexEvvEUa8KjsngD7ubMoZy';"`
6. Log in at `/login` as `host@fitout.test`.

Test payment methods: card success `4343 4343 4343 4345` (any future exp, any CVC); GCash/Maya/QR Ph →
click **"Authorize Test Payment"** on the hosted simulator ("Fail" for the sad path).

## Part 1 — Tests 4 & 5 (redirect + webhook confirm) · one loop per rail {card, GCash, Maya, QR Ph}
1. Listing → pick an **unbooked** slot → **Book this space** → reserve page.
2. **[T4]** Click **Confirm & pay** → redirects off-site to PayMongo checkout w/ all rails, exact ₱ total.
3. Pay with the rail (test method above).
4. **[T5]** Back on `/bookings/[id]?paid=1` → "finalizing…" (PendingPaymentState) → **Confirmed** within ~20s
   (webhook is the authority; refresh if "taking longer"). Watch terminal for `POST /api/paymongo/webhook 200`.

## Part 2 — Test 6 (refundable gone-slot → PaymentReversedState)
1. Fresh slot → **Confirm & pay** on **card** → land on checkout, don't pay yet.
2. Cancel the hold mid-checkout:
   `docker compose exec db psql -U fitout -d fitout -c "UPDATE booking SET status='cancelled' WHERE id=(SELECT id FROM booking WHERE status='pending' ORDER BY created_at DESC LIMIT 1) RETURNING id;"`
3. Complete the card payment.
4. ✅ Return renders **PaymentReversedState** (calm, not red); PayMongo dashboard shows a **refund**; booking `cancelled`.

## Part 3 — Test 7 (QRPh gone-slot → operator alert, no auto-refund)
Same as Part 2 but rail = **QR Ph**. After completing payment:
✅ `npm run dev` terminal shows `[PAYMENT_ALERT] needs_manual_refund {…}` **and** `[audit] {…"outcome":"needs_attention"…}`;
NO refund API call; return renders PaymentReversedState.

## Part 4 — Test 8 (payout sweep + reconcile → Paid)
Prereqs: Inngest dev running + real wallet id set + real `PLATFORM_WALLET_*`.
1. Shift a confirmed+paid booking's session to >24h ago (past, non-overlapping, no ledger row yet):
   `docker compose exec db psql -U fitout -d fitout -c "UPDATE booking SET starts_at=now()-interval '26 hours', ends_at=now()-interval '25 hours' WHERE id='<CONFIRMED_BOOKING_ID>' RETURNING id;"`
2. Inngest dashboard → **payout-sweep** → Invoke. ✅ ledger `held` → transfer → `processing`; `/host/earnings` shows Processing.
   (A `[payout-alert]` here = wallet id didn't correlate.)
3. Inngest dashboard → **payout-reconcile** → Invoke. ✅ `processing → paid` (paid_at set); `/host/earnings` shows Paid;
   net lands in the host's real wallet (PayMongo dashboard).
4. ✅ Confirm not stuck at Processing → `mapTransferStatus` (assumption **A4**) matched PayMongo's real transfer-status enum.

## Results template
```
Test 4 (checkout redirect):        pass / FAIL — notes:
Test 5 (webhook confirm):          card:__  gcash:__  maya:__  qrph:__  — notes:
Test 6 (refundable gone-slot):     pass / FAIL — notes:
Test 7 (QRPh operator alert):      pass / FAIL — notes:
Test 8 (sweep + reconcile → Paid): pass / FAIL — notes:
   └ A4 mapTransferStatus matched real enum? yes/no — actual status string seen: ____
```

## Resume
`/gsd-verify-work 5` picks up from the first blocked test (Test 4). Paste the results template and
Claude records each result, auto-diagnoses any failures, and (if clean) closes Phase 5.
