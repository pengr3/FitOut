---
quick_id: 260830-r4b
slug: sticky-bar-footer-clearance
date: 2026-08-30
status: planned
requirements: []
decisions_cited: [D-27, D-28, D-29, D-202]
threats_cited: []
closes: "[17-D9] + [17-D10] (17 deferred-items.md)"
files_modified:
  - src/app/listings/[id]/(detail)/layout.tsx
  - src/app/listings/[id]/(detail)/page.tsx
  - e2e/mobile-booker-path.spec.ts
  - e2e/visual/surfaces.spec.ts-snapshots/
  - .planning/phases/17-cross-cutting-audit-themes-responsive-a11y-baselines/deferred-items.md
  - .planning/quick/260830-r4b-sticky-bar-footer-clearance/baseline-evidence.md
---

# Quick: move the sticky-bar clearance onto the listing shell, so it covers the footer

## The defect, restated from the ledger (not re-derived)

`[17-D9]` — on `/listings/[id]` at **320×568**, scrolled to the document bottom, **identically in both
themes**:

| | box |
|---|---|
| last focusable candidate `a("Privacy")` | `{y: 515, height: 18, bottom: 533}` |
| `[data-testid="booking-sticky-bar"]` | `{y: 504, height: 64, bottom: 568}` |

The link is **entirely inside** the bar's 64px band — untappable, and unreachable by scrolling because
the document is already at its end. `a("Terms")` clears by 3px. Cause: `STICKY_BAR_CLEARANCE` is applied
to `<main>`, and `SiteFooter` renders **after** `<main>`, so the bottom 64px of the **document** is
footer, which no clearance covers.

`[17-D10]`, folded in — the same knob is **inert** on that route. Deleting it from the listing page
changed nothing measurable (17-04 DRIVE 1): the last control inside `<main>` is `a("OpenStreetMap")` at
`{y: 243}` with the document at its bottom, ~1,700px above the fold. On `/listings/[id]/book`, which
renders no footer, the same deletion went RED verbatim (DRIVE 2): `a("Back to the listing")`
`{x: 16, y: 472, width: 156, height: 44, bottom: 516}` against a bar at
`{x: 0, y: 504, width: 320, height: 64, bottom: 568}`.

One knob, two routes, load-bearing on one of them. This task puts it where it bites on both.

## Two corrections to the ledger's pointers, made here so nobody is sent to the wrong file

1. **`SiteFooter` is not in `site-chrome.tsx`.** It is `src/components/patterns/site-footer.tsx:129`.
   `site-chrome.tsx` holds `SiteChrome` / `NavLinks` / `NavDrawer` / `SiteNav` / `ProfileLink` and no
   footer at all. **The shell this task edits is `src/app/listings/[id]/(detail)/layout.tsx`** — the
   route-group layout that composes `PublicHeader`, `{children}` and `<SiteFooter />` inside one
   `<div className="flex min-h-dvh flex-col">` at `:44`. That div is the smallest element in the tree
   that contains both `<main>` and the footer for this route, and it is the correct owner.
2. **The line numbers moved.** The ledger and `mobile-booker-path.spec.ts`'s docblock both cite
   `listings/[id]/(detail)/page.tsx:480`. On this tree the import is `:76`, the comment block is
   `:495-499` and the `<main>` is **`:500`**. `book/page.tsx:521` is still correct. Cite the current
   lines in anything written this task; do not propagate `:480`.

## The shape of the fix, decided here so it is not re-litigated mid-task

**The bar is `lg:hidden`** (`booking-sticky-bar.tsx:167`, and `checkout-sticky-bar.tsx:80` likewise).
There is no bar at or above `lg:`, so there is nothing to clear there. That single fact settles the two
questions the move raises:

```
(detail)/layout.tsx  →  <div className={cn("flex min-h-dvh flex-col", STICKY_BAR_CLEARANCE, "lg:pb-0")}>
(detail)/page.tsx    →  <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
book/page.tsx        →  UNTOUCHED — that route renders no footer, so <main> IS the document's bottom
```

**Why the breakpoint is now required, when the shipped comment argues against one.** `page.tsx:495-499`
justifies the clearance being unconditional with *"80px of trailing space on a desktop page is invisible
and a breakpoint here is one more thing to keep true."* That argument is true only while the padding sits
**inside `<main>`, above a painted footer**. The moment it moves **below** the footer it is 80px of
unpainted `--background` under a `bg-muted border-t` block — a stray strip at the bottom of the document
at every width, which is a new visual defect, not a fix. `lg:pb-0` makes the clearance track the bar's own
breakpoint exactly. Carry that reasoning into the layout's comment; do not just move the old sentence.

**The rejected alternative, and its arithmetic, so it is not proposed again.** Leaving `<main>`'s `pb-20`
in place *and* adding the wrapper's would move only two PNGs instead of three (desktop stays
byte-identical). It is rejected: it puts two spellings of one clearance on one route, and it preserves
exactly the false belief `[17-D10]` was filed about — a declared sticky-bar clearance on a route-width
where no bar renders and no control was ever at risk. `[17-D10]` also warns against the opposite move
(deleting the shipped protection because it is currently inert). One clearance, at the document's bottom,
gated to where the bar exists, is the only shape that answers both halves.

## Known consequences, all three, named before the executor meets them

1. **`(detail)/loading.tsx` and `(detail)/not-found.tsx` render inside the same layout** and therefore
   also gain the below-`lg:` clearance. Neither has a bar. On the short not-found page at 320 this leaves
   an 80px band of `--background` between the footer and the viewport bottom. Look at it at 320 before
   calling the task done; if it reads as a defect rather than as breathing room, **say so and stop** —
   that is a PM call, not a licence to redesign.
2. **`STICKY_BAR_CLEARANCE` keeps exactly two call sites** (the `(detail)` layout, and `book/page.tsx`'s
   `<main>`). `measurements.ts:345` is unchanged — the constant's value is not in question, only where it
   is spent. Its docblock says *"the last row of content sits under the bar"*; that stays true and now
   describes both routes rather than one.
3. **`cn` becomes unused in `(detail)/page.tsx`.** It has exactly one call site there (`:500`) and
   `npm run build` runs `eslint`. Remove the `cn` import and the `STICKY_BAR_CLEARANCE` import from
   `page.tsx`, and add both to `(detail)/layout.tsx`.

## The baseline consequence — the main risk in this task

This changes rendered layout at 320px, so **it will move visual baselines**, and the rules around that
are not negotiable:

- Baselines can ONLY be written by `.github/workflows/baselines.yml` under `workflow_dispatch` in
  `mcr.microsoft.com/playwright:v1.60.0-noble` (D-27 / D-29). `playwright.config.ts:78` sets
  `updateSnapshots: "none"` unconditionally (D-28) and **nothing in this task may change that**.
  This Windows machine structurally cannot construct the `visual` project — do not try.
- **Write the predicted diff BEFORE dispatching**, then read the actual diff file by file against it.
  An unpredicted changed row is a finding. A newly minted PNG is a finding.
- After a regeneration a **comparison** run must be **forced**: `baselines.yml`'s commit push
  authenticates with `GITHUB_TOKEN`, and a `GITHUB_TOKEN` push triggers no workflow. Writing is not
  comparing.
- **Do NOT widen any pixel threshold.** `surfaces.spec.ts:118-151` records why the default `0.2` is kept
  and why tightening/loosening is a call-site decision, never a suite one. Widening a threshold to absorb
  a change this task caused is the wrong answer, explicitly.
- **If you cannot predict which rows move, say so and stop rather than dispatching blind.**

Phase 17 is CLOSED and its D-202 evidence is recorded at `c4845a9`. This task does not invalidate that
historical record — but `dev` must not be left red.

### Current state, measured, to check the diff against

- **36 PNGs** on disk under `e2e/visual/surfaces.spec.ts-snapshots/` (41 files match `*.png` under `e2e/`;
  five of those are `e2e/fixtures/*.png` and are not baselines). All 36 are `*-court-visual-linux.png`;
  there are zero grove, zero `win32`, zero `darwin`.
- `EXPECTED_BLOCKED` = **24** named entries, `EXPECTED_BASELINE_COUNT` = **78** (`surfaces.spec.ts:179`,
  `:301`). **Neither number changes in this task** — no row is added, unblocked or retired.

### The predicted diff, derived, for Task 2 to restate and Task 3 to read against

`/listings/[id]` has three baselined rows (`visual-baselines.ts:1619-1648`), all captured **`fullPage`**:
`listing-detail-320`, `-768`, `-1280`, court only. The arithmetic:

| PNG | `lg:`? | `<main>` | wrapper | document height | what changes |
|---|---|---|---|---|---|
| `listing-detail-320-court-visual-linux.png` | below | −80 | +80 | **unchanged** | footer block shifts **up 80px**; 80px `--background` band appended at the bottom. Everything above `<main>`'s last content row byte-identical. |
| `listing-detail-768-court-visual-linux.png` | below | −80 | +80 | **unchanged** | identical mechanism to 320 |
| `listing-detail-1280-court-visual-linux.png` | at/above | −80 | +0 (`lg:pb-0`) | **−80px** | image is 80px **shorter**; footer shifts up 80px; content above unchanged |

Predicted **unchanged**: `listing-lightbox-1280` and `listing-sheet-375` are captured **`viewport`**, not
`fullPage` (`visual-baselines.ts:1651-1654`, `:1670-1673`), with the overlay anchored to a viewport that
never shows the footer — so they must not move, and if either does, that is a finding. `checkout-320` /
`checkout-1280` are the `book` route, which this task does not touch. Every other row is a different
layout group.

**Predicted totals: 3 files changed, 0 added, 0 deleted; disk stays at 36.**

The 1280 row is a **product-visible desktop change**: 80px of trailing whitespace between the page's last
content row and the footer disappears. `<main>`'s own `sm:py-12` (48px) and the footer's `sm:py-12`
remain, so the desktop page does not become cramped. Record it plainly in the SUMMARY for the PM; it does
not block.

## The red-watch — what proves the new assertion can fail

Deleting the named footer exception makes the occlusion clause strictly stronger, and a strictly stronger
clause that has never been red is a rubber stamp. **DRIVE 4**, run and reverted in Task 1:

> Delete `STICKY_BAR_CLEARANCE` from `(detail)/layout.tsx`'s wrapper (leave the spec edit in place) and
> run `npx playwright test e2e/mobile-booker-path.spec.ts --project=chromium --workers=1`.
> **Expected RED**, naming `a("Privacy")` and the bar — the two boxes `[17-D9]` measured. Restore, re-run,
> confirm green.

That is the whole point of this drive: the assertion reproduces the ledger's finding from the assertion
side. `<main>`'s clearance on `/listings/[id]` is **not** a valid red-watch — DRIVE 1 already measured
that deleting it changes nothing. The checkout route's half needs no new mutation; DRIVE 2 is already
recorded, and Task 2 re-runs that case green.

## Running discipline — non-negotiable, and this repo has paid for each of these

- `npm run build` **first** (it runs `eslint` + `test:design` + `next build`), **then** `npm test`
  **ALONE**, afterwards, never concurrently. `tests/global-setup.ts` TRUNCATEs shared test tables, and a
  collision manufactures convincing failures in files nothing touched.
- **Never trust the first red immediately after a build.** Re-run the failing file alone before reading
  it as a defect.
- e2e runs are **per file**, `--project=chromium --workers=1`, against one long-lived dev server, with
  `npm run db:up` first and a stale `.next/` cleared. Compare every failure against
  `.planning/phases/17-…/e2e-baseline-reds.md` (10 declared rows at `e439bf9`; rows 4-10 are
  contention-class and pass alone). **A failure not on that list is this task's to explain, and no row
  may be added to that file to make a run read green.**

---

## Tasks

### Task 1 — move the clearance, delete the footer exception, and watch DRIVE 4 red

**files:** `src/app/listings/[id]/(detail)/layout.tsx`, `src/app/listings/[id]/(detail)/page.tsx`,
`e2e/mobile-booker-path.spec.ts`

**action:**

**1a. The source move.** In `(detail)/layout.tsx`, import `cn` from `@/lib/utils` and
`STICKY_BAR_CLEARANCE` from `@/lib/design/measurements`, and change the wrapper at `:44` to
`cn("flex min-h-dvh flex-col", STICKY_BAR_CLEARANCE, "lg:pb-0")`. Write the reasoning at the class site,
in this file's register: this is the smallest element containing both `<main>` and `SiteFooter`, which is
why the clearance lives here and not one file over; the bar is `lg:hidden` so `lg:pb-0` makes the
clearance track the bar's own breakpoint; and the previous "unconditional because invisible" argument was
load-bearing only while the padding sat above a painted footer — below it, unconditional means a strip of
page background under `bg-muted`. Name `[17-D9]` and the `a("Privacy")` / bar boxes so the next reader
sees what the 80px is buying.

In `(detail)/page.tsx`, drop `STICKY_BAR_CLEARANCE` from the `<main>` at `:500`, delete the now-dead
`cn(...)` wrapper and **both** now-unused imports (`cn` at `:77`, `STICKY_BAR_CLEARANCE` at `:76`), and
replace the `:495-499` comment with a short pointer to the layout — one or two lines saying the clearance
moved and why, so a reader of this file is not left believing `<main>` still carries it. Do not delete
the history silently.

`src/app/listings/[id]/book/page.tsx` is **not touched**. Its `<main>` clearance is the load-bearing one
(DRIVE 2), and that route renders no footer (`shell.spec.ts:1221` pins "0 footers" on a live checkout).

**1b. Delete the named footer exception**, in `e2e/mobile-booker-path.spec.ts`. It is five mechanical
sites plus three prose sites, and **nothing else in the clause is relaxed** — that is precisely why 17-04
wrote it as an exception rather than narrowing the subject:

- `:356` — drop `inFooter` from `OccludedControl`.
- `:366` — rename `lastOutsideFooter` to `last` (or equivalent) and keep its shape.
- `:414-415` — delete the `inFooter` helper and the `outside` filter; the subject becomes the whole
  `laid` set.
- `:423` / `:430` — the probe reports the last laid-out control, full stop, and `occluded` entries carry
  no `inFooter` flag.
- `:500` / `:505` / `:518` — the guard, the AC#7 clause and the set clause all read the unfiltered set;
  `:518`'s `.filter((c) => !c.inFooter)` is deleted.

Update the two failure messages that name the old placement: `:511`'s *"on this route's `<main>`"* must
now say the knob sits on the `(detail)` layout shell for `/listings/[id]` (so it covers the footer) and on
`<main>` for `/listings/[id]/book` (which renders none) — one message serves both bars, so word it for
both. `:525`'s "the footer is EXCLUDED here…" paragraph goes entirely; what replaces it is the plain
statement that nothing is excused.

Rewrite the three prose sites rather than deleting them — this file's value is its record:
- `expectBarDoesNotOcclude`'s docblock (`:435-472`): keep the `[17-D9]` and `[17-D10]` measurements as
  **history**, dated, and state that the clearance now sits on the layout shell, that the exception is
  gone, and that the clause is now AC#7's literal subject with no carve-out.
- the header's watched-red log (`:313-337`): append **DRIVE 4** with its verbatim transcript from 1c.
- `:1543-1548` ("THE SAME CLAUSE, GREEN, ONE ROUTE AWAY"): both routes are green now and by different
  placements of one constant — say which, for each.

Keep the file's standing rules: assertions stay on **pixels, never on the class list**, and the
class-list matcher's identifier is still not spelled anywhere in this file, **including in prose**
(17-04's grep tripwire).

**1c. DRIVE 4 — watch it red.** With the spec edit in place, delete `STICKY_BAR_CLEARANCE` from
`(detail)/layout.tsx`'s wrapper and run:

```
npx playwright test e2e/mobile-booker-path.spec.ts --project=chromium --workers=1
```

Expect RED naming `a("Privacy")` and the bar box. **Transcribe the real terminal output verbatim** — the
failing test line and the full assertion message with both boxes. Not paraphrased, not reconstructed.
Then restore the class, re-run the same command, and confirm green. If DRIVE 4 comes back **green**, the
clause is not measuring what this task claims — **stop and report**, do not proceed to a dispatch.

**verify:**

```
npm run build
npx tsc --noEmit
npx playwright test e2e/mobile-booker-path.spec.ts --project=chromium --workers=1
```

`npm run build` first and alone; `npx tsc --noEmit` is safe (no DB). If `tsc` reports errors under
`.next/types`, those are stale generated types from a previous dev server — clear `.next/` before
trusting the output.

**done:**
- `(detail)/layout.tsx`'s wrapper carries `cn("flex min-h-dvh flex-col", STICKY_BAR_CLEARANCE, "lg:pb-0")`
  with the reasoning written at the class site.
- `(detail)/page.tsx`'s `<main>` is a plain class string; `cn` and `STICKY_BAR_CLEARANCE` imports are gone;
  a pointer comment records the move.
- `git diff --exit-code "src/app/listings/[id]/book/page.tsx"` returns **exit 0**.
- `grep -rn "STICKY_BAR_CLEARANCE" src/` shows exactly two call sites — the `(detail)` layout and
  `book/page.tsx` — plus the definition at `measurements.ts:345`.
- `grep -c "inFooter" e2e/mobile-booker-path.spec.ts` returns **0**.
- DRIVE 4's verbatim transcript is in the spec's watched-red log, naming `a("Privacy")` and the bar box,
  and the clearance was restored (the run after restoration is green).
- `npm run build` and `npx tsc --noEmit` both exit 0.

---

### Task 2 — the local gate, and the written prediction, before anything is dispatched

**files:** `.planning/quick/260830-r4b-sticky-bar-footer-clearance/baseline-evidence.md`,
`.planning/phases/17-cross-cutting-audit-themes-responsive-a11y-baselines/deferred-items.md`

**action:**

**2a. Re-read every 320px row.** `npm run db:up`, kill any `next dev`, delete `.next/`, start one
long-lived dev server, then run **each file alone**:

```
npx playwright test e2e/mobile-booker-path.spec.ts --project=chromium --workers=1
npx playwright test e2e/overflow-320.spec.ts       --project=chromium --workers=1
```

`overflow-320.spec.ts` measures HORIZONTAL overflow and bottom padding cannot widen `scrollWidth`, so the
prediction is **fully green apart from the declared red set** — a red there is a genuine surprise and must
be investigated, not absorbed. `mobile-booker-path.spec.ts` must be green on **both** halves: the listing
bar (`:889`) and the checkout bar (`:1550`), the second being the standing proof that `book/page.tsx`'s
clearance still does its job.

Compare every failure against `e2e-baseline-reds.md`'s 10 rows. Re-run any failing file **alone** before
reading it as a defect, and never immediately after a build.

**2b. Then `npm test`, ALONE.** Not concurrently with anything, not while a Playwright run or a
`test:design` run is live.

**2c. Prove the write path is untouched**, before any dispatch:

```
git diff --name-only HEAD -- playwright.config.ts .github/workflows/baselines.yml .github/workflows/ci.yml
node scripts/verify-workflows.mjs
```

The first must print nothing. `updateSnapshots: "none"` stays unconditional; `baselines.yml` keeps
`workflow_dispatch` as its only trigger and holds no `secrets.*`; `--update-snapshots` stays in that file
alone. Adding a trigger, a credential, or a threshold is a scope alarm, not a convenience.

**2d. Write `baseline-evidence.md` NOW — before dispatching.** It must contain, in this order: the head
commit SHA; the current disk state (36 PNGs, all `*-court-visual-linux.png`, zero grove/win32/darwin);
`EXPECTED_BLOCKED` = 24 and `EXPECTED_BASELINE_COUNT` = 78 both declared **unchanged**; and the predicted
change list restated from this plan's table — **3 changed, 0 added, 0 deleted**, naming
`listing-detail-320/768/1280-court-visual-linux.png`, with the per-row mechanism (net-zero document
height below `lg:`, −80px at 1280) and the explicit prediction that `listing-lightbox-1280` and
`listing-sheet-375` do **not** move because they are `viewport` captures. State that this prediction is
the thing the diff is read against, and that anything outside it is a finding.

**If the prediction cannot be written with confidence, stop here and report.** Do not dispatch blind.

**2e. Close the ledger rows.** In Phase 17's `deferred-items.md`, append a dated **RESOLVED** line to
`[17-D9]` and to `[17-D10]` — naming this quick id, the class move, the spec exception's deletion and
DRIVE 4. **Do not rewrite either row's measured body**, and do not touch any other row, any audit table
or any sign-off block: Phase 17 is closed and its D-202 evidence at `c4845a9` stands.

**verify:**

```
npm run build
npm test
git diff --name-only HEAD -- playwright.config.ts .github/workflows/baselines.yml .github/workflows/ci.yml
node scripts/verify-workflows.mjs
```

Each alone, in that order. The `git diff` prints nothing; the rest exit 0.

**done:**
- Both e2e specs were run per-file at `--workers=1` and every failure is already on
  `e2e-baseline-reds.md`; the comparison is stated explicitly, not implied. No row was added to that file.
- `mobile-booker-path.spec.ts` is green on both the listing bar and the checkout bar.
- `npm test` ran alone and is green.
- `playwright.config.ts` and both workflow files are byte-identical to HEAD; `verify-workflows.mjs` exits 0.
- `baseline-evidence.md` exists, carries the head SHA and the 3-changed / 0-added / 0-deleted prediction
  with per-row mechanism, and was written **before** any dispatch.
- `[17-D9]` and `[17-D10]` each carry a dated RESOLVED line; their measured bodies are byte-identical.

---

### Task 3 — dispatch, read the diff against the prediction, force the comparison run

**files:** `e2e/visual/surfaces.spec.ts-snapshots/`,
`.planning/quick/260830-r4b-sticky-bar-footer-clearance/baseline-evidence.md`

**action:**

**3a. Push the fix to `dev` and let `ci.yml` run.** The correct pre-dispatch shape is `gate-visual` RED
with a **pixel diff** on the three predicted `listing-detail` rows — the surfaces rendered and disagree
with their references, which is what a real layout change looks like. A connection error, or a missing
snapshot, or a red on a row this task never touched, is a different problem and blocks the dispatch.
Record which was observed.

**3b. Dispatch the one sanctioned write path.**

```
gh workflow run baselines.yml --ref dev
gh run list --workflow=baselines.yml --limit 3 --json databaseId,status,conclusion,headSha
```

Poll to completion. Record the **generation run id** in `baseline-evidence.md` and label it, in the file,
as the generation run and **explicitly not the evidence**. `baselines.yml`'s own header states the reason:
this job wrote the PNGs, and writing is not comparing.

**3c. Read the diff, file by file, against Task 2's prediction.** Pull the commit, then confirm all five:

1. every changed/added path ends `-visual-linux.png`;
2. zero `*-grove-*`, zero `win32`, zero `darwin`;
3. exactly the three predicted files changed;
4. **zero files added and zero deleted** — disk is still 36;
5. `listing-lightbox-1280` and `listing-sheet-375` did **not** move.

**An unpredicted changed row is a finding. A newly minted PNG is a finding.** Investigate before
proceeding and write the explanation into `baseline-evidence.md` — an unexplained pixel change on the
product's highest-intent public route is the exact thing this gate exists to catch. **Do not widen a
threshold, and do not re-dispatch to make a red green.**

**3d. Force the comparison.** The generation commit was pushed with `GITHUB_TOKEN`, which triggers no
workflow, so at this point the new references have never been compared against. Push an empty commit
(`git commit --allow-empty`) — or re-dispatch `ci.yml` — so a real `gate-visual` job runs, and confirm it
ran against the **head** commit, not an earlier one.

Record **its** id, conclusion and head SHA in `baseline-evidence.md` under a heading saying plainly that
this is the closing evidence. A green comparison run on the head commit is the deliverable; a generation
run is not. **Nothing lands after the recorded comparison run** — a later commit invalidates it.

**verify:**

```
gh run view <generation-run-id>  --json conclusion --jq .conclusion
gh run view <comparison-run-id>  --json conclusion,headSha --jq '[.conclusion,.headSha]'
git rev-parse HEAD
ls e2e/visual/surfaces.spec.ts-snapshots/ | wc -l
ls e2e/visual/surfaces.spec.ts-snapshots/ | grep -c 'grove\|win32\|darwin'
```

Both conclusions `success`; the comparison run's `headSha` equals `git rev-parse HEAD`; the count is
**36**; the grove/platform count is **0**.

**done:**
- The generation run id is recorded and labelled as **not** the evidence.
- The diff is exactly the three predicted `listing-detail` PNGs — 0 added, 0 deleted, disk still 36, zero
  grove/win32/darwin — read file by file against the prediction written in Task 2, with any deviation
  investigated and explained in writing.
- `playwright.config.ts`'s `updateSnapshots: "none"` and every pixel threshold are untouched:
  `git diff --exit-code HEAD~.. -- playwright.config.ts` over the task's commits shows nothing.
- A separate `gate-visual` **comparison** run exists, was reached by an empty commit or re-dispatch, is
  green, and ran against the repository head.
- `dev` is green and nothing landed after the recorded comparison run.

---

## Acceptance

1. `STICKY_BAR_CLEARANCE` is applied on `src/app/listings/[id]/(detail)/layout.tsx`'s
   `flex min-h-dvh flex-col` wrapper with `lg:pb-0`, and is gone from `(detail)/page.tsx`'s `<main>`
   along with both dead imports. `book/page.tsx` is byte-identical.
2. The constant has exactly two call sites in `src/`, and `measurements.ts:345` is unchanged.
3. The named footer exception is **deleted** from `e2e/mobile-booker-path.spec.ts` —
   `grep -c "inFooter"` returns 0 — and **nothing else in the occlusion clause was relaxed**: the AC#7
   clause and the set clause both read the unfiltered set, and the assertions are still on pixels, never
   on the class list.
4. **DRIVE 4 was observed RED** with the clearance deleted from the layout, its transcript is verbatim in
   the spec's watched-red log naming `a("Privacy")` and the bar box, and the clearance was restored and
   re-run green.
5. `mobile-booker-path.spec.ts` and `overflow-320.spec.ts` were re-run per file at
   `--project=chromium --workers=1`, and every failure is already on `e2e-baseline-reds.md`. **No row was
   added to that file.**
6. `npm run build` exits 0; `npm test` was run **alone, afterwards** and exits 0; `npx tsc --noEmit`
   exits 0.
7. The baseline prediction was written **before** the dispatch, the actual diff was read file by file
   against it, and it is exactly `listing-detail-320/768/1280-court-visual-linux.png` — 3 changed, 0
   added, 0 deleted, disk still 36, `EXPECTED_BLOCKED` still 24, `EXPECTED_BASELINE_COUNT` still 78.
8. **No pixel threshold was widened and `updateSnapshots: "none"` was not touched.** `baselines.yml` and
   `ci.yml` are unchanged and `verify-workflows.mjs` exits 0.
9. A green **comparison** run exists on the head commit — forced, because the `GITHUB_TOKEN` push
   triggered nothing — and its id, conclusion and SHA are recorded alongside the generation run id, which
   is labelled as not being the evidence.
10. `[17-D9]` and `[17-D10]` each carry a dated RESOLVED line; their measured bodies, every other ledger
    row, and Phase 17's closed D-202 evidence at `c4845a9` are untouched.
11. The desktop consequence — 80px of trailing whitespace removed at `lg:` and above on `/listings/[id]`
    — is recorded plainly in the SUMMARY for the PM, along with how the listing not-found page reads at
    320px under the new clearance.
