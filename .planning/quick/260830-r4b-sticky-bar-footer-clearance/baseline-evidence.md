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

To be recorded: `baselines.yml` `workflow_dispatch` run id and conclusion.

**This run is not the evidence and cannot be.** Its commit is pushed with `GITHUB_TOKEN`, and a
`GITHUB_TOKEN` push triggers no workflow — so at the moment it finishes, nothing has ever compared
against the PNGs it just wrote. `baselines.yml`'s own header says so in a `::warning::`. Writing is
not comparing.

### 7c. The actual diff, read file by file against §4

To be recorded, all five:

1. every changed/added path ends `-visual-linux.png`;
2. zero `*-grove-*`, zero `win32`, zero `darwin`;
3. exactly the three predicted files changed;
4. zero added and zero deleted — disk still 36;
5. `listing-lightbox-1280` and `listing-sheet-375` did not move.

### 7d. Comparison run — THE evidence

To be recorded: the forced `ci.yml` run's id, conclusion and `headSha`, with `headSha` equal to
`git rev-parse HEAD`. A green comparison run on the head commit is the deliverable. **Nothing lands
after it** — a later commit invalidates it.
