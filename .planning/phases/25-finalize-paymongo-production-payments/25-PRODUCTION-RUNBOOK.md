# Phase 25 — PayMongo Production Payment Runbook

## Authority

This is an evidence ledger and controlled-operation template, not authorization to accept, refund, transfer, or move live money. The account owner and a named FitOut release authority must approve each live operation before it occurs. A browser success return is never payment-confirmation evidence; only a verified provider event or server-to-server provider probe may reach `confirmPaidBooking`.

## Environment boundary

- **Local isolated test environment:** `fitout_test` only. Database-backed tests are valid only after Docker is reachable and `npm run db:up` plus `npm run db:test:setup` complete successfully.
- **Test-mode provider probe:** opt-in only when `RUN_LIVE_PAYMONGO_PROBE=1` and a configured `sk_test_` credential already exist. Do not set, display, copy, or record credentials.
- **Production:** account capabilities, console configuration, wallet identity, payment data, and secret values remain outside this repository. Record redacted references and outcomes only.

## Baseline evidence ledger

| ID | UTC timestamp | Scope / command | Result | Evidence and bounded conclusion |
|---|---|---|---|---|
| E-25-01-W0 | 2026-09-18T03:56:22Z | `docker info --format '{{.ServerVersion}}'` | **BLOCKED** | Docker CLI could not connect to the local daemon (`dockerDesktopLinuxEngine` pipe unavailable). No credentials or provider data were accessed. `npm run db:up`, `npm run db:test:setup`, and every DB-backed payment test were therefore not run and are **not green**. |
| E-25-01-DB | 2026-09-18T03:56:22Z | Focused webhook, checkout, confirmation, reconciliation, refund, merchant, payout-sweep, and payout-reconcile suite | **NOT RUN** | Wave 0 blocked the required isolated `fitout_test` setup. Re-run only after E-25-01-W0 is resolved; record exit code and aggregate test result here. |
| E-25-01-LINT | 2026-09-18T03:56:22Z | Scoped payment-path ESLint command from `25-01-PLAN.md` | **NOT RUN** | Execution stopped at the strict Wave 0 infrastructure gate before planned verification commands. This is not a static-analysis pass. |
| E-25-01-TSC | 2026-09-18T03:56:22Z | `node node_modules/typescript/bin/tsc --noEmit` | **NOT RUN** | Execution stopped at the strict Wave 0 infrastructure gate before planned verification commands. This is not a type-check pass. |
| E-25-01-PROBE | 2026-09-18T03:56:22Z | Opt-in Checkout Session test-mode probe | **NOT RUN** | The opt-in conditions were not evaluated or changed. No credential, Checkout Session, payment, customer, or provider payload was created or recorded. |

### Required rerun sequence after Wave 0 recovery

1. Confirm `docker info` succeeds without printing configuration or credentials.
2. Run `npm run db:up`, then `npm run db:test:setup`; record UTC time and exit result.
3. Run the exact focused suite in `25-01-PLAN.md`; record the command, exit result, and aggregate test result only.
4. Run the plan's scoped ESLint command and `node node_modules/typescript/bin/tsc --noEmit`; record exit results.
5. Run the test-mode probe only when its already-configured non-secret opt-in conditions hold. Record only the redacted outcome and cleanup result.

## Provider evidence references

Record a dated console, deployment, Inngest, or provider reference identifier and an outcome, never credentials, wallet identifiers, balances, customer data, payment identifiers, or raw event payloads.

| Capability | Evidence reference | Status | Outcome / owner |
|---|---|---|---|
| Configured checkout rails: card, GCash, PayMaya, QR Ph | — | UNKNOWN | Awaiting account-owner evidence. |
| Canonical production webhook destination and subscribed events | — | UNKNOWN | Awaiting account-owner evidence. |
| Production secret-name scope and Preview isolation | — | UNKNOWN | Awaiting authorized deployment evidence without values. |
| Inngest registration, schedules, and alert delivery | — | UNKNOWN | Awaiting operator evidence and named owner. |

## Controlled checkout

Before a single bounded live checkout: record the authority, approved rail, amount bound, release cohort, success condition, abort condition, and redacted provider reference. Confirm only from a verified `checkout_session.payment.paid` event or a provider probe. Do not treat a hosted-page return, redirect, or query parameter as payment evidence.

## Webhook delivery

Verify the public `POST /api/paymongo/webhook` endpoint, signing configuration, and subscribed events with authorized account evidence. The expected payment fast path is a raw-body HMAC-verified, event-ID-deduplicated delivery; record the event type and a redacted delivery reference only.

| Event path | Status | Required evidence |
|---|---|---|
| Paid checkout webhook | UNKNOWN | Signed delivery observed and safely acknowledged. |
| Refund webhook | UNKNOWN | Enabled-rail refund event observed and ledger/booking result checked. |
| Merchant / linked-account activation | UNKNOWN | Authorized merchant event evidence and resulting host state. |

## Provider-probe recovery

The `paymentReconcile` path is recovery evidence for a missed webhook, not a replacement confirmation writer. Record the job registration reference, bounded provider-probe result, resulting status, alert behavior, and UTC time. If the provider state is unknown, leave the booking non-terminal and record `UNKNOWN`, never an inferred unpaid result.

## Manual return and refund

For every enabled rail, record a controlled refund result or an approved `OPTED OUT` state. QR Ph and any other unrefundable or unverified rail require a named manual-return/clawback owner, monitored alert recipient, response SLA, reconciliation record, and customer/host communication policy before broad availability.

## Linked-account activation

Do not infer marketplace, linked-account, KYC, or merchant entitlement from source code or test fixtures. Before enabling host onboarding or payout behavior, record the authorized provider capability reference, a redacted activated-merchant observation, and the host-facing fallback if unavailable.

## Payout and wallet recovery

Platform wallet identity and transfer capability remain protected account facts. Before a controlled payout, record authorization, approved recipient and amount bounds, redacted provider transfer reference, durable ledger state, payout-reconciliation result, and any `needs_attention` handling. `UNKNOWN` or in-flight transfer states remain non-terminal.

## Alerts and operational ownership

Record a named operations owner, monitored alert destination, response SLA, escalation path, and observed alert/recovery result. No broad release is authorized while money alerts or manual returns lack a verified owner.

## Rollout decision

**Current decision: HOLD.** The local isolated-database prerequisite is blocked and all live-account evidence is `UNKNOWN`.

Broad availability may be authorized only when each applicable row in `COVERAGE.md` is `VERIFIED` or concrete `OPTED OUT`, the exception owner and fallback are recorded, and the authorized release decision is complete.

## Rollback record

Before live traffic, document the approved provider-side method to stop new checkout activity, the authority allowed to invoke it, affected customer/host communications, payout handling, and reconciliation follow-up. No kill-switch or rollback mechanism is inferred from repository source.

## Assumptions and open questions

### Unresolved assumptions

- **A1:** The live PayMongo account can be activated for every configured checkout rail and required marketplace/wallet capability.
- **A2:** The live console can register the authoritative public endpoint and required event set.
- **A3:** A named operator will monitor and resolve `needs_attention` money alerts and manual-return cases.
- **A4:** A bounded controlled charge and payout can be approved before broad availability.

### Unresolved questions

- **Q1:** Which live PayMongo products, rails, limits, wallets, and linked-account functions are approved for FitOut?
- **Q2:** What canonical hostname, webhook destination, signing-secret rotation procedure, and event set are active?
- **Q3:** Who owns live exceptions, manual returns, and alert response, and what SLA applies?
- **Q4:** What controlled-money scope is authorized before broad release?
- **Q5:** Which provider-side action stops new checkout activity, and who may invoke it?

## Evidence index

| ID | Scope | Status | Location |
|---|---|---|---|
| E-25-01-W0 | Local Docker prerequisite | BLOCKED | Baseline evidence ledger above |
| E-25-01-DB | Isolated DB payment mechanics | NOT RUN | Baseline evidence ledger above |
| E-25-01-LINT | Payment-path static analysis | NOT RUN | Baseline evidence ledger above |
| E-25-01-TSC | Payment-path type analysis | NOT RUN | Baseline evidence ledger above |
| E-25-01-PROBE | Opt-in test-mode provider probe | NOT RUN | Baseline evidence ledger above |

No credential, wallet value, customer record, payment identifier, or raw provider payload belongs in this document.
