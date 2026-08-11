---
phase: 10-design-system-foundation-theme-runtime
plan: 17
subsystem: design-system
tags: [eslint, build-gate, DS-13, DS-06, leak-scan, pair-drift, observed-red, checkpoint-pending]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    plan: 01
    provides: "`vitest.design.config.ts` — the DB-free config this plan wires into `build`, and `config/design-leak-patterns.mjs`, the one shared pattern list both gates now read"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 02
    provides: "`readThemeTokens()` — the single stylesheet parser the drift check reads its colour vocabulary and its alias groups out of"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 12
    provides: "the narrowed Tailwind content root, which is why `npm run lint` now measures 17s rather than RESEARCH's 85s"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 14
    provides: "a tree with zero DS-13 violations — the precondition for turning the gate on at all"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 15
    provides: "`src/lib/design/tokens.generated.ts` and the explicit handoff that `src/lib/design/**` must be EXCLUDED from the leak scan"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 16
    provides: "`/dev/theme` — the surface Task 3's human checkpoint is performed on — and D-9, whose disposition this plan owned"
provides:
  - "`fitout/no-raw-design-value` — an inline ESLint 9 flat-config plugin over the shared pattern list, zero new dependencies"
  - "`tests/design/leak.test.ts` — the authoritative DS-13 gate (18 assertions) with the observed-red evidence recorded in its own header"
  - "`tests/design/pair-drift.test.ts` — D-13's companion (13 assertions): every rendered fg/bg pairing must be a DECLARED one"
  - "**`build` is now `npm run lint && npm run test:design && next build`** — the only place DS-13's 'fails the build' can happen on Next 16, in a repository with no CI"
  - "A raw hex in a component has been WATCHED turning `npm run build` red, and the failing run is pasted into the guard that produced it"
  - "Two inventory rows the drift check found on its first run: the inverted surface (`ui/tooltip.tsx:45`, `listing/photo-uploader.tsx:278`)"
  - "D-9 dispositioned — ACCEPTED as debt, with the 119,835-byte figure re-verified without a rebuild"
affects: [11, 17]

# Tech tracking
tech-stack:
  added: []   # zero new npm dependencies; the ESLint plugin is defined inline (T-10-36)
  patterns:
    - "A gate that bans a string must not READ raw text. Both halves parse — ESLint visits `Literal`/`TemplateElement`, the Vitest gate visits the TypeScript AST's string literals and template chunks — so the phase's twelve grep-versus-comment collisions cannot recur inside the gate itself."
    - "Two consumers, one exported list, and the SHARED SCOPE is imported too. `eslint.config.mjs` spreads `LEAK_SCAN_GLOBS` rather than retyping the globs, so the halves cannot disagree about WHERE the rule applies any more than about WHAT it bans."
    - "A naive cross product over class strings is not a drift check. Variant chains must be compatible before a foreground and a background are treated as a rendered pairing, or mutually exclusive states synthesise a 1.1:1 phantom that is resolvable by neither of the two honest routes."
    - "When a check SKIPS something, pin the reason it is safe to skip. `dark:` utilities are excluded because nothing activates `.dark`; all four mechanisms that could change that are asserted, so the narrowing cannot outlive its justification."
    - "Verify an accepted-debt measurement without paying for it. Summing the emitted CSS chunks reproduced 10-16's 119,835 bytes exactly, with no clean rebuild."

key-files:
  created:
    - tests/design/leak.test.ts
    - tests/design/pair-drift.test.ts
  modified:
    - eslint.config.mjs                              # the inline fitout/no-raw-design-value plugin
    - package.json                                   # the blocking build gate
    - src/lib/design/contrast-pairs.ts               # +2 rows, found by the drift check
    - .planning/phases/10-.../deferred-items.md      # D-9 DISPOSITION
  deleted: []

key-decisions:
  - "The plan's naive cross product had to be narrowed TWICE before the drift check was honest. Without narrowing A, `ui/calendar.tsx:221` synthesises `text-foreground` on `bg-primary` — two mutually exclusive day states — which measures ~1.1:1 and is resolvable by NEITHER route the plan offers: adding the row declares a 1.1:1 pairing legal, and 'fix the component' means breaking a calendar that is not broken."
  - "The 2 rows the drift check demanded are REAL and both were measured before being declared: the inverted tooltip (19.80 court / 18.42 grove) and the photo uploader's 80% Cover chip (11.20 / 10.24), both against a 4.5 bar."
  - "Alias groups are DERIVED from token values, not typed. The plan names two groups; the stylesheet has six. A hand-written list would have been wrong on day one and silently wrong forever."
  - "`npm run lint` measures 17s on this box, not the 85s the plan told me to record. 10-12's content-root narrowing is the likely cause. Recording the plan's number would have been a false measurement in a phase whose whole argument is that measurements beat documents."
  - "D-9 ACCEPTED rather than fixed, with the reasoning written down: `@source not` would make `/dev/theme` render unstyled — the very surface Task 3's checkpoint is performed on — and a safelist is the second list D-16 and D-18 exist to abolish."
  - "DS-13 and DS-06 are NOT marked Complete yet. Both are satisfied by Tasks 1-2, but Task 3's D-11 verdict is a scope decision that could re-derive `--brand`, which would move every contrast measurement DS-06 rests on. The continuation agent closes them after the human verdict."

patterns-established:
  - "Watch the gate go red from BOTH directions. The drift check was proven by removing inventory rows (the inventory-drifts direction) AND by injecting an undeclared pairing into a real component (the code-drifts direction). One run proves half a check."
  - "Restore from a copy, never from git, when mutation-checking a file. 10-15 lost uncommitted work to `git checkout --`; every one of this plan's five mutation checks restored from a backup copy in the scratchpad."

requirements-completed: []   # DS-13 / DS-06 pending the Task 3 human verdict — see key-decisions

# Metrics
duration: 21min (Tasks 1-2; Task 3 awaiting the developer)
completed: PENDING — Task 3 checkpoint open
---

# Phase 10 Plan 17: The Gates Go On — and One of Them Was Watched Going Red Summary

**`npm run build` now fails on a raw hex, and that sentence is true because a raw hex was put in `badge.tsx` and the build was watched failing — not because a test was written that says so**

## Status: TASKS 1-2 COMPLETE, TASK 3 AWAITING DEVELOPER ACCEPTANCE

This plan is **not finished**. Task 3 is a `gate="blocking"` human checkpoint covering three
aesthetic/browser-level items that no automation can discharge. Every automated property in the plan
is green; the phase cannot close until a human has looked at the screen.

## Performance

- **Duration so far:** ~21 min (Tasks 1-2)
- **Started:** 2026-08-12 05:42
- **Tasks 1-2 complete:** 2026-08-12 06:03
- **Tasks:** 2 of 3 (`auto`) + 1 deviation-driven commit; Task 3 (`checkpoint:human-verify`) open
- **Files:** 2 created, 4 modified, 0 deleted

## Accomplishments

- **DS-13's "fails the build" is structurally met for the first time.** `package.json`'s `build` is
  now `npm run lint && npm run test:design && next build`. This was the load-bearing change in the
  plan: Next 16 removed `next lint` and no longer runs ESLint during `next build` (landmine L1), and
  `.github/workflows` does not exist (landmine L2), so **the npm script layer IS the gate boundary**.
  Until this string changed, DS-13 was unmet no matter how good the test was.
- **The gate was watched failing, on the real build, and the run is pasted into the guard's own
  header.** `const LEAK_PROBE = "#ff0000";` at `src/components/ui/badge.tsx:18` — inside the vendored
  tree D-17 refuses to exempt — produced `npm run build` **exit 1** with
  `18:20  error  Raw design value "#ff0000" — use a design token (DS-13 / D-15)  fitout/no-raw-design-value`
  and `✖ 11 problems (1 error, 10 warnings)`. `&&` short-circuited, so neither the design gate nor
  `next build` ran — which is the correct behaviour and is stated in the header rather than left to
  be inferred. `npm run test:design -- leak` then caught the same probe **independently of ESLint**:
  **1 failed / 17 passed**, naming the file, the line, the pattern class and the matched text.
  Reverted; `npm run build` **exit 0 in 72s**.
- **Both gates read ONE list, and one SCOPE (D-16).** `eslint.config.mjs` imports
  `DESIGN_LEAK_PATTERNS` *and* spreads `LEAK_SCAN_GLOBS` into its `files:` key, so the two halves
  cannot disagree about where the rule applies any more than about what it bans. Zero new npm
  dependencies — the plugin is defined inline, which is T-10-36's disposition honoured rather than
  merely accepted.
- **10-15's handoff is asserted three ways, not honoured by omission.** `src/lib/design/**` is
  excluded from the scan because `tokens.generated.ts` carries hex literals by design. The test
  asserts the file was **walked**, is **not scanned**, and **WOULD produce ≥40 violations** if it
  were — so the exclusion is proven to be doing work rather than being an artifact of never looking.
- **D-17 is made checkable.** The positive control asserts all **30** vendored primitives were
  visited by name-count, plus `button.tsx`, `badge.tsx` and `dialog.tsx` individually — the last
  because `dialog.tsx:42` carried the one vendored `bg-black` at baseline. Without it,
  `expect(violations).toEqual([])` would pass just as happily against a scanner that visited nothing.
- **D-13's drift check found a real, undeclared pairing on its first run** — and exactly one. See the
  section below.
- **Design gate 375/375** (was 340 at 10-16's close), 20 files, DB-free. Full DB suite **1197 passed
  / 4 skipped**, unchanged. `tsc --noEmit` exit 0. `npm run lint` **0 errors / 9 warnings** —
  byte-identical to the phase baseline, with the new rule live.

## The drift check found one undeclared pairing, and it took two narrowings to be sure it was the only one

The naive form the plan specifies — cross-multiply every `text-*` and every `bg-*` inside one string
— reports **25 raw pairings**, of which 7 are absent from the inventory. Six of those seven are
artifacts of the method, and the interesting thing is that they are artifacts of **two different**
failure modes, neither of which the plan anticipates.

**Narrowing A — variant chains must be able to co-apply.** `ui/calendar.tsx:221` carries
`data-[range-middle=true]:bg-muted`, `data-[range-middle=true]:text-foreground`,
`data-[range-end=true]:bg-primary` and `data-[range-end=true]:text-primary-foreground`. The naive
cross product pairs `text-foreground` with `bg-primary`: near-black ink on a near-black surface,
**~1.1:1**. Those two day states are mutually exclusive and never paint together.

That phantom matters because it is **resolvable by neither of the two routes the plan offers**. Its
own words: *"either it is legitimate, in which case add the row … or it fails the bar, in which case
the component is fixed."* Adding the row would declare a 1.1:1 pairing legal — `contrast.test.ts`
would fail on it immediately, correctly. "Fixing the component" would mean breaking a calendar that
is not broken. When a check produces a finding that neither honest route can close, **the check is
wrong**, and the check is what gets fixed. So a foreground and a background are paired only when
their variant chains are identical, or when at least one is unconditional.
`ui/dropdown-menu.tsx:76` produces the same shape across `not-data-[variant=destructive]:` and
`data-[variant=destructive]:` — a *negated* variant paired against the thing it negates.

**Narrowing B — `dark:` utilities cannot paint, so they are skipped.** `globals.css:32` defines the
variant as `&:is(.dark *)`, and nothing activates `.dark`: the provider writes
`attribute="data-theme"` *specifically* to avoid that collision, `enableSystem` is false, and the
theme list is overridden to court/grove (D-03/D-06). `dark:bg-input/30` in `button.tsx`, `input.tsx`
and `checkbox.tsx` was pairing against light-mode foregrounds and inventing three more phantoms.

**A skip is a hole unless the reason is pinned.** So all four mechanisms are asserted — the two
provider props, the exported `THEMES` tuple, and the `@custom-variant` selector itself — and the
header states that if `.dark` is ever activated the narrowing must be replaced by a **third theme in
the inventory**, not left in place. Watched red at **1 failed / 12 passed** with `attribute="class"`
substituted.

**What survived both narrowings is real, and it is one pairing at two sites.**

| Site | Classes | What it is |
|---|---|---|
| `src/components/ui/tooltip.tsx:45` | `bg-foreground` + `text-background` | the inverted dark tooltip |
| `src/components/listing/photo-uploader.tsx:278` | `bg-foreground/80` + `text-background` | the "Cover" chip over a listing photo |

Both are legitimate and both were **measured before being declared**, per the plan's rule:

| Row | court | grove | bar |
|---|---|---|---|
| `background` on `foreground` | **19.80** | **18.42** | 4.5 |
| `background` on `foreground` @80% over `background` | **11.20** | **10.24** | 4.5 |

**2 rows added** to `CONTRAST_PAIRS` (29 → 31), and `npm run test:design -- contrast` is green at
73 assertions. The `/80` row's `over: background` is the **worst case rather than the true one**, and
the note says so: the real surface is a photograph, and any photo darker than the page background
composites darker still, which only increases contrast against the near-white text.

**Watched red in both directions**, because one direction proves half a check:

| Mutation | Result |
|---|---|
| the 2 new rows removed from the inventory | **1 failed / 11 passed** — names both sites and both class pairs |
| `text-brand` injected beside `bg-primary` in `badge.tsx` | **1 failed / 11 passed** — `brand on accent-foreground`, 2 sites |

## Task Commits

1. **Task 1: The ESLint rule, the authoritative leak gate and the pair-drift companion** — `4e4b69a` (test)
2. **Task 2: Rewrite the build script and prove the gate goes red** — `de17846` (feat)
3. **Deviation: pin the dormancy that makes the `dark:` narrowing safe** — `1b4610d` (test)

**Task 3:** not started — blocking human checkpoint.

## Files Created/Modified

- **`eslint.config.mjs` — modified.** One entry appended after `globalIgnores`, in the file's
  existing comment-above-each-entry style, plus an inline plugin defined above the `defineConfig`
  array. The rule visits `Literal` and `TemplateElement`; the type guard on `node.value` is
  load-bearing rather than defensive, because ESLint's `Literal` also fires on regex and numeric
  literals. The escape hatch is the repo's existing form —
  `// eslint-disable-next-line fitout/no-raw-design-value`, the same mechanism
  `listing-card.tsx:234` already uses for `@next/next/no-img-element` — and the header says
  explicitly not to invent a `/* design-token-exempt */` marker.
- **`tests/design/leak.test.ts` — created, 18 assertions.** Modelled on
  `tests/use-server-exports.test.ts` in structure and in discipline: an OBSERVED RED block (now
  holding two real failing runs), a COVERED / NOT COVERED header, scan-once-at-module-level,
  assert-in-`it()`, Windows path normalisation, guard-the-guard, synthetic fixtures, and the
  authoritative one-liner against an empty array. It parses with the TypeScript compiler API rather
  than grepping — the same reason `use-server-exports.test.ts` gives, sharpened by this phase's
  twelve grep-versus-comment collisions.
- **`tests/design/pair-drift.test.ts` — created, 13 assertions.** See the section above. Its
  `NOT COVERED` block lists five real blind spots, including the cross-element pairing the plan
  required to be stated and the alpha-blindness of the lookup (`contrast.test.ts` measures the
  alpha per row; this file only asks whether the pair is declared at all).
- **`package.json` — modified.** One line. Nothing else in the scripts block changed, and no CI
  workflow was created: `ls .github` fails, and `.github` does not exist at all.
- **`src/lib/design/contrast-pairs.ts` — modified.** +2 rows with their measurements in the notes,
  and one stale sentence corrected: the NOT COVERED header attributed the same-string drift check to
  "plan 10-12", which never owned it. It now names the file, which cannot go stale.
- **`deferred-items.md` — modified.** D-9's disposition (see below).

## Decisions Made

- **Two narrowings of the cross product**, and the calendar phantom is the argument for both. See the
  dedicated section. Recorded as deviations rather than quietly implemented, because the plan's text
  specifies the naive form.
- **Alias groups are derived from token values, not typed.** The plan names two groups (`secondary`/
  `muted`/`accent` and `card`/`popover`); the stylesheet actually has **six**, including
  `foreground`/`card-foreground`/`popover-foreground`, without which `ui/alert.tsx`'s
  `bg-card text-card-foreground` reads as undeclared. A hand-written list would have been wrong on
  day one. Deriving them also means a future theme that pulls `--accent` away from `--muted` splits
  the group automatically instead of leaving the list silently wrong. The collapse is controlled: a
  test asserts that tokens with genuinely different values stay apart, otherwise the alias map would
  be a way of making every pairing look declared.
- **`npm run lint` is 17 seconds, not 85.** The plan instructs the SUMMARY to record ~85s. Measured
  three times on this box today: **17s**. 10-12's content-root narrowing is the likely cause
  (RESEARCH measured 85s before it). The accepted price of T-10-35 is therefore **~29s** of extra
  build (lint 17s + design gate 12s) against a 72s total, not 85s. Recording the plan's number would
  have been a false measurement in the one phase whose entire argument is that a measurement beats a
  document.
- **The Vitest gate is STRICTER than ESLint on one point, deliberately.** A file-level
  `/* eslint-disable fitout/no-raw-design-value */` is honoured by ESLint and **not** by the Vitest
  gate. The asymmetry runs in the safe direction — the authoritative half is the strict half — and it
  means a whole-file opt-out is impossible rather than merely discouraged. Stated in NOT COVERED.
- **D-9 ACCEPTED as debt, with reasoning and a re-verified number.** Full entry in
  `deferred-items.md`. Short form: the byte figure is unchanged (**119,835**, reproduced by summing
  the emitted chunks — no rebuild needed); `@source not` would make `/dev/theme` render **unstyled**,
  which is the surface Task 3's checkpoint is performed on, so that "fix" would break the acceptance
  step it competes with; a safelist is the second list D-16 and D-18 exist to abolish; and the third
  option (a build-time decision about whether the route is emitted) is net-new build configuration,
  the same class of scope the plan explicitly forbids for CI. In context: 10-12 took the stylesheet
  from 134,132 → 119,079 bytes, and `/dev/theme` puts 1,103 back — the phase still ships **−10.66%**.
- **DS-13 and DS-06 left Pending, not marked Complete.** Both are satisfied by Tasks 1-2. But Task 3
  asks the developer to accept or reject **D-11, the accent deepening**, and a rejection is a scope
  decision that could re-derive `--brand` — which would move every number DS-06 rests on. Closing a
  requirement before the input that could invalidate it has arrived is the kind of tidiness this
  phase has repeatedly refused. The continuation agent closes them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's naive cross product produces an unresolvable false positive**

- **Found during:** Task 1, first run of the drift check against the real tree
- **Issue:** `ui/calendar.tsx:221` pairs `data-[range-middle=true]:text-foreground` with
  `data-[range-end=true]:bg-primary` — two mutually exclusive day states — synthesising a ~1.1:1
  pairing that never renders. `ui/dropdown-menu.tsx:76` does the same across a `not-` variant and the
  variant it negates. The plan's two prescribed resolutions ("add the row" / "fix the component")
  both make the tree worse.
- **Fix:** Narrowing A — a foreground and a background are paired only when their variant chains are
  identical or at least one is unconditional. The reason is written at the narrowing, with the
  calendar named, and a synthetic fixture asserts the two REAL calendar pairings still pair while the
  phantom does not.
- **Files modified:** `tests/design/pair-drift.test.ts`
- **Verification:** the fixture asserts exactly 2 pairings from the calendar's 4 classes; the tree
  scan drops from 7 undeclared to 4.
- **Committed in:** `4e4b69a`

**2. [Rule 1 - Bug] `dark:`-scoped utilities were pairing against light-mode foregrounds**

- **Found during:** Task 1, same run
- **Issue:** `dark:bg-input/30` in `button.tsx`, `input.tsx` and `checkbox.tsx` was crossed with
  `text-foreground` / `placeholder:text-muted-foreground` / `data-checked:text-primary-foreground`.
  The inventory is measured from the two `[data-theme]` blocks and
  `config/design-tokens-source.mjs` never reads `.dark` at all — by design.
- **Fix:** Narrowing B — `dark:`-scoped utilities are skipped, because they cannot paint: nothing
  activates `.dark` (D-03/D-06).
- **Files modified:** `tests/design/pair-drift.test.ts`
- **Verification:** undeclared count drops from 4 to 1.
- **Committed in:** `4e4b69a`

**3. [Rule 2 - Missing] Narrowing B was a hole in the gate until its precondition was asserted**

- **Found during:** Task 2, while writing the SUMMARY's justification for narrowing B
- **Issue:** "`dark:` utilities cannot paint" is true *today*. Nothing enforced it. A future
  `attribute="class"`, an `enableSystem={true}`, or a `dark` entry in `THEMES` would make every
  skipped utility live and this gate would keep skipping them **silently** — a check that quietly
  stops checking, which is the exact failure class this phase exists to remove.
- **Fix:** four assertions pinning the mechanisms (`attribute="data-theme"`, `enableSystem={false}`,
  the exported `THEMES` tuple, and `globals.css`'s `@custom-variant dark (&:is(.dark *));`), plus a
  header instruction that an activated `.dark` must be answered with a third theme in the inventory
  rather than by keeping the skip.
- **Files modified:** `tests/design/pair-drift.test.ts`
- **Verification:** watched red at **1 failed / 12 passed** with `attribute="class"` substituted;
  restored from a backup copy and green at 13.
- **Committed in:** `1b4610d`

**4. [Rule 2 - Missing] Two inventory rows the drift check demanded**

- **Found during:** Task 1
- **Issue:** `ui/tooltip.tsx:45` and `listing/photo-uploader.tsx:278` both render the INVERTED
  surface — `text-background` on `bg-foreground` — and no row declared it. The plan's own rule
  requires resolution by adding a measured row or by fixing the component; both surfaces are correct,
  so both rows were added.
- **Fix:** +2 rows in `src/lib/design/contrast-pairs.ts`, each measured in both themes before being
  written (19.80/18.42 solid; 11.20/10.24 at 80%), with the `over: background` approximation
  identified in the note as the worst case rather than the true one.
- **Files modified:** `src/lib/design/contrast-pairs.ts`
- **Verification:** `npm run test:design -- contrast` green, 69 → 73 assertions.
- **Committed in:** `4e4b69a`

**5. [Rule 1 - Bug] A stale cross-reference in `contrast-pairs.ts`'s own NOT COVERED header**

- **Found during:** Task 1
- **Issue:** it attributed the same-string drift check to "plan 10-12", which never owned it and
  never wrote one.
- **Fix:** it now names `tests/design/pair-drift.test.ts`, which is a file rather than a guess and
  cannot go stale the way a plan number can.
- **Files modified:** `src/lib/design/contrast-pairs.ts`
- **Committed in:** `4e4b69a`

### Instructions deliberately not followed literally

- **"Record that `npm run lint` measures roughly 85 seconds."** It measures 17. See Decisions.
- **The plan's Task 3 `<what-built>` says "pinning the vendored 56".** The pinned number is **54**.
  D-2 recorded the drop after 10-07 removed two dark-mode twins alongside two accessibility defects,
  10-12/10-13/10-14 each re-measured 54 independently, and 10-14 corrected `REQUIREMENTS.md` at
  source. This is flagged in the checkpoint hand-off so the developer is not shown a wrong number;
  **no source or requirement was changed to match the plan's text.**

---

**Total deviations:** 5 (3 × Rule 1, 2 × Rule 2). No Rule 4 checkpoint was needed.
**Impact on plan:** every artifact the plan names exists, every `must_haves` truth holds for Tasks
1-2, and every Task 1 and Task 2 acceptance criterion passes. Two instructions were not followed
literally and both are recorded above with the measurement that overrode them.

## Deferred Issues

- **D-9 DISPOSITIONED — accepted as debt.** This plan was the nominated owner, looked at it, and
  wrote the decision and the re-verified number into `deferred-items.md` rather than leaving the item
  to drift to Phase 17 unexamined. Re-nominated to Phase 17 so the number is re-checked once, not
  carried forever.
- **Not new:** D-3, D-4, D-5, D-6, D-7, D-8 remain open and untouched.
- **Nothing new deferred.** Every discovery in this plan was inside its own scope and was fixed.

## Issues Encountered

- **The most valuable finding was that the plan's own algorithm was wrong** — and the tell was not a
  failing test, it was a finding that neither of the plan's two prescribed resolutions could close.
  That shape is worth naming: when a gate reports something you can neither declare legal nor fix in
  the code, the gate is what is broken. Both narrowings came out of following that thread rather than
  reaching for the nearest exemption.
- **`npm run test:e2e` was NOT run, and that is a deliberate departure from the last five plans.**
  This plan changes no runtime code path: the only `src/` edit is two data rows and one comment in
  `contrast-pairs.ts`, a module imported by exactly one consumer, `tests/design/contrast.test.ts`
  (grep-verified). The remaining edits are an ESLint config, an npm script and two test files.
  D-6 item 1 has now produced five byte-identical signals and 10-13's summary asked future executors
  not to re-derive its causality; running it here would have produced a sixth identical line and no
  information. Saying so is better than a sixth reproduction reported as diligence.
- **The `time` builtin under Git Bash reports the npm wrapper, not the work.** `real 0m16.897s` with
  `user 0m0.213s` on the first lint measurement; every timing in this summary is wall-clock from
  `date +%s` around the command instead.
- **No blockers.**

## Verification Evidence

| Check | Result |
|---|---|
| `npm run build` (clean tree) | exit **0**, **72s** — lint ~17s, design gate ~12s, `next build` ~43s |
| **OBSERVED RED:** `#ff0000` at `src/components/ui/badge.tsx:18`, `npm run build` | **exit 1** — `fitout/no-raw-design-value` at 18:20, `✖ 11 problems (1 error, 10 warnings)`; `&&` short-circuited before `test:design` |
| **OBSERVED RED:** same probe, `npm run test:design -- leak` | **exit 1** — **1 failed / 17 passed**, `"src/components/ui/badge.tsx:18 raw hex colour \`#ff0000\`"` |
| Probe reverted | `git status --porcelain src/components/ui/badge.tsx` **empty** |
| **OBSERVED RED:** 2 new inventory rows removed | **1 failed / 11 passed** — names `ui/tooltip.tsx:45` and `photo-uploader.tsx:278` |
| **OBSERVED RED:** `text-brand` injected beside `bg-primary` in `badge.tsx` | **1 failed / 11 passed** — `brand on accent-foreground` |
| **OBSERVED RED:** `attribute="class"` substituted in the provider | **1 failed / 12 passed** — the dormancy pin |
| `npm run test:design` (whole gate) | exit **0** — 20 files, **375 passed** (was 340), no database |
| `npm run test:design -- leak` | exit **0** — **18 passed** |
| `npm run test:design -- pair-drift` | exit **0** — **13 passed** |
| `npm run test:design -- contrast` | exit **0** — **73 passed** (was 69; +2 rows × 2 themes) |
| `npm run db:up && npm run db:test:setup && npm test` | exit **0** — 132 files passed / 1 skipped, **1197 passed / 4 skipped**, unchanged |
| `npx tsc --noEmit` | exit **0** |
| `npm run lint` | exit **0** — **0 errors / 9 warnings**, byte-identical to the phase baseline |
| ESLint rule probed against a fixture | 5 true positives; `color-mix(in_oklch,…)`, `see #3388`, `text-[0.8rem]` and the disable-comment all silent |
| AC: exact `build` string comparison via `node -e` | exit **0** |
| AC: `grep -c "no-raw-design-value" eslint.config.mjs` | **3** (≥2 required) |
| AC: `grep -c "design-leak-patterns" eslint.config.mjs` | **1** (exactly 1 required) |
| AC: `grep -c "NOT COVERED" tests/design/pair-drift.test.ts` | **1** |
| AC: `grep -c "src/components/ui" tests/design/leak.test.ts` | **6** (≥1 required) |
| AC: `grep -c "next build" package.json` | **1** |
| AC: `ls .github/workflows` | **exit 2** — and `.github` does not exist at all |
| AC: `fitout/no-raw-design-value` + the date in `leak.test.ts`'s header | **3** / **1** |
| Vendored primitives visited by the leak scan | **30 / 30** |
| `src/lib/design/tokens.generated.ts` | walked ✓, not scanned ✓, would yield **≥40** violations ✓ |
| Undeclared pairings after both narrowings | **1** canonical, at **2** sites — both resolved by adding a measured row |
| GATE-06 | `drizzle/` still at **0025**, 26 files, no new migration |
| `toHaveScreenshot` anywhere in `e2e/` or `tests/` | **none**; no `*-snapshots` directory exists |
| Shipped CSS (D-9 re-verify, no rebuild) | 105,550 + 10,572 + 3,713 = **119,835 bytes** — identical to 10-16 |
| `git diff --diff-filter=D` on all 3 commits | **no file deletions** |
| `git status --short` after each commit | clean |

## Known Stubs

**None.** Both new test files are wired into `test:design`, which is now wired into `build`; the
ESLint rule is registered and was probed against a real fixture through the real `npx eslint`; the
two inventory rows are consumed by `contrast.test.ts` and each corresponds to a shipped surface.
Nothing here is a placeholder waiting on a later plan.

## Threat Flags

None. No network endpoint, no auth path, no file access pattern, no schema change; `drizzle/`
untouched at `0025` (GATE-06).

Threat register dispositions honoured:

- **T-10-04** (repudiation — the DS-13 gate) — **mitigated, and demonstrated.** A raw hex was
  injected into the vendored tree, `npm run build` returned a non-zero exit naming the rule id and
  the file, the Vitest half caught it independently, the probe was reverted and the build re-run
  green — and the failing output is pasted into the guard's own header, dated, with what was injected
  and where.
- **T-10-34** (tampering — the `package.json` build script) — **mitigated.** The blocking form is
  asserted by an exact string comparison (`node -e "process.exit(require('./package.json').scripts.build===…)"`)
  and by an `artifacts.contains` check, so a later "speed up the build" edit that drops `test:design`
  is a visible diff rather than a silent regression.
- **T-10-35** (denial of service — `npm run lint` in `build`) — **accepted, and re-priced.** The real
  cost on this box is **~29s** (lint 17s + design gate 12s) against a 72s build, not the 85s the
  register assumed. The documented alternative — scoping the lint invocation to `src/` — remains
  unnecessary.
- **T-10-36** (elevation of privilege — the inline ESLint plugin) — **accepted as planned.** The rule
  is defined inline in `eslint.config.mjs` over a repo-local pattern list. `package.json`'s
  dependency and devDependency blocks are byte-identical to the previous commit; no new
  supply-chain surface entered the tree.

## Next Phase Readiness

- **The phase itself** is blocked on Task 3 only. Every testable property is green.
- **Phase 11 (GATE-01)** inherits a build that runs lint and the design gate before `next build`. A
  visual-regression baseline captured in Phase 11 will therefore be taken against a tree that cannot
  contain a raw design value — which is the precondition DS-01 needed.
- **Phase 17 (a11y audit)** inherits two things. (1) The pair-drift check's stated residue: a
  cross-element pairing (`text-brand` inside a `bg-muted` parent) is invisible to same-string
  analysis and is explicitly assigned to the two-theme axe pass on the rendered DOM. (2) **D-9**,
  re-nominated with its disposition and its re-verified 119,835-byte figure.
- **Anyone adding a `dark:` utility, or activating `.dark`** must read
  `tests/design/pair-drift.test.ts`'s narrowing B. The drift check currently skips `dark:` because it
  cannot paint; the moment that stops being true the answer is a third theme in
  `contrast-pairs.ts`, not a wider skip. Four assertions will go red first.
- **Anyone tempted to speed up `npm run build`** by dropping a stage: the exact-string check will
  catch it, and `tests/design/leak.test.ts`'s header explains why the string is the whole
  requirement.
- No blockers.

---
*Phase: 10-design-system-foundation-theme-runtime*
*Tasks 1-2 completed: 2026-08-12 — Task 3 checkpoint OPEN*

## Self-Check: PASSED

All 6 claimed artifacts verified on disk (2 created, 4 modified) plus this file, and all 3 commits
verified in `git log` (`4e4b69a`, `de17846`, `1b4610d`). No commit deleted a file.
`git diff HEAD~2 HEAD -- package.json` shows **exactly one changed line** — the `build` script — so
the T-10-36 claim that no npm dependency entered the tree is verified rather than asserted.
`REQUIREMENTS.md` deliberately **not** touched: DS-13 and DS-06 stay `Pending` until the Task 3
verdict, for the reason given in Decisions. `deferred-items.md` re-read after the edit: D-9 carries
its DISPOSITION section and no new item was opened. STATE.md's frontmatter, Current Position and
metrics were hand-written, as the toolchain notes prescribe, and `completed_plans` deliberately
remains **16** — this plan is not complete.
