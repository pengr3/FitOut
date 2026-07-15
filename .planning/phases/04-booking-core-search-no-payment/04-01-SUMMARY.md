---
phase: 04-booking-core-search-no-payment
plan: 01
subsystem: database
tags: [postgres, drizzle, migration, availability, booking, timestamptz, gist, idempotency]

# Dependency graph
requires:
  - phase: 03-availability-double-booking
    provides: booking occupancy table + booking_no_overlap GiST EXCLUDE + getAvailability read model + the '[)' half-open bound convention
provides:
  - "booking pending-hold lifecycle columns on the LIVE DB: expiresAt, quotedTotalCents, currency (default php), idempotencyKey"
  - "booking_idem_uq partial-unique index (WHERE idempotency_key IS NOT NULL) — D-42 double-click backstop"
  - "listing_location_geog_gist GiST index over (location::geography) — Phase-4 radius-search perf seam"
  - "lazy-expiry occupancy predicate in the single availability read model: stale pending holds read as FREE (D-48a)"
affects: [04-02-hold-transaction, 04-03-search, 04-pricing, 04-reserve-confirm, phase-05-payments]

# Tech tracking
tech-stack:
  added: []  # no new runtime dependencies (RESEARCH Package Legitimacy Audit)
  patterns:
    - "Lazy-expiry occupancy via SQL now() (DB transaction clock), not an injectable wall clock"
    - "Partial-unique index scoped to non-NULL (Drizzle .where()) — expressible in schema, unlike EXCLUDE"
    - "Hand-authored functional GiST index via drizzle generate --custom + IF NOT EXISTS for harness replay"

key-files:
  created:
    - drizzle/0006_booking_hold.sql
    - drizzle/0007_booking_location_geog.sql
  modified:
    - src/lib/db/schema.ts
    - src/lib/availability/read-model.ts
    - tests/availability/read-model.test.ts

key-decisions:
  - "Reuse 'cancelled' status for abandoned holds (D-49/A3) — NO new 'expired' enum value"
  - "Lazy-expiry gate uses SQL now() (one DB clock), never the injectable now: Date param (Pitfall 7)"
  - "Idempotency index is Drizzle-expressible (partial-unique .where); only the EXCLUDE constraint stays hand-authored"

patterns-established:
  - "Lazy-expiry occupancy predicate: (status='confirmed' OR (status='pending' AND expires_at > now())) — reused verbatim by search Stage-2 + the hold probe downstream"
  - "Hand-authored functional/perf index: drizzle generate --custom (empty SQL + copied snapshot + journal entry), IF NOT EXISTS + unqualified columns for isolated-schema replay"

requirements-completed: [BOOK-02]

# Metrics
duration: 15min
completed: 2026-07-15
---

# Phase 04 Plan 01: Booking-Hold Columns & Lazy-Expiry Read Model Summary

**Landed the pending-hold data substrate on the live DB (expiry, frozen price snapshot, idempotency key + partial-unique index) and taught the single availability read model to treat a stale pending hold as FREE via SQL `now()` — the shared foundation the whole phase sits on.**

## Performance

- **Duration:** ~15 min (task commits span 11:01–11:11 +08; +setup/reads)
- **Started:** 2026-07-15T02:56:00Z (approx)
- **Completed:** 2026-07-15T03:11:00Z (approx)
- **Tasks:** 3 (Task 3 followed a RED→GREEN TDD cycle)
- **Files modified:** 8 (5 source/migration + journal + 2 meta snapshots)

## Accomplishments
- **4 pending-hold columns added to `booking` and applied to the LIVE DB** (verified in `information_schema`, not just a green build): `expires_at` (nullable hold TTL), `quoted_total_cents` (Phase-5 charge-integrity snapshot), `currency` (default `php`), `idempotency_key` (nullable client token).
- **`booking_idem_uq` partial-unique index** (`WHERE idempotency_key IS NOT NULL`) — the D-42 double-click backstop; many token-less holds coexist.
- **Lazy-expiry occupancy predicate** in `read-model.ts`: a `pending` hold past its `expires_at` no longer occupies — correctness rests on the DB clock (`now()`) with no background worker (D-48). The `'[)'` bound + listing scope stay byte-identical to the `booking_no_overlap` EXCLUDE.
- **`listing_location_geog_gist`** hand-authored GiST index over `(location::geography)` — the perf seam Phase-4 radius search needs (the existing geometry index does not serve the `::geography` cast).
- **Regression proof:** 3 new integration cases (stale-pending → free, live-pending → occupies, confirmed-NULL → occupies); full suite **223/223 green**, `tsc` clean, `drizzle-kit check` clean, no pending schema diff.

## Task Commits

Each task was committed atomically:

1. **Task 1: booking hold columns + idempotency index + generate 0006** — `e0a79d4` (feat)
2. **Task 2: [BLOCKING] apply 0006+0007 to live DB + hand-author geography index** — `48caa39` (feat)
3. **Task 3: lazy-expiry occupancy predicate + regression test** (TDD)
   - RED — failing lazy-expiry cases — `5ecdff6` (test)
   - GREEN — lazy-expiry predicate in read model — `935ae42` (feat)

**Plan metadata:** committed via `docs(04-01): complete booking-hold + lazy-expiry plan` (this SUMMARY + STATE/ROADMAP/REQUIREMENTS).

_Task 3 (tdd=true) produced the RED→GREEN pair. Task 1 (tdd=true) is a schema/migration task with no behavioral RED/GREEN — verified structurally via `tsc` + `drizzle-kit check` + generated-SQL grep._

## Files Created/Modified
- `src/lib/db/schema.ts` — added 4 booking columns + `booking_idem_uq` partial-unique index; imported `sql`; kept the load-bearing EXCLUDE comment accurate (hold columns go through generate; only EXCLUDE is hand-authored).
- `drizzle/0006_booking_hold.sql` — generated ADD COLUMN ×4 + `CREATE UNIQUE INDEX booking_idem_uq ... WHERE idempotency_key IS NOT NULL`.
- `drizzle/0007_booking_location_geog.sql` — hand-authored `CREATE INDEX IF NOT EXISTS listing_location_geog_gist ON listing USING gist ((location::geography))`.
- `src/lib/availability/read-model.ts` — occupancy predicate swapped to `(status='confirmed' OR (status='pending' AND expires_at > now()))`; comment documents the SQL-`now()`/Pitfall-7 rationale.
- `tests/availability/read-model.test.ts` — +3 cases (stale/live pending, confirmed-NULL) with expiries set vs the REAL wall clock (predicate uses SQL `now()`, not the injected `NOW`).
- `drizzle/meta/_journal.json`, `drizzle/meta/0006_snapshot.json`, `drizzle/meta/0007_snapshot.json` — migration bookkeeping.

## Decisions Made
- **Reuse `cancelled` for abandoned holds (D-49/A3)** — no `expired` enum value, so no non-transactional `ALTER TYPE`.
- **SQL `now()` for the expiry cut (Pitfall 7)** — the injectable `now: Date` param stays strictly for slot past/horizon state; one DB clock avoids skew between the lazy read and the downstream sweep.
- **Idempotency index in the schema, not hand-authored** — Drizzle expresses partial-unique via `.where()`; only the GiST EXCLUDE remains beyond Drizzle.
- **Geography index kept optional but added now** — `IF NOT EXISTS` + unqualified columns so `tests/helpers/db.ts` replays it idempotently into every isolated schema.

## Deviations from Plan

None — plan executed exactly as written. All three threat-register mitigations were honored: T-04-RANGE (`'[)'` bound + listing scope unchanged, all inputs parameter-bound), T-04-CLOCK (SQL `now()`, no wall clock), T-04-MIGRATE ([BLOCKING] live-DB `information_schema` proof, not a green build alone).

## Issues Encountered
- **Exact migration filenames required explicit flags.** The plan's `<verify>` references bare `npm run db:generate`, but `drizzle-kit generate` auto-assigns a random migration name. To satisfy the load-bearing `must_haves` artifact filenames, Task 1 used `drizzle-kit generate --name booking_hold` (→ `0006_booking_hold.sql`) and Task 2 used `drizzle-kit generate --custom --name booking_location_geog` (→ empty custom SQL + copied snapshot + journal entry, the same mechanism that produced hand-authored `0001`/`0005`). This is command-mechanics, not a change to the plan's logic.
- **`drizzle-kit migrate` needs `DATABASE_URL` in the environment.** Ran migrate with `DATABASE_URL` set explicitly (`.env.local` value); the migrate NOTICEs ("schema drizzle already exists") are benign — the tracking table pre-existed from 0000–0005.

## User Setup Required
None — no external service configuration required. Docker Postgres (`fitout-db-1`) was already running; migrations applied to the local live DB.

## Next Phase Readiness
- **The [BLOCKING] schema substrate is live.** Downstream Plan 04-02 (the WR-03 hold transaction: outer-40P01 retry + per-unit SAVEPOINT + in-tx sweep) and the search plans can build on the new columns and the modified `read-model.ts` **without editing them** — the lazy-expiry predicate is reused verbatim by search Stage-2.
- `quoted_total_cents` + `currency` are in place for the Phase-4 frozen price snapshot (D-49) and Phase-5 charge integrity.
- No blockers introduced. The double-booking authority remains the DB `booking_no_overlap` EXCLUDE (unchanged); no app-level query-then-insert was added.

## Self-Check: PASSED
- Files verified present: `src/lib/db/schema.ts`, `src/lib/availability/read-model.ts`, `tests/availability/read-model.test.ts`, `drizzle/0006_booking_hold.sql`, `drizzle/0007_booking_location_geog.sql`.
- Commits verified in git log: `e0a79d4`, `48caa39`, `5ecdff6`, `935ae42`.
- Live-DB proof: `public.booking` carries all 4 columns; `booking_idem_uq` + `listing_location_geog_gist` indexes present; 8 migrations recorded.
- Suite: 37 files / 223 tests passed; `tsc --noEmit` clean; `drizzle-kit generate` reports no pending diff.

---
*Phase: 04-booking-core-search-no-payment*
*Completed: 2026-07-15*
