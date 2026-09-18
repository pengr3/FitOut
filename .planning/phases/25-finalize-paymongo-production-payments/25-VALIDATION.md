---
phase: "25"
slug: "finalize-paymongo-production-payments"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-18"
---

# Phase 25 — Validation Strategy

> Validation contract for controlled PayMongo production enablement. Live-money evidence is a human/provider gate and must never be replaced by mocked browser-return evidence.

## Test Infrastructure

| Property | Value |
|---|---|
| **Framework** | Vitest 4.1.8 with PostgreSQL isolated schemas; Playwright 1.60.0 where browser verification is needed |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `node node_modules/eslint/bin/eslint.js src/lib/paymongo.ts src/app/api/paymongo/webhook/route.ts src/lib/payments/confirm-booking-payment.ts src/app/actions/booking.ts src/lib/payments/checkout-probe.ts src/lib/payments/checkout-lease.ts src/lib/payments/retire-checkout.ts src/lib/payments/refund-rail.ts src/lib/payments/cancellation.ts src/inngest/functions/payment-reconcile.ts src/inngest/functions/payout-reconcile.ts src/inngest/functions/payout-sweep.ts src/app/api/inngest/route.ts src/lib/payments/config.ts` |
| **Full suite command** | `npm test -- tests/paymongo/webhook-signature.test.ts tests/paymongo/webhook-payment-paid.test.ts tests/paymongo/webhook-refund.test.ts tests/paymongo/webhook-merchant-activated.test.ts tests/paymongo/checkout-idempotency-real.test.ts tests/payments/checkout-create.test.ts tests/payments/confirm-idempotency.test.ts tests/payments/payment-reconcile.test.ts tests/payments/payment-reconcile-cadence.test.ts tests/payments/payout-sweep.test.ts tests/payments/payout-reconcile.test.ts` |
| **Estimated runtime** | Static checks: under 2 minutes; database suite depends on the local Postgres fixture |

## Sampling Rate

- **After every code task commit:** Run the scoped ESLint command and the exact affected payment tests.
- **After every plan wave:** Run the focused payment suite after restoring the test database.
- **Before `$gsd-verify-work`:** Run `npx tsc --noEmit`, then the focused payment suite.
- **Production gate:** Observe a controlled provider transaction, a signed webhook, registered Inngest recovery, and operator-runbook handling.

## Wave 0 Requirements

- [ ] Restore Docker/Postgres and provision `fitout_test` with `npm run db:up` and `npm run db:test:setup` before claiming the focused payment suite is green.
- [ ] Do not add a test framework; existing payment tests cover the repository mechanics.
- [ ] Obtain PayMongo/Vercel/Inngest console evidence for approved rails, wallet capability, webhook subscription, and owned operations response before live enablement.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|---|---|---|---|
| Approved PayMongo live rails and account limits | Phase scope TBD | Provider account state is not available in the repository | An authorized account owner records approved rails and limits before enabling traffic. |
| Signed production webhook and recovery registration | Phase scope TBD | Requires protected console configuration and a provider delivery | Verify the canonical production endpoint and event subscriptions, then observe a controlled signed delivery and Inngest execution without exposing secrets. |
| Controlled payout and manual-refund ownership | Phase scope TBD | Wallet capability and real funds require an authorized operator | Verify provider entitlement, allowed amount/recipient, rollback decision, alert recipient, and manual-return SLA before broad payout availability. |

## Validation Sign-Off

- [ ] Every code task has a scoped automated verification command.
- [ ] The local database-backed payment suite is green after Wave 0 recovery.
- [ ] Live PayMongo and Inngest evidence is captured by an authorized owner without recording secret values.
- [ ] `nyquist_compliant: true` is set only when the above evidence and checks are complete.

**Approval:** pending
