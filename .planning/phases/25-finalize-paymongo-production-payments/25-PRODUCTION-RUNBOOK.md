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
| E-25-01-W0R | 2026-09-18T05:25:46Z | `docker info --format '{{.ServerVersion}}'` | **PASS** | Docker Engine reported version `29.6.1`; the Wave 0 infrastructure prerequisite recovered. No configuration or credentials were printed. |
| E-25-01-DB | 2026-09-18T05:25:46Z | `npm run db:up`, `npm run db:test:setup`, then the focused webhook, checkout, confirmation, reconciliation, refund, merchant, payout-sweep, and payout-reconcile suite from `25-01-PLAN.md` | **PASS** | The isolated `fitout_test` database was prepared from migrations and the focused Vitest command exited 0. This verifies local mechanics only; it does not establish provider entitlement or live-account readiness. |
| E-25-01-LINT | 2026-09-18T05:25:46Z | Scoped payment-path ESLint command from `25-01-PLAN.md` | **PASS** | The command exited 0 for the listed payment, webhook, checkout, refund, and reconciliation source files. |
| E-25-01-TSC | 2026-09-18T05:25:46Z | `node node_modules/typescript/bin/tsc --noEmit` | **PASS** | The inherited TypeScript command exited 0. |
| E-25-01-PROBE | 2026-09-18T05:25:46Z | Opt-in Checkout Session test-mode probe | **NOT RUN** | The required `RUN_LIVE_PAYMONGO_PROBE=1` opt-in is not configured. No credential was changed or displayed, and no Checkout Session, payment, customer, or provider payload was created or recorded. |

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
| Canonical production webhook destination and subscribed events | E-25-03-PM-WEBHOOK | PARTIAL | The canonical destination is enabled with five required available event types; signed delivery has not yet been observed. |
| Production secret-name scope and Preview isolation | E-25-03-VERCEL | PARTIAL | Production holds the PayMongo and Inngest secret variables; Preview integration-created variables remain configuration-classified and need separate hygiene follow-up. |
| Inngest registration, schedules, and alert delivery | E-25-03-INNGEST | PARTIAL | The production app is registered with its scheduled and event functions; no alert-delivery exercise has been performed. |

### Dated console observations

These are read-only observations by the authorized account operator on 2026-09-18. No key value, wallet identifier, balance, customer record, payment identifier, raw event, or configuration was copied or changed.

| ID | UTC timestamp | Console scope | Result | Bounded conclusion |
|---|---|---|---|---|
| E-25-02-PM-LIVE | 2026-09-18T07:35:09Z | PayMongo Developers | **PASS** | Both Live and Test key sections were present; the live section establishes that the signed-in account has a live environment. Values were not viewed or recorded. |
| E-25-02-PM-RAILS | 2026-09-18T07:35:09Z | PayMongo Payment Methods | **HOLD** | QR Ph was the only active visible payment method. Card, GCash, PayMaya, GrabPay, ShopeePay, Google Pay, listed direct-debit rails, and BillEase were inactive or required activation/business-type changes. No rail was enabled. |
| E-25-02-PM-WEBHOOK | 2026-09-18T07:35:09Z | PayMongo Webhooks | **HOLD** | The endpoint inventory stated “No Webhooks yet.” There is therefore no configured canonical `POST /api/paymongo/webhook` destination, signing configuration, event subscription, or delivery evidence. |
| E-25-02-PM-WALLET | 2026-09-18T07:35:09Z | PayMongo Wallets and Child Accounts | **PARTIAL** | A wallet UI offered transfers to another wallet or local bank, but Child Accounts reported none. This does not establish marketplace/linked-account merchant entitlement or authorize a host payout. |
| E-25-02-VERCEL | 2026-09-18T07:35:09Z | Vercel `fitout-web` production deployment and environment-variable inventory | **PARTIAL** | `fitout.live` production was Ready. Production listed `PAYMONGO_SECRET_KEY`, `PAYMONGO_PUBLIC_KEY`, `PAYMONGO_WEBHOOK_SECRET`, and `OPS_ALERT_EMAIL`; Preview listed no PayMongo variables. `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` were not present in this project inventory. No value was revealed. |
| E-25-02-INNGEST | 2026-09-18T07:35:09Z | Inngest Production environment | **HOLD** | Production showed zero received events, executions, backlog, and registered functions. No payment/payout reconciliation, schedules, or alert delivery can be evidenced from this environment. |
| E-25-02-TSC | 2026-09-18T07:35:09Z | `node node_modules/typescript/bin/tsc --noEmit` | **BLOCKED** | The current worktree has syntax errors at `e2e/shell.spec.ts:373-374`. This unrelated E2E baseline is not repaired by this phase and the protected-console readiness checkpoint is not green on the current checkout. |
| E-25-03-PM-WEBHOOK | 2026-09-19T05:51:20Z | PayMongo production Webhooks | **PARTIAL** | The enabled canonical endpoint is `POST https://fitout.live/api/paymongo/webhook`, subscribed to `checkout_session.payment.paid`, `merchant.activated`, `merchant.declined`, `payment.refund.updated`, and `payment.refunded`. `merchant.deactivated` was not available in the console. No live provider delivery or payment was initiated. |
| E-25-03-VERCEL | 2026-09-19T05:51:20Z | Vercel `fitout-web` production deployment | **PASS** | A protected production deployment became Ready with the current Inngest production signing key. The stale Inngest custom-origin override was removed; the protected deployment uses Vercel's generated deployment URL. No value or deployment identifier was recorded. |
| E-25-03-INNGEST | 2026-09-19T05:51:20Z | Inngest Production apps and functions | **PASS** | The `fitout` application successfully synced from the protected Vercel deployment (SDK 4.13.0, Next.js), registering 12 functions: the ten operational functions plus failure handlers for `guest-email` and `notify`. No money event or alert-delivery test was run. |

## Plan 25-03 formal HOLD disposition — 2026-09-19

**Decision: HOLD.** The Plan 25-02 decision remains **HOLD**, not `AUTHORIZE CONTROLLED TRANSACTION`. Its required named authority, approved rail, amount bound, participant boundary, abort condition, refund/manual-return owner, and provider-side stop method are therefore not recorded. Task 1's authorization precondition is not met.

The user explicitly selected **HOLD** for Task 2. No hosted checkout, charge, payment, refund, manual return, payout, provider-side stop, delivery resend, forged webhook, or provider probe was initiated for Plan 25-03. This disposition records a release blocker; it is not a financial-operation authorization.

| Capability / task | Disposition | Evidence boundary and release effect |
|---|---|---|
| Controlled checkout and durable confirmation | **HOLD** | No authorized transaction occurred. No signed `checkout_session.payment.paid` delivery or server-to-server Checkout Session probe was observed. A browser return remains presentation only. |
| Webhook configuration | **PARTIAL** | E-25-03-PM-WEBHOOK confirms the canonical endpoint and available subscriptions only; it does not prove signed delivery, HMAC handling, event-ID dedupe, or a booking transition. |
| Missed-webhook reconciliation and alerts | **HOLD / UNKNOWN** | E-25-03-INNGEST proves registration only. No provider-supported recovery exercise, payment-reconciliation execution, alert delivery, or resulting state was observed. Broad release remains blocked. |
| API refund and manual return / clawback | **HOLD** | No rail-specific return authority, amount cap, participant boundary, operator, stop/return procedure, manual-return owner, SLA, or reconciliation record is recorded. No money-return operation occurred. |
| Broad availability | **HOLD** | Existing configuration evidence is retained, but the unproven controlled-payment, recovery, and return paths remain release blockers. |

## Controlled checkout

Before a single bounded live checkout: record the authority, approved rail, amount bound, release cohort, success condition, abort condition, and redacted provider reference. Confirm only from a verified `checkout_session.payment.paid` event or a provider probe. Do not treat a hosted-page return, redirect, or query parameter as payment evidence.

## Webhook delivery

Verify the public `POST /api/paymongo/webhook` endpoint, signing configuration, and subscribed events with authorized account evidence. The expected payment fast path is a raw-body HMAC-verified, event-ID-deduplicated delivery; record the event type and a redacted delivery reference only.

| Event path | Status | Required evidence |
|---|---|---|
| Paid checkout webhook | CONFIGURED | Signed delivery observed and safely acknowledged. |
| Refund webhook | CONFIGURED | Enabled-rail refund event observed and ledger/booking result checked. |
| Merchant / linked-account activation | CONFIGURED | Authorized merchant event evidence and resulting host state. |

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

**Current decision: HOLD.** Production webhook configuration and Inngest registration are now evidenced, but QR Ph is the only active visible rail, no linked child account exists, no signed provider delivery or controlled transaction has been observed, alert ownership is unverified, and the current TypeScript baseline is blocked by unrelated E2E syntax errors. No controlled transaction is authorized.

Broad availability may be authorized only when each applicable row in `COVERAGE.md` is `VERIFIED` or concrete `OPTED OUT`, the exception owner and fallback are recorded, and the authorized release decision is complete.

## Rollback record

Before live traffic, document the approved provider-side method to stop new checkout activity, the authority allowed to invoke it, affected customer/host communications, payout handling, and reconciliation follow-up. No kill-switch or rollback mechanism is inferred from repository source.

**Plan 25-03 HOLD record:** No financial operation occurred, so no rollback or return was executed. The provider-side stop method and accountable authority remain unrecorded and are required before a future controlled operation can start.

## Plan 25-04 final payout and release HOLD disposition — 2026-09-19

**Rollout decision: HOLD.** No broad payment or payout availability is authorized. The user-selected HOLD applies to controlled host payouts as well as the previously held checkout and return paths. No payout, transfer, payment, checkout, refund, manual return, forged webhook, provider probe, provider-side stop, or other provider action was initiated for this plan.

### Controlled payout record

| Required boundary | Final evidence state | HOLD consequence |
|---|---|---|
| Authority | **UNVERIFIED** — no accountable product decision-maker or PayMongo account authority has recorded payout authorization | No payout authorization exists. |
| Merchant, linked-account, and platform-wallet entitlement | **UNVERIFIED** — the existing child-account/wallet inventory is not entitlement evidence | No marketplace, wallet, or host-payout capability is inferred. |
| Amount and recipient boundary | **UNVERIFIED** — no amount or cap and no redacted booking/ledger-to-activated-wallet correlation are recorded | No recipient is selected and no transfer is initiated. |
| Executing operator | **UNVERIFIED** — no authorized operator is recorded | The payout path remains unavailable for manual or automated execution. |
| Stop, cancellation, return, and escalation boundary | **UNVERIFIED** — no provider-side irreversible-cutoff procedure, authority, or terminal-transfer return/escalation procedure is recorded | A controlled payout cannot start. Stop on the first mismatch remains mandatory for any future authorization. |
| Durable execution and recovery | **UNVERIFIED** — no provider transfer was made or read back into a durable paid or failed ledger state | No payout execution claim; unknown states would remain processing. |
| Alert ownership | **UNVERIFIED** — no monitored recipient, response owner, SLA, or observed failure/stuck-transfer response is recorded | Broad release remains blocked. |

The evidence for `E-25-03-PM-WEBHOOK`, `E-25-03-VERCEL`, and `E-25-03-INNGEST` is preserved exactly as configuration and registration evidence. It does not establish merchant entitlement, a correlated recipient, payout execution, reconciliation outcome, alert delivery, or alert ownership.

### Payout follow-up record

Before any future controlled payout, the accountable product release authority and authorized PayMongo account authority must jointly record: provider-approved marketplace/linked-account and platform-wallet entitlement; one exact amount or cap; a redacted correlated activated-recipient boundary; the executing operator; provider-side cancellation before the irreversible cutoff; the return or escalation procedure and owner after a terminal transfer; and the monitored alert owner, destination, SLA, and recovery evidence. If any field is unavailable, the only permitted disposition is HOLD and the existing held payout row remains unexecuted.

### Final rollback boundary

No rollback was executed because no financial operation occurred. Before any future authorization, the runbook must contain the provider-side method and accountable authority to stop new payment activity, the payout-specific cancellation or return boundary, customer/host communication ownership, and reconciliation follow-up. Repository code, a registered Inngest function, or a private console view does not substitute for that executable provider-side boundary.

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
| E-25-01-W0 | Initial local Docker prerequisite | BLOCKED | Baseline evidence ledger above |
| E-25-01-W0R | Recovered local Docker prerequisite | PASS | Baseline evidence ledger above |
| E-25-01-DB | Isolated DB payment mechanics | PASS | Baseline evidence ledger above |
| E-25-01-LINT | Payment-path static analysis | PASS | Baseline evidence ledger above |
| E-25-01-TSC | Payment-path type analysis | PASS | Baseline evidence ledger above |
| E-25-01-PROBE | Opt-in test-mode provider probe | NOT RUN | Baseline evidence ledger above |
| E-25-02-PM-LIVE | PayMongo live environment presence | PASS | Dated console observations above |
| E-25-02-PM-RAILS | PayMongo rail activation inventory | HOLD | Dated console observations above |
| E-25-02-PM-WEBHOOK | PayMongo webhook inventory | HOLD | Dated console observations above |
| E-25-02-PM-WALLET | PayMongo wallet and linked-account inventory | PARTIAL | Dated console observations above |
| E-25-02-VERCEL | Vercel production and secret-scope inventory | PARTIAL | Dated console observations above |
| E-25-02-INNGEST | Inngest production registration inventory | HOLD | Dated console observations above |
| E-25-02-TSC | Current TypeScript baseline | BLOCKED | Dated console observations above |
| E-25-03-PM-WEBHOOK | Enabled production webhook configuration | PARTIAL | Dated console observations above |
| E-25-03-VERCEL | Production Inngest deployment configuration | PASS | Dated console observations above |
| E-25-03-INNGEST | Production Inngest app and function registration | PASS | Dated console observations above |
| E-25-03-HOLD | Controlled checkout, recovery, and return disposition | HOLD | Plan 25-03 formal HOLD disposition above |
| E-25-04-HOLD | Controlled payout and broad-availability disposition | HOLD | Plan 25-04 final payout and release HOLD disposition above |

No credential, wallet value, customer record, payment identifier, or raw provider payload belongs in this document.
