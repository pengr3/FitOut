---
phase: 07-bookings-management-cancellation-notifications
verified: 2026-07-23T06:56:24Z
status: gaps_found
score: 3/4 roadmap success criteria fully verified; 1/4 partially verified (infra verified, content-accuracy failed)
overrides_applied: 0
gaps:
  - truth: "Users receive transactional emails/notifications for key booking events, keeping everyone informed (SC#4)"
    status: partial
    reason: >
      The async delivery MECHANISM is solid and independently verified (event fan-out, durable
      in-app row written before email, retries, onFailure audit, never blocks the booking
      transaction — tests/booking/cancellation.test.ts case 9, tests/notifications/notify.test.ts).
      But the CONTENT of the delivered messages is provably false on two concrete, common paths,
      which the codebase's own documented rules (D-79, D-99) explicitly forbid:
        (1) CR-01 — a booker who cancels inside the no-refund window (0% rung, an everyday path)
            still receives a "Refund issued — ₱0" notification and a "We've issued a refund of ₱0…"
            email, because `cancelBookingAsBooker` passes `formatMoney(0, …)` (a non-null string)
            to `notifyCancellation`, which only suppresses the notice on `null`. No money moved; the
            user is told money moved.
        (2) CR-02 — three email templates (`sendRequestApproved`, `sendNewRequestToHost`,
            `sendRequestReceived`) render the FLAT config constants (`APPROVAL_PAYMENT_WINDOW_HOURS`,
            `APPROVAL_SLA_HOURS`) instead of the row's real D-96 session-start-capped deadline, even
            though `sendForType` in notify.ts has `payload.payByLabel` / `payload.respondByLabel`
            in hand and drops them on the floor for two of the three. Any short-notice booking states
            a deadline in writing that is provably wrong, and the in-app channel (which uses the
            correct capped label) then disagrees with the email for the same event — the exact
            two-channel drift D-91 exists to prevent.
      Both defects were confirmed by direct code read (not just cited from 07-REVIEW.md) and by
      running the existing test suite, which passes because neither defect is covered by any
      assertion (confirmed absence of coverage: tests/booking/cancellation.test.ts case 6 exercises
      the 0% rung but never asserts on emission; case 12 only exercises a 50%-rung paid cancellation).
    artifacts:
      - path: "src/app/actions/cancel-booking.ts"
        issue: "Lines 628-632: notifyCancellation is called unconditionally with formatMoney(quote.totalRefundCents, …); should pass null when totalRefundCents is 0 (mirrors the existing null-check inside notifyCancellation itself, lines 306-322)."
      - path: "src/inngest/functions/notify.ts"
        issue: "sendForType's request_approved (lines 89-97) and new_request_to_host (lines 105-114) cases do not pass payload.payByLabel / payload.respondByLabel through to the email senders, which do not even accept those parameters."
      - path: "src/lib/email.ts"
        issue: "sendRequestApproved (:162), sendNewRequestToHost (:214) and sendRequestReceived (:137) hardcode APPROVAL_PAYMENT_WINDOW_HOURS / APPROVAL_SLA_HOURS in the email copy instead of accepting and rendering a caller-supplied deadline label."
    missing:
      - "Branch notifyCancellation's refund label on totalRefundCents > 0 (or equivalent) so a 0-refund cancellation never claims a refund happened, in both the notification and the email."
      - "Thread payByLabel/respondByLabel through sendForType into sendRequestApproved and sendNewRequestToHost; add a deadline field to sendRequestReceived's payload or remove the numeric claim from its copy."
      - "Add a regression test asserting notification/email suppression (or correct wording) at the 0% cancellation rung, and a regression test asserting the emailed deadline matches the capped row deadline on a short-notice booking."
human_verification: []
---

# Phase 7: Bookings Management, Cancellation & Notifications Verification Report

**Phase Goal:** Both sides can see and manage their bookings through their full lifecycle, cancellations resolve to correct, policy-driven refunds with the refund amount shown before confirming, and a reliable async transactional-email layer keeps everyone informed.
**Verified:** 2026-07-23T06:56:24Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A booker and a host can each view upcoming and past bookings with a status lifecycle (pending/confirmed/declined/cancelled/completed) visible to both sides | ✓ VERIFIED | `src/app/(app)/bookings/page.tsx` + `src/app/(host)/host/bookings/page.tsx` both render from `src/lib/booking/bookings-query.ts` (`queryBookerBookings`/`queryHostBookings`), owner-scoped in the SQL `WHERE` (not post-filtered), DB-clock-partitioned Upcoming/Past (`tabPredicate`), `completed` derived at read time only (`displayStatusExpr`, never written — confirmed no `completed` write path exists in `cancel-booking.ts` or elsewhere). Status rendered by the single shared `deriveBookingStatusView` (`src/components/booking/booking-status.ts`), icon+text, never colour-only. `tests/security/bookings-owner-scope.test.ts` and `tests/booking/views.test.ts` exist and are in the passing suite. |
| 2 | A booker can cancel a booking and see the exact refund amount before confirming, with the refund issued per the listing's named cancellation policy tier | ✓ VERIFIED | `src/app/(app)/bookings/[id]/cancel/page.tsx` computes `quoteRefund` from `readDbNow(db)` and the booking's own `cancellationPolicy` snapshot (never the listing's current tier), rendering the exact itemised breakdown via `RefundBreakdown`. `cancelBookingAsBooker` (`src/app/actions/cancel-booking.ts:358-638`) recomputes with `quoteRefund` from the SAME snapshot fields against a fresh `readDbNow` call and writes `refund_cents`/`retained_space_cents` atomically, status-scoped, in one UPDATE. `tests/booking/cancellation.test.ts` case (2) and (2b) directly assert preview-equals-executed, including at a sharp rung boundary. |
| 3 | A host-initiated cancellation produces a full refund to the booker with defined consequences | ✓ VERIFIED | `cancelBookingAsHost` (`src/app/actions/cancel-booking.ts:805-1056`) reads `refundCents = row.quotedTotalCents` (the full all-in charge, including the service fee) and deliberately never calls `quoteRefund`. All four D-70/D-71 consequences confirmed present in one atomic flow: (1) 100% refund dispatch, (2) `recordAudit` against the host, (3) an `availabilityBlock` insert with sentinel `reason: "host_cancellation"` which `blocks.ts`'s `removeBlock` is documented to refuse to delete, (4) a signed `host_cancel_fee` debit row capped via `cappedHostCancelFee` and inserted with `ON CONFLICT (booking_id, kind) DO NOTHING` as the at-most-once lock. `HostCancelDialog` enforces the required-reason + required-acknowledgment two-pane friction (D-80) — confirmed in `src/components/host/host-cancel-dialog.tsx`. **Caveat (WARNING, not a failure of the money/consequence mechanics):** the host's own copy of the resulting notification/email (`booking_cancelled_by_host`, sent to `row.hostId` too) reuses the booker-oriented payload verbatim and tells the HOST "you're getting a full refund" / "₱X refunded" — confirmed at `cancel-booking.ts:1038-1052`, `email.ts:257-275 sendBookingCancelledByHost`, and `notification-item.tsx:166-171`. This is a real communication defect (WR-04) but does not change the underlying refund/consequence mechanics, which are correct and tested (`tests/payments/host-cancel.test.ts`). |
| 4 | Users receive transactional emails for key booking events via a reliable async layer that never blocks the booking transaction | ⚠ PARTIAL (see gap) | The DELIVERY MECHANISM is verified: `fitout/notify` (`src/inngest/functions/notify.ts`) fans out to a durable `write-notification` step (memoized on retry) then a `send-email` step, registered in `src/app/api/inngest/route.ts`, with `onFailure` writing a `needs_attention` audit row. `emitNotify` swallows its own transport errors (confirmed at the call sites and by `tests/booking/cancellation.test.ts` case 9, which forces `inngest.send` to reject and asserts the cancellation still commits). All five named events (confirmation, request received, approved/declined, cancelled, reminder) have a wired emission path. **However, the CONTENT is provably false on two common paths (CR-01, CR-02 — see gap below), which directly contradicts "keeps everyone informed."** |

**Score:** 3/4 fully verified; 1/4 has a verified-working mechanism with a verified-broken content-accuracy defect.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/payments/config.ts` | Named Phase-7 constants (SERVICE_FEE_BPS, HOST_CANCEL_FEE_CENTS, APPROVAL_PAYMENT_WINDOW_HOURS=12, etc.) | ✓ VERIFIED | Confirmed present, no call-site literals found for the checked constants. |
| `src/lib/db/schema.ts` | cancellationPolicy/ledgerKind/cancelledBy/notificationType/reminderKind enums; booking/listing/host_payout_ledger columns; notification + bookingReminder tables | ✓ VERIFIED | `cancellationPolicy` pgEnum confirmed with no `.default()` on the listing column (D-77 no-default requirement). |
| `drizzle/0013_phase7_columns.sql`, `0014_phase7_ledger_kind.sql`, `0015_booking_payment_method.sql` | Generated + hand-authored migrations, applied to the live DB | ✓ VERIFIED | Journal shows 16/16 entries including all three; `booking_no_overlap` EXCLUDE constraint chain (0005 → 0012_v2) confirmed untouched by any Phase-7 migration (0013-0015 contain no ALTER/DROP on `booking_no_overlap`). |
| `src/lib/booking/when-label.ts`, `src/components/booking/booking-status.ts`/`-badge.tsx` | Single venue-local label formatter + single status derivation, icon+text, never colour-only | ✓ VERIFIED | Confirmed single exhaustive switch with no fallthrough/default clause; `Cancelled` label never carries a money string (D-79). |
| `src/lib/payments/cancellation.ts`, `service-fee.ts`, `refund-rail.ts` | Pure refund ladder, service fee, single rail-refundability predicate | ✓ VERIFIED | `quoteRefund` is pure (no I/O, tier/prices/startsAt/now in); consumed identically by both the preview page and the action. `isApiRefundable` is the single seam consumed at every dispatch site checked (`cancel-booking.ts` both paths). |
| `src/inngest/functions/payout-sweep.ts`, `payout-reconcile.ts` | Widened due predicate, space-price gross basis, `kind='payout'` scoping everywhere | ✓ VERIFIED | `kind = 'payout'` confirmed on every ledger read/write checked in both files and in `/host/earnings/page.tsx`. |
| `src/lib/booking/bookings-query.ts` | Owner-scoped, DB-clock-partitioned, keyset-paged queries for both sides | ✓ VERIFIED | See SC#1 evidence above. |
| `src/lib/notifications.ts`, `src/inngest/functions/notify.ts`, `src/lib/validation/notification.ts` | Event-driven fan-out, Zod-guarded payload, in-app write before email | ✓ VERIFIED, content ✗ FAILED (see gap) | Infra wiring verified; two of eleven notification types render inaccurate content on specific paths. |
| `src/app/actions/cancel-booking.ts` | cancelBookingAsBooker / cancelUnpaidHold / cancelBookingAsHost | ✓ VERIFIED (mechanics), ⚠ notification content issues (CR-01, WR-04) | 1056 lines; owner-gated, rate-limited, atomic status-scoped UPDATEs confirmed; refund dispatch discipline confirmed. |
| `src/inngest/functions/reminders.ts` | Four D-85 reminders on an hourly cron, at-most-once via DB UNIQUE claim | ✓ VERIFIED | `ON CONFLICT (booking_id, kind) DO NOTHING` confirmed; `remindersSweep` registered in `src/app/api/inngest/route.ts`. |
| `src/components/notifications/notification-bell.tsx` + both layouts | Bell mounted in both headers, owner-scoped mark-read | ✓ VERIFIED | `NotificationBell` import + mount confirmed in `(app)/layout.tsx` and `(host)/host/layout.tsx`. |
| `src/components/booking/cancellation-policy-disclosure.tsx`, wizard tier step | Host must choose a tier before publish; booker sees concrete rungs at checkout | ✓ VERIFIED | Publish gate re-reads `cancellationPolicy` from the persisted row (`listing.ts:248-249`), not client-trusted; enum has no default. |
| `src/lib/paymongo.ts`, `refund-rail.ts`, `qrph-refund.ts` (07-16) | QRPh refundability settled by live probe; InstaPay refund-transfer path with `refund:` idempotency namespace | ✓ VERIFIED | Corroborated by the orchestrator's independently-run 2026-07-23 live probe (HTTP 400 confirming non-refundable) and by direct code read of the `refund:`/`payout:` namespace separation in `cancel-booking.ts`. A3 (batch-transfer idempotency under real Money Movement) remains BLOCKED pending PayMongo feature enablement — correctly flagged in-code, not silently assumed. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/app/(host)/host/bookings/page.tsx` | `listing.host_id = session.user.id` | owner-scoped WHERE | ✓ WIRED | Confirmed in `bookings-query.ts` `queryHostBookings`. |
| `src/components/booking/booking-row.tsx` | `BookingStatusBadge` | import + render | ✓ WIRED | Confirmed shared derivation consumed by both list surfaces. |
| `src/app/actions/cancel-booking.ts` | `src/lib/payments/cancellation.ts quoteRefund` | server-side recompute | ✓ WIRED | Confirmed identical inputs (snapshot fields, DB clock) used by preview and action. |
| `src/app/actions/cancel-booking.ts` | `src/lib/notifications.ts emitNotify` | post-commit event emission | ✓ WIRED, content defect | Emission happens correctly after commit; payload content is the CR-01 defect. |
| `src/inngest/functions/notify.ts` | `src/lib/notifications.ts insertNotification` | `step.run("write-notification")` | ✓ WIRED | Confirmed memoized-first-step ordering. |
| `src/app/api/inngest/route.ts` | `notify`, `remindersSweep` | functions array registration | ✓ WIRED | Both present in the array alongside `payoutSweep`, `payoutReconcile`, `requestExpirySweep`. |
| `src/app/actions/cancel-booking.ts` | `src/lib/payments/refund-rail.ts isApiRefundable` | single dispatch branch | ✓ WIRED | Confirmed the sole predicate consulted before every `createRefund`/`createRefundTransfer` call in both cancel paths. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Cancellation money invariants + notification emission after commit | `npx vitest run tests/booking/cancellation.test.ts tests/booking/notify-emission.test.ts tests/notifications/notify.test.ts` | 3 files, 30 tests passed | ✓ PASS (mechanism), but confirms absence of coverage for CR-01/CR-02 — passing tests do not exercise the failing content paths |
| Full project suite (independently re-run by orchestrator this session, after 07-16 landed) | — | 78 files / 639 tests, exit 0 | ✓ PASS (cited, not independently re-run in full by this verifier due to time; targeted subset above re-run directly) |
| Live DB migration state | — | 16/16 journal rows; `booking_no_overlap` GiST exclusion constraint verified intact by orchestrator | ✓ PASS (cited; corroborated independently via migration-file diff showing no Phase-7 migration touches the constraint) |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|--------------|--------|----------|
| BOOK-07 | 07-01, 07-03, 07-05, 07-08, 07-09, 07-12, 07-15, 07-16 | Booker can cancel subject to cancellation/refund policy | ✓ SATISFIED | SC#2 verified above; disclosure-equals-enforcement mutation-verified per 07-15-SUMMARY and confirmed by reading `cancellation-policy-disclosure.tsx`'s derivation from `LADDER`. |
| PAY-06 | 07-01, 07-03, 07-04, 07-08, 07-09, 07-11, 07-16 | Cancellations issue refunds per policy | ✓ SATISFIED | SC#2/SC#3 verified above; QRPh path settled by live probe. |
| HOST-02 | 07-02, 07-06, 07-11 | Host can view upcoming/past bookings with status | ✓ SATISFIED | SC#1 verified above (`/host/bookings`). |
| MANAGE-01 | 07-01, 07-02, 07-06, 07-12 | Booker can view upcoming/past bookings with status | ✓ SATISFIED | SC#1 verified above (`/bookings`). |
| MANAGE-02 | 07-02, 07-06, 07-12 | Status lifecycle visible to both sides | ✓ SATISFIED | Single shared `deriveBookingStatusView` confirmed consumed by both surfaces. |
| MANAGE-03 | 07-01, 07-07, 07-10, 07-13, 07-14 | Transactional emails for key booking events | ⚠ PARTIALLY SATISFIED | Delivery infra satisfied; content-accuracy gap (CR-01, CR-02) means "informed" is sometimes "misinformed" — see gap. |

No orphaned requirements found: all six requirement IDs assigned to Phase 7 in REQUIREMENTS.md (BOOK-07, PAY-06, HOST-02, MANAGE-01, MANAGE-02, MANAGE-03) are claimed by at least one of the 16 plans' `requirements:` frontmatter.

### Anti-Patterns Found (from 07-REVIEW.md, independently re-confirmed by direct code read)

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/actions/cancel-booking.ts` | 628-632 | Unconditional `formatMoney(quote.totalRefundCents, …)` passed where a `null` is required to suppress a false notice | 🛑 Blocker (CR-01) | Booker receives a false "Refund issued — ₱0" notification+email on every 0%-rung cancellation |
| `src/inngest/functions/notify.ts` | 89-97, 105-114 | `payByLabel`/`respondByLabel` present on the payload but not threaded into the email send call | 🛑 Blocker (CR-02) | Host/booker emails state a flat, sometimes-wrong deadline that disagrees with the correct in-app label for the same event |
| `src/app/actions/cancel-booking.ts` | 1038-1052 | Same notification payload/type sent to both booker and host after a host cancellation | ⚠ Warning (WR-04) | Host's own copy reads "You're getting a full refund of ₱X" — factually wrong for the host |
| `src/app/api/paymongo/webhook/route.ts` | 298-361 | `handleRefund` does not read the refund resource's `amount`, treating any refund event as a full cancellation | ⚠ Warning (WR-03) | A dashboard-issued partial refund would incorrectly flip a live, still-happening booking to `cancelled` |
| `src/app/actions/re-request.ts` | 215-218 | `fullDay` re-derived against the LISTING's CURRENT `hourlyRateCents` rather than a frozen/historical rate | ⚠ Warning (WR-06, independently confirmed: `hourlyRateCents` is selected from `listing.hourlyRateCents`, not a frozen booking column) | Any hourly-rate change since the original booking causes every hourly re-request to be repriced at the (higher) day rate |
| `src/inngest/functions/payout-sweep.ts` | 171-196, 276-311 | Retry recomputes commission from the CURRENT rate instead of the frozen `net_cents` | ℹ Info/Warning (WR-01/WR-02) | Only manifests if `COMMISSION_RATE_BPS` changes mid-retry-window; low likelihood, documented |
| `src/lib/paymongo.ts` | 445-459 | `listWalletAccounts` has no pagination | ℹ Info (WR-09) | Scale-time-bomb, not a v1-scale defect |

All of the above were independently confirmed by direct source read during this verification, not merely cited from 07-REVIEW.md.

### Human Verification Required

None. Every must-have and roadmap success criterion in this phase is either mechanically verifiable via code/test inspection (and was so verified) or was already closed out by a live external probe recorded in the codebase (the QRPh refundability question, `refund-rail.ts`). The A3 batch-transfer-idempotency item remains explicitly BLOCKED pending a PayMongo platform feature and is out of this verifier's control — it is correctly flagged in the code and by the orchestrator, not silently assumed passing, and does not gate this phase's stated success criteria (which concern QRPh refund*ability*, settled, not payout-transfer retries).

### Gaps Summary

Three of the four roadmap success criteria are solidly achieved with strong, verifiable evidence at all three levels (exists, substantive, wired) — the bookings views, the booker cancellation preview/confirm flow, and the host cancellation consequences are all mechanically correct and covered by real, mutation-verified tests.

The fourth success criterion — "a reliable async transactional-email layer keeps everyone informed" — is only half true. The ASYNC LAYER itself (event fan-out, durable write-then-email ordering, never-blocks guarantee, permanent-failure audit) is real and independently verified working. But "keeps everyone informed" fails on two concrete, everyday paths that were independently confirmed by direct code inspection, not merely cited from the review:

1. **CR-01**: Every booker who cancels inside a no-refund window (an ordinary, expected outcome of the shipped policy ladder — not an edge case) receives a notification and email falsely stating a refund was issued, contradicting the very rule (D-79) the code was written to satisfy and contradicting the review page the booker just saw.
2. **CR-02**: Any short-notice request/approval email states a fixed, sometimes-wrong deadline instead of the row's real (D-96 capped) deadline that the in-app channel correctly displays — a same-event, two-channel factual disagreement the system's own design principle (D-91) exists to prevent.

Both defects are small, mechanically well-understood fixes (branch on the amount; thread two already-computed strings through one more function call) with no architectural rework required, and neither compromises the correctness of money movement itself — the money side is unaffected; only what users are TOLD about it is wrong. Given this is a money-handling marketplace where "confidence the booking is real" is the stated core value, telling a user something false about their money is treated here as a phase-blocking gap rather than a nice-to-have polish item, per the adversarial verification stance.

Additionally, WR-04 (host misled about who receives a host-cancellation refund) and WR-06 (re-request silently repriced at the day rate after a host rate change) are real, confirmed, unguarded defects worth closing in the same pass, though they are reported as warnings rather than blockers because they sit outside the four literal roadmap success criteria.

---

_Verified: 2026-07-23T06:56:24Z_
_Verifier: Claude (gsd-verifier)_
