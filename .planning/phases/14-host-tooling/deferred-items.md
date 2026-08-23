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
