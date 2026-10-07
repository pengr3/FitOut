# Phase 26 — First live API payout and fee policy

**Reviewed 2026-10-07 Asia/Manila. Scoped proof: observed and reconciled for one sample booking. Broad release: HOLD.** Earlier HOLD entries in [the account packet](26-ACCOUNT-AND-RELEASE-PROOF.md) are historical checkpoints, not the current state of this one transfer.

## One-booking canary evidence

The staff-authorized controlled API path sent **PHP 17.10 principal** from the matched live merchant Wallet to the host-confirmed GCash destination ending `9701`. PayMongo's terminal transfer readback reported **succeeded** and **PHP 0.00 actual transfer fee**. The provider transfer identity is held in restricted operational systems; only masked suffix `…4fa5` is recorded here. Production FitOut readback found one durable manual attempt and one booking payout claim bound to that single provider transfer, with `host_payout_ledger.state = paid`. The host earnings page displayed **PHP 17.10 Paid** and **PHP 0.00 pending**. This closes the first outbound transfer gap for this booking, subject to investigating any later provider contradiction. It does not prove future transfers are free.

The Production Inngest `payout-sweep` remains **Paused**. The canary used the real date through the one-booking staff action; it did not run the Friday cron. A Paid claim must remain excluded from future dispatch. No second provider POST is authorized for this booking.

## Forward transfer fee policy

PayMongo's [Send money](https://docs.paymongo.com/docs/money-movement-send-money) and [Disbursements](https://docs.paymongo.com/docs/money-movement-disbursements) guides state **PHP 10.00 per standard InstaPay/PESONet transfer** and **one free transfer per account per week**. The user confirmed this pricing policy for planning on 2026-10-07. Budget **PHP 10.00 (1,000 centavos) for every external host transfer**, including the first one of a week; treat a free transfer as a realized discount, not as available funding or a promise to a particular host. An account-specific verified estimate above PHP 10.00 raises the budget further. FitOut bears the provider transfer fee; the frozen host principal is unchanged. For the sample PHP 17.10 principal, reserve at least **PHP 27.10** in the source Wallet. The PHP 10.00 fee alone exceeds this sample booking's PHP 1.90 host-side commission by PHP 8.10, so product must review unit economics before recurring release.

The funding adapter and controlled Friday selection now use the greater of the configured verified estimate and 1,000 centavos. This is a **funding and approval budget, not a PayMongo-enforced fee cap**: the provider discloses actual API fee after transfer creation. Reconcile the actual fee for every transfer. If it exceeds the approved budget, record a money exception and stop further scope; if that identity-matched transfer succeeded, keep the host Paid to prevent a second send. Refresh provider pricing and `PAYMONGO_INSTAPAY_FEE_VERIFIED_AT` evidence when terms change or the existing freshness window expires. Do not set the configured estimate to zero merely because this canary was free.

### Friday fee readback implementation

Migration `0036_host_payout_transfer_fee.sql` adds the frozen `fee_budget_cents` and provider `actual_fee_cents` to each payout claim. The Friday selector reserves the principal plus the greater of the verified fee estimate and PHP 10.00; a reported free transfer never lowers this reserve. Its normal transfer readback requires a nonnegative integer fee. Reconciliation writes the actual fee and the pending, failed, or Paid outcome together. A fee above the claim budget creates a durable `transfer_fee_over_budget` operator exception; verified success still marks the host Paid. A missing or malformed fee leaves the claim Processing for investigation. Historical claims with no frozen budget use the PHP 10.00 floor during reconciliation. These changes are local until migration and code are released together; the Production sweep remains paused. The exception queue needs monitored acknowledgement and broader dispatch-stop verification before recurring release.

## Remaining Phase 26 gates

- Prove Friday cohort selection, bounded dispatch, duplicate protection, settlement freshness, Wallet funding and transfer reconciliation with controlled runs.
- Demonstrate monitored money-operations alert receipt, acknowledgement and escalation.
- Exercise held, pending, failed and uncertain-transfer recovery without issuing another POST to discover an earlier outcome. Automatic resend after a terminal failure remains held until the per-attempt identity model is reviewed.
- Resolve the Test Wallet limitation and make a separate decision for broad recurring release. Keep the Production sweep paused until these gates pass.
