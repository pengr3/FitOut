---
phase: 09-open-capacity-bookings
plan: 19
subsystem: listing
tags: [open-capacity, drop-in, cr-03, oc-17, operating-hours, host-editor, mutation-testing, vitest]

# Dependency graph
requires:
  - phase: 09-open-capacity-bookings
    provides: "09-18's counter re-anchor (the venue-local calendar day over the stored `booking.starts_at`), which is what makes this guard about STRANDING rather than overbooking; `OPEN_OCCUPYING_STATUS_SQL` (09-02) as the imported occupying predicate; `createOpenCapacityHold` + `loadOpenDayWindow` (09-02) as the real claim the gate mints its pass through; OC-17's `getModeLockState` (09-06) as the module shape and the only-a-genuine-change idiom"
  - phase: 03-availability-calendar
    provides: "`saveOperatingHours`, its session/ownership/validation security contract and its replace-the-set transaction — the pre-Phase-9 seam this guard is inserted into; the `HH:mm` ↔ `HH:mm:ss` round-trip rule the canonicalisation depends on"
provides:
  - "CR-03 layer 2 CLOSED: an hours edit that would strand drop-in passes already sold is REFUSED server-side, and the persisted `operating_hours` rows are proven unchanged by reading them back from Postgres."
  - "`getOpenHoursLockState(dbConn, listingId)` — the single authority for which VENUE-LOCAL WEEKDAYS live drop-in passes freeze, plus how many and when the freeze lifts."
  - "`HOURS_LOCKED_MESSAGE` — the shared refusal sentence, the hours-level twin of `MODE_LOCKED_MESSAGE`, so the gate and the copy cannot drift."
  - "A host-facing advisory on `/host/listings/[id]/availability` naming the frozen weekdays, the unlock date and the way out — calm muted information, no alert variant."
  - "tests/availability/hours-lock.test.ts — 5 DB-backed cases driving the REAL `saveOperatingHours` through a REAL session, mutation-measured at `expected '07:00:00' to be '06:00:00'`."
affects: [09-23, 09-24, phase-verification, future-phases-touching-operating-hours]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "When a guard must be inserted into pre-existing shipped code, drive the SEAM in the test — call the real action with a real session, not the new module in isolation. A unit test of the lock module would have gone green while the action happily overwrote the rows."
    - "A refusal is proven by reading the PERSISTED state back, never by the returned sentence. Assertion order is load-bearing: the DB read is asserted first so the failure message names the harm (the row moved under a sold pass) rather than a proxy for it."
    - "Two representations of the same value (`HH:mm` from a form, `HH:mm:ss` from Postgres) must be canonicalised before a change-detection comparison, or the guard becomes a denial of service against the very user it protects — a no-op autosave would be refused forever."
    - "An acceptance diff-gate that forbids removing a line makes REFORMATTING that line a violation. A second import statement from the same module is the honest way to satisfy it — and says out loud, in a comment, why the obvious tidier form was not used."
    - "Record the OBSERVED mutation set, never the predicted one. The plan predicted one RED case; four went red, because every later scope guard re-asserts the state case 1 protects and therefore inherits its failure."

key-files:
  created:
    - src/lib/listing/hours-lock.ts
    - tests/availability/hours-lock.test.ts
  modified:
    - src/lib/validation/availability.ts
    - src/app/actions/operating-hours.ts
    - src/app/(host)/host/listings/[id]/availability/page.tsx

key-decisions:
  - "The venue-local weekday is derived from the STORED `booking.starts_at`, not `ends_at`: a split-shift or overnight venue's closing instant can land on the next calendar day, and a pass belongs to the day it was bought for — the same day 09-18's counter counts it against. Keying off the closing instant would freeze Tuesday because of a Monday pass and leave Monday editable."
  - "`ends_at > now()` is the upcoming-OR-active bound, identical to `mode-lock.ts`. A host is never frozen out by their own back catalogue, and case 5 proves it with a pass whose day is over."
  - "The DB clock is the only clock — SQL `now()`, no injectable `now`, no JS wall-clock read in the module. A server whose clock drifts must not be able to unfreeze a weekday early."
  - "Only a GENUINE change is refused, mirroring `saveListingStep`'s OC-17 idiom. Both sides are canonicalised to `HH:mm:ss` and compared PER LOCKED WEEKDAY ONLY, so an edit to an unrelated weekday and a no-op autosave both proceed. Getting this wrong would freeze the editor for every host with a pass on the calendar (T-09-60)."
  - "The guard reads the PERSISTED `occupancy_mode`, never the client's word for it, and short-circuits the query entirely on the exclusive path — even though `open_capacity = true` already makes the result empty by construction for an exclusive listing."
  - "The refusal sentence is composed in the ACTION, not the component: `HOURS_LOCKED_MESSAGE` + the venue-local unlock date via the shipped `composeDateLabel` + the way out. D-105 — a raw Date handed to a client formatter would render the host's own browser clock, a different instant from the one the lock lifts at."
  - "`ModeLockNotice` was deliberately NOT reused: it hardcodes `MODE_LOCKED_MESSAGE` as its title. Its O7 discipline (WHY + a concrete WHEN + a way out) was copied; its markup was not."
  - "`HOURS_LOCKED_MESSAGE` is imported into the action via a SECOND import statement from `@/lib/validation/availability` rather than by widening the shipped one, because the acceptance diff-gate treats any removal of the `weeklyHoursSchema` import line as a rewrite of the security contract. The reason is stated in a comment above it so nobody 'tidies' it back."
  - "The weekday-name list is a local const in the availability page, not a new shared export: `weekly-hours-editor.tsx` keeps its own copy and the acceptance gate forbids touching that file, so refactoring both into one export was out of scope for a lock fix."

patterns-established:
  - "Pattern: a cascading mutation set is evidence, not noise. Cases 2, 3 and 5 each re-assert that the LOCKED weekday is still where the sold pass left it, so once case 1's edit actually lands they all inherit its failure — which is precisely what makes them scope guards rather than decoration. Case 4 (the exclusive listing) stayed green, correctly: no mutation of this guard can move it."

requirements-completed: [OPEN-03]

# Metrics
duration: 22min
completed: 2026-07-31
---

# Phase 9 Plan 19: Hours-Edit Refusal (CR-03 Layer 2) Summary

**A host can no longer change or delete the operating hours of a weekday that still carries upcoming or active drop-in passes — the save is refused server-side with a sentence naming why, when the freeze lifts and how to clear it, and the refusal is proven by reading `operating_hours` back from Postgres rather than by trusting the returned words.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-31T09:17Z (17:17 Makati)
- **Completed:** 2026-07-31T09:39Z (17:39 Makati)
- **Tasks:** 2/2
- **Files:** 5 (2 created, 3 modified)
- **Commits:** `fbc9a5c`, `9973a46`

## What This Closes, And What It Is Not

09-18 (layer 1) made an hours edit **non-catastrophic**: the admissions counter is anchored on the venue-local
calendar day over the stored `booking.starts_at`, so an edit can no longer empty the counted set or make a
second full cap sellable. This plan refuses **the edit itself**, and it is a *different harm*:

A drop-in pass persists concrete `starts_at`/`ends_at` at hold time (OC-03), and those instants are what the
Phase-7 refund ladder, the payout sweep (`ends_at + delay`), the reminders and expiry all key on. Move
Monday's opening 06:00 → 07:00 and every pass already sold for a future Monday claims an entry window the
venue will not honour, with a refund deadline computed off an opening time that no longer exists. **Deleting
a weekday's hours is worse:** `loadOpenDayWindow` returns null, the day panel renders "Closed on {day}", and
the sold passes go invisible in every read model while still occupying admissions.

The guard is OC-17's shape one level down — a host may change **how** a space is sold only while nothing is
still to come, and may now change **when** it is open only for the weekdays nothing is still to come on.

## Accomplishments

### Task 1 — the lock authority and the shared sentence (`fbc9a5c`)

**`src/lib/listing/hours-lock.ts` (new)** — `getOpenHoursLockState(dbConn, listingId)` →
`{ lockedWeekdays: number[]; lockedByCount: number; unlocksAt: Date | null }`. Mirrors `mode-lock.ts` in shape
and discipline: one exported async function, ONE raw-SQL statement, a `string | Date` row type for the
postgres.js boundary, and a header stating why the guard lives in the action rather than the DB (there is no
constraint that could express it — `operating_hours` rows carry a *weekday*, the passes they would strand live
in another table keyed on *absolute instants*).

- `booking b` joined to `listing l` for the venue timezone the weekday is computed in — never the server's.
- Filtered to `b.open_capacity = true`, `b.ends_at > now()`, and the **imported**
  `OPEN_OCCUPYING_STATUS_SQL` (open capacity is instant-only, OC-10, so the set is deliberately narrower
  than the exclusive one — retyping it is the T-03-RANGE-MISMATCH class).
- Grouped by the venue-local day-of-week with `GROUP BY 1`, so the grouping key and the projected key cannot
  drift (the 09-18 idiom).
- Three header rules, each with its reason: `starts_at` (not `ends_at`) decides the weekday; `ends_at > now()`
  is what makes it "upcoming OR active"; the DB clock is the only clock — phrased **without** naming the JS
  date constructors, exactly as `mode-lock.ts:51-53` does, so the grep tripwire idiom stays usable.
- States that `lockedWeekdays` is empty for an EXCLUSIVE listing **by construction**, while still telling the
  caller to branch on the persisted `occupancy_mode` to skip a guaranteed-empty query.
- The `0=Sun..6=Sat` agreement across `operating_hours.day_of_week` (schema.ts:606), `venueDayOfWeek`
  (slots.ts:54-56) and Postgres's day-of-week field is stated in the type doc, with an explicit "do not
  correct this to the 1=Mon..7=Sun variant" — see Deviation 1 for why the ISO name itself is not spelled.

**`src/lib/validation/availability.ts`** — `HOURS_LOCKED_MESSAGE`:
`"You can't change these hours while drop-in passes are still to come for that day."` O3 grammar (statement +
imperative next step, no exclamation, never rendered red), documented as the hours-level twin of
`MODE_LOCKED_MESSAGE` and citing CR-03. It stops at the WHY deliberately: the WHEN is per-listing and cannot
be baked into a shared literal.

### Task 2 — the refusal, the advisory and the DB-backed gate (`9973a46`)

**`src/app/actions/operating-hours.ts`** — the guard sits after `weeklyHoursSchema.safeParse` and **before**
the transaction, wrapped in `owned.occupancyMode === "open_capacity"` so the exclusive path pays nothing.
When `lockedWeekdays` is non-empty it loads the persisted rows and compares, **per locked weekday only**, the
canonicalised window sets — refusing only on a genuine difference.

- `normalizeTime` + `canonicalWindowsByDay` normalise BOTH sides to sorted `"HH:mm:ss-HH:mm:ss"` strings.
  `weeklyHoursSchema` is `:ss`-tolerant, so `"06:00"` from the form and `"06:00:00"` from Postgres are the
  same window; the comment says out loud that getting this wrong refuses every save on a locked weekday
  including a no-op autosave, which is a denial of service against the host (T-09-60).
- The refusal returns the sentence in **both** `error` and `fieldErrors.windows[0]`, so
  `weekly-hours-editor.tsx:136-146` surfaces it as a toast AND a form error with **no component change**.
- The sentence is `HOURS_LOCKED_MESSAGE` + `"The last one is for {venue-local date}, so you can change them
  after that."` + `"To change them sooner, cancel those passes from your bookings — that refunds those guests
  in full."` The date is formatted server-side by the shipped `composeDateLabel` with the timezone named
  (D-105); a raw Date handed to a client formatter would render the host's own browser clock.
- The rationale comment states that this is **not** about overbooking (09-18 closed that) but about
  **stranding**, and cites CR-03 and OC-17.
- The shipped security contract is untouched: `assertOwnership`, `weeklyHoursSchema` and `revalidatePath` all
  still run, and the diff-gate proving so returns `0`.

**`src/app/(host)/host/listings/[id]/availability/page.tsx`** — a calm muted advisory under the existing
open-capacity line and above the `Weekly hours` section, server-computed and rendered only when something is
actually frozen. It names the affected weekdays by their venue-local names, the pass count, the unlock date
(via `composeDateLabel`) and links to `/host/bookings` as the way out. The lock query runs **only** for a
drop-in listing (a ternary in the existing `Promise.all`). Neutral styling only — no `destructive`, no alert
variant. It names weekdays and a date, never a booker, and renders inside the already owner-gated `(host)`
page from the same `row` the page loaded.

The advisory's sentence is assembled as ONE string rather than interleaved JSX text — the
`cancellation-fee-notice.tsx` lesson (SWC's JSX whitespace transform strips the leading space of text
following an expression container, which is how `"₱300.00in cancellation fees"` once shipped).

**`tests/availability/hours-lock.test.ts` (new, 432 lines ≥ 110 `min_lines`)** — DB-backed against real
Postgres, driving the **REAL** `saveOperatingHours` with a **real** better-auth session and a real owned
listing (the `blocks.test.ts` / `crud.test.ts` harness: mutable `sessionHeaders` → mocked `next/headers`,
`vi.doMock` on `@/lib/auth`, `@/lib/db` and `next/cache`, then a lazy import of the action). Every fixture
date is clock-relative; the file contains no calendar literal.

Four **distinct** weekdays, so no case can pass because of another's edit: `+7` (today's weekday, the locked
one), `+9` (unlocked), `−4` (a finished pass), `+8` (the exclusive listing).

1. **a weekday carrying an upcoming drop-in pass cannot have its hours changed** — a pass minted by the REAL
   `createOpenCapacityHold` via `loadOpenDayWindow` (exactly as `placeOpenHold` steps 7-8 do), then an edit
   moving that weekday's opening 06:00 → 07:00. **The DATABASE is asserted first**: the persisted `open_time`
   is still `06:00:00` (and `close_time` still `22:00:00`). Only then `ok === false`, the sentence in both
   `error` and `fieldErrors.windows[0]`, and — structurally, not as a literal — that it carries a concrete
   venue-local date (`/The last one is for .+\(Makati time\)/`) and the way out.
2. **an unlocked weekday is still freely editable** — the new window is read back from `operating_hours`, and
   the locked weekday is asserted still untouched.
3. **re-saving the same windows on a locked weekday succeeds** — the no-op autosave. The payload is the
   persisted set read back and sliced to `"HH:mm"` exactly as the page seeds the editor, with an explicit
   precondition asserting it really is seconds-less so the case cannot pass vacuously; the full row set is
   compared before and after.
4. **an EXCLUSIVE listing is unaffected** — the same shape of edit on a listing carrying a CONFIRMED upcoming
   booking on that very weekday succeeds and writes `09:00:00`. The scope guard: the refusal must not leak
   onto the path Phase 3 shipped.
5. **a finished pass does not lock** — a hand-inserted drop-in booking whose `ends_at` is already past leaves
   its weekday editable, while the weekday the LIVE pass sits on is asserted still frozen, so the case passes
   because the pass is finished and not because the guard stopped working.

## Mutation Executed

The refusal was disabled in `saveOperatingHours` (the `owned.occupancyMode === "open_capacity"` condition
forced false, leaving the session/ownership/validation contract and the replace-the-set transaction
untouched) — precisely the pre-09-19 behaviour of the file. Observed output, **VERBATIM**:

```
 ❯ tests/availability/hours-lock.test.ts (5 tests | 4 failed) 2625ms
     × 1 · a weekday carrying an upcoming drop-in pass cannot have its hours changed 80ms
     × 2 · an unlocked weekday is still freely editable 25ms
     × 3 · re-saving the same windows on a locked weekday succeeds 7ms
     × 5 · a finished pass does not lock 22ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/availability/hours-lock.test.ts > CR-03 layer 2 — an hours edit may not strand passes already sold > 1 · a weekday carrying an upcoming drop-in pass cannot have its hours changed
AssertionError: expected '07:00:00' to be '06:00:00' // Object.is equality

Expected: "06:00:00"
Received: "07:00:00"

 ❯ tests/availability/hours-lock.test.ts:322:32
    320|     //     write that stranded them, so THAT is what fails first.
    321|     const persisted = await hoursFor(LISTING, TARGET_DOW);
    322|     expect(persisted.openTime).toBe(BASE_OPEN_SS);
       |                                ^
    323|     expect(persisted.closeTime).toBe(BASE_CLOSE_SS);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  tests/availability/hours-lock.test.ts > … > 2 · an unlocked weekday is still freely editable
AssertionError: expected '07:00:00' to be '06:00:00' // Object.is equality

- Expected
+ Received

- "06:00:00"
+ "07:00:00"

 ❯ tests/availability/hours-lock.test.ts:348:60
    346|     // …and the locked weekday is still exactly where the sold pass le…
    347|     // that carry passes, not to the listing.
    348|     expect((await hoursFor(LISTING, TARGET_DOW)).openTime).toBe(BASE_O…
       |                                                            ^

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  tests/availability/hours-lock.test.ts > … > 3 · re-saving the same windows on a locked weekday succeeds
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ tests/availability/hours-lock.test.ts:358:97
    356|     const before = await readHours(LISTING);
    357|     const sameSet = await formSetOf(LISTING);
    358|     expect(sameSet.windows.some((w) => w.dayOfWeek === TARGET_DOW && w…
       |                                                                                                 ^
    359|       true,
    360|     ); // the payload really is seconds-less, so the case cannot pass …

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 FAIL  tests/availability/hours-lock.test.ts > … > 5 · a finished pass does not lock
AssertionError: expected '07:00:00' to be '06:00:00' // Object.is equality

Expected: "06:00:00"
Received: "07:00:00"

 ❯ tests/availability/hours-lock.test.ts:393:60
    391|     // …while the weekday the LIVE pass sits on is still frozen — proo…
    392|     // finished, not because the guard stopped working.
    393|     expect((await hoursFor(LISTING, TARGET_DOW)).openTime).toBe(BASE_O…
       |                                                            ^

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯


 Test Files  1 failed (1)
      Tests  4 failed | 1 passed (5)
```

`AssertionError: expected '07:00:00' to be '06:00:00'` — **the host's edit landed on a weekday whose passes
were already sold**, exactly the message the plan required. Restored → 5/5 green → `git diff --exit-code src/`
exit 0.

## Verification

| Gate | Result |
|------|--------|
| `grep -c "export async function getOpenHoursLockState" src/lib/listing/hours-lock.ts` | `1` ✅ |
| `grep -c "OPEN_OCCUPYING_STATUS_SQL" src/lib/listing/hours-lock.ts` | `2` ✅ (import + one interpolation) |
| `grep -c "EXTRACT(DOW FROM" src/lib/listing/hours-lock.ts` | `1` ✅ |
| `grep -c "ISODOW" src/lib/listing/hours-lock.ts` | `0` ✅ (see Deviation 1) |
| `grep -c "now()" src/lib/listing/hours-lock.ts` | `3` (≥ 1) ✅ |
| `grep -cE "Date\.now\|new Date\(\)" src/lib/listing/hours-lock.ts` | `0` ✅ |
| `grep -c "export const HOURS_LOCKED_MESSAGE" src/lib/validation/availability.ts` | `1` ✅ |
| `grep -c "getOpenHoursLockState(" src/app/actions/operating-hours.ts` | `1` ✅ |
| `grep -c "HOURS_LOCKED_MESSAGE" src/app/actions/operating-hours.ts` | `3` (≥ 1) ✅ |
| `grep -c 'occupancyMode === "open_capacity"' src/app/actions/operating-hours.ts` | `1` ✅ |
| security-contract diff-gate (`assertOwnership\|weeklyHoursSchema\|revalidatePath` in removed lines) | `0` ✅ (see Deviation 2) |
| `git diff --stat src/components/availability/weekly-hours-editor.tsx` | empty ✅ |
| `grep -c "getOpenHoursLockState" .../availability/page.tsx` | `2` ✅ (see Deviation 3) |
| `grep -c "destructive" .../availability/page.tsx` | `0` ✅ |
| `npx vitest run tests/availability/hours-lock.test.ts` | **5 passed** ✅ |
| test-file header contains the verbatim mutation output incl. `to be '06:00:00'` | ✅ |
| test file length | **432 lines** (≥ 110 `min_lines`) ✅ |
| `npx vitest run` (full suite) | **1048 passed / 4 skipped / 1 failed** — the single pre-existing baseline failure ✅ (see Deviation 4) |
| `npx tsc --noEmit` | `0` ✅ |
| `npm run lint` | 0 errors / 7 baseline warnings ✅ |
| `git diff --exit-code src/` after the mutation restored | `0` ✅ |
| files added under `drizzle/` | `0` ✅ — the next migration number is still **0023** |

## Deviations from Plan

### 1. [Known plan defect — satisfied without absorbing] The plan's action text and its own tripwire disagree about `ISODOW`

- **Found during:** Task 1.
- **Issue:** the action says to state the weekday convention "so nobody 'corrects' it to ISODOW", while the
  acceptance criterion asserts `grep -c "ISODOW" src/lib/listing/hours-lock.ts` prints `0`. Writing the
  sentence the action asks for would trip the gate the same plan sets — the `.continue-here.md`
  unsatisfiable-grep class.
- **Disposition:** the WARNING WAS KEPT, the TOKEN WAS NOT. The type doc states the `0=Sun..6=Sat` agreement
  across all three layers and says explicitly "do NOT 'correct' this to the ISO 1=Mon..7=Sun variant — that
  would shift every lock by one day and freeze the wrong rows in the editor". Both the plan's intent and its
  gate are satisfied; no code was reshaped.
- **Files:** `src/lib/listing/hours-lock.ts`.

### 2. [Rule 3 — blocking] The security-contract diff-gate is tripped by an import REFORMAT, not by a removal

- **Found during:** Task 2 acceptance.
- **Issue:** the gate counts removed lines matching `assertOwnership|weeklyHoursSchema|revalidatePath`. The
  natural way to import `HOURS_LOCKED_MESSAGE` — widening the existing
  `import { weeklyHoursSchema, type WeeklyHoursInput } from "@/lib/validation/availability"` — removes that
  line and scored **`1`**, even though nothing in the contract had changed.
- **Fix (honouring the gate, per the blocking constraint that this one IS load-bearing):** the shipped import
  line is left **byte-identical** and `HOURS_LOCKED_MESSAGE` arrives on a SECOND import statement from the
  same module, with a comment above it stating why the tidier single-import form was deliberately not used —
  so a future reader does not "clean it up" and silently re-trip the gate. Gate now scores **`0`**. Lint is
  unaffected (no `import/no-duplicates` rule is enabled).
- **Files:** `src/app/actions/operating-hours.ts`.

### 3. [Recorded] The page grep counts comment mentions too

- **Found during:** Task 2 acceptance.
- **Issue:** `grep -c "getOpenHoursLockState" page.tsx` must print `2` (the import and the call), but a
  docblock referring to the function by name made it `3`.
- **Fix:** the docblock now says "the lock state below" instead of naming the function. Nothing behavioural;
  recorded because it is the same "a grep is only a real guard if a comment cannot disarm it" idiom this
  codebase already applies in `when-label.ts` and `mode-lock-notice.tsx` — here applied in reverse.
- **Files:** `src/app/(host)/host/listings/[id]/availability/page.tsx`.

### 4. [Recorded — pre-existing, not caused by this plan] The full suite carries one known failure

- **Found during:** the full-suite gate.
- **Observed:** `tests/availability/date-pass-picker.test.tsx > (4) picking a new date resets the pass count
  to 1 and re-bounds it` — `Error: Test timed out in 5000ms`. This is **deferred-items.md item 3**, the
  known multi-suite timeout. It did not reproduce during 09-18's run; it did here.
- **Confirmed pre-existing:** the file passes **9/9 in isolation** (`npx vitest run
  tests/availability/date-pass-picker.test.tsx`), it is a React component test with no relationship to any
  file this plan touched, and the failure is a timeout rather than an assertion. Not chased, per the plan
  brief. Totals reconcile exactly: 09-18 finished at 1044 passed, this plan adds 5, and the run reports 1048
  passed + 1 failed = 1049.
- **Files:** none.

### 5. [Recorded] The observed mutation set is four cases, not the predicted one

- **Found during:** Task 2's mandatory mutation.
- **Plan's prediction:** case 1 goes RED at `expected '07:00:00' to be '06:00:00'`.
- **Observed:** case 1 went RED with exactly that message — and cases **2, 3 and 5** went with it. The
  cascade is structural, not a coverage smell: those three each re-assert that the LOCKED weekday is still
  where the sold pass left it, so once case 1's edit actually lands they are all measuring a listing whose
  rows have already moved (case 3 fails one step earlier still, at its "the payload really is seconds-less"
  precondition, because the set it reads back is no longer the seeded one). **Case 4 stayed GREEN**, correctly
  — it drives the EXCLUSIVE listing, which this guard never touches.
- **Disposition:** recorded verbatim in the test-file header and above, with the cascade explained. No
  assertion was weakened to make the observed set match the prediction.
- **Files:** `tests/availability/hours-lock.test.ts` (header), this SUMMARY.

### 6. [Recorded] The weekday-name list is duplicated rather than shared

- **Found during:** Task 2(b).
- **Issue:** the advisory must name the frozen weekdays, and the only existing list lives in
  `weekly-hours-editor.tsx` — a client component the acceptance gate forbids touching
  (`git diff --stat` on it must be empty).
- **Disposition:** a local `WEEKDAY_LABELS` const in the page, with a comment stating why the two lists are
  deliberately left unshared. Refactoring both into one export would have required editing the file the gate
  protects, and a lock fix is the wrong change to smuggle that into. Logged as a candidate tidy-up, not a
  defect — the two lists are the seven English weekday names in the fixed `0=Sun..6=Sat` order and cannot
  meaningfully drift.
- **Files:** `src/app/(host)/host/listings/[id]/availability/page.tsx`.

## Threat Model Outcomes

| Threat ID | Disposition | Outcome |
|-----------|-------------|---------|
| T-09-58 | mitigate | **Closed.** `saveOperatingHours` refuses a genuine change to any weekday `getOpenHoursLockState` reports as carrying an upcoming or active drop-in pass. Case 1 proves it by reading `operating_hours` back **first**, and is mutation-measured at `expected '07:00:00' to be '06:00:00'`. |
| T-09-59 | mitigate | **Closed.** A deletion is a change to that weekday's window set — the empty canonical set differs from the persisted one — and is refused by the same comparison. (Covered by construction rather than by a dedicated case; the comparison is set-vs-set, and case 3 proves the equality half of it is exact.) |
| T-09-60 | mitigate | **Closed.** Both sides are normalised to `HH:mm:ss` before comparison, and case 3 sends the seconds-less DB-origin set back — with an explicit precondition asserting it really is seconds-less — to prove a no-op autosave still succeeds. |
| T-09-61 | mitigate | **Holds, unchanged posture.** `assertOwnership` still runs before anything; the diff-gate proving it was not removed scores `0`. The new lock query is scoped by the same `listingId`, and the advisory renders inside the already owner-gated `(host)` page. |
| T-09-62 | mitigate | **Closed.** The advisory names weekdays, a count and a date — never a booker — and is rendered from the same `row` the owner-gated page already loaded. |
| T-09-SC | mitigate | **No package was installed by this plan.** The Package Legitimacy Gate was never triggered. |

## Known Stubs

None. No hardcoded empty value, placeholder string or unwired data source was introduced. The advisory
renders only when `getOpenHoursLockState` reports real rows; there is no mock or placeholder path through it.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary was
introduced — the change adds a read query and a refusal branch inside an existing authenticated, owner-gated
action, plus one server-rendered paragraph on a page that was already owner-gated.

## What This Does NOT Close

- **CR-06 / WR-01** — `findOwnOpenHold`'s `status = 'confirmed'` branch and its unscoped `idempotency_key`
  branch. Still **09-23's**, with the pointer comment 09-18 left in place.
- **NT-02** — the `cap ≤ 0` disagreement between the read model and the claim. **09-24's**.
- **CR-02, CR-04, CR-05** and the remaining warnings / info findings — plans 09-20 … 09-25.
- **An in-browser proof of the advisory.** The refusal is proven at the integration layer against real
  Postgres, through the real action; the advisory paragraph itself is server-computed from the same authority
  and has no test of its own. A Playwright pass over the host availability page would be the natural home for
  it, and none exists yet.
- **A live PayMongo re-proof.** Nothing in the money path changed — no charge, refund or payout code was
  touched — so no new `sk_test_` charge was warranted.

## Self-Check: PASSED

- `src/lib/listing/hours-lock.ts` — FOUND (created)
- `tests/availability/hours-lock.test.ts` — FOUND (created, 432 lines ≥ 110 `min_lines`)
- `src/lib/validation/availability.ts` — FOUND (modified)
- `src/app/actions/operating-hours.ts` — FOUND (modified)
- `src/app/(host)/host/listings/[id]/availability/page.tsx` — FOUND (modified)
- Commit `fbc9a5c` — FOUND
- Commit `9973a46` — FOUND
- `git diff --exit-code src/` — exit 0 (mutation restored, both commits landed)
