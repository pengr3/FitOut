---
finding: ci-comparison-job-cannot-reach-a-database
phase: 12-booker-path-search-listing-checkout
origin_plan: 12-14
origin_task: 3 (Part A — dispatch, verify, and walk the path)
severity: blocking
blocks: [12-14 Task 3 A4, GATE-VRT exit criterion]
discovered: 2026-08-19
evidence_run: 32216145319
status: open
---

# The job that COMPARES baselines cannot reach a database

## What happened

The push of `46eadb6` to `dev` triggered `ci` run **32216145319**. Job 1,
`gate-db-free (lint + design + build + visual)`, failed:

```
36 failed
 1 skipped
 1 did not run
30 passed (29.6m)
Error: Process completed with exit code 1
```

The root cause is **not** the expected missing-baseline red. It is:

```
Error: Failed query: select "listing"."id", ... from "listing" ...
  [cause]: Error: connect ECONNREFUSED 127.0.0.1:59999
```

`127.0.0.1:59999` is `ci.yml:374`'s deliberately unreachable `DATABASE_URL`
(`postgres://unreachable:unreachable@127.0.0.1:59999/nope`), whose absence of a `services:` block
is described at `ci.yml:348` as "the point of this job" (T-11-DBFREE).

## Why it happened

Plan 12-14 Task 1 gave a database to the workflow that **WRITES** baselines
(`.github/workflows/baselines.yml` — postgis service, `DATABASE_URL: postgres://fitout:fitout@postgres:5432/fitout`,
migrate + seed steps). It did not give one to the workflow that **COMPARES** them.

This was foreseen and then not acted on. Task 1's own `<read_first>` says:

> `.github/workflows/ci.yml` — the job that COMPARES baselines, and how it obtains a database.
> **The seed path must produce the same fixture in both jobs, or the comparison measures a
> different tree than the one that was captured.**

but Task 1's `<action>` scopes the edit to `baselines.yml` alone. The executor followed the action
literally. **This is a planning defect, not an execution defect** — the plan under-scoped its own
action relative to its own warning.

## What the failure proves is WORKING

The 36 failures are `expect(locator).toHaveCount(expected) failed` — the per-row **reachability
hooks**. The 13 new DB-backed surfaces rendered an error boundary, their hooks did not find their
subject, and the run died loudly.

This is the exact failure mode `src/lib/design/visual-baselines.ts` exists to prevent. Without the
hooks these surfaces would have captured error boundaries and blank pages, and a later dispatch
would have minted them as the reference — permanently green while covering the wrong thing. The
30 that passed are Phase 11's DB-free surfaces, unaffected.

D-27's image identity is also intact: `ci.yml:344` and `baselines.yml` both pin
`mcr.microsoft.com/playwright:v1.60.0-noble`, and both jobs run IN that container — so the
addressing case for both is the service LABEL (`postgres:5432`), not `localhost`.

## Why this blocks Task 3

Dispatching `baselines` right now WOULD succeed — that workflow has its database — and would
commit 52 valid PNGs. But **A4's comparison run could never go green**, because `gate-db-free`
structurally cannot render the surfaces it would be comparing.

That is precisely the state Task 3 exists to prevent, stated in the plan's own invariant: a
baseline set nobody has watched pass is worse than no baseline set, because the gate then only
looks armed.

**Ordering requirement:** fix `ci.yml` BEFORE minting. Fixing afterwards risks the two jobs seeding
different fixtures, which would invalidate the mint and force a re-dispatch.

## Design options considered

**A. Split out a new `gate-visual` job** *(recommended at time of writing)* — move the visual step
into its own job with a postgis service + migrate + seed mirroring `baselines.yml`. Job 1 keeps
lint + design + build and stays genuinely DB-free, preserving its separately-proven property that
`npm run build` needs no database (measured at HEAD 2026-08-13, `ci.yml:352-354`). Larger
structural edit; retires no existing invariant.

**B. Add a database to job 1 directly** — give `gate-db-free` the service and seed steps, rename
it, and rewrite its T-11-DBFREE header argument the way Task 1 rewrote `baselines.yml`'s. Smaller
diff, and makes the two jobs structurally symmetric. Costs the proven "the build needs no
database" property as collateral, since job 1 also runs `npm run build`.

## Constraints any fix must honour

- `ci.yml` and `baselines.yml` must pin the SAME Playwright image tag, and it must equal the
  installed `@playwright/test` (1.60.0). Three things move together or none of them do.
- Both jobs must run the SAME seed path (`scripts/seed-baseline-fixtures.ts`) so the compared tree
  is the captured tree.
- The postgis image is required, not plain postgres — `drizzle/0005_booking_exclusion.sql` needs
  `btree_gist`.
- A job running IN a container addresses the service by LABEL (`postgres:5432`), not `localhost`.
- `--update-snapshots` must remain confined to `baselines.yml`, in exactly one run command.
- No `secrets.*` in any `env`/`run`/`with` value. Verify any workflow edit by PARSING the yaml —
  `scripts/verify-baselines-workflow.mjs` exists because a substring check over these files was
  measured falsely green for six of six real mutations, including an added `push:` trigger.
