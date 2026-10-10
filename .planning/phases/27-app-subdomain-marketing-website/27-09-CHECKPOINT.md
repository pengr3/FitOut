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
4. Actual production trusted-ingress/per-IP enforcement remains unobserved.
5. Actual production shared mailbox quota and alert/disable enforcement remain unobserved. The reviewed additive 0037 migration is applied and its table is empty. Exact quota code passed engineering and isolated Preview tests. The production endpoint returns 503 before identity or quota checks when Contact is disabled, so disabled probes cannot establish these controls. No verified live alert/control readback is available. Keep Contact disabled; a bounded verification method or reviewed gap is required before enabling it.
6. Rollback targets are retained and READY, but an actual rollback was not exercised and no failure threshold occurred. Preserve original and Stage A pins, the additive quota table, and direct receivers. Do not reverse healthy traffic merely to fill an evidence row.

Additional live acceptance gates remain: partial provider mode/key/workflow correspondence, actual Contact inbox receipt/Reply-To/reply, and release-control reconciliation. No new signed financial event or scheduler mutation is authorized. All checkout, payout, and legal HOLDs remain.

After Contact controls pass, obtain the scoped public-enablement and one-inquiry approval recorded in the packet. The proposed inquiry is name "FitOut release check", message "Phase 27 domain transition check. Please confirm receipt and reply.", and mobile blank. The destination is confirmed SUPPORT_EMAIL pengr.clmc.3@gmail.com; the owner must supply a controlled reply-capable sender address. The prior standalone transport test and its owner reply are historical evidence, not proof of this deployed Contact flow. Record actual receipt, matching Reply-To, and reply arrival.

Both projects currently require manual Production promotion; their auto-domain assignment controls remain false. Production tracks dev, which has not been advanced to the approved release source. Reconcile branch and promotion controls after live acceptance. Nine minute-spaced monitoring rounds passed 36/36 checks; extended monitoring and the full-account five-minute 5xx percentage remain unproved.

Validator results at 2026-10-10T12:04:27.308Z: prepared PASS; deployed FAIL and live FAIL for the explicitly missing observations, partial inventory, and Contact/inbox gates. These are acceptance failures, not observed site outages. No completed Plan 09 summary or phase completion is recorded.

Plan 09 requires "Enable Contact only after the verified WAF/global control read-back" and "unresolved observations cannot be auto-approved." The execution skill requires preserving checkpoint and verification gates. The remaining checkpoint concerns concrete controls and observations; it is not another cutover approval.


Latest Contact control progress (2026-10-10T13:42:35.904Z): exact quota function passed primary rollback-only tests with table0 afterward. Published WAF rule is logging-only50/600s, not enforcing. Attempted429 action opened Pro upgrade, cancelled; no billing or Contact flag change. Three empty-body probes returned503, all public boundary reads preserved. See27-CONTACT-NO-MAIL-TEST-PACKET.md for the prepared, unapproved restricted production test; no app-code change or paid upgrade proposed. Six matrix scenarios still pending.
