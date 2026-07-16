---
phase: 05-payments-payouts
plan: 02
subsystem: payments
tags: [paymongo, checkout, batch-transfers, refunds, wallets, idempotency, rest-client, vitest]

# Dependency graph
requires:
  - phase: 02-listings-host-onboarding
    provides: "src/lib/paymongo.ts thin REST client (paymongoFetch, Basic auth, Idempotency-Key on POST, fail-closed prod boot) + Linked-Accounts onboarding calls"
provides:
  - "createCheckoutSession(input) — hosted /v1 charge across the full PH rail set (card/gcash/paymaya/qrph), returns { id, checkoutUrl }"
  - "createRefund(input) — /v1 refund against a captured payment, returns { id, status }; idempotencyKey refund:<paymentId>"
  - "createBatchTransfer(input) — /v2 inhouse net-amount payout to a host wallet, returns { batchId, transferId, status }; idempotencyKey payout:<bookingId>"
  - "listWalletAccounts() — /v2 GLOBAL list of activated wallets, returns WalletAccount[]; caller MUST correlate by id/number, never [0]"
  - "Version-less PAYMONGO_BASE + fully-versioned per-call paths (/v1 vs /v2) — no /v1/v2/... routing bug"
  - "PLATFORM_WALLET source_account + fail-closed prod boot guard on PLATFORM_WALLET_NUMBER/NAME"
  - "mockPayMongo stubs for all four new calls (Wave-2 plans 03/04/05 test against these)"
affects: [05-03, 05-04, 05-05, payout-sweep, webhook-payment-paid, refund-backstop]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Version-less PayMongo base + fully-versioned per-call paths (/v1 checkout+refund, /v2 transfer+wallets)"
    - "Per-call stable Idempotency-Key convention (checkout:<caller-supplied> / payout:<bookingId> / refund:<paymentId>)"
    - "Defensive optional-chaining of beta /v2 response nesting (A2/A3)"
    - "Global-fetch mock over the REAL client to assert exact URL/method/headers/body (not module mock)"

key-files:
  created:
    - "tests/payments/paymongo-calls.test.ts"
  modified:
    - "src/lib/paymongo.ts"
    - "tests/helpers/mocks.ts"

key-decisions:
  - "PAYMONGO_BASE refactored to https://api.paymongo.com (version-less); every caller passes /v1/... or /v2/... — kills the Pitfall-3 /v1/v2/... bug (T-05-06)"
  - "createBatchTransfer sends amount:netCents verbatim — never reduced by the gateway fee (D-52, T-05-10)"
  - "listWalletAccounts returns a GLOBAL unfiltered list; JSDoc mandates caller correlation by wallet.id/accountNumber, never [0]"
  - "Fail-closed prod boot extended to PLATFORM_WALLET_NUMBER/NAME (T-05-09); dev/test/build tolerate placeholders; BIC defaults PAEYPHM2XXX"

patterns-established:
  - "Money-movement calls all wrap the existing paymongoFetch verbatim (Basic auth + Idempotency-Key + throw-on-non-2xx)"
  - "Beta /v2 nesting is optional-chained defensively rather than assumed"

requirements-completed: [PAY-01, PAY-03]

# Metrics
duration: 4min
completed: 2026-07-16
---

# Phase 5 Plan 02: PayMongo Money-Movement Client Summary

**Extended the PayMongo REST client with the four Phase-5 money-movement calls (hosted checkout, inhouse batch transfer, refund, wallet list) and fixed the /v1-vs-/v2 base so a /v2 call can never hit `/v1/v2/...`.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-16T12:07:47Z
- **Completed:** 2026-07-16T12:11:14Z
- **Tasks:** 2
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments

- Refactored `PAYMONGO_BASE` to the version-less `https://api.paymongo.com`; both existing Linked-Account calls now pass fully-versioned `/v1/...` paths (no regression) and the new calls pass `/v1` or `/v2` as required — the T-05-06 routing fix.
- Added `createCheckoutSession` (`/v1/checkout_sessions`) charging an exact server-frozen amount across the full PH rail set `["card","gcash","paymaya","qrph"]` (D-53/54).
- Added `createBatchTransfer` (`/v2/batch_transfers`) — the inhouse hold-until-session payout of an exact `netCents` (D-52), `provider:"paymongo"` (never payment-splitting), keyed `payout:<bookingId>`.
- Added `createRefund` (`/v1/refunds`, keyed `refund:<paymentId>`) and `listWalletAccounts` (`/v2/wallets?status=activated`) — the D-60 refund mechanism + wallet enumeration primitives.
- Extended the fail-closed prod boot guard to `PLATFORM_WALLET_NUMBER`/`NAME` and added the `PLATFORM_WALLET` source_account (T-05-09).
- Extended `mockPayMongo` with matching stubs (+ `reset()`) and added a global-fetch-mocked test proving exact URL routing, PH-rail checkout body, inhouse net transfer body, and per-call Idempotency-Keys.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend paymongo.ts — versioned base + checkout/transfer/refund/wallet calls** - `da95c5a` (feat)
2. **Task 2: Extend mockPayMongo + fetch-mocked routing/idempotency test** - `253fc33` (test)

**Plan metadata:** _(final docs commit below)_

## Files Created/Modified

- `src/lib/paymongo.ts` (modified) - Version-less base + `PLATFORM_WALLET`/fail-closed guard; added `createCheckoutSession`, `createRefund`, `createBatchTransfer`, `listWalletAccounts`.
- `tests/helpers/mocks.ts` (modified) - `mockPayMongo` gains four deterministic stubs mirroring the new return shapes; all added to `reset()`.
- `tests/payments/paymongo-calls.test.ts` (created) - Global-fetch mock over the real client; asserts /v1 vs /v2 routing (no `/v1/v2`), PH-rail checkout body, inhouse net transfer body + `payout:` key, refund `reason:"others"` + `refund:` key, GET wallets with no Idempotency-Key.

## Contract Reference (Plans 03/04/05 depend on these)

```typescript
// src/lib/paymongo.ts
export type CheckoutSession = { id: string; checkoutUrl: string };
export function createCheckoutSession(input: {
  amountCents: number; currency?: string; name: string; description?: string;
  referenceNumber: string; metadata?: Record<string, string>;
  successUrl: string; cancelUrl: string; idempotencyKey: string;   // caller sets e.g. checkout:<bookingId>
}): Promise<CheckoutSession>;                                       // POST /v1/checkout_sessions

export type Refund = { id: string; status: string };
export function createRefund(input: {
  amountCents: number; paymentId: string; notes?: string;
}): Promise<Refund>;                                               // POST /v1/refunds, key refund:<paymentId>
//                                                                    ⚠ FAILS for QRPh/UBP — caller branches on method first

export type BatchTransfer = { batchId: string; transferId: string; status: string };
export function createBatchTransfer(input: {
  netCents: number; currency?: string; bookingId: string; description: string;
  destination: { number: string; name: string; bic?: string }; callbackUrl?: string;
}): Promise<BatchTransfer>;                                        // POST /v2/batch_transfers, key payout:<bookingId>
//                                                                    amount = netCents verbatim (D-52); provider "paymongo" (inhouse)

export type WalletAccount = { id: string; accountNumber: string; accountName: string; status: string };
export function listWalletAccounts(): Promise<WalletAccount[]>;    // GET /v2/wallets?status=activated
//                                                                    GLOBAL list — caller MUST correlate by id/number, never [0]
```

**Base override approach:** `PAYMONGO_BASE = "https://api.paymongo.com"` (no trailing `/v1`); every `paymongoFetch(path)` call passes a fully-versioned path. `PLATFORM_WALLET = { number, name, bic }` reads `PLATFORM_WALLET_*` env with BIC default `PAEYPHM2XXX` and is the `source_account` of every batch transfer.

**Mock stub names (Wave-2 test harness):** `mockPayMongo.createCheckoutSession`, `.createRefund`, `.createBatchTransfer`, `.listWalletAccounts` — deterministic returns matching the real shapes; all cleared in `mockPayMongo.reset()`.

## Decisions Made

None beyond the plan — followed the locked D-52/D-53/D-60 contracts and Pitfall-3 base fix as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `npx tsc --noEmit` clean; `npx vitest run tests/payments tests/paymongo` = 33/33 green (4 new in `paymongo-calls.test.ts`).

## User Setup Required

**External service configuration is a UAT prerequisite, NOT a blocker for this plan** (all money-movement calls run against mocks in tests). Before real transfers can run in UAT, the operator must:

- Add env vars: `PLATFORM_WALLET_NUMBER`, `PLATFORM_WALLET_NAME`, `PLATFORM_WALLET_BIC` (source: PayMongo dashboard → platform wallet; BIC default `PAEYPHM2XXX`).
- Confirm the money-movement `/v2` beta (`batch_transfers`, `wallets`) is enabled on the account (sales-gated PayMongo Platforms / Linked-Accounts beta). Real transfers are UAT-blocked until then; code + tests are green against mocks.

## Next Phase Readiness

- Wave-2 plans (03 checkout wiring, 04 refund backstop, 05 payout sweep) can build directly on these four functions and the matching mock stubs.
- Plan 05's payout sweep MUST correlate `listWalletAccounts()` entries to the booking's host by `wallet.id`/`accountNumber` before transferring (documented in the JSDoc) — never `[0]`.
- Plan 04's refund backstop MUST branch on the booking's payment method before calling `createRefund` (QRPh/UBP unrefundable) — documented in the JSDoc.

## Self-Check: PASSED

- Files verified present: `src/lib/paymongo.ts`, `tests/helpers/mocks.ts`, `tests/payments/paymongo-calls.test.ts`, `.planning/phases/05-payments-payouts/05-02-SUMMARY.md`.
- Commits verified: `da95c5a` (Task 1), `253fc33` (Task 2).

---
*Phase: 05-payments-payouts*
*Completed: 2026-07-16*
