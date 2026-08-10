# Deferred items — discovered during quick task 260810-j3z, deliberately NOT fixed here

## D1 — The notify / guest-email failure tests write real `needs_attention` rows into the DEV database

**Discovered:** while smoke-testing the new digest against the live dev DB. The unresolved count moved
**21 → 25** across two full-suite runs, and the new rows are:

```
 guest-email | system | 2026-08-10 06:30:04+00
 notify      | system | 2026-08-10 06:29:41+00
 guest-email | system | 2026-08-10 06:21:34+00
 notify      | system | 2026-08-10 06:20:58+00
```

Exactly one `notify` + one `guest-email` row per `npx vitest run`.

**Cause:** `recordAudit` (`src/lib/audit.ts:104`) inserts via the app db singleton (`@/lib/db`), which is
bound to the **public** schema. The permanently-failed-send tests for `notify` / `guest-email` drive that
code path for real, so the row lands in the dev database rather than in the caller's isolated test schema.
Integration tests elsewhere in this repo take a `DbConn` by dependency injection and are correctly isolated;
these two paths do not, because `recordAudit` takes no `DbConn`.

**Why it was NOT fixed here.** Pre-existing and out of this task's scope — identical rows exist from
`05:13`, `05:17`, `05:42` and `05:51` UTC, i.e. before this task began. Fixing it means threading a `DbConn`
through `recordAudit`, which touches all 57 awaited call sites on money paths. That is its own task with its
own risk budget, not a drive-by change on a money-adjacent path.

**Why it now matters more than it did.** Before this task nothing read those rows, so the pollution was
invisible. As of today they are emailed to a human every morning: the operator's real digest will carry a
slowly-growing tail of test-generated `notify` / `guest-email` rows that represent no real money and no real
failure. That is exactly the noise that trains someone to stop reading the alert.

**Suggested resolution (whoever picks this up):** either give `recordAudit` an optional `DbConn` parameter
so the tests can inject the isolated schema, or have the two tests assert against a mocked audit sink. Then
discharge the accumulated test rows with `npm run ops:alerts:resolve`.

**Interim workaround, safe today:** the rows are discharged like any other —
`npm run ops:alerts:resolve -- <audit-id>` — and they will not come back until the suite runs again.

---

### **CLOSED (2026-08-10, quick task `260810-km4`)**

**What was actually done — a dedicated test DATABASE, not the `DbConn` threading suggested above.**
`npx vitest run` now runs against its own `fitout_test` Postgres database, provisioned once by
`npm run db:test:setup`. `tests/setup.ts` assigns `DATABASE_URL` **unconditionally** (the old
`if (!process.env.DATABASE_URL)` form was unreachable — dotenv had always already set it two lines
above — which is precisely why the suite had been pointing at dev all along). `tests/helpers/db.ts`
carves its per-file `test_%` schemas inside that database, so isolation is now two layers:
per-file schema for the helper's connection, and a separate database for everything that bypasses it.

**Why the suggested resolution was NOT taken.** Threading a `DbConn` through `recordAudit` reaches
**57 awaited call sites on money paths**, and it fixes only the call sites somebody remembers to
thread. It relies on discipline and **fails silently when forgotten** — a new test added next month
that exercises an unthreaded path would quietly resume writing to dev, and nothing would say so. The
leaking set is the gap between the 44 test files that `vi.doMock("@/lib/db", …)` and the 85 that call
`setupTestDb()`, and that gap is **not enumerable**. A separate database contains writes nobody has
enumerated, including ones that do not exist yet. It also carries far less risk than editing 57
money-path call sites to fix a test-hygiene problem.

**THE UNDERLYING LEAK IS CONTAINED, NOT FIXED.** Say this plainly, because the distinction matters:
`recordAudit` still writes through the app's module-level db singleton (`src/lib/db/index.ts`), on
the default `search_path`, still swallowing its INSERT failure by design
(`src/lib/audit.ts:111` — load-bearing for the PayMongo 200-ACK path). Nothing about that changed.
What changed is *where the write lands*: it can no longer reach the dev database.

**The standing signal is the per-run report.** `tests/global-setup.ts` truncates `fitout_test.public`
at the start of every run and prints a `[test-db] LEAKED WRITES` block at the end naming every table
and, for `audit`, every `action` that escaped the schema layer. Containment is demonstrated by
**relocation, not by a code path going quiet** — a run that reports *zero* leaked writes would mean
the code path stopped running, which is a regression, not an improvement.

**Measured on closure** (full suite, `1163 passed / 4 skipped / 0 failed`):

| | before run | after run |
|---|---|---|
| dev `audit` rows | 27 | **27 (unchanged)** |
| dev unresolved `needs_attention` | 27 | **27 (unchanged)** |
| dev `test_%` schemas | 1 | **1 (unchanged)** |
| `fitout_test.public.audit` | 0 (truncated at run start) | **2 — `notify` 1, `guest-email` 1** |

**The accumulated dev rows were discharged, not deleted.** All 27 were classified first against the
literals the two tests inject (`meta->>'error' = 'resend 503'` plus the `bk_failed` / `user_failed` /
`booking_cancelled_by_host` / `rsvp_confirmed` fixture markers); 27/27 matched, 0 were genuine. Each
was discharged individually via `npm run ops:alerts:resolve -- <id>`. Total `audit` row count is
still 27 — nothing was deleted. The dev orphan schema `test_1076_88_0`, left by a crashed pre-fix
run, was dropped in the same pass.

**Operator consequence:** a `notify` or `guest-email` row in the daily digest is now a **REAL**
failure. See `.planning/ops/NEEDS-ATTENTION-RUNBOOK.md` §4a.
