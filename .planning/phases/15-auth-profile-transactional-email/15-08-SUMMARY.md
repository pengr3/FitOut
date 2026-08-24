---
phase: 15-auth-profile-transactional-email
plan: 08
subsystem: ui
tags: [nextjs, app-router, design-system, accessibility, forms, profile, live-regions]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-06's widened `PanelCard.titleAs` union and plan 15-07's conversion procedure (a row and its count move in ONE commit, with the red watched first)"
  - phase: 13-confirmation-bookings-trust
    provides: "`BOOKING_SHELL` — the declared booker container, and the container-not-landmark rule that comes with it"
  - phase: 11-shell-and-navigation
    provides: "`PageHeader`, `PanelCard`, `PanelSkeleton` and the card-surface inventory ↔ allow-list pairing procedure"
provides:
  - "`/profile` renders one `<h1>` at 20px through `PageHeader`, replacing the app's last 24px outlier"
  - "the page and its plate read ONE `BOOKING_SHELL` each; the hand-typed container is gone from both"
  - "two `PanelCard` containers around a save-state machine that did not move"
  - "`EXPECTED_SURFACES` 20 → 21 and the adopted half 18 → 19, moved with the one row that justified them"
affects: [15-09-live-regions, 15-11-visual-baselines]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A plate that claims ONE panel for a page that draws two — AC#18 permits exactly one skeleton pattern per fallback, and the honest fallback claims the dominant region"

key-files:
  created: []
  modified:
    - "src/app/(app)/profile/page.tsx"
    - "src/app/(app)/profile/loading.tsx"
    - "src/app/(app)/profile/profile-form.tsx"
    - "tests/design/card-pattern-coverage.test.ts"

key-decisions:
  - "The plate keeps ONE `PanelSkeleton`, not the two the plan asked for: `loading-coverage.test.ts` AC#18 permits exactly one skeleton pattern per fallback, and its other legal shape is closed by a pinned two-file list"

patterns-established: []

requirements-completed: []
requirements-advanced: [AUTHUI-02]

# Metrics
duration: in-progress
completed: 2026-08-24
---

# Phase 15 Plan 08: The Profile Page Adopts the Design System Summary

**`/profile` reads the declared booker shell instead of typing it twice, renders its `<h1>` through
`PageHeader`, and wraps its two field groups in two `PanelCard`s around a save-state machine that did
not move.**

## Status

**IN PROGRESS** — Task 1 landed and verified. This file is written early and refined in place
(durability), and the final numbers arrive with Task 2.

## Task Commits

1. **Task 1: The page and its plate read one shell and one header** — `c8d89f5` (feat)
2. **Task 1 fix: the plate keeps ONE panel skeleton (AC#18)** — `8ac4823` (fix)

## Verification Results (so far)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (run bare) | exit 0 |
| `npm run test:design` | exit 0 — 52 files / **877 passed** / 3 skipped |
| `git diff --exit-code tests/design/loading-coverage.test.ts` | exit 0 — unedited |
| `loading-coverage` pins | `EXPECTED_PAGES` 29 / `EXPECTED_QUALIFYING` 21 / `EXPECTED_NON_QUALIFYING` 8 — unmoved |

## Deviations from Plan

### 1. [Rule 3 - Blocking] The plate cannot draw two skeletons — AC#18 forbids it

- **Found during:** Task 1 verification
- **Issue:** The plan asked for **two** `PanelSkeleton`s on the plate. With them in,
  `tests/design/loading-coverage.test.ts` went red:

  ```
  AssertionError: a loading state must announce itself exactly once: either by composing ONE of the
  three skeleton patterns, or — where the route has no resolved geometry to stand in for — by writing
  one `role="status"` with an `aria-label`, because `role="status"` is nameFrom:author and an sr-only
  child alone leaves the live region unnamed.: expected [ Array(1) ] to deeply equal []
    + "src/app/(app)/profile/loading.tsx (patterns: 2, own role=status: 0, named: false)"
  ```

  Each skeleton pattern carries its own `role="status"`, so a second call site is a second live region
  for one navigation. The gate's other legal shape (zero patterns + one hand-written named region) is
  closed by a **pinned two-file list** of routes that deliberately get no skeleton, which `/profile` is
  not on. The plan simultaneously requires that file to pass **with zero edits**, so the two
  instructions are mutually exclusive and the gate's zero-edit requirement is the one the plan ranks.
- **Fix:** One `PanelSkeleton`, with the observed red quoted verbatim in the file and both closed
  shapes explained. The disagreement the objective actually names — *the page draws no panel while its
  plate draws one* — is resolved anyway, because the page draws panels now.
- **Files modified:** `src/app/(app)/profile/loading.tsx`
- **Commit:** `8ac4823`

### 2. [Rule 3 - Blocking] A comment quoting the tag its own gate counts

- **Found during:** Task 1 acceptance greps
- **Issue:** `grep -c '<main'` on `page.tsx` must return 0, while the same file is required to explain
  that the shell is a container and not a landmark. The comment quoting the element failed the grep
  that documents it — the collision 15-06 hit four times and 15-07 three times.
- **Fix:** Named descriptively ("the one main landmark per document"), `booking-row.tsx:112`'s
  precedent, with an in-file sentence saying why.
- **Files modified:** `src/app/(app)/profile/page.tsx`
- **Commit:** `c8d89f5`

## Deferred / Out of Scope (logged, not fixed)

- **`loading-coverage.test.ts`'s count-pin `it()` title reads "28 pages, 20 qualifying, 8 not, 20
  loading files"** while the constants beside it are 29 / 21 / 8. A test whose own name is false — the
  defect class this phase exists to repair — but stale since before this plan, and this plan's
  verification block requires that file to be byte-identical. Handed forward.

---
*Phase: 15-auth-profile-transactional-email*
