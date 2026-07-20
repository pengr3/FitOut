---
phase: 06-full-booking-payment-integration
plan: 01
subsystem: database
tags: [postgres, drizzle, enum, exclusion-constraint, gist, migrations, request-to-book, config]

# Dependency graph
requires:
  - phase: 03-availability-double-booking
    provides: "booking_no_overlap GiST EXCLUDE (0005) + bookingStatus enum — the double-booking keystone this plan widens"
  - phase: 04-booking-core-search
    provides: "booking hold lifecycle columns (0006) + createPendingHold — the occupancy rows the new states extend"
  - phase: 05-payments
    provides: "src/lib/payments/config.ts named-config idiom (COMMISSION_RATE_BPS etc.) this plan extends"
provides:
  - "booking_status enum values 'requested' + 'approved' (live DB + schema declaration) — the request-to-book slot-holding states (D-63)"
  - "booking_no_overlap EXCLUDE widened to occupy {pending,confirmed,requested,approved} so a requested/approved slot blocks double-booking (T-06-01)"
  - "booking.bookingMode nullable snapshot column (D-61 creation-time mode capture)"
  - "listing.bookingMode DB default flipped 'request' -> 'instant' (D-62 demand-first)"
  - "APPROVAL_SLA_HOURS + APPROVAL_PAYMENT_WINDOW_HOURS config constants (D-64, default 24)"
affects: [06-02, 06-03, 06-04, 06-05, 06-06, 06-07, 06-08, 06-09, request-to-book, approval-sweep, host-requests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Enum ADD VALUE + its first USE split into separate migration files (0010 add / 0012 use)"
    - "EXCLUDE partial-WHERE written as the COMPLEMENT of the free set to stay single-transaction-safe against drizzle-orm's one-transaction migrator (55P04 avoidance)"

key-files:
  created:
    - drizzle/0010_booking_request_states.sql
    - drizzle/0011_booking_request_columns.sql
    - drizzle/0012_booking_exclusion_v2.sql
    - drizzle/meta/0010_snapshot.json
    - drizzle/meta/0011_snapshot.json
    - drizzle/meta/0012_snapshot.json
  modified:
    - src/lib/db/schema.ts
    - src/lib/payments/config.ts
    - .env.example
    - drizzle/meta/_journal.json

key-decisions:
  - "0012 EXCLUDE WHERE encoded as complement `status NOT IN ('cancelled','declined','completed')` (set-equivalent to the four-status occupying list) so `npm run db:migrate` applies in one transaction on already-migrated DBs — the plan's literal positive list raised 55P04"
  - "booking.bookingMode is a nullable display/audit snapshot; lifecycle correctness rests on `status`, not this column (D-61)"
  - "Snapshots produced by one real `drizzle-kit generate` run (correct end-state) then copied forward to 0011/0012; SQL hand-split into the 3-file chain"

patterns-established:
  - "Widen an EXCLUDE occupying-status set by DROP + re-ADD (Postgres has no ALTER CONSTRAINT ... WHERE), expressed as the complement of free statuses so new enum values are never named as literals in the same transaction as their ADD VALUE"

requirements-completed: []  # BOOK-04/BOOK-05/PAY-05 are CROSS-CUTTING — schema substrate only here; completed by the downstream plans that ship the request-to-book behavior (per 04-xx/05-xx precedent)

# Metrics
duration: ~30min
completed: 2026-07-20
---

# Phase 6 Plan 01: Request-to-Book Schema Foundation Summary

**Added the `requested`/`approved` booking-status holding states and widened the `booking_no_overlap` GiST EXCLUDE so request-to-book slots block double-booking, plus the D-61/D-62 booking-mode columns and D-64 SLA config — all applied live via a 3-migration enum-split chain.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-07-20
- **Completed:** 2026-07-20
- **Tasks:** 2
- **Files modified:** 10 (6 created, 4 modified)

## Accomplishments
- Live `booking_status` enum now carries `requested` + `approved` (7 values total), in sync with the schema declaration.
- `booking_no_overlap` EXCLUDE now occupies `{pending, confirmed, requested, approved}` — proven to reject a `requested`-vs-`pending` overlap — closing the request-to-book double-booking hole (T-06-01) BEFORE any downstream plan inserts those rows.
- `booking.bookingMode` nullable snapshot column added (D-61); `listing.bookingMode` DB default flipped `request` -> `instant` (D-62).
- `APPROVAL_SLA_HOURS` + `APPROVAL_PAYMENT_WINDOW_HOURS` (default 24) added to `config.ts` and `.env.example` (D-64).
- Migrations 0010 (enum-add) / 0011 (columns+default) / 0012 (EXCLUDE recreate) applied to the live dev DB; re-run is a clean no-op; full booking/paymongo/payments suite 100/100 green (harness replays all three).

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema + config edits and hand-author migrations 0010/0011/0012** - `060d790` (feat)
2. **Task 2 [BLOCKING]: Apply migrations to the live DB + 0012 complement fix** - `a27f05f` (fix)

**Plan metadata:** _(final docs commit — this summary + STATE/ROADMAP/REQUIREMENTS)_

## Files Created/Modified
- `drizzle/0010_booking_request_states.sql` - ONLY `ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'requested'/'approved'` (split from first USE, Pitfall 2)
- `drizzle/0011_booking_request_columns.sql` - nullable `booking.booking_mode` ADD COLUMN + `listing.booking_mode` SET DEFAULT 'instant'
- `drizzle/0012_booking_exclusion_v2.sql` - DROP + re-ADD `booking_no_overlap` with the widened occupying set (complement encoding)
- `drizzle/meta/0010_snapshot.json` + `0011` + `0012` - end-state snapshots (0010 from a real generate run; 0011/0012 copied forward)
- `drizzle/meta/_journal.json` - appended idx 10/11/12 entries
- `src/lib/db/schema.ts` - appended enum values, added booking.bookingMode column, flipped listing default, updated EXCLUDE prose comment
- `src/lib/payments/config.ts` - `APPROVAL_SLA_HOURS` + `APPROVAL_PAYMENT_WINDOW_HOURS`
- `.env.example` - the two new keys with `24` defaults

## Decisions Made
- **0012 EXCLUDE as the complement of the free set.** The plan specified `WHERE status IN ('pending','confirmed','requested','approved')`. That is unappliable via `npm run db:migrate` because drizzle-orm's postgres-js migrator wraps ALL pending migrations in ONE transaction (`pg-core/dialect session.transaction(...)`), so naming the `requested`/`approved` values (ADDed in 0010) in the same transaction raises Postgres `55P04` on any DB where `booking_status` was already committed (this dev DB, staging, production). The set-equivalent complement `WHERE status NOT IN ('cancelled','declined','completed')` names only already-committed values, applies cleanly in one transaction on fresh + incremental + harness DBs, and is the safer default (an unknown future status defaults to OCCUPYING/blocking). Verified equivalent behavior: a `requested` row rejects an overlapping `pending` insert.
- **Snapshot strategy.** Ran one real `drizzle-kit generate` to obtain a CORRECT end-state snapshot (enum + column + default), then hand-split the SQL into the plan's 3-file chain and copied that snapshot forward to 0011/0012, keeping drizzle's diff state consistent for future `generate` runs (avoids the stale-snapshot re-detection trap).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 0012 EXCLUDE WHERE rewritten as the complement to make `npm run db:migrate` applyable**
- **Found during:** Task 2 (Apply migrations to the live DB)
- **Issue:** The plan's literal `WHERE status IN ('pending','confirmed','requested','approved')` raised `55P04 unsafe use of new enum value` and rolled back the entire migrate. Root cause (confirmed in `node_modules/drizzle-orm/pg-core/dialect.cjs`): the migrator wraps all pending migrations in a SINGLE transaction, so the file-split alone does NOT put 0010's `ADD VALUE` and 0012's USE in separate transactions on an already-migrated DB. A `status::text` cast is not an option (enum->text is STABLE; index predicates require IMMUTABLE).
- **Fix:** Rewrote the 0012 predicate as the set-equivalent complement `WHERE status NOT IN ('cancelled','declined','completed')` and updated the schema.ts EXCLUDE prose comment to document the encoding + rationale.
- **Files modified:** drizzle/0012_booking_exclusion_v2.sql, src/lib/db/schema.ts
- **Verification:** `npm run db:migrate` exits 0 and reports 3 applied; re-run no-op; live constraint def = `WHERE status <> ALL (cancelled,declined,completed)`; a `requested` row rejects an overlapping `pending` insert; 100/100 tests green.
- **Committed in:** a27f05f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The deviation is essential — without it the BLOCKING migration step cannot complete on any already-migrated DB (including production). The occupying-status set and the double-booking guarantee are preserved exactly; only the SQL encoding of an equivalent predicate changed. No scope creep.

## Issues Encountered
- **drizzle-kit swallows the underlying PG error.** The first `npm run db:migrate` exited 1 showing only benign NOTICEs. Diagnosis required inspecting the migrator source (one-transaction wrapping) and reproducing the `55P04` in a throwaway schema. Resolved by the complement encoding above.
- **`drizzle-kit migrate` does not auto-load `.env.local`.** It reads `process.env.DATABASE_URL` directly, which was undefined. Sourced `DATABASE_URL` from `.env.local` for the migrate command only (the vitest DATABASE_URL warning does NOT apply to `db:migrate`).

## User Setup Required
None - no external service configuration required. The two new env keys (`APPROVAL_SLA_HOURS`, `APPROVAL_PAYMENT_WINDOW_HOURS`) have working `24` defaults and are documented in `.env.example`.

## Next Phase Readiness
- The live DB carries the new enum values + widened EXCLUDE, so downstream Phase-6 plans can insert `requested`/`approved` rows and rely on the double-booking block. **The 06-02 concurrent double-book-on-requested/approved race test is the downstream correctness proof.**
- **Requirement note:** BOOK-04 / BOOK-05 / PAY-05 stay In-progress — this plan ships only the schema/config substrate; the request-to-book behavior (host approve/decline, instant/request fork, pay-on-approval) is built by the plans that follow (per the 04-xx/05-xx cross-cutting precedent).
- **Downstream reminder:** every read/occupancy predicate that filters bookings must mirror the occupying set `{pending,confirmed,requested,approved}` (or the equivalent complement) or a requested/approved slot will read as free.

## Self-Check: PASSED

- All 6 migration/snapshot files + SUMMARY.md exist on disk.
- Both task commits present in git history: `060d790` (Task 1), `a27f05f` (Task 2).
- Live DB verified: `booking_status` has requested+approved; `booking.booking_mode` nullable; `listing.booking_mode` default `'instant'`; `booking_no_overlap` occupies `{pending,confirmed,requested,approved}`; migrate re-run is a no-op; 100/100 tests green.

---
*Phase: 06-full-booking-payment-integration*
*Completed: 2026-07-20*
