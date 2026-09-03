---
phase: quick-260810-km4
plan: 01
subsystem: test-infrastructure
tags: [testing, database-isolation, audit, ops, dx, t-01-04]
status: complete
requires:
  - "PostgreSQL 18 (postgis/postgis:18 local Docker, service fitout-db-1)"
  - "existing ops CLI: src/lib/ops/alerts.ts + scripts/ops-alerts.ts (shipped by 260810-j3z)"
provides:
  - "fitout_test — a dedicated Postgres database for the vitest suite"
  - "npm run db:test:setup — idempotent provisioning"
  - "testDatabaseUrl() / assertTestDatabase() — the `_test` suffix invariant"
  - "per-run [test-db] LEAKED WRITES report"
affects:
  - "tests/** (every file now runs against fitout_test)"
  - ".planning/ops/NEEDS-ATTENTION-RUNBOOK.md §4a — notify/guest-email are now REAL"
tech-stack:
  added: []
  patterns:
    - "two-layer test isolation: dedicated database (app singleton) + per-file schema (helper connection)"
    - "structural fail-closed invariant on a destructive-DDL target, asserted in the shared module AND at the statement"
    - "containment demonstrated by RELOCATION + loud reporting, not by a code path going quiet"
key-files:
  created:
    - tests/helpers/test-db-url.ts
    - scripts/db-test-setup.ts
    - tests/global-setup.ts
  modified:
    - tests/setup.ts
    - tests/helpers/db.ts
    - vitest.config.ts
    - package.json
    - .env.example
    - README.md
    - .planning/ops/NEEDS-ATTENTION-RUNBOOK.md
    - .planning/quick/260810-j3z-make-unresolved-needs-attention-money-al/deferred-items.md
decisions:
  - "DEC-1 — the test database's public schema IS migrated, so stray writes land somewhere real and nameable rather than failing silently into recordAudit's deliberate swallow"
  - "DEC-2 — precedence TEST_DATABASE_URL > derived <base>_test, and tests/setup.ts's assignment is FORCING; a shell DATABASE_URL no longer steers the suite"
  - "DEC-3 — the `_test` suffix is a hard structural invariant enforced in the shared module and re-asserted immediately before the TRUNCATE"
  - "DEC-4 — the 27 accumulated dev rows were DISCHARGED via the existing per-id ops:alerts:resolve CLI, never DELETEd"
requirements: [D1]
metrics:
  tasks_completed: 3
  tasks_total: 4
  tests: "1163 passed / 4 skipped / 0 failed (130 files passed / 1 skipped)"
  duration: "161.98s full suite; ~1h wall including the resume"
  completed: 2026-08-10
---

# Quick task 260810-km4: Point the vitest suite at its own database — Summary

The vitest suite now runs against its own `fitout_test` Postgres database, so writes made through the
app's module-level db singleton — which bypasses the per-file schema isolation entirely — are contained
by construction instead of by every future test author remembering to `vi.doMock("@/lib/db", …)`.

**Status: PAUSED at Task 4, the blocking human-verify checkpoint.** Tasks 1-3 are complete and
committed. Task 4 requires a human judgement that this task cannot make for itself.

---

## ⚠ This run was a RESUME after a mid-execution process death

A previous executor was killed when its host process exited. Its in-process state was lost; its
on-disk work survived. **Nothing was redone.** What was already on disk when this run started:

| Artifact | State found | What this run did |
|---|---|---|
| `365ebdd` — Task 1 | **committed** (`scripts/db-test-setup.ts`, `tests/helpers/test-db-url.ts`, `package.json`, `.env.example`) | verified only; not re-run, not re-committed |
| `tests/setup.ts` | modified, **uncommitted** | read, verified, committed as part of `eee9215` |
| `tests/helpers/db.ts` | modified, **uncommitted** | same |
| `vitest.config.ts` | modified, **uncommitted** | same |
| `tests/global-setup.ts` | **untracked**, complete | same |
| live `fitout_test` | existed, 20 base tables, `public.audit` already holding **2 rows** | left as-is; the run's `globalSetup` truncated it as designed |
| live `fitout` (dev) | 27 unresolved rows, 1 orphan `test_%` schema | measured, classified, discharged, cleaned — all in Task 3 |
| SUMMARY.md | absent | this file |

The Task-2 code was **verified empirically, not rewritten**. No defect was found in it, so it was
committed as written.

---

## What was built

**Task 1 — `365ebdd` (pre-existing, verified only).** `tests/helpers/test-db-url.ts` is the single
place the test DB URL is decided, exporting `baseDatabaseUrl()`, `databaseNameOf()`,
`assertTestDatabase()` and `testDatabaseUrl()`. `scripts/db-test-setup.ts` + `npm run db:test:setup`
provision `fitout_test` idempotently: `CREATE DATABASE` only when absent, then `postgis` and
`btree_gist` with an **explicit `WITH SCHEMA public`** *before* any migration replay, then
`drizzle-kit migrate` with `DATABASE_URL` set in the child env.

**Task 2 — `eee9215`.** `tests/setup.ts`'s `if (!process.env.DATABASE_URL)` fallback became an
unconditional `process.env.DATABASE_URL = testDatabaseUrl()`. The old form was **unreachable** —
dotenv had always already set the variable two lines above — which is exactly why the suite had been
writing into dev all along. `tests/global-setup.ts` (new) preflights, truncates, and reports.
`vitest.config.ts` registers it. `tests/helpers/db.ts`'s `baseUrl()` delegates to the shared module,
retiring the third copy of the dev URL literal.

**Task 3 — `8c4c37a`.** Dev rows classified and discharged; dev orphan schema dropped; runbook §4a,
D1 closure, and a README Testing section written.

---

## 1. Pre-discharge dump of the unresolved dev rows, with per-row classification

Dumped from `fitout` **before** any discharge command ran. 27 rows, all `outcome='needs_attention'`,
all `resolved_at IS NULL`, all `actor_id='system'`.

### The discriminator, stated before the table

Classification was **not** done on `action` alone. A genuine permanent `notify` / `guest-email` send
failure is a real operator alert and is indistinguishable from test noise at that granularity. The
discriminator is the literal error string the two tests inject, corroborated by their fixture markers:

| Action | ALL of these had to match | Source of the literals |
|---|---|---|
| `notify` | `meta->>'error' = 'resend 503'` **and** `bookingId = 'bk_failed'` **and** `recipientId = 'user_failed'` **and** `notifyType = 'booking_cancelled_by_host'` | `tests/notifications/notify.test.ts:173, 178-180, 198-200` |
| `guest-email` | `meta->>'error' = 'resend 503'` **and** `guestEmailKind = 'rsvp_confirmed'` | `tests/notifications/guest-email.test.ts:106, 112, 128` |

**Any row failing the discriminator would have been classified GENUINE and left untouched** — the
rule was "err toward survival" on a money-adjacent audit table. Corroborating evidence: the
`created_at` values cluster in tight `notify`-then-`guest-email` pairs seconds apart (rows 1/2, 3/4,
5/6 …), which is the shape of a suite run, not of independent production failures.

Rows with any other `action` — the `auto_refund_*` / `refund_*` / `checkout_expire_failed` /
`host_cancel_*` / `group_void_failed` family — are real money alerts and were **explicitly out of
scope**. There were none among the unresolved set, and none was touched.

### The dump

| # | audit id | action | created_at (UTC) | meta | Class |
|---|---|---|---|---|---|
| 1 | `09a9adbf-14f6-401b-aea1-681d99344325` | `notify` | 2026-08-06 11:57:42 | `{"error":"resend 503","bookingId":"bk_failed","notifyType":"booking_cancelled_by_host","recipientId":"user_failed"}` | TEST NOISE |
| 2 | `304e058f-3948-4bd1-b23e-7da73b3dc249` | `guest-email` | 2026-08-06 11:58:25 | `{"error":"resend 503","guestEmailKind":"rsvp_confirmed"}` | TEST NOISE |
| 3 | `080700ee-f665-4e93-a7b5-f0cacda34060` | `notify` | 2026-08-06 12:11:33 | `{"error":"resend 503","bookingId":"bk_failed","notifyType":"booking_cancelled_by_host","recipientId":"user_failed"}` | TEST NOISE |
| 4 | `728f3702-4984-4571-93ef-68aa7f667aa9` | `guest-email` | 2026-08-06 12:12:04 | `{"error":"resend 503","guestEmailKind":"rsvp_confirmed"}` | TEST NOISE |
| 5 | `9e773d96-af8f-4ac2-b06c-79790571ad8b` | `notify` | 2026-08-06 13:00:35 | `{"error":"resend 503","bookingId":"bk_failed","notifyType":"booking_cancelled_by_host","recipientId":"user_failed"}` | TEST NOISE |
| 6 | `ab4e2ed2-c1f1-49a0-8c25-5a38835ce79b` | `guest-email` | 2026-08-06 13:01:02 | `{"error":"resend 503","guestEmailKind":"rsvp_confirmed"}` | TEST NOISE |
| 7 | `48e21c3a-c77b-41cd-8d33-c7b46a46acdd` | `notify` | 2026-08-07 03:13:04 | `{"error":"resend 503","bookingId":"bk_failed","notifyType":"booking_cancelled_by_host","recipientId":"user_failed"}` | TEST NOISE |
| 8 | `3d020d7c-d168-4bb0-85b8-d75fc19c9b3d` | `guest-email` | 2026-08-07 03:13:28 | `{"error":"resend 503","guestEmailKind":"rsvp_confirmed"}` | TEST NOISE |
| 9 | `48ba7767-ec8a-4d0c-96ce-a0383a64e5cf` | `notify` | 2026-08-07 03:18:57 | `{"error":"resend 503","bookingId":"bk_failed","notifyType":"booking_cancelled_by_host","recipientId":"user_failed"}` | TEST NOISE |
| 10 | `ed99de34-3855-4dc4-a92a-e538984e782e` | `guest-email` | 2026-08-07 03:19:21 | `{"error":"resend 503","guestEmailKind":"rsvp_confirmed"}` | TEST NOISE |
| 11 | `1b820880-e2d9-4212-a057-c6b32d77521b` | `notify` | 2026-08-07 03:22:45 | `{"error":"resend 503","bookingId":"bk_failed","notifyType":"booking_cancelled_by_host","recipientId":"user_failed"}` | TEST NOISE |
| 12 | `d629305f-2995-4264-b2c6-02eb16039cac` | `guest-email` | 2026-08-07 03:23:14 | `{"error":"resend 503","guestEmailKind":"rsvp_confirmed"}` | TEST NOISE |
| 13 | `23ec54d3-60e6-435d-86cc-10ca200aeaa8` | `notify` | 2026-08-07 03:25:56 | `{"error":"resend 503","bookingId":"bk_failed","notifyType":"booking_cancelled_by_host","recipientId":"user_failed"}` | TEST NOISE |
| 14 | `6c40f10e-da52-4381-89e3-c2a49cf6551d` | `guest-email` | 2026-08-07 03:26:24 | `{"error":"resend 503","guestEmailKind":"rsvp_confirmed"}` | TEST NOISE |
| 15 | `62ee3510-9480-48af-ae4d-41f86df1407f` | `notify` | 2026-08-10 05:13:30 | `{"error":"resend 503","bookingId":"bk_failed","notifyType":"booking_cancelled_by_host","recipientId":"user_failed"}` | TEST NOISE |
| 16 | `0a49cb72-6227-4334-bb0c-0784452e68df` | `notify` | 2026-08-10 05:17:27 | `{"error":"resend 503","bookingId":"bk_failed","notifyType":"booking_cancelled_by_host","recipientId":"user_failed"}` | TEST NOISE |
| 17 | `02870c4b-dddf-4a1e-974b-0b122dfe1363` | `guest-email` | 2026-08-10 05:17:58 | `{"error":"resend 503","guestEmailKind":"rsvp_confirmed"}` | TEST NOISE |
| 18 | `95c724f6-fc2f-46f0-b11f-9aca70874e41` | `notify` | 2026-08-10 05:42:00 | `{"error":"resend 503","bookingId":"bk_failed","notifyType":"booking_cancelled_by_host","recipientId":"user_failed"}` | TEST NOISE |
| 19 | `f3c2426e-e6f2-4e7f-ac98-d61003b29440` | `guest-email` | 2026-08-10 05:42:25 | `{"error":"resend 503","guestEmailKind":"rsvp_confirmed"}` | TEST NOISE |
| 20 | `d5c03f5f-e3b4-4a50-8450-4f883b105288` | `notify` | 2026-08-10 05:50:43 | `{"error":"resend 503","bookingId":"bk_failed","notifyType":"booking_cancelled_by_host","recipientId":"user_failed"}` | TEST NOISE |
| 21 | `7f3ac0d9-ffee-488f-aff3-4818e8d42443` | `guest-email` | 2026-08-10 05:51:07 | `{"error":"resend 503","guestEmailKind":"rsvp_confirmed"}` | TEST NOISE |
| 22 | `c8ed9702-d11d-4c3a-aae2-c2c83dec0329` | `notify` | 2026-08-10 06:20:58 | `{"error":"resend 503","bookingId":"bk_failed","notifyType":"booking_cancelled_by_host","recipientId":"user_failed"}` | TEST NOISE |
| 23 | `0531ef99-6876-498b-994d-e2bba00391ac` | `guest-email` | 2026-08-10 06:21:34 | `{"error":"resend 503","guestEmailKind":"rsvp_confirmed"}` | TEST NOISE |
| 24 | `e5c05707-8f04-4bc9-a13b-54a72641d842` | `notify` | 2026-08-10 06:29:41 | `{"error":"resend 503","bookingId":"bk_failed","notifyType":"booking_cancelled_by_host","recipientId":"user_failed"}` | TEST NOISE |
| 25 | `97ba1208-4af0-41d4-8199-9c067847cdfc` | `guest-email` | 2026-08-10 06:30:04 | `{"error":"resend 503","guestEmailKind":"rsvp_confirmed"}` | TEST NOISE |
| 26 | `95683604-74b9-4382-9876-42d9151e7cfe` | `notify` | 2026-08-10 06:38:55 | `{"error":"resend 503","bookingId":"bk_failed","notifyType":"booking_cancelled_by_host","recipientId":"user_failed"}` | TEST NOISE |
| 27 | `440879be-2cf1-450f-be9c-a264ec65200b` | `guest-email` | 2026-08-10 06:39:25 | `{"error":"resend 503","guestEmailKind":"rsvp_confirmed"}` | TEST NOISE |

**Classifier output, re-run immediately before discharge:**

```
TOTAL unresolved   : 27
MATCH test-noise   : 27 (notify 14, guest-email 13)
FAIL -> GENUINE    : 0
```

One asymmetry worth naming rather than smoothing over: row 15 (`notify`, 05:13:30) has **no paired
`guest-email`**, unlike every other pair. That is the fingerprint of a suite run that died partway —
the same crashed run that left the orphan `test_1076_88_0` schema in dev. It still matches the
discriminator on all four fields, so it classifies as test noise on its own evidence, not by pairing.

---

## 2. Which rows were discharged, which survived, and why

**Discharged: all 27, one at a time, via `npm run ops:alerts:resolve -- <id>`.** No bulk operation,
no `DELETE`, no change to `src/lib/ops/alerts.ts` or `scripts/ops-alerts.ts` (both verified
byte-unchanged). Every command returned `Resolved <id> at <timestamp>.` — 27 of 27, no
already-discharged and no not-found. First and last:

```
 1  09a9adbf-14f6-401b-aea1-681d99344325  Resolved 09a9adbf-14f6-401b-aea1-681d99344325 at 2026-08-10T07:31:15.661Z.
27  440879be-2cf1-450f-be9c-a264ec65200b  Resolved 440879be-2cf1-450f-be9c-a264ec65200b at 2026-08-10T07:32:34.529Z.
```

**Survived: none — because none was genuine.** This is a real outcome, not a skipped check: the
discriminator was run and 0 rows failed it. Had any row failed, it would have been left unresolved
and named here.

**Proof nothing was deleted** (`audit` is append-only and money-adjacent):

```
total audit rows (was 27; must NOT fall): 27
surviving unresolved                  : 0
now carrying resolved_at              : 27
```

```
$ npm run ops:alerts
No unresolved needs_attention alerts.
```

Every row and its full `meta` remain queryable. Only `resolved_at` was written.

**Dev orphan schema.** `test_1076_88_0` (13 tables), left by a crashed pre-fix run, was dropped with
a name-shape guard (`^test_[0-9]+_[0-9]+_[0-9]+$`, with `public` / `pg_*` / `information_schema`
explicitly refused) re-asserted immediately before the statement. Dev afterwards: **0** `test_%`
schemas, **22** tables still in `public`, **27** audit rows still present.

---

## 3. Before/after dev containment measurements — verbatim

Recorded around **one** full `npx vitest run`, from a bare shell with **no** `DATABASE_URL` and no
`TEST_DATABASE_URL` exported (both confirmed `<unset>` first).

```
BEFORE {"dev_audit_total":27,"dev_unresolved":27,"dev_test_schemas":1,"test_audit":2,"test_schemas":0}
```

```
DEV  audit total : 27 -> 27  UNCHANGED
DEV  unresolved  : 27 -> 27  UNCHANGED
DEV  test_% schem: 1 -> 1  UNCHANGED
TEST public.audit: truncated to 0 at run start -> 2  [{"action":"guest-email","n":1},{"action":"notify","n":1}]
BOTH HALVES PASS: dev unchanged AND writes relocated.
```

Suite result — **exactly the asserted baseline**, not a floor:

```
 Test Files  130 passed | 1 skipped (131)
      Tests  1163 passed | 4 skipped (1167)
   Start at  15:26:04
   Duration  161.98s (transform 13.69s, setup 13.45s, import 398.08s, tests 513.06s, environment 72.89s)
```

Preflight line, verbatim:

```
[test-db] using fitout_test — truncated 19 table(s) in public so this run's leak report is per-run.
```

(19 = 20 base tables in `public` minus `spatial_ref_sys`, which is excluded by design — truncating
PostGIS reference data would be a corruption, not a cleanup.)

End-of-run leak report, verbatim:

```
┏━━ [test-db] LEAKED WRITES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ 2 row(s) landed in the test database's PUBLIC schema this run:
┃   public.audit                        2 row(s)
┃       action=guest-email              1
┃       action=notify                   1
┃
┃ These bypassed tests/helpers/db.ts's per-file schema isolation via the app's
┃ module-level db singleton (src/lib/db/index.ts), which is bound to `public`.
┃ BEFORE the suite got its own database they landed in DEV — and since the daily
┃ 08:50 Manila ops digest emails unresolved needs_attention rows to a human, they
┃ became daily mail about money that does not exist.
┃
┃ They are CONTAINED, not fixed: recordAudit still writes through the singleton,
┃ it just can no longer reach dev. To fix at source, thread a DbConn through the
┃ calling path (or vi.doMock("@/lib/db", …) in the offending test file).
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 4. Non-vacuity result — which actions leaked, and their counts

```
fitout_test.public.audit  ->  [{"action":"guest-email","n":1},{"action":"notify","n":1}]   total 2
```

**This is the half of the proof that matters most, and it is the half that is easy to fake by
accident.** Dev being unchanged is necessary but not sufficient: a code path that stopped running
would produce exactly the same "dev unchanged" reading as a code path that was successfully
relocated. The 2 rows in `fitout_test.public.audit` — one `notify`, one `guest-email`, exactly the
pair D1 predicted — are what distinguish the two. Zero here would have been a **regression report**,
not a pass.

The rows arrived in a database that `globalSetup` had truncated to 0 at the start of that same run,
so the count is per-run, not cumulative.

---

## 5. The leak is CONTAINED, not fixed at source

State this plainly, because the distinction governs how the result should be read.

**What did not change.** `recordAudit` (`src/lib/audit.ts:104`) still takes no `DbConn` and still
inserts through the app's module-level db singleton (`src/lib/db/index.ts`), on the connection's
default `search_path` (= `public`). It still swallows the INSERT failure by design
(`src/lib/audit.ts:111`) — deliberately, because 57 awaited call sites sit inside `catch` blocks on
the PayMongo webhook's 200-ACK path, where a throw makes PayMongo retry against the confirm
authority. That swallow is load-bearing and was not touched.

**What changed.** Only *where the write lands*. It can no longer reach the dev database.

**What would fix it at source.** Thread a `DbConn` parameter through `recordAudit` and its callers so
tests can inject the isolated schema (or mock the audit sink in the two offending test files). That
was rejected here, and the reason is not effort: it reaches **57 awaited call sites on money paths**,
it fixes only the call sites somebody remembers to thread, and it **fails silently when forgotten** —
a test added next month exercising an unthreaded path would quietly resume writing to dev with
nothing to say so. The leaking set is the gap between the 44 test files that
`vi.doMock("@/lib/db", …)` and the 85 that call `setupTestDb()`, and that gap is **not enumerable**.
A separate database contains writes nobody has enumerated, including ones that do not exist yet.

**The standing signal.** The per-run `[test-db] LEAKED WRITES` block is the permanent replacement for
the dev pollution. It reports and never throws — failing the suite on it would leave the tree
permanently red, since those two rows are *expected* every run, and a permanently-red gate is ignored
within a week.

---

## Deviations from Plan

**None affecting behaviour.** No code was rewritten; the pre-existing Task-2 implementation was
verified and committed as written. Three points where judgement was applied within the plan's terms:

**1. `.env.example` was already done by Task 1.** Task 3 step E says "add `TEST_DATABASE_URL` to
`.env.example` if Task 1 did not already". It had. Verified present, left unchanged.

**2. The two `$HOME/.claude/.../memory/` files were routed out of scope by the orchestrator.** They
live outside the repository and no commit here could capture them; the orchestrator owns them and
will update them separately. They are `fitout-gsd-toolchain-gotchas.md:18` (the verbatim retired
rule) and `local-env-and-uat-seed.md:13` (the first-run recipe that needs `npm run db:test:setup`
added). **Task 3 step C is therefore only partly discharged by this executor** — the in-repo half is
done, the memory half is the orchestrator's. Two of the plan's `<verify>` gates target those files
and were not run here for the same reason.

**3. No in-repo statement of the retired rule needed correcting — a finding, not an omission.** A
full sweep of the repository for the rule turned up hits in exactly 17 files, **all** of them
`.planning/phases/**` or `.planning/quick/**` `PLAN` / `SUMMARY` / `VERIFICATION` documents. The plan
explicitly forbids rewriting those: they are accurate records of what was done at the time, and
editing them would falsify the record. Correcting live guidance is the requirement; rewriting history
is not. `README.md`, `.env.example`, `CLAUDE.md`, the runbook and all source comments were checked
and contained no statement of the rule. The in-repo work was therefore to state the **new** mechanism
positively — the README Testing section — rather than to delete an old sentence. As live guidance,
the retired rule existed **only** in the out-of-repo memory file.

---

## Verification

| Gate | Expected | Result |
|---|---|---|
| `npx vitest run` (bare shell, no `DATABASE_URL`) | 1163 passed / 4 skipped / 0 failed | **1163 / 4 / 0** ✓ exact |
| Dev `audit` count before vs after that run | identical | 27 → 27 ✓ |
| Dev unresolved `needs_attention` before vs after | identical | 27 → 27 ✓ |
| Dev `test_%` schema count before vs after | identical | 1 → 1 ✓ |
| `fitout_test.public.audit` after that run | ≥ 2, incl. `notify` + `guest-email` | 2 (`notify` 1, `guest-email` 1) ✓ |
| End-of-run console | `[test-db] LEAKED WRITES` naming the actions | present, verbatim above ✓ |
| `npx tsc --noEmit` | exit 0 | exit 0 ✓ |
| `npm run lint` | 0 errors, no new warnings over the 9-warning baseline | **0 errors, 9 warnings** ✓ |
| `ls drizzle/*.sql \| tail -1` | `0024_audit_table.sql`, no migration written | `drizzle/0024_audit_table.sql`; `git status drizzle/` = 0 lines ✓ |
| `git diff --exit-code e2e/ drizzle.config.ts scripts/seed.ts src/lib/audit.ts src/lib/db/index.ts src/lib/ops/alerts.ts scripts/ops-alerts.ts` | clean | clean ✓ |
| Dev total `audit` rows after Task 3 | not lower — nothing deleted | 27 → 27, all now `resolved_at` ✓ |
| `npm run ops:alerts` after Task 3 | only GENUINE rows remain | `No unresolved needs_attention alerts.` ✓ |
| `README.md` / `.env.example` / D1 / runbook | documented | all four ✓ |
| New npm dependency | none | none ✓ |

**Not run by this executor (out of scope, orchestrator-owned):** the two `grep` gates against
`$HOME/.claude/.../memory/fitout-gsd-toolchain-gotchas.md` and `local-env-and-uat-seed.md`.

**`e2e/` correction worth carrying forward.** The plan's finding F7 names five Playwright specs that
read `DATABASE_URL` and target dev. **There are seven** — F7 under-cites by two:
`search-and-book.spec.ts` and `stale-session-selfheal.spec.ts` also match. The consequence is
unchanged (nothing in `e2e/` was touched, and `git diff --exit-code e2e/` is clean), but the count in
F7 should not be relied on as exhaustive.

---

## Commits

| Task | Commit | Subject |
|---|---|---|
| 1 | `365ebdd` | `feat(quick-260810-km4): provision a dedicated fitout_test database for the vitest suite` *(pre-existing — this run verified only)* |
| 2 | `eee9215` | `feat(quick-260810-km4): force the vitest suite onto fitout_test and report every stray write` |
| 3 | `8c4c37a` | `docs(quick-260810-km4): close D1, tell the operator notify/guest-email rows are now real` |

---

## Known Stubs

None.

---

## Threat Flags

None. The plan's threat register (T-KM4-01 … T-KM4-SC) covers the surface this task introduces, and
no new security-relevant surface appeared during execution. Specifically:

- **T-KM4-01** (destructive `TRUNCATE`) — mitigated as designed. `assertTestDatabase()` is enforced
  in the shared module *and* re-asserted at `tests/global-setup.ts:87`, immediately before the
  statement. Verified by inspection.
- **T-KM4-02** (PostGIS reference data) — `spatial_ref_sys` excluded; the preflight line's "19 of 20
  tables" is the observable proof.
- **T-KM4-03** (discharging money-adjacent rows) — no `DELETE` anywhere; total row count proven
  unchanged at 27.
- **T-KM4-04** (misclassification) — discriminator run and recorded before any discharge; 0 rows
  failed it; the blocking human checkpoint below is the remaining control.

---

## Self-Check

Created/modified files:

```
FOUND: tests/helpers/test-db-url.ts
FOUND: scripts/db-test-setup.ts
FOUND: tests/global-setup.ts
FOUND: tests/setup.ts
FOUND: tests/helpers/db.ts
FOUND: vitest.config.ts
FOUND: README.md
FOUND: .planning/ops/NEEDS-ATTENTION-RUNBOOK.md
FOUND: .planning/quick/260810-j3z-make-unresolved-needs-attention-money-al/deferred-items.md
```

Commits:

```
FOUND: 365ebdd
FOUND: eee9215
FOUND: 8c4c37a
```

## Self-Check: PASSED

---

## Task 4 — BLOCKING human verification (NOT self-certified)

**This task is not closed.** Task 4 is a `checkpoint:human-verify` with `gate="blocking"`, and the
thing it gates is a judgement this executor is not entitled to make: **whether 27 money-adjacent
audit rows were correctly classified as noise.** The automated gates prove the rows matched a
discriminator. They cannot prove the discriminator was the right one. See the checkpoint message for
what the user must check.
