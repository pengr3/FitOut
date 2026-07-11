---
phase: 03-availability-the-double-booking-guarantee
plan: 02
subsystem: availability
tags: [tzdate, date-fns, timezone, dst, postgres, drizzle, tstzrange, read-model, concurrency, 23P01, 40P01, booking, vitest]

# Dependency graph
requires:
  - phase: 03-availability-the-double-booking-guarantee (Plan 01)
    provides: "booking/operating_hours/availability_block tables + booking_no_overlap GiST EXCLUDE constraint; listing.unitCount/timezone; src/lib/pg.ts isPgError; @date-fns/tz installed; per-worker isolated-schema test harness"
provides:
  - "src/lib/availability/slots.ts — DST-correct TZDate slot enumeration (slotsForWindow), venue-tz day-of-week (venueDayOfWeek), horizon (D-26, 90d) + start>now gating; BOOKING_HORIZON_DAYS"
  - "src/lib/availability/read-model.ts — getAvailability(db, listingId, dayLocal, now): on-the-fly per-slot free-unit counts from operating hours − blocks − occupying bookings, venue-tz, identical '[)' overlap as the constraint"
  - "src/lib/availability/units.ts — createBooking find-free-unit + retry-on-conflict (23P01/40P01) bounded by unitCount; mapBookingError → clean SC#4 message; NoUnitAvailableError"
  - "DbConn type (PostgresJsDatabase<Record<string, unknown>>) — accepts both the prod schema-typed db and the schemaless isolated-schema test db"
affects: [03-05-booker-calendar, Phase-4-booking-core, Phase-8-group-bookings]

# Tech tracking
tech-stack:
  added: []
  patterns: ["TZDate venue-local wall-clock → UTC instant (normalized via new Date(getTime()).toISOString())", "SQL-fetch-raw + TS-compose split for the availability read model", "retry-on-conflict (23P01/40P01) unit auto-assignment with the DB constraint as the sole authority", "bind ISO strings (not Date) into raw drizzle sql range templates"]

key-files:
  created:
    - src/lib/availability/slots.ts
    - src/lib/availability/read-model.ts
    - src/lib/availability/units.ts
    - tests/availability/slots.test.ts
    - tests/availability/read-model.test.ts
    - tests/availability/error-map.test.ts
    - tests/availability/units.test.ts
  modified: []

key-decisions:
  - "TZDate.toISOString() renders the OFFSET-LOCAL form (e.g. '…+08:00'), NOT UTC 'Z' — the true UTC instant must be taken from the epoch: new Date(tzDate.getTime()).toISOString(). The plan's snippet used tzDate.toISOString() directly (subtly wrong); all slot/day-window instants normalize through the epoch."
  - "postgres.js rejects a JS Date bound into a raw drizzle `sql` range template via db.execute (ERR_INVALID_ARG_TYPE at reset.str). Bind ISO strings into raw sql (postgres.js casts string→timestamptz); keep Date only for the drizzle timestamptz INSERT."
  - "createBooking/mapBookingError treat 40P01 (deadlock_detected) identically to 23P01 (exclusion_violation) — the 03-01 finding — so a genuine concurrent race never surfaces a raw 500."
  - "read-model/units accept a widened DbConn = PostgresJsDatabase<Record<string, unknown>> so BOTH the prod schema-typed db and the schemaless isolated-schema test db type-check (the plan's literal `typeof db` would reject testDb.db)."

patterns-established:
  - "DST-correct slot math: build every instant with TZDate from a venue-local wall clock, never fixed-ms arithmetic; normalize to a UTC 'Z' string via the epoch"
  - "Availability read model: SQL fetches raw overlapping rows with tstzrange('[)') && the day window; TS composes the slot grid and free-unit counts (whole-listing block ⇒ 0 free)"
  - "Unit auto-assignment: advisory find-free SELECT + retry-on-conflict bounded by unitCount; correctness rests on the EXCLUDE constraint, not the SELECT; 23P01 and 40P01 both retry/map cleanly"

requirements-completed: []  # AVAIL-03 is the server-authoritative read model here, but the user-facing calendar (03-05) completes it; REQUIREMENTS.md is flipped at the Phase-3 transition per repo convention (matches 03-01)

# Metrics
duration: 12min
completed: 2026-07-11
---

# Phase 3 Plan 02: Server-Side Availability Correctness Layer Summary

**DST-correct TZDate slot math, the on-the-fly availability read model (per-slot free-unit counts from operating hours − blocks − occupying bookings, in the venue tz), and the `createBooking` find-free-unit + retry-on-23P01/40P01 path that maps a lost race to the clean "That time was just taken" message — all unit/integration tested against the real EXCLUDE constraint.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-11T04:32:08Z
- **Completed:** 2026-07-11T04:44:29Z
- **Tasks:** 3
- **Files created:** 7 (3 lib + 4 tests); 0 modified

## Accomplishments

- **`slots.ts` (DST-correct, region-capable):** `slotsForWindow` enumerates on-the-hour 60-min slots by building each instant with `TZDate` from a venue-local wall clock — never fixed-ms arithmetic. `venueDayOfWeek` computes day-of-week in the venue tz; `isWithinHorizon`/`slotStartsInFuture` gate on the D-26 90-day horizon and start>now. Proven: 6:00 Asia/Manila → `2026-07-31T22:00:00.000Z`, and a New York winter/summer spot-check shows the same wall-clock hour maps to different UTC instants (DST handled).
- **`read-model.ts` (`getAvailability`, AVAIL-03):** the single server-authoritative source of a day's availability. SQL fetches the raw overlapping rows (hours for the venue-local dow; blocks; pending/confirmed bookings) using the **identical `tstzrange('[)')`** bound as the constraint; TS composes per-slot free-unit counts — a whole-listing block ⇒ 0 free, a unit-scoped block/booking subtracts one unit, cancelled/declined never occupy. States: available / unavailable / past / beyond_horizon.
- **`units.ts` (`createBooking`, the Phase-4 insert path):** advisory find-free SELECT + retry-on-conflict bounded by `unitCount`; correctness rests on the EXCLUDE constraint, not the SELECT. `mapBookingError` maps `NoUnitAvailableError`/`23P01`/`40P01` to the exact SC#4 copy and re-throws unknown errors (never a swallowed 500). Integration-proven: unitCount=2 with unit 1 busy auto-assigns unit 2; a fresh window returns unit 1; unitCount=1 exhaustion throws `NoUnitAvailableError` and funnels to the clean message.
- **Full suite green:** `tests/availability` = 5 files / 33 tests (incl. Plan 01's exclusion-race); whole repo suite 34 files / 171 tests; `tsc --noEmit` and `eslint` clean.

## Task Commits

Each task was committed atomically (Task 1 is TDD: RED test → GREEN impl):

1. **Task 1 (RED): failing slot-enumeration test** — `5ce95fc` (test)
2. **Task 1 (GREEN): slots.ts DST-correct enumeration** — `b7ce054` (feat)
3. **Task 2: read-model.ts + integration test** — `5ddd151` (feat)
4. **Task 3: units.ts + error-map + integration test** — `eb4e63a` (feat)

**Plan metadata:** (this SUMMARY + STATE/ROADMAP) — final docs commit.

## Files Created/Modified

- `src/lib/availability/slots.ts` — pure TZDate slot math: `slotsForWindow`, `venueDayOfWeek`, `slotStartsInFuture`, `isWithinHorizon`, `BOOKING_HORIZON_DAYS`
- `src/lib/availability/read-model.ts` — `getAvailability` + exported types (`SlotState`, `AvailabilitySlot`, `DayAvailability`, `DbConn`)
- `src/lib/availability/units.ts` — `createBooking`, `mapBookingError`, `NoUnitAvailableError`, `CreateBookingInput`
- `tests/availability/slots.test.ts` — pure unit (Manila mapping, venueDayOfWeek, horizon/future gating, NY DST spot-check)
- `tests/availability/read-model.test.ts` — integration (no-hours, 3-slot window, unit block, whole block, booked, cancelled-does-not-occupy)
- `tests/availability/error-map.test.ts` — pure unit (NoUnitAvailableError/23P01/40P01 → clean; unknown re-throws)
- `tests/availability/units.test.ts` — integration (auto-assign unit 2 / fresh unit 1 / exhaustion → clean message)

## Decisions Made

- **UTC via the epoch, not `TZDate.toISOString()`.** `@date-fns/tz`'s `TZDate` overrides `toISOString()` to render the offset-local form; the true UTC instant comes from `new Date(tzDate.getTime()).toISOString()`. Applied to slot instants and the day-window bounds.
- **ISO strings into raw `sql` range binds, `Date` into the drizzle INSERT.** postgres.js throws on a `Date` param bound into a raw `sql` template executed via `db.execute`; strings cast cleanly to `timestamptz`. The drizzle timestamptz column INSERT still takes a `Date`.
- **40P01 == 23P01 for booking conflicts** (03-01 carry-forward) — both retry in `createBooking` and both map to the clean message.
- **Widened `DbConn` type** so the read model / booking path accept both the prod schema-typed db and the schemaless isolated-schema test db.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `TZDate.toISOString()` returns offset-local form, not UTC 'Z'**
- **Found during:** Task 1 (GREEN — slots.ts)
- **Issue:** The plan's code snippet used `start.toISOString()`, but `@date-fns/tz` `TZDate.toISOString()` renders `2026-08-01T06:00:00.000+08:00`, not the UTC instant `2026-07-31T22:00:00.000Z`. The RED test (which encodes the correct UTC-Z expectation) failed on this.
- **Fix:** Normalize each instant through the epoch: `new Date(tzDate.getTime()).toISOString()`. Same fix applied to the read model's day-window bounds.
- **Files modified:** src/lib/availability/slots.ts (and applied in read-model.ts)
- **Verification:** `tests/availability/slots.test.ts` green (14/14), incl. the Manila 6:00 → `2026-07-31T22:00:00.000Z` assertion and the NY DST spot-check.
- **Committed in:** `b7ce054` (Task 1 GREEN)

**2. [Rule 1 - Bug] postgres.js rejects a `Date` bound into a raw `sql` range template**
- **Found during:** Task 3 (units.ts integration test)
- **Issue:** `createBooking`'s find-free SELECT bound `Date` objects into `tstzrange(${startsAt}, ${endsAt}, '[)')` via `db.execute`, raising `ERR_INVALID_ARG_TYPE` (`reset.str … Received an instance of Date`). The read model had already avoided this by binding ISO strings.
- **Fix:** Bind `startsAt.toISOString()`/`endsAt.toISOString()` into the raw `sql` probe (postgres.js casts string→timestamptz); keep `Date` for the drizzle `booking` INSERT (its timestamptz column expects `Date`).
- **Files modified:** src/lib/availability/units.ts
- **Verification:** `tests/availability/units.test.ts` + `error-map.test.ts` green (9/9).
- **Committed in:** `eb4e63a` (Task 3)

**3. [Rule 3 - Blocking] Widened the `dbConn` parameter type**
- **Found during:** Task 2 (read-model.ts typecheck)
- **Issue:** The plan's literal `dbConn: typeof import("@/lib/db").db` (schema-typed) does NOT accept the test harness's `testDb.db` — its type is `PostgresJsDatabase<Record<string, unknown>>` (the schemaless `ReturnType<typeof drizzle>`), and the schema generic is not covariant → `tsc` error TS2345.
- **Fix:** Export `DbConn = PostgresJsDatabase<Record<string, unknown>>` from read-model.ts and use it in both `getAvailability` and `createBooking`. Verified the prod schema-typed `db` is still assignable (Plan 05 safe).
- **Files modified:** src/lib/availability/read-model.ts, src/lib/availability/units.ts
- **Verification:** `tsc --noEmit` clean; a scratch probe confirmed both `db` (prod) and `testDb.db` type-check as arguments.
- **Committed in:** `5ddd151` (read-model), `eb4e63a` (units)

---

**Total deviations:** 3 auto-fixed (2 bugs in the plan's code snippets, 1 blocking type-correctness). No scope change; all necessary to make the plan's own tests/tsc pass.
**Impact on plan:** The correctness contract is unchanged and fully met — the two bug fixes are exactly the kind the phase exists to prevent (a timezone/UTC bug and a param-binding bug). SC#2 (venue-tz) and SC#4 (clean "just taken", no raw 500) are proven.

## Issues Encountered

- **`TZDate.toISOString()` and `Date`-in-raw-sql** — both surfaced as failing tests and were resolved as above (Deviations 1 & 2). No other issues; every timestamp stays `timestamptz`/UTC and the read model reuses the constraint's exact `'[)'` bound.

## User Setup Required

None — no external service configuration required. All work runs against the existing local `postgis/postgis:18` container and the migrations already applied in Plan 01.

## Next Phase Readiness

- **Ready for 03-05 (booker calendar):** `getAvailability` is the server-authoritative feed (venue-tz, per-slot free-unit counts + states); `listing.timezone` drives display. The calendar renders from this and must gate selectability on `deriveBookable` (do not bypass).
- **Ready for Phase 4 (booking core):** `createBooking` is the safe insert path (find-free + retry-on-23P01/40P01, constraint as the sole authority); `mapBookingError` gives the clean user surface. Phase 4 wires the real hold/checkout flow around it and should reuse the ISO-string-into-raw-sql + Date-into-insert convention.
- **AVAIL-03** is server-complete here (read model) but stays "Pending" in REQUIREMENTS.md until the Phase-3 transition, when the host editors (03-03/03-04) and the booker calendar (03-05) complete the user-facing surface — matching the 03-01 convention.

## Self-Check: PASSED

- All 7 tracked source/test files + the SUMMARY present on disk.
- All 4 task commits found in git log (`5ce95fc`, `b7ce054`, `5ddd151`, `eb4e63a`).
- `tests/availability` green (5 files / 33 tests, incl. Plan 01's exclusion-race); full suite 34 files / 171 tests; `tsc --noEmit` + `eslint` clean.

---
*Phase: 03-availability-the-double-booking-guarantee*
*Completed: 2026-07-11*
