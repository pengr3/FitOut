---
phase: 14-host-tooling
plan: 09
subsystem: ui
tags: [react, jsdom, vitest, testing-library, accessibility, design-system, wcag-2.5.8, host-surfaces]

# Dependency graph
requires:
  - phase: 14-host-tooling
    provides: "14-01's `STEP_MARKER_BOX` — the declared 24px marker box, retained in Phase 10 as a visual choice and made load-bearing here the moment one of the markers became a control"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "`PageHeader` (one `<h1>`, wraps never truncates) and `selector-contract.ts`'s bidirectional declared-hook gate"
  - phase: 10-design-system
    provides: "the canonical DS-05 focus recipe with its explicit offset colour, and `brand-recipe.test.ts`'s per-file accent inventory"
provides:
  - "the wizard step rail as NAVIGATION: visited markers below the current step are named, focusable, keyboard-operable buttons; future markers stay inert"
  - "`goToStep` — the one place the wizard's step moves, and the one place an arrival is recorded"
  - "a visited-step set keyed by the step KEY union, never by position in a mode-dependent list"
  - "the accent narrowed from two rail states to one (inventory entry 7), with the pinned per-file count unmoved"
  - "`STEPS` and `StepKey` exported, so a test can assert the rail's names against the step list instead of retyping nine sentences"
  - "`wizard-step-rail` — the declared hook every rail count, order and absence assertion is scoped inside"
  - "`tests/listing/wizard-rail.test.tsx` — seven cases, two of them observed rejecting the shape they forbid"
affects: [14-10, 14-11, 14-12, 14-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A rail state that is a CONTROL and a rail state that is DECORATION are two different elements, chosen at render — not one element with an `onClick` that sometimes does nothing"
    - "Narrowing an accent condition happens ON THE EXISTING LINE and ON THE EXISTING ELEMENT: a per-file occurrence count goes to zero if the element becomes variant-driven and to two if the condition splits"
    - "A jsdom test that cannot lay out says so in its header and asserts the DECLARED box plus the constant's own arithmetic, naming the Playwright spec that owns the measured claim"
    - "A test that reads product copy imports the list the product renders from, so a copy edit is a one-file edit and can never make the test agree with a broken surface"

key-files:
  created:
    - tests/listing/wizard-rail.test.tsx
  modified:
    - src/app/(host)/host/listings/[id]/edit/wizard.tsx
    - src/lib/design/accent-uses.ts
    - src/lib/design/selector-contract.ts

key-decisions:
  - "The visited marker is a bare `<button>` carrying token classes and the canonical focus recipe, NOT `<Button>`: the shared primitive's smallest size is larger than the declared 24px marker box, and routing this element through a variant is the one edit that takes the pinned accent count to zero"
  - "`canReturn = state === \"done\" && visitedKeys.has(s.key)` — position and visited-ness are asked as two separate questions, so the forward-inert rule survives any future change to how arrivals are recorded"
  - "`goToStep` clamps its argument and reads the key AFTER clamping, so what is marked visited is always the step the host actually lands on"
  - "The review checklist's existing `setStep` links were deliberately NOT routed through `goToStep`: 14-10 owns that region, and every target those links can reach is already visited by construction"
  - "MEASURED AND REPORTED: an index-keyed visited set is observationally EQUIVALENT to a key-keyed one under the wizard's current affordances, because there is no forward jump. The probe was run and stayed green. The keying rule still holds — it is what makes the rail correct if D-148 is ever widened — and case 6 rejects the OBSERVABLE half of the same defect (a marker resolved by position against the unfiltered list)"

patterns-established:
  - "Falsification probes are reported with the result they actually produced, including the one that did NOT go red, and the analysis of why"
  - "A mode-fork test walks far enough that the two lists actually DISAGREE — the first six positions are identical, so stopping before position seven proves nothing"

requirements-completed: [HFLOW-02]

# Metrics
duration: 22min
completed: 2026-08-23
---

# Phase 14 Plan 09: The Wizard Step Rail Summary

**The nine-step rail becomes backward navigation — visited markers are named 24px buttons with the canonical focus ring, the accent narrows from two states to one without moving a pinned count, and the mode switch that would repoint an index-addressed rail is now an executable test.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-08-23T19:47Z (baseline design run started 19:47:45)
- **Completed:** 2026-08-23T20:09Z
- **Tasks:** 2
- **Files modified:** 4 (3 modified, 1 created)

## Accomplishments

- **The rail navigates.** A visited step below the current one is a real `<button>` with an accessible name that reads *"Go back to step 5: How do people use your space?"* — composed from the step list, never retyped — the canonical DS-05 focus recipe including the explicit offset colour, and the declared 24px box. Future markers are `<span>`s with no `tabindex`, so they are out of the tab order by construction rather than by suppression.
- **Landmine 3 discharged, measured.** `tests/design/brand-recipe.test.ts` is **byte-unedited** and green. The wizard's accent-background occurrence count is still **1**, and the host `variant="brand"` total is still **5**.
- **Visited-ness is keyed.** `Set<StepKey>`, seeded with the first step and added to inside `goToStep`, which is now the single place `step` moves (the review checklist's own links excepted — 14-10 owns those). `grep -c 'Set<number>\|visitedIndexes'` returns **0**.
- **D-151 held without touching its file.** `tests/listing/wizard-occupancy.test.tsx` passes **unedited**, all ten cases, and its level-one-heading helper throwing on more than one is what proves `PageHeader` did not add a second `<h1>`. The new file re-asserts the eight-and-nine counts from two independent readings.
- **The step title stopped being the largest thing on a host page.** `text-2xl` is gone; the step question is now `PageHeader`'s `<h1>` at the same size every other host page uses (14-UI-SPEC § Typography rule 1). The listing's name was not added — the question *is* the title.
- **Two gates observed failing before being trusted**, and a third probe reported with the result it actually gave rather than the one the plan predicted.

## Task Commits

1. **Task 1: Visited-by-key, and a rail whose visited markers are controls** — `a6c9dd7` (feat)
2. **Task 2: The mode switch an index-keyed rail would fail, and D-151 as GATE-NOREG** — `ddbba2f` (test)

## Files Created/Modified

- `src/app/(host)/host/listings/[id]/edit/wizard.tsx` — `STEPS` and `StepKey` exported with the reason; `visitedKeys` state; `goToStep`; the rail rewritten as a two-element fork inside the existing `<li>`; the accent condition narrowed on its own line; all three states read `STEP_MARKER_BOX`; the step title moved onto `PageHeader`; the rail's 30-line comment rewritten to describe the new behaviour under the same naming discipline.
- `src/lib/design/accent-uses.ts` — **one line**: entry 7's `device` string, *"the completed-step markers"* → *"the current-step marker"*. The inventory is still ten entries (enforced at the type level by `AccentUseCountIsTen`, which `tsc` checks).
- `src/lib/design/selector-contract.ts` — `wizard-step-rail` declared in `SELECTOR_IDS` with its row, in the same commit as the literal that renders it.
- `tests/listing/wizard-rail.test.tsx` **(created, 525 lines)** — seven cases, the occupancy file's full preamble, a stable router stub so an absence can be asserted.

## Verification

| Check | Result |
|---|---|
| `npm run test:design` (baseline, before any edit) | 49 files / 827 passed / 3 skipped / **0 failed** |
| `npm run test:design` (final) | 49 files / **827 passed** / 3 skipped / 0 failed — **baseline unmoved** |
| `npx tsc --noEmit` (baseline and final) | exit **0** |
| `npx vitest run tests/listing` (baseline) | 15 files / 156 passed |
| `npx vitest run tests/listing` (final) | **16 files / 163 passed**, zero failures — +1 file, +7 tests, all from `wizard-rail` |
| `npx vitest run tests/{listing,host,booking,availability,security}` | **104 files / 1156 passed** (baseline 103 / 1149 — the delta is exactly the new file) |
| `npx eslint` on all four touched files | exit **0** (one pre-existing `form.watch()` React-Compiler warning in `wizard.tsx`, untouched by this plan) |
| `git diff --stat tests/design/brand-recipe.test.ts` | **empty** — landmine 3 |
| `git diff --stat tests/listing/wizard-occupancy.test.tsx` | **empty** — D-151's coverage unedited |
| `git diff --stat drizzle/` | **empty** — zero migrations (PROJECT D-136) |
| `git diff src/components/host/` · `src/app/(host)/host/earnings/` | **empty** — the `earnings-freeze` gate was never approached |
| `git diff --diff-filter=D` per commit | no deletions in either commit |
| `grep -c 'Set<number>\|visitedIndexes' wizard.tsx` | **0** |
| `grep -c 'STEP_MARKER_BOX' wizard.tsx` | **3** (the import + all three marker states) |
| `grep -c 'size-6' wizard.tsx` | **0** — the box is no longer typed at the call site |
| `head -1 tests/listing/wizard-rail.test.tsx` | `// @vitest-environment jsdom` |

**No Playwright invocation was needed or made.** The rail's visual baseline is declared (blocked) in plan 14-16. `e2e/availability.spec.ts:261` — the pre-existing standing red — was neither touched nor claimed.

### The measured accent counts (landmine 3)

Both figures come from the gate itself, which passed with its file unedited:

| Reading | Value |
|---|---|
| `EXPECTED_SURVIVING_ACCENT_LINES["…/edit/wizard.tsx"]` (accent-background occurrences, comments stripped) | **1** — the current-step marker, on one line |
| The other five survivor files (calendar 1, date-pass-picker 1, slot-picker 3, spots-left-chip 1, notification-item 1) | **unmoved** |
| Host `variant="brand"` total across `src/app/(host)/` | **5** — `host/page.tsx` 2, `host/listings/page.tsx` 2, `wizard.tsx` 1 (the publish action, untouched) |

Two further `variant="brand"` spellings exist under `src/app/(host)/` in **comments** (`listings/loading.tsx:11`, `listings/page.tsx:100`) and are correctly not counted, because the scan strips comments before counting. Reported so a future reader running a bare `grep` and getting 7 does not "fix" a gate that is right.

### The gates have been observed failing

**Probe B — case 2, against the current marker converted to a `<button>`.** The plan's acceptance criterion. Three cases went red, which is the useful outcome: the accent rule, the visited-count rule and the naming rule all independently reject it.

```
FAIL  (2) the accent-filled marker is never a button and never carries the button role
AssertionError: at step 1 the accent-filled marker is a <button>. The current-step marker must stay
a NON-CONTROL: navigating to where you already are is not an action, and making it one puts a second
reachable accent fill in the viewport.: expected 'BUTTON' not to be 'BUTTON'

FAIL  (3) …expected [ <button …(3)>…(1)</button>, …(8) ] to have a length of 5 but got 9
FAIL  (6) …expected 'Step 5: How do people use your space?' to be 'Go back to step 5: How do people…'
```

**Probe A′ — case 6, against a marker whose name is resolved by numeric position against the UNFILTERED step list.** This is the observable form of the "nothing here is addressed by index" rule, and its failure mode is exactly the one D-148 names: a marker that announces one question and moves to another.

```
FAIL  (6) survives a mid-flow occupancy switch with no marker naming another step's question
AssertionError: expected [ …(7) ] to deeply equal [ …(7) ]

-   "Go back to step 7: What happens if a guest cancels?"
+   "Go back to step 7: How do you want to accept bookings?"
```

Both probes reverted with `git checkout -- wizard.tsx`; re-run green.

**Probe A — case 6, against an index-keyed visited set — DID NOT GO RED, and that is a finding rather than a gap.** See *Issues Encountered* below. The probe (a `Set<number>`, seeded with `0`, `goToStep` adding `i`, `canReturn = state === "done" && visited.has(i)`) was applied and the whole file stayed green: **7 passed**.

## Decisions Made

**1. The visited marker is a bare `<button>` with token classes, not `<Button>`.**
Two reasons, and the second is the load-bearing one. The shared primitive's smallest declared box is larger than the 24px marker box, so adopting it would either break the rail's shipped geometry or require overriding the primitive's own sizing at the call site — which is the drift `measurements.ts` exists to prevent. And the accent inventory is counted **per file, as occurrences of the utility**: routing any rail marker through a variant prop takes the wizard's pinned count to zero, and that failure reads as "an accent went missing" rather than as "somebody tidied a marker". The canonical focus recipe is therefore copied onto the element in ONE class string — one literal, because the gate that pairs the ring with its offset colour reasons per literal, and a recipe split across two `cn()` arguments is two elements as far as it can tell.

**2. Position and visited-ness are two separate questions on one line.**
`canReturn = state === "done" && visitedKeys.has(s.key)`. The `state === "done"` half is D-148's *forward markers stay inert* rule; the `visitedKeys.has` half is the arrival record. Today the second is implied by the first (see the finding below), and folding them would be the obvious "simplification" — it is also the edit that silently deletes the rule the moment a forward affordance exists. Kept apart, with the comment saying why.

**3. `goToStep` clamps first and reads the key second.**
The wizard already clamps its rendered index defensively, because the walked list can shrink. A navigation helper that recorded `steps[next].key` before clamping would read `undefined.key` on exactly the path the clamp exists to survive. Clamping first means what gets marked visited is always the step the host actually lands on.

**4. The review checklist's `setStep` links were left alone.**
Plan 14-10 owns that region and carries four path-pinned gate amendments with it. Routing those links through `goToStep` would be correct but is not this plan's file, and it is unnecessary: every step a checklist link can target sits behind the review step, so it is already in the visited set by construction. Noted here so 14-10 can fold them in as a one-line change if it wants the single-entry-point property.

**5. `STEPS` and `StepKey` are exported, and the docblock says what for.**
The alternative was for the test to retype nine product sentences. A test that retypes copy passes when the copy and the surface drift apart in the same edit — which is the drift this whole plan is about — and it makes every wording change a two-file edit. The export is read-only by construction and the WALKED list is still derived per render, so nothing about the mode fork leaks out of the module.

**6. The mode-switch case walks all the way to the review step, and that is not padding.**
The two walked lists are **identical for the first six positions**. They first disagree at position 7 (booking mode vs. cancellation), and position 7 is only a named control once the host is on the review step. A case that stopped at the cancellation step — which is where the natural walk ends — would have been green against the broken rail. Probe A′ is the evidence: it fails at exactly that assertion and nowhere earlier.

## Deviations from Plan

**None — plan executed exactly as written.** Two disclosures that are not deviations but should not be discovered in review:

**(a) `STEPS` and `StepKey` gained an `export` keyword in Task 1.**
Task 1's `<files>` names `wizard.tsx`, and Task 2's acceptance criterion requires the marker names to be asserted *"against the step list rather than against a retyped string"* — which is only possible if the list is importable. The export was therefore made in Task 1 (where the file is open) rather than in Task 2 (whose `<files>` is the test alone). No behaviour changed; the docblock records the reason.

**(b) `WHOLE_SPACE` / `DROP_IN` in the test are typed `readonly string[]`, not literal unions.**
`tsc` rejected the case-7 assertion that the drop-in flow is the whole-space flow minus exactly the booking step, because as literal unions the two arrays cannot be compared. Widened with a comment naming the assertion that forced it.

**(c) `HFLOW-02` is recorded as PARTIAL, not Complete, in `REQUIREMENTS.md`.**
`gsd-sdk requirements mark-complete HFLOW-02` (run per the plan's `requirements` frontmatter) checked the
box and set the traceability row to *Complete*. That is a false claim today: HFLOW-02's own sentence names
four deliverables and this plan shipped two of them — the truthful step count (no-regression) and the
clickable rail. **The save state is 14-11's and the persistent publish checklist is 14-10's**, and five
plans in this phase carry `HFLOW-02` in their frontmatter. The checkbox was returned to unchecked and the
row set to **Partial** (the vocabulary `TRUST-05` already uses for exactly this shape). The ROADMAP's own
row — 14-09 checked, phase 9/16 — is correct and stays. Whichever of 14-10 / 14-11 ships last should flip
it to Complete.

---

**Total deviations:** 0 auto-fixed (0 Rule 1, 0 Rule 2, 0 Rule 3, 0 Rule 4).
**Impact on plan:** none. Zero scope absorbed — no package installed, no migration, no checklist extraction, no payout file opened, no save-state work (14-11's).

## Issues Encountered

**An index-keyed visited set does not diverge from a key-keyed one under the wizard's current affordances, and the plan predicted it would.**

The plan's Task 2 acceptance criterion asks for case 6 to be *"observed FAILING against a deliberate regression: temporarily key the visited set by index"*. It was applied and the file stayed **green (7 passed)**. This is reported rather than papered over, because the alternative — quietly rewriting the test until something went red — would have produced a gate that asserts a shape nobody chose.

**Why it cannot diverge.** The two implementations differ only where `i < currentIndex` and `visitedKeys.has(steps[i].key) ≠ visitedIndexes.has(i)`. The wizard has **no forward jump**: `saveAndContinue` moves exactly one step, the rail moves strictly backward, and the review checklist's links move strictly backward. So every position from `0` to the current one has been arrived at, in order, under both keyings — `visited ⊇ {0…current}` is an invariant of both, and the predicate collapses to `i < current` either way. The mode fork does not rescue it: the mode can only be changed **on the occupancy step** (position 5), the two lists are identical below that point, and any position past it is reached by walking through it.

**Why the keying rule still stands, and what now protects it.**
1. It is the file's own law — `wizard.tsx`'s header, its walked-list docblock and its step-guard docblock all state that nothing here is addressed by index, and the checklist's numeric-literal rot is the recorded reason. A correct-by-construction rule does not become optional because today's affordances happen to hide its violation.
2. 14-UI-SPEC flags the forward-inert reading as one the PM may widen. **The day free-jumping lands, the index-keyed set is wrong and silently so** — that is precisely the "passes every single-mode test" failure the plan describes, arriving one plan later than expected.
3. What case 6 *does* reject is the observable half of the same defect: a marker resolved **by numeric position against the unfiltered list**, whose failure is the marker-name drift the plan names verbatim. Probe A′ above is that failure, with its message.

Logged to `deferred-items.md` as `[14-09]`, owned by whichever plan widens D-148.

## Threat Register Disposition

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-14-09-KEYDRIFT | **mitigated, with a caveat stated** | The set is keyed by the `StepKey` union (`grep` for an index-keyed set returns 0) and the mid-flow mode-switch case ships. The index-keyed probe did NOT diverge — see *Issues Encountered* for why, and for the assertion (probe A′, observed red) that does reject the observable form of the same defect |
| T-14-09-A11YTRAP | **mitigated** | Visited markers are `<button>`s named from the step list, carrying the canonical focus recipe **with the explicit offset colour** in one class literal and the declared marker box; `focus-recipe` passes. Case 4 asserts every visited marker is reachable in rail order before the step's first field and that zero rail elements outside that set are reachable, guarded by a no-positive-`tabindex` precondition |
| T-14-09-ACCENTPIN | **mitigated** | The condition narrowed on the same line and the same element; `brand-recipe.test.ts` passes with `git diff --stat` **empty**; wizard count 1, host total 5 |
| T-14-09-STEPCOUNT | **mitigated** | `wizard-occupancy.test.tsx` passes **unedited** (10/10) and case 7 re-asserts 8/8 and 9/9 from two independent readings — the rail's own subtree and the counter sentence — at every step, not only the first |
| T-14-09-DOUBLEH1 | **mitigated** | `PageHeader` supplies the one `<h1>`; the occupancy file's `getByRole("heading", { level: 1 })` helper throws on more than one and every one of its ten cases calls it. The new file's `heading()` is the same helper and is called ~40 times across seven cases |
| T-14-09-VALIDATION | **accepted, re-proved** | Backward navigation renders a step and writes nothing; `saveListingStep` was not opened. `npx vitest run tests/security` inside the 104-file sweep — all green |
| T-14-09-SC | **mitigated** | **No package was installed.** `package.json` and `package-lock.json` are untouched. `dom-accessibility-api` is reached the way this repo reaches it everywhere — through `@testing-library`'s `{ name }` option — and is not imported directly, per `live-regions.test.tsx`'s standing note |

No new threat surface: no network endpoint, no auth path, no file access pattern, no schema change. No `## Threat Flags` section is owed.

## Known Stubs

None. Every element the rail renders is wired: the visited markers call `goToStep`, the accent condition reads real state, and the marker box reads the declared constant.

## User Setup Required

None — no external service configuration, no environment variable, no package install.

## Next Phase Readiness

**Ready.**

- **14-10 (the persistent publish checklist)** inherits an untouched checklist region and a `goToStep` helper it can adopt for the row links in one line if it wants the single-entry-point property (Decision 4). The `bg-success` marker at the checklist row is untouched and `status-vocab`'s one-filled-success-surface pin is unmoved.
- **14-11 (the save state)** inherits `saveAndContinue` with one changed line (`setStep` → `goToStep`) and no other alteration to the save path.
- **14-16 (the visual baselines)** inherits `wizard-step-rail` as a declared hook and the three rail states as distinguishable elements — `<button>` vs `<span>`, which a screenshot diff cannot tell apart but a DOM assertion can.

**Two standing cautions for the plans that follow:**
1. **The wizard's accent count is 1 and has no slack.** Any plan that adds a coral surface to this file, or converts the current-step marker to anything variant-driven, moves a pinned number. The publish action on the review step is the file's one `variant="brand"` and is part of the host total of 5.
2. **`PageHeader` now renders inside the wizard**, so the wizard's `<h1>` is the pattern's. A plan that adds a second heading at that level to this surface breaks ten shipped occupancy cases and seven new rail cases at once, via a helper that throws rather than asserts.

---
*Phase: 14-host-tooling*
*Completed: 2026-08-23*

## Self-Check: PASSED

All four claimed files exist on disk and both claimed commits (`a6c9dd7`, `ddbba2f`) resolve in
`git log`. No missing items.
