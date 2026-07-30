---
phase: 09-open-capacity-bookings
plan: 09
subsystem: bookings
tags: [cancellation, open-capacity, drop-in, refunds, availability-block, copy, react, drizzle, postgres]

# Dependency graph
requires:
  - phase: 07-bookings-management-cancellation-notifications
    provides: "cancelBookingAsHost / cancelBookingAsBooker, the D-68 refund ladder, the D-70 anti-resell auto-block, HostCancelDialog, CancellationPolicyDisclosure, the cancel review RSC"
  - phase: 09-open-capacity-bookings
    provides: "09-01 booking.open_capacity + the narrowed EXCLUDE; 09-02 openTakenSql / createOpenCapacityHold; 09-04 getAvailability's open branch; 09-08 composeWhenLabel's required openCapacity"
provides:
  - "cancelBookingAsHost SKIPS the D-70 anti-resell auto-block for open-capacity bookings (OC-16 / RESEARCH Pitfall 5)"
  - "the host-cancel audit meta records whether a block was written, so policy and failure are distinguishable"
  - "HostCancelDialog promises TWO consequences for a drop-in booking (UI-SPEC O8), behind a REQUIRED openCapacity prop"
  - "CancellationPolicyDisclosure's GENERIC copy says 'before the space opens' for a drop-in listing, behind a REQUIRED DeadlineAnchorInput"
  - "the cancel review's D-78 tier rationale reads '{N} hours before the space opens on {date}'"
  - "composeDateLabel — a shared venue-local bare-date formatter in when-label.ts"
affects: [09-12, 09-13, 09-14, 09-15, 09-16, host-cancellation, refunds, availability]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Required-flag-by-intersection: one exported `DeadlineAnchorInput` type carries `openCapacity: boolean` and is intersected into a component's props AND its two pure helpers, so the flag is required in three places while being declared once"
    - "Behaviour and copy fork on the SAME persisted column (booking.open_capacity), never on two independently-derived booleans"
    - "Untestable-primitive swap: stub only the Radix Select (jsdom has no Pointer Events) and keep the markup under test entirely real — the next/link idiom from host-booking-row.test.tsx"

key-files:
  created:
    - tests/booking/open-capacity-cancel.test.ts
    - tests/booking/cancellation-copy.test.tsx
  modified:
    - src/app/actions/cancel-booking.ts
    - src/components/host/host-cancel-dialog.tsx
    - src/components/booking/cancellation-policy-disclosure.tsx
    - src/app/(app)/bookings/[id]/cancel/page.tsx
    - src/app/(host)/host/bookings/[id]/page.tsx
    - src/app/listings/[id]/page.tsx
    - src/app/listings/[id]/book/page.tsx
    - src/lib/booking/when-label.ts
    - tests/booking/cancellation-policy.test.ts

key-decisions:
  - "Consequence 3 (the D-70 auto-block) is the ONLY forked consequence: the refund, the host-cancel fee, the audit and both notifications fire unchanged for a drop-in cancellation (RESEARCH A5)"
  - "The seat release needed ZERO code — `remaining` is a live SUM over the occupying set, so a cancelled row leaves it by itself (RESEARCH Pitfall 3 / OC-15)"
  - "The CONCRETE-instant disclosure strings are deliberately NOT forked: OC-03 already makes that instant the venue's opening time, so a second wording would be drift, not accuracy"
  - "The cancel review's context line is NOT re-composed locally — 09-08's composeWhenLabel already renders the § 5b drop-in framing, and a local re-compose would give one surface its own wording"
  - "composeDateLabel was added to when-label.ts rather than calling date-fns `format` on the page, because that module's header forbids a fourth copy of venue-local rendering"

patterns-established:
  - "Pattern 1: a fork that REMOVES a consequence must record its own absence in the audit trail, so an operator can tell deliberate policy from a failed write"
  - "Pattern 2: when a plan's headline assertion provably cannot fail against the shipped code, say so in the test file and name the assertion that does bite — rather than shipping a vacuous green"

requirements-completed: [OPEN-02, OPEN-04]

# Metrics
duration: 42min
completed: 2026-07-30
---

# Phase 9 Plan 09: Drop-in Cancellation Summary

**A host cancelling one drop-in pass no longer writes a whole-day availability_block — the refund, the D-71 fee, the audit and both notifications all still fire, the freed head returns to the pool with no release code, and every cancellation surface now says "before the space opens" instead of "before the session".**

## Performance

- **Duration:** ~42 min
- **Started:** 2026-07-30T11:18:00Z
- **Completed:** 2026-07-30T12:00:00Z
- **Tasks:** 2 of 2
- **Files modified:** 9 modified, 2 created

## Accomplishments

- **The Pitfall-5 fork ships.** `cancelBookingAsHost`'s Consequence 3 is wrapped in `if (!row.openCapacity)`. A drop-in booking's window is the venue's whole operating day on the sentinel `unit = 1` that every open row on that date shares, and its price is a fixed per-head rate the host set at publish — so the block has neither a slot to protect nor anything to resell. Consequences 1 (full refund incl. the D-74 service fee), 2 (the D-71 host-cancel fee) and 4 (both notifications) are byte-unchanged, and the diff removes no refund-math line (`quoteRefund` / `LADDER` / `hoursToStart` / `refundBps` all count 0 in the removed lines).
- **The fork records its own absence.** The host-cancel audit `meta` now carries whether a block was written, so an operator reading a drop-in cancellation sees deliberate policy rather than suspecting the `host_cancel_autoblock_failed` needs-attention path fired silently (threat T-09-32).
- **The seat release needed no code at all** — proven, not assumed. Case 4 cancels a 2-head pass, watches `remaining` rise by exactly 2, and then mints a fresh `createOpenCapacityHold` for exactly those 2 heads as a DIFFERENT booker. The heads are sellable again, not merely counted differently.
- **The dialog stopped promising a block it will not create.** `HostCancelDialog.openCapacity` is a REQUIRED prop; the third bullet renders only when it is false, and the `sr-only` description now interpolates "two"/"three" instead of hardcoding "three" — a screen-reader user was previously told to expect a consequence the list did not contain.
- **The generic policy disclosure forks; the concrete instants do not.** One exported `DeadlineAnchorInput` type declares `openCapacity: boolean` ONCE and is intersected into the component props and both exported pure helpers, so the compiler asked the question at every call site (the census was exactly `tests/booking/cancellation-policy.test.ts`). The `Free cancellation until {instant}` strings are untouched, with a comment explaining why a later reader must not "finish the fork".
- **Both forks were MUTATION-MEASURED, executed and restored.** Forcing the block to always insert turned cases 1/3/5 of the action test RED (`expected [ { … } ] to have a length of +0 but got 1`); rendering the Block bullet unconditionally turned case 3 of the copy test RED (`expected <li><strong></strong></li>`). `git diff --exit-code` clean on both files afterwards.

## Task Commits

1. **Task 1: skip the anti-resell auto-block for open-capacity bookings** — `960f2a3` (feat)
2. **Task 2: the three cancellation copy forks** — `0515cae` (feat)

## Files Created/Modified

- `src/app/actions/cancel-booking.ts` — Consequence 3 wrapped in the open-capacity guard with the full rationale stated at the fork; the four-consequences header gained the one-exception note; the host-cancel audit meta gained the block-written flag.
- `tests/booking/open-capacity-cancel.test.ts` (NEW, 5 cases) — no block on a drop-in cancel while the refund + debit + notifications all fire; the EXCLUSIVE cancel still writes the sentinel block (the D-70 regression guard, both audit flag values asserted); the shared date stays open for the other pass-holder; a booker cancel returns exactly its heads and they are immediately re-claimable; the standard-tier ladder refunds the full space price against OC-03's opening instant with the service fee retained.
- `src/components/host/host-cancel-dialog.tsx` — REQUIRED `openCapacity`, conditional third `<li>`, truthful `sr-only` count.
- `src/components/booking/cancellation-policy-disclosure.tsx` — `DeadlineAnchorInput` (exported, required); both generic strings forked; both concrete branches annotated as deliberately unforked.
- `src/app/(app)/bookings/[id]/cancel/page.tsx` — `rungDescription` takes the anchor; the D-78 rationale names the date the space opens.
- `src/lib/booking/when-label.ts` — `LONG_DATE`/`SHORT_DATE` tokens named once; new `composeDateLabel(instant, timezone)`.
- `src/app/(host)/host/bookings/[id]/page.tsx`, `src/app/listings/[id]/page.tsx`, `src/app/listings/[id]/book/page.tsx` — the three call sites the required props forced, each threaded from a persisted column (`booking.open_capacity` twice, `listing.occupancy_mode` once); the reserve page gained an `openCapacity` projection it did not previously read.
- `tests/booking/cancellation-copy.test.tsx` (NEW, 5 jsdom cases) — the generic anchor forks at every tier while the outcomes stay byte-identical; the rendered disclosure; the concrete strings proven equal across modes; two bullets and no "Block" for a drop-in dialog; three bullets naming the window for an exclusive one.
- `tests/booking/cancellation-policy.test.ts` — the compiler census, threading a named `EXCLUSIVE` anchor through 16 call sites.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's own case-3 premise does not hold against the shipped read model**

- **Found during:** Task 1, while executing the auto-block mutation.
- **Issue:** 09-RESEARCH Pitfall 5 (quoted by the plan and by the threat register as T-09-31) predicts that the whole-day block "zeroes the date in the read model", and the plan's case 3 asserts `remaining === 3` / `state !== "full"` as the proof. It is not a proof: 09-04's `getOpenDay` projects `cap − openTakenSql(...)` and **never joins `availability_block` at all**, so that half of case 3 stays green with the fork deleted. Measured — with the guard forced true, case 3 failed on its block-count line, not on its spots-left lines.
- **Fix:** the fork is still correct and still required, for a harm that IS present: `removeBlock` REFUSES to delete a `host_cancellation` block (blocks.ts `SYSTEM_BLOCK_REASON` / T-07-62), so every drop-in host cancel would leave a permanent, host-**undeletable** whole-day row on the sentinel unit — one per cancelled pass, visible on `/host/listings/[id]/availability` forever, and becoming booker-facing the moment OC-17 lets the host switch the listing back to exclusive, where the read model DOES subtract blocks. Case 3 keeps both assertion families, and its comment (plus the file header) states plainly which one bites and which is a forward guard. No vacuous green was shipped under a name it does not earn.
- **Files modified:** `tests/booking/open-capacity-cancel.test.ts`
- **Commit:** `960f2a3`

**2. [Rule 3 - Blocking] The plan's "shared formatter" for the rationale date did not exist**

- **Found during:** Task 2(c).
- **Issue:** the plan requires the tier rationale's `{date}` to be composed "with the shared formatter, never a local `format` call". `when-label.ts` exported only window labels (`composeWhenLabel`, `composeWhenLabelShort`) and a deadline label — no bare-date export. A local `format()` on the page is exactly the fourth copy that module's header forbids.
- **Fix:** added `composeDateLabel(instant, timezone)` to `when-label.ts`, rendered off the SAME `LONG_DATE` token `composeWhenLabel` uses (both date tokens are now named constants), so the sentence and the label above it can never name one instant two different ways. `when-label.ts` was not in the plan's `files_modified`.
- **Files modified:** `src/lib/booking/when-label.ts`
- **Commit:** `0515cae`

### Deliberate departures from the plan's letter

**3. The cancel review's context line was NOT re-composed.** The plan asks for `{title} · {date} drop-in pass ({City} time)` per § 5b. 09-08 had already made `composeWhenLabel` render an open row as `{date} · Drop-in pass, any time {open} – {close} ({City} time)`, and STATE.md records that as the canonical long form. Re-composing § 5b's wording locally would give this one surface its own phrasing for the same booking — precisely the drift the plan's own instruction ("never a local `format` call, so the drop-in framing cannot drift from `when-label.ts`") exists to prevent. The line is left flowing through the shared formatter, with a comment recording the reasoning.

**4. Two more call sites than the plan listed.** The required `openCapacity` prop on `CancellationPolicyDisclosure` forced `src/app/listings/[id]/page.tsx` (threaded from `listing.occupancy_mode`) and `src/app/listings/[id]/book/page.tsx` (which had to ADD a `booking.open_capacity` projection). That is the required-flag census working as designed — the generic listing-page disclosure is § 5b's own third row, and it could not have been reached any other way.

**5. `DeadlineAnchorInput` is required in THREE places, not one.** The plan said "add a REQUIRED `openCapacity: boolean` prop", and its acceptance grep demands exactly ONE occurrence of that literal in the file. Making only the component's prop required would have left both exported pure helpers silently defaulting to exclusive copy. Declaring the flag once in an exported type and intersecting it into the props and both helper signatures satisfies the grep AND makes the flag required everywhere — strictly stronger than either reading alone.

**6. The plan's `autoBlocked` acceptance grep was self-defeating on the first pass** (the explanatory comment named the very token the grep counts, yielding 2). This is the sixth instance of that class in Phase 9. The comment was reworded to refer to "the meta's last field" and now carries an explicit note that the field name must not be spelled in prose. The count is 1.

### Not deviations, recorded for the next reader

- `user-event` is NOT installed in this repo (only `@testing-library/react` + `jsdom`), so the dialog traversal uses `fireEvent` with a native-`<select>` stub of `@/components/ui/select` — Radix Select is driven by Pointer Events that jsdom does not implement. Only that primitive is stubbed; the consequences list under test is entirely real, and the pane-1 gate is asserted (`aria-disabled === "true"` before a reason is picked) so the traversal cannot silently degrade into a no-op.

## Verification

| Gate | Result |
|---|---|
| `npx vitest run tests/booking/open-capacity-cancel.test.ts` | 5 passed |
| `npx vitest run tests/booking/cancellation-copy.test.tsx` | 5 passed |
| `npx vitest run tests/booking tests/payments` | 34 files / 389 passed |
| `npm test` (full suite) | **958 passed / 4 skipped** (105 files, up from 948) |
| `npx tsc --noEmit` | 0 errors |
| `npm run lint` | 0 errors / 7 baseline warnings |
| `npm run build` | exit 0, full route table |
| `git diff -U0 src/app/actions/cancel-booking.ts \| grep '^-' \| grep -c "quoteRefund\|LADDER\|hoursToStart\|refundBps"` | `0` — no refund-math line was removed |

### Acceptance greps

| Grep | Expected | Actual |
|---|---|---|
| `if (!row.openCapacity) {` in cancel-booking.ts | 1 | 1 |
| `availabilityBlock` in cancel-booking.ts | unchanged (2) | 2 |
| `autoBlocked` in cancel-booking.ts | 1 | 1 (after rewording the comment — deviation 6) |
| `openCapacity: boolean` in host-cancel-dialog.tsx | 1 | 1 |
| `openCapacity?:` in host-cancel-dialog.tsx | 0 | 0 |
| `openCapacity: boolean` in cancellation-policy-disclosure.tsx | 1 | 1 |
| `before the space opens` in cancellation-policy-disclosure.tsx | 2 | 2 |
| `Free cancellation until` in cancellation-policy-disclosure.tsx | unchanged (3) | 3 |
| `The three consequences` in host-cancel-dialog.tsx | 0 | 0 |
| `before the space opens` in cancel/page.tsx | ≥ 2 | 2 |

### Mutations executed (and restored)

| Mutation | Observed | Restored |
|---|---|---|
| `if (!row.openCapacity)` → `if (true)` in cancel-booking.ts | cases 1/3/5 RED — `expected [ { …(7) } ] to have a length of +0 but got 1`, `… but got 2`, `expected 2 to be +0` | yes |
| `{!openCapacity && (` → `{true && (` in host-cancel-dialog.tsx | case 3 RED — `expected <li><strong></strong></li>` (three bullets on a drop-in dialog) | yes |

## Threat Model Coverage

| Threat ID | Disposition | How it is met |
|---|---|---|
| T-09-31 (DoS against other bookers) | mitigated | Consequence 3 is skipped when `booking.open_capacity` is true; case 1 reads the block table back and finds nothing, case 3 proves the surviving pass-holder's date is untouched. See Deviation 1 for the precise harm this prevents. |
| T-09-32 (repudiation — a promise never kept) | mitigated | The dialog bullet and the action's behaviour fork on the SAME persisted column; the prop is REQUIRED (three signatures) so no surface can keep the old copy; the audit meta records whether a block was written. |
| T-09-33 (EoP — cancelling someone else's booking) | unchanged | No new entry point. The Phase-7 owner gates (`loadHostOwnedBooking` + the in-WHERE `EXISTS`) are untouched — `tests/payments/host-cancel.test.ts` case 10 still green. |
| T-09-34 (tampering with a drop-in refund) | mitigated | No new refund path. Case 5 derives its expectation from the shipped `LADDER` via a second `quoteRefund` call and pins the full space price with the fee retained; the diff grep proves no refund-math line was removed. |

## What the next plan should know

- **A drop-in host cancellation writes NO `availability_block`, on purpose.** If a future consumer needs to know a drop-in date was disrupted, the audit trail's `host_cancel_booking` entry is the record — not the block table.
- **The read model's open branch does not read `availability_block` at all.** If a later plan makes it (e.g. so a host can close a drop-in date), the Pitfall-5 damage becomes literal, and case 3's spots-left half starts biting. That is the intended forward guard.
- **`DeadlineAnchorInput` is the pattern for "one required flag, several signatures."** Import it rather than re-declaring `openCapacity: boolean`, or the disclosure file's acceptance grep will start counting extras.
- **`composeDateLabel` exists now.** Any future prose that names a booking's date should use it rather than `format()`.
- **09-15/09-16 still owe the remaining 09-UI-SPEC drop-in surfaces.** The § 5b cancellation copy is complete as of this plan (context line via 09-08, tier rationale + generic disclosure here); nothing on the cancellation path is outstanding.

## Known Stubs

None. Every surface this plan touched renders from a persisted column; no placeholder values, no hardcoded empties, no "coming soon" copy was introduced.

## Self-Check: PASSED

- `tests/booking/open-capacity-cancel.test.ts` — FOUND
- `tests/booking/cancellation-copy.test.tsx` — FOUND
- `src/app/actions/cancel-booking.ts` — FOUND (contains `openCapacity`)
- `src/components/host/host-cancel-dialog.tsx` — FOUND (contains `openCapacity: boolean`)
- `src/components/booking/cancellation-policy-disclosure.tsx` — FOUND (contains `DeadlineAnchorInput`)
- Commit `960f2a3` — FOUND
- Commit `0515cae` — FOUND
