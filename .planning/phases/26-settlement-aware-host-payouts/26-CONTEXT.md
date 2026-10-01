# Phase 26 — Settlement-Aware Host Payouts

**Added:** 2026-09-29
**Status:** Implemented locally; live payout proof remains on HOLD
**Depends on:** Phase 25.1 controlled payment and payout proofs
**Requirements:** HPAY-01…HPAY-07 in `.planning/REQUIREMENTS.md`

## Why this phase exists

FitOut originally promised hosts payment 24 hours after a booking's session. The current
`PAYOUT_DELAY_HOURS` default, hourly Inngest sweep, and earnings-page expected date implement that
promise. PayMongo's merchant settlement can arrive later; its published default is a weekly
Wednesday payout to the merchant Wallet, subject to clearing and account configuration. The current
sweep can therefore attempt a host transfer before FitOut has the booking's funds. It marks a failed
attempt for a bounded 72-hour retry, which may expire before the next weekly settlement.

Phase 25 and Phase 25.1 keep production checkout and payouts on **HOLD**. No real host payout has been
proved or authorized. Phase 26 closes the cash-availability and host-promise gap before any broad
release; this context does not authorize a provider call, transfer, or release.

## Product decisions (PM, 2026-09-29)

- **D-01: Revise the prelaunch promise.** Hosts are paid on an eligible Friday after FitOut receives the
   relevant payment, rather than 24 hours after the session. No host has accepted the old promise in
   a live launch, according to the PM's prelaunch answer.
- **D-02: Keep a 24-hour post-session minimum hold.** It is a review window and payout eligibility gate,
   not a deadline or a claim that card disputes end after 24 hours.
- **D-03: Use a fixed weekly host payday.** The first release starts Friday at **12:00 Asia/Manila**.
   Automated retries may run hourly through **23:00 Friday**. A booking missing the Friday cutoff
   enters the next Friday cycle; no automated off-cycle payment is promised or performed.
- **D-04: Do not advance unsettled booking proceeds.** The matching PayMongo payment must be traced to a
   provider payout deposited into FitOut's verified Wallet. The Wallet's available balance must
   cover the net host transfer and applicable transfer fee at dispatch. Other bookings' available
   cash is not a substitute for evidence that this booking's payment settled.
- **D-05: Allow one settlement-record migration.** This is an explicit exception for Phase 26 to the
   original v1.2 Phases 18–23 zero-migration rule. It does not reopen those phases' scope.
- **D-06: Court is the only theme going forward (PM, 2026-09-29).** Use Court's coral/red-pink
   palette and type scale for this phase. Do not design or verify a Grove variant or prepare
   alternate themes. This supersedes D-138's retained Grove test-probe posture; the project-wide
   decision is D-279 in `PROJECT.md`.
- **D-07: The host confirms their own payout destination (PM, 2026-09-30).** An approved host must
   review the complete bank/e-wallet, account name and account number they entered and explicitly
   attest them. FitOut checks the current receiving-institution directory and exact saved values;
   staff does not separately approve every recipient. A changed destination pauses payouts until
   the host confirms the replacement. Host confirmation does not prove bank ownership or override
   booking settlement, available balance, Friday timing, transfer recovery or a suspended host.
   The former masked-only staff release cannot establish recipient ownership and is removed.

## Implementation boundaries for planning

- Record a durable, booking-linked settlement proof keyed by booking/payment and provider payout,
  including the observed deposited instant, verification instant, and current provider status.
  Preserve the history when a provider payout is later returned or contradicted. Never infer
  settlement from checkout success, a hosted-page redirect, payout generation, or an `in_transit`
  status. Validate the live account's payout transaction field mapping before relying on it.
- Confirm the actual merchant settlement weekday, payout destination, available-balance read,
  transaction-list access, and fee schedule with the PayMongo account authority. Documentation's
  Wednesday default is an assumption until the account proves it. If the account cannot support
  a Friday host payday, retain HOLD and return the timing conflict to the PM; do not silently
  change host copy or fund the gap from unrelated receipts.
- Refactor payout selection and retries around the Friday window. A booking waiting on settlement
  or funds stays eligible for a future cycle without burning the existing failed-transfer age limit.
  Once a transfer is fired, keep the established at-most-once ledger claim, idempotency key, frozen
  commission, debit netting, refund behavior, and provider read-back. Concurrent runs cannot send
  a second transfer for the same booking.
- The earnings page currently reads only `host_payout_ledger`, whose payout row is normally created
  when the sweep claims it. Its pending view must include confirmed bookings before that claim,
  remain owner-scoped, and avoid claiming an exact Friday until settlement evidence supports one.
  Show processing and paid according to the actual transfer state. Update every host-facing payout
  statement and contractual wording that implies payment at session end plus 24 hours.
- Preserve existing suspension, destination, partial-cancellation, refund, and host-debit gates.
  Missing provider evidence or available funds is an operations exception if a Friday is missed,
  never a reason to pretend a transfer succeeded. Alerts need a monitored owner and an action path.

## Acceptance scenarios

| Scenario | Required outcome |
|---|---|
| Session ends less than 24 hours before Friday noon | Wait until a later Friday even if payment settled. |
| Payment confirmed but provider payout is pending or in transit | No host transfer; show awaiting settlement. |
| Payment appears in a deposited payout but Wallet destination or balance is unverified | No host transfer; operations alert and HOLD. |
| Deposited Wednesday, hold elapsed, gates pass, balance covers net plus fee | One Friday transfer; reconcile to terminal provider status. |
| Deposit arrives after Friday's final retry or after a holiday delay | Next Friday cycle; host schedule updates without a false paid state. |
| Partial cancellation, refund, host fee debit, or suspension | Preserve the existing retained-amount and freeze behavior; never overpay. |
| Insufficient balance, returned settlement, duplicate cron, failed transfer | No unfunded or duplicate transfer; distinct waiting/failure state and owned recovery. |

## Release boundary and sources

The Phase 25.1 release decision remains HOLD until its controlled proofs and owners are complete.
Phase 26 also requires a controlled, authorized demonstration of settlement correlation, Wallet
funding, exactly-one host transfer, provider terminal read-back, alert handling, and honest host copy.
No sandbox fixture, source comment, or local test substitutes for live-account entitlement.

- PayMongo payout schedule and clearing: https://docs.paymongo.com/do/docs/money-movement-payouts
- Payout transaction API: https://docs.paymongo.com/reference/getpayouttransactions
- Payout resource statuses and fields: https://docs.paymongo.com/reference/payout-resources
- Wallet available versus pending balance: https://docs.paymongo.com/docs/money-movement-manage-your-balance
- Disbursement funding and fees: https://docs.paymongo.com/docs/money-movement-disbursements
