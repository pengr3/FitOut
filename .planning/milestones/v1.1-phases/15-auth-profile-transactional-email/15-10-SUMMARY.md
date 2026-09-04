---
phase: 15-auth-profile-transactional-email
plan: 10
subsystem: ui
tags: [design-system, ast, jsdom, gates, e2e, responsive, profile, auth]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-08's converted `/profile` tree (two `PanelCard`s, one `PageHeader`, one `BOOKING_SHELL` per file) and plan 15-07's four converted `(auth)` pages with their measured 320px numbers"
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-09's `auth-composition.test.tsx` — the four-link chain, the per-file vacuity floor and the green-but-unprobed commit discipline"
  - phase: 13-confirmation-bookings-trust
    provides: "`cancel-page-shell.test.tsx` — the `(path, text)` scanner signature, the guard-the-guard block and the never-written-to-disk violating fixture"
  - phase: 11-shell-and-navigation
    provides: "`e2e/overflow-320.spec.ts`'s `RouteRow` table, its `tell` trap, its resolver-shaped path and `expectReachable`"
provides:
  - "`tests/design/profile-pass.test.tsx` — the AUTHUI-02 gate, build-blocking, 13 cases, every one watched failing"
  - "the DOM link made against the REAL `ProfileForm` rather than the plan's `PanelCard` stand-in"
  - "twenty-five shipped profile sentences pinned as string literals, including both D-09/D-10 promises"
  - "the five account routes and two form-replacing branches measured at 320px in both themes — 26 cases → 40"
  - "`overflow-320.spec.ts`'s stale `TWELVE ROUTES` header replaced with counts derived from the array"
  - "the M2 measurement: the tall signup card does NOT clip at 320×568, walked ancestor by ancestor"
affects: [15-11-visual-baselines, 16-crop-avatar]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A design gate that renders a real `\"use client\"` product component by stubbing exactly ONE module (`next/navigation`) and stating in its header what is stubbed and what is not"
    - "A separate AUTHORED-TEXT vacuity floor beside the JSX floor, because a tree can parse to fifty elements while the string corpus comes back empty"
    - "A mutation chosen to leave the FIRST assertion in an `it()` passing, so the second is proved live rather than dead code behind it"
    - "An e2e `tell` narrowed by a sentence another gate pins byte-for-byte, so the reachability guard and the copy pin move together"

key-files:
  created:
    - "tests/design/profile-pass.test.tsx"
  modified:
    - "e2e/overflow-320.spec.ts"

key-decisions:
  - "The plan's DOM fallback was refused because it was measured unnecessary — the server actions import fine, `useRouter()` is the blocker, and one `next/navigation` stub makes the two-panel count a DOM fact instead of an AST count"
  - "`loading.tsx` is asserted at ONE `PanelSkeleton`, not the two the plan's behaviour list names: 15-08 already watched AC#18 refuse the second, and pinning two here would set this gate against a gate that already rejects it"
  - "The `/profile` e2e row took the RESOLVER branch, not the skip branch — a UI signup needs no seed, so the row is real rather than an inventory entry"
  - "The `/profile` row's `tell` is the `panel-card` hook NARROWED by a pinned sentence, because `/login` renders `panel-card` too and the plain hook would have passed over the redirect the row exists to survive (T-15-32)"
  - "AUTHUI-02 and AUTHUI-03 were ADVANCED, not completed: AUTHUI-02's second clause is Phase 16's CROP-03 by REQUIREMENTS.md's own conflict note, and AUTHUI-03's last clause is plan 15-11's baseline"

patterns-established:
  - "When a plan predicts a blocker, probe it before writing the fallback — the prediction can be wrong in a direction that makes the gate STRONGER, and the measurement is worth more than the fallback"
  - "A record written before its probe was run is corrected in its own commit even when the probe agrees, because \"it turned out to be right\" is not the claim \"it was watched\""

requirements-completed: []
requirements-advanced: [AUTHUI-02, AUTHUI-03]

# Metrics
duration: 37min
completed: 2026-08-24
---

# Phase 15 Plan 10: AUTHUI-02 Becomes Falsifiable, and the Auth Routes Join the 320px Gate Summary

**Every one of 15-UI-SPEC's profile claims stops being prose and becomes a count or an absence that
exits non-zero inside `npm run build` — with the DOM half made against the real `ProfileForm` rather
than the stand-in the plan expected to be necessary — and the five account routes plus two of their
form-replacing branches join the harness that measures whether anything is wider than a 320px
viewport.**

## Performance

- **Duration:** 37 min
- **Started:** 2026-08-24T22:58:13+08:00 (from the 15-09 close)
- **Completed:** 2026-08-24T23:35:17+08:00
- **Tasks:** 2 of 2
- **Files created:** 1 · **modified:** 1

## Accomplishments

- **AUTHUI-02's falsifiable set is thirteen commands.** One `PageHeader` on the page and one on its
  plate (the plate's carrying no lede, because the member-since line is data-derived AND conditional);
  both files READING `BOOKING_SHELL` rather than typing it; two `PanelCard`s at `titleAs="h2"` and
  zero raw containers; zero `variant="brand"`, zero `variant="destructive"`, zero success tokens; zero
  timers on the save path; exactly one `Save state` name; the hidden file input and its upload name
  still present; and no control — in source OR in the rendered document — named as a removal.
- **The DOM link is the real component, and that was a measurement rather than an ambition.** The
  plan permitted a weaker link and asked for it to be named honestly; probing found the predicted
  blocker was not one, and the stronger link was three lines away.
- **Every assertion has been watched failing.** Six mutations plus one negative control, each applied
  alone, each run, each reverted with `git diff --exit-code src/` confirmed clean before the next
  started, each recorded in its own commit with the red transcribed verbatim.
- **The 320px table went from 26 cases to 40** and its header stopped lying about its own size.
- **The one row where a redirect could have made the gate vacuous was caught before it shipped**, not
  after — see the `/profile` row.

## The three probes that replaced the plan's fallback

15-10-PLAN warns that `profile-form.tsx` "imports server actions, which may not resolve under the
design config" and instructs a fallback: render `PanelCard` directly, keep the two-panel count as an
AST assertion, and say which link is therefore weaker. That fallback was **not needed**, and the
reason is not the one predicted.

| Probe | What was attempted | Result |
|---|---|---|
| 1 | `await import("@/app/(app)/profile/profile-form")` under `vitest.design.config.ts` | **No error.** The server-action modules resolve fine — under this config a `"use server"` file is a plain module, and the `server-only` alias is what makes that true |
| 2 | `render(<ProfileForm …/>)` with nothing stubbed | **Threw:** `Error: invariant expected app router to be mounted \| cards=0` — `useRouter()`, not the actions |
| 3 | The same render with ONE `vi.mock` of `next/navigation` | `OK \| cards=2 \| h2=Public profile/Private account info` |

So the two-panel count is a **DOM fact**. What is stubbed is stated in the file's own header: the
router, and nothing else — `updateProfile`, `uploadAvatarAction`, `react-hook-form`, `zodResolver`,
the shared `profileSchema`, `PanelCard`, `Avatar`, `Input`, `Textarea` and `Button` are all real.

## The mutation walk — six probes and one negative control, all run, all reverted

Command for every probe:
`npx vitest run tests/design/profile-pass.test.tsx --config vitest.design.config.ts`. Green is 13.

| # | Mutation | Result |
|---|---|---|
| M1 | `PanelCard` swapped for `import { Card as PanelCard } from "@/components/ui/card"` | 3 failed / 10 passed |
| M2 | `loading.tsx`'s `className={BOOKING_SHELL}` re-typed as the byte-identical literal, **import kept** | 1 failed / 12 passed |
| M3 | `variant="brand"` added to the save submit | 1 failed / 12 passed **here**, and 1 failed / 24 passed in `brand-recipe.test.ts` |
| M4 | The D-10 promise loses its full stop | 1 failed / 12 passed |
| M5 | The optimistic save: the awaited result replaced by `setTimeout(() => setSaved(true), 800)` | 1 failed / 12 passed — **and 53 of 54 design files saw nothing** |
| M6 | A `variant="destructive"` `Remove photo` button added to the avatar block | 3 failed / 10 passed |
| M7 | *(negative control)* the phrase `Remove photo` added as a **comment** | **13 passed** — a `grep -i remove` would have reported it |

Every red is transcribed verbatim in the file's header. Three of them are worth restating here.

### M5 is the assertion that earns the file

```
Test Files  1 failed | 53 passed (54)
     Tests  1 failed | 907 passed | 3 skipped (911)
```

The whole design suite was run against the optimistic-save mutation. **Fifty-three other files saw
nothing.** It leaves the markup, the copy, the containers, the counts, the tokens, the live regions
and every pixel byte-identical and changes only *whether the sentence is true* — and `tests/profile/`
cannot see it either, because it drives the server action rather than the component. 14-CONTEXT D-150
cites this file as the reference truthful-save model; this is the assertion that makes the citation
checkable.

### M3 proves two gates are not redundant

`brand-recipe.test.ts` reddens on the same mutation (`expected 29 to be 28`). The two readings are
different: a repo-wide total is a **budget**, and a budget is satisfied by moving the number to 29 —
a one-character edit somebody makes while chasing a green run. This file says something a budget
structurally cannot: *this surface may have none*, whatever the repo-wide count is willing to absorb.
A coral traded away elsewhere and re-spent here would leave the budget at 28 and never redden there.

### M2 was chosen to keep the import, and that is the finding

The obvious probe — delete the import AND use a literal — would have thrown on the **first**
assertion in that `it()`'s loop and said nothing at all about the second, exactly as M1 left (7)'s
`titleAs` loop unrun. Leaving the import in place is what proves the hand-typed check is a live
assertion rather than dead code behind the import check. It is also a **zero-pixel defect**: the
literal renders identically to the constant today, so no screenshot, baseline or review would ever
notice it. It only becomes a defect the day `BOOKING_SHELL` changes and that one file silently does
not move.

## Task 2 — which branch the `/profile` row took, and why

**The resolver branch, not the skip branch.** The plan offered both and asked for the choice to be
recorded. Driving the shipped signup form through the UI needs **no seed, no database client and no
fixture** — `login-persistence.spec.ts` and `helpers/booker-seed.ts` already do exactly this — so the
table stays seed-free in the sense its own header means, and the row is a real measurement rather
than an inventory entry describing a hole. Measured: `/profile · court` and `/profile · grove` both
pass, 5.5 s each.

It is deliberately **not memoised**, which is the opposite decision from `firstListingPath` beside it
and for a structural reason: that resolver caches a *string*, which is the same for every context;
this one produces a *session cookie*, and Playwright's `page` fixture is per-test. A cached
`"/profile"` handed to a second test would navigate an anonymous browser to a route that redirects.

### The vacuity hole this row would have shipped with

`(app)/profile/page.tsx` redirects an anonymous visitor to `/login`, and since plan 15-07 **`/login`
renders `[data-testid="panel-card"]`**. The plan's literal instruction — *"`tell` set to the declared
`panel-card` testid"* — would therefore have been satisfied by the exact failure the `tell` mechanism
exists to catch, and this row would have measured the login page twice and reported `/profile` as
covered. That is byte-for-byte the vacuity probe this spec's own header records for `/terms`, one
phase later on a new row. The `tell` is narrowed to the panel carrying the private group's
sentence — one of the two D-09/D-10 promises, pinned byte-for-byte by `profile-pass.test.tsx`, so the
two gates move together or one of them goes red. Logged as Deviation 1.

### M2 — the tall signup card at 320×568, measured rather than predicted

Real Chromium at the iPhone-SE viewport, walked ancestor by ancestor:

| | `/signup` | `/login` | `/forgot-password` | `/reset-password` |
|---|---|---|---|---|
| card height | **544px** | 404px | 268px | 268px |
| card top → bottom | 100 → 644 | 100 → 504 | 100 → 368 | 100 → 368 |
| `main` height | 692px | 552px | 416px | 416px |
| document scrollHeight vs clientHeight | 1041 / 568 | 901 / 568 | 765 / 568 | 765 / 568 |
| scrollWidth vs clientWidth | 320 = 320 | 320 = 320 | 320 = 320 | 320 = 320 |

**The signup card does NOT clip.** 76px of it sits below the fold at rest and the document scrolls to
reveal it: scrolling to the bottom lands at `scrollY 473` and puts the card's bottom edge at `y=171`,
well inside the viewport. The **only** `overflow: hidden` ancestor is the card's own root
(`ui/card.tsx`'s, there to clip a first-child image to the radius) and it cuts nothing — its
`clientHeight` and `scrollHeight` are both 544. The layout's `main` does not constrain it either
(692 > 544). Below the fold is not clipped, and this is stated with its numbers because "it probably
scrolls" is the reasoning that produces the bugs this gate exists for.

## Task Commits

1. **Task 1: the AUTHUI-02 design-pass gate, committed green-but-unprobed** — `011bdd2` (test)
2. *(durability checkpoint)* — `7202d0b` (docs, interim summary)
3. **M1 recorded — the aliased raw container** — `f0d8e71` (test)
4. **M2 recorded — the re-typed shell with its import intact** — `3bc0cdb` (test)
5. **M3 recorded — the accent fill on the save submit** — `214ef34` (test)
6. **M4 recorded — a one-character drift in the D-10 promise** — `4fb1b63` (test)
7. **M5 recorded — the optimistic save** — `be53733` (test)
8. **M6 recorded — the pre-empted removal control** — `93f1b42` (test)
9. **M7's record corrected — it was written before it was run** — `36493d3` (fix)
10. **Task 2: the five account routes and two branches join the table** — `5f46963` (test)
11. **The M2 measurement recorded** — `25b9953` (test)

## Files Created/Modified

- `tests/design/profile-pass.test.tsx` — 13 cases. Three guard-the-guard vacuity floors (bytes, JSX
  per file, authored text per file) asserted first; the page/plate shell and header assertions; the
  plate's one skeleton with AC#18's red quoted beside it; the form's two panels, banned variants and
  absent success token; the timer absence and the `Save state` name; the avatar block's survival and
  the removal absence; twenty-five pinned sentences plus two exact ordered lists; the DOM render of
  the real `ProfileForm`; and a violating fixture that is never written to disk.
- `e2e/overflow-320.spec.ts` — seven new rows in a marked Phase-15 block, one new resolver
  (`signUpAndReachProfile`), and four header corrections. **187 insertions, 9 deletions, and all nine
  deleted lines are header prose** — no pre-existing row, no `expectReachable`, no trap, no constant.

## Decisions Made

- **The plan's DOM fallback was refused on evidence.** Written up above and in the file's header.
- **`loading.tsx` is asserted at ONE `PanelSkeleton`.** The plan's behaviour list asks for two;
  `loading-coverage.test.ts` AC#18 refuses the second, and 15-08 already watched that red. Asserting
  two here would pin this gate against a gate that already rejects it and the loser would be whichever
  ran second. The count asserted is the one the tree can hold, with the reason written beside it.
- **`SELECTOR_IDS` did not move.** No new hook was invented for either task; the profile row's e2e
  `tell` narrows a declared id rather than adding one, which is what keeps 15-UI-SPEC's "+0 selector
  ids this phase" true.
- **Requirements advanced, not completed.** AUTHUI-02 reads "…**and avatar removal is possible**",
  which REQUIREMENTS.md's own conflict note (line 274) assigns to Phase 16's CROP-03. AUTHUI-03 ends
  "…**and a baseline**", which is plan 15-11's. Neither checkbox was ticked; neither traceability row
  was moved.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] The `/profile` row's `tell` had to be narrowed, or the
row would have been vacuous by construction**

- **Found during:** Task 2, writing the row
- **Issue:** The plan says the `/profile` row's `tell` is "the declared `panel-card` testid". But
  `/profile` redirects an anonymous visitor to `/login`, and plan 15-07 put `/login` on `PanelCard` —
  so the plain hook is present on the redirect target. A row written to the letter would have
  measured `/login` twice, reported `/profile` as covered, and been green forever. The plan's **own
  threat register** names this: T-15-32, *"a 320px row passing over a redirect to `/login`"*, with the
  mitigation *"each new row's `tell` is a declared selector only that route produces"*. The literal
  instruction and the threat model disagree, and the threat model is the one that describes reality.
- **Fix:** `tell: '[data-testid="panel-card"]:has-text("Private account info")'` — still the declared
  hook, narrowed by a sentence no other route renders. The sentence is one of the two D-09/D-10
  promises pinned byte-for-byte by this plan's own `profile-pass.test.tsx`, so a copy change moves
  both files or reddens one.
- **Files modified:** `e2e/overflow-320.spec.ts`
- **Commit:** `5f46963`
- **Not applied to the four auth rows, and the reason is stated in the block comment rather than
  assumed:** all four are literal paths to routes that exist and redirect nowhere, so the failure a
  `tell` really guards (a 404, a blank page, a redirect) is covered — the root not-found renders
  `empty-state` and no panel. What those four `tell`s cannot prove is that `/signup` is not serving
  `/login`, and that limit is written into the file rather than papered over.

**2. [Rule 1 - Bug] The gate's own DOM case failed under full-suite load and would have read as a
flake**

- **Found during:** Task 1's first `npm run test:design`
- **Issue:** Case (12) reached for the component with `await import()` inside the test body. Isolated,
  the file ran in 2.1s. Under 54 files' contention: `Error: Test timed out in 5000ms` — 1 failed / 53
  passed. The import pulls in both server actions and, through them, Better Auth and the schema
  layer (817 ms on an idle machine).
- **Fix:** Hoisted to a static import, which moves the cost to collection where vitest does not time
  it against a per-test budget. `vi.mock` is hoisted above the import block by vitest's transform, so
  the static import resolves against the stub rather than racing it. Recorded in the file, because a
  red on a clock rather than on an assertion is the kind that gets retried instead of read.
- **Files modified:** `tests/design/profile-pass.test.tsx`
- **Commit:** `011bdd2`

**3. [Rule 1 - Bug] A blanket vacuity floor reported a correct file**

- **Found during:** Task 1's first isolated run
- **Issue:** The authored-text floor was written as a blanket 4 and went red on `loading.tsx` at 3 —
  a perfectly correct file whose whole authored vocabulary is one class, one title and one skeleton
  label. This is the same mistake `auth-composition.test.tsx` records making on its own first run,
  arrived at independently one plan later.
- **Fix:** Per-file floors, measured (page 4 · loading 3 · form 40 against actuals of 5 / 3 / 59),
  with the red quoted beside them and a note that the floor is a vacuity bar rather than a census.
- **Files modified:** `tests/design/profile-pass.test.tsx`
- **Commit:** `011bdd2`

**4. [Rule 1 - Process fault, corrected in its own commit] M7's record was written before M7 was run**

- **Found during:** the walk, immediately after `93f1b42`
- **Issue:** The negative-control paragraph was committed one commit **before** the probe was run —
  the exact thing this walk's green-but-unprobed discipline exists to prevent, committed by the
  process enforcing it.
- **Fix:** The probe was run (13 passed, with `grep -ci remove` over the mutated file reporting 1) and
  the result matched, so the paragraph stands. A correction note sits beside it recording the ordering
  fault, following 15-09's M3 precedent, because *"it turned out to be right"* is not the same claim
  as *"it was watched"* and a reader deciding how far to trust the walk should be able to tell which
  paragraph was which.
- **Files modified:** `tests/design/profile-pass.test.tsx`
- **Commit:** `36493d3`

**5. [Rule 1 - Criterion correction] `loading.tsx` draws ONE skeleton, so the plan's two-skeleton
behaviour clause is not asserted**

- **Found during:** Task 1, writing the assertions
- **Issue:** The plan's `<behavior>` list says `loading.tsx` composes "exactly two `PanelSkeleton`
  elements". It composes one, because plan 15-08 tried two first and `loading-coverage.test.ts` AC#18
  refused it — each skeleton pattern carries its own `role="status"`, so a second call site is a
  second live region announcing one navigation.
- **Fix:** The gate asserts **one**, with 15-08's observed red quoted in the assertion's own comment
  so the number does not read as drift. Nothing in `src/` was changed.
- **Files modified:** `tests/design/profile-pass.test.tsx`
- **Commit:** `011bdd2`

---

**Total deviations:** 5 auto-fixed (1 × Rule 2, 4 × Rule 1). **No Rule 4 situation arose; no
architectural change was needed; `src/` is byte-identical to its state at `b40d173`** — confirmed by
`git diff --exit-code src/` after every one of the seven probes and once more at plan close.

## Deferred / Out of Scope (logged, not fixed)

- **`brand-recipe.test.ts`'s `describe` title still says "exactly the 22 buttons"** while the
  assertion is at 28. Flagged by 15-07, still ownerless, and this plan does not own that file.
- **`(auth)/error.tsx`'s two false header claims** remain ownerless — flagged by 15-06, re-flagged by
  15-07 and 15-08. Now four plans' worth of provenance and still no owner. Not in this plan's file
  scope, whose `git diff --name-only` is required to list only two files.
- **`loading-coverage.test.ts`'s count-pin `it()` title** is still stale against the constants beside
  it (15-08's finding). Same reason.
- **Two pre-existing row comments in `overflow-320.spec.ts` still say "twelve-route table".** They are
  left byte-identical because this plan's own acceptance criteria forbid editing any pre-existing row;
  the phrase is flagged as history in the file header instead, which is the only place the criteria
  leave available.

## Issues Encountered

**None that were regressions.** The dev server logs a React hydration-mismatch warning from
`(host)/host/layout.tsx`'s `NavDrawer` during the full e2e run — pre-existing, on a host route no row
of this plan touches, and the run passed 60/60. Recorded because the stack trace is alarming in the
output and is not this plan's.

## Verification Results

| Check | Result |
|-------|--------|
| `npx vitest run tests/design/profile-pass.test.tsx --config vitest.design.config.ts` | exit 0 — **13 passed** |
| `npm run test:design` | exit 0 — 54 files / **908 passed** / 3 skipped (the 15-09 close was 53 / 895 / 3) |
| `npx playwright test e2e/overflow-320.spec.ts --project=chromium` | exit 0 — **60 passed / 15 skipped** |
| …the AC#29 block alone | **32 passed / 8 skipped** — exactly the 40 the docblock now claims |
| `npm test` (run alone, never beside the design suite) | exit 0 — 181 files / **2037 passed** / 5 skipped |
| `npm run build` (lint → design suite → `next build`) | exit 0 — the gate is genuinely build-blocking |
| `npx tsc --noEmit` (run bare; the pipe-to-`tail` exit-code trap avoided) | exit 0 |
| `git diff --exit-code src/` after each of the seven probes and at plan close | exit 0 every time |
| `git diff --name-only b40d173..HEAD` | exactly the two files in `files_modified`, plus this summary |

**Acceptance greps.** `grep -c 'name: "/login",'` = 1, and the same for `/signup`,
`/forgot-password`, `/reset-password` and `/profile`. `grep -c 'TWELVE ROUTES'` = **0**. Rows counted
from the array: **20 rows · 20 `tell`s · 4 `path: null`** → 17 routes + 3 states, 13 reachable routes,
4 not, 40 cases. `git diff HEAD~1 HEAD` on the Task-2 commit: 187 insertions, 9 deletions, all nine
deleted lines header prose.

## Known Stubs

None. No placeholder value, empty-array data source, mock or "coming soon" copy was introduced. The
one stub-shaped thing in either file is the `next/navigation` router mock, which is a test double
scoped to one file, declared in that file's header, and named there as the only thing that is not
real in the render.

## Threat Flags

None — no new network endpoint, auth path, file access pattern or schema change; no `src/` change at
all. The plan's six registered threats are held as written:

| Threat | How it was held |
|---|---|
| T-15-07 (a vacuous gate over an empty parse) | THREE guard-the-guard floors asserted first — bytes, JSX per file, authored text per file — the third added because a tree can parse to 53 elements while the string corpus comes back empty; plus a violating fixture and a seven-probe walk with every red quoted |
| T-15-28 (the public/private split drifting) | Both D-09/D-10 sentences pinned as string literals AND as an exact ordered list; M4 mutated one of them by a single character and watched it redden; the private sentence is additionally the `/profile` e2e row's `tell` |
| T-15-29 (a save reported as successful when it was not) | `setTimeout`/`setInterval` absence asserted by AST; M5 shipped the optimistic save and 53 of 54 design files saw nothing |
| T-15-32 (a 320px row passing over a redirect to `/login`) | The `/profile` `tell` narrowed to a sentence only that route renders — see Deviation 1; the four auth rows' limit stated in the file rather than assumed away |
| T-15-33 (a route quietly missing from the table) | The `/profile` row exists on the resolver branch and passes in both themes; the docblock's counts are derived from the array and re-measured (20 rows, 40 cases, 13/4 split) |
| T-15-SC (package installs) | Zero installs. No `package.json` change |

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 15-11 (baselines) inherits four auth screens and one profile surface whose geometry is now
  measured at BOTH heights.** 15-07 took the four at 320×800; the M2 table above adds 320×568 with
  card heights (signup 544 · login 404 · forgot 268 · reset 268), `main` heights and document scroll
  heights. Any baseline should be taken against these numbers, and `/profile`'s geometry moved at
  `c8d89f5` — anything older is stale.
- **AUTHUI-03's remaining clause is the baseline itself**, which is 15-11's. Gate 1 (320px, every
  state) is closed by this plan for the four auth routes and for `/profile`.
- **Phase 16 (CROP-03) inherits an assertion that will redden on it, deliberately.**
  `profile-pass.test.tsx`'s removal-absence check is a pin saying the capability has not arrived, not
  a ban — the note beside it says so, and the plan that adds the control must move this file and
  declare the new control's accessible name there. It reddens in TWO places (the source corpus and the
  rendered accessible-name scan), so a label composed from a variable does not slip past.
- **Anyone editing profile copy now moves two files.** `profile-pass.test.tsx` pins twenty-five
  sentences; `overflow-320.spec.ts`'s `/profile` row depends on one of them. That is deliberate
  friction on the two sentences that state the D-09/D-10 boundary to the user.

---
*Phase: 15-auth-profile-transactional-email*
*Completed: 2026-08-24*

## Self-Check: PASSED

Both files in `files_modified` and this summary exist on disk; all eleven commits (`011bdd2`,
`7202d0b`, `f0d8e71`, `3bc0cdb`, `214ef34`, `4fb1b63`, `be53733`, `93f1b42`, `36493d3`, `5f46963`,
`25b9953`) are reachable in `git log`. `git diff --name-only b40d173..HEAD` lists exactly the two
files plus this summary — the M2 measurement harness lived in the scratchpad, was never written into
the repository and was never committed.
