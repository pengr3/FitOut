---
phase: 07-bookings-management-cancellation-notifications
reviewed: 2026-07-23T00:00:00Z
depth: standard
files_reviewed: 105
files_reviewed_list:
  - .env.example
  - drizzle/0013_phase7_columns.sql
  - drizzle/0014_phase7_ledger_kind.sql
  - drizzle/0015_booking_payment_method.sql
  - e2e/cancel.spec.ts
  - src/app/(app)/bookings/[id]/cancel/page.tsx
  - src/app/(app)/bookings/[id]/page.tsx
  - src/app/(app)/bookings/loading.tsx
  - src/app/(app)/bookings/page.tsx
  - src/app/(app)/layout.tsx
  - src/app/(host)/host/bookings/[id]/page.tsx
  - src/app/(host)/host/bookings/page.tsx
  - src/app/(host)/host/earnings/page.tsx
  - src/app/(host)/host/layout.tsx
  - src/app/(host)/host/listings/[id]/edit/page.tsx
  - src/app/(host)/host/listings/[id]/edit/wizard.tsx
  - src/app/(host)/host/requests/page.tsx
  - src/app/actions/availability.ts
  - src/app/actions/blocks.ts
  - src/app/actions/booking.ts
  - src/app/actions/cancel-booking.ts
  - src/app/actions/host-requests.ts
  - src/app/actions/listing.ts
  - src/app/actions/notifications.ts
  - src/app/actions/re-request.ts
  - src/app/api/inngest/route.ts
  - src/app/api/paymongo/webhook/route.ts
  - src/app/listings/[id]/book/page.tsx
  - src/app/listings/[id]/page.tsx
  - src/components/availability/availability-calendar.tsx
  - src/components/availability/slot-picker.tsx
  - src/components/booking/booking-row.tsx
  - src/components/booking/booking-status-badge.tsx
  - src/components/booking/booking-status.ts
  - src/components/booking/bookings-tabs.tsx
  - src/components/booking/cancel-confirm.tsx
  - src/components/booking/cancel-request-dialog.tsx
  - src/components/booking/cancellation-policy-disclosure.tsx
  - src/components/booking/expired-approval-state.tsx
  - src/components/booking/price-breakdown.tsx
  - src/components/booking/refund-breakdown.tsx
  - src/components/booking/refund-destination-form.tsx
  - src/components/host/host-booking-row.tsx
  - src/components/host/host-cancel-dialog.tsx
  - src/components/host/payout-row.tsx
  - src/components/host/request-countdown-reason.tsx
  - src/components/host/request-row.tsx
  - src/components/notifications/notification-bell.tsx
  - src/components/notifications/notification-item.tsx
  - src/components/search/search-result-card.tsx
  - src/inngest/functions/notify.ts
  - src/inngest/functions/payout-reconcile.ts
  - src/inngest/functions/payout-sweep.ts
  - src/inngest/functions/reminders.ts
  - src/inngest/functions/request-expiry.ts
  - src/lib/availability/read-model.ts
  - src/lib/availability/units.ts
  - src/lib/booking/all-in-rate.ts
  - src/lib/booking/bookings-query.ts
  - src/lib/booking/when-label.ts
  - src/lib/db/schema.ts
  - src/lib/email.ts
  - src/lib/notifications.ts
  - src/lib/payments/cancellation.ts
  - src/lib/payments/config.ts
  - src/lib/payments/refund-rail.ts
  - src/lib/payments/service-fee.ts
  - src/lib/paymongo.ts
  - src/lib/search/query.ts
  - src/lib/validation/cancellation.ts
  - src/lib/validation/listing.ts
  - src/lib/validation/notification.ts
  - src/lib/validation/qrph-refund.ts
  - tests/auth/secret-config.test.ts
  - tests/availability/expiry-cap.test.ts
  - tests/booking/booking-status.test.ts
  - tests/booking/cancellation-policy.test.ts
  - tests/booking/cancellation.test.ts
  - tests/booking/host-requests.test.ts
  - tests/booking/notify-emission.test.ts
  - tests/booking/re-request.test.ts
  - tests/booking/request-expiry.test.ts
  - tests/booking/request-lifecycle.test.ts
  - tests/booking/service-fee-hold.test.ts
  - tests/booking/views.test.ts
  - tests/booking/when-label.test.ts
  - tests/listing/status-gate.test.ts
  - tests/notifications/notification-render.test.tsx
  - tests/notifications/notify.test.ts
  - tests/notifications/reminders.test.ts
  - tests/payments/cancellation.test.ts
  - tests/payments/earnings-view.test.ts
  - tests/payments/host-cancel.test.ts
  - tests/payments/ledger-freeze.test.ts
  - tests/payments/payout-reconcile.test.ts
  - tests/payments/payout-sweep.test.ts
  - tests/payments/service-fee.test.ts
  - tests/paymongo/instapay-refund.test.ts
  - tests/paymongo/refund.test.ts
  - tests/paymongo/webhook-payment-paid.test.ts
  - tests/security/bookings-owner-scope.test.ts
  - tests/security/cancel-owner-gate.test.ts
  - tests/security/notification-owner-scope.test.ts
  - tests/validation/listing-schema.test.ts
findings:
  critical: 2
  warning: 9
  info: 11
  total: 22
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-07-23
**Depth:** standard
**Files Reviewed:** 105
**Status:** issues_found

## Summary

Phase 7 (bookings management, cancellation, refunds, payouts, notifications) was reviewed with the money and security surfaces weighted first. The core money invariants hold and are well-defended: the refund quote is server-computed from the frozen snapshot against the DB clock, all refund dispatch flows through `isApiRefundable`, the `refund:` vs `payout:` idempotency namespaces are distinct, the QRPh destination is never persisted or logged (verified in both the action and `src/lib/paymongo.ts`, and pinned by `tests/paymongo/instapay-refund.test.ts`), every `host_payout_ledger` read/write I traced carries `kind` scoping, `emitNotify` fires only after commits, and owner scoping lives inside SQL WHERE clauses on every action and read path. The test suite is unusually strong (positive controls, byte-equal denial oracles, mutation-verified owner scopes, wire-level HTTP assertions).

The defects found are concentrated in the *communication* half of the money system (notifications/emails that misstate financial facts) and in the *retry/reconcile* half of the payout pipeline (failure paths that diverge from the frozen ledger). Two findings are Critical: a "Refund issued — ₱0" notification+email sent on every no-refund cancellation, and lifecycle emails that state flat config deadlines (24h SLA / 12h payment window) that are provably false whenever the D-96 session-start cap bites — the exact failure the codebase's own D-99 commentary forbids. Nine Warnings cover the payout retry paths, an amount-blind refund webhook, misdirected host cancellation copy, and a re-request repricing bug. No SQL injection, XSS, IDOR, or secret-handling vulnerabilities were found.

## Critical Issues

### CR-01: Zero-refund cancellation emits a "Refund issued — ₱0" notification and email

**File:** `src/app/actions/cancel-booking.ts:628-632` (with the contradicted guard at `:306-322`)
**Issue:** `cancelBookingAsBooker` unconditionally passes `formatMoney(quote.totalRefundCents, …)` to `notifyCancellation`. `notifyCancellation` only suppresses the booker's `refund_issued` notice when the label is `null` — which the code comment says exists because "a '₱0 refunded' notice would invent an event that never happened." But on a 0% rung (any cancellation inside the no-refund window — a common, everyday path), `totalRefundCents` is `0`, `formatMoney(0, …)` is the non-null string `"₱0"`, and the booker receives an in-app notification "Refund issued — ₱0" plus the `sendRefundIssued` email: "We've issued a refund of ₱0 … Refunds usually land back on your original payment method within a few days." No money moved. This directly contradicts the function's own documented rule, the D-79 rule ("NEVER render a bare ₱0 refunded without the reason"), and the review page the booker just saw ("Refund to you: ₱0"). `CancelConfirm`'s success toast ("Your refund is on its way.") has the same defect on this path. No test covers notification emission at the 0% rung (`tests/booking/cancellation.test.ts` case 12 only exercises a 100% refund; case 6 exercises the 0% rung but does not assert emissions).
**Fix:**
```ts
// cancel-booking.ts — only tell the booker a refund exists when one does:
await notifyCancellation(
  row,
  bookingId,
  quote.totalRefundCents > 0
    ? formatMoney(quote.totalRefundCents, row.currency ?? DISPLAY_CURRENCY)
    : null,
);
```
And in `cancel-confirm.tsx`, branch the toast on `res.refundCents > 0` ("Booking cancelled." vs "Booking cancelled. Your refund is on its way."). Add an emission assertion at the 0% rung to `tests/booking/cancellation.test.ts`.

### CR-02: Lifecycle emails state flat config deadlines that are false whenever the D-96 cap bites

**File:** `src/lib/email.ts:147-165` (sendRequestApproved), `:197-217` (sendNewRequestToHost), `:124-140` (sendRequestReceived); `src/inngest/functions/notify.ts:89-97, 105-114`
**Issue:** The notification payloads deliberately carry the row's REAL capped deadline (`payByLabel` from the `LEAST(now()+window, starts_at)` expiry; `respondByLabel` from the proportional D-96 split) — `approveRequest` even reads it back off the UPDATE's RETURNING specifically because "telling a booker they have 12 hours when the window actually closes when the session starts is the exact failure D-99 names" (`host-requests.ts:259-263`). But `sendForType` drops both fields on the floor, and the email templates render the flat constants instead:
- `sendRequestApproved`: "Pay ₱X within **${APPROVAL_PAYMENT_WINDOW_HOURS} hours** to lock it in" — false whenever the session starts within 12h of approval.
- `sendNewRequestToHost`: "Respond within **${APPROVAL_SLA_HOURS} hours** to approve or decline" — false for every request made less than ~48h before its session (the D-96 split gives the host as little as 1h). A host who trusts this email will find the request auto-declined long before the deadline the platform stated in writing.
- `sendRequestReceived`: "You'll hear back within **${APPROVAL_SLA_HOURS} hours**" — same overstatement.
The in-app channel renders the correct deadline; the email channel — the channel D-82/D-89 made load-bearing — states a wrong one, so the two channels of one event disagree (the exact drift D-91 exists to prevent). Short-notice requests are precisely where this bites, and the consequence is lost bookings.
**Fix:** Thread the payload's deadline strings into the sends and drop the constants from the copy:
```ts
// notify.ts
case "request_approved":
  await sendRequestApproved(to, payload.listingTitle, payload.whenLabel,
    payload.totalLabel, payload.payByLabel, payload.href);
case "new_request_to_host":
  await sendNewRequestToHost(to, payload.listingTitle, payload.whenLabel,
    payload.bookerLabel, payload.totalLabel, payload.respondByLabel, payload.href);
```
```ts
// email.ts — e.g. sendRequestApproved body:
`Pay ${total} by ${payBy} to lock it in.`
// sendNewRequestToHost body:
`Respond by ${respondBy} to approve or decline.`
```
`sendRequestReceived` has no deadline field in its payload; either add one or soften the copy to not state a number.

## Warnings

### WR-01: Payout retry recomputes the commission instead of using the frozen ledger row

**File:** `src/inngest/functions/payout-sweep.ts:171-196, 276-311`
**Issue:** On a WR-04 re-claim of a `failed` payout row, the `ON CONFLICT DO UPDATE` deliberately preserves the FROZEN `commission_rate_bps` / `commission_cents` / `net_cents` (D-51). But `payOne` then computes the transfer from its *local* `computeCommission(payoutGrossCents)` — evaluated at the CURRENT `COMMISSION_RATE_BPS`. If the rate changed between the original claim and the retry (a redeploy with a new env value inside the 72h retry window), the transfer fires for a different amount than the frozen `net_cents` the ledger permanently records — the ledger/transfer divergence D-51 exists to make impossible. The claim already RETURNs `recovered_cents`; the frozen money columns are one RETURNING away.
**Fix:**
```sql
RETURNING id, recovered_cents AS "alreadyDeducted",
  gross_cents AS "frozenGross", net_cents AS "frozenNet"
```
Use `frozenNet` (not the locally recomputed `netCents`) for the deduction clamp and the transfer amount on every path after the claim.

### WR-02: Retrying a transfer that was created-then-failed replays the same Idempotency-Key; reconcile's `failed` flip never bumps `updated_at`

**File:** `src/inngest/functions/payout-sweep.ts:187-196, 294-300`; `src/lib/paymongo.ts:269, 286`; `src/inngest/functions/payout-reconcile.ts:104-109`
**Issue:** Two related defects on the failure path. (a) When a transfer was successfully *created* and later reported terminal-`failed` by the reconcile poll, the WR-04 retry re-claims the row and calls `createBatchTransfer` again with the same stable `payout:<bookingId>` Idempotency-Key. PayMongo's documented idempotency replays the ORIGINAL create response — the same (failed) transfer id — so the sweep marks the row `processing` with the dead transfer id, the reconcile flips it `failed` again, and the row flaps held→processing→failed until `PAYOUT_RETRY_MAX_AGE_HOURS` parks it. The retry mechanism can never actually recover this class of failure, while masking the terminal failure for another cycle each hour. (b) `reconcileOne`'s failed UPDATE is `SET state='failed'` with no `updated_at = now()` (raw SQL — drizzle's `$onUpdate` does not apply), so the retry backoff (`updated_at <= now() - backoff`) is measured from the *processing* timestamp, not the failure — a slow-failing transfer is re-swept immediately.
**Fix:** (a) Before re-firing, branch on the re-claimed row's `transfer_id`: if set, poll `getTransfer` instead of re-creating; only call `createBatchTransfer` when `transfer_id IS NULL` (the create never landed). (b) `SET state='failed', updated_at = now()` in `reconcileOne`.

### WR-03: `handleRefund` is amount-blind — a partial refund cancels a live booking; a settled cancel-refund raises a false clawback alert

**File:** `src/app/api/paymongo/webhook/route.ts:298-361`
**Issue:** `handleRefund` treats ANY terminal-success refund event on a payment as a full cancellation. Two concrete failure modes: (1) An operator issuing a partial goodwill refund (e.g. ₱100 of a ₱1,050 booking) from the PayMongo dashboard flips the whole confirmed booking to `cancelled` — freeing the slot for a session that is still happening, and (because `retained_space_cents` stays NULL, so `COALESCE(retained,0) > 0` is false) permanently suppressing the host's payout for a session they may deliver. (2) For a partial *booker cancellation* on a card rail, the refund can settle 5-10 days later — after the retained-share payout has already fired at `endsAt + 24h`. The webhook then finds the ledger row `processing`/`paid` and raises the `refund_after_payout` needs_attention clawback alert for a perfectly normal partial cancellation. Operators trained to ignore that alert will miss a real post-payout clawback. The Refund resource carries an `amount`; nothing reads it.
**Fix:** Read `attrs.amount` off the verified refund resource. Skip both the booking flip and the clawback alert when the booking is already `cancelled` and the amount matches `booking.refund_cents` (the recorded cancellation refund settling). Only treat a refund as booking-terminal when it is a full refund of `quoted_total_cents`; alert (without cancelling) on a partial refund of a confirmed booking.

### WR-04: The host's copy of the host-cancellation notification tells the HOST they are getting the refund

**File:** `src/app/actions/cancel-booking.ts:1038-1052`; `src/lib/email.ts:257-275`; `src/components/notifications/notification-item.tsx:166-171`
**Issue:** `cancelBookingAsHost` emits `booking_cancelled_by_host` to BOTH parties with the same payload type, and both the email template and the in-app renderer compose booker-oriented copy. The host therefore receives an email reading "We're sorry — the host cancelled your booking at X … **You're getting a full refund of ₱1,050**, including the service fee," and an in-app row titled "**Your host cancelled** … ₱1,050 refunded." Both statements are wrong for the host: they are the canceller, they receive nothing, and they owe the D-71 fee. The code comment promises the host "a durable record of what they did and what it cost" — the fee never appears in either channel; the fee's only in-writing record is the dialog checkbox.
**Fix:** Add a host-facing payload variant (e.g. `host_cancellation_record` with `feeLabel`/`refundLabel`) or a `side` discriminant on the existing payload, with its own email template ("You cancelled X's booking. ₱1,050 is being refunded to them and a ₱300 fee will be deducted from your next payout.") and `describeNotification` branch.

### WR-05: `handleGoneSlot` leaves `cancelled_by` NULL, so a charged-and-refunded booker later reads "You weren't charged anything"

**File:** `src/app/api/paymongo/webhook/route.ts:192-195`; consumed at `src/app/(app)/bookings/[id]/page.tsx:406-427`
**Issue:** The D-58 gone-slot backstop flips the booking `cancelled` without setting `cancelled_by`. A request-mode booking reversed this way then satisfies the D-97 lapse predicate on the detail page (`cancelledBy === null && bookingMode === 'request' && paymentId === null` — the confirm UPDATE that would have written `payment_id` claimed 0 rows), so any revisit without `?paid=1` renders the ExpiredApprovalState: "The payment window for this booking closed … **You weren't charged anything**" — to a booker who WAS charged and whose refund is in flight. The page documents this edge as "vanishingly rare" but the fix is a one-word change that makes the two events distinguishable, and the `cancelled_by` enum already has the `system` value for exactly this.
**Fix:**
```sql
UPDATE booking SET status = 'cancelled', cancelled_by = 'system'
WHERE id = ${bookingId} AND status <> 'confirmed'
```
The genuine lapse paths (request-expiry cron, in-tx sweep) leave `cancelled_by` NULL, so the D-97 predicate keeps working and the gone-slot case falls to the truthful generic cancelled branch.

### WR-06: Re-request misclassifies an hourly window as full-day after any hourly-rate change — repricing the hold at the day rate

**File:** `src/app/actions/re-request.ts:215-218`
**Issue:** `fullDay` is re-derived as `spaceCents !== currentHourlyRate * hours`. The frozen `spaceCents` was priced at the rate in force at the ORIGINAL booking; if the host has since changed `hourlyRateCents`, every hourly re-request fails the equality and is minted with `fullDay: true` — `createPendingHold` then quotes the flat DAY rate for a 1-2 hour window (e.g. a ₱1,000 hourly window re-requested at the ₱3,000 day rate). The same derivation in `when-label.ts` is display-only; here it is price-determining. Pay-on-approval means the booker sees the wrong total before paying, but the "one-click, nothing to re-enter" recovery flow silently produces a request for triple the price, which the host may approve.
**Fix:** Persist the full-day flag at booking creation (a nullable `full_day boolean` column written by `createPendingHold`) and read it here; failing that, derive from the frozen split against the *frozen-era* semantics (e.g. treat `spaceCents === listing.dayRateCents` as the full-day signal and default to hourly otherwise) rather than against the current hourly rate.

### WR-07: `placeHold`'s request branch re-emits both notifications on an idempotent replay

**File:** `src/app/actions/booking.ts:219-246` (contrast `src/app/actions/re-request.ts:281`)
**Issue:** When `createPendingHold` replays an existing hold (double-submit, re-entering checkout), the request branch emits `request_received` and `new_request_to_host` again — the host gets a duplicate "New booking request" email and in-app row for one request. `reRequestSameWindow` explicitly guards the identical emission with `if (asRequest && !res.replayed)` and documents the duplicate as a must-not ("a double-click must not send the host the same request twice"); `placeHold` has `res.replayed` in hand and ignores it (its comment only ensures the replayed numbers match, not that the emission is suppressed).
**Fix:** Wrap the two `emitNotify` calls in `if (!res.replayed) { … }`, mirroring re-request.ts.

### WR-08: Raw `db.execute` timestamptz reads bypass the isoUtc/readDbNow boundary contract

**File:** `src/app/actions/booking.ts:339-341`; `src/lib/availability/units.ts:246-263`; `src/lib/availability/read-model.ts:77, 155-164`
**Issue:** The repo's own boundary contract (documented at `bookings-query.ts:89-114` and enforced elsewhere) is that timestamptz values read through raw `execute` must flow through the `to_char` ISO mask + one hydration point, or through `readDbNow`. Three sites violate it: (1) `confirmBooking` reads `SELECT now() AS "now"` raw and coerces with `new Date(nowRows[0].now)` — this is the D-94 start-time guard on the *checkout money path*, and `readDbNow` exists precisely for it; (2) `findOwnActiveHold` coerces raw `expires_at` with `new Date(r.expires_at)`; (3) `read-model.ts`'s `RangeRow` coerces raw `starts_at`/`ends_at` (and its own comment claims the driver decodes to Date, contradicting the bookings-query contract). All three happen to work on V8's lenient parser for Postgres text timestamps, but they rely on exactly the "implementation-defined leniency" the contract forbids, and they are the pattern the contract says a refactor will get subtly wrong.
**Fix:** Replace `confirmBooking`'s inline read with `const nowFromDb = await readDbNow(db);` and route the other two through the exported `isoUtc` mask (or a Drizzle `select()`, which hydrates real Dates).

### WR-09: `listWalletAccounts` has no pagination — payout correlation silently breaks past one API page

**File:** `src/lib/paymongo.ts:445-459`; consumed at `src/inngest/functions/payout-sweep.ts:205-206`
**Issue:** The sweep resolves each host's wallet by fetching `GET /v2/wallets?status=activated` and `find()`ing the matching id. The helper reads only the first response page (`json.data`), with no cursor/`has_more` handling. Once the platform's activated wallets exceed PayMongo's page size, every host whose wallet falls off page one takes the no-wallet path on every sweep: claim rolled back, `[payout-alert] no activated wallet` fired hourly, host never paid — a silent, permanent per-host payout outage that looks like an onboarding problem. Fail-closed (no wrong-host payment), but a scale time bomb on a money path.
**Fix:** Either paginate the wallet listing (follow the API's cursor until exhausted), or fetch the single wallet directly by the stored `paymongo_account_id` (e.g. `GET /v2/wallets/{id}`) instead of scanning a global list.

## Info

### IN-01: Inconsistent app-base-URL fallbacks; unset `BETTER_AUTH_URL` in prod yields localhost links in notifications

**File:** `src/app/actions/cancel-booking.ts:275-277`; `src/lib/email.ts:92`; `src/app/actions/booking.ts:218,385`; `src/app/actions/host-requests.ts:258,324`; `src/inngest/functions/reminders.ts:323`; `src/app/api/paymongo/webhook/route.ts:255`
**Issue:** Seven call sites fall back to `http://localhost:3000` while `email.ts` falls back to `""`. Auth's boot guard requires only the SECRET, so a prod deploy missing `BETTER_AUTH_URL` boots fine and every notification/email link points at localhost.
**Fix:** One shared `appBaseUrl()` helper, and include `BETTER_AUTH_URL` in the production fail-closed boot guard.

### IN-02: List rows claim "₱X refunded" while the detail page insists "refund on its way" (D-57 tension)

**File:** `src/app/(app)/bookings/page.tsx:61`; `src/app/(host)/host/bookings/page.tsx:71`; `src/app/(host)/host/bookings/[id]/page.tsx:126-132`
**Issue:** The detail page carefully never claims settled refund state off the POST ("₱500 refund on its way"), but the list rows and the host detail sibling line render "₱500 refunded" from the same unsettled `refund_cents` column.
**Fix:** Align the sibling-line copy with the detail page ("refund on its way") until a settled-refund signal is persisted.

### IN-03: The punitive-block sentinel string is duplicated as two independent constants

**File:** `src/app/actions/cancel-booking.ts:741` (`HOST_CANCEL_BLOCK_REASON`); `src/app/actions/blocks.ts:149` (`SYSTEM_BLOCK_REASON`)
**Issue:** blocks.ts claims the constant exists "so the writer and this refusal can never drift apart on a string literal" — but the writer defines its own copy in another file. Tests pin both today; a rename in one file would silently disarm the anti-resell refusal.
**Fix:** Export one constant (e.g. from a shared module or blocks.ts) and import it in cancel-booking.ts.

### IN-04: `refundLabelFor` duplicated verbatim across the two list pages

**File:** `src/app/(app)/bookings/page.tsx:54-62`; `src/app/(host)/host/bookings/page.tsx:64-72`
**Issue:** Identical function in both files; the zero-refund copy is exactly the kind of string a future edit changes in one place only.
**Fix:** Move to a shared module (e.g. next to `booking-status.ts`).

### IN-05: Rung-range prose renders descending ("the 24–6 hours before the session window")

**File:** `src/app/(app)/bookings/[id]/cancel/page.tsx:61`
**Issue:** `rungDescription` interpolates `${rungs[i-1].minHours}–${rungs[i].minHours}`, producing "24–6 hours" rather than "6–24 hours". Comprehensible but reads reversed on the highest-stakes screen.
**Fix:** Swap the interpolation order: `${rungs[i].minHours}–${rungs[i-1].minHours} hours before the session`.

### IN-06: Manual-refund paths still surface the optimistic "refund is on its way" client copy

**File:** `src/components/booking/cancel-confirm.tsx:41`; `src/app/(app)/bookings/[id]/cancel/page.tsx:263-273`; `src/app/actions/cancel-booking.ts:502-505`
**Issue:** When the QRPh institutions list is unverifiable, the page says "our team will arrange your refund with you directly" but the plain `CancelConfirm` then toasts "Your refund is on its way." The same toast fires for the sub-₱1-floor and null-`paymentId` legacy edges, which route to `refund_manual_required`.
**Fix:** Have the action return the existing `notice` field on all manual-dispatch paths (not just the destination ones) and have `CancelConfirm` prefer it, as `RefundDestinationForm` already does.

### IN-07: A deactivated host with due bookings is re-swept and re-alerted every hour forever

**File:** `src/inngest/functions/payout-sweep.ts:99-135, 207-221`
**Issue:** `queryDuePayouts` never checks `host_payout.payouts_enabled`/`activation_status`, and un-claimed (`p.id IS NULL`) bookings have no max-age cutoff. A host deactivated by `merchant.deactivated` produces the no-wallet rollback plus `[payout-alert]` on every hourly sweep, indefinitely — alert-channel noise that trains operators to ignore it.
**Fix:** Either filter `payouts_enabled = true` in the due query (surfacing deactivated-host money through a separate, once-per alert) or rate-limit the no-wallet alert per booking.

### IN-08: Wizard publish checklist uses hardcoded step indices next to a derived one

**File:** `src/app/(host)/host/listings/[id]/edit/wizard.tsx:330-354`
**Issue:** `CANCELLATION_STEP` is derived from `STEPS`, but every other checklist row hardcodes `step: 0…4`. A future step reorder breaks the "Fix" links silently.
**Fix:** Derive all indices via `STEPS.findIndex` (or a `stepIndex("pricing")` helper).

### IN-09: `composeWhenLabel` relabels historical hourly bookings as "Full day" after an hourly-rate edit

**File:** `src/lib/booking/when-label.ts:60-67`
**Issue:** The fullDay re-derivation compares the frozen space price against the listing's CURRENT rate; any rate change flips every existing hourly booking's label to "Full day" on all surfaces and emails. Display-only (the header acknowledges the shipped behaviour), but it is the same root cause as WR-06 and would be fixed by the same persisted flag.
**Fix:** Persist `full_day` at creation (see WR-06) and prefer it here when present.

### IN-10: Mark-read actions revalidate only two routes while the bell renders on every page

**File:** `src/app/actions/notifications.ts:61-64`
**Issue:** `revalidateBellSurfaces` covers `/bookings` and `/host/bookings` only; the badge on `/bookings/[id]`, `/profile`, `/host/requests`, `/host/earnings`, etc. stays stale until the 30s poller tick.
**Fix:** Acceptable as-is given the poller; if tightening, `router.refresh()` after the action (the bell already does this for mark-all) covers the current page.

### IN-11: A permanently-failed payout leaves the netted cancel-fee debit marked recovered against a payout that never paid

**File:** `src/inngest/functions/payout-sweep.ts:246-276, 312-325`
**Issue:** The D-71 deduction is applied to the debit rows (possibly flipping them `paid`) *before* the transfer fires; if the transfer then fails and the row eventually parks `failed` past `PAYOUT_RETRY_MAX_AGE_HOURS`, the debit ledger reads fully recovered via a payout that never paid out. The memoised `recovered_cents` on the payout row is the only breadcrumb; an operator manually resolving the failed payout must know to honour it.
**Fix:** Document the memo explicitly in the operator-facing alert (include `recovered_cents` in the `[payout-alert] payout attempt failed` log line), or defer the debit application to after a successful transfer create, keeping the single-statement atomicity per attempt.

---

_Reviewed: 2026-07-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
