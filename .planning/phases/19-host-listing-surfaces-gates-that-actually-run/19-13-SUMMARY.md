---
phase: 19-host-listing-surfaces-gates-that-actually-run
plan: 13
subsystem: infra
tags: [github-actions, ci, workflow-invariants, mail-credential, d-14, gap-closure, vitest, design-gate]

requires:
  - phase: 19-12
    provides: "D-14's runtime refusal script, the four mail invariants (A/B/C/D), and the build-blocking design test this plan tightens"
  - phase: 19-11
    provides: "the job-level `gate-e2e is unconditional` invariant this plan promotes to every step"
provides:
  - "Invariant A compares `gate-e2e`'s refusal-step `run:` for EXACT equality with `node scripts/refuse-mail-credential.mjs` — an appended argument is red"
  - "`scripts/refuse-mail-credential.mjs` takes no arguments and refuses any before reading a file or the environment; its prefix source is derived from `import.meta.url` alone"
  - "the `unconditional` invariant quantifies over the JOB AND EVERY STEP of `gate-e2e`, naming offenders in declared order with a `step[<index>]` fallback"
  - "three new build-blocking design-test cases, one of which is the measured CR-01 fail-open verbatim"
  - "`ci.yml`'s invariant list carries no sentence that a conjunct or test case beside it does not implement"
affects: [ci, workflow-verification, mail-privacy, d-14, gate-e2e]

actuals:
  tokens: 6937
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "A security control's input source is DERIVED (from `import.meta.url`), never CHOSEN (from `argv`) — a configuration knob that can redirect what a control reads is a modeling decision wearing a flag's costume"
    - "Invariants that pin an INVOCATION compare for exact equality after `trim()`, never containment — `node <script>` and `node <script> <anything>` must land on opposite sides"
    - "A gate-bearing property is quantified over every unit that can carry a condition (job AND steps), not over the unit that happened to be assumed singular"
    - "Every header sentence names a conjunct or test case that exists in the tree at the moment it is written; a claim that cannot be made true is DELETED, not marked"

key-files:
  created: []
  modified:
    - scripts/refuse-mail-credential.mjs
    - scripts/verify-workflows.mjs
    - tests/design/mail-credential-refusal.test.ts
    - .github/workflows/ci.yml

key-decisions:
  - "The `argv[2]` prefix-source override was REMOVED, not gated behind an env flag — 19-REVIEW.md offered both shapes and the gated one leaves a test-only escape hatch reachable on the production path"
  - "Cases 7 and 8 pass a decoy source that PARSES (`const MAIL_KEY_PREFIX = \"ZZUNUSED\";`) rather than a merely non-existent path, because only a parsing decoy reproduces the measured exit-0 fail-open and therefore only it makes the RED phase real"
  - "The `ci.yml` red-count sentence states TWELVE observed mutations, not the plan's projected 'nine' — the plan instructs stating the observed count, and 19-13 applied six (the plan's four plus the argument injection plus an unnamed-step probe)"
  - "One check was WIDENED rather than a second added, keeping the invariant total at 48 — a job-only answer plus a step-only answer to one question is the asymmetry CR-02 is made of"
  - "The READ hard stop's `fix the path in ci.yml` sentence was corrected, because after the argument's removal there is no path in `ci.yml` to fix — the same false-claim class the plan exists to eliminate"

patterns-established:
  - "Watched-red mutation harnesses restore the exact bytes they read inside the same process and are followed by an empty `git status --porcelain` gate"
  - "Design tests reach a script's location-derived hard stops by running a COPY of it from a `mkdtemp` directory, not by parameterizing the script"

requirements-completed: [CI-01]

coverage:
  - id: D1
    description: "Appending any argument to `gate-e2e`'s mail-refusal `run:` turns `node scripts/verify-workflows.mjs` red with a named FAIL line (CR-01, workflow side)"
    requirement: "CI-01"
    verification:
      - kind: other
        ref: "argument-injection mutation harness (Task 1 <verify> #3) → CHECKER-EXIT=1, FAIL names the mail-refusal invariant"
        status: pass
      - kind: other
        ref: "node scripts/verify-workflows.mjs → All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8)"
        status: pass
    human_judgment: false
  - id: D2
    description: "`scripts/refuse-mail-credential.mjs` refuses any argument with exit 1 and reads its prefix source only from its own location, so the measured fail-open is closed (CR-01, script side)"
    requirement: "CI-01"
    verification:
      - kind: unit
        ref: "tests/design/mail-credential-refusal.test.ts#refuses ANY argument outright, and never reports a completed scan after one"
        status: pass
      - kind: unit
        ref: "tests/design/mail-credential-refusal.test.ts#exits 1 on the measured CR-01 fail-open: an argument AND a provider-named variable present"
        status: pass
      - kind: other
        ref: "RESEND_API_KEY=probe-value-not-a-real-key node scripts/refuse-mail-credential.mjs <decoy> → EXIT=1 (was EXIT=0)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Attaching `continue-on-error: true` or an `if:` to the job OR to any step of `gate-e2e` turns the checker red with the offending step named (CR-02)"
    requirement: "CI-01"
    verification:
      - kind: other
        ref: "four mutation harnesses (Task 2 <verify> #3-#6) → CHECKER-EXIT=1 each; evidence names the refusal step / Seed the demo catalogue / job-level true"
        status: pass
      - kind: other
        ref: "unnamed-step probe → conditional/soft steps=[step[2]], proving the FULL-list index fallback"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both hard stops (unreadable source, unparseable declaration) are reachable and tested without an argument, via a temp-directory script copy"
    verification:
      - kind: unit
        ref: "tests/design/mail-credential-refusal.test.ts#exits 1 naming the source path when the prefix declaration cannot be PARSED"
        status: pass
      - kind: unit
        ref: "tests/design/mail-credential-refusal.test.ts#exits 1 naming the missing path when the prefix source cannot be READ at all"
        status: pass
    human_judgment: false
  - id: D5
    description: "The invariant total is still 48 and the `ci` section still 29, because two invariants were tightened and none added"
    requirement: "CI-01"
    verification:
      - kind: other
        ref: "node scripts/verify-workflows.mjs → `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8)`; --section=ci → `All 29 invariants hold across 1 section(s) (ci=29).`"
        status: pass
    human_judgment: false
  - id: D6
    description: "No sentence in `scripts/refuse-mail-credential.mjs`'s header or `.github/workflows/ci.yml`'s invariant list claims coverage that no conjunct or test case beside it implements"
    verification:
      - kind: other
        ref: "grep -c \"Invariant A asserts that\" scripts/refuse-mail-credential.mjs → 0; Task 3's per-sentence enforcer table below"
        status: pass
    human_judgment: true
    rationale: "The grep proves the one known false claim is gone and every added sentence was checked against the tree by hand, but 'this prose claims only what the code enforces' is a reading judgment no assertion makes — it is the exact link the plan names as unverifiable by a passing check."
  - id: D7
    description: "`ci.yml` changed by comment lines only — no job, step, `run:`, `env:` key, service, container option or timeout moved"
    verification:
      - kind: other
        ref: "git diff -U0 -- .github/workflows/ci.yml → every added/removed line begins with `#`"
        status: pass
    human_judgment: false

duration: 12 min
completed: 2026-09-04
status: complete
---

# Phase 19 Plan 13: Make the Guard's Guard Real Summary

**The mail refusal's invocation is now pinned by exact equality and its `argv[2]` prefix-source override is deleted, and `gate-e2e`'s "unconditional" invariant is promoted from the job to every step — both closed with the invariant total held at 48 and each tightening watched RED under a real, reverted `ci.yml` mutation.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-04T15:58:38Z
- **Completed:** 2026-09-04T16:10:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- **CR-01 closed on both sides.** Invariant A gained a fifth conjunct — `e2eMailRun.trim() === MAIL_REFUSAL_RUN` — so an appended argument on the refusal step's `run:` is red; and `scripts/refuse-mail-credential.mjs` refuses any argument before it reads a file or the environment, with its prefix source derived solely from `fileURLToPath(new URL("./verify-workflows.mjs", import.meta.url))`. Two independent locks, neither the only one.
- **CR-02 closed by promotion, not by a sibling check.** The `unconditional` invariant now quantifies over the job AND every step of `gate-e2e`, reporting offenders in declared order with a `step[<index>]` fallback computed from the FULL step list.
- **The false coverage claim is deleted, not marked.** `grep -c "Invariant A asserts that" scripts/refuse-mail-credential.mjs` returns `0` (it returned `1` at plan start). Its replacement names Invariant A's exact-invocation conjunct and design-test cases 7 and 8 — both of which exist in the tree.
- **The design suite went 5 → 8 cases**, all build-blocking via `npm run build`; case 8 is the measured CR-01 fail-open verbatim.
- **Twelve reds now stand behind this file's invariant list** — 19-12's six plus 19-13's six — each applied, measured, restored byte-identical, and followed by an empty `git status --porcelain .github/workflows/`.

## Task Commits

1. **Task 1 (RED): the measured CR-01 fail-open becomes a build-blocking case** — `e1ccad3` (test)
2. **Task 1 (GREEN): the refusal's invocation is pinned and its argument is gone** — `9979ce9` (feat)
3. **Task 2: "unconditional" promoted from the job to every step of gate-e2e** — `1eab50a` (feat)
4. **Task 3: the invariant list describes the two invariants that changed** — `c9aa790` (docs)

**Plan metadata:** see the `docs(19-13)` commit that carries this SUMMARY.

_Task 1 is `tdd="true"`; RED and GREEN are separate commits. No REFACTOR commit — nothing to clean up._

## Files Created/Modified

- `scripts/refuse-mail-credential.mjs` — argument refusal added as the first executable statement; `process.argv[2] ??` deleted from `prefixSource`; the `Usage:` block rewritten to name its two real enforcers; the READ hard stop's now-false `fix the path in ci.yml` remedy corrected.
- `scripts/verify-workflows.mjs` — new module-scope `MAIL_REFUSAL_RUN` composed from `MAIL_REFUSAL_SCRIPT`; Invariant A gained the exact-equality conjunct, a renamed invariant string (`exact invocation, NO ARGUMENTS`), an `expected-run=` evidence field and a comment paragraph recording the superseded conjunct; the `unconditional` check gained a `conditionalSteps` binding, a third predicate conjunct, a renamed invariant string, an extended evidence line and a comment paragraph.
- `tests/design/mail-credential-refusal.test.ts` — new `withScriptCopy` and `withDecoySource` helpers; case 4 replaced (PARSE stop via script copy), cases 5, 7, 8 added; header paragraph recording the removal.
- `.github/workflows/ci.yml` — comment lines only: entries 3 and 5 falsified in place, the red-count sentence extended, the invariant-total clause added, the D-14 runtime bullet extended.

## The Nine (Twelve) Observed Reds — verbatim, not paraphrased

### (a) The two new design-test cases failing against the PRE-change script

```
 FAIL  tests/design/mail-credential-refusal.test.ts > the mail-credential refusal reads the environment the job actually has > refuses ANY argument outright, and never reports a completed scan after one
AssertionError: stdout:
refuse-mail-credential: prefix=ZZUNUSED read from C:\Users\Admin\AppData\Local\Temp\mail-prefix-decoy-664-1788537732195.mjs — scanned 12 environment variable name(s), 0 begin with it.

stderr:
: expected +0 to be 1 // Object.is equality

- Expected
+ Received

- 1
+ 0

 FAIL  tests/design/mail-credential-refusal.test.ts > the mail-credential refusal reads the environment the job actually has > exits 1 on the measured CR-01 fail-open: an argument AND a provider-named variable present
AssertionError: stdout:
refuse-mail-credential: prefix=ZZUNUSED read from C:\Users\Admin\AppData\Local\Temp\mail-prefix-decoy-664-1788537732269.mjs — scanned 13 environment variable name(s), 0 begin with it.

stderr:
: expected +0 to be 1 // Object.is equality

- Expected
+ Received

- 1
+ 0

 Test Files  1 failed (1)
      Tests  2 failed | 6 passed (8)
```

Both cases observed **exit 0** against the pre-change script, and case 8 observed it with a provider-named variable live in the child environment — the measured fail-open, reproduced as a test before it was fixed.

### (b) The argument-injection harness — BEFORE and AFTER Task 1

Before (the defect, reproduced on this tree):

```
CHECKER-EXIT=0
(NO FAIL LINE)
```

After:

```
CHECKER-EXIT=1
  FAIL  "gate-e2e"'s mail refusal reads the REAL process environment — no ${{ }} expression, no env: map, exact invocation, NO ARGUMENTS
```

`git status --porcelain .github/workflows/` was empty after both runs.

### (c) The refusal script's stdout and exit code for the argument-plus-violating-variable invocation

**BEFORE Task 1** (`RESEND_API_KEY=probe-value-not-a-real-key node scripts/refuse-mail-credential.mjs C:\Users\Admin\AppData\Local\Temp\decoy.mjs`):

```
refuse-mail-credential: prefix=ZZUNUSED read from C:\Users\Admin\AppData\Local\Temp\decoy.mjs — scanned 83 environment variable name(s), 0 begin with it.
EXIT=0
```

**AFTER Task 1**, same invocation:

```
::error::This script takes NO ARGUMENTS, and refuses to run with any.
::error::Received: C:\Users\Admin\AppData\Local\Temp\decoy.mjs
::error::Its mail-provider prefix is resolved from this script's OWN location and
::error::cannot be redirected by input. The override this replaces was MEASURED as a
::error::fail-open: a decoy prefix source scanned for a prefix of the editor's choosing
::error::reported CLEAN while a provider-named variable was live in the environment
::error::(19-VERIFICATION.md, review finding CR-01).
::error::Fix: remove the argument. Never restore the override.
EXIT=1
```

The no-argument path is unchanged and still names the variable without its value:

```
::error::Offending variable NAME(s): RESEND_API_KEY  (values deliberately not printed)
EXIT=1
```

### (d) The four condition/soft-failure harnesses (Task 2), with evidence lines

```
--- 1 refusal step continue-on-error  CHECKER-EXIT=1
  FAIL  "gate-e2e" is unconditional — no if:, no continue-on-error: true, on the JOB or on ANY STEP
          job if=null  job continue-on-error=null  conditional/soft steps=[Refuse to run the suite with a live mail credential in the environment]  (of 7 steps)
--- 2 refusal step if: false  CHECKER-EXIT=1
  FAIL  "gate-e2e" is unconditional — no if:, no continue-on-error: true, on the JOB or on ANY STEP
          job if=null  job continue-on-error=null  conditional/soft steps=[Refuse to run the suite with a live mail credential in the environment]  (of 7 steps)
--- 3 Seed step continue-on-error  CHECKER-EXIT=1
  FAIL  "gate-e2e" is unconditional — no if:, no continue-on-error: true, on the JOB or on ANY STEP
          job if=null  job continue-on-error=null  conditional/soft steps=[Seed the demo catalogue]  (of 7 steps)
--- 4 JOB-level continue-on-error  CHECKER-EXIT=1
  FAIL  "gate-e2e" is unconditional — no if:, no continue-on-error: true, on the JOB or on ANY STEP
          job if=null  job continue-on-error=true  conditional/soft steps=[(none)]  (of 7 steps)
```

Plus a fifth, unplanned probe proving the `step[<index>]` fallback uses the FULL-list index (the mutated step is `- run: npm ci`, the job's third step):

```
CHECKER-EXIT=1
  FAIL  "gate-e2e" is unconditional — no if:, no continue-on-error: true, on the JOB or on ANY STEP
          job if=null  job continue-on-error=null  conditional/soft steps=[step[2]]  (of 7 steps)
```

### (e) The green re-run after every restore, and the empty tree

```
=== git status --porcelain .github/workflows/ ===
(empty above = clean)
All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8).
```

Final state on the committed tree:

```
=== 1. checker ===
All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8).
=== 2. design suite ===
 Test Files  1 passed (1)
      Tests  8 passed (8)
=== 3. argument injection harness ===
CHECKER-EXIT=1
  FAIL  "gate-e2e"'s mail refusal reads the REAL process environment — no ${{ }} expression, no env: map, exact invocation, NO ARGUMENTS
=== 4. full tree status (code paths) ===
(empty above = clean)
=== 5. lint ===
LINT OK
```

The green `ok` lines for the two tightened invariants:

```
  ok    "gate-e2e"'s mail refusal reads the REAL process environment — no ${{ }} expression, no env: map, exact invocation, NO ARGUMENTS
  ok    "gate-e2e" is unconditional — no if:, no continue-on-error: true, on the JOB or on ANY STEP
          job if=null  job continue-on-error=null  conditional/soft steps=[(none)]  (of 7 steps)
```

## Task 3 — every sentence added to `ci.yml`'s header, with what enforces it

This table IS Task 3's deliverable. An entry with no enforcer would be the defect this plan exists to stop repeating.

| # | Sentence added to `ci.yml` | Enforced by |
|---|---|---|
| 1 | Entry 3: "the check quantifies over the JOB *AND EVERY STEP* of `gate-e2e`" | `scripts/verify-workflows.mjs`'s `conditionalSteps.length === 0` conjunct; watched red by harnesses 1–4 |
| 2 | Entry 3: "its evidence line names each offending step in declared order (`step[<index>]` for an unnamed one)" | the evidence string `conditional/soft steps=[…]`; observed naming the refusal step, `Seed the demo catalogue`, and `step[2]` |
| 3 | Entry 3: "19-VERIFICATION.md added `continue-on-error: true` … and watched all 48 invariants stay green" | 19-VERIFICATION.md's second `gaps:` entry (a recorded measurement, re-reproduced here as harness 1's pre-fix analogue) |
| 4 | Entry 5: "FIVE conjuncts" | Invariant A's `ok` expression: step exists, `trim() === MAIL_REFUSAL_RUN`, no `${{`, `includes(MAIL_REFUSAL_SCRIPT)`, `env === undefined` |
| 5 | Entry 5: "comparing this step's `run:` for EXACT equality with the no-argument invocation, so `node <script> <anything>` is red" | the `e2eMailRun.trim() === MAIL_REFUSAL_RUN` conjunct; watched red by the argument-injection harness (CHECKER-EXIT=1) |
| 6 | Entry 5: "NO ARGUMENTS is a checked property now, not a documented intention" | the same conjunct, plus design-test cases 7 and 8 (`8 passed`) |
| 7 | Entry 5: "The `run:` conjunct was a CONTAINMENT test, which every argument list in the world satisfies" | the superseded `e2eMailRun.includes(MAIL_REFUSAL_SCRIPT)` line in git history (`9979ce9^`); measured at CHECKER-EXIT=0 before the fix |
| 8 | Closing paragraph: "PLAN 19-13 ADDED SIX MORE, for TWELVE observed reds in total" — six enumerated | the six harness runs recorded in section (b) and (d) above, each with its `CHECKER-EXIT` |
| 9 | Closing paragraph: "restored byte-identical, and followed by an empty `git status --porcelain .github/workflows/`" | the `git status --porcelain .github/workflows/` gate run after every harness; empty each time |
| 10 | Closing paragraph: "THE LIST STAYS SEVEN AND THE TOTAL STAYS 48, ON PURPOSE … no `check()` was added and none was dropped" | `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8)`; seven numbered entries confirmed by grep |
| 11 | D-14 bullet: "IT TAKES NO ARGUMENTS, refusing any before it reads a file or the environment" | the `process.argv.length > 2` guard placed before both reads; design-test case 7 asserts no completed-scan line follows |
| 12 | D-14 bullet: "its prefix source is resolved from the script's own location and cannot be redirected by input" | `const prefixSource = fileURLToPath(new URL("./verify-workflows.mjs", import.meta.url));`; design-test cases 4 and 5 reach both hard stops only by MOVING the script |
| 13 | D-14 bullet: "enforced … by Invariant A's exact-invocation conjunct (entry 5 above) and … by cases 7 and 8 of `tests/design/mail-credential-refusal.test.ts`, which `npm run build` runs" | both named artifacts exist; `package.json`'s `"build": "npm run lint && npm run test:design && next build"` and `vitest.design.config.ts`'s `include: ["tests/design/**/*.test.ts", …]` |

## Decisions Made

1. **The argument was removed, not gated.** 19-REVIEW.md's CR-01 sketch offered two shapes: gate `argv[2]` behind `MAIL_REFUSAL_ALLOW_SOURCE_OVERRIDE=1`, or delete it and move the test onto a temp-directory copy. The plan's `<assumption_delta_decision>` chose deletion and this execution followed it — a test-only escape hatch that the thing being guarded against can also use is not a harness, it is the hole.
2. **Cases 7 and 8 pass a decoy that PARSES.** The plan's action text said "a path under `tmpdir()` that need not exist", but its own acceptance criterion requires both cases to observe **exit 0** against the pre-change script. A non-existent path would have hit the pre-change READ hard stop and exited 1 — the cases would have passed pre-change and there would have been no RED at all. A decoy carrying `const MAIL_KEY_PREFIX = "ZZUNUSED";` is the shape 19-VERIFICATION.md actually measured, so it is what the tests use. "Need not exist" permits existence; the acceptance criterion does not permit a false green.
3. **The red count in `ci.yml` says TWELVE, not the plan's projected "nine".** The plan explicitly instructs stating the observed count rather than copying its arithmetic. 19-12 recorded six; 19-13 applied six (argument injection, refusal-step `continue-on-error`, refusal-step `if: false`, seed-step `continue-on-error`, job-level `continue-on-error`, unnamed-step `continue-on-error`). Six plus six is twelve.
4. **A fifth mutation was added to Task 2's four.** The plan's acceptance criterion asserts the `step[<index>]` fallback uses the FULL-list index. Reading the code proves that; running it proves it fired. Since "presence of a conjunct is not evidence the conjunct fires" is this plan's whole thesis, the probe was run — it printed `conditional/soft steps=[step[2]]` for the job's third step.
5. **The review's `conditionalSteps` sketch was corrected before use.** 19-REVIEW.md's snippet is `.filter(…).map((s, i) => …)`, whose `i` is the FILTERED index — so a lone unnamed offender at step 5 would report `step[0]`. The implementation maps with the index first, then filters, per the plan's explicit requirement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] The READ hard stop's remedy sentence became false when the argument was removed**

- **Found during:** Task 1 (script edit)
- **Issue:** `scripts/refuse-mail-credential.mjs`'s unreadable-source branch printed `Restore the file, or fix the path in ci.yml.` After the argument's deletion there is no path in `ci.yml` to fix — the source is derived from `import.meta.url`. Left as-is, this is a shipped instruction that cannot be followed, in the same file and on the same day as the false coverage claim this plan exists to delete. It is the defect class, one line down.
- **Fix:** Replaced with `The path is derived from this script's own location and cannot be overridden, so the fix is to restore that sibling file.`
- **Files modified:** `scripts/refuse-mail-credential.mjs`
- **Verification:** design-test cases 4 and 5 exercise this exact branch (`8 passed`); Invariant B still green (no prefix-value copy introduced).
- **Committed in:** `9979ce9` (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical).
**Impact on plan:** None on scope — the correction is inside a declared `files_modified` file, is two lines of `::error::` text, and closes the same false-claim class the plan's own prohibition names. No scope creep; no fifth file touched.

## Issues Encountered

None. Every gate passed on first or second run; no fix-attempt limit was approached.

**Free rider, as the plan predicted and named in advance:** 19-REVIEW.md's WR-03 observation that the script's unreadable-source hard stop had no test is now closed — design-test case 5 (`exits 1 naming the missing path when the prefix source cannot be READ at all`) exercises it. This is a consequence of the required harness restructure, not added scope.

## Known Stubs

None. No hardcoded empty value, placeholder string, `TODO`, `FIXME`, or unwired component was introduced. All four files carry executable, asserted behaviour.

## Threat Flags

None. No file in this plan introduces a network endpoint, auth path, file-access pattern or schema change. `scripts/refuse-mail-credential.mjs`'s only file read is now a location-derived constant path, which strictly REDUCES the surface the plan's `<threat_model>` recorded as T-19-13-05 (path traversal via an attacker-controlled path).

## Out of Scope, Carried Forward Rather Than Dropped

- **`.planning/REQUIREMENTS.md` is byte-unchanged.** CI-01's traceability cell already reads `Complete`; 19-VERIFICATION.md flagged that as not yet earned. Closing both gaps is what earns it. Flipping the cell to `Gaps Found` and back inside one plan would be churn.
- **19-REVIEW.md WR-01 (`ConfirmDialog` handlers lack `try`/`catch`) and WR-04 (~11 stale `<file>:<line>` citations)** — outside this plan's four files; nothing under `src/` was touched.
- **19-REVIEW.md WR-02 (`process.exit()` after `console.log` can truncate annotations), WR-03 (the PARSE half does not walk `job.container.env` / `job.services.*.env`), and WR-04 (Invariant B checks the pattern's TEXT, not its USE)** — none appears in either gap's authoritative `missing:` block.
- **The two `human_verification` items in 19-VERIFICATION.md** — the PM's reconfirmation of CI-01's closure state (D-15's unreachable branch protection, the permanently-red `ci` run) and the human read of the D-03 grid notice copy. Recorded PM/UX calls, not tasks.

## User Setup Required

None — no external service configuration required. Zero packages installed; `package.json` untouched.

## Next Phase Readiness

- Both reproduced blockers (CR-01, CR-02) are closed, each proven by a mutation that was applied, measured, and reverted rather than reasoned about.
- The invariant suite is ready for re-verification. The re-verifier's cheapest reproduction is the two harnesses in section (b) and (d) — they should now print `CHECKER-EXIT=1`, where the previous round printed `CHECKER-EXIT=0`.
- **Remaining CI-01 blocker is not an engineering one:** `gate-e2e` still reports rather than blocks (branch protection returns 403 on this GitHub plan), and the `ci` run is red on every push because of 14 pre-existing e2e failures. That is the recorded PM decision carried forward unchanged from two verification rounds.

## Self-Check: PASSED

- `scripts/refuse-mail-credential.mjs` — FOUND (git-tracked, imports only `node:` builtins)
- `scripts/verify-workflows.mjs` — FOUND
- `tests/design/mail-credential-refusal.test.ts` — FOUND (8 `it()` blocks, `8 passed`)
- `.github/workflows/ci.yml` — FOUND (comment-only diff confirmed)
- Commits `e1ccad3`, `9979ce9`, `1eab50a`, `c9aa790` — all FOUND in `git log`
- `node scripts/verify-workflows.mjs` — `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8)`, exit 0
- `git status --porcelain scripts/ tests/ .github/` — empty

---
*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Completed: 2026-09-04*
