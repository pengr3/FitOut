# Phase 27 — Plan 09 live checkpoint

The approved Stage A/B/C rollout is live at source d67fbecfa41e902cbf506c93dbcf53b60085e802. Plan 08 is complete: 20/21 phase plans and 144/151 curated plans. The live matrix has 29/35 observed scenarios. All seven phase requirements remain pending. Cutover and both database-target approvals are resolved; do not request them again.

Live entry points:

- Marketing: https://fitout.live/
- Customer app: https://app.fitout.live/
- Staff sign-in: https://ops.fitout.live/login

Six matrix observations remain:

1. Staff-only credentials must fail the customer capability POST at /start-hosting. Existing staff continuity and customer-to-ops denial were observed; they do not prove this separate direction. Ops was signed out during the isolation check. If staff credentials are needed, hand the browser to the owner for entry.
2. A previously issued, still-valid email-verification link must survive the origin transition.
3. A previously issued, still-valid password-reset link must survive the origin transition. Invalid synthetic link bridges were observed, but genuine issued links were unavailable. Do not collect bearer links or passwords in chat, change a password on the owner's behalf, or claim an expired link supplies this proof.
4. Temporary original-IP WAF denial and deployed sequential local-IP enforcement are observed; shared cross-instance per-IP admission evidence remains pending.
5. Actual production shared mailbox quota returned429 under the owned100-reservation fixture, with manual disable/rollback recovery. Automatic quota alert notification remains unproved. Contact is disabled, savedflagsfalse, fixture removed and temporaryguarddisabled. Read27-CONTACT-BOUNDED-TEST-RESULT.md.
6. Rollback targets are retained and READY, and a scoped Contact test rollback was exercised; full topology/session/provider rollback and failure-threshold evidence remain pending. Preserve original and Stage A pins, the additive quota table, and direct receivers. Do not reverse healthy traffic merely to fill an evidence row.

Additional live acceptance gates remain: partial provider mode/key/workflow correspondence, actual Contact inbox receipt/Reply-To/reply, and release-control reconciliation. No new signed financial event or scheduler mutation is authorized. All checkout, payout, and legal HOLDs remain.

After Contact controls pass, obtain the scoped public-enablement and one-inquiry approval recorded in the packet. The proposed inquiry is name "FitOut release check", message "Phase 27 domain transition check. Please confirm receipt and reply.", and mobile blank. The destination is confirmed SUPPORT_EMAIL pengr.clmc.3@gmail.com; the owner must supply a controlled reply-capable sender address. The prior standalone transport test and its owner reply are historical evidence, not proof of this deployed Contact flow. Record actual receipt, matching Reply-To, and reply arrival.

Both projects currently require manual Production promotion; their auto-domain assignment controls remain false. Production tracks dev, which has not been advanced to the approved release source. Reconcile branch and promotion controls after live acceptance. Nine minute-spaced monitoring rounds passed 36/36 checks; extended monitoring and the full-account five-minute 5xx percentage remain unproved.

Validator results at 2026-10-10T12:04:27.308Z: prepared PASS; deployed FAIL and live FAIL for the explicitly missing observations, partial inventory, and Contact/inbox gates. These are acceptance failures, not observed site outages. No completed Plan 09 summary or phase completion is recorded.

Plan 09 requires "Enable Contact only after the verified WAF/global control read-back" and "unresolved observations cannot be auto-approved." The execution skill requires preserving checkpoint and verification gates. The remaining checkpoint concerns concrete controls and observations; it is not another cutover approval.


Latest Contact control progress (2026-10-10T13:42:35.904Z): exact quota function passed primary rollback-only tests with table0 afterward. Published WAF rule is logging-only50/600s, not enforcing. Attempted429 action opened Pro upgrade, cancelled; no billing or Contact flag change. Three empty-body probes returned503, all public boundary reads preserved. See27-CONTACT-NO-MAIL-TEST-PACKET.md for the prepared, unapproved restricted production test; no app-code change or paid upgrade proposed. Six matrix scenarios still pending.


Bounded Contact window approved (2026-10-10T21:16:29.368Z): owner approved the exact no-mail packet. Preflight confirms both flags false, primary quota empty, and retained Stage C pins READY. Browser Vercel login handoff is pending. No test guard, fixture, temporary enabled deployment or mail exists. This is a login prerequisite, not another approval checkpoint. Six matrix scenarios remain pending.


Approved Contact guard preflight — October11: 2026-10-10T21:32:10.541Z: Vercel login restored. Temporary rule rule_phase_27_restricted_contact_test_j9IM6v was scoped to exact Production POST /api/contact on fitout.live, staged/published as plain Log, and one marked empty-body probe produced one match with one original verifier IP captured privately. Rule was then edited, published and reopened with an additional original-IP Does not equal condition and plain Deny. No upgrade or system bypass occurred. Verifier POST returned503. Codex browser synthetic example.invalid submission also returned503, so it does not prove independent denial; no distinct original IP is claimed. Owner mobile-data probe requested and pending. Four completed preflight POSTs, both flags false, primary quota_rows0, no fixture or temporary enabled deployment, no email. HTTP request trace for initial probe shows no outgoing requests. Counts remain20/21,144/151,29/35, all seven requirements pending.

The earlier mobile-data prerequisite is resolved by the completed test below. Retain existing approvals; Contact stays disabled pending remaining live controls.


## Bounded Contact test completed — October 11

2026-10-11T05:31:14.208Z: Owner mobile-data denial was observed from a distinct original IP. Exact-source staged deployment dpl_FTxX4Sa4pq8jcW21kmuwiV5vxUFW was promoted for six no-mail probes: global429 Retry-After3311; malformed requests400; sixth request429 Retry-After895 despite rotated synthetic forwarding headers. The active operator immediately restored customer dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW and savedflagfalse; Ops remained dpl_9QYdHByiE7JzzqnGW4qVMS5grYFQ with falseflag. Fresh503, all3surfaces200 and field retention passed. Exact100-reservation fixture matched and was removed; primaryquota0. Temporary guard disabled and published, originalLogrule preserved. No mail success or transport call was recorded. See27-CONTACT-BOUNDED-TEST-RESULT.md for limits. Automatic alert and deployed shared cross-instance per-IP proof remain open; scoped rollback does not establish full cutover rollback. No new matrix pass or plan completion:20/21,144/151,29/35,all7requirementspending.
