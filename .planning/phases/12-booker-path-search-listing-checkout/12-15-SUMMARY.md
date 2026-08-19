---
phase: 12-booker-path-search-listing-checkout
plan: 15
subsystem: infra
tags: [github-actions, ci, playwright, visual-regression, postgis, yaml-parsing, workflow-invariants]

# Dependency graph
requires:
  - phase: 12-booker-path-search-listing-checkout (plan 12-14)
    provides: "`scripts/seed-baseline-fixtures.ts` (the committed fixture), the postgis service inside `baselines.yml`, the 53-row baseline inventory, and `scripts/verify-baselines-workflow.mjs` — the guard this plan renames and widens"
  - phase: 11-quality-gates-pattern-layer-app-shell (plan 11-22)
    provides: "`ci.yml`, `baselines.yml`, D-27's image identity, D-28's unconditional `updateSnapshots: \"none\"`, and the three OBSERVED RED records"
provides:
  - "`ci.yml` job 4, `gate-visual`: the visual project run in the pinned Playwright image against a seeded ephemeral postgis service addressed by LABEL, from the SAME migrations and the SAME committed fixture as `baselines.yml`"
  - "A `gate-db-free` that still earns its name: no `services:`, the unreachable sentinel URL, its container, and its key — now with T-11-DBFREE asserted structurally rather than stated in a comment"
  - "`scripts/verify-workflows.mjs`: one parse-based guard over BOTH workflow files plus the invariants that exist only between them — 38 assertions in three `--section`-filterable groups"
  - "The guard is now EXECUTED: `gate-db-free` runs it on every push and pull request, so an added `push:` trigger on `baselines.yml` fails `ci`"
affects: [12-14 Task 3, GATE-VRT, phase-13, phase-14, any future workflow edit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Section-filterable structural guard: `--section=NAME` over a parsed tree, printing the value read for every assertion, with hard stops (not failed checks) for an absent subject, an unknown section, and a section that registers zero invariants"
    - "Interlocking task verification: Task 1's automated check requires the ci section to be RED (`! node …`), Task 2's requires it GREEN. Neither task can be skipped without a failure"
    - "Load-failure legibility: a transitive parser dependency loaded via `await import` inside try/catch, exiting 3 with a distinct diagnostic, so 'the parser could not load' can never be read as 'an invariant broke' and the CI step deleted in response"

key-files:
  created: []
  modified:
    - .github/workflows/ci.yml
    - .github/workflows/baselines.yml
    - scripts/verify-workflows.mjs
    - .planning/STATE.md

key-decisions:
  - "Option A over B and C: a fourth `gate-visual` job rather than a database inside `gate-db-free`, because D-24's job split is BY DATABASE NEED and job 1's live proof that `npm run build` needs none is the cheapest standing check against stale availability shipping"
  - "The guard was RENAMED (`git mv`) rather than cloned — a checker named for one file that asserts the invariants of two is the defect class this repository keeps recording, and the cross-file invariants belong to neither file alone"
  - "The rename was committed ALONE, before the extension, so git records an exact 100% rename and `git log --follow` traverses it. The extension roughly triples the file and would otherwise fall below git's 50% inexact-rename threshold"
  - "`yaml` stays UNDECLARED. Promoting it is a dependency decision and therefore a checkpoint, not a side effect. The distinct exit-3 load diagnostic is what keeps that decision legible instead of urgent"
  - "Requirements BFLOW-01/02/03/06, RESP-02, STATE-03, STATE-07 are deliberately NOT marked complete: they belong to 12-14, whose Task 3 has not run. This plan inherits the IDs from 12-14's claim, not from its own delivery"
  - "`gate-db-free`'s display-name parenthetical tracks its step list (`+ visual` -> `+ workflow parse`); the job KEY does not move. A description that outlives what it describes is the defect this plan exists to correct"

patterns-established:
  - "Total-function assertions: the service-addressing rule is asserted over EVERY job that sets `DATABASE_URL`, in three exhaustive branches, plus a non-vacuity check that the loop covered at least one job"
  - "Invariants spelled by BEHAVIOUR not by name: T-11-DBFREE is 'the job that runs `npm run build` declares no `services:`', so it survives a future rename of `gate-db-free`"
  - "Falsified comments are RECORDED as falsified, quoted with their replacement, rather than quietly deleted"

requirements-completed: []

# Metrics
duration: 35min
completed: 2026-08-19
---

# Phase 12 Plan 15: The CI Comparison Job's Missing Database Summary

**`ci.yml` gained a fourth job, `gate-visual`, that runs the visual project in the pinned Playwright image against a seeded ephemeral postgis service — from the same migrations and the same committed fixture as the job that WRITES baselines — while `gate-db-free` keeps its name, its absent `services:` block and its unreachable URL, and both workflow files became guarded by one 38-assertion parse-based checker that now runs on every push.**

## Performance

- **Duration:** ~35 min (14:50 → 15:25 +0800)
- **Started:** 2026-08-19T06:50:00Z
- **Completed:** 2026-08-19T07:25:00Z
- **Tasks:** 2 of 2 (both `type="auto"`)
- **Files modified:** 4 (one of them a `git mv`); 0 created; 0 product files — this plan is entirely CI structure

## Accomplishments

- **The gap is closed structurally.** Run **32216145319**'s 36 failures were `connect ECONNREFUSED 127.0.0.1:59999` — job 1's deliberately unreachable `DATABASE_URL` — because plan 12-14 gave a database to the job that WRITES baselines and not to the job that COMPARES them. `gate-visual` now runs `checkout → git control → npm ci → migrate → seed → playwright --project=visual` against `postgres://fitout:fitout@postgres:5432/fitout`, byte-identical to `baselines.yml`'s, addressed by the service LABEL because the job runs IN a container.
- **`npm run build` is still proven to need no database, and the proof is now parsed rather than commented.** `gate-db-free` keeps its key, its missing `services:` block, its `127.0.0.1:59999` sentinel and its container. T-11-DBFREE is asserted as *"the job that runs `npm run build` declares no `services:`"* — spelled by what the job does, so it survives a rename.
- **The most dangerous file in the repository is guarded by something that executes.** Until this plan, `baselines.yml` — the only holder of `contents: write` and the only carrier of the snapshot-update flag — was checked by a script that ran when somebody remembered to type it. `gate-db-free` now runs `node scripts/verify-workflows.mjs` after `npm ci` and before the build. An added `push:` trigger on `baselines.yml` fails `ci`.
- **Six real mutations, watched, with the substring control beside each.** Parser RED 6/6; substring control GREEN 6/6 on the token each mutation targets. The third independent reproduction of this repository's vacuity law, measured on the job this plan adds.

## Task Commits

1. **Task 1 (structural prerequisite): rename the guard** — `f009864` (chore) — pure `git mv`, byte-identical content
2. **Task 1: one parser, two files, and the invariants between them** — `7f63e34` (feat)
3. **Task 2: `gate-visual`, and a `gate-db-free` that still earns its name** — `ceb54d7` (feat)

**Plan metadata:** see the `docs(12-15)` commit carrying this SUMMARY, `STATE.md` and `ROADMAP.md`.

### Why Task 1 is two commits, stated rather than absorbed

The task's acceptance criterion requires `git log --follow` to show the rename preserved history. Git detects renames by content similarity at read time, with a 50% default threshold — and the extension takes the file from 223 to ~600 lines, so a combined commit would have scored roughly 33% and `--follow` would have reported add-plus-delete. Committing the `git mv` alone produces `rename scripts/{verify-baselines-workflow.mjs => verify-workflows.mjs} (100%)`, an exact rename that `--follow` traverses unconditionally:

```
$ git log --follow --oneline -- scripts/verify-workflows.mjs
7f63e34 feat(12-15): one parser, two workflow files, and the invariants between them
f009864 chore(12-15): rename the workflow guard to the two files it is about to cover
18e13f7 feat(12-14): a committed fixture, a database for the one write job, and a parser instead of a grep
```

## Files Created/Modified

- `.github/workflows/ci.yml` — **+393 / −60.** Job 4 `gate-visual` added; the visual step removed from `gate-db-free`; the workflow-parse step added to `gate-db-free`; four falsified comment passages rewritten; three new invariants added to the header's list.
- `scripts/verify-workflows.mjs` — renamed from `scripts/verify-baselines-workflow.mjs` and widened from 11 assertions over one file to 38 across three sections.
- `.github/workflows/baselines.yml` — **comment-only**, proven two ways (below).
- `.planning/STATE.md` — the one LIVE tracking document naming the old script path; updated to name both the old and the new name so a reader holding the old one finds the file. The four historical records (`12-14-PLAN.md`, `12-14-SUMMARY.md`, `.continue-here.md`, `12-REVIEW.md`, `12-VALIDATION.md`) were deliberately NOT rewritten — they record what was true when they were written.

## Verification

### The interlocking pair, both run

| Task | Command | Result |
|------|---------|--------|
| 1 | `node scripts/verify-workflows.mjs --section=baselines && ! node scripts/verify-workflows.mjs --section=ci` | **exit 0** — baselines green, ci RED, exactly as required |
| 2 | `node scripts/verify-workflows.mjs` | **exit 0** — `All 38 invariants hold across 3 section(s) (baselines=11, ci=20, cross=7)` |

The `!` in Task 1's command is load-bearing and was honoured: at the end of Task 1 the `ci` section MUST be red, because `gate-visual` did not exist yet. A green there would have meant the section checks nothing.

### Task 1's watched red, verbatim

```
── ci — .github/workflows/ci.yml (3 job(s)) ────────────────────────────────────────────────────
  ok    workflow-level permissions.contents is 'read'
  … 13 further assertions, all ok …
  ok    the job that runs `npm run build` exists and declares NO services: (T-11-DBFREE)
          jobs running `npm run build`=[gate-db-free]  of which declare services=[(none)]

════════════════════════════════════════════════════════════════════════════════
HARD STOP — not a failed check. The subject of the assertions below is ABSENT,
so every one of them would be vacuous. A vacuous green is the failure mode this
whole script exists to remove.
════════════════════════════════════════════════════════════════════════════════
  job "gate-visual" not found in .github/workflows/ci.yml.
  Jobs present: [gate-db-free, gate-db, gate-price-parity]

  THIS IS THE GAP PLAN 12-15 CLOSES. The job that COMPARES visual baselines needs the same
  seeded database the job that WRITES them already has. Without it, run 32216145319's shape
  repeats: 36 tests fail with `connect ECONNREFUSED 127.0.0.1:59999` because the DB-backed
  surfaces render an error boundary and their reachability hooks find no subject.
  …
EXIT=1
```

### The `baselines` section's ten (eleven) values — unchanged from 12-14's record

```
  triggers            ["workflow_dispatch"]
  workflow perms      {"contents":"read"}
  job perms           {"contents":"write"}
  concurrency.group   ${{ github.workflow }}-${{ github.ref }}-${{ github.event_name }}
  container.image     mcr.microsoft.com/playwright:v1.60.0-noble
  container.options   --ipc=host
  run commands        8 (1 with --update-snapshots)
  services            ["postgres"]
  job env keys        ["DATABASE_URL"]
  uses                ["actions/checkout@v4","actions/setup-node@v4"]
```

Every value 12-14's SUMMARY recorded, identical: triggers `[workflow_dispatch]`, workflow `contents=read`, job `contents=write`, `github.event_name` present, tag equal to the installed `@playwright/test` (1.60.0), 8 run commands with exactly 1 carrying the flag, `services=["postgres"]`, zero `secrets.` hits. **This section widened the file; it did not rewrite these.**

### The `ci` section's 20 parsed values

```
  jobs                ["gate-db-free","gate-db","gate-price-parity","gate-visual"]
  triggers            ["push","pull_request"]
  workflow perms      {"contents":"read"}
  concurrency.group   ${{ github.workflow }}-${{ github.ref }}-${{ github.event_name }}
  containerized       ["gate-db-free","gate-price-parity","gate-visual"]
  service images      gate-db.postgres / gate-price-parity.postgres / gate-visual.postgres
                        = postgis/postgis:18-3.6  (all three)
  DATABASE_URL        gate-db-free       postgres://unreachable:unreachable@127.0.0.1:59999/nope
                      gate-db            postgres://fitout:fitout@localhost:5432/fitout
                      gate-price-parity  postgres://fitout:fitout@postgres:5432/fitout
                      gate-visual        postgres://fitout:fitout@postgres:5432/fitout
  run commands        16 (0 with the snapshot-update flag)
  gate-visual runs    [git control …, "npm ci", "npm run db:migrate",
                       "npx tsx scripts/seed-baseline-fixtures.ts",
                       "npx playwright test --project=visual"]
```

The addressing rule resolved all four jobs, one per branch of its three-case total function:

| Job | `container:` | `services:` | host | verdict |
|-----|--------------|-------------|------|---------|
| `gate-db-free` | yes | **none** | `127.0.0.1:59999` | the unreachable sentinel — ok |
| `gate-db` | no | `postgres` with `ports:["5432:5432"]` | `localhost` | on the runner, published — ok |
| `gate-price-parity` | yes | `postgres`, no `ports:` | `postgres` | in a container, by LABEL — ok |
| `gate-visual` | yes | `postgres`, no `ports:` | `postgres` | in a container, by LABEL — ok |

### The `cross` section's 7 values

```
  container images    ["mcr.microsoft.com/playwright:v1.60.0-noble"]   (4 containers, distinct=1)
  service images      ["postgis/postgis:18-3.6"]                       (4 services,   distinct=1)
  DATABASE_URL        postgres://fitout:fitout@postgres:5432/fitout    (both visual jobs, identical)
  migrate             "npm run db:migrate"                             (both, byte-identical)
  seed                "npx tsx scripts/seed-baseline-fixtures.ts"      (both, byte-identical)
  neither builds before its playwright step                            ok
  workflow files      ["baselines.yml","ci.yml"]
  write-path carriers ["baselines.yml:generate-baselines"]              exactly ONE, in the right file
```

### The mirror, as evidence rather than a claim

Parsed run-command sequences, side by side:

```
  #  baselines.yml generate-baselines                        | ci.yml gate-visual
  0  npm ci                                                  | git config … safe.directory …(multiline)
  1  git config … safe.directory + committer identity         | npm ci
  2  npm run db:migrate                                      | npm run db:migrate
  3  npx tsx scripts/seed-baseline-fixtures.ts               | npx tsx scripts/seed-baseline-fixtures.ts
  4  npx playwright test --project=visual <update flag>       | npx playwright test --project=visual
  5  git add -- "*-visual-linux.png" …                        | —
  6  if git diff --cached --quiet; then … (commit + push)     | —
  7  echo "::warning::These baselines have NOT been verified" | —
```

Indices **2, 3 and 4** are the mirror and they are byte-identical apart from the flag that only the write path may carry. Two differences are deliberate and stated rather than hidden: the git step's POSITION differs (job 4 runs it before `npm ci`, so a wrong checkout fails in seconds rather than after a minute of installing) and its PURPOSE differs (the capture job configures a committer identity; the compare job asserts the tracked-baseline count is non-zero). Steps 5–7 are the write path and have no analog in a job that compares.

### Job 1 after the edit, asserted by parse

```json
{
  "name": "gate-db-free (lint + design + build + workflow parse)",
  "runs-on": "ubuntu-latest",
  "container": { "image": "mcr.microsoft.com/playwright:v1.60.0-noble", "options": "--ipc=host" },
  "services": null,
  "env": { "DATABASE_URL": "postgres://unreachable:unreachable@127.0.0.1:59999/nope" },
  "permissions": null,
  "steps": [
    { "uses": "actions/checkout@v4" },
    { "name": "Let git operate on the checkout (container uid mismatch)", "run": "git config --global --add safe.directory …" },
    { "uses": "actions/setup-node@v4" },
    { "run": "npm ci" },
    { "name": "Verify the workflow invariants (parse, not grep)", "run": "node scripts/verify-workflows.mjs" },
    { "name": "Build (lint + design gate + next build)", "run": "npm run build",
      "env": ["BETTER_AUTH_SECRET","PAYMONGO_SECRET_KEY","PAYMONGO_WEBHOOK_SECRET"] }
  ]
}
```

No `services:`. The sentinel URL intact. The key `gate-db-free` unchanged. Still in the container. Still carrying the git step.

### `gate-visual` after the edit, asserted by parse

```json
{
  "name": "gate-visual (GATE-01 visual regression)",
  "runs-on": "ubuntu-latest",
  "container": { "image": "mcr.microsoft.com/playwright:v1.60.0-noble", "options": "--ipc=host" },
  "services": { "postgres": { "image": "postgis/postgis:18-3.6",
                              "env": { "POSTGRES_USER": "fitout", "POSTGRES_PASSWORD": "fitout", "POSTGRES_DB": "fitout" },
                              "options": "--health-cmd \"pg_isready -U fitout -d fitout\" --health-interval 10s --health-timeout 5s --health-retries 10" } },
  "env": { "DATABASE_URL": "postgres://fitout:fitout@postgres:5432/fitout" },
  "permissions": null
}
```

No `ports:` on the service. No `permissions:` block — it inherits `contents: read` and cannot write to the repository, which is the entire difference between a job that compares and a job that writes. No build step, no build placeholders, no `db:test:setup`, zero `secrets.` in any `env`/`run`/`with` value — all asserted structurally, none read by eye.

### `baselines.yml` is provably comment-only

Two independent proofs, both recorded:

```
parsed trees deep-equal: true
HEAD tree bytes: 3500   worktree tree bytes: 3500
```

and the textual diff filtered to non-comment lines returns nothing (`git diff --stat`: 9 insertions, 3 deletions, all `#` lines).

## The Six-Mutation Matrix — Watched, With the Substring Control Beside Each Result

Applied to `ci.yml` at `ceb54d7`, reverted with `git checkout -- .github/workflows/ci.yml` after each. Control tokens are the direct analog of 11-06's five job-3 tokens: the `DATABASE_URL` spelling, `postgis/postgis:18-3.6`, `gate-visual`, `--project=visual`, `scripts/seed-baseline-fixtures.ts`, `--ipc=host`.

| # | mutation | parser | invariant(s) the parser NAMED | substring control | reverted |
|---|----------|--------|-------------------------------|-------------------|----------|
| 1 | `gate-visual`'s `DATABASE_URL` host `postgres` → `localhost` | **RED** (1) | `[ci] addressing rule — "gate-visual" runs IN a container …` **and** `[cross] the two visual jobs' DATABASE_URL values are byte-identical` | **GREEN** — all 6 tokens present | clean |
| 2 | `ports: ["5432:5432"]` ADDED to `gate-visual`'s service | **RED** (1) | `[ci] addressing rule — "gate-visual" runs IN a container, so … that service must declare NO ports:` | **GREEN** — all 6 present (adding a line removes no token) | clean |
| 3 | `gate-visual`'s service image → plain `postgres:18` | **RED** (1) | `[ci] every service image is postgis/postgis: with a tag qualified beyond the bare major` **and** `[cross] every postgres service image in BOTH files is the same string` | **GREEN** — all 6 present | clean |
| 4 | the whole `gate-visual` job deleted, comment block included | **RED** (1) | **HARD STOP** — `job "gate-visual" not found in .github/workflows/ci.yml` | **GREEN on the predicted token** — `gate-visual` still PRESENT; `--project=visual` and the seed path went ABSENT | clean |
| 5 | a `services:` block ADDED to `gate-db-free` | **RED** (1) | `[ci] the job that runs \`npm run build\` exists and declares NO services: (T-11-DBFREE)` **and** `[ci] addressing rule — "gate-db-free" runs IN a container …` | **GREEN** — all 6 present | clean |
| 6 | `gate-visual`'s seed step → `scripts/seed.ts` | **RED** (1) | `[cross] the two visual jobs' seed run commands are byte-identical and both name scripts/seed-baseline-fixtures.ts` **and** `[ci] "gate-visual" runs migrate, then seed, then playwright — IN THAT ORDER` | **GREEN** — all 6 present | clean |

Unmutated control after the sweep: parser **exit 0**, 38 invariants.

### Mutation 4's prediction, made before it was run, and what actually happened

**Predicted:** once the header documents `gate-visual` by name, a substring check for that name goes vacuous — the same law the file already records twice.

**Measured:** the prediction held for the token it was about. With the entire job AND its comment block deleted, `gate-visual` is still PRESENT in `ci.yml` — it survives in the D-24 job-split list, in the "WHAT IS DELIBERATELY ABSENT" bullet, in job 1's falsified-passage note, in job 1's git-step comment and in job 1's closing note. A prescribed substring check over the job name is therefore GREEN against a file with no such job.

**And the part the prediction did not cover, recorded because it is the more interesting half:** two of the six tokens went ABSENT — `--project=visual` and `scripts/seed-baseline-fixtures.ts`. Both were named ONLY inside the deleted job's own comments. So this mutation is the one row of the matrix where a substring check over the full token set would have gone RED, and it is red for an accidental reason: those two tokens happened not to be discussed anywhere else in the file. The vacuity is not uniform — it tracks how well each individual token is documented, which is exactly the mechanism the file's header describes and exactly why "count the STRUCTURE, not the text" is the rule rather than "pick better tokens".

### Two honest notes on the matrix mechanics

- **Mutation 5 named TWO invariants, and the plan predicted one.** Adding a `services:` block to `gate-db-free` trips T-11-DBFREE *and* the addressing rule (the job flips from the no-services branch to the container-plus-services branch, where `127.0.0.1` is not a service label). Both firing is correct and better than one; recorded because the plan's matrix listed only T-11-DBFREE.
- **`git diff --exit-code` was clean after every revert; the working-tree BYTES were not identical, and the reason is benign.** `git checkout --` restores through git's CRLF filter, so the file came back with 1061 CRLF line endings where the editor had written LF. Tracked content verified identical (`content identical modulo line endings: true`, and `git diff --exit-code` exit 0 on a file git considers unchanged). Nothing about the parsed tree changed — the parser reports 38/38 on the restored file.

## The Four Falsified `ci.yml` Comment Passages — Quoted, With Their Replacements

Each was recorded as falsified rather than quietly deleted. A file that misstates its own structure is the defect class this repository keeps recording.

### 1. The header's D-24 job-split list

**Was:** `THE JOB SPLIT (D-24 + D-35). THREE jobs, and the split is by DATABASE NEED, not by speed:` followed by three entries.

**Now:** `FOUR jobs`, with `gate-visual` described in the same taxonomy and the one-line reason it is not job 1's problem:

> `gate-visual       GATE-01's comparison — a database AND a browser, which is EXACTLY job 3's place in this taxonomy, and that is the whole reason it is a fourth job rather than a step on job 1 (plan 12-15). Phase 12 baselined PRODUCT surfaces … so the comparison needs a seeded database, and a split by database need therefore puts it HERE and not in the job whose entire identity in this taxonomy is needing none.`

### 2. The header's "WHAT IS DELIBERATELY ABSENT" bullet

**Was:** `The Playwright `visual` project step on job 1 LANDED on 2026-08-17 (plan 11-22) — this bullet used to promise it. Job 1 now runs inside the same pinned Playwright image job 3 uses, because comparing screenshots needs a browser.`

**Now:** the step is recorded as having landed on job 1 *and left it*, with run 32216145319's cost stated verbatim, and with the note that the hooks failing is the part that worked as designed. The paragraph forbidding the snapshot-update flag in this file survives intact, including its rule that the flag is named by ROLE and never by spelling — and now records that the prohibition is machine-checked over four jobs.

### 3. Job 1's "the two halves stay in ONE job deliberately"

**Was:** `SINCE 2026-08-17 IT IS ALSO THE VISUAL-REGRESSION GATE (GATE-01, plan 11-22), which is why this job moved into a container. The two halves stay in ONE job deliberately: they share the same DB-free assertion, and splitting them would mean a second `npm ci` and a second copy of the unreachable-database argument to keep in sync.`

**Now:** the sentence is quoted in place under a `⚠ A PASSAGE HERE WAS FALSIFIED` heading, and the falsification stated in one sentence:

> `THE PREMISE IS NOW FALSE. Phase 12 baselined product surfaces, so the comparison needs a seeded database — the two halves stopped sharing that assertion, and the only stated reason for keeping them together expired with it.`

The second `npm ci` is acknowledged as the price and repaid (the ~30-minute visual step no longer serialises behind the build). The second prediction the old comment made — a duplicated unreachable-database argument — is recorded as *not* what happened: `gate-visual` makes the opposite argument, and both are parsed now rather than remembered.

### 4a. Job 1's `DATABASE_URL` comment

**Was:** `IT IS AT JOB LEVEL RATHER THAN ON THE BUILD STEP SINCE 2026-08-17, because the visual step needs it too …`

**Now:** the variable STAYS at job level — moving it back would be a gratuitous mutation — with the old reason quoted and marked expired, and a new one that does not depend on which steps exist:

> `at job level, ANY step added to this job inherits the assertion. On the build step, the next step somebody adds here inherits nothing, and the job goes back to being DB-free only where it was remembered to be.`

Where 11-UI-SPEC § GATE-01's scoping rule went is also recorded: retired in its Phase-11 form, restated by 12-14 as *"a baselined surface may read a SEEDED EPHEMERAL database and must need NOTHING ELSE"*, and enforced now in `gate-visual` and `baselines.yml`.

### 4b. Job 1's git-step positive control

**Was:** `A count of zero here means the checkout is not what this job thinks it is, and the visual step below would then compare against baselines that are not there.`

**Now:** the second clause is quoted and marked false — there is no visual step below any more — and the control is kept for the reason that was always primary: the design gate in this job's `npm run build` is the only runtime git shell-out in the repository, and only a query with a known non-empty result distinguishes "git works here" from "git answered confidently about somewhere else". A note records that `gate-visual` carries its own copy, because that is where the comparison happens now.

### Also added to the header's invariants list

Three items, per the plan: the addressing rule is now machine-checked per job; T-11-DBFREE is spelled as *"the job that runs `npm run build` declares no `services:`"*; and `gate-db-free` keeps its container deliberately, because removing it would be a second unrelated structural change whose failure mode is a **silent green** (git unavailable → D-29's rule enforced by nothing).

## Post-Task Gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | **exit 0** |
| `npx vitest run` | **exit 0** — 141 files passed / 1 skipped (142); 1307 tests passed / 4 skipped (1311) |
| `npm run build` | **exit 0** (lint + the whole design suite + `next build`) |
| `npm run lint` | **exit 0** — 0 errors, 12 pre-existing warnings, none in the touched files |
| `node scripts/verify-workflows.mjs` | **exit 0** — 38 invariants, three sections |
| `node scripts/verify-workflows.mjs --section=nonexistent` | **exit 1** — hard stop, rather than silently passing zero checks |
| `node scripts/verify-workflows.mjs --bogus` | **exit 1** — unrecognised argument |
| parser with `yaml` unresolvable | **exit 3** — `FATAL: THE PARSER COULD NOT LOAD. THIS IS *NOT* AN INVARIANT FAILURE.` |

**Known-benign, present and not chased:** the `[test-db] LEAKED WRITES` banner naming 2 `public.audit` rows (`guest-email` ×1, `notify` ×1) — documented, contained, exit 0. The 12 pre-existing lint warnings.

**One flake worth recording because it is not on the known-benign list.** The FIRST `npm run build` exited 1 — but not on a test failure: `38 passed (38) / 706 passed | 3 skipped` with three `Unhandled Error: [vitest-pool]: Failed to start forks worker … Timeout waiting for worker to respond` (import time 113 s against a normal ~18 s). A vitest fork-worker startup timeout under resource contention, immediately after a `tsc` run on the same machine. The retry exited 0 with no change to the tree. Recorded as an environment flake, not chased, and not fixed — but named here so the next executor recognises the shape instead of hunting a regression.

### The parser's load-failure diagnostic, probed rather than assumed

`node_modules/yaml` was moved aside and the parser re-run:

```
════════════════════════════════════════════════════════════════════════════════
FATAL: THE PARSER COULD NOT LOAD. THIS IS *NOT* AN INVARIANT FAILURE.
════════════════════════════════════════════════════════════════════════════════
  missing module   yaml
  resolver said    Cannot find package 'yaml' imported from …\scripts\verify-workflows.mjs

  `yaml` is relied upon TRANSITIVELY and is not a declared devDependency.
  Nothing about the workflows has been checked, in either direction.

  THE FIX IS A DEPENDENCY DECISION TO RAISE (add `yaml` to devDependencies),
  NEVER the deletion of the CI step that runs this script.
EXIT=3
```

Restored; parser back to exit 0. The distinct exit code and the distinct first line are what stop a hoisting change from turning a security gate into noise that somebody deletes. `package.json` is unchanged — `yaml` (2.9.0) and `tsx` (4.22.4) remain transitive, exactly as the plan requires.

## Deviations from Plan

### Auto-fixed / judgement calls

**1. [Rule 3 — Blocking] Task 1 committed as two commits so `git log --follow` survives the rename**

- **Found during:** Task 1, before writing any code
- **Issue:** the acceptance criterion requires `git log --follow` to show the rename preserved history, but the extension triples the file's size, which puts inexact-rename similarity around 33% — below git's 50% default. A single combined commit would have recorded add-plus-delete.
- **Fix:** `git mv` committed alone (`f009864`, byte-identical content, `rename … (100%)`), then the extension (`7f63e34`).
- **Commits:** `f009864`, `7f63e34`

**2. [Rule 2 — Correctness] `gate-db-free`'s display-name parenthetical updated**

- **Found during:** Task 2's comment surgery
- **Issue:** the plan says *do not rename `gate-db-free`*, and it is not renamed — the job KEY is untouched. But its `name:` read `gate-db-free (lint + design + build + visual)`, and after this edit the job runs no visual test. Leaving it would make the file misstate its own structure, which is precisely the defect the plan's comment-surgery section exists to prevent. Plan 11-22 had already appended `+ visual` to this same parenthetical when the step arrived, so the parenthetical is established as tracking the step list.
- **Fix:** `gate-db-free (lint + design + build + workflow parse)`. The job key `gate-db-free` is unchanged and every reference to it in both files' headers and the 11-22 OBSERVED RED records stays true.
- **⚠ CONSEQUENCE, RAISED NOT BURIED:** a job's `name:` IS its GitHub check name. If branch protection on this repository requires named checks, this display name changed and `gate-visual` is a new one. The failure direction is the safe one — a required check that disappears blocks merges loudly — but it needs an operator decision either way, because `gate-visual` also needs requiring or it is a gate nobody enforces. Recorded in `STATE.md` § Operator Next Steps. This is T-12-15-RENAME, which the plan accepted by design for the job key; the display name is the narrower case the threat register did not enumerate.
- **Commit:** `ceb54d7`

**3. [Recorded, not fixed] The old script name survives once, in the renamed file's own header**

- **Found during:** Task 1's rename sweep
- **Issue:** the acceptance criterion's sweep is `grep -rn "verify-baselines-workflow" --include=…` returning no hit. It returns exactly ONE: `scripts/verify-workflows.mjs:35: // Until 12-15 this script was \`verify-baselines-workflow.mjs\` and had two holes:`.
- **Decision:** kept. It is not a live reference — nothing shells out to it, no workflow or `package.json` script names it. It is the discoverability path for a reader arriving from `12-14-SUMMARY.md` with the old name in hand, and deleting it would lose the record of the rename that the plan values. **And it is itself a clean instance of the law this whole plan is about:** the criterion is a PROHIBITION expressed as a substring check, and the file's own header records that substring checks are *"falsely red for prohibitions"* on a documented file. The stricter sweep that excludes the file's own header is empty:
  ```
  $ grep -rn "verify-baselines-workflow" --include="*.yml" --include="*.json" \
      --include="*.mjs" --include="*.ts" . | grep -v "^./scripts/verify-workflows.mjs:"
  (no output)
  ```
- **Not a commit** — a documented decision.

**4. [Recorded] `roadmap.update-plan-progress 12` and `state.advance-plan` were NOT used**

- **Reason:** `STATE.md` carries an explicit standing instruction — *"Do not re-run that verb on phase 12 until the operator has reported the comparison run id"* — because it reported `status: "Complete", complete: true` on the strength of a fourteenth SUMMARY existing while 12-14's blocking human checkpoint had not run. The recurring over-reach on the last plan of a phase is also documented in this project's memory. `STATE.md` and `ROADMAP.md` were hand-edited instead, and **12-14's row still reads "Checkpoint pending (12-14 Task 3)"** with its checkbox `[ ]`.

**5. [Deliberate] `requirements.mark-complete` was NOT run**

- **Reason:** this plan's frontmatter inherits `[BFLOW-01, BFLOW-02, BFLOW-03, BFLOW-06, RESP-02, STATE-03, STATE-07]` from 12-14's claim. Those requirements are satisfied by 12-14's baselines and the seven manual walks, neither of which this plan delivers. `STATE.md` states they are deliberately left unmarked until Task 3 runs; marking them here would be exactly the anti-pattern the phase has already corrected once. `requirements-completed: []` in this SUMMARY's frontmatter is therefore deliberate and not an omission.

**Zero Rule 4 escalations.** The design decision (Option A) was already argued in the plan and was implemented rather than re-litigated.

## Threat Model — Dispositions Discharged

| Threat ID | How it was discharged |
|-----------|----------------------|
| T-12-15-DBREACH | `gate-visual`'s postgis service has NO `ports:` mapping (asserted), fixed runner-local credentials, destroyed with the job; zero `secrets.` in any `env`/`run`/`with` value (asserted over every job); no `permissions:` block, so it inherits `contents: read` and cannot write to the repository (asserted) |
| T-12-15-DBFREE | `gate-db-free` keeps no `services:` and the `127.0.0.1:59999` sentinel; both halves asserted, and T-11-DBFREE spelled by what the job DOES. Watched failing as mutation 5 |
| T-12-15-SEEDDRIFT | Byte-identical migrate, seed and `DATABASE_URL` across the two visual jobs; neither builds before playwright. Watched failing as mutations 1 and 6 |
| T-12-15-BASEMINT | ZERO run commands in `ci.yml` carry the flag, counted over the parsed tree across all FOUR jobs; exactly ONE across the whole workflows tree, in `baselines.yml`. The flag is not spelled anywhere in `ci.yml`, comments included |
| T-12-15-VERDRIFT | Four container tags across both files, all equal to each other and to the installed `@playwright/test` 1.60.0 (asserted in both the `ci` and `cross` sections) |
| T-12-15-ADDR | The addressing rule asserted as a total function over all four jobs that set `DATABASE_URL`, including `ports:` presence per branch. Watched failing as mutations 1 and 2 |
| T-12-15-GREPGREEN | Six real mutations applied, watched failing by invariant name, recorded with the substring control beside each: parser RED 6/6, control GREEN 6/6 on the targeted token |
| T-12-15-UNGUARDED | `gate-db-free` runs the parser on every push and pull request; an added `push:` trigger on `baselines.yml` now fails `ci` |
| T-12-15-CIWRITE | Workflow-level `contents: read`; NO job in `ci.yml` holds write (asserted); the new job adds no `permissions:` block (asserted) |
| T-12-15-SC | No third-party action added — `actions/checkout@v4` and `actions/setup-node@v4` only, asserted across every job. `package.json` unchanged; `yaml` and `tsx` remain transitive |
| T-12-15-RENAME | Accepted by design for the job KEY, which did not move. The display-name change is recorded as deviation 2 with an operator action, because it is the narrower case the register did not enumerate |
| T-12-15-CANCEL | `github.event_name` asserted present in `ci.yml`'s concurrency group as well as `baselines.yml`'s |

## Threat Flags

None. No network endpoint, auth path, file-access pattern or schema change at a trust boundary was introduced. The one new trust boundary — `gate-visual` ↔ an ephemeral database — is in the plan's register as T-12-15-DBREACH and is discharged above.

## Known Stubs

None. No hardcoded empty value, placeholder string or unwired data source was introduced; this plan touches CI structure and one node script only.

## ⚠ THE PREDICTION — NOT A RESULT

**This plan cannot prove a green comparison run, and does not claim one.** Baselines do not exist yet; the only thing that can mint them is 12-14 Task 3's human dispatch. What is delivered is that `ci.yml` **structurally CAN** reach a seeded database and render the 27 DB-backed surfaces, from the same migrations and the same committed fixture as the job that captures them.

**The observable belongs to the NEXT push, and it is a prediction:** the 27 DB-backed rows change failure shape from

```
Error: connect ECONNREFUSED 127.0.0.1:59999      <- the surface never rendered
```

to

```
Error: A snapshot doesn't exist at …             <- it rendered, and has no reference yet
```

The first says the gate cannot see what it is comparing. The second says it can, and is waiting for a reference. Only the second is the correct pre-dispatch state. **Let the run settle it.** 12-14 Task 3's dispatch is now capable of producing a green comparison run — which remains 12-14 Task 3's deliverable, not this plan's.

## Self-Check: PASSED

Files claimed, verified present:

```
FOUND: .github/workflows/ci.yml
FOUND: .github/workflows/baselines.yml
FOUND: scripts/verify-workflows.mjs
ABSENT (correctly, renamed away): scripts/verify-baselines-workflow.mjs
```

Commits claimed, verified in `git log`:

```
FOUND: f009864  chore(12-15): rename the workflow guard …
FOUND: 7f63e34  feat(12-15): one parser, two workflow files …
FOUND: ceb54d7  feat(12-15): gate-visual — a comparison job that can reach a seeded database
```

No file deletions in any of the three commits (`git diff --diff-filter=D HEAD~1 HEAD` empty at each). No untracked files left behind. `.planning/config.json`'s pre-existing modification was never staged.
