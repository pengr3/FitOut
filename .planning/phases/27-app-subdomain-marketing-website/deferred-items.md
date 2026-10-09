---
phase: 27-app-subdomain-marketing-website
status: deferred-for-planning
recorded_at: 2026-10-09T06:39:40Z
decision_source: direct-user
scope_expansion: false
repair_started: false
---

# Phase 27 deferred findings

The user decided: "let's keep the scope as is, then log findings as gaps and
we'll fix it after the execution so we could properly plan if any". Keep the
existing execution scope, continue authorized preparation, and route these
findings to later gap planning. Do not re-ask whether to expand the repair scope.
This records repair scheduling; it does not turn failed tests green, authorize
external changes, settle disputed product behavior, or complete a requirement.

## Evidence and planning boundary

The retained full unit run has **8 failures** (3304 passed / 5 skipped); the
retained full design run has **9 failures** (1497 passed / 6 skipped). These
are the October 8 runs, not fresh October 9 results. Exact attribution is in
`27-ENGINEERING-EVIDENCE.md`, "Final suite baseline attribution", against phase
execution base `edec99b89bffa62df9ba47b4cf85c12f96acfa3f` and preserved dirty work.
No assertion, date, source behavior, financial policy or baseline is changed here.
The ten entries below account for all seventeen failed assertions; related
assertions share a planning item. Determine each repair's scope and expected
behavior before promoting it to a GSD gap plan. No new phase/plan is created yet.

| ID | Failures / evidence | Finding and provenance | Decision or bounded repair to plan | Verification after repair |
|---|---|---|---|---|
| P27-G01 | Unit 2; tests/validation/listing-schema.test.ts | Assertions expect both rates; preserved dirty src/lib/validation/listing.ts accepts one. Phase 27 introduced neither policy nor assertions. | Decide the intended rate contract before changing either side; preserve existing unrelated work. | Focused schema tests, then full unit suite. |
| P27-G02 | Unit 3; tests/payments/checkout-create.test.ts | Execution-base fixture uses 2026-10-01 times; the October 8 run expires the booking before provider/error expectations. Unrelated checkout edits also exist. | Plan deterministic fixture time/clock handling while retaining expiry, authorization and payment assertions. Do not enable checkout or send provider events. | Focused checkout tests in guarded local test DB, then full unit suite. |
| P27-G03 | Unit 2; tests/availability/slot-picker-end-boundary.test.tsx | Preexisting untracked fixture expects bg-brand/15; actual selected boundary uses bg-muted/ring-brand/disabled:opacity-100. | Resolve the intended selected-boundary visual contract before editing fixture or source. Keep occupancy/bookability policy and deriveBookable untouched. | Focused boundary tests, then full unit/design suites as applicable. |
| P27-G04 | Unit 1; tests/payments/ops-cancel.test.ts | Existing sweep fixture excludes oc_b_sweep before cancellation, invalidating its expected before/after witness. Test/action/payout implementation are unchanged at execution base. | Repair the witness/setup with an explicit precondition; retain cancellation and payout safeguards. | Focused cancellation test in guarded local test DB, then full unit suite. |
| P27-G05 | Design 1; tests/design/email-shell.test.ts | Pure renderer fixture expects no mailto link without setting SUPPORT_EMAIL null; execution base already has a configured support value. Contact transport is not invoked. | Make the fixture's support configuration explicit; keep the actual monitored mailbox configuration. | Focused email-shell test, then full design suite. |
| P27-G06 | Design 1; tests/design/listing-reuse-predicate-census.test.ts | controlled_checkout_grant lacks an explicit child-table disposition; table and relationship predate Phase 27. | Plan the correct census disposition from existing schema/usage. No schema change is implied. | Focused census test, then full design suite. |
| P27-G07 | Design 1; tests/design/live-regions.test.tsx | Owned host-surface closure is 21 at execution base and 22 with the preexisting untracked host-location-map.tsx reached through the dirty wizard import. Marketing Contact is outside these trees. | Reconcile the actual owned-tree/a11y census; do not blindly widen a count or absorb unrelated wizard work. | Focused live-region test, then full design suite. |
| P27-G08 | Design 1; tests/design/loading-coverage.test.ts | Raw h-3/w-28/w-40 measurements in src/app/(public)/loading.tsx already exist at execution base. New start-hosting fallback passes. | Plan a bounded baseline loading-design repair preserving its loading behavior and design rules. | Focused loading test, then full design suite. |
| P27-G09 | Design 4; tests/design/one-tree.test.ts and selector-contract.test.ts | Execution-base progressive-search-overlay.tsx has two viewport branches, a second matchMedia call, and undeclared mobile-sheet/desktop-overlay IDs. Source/assertions are unchanged by Phase 27. | Plan the existing search component's tree/selector repair separately, including responsive behavior and existing dirty search changes. Do not weaken census assertions. | Focused tree/selector tests, relevant real responsive search browser tests, then full design suite. |
| P27-G10 | Design 1; tests/design/suspense-fallback-overlay.test.ts | Mutation expects ProfileLink, SiteChrome import; execution-base host layout imports only SiteChrome. APPLIED=false fails before the intended mutated defect is measured. | Repair the mutation target and retain the explicit applied guard, proving the test still detects the forbidden fallback. | Focused mutation test, then full design suite. |

## Additional observation for later investigation

**P27-G11:** The final 52-case Chromium run passed with an unattributed Next dev
streaming TypeError, digest2206780199, between cases47/48. Retained frames provide
no route/action/source attribution; independent re-review established no actionable
new defect. Preserve the observation and raw log. A later investigation should
reproduce and identify it before assigning a fix; do not claim an error-free
runtime or count it as an eighteenth failed assertion. Scoped assisted Windows
teardown is separately disclosed in the original evidence.

October9 update: clean-source Chromium reproduces the same streaming TypeError
with digest1244386673, and the receiver/wizard focused retries reproduce it with
digest3994520977. Both focused cases pass in ordinary Next development mode.
This supplies reproducibility evidence beyond the original dirty run; no source
stack or causal route attribution is established. Preserve all logs and inspect
the streaming lifecycle in follow-up planning; do not claim an error-free runtime.

## Additional clean-source findings on October 9

The clean committed export is additional evidence, not a rerun of the same dirty
source. Preserve the historical counts above; do not sum different-source runs
into a single suite result. Commands, timings, logs and source captures are in
27-CLEAN-SOURCE-PREPARATION.md. No repair has started.

| ID | Finding | Follow-up to plan |
|---|---|---|
| P27-G12 | Three clean unit assertions in tests/security/audit.test.ts and audit-durable.test.ts fail because their db mocks omit transaction, now required by the Phase27 capability guard. | Adapt the caller-level mocks to the authoritative transaction/role check while preserving audit-success and broken-sink assertions; run those tests and real role-policy/concurrency tests, then full unit. Do not loosen the capability guard. |
| P27-G13 | Clean unit reports ten ops-cloak-probe import SyntaxErrors plus one absent committed Phase20 partition JSON transcript. Direct Node syntax/import checks of the exported script pass; the ten import errors have no established product-source attribution. | Reproduce the export/Vitest import behavior and separately reconcile the existing partition evidence using genuine retained proof; do not invent a transcript or infer a live staff check. |
| P27-G14 | Clean typecheck has four bouldering_gym enum/vocabulary diagnostics; the network-enabled production build compiles then stops on the first. The enum already exists at the Plan08 base. | Plan vocabulary/schema-type reconciliation without changing bookability or money policy; verify typecheck and canonical production build. This tested revision cannot be deployed with the error. |
| P27-G15 | Two clean owned-browser cases cannot find the app Search spaces group although the app heading loads. The prior dirty-source pass does not establish this committed app contract. | Reconcile the actual committed search UI, Phase24 work and intended accessible selector; preserve real app browsing assertions instead of dropping the selector to claim a pass. |
| P27-G16 | Approved-host /new returns200 but once misses the existing five-second edit-URL assertion; the same test passes unchanged in the focused ordinary-dev retry. | Investigate cold compilation/navigation and the repeated streaming observation; preserve the failed full run and do not widen timeouts without an established cause. |

Resolved preparation observations are not pending product fixes: one metadata
timeout passed in the unchanged focused and later full design runs; NODE_ENV
empty was corrected in the local wrapper; the one missing inert Google fixture
failure passed in the subsequent 24-case hosting-resume run. Failed attempts
remain retained. Inngest local introspection received500 with cloud mode and no
signing key; the existing local INNGEST_DEV=1 precondition passes in the focused
receiver test and is not production signature or scheduler proof. No full
acceptance waiver or clean release is claimed.

## Remaining Phase 27 prerequisites (not deferred by this decision)

These remain in the current execution scope and must not be silently reclassified
as the out-of-scope baseline findings above:

- Exact reviewed deployable revision and fresh source-bound acceptance evidence;
  existing dirty-tree passes do not prove a clean release. The optional candidate
  replacement contract requires six complete later gates and retains history.
- Verified compatibility rollout, app project attachment and www307 path/query
  redirect. Current app has TLS but returns DEPLOYMENT_NOT_FOUND; no cutover has run.
- Isolated Preview and production provider bindings, old/new direct receiver
  continuity/signatures, app-origin Google roundtrip and production audience proof.
- Concrete verified deployment-wide Contact per-client/global-mailbox controls
  before enabling Contact. Process-local limits and the observed firewall404 are
  insufficient proof. No new infrastructure, package or schema is authorized.
- Scoped exact remaining external actions, rollback/monitoring operator and
  approved controlled inquiry with available inbox owner and actual receipt/reply.
- Owner-coordinated ops-share-link and Inngest-serve bypass replacement/invalidation
  preserving jobs. Values are excluded and were not used or revoked.

The approved Google registration additions and current-apex sign-in proof remain
valid; do not request that approval again. All seven requirements remain pending,
Contact stays disabled, and payment/payout/legal HOLD remains unchanged. Plans08/09
remain incomplete until their actual prerequisites and evidence are satisfied.

When execution reaches its authorized endpoint, use this ledger alongside phase
verification/evidence to discuss and plan follow-up gaps. Do not label this ledger
a completed verification report or create an 08 SUMMARY to advance the initializer.
