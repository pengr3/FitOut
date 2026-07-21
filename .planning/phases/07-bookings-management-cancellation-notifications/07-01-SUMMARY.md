---
phase: 07-bookings-management-cancellation-notifications
plan: 01
subsystem: data-config-foundation
tags: [schema, migration, config, cancellation, service-fee, notifications, reminders]
requires: []
provides:
  - SERVICE_FEE_BPS
  - HOST_CANCEL_FEE_CENTS
  - MIN_LEAD_REQUEST_HOURS
  - MIN_LEAD_INSTANT_MINUTES
  - MIN_APPROVE_WINDOW_HOURS
  - PRE_EXPIRY_REMINDER_HOURS
  - PRE_SLA_REMINDER_HOURS
  - PRE_SESSION_BOOKER_REMINDER_HOURS
  - PRE_SESSION_HOST_REMINDER_HOURS
  - APPROVAL_PAYMENT_WINDOW_HOURS@12
  - cancellationPolicy
  - ledgerKind
  - cancelledBy
  - notificationType
  - reminderKind
  - NotificationPayload
  - notification
  - bookingReminder
  - booking.spacePriceCents
  - booking.serviceFeeCents
  - booking.refundCents
  - booking.retainedSpaceCents
  - booking.cancellationPolicy
  - booking.cancelledBy
  - booking.cancelledAt
  - booking.declineReason
  - listing.cancellationPolicy
  - hostPayoutLedger.kind
  - hostPayoutLedger.recoveredCents
  - host_payout_ledger_booking_id_kind_unique
affects:
  - src/inngest/functions/payout-sweep.ts
  - tests/booking/request-lifecycle.test.ts
tech-stack:
  added: []
  patterns:
    - "Named config constant with decision-citing doc comment + Number(process.env.X ?? default)"
    - "pgEnum declared before the table it backs (const TDZ)"
    - "jsonb payload typed by a discriminated union via .$type<T>()"
    - "Partial index via .where(sql`...`) for the hot unread-count query"
    - "Composite UNIQUE as an at-most-once claim lock"
key-files:
  created:
    - drizzle/0013_phase7_columns.sql
    - drizzle/0014_phase7_ledger_kind.sql
    - drizzle/meta/0013_snapshot.json
    - drizzle/meta/0014_snapshot.json
  modified:
    - src/lib/payments/config.ts
    - src/lib/db/schema.ts
    - .env.example
    - drizzle/meta/_journal.json
    - drizzle/meta/0011_snapshot.json
    - drizzle/meta/0012_snapshot.json
    - src/inngest/functions/payout-sweep.ts
    - tests/booking/request-lifecycle.test.ts
decisions:
  - "D-95: APPROVAL_PAYMENT_WINDOW_HOURS default 24 -> 12, partially superseding D-64"
  - "D-77: listing.cancellation_policy is nullable with NO default; the publish gate enforces non-null"
  - "D-71: host_payout_ledger at-most-once gate widened UNIQUE(booking_id) -> UNIQUE(booking_id, kind)"
  - "D-79: booking_status left at exactly 7 values so the GiST EXCLUDE predicate never changes"
  - "D-86: notification payload stores pre-composed display strings, never ids joined at read time"
metrics:
  duration: ~50m (incl. a blocking Docker gate resolved by the orchestrator)
  completed: 2026-07-21
  tasks: 3
  commits: 5
---

# Phase 7 Plan 01: Data + Config Foundation Summary

Phase-7's schema and config foundation: ten named tunables, five new pgEnums, eleven new columns across three tables, the `notification` + `booking_reminder` tables, and two migrations applied to the live DB — with the D-21 double-booking keystone proven unchanged.

## What Was Built

**Task 1 — config tunables** (`c8a115a`). Nine new constants in `src/lib/payments/config.ts`, each in the established shape (decision-citing doc comment, then `Number(process.env.X ?? default)`), plus `APPROVAL_PAYMENT_WINDOW_HOURS` moved 24 → 12 per D-95 and rewritten to carry the D-89 do-not-shorten warning. `.env.example` gained a Phase-7 section documenting all ten (commented out, so the code default stays the single source of truth) and an explicit warning that a deployed `APPROVAL_PAYMENT_WINDOW_HOURS=24` silently defeats the new default. The pre-existing uncommented `APPROVAL_PAYMENT_WINDOW_HOURS=24` line in `.env.example` was changed to `12` — left at 24 it would have been exactly the trap the warning describes.

**Task 2 — schema** (`d1344c7`). Five pgEnums (`cancellation_policy`, `ledger_kind`, `cancelled_by`, `notification_type`, `reminder_kind`), each declared before the table it backs. Eight new `booking` columns plus `booking_booker_idx`; `listing.cancellation_policy` nullable with no default (D-77); `host_payout_ledger.kind` + `recovered_cents` with the column-level `.unique()` on `bookingId` replaced by a table-level composite. The `notification` table with a `NotificationPayload` discriminated union covering all eleven types, and the `booking_reminder` at-most-once claim table. `bookingStatus` untouched at exactly 7 values (D-79).

**Task 3 — migrations** (`d283f92`). `0013` generated then hand-edited (header comment, `"public".` qualifiers stripped, constraint swap moved out); `0014` hand-authored with the idempotent price-split backfill and the `UNIQUE(booking_id)` → `UNIQUE(booking_id, kind)` swap. Both journal-registered with chained snapshots.

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Ledger gate shape | Widen to `UNIQUE(booking_id, kind)` rather than a separate `host_fee_ledger` table | D-71 specifies `host_payout_ledger`; 07-RESEARCH Finding 3 named the separate table only as an escape hatch if the constraint surgery proved entangled with live data. It did not — every existing row backfills to `kind='payout'` via the column DEFAULT, so the composite is satisfied by construction. |
| Backfill placement | In `0014`, not `0013` | Keeps the constraint swap and the data it depends on reviewable as one hand-authored unit, matching the `0012` precedent. |
| Notification payload | Display strings in `jsonb`, typed by a discriminated union | D-86 wants history that survives the booking changing state; a live join would let a listing retitle silently rewrite past notifications. |
| Test assertion style | Assert against the imported constant, not a literal | See Deviation 3 — a hardcoded `24` is what broke. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Repaired the drizzle snapshot id chain**
- **Found during:** Task 3, first `npm run db:generate`
- **Issue:** `drizzle-kit generate` failed outright: `[0010,0011,0012_snapshot.json] are pointing to a parent snapshot: 0010_snapshot.json which is a collision.` Snapshots `0010`, `0011` and `0012` were byte-identical copies sharing one `id` and one `prevId` — a Phase-6 hand-authoring artifact, not introduced by this plan. Nothing could be generated at all until this was fixed.
- **Fix:** Rechained `id`/`prevId` for `0011` and `0012` only. Snapshot *content* was verified correct first — `0012_snapshot.json` accurately models the pre-Phase-7 schema (has `booking_mode`, the 7-value `booking_status`, `host_payout_ledger_booking_id_unique`), so the diff `generate` produced contained exactly the Phase-7 additions and no Phase-6 drift.
- **Files modified:** `drizzle/meta/0011_snapshot.json`, `drizzle/meta/0012_snapshot.json`
- **Commit:** `d283f92`

**2. [Rule 1 - Bug] `payout-sweep.payOne` conflict target — OUT OF `files_modified`**
- **Found during:** post-migration verification (surfaced by the orchestrator's `npx vitest run tests/payments`, 6 failed / 45)
- **Issue:** `src/inngest/functions/payout-sweep.ts:125` used `ON CONFLICT (booking_id)`. The `0014` constraint swap removed that unique, so Postgres raised 42P10 "no unique or exclusion constraint matching the ON CONFLICT specification" on every payout claim. Failing: `tests/payments/ledger-freeze.test.ts` (1), `tests/payments/payout-sweep.test.ts` (5). **This is a direct regression from this plan's schema change.**
- **Fix:** Conflict target → `ON CONFLICT (booking_id, kind)`, plus the two comments (file header invariant #1, and `payOne` step 2) that documented the old target. The INSERT omits `kind`, so `NOT NULL DEFAULT 'payout'` applies before conflict resolution and the arbiter matches the composite index. At-most-once for the payout row is preserved exactly; a future `host_cancel_fee` debit row can coexist (D-71).
- **Scope note:** `payout-sweep.ts` is NOT in this plan's `files_modified` — it belongs to plan **07-04** (Wave 2). The fix was kept deliberately minimal: one conflict target and comment accuracy only. The full `kind`-scoping of every ledger query, the fee-exclusion, the retention-gross change (Finding 1) and the debit-netting algorithm (Finding 3) are **07-04's work and were not started here.** The sole justification for touching the file at all is that this plan's own schema change left the tree red.
- **Files modified:** `src/inngest/functions/payout-sweep.ts`
- **Commit:** `d98da80`

**3. [Rule 1 - Bug] Stale approval-window assertion — OUT OF `files_modified`**
- **Found during:** full `npm test`
- **Issue:** `tests/booking/request-lifecycle.test.ts` test (a) asserted `expires_at` fell in a hardcoded 23–25h band. D-95 moved `APPROVAL_PAYMENT_WINDOW_HOURS` 24 → 12, so the literal was stale by design and the test failed. Caused by this plan's Task 1.
- **Fix:** Imported `APPROVAL_PAYMENT_WINDOW_HOURS` and asserted ±1h around it, so the test tracks the constant instead of duplicating it. Test name and comment updated to cite D-95.
- **Scope note:** This file covers `host-requests.ts`, which plan **07-02** is executing against concurrently on this same working tree. The change was confined to the one stale assertion; no behavioural or ownership-relevant code was touched. 07-02's D-94/D-96 cap-and-split work will legitimately revisit this assertion, and the constant-driven form will not fight it.
- **Files modified:** `tests/booking/request-lifecycle.test.ts`
- **Commit:** `d98da80`

### Plan-Text Inaccuracy (no code impact)

Task 1's acceptance criterion states `grep -c "?? 24)" src/lib/payments/config.ts` returns **exactly 2** (`PAYOUT_DELAY_HOURS` and `PRE_SESSION_BOOKER_REMINDER_HOURS`). The correct answer is **3** — the enumeration omits `APPROVAL_SLA_HOURS`, which must remain 24 per D-95 ("24h SLA, 12h payment window"). The criterion's substantive intent — that `APPROVAL_PAYMENT_WINDOW_HOURS` is no longer 24 — passes, and is separately asserted by the regex check in the same criterion block. No code change was warranted.

## Environment Finding (not a Phase-7 deviation)

The live `booking_no_overlap` predicate **did change** during `npm run db:migrate`, but not because of Phase 7. The local `public` schema was stale: Phase 6's `drizzle/0012_booking_exclusion_v2.sql` (D-63, T-06-01, commit `060d790`) had never been applied there. `0012` intentionally widens the keystone from `status = ANY('pending','confirmed')` to `status NOT IN ('cancelled','declined','completed')` — set-equivalent to {pending, confirmed, requested, approved}. So the observed change is Phase 6 catching up on a stale local DB, landing at the predicate the repo has had in source since Phase 6.

The Phase-7 claim holds independently and at two levels:
- **Source:** `drizzle/0005` and `drizzle/0012` are byte-identical to `HEAD`; `grep -c 'booking_no_overlap'` returns **0** in both `0013` and `0014`.
- **Runtime:** `npx vitest run tests/availability` → **85 passed / 8 files, exit 0**.

## Verification Performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` (all modified source files) | clean |
| `npm run db:migrate` | exit 0; second consecutive run also exit 0 (idempotent) |
| Live-DB object check | `notification`, `booking_reminder`, all 8 `booking` columns, `listing.cancellation_policy`, `host_payout_ledger.{kind, recovered_cents}` present |
| `npx vitest run tests/availability` (D-21 gate) | **85 passed, exit 0** |
| `npx vitest run tests/payments` (widened-unique gate) | green after Deviation 2 |
| `grep -c '"public"\.'` in both migrations | 0 |
| `grep -c 'booking_no_overlap'` in both migrations | 0 |
| `bookingStatus` value count | 7 (unchanged) |
| **`npm test` (full suite)** | **59 files / 401 tests, all passing** |

Steps 4–5 of Task 3 (`db:migrate` and the availability gate) were executed by the orchestrator after it resolved the Docker gate; the results above are as it reported them, and `npm test` was re-run here end-to-end afterwards.

### Note on a flaky test

On the first full-suite run, `tests/auth/secret-config.test.ts` failed with a 5000ms timeout. Re-run in isolation it passes (3/3), and it passed in the final full run. This is load-related flakiness in an auth-boot test with no relationship to this plan's changes. **Not fixed — logged here only.** Worth a timeout bump if it recurs.

## Blocking Gate Encountered

Task 3 stalled on infrastructure: the Postgres container was down and the Docker engine would not start (`docker-desktop` WSL distro `Stopped`, `dockerDesktopLinuxEngine` pipe never appearing, despite `Docker Desktop.exe` and `com.docker.backend` both running). Three automated recovery attempts over ~9 minutes failed. Rather than guess, execution stopped and returned a `human-action` checkpoint — deliberately, because `tsc` and `next build` both pass *without* the migration (types come from `schema.ts`, not the live DB), so declaring the plan complete there would have produced a false-positive verification state for all of Phase 7. The orchestrator started Docker and ran the migration and gates.

## Known Stubs

None. Every column, table, enum and constant this plan declares is fully defined and applied; the consuming code paths are downstream plans' scope by design.

## Threat Flags

None. All new surface is covered by the plan's existing threat register (T-07-01..06). Specifically: `notification.payload` carries display strings only — no emails, payment ids or bank details (T-07-04); `notification.recipientId` FK cascades from `user` (T-07-05); the `0014` backfill is `WHERE ... IS NULL`-scoped and therefore idempotent and non-destructive (T-07-03).

## Commits

| Hash | Message |
|---|---|
| `c8a115a` | feat(07-01): add Phase-7 tunables to payments config |
| `d1344c7` | feat(07-01): add Phase-7 enums, columns, tables and indexes to schema |
| `d283f92` | feat(07-01): author Phase-7 migrations 0013 + 0014 |
| `d98da80` | fix(07-01): realign payout claim + approval-window test to the Phase-7 schema |

## For Downstream Plans

- **07-04 (payout sweep):** `payout-sweep.ts` currently has *only* the conflict-target fix. The `AND kind = 'payout'` scoping of `queryDuePayouts`, `queryProcessingLedger`, the reconcile stuck-`held` query, `/host/earnings` and `summarizePayouts` is **still entirely outstanding** — 07-RESEARCH Finding 3 calls this "grep-complete". Until it lands, a `host_cancel_fee` debit row would trip the reconcile alert. Also outstanding: Finding 1's retention-gross change and Finding 2's `space_price_cents` payout basis (the sweep still freezes commission off `quoted_total_cents`).
- **07-02 (expiry cap):** `APPROVAL_PAYMENT_WINDOW_HOURS` is now 12. `tests/booking/request-lifecycle.test.ts` test (a) asserts against the constant, so the D-96 proportional-split work will need to revisit it intentionally rather than trip over a literal.
- **Anyone touching the listing wizard:** `listing.cancellation_policy` is nullable with no default by design (D-77). The non-null requirement belongs on the **publish** gate, not on creation.
- **Anyone writing notifications:** `NotificationPayload` is exhaustive over all eleven `notificationType` values. Adding a type without handling it in the renderer is a compile error — keep it that way.

## Self-Check: PASSED

All claimed files verified present on disk (`drizzle/0013_phase7_columns.sql`, `drizzle/0014_phase7_ledger_kind.sql`, `drizzle/meta/0013_snapshot.json`, `drizzle/meta/0014_snapshot.json`) and all four commit hashes verified in `git log`.
