---
phase: 09-open-capacity-bookings
plan: 18
subsystem: availability
tags: [open-capacity, drop-in, cr-03, overbook, advisory-lock, operating-hours, mutation-testing, vitest]

# Dependency graph
requires:
  - phase: 09-open-capacity-bookings
    provides: "the drop-in counter this re-anchors — `openTakenSql` + `loadOpenDayWindow` (09-02), `createOpenCapacityHold`'s advisory lock / sweep / replay (09-02), the read-model open fork and `getOpenMonthAvailability` (09-04), `placeOpenHold` (09-07), the search open branch (09-05), and the SC#3 race gate this must not disturb (09-03)"
  - phase: 03-availability-calendar
    provides: "the exclusive read model's venue-local `dayStartUtc`/`dayEndUtc` construction this generalises, and the `'[)'` half-open rule"
provides:
  - "CR-03 layer 1 CLOSED: the admissions counter's identity is the VENUE-LOCAL CALENDAR DAY over the STORED `booking.starts_at`, not the venue's opening instant re-derived from mutable host config. An operating-hours edit can no longer empty the counted set, split the advisory lock into two disjoint domains for one date, or make a second full cap sellable."
  - "`venueDayBoundsUtc` — one shared pure helper returning `{ dayStartUtc, dayEndUtc, dateKey }`, the single source for both the counted range and the lock key."
  - "`openTakenSql(listingId, dayStartUtcIso, dayEndUtcIso)` — the half-open day range, still the ONE shared predicate across the claim, the day panel, the month grid and search."
  - "`getOpenMonthAvailability` grouped by venue-local date, so `taken >= cap` is evaluated ONCE per date (the `read-model.ts:441` half of CR-03)."
  - "tests/availability/open-capacity-hours-rekey.test.ts — a 5-case DB-backed gate driving the hours-edit → claim SEAM, mutation-measured at `expected 4 to be 3`."
  - "tests/availability/open-capacity-readmodel.test.ts case 11 — two `starts_at` values on one venue-local date sum into ONE month entry."
affects: [09-19, 09-23, 09-24, phase-verification, future-phases-touching-open-capacity-or-operating-hours]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Separate WHAT A RECORD COVERS from WHAT IT COUNTS AGAINST when the former is derived from mutable config: the covering window may legitimately move with a host edit, the counting key may not. Carry both on the same object so no call site can derive them from different inputs."
    - "A counter key must be built from STORED data (or from data the actor cannot edit). A key re-derived at request time from host-mutable config is an overbook path with no constraint violation to catch it."
    - "`GROUP BY <ordinal>` rather than restating the projected expression — two copies of a grouping expression can drift, and a grouping key that differs from the projected key is the same class of bug as two copies of an occupancy predicate."
    - "A test helper that measures a bug must not be written in the bug's own dialect: the head-sum helper reads the venue-local DAY RANGE, so under mutation it reports the real 4 instead of the bug's 3."
    - "A signature change is a deliberate compiler census: widening `openTakenSql` from 2 to 3 arguments forced `tsc` to enumerate every caller, production and test, instead of trusting grep."

key-files:
  created:
    - tests/availability/open-capacity-hours-rekey.test.ts
  modified:
    - src/lib/availability/open-capacity.ts
    - src/lib/availability/read-model.ts
    - src/lib/availability/units.ts
    - src/app/actions/booking.ts
    - tests/availability/open-capacity-readmodel.test.ts
    - tests/availability/open-capacity-race.test.ts
    - tests/booking/open-capacity-cancel.test.ts
    - tests/booking/open-capacity-confirm.test.ts

key-decisions:
  - "The counted set is a half-open `[venue-local midnight, next midnight)` range over the STORED `booking.starts_at` — no schema change, no migration, no generated column. `starts_at` on an open row is the opening instant ON the picked date, so its venue-local date IS that date by construction and venue-local days partition the open rows into disjoint sets."
  - "`dateKey` is composed from the NUMERIC year/month/day arguments with zero-padding, never by formatting a Date — a formatted instant can be shifted a day by a timezone conversion, and a lock key that disagreed with the range it protects would serialise two claimers into different domains, reintroducing the very failure."
  - "`day_open_ok` / `horizon_ok` in the claim deliberately KEEP using the closing and opening instants. They are about what a pass COVERS; a venue-local day starting at midnight is not the same fact as a pass window being open."
  - "`GROUP BY 1` in the month query rather than restating the timezone conversion, so the grouping key and the projected key cannot drift; the date is cast to text IN SQL so the driver cannot return a Date-or-string ambiguity."
  - "`findOwnOpenHold`'s day match was re-scoped to the same range (a booker's own live hold sits on the OLD instant after an edit, and an equality would miss it — turning a replay into a second claim), but its `status = 'confirmed'` branch (CR-06) and unscoped `idempotency_key` branch (WR-01) were left untouched with a pointer comment naming 09-23."
  - "The four test call sites the compiler census surfaced each derive the day bounds INDEPENDENTLY (plain +08 arithmetic) rather than importing `venueDayBoundsUtc` — an assertion must not inherit a bug from the code it measures."
  - "The new gate drives the hours edit through the DB rather than through `saveOperatingHours` (which is session- and owner-gated), reproducing its replace-the-set semantics for one weekday; the action's own refusal is 09-19's and is cross-referenced in the file header."
  - "Each claim in the gate RE-DERIVES the day window via `loadOpenDayWindow` exactly as `placeOpenHold` step (7) does. A test that hoisted the window into a constant would never cross the seam the file exists for."

patterns-established:
  - "Pattern: when a finding has two independent halves in different code paths, mutate them SEPARATELY. Mutation A (the counter anchor) could not reach the month grid's own aggregate, and reporting only A would have left case 2 unmeasured; mutation B proved it."
  - "Pattern: record the OBSERVED mutation set, never the predicted one. The plan predicted cases 1 and 2 RED under one mutation; the observed set was 1, 3 and 5 — and case 2 needed its own mutation."

requirements-completed: [OPEN-03, OPEN-04]

# Metrics
duration: 28min
completed: 2026-07-31
---

# Phase 9 Plan 18: Hours-Edit Overbook (CR-03 Layer 1) Summary

**The drop-in admissions counter is now anchored on the venue-local calendar day over the stored `booking.starts_at` — with the advisory lock keyed on `listing_id || ':' || YYYY-MM-DD` — so a host editing operating hours changes what a pass COVERS and never which passes COUNT, closing an overbook path that sold up to 2× cap with no constraint violation, no error, and nothing in the month grid showing the date as full.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-07-31T08:46Z (16:46 Makati)
- **Completed:** 2026-07-31T09:14Z (17:14 Makati)
- **Tasks:** 3/3
- **Files modified:** 9 (1 created, 8 modified)
- **Commits:** `6c62776`, `3647d38`, `68851d7`

## Accomplishments

### Task 1 — the venue-local day anchor and the month grouping (`6c62776`)

`src/lib/availability/open-capacity.ts`:

- **`venueDayBoundsUtc({ year, month, day, timezone })` → `{ dayStartUtc, dayEndUtc, dateKey }`** — both
  instants built with `TZDate` at the venue wall clock and normalised through the epoch (never by adding
  fixed milliseconds — the `slots.ts` DST rule), `dateKey` composed from the numeric arguments with
  zero-padding. Its docblock states WHY this is the counter's identity: `starts_at` on an open row is the
  opening instant *on the picked date*, so its venue-local date is that date by construction; venue-local
  days therefore partition open rows into disjoint sets and an hours edit moves a pass **within** its own day
  rather than **out of** the counted set. CR-03 is named, and the old form is described in words (no
  `b.starts_at = ` character sequence anywhere in the file).
- **`openTakenSql(listingId, dayStartUtcIso, dayEndUtcIso)`** — the equality on `b.starts_at` became the
  half-open range. `b.open_capacity = true` and the shared `OPEN_OCCUPYING_STATUS_SQL` are byte-identical.
  The ⚠️ DO NOT COPY note now names the range as well as the predicate.
- **`OpenDayWindow` carries both facts explicitly**, with the distinction stated in the type doc:
  `dayOpenUtc`/`dayCloseUtc`/`openTime`/`closeTime` are what a pass COVERS (persisted, host-mutable);
  `dayStartUtc`/`dayEndUtc`/`dateKey` are what it COUNTS AGAINST (never persisted, calendar-fixed).
  `loadOpenDayWindow` populates them from the SAME `dayLocal` + `timezone` it already has.
- The module header now states four owned facts instead of three, and says why (2) and (3) are different.

`src/lib/availability/read-model.ts`:

- `getOpenDay` calls the three-argument form. Nothing else moved — `bookable` still uses `dayCloseUtc` and
  the injectable `now` (the Pitfall-7 clock split stands), and the NULL-cap fail-closed is untouched (NT-02's
  `cap ≤ 0` disagreement is 09-24's).
- `getOpenMonthAvailability` selects
  `to_char((b.starts_at AT TIME ZONE $tz::text)::date, 'YYYY-MM-DD') AS day_local` and groups by `1`. The
  widened `fromIso`/`toIso` bounds and the `monthPrefix` filter are unchanged. The now-redundant JS
  `format(new Date(r.day_open), …, { in: venueTz(timezone) })` step is gone, and with it the `date-fns`
  `format` import and the `tz as venueTz` alias.

`tests/availability/open-capacity-readmodel.test.ts` case 11 (new) proves two DIFFERENT `starts_at` values on
one venue-local date sum into ONE entry: 4 heads at the venue-local 06:00 and 6 at 07:00 on a cap of 10, with
the two-distinct-instants precondition asserted so the case cannot pass vacuously. Its own listing
(`l_oc_rm_rekey`), because case 9 asserts `L_MONTH`'s `fullDates` exactly.

### Task 2 — the re-keyed claim (`3647d38`)

`src/lib/availability/units.ts`:

- `CreateOpenCapacityHoldInput` gained `dayStartUtc` / `dayEndUtc` / `dateKey`, documented as the counter's
  identity that reaches no column, alongside the persisted `dayOpenUtc` / `dayCloseUtc`.
- **The advisory lock is keyed on `listing_id || ':' || dateKey`** and remains the **literal first statement**
  in the transaction — the transaction callback opens at `units.ts:776` and the first `await tx.` inside it is
  the `pg_advisory_xact_lock` at **`units.ts:799`** (lines 777-798 are the comment block). The comment now
  records that keying on the re-derived opening instant was CR-03, and that only the venue's own calendar may
  change what contends.
- The lazy-expiry sweep is re-scoped to the same half-open range, with the reason stated: a hold minted under
  the OLD hours must be swept by a claim made under the NEW ones, or — since nothing else writes at expiry
  (D-48a) — its heads stay claimed forever.
- `findOwnOpenHold` takes the range pair instead of `openIso`. Its two other defects are explicitly left with
  a pointer comment naming **09-23**.
- The shared `openTakenSql` call uses the three-argument form; `day_open_ok` and `horizon_ok` are unchanged
  and the comment says why they must not be re-pointed at the day bounds.

`src/app/actions/booking.ts`: `placeOpenHold`'s single call site passes the three new fields from the
`OpenDayWindow` step (7) already loaded. 09-17's `confirmBooking` fork is byte-intact
(`openCapacity: booking.openCapacity` still appears twice).

**The compiler census worked as designed.** Widening the signature turned up four call sites `tsc` had to be
asked about — `open-capacity-race.test.ts`, `open-capacity-readmodel.test.ts`, `open-capacity-cancel.test.ts`
and `open-capacity-confirm.test.ts` — each reconciled with a local `dayBounds` helper deriving the day from
plain +08 arithmetic rather than importing `venueDayBoundsUtc`.

### Task 3 — the DB-backed hours-edit gate (`68851d7`)

`tests/availability/open-capacity-hours-rekey.test.ts` (new, 447 lines ≥ 140 `min_lines`), against real
Postgres. Every fixture date is clock-relative (`daysOut(7)` / `(8)` / `(9)`); the file contains **zero**
calendar literals. Each claim goes through `loadOpenDayWindow` → `createOpenCapacityHold`, mirroring
`placeOpenHold` steps (7) and (8), which is what makes the hours edit actually reach the counter.

1. **an hours edit cannot make sold admissions stop counting** — three different bookers claim one head each
   under 06:00 hours (cap 3, saturated), the weekday's opening is shifted to 07:00 via delete-then-insert
   mirroring `saveOperatingHours`, and a fourth claim is attempted. Assertion order is load-bearing: the
   **summed `declared_pax` over the venue-local day** first, then `SOLD_OUT_MESSAGE` + `soldOut: true`, then
   `remaining === 0` / `state === "full"` in the day panel. The edit is asserted to have landed
   (`dayOpenUtc` is the new 07:00 instant), so nothing below can hold vacuously.
2. **the month grid shows the date full after an hours edit** — plus the neighbouring dates absent, so it is
   not a blanket "everything is full".
3. **an hours edit changes what a pass COVERS, never which passes COUNT** — the three sold rows'
   `starts_at`/`ends_at` are byte-unchanged (compared against constants, not a re-read); cancelling one
   leaves `remaining === 1`; the re-sale lands on the NEW 07:00 instant while the two surviving 06:00 rows
   still count, and the date holds two distinct instants at once.
4. **a different date is unaffected** — the following venue-local day still sells its FULL cap, and a third
   date is wholly free. This is the over-reach guard: the anchor was narrowed to one day, not widened.
5. **search agrees with the day panel after an hours edit** — the Stage-2 path drops the listing on the
   saturated date while an untouched control listing survives the same query, and the same listing is still
   findable on a free date.

The head-sum helper reads the venue-local **day range** and is deliberately re-typed rather than importing
`openTakenSql` — a helper keyed on the opening instant would reproduce the bug it measures and report 3 while
the table held 4.

## Mutations Executed

### MUTATION A — the counter's anchor (the headline gate)

Reverted in all three files that carry it: `openTakenSql` back to an equality on `starts_at`; `getOpenDay`
passing the opening instant; and in `units.ts` the advisory lock keyed on the opening instant, the sweep
scoped to it, and the heads SUM called with it. Observed output, **VERBATIM**:

```
 ❯ tests/availability/open-capacity-hours-rekey.test.ts (5 tests | 3 failed) 1140ms
     × 1 · an hours edit cannot make sold admissions stop counting 170ms
     × 3 · an hours edit changes what a pass COVERS, never which passes COUNT 17ms
     × 5 · search agrees with the day panel after an hours edit 53ms

 FAIL  tests/availability/open-capacity-hours-rekey.test.ts > CR-03 — an operating-hours edit may never change which drop-in passes count > 1 · an hours edit cannot make sold admissions stop counting
AssertionError: expected 4 to be 3 // Object.is equality

- Expected
+ Received

- 3
+ 4

 ❯ tests/availability/open-capacity-hours-rekey.test.ts:342:19
    340|     //     names the overbook itself and not a proxy for it.
    341|     const heads = await headsOnDay(TARGET);
    342|     expect(heads).toBe(CAP);
       |                   ^

 FAIL  … > 3 · an hours edit changes what a pass COVERS, never which passes COUNT
AssertionError: expected 3 to be 2 // Object.is equality

- Expected
+ Received

- 2
+ 3

 ❯ tests/availability/open-capacity-hours-rekey.test.ts:380:38
    378|     await testDb.db.execute(sql`UPDATE booking SET status = 'cancelled…
    379|                                 WHERE id = ${claimIds[0]}`);
    380|     expect(await headsOnDay(TARGET)).toBe(CAP - 1);
       |                                      ^

 FAIL  … > 5 · search agrees with the day panel after an hours edit
AssertionError: expected [ 'l_oc_rekey', 'l_oc_rekey_control' ] to not include 'l_oc_rekey'
 ❯ tests/availability/open-capacity-hours-rekey.test.ts:427:27

 Test Files  1 failed (1)
      Tests  3 failed | 2 passed (5)
```

`AssertionError: expected 4 to be 3` — **four paid admissions on a three-person day**, exactly the message
the plan required. Restored → 5/5 green → `git diff --exit-code src/` exit 0, `git status --short -- src/`
empty.

### MUTATION B — the month grid's own aggregate (`read-model.ts:441`)

Run **separately** because mutation A provably cannot reach it: the month query carries its own aggregate, so
reverting only its grouping back to the stored instant leaves the claim and the day panel correct while the
CALENDAR still advertises the saturated date. `to_char((b.starts_at AT TIME ZONE $tz)::date, …) … GROUP BY 1`
→ `to_char(b.starts_at, …) … GROUP BY b.starts_at`. Observed, **VERBATIM**:

```
 ❯ tests/availability/open-capacity-hours-rekey.test.ts (5 tests | 1 failed) 924ms
     × 2 · the month grid shows the date full after an hours edit 12ms

 FAIL  … > 2 · the month grid shows the date full after an hours edit
AssertionError: expected [ '2026-08-06' ] to include '2026-08-07'
 ❯ tests/availability/open-capacity-hours-rekey.test.ts:362:29

 ❯ tests/availability/open-capacity-readmodel.test.ts (11 tests | 2 failed) 915ms
     × 9. getOpenMonthAvailability returns exactly the QUERIED month's fully-booked dates 37ms
     × 11. sums two DIFFERENT starts_at values on ONE venue-local date into a single entry (CR-03) 16ms

 FAIL  … > 9. getOpenMonthAvailability returns exactly the QUERIED month's fully-booked dates
AssertionError: expected [ '2026-08-09' ] to deeply equal [ '2026-08-01', '2026-08-10' ]

- Expected
+ Received

  [
-   "2026-08-01",
-   "2026-08-10",
+   "2026-08-09",
  ]

 FAIL  … > 11. sums two DIFFERENT starts_at values on ONE venue-local date into a single entry (CR-03)
AssertionError: expected [] to deeply equal [ '2026-08-10' ]

- Expected
+ Received

- [
-   "2026-08-10",
- ]
+ []
```

Case 11 is the clean statement of the finding: with the stored-instant grouping the fully-booked date
produces `[]` — two groups of 4 and 6 on a cap of 10, neither reaching it. Restored → green →
`git diff --exit-code src/` exit 0.

The mutation-output blocks live **here** rather than in the test-file header because these messages quote
calendar dates and that file's acceptance tripwire forbids a calendar literal anywhere in it (the 09-03
clock-relative rule). The header records mutation A verbatim (which contains no calendar literal) and points
to this SUMMARY for B.

## Verification

| Gate | Result |
|------|--------|
| `grep -c "export function venueDayBoundsUtc" src/lib/availability/open-capacity.ts` | `1` ✅ |
| `grep -c "b.starts_at >= " src/lib/availability/open-capacity.ts` | `1` ✅ |
| `grep -c "b.starts_at < " src/lib/availability/open-capacity.ts` | `1` ✅ |
| `grep -v '^\s*//' … \| grep -v '^\s*\*' \| grep -c "b.starts_at = "` (open-capacity.ts) | `0` ✅ |
| `grep -c "dayStartUtc" src/lib/availability/open-capacity.ts` | `10` (≥ 3) ✅ |
| `grep -c "GROUP BY b.starts_at" src/lib/availability/read-model.ts` | `0` ✅ |
| `grep -c "AT TIME ZONE" src/lib/availability/read-model.ts` | `1` ✅ |
| `grep -c "openTakenSql(" src/lib/availability/read-model.ts` | `1` ✅ |
| `grep -c 'dateKey}::text' src/lib/availability/units.ts` | `1` ✅ |
| `grep -c 'openIso}::text' src/lib/availability/units.ts` | `0` ✅ |
| `grep -c "pg_advisory_xact_lock" src/lib/availability/units.ts` | `1` ✅, and it is the first `tx.execute` in the tx — callback opens `units.ts:776`, lock at **`units.ts:799`** |
| `starts_at = ` in the OPEN path (units.ts 655-930, comments filtered) | `0` ✅ — whole-file count is `1`, see Deviation 1 |
| `grep -c "dayStartUtc" src/app/actions/booking.ts` | `1` ✅ |
| `grep -c "openCapacity: booking.openCapacity" src/app/actions/booking.ts` | `2` ✅ (09-17 intact) |
| `npx vitest run tests/availability/open-capacity-hours-rekey.test.ts` | **5 passed** ✅ |
| test-file header contains the verbatim mutation output incl. `expected 4 to be 3` | ✅ |
| `grep -c "dayStartUtc\|day_start\|venueDayBoundsUtc" tests/…/open-capacity-hours-rekey.test.ts` | `9` (≥ 1) ✅ |
| `grep -c "2026-" tests/…/open-capacity-hours-rekey.test.ts` | `0` ✅ |
| `npx vitest run tests/availability/open-capacity-race.test.ts` (SC#3) | **6 passed** ✅ |
| `npx vitest run tests/availability tests/booking tests/search` | **468 passed / 0 failed** ✅ |
| `npx vitest run tests/booking tests/payments tests/availability` | **577 passed / 0 failed** ✅ (see Deviation 2) |
| `npx vitest run` (full suite) | **1044 passed \| 4 skipped, 0 failed** ✅ (was 1035 + 4 skipped at phase start) |
| `npx tsc --noEmit` | `0` ✅ |
| `npm run lint` | 0 errors / 7 baseline warnings ✅ |
| `git diff --exit-code src/` after BOTH mutations restored | `0` ✅ · `git status --short -- src/` empty ✅ |
| files added under `drizzle/` | `0` ✅ — the next migration number is still **0023** |

## Deviations from Plan

### 1. [Known plan defect — verified in load-bearing form, not absorbed] The `starts_at = ` tripwire is unsatisfiable at file scope

- **Found during:** Task 2 acceptance.
- **Criterion** (`09-18-PLAN.md:259`): `grep -v '^\s*//' src/lib/availability/units.ts | grep -v '^\s*\*' | grep -c "starts_at = "` prints `0`.
- **Observed:** `1`. The surviving occurrence is **`units.ts:266`**, inside `findOwnActiveHold` — the
  **EXCLUSIVE** path's own-hold predicate (`starts_at = ${args.startIso} AND ends_at = ${args.endIso}`).
- **Why it must stay:** an exclusive booking is matched on its OWN stored range, which is precisely what
  makes the exclusive path immune to CR-03 in the first place. Reshaping it to satisfy the grep would have
  damaged correct, out-of-scope code — the 19-occurrence anti-pattern the phase's `.continue-here.md` warns
  against absorbing.
- **Load-bearing form verified instead:** zero `starts_at = ` equalities in the OPEN path —
  `sed -n '655,930p' src/lib/availability/units.ts | grep -v '^\s*//' | grep -v '^\s*\*' | grep -c "starts_at = "` prints **`0`**.
- **Files:** none changed for this; recorded here.

### 2. [Recorded] Task 1's `tsc` gate is necessarily satisfied by Task 2's commit

- **Found during:** Task 1's verify step.
- **Issue:** the plan's own Task-1 criterion asks `tsc` to prove the signature change "was reconciled at BOTH
  call sites, not just this file's" — but the second call site lives in `units.ts`, which Task 2 owns. Commit
  `6c62776` (Task 1's files) therefore does not typecheck in isolation; `HEAD` after `3647d38` does.
- **Disposition:** the plan's literal task/file split was kept rather than reshuffling files between commits
  (git cannot stage a partial file change non-interactively, and moving `units.ts` into Task 1 would have
  emptied Task 2). Both `tsc --noEmit` runs reported in the table above were executed on the reconciled tree.
  A signature migration split across two commits has one intermediate state by construction; `dev`'s tip is
  green at every gate.

### 3. [Recorded, not reshaped] The observed mutation set differs from the plan's prediction, and needed a second mutation

- **Found during:** Task 3's mandatory mutation.
- **Plan's prediction** (`09-18-PLAN.md:326-334`): reverting the anchor makes **case 1** go RED at
  `expected 4 to be 3`.
- **Observed:** case 1 went RED with exactly that message — and cases **3 and 5** went with it, while
  **case 2 stayed GREEN**. Case 2 lives on the month query's OWN aggregate, which the anchor revert does not
  touch, so a single mutation could never have measured it.
- **Disposition:** recorded, and a **second mutation** was run against the month grouping specifically
  (MUTATION B above), turning case 2 RED along with `open-capacity-readmodel.test.ts` cases 9 and 11. The
  finding has two independent halves in two code paths; measuring only one would have left the other's case
  unproven. This is strictly more coverage than the plan asked for.
- **Files:** `tests/availability/open-capacity-hours-rekey.test.ts` (header), this SUMMARY.

### 4. [Rule 3 — blocking] Four test call sites reconciled by the compiler census

- **Found during:** Task 2, `npx tsc --noEmit`.
- **Issue:** widening `CreateOpenCapacityHoldInput` broke `open-capacity-race.test.ts`,
  `open-capacity-readmodel.test.ts`, `open-capacity-cancel.test.ts` and `open-capacity-confirm.test.ts`.
  This is the census working, not a defect.
- **Fix:** each file gained a local `dayBounds(...)` helper deriving the venue-local day by plain +08
  arithmetic — an independent second opinion on `venueDayBoundsUtc` rather than a re-run of it. No existing
  assertion was changed; the race file's own `committedHeads` helper and inlined Layer-1 claim still key on
  the single fixture instant, which is correct there (every row in that file shares it) and keeps
  MUTATION 1/2 of the SC#3 gate measuring what they measured before. `open-capacity-race.test.ts` is 6/6.
- **Files:** the four test files above.

### 5. [Determinism] The gate's control date, and hours on every weekday

- **Found during:** Task 3, writing cases 4 and 5.
- **Issue:** the plan's case 4 claims the **full cap** on the following date, which would leave that date
  saturated too — so it could not also serve as case 5's "still findable" control.
- **Fix:** a third clock-relative date (`daysOut(9)`) is the search control, and operating hours are seeded
  for all seven weekdays so the target, the following date and the control are all genuinely open. The hours
  edit is scoped to the target's weekday only, so cases 4 and 5 observe an unedited venue.
- **Files:** `tests/availability/open-capacity-hours-rekey.test.ts`.

## Threat Model Outcomes

| Threat ID | Disposition | Outcome |
|-----------|-------------|---------|
| T-09-54 | mitigate | **Closed.** The lock key and the counted set both moved to the venue-local calendar date over the STORED `booking.starts_at`. Case 1 asserts the committed head SUM first and is mutation-measured at `expected 4 to be 3`. |
| T-09-55 | mitigate | **Closed.** The month query groups by venue-local date so `taken >= cap` is evaluated once per date; cases 2 and 5 assert the grid and search agree with the day panel, and MUTATION B proves case 2 is load-bearing. |
| T-09-56 | mitigate | **Closed.** The lazy-expiry sweep is re-scoped to the same day range as the counted set, so a hold minted under the old hours is swept by a claim made under the new ones. `findOwnOpenHold` was re-scoped with it, so a replay under new hours still finds the booker's own row. |
| T-09-57 | accept (guarded) | **Holds.** The lock is still the first statement in the transaction (`units.ts:799`), and a `hashtextextended` collision can only OVER-serialise. Case 4 asserts two dates still proceed independently, and `open-capacity-race.test.ts` is 6/6 — the re-key did not weaken the SC#3 gate. |
| T-09-SC | mitigate | **No package was installed by this plan.** The Package Legitimacy Gate was never triggered. |

## Known Stubs

None. No hardcoded empty value, placeholder string or unwired data source was introduced.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary was
introduced — the change is confined to the predicate and lock key of an existing authenticated claim, plus
two read-model queries.

## What This Does NOT Close

- **CR-03 layer 2** — refusing the hours edit itself while live passes exist, with a "you can change these
  after {date}" notice in `saveOperatingHours`. That is **09-19**. This plan deliberately proves the counter
  survives an edit that DOES land, which is what makes layer 1 stand alone.
- **CR-06 / WR-01** — `findOwnOpenHold`'s `status = 'confirmed'` branch and its unscoped `idempotency_key`
  branch. Left untouched with a pointer comment naming **09-23**.
- **NT-02** — the `cap ≤ 0` disagreement between the read model and the claim. **09-24's**; `getOpenDay`'s
  NULL-cap fail-closed was not touched here.
- **CR-02, CR-04, CR-05** and the remaining warnings / info findings — plans 09-20 … 09-25.
- **A live PayMongo re-proof.** The fix is proven at the integration layer against real Postgres. Nothing in
  the money path changed, so no new `sk_test_` charge was warranted.

## Self-Check: PASSED

- `src/lib/availability/open-capacity.ts` — FOUND (modified)
- `src/lib/availability/read-model.ts` — FOUND (modified)
- `src/lib/availability/units.ts` — FOUND (modified)
- `src/app/actions/booking.ts` — FOUND (modified)
- `tests/availability/open-capacity-hours-rekey.test.ts` — FOUND (created, 447 lines ≥ 140 `min_lines`)
- `tests/availability/open-capacity-readmodel.test.ts` — FOUND (modified, case 11 added)
- `tests/availability/open-capacity-race.test.ts` — FOUND (modified)
- `tests/booking/open-capacity-cancel.test.ts` — FOUND (modified)
- `tests/booking/open-capacity-confirm.test.ts` — FOUND (modified)
- Commit `6c62776` — FOUND
- Commit `3647d38` — FOUND
- Commit `68851d7` — FOUND
- `git status --short -- src/` — empty (both mutations restored)
