---
phase: 24-search-bar-rework
plan: "02"
subsystem: public-search
tags: [nextjs, react, accessibility, progressive-search]
requires: [progressive-search-coordinator]
provides: [correctable-search-journey, exact-group-party-input, race-safe-browser-location]
affects: [public-home, listing-search, design-inventories]
tech-stack:
  added: []
  patterns: [reducer-owned-journey-history, controlled-step-components, attempt-token-callback-guard]
key-files:
  created: [src/components/search/activity-step.tsx, src/components/search/location-step.tsx, src/components/search/party-step.tsx]
  modified: [src/components/search/search-experience.tsx, tests/search/progressive-search.test.tsx]
decisions:
  - Only known catalogue options and exact bounded ASCII-digit party sizes can become submitted search values.
  - Browser-location callbacks use a monotonic attempt token and are invalidated by Back, Cancel, direct Edit, address resolution, and a replacement attempt.
metrics:
  duration: 24m
  completed: 2026-09-14
plan_head_before: b2b6780
commits: 5
actuals:
  tokens: 8656
  tasks: 2
  commits: 5
status: complete
---

# Phase 24 Plan 02: Correctable Progressive Search Summary

Completed the activity → location → party journey with reducer-owned history, retained answer edits, literal browse cancellation, exact group input, and recoverable browser location.

## Completed Work

- Extracted controlled activity, location, and party leaves while keeping navigation, URL serialization, and retained answers in `SearchExperience`.
- Added explicit reducer events for engagement, answer confirmation, Back, direct Edit, Cancel, result hydration, and solo/group party choices.
- Locked catalogue commits to known options and group submits to safe base-10 whole numbers in the inclusive `2..MAX_OPEN_CAPACITY` range.
- Made browser geolocation callback ordering safe with an attempt token; stale, invalid, denied, unavailable, and failed outcomes leave address search available.
- Preserved one initially empty `Search progress` owner, post-transition heading focus, tokenized responsive motion, and the existing global reduced-motion reset.

## Verification

- Passed: `node node_modules/vitest/vitest.mjs run tests/search/progressive-search.test.tsx` — 10 tests.
- Passed: `node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts tests/design/motion-budget.test.ts tests/design/live-regions.test.tsx` — 49 tests.
- Passed: `node node_modules/typescript/bin/tsc --noEmit`.

## TDD Gate Compliance

| Task | RED | GREEN | Status |
| --- | --- | --- | --- |
| 1: correction and group flow | `1b7b07f` with `RED_EVIDENCE_OK` | `f28494e` | Pass |
| 2: location race recovery | `a2bb549` with `RED_EVIDENCE_OK` | `da11048` | Pass |

## Deviations from Plan

None — the plan was implemented without scope expansion.

## Self-Check: PASSED

- All three controlled step components, the coordinator, focused tests, and this summary exist.
- Task commits `1b7b07f`, `f28494e`, `a2bb549`, `da11048`, and `0013066` exist in the repository history.
