---
phase: 07-bookings-management-cancellation-notifications
reviewed: 2026-07-24T04:51:41Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/app/(app)/bookings/[id]/page.tsx
  - src/app/(app)/bookings/page.tsx
  - src/app/(host)/host/bookings/page.tsx
  - src/app/(host)/host/listings/page.tsx
  - src/app/actions/booking.ts
  - src/app/listings/[id]/book/page.tsx
  - src/components/availability/blocks-editor.tsx
  - src/components/booking/booking-row.tsx
  - src/components/booking/booking-status-badge.tsx
  - src/components/booking/booking-status.ts
  - src/components/booking/cancellation-policy-disclosure.tsx
  - src/components/host/host-booking-row.tsx
  - src/components/listing/listing-card.tsx
  - src/lib/availability/block-reason.ts
  - src/lib/booking/bookings-query.ts
  - src/lib/money.ts
  - src/lib/payments/cancellation.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 7: Code Review Report (Gap Closure — 07-18 / 07-19 / 07-20)

**Reviewed:** 2026-07-24T04:51:41Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

This is an adversarial review of the Phase 7 gap-closure changes (diff base `ae7a65f`) across plans
07-18 (T6/T8 — `cancelled_by`-aware status derivation, `declinedCopy`, host row/table links), 07-19
(T4-rung — best-still-future rung summary; T11 — placeHold replay-suppression), and 07-20 (T4-hours
availability link; T7 — `formatMoney` two fraction digits; T9 — host-cancellation block label).

I traced the core logic paths end-to-end:
- **T8** is correct: `cancelUnpaidHold` (cancel-booking.ts:678-681) stores a booker-cancelled `requested`
  hold as `declined` + `cancelled_by='booker'`, and `declineRequest` (host-requests.ts:311) leaves
  `cancelled_by` NULL, so the `declined && cancelledBy==='booker' → cancelled` remap fires exactly on the
  booker-cancel case and never on a genuine host decline. The badge recipe and label agree, and the
  SQL-derived `displayStatus` (used only for `showPayNow`) does not diverge.
- **T11** correctly mirrors the established `re-request.ts:299` pattern; the added test (`notify-emission`
  case 7) confirms a replayed double-submit emits nothing while the hold/revalidate/redirect stay outside
  the guard.
- **T4-rung** `bestFutureRungIndex` is index-correct for the descending ladder, and the reserve page threads
  it as a display-only value while enforcement stays on the DB clock.

No BLOCKER-severity defects were found. Three WARNINGs concern a boundary-inclusivity mismatch, a narrow
at-least-once notification gap introduced by the replay guard, and a triplicated sentinel string. Three
INFO items cover documentation/consistency drift.

## Warnings

### WR-01: `bestFutureRungIndex` uses strict `>` while `quoteRefund` uses inclusive `>=` at the rung boundary

**File:** `src/lib/payments/cancellation.ts:150-151` (vs `quoteRefund` at `:95`)
**Issue:** `bestFutureRungIndex` selects the best open rung with `r.boundary.getTime() > now.getTime()`
(strictly future), whereas the enforcing quote awards a rung with `hoursToStart >= r.minHours` (inclusive).
At the exact boundary instant (`now === startsAt − minHours`) the two disagree: the enforcement engine still
grants the rung's refund, but the disclosure summary treats it as closed and leads with the next (lesser)
rung or the tier-name fallback. The module header explicitly makes "DISCLOSURE MUST EQUAL ENFORCEMENT" and
"rung boundaries are SHARP" load-bearing, so a reviewer should surface this mismatch. Practical impact is
low and booker-safe — the display always *under*-promises (never over-promises), and the checkout summary
already runs off the JS clock (`book/page.tsx:59`) while enforcement runs off the Postgres clock, so an
exact-instant collision is essentially unobservable. Still, the operator `>` vs `>=` is a genuine
inconsistency against the code's own stated invariant.
**Fix:** Make the display boundary inclusive to match `quoteRefund`:
```ts
export function bestFutureRungIndex(tier: CancellationTier, startsAt: Date, now: Date): number {
  return rungBoundaries(tier, startsAt).findIndex((r) => r.boundary.getTime() >= now.getTime());
}
```

### WR-02: T11 replay-suppression can drop the host's request notification if the first submit crashed before emit

**File:** `src/app/actions/booking.ts:193-255`
**Issue:** The `if (!res.replayed)` guard suppresses BOTH emissions on an idempotent replay. Because
`createPendingHold` commits the hold before the emissions run, a hard process crash in the narrow window
between the insert committing and `emitNotify` executing on the *first* submit leaves a live `requested`
hold that no one was ever notified about. A subsequent user retry then matches that hold via
`findOwnActiveHold` (same window / same idempotency key), returns `replayed:true`, and the guard suppresses
the emissions again — so the host is never told about a real, slot-occupying request that will silently
expire at the SLA. This mirrors the accepted `re-request.ts:299` behavior and the window is small
(`emitNotify` itself is durable via Inngest, so only a crash *before* the enqueue loses the event), so it is
a deliberate dedup-vs-at-least-once tradeoff rather than a clear bug — but the adversarial call is to flag
the behavior change explicitly so the team confirms the tradeoff is intended.
**Fix:** If at-least-once host notification matters more than perfect dedup, gate on a durable "notified"
marker rather than on `replayed` alone (e.g. set a `notified_at` column inside the same transaction that
creates the hold and emit when it transitions from null), so a replay after a lost first-emit still fires
exactly once. Otherwise, document the accepted tradeoff at the guard.

### WR-03: The `host_cancellation` sentinel is now triplicated across three modules with no shared constant

**File:** `src/lib/availability/block-reason.ts:9` (new), `src/app/actions/cancel-booking.ts:742`, `src/app/actions/blocks.ts:149`
**Issue:** 07-20 adds a third hand-copied literal of `"host_cancellation"`. The writer
(`cancel-booking.ts`), the punitive-block deletion guard (`blocks.ts` — the D-70 anti-resell abuse guard),
and now the display-label mapper (`block-reason.ts`) each redeclare the same string. Each carries a "mirror
of…" comment, but nothing enforces agreement: editing the sentinel in one file silently breaks the others.
The new copy is only cosmetic (a mislabeled block), but the *pattern* is fragile precisely because one of
the existing copies backs a security-relevant guard — a drift between writer and guard would let a host
delete their own punitive block. `block-reason.ts` is deliberately kept out of the `"use server"` graph, but
a tiny directive-free constant module can be imported by all three.
**Fix:** Extract one pure constant (e.g. `src/lib/availability/system-block-reason.ts` exporting
`export const HOST_CANCEL_BLOCK_REASON = "host_cancellation";`) and import it in all three sites, removing
the literal from each.

## Info

### IN-01: Stale module comment in `money.ts` after the fraction-digit change

**File:** `src/lib/money.ts:7`
**Issue:** The header still asserts "Behavior is byte-identical to the three local copies it replaces." T7
changed `minimumFractionDigits` from `0` to `2`, so the Intl path now renders `₱1,000.00` where the replaced
copies (and the pre-change formatter) rendered `₱1,000`. The claim is no longer accurate. (The change itself
is sound — it aligns the Intl path with the existing `.toFixed(2)` fallback and applies consistently to every
price surface.)
**Fix:** Update the comment to note the formatter pins to two fraction digits, matching the fallback.

### IN-02: Expanded policy `<details>` list still shows lapsed rungs against past boundaries

**File:** `src/components/booking/cancellation-policy-disclosure.tsx:81-86` (via `policyDisclosureLines`)
**Issue:** T4-rung corrected the collapsed summary to lead with the best still-future rung, but the expanded
disclosure list is unchanged: for a booking whose 100% window has passed it still renders "Cancel before
&lt;past instant&gt; — full refund of the space price". This is pre-existing behavior and outside the T4-rung
scope (which the plan limits to the summary line), but it is directly adjacent to the changed code and leaves
the summary and the expanded list telling slightly different stories once a rung lapses.
**Fix:** Out of scope for this gap; consider a follow-up that greys or annotates a lapsed rung in
`policyDisclosureLines` (e.g. "(window passed)") using the same server-computed index.

### IN-03: `now` comment references the wrong line number in the reserve page

**File:** `src/app/listings/[id]/book/page.tsx:205`
**Issue:** The T4-rung comment says "Computed here from the page's existing `now` (line 58)", but `now` is
declared at line 59 (`const now = new Date();`). Trivial off-by-one in a comment.
**Fix:** Update the reference to line 59.

---

_Reviewed: 2026-07-24T04:51:41Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
