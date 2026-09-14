---
phase: 24-search-bar-rework
plan: "01"
subsystem: public-search
tags: [nextjs, react, zod, drizzle, playwright, accessibility]
requires: []
provides: [progressive-search-coordinator, canonical-party-url, capacity-filtered-search]
affects: [public-home, listing-search, design-inventories]
tech-stack:
  added: []
  patterns: [narrow-client-boundary, server-revalidated-url, parameterized-capacity-filter]
key-files:
  created: [src/components/search/search-experience.tsx, e2e/progressive-search.spec.ts, tests/search/progressive-search.test.tsx]
  modified: [src/app/(public)/page.tsx, src/lib/validation/booking.ts, src/lib/search/query.ts, src/components/listing/address-autocomplete.tsx, src/lib/design/live-regions.ts]
decisions:
  - Progressive client state owns only retained answers and navigation; the Server Component remains the query boundary.
  - locationLabel is bounded presentation data, while coordinates and partySize remain validated query authority.
metrics:
  duration: incomplete
  completed: 2026-09-14
plan_head_before: 3ddf72d647a7463d25b042062f181e466f393057
commits: 4
actuals:
  tokens: 10685
  tasks: 2
  commits: 4
status: halted
---

# Phase 24 Plan 01: Progressive Search Tracer Summary

Implemented the compact public-search journey with canonical solo URLs, server-side party validation, pre-pagination capacity filtering, editable answer chips, and explicit browser geolocation recovery.

## Completed Work

- Added the narrow `SearchExperience` client coordinator around server-composed results.
- Added bounded `partySize` and display-only `locationLabel` validation, then bound `partySize` into the stage-one Drizzle capacity predicate.
- Replaced the home page’s expanded entry form with the compact progressive entry pill and serializable Server Component handoff.
- Added explicit browser geolocation, focus movement, a single named `Search progress` status region, and the brand/live-region inventory entries.
- Added focused coordinator coverage and a deterministic browser-geolocation proof.

## Verification

- Passed: `node node_modules/vitest/vitest.mjs run tests/search/progressive-search.test.tsx` — 4 tests.
- Passed: `node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts tests/design/brand-recipe.test.ts tests/design/live-regions.test.tsx` — 55 tests.
- Passed: `node node_modules/@playwright/test/cli.js test e2e/progressive-search.spec.ts --project=chromium --grep "Use my location reaches the same solo results contract"`.
- Blocked: the named address Playwright tracer still times out after exact catalogue selection while waiting for the location-step address button. The equivalent exact selection followed by explicit browser geolocation passes; this needs follow-up before the plan can be marked complete.
- `tsc --noEmit` remains blocked by pre-existing route-validator and unrelated test diagnostics outside this plan’s files.

## Deviations from Plan

### Auto-fixed Issues

1. [Rule 1 - Test infrastructure] Added local jsdom `ResizeObserver` and `scrollIntoView` stubs and replaced unsupported DOM matchers in the new coordinator test.
- **Found during:** Task 2 verification
- **Fix:** Reused the repository’s local-stub pattern so cmdk can render in jsdom without weakening production code.

## Deferred Issues

- The address branch of `e2e/progressive-search.spec.ts` is still red at the location-step handoff. It is recorded here instead of being treated as a passing tracer.

## Self-Check: PASSED

- Commits `598d678`, `ac7c04b`, `8ec364e`, and `05179a6` exist.
- All task-owned source and test files are committed.
