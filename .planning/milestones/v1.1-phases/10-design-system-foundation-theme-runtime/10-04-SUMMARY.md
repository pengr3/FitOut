---
phase: 10-design-system-foundation-theme-runtime
plan: 04
subsystem: design-system
tags: [design-system, tokens, typography, elevation, z-index, motion, accessibility, reduced-motion, tailwind-v4]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    plan: 01
    provides: "`npm run test:design` — the DB-free Vitest gate the three new test files run under"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 02
    provides: "`readThemeTokens()` / `readGlobalTokens()` (the globals.css parser) and `compileGlobalsCss()`"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 03
    provides: "the two `[data-theme]` blocks this plan extends, and the 24-key equality test the new tokens had to survive"
provides:
  - "`src/app/globals.css` — four named `--text-*` roles behind var(), Tailwind's built-in ladder re-declared per theme, and the `--font-weight-*` / `--tracking-*` / `--leading-*` families that make grove's headings actually render heavier"
  - "Three named elevation steps (`shadow-raised` / `shadow-overlay` / `shadow-sticky`) that are theme-aware, which Tailwind's literal default `shadow-*` can never be"
  - "A NEW plain `:root { … }` block — the four-step z scale and the ≤320ms motion budget D-05 keeps global. This closes 10-03's deferred `readGlobalTokens()` throw."
  - "`--default-transition-duration` / `--default-transition-timing-function` — the zero-edit lever that retunes every bare `transition-*` utility in the app"
  - "The global `prefers-reduced-motion` reset in `@layer base` (DS-04) — the repo had ZERO reduced-motion handling before this"
  - "`globals.css`'s `outline-ring/50` is gone — the colour source for the 3 `focus-visible:outline-1` sites is now solid (the stylesheet half of DS-05)"
  - "`compileGlobalsCssWith(utilities)` — a safelisted compile, so a compiled-CSS assertion on a not-yet-migrated utility is possible at all"
  - "`tests/design/type-scale.test.ts` (17), `tests/design/elevation-z.test.ts` (13), `tests/design/motion-budget.test.ts` (19)"
affects: [10-05, 10-06, 10-07, 10-11, 10-12, 10-14, 10-16, 10-17, 11, 17, 18]

# Tech tracking
tech-stack:
  added: []   # no dependency installed; every change is CSS or a test
  patterns:
    - "A named step is FOUR lines, not one: size, leading, tracking and weight, each behind a per-theme var(). A role that only controls size is not a role."
    - "Anything a co-located utility can beat must itself be a per-theme token — the fix for 156 call sites is 10 token declarations, not 156 edits."
    - "Test-time safelisting (`@source inline`) rather than a shipped safelist: `globals.css` stays the token contract, and the forcing is visible at the assertion that depends on it."
    - "Positive controls for presence assertions: a step that was never declared (`text-figure`, `shadow-floating`) is safelisted alongside the real ones and must still be absent."

key-files:
  created:
    - tests/design/type-scale.test.ts
    - tests/design/elevation-z.test.ts
    - tests/design/motion-budget.test.ts
    - .planning/phases/10-design-system-foundation-theme-runtime/deferred-items.md
  modified:
    - src/app/globals.css               # all three tasks
    - tests/design/helpers/compile-css.ts  # + compileGlobalsCssWith()

key-decisions:
  - "Tailwind emits a utility only when its content scan finds the class name, and nothing in `src/` says `text-display` or `shadow-overlay` yet — the migrations are later plans. So the plan's compiled-CSS acceptance criteria were unreachable through `compileGlobalsCss()`. Added `compileGlobalsCssWith(utilities)`, which appends `@source inline(…)` at TEST time rather than shipping a safelist in the stylesheet."
  - "Tailwind's automatic source detection scans `.planning/**/*.md`, so PROSE emits utilities: the bundle carries `.bg-zinc-50` (a leak-gate fixture example in 10-RESEARCH.md) and `.outline-ring\\/50` (the anti-pattern this plan deletes), neither present anywhere in `src/`. Pre-existing, out of scope, logged to `deferred-items.md` and flagged to 10-12."
  - "The global z and motion tokens went into a new plain `:root` rule after both theme blocks. A theme-block home either breaks THEME-02's key-set equality (one theme) or claims they travel (both) — and a per-theme z-index lets one theme reorder the app's layers. The test asserts the four z names appear in NEITHER theme block."
  - "`requirements.mark-complete` run for DS-04 only, of five claimed IDs — DS-02, DS-03 and DS-05 each have a second half this plan does not own, and THEME-02 needs the next-themes runtime."

patterns-established:
  - "Every presence assertion in the design gate now carries a control that proves absence is still reachable — a safelist that can fabricate a rule makes the whole section vacuous."
  - "A cascade fact that only a compiler can see is asserted against compiled output; a structural fact about the authored file is asserted against the source. Neither is asserted through jsdom."

requirements-completed: [DS-04]

# Metrics
duration: 20min
completed: 2026-08-11
---

# Phase 10 Plan 04: Type, Elevation, Z-Index and Motion Summary

**Grove now differs from court on all four of colour, shape, type and depth — and a user who has asked for reduced motion gets none of it, app-wide, from a single rule that did not exist in this repo in any form before today**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-11T15:09Z
- **Completed:** 2026-08-11T15:30Z
- **Tasks:** 3 (all `auto`, no checkpoints)
- **Files:** 4 created, 2 modified

## Accomplishments

- **The type scale is a token contract, and the part that makes it work is the part that looks unnecessary.** Four named roles (display / heading / body / label) exist as four lines each — size, leading, tracking and weight, every one behind a per-theme `var()`. But the roles alone would have produced two themes with **identical headings**, silently: `.text-heading` emits `font-weight: var(--tw-font-weight, <role weight>)`, and a co-located `font-semibold` sets `--tw-font-weight` and wins. This repo ships **98** of those, plus 34 `tracking-tight` and 24 `leading-tight`. So `--font-weight-*`, `--tracking-*` and `--leading-*` are per-theme tokens too. **The fix for 156 call sites is 10 declarations per theme, and zero component edits.**
- **Tailwind's built-in ladder travels as well**, which is what collapses DS-02 from a 400-site migration into a token change: `--text-xs` … `--text-2xl` are var-referencing inside their generated utilities, so re-declaring the six per theme re-skins **all 399 existing `text-*` call sites** for free.
- **Three named elevation steps exist, and they are load-bearing rather than a naming preference.** Tailwind's default `shadow-sm` / `shadow-md` / `shadow-lg` compile to **literal** values — `--tw-shadow: 0 4px 6px -1px var(--tw-shadow-color, rgb(0 0 0 / 0.1)), …` — not to a `var()` reference, so a theme block redeclaring `--shadow-md` does exactly nothing and any surface left on it is frozen against every theme forever. Verified in the compiled output: `.shadow-raised` emits `--tw-shadow: var(--elevation-raised)`. Grove's steps are roughly double the blur and spread and are tinted to the theme's own ink hue, so depth reads as part of the theme rather than a grey wash laid over it.
- **The global block D-05 requires now exists**, as a plain `:root { … }` rule sitting after both theme blocks: the four-step z scale (10 / 20 / 30 / 40) and the motion budget (120 / 200 / 320ms plus one standard easing). This **closes 10-03's deferred issue** — `readGlobalTokens()` threw against the live stylesheet because there was no longer a rule whose selector is exactly `:root`, and this is the shape the parser was written for.
- **Every bare `transition-*` utility in the app was retuned with two lines.** `--default-transition-duration` and `--default-transition-timing-function` are the fallbacks Tailwind's transition utilities read; verified compiled: `.transition-colors` now emits `transition-duration: var(--tw-duration, var(--motion-fast))`.
- **DS-04's reduced-motion reset is in force, and the repo had literally none before.** One `@media (prefers-reduced-motion: reduce)` rule in `@layer base` over `*, *::before, *::after`, with `!important` on all four properties. The `!important` and the presence of `animation-iteration-count` are the two details that matter: they are what also neutralise the `tw-animate-css` keyframes (`animate-in` ×8, `zoom-in-95` ×7, `slide-in-from-*` ×20) and the Radix `data-state` animations, which a token-only reset misses entirely.
- **`globals.css`'s `outline-ring/50` is gone.** It set `outline-color` only — no width, no style — so it rendered nothing on its own and looked harmless, while being the colour source for the 3 `focus-visible:outline-1` sites at a composited **1.54:1**.
- **165/165 design tests green** (was 116 before this plan), `tsc --noEmit` exit 0, `npm run build` exit 0, lint byte-identical to the 10-03 baseline.

## The one thing that did not work as written, and what it changed

The plan's compiled-CSS acceptance criteria — "assert the compiled `.text-display` rule sets all four properties", "assert `.shadow-raised` references `var(--elevation-`" — **were not reachable through `compileGlobalsCss()`**. Tailwind v4 emits a utility only when its content scan finds the class name somewhere in the working tree, and **nothing in `src/` says `text-display` or `shadow-overlay` yet**; those call-site migrations are plans 10-05 through 10-07. Measured directly: `.text-9xl` and `.duration-300` are absent from today's compiled output for exactly this reason.

The claim actually worth asserting is *"IF a component uses this step, it compiles to a `var()` reference and therefore re-skins per theme"*. `compileGlobalsCssWith(utilities)` states that `if` explicitly, in the test, by appending Tailwind's own `@source inline(…)` safelist — rather than shipping a safelist in `globals.css`, which would put a build directive in the file that is supposed to be nothing but the token contract. Each block that uses it carries a positive control: `text-figure` and `shadow-floating` are safelisted alongside the real steps and **must still be absent**, because the content scan cannot emit a utility whose `@theme` key was never declared. That control is what keeps the section from proving something about the safelist instead of about `@theme`.

## Task Commits

1. **Task 1: Named type steps plus per-theme type, weight, tracking and leading** — `b76a77e` (feat)
2. **Task 2: Three elevation steps, the four-step z scale and the motion budget** — `47a9005` (feat)
3. **Task 3: The global reduced-motion reset and the solid base focus colour** — `06cac90` (feat)

**Plan metadata:** see the `docs(10-04)` commit that carries this file.

## Files Created/Modified

- **`src/app/globals.css` — modified in all three tasks.** `@theme inline` gains 16 type lines (four roles × four facets), three elevation steps and three motion entries; both `[data-theme]` blocks gain 35 declarations each (16 role values, the 6-step built-in ladder, 10 weight/tracking/leading tokens, 3 elevation values), taking each theme from 24 keys to **59, still exactly equal**; a new plain `:root` block holds the 8 global tokens; and `@layer base` gains the reduced-motion reset and loses the outline alpha. Every block carries the reasoning at the point of the decision — why the `var()` indirection cannot be flattened, why the default shadows force named steps, why the medium weight is aliased on purpose, why the `!important` is load-bearing, and the exact consumption form (`duration-(--motion-base)`, `z-(--z-dialog)`) since **Tailwind v4 has neither a duration nor a z-index namespace and `duration-base` compiles to nothing at all**.
- **`tests/design/helpers/compile-css.ts` — modified.** Adds `compileGlobalsCssWith(utilities)` with its own per-safelist cache and a character-class check on every utility name before it is interpolated into CSS text — same posture as the file's existing `GLOBALS_CSS_PATH` note, since nothing here may smuggle a `"` or a `;` into the stylesheet.
- **`tests/design/type-scale.test.ts` — created.** 17 assertions. Asserts all four facets of all four roles in both themes, type-family key-set equality reported both ways round, the whole built-in ladder present and **larger in grove at every step**, grove's emphasis weight at 700 against court's 600, and that the tracking and leading a co-located utility would otherwise freeze really do move. The medium-is-aliased assertion is written as a *contract*, with the comment explaining that a reader "fixing" it back to 500 reintroduces a third weight step.
- **`tests/design/elevation-z.test.ts` — created.** 13 assertions. Both themes declare exactly three `--elevation-*` keys and **no fourth**; every step differs between themes (not just the one easiest to eyeball); the compiled rules reference `var(--elevation-<step>)`; the z scale is 10/20/30/40, strictly increasing, and present in **neither** theme block. Carries the inverse control too — `.shadow-md` must still be **literal**, because if Tailwind ever made its defaults var-referencing this file's whole reason for existing would have changed.
- **`tests/design/motion-budget.test.ts` — created.** 19 assertions. The DS-04 cap wording, including the continuous-indicator exemption, is in the file header where the next reader will look for it. Durations are asserted **with their unit** (`/^\d+(\.\d+)?ms$/`) — `0.5s` would parse to 0.5 and slip under a bare numeric comparison while being 500ms of real motion. The reset is located by a brace-walking helper rather than a regex, and that helper anchors on the opening brace: `globals.css` names `@layer base` inside a comment further up the file, and a bare `indexOf` matched the prose and then walked the *next* block it found, returning `.dark`'s body — a real, plausible, entirely unrelated pass. That was caught by this file's own positive control.
- **`.planning/…/deferred-items.md` — created.** One item; see below.

## Decisions Made

- **A test-time safelist, not a shipped one.** See the dedicated section above.
- **The global tokens went into a plain `:root` rule after both theme blocks.** Putting them in one theme block breaks THEME-02's key-set equality; putting them in both claims they travel when the entire point of D-05 is that they must not. A per-theme z-index is not a style choice — it is a way for one theme to reorder the app's layers.
- **`--font-weight-medium` is aliased onto each theme's emphasis weight, deliberately**, and the 500 → 600 shift in court is an accepted visible change on the same footing as the accent deepening. Two weights per theme is the contract; the alias is what lets 70 shipped `font-medium` call sites need zero edits. Asserted, so it cannot be silently "fixed".
- **DS-04 marked complete; DS-02, DS-03, DS-05 and THEME-02 deliberately left `Pending`** — see Deviation 2.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's compiled-CSS assertions were unreachable, because Tailwind emits only what its content scan finds**

- **Found during:** Task 1 (and again in Task 2)
- **Issue:** Tasks 1 and 2 require assertions on the compiled `.text-display` and `.shadow-*` rules, via `compileGlobalsCss()`. Tailwind v4 generates a utility only when the class name appears somewhere in the scanned tree, and the call-site migrations for both families are later plans. Measured against the pre-plan stylesheet: `.text-9xl` and `.duration-300` are absent for precisely this reason, while `.rotate-45` and `.shadow-2xl` are present. A test looking for `.text-display` would have read "missing" for a contract that is in fact correct.
- **Fix:** Added `compileGlobalsCssWith(utilities)` to `tests/design/helpers/compile-css.ts` — the same read of the same hard-coded path, compiled `from` the same location, with Tailwind's own `@source inline(…)` appended. Chosen over adding a safelist to `globals.css` so the stylesheet stays the token contract with no build directive in it. Each consuming block carries a positive control proving the safelist cannot fabricate an undeclared step.
- **Files modified:** `tests/design/helpers/compile-css.ts`
- **Verification:** `.text-display` compiles to all four properties, each a `var()`; `.text-figure` and `.shadow-floating` remain `null` while safelisted alongside them.
- **Committed in:** `b76a77e`

**2. [Rule 3 - Blocking] `requirements.mark-complete` run for 1 of the 5 claimed IDs**

- **Found during:** State updates
- **Issue:** The plan frontmatter claims `[DS-02, DS-03, DS-04, DS-05, THEME-02]`. Three of those requirements have a second clause this plan does not deliver. **DS-02** ends "…**and no surface uses an arbitrary `text-[NNpx]` value**" — the 14 arbitrary sites are not migrated here. **DS-03** ends "…**and every shadow in the app maps to one of the three**" — the 14 shadow call sites are not migrated here. **DS-05** ends "…**and no control relies on a 50%-alpha ring as its only focus indicator**" — this plan owns the stylesheet's `outline-ring/50`, but the 13 `focus-visible:ring-ring/50` component sites (11 vendored) are 10-06 and 10-07. **THEME-02** requires *switching* between themes, which needs the next-themes runtime.
- **Fix:** Marked **DS-04** only — both its clauses (tokens ≤320ms with one standard easing, and a global `prefers-reduced-motion` reset in force) are fully delivered here and asserted by a committed test. Verified separately that the cap holds in practice and not only in the tokens: the only hardcoded durations anywhere in `src/` are 6 × `duration-100`, all inside the budget. Left the other four `Pending`, matching 10-01/10-02/10-03's identical resolution.
- **Files modified:** `.planning/REQUIREMENTS.md` (1 of 5)
- **Verification:** `DS-02 | DS-03 | DS-05 | THEME-02` still read `Pending` in the traceability table, which is the accurate state.
- **Committed in:** the `docs(10-04)` commit

**3. [Rule 1 - Bug] The brace walker in `motion-budget.test.ts` matched prose and asserted against the wrong block**

- **Found during:** Task 3, on the first run — 2 of 19 red.
- **Issue:** The helper located `@layer base` with `indexOf` and then took the following `{`. But `globals.css` names `@layer base` inside a comment further up the file (the motion budget points at the reset that lives there), so it matched the *prose*, walked past it to the next block it could find, and returned **`.dark`'s body**. Both the "reset is inside `@layer base`" assertion and its own positive control failed — loudly, which is the good outcome, but a slightly different comment would have made it pass against the wrong block instead.
- **Fix:** The prelude must now be immediately followed by its opening brace (`/@layer base\s*\{/`), and the reason is recorded in the helper's docstring so the next reader does not simplify it back.
- **Files modified:** `tests/design/motion-budget.test.ts`
- **Verification:** 19/19; the positive control asserts the returned body contains *both* a top-level declaration and one from inside the nested `@media`, so a walker that stopped early cannot pass.
- **Committed in:** `06cac90`

---

**Total deviations:** 3 (2 × Rule 3, 1 × Rule 1). No Rule 4 checkpoint was needed.
**Impact on plan:** No scope creep. Every artifact and every acceptance criterion the plan specified exists and holds; the one added helper is what makes two of the plan's own criteria assertable at all.

## Deferred Issues

Logged to `.planning/phases/10-design-system-foundation-theme-runtime/deferred-items.md` rather than fixed:

- **Tailwind's content scan reads `.planning/**/*.md`, so prose emits utilities.** The compiled bundle carries `.bg-zinc-50` — a leak-gate *fixture example* in `10-RESEARCH.md` — and `.outline-ring\/50`, the anti-pattern this plan deletes, neither of which appears anywhere in `src/`. Two consequences: a slowly growing bundle, and, more importantly, **any assertion of the form "utility X exists in the compiled output" can be satisfied by a sentence in a markdown file**. That is the vacuous-pass shape this phase's guard-the-guard blocks exist to prevent, arriving through a side door. Pre-existing (it has held since Tailwind v4 was adopted), not caused by anything here, and the fix — an explicit `@source` narrowing — changes the production bundle and deserves its own verification. Suggested owner: **10-12**, the other plan whose correctness depends on "what the compiled stylesheet contains" meaning "what the app uses". The new tests are already immune: they force presence through the safelist, and their positive controls hold regardless of prose.

## Issues Encountered

- **The brace-walker bug (deviation 3) is the one worth remembering**, and for a reason that generalises: this file's comments deliberately *name* other parts of the stylesheet, so any test that locates a block by searching for its name will find the commentary first. It is the same failure class as 10-03's grep-versus-comment collision — a comment that describes a construct is textually indistinguishable from the construct. Both times it surfaced as a red test rather than a missed checklist item, which is the argument for keeping structural assertions in CI rather than as one-shot acceptance greps.
- **`state.update-progress` reported `Progress field not found`** and `state.advance-plan` blanked `last_activity` and `percent` — the known `gsd-sdk` v1.42.3 behaviour. STATE.md's frontmatter, Current Position, metrics row and Decisions were hand-written, as the toolchain notes prescribe.
- **No blockers.**

## Verification Evidence

| Check | Result |
|---|---|
| `npm run test:design -- type-scale` | exit 0 — **17 passed** |
| `npm run test:design -- elevation-z` | exit 0 — **13 passed** |
| `npm run test:design -- motion-budget` | exit 0 — **19 passed** |
| `npm run test:design` (whole gate) | exit 0 — 8 files, **165 passed**, was 116 before this plan |
| `npm run test:design -- theme-tokens` (key-set equality survived +35 tokens/theme) | exit 0 — **11 passed** |
| AC: `--text-display--font-weight` | **1** |
| AC: `--fs-display` | **3** |
| AC: `--font-weight-semibold` | **2** |
| AC: `--shadow-sticky` | **1** |
| AC: `--elevation-overlay` | **3** |
| AC: `--default-transition-duration` | **1** |
| AC: `--motion-slow: 320ms` | **1** |
| AC: `outline-ring/50` | **0** |
| AC: `prefers-reduced-motion` | **1** |
| AC: `scroll-behavior: auto !important` | **1** |
| AC: `focus-visible {` (the rejected base-layer fallback) | **0** |
| AC: `toHaveScreenshot` in `e2e/` + `tests/` | **0 files** (no visual baseline captured — GATE-01 is Phase 11) |
| Compiled `.text-display` | all four properties, each a `var()` |
| Compiled `.shadow-raised` / `-overlay` / `-sticky` | `--tw-shadow: var(--elevation-…)` |
| Compiled `.transition-colors` | `var(--tw-duration, var(--motion-fast))` |
| Compiled `@layer base` | contains the four-property `!important` reduced-motion reset |
| Hardcoded durations in `src/` | 6 × `duration-100` only — inside the 320ms cap |
| `npx tsc --noEmit` | exit **0** |
| `npm run build` | exit **0** — "✓ Compiled successfully" |
| `npm run lint` | exit **0** — **0 errors / 9 warnings**, byte-identical to the 10-03 baseline |
| `git diff --diff-filter=D` on all 3 commits | no file deletions |
| `git status --short` after each commit | clean |

## Known Stubs

None. Every token declared is a real value from the UI-SPEC's tables, every assertion runs against the live stylesheet or its real compiled output, and nothing in the three test files is mocked or returns a placeholder. The named steps have no call sites yet — that is a scheduled migration in plans 10-05 to 10-07, not a stub, and the tests are written so it does not silently become one.

## Threat Flags

None. This plan touches one stylesheet, one test helper and three test files. No network endpoint, auth path, file access pattern or schema change; `drizzle/` is untouched at `0025` (GATE-06).

Threat register dispositions honoured: **T-10-13** (a token-only reduced-motion reset passes a naive test while dialogs still zoom) — the test asserts the universal `!important` rule's presence *including* `animation-iteration-count`, the property no token-only implementation produces; the real-animation observation remains 10-17's human check. **T-10-14** (a theme blows the motion cap) — motion is global and the budget test parses the values rather than trusting the comment, with the unit asserted so `0.5s` cannot slip through. **T-10-15** (a vendor's internal z-index out-ranks the scale) — accepted as planned, and the Phase 18 rule is recorded both in `globals.css` at the scale and in the test file's blind-spot list.

## Next Phase Readiness

- **10-05 / 10-06 / 10-07 (call-site migration)** — the named steps exist and compile correctly; nothing uses them yet. **The consumption form is not guessable and fails silently: `duration-base` and `z-dialog` compile to NOTHING** (Tailwind v4 has neither namespace). Write `duration-(--motion-base)` and `z-(--z-dialog)`. Likewise **never** use the slash-modifier on a named type step — `text-display/tight` drops letter-spacing and font-weight. Both rules are recorded in `globals.css` at the declarations.
- **10-06 / 10-07 (DS-05, the remaining half)** — `globals.css` is done. The **13 `focus-visible:ring-ring/50` occurrences (11 vendored)** still each render a 2.32:1 indicator, and no token value can fix that; `--ring` is already 7.46:1.
- **10-07 (motion polish)** — the 6 `duration-100` sites in `src/components/ui/dialog.tsx` are inside the cap but are literals; `duration-(--motion-fast)` is 120ms and is the token form.
- **10-05 / 10-14 (`readGlobalTokens()`)** — 10-03's deferred throw is **closed**. The plain `:root` block exists and parses to 8 keys.
- **10-12 (the drift check)** — inherits the `.planning`-markdown content-scan finding; see Deferred Issues.
- **10-16 (THEME-04)** — the nested-subtree claim is now stronger than colour alone: a nested `[data-theme="grove"]` subtree must re-skin its **type and its depth** too, and both resolve through the same `var()` indirection.
- **Phase 11 (GATE-01)** — every screenshot must be taken after this plan as well as after 10-03. DS-01 changed the typeface; this plan changed the type *scale*, the weights, the shadows and the transition timing, so any baseline shot before it is invalid for a different reason.
- **Phase 18 (map)** — the z-scale rule is on the record: Leaflet's control corners sit at 1000 and its panes at 400–700; wrap the vendor in a stacking context (`isolate`) rather than inflating the app scale.
- No blockers.

---
*Phase: 10-design-system-foundation-theme-runtime*
*Completed: 2026-08-11*

## Self-Check: PASSED

All 7 claimed artifacts verified on disk (`src/app/globals.css`, `tests/design/helpers/compile-css.ts`, `tests/design/type-scale.test.ts`, `tests/design/elevation-z.test.ts`, `tests/design/motion-budget.test.ts`, the phase's `deferred-items.md`, and this file) and all 4 commits verified in `git log` (`b76a77e`, `47a9005`, `06cac90`, `242bb49`). REQUIREMENTS.md re-read after the commit: `DS-04` reads `Complete`; `DS-02`, `DS-03`, `DS-05` and `THEME-02` still read `Pending`, which is the accurate state per deviation 2.
