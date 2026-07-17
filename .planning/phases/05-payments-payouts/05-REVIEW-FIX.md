---
phase: 05-payments-payouts
fixed_at: 2026-07-17T03:24:31Z
review_path: .planning/phases/05-payments-payouts/05-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 5: Code Review Fix Report

**Fixed at:** 2026-07-17T03:24:31Z
**Source review:** .planning/phases/05-payments-payouts/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (CR-01, WR-01..WR-05 — Info findings IN-01..IN-03 out of scope)
- Fixed: 6
- Skipped: 0

All work was done in an isolated git worktree and fast-forwarded onto `dev`
(`f6f5dcd..0e50b57`). Each fix is one atomic commit. Per-fix verification was
syntax/type-only (`tsc --noEmit` scoped to the modified file); the only tsc
diagnostics remaining are 4 pre-existing baseline errors caused by the `inngest`
package not being installed (2× `Cannot find module 'inngest'`, 2× the
`step`-implicitly-any these cause) — none introduced by these fixes. The full
vitest suite is deferred to the orchestrator/verifier.

## Fixed Issues

### CR-01: Payout permanently stranded in `held` — claim-before-verify with no recovery path

**Files modified:** `src/inngest/functions/payout-sweep.ts`, `src/inngest/functions/payout-reconcile.ts`, `tests/payments/payout-sweep.test.ts`
**Commit:** 0d1c03a
**Status:** fixed: requires human verification (state-machine / money-movement logic change)
**Applied fix:** Moved the wallet lookup inside a guarded `try` in `payOne` so a
`listWalletAccounts()` throw can no longer strand a `held` row. No correlated
wallet now **rolls the claim back** (`DELETE ... WHERE state='held' AND transfer_id IS NULL`)
so a later sweep retries once the host activates — instead of leaving a permanent
dead-end row that `queryDuePayouts` never re-selects. Any post-claim failure
(wallet-lookup throw or transfer throw) is caught and marked `failed` + alerted,
never a silent `held`. Added a stuck-`held` operator alert (`alertStuckHeld`) to
the reconcile cron, mirroring the existing stuck-`processing` alert, so even a hard
crash between claim and release surfaces. **Updated the no-wallet sweep test** (it
previously *enshrined* the strand — "leaves the money Held") to assert the claim is
rolled back (no ledger row), per the corrected behavior.

### WR-01: Refund webhook overwrites already-`processing`/`paid` ledger rows with `refunded`

**Files modified:** `src/app/api/paymongo/webhook/route.ts`
**Commit:** b2bcf2d
**Status:** fixed: requires human verification (money-state logic change)
**Applied fix:** Restricted the pre-payout refund flip to `state='held'` rows only
(money still on the platform wallet) via `.returning()`. If no `held` row was
flipped, a follow-up query checks for a **post-payout** row (`processing`/`paid`);
if one exists, the refund arrived after the payout fired (late/manual/dispute/
chargeback) and needs a clawback — it now raises `[PAYMENT_ALERT] refund_after_payout`
+ `recordAudit(outcome: "needs_attention")` instead of silently rewriting the paid
record. The common "no ledger row yet" case (sweep hasn't run) correctly stays a
benign no-alert pre-payout refund. Preserves the file's existing alerting idiom.

### WR-02: Refund handler trusts the event *type*, not the refund's actual `status`

**Files modified:** `src/app/api/paymongo/webhook/route.ts`
**Commit:** 819bea4
**Status:** fixed: requires human verification (webhook state-transition logic change)
**Applied fix:** `handleRefund` now gates the booking→cancelled / ledger→refunded
transition on the refund resource's terminal-success status
(`event.data.attributes.data.attributes.status` ∈ {`succeeded`,`refunded`}), returning
early for pending/failed/partial `payment.refund.updated` events. Added `status?: string`
to the `PayMongoResource` attributes type. Consistent with the captured event shape
in `tests/paymongo/webhook-refund.test.ts` (which carries `status: "succeeded"`).

### WR-03: No fail-closed boot guard for `PAYMONGO_WEBHOOK_SECRET`

**Files modified:** `src/app/api/paymongo/webhook/route.ts`
**Commit:** c1e3f9d
**Status:** fixed
**Applied fix:** Added a production module-load boot guard that throws if
`PAYMONGO_WEBHOOK_SECRET` is unset in `NODE_ENV==='production'`, mirroring the exact
fail-closed pattern already in `src/lib/paymongo.ts` and `src/app/api/inngest/route.ts`.
dev/test/build still tolerate its absence (the mocked webhook suite sets it per-test).

### WR-04: A `failed` payout is never retried and never re-swept

**Files modified:** `src/lib/payments/config.ts`, `src/inngest/functions/payout-sweep.ts`, `tests/payments/payout-sweep.test.ts`
**Commit:** 9cac430
**Status:** fixed: requires human verification (retry logic / new query predicate)
**Applied fix:** Gave `failed` rows a **bounded, double-pay-safe** retry path. The
claim is now `ON CONFLICT (booking_id) DO UPDATE SET state='held', updated_at=now()
WHERE host_payout_ledger.state='failed' RETURNING id` — it re-claims a `failed` row
for a fresh attempt (preserving the frozen commission columns) while remaining a no-op
(empty RETURNING → `skipped-claimed`) for held/processing/paid/refunded, so
at-most-once still holds. `queryDuePayouts` widened to re-select a `failed` row once
the backoff has elapsed (`updated_at`) and while the original claim is within a max-age
window (`created_at`) — new config `PAYOUT_RETRY_BACKOFF_HOURS` (1) /
`PAYOUT_RETRY_MAX_AGE_HOURS` (72). The stable `payout:<bookingId>` Idempotency-Key makes
the re-attempt safe; beyond the window the row stays `failed` for manual review. Added
two retry tests (re-claim release + due-selection of a backed-off failed row).

### WR-05: `booking.status` defaults to `'confirmed'` — payout-eligible booking without payment

**Files modified:** `src/lib/db/schema.ts`, `drizzle/0009_booking_status_default_pending.sql`, `drizzle/meta/_journal.json`, `drizzle/meta/0009_snapshot.json`
**Commit:** 0e50b57
**Status:** fixed
**Applied fix:** Flipped the Drizzle column default `'confirmed'` → `'pending'` AND
authored hand-written migration `0009_booking_status_default_pending.sql`
(`ALTER TABLE "booking" ALTER COLUMN "status" SET DEFAULT 'pending'`) so the live DB
default matches the schema — following the repo's custom-migration convention
(unqualified table for isolated-schema test replay, `--> statement-breakpoint`, chained
`meta/0009_snapshot.json` with `prevId` = 0008's id and the booking default flipped, plus
a journal entry). Verified no seed relies on the old default: `scripts/seed.ts` only
DELETEs bookings (never inserts), and both seeds insert explicit statuses. `db:migrate`
was **not** run (no DB writes from this agent) — the migration is authored for the
operator/orchestrator to apply. Migration set is consistent (10 sql / 10 snapshots / 10
journal entries).

## Skipped Issues

None — all in-scope findings were fixed.

## Out of Scope (not attempted)

Per `fix_scope: critical_warning`, the Info findings were not addressed:
- IN-01: `createBatchTransfer` can persist `transferId = ""` (un-reconcilable row)
- IN-02: Webhook idempotency is not atomic (seen-check up front, insert at the end)
- IN-03: Checkout return URLs fall back to `http://localhost:3000` with no prod guard

## Verification Notes for the Human Reviewer

- **CR-01 / WR-04** interact by design in `payout-sweep.ts`: CR-01 guarantees no silent
  `held` (rollback on no-wallet, `failed` on any post-claim throw); WR-04 then makes a
  `failed` row retryable. Confirm the `ON CONFLICT DO UPDATE ... WHERE state='failed'`
  UPSERT preserves at-most-once under the existing concurrency test and that the retry
  window bounds are acceptable operationally.
- **WR-01 / WR-02** both live in `handleRefund`; confirm the terminal-status gate and the
  post-payout clawback alert against real captured PayMongo refund payloads.
- **WR-05**: apply migration `0009` (`db:migrate`) against the live DB so the column
  default is actually changed — the schema edit alone does not alter an existing DB.

---

_Fixed: 2026-07-17T03:24:31Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
