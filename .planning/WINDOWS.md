---
schema_version: 1
open_count: 13
waived_count: 0
fixed_count: 0
total_count: 13
last_updated: 2026-09-04T12:34:46.969Z
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
  }
]
````
