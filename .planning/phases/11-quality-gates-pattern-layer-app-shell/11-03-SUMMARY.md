---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 03
subsystem: testing
tags: [gate-01, playwright, visual-regression, snapshots, gitignore, git-ls-files, vitest, design-gate, ci]

# Dependency graph
requires:
  - phase: 10-design-system-token-layer
    provides: "the DB-free `tests/design/**` gate (vitest.design.config.ts), `e2e/helpers/theme.ts`'s pre-paint theme seam, and the `reuseExistingServer` stale-stylesheet warning both browser specs carry"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "plan 11-01 put the design suite inside `npm run build`; plan 11-02 left it at 24 files / 470 tests and established the positive-control-over-your-own-scan rule"
provides:
  - "`playwright.config.ts` that cannot mint a baseline on ANY machine — `updateSnapshots: \"none\"` with no environment condition (D-28)"
  - "a second Playwright project named exactly `visual`, hard-skipped off Linux with a named printed reason, whose `testMatch` is disjoint from `chromium`'s (D-29)"
  - "`@playwright/test` pinned EXACT at 1.60.0 so `mcr.microsoft.com/playwright:v1.60.0-noble` cannot drift from the project (T-11-VERDRIFT)"
  - "`.gitignore`'s first `*.png` rules: `*-win32.png` / `*-darwin.png` (D-29)"
  - "`tests/design/gitignore-baselines.test.ts` — the standing guard for both halves of the platform rule, and the repo's first test that shells out to `git` (D-30)"
affects: [11-21, 11-22, phase-12, phase-17]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "a Playwright project entry created conditionally on `process.platform`, with the skip reason as a named const printed to stderr — a hard skip, not a soft one"
    - "shelling out to `git ls-files` from a design gate, with a discriminated-union result so 'git could not answer' can never be read as 'git answered: nothing'"
    - "control pathspecs that exercise the SAME glob machinery the real query depends on, including one that crosses a directory boundary"

key-files:
  created:
    - tests/design/gitignore-baselines.test.ts
  modified:
    - playwright.config.ts
    - package.json
    - package-lock.json
    - .gitignore
    - e2e/helpers/theme.ts

key-decisions:
  - "GATE-01 stays Pending — this plan closes only its STATIC clause; the two dynamic OBSERVED REDs and the baselines themselves belong to plan 11-22"
  - "The visual project is created conditionally rather than declared-and-skipped, so `--project=visual` errors with 'not found' off Linux and no screenshot assertion is reachable by accident"
  - "`updateSnapshots` is placed ABOVE the `retries` ternary in the config object, because the plan's own verification regex reads any `updateSnapshots` token following a CI ternary with no intervening semicolon as the forbidden shape"
  - "Half 2 uses `git ls-files`, not a filesystem walk: an untracked platform baseline is harmless and expected; only a COMMITTED one is the defect, and a walk cannot tell them apart"
  - "The plan's comment-stripper probe was measured to be vacuous — whole-line equality already rejects comments — so a direct assertion on `ruleLines()` was added to make the stripper load-bearing"
  - "The plan text names `11-21` as the owner of the two dynamic REDs; `11-22`'s own must_haves claim them and `11-21` touches nothing visual. Corrected in the gate's header"

patterns-established:
  - "A hard-skipped Playwright project: the entry is not constructed at all, and the reason is a named const the run prints rather than a comment nobody sees"
  - "When a gate shells out, the subprocess's SUCCESS is asserted separately from its OUTPUT, and positive controls prove the query shape still matches"
  - "A probe that leaves the suite green is reported as a finding, not quietly replaced with one that fails"

requirements-completed: []

# Metrics
duration: 25min
completed: 2026-08-13
---

# Phase 11 Plan 03: GATE-01's Fail-Open, Closed in Configuration Summary

**Playwright can no longer write a visual baseline on any machine (`updateSnapshots: "none"`, unconditional), the `visual` project is hard-skipped off Linux with a printed reason, `@playwright/test` is pinned exact at 1.60.0, and a new DB-free gate asserts both halves of the platform-baseline rule — the rules are in `.gitignore` AND `git ls-files` reports zero tracked matches.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-13T09:09:58Z
- **Completed:** 2026-08-13T09:35Z (approx.)
- **Tasks:** 2 (both `type="auto"`)
- **Files modified:** 6 (1 created, 5 modified) + 1 planning doc

## Accomplishments

- **The fail-open is closed in configuration, on every machine, before any baseline exists.** `updateSnapshots: "none"` sits at the top level of `defineConfig` with no environment condition. The comment cites the MEASURED behaviour from 11-RESEARCH Finding 3 rather than D-135's wording, which is wrong for 1.60.0: the default mode does not report green on the run that finds no baseline — it fails that run non-retriably AND WRITES THE PNG, so the next bare re-run is green off a baseline the failed run just minted. A red that turns green when you press the button again is the rubber stamp this phase exists to remove.
- **The `visual` project exists, is disjoint from `chromium`, and is a HARD skip off Linux.** Verified three ways on this Windows box: the named reason prints on stderr on every run; `npx playwright test --project=visual` errors with `Project(s) "visual" not found. Available projects: "chromium"`; and a probe spec dropped into `e2e/visual/` was collected by NEITHER project — the total stayed **27 tests in 11 files**.
- **`@playwright/test` pinned EXACT at 1.60.0.** `git diff package.json` is exactly one line, `git diff package-lock.json` is exactly one line, and the lockfile still resolves `1.60.0`. No other dependency moved (T-11-SC, T-11-VERDRIFT).
- **`.gitignore` gained its first `*.png` rules** under a commented section heading, following the `# typescript` block's style.
- **The one silently-regressing half of GATE-01 has a standing gate, watched failing four ways.**
- **The stale Phase-10 baseline prohibition in `e2e/helpers/theme.ts` is amended rather than left contradicting the tree** — and the false claim inside it was caught and recorded (see Deviations).

## Task Commits

1. **Task 1: A config that can never write a baseline, and an exact version pin** — `aec39c0` (feat)
2. **Task 2: The standing platform-baseline guard — both halves** — `17fef31` (test)

**Plan metadata:** see the `docs(11-03)` commit that follows this file.

## Files Created/Modified

- `playwright.config.ts` — `updateSnapshots: "none"` unconditional; `testMatch` on `chromium` (`e2e/*.spec.ts`); a conditional `visual` project (`e2e/visual/**/*.spec.ts`); `VISUAL_OFF_LINUX_REASON` printed when the project is not constructed. `webServer`, `retries` and `reuseExistingServer` untouched.
- `package.json` / `package-lock.json` — `@playwright/test` `^1.60.0` → `1.60.0`. One line each.
- `.gitignore` — new `# playwright visual baselines` section with `*-win32.png` and `*-darwin.png`.
- `e2e/helpers/theme.ts` — the Phase-10 prohibition rewritten as history, naming plan `11-22` and the two structural enforcements that replaced it.
- `tests/design/gitignore-baselines.test.ts` — **NEW.** 4 assertions, DB-free, inside `npm run build`.
- `.planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md` — one new out-of-scope entry (below).

## The Headline Finding

**A PROBE THAT LEAVES THE SUITE GREEN IS A FINDING, NOT A FORMALITY — AND THE PLAN PRESCRIBED ONE.**

The plan's Task 2 instructs: *"Strip `#` comment lines before matching — this repo has been bitten repeatedly by a grep landing on prose, and a rule asserted against a comment that argues FOR the rule is the same defect."* Its acceptance criteria then ask for a watched red on the comment-only fixture.

The stripper was written, the fixture was written, and the probe was run: **`stripGitignoreComments` was neutered to a pass-through and the whole file stayed GREEN, 4 passed.**

The reason is structural, and it is a good reason. `hasRule` compares **whole lines**. A line beginning `#` can never *equal* a bare rule, so half 1 is already immune to prose without any stripping at all. Had the prescribed probe been run and its green result rationalised away — or, more likely, had the probe simply been skipped because the assertion "obviously" depends on the stripper — this file would carry a WATCHED RED section describing a mutation that never failed. That is 11-02's finding in a new disguise: a guard whose own probe is vacuous.

Two things were done rather than one:

1. **A direct assertion on `ruleLines()` was added** (Rule 2), so the stripper's *real* load-bearing job is exercised. That job is not half 1 — it is the rule **count** the guard-the-guard block leans on. Measured: this repository's `.gitignore` holds **50 non-blank lines, 17 of them prose, 33 real rules**. An unstripped floor of 20 would pass against a file gutted down to nothing but its own commentary. With that assertion in place, the same mutation now goes red at 1 failed / 3 passed.
2. **A second probe (c2)** was run for the failure mode the fixture was genuinely written for: `hasRule` reduced to `body.includes(rule)`, the one-line "simplification" a future reader would reach for. That goes red naming the comment.

Both results are verbatim in the gate's header, including the green one.

## Watched Reds — four probes, three failure modes

Command for all four: `npx vitest run --config vitest.design.config.ts tests/design/gitignore-baselines.test.ts`. Green is **4 passed**.

| Probe | Mutation | Result |
|---|---|---|
| (a) half 1 | the `.gitignore` rule changed to `# *-win32.png` — the strongest form, since the rule TEXT survives | 1 failed / 3 passed, naming `*-win32.png` |
| (b) half 2 | a throwaway PNG written **four levels deep** at `e2e/visual/probe.spec.ts-snapshots/shot-visual-win32.png` and staged with `git add -f` | 1 failed / 3 passed, naming the tracked path |
| (c1) stripper | `stripGitignoreComments` neutered | **4 PASSED** — see above; red at 1 failed / 3 passed after the `ruleLines()` assertion was added |
| (c2) whole-line | `hasRule` reduced to a substring check | 1 failed / 3 passed, "a comment mentioning `*-win32.png` was accepted as the rule" |

Probe (b) is the one that proves half 2 is not decoration: `.gitignore` is **advisory**, `git add -f` bypasses it completely, and every rule half 1 asserts was present and correct throughout that run. Half 1 alone is a fiction.

**Probe (b) also corrected this gate's own remedy sentence.** It advised `git rm --cached` "(which also deletes the working-tree copy)". It does not — measured: after `git rm --cached` the PNG was still on disk, and `git status --short --ignored` then reported `!! e2e/visual/`, i.e. the rules correctly reclassifying it as ignored, which is the harmless end state. A remedy sentence that misdescribes its own command is the same defect class as a false header comment.

## Decisions Made

- **GATE-01 stays Pending.** This plan closes its static clause only. The two dynamic clauses — a missing baseline fails, a few-pixel shift fails — are OBSERVED REDs owned by plan `11-22`, which also shoots the baselines and wires the comparison. Recorded in the gate's NOT COVERED footer so the hand-off is auditable rather than forgotten.
- **`updateSnapshots` sits ABOVE the `retries` ternary in the config object.** The plan's own verification regex, `/process\.env\.CI\s*\?[^;]*updateSnapshots/`, treats any `updateSnapshots` token following a CI ternary with no intervening semicolon as the forbidden shape — and there are no semicolons inside an object literal. Placing the key after `retries: process.env.CI ? 2 : 0` would have failed the check while being perfectly correct code. For the same reason, D-135's prescribed ternary is described in the comments rather than quoted: quoting it would have made the file fail its own criterion.
- **The `visual` project is constructed conditionally, not declared-and-skipped.** Off Linux there is no project entry at all, so `--project=visual` errors instead of silently selecting something. A `test.skip` inside the specs would have left a selectable project and a reachable screenshot assertion.
- **`git ls-files` over a filesystem walk**, with the reason in the header: an untracked `*-win32.png` in a working tree is harmless and expected — it is exactly what a local `--update-snapshots` produces, and `.gitignore` exists so nobody has to think about it. A walk would go red on a perfectly correct tree, which is the fastest route to a gate somebody disables.
- **Two control pathspecs, one of which crosses a directory boundary.** `*.spec.ts` must reach `e2e/search-and-book.spec.ts`. This is not ceremony: half 2 depends on git pathspec wildcards crossing `/`, because a real baseline lives several levels deep under `e2e/visual/<spec>.spec.ts-snapshots/`. Verified against real git output before being asserted (`git ls-files "*.spec.ts"` → 11 paths, all inside `e2e/`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `e2e/helpers/theme.ts` claimed a guard that has never existed**

- **Found during:** Task 1
- **Issue:** The paragraph being amended ended: *"(Playwright's screenshot-assertion API is not named literally anywhere in this file or in playwright.config.ts, **because its absence from both is asserted by a grep**.)"* No such grep exists. Measured across `tests/**` and `scripts/**`: zero tests reference `playwright.config.ts` at all, and every `screenshot` hit in `tests/` is prose. This is Shared Pattern 10 — a false header comment is a defect — inside the very paragraph the plan sent me to amend for being stale.
- **Fix:** The rewritten paragraph records the false claim explicitly rather than dropping it, with the reason: a header comment that invents a guard is worse than no comment, because it retires the reader's suspicion without retiring the risk.
- **Files modified:** `e2e/helpers/theme.ts`
- **Verification:** `grep -rn "playwright.config" tests/ scripts/` → no output; `grep -rn "screenshot" tests/` → 11 hits, all comments.
- **Committed in:** `aec39c0`

**2. [Rule 2 - Missing critical functionality] The comment stripper had no assertion that reached it**

- **Found during:** Task 2
- **Issue:** Neutering `stripGitignoreComments` left the whole gate green (see The Headline Finding). The plan's prescribed watched red would have been recorded without ever failing.
- **Fix:** A direct assertion on `ruleLines()` was added to the both-directions test, so the stripper's real job — keeping 17 prose lines out of the 33-rule floor — is exercised. A second probe (c2) was added for the failure mode the fixture was actually written for.
- **Files modified:** `tests/design/gitignore-baselines.test.ts`
- **Verification:** with the assertion in place, the same mutation gives 1 failed / 3 passed; `hasRule` reduced to a substring check gives 1 failed / 3 passed naming the comment.
- **Committed in:** `17fef31`

**3. [Rule 1 - Bug] The gate's own remedy sentence misdescribed `git rm --cached`**

- **Found during:** Task 2, probe (b)
- **Issue:** Half 2's failure message advised `git rm --cached <path>` "(which also deletes the working-tree copy)". It does not.
- **Fix:** Message corrected to state that the file is removed from the index and LEFT on disk, where the rules then correctly classify it as ignored — which is the harmless end state, and is what the probe actually observed.
- **Files modified:** `tests/design/gitignore-baselines.test.ts`
- **Verification:** after `git rm --cached`, `ls` showed the file still present and `git status --short --ignored` reported `!! e2e/visual/`.
- **Committed in:** `17fef31`

**4. [Rule 3 - Blocking] The plan's NOT COVERED footer names the wrong owner for the dynamic REDs**

- **Found during:** Task 2
- **Issue:** The plan says the missing-baseline OBSERVED RED is `11-21`'s. `11-21` is the shell/overflow measurement plan (`e2e/shell.spec.ts`, `e2e/overflow-320.spec.ts`, `e2e/skeleton-geometry.spec.ts`) and touches nothing visual. `11-22`'s own `must_haves` claim BOTH REDs, and its objective states *"the static one already has its standing test from plan 11-03"*.
- **Fix:** The gate's header and NOT COVERED footer cite `11-22`, with the correction stated in place so a reader is not left choosing between two plans.
- **Files modified:** `tests/design/gitignore-baselines.test.ts`
- **Verification:** read `11-21-PLAN.md` and `11-22-PLAN.md` frontmatter and objectives.
- **Committed in:** `17fef31`

---

**Total deviations:** 4 auto-fixed (2 × Rule 1, 1 × Rule 2, 1 × Rule 3)
**Impact on plan:** No scope creep. Two are corrections to false statements in files this plan was already editing, one closes a probe the plan itself specified but which could not fail, and one fixes a cross-reference. Zero product source files were touched by this plan.

## Issues Encountered

**The e2e signature does not match the phase baseline, and the second failure is new.** The plan's acceptance criterion expects *"17 passed / 1 failed"*. Measured today: **19 passed / 2 failed / 6 did not run**.

- **Failure 1 is D-6 item 1 verbatim** — `e2e/open-capacity.spec.ts:376`, the `Saturday, Aug 15` panel heading. Pre-existing, proven so twice already in Phase 10.
- **Failure 2 is new** — `e2e/search-and-book.spec.ts:318` hits a strict-mode violation: `getByText('FIT-…', { exact: true }) resolved to 2 elements`, two identical booking-reference paragraphs in one document.

**Proven not caused by this plan, by reverting rather than by arguing.** `playwright.config.ts` was restored to its HEAD content with `git checkout -- playwright.config.ts` and the spec re-run: **identical signal — 1 failed / 1 did not run / 1 passed, same test, same assertion, same duplicate-element error.** The new config was then restored and re-verified. It is also structurally impossible for a snapshot mode and two `testMatch` globs to duplicate a DOM node in an assertion that takes no screenshot.

Not caused by Phase 11 source changes either, as far as the tree can say: the render site is `src/app/(app)/bookings/[id]/page.tsx:584`, last committed at `69b3a70` (plan 10-11), and no Phase 11 plan has touched it. Logged to `deferred-items.md` with the leading hypothesis (Next dev-mode streaming leaving both copies in the DOM across the `page.reload()` at `:317`) and an instruction to rule that in or out first, because if it holds the fix is in the spec's locator and not on the confirmation page.

**Per the plan's own instruction — "record it, do not chase it" — it was not chased.**

## Verification

| Check | Result |
|---|---|
| Task 1 automated verify (pin, `"none"`, no CI ternary, `name: "visual"`, both `.gitignore` rules) | `ok` |
| `npx playwright test --list` | 27 tests in 11 files; reason line printed; only `chromium` listed |
| `npx playwright test --list --project=visual` | `Error: Project(s) "visual" not found. Available projects: "chromium"` |
| Disjointness probe | a spec placed in `e2e/visual/` was collected by neither project; total unchanged at 27/11 |
| `git diff package.json` | exactly one line; `scripts.build` unchanged |
| `git diff package-lock.json` | exactly one line; lockfile resolves `1.60.0`; no other dependency moved |
| `npx vitest run --config vitest.design.config.ts tests/design/gitignore-baselines.test.ts` | 4 passed |
| `npm run test:design` | **474 passed / 25 files** (was 470 / 24 — **+1 file exactly**) |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | 0 errors / 9 warnings — byte-identical to the phase baseline |
| `npm run build` | exit 0 |
| `ls drizzle/*.sql \| tail -1` | `0025_audit_resolved_by.sql` (GATE-06 intact) |
| `npm run test:e2e` | 19 passed / 2 failed / 6 did not run — see Issues Encountered |

## Threat Model Coverage

| Threat ID | Disposition | Status |
|---|---|---|
| T-11-BASEMINT | mitigate | **Closed.** `updateSnapshots: "none"` unconditional; no config path on any machine can mint a baseline. |
| T-11-PLATBASE | mitigate | **Closed.** Both `.gitignore` rules present, and `git ls-files` asserted to return zero matches — watched failing in both directions. |
| T-11-VERDRIFT | mitigate | **Closed.** Exact pin `1.60.0`; the project name is also flagged in-config as a segment of every baseline filename. |
| T-11-STALECSS | accept | Unchanged. The visual specs that must carry the `reuseExistingServer` warning do not exist yet (`11-22`); `e2e/visual/**` is empty at wave 1 by design. |
| T-11-SC | mitigate | **Closed.** `git diff package.json` is exactly one line, and it loosens nothing — it tightens a caret to an exact pin. |

## User Setup Required

None.

## Next Phase Readiness

- **`11-22` is unblocked for its config prerequisites.** The `visual` project name, its `testMatch`, and the write-prohibition are in place; `11-22` supplies `e2e/visual/**`, `freeze.css`, the baselines and both OBSERVED REDs.
- **One instruction for `11-22`:** the visual specs must carry the `reuseExistingServer` stale-stylesheet warning copied from `e2e/reduced-motion.spec.ts:45-51`. Task 1's `read_first` asked for it to be copied *into the visual specs*, which do not exist yet — so the obligation is recorded here rather than discharged. A stale dev server in the visual project yields a baseline captured from stale CSS, which is worse than the false-red it causes elsewhere.
- **Two open items for whoever closes the phase:** `e2e/search-and-book.spec.ts:318` (deferred, characterised) and D-6 item 1, still unfixed and now four identical reproductions old.

## Self-Check: PASSED

All 6 claimed files exist on disk; both claimed commit hashes (`aec39c0`, `17fef31`) are present in `git log`.

---
*Phase: 11-quality-gates-pattern-layer-app-shell*
*Completed: 2026-08-13*
