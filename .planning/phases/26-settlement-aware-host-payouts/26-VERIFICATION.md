---
phase: 26-settlement-aware-host-payouts
verified: 2026-10-01T05:13:49Z
status: human_needed
score: 6/8 scoped truths verified
behavior_unverified: 0
---

# Phase 26: Settlement-Aware Host Payouts Verification

**Phase goal:** Hosts see honest pending earnings and FitOut releases eligible earnings on a Friday only after the review hold and booking-specific PayMongo settlement, without advancing unsettled funds.

**Result: human evidence needed.** Eight active plans have summaries. Plan 26-08, which would publish the full agreement and terms, was deferred by user direction and preserved as `26-08-DEFERRED.md`. No operative terms or live-money proof is claimed. The Phase 25.1 broad-release decision remains HOLD.

## Observable truths

| Truth | Result | Evidence |
| --- | --- | --- |
| Booking-specific deposited settlement is persisted, checked against the current observation, and withheld on mismatch or return | Verified locally | `drizzle/0033_booking_settlement_observation.sql`, `src/lib/payments/settlement.ts`, focused settlement tests |
| Friday 12:00–23:00 Asia/Manila dispatch and minimum 24-hour post-session review hold | Verified locally | `src/inngest/functions/payout-sweep.ts`, Friday cohort tests |
| Available Wallet balance includes the host amount and fee before a claim or transfer | Verified locally | Payout sweep funding branch and focused tests |
| At-most-once claim, frozen amount, uncertain-create recovery, and terminal reconciliation remain fail closed | Verified locally | Payout sweep and reconciliation tests; terminal failed rows are excluded from automatic resend pending the attempt-identity design in `26-RETRY-ATTEMPT-GAP.md` |
| Owner-scoped preclaim earnings and honest Friday host copy | Verified locally | Earnings projection and legal-copy source gates; terms route remains an explicit nonbinding placeholder |
| Durable payout exception and alert path exists in source | Verified locally | Ops payout attention, alert/digest implementation and prior relevant-suite results; monitored human owner is not evidenced |
| This PayMongo account's weekday, Wallet, transaction mapping/pagination, balance permission, fee, reference lookup, and deployed schema/schedule are observed | Partly observed — HOLD | One Wednesday payout is Deposited and matches the test booking. The Dashboard send form showed ₱19.55 available and a no-fee InstaPay option. Migration 0033 is applied and read back on the live database; both settlement tables have zero rows. API balance access, automated fee, mapping, reference read-back, application deployment and registered schedule evidence remain missing. |
| One capped settlement-to-host transfer is authorized and reconciled to terminal provider state | Unverified — HOLD | No immutable decision ID, cap, participant, operator, joint authority, stop/return observation, or live transfer exists |

**Score:** 6/8 scoped truths verified locally. The two unverified truths require external account and one-operation evidence; a HOLD is a safe decision, not proof that money moved.

## Requirements

| Requirement | Verification state |
| --- | --- |
| HPAY-01 | Local settlement persistence and fail-closed tests pass; one account payout is observed deposited and matched to the test booking. Live migration 0033 is applied and catalog-verified. API field mapping and persisted booking-specific observation remain HOLD. |
| HPAY-02 | Friday schedule and hold rules pass local tests. |
| HPAY-03 | Funding and fee guard pass local tests. Dashboard showed ₱19.55 available and no fee for its InstaPay form, but production API balance access, automated-route fee and dispatch-time funding remain HOLD. |
| HPAY-04 | Local money-path integrity tests pass; automatic resend of a terminal failed transfer remains disabled pending per-attempt identity. |
| HPAY-05 | Earnings and host copy pass local checks; rendered product review remains pending. Full agreement and terms publication are deferred outside this phase execution. |
| HPAY-06 | Durable exception path is implemented; monitored owner, delivery, acknowledgement and escalation proof remain HOLD. |
| HPAY-07 | One credited booking payment is proven. The existing live host payout flag remains disabled; under the revised host-owned recipient rule, that host must reconfirm the complete saved destination after deployment. Live settlement tables are present but empty; application deployment and one-operation transfer authority remain HOLD. Staff approval of each masked destination is no longer required. |

## Automated verification

- 2026-09-29: focused settlement, payout sweep and payout reconciliation, **78/78 passed**; isolated test database reported no escaped writes.
- 2026-09-29: legal-copy and earnings-freeze source guards, **38/38 passed**.
- 2026-09-29: `tsc --noEmit` passed. The Plan 09 packet field checks passed.
- Earlier Phase 26 relevant payment/host/ops suite: **758/758 passed**. The broader full project run had 6 failures, of which the payout-related booking fixture was repaired and passed its focused rerun. Other failures and two escaped test-audit writes remain recorded in `26-VALIDATION.md`; the full project and design suites are not claimed green.
- 2026-09-30 recipient-policy revision: approved-host exact-value attestation, replacement pause, unapproved refusal, and provider-declined refusal passed focused database tests; TypeScript and the host payout copy inventory passed. The revised flow is local source only and has not changed the live host record.

## Human verification required

1. **Account and deployment capability:** Live migration 0033 was applied through Drizzle on 2026-10-01 after passing on a production clone; journal, tables, indexes, constraints and trigger were read back. The account authority and deployment owner still provide redacted, timestamped observations for Wallet identity, transaction mapping and pagination, balance permission, fee, reference recovery, application release, registered Friday-only Inngest job, and duplicate-runner absence. Expected: each unresolved field is observed or retains a named HOLD; an unsupported Friday funding schedule returns to product.
2. **Operations ownership:** A named money-operations owner demonstrates monitored alert receipt, acknowledgement, SLA, escalation and stop/return handling. Expected: evidence is recorded before a bounded proof decision.
3. **One controlled proof decision:** Product, account, and money-operations authorities either retain HOLD or record a fresh immutable one-operation decision with cap, participant, operator, expiry, and stop/return path. Expected: no provider call occurs from this verification; any later authorized transfer has settlement, funding, terminal read-back and ledger reconciliation evidence.
4. **Product copy review:** Product owner reviews the rendered host Friday promise at mobile and desktop widths. Expected: the review hold is not described as a payday and a missed Friday is not promised as paid. The separate full agreement remains deferred.

## Pending scope

The Phase 26 implementation and owned HOLD packet are complete. This verification does **not** advance the phase to released status. Live account proof, monitored operations, a controlled money-path result, and a fresh Phase 25.1 broad-release decision remain open. Terms publication is preserved for later work and is not a gate on the account review or separately authorized one-operation proof.
