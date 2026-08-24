---
phase: 15-auth-profile-transactional-email
plan: 13
subsystem: design-system
tags: [contrast, wcag-1-4-3, wcag-1-4-11, aa, cross-element, design-gate, gap-closure, threat-mitigation]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-06's D-162 composition — the wordmark-above-one-card `(auth)` layout that put the wordmark directly on `bg-muted`, which is the pairing this plan was written to measure"
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-07's `PanelCard` conversion of all four auth screens — the `bg-card` ground every card-side row is measured against, and the `git diff --exit-code contrast-pairs.ts` line this plan replaces with a measurement"
  - phase: 10-design-system-foundations
    provides: "`src/lib/design/contrast-pairs.ts` (39 declared pairs, 7 exclusions, `DERIVED_SURFACES`, the bars and `AA_EPSILON`), and `tests/design/contrast.test.ts`'s seven hand-rolled WCAG functions"
  - phase: 10-design-system-foundations
    provides: "`tests/design/pair-drift.test.ts`'s value-derived alias map, bracket-depth-zero variant splitting and the declared-colour-token rule — restated here, and its documented cross-element blind spot is the gap this plan closes"
  - phase: 12-responsive-and-polish
    provides: "`e2e/overflow-320.spec.ts`'s WATCHED RED convention — mutation named, command quoted, failure transcribed verbatim, blast radius argued, revert recorded"
provides:
  - "`tests/design/auth-contrast.test.ts` — the auth surface's cross-element AA gate: 23 ink-on-ground rows measured in BOTH themes, 170 tests, build-blocking through `test:design`"
  - "`tests/design/helpers/contrast-math.ts` — one definition of the WCAG maths, imported by both contrast gates so they cannot disagree about a ratio"
  - "the measured table for the auth composition in court and grove, transcribed into a file a command re-derives"
  - "D-162's wordmark-on-`bg-muted` pairing CONFIRMED at 18.16 (court) / 16.89 (grove) against the tree as it stands"
  - "a completeness census over the eight auth composition files: a colour utility with no declared row turns `npm run build` red"
  - "three inheritance premises asserted rather than assumed — `BRAND_CLASS` is colour-free, `globals.css`'s body rule supplies the ink, no auth page passes `tone` or `footer`"
affects: [design-system, accessibility, 15-verification, 15-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A design row that names the EXACT class string in the EXACT file producing each side, anchored by AST parse so it cannot outlive its markup"
    - "A completeness CENSUS beside a measured inventory — the inventory says the declared pairs are readable, the census says nothing renders that is not declared"
    - "An `inherited: true` row whose premise (the class the inheritance passes through carries no colour) is a separate, falsifiable assertion"
    - "A pure `uncovered(uses, rows, exempt)` function so a fixture can prove BOTH directions of an escape hatch the real tree exercises in neither"
    - "A declared set filtered to SOLID rows, so an alpha-composited row can never vouch for a solid pairing (WR-05's lesson, carried forward)"

key-files:
  created:
    - "tests/design/auth-contrast.test.ts"
    - "tests/design/helpers/contrast-math.ts"
  modified:
    - "tests/design/contrast.test.ts"
    - ".planning/phases/15-auth-profile-transactional-email/deferred-items.md"

key-decisions:
  - "D-162's cited 18.16 / 16.89 is CONFIRMED, not corrected — and a confirmation is a finding, because an unconfirmed citation and a stale one are indistinguishable until one is run"
  - "ZERO new `CONTRAST_PAIRS` rows: all 23 rows canonicalise onto already-declared pairings, so no row was added and no floor moved. Inventing one would be the inverse defect `pair-drift.test.ts` is one-directional about"
  - "The WCAG maths gets one home; the class-string CLASSIFIER deliberately does not — two classifiers produce two reports, two maths produce two ratios, and extracting `pair-drift.test.ts`'s scanner would touch a gate this plan must leave byte-unchanged. Logged rather than absorbed"
  - "The declared set is filtered to SOLID inventory rows, and a tinted utility is REPORTED rather than matched — carrying WR-05's lesson into a new gate instead of re-learning it"
  - "The four edges the auth surface ships (`ring-foreground/10`, `border-input`, `border-border`, `border-primary`) are named in `AUTH_EXEMPT` WITH their measurements rather than silently skipped, because IN-10 leaves edges unpaired tree-wide and the auth half of that deferral should at least be written down"
  - "STATE.md and ROADMAP.md repaired by hand after `gsd-sdk v1.42.3` re-ticked 15-05 `[x]` and fabricated `completed_plans` 103 → 108 — the third consecutive plan to have to do so"

requirements-advanced: [AUTHUI-03]

metrics:
  duration: "~40 min"
  completed: 2026-08-25
  tasks: 2
  commits: 2
  files-created: 2
  files-modified: 2
  rows-measured: 23
  themes: 2
  new-contrast-pairs-rows: 0
---

# Phase 15 Plan 13: The Auth Composition's AA Measurement Summary

The four auth screens' ink-on-ground pairs are now measured in court AND grove by a standing,
build-blocking gate that names the exact class string in the exact file producing each side — closing
`pair-drift.test.ts`'s documented cross-element blind spot for the D-162 surface, and confirming the
wordmark-on-`bg-muted` figure the layout cites at 18.16 / 16.89 rather than inheriting it.

## What Was Built

**`tests/design/helpers/contrast-math.ts`** — the seven hand-rolled WCAG functions (`hexOf`,
`channelsOf`, `luminance`, `contrast`, `composite`, `mixInOklch`, and `resolve` → `resolveToken`)
lifted out of `contrast.test.ts` so both contrast gates measure with one implementation. D-16's
one-import-site rule, applied one level down from token data to the arithmetic. `resolveToken` takes
the token map as an argument rather than closing over a module-level `themes`, so there is no second
map either.

**`tests/design/auth-contrast.test.ts`** (1652 lines, 170 tests) — the auth composition's
cross-element AA gate:

- **23 `AUTH_INK_ON_GROUND` rows**, each carrying `ink`, `ground`, `bar`, `state`, `inkFrom`,
  `groundFrom`, a `where` sentence in the words a person would use, and a `note` saying why the row
  exists and what a red would mean. Measured in both themes → **46 measurement assertions**.
- **5 `AUTH_EXEMPT` entries**, each with its measurement and its reason, three of them pointing at
  the `EXCLUDED_PAIRS` row that already carries the argument.
- **51 anchors** across 12 files, asserted present as string literals or template chunks via the
  TypeScript compiler API — never grepped, because this file's own measured table is full of token
  names and would satisfy a grep.
- **A completeness census** over the eight auth composition files, finding 28 colour uses, requiring
  every ink and every ground to have a declared row *in a compatible state*.
- **Three inheritance premises**, each falsifiable: `BRAND_CLASS` carries no colour utility;
  `globals.css`'s base layer applies `text-foreground` to `body`; none of the four pages passes
  `tone` or `footer` to `PanelCard`.
- **Guard-the-guard floors** plus a `VIOLATING_FIXTURE` proving the scanner reports the undeclared
  ink, ignores a colour named in a *comment*, and does not classify `text-heading` / `text-sm` /
  `text-center` / `text-balance` as inks.

## The Measured Table

Court and grove, resolved hexes and ratios, as re-derived by the gate:

| ink / ground | element | court | grove |
|---|---|---|---|
| `foreground` / `muted` | **the wordmark above the card** | `#0a0a0a` on `#f5f5f5` **18.16** | `#051211` on `#eaf3f2` **16.89** |
| `foreground` / `muted` | a footer column heading | 18.16 | 16.89 |
| `foreground` / `muted` (hover) | a footer link under the cursor | 18.16 | 16.89 |
| `muted-foreground` / `muted` | the footer tagline and link labels | `#6c6c6c` on `#f5f5f5` **4.82** | `#5a6665` on `#eaf3f2` **5.28** |
| `card-foreground` / `card` | the h1; a typed field value | `#0a0a0a` on `#ffffff` **19.80** | `#051211` on `#ffffff` **19.07** |
| `muted-foreground` / `card` | the lede, the placeholder, the `or` label, the cross-link, reset's fallback, forgot's notice | `#6c6c6c` on `#ffffff` **5.25** | `#5a6665` on `#ffffff` **5.96** |
| `destructive` / `card` | the refusal line, the missing-token notice, a field message, an invalid label | `#cd0916` on `#ffffff` **5.76** | **5.76** |
| `brand-foreground` / `brand` | the coral submit | `#fafafa` on `#da2d34` **4.57** | `#f7fbfb` on `#13807c` **4.57** |
| `brand-foreground` / `brand-hover` | the coral submit, hovered | `#fafafa` on `#c32b37` **5.41** | `#f7fbfb` on `#137470` **5.36** |
| `primary-foreground` / `primary` | signup's SELECTED intent | `#fafafa` on `#171717` **17.18** | `#f7fbfb` on `#0c2422` **15.60** |
| `card-foreground` / `background` | signup's IDLE intent; the outline Google button | `#0a0a0a` on `#ffffff` **19.80** | `#051211` on `#f7fcfc` **18.42** |
| `card-foreground` / `accent` (hover) | signup's idle intent, hovered | 18.16 | 16.89 |
| `ring` / `background` (focus) | the focus indicator | `#555555` on `#ffffff` **7.46** | `#495958` on `#f7fcfc` **7.11** |

Exempt, measured rather than skipped: the card hairline `foreground@10%` on `card` **1.24 / 1.24**;
`border-input` **1.26 / 1.28**; `border-border` on card **1.26 / 1.32**; `border-primary` on card
**17.93 / 16.27**; the in-flight submit at 50% element opacity **2.19 / 1.99** (WCAG 1.4.3's
inactive-component exemption, stated with its condition).

Tightest pairing on the whole surface: `muted-foreground` on `muted` at **4.82** court against a
4.55 requirement — 0.27 of headroom against two tokens that are both free to move.

## D-162's Cited Number: CONFIRMED

`src/app/(auth)/layout.tsx` cites `foreground` on `muted` at **18.16 court / 16.89 grove**. That
figure was declared and measured in an earlier phase, against a **different composition** — the
public header used to supply the wordmark's own surface, and D-162 moved the wordmark onto the
layout's `bg-muted`. Re-measured against the tree as it stands, the composition returns **18.16 /
16.89** exactly. The layout's comment is accurate, and this run is now what keeps it accurate rather
than the fact that somebody once checked.

## Zero New `CONTRAST_PAIRS` Rows — And That Is The Measurement

`git diff --exit-code src/lib/design/contrast-pairs.ts` exits 0. The `>= 39` floor did not move,
because nothing was added to move it for.

All 23 rows canonicalise onto pairings the inventory already declares, through an alias map **derived
from token values rather than typed** — which is what makes `card-foreground on card` and
`foreground on card` one measurement rather than two, and what would split them automatically if a
future theme pulled the tokens apart. Inventing a row so the plan had something to add would have
been the *inverse* defect: a declared pairing nothing renders, which `pair-drift.test.ts` is
one-directional about and would never have caught.

## Two Watched Reds

**R-A — the census is real.** An accent ink appended to the existing class string on
`src/app/(auth)/forgot-password/page.tsx:96`.

```
FAIL  the auth composition writes no colour this file has not declared >
      declares a row for every ink and every ground the eight files paint
expected [ Array(1) ] to deeply equal []
+ [
+   "src/app/(auth)/forgot-password/page.tsx:96 `text-success` — no declared row uses
+    `success` as an ink.",
+ ]
```

**1 failed / 169 passed**, and the second number is the finding. All 46 measurement assertions stayed
green — nothing about the tokens changed; what changed is that a surface started painting a pairing
nobody declared. Confirmed from the other side with the mutation still applied:
`contrast.test.ts` + `pair-drift.test.ts` + `leak.test.ts` returned **131 passed, 0 failed**. Three
green gates and one red one over a real defect is the measurement this plan owed — the token-layer
gate documents itself as unable to produce this failure, and now there is a run that shows it.
Reverted; `git diff --exit-code src/` exits 0; re-run 170 passed.

**R-B — the anchor is real.** The wordmark row's `groundFrom.classString` in the test file itself,
pointed at a surface utility the layout does not contain. **1 failed / 169 passed**, naming the row,
the file and the string it could not find. No `src/` file touched. Reverted; re-run 170 passed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `postcss.walkAtRules` callback would have halted the `@apply` walk**
- **Found during:** Task 2, premise 2 (`globals.css`'s body rule)
- **Issue:** `rule.walkAtRules("apply", (at) => applied.push(...))` — postcss reads a truthy
  *return* as "stop walking", and `Array.prototype.push` returns the new length. The arrow shorthand
  would have stopped after the first `@apply`.
- **Fix:** block body, with the reason written beside it.
- **Caught by:** `npx tsc --noEmit` (`Type 'number' is not assignable to type 'false | void'`) — not
  by a test, because the walk's *first* `@apply` is the one the assertion needs, so it would have
  passed for the wrong reason.
- **Files modified:** `tests/design/auth-contrast.test.ts`
- **Commit:** `0d8ce0d`

### Recorded, Not Fixed

**2. [Scope] The `culori` import line in `contrast.test.ts` narrowed as well as the deleted bodies.**
The plan's acceptance says the diff should show "only deleted function bodies, one added import".
`converter`, `formatHex` and `parse` had no consumer left after the extraction and `DERIVED_SURFACES`
likewise, so leaving them would have been an unused-import lint error. The diff is otherwise exactly
as specified — no `it()` title, no floor, no assertion and no other number moved.

**3. [Rule 4 avoided] The class-string classifier now has two implementations.**
`splitVariants` / `classifyUtility` / `colourUsesIn` exist in `pair-drift.test.ts` and again here.
Extracting them is the right end state but means lifting a ~300-line scanner out of a gate this
plan's own verification requires to be left byte-unchanged and re-run green — an architectural move
inside a gap-closure commit. Re-stated faithfully instead, with both files pinning the same
behaviours, and **logged to `deferred-items.md`** with the shape of the fix.

**4. [Scope] `(auth)/error.tsx`'s header still describes the pre-D-162 composition** ("`(auth)/layout.tsx`
renders `PublicHeader`"). Cosmetic; the boundary's argument is unaffected and it renders no colour
utility. Fixing it would modify a file this plan's verification requires unchanged. **Logged to
`deferred-items.md`.**

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run build` (`lint && test:design && next build`) | **exit 0** — the gate is build-blocking |
| `npm run lint` | 0 errors, 25 warnings (all pre-existing, none in the new files) |
| `npm run test:design` | 55 files, **1078 passed / 3 skipped** (1013 before this plan) |
| `tests/design/auth-contrast.test.ts` | **170 passed** |
| `tests/design/contrast.test.ts` | **89 before the extraction, 89 after** — run UNSCOPED |
| `pair-drift` + `contrast` + `leak` + `token-drift` | 139 passed — the neighbouring colour gates unaffected |
| `git diff --exit-code src/lib/design/contrast-pairs.ts` | exit 0 — no row added |
| `git diff --exit-code 'src/app/(auth)' src/components` | **exit 0 — not one pixel moved** |
| `git diff --name-only src/` | empty |
| `grep -c "^export function" helpers/contrast-math.ts` | 7 |
| `grep -c "helpers/contrast-math"` in each gate | 1 and 1 |

**No baseline dispatch is owed.** Nothing under `src/` changed, so no visual baseline can have moved
and no `baselines.yml` `workflow_dispatch` is needed.

## Census Numbers

| | |
|---|---|
| Files scanned | 8 (`(auth)/layout.tsx`, the four pages, `(auth)/error.tsx`, `panel-card.tsx`, `site-footer.tsx`) |
| Files contributing ≥1 colour utility | 7 — `(auth)/error.tsx` contributes zero, which is why the floor is 6 |
| Colour utilities collected | 28 |
| Rows declared | 23 |
| Exemptions declared | 5 |
| Anchors asserted | 51, across 12 files |
| Colour tokens in the vocabulary | 23 |

## Known Stubs

None. This plan adds a test and a test helper; it wires no data and renders nothing.

## Threat Flags

None. This plan adds no route, no input path, no network call, no schema change and no dependency —
stated rather than left blank so the absence is a finding rather than an omission. The threat
register's four `mitigate` rows are all discharged: T-15-29 by the census plus the floors plus R-A's
transcript; T-15-30 by the 51 AST anchors plus R-B's transcript; T-15-35 by the measured table being
a command's output rather than a report's sentence; T-15-36 by the single maths module and
`contrast.test.ts`'s positive controls exercising the imported functions.

## Requirement Status

**AUTHUI-03 ADVANCED, NOT ticked.** It is conjunctive across five gates — 320px, keyboard, AA,
designed states, a baseline. Plan 15-12 closed the **keyboard** clause; this closes the **AA** clause.
Whether the requirement is satisfied is 15-14's bookkeeping and the re-verification pass's call, not
this plan's.
