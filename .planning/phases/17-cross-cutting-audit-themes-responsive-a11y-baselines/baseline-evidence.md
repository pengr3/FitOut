# Phase 17 — GATE-01 baseline evidence

**What this file is.** The record of Phase 17's baseline round-trip, written in the order it
happened: the prediction **before** the dispatch, the diff **read** against that prediction, and
the **comparison** run id that is the phase's closing evidence per **D-202**.

> **CURRENT CLOSING EVIDENCE: comparison run [`33300479520`](https://github.com/pengr3/FitOut/actions/runs/33300479520), green, on `64da86f`** — § 8.
> It supersedes `33298587807` (§ 8.1/§ 8.5), which superseded `33298297450` (§ 7), which superseded
> `33295755823` (§ 6), which superseded `33273927029` (§ 3). Every one is kept, with the reason it was
> superseded stated where it sits — and only the FIRST of those supersessions was caused by a defect.
> Rounds 3 and 4 each fired **no** generation run: neither the code review's remediation nor round 4's
> single test-file fix changed one baseline byte, which is what § 7.1 and § 8.2 each predicted in
> writing before their push.
>
> ⚠ **Round 4 exists because the phase VERIFIER found a blocker, not because the evidence was wrong.**
> `e2e/axe-sweep.spec.ts` failed its own AC#2 completeness assertion on `1751fb0` — a wave-2/wave-3
> route-table gap, mechanical, and therefore must-fix under D-200. No CI job runs that spec (D-24), so
> no comparison run in this chain was ever measuring it and none of them over-claimed. See § 8.

> ⚠ **A generation run is not the evidence.** `[13-16]` records a phase completing with
> `gate-visual` red and nothing noticing, and `baselines.yml`'s own header records why: its push
> authenticates with `GITHUB_TOKEN`, and *a `GITHUB_TOKEN` push triggers no workflow run*. The
> generation job therefore **writes** PNGs that nothing has **compared** against. The deliverable is
> the follow-up **COMPARISON** run, forced by an empty commit, and its id is recorded below under
> its own heading.

---

# 1 · Pre-dispatch — written BEFORE anything was minted

## 1.1 The commit the prediction was written against

| Item | Value |
|---|---|
| Branch | `dev` (`git.branching_strategy = "none"`) |
| Head when this prediction was written | **`35ac9da87e074b58b6222293b123d1ea26d53c7d`** (`35ac9da`) |
| Phase base | `e439bf95f75342100e0fd2ff5909d5b6a389d014` (`e439bf9`) |
| Unpushed commits at this point | **126** |
| Committed baselines on disk | **36**, every one `*-court-visual-linux.png` |
| `ls … | grep -c 'grove\|win32\|darwin'` | **0** |
| `git status --porcelain drizzle/` | empty; `drizzle/*.sql` = **26** |

The commit that adds *this file* becomes the new head; the dispatch runs against that head, and its
SHA is recorded in § 2.1. Nothing else lands between the two.

## 1.2 The local gate — run before the dispatch, not after

| Check | Result |
|---|---|
| `npm run build` (lint + `test:design` + `next build`) | **exit 0** |
| — design suite inside it | **66 files, 1248 passed / 3 skipped** |
| `npx tsc --noEmit` | **exit 0** |
| `node scripts/verify-workflows.mjs` | **exit 0** — *All 38 invariants hold across 3 sections (baselines=11, ci=20, cross=7)* |
| `git diff --name-only HEAD -- playwright.config.ts .github/workflows/baselines.yml` | **0 lines** |

**The e2e comparison against `e2e-baseline-reds.md`, stated explicitly.** This plan touches **zero**
e2e spec files — its `files_modified` are `e2e/visual/surfaces.spec.ts-snapshots/` and this document.
So the set of *touched* specs is **empty**, and the honest statement is that this plan introduces no
new e2e red because it changes no e2e code. The declared red set (10 rows at `e439bf9`: 2
reproducible, 1 undeclared, 7 contention) is **unchanged and unconsulted** by this plan; each of
17-01…17-13 ran the specs it touched and recorded that comparison in its own SUMMARY. The
whole-tree statement that matters here is not a local e2e run at all — it is the **CI run on the
pre-dispatch head** recorded in § 1.6, which exercises all four jobs including `gate-visual`, the
only job on any machine that can speak for GATE-01.

## 1.3 The single sanctioned write path is provably unchanged

`git diff --stat e439bf9..HEAD` over the six files that constitute the write path is **EMPTY**:

```
playwright.config.ts   .github/workflows/baselines.yml   .github/workflows/ci.yml
e2e/visual/surfaces.spec.ts   e2e/helpers/visual-drive.ts   scripts/seed-baseline-fixtures.ts
→ no diff
```

That is a stronger statement than the plan asked for and it is the one that makes the prediction
below testable: **the capture machinery did not move in Phase 17**, so every pixel that changes must
come from a `src/` change, and every *new* PNG would have to come from an unblocked row — of which
there are none (`EXPECTED_BLOCKED` = 24, `EXPECTED_BASELINE_COUNT` = 78, both unmoved, both
re-measured below).

## 1.4 ⚠ Two of this task's acceptance criteria are FALSE of the tree — measured, not worked around

The plan's Task 1 asks for `grep -c 'secrets\.' .github/workflows/baselines.yml` → `0` and
`grep -c 'workflow_dispatch' …` → `1`. **Neither can hold**, and `baselines.yml`'s own header says
so in advance:

> *"A naive PROHIBITION written the same way — 'the string `secrets.` appears nowhere in this file'
> — reports RED against the correct file, because the paragraph above that forbids credentials
> necessarily names the thing it forbids. Substring checks are wrong in BOTH directions on a
> documented file: falsely green for requirements, falsely red for prohibitions."*

This is the same defect class the header already measured for `--update-snapshots` (`grep -c` reads
**6**, not the criterion's 1, because five of the six are the comment lines explaining the flag).
Measured here, at `35ac9da`:

| Criterion as written | Measured | Why |
|---|---|---|
| `grep -c 'secrets\.' baselines.yml` = 0 | **2** | both are prose *forbidding* credentials |
| `grep -c 'workflow_dispatch' baselines.yml` = 1 | **6** | five are the header arguing for the manual-only trigger |
| `grep -rc -- '--update-snapshots' .github/workflows/` | baselines.yml **6**, ci.yml **0** | the ci.yml **0** is the load-bearing half, and it holds |

**The assertions that are load-bearing, taken over the PARSED tree instead:**

| Parsed property | Value |
|---|---|
| `Object.keys(on)` | **`["workflow_dispatch"]`** — exactly one trigger, no `push`, no `pull_request`, no `schedule` |
| workflow-level `permissions` | `{contents: read}` |
| job `generate-baselines` `permissions` | `{contents: write}` — on the job alone |
| `container.image` | `mcr.microsoft.com/playwright:v1.60.0-noble` (pinned, equals the `@playwright/test` pin) |
| `secrets.` occurrences across parsed `env` / `run` / `with` values | **0** |
| run commands carrying `--update-snapshots`, whole `.github/workflows/` | **1**, and it is `baselines.yml:generate-baselines` |
| `playwright.config.ts:78` | `updateSnapshots: "none",` — unconditional, no env guard, byte-unchanged since `e439bf9` |

`scripts/verify-workflows.mjs` asserts all of these and exits **0**. Recorded per this phase's own
rule (*measure before you assert*): the criteria's numbers are wrong, the tree is right, and nothing
in the tree was bent to make a substring check read green.

## 1.5 THE PREDICTION — written before the dispatch, so the diff is READ rather than accepted

Two plans predicted pixels in writing. Both predictions are copied here verbatim in effect, with the
row's shot/blocked status re-measured at `35ac9da` so an absence is readable as well as a presence.

### 1.5.1 Predicted CHANGED files — six

| # | Baseline file | Source of the prediction | Why | Row is |
|---|---|---|---|---|
| 1 | `search-results-320-court-visual-linux.png` | 17-05 (DS-09) | `size:default` `px-2.5` → `size:touch` `px-4` on the date + price popover triggers: **+12px** horizontal padding inside `w-full min-w-[150px]` / `min-w-[130px]` controls, which moves the truncate point at the 320 floor | **SHOT** |
| 2 | `search-results-768-court-visual-linux.png` | 17-05 | same | **SHOT** |
| 3 | `search-results-1280-court-visual-linux.png` | 17-05 | same | **SHOT** |
| 4 | `search-relax-band-320-court-visual-linux.png` | 17-05 | same search bar renders above the band | **SHOT** |
| 5 | `search-relax-band-1280-court-visual-linux.png` | 17-05 | same | **SHOT** |
| 6 | `booking-not-found-1280-court-visual-linux.png` | 17-06 / D-196 (`[17-D6]`) | `ProfileLink` `p-1.5`: **16×16 → 28×28**, **+12px at every width**, no breakpoint. This is the one **shot** row that renders the signed-in shell | **SHOT** |

**Every one of the six is shot** — confirmed against the 36 files on disk, not assumed. So an
*absent* change on any of them is as much a finding as an unpredicted one.

### 1.5.2 Predicted NEW files — ZERO

| Pin | Value at `35ac9da` | Moved this phase? |
|---|---|---|
| `EXPECTED_BLOCKED` (`e2e/visual/surfaces.spec.ts:179`) | **24** entries, `wizard-cover-preview` among them | **no** |
| `EXPECTED_BASELINE_COUNT` (`:301`) | **78** | **no** |
| `git diff --stat e439bf9..HEAD -- e2e/helpers/visual-drive.ts scripts/seed-baseline-fixtures.ts` | **EMPTY** | **no** |

All 24 blockers live in those two files, and neither moved. 17-13 walked all 24 rows and unblocked
**none**. Therefore:

> **A newly minted PNG is a FINDING, not a success.** The disk count must stay **36**.

`wizard-cover-preview` in particular must stay blocked: `[16-D10]` makes unblocking it — which mints
a 37th committed PNG — the **PM's** call to schedule, not an audit's side effect.

### 1.5.3 Predicted UNCHANGED — the classes that render no pixel

* `aria-*` / `role="status"` additions (17-07, 17-09) — zero rendered pixels.
* Heading-level corrections — *possible* per surface, since a level change can change computed
  font-size. None of the six predicted rows is claimed on this account; if one moves **only** here it
  is a finding to explain, not to accept.
* 17-05's `group-refresh` / `regenerate-link` / `remove-attendee` conversions — all render on
  `/bookings/[id]/group`, whose rows are **blocked**. No file can move on their account.

## 1.6 `[A3]` — the assumption, and its falsification BEFORE the dispatch

The plan carries `[ASSUMED A3]`: *"the signed-in header renders on no shot surface … VERIFY, DO NOT
ASSUME."* It is **FALSIFIED**, cheaply, by grepping the declarations rather than by waiting for the
diff:

```
e2e/visual/surfaces.spec.ts   EXPECTED_BLOCKED contains 24 entries — "booking-not-found" is NOT one
src/lib/design/visual-baselines.ts   "booking-not-found": { … blocked: null }
```

`visual-baselines.ts` says it in its own voice, twice:

> *"`booking-not-found` is the ONE that is neither: it renders no booking, no money, no date and no
> identity — an `EmptyState` inside the signed-in shell — so it is shot."*

and, in the row's `hookWhy`, *"an unauthenticated visit is redirected to `/login`"* — so the capture
is necessarily **signed in**. `booking-not-found` is driven by `bookingNotFoundDrive` in
`DRIVES` (`e2e/helpers/visual-drive.ts:891`).

**Verdict recorded pre-dispatch: `[A3]` is WRONG.** At least one shot row renders the signed-in
shell, and `booking-not-found-1280` is therefore **predicted to change**, which is exactly what
`[17-D6]` and 17-13's handover say. The remaining 20 signed-in rows are blocked, so the exposed set
is small but not empty. The post-dispatch confirmation is in § 2.3.

*(Ambiguity note, recorded not smoothed: the plan's `[A3]` text and `[17-D6]`'s text say opposite
things. `[17-D6]` — the later, measured one — is right. This file follows `[17-D6]`.)*

## 1.7 The pre-dispatch CI run — the shape, and the FIVE unpredicted rows it exposed BEFORE anything was minted

**Run [`33272796552`](https://github.com/pengr3/FitOut/actions/runs/33272796552)** — `ci`, event `push`,
head **`0d1ce9311a3fd6ac3f6af012341dc7105b29d59e`** (`0d1ce93`, the commit that added § 1 of this file).

| Job | Conclusion |
|---|---|
| `gate-db-free (lint + design + build + workflow parse)` | **success** |
| `gate-db (vitest against PostGIS 18)` | **success** |
| `gate-price-parity (DB-vs-DOM price, 1 spec)` | **success** |
| `gate-visual (GATE-01 visual regression)` | **failure** — **11 failed / 31 passed / 42 skipped** |

**Which failure message was observed, since the plan asks for it by name.** Every one of the 11 is
`expect(page).toHaveScreenshot(expected) failed` then *"N pixels (ratio 0.01 of all image pixels) are
different"*. **Zero** rows failed with `A snapshot doesn't exist at …` and **zero** with
`connect ECONNREFUSED` — no row was unblocked, so no reference was missing, and the database was
reachable on every one. **This is the correct pre-dispatch shape**: the surfaces rendered, and they
disagree with a stale reference.

*(Recorded correction: STATE.md's Phase-12 operator note states the two messages' meanings in
inverted order — it says "The first message means the surface never rendered; the second means it
rendered and has no reference yet" after listing `A snapshot doesn't exist` first and `ECONNREFUSED`
second. The plan's own action text states it the right way round. Neither message occurred here, so
it cost nothing this time; noted so the next reader is not misled.)*

**One flake, named so it is not counted as a diff:** `dev-theme-320-court` failed its first attempt
and **passed on retry #1**. It is not among the 11 and no baseline of it moved.

### 1.7.1 The 11, mapped to their pixel counts — and the counts are the evidence

| # | Row | Pixels different | Predicted in § 1.5? |
|---|---|---|---|
| 1 | `search-results-320-court` | **712** | YES |
| 2 | `search-results-768-court` | **712** | YES |
| 3 | `search-results-1280-court` | **712** | YES |
| 4 | `search-relax-band-320-court` | **712** | YES |
| 5 | `search-relax-band-1280-court` | **712** | YES |
| 6 | `listing-detail-320-court` | **173** | **NO** |
| 7 | `listing-detail-768-court` | **173** | **NO** |
| 8 | `listing-detail-1280-court` | **173** | **NO** |
| 9 | `listing-sheet-375-court` | **173** | **NO** |
| 10 | `booking-not-found-1280-court` | **744** | YES |
| 11 | `collision-notice-1280-court` | **917** | **NO** |

**The arithmetic is exact, and it is the whole finding:**

```
712  = the search-bar size="touch" conversion   (identical on all five search rows)
744  = the ProfileLink p-1.5 conversion         (booking-not-found, signed-in shell)
173  = a THIRD cause, identical at 320 / 375 / 768 / 1280 — therefore a FIXED-SIZE element
917  = 744 + 173   <-- collision-notice carries BOTH the ProfileLink change AND the third cause
```

`744 + 173 = 917` is not a coincidence anyone had to assume: `collision-notice` is the one row that
is **both** signed-in **and** renders the availability picker.

### 1.7.2 Why the five were missed — the prediction under-enumerated, it was not wrong

* **`collision-notice-1280` — a SECOND shot signed-in surface.** `[17-D6]` says *"At least one
  shootable baseline row renders that header: `booking-not-found`"*. **At least one** turns out to
  be **two**: `collisionDrive` signs a booker up (`e2e/helpers/visual-drive.ts:695`) exactly as
  `bookingNotFoundDrive` does, and its capture is `fullPage`, so the header is in the frame.
  `checkout` is signed in too and **passed** — because the checkout page renders **no header at
  all** (`e2e/shell.spec.ts:1221` pins *"0 header anchors, 0 footers"*), which is why it is not a
  third. The enumeration in `[17-D6]` should have been a command over `DRIVES` x `fullPage` x
  `blocked: null`, and was a reading.
* **`listing-detail` x3 and `listing-sheet-375` — not Phase 17's pixels at all.** Measured: the
  complete set of `src/` files Phase 17 touched is 19, and **exactly two of them can move a pixel** —
  `search/search-bar.tsx` (the two `size="touch"` conversions) and `patterns/site-chrome.tsx` (the
  one `p-1.5`). The rest are comment-only (`theme-provider.tsx`), `data-testid`-only
  (`availability-calendar.tsx`, `search-results.tsx`), one `aria-disabled` (`ui/slider.tsx`), a
  tag-only `titleAs` on `listing-card.tsx` whose own comment records that *"Tailwind's preflight
  resets every heading's size and weight to `inherit`, so swapping h3 for h2 here moves the outline
  and NOT a single pixel"*, four new `dev-throw-*` routes that no row shoots, and declaration
  modules. **Nothing Phase 17 changed renders on `listing-detail` or inside `listing-sheet`.**

### 1.7.3 The third cause — a WALL-CLOCK dependency in a row whose docblock claims determinism

The pre-Phase-17 range was checked rather than assumed. Between the last **green** `ci` run
(`32945807603`, head `7b48019`, 2026-08-26) and this one there are **127** commits — **72** before the
phase base and **55** in Phase 17. Their non-`.planning` reach is small and none of it renders on a
listing page: Phase 16.1 touched uploads (`listing-photo.ts`, `cloudinary/sign/route.ts`,
`photo-uploader.tsx`, `upload-policy.ts`), `lib/cloudinary.ts` lost a dead function and gained a
comment, `next.config.ts` gained a dev-only `allowedDevOrigins`, and **`package-lock.json` moved by
21 lines — two devDependencies (`@axe-core/playwright`, `tsx`) and nothing runtime**, so `npm ci`
resolves the same rendering libraries it did on 2026-08-26.

**So the 173 is time, not code.** `listing-detail`'s row pins the date *precisely to prevent this*:

> *"⚠ `?date=` IS NOT DECORATION, IT IS WHAT MAKES THIS BASELINE DETERMINISTIC. Without it the page
> renders `todayLocal` … so the month grid, the highlighted day and the set of disabled past days all
> change WITH THE WALL CLOCK — a baseline that goes red tomorrow for no reason."*

**The pin is incomplete, and this is the finding.** `?date=2026-09-16` fixes the *selected* day and
the *displayed month*. It does **not** fix `todayDate`: `src/app/listings/[id]/(detail)/page.tsx`
passes `todayDate={todayLocal}` at **three** call sites (`:595`, `:774`, `:822`), and
`src/components/availability/availability-calendar.tsx:500` takes `todayDate ?? initialDate` — so
with the prop supplied, `todayStart` is the **real venue-local today**, and the day cell carrying it
renders the neutral `--muted` today-ring (`availability-calendar.tsx:637`, whose comment says so:
*"Selected day = coral … today stays the neutral `--muted` ring"*).

The displayed grid is **September 2026**, and react-day-picker renders outside days: `2026-09-01` is
a **Tuesday**, so the first row is **Aug 30 · Aug 31 · Sep 1 …**, and the last row trails into early
October. **Today is inside that grid for roughly Aug 30 -> Oct 3.** This run started
`2026-08-29T20:12Z` = **`2026-08-30` 04:12 in Asia/Manila** — so **Aug 30 became "today" inside the
pinned September grid between the last green run and this one**, which is exactly a one-cell,
fixed-size, viewport-independent delta.

That predicts every observed number: `listing-detail` at all three widths and `listing-sheet-375`
(the same picker inside the overlay) move by the identical **173**; `collision-notice` moves by
**744 + 173**; `listing-lightbox` (a photo overlay, no calendar) and `checkout` (no calendar, no
header) **pass**; and it was green on 2026-08-26 because Manila was then Aug 26/27 and no grid cell
was today.

**Hypothesis status at this point: STRONG but not yet measured.** It is confirmed or refuted in
§ 2.3 by taking the bounding box of the changed pixels in the regenerated PNGs — if it lands on the
first-row outside-day cell of the September grid, it holds.

### 1.7.4 The decision to proceed with the dispatch, and why it is not "dispatching against a red tree"

The gate this task exists to be is *"the whole tree is green before a dispatch regenerates baselines
against it"*, because a dispatch fired against a broken tree mints PNGs that redefine correct from a
broken state (T-17-74 / T-17-76). Measured against that bar:

* **Three of four CI jobs are green**, and the local `build` / `tsc` / `verify-workflows` gate is
  green. Nothing is broken.
* `gate-visual`'s red is **the stale-reference red this plan exists to clear** — every failure is a
  pixel comparison against a reference, not a render failure, a missing snapshot or a connection
  error.
* **Every one of the 11 now has a stated cause written down BEFORE the mint.** That is the condition
  T-17-76 actually asks for; the prediction being *incomplete* was itself caught by this gate, which
  is the gate working.
* Not dispatching is strictly worse: it closes the phase over a red GATE-01, which is `[13-16]`
  verbatim.

Proceeding. The 173-px cause is carried into the diff review as a **finding to confirm and escalate**,
not as something the mint is allowed to absorb silently.

---

# 2 · The dispatch, and the diff READ file by file

## 2.1 The GENERATION run — recorded, and explicitly NOT the evidence

| Item | Value |
|---|---|
| Workflow | `.github/workflows/baselines.yml`, job `generate-baselines` |
| Trigger | `workflow_dispatch` (`gh workflow run baselines.yml --ref dev`) |
| **Generation run id** | **`33273465053`** |
| Conclusion | `success` |
| Ran against | `0d1ce9311a3fd6ac3f6af012341dc7105b29d59e` (`0d1ce93`) |
| Started / finished | `2026-08-29T20:25:44Z` / `2026-08-29T20:30:02Z` |
| Image | `mcr.microsoft.com/playwright:v1.60.0-noble` (pinned, unchanged) |
| Commit it produced | **`84d6c7766edab2c9212e88f8d069a47f9324cc1c`** (`84d6c77`), author `github-actions[bot]` |
| Files staged | **11**, reported by the job's own tripwire as `staged 11 baseline file(s)` |

> ### ⚠ RUN `33273465053` IS THE GENERATION RUN AND IS **NOT** THIS PHASE'S EVIDENCE.
> Its green means the surfaces rendered and the files landed. **Nothing compared against them.** Its
> push authenticated with `GITHUB_TOKEN`, so it triggered no workflow; the job says so itself in a
> `::warning::` on its own run page. Reading a pass off this id is `[13-16]` repeating. The evidence
> is in § 3.

**Twelve regenerated, eleven committed — and the twelfth is the answer to the flake.** The log shows
`… is re-generated, writing actual.` for **12** files, one of them `dev-theme-320-court`. Only 11
were staged, because the regenerated `dev-theme-320` was **byte-identical** to the committed one and
produced no diff. That is the independent confirmation that its pre-dispatch failure was a flake and
not a pixel change.

## 2.2 The commit's diff, checked against the three things that had to hold

| Check | Result |
|---|---|
| Every path ends `-visual-linux.png` | **yes** — `git show --name-only 84d6c77 \| grep -v -- '-visual-linux\.png$'` counts **0** |
| Zero `*-grove-*.png`, zero `*-win32.png`, zero `*-darwin.png` on disk after the pull | **0** (AC#26) |
| New files (`A`) or deletions (`D`) | **0 and 0** — all **11** are `M`. Disk count stays **36** |
| `EXPECTED_BLOCKED` / `EXPECTED_BASELINE_COUNT` | **24 / 78**, untouched; `wizard-cover-preview` still blocked |
| `playwright.config.ts` `updateSnapshots: "none"` | **line 78, unchanged and unconditional** |
| `git diff e439bf9..HEAD` over `playwright.config.ts`, `.github/workflows/`, `surfaces.spec.ts`, `visual-drive.ts`, `seed-baseline-fixtures.ts` | **EMPTY** |
| `node scripts/verify-workflows.mjs` | **exit 0** — one run command carries `--update-snapshots`, in `baselines.yml` |
| `git status --porcelain drizzle/` / `drizzle/*.sql` | empty / **26** (AC#32, GATE-06) |

**The prediction's file list was exactly right about what could NOT happen: zero PNGs were minted.**

## 2.3 THE DIFF, READ — measured per file, not accepted

Each regenerated PNG was decoded and compared against its pre-dispatch version pixel by pixel, and
the **bounding box of the changed pixels** recorded. A pixel count says *how much* moved; a bounding
box says *what*.

| File | Image | Changed px | Changed-pixel bbox | y-bands |
|---|---|---|---|---|
| `search-results-320` | 320×2968 | 1275 | x 40–126, y 497–727 | 497–512, 716–727 |
| `search-results-768` | 768×2080 | 1275 | x 44–130, y 461–691 | 461–476, 680–691 |
| `search-results-1280` | 1280×1690 | 1275 | x 537–1008, y 355–370 | 355–370 |
| `search-relax-band-320` | 320×1868 | 1275 | x 40–126, y 497–727 | 497–512, 716–727 |
| `search-relax-band-1280` | 1280×1260 | 1275 | x 537–1008, y 355–370 | 355–370 |
| `booking-not-found-1280` | 1280×800 | 1703 | **x 947–1191, y 18–45** | 18–45 |
| `listing-detail-320` | 320×3038 | 3697 | x 25–284, y 1382–1477 | **1382–1425, 1434–1477** |
| `listing-detail-768` | 768×2460 | 4180 | x 25–319, y 1480–1575 | **1480–1523, 1532–1575** |
| `listing-detail-1280` | 1280×2669 | 4180 | x 153–447, y 1650–1745 | **1650–1693, 1702–1745** |
| `listing-sheet-375` | 375×812 | 4180 | x 25–319, y 505–600 | **505–548, 557–600** |
| `collision-notice-1280` | 1280×2879 | 5883 | x 153–1191, y 794–1745 | **794–821**, 1650–1693, 1702–1745 |

*(The counts here are whole-pixel inequality; Playwright's reported 173 / 712 / 744 / 917 are its
own perceptual-threshold counts. The two agree on which files moved and on the grouping — 1275 on
all five search rows, 4180 on all three listing rows and the sheet — which is the property being
read.)*

**Then the regions were CROPPED and looked at**, old beside new. Three causes, each confirmed by an
image rather than by an argument.

### Cause 1 — the DS-09 padding, on the five `search-*` rows. **PREDICTED. Confirmed.**

Crop of `search-results-1280` at x 480–1080, y 320–400 shows the search bar's `When` / `From` / `To`
/ `Price` row. Old: `Any date` and `Any price` sit close to their box's left edge. New: both labels
and the calendar glyph sit **~6px further right**, inside boxes whose borders did not move.

That is exactly `size:default` `px-2.5` → `size:touch` `px-4` on the two popover triggers 17-05
converted, and it explains the otherwise puzzling shape of the bbox: a 16px-tall band rather than a
44px one, because the **button boxes are `w-full` / `min-w-[…]` and did not resize — only the glyphs
inside them moved**. 17-05's prediction was right in every particular, including which five files.

### Cause 2 — D-196's `ProfileLink`, on `booking-not-found` AND `collision-notice`. **HALF PREDICTED.**

Crop of `booking-not-found-1280` at x 900–1240, y 5–65: the signed-in cluster
`Booking ⌄ · 🔔 · Profile`. New vs old, the whole cluster sits **~12px further left** — the exact
consequence of `ProfileLink` going 16×16 → 28×28 in a right-aligned row. bbox height **28**, which
is the new control's height to the pixel.

The identical crop of `collision-notice-1280` at y 780–840 shows the **same** cluster and the **same**
shift. So `[17-D6]`'s *"at least one shootable baseline row renders that header"* was literally true
and practically an under-count: **two** shot rows do. Recorded in § 1.7.2; `checkout` is signed in
and does not, because that page renders no header at all.

### Cause 3 — **A WALL-CLOCK DEPENDENCY. NOT PREDICTED, NOT PHASE 17's, AND A REAL FINDING.**

Crop of `listing-detail-1280` at x 130–530, y 1600–1800 — the availability calendar's month grid:

```
OLD (baseline minted 2026-08-26)          NEW (regenerated 2026-08-30, Manila)
  16 17 18 19 20 21 22  (all grey)          16 17 18 19 20 21 22  (all grey)
  23 24 25 [26] 27 28 29                    23 24 25  26  27 28 29  (ALL grey now)
  30 31  1  2  3  4  5                     [30] 31  1  2  3  4  5
      ^ today-ring on 26                      ^ today-ring on 30
```

**The hypothesis in § 1.7.3 is CONFIRMED by the image, and sharpened in one respect: the grid is
AUGUST, not September.** `?date=2026-09-16` pins the *selected day* and the hour grid beneath it; it
does **not** pin which month the calendar opens on, and it does not pin `todayDate`. So:

* the **today-ring** moved from **26 Aug** to **30 Aug** — one cell in each of two different week rows;
* the **disabled past set** grew from *before 26* to *before 30*, greying out 26, 27, 28 and 29.

That is precisely two 44px-tall bands (the `h-11` day-cell height the calendar's own docblock
records) separated by an 8px gap, spanning the grid's full width — which is what the y-bands
column above shows on **all four** affected files, at four different viewport widths.

**Why it hits exactly these rows and no others:** `listing-detail` ×3 render the picker; `listing-sheet`
is the same picker inside the 375px overlay; `collision-notice` drives the same listing's calendar
*and* is signed in, which is why it alone carries **both** cause 2 and cause 3. `listing-lightbox`
(a photo overlay) and `checkout` (no calendar, no header) are untouched, and they passed.

#### ⚠ What this means, stated plainly rather than absorbed

1. **`gate-visual` has been red on `dev` since 2026-08-27 for this reason alone**, and nothing
   noticed, because nothing was pushed. The previous baselines were minted by dispatch
   `32925834322` at `2026-08-26T03:16Z` (Manila 11:16, Aug 26) and confirmed green by `ci` run
   `32945807603` at `08:03Z` the same Manila day. The first Manila day-rollover broke them. That is
   `[13-16]`'s lesson reproduced exactly, four days later, by a mechanism nobody had named.
2. **The four regenerated calendar baselines now encode "today = 30 August 2026" and will go red on
   the next Manila day-rollover.** The regeneration did not fix the determinism gap — it could not;
   it re-pinned it to a different day. **This is stated here so that a red on these four rows
   tomorrow is read as this known finding and not as a new regression.**
3. **It was NOT fixed inside this plan, deliberately.** The fix belongs in
   `e2e/helpers/visual-drive.ts` (pin the clock for the calendar-bearing rows, the way `checkoutDrive`
   already installs `page.clock`) or in the row's URL contract — an instrument change outside this
   plan's `files_modified`, affecting four baselines and requiring another regeneration. A
   post-regeneration commit invalidates the closing evidence and forces a re-run, which is why this
   plan is sequenced last. Escalated as a finding instead, in `deferred-items.md`.
4. **The `?date=` docblock in `visual-baselines.ts` is now known to be incomplete.** It claims the
   query parameter is *"WHAT MAKES THIS BASELINE DETERMINISTIC"*; measured, it pins the selected day
   and the hour grid but not the month grid, the today-ring or the disabled set. Correcting that
   sentence is part of the same escalation, not a drive-by edit here.

## 2.4 The `[A3]` verdict, post-dispatch

**`[A3]` is FALSIFIED, and the diff says so twice.** The assumption was that the signed-in header
renders on no shot surface. Two shot surfaces render it and **both moved**: `booking-not-found-1280`
(744px, header-only) and `collision-notice-1280` (917 = 744 header + 173 calendar). `[17-D6]`'s
prediction — *"a 12px-wider Profile control is the expected delta"* — held on both, and its
enumeration was one row short.

## 2.5 Verdict on the diff as a whole

| Row | Cause | Predicted? | Accepted? |
|---|---|---|---|
| `search-results` ×3, `search-relax-band` ×2 | DS-09 `size="touch"` padding (17-05) | YES | yes — confirmed by crop |
| `booking-not-found-1280` | D-196 `ProfileLink` `p-1.5` (17-06) | YES | yes — confirmed by crop |
| `collision-notice-1280` | D-196 **plus** the wall clock | header half only | yes, **with the finding recorded** |
| `listing-detail` ×3, `listing-sheet-375` | the wall clock alone — **not Phase 17's pixels** | NO | yes, **with the finding recorded** |

**Nothing in this diff is unexplained.** Every changed file has a cause identified from an image, and
the one cause nobody predicted is escalated rather than absorbed.

---

# 3 · THE CLOSING EVIDENCE — the green COMPARISON run on the phase's head commit (D-202)

## 3.1 How the comparison was forced, since nothing triggers it by itself

The generation job's push authenticated with `GITHUB_TOKEN`, so it created **no** workflow run — the
fact `baselines.yml`'s header calls *"the half people miss"*. At `84d6c77` the new PNGs existed and
nothing had ever compared against them.

`ci.yml` declares no `workflow_dispatch`, so a re-dispatch of it is not available; its trigger is
`push: branches: [dev, main]` with **no path filter**. The forcing action was therefore a **push of a
real commit** — `708de3a`, the `.planning/`-only commit carrying § 2's diff review — which is
functionally identical to the plan's `git commit --allow-empty` (a non-`GITHUB_TOKEN` push to `dev`)
and strictly better in one respect: **the commit the gate compares is also the commit that carries
the written review of what it is comparing.**

## 3.2 The run

| Item | Value |
|---|---|
| **COMPARISON run id** | **`33273927029`** |
| Workflow / event | `ci` / `push` |
| **Conclusion** | **`success`** |
| **Head SHA it ran against** | **`708de3a9bc108cdc33a7fc637dadb63bb0e06d4b`** (`708de3a`) |
| Started / finished | `2026-08-29T20:36:26Z` / `2026-08-29T20:43:10Z` |
| `gate-visual (GATE-01 visual regression)` | **success** — **43 passed / 42 skipped / 0 failed** |
| `gate-db-free (lint + design + build + workflow parse)` | **success** |
| `gate-db (vitest against PostGIS 18)` | **success** |
| `gate-price-parity (DB-vs-DOM price, 1 spec)` | **success** |

**All four jobs green.** The 42 skipped are the declared blocked rows (`EXPECTED_BLOCKED` = 24
surfaces expanding to 42 baseline rows), which the inventory assertion at `surfaces.spec.ts:321`
checks *by name* in the same run — so a skipped row is a declared decision and not a silently absent
surface (D-201).

`gate-visual` went **11 failed → 0 failed** across exactly the 11 files the generation commit
touched, and **no other row moved** in either direction.

> ### THIS — run `33273927029`, green, on `708de3a` — IS PHASE 17's CLOSING EVIDENCE UNDER D-202.
> The generation run `33273465053` is recorded in § 2.1 and is **explicitly not** the evidence.
> `[13-16]` is the reason that distinction is spelled out twice rather than once.

## 3.3 What lands after the comparison, and why it does not invalidate it

The plan's rule is that nothing may land after the recorded comparison run, because a
post-regeneration commit invalidates the evidence. Honoured as follows, and stated so it is
checkable rather than asserted:

* **No code, test, workflow, config, schema or baseline commit lands after `708de3a`.**
* The only commits after it are this section, the plan's `SUMMARY.md`, and the hand-edited
  `STATE.md` / `ROADMAP.md` position lines — **all under `.planning/`**, none of which any job in
  `ci.yml` reads and none of which can change a rendered pixel.
* The check that proves it: `git diff 708de3a..HEAD -- . ':(exclude).planning'` prints **nothing**.
  Recorded in the plan's SUMMARY with its measured output.

So the tree `33273927029` compared is byte-identical, outside `.planning/`, to the tree at the end of
this phase.

## 3.4 The AC roll-call for this plan, measured

| Criterion | Result |
|---|---|
| **AC#25** — regeneration only via `baselines.yml` in the pinned image, `updateSnapshots: "none"` unchanged | **holds** — one dispatch, `mcr.microsoft.com/playwright:v1.60.0-noble`, `playwright.config.ts:78` byte-unchanged since `e439bf9` and unconditional |
| `--update-snapshots` appears in no run command outside `baselines.yml` | **holds** — `verify-workflows.mjs` exit 0 over the parsed tree; `ci.yml` line count **0** |
| **AC#26** — zero grove, zero `win32`, zero `darwin` baselines on disk | **holds** — `0`; disk count **36**, every file `*-court-visual-linux.png` |
| **AC#27 / D-202** — a green COMPARISON run on the phase's head commit, id recorded, generation run labelled as not the evidence | **holds** — `33273927029` green on `708de3a`; `33273465053` labelled in § 2.1 |
| Every changed PNG predicted in writing, or investigated and explained | **holds** — 6 of 11 predicted and confirmed by crop; the other 5 investigated to an image and escalated as `[17-D26]` |
| **AC#32** — zero schema migrations proposed or absorbed | **holds** — `git status --porcelain drizzle/` empty, `drizzle/*.sql` = **26** |
| No commit lands after the recorded comparison run | **holds for everything outside `.planning/`** — see § 3.3 |

## 3.5 The one thing a reader must carry away from this file

Two of the three causes in this diff were predicted and confirmed. **The third was not predicted by
anyone, is not Phase 17's code, and is the finding worth more than the round-trip itself:** the
availability calendar renders the real venue-local *today*, so four GATE-01 baselines have a
**one-day shelf life**, and `gate-visual` had already been red on `dev` since 2026-08-27 for that
reason alone with nobody watching. The regeneration re-pinned it to 30 August 2026 rather than fixing
it — **it could not fix it, and did not pretend to.** Full write-up, mechanism, timeline and the
cheapest correct fix: `[17-D26]` in this phase's `deferred-items.md`.

---

# 4 · The PM promoted `[17-D26]` to in-scope — and the prescribed fix was measured and refuted

## 4.1 The decision, and what it authorised

At the D-199 checkpoint the PM **promoted `[17-D26]` from deferred to in-scope**, approved the other
25 as filed, and explicitly overrode the three reasons this plan declined the fix:
`e2e/helpers/visual-drive.ts` was put in scope despite not being in `files_modified`, and a **second
regeneration plus a second comparison** were authorised, with run `33273927029` to be superseded by
the new comparison.

Their reasoning, recorded because it is correct: *a gate whose baselines expire within a day trains
its readers to expect red, and closing the phase on evidence known to be false tomorrow is worse than
spending another CI cycle.*

**The instruction was followed to the letter up to the point where it stopped being possible**, which
is the first step: measure before you write.

## 4.2 The measurement that stopped it

The prescribed fix was to set `needsClock` on `listingDetailDrive`, `sheetDrive` and `collisionDrive`
and pin `page.clock` to a literal instant. That prescription came from **this plan's own ledger
entry**, so the error is this plan's, not the PM's — they adopted a recommendation that was written
without being tested.

Probed on **2026-08-30** against the running dev server on `localhost:3000` and the local
`uat_listing_bookable` fixture, launching Chromium twice against
`/listings/uat_listing_bookable?date=2026-09-16` — once bare, once with
`page.clock.install({ time: new Date("2026-11-05T04:00:00Z") })` called **before the first
navigation**, exactly the way `surfaces.spec.ts:438` does it:

| Reading | no clock | clock at **2026-11-05** | moved? |
|---|---|---|---|
| `new Date().toISOString()` **inside the page** | `2026-08-30T05:15:08Z` | `2026-11-05T04:00:01Z` | **YES** — the clock really was installed |
| the cell carrying `data-today="true"` | **30** | **30** | **no** |
| the month caption | **August 2026** | **August 2026** | **no** |
| `button[disabled]` count in the calendar | **29** | **29** | **no** |

**The browser clock moved by more than two months and not one rendered pixel of the calendar followed
it.**

*(Two things worth keeping from the control run: it independently reproduces the finding on a
**different** listing — today-ring on **30**, caption **August**, 29 disabled — and it shows the
probe was capable of detecting a change, since the in-page `Date` did move. A probe that cannot
detect the thing it is looking for proves nothing, so both halves are reported.)*

## 4.3 Why it cannot work — structural, not a tuning problem

`/listings/[id]` is an **RSC**. `todayLocal` is computed on the **server** at
`src/app/listings/[id]/(detail)/page.tsx:394` (`const now = new Date()`); `todayStart` and
`horizonEnd` are built from it at `:415-427` and handed to the client component as `startMonth`,
`endMonth` and `disabled`. `page.clock` emulates time **in the browser**, and cannot reach a value
computed in the Node process before the HTML was sent.

`checkoutDrive` is a genuine precedent for `page.clock` — for controlling a **client-side
`setInterval`** (the hold countdown). That is a different problem, and the resemblance is what made
the wrong prescription look right.

**Consequence: there is no fix available inside the authorised file.** A drive controls the URL, the
viewport, storage, cookies and interactions. None of those reaches the server's clock. Implementing
`needsClock` on the three drives would have produced a change that compiles, passes review, regenerates
cleanly, goes green once — and fixes nothing, with the defect now wearing a fix's clothes. That is a
worse outcome than the finding staying open.

## 4.4 What was NOT done, and why

**No second regeneration was dispatched.** The tree is unchanged, so a second dispatch would
regenerate the same four calendar rows against a *new* wall-clock reading — re-pinning the defect to
a different day, burning the recorded closing evidence, and leaving the gate exactly as fragile. The
PM's authorisation to spend another CI cycle was authorisation to spend it on a **fix**; there is no
fix to spend it on yet.

**`33273927029` therefore stands as the phase's closing evidence and is NOT superseded**, because
nothing that would supersede it was produced. `origin/dev` is still `708de3a`, the exact commit it
ran against.

**`[17-D26]` was NOT moved to the `# Fixed in place` closure record.** That record is a *closure*
record; moving an unfixed finding into it would make the one checkable thing in this document false.
It stays in the findings list, now carrying the PM's promotion, the refutation above, and the three
options below.

## 4.5 The decision the PM now owns — three options, measured costs

| # | Fix | What it costs | Result |
|---|---|---|---|
| **1** | A **dev-only "today" seam** in `page.tsx`, honoured only when `NODE_ENV !== "production"` — the pattern `?theme=` already uses *"outside production"* (D-08) and `allowedDevOrigins` already uses in `next.config.ts`. Both visual jobs boot with `npm run dev`, so it is live where needed and inert in production. | A production `src/` change on the public listing page. **Rule-4 architectural call.** | Calendar stays fully pixel-covered **and** becomes deterministic. **Recommended.** |
| **2** | **Pin the server clock in the two visual jobs** (`libfaketime`, or the container date, around the `npm run dev` the Playwright `webServer` boots). | A new package inside the one job carrying `contents: write` — `baselines.yml`'s header calls that *"a supply-chain decision to raise explicitly, not to absorb"* (T-11-SC). Also shifts "now" relative to the fixture's fixed September instants. | Works, but buys it in the most dangerous file in the repository. |
| **3** | **Mask the calendar** — `toHaveScreenshot({ mask: […] })` on the four calendar-bearing rows. | `e2e/visual/surfaces.spec.ts` plus a declaration in `visual-baselines.ts`. **Removes the availability calendar from GATE-01 coverage on four rows.** | Cheapest to build, worst to own: buys determinism by deleting the coverage this phase exists to defend. |

**Not an option: widening a pixel threshold.** The row's own comment names that as the wrong answer,
and it is right — it converts a real regression detector into a rubber stamp.

## 4.6 Status

- **Phase 17's closing evidence is unchanged: comparison run `33273927029`, green, on `708de3a`.**
- `[17-D26]` is **promoted, open, and blocked on the PM's choice of option** — no longer merely
  deferred input, and recorded as such in `deferred-items.md`.
- The ledger's D-199 statement now reads *"may close green around **25 of the 26**"*, naming the
  twenty-sixth as promoted.
- **The four calendar baselines still encode "today = 30 August 2026" and will be red at the next
  Manila day-rollover.** That was true before this section and is still true; what changed is that it
  is now a known, promoted, owned item rather than a deferred one.

---

# 5 · Round 2 — the `?today=` seam, proven before it was trusted

The PM chose **option 1** from § 4.5. This section is the second round-trip, written in the same
order as the first: prove the mechanism, write the prediction, dispatch, read the diff, force the
comparison.

## 5.1 What was built

| File | Change |
|---|---|
| `src/lib/dev/today-override.ts` | **new.** `devTodayOverride(raw)` — returns `null` in production always, otherwise the shared strict `parsePickedDate` result. Two guards, both documented on the line that ships them. |
| `src/app/listings/[id]/(detail)/page.tsx` | `today?: string` added to the `searchParams` type; `todayLocal` becomes `devTodayOverride(sp.today) ?? <the wall-clock read>` at the **single origin** (`:394`), so `todayStart`, `horizonEnd` and the `initialDate` fallback all move together. |
| `e2e/helpers/visual-drive.ts` | `listingUrl()` appends `&today=${VRT_COLLISION.dayIso}` — one origin, reached by all six call sites. |
| `tests/security/dev-today-override.test.ts` | **new.** 17 assertions: production inertness with a positive control, the guard's spelling and position, the single-env-read property, the parse/reject table, and blast radius. |

**It follows the D-08 precedent rather than inventing a second idiom**, deliberately and in three
specific ways: the guard is `process.env.NODE_ENV === "production"` (a **build-time constant** the
bundler inlines and prunes, *not* an operator-settable env var that could be flipped on a live
deploy); the value is **parsed by the shared parser, never cast** — `parsePickedDate`, the same one
the searched-window contract already uses for the same `YYYY-MM-DD` shape, regex-anchored and
round-trip guarded so `2026-02-31` is rejected; and the reasoning lives beside the code it governs.

## 5.2 THE MECHANISM WAS WATCHED WORKING BEFORE A PREDICTION WAS WRITTEN

This is the bar the last round set, and it is met before anything else happened. Probed against the
running dev server and the local `uat_listing_bookable` fixture:

| URL | month caption | disabled cells | today cell |
|---|---|---|---|
| `?date=2026-09-16` (no override) | **August 2026** | **29** | **30** |
| `?date=2026-09-16&today=2026-09-16` | **September 2026** | **15** | (see note) |
| `?date=2026-09-16&today=2026-02-31` | **August 2026** | **29** | **30** |
| `?date=2026-09-16&today=not-a-date` | **August 2026** | **29** | **30** |

**All three readings moved, and both malformed values were inert** — an impossible calendar date and
a garbage string both fall back to the wall clock rather than throwing or 404ing. Compare the
refuted `page.clock` prescription in § 4.2, where the browser clock moved two months and **nothing**
followed.

*Note on the today cell:* under the override, today (`2026-09-16`) **coincides with the selected
day**, so the cell carries `data-selected-single="true" … aria-label="Wednesday, September 16th,
2026, selected"` and the `data-today` marker sits on its wrapper. Recorded because it has a
consequence for coverage: **the today-ring and the coral selected style overlap on the pinned day, so
the ring is not separately visible in the new references.** Pinning `today` a day or two *before*
`VRT_COLLISION.dayIso` would show both states. The PM's instruction named the fixture's own day and
that is what shipped; this is flagged as a cheap future improvement, not a defect.

## 5.3 PRODUCTION INERTNESS — measured end-to-end, not asserted

The PM asked for proof rather than a claim. A production build was started on port 3101
(`next start`, the same build `npm run build` produced) and the **identical probe** was run against
both servers:

| Server | no override | `&today=2026-09-16` | override honoured? |
|---|---|---|---|
| **dev** `:3000` | `August 2026` · 29 disabled · today 30 | `September 2026` · **15** disabled | **YES** |
| **prod** `:3101` | `August 2026` · 29 disabled · today 30 | `August 2026` · **29** disabled · today 30 | **NO** |

**In production the parameter changes nothing at all — the two readings are identical in every
field.** This is the whole property, demonstrated on the real route by a real production build,
rather than inferred from a source grep.

**How production reachability is prevented, stated for the record:** `process.env.NODE_ENV` is a
**build-time constant**. The production bundler substitutes the literal `"production"`, the guard
becomes `if ("production" === "production") return null;`, and the parse below it is dead code that
is eliminated — so the affordance is not merely skipped at runtime, it is **absent from the
production bundle**. It is deliberately not keyed off a bespoke env var, because an env var can be
flipped on a live deploy and a build-time constant cannot. `tests/security/dev-today-override.test.ts`
pins the guard's exact spelling, pins that it is the **first statement** in the function, and pins
that the module reads **no other environment variable at all** — so a later refactor cannot quietly
turn a request parameter into something that steers a production render without failing a gate.

## 5.4 The local gates, re-run because `src/` moved

| Check | Result |
|---|---|
| `npm run build` (lint + design + `next build`) | **exit 0**; design suite **66 files, 1248 passed / 3 skipped** |
| `npx tsc --noEmit` | **exit 0** |
| `npm test` — run **alone**, after the build, never concurrently | **exit 0** — **186 files, 2165 passed / 5 skipped** |
| `tests/security/dev-today-override.test.ts` | **17 passed** |

⚠ **One self-inflicted red, and it is the `[17-D20]` defect class for the third time in this plan.**
The first draft of the "reads no other environment variable" assertion scanned the whole source file
and failed against the *correct* module, because the header necessarily **names** the variable it is
explaining. Re-run alone first (never trust a red straight after a build) — it reproduced, so it was
real. Fixed by scanning **code lines only**, which is also the stronger assertion: a comment cannot
read an env var, so including comments could only ever produce a false red.

## 5.5 THE PREDICTION — written before the dispatch

### 5.5.1 Predicted CHANGED — exactly five files

| # | Baseline | Why |
|---|---|---|
| 1 | `listing-detail-320-court-visual-linux.png` | the calendar switches from **today's** month to the **pinned** month |
| 2 | `listing-detail-768-court-visual-linux.png` | same |
| 3 | `listing-detail-1280-court-visual-linux.png` | same |
| 4 | `listing-sheet-375-court-visual-linux.png` | the same picker inside the 375px overlay |
| 5 | `collision-notice-1280-court-visual-linux.png` | same listing, same calendar |

**Predicted SHAPE, and it is much larger than last round's delta.** Round 1 moved a today-ring one
cell and greyed four days — 173px. This changes **the whole month grid**: from *August 2026* (ring on
30, everything before Aug 30 disabled) to *September 2026* (Sep 16 selected **and** today, everything
before Sep 16 disabled). Measured on the probe as **29 → 15** disabled cells and a different caption.
So a **large** diff on these five rows is the expected result; a *small* one would be the surprise.

### 5.5.2 Predicted UNCHANGED — and the two interesting ones have EVIDENCE, not an argument

`listingUrl()` is shared, so **six** call sites now emit `&today=`, but only five baselines can move:

* **`listing-lightbox-1280` — predicted UNCHANGED.** Its URL gains the parameter, but its capture is
  the lightbox over a scroll-locked body. **The evidence is empirical rather than architectural:** it
  **passed** in run `33272796552` on 2026-08-30, at a moment when the calendar behind it had
  demonstrably moved from Aug 26 to Aug 30 and four other rows failed for exactly that reason. A
  surface that ignored a calendar change once will ignore this one.
* **`checkout-320` / `checkout-1280` — predicted UNCHANGED.** `listingUrl(slot)` is only the staging
  navigation; the captured document is `/listings/[id]/book`, which does not read `today`. Same
  empirical evidence: both passed in `33272796552` while the calendar moved.
* **`booking-not-found-1280` — predicted UNCHANGED.** Different route, does not use `listingUrl()`.
* **The five `search-*` rows — predicted UNCHANGED.** Round 1's padding change is already in the
  references; nothing here touches them.
* **All remaining rows — predicted UNCHANGED.**

### 5.5.3 Predicted NEW — ZERO

`EXPECTED_BLOCKED` stays **24**, `EXPECTED_BASELINE_COUNT` stays **78**, disk stays **36**,
`wizard-cover-preview` stays blocked. **A newly minted PNG is a finding, not an outcome.**

## 5.6 The pre-dispatch CI run — the prediction confirmed BEFORE anything was minted

**Run [`33295272924`](https://github.com/pengr3/FitOut/actions/runs/33295272924)** — `ci` / `push`,
head **`c7f1a1a`** (the seam commit).

| Job | Conclusion |
|---|---|
| `gate-db-free (lint + design + build + workflow parse)` | **success** |
| `gate-db (vitest against PostGIS 18)` | **success** |
| `gate-price-parity (DB-vs-DOM price, 1 spec)` | **success** |
| `gate-visual (GATE-01 visual regression)` | **failure** — **5 failed / 38 passed / 42 skipped** |

**The five failures are the five predicted rows, and nothing else:** `listing-detail-320`,
`listing-detail-768`, `listing-detail-1280`, `listing-sheet-375`, `collision-notice-1280`.
Magnitudes **3121 px** on the listing rows and **7357 px** (ratio 0.03) on the sheet — **large**, as
§ 5.5.1 predicted, against round 1's 173.

**Every row predicted UNCHANGED passed**, including the two that were predicted from empirical
evidence rather than from architecture: `listing-lightbox-1280` and both `checkout` rows, whose URLs
gained `&today=` and whose pixels did not move. **Zero unpredicted failures. Zero predicted failures
that did not occur.**

## 5.7 The GENERATION run — recorded, and again explicitly NOT the evidence

| Item | Value |
|---|---|
| **Generation run id** | **`33295540219`** |
| Conclusion | `success` |
| Ran against | `c7f1a1aaa5082cb44746ed495ec39319a84d50f8` (`c7f1a1a`) |
| Started | `2026-08-30T05:49:41Z` |
| Commit produced | **`bac4b62da7121ce7f9aa0ec7b682389f0db8fa2b`** (`bac4b62`), author `github-actions[bot]` |
| Files staged | **5** — the job's own tripwire reported `staged 5 baseline file(s)` |

> **Run `33295540219` is the generation run and is NOT the evidence.** Same reason as § 2.1: its push
> used `GITHUB_TOKEN` and triggered nothing, so at `bac4b62` the new PNGs existed and nothing had
> compared against them.

| Check | Result |
|---|---|
| Every path ends `-visual-linux.png` | **yes** — non-PNG paths in the commit: **0** |
| Status letters | **5 × `M`**, `A` **0**, `D` **0** |
| Disk count / grove / `win32` / `darwin` | **36** / **0** / **0** / **0** (AC#26) |
| `EXPECTED_BLOCKED` / `EXPECTED_BASELINE_COUNT` | **24** / **78**, unmoved; `wizard-cover-preview` still blocked |

**The prediction held exactly: five predicted, five changed, five committed, zero minted.**

## 5.8 The diff, READ — and one sub-shape that was not predicted

| File | Changed px | Bounding box |
|---|---|---|
| `listing-detail-1280` | 9729 | x 144–469, y 1372–1754 |
| `collision-notice-1280` | 9729 | x 144–469, y 1372–1754 |
| `listing-sheet-375` | 20895 | x 16–341, y 228–811 |
| `listing-detail-320` | — | **image height 3038 → 2986** |
| `listing-detail-768` | — | **image height 2460 → 2408** |

**⚠ Two files changed SIZE, and that was not in the prediction.** Both shrank by exactly **52px**.
Investigated rather than accepted, and it is an arithmetic consequence of the change that *was*
predicted: **August 2026 needs six week rows** (Aug 1 is a Saturday, so the grid runs Jul 26 → Sep 5)
and **September 2026 needs five** (Sep 1 is a Tuesday, Aug 30 → Oct 3). One fewer 44px row plus its
gap is 52px, and a `fullPage` capture is as tall as the document. At 1280 the height is unchanged
because the calendar sits in the `md:grid-cols-[auto_1fr]` two-column layout where the taller column
sets the height; the sheet is a fixed 812px viewport capture. **Predicted row, unpredicted
sub-shape** — recorded as such rather than folded into the prediction after the fact.

**The crop, old beside new** (`listing-detail-320`, x 10–310, y 1280–1700):

```
OLD  (today = the wall clock, 30 Aug)        NEW  (today pinned to 2026-09-16)
   9 10 11 12 13 14 15   (grey)                13 14 15 [16] 17 18 19   <- 16 CORAL = selected
  16 17 18 19 20 21 22   (grey)                20 21 22  23  24 25 26
  23 24 25 26 27 28 29   (grey)                27 28 29  30   1  2  3
 [30] 31  1  2  3  4  5  <- ring on 30
  ─────────────────────────────────────────────────────────────────────────
  "Wednesday, Sep 16"  + the hour grid         "Wednesday, Sep 16"  + the hour grid
```

**The new reference is not merely deterministic, it is a better picture of the product.** The old one
photographed an incoherent state: the hour grid said *Wednesday, Sep 16* while the calendar above it
displayed **August** and highlighted **30** — the selected day was not visible at all. The new one
shows September with the 16th selected in coral, directly above the hours it belongs to. That was a
consequence of pinning today, not a goal of it, and it is recorded because it is the kind of thing a
reviewer should be told rather than left to notice.

**The one coverage note, carried from § 5.2:** today and the selected day now coincide, so the coral
selected style sits on top of the neutral today-ring and the ring is not separately visible in these
references. Pinning `today` one or two days before `VRT_COLLISION.dayIso` would show both states.
Flagged for the PM; not changed here, because the instruction named the fixture's own day and
changing it would need a third round-trip.

**Verdict: nothing in this diff is unexplained.** Five files, all predicted; two sub-shapes
(the 52px height change) investigated to an arithmetic cause and confirmed by crop.

---

# 6 · THE CLOSING EVIDENCE — round 2, and it supersedes round 1

## 6.1 The run

| Item | Value |
|---|---|
| **COMPARISON run id** | **`33295755823`** |
| Workflow / event | `ci` / `push` |
| **Conclusion** | **`success`** |
| **Head SHA it ran against** | **`085eb073842bbe061be09792b40276174b9527c3`** (`085eb07`) |
| Started / finished | `2026-08-30T05:55:56Z` / `2026-08-30T06:02:30Z` |
| `gate-visual (GATE-01 visual regression)` | **success** — **43 passed / 42 skipped / 0 failed** |
| `gate-db-free (lint + design + build + workflow parse)` | **success** |
| `gate-db (vitest against PostGIS 18)` | **success** |
| `gate-price-parity (DB-vs-DOM price, 1 spec)` | **success** |

Forced the same way as round 1 and for the same reason — the generation push used `GITHUB_TOKEN` and
triggered nothing, and `ci.yml` has no `workflow_dispatch` — by pushing the real commit that carries
§ 5.8's diff review.

> ### RUN `33295755823`, GREEN, ON `085eb07`, IS PHASE 17's CLOSING EVIDENCE (D-202).
> Generation run `33295540219` is recorded in § 5.7 and is **explicitly not** the evidence.

## 6.2 ⚠ Run `33273927029` is SUPERSEDED — recorded, not deleted

§ 3 recorded comparison run **`33273927029`** (green, on `708de3a`) as the closing evidence, and at
the time it was exactly that: a real green comparison on the head commit. **It is superseded rather
than wrong**, and the distinction is the whole point of `[17-D26]`:

* It was green **on the day it ran**, and would have gone red at the next venue-local day-rollover,
  because the four calendar baselines it compared encoded *today = 30 August 2026*.
* § 3 said so at the time — *"the four regenerated calendar baselines now encode 'today = 30 August
  2026' and will be red at the next Manila day-rollover"*. The PM read that sentence and promoted the
  finding rather than accepting the evidence.
* **Run `33295755823` is green on baselines that no longer depend on the clock at all.** That is a
  strictly stronger claim than `33273927029` could make, and it is the reason the second CI cycle was
  worth spending.

Kept in this document because deleting a superseded run would hide the one decision that made this
phase's evidence trustworthy.

## 6.3 What lands after the comparison

Same rule, same proof shape as § 3.3: **no code, test, workflow, config, schema or baseline commit
lands after `085eb07`.** The only commits after it are this section, the SUMMARY addendum and the
hand-edited `STATE.md` / `ROADMAP.md` position lines — all under `.planning/`, none read by any job in
`ci.yml`. The check: `git diff 085eb07..HEAD -- . ':(exclude).planning'` prints **nothing**.

## 6.4 The AC roll-call, re-measured at the end of round 2

| Criterion | Result |
|---|---|
| **AC#25** — regeneration only via `baselines.yml` in the pinned image; `updateSnapshots: "none"` unchanged and unconditional | **holds** — `playwright.config.ts:78` byte-unchanged since `e439bf9` |
| `--update-snapshots` in exactly one run command, in `baselines.yml` | **holds** — `verify-workflows.mjs` exit 0 |
| **AC#26** — zero grove / `win32` / `darwin` baselines | **holds** — **0**; disk **36** |
| **AC#27 / D-202** — a green COMPARISON run on the head commit, id recorded, generation run labelled as not the evidence | **holds** — `33295755823` on `085eb07` |
| Every changed PNG predicted in writing before the dispatch | **holds** — **5 predicted, 5 changed, 0 unpredicted**; one unpredicted *sub-shape* (the 52px height change) investigated and explained |
| No newly minted PNG | **holds** — 5 × `M`, 0 × `A` |
| No pixel threshold widened | **holds** — no `maxDiffPixels` / `threshold` anywhere in the diff |
| **AC#32** — zero schema migrations | **holds** — `drizzle/` clean, **26** `.sql` |

## 6.5 The state of `[17-D26]`

**Fixed, proven, and moved to the closure record.** The ledger's findings list is back to **25**, all
escalate-class, all input to next-milestone decisions and blocking nothing. The one coverage note left
open — the pinned day is also the selected day, so the today-ring is not separately visible — is
recorded in the closure entry as a cheap future improvement, not a defect.

---

# 7 · Round 3 — the code-review remediation, and the comparison that re-establishes the evidence

## 7.1 Why there is a round 3 at all, and why it is a COMPARISON and not a regeneration

The phase's code review (`17-REVIEW.md`) found six warnings. The PM authorised five, and fixing them
moved the tree off `085eb07` — the exact commit § 6 records as the closing evidence. That is
authorised, and it carries an obligation: **the evidence has to be re-established on the new head.**

**It is re-established by a comparison, NOT by a regeneration, and that is a prediction rather than a
convenience.** Every one of the five fixes is an ARIA attribute, a docblock or a test. The falsifiable
form of that claim is exactly the one this document has used twice already:

> **If any baseline PNG had moved, that would be a FINDING — one of these "renders no pixels" fixes
> renders pixels — and not something to absorb by regenerating.** No `baselines.yml` dispatch was
> fired. No threshold was widened. `updateSnapshots: "none"` stays unconditional.

## 7.2 What landed, and the mechanical proof that no pixel could follow

Five commits, one per finding, on top of `085eb07`:

| Commit | Finding | Files |
|---|---|---|
| `6d7c315` | **WR-06** | `ui/progress.tsx` (forward `value` to Root), `wizard.tsx` (docblock), `tests/design/progress-value.test.tsx` (new) |
| `ba21d38` | **WR-05** | `listing-card.tsx`, `(host)/host/listings/page.tsx`, `deferred-items.md` — **all comment-only in `src/`** |
| `040205d` | **WR-01** | `tests/security/dev-today-override.test.ts` |
| `3ba7e6e` | **WR-02 / WR-03** | `tests/security/dev-today-override.test.ts` |
| `247d1e4` | — | `17-REVIEW.md` resolution record |

| Check | Result |
|---|---|
| `git diff 085eb07..HEAD --stat -- '*.png'` | **0 lines** — not one baseline byte moved |
| `git diff 085eb07..HEAD --stat -- . ':(exclude).planning'` | **6 files, +538 / −46** — two `src/` comment-only, one `src/` one-line ARIA prop, one `src/` docblock, two test files |
| The only rendered change in the whole diff | `progress.tsx` gains `value={value}` on `ProgressPrimitive.Root`, which adds `aria-valuenow` / `aria-valuetext` / `data-state` / `data-value` **attributes**. Checked: nothing in `globals.css` or any component selects on `[data-state]` for a progress bar, and the indicator's `translateX` is byte-unchanged |
| The one `src/` surface with a rendered element at all | `/host/listings/[id]/edit` — a **blocked** row; no baseline shoots the wizard |
| `EXPECTED_BLOCKED` / `EXPECTED_BASELINE_COUNT` / disk count | **24 / 78 / 36**, all unmoved |
| `playwright.config.ts:78` | `updateSnapshots: "none"` — unconditional, byte-unchanged since `e439bf9` |

## 7.3 The local gates, re-run because `src/` moved

| Check | Result |
|---|---|
| `npm run build` (lint + `test:design` + `next build`) | **exit 0** |
| `npm test` — run **ALONE**, after the build, never concurrently | **exit 0** — **186 files, 2169 passed / 5 skipped** |
| — the delta from § 5.4's `2165 passed` | **+4**: 7 new in `tests/design/progress-value.test.tsx` (design config, counted separately) and the security file going 17 → 21 assertions |
| `tests/security/dev-today-override.test.ts` | **21 passed** (was 17) |

## 7.4 THE RUN

| Item | Value |
|---|---|
| **COMPARISON run id** | **`33298297450`** |
| Workflow / event | `ci` / `push` |
| **Conclusion** | **`success`** |
| **Head SHA it ran against** | **`247d1e4c1abd6fc9324a149289af5bfc0c193149`** (`247d1e4`) |
| Started / finished | `2026-08-30T07:03:06Z` / `2026-08-30T07:08:26Z` |
| `gate-visual (GATE-01 visual regression)` | **success** — **43 passed / 42 skipped / 0 failed** |
| `gate-db-free (lint + design + build + workflow parse)` | **success** |
| `gate-db (vitest against PostGIS 18)` | **success** |
| `gate-price-parity (DB-vs-DOM price, 1 spec)` | **success** |

**43 / 42 / 0 — identical to run `33295755823`, row for row.** No baseline changed on disk *and* the
running app still renders every one of the 43 shot rows pixel-identically to its committed reference.
Those are two different statements and both are needed: the first says the remediation did not touch
the references, the second says it did not touch the pixels either.

**No dispatch of `baselines.yml` was fired in this round.** There is no generation run to label,
because nothing was generated — which is the point of § 7.1's prediction holding.

*(One thing checked so it is not mistaken for new: the `gate-visual` log carries **2**
`Hydration failed` lines from the dev `WebServer`. Run `33295755823` carries **2** as well — measured,
`grep -c` on both logs. Pre-existing and unmoved by this remediation.)*

> ### RUN `33298297450`, GREEN, ON `247d1e4`, IS PHASE 17's CLOSING EVIDENCE (D-202).

## 7.5 ⚠ Run `33295755823` is SUPERSEDED — recorded, not deleted

§ 6 recorded comparison run **`33295755823`** (green, on `085eb07`) as the closing evidence, and it
was exactly that. It is **superseded rather than wrong**, and for a different reason than § 6.2's:

* `33273927029` was superseded because the tree it compared had a **defect** — clock-dependent
  baselines that would go red at the next day-rollover.
* `33295755823` had no such flaw. It is superseded only because **the tree moved underneath it**: the
  code review's five authorised fixes landed after it, so the commit it ran against is no longer the
  head. Its green is still true of `085eb07`; it simply no longer speaks for what ships.
* `33298297450` makes the **same** GATE-01 claim — 43 / 42 / 0 — about a head that also carries the
  remediation. Strictly more, about strictly more code.

Kept because the chain `33273927029 → 33295755823 → 33298297450` is the readable history of why this
phase's evidence is trustworthy, and deleting a link hides a decision.

## 7.6 What lands after the comparison

Same rule and same proof shape as § 3.3 and § 6.3: **no code, test, workflow, config, schema or
baseline commit lands after `247d1e4`.** The only commit after it is this section — `.planning/` only,
read by no job in `ci.yml`, and unable to change a rendered pixel. The check:
`git diff 247d1e4..HEAD -- . ':(exclude).planning'` prints **nothing**.

## 7.7 The AC roll-call, re-measured at the end of round 3

| Criterion | Result |
|---|---|
| **AC#25** — regeneration only via `baselines.yml` in the pinned image; `updateSnapshots: "none"` unchanged and unconditional | **holds** — and vacuously so this round: **no regeneration was dispatched at all**. `playwright.config.ts:78` byte-unchanged since `e439bf9` |
| **AC#26** — zero grove / `win32` / `darwin` baselines | **holds** — **0**; disk **36** |
| **AC#27 / D-202** — a green COMPARISON run on the head commit, id recorded | **holds** — `33298297450` on `247d1e4` |
| Every changed PNG predicted in writing | **holds, in its strongest form** — **zero** PNGs changed, which is what § 7.1 predicted in writing before the push |
| No newly minted PNG | **holds** — no generation run exists this round |
| No pixel threshold widened | **holds** — no `maxDiffPixels` / `threshold` anywhere in the diff |
| **AC#32** — zero schema migrations | **holds** — `drizzle/` clean, **26** `.sql` |

---

# 8 · Round 4 — the verifier's gap, and the comparison that re-establishes the evidence again

## 8.1 Why there is a round 4, and the run § 7 could not name

The phase verifier (`17-VERIFICATION.md`, 2026-08-30) found **one blocker**, and it is the reason
this round exists: `e2e/axe-sweep.spec.ts` — the single artifact this phase built to prove GATE-02's
"an automated axe pass is green in court" clause — **failed its own AC#2 completeness assertion when
run**, deterministically, twice, at `--workers=1`. `declaredRouteFiles()` walks the tree and found
**46** route files; `ROWS` declared **42**. Plan 17-07 built that table in wave 2; plan 17-12 added
four group-local throw routes in wave 3 and reconciled every OTHER route-inventory instrument
(`tests/design/loading-coverage.test.ts` 29→33 / 8→12, and this file's D-201 sibling in
`e2e/overflow-320.spec.ts`) except that one. Mechanical, and therefore **not** closeable-around under
D-200 — the phase's own rule is that escalate-class findings are the deliverable and mechanical ones
are fixed.

**FIRST, THE RUN § 7 STRUCTURALLY COULD NOT RECORD.** § 7.4 named `33298297450` (on `247d1e4`) as the
closing evidence, and § 7.6 then landed one `.planning`-only commit — `1751fb0`, the commit that
*contains* § 7. That push fired its own CI run, and a document cannot cite the run of the commit that
carries it. The verifier confirmed it independently via `gh run view`, and it is recorded here for the
first time so the chain has no invisible link:

| Item | Value |
|---|---|
| **Run id** | **`33298587807`** |
| Head SHA | **`1751fb0bc414cc72f2563ad84d783a82afc6a98e`** (`1751fb0`) |
| Workflow / event | `ci` / `push` |
| **Conclusion** | **`success`** — all 4 jobs |
| Started / finished | `2026-08-30T07:10:30Z` / `2026-08-30T07:17:12Z` |
| `gate-visual` | **success** — **42 passed / 1 flaky / 42 skipped / 0 failed** |

⚠ **The `1 flaky` is read out rather than rounded off.** `dev-theme-1280-court.png` failed its first
attempt and passed on `retry #1`, so that job is green on a retry rather than on the first pass. The
denominator is unchanged (42 + 1 = the same 43 shot rows), the flake is in the **audit instrument's**
own baseline (`/dev/theme`, D-201 exclusion 1) and not in a product surface, and `updateSnapshots:
"none"` means nothing was written either way. It is named because a green-on-retry is a weaker reading
than a green-on-first-pass, and the run that supersedes it below is the stronger one.

By the same tree-moved rule § 7.5 states, `33298587807` **superseded `33298297450`** the moment
`1751fb0` landed: § 7.4's claim stays true of `247d1e4` and simply stopped speaking for the head. That
link was missing from this document until now, which is the second reason to record the run at all.

## 8.2 What landed, and the mechanical proof that no pixel could follow

One commit on top of `1751fb0`:

| Commit | Finding | Files |
|---|---|---|
| `64da86f` | the verifier's single blocker | `e2e/axe-sweep.spec.ts` — **one file, and it is a Playwright spec** |

**The prediction, written in the same falsifiable form § 7.1 used, and before the push:** a spec under
`e2e/` is read by **no** rendering path. It is not imported by `src/`, not bundled, not served, and
`e2e/*.spec.ts` belongs to the `chromium` project while every baseline belongs to `visual` — the two
projects' `testMatch` globs are disjoint by construction (`playwright.config.ts`). **If any baseline
PNG had moved, that would be a FINDING and not something to absorb by regenerating.**

| Check | Result |
|---|---|
| `git diff 1751fb0..HEAD --stat -- '*.png'` | **0 lines** — not one baseline byte moved |
| `git diff 1751fb0..HEAD --stat -- . ':(exclude).planning'` | **1 file, +128 / −20** — `e2e/axe-sweep.spec.ts` only |
| Files under `src/` in the diff | **0** |
| Baselines on disk | **36**, every one `*-court-visual-linux.png`; the grove / `win32` / `darwin` count = **0** |
| `playwright.config.ts:78` | `updateSnapshots: "none"` — unconditional, byte-unchanged since `e439bf9` |
| `git status --porcelain drizzle/` | empty; `drizzle/*.sql` = **26** |

**No `baselines.yml` dispatch was fired in this round, and no threshold was widened.** There is no
generation run to label because nothing was generated.

## 8.3 The gates, re-run locally because a spec moved

| Check | Result |
|---|---|
| `npx playwright test e2e/axe-sweep.spec.ts --project=chromium --workers=1` — **the whole file, not just AC#2** | **60 passed / 36 skipped, 1.8m, exit 0** — the gap is closed |
| — the same command on `1751fb0` | **1 failed** (`AC#2 … the table's row set equals the declared surface set`) |
| — what the four new rows cost | 47 rows now (46 route files + 1 non-route class): **29 measured × 2 widths + 2 AC#2 tests = 60 passed**, 18 skipped × 2 = **36 skipped** |
| `npm run build` (lint + `test:design` + `next build`) | **exit 0** |
| `npm test` — run **ALONE**, after the build, never concurrently | **exit 0** — **186 files, 2169 passed / 5 skipped**, identical to § 7.3 |
| `e2e/overflow-320.spec.ts -g "D-201 / AC#2"` — the sibling inventory, **verified rather than assumed** | **8 passed** |
| `tests/design/loading-coverage.test.ts` pins vs. disk, measured by hand | **33 / 21 / 12** against 33 `page.tsx` and 21 `loading.tsx` — consistent |

⚠ **THE FIX WAS LARGER THAN "FOUR ROWS", AND THE EXTRA IS THE PART WORTH READING.** Four of the five
error-boundary rows carried a skip reason that plan 17-12 had made **false** — *"no dev throw
affordance exists inside the (app) route group"* — and it would otherwise have stood directly beside
four new rows citing those very affordances by name. All four are now **measured**, at 320 and 1280,
through the routes 17-12 shipped; and every boundary `tell` (the root's included) now names its own
route out rather than the shared `error-state` hook, because all five boundaries render the same panel
and the bare hook proves "a boundary rendered" and not "THIS boundary rendered". Eight scans that did
not exist before, all clean.

## 8.4 THE RUN

| Item | Value |
|---|---|
| **COMPARISON run id** | **`33300479520`** |
| Workflow / event | `ci` / `push` |
| **Conclusion** | **`success`** |
| **Head SHA it ran against** | **`64da86ffeb83531a809e1131fe965e60ceac01a9`** (`64da86f`) |
| Started / finished | `2026-08-30T07:59:33Z` / `2026-08-30T08:06:19Z` |
| `gate-visual (GATE-01 visual regression)` | **success** — **43 passed / 42 skipped / 0 failed / 0 flaky** |
| `gate-db-free (lint + design + build + workflow parse)` | **success** |
| `gate-db (vitest against PostGIS 18)` | **success** |
| `gate-price-parity (DB-vs-DOM price, 1 spec)` | **success** |

**43 / 42 / 0 — identical to `33298297450`, row for row, and one flake better than `33298587807`.**
No baseline changed on disk *and* the running app still renders every one of the 43 shot rows
pixel-identically to its committed reference. Those are two different statements and both are needed.

*(Checked so it is not mistaken for new: the `gate-visual` log carries **2** `Hydration failed` lines
from the dev `WebServer` — `grep -c` — the same **2** that runs `33295755823` and `33298297450` carry.
Pre-existing and unmoved.)*

> ### RUN `33300479520`, GREEN, ON `64da86f`, IS PHASE 17's CLOSING EVIDENCE (D-202).

## 8.5 ⚠ Run `33298587807` is SUPERSEDED — recorded, not deleted

`33298587807` (green, on `1751fb0`) was the green comparison run on the head commit at the moment the
verifier read the tree, and it is the run that verification cites. It is **superseded rather than
wrong**, and for the § 7.5 reason and not the § 6.2 one — that distinction is the whole point of
keeping both:

* `33273927029` was superseded because the tree it compared had a **defect**: clock-dependent
  baselines that would have gone red at the next day-rollover.
* `33295755823`, `33298297450` and now `33298587807` have no such flaw. **`33298587807` is superseded
  only because the tree moved underneath it** — one commit landed to close a gap the verifier found in
  a *test file*, so the commit it ran against is no longer the head. Its green is still true of
  `1751fb0`. **Nothing about the prior evidence was found wanting**: the gap was in
  `e2e/axe-sweep.spec.ts`, which no CI job runs (D-24), so no comparison run — past or present — was
  ever measuring it, and none of them over-claimed.
* `33300479520` makes the **same** GATE-01 claim — 43 / 42 / 0 — about a head that also carries the
  fix, and makes it without the retry `33298587807` needed. Strictly more, about strictly more code,
  on a strictly stronger reading.

Kept because the chain `33273927029 → 33295755823 → 33298297450 → 33298587807 → 33300479520` is the
readable history of why this phase's evidence is trustworthy, and deleting a link hides a decision.

## 8.6 What lands after the comparison

Same rule and same proof shape as § 3.3, § 6.3 and § 7.6: **no code, test, workflow, config, schema or
baseline commit lands after `64da86f`.** The only commit after it is this section plus the verification
report it answers — `.planning/` only, read by no job in `ci.yml`, and unable to change a rendered
pixel. The check: `git diff 64da86f..HEAD -- . ':(exclude).planning'` prints **nothing**.

## 8.7 The AC roll-call, re-measured at the end of round 4

| Criterion | Result |
|---|---|
| **AC#25** — regeneration only via `baselines.yml` in the pinned image; `updateSnapshots: "none"` unchanged and unconditional | **holds**, vacuously again: **no regeneration was dispatched**. `playwright.config.ts:78` byte-unchanged since `e439bf9` |
| **AC#26** — zero grove / `win32` / `darwin` baselines | **holds** — **0**; disk **36** |
| **AC#27 / D-202** — a green COMPARISON run on the head commit, id recorded | **holds** — `33300479520` on `64da86f` |
| Every changed PNG predicted in writing | **holds, in its strongest form** — **zero** PNGs changed, predicted in § 8.2 before the push |
| No newly minted PNG | **holds** — no generation run exists this round |
| No pixel threshold widened | **holds** — no `maxDiffPixels` / `threshold` anywhere in the diff |
| **AC#32** — zero schema migrations | **holds** — `drizzle/` clean, **26** `.sql` |
| **GATE-02's axe half** — the clause the verifier falsified | **now holds** — `e2e/axe-sweep.spec.ts` runs **60 passed / 36 skipped**, whole file, `--workers=1` |
