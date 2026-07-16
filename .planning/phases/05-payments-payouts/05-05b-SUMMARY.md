---
phase: 05-payments-payouts
plan: 05b
subsystem: payments
tags: [inngest, cron, payout-reconcile, transfer-status-poll, serve-mount, fail-closed, idempotent-update, vitest]

# Dependency graph
requires:
  - phase: 05-payments-payouts
    provides: "05-02 — paymongoFetch + versioned /v2 base + mockPayMongo stubs; 05-05a — inngest client (src/inngest/client.ts), payoutSweep cron, host_payout_ledger Held→Processing writes (state='processing' + transfer_id), .env.example PAYOUT_RECONCILE_STUCK_HOURS + INNGEST_* keys"
  - phase: 05-payments-payouts
    provides: "05-01 — host_payout_ledger table (payout_ledger_state enum held→processing→paid/refunded/failed, UNIQUE booking_id, paid_at, created_at)"
provides:
  - "getTransfer(transferId) — GET /v2/transfers/{id} (no Idempotency-Key on the GET) → { id, status } terminal-status poll (Research Pitfall 2 — PayMongo has no transfer webhook)"
  - "mapTransferStatus(status) — PayMongo /v2 transfer enum → 'paid'|'failed'|'processing'; unknown/in-flight ⇒ 'processing' (never spuriously Paid)"
  - "queryProcessingLedger(dbConn) — the Processing rows to reconcile (state='processing' AND transfer_id NOT NULL, ORDER BY created_at ASC LIMIT 200)"
  - "reconcileOne(row, dbConn) — poll → Processing→Paid (paid_at=now()) / Processing→Failed, both guarded AND state='processing' (idempotent); Failed OR stuck-beyond-PAYOUT_RECONCILE_STUCK_HOURS → [payout-alert]"
  - "payoutReconcile — hourly singleton (concurrency:1, TZ=Asia/Manila 30 * * * *, offset 30m from the sweep) Inngest cron"
  - "src/app/api/inngest/route.ts — serve() mount registering BOTH payoutSweep + payoutReconcile, GET/POST/PUT, runtime=nodejs, fail-closed prod INNGEST_SIGNING_KEY boot guard"
affects: [HOST-03, payments, payouts]

# Tech tracking
tech-stack:
  patterns:
    - "Poll-not-webhook for money-movement status: getTransfer(GET /v2/transfers/{id}) reconciled from an Inngest step, because PayMongo emits no transfer/payout webhook event (Research Pitfall 2)"
    - "Idempotent terminal advance: every ledger UPDATE guarded by `AND state='processing'` ⇒ a re-run on a terminal row is a 0-row no-op (the guard, not an app-level read, is the authority — mirrors the sweep's ON CONFLICT + booking's EXCLUDE)"
    - "Safe-default status mapping: any unrecognized/in-flight transfer status stays 'processing' so the money-critical direction (→Paid) can never be reached by an unknown value"
    - "Fail-closed serve() boot guard: /api/inngest throws at module load if INNGEST_SIGNING_KEY is missing in production (never a silently-unverified endpoint)"

key-files:
  created:
    - src/inngest/functions/payout-reconcile.ts
    - src/app/api/inngest/route.ts
    - tests/payments/payout-reconcile.test.ts
  modified:
    - src/lib/paymongo.ts
    - tests/helpers/mocks.ts

key-decisions:
  - "inngest 4.13.0 2-arg createFunction(options, handler) with the cron in options.triggers — the plan/RESEARCH 3-arg (config, trigger, handler) skeleton predates this API (same Rule-3 fix Plan 05a applied to payout-sweep.ts)."
  - "mapTransferStatus terminal enum (VERIFY against a live PayMongo /v2 response before UAT, A4): paid ∈ {succeeded, completed, paid}; failed ∈ {failed, returned, cancelled}; everything else ⇒ processing."
  - "Reconcile cron offset 30m from the sweep (TZ=Asia/Manila 30 * * * * vs the sweep's 0 * * * *) so the two hourly singletons never contend."

patterns-established:
  - "Operator alert tags ops should watch (this plan adds two to the sweep's set): [payout-alert] transfer failed and [payout-alert] transfer stuck processing"
  - "Factored queryProcessingLedger(dbConn)/reconcileOne(row, dbConn) taking an explicit db (default = prod db) so tests drive an isolated schema"

requirements-advanced: [PAY-03]

# Metrics
duration: 7min
completed: 2026-07-16
---

# Phase 5 Plan 05b: Payout Reconcile + Inngest Serve Mount Summary

**A second hourly Inngest singleton cron (`TZ=Asia/Manila 30 * * * *`, `concurrency: 1`, offset 30m from the sweep) that closes the D-59 `Held → Processing → Paid/Failed` payout lifecycle. Because PayMongo emits NO transfer/payout webhook (Research Pitfall 2), `getTransfer` polls `GET /v2/transfers/{id}` for every `Processing` ledger row and `reconcileOne` moves it `Processing → Paid` (`paid_at=now()`) or `Processing → Failed` — each via an `UPDATE … AND state='processing'` that is a 0-row no-op on an already-terminal row (idempotent), while an unknown/in-flight status stays `Processing` (never spuriously Paid). A Failed transfer, or a row stuck past `PAYOUT_RECONCILE_STUCK_HOURS`, raises a `[payout-alert]` operator signal. `/api/inngest` then mounts `serve()` registering BOTH `payoutSweep` (05a) and `payoutReconcile`, fail-closed on `INNGEST_SIGNING_KEY` in production.**

## Performance

- **Duration:** ~7 min (commits 13:41 → 13:47 UTC)
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- Extended `src/lib/paymongo.ts` with `getTransfer(transferId)` → `GET /v2/transfers/{id}` (no Idempotency-Key on the GET), reusing `paymongoFetch` + the versioned `/v2` base verbatim; documented as a poll (not a webhook) per Pitfall 2.
- Added a deterministic `mockPayMongo.getTransfer` stub (default terminal `succeeded`) + wired it into `mockPayMongo.reset()` so reconcile tests override per-case with `mockResolvedValueOnce`.
- Created `src/inngest/functions/payout-reconcile.ts`: `mapTransferStatus` (safe-default enum mapping), `queryProcessingLedger`, `reconcileOne` (poll → guarded terminal UPDATE + `[payout-alert]`), and the `payoutReconcile` singleton cron.
- Created `src/app/api/inngest/route.ts` LAST (after both cron files exist) — `serve({ client: inngest, functions: [payoutSweep, payoutReconcile] })`, `runtime = "nodejs"`, fail-closed prod `INNGEST_SIGNING_KEY` boot guard. Both static imports resolve → `tsc` clean, no TS2307.
- Tests: `queryProcessingLedger` selectivity, `Processing→Paid` (paid_at set), `Processing→Failed` (+alert), idempotency on an already-paid row (0-row no-op, paid_at unchanged), unknown-status-stays-processing (never spurious Paid), and the stuck-processing alert.

## Task Commits

1. **Task 1: getTransfer poll + mock stub + payout-reconcile cron** — `a6260bd` (feat)
2. **Task 2: mount /api/inngest serve() with both crons + fail-closed prod guard** — `b83c5e5` (feat)
3. **Task 3: reconcile tests (Processing→Paid/Failed, idempotency, unknown-status, stuck-alert)** — `ddbaba0` (test)

## Reconcile Mechanics (for ops + HOST-03)

- **Cadence / timezone:** hourly, `{ cron: "TZ=Asia/Manila 30 * * * *" }`, `concurrency: 1` (singleton). The `30`-minute offset from the sweep's `0 * * * *` keeps the two hourly singletons from contending.
- **The transfer-status poll:** `getTransfer(transferId)` → `GET /v2/transfers/{id}` (GET → NO Idempotency-Key). This is the reconcile's only PayMongo call; there is deliberately no transfer webhook subscription (Pitfall 2).
- **`mapTransferStatus` terminal-enum mapping (⚠ A4 — VERIFY against a captured live/test PayMongo `GET /v2/transfers/{id}` response before UAT):**
  - `paid` ⇐ `succeeded | completed | paid`
  - `failed` ⇐ `failed | returned | cancelled`
  - `processing` (unchanged) ⇐ **everything else** (pending, processing, unknown) — the safe default; an unrecognized status can never reach the money-critical `→ Paid`.
- **The idempotency guard (the at-most-once authority for the terminal advance):** both the Paid and Failed UPDATEs are `… WHERE booking_id=$id AND state='processing'`. A re-run on an already-terminal row touches 0 rows — `paid_at` is never rewritten, a terminal row is never reopened.
- **Operator alert tags to watch (added to 05a's `[payout-alert]` set):**
  - `[payout-alert] transfer failed` — a terminal-failure transfer (payout needs human review).
  - `[payout-alert] transfer stuck processing` — a row still `processing` past `PAYOUT_RECONCILE_STUCK_HOURS` (default 48h, config-tunable via `.env`).
- **The serve() mount:** `GET`/`POST`/`PUT` from `serve({ client: inngest, functions: [payoutSweep, payoutReconcile] })`, `runtime = "nodejs"`. In **production** a missing `INNGEST_SIGNING_KEY` is a **boot failure** (fail-closed, T-05-26); dev/test/build tolerate its absence (the Inngest Dev Server needs no keys). Register `/api/inngest` with Inngest (prod); local dev uses `npm run dev:inngest` (`npx inngest-cli@latest dev`).

## Decisions Made

- **inngest 4.13.0 2-arg `createFunction(options, handler)`** with the cron in `options.triggers` — the plan/RESEARCH 3-arg skeleton predates this API (Rule-3 blocking fix; identical to the one Plan 05a made in `payout-sweep.ts`).
- **Safe-default status mapping** — unknown/in-flight stays `processing`; only two explicit terminal sets promote a row. Widen the sets ONLY against a verified PayMongo response (A4).
- **Reconcile offset 30m** from the sweep so the two singleton crons never overlap.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Inngest `createFunction` is 2-arg in 4.13.0, not the plan's 3-arg skeleton**
- **Found during:** Task 1 (writing `payoutReconcile`).
- **Issue:** The plan's `<interfaces>` reconcile skeleton and the RESEARCH Code Example use the older `inngest.createFunction({ id, concurrency }, { cron }, handler)` 3-arg form. Inngest 4.13.0's `createFunction(options, handler)` takes the trigger inside `options.triggers` — the 3-arg form fails `tsc` (`TS2554: Expected 2 arguments, but got 3` + `step` implicitly `any`), exactly as Plan 05a hit for `payout-sweep.ts`.
- **Fix:** Moved the cron into `options.triggers: [{ cron: "TZ=Asia/Manila 30 * * * *" }]`, kept `id` + `concurrency: 1` in options — mirroring the landed `payout-sweep.ts` (per the environment note to follow its shape). `step` types correctly and the handler compiles.
- **Files modified:** src/inngest/functions/payout-reconcile.ts
- **Commit:** `a6260bd`

## Issues Encountered

- None beyond the Inngest API-shape fix above. `npx tsc --noEmit` clean; `npx vitest run tests/payments tests/paymongo` = 71/71 green (65 prior + 6 new); ESLint clean (0 errors) on all touched files.

## User Setup Required

**External configuration is a UAT prerequisite, NOT a blocker for this plan** (all money-movement runs against `mockPayMongo`):

- **PayMongo:** real transfer-status polling requires the money-movement `/v2` beta (`GET /v2/transfers/{id}` for linked-account transfers) enabled — sales-gated (Platforms/Linked-Accounts beta contact). Until then reconcile runs against mocks; real polling is UAT-gated (already in STATE blockers).
- **Inngest:** prod needs `INNGEST_SIGNING_KEY` (the `/api/inngest` serve endpoint throws at boot without it in production) + `INNGEST_EVENT_KEY`; register `/api/inngest` in the Inngest dashboard (prod) so the sweep + reconcile crons are invoked. Local dev uses `npm run dev:inngest`. The env keys + template are owned by Plan 05a's `.env.example` (not duplicated here).

## Next Phase Readiness

- **The D-59 payout lifecycle is now complete and reachable:** the sweep (05a) opens `Held → Processing`; this reconcile closes `Processing → Paid/Failed`. **HOST-03** (`/host/earnings`, 05-06) renders all of those states straight from `host_payout_ledger` — a Paid row now actually appears once a transfer settles and the reconcile runs.
- **A4 verification is the one UAT follow-up:** confirm `mapTransferStatus`'s terminal enum against a live/test PayMongo `GET /v2/transfers/{id}` response before trusting real `→ Paid` transitions.

## Threat Compliance

- **T-05-28 (Repudiation — payout stranded at Processing, host silently never paid):** MITIGATED — `payoutReconcile` polls every Processing row and advances it Paid/Failed; a Failed transfer OR a row stuck past `PAYOUT_RECONCILE_STUCK_HOURS` raises a `[payout-alert]` operator signal. No row is ever stranded without a signal.
- **T-05-26 (Spoofing — unauthenticated caller triggering the serve endpoint):** MITIGATED — fail-closed `INNGEST_SIGNING_KEY` in production (serve() verifies the request; boot throws if the key is missing in prod); the crons act only on DB-derived rows.

## Self-Check: PASSED

- Files verified present: `src/inngest/functions/payout-reconcile.ts`, `src/app/api/inngest/route.ts`, `tests/payments/payout-reconcile.test.ts`, `src/lib/paymongo.ts` (getTransfer added), `tests/helpers/mocks.ts` (getTransfer stub), this SUMMARY.
- Commits verified in git log: `a6260bd` (T1 feat), `b83c5e5` (T2 feat), `ddbaba0` (T3 test).
- `npx tsc --noEmit` exit 0; `npx vitest run tests/payments tests/paymongo` = 71/71 green; ESLint 0 errors on all touched files.

## TDD Gate Compliance

Plan `type: execute` (not `type: tdd`); no plan-wide RED/GREEN gate applies. Task 3's tests were authored after the Task-1 implementation was already `tsc`-clean, then run green — the standard test-after-implementation flow for an `execute` plan.

---
*Phase: 05-payments-payouts*
*Completed: 2026-07-16*
