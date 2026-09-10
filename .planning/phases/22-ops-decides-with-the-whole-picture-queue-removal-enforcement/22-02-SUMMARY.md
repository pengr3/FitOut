---
phase: 22-ops-decides-with-the-whole-picture-queue-removal-enforcement
plan: 02
subsystem: ops-review-queue-ui
tags: [nextjs, react, tailwind, playwright, vitest, responsive-design]
requires:
  - phase: 22-01
    provides: a local authenticated tracer and server-composed listing evidence
provides:
  - exact native disclosure semantics and partial-data fallbacks
  - source-level guardrails for staff authority, terminality, and queue-zero copy
  - Court/Grove responsive acceptance matrix at 320px and 1280px
affects: [ops-review-queue, ops-enforcement, responsive-ui]
actuals:
  tokens: 4430
  tasks: 2
  commits: 2
plan_head_before: b54ccb49357d9bead4c1ff0786c48ee05e65cec8
tech-stack:
  added: []
  patterns:
    - Browser acceptance checks use scoped row geometry and scroll extents with theme-and-width diagnostics.
key-files:
  modified:
    - src/components/ops/ops-queue-row.tsx
    - tests/ops/ops-queue-row.test.tsx
    - tests/design/ops-host-invariants.test.ts
    - e2e/ops-queue.spec.ts
requirements-completed: [OPS-13, OPS-14, OPS-15]
key-decisions:
  - "Keep the decision controls non-sticky and before the disclosure so expansion adds evidence below them."
patterns-established:
  - "Listing evidence remains one conditional terminal section, using existing Button, Badge, PhotoGallery, and contact primitives."
coverage:
  - id: D1
    description: Listing evidence is a single conditional region with native disclosure state, semantic order, partial-data fallbacks, and one decision widget outside the region.
    requirement: OPS-13
    verification:
      - kind: test
        ref: tests/ops/ops-queue-row.test.tsx
        status: pass
    human_judgment: false
  - id: D2
    description: Staff authority, protected action composition, terminal row behavior, and the positive queue-zero copy remain unchanged.
    requirement: OPS-14
    verification:
      - kind: test
        ref: tests/design/ops-host-invariants.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Court and Grove at 320px and 1280px retain visible 44px decision controls, evidence below controls, no horizontal overflow, one decision widget, and the terminal queue URL.
    requirement: OPS-15
    verification:
      - kind: e2e
        ref: e2e/ops-queue.spec.ts
        status: pass
    human_judgment: false
completed: 2026-09-10
status: complete
---

# Phase 22 Plan 02: Responsive Terminal Evidence Summary

The staff queue now has a fully specified, responsive in-place inspection flow. Its existing decision controls remain singular and visible before the conditional evidence region, with the same terminal row behavior at desktop and the 320px floor.

## Accomplishments

- Established the 16px decision/disclosure/evidence rhythm inside one responsive component tree using the project’s existing semantic utilities and primitives.
- Locked native button type, focus retention, `aria-expanded`, `aria-controls`, evidence order, photo-zero state, description and amenity fallbacks, raw unknown-amenity labels, and host-row exclusion.
- Added source guards for the staff page boundary, untouched protected-action census, no row `href`, and unchanged queue-zero copy.
- Expanded the local authenticated tracer into a Court/Grove × 320px/1280px matrix with long description, all available amenities, six photos, rectangle diagnostics, touch-target checks, no-overflow checks, and terminality checks.

## Task Commits

1. `b388424` — `test(22-02): lock queue disclosure boundaries`
2. `726133e` — `test(22-02): cover responsive ops evidence`

## Verification

- `npm.cmd test -- tests/ops/queue-query.test.ts tests/ops/ops-queue-row.test.tsx` — 34 passed.
- `npm.cmd run test:design -- tests/design/ops-host-invariants.test.ts` — 8 passed.
- node node_modules/@playwright/test/cli.js test e2e/ops-queue.spec.ts --config=playwright.ops-queue-manual.config.ts --project=chromium --reporter=list --workers=1 — 1 passed in 8.1s; the single test runs all four theme/viewport matrix points.
- node node_modules/eslint/bin/eslint.js on the modified component, design test, and browser test — passed.
- `git diff --check` — passed.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 3 - Blocking] Used a temporary manually managed local server for a clean Windows browser-test exit.**

   Playwright’s configured managed server spawned a stale descendant and did not report a clean final result in this Windows shell. The completed matrix was rerun against a confirmed local server with an uncommitted minimal config that disables only `webServer`; both the config and its log were deleted immediately after the passing run. No product or committed Playwright configuration changed.

## Known Stubs

None.

## Self-Check: PASSED

- All four planned files exist and both task commits exist after the recorded plan head.
- The passing browser matrix covers both themes and both required widths from the real staff route.
- No dependency, schema, migration, route, data fetch, sticky control, extra decision widget, or detail destination was introduced.
