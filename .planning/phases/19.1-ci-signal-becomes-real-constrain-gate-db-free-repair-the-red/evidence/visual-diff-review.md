# GATE-01 — the twelve failing baselines, measured before anything is overwritten

**Plan 19.1-12, Task 1.** Twelve baseline comparisons are failing on `gate-visual`. Until this plan they
were compared and their diff images destroyed on the same runner in the same second, because nothing
uploaded them. They are now downloadable, and every figure below was measured from those images or from
the job log — none is carried over from `19.1-RESEARCH.md`.

**Verdict columns are deliberately empty.** Filling them is Task 2, and Task 2 is a blocking human
decision (`gate="blocking-human"`). A pixel comparison cannot classify itself; that is the whole reason
the diffs are uploaded first.

## Provenance

| what | value |
|---|---|
| run | `33968421339` (branch `dev`, head `f03be7b`) |
| job | `gate-visual (GATE-01 visual regression)` — `101312530205`, conclusion **failure** |
| artifact | `visual-diffs`, id `9970263171`, 38,526,148 B, 108 PNGs |
| downloaded to | `C:/Users/Admin/visual-diffs-19.1-12/` (outside the repository — 38 MB of binaries are not committed) |
| annotated crops | `C:/Users/Admin/visual-diffs-19.1-12/_crops/` (expected ABOVE a magenta rule, actual BELOW, same y-range) |
| baselines under comparison | minted `2026-08-30` by `bac4b62` / `e48654f` (`chore(11-22): regenerate visual baselines in the pinned Linux image`) |
| tracked baseline set | 36 files; 12 failing, 31 passing, 42 skipped (the skipped set is PINNED by `surfaces.spec.ts`'s own inventory test, so it cannot silently grow) |

Per baseline the artifact holds three images, in `test-results/visual-surfaces-<arg>-png-visual/`:
`<arg>-expected.png`, `<arg>-actual.png`, `<arg>-diff.png`. Uploading all three rather than the diff
alone is a deviation from the plan's text and the reason is in the row order below: the diff is a red
mask that says WHERE pixels changed and never WHAT they changed to, and every question Task 2 has to
answer is a WHAT question.

## The twelve rows

`Δh` is the height change. `px (PW)` is Playwright's own reported figure — pixelmatch, with an
antialiasing tolerance. `px (exact)` is an independent byte-exact recount made here over the overlapping
region, with no tolerance at all; it is larger by construction and the two are NOT the same measurement.
`band` is the first row at which expected and actual stop being byte-identical.

| # | baseline | expected → received | Δh | px (PW) | px (exact) | first changed row | verdict | explanation |
|---|---|---|---|---|---|---|---|---|
| 1 | `dev-theme-320-court` | 320×24786 → 320×24842 | +56 | 510,560 | 1,898,145 | y 3265 | | |
| 2 | `dev-theme-768-court` | 768×16969 → 768×17025 | +56 | 535,698 | 2,521,947 | y 2325 | | |
| 3 | `dev-theme-1280-court` | 1280×8026 → 1280×8054 | +28 | 411,679 | 1,637,349 | y 2345 | | |
| 4 | `search-results-320-court` | 320×2968 → 320×3024 | +56 | 61,175 | 193,805 | y 1289 | | |
| 5 | `search-results-768-court` | 768×2080 → 768×2108 | +28 | 8,870 | 50,679 | y 1244 | | |
| 6 | `search-results-1280-court` | 1280×1690 → 1280×1718 | +28 | 28,000 | 118,449 | y 853 | | |
| 7 | `search-relax-band-320-court` | 320×1868 → 320×1868 | **0** | 385 | 2,572 | y 1367 (band ends y 1386) | | |
| 8 | `search-relax-band-1280-court` | 1280×1260 → 1280×1260 | **0** | 385 | 2,572 | y 903 (band ends y 922) | | |
| 9 | `listing-detail-320-court` | 320×3018 → 320×3094 | +76 | 6,846 | 63,268 | y 1174 | | |
| 10 | `listing-detail-768-court` | 768×2488 → 768×2544 | +56 | 7,014 | 107,147 | y 1272 | | |
| 11 | `listing-detail-1280-court` | 1280×2669 → 1280×2725 | +56 | 7,008 | 92,889 | y 1442 | | |
| 12 | `collision-notice-1280-court` | 1280×2879 → 1280×2935 | +56 | 7,008 | 92,887 | y 1442 | | |

Rows 7 and 8 carry **no** `Expected an image …, received …` line in the job log at all, because their
dimensions did not move. `19.1-RESEARCH.md`'s delta table has ten rows for twelve baselines for exactly
that reason; the two it is missing are these.

## The two summary lines Task 2 must add

Both are **deliberately absent** until a human has classified the rows. Task 2 writes them here, each
beginning at column 0 so that `grep -c '^HYPOTHESIS'` and `grep -c '^REGRESSIONS'` measure Task 2's work
and not this placeholder — a check a placeholder satisfies is a check that has stopped measuring
anything, which is the failure this phase exists to remove.

<!-- Task 2: replace this comment with one line beginning HYPOTHESIS and one beginning REGRESSIONS. -->


---

# The analytical half

## 1. The single shared element, and it holds — but it explains ten of twelve, not eleven

**It is the `Checked by FitOut` verification badge**, shipped by `e245dfe` —
`feat(18-11): badge the listing detail page from a boolean computed in the RSC` — which lands **after**
the 2026-08-30 baselines. It is fed by the `host_verification` row (`status: approved`, `provider:
manual`) that `scripts/seed-baseline-fixtures.ts:206` already creates, so the fixture was ready for it
and only the reference images are behind.

It is not inferred from the height arithmetic. It was read off the images:

* `_crops/relax-1280.png` — the badge appears inline after `Tennis court` on a search card. It fits on
  the existing line, so the card does not grow. **This is why rows 7 and 8 have Δh = 0.**
* `_crops/results-1280.png` — three cards side by side. On two of them the badge fits inline; on
  `Mandaluyong Open Mat Sessions`, which already carries a `Drop-in` chip, it **wraps to its own line**.
  That wrap is the atomic **+28px**.
* `_crops/devtheme-band.png` — the same badge, wrapping the same way on the `/dev/theme` card gallery.

So the repeating delta is one element with two behaviours, and the arithmetic follows from which:
+0 where it fits inline, +28 per row where it wraps, +56 where two rows wrap (or where the listing page
adds the two-line explanation below).

**The eleven-of-twelve figure in the plan does not survive contact with the images.** Ten of the twelve
are the badge alone. The remaining two are the badge **plus** something the plan and the research both
missed, and it is section 3.

## 2. The two rows to look hardest at — and they are not the two the research named

The plan's own rule is the right one: *a diff whose dimensions barely moved but whose pixel proportion is
high is a content change rather than a reflow.* Applied to the measurements, it selects **rows 7 and 8**,
the two `search-relax-band` baselines: Δh = **0**, and every changed pixel confined to a **20-pixel-tall
band** (y 1367–1386 at 320, y 903–922 at 1280) with an identical exact-byte count of **2,572** at both
widths. Nothing else in the set is dimension-stable.

`19.1-RESEARCH.md` instead named `search-results-320` and `search-relax-band-320` on the basis of a `0.07`
ratio. That sort is misleading here, and measurably so: the two `0.07` rows are `dev-theme-320` and
`search-results-320`, and **both have height deltas**, which is precisely what inflates a ratio — once a
block grows, every pixel below it is "different" merely by having moved. A high ratio on a row that
reflowed is the least informative number in the table. Playwright's printed ratio is also rounded to two
decimals, so rows 7 and 8 print `0.01` for 385 pixels out of ~1.6 million, an actual ratio of `0.0002`.

Looked at hardest, per that rule: rows 7 and 8 are the badge, inline, changing nothing else. The rule
worked; it just pointed at the mildest change in the set rather than the most dangerous one.

## 3. ⚠ Four baselines contain content that is a function of the CALENDAR, not of the product

This is not in the plan, not in the research, and it decides whether Task 3 can do what it says.
Both findings were read off the images and then confirmed in the source rather than inferred.

**3a. The availability calendar marks today.** `_crops/listing-cal.png` shows the September 2026 grid
identical in both images except for one cell: in the *actual*, day **5** carries a neutral rounded
background; in the *expected* it does not. `src/components/availability/availability-calendar.tsx:661`
says so in its own comment — *"Selected day = coral (UI-SPEC accent #1); today stays the neutral
`--muted` ring."* Today is 2026-09-05. On 2026-08-30, when the baseline was shot, "today" was not inside
the rendered month, so no cell was marked. Zero height change; a pure content difference that moves one
cell to the right every day.

**3b. `Host since <month> <year>` is the month the seed ran.** `_crops/collision-band.png`:
expected reads `Host since August 2026`, actual reads `Host since September 2026`. The chain is three
reads long and none of it is guesswork — `scripts/seed-baseline-fixtures.ts:193` inserts the host with
`created_at` = `now()`; `src/components/listing/host-block.tsx:159` renders
`Host since {formatMemberSince(createdAt)}`; `src/lib/profile.ts:74` formats that as `month: "long",
year: "numeric"`. It changes on the first of every month.

**Which baselines are exposed:** `HostBlock` and `AvailabilityCalendar` are rendered by exactly one route,
`src/app/listings/[id]/(detail)/page.tsx`. That is rows **9, 10, 11 and 12** — the three `listing-detail`
widths and `collision-notice-1280`. Rows 1–8 are clean: `/dev/theme` renders neither component (its
`dev/theme/` directory holds only `slot-picker-preview` and `error-state-preview`, and the `Sat, Mar 14`
in its cards is identical in both images), and the search surfaces render neither.

Row 11's row-alignment scan shows the two causes cleanly separated on one page:

```
A  y    0..1441   identical
X  y 1442..1485   the calendar's today cell            <- 3a, no height change
A  y 1486..2355   identical, still NOT shifted
X  y 2356..2375   the Checked by FitOut badge (20px)   <- the badge
X  y 2383..2394   August -> September                  <- 3b, no height change
S  y 2457..2668   identical after shifting down 56px   <- the two-line explanation below the badge
```

**Why this matters for Task 3, stated as a consequence and not as a verdict.** Task 3's `<done>` requires
"a deliberately triggered run has compared against the new set and reported the visual job green", and
D-04's purpose is that `gate-visual` stops being red on every push. A reference set minted today records
*today is 5 September* and *Host since September 2026*. On 6 September the calendar marks a different
cell and rows 9–12 are red again; on 1 October the host line changes and they are red again. Regeneration
alone therefore buys a gate that is green for one push. **It does not follow that these rows are broken
product code** — the calendar marking today and a member-since line are both plausibly correct behaviour.
What is measured is narrower and is only this: four of these twelve reference images cannot be made
stable by regenerating them, because the thing that differs is the clock.

The seed script's own docblock, quoted in `ci.yml`'s seeding step, names this failure mode:
fixed ids, coordinates, rates and windows are used *"deliberately not `randomUUID()`, because anything
that varies between runs shows up as a pixel diff and trains people to re-mint the reference instead of
reading the diff."* `now()` on line 193 is a value that varies between runs.

## 4. The hydration mismatch does NOT touch any of the twelve

The plan asks which surface produced the `Hydration failed because the server rendered text didn't match
the client` the research saw, because a nondeterministic screenshot mints an unstable baseline.

Measured from the job log's interleaved `[WebServer]` and reporter lines: it fires **twice**, at
`13:22:04.754` and `13:22:12.588`, bracketed by test 49 `checkout-320-court.png` (green, 9.3s) and test 50
`checkout-1280-court.png` (green, 6.0s). The React stack names `url={"/listing..."}`
`params={{id:"vrt_li..."}}`. **Both checkout surfaces PASS and neither is in the failing twelve**, so no
image regenerated by this plan is downstream of it.

It is still a live instability on two currently-green baselines and it is carried, not closed, by this
plan — see `deferred-items.md`.

## 5. Every one of the twelve is deterministic within the run — proved, not assumed

`gate-visual` retries twice, so each of the twelve produced three independent screenshots minutes apart
in the same container. The `-actual.png` files are **byte-identical across all three attempts** for all
twelve (md5, first 12 hex digits):

| baseline | attempt / retry1 / retry2 |
|---|---|
| `collision-notice-1280-court` | `810bdd69ad77` × 3 |
| `dev-theme-1280-court` | `995e6e1b96b3` × 3 |
| `dev-theme-320-court` | `9262d5f9baaf` × 3 |
| `dev-theme-768-court` | `87894cb40a15` × 3 |
| `listing-detail-1280-court` | `2e512bb9a566` × 3 |
| `listing-detail-320-court` | `356a80b3042d` × 3 |
| `listing-detail-768-court` | `8fc14fb80a6e` × 3 |
| `search-relax-band-1280-court` | `e8ba9258078d` × 3 |
| `search-relax-band-320-court` | `eb9196b5cc7a` × 3 |
| `search-results-1280-court` | `6dd453839bfb` × 3 |
| `search-results-320-court` | `0a565164c225` × 3 |
| `search-results-768-court` | `156f4254e942` × 3 |

This is what closes T-19.1-58 for these twelve *within a run*. It says nothing about section 3, which is
instability **across days** and which three attempts eight minutes apart cannot detect by construction.
Reading this table as "the baselines are stable" is the mistake it is here to prevent.

---

## A note on this document's own verification, because the phase is about exactly this

Task 2's `<verify>` is `grep -cE 'DRIFT|REGRESSION'` over this file, required to be ≥ 12. **That
instrument can be satisfied without a single row being classified** — it counts LINES containing either
token anywhere, so twelve sentences of prose would satisfy it while the verdict column stayed empty.
It is the same shape as the defect plan 19.1-06 measured, where an invariant whose printed name was
"runs the visual project BY NAME" was satisfied by an `echo`. The prose here therefore uses those two
tokens as sparingly as it can, and the honest instrument — which can only be satisfied by a filled
table cell — is:

```
grep -cE '^\| [0-9]+ \| `[a-z0-9-]+` \|.*\| (DRIFT|REGRESSION) \|' <this file>
```

That must be **12**, and no arrangement of prose can move it.

---

*Plan: 19.1-12 · Phase: 19.1-ci-signal-becomes-real-constrain-gate-db-free-repair-the-red*
*Task 1 complete. Task 2 (blocking human classification) is next; nothing has been regenerated.*
