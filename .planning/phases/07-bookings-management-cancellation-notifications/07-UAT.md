---
status: partial
phase: 07-bookings-management-cancellation-notifications
source: 07-01-SUMMARY.md through 07-17-SUMMARY.md (17 plans)
started: 2026-07-23T10:33:04Z
updated: 2026-07-23T18:14:20Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[paused — 2 tests outstanding: 13 (too-soon slots, awaiting user visual) and 14 (re-request recovery, not yet staged/run)]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server, start the app from scratch. Server boots without errors, migrations (0013–0016) apply cleanly, homepage/search returns live data.
result: pass
notes: DB was unseeded (empty search was truthful — bookability gate). Ran `npm run db:seed` + patched seeded listings with cancellation tiers (seed.ts predates Phase 7 — spawn-task chip filed). Env fixes made during setup — Inngest dev server started + `INNGEST_DEV=1` added to .env.local (without it, /api/inngest 500s in cloud mode and every emitNotify enqueue fails silently).

### 2. All-In Browse Pricing + Service Fee at Checkout
expected: Search cards and the listing page show all-in rates (space + 5% service fee) with a muted "Service fee included" qualifier. The booking rail's "Est." figure matches what checkout charges. Checkout shows an itemised "Service fee" line; space price + service fee = total.
result: pass
notes: Cards show all-in ×1.05 rates with qualifier (verified all 5 seeded listings). Frozen split on real request row exact (280000+14000=294000, tier snapshot, full_day). Request detail shows all-in "You'll pay if approved ₱2,940" (itemised breakdown lives on the pay page, reached post-approval — sub-check deferred to the approve→pay flow).

### 3. Cancellation Policy Required to Publish
expected: The host listing wizard has a new step "What happens if a guest cancels?" with three tier cards (Flexible/Standard/Strict), none pre-selected. The publish checklist shows "Choose a cancellation policy" as unmet until chosen, and publish is refused server-side without it. Draft saving still works without a tier.
result: pass
notes: User confirmed publish blocked until a tier was picked (chose standard on Pickletickle), then publish succeeded. Setup: listing was flipped to draft via SQL for the test; host_payout activated via SQL afterwards (Platforms sales-gated in test mode).

### 4. Cancellation Policy Disclosure to Booker
expected: The listing page shows a "See cancellation policy" expandable disclosure with the tier's refund rungs. At checkout the same disclosure shows concrete venue-local dates for this specific booking (e.g. "100% refund until Thu, Jul 30, 8:00 AM"), plus an always-visible line that service fees aren't refunded.
result: pass
notes: Checkout showed itemised ₱615 space + ₱30.75 fee = ₱645.75 (exact 5%), Standard rungs with concrete Mandaluyong-time dates, unconditional "The service fee isn't refunded." One minor issue logged: the summary line advertised the already-lapsed 100% rung (see Gaps). Also surfaced en route: no UI links to the /availability hours editor (see Gaps) and weekly-hours editor UX noted in deferred-items.md.

### 5. My Bookings List (/bookings)
expected: /bookings shows Upcoming and Past tabs partitioned correctly. Each row has a status badge (icon + text), venue-local time label, and a "Pay now" CTA on approved-awaiting-payment bookings. "Load more" pages through results. Only your own bookings appear. A confirmed booking whose end time has passed displays as "Completed".
result: pass
notes: Upcoming shows the confirmed Pickletickle booking (venue-local label, Confirmed badge, ₱645.75). Real PayMongo test-mode payment via ngrok webhook confirmed the booking; payment_method=gcash persisted. Pay-now CTA / Load more / derived-completed not yet exercised (no data for those states yet).

### 6. Host Bookings List + Detail (/host/bookings)
expected: /host/bookings shows Upcoming/Past tabs for bookings on your listings, with an optional per-listing filter. A row links to /host/bookings/[id] which shows the booking detail. Only bookings on your own listings are visible.
result: issue
reported: "this can't be found http://localhost:3000/host/bookings/FIT-Z84X7Y3K" (user tried to reach the host booking detail; the list gave them nothing to click)
severity: major
notes: host-booking-row.tsx renders NO link (07-06 left it linkless because the detail page didn't exist yet; 07-11 built /host/bookings/[id] but never added the list→detail link). The host cancel flow (SC#3) is unreachable through the UI without hand-typing a booking UUID.

### 7. Booker Cancels a Paid Booking (Exact Refund)
expected: On /bookings/[id] a "Cancel booking" link (below a separator) routes to a review page showing the itemised refund: space refund per the policy tier, "₱0" service-fee line, total refund — plus a disclosure of when the refund drops to the next rung. Confirming cancels the booking, shows "refund is on its way" (never "refunded"), and the slot is immediately rebookable by someone else.
result: pass
notes: Full six-element breakdown rendered with rung explanation ("14 hours before … 24–6 hours window — 50%") + 0%-boundary disclosure. Confirmed: refund_cents=30750 written, real PayMongo refund ref_9SBDgBhQNMhEi1U9v3ciKZAj amount=30750 status=succeeded, refund_issued (booker) + booking_cancelled_by_booker (host) notification rows, refund email delivered. Cosmetic formatting issue logged (₱307.5 missing trailing zero).

### 8. Cancel an Unpaid Request/Approved Hold
expected: On the detail page of a requested or approved (unpaid) booking, cancelling opens a plain confirmation dialog with NO money/refund UI. After confirming, the request is cancelled, the host is notified, and the slot frees.
result: issue
reported: "cancelled it, just a plain confirm dialog with no money stuff. why it appeared as declined if the user cancelled it tho?"
severity: major
notes: Mechanics correct — plain dialog, no money UI, booking_cancelled_by_booker notification row written for host, slot freed (status leaves the EXCLUDE set). Defect is the landing state — booker-cancelled request renders the host-decline copy.

### 9. Host Cancels a Confirmed Booking
expected: /host/bookings/[id] offers "Cancel booking" behind a two-pane dialog: pane 1 requires picking a reason (5 options), pane 2 lists the consequences (guest gets full refund, window stays blocked, ₱300 fee) with a required acknowledgment checkbox. After confirming: booker gets a 100%-refund notification, the freed window is auto-blocked and CANNOT be unblocked from the calendar, and the fee appears as outstanding debt.
result: pass
notes: All four D-70/D-71 consequences verified: refund_cents=77490 full all-in + real PayMongo refund succeeded (ref_5rWAuwjETjqCY52hU9ci88sZ); retained_space_cents=0; availability_block reason=host_cancellation over exactly the window, delete REFUSED via toast while ordinary blocks delete (positive control); first product-written host_cancel_fee debit (held, −30000); WR-04 side-discriminated notifications to both parties (host copy carries feeLabel ₱300). Reached via hand-typed UUID URL only — see test 6 issue.

### 10. Host Earnings: Commission Label + Fee Debt Line
expected: /host/earnings labels the platform cut "FitOut commission (10%)" (not "service fee"). After a host cancellation, a muted line reads "You have ₱X in cancellation fees still to be deducted." Payout totals exclude the debit rows.
result: pass
notes: Fee-debt line renders (₱300); page prose reads "FitOut keeps a 10% commission". Payout-row "FitOut commission (10%)" label unverifiable yet (no payout rows — both bookings cancelled pre-payout). Copy nit: "₱300in" missing space (logged in Gaps).

### 11. Notification Bell + In-App Notifications
expected: A bell with an unread-count badge appears in both the booker and host headers. Lifecycle events (request received, new request to host, approved, declined, confirmed, cancelled) produce notification rows. The panel shows the 20 most recent; unread rows have a tint + brand dot; clicking marks read; "Mark all as read" appears only when something is unread; items link to the relevant page.
result: pass
notes: Booker bell panel (screenshot) shows the full lifecycle stack — Booking confirmed, Request approved—pay to confirm, Request sent to the host, Your host cancelled, Refund issued — each with venue-local when-label + relative time (1m/2m/5m/13m/19m/25m ago), unread dots, badge count, "Mark all as read". Host nav shows "Requests 1" badge. NOTE: earliest booking_confirmed row/email was LOST when the Inngest dev server was transiently down (documented 07-07 bounded gap — enqueue failed, money/state untouched); all later events flowed once transport was restored.

### 12. Lifecycle Emails
expected: The same lifecycle events also arrive as emails: booking confirmed, request received (no numeric deadline promised), request approved ("Pay ₱X by <actual capped deadline>"), new request to host ("Respond by <actual deadline>"), declined/expired, and cancellation emails. Time labels are venue-local and hourly bookings never read "Full day".
result: pass
notes: User confirmed receipt of the refund email. Approved-notification deadline "pay by Fri, Jul 24, 8:21 AM" (bell) is the ACTUAL D-96-capped deadline (approve+12h), not a generic "24 hours" — the CR-02 fix live. Hourly bookings render venue-local windows (10:00 AM–4:00 PM), never "Full day" — the WR-06/07-10 fix live. Caveat: the very first booking_confirmed email was lost to the transient Inngest outage (see test 11); not a code defect.

### 13. Too-Soon Slots + Lead-Time Guard
expected: In the slot picker, slots starting too soon (within 2h for request listings, 30min for instant) render muted/struck-through with a notice — never red. They cannot be selected, and a direct submit for such a window is refused server-side with a calm message.
result: [pending]

### 14. Expired Approval Recovery (Re-Request)
expected: An approved booking whose payment window lapsed shows a calm "payment window closed" state on its detail page. If the slot is still free, a "Request this time again" button resubmits the same window in one click (host gets a fresh request). If the slot was taken, the page says so and offers "Find another time" instead.
result: [pending]

### 15. Reminder Emails (Cron)
expected: The hourly reminders cron (at :45) sends pre-expiry payment reminders, pre-SLA host reminders, and pre-session reminders (24h booker / 12h host) — each at most once, none for cancelled bookings, and none scheduled "in the past" for short-notice bookings.
result: pass
notes: Verified LIVE — seeded a synthetic confirmed booking (45cba391) with a due 24h booker reminder; the :45 cron tick claimed it at 12:45:00 (booking_reminder row kind=pre_session_booker) and wrote a reminder_pre_session notification with the correct venue-local label. At-most-once claim + venue-local composition confirmed on top of the plan's 12 integration tests. NOTE: pre_expiry / pre_sla_host / pre_session_host paths not individually seeded this session.

## Summary

total: 15
passed: 11
issues: 2
pending: 2
skipped: 0
blocked: 0

## Gaps

- truth: "A booker who cancels their own pending request sees a truthful 'you cancelled this' state on the booking detail page"
  status: failed
  reason: "User reported: cancelled it, just a plain confirm dialog with no money stuff. why it appeared as declined if the user cancelled it tho? — The declined branch of /bookings/[id] renders host-decline copy ('Declined' badge + 'This request wasn't available — The host couldn't take your booking') for a booker-initiated cancellation."
  severity: major
  test: 8
  root_cause: ""     # Filled by diagnosis — likely: cancelUnpaidHold maps requested→declined (D-79 status reuse) and writes cancelled_by='booker', but the detail page's declined branch and deriveBookingStatusView ignore cancelled_by, so the booker-cancel case is indistinguishable from a host decline in the UI. Row verified: status=declined, cancelled_by=booker. Not covered by 07-REVIEW (WR-05 is the gone-slot NULL case).
  artifacts: []      # Filled by diagnosis
  missing: []        # Filled by diagnosis
  debug_session: ""  # Filled by diagnosis

- truth: "The checkout policy summary never advertises a refund rung that has already lapsed for this booking"
  status: failed
  reason: "Observed during test 4: a short-notice booking (starts Jul 24 10:00 AM Manila, paid for ~7:40 PM Jul 23) rendered 'Free cancellation until Thu, Jul 23, 10:00 AM (Mandaluyong time)' directly above Confirm & pay — that 100% boundary was ~9.5h in the past. The truthful best case at pay time was the 50% rung (until Fri, Jul 24, 4:00 AM). The expanded rung list is accurate; the SUMMARY line always leads with the top rung regardless of whether its boundary has passed."
  severity: minor
  test: 4
  root_cause: ""     # Likely policySummaryLine / the checkout summary line composes from LADDER's top rung without comparing the boundary against now
  artifacts: []      # Filled by diagnosis
  missing: []        # Filled by diagnosis
  debug_session: ""  # Filled by diagnosis

- truth: "A host can reach the booking detail page (and thus the host cancel flow) from the /host/bookings list"
  status: failed
  reason: "User reported: 'this can't be found http://localhost:3000/host/bookings/FIT-Z84X7Y3K' — the host bookings list renders rows with no link. host-booking-row.tsx has no href; 07-06 deliberately left it linkless (detail page didn't exist), 07-11 built /host/bookings/[id] but never wired the list row to it. SC#3's product path is unreachable without hand-typing a booking UUID."
  severity: major
  test: 6
  root_cause: ""     # Cross-plan handoff gap: 07-11 'For Downstream Plans' never assigned the link-back, and no later plan owned host-booking-row.tsx
  artifacts: []      # Filled by diagnosis
  missing: []        # Filled by diagnosis
  debug_session: ""  # Filled by diagnosis

- truth: "Money amounts always render with two decimal places (₱307.50, never ₱307.5)"
  status: failed
  reason: "Observed during test 7: the refund total renders '₱307.5' on the cancel review page ('Refund to you'), the cancelled state ('₱307.5 refund on its way'), and the notification payload refundLabel — while ₱645.75 / ₱30.75 render correctly. formatMoney appears to drop a trailing zero on amounts ending in .x0."
  severity: cosmetic
  test: 7
  root_cause: ""     # Likely formatMoney's fraction-digit config (minimumFractionDigits not pinned to 2 when cents % 100 !== 0 but ends in 0)
  artifacts: []      # Filled by diagnosis
  missing: []        # Filled by diagnosis
  debug_session: ""  # Filled by diagnosis

- truth: "A double-submitted booking request notifies the host exactly once"
  status: failed
  reason: "Observed in dev-server logs during test 2: one user submit of a request produced TWO request_received + TWO new_request_to_host emission attempts for the same bookingId (4 enqueue_failed lines, booking d95e8bf9). booking.ts:185-188 documents that the idempotent replay path deliberately RE-EMITS ('a REPLAYED double-submit notifies with the SAME frozen numbers') — so with transport up, a double-click sends the host duplicate notifications + emails. Note the contrast: re-request.ts (07-12) explicitly suppresses replay emissions and proved 'host notified exactly once' (case 1b)."
  severity: minor
  test: 11
  root_cause: ""     # placeHold emits unconditionally after createPendingHold returns; the replay result is not distinguished from a fresh insert at the emission site
  artifacts: []      # Filled by diagnosis
  missing: []        # Filled by diagnosis
  debug_session: ""  # Filled by diagnosis

- truth: "UI copy nits: spacing and raw enum values never leak to rendered surfaces"
  status: failed
  reason: "Observed during tests 9-10: (a) /host/earnings renders 'You have ₱300in cancellation fees' — missing space between amount and 'in'; (b) the blocked-dates list on /host/listings/[id]/availability renders the raw enum value 'host_cancellation' as the block's label instead of human copy."
  severity: cosmetic
  test: 9
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "A host can discover and set their listing's operating hours, so a published listing is actually bookable"
  status: failed
  reason: "User reported: Wait the host haven't setup their hours yet. Yes and in the hosting setup wizard there are no shit for operating hours why? — The weekly-hours editor exists at /host/listings/[id]/availability (Phase 4) but NO UI surface links to it (wizard has no hours step, host nav/dashboard/listings index carry no link; only revalidatePath calls reference the URL). Publish checklist also doesn't require hours, so a listing publishes and renders 'No availability yet' indefinitely."
  severity: major
  test: 4
  root_cause: ""     # Pre-existing Phase 3/4 discoverability gap, surfaced during Phase 7 UAT — not introduced by Phase 7
  artifacts: []      # Filled by diagnosis
  missing: []        # Filled by diagnosis
  debug_session: ""  # Filled by diagnosis
