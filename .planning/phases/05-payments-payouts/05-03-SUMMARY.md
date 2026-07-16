---
phase: 05-payments-payouts
plan: 03
subsystem: payments
tags: [checkout, paymongo, confirm-and-pay, webhook-handoff, extend-hold, booker-ux, d-57, d-58]

# Dependency graph
requires:
  - phase: 05-payments-payouts
    plan: 01
    provides: "PAYMENT_WINDOW_MINUTES (config.ts) — the D-58 extend-hold window"
  - phase: 05-payments-payouts
    plan: 02
    provides: "createCheckoutSession(input) — the hosted /v1 charge primitive + mockPayMongo.createCheckoutSession stub"
  - phase: 04-booking-core-search-no-payment
    provides: "confirmBooking seam, ReserveActions/ReserveView/PriceBreakdown atoms, /bookings/[id] confirmation RSC, /listings/[id]/book reserve RSC, bookingReference, formatMoney"
provides:
  - "confirmBooking = Confirm & pay (D-57): retires the sync pending->confirmed flip, extends the hold (D-58), creates a hosted checkout for the frozen quotedTotalCents, redirects off-site"
  - "ConfirmResult union gains reason 'checkout' (calm checkout-failure / rate-limit retry — never red)"
  - "Reserve UI 'Confirm & pay' CTA + truthful charged-amount reassurance; booker breakdown stays subtotal=total (D-50)"
  - "PendingPaymentState — the neutral finalizing interstitial (bounded router.refresh poller; never fabricates confirmed)"
  - "PaymentReversedState — the calm D-58 auto-refund landing (mirrors HoldExpiredState, never red)"
  - "The exact /bookings/[id] branch table Plan 04's webhook must drive (below)"
affects: [05-04, payments, booker-checkout, PAY-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server action calls PayMongo: session -> rateLimit -> recordAudit-on-denial -> try/catch calm result (reused from paymongo-connect.ts)"
    - "Extend-hold BEFORE charge via db.execute(sql make_interval(mins => PAYMENT_WINDOW_MINUTES)) scoped to owner + status='pending' (DB clock)"
    - "Stable Idempotency-Key checkout:<bookingId> so a double-click / race reuses the same checkout session (D-42)"
    - "Client interstitial poller = HoldCountdown hook discipline (setInterval-only setState, closure counter, ref-synced router, clear on unmount); never fabricates server state client-side"
    - "Return redirect (?paid=1) is a UX signal ONLY — the page renders Confirmed strictly on DB status='confirmed' (D-57 truthfulness)"

key-files:
  created:
    - src/components/booking/pending-payment-state.tsx
    - src/components/booking/payment-reversed-state.tsx
    - tests/payments/checkout-create.test.ts
  modified:
    - src/app/actions/booking.ts
    - src/components/booking/reserve-actions.tsx
    - src/components/booking/price-breakdown.tsx
    - src/components/booking/reserve-view.tsx
    - src/app/listings/[id]/book/page.tsx
    - src/app/bookings/[id]/page.tsx
    - tests/booking/state-machine.test.ts

key-decisions:
  - "Added ConfirmResult reason:'checkout' (rather than overloading 'expired') for checkout-create failure, the null-quote guard, and the rate-limit denial — the hold is still active, so reserve-view treats it as a calm retry, never a red error"
  - "Reused BETTER_AUTH_URL for the checkout success/cancel base (the existing app-URL convention used by paymongo-connect.ts), NOT the plan's literal NEXT_PUBLIC_APP_URL (which does not exist in the codebase)"
  - "confirmBooking no longer guards expires_at > now(): a lapsed-but-pending hold is EXTENDED, not refused (D-58) — the webhook + auto-refund backstop own the residual race"

patterns-established:
  - "Booker never sees a commission/fee line — the RESERVED PriceBreakdown slot stays empty (D-50); commission lives only on the future /host/earnings"

requirements-completed: []

# Metrics
duration: 11min
completed: 2026-07-16
---

# Phase 5 Plan 03: Confirm & Pay Checkout Summary

**Turned the Phase-4 terminal "Confirm booking" into "Confirm & pay" (D-57): `confirmBooking` now extends the pending hold (D-58), creates a hosted PayMongo Checkout Session for the server-frozen `quotedTotalCents`, and redirects off-site — the synchronous `pending→confirmed` flip is retired (the webhook, Plan 04, is the confirm authority). On return, `/bookings/[id]?paid=1` renders a neutral "finalizing…" interstitial that self-resolves only when the DB says `confirmed`, plus a calm auto-refund landing for the reversed edge.**

## Performance
- **Duration:** ~11 min
- **Started:** 2026-07-16T12:21:49Z
- **Completed:** 2026-07-16T12:32:59Z
- **Tasks:** 3
- **Files:** 10 (3 created, 7 modified)

## Accomplishments
- **Task 1 (TDD):** rewired `confirmBooking(holdId)` — owner-gate load (now also reads the frozen amount/currency/listing) → already-confirmed idempotent short-circuit → non-pending guard → rate-limit + audit (WR-06) → null-quote guard → **extend hold to `now()+PAYMENT_WINDOW`** (D-58) → **`createCheckoutSession` for exactly `quotedTotalCents`** (D-49) → **redirect to the checkout URL**. The sync flip (`SET status='confirmed'`) is gone. `placeHold` untouched. New `tests/payments/checkout-create.test.ts` proves charge integrity, extend-hold, no sync flip, owner-gate, and idempotency (4/4 green).
- **Task 2:** `Confirm booking`→**`Confirm & pay`** / `Confirming…`→`Taking you to checkout…`; the reassurance now names the charged amount + rails (`You'll pay {₱total} now — cards, GCash, Maya, or QR Ph…`); `totalLabel` threaded RSC→`ReserveView`→`ReserveActions`; `reserve-view` handles the new `checkout` reason as a calm recovery; `PriceBreakdown` final sub-line → `Final price — no added fees. You'll pay this now.` — booker breakdown stays `subtotal = total` (D-50, no commission line).
- **Task 3:** `PendingPaymentState` (neutral bounded `router.refresh()` poller, `aria-live` status, "taking longer" + manual `Refresh` after the cap, never fabricates `confirmed`) and `PaymentReversedState` (calm coral-CTA landing, mirrors `HoldExpiredState`, never red); `/bookings/[id]` branches on `?paid=1`.

## Task Commits
1. **Task 1 RED — failing checkout-create test** — `c2003e0` (test)
2. **Task 1 GREEN — rewire confirmBooking (D-57/D-58)** — `d2d9e2d` (feat)
3. **Task 2 — Confirm & pay reserve UI + breakdown copy (D-50/D-57)** — `c358872` (feat)
4. **Task 3 — pending-payment + payment-reversed states (D-57/D-58)** — `c07c804` (feat)

_TDD Task 1: `test(05-03)` RED (2 checkout-creating assertions failing against the old sync-flip impl) → `feat(05-03)` GREEN (4/4). No REFACTOR commit needed._

## Contract for Plan 04 (the webhook must produce these states)

**Final `ConfirmResult` union (`src/app/actions/booking.ts`):**
```typescript
export type ConfirmResult =
  | { ok: false; reason: "sign-in"; error: string }
  | { ok: false; reason: "denied";  error: string }
  | { ok: false; reason: "expired"; error: string }
  | { ok: false; reason: "checkout"; error: string }; // NEW — calm checkout-failure / rate-limit retry
// SUCCESS never returns ok:true — it redirects (off-site to checkout, or to /bookings/[id] on idempotent re-entry).
```

**Checkout URL convention (set in `confirmBooking`, base = `BETTER_AUTH_URL`):**
- `success_url` = `${base}/bookings/${holdId}?paid=1`
- `cancel_url`  = `${base}/listings/${bk.listingId}/book?hold=${holdId}`
- `reference_number` = `holdId` (the booking id) · `metadata.booking_id` = `holdId` · `Idempotency-Key` = `checkout:${holdId}`

**`/bookings/[id]?paid=` branch table (what the webhook must drive to resolve each state):**

| DB `booking.status` | `?paid=1`? | Page renders |
|---------------------|-----------|--------------|
| `confirmed`         | any       | the durable **Confirmed** UI (unchanged) |
| `pending`           | yes       | **PendingPaymentState** (finalizing interstitial, auto-refresh) |
| `pending`           | no        | redirect to `/listings/[id]/book?hold=` (abandoned — finish checkout) |
| `cancelled`         | yes       | **PaymentReversedState** (D-58 auto-refund landing) |
| any other non-confirmed | any   | `notFound()` |

So Plan 04's `checkout_session.payment.paid` webhook must, on success, set `status='confirmed'` (+ `expires_at=NULL`, capture `payment_id`) on `reference_number` alone (NOT re-imposing `expires_at > now()`, Pattern-map Pitfall 4) — that flips the interstitial to Confirmed on the next poll. The D-58 backstop must set `status='cancelled'` (after refund) for a gone slot, which the `?paid=1` return renders as **PaymentReversedState**. The owner-gate (`bookerId === userId`) is unchanged and remains the security boundary on both pages.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reused `BETTER_AUTH_URL` for the checkout base instead of the plan's literal `NEXT_PUBLIC_APP_URL`**
- **Found during:** Task 1
- **Issue:** The plan's step-6 snippet used `process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"` but instructed "reuse the existing app-URL convention". `NEXT_PUBLIC_APP_URL` is defined nowhere in the codebase; the actual convention (sibling money action `paymongo-connect.ts`, plus `auth.ts`) is `BETTER_AUTH_URL`, which is set in `.env`, `.env.local`, and `.env.example`. Using the non-existent var would have produced `http://localhost:3000` success/cancel URLs even in deployed environments.
- **Fix:** Used `process.env.BETTER_AUTH_URL ?? "http://localhost:3000"` so the checkout return URLs resolve to the real origin everywhere.
- **Files modified:** `src/app/actions/booking.ts`
- **Commit:** `d2d9e2d`

**2. [Rule 1 - Bug] Updated `tests/booking/state-machine.test.ts` to the new confirmBooking contract**
- **Found during:** Task 1
- **Issue:** Retiring the sync flip (D-57) made 3 Phase-4 assertions (happy→confirmed, expiry-refusal, idempotent-via-confirm) obsolete, and the test lacked a `@/lib/paymongo` mock — so the new `confirmBooking` would have hit the live PayMongo `fetch`. Directly caused by this task's change.
- **Fix:** Added the `@/lib/paymongo` mock (+ unmock) and rewrote the confirmBooking describe block: happy → redirects off-site + stays pending; a lapsed pending hold is EXTENDED not refused (D-58); idempotent re-confirm (confirmed set directly, mirroring the webhook) → no-op redirect with no second checkout.
- **Files modified:** `tests/booking/state-machine.test.ts`
- **Commit:** `d2d9e2d`

**3. [Rule 1 - Doc correctness] Corrected stale `PriceBreakdown` comments (D-50)**
- **Found during:** Task 2
- **Issue:** The Phase-4 comments claimed "Phase 5 inserts `Service fee` / `FitOut commission` rows in the RESERVED slot" — contradicting D-50 (commission is host-side; booker breakdown stays `subtotal = total`).
- **Fix:** Rewrote the header + reserved-slot comments to state the slot renders nothing for the booker and no fee line is ever added here.
- **Files modified:** `src/components/booking/price-breakdown.tsx`
- **Commit:** `c358872`

## Threat surface
No new trust boundaries beyond the plan's `<threat_model>`. All six registered threats (T-05-11..16) are mitigated by this plan: charge integrity (server-frozen amount, action takes only `holdId`), `?paid=1`-is-not-proof (Confirmed only on DB `confirmed`), owner-gate before any checkout, stable idempotency key + already-confirmed short-circuit, calm try/catch (no secret leak), and extend-hold before charge.

## Threat Flags
None — no new network endpoints, auth paths, or schema changes introduced.

## Known Stubs
None. `PaymentReversedState` is only reachable once Plan 04's auto-refund backstop cancels a `?paid=1` booking, and `PendingPaymentState` resolves once Plan 04's webhook confirms — both are intentional cross-plan seams (documented in the branch table above), not stubs. No hardcoded empty data flows to the UI.

## Deferred Issues
None from this plan.

## Pre-existing / out-of-scope (NOT this plan — per environment notes)
- `npm run build` fails on the untouched Phase-2 `PAYMONGO_SECRET_KEY` boot guard (deferred-items.md).
- `npm run lint` errors on `address-autocomplete.tsx:110` (unchanged Phase-2). Self-check scoped to `tsc` + this plan's own files + tests, all green.

## User Setup Required
Not a blocker (tests run on the `mockPayMongo` stub). For real checkout UAT: ensure the checkout return URLs (`BETTER_AUTH_URL`) point at a reachable origin — local dev tunnels via ngrok/cloudflared (no PayMongo CLI), and the `checkout_session.payment.paid` webhook (Plan 04) must be registered to actually flip the interstitial to Confirmed.

## Self-Check: PASSED
- Created files verified present: `src/components/booking/pending-payment-state.tsx`, `src/components/booking/payment-reversed-state.tsx`, `tests/payments/checkout-create.test.ts`, `.planning/phases/05-payments-payouts/05-03-SUMMARY.md`.
- Commits verified in git log: `c2003e0` (T1 test), `d2d9e2d` (T1 feat), `c358872` (T2), `c07c804` (T3).
- No accidental file deletions in the four task commits; no stray untracked files (only this SUMMARY, committed in the final docs commit).
- `npx tsc --noEmit` exit 0; `npx eslint` exit 0 across all 10 changed files; `npx vitest run tests/booking tests/payments tests/paymongo` = 62/62 green.

## TDD Gate Compliance
Task 1 (`tdd="true"`) followed RED → GREEN: `test(05-03)` `c2003e0` (2 checkout-creating assertions failing against the old sync-flip impl) precedes `feat(05-03)` `d2d9e2d` (4/4 green). No REFACTOR commit needed. Plan-level `type: execute` — no plan-wide gate sequence applies.
