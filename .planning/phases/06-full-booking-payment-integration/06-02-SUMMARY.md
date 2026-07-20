---
phase: 06-full-booking-payment-integration
plan: 02
subsystem: availability
tags: [occupancy-predicate, request-to-book, exclusion-constraint, lazy-expiry, createPendingHold, in-tx-sweep, tdd]

# Dependency graph
requires:
  - phase: 06-full-booking-payment-integration
    plan: 01
    provides: "booking_status +requested/+approved (D-63) + booking_no_overlap EXCLUDE widened to occupy {pending,confirmed,requested,approved} (complement encoding) + booking.bookingMode snapshot column"
  - phase: 04-booking-core-search
    provides: "createPendingHold SAVEPOINT/40P01-retry/idempotency transaction + the lazy-expiry read-model occupancy predicate this plan widens"
provides:
  - "read-model.ts occupancy predicate widened to include requested/approved (unexpired) — the calendar + search Stage-2 now see a request-held slot as occupied (T-06-03)"
  - "units.ts findOwnActiveHold + pickLowestFreeUnit widened to the same occupying set (lockstep with the EXCLUDE)"
  - "createPendingHold parameterized by { holdStatus, ttlMs, bookingMode } with pending/15-min defaults — the 06-04 request branch mints a `requested` hold WITHOUT forking the transaction (T-06-05)"
  - "in-tx stale-hold sweep widened to reclaim lapsed pending/requested/approved rows; terminal status mirrors the 06-06 SLA cron (requested→declined, else→cancelled) (T-06-05b, Warning-1)"
  - "the non-negotiable concurrent-double-book race gate on requested AND approved slots (makeRacingClients, exactly-one-survivor) — the phase correctness proof (T-06-04)"
affects: [06-04, 06-06, 06-07, request-to-book, approval-sweep]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Widen every lazy-read occupancy predicate in LOCKSTEP with the DB EXCLUDE occupying set (read-model + findOwnActiveHold + pickLowestFreeUnit + in-tx sweep) — a single missed site reads a held slot as free"
    - "In-tx stale-hold reclaim terminal status written as a CASE mirroring the scheduled cron's mapping (::booking_status cast — an all-literal CASE resolves to text and cannot assign to the enum column)"
    - "createPendingHold parameterized in place (holdStatus/ttlMs/bookingMode) — NEVER fork the SAVEPOINT/40P01-retry/idempotency machinery (previously-solved 04-04 races stay solved)"

key-files:
  created:
    - tests/booking/request-lifecycle.test.ts
    - tests/booking/request-expiry.test.ts
  modified:
    - src/lib/availability/read-model.ts
    - src/lib/availability/units.ts

key-decisions:
  - "In-tx sweep terminal status = (CASE WHEN status='requested' THEN 'declined' ELSE 'cancelled' END)::booking_status, expires_at=NULL — mirrors the 06-06 SLA cron so the terminal value never depends on which write path (in-tx reclaim vs cron) wins (Warning-1). The ::booking_status cast is required because an all-literal CASE resolves to `text`, which cannot assign to the enum column."
  - "No email fired in the in-tx sweep — a Resend call inside the hold's SAVEPOINT/rollback/retry tx is unsafe; the cron is the SOLE booker-email authority and the dropped email on the rare in-tx-reclaim edge is accepted bounded race A6."
  - "createPendingHold parameterized in place; the instant call site (booking.ts placeHold) is untouched and its DB result is unchanged (status='pending', expires_at=now()+15min, bookingMode=NULL)."
  - "The concurrent double-book race on requested/approved was ALREADY green off 06-01's widened EXCLUDE — the app-predicate widening is what the occupancy + sweep-write-target tests prove; the race test locks the DB gate in as a regression guard."

requirements-completed: []  # BOOK-05/PAY-05 stay In-progress — this plan ships the cross-cutting occupancy substrate; the request-to-book behavior (host approve/decline, pay-on-approval, SLA cron) ships in 06-04/06-06/06-07 (per the 04-xx/05-xx cross-cutting precedent)

# Metrics
duration: ~20min
completed: 2026-07-20
---

# Phase 6 Plan 02: Occupancy-Predicate Fan-Out + createPendingHold Parameterization Summary

**Widened every application-side lazy-read occupancy predicate (calendar/search read model, own-hold probe, find-free probe, in-tx stale sweep) to treat `requested`/`approved` as slot-holding in lockstep with 06-01's widened GiST EXCLUDE, parameterized `createPendingHold` by `{ holdStatus, ttlMs, bookingMode }` so the 06-04 request branch mints a `requested` hold without forking the transaction, mapped the in-tx reclaim terminal status to the 06-06 SLA cron, and landed the non-negotiable concurrent double-book race gate on requested AND approved slots.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-20
- **Completed:** 2026-07-20
- **Tasks:** 2 (TDD: RED test scaffold → GREEN implementation)
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- **The occupancy fan-out is closed.** Every site that reads booking occupancy now mirrors the occupying set `{pending,confirmed,requested,approved}` (or its complement): `read-model.ts:108` (calendar + search Stage-2 transitively), `units.ts` `findOwnActiveHold`, `pickLowestFreeUnit`, the in-tx stale sweep, and the dormant `createBooking` probe. A request-held slot can no longer read as free anywhere.
- **The non-negotiable phase gate is green.** A genuine two-connection concurrent overlapping insert (`makeRacingClients`) against a `requested` slot AND against an `approved` slot is rejected at the DB (23P01/40P01) — exactly one row survives (BOOK-05/BOOK-03/T-06-04).
- **`createPendingHold` is parameterized in place.** `{ holdStatus?: 'pending'|'requested', ttlMs?, bookingMode? }` with `pending`/15-min defaults — the instant call site is byte-for-byte unchanged (status pending, expires_at now()+15min, bookingMode NULL) and the 06-04 request branch can mint a `requested` hold with the 24h SLA TTL WITHOUT re-implementing the SAVEPOINT/40P01-retry/idempotency machinery (T-06-05).
- **The in-tx reclaim terminal status mirrors the 06-06 SLA cron (Warning-1).** A lapsed `requested` row reclaimed in the same transaction is flipped to `declined` (the cron's decline target), a lapsed `pending`/`approved` to `cancelled` — so the terminal value never depends on which write path wins. No email fires in-tx (A6; the cron is the sole booker-email authority).
- **Wave-0 scaffolds landed.** `request-expiry.test.ts` carries the DB-clock-manip harness + `it.todo` placeholders the 06-06 SLA/payment-window cron tests fill in.

## Task Commits

Each task was committed atomically:

1. **Task 1 [TDD RED]: Wave-0 request-to-book gate — race + occupancy + param + sweep-write-target tests** - `e11e4c1` (test)
2. **Task 2 [TDD GREEN]: widen occupancy fan-out + parameterize createPendingHold + conditional sweep terminal** - `d761cd6` (feat)

**Plan metadata:** _(final docs commit — this summary + STATE/ROADMAP)_

## Files Created/Modified
- `tests/booking/request-lifecycle.test.ts` (created) - the requested+approved concurrent-double-book race (exactly-one-survivor), a cross-mode collision (requested blocks an instant pending hold), the getAvailability occupancy fan-out (requested/approved occupy; lapsed reads free), the `createPendingHold` `{ holdStatus, ttlMs, bookingMode }` parameterization, and the in-tx sweep WRITE-TARGET (requested→declined / approved|pending→cancelled). Uses `makeRacingClients` for the genuine race.
- `tests/booking/request-expiry.test.ts` (created) - setupTestDb boilerplate + the DB-clock-manip idiom (one real test) + `it.todo` placeholders for the 06-06 SLA auto-decline + payment-window auto-release cron sweeps.
- `src/lib/availability/read-model.ts` (modified) - occupancy predicate widened to `(status='confirmed' OR (status IN ('pending','requested','approved') AND expires_at > now()))`; comment (100-109) updated to state requested/approved occupy and reference 0012.
- `src/lib/availability/units.ts` (modified) - `findOwnActiveHold` + `pickLowestFreeUnit` predicates widened identically; in-tx stale sweep WHERE widened + terminal status CASE (`::booking_status` cast) + `expires_at=NULL`; `CreatePendingHoldInput` extended with `holdStatus`/`ttlMs`/`bookingMode`; internals default to pending/HOLD_TTL_MS/null and the insert mints `holdStatus` + `now()+ttlMs` + `bookingMode`; dormant `createBooking` probe widened to the full occupying set with a dormancy note.

## Decisions Made
- **In-tx sweep terminal status as a `::booking_status`-cast CASE mirroring the 06-06 cron.** `SET status = (CASE WHEN status = 'requested' THEN 'declined' ELSE 'cancelled' END)::booking_status, expires_at = NULL`. The cast is load-bearing: an all-string-literal CASE resolves to Postgres `text`, which cannot assign to the enum column (would raise "column is of type booking_status but expression is of type text"). All three literals are long-committed enum values, so the runtime cast is safe (unlike 06-01's migration-time 55P04, which was a NEW-value-in-same-tx problem). Verified against both the isolated test schema (enum resolves via search_path) and prod (public).
- **The race gate was already green off 06-01's EXCLUDE.** The DB widening in 06-01/drizzle/0012 already rejects a concurrent requested/approved overlap, so the two race tests passed before Task 2. The genuinely RED tests (occupancy-occupied, holdStatus param, bookingMode persist, sweep write-target) are the ones the app-predicate widening turns green — the race tests lock the DB gate in as a regression guard (they go red the moment 0012 stops applying).
- **Parameterize in place, never fork.** `createPendingHold`'s SAVEPOINT/40P01-outer-retry/own-hold-idempotency/23505-backstop machinery (04-04 findings) is untouched — only the status/TTL/mode become parameters. This keeps the previously-solved D-42 races solved (T-06-05).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical correctness] Added a `::booking_status` cast to the in-tx sweep CASE**
- **Found during:** Task 2 (widening the in-tx sweep terminal status)
- **Issue:** The plan specified `SET status = CASE WHEN status = 'requested' THEN 'declined' ELSE 'cancelled' END`. An all-string-literal CASE resolves to `text` in Postgres, which cannot be assigned to the `booking_status` enum column (runtime error).
- **Fix:** Wrapped the CASE in `(...)::booking_status`. Documented the rationale inline.
- **Files modified:** src/lib/availability/units.ts
- **Verification:** The Task-1 sweep-write-target tests are green (requested→declined, approved/pending→cancelled); full quick suite 113 green.
- **Committed in:** d761cd6 (Task 2 commit)

**2. [Rule 2 - Missing critical functionality] `bookingMode` snapshot persisted + a dedicated test**
- **Found during:** Task 2 (parameterizing createPendingHold)
- **Issue:** The plan's `<interfaces>` says to "Persist bookingMode into the booking.bookingMode snapshot column (06-01) when provided," but the Task-1 behavior list didn't explicitly assert it. Left unwired, the D-61 creation-time snapshot the 06-04 request branch relies on would silently be NULL.
- **Fix:** Threaded `bookingMode` through `CreatePendingHoldInput` → the insert, and added a Task-1 assertion (`persists bookingMode into the creation-time snapshot column when provided`).
- **Files modified:** src/lib/availability/units.ts, tests/booking/request-lifecycle.test.ts
- **Verification:** The bookingMode-persist test is green.
- **Committed in:** e11e4c1 (test) + d761cd6 (feat)

---

**Total deviations:** 2 auto-fixed (both Rule 2 correctness). No architectural changes; no scope creep. The occupying-status set, double-booking guarantee, and instant-hold behavior are preserved exactly.

## Issues Encountered
None beyond the two auto-fixed items above. Docker (`fitout-db-1`) was already up; vitest ran with no `DATABASE_URL` shell override per the project gotcha (`.env.local` is the source).

## Verification
- `npx vitest run tests/booking/request-lifecycle.test.ts` — requested + approved race gates + occupancy fan-out + createPendingHold param + sweep write-target all green.
- `npx vitest run tests/booking tests/paymongo tests/payments` — 113 passed, 4 todo (instant flow unregressed).
- `npx vitest run tests/availability tests/search` — 101 passed (read-model widening has no regression on the calendar/search paths).
- `npx tsc --noEmit` — exit 0.
- `npx eslint` on all 4 touched files — exit 0.

## Known Stubs
None. `request-expiry.test.ts`'s `it.todo` placeholders are intentional Wave-0 scaffolds for the 06-06 SLA/payment-window cron (documented in-file); they name the cron cases the 06-06 plan fills against this same harness and do not block this plan's goal (the occupancy fan-out + the race gate are fully wired and green).

## Next Phase Readiness
- **06-04 (request branch)** can call `createPendingHold(db, { …, holdStatus: 'requested', ttlMs: APPROVAL_SLA_HOURS*3.6e6, bookingMode: 'request' })` to mint a request-to-book hold that occupies the slot for the SLA window — no transaction fork needed.
- **06-06 (SLA / payment-window cron)** must assign the SAME terminal statuses the in-tx sweep now uses: `requested → declined`, `approved → cancelled` (Warning-1). The cron is the sole booker-email authority; the in-tx sweep deliberately fires no email (A6). `request-expiry.test.ts` carries the DB-clock-manip harness + `it.todo` cases to fill.
- **Downstream reminder (still in force):** any NEW read/occupancy predicate must mirror the occupying set `{pending,confirmed,requested,approved}` (or the complement) or a requested/approved slot reads as free.

## Self-Check: PASSED

- All 4 files exist on disk (2 created test files, 2 modified source files).
- Both task commits present in git history: `e11e4c1` (Task 1 test), `d761cd6` (Task 2 feat).
- Acceptance markers verified: `requested` appears in both read-model.ts + units.ts; `holdStatus` declared (139) + defaulted (220) + used in the insert (281); the in-tx sweep CASE `WHEN status = 'requested' THEN 'declined'` present (256).
- Suites green: quick suite 113 passed / 4 todo; availability+search 101 passed; tsc exit 0; eslint exit 0.

---
*Phase: 06-full-booking-payment-integration*
*Completed: 2026-07-20*
