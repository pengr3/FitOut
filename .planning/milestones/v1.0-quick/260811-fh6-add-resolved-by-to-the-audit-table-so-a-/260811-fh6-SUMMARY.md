---
phase: quick-260811-fh6
plan: 01
subsystem: ops
tags: [audit, migration, ops-cli, money-path, provenance]
requires: [T-J3Z-06, D-J3Z-11, D-DJ4-05]
provides:
  - "audit.resolved_by — nullable text, no FK, no index (migration 0025)"
  - "resolveAlert(dbConn, id, resolvedBy) — required third parameter"
  - "parseResolveArgs — the --by requirement, pure and DB-free"
  - "ops:alerts:history BY column, rendering `unrecorded` for an uncaptured discharger"
affects:
  - ".planning/ops/NEEDS-ATTENTION-RUNBOOK.md §6/§6a/§7/§8"
  - ".planning/v1.0-MILESTONE-AUDIT.md item 5 (BY WHOM clause only)"
  - ".planning/phases/05-payments-payouts/05-HUMAN-UAT.md item 3(c)"
tech-stack:
  added: []
  patterns:
    - "migration verified against information_schema + fresh-schema replay, never tsc (T-08-40)"
    - "one guard, no redundant second predicate, so the real one stays measurable"
    - "policy extracted to a pure module so it can be mutated in isolation"
key-files:
  created:
    - drizzle/0025_audit_resolved_by.sql
    - drizzle/meta/0025_snapshot.json
    - src/lib/ops/resolve-args.ts
    - tests/ops/resolve-args.test.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/ops/alerts.ts
    - scripts/ops-alerts.ts
    - drizzle/meta/_journal.json
    - tests/ops/alerts.test.ts
    - tests/ops/alert-digest.test.ts
decisions: [D-FH6-01, D-FH6-02, D-FH6-03, D-FH6-04, D-FH6-05, D-FH6-06, D-FH6-07, D-FH6-08, D-FH6-09, D-FH6-10]
metrics:
  duration: ~2h
  completed: 2026-08-11
---

# Quick Task 260811-fh6: `resolved_by` on the audit table Summary

A discharge now records **who claims to have made it** — `audit.resolved_by`, written from a CLI `--by`
that is required and has no default — while stating everywhere, as a first-class deliverable, that the
identity is **asserted, not authenticated**.

## Baseline, measured not quoted

Run before touching anything, bare, no `DATABASE_URL` exported:

```
 Test Files  131 passed | 1 skipped (132)
      Tests  1187 passed | 4 skipped (1191)
```

**Delta arithmetic: measured baseline 1187 + exactly 10 new cases = 1197.** Final: `1197 passed | 4 skipped
(1201)`, 0 failed. The plan's expectation of 1187 (after `260811-elm`) was correct, but the number used is
the measured one.

One plan assumption did not hold and is recorded rather than glossed: `<baseline>` said
`260811-elm-SUMMARY.md` was untracked in the working tree. It was not — `git status` was clean at
`90668fc`, so there was nothing to avoid sweeping up.

## The call-site enumeration, re-run first-hand

The plan warned its own table might be stale and told me to re-grep. I did, before touching anything:

```
$ grep -rn "resolveAlert(" src/ scripts/ tests/ --include=*.ts
src/lib/ops/alerts.ts:145        (the definition)
scripts/ops-alerts.ts:97
tests/ops/alert-digest.test.ts:168
tests/ops/alerts.test.ts:276, 292, 300, 316, 329, 481
```

**The table was accurate — eight call sites, at exactly the stated lines.** I re-ran the grep a second time
immediately before flipping the signature in Task 2; only `scripts/ops-alerts.ts:97` remained, and piece 4
took it. Final gate: `0` two-argument calls across `src/`, `scripts/` and `tests/`.

## The verbatim RED

`git diff --exit-code src/ scripts/ drizzle/` printed `CONFIRMED CLEAN` before the anchors were run.

**`tests/ops/resolve-args.test.ts` — prediction written down first, and it was RIGHT.** The plan pointed at
the dj4 precedent (Vite resolving a missing named export to `undefined` rather than throwing). I predicted
that precedent would NOT apply, because the module does not exist as a *file*:

```
 ❯ tests/ops/resolve-args.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/ops/resolve-args.test.ts [ tests/ops/resolve-args.test.ts ]
Error: Cannot find package '@/lib/ops/resolve-args' imported from C:/Users/Admin/Roaming/FitOut/tests/ops/resolve-args.test.ts

 Test Files  1 failed (1)
      Tests  no tests
```

**`tests/ops/alerts.test.ts` — 7 failed of 20:**

```
 ❯ tests/ops/alerts.test.ts (20 tests | 7 failed) 970ms
 FAIL  case 6 — an unknown id reports not_found, creates no row, and never looks like a discharge
Error: Failed query: SELECT count(*)::int AS "c" FROM audit WHERE resolved_by IS NOT NULL
Caused by: PostgresError: column "resolved_by" does not exist
 FAIL  case 15 — records the discharger: the RETURNED row carries it AND the STORED column equals it
AssertionError: expected undefined to be 'ops-jane' // Object.is equality
 FAIL  case 16 — THE CLOBBER, extended: a second resolve under a DIFFERENT name rewrites neither the time nor the discharger
AssertionError: expected undefined to be 'ops-jane' // Object.is equality
 FAIL  case 17 — NO BACKFILL: a historical discharge with no recorded discharger stays NULL under re-resolve
Caused by: PostgresError: column "resolved_by" of relation "audit" does not exist
 FAIL  case 14 — exists as nullable `text` in the REPLAYED schema, and `audit` still carries no foreign key
AssertionError: expected [] to have a length of 1 but got +0
 FAIL  case 12 — surfaces ONLY meta->>'error'; the rest of `meta` cannot reach the row
AssertionError: expected [ 'action', 'actorId', …(5) ] to deeply equal [ 'action', 'actorId', …(6) ]
 FAIL  case 18 — returns `resolvedBy` per row: the CLI-discharged row carries its name, the historical row carries null
Caused by: PostgresError: column "resolved_by" of relation "audit" does not exist

 Test Files  2 failed | 1 passed (3)
      Tests  7 failed | 21 passed (28)
```

**Cases 4, 5, 6b and 13 stayed GREEN, verified explicitly with `--reporter=verbose` rather than inferred
from the absence of a FAIL line** — as did the entire digest file. That was the risk the plan flagged: a
red there would have been a real regression, not expected noise.

Three distinct RED shapes, which is itself worth recording: an *assertion* on `undefined` (15/16, the extra
argument silently dropped by a two-parameter function), a *Postgres* error (6/17/18, SQL touching the
column), and an *empty information_schema result* (14) — the last being the only shape that stays red when
a column is declared but never migrated.

## Migration 0025

Generated with `npm run db:generate -- --name audit_resolved_by`. Journal:
`{"idx":25,...,"tag":"0025_audit_resolved_by",...}`. The generator emitted the **unqualified** form —

```sql
ALTER TABLE "audit" ADD COLUMN "resolved_by" text;
```

— so `tests/helpers/db.ts`'s `"public".` rewrite is a harmless no-op and `SET search_path` does the work,
exactly as the plan's migration-replay analysis predicted. Negative gate: `0` occurrences of `CREATE INDEX`
or `REFERENCES`, both with comments stripped and across the whole file including the prose header.

Applied to **both** databases, and `information_schema` confirms in each:

```
=== fitout ===                        === fitout_test ===
 resolved_by | text | YES              resolved_by | text | YES
```

Plus the third check that actually matters: case 14 asserts the same facts **inside a freshly replayed
isolated schema**, scoped to `testDb.schema`, along with zero foreign keys on `audit`.

## Mutations — all five run, all recorded verbatim, all reverted

`git diff --exit-code src/ scripts/ drizzle/` printed clean after every one.

**M1 — delete `AND resolved_at IS NULL`. The load-bearing one.**
```
 FAIL  case 5 — idempotent: a second resolve reports already_resolved and CANNOT rewrite the original time
AssertionError: expected 'resolved' to be 'already_resolved' // Object.is equality
 FAIL  case 16 — THE CLOBBER, extended: …
AssertionError: expected 'resolved' to be 'already_resolved' // Object.is equality
 FAIL  case 17 — NO BACKFILL: …
AssertionError: expected 'resolved' to be 'already_resolved' // Object.is equality
      Tests  3 failed | 30 passed (33)
```
Cases 16 **and** 17 both red, as required. Case 5 joining them is not collateral — it is the same single
guard, and its presence is the evidence that `resolved_by` *inherited* the protection rather than acquiring
its own. No `AND resolved_by IS NULL` was added; a spare predicate would have kept this mutation green.

**M2a / M2b — and the first M2b run found a hole in case 20 itself.**

This is the finding of the task. As originally written, case 20 asserted `expect(parsed.ok).toBe(false)`
*before* the `ghost-default` check. Under M2b (an OS-username fallback) the parse succeeded, so the case
failed on ok-ness and the env assertion never executed — producing output **byte-identical to M2a's**:

```
AssertionError: expected true to be false // Object.is equality
```

So the case could not distinguish "a flag is required" (M2a) from "the machine fills the name in" (M2b) —
which is exactly and only the distinction D-FH6-03 is about, and the sole reason the env half exists. A
case that cannot separate two mutations is not measuring what separates them. I moved the `ghost-default`
assertion **above** the `ok` narrowing and re-ran **both** mutations against the corrected case:

- **M2a** (drop the refusal): `AssertionError: expected true to be false // Object.is equality` — `Tests 1 failed | 32 passed (33)`
- **M2b** (`process.env.USERNAME ?? process.env.USER ?? "operator"`):
  `AssertionError: expected '{"ok":true,"id":"audit_abc123","by":"…' not to contain 'ghost-default'` —
  `Tests 1 failed | 32 passed (33)`

M2b now reddens **naming `ghost-default`**, and the two mutations fail differently. Found by *running* a
mutation, not by reading the test.

**M3 — remove `resolvedBy` from the select AND from `ResolvedAlert`.**
```
 FAIL  case 12 — … AssertionError: expected [ 'action', 'actorId', …(5) ] to deeply equal [ 'action', 'actorId', …(6) ]
 FAIL  case 18 — … AssertionError: expected undefined to be 'ops-jane' // Object.is equality
      Tests  2 failed | 31 passed (33)
```
The whole of `alert-digest.test.ts` stayed **green** — the H4 property holds: the review row's read surface
is not riding on the email guards. Case 12 also demonstrates a key-set tripwire firing in the direction
nobody usually tests: when a named field *disappears*.

**M4 — the T-08-40 demonstration.** Comment out only the `ALTER TABLE` line, leaving `schema.ts` declaring
the column and `_journal.json` untouched:

```
$ npx tsc --noEmit; echo "M4 tsc exit=$?"
M4 tsc exit=0

$ npx vitest run tests/ops
 FAIL  alert-digest case 2 … Caused by: PostgresError: column "resolved_by" does not exist
 FAIL  case 4 …              Caused by: PostgresError: column "resolved_by" does not exist
 FAIL  case 14 …             AssertionError: expected [] to have a length of 1 but got +0
 …(cases 5, 6, 6b, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18 likewise)…
  Test Files  2 failed | 1 passed (3)
       Tests  16 failed | 17 passed (33)
```

**Type checker perfectly green; sixteen cases dead.** That gap is the whole reason a `[BLOCKING]` migration
is gated on `information_schema` + replay and never on `tsc` — measured here rather than quoted.

## The live no-backfill proof (dev, read-mostly)

```
BEFORE:  27  (total)   27  (resolved_at NOT NULL AND resolved_by IS NULL)   0  (resolved_by NOT NULL)
AFTER:   27            27                                                   0
```

All 27 rows render `BY = unrecorded` under `npm run ops:alerts:history -- 90`.

Refusal, against one of the 27, exit code **1**, nothing written:

```
resolve needs --by "<your name>". There is deliberately no default: a name you type is the record, a name
the machine fills in attributes nothing while making every discharge look attributed. (It is an identity
that is asserted, not authenticated — the CLI has no session.)
```

Then the same row *with* a name — the single command that proves no-backfill and the honest NULL render at
once:

```
09a9adbf-14f6-401b-aea1-681d99344325 was ALREADY discharged at 2026-08-10T07:31:15.661Z by an unrecorded
discharger — nothing changed.
The --by you supplied ("Live Check") was NOT recorded. This row was discharged before the resolved_by
column existed, and a past discharge is never retro-attributed — neither the original discharge nor its
missing discharger is overwritten or back-filled.
```

Counts identical afterwards, and `SELECT count(*) FROM audit WHERE resolved_by = 'Live Check'` → `0`.

## The `fitout_test` end-to-end (never a fresh discharge into dev)

```
$ DATABASE_URL=…/fitout_test npx tsx scripts/ops-alerts.ts resolve audit_fh6_throwaway --by "  Jane Ops  "
Resolved audit_fh6_throwaway at 2026-08-11T04:07:04.734Z, by "Jane Ops" (asserted, not authenticated — this CLI has no session).

$ DATABASE_URL=…/fitout_test npx tsx scripts/ops-alerts.ts history
AUDIT ID              OUTCOME          ACTION              CREATED (UTC)         RESOLVED (UTC)        HELD   BY                  ERROR
audit_fh6_throwaway   needs_attention  auto_refund_manual  2026-08-11T04:06:39Z  2026-08-11T04:07:04Z  0h     Jane Ops            fh6 end-to-end probe
```

The padded `"  Jane Ops  "` stored trimmed. Throwaway row deleted; `fitout_test.public.audit` back to 0 rows.

## Deviations from Plan

**1. [Rule 1 — Bug] Case 20's assertion order made its env half unreachable**

- **Found during:** Task 3, mutation M2b.
- **Issue:** `expect(parsed.ok).toBe(false)` preceded the `ghost-default` assertion, so under an
  OS-username fallback the case failed before ever checking the env value. M2a and M2b produced identical
  output, meaning the case measured "a flag is required" but not "there is no default" — the one thing it
  was written to measure.
- **Fix:** Moved the `ghost-default` assertion above the `ok` narrowing; re-ran both mutations.
- **Files modified:** `tests/ops/resolve-args.test.ts`
- **Commit:** `e4722eb`

**2. [Rule 3 — Blocking] `makeAudit` writes `resolved_by` conditionally on key presence**

- **Found during:** Task 1.
- **Issue:** Unconditionally adding `resolved_by` to the fixture INSERT would have reddened all fifteen
  pre-existing cases on `column "resolved_by" does not exist` during the RED pass, drowning the five cases
  that were actually measuring the new column — and breaking the plan's own requirement that cases 4, 5, 6b
  and 13 stay green.
- **Fix:** The column enters the INSERT only when the `resolvedBy` key is *present* (`"resolvedBy" in opts`),
  so `resolvedBy: null` still plants a historical row explicitly while an omitted key leaves the statement
  schema-agnostic. Documented in the helper's docblock.
- **Files modified:** `tests/ops/alerts.test.ts`
- **Commit:** `97aca41`

Two minor mechanical notes, neither a design change: line-wrapping in `05-HUMAN-UAT.md` and
`v1.0-MILESTONE-AUDIT.md` initially split the gated phrases across newlines, so the line-based greps read
`0`; re-wrapped and re-verified. And the first Task-2 commit message had two backtick-quoted words eaten by
shell substitution — amended via heredoc, code untouched.

No Rule 4 situations arose. No packages were installed (T-FH6-SC: this task changed no dependency and no
`package.json` at all).

## Gates

| Gate | Result |
|---|---|
| Full suite | `1197 passed \| 4 skipped (1201)`, 0 failed — measured 1187 **+ exactly 10** |
| `tsc --noEmit` | exit **0** |
| `npm run lint` | **0 errors**, 9 warnings — all pre-existing, none in a file this task touched |
| Two-argument `resolveAlert` calls | **0** across `src/`, `scripts/`, `tests/` |
| `_journal.json` last entry | `idx: 25` / `tag: "0025_audit_resolved_by"` |
| `CREATE INDEX` / `REFERENCES` in `0025` | **0** (comments stripped, and whole-file) |
| `information_schema` | `resolved_by \| text \| YES` in `fitout`, `fitout_test`, and the replayed schema |
| Dev counts | 27 / 27 / 0 before **and** after the live run |
| Caveat phrase gate | ≥1 in all **8** files (2/2/4/7/2/1/1/1) |
| Three-part claim | present in all **5** records |
| `git diff --exit-code src/ scripts/ drizzle/` | clean after every mutation revert |
| `src/inngest/`, `src/lib/email.ts`, `src/lib/audit.ts` | byte-unchanged (`git diff --stat` empty) |
| `alert-digest.test.ts` across the whole task | exactly **2** changed lines (the one call site) |

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or trust-boundary schema change beyond the
column already registered in the plan's STRIDE table. `T-FH6-05` (a human name is new PII on a money-path
row) is disposition *accept, with guidance*, and the guidance landed in runbook §6: type the handle you are
willing to have sitting in an audit table.

## What this does NOT close

- **The identity is ASSERTED, NOT AUTHENTICATED.** The CLI has no session; anyone with `DATABASE_URL` can
  run it and type any name. `resolved_by` records who *claims* to have discharged a row. It is meaningful
  only alongside shell / database access control and the operator's own out-of-band record, and it is not
  proof of identity on its own. Nothing in this repository can make it proof — that needs an authenticated
  ops surface, which does not exist and was not in scope. `T-FH6-01` and `T-FH6-02` are *accept,
  documented*, and recording the gap beats implying it is closed.
- **The 27 historical discharges are unattributed FOREVER.** No backfill, ever, and not merely as a promise
  not to run an UPDATE — the guard makes retro-attribution impossible through the CLI too.
- **Still no ops UI.** This added a required flag to a command line, not a screen. Redress and review both
  still need shell + database access.
- **Still no un-discharge and no record of a reversal.** `resolved_at` is written once and never rewritten.
- **`T-08-74` and `AR-08-01` are untouched.** A discharger name is not a refund. An already-captured QRPh
  payment is exactly as unrefundable through the PayMongo API as it was before this column existed, and
  every overcharge on that rail still needs the manual out-of-band procedure in runbook §5.

## Commits

| Commit | What |
|---|---|
| `97aca41` | `test(quick-260811-fh6)` — ten RED anchors + the call-site sweep |
| `6450ecd` | `feat(quick-260811-fh6)` — migration 0025, the guarded write, the required `--by`, the `BY` column |
| `e4722eb` | `docs(quick-260811-fh6)` — five mutations, the live proof, five records narrowed |

## Self-Check: PASSED

All five created files exist on disk; all three commit hashes resolve in `git log`; all fifteen files in
the plan's `files_modified` appear in `git diff --stat 90668fc HEAD --name-only`. The working tree is clean
apart from this SUMMARY, which the orchestrator commits.
