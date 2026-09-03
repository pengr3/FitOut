---
phase: 14-host-tooling
plan: 04
subsystem: availability
tags: [pure-module, derivation, accessibility, vitest, node-env, host-surfaces, a11y-equivalence]

# Dependency graph
requires:
  - phase: 03-availability-and-hours
    provides: "`weeklyHoursSchema` / `hoursWindowSchema` (`src/lib/validation/availability.ts`) — the window shape this derivation infers its input type from, and the ONE authority on whether a week can be saved; plus `weekly-hours-editor.tsx`'s Sunday-first weekday list, its on-the-hour select options and its `liveWindows` watch value"
  - phase: 07-request-to-book
    provides: "`src/lib/availability/block-reason.ts` — the repo's canonical pure, directive-free mapper a client editor imports, and `src/lib/booking/policy-disclosure.ts:50-53`'s 'why a named pure module rather than an inline composition' argument"
  - phase: 09-open-capacity
    provides: "`src/lib/listing/hours-lock.ts:32-42` — the record that the column, `venueDayOfWeek` and Postgres's day-of-week field all agree on `0=Sun..6=Sat`, which is why the strip is not re-based to ISO"
provides:
  - "`deriveWeekStrip(windows)` — seven entries for EVERY input, Sunday-first, each carrying the segments to draw and the one sentence that means the same thing (D-153's single source)"
  - "`HOUR_OPTIONS`, `WEEKDAY_NAMES`, `WEEKDAY_SHORT_NAMES`, `CLOSED_WORD` and `hourLabel()` — this module is now their owner; the editor's own copies are re-pointed in a later plan"
  - "`WeekStripDay` / `WeekStripSegment` / `WeekStripInput` — the render half's props contract, including the sparse mid-edit input shape the editor can pass straight through"
  - "`tests/availability/week-strip.test.ts` — 48 cases, a generic drawn-vs-announced invariant over the whole table, and two recorded falsifications"
affects: [14-05, 14-09, 14-10, 14-11, 14-12, 14-13, 14-14, 14-15, 14-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An accessibility EQUIVALENCE is guaranteed by construction, not by discipline: the decoration and its text equivalent are two fields of one return value, so there is no second derivation to drift"
    - "A type-only import (`import type { WeeklyHoursInput }`) borrows the shared schema's inferred shape with ZERO runtime coupling — the pure module still pulls in nothing at all, and the preview and the save cannot disagree about the shape"
    - "A live-form consumer parses defensively and judges nothing: an unfinished window is SKIPPED, never thrown on and never given an error message, because the form and the schema already own that verdict"
    - "A generic invariant asserted with `it.each` over the case table makes every future case buy the contract for free — the next case is the one nobody thought of"
    - "Two falsifications, not one: a pinned string catches a break the generic invariant is blind to (a self-consistent coalesce), and the invariant catches a break no pin would generalise (a separately-derived sentence)"

key-files:
  created:
    - src/lib/availability/week-strip.ts
    - tests/availability/week-strip.test.ts
  modified: []

key-decisions:
  - "`toHour` requires a TWO-DIGIT hour prefix, which the editor's shipped `parseInt(t.slice(0, 2))` does not: a half-typed \"9\" parsed as nine o'clock there, so the strip would have drawn a bar for a string the shared schema's own regex refuses — the preview running ahead of what could be saved. Found by the mid-edit case, fixed as a PARSE guard (nothing judges the value or emits a message), not as a second validation"
  - "The window type is `WeeklyHoursInput[\"windows\"][number]` via a type-only import rather than a re-declared literal, so the derivation's input shape IS the shape the shared schema validates and cannot drift from it — while the module's runtime import graph stays empty"
  - "The public input type is `ReadonlyArray<Partial<WeeklyHoursWindow> | undefined | null>`, which is exactly what RHF's `useWatch` hands the editor today (`weekly-hours-editor.tsx:96-99` already casts to `Array<WeeklyHoursWindow | undefined>`) — the render half can pass `liveWindows` in with no cast and no pre-filter"
  - "A zero-height run (`closeHour <= openHour`) is skipped alongside the malformed ones. It is a drawability guard — an invisible bar named as a nonsense range — and it mirrors the editor's own `e > s` filter rather than adding a rule the schema does not already enforce"
  - "The label map's domain (0..23) IS the strip's drawable domain, so `hourLabel` is total over everything a segment can hold and 'formatted with the SAME map the selects render' is true by construction rather than by two formatters agreeing"

metrics:
  duration: ~10 minutes
  completed: 2026-08-23
---

# Phase 14 Plan 04: The Week Strip's Derivation Summary

One pure, directive-free function returns both halves of the week-at-a-glance — the bars to draw and the
sentence to announce — so the seen week and the heard week cannot drift, proven by an invariant asserted
over every case and observed failing against two different plausible wrong implementations.

## What Was Built

**`src/lib/availability/week-strip.ts` (211 lines).** `deriveWeekStrip` takes the weekly windows the editor
holds live and returns exactly seven `WeekStripDay` entries, Sunday-first, for every input including the
empty one. Each entry carries its day index, its short column caption, its segments (open and close hour as
integers, sorted by open hour) and its sentence. A closed day is a row with zero segments and a sentence
ending in the closed word — never a missing row.

The module also becomes the owner of the shared copy the strip and the editor must agree on: `HOUR_OPTIONS`
(the on-the-hour value/label map the selects render), `WEEKDAY_NAMES`, `WEEKDAY_SHORT_NAMES`, `CLOSED_WORD`
and `hourLabel()`. D-153 requires the announced string to match what the host picked glyph for glyph, and
that is only true by construction if the select's label and the sentence's label are the same string.

**`tests/availability/week-strip.test.ts` (272 lines, 48 cases).** A node-environment table-driven test in
the shape of `block-reason.test.ts` next door, with `when-label.test.ts`'s discipline of pinning exact
rendered strings.

### The three sentence shapes, pinned exactly

| Case | Sentence |
|---|---|
| One window | `Monday: 6:00 AM to 10:00 PM` |
| Two windows | `Tuesday: 6:00 AM to 9:00 AM, and 5:00 PM to 10:00 PM` |
| Three windows | `Friday: 6:00 AM to 8:00 AM, 12:00 PM to 1:00 PM, and 6:00 PM to 9:00 PM` |
| Touching pair | `Wednesday: 9:00 AM to 12:00 PM, and 12:00 PM to 3:00 PM` |
| Closed day | `Sunday: closed` |
| Empty input | all seven, `Sunday: closed` … `Saturday: closed`, as an exact array |

### What it refuses to do (D-152, GATE-NOREG 6)

No overlap detection, no schema, no database import, no clock read. `weekly-hours-editor.tsx:100-120` owns
the client-side overlap math and `weeklyHoursSchema` owns validation; a third opinion in this file would be
the first place the three could disagree. Date-specific blocks and closures are not overlaid — those belong
to `BlocksEditor`, and folding them in would conflate "my weekly pattern" with "this specific week".

Nothing here is date-aware at all: a weekly pattern has no *now*. The `new Date(` grep returns zero.

## Key Implementation Details

**The equivalence is structural, not procedural.** `segments` and `sentence` are two fields of one return
value built from one sorted array in one `.map`. There is no arrangement of this code in which a caller can
get the bars from one place and the text from another, which is the entire content of D-153.

**Touching windows stay two segments.** `09:00–12:00` and `12:00–15:00` produce two adjacent segments
(`segments[0].closeHour === segments[1].openHour`) and a sentence naming both ranges. They will visually
merge into one bar and that is correct — the space *is* open continuously across the boundary, which is what
the `'[)'` half-open convention the schema and the exclusion constraint share means. The header says so, the
test says so, and both breaks below were exactly this "tidy-up".

**The mid-edit tolerance is a list, not a vibe.** Undefined rows, null rows, a window with only a day, only
an open time, only a close time, empty strings, a one-character time, a zero-height run, a reversed run, a
day index out of range, a missing day index and a non-string time are all skipped — asserted as one case,
and asserted again beside a good window that must keep its bar while the row below it is being typed.

**Sunday-first is asserted against the LABELS.** `[0,1,2,3,4,5,6]` alone would survive an ISO re-basing that
kept the indices and shifted the names, so the test pins `["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]` too.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `toHour` parsed a one-character time fragment as an hour**

- **Found during:** Task 2 — the mid-edit case failed on its first run (`expected false to be true`, at the
  "the whole week stays closed" assertion).
- **Issue:** the parser was the editor's shipped `parseInt(time.slice(0, 2), 10)`. For a half-typed `"9"`,
  `"9".slice(0, 2)` is `"9"` and `parseInt` returns `9` — so the strip drew a 9 AM bar for a string the
  shared schema's regex (`^([01]\d|2[0-3]):[0-5]\d…`) refuses. A preview that draws something that cannot be
  saved is the specific failure D-152 exists to prevent, pointed the wrong way.
- **Fix:** require a two-digit hour prefix (`/^\d{2}/`), else `NaN`, which the existing drawability guard
  already skips. Documented in place as a PARSE guard: nothing judges the value and nothing emits a message,
  so the "no second validation" rule is intact.
- **Files modified:** `src/lib/availability/week-strip.ts`
- **Commit:** `f7bfa1f`

**Note for a later plan:** `weekly-hours-editor.tsx:65` still carries the loose `toHour` for its own overlap
math. It is not reachable with a fragment there (the value always comes from a select), so this is not a
live bug and it is not this plan's file. The plan that re-points the editor at this module's exports should
delete that local copy rather than keep two parsers.

### Everything else executed as written

No architectural changes, no package installs, no schema migrations (`git diff --stat drizzle/` empty), no
authentication gates, no checkpoints.

## The falsification, recorded (Task 2 acceptance)

The acceptance criterion asked for one deliberate break. Two were run, because the first proved the case
table needed the second.

**Break 1 — the derivation coalesces touching windows into one segment** (the plausible "tidy-up"):

```
AssertionError: expected [ { openHour: 9, closeHour: 15 } ] to deeply equal [ Array(2) ]
  at tests/availability/week-strip.test.ts:183
  (windows touching at an endpoint stay TWO segments and name TWO ranges)
```

**The generic invariant did NOT fire on that break, and could not** — one segment named by one range is
self-consistent. That is why the exact strings are pinned and are not decoration.

**Break 2 — the SENTENCE built from a coalesced copy while the bars stayed uncoalesced** (the actual
two-derivation drift D-153 exists to prevent, which no per-case pin would catch in general):

```
AssertionError: expected 1 to be 2 // Object.is equality
  at tests/availability/week-strip.test.ts:204
  (segments and sentence carry the same count for 'two windows touching at an endpoint')

AssertionError: expected 'Wednesday: 9:00 AM to 3:00 PM'
             to be 'Wednesday: 9:00 AM to 12:00 PM, and 1…'
```

Both breaks were reverted; `git diff --stat drizzle/` and a `TEMPORARY` grep over the module both come back
empty. Both messages are recorded in the test file's own header, so the next reader does not have to trust
this document for them. **Neither the invariant alone nor the pins alone are sufficient — the file keeps
both, and that is the finding.**

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx vitest run tests/availability` | **20 files / 223 passed / 0 failed** (was 19 / 175 — +1 file, +48 tests; the shipped 175 are unmoved) |
| `npx vitest run tests/availability/week-strip.test.ts` | 48 passed |
| `npm run test:design` | **49 files / 827 passed / 3 skipped / 0 failed** — the 14-03 baseline exactly |
| `git diff --stat drizzle/` | empty |
| `npm run lint` | 0 errors; **zero findings naming either new file** (24 pre-existing warnings elsewhere, untouched) |
| `head -1` on the module | a comment, not a rendering-environment directive |
| `grep -c 'use client\|use server\|@/lib/db\|new Date('` | **0** |
| `grep -c 'export'` | 11 |
| `grep -c 'closed'` in the test | 17, and the closed sentence is pinned as an exact string |
| Playwright | not invoked — this plan has no rendered surface |

## Threat Model Disposition

| Threat ID | Disposition | How it was discharged |
|---|---|---|
| T-14-04-A11YDRIFT | mitigated | One call returns both halves; the count invariant is asserted generically over the whole table, and was observed catching Break 2 |
| T-14-04-SECONDVALIDATION | mitigated | No overlap check and no schema in the module; `npx vitest run tests/availability` re-ran the shared authorities unedited (175 shipped tests still green) |
| T-14-04-CRASH | mitigated | Twelve malformed shapes in one case, asserted not to throw and not to produce a segment; plus a good window beside a broken one |
| T-14-04-CLOCK | accepted (verified) | Zero clock reads — asserted by grep, and by the module importing nothing at runtime |
| T-14-04-SC | mitigated | Zero packages installed |

## For the Next Plan

- **The render half (14-05) imports from here and derives nothing itself.** Feed it
  `useWatch({ name: "windows" })` — its `WeekStripInput` type already accepts that sparse array with no cast
  and no pre-filter. Draw from `segments`, announce `sentence`, and do not compute either.
- **Positioning is `openHour / 24` and `(closeHour - openHour) / 24` as inline percentages** (UI-SPEC
  § Geometry) — the segments are already integers on that scale and already sorted.
- **The editor's local `WEEKDAYS`, `HOUR_OPTIONS` and `toHour` (`weekly-hours-editor.tsx:45-65`) are now
  duplicates.** Re-pointing them at this module is a later plan's edit; until it happens, "one owner" is a
  claim about the strip only, and the values are byte-identical by inspection rather than by import. The
  re-point should take the tightened `toHour` with it (see the deviation above).
- **`CLOSED_WORD` is exported** so the "Closed every day — no hours set yet." line and any future copy stay
  one literal.

**Two standing cautions, re-confirmed here and unchanged:**
1. `tests/design/type-scale.test.ts:534` still pins `payout-summary.tsx` at 2 display-role headings. Not
   touched.
2. `e2e/availability.spec.ts:261` is still the pre-existing standing red. Not caused here, not claimed here.

---
*Phase: 14-host-tooling*
*Completed: 2026-08-23*

## Self-Check: PASSED

Both claimed files exist on disk (`src/lib/availability/week-strip.ts`,
`tests/availability/week-strip.test.ts`) and all three claimed commits resolve in `git log`
(`b06c5b7`, `f7bfa1f`, `a0c6612`). No missing items.
