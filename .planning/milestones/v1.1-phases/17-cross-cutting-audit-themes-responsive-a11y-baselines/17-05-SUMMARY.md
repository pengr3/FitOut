---
phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
plan: 05
subsystem: ui
tags: [design-system, accessibility, wcag, radix, shadcn, tailwind, cva, playwright, vitest]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    provides: "the `touch` size on the Button CVA (DS-09/D-22), and `brand-recipe.test.ts`'s DS-09 adoption measurement with Phase 17 named as its owner"
  - phase: 16-profile-avatar-crop
    provides: "`src/components/ui/slider.tsx`'s D1 fix (the thumb's accessible name) and `e2e/avatar-crop.spec.ts`'s rule-F8 zoom-state assertions, which read `data-disabled` and said so"
provides:
  - "Zero `<Button>` elements in `src/` hand-roll a 44px height — five sites in four files converted to `size=\"touch\"`"
  - "The DS-09 adoption gate is BLOCKING at `toBe(0)`; the one genuinely advisory gate in the design suite is gone"
  - "The measured-five-not-six correction is recorded in the gate file itself, with the offender-listing failure message retained"
  - "The zoom slider's disabled state is exposed to the accessibility tree (`aria-disabled` on the Thumb) under 17-CONTEXT D-197, with the thumb still out of the tab order"
  - "RESEARCH assumption A2 VERIFIED: `aria-disabled` makes Playwright's `toBeDisabled()` pass on a Radix Thumb without re-entering the tab order"
  - "A written prediction of five `search-*` baseline PNG changes for plan 17-14's dispatch diff"
affects: [17-06, 17-13, 17-14, baseline-dispatch, visual-regression]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A design gate whose literal outruns its measurement is a defect: flip to a zero, keep the offender list"
    - "A vendored-primitive edit names its attribute ONCE, on the line that ships it — prose describes rather than quotes, so a textual scan counts call sites"

key-files:
  created:
    - .planning/phases/17-cross-cutting-audit-themes-responsive-a11y-baselines/deferred-items.md
  modified:
    - src/components/search/search-bar.tsx
    - src/components/group/group-refresh.tsx
    - src/components/group/regenerate-link-button.tsx
    - src/components/group/remove-attendee-button.tsx
    - tests/design/brand-recipe.test.ts
    - src/components/ui/slider.tsx
    - e2e/avatar-crop.spec.ts

key-decisions:
  - "The DS-09 gap was FIVE sites in four files, not the six the gate's literal claimed — the gate had been passing at 5 against a ceiling of 6 and would have kept passing if a sixth appeared"
  - "The four `<SelectTrigger>` sites in `search-bar.tsx` were NOT converted: they expose no `touch` size, and converting them is the WR-01 error the gate file names"
  - "`size=\"touch\"` was NOT made a responsive default (D-22 stands)"
  - "`aria-disabled={props.disabled || undefined}`, never `|| false` — React renders a literal false as the string \"false\", announcing a false negative on every enabled slider"
  - "The disabled thumb STAYS out of the tab order (D-197): an inert control need not be a keyboard stop, it merely may not be invisible to AT"
  - "No advisory leak gate exists to flip — `eslint.config.mjs:147` is `\"error\"` and `leak.test.ts` has zero skips, zero allowlist, no advisory branch. Roadmap SC#3 is satisfied by the DS-09 ceiling alone. Recorded, not manufactured into work."

patterns-established:
  - "Measure the gap before you close it: the pre-conversion count was reproduced through the gate's own walker/regex/stripComments over the HEAD~1 tree, not asserted from the plan"
  - "Predict the baseline delta in writing before the dispatch, so the diff is read rather than accepted"

requirements-completed: []  # GATE-02 ADVANCED, not closed — see § Requirements

# Metrics
duration: 33 min
completed: 2026-08-29
---

# Phase 17 Plan 05: Mechanical Conformance — DS-09 Adoption and D-197's Slider Summary

**Five hand-rolled `h-11` Buttons converted to the declared `size="touch"`, the DS-09 adoption gate flipped from a forgotten `toBeLessThanOrEqual(6)` to a blocking `toBe(0)` with the measured five-not-six gap recorded in the file, and `aria-disabled` put on the Radix slider thumb so the zoom row's disabled state reaches assistive technology.**

## Performance

- **Duration:** 33 min
- **Started:** 2026-08-29T08:00:00Z
- **Completed:** 2026-08-29T08:33:12Z
- **Tasks:** 3
- **Files modified:** 7 (+1 created)

## Accomplishments

- **DS-09 adoption closed at zero.** Five `<Button>` elements in four files now take their 44px height from the CVA `touch` size instead of a per-call-site class. `tests/design/brand-recipe.test.ts`'s scan over all of `src/` returns **0** hand-rolled heights.
- **The one genuinely advisory design gate is now blocking.** `toBeLessThanOrEqual(6)` → `toBe(0)`, with the offender-listing failure message retained so a future red names the site that regressed.
- **The gate's own gap is written into the gate.** The literal said 6; the tree measured 5. That is recorded in the rewritten comment block, along with why it matters (the gate would have absorbed a sixth site silently).
- **D-197 shipped.** `aria-disabled={props.disabled || undefined}` on `SliderPrimitive.Thumb`, annotated in the D1 docblock's voice. Both e2e zoom-state assertions now read the accessibility tree; the `tabindex` half is unchanged and argued.
- **RESEARCH assumption A2 is no longer an assumption.** `e2e/avatar-crop.spec.ts` is 33/33 green with `toBeDisabled()` / `.not.toBeDisabled()` — `aria-disabled` satisfies Playwright's non-native disabled check without putting the thumb back in the tab order.

## Task Commits

1. **Task 1: Convert the five hand-rolled `h-11` Buttons to `size="touch"`** — `baffe77` (refactor)
2. **Task 2: Flip the DS-09 ceiling to zero and record the measured five-not-six** — `68b10b0` (test)
3. **Task 3: D-197 — expose the slider's disabled state, and flip both e2e assertions** — `475af83` (fix)

**Plan metadata:** see the `docs(17-05)` commit that carries this file.

## Files Created/Modified

- `src/components/search/search-bar.tsx` — the date and price popover triggers (`:327`, `:428`) take `size="touch"`; `h-11` removed from both `cn()` strings. The four `<SelectTrigger>` sites are byte-unchanged.
- `src/components/group/group-refresh.tsx` — the load-failure retry takes `size="touch"`; its `className="h-11"` is gone entirely (it held nothing else).
- `src/components/group/regenerate-link-button.tsx` — converted; the stale `"h-11 clears the 44px touch target"` comment rewritten to name the declared size and the +12px padding consequence.
- `src/components/group/remove-attendee-button.tsx` — converted; `px-3` retained and its load-bearing role documented; the same stale comment rewritten.
- `tests/design/brand-recipe.test.ts` — DS-09 assertion at `toBe(0)`; the `it()` title and the two comment blocks rewritten; the offender-list failure message untouched.
- `src/components/ui/slider.tsx` — `aria-disabled` on the Thumb plus a D-197 docblock. **The phase's one sanctioned vendored edit.**
- `e2e/avatar-crop.spec.ts` — the two rule-F8 state assertions flipped; the block comment and the file-header paragraph that argued for `data-disabled` rewritten.
- `.planning/phases/17-.../deferred-items.md` — **created**; one row (the `pick()` helper's unguarded strict-mode locator).

## The measurement this plan owes plan 17-14

**Predicted baseline PNG changes — five.** `size:default` is `px-2.5`; `size:touch` is `px-4`. Four of the five conversions therefore gain **+12px of horizontal padding**, and two of those are inside `w-full min-w-[150px]` / `min-w-[130px]` controls on the search bar at the 320px floor, which moves the truncate point:

| Baseline | Expected |
|---|---|
| `search-results-320` | **CHANGE** |
| `search-results-768` | **CHANGE** |
| `search-results-1280` | **CHANGE** |
| `search-relax-band-320` | **CHANGE** |
| `search-relax-band-1280` | **CHANGE** |
| `group-refresh` / `regenerate-link` / `remove-attendee` | none — all render on `/bookings/[id]/group`, whose baseline rows are `blocked` |

`remove-attendee-button.tsx` is the **zero-width-change** conversion: `px-3` stays in its `className` and tailwind-merge keeps it over the variant's `px-4`.

**Read this diff at the dispatch; do not accept it.** Five changed `search-*` PNGs is the prediction. A sixth changed PNG, or a change on a non-`search-*` row, is a finding — not this plan's padding.

## The DS-09 gap, measured rather than quoted

The literal at `brand-recipe.test.ts:759` was `6`. Reproduced through the gate's **own** walker, `BARE_TOUCH_HEIGHT` regex, `enclosingButtonTag` and `stripComments`, run over the `HEAD~1` copies of the four files:

```
COUNT=5
  search-bar.tsx        <Button type="button" id="search-date"  variant="outline" …
  search-bar.tsx        <Button type="button" id="search-price" variant="outline" …
  group-refresh.tsx     <Button type="button" variant="outline" className="h-11" …
  regenerate-link-button.tsx  <Button variant="outline" className="h-11 w-full sm:w-auto">
  remove-attendee-button.tsx  <Button variant="outline" className="h-11 px-3" …
```

Post-conversion, the same scan over the **whole** `src/` tree returns `COUNT=0`. Only those four files changed, so the pre-conversion tree-wide count was exactly 5.

**So the gate had been passing at 5 against a ceiling of 6, and would have kept passing if a sixth site appeared.** That is the shape the file's own docblock warns about — a ceiling that reads as a considered decision and is a forgotten one — and it is now recorded in the gate rather than in a plan nobody will re-open.

## The advisory-leak-gate finding: there is nothing to flip

Roadmap SC#3 asks for *"the leak tests flipped from advisory to blocking."* Measured on this tree, 2026-08-29:

| Gate | Measured posture | Action |
|---|---|---|
| `eslint.config.mjs:147` | `{ [LEAK_DISABLE_RULE_ID]: "error" }` | none — already blocking |
| `tests/design/leak.test.ts` | zero `.skip`/`.todo`, zero allowlist, zero `toBeLessThan`, no advisory branch | none — already blocking |
| `package.json` `build` | `npm run lint && npm run test:design && next build` | both gates run in the build |
| `tests/design/brand-recipe.test.ts:721` DS-09 ceiling | the **one** advisory instance | **flipped to `toBe(0)`** |

`git diff --name-only e439bf9 HEAD -- eslint.config.mjs tests/design/leak.test.ts` returns **0 files**. A plan that goes looking for advisory leak tests and finds none has found that Phase 10 did its job. Recorded; no work manufactured from it.

## Decisions Made

See frontmatter `key-decisions`. The two worth restating:

1. **The four `<SelectTrigger>` sites in `search-bar.tsx` (`:291`, `:377`, `:402`, `:477`) were left alone.** They expose no `touch` size — `brand-recipe.test.ts:727-729` already records that — and converting them is precisely the WR-01 error the gate file's own docblock names. `grep -c 'SelectTrigger'` is 9 before and after, and the diff touches no `SelectTrigger` line.
2. **`|| undefined`, not `|| false`.** React renders a literal `false` into an `aria-*` attribute as the string `"false"`, which would announce "this control is not disabled" on every enabled slider in the app. An explicit false negative in the accessibility tree is worse than an absent attribute — T-17-20 in the threat register, mitigated by the idiom `thumbLabel` two lines above already uses.

## Deviations from Plan

### Measurement corrections to the plan's own acceptance criteria

**1. [Rule 1 - Bug] `grep -c 'size="touch"' src/components/search/search-bar.tsx` cannot return `2`; it returns `3`.**
- **Found during:** Task 1
- **Issue:** The criterion counted only the two conversions. `search-bar.tsx:504` already carried `size="touch"` on the coral submit CTA before this plan — a pre-existing, correct adoption.
- **Resolution:** The criterion's intent (both target sites adopt the declared size) is satisfied at 3 = 2 new + 1 pre-existing. No code was changed to satisfy the literal number; changing the shipped CTA to make a grep count match would be the tail wagging the dog.
- **Verification:** `grep -n 'size="touch"' src/components/search/search-bar.tsx` → `:325`, `:426`, `:506`.
- **Committed in:** `baffe77`

**2. [Rule 1 - Bug] `grep -c '"h-11' src/components/search/search-bar.tsx` cannot return `0` without violating the same task's explicit prohibition.**
- **Found during:** Task 1
- **Issue:** The criterion demands zero, but the file's four `<SelectTrigger>` sites and one `<Input>` (`:448`) legitimately carry `h-11` and the task's own `<action>` forbids touching them ("Converting them would be the WR-01 error"). The two requirements are mutually unsatisfiable as literally written.
- **Resolution:** Satisfied the criterion's stated intent — *"no **target** site still carries a hand-rolled height"* — and recorded the residual measurement: `grep -c 'h-11'` returns **5**, all five on non-`<Button>` primitives that expose no `touch` size (`:291`, `:378`, `:403`, `:479` `<SelectTrigger>`; `:448` `<Input>`). The authoritative gate — `brand-recipe.test.ts`'s per-**element** scan — returns 0, which is the property that actually matters and is now blocking.
- **Verification:** design suite green at `toBe(0)`; the per-element walker is what distinguishes a `<Button>` from a `<SelectTrigger>`, which is why the gate is written that way and a file-level grep is not.
- **Committed in:** `baffe77` / `68b10b0`

**3. [Rule 1 - Bug] `grep -c 'toBeDisabled' e2e/avatar-crop.spec.ts` cannot return `2`; it returns `4`.**
- **Found during:** Task 3
- **Issue:** The file already contained two `toBeDisabled()` assertions on **native** controls (`:1015`, `:2414`) before this plan, plus a header-comment mention.
- **Resolution:** The two **new** flipped assertions are exactly 2 (`:867` `.toBeDisabled()`, `:877` `.not.toBeDisabled()`), which is the criterion's intent. The header mention was removed as part of deviation 4 below, taking the count from 5 to 4.
- **Committed in:** `475af83`

### Auto-fixed issues

**4. [Rule 1 - Bug] A third stale comment — the file header of `e2e/avatar-crop.spec.ts` — also argued for the invalidated mechanism.**
- **Found during:** Task 3
- **Issue:** The plan named the block comment at `~:848`. Lines `:79-83` of the **file header** carried the same now-false claim ("The thumb still exposes no `aria-disabled` … which … would report every state as enabled"), stated as an open deferred item. A comment arguing against the mechanism the file now uses is the defect class 17-UI-SPEC's "may fix in place" table explicitly sanctions correcting.
- **Fix:** Rewritten to record that D1's other half is closed by D-197, that the state assertions moved to the accessibility tree, and that the `tabindex` assertion deliberately did not move.
- **Verification:** `grep -c 'would report every state as enabled'` → 0; spec 33/33 green.
- **Committed in:** `475af83`

**5. [Rule 2 - Missing critical] The D-197 docblock describes the attribute rather than quoting it.**
- **Found during:** Task 3
- **Issue:** The task requires both an annotation in the D1 docblock's voice *and* `grep -c 'aria-disabled' src/components/ui/slider.tsx == 1`. A docblock that spells the attribute breaks the count — and, more importantly, makes prose textually indistinguishable from a call site for any future scan.
- **Fix:** The docblock says "the ARIA attribute on the Thumb below" and carries a `NAMED ONCE, ON THE LINE THAT SHIPS IT` paragraph explaining the discipline. This is the repo's established convention, not an invention: `button.tsx` note 5 and `contrast-pairs.ts` do the same for the same reason, and `avatar-crop.spec.ts:94-97` states the precedent verbatim.
- **Verification:** `grep -c 'aria-disabled' src/components/ui/slider.tsx` → **1**, on the line carrying `|| undefined`.
- **Committed in:** `475af83`

---

**Total deviations:** 5 (3 acceptance-criterion measurement corrections, 1 stale-comment fix, 1 house-convention adaptation).
**Impact on plan:** None on scope. Every deviation is a correction to a plan-side count or a sanctioned stale-comment fix; no product behaviour was changed beyond the two the plan mandates, and the three unsatisfiable criteria were each satisfied at their stated intent with the residual measurement recorded here rather than glossed.

## Issues Encountered

**One e2e flake, investigated and cleared — it is not this plan's.** On the first post-change full-file run, `e2e/avatar-crop.spec.ts:742` (`corrupt.jpg is refused before the dialog`) failed with `strict mode violation: locator('input[type="file"]') resolved to 2 elements`. Evidence it is contention, not regression:

- The **pre-change** baseline run of the same file was 33/33 green.
- The failing test **passes in isolation** (`-g "corrupt.jpg is refused"` → green).
- A **third full-file run on the final tree** was 33/33 green.
- The mechanism is impossible: a slider attribute cannot mint a second `<input type="file">`, and the failing test never opens the crop dialog.

This is the `[16-D2]` shared-fixture contention class 17-RESEARCH Pitfall 9 names, met at `pick()` (`:159`) — the one helper in the file with an unguarded strict-mode locator and no count assertion. Logged to `deferred-items.md` with the one-line fix and 17-13 named as the likely owner. **Not fixed here:** the helper is used by ~30 cases and `avatar-crop.spec.ts` is in this plan's `<files>` only for two assertions.

## Requirements

**GATE-02 is ADVANCED, not closed.** The plan's frontmatter lists `requirements: [GATE-02]`, but GATE-02 ("every surface operable by keyboard alone, with a visible focus indicator throughout") is cited by **ten** of this phase's fourteen plans (17-01, 17-02, **17-05**, 17-06, 17-07, 17-08, 17-10, 17-12, 17-13, 17-14). This plan closes one clause of it — the slider's `role`/`value` exposure under SC 4.1.2 — and nothing more. `REQUIREMENTS.md:113` and the traceability row at `:240` are deliberately left at **Pending**; completion is the phase verifier's call, not a plan's.

## Verification

Plan-level `<verification>` block, all run on the final tree:

| Check | Result |
|---|---|
| `npm run build` (lint + test:design + next build) | **exit 0** |
| `npx tsc --noEmit` | **exit 0** |
| `npm run test:design` | **66 files / 1247 passed, 3 skipped** |
| `npx playwright test e2e/avatar-crop.spec.ts --project=chromium --workers=1` | **33 passed** |
| `git diff --name-only e439bf9 HEAD -- src/components/ui/` | **1 file** (`slider.tsx`) |
| `git status --porcelain drizzle/` | **empty** (GATE-06) |
| `git diff --name-only e439bf9 HEAD -- eslint.config.mjs tests/design/leak.test.ts` | **0 files** |

Threat register: T-17-19 (one vendored file), T-17-20 (`|| undefined`, verified against a real render), T-17-21 (`toBe(0)` with the offender list, already-blocking gates untouched) — all mitigated as planned. T-17-22 and T-17-23 accepted as planned, with T-17-23's five-PNG prediction written down above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Ready for 17-06.** Nothing from this plan blocks it.
- **17-14 (baseline dispatch) has a written prediction to read the diff against** — five `search-*` PNGs, listed above. This plan was deliberately landed in wave 1 so every later 320px sweep measures post-conversion code.
- **17-13 inherits one deferred row**: the `pick()` helper's unguarded strict-mode locator in `e2e/avatar-crop.spec.ts`.
- **A note for anyone editing `src/components/ui/`**: this phase has now spent its one sanctioned vendored edit. Compose over primitives from here.

## Self-Check: PASSED

- `.planning/phases/17-.../deferred-items.md` — FOUND
- `src/components/ui/slider.tsx`, `tests/design/brand-recipe.test.ts`, `e2e/avatar-crop.spec.ts`, all four Task-1 sources — FOUND
- Commits `baffe77`, `68b10b0`, `475af83` — FOUND in `git log`
- All plan-level verification commands re-run green on the final tree (table above)

---
*Phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines*
*Completed: 2026-08-29*
