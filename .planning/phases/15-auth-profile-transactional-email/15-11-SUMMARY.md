---
phase: 15-auth-profile-transactional-email
plan: 11
subsystem: design-system
tags: [visual-regression, playwright, baselines, inventory, compile-gate, ci, checkpoint]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-06's D-162 composition — the wordmark-above-one-card `(auth)` layout whose arrival made `auth-login`'s committed hook name a departed element"
  - phase: 15-auth-profile-transactional-email
    provides: "plans 15-07/15-08's four auth pages and `/profile`, each rendering the `panel-card` container this inventory now hooks"
  - phase: 11-shell-and-navigation
    provides: "GATE-01's declared-inventory idiom, `baselines.yml` as the single sanctioned write path (D-27/D-28), and the `auth-login` row this plan edited rather than added"
provides:
  - "`SURFACE_IDS` 37 → 41: `auth-signup`, `auth-forgot`, `auth-reset`, `profile`"
  - "`VISUAL_BASELINES` 66 → 74, of which 38 blocked and 36 shootable — the first time the shootable count has moved since Phase 12"
  - "`auth-login` rewritten for D-162: hook, `hookWhy` and both rows' `why` strings"
  - "`BaselineCountIsSeventyFour`, with its red observed UNFORCED and quoted verbatim"
  - "an inventory two committed PNGs are now provably stale against, and a dispatch that must REPLACE them"
affects: [visual-regression, ci, 15-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A declared row EDITED rather than re-added when the surface it names already exists — the arithmetic mistake a five-row spec table invites against a four-surface addition"
    - "A retired guarantee stated as retired, with where it MOVED to, rather than carried forward as prose nothing checks"
    - "A compile gate's runtime twin moved in its own commit, so the first commit's diff matches the acceptance criterion that names one file"

key-files:
  created: []
  modified:
    - "src/lib/design/visual-baselines.ts"
    - "e2e/visual/surfaces.spec.ts"

key-decisions:
  - "`profile`'s two rows are BLOCKED, not `blocked: null`: `DRIVES` has no entry, and `/profile` redirects to `/login`, which renders a `panel-card` and therefore SATISFIES the hook — so the usual reachability protection is absent on exactly this row"
  - "`auth-login`'s DB-free claim is retired rather than re-made — the property moved to the four routes' `○ Static` build marker, which fails in `npm run build` on every machine"
  - "`auth-login` re-argued and KEPT in the four `THEME_SWAP_SURFACES`, with the reason written next to the set; removing it would have cost a second `THEME_SWAP_EXCLUSIONS` row against a gate pinning that list at one"
  - "15-UI-SPEC's 37 → 42 / 66 → 76 is wrong and its own hedge said to measure; the truth is 37 → 41 and 66 → 74 plus one edited row pair"
  - "AUTHUI-03 NOT ticked — its text ends '…and a baseline', and no baseline exists until the Task 2 dispatch runs"

patterns-established:
  - "State a block's shot/blocked split at the TOP of the block rather than leaving it to be summed from `blocked` strings (the Phase-14 honesty convention, applied to a block that is mostly NOT blocked)"
  - "When a second literal in a second file guards a count, say in both files that it is a `const` and therefore invisible to `tsc`"

requirements-completed: []
requirements-advanced: [AUTHUI-03]

# Metrics
duration: 10min
completed: 2026-08-25
---

# Phase 15 Plan 11: The Visual-Baseline Inventory Summary

**The inventory now describes the composition that actually ships — `auth-login`'s hook moved off a header that left the layout in 15-06, four surfaces and eight rows arrived court-only, and `BaselineCountIsSixtySix` became `BaselineCountIsSeventyFour` after its red was watched — and the one row that cannot be shot honestly says what it needs.**

## Status: CHECKPOINT — Task 2 awaits the operator

Task 1 is complete, committed and green. Task 2 is a `checkpoint:human-action` that was **not attempted and not faked**: baseline regeneration is structurally impossible on this machine, and the plan says so in advance.

| Task | Name | Type | Status | Commit |
| ---- | ---- | ---- | ------ | ------ |
| 1 | Edit two rows, add eight, move one alias | auto | ✅ complete | `1a65faf` |
| — | (Rule 3 deviation: the runtime twin) | auto | ✅ complete | `46b491d` |
| 2 | Dispatch the baseline generation in CI | checkpoint:human-action | ⏸ **awaiting operator** | — |

## Performance

- **Duration:** ~10 min (00:09 → 00:19, 2026-08-25 local)
- **Tasks:** 1 of 2 (the second is a blocking checkpoint)
- **Commits:** 2

## What Changed

### `auth-login` was EDITED, not left standing — three false claims and a dead selector

The row's hook was `[data-testid="site-header"]`. Plan 15-06 (D-162) took the public header composition out of `src/app/(auth)/layout.tsx` and put a wordmark above one card on `bg-muted`. From that commit forward the hook named an element the page does not render, so this surface was **a scheduled timeout, not a drift** — the reachability assertion would have failed the whole run rather than silently comparing the wrong picture.

Four strings were rewritten:

| What | Was | Now |
| ---- | --- | --- |
| `hook` | `[data-testid="site-header"]` | `[data-testid="panel-card"]` |
| `hookWhy` | "renders `PublicHeader` + `SiteFooter`; the header is the composition…" | the card on the quiet ground, plus an explicit retirement of the DB-free sentence |
| 320 row `why` | "the `(auth)` shell at the floor: `PublicHeader` + the form card + `SiteFooter`" | the wordmark, one card, the footer — the width where `max-w-sm` stops constraining |
| 1280 row `why` | "the header's auth slot resolved to the anonymous cluster" | the same three elements with the ground as most of the frame |

The row **count** for `auth-login` stayed at 2, which is the point: 15-UI-SPEC's table has five rows and this plan is four additions plus one edit.

### The retired claim, and where it went

The old `hookWhy` made a second, real claim: the header hook *"fails loudly if the anonymous session read ever starts reaching the database, which would take this surface out of the DB-free scope silently."*

That claim **does not survive the new hook** and is deliberately not re-made. A `PanelCard` the page renders unconditionally cannot fail on a database read, so carrying the sentence forward would have left a guarantee nothing checks — the exact shape this file's own header calls worse than no gate at all.

The property did not disappear; it **moved**. All four `(auth)` routes now build `○ Static` (15-06 measured the flip), a request-time database read is precisely what would flip one to `ƒ Dynamic`, and that marker is asserted per route in `tests/design/loading-coverage.test.ts`. That is the stronger of the two instruments: it fails inside `npm run build` on every machine, not only inside the one Linux job that shoots baselines. The row says all of this in its own prose.

### Four surfaces, eight rows, and the split stated at the top

`auth-signup`, `auth-forgot`, `auth-reset`, `profile` — added under a Phase-15 banner in the existing block style, with the shot/blocked split declared at the top of the block rather than left to be summed from two `blocked` strings.

| Surface | URL | Widths | Blocked? |
| ------- | --- | ------ | -------- |
| `auth-signup` | `/signup` | 320, 1280 | `null` — anonymous static form |
| `auth-forgot` | `/forgot-password` | 320, 1280 | `null` — anonymous static form |
| `auth-reset` | `/reset-password?token=vrt-reset-token-fixture` | 320, 1280 | `null` — fixture literal, not a credential |
| `profile` | `/profile` | 320, 1280 | **BLOCKED** — two named needs |

`auth-reset`'s token is a **fixture literal that authenticates nothing**: the page reads `?token=` and seeds the shared reset schema with it, and the schema requires only non-emptiness client-side, so any literal renders the *form*. A tokenless visit renders the "this reset link is missing its token" notice — a different document, and the one the row would silently photograph if the query string were ever dropped. That risk is written into the 1280 row's `why`, because the notice renders inside the same card and would therefore **satisfy the hook**.

### `profile` is blocked, and the reason is that its hook does not protect it

This is the decision the plan called for an honest answer to. `e2e/helpers/visual-drive.ts`'s `DRIVES` map keys six surfaces and has no `profile` entry, so the row falls through to a plain unauthenticated `goto`. `/profile` redirects to `/login` — **and `/login` renders a `panel-card`**. So the ordinary protection is absent here: an undriven capture would not fail reachability, it would mint two baselines of the sign-in page, satisfy the hook, and pass forever. Permanent, silent and green, which is the identical failure the Phase-14 host block records nine times.

Its `blocked` string names both needs and, unusually, one **non**-need:

1. A `DRIVES` entry (out of Task 1's declared file scope).
2. A `vrt_%` seeded user with a fixed literal `createdAt`, fixed first/last name, and no avatar so the fallback initials are a function of the fixed name.
3. **No clock control is owed.** The member-since line is derived from `createdAt` and never from `now` (`src/app/(app)/profile/page.tsx:33-34`), so a literal in the seed makes the frame date-independent by construction — the `[14-16]` rule is satisfied by the fixture, and installing a clock would be ceremony that pins nothing. This is also why the row carries no time-bomb: no assertion in this plan seeds text from `now()`.

### The alias moved after its red was watched

With the eight rows in and the constraint still reading 66, `npx tsc --noEmit` (run **bare** — piping to `tail` reports tail's status) gave EXIT=2 and one line:

```
src/lib/design/visual-baselines.ts(2181,3): error TS2344: Type 'false' does not satisfy the constraint 'true'.
```

**UNFORCED**, like 13-15's and unlike 14-16's — it arrived in the ordinary course of adding rows rather than being staged, which is the only evidence that it fires when nobody is looking for it. Quoted verbatim, dated and attributed in the alias's own docblock, following the procedure that docblock already records. `BaselineCountIsSixtySix` → `BaselineCountIsSeventyFour`, `extends 66` → `extends 74`, restored to exit 0 in the same commit.

The standing weakness was observed for the third time and recorded again: the error names line 2181 — the alias's own line — and not one of the eight rows. That is why the arithmetic is spelled out in prose beside it.

### The theme contract: `auth-login` stays, deliberately

`THEME_SWAP_SURFACES` is unchanged and `ThemeContractSurfaceCountIsFour` is unchanged. What changed is that the decision is now **written down** next to the set, because `auth-login` is the one member of the four whose composition changed under it:

- The bullet's old text said "elevation (the auth card, **the header**)" — false as of 15-06, and now rewritten.
- The new composition is a **better** two-theme drift subject: a small brand-filled control and foreground ink on a card, on a large expanse of a semantic ground token. Four token families with almost no chrome in the way, and at 1280 the ground is most of the frame.
- It still satisfies the set's membership **rule** (a plain navigation — no drive, no minted row, no fixture date), which is the property a re-argument could have broken.
- Removing it would have been the expensive option: a surface leaving the set needs a `THEME_SWAP_EXCLUSIONS` row to be a decision rather than a deletion, and `ThemeSwapExclusionCountIsOne` pins that list at exactly one. `e2e/visual/theme-swap.spec.ts` is byte-identical (`git diff --exit-code` exits 0).

### The arithmetic, restated

| | Declared | Blocked | Shot |
| --- | --- | --- | --- |
| Before (Phases 11–14) | 66 | 36 | 30 |
| After (this plan) | **74** | **38** | **36** |

**36 shot is not 36 new files.** Six are new (`auth-signup`, `auth-forgot`, `auth-reset` × two widths) and **two REPLACE** `auth-login-320-court-visual-linux.png` and `auth-login-1280-court-visual-linux.png`, which are stale on disk right now. A dispatch that adds six and leaves those two standing means the hook edit did not take.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The compile gate's runtime twin was left stale by the plan's file scope**

- **Found during:** Task 1 verification, from the observed-red run itself
- **Issue:** `e2e/visual/surfaces.spec.ts` carries `EXPECTED_BASELINE_COUNT` and `EXPECTED_BLOCKED` as a *deliberate* second spelling of the same numbers — a second literal in a second file, so an edit to one without the other fails loudly. But they are `const`s, not types: `tsc` exited **0** with the count stale at 66 and `profile` absent from the blocked set. The plan's Task 1 scope is one file and its acceptance names one file, so nothing in the plan moved them.
- **Why this blocks Task 2 rather than being cosmetic:** `baselines.yml` runs `npx playwright test --project=visual --update-snapshots`, then stages, then commits. The stage and commit steps carry no `if: always()`. A failing inventory test exits the Playwright step non-zero, so **the dispatch would render every surface and commit nothing** — reported as a test failure rather than as a stale literal. Handing the operator a dispatch that cannot succeed is not a checkpoint, it is a wasted run.
- **Fix:** `EXPECTED_BASELINE_COUNT` 66 → 74; `EXPECTED_BLOCKED` gains one entry (`profile`, not four — the three auth surfaces are shootable, which is coverage won); the test title and failure message restated for five UI-SPECs; the `const`-invisible-to-`tsc` trap written into both files so the next person adding a row is told where the second place to look is.
- **Files modified:** `e2e/visual/surfaces.spec.ts`
- **Commit:** `46b491d` — kept **separate** so commit `1a65faf`'s diff is exactly the one file Task 1's acceptance names.

**2. [Rule 1 - Bug] A stale alias NAME in the file's own head prose**

- **Found during:** Task 1 acceptance greps
- **Issue:** `src/lib/design/visual-baselines.ts:51` names `BaselineCountIsSixtySix` in the compile-gates paragraph. Renaming the alias without it leaves the file's own introduction pointing at an identifier that no longer exists — which is byte-for-byte the failure that paragraph's own argument warns about (*"A gate whose name says 51 while its constraint says 66 is a gate that reads correct and is not"*), and `tsc` cannot see it because it is a comment.
- **Fix:** updated to `BaselineCountIsSeventyFour` in the same commit as the rename. Fixed inside Task 1's file, so no scope change.
- **Commit:** `1a65faf`

### No architectural deviations (Rule 4)

None. No package installs (the phase's threat register records T-15-SC as not applicable, and this plan installed nothing).

## Acceptance Criteria

| Criterion | Result |
| --- | --- |
| `grep -c 'BaselineCountIsSeventyFour'` returns 1 | ✅ 1 |
| `grep -c 'BaselineCountIsSixtySix'` returns 0 | ✅ 0 |
| `grep -c 'extends 74'` returns 1 | ✅ 1 |
| `SURFACE_IDS` contains the four new ids, and `auth-login` exactly once | ✅ 41 ids; `auth-login` appears once inside the array |
| `auth-login` hook is `[data-testid="panel-card"]`, `hookWhy` names the card | ✅ |
| Both `auth-login` `why` strings name the card composition; still exactly 2 rows | ✅ |
| `THEME_SWAP_SURFACES` still lists `auth-login` | ✅ unchanged, with the reason now written beside it |
| No change to `THEME_SWAP_EXCLUSIONS` / `ThemeSwapExclusionCountIsOne` | ✅ neither appears in the diff |
| Alias docblock quotes the observed red verbatim, dated, attributed | ✅ 25 August 2026, plan 15-11, UNFORCED |
| `profile` rows blocked with a string naming both needs | ✅ drive + seeded user, plus the explicit "no clock owed" |
| `npx tsc --noEmit` exits 0 | ✅ EXIT=0 |
| `npm run test:design` exits 0 | ✅ 54 files, 908 passed, 3 skipped — identical to the 15-10 close |
| `git diff --name-only` for Task 1 lists only `visual-baselines.ts` | ✅ commit `1a65faf` is one file |
| `git diff --exit-code e2e/visual/theme-swap.spec.ts` exits 0 | ✅ |

### One criterion measured differently from how it was written

`grep -c 'ThemeContractSurfaceCountIsFour' src/lib/design/visual-baselines.ts` is specified to return **1**. It returns **4** — and it returned **3** before this plan touched the file, so the criterion was already wrong when it was written. `grep -c` counts *lines*, and on a file that argues for its own invariants at length the identifier necessarily appears in the prose that explains it. This is precisely the measurement error `.github/workflows/baselines.yml`'s header records against itself (*"MEASURED: it shows 6 … the criterion's 1 is not"*, with the standing instruction **"Do not 'fix' the 6 by deleting the explanation"**). The load-bearing half of the criterion — that the alias still exists, that its constraint is still `4`, and that `auth-login` is still a member — holds and is asserted three ways: the compile alias, the members list in `theme-swap.spec.ts`, and `git diff` showing the array byte-identical. No prose was deleted to make a line count agree.

## Ungenerated Baselines — an inventory, never coverage

Following the Phase-14 convention (nine ungenerated baselines recorded as an explicit inventory) and 15-05's use of it for the blocked Outlook client. **This plan generated zero PNGs, and could not have generated one.**

- `.github/workflows/baselines.yml` is `workflow_dispatch`-only and is the only thing in this repository permitted to write a visual-regression baseline (D-27).
- `playwright.config.ts:39` constructs the `visual` Playwright project **only on Linux**. This machine is win32, so `npx playwright test --project=visual` selects a project that does not exist. A failure to construct it would be evidence of nothing, which is why it was not run.
- Baselines are platform-sensitive. Generating one here and committing it would be author-vs-CI drift dressed as coverage — the thing D-27 exists to make structurally impossible.

**Awaiting the dispatch (8 files):**

| File | State |
| --- | --- |
| `auth-login-320-court-visual-linux.png` | **committed and STALE** — must be REPLACED |
| `auth-login-1280-court-visual-linux.png` | **committed and STALE** — must be REPLACED |
| `auth-signup-320-court-visual-linux.png` | absent — expected from the dispatch |
| `auth-signup-1280-court-visual-linux.png` | absent — expected from the dispatch |
| `auth-forgot-320-court-visual-linux.png` | absent — expected from the dispatch |
| `auth-forgot-1280-court-visual-linux.png` | absent — expected from the dispatch |
| `auth-reset-320-court-visual-linux.png` | absent — expected from the dispatch |
| `auth-reset-1280-court-visual-linux.png` | absent — expected from the dispatch |

**Correctly producing nothing (2 rows):** `profile` at 320 and 1280, blocked. A dispatch that produces a `profile` PNG would be the finding, not a success.

## Requirements

**AUTHUI-03 is NOT ticked, and that is the honest reading.** Its text ends *"…and a baseline"*. Every prior plan in this phase recorded it as `requirements-advanced` and deferred the tick to this one on the assumption this plan would close it. It does not: this plan closes the *declaration* half and routes the *capture* half to a `workflow_dispatch` run that has not happened. A requirement whose last clause is "and a baseline" cannot be complete while the baseline is an absent file and two stale ones.

AUTHUI-01 is outside this plan's `requirements:` frontmatter and is untouched here.

EMAIL-03 remains untouched and unticked — it belongs to 15-05's open checkpoint.

## Deferred Issues

**1. `visual-baselines.ts`'s head paragraph is stale by two phases** — lines 36-40 read *"TWENTY-ONE OF THE 51 ROWS ARE BLOCKED … so a complete run commits 30 PNGs; anyone reading '51 baselines' as '51 files' is wrong by exactly those twenty-one."* The file has said 66 since plan 13-15 and now says 74, so this paragraph was already wrong by 15 rows before this plan opened the file. **Not fixed here:** it is pre-existing drift from 13-15/14-16, outside this plan's stated scope (*"Touch nothing else in the file"*), and the canonical arithmetic — which this plan DID update — lives in the alias docblock. Logged in `deferred-items.md`.

**2. `EXPECTED_BLOCKED`'s neighbouring prose still says "ONE ENTRY AS OF PLAN 12-14"** in `surfaces.spec.ts` — also pre-existing (the list has held 21 entries since 13-15). Logged.

Neither affects a gate: both are comments, and both counts they misstate are asserted correctly elsewhere in the same files.

## Threat Model

All five mitigations this plan owns are discharged in Task 1; the sixth is the checkpoint's.

| Threat | Disposition | Where discharged |
| --- | --- | --- |
| T-15-34 — a surface silently photographed as `/login` | ✅ mitigated | `profile` declared **blocked** with the drive need named, and with the specific sting that its hook would be *satisfied* by `/login` |
| T-15-35 — a stale baseline pinning a departed composition | ✅ mitigated in the declaration | hook + three prose claims rewritten; the PNG replacement is Task 2's, and the checkpoint requires blob-hash proof |
| T-15-36 — a pinned count moved ahead of its rows | ✅ mitigated | red observed UNFORCED, quoted verbatim at (2181,3), alias renamed in the same commit |
| T-15-37 — a baseline captured outside the pinned image | ✅ mitigated | nothing generated, nothing deleted, no screenshot hand-committed; routed to `workflow_dispatch` |
| T-15-38 — a generation run mistaken for a comparison run | ⏸ Task 2's | the checkpoint below demands the FOLLOW-UP run's id, not the generation run's |
| T-15-SC — package installs | n/a | zero installs |

## Threat Flags

None. This plan touched two declaration files and no network endpoint, auth path, file-access pattern or schema.

## Verification

```
npx tsc --noEmit                 EXIT=0
npm run test:design              54 files · 908 passed · 3 skipped   EXIT=0
git diff --exit-code e2e/visual/theme-swap.spec.ts                   EXIT=0
```

`npm test` and `npm run build` were **not** re-run: this plan changed two declaration modules and no runtime code path, `tsc` covers both files, and this box's measured back-to-back build/test interference (22 bogus failures) makes an unnecessary full run a source of noise rather than evidence. The 15-10 close recorded `npm test` at 181 files / 2037 passed and `npm run build` at 0; nothing here can move either.

⚠ **Treat the local green as silence, not evidence.** The Playwright `visual` project is not constructed on this machine, so nothing local can report a baseline mismatch in either direction.

## Commits

| Hash | Message |
| --- | --- |
| `1a65faf` | feat(15-11): the baseline inventory learns the composition 15-06 built |
| `46b491d` | fix(15-11): move the inventory's runtime twin with its compile gate |
| `e329d76` | docs(15-11): the inventory summary, at the Task 2 dispatch checkpoint |
| `f8af1bf` | docs(15-11): log the two pre-existing stale count paragraphs as deferred |
| `362fb89` | docs(15-11): record the inventory plan and its open dispatch checkpoint |

## Self-Check: PASSED

- `src/lib/design/visual-baselines.ts` — FOUND (modified, committed in `1a65faf`)
- `e2e/visual/surfaces.spec.ts` — FOUND (modified, committed in `46b491d`)
- `.planning/phases/15-auth-profile-transactional-email/15-11-SUMMARY.md` — FOUND (`e329d76`)
- `.planning/phases/15-auth-profile-transactional-email/deferred-items.md` — FOUND (`f8af1bf`)
- commits `1a65faf`, `46b491d`, `e329d76`, `f8af1bf`, `362fb89` — all FOUND

Working tree carries only the three pre-existing entries this plan was told to leave alone
(` M .planning/config.json`, `?? .claude/`, `?? .planning/phases/13.1-…/.gitkeep`).
