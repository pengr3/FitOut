---
phase: 24-search-bar-rework
plan: "09"
subsystem: public-search
tags: [nextjs, react, progressive-search, route-state, regression]
requires: [24-08]
provides: [canonical-prop-keyed-search-coordinator, completed-to-cold-regression]
affects: [public-home, progressive-search-release-evidence]
tech-stack:
  added: []
  patterns: [stable-canonical-prop-key, keyed-client-coordinator, reducer-owned-local-correction]
key-files:
  created: [.planning/phases/24-search-bar-rework/24-09-SUMMARY.md]
  modified: [src/components/search/search-experience.tsx, tests/search/progressive-search.test.tsx]
decisions:
  - A stable ordered serialization of the validated canonical tuple keys the stateful inner coordinator, so only a changed server tuple remounts local state.
  - Local reducer correction state remains mounted for identical canonical props; the heading-focus effect remains the only effect in the coordinator.
metrics:
  duration: ~18m
  completed: 2026-09-15
  plan_head_before: b5526100cb1068709ac89d55dc8cecbec6cc2b72
  commits: 1
actuals:
  tokens: 6136
  tasks: 2
  commits: 1
status: complete
---

# Phase 24 Plan 09: Canonical Search Coordinator Gap Closure Summary

Replaced one-way canonical-prop hydration with a stable prop-keyed client coordinator, so browser Back from completed results to cold `/` resets to the engagement-gated search pill without discarding an in-progress correction for unchanged canonical answers.

## Completed Work

- Kept `SearchExperience` as the serializable prop boundary and derived `canonicalSearchKey` from `hasCompletedSearch` plus the ordered category, location label, coordinates, and party-size fields.
- Moved the stateful router, reducer, refs, handlers, status region, focus effect, chips, question branches, and server children behind a keyed `SearchExperienceCoordinator`.
- Removed the canonical-prop state-writing effect; the focus-only effect is retained.
- Added semantic regression coverage proving that an unchanged completed tuple preserves an open party correction, while completed-to-cold props leave only the `Start your search` pill and remove chips, question, Back, and Cancel UI.

## TDD Evidence

- RED: `node node_modules/vitest/vitest.mjs run tests/search/progressive-search.test.tsx --reporter=dot` exited 1 with the named new regression failing to find `Start your search` after completed-to-cold rerender; the DOM retained the party correction, answer chips, Back, and Cancel controls.
- GREEN: the same focused command exited 0 with 12 passing tests after the keyed coordinator boundary was implemented.
- Focused source lint: `node node_modules/eslint/bin/eslint.js src/components/search/search-experience.tsx` exited 0, both after implementation and when rerun for the tracer feedback gate.

## Release Re-measurement

| Command | Outcome | First actionable diagnostic |
| --- | --- | --- |
| `node node_modules/vitest/vitest.mjs run tests/search/progressive-search.test.tsx --reporter=dot` | PASS — 12 tests | None. |
| `node node_modules/vitest/vitest.mjs run` | INCONCLUSIVE — invoked; the execution harness returned only Vitest startup output and no final exit summary. It is not claimed green. | No test diagnostic was emitted before the harness lost the final summary. |
| `node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts` | FAIL — observed failing tests | `tests/design/email-preview-harness-env.test.ts`: `email.ts still reads BETTER_AUTH_URL at module scope`; additional existing failures were `email-shell` nullable `SUPPORT_EMAIL` and loading-shell dimension enforcement. |
| `node node_modules/typescript/bin/tsc --noEmit` | INCONCLUSIVE — invoked; no diagnostic was emitted, but the harness did not return its final status line. It is not claimed green. | None emitted. |
| `node node_modules/eslint/bin/eslint.js .` | INCONCLUSIVE — invoked; no diagnostic was emitted, but the harness did not return its final status line. The changed coordinator separately passed target ESLint. | None emitted. |
| `node node_modules/next/dist/bin/next build` | INCONCLUSIVE — invoked; observed startup was `Next.js 16.2.7 (Turbopack)` and `Creating an optimized production build ...`, but no final exit summary returned. It is not claimed green. | None emitted. |
| `node node_modules/@playwright/test/cli.js test --project=chromium --workers=1` | FAIL before collection | Existing configuration could not start its web server: `http://localhost:3000 is already used`; Playwright also correctly skipped the Linux-only visual project on Windows. |

Docker readiness was confirmed with `docker info --format '{{.ServerVersion}}'` (29.6.1) before release lanes. The design and Chromium failures are outside this plan's two owned source/test files; no release configuration, baseline, browser suite, dependency, or workflow file was changed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reconciled canonical route state in both navigation directions**

- **Found during:** Task 1 RED
- **Issue:** The completed-search synchronization effect returned for cold props, leaving stale completed UI after browser Back; it also violated React Hooks lint by writing derived state from an effect.
- **Fix:** Replaced the effect with a keyed coordinator boundary derived from all canonical server fields and added regression coverage for same-tuple correction retention and completed-to-cold reset.
- **Files modified:** `src/components/search/search-experience.tsx`, `tests/search/progressive-search.test.tsx`
- **Commit:** `0dc9247`

## Known Stubs

None. The stub scan's only matches were existing test fixture text (`not a listing`) and an empty callback-attempt array, neither of which renders as a placeholder or bypasses a data source.

## Threat Flags

None. The modified client boundary handles the plan's existing server-validated-props trust boundary; it adds no endpoint, authentication path, file access, schema change, or new dependency.

## Self-Check: PASSED

- The summary, keyed coordinator, and focused regression test exist at their declared paths.
- Commit `0dc9247` exists in repository history.
- The summary is not ignored and can be staged normally; unrelated dirty files remain unstaged.
