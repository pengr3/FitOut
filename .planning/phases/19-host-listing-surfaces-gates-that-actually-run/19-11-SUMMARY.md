---
phase: 19-host-listing-surfaces-gates-that-actually-run
plan: 11
subsystem: infra
tags: [ci, github-actions, playwright, workflow-verifier, gate-e2e, mutation-testing, documentation]

requires:
  - phase: 19-01
    provides: "gate-e2e — the fifth CI job whose run commands these three invariants quantify over"
  - phase: 19-08
    provides: "the gate-e2e hard stop + display-name invariant this plan extends, and the 23-invariant `ci` count it had to exceed by exactly three"
  - phase: 12-15
    provides: "scripts/verify-workflows.mjs, and the gate-visual by-name + ordering checks whose shape these three copy verbatim"
provides:
  - "Three counted invariants that a DETACHED gate-e2e cannot survive: runs-the-suite BY NAME, unconditional, seeds-before-suite BY INDEX"
  - "Four watched reds (five mutations), each reverted with ci.yml's sha256 verified back to baseline"
  - "A ci.yml header that is TRUE about the file it is attached to: five jobs, D-24's exclusion falsified in place, the parser's own known hole named"
  - "The written record, in the workflow file itself, that gate-e2e REPORTS but does not BLOCK, and why"
affects: [e2e-suite-repair, branch-protection, ci-sharding, workflow-verifier]

actuals:
  tokens: 3800
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A gate assertion must quantify over what the job DOES, not only over the job's existence — a kept, correctly-named job made to do nothing satisfies every existence check"
    - "Existentials over a run-command list fail on an empty list; that is why emptiness is red rather than vacuously green"
    - "A documentation correction is falsified IN PLACE — keep the old claim, date it, attribute the plan, state what replaced it — so the correction is legible as a correction"

key-files:
  created: []
  modified:
    - scripts/verify-workflows.mjs
    - .github/workflows/ci.yml

key-decisions:
  - "Invariant 2 (unconditional) quantifies over the job's `if:` / `continue-on-error` keys, NOT over runsOf(e2e) — following the plan's <action> text and WR-01's fix sketch over the acceptance criterion's over-generalised 'all three'. Recorded as a deviation rather than glossed."
  - "The header edit was additionally proven SEMANTICALLY, not only line-wise: the parsed YAML tree is byte-identical to HEAD's, which is a stronger claim than 'only comment lines changed'."
  - "WR-02's measured hole in the mail scan is NAMED in the header rather than closed — closing it was outside this run's assigned scope, and a list that omits a known hole is the defect this plan exists to remove."
  - "No mutation was left in the tree: ci.yml's sha256 was verified equal to ba336708… after every one of the five mutations."

patterns-established:
  - "Mutation harness refuses to proceed when the mutation did not change the file — 19-08's deviation 3 (a mutation that silently did not apply reports the same green as a pass) is now structurally impossible for this plan's reds."
  - "Prove a documentation-only edit by parsing both trees and comparing, not by eyeballing the diff."

requirements-completed: [CI-01]

coverage:
  - id: D1
    description: "Deleting gate-e2e's Playwright step turns `node scripts/verify-workflows.mjs` red instead of leaving every invariant green"
    requirement: CI-01
    verification:
      - kind: other
        ref: "watched red 1 — ci.yml Playwright step deleted; `--section=ci` exit 1, 2 of 26 FAILED; reverted, sha256 back to ba336708"
        status: pass
      - kind: other
        ref: "node scripts/verify-workflows.mjs --section=ci — `\"gate-e2e\" runs the functional project BY NAME (--project=chromium)` present and ok"
        status: pass
    human_judgment: false
  - id: D2
    description: "A job-level `if:` or `continue-on-error: true` on gate-e2e turns the checker red"
    requirement: CI-01
    verification:
      - kind: other
        ref: "watched reds 2a/2b — `continue-on-error: true` then `if: github.event_name == 'workflow_dispatch'`; exit 1 each, evidence names which one fired; both reverted to baseline sha"
        status: pass
    human_judgment: false
  - id: D3
    description: "A seed step that exists but runs AFTER the suite is red, because the comparison is by index"
    requirement: CI-01
    verification:
      - kind: other
        ref: "watched red 3 — seed moved after the Playwright step; `indices: db:seed=4  playwright=3  (of 5 run commands)`, exit 1; reverted"
        status: pass
    human_judgment: false
  - id: D4
    description: "An empty run-command list makes the run-command invariants FALSE rather than vacuously true"
    requirement: CI-01
    verification:
      - kind: other
        ref: "watched red 4 — gate-e2e `steps: []`; `run commands=[]` and `indices: db:seed=-1 playwright=-1 (of 0 run commands)`, exit 1; reverted"
        status: pass
    human_judgment: false
  - id: D5
    description: "The `ci` invariant count is exactly three higher than the count 19-08 recorded, and the whole script exits 0"
    requirement: CI-01
    verification:
      - kind: other
        ref: "node scripts/verify-workflows.mjs — `All 44 invariants hold across 3 section(s) (baselines=11, ci=26, cross=7)`, exit 0 (19-08 recorded 41 / ci=23)"
        status: pass
    human_judgment: false
  - id: D6
    description: "ci.yml's header states five jobs, names gate-e2e, retires D-24's exclusion claim in the file's own falsification style, and records what the parser is known NOT to assert"
    requirement: CI-01
    verification:
      - kind: other
        ref: "node -e yaml parse — 5 jobs [gate-db-free, gate-db, gate-price-parity, gate-visual, gate-e2e], exit 0"
        status: pass
      - kind: other
        ref: "git diff -U0 -- .github/workflows/ci.yml — zero changed lines whose first non-whitespace char is not `#` (99 added / 6 removed, all comments)"
        status: pass
      - kind: other
        ref: "parsed-tree equality: JSON.stringify(yaml.parse(HEAD:ci.yml)) === JSON.stringify(yaml.parse(worktree ci.yml)) — true"
        status: pass
    human_judgment: false
  - id: D7
    description: "The snapshot-update flag's spelling was not introduced anywhere in ci.yml by this edit"
    verification:
      - kind: other
        ref: "the file's own one-command audit (`grep -c` for the flag against ci.yml) returns 0 after the edit"
        status: pass
    human_judgment: false

duration: 3 min
completed: 2026-09-04
status: complete
---

# Phase 19 Plan 11: A Gate That Cannot Be Detached, and a Header That Is True Summary

**Three counted invariants — runs-the-suite `--project=chromium` BY NAME, unconditional, seeds-before-suite BY INDEX — each watched RED under a deliberate and reverted mutation of `ci.yml`, taking the `ci` section from 23 to 26; plus a header that now says FIVE jobs, retires D-24's e2e-exclusion claim in place, and names the hole the parser is known to have.**

## Performance

- **Duration:** 3 min (`79a156a` 20:26:09+08:00 → `5bb70d0` 20:29:10+08:00)
- **Started:** 2026-09-04T12:26:09Z
- **Completed:** 2026-09-04T12:29:10Z
- **Tasks:** 2
- **Files modified:** 2 (`scripts/verify-workflows.mjs` +50; `.github/workflows/ci.yml` +99/−6, all comment lines)

## Accomplishments

- **`gate-e2e` can no longer be made to do nothing in silence.** Before this plan you could delete its Playwright step and every one of the 41 invariants still passed — the required check would have gone green over a job that installs npm and stops. Three checks now quantify over the job's *run commands* rather than its *existence*.
- **Every one of them was watched failing** under a real mutation, and each mutation was reverted with `ci.yml`'s sha256 verified back to the baseline `ba336708…`. Five mutations, four distinct failure shapes.
- **`ci.yml`'s header describes `ci.yml` again.** It said FOUR jobs and claimed almost the whole e2e set was excluded from CI; both were false the moment `gate-e2e` landed, and the exclusion claim is the passage a reader auditing D-24 would have trusted.
- **The header now records what the parser is known NOT to assert** — WR-02's measured `container.env` / `services.*.env` hole in the mail scan — rather than leaving the omission implicit.

---

## THE INVARIANT COUNT — MEASURED, BOTH ENDS

| | 19-08 recorded | after this plan |
|---|---|---|
| total | 41 | **44** |
| baselines | 11 | 11 |
| **ci** | **23** | **26** |
| cross | 7 | 7 |

`+3` exactly, and `node scripts/verify-workflows.mjs` exits **0**.

---

## THE FOUR OBSERVED FAIL LINES, VERBATIM (Task 1)

Every mutation below was applied to `.github/workflows/ci.yml`, observed, then reverted; the file's
sha256 was checked equal to the baseline `ba3367089379042240249e6287fe4b886e73cdb449997d9c5df866c4196188dd`
after each revert, and `node scripts/verify-workflows.mjs` was confirmed green again before the next
mutation was applied.

### Red 1 — the Playwright step deleted

`git diff --stat` → `1 file changed, 2 deletions(-)`. Exit **1**, `2 of 26 invariant(s) FAILED`.

```
  FAIL  "gate-e2e" runs the functional project BY NAME (--project=chromium)
          run commands=["npm ci","if [ -n \"${MAIL_KEY_UNDER_TEST:-}\" ]; then\n  echo \"::error::A live mail credential is present in this job's environment.\"\n  echo \"A full e2e run with it set was measured at 14 real outbound sends per run.\"\n  echo \"Remove it from the workflow/repository environment; do NOT weaken this check.\"\n  exit 1\nfi\n","npm run db:migrate","npm run db:seed"]
```

```
  FAIL  "gate-e2e" seeds the demo catalogue BEFORE it runs the suite
          indices: db:seed=3  playwright=-1  (of 4 run commands)
```

The ordering invariant fires too, and that is correct rather than redundant: with the suite gone
there is nothing for the seed to precede, and the check requires **both** indices to be non-negative.

### Red 2a — `continue-on-error: true` added to the job

`1 file changed, 1 insertion(+)`. Exit **1**.

```
  FAIL  "gate-e2e" is unconditional — no job-level if:, no continue-on-error: true
          if=null  continue-on-error=true
```

### Red 2b — a job-level `if:` added

`1 file changed, 1 insertion(+)`. Exit **1**.

```
  FAIL  "gate-e2e" is unconditional — no job-level if:, no continue-on-error: true
          if="github.event_name == 'workflow_dispatch'"  continue-on-error=null
```

The two evidence strings differ, which was the point of testing the two keys separately: a red names
which one fired without the reader opening the workflow.

### Red 3 — the seed step moved to after the Playwright step

`1 file changed, 3 insertions(+), 2 deletions(-)`. Exit **1**.

```
  FAIL  "gate-e2e" seeds the demo catalogue BEFORE it runs the suite
          indices: db:seed=4  playwright=3  (of 5 run commands)
```

**Presence alone would have passed this.** Both steps exist in the mutated file; only the index
comparison catches it.

### Red 4 — `gate-e2e`'s steps emptied (`steps: []`), the existential proof

`1 file changed, 1 insertion(+), 63 deletions(-)`. Exit **1**.

```
  FAIL  "gate-e2e" runs the functional project BY NAME (--project=chromium)
          run commands=[]
```

```
  FAIL  "gate-e2e" seeds the demo catalogue BEFORE it runs the suite
          indices: db:seed=-1  playwright=-1  (of 0 run commands)
```

The printed evidence **is** the empty list, exactly as the plan's `must_haves` required. An
existential over an empty list is false, so emptiness is red rather than vacuously green.

⚠ **The unconditional invariant stays GREEN under this mutation, and that is correct.** A job with
no steps and no `if:` genuinely *is* unconditional; its emptiness is a different property, and it is
the one the other two checks catch. See the deviation below — the plan's acceptance criterion said
"all three", which cannot be true of an invariant the plan's own `<action>` defines over the job's
`if:` / `continue-on-error` keys.

**Final tree state:** `git status --porcelain .github/workflows/ci.yml` → **no output**. No mutation
was left behind.

---

## THE HEADER CORRECTIONS (Task 2) — EXACT WORDING, SO THEY CAN BE FOUND BY SEARCH

Four comment-only edits plus one closing note. Search strings for a later reader:

| # | What changed | Findable by |
|---|---|---|
| 1 | `THE JOB SPLIT (D-24 + D-35). FOUR jobs` → `FIVE jobs`, with a parse-counted correction note and a fifth list entry for `gate-e2e` | `COUNT CORRECTION, 2026-09-04, plan 19-11` |
| 2 | The eleven-of-twelve exclusion bullet, kept verbatim and falsified beneath it | `⚠ FALSIFIED 2026-09-04 BY PLAN 19-11 (review finding WR-05)` |
| 3 | Job 3's "The ONE narrow exception is now HERE" — quantifier retired, content preserved | `⚠ QUANTIFIER FALSIFIED 2026-09-04 BY PLAN 19-11 (WR-05)` |
| 4 | The invariant list, extended past jobs 4 and 5 | `⚠ THE LIST ABOVE PREDATES JOBS 4 AND 5. EXTENDED 2026-09-04 BY PLAN 19-11 (WR-05)` |
| 5 | The closing note on what the gates do not do | `── WHAT THESE GATES DO NOT DO (2026-09-04, plan 19-11) ──` and `gate-e2e` REPORTS; IT DOES NOT BLOCK. |

**The falsification style is the file's own, not a new one.** Edits 2 and 3 keep the original
sentence and mark it falsified with a date and the plan, in the register of the two passages the file
had already falsified in place (the `ls e2e/*.spec.ts` count correction, and the paragraph recording
that the visual step landed on job 1 and later left it).

**What edit 2 keeps as well as what it retires.** The flake argument is *not* retired — it is why
`gate-e2e` shipped last, shipped non-required, and was measured before being trusted. D-13's
wall-clock (48m 22s / 460 tests / 39 specs / one worker, run `33840948047`) is cited as now existing,
along with the fourteen reproducible failures, which is the second reason the gate is not required.

**What edit 4 adds that WR-05 did not ask for**: it names the D-14 mail assertion's *two halves*
separately — job 5's runtime refusal step and job 1's parse-based key scan — and then names the hole
WR-02 measured in the parse half (`container.env` and `services.*.env` are not walked). That hole is
**not closed here**; naming it was the assigned scope, and the header says so.

### The edit is documentation-only, proven twice

1. **Line-wise:** `git diff -U0 -- .github/workflows/ci.yml` has **zero** added or removed lines whose
   first non-whitespace character is not `#`. 99 added, 6 removed, all comments.
2. **Semantically, which is the stronger claim:** the parsed YAML trees are identical.
   `JSON.stringify(yaml.parse(git show HEAD:ci.yml)) === JSON.stringify(yaml.parse(ci.yml))` → `true`.
   No job, step, `run:` command, `env:` key, container, service or trigger differs.

The workflow still parses to exactly five jobs:
`gate-db-free, gate-db, gate-price-parity, gate-visual, gate-e2e`.

**The snapshot-update prohibition survived the edit.** The file's own cheapest audit — one `grep -c`
for the forbidden flag against `ci.yml` — still returns **0**. The token was not introduced while
editing prose directly around the paragraph that warns about exactly that.

Line endings were preserved: `ci.yml` is still **pure CRLF** (1346 CRLF, 0 bare LF), so the diff is
the edit and nothing else.

---

## Task Commits

1. **Task 1: three invariants a detached gate cannot survive** — `79a156a` (feat)
2. **Task 2: the ci.yml header describes the file it is attached to** — `5bb70d0` (docs)

**Plan metadata:** see the `docs(19-11)` commit carrying this file.

## Files Created/Modified

- `scripts/verify-workflows.mjs` — **modified**, +50 lines: three `check()` calls in the `ci`
  section's `gate-e2e` block, placed after the display-name check and before the `gate-visual` hard
  stop, all bound to a single local `e2eRuns = runsOf(e2e)` so the evidence strings can print it.
- `.github/workflows/ci.yml` — **modified**, +99/−6, every changed line a comment. Mutated and
  reverted five times to produce the reds above; unchanged by Task 1's commit.

## Decisions Made

1. **Invariant 2 quantifies over the job's keys, not over its run commands** — see the deviation.
2. **Prove the header edit by parsing both trees**, not only by grepping the diff for non-comment
   lines. A comment-only line diff is a proxy; tree equality is the property.
3. **Name WR-02's hole in the header rather than close it.** Widening the mail scan was explicitly
   outside this gap-closure run's assigned scope (plan `assumptions`), and an unnamed known hole is
   the same defect class as the header this plan just corrected.
4. **Do not touch D-15's required-check flip.** Branch protection still returns 403; the header now
   records that as a decision, which is the most this plan is permitted to do about it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug, in the plan's own acceptance criteria] "all three" cannot be true of invariant 2**

- **Found during:** Task 1, the `steps: []` mutation.
- **Issue:** The plan's acceptance criteria say *"Each new check's `ok` expression is an existential
  or an index comparison over `runsOf(e2e)`, so a job with an empty run-command list makes all three
  false"*, and a `must_haves` truth restates it. But the plan's own `<action>` defines invariant 2 as
  *"the job declares no job-level `if:` AND does not set `continue-on-error` to true"* — a predicate
  over the job's YAML keys, which has nothing to quantify over the run-command list. WR-01's fix
  sketch, which the plan names as the shape to copy, spells it the same way. The two statements
  cannot both hold.
- **Fix:** Implemented invariant 2 per the `<action>` text and WR-01's sketch. Under `steps: []` two
  of the three go red (with the empty list itself as the printed evidence, which is what the truth
  actually demanded) and the unconditional check stays green — correctly, because a job with no
  steps and no `if:` *is* unconditional. Emptiness is caught, twice, by the checks whose subject it
  actually is.
- **Files modified:** `scripts/verify-workflows.mjs`.
- **Verification:** Red 4 above; both empty-list FAIL lines recorded verbatim.
- **Committed in:** `79a156a`.

---

**Total deviations:** 1 auto-fixed (1 bug, in the plan's acceptance criteria rather than in code).
**Impact on plan:** None on scope. Three invariants shipped, all three watched red, the count moved
by exactly three. One acceptance criterion is satisfied in substance (the empty run-command list is
red and its evidence is the empty list) but not in its literal "all three" quantifier, and that is
recorded here rather than quietly satisfied by weakening invariant 2 into something it should not be.

## Issues Encountered

- **`ci.yml` is CRLF and `scripts/verify-workflows.mjs` is LF** (`git ls-files --eol`: `i/lf w/crlf`
  vs `i/lf w/lf`). 19-08's deviation 3 recorded a mutation that silently failed to apply for exactly
  this reason and printed a green that read like a passing check. Every mutation here went through a
  harness that spells its anchors with `\r\n`, refuses to write when the file's sha256 did not
  change, and was cross-checked with `git diff --stat` before the verifier's output was believed.
- **The first `steps: []` attempt truncated the whole file** (the anchor matched `gate-db-free`'s
  `steps:`, and the slice ran to EOF), which removed four jobs and fired the `gate-visual` hard stop
  instead of the intended three FAILs. Caught by reading the `783 +----` diffstat rather than the
  exit code, re-anchored to `gate-e2e`, and re-run. Recorded because it is the same lesson: the
  diffstat, not the exit code, is what tells you the mutation you meant is the mutation you got.

## Carried Forward, NOT Closed Here

- **WR-02** — the mail scan does not walk `container.env` / `services.*.env`. Now **named in the
  header**; the scan is unchanged.
- **WR-03, WR-04, WR-06, WR-07, WR-08** — real, assigned to no plan in this gap-closure run, and not
  absorbed. WR-06 in particular (three stale "these specs do not run in CI" comments in
  `e2e/helpers/booker-seed.ts` and `tests/host/verification-surface.test.ts`) is the *same* stale
  premise this plan just corrected in `ci.yml`, one file over.
- **D-15's required-check flip** — branch protection returns `403 — Upgrade to GitHub Pro or make
  this repository public`. Untouched by design; now written down in `ci.yml` itself.
- **The 14 reproducible e2e failures and the visual baselines stale since 2026-08-30** — a suite
  repair phase, named in the verification report.

## User Setup Required

None from this plan. The two PM decisions 19-08 raised (repository visibility / GitHub Pro, and
funding a suite-repair phase) still stand and are unchanged by this plan.

## Next Phase Readiness

**Ready.** Phase 19's three gap-closure plans are done: 19-09 closed GAP 1, 19-10 closed GAP 2, and
19-11 closes the two CI-01 warnings. `node scripts/verify-workflows.mjs` exits 0 at 44 invariants.

⚠ **Success criterion 4 of this phase is STILL NOT MET, and this summary does not claim otherwise.**
`gate-e2e` reports; it does not block. This plan made the gate harder to **detach**; nothing here
makes it **blocking**, and nothing could — that is prerequisite A, a billing-or-visibility decision,
plus prerequisite C, a suite that has never once been green.

---
*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Completed: 2026-09-04*

## Self-Check: PASSED

Both claimed commits (`79a156a`, `5bb70d0`) resolve in this repository. Both modified files exist on
disk. `node scripts/verify-workflows.mjs` exits **0** at **44 invariants** (`baselines=11, ci=26,
cross=7`) — exactly three more in the `ci` section than the 23 recorded in `19-08-SUMMARY.md`.
`git status --porcelain .github/workflows/ci.yml` is empty, so none of the five mutations used to
watch a red survives in the tree. The workflow parses to five jobs and its parsed tree is identical
to HEAD's, so Task 2's edit is documentation-only in substance and not only in line shape.
