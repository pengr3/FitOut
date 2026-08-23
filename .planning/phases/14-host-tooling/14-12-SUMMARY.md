---
phase: 14-host-tooling
plan: 12
subsystem: availability
tags: [host-surfaces, a11y-equivalence, design-system, panel-card, jsdom, live-preview, inventories]

# Dependency graph
requires:
  - phase: 14-host-tooling
    provides: "`src/lib/availability/week-strip.ts` (plan 14-04) — `deriveWeekStrip`, the shared `HOUR_OPTIONS` label map, `WEEKDAY_NAMES` and the tightened hour parser; `HOURS_STRIP_TRACK` (plan 14-01) — the declared 160px track"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "`src/components/patterns/panel-card.tsx` (DS-11's third and last card container) and the two `ALLOWED_RAW_CARD` exemptions `11-13-SUMMARY.md:234-235` held open for exactly this phase"
  - phase: 03-availability-and-hours
    provides: "`weekly-hours-editor.tsx`'s form, its `liveWindows` watch value, its client-side overlap math and its save path — all three untouched here (D-130 / GATE-NOREG 6)"
provides:
  - "`src/components/availability/week-strip.tsx` — the seven-column strip: hidden bars, a seven-sentence text equivalent, a caption and the unset-week line, all from ONE `deriveWeekStrip` call"
  - "`weekly-hours-editor.tsx` mounting the strip above the day editor and composing the declared panel pattern for both of its boxes — it renders no raw `<Card>` at all any more"
  - "`tests/availability/week-strip.test.tsx` — six rendered cases including the live-edit-with-zero-network-calls assertion, with two recorded falsifications"
  - "`week-strip` / `week-strip-text` selector hooks, and two amended contrast-exclusion reasons naming the strip's track as a second non-informational fill"
affects: [14-13, 14-14, 14-15, 14-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bar geometry as an inline computed percentage: a `style` object carrying two numbers matches NONE of the five design-leak patterns, so the geometry is gate-safe BY CONSTRUCTION rather than by exemption — and the alternative (forty-eight bracketed one-off values) is what the gate exists to refuse"
    - "The aria-hidden-decoration + screen-reader-only-equivalent pairing, taken from `row-list-skeleton.tsx:29-45` and made structural: the drawn half and the announced half are two fields of ONE return value, so they cannot drift"
    - "A container swap is verifiable BY DIFF when the body keeps its identifiers — importing `WEEKDAY_NAMES as WEEKDAYS` leaves the seven-row render textually unchanged, so `git diff` proves 'nothing else moved' rather than merely claiming it"
    - "Radix mirrors every `Select` into a hidden native `<select>`, and firing `change` on it drives the same `onValueChange` the trigger does — a jsdom route to a real select edit that needs none of the pointer-capture APIs jsdom has never implemented"
    - "An allow-list row is deleted in the SAME commit as the box it exempted, and the deletion is watched going red: a raw `<Card>` reintroduced into the file now fails the inverse half instead of being permanently licensed (13-08's finding)"

key-files:
  created:
    - src/components/availability/week-strip.tsx
    - tests/availability/week-strip.test.tsx
  modified:
    - src/components/availability/weekly-hours-editor.tsx
    - src/lib/availability/week-strip.ts
    - src/lib/design/selector-contract.ts
    - src/lib/design/contrast-pairs.ts
    - tests/design/card-pattern-coverage.test.ts

key-decisions:
  - "The strip component gets its OWN `CARD_SURFACES` row rather than riding on the editor's. 14-UI-SPEC puts the panel on the hours editor's site list, but the box actually lives in `week-strip.tsx` and this inventory declares FILES — the same bookkeeping `invite-card.tsx` (11-19) and `host-signals.tsx` (14-08) records. Declared surfaces 13 → 15, adopted 11 → 13"
  - "The editor's local hour parser was DELETED rather than tightened in place, and `toHour` is now exported from the derivation module. 14-04 found the loose copy parsing a one-character fragment as an hour and asked the re-point to take the stricter one; keeping a second parser is how that comes back. The overlap math's call sites are textually unchanged"
  - "`aria-hidden` sits on the GRID, not on each bar. The day captions inside it are then hidden by inheritance, which is correct — each caption is repeated as the subject of its own sentence, and announcing both would say every weekday twice"
  - "The advisory box uses `PanelCard`'s `title`/`description` props rather than keeping its own `<h3>` inside the panel. The props land in the pattern's own `space-y-1` pair, which is the spacing that box already had, so the swap changes the heading's level and step and nothing about the rhythm or the words"
  - "No new contrast row. The strip's track is the SAME measurement as the skeleton fill it sits beside in the inventory (`muted on card`, 1.09 / 1.13); a second row for one measurement is a second declaration of it, so the two existing exclusion reasons were amended to name the strip and state its compensating condition instead"

metrics:
  duration: ~15 minutes
  completed: 2026-08-23
---

# Phase 14 Plan 12: The Week-at-a-Glance Strip Summary

The host now sees the week they are typing — seven bars against a 24-hour scale that redraw on every
select change with zero network calls — and a screen-reader host hears the same week from the same
function call, because the bars and the sentences are two fields of one return value.

## What Was Built

**`src/components/availability/week-strip.tsx` (165 lines).** A client component taking the live window
array and the city label, calling `deriveWeekStrip` ONCE, and rendering from its result and nothing else.
The container is the declared panel pattern at the default tone (so the muted track has a card ground to
be visible against), carrying the strip's title. Seven equal columns at the smallest declared gap; each
column is a relative, clipped, rounded track at `HOURS_STRIP_TRACK` on the muted surface; each segment is
an absolutely positioned, inset, rounded element on the foreground surface, positioned by an inline style
carrying two computed percentages — the open hour over twenty-four for the offset, the span over
twenty-four for the height.

The **entire grid computes as hidden from assistive technology**. The meaning is a screen-reader-only
list of exactly seven items, one per weekday in the same order, each carrying that day's sentence from
the same call that drew its bars. Beneath the grid: the caption naming the city, and — only when the week
holds no windows at all — one further line in the same muted label step, carrying no alarm tone.

There is no gridline, no hour tick, no axis label, no left gutter, and **no live region of any kind**.

**`weekly-hours-editor.tsx`** mounts the strip above the seven-day editor, fed by the `liveWindows` value
the overlap math already watches. Both of its hand-rolled boxes now compose the declared panel pattern —
the advisory at the muted tone via `title`/`description`, the day editor at the default tone with the
dividing rule kept on the list inside it — and the raw-card import is gone.

**`tests/availability/week-strip.test.tsx` (287 lines, 6 cases).** The rendered half, in the shape of
`spots-left-chip.test.tsx` next door. It re-tests none of the 48 derivation cases beside it.

### The numbers this plan moved, old → new

| Inventory | Before | After | Why |
|---|---|---|---|
| `card-pattern-coverage.test.ts` → `EXPECTED_SURFACES` | 13 | **15** | `weekly-hours-editor.tsx` (allow-list → inventory) + `week-strip.tsx` (a surface that did not exist) |
| `card-pattern-coverage.test.ts` → `adopted` | 11 | **13** | The same two files; `refused` is unchanged at 2 |
| `ALLOWED_RAW_CARD` rows | 11 | **10** | The hours editor's row DELETED in the same commit (D-155) |
| `SELECTOR_IDS` | 48 | **50** | `week-strip`, `week-strip-text`, declared and rendered in one commit |
| `contrast-pairs.ts` declared rows | — | **unchanged** | Two reason strings amended; every measured value byte-identical |

## Key Implementation Details

**The equivalence is structural.** `deriveWeekStrip` is called once; `segments` draws and `sentence`
announces. There is no arrangement of this component in which the drawn week and the announced week come
from two places, which is the entire content of D-153. The test asserts the pairing as rendered: seven
`<li>` reachable by role, every bar and every day caption inside the hidden subtree.

**The geometry cannot leak.** `grep -cE 'top-\[|h-\[|w-\['` over the component returns **0**. The five
leak patterns are a raw hex literal, a raw colour function, a bracketed pixel type size, a numbered
palette class and the two absolute colour words; an inline style object carrying two percentages matches
none of them, and the source says so descriptively rather than by quoting any banned spelling (S8).

**The save path and the overlap math have zero changed lines.** Quoted boundaries in the file as it now
stands: the overlap block runs from the `otherRangesOnDay` docblock at **:121** to the close of
`nextDefaultWindow` at **:153**; the save path runs from `const onSubmit` at **:155** to its close at
**:169**. `git diff -U1` jumps from the module-level constants (`@@ -45,23 +87,2`) straight to the render
(`@@ -160,17 +181,23`), so nothing between them appears in the diff at all. `weeklyHoursSchema` and the
`role="alert"` validation message are untouched — the census and its pin are 14-14's.

**Touching windows stay two bars.** `09:00–12:00` and `12:00–15:00` render as two elements at 37.5% + 12.5%
and 50% + 12.5%: adjacent, no forced gap, visually merged. That is correct — the space *is* open
continuously across the boundary — and the sentence names both ranges.

**The unset week carries no alarm.** Seven empty tracks, the caption, and one line saying so. Zero
alert-role elements and zero alarm-token classes, asserted directly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] The editor's second, looser hour parser was deleted, which
required exporting the strict one**

- **Found during:** Task 2, re-pointing the editor at the shared label map.
- **Issue:** `14-04-SUMMARY.md` recorded that `weekly-hours-editor.tsx:65` still carried
  `parseInt(t.slice(0, 2), 10)` — the spelling that parses a half-typed `"9"` as nine o'clock — and asked
  the plan that re-pointed the editor to take the tightened parser with it rather than leave two functions
  answering one question in two files. Task 2's action names only the option map, so the parser would have
  survived as a duplicate.
- **Fix:** `toHour` is now `export`ed from `src/lib/availability/week-strip.ts` (its docblock updated to
  say why, and the module header's "the editor still declares its own copies today" paragraph rewritten
  to record that the re-point happened) and the editor imports it. `src/lib/availability/week-strip.ts`
  is outside this plan's `files_modified`, which is the reason this is recorded as a deviation rather
  than as plan work.
- **Behaviour is identical:** every call site feeds it either a select value or `""`, and both parsers
  agree on those. `npx vitest run tests/availability` re-ran the shared authorities unedited.
- **Files modified:** `src/lib/availability/week-strip.ts`, `src/components/availability/weekly-hours-editor.tsx`
- **Commit:** `dc584b5`

**2. [Rule 2 - Missing critical functionality] The weekday names were re-pointed too, through an alias**

- **Found during:** Task 2, same edit.
- **Issue:** `WEEKDAYS` was the third of the three duplicates 14-04 named. Leaving it would have kept the
  editor's day column and the strip's sentences on two lists that agree only by inspection.
- **Fix:** `import { WEEKDAY_NAMES as WEEKDAYS }`. The alias is deliberate and is explained at the import:
  it leaves the seven-row render textually unchanged, so "the container changed and nothing else moved" is
  provable by diff rather than by assertion.
- **Files modified:** `src/components/availability/weekly-hours-editor.tsx`
- **Commit:** `dc584b5`

### Everything else executed as written

No architectural changes, no package installs (T-14-12-SC: zero), no schema migrations, no authentication
gates, no checkpoints. `/host/earnings` and every `payout-*` file were left unopened (the earnings freeze),
as were `blocks-editor.tsx` and the availability page (14-13's).

## The falsifications, recorded

The plan asked for two. Both were run; both messages are also written into the test file's own header so
the next reader does not have to trust this document for them.

**Case 3 — the preview wired to the SAVED value** (`windows={liveWindows}` → `windows={initialWindows}`):

```
× (3) re-draws the day the host just edited, with zero network calls
AssertionError: expected 'Monday: 9:00 AM to 5:00 PM' to be 'Monday: 6:00 AM to 5:00 PM'
Tests  1 failed | 5 passed (6)
```

That diff **is** D-152 stated as a failure: the host has already picked six in the morning and the preview
is still describing the nine o'clock they are replacing. Reverted → 6 passed.

**Case 1 — the decorative grid un-hidden** (`aria-hidden="true"` removed from the grid):

```
× (1) hides the whole grid from assistive technology: seven sentences reachable, zero bars
AssertionError: expected null to be 'true' // Object.is equality
Tests  1 failed | 5 passed (6)
```

The two clauses after it fire on the same edit — every bar and every caption stops being inside a hidden
subtree — but expectations fail fast. Reverted → 6 passed.

**And the amended card gate was watched failing in both of its halves**, because an inventory amendment
nobody has seen go red is a number somebody typed:

```
# EXPECTED_SURFACES put back to 13
AssertionError: the declared card-surface inventory is not the size the UI-SPEC's three `Replaces`
lists describe. …: expected 15 to be 13
Tests  1 failed | 10 passed (11)

# the day editor's PanelCard swapped back to a raw <Card>, with the allow-list row now gone
AssertionError: a `<Card>` is rendered outside `src/components/patterns/**` by a file that is not on
ALLOWED_RAW_CARD. … Unlisted raw `<Card>` call sites:
src/components/availability/weekly-hours-editor.tsx:200
Tests  1 failed | 10 passed (11)
```

The second is the one that matters for D-155: the deleted row is now load-bearing in the direction 13-08
warned about — a raw box reappearing in this file is a failure rather than a permanent exemption. Both
reverted; the file was restored byte-identically and re-verified green.

## Verification

| Check | Result |
|---|---|
| `npm run test:design` | **49 files / 827 passed / 3 skipped / 0 failed** — the 14-04 baseline exactly |
| `npm run test:design -- card-pattern-coverage contrast selector-contract leak theme-tokens` | all pass |
| `npx vitest run tests/availability` | **21 files / 229 passed / 0 failed** (was 20 / 223 — +1 file, +6 tests; the shipped 223 are unmoved) |
| `npx vitest run tests/availability/week-strip.test.tsx tests/availability/week-strip.test.ts` | 54 passed |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` on all five touched source files | 0 errors, 0 findings |
| `git diff --stat drizzle/` | empty |
| `grep -cE 'top-\[\|h-\[\|w-\[' week-strip.tsx` | **0** |
| `grep -c 'aria-live\|role="alert"\|role="status"' week-strip.tsx` | **0** |
| `grep -c 'from "@/components/ui/card"' weekly-hours-editor.tsx` | **0** |
| `grep -c 'liveWindows' weekly-hours-editor.tsx` | 5; `initialWindows` appears only in the props, the type, `defaultValues` and one comment — never near the strip |
| `head -1 tests/availability/week-strip.test.tsx` | the jsdom pragma |
| `git diff src/lib/design/contrast-pairs.ts` | 2 lines, both `reason` strings; the declared pair list and every measured value byte-identical |
| Playwright | **not invoked** — this plan has none, by the plan's own verification section |

**Two acceptance criteria have a literal reading that no imported binding can satisfy, and the substantive
half of each holds.** `grep -c 'HOURS_STRIP_TRACK'` and `grep -c 'deriveWeekStrip'` over the component both
return **2**, not 1: an identifier necessarily appears on its own import line as well as at its use. Both
comment mentions were removed so the count is the minimum achievable, and what the criteria are actually
about is true — there is exactly ONE call to the derivation feeding both halves, and exactly one use of
the declared track height with no height typed at the call site.

## Threat Model Disposition

| Threat ID | Disposition | How it was discharged |
|---|---|---|
| T-14-12-A11YNOISE | mitigated | The whole grid is `aria-hidden`; case 1 asserts it, asserts every bar and caption is inside that subtree, and asserts the seven sentences are reachable by role. Case 6 asserts zero live regions as a direct count. Observed red |
| T-14-12-STALEPREVIEW | mitigated | Fed from `liveWindows`; case 3 asserts a changed sentence with the server action and `fetch` both at zero calls, and was observed failing against the `initialWindows` wiring |
| T-14-12-CONFLATION | mitigated | No block or closure is read, imported or overlaid; the caption names the pattern's scope. `BlocksEditor` was not opened |
| T-14-12-SECONDVALIDATION | mitigated | No overlap check and no schema in the strip; the editor's overlap block (:121-153) and save path (:155-169) show zero changed lines and `tests/availability` is green at 229 |
| T-14-12-LEAK | mitigated | Inline computed percentages; the arbitrary-value grep returns 0 and the leak gate passes |
| T-14-12-ALLOWLIST | mitigated | The row was deleted in the same commit as the swap, and the deletion was watched going red against a reintroduced raw box |
| T-14-12-CONTRAST | mitigated | Two reason strings changed and nothing else; `contrast` passes |
| T-14-12-SC | mitigated | Zero packages installed |

## For the Next Plan

- **`HFLOW-04` stays open.** This plan closes the preview and the hours editor's container; the
  availability PAGE, `blocks-editor.tsx`, the page shell and the page heading are 14-13's, and the
  requirement is only complete when that half lands. `REQUIREMENTS.md` is deliberately unticked.
- **`blocks-editor.tsx` still holds its `ALLOWED_RAW_CARD` row**, and the block comment above it now says
  why it was left: 14-12 did not open that file, and deleting an exemption for a surface you have not read
  is how a gate acquires a hole nobody meant. The plan that converts it deletes the row in the same commit
  and re-measures `EXPECTED_SURFACES` **15 → 16** (plus `empty-state-adoption.test.ts`'s `ADOPTERS` 13 → 14
  for the "No blocked dates" conversion).
- **The strip mounts inside the editor, not on the page.** A page that wants it elsewhere should move the
  mount, not add a second one — two strips on one document is two places a host can read a different week.
- **Legibility at the 320px floor is unmeasured here and is deliberately not a number.** 14-RESEARCH § M4
  measured the column at **33.14px** (not the UI-SPEC's predicted 37.7 — the panel pays its own horizontal
  padding on top of the shell's) and a one-hour bar at **6.66px**. Whether that mark is legible is a human
  call, routed to 14-VALIDATION § Manual-Only. If it fails there, the fix is the declared track height
  re-derived — not a gridline, not a colour, not a re-orientation.

**Two standing cautions, re-confirmed here and unchanged:**
1. `tests/design/type-scale.test.ts:534` still pins `payout-summary.tsx` at 2 display-role headings. Not
   touched.
2. `e2e/availability.spec.ts:261` is still the pre-existing standing red. Not caused here, not claimed
   here, and no Playwright spec was run by this plan.

---
*Phase: 14-host-tooling*
*Completed: 2026-08-23*

## Self-Check: PASSED

All eight claimed files exist on disk (`src/components/availability/week-strip.tsx`,
`tests/availability/week-strip.test.tsx`, `src/components/availability/weekly-hours-editor.tsx`,
`src/lib/availability/week-strip.ts`, `src/lib/design/selector-contract.ts`,
`src/lib/design/contrast-pairs.ts`, `tests/design/card-pattern-coverage.test.ts` and this summary) and all
three claimed commits resolve in `git log` (`4f1a1e6`, `dc584b5`, `0a80081`). No file was deleted by any of
the three (`git diff --diff-filter=D HEAD~3 HEAD` is empty). No missing items.

**No stubs.** Every value the strip renders is derived from the live form array; there is no hardcoded
empty array, placeholder sentence or unwired prop in either new file. The one conditional line
("Closed every day — no hours set yet.") is a real state of a real week, not a placeholder — case 5
asserts it against an actually-empty input.
