---
phase: 05
slug: payments-payouts
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-16
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

## Requirement → Test Map (authoritative until task IDs assigned)

| Requirement | Behavior | Test Type | Automated Command | File Exists |
|-------------|----------|-----------|-------------------|-------------|
| PAY-01 | "Confirm & pay" creates a checkout with amount = frozen `quotedTotalCents`, all 4 rails, `reference_number = booking.id` | unit | `npx vitest run tests/payments/checkout-create.test.ts` | ❌ W0 |
| PAY-01 / BOOK-04 | `checkout_session.payment.paid` webhook flips `pending → confirmed` (single writer); browser return does NOT | integration | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` | ❌ W0 |
| PAY-01 | Webhook idempotency/replay: re-delivered `checkout_session.payment.paid` is a 200 no-op (no double-confirm) | integration | same file | ❌ W0 |
| PAY-01 (security) | Forged/invalid `Paymongo-Signature` on the payment event → 400, no state change | integration | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` (Plan 04) | ❌ W0 |
| PAY-01 | Charge amount ignores any client-supplied number (server uses `quotedTotalCents`) | unit | `tests/payments/checkout-create.test.ts` | ❌ W0 |
| PAY-02 | `computeCommission(gross, rateBps)` — integer rounding, `net = gross − commission`, boundary amounts | unit | `npx vitest run tests/payments/commission.test.ts` | ❌ W0 |
| PAY-02 | Commission rate + amount frozen on the ledger row; later `COMMISSION_RATE_BPS` change does not alter existing rows | integration | `npx vitest run tests/payments/ledger-freeze.test.ts` | ❌ W0 |
| PAY-03 | Sweep selects only `confirmed` bookings with `endsAt + delay ≤ now()` and no ledger row | integration | `npx vitest run tests/payments/payout-sweep.test.ts` | ❌ W0 |
| PAY-03 | **At-most-once under duplicate/concurrent sweeps** — `UNIQUE(booking_id)` yields exactly one transfer | integration (racing) | same file (`makeRacingClients`) | ❌ W0 |
| PAY-03 | Transfer body: `provider:"paymongo"`, `amount = netCents`, destination = host wallet, stable Idempotency-Key | unit | `tests/payments/payout-sweep.test.ts` | ❌ W0 |
| PAY-03 | `Processing → Paid` on transfer success; `→ Failed` on failure (poll `GET /v2/transfers/{id}`) | integration | `npx vitest run tests/payments/payout-reconcile.test.ts` | ❌ W0 |
| HOST-03 | Earnings page: per-booking `Held/Processing/Paid/Refunded`, `gross → −10% → net`, expected date, summary totals; owner-gated | component + integration | `npx vitest run tests/payments/earnings-view.test.ts` | ❌ W0 |
| D-58 | Extend-hold: creating the checkout pushes `expiresAt` past the 15-min TTL so the hold isn't swept mid-payment | integration | `npx vitest run tests/payments/checkout-create.test.ts` (Plan 03) | ❌ W0 |
| D-58 | Auto-refund backstop: `payment.paid` on a genuinely-gone slot (0-row confirm) → refund (card/GCash) OR operator-alert (**QRPh unsupported**) | integration | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` (Plan 04) | ❌ W0 |
| D-58 / PAY-01 | **Double-book-during-payment**: two bookers pay for the same slot; EXCLUDE lets exactly one confirm; loser is auto-refunded/alerted | integration (racing) | `tests/paymongo/webhook-payment-paid.test.ts` (Plan 04) | ❌ W0 |
| D-60 | Refund idempotency: `payment.refunded` / `payment.refund.updated` handled once via `paymongo_event` | integration | `npx vitest run tests/paymongo/webhook-refund.test.ts` | ❌ W0 |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD (planner assigns) | — | — | — | — | — | — | — | — | ⬜ pending |

*Populated during planning (task IDs) and execution (status). Use the Requirement → Test Map above as the source until then. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/payments/commission.test.ts` — PAY-02 pure math (no DB)
- [ ] `tests/payments/checkout-create.test.ts` — PAY-01 charge-integrity + D-58 extend-hold (mock `paymongo.ts`)
- [ ] `tests/paymongo/webhook-payment-paid.test.ts` — D-57 confirm authority + replay + D-58 auto-refund/double-book backstop
- [ ] `tests/paymongo/webhook-refund.test.ts` — D-60 refund event idempotency
- [ ] `tests/payments/ledger-freeze.test.ts` — D-51 commission freeze
- [ ] `tests/payments/payout-sweep.test.ts` — PAY-03 sweep + at-most-once + multi-host wallet correlation (`makeRacingClients`)
- [ ] `tests/payments/payout-reconcile.test.ts` — PAY-03 Processing→Paid/Failed reconcile + operator alerts (Plan 05b)
- [ ] `tests/payments/earnings-view.test.ts` — HOST-03 view (component + owner-gate)
- [ ] Extend `tests/helpers/mocks.ts` `mockPayMongo` with checkout/transfer/refund/wallet stubs
- [ ] `npm install inngest` (+ `inngest-cli` dev) — no test-framework install needed (Vitest/Playwright present)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real checkout redirect + tunneled webhook (test mode) | PAY-01 | Requires PayMongo test-mode account + ngrok/cloudflared tunnel; not reproducible in CI | Create a booking → "Confirm & pay" → complete a test-mode payment on the hosted page → confirm the tunneled `checkout_session.payment.paid` webhook flips the booking to `confirmed` |
| Real host payout via `/v2/batch_transfers` | PAY-03 | **UAT-gated** on PayMongo Platforms/Linked-Accounts + money-movement `/v2` beta enablement (STATE blocker) | Once beta-enabled: run the sweep against a test-mode activated linked-account wallet; verify one `inhouse` transfer of `net` lands and the ledger row flips `Processing → Paid` |
| QRPh genuinely-gone-slot fallback | D-58 | QRPh refunds unsupported by PayMongo API — path is operator-alert, not auto-refund | Force a `payment.paid` on a taken QRPh slot in test mode; verify an operator alert is raised (no silent money retention) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
