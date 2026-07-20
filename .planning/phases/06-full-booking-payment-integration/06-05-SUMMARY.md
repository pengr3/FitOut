---
phase: 06-full-booking-payment-integration
plan: 05
subsystem: payments
tags: [webhook, confirm-authority, pay-on-approval, booking-confirmed-email, D-57, PAY-05, BOOK-06]

# Dependency graph
requires:
  - phase: 06-full-booking-payment-integration
    plan: 01
    provides: "booking_status +approved (a slot-holding, payable state) — the state a pay-on-approval request is in when the booker pays"
  - phase: 06-full-booking-payment-integration
    plan: 03
    provides: "sendBookingConfirmed(to, spaceTitle, whenLabel, reference, bookingUrl) lifecycle-email leaf provider (fire-and-forget contract, T-06-07)"
  - phase: 06-full-booking-payment-integration
    plan: 04
    provides: "confirmBooking + the /book pay page accept an `approved` hold — so a pay-on-approval booker reaches the exact Phase-5 checkout and pays FROM the approved state"
  - phase: 05
    provides: "the checkout_session.payment.paid webhook (single confirm writer D-57) + handleGoneSlot D-58 auto-refund/operator-alert backstop + verifySignature + paymongo_event dedupe"
provides:
  - "The single-writer checkout_session.payment.paid confirm authority (D-57) WIDENED from `status='pending'` to `status IN ('pending','approved')` — an instant hold AND a pay-on-approval request now confirm through the SAME writer (PAY-05); no second confirm path, no re-imposed expires_at>now() guard (Pitfall 4)"
  - "The BOOK-06 booking-confirmed email fires FIRE-AND-FORGET on a genuine (≥1-row) confirm — covering BOTH instant and pay-on-approval — off the 200 ACK path (T-06-15): a Resend/read failure can never reject the webhook"
  - "The UNCHANGED handleGoneSlot D-58 backstop now also covers the pay-after-release race: a released/declined request that pays late (0-row confirm) auto-refunds on a refundable rail / operator-alerts on QRPh and stays terminal → PaymentReversedState (Pitfall 3), never a silent retention"
affects: [06-06, 06-07, 06-08, request-to-book, pay-on-approval]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The confirm authority stays a SINGLE writer (D-57): request-to-book is enabled by WIDENING the confirm WHERE to accept `approved`, never by adding a parallel confirm path — bookingId is still derived from the VERIFIED reference_number alone"
    - "The BOOK-06 email is fired only on the ≥1-row (genuine) confirm branch and is fully self-contained (owns its own DB read + error handling) so the caller's `void` can never surface an unhandled rejection or delay the 200 ACK"
    - "The confirmed-email whenLabel is composed in the webhook from the venue tz (date-fns + @date-fns/tz) as `{date}, {time} ({City} time)` — byte-identical to the reserve page + placeHold request branch, so all three booker-facing time surfaces name the venue tz the same way (SC#2)"

key-files:
  created: []
  modified:
    - src/app/api/paymongo/webhook/route.ts
    - tests/paymongo/webhook-payment-paid.test.ts

key-decisions:
  - "The BOOK-06 confirmed email is a SELF-CONTAINED helper (sendBookingConfirmedEmail) that owns its own booking⨝user⨝listing read AND its own try/catch, invoked as `void sendBookingConfirmedEmail(bookingId)` on the ≥1-row branch. A helper (vs. an inline await) keeps the fire-and-forget promise off the ACK path AND guarantees a read/send failure is swallowed — the `void` at the call site can never yield an unhandled rejection (T-06-15)."
  - "whenLabel is re-derived in the webhook exactly as the reserve page does (fullDay from the FROZEN quote vs hourlyRate×hours; `{date}, {time} ({City} time)`), so the confirmed email names the venue tz identically to the other two surfaces — no time formatting leaked into the email leaf provider (06-03 contract)."
  - "The confirmed email fires on the ≥1-row branch ONLY — never on a 0-row confirm (a benign replay OR a gone slot). A replay stays a 200 no-op with no duplicate email; a gone slot routes to the unchanged handleGoneSlot (refund/alert), never a spurious 'confirmed' receipt."
  - "handleGoneSlot, verifySignature, the paymongo_event dedupe, and handleRefund are UNTOUCHED — the pay-after-release race for a released/declined request is already covered by the same D-58 backstop that covers an instant gone slot; NO request-specific refund logic was added (Pitfall 3)."

requirements-completed: []  # BOOK-06 / PAY-05 stay In-progress — the confirmed email + widened confirm ship here, but the pay-on-approval loop only closes with the SLA/payment-window cron (06-06), host approve/decline (06-07), and the request views (06-08); completion validated at the phase transition, per the 06-01/02/03/04 cross-cutting precedent.

# Metrics
duration: ~6min
completed: 2026-07-20
---

# Phase 6 Plan 05: Webhook Confirm Widening + BOOK-06 Confirmed Email Summary

**Widened the single-writer `checkout_session.payment.paid` confirm authority (D-57) from `status='pending'` to `status IN ('pending','approved')` so a pay-on-approval request confirms through the SAME writer as an instant booking (PAY-05), and fire the BOOK-06 booking-confirmed email fire-and-forget on a genuine confirm — with `handleGoneSlot` (D-58), `verifySignature`, the `paymongo_event` dedupe, and `handleRefund` all left exactly as Phase 5 built them.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-20T04:46Z
- **Completed:** 2026-07-20T04:52Z
- **Tasks:** 2
- **Files modified:** 2 (0 created, 2 modified)

## Accomplishments
- **One predicate widening, one writer.** The confirm UPDATE WHERE went from `status = 'pending'` to `status IN ('pending','approved')` (line 376). An instant pay confirms from `pending`, a pay-on-approval request from `approved` (06-04 lands the booker on the exact Phase-5 checkout while the hold is `approved`); both transition to `confirmed` through the ONE writer. No second confirm path was added, and the `expires_at > now()` guard was deliberately NOT re-imposed (Pitfall 4 — a legitimately-paid-but-lapsed hold must still confirm; the GiST EXCLUDE, not the TTL, is the double-confirm authority).
- **The BOOK-06 confirmed email fires on a genuine confirm, for both modes.** On the ≥1-row branch the webhook calls `void sendBookingConfirmedEmail(bookingId)` — a self-contained helper that joins the booking to the booker (email) + listing (title/tz/city), composes the venue-local `whenLabel`, and `await sendBookingConfirmed(...)` — fire-and-forget, OUTSIDE the 200 ACK path (T-06-15). The helper owns its own try/catch, so a Resend or read failure logs `[EMAIL] booking_confirmed_send_failed` and never rejects the webhook (a rejected ACK would make PayMongo retry the already-confirmed event forever).
- **The gone-slot backstop is untouched and now covers pay-after-release for free.** A 0-row confirm still routes to the UNCHANGED `handleGoneSlot`: a benign replay is a no-op (never re-refund a confirmed booking), a genuinely-gone slot auto-refunds on a refundable rail / operator-alerts on QRPh, and the booking stays terminal → `PaymentReversedState`. A released/declined request that pays late is exactly this pay-after-release race (Pitfall 3) — handled identically, with NO request-specific refund logic added.
- **The webhook suite proves the widening end-to-end.** `webhook-payment-paid.test.ts` gained 4 cases: (a) an `approved` request → `confirmed` with the pay_… captured (same single writer, PAY-05); (b) the confirmed email fires on an instant (pending) confirm; (c) the confirmed email fires on a pay-on-approval (approved) confirm too — both asserted via `mockResend.sent()` polled with `vi.waitFor` on the booking's deterministic FIT- reference; (d) pay-after-release: a released (`cancelled`) request pays late → 0-row confirm → `handleGoneSlot` auto-refunds once, stays terminal, and NO confirmed email fires for it.

## Task Commits

Each task was committed atomically:

1. **Task 1: Widen the confirm WHERE + fire the BOOK-06 confirmed email** — `697825c` (feat)
2. **Task 2: Extend the webhook tests (approved→confirmed, pay-after-release, confirmed email)** — `dfcf31e` (test)

**Plan metadata:** _(final docs commit — this summary + STATE.md + ROADMAP.md + REQUIREMENTS.md)_

## Files Created/Modified
- `src/app/api/paymongo/webhook/route.ts` (modified) — the confirm UPDATE WHERE widened to `status IN ('pending','approved')`; a new `sendBookingConfirmedEmail(bookingId)` helper (booking⨝user⨝listing read + venue-local `whenLabel` compose + `await sendBookingConfirmed(...)` in a self-swallowing try/catch) is `void`-invoked on the ≥1-row branch; new imports `format`/`tz`, `listing`/`user` (schema), `sendBookingConfirmed`, `bookingReference`, `windowHours`. `handleGoneSlot`, `verifySignature`, the `paymongo_event` dedupe, and `handleRefund` are untouched.
- `tests/paymongo/webhook-payment-paid.test.ts` (modified) — `seedBooking` accepts `approved`/`requested` + an optional `bookingMode`; a `waitForConfirmedEmail(bookingId)` helper polls `mockResend.sent()` (keyed on the booking's FIT- reference) for the fire-and-forget receipt; 4 new cases (approved→confirmed, confirmed-email-fires ×2, pay-after-release→handleGoneSlot). Imports `mockResend` + `bookingReference`.

## Decisions Made
- **A self-contained email helper, not an inline await.** The plan's interfaces block described `void sendBookingConfirmed(...)` after the confirm; I wrapped the read + send in `sendBookingConfirmedEmail(bookingId)` with its own try/catch so (1) the fire-and-forget promise, including its DB read, stays entirely off the 200 ACK path, and (2) any failure is swallowed at the source — the `void` at the call site is structurally incapable of surfacing an unhandled rejection. Functionally identical to the plan; strictly safer for T-06-15.
- **Fire the email on the ≥1-row branch ONLY.** A 0-row confirm is either a benign replay (already confirmed) or a gone slot — neither should send a "confirmed" receipt. Placing the send in the `else` of the `rows.length === 0` check guarantees the email tracks a GENUINE state transition to `confirmed`, once, and never duplicates on a PayMongo re-delivery (the `paymongo_event` dedupe already 200-no-ops a replay before the confirm even runs).
- **whenLabel composed from the frozen quote, mirroring the reserve page.** `fullDay` is not persisted on the booking row, so the helper re-derives it from the frozen `quotedTotalCents` (a full-day hold froze the flat day rate; an hourly hold froze hourlyRate×hours) exactly as `listings/[id]/book/page.tsx` does, then formats `{date}, {time} ({City} time)` in the venue tz. All three booker-facing time surfaces (listing, reserve, confirmed email) name the venue tz identically (SC#2).
- **Assert the fire-and-forget email with `vi.waitFor`, keyed on the booking reference.** The confirmed email lands as a background promise AFTER `post()` resolves, so the test polls `mockResend.sent()` rather than reading it once. It keys on the booking's deterministic FIT- reference in the body (never a generic "an email was sent"), so a sibling test's leaked async email can't false-match.

## Deviations from Plan

None — plan executed exactly as written. The confirm WHERE widening and the fire-and-forget confirmed email were applied verbatim from the `<interfaces>` block; wrapping the send in a self-swallowing helper (rather than an inline `void sendBookingConfirmed(...)`) is a faithful, safer realization of the same fire-and-forget-outside-the-ACK-path contract, not a scope change.

## Issues Encountered
- None. Docker (`fitout-db-1`) was already up; vitest ran with no `DATABASE_URL` shell override per the project gotcha (`.env.local` is the source). The fire-and-forget email's background timing is handled with `vi.waitFor` (vitest 4.1.8), and the global `vi.mock("resend")` (tests/setup.ts) survives the file's `vi.resetModules()` so `mockResend.sent()` captures the send.

## Verification
- `npx tsc --noEmit` — exit 0 (clean, both before and after the test changes).
- `npx eslint src/app/api/paymongo/webhook/route.ts tests/paymongo/webhook-payment-paid.test.ts` — 0 errors.
- `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` — 12 passed (8 existing + 4 new).
- `npx vitest run tests/paymongo tests/booking tests/payments` — 18 files, 121 passed / 4 todo (up 4 from the 117 baseline; no regression in the instant confirm / gone-slot / refund / double-book cases).
- Acceptance greps: `IN ('pending','approved')` matches the confirm UPDATE WHERE (route.ts:376); `sendBookingConfirmed` fired fire-and-forget on the ≥1-row branch (route.ts:388 `void sendBookingConfirmedEmail`); `handleGoneSlot` unchanged (no new request-specific refund branch).

## Known Stubs
None. The confirmed email now fires end-to-end for both instant and pay-on-approval on a successful webhook confirm; the `/bookings/<id>` link target and the confirmation UI predate this plan. Pay-on-approval only reaches the `approved` state in production once the host approves (06-07) and the SLA/payment-window cron (06-06) exists, but this plan's webhook change is correct and tested against a seeded `approved` booking today.

## Threat Flags
None. The plan's threat register (T-06-13/14/15) is fully mitigated: the widened WHERE keeps the HMAC-verified webhook the SOLE confirm writer with `bookingId` derived from the verified `reference_number` (T-06-13); the pay-after-release race routes to the unchanged `handleGoneSlot` with no request-specific refund logic (T-06-14); the confirmed email is fire-and-forget outside the ACK path so a Resend failure never rejects the 200 (T-06-15). No new network endpoint, auth path, or trust-boundary surface was introduced.

## Next Phase Readiness
- **06-06 (SLA / payment-window cron)** auto-declines a lapsed `requested` hold and auto-releases a lapsed `approved` hold; a released `approved` hold becomes `cancelled`, and the pay-after-release backstop proven here catches a booker who pays after that release.
- **06-07 (host approve/decline)** flips `requested → approved` (fires `sendRequestApproved`) → the booker pays via the now-`approved`-aware `confirmBooking` on the now-`approved`-active `/book` page → this widened webhook confirms it and fires the BOOK-06 receipt. Decline flips `requested → declined` (fires `sendRequestDeclined`).
- **06-08 (request views)** renders the `requested`/`approved` states at `/bookings/<id>` and the host queue at `/host/requests`.
- Downstream reminder still in force: any NEW read/occupancy predicate must mirror the occupying set `{pending,confirmed,requested,approved}` or a request-held slot reads as free.

## Self-Check: PASSED
- Both modified files exist on disk (`src/app/api/paymongo/webhook/route.ts`, `tests/paymongo/webhook-payment-paid.test.ts`).
- Both task commits present in git history: `697825c` (Task 1 feat), `dfcf31e` (Task 2 test).
- Acceptance markers verified: `IN ('pending','approved')` in the confirm UPDATE WHERE; `void sendBookingConfirmedEmail` on the ≥1-row branch; `handleGoneSlot` unchanged.
- Suites green: webhook-payment-paid 12 passed; paymongo+booking+payments 121 passed / 4 todo; tsc exit 0; eslint 0 errors on both files.

---
*Phase: 06-full-booking-payment-integration*
*Completed: 2026-07-20*
