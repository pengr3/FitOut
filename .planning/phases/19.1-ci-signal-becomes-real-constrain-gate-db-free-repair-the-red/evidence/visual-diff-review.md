# GATE-01 — the twelve failing baselines, measured before anything is overwritten

**Plan 19.1-12, Task 1.** Twelve baseline comparisons are failing on `gate-visual`. Until this plan they
were compared and their diff images destroyed on the same runner in the same second, because nothing
uploaded them. They are now downloadable, and every figure below was measured from those images or from
the job log — none is carried over from `19.1-RESEARCH.md`.

**Verdict columns are filled as of Task 2** (blocking human decision, `gate="blocking-human"`). A pixel
comparison cannot classify itself; that is the whole reason the diffs are uploaded first.

**⚠ HOW THE VERDICTS WERE OBTAINED, STATED PRECISELY, BECAUSE THE PROVENANCE IS THE POINT.** The PM
opened the five annotated crops in `_crops/` and classified **at the group level**: no regressions were
found, and all twelve diffs are drift. The PM did **not** write twelve individual sentences, and this
document does not pretend otherwise. So each row's `verdict` cell carries the PM's classification, and
each row's `explanation` cell carries the **measured** cause established in Task 1 — the badge reflow for
rows 1–8, and the badge plus the two-line explanation plus the two clock-dependent elements of section 3
for rows 9–12. A row's explanation is therefore evidence, not testimony; the verdict is testimony, and it
was given per group.

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
| 1 | `dev-theme-320-court` | 320×24786 → 320×24842 | +56 | 510,560 | 1,898,145 | y 3265 | DRIFT | The `Checked by FitOut` badge (`e245dfe`, post-dates the baseline) wrapping to its own line on two cards of the theme gallery — 2 × 28px, and every pixel below y 3265 differs only by having moved. |
| 2 | `dev-theme-768-court` | 768×16969 → 768×17025 | +56 | 535,698 | 2,521,947 | y 2325 | DRIFT | The same badge, wrapping on two cards at this width; identical +56 from the identical cause, and `_crops/devtheme-band.png` shows the wrap directly. |
| 3 | `dev-theme-1280-court` | 1280×8026 → 1280×8054 | +28 | 411,679 | 1,637,349 | y 2345 | DRIFT | The same badge wrapping on ONE card at this width — the atomic +28 — because the wider gallery column lets the other card keep it inline. |
| 4 | `search-results-320-court` | 320×2968 → 320×3024 | +56 | 61,175 | 193,805 | y 1289 | DRIFT | The same badge on the results cards; at the 320 floor it wraps on two of the three, giving 2 × 28px. |
| 5 | `search-results-768-court` | 768×2080 → 768×2108 | +28 | 8,870 | 50,679 | y 1244 | DRIFT | The same badge wrapping on `Mandaluyong Open Mat Sessions` only — the card that already carries a `Drop-in` chip, so the badge has nowhere inline to go. |
| 6 | `search-results-1280-court` | 1280×1690 → 1280×1718 | +28 | 28,000 | 118,449 | y 853 | DRIFT | The same single wrap on the same `Drop-in` card, read directly off `_crops/results-1280.png` where the other two cards keep the badge inline. |
| 7 | `search-relax-band-320-court` | 320×1868 → 320×1868 | **0** | 385 | 2,572 | y 1367 (band ends y 1386) | DRIFT | The same badge, INLINE after `Tennis court` — it fits, so the card does not grow, and the entire change is a 20px band with nothing displaced. |
| 8 | `search-relax-band-1280-court` | 1280×1260 → 1280×1260 | **0** | 385 | 2,572 | y 903 (band ends y 922) | DRIFT | Identical to row 7 at the other width — same badge, same inline fit, same byte-exact 2,572 changed pixels, confirming one element rather than two coincidences. |
| 9 | `listing-detail-320-court` | 320×3018 → 320×3094 | +76 | 6,846 | 63,268 | y 1174 | DRIFT | Badge + the two-line explanation beneath it (+76 at this width), PLUS the two clock-dependent elements of section 3 — the calendar's today cell and `Host since August → September 2026` — neither of which regeneration can stabilise. |
| 10 | `listing-detail-768-court` | 768×2488 → 768×2544 | +56 | 7,014 | 107,147 | y 1272 | DRIFT | The same three causes as row 9 at this width; the badge block contributes the +56 and the two clock-dependent elements contribute no height at all. |
| 11 | `listing-detail-1280-court` | 1280×2669 → 1280×2725 | +56 | 7,008 | 92,889 | y 1442 | DRIFT | The same three causes, and the row-alignment scan above separates them on one page: today cell at y 1442, badge at y 2356, month word at y 2383, everything below y 2457 merely shifted 56px. |
| 12 | `collision-notice-1280-court` | 1280×2879 → 1280×2935 | +56 | 7,008 | 92,887 | y 1442 | DRIFT | The same listing page in its refused-hold state, so it inherits all three causes unchanged — the pixel count differs from row 11 by 2, which is the notice itself and not a fourth cause. |

Rows 7 and 8 carry **no** `Expected an image …, received …` line in the job log at all, because their
dimensions did not move. `19.1-RESEARCH.md`'s delta table has ten rows for twelve baselines for exactly
that reason; the two it is missing are these.

## The two summary lines — written by Task 2

Each begins at column 0 so that `grep -c '^HYPOTHESIS'` and `grep -c '^REGRESSIONS'` measure Task 2's
work and not a placeholder — a check a placeholder satisfies is a check that has stopped measuring
anything, which is the failure this phase exists to remove.

HYPOTHESIS held, but at ten of twelve rather than the plan's eleven: ONE shared element — the `Checked by FitOut` verification badge shipped by `e245dfe` after the 2026-08-30 baselines — explains rows 1 through 8 completely and explains the height change on rows 9 through 12; rows 9–12 additionally carry two elements that are functions of the CALENDAR rather than of the product (section 3), which neither the plan nor the research anticipated.

REGRESSIONS: 0 — the PM classified at the group level against the five annotated crops and found no regressions; all twelve diffs are drift. Rows 9–12 are nonetheless NOT regenerated by this plan, and the reason is stability rather than correctness: their references would encode "today is 5 September 2026" and "Host since September 2026" and expire at the next day-rollover, so the outstanding condition on them is fixture work, not a defect fix. See "Rows 9–12" below.

## What the PM decided, and the condition attached to it

The PM chose neither of the plan's two options but a third that this checkpoint raised: **regenerate rows
1–8 only, and treat rows 9–12's clock-dependence as fixture work to be done BEFORE those four references
are minted.** A today-ring and a member-since line are both plausibly correct product behaviour; the
objection is narrower and is only that a reference image encoding a particular calendar day expires the
next day.

The PM carried forward D-02's condition verbatim: **if the fixture fix is not small and localised, the
phase grows by a plan rather than the diff being blessed.** Task 3 makes that call on measurement and
records it. Leaving four baselines red with a stated reason is an acceptable outcome; minting an unstable
reference is not.


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

# Task 3 — regeneration, and what a real run said about it

## What was regenerated, and what was deliberately un-minted

**The dispatch workflow has no filter.** `baselines.yml` runs
`npx playwright test --project=visual --update-snapshots` over the whole project and stages
`*-visual-linux.png` by glob, so a dispatch mints every baseline that differs — twelve, not the eight
the PM authorised. That is a property of the only sanctioned write path, and the alternative
(teaching it a filter input) means editing the one job in the repository that holds `contents: write`
and carries eleven invariants. It was not worth it for one plan.

So the sequence was **mint twelve, then un-mint four**, and both halves are in the history:

| commit | what it did |
|---|---|
| `9dd4bcf` | the restore point, committed BEFORE the dispatch so its ancestry is structural |
| `7d225a7` | the regeneration (bot, run `33971562151`) — twelve baseline images, nothing else |
| `5d9e90f` | rows 9–12 restored to their pre-regeneration bytes, byte-identity verified per file |

**The four were un-minted for stability, not for correctness** — and this was confirmed by looking at
what the dispatch actually produced rather than by re-asserting section 3. Cropped from the minted
`listing-detail-1280` before it was reverted:

* `evidence/minted-rows-9-12-host-since.png` — the host line reads **`Host since September 2026`**,
  the month the dispatch ran, beside the `Checked by FitOut` badge.
* `evidence/minted-rows-9-12-today-cell.png` — the September grid with days 1–4 greyed and **day 5
  carrying the today ring**: 5 September 2026, the day the dispatch ran.

Those two images are the whole argument. A reference encoding "today is 5 September" is red on
6 September. Regenerating rows 9–12 would have bought a gate that is green for one push, which is the
habit SC4 exists to break rather than a repair of it.

## The D-02 call on the fixture fix: NOT small and localised

Measured in `evidence/rows-9-12-fixture-probe.txt`. The short version: it is three changes in three
layers plus a test, and the third is production source —
`react-day-picker@10.0.1` defaults its `today` modifier to the wall clock
(`DayPicker.js:131`) and nothing in this repository passes the prop, so fixing it means changing the
ring from the rendering host's day to venue-local today. That is a **product** question, not a
fixture question. Compounding it, the visual project is not constructed off Linux (D-29), so the
fix's effect on the rendered calendar **cannot be observed before minting** — doing it here would
have committed four references whose stability was an assumption.

⚠ **The 17-D26 seam is incomplete, and that is worth knowing on its own.** `devTodayOverride`
(`?today=`) was built precisely to stop these four baselines expiring at the day-rollover. It moves
`startMonth`, `endMonth`, `disabled` and the `initialDate` fallback — and it does not reach the one
element that still expires. Its docblock reads as though the case is closed. It is not.

The follow-up specification is six points at the foot of `rows-9-12-fixture-probe.txt`, and is also
logged as `D-19.1-D` in `deferred-items.md`.

## The verifying run

The dispatch workflow's own push produces no workflow run — `baselines.yml`'s header says so in a
warning step — so until a run is triggered nothing has compared against the new files. Pushing
`5d9e90f` triggered one deliberately.

| what | value |
|---|---|
| verifying run | **`33971883942`** (branch `dev`, head `5d9e90f`, event `push`) |
| `gate-visual` result | **failure — 4 baselines**, down from 12 |
| `gate-db-free` | success (lint + design + build + workflow parse) |
| `gate-db` / `gate-price-parity` | success |
| images changed by the regeneration | 12 minted, **8 kept**, 4 restored |
| diff artifact | `visual-diffs`, **4,938,154 B** — against 38,526,148 B on run `33968421339` |

**The four that still fail are exactly the four that were un-minted**, read from the artifact rather
than from the summary line:

```
collision-notice-1280-court
listing-detail-1280-court
listing-detail-320-court
listing-detail-768-court
```

Twelve `-diff.png` files for four baselines, because `gate-visual` retries twice. **No row from 1–8
appears.** That is the load-bearing result: the eight regenerated references were compared against by
a real run and agreed with, and the four that remain red are the four this plan deliberately did not
touch. The count moved 12 → 4 for stated reasons, not by a threshold moving.

VERIFIED — the regenerated reference set has been compared against by a real workflow run (`33971883942`), not merely committed. Eight baselines are green against images minted in the pinned Linux container by the sanctioned dispatch path; four remain red by decision, and `evidence/rows-9-12-fixture-probe.txt` says what would have to happen before they can be minted honestly.

## What this plan did NOT achieve, said plainly

`gate-visual` is still red. D-04's goal is that it stops being red on every push, and this plan gets
two thirds of the way: eight of the twelve standing failures are gone and the remaining four have a
written cause, an observational proof, and a specification. A phase that reported this as green would
be doing the thing this phase exists to stop.

---

*Plan: 19.1-12 · Phase: 19.1-ci-signal-becomes-real-constrain-gate-db-free-repair-the-red*
*All three tasks complete. Twelve rows classified, eight references regenerated, four un-minted.*
