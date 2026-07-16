---
phase: 05-payments-payouts
plan: 01
subsystem: payments
tags: [commission, payout-ledger, postgres, drizzle, integer-cents, paymongo]

# Dependency graph
requires:
  - phase: 04-booking-core-search-no-payment
    provides: "booking table (frozen quotedTotalCents/currency), booking_status enum, hostPayout, paymongoEvent, DISPLAY_CURRENCY, pricing.ts pure-module idiom"
  - phase: 02-listings-host-onboarding
    provides: "host_payout wallet + merchant.activated bookability gate (the wallet Phase 5 pays out to)"
provides:
  - "computeCommission(gross, rateBps) — pure integer-cents host-side split {rateBps, commissionCents, netCents}"
  - "COMMISSION_RATE_BPS / PAYOUT_DELAY_HOURS / PAYMENT_WINDOW_MINUTES — the phase's single named config source"
  - "host_payout_ledger table (UNIQUE booking_id at-most-once gate; frozen commission rate+amount; held→…→refunded state)"
  - "booking.payment_id column (PayMongo pay_... captured for later refunds)"
  - "listing.currency default reconciled usd→php + live backfill (charge currency consistent end-to-end)"
affects: [05-02, 05-03, 05-04, 05-05, 05-06, payments, payouts, HOST-03, refunds]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure integer-cents money module (mirrors pricing.ts): no directive, single Math.round rounding rule, throws rather than freeze a wrong number"
    - "Config-tunable named constants read from process.env with documented defaults (mirrors HOLD_TTL_MINUTES / DISPLAY_CURRENCY)"
    - "Ledger UNIQUE(booking_id) as the DB-enforced at-most-once payout gate (same philosophy as booking_idem_uq)"
    - "Frozen commission (rate + amount) as ledger columns so a later rate change never rewrites a past payout"

key-files:
  created:
    - src/lib/payments/config.ts
    - src/lib/payments/commission.ts
    - tests/payments/commission.test.ts
    - drizzle/0008_payout_ledger.sql
    - drizzle/meta/0008_snapshot.json
  modified:
    - src/lib/db/schema.ts
    - drizzle/meta/_journal.json

key-decisions:
  - "Payout-eligibility DERIVED from confirmed + endsAt, NOT a new booking_status 'completed' transition (D-56 / Claude's discretion) — payout state is a separate machine on the ledger"
  - "Renamed drizzle-kit's random migration name (0008_busy_george_stacy) to 0008_payout_ledger and updated the journal tag to match the plan artifact"

patterns-established:
  - "Commission: commissionCents = Math.round(gross*rateBps/10000); netCents = gross − commission ALWAYS (D-52 platform absorbs gateway fee)"
  - "Payout ledger row shape frozen for Plan-05 ON CONFLICT (booking_id) DO NOTHING sweep claim + HOST-03 read"

requirements-completed: [PAY-01, PAY-02]

# Metrics
duration: 5min
completed: 2026-07-16
---

# Phase 5 Plan 01: Money Foundation Summary

**Pure integer-cents commission calculator + tunable payment config + the `host_payout_ledger` at-most-once payout table (with `booking.payment_id` and a `listing.currency` usd→php reconcile) applied to the live DB via migration 0008.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-16T11:56:44Z
- **Completed:** 2026-07-16T12:01:37Z
- **Tasks:** 3
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments
- `computeCommission` — pure, boundary-tested, integer-cents host-side split reading its default rate from config; 13/13 unit tests green (TDD).
- `COMMISSION_RATE_BPS` / `PAYOUT_DELAY_HOURS` / `PAYMENT_WINDOW_MINUTES` — the single named, env-tunable config source for the whole phase (no literals at call sites).
- `host_payout_ledger` table live in Postgres: `UNIQUE(booking_id)` at-most-once payout gate, frozen commission rate+amount (D-51), integer-cents gross/commission/net, `payout_ledger_state` (held→processing→paid/refunded/failed), restrict FKs, host index.
- `booking.payment_id` (nullable) captured for later refunds; `listing.currency` default reconciled usd→php with a live backfill so charge currency is consistent end-to-end.

## Task Commits

1. **Task 1 (RED): failing commission test** — `fea1d5e` (test)
2. **Task 1 (GREEN): commission calculator + payment config** — `c1d3a31` (feat)
3. **Task 2: host_payout_ledger + booking.payment_id + listing.currency reconcile (schema.ts)** — `05de76f` (feat)
4. **Task 3: migration 0008 generated, hand-edited (currency backfill), applied to live DB** — `1c7c283` (feat)

_TDD task 1 has two commits (test → feat); no refactor commit was needed — the GREEN implementation was already clean._

## Files Created/Modified
- `src/lib/payments/config.ts` (created) — named, env-tunable payment constants (COMMISSION_RATE_BPS=1000, PAYOUT_DELAY_HOURS=24, PAYMENT_WINDOW_MINUTES=60).
- `src/lib/payments/commission.ts` (created) — pure `computeCommission(grossCents, rateBps?)` → `{rateBps, commissionCents, netCents}`; single Math.round rule; throws on bad gross/rateBps.
- `tests/payments/commission.test.ts` (created) — 13 cases: base 10%, single-rounding rule, net=gross−commission, boundaries (0 gross, 0/10000 bps, 1-cent round-down), default rate, 500-iteration fuzz invariant, throw cases.
- `src/lib/db/schema.ts` (modified) — added `payoutLedgerState` pgEnum + `hostPayoutLedger` table + `booking.paymentId`; changed `listing.currency` default usd→php.
- `drizzle/0008_payout_ledger.sql` (created) — CREATE TYPE payout_ledger_state; CREATE TABLE host_payout_ledger; ALTER booking ADD payment_id; ALTER listing currency SET DEFAULT php; hand-edited `UPDATE "listing" SET "currency"='php' WHERE "currency"='usd'` backfill.
- `drizzle/meta/0008_snapshot.json` (created) + `drizzle/meta/_journal.json` (modified, tag → `0008_payout_ledger`).

### host_payout_ledger column list (as applied to Postgres)
`id` (text PK), `booking_id` (text NOT NULL UNIQUE → booking.id ON DELETE RESTRICT), `host_id` (text NOT NULL → user.id ON DELETE RESTRICT), `payment_id` (text), `gross_cents` (int NOT NULL), `commission_rate_bps` (int NOT NULL), `commission_cents` (int NOT NULL), `net_cents` (int NOT NULL), `currency` (text DEFAULT 'php' NOT NULL), `state` (payout_ledger_state DEFAULT 'held' NOT NULL), `transfer_id` (text), `paid_at` (timestamptz), `created_at` (timestamptz DEFAULT now() NOT NULL), `updated_at` (timestamptz DEFAULT now() NOT NULL). Indexes: PK on id, UNIQUE on booking_id, btree `host_payout_ledger_host_idx` on host_id.

## Decisions Made
- **Payout state is a separate machine on the ledger, derived from `confirmed + endsAt`** — no new `booking_status` `completed` transition (D-56 / planner's-discretion resolution). The unused enum value stays inert.
- **Kept `.unique()`/Drizzle-expressible constraints; only the currency backfill was hand-edited** — the ledger needs no EXCLUDE, so 0008 is mostly generator output plus one appended `UPDATE`.
- **Renamed the drizzle-kit random migration name to `0008_payout_ledger`** and updated the journal `tag` so the filename matches the plan's artifact and the migration still applies.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `drizzle-kit generate` emits a random file name (`0008_busy_george_stacy.sql`). Resolved by renaming the SQL file to `0008_payout_ledger.sql` and updating the matching `_journal.json` tag (the snapshot is keyed by idx, so it needed no rename). Migration then applied cleanly. The `db:migrate` NOTICEs (`schema "drizzle" already exists`, `relation "__drizzle_migrations" already exists`) are benign drizzle bookkeeping, not errors.

## User Setup Required
None - no external service configuration required. (`COMMISSION_RATE_BPS` / `PAYOUT_DELAY_HOURS` / `PAYMENT_WINDOW_MINUTES` are optional env overrides; the defaults 10% / 24h / 60m apply otherwise.)

## Next Phase Readiness
- Wave-1 schema is live: Wave-2 integration tests can now migrate `./drizzle` (through 0008) into isolated schemas and rely on `host_payout_ledger` + `booking.payment_id`.
- `computeCommission` + the config constants are ready for the payout sweep (Plan 05), the payment/refund webhook (Plan 04), and the HOST-03 earnings page (Plan 06) to import.
- The ledger's frozen `commission_rate_bps`/`commission_cents` columns are ready to be populated at charge/payout time; the `state` machine (held→processing→paid/refunded/failed) is ready for the sweep and refund handlers.

## Self-Check: PASSED

All created files present (config.ts, commission.ts, commission.test.ts, 0008_payout_ledger.sql, 0008_snapshot.json, schema.ts, SUMMARY.md); all four task commits (fea1d5e, c1d3a31, 05de76f, 1c7c283) exist in the git log.

## TDD Gate Compliance

Task 1 (`tdd="true"`) followed RED → GREEN: `test(05-01)` commit `fea1d5e` (failing test, module-not-found) precedes `feat(05-01)` commit `c1d3a31` (implementation, 13/13 green). No REFACTOR commit needed. Plan-level `type: execute` (not `type: tdd`), so no plan-wide gate sequence applies.

---
*Phase: 05-payments-payouts*
*Completed: 2026-07-16*
