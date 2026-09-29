# Phase 26 — Account capability and controlled-proof gate

**Packet status: HOLD.** Prepared 2026-09-29 UTC for Plan 26-09 Task 1. This packet is a review template, not an account observation, provider instruction, migration approval, transfer authorization, or broad-release decision. No account authority, deployment operator, product approver, or money-operations owner has supplied the evidence below. Do not invoke a provider, scheduler, migration, checkout, transfer, refund, or alert merely to fill a blank. The user deferred terms publication for later; it is outside this account-proof gate.

## Evidence and decision rules

Each future entry needs an accountable **named person and role**, observation timestamp in UTC, environment and provider mode, opaque redacted evidence reference, and status: **observed**, **inaccessible**, **contradicted**, or **unverified**. A missing, stale, disputed, or redaction-invalid entry is HOLD. Source code, tests, provider documentation defaults, sandbox fixtures, configured secrets, and a created transfer response establish none of the live-account facts. The separate terms work does not determine this account review or a separately authorized one-operation proof.

The evidence store may hold only opaque references and generic observations. Do not paste credentials, full account numbers, raw provider payloads, unmasked payment/payout/transfer IDs, recipient details, email addresses, or protected URLs here. The account authority and deployment operator retain sensitive originals in their authorized systems. Record only the redacted reference and timestamp in this packet; a failed redaction check returns the field to HOLD. The Plan 25.1 reference-only redaction rules and scanner apply before accepting an entry.

## Account authority and environment

| Required authority or boundary | Current status and evidence slot | Resolver |
| --- | --- | --- |
| Named PayMongo account authority, entitlement to inspect merchant payout and Wallet/transfer records, approval scope | **Unverified — HOLD**; person/role: missing; UTC observation: missing; opaque reference: missing | Product release authority appoints; PayMongo account authority confirms |
| Merchant account and environment/mode for every observation, including live versus sandbox and the actual configured payout arrangement | **Unverified — HOLD**; category/mode, UTC, reference: missing; no account identifier in this packet | PayMongo account authority |
| Marketplace, linked-account, platform Wallet, transfer-create and transfer-read entitlement for the intended single host path | **Unverified — HOLD**; category, UTC, reference: missing | PayMongo account authority |
| Account-specific provider event subscription, if payout or transfer events are used, plus signed-event entitlement and polling/read-back fallback | **Unverified — HOLD**; event categories, UTC, reference: missing; no event is an authority by itself | PayMongo account authority and deployment operator |

## Account capability matrix — all values unresolved

| Required observed fact | Status and redacted evidence slot | Owner and HOLD consequence |
| --- | --- | --- |
| Actual merchant settlement **weekday**, arrival window, payout cadence, clearing delay, holiday/weekend behavior, and forwarding into the intended Wallet | **Unverified — HOLD**; observed weekday and holiday rule: unknown; UTC/reference: missing | PayMongo account authority. If this account cannot fund an eligible Friday, return the PM timing conflict to product; do not advance from unrelated receipts or silently change the host promise. The public Wednesday default is not account proof. |
| Approved FitOut **Wallet** destination and source boundary for the deposited payout, including verified ownership and mode match | **Unverified — HOLD**; destination category, UTC/reference: missing | PayMongo account authority. A configured or first-listed Wallet is insufficient. |
| Exact payout-transaction **payment ID** field mapping (`payment` versus `split_payment` or another account-observed shape), transaction type, matching captured booking payment, and duplicate/ambiguous-ID treatment | **Unverified — HOLD**; mapping category, UTC/reference: missing | PayMongo account authority. A fixture mapping cannot establish this account's field. |
| Complete **pagination** of payout transactions: page/cursor traversal through terminal page, count/continuation consistency, and no omitted matching payment | **Unverified — HOLD**; traversal result, UTC/reference: missing | PayMongo account authority. An initial page or empty partial page is not a negative proof. |
| Provider payout status, deposited instant, Wallet destination, returned/reversed status, and provider reference read-back for the same booking payment | **Unverified — HOLD**; generic state and UTC/reference: missing | PayMongo account authority. Pending/in-transit or later returned money cannot fund release. |
| **Available balance** read permission, authoritative available rather than pending amount, freshness at dispatch, and mode/source match | **Unverified — HOLD**; permission/result category, UTC/reference: missing | PayMongo account authority and money-operations owner. Denied access or unknown available funds blocks transfer. |
| Applicable transfer **fee** schedule, currency, free-transfer allowance if any, and amount calculation for the bounded operation | **Unverified — HOLD**; fee-rule category, UTC/reference: missing | PayMongo account authority and money-operations owner. Available Wallet must cover the host net amount **plus fee** immediately before dispatch. |
| Transfer lookup by provider ID and by stable **reference** after uncertain create, including outcome beyond idempotency-key expiry | **Unverified — HOLD**; lookup capability, UTC/reference: missing | PayMongo account authority. Unknown create outcome stays processing/HOLD; never issue a second create to learn the first result. |

Account verdict: **HOLD**. The product rule is Friday 12:00 Asia/Manila admission, hourly retry through 23:00 that Friday, and next-Friday consideration after a missed cutoff. This rule does not prove this merchant receives funds before any Friday. The 24-hour post-session interval is a minimum review hold, not a payment deadline or dispute-finality claim. A contradicted funding schedule is a named PM decision, not permission to use another booking's cash.

## Deployment and operations read-back

Source inspection alone is recorded only as a local prerequisite. A named deployment operator must identify the authorized target and compare the deployed state after authorized deployment. No production migration or scheduler action is requested by this packet.

| Gate | Current state and evidence slot | Owner / required read-back |
| --- | --- | --- |
| Reviewed migration `drizzle/0033_booking_settlement_observation.sql`, target branch/environment, change approval and operator | **Unverified — HOLD**; named operator, authorization, target category, UTC/reference: missing | Deployment operator. Use the source-controlled Drizzle `db:migrate` workflow with `DIRECT_DATABASE_URL` for the direct Neon endpoint only after target authorization; never `push`. `scripts/db-test-setup.ts` isolates a `_test` database and cannot evidence live schema. |
| Live Drizzle migration journal and exact 0033 application state | **Unverified — HOLD**; journal read-back UTC/reference: missing | Deployment operator reads the authorized target's Drizzle journal; a local migration file or test replay is insufficient. |
| Live `booking_settlement_observation` and `booking_settlement_current` tables, constraints, append-only trigger, and `booking_settlement_observation_current_idx` / `_payout_idx` indexes | **Unverified — HOLD**; catalog read-back UTC/reference: missing | Deployment operator checks table, constraint, trigger, and index state against reviewed 0033; a partially applied schema blocks proof. |
| Deployed Inngest registration of Friday-only `payout-sweep` at 12:00–23:00 Asia/Manila, registered settlement and payout reconciliation, correct environment/mode | **Unverified — HOLD**; registration UTC/reference: missing | Deployment operator reads the live registered functions and triggers. Source cron text is not deployed evidence. |
| Absence of old hourly payout dispatch, duplicate OS-run job, alternate scheduler, and concurrent deployment with transfer permission | **Unverified — HOLD**; runner inventory UTC/reference: missing | Deployment operator proves one dispatch path. Duplicate or conflicting registration retains HOLD. |
| Monitored `OPS_ALERT_EMAIL` recipient, named acknowledgement owner, delivery observation, acknowledgement deadline/SLA, escalation route, and after-hours coverage | **Unverified — HOLD**; destination category, owner, UTC/reference: missing | Product authority designates the money-operations owner; that owner confirms monitoring, receipt and acknowledgement. Configured address or digest send attempt alone is insufficient. |
| Durable exception queue and `scripts/ops-alerts.ts` resolver provenance; payout-specific lookup, reconciliation and acknowledged closure | **Unverified — HOLD**; procedure and controlled observation UTC/reference: missing | Money-operations owner. The resolver name is asserted provenance in source, not proof that a human acknowledged an alert. |

## Phase 25.1 release matrix and deferred terms

Freshness must be reread at the later decision. The actual [`25.1-RELEASE-DECISION.md`](../25.1-paymongo-production-release-readiness-controlled-proofs/25.1-RELEASE-DECISION.md) says broad availability is HOLD. Its bounded 2026-09-27 QR Ph checkout observation is checkout-track evidence only and did not resolve payout, recovery, returns, alerts, or release authority.

| Independent gate | Current determination | Required owner / effect |
| --- | --- | --- |
| Phase 25.1 checkout: rail entitlement, controlled checkout, signed delivery, exactly-one durable confirmation, missed-webhook recovery and provider-side stop | **HOLD**; a historical checkout observation does not clear the matrix | Product, PayMongo account, engineering and money-operations authorities; no new checkout authority inferred |
| Phase 25.1 returns: card, GCash, PayMaya, QR Ph, GrabPay API/manual route or approved opt-out, each with reconciliation | **HOLD** | PayMongo account authority and return owner; no substitute rail inferred |
| Phase 25.1 payout: source/recipient entitlement, one-operation authority, terminal provider read-back, durable reconciliation, cancellation/return escalation | **HOLD** | Product, PayMongo account and money-operations authorities; no transfer authority inferred |
| Phase 25.1 alerts, customer/host communications, stop/return, final joint broad-release decision | **HOLD** | Named product and money-operations owners still missing; broad availability stays HOLD |
| Terms publication, deferred outside Phase 26 execution | **DEFERRED** by user on 2026-09-29. The agreement is not prepared; `26-08-DEFERRED.md` preserves the publication work. The actual `/terms` route remains a nonbinding placeholder. | Product and legal owners resolve later before public terms are published. This row is not a prerequisite for this account review or a separately authorized one-operation proof. |
| Phase 26 host-facing Friday copy and account-specific funding feasibility | **HOLD** pending account evidence and product review of host copy | Product release authority and PayMongo account authority; no host Friday guarantee inferred from code |

## One bounded controlled-proof record — inactive template

**Decision: HOLD. No one-operation decision ID exists; no participant, booking, amount, recipient, operator or expiry is selected.** A future authorization must create one immutable opaque decision ID and bind that same ID to one exact amount or maximum cap, one redacted participant/booking, one verified host destination, one named operator, one UTC expiry, and the three named joint authorities. Re-review of this packet or replay of a checkpoint must never create or authorize a second transaction. Conflicting or simultaneous operators, inconsistent IDs, stale approvals, or a later HOLD decision resolve to HOLD until the same joint authority issues a new explicit decision. The current Phase 25.1 decision and any later stricter decision govern.

| Authorization field | Current record | Required authority |
| --- | --- | --- |
| Immutable one-operation decision ID, issue time, expiry, mode and environment | **Absent — HOLD** | Product release, PayMongo account and money-operations authorities jointly |
| Exact amount/cap and fee-inclusive Wallet funding check | **Absent — HOLD** | Product and money-operations authorities, account authority verifies fee/balance |
| One redacted participant, booking/payment and activated merchant-to-host-to-recipient correlation | **Absent — HOLD** | Product and PayMongo account authorities |
| Named executing operator, independent witness and single-operation lock/claim | **Absent — HOLD** | Money-operations owner; no second operator may independently clear HOLD |
| Expected provider-side checkout stop, transfer cancellation before irreversible cutoff, post-terminal return/escalation, authorized invoker and communications path | **Absent — HOLD** | PayMongo account, product and money-operations authorities; if a method is unavailable, record the limitation and retain HOLD |
| Product review of host-facing Friday copy for the bounded proof | **Unverified — HOLD** | Product release authority; terms publication is tracked separately for later public release |

The authorized operator, if one is ever appointed under a fresh joint decision, records each step below with an opaque redacted reference, UTC timestamp, expected generic state, observed generic state, and mismatch disposition. Every row is **not observed — HOLD** now.

| Ordered proof observation | Current result and required stop rule |
| --- | --- |
| 1. Captured booking payment is found in all pages of the matching provider payout transactions, with verified payment ID mapping and no ambiguous match | **Not observed — HOLD**; mismatch or incomplete pagination stops proof |
| 2. Same payout is provider-confirmed deposited into the verified FitOut Wallet, remains unreturned, and its deposited instant passes the post-session hold and Friday cohort checks | **Not observed — HOLD**; no unrelated cash substitution or off-cycle release |
| 3. Fresh available Wallet balance covers one frozen net host amount plus applicable fee; destination and entitlement match the bounded decision | **Not observed — HOLD**; denied or insufficient funding stops transfer |
| 4. Exactly one ledger claim, one host transfer-create outcome and stable provider reference are correlated to the immutable decision ID | **Not observed — HOLD**; uncertain create triggers lookup/reconciliation, never a duplicate create |
| 5. Provider transfer terminal read-back agrees with durable payout-ledger reconciliation, or unknown/in-flight stays processing | **Not observed — HOLD**; disagreement, failure or missing read-back stops further scope and invokes the owned boundary |
| 6. Relevant alert is delivered, acknowledged by the named monitored owner within SLA, resolved with provenance, and host/customer communication is recorded if needed | **Not observed — HOLD**; send attempt without acknowledgement cannot clear proof |
| 7. Stop/return or escalation path is executable at the observed provider cutoff; mismatch response and terminal disposition are recorded | **Not observed — HOLD**; stop additional scope first, preserve actual ledger state, escalate and retain HOLD |

Completion of a single proof would close only that one decision ID. It would not approve another transfer, other participants, another rail, or broad availability. Broad availability requires a separate, fresh Phase 25.1 all-gates joint release decision.

## Local validation — mechanical prerequisite only

| Check | Local result | External conclusion |
| --- | --- | --- |
| Focused settlement, sweep and reconciliation Vitest suites | **PASS**, rerun 2026-09-29; 3 files, 78 tests, exit 0; isolated `fitout_test` reported no escaped writes | No account capability or real money result inferred |
| `tsc --noEmit` | **PASS**, 2026-09-29; exit 0, no diagnostics | No deployment or provider fact inferred |
| Focused ESLint on the six planned money modules | **PASS**, 2026-09-29; exit 0, no diagnostics | No deployment or provider fact inferred |
| Full relevant payments, PayMongo, host, and ops suite | **PASS**, 2026-09-29; 63 files/758 tests passed, 2 files/5 tests skipped; isolated test database reported no escaped writes | No account capability or real money result inferred |
| Host timing source guard and earnings freeze | **PASS**, 2026-09-29; 2 design files/38 tests passed; a fixture with the old guaranteed 24-hour payday is rejected | The actual `/terms` route remains nonbinding and no publication was inferred |
| Failed-transfer resend | **HOLD**, 2026-09-29; failed claims excluded from automatic dispatch; design and prerequisite migration in `26-RETRY-ATTEMPT-GAP.md` | A terminal failed transfer remains an owned exception; no second provider POST is authorized |

## Current disposition and next checkpoint

**HOLD for account and money-proof gaps.** Account authority, live schema, deployed schedule, alert ownership, one-operation scope, stop/return readiness and joint authority are absent or unverified. Every missing field above has a responsible role and remains HOLD; no account proof or live transfer has occurred. The next review is when the named PayMongo account authority and deployment operator can supply current redacted observations. Product receives any Friday timing conflict. A future one-way proof decision requires separately recorded capped joint authorization. Terms publication is deferred and is not the cause of this packet's HOLD.
