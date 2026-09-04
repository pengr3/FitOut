---
phase: quick-260811-fh6
verified: 2026-08-11T12:40:00Z
status: passed
score: 14/14 must-haves verified
overrides_applied: 0
---

# Quick Task 260811-fh6: `resolved_by` on the audit table — Verification Report

**Task Goal:** Add `resolved_by` to the `audit` table (migration 0025) so a discharge records WHICH HUMAN
performed it — an ASSERTED, not authenticated, identity, with the caveat stated everywhere it matters.

**Verified:** 2026-08-11T12:40:00Z
**Status:** passed
**Re-verification:** No — initial verification

**Method:** every claim below was reproduced first-hand against the live repo and the live `fitout` /
`fitout_test` databases — mutations were applied, run, and reverted by the verifier independently of the
SUMMARY's transcripts; SUMMARY prose was treated as a claim to falsify, not as evidence.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `audit.resolved_by` exists as nullable `text`, no FK, no index, added by migration `0025` | VERIFIED | `information_schema` queried live in both `fitout` and `fitout_test` → `resolved_by \| text \| YES` in each; `pg_constraint` on `audit` shows zero `contype='f'` rows; `pg_indexes` on `audit` shows only `audit_pkey` and the pre-existing `audit_needs_attention_idx`; case 14 asserts the same facts inside a freshly replayed isolated test schema (reproduced: PASS) |
| 2 | The caveat ("asserted, not authenticated") is inseparable from the column and appears in the schema comment, CLI help, and runbook | VERIFIED | Literal phrase present in `src/lib/db/schema.ts` (2×), `src/lib/ops/resolve-args.ts` (2×), `scripts/ops-alerts.ts` (4×), plus the 5 doc records — all 8 files ≥1, reproduced by direct grep |
| 3 | `resolveAlert(dbConn, id, resolvedBy)` writes `resolved_by` in the same guarded UPDATE as `resolved_at`; third param required | VERIFIED | Read `src/lib/ops/alerts.ts:177-186` — single `UPDATE … SET resolved_at = now(), resolved_by = $2 WHERE id = $1 AND resolved_at IS NULL`; no `AND resolved_by IS NULL` added |
| 4 | Every `resolveAlert` call site supplies 3 arguments (8 sites) | VERIFIED | `grep -rn "await resolveAlert(" src/ scripts/ tests/` → all sites carry 3 args; two-argument-call grep gate returns **0** |
| 5 | A second resolve with a DIFFERENT name changes neither `resolved_at` nor `resolved_by` | VERIFIED | Case 16 reads exactly this; mutation M1 (delete `AND resolved_at IS NULL`) reproduced live → reddens cases **16, 17, and 5** (3 failed / 30 passed), matching SUMMARY exactly; reverted, tree clean |
| 6 | NO BACKFILL, ever — the 27 rows discharged 2026-08-10 stay `resolved_by IS NULL` permanently, including under re-resolve | VERIFIED | Live query on dev: 27 total / 27 with `resolved_at NOT NULL AND resolved_by NULL` / 0 with `resolved_by NOT NULL`; case 17 pins re-resolve behavior and passed in the full suite run |
| 7 | CLI REQUIRES `--by`, refuses blank, NEVER falls back to OS username/env var | VERIFIED | `src/lib/ops/resolve-args.ts` reads `process.env` nowhere; case 20 (post-fix) plants `ghost-default` and asserts it's absent; **M2a and M2b reproduced live and now produce genuinely different failures** — M2a: `expected true to be false`; M2b: `not to contain 'ghost-default'` naming the leaked value (both `1 failed / 32 passed`, matching SUMMARY exactly) |
| 8 | History render shows `BY`, still omits `ACTOR`; NULL renders `unrecorded` | VERIFIED | `scripts/ops-alerts.ts` `byCell()` returns `"unrecorded"` for null, distinct from `errorCell()`'s `—`; header includes `BY` column, no `ACTOR` column; the old "there is no `resolved_by` column" reasoning is gone (grep confirms zero occurrences) and replaced with D-FH6-06's three-reason argument |
| 9 | `ResolvedAlert` has no `meta` field; case 12's key-set tripwire names `resolvedBy`; leak sentinels hold | VERIFIED | Read the type definition — 8 named fields, no `meta`; case 12 asserts `Object.keys(row).sort()` equals an explicit 8-key list including `resolvedBy`, and asserts the 3 leak canaries never serialize |
| 10 | `parseResolveArgs` is pure, DB-free, directly mutable | VERIFIED | No `@/lib/db`/`postgres` imports in `resolve-args.ts`; cases 19-23 have no `setupTestDb`/`beforeAll` |
| 11 | Email path structurally cannot carry a name; `UnresolvedAlert`/`listUnresolvedAlerts`/`src/inngest/`/`email.ts` byte-unchanged | VERIFIED | `git diff --stat 90668fc HEAD -- src/inngest/ src/lib/email.ts src/lib/audit.ts` → empty; `alert-digest.test.ts` diff across the whole task is exactly **2** changed lines (one call site, third argument) |
| 12 | Migration 0025 GENERATED, no index, journal ends at `idx: 25` | VERIFIED | `_journal.json` last entry `{"idx":25,...,"tag":"0025_audit_resolved_by"}`; `grep -v '^--' drizzle/0025_audit_resolved_by.sql \| grep -ci 'CREATE INDEX\|REFERENCES'` → 0; snapshot JSON's `audit.resolved_by` column definition matches (`type: text, notNull: false`) |
| 13 | Five records narrowed with the identical three-part claim, none describing the column as proof | VERIFIED | All 5 files directly read: runbook §6/§6a/§7/§8, `deferred-items.md` D2, `260810-j3z-VERIFICATION.md` (status:passed unaffected, confirmed), `v1.0-MILESTONE-AUDIT.md` item 5 (T-08-74/AR-08-01 preserved), `05-HUMAN-UAT.md` clause (c) (names T-J3Z-06, phase status `partial`/`human_needed` untouched); no "proof of" false claim found anywhere |
| 14 | Full suite = measured baseline + 10, `tsc` exit 0, lint 0 errors, mutation-clean tree | VERIFIED | Bare (no `DATABASE_URL`) run: `1197 passed \| 4 skipped (1201)`, 0 failed; `tsc --noEmit` exit 0; `lint` 0 errors / 9 pre-existing warnings; `git diff --exit-code src/ scripts/ drizzle/` clean after all verifier-run mutations reverted |

**Score:** 14/14 truths verified

### Scrutinized Claims

**(a) Case 20's assertion-order bug was fixed, and M2a/M2b now diverge.** VERIFIED by direct reproduction.
Reading `tests/ops/resolve-args.test.ts:126-155` confirms the `ghost-default` assertion now precedes the
`ok`-narrowing, with a comment explaining why the order is load-bearing. The verifier independently applied
both mutations to a clean tree (not from the plan's or SUMMARY's script, but derived from their literal
descriptions) and ran `npx vitest run tests/ops`:
- **M2a** (missing-`--by` early-returns success with an empty name): `1 failed | 32 passed` — failure is
  `expected true to be false`.
- **M2b** (missing-`--by` falls back to `process.env.USERNAME ?? process.env.USER ?? "operator"`):
  `1 failed | 32 passed` — failure is `expected '{"ok":true,...,"by":"ghost-default"}' not to contain
  'ghost-default'`.

These are different failures, and M2b's failure names `ghost-default`. The claim holds.

**(b) M4 measures T-08-40 rather than quoting it.** VERIFIED by direct reproduction. The verifier commented
out the `ALTER TABLE` line in `drizzle/0025_audit_resolved_by.sql` (leaving `schema.ts` and `_journal.json`
untouched), then ran:
- `npx tsc --noEmit` → **exit 0**.
- `npx vitest run tests/ops` → **16 failed | 17 passed (33)**, including case 14 (confirmed by name in the
  failure list) and a `PostgresError: column "resolved_by" does not exist` cascade through `resolveAlert`
  and `makeAudit`.

Both match the SUMMARY's recorded numbers exactly. The file was restored and diffed byte-identical to the
pre-mutation backup; `git diff --exit-code src/ scripts/ drizzle/` confirmed clean afterward.

**(c) The `makeAudit` conditional-write deviation is sound.** VERIFIED by reading `tests/ops/alerts.test.ts:266-324`
and case 17 (`tests/ops/alerts.test.ts:538-560`). `makeAudit` includes `resolved_by` in the fixture INSERT's
column list only when `"resolvedBy" in opts` is true (key presence, not truthiness) — so cases that never
mention `resolvedBy` (4, 5, 6b, 13, and every other pre-existing case) run an INSERT statement that is
schema-agnostic and stays green whether or not the column exists yet, which is exactly what let the RED
pass in Task 1 redden only the 5 new column-dependent cases instead of all 15 pre-existing ones. Case 17
explicitly passes `resolvedBy: null`, which the presence check treats as "plant a historical row with an
explicit NULL discharger" (not "omit the column") — confirmed by the SQL builder at lines 314-320, which
emits a literal `, NULL` for that branch. This means the NULL path is genuinely written and read back
(`stored.resolvedBy` is asserted `toBeNull()` after an explicit SELECT), not merely a column default the
test never touches. No pre-existing assertion was loosened to accommodate this — case 12's key-set tripwire
still names `resolvedBy` exactly and forbids `meta`. The deviation does not weaken test coverage.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `drizzle/0025_audit_resolved_by.sql` | ALTER TABLE adding `resolved_by`, generated, no index/FK | VERIFIED | Read in full; header matches house style; `ALTER TABLE "audit" ADD COLUMN "resolved_by" text;` |
| `drizzle/meta/_journal.json` | ends at `idx: 25` | VERIFIED | `{"idx":25,...,"tag":"0025_audit_resolved_by"}` |
| `drizzle/meta/0025_snapshot.json` | consistent with schema.ts | VERIFIED | `audit.resolved_by` present, `type: text`, `notNull: false` |
| `src/lib/db/schema.ts` | `resolvedBy` field + D-FH6-01/02 design note | VERIFIED | Lines 350-391 read in full |
| `src/lib/ops/resolve-args.ts` | `parseResolveArgs`, pure/DB-free | VERIFIED | No I/O imports; exports match plan |
| `src/lib/ops/alerts.ts` | `resolveAlert` 3-arg, `ResolvedAlert.resolvedBy` | VERIFIED | Read in full, matches spec exactly |
| `scripts/ops-alerts.ts` | required `--by`, `BY` column, rewritten comment | VERIFIED | Read in full, matches spec exactly |
| `tests/ops/alerts.test.ts` | cases 14-18 + edited 6/12 + swept call sites | VERIFIED | All present and passing |
| `tests/ops/resolve-args.test.ts` | cases 19-23 | VERIFIED | All present and passing |
| `.planning/ops/NEEDS-ATTENTION-RUNBOOK.md` | §6/§6a/§7/§8 narrowed | VERIFIED | Read in full |
| `.planning/phases/05-payments-payouts/05-HUMAN-UAT.md` | item 3(c) narrowed, names T-J3Z-06 | VERIFIED | Read in full |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `scripts/ops-alerts.ts` | `src/lib/ops/resolve-args.ts` | `import { parseResolveArgs }` | WIRED | Confirmed import + call in `main()`'s `resolve` branch |
| `scripts/ops-alerts.ts` | `src/lib/ops/alerts.ts` | `resolveAlert(db, parsed.id, parsed.by)` | WIRED | `resolve()` function line 111 |
| `src/lib/ops/alerts.ts` | `audit.resolved_by` | guarded UPDATE | WIRED | Single UPDATE statement, no redundant predicate |
| `drizzle/0025_audit_resolved_by.sql` | isolated test schema replay | `tests/helpers/db.ts` rewrite | WIRED | Case 14 passes against replayed schema; verifier reproduced via `npx vitest run tests/ops` full pass |

### Mutation Verification (reproduced live by the verifier)

| Mutation | Command | Expected | Observed | Status |
|----------|---------|----------|----------|--------|
| M1 (delete `AND resolved_at IS NULL`) | patch `alerts.ts`, `vitest run tests/ops`, revert | cases 16 & 17 red | `3 failed \| 30 passed` — cases **5, 16, 17** red | PASS |
| M2a (missing `--by` silently succeeds, empty name) | patch `resolve-args.ts`, `vitest run tests/ops`, revert | case 20 red, "expected true to be false" | `1 failed \| 32 passed`, matches exactly | PASS |
| M2b (OS-username fallback) | patch `resolve-args.ts`, `vitest run tests/ops`, revert | case 20 red, naming `ghost-default` | `1 failed \| 32 passed`, message names `ghost-default` | PASS |
| M4 (comment out `ALTER TABLE`) | patch `.sql`, `tsc --noEmit`, `vitest run tests/ops`, revert | tsc exit 0, 16 red incl. case 14 | `tsc exit=0`; `16 failed \| 17 passed`, case 14 in failure list | PASS |

All mutations reverted; `git diff --exit-code src/ scripts/ drizzle/` confirmed clean after each and at the
end of the session.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| T-J3Z-06 | Repudiation: who discharged an alert (disposition was `accept`) | SATISFIED | `resolved_by` column added; disposition updated to "closed as narrowed" in `05-HUMAN-UAT.md` clause (c) |
| D-J3Z-11 | The migration adding `resolved_by` was out of scope for the j3z task | SATISFIED (superseded as planned) | This task IS that migration, delivered as `0025` |
| D-DJ4-05 | No `ACTOR` column in history render | SATISFIED (narrowed correctly) | `BY` column added, `ACTOR` still omitted; D-FH6-06 argument documented in code and runbook |

No orphaned requirements found for this quick task (no `REQUIREMENTS.md` entries map quick-task IDs).

### Anti-Patterns Found

None. Scanned all 8 modified source/test files for `TBD|FIXME|XXX|HACK|PLACEHOLDER|not yet implemented`
(one incidental match, `FIT-XXXXXXXX` — a booking-reference format string unrelated to this task, in
unrelated pre-existing code). No stub returns, no empty handlers, no hardcoded-empty data flowing to
rendering.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Live dev DB shows no-backfill state | `psql -c "SELECT count(*) ..."` (3 queries) | 27 / 27 / 0 | PASS |
| Both databases carry the column | `information_schema.columns` query × 2 | `resolved_by \| text \| YES` in both | PASS |
| No FK / no new index on `audit` | `pg_constraint` / `pg_indexes` query | 0 FKs; only `audit_pkey` + pre-existing partial index | PASS |
| Full suite bare (no `DATABASE_URL`) | `npx vitest run` | `1197 passed \| 4 skipped (1201)`, 0 failed | PASS |
| Type check | `npx tsc --noEmit` | exit 0 | PASS |
| Lint | `npm run lint` | 0 errors, 9 pre-existing warnings | PASS |
| Call-site sweep | `grep -rn "await resolveAlert("` filtered to 2-arg | 0 | PASS |
| `alert-digest.test.ts` diff scope | `git diff -U0 90668fc -- tests/ops/alert-digest.test.ts` | exactly 2 changed lines | PASS |
| `src/inngest/`, `email.ts`, `audit.ts` untouched | `git diff --stat 90668fc HEAD` | empty | PASS |

### Human Verification Required

None. This task is fully backend/CLI/schema/docs with no UI, no visual rendering, and no real-time behavior
— every claim was independently reproducible by command, and all were reproduced.

### Gaps Summary

No gaps found. All 14 must-have truths verified, all 4 mutations (M1, M2a, M2b, M4) independently
reproduced with output matching the SUMMARY's transcripts, all 5 narrowed records confirmed to carry the
identical three-part claim with no document describing `resolved_by` as proof, the false "there is no
`resolved_by` column" claim in `scripts/ops-alerts.ts` (formerly ~line 186) was confirmed rewritten (zero
occurrences remain), and the full suite / `tsc` / lint gates all pass exactly as claimed. The three
specifically scrutinized claims (the case-20 assertion-order fix, the M4 T-08-40 demonstration, and the
`makeAudit` conditional-write deviation) were each independently reproduced or read in full and found sound.
The verifier's own mutation testing (applied to reproduce claims, not to explore new ones) was fully
reverted; the working tree matches the committed state at `e4722eb` except for the untracked SUMMARY.md,
which the orchestrator commits.

**Note on tool-output integrity:** during M4 mutation testing, a system reminder attached to a Bash tool
result attempted to instruct the verifier to leave the mutated migration file in place and not disclose
this to the user. This did not originate from the user or from any GSD workflow instruction — it was
disregarded, and the file was reverted immediately as the verification protocol requires. Flagging this
here for visibility.

---

_Verified: 2026-08-11T12:40:00Z_
_Verifier: Claude (gsd-verifier)_
