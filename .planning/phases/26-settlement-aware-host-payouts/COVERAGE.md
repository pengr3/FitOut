# API Coverage — PayMongo money movement

> The phase extends an existing PayMongo integration. `INTEGRATE` means implement a fail-closed server adapter and fixture coverage; it does not authorize a live account call or transfer. Phase 25.1 HOLD remains in force.

| capability | decision | reason |
|---|---|---|
| GET merchant payout list/detail | INTEGRATE | Establish provider status, Wallet destination, and deposited instant for a booking-linked proof. |
| GET paginated payout transactions | INTEGRATE | Match the captured booking payment on every page; field mapping requires account-specific evidence. |
| GET platform Wallet available balance | INTEGRATE | Gate each transfer on available centavos plus the applicable fee. |
| GET transfer by ID/reference | INTEGRATE | Recover uncertain creates and reconcile terminal status beyond idempotency-key expiry. |
| POST external host batch transfer | INTEGRATE | Existing path remains the only host-money dispatch path, subject to settlement, funding, Friday, and HOLD gates. |
| Payout/transfer webhooks | OPT-OUT | Signed events may trigger a re-read only after this account's entitlement is verified; polling plus read-back is required and covers missed events. |
| Checkout and payment-create API | OPT-OUT | Existing Phase 25 checkout integration is retained; this phase reads its captured payment ID rather than changing checkout. |
| Refund API | OPT-OUT | Existing refund rail remains in place and is regression-tested against new payout eligibility. |
| Linked-account onboarding API | OPT-OUT | Existing destination setup is retained; this phase rechecks verified ownership and enabled status. |
| Other PayMongo product APIs | OPT-OUT | They do not prove booking settlement, Wallet funding, or transfer terminality for this phase. |
