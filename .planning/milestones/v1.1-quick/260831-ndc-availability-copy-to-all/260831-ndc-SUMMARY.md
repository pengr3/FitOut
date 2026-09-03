---
quick_id: 260831-ndc
slug: availability-copy-to-all
date: 2026-08-31
status: complete
type: execute
requirements: [HOURS-01, HOURS-02]
decisions: [D-142]
threats_addressed: ["T-19-01", "T-19-02", "T-19-03", "T-19-04", "T-19-05", "T-19-06", "T-19-SC"]
commits:
  - 6364d11  # feat: the copy-to-all transformation as one pure derivation
  - 040bbc0  # feat: the day picker, the honest overwrite warning, and the undo
  - 18c1afb  # docs: record D-142, mark HOURS-01/02 satisfied, retire Phase 19
key-files:
  created:
    - src/lib/availability/copy-hours.ts
    - src/components/availability/copy-hours-dialog.tsx
    - tests/availability/copy-hours.test.ts
    - tests/availability/copy-hours-editor.test.tsx
  modified:
    - src/components/availability/weekly-hours-editor.tsx
    - tests/design/live-regions.test.tsx          # PHASE_14_SURFACE_FILE_COUNT 19 -> 20
    - .planning/PROJECT.md
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/STATE.md
  unchanged-by-design:
    - src/app/actions/operating-hours.ts          # byte-identical, asserted mechanically
    - drizzle/                                    # still ends at 0025_audit_resolved_by.sql
    - package.json                                # zero installs
    - package-lock.json
    - src/lib/design/live-regions.ts              # the inventory did not move; only the reach did
    - src/lib/validation/availability.ts          # weeklyHoursSchema is still the one authority
metrics:
  tasks: 3
  new_tests: 31                                   # 18 table + 13 rendered
  deliberate_reds_driven: 5
  duration: ~45m
---

# Quick 260831-ndc: availability copy-to-all (HOURS-01, HOURS-02)

A host stops re-entering the same operating hours seven times. They pick a weekday whose hours are
already right, choose which other days should match it, are told **by name** which of those already
have hours and will be replaced **before** it applies, apply it, and — until they press Save — can put
the schedule back exactly as it was, multi-window days and closed days included.

The last two requirements in v1.1's scope are satisfied, and Phase 19 is retired from the roadmap
under **D-142**.

---

## The three non-negotiables, with their actual command output

**1. `src/app/actions/operating-hours.ts` is byte-unchanged.**

```
$ git diff --exit-code -- src/app/actions/operating-hours.ts
EXIT:0            # no output at all
```

Run twice: once as Task 2's own verify step, and again immediately before Task 2's commit. Both empty,
both exit 0. `git show --stat` on all three commits confirms the file appears in none of them.

**2. `drizzle/` still ends at `0025_audit_resolved_by.sql` (GATE-06).**

```
$ ls drizzle/*.sql | tail -3
drizzle/0023_booking_checkout_lease.sql
drizzle/0024_audit_table.sql
drizzle/0025_audit_resolved_by.sql

$ git status --porcelain -- drizzle/
                  # empty
EXIT:0
```

**3. Zero installs.**

```
$ git status --porcelain -- package.json package-lock.json
                  # empty
EXIT:0
```

Every primitive used was already vendored: `ResponsiveDialog`, `Checkbox`, `Label`, `Button`, and two
lucide icons that the package already ships. No package-legitimacy checkpoint was needed because no
install was attempted (T-19-SC).

---

## Every gate that was run, with its counts

| Gate | Command | Result |
|------|---------|--------|
| Task 1 table | `npx vitest run tests/availability/copy-hours.test.ts` | **1 file passed · 18 tests passed** |
| Typecheck | `npx tsc --noEmit` | **exit 0**, no output |
| Rendered wiring | `npx vitest run tests/availability/copy-hours-editor.test.tsx` | **1 file passed · 13 tests passed** |
| Availability suite (GATE-NOREG) | `npx vitest run tests/availability/` | **23 files passed · 266 tests passed** — includes `week-strip.test.tsx`'s 12 pre-existing cases and `hours-lock.test.ts` |
| The eight keyed design tests | `npx vitest run --config vitest.design.config.ts tests/design/card-pattern-coverage.test.ts tests/design/host-tone-census.test.ts tests/design/live-regions.test.tsx tests/design/empty-state-adoption.test.ts tests/design/avatar-copy.test.tsx tests/design/responsive-dialog-autofocus.test.tsx tests/design/selector-contract.test.ts tests/design/brand-recipe.test.ts` | **8 files passed · 130 tests passed** |
| Whole design suite | `npm run test:design` | **70 files passed · 1286 passed, 3 skipped (1289)** |
| Whole main suite | `npx vitest run` | **189 passed, 2 skipped (191 files) · 2213 passed, 5 skipped (2218 tests)** |
| App build | `npx next build` | **exit 0** — `✓ Compiled successfully in 21.2s`, `✓ Generating static pages (29/29)` |
| Lint, application trees | `npx eslint src tests` | **22 problems (0 errors, 22 warnings)** — all 22 pre-existing `no-unused-vars` warnings in unrelated test files |
| `npm run build` | `npm run build` | ⚠ **exit 1 — FAILS, for a reason that predates this task.** See below. |

**Whole-suite numbers before this task, for the delta:** the main suite ran at **2212 passed** partway
through Task 2 and at **2213** once Task 2's thirteenth case existed; the availability suite moved
265 → 266 for the same reason. The 31 tests this task adds are 18 (table) + 13 (rendered).

### `npm run build` fails, and it is not this task

`npm run build` is `npm run lint && npm run test:design && next build`. It stops at the first step:

```
$ npm run lint  ; echo EXIT
✖ 427 problems (37 errors, 390 warnings)     # 37 = 36 pre-existing + 1 that was mine
EXIT:1
```

The one error that was mine (`react-hooks/set-state-in-effect` in `weekly-hours-editor.tsx`) is fixed
— see Deviation 3. The remaining **36 errors are all in `.planning/spikes/**/*.js`**, and they are
byte-identical to what they were before this task started:

```
$ git diff --stat d054761 -- .planning/spikes/ eslint.config.mjs package.json
(empty)                    # d054761 is the commit immediately before this task's first
```

`eslint.config.mjs`'s `globalIgnores` does not cover `.planning/**`, so the four Phase-18 spike demos
committed at `ab33c69` are linted as application source. Nothing appears to have run `npm run build`
between that commit and this task. **This was NOT fixed here** — the repair is a repo-wide ESLint
config decision, out of scope for a feature quick task — and it is written up with its measurement,
its cause and a suggested one-line repair in
`.planning/quick/260831-ndc-availability-copy-to-all/deferred-items.md`.

The other two thirds of `npm run build` were therefore run directly, and both pass (rows 6 and 8
above). **Naming this plainly: the plan's done-criterion "`npm run build` … passes" was not achievable
on this tree, and the reason has nothing to do with this work.**

### The bare-command trap, demonstrated once for the record

The plan warns three times that a `tests/design/*` file needs its config. Confirmed on this box:

```
$ npx vitest run tests/design/live-regions.test.tsx
No test files found, exiting with code 1

filter:  tests/design/live-regions.test.tsx
include: tests/**/*.test.ts, tests/**/*.test.tsx
exclude:  e2e/**, node_modules/**, .next/**, tests/design/**
EXIT:1
```

Every design-gate run in this summary used `--config vitest.design.config.ts`, including the watched
red — where a false red would have been the worst possible outcome.

---

## Watched reds, verbatim

**RED 1 — the Task 1 table against the ABSENT module.**
`npx vitest run tests/availability/copy-hours.test.ts`

```
Error: Cannot find package '@/lib/availability/copy-hours' imported from
C:/Users/Admin/Roaming/FitOut/tests/availability/copy-hours.test.ts

 Test Files  1 failed (1)
      Tests  no tests
```

This is honest but **weak**, and it is recorded as weak: it proves the table runs against nothing, not
that the table can tell a wrong answer from a right one. So a second red was driven.

**RED 2 — the Task 1 table against a PRESENT BUT WRONG module.** The probe kept each target day's
existing windows and appended the source's beside them instead of REPLACING them — the one plausible
wrong transformation, and the one that still looks perfectly correct on a target day that was closed.

```
 Test Files  1 failed (1)
      Tests  3 failed | 15 passed (18)

(1)  AssertionError: expected [ [ '09:00', '10:00' ], …(3) ] to deeply equal
     [ [ '06:00', '09:00' ], …(2) ]
(2)  AssertionError: expected [ { dayOfWeek: 2, …(2) } ] to deeply equal []
(13) AssertionError: [{"code":"custom","message":"These hours overlap. Adjust them so each block
     stands on its own.","path":["windows"]}]: expected false to be true
```

Case (13) is the one worth reading twice: the wrong transformation produced a set the **real**
`weeklyHoursSchema` refuses, which is exactly the failure mode T-19-02 exists for. Reverted → 18
passed.

**RED 3 — the rendered wiring against the UNWIRED editor.**
`npx vitest run tests/availability/copy-hours-editor.test.tsx`

```
 Test Files  1 failed (1)
      Tests  12 failed (12)

TestingLibraryElementError: Unable to find an accessible element with the role "button" and
name "Copy Monday's hours"                    (×11; the twelfth is the Tuesday variant)
```

Wired → 12 passed, then 13 once the Rule-2 case below was added.

**RED 4 — `PHASE_14_SURFACE_FILE_COUNT` at 19, with the new import ALREADY in place.** Driven with the
config, as the plan requires; the number was moved only after this was seen.
`npx vitest run --config vitest.design.config.ts tests/design/live-regions.test.tsx`

```
 Test Files  1 failed (1)
      Tests  1 failed | 25 passed (26)

AssertionError: the walk reached 20 files inside the owned trees, not 19. That is not a failure by
itself — adding a component to one of the five surfaces is supposed to move this number — but the
reach of every assertion below just changed, so move the constant in the same commit and name the
file in the diff.: expected 20 to be 19
```

Moved to 20, with `src/components/availability/copy-hours-dialog.tsx` named in the constant's
docblock beside the existing 18→19 note and stating that it authors no live region, so
`src/lib/design/live-regions.ts` is not edited. → 26 passed.

**RED 5 — the Rule-2 addition's own probe** (see Deviation 1). `setCopyUndo(null)` removed from the
save-success branch:

```
      Tests  1 failed | 12 passed (13)
(13) AssertionError: expected <button data-slot="button" …(5)>…(1)</button> to be null
```

Reverted → 13 passed.

**Every red behaved as the plan predicted.** There was no probe that stayed green when the plan said
it would go red. RED 1's weakness is a property of a resolution failure, not a contradiction of the
plan — the plan asked for a watched red and got one; RED 2 was added on top because one alone would
not have been a gate.

---

## The focus mechanism, and why it is this one

**Chosen:** `onCloseAutoFocus` on the pattern, `event.preventDefault()`, and the destination recorded
in a ref at the moment the intent is formed — `{ to: "undo" }` when a copy is applied, `{ to: "copy",
day }` when the picker is opened. The close handler does not call `focus()`; it stores the request in
a second ref and bumps a counter, and an effect keyed on that counter places the focus.

**Why deferred rather than immediate:** the undo control has not mounted at the moment the close
handler runs. Measured, not assumed — see below.

**Why a ref-plus-counter rather than the pending-focus *state* the plan suggests as an alternative:**
holding the request in state means clearing it from inside the effect, which is
`react-hooks/set-state-in-effect` — a hard lint error in this repo (Deviation 3). The ref carries the
request; the counter only wakes the effect; the effect sets no state.

**`onOpenAutoFocus` is not passed anywhere.** `tests/design/responsive-dialog-autofocus.test.tsx`
derives its adopter census from the tree, and `copy-hours-dialog.tsx` joined that census the moment it
rendered the pattern — it is policed, it does not mention the prop, and the gate is green (130 tests).

### A measurement that the plan did not have, and that the tests now record

The plan says the undo control "has not mounted yet at the moment the close handler runs". That is
true, but the timing is stronger than that and it changed how the tests are written: **Radix does not
dispatch its close-time focus event during the unmount commit at all — its focus scope defers the
whole thing behind a zero-delay timer** (its own source comments cite a React unmount-focus bug).

Probe: the cancel-path case with **six** sequential `await act(async () => {})` flushes still observed
`document.body` as `activeElement`; the identical case wrapped in `waitFor` passed. So the focus cases
in `copy-hours-editor.test.tsx` poll, and the reason is written into that file's header rather than
left as a mystery for the next reader. Cases (8), (9) and (10) assert, respectively: focus returns to
the copy control after a dismissal, lands on the undo control after an apply (with that control's
accessible description resolving to the applied sentence), and returns to the copy control after an
undo.

---

## Deviations from the plan

### 1. [Rule 2 — missing critical functionality] A successful save now drops the undo record

**Found during:** Task 2, reviewing the affordance's lifetime.

**Issue:** the plan specifies when the undo affordance *appears* and what it restores, but not when it
retires. As written, it survived a successful save — so a host who copied, saved, and then pressed
"Undo copy" would restore the **form** to the pre-copy schedule while the **database** held the copied
one, and the sentence beside it still read "Copied Monday's hours to Tuesday." An affordance that
appears to reverse a committed save and does not is exactly the surprise D-137 exists to prevent.

**Fix:** `setCopyUndo(null)` in the save-success branch, with its reason in a comment. HOURS-02's undo
is a before-Save affordance, and that is where "before Save" ends.

**Test:** `copy-hours-editor.test.tsx` case (13), which also asserts that what the save *carried* is
the copied schedule, through the unchanged submit path. Its red is RED 5 above.

**Consequence for the file's own record:** `weekly-hours-editor.tsx`'s 14-12 docblock claims the save
path is untouched. That claim is now false by one line, so the new header block states exactly what
moved and what did not, rather than leaving the older paragraph quietly wrong.

**Files:** `src/components/availability/weekly-hours-editor.tsx`, `tests/availability/copy-hours-editor.test.tsx`. **Commit:** `040bbc0`.

### 2. Two-item list grammar drops the comma

**Plan text:** *"Comma-separated with an 'and' before the last, which is the join grammar
`week-strip.ts` already uses for its ranges."*

**What shipped:** three or more items use that grammar exactly (`Tuesday, Wednesday, and Friday`).
**Two** items read `Tuesday and Friday`, where `week-strip.ts`'s own helper would emit
`Tuesday, and Friday`.

**Why:** `week-strip.ts` joins long phrases that each contain a preposition (`6:00 AM to 9:00 AM, and
5:00 PM to 10:00 PM`), where the comma is what keeps them apart. These items are single words, and
`Tuesday, and Friday already have hours.` reads as a typo to a host. The plan's own instruction that
the joiner be **local to this module** is what makes the divergence legal: what must not be duplicated
is a sentence, and a joiner is not one. The reason is written into `copy-hours.ts` beside the helper.

**Files:** `src/lib/availability/copy-hours.ts`. **Commit:** `6364d11`.

### 3. [Rule 1 — bug] The first focus implementation was a hard lint error

**Found during:** Task 2's `npm run build` step.

**Issue:** the pending-focus **state** the plan suggests requires clearing that state inside the effect
that consumes it, which this repo's ESLint config rejects outright:

```
src/components/availability/weekly-hours-editor.tsx
  230:5  error  Calling setState synchronously within an effect can trigger cascading renders
                react-hooks/set-state-in-effect
```

**Fix:** the ref-plus-counter shape described above. Behaviour is identical; the effect sets no state.
`npx eslint src tests` is now **0 errors**.

**Files:** `src/components/availability/weekly-hours-editor.tsx`. **Commit:** `040bbc0`.

### 4. Copy for two cases the plan did not specify

- **An empty target list** — `appliedSentence` is `"No days were selected, so nothing changed."`
  rather than a copy sentence naming nobody. Unreachable through the UI (the confirm is disabled), but
  the type says `string`, so it says something honest. Pinned by table case (18).
- **The confirm's label when nothing is selected** — `"Copy hours"`, not `"Copy to 0 days"`. The plan
  asks for the count in the label; a count of zero reads as a bug rather than as a state. With one or
  more selected it is `"Copy to 1 day"` / `"Copy to N days"` as specified.

### 5. The overlay latches its shown day and resets its selection per visit

Not specified by the plan; needed to avoid two visible defects. The picker keeps rendering during the
overlay's exit animation, so reading the incoming source day directly would swap the title, all six
rows and the warning for the length of that animation every time a host dismisses it; and a selection
kept across visits would re-open the picker on the same day still carrying the previous visit's ticks.
Both are handled with React's documented "adjust state when a prop changes" shape (a re-render before
commit, so nothing paints twice), commented as such.

### 6. Not a deviation, stated because its absence is deliberate: T-19-04

**No weekday is filtered out of the picker and no client-side hours-lock check exists.** This was the
easiest thing in the task to "helpfully" add, so it is asserted rather than merely omitted:
`copy-hours-editor.test.tsx` case (7) requires all six other weekdays to be offered, always, and the
editor carries the reason in prose — the lock is `saveOperatingHours`' rule against the persisted
occupancy mode and the real bookings, the route already renders its own advisory naming the frozen
weekdays, and the server's refusal already reaches this form through the shipped toast and the field
error pinned onto the windows path. A pre-check here would be a second authority on what may be saved.

---

## How the design constraints were honoured

- **No hand-rolled boxes (D-155).** The overlay is `ResponsiveDialog` from the pattern layer; the rows
  are the vendored `Checkbox` and `Label`; the footer is two vendored `Button`s at the `touch` size.
  The undo affordance is **a line of muted text and a control** inside the stack that already exists
  between the day-editor panel and the save row — no card, no panel, no bordered container. The day
  row's two controls sit in a wrapping flex row with a gap so they wrap rather than overflow.
  `card-pattern-coverage.test.ts` green; `weekly-hours-editor.tsx` is still off `ALLOWED_RAW_CARD`.
- **Tone read by name.** The warning composes `STATUS_TONE_RECIPES.neutral` — full-contrast ink for
  the sentence, the muted hue for the glyph — imported and read by name, never restated as classes.
  The alarm role is spent **zero** times in the new file (`grep -c destructive` → 0), and
  `weekly-hours-editor.tsx` still spends it exactly once, on the shipped overlap message, which is
  what `host-tone-census.test.ts` pins. The accent button variant is not used;
  `brand-recipe.test.ts` green.
- **Zero live regions on the new surface.** Asserted from both sides: the design gate's census
  (26 passed, alert-role total still 2) and a rendered count in `copy-hours-editor.test.tsx` case (12)
  asked as a count, so the polite spellings are caught by the same clause as the interrupting one. The
  outcome is announced by moved focus instead.
- **No new `data-testid`.** `selector-contract.ts` is untouched and its gate is green; everything the
  tests reach for is queried by role and accessible name, or through the strip's already-declared
  identifier.
- **Headings.** The new surface adds no heading to the availability section — the only heading it has
  is the dialog's own title, which Radix portals to `document.body`, outside the section.
  `week-strip.test.tsx` case (7) (exactly one second-level heading in the section) is green.
- **The one owner stayed one.** `copy-hours.ts` imports `WEEKDAY_NAMES`, `WeeklyHoursWindow` and
  `WeekStripInput` from `week-strip.ts`; no second weekday list, hour parser or hour-label map exists
  anywhere in this feature. The picker labels each day with **that day's own sentence from
  `deriveWeekStrip`**, so the picker and the strip say the same words by construction (D-153).

---

## Naming discipline

Several design gates read this tree's raw source text, and `weekly-hours-editor.tsx`'s own header
records that quoting a class string or an accessibility attribute in a comment has turned gates red
twice in this file's history. No comment added by this task quotes a class name, a utility, or an
accessibility attribute — things are named descriptively in prose throughout the three source files
and both test files. The gates that read source text are green.

---

## The manual walk — NOT PERFORMED, and named as unverified

The plan routes a manual browser walk to this summary as a human-verify note. **This executor has no
browser automation available**, so the walk was not driven and nothing below is claimed from it.

What the walk would have added over the automated gates, and therefore what is genuinely unverified on
this machine:

- **GATE-RESP at the 320px floor** — that the day row's two controls wrap rather than overflow, and
  that the overlay takes the bottom-sheet presentation below the small breakpoint. jsdom computes no
  layout, so this is unmeasurable in the suite; the markup follows the shipped patterns
  (`ResponsiveDialog` owns the sheet presentation; the row is a wrapping flex row with a gap), but
  that is an argument, not a measurement.
- **Visible focus in the `court` theme** — the focus ring is a CSS recipe jsdom does not resolve.
  Reachability and destination are asserted; the ring's appearance is not.
- **Real keyboard tab order** through the overlay's focus trap.
- **The legibility of a long day sentence** on a checkbox row at the narrow floor (a day with several
  windows produces the longest label; the label is allowed to wrap and carries the looser line
  spacing the host cancel overlay's acknowledgement label already uses).

What the automated suite **does** cover is the walk's functional sequence, step for step, in
`copy-hours-editor.test.tsx`: Monday with two windows, Tuesday closed, Wednesday with one; copy Monday
onto Tuesday and Wednesday; the warning names Wednesday and not Tuesday, **before** anything is
applied, with the schedule asserted untouched at that moment; apply, and both days read Monday's two
windows with the strip agreeing; undo, and Wednesday is back to its single window and Tuesday is
closed again; then copy Tuesday (closed) onto Wednesday, which reads closed afterwards and was named
in the warning beforehand. `saveOperatingHours` is asserted at **zero calls** throughout.

**Recommended:** the PM or a verifier drives the four-step walk in a browser before this is called
verified, specifically at 320px and with the keyboard.

---

## Docs reconciliation (Task 3)

```
$ grep -c "D-142" .planning/PROJECT.md
3

$ grep -n "HOURS-01\|HOURS-02" .planning/REQUIREMENTS.md
143:- [x] **HOURS-01**: A host can copy one day's operating hours to other days instead of re-entering them
144:- [x] **HOURS-02**: The host sees what will change before it applies, and can undo it before saving
268:| HOURS-01 | ~~Phase 19~~ → quick `260831-ndc` (D-142) | **Satisfied** |
269:| HOURS-02 | ~~Phase 19~~ → quick `260831-ndc` (D-142) | **Satisfied** |
284:| ~~19~~ → quick `260831-ndc` | Availability Copy-to-All — shipped as a quick task rather than a phase (D-142), 2026-08-31 | HOURS-01..02 | 2 |
290:- Mapped: **71 / 71 ✓** — 69 to phases 10–17, and HOURS-01..02 to quick task `260831-ndc` …

$ grep -n "Not started" .planning/ROADMAP.md | grep -c "Availability Copy-to-All"
0

$ grep -c "260831-ndc" .planning/STATE.md
1
```

Coverage arithmetic reconciles: 18+11+12+9+5+6+4+4 = **69** across phases 10–17, plus **2** on this
quick task = **71 in scope**, mapped 71/71, unmapped 0.

**One vocabulary note:** the traceability rows read **Satisfied**, as the plan specifies, rather than
the table's usual `Complete`. That is deliberate — the work is shipped and green but has not been
through a verifier — but it is a word the table did not previously use, and
`requirements mark-complete` would overwrite it with `Complete` if anyone runs that verb.

The ROADMAP's Phase 19 block keeps its goal, its requirements and its three success criteria
**verbatim**, above a demotion record naming which of the three the shipped work satisfies (SC-1 and
SC-3 outright; SC-2 as the PM scoped it — named days plus the shipped live strip plus undo, with a
full before/after diff table explicitly out of scope). The execution-order line's tail is reconciled.

`.planning/STATE.md` carries the `260831-ndc` row in **§ Quick Tasks Completed** and is left
**uncommitted** for the orchestrator's docs commit, per this task's dispatch.

---

## Out-of-scope discoveries (logged, not fixed)

Both are written up with their measurements in
`.planning/quick/260831-ndc-availability-copy-to-all/deferred-items.md`:

- **D-1 — `npm run build` has been failing at its lint step since `ab33c69`**, on 36 pre-existing
  `no-require-imports` / `no-this-alias` errors in `.planning/spikes/**/*.js`, because
  `eslint.config.mjs`'s ignore list does not cover `.planning/**`. Proven to predate this task by
  `git diff --stat d054761 -- .planning/spikes/ eslint.config.mjs package.json` returning empty. The
  repair is a repo-wide config decision, not a feature task's to take.
- **D-2 — two quick-task rows (`260826-l1o`, `260828-q1x`) have leaked out of STATE.md's Quick Tasks
  Completed table into the Deferred Items table below it**, where their six columns do not match that
  table's five. Cosmetic; left alone deliberately.

---

## Threat register outcomes

| Threat | Disposition | How it landed |
|--------|-------------|---------------|
| T-19-01 EoP — copied windows against a listing the host does not own | mitigate | Unchanged. `assertOwnership` still runs server-side before any write; proven by the byte-identical server action. |
| T-19-02 Tampering — copied windows fast-pathed past the schema | mitigate | The produced rows go into the same field array and through the same submit handler. Table case (13) parses the output with the **real** `weeklyHoursSchema`; RED 2 case (13) shows that gate firing on a wrong transformation. |
| T-19-03 Tampering/Info — the copy drifting into client-side availability derivation | mitigate | `copy-hours.ts` imports no database module, reads no clock, and imports the validation module not at all (its types come through `week-strip.ts`). It answers only "what array does the form hold next". |
| T-19-04 Tampering — client-side pre-emption of the hours lock | mitigate | Deliberately not implemented, and asserted by case (7). See Deviation 6. |
| T-19-05 DoS — an unbounded copy inflating the saved set | accept | Bounded by construction: at most six target days × the source day's windows. |
| T-19-06 Repudiation — an overwrite the host did not authorise | mitigate | The warning names the days before the copy applies (cases 1 and 4, both asserting *before*), and the copy is reversible until Save. |
| T-19-SC Supply chain | mitigate | Zero installs; `git status --porcelain -- package.json package-lock.json` empty. |

---

## Self-Check: PASSED

```
$ for f in src/lib/availability/copy-hours.ts src/components/availability/copy-hours-dialog.tsx \
           tests/availability/copy-hours.test.ts tests/availability/copy-hours-editor.test.tsx ; do
    [ -f "$f" ] && echo "FOUND: $f" || echo "MISSING: $f" ; done
FOUND: src/lib/availability/copy-hours.ts
FOUND: src/components/availability/copy-hours-dialog.tsx
FOUND: tests/availability/copy-hours.test.ts
FOUND: tests/availability/copy-hours-editor.test.tsx

$ for h in 6364d11 040bbc0 18c1afb ; do
    git log --oneline --all | grep -q "$h" && echo "FOUND: $h" || echo "MISSING: $h" ; done
FOUND: 6364d11
FOUND: 040bbc0
FOUND: 18c1afb
```

No stubs. Nothing in this task renders a hardcoded empty value, a placeholder string, or a component
with no data source wired.
