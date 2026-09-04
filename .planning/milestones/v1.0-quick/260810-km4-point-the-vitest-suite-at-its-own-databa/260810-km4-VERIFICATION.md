---
phase: quick-260810-km4
verified: 2026-08-10T16:15:00Z
status: passed
score: 8/8 must-have truths verified (5/5 artifacts, 4/4 key links)
overrides_applied: 0
---

# Quick Task 260810-km4: Point the vitest suite at its own database — Verification Report

**Task Goal:** Point the vitest suite at its own `fitout_test` database so stray writes through the app's
module-level db singleton stop polluting the DEV database. Closes deferred item D1.
**Verified:** 2026-08-10T16:15:00Z
**Status:** passed
**Method:** First-hand code read of every modified/created file, empirical guard testing, a full bare
`npx vitest run` (no `DATABASE_URL` exported) with before/after Postgres measurements taken independently
of the SUMMARY's numbers, `npx tsc --noEmit`, `npm run lint`, `npm run db:test:setup` run twice, and
`git diff --exit-code` against the pre-task base commit (`1049444`) for every file the plan declared sacred.

## Goal Achievement

### Observable Truths (from PLAN.md `must_haves.truths`)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A full `npx vitest run` adds ZERO new rows to dev `audit` and ZERO new `test_%` schemas | ✓ VERIFIED | Independently measured before/after my own run: dev `audit` 27→27, dev unresolved 0→0, dev `test_%` schemas 0→0. |
| 2 | Stray app-singleton writes still happen, relocated to `fitout_test.public.audit`, counted + named loudly | ✓ VERIFIED | Same run: `fitout_test.public.audit` 0 (truncated at start) → 2 (`notify` 1, `guest-email` 1). Console printed the `┏━━ [test-db] LEAKED WRITES ━━━` block naming both actions, verbatim as designed. |
| 3 | Dev with existing `pgdata` volume: `npm run db:test:setup` once, then `vitest run` is green, no hand-edited env, no new migration | ✓ VERIFIED | Ran `db:test:setup` twice (idempotent, see #4). Ran `npx vitest run` bare (no env exported) → **1163 passed / 4 skipped / 0 failed**. No `.env.local` edits made. `drizzle/` unchanged (`git status --porcelain drizzle/` empty). |
| 4 | `npm run db:test:setup` is idempotent: second run changes nothing, exits 0 | ✓ VERIFIED | Ran it twice back-to-back. Second run: `database fitout_test already exists — no change`, `no leftover test_% schemas — no change`, migrations replay is a drizzle-journal no-op. Both runs exited 0. |
| 5 | The suite structurally refuses to touch any database whose name does not end in `_test` | ✓ VERIFIED | Empirically exercised `testDatabaseUrl()`/`databaseNameOf()` directly via `tsx`: throws on a non-`_test` `TEST_DATABASE_URL`, an unparseable URL string, an empty-path URL, and a multi-segment-path URL. Fails CLOSED in all four cases (see Key Link / guard table below). |
| 6 | `db:migrate`, `db:seed`, `next dev`, every Playwright e2e spec still target DEV, byte-unchanged behaviour | ✓ VERIFIED | `git diff --exit-code 1049444 -- e2e/ drizzle.config.ts scripts/seed.ts src/lib/audit.ts src/lib/db/index.ts` → exit 0 (byte-identical). `db:test:setup` itself proves `drizzle-kit migrate` still honours a shell-set `DATABASE_URL` override (the same property `db:migrate` relies on). |
| 7 | Every unresolved dev `needs_attention` row is classified BEFORE any discharge; genuine alerts survive untouched | ✓ VERIFIED | SUMMARY carries the full 27-row pre-discharge dump with a stated discriminator (`meta->>'error'='resend 503'` + fixture markers), applied before the discharge log. Independently confirmed post-hoc: all 27 rows now carry `resolved_at`, total `audit` row count still 27 (nothing deleted), 0 rows of any other `action` were touched. |
| 8 | No statement of the superseded "run vitest with NO `DATABASE_URL` override" rule survives in live guidance | ✓ VERIFIED | `fitout-gsd-toolchain-gotchas.md:18` now reads "RULE CHANGED 2026-08-10" and states the new mechanism; `local-env-and-uat-seed.md:13` now includes `npm run db:test:setup` in the first-run recipe. Repo-wide `README.md`/`.env.example`/source comments contain no statement of the old rule; the only remaining hits are inside historical `.planning/phases/**` / `.planning/quick/**` PLAN/SUMMARY/VERIFICATION records, which the plan explicitly instructs NOT to rewrite (accurate history). |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tests/helpers/test-db-url.ts` | Single source of truth for the test DB URL + `_test` suffix invariant, exports `testDatabaseUrl`/`baseDatabaseUrl` | ✓ VERIFIED | Present, exports `baseDatabaseUrl`, `testDatabaseUrl`, plus `databaseNameOf`/`assertTestDatabase`. Fails closed on unparseable/empty/multi-segment URLs and on non-`_test` names — empirically confirmed. |
| `scripts/db-test-setup.ts` | Idempotent provisioning: CREATE DATABASE, extensions in `public`, migration replay | ✓ VERIFIED | Ran twice; both exit 0; extensions installed `WITH SCHEMA public` explicitly for both `postgis` and `btree_gist`; migration replay via `execSync("npx drizzle-kit migrate", …)`. |
| `tests/global-setup.ts` | Preflight + truncate-at-start + LOUD leak report at end | ✓ VERIFIED | `setup()` preflights (throws with fix instruction if unmigrated/unreachable), re-asserts `assertTestDatabase` immediately before `TRUNCATE`, excludes `spatial_ref_sys`. `teardown()` reports, wrapped in try/catch, never throws. |
| `vitest.config.ts` | `globalSetup` registration | ✓ VERIFIED | `globalSetup: ["tests/global-setup.ts"]` present alongside `setupFiles`. |
| `package.json` | `npm run db:test:setup` | ✓ VERIFIED | Script present, positioned with other `db:*` entries. `git diff 1049444 HEAD -- package.json` shows exactly 1 line added; `package-lock.json` untouched by this task (mtime predates it) — no new dependency. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `tests/setup.ts` | `tests/helpers/test-db-url.ts` | unconditional (forcing) `DATABASE_URL` assignment | ✓ WIRED | Line 43: `process.env.DATABASE_URL = testDatabaseUrl();` — no `if (!…)` guard, confirmed by reading the file. The old fallback (a no-op, since dotenv always set the var first) is gone. |
| `vitest.config.ts` | `tests/global-setup.ts` | `globalSetup` array | ✓ WIRED | `globalSetup: ["tests/global-setup.ts"]`; confirmed exercised — my own run printed the preflight/truncate line and the end-of-run report, which only fire from this file. |
| `tests/helpers/db.ts` | `tests/helpers/test-db-url.ts` | `baseUrl()` delegation | ✓ WIRED | `baseUrl()` (line 61-63) returns `testDatabaseUrl()` directly — the third copy of the dev-URL literal is gone. |
| `scripts/db-test-setup.ts` | `drizzle-kit migrate` | `execSync` with `DATABASE_URL` in the child env | ✓ WIRED | Confirmed by running `db:test:setup` live — console shows `Reading config file 'drizzle.config.ts'` then `[✓] migrations applied successfully!` against `fitout_test`. |

### The `_test` Suffix Guard — Fail-Closed Table

| Input | Expected | Observed |
|---|---|---|
| `TEST_DATABASE_URL` names a database not ending `_test` (e.g. `fitout`) | throws | ✓ threw: `REFUSING to use database "fitout" … its name does not end in "_test"` |
| Unparseable URL string (`"not a url at all"`) | throws | ✓ threw: `is not a parseable URL` |
| Empty path (`postgresql://user:pass@host:5432/`) | throws | ✓ threw: `does not name exactly one database (pathname "/")` |
| Multi-segment path (`postgresql://user:pass@host:5432/foo/bar`) | throws | ✓ threw: `does not name exactly one database (pathname "/foo/bar")` |
| No override, base = `fitout` | derives `…/fitout_test` | ✓ `postgresql://fitout:fitout@localhost:5432/fitout_test` |

The guard is enforced **inside `testDatabaseUrl()`** (the shared module), so all three consumers
(`tests/setup.ts`, `tests/global-setup.ts` via `resolveUrl()`, `scripts/db-test-setup.ts`) inherit it —
none can opt out. It is additionally **re-asserted immediately before both destructive statements**:
`tests/global-setup.ts:87` (`assertTestDatabase(url, "the TRUNCATE target")` right before the `TRUNCATE`)
and `scripts/db-test-setup.ts:119` (`assertTestDatabase(testUrl, "the DROP SCHEMA target")` right before
the `DROP SCHEMA` loop). Both re-assertions read from the file, not inferred.

### `spatial_ref_sys` Exclusion

Confirmed at both call sites: `tests/global-setup.ts`'s single `EXCLUDED_TABLES = new Set(["spatial_ref_sys"])`
feeds `leakTables()`, which is used by **both** `setup()`'s truncate list and `teardown()`'s leak count —
one exclusion set, two consumers. Empirically: `fitout_test.public` has 20 base tables; the preflight line
from my own run read `truncated 19 table(s)`; `spatial_ref_sys` still holds 8,500 rows after the run
(untouched).

### Two-Layer Isolation

- `tests/setup.ts` — read in full. The `if (!process.env.DATABASE_URL)` fallback is gone; line 43 is an
  unconditional assignment. Confirmed this is not the old no-op by cross-checking `tests/setup.ts`'s own
  header comment, which explicitly calls out the reversal.
- `tests/helpers/db.ts` — read in full. `baseUrl()` delegates to `testDatabaseUrl()` (shared module),
  not a local literal. Per-file schema carving (`nextSchemaName()`, `setupTestDb()`, `teardownTestDb()`)
  is byte-identical in behaviour to before — only the URL source changed.

### Data-Flow / Behavioral Spot-Checks (Level 4)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite, bare shell, no `DATABASE_URL` | `npx vitest run` | `1163 passed / 4 skipped / 0 failed` (130 files passed / 1 skipped) | ✓ PASS — exact match to the plan's asserted baseline |
| `tsc` type-checks clean | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Lint adds no new warnings | `npm run lint` | 0 errors, 9 warnings (matches stated baseline) | ✓ PASS |
| `db:test:setup` idempotent | run twice | both exit 0; second run reports no-op on every step | ✓ PASS |
| Dev containment (before vs. after one full run) | live Postgres queries | `audit` 27→27, unresolved 0→0, `test_%` schemas 0→0 | ✓ PASS |
| Non-vacuity (relocated writes land somewhere real) | live Postgres query | `fitout_test.public.audit` 0→2 (`notify` 1, `guest-email` 1) | ✓ PASS |
| Dev row discharge — nothing deleted | live Postgres query | total `audit` rows still 27; all 27 `needs_attention` rows carry `resolved_at` | ✓ PASS |
| `ops:alerts` shows no unresolved | `npm run ops:alerts` | `No unresolved needs_attention alerts.` | ✓ PASS |
| Sacred files untouched | `git diff --exit-code 1049444 -- e2e/ drizzle.config.ts scripts/seed.ts src/lib/audit.ts src/lib/db/index.ts` | exit 0 | ✓ PASS |
| Migration surface unchanged | `ls drizzle/*.sql \| tail -1` + `git status --porcelain drizzle/` | `0024_audit_table.sql`; empty status | ✓ PASS |
| New dependency check | `git diff 1049444 HEAD -- package.json` + `package-lock.json` mtime | 1 line added to `package.json` (the script); lock file predates the task | ✓ PASS |

### Anti-Patterns Found

None. Scanned `tests/helpers/test-db-url.ts`, `tests/global-setup.ts`, `scripts/db-test-setup.ts`,
`tests/setup.ts`, `tests/helpers/db.ts`, `vitest.config.ts` for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and
"not yet implemented"/"coming soon" language — zero matches. No stub returns, no empty handlers, no
hardcoded-empty data flowing to a consumer.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| D1 | `260810-km4-PLAN.md` | Vitest writes real `needs_attention` rows into dev via the app db singleton | ✓ SATISFIED | Closed on the record in `deferred-items.md` under D1 with the containment-vs-fix distinction stated; independently reproduced (dev unchanged, `fitout_test` gains the rows) rather than taken on the SUMMARY's word. No entry for D1 in `.planning/REQUIREMENTS.md` — expected for a self-declared quick-task requirement ID (same pattern already noted in `260810-j3z-VERIFICATION.md`). No orphaned requirements. |

## Known Open Item Carried Forward (Not a km4 Gap)

**D2 — the ops CLI can list unresolved alerts but has no way to review resolved ones.** This was
discovered by the operator during km4's own Task 4 human-verification checkpoint, but the gap sits in
the **previous** task's (`260810-j3z`) delivered scope, not in km4's own must-haves (database isolation).
Confirmed present and internally consistent across all three places it should be recorded:

1. `.planning/quick/260810-j3z-make-unresolved-needs-attention-money-al/deferred-items.md` — a new
   **D2** section, `STATUS: OPEN GAP`, with the discovery narrative, why it matters, and the shape of a fix.
2. `260810-j3z-VERIFICATION.md` — an `## Amendment — gap found after this report was written (2026-08-10)`
   section appended after the original sign-off, narrowing the claim to "an alert can be discovered and
   discharged; a discharge cannot be reviewed," and pointing at D2.
3. `.planning/v1.0-MILESTONE-AUDIT.md` item 5 — a dated `**GAP FOUND IN VERIFICATION, 2026-08-10**`
   paragraph appended to the existing item-5 text, same corrected claim, same D2 pointer.

All three carry the same corrected claim verbatim in substance ("an alert can be discovered and
discharged; a discharge cannot be reviewed") and cross-reference each other and D2 consistently. None of
the three overstates closure. **This report does not certify the ops-alert operator workflow as complete
end-to-end** — it certifies km4's own goal (database isolation) and notes D2 as a real, correctly-recorded,
still-open gap in adjacent scope.

Note: at the time of this verification, `deferred-items.md`, `260810-j3z-VERIFICATION.md`, and
`v1.0-MILESTONE-AUDIT.md` show as modified-but-uncommitted in `git status` (along with the new, untracked
`260810-km4-SUMMARY.md`) — consistent with these being orchestrator-added amendments not yet bundled into
a commit. Content was read from the working tree as it exists now, which is the authoritative state for
this check.

## Checkpoint Disposition (Task 4 — blocking human-verify)

Task 4 of the plan was `type="checkpoint:human-verify" gate="blocking"`, gating the one judgement this
task could not make for itself: whether the 27 discharged dev rows were genuinely test noise. Per the
task briefing for this verification: **the operator reviewed the full 27-row classification listing**
(all `meta->>'error' = 'resend 503'`, actions confined to `notify`/`guest-email`, clustered in pairs on
test-run days) **and elected to proceed on that documented evidence.** This should be recorded as
*discharge accepted on the documented evidence*, not as a formal row-by-row human sign-off of each of the
27 rows individually. Because DEC-4 discharges via `resolved_at` rather than `DELETE`, every row remains
queryable and reversible — any row believed misclassified in hindsight can still be reopened.

**Documentation note (not a gap against km4's own goal):** `260810-km4-SUMMARY.md`'s frontmatter still
reads `status: awaiting-human-verification`, i.e. the file itself was not updated to reflect that the
checkpoint was subsequently engaged and resolved. This is a stale-field issue in the SUMMARY, not a
discrepancy in the underlying database-isolation work, which stands independently verified above.

## Gaps Summary

None against this task's own must-haves. All 8 observable truths, all 5 artifacts, and all 4 key links
verified first-hand — by reading the code, by empirically exercising the `_test` suffix guard's four
failure modes, by running the full suite bare with no `DATABASE_URL` and independently measuring dev and
`fitout_test` before/after, and by running `db:test:setup` twice. Numbers matched the SUMMARY's claims
exactly, and were reproduced independently rather than trusted. The one open item in scope adjacent to
this task (D2, the ops CLI's missing "review resolved alerts" surface) is correctly recorded as OPEN in
three consistent, cross-referenced places and does not block km4's own goal of database isolation.

---

_Verified: 2026-08-10T16:15:00Z_
_Verifier: Claude (gsd-verifier)_
