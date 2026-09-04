---
phase: 19-host-listing-surfaces-gates-that-actually-run
plan: 15
subsystem: infra
tags: [github-actions, ci, workflow-invariants, mail-credential, d-14, gap-closure, vitest, design-gate, triggers, execution-defaults, mutation-testing]

requires:
  - phase: 19-14
    provides: "the standing instrument (`tests/design/workflow-invariants.test.ts`), its `EXPECTED_GREEN` control constant — the single place the total is spelled in that file — and the seven-entry `gate-e2e` invariant list this plan extends to eight"
  - phase: 19-12
    provides: "D-14's runtime refusal script whose two failure messages this plan corrects, and Invariant B (prefix-spelled-once) which constrains every edit to that file"
provides:
  - "a `ci` section check asserting `ci.yml` runs on BOTH push and pull_request — the trigger `triggersOf(doc)` was read for the diagnostic printout and never compared, so deleting `pull_request:` detached every gate in the file from pull requests at all 48 invariants green"
  - "a `ci` section check forbidding a `defaults:` block at workflow level AND on `gate-e2e` — the OUTER half of the custom-shell finding, at the two levels a step-key allow-list cannot see and that a repository-wide grep proved were read nowhere in the checker"
  - "one summary line in three files: `All 50 invariants hold across 3 section(s) (baselines=11, ci=31, cross=8).` is byte-identical in the checker's output, `ci.yml`'s count paragraph and the design test's control constant"
  - "three new standing mutation cases (10, 11, 12), each observed RED against the pre-change checker with the checker exiting 0"
  - "`scripts/refuse-mail-credential.mjs` names no input its scan cannot see and echoes no caller-controlled content into a build log"
affects: [ci, workflow-verification, mail-privacy, d-14, gate-e2e, design-gate]

actuals:
  tokens: 6800
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Two assertions over the same YAML key in two files may be deliberately OPPOSITE shapes, and each states its reason at its own site — exact-set on a write path where an ADDED entry is the danger, membership on a compare path where a MISSING entry is the danger. Documented as a decision so a future reader cannot 'harmonise' them and silently break one"
    - "Emptiness is red where absence is the failure and green where absence IS the property, and the two are distinguished at the site: `triggersOf` returns `[]` for an absent `on:` block so the trigger check is FALSE rather than vacuously true, while `undefined` is the ONLY passing value for a `defaults:` block so a present-but-empty one is red"
    - "A documented invariant COUNT and the count that produces it are made the SAME BYTES across every file that states either, so drift between them is a build-blocking red rather than a sentence nobody re-reads"
    - "A control's failure message names only input classes the adjacent code can actually observe, and names its own blind spot together with the assertion elsewhere that covers it"
    - "A rule a file states about itself binds every line of that file, `argv` included — the diagnostic is the COUNT, never the caller-controlled content"

key-files:
  created: []
  modified:
    - scripts/verify-workflows.mjs
    - .github/workflows/ci.yml
    - tests/design/workflow-invariants.test.ts
    - scripts/refuse-mail-credential.mjs
    - tests/design/mail-credential-refusal.test.ts

key-decisions:
  - "The trigger check asserts MEMBERSHIP, not set equality, and the `baselines` section keeps its EXACT comparison — deliberately opposite shapes with the reason for each stated at its own site. `baselines.yml` is the write path where an ADDED trigger turns the one job that can commit baselines into a job that regenerates them on every push; `ci.yml` writes nothing, so an added `workflow_dispatch` is harmless and a MISSING trigger is the whole danger. An exact set on `ci.yml` would redden a correct file the day somebody adds a manual dispatch, which is how a correct check gets deleted rather than fixed."
  - "The execution-defaults check forbids the WHOLE `defaults:` block at each level rather than naming `run.shell` inside it. Naming one key would be the deny-list shape reasserting itself at a new level, against a failure class that is by definition 'an attribute the checker does not know about'. `undefined` is the only passing value, so a present-but-empty block is red — a block that exists is a block a later edit can fill inside an already-accepted structure."
  - "Scoped to the workflow and to `gate-e2e`, not to every job. A `defaults:` block on an unrelated job cannot change how `gate-e2e` executes, and a wider assertion would redden a correct file the day somebody legitimately sets a working directory elsewhere."
  - "`withJobKey` was extended to accept a block of lines rather than adding a third builder, so the lines are joined with the EOL detected from the file being mutated. A caller joining with `\\n` would write LF into a CRLF copy and make the red red for the wrong reason."
  - "The `ci.yml` count paragraph QUOTES the checker's summary line verbatim on its own line rather than paraphrasing the number, so the documented count and the printed count are literally the same bytes and the three-way gate can prove it."
  - "`.planning/REQUIREMENTS.md` WAS updated, contrary to the plan's assumptions block — because that block's premise was stale. It asserted CI-01's row 'already reads `Complete` while CI-01 was only PARTIALLY SATISFIED', so flipping it would be churn. On the actual tree the row read `Gaps Found` and the body checkbox was unticked: the verifier had flipped it back after the 19-13 round. The two gaps that caused that flip are the two this plan closes, so the marking step was run as execute-plan.md directs. Recorded as a deviation rather than absorbed."

patterns-established:
  - "A count change and every sentence documenting it move in ONE commit, with the printed line quoted verbatim in the documentation and pinned in a control-case constant — three copies of one number, made byte-identical on purpose"
  - "Present-tense assertions of a total are rewritten; HISTORICAL records of what a past measurement observed are byte-preserved, and the gate that proves the rewrite happened is scoped narrowly enough to distinguish the two"

requirements-completed: [CI-01]

coverage:
  - id: D1
    description: "Deleting `pull_request:` from `ci.yml`'s `on:` block turns the checker red with a FAIL line naming the trigger invariant — the one-line edit that falsifies CI-01's literal requirement text and was reproduced at all 48 invariants green"
    requirement: "CI-01"
    verification:
      - kind: unit
        ref: "tests/design/workflow-invariants.test.ts#case 12: deleting the pull_request trigger is red"
        status: pass
      - kind: other
        ref: "observed RED against the pre-change checker with CHECKER-EXIT=0 and the summary line unchanged at 48 (verbatim below)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A `defaults:` block at workflow level or on `gate-e2e` turns the checker red — the OUTER half of the custom-shell finding, at the two levels a step-key allow-list is blind to by construction"
    requirement: "CI-01"
    verification:
      - kind: unit
        ref: "tests/design/workflow-invariants.test.ts#case 10: a workflow-level defaults: block is red"
        status: pass
      - kind: unit
        ref: "tests/design/workflow-invariants.test.ts#case 11: a job-level defaults: block on gate-e2e is red"
        status: pass
      - kind: other
        ref: "both observed RED against the pre-change checker with CHECKER-EXIT=0 (verbatim below)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The invariant total is 50 / ci=31, and the same summary line is byte-identical in the checker's output, `ci.yml`'s count paragraph and `EXPECTED_GREEN`"
    requirement: "CI-01"
    verification:
      - kind: other
        ref: "node scripts/verify-workflows.mjs → `All 50 invariants hold across 3 section(s) (baselines=11, ci=31, cross=8).`, exit 0, 0 FAIL lines"
        status: pass
      - kind: other
        ref: "three-way byte gate → ci.yml=1, workflow-invariants.test.ts=1"
        status: pass
      - kind: unit
        ref: "tests/design/workflow-invariants.test.ts#case 1 (control): pins the new line as an exact string"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both increments trace to a named gap and no third check rode along; no present-tense sentence still asserts 48 or ci=29, and the historical all-48-green records are byte-unchanged"
    requirement: "CI-01"
    verification:
      - kind: other
        ref: "stale-count gate → STALE-COUNT-HITS=0 across all three count-bearing files"
        status: pass
      - kind: other
        ref: "git diff 01c993d..HEAD -- scripts/verify-workflows.mjs | added `  check(` lines = 2, removed = 0"
        status: pass
      - kind: other
        ref: "git diff removed-lines matching `48 invariants` = 1, and it is EXPECTED_GREEN — every historical sentence survives (ci.yml 4 pre-existing, verify-workflows.mjs 4 pre-existing, mail-credential-refusal.test.ts 1)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Neither message in `scripts/refuse-mail-credential.mjs` names an input the scan cannot see or prints caller-controlled content into a build log"
    requirement: "CI-01"
    verification:
      - kind: other
        ref: "WR03-CLAIM-HITS=0, WR04-ECHO-HITS=0, PREFIX-COPIES=0"
        status: pass
      - kind: unit
        ref: "tests/design/mail-credential-refusal.test.ts → 8 passed, case 6 (never prints a VALUE) and cases 7/8 (argument refusal) unregressed"
        status: pass
      - kind: other
        ref: "both branches executed and their rendered output read back against the adjacent code (per-line enforcer table below)"
        status: pass
    human_judgment: true
    rationale: "The gates prove the false claim is gone, no `argv` content is echoed and no prefix copy was introduced. But 'every replacement line is substantiated by the code beside it' is a reading judgment no assertion makes — it is the exact link this phase names as unverifiable by a passing check. The per-line enforcer table below is the audit trail for that judgment."
  - id: D6
    description: "The sibling design test compares paths that can actually be equal on every platform it runs on"
    verification:
      - kind: other
        ref: "REALPATH-WRAPPED=true"
        status: pass
      - kind: unit
        ref: "tests/design/mail-credential-refusal.test.ts#cases 4 and 5 (the two path-comparing cases) → pass"
        status: pass
    human_judgment: true
    rationale: "The defect (IN-02) is a macOS-only symlinked-temp-directory divergence. This machine is Windows and CI is Linux, so neither can observe the failing state the fix removes — the fix is correct by construction (`realpathSync` matches the string source the script prints) but its motivating condition is unreproducible here."
  - id: D7
    description: "`ci.yml` changed by comment lines only across the whole plan; nothing under `src/` touched; no package installed"
    verification:
      - kind: other
        ref: "git diff -U0 01c993d..HEAD -- .github/workflows/ci.yml | (non-`#` lines) | wc -l → 0"
        status: pass
      - kind: other
        ref: "git status --porcelain -- .github/workflows/ src/ → empty after every task"
        status: pass
    human_judgment: false
  - id: D8
    description: "The whole design suite is green and unregressed"
    verification:
      - kind: unit
        ref: "npx vitest run --config vitest.design.config.ts → 78 files, 1367 passed, 3 skipped (the 3 skips are pre-existing and in unrelated files)"
        status: pass
      - kind: other
        ref: "npx eslint over all four touched source files → no output"
        status: pass
    human_judgment: false

duration: 24 min
completed: 2026-09-05
status: complete
---

# Phase 19 Plan 15: The Trigger Nothing Compared and the Block Nothing Read Summary

**The two assertions that genuinely did not exist — `ci.yml` runs on BOTH push and pull_request, and neither the workflow nor `gate-e2e` declares a `defaults:` block at all — land with the count debt paid in full: 48 → 50 and ci 29 → 31, with one summary line made byte-identical across the checker's output, `ci.yml`'s count paragraph and the design test's control constant.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-09-04T17:14:00Z
- **Completed:** 2026-09-04T17:38:00Z
- **Tasks:** 2
- **Files modified:** 5 (0 created, 5 modified)

## Accomplishments

- **The trigger CI-01 is literally about is now asserted.** `triggersOf(doc)` was read in the `ci` section for the `parsed values (ci)` printout and nowhere else — never compared. Deleting one line detached every gate in `ci.yml`, `gate-e2e` included, from pull requests while the checker reported full green. It is now red with a named FAIL line, proven by a standing case.
- **The outer half of the custom-shell finding is closed.** A `defaults: { run: { shell: … } }` at workflow or job level hands every step's `run:` body to that command instead of executing it, while putting no key on the step — so 19-14's allow-list is blind to it by construction. The whole block is forbidden at both levels, `undefined` the only passing value.
- **The count moved, and every sentence documenting it moved in the same commit.** `EXPECTED_GREEN`, `ci.yml`'s list length (seven → eight), its case count (nine → twelve), and its fixed-count paragraph — which now quotes the checker's summary line verbatim on its own line, so the documented count and the printed count are the same bytes.
- **Three carried-forward review warnings closed** in the D-14 script family: a false coverage claim (WR-03), a build-log disclosure (WR-04) and a cross-platform test flake (IN-02).
- **Exactly two `check()` calls added, zero removed** — proven mechanically, not asserted.

## Task Commits

1. **Task 1 (RED): three cases for invariants that do not exist yet** — `f0051b2` (test)
2. **Task 1 (GREEN): the trigger check, the defaults check, and every count sentence** — `97a04a1` (feat)
3. **Task 2: three carried-forward warnings** — `23261a5` (fix)

## Files Created/Modified

- `scripts/verify-workflows.mjs` — the trigger `check()` in the `ci` section's file-level neighbourhood with the `ciTriggers` binding; the execution-defaults `check()` immediately after the unconditional check inside the `gate-e2e` block; two comment blocks carrying the measurement, the consequence and the deliberate asymmetry.
- `.github/workflows/ci.yml` — **comment lines only.** Invariant-list entry 8 (new), the list length seven → eight, a new top-level bullet for the trigger assertion, the case count nine → twelve, and the fixed-count paragraph rewritten to quote the new summary line verbatim.
- `tests/design/workflow-invariants.test.ts` — `withWorkflowLevelBlock`, `withoutPullRequestTrigger`, `withJobKey` extended to accept a block, two new invariant-name fragments, cases 10/11/12, and `EXPECTED_GREEN`.
- `scripts/refuse-mail-credential.mjs` — the environment-hit message rewritten (WR-03), the argument-refusal echo replaced by a count (WR-04).
- `tests/design/mail-credential-refusal.test.ts` — `realpathSync(mkdtempSync(...))` plus the import and a comment naming the macOS case (IN-02).

---

## VERBATIM EVIDENCE

### Cases 10, 11 and 12 failing against the PRE-change checker (Task 1 RED)

```
     × case 10: a workflow-level defaults: block is red 198ms
     × case 11: a job-level defaults: block on gate-e2e is red 194ms
     × case 12: deleting the pull_request trigger is red 203ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: the checker exited 0 under a mutation that should be RED.
AssertionError: the checker exited 0 under a mutation that should be RED.
AssertionError: the checker exited 0 under a mutation that should be RED.

 Test Files  1 failed (1)
      Tests  3 failed | 9 passed (12)
```

**All three: observed exit code 0.** The spawned checker's stdout in each of the three failures ended with:

```
All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8).
```

Case 1 (the control) and the other eight 19-14 cases passed in the same run, so the copied tree was a faithful subject and the three reds were red for their own reason — not for a truncated copy or an absent sibling workflow. None of the three produced any FAIL line at all before the change: they were invisible to every one of the 48 invariants.

### The checker's summary line, before and after Task 1

| Point | Output | Exit |
|---|---|---|
| Precondition (before Task 1) | `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8).` | 0 |
| After Task 1 | `All 50 invariants hold across 3 section(s) (baselines=11, ci=31, cross=8).` | 0 |
| After Task 2 | `All 50 invariants hold across 3 section(s) (baselines=11, ci=31, cross=8).` | 0 |

`FAIL-LINES=0` at every point after the change.

### The three-way byte gate

```
.github/workflows/ci.yml=1
tests/design/workflow-invariants.test.ts=1
```

Both files carry `All 50 invariants hold across 3 section(s) (baselines=11, ci=31, cross=8)` verbatim, and the checker prints it. Three copies of one number, the same bytes.

### The stale-count gate, in full

```
STALE-COUNT-HITS=0
```

No offending file/phrase line was printed above the total — `STAYS 48` and `ci=29` each return 0 across `.github/workflows/ci.yml`, `scripts/verify-workflows.mjs` and `tests/design/workflow-invariants.test.ts`.

### `git diff` confirmation that the historical all-48-green sentences are byte-unchanged

Removed lines matching `48 invariants` across all five files in scope: **exactly one**, and it is the pin that was supposed to move.

```
-const EXPECTED_GREEN = "All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8).";
```

Surviving occurrences of `48 invariants`, none of them touched:

```
.github/workflows/ci.yml:5
scripts/verify-workflows.mjs:5
tests/design/mail-credential-refusal.test.ts:1
```

Four in `ci.yml` and four in `verify-workflows.mjs` are the pre-existing historical records the plan named as protected (`watched all 48 invariants stay green`); the fifth in each is a NEW historical sentence this plan authored, recording WR-01's own measurement. `mail-credential-refusal.test.ts`'s single occurrence — its header sentence — is byte-unchanged, confirmed by that file's complete removed-line set being exactly two lines, neither of them it:

```
-import { copyFileSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
-  const dir = mkdtempSync(join(tmpdir(), "mail-refusal-"));
```

### Exactly two checks added, none removed

```
added `  check(` lines   = 2
removed `  check(` lines = 0
```

Measured over `git diff -U0 01c993d..HEAD -- scripts/verify-workflows.mjs`. A total of 51 would have meant a third check rode along; 49, that only one landed.

### The four Task 2 gates

```
WR03-CLAIM-HITS=0
WR04-ECHO-HITS=0
REALPATH-WRAPPED=true
PREFIX-COPIES=0
```

### Comments-only `git diff -U0` count for `.github/workflows/ci.yml`

```
0
```

Whole-plan (`01c993d..HEAD`), counting added and removed lines that do NOT begin with `#`. No job, step, `run:`, `env:` key, service, container option, trigger or timeout moved. The `pull_request:` trigger was asserted and never edited; every mutation lived inside a `mkdtemp` copy.

### `git status --porcelain -- .github/workflows/ src/` after every task

Empty after Task 1 and after Task 2.

---

## Task 2: every line of both rewritten message blocks, beside the code that makes it true

**The environment-hit block** (`scripts/refuse-mail-credential.mjs`, the `hits.length > 0` branch), rendered by running the script with a provider-named variable present:

| # | Line as printed | What makes it true |
|---|---|---|
| 1 | `A live mail credential is present in this job's REAL PROCESS ENVIRONMENT —` | `const names = Object.keys(process.env)` + `names.filter((name) => name.startsWith(prefix))` — the branch is reached only when that filter is non-empty, and `process.env` IS the job's real process environment |
| 2 | `not merely in the workflow's \`env:\` maps. A \`container.env\` block or a runner` | A `container.env` block populates every step's process environment, so its keys appear in `Object.keys(process.env)`; the parse half (`verify-workflows.mjs`'s mail-key scan) walks workflow/job/step `env:` only and never `container.env` — stated correctly in that file's own header, one file over |
| 3 | `variable reaches here and is invisible to the parse half.` | Same two reads. The runner environment is likewise in `process.env` and in no `env:` map the parse half walks |
| 4 | `⚠ A SECRET MAPPED UNDER A NON-PROVIDER-PREFIXED KEY IS INVISIBLE TO BOTH HALVES:` | Both halves key off the NAME: this half `startsWith(prefix)`, the parse half matches provider-prefixed `env:` KEYS. `MAILER_KEY: ${{ secrets.… }}` matches neither |
| 5 | `both key off the NAME. \`verify-workflows.mjs\`'s zero-\`secrets.\`-in-any-value` | `secretHitsIn(doc)` (`verify-workflows.mjs:232-253`) scans every workflow `env`, job `env`, `container.env`, `services.*.env`, and every step `run`/`env`/`with` VALUE for the substring `secrets.` — a value-side scan, so the key's name is irrelevant to it |
| 6 | `invariant is what covers that case — a different assertion, in a different file.` | The `ci` invariant `zero \`secrets.\` references in any env / run / with VALUE, across every job` — a different `check()` in a different file, exactly as the line says |

**The removed line and what it claimed:** `repository or environment secret, or a runner variable all reach here.` Repository, organization and environment secrets do not populate a step's process environment; they reach it only through `${{ secrets.* }}` interpolated into an `env:` or `with:` map — precisely the input the same sentence said this was *not* limited to. Nothing in the branch could observe an unmapped secret, so the claim named an input the code cannot see.

**The argument-refusal block**, rendered by `node scripts/refuse-mail-credential.mjs decoy1 decoy2`:

| # | Line as printed | What makes it true |
|---|---|---|
| 1 | `This script takes NO ARGUMENTS, and refuses to run with any.` | `if (process.argv.length > 2) { … process.exit(1) }` — unchanged |
| 2 | `Received 2 argument(s). Their VALUES are deliberately` | `process.argv.length - 2` — an arithmetic count of `argv`, with no element interpolated |
| 3 | `not echoed — the rule this file states about variable values binds argv too.` | The same file's `:40-41`: *"THIS FILE PRINTS VARIABLE NAMES AND NEVER VARIABLE VALUES."* No `argv` element appears in any remaining `console.log` — `WR04-ECHO-HITS=0` |

**Removed:** `` console.log(`::error::Received: ${process.argv.slice(2).join(" ")}`) ``. The rest of the branch — the derived-prefix-source statement, the measured fail-open reason and the `Fix:` line — is byte-unchanged, confirmed by the diff for that file containing exactly one removed `console.log`. Cases 7 and 8 needed no change: neither asserts on the echoed content (case 7 asserts the ABSENCE of the clean-scan string `0 begin with it`; case 8 asserts only exit 1), and both pass.

No line in either block could not be pointed at a specific read, filter or invariant. None had to be deleted for lack of a substantiating enforcer.

## Decisions Made

See `key-decisions` in the frontmatter. The load-bearing one is the **deliberate asymmetry between the two trigger assertions**: exact-set on `baselines.yml` (write path — an ADDED trigger regenerates the baselines it gates), membership on `ci.yml` (compare path — it writes nothing, so a MISSING trigger is the whole danger and an added `workflow_dispatch` is harmless). Both sites now carry the reason for their own shape and an explicit instruction not to harmonise them, because a reader who made them the same would break one of the two properties while every test stayed green.

## Deviations from Plan

### Auto-fixed Issues

**None during task execution.** No deviation rule fired inside either task: both executed as written, every `<verify>` gate passed on its first run after the intended change, and no auto-fix was needed at any point. One Rule 1 deviation fired at close-out, against a stale planner assumption rather than against code — item **4** below.

### Adjustments within the plan's own instruction, recorded rather than smoothed over

**1. `withJobKey` was extended rather than a third builder added.**
- **Found during:** Task 1 (RED)
- **Situation:** The plan specified case 11 as "`withJobKey` writing the same `defaults:` block on `gate-e2e`", but `withJobKey` accepted a single line and a `defaults:` block is three lines deep.
- **Resolution:** `withJobKey` now accepts `string | string[]` and joins the block with `eolOf(ci)` inside its returned `mutate`, where the file's EOL is known. Backwards compatible — all four existing call sites pass a string and were not touched. This is not a fourth builder: the plan's declared additions (`withWorkflowLevelBlock`, `withoutPullRequestTrigger`) are exactly the two that landed.
- **Why the shape matters:** joining at the call site with `\n` would have written LF into a CRLF copy, making the red red for a reason unrelated to the property.

**2. One present-tense count sentence beyond the four the plan enumerated.**
- **Found during:** Task 1, step 5
- **Situation:** `ci.yml:347` read *"asserting a non-zero exit AND a named FAIL line — nine cases, inside `npm run build`"*. Not an invariant total, so the stale-count gate would not have caught it — but a present-tense count that this plan made stale.
- **Resolution:** changed to *"twelve cases as of plan 19-15"*. Leaving it would have been the same false-claim class the plan's own prohibition names, one scale down.

### Observation that changed nothing but is worth recording

**3. The 19-14 allow-list interaction did not fire for any of the three new cases.** 19-14's SUMMARY warned that a mutation touching the refusal STEP now trips Invariant A as an unexpected key before the intended predicate sees it. All three of this plan's mutations land elsewhere — two at levels outside the job and one in the `on:` block — so each produced the FAIL line its case actually asserts. `expectRed`'s second half (a FAIL line naming the *right* invariant) was checked and satisfied in each case, not merely a non-zero exit.

### Auto-fixed at close-out

**4. [Rule 1 — false claim in a shipped artifact] `.planning/REQUIREMENTS.md` was updated, and this SUMMARY first said it was not.**
- **Found during:** plan close-out, at `update_requirements`
- **Issue:** The plan's assumptions block asserted CI-01's traceability row *"already reads `Complete` while CI-01 was only PARTIALLY SATISFIED"*, and concluded that flipping it and back inside one plan would be churn — so the file was declared out of scope and this SUMMARY was drafted asserting it byte-unchanged. **That premise was stale.** On the actual tree the row read `Gaps Found` and the body checkbox at `:245` was UNTICKED. The verifier had flipped the row back after the 19-13 round, which is exactly the correct state for a requirement with two open gaps — and the two gaps in question are the two this plan closes.
- **Fix:** `requirements.ready-ids` returned `1/1 requirement(s) ready` (19-14's SUMMARY now exists, so the shared-ID gate resolved), and `requirements.mark-complete CI-01` was run as `execute-plan.md`'s `update_requirements` step directs and as this plan's dispatch brief explicitly instructed — *"follow execute-plan.md's requirement-marking step rather than editing REQUIREMENTS.md by hand"*. It ticked the checkbox and set the row to `Complete`: a two-line diff, no hand edit.
- **Why it is a deviation and not silent compliance:** the plan's `success_criteria` says `.planning/REQUIREMENTS.md` is byte-unchanged, and it now is not. Recording that is the whole point — a SUMMARY asserting a file untouched while the commit beside it changes that file is precisely the class of false claim this phase exists to delete, and it would have been the cheapest one in the set to catch.
- **Side effect, deliberate:** this also resolves the checkbox/row inconsistency the plan flagged (`:245` unticked while the table read otherwise). Both now say the same thing.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verification:** `git diff` for that file is exactly two changed lines — `- [ ]` → `- [x]` at `:245` and `Gaps Found` → `Complete` in the traceability table. No other row moved.
- **Committed in:** `1d88e0c` (plan metadata commit)

---

**Total deviations:** 1 recorded (1 false-claim correction).
**Impact on plan:** Scope held to the five declared `files_modified` for all executable and test work; no sixth source file touched, no package installed, no schema object created, no edit to `vitest.design.config.ts` or `package.json`. Plans 19-01 … 19-14 are byte-unchanged. The one file outside the declared set is `.planning/REQUIREMENTS.md`, changed by the workflow's own bookkeeping step against a stale planner assumption — documented above rather than absorbed.

## Issues Encountered

None. The precondition held at start with one recorded qualification: `git status --porcelain` was not globally empty — three untracked `.planning/` artifacts (`milestone.lock`, `19-PATTERNS.md`, `state.json`) predate this plan and are outside its scope. The scoped form the plan's own gates use (`git status --porcelain -- .github/workflows/ src/ scripts/ tests/`) was empty at start and after every task.

Pre-existing and untouched: the full design suite reports `3 skipped` across 78 files, all three in unrelated files. `npx eslint` over all four touched source files produced no output.

## Known Stubs

None. No hardcoded empty value, placeholder string or unwired component was introduced. No new `TODO`/`FIXME`/`XXX` marker exists in any of the five files.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary. The two new file-writing surfaces are the design tests' temp directories (`T-19-15-08` in the plan's register), mitigated as specified — every mutation inside a `realpathSync(mkdtempSync(...))` directory removed in a `finally`, with `git status --porcelain -- .github/workflows/ src/` as a gate in both tasks.

## What CI-01's traceability row has now earned

CI-01's row moved from `Gaps Found` to `Complete` and its body checkbox from `- [ ]` to `- [x]`, via `requirements.mark-complete` — see deviation 4 above for why the plan predicted otherwise. What that flip is claiming, stated so it can be checked rather than trusted:

- **SC4's literal text is now protected by an assertion, not merely true of today's file.** *"Opening a pull request runs the repository's functional Playwright specs"* — the trigger whose absence falsifies that sentence is asserted in the `ci` section and watched red by a standing case. Before this plan the requirement's own trigger could be deleted in one line with the checker reporting full green; that is the specific claim 19-VERIFICATION.md's gap 2 said CI-01 had not earned.
- **The gate cannot be neutralised from outside the job.** Gap 1's `missing:` bullet asked for the `defaults.run.shell` assertion at job/workflow level "which nothing currently reads". It reads it now, as a whole-block prohibition at both levels.
- **What the `Complete` cell does NOT claim, and what a re-verifier should still weigh:** `gate-e2e` reports but cannot block. Branch protection is unreachable on this GitHub plan (403 — Free private repo), and the `ci` run is red on every push from 14 pre-existing e2e failures with no expected-failure boundary. Both remain the PM's recorded human-verification item, carried forward for a fourth round. The trigger assertion makes the gate harder to DETACH; it does not make it blocking.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Phase 19 has no further planned plans.** Ready for re-verification of the two gaps this plan targeted: 19-VERIFICATION.md gap 1 (CR-01's outer half) and gap 2 (WR-01), both now closed with standing cases rather than hand-applied mutations.
- **Carried forward, explicitly not closed here** (named in the plan's own assumptions): 19-REVIEW.md IN-03 (nothing pins that the argument guard PRECEDES the file and environment reads — the stated ordering is documented intention, and moving the guard below the reads leaves all eight cases green) and IN-04 (the prefix match is case-sensitive against a `process.env` that is case-insensitive on Windows). Both Info-grade, neither in any gap's authoritative `missing:` block.
- **Still open and unchanged:** the two `human_verification` items in 19-VERIFICATION.md — the PM's reconfirmation of CI-01's closure state, and a human read of the D-03 creation-failure notice copy.
- **Also carried, out of scope for every plan this round:** `ConfirmDialog`'s handlers lacking `try`/`catch` in `src/components/listing/listing-card.tsx`, and ~11 stale `<file>:<line>` citations in guard failure messages.

## Self-Check: PASSED

- `scripts/verify-workflows.mjs`, `.github/workflows/ci.yml`, `tests/design/workflow-invariants.test.ts`, `scripts/refuse-mail-credential.mjs`, `tests/design/mail-credential-refusal.test.ts` — all FOUND on disk and tracked.
- Commits `f0051b2`, `97a04a1`, `23261a5` — all FOUND in `git log`.
- Plan-level verification re-run in full at close: checker 50/exit 0/0 FAIL lines; `workflow-invariants.test.ts` 12 passed; `mail-credential-refusal.test.ts` 8 passed; whole design suite 78 files / 1367 passed / 3 pre-existing skips; three-way byte gate 1/1; `STALE-COUNT-HITS=0`; `WR03-CLAIM-HITS=0`; `WR04-ECHO-HITS=0`; `REALPATH-WRAPPED=true`; `PREFIX-COPIES=0`; whole-plan `ci.yml` non-comment diff lines = 0; `git status --porcelain -- .github/workflows/ src/` empty; eslint clean on all four source files.

---
*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Completed: 2026-09-05*
