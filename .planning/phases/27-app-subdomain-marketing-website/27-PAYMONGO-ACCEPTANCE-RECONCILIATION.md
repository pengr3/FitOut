# Phase 27 — PayMongo acceptance reconciliation

**PayMongo receiver continuity satisfies the original Plan 09 alternative. Contact remains disabled.** Reconciled 2026-10-13T13:31:51.382Z; verification completed 2026-10-13T13:35:14.495Z.

## Contract and evidence

The original Plan 09 at commit edec99b8 and the current plan both permit an approved provider test event **or an existing safely denied invalid-signature probe with explicit destination read-back**. Later inventory text added a positive LIVE delivery expectation without removing that alternative from the plan. The owner authorized this reconciliation. The inventory now expresses both planned alternatives and preserves its previous partial row in historyBeforeAcceptanceReconciliation. Neither Plan 09 nor either verifier copy was edited.

| Required fact | Observed evidence |
|---|---|
| Apex receiver remains direct | POST https://fitout.live/api/paymongo/webhook returned 400 Invalid signature without a redirect; matched serverless request mhc4w-1791895551050-fc78dfc07a13 on web G8 |
| App receiver remains direct | POST https://app.fitout.live/api/paymongo/webhook returned 400 Invalid signature without a redirect; matched serverless request gpvw7-1791895552067-340f72cf25cd on web G8 |
| Destination, events and mode | Retained Enabled LIVE hook_6UWbRKJQBt1CUnuhRfoFC6XE at the apex receiver with the same five subscriptions |
| Runtime signing configuration | Protected Production diagnostic at 2026-10-13T08:58:31.086Z observed LIVE secret/public modes, exact-hook GET 200 and private signing-secret equality; only booleans retained |
| Current release correspondence | Handler/library Git blobs are identical from 588 to 6bb. The accepted 6bb export matches after LF/CRLF normalization, with raw hashes retained separately. Fresh aliases and three credential metadata entries match. This supports configuration inheritance, not direct serving plaintext observation |

The two actual denial requests completed at 2026-10-13T12:45:51.686Z and 12:45:52.120Z on dpl_G8ZbTTydH4XrhQ5Kpx3XrVrH1cQA. Source 6bb6e3f7 is bound by the accepted OPS-11 archive/manifest. The historical 35/35 matrix remains dated at source 588; no row was reassigned.

## Limits retained

Missing-signature rejection proves routing and rejection. It does not prove positive HMAC acceptance or successful LIVE event processing. Successful provider delivery and independent public-key account attribution remain unproved in deferred-items.md, P27-G-PAYMONGO-LIVE. No eligible harmless replay exists. No payment, payout or merchant event was created; checkout/payout/legal HOLDs remain.

The earlier signed-delivery packet exceeded 900 seconds by 33.430 seconds. Its strictPacketExecutionAccepted and timingLimitPassed remain false. This reconciliation uses its retained observations for the permitted contract alternative and does not waive the duration failure. Frozen packet, preparation, runtime and delivery results remain byte-identical.

## Verification and remaining work

The offline audit passed 136/136 checks, including all 110 raw capture digests. The initial audit found a harmless LF/CRLF plan difference and an older root-checkout verifier; failed outputs remain preserved. Acceptance checks use the unchanged authoritative worktree verifier. Both checker copies and application files remain untouched.

| Verifier stage | Result | Remaining reason |
|---|---|---|
| Prepared | PASS | None |
| Deployed | FAIL | Resend-inquiry and support-mailbox inquiry remain partial |
| Live | FAIL | Those two inventory entries, actual receipt/Reply-To/reply, and separate inquiry authority/enabled read-back |

No other verifier failure remains. Plan 09 stays incomplete: 20/21 numbered plans, 144/151 curated plans and seven requirements pending. The next work is a separate bounded Contact inquiry packet with controlled sender, inbox receipt, Reply-To and reply proof. Contact stays disabled until that exact sending scope is authorized. Testing accounts remain unchanged.

## Evidence and action boundary

The structured result is 27-PAYMONGO-ACCEPTANCE-RECONCILIATION.json, SHA256 aef28fe37d1a834de3ea3f0132cd809d721da4b5571db974466ac23889b3252e. It retains original-contract hashes, source correspondence, 136 checks, 110 capture digests and before/after verifier log hashes. The local audit and raw logs are in playwright/.cache/phase27-08/paymongo-acceptance-reconciliation-20261013/.

Fresh platform read-back at 2026-10-13T13:25:24.952Z used seven read-only Vercel GETs. This reconciliation performed zero receiver POSTs, provider sends, deployments, alias/configuration/firewall/scheduler changes, database/account writes, emails or financial jobs.
