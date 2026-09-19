# Phase 25 — PayMongo Production Capability Coverage

**Purpose:** Track every payment capability required for a safe production decision without treating provider entitlement, account state, or a console configuration as established before an authorized human verifies it.

**Evidence rule:** A `VERIFIED` status needs a dated, non-secret provider, Vercel, Inngest, or repository reference recorded in `25-PRODUCTION-RUNBOOK.md`. `UNKNOWN` is not an opt-out. An `OPTED OUT` status is allowed only with a concrete provider limitation or authorized product decision, its customer/host fallback, and its owner recorded in the runbook.

| Capability | Existing FitOut control | Required production evidence | Initial status | Fallback / release effect |
|---|---|---|---|---|
| Card hosted checkout | Server-frozen Checkout Session, checkout lease, retired sessions | Live account approval, rail availability, controlled transaction outcome | UNKNOWN | Do not advertise or enable the rail until approved and observed. |
| GCash hosted checkout | Server-frozen Checkout Session, webhook/probe confirmation | Live rail approval and controlled payment/refund outcome | UNKNOWN | Do not advertise or enable the rail until approved and observed. |
| PayMaya hosted checkout | Server-frozen Checkout Session, webhook/probe confirmation | Live rail approval and controlled payment/refund outcome | UNKNOWN | Do not advertise or enable the rail until approved and observed. |
| QR Ph hosted checkout | Server-frozen Checkout Session, provider-derived confirmation | Live rail approval, controlled payment outcome, and owned manual-return path | UNKNOWN | No API-refund claim; broad availability is blocked until manual-return ownership and SLA are evidenced. |
| Checkout retry and session retirement | Database checkout lease and expire-before-replace behavior | Local DB suite plus test-mode provider probe when safely authorized | UNKNOWN | Preserve the existing controls; no new browser or SDK payment path. |
| Paid checkout webhook | Raw body HMAC, durable event-ID dedupe, one status-scoped confirmation writer | Canonical production destination, signature configuration, observed signed `checkout_session.payment.paid` delivery | UNKNOWN | No confirmation from a browser return URL; provider delivery or server-to-server probe only. |
| Refund webhook handling | Verified refund event handling and durable booking/ledger transition | Observed subscribed refund event behavior for each enabled rail | UNKNOWN | Keep an unresolved state visible to operations until provider evidence arrives. |
| Merchant / linked-account activation | Verified merchant event handling and host payout state | PayMongo entitlement plus observed merchant activation payload for FitOut's account | UNKNOWN | Do not claim linked-account onboarding works or create custom KYC routing. |
| Missed-webhook reconciliation | Registered Inngest payment reconciliation and server-side Checkout Session probe | Live Inngest registration, signed invocation configuration, and observed recovery evidence | UNKNOWN | A browser redirect never substitutes for recovery evidence. |
| API refund rails | Existing rail allowlist for card, GCash, GrabPay, and PayMaya | Controlled refund result for every enabled eligible rail | UNKNOWN | Unverified or unsupported rails remain a human-owned return process. |
| Manual refund / clawback | `needs_attention` audit and alert behavior | Named owner, monitored recipient, response SLA, and reconciliation record | UNKNOWN | Broad launch is blocked while no owned return path exists. |
| Platform wallet and source account | Production wallet configuration guards | Provider confirmation of wallet entitlement and authorized source identity without recording values | UNKNOWN | Never route to an inferred wallet or a default recipient. |
| Host payout transfer | Durable held-to-processing ledger claim and transfer creation | Marketplace entitlement, correlated activated wallet, authorized controlled payout result | UNKNOWN | Do not release broad host payouts; keep the provider/product limitation and owner in the runbook. |
| Payout reconciliation and recovery | Registered Inngest payout reconciliation, terminal-state mapping, alerts | Observed provider status and resulting ledger state or concrete provider limitation | UNKNOWN | Unknown transfer states stay non-terminal and remain owned by operations. |
| Production secret boundary | Server-only production guards; Preview blocks payment requests | Authorized Vercel scope check for required names only, with no values recorded | UNKNOWN | No secret appears in source, planning artifacts, logs, or a Preview deployment. |
| Inngest operations and alerts | Registered jobs and alert digest | Authorized Inngest registration evidence, monitored alert recipient, response owner | UNKNOWN | No launch authorization while money alerts lack an owner. |
| Controlled transaction and rollback | Existing hosted checkout flow; no discovered kill-switch contract | Product/account authority, single-transaction bounds, abort conditions, and provider-side stop method | UNKNOWN | Do not add a feature flag; hold broad release if an executable rollback boundary is not evidenced. |
| Broad availability authorization | Evidence ledger and release decision checkpoint | All applicable rows above resolved as VERIFIED or concrete OPTED OUT with an approved fallback | UNKNOWN | A missing item produces HOLD, not an inferred launch decision. |

## Current console evidence — 2026-09-18

The following read-only observations are detailed in `25-PRODUCTION-RUNBOOK.md` under `E-25-02-*`; no secret value, payment data, wallet identifier, or provider payload was recorded.

| Evidence | Affected capability | Current result | Release effect |
|---|---|---|---|
| E-25-02-PM-LIVE | Live-account state | PASS — live environment visible | This establishes only live-account presence, not rail or webhook readiness. |
| E-25-02-PM-RAILS | Card, GCash, PayMaya, QR Ph | HOLD — QR Ph active; the other required checkout rails inactive/unapproved | Do not advertise or enable broad checkout. QR Ph also still lacks an owned manual-return path. |
| E-25-02-PM-WEBHOOK | Paid/refund/merchant webhook paths | HOLD — no provider webhook endpoints | Payment confirmation and refund/merchant evidence cannot be obtained. |
| E-25-02-PM-WALLET | Platform wallet and host payout | PARTIAL — wallet transfer UI exists, no child accounts | Do not infer marketplace or linked-account entitlement; no host payout. |
| E-25-02-VERCEL | Production secret boundary | PARTIAL — required PayMongo and operations names are Production-only; no PayMongo variables in Preview; Inngest key names absent | Keep the Preview boundary, but resolve the Inngest configuration before declaring operations ready. |
| E-25-02-INNGEST | Reconciliation, schedules, and alerts | HOLD — Production has zero events, runs, and functions | No observed reconciliation or alert delivery; broad release remains held. |

## Current protected-console evidence — 2026-09-19

The following records preserve current configuration facts only. They are not evidence of a payment, provider delivery, reconciliation execution, refund, manual return, payout, alert delivery, or broad-release authorization. No secret, deployment identifier, wallet identifier, customer data, payment identifier, or raw payload is recorded.

| Evidence | Affected capability | Current result | Release effect |
|---|---|---|---|
| E-25-03-PM-WEBHOOK | Paid, refund, and merchant webhook configuration | PARTIAL — canonical endpoint enabled with the available paid, refund, and merchant event subscriptions | Configuration does not prove signed delivery, event-ID dedupe, or a payment confirmation; controlled checkout remains held. |
| E-25-03-VERCEL | Production deployment and Inngest configuration boundary | PASS — protected deployment configuration is current | This does not supply payment, refund, or recovery evidence. |
| E-25-03-INNGEST | Production function registration | PASS — protected production application has its scheduled and event functions registered | No event execution, reconciliation result, or alert delivery was observed. |

## Plan 25-03 formal HOLD disposition — 2026-09-19

**Precondition result:** **NOT MET.** Plan 25-02 records **HOLD**, not `AUTHORIZE CONTROLLED TRANSACTION`, and lacks the named authority, approved rail, amount bound, participant, abort condition, refund/manual-return owner, and provider-side stop method required for a controlled financial operation.

**Return decision:** **HOLD.** The user selected HOLD for all proposed controlled refunds and manual returns. No payment, checkout, refund, manual return, payout, delivery resend, forged webhook, provider probe, or provider-side action was performed for this plan.

| Capability | Plan 25-03 status | Required before status may advance | Current release effect |
|---|---|---|---|
| Paid checkout webhook | HOLD | An authorized controlled transaction plus signed provider delivery or bounded server-side probe, with exactly one durable confirmation | Browser navigation and configured subscriptions do not establish payment. |
| Missed-webhook reconciliation | HOLD / UNKNOWN | Provider-supported recovery evidence and an observed registered-job execution with resulting status and alert behavior | Registration alone is insufficient; broad release is blocked. |
| API refund rails | HOLD | Per-rail authority, amount cap, participant boundary, operator, stop procedure, and controlled provider result | No refund operation occurred. |
| Manual refund / clawback | HOLD | Named owner, monitored destination, response SLA, communication policy, and reconciliation record for each unsupported or unverified rail | No manual return occurred; QR Ph remains unavailable for broad release. |
| Controlled transaction and rollback | HOLD | Plan 25-02 authorization and an executable provider-side stop boundary | No controlled checkout or rollback action occurred. |
| Broad availability authorization | HOLD | All applicable capabilities verified or concretely opted out with owned fallback | Existing configuration evidence does not authorize launch. |

## Plan 25-04 final payout and release HOLD disposition — 2026-09-19

**Controlled payout decision: HOLD.** No controlled host payout is authorized or executed. The required merchant, linked-account, and platform-wallet entitlement evidence is absent; no redacted correlated activated-recipient boundary is recorded; no authorized executing operator is recorded; and no provider-side stop, cancellation, return, or escalation procedure is evidenced. A transfer is one-way external money movement, so the absence of any one of those boundaries keeps the existing payout path uninvoked.

**Payout execution and alert ownership: UNVERIFIED.** Existing payout sweep and reconciliation controls remain documented code and registered-function evidence only. There is no controlled provider transfer result, no provider-derived durable paid or failed ledger outcome, no observed recovery result, and no verified monitored alert recipient or response owner. Unknown payout states must remain non-terminal and under operations ownership once that ownership is formally assigned; this record does not invent an owner.

**Broad availability decision: HOLD.** Payment and payout availability cannot be broadly authorized while payout entitlement, recipient correlation, execution authority, provider-side stop/return handling, payout execution evidence, recovery evidence, and alert ownership remain unresolved. The current `E-25-03-PM-WEBHOOK`, `E-25-03-VERCEL`, and `E-25-03-INNGEST` entries remain configuration evidence only and are not weakened or reclassified as live-money evidence.

| Capability | Final status | Missing evidence / accountable next record | Release effect |
|---|---|---|---|
| Merchant / linked-account activation | **HOLD** | Authorized provider entitlement and a redacted activated-merchant observation | No host onboarding or payout readiness claim. |
| Platform wallet and source account | **HOLD** | Provider-approved source entitlement and authorized source identity, without recording values | Never infer a source wallet or select a default recipient. |
| Host payout transfer | **HOLD** | Authority, amount/cap, redacted correlated activated-recipient boundary, executing operator, provider-side stop/return procedure, and controlled result | No transfer is initiated. |
| Payout reconciliation and recovery | **HOLD / UNVERIFIED** | Provider-derived read-back into a durable paid or failed state, or a concrete provider limitation with an assigned operations owner | Unknown states remain processing; no payout-ready claim. |
| Inngest operations and alerts | **HOLD / UNVERIFIED** | Monitored destination, response owner and SLA, plus observed payout-failure or stuck-transfer handling | Alert ownership remains unverified; broad release is blocked. |
| Broad availability authorization | **HOLD** | Joint accountable authorization after every applicable row is VERIFIED or concretely OPTED OUT with approved fallback | Do not enable or advertise broad payment or payout availability. |

## Open questions that must remain explicit

- **Q1 / A1:** Which checkout rails, limits, marketplace products, wallets, and linked-account functions are actually approved for FitOut?
- **Q2 / A2:** Which canonical production hostname, webhook destination, signing-secret rotation procedure, and event subscriptions are active?
- **Q3 / A3:** Who monitors and resolves money alerts and manual returns, under which SLA?
- **Q4 / A4:** Is a bounded controlled charge and payout permitted before broad availability?
- **Q5:** What provider-side mechanism stops new checkout activity, and who is authorized to use it if a live issue appears?

## Scope fences

- This matrix does not store credentials, wallet identifiers, private account details, customer information, or raw payment payloads.
- Existing security controls remain authoritative: raw-body HMAC precedes JSON parsing, event IDs deduplicate deliveries, provider evidence reaches the single confirmation writer, checkout leases retire superseded sessions, and browser return URLs are presentation only.
- No PayMongo SDK, browser-side confirmation, second confirmation writer, timer/worker, schema migration, custom KYC/payout routing, or unverified feature flag is introduced by this phase.
- Plan 25-03 made no financial or provider action. Its HOLD disposition leaves paid delivery, reconciliation execution, refunds, and manual returns unverified and held.
- Plan 25-04 made no payout, transfer, payment, checkout, refund, manual return, forged webhook, provider probe, or provider-side action. It records the final HOLD caused by unresolved payout and release boundaries.
