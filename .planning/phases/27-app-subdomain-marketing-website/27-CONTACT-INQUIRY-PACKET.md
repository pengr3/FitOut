# Phase 27 — controlled Contact inquiry packet

**Prepared for approval; not executed. Contact remains disabled.** Packet p27-contact-inquiry-20261013-6bb, prepared 2026-10-13T14:03:26.144Z.

This gate proves one actual deployed form inquiry, readable inbox receipt, the validated Reply-To and a reply received by a separate controlled sender. Earlier standalone mail and scheduled control alerts do not substitute for this inquiry. Plan 09 and all seven requirements remain pending.

## Exact message and mailboxes

| Field | Value |
|---|---|
| Name | FitOut release check |
| Email and Confirm Email | francisgerard.silva@gmail.com — supplied by the owner for this test |
| Mobile and hidden website | Blank |
| Message | Phase 27 Contact inquiry check. Reference P27-CONTACT-20261013-6BB. Please reply: Received P27-CONTACT-20261013-6BB. |
| Fixed From | FitOut <updates@send.fitout.live> |
| Fixed To / support owner | pengr.clmc.3@gmail.com |
| Fixed subject | FitOut contact inquiry |
| Expected Reply-To | francisgerard.silva@gmail.com |
| Normal support reply | Received P27-CONTACT-20261013-6BB. |

The owner will confirm the inquiry in the support inbox, inspect its readable fields and Reply-To, reply normally to the supplied sender, then confirm reply receipt in that mailbox. Credentials stay in the owner's browser or mail app. No other mailbox messages are in scope. A Resend delivery status alone is insufficient.

## Reviewed baseline

Source 6bb6e3f74e2acb4b3fe9ec7c8de4fecc7a5f05d3; accepted archive 8feb311adca91cbbfa5c0eb27991ebc8f8f7c0e2dcc4cebc24f6484c8eb9a8ea; manifest a8b68c81fffbe53301b4c9b9566a80116ca02d2a16d5e3b563591098b293a499; all 1113 source files verified. Web baseline dpl_G8ZbTTydH4XrhQ5Kpx3XrVrH1cQA / fitout-116qj6x3i-pengr3s-projects.vercel.app; Ops dpl_3qtketSXoaeS6JMoCKa5KJznqzkL / fitout-ldqhhi7oz-pengr3s-projects.vercel.app. All eight aliases match. Both saved Contact flags and the saved no-mail verification flag are false. Auto-domain assignment is false and deployment protection covers noncustom domains.

Primary read-back: zero quota rows, zero pending alerts, one retained sent alert. Firewall version21 has no draft; the original logging rule is active and the exact temporary Deny rule is disabled. Its single operator-IP exemption is retained privately. Resend's send.fitout.live domain is Verified; From and app/marketing origins match the accepted configuration. These observations are dated preparation, and must be rechecked within15minutes of each live staging/guard action.

## Exact execution authority requested

1. **One protected web build.** Within a60-minute preparation lease measured from approval, create exactly one Production-target deployment T from the verified source export. Set only its build/runtime CONTACT_PRODUCTION_ENABLED=true and CONTACT_INGRESS_VERIFICATION_MODE=false. Saved project settings stayfalse. Verify source, exact project/team, READY identity, overrides and protection. Unknown creation consumes the single allowance; no rebuild. No Ops build. If staging moves only fitout-web-pengr3s-projects.vercel.app to T, align that generated alias back to G8 before testing; any other unexpected alias drift stops execution.
2. **Scheduler reconciliation.** If staging automatically changes the financial receiver, restore only https://fitout-116qj6x3i-pengr3s-projects.vercel.app/api/inngest, preserving its private provider-managed query. Verify the unchanged14 functions/16 triggers and the separate1 Contact monitor. No job is manually invoked. Repeat before removal of T and at closeout.
3. **Guard and two disabled preflights.** With G8 still serving the apex, use one marked GET and its actual Vercel original-IP evidence to check the operator exemption. Permit at most one refresh of that existing single exemption to the privately observed current operator IP if it drifted; preserve every other condition/action and the original logging rule. An unverifiable IP or unrelated draft/configuration change stops the attempt. Enable and publish only the existing narrow Production POST fitout.live/api/contact Deny. One operator POST must be503/no-store from G8; one POST from one fresh nonpersistent1vCPU Vercel Sandbox must be403 from the exact rule and a distinct original IP. Sandbox maximum120seconds, included quota only, no source/secrets/ports/snapshot, immediate shutdown. No replacement POSTs.
4. **One five-minute guarded window.** Start the independent watchdog before changing only fitout.live to T. At240seconds or two health failures it restores G8; maximum window300seconds. Confirm the actual GET /api/contact405 request/provider trace points to T. The prepared form must be hydrated and exact. Before180seconds, persist the consumed inquiry entry and click Send exactly once. Expect the visible success message, actual Contact function200 and one Resend inquiry. If the result is uncertain, stop and restore without retrying. Do not wait for email delivery or the owner inside the window.
5. **Immediate disabled recovery.** Restore only fitout.live to G8 immediately after the one submission outcome, even on failure. Verify the actual restored route/request binding, then use one disabled recovery POST expecting503/no-store. Confirm all eight aliases and the three savedfalse values. Disable the temporary Deny only after actual G8 recovery; retain the original logging rule and system protections. No permanent public Contact enablement.
6. **Exact quota cleanup.** Capture the expected global/IP rows from the single real reservation: exactly two rows, one matching timestamp each, within this window; exact keys/arrays/expiries and the unchanged alert fingerprint. Under advisory lock27018,1, delete only those two fully matched owned rows. No seed, budget exhaustion or incident insertion. If additional/changed rows or ownership uncertainty appears, preserve the rows and record the gap. No account, booking, payout or verification data changes.
7. **Remove only T.** After restoration, request evidence retention and exact Inngest reconciliation, remove only this packet's newly created test deployment T. Require exact source/project/packet metadata, no remaining alias pointing to it and the financial receiver restored to G8. Never remove G8, Ops, an older test build or a deployment with uncertain identity. This removes the temporary mail-enabled build without changing saved settings. If these conditions fail, preserve it protected, report the cleanup gap and make no additional inquiry.
8. **Receipt and reply outside the window.** Observe Resend for at most15minutes after recovery for one matching inquiry acceptance/delivery and its correct envelope/body. No resend. The owner independently confirms support inbox receipt and Reply-To, sends the single normal reply, then confirms arrival at francisgerard.silva@gmail.com. This human handoff can remain pending with Contact disabled; it does not extend the window or authorize another POST. Record dates, redacted references and actual observations. Only then reconcile the two partial inventory rows and run deployed/live checks plus final phase verification; completion is not presumed.

## Limits and stop conditions

**At most four Contact POSTs:** disabled operator, disabled external denial, one real form inquiry, disabled recovery. One attempt, one build, one temporary cloud machine, one real inquiry and one normal reply. No retries, request replacements, timer extension, paid upgrade, branch advance, DNS/migration/provider/credential/account changes, financial events or manual financial jobs. The only conditional IP change is the single verified exemption refresh above.

Bound actual route-readiness probes to11 GETs total (one current-IP observation, up to6 for T, up to4 for recovery), maximum45seconds polling per route proof. Watchdog API calls have10-second limits and a ten-second polling interval; operator restoration begins immediately after submission. If actual restoration cannot be confirmed within the bound, keep Deny active, cease all sends and report failure. Never declare an uncertain outcome successful.

The application stores no inquiry PII in quota rows. This approved test shares the supplied sender address and harmless message with FitOut's existing Resend transport and support inbox, and the reply goes only to the supplied sender. Checkout/payout/legal HOLDs remain. Test accounts retain their current flags and records.

## Preparation evidence

Cache: playwright/.cache/phase27-08/contact-inquiry-6bb-20261013/. It contains nonsecret platform/control read-backs, source export proof, the prepared unsent form screenshot, verified sending-domain snapshot, authority/POST-budget/watchdog/cleanup guards and offline test output. The stage and watchdog helpers refuse prepared authority before any live action. These are preparation/simulation proofs, not a deployed inquiry or receipt.

The initial sandboxed CLI read failed, then the authorized read-only CLI fallback succeeded. The initial Windows archive-module export failed before any deployment; the corrected export copies only the1113 hash-matched accepted source files and validates the archive separately. No application code, external configuration, Contact POST, email or account was changed during preparation.

Approval needed because the existing cutover scope states: “Public enablement and one reply-capable inquiry/receipt/Reply-To/reply require their own recorded scope.” Current owner instruction keeps Contact disabled; this packet authorizes only the guarded temporary trial and its exact cleanup, with disabled recovery afterward.

Approval phrase: **Approve this exact four-POST Contact inquiry and reply packet.**
