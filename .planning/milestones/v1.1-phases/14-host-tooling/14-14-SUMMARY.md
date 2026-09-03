---
phase: 14-host-tooling
plan: 14
subsystem: ui
tags: [a11y, aria-live, design-system, inventory, typescript, vitest, ast-scan, host-surfaces]

# Dependency graph
requires:
  - phase: 12-booker-path-quality
    provides: "`src/lib/design/live-regions.ts` itself — the declared set, the seven numbered rules, the kind→naming mapping table and the type-level file-count assertion whose NAME carries the number; plus `tests/design/live-regions.test.tsx`'s three scans, its ordinal keying and its guard-the-guard-first discipline"
  - phase: 13-confirmation-bookings-trust
    provides: "plan 13-14's discharge of ten exclusions (the worked example this plan copied), `AUTHOR_NAMED_REGIONS` as a closed set with a mandatory `why`, and `share-link-box.tsx:109-171`'s label-is-not-the-sentence rule"
  - phase: 14-host-tooling
    provides: "14-03's `request-action-refusal` region, 14-11's always-mounted `wizard-save-state` region, 14-12's zero-region week strip, and 14-13's untouched `blocks-editor.tsx` validation message — the four regions this plan had to declare or pin"
provides:
  - "`LIVE_REGION_EXCLUSIONS` at **ZERO**, with the last exclusion genuinely discharged rather than deleted — the file it named was rewritten in this plan's first commit"
  - "`LIVE_REGION_FILES` / `LiveRegionFile` — the declared set renamed off the booker path and widened to 21 files, with `DeclaredFileCountIsTwentyOne` and the test's second pin moved in the same commit"
  - "Four new `LIVE_REGIONS` rows and four new `AUTHOR_NAMED_REGIONS` rows (5 → 9), with the retired 'all of them are wrappers' reading replaced by an honest two-case split"
  - "`exclusionReasonIsThin` + `MIN_EXCLUSION_REASON_CHARS` — the exclusion-reason rule exported as a predicate so the gate exercises it against a fixture instead of restating it as a regex"
  - "SCAN 4 — a Phase-14 surface set DERIVED from the import tree rather than declared, closing the hole that let 14-03 and 14-11 both ship undeclared host regions with the whole suite green"
affects: [14-15, 14-16, 15, 16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A guard that becomes unsatisfiable when the code is right is REWRITTEN, never deleted — and the replacement keeps the property the old one protected, exercised against a fixture rather than against a list that no longer has members"
    - "A rule the gate applies is EXPORTED as a predicate from the module it belongs to, so the fixture and any future real row are judged by one implementation instead of two spellings"
    - "A declared set and a DERIVED set audit different failures: the declared set makes joining it deliberate; the derived set makes escaping it impossible. Both, not one"
    - "An implicitly-assertive role is pinned as a measured per-file map, not scanned to zero — a zero-count scan over a tree that interrupts twice reads exactly like a tree that does not"
    - "When a docblock's one-line summary stops being true of the rows beneath it, the summary is RETIRED and the rows are split by case — stretching it is how an exception widens for the next reader"

key-files:
  created: []
  modified:
    - src/components/listing/address-autocomplete.tsx
    - src/components/listing/photo-uploader.tsx
    - src/lib/design/live-regions.ts
    - tests/design/live-regions.test.tsx

key-decisions:
  - "`photo-uploader.tsx`'s unnamed region was FIXED, not excluded — an exclusion naming Phase 16 would have traded one row for another and left the list at one, which is the fork 14-RESEARCH Open Question 6 named and the orchestrator settled"
  - "The declared file count is **21**, not the UI-SPEC's predicted 20. The document budgeted three additions; the photo uploader is the fourth, and it is there because fixing it is what lets the exclusion list reach zero"
  - "The rewritten guard asserts the list is EMPTY and runs the reason-shape rule against a three-row local fixture (one passing, one too-short, one unowned), all through `exclusionReasonIsThin` — the real list goes through the same predicate so the fixture is not a second code path"
  - "The old guard's `/Phase\\s+1[34]/` was widened to `/Phase\\s+\\d+/` rather than carried forward: a pattern scoped to two dead phases can only be satisfied by editing it, and an edit made by the person who has to pass it is not a check"
  - "`AUTHOR_NAMED_REGIONS`'s 'every one of these is a WRAPPER' summary was RETIRED. `role=\"status\"` is nameFrom:author whether the text is composed by a child or written into the element, so the wrapper shape decided nothing — it was what Phase 13 happened to ship. The nine rows now split into (a) nothing to be named by, seven rows, and (b) text of its own, named anyway with the cost stated, two rows"
  - "The two implicitly-assertive validation messages are PINNED, not converted. Changing a validation message's role is an accessibility behaviour change with no decision behind it; making them visible to the gate is the defensible act (14-RESEARCH Assumption A6, taken deliberately)"
  - "SCAN 4's surface set is DERIVED by walking `@/` imports from the five surfaces, keeping only the four owned trees. `src/components/booking/**`, `patterns/**` and `ui/**` are reached and dropped — each is audited elsewhere and named where it is dropped, so nothing is unaudited"
  - "SCAN 4's naming rule is scoped to the Phase-14 surfaces ON PURPOSE and says so in its own comment: on the booker path the opposite rule holds, and widening this assertion would force labels onto seven content-named regions the inventory exists to protect"

patterns-established:
  - "Rewrite-don't-delete: a landmine assertion is replaced in the same commit that makes it false, and the replacement is watched failing in BOTH the directions it now covers"
  - "Derived-set auditing: an import-closure walk from named surface roots, with the reach pinned as a number so a change in coverage is visible even when it brings no new finding"
  - "Two-case inventory rows: when additions do not fit an inventory's stated reason, the reason is split and each row declares which case it is — rather than one case being stretched to cover both"

requirements-completed: []
requirements-advanced: [HFLOW-01, HFLOW-02]

# Metrics
duration: 35min
completed: 2026-08-23
---

# Phase 14 Plan 14: The Inventory Reaches Zero Summary

**The live-region exclusion list is empty for the first time since it was written — the last excluded
file was rewritten rather than re-reasoned — and the committed assertion that the list must be NON-empty
was rewritten in the same commit into one that still guards, watched failing in both directions before
it was trusted.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-23T22:13Z (baseline `tsc` + design suite 22:13)
- **Completed:** 2026-08-23T22:38Z
- **Tasks:** 3 (3 commits — zero auto-fixes, zero deviations)
- **Files modified:** 4 — 925 insertions, 147 deletions

## Accomplishments

### The exclusion list is ZERO, and the discharge is real

`LIVE_REGION_EXCLUSIONS` held one row whose own `why` named this phase as its owner: auditing the host
wizard early would have frozen markup the phase was about to rewrite. That markup is rewritten, so the
reason expired.

`address-autocomplete.tsx` shipped **one bare polite element with no role and no accessible name whose
first-paint content was a static hint** — a region announcing nothing useful on arrival and then a hint
nobody asked for. That is the same defect the calendar's busy plate and six Phase-13 page-wrappers were
corrected for, arriving a third time. The hint is now a plain paragraph outside any region, read in
document order; **one named region holds only the resolved outcome**, located or failed, because those
are the two outcomes of one lookup and two regions for one outcome is the defect.

### The list reaches zero rather than trading one row for another

`photo-uploader.tsx:226`'s unnamed status region was the fork 14-RESEARCH Open Question 6 named: fix it,
or exclude it to Phase 16 and leave the list at one. **It was fixed — one attribute plus a hoisted name
constant and its docblock, and nothing else in that file moved.**

### The set is renamed, and the rename is complete rather than aliased

`BOOKER_PATH_LIVE_REGION_FILES` → **`LIVE_REGION_FILES`**; `BookerPathLiveRegionFile` →
**`LiveRegionFile`**. A closed union containing four host files cannot keep a name asserting it contains
none — a name is a claim in a type position, and this module's whole design is that its claims are
compile-checked. `grep -rn 'BOOKER_PATH_LIVE_REGION_FILES' src/ tests/` returns **zero hits**, including
the two historical prose mentions inside the module's own OBSERVED RED transcripts.

### The number is 21, in all four places

| Where | Value |
|---|---|
| `LIVE_REGION_FILES` length (counted off the tuple) | **21** |
| `DeclaredFileCountIsTwentyOne` — the alias NAME | **TwentyOne** |
| the count it extends | **21** |
| `DECLARED_FILE_COUNT` in `live-regions.test.tsx` | **21** |

**14-UI-SPEC predicted twenty and three additions; the measured answer is twenty-one and four.** The
fourth is `photo-uploader.tsx`. The document was one short, and the number was read off the tree rather
than off the document — the same discipline 13-14 recorded for the same reason.

### The landmine: the guard was rewritten, not deleted

`live-regions.test.tsx:491` asserted `LIVE_REGION_EXCLUSIONS.length` was **greater than zero**. That was
a *vacuity guard*: the `why`-shape filter beneath it is an ABSENCE assertion, so over an empty list it
collects nothing and passes, and "every reason is good" would be indistinguishable from "there are no
reasons". 14-UI-SPEC falsifiable #1 requires the length to **equal zero**. Both cannot hold.

The replacement, in the same commit:

1. asserts `LIVE_REGION_EXCLUSIONS` **is empty** — with a message that tells a future author who
   re-adds a row to restore the pre-14-14 shape so the vacuity guard comes back with the rows;
2. keeps the reason-shape rule **exercised against a three-row local fixture** — one that must pass, one
   that is a 34-character TAG, one that names no owning phase;
3. runs the **real list through the same predicate**, so the fixture is not a second code path;
4. and the rule itself is now `exclusionReasonIsThin`, **exported from `live-regions.ts`** so there is
   one implementation rather than a regex restated in the gate.

The old `/Phase\s+1[34]/` was **widened to `/Phase\s+\d+/`, not carried forward**. Scoped to two dead
phases it could only ever be satisfied by editing it — and an edit made by the person who has to pass it
has stopped being a check.

### SCAN 4 — the hole the declared set has by construction

The declared set makes *joining* deliberate. It cannot make *escaping* impossible: a `role="status"`
added to a host file that is not a member costs nothing and shows up nowhere. **That happened twice in
this phase** — 14-03's request-row refusal and 14-11's wizard save state both shipped with the whole
827-test design suite green, and 14-11's summary says so in as many words.

SCAN 4 audits a set **derived from the tree**: it starts at the five surfaces 14-UI-SPEC names, walks
their `@/` imports transitively, and keeps whatever lands inside the four trees this phase owns —
**18 files, measured and pinned**. A host component added to any of the five is in scope the moment it is
imported, with no inventory edit. What the walk reaches and deliberately drops (`booking/**`,
`patterns/**`, `ui/**`) is named at the point of dropping, with the gate that owns each.

## Task Commits

1. **Task 1: the address hint leaves the region, and both listing regions are named** — `2de66a5` (fix)
2. **Task 2: the inventory reaches zero exclusions, and the guard that could not survive that is rewritten** — `b508e7e` (refactor)
3. **Task 3: every region on the five host surfaces is named, declared or pinned** — `4db3cbe` (test)

## Files Created/Modified

- **`src/components/listing/address-autocomplete.tsx`** — `+80/-14`. A header section recording the
  discharge and the naming discipline it inherits; `LOOKUP_REGION_NAME` (`"Address lookup"`) with the
  share-link docblock's argument; the static hint as a plain `<p>` at the label role, rendered only while
  nothing has resolved; ONE `role="status"` region, always mounted and empty until a lookup resolves,
  carrying the located sentence or the failure sentence. The failure branch's pre-existing alarm ink is
  kept, unchanged and explicitly so.
- **`src/components/listing/photo-uploader.tsx`** — `+25/-1`. `PHOTO_REQUIREMENT_REGION_NAME`
  (`"Photo requirement"`) with its docblock, and **one attribute** on the existing region. Nothing else
  in the file moved.
- **`src/lib/design/live-regions.ts`** — `+~390/-~85`, now 1,447 lines. The rename and its two prose
  mentions; four files added to the set; `MIN_EXCLUSION_REASON_CHARS` and `exclusionReasonIsThin`; the
  exclusion list emptied and its arithmetic paragraph rewritten from fresh measurements; four
  `LIVE_REGION_IDS` and four `LIVE_REGIONS` rows; four `AUTHOR_NAMED_REGIONS` rows with the docblock's
  wrapper claim retired and replaced by the two-case split; `DeclaredFileCountIsTwentyOne`; and three
  rewritten header/footer sections (THE RENAME, the empty-list caveat, the NOT COVERED bullets).
- **`tests/design/live-regions.test.tsx`** — `+~430/-~40`, now 1,300 lines. The import rename;
  `DECLARED_FILE_COUNT = 21`; the rewritten exclusion guard; SCAN 4 in full (the closure walk, the pinned
  reach, the alert-role map, four assertions and their guard-the-guard); and four header updates
  recording probes (e) through (h).

## Verification

| Check | Result |
|---|---|
| `npm run test:design` (baseline, before any edit) | 49 files / **827 passed** / 3 skipped / **0 failed** |
| `npx tsc --noEmit` (baseline) | exit **0** |
| `npm run test:design` (final) | 49 files / **832 passed** / 3 skipped / **0 failed** |
| `npm run test:design -- live-regions` (final) | **26 passed** (21 before — five new cases) |
| `npx tsc --noEmit` (final) | exit **0** |
| `npx vitest run tests/listing tests/host tests/availability` | 43 files / **465 passed**, zero failures |
| `npx vitest run tests/listing` (after Task 1) | 18 files / **185 passed** |
| `npm run test:design -- leak contrast` (after Task 1) | 2 files / **114 passed** — no comment quotes a banned spelling |
| `grep -rn 'BOOKER_PATH_LIVE_REGION_FILES' src/ tests/` | **zero hits** |
| `grep -rn 'BookerPathLiveRegionFile\|DeclaredFileCountIsSeventeen' src/ tests/` | **zero hits** |
| `grep -n 'toBeGreaterThan(0)' tests/design/live-regions.test.tsx` — for the exclusion list | **zero live assertions** (one hit remains, inside the comment that quotes the retired line — see Deviations) |
| `grep -c 'aria-live' src/components/listing/address-autocomplete.tsx` | **1** — one region, and no prose mentions the attribute |
| `grep -c 'role="status"' …/address-autocomplete.tsx` · `…/photo-uploader.tsx` | **1** and **1**, each carrying an author label |
| `git diff --stat src/components/listing/photo-uploader.tsx` | `+25/-1` — one element's attributes, plus the constant and its docblock |
| `grep -rn 'aria-live="assertive"' src/components/ src/app/`, comment lines dropped | **zero markup hits** |
| `grep -rn 'role="alert"' …/weekly-hours-editor.tsx …/blocks-editor.tsx` | **2** — one each, matching the pin |
| `git diff --stat drizzle/` | **empty** — zero migrations |
| `git diff --stat HEAD~3 HEAD -- package.json package-lock.json` | **empty** — no package installed |
| `git diff --stat HEAD~3 HEAD -- 'src/app/actions/'` | **empty** — server semantics untouched |
| `git diff --stat HEAD~3 HEAD -- 'src/components/host/payout*' 'src/app/(host)/host/earnings/'` | **empty** — the 14-01 earnings freeze respected |
| `git diff --diff-filter=D` per commit | **no deletions** in any of the three |

**No Playwright invocation was made** — this plan's `<verification>` says so explicitly.
`e2e/availability.spec.ts:261`, the pre-existing standing red, was neither touched nor claimed.

### The re-measured arithmetic, with the commands that produced it

Both counting methods were read **from scratch against the tree this plan produces**, not carried
forward — the paragraph they replace records its own predecessor having drifted, which is why neither
number is ever inherited.

**BY MARKUP — an AST walk of every `.tsx` under `src/`, counting `aria-live` on elements:**

```
node <scratch>/measure-live.mjs      # ts.createSourceFile per file, JsxAttribute name === "aria-live"

BY MARKUP (AST: aria-live on an element) — files: 7
    src/components/availability/slot-picker.tsx        x2
    src/components/availability/spots-left-chip.tsx    x1
    src/components/booking/hold-countdown.tsx          x2
    src/components/booking/request-countdown.tsx       x2
    src/components/group/rsvp-confirmation.tsx         x1
    src/components/group/rsvp-form.tsx                 x1
    src/components/listing/address-autocomplete.tsx    x1
total attribute occurrences: 10
```

**SEVEN files, TEN elements — and all seven are now declared.** That is what an empty exclusion list
means at this scale, and it is why the sentence the paragraph replaced ("the two lists PARTITION the
attribute exactly") no longer describes two lists. The element count is the honest one: two files carry
the attribute twice, because rule 3 gives each ticking value a silent `timer` **plus** a separate
`threshold` region.

**BY TEXT:**

```
grep -rl "aria-live" src/ --include=*.tsx      # 13 files
```

**THIRTEEN files — 19 at 12-13's measurement, 13 at 13-14's, 13 now.** The extra SIX are PROSE and the
composition is unchanged: five declared files explaining regions they hold under a *role* rather than the
attribute (`availability-calendar.tsx`, `date-pass-picker.tsx`, `collision-notice.tsx`,
`hold-expired-state.tsx`, `search-results.tsx`), and `invite-card.tsx`, which appears only on the
strength of the comment explaining why 13-08 REMOVED its region.

The declared **set** is twenty-one, larger than either count, because a `role` IS a live region without
the attribute — and **three of this plan's four additions are in that shape**, which is why widening the
set moved neither measured number.

### Every new gate has been observed failing

Four probes, all applied, run, recorded and reverted.

**(e) The fixture's reason blanked** — Task 2's acceptance criterion. `GOOD.why` set to `""`.
**1 failed / 20 passed:**

```
FAIL  … > declares ZERO exclusions — and the reason-shape rule that guarded them is still exercised

AssertionError: the reason-shape rule rejected a reason that names its owning phase AND is a
sentence. It is the only shape an exclusion is allowed to have, so a rule that rejects it rejects
everything and the list can never be re-opened.: expected true to be false
- false
+ true
```

**(f) An exclusion comes back** — one row re-added to `LIVE_REGION_EXCLUSIONS`. **1 failed / 20 passed:**

```
AssertionError: an exclusion is back. That is not forbidden — the mechanism exists precisely so a
file can be deliberately deferred WITH A REASON — but it is a decision, and this message is where it
gets announced. … If you are adding one: give it a sentence that names the owning phase, and move
this assertion to the shape it had before 14-14 (a floor plus the filter over the real list) so the
vacuity guard comes back with the rows.
+ [ { "file": "src/components/example/probe.tsx", "why": "Phase 99 owns it and will rewrite …" } ]
```

The two together are what makes the rewrite a guard rather than a formality: **(e)** proves the rule it
kept still bites, **(f)** proves the state it added still bites.

**(g) A named region loses its name** — Task 3's acceptance criterion. `aria-label` removed from the
photos-step region. **3 failed / 23 passed** — SCAN 3's hollow-row check, SCAN 3's recorded-string check
AND SCAN 4's naming assertion. SCAN 4's message, which names the file, the line, the tag and the fix:

```
FAIL  … > every status-role element on the five surfaces resolves to a NON-EMPTY accessible name

+ [ "src/components/listing/photo-uploader.tsx:246 — the <p> carrying role=\"status\" has NO
     aria-label. That role is nameFrom:author, so its accessible name is the empty string and the
     region is unreachable by name. Add a name from a hoisted constant, and a row in
     `AUTHOR_NAMED_REGIONS` saying why it needs one." ]
```

**(h) A new interrupting region ships** — `<p role="alert">Probe</p>` added to `host-signals.tsx`, a file
on a Phase-14 surface and deliberately NOT in the declared set. **1 failed / 25 passed**, and the diff is
the census itself:

```
FAIL  … > pins the implicitly-assertive alert role per file — TWO validation messages, no more

  [
    "src/components/availability/blocks-editor.tsx × 1",
    "src/components/availability/weekly-hours-editor.tsx × 1",
+   "src/components/host/host-signals.tsx × 1",
  ]
```

⚠ **What did NOT fire on (h): SCAN 1.** The banned politeness level is asserted at zero and stayed green,
because that role carries **no attribute to find**. That is the entire argument for pinning the role as a
map instead of scanning the attribute to zero — and it is measured here rather than asserted.

### The measured numbers this plan pins

| Pin | Measured value | Where |
|---|---|---|
| Declared file count | **21** | `LIVE_REGION_FILES`, the alias name, the count it extends, `DECLARED_FILE_COUNT` |
| Declared regions | **27** (23 + 4) | `LIVE_REGION_IDS` — deliberately not type-pinned; SCAN 2's set equality is stronger |
| `AUTHOR_NAMED_REGIONS` | **9** (5 + 4) | seven "nothing to be named by", two "text of its own, cost stated" |
| Exclusions | **0** | `LIVE_REGION_EXCLUSIONS` |
| Phase-14 derived closure | **18 files** | `PHASE_14_SURFACE_FILE_COUNT` |
| Alert-role occurrences on those surfaces | **2**, one per file | `PHASE_14_ALERT_ROLE_SITES` + a separate total assertion |
| `threshold` regions | **2** (unmoved) | the pre-existing pin, untouched |
| `aria-live` by markup / by text | **7 files, 10 elements** / **13 files** | the module header's arithmetic |

## Decisions Made

**1. `photo-uploader.tsx` was fixed, and that decision is what the zero rests on.**
14-RESEARCH Open Question 6 stated the fork exactly: fix the `aria-label` here, or add an exclusion row
naming Phase 16 — *"but then the exclusion list does not reach zero and D-155's discretion item is not
discharged."* Fixing it cost one attribute. Excluding it would have cost a row, and the row would have
said "we discharged one exclusion by creating another".

**2. `AUTHOR_NAMED_REGIONS`'s "every one of these is a WRAPPER" summary was RETIRED rather than stretched
— and this is the decision to be most sceptical of, so it is argued in full.**

That sentence was true of the five Phase-13 rows and was read as the rule. **It was never the rule.**
`role="status"` is `nameFrom: author` in ARIA, so a region carrying it computes an accessible name of
`""` **whether its text is composed by a child or written into the element itself.** The wrapper shape
decided nothing about naming; it was what Phase 13 happened to ship.

This plan's four additions do not all fit it, and stretching the sentence to cover them would have
widened the exception silently — the exact failure the module is written against. So the rows split, and
each says in its first clause which case it is:

- **(a) Nothing to be named by — seven rows.** Either the role sits on a wrapper (the four Phase-13
  rows), or the element is **mounted at all times with its text EMPTY until an outcome lands**
  (`wizard-save-state`, `address-lookup-result`). The second is the wrapper argument arriving by a
  different route, and it is the argument 14-11's deferred entry had already worked out.
- **(b) Text of its own, named anyway, with the cost stated — two rows.**
  `request-action-refusal` and `photo-uploader-requirement`. 14-UI-SPEC falsifiable #2 requires every
  status region on these surfaces to resolve to a non-empty name, and the VoiceOver hazard is **real**
  for these two rather than absent. Each row states what the trade costs **and what bounds it**: the
  refusal stays rendered in the row until the host acts again, so a lost announcement costs a re-read
  rather than the fact; and the photo count is carried a second time and LIVE by the publish checklist's
  `"3+ photos"` row, driven by the same `photoCount` state on the same step.

**What did NOT change: the booker path.** Its content-named regions — `collision-notice`,
`book-cta-notice`, `reserve-actions-notice`, `search-relax-band`, `spots-left-chip`, both `slot-picker`
hints — carry no label, must not gain one, and SCAN 3 still fails if one acquires an undeclared name.
SCAN 4's naming rule is scoped to the Phase-14 surfaces on purpose and says so in its own comment.

**3. The two implicitly-assertive validation messages are pinned, not converted.**
14-RESEARCH Assumption A6 left this to the plan. `role="alert"` **is** the interrupting politeness level
with a different spelling, and both occurrences are native form-field validation messages — user-initiated,
about the field the host is standing in, never fired on page load. That is the one canonical use. Changing
a validation message's role is an accessibility *behaviour* change and there is no decision behind one; the
defensible act is to make them **visible** to the gate rather than invisible to it. Probe (h) is what
proves the pin bites.

**4. The alert map is keyed by FILE and COUNT, not by line.**
The plan cites `weekly-hours-editor.tsx:276` and `blocks-editor.tsx:319`; the elements now sit at **:303**
and **:367**, moved by 14-12 and 14-13 without either element being touched. A line-number pin would have
gone red on a reformat and green on a third region added elsewhere in the file. Measured fresh, pinned by
what is stable.

**5. SCAN 4 derives its set rather than declaring one — and both mechanisms are kept.**
A second declared list would have re-created the problem it is written to solve. The closure walk is
pinned at 18 files so a change in *reach* is visible even when it brings no finding, and the message says
in as many words that moving the number is expected and cheap — the point is that the file gets named in
the diff. What the walk drops is named at the point of dropping, with the gate that owns it, so nothing
reads as unaudited.

**6. The address region keeps its redundant politeness attribute.**
`role="status"` is already implicitly polite, so the attribute changes nothing — and `slot-picker-gap-hint`
records the standing rule that rewriting shipped, correct markup to remove a harmless attribute costs a
review and buys nothing. Keeping it also leaves the module header's by-markup file count at seven, which
is what was measured.

**7. The static hint renders only while nothing has resolved.**
14-UI-SPEC says the hint is *"present from first paint"*, which it is. Rendering it unconditionally would
have put *"Pick a suggestion so we can place you on the map."* on screen beside *"Location set."* — two
contradictory lines where the shipped file had one. Its appearance and disappearance announce nothing,
because it is neither a region nor inside one.

## Deviations from Plan

**None.** No auto-fix was needed — no Rule 1, 2, 3 or 4 applied, and no architectural question arose.
Zero scope absorbed: no package installed, no migration, no server file opened, no payout or earnings
file opened, no Playwright invocation, no component outside the two the plan names.

Three things are worth flagging as *reported* rather than deviated, because a reader checking the
acceptance criteria by grep will see them:

**1. `grep -n 'toBeGreaterThan(0)' tests/design/live-regions.test.tsx` returns ONE hit, and it is a
comment.** Line 509 quotes the retired assertion verbatim inside the block explaining why it was
rewritten — which is what the plan's own instruction asked for (*"Say all of that in the test's own
comment: this file's culture is that a gate explains itself"*). **There is no live `toBeGreaterThan(0)`
assertion about the exclusion list.** Two other `toBeGreaterThan(0)` calls exist in SCAN 4, and both are
guard-the-guard floors about the closure, not about exclusions.

**2. `grep -rn 'aria-live="assertive"' src/components/` returns ONE hit, and it is pre-existing prose.**
`collision-notice.tsx:125`, last touched by plan 12-13 (`61cd2f6`, 19 Aug), in a comment explaining that
moving focus is what *replaces* the banned value. Comment lines dropped, the markup count is **zero**.
Neither the file nor the line was opened by this plan.

**3. The declared file count is 21, where 14-UI-SPEC and 14-RESEARCH § G9 both predict 20.** The
difference is `photo-uploader.tsx`, which those documents treat as a naming fix without an inventory row.
It needs a row: once its region carries a name and its file is scanned, SCAN 2 reports it
present-but-undeclared and SCAN 3 reports an undeclared author name. Recorded in the alias's own docblock
so the next reader meets the correction where the number is.

## Threat Register Disposition

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-14-14-SILENTREGION | **mitigated** | All four status regions on the Phase-14 surfaces carry an author name from a hoisted constant, each resolved back to a string by the gate and checked against `AUTHOR_NAMED_REGIONS`'s recorded value. Probe (g) observed red across three independent assertions, with the file, line, tag and fix in the message |
| T-14-14-NOISE | **mitigated** | The static hint is a plain `<p>` outside any region; the region is empty until a lookup resolves, so it announces once per lookup rather than on arrival. Asserted structurally by `grep -c 'aria-live'` → 1 and by SCAN 2 keying one region in the file |
| T-14-14-ASSERTIVE | **mitigated** | Zero markup occurrences of the banned value, asserted from BOTH sides on the Phase-14 surfaces (comment-stripped text scan + collected regions, catching a computed ternary). The implicitly-assertive role is a pinned two-file map with its reason and a separate total; probe (h) observed red, and SCAN 1 observed staying green over the same regression — which is the measurement that justifies the map |
| T-14-14-GUTTEDGUARD | **mitigated** | The guard asserts the empty state AND runs `exclusionReasonIsThin` against a three-row fixture (passing / too-short / unowned), with the real list through the same predicate. Observed failing on a blanked reason (e) and on a returned row (f) |
| T-14-14-STALECOUNT | **mitigated** | Both counting methods re-measured from scratch with the commands recorded above; neither number carried forward. The arithmetic paragraph was rewritten, including retiring the "two lists partition the attribute" sentence, which an empty exclusion list makes meaningless |
| T-14-14-RENAMEHALF | **mitigated** | `grep -rn 'BOOKER_PATH_LIVE_REGION_FILES\|BookerPathLiveRegionFile\|DeclaredFileCountIsSeventeen' src/ tests/` → **zero**, including the two historical prose mentions. The alias name, the extended count, the tuple length and the test's pin are all **21** |
| T-14-14-SC | **mitigated** | **No package installed.** `git diff --stat HEAD~3 HEAD -- package.json package-lock.json` empty. `dom-accessibility-api` was NOT imported — the naming checks read the source-resolved literal, and the render half reaches the library through `@testing-library`'s `{ name }` option, this repository's stated rule |

No new threat surface: no network endpoint, no auth path, no file access pattern, no schema change. No
`## Threat Flags` section is owed.

## Known Stubs

None. Every value this plan renders comes from real state:

- the address region's two branches are the geocoder's outcome and the component's own `error` state —
  there is no placeholder sentence in the file;
- the photo-uploader region renders a live count derived from the photo array;
- every inventory row's `announces` quotes a sentence a component actually renders, and SCAN 2 fails if
  the region it names is absent.

## Issues Encountered

**The plan's line-number citations for the two alert regions were both stale, and only measuring settled
it.** The plan names `weekly-hours-editor.tsx:276` and `blocks-editor.tsx:319`; the elements are at
`:303` and `:367`. Both moved when 14-12 mounted the week strip and 14-13 did the availability route's
design pass — neither touched the elements themselves. Pinning by file and count rather than by line is
the fix, and it is a stricter pin in the direction that matters: a third region anywhere in either file
fails.

**The plan's `grep -c 'aria-live'` criterion and the module's own naming table pull in opposite
directions, and the naming discipline resolved it.** The criterion counts a *text* occurrence; the module
permits a status region to carry the attribute or not. Keeping the attribute makes the criterion literally
true at 1 — but only because **no comment in that file quotes the attribute's spelling**, which is the
S8 discipline this phase inherited. The same applies to `role="status"`: both files' docblocks describe
"the status role" without ever writing the literal, so both greps return exactly 1.

**SCAN 4 was green on its first run, which is the state to distrust.** Its guard-the-guard exists for
that: it asserts the five roots resolve, that the closure is the measured 18 files, that the walk
resolved at least one import *outside* the owned trees (proving it followed imports rather than stopping
at the roots), and that the scan found regions at all. Probes (g) and (h) then drove two of the four
assertions red before either was trusted.

## User Setup Required

None — no external service configuration, no environment variable, no package install.

## Next Phase Readiness

**Ready.** What downstream plans inherit:

- **The exclusion list is empty, and empty is a state to be DEFENDED, not a finished job.** Both the
  module header and the test's NOT COVERED footer now say so explicitly. A plan that needs to defer a
  file adds a row with a sentence naming its owning phase — and must also restore the pre-14-14 guard
  shape (a non-empty floor plus the filter over the real list), which the failure message tells it to do
  in as many words.
- **A new live region on a Phase-14 host surface now fails in TWO places**, and they catch different
  things. SCAN 2 fails if the file is in the declared set and the region has no row; SCAN 4 fails if the
  region is a status without a name, an alert that is not one of the two pinned, or anything at all on
  the week strip — **whether or not the file is declared.**
- **Adding a component to any of the five surfaces moves `PHASE_14_SURFACE_FILE_COUNT`.** That is
  expected and the message says so; move the number in the same commit so the new file is named in the
  diff.
- **`src/components/host/payout-*.tsx` and `/host/earnings` were never opened.** `payout-banner.tsx` is
  inside SCAN 4's derived closure (reached from the dashboard) and is READ by the gate, which is how the
  gate knows it carries no live region — but no byte of it changed.

**Three standing cautions, re-confirmed here and unchanged:**
1. `tests/design/type-scale.test.ts:534` still pins `payout-summary.tsx` at 2 display-role headings.
   Not touched, not to be "fixed".
2. `e2e/availability.spec.ts:261` is still the pre-existing standing red. Not caused here, not claimed.
3. The two availability validation messages keep `role="alert"`. Converting them is an accessibility
   behaviour change and needs a decision, not a sweep — and the pin will make any such sweep visible.

---
*Phase: 14-host-tooling*
*Completed: 2026-08-23*

## Self-Check: PASSED

All four claimed files exist on disk and all three claimed commits (`2de66a5`, `b508e7e`, `4db3cbe`)
resolve in `git log`. No missing items.
