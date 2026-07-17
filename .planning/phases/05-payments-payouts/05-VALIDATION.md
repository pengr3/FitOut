---
phase: 05
slug: payments-payouts
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-16
updated: 2026-07-17
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `05-RESEARCH.md` § Validation Architecture. The per-task rows are
> populated by the planner (task IDs) and executor (status); the requirement→test
> map below is the authoritative source until then.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `4.1.8` (unit/integration, `environment: "node"`) + Playwright `1.60.0` (E2E) |
| **Config file** | `vitest.config.ts` (per-worker isolated Postgres schema; migrates `./drizzle`) |
| **Quick run command** | `npx vitest run tests/payments tests/paymongo` |
| **Full suite command** | `npm test` (`vitest run`) |
| **Estimated runtime** | ~30 seconds (quick); full suite per isolated-schema config |

**Harness assets to reuse:** `mockPayMongo` (signs valid `Paymongo-Signature` via `signWebhook`, provides `badSignature`), the signed-webhook POST pattern (`tests/paymongo/webhook-merchant-activated.test.ts`), `makeRacingClients` (independent connections for concurrency proofs), `isPgError` for SQLSTATE. **Wave 0 extends** `mockPayMongo` with `createCheckoutSession`, `createBatchTransfer`, `createRefund`, `listWalletAccounts` stubs.

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/payments tests/paymongo` (fast; < 30s target)
- **After every plan wave:** Run `npm test` (full Vitest suite, isolated schemas)
- **Before `/gsd-verify-work`:** Full suite green + a manual PayMongo test-mode E2E (real checkout redirect + tunneled webhook)
- **Max feedback latency:** 30 seconds

---

## Requirement → Test Map (post-execution — verified green 2026-07-17)

Suite: `npx vitest run tests/payments tests/paymongo` → **75/75 passing, 12 files** (2026-07-17). Every row below is COVERED (test present, targets the behavior, runs green).

| Requirement | Behavior | Test Type | Automated Command | Status |
|-------------|----------|-----------|-------------------|--------|
| PAY-01 | "Confirm & pay" creates a checkout with amount = frozen `quotedTotalCents`, all 4 rails, `reference_number = booking.id` | unit | `npx vitest run tests/payments/checkout-create.test.ts` | ✅ COVERED |
| PAY-01 / PAY-03 | PayMongo client routing (/v1 checkout+refund, /v2 transfer+wallets — no `/v1/v2` bug), PH-rail body, per-call Idempotency-Keys | unit | `npx vitest run tests/payments/paymongo-calls.test.ts` | ✅ COVERED |
| PAY-01 / BOOK-04 | `checkout_session.payment.paid` webhook flips `pending → confirmed` (single writer); browser return does NOT | integration | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` | ✅ COVERED |
| PAY-01 | Webhook idempotency/replay: re-delivered `checkout_session.payment.paid` is a 200 no-op (no double-confirm) | integration | same file | ✅ COVERED |
| PAY-01 (security) | Forged/invalid `Paymongo-Signature` on the payment event → 400, no state change | integration | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` (Plan 04) | ✅ COVERED |
| PAY-01 | Charge amount ignores any client-supplied number (server uses `quotedTotalCents`) | unit | `tests/payments/checkout-create.test.ts` | ✅ COVERED |
| PAY-02 | `computeCommission(gross, rateBps)` — integer rounding, `net = gross − commission`, boundary amounts | unit | `npx vitest run tests/payments/commission.test.ts` | ✅ COVERED |
| PAY-02 | Commission rate + amount frozen on the ledger row; later `COMMISSION_RATE_BPS` change does not alter existing rows | integration | `npx vitest run tests/payments/ledger-freeze.test.ts` | ✅ COVERED |
| PAY-03 | Sweep selects only `confirmed` bookings with `endsAt + delay ≤ now()` and no ledger row | integration | `npx vitest run tests/payments/payout-sweep.test.ts` | ✅ COVERED |
| PAY-03 | **At-most-once under duplicate/concurrent sweeps** — `UNIQUE(booking_id)` yields exactly one transfer | integration (racing) | same file (`makeRacingClients`) | ✅ COVERED |
| PAY-03 | Transfer body: `provider:"paymongo"`, `amount = netCents`, destination = host wallet, stable Idempotency-Key | unit | `tests/payments/payout-sweep.test.ts` | ✅ COVERED |
| PAY-03 | `Processing → Paid` on transfer success; `→ Failed` on failure (poll `GET /v2/transfers/{id}`) | integration | `npx vitest run tests/payments/payout-reconcile.test.ts` | ✅ COVERED |
| HOST-03 | Earnings page: per-booking `Held/Processing/Paid/Refunded`, `gross → −10% → net`, expected date, summary totals; owner-gated | component + integration | `npx vitest run tests/payments/earnings-view.test.ts` | ✅ COVERED |
| D-58 | Extend-hold: creating the checkout pushes `expiresAt` past the 15-min TTL so the hold isn't swept mid-payment | integration | `npx vitest run tests/payments/checkout-create.test.ts` (Plan 03) | ✅ COVERED |
| D-58 | Auto-refund backstop: `payment.paid` on a genuinely-gone slot (0-row confirm) → refund (card/GCash) OR operator-alert (**QRPh unsupported**) | integration | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` (Plan 04) | ✅ COVERED |
| D-58 / PAY-01 | **Double-book-during-payment**: two bookers pay for the same slot; EXCLUDE lets exactly one confirm; loser is auto-refunded/alerted | integration (racing) | `tests/paymongo/webhook-payment-paid.test.ts` (Plan 04) | ✅ COVERED |
| D-60 | Refund idempotency: `payment.refunded` / `payment.refund.updated` handled once via `paymongo_event` | integration | `npx vitest run tests/paymongo/webhook-refund.test.ts` | ✅ COVERED |
| CR-01 (review-fix) | No-wallet sweep **rolls the claim back** (no dead-end `held` row), fires no transfer, raises `[payout-alert]` | integration (racing) | `npx vitest run tests/payments/payout-sweep.test.ts` | ✅ COVERED |
| WR-04 (review-fix) | `failed` payout is bounded-retryable — re-claim + due re-selection within the backoff/max-age window; at-most-once preserved | integration | `npx vitest run tests/payments/payout-sweep.test.ts` | ✅ COVERED |
| WR-01 (review-fix) | Post-payout refund (`processing`/`paid` ledger row) is **never** rewritten to `refunded` — `refund_after_payout` clawback alert (`needs_attention`) fires instead | integration | `npx vitest run tests/paymongo/webhook-refund.test.ts` | ✅ COVERED (added 2026-07-17) |
| WR-02 (review-fix) | Non-terminal refund status (`failed`/`pending` on `payment.refund.updated`) → early-return; ledger stays `held`, booking stays `confirmed` | integration | `npx vitest run tests/paymongo/webhook-refund.test.ts` | ✅ COVERED (added 2026-07-17) |

---

## Per-Task Verification Map

Reconstructed post-execution from the seven plan SUMMARYs (per-plan granularity; individual plans used internal Task 1/2/3 numbering, not global task IDs).

| Plan | Requirement | Secure Behavior | Test File(s) | Status |
|------|-------------|-----------------|--------------|--------|
| 05-01 | PAY-02 | Pure integer-cents commission + frozen ledger schema (`UNIQUE(booking_id)` at-most-once gate) | `tests/payments/commission.test.ts` | ✅ green |
| 05-02 | PAY-01 / PAY-03 | PayMongo money-movement client (versioned /v1 vs /v2, PH rails, per-call Idempotency-Keys, net-verbatim transfer) | `tests/payments/paymongo-calls.test.ts` | ✅ green |
| 05-03 | PAY-01 / D-58 | Confirm & pay: server-frozen charge, extend-hold before charge, no sync flip (webhook is confirm authority) | `tests/payments/checkout-create.test.ts`, `tests/booking/state-machine.test.ts` | ✅ green |
| 05-04 | PAY-01 / D-57 / D-58 / D-60 | Webhook = single confirm writer; forged-sig 400; replay no-op; auto-refund/QRPh-alert backstop; refund mechanism | `tests/paymongo/webhook-payment-paid.test.ts`, `tests/paymongo/webhook-refund.test.ts` | ✅ green |
| 05-05a | PAY-03 / PAY-02 | Payout sweep: due-selection, at-most-once claim, wallet↔host correlation, commission freeze | `tests/payments/payout-sweep.test.ts`, `tests/payments/ledger-freeze.test.ts` | ✅ green |
| 05-05b | PAY-03 / D-59 | Reconcile poll: `Processing → Paid/Failed`, idempotent guard, safe-default status, stuck alert | `tests/payments/payout-reconcile.test.ts` | ✅ green |
| 05-06 | HOST-03 | Owner-gated earnings ledger read, host-visible `gross → −10% → net`, calm state badges | `tests/payments/earnings-view.test.ts` | ✅ green |
| review-fix | CR-01 / WR-01 / WR-02 / WR-04 | Rollback-on-no-wallet, post-payout clawback alert, non-terminal refund early-return, bounded failed-payout retry | `tests/payments/payout-sweep.test.ts`, `tests/paymongo/webhook-refund.test.ts` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/payments/commission.test.ts` — PAY-02 pure math (no DB) *(Plan 05-01)*
- [x] `tests/payments/checkout-create.test.ts` — PAY-01 charge-integrity + D-58 extend-hold (mock `paymongo.ts`) *(Plan 05-03)*
- [x] `tests/paymongo/webhook-payment-paid.test.ts` — D-57 confirm authority + replay + D-58 auto-refund/double-book backstop *(Plan 05-04)*
- [x] `tests/paymongo/webhook-refund.test.ts` — D-60 refund event idempotency + WR-01/WR-02 edges *(Plan 05-04 + validation audit)*
- [x] `tests/payments/ledger-freeze.test.ts` — D-51 commission freeze *(Plan 05-05a)*
- [x] `tests/payments/payout-sweep.test.ts` — PAY-03 sweep + at-most-once + multi-host wallet correlation (`makeRacingClients`) + CR-01/WR-04 *(Plan 05-05a + review-fix)*
- [x] `tests/payments/payout-reconcile.test.ts` — PAY-03 Processing→Paid/Failed reconcile + operator alerts (Plan 05b)
- [x] `tests/payments/earnings-view.test.ts` — HOST-03 view (component + owner-gate) *(Plan 05-06)*
- [x] Extend `tests/helpers/mocks.ts` `mockPayMongo` with checkout/transfer/refund/wallet stubs *(Plan 05-02 + 05-05b `getTransfer`)*
- [x] `npm install inngest` (+ `inngest-cli` dev) — `inngest@4.13.0` installed *(Plan 05-05a)*
- [x] *(bonus)* `tests/payments/paymongo-calls.test.ts` — /v1-vs-/v2 client routing + Idempotency-Keys *(Plan 05-02)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real checkout redirect + tunneled webhook (test mode) | PAY-01 | Requires PayMongo test-mode account + ngrok/cloudflared tunnel; not reproducible in CI | Create a booking → "Confirm & pay" → complete a test-mode payment on the hosted page → confirm the tunneled `checkout_session.payment.paid` webhook flips the booking to `confirmed` |
| Real host payout via `/v2/batch_transfers` | PAY-03 | **UAT-gated** on PayMongo Platforms/Linked-Accounts + money-movement `/v2` beta enablement (STATE blocker) | Once beta-enabled: run the sweep against a test-mode activated linked-account wallet; verify one `inhouse` transfer of `net` lands and the ledger row flips `Processing → Paid` |
| QRPh genuinely-gone-slot fallback | D-58 | QRPh refunds unsupported by PayMongo API — path is operator-alert, not auto-refund | Force a `payment.paid` on a taken QRPh slot in test mode; verify an operator alert is raised (no silent money retention) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s (quick suite ~8s; refund file ~1.5s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ✅ validated 2026-07-17 — all 22 mapped requirements/decisions COVERED (75/75 green); the two review-fix gaps (WR-01, WR-02) filled and verified.

---

## Validation Audit 2026-07-17

State A (existing VALIDATION.md) re-audited against the executed phase. The draft mapped every test as `❌ W0` (pre-execution); all Wave-0 files were in fact created and green. Two review-fix behaviors in `handleRefund` (WR-01 post-payout clawback alert, WR-02 non-terminal refund early-return) had no automated coverage — both filled this audit.

| Metric | Count |
|--------|-------|
| Requirements/decisions in map | 22 |
| COVERED (pre-audit) | 20 |
| Gaps found (MISSING) | 2 (WR-01, WR-02) |
| Resolved (tests added) | 2 |
| Escalated | 0 |
| Suite after audit | 75/75 green (12 files) |

**Tests added:** `tests/paymongo/webhook-refund.test.ts` — `WR-01: a refund on an already-processing (post-payout) ledger row is NOT flipped to refunded — it alerts a clawback instead`; `WR-02: a non-terminal refund status (failed) does not flip the ledger or cancel the booking`. Test-file-only change (harness gained optional `state`/`status` params + an `@/lib/audit` mock); no `src/**` modified.

**Not automated (unchanged — adequately handled by convention):** WR-03 (`PAYMONGO_WEBHOOK_SECRET` fail-closed boot guard — module-load throw, consistent with the repo's other untested boot guards) and WR-05 (`booking.status` default `pending` — proven transitively by the confirm-authority tests that seed `pending` and prove only the webhook confirms).
