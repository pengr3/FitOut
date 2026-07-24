---
status: partial
phase: 07-bookings-management-cancellation-notifications
source: [07-VERIFICATION.md]
started: 2026-07-24T05:10:00Z
updated: 2026-07-24T05:10:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Host bookings row navigation (T6)
expected: Desktop table row and mobile card both navigate to /host/bookings/[id]; Approve/Decline remain independently clickable on a `requested` row.
steps: On a DESKTOP-width /host/bookings (the default browser viewport), click a row's Space-cell text — confirm it navigates to /host/bookings/[id]. On mobile width, confirm tapping anywhere on the card navigates to the same page. On a `requested` row in both layouts, confirm Approve and Decline still work (the new overlay link must not swallow them).
why_human: Click-through navigation and z-index/overlay-swallowing behavior in a real browser at both breakpoints cannot be proven by a jsdom render test (no layout engine, no hit-testing). Deferred by 07-18-PLAN.md task-2 `<human-check>`.
result: [pending]

### 2. Truthful booker-cancel landing (T8)
expected: The booker-cancelled booking shows a 'Cancelled' badge and reads 'You cancelled this request' / 'You cancelled your request — you haven't been charged.' — never 'Declined' or 'the host couldn't take your booking'. The genuinely host-declined booking still shows 'Declined' with the host-decline copy, unchanged.
steps: As the booker, cancel an unpaid `requested` hold and view the resulting /bookings/[id] state. Separately, get a genuine host decline (or let an SLA lapse) and view that booking's /bookings/[id] state.
why_human: This is the exact defect the booker reported during UAT test 8 ("why it appeared as declined if the user cancelled it tho?"); confirming the fix requires seeing the real rendered page copy and badge in-browser. Deferred by 07-18-PLAN.md task-3 `<human-check>`.
result: [pending]

### 3. Block-reason copy + earnings fee-debt spacing (T9)
expected: The blocked-dates row reads '… · Cancelled by host', never the raw enum '… · host_cancellation'. The earnings debt line reads 'You have ₱300.00 in cancellation fees' with a visible space between the amount and 'in'.
steps: On /host/listings/[id]/availability with a host-cancellation block present, read the blocked-dates row's reason text. On /host/earnings with an outstanding cancellation-fee debit, read the fee-debt line.
why_human: Rendered spacing/copy in the live page (vs. the unit-tested pure `blockReasonLabel` function) needs an eyeball check per 07-20-PLAN.md task-3 `<human-check>`.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
