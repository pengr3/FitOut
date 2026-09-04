---
phase: 19-host-listing-surfaces-gates-that-actually-run
plan: 12
subsystem: infra
tags: [github-actions, ci, workflow-invariants, vitest, design-suite, fail-closed, email, node-esm]

requires:
  - phase: 19-host-listing-surfaces-gates-that-actually-run (19-11)
    provides: "The three gate-e2e invariants and the ci.yml header block this plan corrects again, for a different falsehood"
  - phase: 19-host-listing-surfaces-gates-that-actually-run (19-01)
    provides: "The D-14 mail-refusal step this plan supersedes — it shipped inert"
provides:
  - "scripts/refuse-mail-credential.mjs — the RUNTIME half of D-14, reading the job's real process environment"
  - "tests/design/mail-credential-refusal.test.ts — a build-blocking, DB-free proof of both directions"
  - "Four new workflow invariants (ci 26 -> 29, cross 7 -> 8, total 44 -> 48)"
  - "Zero occurrences of the mail-provider token across .github/workflows/, machine-asserted"
  - "ci.yml and verify-workflows.mjs prose that describes the control that exists"
affects: [ci, workflows, e2e, email, verification]

actuals:
  tokens: 55864
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A value shared by a checker and the thing it checks is spelled ONCE and READ, never copied — enforced by an invariant that asserts the pattern, the declaration and the absence of a copy"
    - "A control's proof lives in the build-blocking design suite, not only in the CI job it protects"
    - "A false sentence about WHEN a control fires is DELETED, not preserved behind a falsification marker"

key-files:
  created:
    - scripts/refuse-mail-credential.mjs
    - tests/design/mail-credential-refusal.test.ts
  modified:
    - .github/workflows/ci.yml
    - scripts/verify-workflows.mjs
    - .planning/REQUIREMENTS.md

key-decisions:
  - "D-14's RUNTIME half is PROMOTED to the primary assertion: only it can observe the environment the suite runs in. The PARSE half is demoted from 'the stronger shape' to what it is — workflow-file hygiene over env: KEYS, which protects the NEXT run."
  - "The mail-provider prefix is READ out of scripts/verify-workflows.mjs at runtime rather than copied into the refusal script, so the two halves cannot drift. A second spelling is a second source of truth wearing the costume of a constant."
  - "An unreadable prefix declaration is a HARD STOP (exit 1, ::error:: naming the path), never a degraded scan for the empty string — an empty prefix matches everything or nothing, and both are a green that means nothing."
  - "The refusal prints offending variable NAMES and never VALUES; the design test asserts the sentinel value it sets never appears in the output."
  - "The header's false ordering sentence was DELETED rather than falsified in place — to grep, which is how this repository audits its own prose, a preserved false sentence is indistinguishable from the claim itself. Every other correction uses the file's established FALSIFIED marker style."
  - "WR-03 (widening the parse half to container.env / services.*.env) is NAMED as carried forward in both files' prose rather than absorbed. The container.env vector is covered by the runtime half; services.*.env reaches only the postgres container, which runs no application code."

patterns-established:
  - "Prefix-seam invariant: assert the pattern against the declaration, the declaration against the script that reads it, and the script against a copy — three conjuncts, each separately watched red"
  - "Raw-text token audit over a whole directory (comments included), as a sibling of the parsed carrier check — a comment naming a forbidden token breaks a grep audit exactly as completely as a value does"
  - "Ordering invariants compare INDICES with an explicit allowance list for what may precede (only `npm ci`), so a step that exists but runs late is red, not green"

requirements-completed: [CI-01]

coverage:
  - id: D1
    description: "gate-e2e's first step after npm ci reads the job's REAL process environment and exits 1 with an ::error:: line when any variable name begins with the mail-provider prefix — before migrate, before seed, before Playwright"
    requirement: CI-01
    verification:
      - kind: unit
        ref: "tests/design/mail-credential-refusal.test.ts#exits 1 with an ::error:: line when a provider-named variable is in the child's environment"
        status: pass
      - kind: unit
        ref: "tests/design/mail-credential-refusal.test.ts#exits 0 and reports the prefix, the count scanned and its source when no such variable is present"
        status: pass
      - kind: other
        ref: "node scripts/refuse-mail-credential.mjs (exit 0 clean; exit 1 with a violating variable set)"
        status: pass
      - kind: other
        ref: "node scripts/verify-workflows.mjs --section=ci (Invariants A and C)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The mail-provider prefix is spelled exactly once in workflow-facing code and read by the runtime half, asserted undriftable by pattern, by shared source text, and by the absence of a copy"
    requirement: CI-01
    verification:
      - kind: other
        ref: "node scripts/verify-workflows.mjs --section=ci (Invariant B; watched red under mutations 3 and 4)"
        status: pass
      - kind: unit
        ref: "tests/design/mail-credential-refusal.test.ts#exits 1 naming the source path when the prefix declaration cannot be read"
        status: pass
    human_judgment: false
  - id: D3
    description: "Zero occurrences of the mail-provider token across .github/workflows/, asserted by the checker over raw text rather than by a human running a count"
    requirement: CI-01
    verification:
      - kind: other
        ref: "node scripts/verify-workflows.mjs --section=cross (Invariant D; watched red under mutation 6)"
        status: pass
      - kind: other
        ref: "git grep -c -- RESEND .github/workflows/ (1 before, 0 after)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The refusal never prints a credential VALUE into a build log"
    requirement: CI-01
    verification:
      - kind: unit
        ref: "tests/design/mail-credential-refusal.test.ts#prints the offending variable NAME and never its VALUE"
        status: pass
    human_judgment: false
  - id: D5
    description: "ci.yml and verify-workflows.mjs prose names which half observes the process, which half observes the file, which one protects the run in front of the reader, and what is still known to be uncovered (WR-03)"
    requirement: CI-01
    verification:
      - kind: other
        ref: "grep -c 'browser starts' on both files (2 and 1 before, 0 and 0 after); grep -c on the four required literals"
        status: pass
    human_judgment: true
    rationale: "The literals are machine-asserted, but whether a reader auditing this repository's mail control from either file's prose actually LEARNS the right thing is a human read. The plan's own out-of-scope block records this as a human-verification item."
  - id: D6
    description: "REQUIREMENTS.md's HSURF-01 traceability row no longer reports a gap that never existed (bookkeeping)"
    verification:
      - kind: other
        ref: "grep -n '^| HSURF-01 ' .planning/REQUIREMENTS.md -> Complete; git diff shows exactly one changed cell"
        status: pass
    human_judgment: false

duration: 13 min
completed: 2026-09-04
status: complete
---

# Phase 19 Plan 12: D-14's Mail Refusal Reads the Environment the Job Actually Has — Summary

**A fail-closed privacy control that was documented as active while being structurally incapable of firing now reads `process.env` from a committed Node script, sources its prefix from the one file allowed to spell it, and is held in place by four parse-based invariants and a build-blocking design test — each of the eight reds watched, not reasoned about.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-04T14:46:24Z
- **Completed:** 2026-09-04T14:59:21Z
- **Tasks:** 3 of 3
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- **The runtime half is real.** `gate-e2e`'s first step after `npm ci` now runs `node scripts/refuse-mail-credential.mjs`, which reads `Object.keys(process.env)` — the same source `env |` prints, and the only place a `container.env` or runner-level key is observable. The step's entire `env:` map, including the `${{ env.… }}` expression that made the control inert, is gone.
- **The two halves cannot drift.** The prefix is declared once (`MAIL_KEY_PREFIX` in `scripts/verify-workflows.mjs`) and READ twice. Invariant B asserts three conjuncts: the declaration matches the shared pattern, the refusal script carries that pattern's source text verbatim, and the refusal script holds no copy of the value.
- **The repository's own cheapest audit is now machine-asserted.** `git grep -c -- <provider> .github/workflows/` went `1 -> 0`, and Invariant D (raw text, comments included) is what stops it coming back.
- **The proof runs on every build, not once in CI.** `tests/design/mail-credential-refusal.test.ts` spawns the real script in both directions under `vitest.design.config.ts`, which has no `globalSetup`/`setupFiles` — so it needs no Docker, no database and no browser.
- **Both files now describe the control that exists.** The false timing claim ("on job 1, before any browser starts") is deleted from all three places it was written; the D-14 bullet names which half observes what, and names WR-03 as carried forward rather than implying it is covered.

## Task Commits

1. **Task 1 (tracer, tdd): The refusal reads the environment the job actually has** — `631d690` (test, RED) → `98732b2` (feat, GREEN + workflow rewire). No REFACTOR commit; the script needed no cleanup.
2. **Task 2: Four invariants that make the two halves undriftable** — `807a8d6` (feat)
3. **Task 3: Both files describe the control the tree now has — and one bookkeeping cell** — `c173195` (docs)

_Task 1 is a TDD task, hence two commits (test → feat)._

## Files Created/Modified

- `scripts/refuse-mail-credential.mjs` (created) — The runtime half of D-14. Node ESM, `node:` builtins only. Reads the prefix declaration out of `scripts/verify-workflows.mjs` (resolved via `import.meta.url`, so the working directory never matters), scans `process.env` KEY names with `startsWith`, `::error::` + `exit 1` on a hit or on an unreadable prefix, and prints what it scanned on a green.
- `tests/design/mail-credential-refusal.test.ts` (created) — Five assertions, one per behaviour bullet, spawning the real script with an explicitly constructed child environment.
- `.github/workflows/ci.yml` (modified) — The `gate-e2e` refusal step's `run:` and the deletion of its whole `env:` map (Task 1); the header's timing correction, the four-to-seven invariant list, the Invariant D entry and the rewritten D-14 bullet (Task 3).
- `scripts/verify-workflows.mjs` (modified) — Three module-scope constants and four `check()` calls (Task 2); the mail-scan comment block's corrections (Task 3). The parse-based mail-env-key scan's executable lines are byte-unchanged.
- `.planning/REQUIREMENTS.md` (modified) — One traceability cell, as bookkeeping.

## The Eight Observed Reds, Verbatim

The whole point of this plan is that a guard which cannot fail has not been demonstrated to do anything. Every new check was driven red under a real mutation and the mutation reverted.

### 1. The design test, before `scripts/refuse-mail-credential.mjs` existed

```
 FAIL  tests/design/mail-credential-refusal.test.ts > the mail-credential refusal reads the environment the job actually has > exits 1 with an ::error:: line when a provider-named variable is in the child's environment
AssertionError: stdout carried no line beginning "::error::":
 FAIL  tests/design/mail-credential-refusal.test.ts > the mail-credential refusal reads the environment the job actually has > exits 0 and reports the prefix, the count scanned and its source when no such variable is present
AssertionError: stderr:
 FAIL  tests/design/mail-credential-refusal.test.ts > the mail-credential refusal reads the environment the job actually has > does not treat a name that merely CONTAINS the prefix as a hit
AssertionError: stdout:
 FAIL  tests/design/mail-credential-refusal.test.ts > the mail-credential refusal reads the environment the job actually has > exits 1 naming the source path when the prefix declaration cannot be read
AssertionError: stdout carried no line beginning "::error::":
 FAIL  tests/design/mail-credential-refusal.test.ts > the mail-credential refusal reads the environment the job actually has > prints the offending variable NAME and never its VALUE
AssertionError: expected '' to contain 'RESEND_API_KEY'
 Test Files  1 failed (1)
      Tests  5 failed (5)
```

The underlying cause, printed by the spawned child:

```
Error: Cannot find module 'C:\Users\Admin\Roaming\FitOut\scripts\refuse-mail-credential.mjs'
```

After the script was written: `Test Files  1 passed (1)` / `Tests  5 passed (5)`.

### 2. The script's own local output, line for line

Clean shell:

```
$ node scripts/refuse-mail-credential.mjs
refuse-mail-credential: prefix=RESEND read from C:\Users\Admin\Roaming\FitOut\scripts\verify-workflows.mjs — scanned 82 environment variable name(s), 0 begin with it.
exit=0
```

With a violating variable set:

```
$ RESEND_API_KEY=fake-local-probe-value node scripts/refuse-mail-credential.mjs
::error::A live mail credential is present in this job's REAL PROCESS ENVIRONMENT —
::error::not merely in the workflow's `env:` maps. A container-level `env:` block, a
::error::repository or environment secret, or a runner variable all reach here.
::error::Offending variable NAME(s): RESEND_API_KEY  (values deliberately not printed)
::error::A full e2e suite run with it set was MEASURED at FOURTEEN real outbound sends
::error::per run (finding [17-D28]): src/lib/email.ts binds its client at module load,
::error::so for this provider THE KEY IS THE SWITCH.
::error::Fix: remove it from the job, container or repository environment.
::error::Do NOT weaken this check — it is the only half of D-14 that can see this.
exit=1
```

The probe value `fake-local-probe-value` appears nowhere in the output. That is the property, not a coincidence — the design test asserts it.

### 3–8. One FAIL line per Task 2 mutation

Each mutation was applied alone, the checker run, the exact FAIL line captured, the mutation reverted, and the checker confirmed green (`All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8).`) before the next was applied.

**Mutation 1 — the refusal step's `run:` replaced with a trivial `echo` (Invariant A):**

```
  FAIL  "gate-e2e"'s mail refusal reads the REAL process environment — no ${{ }} expression, no env: map
          step=index 3  run="echo mutation-1"  env=null  expects scripts/refuse-mail-credential.mjs
  FAIL  "gate-e2e" refuses a live mail credential BEFORE it migrates, seeds or boots the suite
          indices: refusal=-1  db:migrate=2  db:seed=3  playwright=4  (of 5 run commands; only `npm ci` may precede the refusal, and that holds=false)
```

Green after revert.

**Mutation 2 — an `env:` map re-added to that step (Invariant A, the other conjunct):**

```
  FAIL  "gate-e2e"'s mail refusal reads the REAL process environment — no ${{ }} expression, no env: map
          step=index 3  run="node scripts/refuse-mail-credential.mjs"  env={"MAIL_KEY_UNDER_TEST":"${{ env.SOME_KEY }}"}  expects scripts/refuse-mail-credential.mjs
```

Green after revert. Note this is precisely the shape that shipped inert — it is now red.

**Mutation 3 — the `MAIL_KEY_PREFIX` declaration reformatted (single quotes + extra spacing) (Invariant B):**

```
  FAIL  the prefix is spelled ONCE: scripts/refuse-mail-credential.mjs reads this file's declaration and holds no copy
          declaration-matches-pattern=false  script-shares-pattern-source=true  script-holds-no-copy=true  (prefix=RESEND  pattern=^const MAIL_KEY_PREFIX = "([A-Z_]+)";$  script=6493 bytes)
```

Green after revert.

**Mutation 4 — the pattern inside `scripts/refuse-mail-credential.mjs` changed to a different but equivalent regular expression (`([A-Z]|_)+`) (Invariant B, shared-source conjunct):**

```
  FAIL  the prefix is spelled ONCE: scripts/refuse-mail-credential.mjs reads this file's declaration and holds no copy
          declaration-matches-pattern=true  script-shares-pattern-source=false  script-holds-no-copy=true  (prefix=RESEND  pattern=^const MAIL_KEY_PREFIX = "([A-Z_]+)";$  script=6494 bytes)
```

Green after revert. The two conjuncts fail independently and the evidence names which one — that is what makes the red diagnostic rather than merely loud.

**Mutation 5 — the refusal step moved after migrate and seed (Invariant C):**

```
run order: ["npm ci","npm run db:migrate","npm run db:seed","node scripts/refuse-mail-credential.mjs","npx playwright test --project=chromium"]
  FAIL  "gate-e2e" refuses a live mail credential BEFORE it migrates, seeds or boots the suite
          indices: refusal=3  db:migrate=1  db:seed=2  playwright=4  (of 5 run commands; only `npm ci` may precede the refusal, and that holds=false)
```

Green after revert. Invariant A stayed GREEN throughout this mutation — the step existed and was correctly shaped, it simply ran too late. That is exactly the property presence-checking cannot express.

**Mutation 6 — a comment line naming the provider token added to `baselines.yml` (Invariant D):**

```
  FAIL  across .github/workflows/ the mail-provider token appears ZERO times, in values AND in comments
          files scanned=[baselines.yml, ci.yml]  prefix=RESEND  occurrences=[baselines.yml:1]
```

Green after revert.

**Tree state after the last revert:** `git status --porcelain .github/workflows/ scripts/refuse-mail-credential.mjs scripts/verify-workflows.mjs` produced no output. A mutation is a measurement, and a measurement left in the tree is a defect.

## Measurements Before and After

| Measurement | Before | After |
|---|---|---|
| `node scripts/verify-workflows.mjs` | `All 44 invariants hold across 3 section(s) (baselines=11, ci=26, cross=7).` | `All 48 invariants hold across 3 section(s) (baselines=11, ci=29, cross=8).` |
| `git grep -c -- <provider> .github/workflows/` | `.github/workflows/ci.yml:1` | (no output — zero) |
| `grep -c "browser starts" .github/workflows/ci.yml` | `2` | `0` |
| `grep -c "browser starts" scripts/verify-workflows.mjs` | `1` | `0` |
| `grep -c "MAIL_KEY_UNDER_TEST" .github/workflows/ci.yml` | `2` (one live `env:` key, one header mention) | `1` (the header's historical mention, inside a falsification marker) |
| `gate-e2e` run-command order | `npm ci`, migrate, seed, playwright (refusal step present but inert) | `npm ci`, **refusal**, migrate, seed, playwright |
| Parsed `ci.yml` before/after, refusal step's own `run:`/`env:` excluded | — | `IDENTICAL` |

## Falsification Markers, Exactly as Written

So a later reader can find them by search:

- **Marker text (all three sites):** `FALSIFIED 2026-09-04 BY PLAN 19-12 (review finding CR-01)`
- `.github/workflows/ci.yml`, above the `gate-e2e` refusal step — `⚠ FALSIFIED 2026-09-04 BY PLAN 19-12 (review finding CR-01). THE CLAIM WAS: the step below carries an `env:` key whose name is deliberate, not incidental, because it is named after NEITHER the mail provider NOR its prefix …`
- `.github/workflows/ci.yml`, inside the header's D-14 bullet — `⚠ FALSIFIED 2026-09-04 BY PLAN 19-12 (review finding CR-01). THE CLAIM WAS: this step reads the key through a deliberately differently-named step `env:` key, so the parse half does not fire on a CORRECT file. …`
- `scripts/verify-workflows.mjs`, above the parse-based mail scan — `⚠ FALSIFIED 2026-09-04 BY PLAN 19-12 (review finding CR-01). THE CLAIM WAS: this scan reads env KEYS and not VALUES, and that is exactly why `gate-e2e`'s step does not trip it …`

Other literals now asserted by the plan's verify commands, present in both files: `start in parallel, and GitHub cancels neither` and `protects the NEXT run, never the current one`; and in `ci.yml` only, `the RUNTIME half is the one that observes container.env`.

**Deleted rather than falsified, deliberately:** the sentence claiming the parse half fires `about a minute before any browser starts`. A false sentence about WHEN a security control fires is, to grep, indistinguishable from the claim itself, and grep is how this repository audits its own prose. Both occurrences in `ci.yml` and the one in `verify-workflows.mjs` are gone; the replacement states the parallel-jobs fact instead.

## Decisions Made

See `key-decisions` in the frontmatter. The load-bearing one is the `assumption_delta` **promote**: D-14's primary assertion is now the half that observes the real process environment. The parse half is not deleted or weakened — it is correctly re-described as workflow-file hygiene over `env:` KEYS, which protects the next run and answers a different question.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] The step-comment falsification named `MAIL_KEY_UNDER_TEST` literally, breaking Task 1's own acceptance criterion**

- **Found during:** Task 1
- **Issue:** The plan's Task 1 action says to falsify the `MAIL_KEY_UNDER_TEST` paragraph in place "keeping its true historical content", while the same task's acceptance criteria require `git grep -c -- "MAIL_KEY_UNDER_TEST" .github/workflows/ci.yml` to return at most `1` — only the header's mention, which is Task 3's to falsify. The first draft spelled the key in the step comment, giving `2`.
- **Fix:** Rewrote the falsification to preserve the identical historical claim ("the step's `env:` key was named after NEITHER the mail provider NOR its prefix, so the parse half would not fire on a correct file; the two sites were spelled differently on purpose, and each of them said so") without spelling the key. No historical content was lost — only the literal token.
- **Files modified:** `.github/workflows/ci.yml`
- **Verification:** `grep -c "MAIL_KEY_UNDER_TEST" .github/workflows/ci.yml` -> `1`
- **Committed in:** `98732b2` (part of the Task 1 commit)

**2. [Rule 1 - Bug] Two required literals were line-wrapped and therefore not present as literals**

- **Found during:** Task 3
- **Issue:** `the RUNTIME half is the one that observes container.env` (in `ci.yml`) and `protects the NEXT run, never the current one` (in `verify-workflows.mjs`) were split across comment lines by the 100-column prose wrap, so the plan's `grep -c` acceptance checks returned `0`. A literal that only exists across a newline is not a literal an audit can find.
- **Fix:** Reflowed both paragraphs so each sentence sits on one line, with no change to meaning.
- **Files modified:** `.github/workflows/ci.yml`, `scripts/verify-workflows.mjs`
- **Verification:** both `grep -c` checks now return `1`
- **Committed in:** `c173195` (part of the Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 × Rule 2, 1 × Rule 1)
**Impact on plan:** None on scope. Both were the plan's own acceptance criteria catching a first draft that had not yet satisfied them — which is the gate working. No file outside the plan's five `files_modified` was touched.

## Issues Encountered

**A `git checkout --` used to revert a mutation destroyed uncommitted Task 2 work, once.** During the first pass at mutation 3, the revert `git checkout -- scripts/verify-workflows.mjs` restored the file to `HEAD` — which at that moment predated Task 2's four invariants, because they had not been committed yet. The invariant count dropped back to 44 and the work had to be re-applied. **Resolution and the rule it establishes:** commit the checker's changes FIRST, then mutate and revert against the committed state. Mutations 1–6 were all re-run against the committed `807a8d6`, and every FAIL line recorded above comes from that clean re-run, not from the lost pass. The lost work was re-applied byte-for-byte; nothing shipped from the first attempt.

**Windows line endings twice bit the mutation harness, not the product.** `.gitattributes` declares `* text=auto` and this machine has `core.autocrlf` on, so `git checkout --` restores CRLF working-tree bytes for LF-committed sources. A mutation script matching an exact `\n`-joined block failed with `step block not found`; a second attempt inserted the moved step before `gate-visual`'s Playwright step (the first `- name: Playwright` in the file) rather than `gate-e2e`'s, which produced a *deletion* red instead of the *move* red Invariant C exists for. Both were re-run correctly — mutation 5's recorded FAIL line is the genuine move, with the step present at index 3 and Invariant A staying green. **This also motivated a product decision:** both `scripts/refuse-mail-credential.mjs` and Invariant B normalise `\r\n` out of the source text before matching the prefix declaration, so a checkout with `core.autocrlf=true` cannot make the `;$` anchor miss and turn a real control into a vacuous one on Windows.

## Carried Forward — NOT Closed by This Plan

Named here so the next reader does not have to rediscover that they are open:

- **WR-01** — `unlistListing` / `softDeleteListing` / `ConfirmDialog.onConfirm` missing `try`/`catch`. WARNING severity. No file under `src/` was touched by this plan.
- **WR-03** — widening the PARSE half to walk `job.container.env` and `job.services.*.env` keys, plus a `vars.` value scan. The `container.env` VECTOR is now covered by the runtime half; the parse half's blindness at those two levels remains, and is stated in both files' prose rather than left implicit.
- **WR-04** — ~11 stale `<file>:<line>` citations.
- **CR-02 / verification truth #5** — `gate-e2e` is not a required branch-protection check, and the `ci` run is red on every push because of 14 pre-existing e2e failures. A recorded PM hold and a human-verification item. No `continue-on-error`, no known-failures allowlist and no suite repair was added — and `continue-on-error` would additionally turn 19-11's unconditional invariant red.
- **REQUIREMENTS.md hygiene** — the `- [ ] **HSURF-01**` checkbox at line 237 is unticked while HSURF-02 and CI-01 are ticked. Observed and DELIBERATELY not corrected: the scope fence named the traceability row and only the traceability row.

## Known Stubs

None. No hardcoded empty value, placeholder string or unwired data source was introduced. Both new files are fully implemented and exercised by passing assertions.

## Threat Flags

None. This plan removes an information-disclosure surface (`T-19-12-01`) and adds no new network endpoint, auth path, file-access pattern or schema change. `T-19-12-05` (`services.*.env`) and `T-19-12-06` (`vars.` under an unrelated name) remain `accept` dispositions with their residuals named in `ci.yml`'s header.

## Honest Limits of This Verification

Everything above was proven **offline**: a build-blocking design test, direct script invocation, and parse-based invariants over the workflow files. **Nothing here was proven by an actual GitHub Actions run.** The claim that the step fires inside `gate-e2e`'s container rests on `process.env` being populated from `container.env` and the runner environment — which is how the runner works and is why the fix was prescribed — but this plan did not push a branch with a container-level key set to watch the job go red on GitHub. That would be the one remaining piece of evidence, and it is a deliberate non-goal here (the plan's verification set is offline by design).

## User Setup Required

None — no external service configuration required. This plan installs zero packages, adds zero `uses:` entries, and changes no `package.json`.

## Next Phase Readiness

Phase 19's CI-01 gap is closed and machine-asserted. The full design suite is green (`77 passed`, `1352 passed | 3 skipped`), ESLint is clean on all three touched source files, and `node scripts/verify-workflows.mjs` exits 0 at 48 invariants. Remaining Phase 19 outstanding items are the four carried-forward findings listed above, all of which are WARNING severity or recorded PM holds rather than gaps.

---
*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Completed: 2026-09-04*

## Self-Check: PASSED

- `scripts/refuse-mail-credential.mjs` — FOUND on disk, git-tracked
- `tests/design/mail-credential-refusal.test.ts` — FOUND on disk, git-tracked
- `.planning/phases/19-host-listing-surfaces-gates-that-actually-run/19-12-SUMMARY.md` — FOUND on disk
- Commits `631d690`, `98732b2`, `807a8d6`, `c173195` — all FOUND in `git log`
- All task `<acceptance_criteria>` re-run and passing; all five plan-level `<verification>` items satisfied
