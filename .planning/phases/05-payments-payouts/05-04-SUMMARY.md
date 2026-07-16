---
phase: 05-payments-payouts
plan: 04
subsystem: payments
tags: [paymongo, webhook, confirm-authority, auto-refund, refund-events, d-57, d-58, d-60, qrph]

# Dependency graph
requires:
  - phase: 05-payments-payouts
    plan: 01
    provides: "host_payout_ledger (booking_id UNIQUE, payout_ledger_state), booking.payment_id, php currency reconcile"
  - phase: 05-payments-payouts
    plan: 02
    provides: "createRefund(/v1) — the auto-refund + refund-mechanism primitive (FAILS QRPh/UBP by design)"
  - phase: 05-payments-payouts
    plan: 03
    provides: "confirmBooking RETIRES the sync flip → this webhook is the confirm authority; the /bookings/[id]?paid= branch table (PendingPaymentState / PaymentReversedState) this webhook must drive"
  - phase: 02-listings-host-onboarding
    provides: "the single-writer, Paymongo-Signature-verified, paymongo_event-deduped webhook route this plan EXTENDS"
provides:
  - "checkout_session.payment.paid handler = the SINGLE confirm writer (D-57): flips booking pending→confirmed on reference_number ALONE (no expires_at>now() re-check), captures the pay_..., replay-safe, signature-verified"
  - "handleGoneSlot = the D-58 auto-refund backstop: refund on refundable rails / operator-alert on QRPh·UBP (never silent retention), sets the booking terminal (cancelled) so ?paid=1 renders PaymentReversedState"
  - "payment.refunded / payment.refund.updated handlers = the D-60 refund mechanism: idempotently flip host_payout_ledger held→refunded + booking→cancelled, mapped by the verified payment id"
  - "AuditOutcome gains 'needs_attention' — the money-adjacent operator-alert outcome"
affects: [05-05a, 05-05b, 05-06, payments, payout-sweep, host-earnings, PAY-01, PAY-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extend the single-writer webhook switch with a new branch: state DERIVED from the verified event TYPE, booking id from the event's reference_number, never a client body field"
    - "0-row confirm ⇒ re-read to distinguish a benign replay (already confirmed → no-op) from a genuinely gone slot before ever refunding"
    - "Refundability branch on the payment method (REFUNDABLE_RAILS set); unrefundable rails + refund-API failures route to a structured [PAYMENT_ALERT] log + recordAudit(outcome:'needs_attention'), never a silent 500/retention"
    - "Terminal-state flip guarded status<>'confirmed' (gone-slot) / status<>'cancelled' (refund) so re-runs are idempotent and never clobber the winner"

key-files:
  created:
    - tests/paymongo/webhook-payment-paid.test.ts
    - tests/paymongo/webhook-refund.test.ts
  modified:
    - src/app/api/paymongo/webhook/route.ts
    - src/lib/audit.ts

key-decisions:
  - "Added a re-read guard in handleGoneSlot (short-circuit when already confirmed/missing) — NOT in the plan snippet; required so a benign re-delivery of an already-confirmed+paid booking can never trigger a false auto-refund (Rule 2 correctness)"
  - "Extended AuditOutcome with 'needs_attention' so the plan's typed recordAudit operator-alert compiles (Rule 3 blocking) — kept the stable actorId/action/outcome/meta shape a durable sink can adopt later"
  - "Refund handler uses drizzle typed .update() (booking + host_payout_ledger) rather than raw SQL — keeps the schema imports used and the enum/status writes type-safe; the payment.paid confirm stays raw sql for the RETURNING row-count probe"
  - "Refund correlation keys on the verified payment id (booking.payment_id / host_payout_ledger.payment_id) — the ledger's payment_id column exists for exactly this refund correlation (schema comment)"

patterns-established:
  - "New PayMongo event branches slot into the existing verify→dedupe→derive-from-type→single-writer skeleton with ZERO change to verifySignature or the paymongo_event replay guard"
  - "Never keep money for an undeliverable slot: refundable→API refund; unrefundable/failed→operator alert (needs_attention); both paths still return 200 (no retry storm, no silent retention)"

requirements-completed: [PAY-01]

# Metrics
duration: 9min
completed: 2026-07-16
---

# Phase 5 Plan 04: Payment.paid Confirm Authority + Refund Mechanism Summary

**Made the PayMongo webhook the sole confirm authority (D-57): `checkout_session.payment.paid` flips a booking `pending→confirmed` on `reference_number` alone (no expiry re-check) and captures the `pay_...`; a 0-row confirm triggers the D-58 auto-refund backstop (refund on card/GCash/GrabPay/Maya, operator-alert on QRPh/UBP — never silent retention); `payment.refunded`/`payment.refund.updated` idempotently mark the booking + payout ledger refunded (D-60).**

## Performance
- **Duration:** ~9 min
- **Started:** 2026-07-16T12:43:31Z
- **Completed:** 2026-07-16T12:52:36Z
- **Tasks:** 3
- **Files:** 4 (2 created, 2 modified)

## Accomplishments
- **Task 1 (D-57 confirm authority):** Extended the single-writer webhook with a `checkout_session.payment.paid` branch. It derives `bookingId = event.data.attributes.data.attributes.reference_number` and `paymentId = ...payments[0].id` from the VERIFIED event, then `UPDATE booking SET status='confirmed', expires_at=NULL, payment_id=$paymentId WHERE id=$bookingId AND status='pending' RETURNING id`. The confirm keys on `status='pending'` **alone** — the Phase-4 `expires_at > now()` guard is deliberately NOT re-imposed (Pitfall 4): a legitimately-paid-but-lapsed hold must still confirm, and the GiST EXCLUDE (not the TTL) is the double-confirm authority. Widened `PayMongoEvent` with a shared `PayMongoResource` type. Replay-safe via the existing `paymongo_event` dedupe; forged signatures still 400.
- **Task 2 (D-58 auto-refund backstop):** Implemented `handleGoneSlot`. It first re-reads the booking to distinguish a **benign replay** (already `confirmed` → no-op, never refund a paid booking) from a **genuinely gone slot** (swept + retaken). For a gone slot it refunds the **server-frozen** `quoted_total_cents` on refundable rails (`card`, `gcash`, `grab_pay`, `paymaya`) via `createRefund`; on QRPh/UBP/unknown or a failed refund it raises a structured `[PAYMENT_ALERT]` log + `recordAudit(outcome:'needs_attention')` (never a silent 500 or money retention, Pitfall 1). Both branches set the booking `cancelled` (guard `status<>'confirmed'`) so the `?paid=1` return renders `PaymentReversedState`. Proved the double-book-during-payment edge: the swept loser is reversed while the pending winner stays confirmable.
- **Task 3 (D-60 refund mechanism):** Added `payment.refunded` / `payment.refund.updated` branches. `resolveRefundPaymentId` derives the `pay_...` from the verified refund event; `handleRefund` idempotently flips any `host_payout_ledger` row `held→refunded` and marks the booking `cancelled` (keeps it out of the Plan-05 payout sweep, which selects only `confirmed`). A pre-payout refund is just a platform-wallet refund — no host clawback (payout is held to T+24h). Replay is a 200 no-op via the `paymongo_event` dedupe.

## Task Commits
1. **Task 1 — checkout_session.payment.paid confirm authority (D-57)** — `3030e0d` (feat)
2. **Task 2 — D-58 auto-refund backstop + QRPh operator-alert** — `9fda1fb` (feat)
3. **Task 3 — payment.refunded / payment.refund.updated handlers (D-60)** — `bacb114` (feat)

## Files Created/Modified
- `src/app/api/paymongo/webhook/route.ts` — Added the payment.paid confirm branch, `handleGoneSlot`, the refund branch + `handleRefund`/`resolveRefundPaymentId`, `REFUNDABLE_RAILS`, and the widened `PayMongoEvent`/`PayMongoResource` types. `verifySignature` + the `paymongo_event` dedupe are untouched.
- `src/lib/audit.ts` — Extended `AuditOutcome` with `"needs_attention"`.
- `tests/paymongo/webhook-payment-paid.test.ts` — Confirm, past-expiry confirm, browser-return control, replay-once, forged-signature 400, card auto-refund-once, QRPh operator-alert, double-book loser reversed (8 tests).
- `tests/paymongo/webhook-refund.test.ts` — refunded + refund.updated transitions, replay-once idempotency, forged-signature 400 (4 tests).

## Asserted Contract (for Plans 05/06)

**`checkout_session.payment.paid` payload nesting (A1 — asserted against the seeded test events):**
```
event.data.id                                      = the event id (paymongo_event dedupe key)
event.data.attributes.type                         = "checkout_session.payment.paid"
event.data.attributes.data                         = the CheckoutSession resource
  .attributes.reference_number                     = booking.id   (the confirm key — NEVER a client field)
  .attributes.payments[0].id                       = pay_...       (captured into booking.payment_id)
  .attributes.payments[0].source.type              = the rail (card|gcash|grab_pay|paymaya|qrph|dob_ubp)
  .attributes.payment_method_used                  = fallback rail if source.type absent
```
**Refund events** (`payment.refunded` / `payment.refund.updated`): the payment id is read from `event.data.attributes.data.attributes.payment_id` (Refund resource), falling back to `...attributes.payment.id` or a `pay_`-prefixed resource `id`.

**Refundable vs unrefundable rails (Pitfall 1):**
- Refundable via `createRefund`: `card`, `gcash`, `grab_pay`, `paymaya` (Maya same-day full is acceptable).
- Unrefundable (operator-alert, `needs_attention`): `qrph`, `dob_ubp`, `unknown`, and any `paymentId`-absent case; a `createRefund` throw also falls through to the alert.

**Terminal booking state the auto-refund sets:** `status='cancelled'` (guard `status<>'confirmed'`). This is exactly what Plan 03's `/bookings/[id]?paid=1` branch table renders as **PaymentReversedState** — the contract stays consistent. There is no `refunded` value in the `booking_status` enum, so `cancelled` is the terminal reversed state for both the auto-refund and the refund-event paths; it also excludes the booking from the Plan-05 payout sweep (which selects only `confirmed`).

## Decisions Made
See `key-decisions` frontmatter. The two material choices: the `handleGoneSlot` re-read guard (never refund an already-confirmed booking on replay) and extending `AuditOutcome` with `needs_attention`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Re-read guard in `handleGoneSlot` to never refund an already-confirmed booking**
- **Found during:** Task 2 (auto-refund backstop)
- **Issue:** The plan's 0-row branch called the auto-refund unconditionally. But a `checkout_session.payment.paid` re-delivered under a NEW event id (not deduped) for an already-`confirmed` booking also yields 0 rows (the `status='pending'` guard no longer matches) — the plan's snippet would then auto-refund a legitimately paid+confirmed booking.
- **Fix:** `handleGoneSlot` re-reads the booking first and returns a no-op when `status='confirmed'` (or the row is missing). Only a genuinely non-confirmed row proceeds to refund/alert.
- **Files modified:** `src/app/api/paymongo/webhook/route.ts`
- **Verification:** Covered implicitly by the replay-once test (confirmed booking, no refund) and the gone-slot tests (cancelled booking, refund fires); `npx vitest run tests/paymongo` green.
- **Committed in:** `9fda1fb` (Task 2 commit) — the stub form landed in `3030e0d` (Task 1).

**2. [Rule 3 - Blocking] Extended `AuditOutcome` with `"needs_attention"`**
- **Found during:** Task 2 (operator-alert path)
- **Issue:** The plan mandates `recordAudit({ ..., outcome: 'needs_attention' })`, but `AuditOutcome` was `"ok" | "denied" | "error"` — the typed call would not compile (`tsc` failure).
- **Fix:** Added `"needs_attention"` to the union with a doc comment; kept the stable entry shape a durable sink can adopt unchanged.
- **Files modified:** `src/lib/audit.ts`
- **Verification:** `npx tsc --noEmit` exit 0; the QRPh test asserts `recordAudit` called with `outcome:'needs_attention'`.
- **Committed in:** `9fda1fb` (Task 2 commit).

**3. [Rule 3 - Blocking] Refund handler uses drizzle typed `.update()` rather than raw SQL**
- **Found during:** Task 3
- **Issue:** Writing the ledger/booking refund as raw `db.execute(sql...)` would leave the `hostPayoutLedger`/`booking` schema imports unused (eslint `no-unused-vars`).
- **Fix:** Used `db.update(hostPayoutLedger)` / `db.update(booking)` with `and/eq/ne` predicates — type-safe enum writes that consume the imports.
- **Files modified:** `src/app/api/paymongo/webhook/route.ts`
- **Verification:** `npx eslint` exit 0.
- **Committed in:** `bacb114` (Task 3 commit).

---

**Total deviations:** 3 auto-fixed (1 missing-critical correctness, 2 blocking).
**Impact on plan:** No scope creep — all three are correctness/compile requirements directly caused by this plan's changes. The webhook remains a pure extend-in-place of the Phase-2 single-writer route.

## Threat surface
All six registered threats mitigated: T-05-17 (forged/replayed payment/refund → 400 via `verifySignature`; replay → 200 no-op via `paymongo_event` — tested both), T-05-18 (state derived from the verified type; confirm reads `reference_number`, refund amount is the frozen booking amount — never a client field), T-05-19 (0-row confirm → auto-refund / QRPh operator-alert, never silent retention), T-05-20 (confirm on `status='pending'` alone; the EXCLUDE, not the TTL, prevents a double-confirm), T-05-21 (structured PII-free `[PAYMENT_ALERT]` lines; generic 200/400 responses; secret stays server-only), T-05-22 (GiST EXCLUDE is the double-book authority; the loser gets 0 rows → auto-refund/alert — proven by the double-book-during-payment test).

## Threat Flags
None — no new network endpoints, auth paths, or schema changes; the webhook route already existed as the Phase-2 trust boundary and is only extended with new event branches.

## Known Stubs
None. `handleGoneSlot`/`handleRefund` are fully implemented and tested.

## Deferred Issues
None from this plan.

## Pre-existing / out-of-scope (NOT this plan — per environment notes)
- `npm run build` fails on the untouched Phase-2 `PAYMONGO_SECRET_KEY` boot guard (deferred-items.md).
- `npm run lint` errors on `address-autocomplete.tsx:110` (unchanged Phase-2). Self-check scoped to `tsc` + this plan's own files/tests, all green.

## User Setup Required
Not a code/test blocker (all tests run on `mockPayMongo`). For real webhook UAT: add `checkout_session.payment.paid`, `payment.refunded`, and `payment.refund.updated` to the PayMongo webhook subscription (alongside the Phase-2 `merchant.*` events) and forward events to the local endpoint via ngrok/cloudflared (no PayMongo CLI). See the plan's `user_setup` block.

## Next Phase Readiness
- The confirm authority is live: PendingPaymentState (Plan 03) resolves to Confirmed on the next poll once `payment.paid` lands; PaymentReversedState renders after a gone-slot auto-refund. **PAY-01 complete** (checkout + confirm-on-webhook).
- Plan 05 (payout sweep) can rely on: only `confirmed` bookings carry a live payout obligation; a refunded/cancelled booking is excluded; `booking.payment_id` is captured at confirm for any later refund; the ledger's `payment_id` is the refund-event correlation key.

## Self-Check: PASSED
- Created files verified present: `tests/paymongo/webhook-payment-paid.test.ts`, `tests/paymongo/webhook-refund.test.ts`, `.planning/phases/05-payments-payouts/05-04-SUMMARY.md`; modified files present: `src/app/api/paymongo/webhook/route.ts`, `src/lib/audit.ts`.
- Commits verified in git log: `3030e0d` (T1), `9fda1fb` (T2), `bacb114` (T3).
- No accidental file deletions across the three task commits; no stray untracked files.
- `npx tsc --noEmit` exit 0; `npx eslint` exit 0 on all changed files; `npx vitest run tests/payments tests/paymongo` = 49/49 green (payment-paid 8, refund 4, + existing 37).
- Grep gate: `checkout_session.payment.paid` + `status = 'confirmed'` + `reference_number` + `payment_id` present; the confirm UPDATE guards `status='pending'` ONLY (the single `expires_at > now()` match is in a comment documenting NOT to re-impose it); `createRefund`/`qrph`/`needs_attention`/`PAYMENT_ALERT` present; `payment.refunded` + `payment.refund.updated` + `state='refunded'` present.

---
*Phase: 05-payments-payouts*
*Completed: 2026-07-16*
