---
phase: 09-open-capacity-bookings
plan: 20
subsystem: availability
tags: [postgres, drizzle, availability-block, open-capacity, read-model, advisory-lock, tstzrange]

requires:
  - phase: 09-open-capacity-bookings
    provides: "09-18's venueDayBoundsUtc / OpenDayWindow day bounds — the range this plan checks blocks against"
  - phase: 09-open-capacity-bookings
    provides: "09-09's Consequence-3 fork — a drop-in host cancel writes NO block, which is what makes honouring blocks safe"
  - phase: 03-availability-calendar
    provides: "availability_block, addBlock/removeBlock, the BlocksEditor and the exclusive '[)' block read"
provides:
  - "OPEN_BLOCK_UNIT_SCOPE_SQL + openBlockedSql — the ONE host-block predicate for a drop-in date"
  - "BLOCKED_DATE_MESSAGE — the O3 refusal a closed day returns"
  - "getOpenDay zeroes a blocked date (remaining 0 / full / not bookable) in the SAME statement as the heads SUM"
  - "getOpenMonthAvailability expands block rows to the venue-local dates they cover"
  - "createOpenCapacityHold refuses a blocked date inside the transaction, under the advisory lock"
affects: [09-21, 09-22, 09-23, 09-24, 09-25, phase-verification]

tech-stack:
  added: []
  patterns:
    - "Import only the half that would DRIFT: a per-date expansion has a different SHAPE from a single-date EXISTS, so the month grid imports OPEN_BLOCK_UNIT_SCOPE_SQL rather than retyping the predicate (the SUM(declared_pax) precedent)"
    - "A new refusal rides on an EXISTING statement inside the claim's transaction rather than adding a second round trip outside the lock"
    - "A blocked date reuses the SHIPPED full + not-bookable vocabulary; no fourth SpotsState"

key-files:
  created:
    - tests/availability/open-capacity-blocks.test.ts
  modified:
    - src/lib/availability/open-capacity.ts
    - src/lib/availability/read-model.ts
    - src/lib/availability/units.ts

key-decisions:
  - "Blocks are tested against the VENUE-LOCAL CALENDAR DAY [dayStartUtc, dayEndUtc), not the pass window — OC-02 makes a date one pass, and a pass-window rule would make the month grid and the day panel disagree (the NT-02 class). The reviewer's pass-window form is the recorded REJECTED ALTERNATIVE, rejected for drift, not difficulty."
  - "Accepted consequence, recorded in the predicate's docblock: a PARTIAL block (10:00-12:00) closes the WHOLE date for a drop-in listing. Ignoring blocks that do not cover the whole window would let a host block 06:00-21:59 and still sell passes."
  - "A blocked date renders as remaining 0 / state full / bookable false — no fourth SpotsState was invented; a `blocked` state would ripple into SpotsLeftChip, its unit test and the e2e assertions for no booker-visible gain."
  - "The claim's refusal is a bare { error } with NO soldOut flag: nothing was sold, so the CTA must not offer the race-loss refresh-and-retry affordance."
  - "The block scope is (ab.unit IS NULL OR ab.unit = 1) — an open listing is publish-enforced unitCount 1 and every open row uses the sentinel unit 1, so those are the only two scopes that can exist (D-24)."

patterns-established:
  - "Seam-first test design: the file drives the REAL addBlock/removeBlock/cancelBookingAsHost host actions and asserts the DATABASE (booking row count, availability_block row count) before any sentence"
  - "Confirm-then-fix: the failing run against unchanged src/ is recorded verbatim in the test header as the independent confirmation, alongside the mutation output"

requirements-completed: [OPEN-04, OPEN-02]

duration: 22min
completed: 2026-07-31
---

# Phase 09 Plan 20: Host Blocks on a Drop-in Listing (CR-02) Summary

**A host who closes a date on a drop-in listing now actually stops passes selling for it — in the day panel, the month grid, search and the claim — through ONE shared `EXISTS` predicate evaluated inside the admissions transaction under the advisory lock, with `availability_block` read for the first time anywhere below the Phase-9 fork.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-07-31T09:44Z
- **Completed:** 2026-07-31T10:06Z
- **Tasks:** 2 of 2
- **Files modified:** 3 source + 1 test created

## Task 1 — CR-02 independently confirmed (BRANCH A)

The plan is confirm-then-fix, and the confirmation is a failing run, not a reading of the reviewer's prose. `tests/availability/open-capacity-blocks.test.ts` was written **first, against unchanged `src/`** (`git status --short -- src/` empty, HEAD `ab68543`) and run. **All three assertions failed.** Output recorded VERBATIM in the file header and here:

```
 ❯ tests/availability/open-capacity-blocks.test.ts (3 tests | 3 failed) 1102ms
     × 1 · the day panel reports ZERO spots on a blocked date 80ms
     × 2 · the month grid disables the blocked date 8ms
     × 3 · the CLAIM refuses a blocked date and mints NO booking row 27ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/availability/open-capacity-blocks.test.ts > CR-02 — a host block must withdraw a drop-in
 date from sale > 1 · the day panel reports ZERO spots on a blocked date
AssertionError: expected 3 to be +0 // Object.is equality

- Expected
+ Received

- 0
+ 3

 ❯ tests/availability/open-capacity-blocks.test.ts:254:29
    252|     //    SpotsLeftChip and the DatePassPicker already render; a block…
    253|     const after = await spotsOn(BLOCKED);
    254|     expect(after.remaining).toBe(0);
       |                             ^
    255|     expect(after.state).toBe("full");
    256|     expect(after.bookable).toBe(false);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯

 FAIL  … > 2 · the month grid disables the blocked date
AssertionError: expected [] to include '2026-08-30'
 ❯ tests/availability/open-capacity-blocks.test.ts:264:41

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  … > 3 · the CLAIM refuses a blocked date and mints NO booking row
AssertionError: expected [ { …(3) } ] to have a length of +0 but got 1

- Expected
+ Received

- 0
+ 1

 ❯ tests/availability/open-capacity-blocks.test.ts:275:47

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯

 Test Files  1 failed (1)
      Tests  3 failed (3)
```

Read as one sentence: the public calendar offered the **full cap** on a date the host had closed and could see listed under "Blocked dates"; the month grid never disabled it either, so search and the picker kept offering it; and **the claim granted and priced a pass anyway** — one paid admission on a closed day. The host then either honours a day they shut or cancels every pass and pays the D-71 host-cancel fee on each one.

`git status --short -- src/` was empty at the end of Task 1. Commit `10053d5`.

**The reviewer's finding was real but its stated MECHANISM in 09-RESEARCH Pitfall 5 remains wrong**, exactly as `.continue-here.md` warns: the host-cancel auto-block does not "zero the date in the read model" — `getOpenDay` never joined `availability_block` at all. That missing join *is* CR-02, and 09-09's fork was kept for the separate, real harm (an undeletable `host_cancellation` row). Nothing here re-opens or re-litigates that fork.

## Task 2 — the fix

**(a) The range decision**, stated once in `openBlockedSql`'s docblock and applied at all three call sites: blocks are checked against the **venue-local calendar day** `[dayStartUtc, dayEndUtc)` (09-18's `venueDayBoundsUtc`), not the pass window. OC-02 makes a date one pass, so there is no sub-day inventory to withhold; the month grid cannot cheaply know each date's operating hours, so a pass-window rule would make the grid and the day panel disagree. The pass-window form is recorded as the **rejected alternative** — rejected for drift, not difficulty — and the accepted consequence (a partial block closes the whole drop-in date) is recorded with its own justification.

**(b) `src/lib/availability/open-capacity.ts`** gained the module's fifth owned fact (the header enumeration was updated from four to five, with a note that a block is *not* occupancy — nobody bought those admissions, which is why it zeroes the date rather than consuming heads):
- `OPEN_BLOCK_UNIT_SCOPE_SQL` — `(ab.unit IS NULL OR ab.unit = 1)`, with the sentinel explained (D-24: NULL = whole listing; open listings are publish-enforced `unitCount = 1` and every open row uses `unit = 1`);
- `openBlockedSql(listingId, dayStartUtcIso, dayEndUtcIso)` — an `EXISTS` using that scope plus the same `tstzrange(..., '[)')` overlap the exclusive read uses, carrying the same ⚠️ DO NOT COPY note `openTakenSql` carries;
- `BLOCKED_DATE_MESSAGE` — `"The host has closed this day — pick another date."`, beside `SOLD_OUT_MESSAGE` / `PAST_DATE_MESSAGE` in the same O3 grammar.

**(c) `getOpenDay`** evaluates `openBlockedSql` in the **same statement** that already computes `taken` — one round trip, not two. Blocked ⇒ `remaining = 0`, `state = "full"` (derived, not special-cased), `bookable = false`. A comment states explicitly that no fourth `SpotsState` was invented and why, so the next reader does not "improve" it.

**(d) `getOpenMonthAvailability`** now runs the taken aggregate and a block-row fetch in one `Promise.all`, then expands each block to the venue-local dates it covers, walking from the block's first date and re-deriving each date's bounds through `venueDayBoundsUtc` — the very fact the day panel's SQL predicate overlaps against, so the grid and the panel cannot disagree. The walk is clamped to the queried window at both ends (a decade-long block costs a month of iterations) and guarded at 40 steps. Dates come from the listing timezone, never the server's. `monthPrefix` filter, dedupe and sort are unchanged. Only the **unit scope** is imported — the per-date expansion necessarily has a different shape from the single-date `EXISTS`, mirroring the recorded `SUM(declared_pax)` precedent exactly.

**(e) `createOpenCapacityHold`** gained a `not_blocked` boolean column on the existing step-4 cap/rate statement and refuses in step 5 beside `day_open_ok` / `horizon_ok`, returning `BLOCKED_DATE_MESSAGE` as a bare `{ error }` with **no** `soldOut` flag. No second statement was added and the lock was not moved — the refusal is evaluated **inside the transaction and inside the advisory lock**, where every other capacity decision is made (Security V4 / T-09-64).

**(f) The test file** reached its final form: 7 cases, 602 lines, DB-backed, every date clock-relative, every block created through the **real** `addBlock`.

## The mandatory mutation — EXECUTED and recorded verbatim

The `not_blocked` refusal was deleted from `createOpenCapacityHold`, leaving the read-model half intact (so the calendar still says the date is shut while the claim sells it):

```
 ❯ tests/availability/open-capacity-blocks.test.ts (7 tests | 2 failed) 3646ms
     × 3 · the CLAIM refuses a blocked date and mints NO booking row 42ms
     × 4 · removing the block re-opens the date with the day's full remaining capacity 32ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  … > 3 · the CLAIM refuses a blocked date and mints NO booking row
AssertionError: expected [ { …(3) } ] to have a length of +0 but got 1

- Expected
+ Received

- 0
+ 1

 ❯ tests/availability/open-capacity-blocks.test.ts:436:47

 FAIL  … > 4 · removing the block re-opens the date with the day's full remaining capacity
AssertionError: expected 2 to be 3 // Object.is equality

- Expected
+ Received

- 3
+ 2

 ❯ tests/availability/open-capacity-blocks.test.ts:457:29

 Test Files  1 failed (1)
      Tests  2 failed | 5 passed (7)
```

`expected [ … ] to have a length of +0 but got 1` is **one paid admission on a day the host closed, while the calendar showed it shut** — the exact predicted shape.

**Which cases stayed GREEN under it is the finding.** Cases 1, 2, 6 and 7 all passed, because the read-model half was left in place. A fix applied to the calendar alone would look like four-sevenths of a success, and the only case that can say otherwise is the one that reads the `booking` table back. That is the T-09-64 assertion in one line: the picker is a courtesy, the claim is the gate.

**Case 4's cascade is part of the finding, not noise:** the pass the mutation let through is still occupying a head, so when the host unblocks, only 2 of 3 admissions come back (`expected 2 to be 3`). The host's way out does not undo the sale that should never have happened.

Restored → **7/7 green** → `git diff --exit-code src/` prints nothing (verified post-commit; no mutation residue).

## The seven cases

| # | Case | What it pins |
|---|------|--------------|
| 1 | the day panel reports ZERO spots on a blocked date | asserts the date is on sale FIRST, then blocks it through the real `addBlock`; remaining 0 / `full` / not bookable / cap untouched |
| 2 | the month grid disables the blocked date | the grid and the panel are two queries over one fact — a one-sided fix is the NT-02 class |
| 3 | **the CLAIM refuses a blocked date and mints NO booking row** | the crafted-payload path. Asserts `booking` row count **first**, then the imported literal and the absence of `soldOut` |
| 4 | removing the block re-opens the date | the real `removeBlock`; full cap back, gone from `fullDates`, and genuinely **sellable** again — also proves a host-created block escapes `removeBlock`'s `host_cancellation` refusal (T-07-66) |
| 5 | a host cancelling ONE drop-in pass still does not close the date | T-09-65 restated now that blocks bite: two pass-holders (2 heads + 1), the real `cancelBookingAsHost`, then **zero `availability_block` rows** and `remaining === 1` for everyone else |
| 6 | a block on a DIFFERENT date does not affect this one | the scope guard — cases 1-3 only ever look at the blocked date, so a range-less predicate would pass them all |
| 7 | an EXCLUSIVE listing's block behaviour is unchanged | a 10:00-12:00 block removes **exactly** hours 10 and 11; 09 and 12 stay available, the grid is still 16 hour-slots, `openCapacity` still null |

## 09-09's Consequence-3 fork — byte-unchanged, proven by hash

`git diff --stat src/app/actions/cancel-booking.ts` is empty, and the blob SHA is **identical to HEAD**: `8b48418011a84b93bf34b1e423b4bf5954a115b2`. `git diff --stat src/components/availability/spots-left-chip.tsx src/components/availability/date-pass-picker.tsx` is also empty — no UI vocabulary changed.

**Note for 09-25 (which also modifies `src/app/actions/cancel-booking.ts`): this plan touched that file NOT AT ALL — zero bytes, zero lines, no import, no comment.** The only interaction is a read.

## Gates

| Gate | Result |
|------|--------|
| `npx vitest run tests/availability/open-capacity-blocks.test.ts` | **7 passed (7)**, exit 0 |
| `npx vitest run` (full suite) | **1055 passed / 4 skipped**, ONE failure — the known `date-pass-picker` case 4 multi-suite timeout |
| `date-pass-picker` in isolation | **9 passed (9)**, exit 0 — reconfirmed, deferred item 3 |
| `npx tsc --noEmit` | 0 |
| `npm run lint` | **0 errors**, 7 baseline warnings (unchanged) |
| `git diff --exit-code src/` after restore + commit | clean |
| `git diff --stat src/app/actions/cancel-booking.ts` | empty (blob sha identical to HEAD) |

Baseline entering this plan was 1048 passed / 4 skipped plus the same single known failure. **1048 + 7 = 1055.** No pre-existing test is newly failing.

## Deviations from Plan

### 1. [Known plan defect — unsatisfiable acceptance grep] `grep -c "2026-" tests/availability/open-capacity-blocks.test.ts` prints **3**, not `0`

**Not absorbed. Documented, per the `.continue-here.md` advisory (19 such greps across the 16 executed plans; 09-18 and 09-19 each hit one).**

The plan requires two things that cannot both hold:
- Task 1 acceptance: *"its header carries the verbatim first run against unchanged `src/`, dated"*, reinforced by the orchestrator's blocking constraint (*"record output VERBATIM in the test file header and SUMMARY.md"*);
- Task 1 acceptance: `grep -c "2026-" … prints 0 — clock-relative dates only`.

Vitest's own assertion message for confirmation case 2 is `AssertionError: expected [] to include '2026-08-30'` — the **clock-relative fixture date rendered by the test runner**. Recording the run verbatim therefore necessarily puts `2026-` in the file.

**The load-bearing form is satisfied and was verified:** all 3 matching lines are inside `//` comments recording vitest output (2 in the recorded run, 1 in the note explaining this). `grep -n "2026-" … | grep -v '^[0-9]*://'` returns **nothing** — there is no calendar literal in any fixture. Every date in the file derives from `Date.now()` via `daysOut(n)`, which is what the grep exists to enforce.

The header's own date is written `31 July 2026` rather than the ISO form for the same reason, so the deviation is confined to the runner's output and is not compounded by prose.

### 2. [Rule 2 — correctness] `bookable` is forced false on a blocked date, beyond the plan's letter

The plan's (c) specifies `remaining = 0`, `state = "full"`, `bookable = false`. `bookable` was previously *only* a clock/horizon fact. Making it `!blocked && …` is what the plan asks for and is required for correctness — the CTA must be disabled on a date the claim will refuse, or the picker advertises an action that cannot succeed. Recorded because it widens the meaning of an existing field: `bookable` now means "the claim would accept this date", which is strictly more useful and is what every consumer already assumed.

### 3. [Rule 3 — blocking] `BLOCKED_DATE_MESSAGE` / `openBlockedSql` arrive in `units.ts` on a SECOND import statement

The shipped line `import { openTakenSql, PAST_DATE_MESSAGE, SOLD_OUT_MESSAGE } from "./open-capacity";` is the shared-predicate import that Pitfall-4 diff gates read. Adding to it in place would have changed a line several prior plans treat as a fixture. The new symbols therefore arrive on their own import statement with a comment saying why — the same handling 09-19 applied to `HOURS_LOCKED_MESSAGE`. No acceptance grep was affected (`grep -c "openBlockedSql(" src/lib/availability/units.ts` is still exactly `1`; the import form has no trailing paren).

## Threat Model — dispositions discharged

| Threat ID | Disposition | Evidence |
|-----------|-------------|----------|
| T-09-63 (stale availability) | mitigated | Cases 1 + 2 — day panel and month grid both evaluate the shared predicate |
| T-09-64 (crafted date bypasses the picker) | mitigated | Case 3 asserts **no `booking` row exists**, and the mutation proves the assertion bites; refusal is inside the tx, under the lock, on the existing statement |
| T-09-65 (one host cancel closes a whole day) | mitigated | `cancel-booking.ts` blob sha identical to HEAD; case 5 re-proves zero blocks + `remaining === 1` |
| T-09-66 (undeletable block strands a date) | mitigated | Case 4 removes through the real `removeBlock` and re-claims |
| T-09-67 (drift between claim and read model) | mitigated | One exported predicate, three call sites, ⚠️ DO NOT COPY note, acceptance greps pin the call form at each site |
| T-09-SC (package installs) | n/a | **No package was installed by this plan.** No `npm install` was run |

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change at a trust boundary. **No migration — the next number is still 0023**, exactly as the plan states; `drizzle/` is untouched.

## Known Stubs

None. No hardcoded empty value, placeholder string or unwired component was introduced.

## Deferred / left explicitly open

Nothing new was deferred. The pre-existing items are unchanged: `date-pass-picker` multi-suite timeout (item 3) and the invalid STATE.md `stopped_at` YAML (item 4) — the latter deliberately not touched here, per the execution constraint. `findOwnOpenHold`'s `confirmed` branch and unscoped `idempotency_key` arm remain **09-23**'s; the `cap ≤ 0` disagreement remains **09-24**'s. Neither was widened or narrowed by this plan; the month grid's `taken >= cap` comparison was left byte-identical for that reason.

## Commits

| Commit | What |
|--------|------|
| `10053d5` | `test(09-20)` — Task 1: the confirming failure against unchanged `src/`, recorded verbatim |
| `fc0c623` | `feat(09-20)` — Task 2: the shared predicate, three call sites, the final 7-case gate |

## Self-Check: PASSED
