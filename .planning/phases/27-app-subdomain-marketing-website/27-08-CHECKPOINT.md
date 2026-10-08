---
phase: 27-app-subdomain-marketing-website
plan: "08"
status: awaiting-human
plan-status: incomplete
subsystem: domains-auth-marketing
tags: [nextjs, playwright, host-isolation, hydration, cutover-evidence]
requires:
  - phase: 27-01-through-27-07
    provides: Shared origins, host routing, checked app entry, six marketing pages and disabled Contact
provides:
  - Real local 51-case integrated marketing and app journey verification
  - Hydration readiness and configured-app session redirect repairs
  - Current read-only inventory, reversible cutover packet and fail-closed evidence validator
affects: [phase-27-review, phase-27-live-cutover]
tech-stack:
  added: []
  patterns: [stable hydration snapshot, exact configured authority redirects, prepared/deployed/live evidence separation]
key-files:
  created: [e2e/marketing-host-matrix.spec.ts, src/app/start-hosting/loading.tsx, scripts/verify-phase27-evidence.mjs, 27-ENGINEERING-EVIDENCE.md, 27-DEPLOYMENT-INVENTORY.md, 27-CUTOVER-PACKET.md]
  modified: [e2e/marketing-journeys.spec.ts, e2e/marketing-contact.spec.ts, src/proxy.ts, src/lib/session-check.ts, src/components/marketing/hosting-intent.tsx, src/components/marketing/contact-form.tsx, src/components/marketing/header.tsx]
key-decisions:
  - Final local browser success does not waive failed full unit/design acceptance.
  - Contact remains disabled until deployment-wide original-client controls and global mailbox budget are verified.
  - Task 3 requires actual human/account authority; sleeping-user autonomy does not approve it.
  - Checkout, payout and legal HOLD remain immutable.
requirements-completed: []
completed-tasks: [2]
prepared-tasks: [1, 2]
pending-task: 3
checkpoint-date: 2026-10-09
duration: 95 min observed gate window; preparation began earlier
plan_head_before: 1afc5fc3b48d27bd292bbe96ecc11abe2944862a
actuals:
  tokens: 30422
  tasks: 1
  commits: 2
  measurement: Diff-size token estimate, not model token consumption; 121686 realized diff characters divided by four, rounded up, measured before checkpoint artifact commit
---

# Phase 27 Plan 08: Partial integration and cutover checkpoint

**All 52 latest local browser cases pass after integration and review fixes; eight unit and nine design baseline assertions remain failed, and the concrete cutover packet awaits human/account prerequisites.**

This is an incomplete checkpoint artifact. The plan SUMMARY must remain absent because the execution initializer treats its existence as completion. Task 1 engineering preparation is committed, but its full-suite acceptance criterion is unmet. Task 2 preparation is complete. Task 3 is blocking-human and has not been approved. No phase requirement, deployment, live inquiry or inbox receipt is marked complete. STATE, ROADMAP and REQUIREMENTS were not edited by this executor.

## Task results and commits

| Task | Result | Commit |
|---|---|---|
| 1: local host, journey and responsive contract | Prepared and repaired; final local browser/types/lint/build pass. Full unit/design remain failed with exact baseline/dirty-source dispositions. | `852bcc3dd5e98f228e7a1ce1ada465ba3f9e8768` |
| 2: current inventory and reversible packet | Complete prepared-stage packet and offline validator. Unknown external facts remain explicit. | `f3defb50f516f9cb07bed982c41e18ff0d62ae31` |
| 3: account evidence and exact packet authority | Pending blocking-human checkpoint. | None |

Parent orchestrator performed the narrow commits because .git was read-only to the executor. Task 1 contains only the reviewed 23-path patch plus the new matrix and loading file; unrelated dirty search, validation, wizard/map, money and workflow edits were preserved. The ledger base above and two commits were measured from Git, not inferred. No tracked deletions occurred. The diff-size token estimate uses the same chars/4 scale as the plan estimate, is not actual model token consumption, and excludes this later checkpoint artifact patch.

## Verification

All full gates ran alone in prescribed order. The final UI-only HostingIntent readiness repair then received focused unit/real-browser checks and final full types/lint/build/owned-browser checks, sequentially. Earlier full unit/design are explicitly dated before that last UI-only repair.

| Gate | Actual result | Duration |
|---|---|---|
| Full unit, 20:39:20–20:44:38 UTC | Exit 1; 254 passed / 4 failed / 2 skipped files; 3304 passed / 8 failed / 5 skipped tests | 318.751s |
| Full design, 20:48:47–20:50:01 UTC | Exit 1; 83 passed / 7 failed files; 1497 passed / 9 failed / 6 skipped tests | 73.295s |
| Final source typecheck, 21:03:50–21:04:00 UTC | Exit 0, no diagnostics | 9.164s |
| Final UI source lint, 21:04:30–21:05:05 UTC | Exit 0; 0 errors, 34 warnings | 34.793s |
| Final production build, 21:05:37–21:06:49 UTC | Exit 0, route generation complete | 72.373s |
| Final all-owned Chromium, 21:07:23–21:09:30 UTC | Exit 0, 51 passed, no skipped owned cases, normal teardown | 127.061s |

Final focused activation unit passed 10/10; real activation/SSR-security browser checks passed 2/2. Offline prepared validator exits 0 while retaining failed engineering acceptance. Deployed and live stages exit 1 for actual missing proof. In-memory probes reject changed HOLD, invented observed account facts and tampered raw-log bytes. The evidence script passes focused ESLint after its log-integrity addition. Initial negative-probe harness failure was a missing process.cwd stub, corrected without changing production code or evidence. A focused unit setup used the wrong local database role once; the corrected guarded test role passed.

The 51-case matrix includes six pages at 320/375/768/1440, Court/axe/overflow, actual screenshot decode, keyboard mobile Menu/FAQ/skip, real Link/Flight/history/refresh/manual prefetch, repeated alternating HTML/RSC authorities, private namespace/marker/authority/method/full-query boundaries, real robots/sitemap/canonical/OG, app/ops host-only sessions, Home audience CTAs, real hydrated signup/password/stale-cookie resume, explicit activation, and the actual owner-scoped draft wizard. Actual rendered marketing OG uses the approved search screenshot. Inngest dev introspection and manual dev prefetch are local protocol checks; production signed receiver and automatic prefetch/cache proof remain required.

Contact pending/deduplication/error/recovery responses are simulated browser transport. Real no-key 503 and production-default-disabled route unit cases pass. None prove mailbox delivery. Final checks explicitly use CONTACT_PRODUCTION_ENABLED=false. Earlier wrappers mistakenly used an unused CONTACT_INQUIRY_ENABLED variable; this is disclosed in engineering evidence, and the actual local production flag was absent/default-disabled. No live provider credential, provider transaction, real email or production DB was used. The production build uses inert invented noncredential markers only to satisfy existing import guards, with mail off and guarded test DB. Existing official Google Fonts fetch required the narrowly authorized network build retry.

## Repairs and deviations

- **Rule 1, real image integration defect:** optimizer internal fetch did not carry the exact trusted Host; naturalWidth was zero. Existing marketing Image calls now serve their approved screenshot sources directly with per-call unoptimized. Decode RED became GREEN without broadening asset policy.
- **Rule 1, local redirect integration:** omitted listener hostname relativized app handoffs to marketing. The failed 127 listener trial remains recorded. Documented 0.0.0.0 listener preserves configured app/marketing/ops authorities and real browser-follow proof; production behavior still requires deployed validation.
- **Rule 1, configured app auth redirects:** internal listener request.url leaked 0.0.0.0 into session-check auth redirects. Proxy/session-check use configured app origin for app-only destinations; signed-cookie and stale-cookie real password resume pass. Exact Host/cookie checks and ops separation remain intact.
- **Rule 2, native fallback security and readiness:** auth and Contact forms now explicitly POST and disable fields/submission until the stable client hydration snapshot. Menu and HostingIntent guard client-only events similarly. Enabled-control/header-readiness assertions retain real event/POST/Flight proof. No arbitrary sleep or soft retry was added.
- **Rule 3, phase census/fixture integration:** explicit new marketing/adopter/loading classifications, exact shared-origin fixture contracts and preview origin setup replace stale source-spelling/count assumptions. Email preview loader allows the four required origin keys; the send script was never executed. No assertion or financial policy was weakened.
- **Rule 3, missing async loading:** start-hosting uses the existing PanelSkeleton in its matching page frame with named status.
- **Verification correction:** WHATWG root URL comparison preserves exact origin/path/query while treating empty root and slash equivalently. Receivers independently assert exact Invalid signature 400/no redirect and method405. New listing checks the real first-step heading and owned draft, retaining the initial intermittent404 evidence.

JavaScript-disabled hosting remains at the accessible loading boundary because resolved async content is streamed behind hidden markup. The security regression inspects only that resolved disabled action markup, unchanged URL, no grant and no audit. It does not claim a usable or accessible no-JavaScript hosting journey. Native prehydration anchors are valid navigation fallback and are not misreported as broken hydration.

## Remaining acceptance blockers

Exact source/fixture provenance and counts are in 27-ENGINEERING-EVIDENCE.md, compared against phase execution base `edec99b89bffa62df9ba47b4cf85c12f96acfa3f` plus prior-phase committed and preexisting dirty changes.

- Unit: listing rate assertions disagree with preexisting dirty validation (2); execution-base fixed October1 checkout dates are expired (3); preexisting untracked slot-picker selected-class assertions disagree (2); existing payout-sweep witness excludes its booking before cancellation (1). No money/bookability predicate was changed.
- Design: pure email fixture assumes null support while execution-base site already has nonnull support (1); execution-base controlled_checkout_grant lacks a census disposition (1); preexisting dirty host wizard reaches an untracked host-location-map, moving closure21→22 (1); committed execution-base public loading raw measurements violate contract (1); execution-base progressive search overlay contributes two viewport/matchMedia and two undeclared selector failures (4); execution-base host import does not match mutation anchor (1). Marketing Contact cannot enter the four-tree host closure. None were silently waived.

Initial full browser46 failed8, interim49 failed9, and later50 failed1 before repairs; final51 passed. Failed assertion and runtime/discovery trials remain honestly recorded. The original initial unit/design/type/lint/build raw logs were mistakenly placed in Playwright outputDir and deleted. Their bounded actual terminal results are retained as transcript evidence with digests of those strings, not fabricated raw logs. Final raw logs reside under ignored playwright/.cache/phase27-08 and are digest-checked. An interim49-case log was overwritten by the later50-case run and is explicitly transcript-only. Raw dev mail fallback logs are not tracked because they contain synthetic verification tokens.

## Blocking-human checkpoint

The exact compatibility-first app.fitout.live / fitout.live / retained ops.fitout.live packet is reviewable. Current read-only Vercel inventory confirms the two projects and deployed revisions, apex/www/ops ownership, app alias absence, relevant production/preview nonsecret origins and absent Contact switch. Provider settings, actual DNS/TLS/www policy, isolated preview account settings, distributed Contact controls and mailbox ownership remain partial/unknown. Historic Phase23 evidence is not used as current proof.

Task 3 awaits named account owners and scoped authority for the concrete reviewed SHA/actions, compatibility bridge proof, current Google/PayMongo/Didit/Inngest/Resend settings, direct old/new receiver continuity, DNS/TLS/www readback, preview isolation, rollback/monitoring operators, global Contact control and mailbox budget, available inbox owner and separately authorized one safe inquiry. Vercel per-region rate limits with documented plan window limits do not establish the required global 15-minute original-client policy or mailbox budget. Contact stays disabled. An existing ops share-link bypass appeared in an initial raw read-only response; the packet assigns its invalidation to the account owner. No credential value is retained here or used/revoked by the executor.

Central independent code/security re-review is clean, with all four original findings closed. No exact approved deployed SHA, deployed high-threat-clear evidence, cutover approval, inquiry authority, inbox receipt, Reply-To or reply observation exists. Checkout, payout and legal HOLD are unchanged. Resume only after the actual blocking-human prerequisites are resolved; this checkpoint must not advance plan/phase completion.

## Known stubs and threat surface

No new product placeholder or unwired implementation stub was introduced. External facts are deliberately unknown, not stubs or live proof. No endpoint/schema/migration/provider registration or new financial event was added. Existing auth and form trust surfaces were repaired within explicitly authorized scope. Central re-review closes the four code findings; deployed threat evidence and the deployed matrix remain pending.

## Review-fix provenance boundary

The review identified CR-01 and WR-01/02/03. Customer capability activation now checks the
database's eligible role inside the same serialized role-policy authority as staff conversion;
Contact transport/body-read errors report uncertainty with values retained. Evidence now requires
a versioned distinct deployed matrix and typed runner/log consistency. Historical full unit/design
failures remain failed. The historical six gates have explicitly unavailable source provenance:
no manifest/revision was captured at execution time, so they cannot prove clean or deployed source.
New review-fix checks capture the preserved dirty working-tree manifest before execution. Their
results and exact source context are appended separately, preserving the historical record.
Central independent re-review closes the four code findings; all external readback/authority/control/inbox facts remain pending.
Plans 08/09 are incomplete; no requirement or release HOLD advances through this report.

The review-fix verification is recorded separately in 27-ENGINEERING-EVIDENCE.md:
147 focused security/contact/staff tests and 87 final structural fixtures pass; types
exit0, full lint zero errors/34 existing warnings, canonical production build 46/46
routes and 52 owned Chromium cases pass. Actual tsc emitted no stdout/raw file and its
captured source03/terminal metadata are disclosed. Four failed build attempts retain
their specific wrapper/font/stale-generated-types/inert-marker dispositions. Only the
two confirmed ignored stale development type files were removed, with canonical typegen.

Final Chromium exited0 after 243.3270778s with assisted Windows teardown: root verified
and stopped only the owned Next descendants after all 52 cases passed. An unattributed
Next dev streaming TypeError (digest2206780199) occurred between successful cases 47/48;
no route/action/source frame is available in the log. Independent review assessed
this bounded observation without establishing an actionable defect; the report does not claim an error-free runtime.

Pre-gate source snapshots bind each new retained log to the preserved dirty shared
checkout, including public assets/configuration and preexisting changes. Final build
and browser useHEAD 9859a5c plus dirty manifests; these do not establish a clean/deployed
candidate SHA. Historical full unit 8/design 9 failures and absent historical captures
remain unchanged. Independent re-review closes all four code findings; the blocking
external account/control/inbox/approval prerequisites above still apply. Contact/mail
were off; no live release, financial-policy change, requirement check or 08 SUMMARY exists.

## Self-Check: PASSED

All seven created artifacts and both recorded task commits exist. Prepared validation passes. This confirms checkpoint artifact integrity, not plan completion or live acceptance.
