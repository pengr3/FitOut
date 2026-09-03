---
phase: quick-260811-dj4
plan: 01
subsystem: ops
tags: [ops-cli, audit, money-path, pii-boundary, tdd, mutation-testing]
requires:
  - "src/lib/ops/alerts.ts (listUnresolvedAlerts, resolveAlert — the D5 queue and its resolved_at writer)"
  - "scripts/ops-alerts.ts (the list/resolve CLI)"
  - "audit.resolved_at (drizzle/0024_audit_table.sql — no change made)"
provides:
  - "listResolvedAlerts + ResolvedAlert + DEFAULT_HISTORY_DAYS + DEFAULT_HISTORY_LIMIT"
  - "npm run ops:alerts:history [-- <days>] — the discharge review surface"
  - "NEEDS-ATTENTION-RUNBOOK §6a — how to review what was discharged"
affects:
  - ".planning/quick/260810-j3z-.../deferred-items.md (D2 → CLOSED)"
  - ".planning/quick/260810-j3z-.../260810-j3z-VERIFICATION.md (Amendment → closure)"
  - ".planning/v1.0-MILESTONE-AUDIT.md item 5 (gap → closed; item itself stays OPEN)"
tech-stack:
  added: []
  patterns:
    - "Single-key jsonb projection (meta->>'error') as a scoped alternative to selecting the column"
    - "Bind parameter for caller-controlled predicate values, deliberately NOT the j3z SQL-literal form"
    - "LIMIT + 1 honest-truncation idiom (inherited from the digest)"
key-files:
  created: []
  modified:
    - "src/lib/ops/alerts.ts"
    - "scripts/ops-alerts.ts"
    - "package.json"
    - "tests/ops/alerts.test.ts"
    - ".planning/ops/NEEDS-ATTENTION-RUNBOOK.md"
    - ".planning/quick/260810-j3z-make-unresolved-needs-attention-money-al/deferred-items.md"
    - ".planning/quick/260810-j3z-make-unresolved-needs-attention-money-al/260810-j3z-VERIFICATION.md"
    - ".planning/v1.0-MILESTONE-AUDIT.md"
decisions:
  - "D-DJ4-01: history is UNSCOPED by outcome, mirroring resolveAlert — a scoped read side would hide discharges no other surface shows"
  - "D-DJ4-04: ONE derived key meta->>'error'; the column is never selected and ResolvedAlert has no meta field"
  - "D-DJ4-05: no ACTOR column — actor_id is the ORIGINAL event's actor and there is no resolved_by"
  - "D-DJ4-06: no index, no migration; Seq Scan accepted, the fixing index would grow without bound"
  - "D-DJ4-07: days is a BIND PARAMETER — the j3z literal trick is deliberately NOT copied"
metrics:
  duration_minutes: 42
  completed: 2026-08-11
  tasks: 3
  commits: 4
  tests_added: 6
  suite: "1184 passed / 4 skipped / 0 failed"
---

# Quick Task 260811-dj4: Resolved-History Review for the Ops Alerts CLI Summary

`npm run ops:alerts:history` gives `resolved_at` a read side — discharged alerts newest-discharge-first with
`outcome`, both timestamps, hours HELD and the error string — closing **D2**, the review/write asymmetry an
operator found by hand at a verification checkpoint.

## What shipped

**`listResolvedAlerts`** (`src/lib/ops/alerts.ts`, additive) selects six explicit columns plus one derived
`meta->>'error'`, over
`resolved_at IS NOT NULL AND resolved_at >= now() - make_interval(days => $1::int)`, ordered
`resolved_at DESC, created_at DESC`, limited. Plus `ResolvedAlert`, `DEFAULT_HISTORY_DAYS = 30`,
`DEFAULT_HISTORY_LIMIT = 200`.

**`npm run ops:alerts:history [-- <days>]`** renders it without an ACTOR column, with a `HELD` column (whole
hours the money sat outstanding before somebody discharged it) and the error string last.

**Runbook §6a** is the operator procedure; §3, §7, §8 and three external records were widened to match.

## The live run — the question that forced hand-written psql, answered by one command

`npm run ops:alerts:history` against the dev database (exit 0, 27 rows, first and last shown):

```
AUDIT ID                              OUTCOME          ACTION                        CREATED (UTC)         RESOLVED (UTC)        HELD   ERROR
-------------------------------------------------------------------------------------------------------------------------------------------------
440879be-2cf1-450f-be9c-a264ec65200b  needs_attention  guest-email                   2026-08-10T06:39:25Z  2026-08-10T07:32:34Z  0h     resend 503
95683604-74b9-4382-9876-42d9151e7cfe  needs_attention  notify                        2026-08-10T06:38:55Z  2026-08-10T07:32:31Z  0h     resend 503
…
304e058f-3948-4bd1-b23e-7da73b3dc249  needs_attention  guest-email                   2026-08-06T11:58:25Z  2026-08-10T07:31:20Z  91h    resend 503
09a9adbf-14f6-401b-aea1-681d99344325  needs_attention  notify                        2026-08-06T11:57:42Z  2026-08-10T07:31:15Z  91h    resend 503

27 discharged alert(s) in the last 30 day(s). Full row incl. meta: npm run db:studio, or psql (runbook §3).
```

**This is the exact check the operator could not perform at the `260810-km4` checkpoint.** Asked to confirm
27 discharged rows had genuinely been test noise, they had to hand-write
`psql -c "SELECT id, action, created_at, meta->>'error' AS err FROM audit WHERE …"`. That is now one command,
and it shows the discriminator (`resend 503`) directly. It also shows the batch discharged contiguously
inside a 79-second window on 2026-08-10 — visible *because* the sort is on `resolved_at`, which is D-DJ4-02's
whole argument made concrete.

| Invocation | Result | Exit |
|---|---|---|
| `npm run ops:alerts:history` | 27 rows, 30-day window | 0 |
| `npm run ops:alerts:history -- 1` | 27 rows | 0 |
| `npm run ops:alerts:history -- 365` | 27 rows | 0 |
| `npm run ops:alerts:history -- 0` | `history needs a whole number of days between 1 and 36500 (got: 0).` + USAGE | **1** |
| `npm run ops:alerts:history -- abc` | same, `(got: abc)` | **1** |
| `npm run ops:alerts:history -- -5` | same, `(got: -5)` | **1** |
| `npm run ops:alerts` | `No unresolved needs_attention alerts.` — behaviour unchanged | 0 |

**`-- 1` returning all 27 is correct, not a window bug**, and it was checked rather than assumed: the DB
clock reported `now() = 2026-08-11 02:15:46Z` and `18:43:12` since the newest discharge, so the entire batch
falls inside a 24-hour window. Recorded because "the narrow window returned everything" is exactly the shape
of a broken predicate, and the reason it isn't one is external to the output.

**The empty-result branch is not reachable on the dev dataset** (every discharge is inside even the 1-day
window), so it was exercised against the truncated `fitout_test` database instead:
`No alerts discharged in the last 30 day(s).`, exit **0**.

**Read-only (D-DJ4-08), measured not asserted:** `count(*) = 27`, `count(resolved_at) = 27`,
`max(resolved_at) = 2026-08-10 07:32:34.529106+00` — byte-identical before and after a history run.

## The seven mutations

All applied to `src/`, re-run, recorded verbatim in the test-file header, reverted, `git diff` clean.

| # | Mutation | Result |
|---|---|---|
| H1 | delete the window bound | case 10 RED |
| H2 | delete the entire `.where()` | cases 8 + 10 RED |
| **H2b** | delete only `resolved_at IS NOT NULL` | **GREEN — predicted, observed, kept** |
| H3 | `resolved_at DESC` → `ASC` | case 9 RED |
| H3b | drop the `, created_at DESC` tie-break | case 9's tie assertion RED |
| H4 | add `meta` to the select and the type | case 12 RED, digest file fully GREEN |
| H5 | `error` projection → `NULL` | case 12's `'resend 503'` RED |

**H2b is the one worth reading.** `NULL >= x` is NULL, so the window already excludes unresolved rows and
the explicit `IS NOT NULL` is logically redundant *today*. It was run anyway and reported as observed rather
than dropped (09-23 M2a precedent): the clause is **intent** — the declared definition of the set, and the
half that survives if the window is ever made optional — while the window is the **enforcement**. Case 8's
teeth come from H2, which removes the enforcement and reddens it.

**H4 is the one that matters for PII.** Widening the history row reddened case 12 while `alerts.test.ts`
case 7 and the entire `alert-digest.test.ts` file stayed green — which is what proves case 12 has its own
teeth instead of riding on the existing email guards.

## The PII contract is still structural

`ResolvedAlert` is a **separate type** with `error: string | null` and **no `meta` field**; the column is
never selected (`grep -c "meta: audit.meta"` = 0). `UnresolvedAlert`, `listUnresolvedAlerts`, `resolveAlert`
and `list()` are **byte-unchanged** (verified by diffing each function body against `8657c33`);
`src/inngest/` and `alert-digest.test.ts` are untouched. Re-exporting `meta` remains a compile error.

The single-key widening is justified on **content and structure** — `error` holds an exception message
(written at exactly two call sites, both `args.error?.message ?? "unknown error"`), while identifiers live
under separately-named keys a single-key projection cannot reach. The docblock **explicitly refuses** the
"the runner already has `DATABASE_URL`" argument as the operative justification, labelling it context only:
it proves too much, since it would equally justify exposing `bookingId` or the whole column. A future
widening must be argued on content and structure, not on that.

## Deviations from plan

**1. [Rule 1 — plan gate mis-specified] The `r.actorId` grep gate cannot be 0.**
The plan's gate `grep -v '^//' scripts/ops-alerts.ts | grep -c 'r.actorId'` expects **0**. It returns **1**,
and returned **1 at base commit `8657c33` too** — the occurrence is `pad(r.actorId, 22)` in the pre-existing
`list()` render, where an ACTOR column is correct and must stay. The gate's *intent* (no ACTOR in the
**history** render) was verified with a corrected form scoped to the function body with comments stripped:
**0**. `list()` was additionally proven byte-unchanged. No code changed as a result; the gate was wrong, not
the implementation.

**2. [Rule 1 — prediction wrong, recorded not reconciled] The Task 1 RED was per-case, not module-level.**
The plan expected the whole file to fail to import. Vite resolves a missing named export to `undefined`
instead of throwing, so the file loaded, the nine existing cases passed, and the six new ones failed
individually — four on `TypeError: listResolvedAlerts is not a function`, and cases 10/11 *earlier* on their
constant assertions (`expected undefined to be 30` / `200`). Recorded verbatim with the mispredicton noted.

**3. [cosmetic] Table header rendered as padded column cells**, not the literal
`AUDIT ID · OUTCOME · …` string in the plan. The column *names* are exactly as specified; the `·` form reads
as prose describing column order (the runbook uses the same style for the digest), and an unaligned header
over a padded table is a readability defect. Matches the existing `list()` idiom.

**4. [housekeeping] A fourth commit (`fca62c3`)** fills in the three closure SHAs in `deferred-items.md`,
which could not be written inside the commit that created one of them.

## What this does NOT close — stated in all four records

- **No `resolved_by`.** History shows what, when, how long HELD, and on what error — **not by whom**. No
  tooling over the current schema can; the column does not exist.
- **No ops UI.** A third CLI verb, not a screen. Review still needs shell + database access.
- **Full `meta` is still psql-only.** One key is surfaced, deliberately.
- **No un-discharge, no reversal record.**
- **Accepted Seq Scan** (D-DJ4-06). The fixing index needs a forbidden migration *and* would grow without
  bound (`schema.ts:346-354`) — it belongs with the deferred retention decision. `drizzle/` still ends at
  `0024_audit_table.sql`; **no index was added and none was needed** at 27 rows.
- **T-08-74 remains OPEN and AR-08-01 stands.** A review surface is not a refund; the QRPh rail is unchanged.

## Verification

| Gate | Result |
|---|---|
| `npx vitest run` | **1184 passed / 4 skipped / 0 failed** (1178 baseline + exactly 6) |
| `npx vitest run tests/ops` | 23 passed (2 files) |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | **0 errors**, 9 warnings — all pre-existing, none in a file this task touched |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0024_audit_table.sql` |
| `git status --porcelain drizzle/ src/lib/db/schema.ts` | empty |
| wiring grep | `WIRED` |
| `meta: audit.meta` in `src/lib/ops/alerts.ts` | 0 |
| `actorId` in the history render | 0 |

**Lint baseline note:** the 9 warnings exceed the 7 recorded at 09-23. All 9 are in
`src/app/(auth)/signup/page.tsx`, `src/app/(host)/host/listings/[id]/edit/wizard.tsx`,
`tests/helpers/mocks.ts` and `tests/security/audit-durable.test.ts` — none touched here. The baseline
drifted in earlier tasks; this task added none.

## Commits

| Hash | Message |
|---|---|
| `763c31d` | `test(quick-260811-dj4): six RED anchors for resolved-history review, recorded verbatim` |
| `eb1ddb1` | `feat(quick-260811-dj4): resolved-alert history over the same module` |
| `e358c41` | `feat(quick-260811-dj4): ops:alerts:history verb + runbook review path; D2 closed` |
| `fca62c3` | `docs(quick-260811-dj4): fill in the three D2 closure commit SHAs` |

## Self-Check: PASSED

All 7 claimed files exist; all 4 commits resolve in `git log`; all 4 named exports are present in
`src/lib/ops/alerts.ts`; runbook `## 6a.` exists; D2 reads `STATUS: CLOSED (2026-08-11`.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change. The one new trust-boundary
crossing (`meta->>'error'` → operator terminal) is T-DJ4-01 in the plan's register, disposition
*mitigate + accept residual*, implemented as specified and recorded in runbook §3 and §6a.
