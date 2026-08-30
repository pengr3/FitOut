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

### 7a. Pre-dispatch CI shape

To be recorded: the `gate-visual` conclusion on `4636206`, and whether the red is a **pixel diff** on
the three predicted `listing-detail` rows (the correct shape) rather than a connection error, a
missing snapshot, or a red on an untouched row (each of which blocks the dispatch).

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
