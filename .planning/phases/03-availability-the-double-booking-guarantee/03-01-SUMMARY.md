---
phase: 03-availability-the-double-booking-guarantee
plan: 01
subsystem: database
tags: [postgres, drizzle, gist-exclusion-constraint, btree_gist, tstzrange, booking, availability, react-day-picker, date-fns, vitest, concurrency]

# Dependency graph
requires:
  - phase: 02-listings-host-onboarding
    provides: listing table (FK root for availability tables) + per-worker-schema test harness + hand-authored-migration conventions (0001_enable_postgis)
provides:
  - "booking occupancy table + booking_no_overlap GiST EXCLUDE constraint (the DB-atomic double-booking authority, D-21/D-28)"
  - "operating_hours + availability_block tables (schema foundation for AVAIL-01/02 host editing, wired in later plans)"
  - "listing.unitCount (D-21) + listing.timezone (D-27, IANA) columns"
  - "bookingStatus pgEnum (pending/confirmed/cancelled/declined/completed) — Phase 4 owns the state machine"
  - "makeRacingClients(schema, n) test helper — independent connections for genuine concurrency (SC#4)"
  - "src/lib/pg.ts isPgError(e, code) — SQLSTATE detection helper"
  - "react-day-picker@10 + date-fns@4 + @date-fns/tz@1 installed; shadcn calendar/toggle/toggle-group/scroll-area added"
  - "SC#4 proof: tests/availability/exclusion-race.test.ts (two-connection race, multi-unit, back-to-back, partial-WHERE freeing)"
affects: [03-02, 03-03, 03-04, 03-05, Phase-4-booking-core, Phase-8-group-bookings]

# Tech tracking
tech-stack:
  added: [react-day-picker@10.0.1, date-fns@4.4.0, "@date-fns/tz@1.5.0", "btree_gist (PG extension)", "shadcn: calendar/toggle/toggle-group/scroll-area"]
  patterns: ["GiST EXCLUDE partial constraint via hand-authored trailing migration", "half-open '[)' tstzrange range semantics", "two-connection concurrency test (Promise.allSettled)", "timestamptz-everywhere"]

key-files:
  created: [drizzle/0004_availability_tables.sql, drizzle/0005_booking_exclusion.sql, src/lib/pg.ts, tests/availability/exclusion-race.test.ts, src/components/ui/calendar.tsx, src/components/ui/toggle.tsx, src/components/ui/toggle-group.tsx, src/components/ui/scroll-area.tsx]
  modified: [src/lib/db/schema.ts, tests/helpers/db.ts, package.json]

key-decisions:
  - "The booking_no_overlap GiST EXCLUDE constraint (listing_id =, unit =, tstzrange('[)') &&) WHERE status IN ('pending','confirmed') is the ONLY double-booking authority — no app-level conflict check anywhere (D-21/D-28)"
  - "A genuine two-connection concurrent race can surface 40P01 (deadlock_detected) as well as 23P01 (exclusion_violation); both are DB-atomic rejections that prevent the double-book — Phase-4 error mapping must treat 40P01 like 23P01"
  - "Bare integer unit (1..unitCount) — named units deferred; constraint is forward-compatible (unit WITH =)"
  - "booking.bookerId onDelete: restrict (A5 — bookings are financial records, never cascade-deleted)"

patterns-established:
  - "GiST EXCLUDE constraint: hand-authored trailing migration (Drizzle can't express EXCLUDE, issues #2813/#3388), btree_gist WITH SCHEMA public + IF NOT EXISTS for idempotent test-harness replay, columns unqualified, --> statement-breakpoint between statements"
  - "Half-open '[)' tstzrange everywhere (constraint + future read model + unit-assignment SELECT) so back-to-back hours don't false-conflict"
  - "Genuine concurrency test: makeRacingClients + Promise.allSettled; assert exactly one survivor + a conflict SQLSTATE (never one max:1 connection)"

requirements-completed: []  # AVAIL-01/02/03 are advanced (schema foundation) but NOT user-facing-complete here — the host actions/UI (03-03/03-04) and calendar (03-05) finish them; REQUIREMENTS.md is flipped at the Phase-3 transition per repo convention

# Metrics
duration: 10min
completed: 2026-07-11
---

# Phase 3 Plan 01: Availability Foundation & the Double-Booking Guarantee Summary

**Postgres GiST `EXCLUDE` constraint + `booking` occupancy table that make two overlapping bookings for the same (listing, unit) structurally impossible — proven by a genuine two-connection concurrent-insert race (SC#4) — plus the `operating_hours`/`availability_block` schema, unitCount/timezone columns, and the availability stack (react-day-picker/date-fns/shadcn calendar).**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-11T04:15:21Z
- **Completed:** 2026-07-11T04:24:53Z
- **Tasks:** 3
- **Files modified/created:** 15

## Accomplishments

- **The keystone:** hand-authored `drizzle/0005_booking_exclusion.sql` installs `btree_gist` and adds `booking_no_overlap EXCLUDE USING gist (listing_id =, unit =, tstzrange("starts_at","ends_at",'[)') &&) WHERE status IN ('pending','confirmed')`. Applied to the live DB — `booking_no_overlap` confirmed in `pg_constraint`.
- **Schema foundation:** `operating_hours`, `availability_block`, `booking` tables + `bookingStatus` enum + `listing.unitCount`/`timezone` columns added to `src/lib/db/schema.ts` (all timestamps `timestamptz`); generated `drizzle/0004_availability_tables.sql` matches the 0002 shape.
- **SC#4 proven:** `tests/availability/exclusion-race.test.ts` — genuine two-connection race (one survivor, loser DB-rejected), multi-unit parallelism, back-to-back `'[)'` boundary, and partial-WHERE slot freeing. All 4 behaviors green, non-flaky across repeated runs.
- **Downstream enablers:** `makeRacingClients` (independent connections for real concurrency), `src/lib/pg.ts` `isPgError`, `react-day-picker@10`/`date-fns@4`/`@date-fns/tz@1`, and shadcn `calendar`/`toggle`/`toggle-group`/`scroll-area`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install deps, add makeRacingClients + isPgError** — `5ee56b9` (chore)
2. **Task 2: [BLOCKING] Schema tables + hand-authored EXCLUDE migration + apply to live DB** — `99a9fd8` (feat)
3. **Task 3: SC#4 two-connection exclusion-race test** — `c7b6994` (test)

_Note: Task 2 is the constraint implementation (applied to the live DB); Task 3 is the regression-guard test. Ordering is implementation-before-test by design because `db:migrate` is a blocking side effect that must land first (see TDD Gate Compliance)._

## Files Created/Modified

- `src/lib/db/schema.ts` — added `unitCount`/`timezone` to `listing`; `bookingStatus` enum; `operating_hours`, `availability_block`, `booking` tables + relations (comment points to 0005 for the EXCLUDE)
- `drizzle/0004_availability_tables.sql` — generated: `booking_status` enum + 3 tables + FKs + indexes + 2 listing columns
- `drizzle/0005_booking_exclusion.sql` — HAND-AUTHORED: `btree_gist` + `booking_no_overlap` EXCLUDE constraint
- `drizzle/meta/_journal.json` + `0004_snapshot.json` + `0005_snapshot.json` — migration journal/snapshots
- `src/lib/pg.ts` — `isPgError(e, code)` SQLSTATE narrowing helper
- `tests/helpers/db.ts` — added `makeRacingClients(schema, n)` (independent connections; the existing `makeClient` is `max:1` and serializes)
- `tests/availability/exclusion-race.test.ts` — the SC#4 gate (4 behaviors)
- `src/components/ui/{calendar,toggle,toggle-group,scroll-area}.tsx` — shadcn official-registry components
- `package.json` / `package-lock.json` — `react-day-picker@10`, `date-fns@4`, `@date-fns/tz@1` (no `@tanstack/react-query` — correctness-first Server Components)

## Decisions Made

- **The EXCLUDE constraint is the sole double-booking authority** (D-21/D-28) — no app-level "query-then-insert" (forbidden by CLAUDE.md).
- **`'[)'` half-open bound** in the constraint so 10–11 and 11–12 don't false-conflict while genuine overlaps are rejected; this must be reused identically in the future read model / unit-assignment SELECT.
- **Positive occupying-status list** `IN ('pending','confirmed')` (not `status <> 'cancelled'`) so adding a future non-occupying status needs no constraint change.
- **`bookerId onDelete: restrict`** (A5) — bookings are financial records, never cascade-deleted.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Genuine concurrent race surfaces 40P01 (deadlock), not only 23P01**
- **Found during:** Task 3 (SC#4 exclusion-race test)
- **Issue:** RESEARCH § Code Examples and the plan's `must_haves` truth #1 asserted the losing racer is rejected specifically with `23P01`. In practice, a *genuine* two-connection concurrent race (Promise.allSettled) reliably produces `40P01 deadlock_detected`: both backends insert their row, then each blocks on the other's uncommitted conflicting row under the GiST exclusion check → Postgres detects the wait cycle and aborts exactly one transaction. Asserting `23P01` on the concurrent case failed (the loser was `40P01`).
- **Fix:** The genuine-race case now asserts the loser's SQLSTATE is a *conflict* code — `23P01` (exclusion_violation, if the winner committed first) OR `40P01` (deadlock_detected, concurrent insert-then-block) — plus the invariant that exactly one row survives. Both outcomes are DB-atomic rejections that prevent the double-book. The sequential/deterministic cases (multi-unit 3rd insert, back-to-back partial overlap) still assert `23P01` exactly, so exclusion_violation remains directly proven and grepped.
- **Files modified:** tests/availability/exclusion-race.test.ts
- **Verification:** `npx vitest run tests/availability/exclusion-race.test.ts` green 3× consecutively (non-flaky); the sequential cases still deterministically produce `23P01`.
- **Committed in:** `c7b6994` (Task 3 commit)
- **Forward impact:** Phase-4 `createBooking` error-mapping must treat `40P01` like `23P01` ("that time was just taken — retry"), not as an unexpected 500. The retry-on-conflict loop (RESEARCH Pattern 2) should catch both codes. Recorded as a blocker/decision for 03-02.

---

**Total deviations:** 1 auto-fixed (1 bug — test assertion corrected to match real DB concurrency behavior).
**Impact on plan:** No scope change; the correctness guarantee (SC#4: two overlapping inserts cannot both succeed, exactly one survives) is fully proven and strengthened. The finding tightens Phase-4's error handling (40P01 must be handled).

## TDD Gate Compliance

This plan carries `tdd="true"` on Task 3, but its RED/GREEN ordering is deliberately inverted relative to the classic cycle:

- **GREEN gate (`feat`):** `99a9fd8` — the `booking_no_overlap` constraint (Task 2). The plan ordered the `[BLOCKING] db:migrate` first because it is a live side effect that later plans in the phase depend on; a literal test-first RED would have required the constraint to be absent from the live DB.
- **RED-equivalent (`test`):** `c7b6994` — the SC#4 regression guard (Task 3). It is a genuine guard: it asserts a *rejection* (conflict SQLSTATE) plus exactly-one-surviving-row, so it goes RED the instant `0005` stops applying. During authoring it did fail against reality (the 40P01 finding above), which confirms it is not a false-positive.
- **Gate sequence note:** git log shows `feat` (GREEN) then `test` (RED-guard), the reverse of the standard `test → feat` order, because of the blocking-migration ordering. No REFACTOR commit was needed.

## Issues Encountered

- **Deadlock vs exclusion_violation under true concurrency** — resolved by accepting both conflict SQLSTATEs on the concurrent case (see Deviation 1). Benign `NOTICE` output during `db:migrate` (`schema "drizzle" already exists`) is expected (drizzle's own migration bookkeeping) and non-blocking.

## User Setup Required

None — no external service configuration required. `btree_gist` was installed on the live DB by the migration; the local `postgis/postgis:18-3.6` container already had it available.

## Next Phase Readiness

- **Ready for Wave 2 (03-02 / 03-03):** the `booking`/`operating_hours`/`availability_block` tables + constraint are live and replay cleanly in the test harness; `isPgError`, `makeRacingClients`, and the `'[)'`/occupying-status conventions are established for the read model and unit-assignment logic.
- **Ready for Wave 3 (03-04 / 03-05):** `react-day-picker`/`date-fns`/`@date-fns/tz` and shadcn `calendar`/`toggle`/`toggle-group`/`scroll-area` are installed; `listing.timezone` carries the venue IANA tz for calendar display.
- **Carry-forward for Phase 4:** booking error-mapping must treat `40P01` (deadlock) as a "slot just taken" conflict alongside `23P01`. AVAIL-01/02/03 are foundation-only here — their host actions/UI (03-03/03-04) and the calendar (03-05) complete them; REQUIREMENTS.md checkboxes are flipped at the Phase-3 transition (matching the repo convention where Phase-2's LIST/PAY IDs remain "Pending" until transition).

## Self-Check: PASSED

- All 9 tracked created files present on disk (migrations, `src/lib/pg.ts`, the SC#4 test, 4 shadcn components, SUMMARY).
- All 3 task commits found in git log (`5ee56b9`, `99a9fd8`, `c7b6994`).
- `booking_no_overlap` confirmed in the live DB `pg_constraint`.

---
*Phase: 03-availability-the-double-booking-guarantee*
*Completed: 2026-07-11*
