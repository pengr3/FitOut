---
phase: 15-auth-profile-transactional-email
plan: 07
subsystem: ui
tags: [nextjs, app-router, design-system, accessibility, forms, auth]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-06's `(auth)` layout (one `<main>`, one wordmark) and the `PanelCard.titleAs` widening to `h1`"
provides:
  - "IN PROGRESS — Task 1 landed: login and forgot-password compose PanelCard at titleAs=h1"
affects: [15-08-profile, 15-09-live-regions, 15-11-visual-baselines]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - "src/app/(auth)/login/page.tsx"
    - "src/app/(auth)/forgot-password/page.tsx"
    - "tests/design/card-pattern-coverage.test.ts"
    - "tests/design/brand-recipe.test.ts"

key-decisions: []

requirements-completed: []
requirements-advanced: [AUTHUI-01, AUTHUI-03]

# Metrics
duration: in-progress
completed: 2026-08-24
---

# Phase 15 Plan 07: The Four Auth Cards Adopt the Pattern Summary

**IN PROGRESS — this file is written early on purpose and will be rewritten in place when Task 2
lands.** Task 1 is committed and verified.

## Task Commits

1. **Task 1: Login and forgot-password adopt the pattern** — `e237267` (feat)

## Verification Results (Task 1)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npm run test:design` | exit 0 — 52 files / 877 passed / 3 skipped |
| `npx playwright test e2e/password-reset.spec.ts` | 1 passed, spec unedited |

## The red, observed before either number moved

```
FAIL  tests/design/brand-recipe.test.ts > DS-08 / D-21 — coral appears on exactly the 22 buttons
someone asked for it > adopts the brand variant at exactly 24 call sites across src/app and
src/components
AssertionError: expected 26 to be 24 // Object.is equality
```

```
AssertionError: the declared card-surface inventory is not the size the UI-SPEC's three `Replaces`
lists describe. A coverage gate whose inventory silently emptied passes every one of its own
assertions.: expected 18 to be 16 // Object.is equality
```

```
AssertionError: expected [ { …(4) }, { …(4) }, { …(4) }, …(13) ] to have a length of 14 but got 16
```

---
*Phase: 15-auth-profile-transactional-email*
