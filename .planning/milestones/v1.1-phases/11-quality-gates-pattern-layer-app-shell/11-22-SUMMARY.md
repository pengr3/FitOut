---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 22
subsystem: testing
tags: [gate-01, gate-04, playwright, visual-regression, baselines, github-actions, workflow-dispatch, selector-contract, observed-red]

# Dependency graph
requires:
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "11-03's `updateSnapshots: \"none\"` config and hard-skipped `visual` project; 11-04/11-06's `ci.yml` and its parse-don't-grep law; 11-02's selector contract with its deferred forward direction; 11-08→11-15's shipped `data-testid` hooks; 11-18's `global-error`; 11-20's three OG cards; 11-21's re-measured `/dev/theme`"
provides:
  - "25 committed `*-visual-linux.png` baselines, generated and compared by the SAME pinned image, so author-vs-CI drift is structurally impossible (D-27)"
  - "`.github/workflows/baselines.yml` — the only `workflow_dispatch` job that can write a baseline, `contents: write` scoped to it alone"
  - "`src/lib/design/visual-baselines.ts` — the 27-row declared inventory with two type-level compile gates and the single theme-swap exclusion carried as data"
  - "`e2e/visual/{surfaces,theme-swap}.spec.ts` + `freeze.css` — the comparison and the D-135 smoke"
  - "`ci.yml` job 1 in the pinned container, comparing on every push (GATE-01)"
  - "GATE-04 closed in BOTH directions with an exact-complement assertion over all 17 ids"
  - "TWO OBSERVED REDs plus one unplanned third, all verbatim in the tree"
affects: [phase-12, phase-13, phase-14, phase-15, phase-17]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A declared baseline inventory whose two counts are TYPE-LEVEL assertions, so they are checked by `tsc`/`next build` on machines where the specs themselves never run"
    - "Deriving the theme-swap candidate set from a `kind` discriminator so an exclusion can only ever name something the smoke would otherwise have compared — enforced at compile time"
    - "A CI step that PROVES its own precondition took, with a positive control on a query whose result must be non-empty"
    - "Naming a forbidden token by ROLE rather than spelling, so the one-command audit for its absence stays meaningful"

key-files:
  created:
    - .github/workflows/baselines.yml
    - src/lib/design/visual-baselines.ts
    - e2e/visual/freeze.css
    - e2e/visual/surfaces.spec.ts
    - e2e/visual/theme-swap.spec.ts
    - e2e/helpers/visual-freeze.ts
    - e2e/visual/surfaces.spec.ts-snapshots/ (25 PNGs)
  modified:
    - .github/workflows/ci.yml
    - tests/design/selector-contract.test.ts
    - tests/design/gitignore-baselines.test.ts

key-decisions:
  - "TWO of the 27 declared baselines are BLOCKED with named reasons and 25 are shot — `global-error` (nothing in this repository can throw from the root layout) and `og-listing` (its DB-free fallback is byte-identical to the root card). THE COORDINATOR, NOT THE EXECUTOR, DECIDED `global-error` STAYS BLOCKED rather than scoping a root-layout dev affordance"
  - "The plan's instruction to drive `global-error` through 11-18's `/dev/throw` affordance is NOT SATISFIABLE — `src/app/error.tsx` catches every page throw; only a root-LAYOUT throw reaches `global-error.tsx`"
  - "`baselines.yml` was landed on `main` (`87da176`) purely for dispatch discoverability; `main` is otherwise untouched. A `push:` trigger was refused"
  - "The verification run was RE-SEQUENCED: the plan's Task 3 step 5 cannot work before Task 4 wires the comparison, so Task 4's push IS the verification"
  - "Playwright's default `threshold: 0.2` is KEPT despite a measured blind spot, because driving it to 0 makes antialiasing fail every run"
  - "The environment was fixed for the dubious-ownership red, never the assertion"

patterns-established:
  - "A blocked surface is declared, reasoned and PINNED as a set — an absent baseline and an argued exclusion look identical in a green run, and only one is a decision"
  - "A prediction that missed is recorded as wrong beside the measurement that corrected it"
  - "When a substring check fails on a documented file, fix the file's spelling — not the check, and not by deleting the documentation"

requirements-completed: [GATE-01, GATE-04]

# Metrics
duration: 93min
completed: 2026-08-17
---

# Phase 11 Plan 22: GATE-01 Watched Failing Summary

**25 Linux baselines are generated and compared by the same pinned image, CI compares on every push, GATE-04 is closed in both directions — and the gate has now been watched failing three times, including once nobody planned, with a wrong prediction recorded beside the measurement that corrected it.**

## Performance

- **Duration:** ~93 min
- **Started:** 2026-08-17T09:44:50Z
- **Completed:** 2026-08-17T11:18Z
- **Tasks:** 5 (3 auto, 2 blocking checkpoints, plus one unplanned CI fix)
- **Files modified:** 9 source/config files (6 created, 3 modified) + 25 baseline PNGs

## Task Commits

| # | Task | Commit |
|---|---|---|
| 1 | Visual specs, determinism sheet, declared inventory | `b1b9c7e` (feat) |
| 2 | The `workflow_dispatch` commit-back job | `f612147` (feat) |
| 3 | Baselines generated in the pinned image (bot) | `e37318e` (chore) |
| 4 | CI visual step + GATE-04's forward assertion | `835de11` (feat) |
| — | **Unplanned:** git inside the container | `10587be` (fix) |
| 5a | Probe + revert: a missing baseline | `28f49b1` / `b12fc03` |
| 5b | Probe + revert: a 2px shift | `f4db983` / `e549660` |
| 5c | Both OBSERVED RED records | `4a84710` (docs) |

## Accomplishments

- **GATE-01 holds, end to end.** Baselines exist, are Linux-only, are generated by the runner that compares them, and the gate has been watched failing in both dynamic modes. `git ls-files "*-win32.png" "*-darwin.png"` is empty; `"*-visual-linux.png"` counts 25.
- **The verification step D-27 needs actually happened.** A `GITHUB_TOKEN` push creates no workflow run, so the dispatch's own green proved nothing about the files it wrote. Run 32021215330 is the first thing that ever *compared*: `Running 34 tests using 1 worker` → **32 passed, 2 skipped**. Without it, D-27 produces baselines nobody has ever seen pass (T-11-UNVERIFIED).
- **THREE observed reds, not two.** The two D-30 required, plus one nobody triggered on purpose that is arguably the most valuable of the three.
- **GATE-04 closed in both directions**, with an exact-complement assertion over all 17 ids and a floor on the inventory size — watched failing three ways.
- **The design suite grew by exactly two assertions** (695 → 697), which is the two new selector-contract tests and nothing else.

## The Headline Findings

### 1. A grep-based forward assertion would have been vacuous — for the plan's own prescribed probe

The plan's acceptance criterion names the probe: remove `data-testid="panel-card"` from `patterns/panel-card.tsx` and watch the forward direction fail. It does fail — 2 of 7, naming `panel-card` and its owner plan `11-08`.

But on the **same mutated tree**, `grep -rl 'data-testid="panel-card"' src` still finds two hits: `(legal)/terms/page.tsx:148` and `(legal)/privacy/page.tsx:138`, both **comments explaining that `PanelCard` carries the hook**. A grep-based forward check reports GREEN, permanently, satisfied by the sentence describing the thing it was meant to be checking.

That is the eighth scan-of-nothing-shaped vacuity this phase has recorded, and the first where the decoy is prose arguing *for* the rule. The assertion reuses the existing AST walk, so both directions read one scan.

### 2. The prediction of 20 failures was wrong, and the two that passed are the finding

D-30's second proof nudged the footer's top border 1px → 3px. Predicted: 20 failed (every baseline of a footer-bearing surface). **Measured: 18 failed, 14 passed.** `root-not-found-1280-court` and `root-not-found-1280-grove` **passed while rendering the footer**.

Measured afterwards in a real browser rather than argued. Three conditions must coincide for that pass, and only that one surface at that one width meets all three:

| | condition | `root-not-found` @1280 | `auth-login` @1280 | `terms`/`privacy` |
|---|---|---|---|---|
| a | `mt-auto` spacer absorbs the 2px, image does not resize | yes (157 → 155) | yes | no — document grows +2 |
| b | content above is TOP-ANCHORED in a block box | yes — `main` stayed `[64..458]`, 394px | **no** — flex, centred; `main` 551 → 549 shifts the card 1px | n/a |
| c | the only changed pixels are background→border | yes | n/a | n/a |
| | **result** | **PASSES** | FAILS | FAILS |

And (c) is a real blind spot, now recorded rather than closed: **a change confined to `--border` on `--background` is invisible to this gate.** Measured in sRGB, `rgb(229,229,229)` on `rgb(255,255,255)` gives a pixelmatch YIQ deltaSquared of **341.6** (grove 397.2) against Playwright's default cutoff of `35215 × 0.2² = 1408.6` — four times under, so those pixels are not counted at all. It is the same pair `contrast-pairs.ts` carries in `EXCLUDED_PAIRS` at 1.26:1 / 1.28:1 for being a nearly invisible decorative divider. One cause, two consequences: a gate cannot see what a person cannot see.

The default `threshold` is **kept**. Driving it toward 0 makes font antialiasing a failure on every run, and a gate that cries wolf is retried until green — the exact outcome this phase exists to remove. Stated in `surfaces.spec.ts`'s NOT COVERED footer.

### 3. The unplanned red is the one that pays for plan 11-03

Moving job 1 into the Playwright container (`835de11`) meant the container's uid was not the checkout's owner, and git 2.35.2+ refused to operate: `fatal: detected dubious ownership`. Run 32020141784 failed with **exactly one failing assertion out of 700** — `gitignore-baselines.test.ts`'s guard-the-guard.

Under the obvious spelling of that gate (`try { … } catch { return [] }`) `git ls-files` would have exited 128, the catch would have returned `[]`, "zero platform baselines are tracked" would have reported **GREEN**, and D-29's rule would have been enforced by nothing inside that container from that commit onward — silently, on every green run. 11-03 built the discriminated union against a hypothesis; the container produced the hypothesis nineteen plans later.

**The environment was fixed, never the assertion.** Full record as probe (e) in that file's header.

### 4. A prohibition checked by substring is falsely RED — the mirror of this phase's standing law

`ci.yml`'s header records that a whole-file substring check gets *more vacuous* the better the file is documented. The inverse was measured here twice in one sitting: the plan's Task-4 check (`fail if ci.yml contains the snapshot-update flag`) fired on the warning label telling future editors never to add it, then fired again on the sentence describing the first failure. The flag is now named by role and never by spelling, so `grep -c` returns **0** and the one-command audit works.

Correspondingly, `baselines.yml`'s prescribed substring verify was measured **vacuous six of six** — including for an **added `push:` trigger**, the single most dangerous edit possible to that file. A 17-assertion parse goes red for all six.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `global-error` cannot be rendered by anything in this repository**
- **Found during:** Task 1
- **Issue:** The plan instructs driving it "through the dev throw affordance plan 11-18 added". Not satisfiable: `/dev/throw` throws inside a *page* and `src/app/error.tsx` catches every page throw. `global-error.tsx` renders only on a root-LAYOUT throw. `deferred-items.md:268-270` reached the same conclusion from 11-18's side and addressed its open `<title>` question to this plan assuming a browser would have the surface.
- **Fix:** Row declared, `blocked` with the full reason, skipped with that reason, and the blocked set pinned by a test. Both manufacturing routes refused as Rule 4: a request read in `src/app/layout.tsx` destroys the only two `○ Static` routes (11-19 measured that counterfactual), and rendering the component inside a dev page nests a second `<html>` and baselines a fake.
- **Escalated:** raised at the Task-3 checkpoint. **The coordinator decided it stays blocked.** Recorded as a decision, not an omission.
- **Committed in:** `b1b9c7e`

**2. [Rule 3 - Blocking] `og-listing` would have baselined the wrong card**
- **Found during:** Task 1
- **Issue:** The listing OG needs a published listing, which the DB-free scoping rule forbids. Worse than unreachable — the route answers **200** without a database, falling back to `GenericCard`, which 11-20 measured as **byte-identical to the root card (25,844 bytes)**. A baseline there would be `og-root` under the listing card's name: green forever, reading as coverage of a card it has never seen.
- **Fix:** Declared, blocked with that reason, pinned.
- **Committed in:** `b1b9c7e`

**3. [Rule 2 - Missing critical functionality] The two counts nothing would have checked**
- **Found during:** Task 1
- **Issue:** The specs only run on Linux, so on every developer machine nothing would verify "27 baselines" or "exactly one exclusion".
- **Fix:** Both are type-level assertions checked by `tsc` and `next build`. Watched failing three ways (delete a row → `TS2344`; append an exclusion → `TS2344`; exclude an image surface → `TS2322 Type '"og-root"' is not assignable to type 'DocumentSurfaceId'`). Restored → exit 0.
- **Committed in:** `b1b9c7e`

**4. [Rule 3 - Blocking] A shared helper cannot live in a spec**
- **Found during:** Task 1
- **Issue:** Both visual specs need the same emulate+inject seam, and importing one spec from another makes the `visual` project collect its tests twice.
- **Fix:** `e2e/helpers/visual-freeze.ts`, following the existing `e2e/helpers/` convention. One file beyond the plan's list.
- **Committed in:** `b1b9c7e`

**5. [Rule 1 - Bug] `freeze.css` cannot force `prefers-reduced-motion`**
- **Found during:** Task 1
- **Issue:** The UI-SPEC asks the stylesheet to "force `prefers-reduced-motion`". CSS cannot set a media feature. A comment claiming it does would be the false-header defect this repo has recorded three times.
- **Fix:** The media feature is emulated via `page.emulateMedia`; the declarations are forced in CSS; the file states plainly that neither half covers the other.
- **Committed in:** `b1b9c7e`

**6. [Rule 1 - Bug] `--ipc=host`, `contents: write` and `git` inside the container**
- **Found during:** the RUN-1 red
- **Issue:** `detected dubious ownership` — see Headline Finding 3.
- **Fix:** A `safe.directory` step on job 1 that **proves it took**, with a positive control. Not added to `gate-price-parity`: an AST/grep sweep of `tests/`, `scripts/`, `src/`, `e2e/`, `config/` found `execFileSync` at `gitignore-baselines.test.ts:233` to be the **only** runtime git shell-out, and `vitest.config.ts` excludes `tests/design/**` so job 2 never reaches it.
- **Committed in:** `10587be`

**7. [Rule 1 - Bug] The step's own `rev-parse` guard was not a guard**
- **Found during:** rehearsing the fix locally
- **Issue:** Run from a non-repository directory, `git rev-parse --show-toplevel` did **not** fail — it walked up, found an ancestor repo and answered `C:/Users/Admin` with exit 0. Both "prove it" commands passed while pointed at a different repository.
- **Fix:** The positive control (a query whose result must be non-empty) is what catches it, and the measurement is recorded in place so the control reads as load-bearing rather than decorative.
- **Committed in:** `10587be`

---

**Total deviations:** 7 auto-fixed (3 × Rule 1, 1 × Rule 2, 3 × Rule 3), 1 escalated to the coordinator.

## Sequencing Correction

The plan's Task 3 step 5 asks for a follow-up `ci` run that "compares against the new baselines" — but `ci.yml` gained the comparison in **Task 4**. An empty commit after the baseline commit would have compared nothing, and a re-dispatch verifies nothing because `--update-snapshots` rewrites rather than compares. Re-sequenced and accepted by the coordinator: dispatch → pull and inspect → **Task 4's push is the verification run**.

## Verification

| Check | Result |
|---|---|
| `*-visual-linux.png` committed | **25** (27 declared, 2 blocked with reasons) |
| `git ls-files "*-win32.png" "*-darwin.png"` | empty |
| Baseline dispatch | run 32018817812, success, `staged 25 baseline file(s)` |
| **Verification run** (first-ever comparison) | run 32021215330, **success**, `32 passed, 2 skipped` of 34 |
| CI job 1 build step | 39 files / 697 passed / 3 skipped |
| OBSERVED RED 1 (missing baseline) | run 32021666395, failure, 31/1/2; **bare re-run still red** |
| OBSERVED RED 1 restore | run 32022459245, success |
| OBSERVED RED 2 (2px shift) | run 32022921641, failure, 18 failed / 14 passed / 2 skipped |
| `npm run test:design` (local) | 39 files / **697 passed** / 3 skipped (was 695 — exactly +2) |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | 0 errors / 9 warnings — unchanged from the phase baseline |
| `npm run build` with unreachable `DATABASE_URL` | exit 0 |
| `npx playwright test --list` (Windows) | 79 tests in 16 files — **unchanged**; visual specs collected by neither project |
| `npx playwright test --project=visual --list` (Windows) | named skip reason on stderr, then `Project(s) "visual" not found` |
| `grep -c -- "--update-snapshots" .github/workflows/ci.yml` | **0** |
| `ci.yml` structural parse | 20/20 assertions pass |
| `baselines.yml` structural parse | 17/17 assertions pass |
| `ls drizzle/*.sql \| tail -1` | `0025_audit_resolved_by.sql` (GATE-06 intact — zero migrations across the phase) |

## Threat Model Coverage

| Threat ID | Disposition | Status |
|---|---|---|
| T-11-CIWRITE | mitigate | **Closed.** `contents: write` on `generate-baselines` alone; every other job and both workflow defaults stay `contents: read`, asserted structurally. |
| T-11-BASEMINT | mitigate | **Closed.** The snapshot-update flag exists in exactly one RUN command in one file; `grep -c` over `ci.yml` returns 0; config stays `"none"` unconditionally. |
| T-11-PLATBASE | mitigate | **Closed**, and watched: only `*-visual-linux.png` may be staged, with a tripwire; the standing guard caught a real container failure that would have silently disabled it. |
| T-11-UNVERIFIED | mitigate | **Closed.** Run 32021215330 is the explicit follow-up comparison. |
| T-11-CANCEL | mitigate | **Closed.** `github.event_name` in both concurrency groups. |
| T-11-RUBBERSTAMP | mitigate | **Closed.** Both dynamic modes watched failing, including the bare-re-run-still-red data point. |
| T-11-SC | mitigate | **Closed.** Two first-party actions, two verified images, zero npm packages added. |
| T-11-STALECSS | mitigate | Warning carried verbatim into both visual specs; `reuseExistingServer: !process.env.CI` means CI always gets a fresh server. |

## Known Stubs

None. Two declared baselines are `blocked` with argued reasons — that is recorded coverage, not a stub, and the blocked set is pinned so a third joining it fails by name.

## Issues Encountered

- **`e2e` remains flaky at the two known pre-existing sites** (`open-capacity.spec.ts:376`, `search-and-book.spec.ts:318`). Neither is run by CI and neither was touched.
- **`NEXT_PUBLIC_APP_URL` unset and `SUPPORT_EMAIL` null** remain deliberate `human_needed` items. Not filled.
- **The three non-exempt module-scope boot guards** still lack the `NEXT_PHASE` clause. Out of scope for this plan; still in `deferred-items.md`.

## User Setup Required

None. `baselines.yml` exists on `main` at `87da176` for dispatch discoverability; `main` is otherwise untouched, the default branch was not changed, and no repository setting was modified.

## Next Phase Readiness

- **Phases 12-15 inherit a working VR gate.** Add rows to `src/lib/design/visual-baselines.ts`, bump the type-level count in the same edit (that is the point), dispatch `baselines`, then **push so a `ci` run compares** — the dispatch does not verify itself.
- **The first surface with a clock must add a time freeze**, in the same change that baselines it. `freeze.css` names Phase 12's countdown.
- **Two blocked rows are open work with owners:** `global-error` needs a root-layout affordance decision (and would answer 11-18's deferred `<title>` question); `og-listing` needs a fixture.
- **Phase 17's axe pass** still owns the `global-error` `<title>` gap if nobody closes it sooner.

## Self-Check: PASSED

All 6 created files and all 3 modified files exist on disk; all 25 baseline PNGs are tracked. All eight claimed commit hashes (`b1b9c7e`, `f612147`, `e37318e`, `835de11`, `10587be`, `28f49b1`/`b12fc03`, `f4db983`/`e549660`, `4a84710`) are present in `git log`.

---
*Phase: 11-quality-gates-pattern-layer-app-shell*
*Completed: 2026-08-17*
