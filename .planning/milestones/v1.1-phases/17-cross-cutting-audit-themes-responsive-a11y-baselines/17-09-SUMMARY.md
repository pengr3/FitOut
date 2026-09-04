---
phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
plan: 09
subsystem: testing
tags: [playwright, e2e, responsive, resp-04, data-testid, accessibility-tree, landmark, matchmedia]

# Dependency graph
requires:
  - phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
    provides: "17-03's tests/design/one-tree.test.ts (the AC#10/AC#11 source gate) and the two structural container ids — search-results-region and availability-calendar — without which AC#12 could not be ASKED of the search and calendar surfaces"
  - phase: 12-booking-flow
    provides: "RESP-02's one booking panel in two placements (rail + portal sheet), and e2e/helpers/booker-seed.ts's seedBookableListing / signUpBooker / placeHold"
  - phase: 14-host-flows
    provides: "usePublishChecklistPlacement — the one sanctioned matchMedia call site whose one-instance property this plan proves"
provides:
  - "e2e/one-tree.spec.ts — RESP-04's rendered half: AC#12's one-instance-in-document count per surface family at 320/768/1280, and AC#13's navigation-landmark table with the hidden mechanism asserted through the accessibility tree"
  - "A per-route landmark table with MEASURED counts (0, 1 and 2 all occur and all are correct), replacing AC#13's blanket 'exactly 1' with a declaration plus a reason"
  - "Proof that the sanctioned matchMedia exception CHOOSES one node — the placement flips across the 64rem boundary while the container count stays 1"
  - "Two named container-id gaps, measured and routed: the open_capacity calendar fork and the mobile row-card stack"
affects: [17-13, 17-verification, resp-04, deferred-items]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Count over the DOCUMENT, never over what is painted — and prove the file cannot regress by making `toBeVisible` a zero-count grep on itself"
    - "Guard-the-guard by POLLING both counters to a settled state: a settled locator count compared against a one-shot DOM sample reports a hydration race as a library bug"
    - "Declare the measured number per route with its reason, rather than asserting a criterion's headline number against routes where it is false"
    - "Watch reds by INJECTION from the spec (page.evaluate), never by editing the shell the assertion is about"

key-files:
  created:
    - e2e/one-tree.spec.ts
  modified:
    - .planning/phases/17-cross-cutting-audit-themes-responsive-a11y-baselines/deferred-items.md

key-decisions:
  - "AC#13 is asserted as a DECLARED COUNT PER ROUTE, not as a blanket toHaveCount(1): measured on this tree the landmark count is 0 on `/` and `/profile`, 1 on `/listings/[id]`, `/bookings` and `/host`, and 2 on `/host/bookings` — a blanket 1 would have been red against five correct routes and found a defect on none"
  - "The listing rows drive a SEEDED `exclusive` listing rather than `firstListingPath`'s discovered one, because `AvailabilityCalendar` forks on occupancy mode and a discovered listing makes the calendar row's SUBJECT depend on the seed (observed: 1 red in 3 full runs)"
  - "The raw `document.querySelectorAll` guard is POLLED to a settled value rather than sampled once — a one-shot sample compared against a retrying locator reported a mid-hydration race as locator filtering, which is a message that sends the reader to the wrong place"
  - "The open_capacity calendar fork is a NAMED SKIP, not a src fix: hanging the id on the fragment means adding a wrapper element to a surface whose own comment records choosing a fragment deliberately"
  - "All five watched reds were produced by injection from the spec; `site-chrome.tsx` was never edited (T-17-47, D-04 is on the must-not-be-reversed list)"

patterns-established:
  - "Pattern: a mandatory `skip` that THROWS its reason into the run's output, plus a set-equality test over the declared family tuple, so 'zero silent absences' is mechanical rather than promised"
  - "Pattern: a `tell` that is never the id being counted — a tell that is the counted id proves nothing the count does not already prove"
  - "Pattern: assert the MECHANISM beside the outcome — the inactive nav placement's absence from the accessibility tree is a `hidden` claim made without naming a class"

requirements-completed: []  # RESP-04 ADVANCED, not closed — see "Requirements" below

# Metrics
duration: 3h 40m (wall clock, including an API interruption)
completed: 2026-08-29
---

# Phase 17 Plan 09: RESP-04's Rendered Half Summary

**A Playwright gate that counts every named surface's identifying container IN THE DOCUMENT at 320, 768 and 1280 — never "1 visible", which is the assertion a forked mobile/desktop variant passes — proves the one sanctioned `matchMedia` call site chooses a node rather than drawing two, and replaces AC#13's blanket "exactly one navigation landmark" with the six-route table the tree actually measures.**

## Performance

- **Duration:** 3h 40m wall clock (includes an API interruption; see "Issues Encountered")
- **Started:** 2026-08-29T12:03:27Z
- **Completed:** 2026-08-29T15:43:44Z
- **Tasks:** 2
- **Files modified:** 1 created (`e2e/one-tree.spec.ts`, 1,600 lines), 1 phase doc appended

## Accomplishments

- **`e2e/one-tree.spec.ts` — 22 cases (20 measured, 2 named skips), green on four consecutive full runs.** AC#12 counts nine declared containers across the six named families at three widths from three FRESH navigations each; AC#13 measures six routes at 320 and 1280.
- **The file cannot regress into a visibility assertion.** `grep -c 'toBeVisible'` returns `0` and the plan's own acceptance criterion greps for it. That is not stylistic: the failure RESP-04 exists to catch is a page where one copy is painted and the other is not, so an assertion phrased as "the one the user can see is there" is GREEN on the defect. Watched: an injected `display: none` duplicate was counted, exactly as intended.
- **The sanctioned `matchMedia` exception is proved as a POSITIVE fact, in the form a source scan structurally cannot.** `publish-checklist` counts 1 at all three widths **and** its placement flips across the 64rem boundary — the collapsed disclosure trigger is present at 320/768 and absent at 1280. Without the second half, a steady 1 would also be true of a hook wedged on one placement, which would count 1 everywhere while delivering the wrong shape to every desktop host. The hook was not touched.
- **AC#13 was MEASURED before it was asserted, and the criterion as written is true of only some routes.** `/` = 0, `/listings/[id]` = 1, `/profile` = 0, `/bookings` = 1, `/host` = 1, `/host/bookings` = 2 — every one correct. The table declares the number with its reason and asserts four clauses per row; a blanket `toHaveCount(1)` would have been red against five correct routes.
- **The `hidden` mechanism is asserted through the accessibility tree, without naming a class.** At 320 the host nav's drawer trigger is reachable by role and the inline `Requests` link is not; at 1280 the reverse. That is what `hidden` (and not `sr-only`, and not `opacity-0`) looks like from outside the component, and the failure message spells out the `hidden`-vs-`aria-label` WCAG 4.1.2 trap so the next reader does not reach for the wrong one.
- **Five watched reds, every one by injection from the spec — `src/` was never edited.** A duplicate calendar; the placement probe with the breakpoint moved; and all three landmark clauses isolated, including a `sr-only` `<div>` carrying the site-nav id that is NOT a landmark (so clause (a) passed and clause (b) fired) and an `aria-hidden` on the real nav (so clause (c) fired at `Received: 0`, which no DOM count can see).
- **Two container-id gaps found, measured, and routed rather than papered over** — see "Findings".

## Task Commits

1. **Task 1: `e2e/one-tree.spec.ts` — one instance in the document at 320/768/1280** — `b25119e` (test)
2. **Task 2: AC#13 — exactly one navigation landmark, and the hidden mechanism proved** — `3bbab9a` (test)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified

- `e2e/one-tree.spec.ts` — **created, 1,600 lines.** Four describes plus two mechanical completeness tests. A ten-row surface table over the six declared families, each row naming its container id (typed as `SelectorId`, so a typo is a compile error rather than a silent zero), a `tell` that is never the counted id, and what a count other than 1 would MEAN on that surface. Fixtures: one seeded `exclusive` listing for the anonymous rows, one UI-signed-up host with today's session for the wizard/agenda rows, and one live hold minted through the shipped booker path for checkout.
- `.planning/phases/17-.../deferred-items.md` — **appended.** Three rows: the open-capacity calendar fork, the vendor navigation landmark on `/listings/[id]`, and the recorded reason the booking sheet is counted shut.

## Decisions Made

- **The count is asserted twice, and the second one is polled.** Playwright's retrying locator count is the ergonomic instrument; a raw `document.querySelectorAll` count is the same claim with no library between the assertion and the DOM, and it exists so that a locator which ever filtered by paint would be caught. Both now settle before they are compared — see the deviation below for why that correction was necessary and why it costs the clause nothing.
- **A fresh navigation per width, not one document resized three times.** `host-headings.spec.ts` resizes because a heading count cannot change without a re-render. A MOUNT count can, and the mount most worth measuring is the one that happens during server render and hydration at that viewport.
- **One theme.** A count over the document cannot vary by theme — the two themes differ in CSS custom properties, not in the tree — so a second pass would double the run for a theme-invariant property. The theme is still seeded, so the document under test is deterministic.
- **The booking sheet is counted SHUT.** `booking-panel` is 1 on the resting page and 2 with the sheet open, and the second mount is RESP-02's sanctioned portal placement asserted elsewhere. AC#12's claim is about the resting document; a 2 with the sheet never opened is the failure.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The calendar row was non-deterministic, because `AvailabilityCalendar` forks on occupancy mode**

- **Found during:** Task 1, on the confirmation runs
- **Issue:** The plan says to reuse `firstListingPath` ("the first listing in the catalogue", discovered from the running app). That is the right resolver for an overflow sweep, where nothing measured depends on what KIND of listing it lands on. It is the wrong resolver here: `availability-calendar.tsx:551-582` takes an early return for an `open_capacity` listing, so the calendar row's SUBJECT is a different component depending on which listing happens to be first. Observed 1 red in 3 full runs on an unchanged tree.
- **Fix:** The anonymous rows now drive a listing seeded by `seedBookableListing({ occupancy: "exclusive" })` — the option existed for exactly this reason. The drop-in surface is not dropped: it is a named skip with the measurement. This also removed the block's dependency on a non-empty local catalogue.
- **Files modified:** `e2e/one-tree.spec.ts`
- **Verification:** four consecutive full runs, 20 passed / 2 skipped each
- **Committed in:** `b25119e`

**2. [Rule 1 - Bug] The guard-the-guard clause compared a settled number to an unsettled one**

- **Found during:** Task 1, on the confirmation runs
- **Issue:** The raw DOM count took a SINGLE sample immediately after the retrying locator assertion passed, and treated any disagreement as proof the locator was filtering. Observed twice in five full-suite runs and never in 24 isolated replications: `document.querySelectorAll("[data-testid="booking-panel"]").length is 2, but the locator count above reported 1`.
- **Fix:** Investigated before retrying it away, because a duplicate booking panel would be a real defect. The SERVED document holds exactly one (`curl`: 1 `booking-panel`, 1 `availability-calendar`, 1 `listing-key-facts`, 0 `responsive-dialog`, one `data-placement="rail"`); the RESTING document holds exactly one (polled every 500ms for 8s at all three widths, never left 1); the sheet placement is a portal not mounted until tapped. So the 2 was one sample taken mid-hydration under full-suite contention, at an instant the retrying assertion had already moved past. The raw count is now polled to a settled value with a 10s budget, and on failure it dumps every matching node with its computed `display`/`visibility`/`opacity` and its parent. Polling loses nothing the clause existed for: a filtering locator still settles at 1 while the DOM settles at 2.
- **Files modified:** `e2e/one-tree.spec.ts`
- **Verification:** four consecutive full runs green; the diagnostic path exercised by the injected-duplicate red
- **Committed in:** `b25119e`

**3. [Rule 2 - Missing Critical] AC#13's headline assertion would have been red against five correct routes**

- **Found during:** Task 2
- **Issue:** The plan (and 17-RESEARCH row 13) states AC#13 as "`getByRole("navigation")` resolves to exactly 1 at 320 and 1280", expected green. Measured, it is 0 on `/` and `/profile` (the public and booker compositions pass no `nav` prop, and `selector-contract.ts`'s `site-nav` row states the load-bearing claim on that id is an ABSENCE) and 2 on `/host/bookings` (the host shell's nav AND the bookings tab list — two differently-named landmarks, which is what a correct landmark set looks like).
- **Fix:** The table declares the measured number per route with its reason and asserts four clauses: the declared total; the site-nav count in the DOCUMENT; the site-nav count in the ACCESSIBILITY TREE; and — on every route declaring exactly one — `getByRole("navigation")` resolving to 1 at 320 and 1280, covering a signed-out route and a signed-in one. That is strictly stronger than the criterion as phrased, because a NEW landmark arriving anywhere now fails by name.
- **Files modified:** `e2e/one-tree.spec.ts`
- **Verification:** all three clauses watched red in isolation (see below)
- **Committed in:** `3bbab9a`

**4. [Rule 3 - Blocking] `signUpAndReachProfile` reaches a route with ZERO landmarks, so the AC's signed-in row needed a second route**

- **Found during:** Task 2
- **Issue:** The plan requires the signed-in row to use the shipped `signUpAndReachProfile` resolver. `/profile` measures 0 navigation landmarks, so that row alone cannot carry an "exactly one" claim.
- **Fix:** The resolver is kept and its route is measured with a declared 0; the signed-in "exactly one" claim is carried by `/bookings?tab=upcoming`, reached from the same signup drive, where `bookings-tabs.tsx:90`'s `<nav aria-label="Bookings">` is the only landmark. Signed-out coverage of "exactly one" is `/listings/[id]`.
- **Files modified:** `e2e/one-tree.spec.ts`
- **Verification:** both rows green at 320 and 1280
- **Committed in:** `3bbab9a`

---

**Total deviations:** 4 auto-fixed (2 bugs in this plan's own harness, 1 missing-critical, 1 blocking)
**Impact on plan:** No scope creep and no `src/` change. Two of the four are defects in the gate this plan shipped, found by running it rather than by reading it; the other two are the plan's stated assertions corrected against measurement. `git status --porcelain src/` and `drizzle/` both print nothing.

## Findings (recorded, not fixed)

Full write-ups with the cheapest correct fix and an owner are in this phase's `deferred-items.md`.

1. **`AvailabilityCalendar`'s open-capacity fork carries no container id.** The `open_capacity` early return renders a fragment (deliberately — its comment records choosing it over a wrapper div so the drop-in tree keeps its box), so `availability-calendar` counts 0 on a drop-in listing and AC#12 cannot be *asked* of it. Hanging the id there is a `src/` change outside this plan that reverses a recorded decision, and would want a `SELECTOR_CONTRACT` review since one id would then name two structurally different subtrees.
2. **The only navigation landmark on `/listings/[id]` is `react-day-picker`'s** — `<nav class="rdp-nav" aria-label="Navigation bar">`. On the product's highest-intent public page, the one thing announced as *navigation* is a vendor's month stepper with a generic name. Not a duplication defect; a naming/semantics one, fixable through `ui/calendar.tsx`'s existing override seam. The spec PINS the current state, so the day it changes the gate says so by name.
3. **The booking sheet is counted shut** (2 with it open, by design). Recorded so a later reader who opens it does not file a duplication defect.

## Issues Encountered

- **This plan was executed across an API connection interruption.** The transcript has a gap immediately after the measurement probes and before the spec was written. Verified at resume: `HEAD` was still `f50b88c`, the working tree was clean apart from an untracked `.claude/`, and `e2e/one-tree.spec.ts` did not exist — so nothing had landed and no work was duplicated. The probe measurements taken before the cut were re-derived or re-confirmed by the spec's own first run. Noted here so the verifier is not surprised by the gap.
- **The first full-suite runs were intermittently red, and both causes were real.** Neither was retried away; both are documented as deviations 1 and 2 above, with the investigation that separated "a duplicate panel exists" from "two samples were taken at two instants".

## Verification

| Command | Result |
|---|---|
| `npx playwright test e2e/one-tree.spec.ts --project=chromium --workers=1` | **20 passed / 2 skipped**, four consecutive runs (54.7s, 57.8s, 57.3s, 58.7s) |
| `npx tsc --noEmit` | exit **0** |
| `npm run lint` | exit **0** — 25 warnings, all pre-existing, **none** in `e2e/one-tree.spec.ts` |
| `npm run test:design` | **66 files, 1247 passed / 3 skipped** — unmoved from 17-03/17-08 |
| `git status --porcelain drizzle/` | empty (GATE-06 / AC#32) |
| `git status --porcelain src/` | empty — no shell, component or schema change (T-17-47) |
| `grep -c 'toBeVisible' e2e/one-tree.spec.ts` | **0** |
| `grep -c 'toHaveCount(1)' e2e/one-tree.spec.ts` | **7** (floor: 6) |
| `grep -c 'toHaveClass' e2e/one-tree.spec.ts` | **0** |
| `grep -c 'skeleton-calendar' e2e/one-tree.spec.ts` | **0** — the fallback is never counted, and is never even named |
| `grep -c 'getByRole("navigation")' e2e/one-tree.spec.ts` | **4** |
| `test.skip(title, () => { throw … })` emitters | **2** rows, skip reasons 733 and 1,167 characters (floor: 80) |
| Widths exercised | `WIDTHS = [320, 768, 1280]`, `LANDMARK_WIDTHS = [320, 1280]` |

### Watched reds (all by injection from the spec; `src/` never edited)

| Probe | Clause | Observed |
|---|---|---|
| a `display:none` duplicate `availability-calendar` appended to `body` | AC#12 locator count | `Expected: 1 / Received: 2`, `14 × locator resolved to 2 elements` — invisible for the whole 5s |
| `PANEL_BREAKPOINT_PX` moved to 4000 | the placement probe | `the publish checklist at 1280px offers 0 disclosure trigger(s) … expects 1` — `Expected: 1 / Received: 0` |
| a second `<nav data-testid="site-nav">` | landmark clause (a) | `Expected: 1 / Received: 2` |
| a `<div data-testid="site-nav" class="sr-only">` — not a landmark, so (a) PASSED | landmark clause (b) | `Expected: 1 / Received: 2` |
| `aria-hidden="true"` on the real nav, (a) and (b) disabled | landmark clause (c) | `Expected: 1 / Received: 0` — the half a DOM count cannot make |

## Requirements

**RESP-04 is ADVANCED, not closed — `requirements-completed` is deliberately empty, and `.planning/REQUIREMENTS.md` is untouched (bullet and traceability row both stay `Pending`).**

| AC | Claim | Status after this plan |
|----|-------|------------------------|
| 10 | Zero viewport-conditional JSX branches | ✅ closed by 17-03 (blocking design gate) |
| 11 | Exactly one `matchMedia` call site, zero `useMediaQuery` | ✅ closed by 17-03 |
| 12 | Identifying container resolves to 1 **in the document** at 320/768/1280 | ⚠️ **closed for five of six families**; the calendar family is closed for the **exclusive** surface only. Two named container-id gaps remain: the `open_capacity` calendar fork and the mobile `row-card` stack. |
| 13 | `getByRole("navigation")` resolves to exactly 1 at 320 and 1280 | ✅ **closed here**, as a declared count per route — the criterion's headline number is asserted on every route where it is true, signed out and signed in |
| 14 | `sheet.tsx` absent / `responsive-dialog.tsx` present | ✅ owned by `tests/design/sheet-absent.test.ts` |

The two gaps are container ids that do not exist, not assertions that were skipped for convenience; both are in `deferred-items.md` with the cheapest correct fix and an owner. **requirements-advanced only.**

## Known Stubs

None. Every row either measures a real rendered container against a real fixture, or is a `test.skip` that throws its reason into the run's output.

## Threat Flags

None. No network endpoint, auth path, file-access pattern or schema change. `T-17-48`: `git status --porcelain drizzle/` prints nothing. `T-17-47`: `git status --porcelain src/components/patterns/site-chrome.tsx` prints nothing — every landmark red was produced by injection from the spec precisely so the shell would not be reshaped to move a count.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Ready for 17-10.** This plan touched one new file plus phase docs; no sibling's `files_modified` overlaps.
- **Handed to 17-13 / the phase verifier:** the three `deferred-items.md` rows, and the standing note that RESP-04's AC#12 has two named container-id gaps. A plan that adds either id should delete the matching skipped row in `e2e/one-tree.spec.ts` and replace it with a measurement — the skip is written to make that swap obvious.
- **Standing instruction encoded in the file:** a second component reaching for `matchMedia` is a finding, not a precedent, and the placement probe's failure message says so rather than pointing at the hook for deletion.

## Self-Check: PASSED

- `e2e/one-tree.spec.ts` — FOUND (1,600 lines, > 120 floor)
- `.planning/phases/17-.../deferred-items.md` — FOUND (3 rows appended)
- Commit `b25119e` — FOUND
- Commit `3bbab9a` — FOUND
- All Task-1 and Task-2 `<acceptance_criteria>` re-run and passing (tables above)
- Plan-level `<verification>` re-run at close-out: Playwright green, `tsc` 0, `test:design` 0, `drizzle/` clean

---
*Phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines*
*Completed: 2026-08-29*
