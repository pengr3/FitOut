---
phase: 14-host-tooling
plan: 11
subsystem: ui
tags: [react, react-hook-form, jsdom, vitest, testing-library, a11y, live-regions, host-surfaces]

# Dependency graph
requires:
  - phase: 14-host-tooling
    provides: "14-09's `goToStep` (the one place the step moves) and 14-10's nav row, which both plans left structurally untouched for exactly this"
  - phase: 14-host-tooling
    provides: "`saveListingStep`'s `ListingResult` union — the thing the region is now driven by, unchanged in this plan"
  - phase: 13-booker-trust-surfaces
    provides: "`share-link-box.tsx`'s naming rule (the status role is nameFrom:author; the label is a LABEL, not the sentence again) and `live-regions.ts`'s seven numbered rules"
  - phase: 12-booker-flow-polish
    provides: "`profile-form.tsx`'s shipped RHF + server-action + status-region shape, which already reaches D-150's two conclusions"
provides:
  - "`persist()` returns `ListingResult` instead of `boolean` and fires no toast — the server's refusal sentence now survives long enough for a caller to render it"
  - "a four-state save machine (idle / saving / saved / failed) driven ONLY by the action's returned result"
  - "ONE always-mounted, author-named `status` region in the wizard's nav row, empty at idle, carrying the server's own sentence on failure"
  - "ZERO scheduled callbacks on the save path, proved twice — a fake clock advanced 30s past a save, and a scoped source scan"
  - "the two autosave toasts REMOVED; the two that precede a navigation kept and asserted present"
  - "`tests/listing/wizard-save-state.test.tsx` — 16 cases in six groups, four of them observed rejecting the shapes D-150 forbids"
  - "HFLOW-02 flipped to Complete — the fourth and last of its deliverables"
affects: [14-14, 14-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A helper that REPORTS and RETURNS has already thrown away the only thing its caller needs: `persist()` fired the refusal toast itself, so `res.error` was consumed one frame before any caller saw `false`"
    - "`formState.isDirty` LATCHES on a form that is never re-baselined — it goes true on the first keystroke of a session and never 'next becomes true' again, so a state keyed on it clears exactly once"
    - "A no-timer rule needs TWO readings: a fake clock catches a delayed CLEAR, a source scan catches a delayed SET — and a stubbed action that resolves immediately makes the second invisible to the first"
    - "A source-scanned rule must be SCOPED and guard-the-guarded: the slice is anchored on two function names and asserted non-empty, because the one way a text scan fails is open"

key-files:
  created:
    - tests/listing/wizard-save-state.test.tsx
  modified:
    - src/app/(host)/host/listings/[id]/edit/wizard.tsx

key-decisions:
  - "`saved → idle` is driven by the form's CHANGE SUBSCRIPTION, not by `formState.isDirty`. The wizard never re-baselines after an autosave, so `isDirty` latches true on the first keystroke of the session — a region keyed on 'isDirty next becomes true' would clear once and then read `Saved` forever, which is the optimistic string D-150 forbids arriving through the clause meant to prevent it"
  - "The publish GATE's refusal keeps its own toast and does NOT go to the region. The draft above it SAVED — the region says so, truthfully — and routing the gate's sentence into a region named for the save state would overwrite a true `Saved` with a `couldn't save` that never happened"
  - "The in-flight lock (`saving`) and the report (`saveState`) stay two values. On the publish path the lock is still true through `publishListing` long after the SAVE resolved, so one flag would have to lie to one of its two readers"
  - "`saveStateFor()` maps a result to a state in ONE place, so the three call sites the plan asks to 'decide for themselves' cannot disagree about what a refusal looks like"
  - "The three copy strings are EXPORTED from `wizard.tsx` (the `STEPS` precedent, 14-09) rather than retyped in the test — a test that retypes locked copy agrees with the surface until the two drift apart in one edit, at which point it agrees with neither"

patterns-established:
  - "The region is grouped with the control that causes it rather than dropped in as a third `justify-between` child, which would float it equidistant from the control it reports on and the one it does not"
  - "A gate's own vocabulary is never written whole in prose in a file that gate counts — two comment tokens were caught doing exactly that, before the first commit, by running the acceptance greps rather than trusting the edit"

requirements-completed: [HFLOW-02]

# Metrics
duration: 22min
completed: 2026-08-23
---

# Phase 14 Plan 11: The Truthful Save State Summary

**The wizard now tells the host what the SERVER said about their draft — one persistent, author-named region beside the control that triggers the save, carrying the server's own refusal sentence verbatim, with zero scheduled callbacks on the path and both autosave toasts gone; and the shortcut D-150 forbids by name was watched being caught, twice, by two independent readings of the same rule.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-08-23T20:58Z (baseline design run started 20:58:47)
- **Completed:** 2026-08-23T21:20Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- **The sentence stopped being thrown away.** `persist()` answered `boolean` and fired the refusal toast itself, so `res.error` — the only string that can tell a host *why* their draft did not save — was consumed one frame before any caller could see it. It now returns `ListingResult` and reports nothing; the three callers decide, because they do not want the same thing.
- **Four states, every transition read off a returned result.** `idle → saving → saved | failed`, and `saved → idle` on the next field edit. **No optimistic string and no timer**: `grep -c 'setTimeout\|setInterval'` on the file returns **0** — not comment-stripped-0, **raw-0**.
- **The no-timer rule is asserted TWICE, independently, and both readings were watched red.** A fake clock advanced **30 seconds** past a save catches a delayed CLEAR; a scoped source scan of the save path catches a delayed SET, which the rendered half cannot see because the stubbed action resolves immediately.
- **One region, and it has a name.** Exactly one `role="status"` in the file, `aria-label` from a named constant, asserted through testing-library's `{ name }` option (i.e. `dom-accessibility-api`, never imported directly — `live-regions.test.tsx:25`'s rule).
- **Both autosave toasts removed; both navigation-preceding toasts kept AND asserted present**, so this fix cannot overshoot into deleting the only report those two paths can make.
- **D-151 and landmine 3 held without opening either file.** `git diff` over the whole plan is **empty** for `tests/design/brand-recipe.test.ts`, `wizard-occupancy.test.tsx`, `wizard-rail.test.tsx` and `publish-checklist.test.tsx`.
- **Zero server semantics moved.** `git diff src/app/actions/` and `git diff --stat drizzle/` are both empty. **Zero packages installed.** The `earnings-freeze` gate was never approached.
- **HFLOW-02 flipped to Complete** — 14-09 shipped the truthful step count and the clickable rail, 14-10 the persistent checklist, and this plan the fourth deliverable. Both earlier plans deliberately left the row unflipped for this one.

## Task Commits

1. **Task 1: The helper returns the result, and the nav row grows a named, truthful region** — `67ad9c7` (feat)
2. **Task 2: The four proofs — real result, no timer, the server's sentence, and back to idle** — `cbdf723` (test)

## Files Created/Modified

- **`src/app/(host)/host/listings/[id]/edit/wizard.tsx` (modified, +271/−35)** — the `SaveState` union and its three module constants; `SAVE_STATE_REGION_NAME` and the three exported copy strings; `saveStateFor()` (one result→state mapping) and `saveStateText()` (empty at idle); the `saveState` hook and the change-subscription effect that returns it to idle; `persist()`'s new return type; all three call sites; the nav row's grouped region + advance control.
- **`tests/listing/wizard-save-state.test.tsx` (created, 562 lines)** — 16 cases in six groups, plus a guard-the-guard on the source slice.
- `.planning/phases/14-host-tooling/deferred-items.md` — one new entry (the `LIVE_REGIONS` row 14-14 owes) and a note narrowing the ownership of the `[14-10]` type-scale entry that named this plan.

## Verification

| Check | Result |
|---|---|
| `npm run test:design` (baseline, before any edit) | 49 files / 827 passed / 3 skipped / **0 failed** |
| `npm run test:design` (after task 1, after task 2) | 49 files / **827 passed** / 3 skipped / 0 failed — **baseline unmoved, both times** |
| `npx tsc --noEmit` (baseline, after task 1, final) | exit **0** every time |
| `npx vitest run tests/listing` (baseline) | 17 files / 169 passed |
| `npx vitest run tests/listing` (final) | **18 files / 185 passed**, zero failures — +1 file, +16 tests, all from `wizard-save-state` |
| `npx vitest run wizard-occupancy · wizard-rail · publish-checklist` | 3 files / **23 passed**, all three files **UNEDITED** |
| `npx eslint` on both touched files | exit **0**; **1** warning, the same pre-existing React-Compiler bail-out the file already had (it now names the new `form.watch` subscription rather than the old `form.watch()` — same rule, same count, still one) |
| `grep -c 'role="status"'` on `wizard.tsx` | **1**, and that element carries `aria-label={SAVE_STATE_REGION_NAME}` |
| `grep -c 'setTimeout\|setInterval'` on `wizard.tsx`, **raw** (not comment-stripped) | **0** |
| `git diff --stat drizzle/` · `git diff src/app/actions/` | **empty, both** |
| `git diff --stat tests/design/brand-recipe.test.ts` | **empty** — landmine 3, the accent count did not move because no accent was added, removed or re-branched |
| `git diff --stat` on the three protected wizard test files | **empty, all three** |
| `git diff --stat src/lib/design/live-regions.ts` | **empty** — the inventory is 14-14's to close |
| `git diff --stat` on `src/app/(host)/host/earnings/` and `payout-*` | **empty** — the `earnings-freeze` gate was never approached |
| `git diff --diff-filter=D` per commit | no deletions in either commit |
| `head -1 tests/listing/wizard-save-state.test.tsx` | `// @vitest-environment jsdom` |
| Playwright | **not invoked.** The plan's own verification says so; 14-14 asserts the region's name across the five surfaces. `e2e/availability.spec.ts:261` was neither run, touched nor claimed |

### The shortcuts have been observed being caught

**Probe A — a scheduled clear on the advance path** (`window.setTimeout(() => setSaveState(SAVE_STATE_IDLE), 3000)`). This is the exact shape D-150 forbids by name. **Both readings of the rule rejected it independently**, which is the whole reason there are two:

```
FAIL  (3) still reads the saved word after a long clock advance with no further interaction
AssertionError: the saved state cleared itself on a schedule: the region is reporting elapsed time,
not a result: expected '' to be 'Saved'

FAIL  (3) contains no scheduled callback anywhere on the save path, read from SOURCE
AssertionError: the wizard's save path schedules a callback (setTimeout). D-150: the region reads the
actual result of the save action. A scheduled transition reports the passage of time, which the server
has no opinion about.: expected true to be false
```

Reverted; re-run green.

**Probe B — the refusal toast re-added beside the region** (`if (!res.ok) toast.error(res.error);`). This is 14-RESEARCH Pitfall 6's defect: a region added while the toast stays.

```
FAIL  (1) renders the server's sentence verbatim behind the prefix, and fires NO toast
AssertionError: a refused autosave must not also raise a toast (GATE-03 rule 6): expected "vi.fn()"
to not be called at all, but actually been called 1 times
  1st vi.fn() call: [ "We couldn't find that listing, or it isn't yours to edit." ]
```

Reverted; re-run green. Worth recording: the region's own assertions all stayed **green** under this probe. A file that asserted only "the region carries the sentence" would have passed a tree with two announcements on it.

**Probe C — the optimistic string, on the DRAFT path.** `setSaveState(SAVE_STATE_SAVED)` moved to *before* the `await`, with the result-driven transition deleted. It landed on the draft path rather than the advance path — the exact-match anchor matched `saveAsDraft`, because `saveAndContinue` has comment lines between the two statements — and the case that caught it is the one that exists precisely because a navigating path's FAILURE arm does not navigate:

```
FAIL  (6) a refused autosave on the draft path reports in the region and does NOT navigate
Expected: "Couldn't save — We couldn't find that listing, or it isn't yours to edit."
Received: "Saved"
```

**Probe D — the same optimistic string on the ADVANCE path**, which is where D-150 aims it. Three cases rejected it:

```
FAIL  (1) renders the server's sentence verbatim behind the prefix, and fires NO toast
      expected 'Saved' to contain "We couldn't find that listing, or it isn't yours to edit."
FAIL  (1) is driven by the RESULT, not by the call: a second, succeeding save clears it
      expected 'Saved' to be "Couldn't save — We couldn't find that listing, or it isn't yours to edit."
FAIL  (2) says the saving word while the answer is still outstanding
```

All four probes reverted; the file is green at 16/16 and `git diff` against the task-1 commit shows only the three constant exports.

## Decisions Made

**1. `saved → idle` runs off the form's CHANGE SUBSCRIPTION, not off `formState.isDirty`.**
This is the load-bearing decision and it is the one place the implementation departs from the spec's stated mechanism. 14-UI-SPEC's state table says *"`saved → idle` when `form.formState.isDirty` next becomes true"*. **`isDirty` cannot next become true in this wizard.** It is computed against `defaultValues`, and the wizard never re-baselines the form after an autosave — so it goes true on the host's first keystroke of the session and stays true through every subsequent save. A region keyed on that clause would clear exactly once, on the first edit, and then read `Saved` forever: **the optimistic string this decision exists to forbid, arriving through the clause meant to prevent it.**

The plan's own gloss is what the implementation follows — *"i.e. on the next field edit"* — via RHF's `watch(callback)` subscription in an effect. The alternative, re-baselining with `form.reset(form.getValues())`, would make the flag honest at the cost of clearing validation and touched state on every advance in a nine-step form; the subscription buys the same observable rule for neither price. The updater returns the same object when there is nothing to clear, so React bails out and a keystroke costs no render.

**2. The publish GATE's refusal keeps its own toast, and this is a distinction rather than an omission.**
`handlePublish` saves and *then* publishes. When `publishListing` refuses, the draft above it **saved** — and the region says so, truthfully. Routing that sentence into a region named for the *save state* would overwrite a true `Saved` with a `couldn't save` that never happened: a second wrong answer added while fixing the first. D-150 removes the two **autosave** toasts, which 14-UI-SPEC, 14-RESEARCH Pitfall 6 and 14-PATTERNS § 7 all name individually and identically. This is a third outcome, with its own action behind it, and it keeps the one announcement it has always had. Case (6)'s third test pins the distinction so a future sweep cannot quietly erase it.

**3. `saving` and `saveState` stay two values.**
On the publish path the in-flight lock is still true through `publishListing` long after the SAVE resolved. One flag would have to lie to one of its two readers — either the button stops saying `Publishing…` while a request is out, or the region says `saving` about a save that already answered. They are set together and mean different things, and the state's docblock says so.

**4. One result→state mapping, three call sites.**
The plan asks the three callers to "decide for themselves", which they do — about navigation and about toasts. What they do **not** decide for themselves is what a refusal *looks like*: `saveStateFor()` is total over `ListingResult` and written once, so `failed`-with-an-empty-sentence has one place to appear rather than three.

**5. The region is grouped with the control that causes it.**
Dropped in as a third `justify-between` child it would float into the middle of the nav row — equidistant from the control it is reporting on and the one it is not. It sits inside a right-hand group with the advance control, `flex-1 justify-end` so the group stays hard right, `min-w-0` plus the row's `flex-wrap` so a long refusal sentence **wraps** rather than pushing the button off a 320px screen.

**6. The three copy strings are exported.**
The `STEPS` precedent (14-09), for the same reason: a test that retypes locked copy passes at exactly the moment the copy and the assertion drift apart in one edit, and makes every wording change a two-file edit. The SERVER's sentences go the other way — stated in the test as the stub's return value, so the assertion and the thing asserted are the same literal by construction (`request-refusal.test.tsx`'s idiom).

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] Task 2 also edited `wizard.tsx`, which its `<files>` did not list.**
- **Found during:** Task 2, writing the copy assertions.
- **Issue:** the three copy strings were module-private. A test can only assert them by retyping them, which is the drift this phase has twice refused to accept (14-09 exported `STEPS` for exactly this, and recorded why).
- **Fix:** `SAVE_STATE_SAVING_LABEL`, `SAVE_STATE_SAVED_LABEL`, `SAVE_STATE_FAILED_PREFIX` and `SAVE_STATE_REGION_NAME` became exports, with the reason in their docblock. Three lines plus a comment; the diff against the task-1 commit is exactly that.
- **Commit:** `cbdf723`

**2. [Rule 1 — Bug] Two of my own COMMENTS were quoting tokens the acceptance greps count.**
- **Found during:** Task 1, running the acceptance greps *before* committing rather than after.
- **Issue:** the module header quoted the failure-toast spelling while explaining why it was being removed, and the naming docblock quoted the status role's literal spelling while explaining the ARIA rule. `grep -c` read **2** regions and **3** error toasts against a file that has one and two. This is phase rule 6, hit by the plan's own executor, on the first try.
- **Fix:** both named descriptively, and a standing note added to the file's header saying why the spellings are never quoted in its prose. This is the third plan in this phase to write that note in a different file.
- **Commit:** `67ad9c7`

### Disclosures that are not deviations

**(a) Two of Task 1's grep criteria are arithmetically unsatisfiable against the shipped file, and the ACTION text was followed instead.** The criteria ask for `grep -c 'toast.error'` = **0** and `grep -c 'toast.success'` = **2**. The real counts are **2** and **3**. The difference is `resendVerification`, which the plan never mentions and which owns one toast of each kind (`Verification email sent to {host}` / `Couldn't send the email. Try again in a moment.`) on the review step's unverified-email row. Reaching the criteria's numbers would mean deleting the *only* feedback the resend button has, plus misrouting the publish gate's refusal into a region named for the save — two regressions to satisfy an arithmetic slip.

What the plan's `<action>` says is precise and was followed exactly: *"Delete the advance path's success toast and the toast the helper used to fire. Keep the draft toast and the published toast exactly as they are."* Two deletions. 14-UI-SPEC names the same two by their code (*"`toast.success("Saved")` and the `toast.error(res.error)` inside `persist()`"*), 14-RESEARCH Pitfall 6 names the same two by line number, and 14-PATTERNS § 7 says *"the two toasts here are removed"* under a snippet containing exactly those two. **Before: 3 error toasts, 4 success toasts. After: 2 and 3.** Exactly one of each was removed, and they are the two every source names.

In place of the unsatisfiable counts, the file carries a **scoped** proof that says what the criteria meant: `awk` the source between the save helper and `resendVerification` and grep it for any toast call — **0**. That slice is the save path, and the test's case (1) asserts the same fact at runtime with spies at zero.

**(b) The plan's `<read_first>` names `dom-accessibility-api` for the accessible-name assertion; the test reaches it through testing-library's `{ name }` option instead.** That is not a substitution — it is the same library — but the repository has a written rule that it is never imported directly (`tests/design/live-regions.test.tsx:25`, restated in `tests/host/request-refusal.test.tsx:22-23`), so following the plan literally would have broken a standing convention to no benefit.

**(c) The `[14-10]` deferred item naming this plan as the likely owner of the checklist's type-scale question was NOT taken, and the entry was amended rather than left silent.** Its reasoning was *"14-11 is the next plan in this file"* — but the rows are no longer in this file; 14-10 lifted them into `publish-checklist.tsx`, and this plan's action says *"do not touch the rail, the checklist or the step fork"*. The ownership note now points at whichever plan next opens that component.

**(d) `wizard.tsx`'s working-tree line endings are now LF rather than CRLF.** The four probe edits were applied with a script that writes LF, and `.gitattributes`'s `* text=auto` normalises on commit, so the committed blob is byte-identical to what an Edit-tool write would have produced — `git diff` shows only the intended lines, and every other agent-authored file in `tests/` is LF in the working tree for the same reason. Recorded because it is visible in `git status` warnings and is not a change to the file's content.

---

**Total deviations:** 2 auto-fixed (1 Rule 1, 0 Rule 2, 1 Rule 3, 0 Rule 4).
**Impact on plan:** none. Zero scope absorbed — no package installed, no migration, no server file opened, no payout file opened, no edit to `brand-recipe.test.ts`, `wizard-occupancy.test.tsx`, `wizard-rail.test.tsx`, `publish-checklist.test.tsx` or `live-regions.ts`.

## Issues Encountered

**The acceptance greps caught the executor before the executor caught the code.**
Two comments quoting the very tokens the criteria count read as call sites (see deviation 2). The general lesson is already written down in three files in this phase and it still landed: a prose explanation of a banned spelling is indistinguishable from the spelling to a text scan. What is worth adding is the *procedural* half — the greps were run **before** the first commit, as part of finishing the task rather than as a post-hoc check, which is the only reason this appears here as an issue rather than in the next plan's summary as a regression.

**A probe can miss its target and still be a valid probe, if you read the failure.**
Probe C's anchor matched `saveAsDraft` instead of `saveAndContinue`, because the advance path has comment lines between the two statements the anchor spans. The failure it produced was real and informative — the draft path's refusal case caught it — but it was not the case the probe was aimed at. Recorded rather than quietly re-run, because "the probe went red" and "the probe went red *where I expected*" are different findings, and only one of them tells you the case you were testing works. Probe D re-aimed it and three cases fired.

**The design suite cannot see this region at all, and that is the correct behaviour today.**
`tests/design/live-regions.test.tsx` scans `BOOKER_PATH_LIVE_REGION_FILES` and nothing else; `wizard.tsx` is not a member. So a `role="status"` was added to a host surface with the whole 827-test design suite green — which is precisely the *"a file nobody ever looked at scans identically to a file deliberately left to a later phase"* problem `live-regions.ts`'s own header is written about. It is 14-14's row and the plan says so; a deferred entry now spells out the three edits it costs, including the one that is genuinely new.

## Threat Register Disposition

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-14-11-FALSESAVE | **mitigated** | Every transition reads `saveStateFor(res)`. Zero scheduled callbacks: `grep -c` returns 0 on the raw file, and the rule is asserted twice — a 30-second fake-clock advance and a scoped, guard-the-guarded source scan. Probe A rejected a scheduled clear on both readings; probe D rejected an optimistic string on three cases |
| T-14-11-LOSTERROR | **mitigated** | `persist()` returns `ListingResult` and fires nothing; the region renders `SAVE_STATE_FAILED_PREFIX + res.error` with the server's sentence verbatim (asserted `toBe`, not `toContain` alone) and survives a refresh because it is page state rather than an overlay. Case (1) also asserts the host stays on the step |
| T-14-11-DOUBLEANNOUNCE | **mitigated** | One `role="status"` in the file, one in the rendered document (asserted at the first step and after a save). Toast spies at **zero** on the advance path in both the failure and success cases; probe B observed red. The two navigation-preceding toasts are asserted PRESENT, so the removal cannot overshoot |
| T-14-11-UNNAMED | **mitigated** | `aria-label={SAVE_STATE_REGION_NAME}` from a named constant. The accessible name is read through testing-library's `{ name }` option (`dom-accessibility-api`) and asserted non-empty at length 1; the label is also asserted NOT to be the saved word and NOT to contain the failure prefix, i.e. a LABEL rather than a second copy of the sentence. The inventory row is 14-14's and a deferred entry spells it out |
| T-14-11-SEMANTICS | **mitigated** | `git diff src/app/actions/` **empty**. No server file was opened; `saveListingStep` still re-validates with the same shared schema and its accept/write/refuse semantics are untouched. No second write path was added |
| T-14-11-SC | **mitigated** | **No package was installed.** `package.json` and `package-lock.json` are untouched; `git diff --stat drizzle/` is empty |

No new threat surface: no network endpoint, no auth path, no file access pattern, no schema change. The region only RENDERS a string the server already returned. No `## Threat Flags` section is owed.

## Known Stubs

None. Every state the region can render is produced by a real `saveListingStep` result; there is no placeholder branch, no mock string and no path that renders text the server did not supply.

## User Setup Required

None — no external service configuration, no environment variable, no package install. No database was touched; the new test file runs in jsdom with the actions module stubbed.

## Next Phase Readiness

**Ready.**

- **14-14 (the live-region inventory)** inherits exactly one new region, in a file it must add to the scanned set. Its three edits are written out in `deferred-items.md`, including the one that is not a copy of an existing precedent: the `AUTHOR_NAMED_REGIONS` `why` cannot be borrowed, because all four shipped exceptions are wrappers with no text of their own and this region has text. The argument that applies is that it **persists and is EMPTY at idle** — decorative-by-construction *some* of the time, which none of the four precedents is.
- **14-16 (the visual baselines)** inherits a nav row that is now `flex-wrap` with a `gap-3` and a right-hand group. At idle the region is an empty inline element, so the row renders as it did before this plan; the states that change it are `saving` (transient), `saved` (a check glyph plus one word in secondary ink) and `failed` (a wrapping destructive-ink sentence). It also inherits the `publish-checklist.tsx` type-scale question, whose ownership note now points at it.

**Two standing cautions for the plans that follow:**
1. **Do not re-introduce `formState.isDirty` as the return-to-idle trigger.** It reads as the obvious simplification and it is the failure it looks like a fix for — see Decision 1. The wizard has no re-baseline, so the flag latches.
2. **Do not fold the publish gate's refusal into the save-state region.** It looks like tidying two failure reports into one, and it makes the region say `couldn't save` about a save that succeeded. Case (6)'s third test goes red if anyone tries; the reason is in the code beside the toast.

**`HFLOW-02` is now COMPLETE.** The requirement's four deliverables landed across three plans — 14-09 (truthful step count as GATE-NOREG coverage, and the clickable rail), 14-10 (the persistent checklist), 14-11 (the save state). `requirements.mark-complete HFLOW-02` reported `updated: true`; ⚠ it flipped the checkbox at `REQUIREMENTS.md:79` but **left the traceability-table row at `Partial`**, which was corrected by hand. That is the same class of SDK under-update this project has recorded before and it is worth checking after every `mark-complete`.

---
*Phase: 14-host-tooling*
*Completed: 2026-08-23*

## Self-Check: PASSED

The created test file and the SUMMARY both exist on disk, `wizard.tsx` appears in `git diff --stat HEAD~2 HEAD`,
and both claimed commits (`67ad9c7`, `cbdf723`) resolve in `git log`. No missing items.
