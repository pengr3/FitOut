---
phase: 19-host-listing-surfaces-gates-that-actually-run
plan: 08
subsystem: infra
tags: [ci, github-actions, playwright, branch-protection, workflow-verifier, e2e]

requires:
  - phase: 19-01
    provides: "gate-e2e — the functional Playwright job, shipped non-required and never once executed on a real runner"
  - phase: 19-02
    provides: "e2e/host-listing-grid.spec.ts — this phase's own spec, the only file it was honest to mutate for a watched red"
  - phase: 19-06
    provides: "e2e/host-route-reachability.spec.ts — the 39th spec, which pins the denominator D-13's number is attached to"
  - phase: 12-15
    provides: "scripts/verify-workflows.mjs and its `ci` section — the shape the new existence assertion mirrors"
provides:
  - "D-13's wall-clock, MEASURED: 48m 22s over 460 tests in 39 spec files on one worker (run 33840948047)"
  - "Two watched reds, both reverted: an assertion mutation in this phase's own spec, and a mail-credential env key"
  - "A hard stop + one counted invariant so deleting or renaming gate-e2e can no longer pass silently"
  - "The written record that gate-e2e ships NON-REQUIRED, and the two prerequisites that stand"
  - "Evidence that a deployed Vercel environment exists — filed against the still-open production-scope question, not closing it"
affects: [ci-sharding, e2e-suite-repair, visual-baselines, branch-protection, production-scope]

actuals:
  tokens: 9500
  tasks: 3
  commits: 8

tech-stack:
  added: []
  patterns:
    - "A universally-quantified invariant set needs a positive existence assertion, or a deletion satisfies it vacuously"
    - "A required status check is matched by a job's `name:`, not its YAML key — so the display name is the thing worth asserting"

key-files:
  created:
    - .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/gate-e2e-wallclock.txt
  modified:
    - .github/workflows/ci.yml
    - scripts/verify-workflows.mjs

key-decisions:
  - "HOLD the required-check flip (PM option 2). gate-e2e ends phase 19 non-required, with prerequisites A and C named rather than papered over."
  - "Answer research Open Question 5 YES (PM option 2d): the workflow verifier gains an existence assertion for gate-e2e."
  - "Assert the job's DISPLAY NAME as well as its key, because branch protection matches on the display name and a `name:` edit would silently unbind a future required check."
  - "Make NO sharding decision. D-13's number now exists; the decision it gates is still deferred."
  - "Resolve the main<->dev baselines.yml add/add conflict to the branch side — main's 303-line file is a pre-Phase-12 snapshot the 418-line branch version strictly supersedes."

patterns-established:
  - "Watch it fail before you trust it: every assertion added here was seen red under a deliberate mutation, then reverted byte-identical (sha256-verified), before being committed."
  - "Measure the invariant count, never predict it — the `ci` section's total is dynamic, and a hard stop deliberately does not increment it."

requirements-completed: [CI-01]

coverage:
  - id: D1
    description: "D-13's full-suite CI wall-clock is measured and recorded against a known spec count, with per-step durations and a retry count"
    requirement: CI-01
    verification:
      - kind: other
        ref: "evidence/gate-e2e-wallclock.txt — run 33840948047, 48m 22s, 460 tests / 39 specs / 1 worker, 135 retry executions"
        status: pass
      - kind: other
        ref: "ls e2e/*.spec.ts | wc -l = 39"
        status: pass
    human_judgment: false
  - id: D2
    description: "A failing spec turns a CI run red — proven by watching, not by reading the workflow file"
    requirement: CI-01
    verification:
      - kind: e2e
        ref: "run 33843226846 — e2e/host-listing-grid.spec.ts assertion mutated toBe(1) -> toBe(2), gate-e2e FAILURE"
        status: pass
    human_judgment: false
  - id: D3
    description: "The mail-credential refusal fires in CI for its own reason, with its own message"
    requirement: CI-01
    verification:
      - kind: other
        ref: "run 33842567618 — gate-db-free FAILURE, verify-workflows.mjs: `hits=[gate-e2e.step.env.RESEND_API_KEY]`"
        status: pass
    human_judgment: false
  - id: D4
    description: "Deleting or renaming gate-e2e stops being invisible: a hard stop on the job key, a counted invariant on the display name"
    verification:
      - kind: other
        ref: "node scripts/verify-workflows.mjs — 41 invariants, exit 0; both mutations watched exit 1"
        status: pass
    human_judgment: false
  - id: D5
    description: "gate-e2e is a REQUIRED status check on the default branch"
    verification: []
    human_judgment: true
    rationale: "NOT DELIVERED. Held by PM decision (option 2). Prerequisite A — branch protection returns 403 'Upgrade to GitHub Pro or make this repository public' — and prerequisite C — there is no green run, 14 e2e tests fail reproducibly. A human must decide whether to make the repo public / buy Pro and whether to fund the suite repair before this can be delivered at all."
  - id: D6
    description: "A deployed Vercel environment exists, filed as evidence against the open production-scope question"
    verification: []
    human_judgment: true
    rationale: "This is evidence for a PM question that is deliberately left UNANSWERED (WINDOWS ledger entry 5, STATE.md blocker from 19-04). It demonstrates a deployment exists; it does not establish that the deployment has its own database. Only the PM can decide the scope, and nobody has measured it."

duration: 2h 4m
completed: 2026-09-04
status: complete
---

# Phase 19 Plan 08: gate-e2e — Measured, Watched Failing, and Deliberately Not Required Yet Summary

**D-13's wall-clock finally exists (48m 22s / 460 tests / 39 specs / one worker), the gate was watched turning a pull request red twice, and the flip to a required check was HELD — because branch protection is unreachable on a Free private repo and the suite has never once been green.**

## Performance

- **Duration:** 2h 4m (first task commit `3051985` at 13:28:34+08:00 → `d5a7425` at 15:32:00+08:00)
- **Started:** 2026-09-04T05:28:34Z
- **Completed:** 2026-09-04T07:32:00Z
- **Tasks:** 3
- **Files modified:** 3 (one created, two modified; two more mutated and reverted byte-identical)

## Accomplishments

- **D-13's number exists.** It never did before today — `gate-e2e` had never executed on a real runner, and every claim in 19-01 was made over a parsed workflow tree.
- **The gate was seen going red, twice, for two different reasons** — a spec failure and a mail credential — and both mutations were reverted.
- **`gate-e2e` can no longer be deleted or renamed in silence.** That was the phase's quietest hole and it is closed.
- **The flip was held, and the reasons are written down** rather than being absorbed into a green-looking summary.
- **The `main` ↔ `dev` divergence was resolved**, which turned PR #1 mergeable and produced this repository's **first ever `pull_request` CI run**.

---

## D-13 — THE MEASUREMENT (Task 1)

Full detail, including per-step durations and the verbatim Playwright output, is in
`evidence/gate-e2e-wallclock.txt`. The headline:

| | |
|---|---|
| run | `33840948047` — https://github.com/pengr3/FitOut/actions/runs/33840948047 |
| **total wall-clock** | **48m 22s** (05:33:49Z → 06:22:11Z) |
| the suite itself | 43m 01s |
| everything else | 5m 17s, of which `npm ci` alone is 4m 04s |
| collected | **39 spec files, 460 tests**, matching `ls e2e/*.spec.ts \| wc -l` |
| workers | **1** — `workers` is unset in `playwright.config.ts`, so it defaults to half the logical cores, and a 2-core `ubuntu-latest` runner yields exactly one. The suite is fully serial. |
| retries | 135 retry executions (595 result lines for 460 tests) |

**NO SHARDING DECISION IS MADE HERE, and this summary declines to make one.** That decision is
explicitly deferred (`19-CONTEXT.md § Deferred Ideas`) and needed this number to exist first. It now
exists. One observation is recorded for whoever takes that decision, as an observation and not a
recommendation: one worker is the largest single term in the 43 minutes, so raising `workers` is worth
weighing before splitting the suite across jobs.

**The 43 minutes is an UPPER BOUND, not the cost of a green suite.** 135 retry executions are a
material share of it. Whoever fixes the 14 failures must re-measure rather than assume this number
carries over.

**The cap was raised once, 45 → 90** (`3051985`), on measured evidence: the *first* run
(`33837652193`) EXPIRED at 45 minutes having completed 35 of 39 spec files, which projected to ~50
minutes. The arithmetic is written at the site in `ci.yml`, not hidden in a commit message. **It must
not be raised again** — a suite that cannot finish inside 90 minutes is D-13's sharding conversation.

**No spec was skipped, subsetted or filtered** at any point to reach any number in this plan. The run
command is unchanged: `npx playwright test --project=chromium`, no spec path.

---

## THE TWO WATCHED REDS (Task 2)

### Red one — the suite

| | |
|---|---|
| mutated | `e2e/host-listing-grid.spec.ts` — one character, `toBe(1)` → `toBe(2)` |
| caught by | `gate-e2e` |
| time to red | ~46 minutes (it is the full suite; the assertion is near the end of its file) |
| verbatim | `Expected: 2` / `Received: 1` on the host-listing-grid card-count assertion |
| commits | `0435488` (mutate) → `acff477` (revert) |

### Red two — the mail-credential refusal

| | |
|---|---|
| mutated | `.github/workflows/ci.yml` — added `RESEND_API_KEY` to the `gate-e2e` step env with a **dummy** value |
| caught by | `gate-db-free`, running `scripts/verify-workflows.mjs` |
| time to red | **~1 minute** — before any browser started, which is exactly the property the parse-based shape exists for |
| verbatim | `FAIL  no job, step or workflow env KEY declares RESEND_API_KEY — the e2e suite must send zero real email` / `hits=[gate-e2e.step.env.RESEND_API_KEY]` |
| commits | `e9b3e62` (mutate) → `3650c1b` (revert) |

**No shipped product file was mutated to produce either red.** Both mutations were to files this phase
itself created or owns. A red produced by breaking the product would only show that a broken app fails
a test, which was never in doubt, and would teach nothing about whether the gate works.

**No real credential was used at any point.** The value was a dummy. The entire reason this assertion
exists is D-14's measurement: a real key in this environment produces **fourteen real outbound sends
per suite run**, because `src/lib/email.ts` binds its client at module load, so the key *is* the switch.

---

## TASK 3 — THE FLIP WAS **HELD**. `gate-e2e` IS **NOT** A REQUIRED CHECK.

The checkpoint presented the decision and the PM chose **option 2 + 2a + 2d**: hold the flip, resolve
the merge conflict, add the existence assertion.

**Who, when, and which run justified it — the record Task 3 asked for, inverted:** nobody flipped it,
nothing was changed in branch protection on 2026-09-04, and the watched reds (`33843226846`,
`33842567618`) that *would* have justified a flip are recorded above and are not being spent on one.
**Success criterion 4 of this phase is NOT met, and this summary does not claim it is.** A required
check that was never made required has no provenance to record, and writing one would be the exact
failure D-15 exists to prevent, one step further along.

### Prerequisite A — branch protection is unreachable

```
$ gh api repos/:owner/:repo/branches/main/protection --jq '.required_status_checks.contexts'
{"message":"Upgrade to GitHub Pro or make this repository public to enable this feature.",
 "status":"403"}

$ gh api repos/:owner/:repo/rulesets
{"message":"Upgrade to GitHub Pro or make this repository public to enable this feature.",
 "status":"403"}

$ gh api repos/:owner/:repo --jq '{private:.private, owner_plan:.owner.type}'
{"owner_plan":"User","private":true}
```

The repository is **private** and owned by a **Free personal account**. Branch protection and rulesets
are both gated behind Pro-or-public. There is no command that makes this work; it is a billing or a
visibility decision, and it is the PM's. **The plan's Task 3 `<verify>` step cannot run at all** — filed
in `.planning/WINDOWS.md` as an `unrun-verify`.

### Prerequisite C — there is still no green run

**Fourteen tests fail reproducibly** across ~10 spec files (the same failures in both real runs, so not
one-off infrastructure noise), plus two flaky. `gate-visual` also fails, on baselines last regenerated
**2026-08-30**, after which 238 commits of product work landed without CI running once.

The full list with verbatim messages is in `evidence/gate-e2e-wallclock.txt`. A sample, which are
substantive product claims rather than environment complaints:

> `court · 375x667: the moment is 0px tall in a 667px viewport.`
> `locator.click: Error: strict mode violation: locator('#search-category') resolved to 2 elements`
> `the notice is on screen but the grid under it has NOT caught up: the hours the booker just lost are still selectable.`

**None of these was introduced by this phase**, which changed one numeric key in a workflow and added
54 lines to a checker. They are pre-existing, and they are precisely what a gate nobody had ever run
was hiding. **A required check that is red on arrival is not a gate, it is a wall.** Fixing them is a
separate phase, not something to smuggle into this plan's tail.

### Prerequisite B — **RESOLVED**, and the checkpoint report that said otherwise is hereby corrected

At the moment the checkpoint was raised, the recorded blocker was that *a required check would deadlock
every PR because `pull_request` had never run in this repository*. **That claim no longer holds and is
withdrawn.**

`main`'s `87da176` carried a 303-line pre-Phase-12 snapshot of `.github/workflows/baselines.yml`; the
branches carry the 418-line version evolved by plans 12-14 and 12-15 (postgis service container,
migrate + `seed-baseline-fixtures` steps, a real `DATABASE_URL` replacing the unreachable
`127.0.0.1:59999` sentinel). Same workflow name, same job, same five steps — **a strict superset** — so
the add/add conflict was resolved to the branch side and nothing from `main` was lost.
`node scripts/verify-workflows.mjs` exits 0 on the resolved tree.

| merge commit | branch |
|---|---|
| `902aca5` | `dev` |
| `9619f0b` | `ci/gate-e2e-proof-19-08` (PR #1's head branch — the head was that branch, not `dev`) |

**Measured consequence:** PR #1 became `MERGEABLE`, and CI run **`33848817412`** began executing under
`event=pull_request` — **the first `pull_request` run in this repository's entire history**. All five
jobs (`gate-db`, `gate-db-free`, `gate-e2e`, `gate-price-parity`, `gate-visual`) were created on it.

⚠ **That run was IN FLIGHT AND UNFINISHED at the time of writing.** It was not polled and its
conclusion is not recorded here. What is established is that `pull_request` runs at all, which is what
blocker B denied.

### Open Question 5 — answered **YES**, and implemented (option `2d`)

**The question:** should `scripts/verify-workflows.mjs` gain a positive assertion that `gate-e2e`
exists? **The answer: yes.** Implemented in `d5a7425`.

**Why it mattered more than it looked.** Every existing `ci` invariant is *universally quantified* —
"every containerized job pins the image", "every `uses:` is first-party", "no job holds
`contents: write`". **A deleted job satisfies all of them vacuously.** Before this commit `gate-e2e`
could have been removed from `ci.yml` in one commit and the checker would have printed a clean green
over the four jobs that remained. This is the same vacuity the file's own header measures on
substrings — universal quantification over an empty set, one layer up.

Two additions, deliberately spelled differently because they catch different things:

1. **A HARD STOP on the job KEY `gate-e2e`**, mirroring the one `gate-visual` already has.
2. **One counted `check()` on the job's `name:`** — `gate-e2e (functional Playwright suite)`. GitHub
   matches a required status check **by display name, not by job key**, so a `name:` edit alone would
   detach a future required check from branch protection while leaving the job, and every invariant
   over it, perfectly intact. This is one step beyond the literal text of Open Question 5; it is
   recorded here as such, and its justification is that it is the exact edit Task 3's own flip would
   have been vulnerable to.

**WATCHED FAILING BEFORE BEING TRUSTED.** Both:

| mutation | result |
|---|---|
| rename the key, `gate-e2e:` → `gate-e2e-retired:` | **exit 1**, HARD STOP: `job "gate-e2e" not found in .github/workflows/ci.yml.` `Jobs present: [gate-db-free, gate-db, gate-price-parity, gate-visual, gate-e2e-retired]` |
| rename the display name, `(functional Playwright suite)` → `(e2e)` | **exit 1**, `1 of 41 invariant(s) FAILED` — `FAIL  "gate-e2e" declares the exact display name branch protection matches on` / `name="gate-e2e (e2e)"  expected="gate-e2e (functional Playwright suite)"` |

Both reverted **byte-identical** — `sha256sum` of `ci.yml` verified equal before and after each — and
`ci.yml` is unchanged by `d5a7425`.

**The invariant count was MEASURED, not predicted**, because the `ci` section's total is dynamic (the
addressing rule registers one check per job that sets `DATABASE_URL`):

| | before | after |
|---|---|---|
| total | 40 | **41** |
| baselines | 11 | 11 |
| **ci** | **22** | **23** |
| cross | 7 | 7 |

**Up by ONE, not two** — because a hard stop is deliberately *not* a counted invariant (the script says
so itself at `hardStop`: "a hard stop is NOT a failed check"). That asymmetry is documented at the site.

### Options NOT chosen, recorded as the outstanding prerequisites they are

- **`2b` — make the repo public, or buy GitHub Pro.** Not chosen. This is prerequisite A and there is
  no engineering path around it.
- **`2c` — fix the 14 e2e failures and regenerate the visual baselines.** Not chosen. This is
  prerequisite C. It is a **separate phase**, deliberately not smuggled into this plan's tail.

---

## NEW EVIDENCE ON AN OPEN QUESTION — recorded, deliberately NOT closed

A `vercel.json` is in the tree and a **live Vercel project (`pengr3s-projects/fit-out`) deploys this
repository**; its check appears on PR #1.

Plan 19-04 raised a local-vs-production scope question that the PM left explicitly **UNANSWERED**
(STATE.md blocker; `.planning/WINDOWS.md` ledger entry 5, whose wording is conditional: *"if a deployed
environment exists the scope must be re-derived there"*).

**This evidence satisfies that condition's antecedent and nothing more.** A deployed environment
**exists**. It does **not** establish that the deployment has its own database, and **nobody has
measured that**. No deployed environment was probed. Ledger entry 5 stays `open`; the evidence is filed
against it as a new entry so the next reader finds both together.

---

## Task Commits

1. **Task 1: one green run, and D-13's number** — `3051985` (chore: raise the cap once, on the measured
   expiry), `711f59c` (docs: record the wall-clock)
2. **Task 2: two watched reds** — `e9b3e62` → `3650c1b` (mail credential, mutate → revert),
   `0435488` → `acff477` (suite assertion, mutate → revert)
3. **Task 3: hold the flip; add the existence assertion** — `902aca5` (merge: resolve the
   `baselines.yml` add/add), `d5a7425` (feat: `gate-e2e` stops being deletable in silence)

`9619f0b` is the same merge resolution applied to `ci/gate-e2e-proof-19-08`, PR #1's head branch.

**Plan metadata:** see the `docs(19-08)` commit that carries this file.

## Files Created/Modified

- `.planning/phases/.../evidence/gate-e2e-wallclock.txt` — **created.** D-13's measurement, the 14
  failures with verbatim messages, the cap-raise arithmetic, and the reconciliation of Playwright's own
  totals.
- `.github/workflows/ci.yml` — **modified once**, `timeout-minutes: 45` → `90`, with the arithmetic at
  the site. Mutated and reverted byte-identical twice more.
- `scripts/verify-workflows.mjs` — **modified.** +54 lines: the `gate-e2e` hard stop and the display-name
  invariant.
- `.planning/WINDOWS.md` — four entries appended (8–11).
- `e2e/host-listing-grid.spec.ts` — mutated and reverted; unchanged at HEAD.

## Decisions Made

1. **Hold the flip.** Two prerequisites lack evidence and one of them cannot be produced with a
   command. Shipping a required check that has never been seen green is a wall, not a gate.
2. **Answer Open Question 5 yes**, and assert the display name as well as the key.
3. **Resolve the `baselines.yml` conflict to the branch side.** The branch version is a strict superset
   of `main`'s pre-Phase-12 snapshot; nothing was lost.
4. **Make no sharding decision.** The number now exists. The decision is still deferred.
5. **Leave the production-scope question open** despite having found evidence bearing on it.

## Deviations from Plan

**1. [Rule 2 — Missing critical] The display-name invariant, beyond Open Question 5's literal text**
- **Found during:** Task 3, implementing option `2d`.
- **Issue:** Open Question 5 asked only for an *existence* assertion. But a required status check is
  matched on `name:`, and asserting only the YAML key would leave the exact edit a future flip is most
  vulnerable to — a display-name change — completely uncaught, while every other invariant stayed green.
- **Fix:** One additional counted `check()` on `e2e.name`, with the reasoning at the site.
- **Verification:** Watched failing under a display-name-only mutation; exit 1, `1 of 41 FAILED`.
- **Committed in:** `d5a7425`.

**2. [Rule 3 — Blocking] The `main` ↔ `dev` `baselines.yml` add/add conflict**
- **Found during:** Task 3, before the checkpoint could be acted on.
- **Issue:** PR #1 was `CONFLICTING`, so no `pull_request` event had ever fired in this repository —
  which made "a required check would deadlock every PR" look like a structural blocker rather than a
  merge conflict.
- **Fix:** Resolved to the branch side after confirming it is a strict superset of `main`'s snapshot.
- **Verification:** `verify-workflows.mjs` exit 0 on the resolved tree; PR #1 became `MERGEABLE`; run
  `33848817412` fired under `event=pull_request`.
- **Committed in:** `902aca5` (dev), `9619f0b` (PR head branch).

**3. [Rule 1 — Bug, in the executor's own method] The first mutation silently did not apply**
- **Found during:** Task 3, watching the existence assertion fail.
- **Issue:** `ci.yml` has CRLF line terminators. A `perl -0pi -e 's/^  gate-e2e:$/.../m'` matched
  nothing, and the verifier printed a green **41** that would have read as "the assertion failed to
  fire" had `git status` not been checked.
- **Fix:** `\r?$` in the pattern; the mutation then applied and the stop fired.
- **Verification:** `git diff --stat` confirmed the mutation landed before the verifier was believed.
- **Note:** this is worth writing down. A mutation test that does not mutate reports the same green as
  a passing one, which is the identical failure mode `verify-workflows.mjs` exists to remove — one
  layer further out, in the hands of whoever is running the mutation.

---

**Total deviations:** 3 auto-fixed (1 missing-critical, 1 blocking, 1 method bug).
**Impact on plan:** No scope creep. Deviation 1 is one assertion inside the item the PM chose;
deviation 2 unblocked the checkpoint's own premise and corrected a claim in the checkpoint report;
deviation 3 is a note on method, not a code change.

## Issues Encountered

- **Prerequisite A is not an engineering problem.** No amount of work in this repository makes
  `branches/main/protection` return 200. It is a billing or visibility decision.
- **`gate-visual` is red on stale baselines** (last regenerated 2026-08-30, 238 commits ago).
  Regenerating them is `baselines.yml`'s `workflow_dispatch` job (D-27), not this plan's.
- **The `pull_request` run `33848817412` was unfinished** when this was written. Not polled by design.

## User Setup Required

None from this plan's code. **Two PM decisions are outstanding**, and neither is a setup step so much
as a fork:

1. Make the repository public, or move to GitHub Pro — otherwise `gate-e2e` can never be required.
2. Fund a phase to fix the 14 e2e failures and regenerate the visual baselines — otherwise a required
   `gate-e2e` blocks every pull request on arrival.

## Requirements

**CI-01 is marked complete, and this is what "complete" means here.** 19-08 is the last of the two
plans declaring it (`19-01` and `19-08`); `requirements.ready-ids` reports `1/1 requirement(s) ready to
mark complete`.

⚠ **CI-01's gate ships NON-REQUIRED.** Three of the four success criteria are met — the specs run on a
pull request, a failing spec turns the run red (watched, twice), and the wall-clock is measured against
a known denominator of 39. **The fourth is not:** `gate-e2e` is not a required check and does not block
anything. Prerequisites **A** (branch protection unreachable) and **C** (no green run) are outstanding
and are recorded in `.planning/WINDOWS.md` entries 8–10. **Do not read CI-01's closure as "the gate
blocks", because it does not.**

## Next Phase Readiness

**Ready:** D-13's number exists, so the sharding conversation can now be had on evidence. The gate runs
on `pull_request` and is protected against silent deletion. The two watched reds are on the record.

**Blockers, both for someone other than this plan:**
- The 14 e2e failures and the stale visual baselines — a phase of its own, and the thing standing
  between here and a required gate.
- The repository-visibility / GitHub-Pro decision.

**Still open, deliberately:** the production-scope question from 19-04. A deployed environment is now
known to exist; its database is not.

---
*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Completed: 2026-09-04*

## Self-Check: PASSED

All claimed artifacts exist on disk; all nine claimed commits resolve in this repository, plus
`9619f0b` on PR #1's head branch. `node scripts/verify-workflows.mjs` exits **0** at **41 invariants**
(`baselines=11, ci=23, cross=7`). `d5a7425` touches `scripts/verify-workflows.mjs` **only** — `ci.yml`
is unmodified by it, confirming both watched-red mutations were reverted byte-identical.
`ls e2e/*.spec.ts | wc -l` = **39**, matching the denominator D-13's number is recorded against.

**One claim in this summary is deliberately NOT self-checkable and is not asserted:** the conclusion of
`pull_request` run `33848817412`. It was in flight and was not polled.
