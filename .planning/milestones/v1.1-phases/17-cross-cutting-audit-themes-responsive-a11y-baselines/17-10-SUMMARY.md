---
phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
plan: 10
subsystem: testing
tags: [playwright, accessibility, heading-order, wcag, e2e, aria, outline]

requires:
  - phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
    provides: "17-07's measurement that `heading-order` both PASSES and FIRES on this app once explicitly enabled — so this walk adds depth to a live rule on a route set the axe table does not carry, rather than being the app's only heading coverage"
  - phase: 14-host-tooling
    provides: "e2e/host-headings.spec.ts — the 28-state × 3-width loop, its seeding, its tells, its 60s TELL_TIMEOUT_MS and its serial-mode configuration; and `[14-REVIEW WR-03]`, the finding this closes"
provides:
  - "The heading-outline walk: 84 walks (28 host states × 3 widths) asserting no level is SKIPPED, inside the existing per-state loop"
  - "A measured baseline of every host state's outline — five distinct shapes, recorded in the file"
  - "The measured proof that the accessibility-tree read is load-bearing on THIS app: the wizard's `h2 \"Ready to publish?\"` exists at 1280 and not at 320/768"
  - "[14-REVIEW WR-03] annotated CLOSED in Phase 14's own ledger, measurement kept verbatim, with a correction to its 'this is just an axe rule' framing"
  - "A measured correction to this plan's own `querySelectorAll` acceptance criterion"
affects: [17-11, 17-12, 17-13, 17-14]

tech-stack:
  added: []
  patterns:
    - "Document order from the accessibility tree in one round trip: six per-level `getByRole` queries merged with `compareDocumentPosition`, never a markup sweep"
    - "A red-watch whose recorded form argues the blast radius from the cases that PASSED, not only from the one that failed"
    - "Amend a superseded comment by quoting its wording and marking it, never by deleting it — especially when the comment IS the finding"

key-files:
  created: []
  modified:
    - e2e/host-headings.spec.ts
    - .planning/phases/14-host-tooling/deferred-items.md
    - .planning/phases/17-cross-cutting-audit-themes-responsive-a11y-baselines/deferred-items.md

key-decisions:
  - "Only TRANSITIONS are walked; the first heading's level is not asserted. Same semantics as axe's `heading-order`, and the level-one root claim is already made harder by the shipped `toHaveCount(1)` on all 28 states."
  - "The mutation is `<h2>Weekly hours</h2>` → `<h3>` on the availability route — the route [14-WR-03] is actually about — so the red-watch fires on the surface the finding names."
  - "The `querySelectorAll` prose at `recordHeading`'s docstring was KEPT and the acceptance criterion recorded as wrong, rather than reworded to make a grep return 0."
  - "The outline is recorded on every `Measurement` alongside the font-size read, so a future size red and a future outline red on one surface can be read as one finding."

patterns-established:
  - "Record the first run's full measurement set IN the file (all five distinct shapes, with counts), so a later red is read against a baseline instead of against an expectation"
  - "State the honest limits of a vacuity floor beside it: here, the site footer's two `h2`s clear a >0 floor on every surface, so the tell and the one-`h1` count are what prove the surface rendered"

requirements-completed: []

duration: 25 min
completed: 2026-08-29
---

# Phase 17 Plan 10: The Host Heading-Outline Walk Summary

**`recordHeading` now walks the whole accessibility-tree outline beside its font-size read, so all 28 host states at all three widths assert that no heading level is skipped — 84 walks, zero skips, watched red against an `h1` → `h3` on the exact route the finding was about, and `[14-REVIEW WR-03]` is closed in the file that recorded its own blindness.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-29T15:38:00Z
- **Completed:** 2026-08-29T16:03:14Z
- **Tasks:** 2
- **Files modified:** 3 (0 created, 3 modified) — **zero `src/` changes shipped**

## Task Commits

1. **Task 1: the outline walk joins `recordHeading`'s per-state, per-width loop** — `e2011f3` (test)
2. **Task 2: the red-watch against a SKIP, and `[14-WR-03]` closed** — `47c6e1b` (docs)

**Plan metadata:** the final `docs(17-10)` commit.

## What was built

**One new measurement inside an existing loop**, which is the contract 17-UI-SPEC § Typography clause 2 states and the reason Phase 14 left the finding open rather than doing it half-way. `ls e2e/ | grep -c heading` is still `1`.

`collectOutline(page)` asks `getByRole("heading", { level })` **once per level, 1 through 6**, and merges the six results into document order in a single round trip by sorting them with `compareDocumentPosition` — the tree's own answer to "which of these comes first", rather than a second reading of the markup that could disagree with the first. `findSkippedStep` then walks the levels: a step may stay, go back **up** by any amount, or go exactly one deeper. `h1` → `h3` is the failure.

Both clauses are inside `recordHeading`'s existing width loop, so the walk costs **84 measurements on 28 navigations** exactly as the font-size read does. The vacuity guard runs first, at a lower line number than the no-skip clause, because an **empty outline satisfies a no-skip predicate perfectly** — every one of its zero transitions is legal.

## The first run, and what the host routes actually look like

84 outlines, **zero skipped levels**, five distinct shapes. All five are recorded in the file:

| × | Shape |
|---|---|
| 41 | `h1 → h2 → h2` |
| 26 | `h1 → h2 → h2 → h2` |
| 11 | `h1 → h2 → h2 → h2 → h2` |
| 3 | `h1 → h2 → h3 → h3 → h2 → h3 → h2 → h2` — the availability route, all three widths |
| 3 | `h1 → h2 → h3 → h2 → h2 → h2` — `/host`, nothing-booked, all three widths |

The availability route reads, with text:
`h1 "Availability" → h2 "Weekly hours" → h3 "Set your weekly hours" → h3 "Your week at a glance" → h2 "Blocked dates" → h3 "No blocked dates" → h2 "Product" → h2 "Legal & support"`

That is **well-formed** — 14-13's fix holds, in the place nothing could previously see it.

### Three readings recorded so no later reader re-derives them

**1. The trailing `h2 "Product"` + `h2 "Legal & support"` in every outline is the SITE FOOTER.** So no state here can produce an outline shorter than three, and that is the honest limit of the vacuity guard: a floor of *"more than zero"* is cleared by the shell alone. What proves the **surface** rendered is `expectSurface`'s tell and the one-`h1` count, not this floor. Stated in the file rather than implied away by a green.

**2. Only 6 of the 84 outlines reach `h3` at all.** Seventy-eight bottom out at level two, and a document whose deepest level is two **cannot exhibit a `1 → 3` skip in the first place**. So the walk's discriminating power is concentrated on exactly the two states that nest — one of which is `/host/listings/{id}/availability`, the route the finding is about. That is not a weakness; it is the shape of these 28 states, and it is recorded so nobody reads 84 greens as 84 opportunities to fail.

**3. The accessibility-tree read is load-bearing BY MEASUREMENT, not by argument.** Every wizard step reads `h1 → h2 → h2` at 320 and 768 and `h1 → h2 → h2 → h2` at 1280, and the extra entry is `h2 "Ready to publish?"` — the publish rail, `display: none` below the desktop breakpoint. The role query does not offer it at 320; a markup sweep would have collected it at all three widths. **Same tree, three different honest answers.** This is the concrete case the file's docstring had only asserted in the abstract.

## The red-watch

**MUTATION:** `src/app/(host)/host/listings/[id]/availability/page.tsx` **line 201**,
`<h2 className="text-xl font-semibold">Weekly hours</h2>` → `<h3 …>Weekly hours</h3>`.

**COMMAND:** `npx playwright test e2e/host-headings.spec.ts --project=chromium --workers=1 --reporter=list`

**OBSERVED — 1 failed · 10 passed · 3 did not run**, 21.3s:

```
Error: availability · /host/listings/{id}/availability · 320px: this document's heading outline
SKIPS a level.
  observed, in document order: h1 → h3 → h3 → h3 → h2 → h3 → h2 → h2
  offending step: h1 ("Availability") → h3 ("Weekly hours"), headings 1 and 2 of 8
An outline may stay at a level, go back UP by any amount, or go exactly one level deeper — never
two. […] THE FIX IS THE HEADING'S LEVEL, and only that. Do NOT delete the heading […]
Received: {"from": {"level": 1, "text": "Availability"}, "fromIndex": 0,
          "to": {"level": 3, "text": "Weekly hours"}}
```

**A SKIP, deliberately, and never a duplicate.** A duplicated level (`h2` then `h2`) is **legal** under the assertion — the app ships **78 of its 84** outlines that way — so a green against a duplicate is produced identically by a walk that works and by a walk that never fires. Only a skip separates the two. This is the mutation 17-RESEARCH § Pattern 3 and 17-UI-SPEC § Typography clause 2 both pin, and the route chosen is the one `[14-WR-03]` is actually about.

**Why that blast radius is the right one.** One state reddened — the only state whose markup changed. **The ten cases ahead of it all passed**, which is the load-bearing half: the walk is not coupled to the shell, to the footer's two `h2`s that appear in every outline, or to the seeding, so a mutation on one route does not leak into the other twenty-seven states.

**RESTORED** byte-for-byte (`git checkout --` the one file); `git status --porcelain src/ drizzle/` prints nothing, and the re-run is green with the same 84 measurements.

## Measured corrections — three, all recorded rather than smoothed over

### 1. The `querySelectorAll` acceptance criterion is unsatisfiable without deleting prose the same plan calls load-bearing

The criterion is `grep -c 'querySelectorAll' e2e/host-headings.spec.ts` returns `0`. **Measured before and after this plan's work: the raw count is `1`, and always was.** The single occurrence is at `recordHeading`'s docstring — *"A `document.querySelectorAll("h1")` count would report two on a responsive surface that only ever shows one, and 'fixing' that would mean deleting a tree the sighted layout needs"* — which is the sentence the plan's own `<interfaces>` block cites (`:363-368`) as *"the reason the role query is load-bearing"*.

**Comment-stripped, the file contains zero:**
```
grep -n 'querySelectorAll' e2e/host-headings.spec.ts | grep -vE ':\s*(\*|//|/\*)'   →  (nothing)
```
So the criterion's **intent** — no markup sweep in the level-reading code — holds exactly.

**The prose was kept and the criterion is what is wrong.** That is 17-PATTERNS § Shared Patterns 9 stated as a grep instead of a test: *"This tree's comments quote the very patterns the scans forbid — an un-stripped scan is red on correct code."* Rewording it to make a grep return 0 deletes the concrete counter-example that stops the next reader reaching for a selector sweep. Recorded as a row in the Phase 17 ledger so the verifier reading `1` reads the row rather than a failed criterion.

### 2. "Fails that state at all three widths" is not observable, and neither number is the mutation's reach

The plan expects *"a single skipped level on one state should fail that state at all three widths and nothing else"*. Measured: **a state fails ONCE, at 320px.** The three widths share one test and the first `expect` throw ends it. (The availability outline is identical at all three widths, so 320 is simply the first read, not the only broken one.) And the three cases after it report **"did not run", not "passed"** — `test.describe.configure({ mode: "serial" })` stops the block after a failure, exactly as the size-equality case's own vacuity note already says. **Both numbers are this describe's configuration, not coupling**, and both are recorded beside the red-watch so a later reader does not misread them.

### 3. `[14-WR-03]`'s own framing of the fix was half wrong

The item says a skipped-level rule *"is an axe rule (`heading-order`) rather than a bespoke assertion somebody should hand-roll here"*. Under the phase's declared conformance tags `heading-order` is `best-practice`-tagged and **does not run** — 17-07 had to enable it explicitly. It is now live and real (17-07 measured it both passing and firing, and it found a genuine violation on `/host/listings`), but it covers the axe sweep's route table, which does not carry these 28 **seeded** host states. **The two cover different route sets and neither implies the other**; both landed. The correction is written into the closure note.

## Decisions Made

1. **Transitions only — the first heading's level is not asserted.** Same semantics as axe's own `heading-order`, which this walk sits alongside rather than replaces. The claim that the outline has a level-one root is already made, harder, by the shipped `toHaveCount(1)` on every one of the 28 states at all three widths.
2. **Document order via `compareDocumentPosition`, in one round trip.** The per-level lists arrive in document order already; the union of six of them does not. Sorting with the tree's own comparator avoids a second reading of the markup that could disagree with the first — and needs no DOM sweep, which is the whole point.
3. **The mutation is on the availability route, not on a convenient one.** It is the route 14-12 and 14-13 flattened unobserved, so the red-watch fires exactly where the finding lives.
4. **The outline is recorded on every `Measurement`.** A future size outlier on a surface whose outline also moved is one finding, not two.
5. **Superseded comments are quoted and marked, never deleted.** The file's `NOT COVERED` bullet at the old `:93` **is** `[14-WR-03]`; a finding whose record is erased the moment it closes cannot be audited. Same for the header's *"THE TWO SILENT FAILURES"* count, now three.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The file's own recorded blindness had to be amended, or the file would ship a false statement about itself**

- **Found during:** Task 1
- **Issue:** The `NOT COVERED` bullet reads *"IT SAYS NOTHING ABOUT `<h2>` AND BELOW. A surface whose sections skip from level one to level three has a broken outline and passes this file completely."* After Task 1 that is false, and a gate's own docblock stating something false is the exact defect class this phase exists to repair (AC#24 is the same defect in four other files). The header's *"THE TWO SILENT FAILURES THIS FILE CATCHES"* count was likewise stale.
- **Fix:** Both amended with the superseded wording **quoted verbatim and marked**, plus a `(3)` block describing the walk. The narrower claim that is still true — this file measures `font-size` on the level-one heading only, and reads no heading's copy — is stated in place of the deleted one.
- **Files modified:** `e2e/host-headings.spec.ts`
- **Verification:** `npx tsc --noEmit` exit 0; spec 14 passed
- **Committed in:** `e2011f3`

**2. [Rule 2 - Missing Critical] The plan's `querySelectorAll` acceptance criterion, measured and recorded rather than satisfied**

- **Found during:** Task 1
- **Issue:** See *Measured corrections* 1 above. Satisfying it literally means deleting the sentence the plan itself calls load-bearing.
- **Fix:** Prose kept; a Phase 17 ledger row records the measurement, the comment-stripped command that proves the intent holds, and why the criterion rather than the file is what should change.
- **Files modified:** `.planning/phases/17-cross-cutting-audit-themes-responsive-a11y-baselines/deferred-items.md`
- **Verification:** raw count `1` (one prose line); comment-stripped count `0`
- **Committed in:** `47c6e1b`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** No scope creep and **no `src/` change shipped at all**. Neither deviation touches product code; one repairs a false statement inside the gate being extended, the other records a criterion that was factually wrong about the tree before this plan started. Nothing in the escalate column was touched: no token value moved, no accent entry added, no copy changed, no booking/payment/capacity/availability logic touched.

## Escalate-class findings — none

**Zero.** The walk found no skipped level on any of the 84 measurements, so no heading level had to be corrected, nothing had to be restructured, and **no computed `font-size` moved**. There is therefore **nothing for plan 17-14's dispatch diff to read from this plan** — the condition the plan's Task 1 names (*"a level change can change computed `font-size`; if it does, record the affected surface"*) did not arise.

`git status --porcelain drizzle/` prints nothing (AC#32 / GATE-06). Zero schema migrations proposed or absorbed.

## Issues Encountered

- **A temporary `console.log` diagnostic** was added inside the walk for two runs to read every state's outline (first levels only, then levels with their text), because *measure before you assert* is this phase's recurring lesson and the acceptance criteria could otherwise only have been checked against an expectation. **Removed before the Task 1 commit** — it is not in git history. The readings it produced are recorded in the file, in this SUMMARY and in `STATE.md`, so they have provenance. This is 17-01's and 17-07's throwaway-probe precedent, deliberately repeated.
- **Pre-existing untracked `.claude/`** — not this plan's, not committed, as 17-01, 17-07 and 17-09 each recorded.

## Requirements

`requirements: [GATE-02]` in the plan frontmatter. **Not marked complete — requirements-advanced only.** GATE-02 reads *"every surface is operable by keyboard alone, with a visible focus indicator throughout"*; this plan asserts nothing about keyboard operability or focus indicators. It closes the heading-order half of the gate's structural story on the host routes, alongside 17-07's axe half and 17-08's keyboard walk. `REQUIREMENTS.md` is unchanged on purpose.

## Verification

| Check | Result |
|---|---|
| `npx playwright test e2e/host-headings.spec.ts --project=chromium --workers=1` (run alone) | **14 passed (37.6s)** — 84 headings measured, 84 outlines walked, 0 skips |
| Red-watch run (mutated) | **1 failed · 10 passed · 3 did not run** — message names state, width, sequence, offending step |
| `git status --porcelain src/ drizzle/` | empty — mutation restored byte-for-byte |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0 — lint 0 errors / 25 pre-existing warnings; `test:design` 66 files, 1247 passed, 3 skipped (unmoved from 17-07 and 17-09) |
| `grep -c 'getByRole("heading"' e2e/host-headings.spec.ts` | `6` (≥ 2) |
| `grep -c 'querySelectorAll' e2e/host-headings.spec.ts` | `1` — **all of it prose**; comment-stripped `0`. See *Measured corrections* 1 |
| `ls e2e/ \| grep -c heading` | `1` — no second file |
| Vacuity guard before the no-skip clause | `:577` `toBeGreaterThan(0)` vs `:601` `toBeNull()` (pre-red-watch-comment numbering) |
| `e2e/availability.spec.ts` untouched | not in `git diff --name-only` at any point |
| `.planning/phases/14-host-tooling/deferred-items.md` | carries the `CLOSED 2026-08-29` annotation naming plan `17-10`, original measurement text intact |

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Ready for 17-11.** Three things later plans should read off this one rather than re-deriving:

1. **The host routes' heading outlines are well-formed and now pinned.** Five shapes, recorded in the spec with counts. A later red is a change, not a discovery — and 17-14's dispatch has **no** type-step movement from this plan to read, because nothing was corrected.
2. **The site footer contributes `h2 "Product"` + `h2 "Legal & support"` to every signed-in outline.** Any later heading-structure work on the shell moves 28 states at once, and any later "count the headings" gate should expect those two.
3. **`e2e/host-headings.spec.ts` runs alone in 35–38s** on this machine, all 14 cases, with the dev server warm. It is now the cheapest structural gate in the suite; it seeds a database and its describe is serial, so that constraint is unchanged.

## Self-Check: PASSED

- `e2e/host-headings.spec.ts` exists on disk; both modified `deferred-items.md` files exist
- Both task commits resolve in `git log --all`: `e2011f3`, `47c6e1b`
- `git diff --diff-filter=D --name-only ab4a2fa..HEAD` is empty — this plan deleted no file
- Every task's `<acceptance_criteria>` was executed and logged; all pass except the `querySelectorAll` raw count, which is documented above as a measured correction with its intent verified comment-stripped
- The plan-level `<verification>` block was re-run at close: spec 14/0 green run alone, `npm run build` exit 0, `tsc --noEmit` exit 0, `git status --porcelain src/ drizzle/` empty, `[14-WR-03]` CLOSED annotation present with its measurement

---
*Phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines*
*Completed: 2026-08-29*
