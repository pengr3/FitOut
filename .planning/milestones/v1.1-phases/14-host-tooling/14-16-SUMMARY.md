---
phase: 14-host-tooling
plan: 16
subsystem: ui
tags: [design-system, accessibility, playwright, visual-regression, responsive, headings, tone, wcag]

# Dependency graph
requires:
  - phase: 14-host-tooling
    provides: "the five restyled surfaces themselves — 14-05/14-08 (the dashboard and its four states), 14-03/14-06 (the requests inbox), 14-07 (the bookings table), 14-09/14-10/14-11 (the wizard's rail, checklist and save state), 14-12/14-13 (the availability route and its week strip). Every claim below is CROSS-surface, so none of it could be made before all five landed"
  - phase: 14-host-tooling
    provides: "14-01's earnings freeze (D-156) — the reason `/host/earnings` and every `payout-*` file was declared from the spec and the seed script WITHOUT being opened; 14-15's seven measured row heights, which supply the widths' reasons in the baseline rows"
  - phase: 13-booking-confirmation-and-payment-states
    provides: "`e2e/overflow-320.spec.ts`'s Phase-13 block — the one-fixture-per-block shape, `expectTargets`, `expectVisibleFocus` and the named-skip convention this plan extended rather than re-authored; `src/lib/design/visual-baselines.ts`'s twenty declared-and-blocked rows, which are the shape and the reason-length the nine host rows match"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "`patterns/page-header.tsx` (the one-`<h1>`-per-page guarantee every surface below leans on), `helpers/overflow.ts`'s `expectNoOverflow`, and `tests/design/helpers/strip-comments.ts` — the ONE comment stripper the census measures through"
provides:
  - "`e2e/host-headings.spec.ts` — 28 states across five surfaces, 84 heading readings at three widths, one first-level heading each and all 84 the same size, with the full set grouped by size in the failure message"
  - "`e2e/overflow-320.spec.ts`'s third block — the five Phase-14 routes in the existing sweep, both themes, calling the same three assertions the other two blocks call, plus a per-row DECLARED 44px touch floor whose empty declarations carry reasons"
  - "`tests/design/host-tone-census.test.ts` — the alarm-token census as a pinned per-file map with a reason on every entry, asserted in three directions and watched red in all three"
  - "fifteen declared court-only baseline rows across nine host surfaces, ALL BLOCKED, each naming the fixture file and the specific missing piece"
  - "one measured accessibility fix: the dashboard's route-out link was 4px under the WCAG 2.5.8 AA target bar and the sweep found it on its first run"
affects: [phase-14-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A cross-surface claim is a SET, not a pair: every reading is recorded, the set is asserted to collapse to one value, and the failure message prints the whole set grouped so a red names the outlier instead of reporting that a number moved"
    - "A declared-empty list carries its argument. Three of five sweep rows declare zero 44px controls, and each says WHY — because an omitted declaration and a considered one look identical in a green run"
    - "A gate that pins a count pins it in BOTH directions and in the middle: undeclared file, vanished file, drifted count. All three watched red; the middle one is the direction a floor and a ceiling both miss"
    - "A date LITERAL in a spec has a shelf life. `page.clock.pauseAt` only moves forward, so a pinned instant becomes `Cannot fast-forward to the past` on a schedule — the pin's job was to STOP time, not to stop it on a particular day"

key-files:
  created:
    - e2e/host-headings.spec.ts
    - tests/design/host-tone-census.test.ts
  modified:
    - e2e/overflow-320.spec.ts
    - src/lib/design/visual-baselines.ts
    - src/components/host/host-agenda.tsx
    - e2e/visual/surfaces.spec.ts
    - .planning/phases/14-host-tooling/deferred-items.md

key-decisions:
  - "AC#39's literal 'zero new' alarm tokens is NOT met, and the census says so rather than averaging it away: the three trees ship NINE occurrences across five files where 14-RESEARCH measured EIGHT across four. The extra one is `wizard.tsx`'s D-150 save-state failure ink, added by plan 14-11, and it sits inside the role's own reservation"
  - "All nine visual baselines are DECLARED AND BLOCKED and not one was generated — the `visual` Playwright project is constructed only on Linux and this machine is win32, so the command does not exist here. 66 declared / 36 blocked / 30 shot, and the 30 is the same thirty PNGs as before the phase"
  - "The 44px clause of AC#36 is asserted only on the controls 14-UI-SPEC actually DECLARES at that height. `/host`'s coral `Create listing` renders at the Button's default, because D-22 makes the touch size an explicit opt-in — asserting 44 there would be red against reviewed code, which is the false-positive failure this file already refused once"
  - "The wizard rows WALK rather than navigate, because the wizard holds its position in React state and the rail only moves backward — and the walk asserts `Step 1 of 9` / `Step 1 of 8` first, so a walk that silently ran one mode twice cannot report eighteen green headings"
  - "`e2e/visual/surfaces.spec.ts` was edited outside this plan's `files_modified`: it hard-codes the baseline count and the blocked SET, and leaving them stale would have shipped a guaranteed red in the one environment that actually shoots baselines"

patterns-established:
  - "Measure the tree this commit produces before writing the map. The census was authored with an EMPTY map, run once, and populated from what the run reported — which is how the +1 nobody had recorded was found"
  - "When a probe reverts a source file, copy it aside first and restore from the copy: `git checkout --` restores HEAD, not the pre-probe working tree, and would silently discard uncommitted task edits in the same file"

requirements-completed: [HFLOW-03, HFLOW-04]
requirements-already-complete: [HFLOW-01, HFLOW-02, HFLOW-05]

# Metrics
duration: 3h20m
completed: 2026-08-24
---

# Phase 14 Plan 16: The Five Hard Gates, As Commands Summary

**The three claims no single-surface plan could make are now commands: all five host surfaces render exactly one first-level heading at one identical size, all five hold the 320px floor in both themes, and the alarm-token census is a measured per-file map that says out loud the phase added one occurrence rather than none.**

## Performance

- **Duration:** ~3h20m (baseline design run 23:26 on 23 Aug; final verification 00:5x on 24 Aug)
- **Tasks:** 3
- **Files:** 2 created, 5 modified (4 in the plan's `files_modified`, plus `e2e/visual/surfaces.spec.ts` and `deferred-items.md` — both disclosed below)

## Task Commits

1. **Task 1: One heading per document, and the 320px floor on all five surfaces** — `19ff9d0` (test)
2. **Task 2: The alarm-token census, as a pinned per-file map** — `0ad610d` (test)
3. **Task 3: Nine declared court-only baselines, honestly blocked** — `99eff65` (feat)

---

## ⚠ THE VISUAL BASELINES ARE DECLARED AND BLOCKED. NONE WAS GENERATED.

Stated first, in the place a reader will see it, because the failure this plan was most able to
commit was implying coverage it does not have.

**`--project=visual` DOES NOT EXIST ON THIS PLATFORM.** `playwright.config.ts:39` constructs that
project only when `process.platform === "linux"`; this box is **win32**. Run against it:

```
$ npx playwright test --project=visual --list
[playwright] project "visual" is NOT collected on win32: baselines are generated and compared ONLY
in mcr.microsoft.com/playwright:v1.60.0-noble (D-27/D-29); a non-Linux run would compare against, or
be tempted to mint, a platform baseline that can never be committed.
Error: Project(s) "visual" not found. Available projects: "chromium"
```

So:

- **No baseline was generated.** Not attempted, not skipped-and-reported-as-done — the command that
  would generate one does not exist on this machine.
- **No committed picture moved.** `git status --porcelain e2e/visual/surfaces.spec.ts-snapshots/` is
  **empty**, and the directory still holds **30** PNGs.
- **The nine rows are DECLARED and BLOCKED, not covered.** Each of the nine carries its own reason
  naming the fixture file and the specific missing piece. An inventory somebody can work from; not a
  claim.
- **The arithmetic:** 66 declared / **36 blocked** / **30 shot** — and the 30 is the same thirty as
  before Phase 14. The host block added fifteen declarations and **zero pictures**.

---

## The measured alarm-token census

**Command:** `npm run test:design -- host-tone-census` (comment-stripped with the repository's own
`tests/design/helpers/strip-comments.ts`; the trees are `src/app/(host)/**`,
`src/components/host/**` and `src/components/availability/**`).

| File | Count | Spellings measured |
|---|---|---|
| `src/app/(host)/host/listings/[id]/edit/wizard.tsx` | **1** | `text-destructive` |
| `src/components/availability/weekly-hours-editor.tsx` | 1 | `text-destructive` |
| `src/components/host/host-cancel-dialog.tsx` | 1 | `className="text-destructive"` |
| `src/components/host/payout-banner.tsx` | 3 | `variant="destructive"`, `text-destructive` ×2 |
| `src/components/host/payout-state-badge.tsx` | 3 | `variant="destructive"`, `border-destructive/40`, `text-destructive` |
| **Total** | **9 across 5 files** | |

### Against 14-RESEARCH's pre-phase baseline: **+1, and the plan that added it is named**

The research measured **8 spellings across 4 files**, with `src/app/(host)/**` at **zero**. The tree
now ships **9 across 5**, and the difference is one file:

**`wizard.tsx` — plan 14-11.** D-150's truthful save state renders a persistent region beside the
advance control whose `failed` arm carries **the server's own refusal sentence**; its two sibling
states (`Saving…`, `Saved`) are muted, and the region is empty at idle.

**So AC#39's literal wording — "Zero new `destructive` tokens under those three trees" — is NOT
met.** It is +1. That is written into the gate's own map, into STATE.md's decisions and into this
sentence, rather than smoothed over, because a phase that reports zero while shipping one has taught
the next reader to distrust the number.

**Why it was not removed instead.** § Color reserves the alarm role for *a genuine failure needing a
human* and for *the canonical form-field refusal*. This occurrence is both at once: the host pressed
a control, the server said no, and nothing further happens until they act. The alternative — a
refusal rendered in the same muted ink as `Saved` — is an absence dressed as a state, which is the
inversion this phase's whole tone argument is against. It is 14-11's shipped decision, made with the
D-150 rationale in the component; unwinding it is not this plan's to do.

**Not double-pinned here, by design:** `src/components/booking/request-countdown.tsx`'s single
occurrence is owned by `tests/design/phase13-surface-gates.test.ts` at a count of one and retained by
D-146. That file re-ran **green with zero edits**.

---

## Verification — the real numbers

| Check | Result |
|---|---|
| `npx tsc --noEmit` (baseline, before any edit) | exit **0** |
| `npx tsc --noEmit` (final) | exit **0** |
| `npm run test:design` (baseline) | 49 files / **832 passed** / 3 skipped / **0 failed** |
| `npm run test:design` (final) | 50 files / **837 passed** / 3 skipped / **0 failed** |
| `npx vitest run tests/listing tests/host tests/booking tests/availability tests/security` | 107 files / **1184 passed** / **0 failed** |
| `npm run build` (lint + whole design suite + production build) | exit **0** (lint warnings only, all pre-existing) |
| `npx playwright test e2e/host-headings.spec.ts --project=chromium` — **ALONE** | **14 passed** |
| `npx playwright test e2e/overflow-320.spec.ts --project=chromium` — **ALONE** | **46 passed / 15 skipped / 0 failed** (was 26 + Phase-13; +10 Phase-14 cases) |
| `npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium` — **ALONE** | ⚠ **12 passed / 1 FAILED** — pre-existing, see below |
| `npm run test:design -- selector-contract` | **7 passed** — no undeclared hook; both D-32 floors only went up |
| `npx vitest run tests/listing/wizard-occupancy.test.tsx` (file UNEDITED) | **10 passed** |
| `npm run test:design -- phase13-surface-gates` (file UNEDITED) | passed |
| `git diff --stat drizzle/` | **empty** — zero migrations |
| `git status --porcelain e2e/visual/surfaces.spec.ts-snapshots/` | **empty**; 30 files on disk |
| `grep -c 'theme: "grove"' src/lib/design/visual-baselines.ts` | **0** (66 `theme: "court"`) |
| `npx eslint` on all five touched source/spec files | exit **0** |

**Playwright discipline:** every invocation named its spec file. Never bare. Never more than one
DB-seeding file per invocation. **No new spec file seeds a database** — the Phase-14 sweep block
lives inside `overflow-320.spec.ts`, which already seeded one, so the count `deferred-items.md`
warns about did not move.

### ⚠ ONE RED, AND IT IS NOT THIS PLAN'S — verified rather than asserted

`e2e/skeleton-geometry.spec.ts` (plan 14-15's block) fails one case:

```
Error: host booking row · /host/bookings · 320px: the resolved card measures 176px, but this shape
was measured at 196px when its height was declared.
Expected: <= 4
Received:    20
```

**Proved pre-existing.** Both of this plan's Task-1 edits were copied aside,
`git checkout -- src/components/host/host-agenda.tsx e2e/overflow-320.spec.ts` returned the tree to
HEAD, `git status` showed no modified file, and the case failed **identically** (1 failed / 3 passed
under `--grep "14-15"`). The edits were then restored from the copies. The mechanism rules it out
independently too: `host-agenda.tsx` is imported by `(host)/host/page.tsx` and nothing else, and the
failing case measures `/host/bookings`.

**What moved was the calendar, not the code.** 14-15 measured 196px on 23 August; this is 24 August,
and that plan's own decision 3 names the mechanism verbatim — the window label's wrap count moves
with the date, and 20px is exactly one line. Logged to `deferred-items.md` as `[14-16]` with the
repair options, and explicitly NOT fixed: the failure message's own instruction ("re-measure and move
the constant") produces a number that is right today and wrong again on the next date whose label
wraps differently.

**Separately excluded by name:** `e2e/availability.spec.ts:261` — the standing red `[12-06]` measured
failing on three consecutive isolated runs and `[12-08]` diagnosed as a dev-mode artefact. It was
neither run, touched, nor claimed by this plan.

---

## The two cross-surface gates, and the six reds that were watched

### Task 1 — one heading per document, and one size across five surfaces

`e2e/host-headings.spec.ts` records **84 readings**: **28 states × 3 widths** (320 / 768 / 1280).
The 28 are the dashboard's four (today's sessions, quiet day, nothing booked, no listings), the
inbox's two, the bookings table's two tabs × two states, both wizard walks (9 whole-space + 8
drop-in), and the availability route. Every state asserts exactly one first-level heading **through
the accessibility tree** (`getByRole`, so the `display:none` desktop tables these routes render do
not count — a `querySelectorAll("h1")` would report two on a surface that only ever shows one), and
a final case asserts the 84 sizes collapse to **one value**, printing the whole set grouped by size.

**WATCHED RED 1 — the size equality, against the exact drift rule 1 was written about.**
`wizard.tsx`'s `<PageHeader>` temporarily replaced by the pre-14-09 `<h1 className="text-2xl …">`:

```
Error: the five Phase-14 surfaces do NOT all render their first-level heading at one size. …
Measured:
  20px  (33 reading(s))
      dashboard · today's sessions · /host @320px — "Your hosting, Hedwig"
      … requests · rows … bookings · upcoming · rows … availability …
  24px  (51 reading(s))
      wizard · whole space · step 1 of 9 @320px — "What kind of space is it?"
      … 16 more wizard steps, both modes, all three widths …
Expected: 1   Received: 2
```

Reverted → 14 passed. The set is what makes this useful: a bare number could not have said *the
wizard is the outlier and every other surface agrees.*

**WATCHED RED 2 — the one-heading assertion, against a second `<h1>` on `/host/requests`.**

```
Error: requests · rows · /host/requests · 320px: this document offers a number of first-level
headings other than ONE. …
Expected: 1   Received: 2      (13 × locator resolved to 2 elements)
```

Reverted → 14 passed.

**The wizard's independent second reading was left untouched.**
`tests/listing/wizard-occupancy.test.tsx`'s `heading()` helper throws on more than one first-level
heading and all ten of its cases route through it. That file was **not edited** and re-ran **10
passed** — two independent readings of one rule, which is worth more than one reading asserted twice.

### Task 1 — the 320px floor, as ten new rows in the existing sweep

The five Phase-14 routes joined `e2e/overflow-320.spec.ts` as a **third describe block**, in **both
themes**, calling the *same* `expectNoOverflow` / `expectTargets` / `expectVisibleFocus` the other
two blocks call. Not a second sweep: a second copy of the overflow scan would be free to disagree
with the first about what "clipped" means, which is the property `helpers/overflow.ts` was extracted
to protect.

**The 44px clause is declared per row.** `/host/requests` and `/host/bookings` name Approve and
Decline (both `size="touch"`, and `request-row.tsx` states in as many words that the pair is
touch-sized on *both* surfaces); the wizard names the publish checklist's disclosure trigger — the
320px placement's only route into the checklist. **`/host` and `/host/listings/[id]/availability`
declare NONE, with the argument**: their controls ship at the Button's default height because D-22
makes 44px an explicit opt-in, and asserting it there would be red against shipped, reviewed code.
Presence is asserted before height, so a row whose control disappeared fails rather than measuring
nothing.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 2 — Missing critical functionality] The dashboard's only route to the bookings list was 4px under the WCAG 2.5.8 AA target bar**
- **Found during:** Task 1, the Phase-14 sweep's first run.
- **Issue:** `/host · court · 320px: 1 control(s) are smaller than the 24px WCAG 2.5.8 AA target-size
  bar on their smaller axis: a[View all bookings] 111.6x20`. The link is a flex item, so it is
  **blockified** and therefore *not* covered by 2.5.8's own exception for a target laid out inside a
  sentence — and it is not in a sentence: it is a standalone control in the agenda's heading row.
- **Fix:** `py-1` on the link in `src/components/host/host-agenda.tsx`. Padding rather than a
  min-height, because the parent aligns on the BASELINE — padding grows the box around the text and
  leaves the label on the same line as `Today`, where a min-height with centred content would have
  moved it off that baseline to buy the same four pixels. The measurement and the reason are written
  at the call site.
- **Files modified:** `src/components/host/host-agenda.tsx`
- **Commit:** `19ff9d0`

**2. [Rule 3 — Blocking] The target-size scan counted Radix's hidden native `<select>`**
- **Found during:** Task 1, the wizard route's first sweep.
- **Issue:** `select[?] 1x1` on `/host/listings/[id]/edit`. Radix `Select` renders a native
  `<select>` (`SelectBubbleInput`) carrying `aria-hidden={true}`, `tabIndex={-1}` and the library's
  visually-hidden inline styles, purely so a form submit carries the value.
- **Fix:** `collectControls` now also skips an element that is inside an `aria-hidden="true"` subtree
  **AND** out of the tab order. The **conjunction** is load-bearing and is argued in the docstring:
  either half alone would be too wide (a visible `aria-hidden` decoration is still clickable; a
  `tabindex=-1` control is still a pointer target), while both together describe something no user
  can reach with anything. It is the existing `sr-only` exclusion — *"1x1 by construction and not a
  pointer target at all"* — under a different spelling.
- **Files modified:** `e2e/overflow-320.spec.ts`
- **Commit:** `19ff9d0`

**3. [Rule 3 — Blocking] A Phase-13 clock pin was a date literal that had already expired**
- **Found during:** Task 1, running the whole sweep file.
- **Issue:** `Error: clock.pauseAt: Error: Cannot fast-forward to the past` on *the confirmation
  moment · court*, with nothing wrong with the surface. `page.clock.pauseAt` only moves time
  FORWARD, and the literal read `2026-08-21T09:00:00Z` — two days ahead when 13-15 wrote it, in the
  past on every run since. Confirmed by re-running that case **alone**.
- **Fix:** the instant is now `Date.now() + CLOCK_PAUSE_LEAD_MS` (one second), with the measured
  failure and the argument recorded at the constant. The pin's job was for time to **stop**, not to
  stop on a particular date — and the fixture's own rows are `now()`-relative anyway, so the literal
  never anchored the data.
- **Files modified:** `e2e/overflow-320.spec.ts`
- **Commit:** `19ff9d0`

**4. [Rule 3 — Blocking] A reachability guard was racing a cold route compile**
- **Found during:** Task 1, the availability state's first run.
- **Issue:** the availability route's tell did not resolve inside 20s (43 polls, 0 elements) on the
  run that COMPILED it; the very next invocation of the same case against the warm route passed in
  **3.8s**. The failure named the surface and read exactly like a product defect.
- **Fix:** a measured 60s allowance in both specs, with the observed numbers written beside it —
  `overflow-320.spec.ts:213`'s own 15s allowance records the smaller version of the same reason.
- **Files modified:** `e2e/host-headings.spec.ts`, `e2e/overflow-320.spec.ts`
- **Commit:** `19ff9d0`

**5. [Rule 3 — Blocking] The drop-in wizard walk was refused at step 1, and the PRODUCT was right**
- **Found during:** Task 1, the second wizard walk.
- **Issue:** the walk stalled on the first question. `saveListingStep`'s CR-04 guard re-runs the
  publish gate's open branch on every autosave against a **published** row: a drop-in listing must
  carry a per-head price, a positive people cap, a single space and **instant** booking (OC-10). The
  fixture flipped `occupancy_mode` and left `booking_mode` on request-to-book.
- **Fix:** the **fixture** moved, not the guard. The walk sets `booking_mode = 'instant'` alongside
  `occupancy_mode = 'open_capacity'`, with the measurement and the refusal's name recorded at the
  statement. The diagnostic that found it in one run is now permanent: on a stalled walk the spec
  reads the D-150 save-state region and puts **the server's own sentence** in the failure message.
- **Files modified:** `e2e/host-headings.spec.ts`
- **Commit:** `19ff9d0`

### Scope disclosures — named so a reviewer is not surprised

**(a) `e2e/visual/surfaces.spec.ts` was edited, and it is outside this plan's `files_modified`.**
That file hard-codes `EXPECTED_BASELINE_COUNT` (51) and the full `EXPECTED_BLOCKED` id list, and it
compares them against the module by value. Declaring fifteen rows and nine blocked surfaces without
moving both would have shipped a **guaranteed red in the one environment that actually shoots
baselines** — which is precisely the failure this plan's own verification section names ("a prior
phase closing over a red visual gate with nobody noticing is the record of what that costs"). The
edit is two constants and their prose; no assertion changed shape.

Because that gate runs only on Linux, the values it now pins were verified here with a **throwaway**
design test (created, run, deleted before the commit, present in no commit):
`66` baselines, `21` blocked surfaces **in exactly `EXPECTED_BLOCKED`'s order**, `0` reasons at or
under the 80-character floor, `21` distinct reasons of 21, **36 blocked rows and 30 shot**.

**(b) `.planning/phases/14-host-tooling/deferred-items.md` gained a `[14-16]` entry** for the
skeleton-geometry red — a planning document; no source or test behaviour moves with it.

**(c) `src/components/host/host-agenda.tsx` is a source file outside `files_modified`.** Deviation 1
above; it is the Rule-2 fix the new gate found, and the alternative was a red acceptance criterion.

**(d) No package was installed.** `package.json` and `package-lock.json` untouched. No schema
migration. No architectural decision was needed, so no checkpoint was raised.

**Total deviations:** 5 auto-fixed (0 Rule 1, 1 Rule 2, 4 Rule 3, 0 Rule 4).

---

## The census gate, watched red in all three directions

Command for each: `npm run test:design -- host-tone-census`; each probe reverted immediately.

**(a) A new occurrence — `text-destructive` on `host-signals.tsx`'s published-without-hours line,
i.e. a calm signal painted as an alarm:**

```
AssertionError: these files on the host or availability trees spend the ALARM role and are not in
this gate's map:
  src/components/host/host-signals.tsx — 1x: text-destructive
```

**(b) A removed occurrence — the availability editor's overlap message demoted to muted:**

```
AssertionError: these files were declared as spending the alarm role for a stated reason and now
spend it nowhere:
  src/components/availability/weekly-hours-editor.tsx — expected 1x, found none
```

**(c) A drifted COUNT — one of `payout-banner.tsx`'s three removed, so the file still appears.** This
is the direction (a) and (b) both miss, and it is why the middle assertion is not dead code:

```
AssertionError: these declared counts no longer match the tree:
  src/components/host/payout-banner.tsx — declared 3, measured 2: variant="destructive",
  text-destructive
      declared reason: the paused-payout banner: the alert VARIANT on the paused branch, plus …
```

Every probe reverted; `git status` clean; **5 passed**.

---

## The baseline block, and the count gate watched red

**Nine surfaces, fifteen rows, court only.** Widths are 14-UI-SPEC's own. The wizard rail is the one
surface with **three** widths, and 768 is load-bearing rather than a third copy: `lg` is 1024, so 768
photographs the **collapsed** checklist disclosure and 1280 the **side panel** — a 320/1280 pair
would photograph the two ends of that fork and never the fork itself.

**Nine distinct blocked reasons**, verified distinct by the throwaway probe (21 of 21 across the whole
inventory, none at or under 80 characters). Each names the fixture file and the specific missing
piece. Before any of its own, every host row shares one structural blocker worth restating:
`e2e/helpers/visual-drive.ts`'s `DRIVES` map has **no host entry**, so a host row falls through to a
plain `goto` with no session — and every host route redirects an unauthenticated visitor. **Nine
baselines of `/login`, permanent, silent and green,** is the worst outcome available here.

**⚠ A correction to the plan's own arithmetic, recorded rather than rounded.** The plan says "the six
clock-dependent rows" and "the three that need no clock". Counted against 14-UI-SPEC § Visual
Baselines' Determinism column — which is the measurement — it is **five and four**: `agenda`,
`quiet`, `triage`, `upcoming` and `earnings` carry a clock-freeze mark; `none`, `zero`,
`wizard-rail` and `availability-strip` do not. 14-RESEARCH's recommendation names three of that four
and is silent on `host-wizard-rail`, which is where the missing one went. Written into the module so
the next reader who counts them finds the answer beside the rows.

**WATCHED RED — the count gate**, forced (and said to be forced, because 13-15's entry was not and
the difference is the evidence): with the fifteen rows in place the constraint was set back to `51`.
`npx tsc --noEmit`, **EXIT=2**, and the whole of stdout was one line:

```
src/lib/design/visual-baselines.ts(1917,3): error TS2344: Type 'false' does not satisfy the
constraint 'true'.
```

Restored to `66` → exit 0. The alias moved with it, `BaselineCountIsFiftyOne` →
`BaselineCountIsSixtySix`, in the same commit as the rows — a gate whose name says 51 while its
constraint says 66 reads correct and is not, and `tsc` cannot catch a stale name.

**`/host/earnings` was declared WITHOUT being opened.** D-156 and 14-01's freeze put that route and
every `payout-*` file off limits to this plan, so its row was written from 14-UI-SPEC's table and
from `scripts/seed-baseline-fixtures.ts`'s contents. The row says so in its own `blocked` string.

---

## Requirements — what closes here, and the one clause that does not

**HFLOW-01, HFLOW-02 and HFLOW-05 were already Complete** (14-06, 14-11, 14-01). This plan verified
them rather than advancing them: the inbox's two states and the wizard's seventeen steps are inside
the heading gate and the 320px sweep, and the earnings freeze was honoured by not opening the route.

**HFLOW-03 and HFLOW-04 CLOSE HERE.** Both were deliberately left open by 14-15, 14-13, 14-12,
14-08, 14-07, 14-05 and 14-02, each recording `requirements-advanced` rather than ticking:

- **HFLOW-03** — the dashboard is a today view. Its four states are all now measured on the rendered
  route (agenda rows, quiet day, nothing booked, no listings), the busiest one holds the 320px floor
  in both themes, and the one control that failed the accessibility floor was fixed in this plan.
- **HFLOW-04** — the bookings table and availability editor carry the design system, and the editor
  shows a week-at-a-glance preview. Both routes are in the sweep in both themes, and the strip is the
  availability row's declared hook.

**⚠ Checked by hand after the SDK call**, because the traceability table has been left at `Partial`
three times before: `.planning/REQUIREMENTS.md` lines 80–81 read `[x]` and lines 222–223 read
**`Complete`**. All five HFLOW rows are `Complete`.

**The clause NOT closed here, and who owns it.** HFLOW-05's requirement text is satisfied, but its
**visual** proof is not: `host-earnings` is declared and blocked, so the claim that the token pass
changed nothing is carried today by **14-01's AST scan over every string literal in the earnings and
payout files** — which is a stronger check of "nothing changed" than a screenshot, and is why that
row is the least urgent of the fifteen. The picture is owed by **whichever plan builds the Phase-14
host fixture block in `scripts/seed-baseline-fixtures.ts`**; it needs a `host_payout` ledger with
literal dates, which the fixture does not have.

---

## Known Stubs

**None.** Every number in this summary came from a command whose output is quoted above. No
placeholder value, no TODO, no "measure later", and no assertion that cannot be run on this machine
was written into either spec.

## Threat Register Disposition

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-14-16-HEADINGS | **mitigated** | 84 readings across 28 states; one first-level heading each, one size across all of them, watched failing on a restored 24px outlier that the message named |
| T-14-16-SMALLSCREEN | **mitigated** | Five routes added to the existing sweep in both themes, calling the same three assertions; the one control that failed the AA target floor was found on the first run and fixed |
| T-14-16-FALSEALARM | **mitigated** | Per-file map measured in this commit, a reason on every entry, asserted in three directions and watched red in all three |
| T-14-16-BASELINELIE | **mitigated** | Nine rows blocked with nine distinct reasons; nothing generated, and the platform limitation is the first section of this summary rather than a footnote |
| T-14-16-SNAPSHOTDRIFT | **mitigated** | `git status --porcelain` on the snapshot directory is empty; 30 files, unchanged |
| T-14-16-FLAKE | **mitigated** | One spec file per invocation, never bare. The availability standing red was never run. The skeleton-geometry red was re-verified against a pristine tree before being reported as pre-existing |
| T-14-16-SC | **mitigated** | **No package was installed.** `package.json` and `package-lock.json` untouched |

No new threat surface: no network endpoint, no auth path, no file-access pattern, no schema change.
No `## Threat Flags` section is owed.

## Issues Encountered

**The census had to be MEASURED before it could be written, and that is how the +1 was found.** The
gate was authored with an empty map, run once, and populated from what the run reported. Written
from 14-RESEARCH's table instead — which is the obvious shortcut, and the table is only a day old —
it would have declared four files, gone red on `wizard.tsx` on its first run, and the likely
"fix" would have been adding the entry without noticing that the phase's headline claim had moved.

**Two of this plan's five deviations were date-shaped, and neither was in the source.** A clock pin
that had aged past its own literal, and a declared row height that moved 20px overnight because a
window label wraps differently on a different day. Both read exactly like product defects on first
sight. The lesson is `visual-baselines.ts`'s own, arriving in specs: **a fixed literal date in a test
has a shelf life, and the trade is only worth taking when the failure is loud.** Both of these were.

**`git checkout --` restores HEAD, not the pre-probe working tree.** Every probe in this plan copied
its file aside first and restored from the copy. The one place this mattered was verifying the
skeleton-geometry red: two files had uncommitted task work in them at the time, and a bare checkout
would have discarded it silently.

## User Setup Required

None. No environment variable, no external service, no package install. The end-to-end specs need
Docker Postgres up (`npm run db:up`); Playwright boots the dev server itself.

## Next Phase Readiness

**Phase 14 is ready for verification.** What the verifier and anything downstream should know:

1. **Two numbers in this phase are NOT what the spec asked for, and both are disclosed above rather
   than buried:** AC#39's alarm-token count is **+1**, not zero; and all nine GATE-01 baselines are
   **declared and blocked**, not shot. Neither is a defect to fix at close — the first is a shipped
   design decision with an argument, the second is a platform limitation plus a fixture that does not
   exist yet.
2. **`e2e/skeleton-geometry.spec.ts` has one standing red as of 24 August 2026.** Pre-existing,
   verified against a pristine tree, logged as `[14-16]` in `deferred-items.md` with two repair
   options and an explicit warning not to widen the tolerance.
3. **The design suite is 50 files / 837 tests.** It was 49 / 832 at the start of this plan; the
   census is the fifth new test.
4. **A CI run is still the phase gate.** Everything above is local, and `e2e/visual/**` cannot run on
   this platform at all. The blocked inventory and the two hard-coded pins in
   `e2e/visual/surfaces.spec.ts` were verified by a throwaway probe, not by the project that owns them.
5. **`e2e/overflow-320.spec.ts` is now 61 cases across three blocks and one shared Postgres client.**
   A sixth surface is a row in `PHASE_14_ROWS`; a sixth *seeding spec file* is what
   `deferred-items.md` warns against, and this plan did not add one.

---
*Phase: 14-host-tooling*
*Completed: 2026-08-24*

## Self-Check: PASSED

All three claimed commits (`19ff9d0`, `0ad610d`, `99eff65`) resolve in `git log`, and both created
files plus this summary exist on disk. The throwaway design probe named in scope disclosure (a) is
confirmed absent from the working tree and from every commit. No missing items.
