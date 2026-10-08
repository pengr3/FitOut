---
phase: "27"
slug: "app-subdomain-marketing-website"
status: planned
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-08"
planned: "2026-10-09"
---

# Phase 27 — Final Planned Validation Map

Nine plans / nine sequential waves / 24 tasks. Planning coverage is complete; no implementation,
test run, capture, production setting or inbox result is claimed. `nyquist_compliant` and
`wave_0_complete` stay false until execution creates and proves the scaffolds. No framework,
runtime dependency, schema change or schema push is planned.

## Infrastructure and execution rules

Use installed Node CLIs: Vitest 4.1.8, Testing Library and Playwright 1.60.0. Main Vitest requires
the existing isolated test DB even for mocked focused specs. Design checks use vitest.design.config.ts.
Browser fixtures preserve real-mail opt-out, provider opt-out and DB safety guards. Tests run in their
creation task before expansion; no watch mode. Full gates run sequentially and alone in 27-08-01.
Measure actual runtime; targeted feedback aims under 60 seconds after DB setup, with separately
recorded setup/full-gate times. Windows screenshot assets are permitted; visual baselines are not.

The initial phase had `phase_req_ids:null` / Requirements TBD. The spec-less edge fallback was
visibly skipped because no initial IDs existed; no probe result is fabricated. The seven new IDs
and explicit boundary assertions below replace ambiguity. Research date remains 2026-10-08;
plan completion date is 2026-10-09.

## Per-task verification and creation map

All rows have execution status **pending**. Each task's `<fails_when>` names its concrete failure
signal. `V` below means the literal prefix `node node_modules/vitest/vitest.mjs run`; `D` means
`node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts`; `P` means
`node node_modules/@playwright/test/cli.js test`. Expand these prefixes verbatim when executing.

| Task | Plan / wave | Requirements | Threats | Exact command suffix / command | New test/script creation; key failure signal |
|---|---|---|---|---|---|
| 27-01-01 | 27-01 / 1 | DOMAIN-01, MKT-03 | T-27-01,02 | P e2e/marketing-tracer.spec.ts --project=chromium | Creates that spec; host/namespace/search/tab mismatch fails. |
| 27-01-02 | 27-01 / 1 | DOMAIN-01, DOMAIN-02 | T-27-01,02,03 | V tests/auth/marketing-host-routing.test.ts tests/auth/ops-host-routing.test.ts tests/auth/public-origin-callers.test.ts | Creates marketing-host-routing; existing two specs extended; matrix/campaign/receiver mismatch fails. |
| 27-02-01 | 27-02 / 2 | DOMAIN-01, DOMAIN-02 | T-27-04,05 | V tests/auth/legacy-auth-links.test.ts tests/security/safe-callback-url.test.ts tests/auth/ops-host-routing.test.ts | Creates legacy-auth-links; old code replay/token/hostile callback fails. |
| 27-02-02 | 27-02 / 2 | DOMAIN-02 | T-27-06 | V tests/auth/app-origin-continuity.test.ts tests/auth/public-origin-callers.test.ts tests/auth/email-dev-fallback.test.ts | Creates app-origin-continuity; actual rendered authority/default mail contract mismatch fails. |
| 27-02-03 | 27-02 / 2 | DOMAIN-02 | T-27-06,07 | V tests/auth/service-origin-continuity.test.ts tests/auth/marketing-host-routing.test.ts | Creates service-origin-continuity; wrong return, unsigned acceptance or paid-query mutation fails. |
| 27-03-01 | 27-03 / 3 | MKT-03, DOMAIN-02 | T-27-08,10 | V tests/auth/hosting-intent.test.tsx tests/auth/capability-activate.test.ts | Creates hosting-intent + e2e/marketing-journeys.spec.ts; GET capability write or missing checked return fails. |
| 27-03-02 | 27-03 / 3 | MKT-03, DOMAIN-02 | T-27-09 | V tests/auth/hosting-resume.test.tsx tests/security/safe-callback-url.test.ts | Creates hosting-resume; extends journeys; dropped/unsafe return or client grant fails. |
| 27-04-01 | 27-04 / 4 | MKT-02 | T-27-11,12,13 | node scripts/capture-marketing.mjs --group hero | Creates capture script/spec/helper, search.png and manifest; wrong state/unsafe fixture/PII/provenance fails. |
| 27-04-02 | 27-04 / 4 | MKT-02, MKT-01 | T-27-11,12 | node scripts/capture-marketing.mjs --group hosts | Prior script/spec; creates account/verification/listing/bookable PNGs; genuine gate/safe pixel failures fail. |
| 27-04-03 | 27-04 / 4 | MKT-02, MKT-01 | T-27-11,12 | node scripts/capture-marketing.mjs --group players; then D tests/design/marketing-assets.test.ts | Creates session/booking PNGs and asset spec; absent/hash/PII/generated-image failure fails. |
| 27-05-01 | 27-05 / 5 | MKT-01, MKT-02, MKT-03 | T-27-15,16 | D tests/design/marketing-shell.test.tsx | Creates shell spec; order/keyboard/legal authority/session dependency fails. |
| 27-05-02 | 27-05 / 5 | MKT-01, MKT-02 | T-27-14,15,16 | D tests/design/marketing-home.test.tsx tests/design/marketing-assets.test.ts | Creates Home spec; wrong audience link/image/canonical/fact fails. |
| 27-05-03 | 27-05 / 5 | MKT-01, MKT-02, MKT-03 | T-27-14,15 | D tests/design/marketing-audiences.test.tsx tests/design/marketing-assets.test.ts | Creates audience spec; step/image/CTA/gate/signup-first mismatch fails. |
| 27-06-01 | 27-06 / 6 | MKT-01 | T-27-17 | D tests/design/marketing-about.test.tsx | Creates About spec; unsupported fact/missing audience connection fails. |
| 27-06-02 | 27-06 / 6 | MKT-01 | T-27-17 | D tests/design/marketing-faq.test.tsx tests/design/legal-copy.test.ts | Creates FAQ spec; order/keyboard/legal/payment claim fails. |
| 27-06-03 | 27-06 / 6 | MKT-01, DOMAIN-01 | T-27-18 | D tests/design/marketing-metadata.test.ts | Creates metadata spec; app/internal URL leak, preview indexing or missing destination fails. |
| 27-07-01 | 27-07 / 7 | CONTACT-01, DOMAIN-01 | T-27-19,20,21,22 | V tests/contact/contact-route.test.ts tests/auth/email-dev-fallback.test.ts tests/auth/email-injection.test.ts | Creates route spec; Origin/bounds/equality/injection/dev-success/PII leakage fails. |
| 27-07-02 | 27-07 / 7 | CONTACT-01, MKT-01 | T-27-23 | V tests/contact/contact-form.test.tsx | Creates form spec; field/order/data loss/duplicate pending/nonaccepted success fails. |
| 27-07-03 | 27-07 / 7 | CONTACT-01 | T-27-20,22,23 | V tests/contact/contact-mail.test.ts tests/auth/email-injection.test.ts; then P e2e/marketing-contact.spec.ts --project=chromium | Creates mail + browser specs; encoding/default Reply-To/retained errors/no-key success failure fails. |
| 27-08-01 | 27-08 / 8 | All seven | T-27-24 | Full gates listed below | Creates e2e/marketing-host-matrix.spec.ts; extends journeys; full-gate/host/RSC/cache/session/accessibility failure fails. |
| 27-08-02 | 27-08 / 8 | DOMAIN-03, CONTACT-01 | T-27-25,26 | node scripts/verify-phase27-evidence.mjs --stage prepared | Creates script + ENGINEERING-EVIDENCE/DEPLOYMENT-INVENTORY/CUTOVER-PACKET; missing owner/current value/rollback or inferred proof fails. |
| 27-08-03 | 27-08 / 8 | DOMAIN-03, CONTACT-01 | T-27-25,26 | node scripts/verify-phase27-evidence.mjs --stage prepared + account-authority checkpoint | Prior script; missing approval/control/access or contradicted target prevents resume. |
| 27-09-01 | 27-09 / 9 | All seven | T-27-21,27,28,29 | node scripts/verify-phase27-evidence.mjs --stage deployed | Creates 27-EVIDENCE.md, updates inventory/packet; unknown live host/provider/control/revision/rollback fails. |
| 27-09-02 | 27-09 / 9 | All seven | T-27-23,28,29,30 | node scripts/verify-phase27-evidence.mjs --stage live + actual inbox/reply checkpoint | Prior script + actual recorded owner evidence; missing receipt/reply/provider/global control or high threat fails. |

27-08-01 full gates, each started only after the prior finishes:

1. `node node_modules/vitest/vitest.mjs run`
2. `node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts`
3. `node node_modules/typescript/bin/tsc --noEmit`
4. `node node_modules/eslint/bin/eslint.js .`
5. `node node_modules/next/dist/bin/next build`
6. `node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts --project=chromium`

## Explicit behavioral boundaries

- Host: full configured authority only; app/marketing/ops distinct; wrong port/lookalike/unknown/forwarded authority cannot select app; ops server guards and cloak stay authoritative.
- Paths/methods: direct /marketing denied; legacy GET/HEAD uses 307 with all queries; unsafe legacy mutations denied; signed PayMongo/Didit/Inngest methods remain direct old/new exceptions.
- Root query: current serialized category/lat/lng/partySize/locationLabel and known substantive legacy search keys distinguish app search; page/sort/relax/_rsc/tracker-only queries do not misclassify marketing.
- Auth: exact issued /api/auth/verify-email and /api/auth/reset-password/:token bridges; checked callbacks; old OAuth restarts; no cross-domain cookie/state migration; hosting activation never on GET.
- UI/assets: six separate URLs; Court/B equal audience Home; four host/three player real captures; safe isolated fixtures, date validity, hash/provenance and pixel review; no generated/stock/invented screenshot imports.
- Contact: exact fields/server equality/bounds; fixed destination and sender headers; escaping; accepted Resend only; no development success; retained errors; verified production-wide control before enablement.
- Release: code/mocks/prepared packets do not prove deployment or inbox; current external read-back and real receipt/reply required; payment/payout/legal HOLD untouched.

## Source audit — all four required source types

Status COVERED means executable scope is planned, not already shipped.

| Source | ID / item | Plans | Status |
|---|---|---|---|
| GOAL | Existing app moves to app; marketing explains product and getting started | 01–09 | COVERED |
| GOAL | App sign-in/host/search/booking and ops isolation | 01,02,03,08,09 | COVERED |
| GOAL | Six usable desktop/mobile/keyboard destinations | 05,06,07,08,09 | COVERED |
| GOAL | Honest About/FAQ/Contact and accurate readiness claims | 05,06,07,08,09 | COVERED |
| GOAL | Legacy compatibility and both origins/deployment proof | 01,02,08,09 | COVERED |
| REQ | MKT-01 | 04,05,06,07,08,09 | COVERED |
| REQ | MKT-02 | 04,05,08,09 | COVERED |
| REQ | MKT-03 | 01,03,05,08,09 | COVERED |
| REQ | CONTACT-01 | 07,08,09 | COVERED |
| REQ | DOMAIN-01 | 01,02,06,07,08,09 | COVERED |
| REQ | DOMAIN-02 | 01,02,03,08,09 | COVERED |
| REQ | DOMAIN-03 | 08,09 | COVERED |
| CONTEXT | D-01 six separate pages/order | 01-02,05-01,06-01/02,07-02 | COVERED |
| CONTEXT | D-02 Hosts/Players labels | 01-02,05-01 | COVERED |
| CONTEXT | D-03 Players-first stacked expandable FAQ | 06-02 | COVERED |
| CONTEXT | D-04 separate Open App | 01-01,05-01 | COVERED |
| CONTEXT | D-05 Court sports energy | 05-01/02/03 | COVERED |
| CONTEXT | D-06 selected B/equal audiences/marketing entries | 05-02 | COVERED |
| CONTEXT | D-07 no generated assets | 04-01/03,05-02 | COVERED |
| CONTEXT | D-08 actual safe screenshots | 04-01/02/03,05-02/03 | COVERED |
| CONTEXT | D-09 four actual host steps/gates | 04-02,05-03 | COVERED |
| CONTEXT | D-10 checked host setup through auth | 03-01/02,05-03 | COVERED |
| CONTEXT | D-11 three genuine player steps | 04-01/03,05-03 | COVERED |
| CONTEXT | D-12 anonymous search first | 03-01,05-03,08-01 | COVERED |
| CONTEXT | D-13 primary Contact form | 07-01/02 | COVERED |
| CONTEXT | D-14 exact fields/equality | 07-01/02 | COVERED |
| CONTEXT | D-15 actual SUPPORT_EMAIL delivery/recovery | 07-01/02/03,08-02/03,09-01/02 | COVERED |
| CONTEXT | D-16 app/apex split/ops retained | 01-01/02,02-01/02/03,08,09 | COVERED |
| CONTEXT | D-17 automatic known old links and callback policy | 01-02,02-01/03,08,09 | COVERED |
| CONTEXT | D-18 same-tab handoffs | 01-01,03,05-01/03,08-01,09-01 | COVERED |
| CONTEXT | D-19 delegated accurate copy | 05-02/03,06-01/02 | COVERED |
| CONTEXT | D-20 bridging-gaps About/confirmed facts | 06-01 | COVERED |
| RESEARCH | One customer deployment, distinct namespace, exact local/preview/unknown policy | 01,06,08,09 | COVERED |
| RESEARCH | Purpose-specific origin promotion and app compatibility aliases | 01-01,02-02 | COVERED |
| RESEARCH | Legacy routes/legal/search collisions/full query/method constraints | 01-02,02-01/03,06-03 | COVERED |
| RESEARCH | Host intent outside gated layout, checked login/signup/social resume, no GET write | 03 | COVERED |
| RESEARCH | Exact Contact bounds/escaping/replyTo/defaults/real acceptance/errors | 07 | COVERED |
| RESEARCH | Trusted ingress, bounded Map limitation, verified WAF/global control or release gate | 07-01,08-02/03,09 | COVERED |
| RESEARCH | Host-only auth, old OAuth restart, issued reset/verify bridge | 02-01,03-02,08/09 | COVERED |
| RESEARCH | Email/metadata/notifications/browser returns and direct signed service continuity | 01-02,02-02/03,06-03,08/09 | COVERED |
| RESEARCH | Genuine dates/safe demo screenshots/licensing/PII provenance | 04,05 | COVERED |
| RESEARCH | Next Link/RSC/cache/resource partition | 01,05,06-03,08-01,09-01 | COVERED |
| RESEARCH | Installed Node CLIs, isolated DB, sequential gates/no Windows baselines | 01,04,07,08 | COVERED |
| RESEARCH | Fresh external inventory, compatibility-first cutover/rollback/real receipt | 08,09 | COVERED |
| RESEARCH | No new dependency/schema; retired payout-connect not revived; release HOLD | 01–09 | COVERED |

Deferred helpdesk/mailbox/app backlog, broader money release and other phases' requirements are
excluded by the phase boundary. No required item is missing. API disposition is in COVERAGE.md;
assumption-delta promotion is recorded in 27-01; schema push is inapplicable; absent UI-SPEC does not
block this run (existing hook: frontend:false, hasUiSpec:false, block:false). Locked Court/responsive
contracts are explicit in 27-04/05/06/08.

## Account-only proof and sign-off

Automate accessible account read-back before asking for unavailable observations. Live inventory,
Google state/TLS cookies, WAF/global Contact control and actual inbox arrival/reply are external
facts, each mapped to 27-08/09 and required by the staged evidence script. Unknown rows fail the
relevant deployed/live stage; real receipt is required even when Resend acceptance succeeds.

- [x] All 31 automated commands across 24 tasks have specific paired failure signals; `node .claude/gsd-core/bin/gsd-tools.cjs check verify-failure-directions 27 --raw` returned 31 commands, zero blockers and zero warnings on 2026-10-09. This checks plan text only; no application verification command ran.
- [x] Every future test/script has an explicit creation task and later dependency.
- [x] All seven requirements and all 30 threats have mapped validation.
- [x] All D-01–D-20 decisions are explicitly cited in executable plans.
- [x] Full gates are sequential; no watch/baseline regeneration.
- [ ] Independent plan-checker review complete.
- [ ] Execution scaffolds created and verification runtimes measured.
- [ ] All engineering gates passed with actual outputs.
- [ ] Current deployed/provider/control evidence and real inbox/reply observed.

**Approval:** Pending independent plan-checker. No implementation or live validation has run.
