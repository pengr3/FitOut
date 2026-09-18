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
