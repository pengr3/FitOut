---
phase: 10-design-system-foundation-theme-runtime
plan: 08
subsystem: design-system
tags: [cva, button, brand-variant, touch-target, wcag, source-scan-gate, ds-08, ds-09]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    plan: 01
    provides: "`npm run test:design` — the DB-free Vitest gate this plan's second source scan joins (now 13 files / 216 tests, ~5s, no database)"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 03
    provides: "`--brand` and `--brand-foreground`, declared identically in both theme blocks — the tokens every converted call site now reaches through the variant instead of through a string"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 06
    provides: "THE contract this plan consumes: `variant=\"brand\"` with the darkening `color-mix` hover, and `size=\"touch\"` at 44px"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 07
    provides: "`tests/design/focus-recipe.test.ts` — the reference walker, the Windows path-normalisation idiom, and the guard-the-guard pattern this plan's gate copies"
provides:
  - "15 of DS-08's 20 conversions: zero `bg-brand` in any form under `src/app/(app)/bookings/**`, `src/components/booking/**`, `src/components/group/**` and `src/components/search/**`"
  - "DS-09's first two adopters — the RSVP and search CTAs express 44px as `size=\"touch\"` rather than a hand-rolled height"
  - "`tests/design/brand-recipe.test.ts` (8) — an exact per-file conversion map plus a brace-aware JSX tag extractor, which plan 10-09 extends with the host/availability half and the repo-wide totals"
affects: [10-09, 10-11, 10-13, 11, 17]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A per-file conversion MAP, not a bare total. A total of 15 is satisfiable by 15 conversions in the wrong eleven places; `toEqual(EXPECTED_CONVERSIONS)` is not. This is T-10-39's mitigation and it costs one object literal."
    - "Assert PER ELEMENT when the file legitimately contains counter-examples. Both touch sites keep other 44px heights on `<Input>`/`<SelectTrigger>` primitives that expose no size variant, so a file-level 'contains no height class' assertion would be policing controls the contract cannot reach — and is unsatisfiable as the plan wrote it."
    - "A JSX tag extractor has to track brace depth: one converted call site carries an arrow function in its props, so 'read to the next >' cuts the tag in half at the arrow."
    - "Prove a suspect failure is pre-existing by checking the changed files out at the pre-plan commit and re-running, rather than by reasoning about whether a class-string edit could plausibly cause it."

key-files:
  created:
    - tests/design/brand-recipe.test.ts
  modified:
    - src/app/(app)/bookings/[id]/page.tsx      # 3 conversions
    - src/app/(app)/bookings/page.tsx           # 2 conversions
    - src/components/booking/book-cta.tsx       # the canonical converted shape
    - src/components/booking/booking-row.tsx    # 1 conversion; cn() collapsed, stacking class preserved
    - src/components/booking/expired-approval-state.tsx   # 2 conversions
    - src/components/booking/hold-expired-state.tsx       # 1 conversion
    - src/components/booking/payment-reversed-state.tsx   # 1 conversion
    - src/components/booking/reserve-actions.tsx          # 1 conversion
    - src/components/group/create-group-button.tsx        # 1 conversion
    - src/components/group/rsvp-form.tsx                  # 1 conversion + size="touch"
    - src/components/search/search-bar.tsx                # 1 conversion + size="touch"
    - .planning/phases/10-design-system-foundation-theme-runtime/deferred-items.md  # D-6

key-decisions:
  - "The plan's count was RIGHT this time, and saying so is worth as much as 10-07 saying its count was wrong. The tree was widened before the number was trusted — 29 accent-background source lines, 20 on a `<Button>`, 15 owned here, 5 owned by 10-09, 9 non-Button — and every one of those figures was measured against the tree rather than read from the plan."
  - "Three of this plan's acceptance criteria cannot be satisfied as literally written, and two of them contradict each other inside the same task. Documented rather than quietly reinterpreted."
  - "The `h-11`-must-be-zero criterion was replaced with a PER-ELEMENT assertion, because the per-file form asserts something untrue about `<Input>` and `<SelectTrigger>`."
  - "Six e2e tests fail, and all of them were proven PRE-EXISTING by re-running against the pre-plan tree. Logged as D-6, not fixed."
  - "DS-08 and DS-09 both stay Pending — plan 10-09 owns the remaining 5 conversions, and DS-09's 'standard for booker-facing primary actions' clause is nowhere near satisfied by two adopters."

patterns-established:
  - "`enclosingButtonTag()` — a brace- and quote-aware JSX opening-tag extractor, ~20 lines, which turns 'this file contains a prop' into 'this ELEMENT carries this prop'. Reusable by any later plan asserting a variant and a size land on the same control."
  - "A partial gate NAMES its own boundary in the header, including what it deliberately does not police (here: the 9 non-Button accent recipes, the accent budget, and pixels)."

requirements-completed: []

# Metrics
duration: 39min
completed: 2026-08-12
---

# Phase 10 Plan 08: The Booker-Surface Brand Conversion Summary

**The 15 call sites the core value runs through — search, book, pay, invite — stop repeating a hover that measures 4.04:1 and take their accent from one variant instead; pinned by a gate that asserts an exact per-file map and was watched go red**

## Performance

- **Duration:** ~39 min
- **Started:** 2026-08-12T00:24 (+08)
- **Completed:** 2026-08-12T01:03 (+08)
- **Tasks:** 3 (`auto`, no checkpoints)
- **Files:** 1 created, 12 modified

## The count — measured against the tree, not read from the plan

10-07's central lesson was that its plan's literal grep was structurally incapable of seeing 3 of its 14 real sites. So the first thing this plan did was widen, before touching anything:

| Widening | Result |
|---|---|
| `bg-brand` anywhere under `src/` | 33 lines — 29 real call sites, plus the variant itself in `ui/button.tsx` and 3 PROSE references in `src/lib/design/contrast-pairs.ts` |
| any other spelling of the accent in the four owned trees (`bg-[var(--brand)]`, `buttonVariants(...)` composed by hand) | **none** — the only `buttonVariants()` consumer in the repo is `ui/calendar.tsx`, and it passes no brand variant |
| every `h-11` under `src/` | 47 lines across 17 files — which is what exposed the unsatisfiable acceptance criterion below |

The plan's arithmetic held exactly: **29 = 20 `<Button>` + 9 non-Button**, of which **15 are owned here** and 5 by 10-09. The nine that must NOT be converted were confirmed one by one as `data-[selected-single=true]:`- and `data-[state=on]:`-scoped recipes on react-day-picker and Radix primitives — the availability calendar's day, the date-pass picker's day, the slot picker's chip / full-day chip / notice panel, the spots-left chip, the notification dot, and the wizard's two step markers. None is a `<Button>` with a variant prop; converting any of them would have broken the two surfaces the whole booking flow is built around.

Final measured state:

| Metric | Before | After |
|---|---|---|
| `bg-brand` occurrences under the four owned trees | 15 | **0** |
| `variant="brand"` under the four owned trees | 0 | **15** (per-file map pinned) |
| `size="touch"` adopters anywhere in `src/` | 0 | **2** |
| design tests | 208 | **216** |

## Accomplishments

- **The 4.04:1 / 3.87:1 hover is gone from every surface the core value runs through.** Search, book, pay, invite — fifteen call sites each independently shipped `hover:bg-brand/90`, and the failure is a property of the alpha rather than of any one element: a tint over a light surface *lightens*, moving a filled control toward its own text colour. `--brand-foreground` on a 90%-alpha brand measures **4.04:1 in court and 3.87:1 in grove** against a 4.5 bar. The recipe now lives once, in `ui/button.tsx`, as a `color-mix` toward `--foreground` that darkens instead: **5.41 / 5.36**. No converted call site carries a colour class at all.
- **The gate asserts a MAP, not a total** (T-10-39). Fifteen near-identical edits across eleven files is precisely where a find-and-replace converts one site twice and another not at all — and a bare `toBe(15)` is satisfied by exactly that. `expect(scan.conversions).toEqual(EXPECTED_CONVERSIONS)` names all eleven files and their counts, so a mis-aimed conversion fails with a diff that points at the file.
- **The touch assertion is per ELEMENT, which is what makes it true.** One of the converted call sites carries `onClick={form.handleSubmit((v) => onSubmit(v, "yes"))}`, so a naive "read to the next `>`" extractor cuts the tag in half at the arrow. `enclosingButtonTag()` tracks brace depth and quote state and returns the real opening tag; the assertion then says *this element* carries `size="touch"` and hand-rolls no height beside it. That distinction is not pedantry — it is the difference between an assertion that holds and the one the plan asked for, which does not (below).
- **The rendered controls are byte-identical where they should be.** `size="touch"` is `h-11 gap-1.5 px-4`, but `search-bar`'s CTA shipped `gap-2 px-6`. Because `cn()` runs tailwind-merge with the call-site `className` last, keeping those two classes explicitly preserves the exact control that shipped — verified in the build, and the reason is written next to them rather than left for the next reader to rediscover. `rsvp-form`'s CTA is `flex-1` in a two-button row, so its padding change is invisible by construction; its sibling was deliberately left alone, since converting it would break the same task's `size="touch"` count.
- **`booking-row.tsx`'s shared line was handled without stepping on 10-13.** That one line carried both the accent and a stacking class 10-13 will remap onto a z-index token. The stacking class is untouched and still measures exactly 1 occurrence. Removing the colour string collapsed its two-argument `cn()` to a single literal, so the call and its now-unused import went too.
- **The gate was watched go red, with the correct blast radius.** The literal recipe reinstated on `create-group-button.tsx` → **exit 1, 3 failed / 5 passed**, on exactly the three assertions that should care: the adoption total (14), the per-file map, and the banned-accent scan, which reported both offending strings by name. Reverted → **exit 0, 8 passed**. Both observations are recorded in the test file's header, as the plan required.
- **216/216 design tests green** (was 208), ~5s, **no database**. `npx tsc --noEmit` exit 0, `npm run build` exit 0, `npm run lint` 0 errors / 9 warnings — byte-identical to the 10-04 through 10-07 baselines. The full DB suite is **1197 passed / 4 skipped / 0 failed**.
- **The regression watch holds.** `tests/booking/partial-grant-notice.test.tsx:192` asserts a `className` does *not* contain the accent background; re-run against the real database after the change — **13/13 green**, and `[test-db] clean: no writes escaped the per-file schema isolation`.

## The three acceptance criteria that could not be met as written

Documented rather than quietly reinterpreted, following 10-07's precedent.

| Criterion | What is actually true |
|---|---|
| Task 3: *"`grep -c 'h-11' <rsvp-form> <search-bar>` returns 0 for each file"* | Returns **4** and **7**. Every remaining occurrence is on an `<Input>` (3), a `<SelectTrigger>` (4) or an out-of-scope `<Button>` (4) — **none of which has a `touch` size to opt into**. Satisfying it literally would require inventing the size on two more primitives and converting four buttons this plan does not own, which would then break the *same task's* criterion that `size="touch"` appears exactly once per file. The two criteria are mutually exclusive. Resolved by asserting per element instead: the brand control at each site carries the named size and no hand-rolled height. |
| Task 1: *"`grep -c 'Book this space' book-cta.tsx` returns 1 (copy preserved)"* | Returns **2**, and returned 2 at `HEAD` before any edit — the file's header comment names the control it renders. The criterion's *intent* holds exactly: the rendered label at `:225` is verbatim, as are "Confirm & pay", "Invite people", "Starting…", "Taking you to checkout…" and "Setting up…". Same shape as Task 3's `"Invite people"` criterion, which also returns 2 for the same reason. |
| Task 3: *"exits 0 with at least 5 passing assertions"* | Exits 0 with **8**. |

## The grep-versus-comment collision, seventh occurrence — self-inflicted, and instructive

STATE.md records this as a six-time pattern. It recurred here in a new way: **the collision did not exist until I wrote it.** Task 2 requires `grep -c "z-10" booking-row.tsx` to return 1, and adding a comment explaining *why* that stacking class must survive 10-13 immediately made it 2.

Resolved by the standing rule — the class is described (*"the stacking class on the CTA below"*), never quoted — and the comment now says *why it is phrased that way*, so the next editor does not helpfully paste the literal back in and break a committed count with a documentation improvement. The same rule shaped the two comments added beside the touch CTAs: they describe a 44px height rather than quoting the class, because a sibling gate asserts that class is absent from those elements.

The test file itself carries every banned literal verbatim, which is safe and deliberate: its walker roots at `src/`, and `tests/` is outside the scanned tree. A file whose job is to ban a string has to be allowed to name it.

## Task Commits

1. **Task 1: The booker routes and the canonical CTA** (6 conversions) — `5a6f654` (refactor)
2. **Task 2: The five booking state components** (6 conversions) — `8cba322` (refactor)
3. **Task 3: Group, search, the two touch sizes, and the booker-tree gate** (3 conversions + the gate) — `ebac866` (feat)

**Plan metadata:** see the `docs(10-08)` commit that carries this file.

## Files Created/Modified

- **`tests/design/brand-recipe.test.ts` — created.** 8 assertions across 3 `describe` blocks, from a single module-level scan of every `.ts`/`.tsx` file under `src/`. `.css` is deliberately *not* collected, unlike 10-07's walker: the accent recipe never lived in the stylesheet — `globals.css` declares `--brand` as a token and never composes a background utility from it. The banned-accent regex matches the token itself rather than the one broken spelling, so `/95` and `/85` — one plausible typo away and equally broken — cannot slip through, and a re-introduction arriving in a `data-[…]:`- or `hover:`-scoped position is caught too. The header names four real blind spots, including one that matters more than the rest: **nothing here counts how much coral a screen shows**, so `variant="brand"` on every button in the app would pass every assertion below while destroying the 10% budget D-21 exists to protect.
- **The eleven call-site files — modified.** Every one is a props edit: the colour classes leave `className`, `variant="brand"` joins the element, and every layout class stays. Two `className` props emptied entirely and were removed rather than left as `className=""`. `asChild`, `size="sm"`, `size="lg"`, `disabled`, `aria-disabled`, `type` and `id` are all preserved untouched.
- **`deferred-items.md` — modified.** New item **D-6**, below.

## Decisions Made

- **No requirement is marked complete.** DS-08's wording covers all 20 `<Button>` recipes and this plan lands 15; the host tree's 5 are 10-09's. DS-09 says `touch` *"is the standard for booker-facing primary actions"* — two adopters is not a standard. Marking either complete here would let the phase's traceability table describe a contract that is 75% and 10% adopted as finished.
- **The nine non-Button recipes were confirmed individually, not assumed.** The plan asserts they must not be converted; the risk of a mechanical sweep is that the assertion is read and then the sweep runs anyway. Each was opened and identified by its scoping prefix before any edit, and the gate asserts nothing about them — deliberately, and it says so in the header.
- **`rsvp-form`'s sibling "Can't make it" button was left at its hand-rolled height.** It sits beside a converted CTA, both `flex-1`, so the visible result is two 44px controls either way. Converting it would have been the tidier-looking edit and would have broken the same task's `size="touch"` count, which is the plan's own way of scoping D-22 adoption to what it can measure.
- **The e2e failures were investigated to a verdict rather than reported as noise.** Six tests fail. The instinct — "class-string edits cannot break a booking flow" — is exactly the reasoning that lets a real regression through, so it was tested instead: the eleven modified files were checked out at the pre-plan commit `ffbf6b5`, the same specs re-run, and the failures reproduced with a byte-identical signal. Only then were they logged as pre-existing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A JSX comment placed in an expression position broke the build**

- **Found during:** Task 2
- **Issue:** The explanatory comment added above `booking-row.tsx`'s converted CTA was written as the first element of a ternary branch (`{cond ? ( {/* … */} <Button …>`). A `{/* … */}` comment is only valid in JSX *children* position, so `tsc` reported 7 syntax errors across the rest of the file.
- **Fix:** Comment moved above the ternary, into children position. Caught by the task's own `npx tsc --noEmit` criterion before commit.
- **Files modified:** `src/components/booking/booking-row.tsx`
- **Committed in:** `8cba322`

**2. [Rule 3 - Blocking] The comment explaining a preserved class broke the criterion asserting that class appears once**

- **Found during:** Task 2
- **Issue:** Seventh occurrence of this phase's recurring collision, and the first that was self-inflicted: `grep -c "z-10" booking-row.tsx` must return 1, and the comment explaining why that class must survive 10-13 made it 2.
- **Fix:** The class is named descriptively, never quoted, per STATE.md's standing resolution — and the comment records *why* it is phrased that way so the next editor does not undo it with a documentation improvement.
- **Files modified:** `src/components/booking/booking-row.tsx`
- **Verification:** the criterion returns 1, matching its pre-plan value.
- **Committed in:** `8cba322`

**3. [Rule 3 - Blocking] Two acceptance criteria in Task 3 are mutually exclusive**

- **Found during:** Task 3, inventorying every 44px height in the tree before editing
- **Issue:** *"`grep -c 'h-11'` returns 0 for each file"* and *"`grep -c 'size=\"touch\"'` returns 1 for each file"* cannot both hold: the remaining heights sit on `<Input>` and `<SelectTrigger>` primitives with no size variant, and on four out-of-scope `<Button>`s whose conversion would push the touch count to 2 and 3.
- **Fix:** The gate asserts per element — the brand control at each site carries `size="touch"` and hand-rolls no height — via a brace-aware JSX tag extractor. The per-file counts are reported honestly above rather than forced.
- **Files modified:** `tests/design/brand-recipe.test.ts`
- **Committed in:** `ebac866`

**4. [Rule 1 - Bug] A dead single-argument `cn()` and its unused import**

- **Found during:** Task 2
- **Issue:** `booking-row.tsx`'s CTA merged two class strings through `cn()`; removing the colour string left `cn("relative z-10 w-full")` — indirection that merges nothing, plus an import that exists only to serve it.
- **Fix:** Both removed. `cn` had no other use in the file, verified before deleting the import.
- **Files modified:** `src/components/booking/booking-row.tsx`
- **Committed in:** `8cba322`

### Out of Scope — Logged, Not Fixed

**deferred-items.md D-6 — six e2e failures, all proven pre-existing.** One root cause in `e2e/open-capacity.spec.ts` (the drop-in day panel does not follow the picked day; its describe block is SERIAL, so that single failure skips four siblings and reads far wider than it is), one strict-mode violation in `e2e/search-and-book.spec.ts:296` (the FIT booking reference resolves to two elements after a reload — worth answering, since it guards the D-43 durable-confirmation promise), and one intermittent `e2e/cancel.spec.ts:224` whose server log shows a PayMongo 404 on a synthetic seeded payment id. **Proven, not assumed:** the eleven modified files were checked out at `ffbf6b5` and the specs re-run, producing an identical `2 failed / 6 did not run / 1 passed`. Not fixed, per the scope boundary — none is a design-system concern, and the drop-in picker's own component test is green in the 1197-test suite.

---

**Total deviations:** 4 (2× Rule 1, 2× Rule 3). No Rule 4 checkpoint was needed — every edit was a props change inside files this phase already owns.

## Known Stubs

None. Every converted call site resolves through `variant="brand"` to `--brand` / `--brand-foreground`, which 10-03 declares identically in both theme blocks and `contrast.test.ts` already measures. No placeholder, no empty data path, no deferred wiring.

## Threat Flags

None. This plan deletes class strings and adds props — no network endpoint, auth path, file access pattern or schema at a trust boundary was touched. T-10-24 (the `bg-brand/90` ban) and T-10-39 (mechanical multi-file conversion) are both now mitigated by the committed gate, exactly as the register specified. T-10-40 (`booking-row.tsx`'s shared line) was accepted rather than mitigated, and its acceptance criterion — the stacking class survived — holds.

## Verification Evidence

| Check | Result |
|---|---|
| `npm run test:design -- brand-recipe` | **8/8 passed**, 0.34s |
| Negative-guard RED check (literal recipe reinstated on `create-group-button.tsx`) | **exit 1, 3 failed / 5 passed**, on exactly the three assertions that should care — reverted, **exit 0, 8 passed** |
| `npm run test:design` (full gate) | **216/216 passed** (was 208), ~5s, **no database** |
| `variant="brand"` across the four owned trees | **15**, per-file map exact (3/2/1/1/2/1/1/1/1/1/1) |
| `bg-brand` in any form across the four owned trees | **0** (was 15) |
| `size="touch"` in `rsvp-form.tsx` / `search-bar.tsx` | 1 / 1, each on the same element as the brand variant |
| `grep -c "z-10" booking-row.tsx` | **1** — unchanged from its pre-plan value |
| `grep -c 'className=""'` across all 11 modified files | 0 |
| shipped copy | "Book this space", "Confirm & pay", "Invite people", "Starting…", "Taking you to checkout…", "Setting up…", "Yes, I'm coming", "Pay now", "Find a space", "Find another space", "Find another time", "Back to availability", "Request these times again", "Search" — all verbatim |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0 |
| `npm run lint` | 0 errors, 9 warnings (unchanged baseline) |
| `npm run db:up && npm run db:test:setup && npm test` | **1197 passed / 4 skipped / 0 failed** (132 files) |
| `npx vitest run partial-grant-notice` (regression watch) | **13/13**; `:192`'s negative assertion still holds; no writes escaped schema isolation |
| `npm run test:e2e` | 15 passed / 6 skipped (serial cascade) / **2 failed** — both, plus the 4 skips and an intermittent third, **verified pre-existing** by re-running against `ffbf6b5`. Logged as D-6. |

## Self-Check: PASSED

- `tests/design/brand-recipe.test.ts` exists on disk; all 11 modified source files exist and carry `variant="brand"` at the asserted counts.
- Commits `5a6f654`, `8cba322`, `ebac866` all present in `git log`.
- No file deletions in any of the three commits (`git diff --diff-filter=D` empty for each).
- Working tree clean after the pre-plan comparison runs — every temporarily reverted file restored to its committed content and re-verified at zero accent backgrounds.
