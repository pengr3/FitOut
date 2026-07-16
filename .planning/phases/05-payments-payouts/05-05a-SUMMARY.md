---
phase: 05-payments-payouts
plan: 05a
subsystem: payments
tags: [inngest, cron, payout-sweep, at-most-once, commission-freeze, batch-transfer, wallet-correlation, vitest]

# Dependency graph
requires:
  - phase: 05-payments-payouts
    provides: "05-01 — computeCommission, COMMISSION_RATE_BPS/PAYOUT_DELAY_HOURS, host_payout_ledger (UNIQUE booking_id, frozen commission); 05-02 — createBatchTransfer (/v2 inhouse net payout), listWalletAccounts (global list, caller correlates), mockPayMongo stubs"
  - phase: 02-listings-host-onboarding
    provides: "host_payout.paymongo_account_id (the host's Linked-Account id the wallet is correlated against)"
provides:
  - "src/inngest/client.ts — shared Inngest client (id fitout), consumed by both payout crons + the Plan-05b serve() mount"
  - "queryDuePayouts(dbConn) — RESEARCH Pattern-4 sweep: confirmed bookings past ends_at + PAYOUT_DELAY_HOURS (DB clock) with no ledger row; aliases paymongo_account_id → paymongoAccountId"
  - "payOne(dbConn, due) — at-most-once ledger claim (ON CONFLICT booking_id) + commission freeze (D-51) + wallet.id === paymongoAccountId correlation + inhouse net transfer (D-52) + Held→Processing release"
  - "payoutSweep — hourly singleton (concurrency:1, TZ=Asia/Manila) Inngest cron wiring queryDuePayouts → per-booking payOne steps"
  - ".env.example — COMMISSION_RATE_BPS/PAYOUT_DELAY_HOURS/PAYMENT_WINDOW_MINUTES/PAYOUT_RECONCILE_STUCK_HOURS/PLATFORM_WALLET_*/INNGEST_* keys (this plan is the sole owner)"
affects: [05-05b, HOST-03, payout-reconcile, payments, payouts]

# Tech tracking
tech-stack:
  added:
    - "inngest@4.13.0 — managed cron / durable-execution runner (first async-scheduled job in the repo; no Redis, no worker)"
  patterns:
    - "The INSERT is the lock: ON CONFLICT (booking_id) DO NOTHING RETURNING id as the DB-enforced at-most-once payout gate (mirrors createPendingHold + booking_idem_uq)"
    - "Wallet-to-host correlation (wallet.id === paymongo_account_id) as a misdelivery boundary — no match ⇒ fire nothing + operator alert, NEVER wallets[0]"
    - "DB-clock time predicate (now(), never an injectable JS clock) for the due sweep — mirrors Phase-4 lazy-expiry"
    - "Inngest per-booking step.run so a mid-batch failure retries just one payout, not the whole sweep"

key-files:
  created:
    - src/inngest/client.ts
    - src/inngest/functions/payout-sweep.ts
    - tests/payments/payout-sweep.test.ts
    - tests/payments/ledger-freeze.test.ts
  modified:
    - package.json
    - package-lock.json
    - .env.example

key-decisions:
  - "Wallet correlation field chosen = wallet.id === host_payout.paymongo_account_id (primary; a stored per-host accountNumber is the documented fallback if onboarding captures one). Centralized in ONE spot in payOne."
  - "inngest 4.13.0 uses the 2-arg createFunction(options, handler) form with the cron trigger in options.triggers — the RESEARCH 3-arg skeleton predates this API (Rule 3 blocking fix)."
  - "'Release' = firing the transfer → ledger Held→Processing here; the terminal Processing→Paid/Failed reconcile + /api/inngest serve() mount are deferred to Plan 05b (keeps this plan tsc-clean with no dangling payout-reconcile import)."

patterns-established:
  - "Operator alert tag [payout-alert] for the no-wallet and transfer-create-failure paths ops should watch"
  - "Factored queryDuePayouts(dbConn) / payOne(dbConn, due) taking an explicit db so tests inject an isolated schema / racing clients"

requirements-advanced: [PAY-02, PAY-03]

# Metrics
duration: 12min
completed: 2026-07-16
---

# Phase 5 Plan 05a: Inngest Payout Sweep Summary

**An hourly Inngest singleton cron (`TZ=Asia/Manila 0 * * * *`, `concurrency: 1`) that sweeps `confirmed` bookings whose session ended ≥ `PAYOUT_DELAY_HOURS` ago with no payout row, claims each at-most-once via `INSERT … ON CONFLICT (booking_id) DO NOTHING` (freezing the commission, D-51), correlates the payout wallet to THAT booking's host (`wallet.id === paymongo_account_id`), and fires an inhouse `/v2/batch_transfers` of exactly `net_cents` (D-52) — moving the ledger `Held → Processing`. No wallet match ⇒ money stays Held + `[payout-alert]`, fire nothing.**

## Performance

- **Duration:** ~12 min (commits 21:06:55 → 21:13:59 UTC)
- **Tasks:** 3
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments

- Installed `inngest@4.13.0` (first async-scheduled job runner; no Redis/worker) + `dev:inngest` convenience script; created `src/inngest/client.ts` (the shared client, no signing-key guard — that belongs to the Plan-05b serve() mount).
- `.env.example` now documents every Phase-5 payment + Inngest key (this plan is the sole owner): `COMMISSION_RATE_BPS`, `PAYOUT_DELAY_HOURS`, `PAYMENT_WINDOW_MINUTES`, `PAYOUT_RECONCILE_STUCK_HOURS` (consumed by 05-b reconcile), `PLATFORM_WALLET_NUMBER/NAME/BIC`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`.
- `payout-sweep.ts`: `queryDuePayouts` (Pattern-4 DB-clock sweep) + `payOne` (freeze → claim → correlate → transfer → release) + the `payoutSweep` singleton cron.
- Did NOT create `src/app/api/inngest/route.ts` — Plan 05b mounts the serve endpoint after both cron files exist, so this plan ends `tsc`-clean.
- Tests: due-only selection, happy payout (frozen 10%/net 180000 on a 200000 gross to the host's own wallet), at-most-once under `makeRacingClients` concurrency, multi-host correlation (A→A, B→B, never crossed), no-match (Held + `[payout-alert]`, no transfer), and the D-51 freeze (a later rate change never rewrites an existing row).

## Task Commits

1. **Task 1: install Inngest + client + env keys** — `68bb06d` (feat)
2. **Task 2: payout-sweep cron (claim + freeze + correlate + transfer)** — `21674d5` (feat)
3. **Task 3: sweep + at-most-once + multi-host + freeze tests** — `7bdbed8` (test)

## Sweep Mechanics (for Plan 05b + ops)

- **Cadence / timezone:** hourly, `{ cron: "TZ=Asia/Manila 0 * * * *" }`, `concurrency: 1` (singleton — no overlapping sweeps). T+24h is coarse; sub-hour granularity buys nothing.
- **The exact claim SQL (the at-most-once gate):**
  ```sql
  INSERT INTO host_payout_ledger (id, booking_id, host_id, payment_id, gross_cents,
    commission_rate_bps, commission_cents, net_cents, currency, state)
  VALUES (…, 'held')
  ON CONFLICT (booking_id) DO NOTHING RETURNING id
  ```
  Empty RETURNING ⇒ another sweep already owns this booking ⇒ fire NO transfer (`skipped-claimed`). This — not an app-level "already paid?" check — is the at-most-once authority, exactly as the GiST EXCLUDE is for double-booking.
- **Wallet-to-host correlation field chosen:** `wallet.id === b.paymongoAccountId` (the host's `host_payout.paymongo_account_id`), filtered to `status === "activated"`. Fallback (if onboarding ever captures a per-host wallet number) is `w.accountNumber === <stored number>` — verify the correlating field against a live/test `GET /v2/wallets` before UAT (Open Question A2). Centralized in ONE spot in `payOne`.
- **No-match behavior:** leave the ledger row `held` (money stays held), `console.error("[payout-alert] no activated wallet for host", { bookingId, paymongoAccountId })`, return `skipped-no-wallet` — NEVER `wallets[0]`, never a cross-host transfer.
- **Release semantics:** the transfer create moves the ledger `Held → Processing` with `transfer_id`. On a transfer throw: `state = 'failed'` + `console.error("[payout-alert] transfer create failed", { bookingId })`. The terminal `Processing → Paid/Failed` reconcile (polling `GET /v2/transfers/{id}`) is **Plan 05b**.
- **Operator alert tag to watch:** `[payout-alert]` (no-wallet and transfer-create-failure).

## Decisions Made

- **Wallet correlation = `wallet.id === paymongo_account_id`** (primary), documented fallback to a stored per-host `accountNumber`; the real correlating field stays UAT-gated on the PayMongo /v2 beta (A2).
- **inngest 4.13.0 2-arg `createFunction(options, handler)`** with the cron in `options.triggers` — the RESEARCH/plan skeleton showed the older 3-arg `(config, trigger, handler)` shape (Rule 3 blocking fix; see Deviations).
- **"Release" stops at `Processing` here**; `Paid/Failed` + the `/api/inngest` serve() mount are Plan 05b, so this plan has no dangling import of the not-yet-existing `payout-reconcile.ts` and ends `tsc`-clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Inngest `createFunction` API is 2-arg in 4.13.0, not the 3-arg skeleton**
- **Found during:** Task 2 (`npx tsc --noEmit` → `TS2554: Expected 2 arguments, but got 3` + `step` implicitly `any`).
- **Issue:** The RESEARCH/plan skeleton uses the older `inngest.createFunction({id, concurrency}, {cron}, handler)` 3-arg form. Inngest 4.13.0's `createFunction(options, handler)` takes the trigger inside `options.triggers`.
- **Fix:** Moved the cron into `options.triggers: [{ cron: "TZ=Asia/Manila 0 * * * *" }]`; kept `id` + `concurrency: 1` in options. `step` now types correctly and the handler compiles.
- **Files modified:** src/inngest/functions/payout-sweep.ts
- **Commit:** `21674d5`

## Issues Encountered

- None beyond the Inngest API-shape fix above. `npx tsc --noEmit` clean; `npx vitest run tests/payments tests/paymongo` = 55/55 green (49 prior + 6 new); ESLint clean on all four new files.

## User Setup Required

**External configuration is a UAT prerequisite, NOT a blocker for this plan** (all money-movement runs against `mockPayMongo`):

- **Inngest:** local dev runs `npm run dev:inngest` (`npx inngest-cli@latest dev` — no Redis, no worker). Prod needs `INNGEST_EVENT_KEY` (Events) + `INNGEST_SIGNING_KEY` (Signing key; consumed by the Plan-05b serve() endpoint). The Dev Server is NOT required for the Vitest suite.
- **PayMongo:** real inhouse payouts require the money-movement `/v2` beta (`batch_transfers` + linked-account wallet enumeration) enabled — sales-gated. Until then payouts run against mocks; real payout is UAT-gated (already in STATE blockers).

## Next Phase Readiness

- **Plan 05b** builds on this: add `getTransfer()` + a `payout-reconcile` cron (poll `GET /v2/transfers/{id}`, move `Processing → Paid/Failed`, alert on failures/stuck rows past `PAYOUT_RECONCILE_STUCK_HOURS`), and mount `src/app/api/inngest/route.ts` `serve({ client: inngest, functions: [payoutSweep, payoutReconcile] })`. Both cron files now exist for that mount.
- **Plan 05-06 (HOST-03)** reads the `host_payout_ledger` rows this sweep writes (`Held → Processing`) for the earnings page with the host-visible commission line.

## Self-Check: PASSED

- Files verified present: `src/inngest/client.ts`, `src/inngest/functions/payout-sweep.ts`, `tests/payments/payout-sweep.test.ts`, `tests/payments/ledger-freeze.test.ts`, this SUMMARY.
- No `src/app/api/inngest/route.ts` created (Plan 05b owns it) — verified absent.
- Commits verified in git log: `68bb06d` (T1), `21674d5` (T2), `7bdbed8` (T3).

## TDD Gate Compliance

Plan `type: execute` (not `type: tdd`); no plan-wide RED/GREEN gate applies. Task 3's tests were authored after the Task-2 implementation was already `tsc`-clean, then run green — a standard test-after-implementation flow for an `execute` plan.

---
*Phase: 05-payments-payouts*
*Completed: 2026-07-16*
