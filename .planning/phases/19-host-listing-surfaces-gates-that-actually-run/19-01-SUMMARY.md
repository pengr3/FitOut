---
phase: 19-host-listing-surfaces-gates-that-actually-run
plan: 01
subsystem: infra
tags: [github-actions, ci, playwright, workflow-invariants, postgis, supply-chain, fail-closed]

# Dependency graph
requires:
  - phase: 11-visual-regression-and-ci
    provides: "ci.yml's four-job D-24 taxonomy, the pinned mcr.microsoft.com/playwright:v1.60.0-noble container, and scripts/verify-workflows.mjs's parse-not-grep invariant checker"
  - phase: 12-visual-baselines-product-surfaces
    provides: "the `ci` section of verify-workflows.mjs (plan 12-15) that this plan extends"
  - phase: 17.1-paymongo-seam
    provides: "instrumentation.ts's dev-only network seam, and finding [17-D28]'s measurement of 14 real outbound mail sends per full e2e suite run"
provides:
  - "gate-e2e — a fifth CI job running the whole functional Playwright set (`--project=chromium`, 37 specs) on every push and pull request, in the pinned container, against a migrated + seeded ephemeral PostGIS 18 service"
  - "D-14's fail-closed mail-credential refusal in two independent places: a runtime `exit 1` step inside gate-e2e, and a parse-based invariant in verify-workflows.mjs that runs on gate-db-free"
  - "A CI job every later phase-19 guard can actually run in — plan 19-02's host-listing-grid.spec.ts and 19-06's host-route-reachability.spec.ts are collected by gate-e2e the moment they land, with no workflow edit"
affects: [19-02, 19-06, 19-08, ci, testing, security]

actuals:
  tokens: 3849
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A new CI capability arrives as a NEW job appended to ci.yml, never as a widening of an existing job's run command (D-12) — the diff that introduces it deletes zero lines"
    - "A forbidden token is spelled ONCE, in the checker, never in the workflow it guards — so `grep -c <token> .github/workflows/` stays a valid audit"
    - "A new guard is watched RED, by name, with the offending symbol printed, before it is trusted (Pattern 4)"

key-files:
  created: []
  modified:
    - .github/workflows/ci.yml
    - scripts/verify-workflows.mjs

key-decisions:
  - "gate-e2e ships as a fifth job rather than a widened gate-price-parity (D-12): job 3's identity in the D-24 taxonomy is that it runs ONE self-contained spec, and widening it would silently re-open the surface it was scoped to close. gate-price-parity's run command is byte-unchanged and the ci.yml diff has a deletion count of 0."
  - "timeout-minutes: 45 is documented as a wall-clock STOP, not an estimate — D-13's real number does not exist yet, and this job is what will measure it. The first green run's wall-clock replaces it."
  - "The job runs `npx playwright test --project=chromium` with no spec path, rather than `npm run test:e2e`, because that script also collects the `visual` project which gate-visual owns and whose committed baselines this job must never touch."
  - "D-14 is implemented in two places, not one. The runtime step catches a violation inside gate-e2e after npm ci; the parse invariant catches it on gate-db-free about a minute earlier and across ALL jobs, not just the one the step lives in."
  - "The runtime step's env key is MAIL_KEY_UNDER_TEST, deliberately NOT the mail provider's variable name, so the step and the new key-scanning invariant cannot fight each other. Both sites carry a comment saying so."
  - "The plan's predicted post-change count of `ci=21` was wrong and the measured value is `ci=22`. The ci section's invariant count is dynamic (the addressing rule registers one check per job that sets DATABASE_URL), so gate-e2e itself raised the pre-existing count from 20 to 21 before the new invariant made it 22. The plan's INTENT — every pre-existing invariant plus exactly one new one — holds and was verified."

patterns-established:
  - "Pattern: append-only CI growth. A new job is appended to ci.yml and `git diff HEAD --numstat` is asserted to report a deletion count of 0, which is the machine-checkable form of 'no existing gate was quietly re-scoped'."
  - "Pattern: the two-site fail-closed credential refusal. A runtime step inside the job that would be harmed, plus a parse invariant on the cheap always-runs job — with deliberately different env key spellings so the two halves cannot collide."

requirements-completed: [CI-01]

coverage:
  - id: D1
    description: "gate-e2e exists as a fifth job in ci.yml, pinned to the same Playwright image, addressing its postgres service by label with no ports mapping, holding exactly one environment input, and running the functional Playwright set by project name with no spec path"
    requirement: "CI-01"
    verification:
      - kind: other
        ref: "node scripts/verify-workflows.mjs (all three sections)"
        status: pass
      - kind: other
        ref: "node scripts/verify-workflows.mjs --section=ci — parsed values (ci) jobs line names gate-e2e; containerized line ends with gate-e2e; service images gains {job:gate-e2e,svc:postgres,image:postgis/postgis:18-3.6}"
        status: pass
      - kind: other
        ref: "sed -n '/^  gate-e2e:/,$p' .github/workflows/ci.yml — contains --project=chromium with no spec path, timeout-minutes: 45, and npm run db:seed after npm run db:migrate"
        status: pass
    human_judgment: false
  - id: D2
    description: "gate-price-parity was not widened or renamed — the D-12 mutation the invariant checker exists to catch did not occur"
    requirement: "CI-01"
    verification:
      - kind: other
        ref: "git diff HEAD~1 --numstat -- .github/workflows/ci.yml → added=169 deleted=0"
        status: pass
      - kind: other
        ref: "grep -c 'e2e/price-parity.spec.ts' .github/workflows/ci.yml → 2 (unchanged from HEAD)"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-14's parse-based mail-credential invariant refuses any ci.yml where a workflow, job or step env KEY begins with the mail-provider prefix, and it has been watched failing for the right reason with the offending key named"
    requirement: "CI-01"
    verification:
      - kind: other
        ref: "node scripts/verify-workflows.mjs --section=ci with a temporary RESEND_API_KEY in gate-e2e's job env → exit 1, FAIL line names the invariant and hits=[gate-e2e.env.RESEND_API_KEY]"
        status: pass
      - kind: other
        ref: "node scripts/verify-workflows.mjs --section=ci after revert → exit 0, All 22 invariants hold (ci=22)"
        status: pass
    human_judgment: false
  - id: D4
    description: "gate-e2e actually runs green on a real GitHub Actions runner, its first green run's wall-clock is recorded as D-13's number, and the runtime mail-refusal step is observed executing before anything boots"
    requirement: "CI-01"
    verification: []
    human_judgment: true
    rationale: "Nothing local can execute a GitHub Actions job. This is deliberately deferred by D-15's ordering: merge non-required, confirm a green run and record the wall-clock, watch a deliberate spec failure go red, and only then flip the required check. Plan 19-08 owns that sequence."

# Metrics
duration: 19 min
completed: 2026-09-04
status: complete
---

# Phase 19 Plan 01: gate-e2e — the CI job that runs the functional Playwright suite Summary

**A fifth CI job, `gate-e2e`, runs all 37 functional Playwright specs by project name against a migrated-and-seeded ephemeral PostGIS 18 service in the pinned `v1.60.0-noble` container — plus D-14's mail-credential refusal in two independent places, the parse-based half watched red before it was trusted.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-09-04T01:06:00Z
- **Completed:** 2026-09-04T01:25:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- **`gate-e2e` closes the remaining half of D-24 / CI-01.** Two of the four existing jobs already ran Playwright; the functional `e2e/*.spec.ts` set was what was left. It arrives as a fifth job copied from `gate-price-parity`'s skeleton, never as a widening of job 3 — the `ci.yml` diff has a **deletion count of 0** and `grep -c 'e2e/price-parity.spec.ts'` still returns its measured HEAD value of 2.
- **Every later phase-19 guard now has somewhere to run.** `19-02`'s `host-listing-grid.spec.ts` and `19-06`'s `host-route-reachability.spec.ts` will be collected by `--project=chromium` (`testMatch: "e2e/*.spec.ts"`) the moment they land, with no further workflow edit. This is why this plan leads the phase: shipping a guard before the gate would ship a guard nothing runs.
- **D-14's fail-closed mail refusal exists in two places, and the stronger one has been seen failing.** A runtime step inside `gate-e2e` exits 1 with an `::error::` line before anything boots; a parse invariant in `scripts/verify-workflows.mjs` — which runs on `gate-db-free`, the cheap job that always runs — rejects **any** job's, step's or the workflow's `env` KEY beginning with the mail-provider prefix, about a minute earlier and across all five jobs.
- **The two halves are deliberately spelled differently so they cannot collide.** The step's env key is `MAIL_KEY_UNDER_TEST` (value: the `${{ env.RESEND_API_KEY }}` context expression); the invariant scans KEYS, not values. Both sites carry a comment stating this and why.
- **The job's negative space is commented at each absence:** no `permissions:` block, no browser-provisioning step, no `ports:` mapping on the service, no `secrets.` reference, and no compile step of any kind — the last with both of its reasons (T-11-DBFREE at `verify-workflows.mjs:552-561`, and `next dev` being load-bearing for `instrumentation.ts`'s build-time-pruned network seam).

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): gate-e2e end-to-end — one new job, checkout to a real Playwright run** — `49529c0` (chore) — 169 insertions, 0 deletions in `.github/workflows/ci.yml`
2. **Task 2: the mail-credential invariant in the parser, watched red** — `e208dac` (test) — 49 insertions, 0 deletions in `scripts/verify-workflows.mjs`

**Plan metadata:** see the `docs(19-01)` commit that carries this file.

## Files Created/Modified

- `.github/workflows/ci.yml` — appended `gate-e2e` (job 5): pinned `mcr.microsoft.com/playwright:v1.60.0-noble` with `--ipc=host`, one `postgis/postgis:18-3.6` service reached by label with no `ports:`, `timeout-minutes: 45`, and the step sequence checkout → setup-node 24 → `npm ci` → mail refusal → `npm run db:migrate` → `npm run db:seed` → `npx playwright test --project=chromium`.
- `scripts/verify-workflows.mjs` — added module-scope `MAIL_KEY` / `MAIL_KEY_PREFIX` beside `SNAPSHOT_UPDATE_FLAG`, and one new `ci`-section invariant beside the existing `secrets.` scan.

## Verbatim evidence (required by the plan's `<output>`)

### 1. `parsed values (ci)` after the change

```
    jobs                ["gate-db-free","gate-db","gate-price-parity","gate-visual","gate-e2e"]
    containerized       ["gate-db-free","gate-price-parity","gate-visual","gate-e2e"]
```

Supporting lines from the same printout:

```
    service images      [{"job":"gate-db","svc":"postgres","image":"postgis/postgis:18-3.6"},{"job":"gate-price-parity","svc":"postgres","image":"postgis/postgis:18-3.6"},{"job":"gate-visual","svc":"postgres","image":"postgis/postgis:18-3.6"},{"job":"gate-e2e","svc":"postgres","image":"postgis/postgis:18-3.6"}]
    DATABASE_URL        {"gate-db-free":"postgres://unreachable:unreachable@127.0.0.1:59999/nope","gate-db":"postgres://fitout:fitout@localhost:5432/fitout","gate-price-parity":"postgres://fitout:fitout@postgres:5432/fitout","gate-visual":"postgres://fitout:fitout@postgres:5432/fitout","gate-e2e":"postgres://fitout:fitout@postgres:5432/fitout"}
    run commands        21 (0 with --update-snapshots)
```

Five jobs, four containerized (the previous three plus one), four service images — exactly as the plan's `<verification>` item 2 requires.

### 2. The watched-red failure line for the mail invariant, and the revert

With a **temporary** `RESEND_API_KEY: x` added to `gate-e2e`'s job-level `env` block, `node scripts/verify-workflows.mjs --section=ci` exited **1** and printed, verbatim:

```
  FAIL  no job, step or workflow env KEY declares RESEND_API_KEY — the e2e suite must send zero real email
          hits=[gate-e2e.env.RESEND_API_KEY]  scanned 5 job(s), their steps, and the workflow env  prefix=RESEND
```

and its summary line, verbatim:

```
1 of 22 invariant(s) FAILED:
  - [ci] no job, step or workflow env KEY declares RESEND_API_KEY — the e2e suite must send zero real email
```

It failed **by name**, and its detail **named the offending `gate-e2e.env.RESEND_API_KEY`** — the two things the acceptance criteria required of the red.

**The revert is confirmed.** The temporary edit was removed and `.github/workflows/ci.yml` restored to be byte-identical to its Task 1 commit (`git diff HEAD --stat -- .github/workflows/ci.yml` printed nothing; `git diff HEAD~1 --numstat` still reports `169  0`, a deletion count of **0**). The section returned green:

```
All 22 invariants hold across 1 section(s) (ci=22).
```

and across all three sections:

```
All 40 invariants hold across 3 section(s) (baselines=11, ci=22, cross=7).
```

The `ok` form of the new invariant, for the record:

```
  ok    no job, step or workflow env KEY declares RESEND_API_KEY — the e2e suite must send zero real email
          hits=[(none)]  scanned 5 job(s), their steps, and the workflow env  prefix=RESEND
```

### 3. Spec count at this wave

```
$ ls e2e/*.spec.ts | wc -l
37
```

**37**, exactly the number the plan predicted for wave 1. `gate-e2e` runs all of them. Phase 19 ends at **39** (`19-02` adds `host-listing-grid.spec.ts`, `19-06` adds `host-route-reachability.spec.ts`); record the number in every later summary that touches it rather than letting it drift.

### 4. Merge status and the required-check flip

**`gate-e2e` is merged NON-REQUIRED.** Branch protection was not touched by this plan and cannot be — it is a repository setting, not a file, so it cannot be committed.

**The required-check flip is plan 19-08's, per D-15**, and its ordering is a prerequisite rather than a preference:

1. Merge non-required, confirm a green run, and **record the wall-clock** — that number is D-13's, and it replaces `timeout-minutes: 45`, which is currently a stop rather than an estimate.
2. Make **one spec** fail on a PR and watch the run go red. The cheapest honest mutation is a one-character change to an assertion in `19-02`'s new `host-listing-grid.spec.ts`. Do **not** mutate a shipped product file to prove the gate.
3. Only then flip `gate-e2e` to a required check in branch protection, and **record who did it and when** — otherwise the success criterion has no evidence.

## Decisions Made

See `key-decisions` in the frontmatter. The load-bearing three:

1. **A fifth job, not a wider job 3** (D-12), asserted by a deletion count of 0 rather than by intent.
2. **`timeout-minutes: 45` is a stop, not an estimate** (D-13), and the comment at the site says so — including that an expiry, once the check is required, is a RED whose correct response is D-13's sharding decision and never a silently raised cap.
3. **D-14 lands in two places with two different spellings.** The runtime step reads the provider key through a context expression in its VALUE under the key `MAIL_KEY_UNDER_TEST`; the parse invariant scans KEYS. That asymmetry is the whole reason the two can coexist.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's predicted invariant count (`ci=21`) was arithmetically wrong; the correct measured value is `ci=22`**

- **Found during:** Task 2 (the mail-credential invariant)
- **Issue:** Task 2's acceptance criteria state that `node scripts/verify-workflows.mjs --section=ci` must report `ci=21`, reasoning "20 existing plus the new one". That treats the `ci` section's invariant count as static. It is not: the **addressing rule** (`verify-workflows.mjs:490-544`) registers **one `check(...)` per job that sets `DATABASE_URL`**, so adding `gate-e2e` — which sets one — raised the pre-existing count from 20 to **21 on its own, in Task 1, before Task 2 wrote a line**. The measured baseline at HEAD was `ci=20` (captured before any edit); after Task 1 alone it was `ci=21`; after Task 2's new invariant it is `ci=22`.
- **Fix:** No code change. The plan's *intent* — every pre-existing invariant, plus exactly one new one, all green — was verified directly instead: the baseline was measured at `ci=20`, Task 1's addition accounted for exactly +1 (its own addressing-rule check, which is visible in the printout as `addressing rule — "gate-e2e" runs IN a container…`), and Task 2's new check accounted for exactly +1 more. The literal number in the acceptance criterion is corrected here rather than being made true by suppressing a check.
- **Files modified:** none (documentation-only correction)
- **Verification:** `node scripts/verify-workflows.mjs --section=ci` → `All 22 invariants hold across 1 section(s) (ci=22).`, exit 0. All three sections → `All 40 invariants hold across 3 section(s) (baselines=11, ci=22, cross=7).`, exit 0.
- **Committed in:** `e208dac` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — an incorrect predicted constant in an acceptance criterion).
**Impact on plan:** None on the shipped artifacts. Both files are exactly what the plan specified; only a predicted number in the plan text was wrong, and the property it was standing in for was verified another way. No scope creep, no check weakened, no invariant skipped.

## Issues Encountered

- **A backup path written by Node's `fs` did not resolve where the shell expected it during the watch-it-red revert.** `/tmp/ci.yml.bak` written from Node on this Windows box landed at `C:/tmp/ci.yml.bak`, so the `cp`-based restore failed. Resolved by restoring the single file from its own commit (`git checkout -- .github/workflows/ci.yml`) and then asserting byte-identity with `git diff HEAD --stat`, which is the stronger check anyway. The stray backup was removed. No blanket working-tree reset was used at any point.

## Threat Flags

None. `gate-e2e` introduces no security-relevant surface outside the plan's `<threat_model>`: it holds exactly one environment input (`DATABASE_URL`, pointing at an ephemeral service container), declares zero `secrets.` references, adds no network endpoint, no auth path and no schema change. T-19-01 through T-19-05 and T-19-SC are all `mitigate` and all mitigated as written — including T-19-SC, which is not engaged: `package.json`, `package-lock.json` and `drizzle/` were verified untouched by this plan (`git diff --name-only 49529c0~1..HEAD -- package.json package-lock.json drizzle/` → 0 files).

## Known Stubs

None. Both files are complete as specified; there is no placeholder value, no hardcoded empty data source and no TODO/FIXME introduced. `timeout-minutes: 45` is deliberately a documented stop awaiting D-13's measurement, not a stub — the comment at the site states that explicitly and names what replaces it.

## User Setup Required

None from this plan's code. **One repository-setting action is owed later, and it is not this plan's:** flipping `gate-e2e` to a required check in branch protection, after D-15's two prerequisites are satisfied. Plan 19-08 owns it.

## Next Phase Readiness

**Ready for 19-02.** The gate exists, so the guards `19-02` and `19-06` write will actually run.

Carry-forward for whoever picks this up:

- **`gate-e2e` has never executed on a real runner.** Every assertion in this summary is over the parsed workflow tree, not over a completed Actions run. The first green run is what produces D-13's wall-clock number, and until it exists `timeout-minutes: 45` is a guess-free stop rather than a calibrated bound.
- **Do not add a compile step to `gate-e2e`.** It would redden T-11-DBFREE (correctly) *and* silently re-open both network seams, because `instrumentation.ts`'s MockAgent is pruned by a production build.
- **Do not rename the step's `MAIL_KEY_UNDER_TEST` env key** to the mail provider's name. The new parse invariant would go red against a correct file.
- **Do not spell the snapshot-update flag anywhere in `ci.yml`**, comments included. `grep -c` for it over `ci.yml` still returns 0 and that is the cheapest audit of the rule.
- **Spec count is 37 now, 39 at phase end.** Record it in every summary that touches it.

## Self-Check: PASSED

Files claimed, verified present on disk:

- `FOUND: .github/workflows/ci.yml`
- `FOUND: scripts/verify-workflows.mjs`
- `FOUND: .planning/phases/19-host-listing-surfaces-gates-that-actually-run/19-01-SUMMARY.md`

Commits claimed, verified present in `git log --oneline --all`:

- `FOUND: 49529c0` (Task 1)
- `FOUND: e208dac` (Task 2)
- `FOUND: 1839a2f` (this summary)

Plan-level `<verification>` re-run at close-out:

1. `node scripts/verify-workflows.mjs` → exit 0, `All 40 invariants hold across 3 section(s) (baselines=11, ci=22, cross=7).` — PASS
2. `parsed values (ci)` names five jobs, four containerized, four service images — PASS
3. `git diff HEAD~2 --numstat -- .github/workflows/ci.yml` → `169  0` (additions only) — PASS
4. The watched-red failure line is recorded verbatim above, with its revert confirmed — PASS

Plan `<success_criteria>`:

- `gate-e2e` exists as a fifth job and runs `npx playwright test --project=chromium` — PASS
- `gate-price-parity` byte-unchanged (`grep -c 'e2e/price-parity.spec.ts'` → 2; 0 deletions) — PASS
- The mail refusal exists in both the job and the parser, and the parser half was watched red — PASS
- Zero `package.json` changes and zero `drizzle/` changes (`git diff --name-only 49529c0~1..HEAD -- package.json package-lock.json drizzle/` → 0 files) — PASS

---
*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Completed: 2026-09-04*
