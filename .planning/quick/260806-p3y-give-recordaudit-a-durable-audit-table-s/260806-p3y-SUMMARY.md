---
phase: quick-260806-p3y
plan: 01
subsystem: database
tags: [audit, postgres, drizzle, observability, money-seams, needs_attention, qrph]

requires:
  - phase: quick-260801-kv2
    provides: "drizzle.config.ts loading .env.local, so `npm run db:migrate` runs without hand-passed env"
provides:
  - "An `audit` table (drizzle/0024) with a partial index on unresolved needs_attention rows, newest first"
  - "recordAudit writing a durable row in addition to — never instead of — its console line"
  - "A never-throw proof covering sync throw, async rejection, undefined insert, and non-serializable meta"
  - "An operator-answerable question: 'what money is outstanding?' as one indexed query"
affects: [operator-tooling, payments, cancellation, webhook, future-ops-ui]

tech-stack:
  added: []
  patterns:
    - "Log-first, persist-second: the shipped observable behaviour is emitted before the new sink is touched"
    - "Best-effort durable write on a money path: awaited, body swallowed (same idiom as releaseCheckoutLease)"

key-files:
  created:
    - drizzle/0024_audit_table.sql
    - drizzle/meta/0024_snapshot.json
    - tests/security/audit-durable.test.ts
    - tests/security/audit-table.test.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/audit.ts
    - drizzle/meta/_journal.json

key-decisions:
  - "D1: the audit INSERT is awaited on the caller's path inside try/catch — not void'd, not Promise.race'd"
  - "D2: the console line is emitted before the INSERT, so a hung or failing DB can neither delay nor lose it"
  - "D3: outcome is text, not a pgEnum — a missing enum value would throw into the swallow and lose the durable row"
  - "D4: actor_id carries no FK — 8 of 57 call sites pass literal system/guest, including the QRPh alert"
  - "D5: resolved_at ships with an operator-hand-run UPDATE as its only v1 writer; retention deferred on the record"
  - "The console line's own JSON.stringify is guarded, so 'recordAudit cannot throw' is unconditionally true"

patterns-established:
  - "Guarded serialisation on a log line that sits on a money path: degrade to a minimal line, never propagate"
  - "Mutation measure in both directions (break the sink / break the ordering) to prove which test binds what"

requirements-completed: [WR-06-DURABLE, D-58]

duration: 27min
completed: 2026-08-06
---

# Quick 260806-p3y: Durable audit table behind recordAudit — Summary

**`recordAudit` now writes a queryable `audit` row alongside its unchanged console line, so the ~12 `needs_attention` money seams — failed auto-refunds, the QRPh unrefundable-rail manual-refund alert, `refund_after_payout`, stranded checkout sessions — are an operator queue instead of a log grep, with zero changes at all 57 call sites.**

## Performance

- **Duration:** ~27 min
- **Started:** 2026-08-06T11:26Z
- **Completed:** 2026-08-06T11:58Z
- **Tasks:** 3 of 3
- **Files modified:** 7 (2 under `src/`, 3 migration artifacts, 2 new test files)

## Accomplishments

### Task 1 — the table, via a GENERATED migration (`bd26c2e`)

`audit` was added to `src/lib/db/schema.ts` after `paymongoEvent`, with a docblock carrying all seven required items (the `audit.ts:8-14` tradeoff it closes, D-58, D4, D3, the column-level PII contract, D5, and the retention deferral). The migration was produced by `npx drizzle-kit generate --name audit_table` — not hand-authored — so `drizzle/meta/_journal.json` (idx 24) and `0024_snapshot.json` stayed consistent. A leading comment block in the 0023 style was added to the `.sql`.

The generator emitted the partial index correctly and unqualified, as the measured facts predicted:

```
CREATE INDEX "audit_needs_attention_idx" ON "audit" USING btree ("created_at" DESC NULLS LAST)
  WHERE outcome = 'needs_attention' AND resolved_at IS NULL;
```

`npm run db:migrate` applied it with no hand-passed env. The live index definition reads back as `... WHERE ((outcome = 'needs_attention'::text) AND (resolved_at IS NULL))`.

### Task 2 — the durable sink and the never-throw proof (`53e940f` RED → `88a5238` GREEN)

`tests/security/audit-durable.test.ts` was written first and run first. **Observed RED: 7 failed / 3 passed** — the 3 that passed assert only the console line, which already worked; every durable-sink, ordering and non-serializable-meta assertion failed.

`src/lib/audit.ts` then got the contracted body: build `line` unchanged → emit the console line → `try { await db.insert(audit).values(...) } catch {}`. `createdAt` is deliberately not passed. The header's v1-tradeoff paragraph was rewritten in the past tense to record that the stable shape and `async` signature did in fact carry the swap.

The plan-review addition landed too: `JSON.stringify(line)` is now guarded, degrading to a minimal `{ts, actorId, action, outcome, meta: "[unserializable]"}` line rather than throwing out of a function 57 money-path callers await inside `catch` blocks. Two tests drive it — a circular object and a `BigInt`, which are the two distinct ways `JSON.stringify` throws.

### Task 3 — the integration proof (`a527743`)

`tests/security/audit-table.test.ts` runs the real `recordAudit` against a real migrated isolated schema. All five assertions from the plan are covered, including the one that matters most for D4: `"system"` and `"guest"` insert successfully with no `user` row of that id present.

## Verification Results

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npx vitest run` | **1138 passed / 4 skipped / 0 failed** (baseline 1123 + 15 new = 1138, exactly) |
| `tests/security/audit.test.ts` unmodified | confirmed — `git diff 4015c74 -- tests/security/audit.test.ts` is empty, and it passes green |
| `grep -rho 'await recordAudit(' src/ --include=*.ts \| wc -l` | **57** |
| `git diff --name-only 4015c74 HEAD -- src/` | exactly `src/lib/audit.ts` + `src/lib/db/schema.ts` |
| `npx drizzle-kit generate` re-run | "No schema changes" — schema.ts and 0024 in sync |
| journal idx 24 | `"tag": "0024_audit_table"` present, `0024_snapshot.json` present |
| live index predicate | contains both `outcome = 'needs_attention'` and `resolved_at IS NULL` |

`tests/security/audit.test.ts` is now a free never-throw witness exactly as the plan predicted: its db mock is `{ update: … }` with no `insert`, so `db.insert(...)` raises a TypeError on every call, and all three of its cases still pass unmodified.

## Mutation Measure — four observed results

Run in both directions, restored by **editing the code back**, never via git. Restore was then verified with `git diff --stat -- src/lib/audit.ts`, which came back empty (byte-identical to the committed version).

| Mutation | `audit-table.test.ts` | `audit-durable.test.ts` |
|----------|----------------------|-------------------------|
| **A — `await db.insert(...)` commented out** (console line + try/catch intact) | **RED: 4 failed / 1 passed** | **RED: 5 failed / 5 passed** ⚠️ diverges from prediction |
| **B — console line moved AFTER the try/catch** | **GREEN: 5 passed** | **RED: 2 failed / 8 passed** — exactly the two D2 ordering cases |

**Divergence, flagged rather than papered over.** The plan predicted `audit-durable.test.ts` would **stay green** under Mutation A ("a no-op sink still never throws and still logs"). It did not — 5 of its 10 cases went red. The prediction was right about the property and wrong about the file's coverage: the file as written asserts more than never-throw. The 5 that went red are the ones that bind the sink actually firing (happy path, meta-omitted, rejected-promise, and both ordering cases, which assert `db.insert` was called). The 5 that **stayed green** are precisely the never-throw proofs — sync throw, undefined insert, circular meta, BigInt meta, and the caller-level `activateHosting` case. So the plan's underlying claim held exactly: a dead sink changes nothing a caller can observe. I did not weaken the tests to match the prediction.

Under Mutation A the one green case in `audit-table.test.ts` is the `pg_indexes` check, which does not depend on `recordAudit` writing anything — correct, and worth noting so the file's 4/5 red is not read as 5/5.

Mutation B behaved exactly as predicted, and usefully in both directions: the ordering is invisible to the database (`audit-table` fully green), so the *only* thing binding D2 is `audit-durable`'s two ordering cases. That is the coverage the ordering decision depends on.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `1n` BigInt literal rejected by the TS target**

- **Found during:** Task 2, at the `npx tsc --noEmit` gate (vitest was already green — this was compile-only)
- **Issue:** `meta: { amount: 1n }` in the new test failed with `TS2737: BigInt literals are not available when targeting lower than ES2020`
- **Fix:** switched to `BigInt(1)`, which produces the identical runtime value and the identical `JSON.stringify` throw. Comment added so the next person does not "simplify" it back
- **Files modified:** `tests/security/audit-durable.test.ts`
- **Commit:** `53e940f`

**2. [Observation, not a code change] Raw `db.execute` does not return `Date` for `timestamptz`**

- **Found during:** Task 3, first run of the integration test
- **Issue:** I asserted `created_at` was `instanceof Date` off a raw `db.execute` row and it came back as the Postgres text form, `'2026-08-06 11:43:39.647571+00'`. Drizzle's raw `execute` path does not run the column type parsers; the typed `db.select().from(audit)` path does
- **Fix:** the **assertion** was wrong, not the code — nothing in `src/` changed. The test now asserts the `Date` round-trip through the typed `select()` (a stronger claim: it proves the column really is `timestamptz`) and keeps the raw-row NULL check alongside it. The `AuditRow` type was corrected to `string` with a note explaining why
- **Files modified:** `tests/security/audit-table.test.ts`
- **Commit:** `a527743`

### Not done, deliberately

- **T-P3Y-04 (an INSERT that HANGS) was not fixed**, per the plan's explicit instruction. It remains an accepted, on-the-record risk: `src/lib/db/index.ts` has no `connect_timeout` or statement timeout, and postgres.js queues under pool exhaustion rather than rejecting. No `Promise.race` was added. The correct fix is pool-level and project-wide.
- **`resolved_at` has no code writer in v1** — an operator hand-runs the `UPDATE`. Disclosed in the schema docblock, not shipped silently.

## Known Stubs

None. `resolved_at` is not a stub — it is a column with a documented human writer and no UI, which is the complete v1 workflow per D5.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or trust-boundary schema change beyond the `audit` table the threat model already covers. No package installs (T-P3Y-SC not applicable).

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| `bd26c2e` | feat | audit table + generated migration 0024 (journal idx 24, snapshot) |
| `53e940f` | test | never-throw proof (RED: 7 failed / 3 passed before implementation) |
| `88a5238` | feat | durable sink in recordAudit — log first, swallowed INSERT second |
| `a527743` | test | integration proof against a real migrated schema |

## Notes for Future Phases

- The operator queue is now a query, and it is the one the index was built for:
  `SELECT * FROM audit WHERE outcome = 'needs_attention' AND resolved_at IS NULL ORDER BY created_at DESC`.
  Resolving is `UPDATE audit SET resolved_at = now() WHERE id = …`. When an ops UI eventually lands, it should drive exactly these two statements — nothing else should write `resolved_at`.
- The console `ts` and the row's `created_at` differ by the insert latency, by design. The DB clock is authoritative; the console `ts` is unchanged from what it has always been, which is what "byte-identical console line" required.
- If a future call site ever passes a non-primitive `meta`, it will now silently degrade to `"[unserializable]"` in the log rather than crashing the caller — but the durable row would also fail to insert and be swallowed. That combination is the one place where a bad `meta` loses the durable half quietly; the log line survives.
- Retention is deferred on the record. When it becomes worth addressing, the schema docblock names partitioning or archival as the correct first move, and rules out a scheduled DELETE.

## Self-Check: PASSED

- `src/lib/db/schema.ts` — FOUND (contains `pgTable("audit"`)
- `drizzle/0024_audit_table.sql` — FOUND (contains `CREATE TABLE "audit"`)
- `drizzle/meta/_journal.json` — FOUND (contains `0024_audit_table`)
- `drizzle/meta/0024_snapshot.json` — FOUND
- `src/lib/audit.ts` — FOUND (contains `insert(audit)` and `from "@/lib/db"`)
- `tests/security/audit-durable.test.ts` — FOUND (300 lines)
- `tests/security/audit-table.test.ts` — FOUND (183 lines)
- Commits `bd26c2e`, `53e940f`, `88a5238`, `a527743` — all FOUND in `git log`
