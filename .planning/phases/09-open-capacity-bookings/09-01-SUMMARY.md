---
phase: 09-open-capacity-bookings
plan: 01
subsystem: database
tags: [postgres, drizzle, gist-exclude, enum, migrations, ddl, open-capacity]

# Dependency graph
requires:
  - phase: 03-availability-double-booking
    provides: "booking_no_overlap GiST EXCLUDE (drizzle/0005) + btree_gist — the constraint this plan narrows"
  - phase: 08-group-bookings
    provides: "occupancy_mode enum + booking.declared_pax (drizzle/0017) — the enum extended and the column open rows now always carry"
provides:
  - "occupancy_mode enum accepts 'open_capacity' in the LIVE database (OC-01)"
  - "listing.per_head_price_cents — the dedicated linear per-head day-pass price (D-125)"
  - "booking.open_capacity — NOT NULL DEFAULT false creation-time arbiter flag (D-123)"
  - "booking_no_overlap narrowed to `AND open_capacity = false`, applied live — two open rows on one date now coexist while overlapping exclusive rows still raise 23P01"
  - "D-123..D-126 recorded in PROJECT.md Key Decisions"
affects: [09-02 createOpenCapacityHold, 09-03 concurrent-overbook race gate, 09-04 read model, 09-05 search price filter, 09-06 publish gate, 09-13 updateDeclaredPax refusal, every Phase-9 plan]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-arbiter occupancy: the GiST EXCLUDE governs exclusive rows only; open rows are governed by a separate mechanism, and the EXCLUDE predicate now says which"
    - "Boolean-keyed index predicate as the 55P04 escape hatch (a boolean literal is IMMUTABLE; an enum literal added in the same migration transaction is not)"

key-files:
  created:
    - drizzle/0020_open_capacity_enum.sql
    - drizzle/0021_open_capacity_columns.sql
    - drizzle/0022_booking_exclusion_v3.sql
  modified:
    - src/lib/db/schema.ts
    - .planning/PROJECT.md
    - drizzle/meta/_journal.json

key-decisions:
  - "D-123 — open-capacity no-overbook = per-(listing,date) admissions counter under pg_advisory_xact_lock; supersedes D-21's units-as-spots steer for open listings ONLY"
  - "D-124 — listing.max_occupancy IS the open-capacity daily cap, counted in sum-of-heads"
  - "D-125 — dedicated listing.per_head_price_cents, not the D-108 included/extra_head_fee pair (open pricing is purely linear)"
  - "D-126 — updateDeclaredPax REFUSES open-capacity bookings outright (head count fixed at claim time)"
  - "0021/0022 were generated with `drizzle-kit generate --custom` rather than the plan's two-diff-generate sequence, because schema.ts already carried all three diffs at once"

patterns-established:
  - "Pattern: no migration after an ALTER TYPE ADD VALUE may name the quoted enum literal — not even in a comment — so the phase's grep gate stays a real tripwire instead of always tripping on prose"
  - "Pattern: DDL claims are proven by reading the LIVE catalog back (pg_get_constraintdef / information_schema), never by tsc or next build, which pass against a database that lacks the columns"

requirements-completed: [OPEN-01, OPEN-03]

# Metrics
duration: 35min
completed: 2026-07-30
---

# Phase 9 Plan 01: Open-Capacity Data Model Summary

**The `open_capacity` enum value, `listing.per_head_price_cents`, `booking.open_capacity`, and — the load-bearing change — `booking_no_overlap` narrowed to `AND open_capacity = false`, all applied to the live database and proven by reading the catalog back plus a three-case behavioral proof.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-30T08:25:00Z
- **Completed:** 2026-07-30T09:00:00Z
- **Tasks:** 3
- **Files modified:** 9 (3 migrations + 3 snapshots + journal + schema.ts + PROJECT.md)

## Accomplishments

- **The Pitfall-1 silent break is closed and behaviorally proven.** Two open-capacity bookings on the same listing / same date / same `unit = 1` / identical `[dayOpen, dayClose)` window now BOTH commit. Under the un-narrowed predicate the second would have been rejected `23P01` as a double-book — a functional break no exclusive race test can catch.
- **The Phase-3 keystone is untouched for exclusive bookings.** Two overlapping exclusive rows still raise `23P01`, verified against the live DB and by the fresh-schema integration replay.
- **The 55P04 split holds live.** `npm run db:migrate` applied all three migrations in drizzle-orm's single wrapping transaction with no `unsafe use of new enum value`. No migration at or after 0021 names the quoted enum literal anywhere, including comments.
- **Four global decisions promoted** from RESEARCH's locked assumptions into `PROJECT.md` Key Decisions (D-123..D-126), including D-123's explicit, scoped supersession of D-21.

## Task Commits

1. **Task 1: schema.ts — enum value, two columns, four decisions** — `060bce2` (feat)
2. **Task 2: author drizzle/0020, 0021, 0022** — `1018fe5` (feat)
3. **Task 3: apply + verify against the LIVE database** — verification-only, no source files; evidence recorded below and shipped in the plan metadata commit

**Plan metadata:** see final `docs(09-01)` commit

## Files Created/Modified

- `drizzle/0020_open_capacity_enum.sql` — isolated `ALTER TYPE "occupancy_mode" ADD VALUE IF NOT EXISTS 'open_capacity'`; does nothing else
- `drizzle/0021_open_capacity_columns.sql` — backfill-free `listing.per_head_price_cents` (nullable) + `booking.open_capacity` (NOT NULL DEFAULT false)
- `drizzle/0022_booking_exclusion_v3.sql` — DROP + re-ADD `booking_no_overlap` with the predicate narrowed by the boolean column
- `drizzle/meta/_journal.json`, `drizzle/meta/002{0,1,2}_snapshot.json` — journal idx 20–22 with matching tags; snapshot `prevId`/`id` chain verified unbroken from 0019
- `src/lib/db/schema.ts` — enum value, both columns, the rewritten enum comment, and the Phase-9 paragraph in the `booking_no_overlap` header
- `.planning/PROJECT.md` — D-123..D-126 in Key Decisions

## Live-Database Verification (Task 3, verbatim)

`npm run db:migrate` → exit 0, no 55P04.

```
 occupancy_mode_values
-----------------------
 exclusive
 open_capacity
(2 rows)

     column_name      | data_type | is_nullable
----------------------+-----------+-------------
 per_head_price_cents | integer   | YES
(1 row)

  column_name  | data_type | is_nullable | column_default
---------------+-----------+-------------+----------------
 open_capacity | boolean   | NO          | false
(1 row)

                                              pg_get_constraintdef
------------------------------------------------------------------------------------------------------------
 EXCLUDE USING gist (listing_id WITH =, unit WITH =, tstzrange(starts_at, ends_at, '[)'::text) WITH &&)
 WHERE (((status <> ALL (ARRAY['cancelled'::booking_status, 'declined'::booking_status,
 'completed'::booking_status])) AND (open_capacity = false)))
(1 row)
```

The occupying status set is byte-unchanged (still the complement form, T-09-01 satisfied — the narrow did not widen).

`npx vitest run tests/availability/exclusion-race.test.ts` → **4 passed**, exit 0. This replays all 23 migrations into a brand-new isolated schema, so the whole chain still applies from zero and the EXCLUDE still rejects overlapping exclusive rows.

`npm run db:generate` after migrating → `No schema changes, nothing to migrate` (no drift between schema.ts and the applied DDL).

### Behavioral proof of the narrow (added, see Deviations #3)

Run against the live DB inside `BEGIN … ROLLBACK` (no rows persisted):

| Proof | Setup | Result |
|-------|-------|--------|
| A | two `open_capacity = true` rows, same listing, `unit = 1`, IDENTICAL window | **both committed** (`count = 2`) — the Pitfall-1 break is gone |
| B | two `open_capacity = false` rows, overlapping window | **`23P01` conflicting key value violates exclusion constraint "booking_no_overlap"`** — keystone intact |
| C | one open row + one overlapping exclusive row | both committed — open rows are simply not in the index |

## Decisions Made

- **D-123..D-126 promoted to PROJECT.md** in the file's existing table format, newest-first above D-21, each carrying its user-confirmation date and the RESEARCH assumption it came from. D-123's row states its supersession scope explicitly ("FOR OPEN-CAPACITY LISTINGS ONLY … exclusive listings keep the GiST EXCLUDE unchanged") so a future reader cannot mistake it for a blanket repeal of D-21.
- **0021/0022 authored via `drizzle-kit generate --custom`** rather than hand-editing the journal and hand-chaining snapshot UUIDs. This is the plan's own fallback mechanism applied proactively; it let drizzle-kit own the journal entry, the tag, and the snapshot `prevId`/`id` chain, all of which were then verified programmatically.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's two-generate migration sequence could not work as written**
- **Found during:** Task 2
- **Issue:** The plan's Step 1 assumed `npm run db:generate` would emit "a migration containing only the `ALTER TYPE`". But Task 1 had already landed all three schema.ts diffs (enum value + both columns), so drizzle-kit correctly emitted ONE file containing the `ALTER TYPE` **and** both `ADD COLUMN`s (`drizzle/0020_shallow_marvel_boy.sql`). Following the plan literally would have put the enum ADD VALUE and column DDL in the same migration — harmless on its own, but it would have collapsed the 55P04 split the whole task exists to create.
- **Fix:** Kept the generated SQL as the source of truth for wording, then: deleted the combined file, wrote `0020_open_capacity_enum.sql` containing ONLY the `ALTER TYPE` (retagging the existing idx-20 journal entry), and created 0021 and 0022 with `drizzle-kit generate --custom --name=…` so drizzle-kit produced correct journal entries and snapshots for both. This is the plan's own documented fallback, chosen deliberately over hand-chaining snapshot UUIDs.
- **Files modified:** `drizzle/0020_open_capacity_enum.sql`, `drizzle/0021_open_capacity_columns.sql`, `drizzle/0022_booking_exclusion_v3.sql`, `drizzle/meta/_journal.json`, three snapshots
- **Verification:** Journal ends `20:0020_open_capacity_enum 21:0021_open_capacity_columns 22:0022_booking_exclusion_v3`; snapshot chain verified `0019 → 0020 → 0021 → 0022` by `prevId`/`id`; `0022_snapshot.json` carries both columns and `occupancy_mode: ["exclusive","open_capacity"]`; post-migrate `db:generate` reports no drift.
- **Committed in:** `1018fe5`

**2. [Rule 1 - Bug] Three of the plan's own acceptance greps were unsatisfiable against the plan's own prescribed comment text**
- **Found during:** Task 2
- **Issue:** The plan prescribes verbatim SQL headers that quote the exact strings its acceptance criteria forbid: `'open_capacity'` (in 0021's and 0022's comments), `"public".` (0021), and `CREATE EXTENSION` (0022). Written literally, three gates fail permanently — which would either be waved through as "known noise" or, worse, retire the gates. The gates' *intent* is that no SQL statement after 0020 names the enum literal / schema-qualifies a name / re-creates the extension.
- **Fix:** Reworded the comments to convey the same meaning without the forbidden strings (unquoted `open_capacity`, "schema-qualified public. prefixes", "do NOT re-create that extension here"), and added a line in 0021 explaining that the quoted literal is deliberately absent *even from prose* so the gate stays a usable tripwire. SQL bodies are byte-identical to the plan.
- **Files modified:** `drizzle/0021_open_capacity_columns.sql`, `drizzle/0022_booking_exclusion_v3.sql`
- **Verification:** All nine Task-2 acceptance greps now pass, including the three that previously failed. SQL bodies confirmed unchanged by `grep -v '^--'`.
- **Committed in:** `1018fe5`

**3. [Rule 2 - Missing Critical] Added a behavioral proof of the narrow; constraint text alone does not prove it**
- **Found during:** Task 3
- **Issue:** The plan's acceptance criteria stop at asserting that `pg_get_constraintdef` *contains the substring* `open_capacity = false`. The plan's own `must_haves.truths` claim something stronger — that two same-date open bookings both commit and that exclusive overlaps still fail. A predicate can read correctly and still behave wrongly (wrong column semantics, a stale index, a NULL-valued flag defeating `= false`). Shipping this as "verified" on substring evidence alone would leave every downstream Phase-9 plan resting on an unproven arbiter.
- **Fix:** Executed the three-case proof above (A/B/C) against the live DB inside `BEGIN … ROLLBACK` blocks, using existing seed rows, so nothing was persisted.
- **Files modified:** none (scratchpad SQL only)
- **Verification:** A committed 2 rows; B raised `23P01`; C committed 2 rows. Output recorded verbatim above.
- **Committed in:** n/a (verification-only, evidence in this summary)

**4. [Rule 3 - Blocking] Docker daemon was not running**
- **Found during:** Task 3
- **Issue:** `npm run db:up` failed — `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`.
- **Fix:** Launched Docker Desktop, polled `docker info` then `pg_isready` until both were ready, then started `fitout-db-1` (`postgis/postgis:18-3.6`).
- **Files modified:** none
- **Verification:** `docker compose ps` shows the container up on 5432; `npm run db:migrate` exits 0.
- **Committed in:** n/a (environment)

**5. [Rule 1 - Bug] The plan's prescribed enum comment named an enum that does not exist in this repo**
- **Found during:** Task 1
- **Issue:** The prescribed schema.ts comment reads "`booking_group_status` / `rsvp_status` were BRAND-NEW enums". There is no `booking_group_status` enum in `schema.ts` or in `drizzle/0017`; the two brand-new enums were `occupancy_mode` and `rsvp_status`. Since this comment's entire job is to be the accurate record of why the 55P04 exemption no longer applies, a wrong premise inside it is exactly the kind of alibi the plan told me to eliminate.
- **Fix:** Wrote "`occupancy_mode` / `rsvp_status` were BRAND-NEW enums in drizzle/0017". Also preserved the D-116 `rsvp_status` sentence the plan's replacement block would have silently dropped.
- **Files modified:** `src/lib/db/schema.ts`
- **Verification:** `npx tsc --noEmit` exit 0; the stale "v1 NEVER writes another value" line is gone (`grep -c` prints 0).
- **Committed in:** `060bce2`

---

**Total deviations:** 5 auto-fixed (2 blocking, 2 bug, 1 missing-critical)
**Impact on plan:** No scope creep — every deviation kept the plan's own stated intent when its literal instructions could not deliver it. Deviations 1 and 2 preserve the 55P04 split and the grep tripwires; deviation 3 upgrades the evidence to match the plan's own must-haves; deviation 5 removes a false statement from a load-bearing comment.

## Issues Encountered

- **`psql -U postgres` fails** — the container provisions `POSTGRES_USER: fitout`, not `postgres`. Later plans reading the live schema should use `docker compose exec -T db psql -U fitout -d fitout`.

## Observation for Later Plans (not a defect here)

Proof C shows an exclusive booking can be inserted on a date that already has open admissions — open rows are simply absent from the index, so they block nothing. That is correct and intended: `occupancy_mode` is a **per-listing** property, so open and exclusive rows should never coexist on one listing in the first place. The guard is upstream, not in the DDL: OC-16 ("mode editable until a live booking exists") and the 09-06 publish gate are what keep a host from flipping a listing's mode out from under live bookings. Worth a glance in 09-06.

## Threat Flags

None — no new network endpoint, auth path, or trust-boundary surface. `per_head_price_cents` is public listing pricing and `open_capacity` is a public availability fact (T-09-04, accepted).

Threat register dispositions discharged:
- **T-09-01** (over-wide narrow) — mitigated: live `pg_get_constraintdef` recorded verbatim; the status complement is byte-unchanged.
- **T-09-02** (55P04 migration DoS) — mitigated: split applied live with exit 0; grep gate proves no later migration names the literal.
- **T-09-03** (default direction) — mitigated: `NOT NULL DEFAULT false` confirmed live, so an INSERT omitting the flag falls UNDER the EXCLUDE (fail-safe direction).

## User Setup Required

None — no external service configuration required. Note that the local Postgres container must be running (`npm run db:up`) for every later Phase-9 plan with an integration test.

## Next Phase Readiness

- **09-02 (`createOpenCapacityHold`) is unblocked** — `booking.open_capacity` and `booking.declared_pax` exist live, and the EXCLUDE no longer stands in the way of the advisory-lock counter.
- **09-03's two-connection race gate is unblocked** — the fresh-schema replay path used by `makeRacingClients` is green against the full 23-migration chain.
- **09-06 (publish gate) is unblocked** — `per_head_price_cents` exists to be publish-required for open mode, and `max_occupancy` is unchanged as the D-124 cap.
- No blockers.

## Self-Check: PASSED

All 9 claimed files exist on disk; both claimed commit hashes (`060bce2`, `1018fe5`) resolve in `git log`.

---
*Phase: 09-open-capacity-bookings*
*Completed: 2026-07-30*
