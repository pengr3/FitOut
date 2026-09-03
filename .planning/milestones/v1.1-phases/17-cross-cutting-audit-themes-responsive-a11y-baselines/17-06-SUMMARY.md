---
phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
plan: 06
subsystem: testing
tags: [playwright, e2e, wcag-2.5.8, responsive, site-chrome, tailwind]

# Dependency graph
requires:
  - phase: 16-image-crop-framing
    provides: "`expectNoOverflowWithin` + the `RouteRow.scope` field (16-15) — shipped but never adopted by the sheet row, which is what [16-D9] is"
  - phase: 15-auth-profile-transactional-email
    provides: "the [15-12] measurement (five runs) that diagnosed the target-size scan as under-synchronised rather than wrong"
  - phase: 13-confirmation-bookings-trust
    provides: "the [13-15] ProfileLink finding, its 16x16 measurement, and `collectControls`'s shell exclusion written around it"
  - phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
    provides: "17-01's `e2e-baseline-reds.md` denominator, against which this plan's runs are read"
provides:
  - "The `/listings/[id] · sheet open` row measures INSIDE the dialog: 129 elements examined, 320 === 320, zero offenders, both themes ([16-D9] closed)"
  - "`expectTargets`'s vacuity guard is polled for 15s, closing the [15-12] race without weakening the claim or moving the floor"
  - "`ProfileLink` is a 28x28 pointer target at 320px via `p-1.5` on the link (was 16x16 — 8px under WCAG 2.5.8 AA on every signed-in route)"
  - "The site header is INSIDE the 24px target-size scan on every Phase-13 and Phase-14 case; only the footer is excluded, with a measured reason"
  - "A new `AC#22 / D-196` block asserting the 24px floor on both axes and the 226px cluster budget, per theme, both watched red"
  - "The re-measured header budget: cluster 190.4px court / 191.6px grove against 226px stated (224px measured available)"
affects: [17-07, 17-09, 17-11, 17-12, 17-13, visual-baselines, site-chrome]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A vacuity guard that must WAIT is polled, not reordered — `expect.poll` carrying the guard's own prose as its message"
    - "`inShell` on a collected control: widening a scan's subject without letting the shell satisfy the scan's vacuity guard"
    - "A closed finding's stale sentence is REPLACED with its own text quoted as history, never silently deleted"

key-files:
  created: []
  modified:
    - e2e/overflow-320.spec.ts
    - src/components/patterns/site-chrome.tsx
    - .planning/phases/13-confirmation-bookings-trust/deferred-items.md
    - .planning/phases/15-auth-profile-transactional-email/deferred-items.md
    - .planning/phases/16-image-crop-framing/deferred-items.md
    - .planning/phases/17-cross-cutting-audit-themes-responsive-a11y-baselines/deferred-items.md

key-decisions:
  - "[15-12] was closed by POLLING the guard, not by moving `expectTargets` after the tell as the plan specified — the call was already after the tell at 335bf6c (:1381/:1396 and :2071/:2086), and the recorded finding is a race that a reordering cannot touch"
  - "`p-1.5` (28x28) over `p-1` (exactly 24, no rounding margin) and `p-2` (32 = `AUTH_SLOT_BOX`'s own declared h-8) — the budget had 45.6px spare, so buying 4px of margin cost nothing"
  - "The footer half of the shell exclusion is KEPT: measured, all five footer links are `display: inline` and already exempt by WCAG 2.5.8's own exception, so removing it would widen this gate's subject on a decision D-196 did not make"
  - "The cluster assertion pins the SPEC'S 226px rather than the measured 224px — pinning what this composition happens to lay out today would go red on a 1px font-metric change"
  - "`Control` gained `inShell` so the vacuity guard keeps the claim it always made; an unfiltered count would be satisfied by the brand link on every route and would silently re-open [15-12]"

patterns-established:
  - "Poll-the-guard: an under-synchronised measurement is fixed by giving the existing claim time to become true, never by asking less"
  - "Positive control as vacuity guard: the AC#22 case reads ProfileLink out of the SCAN, so it fails if the exclusion is ever re-widened"
  - "Both-sides re-measurement: a closure records the clean reading AND the mutation reading, on the closing plan's own tree"

requirements-completed: []

# Metrics
duration: 39 min
completed: 2026-08-29
---

# Phase 17 Plan 06: Harness Defects & D-196 Summary

**Two inherited harness defects closed with their measurements reproduced on this tree, and the [13-15] ProfileLink taken from a 16x16 to a 28x28 pointer target with the 226px header budget re-measured rather than assumed.**

## Performance

- **Duration:** 39 min
- **Started:** 2026-08-29T08:36:11Z
- **Completed:** 2026-08-29T09:15:08Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- **[16-D9] closed.** The `/listings/[id] · sheet open` row carries `scope: '[data-testid="responsive-dialog"]'`. It now examines **129 laid-out descendants** inside the overlay and reports `320 === 320, offenders []` in both themes. The 500px-div probe that produced the finding was re-run here: **`scrollWidth 532` against `clientWidth 320`, 48 named offenders** — so the row can fail, which it structurally could not for two phases.
- **[15-12] closed** — by polling `expectTargets`'s vacuity guard for the same 15s `expectReachable` already allows. The claim and the 24px floor are untouched; what changed is that the claim is given time to become true.
- **D-196 shipped.** `p-1.5` on `ProfileLink`'s own `cn()` argument takes it from **16x16 to 28x28**. `NAV_LINK_CLASS` is byte-unchanged, `size-4` untouched, and both accessibility mechanisms (`aria-label` on the wrapper, `hidden sm:inline` on the label) stay unmerged.
- **The site header is inside the 24px scan.** `collectControls`'s `site-header` exclusion — written around this exact control — is deleted, so the header's controls are judged against the AA floor on every Phase-13 and Phase-14 case. All of them clear it.
- **AC#22 is under a gate rather than a comment.** A new `AC#22 / D-196` describe asserts the floor on both axes and the cluster against its 226px budget, per theme, with the measured numbers in the failure messages. Both watched red.
- **Three stale sentences rewritten in the same commits as the fixes that invalidated them**, each quoting its own previous text as history.

## Task Commits

1. **Task 1: close [16-D9] and [15-12]** — `19e9e9c` (test)
2. **Task 2: D-196 ProfileLink padding + cluster re-measure** — `d09e98d` (fix)
3. **Task 3: narrow the exclusion, assert AC#22** — `0d3ae71` (test)

## Files Created/Modified

- `e2e/overflow-320.spec.ts` — the `scope` field on the sheet row; the polled vacuity guard; `Control.inShell`; the narrowed exclusion; the new `AC#22 / D-196` block; a file-header closure record and three rewritten stale passages
- `src/components/patterns/site-chrome.tsx` — `p-1.5` on `ProfileLink`, and the docblock's budget paragraph replaced with measured figures
- `.planning/phases/13-…/deferred-items.md` — [13-15] annotated CLOSED with the full re-measurement
- `.planning/phases/15-…/deferred-items.md` — [15-12] annotated CLOSED, including why the ordering reading is wrong
- `.planning/phases/16-…/deferred-items.md` — [16-D9] annotated CLOSED with both readings
- `.planning/phases/17-…/deferred-items.md` — one new row: the visual-baseline exposure this plan's product change creates

## Measurements

**The sheet row, scoped ([16-D9]):**

| reading | result |
|---|---|
| clean, court and grove | `found true · examined 129 · scrollWidth 320 · clientWidth 320 · offenders []` |
| 500px div appended into the open sheet | `scrollWidth 532` vs `clientWidth 320`, 48 named offenders |

**The header at 320px, after `p-1.5`:**

| surface | controls |
|---|---|
| `/` (signed out) | `a[FitOut] 52x28` · `a[Log in] 62.3x32` · `a[Sign up] 72.6x32` |
| `/profile` (signed in) | `a[FitOut] 52x28` · `button[Booking] 94.4x28` · `button[Notifications, 0 unread] 44x44` · `a[Profile] 28x28` |
| footer (all routes) | five links, every one `display: inline`, 18px tall — exempt by WCAG 2.5.8's own inline exception |

**The cluster budget:**

| | court | grove |
|---|---|---|
| before `p-1.5` | 178.4px | — |
| after `p-1.5` | **190.4px** | **191.6px** |
| available (measured) | 224px = 288px content box − 52px brand − one `gap-3` | — |
| budget (as the spec states it) | 226px | — |

The `200px / 226px` pair the docblock carried was `11-UI-SPEC`'s arithmetic, not a measurement — and `measurements.ts` had already recorded one of its terms as false (the bell is `size-11`/44px, not 32). **Even `p-2` would have fit.** Nothing was shrunk, no label dropped, no gap reduced.

## Decisions Made

- **[15-12] is a wait, not a reorder** (see Deviations).
- **`p-1.5`, not `p-1` or `p-2`** — `p-1` lands exactly on the AA bar where sub-pixel rounding decides conformance; `p-2` would size the link to exactly `AUTH_SLOT_BOX`'s declared `h-8`, leaving the control one edit from defining the box's height. Both are declared ladder steps; this plan authors no new spacing value.
- **The footer exclusion is kept, and its cost is written down** — it is a no-op today (every footer control is inline-exempt), and the day the footer ships a block-level control this line hides it. Whoever adds one should delete the clause.
- **The cluster assertion pins 226, not the measured 224** — the 2px sit between the spec's stated budget and today's layout, and a gate pinning the latter reports font-metric drift as a budget breach.
- **Both new assertions were watched red** before being trusted: budget → 150 produced *"the signed-in header cluster measures 190.4px against its 150px budget — over by 40.4px"*; restoring the header exclusion produced *"the target-size scan returned no `a[Profile]` from inside `site-header`. The scan found 0 shell control(s): (none)"*.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's [15-12] fix would have closed nothing**

- **Found during:** Task 1
- **Issue:** The plan says *"In the AC#30 Phase-13 block, `expectTargets` currently runs without waiting for the row's own tell"* and asks for the call to be **moved** after `expectReachable`. Measured at `335bf6c`: the AC#30 block's tell is at `:1381` and `expectTargets` at `:1396`; the Phase-14 block's at `:2071` and `:2086`. Both already run the tell first, and neither block calls `expectReachable` at all — each inlines its own guard with its own `tellWhy` prose. Task 1's third acceptance criterion (*"`expectTargets(` appears at a HIGHER line number than that block's `expectReachable(` call"*) is therefore unsatisfiable as literally written, and the move it asks for would have produced a diff that looks like a fix while leaving the race untouched.
- **Fix:** Implemented the closure the finding's own last paragraph specifies — *"give `expectTargets` its own precondition … the same measured 15s allowance `expectReachable` already carries"* — as an `expect.poll` around the existing vacuity guard, carrying the guard's original prose. Nothing about what the function asserts, or its floor, changed.
- **Files modified:** `e2e/overflow-320.spec.ts`
- **Verification:** 66 passed / 15 skipped, exit 0. The re-measured line numbers and the argument are written into the `expectTargets` docblock and into the [15-12] row so the reading is not re-derived.
- **Committed in:** `19e9e9c`

**2. [Rule 2 - Missing Critical] Narrowing the exclusion would have silently re-opened [15-12]**

- **Found during:** Task 3
- **Issue:** With `site-header` in the scan, `collectControls` returns the brand link on **every route in the app**. `expectTargets`'s vacuity guard — *"zero controls INSIDE the surface is never a clean result"* — would have been satisfied by the shell everywhere, going quiet while still reading like a guard, and the poll added in Task 1 would have resolved off shell controls that paint before the surface's actions do. The plan's Task 3 does not mention the interaction.
- **Fix:** `Control` gained `inShell`; the guard counts non-shell controls, so it keeps exactly the claim it made while the header was excluded. The undersized clause deliberately runs over the FULL set, which is the widening AC#22 asks for.
- **Files modified:** `e2e/overflow-320.spec.ts`
- **Verification:** the AC#22 case's positive control fails with *"0 shell control(s)"* when the exclusion is restored, proving the narrowing is real rather than asserted.
- **Committed in:** `0d3ae71`

**3. [Rule 1 - Bug] Two more stale sentences about the shell exclusion, outside the docblock the plan names**

- **Found during:** Task 3
- **Issue:** The plan requires rewriting `collectControls`'s docblock. A sweep found the same claim twice more: the Phase-13 block's NOT-COVERED bullet (*"THE TARGET-SIZE SCAN DOES NOT SEE THE APP SHELL, and the shell has a real 16x16 control in it"*) and the Phase-14 block's (*"THE SHELL CHROME IS STILL EXCLUDED … and it still fails"*). Both were false the moment Task 2 and Task 3 landed. Leaving them is the exact defect class this task exists to repair.
- **Fix:** Both replaced with their own previous text quoted as history plus the current fact, per the file's amendment idiom.
- **Files modified:** `e2e/overflow-320.spec.ts`
- **Verification:** `grep -c "NOT this plan's to fix"` → 0; no remaining `16x16` claim outside a historical quotation.
- **Committed in:** `0d3ae71`

**4. [Rule 2 - Missing Critical] The grove cluster is 1.2px wider than court, and only court had been measured**

- **Found during:** Task 3 (surfaced by the budget watched-red, which ran both themes)
- **Issue:** Task 2's docblock recorded one figure (190.4px) from a themeless measurement. Grove measures **191.6px** on font metrics alone, and grove is the theme `measurements.ts` already names as the tighter one in the header — i.e. the theme that would breach the budget first was the one not recorded.
- **Fix:** Both figures recorded in `site-chrome.tsx`'s docblock, in the `HEADER_CLUSTER_BUDGET_PX` docblock and in the failure message; the assertion runs per theme rather than once.
- **Files modified:** `src/components/patterns/site-chrome.tsx`, `e2e/overflow-320.spec.ts`
- **Verification:** both theme cases green; both fail with their own number under a lowered budget.
- **Committed in:** `0d3ae71`

---

**Total deviations:** 4 auto-fixed (2 × Rule 1 bug, 2 × Rule 2 missing critical)
**Impact on plan:** No scope creep — every one is inside the two files the plan names, and three of the four exist because the plan's own goal (*"the harness measures what it claims to"*) is not reachable by the mechanism it prescribed. The one acceptance criterion that could not be satisfied as written is documented above rather than skipped; the truth it was written to enforce (`expectTargets` does not race the surface it measures) **holds and is now proved by the poll**.

## Verification

| Check | Result |
|---|---|
| `npx playwright test e2e/overflow-320.spec.ts --project=chromium --workers=1` | **66 passed / 15 skipped**, exit 0 (was 64/15 before this plan; +2 is the new AC#22 block) |
| `npm run build` | exit 0 — lint **0 errors** (25 pre-existing warnings), `test:design` **66 files / 1247 passed / 3 skipped**, `next build` compiled |
| `npx tsc --noEmit` | exit 0 |
| `git status --porcelain drizzle/` | empty (GATE-06 — no migration proposed or absorbed, AC#32) |
| CLOSED annotations naming 17-06 in phases 13, 15, 16 | present, with the original measurements intact |
| `e2e-baseline-reds.md` | no failure met; nothing added to the denominator |

## Issues Encountered

None that blocked. Two things a reader should know:

1. **The sheet is clean, and always was.** [16-D9] was never a claim that the booking sheet overflowed — it was that nobody could have known either way. The fix produces a green row; the value is that the row can now go red.
2. **`npm run build`'s local noise is pre-existing.** 25 lint warnings and the dev server's hydration warning in `NavDrawer` predate this plan and are untouched.

## Known Stubs

None.

## Threat Flags

None. This plan adds no network endpoint, no auth path, no file access and no schema surface; the one product edit is a Tailwind padding utility on an existing link.

## User Setup Required

None — no external service configuration.

## Requirements

`RESP-03` and `GATE-02` are **advanced, not completed**, and are deliberately left unticked in `REQUIREMENTS.md`. RESP-03's remaining clauses are 17-11's and 17-12's; GATE-02's keyboard clause is 17-08's. This plan closes AC#3, AC#9 and AC#22 within them.

## Next Phase Readiness

- **17-11 and 17-12 inherit a harness that measures what it claims to.** That was this plan's stated purpose and it is discharged: the overlay row has a scope, the target scan has a wait, and the shell is inside the scan. Both plans touch `e2e/overflow-320.spec.ts` next — the constants they will meet are `TARGET_FLOOR_PX` (24, conformance), `TOUCH_FLOOR_PX` (44, asserted **by name per surface**, count unchanged at 4), and `HEADER_CLUSTER_BUDGET_PX` (226).
- **⚠ A visual-baseline comparison run is owed, and it cannot be done on this machine.** `p-1.5` widens `ProfileLink` by 12px at **every** width, in all three signed-in compositions. At least one shootable row renders that header (`booking-not-found`, which `visual-baselines.ts` describes as *"an `EmptyState` inside the signed-in shell — so it is shot"*). The `visual` project is not constructed off Linux (D-27/D-29). Recorded as a row in this phase's `deferred-items.md`: the correct next step is a **comparison** dispatch and a read of the diff — not a regeneration, which is the failure mode `13-16` and `15-11` both recorded.
- **One deferred row added, no immediate escalation raised.** D-199's exception (b) was not triggered: AC#3 reached zero offenders and AC#22's cluster assertion is green with ~34px of headroom, so no acceptance criterion was made unreachable.

---
*Phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines*
*Completed: 2026-08-29*
