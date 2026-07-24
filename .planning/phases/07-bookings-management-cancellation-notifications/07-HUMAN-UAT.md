---
status: issues
phase: 07-bookings-management-cancellation-notifications
source: [07-VERIFICATION.md]
started: 2026-07-24T05:10:00Z
updated: 2026-07-24T06:20:00Z
method: playwright-driven real-browser UAT (Chromium, host + booker DB sessions, seeded fixtures)
---

## Current Test

[complete — 2 passed, 1 issue]

## Tests

### 1. Host bookings row navigation (T6)
expected: Desktop table row and mobile card both navigate to /host/bookings/[id]; Approve/Decline remain independently clickable on a `requested` row.
steps: On a DESKTOP-width /host/bookings, click a row's Space-cell text — confirm it navigates to /host/bookings/[id]. On mobile width, confirm tapping the card navigates. On a `requested` row in both layouts, confirm Approve and Decline still work (the overlay link must not swallow them).
result: passed
evidence: Real-browser drive against fixture booking 02e7e24b (requested, on uat_listing_bookable). Desktop (1280px): Space-cell link click → navigated to /host/bookings/02e7e24b…; Approve+Decline trial-actionable in the row. Mobile (375px): card-body tap over the overlay → navigated to the same detail page; Approve+Decline trial-clickable (relative z-10 sits above the after:inset-0 overlay, not swallowed). Screenshots: t6-desktop-list.png, t6-mobile-list.png.

### 2. Truthful booker-cancel landing (T8)
expected: The booker-cancelled booking shows a 'Cancelled' badge and reads 'You cancelled this request' / 'You cancelled your request — you haven't been charged.' — never 'Declined' or 'the host couldn't take your booking'. The genuinely host-declined booking still shows 'Declined' with the host-decline copy, unchanged.
steps: As the booker, view a booker-cancelled unpaid `requested` hold (declined + cancelled_by='booker') at /bookings/[id]; separately view a genuine host decline (declined + cancelled_by NULL).
result: passed
evidence: /bookings/uat-t8-booker-cancel → "⊘ Cancelled" badge + heading "You cancelled this request" + body "You cancelled your request — you haven't been charged."; no host-decline copy, no "Declined". /bookings/uat-t8-host-decline → "Declined" badge + "This request wasn't available" + "The host couldn't take your booking." (unchanged). Screenshots: t8-booker-cancel.png, t8-host-decline.png.

### 3. Block-reason copy + earnings fee-debt spacing (T9)
expected: The blocked-dates row reads '… · Cancelled by host', never the raw enum '… · host_cancellation'. The earnings debt line reads 'You have ₱300.00 in cancellation fees' with a visible space between the amount and 'in'.
steps: On /host/listings/uat_listing_bookable/availability with a host_cancellation block present, read the blocked-dates reason text. On /host/earnings with an outstanding host_cancel_fee debit, read the fee-debt line.
result: issue
evidence: Block-reason copy PASSES — the blocked-date renders "· Cancelled by host" and the raw enum "host_cancellation" is absent (t9-availability.png). Earnings fee-debt line FAILS — it renders "You have ₱300.00in cancellation fees still to be deducted." with NO space between the amount and "in" (t9-earnings.png; raw HTML: `You have <!-- -->₱300.00<!-- -->in cancellation fees`). Source `earnings/page.tsx:169` DOES contain a space (`}` + ` ` + `in`), but SWC's JSX whitespace transform strips the leading space of the text node that follows the `{formatMoney(...)}` expression, so the browser drops it. This is the exact defect the human-check targets and unit tests on the pure formatter cannot catch.

## Summary

total: 3
passed: 2
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

### G1 — Earnings cancellation-fee line drops the space before "in" (T9)
severity: minor
surface: src/app/(host)/host/earnings/page.tsx (~line 169)
observed: "You have ₱300.00in cancellation fees still to be deducted."
expected: "You have ₱300.00 in cancellation fees still to be deducted."
root_cause: SWC JSX whitespace transform strips the leading space of the JSXText that follows the `{formatMoney(...)}` expression container (source has the space; the compiled output does not). 07-20 T9 assumed this line was "intact — no change needed"; the live render disproves that.
fix: make the space non-strippable — insert an explicit `{" "}` between `{formatMoney(...)}` and `in cancellation fees…` (or `&nbsp;`). Consider a rendered-output regression (not a pure-function unit test) so a future whitespace regression is caught.
