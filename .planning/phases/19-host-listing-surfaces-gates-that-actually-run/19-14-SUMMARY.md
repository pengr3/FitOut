---
phase: 19-host-listing-surfaces-gates-that-actually-run
plan: 14
subsystem: infra
tags: [github-actions, ci, workflow-invariants, mail-credential, d-14, gap-closure, vitest, design-gate, allow-list, mutation-testing]

requires:
  - phase: 19-13
    provides: "the exact-invocation Invariant A, the step-quantified unconditional check, and the eight-case script-half design test this plan leaves unregressed"
  - phase: 19-12
    provides: "D-14's runtime refusal script and the four mail invariants (A/B/C/D) whose predicates this plan tightens"
provides:
  - "tests/design/workflow-invariants.test.ts — the checker half's FIRST standing instrument: nine build-blocking cases that mutate a mkdtemp copy of the workflow tree and spawn the SHIPPED checker against it, differing from CI's invocation only in `cwd`"
  - "MAIL_STEP_ALLOWED_KEYS — the refusal step's permitted key surface stated POSITIVELY, so a key nobody has named (including an Actions attribute that does not exist yet) is red by default"
  - "both `continue-on-error` comparisons are PRESENCE tests, matching the `if:` conjunct inside the same expression — expression, quoted-string and literal-boolean spellings are all red, at step level and at job level"
  - "Invariant C's permitted-predecessor test computed over the FULL step list against three named predecessors, so a `uses:` step ahead of the refusal is red instead of invisible"
  - "`ci.yml`'s invariant list carries no sentence a conjunct or test case beside it does not implement, and no conjunct COUNT used as evidence of coverage depth"
affects: [ci, workflow-verification, mail-privacy, d-14, gate-e2e, design-gate]

actuals:
  tokens: 21400
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "A guard's permitted shape is specified POSITIVELY as an allow-list, never as a deny-list of the mutations somebody happened to measure — the attack surface is an open set and a deny-list over an open set is a record of the last audit, not a control"
    - "A security-control predicate tests a KEY'S PRESENCE where presence is the defect; a key that should never appear on a gate has no legitimate value to carve out, and every value comparison is one alternative spelling away from green"
    - "A tightening is proven by a STANDING test in the tree, never only by a hand-applied mutation somebody reverted — a predicate with no test carries no memory, and round N+1 begins with no memory of round N"
    - "A mutation test spawns the SHIPPED control with a different `cwd` rather than teaching it a test-only flag, so nothing new must be pinned absent on the production path"
    - "A mutation harness asserts the mutated text DIFFERS from its input before spawning, so a drifted anchor is a red rather than a green over an unmutated subject"
    - "`expectRed` asserts BOTH a non-zero exit AND a FAIL line naming the right invariant — 'it went red' was never the property; 'it went red for this reason' is"

key-files:
  created:
    - tests/design/workflow-invariants.test.ts
  modified:
    - scripts/verify-workflows.mjs
    - .github/workflows/ci.yml

key-decisions:
  - "The harness spawns the checker with a different `cwd` rather than adding a `--workflow-dir=` flag. 19-REVIEW.md WR-02 sketched the flag; it was rejected because a test-only input to a security control would then require a NEW invariant pinning that input's absence on the production path — 19-12's `argv[2]` mistake restated one file over. `WORKFLOW_DIR`, `package.json` and `MAIL_REFUSAL_SCRIPT` are already cwd-relative in the shipped code, verified by direct read before the harness was written."
  - "Case 3's key is `working-directory`, chosen under the plan's rule rather than from the plan: a real Actions step attribute, plausible on this step, with `grep -c` returning 0 against BOTH the checker and `ci.yml`. The allow-list's comment prose therefore says 'a working directory' (two words) rather than the literal key, so the grep stays 0 after this plan."
  - "The allow-list conjunct is ANDed with the step-presence conjunct and never stands alone: over an ABSENT step `Object.keys(undefined ?? {})` is `[]` and the subset test would hold VACUOUSLY — the same vacuity class the hard stops exist to remove."
  - "The permitted-predecessor `uses:` entries are matched with a trailing `@`, so an action whose name merely BEGINS with a permitted one is not admitted."
  - "IN-01's conjunct count was DELETED rather than corrected, in both files. Two of the counted items are logically implied by the exact-equality one, so any number claims a coverage depth the code does not support; what the conjuncts ASSERT is stated instead."
  - "The invariant total was held at 48 deliberately. All three predicate changes TIGHTEN existing checks; plan 19-15 owns the count change and the count prose together."

patterns-established:
  - "The checker half of a two-half control gets the same instrument discipline the script half already had — mutate a copy, spawn the real binary, assert exit code AND named failure line"
  - "A falsified header claim is falsified IN PLACE in the file's `FALSIFIED <date> BY PLAN <n>` style: the superseded claim, the measurement that falsified it, and what replaced it — historical markers are appended to, never rewritten"

requirements-completed: [CI-01]

coverage:
  - id: D1
    description: "The checker half has a standing, build-blocking instrument for the first time in this phase — nine cases mutating a copy of the workflow tree and spawning the shipped checker against it"
    requirement: "CI-01"
    verification:
      - kind: unit
        ref: "tests/design/workflow-invariants.test.ts — 9 passed, collected by vitest.design.config.ts and therefore inside `npm run build` via `test:design`"
        status: pass
      - kind: unit
        ref: "tests/design/workflow-invariants.test.ts#case 1 (control): an unmutated copy is green, and pins the invariant total"
        status: pass
    human_judgment: false
  - id: D2
    description: "A key outside the permitted set on `gate-e2e`'s refusal step turns the checker red — INCLUDING a key that appears nowhere in the checker's own source"
    requirement: "CI-01"
    verification:
      - kind: unit
        ref: "tests/design/workflow-invariants.test.ts#case 2: a custom-shell override on the refusal step is red"
        status: pass
      - kind: unit
        ref: "tests/design/workflow-invariants.test.ts#case 3: a step key the checker's source never names is red anyway"
        status: pass
      - kind: other
        ref: "grep -c working-directory scripts/verify-workflows.mjs → 0; grep -c working-directory .github/workflows/ci.yml → 0 (before use, and still 0 after)"
        status: pass
      - kind: other
        ref: "ALLOWLIST-SIZE=2 source gate"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every spelling of a soft-failing gate — expression, quoted string, literal boolean, at step level and at job level — is red, and no value comparison against that key remains in the executable source"
    requirement: "CI-01"
    verification:
      - kind: unit
        ref: "tests/design/workflow-invariants.test.ts#case 4 (expression, step) / #case 5 (quoted string, step) / #case 6 (literal boolean, step — regression 19-13) / #case 7 (expression, JOB) / #case 8 (if:, step — regression 19-13)"
        status: pass
      - kind: other
        ref: "filtered-source gate → VALUE-COMPARISONS=0"
        status: pass
    human_judgment: false
  - id: D4
    description: "A `uses:` step inserted ahead of the refusal is red, and the invariant's name enumerates the three predecessors it actually permits"
    requirement: "CI-01"
    verification:
      - kind: unit
        ref: "tests/design/workflow-invariants.test.ts#case 9: a uses: step inserted ahead of the refusal is red"
        status: pass
      - kind: other
        ref: "node scripts/verify-workflows.mjs — Invariant C's printed name reads `… and ONLY actions/checkout@, actions/setup-node@ and \\`npm ci\\` may precede it, over the FULL step list`"
        status: pass
    human_judgment: false
  - id: D5
    description: "The invariant total is still 48 and the `ci` section still 29, because three invariants were tightened and none added"
    requirement: "CI-01"
    verification:
      - kind: other
        ref: "node scripts/verify-workflows.mjs → `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8).` — before Task 1, after Task 1, after Task 2 and after Task 3"
        status: pass
    human_judgment: false
  - id: D6
    description: "`ci.yml` changed by comment lines only — no job, step, `run:`, `env:` key, trigger, service, container option or timeout moved; nothing under `src/` touched"
    verification:
      - kind: other
        ref: "git diff -U0 d41f02f..HEAD -- .github/workflows/ci.yml | (non-### lines) | wc -l → 0"
        status: pass
      - kind: other
        ref: "git status --porcelain -- .github/workflows/ src/ → empty after every task"
        status: pass
    human_judgment: false
  - id: D7
    description: "No sentence in `.github/workflows/ci.yml`'s invariant list or in Invariant A's comment block claims coverage that no conjunct or test case beside it implements"
    verification:
      - kind: other
        ref: "Task 3 per-sentence enforcer table below; DEBT-MARKERS=0; the two 19-13 FALSIFIED markers byte-unchanged (0 removed lines matching them)"
        status: pass
    human_judgment: true
    rationale: "The mechanical gates prove the markers are present, the count sentences are gone and no executable byte moved, but 'this prose claims only what the code enforces' is a reading judgment no assertion makes. It is the exact link this phase names as unverifiable by a passing check."
  - id: D8
    description: "The sibling script-half suite is unregressed"
    verification:
      - kind: unit
        ref: "tests/design/mail-credential-refusal.test.ts → 8 passed"
        status: pass
      - kind: unit
        ref: "npx vitest run --config vitest.design.config.ts → 78 files, 1364 passed, 3 skipped (the 3 skips are pre-existing and in unrelated files)"
        status: pass
    human_judgment: false

duration: 41 min
completed: 2026-09-05
status: complete
---

# Phase 19 Plan 14: Stop Patching the Deny-List Summary

**The checker half of D-14 gets its first standing instrument — nine build-blocking cases that mutate a `mkdtemp` copy of the workflow tree and spawn the shipped checker against it — and the refusal step gets a POSITIVE permitted-key surface, proven red against `working-directory`, a key the checker's source never names.**

## Performance

- **Duration:** 41 min
- **Started:** 2026-09-05T01:10:00Z
- **Completed:** 2026-09-05T01:51:00Z
- **Tasks:** 3
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- `tests/design/workflow-invariants.test.ts` — the instrument that has been missing for three rounds. Nine cases, collected by the existing `tests/design/**/*.test.ts` include and therefore inside `npm run build`. It spawns the SHIPPED checker with **no flag, no environment variable and no second entry point** — only `cwd` differs.
- Invariant A gains an **allow-list** conjunct (`MAIL_STEP_ALLOWED_KEYS = ["name", "run"]`), proven red against a key `grep -c` returned 0 for against both the checker and `ci.yml`.
- Both `continue-on-error` comparisons became **presence tests**, matching the `if:` conjunct that was already presence-tested inside the same expression. Expression, quoted-string, literal-boolean, step-level and job-level: all red.
- Invariant C's predecessor test moved from `runsOf(e2e)` to `stepsOf(e2e)` with three named permitted predecessors — a `uses:` step ahead of the refusal is now red instead of invisible.
- Two new `FALSIFIED 2026-09-05 BY PLAN 19-14` markers in `ci.yml`'s own voice, one entry amendment, one conjunct-count deletion (IN-01), and one new sentence naming the instrument.
- **The invariant total never moved: 48, before and after every task.**

## Task Commits

1. **Task 1 (RED): the standing instrument** — `1cb0647` (test)
2. **Task 1 (GREEN): the permitted key surface** — `36af3e9` (feat)
3. **Task 2 (RED): six more cases** — `b7d4cf6` (test)
4. **Task 2 (GREEN): presence not value, plus the predecessor allow-list** — `ad5c5b5` (fix)
5. **Task 3: the header claims only what a conjunct enforces** — `2f8209e` (docs)

## Files Created/Modified

- `tests/design/workflow-invariants.test.ts` **(NEW)** — the harness (`withMutatedWorkflows`, `expectRed`, `eolOf`, `withRefusalStepKey`, `withJobKey`, `withStepBeforeRefusal`) plus nine cases.
- `scripts/verify-workflows.mjs` — `MAIL_STEP_ALLOWED_KEYS`; `mailStepKeys`/`mailStepExtraKeys`; both `continue-on-error` comparisons; `e2eSteps`/`E2E_PRECEDE_USES_OK`/`E2E_PRECEDE_RUN_OK`/`onlySetupBefore` replacing `onlyInstallBefore`; three renamed invariant strings; three extended comment blocks.
- `.github/workflows/ci.yml` — **comment lines only.** Entry 3 falsified (CR-02), entry 5 extended + count deleted (CR-01 third round, IN-01), entry 7 falsified (WR-05), fixed-numbers paragraph re-stated, instrument sentence added.

---

## VERBATIM EVIDENCE

### Case 3's chosen key, and the two `grep -c` outputs that proved it absent

Chosen key: **`working-directory`** — a real GitHub Actions step attribute, plausible on a step like this one. Recorded before use:

```
$ grep -c -- "working-directory" scripts/verify-workflows.mjs
0
$ grep -c -- "working-directory" .github/workflows/ci.yml
0
```

Re-measured after all three tasks landed (the allow-list's comment prose deliberately says *"a working directory"*, two words, rather than the literal key, so the property is preserved):

```
verify=0  ci=0
```

### Cases 2 and 3 failing against the PRE-change checker (Task 1 RED)

```
 ❯ tests/design/workflow-invariants.test.ts (3 tests | 2 failed) 626ms
     × case 2: a custom-shell override on the refusal step is red 210ms
     × case 3: a step key the checker's source never names is red anyway 205ms

AssertionError: the checker exited 0 under a mutation that should be RED.
...
: expected +0 not to be +0 // Object.is equality
 ❯ expectRed tests/design/workflow-invariants.test.ts:178:9

 Test Files  1 failed (1)
      Tests  2 failed | 1 passed (3)
```

The checker's stdout in both failures ended with `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8).` — **observed exit code 0** in each. Case 1 (the control) passed, proving the copied tree was a faithful subject and the two reds were red for their own reason.

### Cases 4, 5, 7 and 9 failing against the pre-change checker (Task 2 RED)

```
     × case 4: continue-on-error as an Actions expression on the refusal step is red 205ms
     × case 5: continue-on-error as a quoted string on the refusal step is red 198ms
     × case 7: continue-on-error as an Actions expression on the JOB is red 199ms
     × case 9: a uses: step inserted ahead of the refusal is red 224ms

 Test Files  1 failed (1)
      Tests  4 failed | 5 passed (9)
```

**Cases 7 and 9 — observed exit code 0:**

```
AssertionError: the checker exited 0 under a mutation that should be RED.
```

**Cases 4 and 5 — observed exit code 1, but on the WRONG invariant.** Because Task 1's allow-list had already landed, adding `continue-on-error` to the refusal step tripped Invariant A as an *unexpected key* — while the unconditional invariant, the predicate actually under test, stayed green:

```
AssertionError: no FAIL line named "is unconditional". FAIL lines were:
  FAIL  "gate-e2e"'s mail refusal reads the REAL process environment — no ${{ }} expression, no env: map, exact invocation, NO ARGUMENTS, and NO KEY OUTSIDE [name, run]
--- stderr ---
1 of 48 invariant(s) FAILED:
  - [ci] "gate-e2e"'s mail refusal reads the REAL process environment — no ${{ }} expression, no env: map, exact invocation, NO ARGUMENTS, and NO KEY OUTSIDE [name, run]
: expected false to be true // Object.is equality
```

This is `expectRed`'s second half earning its keep. A harness asserting only "non-zero exit" would have reported cases 4 and 5 as GREEN against a checker whose `continue-on-error` predicate was still fully defeated — the exact false-negative shape that let rounds 1, 2 and 3 each survive a full verification. It is recorded rather than smoothed over because it is the strongest single piece of evidence in this plan that "it went red" was never the property.

### Cases 6 and 8 passing BOTH before and after the predicate changes

Before Task 2's predicate changes: `Tests  4 failed | 5 passed (9)` — the 5 passing were cases 1, 2, 3 **and cases 6 and 8**. After: `Tests  9 passed (9)`.

Cases 6 (`continue-on-error: true`, literal) and 8 (`if: false`) are plan 19-13's already-closed mutations. Their passing *before* the change is the evidence that this new file measures the same subject 19-13's hand-applied-and-reverted mutations did; their passing *after* is the standing regression guard that stops the presence test being loosened back into a value test.

### The deliberate anchor-break observation

`withRefusalStepKey`'s anchor was temporarily changed from `` `- name: ${MAIL_STEP_NAME}` `` to `` `- name: ZZ-ANCHOR-BROKEN-${MAIL_STEP_NAME}` ``, with cases 2 and 3 otherwise **passing**:

```
ANCHOR-BREAK-APPLIED
     × case 2: a custom-shell override on the refusal step is red 13ms
     × case 3: a step key the checker's source never names is red anyway 9ms

AssertionError: the mutation produced text identical to the input — its anchor has drifted, and every assertion below would be measuring an UNMUTATED copy: expected '# ===================================…' not to be '# ===================================…' // Object.is equality

      Tests  2 failed | 1 passed (3)
```

A drifted anchor is a **RED**, not a silent green over an unmutated copy. Reverted immediately; `git status --porcelain -- tests/` empty.

### The checker's summary line, before and after each task

| Point | Output | Exit |
|---|---|---|
| Precondition (before Task 1) | `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8).` | 0 |
| After Task 1 | `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8).` | 0 |
| After Task 2 | `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8).` | 0 |
| After Task 3 | `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8).` | 0 |

**All three read 48.** No `check()` was added and none dropped.

### The two source gates

```
VALUE-COMPARISONS=0
ALLOWLIST-SIZE=2
```

### `git status --porcelain -- .github/workflows/ src/` after every task

Empty after Task 1, after Task 2, and after Task 3. Every mutation lived inside a `realpathSync(mkdtempSync(...))` directory removed in a `finally`; the tracked `ci.yml` was read and never written.

---

## Task 3: every added sentence, beside what enforces it

| # | Sentence added | File | What makes it true |
|---|---|---|---|
| 1 | Entry 3: "the quantifier was right; the COMPARISON was the hole — both sites compared the key's VALUE against the JavaScript boolean" | `ci.yml` | `verify-workflows.mjs` `conditionalSteps` filter + `check()` predicate, both now `!== undefined` / `=== undefined`; gate `VALUE-COMPARISONS=0` |
| 2 | Entry 3: "that key is documented as accepting an EXPRESSION, which parses to a STRING — so `=== true` was false and `!== true` was true for the SAME input" | `ci.yml` | Test case 4 (expression form), observed RED against the pre-change predicate with the checker exiting 0 |
| 3 | Entry 3: "A quoted value defeats it identically" | `ci.yml` | Test case 5 (quoted-string form), observed RED the same way |
| 4 | Entry 3: "both sites test for the key's PRESENCE, the same way `if:` was already tested BESIDE them inside the very same expression" | `ci.yml` | The two changed comparisons sit in one expression with `step?.if !== undefined`; test case 8 is the standing regression for the `if:` half |
| 5 | Entry 5: "NONE of them constrained HOW it executes" | `ci.yml` | Test case 2: a custom-shell override left the `run:` byte-identical and every pre-19-14 conjunct green (observed, checker exit 0) |
| 6 | Entry 5: "the step's PERMITTED KEY SURFACE is now asserted as an ALLOW-LIST, so a key outside it — including an Actions attribute that does not exist yet — is red without any predicate naming it" | `ci.yml` | `MAIL_STEP_ALLOWED_KEYS` + the `mailStepExtraKeys.length === 0` conjunct; test case 3 with `working-directory`, `grep -c` 0 in both files |
| 7 | Entry 5: "the conjunct COUNT is deleted, not corrected… two of the counted items were logically IMPLIED by the exact-equality one" | `ci.yml` | The count string is gone from entry 5 and from Invariant A's comment block; both now state what the conjuncts assert |
| 8 | Entry 7: "That was FALSE THE DAY IT WAS WRITTEN… a step declaring `uses:` was INVISIBLE BY CONSTRUCTION" | `ci.yml` | `runsOf` at `verify-workflows.mjs:201` filters to string `run:`; test case 9 observed RED against the pre-change predicate with the checker exiting 0 |
| 9 | Entry 7: "the position is computed over the FULL STEP LIST, with an explicit allow-list of THREE permitted predecessors… each matched with a trailing `@`" | `ci.yml` | `e2eSteps`/`E2E_PRECEDE_USES_OK`/`onlySetupBefore`; the `` `${u}@` `` template is the trailing-`@` match; Invariant C's printed name enumerates the three |
| 10 | "the checker's own predicates now have a standing test — `tests/design/workflow-invariants.test.ts` … nine cases, inside `npm run build`" | `ci.yml` | The file exists with 9 passing cases; `vitest.design.config.ts` includes `tests/design/**/*.test.ts`; `package.json`'s `build` runs `test:design` |
| 11 | "Its control case pins the total below as an exact string" | `ci.yml` | `EXPECTED_GREEN` module-scope constant, asserted by case 1 |
| 12 | Fixed-numbers paragraph: "all three 19-14 changes… tightened an invariant that already existed, so no `check()` was added and none was dropped" | `ci.yml` | The checker reports 48 / ci=29 after every task; the list still has seven numbered entries |
| 13 | Invariant A block: "The conjuncts assert that the step EXISTS under its exact name, that its `run:` is exactly the no-argument invocation, that it declares no `env:` map, and that it carries no key outside the permitted surface" | `verify-workflows.mjs` | The four conjuncts of the `check()` call immediately below the comment |
| 14 | Invariant A block: "⚠ THE SUBSET TEST IS ANDed WITH THE STEP-PRESENCE CONJUNCT AND MUST NEVER STAND ALONE" | `verify-workflows.mjs` | `e2eMailStep !== undefined && … && mailStepExtraKeys.length === 0` in one `&&` chain |
| 15 | `MAIL_STEP_ALLOWED_KEYS` block: "the failure class is 'an attribute the checker does not know about', and a deny-list can only ever name the ones it already knows" | `verify-workflows.mjs` | Test case 3 — a key named nowhere in the checker's source is red |
| 16 | Unconditional block: "a key that should never appear on a gate has NO LEGITIMATE VALUE TO CARVE OUT" | `verify-workflows.mjs` | The presence tests admit no value at all; gate `VALUE-COMPARISONS=0` |
| 17 | Invariant C block: "one first-party action alone can run arbitrary JavaScript in the job" | `verify-workflows.mjs` | Test case 9 inserts `actions/github-script@v7` — permitted by the supply-chain invariant, now red on Invariant C |

No sentence was written that could not be pointed at a conjunct, a test case or a measurement. None had to be deleted.

## Decisions Made

See `key-decisions` in the frontmatter. The load-bearing one is the **`cwd` over a flag**: 19-REVIEW.md WR-02 explicitly sketched a `--workflow-dir=` flag, and it was rejected because adding a test-only input to a security control would require a further invariant pinning that input's absence on the production path — which is 19-12's `argv[2]` mistake restated. The three cwd-relative reads (`WORKFLOW_DIR` at `:82-84`, `package.json` at `:242`, `MAIL_REFUSAL_SCRIPT` at `:827`) were read and confirmed in source before the harness was written, exactly as the plan's `read_first` demanded.

## Deviations from Plan

### Auto-fixed Issues

**None.** No deviation rule fired. All three tasks executed as written, every `<verify>` gate passed on its first run after the intended change, and no auto-fix was needed at any point.

### Observations that changed nothing but are worth recording

**1. Cases 4 and 5 went RED for a DIFFERENT reason than the plan projected — and the harness caught it.**
- **Found during:** Task 2 (RED phase)
- **Observation:** The plan projected cases 4 and 5 as "the checker exited 0". Because Task 1's allow-list had already landed in the same plan, they instead exited **1** on Invariant A (the unexpected-key conjunct) while the unconditional invariant — the predicate under test — stayed green.
- **Why it is not a deviation:** `expectRed` asserts a FAIL line naming the *right* invariant, so both cases were correctly reported as failures. The projection was about exit codes; the property being proven was unaffected.
- **Why it is recorded:** it is a live demonstration that a harness asserting only "non-zero exit" would have reported these two as green against a fully-defeated predicate. That is the same false-negative shape that let three rounds pass, and it is now closed by construction.

**2. `insertAfterLineContaining` returns its input unchanged on a missing anchor rather than throwing.**
- Deliberate, and consistent with the plan: the differs-from-input assertion in `withMutatedWorkflows` is the single place a drifted anchor is caught, so every builder routes its failure there rather than each inventing its own error. Proven by the deliberate anchor-break above.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None. Scope held to the three declared `files_modified`; no fourth file was touched, no package installed, no schema object created, no `vitest.design.config.ts` or `package.json` edit made.

## Issues Encountered

None. The precondition (`git status --porcelain -- scripts .github tests` empty, checker at 48/exit 0) held at start; every task's precondition held at its own start.

Pre-existing and untouched: the full design suite reports `3 skipped` across 78 files — all three skips are in unrelated files and predate this plan. `npm run lint` reports 26 warnings, 0 errors, none in any file this plan touched (confirmed by grep).

## Known Stubs

None. No hardcoded empty value, placeholder string or unwired component was introduced. No `TODO`/`FIXME`/`XXX`/`TBD` marker exists in any of the three files (`DEBT-MARKERS=0`).

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary. The one new file-writing surface — the design test's temp directory — is `T-19-14-06` in the plan's own register, mitigated as specified (`realpathSync(mkdtempSync(...))`, removed in a `finally`, with `git status --porcelain -- .github/workflows/` as a gate in all three tasks).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Ready for plan 19-15.** That plan owns the count change (48 → 50) and the count prose together. It edits `EXPECTED_GREEN` in `tests/design/workflow-invariants.test.ts` — deliberately the ONLY place the total is spelled in that file — plus `ci.yml`'s fixed-numbers paragraph. The control case will fail loudly if it forgets one.
- **Carried forward, explicitly not closed here** (all named in the plan's own assumptions): WR-01 (nothing asserts `ci.yml`'s trigger set — 19-VERIFICATION.md's second gap, owned by 19-15), WR-03, WR-04, IN-02, IN-03, IN-04.
- **Still open, and unchanged by this plan:** the two `human_verification` items in 19-VERIFICATION.md — the PM's reconfirmation of CI-01's closure state (D-15's branch-protection flip is unreachable on this GitHub plan; the `ci` run is red on every push from 14 pre-existing e2e failures), and a human read of the D-03 creation-failure notice copy. Both are recorded PM/UX calls, not tasks.

## Self-Check: PASSED

- `tests/design/workflow-invariants.test.ts` — FOUND on disk, tracked (`git ls-files` non-empty).
- `scripts/verify-workflows.mjs`, `.github/workflows/ci.yml` — FOUND, modified.
- Commits `1cb0647`, `36af3e9`, `b7d4cf6`, `ad5c5b5`, `2f8209e` — all FOUND in `git log`.
- Plan-level verification re-run in full at close: checker 48/exit 0; `workflow-invariants.test.ts` 9 passed; `mail-credential-refusal.test.ts` 8 passed; whole design suite 78 files / 1364 passed; `VALUE-COMPARISONS=0`; `ALLOWLIST-SIZE=2`; whole-plan `ci.yml` non-comment diff lines = 0; `git status --porcelain -- .github/workflows/ src/` empty.

---
*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Completed: 2026-09-05*
