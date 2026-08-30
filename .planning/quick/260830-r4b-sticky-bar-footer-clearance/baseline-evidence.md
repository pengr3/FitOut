# Baseline evidence — quick `260830-r4b` (sticky-bar clearance moved to the listing shell)

**Written BEFORE any `baselines.yml` dispatch.** That ordering is the whole value of this file: a
prediction written after reading a diff is not a prediction, it is a description. Everything under
"The prediction" below is what the diff will be READ AGAINST. Anything outside it is a finding, and a
finding is investigated and explained here before the quick closes — not absorbed, and never absorbed
by widening a threshold.

---

## 1. The commit this is a prediction about

| | |
|---|---|
| head SHA at prediction time | `463620665fdbb0cb8311bf30f676197f49d7464a` (`4636206`) |
| commit | `fix(260830-r4b): hang the sticky-bar clearance off the listing shell, where it reaches the footer` |
| branch | `dev` |
| what changed in it | `STICKY_BAR_CLEARANCE` (`pb-20`, 80px) moved from `(detail)/page.tsx`'s `<main>` to `(detail)/layout.tsx`'s `flex min-h-dvh flex-col` wrapper, gated `lg:pb-0`. `book/page.tsx` untouched. |

## 2. Current disk state (measured, not recalled)

```
ls e2e/visual/surfaces.spec.ts-snapshots/*.png | wc -l          → 36
ls e2e/visual/surfaces.spec.ts-snapshots/ | grep -c court-visual-linux.png → 36
ls e2e/visual/surfaces.spec.ts-snapshots/ | grep -c 'grove\|win32\|darwin' → 0
```

All 36 baselines are `*-court-visual-linux.png`. Zero grove rows, zero `win32`, zero `darwin`.

`EXPECTED_BLOCKED` = **24** named entries (`e2e/visual/surfaces.spec.ts:179`).
`EXPECTED_BASELINE_COUNT` = **78** (`e2e/visual/surfaces.spec.ts:301`).

**Neither number changes in this quick.** No row is added, unblocked or retired; no surface is
introduced or removed. This task moves one CSS class between two elements of one existing route.

## 3. The write path is provably untouched

```
git diff --name-only HEAD -- playwright.config.ts .github/workflows/baselines.yml .github/workflows/ci.yml
   → (prints nothing)
node scripts/verify-workflows.mjs
   → All 38 invariants hold across 3 section(s) (baselines=11, ci=20, cross=7).  exit 0
```

`updateSnapshots: "none"` stays unconditional (D-28). `baselines.yml` keeps `workflow_dispatch` as its
only trigger, holds zero `secrets.*`, and is still the only file in `.github/workflows/` with a
`--update-snapshots` run command. No pixel threshold is touched anywhere.

## 4. The prediction

`/listings/[id]` has exactly three baselined rows (`src/lib/design/visual-baselines.ts:1620-1648`),
all `court`, all captured **`fullPage`** (`visual-drive.ts:438`, `listingDetailDrive`).

The arithmetic. Below `lg:` the wrapper gains the 80px that `<main>` lost, so the DOCUMENT height is
net-unchanged and the footer block simply moves up 80px, with an 80px band of `--background` appended
below it. At `lg:` and above `lg:pb-0` zeroes the wrapper, so `<main>`'s 80px is lost with nothing
replacing it and the document is 80px SHORTER.

| PNG | `lg:`? | `<main>` | wrapper | document height | what changes in the image |
|---|---|---|---|---|---|
| `listing-detail-320-court-visual-linux.png` | below | −80 | +80 | **unchanged** | footer block shifts **up 80px**; 80px `--background` band appended at the bottom. Everything above `<main>`'s last content row byte-identical. |
| `listing-detail-768-court-visual-linux.png` | below | −80 | +80 | **unchanged** | identical mechanism to 320 |
| `listing-detail-1280-court-visual-linux.png` | at/above | −80 | +0 (`lg:pb-0`) | **−80px** | image is 80px **shorter**; footer shifts up 80px; content above unchanged |

**Predicted totals: 3 files changed, 0 added, 0 deleted. Disk stays at 36.**

> ⚠ **§4 IS WRONG AND IS LEFT STANDING ON PURPOSE.** It is the prediction this quick was authorised
> against, and rewriting it in place would destroy the only record of what was expected. The measured
> correction — **2 changed, not 3**, and every per-row mechanism above restated — is in **§7a**, which
> also explains why (`sm:py-12` beats the unvariant `pb-20` from 640px up, so `STICKY_BAR_CLEARANCE`
> was never in effect at or above 640px on either route). Read §7a as the operative prediction.

Predicted **NOT** to move, and each for a stated reason:

- `listing-lightbox-1280-court-visual-linux.png` — captured **`viewport`**, not `fullPage`
  (`visual-drive.ts:455`), over a scroll-locked document anchored to a viewport that never shows the
  footer. If it moves, that is a finding.
- `listing-sheet-375-court-visual-linux.png` — same, `viewport` (`visual-drive.ts:508`). If it moves,
  that is a finding.
- `checkout-320` / `checkout-1280` — the `/listings/[id]/book` route, which this quick does not touch
  (`git diff --exit-code src/app/listings/[id]/book/page.tsx` → exit 0).
- `og-listing-1200` — an image row rendered by the OG route, not by the page under `(detail)/layout.tsx`.
- every other row — a different layout group entirely.

**An unpredicted changed row is a finding. A newly minted PNG is a finding.** Either one is
investigated and written up in this file before the quick closes. Neither is answered by widening a
threshold or by re-dispatching until a red goes green.

## 5. The desktop consequence, stated plainly because it is product-visible

At `lg:` and above on `/listings/[id]`, 80px of trailing whitespace between the page's last content
row and the footer disappears. `<main>`'s own `sm:py-12` (48px) and the footer's own `sm:py-12` both
remain, so the desktop page does not become cramped — it loses padding that was declared as sticky-bar
clearance on a width where no sticky bar has ever rendered (`booking-sticky-bar.tsx:167` is
`lg:hidden`). That is `[17-D10]`'s finding, spent.

## 6. Local pre-dispatch gate (all green)

| check | result |
|---|---|
| `npm run build` (lint + `test:design` + `next build`) | exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npm test` (run ALONE, after the build) | 186 files / 2169 tests passed, 5 skipped, exit 0 |
| `npx playwright test e2e/mobile-booker-path.spec.ts --project=chromium --workers=1` | 11 passed, 3 skipped |
| `npx playwright test e2e/overflow-320.spec.ts --project=chromium --workers=1` | 100 passed, 9 skipped |

Zero failures in either e2e file, so there was nothing to compare against
`.planning/phases/17-cross-cutting-audit-themes-responsive-a11y-baselines/e2e-baseline-reds.md`'s 10
declared rows, and **no row was added to that file**.

---

## 7. Dispatch record

_(filled in after this file was written — the sections above are the prediction, these are the reads
against it)_

### 7a. Pre-dispatch CI shape — AND THE PREDICTION IN §4 IS WRONG

Pushed `09048d6` to `origin/dev`. Run **33311107114** on `09048d6`, conclusion **failure**, and the
failure is confined to one job:

| job | conclusion |
|---|---|
| `gate-db-free` (lint + design + build + workflow parse) | success |
| `gate-db` (vitest against PostGIS 18) | success |
| `gate-price-parity` (DB-vs-DOM price) | success |
| **`gate-visual` (GATE-01 visual regression)** | **failure** — 2 failed, 1 flaky, 40 passed |

The two failures are **pixel/size diffs on baselined rows that render — the correct pre-dispatch
shape**, not a connection error and not a missing snapshot:

```
listing-detail-320-court.png   Expected an image 320px by 2986px, received 320px by 3018px.
                               4246 pixels (ratio 0.01 of all image pixels) are different.
listing-detail-768-court.png   Expected an image 768px by 2408px, received 768px by 2488px.
```

The "1 flaky" is `dev-theme-1280-court.png` — failed once, **passed on retry #1**, on a surface this
quick does not touch. Not a finding.

**But §4 predicted three changed rows and the run says two.** `listing-detail-1280-court.png`
**PASSED on its first attempt** — byte-identical. So did `listing-lightbox-1280`, `listing-sheet-375`,
`checkout-320` and `checkout-1280`, all as predicted.

**Root cause, measured at seven widths against the app's own stylesheet** (an element carrying each
literal class string, `getComputedStyle(...).paddingBottom`):

| class string | 320 | 639 | **640** | 768 | 1023 | **1024** | 1280 |
|---|---|---|---|---|---|---|---|
| `…px-4 py-8 sm:py-12 pb-20` — the listing's OLD `<main>` | 80px | 80px | **48px** | 48px | 48px | 48px | 48px |
| `…px-4 py-8 sm:py-12 pb-20` — **the checkout's `<main>`, shipped today** | 80px | 80px | **48px** | 48px | 48px | 48px | 48px |
| `flex min-h-dvh flex-col pb-20 lg:pb-0` — the NEW layout wrapper | 80px | 80px | 80px | 80px | 80px | **0px** | 0px |

**`sm:py-12` beats the unvariant `pb-20`.** Tailwind v4 emits variant utilities after unvariant ones,
so from **640px up** the `sm:` `padding-block: 48px` wins over `padding-bottom: 80px`. The consequence
is not subtle: **`STICKY_BAR_CLEARANCE` has never been in effect at or above 640px on either route.**
It bought 80px only across 320–639px. Everywhere else it was a class in the list and nothing on the
box — which is exactly the failure mode `mobile-booker-path.spec.ts`'s header warns about in its
"⚠ THE ASSERTIONS ARE ON PIXELS, NEVER ON THE CLASS LIST" paragraph, arriving from the direction
nobody was watching.

Re-derived per row (local dev, `getComputedStyle` + `scrollHeight`, same listing, five widths):

| PNG | old `<main>` pb | new `<main>` pb | new wrapper pb | doc-height delta | CI says |
|---|---|---|---|---|---|
| `listing-detail-320` | 80 | 32 (`py-8`) | +80 | **+32px** | +32px (2986 → 3018) ✔ |
| `listing-detail-768` | 48 (`sm:py-12` won) | 48 | +80 | **+80px** | +80px (2408 → 2488) ✔ |
| `listing-detail-1280` | 48 (`sm:py-12` won) | 48 | +0 (`lg:pb-0`) | **0px** | unchanged ✔ |

Local measurement and CI agree to the pixel. **The corrected prediction is 2 changed
(`listing-detail-320`, `listing-detail-768`), 0 added, 0 deleted, disk still 36.**

Two consequences that are NOT bookkeeping:

1. **There is no desktop change at all.** §5's "80px of trailing whitespace removed at `lg:`" does not
   happen and never could have — `pb-20` was already being overridden at that width. The `lg:pb-0` gate
   is still correct and still required (it stops the wrapper painting an 80px band under the footer at
   desktop widths, where the wrapper's padding is NOT overridden by anything).
2. **`/listings/[id]/book` still carries the overridden spelling.** Its `<main>` is
   `cn("mx-auto w-full max-w-4xl px-4 py-8 sm:py-12", STICKY_BAR_CLEARANCE)` — row 2 of the table
   above. Both sticky bars are `lg:hidden`, so a bar renders up to **1023px**; across **640–1023px**
   the checkout route therefore has a 64px fixed bar over 48px of bottom padding — 16px less than the
   bar's own height, against a declared 80px. Whether a control is actually occluded there is
   **unmeasured**: 17-04's DRIVE 2 was run at 320, which is inside the band where the clearance does
   work. This quick's move fixes the same defect on `/listings/[id]` as a side effect (the wrapper's
   `pb-20` is overridden by nothing), which is why the 768 row moved by +80 instead of the predicted 0.

**DISPATCH HELD.** The diff is a strict subset of the sanctioned rows and nothing unsanctioned moves —
but the sanctioned table named three rows and the mechanism behind all three was wrong, and the
correction surfaces an unrecorded defect on the checkout route. That is a PM call, not an executor's.
`gate-visual` on `dev` is red in exactly the shape this plan calls "the correct pre-dispatch shape",
and one dispatch closes it.

### 7b. Generation run — NOT the evidence

**Dispatched 2026-08-31 by plan 17.1-07, Task 2**, after the PM authorised the held dispatch (D-02).

| | |
|---|---|
| command | `gh workflow run baselines.yml --ref dev` |
| run id | **33336290052** |
| workflow | `baselines` · event `workflow_dispatch` |
| `headSha` | `e2863a705daffeab16136f899249675ac7c70654` (`e2863a7`) |
| conclusion | **success** |
| playwright tally | `43 passed · 42 skipped` (1.7m) — zero failed, zero flaky |
| files staged | **2** (`staged 2 baseline file(s)`) |
| commit it pushed | `e48654f` — *chore(11-22): regenerate visual baselines in the pinned Linux image* |

**THIS RUN IS NOT THE EVIDENCE AND CANNOT BE — and that is a property of the design, not a shortfall
of this particular run.** The commit `e48654f` was pushed by the job using the repository's
`GITHUB_TOKEN`, and *"if a workflow run pushes code using the repository's `GITHUB_TOKEN`, a new
workflow will not run even when the repository contains a workflow configured to run when push events
occur"* (docs.github.com, "Triggering a workflow", quoted verbatim in `baselines.yml`'s header). So
**at the instant this run went green, nothing had ever compared against the two PNGs it had just
written.** Its own green says the surfaces rendered, the fixtures seeded and the files landed. It says
nothing whatsoever about whether a later run agrees with them.

The recursion-prevention property and the nobody-has-verified-these property are **the same sentence**,
and only the first half is memorable. `baselines.yml` says so out loud on its own run page — the
`always()` step fired here too:

```
::warning::These baselines have NOT been verified. A GITHUB_TOKEN push triggers
::warning::no workflow run, so nothing has compared against them.
```

**Writing is not comparing.** The evidence is §7d, and it did not exist when this run finished.

The staging tripwire held: the job stages `"*-visual-linux.png"` only and fails **without committing**
if anything else is staged. Its `git diff --cached --name-status` printed exactly two `M` lines and no
others, so nothing rode along in the baseline commit.

### 7c. The actual diff, read file by file against `D1`

⚠ **Read against `D1`** (`17.1-EVIDENCE.md` § D1) — which is §7a's corrected two-row prediction with
plan 17.1-04's measured `§ P4` rows folded in — **not against §4's superseded three.** `D1` was written
and committed (`9507989`) before `gh workflow run` was invoked.

`git pull --ff-only` → `e2863a7..e48654f`, fast-forward, no divergence.

```
$ git show --stat HEAD
 .../listing-detail-320-court-visual-linux.png      | Bin 118763 -> 118899 bytes
 .../listing-detail-768-court-visual-linux.png      | Bin 137093 -> 137538 bytes
 2 files changed, 0 insertions(+), 0 deletions(-)
```

**1. Every changed/added path ends `-visual-linux.png`.**

```
$ git show --name-status --format="" HEAD
M	e2e/visual/surfaces.spec.ts-snapshots/listing-detail-320-court-visual-linux.png
M	e2e/visual/surfaces.spec.ts-snapshots/listing-detail-768-court-visual-linux.png
```

Two paths, both `M`, both ending `-visual-linux.png`. No other suffix appears.

**2. Zero `*-grove-*`, zero `win32`, zero `darwin`.**

```
$ git show --name-only --format="" HEAD | grep -c 'grove\|win32\|darwin'      → 0
$ ls e2e/visual/surfaces.spec.ts-snapshots/ | grep -c 'grove\|win32\|darwin'  → 0
```

Zero in the diff **and** zero on disk afterwards. T-11-PLATBASE holds.

**3. Exactly the files `D1` predicted changed — with their measured deltas.**

| PNG | md5 before → after | bytes | dimensions before → after | `D1` predicted | verdict |
|---|---|---|---|---|---|
| `listing-detail-320-court-visual-linux.png` | `d1c1d33b…` → `af793eb4…` | 118763 → 118899 | 320×2986 → **320×3018** | +32px | **✔ exact** |
| `listing-detail-768-court-visual-linux.png` | `14418d1b…` → `2deac857…` | 137093 → 137538 | 768×2408 → **768×2488** | +80px | **✔ exact** |

Both heights land on the number `D1` wrote down, which is also the number `gate-visual` had been
reporting as *received* for four consecutive runs. The prediction and the artefact agree to the pixel.

**4. Zero added, zero deleted — disk still 36.**

```
$ ls e2e/visual/surfaces.spec.ts-snapshots/ | wc -l   → 36
```

`git show --name-status` shows two `M` and no `A`, no `D`. And rather than trust the name-status alone,
**all 36 files were md5'd before the dispatch and again after the pull, and the two manifests diffed**:

```
$ diff pre-dispatch-md5.txt post-dispatch-md5.txt | grep -c '^>'   → 2
```

**Exactly two of thirty-six rows moved.** Thirty-four md5s are byte-identical across the dispatch.

**5. `listing-lightbox-1280` and `listing-sheet-375` did NOT move.**

| PNG | md5 before | md5 after | capture mode |
|---|---|---|---|
| `listing-lightbox-1280-court-visual-linux.png` | `76519dc8b910e358fb3b3cc938481780` | **identical** | `viewport` (`visual-drive.ts:455`) |
| `listing-sheet-375-court-visual-linux.png` | `a9bf3df2a84b1c973f43729f86bb60ab` | **identical** | `viewport` (`visual-drive.ts:508`) |

Both hold, for the reason §4 gave in advance: they are `viewport` captures over scroll-locked documents
anchored to a viewport that never shows the footer, so a change in document height cannot reach them.

**The three other rows `D1` singled out also held**, and they are the ones that make this a real read
rather than a formality: `listing-detail-1280` (`477396cf…`, unchanged — §7a's correction confirmed a
second time), `checkout-320` (`080c669f…`, unchanged) and `checkout-1280` (`eb368ebf…`, unchanged) —
the last two being **`§ P4`'s zero-movement claim for plan 17.1-04's repair, now confirmed by the write
path itself and not only by `getComputedStyle`.**

#### ⚠ THE NEAR-MISS, RECORDED BECAUSE IT WAS NAMED IN ADVANCE — `dev-theme-1280`

`D1` named `dev-theme-1280-court-visual-linux.png` as *"the live unpredicted-row candidate"*, because it
was `1 flaky` at `09048d6` and no plan in this phase touches its surface. **It appeared in the
generation run's log, and it is written up here rather than passed over in silence — even though it did
not move.**

What was measured, and nothing more:

```
21:25:37.608Z  /__w/FitOut/FitOut/e2e/visual/surfaces.spec.ts-snapshots/dev-theme-1280-court-visual-linux.png is re-generated, writing actual.
21:25:37.634Z    ✓   5 [visual] › surfaces.spec.ts:413:7 › dev-theme-1280-court.png (6.0s)
...
21:26:54.474Z  M	e2e/visual/surfaces.spec.ts-snapshots/listing-detail-320-court-visual-linux.png
21:26:54.474Z  M	e2e/visual/surfaces.spec.ts-snapshots/listing-detail-768-court-visual-linux.png
```

**THREE files were named `is re-generated, writing actual.` — `dev-theme-1280` and the two
listing-detail rows. TWO were staged.** After the pull, `dev-theme-1280`'s md5 is
`48fb6d7fea587ba70ce488ccc4185ffb` — **identical to its pre-dispatch md5**. So the third write produced
bytes indistinguishable from the ones already committed, and git had nothing to stage.

**Why Playwright named a file it then wrote unchanged bytes for is NOT established by this run**, and
it is left open rather than given a mechanism it has not earned. Two readings survive the evidence and
this run cannot separate them: the capture may have differed on an early attempt inside
`toHaveScreenshot`'s own poll loop and converged before the final write (its **6.0s** against
`dev-theme-320`'s 4.1s and `dev-theme-768`'s 2.5s is consistent with extra attempts, and is the only
supporting signal there is), or the update path may re-encode on a comparator result that byte-equality
does not reproduce. **Naming the mechanism would be describing, not measuring.**

**What IS established:** the row did not move, `D1`'s totals stand unamended, and nothing was absorbed.
No threshold was touched, no re-dispatch was attempted, and no row was added to
`e2e-baseline-reds.md` (`f354deb46435e464c5b8eaba70f81357`, byte-identical across the whole phase).

**What this leaves standing for a later phase, deliberately unfixed here.** This is the **second**
signal in four runs pointing at this one row — `1 flaky` at `09048d6`, and this. It is by a wide margin
the tallest baseline in the set at **1280×8026** (`listing-detail-1280`, the next tallest of the rows
read here, is 1280×2669 — three times shorter), which is the obvious place to look first. Plan 17.1-07
may land nothing but its own evidence (D-03), so this is a **watch item recorded at its first sighting**,
not a repair attempted at the worst possible moment.

#### The invariants that had to survive the pull, re-measured after it

```
$ node scripts/verify-workflows.mjs
   All 38 invariants hold across 3 section(s) (baselines=11, ci=20, cross=7).   exit 0

$ git diff --name-only HEAD -- playwright.config.ts .github/workflows/baselines.yml .github/workflows/ci.yml
   (prints nothing)

$ sed -n '49,87p' baseline-evidence.md | md5sum                  → 48398a95a7a10218baf5df41cc0528cb
   §4 (lines 49-87), measured BEFORE §7b/§7c were written and again AFTER — byte-identical.
   Every hunk in this file's own diff starts at line 197 or below (`git diff --unified=0`
   reports @@197, @@199, @@278, @@280, @@318), so §4 is untouched by construction as well as
   by hash. The whole-file md5 necessarily moved — filling in §7b/§7c is what this task IS;
   quoting a whole-file hash as proof of §4 would be measuring the wrong thing.

$ md5sum .planning/phases/17-*/e2e-baseline-reds.md              → f354deb46435e464c5b8eaba70f81357
   the 10-row denominator, byte-identical across the whole phase
```

### 7d. Comparison run — THE CLOSING EVIDENCE

**This is the deliverable.** The run recorded below is the first thing in this repository's history
that has ever *compared* against the two PNGs §7b's job wrote. §7b is the run that **wrote** them and
is explicitly **not** this evidence; writing is not comparing.

**How it was forced, and why there was no other way.** `ci.yml`'s trigger block, read off the parsed
tree by `scripts/verify-workflows.mjs`, is `triggers=["push","pull_request"]` — **there is no
`workflow_dispatch`**. And "Re-run all jobs" on an older run re-runs at *that run's* SHA, which predates
the new PNGs. So a **new commit on `dev` is the only path**, taken as `git pull --ff-only` (mandatory —
the bot commit `e48654f` had landed on `origin/dev`, and committing without it pushes a divergent
history) followed by `git commit --allow-empty`.

> ⚠ `260830-r4b/PLAN.md` Task 3d offers *"or re-dispatch `ci.yml`"* as an alternative. **That
> alternative does not exist on this tree and was not attempted.** It is recorded here so the next
> reader does not go looking for it.

| | |
|---|---|
| run id | **33336650152** |
| workflow **name** | **`ci`** — *not* `baselines` |
| event | `push` (the forcing commit) |
| conclusion | **`success`** |
| `headSha` | `d87ff54022fbacc846da853117ca21286095f257` |
| forcing commit | `d87ff54` — *chore(17.1): force a gate-visual comparison against the regenerated baselines*, empty of file changes |

**The assertion this section exists to make, shown as two strings rather than asserted in prose:**

```
$ gh run view 33336650152 --json name,conclusion,headSha --jq '[.name,.conclusion,.headSha]'
  ["ci","success","d87ff54022fbacc846da853117ca21286095f257"]

$ git rev-parse HEAD
  d87ff54022fbacc846da853117ca21286095f257
```

`headSha` **==** `git rev-parse HEAD`. Identical, character for character.

**The workflow name is stated because the id alone is not enough.** RESEARCH Pitfall 3's warning sign
is *"a recorded run id whose workflow name is `baselines`"* — an id copied from the generation run and
presented as the comparison. The `name` field above is read from the API in the same call as the
conclusion, so the two cannot be separated: this is `ci`, and `baselines`'s run (33336290052) is
recorded one section up under a heading that says it is not the evidence.

**Per-job breakdown — all four green:**

| job | conclusion | job id |
|---|---|---|
| `gate-db-free` (lint + design + build + workflow parse) | **success** | 99324664775 |
| `gate-db` (vitest against PostGIS 18) | **success** | 99324664879 |
| **`gate-visual` (GATE-01 visual regression)** | **success** | 99324664900 |
| `gate-price-parity` (DB-vs-DOM price, 1 spec) | **success** | 99324664940 |

`gate-visual` tally: **`43 passed · 42 skipped (2.2m)`** — **zero failed and zero flaky.** The two rows
that had been red for four consecutive runs both pass **on their first attempt**:

```
✓  22 [visual] › surfaces.spec.ts:413:7 › listing-detail-320-court.png (6.4s)
✓  23 [visual] › surfaces.spec.ts:413:7 › listing-detail-768-court.png (3.6s)
```

And `dev-theme-1280-court.png` — the row §7c records the generation log naming, and the row `D1` named
in advance as the live candidate — **passed on its first attempt in 3.3s** (it took 6.0s in the
generation run). One clean pass is not proof that its intermittency is gone, and §7c's watch item
stands; but nothing transient was baked into the reference set by this dispatch.

**`dev` is green.** `[17-D9]` / GATE-01's four-run red is closed by a regeneration through the one
sanctioned write path, read against a prediction written before the dispatch.

**WHY THIS RECORD IS DELIBERATELY UNCOMMITTED.** §7d cannot be written before the run it describes, so
it cannot be inside the commit that triggered that run — and any commit landing after `d87ff54` moves
`HEAD` and makes the assertion above false. This section and plan 17.1-07's SUMMARY are therefore left
**uncommitted in the working tree** and flagged `uncommitted_for_orchestrator:` in that SUMMARY's
frontmatter (this repo's established idiom — quick `260828-qd5` used it for exactly this reason), so
that `headSha == git rev-parse HEAD` is true at the moment a reader checks it. When the orchestrator
commits these documents, that docs-only commit will trigger its own `ci` run, whose conclusion must
**also** be green — **appended below as a confirmation line, never as a replacement for the run
recorded above.**

```
Confirmation line (to be appended by the orchestrator after its docs-only commit):
  ci run <id> on <sha>, conclusion <...>, gate-visual <...>
```

**Nothing else landed after this run.** No code change, no gate change, no threshold, and no row added
to `.planning/phases/17-*/e2e-baseline-reds.md` (`f354deb46435e464c5b8eaba70f81357` — byte-identical
across the whole phase).
