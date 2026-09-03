---
phase: 10-design-system-foundation-theme-runtime
plan: 09
subsystem: design-system
tags: [cva, button, brand-variant, wcag, source-scan-gate, ds-08, availability, tailwind-content-scan]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    plan: 01
    provides: "`npm run test:design` — the DB-free Vitest gate this plan's repo-wide scan joins (now 13 files / 226 tests, ~5s, no database)"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 03
    provides: "`--brand` and `--brand-foreground` declared identically in both theme blocks, and `--foreground` per-theme — which is what makes the darkening `color-mix` theme-portable at the four availability sites"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 06
    provides: "THE contract: `variant=\"brand\"` with the darkening `color-mix` hover, declared once in `ui/button.tsx`"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 08
    provides: "`tests/design/brand-recipe.test.ts` (8) — the booker-tree half of the gate, the walker, the Windows path normalisation and the per-file-map discipline this plan extends rather than replaces"
provides:
  - "DS-08 CLOSED: exactly 20 `<Button>` call sites carry `variant=\"brand\"`, and zero literal accent recipes remain on any button anywhere in the repo"
  - "The 9 non-Button accent recipes pinned BY NAME and BY COUNT across 6 files — the availability calendar and slot picker are now protected by a committed gate rather than by a sentence in a plan"
  - "Zero `bg-brand/90` under `src/` in every form — hover-prefixed, variant-prefixed and static — including the 5 non-Button occurrences no earlier plan owned"
  - "`tests/design/brand-recipe.test.ts` (18, was 8) — the completed DS-08 gate, watched go red on a deliberately converted slot picker"
affects: [10-11, 10-12, 10-13, 11, 17]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A contrast failure that lives in an ALPHA belongs to the recipe, not to the element. The same `/90` tint was removed from a react-day-picker DayButton, a Radix ToggleGroupItem, a bare `<button>` and a static `<span>` step marker — none of them a `<Button>` — because 4.04:1 does not care what element painted it."
    - "When a fix has two correct-looking forms and one of them silently changes a pinned count, choose the one that holds the count AND write the reason at the call site. `wizard.tsx`'s done marker takes solid `bg-brand`, not a `color-mix`, because a `color-mix` drops the pinned 9 to 8 (T-10-41)."
    - "A `/g` regex reused across `.test()` calls carries `lastIndex` and silently undercounts. A per-line scan needs its own non-global twin, or the pinned number comes back smaller and the failure looks like a successful conversion."
    - "`git checkout -- <file>` reverts to HEAD, not to the pre-experiment working tree. Running a negative-guard RED check on a file with uncommitted task edits destroys them. Copy first."
    - "The design gate's walker roots at `src/`; TAILWIND's content scan roots at the repo. Two scanners, two roots — and the 'a file that bans a string may name it' exemption only holds for the first."

key-files:
  created: []
  modified:
    - src/app/(host)/host/listings/[id]/edit/wizard.tsx   # 1 conversion + the static alpha fix on the done step marker
    - src/app/(host)/host/listings/page.tsx               # 2 conversions
    - src/app/(host)/host/page.tsx                        # 2 conversions
    - src/components/availability/availability-calendar.tsx  # hover replaced, NOT converted
    - src/components/availability/date-pass-picker.tsx       # hover replaced, NOT converted
    - src/components/availability/slot-picker.tsx            # 2 hovers replaced, NOT converted
    - src/lib/design/contrast-pairs.ts                    # prose stopped quoting the banned class
    - tests/design/brand-recipe.test.ts                   # +10 assertions (8 → 18)
    - .planning/phases/10-design-system-foundation-theme-runtime/deferred-items.md  # D-1 UPDATE

key-decisions:
  - "DS-08 is marked COMPLETE. Both of its clauses now hold and both are gated: every literal accent recipe on a button is replaced by the CVA variant (20/20, per-file maps), and the hierarchy is expressed as variants (10-06). The requirement says 19; the tree had 20. The discrepancy is recorded, not silently absorbed."
  - "DS-09 stays Pending. Two adopters of `size=\"touch\"` is not 'the standard for booker-facing primary actions and ALL mobile controls'. Nothing in this plan moved it."
  - "The 9 non-Button recipes were NOT converted, and that is now enforced rather than trusted. The gate pins them by file and by count, and was watched go red on a deliberately converted slot picker — 5 failed / 13 passed, each failure naming the file."
  - "`wizard.tsx:603`'s static alpha was fixed with the SOLID token, not a `color-mix`, and the reason is a code comment. Done-vs-current is already carried by the CheckIcon and by `aria-current=\"step\"`; a `color-mix` would have been invisible to a user and fatal to the pinned count."
  - "`src/lib/design/contrast-pairs.ts` was edited although the plan did not list it — its prose quoted the banned class twice, which made the plan's own 'zero anywhere under src/' criterion unsatisfiable. Rephrased descriptively per the standing resolution; every measured ratio kept."
  - "The one e2e failure was PROVEN pre-existing, not assumed — and it had to be, because it lands on `date-pass-picker.tsx`, a file this plan modified."

patterns-established:
  - "Pin a deliberate NON-action, not just an action. The 9 surviving lines are asserted as an exact per-file map so an over-eager future sweep fails with the broken file named, rather than a count quietly moving."
  - "Two positive controls for an exclusion rule: assert the excluded file WAS scanned and DOES contain the pattern, then assert it is absent from the result. Otherwise 'excluded' and 'never visited' are indistinguishable."

requirements-completed: [DS-08]

# Metrics
duration: 25min
completed: 2026-08-12
---

# Phase 10 Plan 09: The Host Surface, the Availability Hovers, and the Closed DS-08 Gate Summary

**The last 5 buttons take the variant, the 90%-alpha tint is deleted from the 5 places that were never buttons at all, and the 20 / 9 split stops being a claim in a spec and becomes a per-file map the suite enforces — watched go red on a deliberately broken slot picker**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-12T01:08 (+08)
- **Completed:** 2026-08-12T01:33 (+08)
- **Tasks:** 2 (`auto`, no checkpoints)
- **Files:** 0 created, 9 modified

## The count — measured against the tree first, as 10-07 and 10-08 both had to learn

Before touching anything, the tree was widened past the plan's literal:

| Widening | Result |
|---|---|
| `bg-brand` anywhere under `src/` | **18 lines** = 14 real call sites + the variant in `ui/button.tsx` + 3 PROSE references in `contrast-pairs.ts`. Exactly 10-08's 33 minus its 15 conversions. |
| any other spelling of the accent (`bg-[var(--brand)]`, hand-composed `buttonVariants(...)`) | **none** — the only `buttonVariants()` consumer is `ui/calendar.tsx`, and it passes no brand variant |
| `variant="brand"` under `src/` vs under `src/app` + `src/components` | **16 lines vs 15 occurrences** — the extra is prose in `contrast-pairs.ts:163`, which is why the repo-wide total is scoped to the two adoption trees and says so |

The plan's arithmetic held exactly, for the second plan running: **14 = 5 `<Button>` + 9 non-Button**, and 5 + 15 = the 20 the UI-SPEC names.

Final measured state:

| Metric | Before | After |
|---|---|---|
| `variant="brand"` across `src/app` + `src/components` | 15 | **20** (per-file maps pinned) |
| `variant="brand"` under `src/app/(host)` | 0 | **5** |
| non-Button `bg-brand` source lines outside `src/components/ui/**` | 9 | **9** (pinned by name across 6 files) |
| `bg-brand/90` anywhere under `src/`, any form | 7 | **0** |
| `color-mix(in_oklch,var(--brand)` under `availability/` | 0 | **4** (per-file map pinned) |
| design tests | 216 | **226** |

## Accomplishments

- **DS-08 is closed, and the last five conversions were the easy half.** The wizard's publish button and the four "Create listing" CTAs on `/host` and `/host/listings` each dropped `bg-brand text-brand-foreground hover:bg-brand/90` for `variant="brand"`. Two `className` props emptied entirely and were removed rather than left as `className=""`; the other two kept only their `mt-4`. `asChild`, `type`, `disabled` and `onClick` are all untouched.
- **The alpha ban was applied where it actually lives — in the recipe, not in the element.** This is the part earlier plans could not reach. `hover:bg-brand/90` measures **4.04:1 in court and 3.87:1 in grove** against a 4.5 bar, and the cause is mechanical: alpha over a light surface *lightens*, dragging a filled control toward its own text colour. That is true of a react-day-picker `DayButton`, a Radix `ToggleGroupItem`, a bare `<button>` and a `<span>` inside an `<ol>` — none of which is a `<Button>`. All five occurrences are gone: four hovers under `availability/` became the darkening `color-mix` with their variant prefixes (`data-[selected-single=true]:`, `data-[state=on]:`) preserved exactly, and the wizard's **static** one became the solid token.
- **The static one is the interesting case, and the plan was right to call it out.** `wizard.tsx:603` carried `bg-brand/90 text-brand-foreground` with no hover at all — the same failing pairing, permanently on screen, on the step marker for every completed step. An earlier draft of this plan set only replaced `hover:`-prefixed forms, which would have left this shipping while asserting "zero `bg-brand/90`" — an unsatisfiable criterion. The fix is **solid `bg-brand`, not a `color-mix`**, for two reasons now recorded in a comment beside it: done-vs-current is already carried by the `CheckIcon`-vs-number at `:607` and by `aria-current="step"` on the `<li>`, so a 10% tint conveys nothing a user can perceive; and keeping the line on the token is what holds the pinned count at **9** rather than silently dropping it to 8 (T-10-41).
- **The 9 survivors are now a contract, not a remainder.** 10-08's gate deliberately asserted *nothing* about them because it did not own them. This plan pins them as an exact map — `wizard.tsx` 2, `availability-calendar.tsx` 1, `date-pass-picker.tsx` 1, `slot-picker.tsx` 3, `spots-left-chip.tsx` 1, `notification-item.tsx` 1 — so a future sweep that "finishes the job" fails with the broken file named. The `it()` title carries the reason, per the plan: *a recorded deliberate non-conversion, not an oversight*.
- **The gate was watched go red, and the blast radius was exactly right.** `slot-picker.tsx`'s full-day chip was converted to a `<Button variant="brand">` — the precise sweep T-10-26 exists to stop → **exit 1, 5 failed / 13 passed**, on the slot-picker positive control (2 lines, not 3), the repo-wide adoption total (21, not 20), the surviving map, its total (8, not 9), and the availability-hover map (the converted chip took its `color-mix` with it). Every diff names the file. Reverted → **exit 0, 18 passed**. Both observations are in the test header.
- **A delete-instead-of-replace migration also goes red.** Removing a failing hover and stopping there satisfies every alpha ban perfectly while silently dropping the hover affordance from a selected day. `EXPECTED_AVAILABILITY_HOVERS` pins where the four replacements landed, per file.
- **The replacement classes were proven to COMPILE, not just to be present.** A source scan proves a string was written; only the compiler proves Tailwind emits a rule for `data-[selected-single=true]:hover:bg-[color-mix(in_oklch,var(--brand),var(--foreground)_10%)]` — a variant chain wrapped around an arbitrary value with commas in it. A clean `rm -rf .next && npm run build` emits all three distinct selectors with real `color-mix` declarations. Had it not, the "fix" would have been a silent deletion of every availability hover.
- **226/226 design tests green** (was 216), ~5s, **no database**. `npx tsc --noEmit` exit 0, `npm run build` exit 0 (twice, once from a cleared `.next`), `npm run lint` **0 errors / 9 warnings** — byte-identical to the 10-04 → 10-08 baseline. Full DB suite **1197 passed / 4 skipped / 0 failed**.
- **The regression watch holds.** `tests/booking/partial-grant-notice.test.tsx:192` asserts a `className` does *not* contain the accent background — **13/13 green** against the real database, and `[test-db] clean: no writes escaped the per-file schema isolation`.
- **The two surfaces the core value runs through still work.** `e2e/search-and-book.spec.ts:236` — search → filter → card → listing → Book → live instant hold — **passes in 18.3s**, driving real slot selection through the slot picker. That is the only mechanical check that the untouched 9 still render their selected states, and the plan was right to require it.

## The e2e failure — proven pre-existing, and it had to be

**One spec fails: `e2e/open-capacity.spec.ts:376`, the drop-in day panel not following the picked day.** This is D-6 item #1 from 10-08, unchanged.

It could not be waved through on that basis. The failing surface is the **date-pass picker** — and `src/components/availability/date-pass-picker.tsx` is a file this plan modified. "A class-string edit cannot break day selection" is exactly the reasoning that lets a real regression ship, so it was tested instead: all seven modified source files were checked out at the pre-plan commit `2db897f` and the spec re-run. It reproduced with a **byte-identical signal** — same locator, same `Saturday, Aug 15` heading, same `1 failed / 5 did not run`. Then restored, counts re-verified, design gate re-run green, working tree confirmed clean.

The full e2e run is **17 passed / 1 failed / 5 did not run** — *better* than 10-08's `15 passed / 2 failed / 6 did not run`. Two of D-6's three items (`search-and-book.spec.ts:296`'s strict-mode violation and `cancel.spec.ts:224`'s PayMongo 404) passed this run, consistent with 10-08 calling the third intermittent.

## The grep-versus-comment collision, eighth and ninth occurrences

STATE.md records this as a seven-time pattern with a standing resolution. It fired twice more here.

**Eighth — self-inflicted, and caught by the criterion itself.** The comment explaining that the wizard's step markers must never be converted said so by *quoting* `variant="brand"`. `grep -rho 'variant="brand"' 'src/app/(host)' | wc -l` immediately returned **6, not 5** — and, worse, the repo-wide total would have been 21. Resolved by naming the prop descriptively (*"the accent VARIANT prop"*), with a sentence recording *why it is phrased that way* so the next editor does not paste the literal back as a documentation improvement.

**Ninth — pre-existing, in a file this plan did not own.** Task 2's criterion requires `grep -rc "bg-brand/90" src/ | grep -v ":0$"` to produce no output. It produced two lines: `src/lib/design/contrast-pairs.ts:67` and `:289`, both **prose documenting the very measurement that condemns the class**, shipped by an earlier plan.

Two options, and the choice matters. Carving `src/lib/design/**` out of the ban would have made the criterion pass while leaving a hole a real re-introduction could hide in. Instead the prose was rephrased — *"a 90%-ALPHA tint of the accent"* — keeping 4.04 / 3.87 / 5.41 / 5.36 in full, so the ban is literally true with **no exception at all**. No test asserts on those `note` strings (checked before editing). A paragraph was added explaining why the class is described rather than quoted, so the next reader does not restore it.

## The tenth blind spot, newly measured: two scanners, two roots

The phase's standing rule is *"a file whose job is to ban a string is allowed to name it, because `tests/` is outside the scanned tree."* That is true of **the design gate's** walker, which roots at `src/`. It is **not** true of **Tailwind's** content scan, which roots at the repo and reads every tracked file.

Because this is the first plan to remove the *last* source usage of the accent alpha, the consequence became measurable rather than theoretical. After a clean `rm -rf .next && npm run build` — verified clean, not cached: the rebuilt stylesheet is byte-identical at 133,801 bytes — the shipped CSS still contains **8 rules across 4 selectors** for a class that exists in no component:

```
.bg-brand\/90                                                                          (× 2)
.hover\:bg-brand\/90:hover                                                             (× 2)
.data-\[selected-single\=true\]\:hover\:bg-brand\/90[data-selected-single=true]:hover  (× 2)
.data-\[state\=on\]\:hover\:bg-brand\/90[data-state=on]:hover                          (× 2)
```

**770 bytes, 0.58% of the stylesheet.** The provenance is provable rather than inferred: the variant-prefixed form appears in exactly ONE tracked non-`src/` file — **`10-09-PLAN.md:140`, the line instructing the executor to delete it.** The plan document that orders the removal is what keeps the removed rule in the bundle. The other three come from the two design test files that must name the literal in order to ban it.

Nothing is broken — no element carries these classes, and Tailwind would emit the utility on demand anyway. But any future assertion of the shape *"the banned recipe is absent from the compiled output"* is unsatisfiable by construction while this holds, **which is precisely why this gate is a source scan.** Logged as a third sighting under deferred item **D-1** (10-04 found the mechanism, 10-07 demonstrated it, 10-09 priced it); not fixed, because the fix is an `@source` narrowing in `globals.css`, a file outside this plan's scope and owned by 10-12.

## Task Commits

1. **Task 1: The 5 host conversions and the wizard step marker** — `6966910` (refactor)
2. **Task 2: The 4 availability hovers and the closed DS-08 gate** — `6a47e92` (feat)

**Plan metadata:** see the `docs(10-09)` commit that carries this file.

## Files Created/Modified

- **The three host files — modified.** Pure props edits: colour classes leave `className`, `variant="brand"` joins the element, every layout class stays. `wizard.tsx` additionally carries the step-marker fix and a 19-line comment recording why the marker is not a Button, why the fix is the solid token, and why the two-line form and the pinned count are load-bearing.
- **The three availability files — modified.** No conversions, by design. Four `hover:bg-brand/90` occurrences became the darkening `color-mix`, variant prefixes preserved character-for-character. Each site gained a comment naming what the element actually is (`DayButton` className, day chip, `ToggleGroupItem`, bare `<button>`) so the next reader does not have to re-derive why it was skipped. The `bg-brand/10` soft-accent tints at `slot-picker.tsx:248` and `spots-left-chip.tsx:64` are untouched — declared pairings that pass, carrying `text-foreground` rather than `text-brand-foreground`.
- **`src/lib/design/contrast-pairs.ts` — modified** (not in the plan's file list; see Deviations). Two prose quotations of the banned class rephrased descriptively, all measurements retained, plus a paragraph explaining why.
- **`tests/design/brand-recipe.test.ts` — modified, 8 → 18 assertions.** 10-08's booker-tree blocks are untouched; four new `describe` blocks were appended and the header rewritten from "deliberately partial" to the completed scope. New machinery: `ADOPTION_TREES`, `EXPECTED_SURVIVING_ACCENT_LINES`, `EXPECTED_AVAILABILITY_HOVERS`, a `BANNED_ALPHA_HOVER` regex whose leading `[^\s"'`]*` catches every prefix form in one pattern, and `UNMEASURED_ACCENT_ALPHA`, which bans every alpha on the accent background *except* the measured `/10` — deliberately narrower than a blanket ban, which would have deleted a shipped soft accent.
- **`deferred-items.md` — modified.** D-1 UPDATE, above.

## Decisions Made

- **DS-08 is marked complete; DS-09 is not.** DS-08 has two clauses and both now hold under a committed gate: the literal recipes are replaced (20/20, per-file maps, zero remaining in any spelling) and the hierarchy is expressed as variants (10-06). DS-09 says `touch` *"is the standard for booker-facing primary actions and all mobile controls"* — it has two adopters, and this plan added none.
- **The requirement says 19 recipes; the tree had 20.** Recorded rather than absorbed. The UI-SPEC's § *The 29 / 20 / 9 split* already carries the corrected figure and names all 20 sites; REQUIREMENTS.md's 19 is a stale count from before that inventory. Marking DS-08 complete against 20 conversions is the honest reading — the clause is about literal recipes being replaced, and none survives.
- **A per-line scan got its own non-global regex.** `ACCENT_BACKGROUND` is `/g`, and `.test()` on a `/g` regex advances `lastIndex` between calls. Reusing it inside a `.filter()` would have matched line 1, resumed mid-file on line 2, missed it, reset, matched line 3 — undercounting by roughly half. The pinned 9 would have come back as some smaller number that looked like a successful conversion. `ACCENT_BACKGROUND_LINE` exists solely to avoid that, and the comment says why.
- **The exclusion rule got two positive controls.** Asserting `ui/button.tsx` is absent from the surviving map proves nothing on its own — an unvisited file is also absent. So the gate asserts the file **was scanned** and **does contain** the accent, *then* that it is excluded. Same shape for `slot-picker.tsx`, which is asserted present with exactly 3 lines.
- **The compiled stylesheet was inspected, not assumed.** Three variant-prefixed arbitrary values with commas inside the brackets is exactly the shape that silently fails to compile. It compiles; verified from a cleared `.next`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] A comment quoting the variant prop broke the criterion counting it (eighth occurrence)**

- **Found during:** Task 1
- **Issue:** The comment explaining that the wizard's step markers must never be converted quoted `variant="brand"`. `grep -rho 'variant="brand"' 'src/app/(host)' | wc -l` returned **6, not 5**, and the repo-wide total would have read 21.
- **Fix:** The prop is named descriptively, per STATE.md's standing resolution, with a sentence recording *why* so a future editor does not restore the literal as a documentation improvement.
- **Files modified:** `src/app/(host)/host/listings/[id]/edit/wizard.tsx`
- **Verification:** the criterion returns 5; the repo-wide total returns 20.
- **Committed in:** `6966910`

**2. [Rule 3 - Blocking] Task 2's repo-wide criterion was unsatisfiable against prose in a file the plan did not list (ninth occurrence)**

- **Found during:** Task 2
- **Issue:** *"`grep -rc "bg-brand/90" src/ | grep -v ":0$"` produces no output"* returned two lines from `src/lib/design/contrast-pairs.ts` — both prose documenting the 4.04 / 3.87 measurement, shipped by an earlier plan and not in this plan's `files_modified`.
- **Fix:** Rephrased descriptively rather than carving `src/lib/design/**` out of the ban, so the ban holds with no exception for a re-introduction to hide behind. Every ratio kept; a paragraph added explaining why the class is described rather than quoted. Confirmed beforehand that no test asserts on those `note` strings.
- **Files modified:** `src/lib/design/contrast-pairs.ts`
- **Verification:** the criterion produces no output; `contrast.test.ts` and the full design gate stay green.
- **Committed in:** `6a47e92`

**3. [Rule 1 - Bug] A `/g` regex reused in a per-line `.test()` would have undercounted the pinned 9**

- **Found during:** Task 2, writing the surviving-lines scan
- **Issue:** `ACCENT_BACKGROUND` carries the `g` flag, so `.test()` advances `lastIndex` and skips matches on subsequent lines. The count would have returned low, and a low count on a "how many survive" assertion reads exactly like a successful conversion.
- **Fix:** A non-global twin, `ACCENT_BACKGROUND_LINE`, with the failure mode written above it.
- **Files modified:** `tests/design/brand-recipe.test.ts`
- **Committed in:** `6a47e92`

**4. [Rule 3 - Blocking] The negative-guard revert discarded uncommitted task edits**

- **Found during:** Task 2, reverting the deliberate slot-picker conversion
- **Issue:** `git checkout -- src/components/availability/slot-picker.tsx` restores **HEAD**, not the pre-experiment working tree. HEAD was Task 1's commit, which does not touch that file — so the revert silently took Task 2's two `color-mix` replacements with it.
- **Fix:** Restored from a copy taken before the experiment, then re-verified all four counts and re-ran the gate to 18 green before committing. A note was added to the test header so whoever repeats the RED check does not lose work the same way.
- **Files modified:** `src/components/availability/slot-picker.tsx` (restored)
- **Committed in:** `6a47e92`

### Out of Scope — Logged, Not Fixed

**deferred-items.md D-1 UPDATE — 770 bytes of orphan CSS, priced.** Third sighting of Tailwind's repo-rooted content scan emitting utilities from prose; the first with a measurement, because this is the first plan to remove the last source usage of the class in question. Pre-existing, not caused by anything here, and the fix (`@source` narrowing in `globals.css`) is owned by 10-12 and touches a file outside this plan's scope. Full detail in the section above.

**D-6's remaining e2e failure — reconfirmed pre-existing by re-running against `2db897f`.** Not fixed, per the scope boundary; it is a drop-in booking-flow or fixture issue, not a design-system concern, and the date-pass picker's own component test is green in the 1197-test suite.

---

**Total deviations:** 4 (1× Rule 1, 3× Rule 3). No Rule 4 checkpoint was needed — every source edit was a class-string or props change inside files this phase already owns, plus one prose rephrase justified by the plan's own acceptance criterion.

## Known Stubs

None. Every converted call site resolves through `variant="brand"` to `--brand` / `--brand-foreground`; every surviving token class resolves to the same tokens; and all four replacement hovers were confirmed to emit real `color-mix` declarations in a clean production build.

## Threat Flags

None. This plan edits class strings and adds props — no network endpoint, auth path, file access pattern or schema at a trust boundary was touched. **T-10-25** (the alpha ban, hover AND static) is now mitigated exactly as the register specified: zero occurrences under `src/` in any form, plus a ≥4 `color-mix` floor under `availability/` so a delete-instead-of-replace goes red. **T-10-26** (converting the availability surfaces) is mitigated by the pinned 6-file / 9-line map, observed red on a deliberately converted `slot-picker.tsx`. **T-10-41** (the count coupling at `wizard.tsx:603`) was *accepted* by the plan and is mitigated by construction: the contrast failure is fixed while the line stays on the token, and the reasoning is a code comment so a future edit knows the count is load-bearing.

## Verification Evidence

| Check | Result |
|---|---|
| `npm run test:design -- brand-recipe` | **18/18 passed** (was 8), 0.46s |
| Negative-guard RED check (`slot-picker.tsx` full-day chip converted to a brand Button) | **exit 1, 5 failed / 13 passed**, on exactly the five assertions that should care — reverted, **exit 0, 18 passed** |
| `npm run test:design` (full gate) | **226/226 passed** (was 216), ~5s, **no database** |
| `grep -rho 'variant="brand"' src/app src/components \| wc -l` | **20** |
| `grep -rho 'variant="brand"' 'src/app/(host)' \| wc -l` | **5** |
| `grep -rn 'bg-brand' src/app src/components --include=*.tsx \| grep -v 'src/components/ui/' \| wc -l` | **9**, across exactly 6 files |
| `grep -rc "bg-brand/90" src/ \| grep -v ":0$"` | **no output** |
| `grep -rc 'color-mix(in_oklch,var(--brand)' src/components/availability \| awk -F: '{s+=$2} END {print s}'` | **4** (1 / 1 / 2, map pinned) |
| `grep -c 'bg-brand' wizard.tsx` / `grep -c 'CheckIcon' wizard.tsx` | **2** / **5** (≥2 required) |
| `grep -rl 'bg-brand' host/listings/page.tsx host/page.tsx` | no output |
| Compiled CSS after `rm -rf .next && npm run build` | all 3 distinct `color-mix(in oklch,var(--brand)` selectors emitted with real declarations |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0 (twice — incremental and from a cleared `.next`, byte-identical output) |
| `npm run lint` | **0 errors, 9 warnings** (unchanged baseline) |
| `npm run db:up && npm run db:test:setup && npm test` | **1197 passed / 4 skipped / 0 failed** (132 files) |
| `npx vitest run partial-grant-notice` (regression watch) | **13/13**; `:192`'s negative assertion holds; no writes escaped schema isolation |
| `npm run test:e2e` | **17 passed / 1 failed / 5 did not run** — better than 10-08's 15/2/6. The single failure is D-6 #1, **proven pre-existing** by checking all 7 modified files out at `2db897f` and reproducing an identical signal. |
| `e2e/search-and-book.spec.ts:236` (real slot selection through the untouched picker) | **passed**, 18.3s |

## Self-Check: PASSED

- All 9 claimed files exist on disk and carry the asserted content: 20 `variant="brand"`, 9 surviving accent lines across 6 files, 0 `bg-brand/90`, 4 availability `color-mix` hovers.
- Commits `6966910` and `6a47e92` are both present in `git log`.
- No file deletions in either commit (`git diff --diff-filter=D` empty for both).
- Working tree clean after the pre-plan e2e comparison — all 7 temporarily reverted files restored to their committed content, every count re-measured, and the design gate re-run to 226 green.
