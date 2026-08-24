---
phase: 15-auth-profile-transactional-email
plan: 10
subsystem: ui
tags: [design-system, ast, jsdom, gates, e2e, responsive, profile, auth]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-08's converted `/profile` tree (two `PanelCard`s, one `PageHeader`, one `BOOKING_SHELL` per file) and plan 15-07's four converted `(auth)` pages"
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-09's `auth-composition.test.tsx` — the four-link chain, the per-file JSX floor and the green-but-unprobed commit discipline"
  - phase: 13-confirmation-bookings-trust
    provides: "`cancel-page-shell.test.tsx` — the `(path, text)` scanner signature, the guard-the-guard block and the never-written-to-disk violating fixture"
  - phase: 11-shell-and-navigation
    provides: "`e2e/overflow-320.spec.ts`'s `RouteRow` table, its `tell` trap and `expectReachable`"
provides:
  - "`tests/design/profile-pass.test.tsx` — the AUTHUI-02 gate, build-blocking, 13 cases"
  - "the DOM link made against the REAL `ProfileForm` rather than the plan's `PanelCard` stand-in"
  - "every shipped profile sentence pinned as a string literal, including the two D-09/D-10 promises"
  - "the four auth routes, their two extra branches and `/profile` measured at 320px in both themes"
  - "`overflow-320.spec.ts`'s stale `TWELVE ROUTES` header replaced with a re-measured count"
affects: [15-11-visual-baselines, 16-crop-avatar]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A design gate that renders a real `\"use client\"` product component by stubbing exactly one module (`next/navigation`) and saying in its header what is stubbed and what is not"
    - "A separate AUTHORED-TEXT vacuity floor beside the JSX floor, because a tree can parse to fifty elements while the string corpus comes back empty"

key-files:
  created:
    - "tests/design/profile-pass.test.tsx"
  modified:
    - "e2e/overflow-320.spec.ts"

key-decisions:
  - "The plan's DOM fallback was refused because it was not needed — measured: the server actions import fine, `useRouter()` is the blocker, and one `next/navigation` stub makes the two-panel count a DOM fact instead of an AST count"
  - "`loading.tsx` is asserted at ONE `PanelSkeleton`, not the two the plan's behaviour list names. 15-08 already watched AC#18 refuse the second, and pinning two here would set this gate against a gate that already rejects it"
  - "The `/profile` e2e row's `tell` is the `panel-card` hook NARROWED by a pinned sentence, because `/login` now renders `panel-card` too — the plan's own T-15-32 is exactly the redirect this closes"

patterns-established:
  - "When a plan predicts a blocker, probe it before writing the fallback: the prediction can be wrong in a direction that makes the gate STRONGER, and the measurement is worth more than the fallback"

requirements-completed: []
requirements-advanced: [AUTHUI-02, AUTHUI-03]

# Metrics
duration: in-progress
completed: 2026-08-24
---

# Phase 15 Plan 10: AUTHUI-02 Becomes Falsifiable, and the Auth Routes Join the 320px Gate Summary

**Every one of 15-UI-SPEC's profile claims stops being prose and becomes a count or an absence that
exits non-zero — with the DOM half made against the real `ProfileForm` rather than the stand-in the
plan expected to be necessary — and the four auth screens plus two of their branches join the
harness that measures whether anything is wider than a 320px viewport.**

> ⚠ INTERIM. Task 1's gate is committed green; its mutation walk is recorded in the file's own header
> as NOT YET RUN and is being executed probe by probe. Task 2 has not started. This file is refined in
> place as each lands.

## Performance

- **Duration:** in progress
- **Started:** 2026-08-24T23:00:00Z
- **Tasks:** 1 of 2 landed (unprobed)

## Task Commits

1. **Task 1: the AUTHUI-02 design-pass gate, committed green-but-unprobed** — `011bdd2` (test)

## Accomplishments so far

- **AUTHUI-02's falsifiable set is now thirteen commands.** One `PageHeader` on the page and one on
  its plate (the plate's carrying no lede, because the member-since line is data-derived AND
  conditional); both files READING `BOOKING_SHELL` rather than typing it; two `PanelCard`s at
  `titleAs="h2"` and zero raw containers; zero `variant="brand"`, zero `variant="destructive"`, zero
  success tokens; zero timers on the save path; exactly one `Save state` name; the hidden file input
  and its upload name still present; and no control named as a removal.
- **The DOM link is the real component.** See the measurement below — this is strictly stronger than
  the plan's permitted fallback, and it was reached by probing the plan's prediction instead of
  accepting it.
- **The copy is pinned by string literal, not by review.** Twenty-five sentences across the three
  files, including both D-09/D-10 promises asserted as whole ordered lists so a third panel cannot
  satisfy them by addition.

## The three probes that replaced the plan's fallback

15-10-PLAN warns that `profile-form.tsx` "imports server actions, which may not resolve under the
design config" and instructs a fallback: render `PanelCard` directly and record the weaker link. That
fallback was **not needed**, and the reason is not the one predicted.

| Probe | What was attempted | Result |
|---|---|---|
| 1 | `await import("@/app/(app)/profile/profile-form")` under `vitest.design.config.ts` | **No error.** The server-action modules resolve fine — under this config a `"use server"` file is a plain module and the `server-only` alias is what makes that true |
| 2 | `render(<ProfileForm …/>)` with nothing stubbed | **Threw:** `Error: invariant expected app router to be mounted \| cards=0` — `useRouter()`, not the actions |
| 3 | The same render with ONE `vi.mock` of `next/navigation` | `OK \| cards=2 \| h2=Public profile/Private account info` |

So the two-panel count is a **DOM fact**. What is stubbed is stated in the file's header: the router,
and nothing else — `updateProfile`, `uploadAvatarAction`, `react-hook-form`, `zodResolver`, the shared
`profileSchema`, `PanelCard`, `Avatar`, `Input`, `Textarea` and `Button` are all real.

## The red the full suite found that an isolated run could not

Case (12) first reached for the module with `await import()` **inside the test body**. Isolated, the
whole file ran in 2.1s. The first `npm run test:design` run:

```
Error: Test timed out in 5000ms.
 ❯ tests/design/profile-pass.test.tsx:917:3
     917| it("(12) the REAL form renders two declared panel-card hooks, and th…

 Test Files  1 failed | 53 passed (54)
      Tests  1 failed | 907 passed | 3 skipped (911)
```

The import pulls in both server actions and, through them, Better Auth and the schema layer — 817 ms
on an idle machine, and past the 5 s default under 54 files' worth of contention. Hoisting it to a
static import moves the cost to **collection**, which vitest does not time against a per-test budget.
Recorded in the file because a red on a clock rather than on an assertion is the kind that gets
misread as a flake and retried.

## The first-draft floor that was measured wrong

The authored-text vacuity floor was written as a blanket 4 and watched reporting a **correct** file:

```
AssertionError: a profile file yielded almost no authored text … expected [ Array(1) ] to deeply
equal []
  + "src/app/(app)/profile/loading.tsx — 3 authored strings"
```

`loading.tsx`'s whole authored vocabulary is one class, one title and one skeleton label. The floor is
per-file now (page 4 · loading 3 · form 40, measured 5 / 3 / 59) — the same blanket-floor mistake
`auth-composition.test.tsx` records making on its own first run, arrived at independently one plan
later.

## Verification Results (so far)

| Check | Result |
|-------|--------|
| `npx vitest run tests/design/profile-pass.test.tsx --config vitest.design.config.ts` | exit 0 — **13 passed** |
| `npm run test:design` | exit 0 — 54 files / **908 passed** / 3 skipped (the 15-09 close was 53 / 895 / 3) |
| `npx tsc --noEmit` (run bare) | exit 0 |

---
*Phase: 15-auth-profile-transactional-email*
