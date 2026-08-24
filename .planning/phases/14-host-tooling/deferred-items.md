# Phase 14 — Deferred Items

Out-of-scope discoveries made while executing this phase's plans. Logged, not fixed.

---

## `[14-03]` The `status` column does not shrink, and the D-99 reason line is the widest thing that can land in it

**Found during:** 14-03 Task 2, moving the SLA countdown into `RowCard`'s `status` slot.
**Owner:** **14-06** — it owns `src/app/(host)/host/requests/page.tsx` and `e2e/host-inbox-hierarchy.spec.ts`,
which is where the 320px measurement actually runs.

`row-card.tsx:200-210` renders the `status`/`trailing` column as
`<div className="flex shrink-0 flex-col items-end gap-1">`. `shrink-0` means that column keeps its
max-content width no matter how narrow the viewport is; the title column beside it is `min-w-0 flex-1` and
absorbs the whole squeeze by truncating.

That is correct and unremarkable for the countdown itself (`Expires in` over `23h 45m` — narrow). It is
worth a measurement for the **D-99 cap-shortened reason line**, which 14-UI-SPEC puts in the same slot and
which is a full sentence: *"Session starts in under an hour — respond soon."* At 320px the card's content
box is ~288px, so on a capped row the space title can be truncated hard.

**Why it was not fixed here:** 14-03's `files_modified` is four files and `row-card.tsx` is not one of them.
Relaxing `shrink-0` is a change to **all four** RowCard adopters, and the fix that does not touch the
pattern — a width cap on the status content — would mint an undeclared box measurement, which is exactly
what `measurements.ts` exists to prevent.

**What 14-06 should do:** measure it at 320px on a row that actually renders the reason line, and if the
truncation is unacceptable, either (a) declare the cap in `measurements.ts` with its derivation and apply
it to the status content, or (b) record that a capped row truncating its title at 320px is acceptable
because the deadline is the thing being triaged. Either is fine; discovering it in a Playwright failure is
not.

**Not a regression this plan introduced:** the reason line rendered beneath the countdown before 14-03 too.
What changed is which column it renders in, and therefore which neighbour pays for its width.

### ✅ DISCHARGED by 14-06 — option (a), and the measurement was worse than the prediction

Measured in Chromium at 320px (court) by `e2e/host-inbox-hierarchy.spec.ts` case 3, on a deliberately
cap-shortened seeded request so the reason line really renders:

```
status column  235.34px   ← driven entirely by the D-99 reason sentence
the countdown   84.20px   ← what that column actually exists to hold
space title      8.66px   ← what was left  (it wanted 129px)
```

8.66px is not "truncating hard" — it is an ellipsis where the name of the space should be, and the
venue-local window beneath it wrapped in the same 8.66px, roughly one word per line. Option (b) was
therefore not defensible: the deadline being the thing under triage does not make *which space* optional.

**Option (a) taken.** `REQUEST_STATUS_CAP` (`max-w-28`, 112px) is declared in `measurements.ts` with its
full derivation — at the 320px floor the two columns share 244px, 112px clears the measured 84.20px
countdown with headroom for the grove theme's wider heading step, and 244 − 112 = 132px leaves the title
the LARGER share. It is applied to the status CONTENT in `request-row.tsx`, **not** to `row-card.tsx`'s
`shrink-0` column, so the other three adopters are untouched. After the fix, measured on the same row:
status column **112px**, space title **132px** — the title now fits entirely.

The cap is pinned in BOTH directions: case 3 also fails if `REQUEST_STATUS_CAP` is ever tightened past
the countdown's own max-content width, because the reason line may wrap and the deadline may not.

---

## `[14-09]` The index-keyed visited set is not observably wrong TODAY, and the day it becomes wrong is the day D-148 is widened

**Found during:** 14-09 Task 2, running the falsification probe the plan asked for.
**Owner:** whichever plan widens **D-148** from *backward-to-visited-only* to free jumping
(14-UI-SPEC § The step rail flags it as "a reading the PM may want to widen").

The plan required case 6 of `tests/listing/wizard-rail.test.tsx` to be observed FAILING against a
deliberate regression: key the wizard's visited-step set by numeric index instead of by step key. The
probe was applied — `Set<number>` seeded with `0`, `goToStep` adding `i`,
`canReturn = state === "done" && visited.has(i)` — and the file stayed **green, 7 passed**.

**Why.** The two implementations can only differ where `i < currentIndex` and
`visitedKeys.has(steps[i].key) ≠ visitedIndexes.has(i)`. The wizard has **no forward jump**:
`saveAndContinue` moves exactly one step, the rail moves strictly backward, and the review checklist's
links move strictly backward. So `visited ⊇ {0…current}` is an invariant under BOTH keyings and the
predicate collapses to `i < current` either way. The occupancy fork does not rescue it: the mode can
only be changed **on the occupancy step** (position 5), the two walked lists are identical below that
point, and every position past it is reached by walking through it.

**Why the by-KEY rule was still implemented, and must stay.** It is `wizard.tsx`'s own law — three
separate docblocks in that file state that nothing there is addressed by index, and the publish
checklist's numeric-literal rot is the recorded reason. More concretely: **the moment a forward jump
exists, the index-keyed set is wrong and silently so.** A host who walks whole-space past the
booking-mode step, returns to the occupancy step, switches to drop-in and then jumps forward would find
position 7 — cancellation in drop-in, booking mode in whole-space — marked visited on the strength of a
step they have never seen. That is the "passes every single-mode test" failure, arriving one plan later
than the probe could reach it.

**What 14-09 shipped instead, so the case is not toothless.** Case 6 rejects the **observable** half of
the same rule: a marker whose step is resolved by numeric position against the UNFILTERED step list.
Observed red, with the marker-name drift D-148 names verbatim:

```
-   "Go back to step 7: What happens if a guest cancels?"
+   "Go back to step 7: How do you want to accept bookings?"
```

**What the widening plan should do:** before adding a forward affordance, re-run the index-keyed probe
against the widened rail. It should go red at case 6 — and if it does not, the new affordance has not
actually created a jump and the widening is incomplete.

---

## `[14-10]` `contrast-pairs.ts:214`'s accent note still says the rail's COMPLETED markers paint the accent, which 14-09 stopped being true

**Found during:** 14-10 Task 1, sweeping every prose site that addresses a wizard marker by its role.
**Owner:** whichever plan next edits the accent inventory — **14-16** touches the rail's baselines and
`accent-uses.ts` entry 7 is the twin of this line.

```ts
{ fg: "brand", bg: "background", bar: NON_TEXT_BAR,
  note: "The unread-notification dot and the wizard's completed-step markers, on the page." }
```

14-09 narrowed the rail's accent condition from *current-or-done* to *current only* and amended
`accent-uses.ts` entry 7 (*"the completed-step markers"* → *"the current-step marker"*) in the same
commit. This second note, in a different module and on a different pairing, was not amended and now
names a state that no longer paints the accent: a visited marker carries the secondary surface, and
the only accent-filled marker is the CURRENT one.

**Why it was not fixed here:** it is a different pairing (accent on the page ground) from the one this
plan's four amendments are about (the success foreground on its filled surface), it was made stale by
14-09 rather than by this plan, and this plan's acceptance criterion pins its own diff to
`contrast-pairs.ts` at *"only the note's prose"* — singular, the success note. Editing a second,
unrelated note in the same commit would make that criterion unverifiable by `git diff` alone.

**What the owning plan should do:** change *"completed-step markers"* to *"current-step marker"*, the
same one-string edit 14-09 made in `accent-uses.ts`. Nothing mechanical is wrong — no gate reads this
string — which is exactly why it needs a plan to notice it rather than a test.

---

## `[14-10]` The publish checklist's row labels are `text-sm`, and 14-UI-SPEC assigns them the BODY role

**Found during:** 14-10 Task 1, lifting the row markup verbatim.
**Owner:** whichever plan takes the wizard's remaining type migration — **14-11** is the next plan in
this file, and 14-UI-SPEC § Typography rule 1 (the step title) was already discharged by 14-09.

14-UI-SPEC's Typography table lists *"checklist row labels"* under the **Body** role (16px), and the
shipped rows carry `text-sm` (14px, which is the LABEL role's size). The rows were lifted BYTE-FOR-BYTE
into `components/host/publish-checklist.tsx` because this plan's own instruction is *"LIFT the row
markup — do not rewrite it"*, and a size change is a rewrite.

**Nothing is red.** `type-scale.test.ts` treats the framework's re-declared `text-xs…2xl` ladder as
legal and not a fifth role, so `text-sm` passes today and will keep passing. This is a spec/reality
discrepancy, not a violation.

**What the owning plan should do:** decide it rather than inherit it. Either move the rows to the Body
role (one class, one file, now that there is only one copy of the markup) or amend the UI-SPEC's table
to say Label — the checklist is a dense nine-row list beside a form, and 14px is a defensible reading
of it. Whichever way it goes, the two should agree.

**14-11 did NOT take it, and the reason narrows the ownership rather than passing it on.** That entry
names 14-11 as the likely owner on the grounds that it is *"the next plan in this file"* — but the rows
are no longer IN this file: 14-10 lifted them into `src/components/host/publish-checklist.tsx`, and
14-11's plan text says in as many words *"do not touch the rail, the checklist or the step fork"*.
14-11 also has an acceptance criterion pinning its own diff to two files, so a third would have made
that criterion unverifiable by `git diff` alone — the same argument 14-10 used to leave the accent note
above unmoved.

**What the owning plan should do:** unchanged from the entry above. The owner should now be read as
**whichever plan next opens `publish-checklist.tsx`** — 14-16 touches the wizard's baselines and is the
first candidate.

---

## `[14-11]` `LIVE_REGIONS` owes a `wizard-save-state` row, and it will be the FIRST author-named region whose text is its own message

**Found during:** 14-11 Task 1, rendering the save-state region.
**Owner:** **14-14** — 14-UI-SPEC § Live Regions assigns it that row explicitly, and 14-11's own plan
says the row *"is declared in the live-region inventory in plan 14-14"*.

Nothing is red today, and the reason is worth stating because it is the thing that makes this easy to
miss: `tests/design/live-regions.test.tsx`'s scan opens `BOOKER_PATH_LIVE_REGION_FILES` and nothing
else, and `wizard.tsx` is not in it. So a `role="status"` can be added to the wizard with the whole
design suite green — which is exactly the *"a file nobody ever looked at scans identically to a file
deliberately left to a later phase"* problem `live-regions.ts`'s own header is written about.

**Three edits, and they are one commit, not three:**
1. `wizard.tsx` joins `BOOKER_PATH_LIVE_REGION_FILES` (which the UI-SPEC already says must be renamed —
   a closed union containing host files cannot keep a name asserting it contains none), and
   `DECLARED_FILE_COUNT` in the test moves with it. The count is type-level pinned; it will not drift
   quietly.
2. A `LIVE_REGIONS` row: id `wizard-save-state`, kind `status`, `at: 1`, announcing *`Saving…` → `Saved`,
   or the server's refusal sentence, at most one announcement per press*.
3. ⚠ **An `AUTHOR_NAMED_REGIONS` row, and its `why` cannot be borrowed from any of the four already
   there.** All four existing exceptions are wrappers with NO TEXT OF THEIR OWN — a wrapper around
   `MoneyStatement`, two around `PanelCard`, one around an icon-heading-paragraph group. This region has
   text, and the inventory's kind→naming table says a `status` region takes its name from its own text.
   The argument that actually applies is different and specific to D-150: **the region PERSISTS and is
   EMPTY at idle**, deliberately, so that its text can change in place rather than the element mounting
   and unmounting. An empty region named by its own text has no name at all, for most of the session —
   so this is a region that is decorative-by-construction *some of the time*, which none of the four
   precedents is. The label shipped is `"Save state"`: two words, a LABEL and not a second copy of the
   sentence, per the VoiceOver hazard `share-link-box.tsx:109-121` records.

---

## `[14-15]` Two `RowCard` adopters outside the host tree were never measured against the 80px skeleton

**Found during:** 14-15 Task 1, measuring the three host row shapes against the rendered routes.
**Owner:** unassigned — a later phase that opens `(app)/bookings` or the notification list.

`[11-08]` recorded that every shipped row card rendered 112px against an 80px skeleton and predicted the
fix would be "a pure win at adoption". 14-15 discharged that for the three HOST rows and found the live
mismatch was the OPPOSITE one and up to five times larger — a shipped host row with a description list
and actions measures 254.05px at the 320px floor against a plate promising 80.

**Not measured here, and not guessed at:** `src/app/(app)/bookings` and `src/components/.../notification-item.tsx`
are the two remaining `RowCard`/row-shaped adopters. Neither route is in this plan's `files_modified`, and
neither is a host surface, so neither was opened. Both still draw `ROW_CARD_HEIGHT` (80px) from
`RowListSkeleton`'s default, and **nobody has checked whether that is still true of the rows they render.**
The booker bookings row carries a 48px thumbnail, which is the one configuration `ROW_CARD_HEIGHT` was
derived for — so it may well be correct. That is a prediction, not a measurement, and the whole lesson of
this plan is the difference.

**What a later plan should do:** measure both at 320 and at the desktop width on the rendered route, and
either reuse `ROW_CARD_HEIGHT` (recording that it was checked) or declare the shape's own height in
`src/lib/design/measurements.ts` beside the three host ones and add a case to
`e2e/skeleton-geometry.spec.ts`'s host block, which already owns the pending-shell-against-resolved-list
idiom and a fixture. ⚠ Check first whether the route renders more than one tree: the two host list routes
hide their card stack above the medium breakpoint and render a table, and measuring the hidden tree
returns a zero box that makes every comparison pass while measuring nothing.

---

## `[14-16]` `HOST_BOOKING_ROW_HEIGHT` moved 20px overnight, and 14-15 predicted the mechanism in its own docblock

**Found during:** 14-16 Task 1, re-running `e2e/skeleton-geometry.spec.ts` after touching `host-agenda.tsx`.
**Owner:** whichever plan next opens `src/lib/design/measurements.ts` or `e2e/skeleton-geometry.spec.ts`.
**Neither is in 14-16's `files_modified`, and the fix as the failure message states it is the same bug
one day later** — see below.

`npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium`, **24 August 2026**, run ALONE:

```
Error: host booking row · /host/bookings · 320px: the resolved card measures 176px, but this shape was
measured at 196px when its height was declared.
Expected: <= 4
Received:    20
1 failed / 3 passed   (--grep "14-15"; 12 passed / 1 failed on the whole file)
```

**It is NOT caused by this plan, and that was verified rather than argued.** Both of 14-16's Task-1 edits
were copied aside, `git checkout -- src/components/host/host-agenda.tsx e2e/overflow-320.spec.ts` returned
the tree to HEAD, `git status` showed no modified file, and the case failed **identically**. The two edits
were then restored. (The mechanism also rules it out independently: `host-agenda.tsx` is imported by
`(host)/host/page.tsx` and by nothing else, and the failing case measures `/host/bookings`.)

**What actually moved.** Nothing in the source. 14-15 measured 196px on **23 August**; this is **24 August**.
That plan's own decision 3 names the mechanism verbatim: *"At 320 the row is a card whose window label also
wraps, and the wrap count moves with the calendar — a one-digit day-of-month or hour changes it — which is
why the two seeded pending rows genuinely differ from each other by 20px. Pinning a tight number there would
be pinning today's date."* The constant was pinned tight on the RESTING row anyway, and 20px is exactly the
one-line step that docblock predicts.

**Why 14-16 did not fix it.** The failure message's own instruction — *"re-measure and move the constant,
never the tolerance"* — produces a constant that is right on 24 August and wrong again on the next date
whose label wraps differently. That is not a fix, it is a re-arming. The real repair is a decision about
the FIXTURE, and it belongs with the plan that owns these constants:

**What the owning plan should do**, in preference order:
1. **Make the label's wrap count a property of the fixture, not of the wall clock.** `skeleton-geometry.spec.ts`
   already seeds a fixed-length listing TITLE for exactly this reason (14-15 decision 4 states it). Do the
   same for the window: seed `starts_at` at a venue-local instant whose composed label has a fixed
   character count in every month — or assert the label's rendered LINE COUNT alongside the height, so a
   red says "the row wraps three lines today and two when this was measured" instead of naming a number.
2. **Or pin the host booking row at 320 as a BAND**, the way the same file already pins the still-pending
   row's over-run, with both measured numbers and the wrap reason in the message.

⚠ **Do not simply raise `HOST_TOLERANCE_PX`.** 4px is 14-UI-SPEC's own falsifiable and 14-15 argued it from
the fractional pixels the rows land on; widening it to 20 would swallow a whole line of content, which is
the defect the plate exists to prevent.

### ✅ RESOLVED — 24 August 2026, preference 1 taken on both knobs, and the sweep found a second one

`npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium`, run ALONE: **14 passed**.
`npx tsc --noEmit` exit 0. `npm run test:design` 50 files / 837 passed / 3 skipped / 0 failed.
`git diff --stat drizzle/` empty. Two files changed: `e2e/skeleton-geometry.spec.ts` and
`src/lib/design/measurements.ts`.

**The fixture is the fix. `HOST_TOLERANCE_PX` was not touched and no band was widened.**

#### What was measured, before anything was changed

A throwaway Chromium harness (deleted before the commit, the 14-15 idiom) seeded the shape on the real
route and then swapped each row's meta paragraph in place, re-reading the card's box and the paragraph's
line count from `Range.getClientRects()`:

1. **The bug, reproduced on the route rather than argued from the calendar.** Eight copies of the resting
   shape seeded at day offsets 1…8 — eight different "todays" in one run — measured
   **176, 196, 176, 176, 176, 196, 196, 176**. Same markup, same CSS, same request; only the composed
   label differed.
2. **The full range.** Over every date token `EEE, MMM d` can ever compose (7 × 12 × 31 = **2,604**)
   against five window spellings covering both digit-length classes on both bounds — **13,020 labels** —
   the shape takes exactly **two** heights at 320px and never a third:

   | window spelling | 176px (2 meta lines) | 196px (3 meta lines) |
   |---|---|---|
   | `8:00 AM – 9:00 AM` | 2,050 | 554 |
   | `9:00 AM – 11:00 AM` | 2,072 | 532 |
   | `10:00 AM – 12:00 PM` | 1,031 | 1,573 |
   | `11:00 AM – 1:00 PM` | 1,761 | 843 |
   | `6:00 PM – 8:00 PM` | 2,103 | 501 |
   | **total** | **9,017 (69%)** | **4,003 (31%)** |

3. **⚠ A SECOND SHAPE HAD THE SAME DEFECT AND NOBODY HAD NOTICED.** With the spec's *original*
   seventeen-character listing title, the **agenda** row rendered the declared 132px on only **554 of
   2,604** date tokens and 112px on the other **2,050**. `HOST_AGENDA_ROW_HEIGHT`'s narrow value was one
   date's luck exactly as the booking row's was — it simply had not yet been unlucky. The old title was
   additionally six characters of a **UUID**, and hex glyphs are not one width in a proportional face, so
   "seventeen characters" was seventeen characters of an unpredictable *width*, run to run.

#### What was changed

- **The measured confirmed bookings are seeded at ABSOLUTE venue-local days** (`2099-11-12` and
  `2099-01-12`), not at an offset from `now()`. `composeWhenLabelShort` renders no year, so a 2099 row is
  indistinguishable on screen from next week's — but its label is now a literal, and the spec **asserts
  that literal byte for byte**. 2099 rather than next month because the row must stay on the `upcoming`
  tab for the product's lifetime; a date that expires is the same bug with a longer fuse.
- **The listing title is a measured constant**, `"Geo Courts Poblacion One"` (24 chars). The agenda
  genuinely cannot leave the clock — the dashboard shows only the venue's local TODAY (D-140/D-141) — so
  its determinism comes from the other side of the same meta line. The length was chosen from the sweep:
  22 chars still splits (14 of 2,604 land on 3 lines), 23/24/25/26 all give **4 lines / 132px on all
  2,604 tokens × all five window spellings = 13,020 labels**. 24 sits mid-plateau.
- **`HOST_BOOKING_ROW_HEIGHT`: `h-49 md:h-9` → `h-44 md:h-9`** (196 → 176 below the breakpoint). 14-15's
  196 was not wrong when taken — it was the height of a three-line label — but 176 is the more common
  outcome (69%) **and** is the height this row already takes at 360, 375 and 414px, so one bar is right
  across far more of the ladder. The full distribution and the argument live with the constant.
- **Every card-tree step now asserts the meta paragraph's LINE COUNT** (read from `getClientRects()`, not
  divided out of the height) **and its label** — the exact string where the fixture pins an instant, a
  strict shape-regex where it cannot. "The calendar moved" and "the row's composition changed" are now
  two different reds with two different messages.
- **A new `(wrap)` case seeds BOTH of the shape's heights** and pins the 20px step between them, because
  every derived expectation in the block rests on that step.
- **One booker per booking (three → six).** The old fixture reused `Marisol` for a confirmed session today
  *and* a pending request, so `hostRowLocator(...).toHaveCount(1)` matched two rows on `/host/bookings`
  and passed only while today's session had already ended and dropped off the `upcoming` tab — a second
  wall-clock dependency in the same fixture, found while fixing the first.

#### Where preference 1 could NOT be taken, and what was done instead

The two **pending requests** stay relative, and the reason is content rather than convenience: a request's
D-99 reason line reads *"Session starts in {n}h"*, which at an absolute 2099 instant renders
*"Session starts in 641888h — respond soon."* — a row no host will ever see. So:

- **The request row needed no change, and that is measured, not assumed:** 254.05px / 3 meta lines on all
  13,020 labels **and** on thirteen reason-line spellings from `under an hour` to `999h` — one distinct
  value across **13,033** measurements. Its 320px height is set by the status column, the description list
  and the actions row, none of which the label touches.
- **The `/host/bookings` over-run these two also produce is the one place preference 2 is used.** 14-15
  answered it with a 40px-wide band (30…70), which is a band wide enough to swallow a wrapped line and
  therefore wide enough to swallow the defect the plate exists to catch. It is replaced by a
  **derivation**: the actions row's measured flat cost (**56px at 320, 25px at 1280**) plus 20px for each
  line *this row's own observed wrap count* exceeds the resting shape's two — asserted at the same ±4px as
  every pinned row.

#### The numbers now pinned

| shape | route | 320px | desktop | bar |
|---|---|---|---|---|
| agenda row | `/host` | 132.00 (4 meta lines) | 72.00 (1 line) | 132 / 72 |
| request row | `/host/requests` | 254.05 (3 lines) | 83.02 (table) | 256 / 84 |
| host booking row, 2-line label | `/host/bookings` | **176.00** | **36.52** (table) | 176 / 36 |
| host booking row, 3-line label | `/host/bookings` | **196.00** | 37.02 (table) | — (pinned as the step) |
| still-pending booking | `/host/bookings` | resting + **56** | resting + **25** | — (derived) |

#### Watched red — three probes, run and reverted

- **(f) the fixture goes back on the clock** (`localDate` → `dayOffset: 3`). The label clause fired by
  name: *"the window label composed as "Thu, Aug 27, …" but this fixture seeds this booking at an ABSOLUTE
  venue-local instant"*. ⚠ **"Thu, Aug 27" wraps to two lines, so the row measured 176px and every height
  clause in the file would have PASSED.** The regression was caught anyway, on a day when the number
  agreed — which is the difference between pinning a value and pinning the reason it holds.
- **(g) the title leaves the plateau** (`"Geo Courts"`): *"the meta line wraps to 3 lines today; it wrapped
  to 4 when this shape's height was measured. That is 20px of row height"* — which is this entry's own
  specification of what a red here should say.
- **(h) the actions row's cost moves** (`56` → `36`): *"an over-run of 76px where 56px was expected,
  because this row's label … wraps to 3 lines, 1 more than the 2 the 176px bar is declared against, so the
  expected over-run is 36 + 1 × 20"*. The wrap term was non-zero on the day it ran, so the derivation was
  exercised rather than short-circuited.

#### What it can no longer catch — stated so the next reader under-trusts it

- **The agenda's determinism rests on a measured PLATEAU, not a proof.** `HOST_LISTING_TITLE` has about one
  character of margin below and two above. A change to the type scale, to the meta column's width or to
  the `·` separator could move the plateau out from under it. That surfaces as the wrap-count clause going
  red — the intended behaviour — but on this file's next run, not at the moment of the change.
- **The five window spellings are a sample.** They cover both digit-length classes on both bounds, which is
  the property that drives the wrap, but they are not all 288 possible hour pairs.
- **The derived over-run can no longer catch a change that adds a wrapped meta line to the pending row and
  nothing else** — it would read that as the calendar. It still catches every change to the actions row,
  which is what that clause is about, at ±4px rather than ±20.

#### One thing observed and NOT fixed (out of scope)

On the first run after a source edit, `D-57 · court` failed once with *"the resolved document still shows
the skeleton"* — a 15s `toHaveCount(0)` timeout on `/` while four workers competed with a cold Next
compile (20.6s for the court case against 11s for its grove twin). It passed on every subsequent run
(three consecutive full-file runs, 14/14). Nothing in this change touches `/`, `RESULT_GRID_GAP` or the
D-57 block; the file is `fullyParallel` and this change added a fourteenth test, so the contention window
is marginally wider than it was. **Owner:** whichever plan next opens the D-57 block — the honest fix is
a warm-up navigation for `/` in that block, the same one the host block already carries and for the same
measured reason.

---

## `[14-REVIEW WR-03]` `e2e/host-headings.spec.ts` still says nothing about `<h2>` and below, and that blindness is what let the outline flatten unobserved

**Found during:** the WR-03 fix (code review, 24 August 2026).
**Owner:** **Phase 17** — it owns the full axe pass, and a skipped-level rule is an axe rule
(`heading-order`) rather than a bespoke assertion somebody should hand-roll here.

The spec documents its own blind spot at line 93, in as many words:

> IT SAYS NOTHING ABOUT `<h2>` AND BELOW. A surface whose sections skip from level one to level three
> has a broken outline and passes this file completely.

That note was accurate when written and is still accurate. It is also the reason nothing caught 14-12
and 14-13 promoting two `<h3>`-level advisories to `<h2>` on `/host/listings/{id}/availability`: the
file measures the level-ONE heading on 28 states and compares their computed sizes, and every one of
those assertions stayed green while the route's outline became three peers where one is the parent of
the other two.

**What WR-03 did instead, and why it is not a substitute.** Four cases were added to
`tests/availability/week-strip.test.tsx` (7–10) that render `WeeklyHoursEditor` INSIDE the section
heading the route actually gives it and assert the property — the editor contributes no sibling `<h2>`,
and both of its panels are real level-three headings. Observed red against the pre-fix call sites: 3
failed / 7 passed. That covers the two panels this finding is about and any future panel added to that
editor, and it costs no browser.

**What it cannot cover, and why the e2e file is still the right owner:**

- It mounts the editor, not the ROUTE. The page's own two `<section>`s, `BlocksEditor` and the lock
  notice are not in the tree, so "the availability page's outline is well-formed" is asserted only as
  far as one component contributes to it.
- It is one route. The other four Phase-14 surfaces have the same exposure and nothing reads them.
- A skipped level (`h1` → `h3`) is invisible to it entirely: a section that never renders an `<h2>` at
  all passes case 7 trivially.

**Why it was not closed here.** The honest fix is a per-state outline walk — collect every heading on
the resolved document in document order and assert no level is skipped — across all 28 states the file
already visits. That is a real addition to a spec that SEEDS A DATABASE and must be run alone, on a
route table this change has no other business touching, and it belongs beside the axe pass rather than
in front of it. Doing it half-way (one route, one state) would produce a green that reads like coverage
and is not.

**What Phase 17 should do:** add the outline walk to the existing per-state loop rather than a second
file — the states, the tells and the seeding are already there — and watch it red against a deliberately
skipped level, not merely against a duplicated one. ⚠ Run it ALONE
(`npx playwright test e2e/host-headings.spec.ts --project=chromium`), and note
`e2e/availability.spec.ts:261` remains the pre-existing standing red.

---

## [260824-dbc] `e2e/availability.spec.ts` has THREE more standing reds than the one that was declared

**Found in passing** while verifying quick task `260824-dbc`. Out of scope for it, not acted on, and
recorded here rather than fixed.

The phase has been carrying `e2e/availability.spec.ts:261` as "the pre-existing standing red". Run alone
on 2026-08-24 (`npx playwright test e2e/availability.spec.ts --project=chromium`), the file reports
**four** failures, not one:

| Line | Case |
|------|------|
| 160 | bookable listing: venue-tz note, unselectable booked/blocked hours, adjacent range fill + full-day clear |
| 203 | range-fill: non-adjacent clean fill selects the whole run, then a 3rd click re-anchors |
| 236 | range-fill: a gap truncates the run to before the booked hour with a soft hint |
| 261 | published-but-not-payable listing: calendar renders read-only *(the declared one)* |

**They are not caused by this quick task, and that was checked rather than assumed.** The only source
file it touches is `src/components/availability/weekly-hours-editor.tsx` — the HOST editor, which none
of these booker-side cases mount. Backing that one file out to its pre-task content and re-running the
spec reproduced **the same three** (160, 203, 236) — so they predate the task. Note that 261, the
declared one, PASSED in that same run: the set is not stable run to run, which is its own signal.

**The first symptom**, for whoever picks it up: `/listings/[id]` renders no heading matching
`/availability/i` at `availability.spec.ts:268`, followed by click timeouts in the two range-fill cases.
The spec seeds its own fixture in `beforeAll`, so this is not a missing dev seed.

**Why it was not fixed here.** Three failing booker-calendar cases on a route this task never opened is
a debugging job with its own reproduction, not a deviation to auto-fix inside a two-finding quick task.

**What the next reader should do:** stop quoting "`:261` is the standing red" as if it were the whole
picture — it is one of four, and the count is what makes the file untrustworthy as a gate today.

---

## [260824-ej2] F-2's residue: the DECLINE control is still half past the clip edge on `/host/bookings`

**Found while verifying the F-2 ruling**, measured rather than noticed, and deliberately not fixed.

The PM's *"show the timezone only when it varies"* ruling removed 119px from the **When** column and
that is enough to bring **Approve** wholly inside its container with 50px to spare — F-2 as filed is
fixed. It is not enough to stop the table overflowing. Measured at 1280px against the seeded
catalogue's own five titles and cities:

| | `clientWidth` | `scrollWidth` | overflow | Approve past the edge | Decline past the edge |
|---|---|---|---|---|---|
| Before | 864 | 1033 | 169px | 69 of its 90px | **161px — wholly past it** |
| After | 864 | 915 | **51px** | none — 50px clear | **43 of its 85px** |

**What the residue is.** `260824-dbc`'s diagnosis named TWO cells that hold a sentence rather than a
token: the venue-local window label and the **space title**. The ruling addressed the first. The Space
column is unchanged at 234px, and 51px of it is what still runs past the clip edge — with the Decline
button sitting in it.

**Why it is not fixed here.** The only remaining levers are the ones `260824-dbc` escalated and the PM
did not rule on: let the Space cell wrap (which turns every desktop row into two lines and moves
`HOST_BOOKING_ROW_HEIGHT`'s desktop value), widen the container (which means moving `HOST_LIST_SHELL`,
which the frozen `/host/earnings` also reads), or a sticky actions column (which touches the elevation
inventory `tests/design/elevation-z.test.ts:306` pins this route on). Each is a product/measurement
decision of the same size as the one just made, and none of them is what was ruled on.

**What the next reader should know:** the shorter label removed 119 of the 169 overflowed pixels, the
primary action is whole, and the destructive one is not. That is a better place to stand than before
and it is not "no overflow".

---

## [260824-ej2] The dev server leaks Postgres connections until every host route renders an empty list

**Found in passing** while running the Playwright gates for `260824-ej2`. Not caused by it, not fixed
by it, and it is the most expensive false signal in this repository right now — it looks exactly like a
product defect on whichever surface happens to be measured when the ceiling is hit.

**The symptom, in the order it appears.** After a few source edits and a handful of spec runs against
the same `next dev` process, seeded routes start rendering **no rows** — the list's empty state or a
plate that never resolves — while the fixture rows are demonstrably in the database. Observed on three
different specs in one session:

| Spec | Case | What it printed |
|------|------|-----------------|
| `e2e/skeleton-geometry.spec.ts` | D-57 grid gutter, 768px | *"the resolved document still shows the skeleton"* — on `court` in one run and `grove` in the next |
| `e2e/host-headings.spec.ts` | `bookings · upcoming · rows` | *"the route rendered no `[data-testid="row-card"]`"*, `120 × locator resolved to 0 elements` |
| `e2e/host-headings.spec.ts` | `dashboard · today's sessions` | the same shape, one case earlier, on the very next run |

**The cause is not the spec.** `docker exec fitout-db-1 psql …` refuses with
`FATAL: sorry, too many clients already` at the same moment — the ceiling is reached by the DEV SERVER,
not by the specs' own `postgres({ max: 1 })` clients. The likely mechanism is the module-level pool in
`src/lib/db/index.ts`: every HMR recompile that touches its module graph mints a NEW pool and the old
one is never ended, so connection count climbs with the number of edits, not the number of runs.
Measured: 19 connections immediately after a container restart, 27 after one spec file.

**The tell that it is this and not a defect:** the failure MOVES between runs — a different theme, a
different case, a different spec — and the same file passes when a single case is run alone. A
deterministic product defect does not relocate.

**The workaround that was used, and it is a workaround:** `docker restart fitout-db-1`, wait for the
socket, warm the routes with `curl`, then run the gate WITHOUT editing source in between. Every gate in
this task went green on that recipe — `skeleton-geometry` 15/15, `host-headings` 14/14,
`host-dashboard` 7/7 — after failing intermittently before it.

**What the next reader should do:** treat a "no rows on a seeded route" failure as this until proven
otherwise, and if it is worth fixing at source, the fix is to make the `db` singleton survive HMR
(`globalThis` caching, the standard Next dev idiom) rather than to raise `max_connections`.
