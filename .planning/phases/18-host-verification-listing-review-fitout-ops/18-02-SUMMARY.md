---
phase: 18-host-verification-listing-review-fitout-ops
plan: 02
subsystem: data
tags: [drizzle, postgres, migration, enum, backfill, grandfather, 55p04, information-schema, gate-06]

# Dependency graph
requires:
  - phase: 02-listings-host-onboarding
    provides: "the `listing` table, its `status` enum (draft|published|unlisted), `deleted_at`, and the `host_payout` 1:1-to-user table shape this clones"
  - phase: 08-money-observability
    provides: "the `audit` table's history-row + partial-index idioms, and the `actorId`-has-no-FK precedent"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 01
    provides: "the authenticated staff identity whose id lands in `decided_by_staff_id`"
provides:
  - "`host_verification` — 1:1 to `user`, with the HVER-02 storage contract pinned by a database assertion (OPS/HVER)"
  - "`listing_review` — the D-221 history table, with `submitted_at` carrying D-249's queue-fairness rule"
  - "`listing.review_state` — the denormalised current state the sell-gate (18-03) and the search twin (D-226) will read"
  - "`host_verification_status` / `listing_review_state` pgEnums + their derived TS union types"
  - "the two OPS-04 review-queue partial indexes, ordered ASC to byte-match the console's ORDER BY"
  - "`'ops'` on `cancelled_by`, added and written by nothing until 18-08"
  - "a GRANDFATHERED live catalogue: 19 published listings and 13 hosts, applied to the dev database"
  - "GATE-06 re-scoped from a migration freeze to shipped-migration immutability — the gate every later v1.2 migration would otherwise have fought"
affects: [18-03 sell-gate, 18-04 verification port, 18-05 ops actions, 18-08 ops cancel-and-refund, 18-09, 18-12 ops console]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "exact-column-set allow-list against `information_schema.columns` as a STORAGE CONTRACT — the profile.ts allow-list reasoning applied to a table instead of a projection"
    - "a data migration measured by reading its own statements off disk and executing them, because the harness replays into an empty schema and makes the backfill a no-op everywhere else"
    - "the 55P04 split mechanised: a grep tripwire over `drizzle/*.sql` that strips comments in both directions"
    - "a milestone-scoped gate retired by NARROWING its domain rather than bumping its constant — the digest carries forward unchanged as its own evidence"

key-files:
  created:
    - drizzle/0026_host_verification_listing_review.sql
    - drizzle/0027_cancelled_by_ops.sql
    - drizzle/meta/0026_snapshot.json
    - drizzle/meta/0027_snapshot.json
    - tests/ops/verification-schema.test.ts
    - tests/ops/grandfather-backfill.test.ts
    - tests/design/enum-first-use-tripwire.test.ts
  modified:
    - src/lib/db/schema.ts
    - drizzle/meta/_journal.json
    - tests/design/infra.test.ts
    - tests/design/money-path-invariants.test.ts

key-decisions:
  - "The plan's INSERT statement, transcribed verbatim, FAILS with 42804. `SELECT DISTINCT` must resolve every output column to a concrete type before de-duplicating, so a bare `'grandfathered'` settles as `text` and never receives the assignment coercion an `INSERT … VALUES` relies on. Fixed with `::\"host_verification_status\"` / `::text` / `::timestamptz`; the measurement is recorded at the statement."
  - "The HVER-02 allow-list is TEN columns, not the nine the plan listed — `vendor_ref` is required by D-220 and by the plan's own Task 1 and Task 3 nullability case."
  - "GATE-06 was re-scoped by ruling, not bumped: the shipped set (0000–0025) is now byte-immutable and presence-pinned, while new v1.2 migrations are permitted. The digest constant was NOT regenerated — narrowing its domain leaves the hash input byte-identical, so the number independently watched red on 2026-08-29 still verifies."
  - "`digestOfShippedMigrations()` iterates the PINNED LIST, not the directory listing, so a missing historical file fails by NAME (ENOENT) rather than as an anonymous hash mismatch."
  - "The two enums are BRAND-NEW `CREATE TYPE`, so they are created and first-used in one transaction — probed, not assumed. Only `ALTER TYPE … ADD VALUE` on a committed type takes the 55P04 split, which is why `'ops'` is alone in 0027."

patterns-established:
  - "Storage-contract-as-allow-list: assert the EXACT column set against `information_schema`, never a deny-list of forbidden names — a deny-list passes the day somebody picks a fourth word."
  - "Read-the-migration-off-disk: when the test harness replays into an empty schema, a data migration can only be measured by executing its own statements against fixtures, not by asserting the live schema."
  - "Retire a milestone gate by narrowing its domain, never by bumping its constant — and prove the narrowing by showing the old constant still verifies."

requirements-completed: [HVER-02, LVER-04]

# Metrics
duration: 32min
completed: 2026-08-31
---

# Phase 18 Plan 02: Host Verification & Listing Review Schema Summary

**The sell-gate now has columns to read: two enums, two tables and `listing.review_state` are migrated and applied, the live catalogue is grandfathered in the same transaction that could otherwise have made it unsellable, `host_verification` is structurally incapable of holding a government ID, and the milestone gate that would have fought every v1.2 migration was re-scoped by ruling rather than bumped.**

## Performance

- **Duration:** 32 min
- **Started:** 2026-08-31T20:33:10Z
- **Completed:** 2026-08-31T21:05:53Z
- **Tasks:** 3 (+1 ruled scope change)
- **Files created/modified:** 11 (7 created, 4 modified)

## Accomplishments

- **`src/lib/db/schema.ts`** — `hostVerificationStatus` and `listingReviewState` pgEnums, each declared immediately above the table it backs (D-223); `hostVerification` on the `hostPayout` 1:1 shape; `listingReview` as history rows with `onDelete: "restrict"`; `listing.reviewState` defaulting `'pending'`; the two OPS-04 partial indexes; `'ops'` appended to `cancelledBy`. Both derived TS union types exported so `deriveBookable` and the badge never re-declare a string union.
- **`drizzle/0026` + `drizzle/0027`, applied.** The column default and its backfill ship in the SAME file, so there is no deploy window in which `review_state = 'pending'` makes the entire live catalogue unsellable (T-18-0203). `'ops'` sits alone in 0027 under the 55P04 rule.
- **The live catalogue is grandfathered** — 19 published listings, 32 drafts left `pending`, 13 hosts, measured against the dev database rather than asserted.
- **HVER-02 is a database assertion with a watched RED**, not a comment: the exact column set, as an allow-list, with set equality.
- **The D-240 backfill is measured against the statements on disk**, twice, plus the never-move-a-decided-row property — because the harness replays into an empty schema and makes the backfill a no-op in all 195 test files.
- **GATE-06 raised, ruled, and re-scoped** rather than absorbed. The gate's own message names the two absorptions available and forbids both; the plan stopped, raised it, and implemented the ruling as a separate commit.

## Task Commits

1. **Task 1: The schema — two enums, two tables, one column, two indexes** — `ea862fb` (feat)
2. **Task 2 [BLOCKING]: Generate the migrations, hand-append the backfill, apply them** — `fbbdacf` (feat)
3. **Task 3: The two tests tsc structurally cannot replace** — `5a2c3b1` (test)
4. **Ruled scope change: GATE-06 re-scoped** — `76d1a10` (test)

## Files Created/Modified

- `src/lib/db/schema.ts` — **modified.** +197/−1. The Better-Auth-owned region untouched.
- `drizzle/0026_host_verification_listing_review.sql` — **created.** Generated, then hand-edited three ways: the `ALTER TYPE` moved out, `"public".` prefixes stripped, the two grandfather statements appended under a header stating the probe, the D-240 scope call, and the intended consequences.
- `drizzle/0027_cancelled_by_ops.sql` — **created.** One statement. The header never spells the literal, so the tripwire it is guarded by cannot trip on its own prose.
- `drizzle/meta/_journal.json`, `0026_snapshot.json`, `0027_snapshot.json` — **created/modified.** 0026's snapshot corrected to exclude the enum value that moved to 0027, so each snapshot truthfully describes the state after its own migration; 0027's is the chain tip and equals `schema.ts`.
- `tests/ops/verification-schema.test.ts` — **created.** 3 cases: the exact column set, the FK/PK shape, the nullability triple.
- `tests/ops/grandfather-backfill.test.ts` — **created.** 5 cases, executing the statements read off `drizzle/0026`.
- `tests/design/enum-first-use-tripwire.test.ts` — **created.** 5 cases, DB-free, build-blocking.
- `tests/design/infra.test.ts`, `tests/design/money-path-invariants.test.ts` — **modified** under the ruling.

## Decisions Made

### The HVER-02 allow-list, exactly as pinned

```
checked_at, created_at, decided_by_staff_id, provider, reason,
result, status, updated_at, user_id, vendor_ref
```

Ten columns, asserted with `toEqual` on a sorted array against `information_schema.columns` in the replayed schema. **An allow-list and never a deny-list** — a deny-list naming `document`/`id_number`/`image` passes cheerfully the day somebody picks a fourth word (`attachment_url`, `selfie`, `poi_scan`), and its greenness is then actively misleading. `src/lib/profile.ts:44-52` is the shipped precedent and states the reason in one line.

### The two grandfather statements, verbatim as applied

```sql
UPDATE "listing" SET "review_state" = 'grandfathered'
WHERE "status" = 'published' AND "deleted_at" IS NULL AND "review_state" = 'pending';
```

```sql
INSERT INTO "host_verification"
  ("user_id", "status", "provider", "checked_at", "created_at", "updated_at")
SELECT DISTINCT l."host_id", 'grandfathered'::"host_verification_status",
       'migration'::text, NULL::timestamptz, now(), now()
FROM "listing" l
WHERE l."status" = 'published' AND l."deleted_at" IS NULL
ON CONFLICT ("user_id") DO NOTHING;
```

The third predicate on the UPDATE and the `ON CONFLICT` on the INSERT are what make the pair re-runnable and **structurally unable** to move a row already `approved` or `rejected`.

### Counts observed against the live dev database

| Query | Result |
|---|---|
| `listing` where `status='published' AND deleted_at IS NULL` → `review_state` | **19 → `grandfathered`** |
| `listing` where `status='draft'` → `review_state` | **32 → `pending`** |
| `listing` where `status <> 'published' AND review_state = 'grandfathered'` | **0** |
| `host_verification` rows | **13**, all `status='grandfathered'`, `provider='migration'`, `checked_at` NULL |
| `cancelled_by` enum labels | `booker, host, system, ops` |
| `drizzle.__drizzle_migrations` rows | **28**, unchanged across three `db:migrate` runs |

There were no `unlisted` and no soft-deleted rows in the dev catalogue, so those two branches of D-240 are exercised by fixtures in `grandfather-backfill.test.ts` rather than by live data — stated because a live count of zero is not evidence.

### `'ops'` is added and written by NOTHING until 18-08

The value exists on the type in both `schema.ts` and `drizzle/0027`. No migration uses it — no backfill, no DEFAULT, no CHECK, no index predicate — and that is the entire reason the migration is safe under 55P04. The first write is a runtime `UPDATE` from the ops cancel-and-refund action in plan 18-08, long after commit.

**And `tsc` will not police this.** `deriveDisplayStatus` / `deriveBookingStatusView` take `cancelledBy` as a widened `string | null` (`src/components/booking/booking-status.ts:72,98`), so widening the enum is not a compile error at any display call site. Verified by reading the signatures; the census D-224 gets for free on `deriveBookable` is **not available here**, and the note is written at the enum.

## Deviations from Plan

### 1. [Rule 1 — Bug] The plan's INSERT statement fails with `42804`; explicit casts added

- **Found during:** Task 2, on the first `npm run db:migrate`.
- **Issue:** `npm run db:migrate` exited 1 with the error swallowed behind a spinner. Probing each statement individually in a rolled-back transaction produced the real message:
  ```
  FAILED in drizzle/0026_host_verification_listing_review.sql
  ERROR: 42804 column "status" is of type host_verification_status but expression is of type text
  ```
  `SELECT DISTINCT` must resolve every output column to a **concrete** type before it can de-duplicate, so the bare `'grandfathered'` literal is settled as `text` at that point and never receives the assignment coercion that an ordinary `INSERT … VALUES ('grandfathered')` relies on. `NULL` has the same problem. Non-obvious precisely because the same literal in a `VALUES` clause works.
- **Fix:** `'grandfathered'::"host_verification_status"`, `'migration'::text`, `NULL::timestamptz`. The `DISTINCT` itself is load-bearing and was kept — a host with three published listings must produce one row.
- **Files modified:** `drizzle/0026_host_verification_listing_review.sql`
- **Verification:** all statements replay clean; `npm run db:migrate` → `[✓] migrations applied successfully!`
- **Committed in:** `fbbdacf`

### 2. [Rule 1 — Plan omission] The HVER-02 allow-list is ten columns, not nine

- **Found during:** Task 3.
- **Issue:** The plan's Task 3 spells the allow-list as nine names, omitting `vendor_ref` — while D-220 names `vendorRef` explicitly, the plan's own Task 1 instructs adding it, and the plan's own third case asserts it is NULLABLE. The nine-name list is an oversight, not a contract.
- **Fix:** The allow-list is the ten columns actually migrated. If `vendor_ref` were genuinely unwanted the correct repair would be removing it from the table, not from the assertion — and D-206 needs it, since it is the only handle FitOut keeps pointing at the vendor's copy.
- **Files modified:** `tests/ops/verification-schema.test.ts`
- **Committed in:** `5a2c3b1`

### 3. [Rule 4 — RAISED, RULED] GATE-06 re-scoped from a migration freeze to shipped-migration immutability

- **Found during:** plan-level verification step 5 (`npm run test:design` alone).
- **Issue:** 4 tests in 2 files failed, all GATE-06 — a milestone invariant pinning `drizzle/` at `0025_audit_resolved_by.sql` with an equality count of 26 and a whole-directory sha256. The gate's own message forbids both available absorptions: *"do not bump the pinned number to make this green, and do not delete the migration to make it green either. Take it to the phase owner."*
- **Action:** **Stopped, touched nothing, and raised it** with the evidence and four options. The gate is the reason this was not absorbed, and it worked exactly as designed.
- **Ruling (phase owner):** the invariant is **finished, not stale and not violated** — "v1.1 ships zero schema migrations" was a milestone-scoped promise that was *kept* (v1.1 closed 2026-08-31 at `0025`; `PROJECT.md:107` records it). Phase 18 is v1.2 and its locked context mandates migrations. What survives is the **immutability of shipped migrations**; what does not is the freeze on new ones. A whole-directory digest was rejected because it taxes every future v1.2 migration (18-09 adds one) and *"a gate that must be bumped on a schedule stops being read and starts being bumped reflexively — which is exactly how a real alarm dies."* A PLAN.md-budgeted-migration gate was rejected too: `/gsd-new-milestone` deletes prior phase directories, so `0000`–`0025` have no surviving plan naming them and would all redden.
- **Fix:** `SHIPPED_MIGRATIONS` (the 26 historical names, exhaustive rather than derived, so a deletion cannot fall out of range); equality pins replaced by presence + a monotonic floor; `MIGRATION_DIGEST` → `SHIPPED_MIGRATION_DIGEST` scoped to that set; `digestOfShippedMigrations()` iterates the pinned list so a missing file fails by name; both headers rewritten to quote the retired invariant and to say plainly that this was re-scoped by ruling during 18-02, not bumped to make a build green. D-81's `REFUNDABLE_RAILS` half untouched.
- **The digest constant was NOT regenerated.** On 2026-08-29 `drizzle/` held exactly those 26 files, so narrowing the input from "every `.sql`" to "these 26" leaves the hash input byte-identical — and `652178ae…` still verifies. That is deliberately stronger evidence than pasting a fresh number: the constant that was independently watched red under the old shape still holds under the new one.
- **Files modified:** `tests/design/infra.test.ts`, `tests/design/money-path-invariants.test.ts`
- **Committed in:** `76d1a10` (its own commit, as ruled)

---

**Total deviations:** 2 auto-fixed (Rule 1 × 2) + 1 raised and ruled (Rule 4)
**Impact on plan:** No scope creep. Deviations 1 and 2 are the plan's own instructions corrected against what Postgres and D-220 actually require. Deviation 3 is a gate collision the plan did not anticipate (`grep GATE-06 .planning/phases/18-*/` returns zero), raised rather than absorbed and fixed under an explicit ruling in a separate commit.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npx eslint` on all changed files | **exit 0** |
| `npm run db:migrate` | **`[✓] migrations applied successfully!`** — idempotent across three runs, ledger steady at 28 |
| `npx vitest run tests/ops/verification-schema.test.ts tests/ops/grandfather-backfill.test.ts` | **8 passed (2 files)** |
| `npx vitest run --config vitest.design.config.ts tests/design/enum-first-use-tripwire.test.ts` | **5 passed** |
| `npm test` (alone) | **195 files / 2256 passed, 5 skipped** — baseline 193 / 2248 / 5, i.e. **+2 files and +8 tests, exactly this plan's own, zero regressions** |
| `npm run test:design` (alone, after the ruling) | **72 files / 1296 passed, 3 skipped** — baseline 71 / 1291, i.e. **+1 file and +5 tests, exactly this plan's tripwire** |
| `0027` statement count (`grep -v '^\s*--' \| grep -c ';'`) | **1** |
| files naming the literal `'ops'` across `drizzle/*.sql` | **only `0027_cancelled_by_ops.sql`** |
| `grep -c '"public"\.' drizzle/0026_*.sql` | **0** |
| journal tags | `… → 0026_host_verification_listing_review → 0027_cancelled_by_ops` |

Both suites were run **alone and sequentially**, never back-to-back, per the shared-test-DB truncation hazard. The `[test-db] LEAKED WRITES` block naming `notify` and `guest-email` appeared as expected and is pre-existing.

### Mutation REDs, recorded verbatim

**M1 — HVER-02, a document column.** A scratch `ALTER TABLE "host_verification" ADD COLUMN "document_url" text;` appended to the replay:

```
× case 1 — the EXACT column set is the D-220 allow-list, and nothing else
AssertionError: expected [ 'checked_at', 'created_at', …(9) ] to deeply equal
                         [ 'checked_at', 'created_at', …(8) ]
+   "document_url",
      Tests  1 failed | 2 passed (3)
```

Cases 2 and 3 stayed **green** — a `document_url text` column adds no foreign key and changes nothing about the nullability of the three columns they name. Only set equality can see it. *(This mutation also caused a test-design change: an exact-count assertion fired first and reported `expected 11 to be 10`, hiding the column name, so the positive half was weakened to `toBeGreaterThan(0)` and the diagnostic moved to the equality.)*

**M2 — the widened backfill predicate.** `AND "status" = 'published'` deleted from the UPDATE:

```
× case 1 — published is grandfathered; draft, unlisted and soft-deleted published all stay pending
AssertionError: expected 'grandfathered' to be 'pending' // Object.is equality
Expected: "pending"   Received: "grandfathered"
      Tests  1 failed | 4 passed (5)
```

**M3 — the re-run guard.** `AND "review_state" = 'pending'` deleted:

```
× case 5 — a re-run can never move an already-decided row (T-18-0205)
AssertionError: expected 'grandfathered' to be 'approved' // Object.is equality
      Tests  1 failed | 4 passed (5)
```

**Four of five cases stayed green under each, and that is the finding.** Case 4 — the *idempotence* case, the one that looks like it is about re-running — cannot see M3 at all: a re-run over rows that are uniformly `grandfathered` or uniformly `pending` produces an identical outcome whether the guard is there or not. Only case 5, which plants an `approved` and a `rejected` row first, can.

**M4 / M5 — the re-scoped GATE-06**, both watched under the *new* shape:

```
# M4: one character changed inside shipped drizzle/0014
× pins the shipped migrations byte-for-byte, not just by their filenames
Expected: "652178aef62a621c10b1492d21d85261905b9bd032e4061e6e27c53891d1afbe"
Received: "b801a5fd4d5d11081c92b35d501bdb35818afb4dac7a3b0bfe186714f71548ca"
      Tests  1 failed | 35 passed (36)

# M5: git mv drizzle/0014_phase7_ledger_kind.sql drizzle/0014_renamed.sql
× still holds every migration v1.0 and v1.1 shipped   (in BOTH files)
  1 shipped migration(s) are missing from drizzle/:
    0014_phase7_ledger_kind.sql
  expected [ '0014_phase7_ledger_kind.sql' ] to deeply equal []
× pins the shipped migrations byte-for-byte …
  Error: ENOENT: no such file or directory, open '…\drizzle\0014_phase7_ledger_kind.sql'
      Tests  3 failed | 33 passed (36)
```

**The control is the point:** in M4 the two new v1.2 migrations were on disk and moved nothing, and in M5 they appear in the failure's own `Found:` list without reddening anything. Under the old shape their mere existence failed four assertions. Both reverted; `git status --short drizzle/` empty; 36/36 green.

### Threat register disposition

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-18-0201 | mitigated | `verification-schema.test.ts` case 1 — allow-list set equality, watched RED against `document_url` (M1) |
| T-18-0202 | mitigated | `grandfather-backfill.test.ts` case 3 — `checked_at` NULL and `provider='migration'` asserted; live DB confirms 13/13 |
| T-18-0203 | mitigated | Column default and backfill in ONE file; `grep -c 'review_state' drizzle/0026` shows both in the same transaction |
| T-18-0204 | mitigated | `'ops'` alone in 0027; `enum-first-use-tripwire.test.ts` mechanises the grep, build-blocking |
| T-18-0205 | mitigated | Backfill test cases 4 and 5, with M3 proving only case 5 can see the guard |
| T-18-SC | mitigated | **Zero packages installed.** `package.json` byte-unchanged. |

## Known Stubs

None. Every column, index and enum value in this plan is either consumed by a later plan in this phase or exercised by a test here. `'ops'` is deliberately unwritten until 18-08 — that is the 55P04 safety property, documented at three sites, not an unfinished wire.

## Threat Flags

None. This plan adds no network endpoint, no auth path and no file access. It is a schema change at a trust boundary the plan's own `<threat_model>` already enumerates, and every disposition landed.

## Issues Encountered

- **`drizzle-kit migrate` swallows its statement error behind a spinner and exits 1 silently.** No error text, no failing statement, no code. The only way to the real message was a probe script replaying each statement in a rolled-back transaction. Worth keeping for the next executor: `EXIT=1` with a clean-looking log is a real failure, not a flake.
- **`drizzle-kit generate` emitted the `ALTER TYPE … ADD VALUE` into the same file as the new tables.** The generator does not know about 55P04. Moving it out is a mandatory hand-edit on every enum-widening migration in this repo, not a stylistic one.
- **A probe script must live inside the repo tree** (module resolution is rooted at the file, not cwd) and `dotenv/config` alone does not load `.env.local` — it must be loaded by explicit path, the way `drizzle.config.ts` does. Both re-learned from 18-01's notes.

## Next Phase Readiness

**Ready.** 18-03's sell-gate has both columns to read:

- **18-03 (`deriveBookable`)** — `listing.reviewState` and `host_verification.status` exist and are typed. The bookable set is exactly `{approved, grandfathered}` on both sides; a **missing** `host_verification` row must read as `unverified` and refuse, and the backfill deliberately leaves draft-only hosts with no row so that path is live from day one.
- **18-12 (ops console)** — both queue indexes exist and are ordered **ASC**. The console's `ORDER BY created_at ASC` must match byte-for-byte or Postgres puts a Sort node on top of the scan (`src/lib/ops/alerts.ts:12-24`).
- **18-08 (ops cancel)** — `'ops'` is on the type and ready for its first write. `tsc` will **not** flag the display forks when it starts being written, because `cancelledBy` is a widened `string` at every display call site; those forks need a hand review, and the note is at the enum.

**Two standing hazards to carry forward:**

1. **Every future migration in this milestone must be added, never edited.** GATE-06 now pins `0000`–`0025` byte-for-byte and by name. Editing a shipped migration is red; adding `0028` is fine. 18-09's migration needs no gate change at all — that is the whole point of the re-scoping.
2. **`tests/design/enum-first-use-tripwire.test.ts` requires `--config vitest.design.config.ts`.** The bare form prints "No test files found" and exits 1, indistinguishable from a real gate failure.

## Self-Check: PASSED

Files verified present on disk:

- `drizzle/0026_host_verification_listing_review.sql` — FOUND
- `drizzle/0027_cancelled_by_ops.sql` — FOUND
- `drizzle/meta/0026_snapshot.json` — FOUND
- `drizzle/meta/0027_snapshot.json` — FOUND
- `tests/ops/verification-schema.test.ts` — FOUND
- `tests/ops/grandfather-backfill.test.ts` — FOUND
- `tests/design/enum-first-use-tripwire.test.ts` — FOUND

Commits verified in `git log`:

- `ea862fb` — FOUND (Task 1)
- `fbbdacf` — FOUND (Task 2)
- `5a2c3b1` — FOUND (Task 3)
- `76d1a10` — FOUND (ruled scope change)

---
*Phase: 18-host-verification-listing-review-fitout-ops*
*Completed: 2026-08-31*
