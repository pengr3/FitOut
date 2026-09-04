---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 04
subsystem: ci
tags: [ci, github-actions, quality-gates, boot-guards, security]
requires: [11-01, 11-03]
provides:
  - "GitHub Actions in this repository for the first time — something now sets CI=true (D-23)"
  - "gate-db-free: lint + design gate + next build, DB-free BY ASSERTION (T-11-DBFREE)"
  - "gate-db: full vitest against postgis/postgis:18-3.6, off the author's laptop (D-24)"
  - "The D-25 push cadence is physically possible for every later plan"
  - "Confirmed: repository workflow permission is WRITE — 11-22 needs no settings change"
affects: [11-06, 11-21, 11-22]
tech-stack:
  added: []
  patterns:
    - "Build-only placeholder env vars as literals, never GitHub secrets, for prod boot guards"
    - "Verify workflow YAML by PARSING it, never by whole-file substring match"
key-files:
  created:
    - .github/workflows/ci.yml
  modified: []
decisions:
  - "Job 1's DB-free property is asserted every run via an unreachable DATABASE_URL, not measured once"
  - "The three fail-closed boot guards were NOT softened; CI supplies obviously-fake placeholders instead"
  - "The NEXT_PHASE guard-exemption fix is RAISED as an open decision, not taken (security control)"
metrics:
  duration: "~3.5h wall (two blocking human checkpoints, one CI round-trip)"
  completed: 2026-08-13
  tasks: 3
  commits: 2
  files_created: 1
  files_modified: 0
---

# Phase 11 Plan 04: CI From Nothing Summary

**GitHub Actions now exists in this repository, both jobs are green on `origin/dev`, and the first
red run found a real defect that had been latent for 167 commits and that no local run could ever
have surfaced.**

## What Shipped

`.github/workflows/ci.yml` — 273 lines, one file, zero source files modified.

| Job | What it runs | Why it is shaped that way |
|---|---|---|
| `gate-db-free` | `npm run build` (= `lint && test:design && next build`) with **no `services:` block** | One step is three gates: ESLint, the design gate, and GATE-05's `server-only` boundary. `DATABASE_URL` points at `127.0.0.1:59999` so "job 1 is DB-free" is a **standing per-run assertion**, not a one-time measurement. |
| `gate-db` | `db:migrate` → `db:test:setup` → `npm test` against `postgis/postgis:18-3.6` | Runs the exclusion-constraint and money specs somewhere other than the author's laptop. On the runner (not in a container), so the host is `localhost` with `5432:5432` mapped. |

The 12 shipped e2e specs are **deliberately absent** (D-24), recorded as a comment in the file so a
reader finds the reason rather than the gap. Job 3 is `11-06`'s; the visual step and the dispatch job
are `11-22`'s; both named in the file header with plan numbers.

## Verification — Both Runs

**OBSERVED RED — run [31702742456's predecessor](https://github.com/pengr3/FitOut/actions/runs/31697376606)**, commit `7130d1a`:

| Job | Conclusion |
|---|---|
| `gate-db-free (lint + design + build)` | **failure** |
| `gate-db (vitest against PostGIS 18)` | **success** |

**OBSERVED GREEN — run [31702742456](https://github.com/pengr3/FitOut/actions/runs/31702742456)**, commit `bde4d23`:

| Job | Conclusion |
|---|---|
| `gate-db-free (lint + design + build)` | **success** |
| `gate-db (vitest against PostGIS 18)` | **success** |

That pair is the falsification evidence for the whole plan: the gate went red on a real defect and
green only after it was fixed. A CI file that had only ever been green would not have earned this.

The first push was **167 commits** ahead of `origin/dev`, not the 145 RESEARCH and the plan were
written against. `origin/main` was still at `1626466 Initial commit`.

## THE HEADLINE FINDING: THE SINGLE CI ERROR WAS A LOWER BOUND, NOT A LIST

The red run named exactly one variable:

```
Error: BETTER_AUTH_SECRET is not set. Refusing to boot in production with a weak/default auth secret.
    at Object.<anonymous> (.next/server/app/api/cloudinary/sign/route.js:15:3)
> Build error occurred
Error: Failed to collect page data for /api/cloudinary/sign
```

Reproducing the runner condition locally named a **different** variable:

| Source | First guard hit |
|---|---|
| CI run 31697376606 | `BETTER_AUTH_SECRET` at `/api/cloudinary/sign` |
| Local probe A | `PAYMONGO_SECRET_KEY` at `/api/paymongo/webhook` |
| **Neither** | `PAYMONGO_WEBHOOK_SECRET` |

Page-data collection aborts at the **first** guard it reaches across 7 parallel workers, and the
order differs per machine. A fix derived from reading the CI log would have burned **two more CI
round-trips**. This is 11-01's Turbopack finding recurring in a new subsystem: *the build reports a
first failure, not a failure set.*

What made it a one-round-trip fix was enumerating the class up front with an AST scan of all 230
files in `src/` — module-scope statements only, since a throw inside a function body is not a boot
guard:

| Guard | Var | Fires during `next build`? |
|---|---|---|
| `src/app/api/inngest/route.ts:30` | `INNGEST_SIGNING_KEY` | **No** — has `NEXT_PHASE` exemption |
| `src/lib/paymongo.ts:39` | `PLATFORM_WALLET_*` | **No** — has `NEXT_PHASE` exemption |
| `src/lib/auth.ts:43` | `BETTER_AUTH_SECRET` | **Yes** |
| `src/lib/paymongo.ts:27` | `PAYMONGO_SECRET_KEY` | **Yes** |
| `src/app/api/paymongo/webhook/route.ts:36` | `PAYMONGO_WEBHOOK_SECRET` | **Yes** |

The scan's var column is itself a lower bound — `auth.ts:43` shows blank because it reads through a
const on line 42 rather than inlining `process.env.X`. The **guard** was still detected; only the
name needed a human read. An extraction heuristic that had been trusted as a list would have missed
the very variable CI named.

**The root cause is not "a missing secret".** `next build` sets `NODE_ENV=production`, which arms
every fail-closed production boot guard in the tree. `npm run build` was therefore **never**
environment-independent — it passes on a developer laptop only because dotenv injects 16 keys from
`.env.local`. A runner has none. Neither does a fresh clone.

## The Fix, and What Was Deliberately Not Done

Three obviously-fake, self-describing literals on job 1's build step:

```
BETTER_AUTH_SECRET: ci-build-only-placeholder-not-a-real-secret
PAYMONGO_SECRET_KEY: ci-build-only-placeholder-not-a-real-key
PAYMONGO_WEBHOOK_SECRET: ci-build-only-placeholder-not-a-real-webhook-secret
```

**No guard was touched.** Each is a fail-closed security control (WR-03), and making a red check
green by softening a security control is the worst trade available. None of the values uses a real
credential prefix — deliberately **not** PayMongo's `sk_test_`/`sk_live_` shape — so none can be
mistaken for or function as a credential. None is a GitHub secret: a secret here would imply a real
credential is needed to *build*, which is the exact property this job exists to disprove.

**Proven, not predicted.** The runner condition was reproduced locally by moving `.env.local` aside
(restored byte-identical, 16 keys, verified twice):

| Probe | Condition | Result |
|---|---|---|
| A | runner condition, **no** placeholders | **exit 1** — guard fires (watched red) |
| B | runner condition + three placeholders | **exit 0** |
| Final | same, at the then-current HEAD | **exit 0** · lint 0 errors / 9 warnings · design gate green · 21 static pages |

The unreachable `DATABASE_URL` is byte-identical across the fix and never entered the failure. **Job
1's DB-free property held throughout — this was not the A5 risk.**

## SECOND FINDING: THE PLAN'S OWN `<verify>` WAS VACUOUS FOR 2 OF ITS 5 TOKENS

The plan prescribed a whole-file substring match. Measured against five mutations of the real file:

| Mutation | Plan's substring check | Parsed-YAML check |
|---|---|---|
| bare major-only PostGIS tag (the 404) | RED | RED |
| job 1's unreachable `DATABASE_URL` deleted | RED | RED |
| `permissions` widened to `contents: write` | RED | RED |
| **`github.event_name` dropped from the concurrency group** | **GREEN** | RED |
| **the `npm run db:test:setup` STEP deleted** | **GREEN** | RED |

Both survive because the token still appears in the file's own **prose** and in a step `name:`. **A
file that documents its own invariants cannot be checked by grepping for them** — 11-03's `hasRule`
finding and 11-01's "every `server-only` grep hit was a comment", arriving a third time.

The two mutations the check cannot see are precisely the two that break the mitigations for
**T-11-CANCEL** and the `_test` provisioning path. All acceptance criteria were therefore re-verified
structurally against the parsed AST (28 assertions), and the parse-based command plus this table are
written into the workflow header for `11-06` and `11-22`, who edit the file next.

**The same collision fired in the opposite direction.** The security assertions (`no secrets.*`, `no
credential prefix`) initially went **red on my own explanatory comments** — the file says "do NOT
promote them to `secrets.*`" and "NOT PayMongo's `sk_test_` shape". A raw-text scan cannot tell a
prohibition from a violation. Both now run over the **parsed** tree, where comments do not exist,
with positive controls first (11-02's lesson: an absence assertion over a tree it never opened is
green forever).

## Deviations from Plan

**1. [Rule 2 — missing critical verification] The plan's `<verify>` one-liner was insufficient to prove its own acceptance criteria.**
- **Found during:** Task 2
- **Issue:** 2 of 5 tokens vacuous (table above)
- **Fix:** Added a 28-assertion structural verification over parsed YAML; recorded the measurement and the command in the workflow header. Deliberately **not** promoted to a standing `tests/design/` gate — that needs `yaml` as a declared devDependency, and a package install is a checkpoint decision, not a side effect. `git diff --stat package.json` stays empty, consistent with 11-01/11-02/11-03.
- **Commit:** `d17e89f`

**2. [Rule 1 — bug] `npm run build` was not environment-independent (found BY CI, which is the point).**
- **Found during:** Task 3
- **Fix:** three build-only placeholders on job 1; guards untouched
- **Commit:** `3f41286`

**3. [Rule 4 — raised, not taken] The `NEXT_PHASE` guard exemption.** See Open Decisions below.

## Open Decisions Handed Forward

**OPEN — the three non-exempt boot guards should adopt the two exempt ones' `NEXT_PHASE` clause.**
This is **not closed by this plan** and is deliberately not actioned here.

The evidence that it is an *implementation gap* rather than a design choice is strong:

- Two guards in the same repo already implement the contract correctly
  (`inngest/route.ts:30`, `paymongo.ts:39`) via `NEXT_PHASE !== "phase-production-build"`.
- **Two of the three non-exempt guards already CLAIM that contract in prose while their code
  enforces the opposite.** `src/app/api/paymongo/webhook/route.ts:34-35` reads *"dev/test/build
  tolerate its absence … `next build` must not require prod secrets"*. `src/lib/paymongo.ts:10-12`
  reads *"In dev/test/build the placeholder in .env is tolerated so local setup, the fully-mocked
  test suite, and `next build` all pass"*. Neither is true today.
- **A fresh clone still cannot run `npm run build`.** CI is patched; humans are not. The defect is
  contained, not fixed.

Why it was not taken: it edits a fail-closed security control's production branch, which is a Rule 4
architectural/security decision, and the executing plan's declared surface was
`.github/workflows/ci.yml` alone. Owner: `11-22` or a later phase, deliberately. Logged to
`deferred-items.md`.

## Task 1 — Repository Setting, Recorded Verbatim

**Reported value: `write`.** "Read and write permissions" is selected at
`https://github.com/pengr3/FitOut/settings/actions`, and Actions are enabled for the repository.

Consequence: **`11-22`'s baseline-dispatch push needs no further settings change.** It must still
grant `contents: write` **per-job**, because the top-level `permissions: contents: read` in this file
is the T-11-CIWRITE mitigation and must not be widened.

## Threat Model Disposition

| Threat ID | Disposition | How it is met |
|---|---|---|
| T-11-CISECRET | mitigated | Zero `secrets.*` in any evaluated value; no PayMongo/Resend/Cloudinary/Better-Auth/Google credential. Verified over the **parsed** tree, not raw text. |
| T-11-CIWRITE | mitigated | Top-level `permissions: contents: read`, exactly one key |
| T-11-CANCEL | mitigated | `github.event_name` in the concurrency group — and the check for it is now a parse, because the substring check was vacuous |
| T-11-DBFREE | mitigated | Unreachable `DATABASE_URL` + no `services:` block on job 1; **green on the runner with both in place** |
| T-11-WRONGDB | mitigated | `db:test:setup` provisions `fitout_test`; `test-db-url.ts` throws on any name not ending in `_test` |
| T-11-SC | mitigated | Only `actions/checkout@v4` and `actions/setup-node@v4` |

## Notes for Later Plans

- **`11-06`, `11-22`:** verify your edit by parsing this file. The command is in its header. Do not
  grep it.
- **`11-22`:** grant `contents: write` per-job; the top-level read-only permission is a mitigation.
  The repository setting is already `write`, so no settings change is needed.
- **A concurrent-agent observation, recorded because the trap is live:** plans 11-07/11-08/11-09
  landed on this working tree while this plan executed. `2abb5d7` correctly co-committed
  `patterns/result-card.tsx` **with** its `elevation-z.test.ts` count bump (12→13, overlay 5→6).
  Had the test been staged alone — which the house rule of staging files individually makes easy —
  CI would have gone red at `1 failed / 495 passed`, `expected 12 to be 13`. Measured, not
  hypothesised. **Any plan that bumps an inventory count must stage the source file that supplies
  the new entry in the same commit.**
- **A verification-method correction on myself:** my first design-gate probe measured a *hybrid*
  working-tree state that could never exist on CI, and I only caught it by checking
  `git show HEAD:<path>` instead of the working tree. **CI sees commits, not your working tree
  (D-25).** Verify against `HEAD`, not against what is on disk.

## Self-Check: PASSED

- `.github/workflows/ci.yml` — FOUND (tracked, committed)
- `d17e89f` — FOUND (`ci(11-04)`, 1 file, +222, zero deletions)
- `3f41286` — FOUND (`fix(11-04)`, 1 file, +51, zero deletions)
- Both commits touch exactly one file; no source file was modified by this plan
- `drizzle/*.sql | tail -1` = `0025_audit_resolved_by.sql` — GATE-06 intact
- Both CI jobs green on `origin/dev` at `bde4d23`
