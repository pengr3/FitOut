---
phase: 13-confirmation-bookings-trust
plan: 01
subsystem: testing
tags: [design-system, measurements, accessibility, landmarks, playwright, e2e, fixtures, postgres]

# Dependency graph
requires:
  - phase: 12-booker-path-search-listing-checkout
    provides: "src/lib/design/measurements.ts (sixteen constants + the declare-before-consume discipline), e2e/helpers/booker-seed.ts (seedBookableListing / signUpBooker / SeededListing / the ordered teardown), e2e/shell.spec.ts's `one main landmark on the booking routes` describe and its streaming-buffer matcher rule"
provides:
  - "BOOKING_SHELL — the booking segment's page container, declared once and imported by all fourteen former call sites"
  - "CONFIRMATION_MOMENT_MIN_H — the viewport-minus-header floor, declared beside HEADER_HEIGHT with its svh/vh/dvh derivation, consumed by nobody yet (plan 13-08 owns the call site)"
  - "Zero `<main>` elements under src/components/booking/ — the three nested landmarks D-88.1 forbids are gone from the pending, reversed and lapsed-approval branches"
  - "e2e/helpers/seed-payment-states.ts — the first fixture in the repo that can seed a booking in any state other than `confirmed`"
  - "The landmark assertion extended from three routes to six, covering the three branches the 20 Aug fix missed"
affects: [13-02, 13-03, 13-04, 13-05, 13-06, 13-07, 13-08, 13-09, 13-10, 13-11, 13-12, 13-13, 13-14, 13-15, 13-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A page CONTAINER promoted to a declared constant — the measurements.ts discipline applied one level up from skeleton boxes"
    - "A derived constant lives beside its SOURCE, not beside its phase-mates (CONFIRMATION_MOMENT_MIN_H sits with HEADER_HEIGHT, not in the Phase 13 block)"
    - "A fixture module that seeds the SET of states rather than the one a caller asked for, through ONE inherited INSERT column list"
    - "A collision-avoidance `hoursOffset` on a fixture whose rows occupy slots under a GiST EXCLUDE"

key-files:
  created:
    - "e2e/helpers/seed-payment-states.ts"
  modified:
    - "src/lib/design/measurements.ts"
    - "src/app/(app)/bookings/[id]/page.tsx"
    - "src/app/(app)/bookings/[id]/loading.tsx"
    - "src/app/(app)/bookings/[id]/cancel/page.tsx"
    - "src/app/(app)/bookings/[id]/cancel/loading.tsx"
    - "src/app/(app)/bookings/[id]/group/page.tsx"
    - "src/app/(app)/bookings/[id]/group/loading.tsx"
    - "src/components/booking/pending-payment-state.tsx"
    - "src/components/booking/payment-reversed-state.tsx"
    - "src/components/booking/expired-approval-state.tsx"
    - "e2e/shell.spec.ts"

key-decisions:
  - "The count was FOURTEEN hand-typed copies, not the UI-SPEC's eleven — located by grep rather than worked from the planning document's figure, and the constant's docblock records the measured number"
  - "page.tsx's instruction 'A SIXTH branch must copy the container from loading.tsx' was DELETED, not left beside the constant: an instruction that is now false is worse than no instruction"
  - "The three landmark comments say `main` without angle brackets, because the plan's own acceptance grep (`grep -c '<main'` returns 0) counts prose as an element — the precedent comment in loading.tsx would fail its own criterion"
  - "seedPaymentStates seeds all five shapes on every call, and gained an `hoursOffset` option instead: three of the five OCCUPY the slot under booking_no_overlap, so a caller with its own confirmed row at +10h collides 23P01 unless the whole block moves"
  - "The reversed and lapsed-approval fixtures differ by ONE column (booking_mode) and that is recorded in the helper header, because it is what separates 'your payment was reversed' from 'this approval expired'"
  - "The landmark test's budget rose 120s → 240s: the route table doubled and every row is walked at both widths, so a timeout would have read as a landmark failure"

patterns-established:
  - "A watched red's POSITION is evidence too: a red at route 5 of 6 at the first width proves routes 1-4 were visited and green in the same run, which no green run can show"
  - "Fixture teardown owns the FK-ordered DELETEs itself (booking_group before booking) even when the fixture creates no groups, because its rows outlive the caller that hung one off them"

requirements-completed: []  # NEITHER is delivered by this plan — see "Requirements: deliberately NOT
# marked complete" below. STATE-05 is also carried by 13-02/03/04/07/15/16 and BFLOW-08 by 13-11/16;
# the plan frontmatter lists them because 13-01 lays their shared ground, not because it closes them.

# Metrics
duration: 115min
completed: 2026-08-20
---

# Phase 13 Plan 01: Shared Ground + the Nested-Landmark Fix Summary

**Fourteen hand-typed container strings collapsed into one declared constant, the three nested `main` landmarks the 20 Aug fix missed converted to `div` and proved by a watched red, and the repo's first fixture that can seed a booking in any state other than `confirmed`.**

## Performance

- **Duration:** ~1h 55m
- **Started:** 2026-08-20T03:05Z (11:05 +0800)
- **Completed:** 2026-08-20T05:00Z (13:00 +0800)
- **Tasks:** 3 / 3
- **Files modified:** 11 modified, 1 created

## Accomplishments

- **`BOOKING_SHELL` and `CONFIRMATION_MOMENT_MIN_H` declared**, each with the derivation-in-the-header discipline `measurements.ts` already carries. `CONFIRMATION_MOMENT_MIN_H` is deliberately unconsumed — it is declared now so its `svh`-not-`vh`-not-`dvh` argument lives beside `HEADER_HEIGHT`, the constant its `3.5rem`/`4rem` terms come from, and plan 13-08 inherits a value rather than a decision.
- **The container duplication ended mechanically.** Fourteen call sites became one import. The rendered class string is byte-identical at every site, so this task changed zero pixels — the property that made it safe to run before any Phase 13 rewrite.
- **The live nested-landmark defect is closed.** `pending-payment-state.tsx`, `payment-reversed-state.tsx` and `expired-approval-state.tsx` each opened a `<main>` inside `(app)/layout.tsx`'s. All three are `/bookings/[id]` renders, so the defect survived on the exact route `shell.spec.ts` already covered — invisible because no e2e seed could produce a booking that reaches them.
- **`e2e/helpers/seed-payment-states.ts` exists**, seeding `confirmed`, `pending`+live hold, `pending`+expired hold, `cancelled`-reversed and `cancelled`-lapsed-approval from one INSERT column list, with an FK-ordered teardown. 13-VALIDATION § Wave 0 named this the single highest-leverage item of the phase; every later payment-state plan now has a database it can put into the state it needs.
- **The landmark assertion covers six routes instead of three**, and the fix was watched failing and passing rather than asserted.

## Task Commits

1. **Task 1: Declare the two constants and collapse every hand-typed copy** — `8d346d2` (refactor)
2. **Task 2: Convert the three nested `main` landmarks to `div` (D-88.1)** — `6256952` (fix)
3. **Task 3: Build the payment-state seed helper and prove the landmark fix** — `c90de96` (test)

## Files Created/Modified

- `src/lib/design/measurements.ts` — **+2 constants.** `CONFIRMATION_MOMENT_MIN_H` immediately after `HEADER_HEIGHT`; `BOOKING_SHELL` under a new Phase 13 banner that states, in the file, why the phase's two constants are not adjacent.
- `src/app/(app)/bookings/[id]/page.tsx` — five branch containers now `{BOOKING_SHELL}`; the ONE-`main`-per-document header's closing instruction replaced by the mechanism that supersedes it.
- `src/app/(app)/bookings/[id]/{loading,cancel/page,cancel/loading,group/page,group/loading}.tsx` — seven further containers converted; each `loading.tsx`'s "copied verbatim from the page" comment corrected, since it is now shared rather than copied.
- `src/components/booking/{pending-payment-state,payment-reversed-state,expired-approval-state}.tsx` — `<main>` → `<div className={BOOKING_SHELL}>`, each carrying the D-88.1 reason in the shape `bookings/[id]/loading.tsx:14-15` established.
- `e2e/helpers/seed-payment-states.ts` — **new.** The five shapes, the inherited-and-extended 21-column INSERT, `hoursOffset`, and the ordered teardown.
- `e2e/shell.spec.ts` — the landmark describe extended (not forked) with three routes, the fixture wired into `beforeAll`/`afterAll` ordering, the timeout raised, and the watched red recorded in the header.

## Verification

Every acceptance criterion was run and its output observed.

**Task 1**

| Criterion | Result |
|---|---|
| `grep -c 'export const BOOKING_SHELL' src/lib/design/measurements.ts` | `1` |
| `grep -c 'export const CONFIRMATION_MOMENT_MIN_H' …` | `1` |
| `grep -rn 'max-w-2xl px-4 py-8' src/` minus `measurements.ts` | exactly the three Task-2 component files, and nothing else |
| `npx tsc --noEmit` | exit 0 |
| `npx vitest run --config vitest.design.config.ts` | 41 files, 749 passed / 3 skipped — identical to the pre-change baseline, no changed pins |
| `npm run build` | exit 0 |

**Task 2**

| Criterion | Result |
|---|---|
| `grep -c '<main'` on the three components | `0`, `0`, `0` |
| `grep -rn 'BOOKING_SHELL' src/components/booking/` | all three files, import + call site |
| poller mechanics untouched | `git diff` on `pending-payment-state.tsx` contains **no** `+`/`-` line matching `setInterval`, `MAX_ATTEMPTS` or `routerRef`; the diff is 9 insertions / 3 deletions confined to the import, the comment, the container line and its closing tag |
| `npx tsc --noEmit` / `npm run build` | exit 0 / exit 0 |
| `npx vitest run tests/booking/hold-expired-state.test.tsx` | 3 passed |

**Task 3**

| Criterion | Result |
|---|---|
| helper exists, exports all five shapes + teardown | yes; `npx tsc --noEmit --listFiles` confirms `e2e/helpers/seed-payment-states.ts` is inside the program (so the exit-0 typecheck is not vacuous over it) |
| `npx playwright test e2e/shell.spec.ts -g "one \`main\` landmark"` | `1 passed (16.9s)` |
| watched red | observed — see below |
| `npx playwright test --list` | 20 tests in `shell.spec.ts`; `git diff` on the file changes **no** `test(` or `test.describe(` title line, so no test id moved |
| full spec | `npx playwright test e2e/shell.spec.ts --project=chromium --workers=1` → **20 passed (1.6m)** |

**Plan-level verification**

| Gate | Result |
|---|---|
| `npm test` | **141 files passed, 1 skipped; 1307 tests passed, 4 skipped** — exit 0 |
| `npm run test:design` | 41 files, 749 passed / 3 skipped |
| `npm run build` | exit 0 |
| `git diff --stat HEAD -- drizzle/ package.json package-lock.json` | empty — zero changes |
| `ls drizzle/*.sql | tail -1` | `drizzle/0025_audit_resolved_by.sql` (D-80 / GATE-06 intact) |
| fixture teardown | `SELECT count(*) … WHERE id LIKE 'e2e_landmark%'` → `0` bookings, `0` groups, `0` listings, **including after the deliberately failed run** |

## The Watched Red — verbatim

`payment-reversed-state.tsx`'s `<div className={BOOKING_SHELL}>` was reverted to `<main …>` (closing tag with it), the other two left fixed, and the spec re-run:

```
npx playwright test e2e/shell.spec.ts --project=chromium --workers=1 -g "one \`main\` landmark"

  x  1 [chromium] › e2e\shell.spec.ts:556:7 › AC#4's sibling — one `main` landmark on the booking
     routes › /bookings/[id], its cancel and its group render exactly one `main` at 320px and 1280px (11.4s)

    Error: /bookings/e2e_landmark_pay_reversed_cedb26e8-4bc6-407a-b560-faa6646e011a?paid=1 · court ·
    320px: the document exposes a number of `main` landmarks other than one. `(app)/layout.tsx:96`
    wraps every child in the ONE main landmark this group gets, so a page under it that opens its own
    nests a second inside the first — the defect this describe exists for. …

    expect(locator).toHaveCount(expected) failed

    Locator:  getByRole('main')
    Expected: 1
    Received: 2
    Timeout:  5000ms

    Call log:
      - waiting for getByRole('main')
        14 × locator resolved to 2 elements
           - unexpected value "2"

  1 failed
```

Three things this proves beyond "it went red":

1. **The route is real.** The failure names the seeded reversed fixture by id, so the new row is genuinely visited rather than skipped.
2. **The earlier routes are real too.** The loop is width-outer / route-inner and the red lands on route **5 of 6 at the first width**, which means the three original routes *and* the new pending route were visited and green in the same run.
3. **It is not the streaming buffer.** 14 consecutive polls over the 5s timeout all saw 2; this file measures the staged-copy overlap at ~100ms, so a buffer artifact cannot hold for 14 samples. This is the live accessibility tree holding two landmarks.

Restored via `git checkout --`, re-run: `1 passed (11.0s)`, and green again on the immediately consecutive full-file run.

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 — Blocking] The landmark comment's own prose failed the plan's acceptance grep**

- **Found during:** Task 2.
- **Issue:** The plan's criterion is `grep -c '<main'` returning `0` for all three components. The comment the plan *also* asks for is modelled on `bookings/[id]/loading.tsx:14-15`, whose wording contains the literal string `` `<main>` `` — so writing the required comment in the required shape made the required grep return `2`.
- **Fix:** The comment names the landmark as `` `main` `` without angle brackets and cites `(app)/layout.tsx:96` explicitly. Every word of the reason survives; only the bracket does not. `grep -c '<main'` now returns `0` on all three.
- **Note for the next author:** the precedent comment in `loading.tsx` still contains the bracketed form and would fail this criterion if it were ever applied there. That is not a defect in `loading.tsx` — it is a limit of the grep, recorded so nobody "fixes" prose to satisfy a matcher a second time without knowing why the first one moved.
- **Commit:** `6256952`.

**2. [Rule 3 — Blocking] `seedPaymentStates` needed an `hoursOffset`, or its first caller could not use it**

- **Found during:** Task 3.
- **Issue:** `shell.spec.ts`'s existing (and by instruction untouched) `confirmed` row starts at `now() + 10h`. The helper's own `confirmed` shape starts there too — deliberately, since that offset is what keeps `…/cancel` on its live branch. Three of the five shapes (`confirmed` and both `pending`s) are inside `booking_no_overlap`'s occupying set, so seeding the fixture alongside the inline row raises `23P01` on the very first INSERT.
- **Fix:** `options.hoursOffset` shifts the whole block, preserving the three-hour spacing that makes the five shapes mutually legal. `shell.spec.ts` passes `24`. The reason is recorded on the option, on the shape table and in the spec's header.
- **Commit:** `c90de96`.

**3. [Rule 2 — Missing critical functionality] Fixture teardown deletes `notification` rows as well**

- **Found during:** Task 3.
- **Issue:** `booker-seed.ts`'s teardown deletes notifications before bookings for a reason; a fixture that deletes bookings on its own path had no equivalent guard.
- **Fix:** `teardown()` runs `booking_group` → `notification` → `booking`, all `= ANY($1)` over the fixture's own ids. Verified: zero rows survive, including after the failed run.
- **Commit:** `c90de96`.

**4. [Rule 3 — Blocking] Landmark test budget raised 120s → 240s**

- **Found during:** Task 3. The route table doubled and every row is walked at both widths — twelve page loads instead of six, three of them on branches `next dev` had never compiled. Raising the budget rather than trimming coverage; a timeout on a serial seeded structural test would read as a landmark failure. Reason recorded at the line. Observed runtimes: 9.3s–13.5s, so the headroom is generous. **Commit:** `c90de96`.

### Criterion that could not be satisfied as literally written

Task 3's fourth criterion reads *"`npx playwright test --list` shows the booking-landmark describe **grew by exactly the number of new routes**"*. It cannot: the same criterion's own instruction is to *"add three rows to the route/resolved-marker table"* inside the existing single test, and the plan separately forbids forking the describe. Rows in a table are not tests, so `--list` still reports **one** test in that describe (20 in the file, unchanged).

The half of the criterion that carries the risk — *"and no existing test id changed"* — **was** verified: `git diff HEAD -- e2e/shell.spec.ts` touches no `test(` or `test.describe(` title line, and the `--list` output is identical to HEAD's apart from line numbers.

Route coverage is instead evidenced two ways, both stronger than a test count: each new row's resolved-marker is an `h1` that exists on **no other route in the app** (`Payment received`, `We couldn't complete this booking`, `This approval expired`), so a green run is proof those three pages rendered; and the watched red names its route by seeded id at position 5 of 6.

## Threat Flags

None. The plan introduces no network endpoint, no auth path and no schema change. `T-13-01-SC` is discharged trivially: **zero packages installed**, `package.json` and `package-lock.json` are byte-unchanged.

`T-13-01-SEED` and `T-13-01-TEARDOWN` are both mitigated as specified — every value goes through the `postgres` tagged template (no concatenation anywhere in the helper), ids are `randomUUID()`-suffixed per shape, and the teardown honours the `ON DELETE RESTRICT` ordering. `T-13-01-LANDMARK` is mitigated and *proved*, not asserted.

## Known Stubs

None. `CONFIRMATION_MOMENT_MIN_H` has zero call sites, and that is the plan's explicit instruction (*"Do NOT add `CONFIRMATION_MOMENT_MIN_H` to any call site in this plan"*) rather than a stub — plan 13-08 owns its consumer.

## Requirements: deliberately NOT marked complete

The plan's frontmatter carries `requirements: [STATE-05, BFLOW-08]`, and the standard step at the end of an
execution is `gsd-sdk query requirements.mark-complete STATE-05 BFLOW-08`. **That step was not run, on
purpose.** Neither requirement is delivered by this plan, and both are carried by later plans in the same
phase:

- **STATE-05** (the three distinct payment states) also appears in `13-02`, `13-03`, `13-04`, `13-07`,
  `13-15` and `13-16`.
- **BFLOW-08** (the distinct confirmation moment) also appears in `13-11` and `13-16`.

This plan built the *ground* those plans stand on — a constant, a landmark fix and a fixture. Checking the
boxes now would put `Complete` in `REQUIREMENTS.md`'s traceability table for surfaces that do not exist, and
the phase's own STATE entry already records that **STATE-05 will close PARTIAL** regardless (address-pending,
`SUPPORT_EMAIL` is null — D-64). The last plan that touches each ID is the one that should mark it.

## Operational Finding (worth carrying to the next plan)

**Do not run `npm run test:design` while `npm test` is running.** A first full-gate attempt reported `6 failed | 133 passed` with five *file-level* collection failures and one 99,983 ms timeout, across files this plan does not touch (`open-capacity-*`, `status-gate`, `webhook-*`). Re-running `npm test` **alone** gave `141 passed | 1 skipped`, exit 0. `tests/global-setup.ts` TRUNCATEs every `public` base table in `fitout_test` on every run, so a second vitest process starting mid-run truncates the first one's data underneath it. The failure signature is convincing — real test names, real timeouts — and looks nothing like a concurrency artifact, which is exactly why it is recorded here.

## Self-Check: PASSED

Files claimed created/modified, verified present on disk:

- `e2e/helpers/seed-payment-states.ts` — FOUND
- `src/lib/design/measurements.ts` — FOUND
- all six `(app)/bookings/[id]/**` route files — FOUND
- all three `src/components/booking/*-state.tsx` — FOUND
- `e2e/shell.spec.ts` — FOUND

Commits claimed, verified in `git log`:

- `8d346d2` — FOUND
- `6256952` — FOUND
- `c90de96` — FOUND
