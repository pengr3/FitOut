---
phase: 08-group-bookings
plan: 01
subsystem: database
tags: [drizzle, postgres, migration, group-bookings, rsvp, pgenum, partial-unique-index]

# Dependency graph
requires:
  - phase: 07-bookings-management-cancellation-notifications
    provides: booking/listing/notification schema + drizzle migration + isolated-schema test harness conventions
  - phase: 03-availability-double-booking
    provides: booking table, GiST EXCLUDE keystone, tests/helpers/db.ts replay harness
provides:
  - booking_group table (unique booking_id FK restrict, capacity_snapshot, access_token, voided_at) — the D-111 cap authority + D-118 invite-credential column
  - rsvp table (nullable user_id, no money column, yes/no status) — the GPAY-01 foundation
  - occupancy_mode ('exclusive' only, D-109) + rsvp_status ('yes'|'no') pgEnums
  - listing.included/extra_head_fee + booking.declared_pax pax-pricing columns (D-108, backfill-free)
  - three partial-unique rsvp de-dup indexes (group_id,user_id) / (group_id,guest_email_norm) / manage_token — the T-08-01 de-dup gate
  - migration 0017_group_bookings applied to live DB + harness-safe replay
affects: [08-02 token+seat-claim, 08-03 rsvp surfaces, 08-04 notification four-file change, 08-pricing pax surcharge, all downstream Phase-8 plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Brand-new pgEnum CREATE TYPE + first-use may share ONE migration (55P04 split is ADD-VALUE-only) — mirrors cancellationPolicy / 0013"
    - "Backfill-free ADD COLUMN (nullable or defaulted) — mirrors 0013/0016"
    - "Partial-unique de-dup index via uniqueIndex(...).on(...).where(sql`... IS NOT NULL`) — mirrors booking_idem_uq"
    - "Hand-edit generated migration to strip `\"public\".` → unqualified names for isolated-schema harness replay — mirrors 0013"

key-files:
  created:
    - drizzle/0017_group_bookings.sql
    - drizzle/meta/0017_snapshot.json
  modified:
    - src/lib/db/schema.ts
    - drizzle/meta/_journal.json

key-decisions:
  - "Followed the 0013 migration convention (unqualified names, plain CREATE TYPE) rather than the plan's literal `CREATE TYPE ... IF NOT EXISTS` — Postgres has no IF NOT EXISTS for CREATE TYPE; idempotency comes from drizzle's journal (live DB) + fresh-schema replay (harness)"
  - "Added a third partial-unique index (manage_token) alongside the two identity de-dup indexes, per the plan interfaces block"

patterns-established:
  - "booking_group is a HISTORY record: booking_id UNIQUE FK onDelete restrict (a booking that owns a group cannot be hard-deleted)"
  - "rsvp identity is nullable + de-duped at the DB, never at the app: partial-unique (group_id,user_id) and (group_id,guest_email_norm); name-only guests intentionally NOT de-duped (D-117)"

requirements-completed: [GROUP-01, GROUP-03, GROUP-05]

# Metrics
duration: 17min
completed: 2026-07-27
---

# Phase 8 Plan 01: Group-Bookings Data Foundation Summary

**Migration 0017 lays the entire Phase-8 data floor — booking_group + rsvp tables, the occupancy_mode/rsvp_status enums, the D-108 pax-pricing columns, and the three partial-unique RSVP de-dup indexes — all backfill-free and harness-safe.**

## Performance

- **Duration:** ~17 min
- **Started:** 2026-07-27T16:57:00+08:00
- **Completed:** 2026-07-27T17:14:00+08:00
- **Tasks:** 2
- **Files modified:** 4 (1 source, 3 migration artifacts)

## Accomplishments
- `booking_group` table: `booking_id` UNIQUE FK (onDelete restrict — a group is history, D-115), notNull `capacity_snapshot` (the D-111 cap authority the seat-claim reads, never live `maxOccupancy`), unique notNull `access_token` (the D-118 bearer invite credential), nullable `voided_at` (D-121 soft-void).
- `rsvp` table: NULLABLE `user_id` FK (D-115/D-116 guest-or-account identity), NO money column (organizer pays; cost-splitting is v2), `guest_name`/`guest_email_norm`/`manage_token`, `rsvp_status` answer.
- Two brand-new pgEnums: `occupancy_mode` with EXACTLY one value `exclusive` (D-109; Phase 9 adds more) and `rsvp_status` (`yes`|`no`).
- D-108 pax-pricing columns, all backfill-free: `listing.occupancy_mode` (NOT NULL default `exclusive`), `listing.included` + `listing.extra_head_fee` (nullable), `booking.declared_pax` (nullable).
- Three partial-unique de-dup indexes on `rsvp` — `(group_id,user_id) WHERE user_id IS NOT NULL`, `(group_id,guest_email_norm) WHERE guest_email_norm IS NOT NULL`, `manage_token WHERE manage_token IS NOT NULL` — the T-08-01 gate that makes a duplicate-RSVP race unable to inflate the roster.
- Migration 0017 applied to the live DB via `db:migrate` (idempotent no-op on re-run) and verified to replay into an isolated schema (exclusion-race harness green).
- Scope respected: `notification_type` enum / `NotificationPayload` union untouched (owned by 08-04); NO payment/booking column changed (D-107).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add enums, tables, columns, and de-dup indexes to schema.ts** - `229c8c5` (feat)
2. **Task 2: [BLOCKING] Generate migration 0017, hand-edit for harness idempotency, and db:migrate** - `f46cb5d` (feat)

**Plan metadata:** _(final docs commit — this SUMMARY + STATE + ROADMAP + REQUIREMENTS)_

## Files Created/Modified
- `src/lib/db/schema.ts` - Added `occupancyMode`/`rsvpStatus` pgEnums; `listing.occupancyMode`/`included`/`extraHeadFee`; `booking.declaredPax`; `bookingGroup` + `rsvp` pgTable defs; three partial-unique `rsvp` indexes.
- `drizzle/0017_group_bookings.sql` - Hand-edited generated migration (unqualified names): CREATE TYPE x2, CREATE TABLE x2, ADD COLUMN x4, 3 FKs, 3 partial-unique indexes.
- `drizzle/meta/0017_snapshot.json` - drizzle-kit schema snapshot for 0017.
- `drizzle/meta/_journal.json` - Journal entry idx 17, tag renamed `0017_fuzzy_mysterio` → `0017_group_bookings`.

## Decisions Made
- **Migration convention over literal instruction.** The plan asked for `IF NOT EXISTS` guards including `CREATE TYPE ... IF NOT EXISTS`. Postgres does not support `IF NOT EXISTS` on `CREATE TYPE`, and the direct structural analog (drizzle/0013 — Phase-7's brand-new-enums + tables migration) does not use `IF NOT EXISTS` at all: it strips `"public".` to unqualified names and relies on drizzle's journal (live-DB idempotency) + the harness's fresh-schema DROP/CREATE (replay idempotency). Followed 0013 exactly; verified both idempotency paths (re-run no-op + exclusion-race green).
- **Third partial-unique index included.** The frontmatter artifact mentions "two partial-unique de-dup indexes" but the plan interfaces + action specify three (adding `manage_token WHERE manage_token IS NOT NULL`). Included all three, matching the interfaces contract.

## Deviations from Plan

None functionally — plan executed as written. The one authoring choice (0013 convention vs. the literal `CREATE TYPE ... IF NOT EXISTS`) is documented under Decisions Made; it is a required-correctness alignment (invalid SQL avoided) that satisfies every acceptance criterion, not a scope change.

## Issues Encountered
- `drizzle-kit generate` auto-named the file `0017_fuzzy_mysterio.sql`. Renamed the `.sql` to `0017_group_bookings.sql`, deleted the auto-named file, and updated the journal `tag` to match (drizzle's migrator reads `${tag}.sql`). The snapshot is keyed by idx (`0017_snapshot.json`) so it needed no rename.
- `drizzle-kit migrate` does not auto-load `.env.local` (known toolchain gotcha) — sourced `DATABASE_URL` for the generate/migrate commands.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The group tables are live and available to every downstream Phase-8 plan. 08-02 can now build `token.ts` (populates `access_token`/`manage_token`) and `seat-claim.ts` (the `SELECT ... FOR UPDATE` counting confirmed RSVPs against `capacity_snapshot`).
- The four-file notification change and the `notification_type` group values remain for 08-04 (separate migration 0018).
- The D-108 pax-surcharge pricing wiring (`pricing.ts`, `placeHold`, breakdown) reads `listing.included`/`extra_head_fee` + `booking.declared_pax` — columns are now present.

## Self-Check: PASSED

- Files verified present: `src/lib/db/schema.ts`, `drizzle/0017_group_bookings.sql`, `drizzle/meta/0017_snapshot.json`, `08-01-SUMMARY.md`.
- Commits verified in git log: `229c8c5` (Task 1), `f46cb5d` (Task 2).
- Migration `.sql` filename matches journal `tag` (`0017_group_bookings`).

---
*Phase: 08-group-bookings*
*Completed: 2026-07-27*
