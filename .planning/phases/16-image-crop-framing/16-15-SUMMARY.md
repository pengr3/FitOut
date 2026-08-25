---
phase: 16-image-crop-framing
plan: 15
subsystem: testing
tags: [gate-resp, gate-vrt, overflow-320, visual-baselines, vacuity, scroll-lock, d-138, checkpoint-pending]

# Dependency graph
requires:
  - phase: 16-image-crop-framing
    plan: 06
    provides: "`CoverFramePreview` — the second surface this phase shipped, and the plan that named 16-15 as the one carrying its GATE-RESP / GATE-VRT clauses"
  - phase: 16-image-crop-framing
    plan: 11
    provides: "the crop dialog's shipped composition at the `dvh`-capped stage, which is what the new 320px row measures"
  - phase: 16-image-crop-framing
    plan: 14
    provides: "the stage re-measure fix (`7dca510`) — every geometry reading in this plan post-dates it — and `AVATAR_CROP_TITLE` as the string the new row's `tell` imports"
provides:
  - "A 21st row on the AC#29 table: `/profile` with the crop dialog OPEN, at both themes, through the existing `open` seam"
  - "`expectNoOverflowWithin` — the overlay measurement, added because the document one was measured INCAPABLE of failing while a modal is open"
  - "Two court-only VRT surfaces (`avatar-crop-dialog`, `wizard-cover-preview`) with four rows, both BLOCKED with argued reasons"
  - "Both baseline-count literals moved in ONE commit — and a THIRD pin (`EXPECTED_BLOCKED`) that the alias's own docblock does not name"
  - "Three measured findings raised rather than absorbed: D9 (the 12-10 sheet row measures nothing), D10 (the cover preview has no 320px row), and the `VISUAL_BASELINES` docblock stale by three phases and by D-138"
affects: [16-16 the CROP-04 hardware walk, Phase 17's audit, 16.1 upload hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Probing the MEASUREMENT for vacuity, not just the reachability hook: a correct `tell` proves the row is looking at the right surface and says nothing about whether the assertion behind it can fail"
    - "Scoping an overflow scan to an overlay's own box, with the ancestor walk stopping AT the scope — the element doing the hiding must not be allowed to count as a clip"
    - "Rewriting a stale count table FROM the array it describes (surface + width extracted and tallied) rather than from any prose that claims to summarise it"

key-files:
  created:
    - .planning/phases/16-image-crop-framing/16-15-SUMMARY.md
  modified:
    - e2e/overflow-320.spec.ts
    - e2e/helpers/overflow.ts
    - src/lib/design/visual-baselines.ts
    - e2e/visual/surfaces.spec.ts
    - .planning/phases/16-image-crop-framing/deferred-items.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "THE NEW ROW'S MEASUREMENT WAS VACUOUS AS SPECIFIED, and the fix is in this plan. A Radix modal locks body scroll — `<body>` computes `overflow: hidden` — which retires all three of `expectNoOverflow`'s clauses at once. A 500px div injected into the open crop dialog produced `scrollWidth 320` and `offenders: []`; the row PASSED. `expectNoOverflowWithin` scoped to the overlay's own box reports 532 against 320 and 14 named offenders on the same mutation."
  - "BOTH new VRT surfaces are BLOCKED, decided by reading `visual-drive.ts` and `seed-baseline-fixtures.ts` rather than guessed. `avatar-crop-dialog` inherits `profile`'s two blockers and adds a staged file; `wizard-cover-preview` inherits the Phase-14 host block's one structural blocker and adds a walk to a client-state step."
  - "`wizard-cover-preview` needs NO photo fixture and NO Cloudinary round trip — the seed already commits eight `listing_photo` rows for `vrt_listing_exclusive` with local urls, and both the tiles and the preview render `photo.url`. Stated at the row because it is the assumption a reader will arrive with."
  - "CROP-02 stays PENDING. Its GATE-VRT clause is discharged as a declaration; its GATE-RESP clause is NOT — the cover preview has no 320px row and the existing wizard row structurally cannot reach it (D10)."
  - "The 12-10 booking-sheet row is left UNTOUCHED and raised as D9. Turning the scoped clause on for it may produce a real red on a Phase-12 surface, which is a finding somebody should be watching for rather than something to discover inside a gate plan's own verification run."
  - "The `VISUAL_BASELINES` docblock was rewritten rather than amended: it read `TOTAL 53` against an array of 74, and every number in it was a pre-D-138 TWO-THEME number. Three plans added rows below it and moved only the alias's docblock."
  - "`grep -c \"SeventyFour\"` returns 1, not the 0 the plan's acceptance asks for, and the one occurrence is correct: it is inside plan 15-11's dated OBSERVED-RED record (`Renamed to …IsSeventyFour and moved to 74`). Rewriting a historical measurement to satisfy a grep would be the falsification the record exists to prevent."

patterns-established:
  - "Two-direction vacuity probing for a gate row: prove the WRONG hook passes in the state you are adding, then prove the RIGHT hook fails without the interaction — and then do the same for the assertion behind the hook"

requirements-advanced: [CROP-02]
requirements-completed: []

# Metrics
duration: ~1h45m
completed: 2026-08-26
---

# Phase 16 Plan 15: GATE-RESP and GATE-VRT for the two new surfaces — Summary

**The 320px row this plan was chartered to add would have been unable to fail: a Radix modal locks body scroll, and a 500px-wide element injected into the open crop dialog produced `scrollWidth 320` and an empty offender list. The row ships with a second, scoped measurement that reports 532 against 320 on the same mutation — and the pre-existing booking-sheet row, which has had the same hole since plan 12-10, is raised rather than quietly patched.**

## Performance

- **Duration:** ~1 h 45 m
- **Started:** 2026-08-26T00:05Z (local +08)
- **Completed:** 2026-08-26T00:50Z (local +08)
- **Tasks:** 2 of 3 complete; **Task 3 is a BLOCKING operator checkpoint** and is open
- **Files:** 1 created, 6 modified (2 of them `.planning/`)

## Task Commits

| # | What | Commit | Type |
|---|---|---|---|
| 1 | **Task 1** — the crop-dialog-open row at 320px, plus the overlay measurement it needed | `8febb80` | test |
| 2 | **Task 2** — two court-only VRT surfaces, four rows, and BOTH count literals moved together | `a514061` | feat |
| — | this SUMMARY, D9/D10, and CROP-02's honest status | *(final commit)* | docs |
| 3 | **Task 3** — the CI dispatch | **OPEN — operator** | — |

---

## The plan's two measured corrections, re-confirmed in this tree

**1. The duplicated baseline-count literal is NOT in `.github/workflows/baselines.yml`.** Re-measured here rather than inherited:

| command | result |
|---|---|
| `grep -n "74" .github/workflows/baselines.yml` | **no output, exit 1** |
| `grep -n "BASELINE\|74\|78" scripts/verify-workflows.mjs` | **no count literal — only `BASELINES`/`BASELINES_JOB` path constants** |
| `grep -c "EXPECTED_BASELINE_COUNT = 78" e2e/visual/surfaces.spec.ts` | **1** ← *this* is the twin |

RESEARCH R6 and `16-VALIDATION.md` are both wrong about which file carries it. The real twin is `e2e/visual/surfaces.spec.ts`, exactly as `visual-baselines.ts`'s own docblock says.

**And there is a THIRD pin neither document names.** `EXPECTED_BLOCKED`, at the top of the same spec, is asserted with `toEqual` against `blockedSurfaces()` — so it moves whenever a **new blocked surface** arrives, which both of this phase's did. A plan that moved the two counts and not this list would have produced precisely the failure the docblock warns about: the dispatch shoots every surface, the inventory test fails, the Playwright step exits non-zero, and the stage/commit steps never run. All three moved in commit `a514061`, and the pairing is now recorded in the alias's docblock as a fact rather than a warning.

**2. `profile`'s existing baselines are NOT invalidated by this phase, because there are none.** Confirmed three ways:

- `VISUAL_SURFACES.profile.blocked` is a full paragraph naming *"a drive and a seeded user"*.
- STATE.md § Operator Next Steps records the 15-11 dispatch verbatim: generation run `32751407382`, comparison run **`32752143309`** with `gate-visual` green, and *"both `profile` rows correctly produced nothing."*
- Measured in this tree: `git ls-files 'e2e/visual/surfaces.spec.ts-snapshots/*-visual-linux.png' | wc -l` → **36**.

**So 16-15's dispatch is expected to add ZERO files.** All four of its new rows are blocked. A dispatch that adds any has shot something the inventory says it cannot reach — that is the reading to take into Task 3.

---

## Task 1 — GATE-RESP, and the vacuity that was not in the plan

### The header line, pasted

```
 * SEVENTEEN ROUTES AND FOUR ROUTE STATES — 21 rows, 42 cases at two themes each.
```

`grep -c "21 rows, 42 cases" e2e/overflow-320.spec.ts` → **1**.

**The route count deliberately did NOT move.** 17 is still 17: the new row is a STATE of a route the table already covers, so only the state count (3 → 4), the row count (20 → 21) and the case count (40 → 42) change. The docblock says this in as many words, because incrementing the route count for a row that adds no route is the arithmetic mistake most likely to be believed in a header.

### The vacuity probe — both outcomes, transcribed

Run with `--grep "crop dialog open" --workers=1`, the `open` removed both times so the dialog stays shut:

| probe | `tell` | **outcome** |
|---|---|---|
| A | `'[data-testid="panel-card"]'` | **2 passed (9.3 s)** — the bare hook reports a CLOSED page as this state |
| B | the shipped selector | **2 failed** at `expectReachable` |

Probe B's message, verbatim:

```
Error: /profile · crop dialog open · grove · 320px: the route rendered no
`[data-testid="responsive-dialog"]:has-text("Position your photo")`, so it is not the surface
this row names. …
    33 × locator resolved to 0 elements
```

Restored, and `diff` against the pre-probe backup reported the file **byte-identical**. With the `open` back: **2 passed**.

The title is IMPORTED (`AVATAR_CROP_TITLE` from `src/lib/avatar.ts`, which is directive-free precisely so a gate can read it) and interpolated into the selector, the same rule this file already states for `SUPPORT_EMAIL`.

### ⚠ The finding the plan did not ask for: the measurement could not fail either

A correct `tell` proves the row is **looking** at the overlay. It says nothing about whether the assertion behind it can fail. So the same probe was run one level down, and it found that it could not.

**Three measurements, real Chromium, 320×800:**

| reading | value |
|---|---|
| `getComputedStyle(document.body).overflow` on `/`, `/terms`, `/privacy`, `/login`, `/signup`, `/forgot-password`, `/reset-password` | **`visible`** (all seven) |
| the same, on `/listings/[id]` with the booking sheet OPEN | **`hidden`**, `position: relative` |
| the same, on `/profile` with the crop dialog OPEN | **`hidden`** |

That is `react-remove-scroll`'s scroll lock. Its effect on `expectNoOverflow` is total, measured by appending a **500px-wide `<div>` straight into the open dialog** — and then run through the SHIPPED code path, not a copy of it:

| what ran | result |
|---|---|
| the row with the injected div and **no `scope`** (document scan only) | **1 passed** ⬅ *the gate accepted a 500px element inside a 320px overlay* |
| the row with the injected div and the `scope` it now ships with | **1 failed**, `scrollWidth 532` against `clientWidth 320`, **14 named offenders** |

All three clauses go quiet at once, for two independent reasons: `<body>` is now a 320px box clipping its own content, so the document cannot widen; and `isClipped` walks ancestors up to — but not including — the document element, so it walks **through** `<body>` and calls every element on the page clipped. Separately, `DialogContent` itself computes `overflow-x: auto` (Tailwind's `overflow-y-auto` makes the other axis compute to `auto` per CSS), so anything inside the overlay is clipped by the overlay's own box as well.

**The fix, `expectNoOverflowWithin` in `e2e/helpers/overflow.ts`,** asks the question that is still answerable once the document's answer has been suppressed: does anything inside the overlay reach past the OVERLAY'S right edge, and does the overlay's own box scroll sideways. Four assertions — the scope exists, it laid something out (32 elements on the crop dialog at 320), its box does not scroll, and no unclipped descendant passes its right edge. **The ancestor walk stops AT the scope**, which is the whole trick: the element doing the hiding must not be allowed to count as a clip, while containers *between* an element and the scope still do (the sheet's own `max-h-72` scroll area is a real scroll container, the identical argument `collectOffenders` makes for the map pane).

It is placed beside `expectNoOverflow` rather than in the spec because that file's header forbids a second copy of one definition — and this is not a second copy, it is a different question.

**The pre-existing `/listings/[id] · sheet open` row has the same hole and is NOT fixed here.** Same mutation, scoped: `scrollWidth 532` against `320`, **48 offenders**. It is raised as **D9** with its measurements and a one-line fix, because turning the clause on for a Phase-12 surface may produce a real red and that is not something to discover inside a gate plan's own verification run.

### The wizard photos step: it is NOT a row on this table

The plan asked for this to be confirmed and recorded either way. **It is not**, and the row that looks like it is, is not:

- `/host/listings/[id]/edit` IS a row (AC#36 block) and its `tell` is `[data-testid="wizard-step-rail"]` — the rail, which **every** step renders. The wizard opens on its first step.
- `Phase14Row` has `name` / `path` / `tell` / `tellWhy` / `touch` / `touchWhy` and **no interaction seam**. The `open` seam belongs to the AC#29 table above it; the two blocks are separate tables with separate drivers.
- A URL is not an alternative: `wizard.tsx` holds the step in CLIENT state (`stepInList`) with no query parameter and no per-step route.
- And `grep -n "listing_photo" e2e/overflow-320.spec.ts` returns **nothing** — the host fixture seeds no photos, so even a row that reached the photos step would photograph the empty state.

Raised as **D10** rather than closed, on the plan's own instruction (*"raise it rather than silently adding a route this phase did not plan for"*). It is the same walk `wizard-cover-preview`'s `blocked` string needs, so D10 and that unblocking are **one piece of work, not two**.

---

## Task 2 — GATE-VRT, and the two blocked dispositions with their reasons

Both surfaces took **branch 2** (blocked with a named sentence). The disposition was decided by reading `e2e/helpers/visual-drive.ts`, `e2e/visual/surfaces.spec.ts` and `scripts/seed-baseline-fixtures.ts`, not guessed.

### `avatar-crop-dialog` — BLOCKED, on three things, two of them inherited

| # | blocker | new here? |
|---|---|---|
| 1 | **A drive.** `DRIVES` has no entry for `/profile` and none for this state, so both fall through to a plain `goto` with no session. | inherited from `profile` |
| 2 | **A seeded user with fixed literals.** An overlay is captured `captureMode: "viewport"` (the lightbox and the sheet are the precedent), so the profile document *behind the scrim is in frame* — member-since line and fallback initials and all. An ad-hoc signup would put `Member since <this month>` into a committed reference image. | inherited, but load-bearing here in a way it is not on its parent |
| 3 | **A staged file.** The dialog does not exist until an image passes all four pre-dialog guards, so a drive must `setInputFiles`. | **new — and the cheap half:** `e2e/fixtures/square-400.png` is generator-produced and gated byte-for-byte by `tests/design/image-fixtures.test.ts`, so the pixels are already as fixed as a literal. What is missing is a drive that hands them over. |

**⚠ And this row is SAFER than its parent, which is worth knowing.** `profile`'s sting is that an undriven capture *satisfies* its hook — `/login` renders a `panel-card`. This row's hook is the dialog narrowed by its title, and `/login` renders no dialog at all, so the same mistake **times out** instead of minting a permanent, silent, green picture of the sign-in page.

### `wizard-cover-preview` — BLOCKED, on two things, one of them the Phase-14 structural one

| # | blocker | new here? |
|---|---|---|
| 1 | **No host entry in `DRIVES`.** Every host route redirects an unauthenticated visitor, so the default drive photographs `/login`. The fixture's own host (`VRT_HOST_ID` = `vrt_host_1`, `can_host`) exists and owns the listing; what does not exist is any way for a drive to BE that user. | inherited from all nine Phase-14 rows |
| 2 | **A drive that WALKS to the photos step.** Client state, no query parameter, no per-step route — `?step=` would be an invention rather than a path. | **new** |

**⚠ What it does NOT need, stated at the row because it is the assumption a reader arrives with: no Cloudinary round trip and no photo fixture.** `scripts/seed-baseline-fixtures.ts` already commits **eight** `listing_photo` rows for `vrt_listing_exclusive` with local urls under `public/vrt/`, and both the wizard's tiles (`photo-uploader.tsx:305`) and the preview (`:253`) render `photo.url` rather than deriving anything from the Cloudinary-shaped `public_id`. **The pixels are committed; the session and the walk are not.**

### The four rows, and what each width pins

| surface | width | what only that width pins |
|---|---|---|
| `avatar-crop-dialog` | 320 | the **bottom sheet** — the stage at its `dvh`-capped size (`min(320px, 100vw - 2rem, 40dvh)`, resolving to the 288px content box with nothing to spare), the action bar reversed into a column |
| `avatar-crop-dialog` | 1280 | the **centred 384px box** — measured 384 wide, i.e. the overlay is wider than the whole viewport its other row uses, so the primitive's max-width is only observable here |
| `wizard-cover-preview` | 320 | the frames at `w-32`: 128 + `gap-2` + 128 = **264px** must fit or they wrap and the block stops being a comparison |
| `wizard-cover-preview` | 1280 | the `sm:` branch, both frames at `w-40` — a different pair of boxes, not the same pair with more room |

### Both literals moved, in one commit — with the compile gate watched red first

`git show --stat a514061` lists **both files**:

```
 e2e/visual/surfaces.spec.ts        |  64 +++++---
 src/lib/design/visual-baselines.ts | 292 ++++++++++++++++++++++++++++++++++---
```

**Watched red on the compile gate**, unforced (the four rows were in place with the alias still at 74):

```
src/lib/design/visual-baselines.ts(2477,3): error TS2344: Type 'false' does not satisfy the
constraint 'true'.
EXIT=2
```

Exactly one error. Renamed to `BaselineCountIsSeventyEight` and moved to 78 → **exit 0**. Recorded as the fourth sighting in the file's own OBSERVED-RED block, with the observed line number rather than a guessed one.

**And the runtime twin was watched too, in the only way it can be off Linux.** With `EXPECTED_BASELINE_COUNT` reverted to 74 and everything else current, `npx tsc --noEmit` exits **0** and says nothing at all — which is the docblock's claim (*"it is a `const`, not a type"*), measured rather than repeated. That is why it moved in the same commit rather than a later one.

**`EXPECTED_BLOCKED` verified against the real function**, since the test that does this cannot run on this machine: `blockedSurfaces()` returns **24** ids, in `SURFACE_IDS` order, ending `…, "profile", "avatar-crop-dialog", "wizard-cover-preview"` — compared element-by-element against the literal list, **MATCH: True**. Every reason is longer than the 80-character floor. `VISUAL_BASELINES.length` = **78**, `SURFACE_IDS.length` = **43**, **36 shot rows / 42 blocked rows** — which is the arithmetic both docblocks now state.

### ⚠ The `VISUAL_BASELINES` docblock was stale in two different ways, and is rewritten

The plan says to update the subtotal arithmetic there with a Phase-16 block. Adding one would have produced nonsense, because that table was wrong twice over:

1. **It stopped at Phase 12.** Plans 13-15, 14-16 and 15-11 each added rows *below* it and moved only the alias's docblock, so it read `TOTAL 53` against an array of 74.
2. **Every number in it was a TWO-THEME number** — `both themes`, `SUBTOTAL 27` — from before D-138 made `court` the single product theme. Even its Phase-11 half was wrong by ten.

It is rewritten from the array (surface + width extracted and tallied programmatically) with all six phases, court only, per surface, `TOTAL 78` — and the correction is recorded in the docblock so the next reader sees what happened rather than inheriting a third stale copy.

### Nothing was added to the fixed four

`git diff --exit-code e2e/visual/theme-swap.spec.ts src/lib/design/accent-uses.ts` → **exit 0**. `THEME_SWAP_SURFACES`, `EXPECTED_COMPARED_SURFACES`, `ThemeContractSurfaceCountIsFour`, `THEME_SWAP_EXCLUSIONS` and `ThemeSwapExclusionCountIsOne` appear in the diff **only** inside the one header line that renames the first alias. D-138 / Δ16: this phase makes no claim that the four cannot reach a token family.

---

## Deviations from Plan

### 1. [Rule 2 — the gate could not fail] The overlay measurement, and a shared helper touched

- **Found during:** Task 1, by probing the assertion behind the correct `tell`
- **Issue:** the full argument and every number are in *"the finding the plan did not ask for"* above. In one line: `expectNoOverflow` is satisfied by construction while any Radix modal is open, so the row the plan is chartered to add would have reported the state as covered while measuring nothing.
- **Why it is Rule 2 and not scope creep:** the plan's `must_haves` truth is that `/profile` with the dialog open *"survives 320px with nothing wrapping or overflowing."* To claim *survives*, the measurement has to be capable of saying otherwise. And T-16-57 in this plan's own register is the `tell`-level version of exactly this threat; the measurement-level twin is worse, because a wrong `tell` at least fails loudly the day the selector changes.
- **Files:** `e2e/helpers/overflow.ts` (a fourth file, one more than `files_modified` declares), `e2e/overflow-320.spec.ts` · **Commit:** `8febb80`
- **Blast radius checked:** `helpers/overflow.ts` is shared with `e2e/mobile-booker-path.spec.ts`. The change is **additive only** — `measureOverflow` and `expectNoOverflow` are byte-unchanged, and the new function is opt-in per row via `RouteRow.scope`. No existing row carries one.

### 2. [Raised, not fixed] D9 — the 12-10 booking-sheet row has the same hole

- Same mechanism, same mutation, **48 offenders** when asked in the scoped form. One line closes it (`scope: '[data-testid="responsive-dialog"]'` on that row) and it is deliberately not applied: this plan's Task 1 says *"Add nothing else to this file"* and *"do NOT refactor … that spec passes"*, and turning the clause on for a Phase-12 surface may produce a **real red** that belongs to somebody watching for it.
- **Filed:** `deferred-items.md` **D9**, with all measurements and the fix.

### 3. [Raised, not fixed] D10 — the cover preview has no 320px row

- The plan told this plan to raise it rather than add a route it did not plan for. Full argument above and in `deferred-items.md` **D10**.

### 4. [Measured correction] The `VISUAL_BASELINES` docblock was stale by three phases and by D-138

- Rewritten from the array rather than amended. Section above.

### 5. [Acceptance criterion read rather than satisfied literally] the `SeventyFour` grep

| criterion | expected | **actual** | verdict |
|---|---|---|---|
| `grep -c "BaselineCountIsSeventyEight" src/lib/design/visual-baselines.ts` | `1` | **2** | correct — the file's own header lists the three aliases by name at `:51`, and leaving that one reading `SeventyFour` would have been a dangling reference to a type that no longer exists |
| `grep -c "SeventyFour" src/lib/design/visual-baselines.ts` | `0` | **1** | correct — the one occurrence is inside plan **15-11's dated OBSERVED-RED record** (*"Renamed to `…IsSeventyFour` and moved to 74 in the same commit → exit 0"*). Rewriting a historical measurement to satisfy a grep is the falsification that record exists to prevent. |

`0` was never reachable without editing history: before this plan the string appeared **three** times (header, history, declaration). Stated here rather than quietly satisfied.

---

## Requirements

**CROP-02 stays PENDING, and the remainder is one named item.** Plan 16-06 recorded that this plan carries its GATE-RESP and GATE-VRT clauses. Of those two:

- **GATE-VRT — discharged as a declaration.** `wizard-cover-preview` has two court-only rows with per-width `why` strings, and its `blocked` sentence names exactly what is missing. That is this repository's stated convention for an unreachable surface, not a shortfall.
- **GATE-RESP — NOT discharged.** D10. The preview has no 320px row and the existing wizard row structurally cannot reach it.

`.planning/REQUIREMENTS.md` gains a CROP-02 status block recording that split, what shipped in 16-06, what D10 is, and the ⚠ note that the two remaining items are one piece of work. **The checkbox at `:99` and the traceability row at `:232` are both left at `Pending`** — deliberately, and the row was checked by hand rather than trusted to the SDK verb, which moves the checkbox and leaves the table stale.

**CROP-01 (closed by 16-14) and CROP-03 (closed by 16-12) were verified untouched:** both checkboxes ticked, both traceability rows read `Complete`. **CROP-04 is 16-16's hardware walk and was not touched.**

---

## Verification

Every command run in this tree, alone — never concurrently, per `tests/global-setup.ts`'s TRUNCATE.

| Gate | Result |
|---|---|
| `npx playwright test e2e/overflow-320.spec.ts --project=chromium` | **exit 0 — 62 passed / 15 skipped (1.3 min)**, up from the 60/15 baseline by exactly the two new cases |
| `npx tsc --noEmit` | **exit 0** |
| `npm run test:design` | **exit 0 — 59 files / 1137 passed / 3 skipped** — identical to 16-14's post-state |
| `npm test` | **exit 0 — 185 files / 2102 passed / 5 skipped** — identical to 16-14's post-state |
| `npm run build` | **exit 0** (lint + design suite + `next build`, full route table emitted) |
| `node scripts/verify-workflows.mjs` | **exit 0 — all 38 invariants hold** (baselines=11, ci=20, cross=7) |
| `npx eslint` on all four changed source files | clean |
| `git diff --exit-code e2e/visual/theme-swap.spec.ts src/lib/design/accent-uses.ts` | **exit 0** |
| `git diff --exit-code e2e/helpers/avatar-session.ts` | **exit 0** — 16-13's helper untouched, as Task 1 requires |

### The e2e scope, stated plainly

**The phase gate was NOT read off a full `chromium` run**, per the orchestrator's instruction and `deferred-items.md` D6 — three reproducible pre-existing failures (`public-listing.spec.ts`'s documented `STANDING RED` from `ab83bff`, `cancel.spec.ts`, `confirmation-decay.spec.ts`) plus D2's contention set, none of them Phase 16's. 16-13 and 16-14 both said the same; this plan repeats it rather than quietly running something narrower.

`e2e/overflow-320.spec.ts` is this plan's own spec and the only e2e file it changed. It was run **whole**, at the default worker count, and passed — **D2 did not reproduce in that run**, which is consistent with its recorded shape (a contention flake, not a deterministic red) and is not evidence that it is fixed.

### Acceptance greps

| grep | expected | **actual** |
|---|---|---|
| `grep -c "21 rows, 42 cases" e2e/overflow-320.spec.ts` | `1` | **1** ✓ |
| `grep -c "EXPECTED_BASELINE_COUNT = 78" e2e/visual/surfaces.spec.ts` | `1` | **1** ✓ |
| `grep -c "avatar-crop-dialog\|wizard-cover-preview" src/lib/design/visual-baselines.ts` | `>= 6` | **14** ✓ |
| `grep -c "BaselineCountIsSeventyEight" src/lib/design/visual-baselines.ts` | `1` | **2** — see deviation 5 |
| `grep -c "SeventyFour" src/lib/design/visual-baselines.ts` | `0` | **1** — see deviation 5 |
| `grep -n "74" .github/workflows/baselines.yml` | — | **no output** (the plan's correction #1, re-measured) |

---

## Known Stubs

None. Nothing added here renders to a user: two test-side measurements, an inventory declaration whose rows are blocked with argued reasons, and three documentation records. No hardcoded empty value flows to a UI, and no product file was modified — `src/lib/design/visual-baselines.ts` is a declaration module outside the DS-13 leak-gate tree by its own header's argument.

## Threat Flags

None. No endpoint, auth path, file-access pattern or schema field was added; `drizzle/` is untouched (GATE-06 holds).

The plan's four registered threats, marked as discharged rather than assumed:

| Threat | Outcome |
|---|---|
| **T-16-55** — a baseline shot off the pinned image | No baseline was written or could be: `playwright.config.ts` does not construct the `visual` project on win32, and `updateSnapshots: "none"` is unconditional. Nothing under `surfaces.spec.ts-snapshots/` moved (still 36 files). |
| **T-16-56** — a dispatch that shoots everything and commits nothing | Both count literals moved in one commit, **and a third pin (`EXPECTED_BLOCKED`) the plan did not name** — verified against the real `blockedSurfaces()` output element-by-element, because the test that would catch it cannot run here. |
| **T-16-57** — a row that measures the page behind the overlay | Probed in both directions and transcribed. **And extended:** the same probe applied to the assertion found it vacuous too, which this threat's mitigation as written would not have caught. |
| **T-16-58** — accepting an unrelated `gate-visual` red as cleared | Carried into Task 3's checkpoint, which is open. |

---

## Task 3 — OPEN, blocking, operator

Everything automatable is done. Task 3 cannot run on this machine and was not simulated: `playwright.config.ts` constructs the `visual` project only when `process.platform === "linux"`, this machine is win32, and `updateSnapshots: "none"` is unconditional. Baselines are generated only by the `workflow_dispatch`-only `baselines` workflow. Handled exactly as `15-11-02` and `12-14` Task 3 were.

**What the operator is asked for, and the one number to check first:** this dispatch is expected to add **ZERO** files, because all four new rows are blocked. `git ls-files 'e2e/visual/surfaces.spec.ts-snapshots/*-visual-linux.png' | wc -l` should still read **36** afterwards. The deliverable is the **follow-up comparison run's** id and its `gate-visual` status — never the generation run's, because a `GITHUB_TOKEN` push triggers no workflow run.

⚠ **And the thing to watch, from STATE.md's own record of last time:** the 15-11 dispatch cleared a pre-existing `gate-visual` red as a side effect and re-minted ten surfaces nobody read the diff for. If `gate-visual` is red on a surface this phase did not touch, name it rather than accepting it silently.

---

## For the Next Plan

1. **D9 and D10 are both one small piece of work each, and D10 shares its work with a VRT row.** Closing D10 (a walk to the wizard's photos step + one seeded `listing_photo`) is the same walk that unblocks `wizard-cover-preview`, and it is what CROP-02 still owes.
2. **The overlay measurement now exists and is opt-in.** Any future row that opens a dialog, sheet or popover should carry a `scope`. Without one it measures nothing, and that is now written down at the field.
3. **D2, D6, D7, D8 are unchanged** — none was in this plan's path and none was touched.
4. **`EXPECTED_BLOCKED` is a third pin on the baseline inventory.** It is now named in the alias's docblock. A plan adding a blocked surface moves three things, not two.

## Self-Check: PASSED

**Files claimed created — present:**
- `.planning/phases/16-image-crop-framing/16-15-SUMMARY.md` — FOUND (this file)

**Files claimed modified — all present:**
- `e2e/overflow-320.spec.ts` — FOUND
- `e2e/helpers/overflow.ts` — FOUND
- `src/lib/design/visual-baselines.ts` — FOUND
- `e2e/visual/surfaces.spec.ts` — FOUND
- `.planning/phases/16-image-crop-framing/deferred-items.md` — FOUND (D9, D10 appended)
- `.planning/REQUIREMENTS.md` — FOUND (CROP-02 status block; no checkbox or table row changed)

**`must_haves` contract:**
- truth 1 — GATE-RESP measured on a row of the existing table, not a second spec — ✓, **and strengthened**: the row would not have been a measurement without deviation 1
- truth 2 — both count literals moved together — ✓, one commit, `git show --stat a514061` lists both files; a third pin found and moved with them
- truth 3 — no row added to `e2e/visual/theme-swap.spec.ts` — ✓, `git diff --exit-code` exits 0
- artifact `e2e/overflow-320.spec.ts` contains `open:` — ✓
- artifact `src/lib/design/visual-baselines.ts` contains `avatar-crop-dialog` — ✓ (14 occurrences of the pair)
- key_link `visual-baselines.ts` → `surfaces.spec.ts` via `EXPECTED_BASELINE_COUNT` — ✓, both at 78

**Commits verified present in `git log`:** `8febb80`, `a514061` — both FOUND.

**Orchestrator tracking boundary respected:** `.planning/STATE.md` and `.planning/ROADMAP.md` are **not** in this plan's diff, and no `state.*` / `roadmap.*` / `phase.complete` / `record-metric` / `add-decision` / `record-session` SDK write verb was invoked. `.planning/REQUIREMENTS.md` was edited by hand, for CROP-02's status note only — no checkbox and no traceability row changed value.

**Prohibited operations:** no `git stash` (or any subcommand) was run at any point. Work was set aside three times — the vacuity probes, the watched red on the compile gate, and the injected-div mutation — and each time with a `cp` backup to the scratchpad, verified restored with `diff` or `git diff --exit-code`.

---

*Phase: 16-image-crop-framing · Plan 15 · Tasks 1–2 complete 2026-08-26 · Task 3 open at a blocking operator checkpoint*
