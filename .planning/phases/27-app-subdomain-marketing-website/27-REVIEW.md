---
phase: 27-app-subdomain-marketing-website
reviewed: 2026-10-08T22:21:39Z
depth: standard
depth_source: active-config-no-overrides
files_reviewed: 81
files_reviewed_list:
  - ".env.example"
  - "e2e/helpers/marketing-fixtures.ts"
  - "e2e/marketing-captures.spec.ts"
  - "e2e/marketing-contact.spec.ts"
  - "e2e/marketing-host-matrix.spec.ts"
  - "e2e/marketing-journeys.spec.ts"
  - "e2e/marketing-tracer.spec.ts"
  - "playwright.config.ts"
  - "public/marketing/screenshots/manifest.json"
  - "scripts/capture-marketing.mjs"
  - "scripts/send-email-previews.ts"
  - "scripts/verify-phase27-evidence.mjs"
  - "src/app/(auth)/login/page.tsx"
  - "src/app/(auth)/signup/page.tsx"
  - "src/app/actions/auth.ts"
  - "src/app/actions/booking.ts"
  - "src/app/api/contact/route.ts"
  - "src/app/layout.tsx"
  - "src/app/marketing/about/page.tsx"
  - "src/app/marketing/contact/page.tsx"
  - "src/app/marketing/faq/page.tsx"
  - "src/app/marketing/hosts/page.tsx"
  - "src/app/marketing/layout.tsx"
  - "src/app/marketing/page.tsx"
  - "src/app/marketing/players/page.tsx"
  - "src/app/marketing/robots.ts"
  - "src/app/marketing/robots.txt/route.ts"
  - "src/app/marketing/sitemap.ts"
  - "src/app/start-hosting/loading.tsx"
  - "src/app/start-hosting/page.tsx"
  - "src/components/marketing/audience-steps.tsx"
  - "src/components/marketing/contact-form.tsx"
  - "src/components/marketing/faq.tsx"
  - "src/components/marketing/footer.tsx"
  - "src/components/marketing/header.tsx"
  - "src/components/marketing/hosting-intent.tsx"
  - "src/lib/app-origins.ts"
  - "src/lib/auth.ts"
  - "src/lib/contact.ts"
  - "src/lib/email.ts"
  - "src/lib/host-route-policy.ts"
  - "src/lib/legacy-auth-links.ts"
  - "src/lib/safe-callback-url.ts"
  - "src/lib/session-check.ts"
  - "src/lib/validation/contact.ts"
  - "src/lib/verification/providers/didit.ts"
  - "src/proxy.ts"
  - "tests/auth/app-origin-continuity.test.ts"
  - "tests/auth/email-injection.test.ts"
  - "tests/auth/hosting-intent.test.tsx"
  - "tests/auth/hosting-resume.test.tsx"
  - "tests/auth/legacy-auth-links.test.ts"
  - "tests/auth/login-reachable-after-reset.test.ts"
  - "tests/auth/marketing-host-routing.test.ts"
  - "tests/auth/ops-host-routing.test.ts"
  - "tests/auth/ops-response-gateway.test.ts"
  - "tests/auth/public-origin-callers.test.ts"
  - "tests/auth/secret-config.test.ts"
  - "tests/auth/service-origin-continuity.test.ts"
  - "tests/contact/contact-form.test.tsx"
  - "tests/contact/contact-mail.test.ts"
  - "tests/contact/contact-route.test.ts"
  - "tests/design/brand-recipe.test.ts"
  - "tests/design/elevation-z.test.ts"
  - "tests/design/email-preview-harness-env.test.ts"
  - "tests/design/loading-coverage.test.ts"
  - "tests/design/marketing-about.test.tsx"
  - "tests/design/marketing-assets.test.ts"
  - "tests/design/marketing-audiences.test.tsx"
  - "tests/design/marketing-faq.test.tsx"
  - "tests/design/marketing-home.test.tsx"
  - "tests/design/marketing-metadata.test.ts"
  - "tests/design/marketing-shell.test.tsx"
  - "tests/design/ops-host-invariants.test.ts"
  - "tests/design/scaffold-residue.test.ts"
  - "tests/helpers/email-fixtures.ts"
  - "src/app/actions/capability.ts"
  - "src/lib/ops/grant.ts"
  - "tests/auth/capability-role-policy.test.ts"
  - "tests/scripts/phase27-evidence.test.mjs"
  - "tests/scripts/fixtures/phase27-evidence.mjs"
diff_base: edec99b89bffa62df9ba47b4cf85c12f96acfa3f
candidate_revision: c66db10fecb07b9db296f255c02cddb424e5e939
original_review_revision: 78d44adfe1f8db83a47177482f54a13926a2481b
original_candidate_revision: e9b5dfc8ee14c4e604021fed87bbeda8195412db
review_iteration: 2
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
closed_findings:
  critical: 1
  warning: 3
  total: 4
status: clean
status_scope: code-review-only
structural_prepass: disabled
source_modified: false
gates_rerun: false
saved_evidence_validation: prepared-pass
validation_provenance:
  gate_source: preserved-dirty-shared-working-tree
  clean_candidate_validation: false
  deployed_candidate_validation: false
  focused_security_contact_staff: "147 passed in 9 files"
  evidence_fixtures: "87 passed; previous captured run 86 passed"
  owned_chromium: "52 passed; assisted Windows teardown"
  browser_runtime_error: "Unattributed Next streaming TypeError; digest 2206780199"
  types_lint_build: passed
  lint_warnings: 34
  full_unit: "8 failed; historical baseline dispositions retained"
  full_design: "9 failed; historical baseline dispositions retained"
external_status:
  cutover_authority: pending
  candidate_deployment_proven: false
  contact_production_enabled: false
  live_inbox_proven: false
  checkout: HOLD
  payout: HOLD
  legal: HOLD
phase_completion: not-established
requirements_completion: not-established
---

# Phase 27: Code Review Report

**Reviewed:** 2026-10-08T22:21:39Z
**Depth:** standard
**Status:** clean — zero active code-review findings after independent re-review.

## Narrative Findings (AI reviewer)

### Final assessment and scope

All four original findings are closed. No new actionable correctness, security or test-reliability defect was established in the reviewed fixes and their call chains. This conclusion is limited to source review and the saved evidence; it does not approve deployment, complete Phase 27 or satisfy its pending external requirements.

The original 76-file review scope remains intact. Re-review adds the authoritative capability action, staff role authority and three new evidence/policy test files, for 81 explicit files. The unchanged portions inherit the original standard-depth review; updated code was checked against fix commits `4a95c5a`, `ee6fa72`, `d8d77c2`, `c22f3d6`, `821af3f` and `9859a5c`, with final reviewed HEAD `c66db10fecb07b9db296f255c02cddb424e5e939`. The original report is preserved at `78d44adfe1f8db83a47177482f54a13926a2481b`. Unrelated dirty edits, including booking-action hunks, remain excluded from attribution. No source, state, requirement, readiness predicate or external account was modified by this reviewer.

The reviewed areas include exact host/port partitioning and app/marketing/ops isolation; callbacks, legacy tokens and host-only session bridging; direct signed receivers; client hydration; metadata/RSC/cache boundaries; Contact validation, trusted-IP selection, rate controls, default-off behavior, provider acceptance and PII handling; fixture integrity and cutover evidence. Installed Next.js Proxy and metadata guides were consulted during the original review. Re-review did not introduce a new interpretation of those APIs.

### Validation and unresolved external limits

The reviewer inspected the fix report, engineering supplements, source, tests, retained browser log and evidence validator. A narrow read-only `--stage prepared` invocation loaded the actual saved logs and source snapshots and passed consistency validation: “engineering=failed gates retained; external approval=pending.” No unit, design, build, lint or browser gate was rerun by this reviewer.

Recorded fix validation establishes the tested shared working-tree state:

- 147 focused security/contact/staff tests passed, including guarded local PostgreSQL lock races in both acquisition orders.
- The final evidence fixture run passed 87 cases; the preceding captured run passed 86.
- TypeScript passed; its empty-output terminal metadata and source snapshot remain explicit rather than inventing a raw log.
- ESLint passed with zero errors and 34 retained warnings; the final canonical production build compiled, typechecked and generated 46/46 routes plus Proxy.
- All 52 owned Chromium cases passed. The Windows runner required verified teardown of its owned Next descendants. This was assisted teardown.
- A Next development streaming `TypeError: controller[kState].transformAlgorithm is not a function`, digest `2206780199`, appears between successful browser cases 47 and 48. The retained log supplies only ignored frames, without route/action/source attribution. It is disclosed and does not support a new concrete source finding. Passing tests do not establish an error-free runtime.

All recorded gates ran in the preserved dirty shared checkout. Captured source manifests bind later supplements to that dirty state; they do **not** establish clean candidate or deployed SHA validation. Final build/browser used HEAD `9859a5c` plus captured preexisting edits. Later documentation commits do not convert those results into clean-SHA proof. Historical six-gate execution-time source captures remain honestly unavailable; the eight full-unit and nine full-design failures remain failed with their existing dispositions. Earlier failed build attempts remain retained, rather than being replaced with the final successful build.

Actual account readback, approved candidate deployment, signed-provider continuity, production cache/preview isolation, distributed Contact controls and live mailbox receipt/Reply-To/reply remain pending. Production Contact remains disabled. Simulated response acceptance tests do not establish provider or inbox acceptance. Checkout, payout and legal HOLD remain unchanged. Plans 08/09 and the seven requirements are not marked complete by this report.

### Original finding history and final closure

These are **closed historical findings**, not active issues. Their original classifications, failure evidence and minimum remediation are retained here so the final clean status does not erase the review history.

#### CR-01 — BLOCKER — New hosting entry permits staff to regain a customer capability — CLOSED

**Original location:** `src/app/start-hosting/page.tsx:9-21`, calling `src/app/actions/capability.ts`. The page offered activation to a staff identity, and the action authorized any session user ID before unconditionally setting `canHost=true`. An isolated source probe rendered the offer for a synthetic staff session and captured a successful capability write. This violated OPS-11 staff/customer separation and exposed a conversion race.

**Fix commit:** `4a95c5acad27159047c5d0cef61903c7791c131b`.
**Re-reviewed authority:** `src/app/start-hosting/page.tsx:10-12`; `src/app/actions/capability.ts:55-66`; `src/lib/ops/grant.ts:227-239`.

The page rejects ineligible roles before its existing-host redirect. Both hosting and booking activation acquire the existing `fitout:staff-role-policy` transaction advisory lock, reread the authoritative database role, require positive `DEFAULT_ROLE` eligibility and condition the update on that role. Exactly one returned row is required for success. A stale customer session over a staff database identity, missing/unknown role or zero-row update cannot succeed. Existing capability coexistence, rate limits and allow/deny audits remain intact.

Every staff grant/conversion/revoke transaction takes the same lock before resolving role/capability state. Invitation acceptance holds its invitation lock before calling the role authority for a private new identity; the reviewed call chain contains no reverse policy-to-invitation acquisition. Conversion cannot finish with staff capabilities restored by a waiting activation, and ordinary granting refuses an already activated customer. Semantic tests assert actual backend lock waiting and final persisted roles/capabilities in both race orders, rather than relying only on timing. No `deriveBookable` change or production account mutation is involved.

**Closure:** The original bypass and identified race are closed.

#### WR-01 — WARNING — Contact reports definite non-delivery after an ambiguous response failure — CLOSED

**Original location:** `src/components/marketing/contact-form.tsx:38-39,59`. A rejected transport or JSON-body read asserted “Your message has not been sent,” although provider acceptance could precede a lost response. The minimum fix was uncertainty wording with values/recovery retained.

**Fix commit:** `ee6fa72a386b1506cb9aea301db60b41faea68b9`.
**Re-reviewed location:** `src/components/marketing/contact-form.tsx:59`.

Transport/body exceptions now say delivery could not be confirmed. The component keeps the entered values and allows recovery; definite success still requires HTTP 200 plus boolean `ok:true`. Unit coverage and the added browser case simulate server acceptance followed by an unreadable response and assert uncertainty, retained values and no success state. Those cases deliberately do not claim a real sent inquiry.

**Closure:** The incorrect certainty claim is closed.

#### WR-02 — WARNING — Deployed evidence accepts repeated rows in place of the required matrix — CLOSED

**Original location:** `scripts/verify-phase27-evidence.mjs:86-88` in the original revision. Twelve duplicated `app-home-only` rows passed deployed acceptance while omitting required host/session/provider/control coverage. The original in-memory probe returned exit 0 with only one unique matrix ID.

**Fix commit:** `d8d77c29bdf37028a4dc054ca1c55c6f2ef99e6f`.
**Re-reviewed contract/checks:** `scripts/verify-phase27-evidence.mjs:16-40,228-258`.

Version 1 enumerates 35 required scenario IDs. Validation rejects duplicate, unknown and missing IDs; requires successful typed scenario/outcome/proof fields and valid UTC observation timestamps; checks exact scenario host, URL path and method; and binds rows to distinct customer, ops and isolated-preview deployment identities and candidate revisions. Preview cannot substitute a production origin. Direct receivers on both old and target hosts, callback/token/session continuity, staff denial, RSC/cache, metadata, Contact controls and rollback all have required coverage.

Focused fixtures retain the original duplicate exploit as a negative case and test every missing ID, unknown substitutions, field/date errors, candidate mismatches and preview substitution. Their positive complete matrix is explicitly synthetic. Expected/observed descriptions and proof references remain supplied observations; structural validation does not certify their authenticity.

**Closure:** The duplicate/incomplete matrix acceptance defect is closed.

#### WR-03 — WARNING — Gate pass labels can contradict retained failing evidence — CLOSED

**Original location:** `scripts/verify-phase27-evidence.mjs:35-60,82-84` in the original revision. Labels could be changed to `pass/0` while the verified raw log and saved bounded result still reported eight unit failures. Deployed/approved SHA equality also omitted the source context actually tested.

**Fix commits:** `c22f3d61c9b63ea4838c7cfa88e5c165085841d8`, `821af3f74340f4c785985797299b41bf02eecbdb`, `9859a5ceb35267e8a5236694a9f06ad17354417d`.
**Re-reviewed parsers/provenance:** `scripts/verify-phase27-evidence.mjs:66-118,134-203`.

Known runner summaries and typed totals are derived from retained bytes and compared with the supplied gate fields. Failure totals or failed bounded results cannot coexist with a pass label. Next build parsing retains failures after compilation, including typecheck failure. UTC start/end ordering, elapsed durations and sequential gate ordering are checked. Original and supplemental gates undergo the same summary/source consistency checks.

Captured source records include revision, dirty state and sorted scoped file/digest manifests. Persisted snapshot references are workspace-contained; their actual byte hashes and recorded contexts are checked before validating the full manifest. Deployed/live validation rejects unavailable historical capture or dirty/contradictory source claims. No historical manifest has been retroactively reconstructed. The packet explicitly retains the dirty-tree warning; snapshot hashes establish byte consistency, not execution attestation or external authenticity.

Negative fixtures reject failed-log relabeling, typed-total/summary contradictions, invalid timing/source fields, manifest mismatch and persisted snapshot tampering. The saved prepared evidence validates its actual logs/snapshots while preserving historical failures and pending authority. Complete synthetic fixtures isolate themselves from real supplemental records.

**Closure:** The original contradictory pass acceptance and missing truthful source-context treatment are closed. Pending external evidence and matching deployment validation remain release gates, not reopened code-review findings.

---

_Independent final reviewer: Codex (gsd-code-reviewer)_
_Standard depth; fallow disabled; original four findings closed; zero active findings._
