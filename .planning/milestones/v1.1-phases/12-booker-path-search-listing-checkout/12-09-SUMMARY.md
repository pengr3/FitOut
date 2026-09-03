---
phase: 12-booker-path-search-listing-checkout
plan: 09
subsystem: ui
tags: [accessibility, hit-area, wcag-258, tailwind-merge, intrinsic-sizing, skeleton, live-regions, playwright, boundingbox, bflow-05]

# Dependency graph
requires:
  - phase: 12-booker-path-search-listing-checkout
    plan: 01
    provides: "CALENDAR_CELL and SLOT_CHIP_BOX with the two hazard notes this plan discharges — both are now rewritten as paid rather than left saying something false"
  - phase: 12-booker-path-search-listing-checkout
    plan: 02
    provides: "the availability provider that owns the day and its loading flag, and the `todayDate`/`initialDate` split the calendar's horizon reads"
  - phase: 12-booker-path-search-listing-checkout
    plan: 03
    provides: "e2e/helpers/booker-seed.ts — the seeded host + bookable listing this plan's four-width measurement drives"
  - phase: 12-booker-path-search-listing-checkout
    plan: 06
    provides: "GATE-03's compile-pinned declared set, the kind→naming-mechanism mapping, and the day skeleton's corrected region shape (whose bars this plan finally moves onto the constant)"
  - phase: 12-booker-path-search-listing-checkout
    plan: 08
    provides: "the listing page's document order, and the deferred slot-picker tooltip with its design question stated"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "selector-contract.ts (const tuple + TOTAL Record + bidirectional scan), skeleton-a11y.test.tsx's nameFrom:author measurement, e2e/helpers/served-document.ts, e2e/skeleton-geometry.spec.ts's box reader idiom, overflow-320.spec.ts's route table"
provides:
  - "A 44px day cell and 44x44 nav buttons on /listings/[id], MEASURED at four widths in both themes"
  - "Four call-site overrides on the vendored Calendar, each with its derivation — the variable, the day button, the day `<td>`'s ratio, and a responsive container width"
  - "CalendarDaySkeleton and CalendarMonthSkeleton as exported components, so AC#16 is asserted in jsdom rather than reviewed"
  - "`skeleton-calendar` + `calendar-month-loading` rows, and a 19-test skeleton-a11y gate (was 10)"
  - "e2e/calendar-hit-area.spec.ts — the boundingBox measurement the plan's Pitfall 2 demanded, plus the ±2px plate/grid match"
  - "e2e/reduced-motion.spec.ts's AC#17 absence, asserted with the preference OFF as well as on"
  - "The last booker-path tooltip DELETED, with its content relocated for touch, keyboard and AT alike (D-56)"
affects: [12-10, 12-11, 12-12, 12-13, 12-14, 14-host-surfaces]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A vendored-primitive override is not paid until a rendered `boundingBox()` agrees — a class review passes at 25.08px with every gate green"
    - "A DEFINITE width poisons intrinsic sizing two grids up; express a shrinkable box as `w-full max-w-[…]` below the breakpoint and a definite `w-[…]` above it"
    - "Scan from the element an author would EDIT, not from the element the requirement names — a transition on an ancestor does not inherit, and the first draft's watched red passed because of it"
    - "A server-rendered control is clickable before React attaches a handler: an e2e click that drives a client transition must be RETRIED, not merely awaited"
    - "Extract inline skeleton markup into a component when the only alternative is mounting a whole client tree in jsdom — the gate that could not run is the gate that is not a gate"

key-files:
  created:
    - "e2e/calendar-hit-area.spec.ts"
  modified:
    - "src/components/availability/availability-calendar.tsx"
    - "src/components/availability/slot-picker.tsx"
    - "src/app/listings/[id]/(detail)/loading.tsx"
    - "src/lib/design/selector-contract.ts"
    - "src/lib/design/live-regions.ts"
    - "src/lib/design/measurements.ts"
    - "tests/design/skeleton-a11y.test.tsx"
    - "e2e/reduced-motion.spec.ts"
    - "e2e/overflow-320.spec.ts"
    - ".planning/phases/12-booker-path-search-listing-checkout/deferred-items.md"

key-decisions:
  - "The plan's two overrides are not enough and the shortfall is 19px of hit area. A THIRD (a responsive container width) and a FOURTH (`[&_td]:aspect-auto`) were found by measuring, not by reading — with only the plan's two applied the cell renders 25.08px wide, WORSE than the 28px debt, with tsc, lint and all 41 design files green."
  - "The container width is `w-full max-w-[…]` below `md:` and a definite `w-[…]` at and above it. The obvious `w-[326px] max-w-full` overflows 320px by 22px: a definite width contributes itself as min-content, a percentage max-width is ignored during intrinsic sizing, and an `auto` grid track never shrinks below its items' min-content — so the width travelled up two nested grids and became the track it was supposed to fit inside."
  - "`[&_td]:aspect-auto` rather than the `classNames={{ day }}` escape hatch. The hatch is spread LAST in the vendored file, so taking it would mean restating six classes (`group/day`, the cell radius, `p-0`, `text-center`, `select-none`, both range selectors) — six copies that can go stale against a file this repo never edits."
  - "The cell's fluid width floors at 38.58px, not the UI-SPEC's 41. That figure is 288 ÷ 7 and assumes a calendar with no padding and no border; both are shipped. Recorded and asserted at the measured number rather than engineered away — 38.58 is 1.6× the WCAG 2.5.8 AA bar, and buying 2.57px would cost the calendar its card edge on a phone."
  - "The month plate mounts in `(detail)/loading.tsx`, wrapped in `aria-hidden`, NOT inside AvailabilityCalendar. The exclusive calendar performs no month-level read, so the plan's stated trigger has no referent there; rendering it during `dayLoading` would put two `role=\"status\"` regions on screen for one wait (rule 6) and take the calendar out from under the booker's cursor on every day click. Every rejected option is written at the component."
  - "D-56's last booker-path tooltip is RESOLVED rather than deferred a second time. The chip's `aria-label` carries the full sentence including the notice requirement, and one visible day-panel line names the distinct states that day contains — both derived from `tooltipFor`, so the announced sentence and the visible one cannot drift."

patterns-established:
  - "Record the measured table of intermediate states, not just before/after: the row where the height was right and the width was 25.08 is the row that explains why the file exists"
  - "When a plan predicts which assertion a mutation will redden and it reddens a different one, keep both probes and write down why — `aspect-ratio` resolves the AUTO axis from the definite one, so with `h-11` present the ratio drives the WIDTH"
  - "A live-region row may honestly declare a region whose only shipped call site silences it, provided the row says so and names the surface that will announce it"

requirements-completed: [BFLOW-05]

# Metrics
duration: 74min
completed: 2026-08-18
---

# Phase 12 Plan 09: A 44px Cell Because a Browser Said So — Summary

**BFLOW-05's central claim needed FOUR overrides rather than the two the plan named, and the two extra ones were invisible to every gate in the repository: with the plan's edits applied exactly as written the day cell renders 25.08px wide — worse than the 28px debt it was paying off — while `tsc`, `eslint` and all 41 design test files stay green. The month plate now matches the resolved grid to 0.81px in both themes, the month change animates nothing with the preference off as well as on, and the last hover-only explanation on the booker path is gone with its content relocated rather than deleted.**

## Performance

- **Duration:** ~74 min (17:36 → 18:50)
- **Tasks:** 3
- **Files:** 1 created, 10 modified

## Task Commits

1. **Task 1: The day-cell overrides and the measurement that decides which one shipped** — `d74bb88` (fix)
2. **Task 2: The month-grid skeleton, the slot box, and the chip that has to match it** — `1486483` (feat)
3. **Task 3: The skeleton match, the motion absence, and the 320px floor** — `1fd7cbd` (test)

## THE MEASUREMENT — the plan's whole reason for existing, and it paid

`/listings/{seeded}`, Chromium, court (grove identical), four widths:

| state | calendar root | month grid | **DAY CELL** | nav |
|---|---|---|---|---|
| **BEFORE** — shipped, `--cell-size` = 28px | 214 × 297.19 | 196 × 235.19 | **28 × 28** | 28×28 |
| (1)+(2) — **the plan's two overrides, exactly as written** | 193.53 × 295.66 | 175.53 × 217.66 | **25.08 × 44** | 44×44 |
| (1)+(2)+(3)+(4) at 320px | 288 × 409.19 | 270 × 331.19 | **38.58 × 44** | 44×44 |
| (1)+(2)+(3)+(4) at 375 / 768 / 1280 | 326 × 409.19 | 308 × 331.19 | **44 × 44** | 44×44 |

Three readings, and each is a finding.

### Finding 1 — the tailwind-merge hazard resolved, and the escape hatch was NOT needed

The plan's headline risk was that `cn()`'s `size` group removes *earlier* `h-*`/`w-*` rather than later ones, so a later `h-11` would not delete `size-auto` and the winner would be decided by Tailwind's emitted order. **Measured: both survive into the class string** (`… flex size-auto flex-col …` is still there) **and `h-11` wins.** The height is 44 at row (1)+(2) and at every width after it. The `classNames={{ day: … }}` escape hatch the plan declared in advance was therefore not taken, and no vendored default had to be restated.

`aspect-square` and `min-w-(--cell-size)` were both correctly REMOVED by the merge (`aspectRatio: "auto"`, `minWidth: "0px"` in the computed style). So the plan's own two edits did exactly what they claimed.

### Finding 2 — and the cell was still 25.08px wide, which no source gate can see

`min-w-0` makes the day button `1fr` of the calendar's content box. `ui/calendar.tsx`'s `classNames.root` is `w-fit`, and with no per-cell minimum left, `fit-content` collapses to the width of the numerals: **193.53px of calendar, 25.08px per cell, at every viewport from 320 to 1280.** Every class in the diff is right. The box they live in is not.

The fix states the seven-cell figure on the CONTAINER instead of on each cell:

```
7 × 44 (cells) + 16 (ui/calendar.tsx's own p-2) + 2 (this call site's border) = 326
```

**and the spelling of that is the second half of the finding.** The obvious `w-[calc(…)] max-w-full` **overflows 320px by 22px**, and `min-w-0` on the calendar does not save it:

```
/listings/[id] at 320px:  scrollWidth 342   clientWidth 320
grid track (two levels up):  326px  inside a 288px container
```

A box with a **definite** width contributes that width as its min-content size; a **percentage** `max-width` is indefinite during intrinsic sizing and is ignored while that contribution is computed; and an `auto` grid track never shrinks below its items' min-content. So the 326 travelled up through `div.grid` and `div.mt-8.grid.lg:grid-cols-[1fr_360px]` and became the track — `max-w-full` was resolving against a track the width itself had widened. A `max-width` contributes nothing, so the shipped shape is `w-full max-w-[calc(7*var(--cell-size)+18px)] md:w-[calc(7*var(--cell-size)+18px)]`: it shrinks below `md:` and pins the `auto` track above it.

### Finding 3 — a FOURTH override, because the vendored ratio is on the `<td>` too

`ui/calendar.tsx:106` puts `aspect-square h-full w-full` on the day **cell**, not only on the button. With the button at `h-11` and the cell still square, the `<td>` measured **25.08px tall around a 44px button** — six week rows each overlapping the next by 19px. `[&_td]:aspect-auto` on the root lets the flex row's default `stretch` take the cell to the button's height. It is an arbitrary variant rather than the escape hatch for the reason recorded in key-decisions.

### Finding 4 — 12-UI-SPEC's 41px floor is 38.58, and the difference is the calendar's own chrome

`§ Spacing` derives "~41px" from 288 ÷ 7 — the 320px viewport less the page's `px-4`. That silently assumes a calendar with no padding and no border; `ui/calendar.tsx` pays `p-2` and this call site pays a 1px border each side, so the seven cells divide **270**, not 288. The spec's number is an estimate of a control it did not measure — the same direction as `AUTH_SLOT_ICON`'s bell (32 vs 44) and `sticky-offset`'s count (1 vs 3).

Recorded rather than engineered away: 38.58 is **1.6× the WCAG 2.5.8 AA 24px minimum**, buying the 2.57px would mean dropping the border and padding below `sm:` (a design change no criterion asks for), and the alternative the UI-SPEC already ruled out — a horizontally scrolling month grid — fails both the responsive and the keyboard gate. The width assertions are therefore TWO expectations: the AA floor (the requirement) and the derived 270 ÷ 7 (the drift pin that catches a return to 25.08).

## The other measured findings

### 5. The motion scan's first draft was GREEN against the defect it was written for

Watched red (a) added `transition-[opacity] duration-200` to the `Calendar` root — the "tasteful" month-change transition AC#17 forbids, comfortably inside the 320ms source cap. **It passed.** The scan walked the `<table>` and its descendants, which is where a month grid *is*, and a transition on an ancestor does not inherit. Scanning from `[data-slot="calendar"]` reddens it:

```
Error: month grid · no-preference: 1 element(s) inside the month grid report a non-zero
transition-duration on something that is not a <button>. …
  div.rdp-root group/calendar bg-background p-2 [- — transition opacity 0.2s, animation none 0s
```

And the `reduce` case stayed **green** under the same mutation — the DS-04 reset really does silence it — which is the whole reason the absence is asserted with the preference OFF as well as on.

### 6. A server-rendered control is clickable before it is interactive

Both AC#17 cases passed four consecutive isolated invocations of their own file and then **failed in the full-suite run**, at the caption guard, in both media states:

```
Error: month grid · reduce: the caption still reads "August 2026" after clicking `Next month`,
so the month never changed and every assertion below would be about a grid nothing happened to.
```

The month grid is server-rendered, so `Next month` exists and is clickable long before React attaches a handler. Under load the click landed on a node that was not yet interactive and the event was **lost, not queued** — polling afterwards would have hung forever. `advanceMonth` retries the click inside an `expect.poll`. The guard is not weakened: with the click removed it still fires in both states, and the measurement is written at the helper.

**The guard earned its place twice.** Breaking the locator instead (`Next month` → `Nxt month`) fails at `locator.click` with Playwright's own 90s timeout and never reaches the caption clause at all — an uninformative red. The probe that exercises the guard is a click that *lands and does nothing*.

### 7. What the month grid actually spends, measured before anything was asserted

Inside the resolved calendar, no motion preference, 85 elements: **exactly one shape reports any duration at all** — 35 × `button`, `transition: all 0.12s`, `animation-name: none`. That is the shipped `<Button>` hover at `--motion-fast`, which is the motion the UI-SPEC explicitly permits. The table, the head, the week rows, the weekday cells and every day `<td>` report `0s`. So AC#17 is asserted as *zero animations anywhere* plus *zero transitions on anything that is not a `<button>`*, with a 320ms cap on what the buttons themselves may spend — rather than as "no non-zero durations", which is false of the shipped hover and true-by-the-reset under `reduce`.

### 8. D-56's last booker-path tooltip, resolved rather than deferred again

12-08 logged `slot-picker.tsx:169-211` forward with the question stated. The answer is **both** halves, because they serve different people:

- the chip's `aria-label` now carries `tooltipFor(...)` — the full sentence **including the notice requirement**, where it previously carried only the short `reasonFor(...)`;
- the day panel renders one visible line, `Struck-through times can't be booked — {the distinct states this day contains}`, derived from the same function so the announced sentence and the visible one cannot drift, and naming only the states present (a day of booked hours does not lecture anyone about a notice window).

A per-chip static line was the other candidate and is not a layout that exists — the chips are a wrapping grid of 44 × 80px boxes. Deleting `TooltipProvider` also removes a client boundary from the picker.

`grep -rln "components/ui/tooltip" src/components/{search,listing,availability,booking} src/app/listings` now returns **one** file: `photo-uploader.tsx`, a HOST surface that the criterion's directory glob was always wider than. D-56's *"deletes the last one"* is now true of the booker path.

## Watched reds (all run, all reverted, tree clean after each)

| # | Gate | Mutation | Observed |
|---|---|---|---|
| pre | `calendar-hit-area` | `availability-calendar.tsx` checked back out at `ee61073` (the shipped tree) | **2 failed** — `Expected: 44 / Received: 28`. The spec is red against the debt it exists to pay |
| a | `calendar-hit-area` | `aspect-auto` dropped from the DayButton override | **2 failed**, and the **WIDTH** clause fired, not the height (`Received: 5.43` off the derived 38.57). `aspect-ratio` resolves the AUTO axis from the definite one, so with `h-11` present the ratio drove the width back to 44 — and 7 × 44 overflows 320px |
| a2 | `calendar-hit-area` | `h-11` dropped instead | **2 failed** on the height clause — `Received: 14` (court) / `15` (grove), the button's bare line box |
| b | `calendar-hit-area` | listing path repointed at `/listings/does-not-exist-12-09` | **2 failed** at `reachableCalendar`, before any comparison |
| c | `calendar-hit-area` AC#15 | the plate's six week rows → five | **2 failed** — `skeleton {"height":358} resolved {"height":409.19} — Δwidth 0, Δheight 51.19`, exactly one week row, and the WIDTH stayed exact in both themes |
| d | `selector-contract`, bidirectional | rendered literal → `skeleton-calendar-box` | **3 failed**, the set message naming *"Declared-but-absent: [skeleton-calendar]. Rendered-but-undeclared: [skeleton-calendar-box]"* |
| e | `live-regions` compile pin | the `calendar-month-loading` row deleted | `tsc --noEmit` exit 2, **one** TS2741 naming the id |
| f | `skeleton-a11y` + `live-regions` | the month plate's `aria-label` removed | **2 failed across both gates** — *"must compute the accessible name … role=\"status\" is nameFrom:author, so an sr-only child alone leaves it empty"* |
| g | `reduced-motion` AC#17 | 200ms transition on the Calendar root | first draft **passed** (finding 5); after widening the scan, **1 failed / 1 passed** naming the element, with `reduce` green |
| h | `reduced-motion` AC#17 | the nav click made a no-op | **2 failed**, one per media state, at the caption guard |
| i | `overflow-320` | `min-w-0` → `min-w-(--cell-size)` on the day button | **2 failed** — `scrollWidth 342 against a clientWidth of 320`, the offender list naming the day buttons AND `table.…rdp-month_grid` by class, in both themes |

## Accomplishments

- **44 × 44 at 375 / 768 / 1280, 38.58 × 44 at 320, nav buttons 44 × 44 everywhere** — asserted against the literal, in its own expectation, in both themes.
- **`src/components/ui/calendar.tsx` is byte-unchanged** (`git diff --stat` across all three commits: empty). T-12-09-VENDORFORK holds; the next `npx shadcn add` collision surface did not grow.
- **The month plate is the grid's box.** 288 × 410 vs 288 × 409.19 at 320; 326 × 410 vs 326 × 409.19 at 768 and 1280. The **width is exact** because both sides read the same two strings; the 0.81 is spent entirely on the weekday row's line box and is stated at the component.
- **Both states come from ONE real response.** `served-document.ts`'s marker sits at byte 13,786 on this route, so the pending measurement is `(detail)/loading.tsx` genuinely in flight — nothing mocked, nothing timed. Three vacuity guards: the truncation happened, the resolved calendar is absent in the pending pass, and the plate is absent in the resolved one.
- **`SLOT_CHIP_BOX` is genuinely one source now.** The eight shimmer bars read it and `CHIP_BASE` gained `min-w-20` in the same commit — 12-01's stated condition, discharged, with the constant's hazard note rewritten as paid rather than left saying something false.
- **`skeleton-a11y.test.tsx` went 10 → 19 tests.** Both calendar skeletons: exactly one `role="status"`, a COMPUTED non-empty accessible name (not an attribute read), no explicit `aria-live` beside the role, one `sr-only` child equal to the label, every bar `aria-hidden`, and the plate's 7×6+7+1 = 50 bars.
- **`npm run test:design` went 740 → 749 tests, still 41 files**, still with no `globalSetup` and no `setupFiles`.
- **Zero packages, zero migrations.** `git diff --stat package.json` empty; `drizzle/` is 26 `.sql` files at `0025_audit_resolved_by.sql`, GATE-06's tripwire green inside `npm run build`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing correctness] The plan's two overrides ship a 25.08px hit area**

- **Found during:** Task 1, the first `boundingBox()` run — which is the measurement the plan wrote itself around.
- **Issue:** Findings 2 and 3 in full. `min-w-0` makes the cell fluid; `w-fit` then collapses the calendar to the numerals, and the vendored `aspect-square` on the `<td>` leaves a 44px button inside a 25px cell.
- **Fix:** a responsive container width (`CALENDAR_GRID_WIDTH`, local to the file with its derivation and the overflow measurement) and `[&_td]:aspect-auto` on the root. Both at the call site; the vendored file is untouched.
- **Files:** `src/components/availability/availability-calendar.tsx`
- **Committed in:** `d74bb88`

**2. [Rule 1 - Bug] The motion scan was green against the defect it was written for**

- **Found during:** Task 3, watched red (g). Full analysis in finding 5.
- **Fix:** the scan starts at `[data-slot="calendar"]` rather than at the `<table>`, with the measurement recorded at the loop.
- **Files:** `e2e/reduced-motion.spec.ts`
- **Committed in:** `1fd7cbd`

**3. [Rule 1 - Bug] The AC#17 cases raced hydration and failed only under full-suite load**

- **Found during:** Task 3, the first whole-suite run. Full analysis in finding 6.
- **Fix:** `advanceMonth` retries the click inside an `expect.poll`, with the measurement and the "the event is lost, not queued" mechanism at the helper. The guard still fires when the month genuinely does not change (re-probed).
- **Files:** `e2e/reduced-motion.spec.ts`
- **Committed in:** `1fd7cbd`

**4. [Rule 1 - Bug] A `prettier --write` reformatted two files well beyond the change**

- **Found during:** Task 2. Prettier's 80-column default rewrapped imports, function signatures and call arguments across `slot-picker.tsx` and `availability-calendar.tsx`; the repo's own pipeline is `eslint` only and its style is ~100 columns.
- **Fix:** `availability-calendar.tsx` was checked back out at `d74bb88` and the task's four edits re-applied by hand; `slot-picker.tsx`'s four gratuitous rewraps were reverted individually. Its remaining re-indentation is the unavoidable consequence of deleting the `TooltipProvider` wrapper level.
- **Files:** both, restored
- **Committed in:** `1486483` (the churn never reached a commit)

### Scope adjustments recorded rather than absorbed

- **`src/app/listings/[id]/(detail)/loading.tsx` is outside `files_modified`** and is where the month plate mounts. The plan says the plate "renders while the month's availability is in flight"; on this path that state exists only at the route level, and the reasons the three in-component alternatives were rejected are written at the component. The plate is `aria-hidden` there (rule 6 — `PanelSkeleton` owns the route's one busy region), and the `live-regions.ts` row says so explicitly rather than implying an announcement that does not happen.
- **`src/lib/design/measurements.ts` is outside `files_modified`** and both of its Phase-12 hazard notes were rewritten. `CALENDAR_CELL`'s said the day button "must be MEASURED by the plan that owns it" — that plan is this one, and it found three more overrides than the note anticipated. `SLOT_CHIP_BOX`'s said the constant was "the shimmer's box today, NOT yet the single source of both" — false as of this commit. A stated reason that has quietly become false is worse than no reason (11-09's finding 4), and both notes are what a later reader reaches for.
- **`CalendarDaySkeleton` was extracted** though the plan names no such component. AC#16 asks that BOTH calendar skeletons render one named `role="status"` with every bar `aria-hidden`; the day one was inline JSX inside `AvailabilityCalendar`, so asserting it in jsdom would have meant mounting react-day-picker, a context provider and a server action. The extraction is markup-for-markup and preserves the source order the live-region ordinals key on.
- **`CALENDAR_GRID_WIDTH` is a module-local constant, not a `measurements.ts` export.** It is a composition of `CALENDAR_CELL` with this call site's own chrome (16px of vendored padding + 2px of border), not a design-system measurement — and both of its consumers, the `Calendar` and the plate, are in that one file.
- **The 320px width assertion is `>= 24` (AA) plus the derived 38.57, not the plan's `>= 41`.** Finding 4 gives the arithmetic; the criterion's 41 is the UI-SPEC's own estimate of a control it did not measure.
- **`overflow-320.spec.ts`'s listing row already existed**; the plan asked for it to be added. What it needed was a stronger `tell` — `h1` proves the page rendered, not that the calendar did, and the calendar is the control that can break the floor.
- **`slot-picker.tsx`'s tooltip was DELETED**, which the plan permits ("resolve it or defer it explicitly"). No test asserted the tooltip (`tests/availability/` has no slot-picker file and no e2e case references it), so the change is covered by the same assertions as before plus the chips' widened `aria-label`.

**Total deviations:** 4 auto-fixed (three Rule 1, one Rule 2). **No new dependency, no migration, no change to booking/payment/capacity/availability logic, no money computation moved.**

## Issues Encountered

- **`npx playwright test --project=chromium` (full): 97 passed / 4 failed / 8 skipped / 5 did not run.** All four accounted for, none caused by this plan:
  - `public-listing.spec.ts:385` — the draft-404 **standing red** 12-08 proved survives a production build. Its `serial` scope accounts for the 5 that did not run.
  - `shell.spec.ts:289`, `price-one-fact.spec.ts:426`, `search-and-book.spec.ts:307` — the **cross-file DB-contention flakes** 12-02, 12-03, 12-05, 12-06, 12-07 and 12-08 have all logged. Targeted: `open-capacity + shell + search-and-book` → **28 passed** (byte-identical to 12-06's, 12-07's and 12-08's figure); `price-one-fact + hold-countdown + price-parity` → **8 passed** (identical to 12-06's and 12-08's).
  - The first full run also failed the two new AC#17 cases; that one WAS this plan's and is fixed — deviation 3, finding 6.
- **`price-parity.spec.ts` failed once inside a three-file invocation and passed alone** (`1 passed`) and in the re-run of the same group (`8 passed`). Same family; the CI-gated money spec is unmodified (`git diff --stat` empty) and its env surface is still `DATABASE_URL` only.
- **`npx tsc --noEmit` reported six syntax errors inside `.next/dev/types/routes.d.ts`** after the dev server was killed mid-write. A build artefact, not a source defect; `rm -rf .next/dev` clears it. Worth knowing because the errors name a file nobody wrote.
- **The local catalogue contains ZERO `open_capacity` listings** (`SELECT … WHERE occupancy_mode='open_capacity'` → 0 rows), which is why the drop-in calendar's identical 28px debt is logged rather than fixed: the change could not have been measured in a browser the way this one was.

## Threat register disposition

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-12-09-HITAREA | **mitigated, and the mitigation is what caught the real defect** | A rendered `boundingBox()` at 320/375/768/1280 in both themes asserting the literal 44 in its own expectation. The class review would have passed at 25.08px. The escape hatch was declared in advance and not needed |
| T-12-09-OVERFLOW | mitigated | `min-w-0` on the day button + a `max-w`-below-`md:` container, with `overflow-320.spec.ts`'s listing row now telling on the calendar. Watched red (i): `scrollWidth 342`, offenders naming the day buttons |
| T-12-09-A11YFILL | mitigated | Both plates carry `role="status"`, `aria-busy`, an `aria-label` AND an `sr-only` child, every bar `aria-hidden`; asserted by the jsdom render gate (19 tests) and declared in `live-regions.ts`. Watched red (f) |
| T-12-09-BOXDRIFT | mitigated | `CHIP_BASE` gained `min-w-20` in the same commit as the bars adopted `SLOT_CHIP_BOX`; the constant's hazard note is rewritten as discharged with the reason for a MINIMUM rather than a fixed width |
| T-12-09-MOTIONSHIFT | mitigated | Zero animations and zero structural transitions inside the calendar, with the preference off AND on, guarded by a retried caption change. Watched reds (g) and (h) |
| T-12-09-VENDORFORK | mitigated | `git diff --stat HEAD~3 HEAD -- src/components/ui/calendar.tsx` **empty**; the `classNames` escape hatch was measured to be unnecessary and `[&_td]:aspect-auto` was chosen over it to avoid restating six vendored classes |
| T-12-09-SC | mitigated | `git diff --stat HEAD~3 HEAD -- package.json` **empty**; zero packages installed |

## Known Stubs

None. The two skeletons render placeholder bars by construction, which is what a skeleton is — every one is `aria-hidden` and the loading state's meaning is carried by the named region beside them. No hardcoded empty value reaches a UI surface, no placeholder copy, no component receiving mock data. The day panel's new unavailable-reasons line is derived from the day's real slot states and renders nothing when there are none.

## Threat Flags

None. No new network endpoint, no new auth path, no new file-access pattern, no schema change. `drizzle/` is byte-identical at `0025_audit_resolved_by.sql` (26 `.sql` files; GATE-06's tripwire in `tests/design/infra.test.ts` green inside `npm run build`). GATE-05 untouched — this plan moved no money computation and added no money prop.

## Verification

| Check | Result |
|---|---|
| `npm run build` | **exit 0** — 41 design test files, 749 passed / 3 skipped, `✓ Compiled successfully`, 0 lint errors (9 pre-existing warnings) |
| `npx tsc --noEmit` | **exit 0** |
| `npm run test:design` | **41 files, 749 passed / 3 skipped** (was 740) |
| `npx vitest run --config vitest.design.config.ts tests/design/skeleton-a11y.test.tsx` | **19 passed** (was 10) |
| `npx vitest run --config vitest.design.config.ts tests/design/live-regions.test.tsx tests/design/selector-contract.test.ts` | **27 passed** |
| `npx vitest run tests/availability` | **174 passed / 19 files** |
| `npx playwright test e2e/calendar-hit-area.spec.ts --project=chromium` | **4 passed** (AC#14 ×2, AC#15 ×2) |
| `npx playwright test e2e/reduced-motion.spec.ts --project=chromium` | **4 passed** (2 shipped + AC#17 ×2) |
| `npx playwright test e2e/overflow-320.spec.ts --project=chromium` | **16 passed / 8 skipped** — the shipped figure, with the listing row now telling on the calendar |
| `npx playwright test e2e/availability.spec.ts --project=chromium` | **4 passed** |
| `npx playwright test e2e/price-parity.spec.ts --project=chromium` | **1 passed** (unmodified) |
| `npx playwright test --project=chromium` (full) | 97 passed / 4 failed / 8 skipped / 5 did not run — all four accounted for above |
| `npx playwright test e2e/open-capacity.spec.ts e2e/shell.spec.ts e2e/search-and-book.spec.ts` | **28 passed** — matches 12-06/12-07/12-08 exactly |
| `npx playwright test e2e/price-one-fact.spec.ts e2e/hold-countdown.spec.ts e2e/price-parity.spec.ts` | **8 passed** — matches 12-06/12-08 exactly |
| `git diff --stat HEAD~3 HEAD -- src/components/ui/calendar.tsx` | **empty** |
| `git diff --stat HEAD~3 HEAD -- package.json` | **empty** |
| `grep -n "destructive" slot-picker.tsx availability-calendar.tsx` | **no matches** (the token is described, never spelled) |
| `data-testid="skeleton-calendar"` occurrences in `src/` | **1**, a string literal, on the region itself |
| `grep -rln "components/ui/tooltip" src/components/{search,listing,availability,booking} src/app/listings` | **1** — `photo-uploader.tsx`, a host surface |
| `grep -n "min-w-20"` in `slot-picker.tsx` | present in `CHIP_BASE` |
| `ls drizzle/*.sql \| sort \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (26 files) |
| `grep -n "globalSetup\|setupFiles" vitest.design.config.ts` (comments excluded) | **no matches** |
| leftover `e2e_bk_*` seed rows after the run | **0 listings, 0 hosts** — the fixture's ordered teardown ran |
| port 3000 after the run | **clear** |

## Next Phase Readiness

- **12-10 (the RESP-02 booking sheet)** — `CalendarMonthSkeleton` is exported and is the plate a lazily-mounted calendar inside the sheet wants. Mounting it as the sheet's OWN busy region gets an announced one for free; its `live-regions.ts` row already names 12-10 as the surface that will. **The sheet also inherits the calendar's width**: `CALENDAR_GRID_WIDTH` is 326px at `md:` and above, and a sheet narrower than that will get the fluid cell rather than 44px. Measure it there — `e2e/calendar-hit-area.spec.ts`'s reader is reusable as-is.
- **12-11 (`e2e/mobile-booker-path.spec.ts`)** — the day cell is measured at 375px by this plan, so the mobile hit-area half of BFLOW-05 is closed. What is NOT measured is the slot chip: `SLOT_CHIP_BOX`'s `min-w-20` is asserted as a class string and by nothing rendered. One `boundingBox()` on a chip at 375 closes it, beside the mosaic and key-facts gaps 12-07 and 12-08 logged.
- **Anyone editing `availability-calendar.tsx`'s Calendar call site** — the four overrides interact and three of the four were found by measurement. Removing any one of them reddens `e2e/calendar-hit-area.spec.ts`, and the file's header says which number each mutation produces.
- **Anyone tempted to "tidy" the container width to `w-[…] max-w-full`** — that spelling overflows 320px by 22px and `min-w-0` does not save it. The mechanism is at the constant.
- **The drop-in calendar (`date-pass-picker.tsx`) is still 28 × 28** and its month read renders no loading state at all. Both are logged in `deferred-items.md` with the reason each was not fixed here (no seeded `open_capacity` row exists locally, so neither could be measured).
- **Visual baselines** — the `/listings/[id]` baselines 12-07 and 12-08 already marked stale are staler again: the calendar grew from 214px to 326px wide and from 297px to 409px tall, and the slot chips gained a minimum width. Still **not minted locally** (`updateSnapshots: "none"` unconditional, the `visual` project not created off Linux — D-28/D-29). Regenerate in the pinned Linux dispatch job.

**No blockers.**

## Self-Check: PASSED

- Files: `12-09-SUMMARY.md`, `e2e/calendar-hit-area.spec.ts`, `src/components/availability/availability-calendar.tsx`, `src/components/availability/slot-picker.tsx`, `src/app/listings/[id]/(detail)/loading.tsx`, `src/lib/design/selector-contract.ts`, `src/lib/design/live-regions.ts`, `src/lib/design/measurements.ts`, `tests/design/skeleton-a11y.test.tsx`, `e2e/reduced-motion.spec.ts`, `e2e/overflow-320.spec.ts`, `deferred-items.md` — **12/12 FOUND**
- Commits: `d74bb88`, `1486483`, `1fd7cbd` — **3/3 FOUND**
- Artifact `contains` checks: `skeleton-calendar` as a string literal in `availability-calendar.tsx`, exactly 1 occurrence in `src/` outside the contract ✓ · `boundingBox` in `e2e/calendar-hit-area.spec.ts` ✓ · `CALENDAR_CELL` linking `availability-calendar.tsx` → `measurements.ts`, on the Calendar root AND (via `SLOT_CHIP_BOX`) on both the shimmer and the real chip ✓
- Key links: `e2e/calendar-hit-area.spec.ts` → `availability-calendar.tsx` via a rendered `boundingBox()` on a real seeded listing route at four widths ✓

---
*Phase: 12-booker-path-search-listing-checkout*
*Completed: 2026-08-18*
