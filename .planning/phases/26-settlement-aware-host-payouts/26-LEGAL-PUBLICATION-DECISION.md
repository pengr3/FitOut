# Phase 26 — Host payout terms publication decision

**Decision: HOLD.** On 29 September 2026 the user said the agreement has not yet been prepared and directed that publication work wait. This is a review packet, not published terms, legal approval, a host notice, or authority to move money. The current `/terms` route remains a nonbinding outline. Phase 25.1's production checkout and payout release decision remains HOLD.

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

## Current source and release checks

| Checked source | Observed state | Decision effect |
| --- | --- | --- |
| `src/app/(legal)/terms/page.tsx` | Its lead says “Placeholder — these are not FitOut's terms of service”; its body says nothing there is a binding agreement and displays no effective date. | `/terms` is still nonbinding. The candidate above is not on the route. |
| `tests/design/legal-copy.test.ts` | The source gate pins the exact notice, notice hook and panel, and excludes operative clause language on legal placeholder pages. | A green test proves the placeholder guard remains; it is not approval to publish. |
| `26-CONTEXT.md` decisions D-01–D-04 and `26-UI-SPEC.md` interaction item 8 | The PM selected a Friday-after-receipt design with a minimum review hold and no off-cycle automated payment, and the UI contract requires a separate legal publication gate. | Product design input only; no named product or legal sign-off on contract text. |
| `25.1-RELEASE-DECISION.md` | Broad availability and money movement remain HOLD pending account, operating, reconciliation, and joint authority proofs. | This document cannot turn on checkout, a transfer, payout, or release. |

## Open review questions and source limits

1. Counsel and the product owner must confirm the full agreement's legal entity, governing law, contact, host eligibility, existing-booking transition, and how the candidate payout clause connects to the cancellation and refund policy. The current outline itself says core legal identity and governing-law facts are undecided.
2. Counsel must ensure the payout adjustment sentence does not purport to remove any applicable consumer remedy. The [Philippine Supreme Court's text of Republic Act No. 11967, section 20](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/96902) describes consumer remedies including refund in relevant circumstances. This packet makes no determination that a particular cancellation qualifies, that the Act applies to any specific booking, or that the candidate is legally sufficient.
3. [PayMongo's refund documentation](https://developers.paymongo.com/v1/docs/refunding-transactions) describes refunds as deductions from an upcoming merchant payout balance and notes method-specific refund constraints. That public documentation is not proof of FitOut's current account entitlement, a booking's deposited settlement, or a particular refund result. Account-specific capability and the final refund policy remain unresolved under Phase 25.1 HOLD.
4. The phrase “FitOut may retry” needs counsel review against what hosts should be told if a transfer fails at 23:00 or a provider result remains unknown. It must not imply that a failed transfer is automatically sent the next Friday. Operations must own the host update and reconciliation path.

## Correction and rollback procedure proposed for approval

**Before publication:** The publishing owner records the named product and legal approvals, exact final text and version/hash, public route, effective date and time zone, affected booking cohort, host notice wording and channel, and a tested correction owner. Compare the approved text against the actual page content. Confirm refund/cancellation terms and the current UI promise do not conflict. If any item differs or is absent, stop and retain the nonbinding notice.

**Publication change:** In a separately authorized change, replace the full `/terms` outline with the approved full agreement. Remove its placeholder notice and adjust its two source assertions in the same commit; retain or replace the independent `/privacy` protections. Record the deployed version and effective date only after the actual route is observed. Passing the local legal-copy source test alone cannot record publication.

**After a mistake or conflict:** The named correction owner (currently **missing — HOLD**) stops further publication or host notice, preserves the version and decision record, and asks product and legal owners to choose corrected wording and an effective/affected cohort. Publish a dated correction and host communication only with their approval. If no approved binding replacement is available, restore an explicitly nonbinding page without erasing evidence of what was shown; determine any host remediation with counsel. A code revert alone cannot retract a public promise already seen, so a correction record and affected-host assessment are required. Phase 25.1 money-movement HOLD remains independent throughout.

## Recorded disposition and next blocking checkpoint

**DEFERRED — agreement not yet prepared; candidate unapproved; `/terms` nonbinding; no publication date or effective date; no money-movement authority.** The user directed on 29 September that the terms and legal work be finalized later rather than block Phase 26 engineering. Plan 26-08 is preserved as `26-08-DEFERRED.md` outside the active execution plan set. The independent source guard against a guaranteed 24-hour payday was strengthened without changing the route. When a full agreement exists, the next checkpoint is an explicit product-and-legal decision on one exact version, including the Friday clause, refund/cancellation cross-reference, affected cohort, publication and correction owners, effective date, and host communication. Conflicting wording or any missing named authority retains publication HOLD. Account review and any separately authorized one-operation proof proceed under their own evidence and authority gates.
