---
phase: 27-app-subdomain-marketing-website
fixed_at: 2026-10-08T22:15:22Z
review_path: .planning/phases/27-app-subdomain-marketing-website/27-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 27: Code Review Fix Report

**Fixed at:** 2026-10-08T22:15:22Z
**Source review:** `27-REVIEW.md` at `78d44adfe1f8db83a47177482f54a13926a2481b`
**Iteration:** 1; critical + warning scope.

Four findings are implemented and committed separately by the root orchestrator.
No findings were skipped. Root stages exact owned paths; this child has read-only
Git metadata and did not stage or revert the extensive unrelated dirty tree.

## Fixed Issues

### CR-01: New hosting entry permits staff to regain a customer capability

**Files modified:** `src/app/start-hosting/page.tsx`,
`src/app/actions/capability.ts`, `src/lib/ops/grant.ts`,
`tests/auth/hosting-intent.test.tsx`, new
`tests/auth/capability-role-policy.test.ts`.
**Commit:** `4a95c5acad27159047c5d0cef61903c7791c131b`
**Logic-fix workflow label:** fixed: requires human verification. Focused semantic
coverage passes; independent root re-review is the remaining review step, not an
additional unresolved engineering finding or production-account verification demand.

The hosting page rejects staff before existing capability redirects. Both booking
and hosting actions use a minimal common authoritative transaction: acquire the
existing `fitout:staff-role-policy` advisory lock, reread positive `DEFAULT_ROLE`
eligibility, condition the capability update on that role and require exactly one
returned row. Denial cannot return success. Other capability flags, rate limiting
and audit outcomes remain intact. Every staff grant/conversion/revoke transaction
now acquires the same existing lock before its role reads/writes. Invitation paths
acquire invitation lock before policy lock for their private new identity; no reverse
policy-to-invitation ordering was found. Staff conversion policy and role constants
are preserved, with no production mutation or policy broadening.

Meaningful coverage uses the real capability action and guarded local PostgreSQL
clients: direct stale-session staff denial, unknown/null/missing role denial, zero-row
denial, page denial for staff with either capability state, successful dual-capability
preservation, shared rate/audit behavior, and both lock orders for hosting/booking versus
staff conversion. Tests observe the second backend waiting before releasing the first
transaction and assert the final staff identity has neither customer capability.
Ordinary staff granting after activation also refuses the customer identity.

Initial fixture setup lacked firstName; it was corrected without weakening assertions.
Per-finding verification then passed 41 tests and TypeScript. Final focused security/
contact/staff verification passed all 147 tests in nine files, including these races.

### WR-01: Contact reports definite non-delivery after an ambiguous response failure

**Files modified:** `src/components/marketing/contact-form.tsx`,
`tests/contact/contact-form.test.tsx`, `e2e/marketing-contact.spec.ts`.
**Commit:** `ee6fa72a386b1506cb9aea301db60b41faea68b9`
**Logic-fix workflow label:** fixed: requires human verification; local unit/browser
semantic coverage passes and independent re-review remains pending.

Transport and body-read exceptions say that delivery cannot be confirmed. Values and
recovery remain available; definite success still requires the actual accepted API
response. Unit and browser cases simulate server acceptance followed by an unreadable
response and assert uncertainty without success. The initial substring assertion was
corrected to compare the exact success announcement because the uncertainty message
also contains “was sent.” Final Contact unit checks passed 16/16; the final owned
browser run includes the added unreadable-response case. Simulated acceptance is not
provider acceptance, inbox receipt, Reply-To correctness or a real sent inquiry.

### WR-02: Deployed evidence accepts repeated rows in place of the required matrix

**Files modified:** `scripts/verify-phase27-evidence.mjs`, new
`tests/scripts/phase27-evidence.test.mjs`, new
`tests/scripts/fixtures/phase27-evidence.mjs`, `27-CUTOVER-PACKET.md`.
**Commit:** `d8d77c29bdf37028a4dc054ca1c55c6f2ef99e6f`

Version 1 specifies 35 unique required IDs covering all marketing/app/ops/preview
authorities, session/callback/token continuity, staff denial, RSC/prefetch/cache,
metadata, old/new direct receiver continuity, Contact controls and rollback. Each
observation requires typed scenario, host/URL/method, expected/observed detail, proof
reference, valid UTC timestamp, exact candidate revision/deployment and successful
`outcome: pass`. Customer, retained ops and isolated preview bind distinct deployment
identities; preview cannot substitute a production origin. Prepared unknown facts
remain honest; deployed acceptance requires the complete mapped observations.

Fixtures reject duplicate rows, every missing ID, substitute IDs, wrong types/date/
candidate identities, production preview substitution and observed failure. A complete
distinct synthetic fixture passes. Nonstring candidate origin returns validation errors
instead of throwing. Per-finding syntax/lint/prepared checks and 55 fixtures passed;
the combined final validator fixture suite passes 87/87. These checks establish
structural consistency, not the authenticity of supplied deployment observations.

### WR-03: Gate pass labels can contradict retained failing evidence

**Files modified:** `scripts/verify-phase27-evidence.mjs`, both new evidence fixture
files above, `27-ENGINEERING-EVIDENCE.md`, `27-CUTOVER-PACKET.md`,
`27-08-CHECKPOINT.md`.
**Base commit:** `c22f3d61c9b63ea4838c7cfa88e5c165085841d8`
**Persisted snapshot refinement:** `821af3f74340f4c785985797299b41bf02eecbdb`
**Next failure parser / synthetic isolation refinement:**
`9859a5ceb35267e8a5236694a9f06ad17354417d`

Typed runner totals and exact bounded summaries are derived from retained log bytes
for Vitest, node:test, TypeScript, ESLint, Next and Playwright. Failed summaries/totals
cannot be relabeled pass/0. UTC start/end and elapsed durations must agree; gates cannot
overlap. The parser retains compiled Next builds that fail typechecking or collection.
Synthetic fixture construction removes real supplemental records before assembling
its controlled positive example.

New pre-gate source contexts record actual revision, dirty state and a scoped sorted
file/digest manifest. Scope includes public assets and relevant package/lock/Next/TS/
test/tool configuration, excluding actual env/credentials/logs. Bounded references
point to ignored workspace-contained snapshots; the persisted CLI loads their bytes,
verifies snapshot hash/context, then validates the typed full manifest and supplements.
Historical six gates explicitly state capture unavailable. No historical revision or
manifest has been reconstructed as contemporaneous. Dirty/unavailable source cannot
establish clean/deployed SHA proof. Hashes/structure do not attest execution or external
account facts. Negative fixtures cover failed-log relabeling, summary/source/date/type/
digest contradictions and persisted snapshot tampering. Final 87/87 fixtures pass.

## Verification and provenance

All gates ran **sequentially in the main shared checkout**, with worktrees disabled
and source frozen during each gate. No unrelated dirty changes were reverted. Root
performed exact per-finding commits, scoped network build retries and owned Windows
server teardown. Installed Next guides were consulted before product source changes.

| Check | Actual outcome |
|---|---|
| Focused security/contact/staff | 147/147 tests, 9 files, exit 0, 11.8033133s |
| Final evidence fixtures | 87/87, exit 0, 0.4238463s; previous captured run 86/86 |
| TypeScript | Exit 0, no diagnostics, 8.8945135s; empty terminal-only output |
| Full ESLint | Exit 0, 0 errors / 34 existing warnings, 34.8898746s |
| Final canonical production build | Exit 0, compiled/typechecked, 46/46 routes and Proxy, 71.3673586s |
| Final owned Chromium | 52 passed, exit 0, 243.3270778s; assisted Windows teardown |

TypeScript ran 21:53:16.8572376–21:53:25.7517511Z against captured source03. No stdout
meant Tee-Object created no raw file. Actual terminal metadata and source03 are retained
separately in engineering evidence; no contemporaneous raw file is invented. The later
canonical production build explicitly typechecked successfully. Evidence-only parser/
fixture refinements after the earlier unit/types/lint passed syntax, focused lint and
87 final fixtures; security/contact product source stayed unchanged. Final build and
browser bind HEAD `9859a5c` plus the captured dirty tree, including existing unrelated
source. Later source contexts capture generated Next env changes. This is shared-tree
validation, not clean candidate or deployed source proof.

Four failed build attempts remain typed failures with actual logs/times and dispositions:
unsupported Node env-file worker flag; sandbox official Google Fonts access; stale
ignored development route types; missing inert webhook marker in the harness. Only the
two confirmed ignored contained `.next/dev/types/routes.d.ts` and `validator.ts` were
removed for the stale-type case, followed by canonical typegen. No suppression or
product/financial guard change occurred. The final build used invented inert markers,
guarded local test DB and mail/contact off. Official font access was narrowly authorized.

Final browser interval was 22:08:56.9779268–22:13:00.3050046Z. All cases passed before
teardown stalled. Root verified runner 20004 / wrapper 12544 / child cmd 1736 and the
owned Next tree, then stopped only Next descendants 20916, 17140, 9188, 20988. Runner
and unrelated Node processes were untouched. This was assisted teardown, not normal
teardown. One Next dev streaming TypeError `controller[kState].transformAlgorithm is
not a function`, digest `2206780199`, appeared between successful cases 47 and 48.
Only ignored frames were logged; no route/action/source attribution is available.
It remains in the raw log for independent review. Colour/image warnings also remain;
test success does not assert an error-free runtime.

Historical full unit **8 failures** and full design **9 failures** remain failed with
existing dispositions and unavailable execution-time source capture. No full-suite
repeat or waiver was used to manufacture provenance. Original six gates remain intact;
review-fix supplements are separate. Raw logs and full snapshot JSON remain ignored
beside `playwright/.cache/phase27-08`, never under Playwright's destructive outputDir.

Prepared CLI validates actual saved supplements. Deployed/live acceptance still rejects
failed historical gates, missing clean/deployed provenance and genuine pending external
proof. Independent code re-review now closes all four findings; the per-finding workflow labels above record the fixer's earlier handoff. External inventory, signed receivers,
production cache/preview isolation, Contact distributed control and inbox receipt need
actual readback/authority. No provider, DNS, deployment, account, schema, package or mail
mutation occurred. Contact remains disabled; checkout/payout/legal HOLD is unchanged.
Plans 08/09 remain incomplete, seven requirements unchecked and no 08 SUMMARY exists.

---

_Fixer: Codex (gsd-code-fixer); iteration 1. Report documentation is committed separately
by the root orchestrator after verification and independent review._
