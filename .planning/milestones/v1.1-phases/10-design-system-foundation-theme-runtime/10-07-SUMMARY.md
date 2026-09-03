---
phase: 10-design-system-foundation-theme-runtime
plan: 07
subsystem: design-system
tags: [focus-ring, accessibility, wcag, source-scan-gate, vendored-fork, ds-05]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    plan: 01
    provides: "`npm run test:design` — the DB-free Vitest gate this plan's source scan joins (now 12 files / 208 tests, 5.5s, no database)"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 03
    provides: "the darkened `--ring` (7.46 court / 7.11 grove on background, 7.46 / 7.36 on card) — the value that only pays off once the alpha is gone"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 04
    provides: "`globals.css`'s solid `outline-ring` — the stylesheet's half of DS-05, which this plan's `.css` scan leg proves stayed removed"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 06
    provides: "THE focus recipe in `button.tsx`, copied verbatim into 14 more files here, and deferred item D-2, absorbed here"
provides:
  - "DS-05 closed: zero half-alpha ring colours and zero half-alpha outline colours anywhere under `src/`, across all 15 component sites"
  - "`tests/design/focus-recipe.test.ts` (9) — the phase's reference source-scan walker (.ts/.tsx/.css, Windows path normalisation, guard-the-guard), which 10-12 and 10-14 copy from"
  - "the offset-width-implies-offset-colour rule, which catches Tailwind's hardcoded-white default leak anywhere in the tree"
affects: [10-08, 10-09, 10-11, 10-12, 10-13, 10-14, 11, 17]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A gate that bans a literal must not be defeated by the comment explaining the ban. Sixth occurrence in this phase; the source files name the literal descriptively and the TEST file — which lives outside the scanned tree — carries it verbatim."
    - "A scan written against a literal is a scan against ONE spelling of a defect. Widening from `ring-ring/50` to any-alpha-on-a-focus-scoped-ring found 2 more files; widening from focus-visible-prefixed to focus-scoped found 2 more; widening from ring-colour to ring-offset-colour found 1 more. The plan estimated 12 sites; the true number was 15."
    - "The leak is not the value, it is the UNSET value: `ring-offset-2` with no `ring-offset-background` paints a hardcoded white from a framework default. Assert the pairing per variant prefix, not per file."
    - "When the compiled stylesheet can be poisoned by prose (D-1), the only sound gate is a SOURCE scan. Demonstrated, not assumed: the banned rule is in the shipped bundle right now with zero source references."

key-files:
  created:
    - tests/design/focus-recipe.test.ts
  modified:
    - src/components/ui/badge.tsx        # recipe + D-2 destructive override removed
    - src/components/ui/button.tsx       # D-2 destructive override removed
    - src/components/ui/calendar.tsx     # NOT in the plan's list — data-attribute-driven focus
    - src/components/ui/checkbox.tsx
    - src/components/ui/input-group.tsx  # NOT in the plan's list — has-selector-driven focus
    - src/components/ui/input.tsx
    - src/components/ui/radio-group.tsx
    - src/components/ui/scroll-area.tsx
    - src/components/ui/select.tsx
    - src/components/ui/switch.tsx
    - src/components/ui/tabs.tsx
    - src/components/ui/textarea.tsx
    - src/components/ui/toggle.tsx
    - src/components/search/search-result-card.tsx  # NOT in the plan's list — offset width, no offset colour
    - src/app/(host)/host/bookings/page.tsx
    - src/components/booking/bookings-tabs.tsx
    - src/app/globals.css                # comments only — the grep-versus-comment collision
    - .planning/phases/10-design-system-foundation-theme-runtime/deferred-items.md  # D-2 closed; D-3, D-4, D-5 added; D-1 sharpened

key-decisions:
  - "The plan's 12 was an undercount. The true number of remaining half-alpha ring sites was 14, and the true number of files needing an edit was 15. Reported as found rather than forced to match."
  - "D-2 was absorbed as instructed, and the widening it asked for found the SAME defect in a second file (`badge.tsx`) that D-2 did not name."
  - "The `dark:` pin turned out to be two different metrics. 4 is a line count over one file; 56 is an occurrence count over a tree; the plan's own `awk` form computes a third number (24) matching neither. Restated explicitly; the new vendored occurrence total is 54."
  - "Three acceptance criteria could not be satisfied as literally written and are documented as such rather than quietly re-interpreted."
  - "`focus-visible:outline-1` was left in place at 3 sites (D-3) because 10-UI-SPEC.md:384 explicitly accounts for them as surviving; removing them would contradict the spec being executed."

patterns-established:
  - "`tests/design/focus-recipe.test.ts` is the phase's reference walker: `.ts`/`.tsx`/`.css` collection, `relative(cwd,f).split(\"\\\\\").join(\"/\")` normalisation with the reason attached, module-level single scan, assert-in-`it()`, and a guard-the-guard describe block that names the two files the scan MUST have reached."
  - "Violations are collected as `file: matched-text` strings, so a failure diff shows the offending class rather than a boolean."

requirements-completed: [DS-05]

# Metrics
duration: 18min
completed: 2026-08-11
---

# Phase 10 Plan 07: The Zero-Alpha Focus Ring Summary

**Every focus indicator in the app is now a solid `--ring` with a token-coloured offset band — 15 sites, not the 12 the plan counted, because three separate widenings each found something the previous spelling could not see; pinned by a source scan that was watched go red**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-08-11T16:05Z
- **Completed:** 2026-08-11T16:23Z
- **Tasks:** 2 (`auto`, no checkpoints)
- **Files:** 1 created, 18 modified

## The true final count — the number the plan asked for, reported honestly

The plan estimated **12** remaining sites. The real number was **14 sites carrying a half-alpha ring**, plus **1 more file** carrying the offset-colour half of the same defect, across **15 files of source**. Three independent widenings each found something the narrower spelling was structurally incapable of seeing:

| Widening | What it found | Why the narrower scan missed it |
|---|---|---|
| The plan's own list (12 files) | `badge`, `checkbox`, `input`, `radio-group`, `scroll-area`, `select`, `switch`, `tabs`, `textarea`, `toggle`, `(host)/host/bookings/page.tsx`, `booking/bookings-tabs.tsx` | — (baseline) |
| **focus-visible-prefixed → focus-SCOPED** | `ui/calendar.tsx`, `ui/input-group.tsx` | A calendar day's focus ring is keyed off react-day-picker's `data-focused` attribute (`group-data-[focused=true]/day:ring-ring/50`), and an input group's ring is drawn by the *wrapper* through a `has-[[data-slot=input-group-control]:focus-visible]:` selector. Neither contains the substring `focus-visible:ring-ring/50`. **A `grep` for the plan's literal returns clean while both still ship.** |
| **the literal → ANY alpha on a focus ring colour** (D-2) | `ui/button.tsx`, `ui/badge.tsx` | Different colour name (`ring-destructive/20` + a `dark:` twin at `/40`), so the string differs entirely. D-2 named `button.tsx`; the widening found `badge.tsx` carrying the identical pair, which nobody had logged. |
| **ring COLOUR → ring OFFSET COLOUR** | `search/search-result-card.tsx` | Its ring was already solid and correct. It set `focus-visible:ring-offset-2` with **no** `focus-visible:ring-offset-background`, so the 2px band painted Tailwind's default `--tw-ring-offset-color` — a hardcoded white. A scan for alpha rings sees nothing wrong. |

Final measured state, all zero or as stated:

| Metric | Before | After |
|---|---|---|
| `ring-ring/50` occurrences under `src/` (incl. `.css`) | 16 | **0** |
| `outline-ring/50` occurrences under `src/` | 0 | **0** (10-04's removal held) |
| Alpha modifier on any focus-scoped ring colour | 4 | **0** |
| Files declaring `focus-visible:ring-offset-background` | 1 | **14** |
| Files declaring any-prefix `ring-offset-background` | 1 | **16** |
| Vendored `dark:` **occurrences** (`src/components/ui/**`) | 56 | **54** |

## Accomplishments

- **DS-05 is closed, and it is closed by the recipe rather than by a token.** `--ring` has measured 7.46:1 (court) / 7.11:1 (grove) against `--background` since 10-03, and a token-pair contrast test has been passing that whole time — while every focusable control in the app rendered at **2.32:1**, because the alpha is applied *to* the token, not *by* it. That gap between "the token is right" and "the screen is right" is threat **T-10-20**, and the mitigation is now committed: a scan that reads the source, not the palette.
- **Two of the fourteen were invisible to the plan's own scan, by construction.** `calendar.tsx` and `input-group.tsx` carry real focus rings that never use the `:focus-visible` pseudo-class in the position a literal grep looks at. Had this plan executed exactly as written, `grep -rc "ring-ring/50" src/` would have printed nothing, every acceptance criterion would have passed, DS-05 would have been marked complete — and two controls would still have painted a 2.32:1 focus ring. The gate is written against *any* focus-scoped alpha for exactly this reason.
- **D-2 absorbed, and the widening it asked for paid for itself immediately.** 10-06 logged `button.tsx`'s `focus-visible:ring-destructive/20` override and predicted a literal scan would close green with it still shipping. It would have. Widening found the same override, at the same two alphas, in `badge.tsx` — a file nobody had connected to D-2. `button.tsx`'s `focus-visible:border-destructive/40` went too: 10-06 removed the base's focus border entirely, so the override had nothing left to override.
- **The offset band is a token everywhere, and the one place it was not is fixed.** `search-result-card.tsx` set an offset *width* with no offset *colour*. Tailwind's `--tw-ring-offset-color` defaults to a literal white, so a focused search result painted a white halo — on grove's tinted `--background`, visibly wrong, and a raw colour reaching the screen from a framework default. The gate now asserts this per **variant prefix**, not per file, so a file that colours one variant's offset cannot vouch for another's. Verified at the compiler: the shipped bundle contains `.ring-offset-background{--tw-ring-offset-color:var(--background)}`.
- **The gate was watched go red, and the blast radius was correct.** Reinstating the alpha ring in `input.tsx` produced **3 failed / 6 passed** — the half-alpha scan, the widened alpha scan, and the offset-pairing scan, and nothing else. Reverted: **9 passed**. This negative matters more than most: the banned string *is* the shadcn default, so every future `npx shadcn add` re-introduces it by hand-me-down.
- **The guard-the-guard is not decorative here.** Every assertion in the file is an empty-violations assertion, which passes just as happily against a scanner that visited zero files. It asserts 200+ files visited (215 actual), and that `src/components/ui/button.tsx` and `src/app/globals.css` were both provably in the scanned set — the second of which is the entire reason `.css` is in the walk.
- **The vendored tree stayed inside the gate with no exemption (D-17).** 13 of the 15 fixed sites live in `src/components/ui/**`. Exempting that directory — the obvious "it's upstream's code" move — would have excused 13 of 15 and closed the requirement on paper.
- **208/208 design tests green** (was 199), **5.52s with no database**. `npx tsc --noEmit` exit 0, `npm run build` exit 0, `npm run lint` 0 errors / 9 warnings — byte-identical to the 10-04, 10-05 and 10-06 baselines.

## The grep-versus-comment collision, sixth occurrence — and this time it was in a THIRD file

STATE.md records this as a five-time pattern (10-01, 10-03, 10-04, 10-05, 10-06). It recurred, with a new twist: **the collision was not in a file this plan was asked to edit.**

`src/app/globals.css` carried the literal `ring-ring/50` **twice — in prose**, at lines 179 and 425, as part of the two comment blocks 10-03 and 10-04 wrote to explain why the alpha had to go. Task 1's own acceptance criterion is `grep -rc "ring-ring/50" src/ | grep -v ":0$"` produces no output, and Task 2's gate asserts zero occurrences *anywhere under `src/`, including `.css`*. Meanwhile Task 1's action text says, in as many words, **"Do not touch `src/app/globals.css` in this task."**

Those two instructions cannot both be obeyed. Resolved as every prior occurrence was resolved: the reasoning is kept in full and the literals are named descriptively — *"a HALF-ALPHA modifier on the ring colour"*, *"15 call sites carrying a half-alpha RING colour"* — and each rewritten comment now says **why** it is phrased that way, so the next editor does not helpfully paste the literal back in and break a committed gate with a documentation improvement. The counts in both comments were stale (they said 13 and 11-of-13) and were corrected to 15 and 13-of-15 in the same edit.

The test file itself carries the literal verbatim, six times. That is safe and deliberate: `tests/` is outside the scanned tree. A file that bans a string must be allowed to name it.

## Task Commits

1. **Task 1: Remove every half-alpha focus ring, all 14 remaining sites** — `afdaf2b` (fix)
2. **Task 2a: Name the offset colour on the search-result focus ring** — `5271192` (fix) — found *by writing* Task 2's gate, committed before it so the gate's first commit is green
3. **Task 2b: The DS-05 zero-alpha-ring source-scan gate** — `1836778` (test)

**Plan metadata:** see the `docs(10-07)` commit that carries this file.

## Files Created/Modified

- **`tests/design/focus-recipe.test.ts` — created.** 9 assertions across 3 `describe` blocks, from a single module-level scan of all 215 `.ts`/`.tsx`/`.css` files under `src/`. Four violation collectors: the shadcn half-alpha ring, the stylesheet's half-alpha outline twin, **any** alpha on a focus-scoped ring colour, and **any** variant-prefixed ring-offset width whose matching offset colour is absent at the same prefix. The Windows normalisation line is copied verbatim from `tests/use-server-exports.test.ts:302` with its reason attached — `path.relative` emits backslashes on this box and every scope decision in this phase is a forward-slash prefix comparison, so without it the guard-the-guard assertions silently stop matching and the whole file passes vacuously. The header lists four real blind spots, including two *reasoned exclusions* rather than oversights: the `focus-visible:after:ring-*` pseudo-element recipes (no offset width means no band to colour, so nothing to leak) and unprefixed `ring-offset-<width>` (which also appears in prose in `src/lib/design/contrast-pairs.ts`, and a scan flagging it would cry wolf at the one file documenting this exact ratio).
- **The 10 vendored + 2 app files from the plan's list — modified.** Each replaced `focus-visible:border-ring focus-visible:ring-[3px]|ring-3 focus-visible:ring-ring/50` with the canonical recipe, following 10-06's precedent that the replacement covers all three old focus utilities. Every one already carries a `border` on the base, so the border box is unchanged and nothing shifts by a pixel on focus.
- **`src/components/ui/calendar.tsx` and `src/components/ui/input-group.tsx` — modified, NOT in the plan.** Prefixes preserved exactly (`group-data-[focused=true]/day:` and `has-[[data-slot=input-group-control]:focus-visible]:`), each with a comment naming *why* the plan's scan could not see it, so the next person widening a scan starts from the right mental model. `input-group`'s inner control neutralises its own ring with `focus-visible:ring-0`, so only the wrapper draws — verified before editing.
- **`src/components/ui/button.tsx` and `src/components/ui/badge.tsx` — modified (D-2).** Destructive-variant focus overrides removed, dark-mode twins with them.
- **`src/components/search/search-result-card.tsx` — modified.** Offset colour named. Its ring was already solid; only the band was leaking.
- **`src/app/globals.css` — modified, comments only.** No declaration, selector or utility changed; `git diff` is two comment blocks. Verified: the stylesheet's `outline-ring` is still solid, which is what 10-04 delivered and what this plan's `.css` scan leg exists to prove stayed delivered.
- **`deferred-items.md` — modified.** D-2 closed with its resolution and the `dark:` metric restatement; **D-3**, **D-4**, **D-5** added; **D-1** sharpened with build evidence.

## Decisions Made

- **The plan's count was reported as measured, not as estimated.** 12 → 14 ring sites → 15 files. Forcing the number to match would have meant either leaving `calendar.tsx` and `input-group.tsx` broken or fixing them silently, and both make the phase's traceability lie.
- **The `dark:` pin is two different metrics, and saying so is the fix.** `grep -c "dark:" src/components/ui/button.tsx` returns **4** — a LINE count. `grep -rho "dark:" src/components/ui/ | wc -l` returns **56** — an OCCURRENCE count over a different scope. The `awk -F: '{s+=$2}'` form written into this plan's own acceptance criteria computes a **third** number (24, the line-count sum) that matched neither, *before* any edit. THEME-05's 56 and 10-06's 4 were never the same measurement. After this plan the vendored occurrence total is **54** — exactly the two removed dark-mode twins. Any future plan re-pinning this number must state which metric it means; D-2's entry in `deferred-items.md` now says so permanently.
- **`focus-visible:outline-1` was left alone at 3 sites, and logged as D-3.** With the ring now solid and offset, those sites render a 1px line, a 2px gap, then a 2px ring — a visible double indicator. It was not removed because `10-UI-SPEC.md:384-385` explicitly describes `globals.css`'s `outline-ring` as *"the colour source for the 3 `focus-visible:outline-1` sites"*, so deleting them contradicts the spec this phase is executing. It is also more indicator, not less, with both layers solid and verified. Phase 11's visual pass owns the call.
- **The invalid-state rings were deliberately NOT swept in (D-4).** `aria-invalid:ring-destructive/20` and its dark twin are arithmetically the same defect at a worse alpha, 18 occurrences across 10 files. But DS-05's wording is about the *focus* indicator ("as its **only focus indicator**"), an invalid-state ring never appears alone (it is paired with a solid `aria-invalid:border-destructive` and, at every call site, a text error message), and sweeping it would have moved the vendored `dark:` total by 9 more in a single unmeasured stroke. Logged with the specific measurement needed before anyone edits it.
- **The offset assertion is per-variant-prefix, not per-file.** A file could colour `focus-visible:`'s offset and leave `group-data-[focused=true]/day:`'s white; a file-level `includes()` would call that clean. Capturing the prefix makes the pairing exact and cost nothing.
- **The Task 2 fix was committed *before* the Task 2 test.** `search-result-card.tsx` was found by writing the gate. Committing the test first would have put a red commit in the history; committing the fix first keeps every commit green and makes the causality legible in the message.
- **DS-05 is marked complete.** All three clauses hold: one recipe applies app-wide (15 sites, gated), the ring is a darkened neutral clearing ≥3:1 against both `--background` (7.46 / 7.11) and `--card` (7.46 / 7.36) per 10-03's proof in `contrast.test.ts`, and no control relies on a half-alpha ring — zero anywhere under `src/`, including the stylesheet. Unlike DS-08/DS-09, DS-05's adoption clause is what *this* plan delivered.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Two half-alpha focus rings the plan's file list and scan literal could not reach**

- **Found during:** Task 1, while inventorying the tree before editing
- **Issue:** `src/components/ui/calendar.tsx` carried `group-data-[focused=true]/day:ring-ring/50` and `src/components/ui/input-group.tsx` carried `has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50`. Both are real focus indicators at 2.32:1. Neither contains the substring `focus-visible:ring-ring/50`, so both the plan's file list and its `grep` acceptance criterion were blind to them — the criterion would have printed nothing while both still shipped.
- **Fix:** Canonical recipe applied with each site's scoping prefix preserved verbatim; each carries a comment explaining why a literal scan cannot see it. The Task 2 gate is written against *any* focus-scoped ring alpha rather than the literal, so this class of miss cannot recur.
- **Files modified:** `src/components/ui/calendar.tsx`, `src/components/ui/input-group.tsx`
- **Committed in:** `afdaf2b`

**2. [Rule 2 - Missing critical functionality] `badge.tsx` carried the same D-2 override that `button.tsx` did**

- **Found during:** Task 1, applying D-2's requested widening
- **Issue:** D-2 named `button.tsx` only. `badge.tsx`'s `destructive` variant carried the identical `focus-visible:ring-destructive/20` + `dark:focus-visible:ring-destructive/40` pair.
- **Fix:** Both overrides removed from both files, plus `button.tsx`'s now-orphaned `focus-visible:border-destructive/40` (10-06 removed the base's focus border, so it overrode nothing). Vendored `dark:` occurrences 56 → 54, restated rather than silently drifted.
- **Files modified:** `src/components/ui/badge.tsx`, `src/components/ui/button.tsx`
- **Committed in:** `afdaf2b`

**3. [Rule 3 - Blocking] Task 1's acceptance grep collides with comments in a file Task 1 is told not to touch**

- **Found during:** Task 1
- **Issue:** `src/app/globals.css` carried the banned literal twice in PROSE (lines 179, 425), written by 10-03 and 10-04 to explain the very defect this plan removes. Task 1's acceptance criterion requires zero occurrences under `src/`; Task 1's action text says do not touch `globals.css`. Sixth occurrence of this collision in the phase; first time it landed in a file the plan explicitly fenced off.
- **Fix:** Comments only — no declaration, selector or utility changed. Literals named descriptively per STATE.md's standing resolution, each rewritten comment now states why it is phrased that way, and the stale counts (13, "11 of them vendored") were corrected to the measured 15 and 13-of-15.
- **Files modified:** `src/app/globals.css`
- **Committed in:** `afdaf2b`

**4. [Rule 2 - Missing critical functionality] A focus ring offset width with no offset colour — Tailwind's hardcoded white reaching the screen**

- **Found during:** Task 2, while implementing the offset-pairing assertion
- **Issue:** `src/components/search/search-result-card.tsx:169` set `focus-visible:ring-offset-2` with no `focus-visible:ring-offset-background`. Tailwind's `--tw-ring-offset-color` defaults to a literal white, so a focused search result painted a white band — visibly wrong on grove's tinted `--background`, and a raw colour arriving from a framework default rather than a token. Invisible to every alpha-ring scan, because its ring was already correct.
- **Fix:** Offset colour named, with the reason in a comment. The gate now asserts width-implies-colour per variant prefix across the whole tree.
- **Files modified:** `src/components/search/search-result-card.tsx`
- **Committed in:** `5271192`

### Acceptance Criteria That Could Not Be Met As Written

Three of this plan's criteria are unsatisfiable as literally phrased. Documented rather than quietly reinterpreted:

| Criterion | What happened |
|---|---|
| Task 1: *"`grep -rc "dark:" src/components/ui/ \| awk -F: '{s+=$2}' END {print s}'` still returns 56"* | That expression returns **24** — it sums grep's LINE counts. It returned 24 *before* any edit too, so the criterion never matched reality. The 56 is an OCCURRENCE count (`grep -rho ... \| wc -l`). Both metrics reported above; the occurrence total is now **54** by design (D-2's two dark-mode twins). |
| Task 1: *"Do not touch `src/app/globals.css` in this task"* vs. *"`grep -rc "ring-ring/50" src/` produces no output"* | Mutually exclusive — the file carried the literal in two comments. Comments rewritten; zero declarations changed. |
| Task 2: *"exits 0 with at least 5 passing assertions"* | Exits 0 with **9**. |

### Out of Scope — Logged, Not Fixed

- **D-3** — three controls now paint two focus indicators (`focus-visible:outline-1` inside the new ring). Owner: Phase 11 visual pass.
- **D-4** — the invalid-state rings are still low-alpha, 18 occurrences across 10 files. Owner: Phase 17 a11y audit, with the specific measurement needed recorded.
- **D-5** — `slot-picker.tsx:212`'s `ring-brand/50` anchor ring, the last half-alpha ring in `src/`. Not a focus indicator; paired with a solid `border-brand`. Owner: 10-13 or Phase 11.
- **D-1 sharpened** — see Verification Evidence below.

---

**Total deviations:** 4 (1× Rule 1, 2× Rule 2, 1× Rule 3). No Rule 4 checkpoint was needed — every fix was a class-string edit inside files this phase already owns.

## Known Stubs

None. Every class written resolves to a token declared in both theme blocks by 10-03, and the production bundle was inspected directly to confirm it: `.ring-offset-background{--tw-ring-offset-color:var(--background)}`.

## Threat Flags

None. This plan removes attack surface rather than adding it — no network endpoint, auth path, file access pattern or schema at a trust boundary was touched. T-10-20 (the repudiation threat: a token test passing while every control fails) is now mitigated by the committed gate, exactly as the register specified.

## Verification Evidence

| Check | Result |
|---|---|
| `npm run test:design -- focus-recipe` | **9/9 passed**, 0.45s |
| Negative-guard RED check (alpha ring reinstated in `input.tsx`) | **3 failed / 6 passed**, exit 1, on exactly the three assertions that should care — reverted, back to 9/9 |
| `npm run test:design` (full gate) | **208/208 passed** (was 199), 5.52s, **no database** |
| `npm run test:design -- button-variants` | 12/12 — 10-06's contract unbroken by the D-2 edit |
| `grep -ro 'ring-ring/50' src/ \| wc -l` | **0** (was 16, incl. 2 in `globals.css` comments) |
| `grep -ro 'outline-ring/50' src/ \| wc -l` | **0** — 10-04's removal held |
| any alpha on a focus-scoped ring colour | **0** (was 4) |
| files declaring `focus-visible:ring-offset-background` | **14** (criterion asked for ≥13) |
| files declaring any-prefix `ring-offset-background` | **16** |
| vendored `dark:` occurrences (`src/components/ui/**`) | **54** (was 56 — the two D-2 dark twins) |
| files walked by the scan | **215** (guard asserts >200) |
| `grep -c 'join("/")' tests/design/focus-recipe.test.ts` | 1 |
| `grep -c "toBeGreaterThan(200)" tests/design/focus-recipe.test.ts` | 1 |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0 |
| `npm run lint` | 0 errors, 9 warnings (unchanged baseline) |
| compiled bundle — offset resolves to a token | `.ring-offset-background{--tw-ring-offset-color:var(--background)}` |
| compiled bundle — **D-1 evidence** | `.focus-visible\:ring-ring\/50:focus-visible{--tw-ring-color:color-mix(in oklab, var(--ring) 50%, transparent)}` **is still in the shipped CSS**, emitted purely from prose (planning markdown, and this test file) with **zero** source references. Any DS-05 assertion phrased against the COMPILED stylesheet would fail today against a perfectly clean tree — which is why this gate is a source scan. |

## Self-Check: PASSED

- `tests/design/focus-recipe.test.ts` exists on disk; all 18 modified files exist and carry the recipe.
- Commits `afdaf2b`, `5271192`, `1836778` all present in `git log`.
- No file deletions in any of the three commits (`git diff --diff-filter=D` empty for each).
