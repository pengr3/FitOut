---
phase: 24-search-bar-rework
plan: 10
subsystem: public-search
tags: [address-autocomplete, photon, progressive-search, url-state]
requires: [24-09]
provides: [race-safe-address-resolution, bounded-location-labels, shared-location-chip-fallback]
affects: [public-search, location-step, result-answer-chips]
tech-stack:
  added: []
  patterns: [abort-controller, request-generation-guard, client-schema-mirror]
key-files:
  created: []
  modified:
    - src/components/listing/address-autocomplete.tsx
    - tests/listing/address-autocomplete.test.tsx
    - src/components/search/search-experience.tsx
    - tests/search/progressive-search.test.tsx
    - tests/search/search-results-states.test.tsx
decisions:
  - Abort and invalidate each superseded Photon lookup immediately; transport cancellation alone is not trusted.
  - Keep the 120-character URL label bound client-side as a mirror while coordinates remain authoritative.
  - Render label-less completed locations as Selected location without inventing geography.
metrics:
  duration: 17m
  completed: 2026-09-15
  tasks: 2
  files: 5
commits: 2
plan_head_before: c1680c2
actuals:
  tokens: 3867
  tasks: 2
  commits: 2
status: complete
---

# Phase 24 Plan 10: Search result integrity gap closure Summary

Photon address results now belong only to the still-current typed query, while long presentation labels and label-less shared URLs remain valid, editable location answers.

## Completed Tasks

1. Made the debounced Photon lifecycle abortable and generation-guarded, with a real delayed A-to-B regression.
2. Bounded client-side address labels before canonical navigation, recovered failed candidates at location, and supplied a neutral completed-answer fallback.

## Verification

- `node node_modules/vitest/vitest.mjs run tests/listing/address-autocomplete.test.tsx` — passed (10 tests).
- `node node_modules/eslint/bin/eslint.js src/components/listing/address-autocomplete.tsx tests/listing/address-autocomplete.test.tsx` — passed.
- `node node_modules/vitest/vitest.mjs run tests/search/progressive-search.test.tsx tests/search/search-results-states.test.tsx` — passed (22 tests).
- `node node_modules/eslint/bin/eslint.js src/components/search/search-experience.tsx tests/search/progressive-search.test.tsx tests/search/search-results-states.test.tsx` — passed.

## TDD Evidence

The new delayed A-to-B Photon regression failed against the original lifecycle because the stale Ayala option rendered after B was typed. It passed after the abort and generation guard. The long-label, location-recovery, and missing-label chip regressions also failed before their implementation and passed afterward.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- All five plan-owned source and test files exist in commits `554e5b7` and `48f0654`.
- Measured plan commits: 2 from `c1680c2` to `HEAD`.
