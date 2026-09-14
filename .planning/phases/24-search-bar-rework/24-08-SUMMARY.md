---
phase: 24-search-bar-rework
plan: 08
subsystem: progressive-search design contracts and Linux visual baselines
tags: [search, accessibility, visual-regression, playwright, linux]
status: complete
requires:
  - 24-07
provides:
  - post-retirement live-region and selector registries
  - six deterministic progressive-search visual states
  - twelve inspected Search Linux baseline references
  - repeat-run visual stability evidence
affects:
  - e2e/visual/surfaces.spec.ts-snapshots/
  - progressive search release verification
tech-stack:
  added: []
  patterns: [production-path Playwright drives, intercepted address lookup, pinned Linux baseline writer]
key-files:
  created:
    - .planning/phases/24-search-bar-rework/24-08-SUMMARY.md
  modified:
    - src/lib/design/live-regions.ts
    - src/lib/design/selector-contract.ts
    - src/lib/design/visual-baselines.ts
    - e2e/helpers/visual-drive.ts
    - tests/design/live-regions.test.tsx
    - tests/design/brand-recipe.test.ts
    - tests/design/elevation-z.test.ts
    - e2e/visual/surfaces.spec.ts
    - e2e/visual/surfaces.spec.ts-snapshots/
decisions:
  - Retain the loading-shell structural selector as a contract row rather than reintroducing accessible naming to inert fallback geometry.
  - Raise the visual runner inventory contract from 78 to 85 because twelve progressive rows replace five retired search rows.
  - Accept the approved pinned-Linux workflow's deterministic full 36-snapshot re-mint after its same-ref repeat produced no diff.
metrics:
  duration: approximately 1h 50m
  completed: 2026-09-15
actuals:
  tokens: 10160
  tasks: 3
  commits: 4
  plan_head_before: 2d4790c
---

# Phase 24 Plan 08: Progressive Search Visual Contracts Summary

Replaced retired expanded-search and relaxation contracts with six production-path progressive-search states, then established deterministic pinned-Linux visual references and repeat-run stability.

## Completed Work

- Reconciled the live-region and selector registries to remove only retired SearchBar/RelaxBand ownership while preserving SearchExperience, Search progress, result-error, uniqueness, and source-reachability guards.
- Replaced the legacy visual inventory with `search-idle-pill`, `search-activity-step`, `search-location-step`, `search-party-step`, `search-results`, and `search-empty`, each at 375 × 812 and 1280 × 800 in `court`.
- Added production-control browser drives with a deterministic intercepted Photon address response. Result and empty states submit canonical activity, coordinates, location label, and party-size answers; no live address provider, geolocation, random input, capacity promise, or legacy refinement is used.
- Updated fixed brand/elevation ownership to the actual progressive step components, retaining positive exact-file inventories rather than weakening totals.
- Retired the four specified stale snapshot files and regenerated the final Linux baseline inventory through the sanctioned workflow.

## Linux Visual Evidence

First workflow run: [34877654016](https://github.com/pengr3/FitOut/actions/runs/34877654016)

- Source ref: `356de0800ec3a591b84fbb740dbd0445bbae4255`
- Result commit: `bc465a964590ec9babda6b587d46c210d257fd7b`
- Result: success; the pinned `mcr.microsoft.com/playwright:v1.60.0-noble` writer regenerated the Linux references.

Repeat workflow run: [34878249644](https://github.com/pengr3/FitOut/actions/runs/34878249644)

- Source and resulting `origin/dev` ref: `bc465a964590ec9babda6b587d46c210d257fd7b`
- Result: success; no follow-up commit and no snapshot diff, proving the renderer/drive inputs were stable on the same ref.

The exact final Search inventory contains 12 files:

- `search-idle-pill-{375,1280}-court-visual-linux.png`
- `search-activity-step-{375,1280}-court-visual-linux.png`
- `search-location-step-{375,1280}-court-visual-linux.png`
- `search-party-step-{375,1280}-court-visual-linux.png`
- `search-results-{375,1280}-court-visual-linux.png`
- `search-empty-{375,1280}-court-visual-linux.png`

The four retired files are absent: `search-results-320`, `search-results-768`, `search-relax-band-320`, and `search-relax-band-1280` (all with the standard `-court-visual-linux.png` suffix).

All twelve Search images were inspected at high detail. They show one settled idle trigger; the intended activity, location, and group-party questions; one-result and explicit empty-result states with the same editable answer-chip structure; readable content; unclipped layout; and no loading shell, legacy relaxation, capacity, remaining-place, or date-specific availability claim.

## Verification

Passed:

- `node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts tests/design/brand-recipe.test.ts tests/design/elevation-z.test.ts tests/design/live-regions.test.tsx tests/design/selector-contract.test.ts` — 116 tests.
- `node scripts/verify-workflows.mjs --section=baselines` — 11 invariants.
- `node node_modules/vitest/vitest.mjs run` — 238 files / 2,971 tests passed; two test files and five tests skipped as configured.
- `node node_modules/@playwright/test/cli.js test e2e/progressive-search.spec.ts --project=chromium --workers=1` — 8 browser tests passed.
- Docker readiness: `fitout-db-1` healthy on port 5432.

Known unrelated release-gate failures, left unchanged because they are outside this plan's owned source:

- Complete design suite: 3 failures — two email policy/environment checks and public loading-shell dimension enforcement.
- TypeScript: generated `.next/dev/types/validator.ts` parse failure; production build then reports its dev-versus-production generated route-type conflict for `/%5Fops-auth` versus `/_ops-auth`.
- ESLint: one existing error in `src/components/search/search-experience.tsx` (`react-hooks/set-state-in-effect`), plus existing warnings.
- Full Chromium command was started as required and was conclusively non-green on the first seven `e2e/auth-keyboard.spec.ts` cases; it was stopped after 40 of 473 cases to avoid holding the shared database for the remaining unrelated suite after that result was established.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Contract contradiction] Synchronised the generic visual runner's inventory count.**

- **Found during:** Task 2
- **Issue:** `e2e/visual/surfaces.spec.ts` hard-coded 78 rows. The mandated replacement of five legacy search rows with twelve progressive rows creates 85 rows, so leaving it unchanged would make the sanctioned workflow fail before it could create any evidence.
- **Fix:** With parent/user authorization, changed only its count and accompanying inventory wording from 78 to 85. No capture behavior, workflow, fixture, or snapshot-update authority changed.
- **Commit:** `d590390`

**2. [Accepted workflow output] Full deterministic re-mint beyond the twelve Search references.**

- **Found during:** Task 3, first pinned-Linux workflow dispatch.
- **Issue:** The sole-authorized writer changed 36 existing Linux baseline files: twelve final Search references plus 24 pre-existing, non-Search references.
- **Resolution:** The user explicitly accepted the full deterministic workflow output after the exact same ref was dispatched again successfully and created no commit/diff. The workflow output was retained; no baseline was hand-edited or restored locally.
- **Workflow commit:** `bc465a9`

## Known Stubs

None.

## Self-Check: PASSED

- Task commits `3f212ff`, `d590390`, `356de08`, and Linux workflow commit `bc465a9` exist.
- The final tracked Search inventory contains exactly the twelve required names and no retired Search/RelaxBand names.
- No STATE.md or ROADMAP.md change was made by this plan.
