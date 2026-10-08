---
phase: 27-app-subdomain-marketing-website
reviewed: 2026-10-08T21:26:47Z
depth: standard
depth_source: active-config-no-overrides
files_reviewed: 76
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
diff_base: edec99b89bffa62df9ba47b4cf85c12f96acfa3f
candidate_revision: e9b5dfc8ee14c4e604021fed87bbeda8195412db
findings:
  critical: 1
  warning: 3
  info: 0
  total: 4
status: issues_found
structural_prepass: disabled
source_modified: false
gates_rerun: false
validation_provenance:
  gate_source: preserved-dirty-shared-working-tree
  clean_candidate_validation: false
  deployed_candidate_validation: false
  owned_chromium: "51 passed"
  types_lint_build: passed
  full_unit: "8 failed; baseline dispositions retained"
  full_design: "9 failed; baseline dispositions retained"
external_status:
  cutover_authority: pending
  candidate_deployment_proven: false
  contact_production_enabled: false
  live_inbox_proven: false
  checkout: HOLD
  payout: HOLD
  legal: HOLD
---

# Phase 27: Code Review Report

**Depth:** standard  
**Status:** issues_found — one BLOCKER, three WARNING findings.

## Narrative Findings (AI reviewer)

### Scope and evidence limits

Reviewed the 76 explicit text files against the phase diff and committed candidate, with called authentication, capability and staff-policy code inspected where needed. Unrelated dirty hunks, including booking-action edits, are excluded from attribution. The baseline capability authorization gap is identified below because the new phase-owned hosting page exposes it through its advertised customer journey. The review did not modify source, run build/test gates, create a deployment, send mail, mutate an account or change readiness policy.

The existing recorded gates ran on a shared working tree with preserved prior edits. Their passing results establish that tested working-tree state; they do **not** establish a clean candidate SHA or a deployed SHA. The full unit and design failures remain recorded with baseline evidence; this report does not recast those failures as passes. Engineering evidence, deployment inventory and the cutover packet currently retain pending external conditions. Production Contact is disabled; simulated browser responses establish client behavior only. Real mailbox receipt, Reply-To/reply, deployment-wide rate controls and candidate production cache isolation remain unproved. Checkout, payout and legal HOLD remain immutable.

Installed Next.js Proxy and metadata-route guides were consulted before evaluating routing/API behavior. Review covered exact host/port partitioning; app/marketing/ops paths; direct signed receivers; callback and legacy-token continuity; session bridging; hydration; metadata, RSC/cache and namespace isolation; Contact validation, trusted-IP selection, default-off behavior, provider acceptance and PII handling; fixtures and cutover evidence. Missing external observations already declared pending are limitations, not additional code defects.

Two isolated read-only probes supplement source analysis: a mocked staff session through the actual hosting page/action, and an in-memory invocation of the actual evidence validator. Neither probe contacted a database/provider or wrote evidence/approval records.

### Critical Issues

#### CR-01: New hosting entry permits staff to regain a customer capability

**Classification:** BLOCKER  
**File:** `src/app/start-hosting/page.tsx:9-21`  
**Called evidence:** `src/components/marketing/hosting-intent.tsx:19-31`; `src/app/actions/capability.ts:43-45,58-79`; `src/lib/ops/grant.ts:232,300-310`; `src/app/(host)/host/layout.tsx`.

**Issue:** The new entry checks only whether a session exists and whether `canHost` is already true. A staff identity with `canHost=false` receives the activation component. Its server action resolves any authenticated user ID and unconditionally writes `canHost=true` on that ID. Staff credentials can establish an app-host session; host-only cookies do not restrict the identity's role. The host layout subsequently accepts the newly true capability.

This violates the existing OPS-11 separation between staff identities and customer booking/hosting capabilities: staff granting rejects customer capabilities or clears them through explicit conversion. A page-only check would leave the privileged action callable directly. It would also leave a race where staff promotion clears capabilities and an already authorized activation restores one afterward.

**Verification:** An isolated source probe supplied `{ role: "staff", canHost: false, canBook: false }`. The page rendered hosting activation, and the real action returned `{ ok: true, redirectTo: "/host" }` while its mocked database captured `{ canHost: true }`. No production account was used.

**Fix:** Reject staff on the page and enforce eligible customer roles at the authoritative capability write. Read/recheck the database role inside the transaction, serialize activation with the existing staff-role-policy advisory lock used by staff grant/conversion, and condition the update on an eligible role. A denied or zero-row update must not return success. Apply the same authoritative separation to the shared booking activation path if that helper is refactored. Preserve dual booking/hosting for eligible customers. Add focused coverage for staff page access, direct action denial and activation versus staff conversion; do not change `deriveBookable`.

### Warnings

#### WR-01: Contact reports definite non-delivery after an ambiguous response failure

**Classification:** WARNING  
**File:** `src/components/marketing/contact-form.tsx:38-39,59`.

**Issue:** Both a rejected fetch and a rejected `response.json()` reach “Your message has not been sent.” The server may already have received provider acceptance before the response connection fails, or an accepted response body may fail to decode. The client cannot infer non-delivery from either event. The definite failure claim invites another submission and can duplicate an inquiry. This is a client correctness defect; it does not claim that the currently disabled production Contact has sent mail.

**Fix:** Report uncertainty for transport/body-read failures, for example “We could not confirm whether your message was sent. Check your connection before trying again.” Keep the entered values and offer recovery. Keep definite success dependent on the accepted API response. Update the existing malformed-body and connection-failure cases to assert uncertainty, including a simulated accepted server outcome whose response cannot be read. Idempotent retry is optional additional protection, not required for the wording fix.

#### WR-02: Deployed evidence accepts repeated rows in place of the required matrix

**Classification:** WARNING  
**File:** `scripts/verify-phase27-evidence.mjs:86-88`.

**Issue:** Matrix acceptance checks only a row's status, truthy proof/date and total length of at least twelve. It checks no row identity or coverage. Twelve copies of one app-home observation satisfy “Complete deployed host/provider/control matrix” while omitting callback/session isolation, old-token continuity, direct provider receivers, RSC/cache isolation and Contact controls. Truthy booleans for rollback/Contact and an empty high-threat array do not fill those missing observations.

**Verification:** The actual validator was invoked with otherwise populated deployed-stage records entirely in memory. Twelve copies of the same `app-home-only` row yielded exit code 0 and “evidence structure validated”; the unique matrix ID count was one. Saved phase evidence was unchanged.

**Fix:** Define the required matrix rows as an explicit versioned contract derived from the phase cutover checks. Require an array of objects with unique, allowlisted scenario IDs and complete coverage; each observation must include its exact host/URL and method or scenario, expected/observed outcome, evidence reference, valid observation timestamp and candidate deployment/revision identity. Validate receiver IDs distinctly, as well as host/session/RSC/cache cases and required Contact-control observations. Reject duplicates, missing required IDs, unknown substitute IDs, wrong field types and invalid dates. Add fixture-driven checks showing duplicate app-home rows and omissions fail, while a complete distinct matrix passes. This is structural consistency checking, not a guarantee that a supplied observation is authentic.

#### WR-03: Gate pass labels can contradict retained failing evidence

**Classification:** WARNING  
**File:** `scripts/verify-phase27-evidence.mjs:35-60,82-84`.

**Issue:** The validator verifies `status` against the manually supplied `exitCode`, hashes the referenced bytes, and only requires `result` to be truthy. It never checks whether the reported outcome contradicts the bounded result or known raw gate summary. Consequently a gate can be relabeled `pass/0` while its retained summary and verified log still report failures, and the deployed-stage all-pass check accepts it. The separate deployed/approved SHA equality also says nothing about which source state the gates tested.

**Verification:** In the same in-memory probe, the engineering gate labels were set to `pass/0` while the original unit result (“8 failed”) and original raw logs/digests were retained. The actual deployed validator returned exit code 0. This is a demonstrated contradiction accepted by the checker; it is not an assertion that the current saved documents have been falsified. Current documents correctly retain failed gates.

**Fix:** Use a typed gate result with explicit passed/failed/skipped totals where applicable, and reject any failed outcome labeled `pass`. Cross-check the captured bounded terminal summary or machine-readable runner report against that result for each known runner; retain honest failure dispositions in prepared evidence and continue blocking them for deployed/live acceptance. Require valid timestamps with finish at or after start. Record the tested source context explicitly: revision, whether the tree was dirty, and a scoped manifest/digest of tested changes or equivalent captured provenance. Do not bind a dirty-tree gate to a clean/deployed SHA solely by editing a revision string. Keep the packet's warning about the preserved dirty-tree run explicit until a matching final source state has been validated. Add negative fixtures for a pass label with failed runner totals/log summary and for missing or contradictory source-context fields. Hashes establish byte integrity; this fix should not claim cryptographic proof of execution or external deployment.

### Minimum remediation and disposition

The smallest production remediation is the hosting page plus the called capability authorization transaction, and the Contact uncertainty wording. Evidence remediation belongs in `scripts/verify-phase27-evidence.mjs`, its focused fixtures, and truthful engineering/cutover provenance fields. The blocker must close before shipping the hosting entry. The three warnings should close before relying on Contact feedback or deployed/live evidence acceptance.

No external approval, rollout, real inquiry or payment/payout/legal release follows from this report. The review artifact is uncommitted for the orchestrator to handle.

---

_Reviewed: 2026-10-08T21:26:47Z_  
_Reviewer: Codex (gsd-code-reviewer)_  
_Depth: standard; fallow disabled_
