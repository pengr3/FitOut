---
phase: 15-auth-profile-transactional-email
plan: 08
subsystem: ui
tags: [nextjs, app-router, design-system, accessibility, forms, profile, live-regions]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-06's widened `PanelCard.titleAs` union and plan 15-07's conversion procedure — a row and its counts move in ONE commit, with every red watched first"
  - phase: 13-confirmation-bookings-trust
    provides: "`BOOKING_SHELL` — the declared booker container, and the container-not-landmark rule that travels with it"
  - phase: 11-shell-and-navigation
    provides: "`PageHeader`, `PanelCard`, `PanelSkeleton`, and the card-surface inventory this plan extends"
provides:
  - "`/profile` renders one `<h1>` at 20px through `PageHeader` — the app's last 24px outlier is gone"
  - "the page and its plate read ONE `BOOKING_SHELL` each; the hand-typed container is gone from both files"
  - "two `PanelCard` containers around a save-state machine that did not move, and one accessible name added to the saved line"
  - "`EXPECTED_SURFACES` 20 → 21 and the adopted half 18 → 19, moved with the one row that justified them"
  - "a measured answer to `loading.tsx`'s two-skeleton question: AC#18 permits exactly one skeleton pattern per fallback"
affects: [15-09-live-regions, 15-11-visual-baselines, 16-crop-avatar]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A card surface that arrives at the inventory by neither usual route — never allow-listed, not post-spec, but drawing no box at all. The gate is structurally blind to it: both of its real assertions are absences, and a page with no card satisfies the inverse half perfectly"
    - "A `\"use client\"` form whose panels sit INSIDE the form element, so one box can hold an unregistered file control and the registered fields together"

key-files:
  created: []
  modified:
    - "src/app/(app)/profile/page.tsx"
    - "src/app/(app)/profile/loading.tsx"
    - "src/app/(app)/profile/profile-form.tsx"
    - "tests/design/card-pattern-coverage.test.ts"

key-decisions:
  - "The plate keeps ONE `PanelSkeleton`, not the two the plan asked for. `loading-coverage.test.ts` AC#18 permits exactly one skeleton pattern per fallback (each carries its own `role=\"status\"`), and the gate's only other legal shape is closed by a pinned two-file list — while the plan requires that file to pass with zero edits. The two instructions are mutually exclusive"
  - "The avatar block moved inside the `<form>` element so one panel holds it with the public fields. Safe by construction: the file input carries no `name` and is not registered, so `updateProfile` receives the same five values"
  - "`titleAs=\"h2\"` is passed explicitly at both call sites although it is the default — the level is a fact about this document's outline, not a default to inherit silently"
  - "AUTHUI-02 was NOT ticked: its last clause is \"and avatar removal is possible\", which REQUIREMENTS.md § conflicts assigns to Phase 16 CROP-03"

patterns-established:
  - "When a plan's markup instruction and a plan-protected gate are mutually exclusive, the gate's zero-edit requirement is the plan's own precedence signal — resolve toward the gate and quote its red in the file"

requirements-completed: []
requirements-advanced: [AUTHUI-02]

# Metrics
duration: 19min
completed: 2026-08-24
---

# Phase 15 Plan 08: The Profile Page Adopts the Design System Summary

**`/profile` reads the declared booker shell instead of typing it twice, renders its `<h1>` through
`PageHeader` at the 20px every adopted surface uses, and wraps its two field groups in two
`PanelCard`s around a save-state machine that reads byte-identically in behaviour — with the
inventory moved only after both of its reds were watched.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-08-24T12:43:19Z
- **Completed:** 2026-08-24T13:02:10Z
- **Tasks:** 2 of 2
- **Files modified:** 4

## Accomplishments

- **The duplication ends mechanically.** `mx-auto w-full max-w-2xl px-4 py-10` was hand-typed in two
  files that had to agree and had no mechanism making them agree. Both read `BOOKING_SHELL` now. The
  only rendering change is the vertical padding — 40px → 32px mobile / 48px at `sm:` — which is what
  stops `/profile` being the one booker-shell page with its own rhythm.
- **The app's last 24px `<h1>` is gone.** `PageHeader` renders it at `text-xl`, and the member-since
  sentence stays CONDITIONAL rather than gaining a fabricated fallback: a user with no `createdAt`
  gets no sentence, which is the pattern's own optional contract.
- **Two panels where there were two bare sections.** Both group sentences are byte-identical to the
  shipped copy, both groups keep exactly their shipped field membership, and no padding and no
  vertical-rhythm utility was added at either call site — the pattern's content box supplies both.
- **The save-state machine did not move.** `saved` is still set from the actual `updateProfile`
  result and cleared at the top of the next submit; zero `setTimeout` on the save path; the two
  refusal regions keep their role and their classes. The one markup change any live region received
  is the accessible name on the saved line.
- **The loading/loaded disagreement is resolved in the direction that was actually wrong.** The page
  drew no box while its own plate drew one. The page draws panels now, so the plate's panel skeleton
  finally stands in for something real.
- **Both pinned counts moved with the row and never ahead of it**, each with its red quoted verbatim
  in the owning test.

## The reds, observed before either number moved

With the `profile-form.tsx` row added and both counts still at their old values:

```
AssertionError: the declared card-surface inventory is not the size the UI-SPEC's three `Replaces`
lists describe. A coverage gate whose inventory silently emptied passes every one of its own
assertions.: expected 21 to be 20 // Object.is equality
```

```
AssertionError: expected [ { …(4) }, { …(4) }, { …(4) }, …(16) ] to have a length of 18 but got 19
```

The second is the pin that matters for THIS row: the profile form adopted a container it never had,
and a conversion mis-recorded as a `"refused"` row would satisfy `EXPECTED_SURFACES` at 21 and fail
only here. 15-07's hand-off named both, and both were watched.

## Task Commits

1. **Task 1: The page and its plate read one shell and one header** — `c8d89f5` (feat)
2. **Task 1 fix: the plate keeps ONE panel skeleton (AC#18)** — `8ac4823` (fix)
3. *(durability checkpoint)* — `f65e532` (docs, interim summary)
4. **Task 2: Two panels around a state machine that does not move** — `0b8bad9` (feat)
5. **Task 2 inventory: profile-form declared as the 21st card surface** — `c22e506` (test)

## Files Created/Modified

- `src/app/(app)/profile/page.tsx` — `BOOKING_SHELL` + `PageHeader` with a conditional lede, inside a
  `space-y-8` block matching `bookings/[id]/group/page.tsx`'s rhythm under the same shell. The session
  read, the per-page `/login` gate, the widened `session.user` cast, the `formatMemberSince` call and
  the whole `<ProfileForm>` prop list are byte-identical. No second landmark is opened.
- `src/app/(app)/profile/loading.tsx` — the same shell and the same `PageHeader` with no sentence
  under the title, one `PanelSkeleton`, and a rewritten header comment: the first clause was false the
  moment the page adopted the pattern, the "data-derived AND conditional" clause is kept word for word,
  and the refused second skeleton is recorded with the gate's own text.
- `src/app/(app)/profile/profile-form.tsx` — two `PanelCard` call sites at `titleAs="h2"`; the two
  `<section>`s, their heading ids and the references pointing at them retire because the pattern
  renders the headings. The save row sits below both panels and inside neither; the submit stays the
  neutral solid. The saved line gains `aria-label="Save state"`.
- `tests/design/card-pattern-coverage.test.ts` — one `CARD_SURFACES` row, `EXPECTED_SURFACES` 20 → 21,
  adopted half 18 → 19. `ALLOWED_RAW_CARD` untouched: this file was never on it, because it had no
  card to exempt.

## Decisions Made

- **The plate draws one skeleton, not two, and the reason is mechanical rather than aesthetic.**
  Written up in full under Deviations. Both of the gate's legal shapes were checked before choosing.
- **The avatar block moved inside the `<form>` element.** It was a sibling outside the form before,
  which is why the public group could not be one box: the avatar control and the public fields were
  in different subtrees. The file input carries no `name` and is not registered with RHF, so the
  values `updateProfile` receives are the same five it always received, and the Enter-key submit path
  is unchanged. `tests/profile/` drives the real server actions and passes untouched.
- **No removal affordance was pre-empted.** Phase 16 owns crop and avatar teardown (CROP-01/CROP-03).
  The action row is left able to hold a second control and given none — a destructive affordance
  shipped ahead of the action behind it is a button that lies.
- **Requirement advanced, not completed.** AUTHUI-02 reads "The profile page carries the design
  system, **and avatar removal is possible**." REQUIREMENTS.md's own conflict note assigns that second
  clause to Phase 16's CROP-03. The design-system half is closed here; the checkbox is not ticked.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plate cannot draw two skeletons — AC#18 forbids the second**

- **Found during:** Task 1 verification
- **Issue:** The plan asked for **two** `PanelSkeleton`s so the plate would draw as many boxes as the
  page. With both in, `tests/design/loading-coverage.test.ts` went red:

  ```
  AssertionError: a loading state must announce itself exactly once: either by composing ONE of the
  three skeleton patterns, or — where the route has no resolved geometry to stand in for — by writing
  one `role="status"` with an `aria-label`, because `role="status"` is nameFrom:author and an sr-only
  child alone leaves the live region unnamed.: expected [ Array(1) ] to deeply equal []
    + "src/app/(app)/profile/loading.tsx (patterns: 2, own role=status: 0, named: false)"
  ```

  Each skeleton pattern carries its own `role="status"`, so a second call site is a second live region
  announcing one navigation — *"two skeletons in one fallback announce the same wait twice"* is the
  gate's own sentence. The gate's other legal shape (zero patterns + one hand-written named region) is
  closed too: the plates that take it must appear in a **pinned two-file list** of routes that
  deliberately get no skeleton, and adding `/profile` to it would edit the same file. The plan
  simultaneously requires `loading-coverage.test.ts` to pass **with zero edits** and lists it in the
  `git diff --exit-code` verification, so the two instructions cannot both hold and the zero-edit
  requirement is the plan's own precedence signal.
- **Fix:** One `PanelSkeleton`, keeping its shipped label. The observed red and both closed shapes are
  written into the file so the next reader does not re-run the experiment. The disagreement the
  objective actually names — *the page draws no panel while its plate draws one* — is bought anyway,
  because the page draws panels now. Claiming the dominant region and letting the rest arrive is
  `(host)/host/earnings/loading.tsx`'s shipped arrangement.
- **Files modified:** `src/app/(app)/profile/loading.tsx`
- **Commit:** `8ac4823`
- **Unmet acceptance criterion, stated plainly:** `grep -c 'PanelSkeleton' loading.tsx` returns **2**,
  not the ≥3 the plan asks for, and the plan's must-have *"the plate renders two skeletons to match"*
  is not met. Every other criterion in that task passes, including the zero-edit one this trades
  against.

**2. [Rule 3 - Blocking] A comment quoting the tag its own gate counts**

- **Found during:** Task 1 acceptance greps
- **Issue:** `grep -c '<main'` on `page.tsx` must return 0, while the same file is required to explain
  that `BOOKING_SHELL` is a container and not a landmark. The comment quoting the element failed the
  grep that documents it — byte-for-byte the collision 15-06 hit four times and 15-07 three times.
- **Fix:** Named descriptively ("the one main landmark per document"), `booking-row.tsx:112`'s
  precedent, with an in-file sentence saying why the prose does not quote the tag.
- **Files modified:** `src/app/(app)/profile/page.tsx`
- **Commit:** `c8d89f5`

**3. [Rule 1 - Unsatisfiable criterion] `grep -c 'BOOKING_SHELL'` cannot return 1**

- **Found during:** Task 1 acceptance greps
- **Issue:** The criterion asks for **1** on each of `page.tsx` and `loading.tsx`. A file that reads a
  constant must both import it and use it, which is two lines. The shipped adopters measure the same:
  `bookings/[id]/cancel/page.tsx` and its plate both report **3**.
- **Fix:** Nothing to fix in the source — one import and one reader per file, which is what the plan's
  `key_links` edge actually specifies ("one `BOOKING_SHELL` import each — the duplication ends
  mechanically"). Both files report **2**. Recorded so the count is not read as drift.

---

**Total deviations:** 3 auto-fixed (2 × Rule 3 blocking, 1 × Rule 1 criterion correction). No Rule 4
situation arose; no architectural change was needed. No behaviour, action call shape, sentence, field
label or field membership moved.

## Deferred / Out of Scope (logged, not fixed)

- **`loading-coverage.test.ts`'s count-pin `it()` title reads "28 pages, 20 qualifying, 8 not, 20
  loading files"** while the constants beside it are **29 / 21 / 8**. A test whose own name is false —
  the defect class this phase exists to repair — but stale since before this plan, and this plan's
  verification block requires that file to be byte-identical. Handed forward to whichever plan next
  owns that file.
- **`(auth)/error.tsx`'s two false header claims** remain ownerless — flagged by 15-06 and re-flagged
  by 15-07. Not in this plan's file scope either. Now carrying three plans' worth of provenance.

## Issues Encountered

None that were regressions. `npm test` prints its standing containment banner about `recordAudit`
writing through the module-level db singleton — pre-existing, unrelated, and documented in the banner
itself.

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (run bare; the pipe-to-`tail` exit-code trap avoided) | exit 0 |
| `npm run test:design` | exit 0 — 52 files / **877 passed** / 3 skipped |
| `npx vitest run tests/profile/` | exit 0 — 2 files / **11 passed** |
| `npm test` (run alone, never beside the design suite) | 180 files / **1892 passed** / 5 skipped — the 15-03 baseline exactly |
| `git diff --exit-code tests/design/loading-coverage.test.ts tests/design/empty-state-adoption.test.ts src/lib/profile.ts` | exit 0 — all three unedited |
| `loading-coverage` pins | `EXPECTED_PAGES` 29 / `EXPECTED_QUALIFYING` 21 / `EXPECTED_NON_QUALIFYING` 8 — unmoved |
| `git diff --name-only e393d93..HEAD` | exactly the four files in `files_modified`, plus this summary |

**Acceptance greps.** `page.tsx`: old container 0 · `text-2xl` 0 · `PageHeader` 2 · `<main` 0 ·
`redirect("/login")` 1 · `publicProfile` 1 (its pre-task value) · `BOOKING_SHELL` 2 (see deviation 3).
`loading.tsx`: old container 0 · `text-2xl` 0 · `PageHeader` 3 · `lede` 0 · `PanelSkeleton` 2 (see
deviation 1) · the "data-derived AND conditional" sentence present word for word.
`profile-form.tsx`: `PanelCard` 6 · `titleAs="h2"` 2 · `text-lg font-medium` 0 · `<section` 0 ·
heading-reference attribute 0 · `aria-label="Save state"` 1 · `variant="brand"` 0 ·
`variant="destructive"` 0 · `setTimeout` 0 · `aria-label="Upload avatar"` 1 · the 5 MB hint 1 · both
group sentences 1 each · `Remove|Delete` 0 · `role="alert"` 2 and `role="status"` 1, unchanged counts.

`EXPECTED_SURFACES` is **21**; the adopted half is **19**; `ALLOWED_RAW_CARD` still has **5** rows.

## Known Stubs

None. No placeholder value, empty-array data source, mock or "coming soon" copy was introduced. Every
sentence on the surface is the sentence that shipped before this plan.

## Threat Flags

None — no new network endpoint, auth path, file access pattern or schema change. The plan's five
registered threats are all held as written:

| Threat | How it was held |
|---|---|
| T-15-27 (session gate) | `page.tsx`'s session read and `redirect("/login")` are byte-identical (grep = 1); `publicProfile()` and `src/lib/profile.ts` are not in the diff |
| T-15-28 (private field leak) | Both panels keep exactly their shipped field membership — public: avatar, first name, About, city; private: last name, phone — and both D-09/D-10 sentences are byte-for-byte |
| T-15-29 (false save) | Zero `setTimeout`; `saved` set from the result and cleared on the next submit; `tests/profile/` drives the real `updateProfile` and passes untouched |
| T-15-30 (pre-empted removal control) | Accepted and asserted negatively: `Remove|Delete` = 0, the upload mechanism byte-identical |
| T-15-SC (package installs) | Zero installs. No `package.json` change |

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 15-09 (live regions) inherits one new declaration and one unchanged pair.** The saved line on
  `/profile` now resolves the name `Save state` (the wizard's precedent, reused verbatim). The profile
  form is OUT OF SCOPE for `src/lib/design/live-regions.ts` by that module's stated membership rule, so
  no row was added there; if 15-09 widens the membership rule to the profile form, the name is already
  the one `AUTHOR_NAMED_REGIONS` records for that string, and the two refusal regions are unchanged.
- **Plan 15-11 (baselines) inherits a surface whose geometry moved:** `/profile`'s container padding is
  now 32px mobile / 48px at `sm:`, its `<h1>` is 20px, and it draws two panels with a 24px gap. Any
  baseline taken before `c8d89f5` is stale.
- **Phase 16 (CROP-01/CROP-03) inherits an action row that is ready and empty.** The upload control,
  its accessible name and its hint are byte-identical; nothing was added beside them.
- **AUTHUI-02's remaining clause is avatar removal**, which is CROP-03's by REQUIREMENTS.md's own
  conflict note. The checkbox stays open.

---
*Phase: 15-auth-profile-transactional-email*
*Completed: 2026-08-24*
