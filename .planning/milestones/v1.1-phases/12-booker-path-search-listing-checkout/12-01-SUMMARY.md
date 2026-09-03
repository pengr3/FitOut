---
phase: 12-booker-path-search-listing-checkout
plan: 01
subsystem: ui
tags: [design-system, measurements, tailwind, contrast, wcag, playwright, vitest, geometry]

# Dependency graph
requires:
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "src/lib/design/measurements.ts (nine constants + the skeleton source gate), contrast-pairs.ts (the declared pairing inventory + EXCLUDED_PAIRS), patterns/card-grid-skeleton.tsx, e2e/skeleton-geometry.spec.ts, e2e/helpers/served-document.ts, the [11-17] gutter residual and the [11-21] /dev/theme blind spot"
provides:
  - "The seven Phase-12 measurement constants (RESULT_GRID_GAP, CALENDAR_CELL, SLOT_CHIP_BOX, STICKY_BAR_HEIGHT, STICKY_BAR_CLEARANCE, HOLD_COUNTDOWN_BOX, MOSAIC_ASPECT), each with its derivation and, where one exists, its hazard"
  - "The `brand-30 on card` EXCLUDED_PAIRS row — the soft-accent notice's edge, declared before its two Phase-12 adopters render it"
  - "One gutter for the search result grid and its skeleton, imported by four surfaces, with a source gate that fails on either half"
  - "A rendered-gutter assertion on `/` itself (pending shell vs resolved document, 320/768/1280, both themes, equality AND absolute value)"
  - "GATE-06 as a per-run assertion inside the DB-free design gate"
  - "A D-37 regression pin: the search tile renders only the server's all-in rate parts, never a computed window total"
affects: [12-02, 12-03, 12-04, 12-05, 12-06, 12-07, 12-08, 12-09, 12-10, 12-11, 12-12, 12-13, 12-14, 14-host-surfaces]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A measurement declared once, before any surface consumes it — extended from the skeleton family to the whole booker path"
    - "A hazard note lives BESIDE the constant, not only in a planning document, because a later plan reads the constant"
    - "An absence assertion counted over comment-stripped source, guarded in both directions (files opened AND the matcher proven capable of matching)"
    - "A rendered-geometry claim asserts the absolute value as well as the equality — two grids that agree at the wrong number are as 'equal' as two that agree at the right one"

key-files:
  created:
    - ".planning/phases/12-booker-path-search-listing-checkout/deferred-items.md"
  modified:
    - "src/lib/design/measurements.ts"
    - "src/lib/design/contrast-pairs.ts"
    - "src/components/search/search-results.tsx"
    - "src/components/patterns/card-grid-skeleton.tsx"
    - "src/app/dev/theme/page.tsx"
    - "src/app/(host)/host/listings/page.tsx"
    - "src/app/globals.css"
    - "tests/design/contrast.test.ts"
    - "tests/design/skeleton-measurements.test.ts"
    - "tests/design/infra.test.ts"
    - "tests/design/sheet-absent.test.ts"
    - "tests/search/search-card-open.test.tsx"
    - "e2e/skeleton-geometry.spec.ts"

key-decisions:
  - "The `brand-30 on card` exclusion is measured at 1.60 (court) / 1.50 (grove), not the UI-SPEC's 1.59 — the culori gate is the authority (D-12) and the note carries the corrected figure"
  - "ZERO new CONTRAST_PAIRS rows was confirmed as a finding rather than assumed: every Phase-12 ink is already declared"
  - "/host/listings adopts RESULT_GRID_GAP NOW rather than in Phase 14 — its loading.tsx already composes CardGridSkeleton, so leaving the literal would have opened a fresh ±4px shift on a shipped host surface"
  - "/dev/theme's preview grid was a THIRD copy of the gutter and had to adopt the constant; the duplication only announced itself when the skeleton moved"
  - "GATE-06 pins the migration COUNT as an equality, not a floor — a floor notices deletion and waves through addition, and addition is the direction GATE-06 is about"
  - "--z-sheet stays at zero call sites: Phase 12 examined all three candidates (booking sheet, lightbox, sticky bars) and each resolved elsewhere for a reason"

patterns-established:
  - "Hazard-carrying constants: CALENDAR_CELL and SLOT_CHIP_BOX each state, in the file, what the constant does NOT cover and which plan owns the rest"
  - "Bidirectional gutter gate: both grids must import the constant AND neither may write the retired step, asserted over comment-stripped source"
  - "Pending-vs-resolved geometry on a product route via e2e/helpers/served-document.ts, with three vacuity guards (truncation happened, the skeleton is up, the result cards are not)"

requirements-completed: [BFLOW-01]

# Metrics
duration: 32min
completed: 2026-08-18
---

# Phase 12 Plan 01: Measurement Contract and the One Gutter — Summary

**Seven Phase-12 measurement constants declared with their derivations and two hazards, one `brand-30 on card` contrast exclusion measured at 1.60/1.50, and the `[11-17]` ±4px grid gutter closed mechanically across four surfaces with a rendered `boundingBox()` assertion on `/` itself plus GATE-06 as a per-run tripwire.**

## Performance

- **Duration:** ~32 min
- **Started:** 2026-08-18T10:26Z
- **Completed:** 2026-08-18T10:58Z
- **Tasks:** 3 (plus one Rule 1 fix commit)
- **Files modified:** 13 (+1 created)

## Accomplishments

- **`measurements.ts` +7, none invented.** Every value is verbatim from `12-UI-SPEC § New measurement constants`, each with the derivation as its comment. The nine shipped constants are byte-unchanged.
- **Two hazards are recorded where a later plan will actually meet them.** `CALENDAR_CELL` states that the variable override does NOT fix the day button (`aspect-square` + `min-w-(--cell-size)` go through the `components={{ DayButton }}` seam and must be MEASURED — RESEARCH Pitfall 2, plan 12-09). `SLOT_CHIP_BOX` states that it is the shimmer's box today because the real chip has `min-h-11` and no `min-w-20` (Pitfall 9), and that whichever plan makes it the single source of both must add `min-w-20` to the real chip in the same commit.
- **The soft-accent notice's edge is inside the gate.** `border-brand/30` had been shipping at `slot-picker.tsx:268` and `spots-left-chip.tsx:64` measured by nothing, and nothing WOULD have found it: `pair-drift.test.ts` classifies `border-*` as the `edge` role and mints no pairing from it. Declared with its compensating requirement before Phase 12's two new adopters render it (T-12-01-PAIRBLIND).
- **The `[11-17]` gutter is closed mechanically.** Four surfaces now read one string; the 20px step and the `lg:` step are both retired; `gap-5` survives nowhere under `src/` or `e2e/`.
- **The gutter is measured where it renders.** `/dev/theme` structurally cannot see it (it has no `ResultsGrid`), so the new case drives `/` through `served-document.ts`, reads the pending shell's skeleton grid and the resolved document's `ResultsGrid`, and asserts BOTH that they agree and that they agree at 16px below `sm:` / 24px above it — at 320, 768 and 1280, in both themes.
- **GATE-06 is an assertion, not a promise.** `tests/design/infra.test.ts` pins `drizzle/` at `0025_audit_resolved_by.sql` and at 26 `*.sql` files, inside the DB-free config that runs during `next build`.
- **D-37 is executable.** The search tile's rendered money is asserted to be exactly the server's `allInRateParts`, in both occupancy modes, with a full searched window supplied — written before the Phase-12 plans that build window totals.

## Task Commits

1. **Task 1: The seven measurement constants and the one contrast exclusion** — `4c5d1a6` (feat)
2. **Task 2: One gutter for the search grid and its skeleton (D-57), and the card's regression pin (D-37)** — `77a82b5` (feat)
3. **Rule 1 fix: adopt RESULT_GRID_GAP at the two remaining card grids** — `3ac3790` (fix)
4. **Task 3: The rendered gutter on `/`, the GATE-06 tripwire, and the `--z-sheet` zero restated** — `6d086d3` (test)

## Files Created/Modified

- `src/lib/design/measurements.ts` — +7 constants with derivations; two carry hazard notes
- `src/lib/design/contrast-pairs.ts` — +1 `EXCLUDED_PAIRS` row (`brand-30` on `card`), +0 `CONTRAST_PAIRS`
- `src/components/search/search-results.tsx` — `ResultsGrid` reads `RESULT_GRID_GAP`; the `[11-17]` residual comment rewritten as closed
- `src/components/patterns/card-grid-skeleton.tsx` — inner grid reads `RESULT_GRID_GAP`
- `src/app/dev/theme/page.tsx` — the preview's resolved grid adopts the constant (Rule 1)
- `src/app/(host)/host/listings/page.tsx` — the real host grid adopts the constant (Rule 1)
- `src/app/globals.css` — the `--z-sheet` note records that Phase 12 examined and declined the step
- `tests/design/contrast.test.ts` — exclusion floor 6 → 7
- `tests/design/skeleton-measurements.test.ts` — new D-57 clause + two watched reds recorded verbatim + a new NOT-COVERED bullet
- `tests/design/infra.test.ts` — the GATE-06 tree scan, guard-the-guard first, watched red recorded
- `tests/design/sheet-absent.test.ts` — `Z_SHEET_INVENTORY`'s docblock and failure message carry the Phase-12 finding
- `tests/search/search-card-open.test.tsx` — case (10), the D-37 rate-only pin, + mutation M4 recorded
- `e2e/skeleton-geometry.spec.ts` — the `/`-based gutter case, its watched red, and an updated NOT-COVERED footer
- `.planning/phases/12-booker-path-search-listing-checkout/deferred-items.md` — created

## Pinned counts changed (old → new)

| File | Pin | Old | New |
|---|---|---|---|
| `tests/design/contrast.test.ts` | `EXCLUDED_PAIRS.length` floor | 6 | **7** |
| `tests/design/contrast.test.ts` | `CONTRAST_PAIRS.length` floor | 39 | **39 (unchanged)** |
| `tests/design/pair-drift.test.ts` | `DECLARED.size` floor | 37 | **37 (unchanged)** |
| `tests/design/pair-drift.test.ts` | alpha-carrying row floor | 13 | **13 (unchanged)** |
| `tests/design/pair-drift.test.ts` | `COLOUR_TOKENS` / `observed.size` floors | 20 / 10 | **unchanged** |

**`pair-drift.test.ts` needed no edit, and that is a finding rather than an omission.** Every pin in that file is over `CONTRAST_PAIRS`, which grew by zero; it does not import `EXCLUDED_PAIRS` at all. Checked before editing, not after.

## Measured values

| Pairing | UI-SPEC session | Gate (this run) | Recorded |
|---|---|---|---|
| `brand-30` on `card` — court | ≈1.59 | **1.60** | 1.60 (the gate wins, D-12) |
| `brand-30` on `card` — grove | ≈1.50 | **1.50** | 1.50 |
| `foreground` on `brand@10% over background` | 17.04 / 16.24 | 17.04 / 16.24 | already declared ✓ |
| `brand` on `brand@10% over background` | 4.10 / 4.06 | 4.10 / 4.06 | already declared ✓ |

The court figure was re-solved with the inventory's own gamma-space composite against the compiled tokens and corrected in the row's `reason`, the same direction the two `bg-muted/40` hover rows were corrected in plan 11-07.

## Watched reds (all run, all reverted, tree clean after each)

| Probe | Mutation | Result |
|---|---|---|
| (c) `skeleton-measurements`, import half | `RESULT_GRID_GAP` inlined as `"grid gap-4 sm:gap-6 …"` in `card-grid-skeleton.tsx`, import dropped | 1 failed / 8 passed. **Both shipped clauses stayed green** — the import check because the file still imports two other constants, the literal ban because `gap-*` is not a box prefix. That blast radius is why the clause exists. |
| (d) `skeleton-measurements`, retired-step half | the 20px step written BESIDE the constant, import intact | 1 failed / 8 passed, and it is the OTHER expectation that fires |
| M4 `search-card-open` case (10) | a `₱<rate × 2> total` span added to `search-result-card.tsx`'s price node | 2 failed / 8 passed — (10) on the money-array equality (`['₱322.88','₱645.76']` vs `['₱322.88']`) and (9) on byte-identity. (9) says "the text changed"; (10) names the rule and prints the figure, in both modes. |
| (c) `skeleton-geometry` D-57 | `RESULT_GRID_GAP` → `"gap-4"` | 2 failed / 0 passed under `--grep D-57`. The 320px step passed first (16px is right below `sm:` either way); 768 and 1280 failed on the ABSOLUTE value at Δ8px while the equality clause stayed green — exactly the failure an equality-only assertion cannot see. |
| GATE-06 | zero-byte `drizzle/0026_probe.sql` | 2 failed / 28 passed — both real clauses fired, guard-the-guard stayed green |

## Decisions Made

- **The gate is the authority over the document (D-12).** The court `brand-30` figure was corrected 1.59 → 1.60 rather than copied.
- **The migration COUNT is an equality, not a floor.** A floor notices a deletion and waves through an addition; addition is the direction GATE-06 is about. It also catches a migration numbered *below* 0025 (a rebase artefact), which the lexically-last check cannot.
- **The D-57 clause lives in `skeleton-measurements.test.ts` but as its own assertion**, because only one of the two files is a `patterns/*skeleton*` and `gap-*` is spacing between boxes rather than a box — `BOX_PREFIXES` would never have caught it, and widening it to try would ban legitimate spacing everywhere.
- **The gutter is read on a different AXIS at 320px.** `gap` is both row-gap and column-gap and the grid is one column below `sm:`, so the horizontal reading at 320 would measure the distance to the cell *below*, which is not a gutter.
- **`--z-sheet` stays declared at zero.** All three Phase-12 candidates resolved elsewhere with a reason; the step is kept because a real gap between sticky and dialog still exists, and the finding is mirrored into the gate's failure message so a future reader meets it there rather than in a CSS comment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `/dev/theme`'s preview grid was a third copy of the gutter and turned two shipped assertions red**

- **Found during:** Task 3 (first `npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium` run)
- **Issue:** `src/app/dev/theme/page.tsx:699` duplicated `card-grid-skeleton.tsx`'s grid classes verbatim, gutter included, *on purpose* ("the two containers must lay out at the SAME column width or the ±2px media comparison is measuring the wrapper"). Moving the skeleton onto `RESULT_GRID_GAP` therefore made the preview's two containers disagree, and the shipped card-grid media comparison failed in **both themes**:
  `card grid media · court: skeleton {"width":176.65625,…} resolved {"width":179.328125,…} — Δwidth 2.67` (2 failed / 6 passed).
- **Fix:** the preview grid imports `RESULT_GRID_GAP`; the column classes stay literal because column count is a window question, not a measurement. The comment now records *why* the duplication had to end here too.
- **Files modified:** `src/app/dev/theme/page.tsx`
- **Verification:** `npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium` → 8 passed
- **Committed in:** `3ac3790`

**2. [Rule 1 - Bug] `/host/listings` would have shipped a fresh ±4px layout shift**

- **Found during:** Task 3 (`grep -rn "gap-5" src/ e2e/` sweep after fix 1)
- **Issue:** `src/app/(host)/host/listings/loading.tsx` composes `CardGridSkeleton`, so that route's placeholder moved to 16/24px while its real grid (`page.tsx:117`) kept the 20px literal — a NEW ±4px shift on a shipped host surface, i.e. the exact defect this plan exists to close, relocated.
- **Fix:** the host grid imports the same constant. It does **not** get a second one, which is what `12-UI-SPEC` requires of it.
- **Files modified:** `src/app/(host)/host/listings/page.tsx`
- **Verification:** `npm run build` exits 0; `grep -rn "gap-5" src/ e2e/` returns nothing
- **Committed in:** `3ac3790`
- **Note on scope:** the plan says *"Phase 14 adopts the constant when it adopts the skeleton"* and `/host/listings` **already adopted the skeleton in plan 11-17**, so the condition was met today. Deferring would have meant knowingly shipping the drift, not deferring the work.

---

**Total deviations:** 2 auto-fixed (both Rule 1). **Impact on plan:** none on scope — both are one-line adoptions of the constant this plan declares, and both REMOVE a drift rather than adding a surface. No new dependency, no new constant, no migration.

## Knowingly-changed surfaces

- **`/host/listings`** — its card grid's gutter moves from 20px to 16/24px, on both the skeleton (by composition) and the real grid (fix 2 above). Intended and stated in `12-UI-SPEC`: it adopts the constant rather than getting a second one.
- **`/dev/theme` section 14** — the preview's skeleton and resolved grid both move to 16/24px. This is what makes the shipped ±2px media comparison meaningful again.
- **`/` (search home)** — the `lg:` gutter step disappears; the grid is 16px below `sm:` and 24px at and above it, in both its pending and resolved states.

## Issues Encountered

- **The local test Postgres exhausted its connection pool mid-run** (`FATAL: sorry, too many clients already`), which failed `tests/global-setup.ts`'s preflight and blocked the `search-card-open` mutation probe. Resolved by `docker restart fitout-db-1` (9 connections after restart). Environmental, not caused by this plan; the design suite was unaffected throughout because `vitest.design.config.ts` has no `globalSetup` by design.
- **`ls drizzle/ | tail -1` returns `meta`, not the last migration** — the wrong check command the Phase-11 deferred list already recorded. The GATE-06 tripwire filters on `.sql` explicitly, so the assertion does not inherit the bug.

## Threat register disposition

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-12-01-PAIRBLIND | mitigated | The `brand-30 on card` row, with its compensating requirement and a note recording that `pair-drift` is structurally blind to `border-*` |
| T-12-01-GEODRIFT | mitigated | One imported constant across four surfaces + the `/`-based `boundingBox()` comparison asserting equality AND absolute value |
| T-12-01-MIGRATION | mitigated | `tests/design/infra.test.ts` GATE-06 scan, watched red with a probe migration |
| T-12-01-VACUOUS | mitigated | Guard-the-guard on every new absence assertion: files read and non-empty, directory listing non-empty, the `stripComments` matcher proven capable of matching, truncation proven to have happened, skeleton present and result cards absent in the pending state |
| T-12-01-SC | mitigated | `git diff --stat package.json` empty; nothing installed |

## Known Stubs

None. No placeholder values, no unwired data sources — this plan declares constants and assertions and wires the two grids that consume one of them.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change; `drizzle/` is byte-identical at `0025_audit_resolved_by.sql`.

## Verification

| Check | Result |
|---|---|
| `npm run build` | **exit 0** — 39 design test files, 701 passed / 3 skipped, then `next build` |
| `npx tsc --noEmit` | **exit 0** |
| `npx vitest run --config vitest.design.config.ts tests/design/contrast.test.ts tests/design/pair-drift.test.ts` | 106 passed |
| `npx vitest run --config vitest.design.config.ts tests/design/skeleton-measurements.test.ts` | 9 passed |
| `npx vitest run --config vitest.design.config.ts tests/design/infra.test.ts tests/design/sheet-absent.test.ts` | 48 passed |
| `npx vitest run tests/search/search-card-open.test.tsx` | 10 passed |
| `npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium` | **8 passed** (6 shipped + 2 new) |
| `git diff --stat package.json` | empty |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` |
| `grep -rn "gap-5" src/ e2e/` | no matches |

## Deferred

See `.planning/phases/12-booker-path-search-listing-checkout/deferred-items.md`:

- The three `dev-theme-*` visual baselines are now stale and must be regenerated in the pinned Linux dispatch job. **Not minted locally** — `updateSnapshots: "none"` is unconditional and the `visual` project is not created off Linux (D-28/D-29). Expect a diff confined to section 14's column widths.
- `e2e/skeleton-geometry.spec.ts`'s header measurement table now reads 2.67px high for the card-grid media box (179.33 → 176.66 at 1280px). Prose, not an assertion; refresh next time that file is opened.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Every later Phase-12 plan can now import the box class, hit-area size or bar height it needs instead of inventing one:

- **12-09 (calendar)** — `CALENDAR_CELL` is declared **and** its limit is stated: the day button goes through the `components={{ DayButton }}` seam and must be measured, not assumed.
- **12-0x (slot grid)** — `SLOT_CHIP_BOX` is declared with the condition attached: adding `min-w-20` to the real chip is part of the commit that makes it the single source of both.
- **12-1x (sticky bars, checkout)** — `STICKY_BAR_HEIGHT`, `STICKY_BAR_CLEARANCE`, `HOLD_COUNTDOWN_BOX` are declared; `shadow-sticky` still awaits its first call sites.
- **12-0x (gallery/lightbox)** — `MOSAIC_ASPECT` is declared; the lightbox has no `--z-sheet` claim to make, and the gate now says why.
- **Contrast** — the notice recipe (`bg-brand/10` + `border-brand/30` + `text-brand` glyph + `text-foreground` ink) is fully inside the inventory. A Phase-12 surface adopting it needs zero new rows; one that carries meaning in the EDGE is outside the exclusion and must not ship.

**No blockers.**

## Self-Check: PASSED

All claimed artifacts exist on disk and all claimed commits exist in the log.

- Files: `12-01-SUMMARY.md`, `deferred-items.md`, `measurements.ts`, `contrast.pairs.ts`, `infra.test.ts`, `skeleton-geometry.spec.ts` — **6/6 FOUND**
- Commits: `4c5d1a6`, `77a82b5`, `3ac3790`, `6d086d3`, `56186e4` — **5/5 FOUND**
- Artifact `contains` checks: `RESULT_GRID_GAP` in `measurements.ts` ✓ · `brand-30` in `contrast-pairs.ts` ✓ · `0025` in `infra.test.ts` ✓

---
*Phase: 12-booker-path-search-listing-checkout*
*Completed: 2026-08-18*
