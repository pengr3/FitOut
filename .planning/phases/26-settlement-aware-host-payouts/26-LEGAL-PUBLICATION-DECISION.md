# Phase 26 — Host payout terms publication decision

**Decision: HOLD.** This is a review packet dated 29 September 2026, not published terms, legal approval, a host notice, or authority to move money. The current `/terms` route remains a nonbinding outline. Phase 25.1's production checkout and payout release decision remains HOLD.

## Candidate clause — exact text offered for product and counsel review

> **Host payout timing.** For an eligible booking, FitOut schedules a host payout for a Friday after the booking payment has actually reached FitOut. A payout cannot become eligible until at least 24 hours after the booked session ends. The Friday payout cohort closes at 12:00 noon Asia/Manila time. If the review period, receipt of the booking payment, or any other payout eligibility check is incomplete at that cutoff, the booking is considered for the following Friday instead. For bookings in the current Friday cohort, FitOut may retry an unsuccessful release hourly through 23:00 Asia/Manila time that Friday, subject to the same eligibility and funds checks. A retry window is not a promise that a transfer will succeed by 23:00. FitOut does not promise or automatically make an off-cycle host transfer. When an eligible transfer is sent, the host's bank or payment provider may credit the destination later; sending the transfer and its arrival are separate events. A cancelled booking, refund, partial refund, charge adjustment, or other valid deduction may reduce or prevent the amount payable to the host under the applicable published cancellation and refund terms. FitOut will not release an amount that is not owed or has not been received for that booking. If a payout is blocked or fails, FitOut will review the issue and update the host's payout status; the next Friday is a consideration cycle, not an unconditional payment guarantee.

**Drafting annotation, not clause text:** “Payment has actually reached FitOut” must be defined in the final agreement to mean that the matching booking payment is traced to a provider payout deposited into FitOut's verified Wallet, with sufficient available balance for the host amount and transfer fee at dispatch. A checkout confirmation, pending or in-transit provider payout, or unrelated booking balance is insufficient. Product and counsel must decide whether this operational definition belongs in public terms or a linked payout policy. No provider cadence, entitlement, destination, fee amount, or account identifier is asserted here.

## Promise comparison

| Existing prelaunch 24-hour promise | Candidate Friday-after-receipt promise |
| --- | --- |
| Host payout was described as due 24 hours after the session; the old delay was a timing promise. | At least 24 hours after the session is a minimum review and eligibility hold. It is not a payment deadline or a statement that disputes end then. |
| Session end plus 24 hours could create an expected payout date without evidence of merchant settlement. | The matching booking payment must be deposited and available before release. An unverified payment produces no firm transfer date. |
| No weekly cohort or cutoff was stated. | Friday 12:00 noon Asia/Manila is the cohort cutoff. A booking that misses it enters consideration for the next Friday. Hourly retry is limited to 23:00 that Friday for the admitted cohort. |
| “Paid” could be read as money in the host's bank. | Transfer dispatch, provider-confirmed completion, and bank arrival are distinct. No off-cycle transfer or bank-arrival deadline is promised. |

## Approval and publication record

| Required field | Current record |
| --- | --- |
| Product approver — named person, role, dated approval | **Missing — HOLD** |
| Legal approver — named counsel or authorized legal owner, dated approval | **Missing — HOLD** |
| Exact final wording and version/hash approved by both | **Missing — candidate above only — HOLD** |
| Publication target and owner | Proposed replacement of `src/app/(legal)/terms/page.tsx` at `/terms`; publishing owner **missing — HOLD** |
| Effective date, time zone, and affected booking cohort | **Missing — HOLD** |
| Existing promise conflict resolution and host notice decision | **Missing — HOLD** |
| Cancellation/refund cross-reference and full agreement context | **Missing — HOLD** |
| Correction/rollback owner and procedure | **Missing — HOLD** |
| Phase 25.1 money-movement authorization | **HOLD**; this packet cannot change it |

**Publication gate:** A product timing choice and passing local tests do not supply product/legal authority. Keep the current nonbinding notice until both named approvers approve the same exact final text, the complete agreement and refund/cancellation cross-references, publication owner and target, effective date and cohort, host communication, and correction procedure. A separate publication decision and implementation must make the terms replacement and removal of its source gate one reviewed change. Missing or conflicting fields mean HOLD.
