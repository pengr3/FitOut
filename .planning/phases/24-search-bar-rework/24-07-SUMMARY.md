---
phase: 24-search-bar-rework
plan: 07
subsystem: search-ui
tags: [search, progressive-journey, legacy-retirement, vitest, eslint]
requires:
  - phase: 24-04
    provides: Runtime disconnection of the legacy expanded-search and relaxation paths.
  - phase: 24-06
    provides: Migrated booking, one-tree, price-parity, and accessibility browser coverage.
provides:
  - Five retired expanded-search and automatic-relaxation owners with no supported consumer.
  - A capacity-honest dev-theme result card and answer-editing empty state.
  - A bounded residual design and visual ownership ledger for Plan 24-08.
affects: [24-08 design-registry-and-visual-reconciliation]
actuals:
  tokens: 25270
  tasks: 2
  commits: 2
plan_head_before: 6bcde858cd3b22c0c9a736ba56064586a2d95b26
tech-stack:
  added: []
  patterns: [Census before legacy deletion, capacity-honest search presentation]
key-files:
  created: []
  modified:
    - src/app/dev/theme/page.tsx
    - src/app/dev/theme/fixtures.ts
  deleted:
    - e2e/zero-result-relax.spec.ts
    - src/components/search/search-bar.tsx
    - src/components/search/relax-band.tsx
    - src/lib/search/relaxation.ts
    - tests/search/relaxation-ladder.test.ts
key-decisions:
  - "Retire all five disconnected owners together; do not retain a compatibility shim or duplicate contract."
  - "Keep design registries, visual-driver definitions, and PNG baselines intact for the explicitly scoped Plan 24-08 reconciliation."
requirements-completed: [D-01, D-08]
coverage:
  - id: D1
    description: Five retired expanded-search and relaxation owners are absent while their superseding result-state and booking-schema coverage remains green.
    requirement: D-01
    verification:
      - kind: unit
        ref: "node node_modules/vitest/vitest.mjs run tests/search/search-results-states.test.tsx tests/validation/booking-schemas.test.ts"
        status: pass
      - kind: other
        ref: "retired-path existence assertion"
        status: pass
    human_judgment: false
  - id: D2
    description: Dev-theme examples no longer promise a searched date window or legacy time/radius/filter recovery.
    requirement: D-08
    verification:
      - kind: other
        ref: "node source-contract assertion for src/app/dev/theme/page.tsx"
        status: pass
      - kind: other
        ref: "node node_modules/eslint/bin/eslint.js src/app/dev/theme/page.tsx"
        status: pass
    human_judgment: false
duration: 24min
completed: 2026-09-15
status: complete
---

# Phase 24 Plan 07: Legacy Search Retirement Summary

**The disconnected expanded `SearchBar` and automatic relaxation ladder are gone, while the dev gallery now teaches a capacity-honest submitted result and calm answer editing.**

## Performance

- **Duration:** 24 min
- **Completed:** 2026-09-15
- **Tasks:** 2/2
- **Files changed:** 7 (five deletions, two local dev-theme cleanup files)
- **Actual diff:** 101,079 characters / 25,270 estimate-scale tokens

## Accomplishments

- Removed the obsolete browser suite, expanded form, relaxation band, ladder utility, and ladder-only unit suite as one atomic retirement.
- Preserved the replacement result-state and booking-schema contracts; the focused Vitest run passed all 38 tests using the running `fitout-db-1` container.
- Removed the searched-window fixture, stale widening/clear-filter recovery language, and theme-only action from the internal gallery.

## Fresh Usage Census and Retirement Ledger

The pre-delete tracked-file census found no supported `src/`, `e2e/`, or `tests/` runtime consumer importing an export from a retirement target. The only executable target references were the five dedicated legacy owners below.

| Classification | Exact paths / names | Outcome |
| --- | --- | --- |
| Dedicated legacy owners deleted here | `e2e/zero-result-relax.spec.ts`; `src/components/search/search-bar.tsx` (`SearchBar`); `src/components/search/relax-band.tsx` (`RelaxBand`, `search-relax-band`); `src/lib/search/relaxation.ts` (`RelaxationRungId`, ladder); `tests/search/relaxation-ladder.test.ts` | Deleted in `6abeaca`; no shim, copied helper, hidden route, or skipped assertion retained. |
| Runtime already disconnected by 24-04 | Public result composition, loading shell, and result states recorded in `24-04-SUMMARY.md`; `tests/search/search-results-states.test.tsx` now asserts `search-relax-band` is absent. | Retained canonical `SearchExperience` and result-state coverage. |
| Dependent browser flows migrated by 24-06 | `e2e/search-and-book.spec.ts`, `e2e/one-tree.spec.ts`, `e2e/price-parity.spec.ts`, and `e2e/axe-sweep.spec.ts`. | Retained progressive journey coverage; 24-06 recorded all focused Chromium checks green. |
| Stale presentation owned by Task 2 | `src/app/dev/theme/page.tsx`; `src/app/dev/theme/fixtures.ts` (`RESULT_CARD_WINDOW`). | Result card no longer receives `searchedWindow`; empty state uses final answer-editing copy with no legacy recovery action. |
| Historic comments and planning evidence | `.planning/phases/24-search-bar-rework/24-01-PLAN.md` through `24-07-PLAN.md`, their completed summaries, `24-CONTEXT.md`, `24-RESEARCH.md`, `24-VALIDATION.md`, and older planning sketches/spikes. | Retained as historical evidence; not runtime consumers and not rewritten in this retirement. |

## Residual Design and Visual Owner Ledger for Plan 24-08

These tracked residuals intentionally remain. Plan 24-08 owns their reconciliation and the PNG removals; this plan neither deletes nor masks them.

| Owner | Residual name / selector | Planned 24-08 action |
| --- | --- | --- |
| `src/lib/design/live-regions.ts` | `src/components/search/relax-band.tsx`, `search-relax-band`, legacy live-region count and explanatory browser-contract text | Remove the retired live-region registry membership and update its fixed inventory. |
| `src/lib/design/selector-contract.ts` | `search-relax-band` selector contract and `zero-result-relax.spec.ts` narrative | Remove the selector entry and related stale contract text. |
| `src/lib/design/visual-baselines.ts` | `search-relax-band` surface, hook `[data-testid="search-relax-band"]`, 320/1280 visual rows, legacy `SearchBar` narrative | Remove obsolete surface definitions and replace the final supported visual matrix. |
| `tests/design/live-regions.test.tsx` | Relax-band count/narrative expectations | Reconcile the fixed registry test with the removed entry. |
| `tests/design/brand-recipe.test.ts` and `tests/design/elevation-z.test.ts` | `src/components/search/search-bar.tsx` fixed file-count memberships | Remove the deleted source from fixed design inventories. |
| `src/lib/design/accent-uses.ts` | Historical `search-bar.tsx` accent-use comment | Reconcile only if Plan 24-08’s source-of-truth scan requires it. |
| `e2e/visual/surfaces.spec.ts-snapshots/search-relax-band-320-court-visual-linux.png` and `e2e/visual/surfaces.spec.ts-snapshots/search-relax-band-1280-court-visual-linux.png` | Obsolete relaxation-band visual baselines | Delete with their visual-driver rows in Plan 24-08. |

## Verification

- Passed: retired-path assertion confirms all five deleted paths are absent.
- Passed: `node node_modules/vitest/vitest.mjs run tests/search/search-results-states.test.tsx tests/validation/booking-schemas.test.ts` — 2 files, 38 tests; the isolated test database reported no leaked writes.
- Passed: `node node_modules/eslint/bin/eslint.js src/app/dev/theme/page.tsx`.
- Passed: source-contract assertion confirms final empty copy, no `searchedWindow` fixture on the gallery result, and no legacy widening/radius/clear-filter recovery copy.
- Passed: elevated `docker ps` confirms `fitout-db-1` is up.
- Blocked outside this plan: `node node_modules/typescript/bin/tsc --noEmit` exits at pre-existing generated `.next/dev/types/validator.ts:542` with `TS1128: Declaration or statement expected`. It does not report a deleted import or any Plan 24-07 source file, and the same generated-route blocker was recorded by Plan 24-04.

## Task Commits

1. **Task 1: Census and retire the five expanded-search and relaxation owners** — `6abeaca` (`refactor`)
2. **Task 2: Clean the dev theme result and empty-state examples** — `ad09939` (`refactor`)

## Decisions Made

- Deleted the five legacy owners in one commit after the fresh census found no supported executable consumer.
- Left all fixed design registry, visual-driver, and snapshot residue untouched for Plan 24-08’s bounded reconciliation.
- Removed `RESULT_CARD_WINDOW` from the fixture module because Task 2’s required no-window gallery rendering made it a stale, unreferenced fixture.

## Deviations from Plan

None - execution followed the planned retirement and gallery cleanup. The plan explicitly required deleting fixtures made unused by the gallery edit; that necessary local cleanup added `src/app/dev/theme/fixtures.ts` alongside the listed theme page.

## Known Stubs

None. The placeholder references in the dev-theme source are intentional visual fixture text and do not represent an unwired runtime state.

## Next Phase Readiness

Plan 24-08 has the exact residual selector, registry, visual-driver, and PNG ownership ledger needed to reconcile fixed design contracts without touching already-retired runtime behavior.

## Self-Check: PASSED

- Confirmed all five retirement paths are absent from the working tree.
- Confirmed task commits `6abeaca` and `ad09939` exist.
