---
phase: 12-booker-path-search-listing-checkout
plan: 10
subsystem: ui
tags: [resp-02, d-48, d-59, sticky-bar, responsive-dialog, portal, a11y, role-queries, gate-05, playwright]

# Dependency graph
requires:
  - phase: 12-booker-path-search-listing-checkout
    plan: 01
    provides: "STICKY_BAR_HEIGHT and STICKY_BAR_CLEARANCE — the bar's only two numbers, both consumed here for the first time"
  - phase: 12-booker-path-search-listing-checkout
    plan: 02
    provides: "seam A — the provider that owns day/dayAvail/selectDay above every placement, which is what makes 'two views, one fetch' a construction rather than a hope"
  - phase: 12-booker-path-search-listing-checkout
    plan: 04
    provides: "PriceBreakdown's `surface` union and the string-literal total hooks this plan widened to three"
  - phase: 12-booker-path-search-listing-checkout
    plan: 05
    provides: "the rail's real PriceBreakdown, e2e/price-one-fact.spec.ts, and the AST zero-arithmetic scan over availability-calendar.tsx"
  - phase: 12-booker-path-search-listing-checkout
    plan: 07
    provides: "the measured Radix focus-restore defect — Radix suppresses the browser's restore to focus a trigger it may not have. This plan met the SECOND shape of it: a trigger that unmounts while the dialog is open"
  - phase: 12-booker-path-search-listing-checkout
    plan: 09
    provides: "CALENDAR_GRID_WIDTH's definite 326px, which is the measurement that decided what `placement` may render"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "patterns/responsive-dialog.tsx (the one overlay primitive), selector-contract.ts's bidirectional compile gate, elevation-z.test.ts's per-file inventories, sheet-absent.test.ts"
provides:
  - "BookingPanel — one stateless component, two placements, `hidden` as the mechanism, `data-testid=\"booking-panel\"`"
  - "booking-sticky-bar.tsx — RESP-02's 64px bar, shadow-sticky's FIRST product call site, a 44px brand action, two states"
  - "selectionHours / selectedAllInParts / selectedTotalLabel — ONE lookup and ONE format for the booker's total, which is what makes byte-equality structural"
  - "PriceBreakdown's third surface (`sheet`) and `sheet-price-total`"
  - "ResponsiveDialog's `closeLabel` and `onCloseAutoFocus` — both additive, both with the measured reason at the prop"
  - "BookCta's `label` and `bar` layout — the bar submits through the SAME action, not a second path"
  - "e2e/mobile-booker-path.spec.ts — 6 cases, both themes, at 375 / 320×568 / 1280"
  - "overflow-320's thirteenth row: /listings/[id] WITH THE SHEET OPEN, and a `RouteRow.open` hook for it"
  - "price-one-fact's one-hook-per-placement case, measured on ONE document at two widths"
  - "openBookingSheet — the shared, RETRIED opener, with the detach measurement at the helper"
affects: [12-11, 12-12, 12-13, 12-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A duplicated subtree made safe by `hidden` and asserted with ROLE queries — a testid count is green against the very defect the assertion exists for"
    - "One exported lookup+format function consumed by every surface that renders a figure, so byte-equality is a property of the call rather than of two surfaces being kept in step"
    - "A conditional `trigger` on an always-mounted overlay: unmounting the dialog with the trigger would slam the sheet shut on the tap that revealed the price"
    - "A `RouteRow.open` hook, so a route-table harness can measure a state that only exists after an interaction"
    - "A retried click for any server-rendered control that React replaces mid-route — the event is lost, not queued"

key-files:
  created:
    - "src/components/availability/booking-panel.tsx"
    - "src/components/booking/booking-sticky-bar.tsx"
    - "e2e/mobile-booker-path.spec.ts"
  modified:
    - "src/components/availability/availability-calendar.tsx"
    - "src/components/booking/price-breakdown.tsx"
    - "src/components/booking/book-cta.tsx"
    - "src/components/patterns/responsive-dialog.tsx"
    - "src/app/listings/[id]/(detail)/page.tsx"
    - "src/lib/design/selector-contract.ts"
    - "tests/design/elevation-z.test.ts"
    - "tests/design/brand-recipe.test.ts"
    - "e2e/helpers/booker-seed.ts"
    - "e2e/overflow-320.spec.ts"
    - "e2e/price-one-fact.spec.ts"
    - ".planning/phases/12-booker-path-search-listing-checkout/deferred-items.md"

key-decisions:
  - "`placement` gates the MONTH GRID, which the plan's letter forbids, and the measurement is the reason: CALENDAR_GRID_WIDTH is a definite 326px at `md:` and up while the rail's content box is 360 − 48 = 312px. Rendering the grid in the rail placement overflows the panel at every desktop width, deletes the main-column Availability section BFLOW-02's own order names, and reddens `e2e/calendar-hit-area.spec.ts` at 1280. The desktop copy is not one DOM subtree and structurally cannot be."
  - "The bar's selection action IS `BookCta` in a `bar` layout, not a second control wired to the same server action. That keeps one guard, one sign-in redirect, one `activate-booking` recovery and — decisively — ONE `role=\"status\"` in a file GATE-03 already declares, where a new component would have needed a tenth declared file and a rename of `DeclaredFileCountIsNine`."
  - "The sheet is opened through `ResponsiveDialog`'s `trigger` slot rather than programmatically, because 12-07 measured what a missing `DialogTrigger` costs. The overlay is rendered UNCONDITIONALLY and only the trigger is conditional — rendering the dialog behind the same condition would unmount the open sheet the instant a window was picked in it."
  - "The sticky bar consults ONLY the exclusive selection channel. `date-pass-picker.tsx` seeds `{today, 1 pass}` from a mount effect, so reading `openSelection` put an unearned amount on the money path AND removed the only affordance that opens the sheet on every drop-in listing. Found by a gate, not by review."
  - "12-UI-SPEC's literal `/^Book/` regex is CORRECTED rather than obeyed: it collects `slot-picker.tsx`'s `Book full day`, a shipped selection affordance that places no hold. The CTA family is named explicitly and the full-day control gets its own `=== 1` beside it — strictly stronger than the spec's wording."
  - "`e2e/helpers/booker-seed.ts`'s `placeHold` now addresses the hold-CTA FAMILY. `Book this space` resolves to zero below `lg:` now, and `hold-countdown.spec.ts` mints its hold at 375px — 'the whole booker path in one call' cannot mean 'above 1024px only'."

patterns-established:
  - "When a duplication is asserted by counting controls, the count must use role queries: `hidden` is the mechanism that makes the duplication safe, and a testid query cannot see it working or failing"
  - "A figure rendered on two surfaces gets ONE exported producer, not two call sites that agree — the divergence a review misses is the last centavo"
  - "A route-table harness that measures only what a `goto` produces cannot see a portal; give the row an interaction rather than giving the portal a route"

requirements-completed: [RESP-02]

# Metrics
duration: 118min
completed: 2026-08-18
---

# Phase 12 Plan 10: One Panel, Two Placements, and the Bar That Could Not Open Its Own Sheet — Summary

**RESP-02 ships as a 64px bar carrying a price and a 44px action at `scrollY === 0`, with the whole booking rail behind it in the app's one overlay primitive — and the gate written to prove it caught two real defects on its first two runs: a drop-in listing rendered the bar's selection state before the booker had touched anything, which made the sheet structurally unreachable on an entire class of listing; and the shared `placeHold` fixture addressed a CTA that no longer exists below `lg:`, which reddened a spec this plan never opened.**

## Performance

- **Duration:** ~118 min (18:55 → 20:53)
- **Tasks:** 3
- **Files:** 3 created, 12 modified

## Task Commits

1. **Task 1: Extract BookingPanel and give it two placements** — `8bf5526` (feat)
2. **Task 2: The sticky bottom bar, and the sheet's own price hook** — `f5d9fc4` (feat)
3. **Task 3: The mobile viewport gate** — `657b1cc` (test)

## The measured findings

### 1. `placement` had to gate the month grid, and the number that decided it is 312 against 326

The plan says `placement` selects "which `PriceBreakdown` surface to render and which CTA layout to use — never to fetch, never to compute", and describes the panel as holding the calendar. Taken literally the rail placement renders the month grid inside the 360px rail. Measured before deviating:

```
CALENDAR_GRID_WIDTH  = w-full max-w-[calc(7*var(--cell-size)+18px)] md:w-[calc(…)]   → 326px definite at md:+
the rail's content box = 360 (the lg: track) − 48 (PanelCard's p-4 sm:p-6)           → 312px
```

Three things break at once, and none of them is cosmetic: the grid overflows the panel by 14px at every desktop width; the main-column `Availability` section BFLOW-02's own order names disappears (the UI-SPEC lists "shipping the calendar only in the sheet at every width" among its *rejected* options, for exactly that reason); and `e2e/calendar-hit-area.spec.ts` measures that grid's 44px cells on this route at four widths, in the main column.

So `placement` names the ARRANGEMENT: `rail` is the summary and the CTA, `sheet` is the month grid, the slot chips, the same summary and the same CTA in one overlay. It still never decides what to fetch and never decides what a figure is. **The alternative was measured, not assumed** — and the derivation is written at the component, because the next reader will reach for the same "obvious" simplification.

### 2. The drop-in bar had no way to open its own sheet, and a gate found it on a listing nobody chose

`e2e/overflow-320.spec.ts`'s new sheet-open row discovers its listing from the running catalogue. In the full-suite run it landed on `E2E Same-Day Drop-In Dance Loft` — a seeded `open_capacity` row — and failed in **both themes**, twice, with the trigger resolving to **0 elements over 33 polls**. Playwright's page snapshot is what named the mode.

**The mechanism.** `date-pass-picker.tsx:227-234` writes `{date: today, passes: 1}` into the shared selection context from a `useEffect` **on mount**. So on any drop-in listing `openSelection` is non-null before the booker has touched anything, and a bar that reads it is in its `Book · {total}` state on first paint. That cost two things at once:

1. the primary action on the money path named an **amount the booker never chose**; and
2. `Check availability` — the only affordance that opens the sheet — never rendered, so **RESP-02's overlay was structurally unreachable on every drop-in listing**.

The fix reads the exclusive channel only, with the argument at the code: D-59 #3 says *"with a selection ALREADY MADE"*, and a default written by an effect is not one. The drop-in booker gets the sheet, where the pass picker they would be choosing with is actually in front of them. The residual — one extra tap on that path, and the upstream fix that would remove it — is logged in `deferred-items.md`.

**This is the finding that justifies the harness shape.** A spec that named a seeded listing would never have met a drop-in row; the discovery-from-catalogue design that `overflow-320.spec.ts` adopted for its own reasons is what put a mode this plan's fixture cannot produce in front of the assertion.

### 3. The shared fixture's `Book this space` stopped existing below `lg:` — and the spec that noticed is not this plan's

`e2e/hold-countdown.spec.ts` sweeps 375 / 768 / 1280 and sets **375px before minting its hold**, through `booker-seed.ts`'s `placeHold`. With the rail now `max-lg:hidden`, that helper's `getByRole("button", { name: "Book this space" })` resolves to zero:

```
Error: expect(locator).toBeEnabled() failed
Locator: getByRole('button', { name: 'Book this space' })
Error: element(s) not found
```

The helper's own docstring calls it *"the whole booker path in one call"*, and a booker path that only exists above 1024px is not one. It now addresses the hold-CTA **family** (`Book this space` or `Book · {total}`), which is safe precisely because RESP-02 asserts what it depends on — case (c) pins **exactly one** reachable hold CTA at 375 and at 1280. A pleasant consequence: `hold-countdown.spec.ts` now mints its hold **through the sticky bar's own submission path**, so `BookCta`'s `bar` layout is exercised end-to-end by a spec that is not this plan's.

### 4. Radix's focus-restore defect has a second shape, and this plan met it

12-07's finding 1 is a dialog with no `DialogTrigger`. This bar has one — and it **unmounts while the sheet is open**: a booker who opens the sheet with nothing selected and picks a window inside it flips the bar into its `Book · {total}` state, which removes the trigger. At that moment `triggerRef.current` points at a node no longer in the document, Radix's `preventDefault()` still stands, and focus would land on `<body>`.

`ResponsiveDialog` gained an `onCloseAutoFocus` passthrough with the mechanism at the prop, and the bar supplies a handler that focuses whichever button its action slot currently holds — the trigger when it is there, the Book action when it has replaced it. It returns **without** calling `preventDefault()` when there is nothing to focus, because taking that decision over unconditionally would be a claim the file has no basis for (12-07's own rule).

The other half of the same hazard was avoided by construction: `ResponsiveDialog` is rendered **unconditionally** and only its `trigger` is conditional. Rendering the overlay behind the same condition would have unmounted the open sheet the instant the booker picked a window in it — the sheet slamming shut on the tap that was supposed to reveal the price.

### 5. 12-UI-SPEC's `/^Book/` collects a control that places no hold

Measured on the first run of `mobile-booker-path.spec.ts`, against a correct tree:

```
found: "Book full day" / "Book · ₱993.99"
Expected: 1   Received: 2
```

`Book full day` is `slot-picker.tsx:404`'s D-23 selector — it picks the whole operating day and places no hold. Making it disappear to satisfy a count would be deleting a booker control to make a gate green. The regex names the two hold-CTA labels instead, **and the full-day control gets its own `=== 1` beside it**, which is stronger than the spec's wording: the duplication hazard applies to that control exactly as much as it applies to the CTA, and a narrowed regex alone would have hidden it.

### 6. A server-rendered trigger is clickable before React has finished with the route — again

The sheet-open row's *first* failure mode (before finding 2) was not an absent trigger but a disappearing one:

```
- locator resolved to <button … data-slot="dialog-trigger">Check availability</button>
- attempting click action
  - waiting for element to be visible, enabled and stable
  - element is not stable
- retrying click action
- element was detached from the DOM, retrying
```

Passed every isolated invocation, failed the first whole-suite run in both themes. This is 12-09's finding 6 in a second shape — the click lands on a detaching node and the event is **lost, not queued**, so polling afterwards would hang until the test timeout on a page with nothing wrong with it. `openBookingSheet` retries the click inside `expect.poll`, in ONE place used by all three specs, with the call log recorded at the helper.

## Watched reds (both run, both reverted, tree clean after each)

| # | Gate | Mutation | Observed |
|---|---|---|---|
| A | `mobile-booker-path` case (c) | `max-lg:hidden` removed from the rail `<aside>` | **1 failed / 5 did not run** — *"the document holds 2 reachable hold CTAs"*, printing `"Book this space" / "Book · ₱993.99"`. The first name is the rail's shipped CTA and therefore names the placement that failed to leave |
| B | `mobile-booker-path` case (d) | a one-centavo divergence in the bar's amount (the signature of a `space + fee` sum or a multiplied per-hour rate) | **1 failed** — `bar "₱993.97"` vs `sheet "₱993.99"`, with Playwright highlighting the differing character. A numeric tolerance wide enough not to flake cannot see this |

⚠ **"5 did not run" in A is `mode: "serial"`, not a blind spot** — the remaining cases are exercised by every green run. Both reverted → **6 passed**.

Probe B is written as a string edit rather than as real arithmetic, and the reason is recorded: the honest version needs money identifiers `booking-sticky-bar.tsx` deliberately does not import, so the probe would have been testing whether the file compiles rather than whether the gate can fail.

## Accomplishments

- **RESP-02's four measurements are all green in both themes.** The bar is 64px with its bottom edge on the viewport's at `scrollY === 0` and a ≥44×44 action; `Book`-family CTAs count **1** at 375 and **1** at 1280 by ROLE query; a day selection issues **exactly one** availability request at both widths; and neither bar line wraps at 320px, measured against each element's own resolved `line-height` rather than a literal.
- **Byte-equality is a construction.** `selectedTotalLabel` is one lookup in the server-built table plus the same `formatMoney` call `PriceBreakdown`'s `Total` makes. The bar performs no arithmetic on any money value and imports no money identifier at all.
- **The sheet works at 320×568, which is the case it exists for.** Its content overflows (asserted, as the vacuity guard) and the pinned action is still inside the viewport after the scroll container is driven to the bottom.
- **`ui/sheet.tsx` still does not exist**, `Z_SHEET_INVENTORY` is still asserted empty, `git diff --stat HEAD~3 HEAD -- package.json` is **empty**, and `grep -rn "useMediaQuery\|matchMedia"` over the three booker directories returns nothing.
- **Three inventories moved with the code, each with its reason at the row:** `shadow-sticky` gained its first product call site (12 → 13 named elevation sites), `z-(--z-sticky)` went 11 → 12, and the brand variant 20 → 21. The `--z-sheet` zero is untouched, and the bar's `z-(--z-sticky)` row says why the step that looks made for this is the wrong one.
- **`npm run build` and `npx tsc --noEmit` both exit 0**; `npx vitest run` is **1275 passed / 4 skipped across 139 files**; `npm run test:design` is **41 files, 749 passed**.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing correctness] The drop-in bar rendered no sheet trigger at all**

- **Found during:** Task 3, the first full-suite run of the new `overflow-320` row. Full analysis in finding 2.
- **Issue:** `date-pass-picker.tsx` seeds a selection from a mount effect, so on every `open_capacity` listing the bar opened in its `Book · {total}` state — an unearned amount on the money path, and RESP-02's overlay unreachable.
- **Fix:** the bar consults the exclusive selection channel only, with the measurement, the symptom and both costs written at the code.
- **Files:** `src/components/booking/booking-sticky-bar.tsx`
- **Committed in:** `657b1cc`

**2. [Rule 1 - Bug] `booker-seed.ts`'s `placeHold` addressed a CTA that no longer exists below `lg:`**

- **Found during:** Task 3, running `hold-countdown.spec.ts` after the full suite flagged it. Full analysis in finding 3.
- **Issue:** that spec mints its hold at **375px**, where the rail is now `max-lg:hidden`; `Book this space` resolved to zero elements.
- **Fix:** the shared helper addresses the hold-CTA family, which is safe because case (c) pins it at exactly one per width.
- **Files:** `e2e/helpers/booker-seed.ts`
- **Committed in:** `657b1cc`

**3. [Rule 1 - Bug] The sheet-open row's click raced React finishing with the route**

- **Found during:** Task 3, the first full-suite run. Full analysis in finding 6.
- **Fix:** `openBookingSheet` retries the click inside `expect.poll`, in one place used by all three specs, with Playwright's own call log recorded at the helper.
- **Files:** `e2e/helpers/booker-seed.ts`, and the three specs routed through it
- **Committed in:** `657b1cc`

**4. [Rule 3 - Blocking] `placement` gates the month grid**

- **Found during:** Task 1, before writing it — the rail's content box and `CALENDAR_GRID_WIDTH` were measured against each other rather than assumed. Full analysis in finding 1.
- **Fix:** `placement` selects the arrangement; the main column keeps the grid at every width, unchanged, where `calendar-hit-area.spec.ts` measures it.
- **Files:** `src/components/availability/booking-panel.tsx` (the derivation is its header)
- **Committed in:** `8bf5526`

### Scope adjustments recorded rather than absorbed

- **`price-breakdown.tsx` and `sheet-price-total` landed in Task 1, not Task 2.** `BookingPanel`'s `placement` maps to a `PriceBreakdown` `surface`, so the union has to be widened in the same commit or Task 1 does not typecheck. The testid row and its string literal are in that commit together, as the bidirectional gate requires.
- **Four files outside `files_modified` were edited, each because an acceptance criterion or a gate required it:** `book-cta.tsx` (the `label` and the `bar` layout — "submits through the SAME path `BookCta` uses" is unsatisfiable otherwise), `patterns/responsive-dialog.tsx` (`closeLabel` for the mandated `Close booking`, and `onCloseAutoFocus` for finding 4), `tests/design/elevation-z.test.ts` and `tests/design/brand-recipe.test.ts` (three per-file inventories the new bar moves).
- **`e2e/helpers/booker-seed.ts` is outside `files_modified`** and gained `selectTargetDayIn` (the same day math, taking a scope, so the sheet's month grid can be driven without the main column's satisfying a CSS locator), `openBookingSheet`, and the `placeHold` fix.
- **`overflow-320.spec.ts`'s route table gained an `open` hook.** The sheet is a portal: a row that only measures what a `goto` produces cannot see it. The hook exists for one row and the note says so.
- **The rail `<aside>` is `max-lg:hidden` and nothing is lost at those widths** — checked rather than assumed: capacity is `KeyFacts`' own cell in the main column, the cancellation policy is the main-column section D-46 requires *because* there is no rail on a phone, and the all-in rate is the bar's left column.
- **The `main` container's clearance is unconditional** rather than `lg:pb-0`: 80px of trailing space on a desktop page is invisible and a breakpoint there is one more thing to keep true.

**Total deviations:** 4 auto-fixed (two Rule 1, one Rule 2, one Rule 3). **No new dependency, no migration, no change to booking/payment/capacity/availability logic, and no money computation moved.**

## Issues Encountered

- **`npx playwright test --project=chromium` (full): 109 passed / 2 failed / 8 skipped / 4 did not run.** Both failures accounted for, neither caused by this plan:
  - `public-listing.spec.ts:385` — the **draft-404 standing red** 12-02 measured at `6272c8f` and 12-08 proved survives a production build. Its `serial` scope accounts for the 4 that did not run.
  - `shell.spec.ts:558` — the **cross-file contention flake**, this time landing inside `openSeededListing`'s Radix category select (`intercepts pointer events`, then `element was detached from the DOM`). Targeted: `open-capacity + shell + search-and-book` → **28 passed**, byte-identical to the figure 12-06, 12-07, 12-08 and 12-09 all recorded. Logged to `deferred-items.md` because the failure now reads like a helper defect.
- **`mobile-booker-path.spec.ts`'s grove 320px case failed once** in a three-file invocation and passed on the immediate re-run, in the full suite, and in a four-file invocation with `calendar-hit-area.spec.ts`. Not diagnosed — the output was not captured — so it is recorded rather than explained. Hardened anyway: the sheet's month grid is now asserted present before the overflow and reachability measurements, which is also the vacuity guard those two assertions were missing (an empty overlay neither overflows nor scrolls).
- **`npx tsc --noEmit` reported five syntax errors inside `.next/dev/types/`** while Playwright's dev server was running — the generated-file artefact 12-07 and 12-09 both recorded. Killing the server and deleting `.next/dev/types` clears it; `tsc` and `npm run build` then both exit 0.
- **`src/app/listings/[id]/(detail)/page.tsx` shows as modified with an EMPTY diff** — the line-ending artefact 12-06/12-07 recorded, produced here by a `sed` edit during watched red A. Not staged, content verified identical.

## Threat register disposition

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-12-10-DUPCONTROL | **mitigated, and the mitigation was watched failing** | `hidden` on both placements; case (c) counts the hold-CTA family with a ROLE query at 375 and 1280 and prints every match by name. Watched red A. The `Book full day` control gets the same `=== 1` beside it (finding 5) |
| T-12-10-BARPRICE | mitigated | The bar imports no money identifier and performs no arithmetic; its amount is `selectedTotalLabel`, the same lookup and the same `formatMoney` call the sheet's `Total` makes. Watched red B fails on a one-centavo byte difference |
| T-12-10-DOUBLEHOLD | mitigated | The bar's action IS `BookCta` in a different box — one action, one guard, one server ruling, one `role="status"`. `hold-countdown.spec.ts` now mints its hold through that very path at 375px |
| T-12-10-DOUBLEFETCH | mitigated | `BookingPanel` declares no state hook; case (e) counts server-action requests by header at both widths and asserts `.toBe(1)` with the message naming why `>= 1` would be green for the defect |
| T-12-10-CLOSEAMBIG | mitigated | `closeLabel="Close booking"` on the sheet against the lightbox's `Close photos`; the vendored `Close` is replaced rather than duplicated, and the DS-05 focus recipe still arrives through `Button` |
| T-12-10-CLEARANCE | mitigated | `STICKY_BAR_CLEARANCE` on the page container; case (f) drives the sheet's scroll container to the bottom at 320×568 and asserts the pinned action is still inside the viewport, after asserting that it genuinely overflowed |
| T-12-10-SC | mitigated | `git diff --stat HEAD~3 HEAD -- package.json` **empty**; `src/components/ui/sheet.tsx` absent; `sheet-absent.test.ts` green including its gesture-library scan; `Z_SHEET_INVENTORY` still empty; no `useMediaQuery` anywhere |

## Known Stubs

None. Every figure the bar and the sheet render is a server-computed lookup — the rate strings from the `server-only` `allInRateParts`, the total from `buildAllInTable` — and both placements render the same real `PriceBreakdown`. The bar's `Price on request` fallback is the shipped behaviour for a listing that quotes no rate, not a placeholder. No hardcoded empty value reaches a UI surface and no component receives mock data.

## Threat Flags

None. No new network endpoint, no new auth path, no new file-access pattern, no schema change. `drizzle/` is byte-identical at `0025_audit_resolved_by.sql` (26 `.sql` files; GATE-06's tripwire green inside `npm run build`). GATE-05 untouched: no money computation moved, and the one new money-bearing surface receives finished figures and formats one of them.

## Verification

| Check | Result |
|---|---|
| `npm run build` | **exit 0** — 41 design test files, 749 passed / 3 skipped, `✓ Compiled successfully`, 0 lint errors (9 pre-existing warnings) |
| `npx tsc --noEmit` | **exit 0** (after clearing `.next/dev/types` — see Issues) |
| `npm run test:design` | **41 files, 749 passed / 3 skipped** |
| `npx vitest run` (whole suite) | **1275 passed / 4 skipped, 139 files** |
| `npx playwright test e2e/mobile-booker-path.spec.ts` | **6 passed** (3 cases × court + grove) |
| `npx playwright test mobile-booker-path + overflow-320 + price-one-fact + calendar-hit-area` | **32 passed / 8 skipped** |
| `npx playwright test e2e/overflow-320.spec.ts` | **18 passed / 8 skipped** (was 16 — the sheet-open row in both themes) |
| `npx playwright test e2e/hold-countdown.spec.ts` | **4 passed** — now minting its hold through the sticky bar |
| `npx playwright test --project=chromium` (full) | 109 passed / 2 failed / 8 skipped / 4 did not run — both failures accounted for above |
| `npx playwright test open-capacity + shell + search-and-book` | **28 passed** — matches 12-06/12-07/12-08/12-09 exactly |
| `data-testid="booking-panel"` / `"booking-sticky-bar"` / `"sheet-price-total"` in `src/` | **exactly 1 each**, all string literals |
| `grep -n "useState\|useReducer" src/components/availability/booking-panel.tsx` | **no matches** (the hook names are described, never spelled — the tripwire rule) |
| `grep -rn "useMediaQuery\|matchMedia" src/components/availability src/components/booking src/app/listings` | **no matches** |
| `shadow-sticky` class call sites under `src/components/` + `src/app/` | **1 product surface** (`booking-sticky-bar.tsx`) + `/dev/theme`'s ladder row + the token declaration in `globals.css` |
| `src/components/ui/sheet.tsx` | **absent** |
| `git diff --stat HEAD~3 HEAD -- package.json` | **empty** |
| `ls drizzle/*.sql \| sort \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (26 files) |
| `getByRole` / `getByLabel` occurrences in `e2e/` | **176 / 39** — both above the D-32 floors of 92 / 30 |
| `grep -n "globalSetup\|setupFiles" vitest.design.config.ts` (code) | **no matches** — the 2 hits are prose explaining their absence |
| port 3000 after the run | **clear** (no LISTENING socket) |

## Next Phase Readiness

- **12-11 (the checkout bar)** — `shadow-sticky` is at **two** files now (`/dev/theme` + this bar) and `SHADOW_STICKY_INVENTORY` is pinned with `toEqual`; the checkout bar is the third row and moves the named-step total from 13 to 14. `z-(--z-sticky)` is at 12 and moves to 13. Both maps say at the row which addition was which. `STICKY_BAR_HEIGHT` / `STICKY_BAR_CLEARANCE` are proven on a real surface, and `BookCta`'s `bar` layout is the shape a second bar's action can reuse.
- **12-12 and 12-13 (GATE-03's file count)** — `DeclaredFileCountIsNine` is **untouched**: this plan added no live region, because the bar's refusal notice is `BookCta`'s already-declared one. The rename ladder the module's header predicts (Ten in 12-12, Eleven in 12-13) is still correct.
- **12-13 (STATE-07's collision)** — the collision notice must not be mounted beside `book-cta-notice`, and `BookCta` is now mounted up to **three** times on `/listings/[id]`. Only one of those is ever reachable (the other placements are `display:none` or unmounted), but `e2e/collision-in-place.spec.ts`'s rule-6 assertion should count on the rendered document rather than on the source.
- **Anyone threading `resumeWindow` / `resumeOpen`** — they go to the RAIL placement and nowhere else. `BookCta` auto-submits a restored selection once on mount, and it is now mounted up to three times; a second set would place two holds for one return from `/login`. The reason is at both call sites.
- **Anyone editing `date-pass-picker.tsx`** — distinguishing a seeded default from a booker's choice is the upstream fix for finding 2, and it is what would give the drop-in path D-59 #3's one-tap shortcut back. `deferred-items.md` states the shape.
- **Visual baselines** — the three that include `/listings/[id]` are staler again: the rail leaves the page below `lg:`, a fixed bar arrives, and the container gained 80px of bottom clearance. Still **not minted locally** (`updateSnapshots: "none"` unconditional, the `visual` project not created off Linux — D-28/D-29). Regenerate in the pinned Linux dispatch job.

**No blockers.** Two pre-existing reds remain logged (`public-listing.spec.ts`'s draft-404 status code, and the cross-file contention flake); neither was introduced or aggravated here.

## Self-Check: PASSED

- Files: `12-10-SUMMARY.md`, `src/components/availability/booking-panel.tsx`, `src/components/booking/booking-sticky-bar.tsx`, `e2e/mobile-booker-path.spec.ts`, `src/components/availability/availability-calendar.tsx`, `src/components/booking/price-breakdown.tsx`, `src/components/booking/book-cta.tsx`, `src/components/patterns/responsive-dialog.tsx`, `src/app/listings/[id]/(detail)/page.tsx`, `src/lib/design/selector-contract.ts`, `tests/design/elevation-z.test.ts`, `tests/design/brand-recipe.test.ts`, `e2e/helpers/booker-seed.ts`, `e2e/overflow-320.spec.ts`, `e2e/price-one-fact.spec.ts`, `deferred-items.md` — **16/16 FOUND**
- Commits: `8bf5526`, `f5d9fc4`, `657b1cc` — **3/3 FOUND**
- Artifact `contains` checks: `booking-panel` string literal in `booking-panel.tsx` ✓ · `booking-sticky-bar` string literal in `booking-sticky-bar.tsx` ✓ · `sheet-price-total` string literal in `price-breakdown.tsx` ✓ · all three declared in `SELECTOR_CONTRACT` with `owner: "12-10"` ✓
- Key links: `(detail)/page.tsx` → `booking-panel.tsx` via two placements (`max-lg:hidden` on the rail `<aside>`, `lg:hidden` on the sheet's wrapper) inside ONE `BookingSelectionProvider` ✓ · `booking-sticky-bar.tsx` → `patterns/responsive-dialog.tsx` via the no-selection action's `trigger` slot ✓

---
*Phase: 12-booker-path-search-listing-checkout*
*Completed: 2026-08-18*
