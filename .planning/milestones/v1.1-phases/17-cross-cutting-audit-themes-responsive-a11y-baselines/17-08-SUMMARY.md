---
phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
plan: 08
subsystem: testing
tags: [playwright, keyboard, accessibility, wcag, focus-trap, e2e, radix, focus-visible]

requires:
  - phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
    provides: "17-01's declared baseline red set and its dev-overlay precedent; 17-02's focus-definition.test.ts — the CLOSED INVENTORY of focus-verdict sites in e2e/ that makes AC#20 mechanical; 17-07's wizard/ListingCard markup changes, which moved the surface this plan walks"
  - phase: 15-auth-profile-transactional-email
    provides: "e2e/helpers/focus.ts — readFocus, expectRing, probeActiveStop, probeCandidateStops, partitionDevOverlay, resetFocusToTop, walkForward, walkBackward, WALK_BOUND, DEV_OVERLAY_TAG — every focus primitive this spec consumes; and e2e/auth-keyboard.spec.ts, the six-document / 59-stop walk whose arm/partition/declare shape is copied"
  - phase: 12-booker-path-search-listing-checkout
    provides: "e2e/overflow-320.spec.ts's expectReachable + row-with-a-tell idiom, its avatar-crop and host-seed fixtures, and booking-sticky-bar.tsx's restoreFocusToAction"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "src/components/patterns/responsive-dialog.tsx — the app's ONE overlay mechanism, and tests/design/sheet-absent.test.ts which asserts the count is one"
  - phase: 16-image-crop-framing
    provides: "the committed square-400.png crop fixture, D-197's disabled zoom row and D-178's focusable, arrow-pannable crop stage"
provides:
  - "e2e/keyboard-composites.spec.ts — 7 cases over the five GATE-02 composite families, all five keyboard properties"
  - "The FIRST shipped assertions in this repository for ESCAPABLE and RETURNED, both red-watched against the overlay primitive"
  - "recordTrapCycle / expectReverseCycle / expectEscapableAndReturned — reusable trap-aware walk primitives, built on helpers/focus.ts rather than beside it"
  - "Declared tab orders for /listings/[id] (21 and 23 stops) and the wizard at 320 (14 stops), and a declared 4-stop focus cycle for the avatar crop dialog"
  - "A measured correction to the plan's model of the wizard step rail: zero tab stops on a fresh mount, its first control created BY the advance"
  - "A measured limit on what a green booking-sheet row proves about restoreFocusToAction"
affects: [17-09, 17-10, 17-11, 17-12, 17-13, 17-14]

tech-stack:
  added: []
  patterns:
    - "Trap-aware walking: inside a modal the bounded-walk clause INVERTS — a lap that never closes is the failure, not a lap that never leaves"
    - "walkBackward with an explicit maxPresses of cycle.length turns the shipped primitive into 'one lap backwards'; unbounded inside a trap it returns WALK_BOUND stops and says nothing"
    - "Both sides of a returned-focus comparison come from probeActiveStop, so the trigger's descriptor at open and the landing descriptor at close are one projection"
    - "Red-watch by mutating the PRODUCT primitive, not the test — a test-side mutation proves only that the test can be broken"
    - "identify(): descriptor plus the same projection's resolved label, appended only when the descriptor could not name the control"

key-files:
  created:
    - e2e/keyboard-composites.spec.ts
  modified: []

key-decisions:
  - "The step rail IS measured, but on the document where it exists. wizard.tsx:454 seeds visitedKeys with step 1 only and :953 needs done AND visited, so a fresh mount has zero rail stops — and the ADVANCE is exactly what creates the first one. Declaring the rail unmeasurable would have recorded a gap that is not there."
  - "One `page.keyboard.press(\"Escape\")` in the file, three call sites. sheet-absent.test.ts asserts ONE overlay mechanism and therefore one escape behaviour; three inlined copies would be three places to disagree about one behaviour. The plan's grep-count criterion is answered at the call sites and the discrepancy is written down in the file."
  - "expectReverseCycle uses the shipped walkBackward with an explicit bound rather than a hand-rolled Shift+Tab loop — which also removed an otherwise-unused import."
  - "The avatar crop dialog is the one overlay with a DECLARED cycle: fixed committed bytes, a disabled zoom row that pins the width, and no DialogTrigger — so it is the only place `returned` can fail the way responsive-dialog.tsx warns about. The sheet and the drawer get escapable/returned without a declared cycle because their contents are a month grid and a nav list owned by other fixtures."
  - "The wizard row waits for the space-type Select to read its seeded value before the baseline is taken. Until React Hook Form applies defaultValues that control is named by wizard.tsx:1062's placeholder, so the SAME element has two identities and the baseline misses the one the walk produces."

patterns-established:
  - "Trap cycle as data: declare an overlay's focus cycle the same way a document's tab order is declared, and let the wrap-to-first press be the trap proof"
  - "Record the third reading of a mutation: when a red-watch leaves a sibling assertion GREEN, say why, so nobody reads the green as proof of a mitigation the file does not exercise"

requirements-completed: []

duration: 57 min (this session) + the prior executor's Task 1
completed: 2026-08-29
---

# Phase 17 Plan 08: The GATE-02 Keyboard Walk Over the Five Composite Families Summary

**Seven Playwright cases that put all five GATE-02 keyboard properties — reachable, operable, indicated, escapable, returned — on the calendar, the slot picker, the wizard, and all three of the app's overlays, including the first shipped assertions anywhere in this repository for escapable and returned, both red-watched by breaking the one overlay primitive rather than the test.**

## ⚠ This plan was executed ACROSS AN INTERRUPTION

A previous executor was interrupted mid-plan. What it left behind, and what this session did with it:

| Task | Committed by | Commit | State when this session started |
| ---- | ------------ | ------ | ------------------------------- |
| 1 — calendar + slot-picker tab orders, reachable + indicated | **prior executor** | `250e32c` | Committed. Verified green here, not re-done, not amended. |
| 2 — operable on all five families, the wizard's full walk | **this session** | `de097f8` | Existed as uncommitted, UNVERIFIED working-tree changes. Had never been executed. |
| 3 — escapable and returned on every dialog and sheet | **this session** | `7641f44` | **Entirely absent.** The file carried three dangling forward references to a block that did not exist. |

The prior executor's uncommitted material was inspected, run, corrected and committed rather than trusted or discarded. Running it is what found the three defects below — none of which are visible by reading.

## Performance

- **Duration:** 57 min (this session), on top of the prior executor's Task 1
- **Started:** 2026-08-29T11:15:00Z (this session)
- **Completed:** 2026-08-29T12:12:00Z
- **Tasks:** 3 (1 inherited complete, 2 finished and committed here)
- **Files created/modified:** 1 (`e2e/keyboard-composites.spec.ts`, 1523 lines)

## Accomplishments

- **All five families carry all five properties.** The availability calendar and the slot picker on `/listings/[id]` at 1280 (21 and 23 declared stops); the same two composites inside the booking sheet at 320, which is the only placement a phone user ever meets them in; the listing wizard at 320 (14 declared stops); the avatar crop dialog on `/profile`; and the host nav drawer, this route's own overlay.
- **Escapable and returned exist for the first time.** Nothing in the suite measured either. `recordTrapCycle` walks one lap of an open overlay asserting on every press that focus is still in the document AND still inside the overlay; `expectEscapableAndReturned` presses Escape and compares the landing descriptor with the trigger's own `StopProbe`, taken before the overlay existed.
- **Three adopters, three different restore paths, one assertion.** The drawer uses Radix's untouched restore, the crop dialog a `returnFocusRef` (it has no `DialogTrigger` at all), the booking sheet `restoreFocusToAction`. All three now measured in a browser.
- **Both new properties red-watched against the product**, by mutating `src/components/patterns/responsive-dialog.tsx` and reverting — see below.
- **Zero new focus-indicator definitions.** Every reading comes through `expectRing` / `indicatorOf` / `sameIndicator`; `grep -c 'outlineStyle\|outlineWidth\|boxShadow'` on the spec returns `0` and 17-02's closed inventory is green.
- **`WALK_BOUND` untouched at 40**, `e2e/auth-keyboard.spec.ts` still reports its shipped six documents / 59 stops, `/signup`'s radio group untouched per D-198, `git status --porcelain drizzle/` empty.

## Task Commits

1. **Task 1: scaffold + reachable/indicated on the calendar and slot picker** — `250e32c` (test) — *committed by the prior executor*
2. **Task 2: operable on all five families, and the wizard's full walk** — `de097f8` (test)
3. **Task 3: escapable and returned on every dialog and sheet** — `7641f44` (test)

**Plan metadata:** this commit (docs)

## Files Created/Modified

- `e2e/keyboard-composites.spec.ts` — 7 cases, 1523 lines. Declared tab orders for two `/listings/[id]` states and the wizard at 320; a declared 4-stop focus cycle for the crop dialog; the trap-aware walk primitives; and the operability contracts (the calendar's `1 → 2 → 9 → 8` arrow arithmetic with Enter proved by the SELECTION rather than by focus, the slot picker's `6:00 AM → 7:00 AM → 8:00 AM`, the sticky bar's trigger, the checklist disclosure, the advance action and the step rail).

## Red-Watch Evidence

Both mutations were made in `src/components/patterns/responsive-dialog.tsx` — the app's one overlay mechanism — and reverted; `git status --porcelain src/` printed nothing afterwards. Command in both cases:
`npx playwright test e2e/keyboard-composites.spec.ts --project=chromium --workers=1`.

**ESCAPABLE.** Mutation: `onEscapeKeyDown={(event) => event.preventDefault()}` on `DialogContent`. Observed an *assertion naming the overlay*, not a timeout on a hung walk:

```
/profile · the avatar crop dialog: Escape did not close the overlay. `Escape` is one of the three
dismiss affordances `responsive-dialog.tsx:64` declares at every width …
expect(locator).toHaveCount(expected) failed
Locator: locator('[data-testid="responsive-dialog"]')   Expected: 0   Received: 1
```

**RETURNED.** Mutation: `onCloseAutoFocus={undefined}`, which reproduces exactly the defect that file's own docblock describes for an adopter with no `DialogTrigger`. Observed, with the landing site named rather than a bare boolean:

```
/profile · the avatar crop dialog: Escape closed the overlay and left focus on «nothing — focus is
on `<body>`, which is what a dead end looks like from here» rather than on the trigger
`button[button]:Upload photo` it was opened from …
Expected: "button[button]:Upload photo"   Received: null
```

Properties 1–4 all still passed under that mutation, which is the whole reason property 5 is separate.

**A third reading from the same mutation, recorded rather than implied.** The full spec was run with `onCloseAutoFocus` dropped and the **booking sheet's `returned` assertion stayed GREEN**. That is correct, not a hole: the sheet opens through a stable `DialogTrigger` and — with only a *day* selected — its trigger is still in the document, so Radix's own restore covers it. `restoreFocusToAction` is the defence for the case where the trigger has been **replaced** by the `Book · {total}` action, which needs a window selected to reach. **This file therefore does NOT exercise that mitigation**, and says so at the call site. Flagged for 17-13.

## Decisions Made

See `key-decisions` in the frontmatter. The load-bearing one: the wizard step rail is measured *after* the advance rather than declared unmeasurable, because that is where it exists.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The dev server on :3000 was wedged and every case was red against it**

- **Found during:** first execution of the prior executor's uncommitted work
- **Issue:** the already-running `next dev` returned **HTTP 500** for `/listings/[id]` with `Error: Jest worker encountered 2 child process exceptions, exceeding retry limit`. Playwright's `reuseExistingServer` adopted it silently, so the first run reported the calendar row failing on `6:00 AM` never resolving — a message that reads exactly like a product or fixture defect. A throwaway probe spec dumping `response.status()` and the body is what named it.
- **Fix:** killed the server, `rm -rf .next`, started a fresh `npm run dev`. Re-ran: page renders, Sept 1 2026 offers `6:00 AM`–`8:00 PM`, four of five cases green immediately.
- **Files modified:** none (environment)
- **Verification:** 3 subsequent full runs of the spec, all green
- **Note:** this is the recorded `.next`-staleness hazard in a new shape — a 500 rather than a 404. Worth knowing that the symptom surfaces as a *fixture* failure several assertions downstream.

**2. [Rule 1 - Bug] `getByRole("button", { name: "Back" })` was ambiguous on the wizard — and the ambiguity was the finding**

- **Found during:** Task 2 verification
- **Issue:** the assertion died on a strict-mode violation resolving TWO elements: the wizard's own `Back` button and a rail marker labelled `Go back to step 1: What kind of space is it?`, which contains the substring. The wizard had advanced perfectly; the locator had gone ambiguous **because the advance is exactly what turns the first rail marker into a control**.
- **Fix:** `exact: true` on that locator, **plus a new assertion (c)** the accident argued for — the rail marker is found in a forward walk of the advanced document (reachable), draws a ring (`expectRing`), and Enter on it returns the wizard to step 1, proved by the advance action's label, which `wizard.tsx:823` makes a step indicator rather than a caption.
- **Also corrected:** the prior executor's file header claimed this "CORRECTS THE PLAN'S OWN DESCRIPTION OF THIS SURFACE". The measurement behind that claim is right — `wizard.tsx:454` seeds `visitedKeys` with step 1 only, `:953` needs `done` AND visited, so a fresh mount has zero rail stops — but the conclusion drawn from it was too strong. The plan's sentence is true one step later. The header now says so.
- **Files modified:** `e2e/keyboard-composites.spec.ts`
- **Committed in:** `de097f8`

**3. [Rule 1 - Bug] The wizard row was flaky — one run in twelve — on a stop-identity race**

- **Found during:** Task 3 verification (it surfaced under an unrelated mutation run)
- **Issue:** `stop 7/14 button[combobox]:Multi-sport court: this stop has no entry in the unfocused baseline`. `wizard.tsx:1062` gives the space-type `SelectValue` a placeholder, so between first paint and React Hook Form applying `defaultValues` the SAME element is named `button[combobox]:Choose the best match` and then `…:Multi-sport court`. A baseline snapped inside that window has no entry under the identity the walk later produces, so the difference check for that stop has nothing to compare against — silent in the dangerous direction.
- **Fix:** `armWizard` now waits for the combobox to read the seeded value before the baseline is taken. Same shape as `settleListing`'s two existing waits, and documented with the observed message.
- **Files modified:** `e2e/keyboard-composites.spec.ts`
- **Verification:** 3 full runs green after the fix (7 passed each)
- **Committed in:** `7641f44`

### Deviations of Form (acceptance criteria answered differently than spelled)

**4. `grep -c '"Escape"'` returns 1, not the ≥ 3 Task 3's criteria ask for.** The press is factored into `expectEscapableAndReturned` and called from **three** sites — the booking sheet, the crop dialog, the host nav drawer. The factored form is the one that matches the product: `tests/design/sheet-absent.test.ts` asserts exactly ONE overlay mechanism and therefore one escape behaviour, so three inlined copies would be three places to disagree about one behaviour. The criterion's *claim* holds at three call sites; the grep counts spellings. **Written into the file at the helper**, so a reader running the grep gets the reason instead of a discrepancy.

**5. `grep -c 'focusVisible'` returns 4, which is fewer than the number of operability assertions.** Task 2's criterion asks for `focusVisible` occurrences ≥ operability assertions. The pairing is factored into `expectRealPress` (**10 call sites**) and `expectIndicated` (every stop of every walk), so the runtime count of `focusVisible` assertions greatly exceeds the operability count while the source count does not. Structurally the pairing is *unavoidable* rather than merely present: there is no way to make an operability claim in this file without passing through one of those two functions.

**6. A declared sequence was corrected rather than the page edited — twice, as the plan instructs.** (a) The crop dialog's cycle was written as a 3-stop guess and measured as **4**: the crop stage is the FIRST stop (a focusable `<div>` that is legitimately operable — D-178's arrow pan, named by `AVATAR_POSITION_LABEL`), and the vendored `Close` is LAST in DOM order despite being top-right visually. (b) `expectReverseCycle` was first hand-rolled as a Shift+Tab loop and rewritten onto the shipped `walkBackward` with an explicit `cycle.length` bound — which also retired an otherwise-unused import.

---

**Total deviations:** 3 auto-fixed (1 blocking-environment, 2 bugs) + 3 deviations of form.
**Impact on plan:** no scope creep. Two of the three bugs were latent in work that had never been executed; the third is an instrument race that would have produced a vacuous assertion rather than a red.

## Findings Batched for 17-13

1. **`restoreFocusToAction` is not exercised by this file.** Measured under the `onCloseAutoFocus={undefined}` mutation: the booking sheet stayed green, because a day-only selection leaves its `DialogTrigger` in the document and Radix's own restore covers it. The replaced-trigger case (`Book · {total}`) needs a window selected and is `booking-sticky-bar.tsx`'s own subject.
2. **The wizard step rail has zero tab stops on a fresh mount.** Not a defect — D-148's literal reading, forward markers stay inert even once visited. Recorded because it makes "the rail is a composite whose steps must each be reachable" a statement about a document that only exists after the wizard has moved.
3. **`.next` staleness can present as an HTTP 500**, not only a 404, and `reuseExistingServer` adopts a wedged dev server silently. The failure then surfaces as a fixture assertion several steps downstream.

## Verification Run

| Check | Result |
| ----- | ------ |
| `npx playwright test e2e/keyboard-composites.spec.ts --project=chromium --workers=1` | **7 passed** (repeated 3×, stable) |
| `npx playwright test e2e/auth-keyboard.spec.ts --project=chromium --workers=1` | **7 passed** — six documents at 12+14+9+7+9+8 = **59 stops**, unchanged |
| `npm run test:design` (incl. `focus-definition.test.ts`, `sheet-absent.test.ts`) | **66 files, 1247 passed / 3 skipped** |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | 0 errors; nothing reported for this file (25 pre-existing warnings elsewhere) |
| `git status --porcelain drizzle/` | empty (GATE-06) |
| `grep -c 'outlineStyle\|outlineWidth\|boxShadow'` on the spec | `0` |
| `grep -c '\.focus()'` on the spec | `0` |
| `grep -c 'WALK_BOUND ='` on the spec | `0`; `e2e/helpers/focus.ts:347` still reads `40` |
| `git diff --name-only` includes `auth-keyboard.spec.ts` or `src/app/(auth)/signup` | no |

## Requirements

**GATE-02 — requirements-advanced, NOT completed.** The requirement reads *"Every surface is operable by keyboard alone…"*. This plan closes the five composite families it names; "every surface" is wider than those five plus the six auth documents, and 17-10 (the heading-outline walk) and 17-13 (the findings ledger) still owe it work. `REQUIREMENTS.md` is deliberately unchanged — the verdict is the phase verifier's, and this follows 17-07's precedent for the same requirement.

## Issues Encountered

- The first execution of the inherited work was red for an environment reason that looked exactly like a product defect. Resolved by restarting the dev server on a cleared `.next` (deviation 1). The lesson is recorded in the findings above rather than only here.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Ready for **17-09** (`e2e/one-tree.spec.ts`).
- `e2e/keyboard-composites.spec.ts` is a consumer of `e2e/helpers/focus.ts` and adds no focus definition, so 17-02's closed inventory is unchanged and stays at three declared entries.
- The trap-aware primitives (`recordTrapCycle`, `expectReverseCycle`, `expectEscapableAndReturned`) are module-local to this spec. If a later plan needs them across files, they belong in `helpers/focus.ts` next to the walk primitives they are built on — not copied.
- **Not in CI (D-24)**, like the rest of `e2e/`. One engine, one theme, one width per row; nothing here says anything about contrast, which is `e2e/axe-sweep.spec.ts`'s half of GATE-02.

## Self-Check: PASSED

- `e2e/keyboard-composites.spec.ts` — FOUND on disk (1523 lines, ≥ the plan's 200-line floor)
- `250e32c` — FOUND in `git log` (Task 1, prior executor)
- `de097f8` — FOUND in `git log` (Task 2)
- `7641f44` — FOUND in `git log` (Task 3)
- All Task 2 and Task 3 acceptance criteria re-run above; the two answered differently than spelled are enumerated as deviations 4 and 5 rather than silently skipped.
- `git status --porcelain` carries no uncommitted work from this plan.

## Known Stubs

None. No `skip`, no `fixme`, no placeholder assertion — all 7 cases execute and assert.

---
*Phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines*
*Completed: 2026-08-29*
