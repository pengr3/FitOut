---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 07
subsystem: design-system
tags: [state-01, ds-11, skeletons, measurements, contrast, wcag-1411, patterns-layer, design-gate, typescript-ast, jsdom]

# Dependency graph
requires:
  - phase: 10-design-system-token-layer
    provides: "`src/lib/design/contrast-pairs.ts` (CONTRAST_PAIRS / EXCLUDED_PAIRS + the alpha-composited measurement), `tests/design/contrast.test.ts` and `pair-drift.test.ts`, `ui/skeleton.tsx`, and the DB-free `vitest.design.config.ts`"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "plan 11-02's `selector-contract.ts` — the three `skeleton-*` ids this plan is the declared `owner` of; plan 11-01's design suite inside `npm run build`; plan 11-03's `gitignore-baselines.test.ts` (which moved the suite baseline to 25 files / 474 tests)"
provides:
  - "`src/lib/design/measurements.ts` — SEVEN box constants (the UI-SPEC's six plus `TEXT_BAR_HEIGHT`), the single owner of every skeleton box class"
  - "`src/components/patterns/` — the new domain-ignorant layer, opened with three Server-Component skeletons: `CardGridSkeleton`, `RowListSkeleton`, `PanelSkeleton`"
  - "+2 `CONTRAST_PAIRS` and +3 `EXCLUDED_PAIRS`, including the first CONDITIONAL exclusion in the inventory (a skeleton fill legal only while a named status region carries the meaning)"
  - "`tests/design/skeleton-measurements.test.ts` — the AST source gate banning literal box utilities in `patterns/*skeleton*.tsx`"
  - "`tests/design/skeleton-a11y.test.tsx` — the jsdom render gate that makes the 1.09:1 exclusion legal, and the measured fact that `role=\"status\"` takes no name from its content"
affects: [11-08, 11-09, 11-10, 11-11, 11-12, 11-13, 11-14, 11-16, 11-21, 11-22]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A measurement inventory: a box class is declared once, outside the leak-gate tree but inside Tailwind's source root, and a call site that spells one out fails a gate"
    - "A CONDITIONAL contrast exclusion — an `EXCLUDED_PAIRS` row whose legality depends on a compensating requirement enforced by a NAMED sibling gate, with both files stating that deleting the gate deletes the rows"
    - "`patterns/` membership: Server Component by default, required `label` prop, no product copy, no domain imports"

key-files:
  created:
    - src/lib/design/measurements.ts
    - src/components/patterns/card-grid-skeleton.tsx
    - src/components/patterns/row-list-skeleton.tsx
    - src/components/patterns/panel-skeleton.tsx
    - tests/design/skeleton-measurements.test.ts
    - tests/design/skeleton-a11y.test.tsx
  modified:
    - src/lib/design/contrast-pairs.ts
    - tests/design/contrast.test.ts
    - tests/design/pair-drift.test.ts
    - src/app/(app)/bookings/loading.tsx

key-decisions:
  - "`aria-label` is MANDATORY on the status shell, not belt-and-braces: `role=\"status\"` is nameFrom:author, so the UI-SPEC's prescribed `sr-only` child alone computes an accessible name of `\"\"` — measured, then watched failing"
  - "A seventh measurement constant (`TEXT_BAR_HEIGHT`) rather than a second gate exemption, because an exemption for `h-4` would legalise a literal HEIGHT at a call site — the one shape T-11-GEODRIFT is about"
  - "The source gate is an AST string-literal walk, because the plan's prescribed grep reports NINE false positives against the three clean files it polices"
  - "The banned-prefix list is wider than the plan's five (`min-w`, `max-w`, `max-h`, and every `aspect-*` form), on the `COLOUR_ROLE` precedent: a list that bans `min-h` and legalises `min-w` has a hole in exactly the shape of the thing it bans"
  - "STATE-01 and DS-11 both stay Pending — this plan ships the three shapes, not the ~27 routes that must adopt them, and none of the three named card patterns"
  - "The culori gate is the authority over the UI-SPEC's measured table (D-12): two of the five stated ratios were wrong and the notes carry the corrected numbers"

patterns-established:
  - "A skeleton's geometry has ONE owner; the gate bans the literal rather than preferring the constant, so 'does not shift' is mechanical rather than intended"
  - "A conditional exclusion names the gate that enforces its condition, and both sides say that deleting the gate deletes the exclusion"
  - "A pinned floor is raised WITH the thing it counts — a floor eight rows below the truth has stopped guarding"

requirements-completed: []

# Metrics
duration: 27min
completed: 2026-08-13
---

# Phase 11 Plan 07: Measurements, Contrast Rows and the Three Skeleton Shapes Summary

**The geometry every later `loading.tsx` is measured against now has one owner, the five pairings this phase actually renders are declared and measured, and the 1.09:1 skeleton fill is a legal exclusion because a named status region — watched failing three ways — carries the meaning instead.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-08-13T11:55:00Z
- **Completed:** 2026-08-13T12:22:00Z
- **Tasks:** 3
- **Files modified:** 6 created, 4 modified

## Accomplishments

- **`measurements.ts` makes "does not shift" mechanical.** Six constants from `11-UI-SPEC § Loading` plus a seventh the spec's own AC forced (below), each carrying its derivation. It sits at `src/lib/design/` — outside the DS-13 leak gate's scanned tree, so it can name `h-20` and `aspect-[4/3]` honestly without a per-line exemption — and *inside* Tailwind's `source("../")` root, which is load-bearing and stated in the header: a "tidier" home under `config/` would compile, typecheck, pass every gate and ship skeletons with no height.
- **Three Server-Component skeletons open the `patterns/` layer.** `CardGridSkeleton` (6 cells, `RESULT_CARD_MEDIA`), `RowListSkeleton` (4 bars, `ROW_CARD_HEIGHT`), `PanelSkeleton` (`PANEL_MIN_HEIGHT` + 3 bars). None takes `"use client"`. None imports a domain module. None contains product copy — `label` is required and has no default. All three carry their declared `data-testid`, which makes plan 11-02's undeclared-id ban non-vacuous for the first time (`src/` held zero `data-testid` occurrences until this commit).
- **The contrast inventory grew by exactly 2 + 3, and one of the exclusions is a first.** The two skeleton fills are the inventory's first CONDITIONAL exclusions: legal only while `role="status"` + `aria-busy` + an `sr-only` label carry the loading state's meaning. Both `contrast-pairs.ts` and `skeleton-a11y.test.tsx` say that deleting the gate means deleting the rows, so the argument cannot rot into a comment. The third exclusion is `ui/card.tsx:15`'s `ring-1 ring-foreground/10` — the hairline on **every card in the app since v1.0**, measured by nothing until now.
- **Five watched reds, all verbatim in the gates' own headers.** The plan asked for four; the fifth is the one that mattered (below). Every probe was reverted with `git checkout --` and the tree verified clean.
- **The `over: "background"` correctness is in the row's note, verbatim.** `group-hover:bg-muted/40` is applied to the `Card` itself, so it REPLACES `bg-card` rather than layering over it. Writing `over: "card"` would have measured a stack that never renders — the same class of error that let the focus ring ship at 2.58 as a token pair and 1.54 as rendered.

## Task Commits

1. **Task 1: The measurement inventory and the five contrast rows** — `9ae04e2` (feat)
2. **Task 2: The three skeleton patterns** — `b08343e` (feat)
3. **Task 3: The two skeleton gates** — `8170333` (test)

## Files Created/Modified

**Created**

- `src/lib/design/measurements.ts` — 7 constants with derivations, the leak-gate/Tailwind-root reasoning, and a NOT COVERED footer handing "the constant still matches the real content" to plan `11-21`'s ±2px Playwright comparison.
- `src/components/patterns/{card-grid,row-list,panel}-skeleton.tsx` — the three shapes, each with the mandatory `role="status"` shell and the measured `aria-label` note.
- `tests/design/skeleton-measurements.test.ts` — 8 assertions: three guard-the-guard clauses asserted FIRST, the import clause, the literal ban, and three both-directions self-tests over synthetic fixtures.
- `tests/design/skeleton-a11y.test.tsx` — 10 assertions: two guard-the-guard clauses (including the runnable control proving `role="status"` takes no name from content), the per-shape contract ×3, the per-shape bar-hiding contract ×3, and the count-prop wiring.

**Modified**

- `src/lib/design/contrast-pairs.ts` — +2 `CONTRAST_PAIRS`, +3 `EXCLUDED_PAIRS`, and a new NOT COVERED bullet stating that two exclusions are conditional and that this file cannot check their condition.
- `tests/design/contrast.test.ts` / `tests/design/pair-drift.test.ts` — pinned counts raised (table below).
- `src/app/(app)/bookings/loading.tsx` — the 80px derivation MOVED to `ROW_CARD_HEIGHT` rather than duplicated; the comment now points at the constant and records that the surviving literal dies when the route migrates onto `RowListSkeleton`.

### Pinned counts, old → new

| File | Assertion | Old | New | Why |
|---|---|---|---|---|
| `tests/design/contrast.test.ts` | `CONTRAST_PAIRS.length` | `>= 29` | `>= 39` | 29 was phase 10's opening count; the inventory was already at 37, so the floor would have passed with the entire hover section deleted |
| `tests/design/contrast.test.ts` | `EXCLUDED_PAIRS.length` | `> 0` | `>= 6` | "at least one exclusion exists" cannot notice five going missing |
| `tests/design/pair-drift.test.ts` | `DECLARED.size` | `>= 20` | `>= 37` | 35 keys from 37 rows before this plan, 37 from 39 after (two rows collapse onto one key by design) |
| `tests/design/pair-drift.test.ts` | rows carrying `alpha` or `fgAlpha` | `> 5` | `>= 13` | 11 before, 13 after; this is the guard that proves the opacity loop inspected anything |

All four are FLOORS, never equalities (D-32) — raised with the inventory rather than pinned to it.

## Decisions Made

- **`aria-label` on the status shell is required, and the requirement was measured.** `11-UI-SPEC § Loading` prescribes `<div role="status" aria-busy="true">` "carrying an `sr-only` label" and then states the falsifiable claim as "a NON-EMPTY accessible name". Those are incompatible: `status` is `nameFrom: author` in ARIA, so a status region whose only content is an `sr-only` span computes an accessible name of `""`. Probed with `dom-accessibility-api` (the engine behind `getByRole(…, { name })`) before writing the components: content-only → `""`, with `aria-label` → the label. All three patterns carry BOTH — `aria-label` for the NAME, the span as the live region's CONTENT — and the gate carries a runnable control so a future "the aria-label is redundant" simplification goes red with the reason attached.
- **A seventh constant, not a second exemption.** `TEXT_BAR_HEIGHT = "h-4"`. The UI-SPEC declares six constants and then requires (AC#16) zero literal box utilities in a skeleton; all three prescribed shapes are "a box plus two or three text bars", and none of the six can express a bar's height. The two requirements cannot both hold at six. An exemption for `h-4` would have legalised a literal HEIGHT at a call site, which is precisely T-11-GEODRIFT; a constant keeps the ban absolute and leaves the proportional widths as the gate's only exemption. The value matches both shipped analogs byte-for-byte, so the routes that migrate later shimmer at the geometry they shimmer at today.
- **STATE-01 and DS-11 are left Pending in REQUIREMENTS.md.** STATE-01 requires *every* data-backed route to have a designed loading state; this plan ships the three shapes the ~27 routes will compose, not the routes. DS-11 is `ResultCard`/`RowCard`/`PanelCard`, which plan `11-08` owns and this plan ships none of. Same precedent as `11-02` leaving GATE-04 Pending with two clauses outstanding.
- **The gate wins over the document (D-12).** Two of the five ratios in the UI-SPEC's measured table were wrong under the gate's gamma-space compositing: `foreground on muted/40` is 19.13 / 17.76 (not 19.42 / 17.80) and `muted-foreground on muted/40` is 5.07 / 5.55 (not 5.08 / 5.56). The notes carry the corrected numbers and say which source was corrected. The three exclusion measurements (1.09/1.09, 1.09/1.13, 1.24/1.24) matched the table exactly.
- **The proportional widths are exempt with an argument, not by convenience.** `w-1/2`, `w-2/3`, `w-3/4` are carried as DATA with a `why` each — the `EXCLUDED_PAIRS` idiom — and the gate asserts every exemption has a reason over 40 characters. The argument is that no title, price or metadata line in the product is *defined* as three-quarters of a card wide, so no future edit to the real content can make these numbers wrong. `w-full` is not exempt because it is not a measurement at all: it is "fill whatever contains me".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] The UI-SPEC's own falsifiable claim is unsatisfiable as written — `aria-label` added**

- **Found during:** Task 2 (designing the shared shell)
- **Issue:** The prescribed shell (`role="status"` + `sr-only` child) cannot have a non-empty accessible name, because `role="status"` is `nameFrom: author`. Built as prescribed, all three skeletons would have shipped UNNAMED status regions — and the Task-3 gate's own name clause would have been written around the defect to keep it green, which is the rubber-stamp shape this phase exists to remove.
- **Fix:** Probed the two markup shapes with `dom-accessibility-api` and measured `""` vs the label; added `aria-label={label}` to all three shells, kept the `sr-only` span as the live region's content, and recorded the measurement in the component headers, in the gate's header, and as a runnable control inside the gate.
- **Files modified:** all three `patterns/*skeleton*.tsx`, `tests/design/skeleton-a11y.test.tsx`
- **Verification:** watched red (c) — `aria-label` removed from `card-grid-skeleton.tsx` → `expected null to be 'Loading test content'`, 1 failed / 9 passed. Reverted → 10 passed.
- **Committed in:** `b08343e` and `8170333`

**2. [Rule 3 - Blocking] A seventh measurement constant, because six cannot express a text bar**

- **Found during:** Task 2 (writing the first skeleton)
- **Issue:** Every prescribed shape needs a placeholder bar height; AC#16 bans literal heights; none of the six constants is a bar height. The task could not be completed as written.
- **Fix:** `TEXT_BAR_HEIGHT = "h-4"` added to `measurements.ts` with a long note recording that it is the seventh, that it is not in the UI-SPEC's list, and why a constant was chosen over a gate exemption.
- **Files modified:** `src/lib/design/measurements.ts`
- **Verification:** `npx tsc --noEmit` exit 0; the source gate's literal ban is green with zero height exemptions.
- **Committed in:** `b08343e`

**3. [Rule 1 - Bug] The plan's prescribed source-gate grep has a 100% false-positive rate on a clean tree**

- **Found during:** Task 2 (running Task 2's acceptance criteria)
- **Issue:** `grep -o 'h-[0-9]\|w-[0-9]\|aspect-\[' src/components/patterns/*skeleton*.tsx | grep -v w-3/4 | grep -v w-1/2` reports **nine** hits against the three clean files. Two are prose (the comment explaining which literal `RESULT_CARD_MEDIA` replaced; the comment recording that the old `loading.tsx` hardcoded `h-20`). The other seven are the proportional widths themselves: `grep -o` prints `w-3`, not `w-3/4`, so the `grep -v` that was meant to filter them **filters nothing at all**.
- **Fix:** The gate walks string literals and template chunks via `ts.createSourceFile`, exactly as `leak.test.ts:213-250` does, so a class named in a comment is invisible by construction. The three real files are a live positive control for that property every run, and a synthetic comment fixture pins it. The whole finding — including the nine-hit count — is recorded in the gate's header.
- **Files modified:** `tests/design/skeleton-measurements.test.ts`
- **Verification:** gate green at 8 passed over the same three files the grep flags nine times.
- **Committed in:** `8170333`

**4. [Rule 1 - Bug] "None contains `"use client"`" is also unsatisfiable by grep**

- **Found during:** Task 2 (running Task 2's acceptance criteria)
- **Issue:** `grep -c "use client" src/components/patterns/*.tsx` returns **1 for each of the three files** — every header explains *why* the file is a Server Component and therefore has to quote the directive it does not use. The same shape as finding 3, on a different criterion.
- **Fix:** Verified the real property instead: the first statement of each module is a comment followed by `import`, with no directive prologue anywhere. `npm run build` (which enforces the client/server boundary since plan 11-01) exits 0. Recorded here so a later plan does not "fix" the prose to satisfy a broken check.
- **Files modified:** none
- **Verification:** `head -1` on each file; `grep -n 'use client'` shows all three hits are inside `//` comments on line 10.
- **Committed in:** n/a (a measurement, no code change)

**5. [Rule 2 - Missing Critical] The banned-prefix list was widened past the plan's five**

- **Found during:** Task 3 (writing the classifier)
- **Issue:** The plan names `h-{n}` / `w-{n}` / `aspect-[…]` / `size-{n}` / `min-h-{n}`. That bans one spelling of a box and legalises its immediate siblings — and `min-w-44` is a real measurement *in this very inventory* (`AUTH_SLOT_BOX`), so the list as given would police the header's height and wave through the auth slot's width. `aspect-\[` likewise misses `aspect-square` and `aspect-video`, which are geometry decisions too.
- **Fix:** Added `min-w`, `max-w`, `max-h` and every `aspect-*` form, on the precedent `config/design-leak-patterns.mjs`'s `COLOUR_ROLE` fragment records (WR-07/WR-08: a hand-written role list with a hole is how `ring-offset-white` shipped unseen). Each addition is covered by a self-test.
- **Files modified:** `tests/design/skeleton-measurements.test.ts`
- **Verification:** `boxViolationIn("lg:min-w-44")` → `min-w-44`; `aspect-square` and `aspect-video` both reported; `w-full` / `h-full` / `min-h-screen` / `space-y-3` / `gap-5` all null.
- **Committed in:** `8170333`

**6. [Rule 2 - Missing Critical] A fifth watched red, on the clause the plan's probes could not reach**

- **Found during:** Task 3 (running the prescribed probes)
- **Issue:** The plan prescribes two a11y probes, both on the `role="status"` COUNT (0 and 2). Neither touches the accessible-NAME clause — which is the clause the whole 1.4.11 exclusion argument rests on, and the one whose failure looks *correct* in review because the `sr-only` sentence is sitting right there in the markup.
- **Fix:** Ran probe (c): `aria-label` removed from `card-grid-skeleton.tsx`. Recorded verbatim alongside the other two.
- **Files modified:** `tests/design/skeleton-a11y.test.tsx` (header only)
- **Verification:** `expected null to be 'Loading test content'`, 1 failed / 9 passed, reverted → 10 passed.
- **Committed in:** `8170333`

**7. [Plan-directed] `src/app/(app)/bookings/loading.tsx` edited although it is not in `files_modified`**

- **Found during:** Task 1
- **Issue:** The plan says the 80px derivation at `(app)/bookings/loading.tsx:1-3` "must be **moved** here, not duplicated" — but that file is not in the plan's `files_modified` list, and leaving it untouched would have left the derivation written out in two places, which is the exact defect `measurements.ts` exists to remove.
- **Fix:** Replaced the restated derivation with a pointer to `ROW_CARD_HEIGHT`, plus a note that the surviving `h-20` literal dies when the route migrates onto `RowListSkeleton`. Three lines; the file's markup is byte-unchanged.
- **Files modified:** `src/app/(app)/bookings/loading.tsx`
- **Verification:** `npm run build` exit 0; no gate counts moved (the change is comment-only and every count in the suite is taken over comment-stripped text).
- **Committed in:** `9ae04e2`

---

**Total deviations:** 7 (3 missing-critical, 1 blocking, 2 plan-vs-tree corrections, 1 plan-directed out-of-scope edit)
**Impact on plan:** No scope creep and no package installed. Findings 3 and 4 changed no source; findings 1, 2, 5 and 6 each close a hole the plan's own acceptance criteria would otherwise have papered over.

## Issues Encountered

- **The plan's `<verification>` block still carries `ls drizzle/ | tail -1`, which returns `meta`.** Plan 11-02 recorded this correction; used `ls drizzle/*.sql | tail -1` → `drizzle/0025_audit_resolved_by.sql`. **GATE-06 intact — no migration added.**
- **`grep -c "globalSetup\|setupFiles" vitest.design.config.ts` returns 4**, and all four are the header comment explaining why neither key is present. Verified the real property with `grep -n "globalSetup:\|setupFiles:"` (one hit, inside a comment quoting `vitest.config.ts:59`) and `git diff --stat HEAD -- vitest.design.config.ts` (empty — the file was never touched). A third instance of the same prose-vs-code trap, in the same session.
- **The design-suite baseline in the prior-wave context was one plan stale.** It said 24 files / 470 tests (the end of 11-02); plan 11-03 added `gitignore-baselines.test.ts`, so the real baseline was **25 / 474**. Measured before editing rather than assumed, which is why "+2 files exactly" is checkable: **27 files / 496 tests**.
- **Nothing else.** No package installed (`git diff --stat package.json` empty), no config touched, no vendored primitive forked.

## Verification Run

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | 0 errors, 9 warnings — byte-identical to the phase baseline |
| `npm run test:design` | **27 files / 496 tests passed** (was 25 / 474 — file count +2 exactly, as the plan requires) |
| `npx vitest run --config vitest.design.config.ts tests/design/contrast.test.ts tests/design/pair-drift.test.ts` | 106 passed (was 102 — the two new rows × two themes) |
| `npx vitest run --config vitest.design.config.ts tests/design/skeleton-*.test.ts*` | 18 passed |
| `npm run build` | exit 0, twice — after Task 1 and after Task 3 |
| `vitest.design.config.ts` | unmodified; no `globalSetup:`, no `setupFiles:` |
| `git diff --stat package.json` | empty (T-11-SC: zero packages) |
| `ls drizzle/*.sql \| tail -1` | `0025_audit_resolved_by.sql` — GATE-06 intact |
| `grep '@/lib/{booking,payments,listing,group,search,availability}' patterns/` | no hits — the `patterns/` membership rule holds |

## Known Stubs

None. All six files are complete as declared.

One state worth naming so it is not mistaken for coverage: **no route composes these three patterns yet.** They are declared, gated and unrendered — the same shape as plan 11-02's 17 declared ids, and for the same reason (the adopting plans are 11-08 onwards). What that means concretely: the ±2px geometry claim in `11-21` has nothing to compare against until the routes migrate, and `skeleton-measurements.test.ts`'s NOT COVERED footer says so. `(app)/bookings/loading.tsx` still hardcodes its own `h-20`; its comment now points at `ROW_CARD_HEIGHT` and records that the literal dies at migration.

## Threat Flags

None. This plan adds no network endpoint, no auth path, no file access and no schema change. Every registered threat is disposed as designed:

| Threat | Disposition | Where it landed |
|---|---|---|
| T-11-A11YFILL | mitigate | `skeleton-a11y.test.tsx` — one named `role="status"` per shape, `aria-busy`, every bar `aria-hidden`; watched failing at counts 0 and 2 and at a null name. The two `EXCLUDED_PAIRS` rows name this gate as the condition of their own legality |
| T-11-PAIRBLIND | mitigate | +3 exclusions, including `ui/card.tsx:15`'s hairline on every card since v1.0 — a pairing that shipped for a whole milestone measured by nothing |
| T-11-GEODRIFT | mitigate | `skeleton-measurements.test.ts` — the literal ban, watched red by inlining `ROW_CARD_HEIGHT`'s value, plus the vacuity probe that showed the ban passing silently over zero files |
| T-11-BOUNDARY | mitigate | Three Server Components, zero domain imports, verified by grep and by `npm run build`'s boundary enforcement |
| T-11-SC | mitigate | Zero packages; `git diff --stat package.json` empty |

## Next Phase Readiness

- **Every plan that ships a `loading.tsx` is unblocked.** `CardGridSkeleton` (for `/`'s `loading.tsx` AND `search-results.tsx`'s in-component `isPending` state — the UI-SPEC is explicit that both must render the SAME component), `RowListSkeleton` (`(app)/bookings`, `host/bookings`, `host/requests`) and `PanelSkeleton` (every panel-shaped route and the calendar day panel). Each takes a required `label`; the sentence belongs to the surface.
- **Plan 11-08 has the two constants it needs.** `ROW_CARD_THUMB` (`size-12`) and `ROW_CARD_HEIGHT` (`h-20`) are the row card's own geometry, not just its skeleton's — the point of the inventory is that `RowCard` reads them too. A `RowCard` that spells out `h-20` is not caught by any gate (the source gate scans `*skeleton*.tsx` only), so this is a review point, not a mechanical one.
- **Plan 11-10 has `HEADER_HEIGHT` and `AUTH_SLOT_BOX`**, which are declared but unused until the shell lands. `AUTH_SLOT_BOX` is the reason `min-w` is in the source gate's banned-prefix list.
- **Plan 11-21 owns the half neither gate can reach.** jsdom has no layout engine (D-131): the render gate proves the markup contract and the source gate proves the classes come from one inventory, and neither says the skeleton is the same SIZE as the content. The ±2px `boundingBox()` comparison, in both themes, is the only thing that closes STATE-01.
- **Plan 11-22's forward direction now has three real ids to find.** `src/` contained zero `data-testid` occurrences before this commit; it now contains three, all declared, all owned by `11-07` in `selector-contract.ts`.
- **A caution for anyone adding a skeleton shape.** The source gate scans `src/components/patterns/*skeleton*.tsx`. A surface that hand-rolls a fourth shape inline is outside it entirely, and nothing in this phase notices — that is stated in the gate's NOT COVERED footer rather than left to be discovered.

## Self-Check: PASSED

All six created files exist on disk; all three commits (`9ae04e2`, `b08343e`, `8170333`) resolve in `git log`. No commit deleted a tracked file (`git diff --diff-filter=D` empty for all three).

---
*Phase: 11-quality-gates-pattern-layer-app-shell*
*Completed: 2026-08-13*
