---
schema_version: 1
open_count: 39
waived_count: 0
fixed_count: 8
total_count: 47
last_updated: 2026-09-19T13:57:51.543Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 19 | deviation | src/components/listing/listing-card.tsx |  | Task 1 acceptance grep '>Unlist<' is unsatisfiable — the label is a multi-line JSX child at HEAD too; element left unchanged per UI-SPEC Surface Contract B | open |  | 2026-09-04T02:06:17.687Z |  |
| 2 | 19 | deviation | .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/guards-post-fix.txt |  | Task 3 fails_when 'contains failed' false-positives on the pre-existing NavDrawer hydration warning on WebServer stdout; capture kept verbatim, exit 0 / 3 passed | open |  | 2026-09-04T02:06:22.689Z |  |
| 3 | 19 | deviation | .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/archive-verification.19-04.txt |  | 19-04 Task 1 precondition literally UNMET: live .next/app-path-routes-manifest.json is gone and .next/dev was rewritten by 19-02/19-03; archive verified rather than re-taken, and the prod manifest mtime (Sep 3 15:57) is no longer independently verifiable | open |  | 2026-09-04T02:35:39.504Z |  |
| 4 | 19 | deviation | .planning/phases/19-host-listing-surfaces-gates-that-actually-run/19-RESEARCH.md |  | 19-RESEARCH 5.1 claims 'eleven other untouched drafts owned by other accounts'; measured at execution time it is 49 across 49 distinct hosts, pre-existing (earliest 2026-08-29), none from this phase | open |  | 2026-09-04T02:35:40.065Z |  |
| 5 | 19 | todo | .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/orphan-drafts-delete-result.txt |  | OPEN PM question, unanswered: D-01's window and host id are LOCAL facts, so a production database may hold orphan drafts this phase does not touch; if a deployed environment exists the scope must be re-derived there, not copied | open |  | 2026-09-04T02:35:40.684Z |  |
| 6 | 19 | deviation | .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/probe-prod.txt |  | 19-05 Task 2: under a production build the /ops 404 body is NOT byte-identical to the root not-found (25970 vs 29644 bytes). Status control held (404 in both matrices) and no ops-identifying string leaks; /ops renders LESS shared chrome. Pre-existing (files last changed in 18-12 and 11-14), deferred not fixed — belongs to whoever owns D-219. | open |  | 2026-09-04T03:18:49.016Z |  |
| 7 | 19 | unrun-verify | e2e/host-route-reachability.spec.ts |  | 19-06 Task 1: the new routing guard went RED ONCE (3 of 4 routes) during plan-level verification and the DISCRIMINATING STATUS WAS NOT CAPTURED — the grep filter in use did not include the 'answered' line and the run's artifacts were cleared by the next run. Six consecutive green runs before and after; not reproduced under a deliberate restage. No cause named (D-11). The next reader who sees this guard go red must capture the status, the dev-server stdout, and the manifest BEFORE re-running: that capture is verdict B and it is the only thing that closes 19-FINDING-404 items (a) and (c). | open |  | 2026-09-04T03:47:25.067Z |  |
| 8 | 19 | unrun-verify | .planning/phases/19-host-listing-surfaces-gates-that-actually-run/19-08-PLAN.md |  | 19-08 Task 3 verify 'gh api repos/:owner/:repo/branches/main/protection' CANNOT RUN — branches/main/protection and rulesets both return 403 'Upgrade to GitHub Pro or make this repository public to enable this feature.' Repo is private, owner is a Free personal account. PREREQUISITE A for making gate-e2e a required check: branch protection is unreachable at any price except making the repo public or buying Pro. | open |  | 2026-09-04T07:32:41.478Z |  |
| 9 | 19 | deviation | .github/workflows/ci.yml |  | gate-e2e SHIPS NON-REQUIRED and CI-01 closes with it non-required. D-15's flip was HELD by PM decision (option 2). It reports; it does not block. Two prerequisites stand: (A) branch protection unreachable, 403 Pro/public — see the unrun-verify entry; (C) there is no green run, 14 e2e tests fail reproducibly plus gate-visual on stale baselines. Blocker B (pull_request never ran) was RESOLVED on 2026-09-04 by merge commits 902aca5 (dev) and 9619f0b (ci/gate-e2e-proof-19-08). Do not read CI-01 'complete' as 'the gate blocks'. | open |  | 2026-09-04T07:32:42.081Z |  |
| 10 | 19 | deviation | e2e |  | FOURTEEN e2e tests fail reproducibly across ~10 spec files on a real runner, plus gate-visual on baselines last regenerated 2026-08-30 — the full list with verbatim messages is in 19-08 evidence/gate-e2e-wallclock.txt. NONE was introduced by phase 19; they are what a gate nobody had ever run was hiding. Fixing them is a SEPARATE PHASE and is prerequisite C for making gate-e2e required. Whoever fixes them must RE-MEASURE the wall-clock: 48m22s includes 135 retry executions and is an upper bound, not the cost of a green suite. | open |  | 2026-09-04T07:32:42.669Z |  |
| 11 | 19 | todo | .planning/phases/19-host-listing-surfaces-gates-that-actually-run/19-08-SUMMARY.md |  | NEW EVIDENCE FOR LEDGER ENTRY 5, WHICH STAYS OPEN. A vercel.json is in the tree and a live Vercel project (pengr3s-projects/fit-out) deploys this repository — its check appears on PR #1. This DEMONSTRATES A DEPLOYED ENVIRONMENT EXISTS, which entry 5's question was conditioned on ('if a deployed environment exists the scope must be re-derived there'). It does NOT establish that the deployment has its own database, and nobody has measured that. The PM's production-scope question from 19-04 remains UNANSWERED and entry 5 must not be closed on this evidence. | open |  | 2026-09-04T07:32:43.258Z |  |
| 12 | 19 | deviation | scripts/verify-workflows.mjs |  | 19-11: the plan's acceptance criterion required all three new gate-e2e invariants to go red on an empty run-command list, but invariant 2 (unconditional) is a predicate over the job's if:/continue-on-error keys and cannot. Implemented per the plan's <action> + WR-01 sketch; two of three go red on steps: []. | open |  | 2026-09-04T12:34:45.452Z |  |
| 13 | 19 | unmet-truth | .github/workflows/ci.yml |  | 19-11: WR-02's hole in the D-14 mail scan (verify-workflows.mjs does not walk container.env or services.*.env) is NAMED in ci.yml's header but NOT closed. A container-level RESEND_* key would pass both halves of the assertion. | open |  | 2026-09-04T12:34:46.969Z |  |
| 14 | 19 | deviation | scripts/refuse-mail-credential.mjs |  | READ hard-stop remedy sentence corrected: 'fix the path in ci.yml' became false when the argv override was removed | open |  | 2026-09-04T16:11:09.561Z |  |
| 15 | 19.1 | deviation | scripts/verify-workflows.mjs | 741 | T-11-DBFREE locates the build job by a SUBSTRING of a run: body (r.includes("npm run build")) — the CR-02 idiom used for a positive assertion; satisfied by every softened form of the step and by moving the build to another job. Logged as D-19.1-C for plan 06. | open |  | 2026-09-05T05:46:15.519Z |  |
| 16 | 19.1 | deviation | e2e/helpers/booker-seed.ts | 180 | pickWindow's tz-note assertion matches TEXT, so it stays strict-mode ambiguous after 19.1-04's id-only repair; two elements resolve while the served shell and resolved content overlap. Handed to plan 08 (19.1-PATTERNS section 7 charters that helper). | open |  | 2026-09-05T06:36:41.350Z |  |
| 17 | 19.1 | unrun-verify | e2e/host-headings.spec.ts |  | host-headings:964 does not reproduce locally (14/14 green) while CI failed it 6/6; the pressAdvance repair is justified from mechanism + watched red but is UNVERIFIED on a real 2-core runner | open |  | 2026-09-05T10:25:45.760Z |  |
| 18 | 19.1 | unrun-verify | e2e/confirmation-decay.spec.ts | 212 | The plan's own confirmation-decay verify expects a zero failed/flaky count; the settle refuted the timing hypothesis and the case now fails on a real duplicated mount. Satisfying the verify would require scoping the locator and hiding the defect. Owned by proposed plan 19.1-17. | open |  | 2026-09-05T16:40:06.282Z |  |
| 19 | 19.1 | deviation | src/app/(host)/host/layout.tsx | 95 | Hydration failure on every (host) route: the Suspense fallback and its resolved content each mount a Radix DialogTrigger with a generated id. Reproduced locally. Leading candidate for host-headings:1052 and overflow-320:3434 remaining red. Owned by proposed plan 19.1-16. | open |  | 2026-09-05T16:40:06.818Z |  |
| 20 | 19.1 | deviation | e2e/avatar-crop.spec.ts | 162 | locator('input[type=file]') resolved to 2 elements in run 33972688199; the helper's uniqueness claim is about src/, not about the document. Not repaired here - owned by proposed plan 19.1-17. | open |  | 2026-09-05T16:40:07.379Z |  |
| 21 | 19.1 | deviation | .planning/phases/19.1-ci-signal-becomes-real-constrain-gate-db-free-repair-the-red/19.1-19-PLAN.md |  | 19.1-19 Task 3 plan contract required an overall-green CI result while simultaneously permitting the owned Plan 19.1-20 E2E-only red; corrected in b7aaca4 so the four owned/supporting jobs must be green and only the exact handed-off E2E cases may remain red. | fixed |  | 2026-09-07T01:33:56.521Z | 2026-09-07T01:34:06.296Z |
| 22 | 20 | deviation | tests/design/mail-credential-refusal.test.ts | 115 | Plan 20-10 typecheck encountered seven pre-existing diagnostics across two out-of-scope design tests | open |  | 2026-09-07T21:25:21.877Z |  |
| 23 | 20 | deviation | src/app/(ops-gateway)/ops-gateway/route.ts |  | 20-11 approved architecture deviation: Next route-state 404 bytes required an authenticated Node constant-response gateway; implemented and production-proven without auth/database work in Proxy | fixed |  | 2026-09-07T23:26:44.941Z | 2026-09-07T23:26:57.336Z |
| 24 | 20 | deviation | src/app/(ops-gateway)/ops-gateway/route.ts |  | 20-11 production spike found forwarded x-middleware control headers are illegal on Route Handler responses; fixed and pinned by tests | fixed |  | 2026-09-07T23:26:45.619Z | 2026-09-07T23:26:58.018Z |
| 25 | 20 | deviation | src/app/(ops-gateway)/ops-gateway/route.ts |  | 20-11 production spike found rewritten request.url authority differs from preserved Host; fixed inward routing to use the classified Host and pinned by tests | fixed |  | 2026-09-07T23:26:46.337Z | 2026-09-07T23:26:58.731Z |
| 26 | 20 | deviation | src/lib/ops/invitations.ts |  | PostgreSQL JSON metadata parameters required explicit text casts for deterministic insert typing | fixed |  | 2026-09-08T01:15:35.344Z | 2026-09-08T01:16:11.660Z |
| 27 | 20 | deviation | tests/helpers/email-fixtures.ts |  | New staff invitation sender required an exhaustive injection fixture and sender census update | fixed |  | 2026-09-08T01:15:36.169Z | 2026-09-08T01:16:12.352Z |
| 28 | 20 | deviation | src/lib/email.ts |  | Staff invitation delivery must suppress the legacy token-bearing development console fallback | fixed |  | 2026-09-08T01:15:36.903Z | 2026-09-08T01:16:13.145Z |
| 29 | 20 | deviation | tests/ops/staff-invitation.test.ts |  | Rollback proof was decoupled from Drizzle adapter wrapper error text | fixed |  | 2026-09-08T01:15:37.715Z | 2026-09-08T01:16:13.907Z |
| 30 | 21 | unrun-verify | package.json |  | The plan-listed npm run typecheck command is unavailable because package.json defines no typecheck script; the direct Next production build completed TypeScript validation successfully. | open |  | 2026-09-09T05:55:49.755Z |  |
| 32 | 21 | deviation | e2e/helpers/booker-seed.ts |  | 21-02: Extended the existing browser fixture with bounded review cycles so the planned end-to-end history states could be verified. | open |  | 2026-09-09T07:17:52.638Z |  |
| 33 | 21 | deviation | e2e/host-listing-grid.spec.ts |  | 21-02: Measured overflow on the Radix ScrollArea viewport instead of its root so the browser assertion matches the component's actual scrolling element. | open |  | 2026-09-09T07:17:53.319Z |  |
| 34 | 21 | deviation | .next/dev/types/validator.ts |  | 21-02: Removed a stale generated Next development validator that blocked a clean production build; no tracked source file was removed. | open |  | 2026-09-09T07:17:54.023Z |  |
| 35 | 21 | unrun-verify | package.json |  | npm.cmd run typecheck is undefined; clean Next production build completed its TypeScript pass | open |  | 2026-09-09T09:16:02.438Z |  |
| 36 | 21 | unrun-verify | e2e/host-listing-grid.spec.ts |  | Windows Playwright runner stayed open after all browser assertion results and required interruption | open |  | 2026-09-09T09:16:03.127Z |  |
| 37 | 21 | unrun-verify | package.json |  | 21-05: npm.cmd run typecheck is undefined; clean Next production build completed its TypeScript pass | open |  | 2026-09-09T10:29:17.126Z |  |
| 38 | 21 | deviation | .next/dev/types/validator.ts |  | 21-05: Removed stale generated Next development route types that blocked production TypeScript validation | open |  | 2026-09-09T10:29:18.066Z |  |
| 39 | 21 | unrun-verify | e2e/host-dashboard.spec.ts |  | 21-05: Windows-managed Playwright server descendants stayed open after targeted runs; manual-server full run passed 9/9 | open |  | 2026-09-09T10:29:18.267Z |  |
| 40 | 21 | deviation | src/app/(host)/host/listings/[id]/edit/wizard.tsx | 357 | Receipt initially violated semantic color and focus-ring design tokens; corrected before completion. | open |  | 2026-09-09T12:37:06.012Z |  |
| 41 | 21 | deviation | src/app/actions/listing-photo.ts | 65 | Photo success type was over-narrowed to false; corrected while preserving explicit production booleans. | open |  | 2026-09-09T12:37:06.765Z |  |
| 42 | 21 | deviation | e2e/host-listing-grid.spec.ts | 514 | Production browser copy assertions required main-landmark scoping to avoid responsive-shell ambiguity. | open |  | 2026-09-09T12:37:07.501Z |  |
| 43 | 21 | deviation | e2e/host-listing-grid.spec.ts |  | Windows Playwright verification used a temporary manually managed server configuration. | open |  | 2026-09-09T12:37:08.248Z |  |
| 44 | 21 | deviation | .next/dev |  | Stale generated development route types were removed before the production build. | open |  | 2026-09-09T12:37:09.186Z |  |
| 45 | 21 | deviation | e2e/host-dashboard.spec.ts |  | Managed Windows Playwright server teardown required the final matrix to use a manually managed local server for a clean exit. | open |  | 2026-09-10T04:16:06.297Z |  |
| 46 | 22 | deviation | tests/ops/ops-queue-row.test.tsx |  | Scoped the existing amenities-list assertion after operating-hours evidence added its required semantic list. | open |  | 2026-09-10T12:27:04.267Z |  |
| 47 | 25 | unrun-verify | .planning/phases/25-finalize-paymongo-production-payments/25-PRODUCTION-RUNBOOK.md |  | Focused DB-backed payment suite, scoped ESLint, TypeScript, and opt-in probe were not run because Docker Engine was unavailable. | open |  | 2026-09-18T04:04:29.295Z |  |
| 48 | 25.1 | unmet-truth | .planning/phases/25.1-paymongo-production-release-readiness-controlled-proofs/25.1-VALIDATION-EVIDENCE.md |  | TypeScript validation failed; HOLD remains until engineering resolves TYPESCRIPT_CHECK_FAILED and records a fresh passing run. | open |  | 2026-09-19T13:57:51.543Z |  |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "19",
    "file": "src/components/listing/listing-card.tsx",
    "line": null,
    "description": "Task 1 acceptance grep '>Unlist<' is unsatisfiable — the label is a multi-line JSX child at HEAD too; element left unchanged per UI-SPEC Surface Contract B",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T02:06:17.687Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "19",
    "file": ".planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/guards-post-fix.txt",
    "line": null,
    "description": "Task 3 fails_when 'contains failed' false-positives on the pre-existing NavDrawer hydration warning on WebServer stdout; capture kept verbatim, exit 0 / 3 passed",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T02:06:22.689Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "deviation",
    "phase": "19",
    "file": ".planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/archive-verification.19-04.txt",
    "line": null,
    "description": "19-04 Task 1 precondition literally UNMET: live .next/app-path-routes-manifest.json is gone and .next/dev was rewritten by 19-02/19-03; archive verified rather than re-taken, and the prod manifest mtime (Sep 3 15:57) is no longer independently verifiable",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T02:35:39.504Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "deviation",
    "phase": "19",
    "file": ".planning/phases/19-host-listing-surfaces-gates-that-actually-run/19-RESEARCH.md",
    "line": null,
    "description": "19-RESEARCH 5.1 claims 'eleven other untouched drafts owned by other accounts'; measured at execution time it is 49 across 49 distinct hosts, pre-existing (earliest 2026-08-29), none from this phase",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T02:35:40.065Z",
    "resolved_at": null
  },
  {
    "id": 5,
    "kind": "todo",
    "phase": "19",
    "file": ".planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/orphan-drafts-delete-result.txt",
    "line": null,
    "description": "OPEN PM question, unanswered: D-01's window and host id are LOCAL facts, so a production database may hold orphan drafts this phase does not touch; if a deployed environment exists the scope must be re-derived there, not copied",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T02:35:40.684Z",
    "resolved_at": null
  },
  {
    "id": 6,
    "kind": "deviation",
    "phase": "19",
    "file": ".planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/probe-prod.txt",
    "line": null,
    "description": "19-05 Task 2: under a production build the /ops 404 body is NOT byte-identical to the root not-found (25970 vs 29644 bytes). Status control held (404 in both matrices) and no ops-identifying string leaks; /ops renders LESS shared chrome. Pre-existing (files last changed in 18-12 and 11-14), deferred not fixed — belongs to whoever owns D-219.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T03:18:49.016Z",
    "resolved_at": null
  },
  {
    "id": 7,
    "kind": "unrun-verify",
    "phase": "19",
    "file": "e2e/host-route-reachability.spec.ts",
    "line": null,
    "description": "19-06 Task 1: the new routing guard went RED ONCE (3 of 4 routes) during plan-level verification and the DISCRIMINATING STATUS WAS NOT CAPTURED — the grep filter in use did not include the 'answered' line and the run's artifacts were cleared by the next run. Six consecutive green runs before and after; not reproduced under a deliberate restage. No cause named (D-11). The next reader who sees this guard go red must capture the status, the dev-server stdout, and the manifest BEFORE re-running: that capture is verdict B and it is the only thing that closes 19-FINDING-404 items (a) and (c).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T03:47:25.067Z",
    "resolved_at": null
  },
  {
    "id": 8,
    "kind": "unrun-verify",
    "phase": "19",
    "file": ".planning/phases/19-host-listing-surfaces-gates-that-actually-run/19-08-PLAN.md",
    "line": null,
    "description": "19-08 Task 3 verify 'gh api repos/:owner/:repo/branches/main/protection' CANNOT RUN — branches/main/protection and rulesets both return 403 'Upgrade to GitHub Pro or make this repository public to enable this feature.' Repo is private, owner is a Free personal account. PREREQUISITE A for making gate-e2e a required check: branch protection is unreachable at any price except making the repo public or buying Pro.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T07:32:41.478Z",
    "resolved_at": null
  },
  {
    "id": 9,
    "kind": "deviation",
    "phase": "19",
    "file": ".github/workflows/ci.yml",
    "line": null,
    "description": "gate-e2e SHIPS NON-REQUIRED and CI-01 closes with it non-required. D-15's flip was HELD by PM decision (option 2). It reports; it does not block. Two prerequisites stand: (A) branch protection unreachable, 403 Pro/public — see the unrun-verify entry; (C) there is no green run, 14 e2e tests fail reproducibly plus gate-visual on stale baselines. Blocker B (pull_request never ran) was RESOLVED on 2026-09-04 by merge commits 902aca5 (dev) and 9619f0b (ci/gate-e2e-proof-19-08). Do not read CI-01 'complete' as 'the gate blocks'.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T07:32:42.081Z",
    "resolved_at": null
  },
  {
    "id": 10,
    "kind": "deviation",
    "phase": "19",
    "file": "e2e",
    "line": null,
    "description": "FOURTEEN e2e tests fail reproducibly across ~10 spec files on a real runner, plus gate-visual on baselines last regenerated 2026-08-30 — the full list with verbatim messages is in 19-08 evidence/gate-e2e-wallclock.txt. NONE was introduced by phase 19; they are what a gate nobody had ever run was hiding. Fixing them is a SEPARATE PHASE and is prerequisite C for making gate-e2e required. Whoever fixes them must RE-MEASURE the wall-clock: 48m22s includes 135 retry executions and is an upper bound, not the cost of a green suite.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T07:32:42.669Z",
    "resolved_at": null
  },
  {
    "id": 11,
    "kind": "todo",
    "phase": "19",
    "file": ".planning/phases/19-host-listing-surfaces-gates-that-actually-run/19-08-SUMMARY.md",
    "line": null,
    "description": "NEW EVIDENCE FOR LEDGER ENTRY 5, WHICH STAYS OPEN. A vercel.json is in the tree and a live Vercel project (pengr3s-projects/fit-out) deploys this repository — its check appears on PR #1. This DEMONSTRATES A DEPLOYED ENVIRONMENT EXISTS, which entry 5's question was conditioned on ('if a deployed environment exists the scope must be re-derived there'). It does NOT establish that the deployment has its own database, and nobody has measured that. The PM's production-scope question from 19-04 remains UNANSWERED and entry 5 must not be closed on this evidence.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T07:32:43.258Z",
    "resolved_at": null
  },
  {
    "id": 12,
    "kind": "deviation",
    "phase": "19",
    "file": "scripts/verify-workflows.mjs",
    "line": null,
    "description": "19-11: the plan's acceptance criterion required all three new gate-e2e invariants to go red on an empty run-command list, but invariant 2 (unconditional) is a predicate over the job's if:/continue-on-error keys and cannot. Implemented per the plan's <action> + WR-01 sketch; two of three go red on steps: [].",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T12:34:45.452Z",
    "resolved_at": null
  },
  {
    "id": 13,
    "kind": "unmet-truth",
    "phase": "19",
    "file": ".github/workflows/ci.yml",
    "line": null,
    "description": "19-11: WR-02's hole in the D-14 mail scan (verify-workflows.mjs does not walk container.env or services.*.env) is NAMED in ci.yml's header but NOT closed. A container-level RESEND_* key would pass both halves of the assertion.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T12:34:46.969Z",
    "resolved_at": null
  },
  {
    "id": 14,
    "kind": "deviation",
    "phase": "19",
    "file": "scripts/refuse-mail-credential.mjs",
    "line": null,
    "description": "READ hard-stop remedy sentence corrected: 'fix the path in ci.yml' became false when the argv override was removed",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T16:11:09.561Z",
    "resolved_at": null
  },
  {
    "id": 15,
    "kind": "deviation",
    "phase": "19.1",
    "file": "scripts/verify-workflows.mjs",
    "line": 741,
    "description": "T-11-DBFREE locates the build job by a SUBSTRING of a run: body (r.includes(\"npm run build\")) — the CR-02 idiom used for a positive assertion; satisfied by every softened form of the step and by moving the build to another job. Logged as D-19.1-C for plan 06.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-05T05:46:15.519Z",
    "resolved_at": null
  },
  {
    "id": 16,
    "kind": "deviation",
    "phase": "19.1",
    "file": "e2e/helpers/booker-seed.ts",
    "line": 180,
    "description": "pickWindow's tz-note assertion matches TEXT, so it stays strict-mode ambiguous after 19.1-04's id-only repair; two elements resolve while the served shell and resolved content overlap. Handed to plan 08 (19.1-PATTERNS section 7 charters that helper).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-05T06:36:41.350Z",
    "resolved_at": null
  },
  {
    "id": 17,
    "kind": "unrun-verify",
    "phase": "19.1",
    "file": "e2e/host-headings.spec.ts",
    "line": null,
    "description": "host-headings:964 does not reproduce locally (14/14 green) while CI failed it 6/6; the pressAdvance repair is justified from mechanism + watched red but is UNVERIFIED on a real 2-core runner",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-05T10:25:45.760Z",
    "resolved_at": null
  },
  {
    "id": 18,
    "kind": "unrun-verify",
    "phase": "19.1",
    "file": "e2e/confirmation-decay.spec.ts",
    "line": 212,
    "description": "The plan's own confirmation-decay verify expects a zero failed/flaky count; the settle refuted the timing hypothesis and the case now fails on a real duplicated mount. Satisfying the verify would require scoping the locator and hiding the defect. Owned by proposed plan 19.1-17.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-05T16:40:06.282Z",
    "resolved_at": null
  },
  {
    "id": 19,
    "kind": "deviation",
    "phase": "19.1",
    "file": "src/app/(host)/host/layout.tsx",
    "line": 95,
    "description": "Hydration failure on every (host) route: the Suspense fallback and its resolved content each mount a Radix DialogTrigger with a generated id. Reproduced locally. Leading candidate for host-headings:1052 and overflow-320:3434 remaining red. Owned by proposed plan 19.1-16.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-05T16:40:06.818Z",
    "resolved_at": null
  },
  {
    "id": 20,
    "kind": "deviation",
    "phase": "19.1",
    "file": "e2e/avatar-crop.spec.ts",
    "line": 162,
    "description": "locator('input[type=file]') resolved to 2 elements in run 33972688199; the helper's uniqueness claim is about src/, not about the document. Not repaired here - owned by proposed plan 19.1-17.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-05T16:40:07.379Z",
    "resolved_at": null
  },
  {
    "id": 21,
    "kind": "deviation",
    "phase": "19.1",
    "file": ".planning/phases/19.1-ci-signal-becomes-real-constrain-gate-db-free-repair-the-red/19.1-19-PLAN.md",
    "line": null,
    "description": "19.1-19 Task 3 plan contract required an overall-green CI result while simultaneously permitting the owned Plan 19.1-20 E2E-only red; corrected in b7aaca4 so the four owned/supporting jobs must be green and only the exact handed-off E2E cases may remain red.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-07T01:33:56.521Z",
    "resolved_at": "2026-09-07T01:34:06.296Z"
  },
  {
    "id": 22,
    "kind": "deviation",
    "phase": "20",
    "file": "tests/design/mail-credential-refusal.test.ts",
    "line": 115,
    "description": "Plan 20-10 typecheck encountered seven pre-existing diagnostics across two out-of-scope design tests",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-07T21:25:21.877Z",
    "resolved_at": null
  },
  {
    "id": 23,
    "kind": "deviation",
    "phase": "20",
    "file": "src/app/(ops-gateway)/ops-gateway/route.ts",
    "line": null,
    "description": "20-11 approved architecture deviation: Next route-state 404 bytes required an authenticated Node constant-response gateway; implemented and production-proven without auth/database work in Proxy",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-07T23:26:44.941Z",
    "resolved_at": "2026-09-07T23:26:57.336Z"
  },
  {
    "id": 24,
    "kind": "deviation",
    "phase": "20",
    "file": "src/app/(ops-gateway)/ops-gateway/route.ts",
    "line": null,
    "description": "20-11 production spike found forwarded x-middleware control headers are illegal on Route Handler responses; fixed and pinned by tests",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-07T23:26:45.619Z",
    "resolved_at": "2026-09-07T23:26:58.018Z"
  },
  {
    "id": 25,
    "kind": "deviation",
    "phase": "20",
    "file": "src/app/(ops-gateway)/ops-gateway/route.ts",
    "line": null,
    "description": "20-11 production spike found rewritten request.url authority differs from preserved Host; fixed inward routing to use the classified Host and pinned by tests",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-07T23:26:46.337Z",
    "resolved_at": "2026-09-07T23:26:58.731Z"
  },
  {
    "id": 26,
    "kind": "deviation",
    "phase": "20",
    "file": "src/lib/ops/invitations.ts",
    "line": null,
    "description": "PostgreSQL JSON metadata parameters required explicit text casts for deterministic insert typing",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-08T01:15:35.344Z",
    "resolved_at": "2026-09-08T01:16:11.660Z"
  },
  {
    "id": 27,
    "kind": "deviation",
    "phase": "20",
    "file": "tests/helpers/email-fixtures.ts",
    "line": null,
    "description": "New staff invitation sender required an exhaustive injection fixture and sender census update",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-08T01:15:36.169Z",
    "resolved_at": "2026-09-08T01:16:12.352Z"
  },
  {
    "id": 28,
    "kind": "deviation",
    "phase": "20",
    "file": "src/lib/email.ts",
    "line": null,
    "description": "Staff invitation delivery must suppress the legacy token-bearing development console fallback",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-08T01:15:36.903Z",
    "resolved_at": "2026-09-08T01:16:13.145Z"
  },
  {
    "id": 29,
    "kind": "deviation",
    "phase": "20",
    "file": "tests/ops/staff-invitation.test.ts",
    "line": null,
    "description": "Rollback proof was decoupled from Drizzle adapter wrapper error text",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-08T01:15:37.715Z",
    "resolved_at": "2026-09-08T01:16:13.907Z"
  },
  {
    "id": 30,
    "kind": "unrun-verify",
    "phase": "21",
    "file": "package.json",
    "line": null,
    "description": "The plan-listed npm run typecheck command is unavailable because package.json defines no typecheck script; the direct Next production build completed TypeScript validation successfully.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-09T05:55:49.755Z",
    "resolved_at": null
  },
  {
    "id": 32,
    "kind": "deviation",
    "phase": "21",
    "file": "e2e/helpers/booker-seed.ts",
    "line": null,
    "description": "21-02: Extended the existing browser fixture with bounded review cycles so the planned end-to-end history states could be verified.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-09T07:17:52.638Z",
    "resolved_at": null
  },
  {
    "id": 33,
    "kind": "deviation",
    "phase": "21",
    "file": "e2e/host-listing-grid.spec.ts",
    "line": null,
    "description": "21-02: Measured overflow on the Radix ScrollArea viewport instead of its root so the browser assertion matches the component's actual scrolling element.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-09T07:17:53.319Z",
    "resolved_at": null
  },
  {
    "id": 34,
    "kind": "deviation",
    "phase": "21",
    "file": ".next/dev/types/validator.ts",
    "line": null,
    "description": "21-02: Removed a stale generated Next development validator that blocked a clean production build; no tracked source file was removed.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-09T07:17:54.023Z",
    "resolved_at": null
  },
  {
    "id": 35,
    "kind": "unrun-verify",
    "phase": "21",
    "file": "package.json",
    "line": null,
    "description": "npm.cmd run typecheck is undefined; clean Next production build completed its TypeScript pass",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-09T09:16:02.438Z",
    "resolved_at": null
  },
  {
    "id": 36,
    "kind": "unrun-verify",
    "phase": "21",
    "file": "e2e/host-listing-grid.spec.ts",
    "line": null,
    "description": "Windows Playwright runner stayed open after all browser assertion results and required interruption",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-09T09:16:03.127Z",
    "resolved_at": null
  },
  {
    "id": 37,
    "kind": "unrun-verify",
    "phase": "21",
    "file": "package.json",
    "line": null,
    "description": "21-05: npm.cmd run typecheck is undefined; clean Next production build completed its TypeScript pass",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-09T10:29:17.126Z",
    "resolved_at": null
  },
  {
    "id": 38,
    "kind": "deviation",
    "phase": "21",
    "file": ".next/dev/types/validator.ts",
    "line": null,
    "description": "21-05: Removed stale generated Next development route types that blocked production TypeScript validation",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-09T10:29:18.066Z",
    "resolved_at": null
  },
  {
    "id": 39,
    "kind": "unrun-verify",
    "phase": "21",
    "file": "e2e/host-dashboard.spec.ts",
    "line": null,
    "description": "21-05: Windows-managed Playwright server descendants stayed open after targeted runs; manual-server full run passed 9/9",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-09T10:29:18.267Z",
    "resolved_at": null
  },
  {
    "id": 40,
    "kind": "deviation",
    "phase": "21",
    "file": "src/app/(host)/host/listings/[id]/edit/wizard.tsx",
    "line": 357,
    "description": "Receipt initially violated semantic color and focus-ring design tokens; corrected before completion.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-09T12:37:06.012Z",
    "resolved_at": null
  },
  {
    "id": 41,
    "kind": "deviation",
    "phase": "21",
    "file": "src/app/actions/listing-photo.ts",
    "line": 65,
    "description": "Photo success type was over-narrowed to false; corrected while preserving explicit production booleans.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-09T12:37:06.765Z",
    "resolved_at": null
  },
  {
    "id": 42,
    "kind": "deviation",
    "phase": "21",
    "file": "e2e/host-listing-grid.spec.ts",
    "line": 514,
    "description": "Production browser copy assertions required main-landmark scoping to avoid responsive-shell ambiguity.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-09T12:37:07.501Z",
    "resolved_at": null
  },
  {
    "id": 43,
    "kind": "deviation",
    "phase": "21",
    "file": "e2e/host-listing-grid.spec.ts",
    "line": null,
    "description": "Windows Playwright verification used a temporary manually managed server configuration.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-09T12:37:08.248Z",
    "resolved_at": null
  },
  {
    "id": 44,
    "kind": "deviation",
    "phase": "21",
    "file": ".next/dev",
    "line": null,
    "description": "Stale generated development route types were removed before the production build.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-09T12:37:09.186Z",
    "resolved_at": null
  },
  {
    "id": 45,
    "kind": "deviation",
    "phase": "21",
    "file": "e2e/host-dashboard.spec.ts",
    "line": null,
    "description": "Managed Windows Playwright server teardown required the final matrix to use a manually managed local server for a clean exit.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-10T04:16:06.297Z",
    "resolved_at": null
  },
  {
    "id": 46,
    "kind": "deviation",
    "phase": "22",
    "file": "tests/ops/ops-queue-row.test.tsx",
    "line": null,
    "description": "Scoped the existing amenities-list assertion after operating-hours evidence added its required semantic list.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-10T12:27:04.267Z",
    "resolved_at": null
  },
  {
    "id": 47,
    "kind": "unrun-verify",
    "phase": "25",
    "file": ".planning/phases/25-finalize-paymongo-production-payments/25-PRODUCTION-RUNBOOK.md",
    "line": null,
    "description": "Focused DB-backed payment suite, scoped ESLint, TypeScript, and opt-in probe were not run because Docker Engine was unavailable.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-18T04:04:29.295Z",
    "resolved_at": null
  },
  {
    "id": 48,
    "kind": "unmet-truth",
    "phase": "25.1",
    "file": ".planning/phases/25.1-paymongo-production-release-readiness-controlled-proofs/25.1-VALIDATION-EVIDENCE.md",
    "line": null,
    "description": "TypeScript validation failed; HOLD remains until engineering resolves TYPESCRIPT_CHECK_FAILED and records a fresh passing run.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-19T13:57:51.543Z",
    "resolved_at": null
  }
]
````
