# Phase 17 — GATE-01 baseline evidence

**What this file is.** The record of Phase 17's baseline round-trip, written in the order it
happened: the prediction **before** the dispatch, the diff **read** against that prediction, and
the **comparison** run id that is the phase's closing evidence per **D-202**.

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
