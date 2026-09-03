---
phase: 10-design-system-foundation-theme-runtime
plan: 11
subsystem: design-system
tags: [design-system, typography, type-scale, source-scan, leak-gate, tailwind-v4, DS-02]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    plan: 04
    provides: "the four named `--text-*` roles and the per-theme `--font-weight-*` / `--tracking-*` / `--leading-*` families the 12 migrated sites now resolve through"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 07
    provides: "`tests/design/focus-recipe.test.ts` — the source-scan walker and the Windows path-normalisation idiom this gate reuses"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 01
    provides: "`npm run test:design` — the DB-free Vitest config the extended gate runs under"
provides:
  - "DS-02's second clause, closed: no surface anywhere under `src/` pins a font size to a pixel literal"
  - "12 `sm:text-display` call sites — the first real adopters of any named type step, so the 10-04 contract now has something to prove itself against"
  - "`tests/design/type-scale.test.ts` extended 17 → 29 assertions with a comment-aware source scan, a positive control that must FIND the 4 vendored rem sites, and a control on that control"
  - "A reusable, measured rule for every future source-scan gate in this phase: strip comments before matching, line-oriented only"
affects: [10-12, 10-14, 10-17, 11]

# Tech tracking
tech-stack:
  added: []   # no dependency installed; 14 class swaps and one test file
  patterns:
    - "A violation scanner strips comments before matching, and its comment stripper is LINE-ORIENTED — a `/*…*/` regex treats an in-string `image/*` as a comment opener and swallows the rest of the file."
    - "A positive control must be counted the same way the violations are. A raw-text control can be satisfied by prose, which is the failure it exists to prevent, arriving through the control."
    - "Pin an inventory PER FILE, not as a bare total, so the failure diff names the surface that moved."

key-files:
  created: []
  modified:
    - src/app/(app)/bookings/[id]/cancel/page.tsx       # Task 1
    - src/app/(app)/bookings/[id]/page.tsx              # Task 1 (4 sites)
    - src/app/listings/[id]/book/page.tsx               # Task 1
    - src/app/listings/[id]/page.tsx                    # Task 1
    - src/app/page.tsx                                  # Task 1
    - src/components/booking/refund-breakdown.tsx       # Task 2
    - src/components/group/headcount-meter.tsx          # Task 2
    - src/components/host/payout-summary.tsx            # Task 2 (2 sites)
    - src/components/booking/booking-row.tsx            # Task 2 (text-xs)
    - src/components/notifications/notification-bell.tsx # Task 2 (text-xs)
    - tests/design/type-scale.test.ts                   # Task 3 (+12 assertions)

key-decisions:
  - "The plan's two numeric criteria were both wrong against the tree, in OPPOSITE directions, from one cause: the grep-versus-comment collision. The vendored-rem positive control expects 4 while the raw text says 5 (a comment explains the exemption), and the forbidden-slash-modifier absence grep is tripped by the stylesheet comment that warns against the form. The gate strips comments before matching, and carries a control proving the stripper is not a no-op."
  - "The comment stripper is line-oriented rather than a block-comment regex, because `accept=\"image/*\"` is real markup in this tree and a naive strip deletes 86 lines of the file that carries it."
  - "The scan walks all 216 files under `src/`, not just `src/app` + `src/components` (151). This makes the plan's own `>200` reach floor satisfiable AND is a strictly stronger gate — a pixel literal in `src/lib/**` would be the same frozen surface."
  - "The gate asserts SOURCE, never compiled output, per deferred item D-1: Tailwind's content scan reads `.planning/**/*.md`, so a compiled-output claim can be satisfied by a sentence of planning prose."

patterns-established:
  - "Every phase-10 source-scan gate from here on strips comments before matching. A comment that explains why a banned string is absent is textually indistinguishable from the banned string."
  - "A positive control gets its own control: assert the raw text carries MORE occurrences than the stripped code does."

requirements-completed: [DS-02]

# Metrics
duration: 25min
completed: 2026-08-12
---

# Phase 10 Plan 11: Arbitrary Pixel Font Sizes → Named Type Steps Summary

**No surface in this app measures its own font size any more — the 14 literals that a theme swap could never have reached are gone, and the gate that says so was watched go red, strips the comments that would have lied to it, and proves it reaches the vendored tree it is deliberately not allowed to report**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-12T02:00Z
- **Completed:** 2026-08-12T02:25Z
- **Tasks:** 3 (all `auto`, no checkpoints)
- **Files:** 0 created, 11 modified

## Accomplishments

- **DS-02 is closed on both clauses, and the second one is the one that makes the first true.** Plan 10-04 declared four named roles behind per-theme `var()`s, but a surface that writes its own pixel size is *frozen*: the theme switcher resizes every step around it and never reaches it. A swap that looked complete in `globals.css` would have left 12 page titles and money figures at court's size in grove. Those 12 are now `sm:text-display`, and the 2 remaining sub-label numerals are `text-xs`.
- **The plan's inventory matched the tree exactly — 14 sites across 10 files — the first time this phase a plan's own grep was not blind to something.** Independently re-verified before editing: 8 route-level titles (`cancel/page.tsx` ×1, `bookings/[id]/page.tsx` ×4, `listings/[id]/book/page.tsx` ×1, `listings/[id]/page.tsx` ×1, `page.tsx` ×1), 4 component money figures (`refund-breakdown` ×1, `headcount-meter` ×1, `payout-summary` ×2), and 2 sub-label numerals (`booking-row`, `notification-bell`). The 4 vendored `text-[0.8rem]` sites were left untouched, as the px-only leak-pattern decision requires.
- **156 co-located utilities needed zero edits, exactly as 10-04 designed.** Every migrated element kept its `font-semibold` / `tracking-tight` / `leading-tight`, because those are per-theme token aliases rather than frozen Tailwind defaults. The migration is 14 one-word swaps, not a 170-site refactor — which is the entire return on the token work that looked redundant when it was written.
- **The slash-modifier form appears nowhere, and the gate bans all four roles rather than the one in use.** `sm:text-display/tight` compiles to font-size and line-height only; the per-theme letter-spacing and weight vanish silently. A migration written that way would look complete and leave D-01 false on every surface it touched (T-10-43).
- **The gate was watched go red, with the blast radius measured.** An arbitrary pixel display size reinstated on `src/app/page.tsx`'s `<h1>` → **2 failed / 27 passed**: the px scan (whose diff named the file and quoted the class) and the Display inventory (whose diff showed `src/app/page.tsx` missing from the 8 files that must carry the step). **All 17 pre-existing token assertions stayed green** — which is both the correct blast radius and the one-line argument for the whole section: *a theme contract cannot tell you whether anything obeys it.* Reverted → **29 passed**. Both observations are recorded in the test file's header.
- **The positive control is what makes the zero mean anything (T-10-42).** The scan must still FIND the 4 vendored rem sites in `button.tsx`, `calendar.tsx` (×2) and `toggle.tsx` — in the vendored subtree specifically, because that is what an "it's upstream's code" exemption would have quietly excused. A zero-violations assertion reads identically whether the tree is clean or the walker visited nothing.
- **251/251 design tests green** (was 239), DB-free, ~4.5s. Full DB suite **1197 passed / 4 skipped**, unchanged. `tsc --noEmit` exit 0, `npm run build` exit 0, lint 0 errors / 9 warnings — byte-identical to the phase baseline.

## The two things the plan got wrong, and why they were the same thing

The plan specified two numeric criteria over the source tree. **Both were wrong against the real tree, in opposite directions, from one cause** — the grep-versus-comment collision this phase has now hit ten times.

1. **Too low.** `grep -rc "text-\[0.8rem\]" src/components/ui` returns **5**, not the plan's 4. `button.tsx:42` is a *comment*, written by plan 10-08, recording why that vendored site is tolerated debt. There are exactly 4 real class-string occurrences.
2. **Falsely tripped.** `grep -rEc "text-(display|heading|body|label)/" src/app` returns a hit — `globals.css:67`, plan 10-04's warning to the next author *never* to use the slash-modifier form. There are zero real uses.

The first direction is the familiar one and merely cries wolf. **The second direction is worse and is the new lesson: a raw-text POSITIVE CONTROL can be satisfied by prose alone.** Someone could delete the real vendored site in `button.tsx`, leave the comment describing it, and the control would still report "the scanner works". The control would then be vouching for a scanner it had stopped testing — which is precisely the vacuous-pass shape the control exists to prevent, arriving through the control itself.

So the gate strips comments before matching, and carries **a control on the control**: `button.tsx`'s raw text must contain strictly more occurrences than its code does. If the stripper ever becomes a no-op, that assertion fails immediately.

**And the stripper is line-oriented, not a `/*…*/` regex — because that regex is measurably wrong in this tree.** `src/app/(app)/profile/profile-form.tsx:109` carries `accept="image/*"` inside a JSX string, and the next block-comment terminator in that file is 86 lines later at line 195. A naive block strip deletes those 86 lines of real markup, and a violation scanner that eats a third of a file then reports it clean. A comment must therefore *open* its line (optionally wrapped in JSX braces) to be recognised, and a trailing `//` never truncates a line of code — a violation could sit after a URL on the same line. Three fixture assertions pin all of this, including the `image/*` case by name.

## Task Commits

1. **Task 1: The 8 route-level Display sites** — `69b3a70` (refactor)
2. **Task 2: The 4 component Display sites and the 2 sub-label numerals** — `f242c9f` (refactor)
3. **Task 3: The DS-02 source-scan gate** — `f3819c6` (test)

**Plan metadata:** see the `docs(10-11)` commit that carries this file.

## Files Created/Modified

- **The 5 route files (Task 1).** Every `sm:text-[28px]` → `sm:text-display`, `sm:` prefix and all co-located utilities preserved. `cancel/page.tsx`'s comment previously described the element as "Display scale (28px/600)" — a measurement that is wrong in grove (34px/700) and is the same frozen-literal thinking one layer up; it now names the step and records *why* it is named rather than measured.
- **The 5 component files (Task 2).** 4 money figures → `sm:text-display`; `booking-row.tsx`'s empty-thumbnail label and `notification-bell.tsx`'s unread counter → `text-xs`, the built-in sub-label step, explicitly *not* a fifth semantic role. `refund-breakdown.tsx`'s "the ONE Display-scale (28px/600) number" comment was re-worded for the same reason. Both of `booking-row.tsx`'s neighbouring-plan edits survived and are re-asserted (`variant="brand"` from 10-08 ×1, `z-10` ×1 — T-10-44).
- **`tests/design/type-scale.test.ts` — modified, 17 → 29 assertions.** New: a 216-file walk of `src/` with the `focus-recipe.test.ts` walker and its Windows path normalisation; the comment stripper and its three fixture controls; zero arbitrary pixel font sizes; zero slash-modifier uses across all four roles; the per-file Display inventory (12 sites / 8 files); a `text-xs` anchor for the two numerals; the vendored-rem positive control (4 sites / 3 files); and the control on that control. The header now carries the observed-red/green numbers, the reason a compiled-output assertion would have been unsound (D-1), and an honest blind-spot list — the scan proves class *names*, not that a browser paints them.

## Decisions Made

- **Strip comments; make the stripper line-oriented; control the control.** See the section above. This is the reusable output of the plan, and it applies to 10-12's leak gate directly.
- **Walk all of `src/` (216 files), not just DS-02's stated `src/app` + `src/components` (151).** Two reasons: the plan's own `>200` reach floor is unsatisfiable over 151 files, and a pixel literal in `src/lib/**` would be exactly the same frozen surface. Widening the walk makes the criterion honest *and* the gate stronger, rather than lowering the floor to fit.
- **Assert source, never compiled output.** Deferred item D-1 (logged by 10-04): Tailwind's content scan reads `.planning/**/*.md`, so any "utility X is/isn't in the bundle" claim can be satisfied or broken by a sentence in a planning document.
- **DS-02 marked `Complete`.** The first requirement this phase whose two clauses were delivered by two different plans — precisely the split 10-04's deviation 2 predicted when it deliberately left the ID `Pending`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The vendored-rem positive control's expected count was 4; the tree says 5**

- **Found during:** Task 2 acceptance verification
- **Issue:** The plan's criterion `grep -rc "text-\[0.8rem\]" src/components/ui | awk … ` "returns 4". It returns **5**: `button.tsx:42` is a line comment (written by plan 10-08) naming the string to explain the exemption. Taken literally the criterion reports a violation that does not exist; taken as written into the test it would have been a control satisfiable by prose alone.
- **Fix:** The gate counts occurrences in comment-stripped code, where the real count is 4 across the 3 named files, and adds an explicit assertion that `button.tsx`'s **raw** text carries more occurrences than its code does — so the stripper cannot silently degrade to a no-op.
- **Files modified:** `tests/design/type-scale.test.ts`
- **Verification:** `scan.vendoredRem` deep-equals `{button: 1, calendar: 2, toggle: 1}`; the raw-vs-code assertion passes today at 2 vs 1.
- **Committed in:** `f3819c6`

**2. [Rule 1 - Bug] The forbidden-slash-modifier absence grep is tripped by the stylesheet's own warning**

- **Found during:** Task 1 acceptance verification
- **Issue:** `grep -rEc "text-(display|heading|body|label)/" src/app | grep -v ":0$"` produces output — `src/app/globals.css:1` — because `globals.css:67` warns, in a block comment, never to use `text-display/tight`. That comment is correct and load-bearing; it is where the next author will look. Restricted to `.ts`/`.tsx` the criterion is clean, and comment-stripped it is clean including the stylesheet.
- **Fix:** Same mechanism as deviation 1 — the gate strips comments, so the warning can stay written in full. Recorded here rather than silently satisfying the grep by deleting the warning.
- **Files modified:** `tests/design/type-scale.test.ts` (no stylesheet change)
- **Verification:** `scan.slashModifier` is `[]` over all 216 files including `globals.css`; `grep -rEc --include=*.tsx --include=*.ts` over `src/app` + `src/components` also produces no output.
- **Committed in:** `f3819c6`

**3. [Rule 3 - Blocking] The plan's `>200` file-reach floor is unreachable over the tree it names**

- **Found during:** Task 3
- **Issue:** The plan requires the scan to have "visited more than 200 files", but `src/app` + `src/components` contains **151** `.ts`/`.tsx`/`.css` files. Written literally against that tree the assertion is red on a correct implementation; lowering the floor to 150 would have satisfied the letter and weakened the guard.
- **Fix:** Walk all of `src/` (**216** files), as `focus-recipe.test.ts` already does — reusing that file's walker means reusing its scope. The violation scope widens with it, which is strictly stronger: a pixel literal in `src/lib/**` is the same frozen surface. The gate separately records the 151-file DS-02 subtree and asserts both halves are covered.
- **Files modified:** `tests/design/type-scale.test.ts`
- **Verification:** `scan.scanned.length` = 216 > 200; `scan.gateFiles.length` = 151 > 100, with `src/app/` and `src/components/` both present.
- **Committed in:** `f3819c6`

**4. [Rule 1 - Bug] A stripper fixture asserted exact output where only a property is true**

- **Found during:** Task 3, first run — 1 of 29 red
- **Issue:** The JSX fixture `  {/* … */}\nkeep` was asserted to strip to exactly `keep`; it strips to `}\nkeep`. The stripper is right — it keeps everything after a block terminator, and a stray brace carries no class names — the expectation was wrong. Caught loudly on the first run, which is the good outcome.
- **Fix:** All three fixtures are now asserted as the property that matters: the banned literal is gone AND the real code survives. That is what the stripper must guarantee; exact output is not.
- **Files modified:** `tests/design/type-scale.test.ts`
- **Verification:** 29/29 green.
- **Committed in:** `f3819c6`

**5. [Rule 2 - Missing] Two comments described elements by frozen pixel measurement**

- **Found during:** Tasks 1 and 2
- **Issue:** `cancel/page.tsx:276` and `refund-breakdown.tsx:97` described their headings as "Display scale (28px/600)". That is court's value; grove's Display is 34px/700. A comment that measures what the token now names re-teaches the exact habit this plan removes, and would be read as authoritative by the next author.
- **Fix:** Both re-worded to name the step and state why it is named rather than measured. Neither wording quotes any string an acceptance criterion counts (the standing resolution for the collision pattern).
- **Files modified:** `src/app/(app)/bookings/[id]/cancel/page.tsx`, `src/components/booking/refund-breakdown.tsx`
- **Verification:** Both files clean under the px scan and the slash-modifier scan.
- **Committed in:** `69b3a70`, `f242c9f`

---

**Total deviations:** 5 (3 × Rule 1, 1 × Rule 2, 1 × Rule 3). No Rule 4 checkpoint was needed.
**Impact on plan:** No scope creep. All 14 sites migrated exactly as specified; every acceptance criterion holds, three of them via a mechanism the plan did not specify because the literal form was measurably wrong against the tree.

## Deferred Issues

None new. The phase's existing deferred items are unchanged; **D-1** (Tailwind's content scan reads `.planning/**/*.md`) is the reason this gate asserts source rather than compiled output, and remains 10-12's to close.

One observation for **Phase 11's GATE-01**, flagged rather than deferred: `booking-row.tsx`'s empty-thumbnail label moves from a 10px literal to `text-xs`, which is **12px in court and 13px in grove**, inside a 48px tile. The plan and the UI-SPEC both name this site explicitly, and the copy is short with `leading-tight`, but it is the one migration whose visual delta is a size *increase* in a constrained box. Worth a look in the screenshot pass; it is not a correctness issue and nothing in this gate can see it.

## Issues Encountered

- **The 10-time collision is the finding, and its new direction is the part worth carrying.** Nine prior occurrences were false positives — a comment tripping an absence grep. This plan hit the inverse: a comment *inflating a positive control*, which is strictly more dangerous because the failure mode is a control that stops testing anything and still reports success. Both directions have the same fix and the same one-line tell: *if a criterion counts a string, no artifact inside its scope may quote that string.*
- **`state.record-metric` rejected its own documented argument order** (`phase, plan, and duration required` with all five positional args supplied) — the known `gsd-sdk` v1.42.3 string-arg behaviour. The metrics row, frontmatter, Current Position and Decisions were hand-written per the toolchain notes. `requirements.mark-complete DS-02` and `roadmap.update-plan-progress 10` both worked.
- **No blockers.**

## Verification Evidence

| Check | Result |
|---|---|
| `npm run test:design -- type-scale` | exit 0 — **29 passed** (was 17) |
| Observed RED: literal reinstated at `src/app/page.tsx` | exit non-zero — **2 failed / 27 passed**, both failures naming the surface |
| Observed GREEN after revert | exit 0 — **29 passed** |
| `npm run test:design` (whole gate) | exit 0 — 14 files, **251 passed** (was 239), ~4.5s, no database |
| `npm run db:up && npm run db:test:setup && npm test` | exit 0 — **1197 passed / 4 skipped**, unchanged |
| AC: `grep -rEc "text-\[[0-9.]+px\]" src/app` | no output (0 in every file) |
| AC: `grep -rEc "text-\[[0-9.]+px\]" src/components` | no output (0 in every file) |
| AC: `grep -rho "sm:text-display" src/app \| wc -l` | **8** |
| AC: `grep -rho "sm:text-display" src/components \| wc -l` | **4** |
| AC: slash-modifier form in `.ts`/`.tsx` under `src/app` + `src/components` | no output (the only tree-wide hit is `globals.css`'s warning comment — deviation 2) |
| AC: vendored `text-[0.8rem]` sites intact | **4** in code across 3 files (**5** raw lines — deviation 1) |
| AC: `grep -c "z-10" booking-row.tsx` / `grep -c 'variant="brand"'` | **1** / **1** — both neighbouring plans' edits survived (T-10-44) |
| AC: `grep -c "0.8rem" tests/design/type-scale.test.ts` | **2** (≥1 required) |
| AC: `grep -c "toBeGreaterThan(200)" tests/design/type-scale.test.ts` | **1** (≥1 required) |
| Scan reach | **216** files walked; **151** in the DS-02 subtree; all 3 vendored files reached by name |
| `npx tsc --noEmit` | exit **0** |
| `npm run build` | exit **0** — "✓ Compiled successfully in 16.2s" |
| `npm run lint` | exit **0** — **0 errors / 9 warnings**, unchanged from baseline |
| `git diff --diff-filter=D` on all 3 commits | no file deletions |
| `git status --short` after each commit | clean |

## Known Stubs

None. Every edit is a real class swap on a real rendered surface, and every assertion runs against the live source tree. Nothing is mocked, hardcoded empty, or placeholder. The three roles with no adopters yet (`heading`, `body`, `label`) are not stubs — the built-in ladder re-skins their 399 existing call sites per theme by design (10-04), and the gate says so explicitly rather than implying they are covered.

## Threat Flags

None. This plan changes 10 class strings and one test file. No network endpoint, auth path, file access pattern, or schema change; `drizzle/` untouched at `0025` (GATE-06).

Threat register dispositions honoured: **T-10-42** (a zero-violations assertion is indistinguishable from a scanner that visited nothing) — mitigated three ways: the 4 vendored rem sites must be FOUND in 3 named files, the walk must exceed 200 files, and the gate was observed red on a reinstated literal before the task closed. **T-10-43** (the `/` modifier form silently drops tracking and weight) — mitigated: forbidden in both actions, asserted absent across all four roles, and the reason is recorded at the regex. **T-10-44** (shared files with neighbouring plans) — accepted as planned, and both of `booking-row.tsx`'s neighbouring edits were re-asserted intact after the change.

## Next Phase Readiness

- **10-12 (the leak gate / drift check)** — inherits three things directly. (1) The comment-stripping rule and the line-oriented stripper, with `profile-form.tsx:109` as the reason. (2) The control-on-the-control pattern — a positive control counted from raw text can be satisfied by prose. (3) D-1 unresolved: assert source, or assert token *declarations*, never "utility X is in the compiled bundle".
- **10-12 / 10-14** — `text-heading`, `text-body` and `text-label` still have **zero** adopters. That is not a defect (the built-in ladder covers their 399 call sites per theme), but any claim that "the roles are in use" is currently false for three of the four, and the gate is written so it cannot be misread as covering them.
- **Phase 11 (GATE-01)** — every baseline must be shot after this plan. 12 titles and money figures now resolve their size, weight, tracking and leading through per-theme tokens, so grove's Display renders 34px/700 where it previously rendered court's 28px/600 in both themes. Also see the `booking-row.tsx` thumbnail note under Deferred Issues.
- **10-17 (the build-time gate)** — `type-scale.test.ts` remains DB-free and fast (the whole design suite is ~4.5s), so the added source walk does not threaten the build-blocking design gate.
- No blockers.

---
*Phase: 10-design-system-foundation-theme-runtime*
*Completed: 2026-08-12*

## Self-Check: PASSED

All 11 modified files verified on disk, plus this file. All 4 commits verified in `git log`
(`69b3a70`, `f242c9f`, `f3819c6`, and the `docs(10-11)` commit carrying this summary).
`REQUIREMENTS.md` re-read after the commit: **DS-02 reads `Complete`** in both the checklist and the
traceability table — the first requirement this phase closed by two plans across two clauses.
`ROADMAP.md` Phase 10 progress reads **11/17, In Progress**. `STATE.md` frontmatter, Current
Position, the metrics row and five new Decisions entries were hand-written, as the toolchain notes
prescribe after `state.record-metric` rejected its own positional arguments.
