---
phase: 12-booker-path-search-listing-checkout
plan: 02
subsystem: booking
tags: [react-context, server-actions, zod, url-params, race-condition, playwright, gate-05, d-59]

# Dependency graph
requires:
  - phase: 12-booker-path-search-listing-checkout
    plan: 01
    provides: "the seven measurement constants and the one results-grid gutter (neither consumed here — this plan renders no new box)"
  - phase: 3
    provides: "BookingSelectionProvider / useBookingSelection, AvailabilityCalendar, SlotPicker + the DOM-free slot-selection core, getDayAvailability (public, read-only, Zod-validated), parsePickedDate / parseWindowHour"
provides:
  - "ONE hook owning day / dayAvail / dayLoading / dayError above every placement, with selectDay and refreshDay on the shared context"
  - "refreshDay(): Promise<void> — the D-55 same-paint collision seam router.refresh() provably cannot be"
  - "A per-call request token that discards a stale day response (T-12-02-RACE), with an out-of-order jsdom probe as its red anchor"
  - "searchedWindowSchema + NO_SEARCHED_WINDOW in src/lib/validation/booking.ts — the searched window as its OWN shape, distinct from slotSelectionSchema's UTC ISO"
  - "src/lib/search/window-params.ts — the isomorphic leaf holding parsePickedDate / parseWindowHour, re-exported by query.ts"
  - "seedSelection() in the pure gesture core, and SlotPicker's read-once initialSelection prop"
  - "AvailabilityCalendar's todayDate prop — 'the day this opens on' split from 'the earliest selectable day'"
  - "Three e2e cases pinning D-59 #1 as a measured property of the route, incl. the observed next-action header"
affects: [12-04, 12-05, 12-06, 12-09, 12-10, 12-13, 12-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A monotonic request token instead of an AbortController for a server action — a POST the client cannot meaningfully abort, guarded for one integer"
    - "A URL param family parsed as its OWN Zod shape beside a colliding one, with the mutual rejection asserted from BOTH directions"
    - "A read-once lazy initializer fed from shared context, made safe by the `key` that remounts the consumer"
    - "An isomorphic leaf extracted downward when a client-graph module needs a pure function from a server-only module"
    - "An e2e request counter filtered on a MEASURED header, with the observed line recorded verbatim in the spec header"

key-files:
  created:
    - "src/lib/search/window-params.ts"
    - "tests/validation/search-window.test.ts"
  modified:
    - "src/components/availability/availability-calendar.tsx"
    - "src/components/availability/slot-picker.tsx"
    - "src/components/availability/slot-selection.ts"
    - "src/app/listings/[id]/(detail)/page.tsx"
    - "src/lib/validation/booking.ts"
    - "src/lib/search/query.ts"
    - "tests/availability/availability-calendar.test.tsx"
    - "tests/availability/date-pass-picker.test.tsx"
    - "e2e/public-listing.spec.ts"
    - ".planning/phases/12-booker-path-search-listing-checkout/deferred-items.md"

key-decisions:
  - "The plan's literal instruction — import parsePickedDate/parseWindowHour from @/lib/search/query into validation/booking.ts — FAILS the build with 10 GATE-05 errors. Measured before deviating, not assumed. The parsers moved DOWN to an isomorphic leaf and query.ts re-exports them, which keeps 'one implementation' intact"
  - "`initialDate` could not simply become the searched day: it was doing double duty as the horizon anchor, so a booker who searched Friday would have found Wednesday disabled. `todayDate` splits the two"
  - "The searched day is seeded on EXCLUSIVE listings only — DatePassPicker owns its own day state, and seeding it would have paired a searched-day payload with a today-anchored picker"
  - "SlotPicker's seed reads the shared context's CURRENT selection rather than a separate 'initial' channel — the `key={dayKey}` remount plus selectDay's clear makes that exactly right, and it cannot resurrect a cleared selection"
  - "`getByRole('alert')` is unusable unscoped in `next dev`: Playwright pierces shadow DOM and finds the dev overlay's own alert on every page. Scoped to `main`, with a count guard on `main` itself as the vacuity check"
  - "RESP-02 and STATE-07 are NOT marked complete — 12-10, 12-13 and 12-14 also claim them. This plan lands the seam they stand on, not the requirements"

patterns-established:
  - "Stale-response discipline for a shared fetch: the token is checked before EVERY setState in the resolution path, including the `finally` flag clear, so a late loser cannot erase the winner's skeleton"
  - "A discarded URL param costs the booker the WINDOW but never the DAY — half-seeding is refused explicitly rather than by omission"
  - "An e2e count assertion states `=== 1` with a failure message naming why `>= 1` would be green for the defect"

requirements-completed: []

# Metrics
duration: 33min
completed: 2026-08-18
---

# Phase 12 Plan 02: The Day Hoisted, the Searched Window Read — Summary

**`day`/`dayAvail`/`dayLoading`/`dayError` moved out of `AvailabilityCalendar` into `BookingSelectionProvider` behind a stale-response token, and `/listings/[id]` now opens on the day and window the booker searched — measured in a real browser at exactly one availability request per day selection.**

## Performance

- **Duration:** ~33 min
- **Started:** 2026-08-18T03:01:57Z
- **Completed:** 2026-08-18T03:34:58Z
- **Tasks:** 3
- **Files:** 10 modified, 2 created

## Accomplishments

- **One hook owns the day.** `BookingSelectionProvider` now takes `listingId` / `initialDate` / `initialDay` / `initialSelection` and exposes `day`, `dayAvail`, `dayLoading`, `dayError`, `selectDay` and `refreshDay` alongside the four selection values it already carried. `AvailabilityCalendar` reads them and owns no fetch. All five named exports are unchanged, and `npx tsc --noEmit` is clean across every call site.
- **`refreshDay()` is the seam `router.refresh()` could never be.** It re-reads the CURRENT day and returns its promise, so 12-13 can await it and commit the collision notice and the refreshed grid together. The file header now carries the whole argument — Next merges the RSC payload *without losing client `useState`*, and the day's slots were exactly that, seeded on mount for today.
- **The race is guarded and the guard is measured.** A monotonic token is checked before every `setState` in the resolution path, the `finally` flag clear included. New case (3) resolves an older day AFTER a newer one and asserts the newer day's hours are still on screen and both flags are clean. Watched red run and reverted.
- **The searched window is finally read, D-59 #1.** `search-result-card.tsx` has written `?date=&start=&end=` since Phase 3 and nothing read it. The listing RSC now parses it unconditionally through `searchedWindowSchema`, and seeds three things: the day, that day's availability, and — only when the read model reports those hours free — the slot selection. `search-result-card.tsx` is untouched.
- **The live param-format collision stayed apart.** `slotSelectionSchema` is byte-unchanged (`git diff` on the file is +66 lines, zero deletions), `resume=1` is still the discriminator, and `tests/validation/search-window.test.ts` asserts the two schemas reject each other's format from **both** directions — with a guard-the-guard proving each still accepts its own.
- **D-59 #1 is now a property of the route.** Three e2e cases assert it without any interaction: the searched day is selected (and today is not), 5–6 PM reads pressed in the picker, the rail names the window, and the CTA is enabled. An off-the-hour `start` keeps the day and discards the window with nothing pressed and no alert.
- **RESP-02 AC#21's first half is measured in a real browser.** One day selection fires exactly one availability request, counted on a header that was *observed* rather than guessed.

## Task Commits

1. **Task 1: Hoist the day-availability read into the provider** — `10625db` (refactor)
2. **Task 2: Parse the searched window, and open the listing on it** — `f74e3be` (feat)
3. **Task 3: The e2e pin — the searched day survives the click** — `e4538d1` (test)

## The measured findings

### 1. The plan's stated import path fails the build (Rule 3)

The plan says to canonicalise the searched window "through the already exported `parsePickedDate` / `parseWindowHour` from `@/lib/search/query.ts`". That import was **added and built** before deviating:

```
Error: Turbopack build failed with 10 errors:
  'server-only' cannot be imported from a Client Component module
  > 1 | import "server-only";
```

`src/lib/validation/booking.ts` is in the **client** graph (`search-bar.tsx:25` is `"use client"` and imports `searchParamsSchema`), and `query.ts` imports `getAvailability` from the `server-only` read model. It is also an import **cycle** — `query.ts` already imports `type SearchParams` from `booking.ts`, inert only because that import is erased.

Both parsers moved verbatim to `src/lib/search/window-params.ts` (isomorphic, zero imports) and `query.ts` re-exports them. Every existing `from "@/lib/search/query"` import keeps working; there is still exactly one implementation of each parser, which is the rule the plan actually cares about.

### 2. The observed server-action header

Case (6) logs the request it counts, once per run, so the name in the spec header stays checkable:

```
[12-02] server-action request observed:
  next-action=6017805515c500eae8865f8676457899da89a088cf
  url=http://localhost:3000/listings/e2e_pl_bookable_242324e6-aa0a-4c52-93d9-7ce734c36ad5
  rsc=undefined
```

Two things there matter more than the name. The `url` is the **listing route itself**, which is why the counter cannot filter on a path. And `rsc` is **undefined** — the obvious second guess for a filter would have counted zero and the gate would have been green for no reason.

### 3. `getByRole("alert")` counts the Next dev overlay

Case (5)'s first run was red at `Expected: 0 / Received: 1`. The listing page's server-rendered HTML contains no `role="alert"` at all (`curl | grep` — nothing). Playwright pierces shadow DOM, so an unscoped role query finds the dev overlay's alert inside `<nextjs-portal>` on **every** page in `next dev`. Scoped to the `<main>` this route renders, with `expect(page.locator("main")).toHaveCount(1)` first as the vacuity guard.

### 4. `initialDate` was doing two jobs

`initialDate` anchored `todayStart` / `horizonEnd` *and* seeded the selected day, which was safe only while it was always today. Handing it the searched day would have disabled every earlier day — a booker who searched Friday could no longer pick Wednesday. `todayDate` (optional, defaulting to `initialDate`) splits the two, so no existing call site or test changes behaviour.

## Watched reds (all run, all reverted, `git diff` clean after each)

| # | Probe | Mutation | Observed |
|---|---|---|---|
| A | `search-window` case (4) | `wholeWindow` loses `&& endHour > startHour` | 1 failed / 6 passed — `start=11:00 end=09:00 should have been discarded: expected 11 to be null` |
| B | `search-window` case (2) | `parseWindowHour` loses `\|\| min !== 0` | 1 failed / 6 passed — `expected 9 to be null` on the half-past start |
| C | `availability-calendar` case (3) | the token check dropped before `setDayAvail(res)` | 1 failed / 2 passed — `the older day's late response overwrote the newer day's availability (T-12-02-RACE)`, printing the 9:00 AM chip that should not exist |
| D | e2e (6) | `selectDay` calls `loadDay(next)` twice | `one day selection issued 2 availability requests… === 1 and not >= 1 on purpose` |
| E | e2e (4) | `openOnSearchedDay && false` (the shipped behaviour restored) | `toHaveAttribute("data-selected-single","true")` → `Received: ""` — the page went back to opening on today |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `validation/booking.ts` cannot import from `@/lib/search/query`**

- **Found during:** Task 2, before writing any of it — the import was probed against `npx next build` rather than assumed.
- **Issue:** 10 Turbopack `server-only cannot be imported from a Client Component module` errors (full text above), plus an import cycle.
- **Fix:** `parsePickedDate` / `parseWindowHour` moved verbatim to the new isomorphic `src/lib/search/window-params.ts`; `query.ts` re-exports both plus `type PickedDate`, so no existing importer changed. The new file's header carries the measured failure and a "keep this file isomorphic" instruction.
- **Files:** `src/lib/search/window-params.ts` (created), `src/lib/search/query.ts`, `src/lib/validation/booking.ts`
- **Verification:** `npm run build` exits 0; `npx tsc --noEmit` exits 0; every pre-existing `parsePickedDate` importer (`actions/booking.ts`, `tests/validation/booking-schemas.test.ts`) untouched and green.
- **Committed in:** `f74e3be`

**2. [Rule 2 - Missing critical functionality] a seeded selection the picker did not render**

- **Found during:** Task 2, reading Task 3's acceptance criteria ("the 5-6 PM window reads as selected in the slot picker").
- **Issue:** seeding only the provider would have put the rail and the grid in open disagreement — the summary naming a window whose chips were un-pressed. `SlotPicker` started its reducer at `EMPTY_SELECTION` unconditionally.
- **Fix:** `seedSelection()` added to the DOM-free gesture core (it **re-validates** the value against the slots it was handed and degrades to empty on any unknown boundary, inverted run, or unavailable hour inside the span), and `SlotPicker` gained a read-once `initialSelection` prop fed from the shared context. `slot-picker.tsx` / `slot-selection.ts` were not in `files_modified`; without this the plan's own Task 3 criterion is unsatisfiable except by weakening it.
- **Files:** `src/components/availability/slot-selection.ts`, `src/components/availability/slot-picker.tsx`
- **Verification:** e2e case (4) asserts `aria-pressed=true` on 5:00 PM and `false` on 6:00 PM; `tests/availability` 23 files / 253 tests green.
- **Committed in:** `f74e3be`

**3. [Rule 3 - Blocking] `initialDate` conflated "opens on" with "earliest selectable"**

- **Found during:** Task 2.
- **Issue:** `todayStart` / `horizonEnd` were derived from `initialDate`, so seeding the searched day would have disabled every day before it.
- **Fix:** optional `todayDate` prop, defaulting to `initialDate` so every existing call site and both existing test files are behaviourally unchanged.
- **Files:** `src/components/availability/availability-calendar.tsx`, `src/app/listings/[id]/(detail)/page.tsx`
- **Committed in:** `f74e3be`

### Scope adjustments recorded rather than absorbed

- **Task 1's acceptance criterion "`getDayAvailability` … one call site in `src/components/`" is not literally satisfiable, and should not be.** `date-pass-picker.tsx:190` has its own call for the drop-in surface, which this plan deliberately does not open. As measured: `availability-calendar.tsx` has exactly **one** invocation (`:163`, inside the provider) plus its import and one mention in a docblock. The exclusive booking tree has one call site, which is the property the criterion is about.
- **The drop-in (open-capacity) branch keeps opening on venue-local today.** `DatePassPicker` owns its own day/month state and its own fully-booked-dates read; seeding it a searched day would have paired a searched-day `initialDay` payload with a today-anchored picker. Gated explicitly (`!isOpenCapacity`), so that branch is byte-identical to what shipped.
- **`requirements-completed` is empty on purpose.** RESP-02 is also claimed by 12-10 and 12-14; STATE-07 by 12-13 and 12-14. This plan lands the seam both stand on. Marking either complete here would make REQUIREMENTS.md claim a surface that does not exist yet.

**Total deviations:** 3 auto-fixed (one Rule 2, two Rule 3). **Impact on scope:** two files outside `files_modified` (`slot-picker.tsx`, `slot-selection.ts`) and one new isomorphic leaf. No new dependency, no migration, no change to booking/payment/capacity/availability logic.

## Issues Encountered

- **`e2e/public-listing.spec.ts`'s two 404 cases are RED, and they were RED before this plan touched anything.** Measured by restoring the file to `6272c8f` and running it: `a draft listing 404s to the public` → `Expected: 404 / Received: 200`. A `curl` of a real draft listing returns **200 with the not-found boundary's body** (`This space isn't available`) and the root layout's `<title>FitOut</title>` — so it is a **status-code** regression, not a content leak, and T-05-NONPUB's substance holds. Almost certainly Next 16 flushing the streamed shell before `notFound()` resolves. Logged to `deferred-items.md`; not fixed here because it predates the plan, sits outside its surface, and the plausible fixes are a rendering-strategy change on a public money-path route (a Rule 4 question needing the same `npm run build && npm start` discriminator D-56 requires). **The three new cases were verified with `--grep "D-59"`**, which does not collect the red pre-existing ones.
- **The local test Postgres hit its 100-connection ceiling twice** (`sorry, too many clients already` at the start; four spurious `open-capacity-race` failures later, green on an immediate re-run with the pool drained). Environmental and already recorded as a recurring gotcha; `docker restart fitout-db-1` clears it.
- **`price-parity` + `availability` flake when run in ONE Playwright invocation** (one `toBeVisible` timeout), and pass in full separately. Logged to `deferred-items.md`.

## Threat register disposition

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-12-02-PARAMTAMPER | mitigated | `searchedWindowSchema` degrades every bad shape to no window; cases (5) and (5b) in `search-window.test.ts` cover garbage, impossible dates, SQL-shaped strings and repeated params; e2e (5) asserts the rendered page raises no alert |
| T-12-02-FORMATMIX | mitigated | `slotSelectionSchema` byte-unchanged (+66/-0 on the file), `resume=1` still the discriminator, mutual rejection asserted from both directions with a guard-the-guard |
| T-12-02-SEEDTRUST | mitigated | The selection is seeded only when the read model reports the hours free, from the read model's **own** slot boundaries; `seedSelection` re-validates again in the picker; `placeHold` remains the sole authority (D-130) |
| T-12-02-ENUM | accepted | `getDayAvailability` unchanged — no widened payload, no caller-supplied status, published + non-deleted gate still re-enforced inside the action |
| T-12-02-RACE | mitigated | Per-call token checked before every `setState`; out-of-order jsdom probe with watched red C |
| T-12-02-SC | mitigated | `git diff --stat package.json` empty; nothing installed |

## Known Stubs

None. Every value this plan renders is read from the server: the day from `getAvailability`, the day's slots from the same read model, and the seeded selection from that payload's own slot boundaries.

## Threat Flags

None. No new network endpoint, no new auth path, no file-access pattern, no schema change. `drizzle/` is byte-identical at `0025_audit_resolved_by.sql` (26 `.sql` files, GATE-06's own tripwire green inside the design suite).

## Verification

| Check | Result |
|---|---|
| `npm run build` | **exit 0** — 39 design test files, 701 passed / 3 skipped, `✓ Compiled successfully`, 0 lint errors (9 pre-existing warnings) |
| `npx tsc --noEmit` | **exit 0** |
| `npx vitest run tests/availability tests/validation` | **253 passed / 23 files** |
| `npx vitest run tests/validation/search-window.test.ts` | 7 passed |
| `npx vitest run tests/availability/availability-calendar.test.tsx` | 3 passed (2 shipped + 1 new) |
| `npx playwright test e2e/public-listing.spec.ts --project=chromium --grep "D-59"` | **3 passed** |
| `npx playwright test e2e/price-parity.spec.ts --project=chromium` | **1 passed** (unmodified — `git diff --stat` empty) |
| `npx playwright test e2e/availability.spec.ts --project=chromium` | **4 passed** |
| `npx playwright test e2e/public-listing.spec.ts --project=chromium` (whole file) | 1 passed, 1 failed, 4 skipped — the failure is the **pre-existing** draft-404 case, red at `6272c8f` |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (26 files) |
| `git diff --stat package.json` | empty |
| `grep -rn "getDayAvailability" src/components/` | one invocation in `availability-calendar.tsx`; `date-pass-picker.tsx`'s own is the untouched drop-in surface |

## Next Phase Readiness

- **12-13 (STATE-07 collision)** — `refreshDay()` exists, returns its promise, and does **not** clear the selection, so the collision path can drop the rail's selection with its own notice and commit both with the refreshed grid in one paint. The reason `router.refresh()` cannot do this is recorded in the file it applies to.
- **12-10 (RESP-02 sheet)** — the second booking view can mount inside the same provider and will read the same day. The `=== 1` request count is proven for the desktop placement; the 375px half is that plan's to add, and the spec's NOT-COVERED footer says so.
- **12-04 / 12-05 / 12-06 / 12-09** — money props, `AllInTable` lookups, the `Est.` labels, the day-cell classes and the slot skeleton were deliberately left untouched, exactly as the plan required, so those plans open on the surface they were written against.
- **Anyone reading `start` on this route** — `searchedWindowSchema` and `slotSelectionSchema` now each own one format and the separation is asserted. Do not widen either.

**No blockers.** One pre-existing red is logged in `deferred-items.md` with a measurement and a recommended discriminator.

## Self-Check: PASSED

- Files: `12-02-SUMMARY.md`, `src/lib/search/window-params.ts`, `tests/validation/search-window.test.ts`, `src/components/availability/availability-calendar.tsx`, `src/lib/validation/booking.ts`, `e2e/public-listing.spec.ts` — **6/6 FOUND**
- Commits: `10625db`, `f74e3be`, `e4538d1` — **3/3 FOUND**
- Artifact `contains` checks: `selectDay` in `availability-calendar.tsx` ✓ · `searchedWindow` in `validation/booking.ts` ✓ · `BookingSelectionProvider` linking `(detail)/page.tsx` → the calendar ✓ · `getDayAvailability` linking the calendar → `actions/availability.ts` ✓

---
*Phase: 12-booker-path-search-listing-checkout*
*Completed: 2026-08-18*
