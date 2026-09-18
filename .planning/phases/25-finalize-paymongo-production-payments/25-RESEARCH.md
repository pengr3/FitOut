# Phase 25: Finalize PayMongo Production Payments - Research

**Researched:** 2026-09-18
**Domain:** PayMongo live-payment enablement, webhook integrity, asynchronous recovery, and production rollout
**Confidence:** HIGH for repository behavior and validation commands; MEDIUM for current PayMongo dashboard/event capabilities

## User Constraints

No `25-CONTEXT.md` exists. The user explicitly chose to proceed without a discussion artifact, so this research does **not** treat any production-account, commercial, launch, or operational choice as decided. Phase 25 currently has `Goal: [To be planned]`, `Requirements: TBD`, and no mapped requirement IDs. [VERIFIED: .planning/ROADMAP.md:1160-1169]

## Project Constraints (from AGENTS.md)

- Before changing Next.js code, read the applicable bundled guide in `node_modules/next/dist/docs/` and heed deprecation notices. [VERIFIED: AGENTS.md:1-5]
- The installed project version is Next.js `16.2.7`; its bundled Route Handlers guide confirms handlers use Web `Request`/`Response`, POST handlers are not cached by default, and handlers may live beneath `app`. [VERIFIED: node_modules/next/package.json:2-3] [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md]

## Summary

Plan this as a **gated live enablement and evidence phase**. FitOut already contains the application mechanics for hosted checkout, raw-body signed webhook verification, event-id deduplication, a single database confirmation writer, checkout-session retirement, payment reconciliation, payout release/reconciliation, refunds, and alert emission. The existing code must be preserved and verified in a live account rather than replaced with another payment path. [VERIFIED: src/lib/paymongo.ts:1-18] [VERIFIED: src/app/api/paymongo/webhook/route.ts:1-22] [VERIFIED: src/inngest/functions/payment-reconcile.ts:1-47]

Production capability is the material unknown. The roadmap records that real host payouts have never moved money because PayMongo `/v2` money movement is sales-gated; hosted Linked Accounts have likewise never been walked; and GCash/Maya have not been individually hand-paid. [VERIFIED: .planning/ROADMAP.md:1171-1176] The repository cannot establish whether the live PayMongo account is approved for the four configured checkout rails, Platforms/Linked Accounts, wallet transfers, or which exact live webhook destination/event subscriptions are active. Those must be human/provider checkpoints before a deployment that can accept money.

**Primary recommendation:** Plan sequential gates: establish live-account/operational decisions, configure production secrets and provider endpoints, exercise a minimal end-to-end live-money matrix with observed provider evidence, and only then authorize broad availability. Do not add a new SDK, a browser-side confirmation path, a second `confirmed` writer, or a schema migration unless evidence identifies a concrete defect.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Hosted checkout creation and redirect | API / Backend | Browser / Client | `confirmBooking` owner-gates a hold, uses the frozen server amount, claims a lease, and creates the provider checkout; the browser only follows the hosted URL. [VERIFIED: src/app/actions/booking.ts:740-748] |
| Payment confirmation | API / Backend | Database / Storage | A verified PayMongo event or server-to-server probe reaches one status-scoped confirmation writer; the browser return is not payment evidence. [VERIFIED: src/app/api/paymongo/webhook/route.ts:273-297] [VERIFIED: src/lib/payments/confirm-booking-payment.ts:307-347] |
| Webhook authentication and replay handling | API / Backend | CDN / Static — | The Node runtime route reads raw bytes, HMAC-verifies them, and records event IDs before acknowledging. [VERIFIED: src/app/api/paymongo/webhook/route.ts:31-32] [VERIFIED: src/app/api/paymongo/webhook/route.ts:230-323] |
| Payment state and checkout/payout ledger | Database / Storage | API / Backend | Persisted booking payment/session/lease fields and `host_payout_ledger` provide the durable state and at-most-once claims. [VERIFIED: src/lib/db/schema.ts:1124-1199] [VERIFIED: src/lib/db/schema.ts:623-659] |
| Missed-payment and transfer recovery | API / Backend | External service | Inngest invokes registered reconciliation jobs; PayMongo remains the source of payment/transfer status. [VERIFIED: src/app/api/inngest/route.ts:25-27] [VERIFIED: src/inngest/functions/payment-reconcile.ts:325-345] [VERIFIED: src/inngest/functions/payout-reconcile.ts:1-18] |
| Live-account rails, merchant activation, wallets, and webhook subscriptions | External service | Human operations | These values and account permissions live in PayMongo/Vercel/Inngest consoles, not in tracked application code. [ASSUMED] |
| Alert response and manual refunds/clawbacks | Human operations | API / Backend | The code emits `needs_attention` alerts for unresolved money states; a monitored recipient and named response owner are required to make that signal operational. [VERIFIED: src/inngest/functions/ops-alert-digest.ts:31-46] [VERIFIED: src/inngest/functions/ops-alert-digest.ts:99-103] |

## Standard Stack

### Core

| Library / service | Version | Purpose | Why standard here |
|---|---:|---|---|
| Existing thin PayMongo `fetch` client | No package | Server-only PayMongo REST calls | It is the sole HTTP integration point and sends Basic auth plus an `Idempotency-Key` for POSTs. [VERIFIED: src/lib/paymongo.ts:1-7] [VERIFIED: src/lib/paymongo.ts:89-121] |
| Next.js Route Handlers | `16.2.7` | Inbound PayMongo and Inngest endpoints | Existing handlers select the Node runtime where raw-body HMAC verification requires Node crypto. [VERIFIED: src/app/api/paymongo/webhook/route.ts:24-32] [VERIFIED: node_modules/next/package.json:2-3] |
| Drizzle + PostgreSQL | Existing project stack | Durable booking, event, and payout state | Confirmation and payout transitions are SQL/database guarded; do not move money state into client memory. [VERIFIED: src/lib/payments/confirm-booking-payment.ts:322-347] [VERIFIED: src/inngest/functions/payout-sweep.ts:192-361] |
| Inngest | `^4.13.0` | Registered crons/retries for reconciliation | The production route registers `paymentReconcile`, `payoutSweep`, and `payoutReconcile`; an unregistered function silently does not run. [VERIFIED: package.json] [VERIFIED: src/app/api/inngest/route.ts:56-125] |

### Supporting

| Existing component | Purpose | When it is used |
|---|---|---|
| `src/lib/payments/checkout-lease.ts` | Atomic, TTL-backed checkout-attempt lease | Before a PayMongo checkout POST, to prevent concurrent independently payable sessions. [VERIFIED: src/lib/payments/checkout-lease.ts:74-118] |
| `src/lib/payments/checkout-probe.ts` | Bounded server-side Checkout Session read | Reconciliation when a webhook might have been lost; a probe failure means unknown, not unpaid. [VERIFIED: src/lib/payments/checkout-probe.ts:60-118] |
| `src/lib/payments/confirm-booking-payment.ts` | Single `pending|approved → confirmed` transition | Both verified webhook and reconcile paths. [VERIFIED: src/lib/payments/confirm-booking-payment.ts:307-347] |
| `src/lib/payments/refund-rail.ts` | Fail-closed API-refund routing | Cancellation/gone-slot refund decisions. The source quote is `export const REFUNDABLE_RAILS: ReadonlySet<string> = new Set([ "card", "gcash", "grab_pay", "paymaya", ]);`. [VERIFIED: src/lib/payments/refund-rail.ts:42-52] |

### Installation

No external package installation is indicated. The repository already carries its PayMongo client and all required runtime libraries. [VERIFIED: package.json]

## Package Legitimacy Audit

Not applicable: this phase should not install a package. The current integration is a tracked thin wrapper, so no package legitimacy gate is required. [VERIFIED: src/lib/paymongo.ts:1-18]

## Architecture Patterns

### System Architecture Diagram

```text
Booker
  │ owns a pending/approved hold
  ▼
confirmBooking server action ──► checkout lease ──► PayMongo Checkout Session
  │ frozen amount / reference              │                  │
  │                                         │                  ▼
  │                                         └────────── hosted PayMongo page
  ▼                                                              │
booking.checkout_session_id ◄────────────────────────────────────┘
  │                                                   payment succeeds
  │                                                              ▼
  │                                              POST /api/paymongo/webhook
  │                                              raw HMAC → event-id dedupe
  │                                                       │
  │                                                       ▼
  └────── paymentReconcile (Inngest, fallback GET) ─► confirmPaidBooking
                                                            │
                                                            ▼
                                            booking confirmed + notification / ledger eligibility
                                                            │
                                          after delivered session + delay
                                                            ▼
                                      payoutSweep ─► PayMongo transfer ─► payoutReconcile
                                                            │                    │
                                                            └──► ops alert / durable ledger
```

### Pattern 1: Provider evidence, never browser evidence

**Use:** retain `checkout_session.payment.paid` as the fast confirmation transport and a PayMongo GET probe as its recovery transport. The confirmation predicate is exactly `WHERE id = ${bookingId} AND status IN ('pending','approved') RETURNING id`; do not introduce another booking-confirm UPDATE. [VERIFIED: src/lib/payments/confirm-booking-payment.ts:322-340]

**Why:** the hosted-page return is forgeable and may arrive before/after payment state. The current webhook explicitly discards its confirmation outcome but acknowledges a verified event with 200 to avoid retry storms. [VERIFIED: src/app/api/paymongo/webhook/route.ts:287-323]

### Pattern 2: Raw-body HMAC before JSON parsing, then durable event dedupe

**Use:** leave the webhook order intact: `req.text()` → signature parse/HMAC → JSON parse → `paymongo_event` lookup → state transition → insert ID/200 response. [VERIFIED: src/app/api/paymongo/webhook/route.ts:230-323]

**Why:** parsing before HMAC changes the authenticated bytes; redelivery is expected. PayMongo’s official platform-webhook guide says non-2xx responses are retried, so a verified/handled delivery must acknowledge successfully. [CITED: https://developers.paymongo.com/docs/seeds-webhook]

### Pattern 3: Retire and lease checkout sessions; do not trust provider POST idempotency alone

**Use:** keep the pre-create checkout lease and expire the persisted previous session before minting a replacement. The source records that identical checkout-session POST idempotency keys can yield different payable sessions, so the retirement and lease are the actual safety controls. [VERIFIED: src/lib/paymongo.ts:185-202] [VERIFIED: src/app/actions/booking.ts:879-968]

### Pattern 4: Payout is a durable state machine with reconciliation

**Use:** payout sweep claims the ledger before transfer and releases it to processing; the reconcile job polls the transfer and advances only a `processing` row. The active production values are quoted as `if (["succeeded", "completed", "paid"].includes(status)) return "paid";` and `if (["failed", "returned", "cancelled"].includes(status)) return "failed";`; unrecognized status remains processing. [VERIFIED: src/inngest/functions/payout-reconcile.ts:60-70]

### Recommended Project Structure

```text
src/
├── app/api/paymongo/webhook/route.ts    # authenticated provider ingress
├── app/api/inngest/route.ts             # registered recovery/operations ingress
├── app/actions/booking.ts               # owned checkout initiation
├── lib/paymongo.ts                      # only PayMongo HTTP wrapper
├── lib/payments/                        # confirmation, lease, probe, refunds, policy
└── inngest/functions/                   # payment and payout recovery schedules
tests/paymongo/                          # webhook/account/real-test-mode probes
tests/payments/                          # money-path DB integration tests
```

### Anti-Patterns to Avoid

- **Confirming on `?paid=1` or a success URL:** it is presentation only; retain provider-webhook/probe evidence. [VERIFIED: src/app/actions/booking.ts:740-748]
- **A second confirmed-state writer:** it risks duplicate notification/payout work; widen `confirmPaidBooking` only if a new payable state is proven. [VERIFIED: src/app/api/paymongo/webhook/route.ts:13-22]
- **Holding `SELECT ... FOR UPDATE` across PayMongo HTTP:** the checkout lease intentionally uses one autocommit compare-and-swap and no network-spanning row lock. [VERIFIED: src/lib/payments/checkout-lease.ts:14-28]
- **Putting live keys in Preview:** Preview is intentionally credential-free and refuses payment requests before fetch. [VERIFIED: tests/paymongo/preview-environment.test.ts:11-35]
- **Assuming the declared `PAYMONGO_PUBLIC_KEY` is consumed:** its only tracked occurrence is `.env.example`; the hosted-checkout implementation does not read it. Do not plan payment-element work from that unused declaration without a product decision. [VERIFIED: .env.example:120-122] [VERIFIED: `rg` census in this research session]

## Don't Hand-Roll

| Problem | Do not build | Use instead | Why |
|---|---|---|---|
| Card/wallet payment UI and PCI-adjacent collection | Local payment form or client secret flow | Existing hosted Checkout Session | Hosted checkout already supports the configured rail list and keeps the server-frozen amount on the backend. [VERIFIED: src/lib/paymongo.ts:185-243] |
| Webhook signature comparison | Custom string equality | Existing Node HMAC + `timingSafeEqual` length guard | Prevents timing-safe comparison exceptions and forged payload processing. [VERIFIED: src/app/api/paymongo/webhook/route.ts:106-120] |
| Retry/dedup cache | In-memory event set | `paymongo_event` and status-guarded database updates | Survives serverless instances/restarts and makes delivery replay a 200 no-op. [VERIFIED: src/app/api/paymongo/webhook/route.ts:261-323] |
| Cron/retry runner | New timer/worker | Existing registered Inngest functions | Payment recovery is already bounded, singleton, and registered at `/api/inngest`. [VERIFIED: src/inngest/functions/payment-reconcile.ts:325-345] [VERIFIED: src/app/api/inngest/route.ts:56-125] |
| Marketplace KYC/payout wallet | Custom KYC or transfer routing | PayMongo account/wallet capabilities, only if enabled | The roadmap records the capability is provider-gated; the application must not pretend it has access until it is confirmed. [VERIFIED: .planning/ROADMAP.md:1171-1176] |

## Common Pitfalls

### Pitfall 1: A production deployment receives charges but cannot confirm them

**What goes wrong:** the webhook secret/destination is missing, stale, or points to the wrong host. The booker pays; `booking` stays payable/pending until recovery, or forever if Inngest is not actually registered.

**Why:** webhook confirmation is the primary transport. The production module fails closed when `PAYMONGO_WEBHOOK_SECRET` is absent, but a correctly booting app cannot prove the PayMongo dashboard points to it. [VERIFIED: src/app/api/paymongo/webhook/route.ts:34-47] [ASSUMED]

**Avoidance:** make live signed-delivery receipt a release gate, prove it creates one `paymongo_event` row and one confirmation, then prove a deliberately absent/late webhook is recovered by the registered reconciliation job without using a browser return. Do not send forged production payloads; use PayMongo’s delivery/test tooling or a controlled real test transaction. [ASSUMED]

### Pitfall 2: A checkout retry produces two payable sessions

**What goes wrong:** a planner treats `Idempotency-Key` as checkout-session de-duplication, removes lease/retirement logic, or tests only a mocked provider.

**Why:** the repository’s opt-in real test exists precisely because the provider behavior contradicted the assumption. It creates sessions only when `RUN_LIVE_PAYMONGO_PROBE === "1"` and the key begins `sk_test_`, then expires every created session. [VERIFIED: tests/paymongo/checkout-idempotency-real.test.ts:1-44]

**Avoidance:** retain the live test-mode probe and re-run it before code changes to checkout expiration/idempotency behavior. [VERIFIED: tests/paymongo/checkout-idempotency-real.test.ts:45-169]

### Pitfall 3: Treating every checkout rail as API refundable

**What goes wrong:** QRPh (or an unknown rail) gets sent to the generic refund API and the booker’s refund is left unresolved.

**Why:** the fail-closed rail set excludes QRPh. The roadmap also records a permanent PayMongo-rail limitation and the source’s observed test-mode result describes a QRPh refund rejection. [VERIFIED: src/lib/payments/refund-rail.ts:1-52]

**Avoidance:** exercise each enabled live rail’s cancellation/refund behavior; document manual return ownership and SLA for any rail outside the verified API-refund set. The actual policy and owner are not decided in Phase 25 context. [ASSUMED]

### Pitfall 4: Payout account access is assumed from code presence

**What goes wrong:** a transfer is attempted without a production-enabled marketplace account, an activated correlated wallet, or correct platform-wallet identifiers.

**Why:** the code blocks an outbound transfer if the platform wallet values are absent in production, but it cannot establish live provider entitlement. [VERIFIED: src/lib/paymongo.ts:38-60] The roadmap explicitly says money movement has not moved real money due to sales gating. [VERIFIED: .planning/ROADMAP.md:1171-1174]

**Avoidance:** require a provider-account readiness checkpoint and a controlled live payout proof before enabling broad host payout flow. PayMongo’s current Seeds webhook documentation shows `merchant.activated` can contain an activated wallet, but it does not prove FitOut’s account has that capability. [CITED: https://developers.paymongo.com/docs/seeds-webhook]

### Pitfall 5: Recovery jobs exist in source but never run in production

**What goes wrong:** Inngest has not synced `/api/inngest`, its production signing key is missing/incorrect, or alert delivery is unowned. Captured money can remain in a recoverable-but-unrecovered state.

**Why:** `paymentReconcile` is registered in source and scheduled every five minutes, but registration and delivery are operational state. `OPS_ALERT_EMAIL` is deliberately non-fatal and therefore can log/no-op if unset. [VERIFIED: src/app/api/inngest/route.ts:43-125] [VERIFIED: src/inngest/functions/payment-reconcile.ts:82-160] [VERIFIED: src/inngest/functions/ops-alert-digest.ts:99-103]

**Avoidance:** verify all registered functions appear in the live Inngest app, observe one execution of each payment/payout recovery path where feasible, and name an alert recipient plus response owner. [ASSUMED]

## Code Examples

The phase should call existing code paths rather than introduce skeleton code. The most relevant executable repository commands are:

```powershell
# Static payment-path baseline (passed in this research session)
node node_modules/eslint/bin/eslint.js src/lib/paymongo.ts src/app/api/paymongo/webhook/route.ts src/lib/payments/confirm-booking-payment.ts src/app/actions/booking.ts src/lib/payments/checkout-probe.ts src/lib/payments/checkout-lease.ts src/lib/payments/retire-checkout.ts src/lib/payments/refund-rail.ts src/lib/payments/cancellation.ts src/inngest/functions/payment-reconcile.ts src/inngest/functions/payout-reconcile.ts src/inngest/functions/payout-sweep.ts src/app/api/inngest/route.ts src/lib/payments/config.ts
npx tsc --noEmit

# Database-backed payment suite (currently blocked locally: Docker daemon/test DB unavailable)
npm test -- tests/paymongo/webhook-signature.test.ts tests/paymongo/webhook-payment-paid.test.ts tests/paymongo/webhook-refund.test.ts tests/paymongo/webhook-merchant-activated.test.ts tests/paymongo/checkout-idempotency-real.test.ts tests/payments/checkout-create.test.ts tests/payments/confirm-idempotency.test.ts tests/payments/payment-reconcile.test.ts tests/payments/payment-reconcile-cadence.test.ts tests/payments/payout-sweep.test.ts tests/payments/payout-reconcile.test.ts

# Opt-in test-mode provider probe only; it creates and then expires test checkout sessions.
$env:RUN_LIVE_PAYMONGO_PROBE = "1"
npx vitest run tests/paymongo/checkout-idempotency-real.test.ts
```

The static commands passed. The focused Vitest command did not run tests because `tests/global-setup.ts` could not reach `postgresql://fitout:fitout@localhost:5432/fitout_test`; `docker info` also reported the Docker daemon unavailable. The repository’s documented recovery is `npm run db:up` then `npm run db:test:setup`, but starting services was not part of this research. [VERIFIED: vitest.config.ts] [VERIFIED: tests/global-setup.ts:60-75] [VERIFIED: test command output, 2026-09-18]

## State of the Art

| Older/unsafe approach | Existing FitOut approach | Impact |
|---|---|---|
| Browser success redirect confirms payment | Signed webhook or provider GET confirms payment | A spoofed `?paid=1` cannot create a booking. [VERIFIED: src/app/actions/booking.ts:740-748] |
| One provider delivery is enough | Webhook fast path plus five-minute bounded reconciliation | A lost delivery is observable/recoverable if Inngest runs. [VERIFIED: src/inngest/functions/payment-reconcile.ts:1-160] |
| Checkout POST idempotency key prevents duplicate sessions | Lease plus expire-before-create | Handles provider behavior that can mint two sessions for identical checkout POSTs. [VERIFIED: src/lib/paymongo.ts:194-202] |
| Transfer result assumed after request | Durable `held → processing → paid|failed` ledger plus poll | Host money is not labeled paid until a provider status maps to a terminal success. [VERIFIED: src/inngest/functions/payout-reconcile.ts:1-18] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | The live PayMongo account can be activated for all configured checkout rails and the marketplace/wallet capabilities FitOut requires. | Summary / Open Questions | A release could accept some payments but fail payout/onboarding paths. |
| A2 | The PayMongo console can register the current public endpoint and the needed event set for this account. | Pitfall 1 / Open Questions | Signed events may not reach production even though code is correct. |
| A3 | A named operator will monitor and act on `needs_attention` money alerts and manual-return cases. | Pitfall 3 / 5 | Stranded funds may be detected but not resolved. |
| A4 | Production rollout can safely include a controlled live money/payout proof before broad enablement. | Primary recommendation | Financial/reputational exposure if the required proof cannot be staged. |

## Open Questions

1. **Which live PayMongo products and rails are approved for FitOut?**
   - What we know: checkout sends `payment_method_types: ["card", "gcash", "paymaya", "qrph"]`. [VERIFIED: src/lib/paymongo.ts:221-239]
   - What is unclear: actual live enablement, limits, account approval, and whether all rails should launch together.
   - Recommendation: make this a `checkpoint:human-verify` with PayMongo/account-owner evidence; do not infer it from test-mode behavior.

2. **Is marketplace money movement enabled and which exact production wallet is the source?**
   - What we know: outbound payout/refund transfer calls require `PLATFORM_WALLET_NUMBER` and `PLATFORM_WALLET_NAME` in production. [VERIFIED: src/lib/paymongo.ts:46-60]
   - What is unclear: provider entitlement, real source wallet identity, linked-account/wallet availability, and the allowed controlled payout amount.
   - Recommendation: checkpoint before enabling host payouts; store the values only as protected production environment variables and record no secrets in plans/summaries.

3. **Which canonical production hostname and PayMongo webhook configuration are authoritative?**
   - What we know: the code endpoint is `POST /api/paymongo/webhook` and accepts verified `checkout_session.payment.paid`, refund events, and merchant state events. [VERIFIED: src/app/api/paymongo/webhook/route.ts:230-323]
   - What is unclear: Vercel production hostname, active PayMongo destination, signing-secret rotation procedure, and subscribed event list.
   - Recommendation: a pre-launch human checkpoint must compare console configuration against deployed endpoint and prove a live signed delivery.

4. **Who owns live exception handling and what is the customer/host policy?**
   - What we know: API refunds fail closed outside the quoted rails; post-payout refunds create `refund_after_payout` needs-attention alerts. [VERIFIED: src/lib/payments/refund-rail.ts:42-52] [VERIFIED: src/app/api/paymongo/webhook/route.ts:198-228]
   - What is unclear: owner/on-call coverage, manual refund process, clawback policy, SLA, and whether `OPS_ALERT_EMAIL` is a monitored production mailbox.
   - Recommendation: require a written runbook and named owner as a release blocker, not as a code assumption.

5. **What exact rollout and rollback boundary is acceptable once a live charge exists?**
   - What we know: preview deliberately blocks payment calls before fetch, while production fails closed for missing secrets. [VERIFIED: tests/paymongo/preview-environment.test.ts:11-63]
   - What is unclear: traffic enablement mechanism, initial booking/host cohort, success metrics, and whether a rollback pauses checkout, payouts, or both.
   - Recommendation: decide explicitly before planning implementation; no feature flag or kill-switch contract was found in this research. [ASSUMED]

## Environment Availability

| Dependency | Required by | Available | Version / state | Fallback |
|---|---|---:|---|---|
| Node.js | Next.js build, scripts, tests | ✓ | `v24.13.0` | — |
| npm | repository scripts | ✓ | `11.8.0` | — |
| Vercel CLI | deployment inspection if authorized | ✓ | `59.10.0` | Vercel dashboard/manual owner verification |
| Docker daemon + local Postgres test DB | payment integration tests | ✗ | Docker CLI `29.6.1`; daemon unavailable | Restore daemon, then `npm run db:up` and `npm run db:test:setup` |
| Live PayMongo account/credentials | actual checkout/webhook/payout UAT | Unknown | not inspected; secrets deliberately not read | human/provider checkpoint |
| Live Inngest app/signing keys | reconciliation execution | Unknown | not inspected; secrets deliberately not read | human/dashboard checkpoint |

**Missing dependencies with no fallback:** a reachable test Postgres instance is needed before the DB-backed payment suite can be considered green; live PayMongo/Inngest confirmation is needed before production launch can be considered proven.

**Missing dependencies with fallback:** Vercel dashboard can be used by an authorized owner if CLI deployment inspection is not available.

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | Vitest `4.1.8` with PostgreSQL isolated schemas; Playwright `1.60.0` for browser checks. [VERIFIED: package.json] |
| Config file | `vitest.config.ts` |
| Quick static command | Scoped ESLint command in Code Examples |
| Focused integration command | Focused `npm test -- tests/paymongo/... tests/payments/...` command in Code Examples |
| Live provider probe | `RUN_LIVE_PAYMONGO_PROBE=1` plus `tests/paymongo/checkout-idempotency-real.test.ts` |

### Phase Behaviors → Test Map

| Behavior | Test type | Existing evidence | Planning action |
|---|---|---|---|
| Invalid/tampered webhook is rejected; valid duplicate event is idempotent | DB integration | `tests/paymongo/webhook-signature.test.ts` | Run after test DB recovery; add only if live payload shape differs. |
| Paid checkout confirms exactly once and persists rail/payment data | DB integration | `tests/paymongo/webhook-payment-paid.test.ts`, `tests/payments/confirm-idempotency.test.ts` | Run; prove a controlled live event/transaction separately. |
| Refund event updates only a successful refund state | DB integration | `tests/paymongo/webhook-refund.test.ts` | Run; test each enabled live rail’s real refund path under approved limits. |
| Previous session is retired and duplicate checkout POST behavior is known | Opt-in live test mode | `tests/paymongo/checkout-idempotency-real.test.ts` | Re-run before touching checkout idempotency/expiry behavior. |
| Missed event is recovered from provider record | DB integration | `tests/payments/payment-reconcile.test.ts`, `tests/payments/payment-reconcile-cadence.test.ts` | Run; verify live Inngest registration/cron execution. |
| Payout transfer is at-most-once and ends in a durable state | DB integration + live operational proof | `tests/payments/payout-sweep.test.ts`, `tests/payments/payout-reconcile.test.ts` | Run; gate actual payout on enabled account/wallet and controlled recipient. |

### Sampling Rate

- **Per code task:** scoped ESLint plus the exact changed payment tests.
- **Per implementation wave:** full relevant Vitest payment subset with an isolated test DB.
- **Production gate:** build with production environment configuration, controlled provider transaction, observed signed webhook, observed reconcile registration, and an operator-runbook walkthrough.

### Wave 0 Gaps

- [ ] Restore Docker/Postgres and provision `fitout_test` before claiming focused payment tests pass.
- [ ] Add no new framework. Existing tests already cover the repository mechanics.
- [ ] Capture provider-approved live evidence for rails, merchant/wallet capability, endpoint subscriptions, and operational response; this cannot be replaced by unit tests.

## Security Domain

Security enforcement is enabled in `.planning/config.json`; this phase is money-moving and must retain all applicable controls. [VERIFIED: .planning/config.json]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard control |
|---|---:|---|
| V2 Authentication | Yes | Hosted checkout removes local credential/card capture; provider authentication uses the server secret only. [VERIFIED: src/lib/paymongo.ts:62-70] |
| V3 Session Management | Yes | Server action derives the booker from the authenticated session and owner-gates the hold. [VERIFIED: src/app/actions/booking.ts:750-783] |
| V4 Access Control | Yes | Only the booking owner can initiate checkout; host bookability/payout state is webhook-derived. [VERIFIED: src/app/actions/booking.ts:756-783] [VERIFIED: src/app/api/paymongo/webhook/route.ts:3-7] |
| V5 Input Validation | Yes | Server-frozen amount; verified event shape; no client amount/payment evidence controls a state transition. [VERIFIED: src/app/actions/booking.ts:858-877] [VERIFIED: src/app/api/paymongo/webhook/route.ts:248-297] |
| V6 Cryptography | Yes | HMAC-SHA256 over raw body and `timingSafeEqual`, with secrets held in non-`NEXT_PUBLIC_` environment variables. [VERIFIED: src/app/api/paymongo/webhook/route.ts:106-120] [VERIFIED: node_modules/next/dist/docs/01-app/02-guides/environment-variables.md] |

### Known Threat Patterns

| Pattern | STRIDE | Standard mitigation |
|---|---|---|
| Forged or body-mutated webhook | Tampering | Raw-body HMAC verification before JSON parse; clean 400 on every verification failure. [VERIFIED: src/app/api/paymongo/webhook/route.ts:230-246] |
| Webhook redelivery | Repudiation / Tampering | Durable `paymongo_event` ID check and 200 acknowledgement after handling. [VERIFIED: src/app/api/paymongo/webhook/route.ts:261-323] |
| Browser-forged success URL | Spoofing | Never confirm from browser navigation; webhook/probe only. [VERIFIED: src/app/actions/booking.ts:740-748] |
| Concurrent double checkout | Tampering / Financial loss | Database compare-and-swap checkout lease, previous-session retirement, TTL recovery. [VERIFIED: src/lib/payments/checkout-lease.ts:74-142] |
| Missing live key/secrets | Denial of service / Tampering | Production module-load guards; verify actual secret scope in Vercel without printing values. [VERIFIED: src/lib/paymongo.ts:28-35] [VERIFIED: src/app/api/paymongo/webhook/route.ts:34-47] |
| Money alert silently unowned | Repudiation / Financial loss | Confirm registered Inngest functions plus real, monitored `OPS_ALERT_EMAIL`; the repository cannot enforce human response. [VERIFIED: src/app/api/inngest/route.ts:56-125] [ASSUMED] |

## Sources

### Primary (HIGH confidence)

- Repository source opened in this session: `src/lib/paymongo.ts`, `src/app/api/paymongo/webhook/route.ts`, `src/app/actions/booking.ts`, `src/lib/payments/confirm-booking-payment.ts`, `src/lib/payments/checkout-{lease,probe}.ts`, `src/lib/payments/{refund-rail,config}.ts`, `src/inngest/functions/{payment-reconcile,payout-sweep,payout-reconcile}.ts`, `src/app/api/inngest/route.ts`, `src/lib/db/schema.ts`.
- Repository test/config files opened in this session: `tests/paymongo/*`, `tests/payments/*`, `vitest.config.ts`, `tests/setup.ts`, `tests/global-setup.ts`, `.env.example`, `package.json`, `vercel.json`, `.planning/{STATE,ROADMAP,REQUIREMENTS,config}.json`.
- Bundled Next.js `16.2.7` documentation: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, `17-deploying.md`, and `02-guides/environment-variables.md`.

### Secondary (MEDIUM confidence)

- [PayMongo Seeds Webhook](https://developers.paymongo.com/docs/seeds-webhook) — current platform merchant event examples and 2xx retry expectation.
- [PayMongo refunding transactions](https://developers.paymongo.com/v1/docs/refunding-transactions) — current dashboard/API refund context; FitOut’s rail-specific behavior remains governed by its observed-and-tested local policy.

### Tertiary (LOW confidence)

- None used as an implementation authority. All unverified live-console and operations facts are logged as assumptions/open questions.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — installed manifests and existing source were opened.
- Architecture: HIGH — payment, webhook, database, and job boundaries were opened directly.
- Production provider readiness: LOW — it resides in provider/hosting/operations consoles and was intentionally not inferred.
- Pitfalls: HIGH for existing code paths; MEDIUM for current PayMongo dashboard event behavior from official documentation.

**Research date:** 2026-09-18
**Valid until:** Re-verify console/account facts immediately before any live-money action; repository contracts are valid until their cited files change.
