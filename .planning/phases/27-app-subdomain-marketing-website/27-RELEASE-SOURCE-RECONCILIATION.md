# Phase 27 — Release-source reconciliation

Latest checkpoint 2026-10-11T16:28:21.817Z: Current Production pair: exact 58897a94 on web dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg and Ops dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4. Contact remains disabled. Fresh matrix27/35; historical30 observations remain archived with original source/IDs/time. Source-only recovery passed; full topology rollback and extended monitoring remain incomplete. Plan09 remains20/21, curated144/151, all7requirements pending. Read27-DISABLED-PRODUCTION-PAIR.md. Earlier source statements below are dated history.

Exact `58897a94` is the proposed candidate for engineering and the revised packet. Six fresh full engineering gates pass at manifest `8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a`. Current public traffic remains disabled web `b61cb4a4` and Ops `d67fbecf`; this task made no external change or inquiry send.

```json
{
  "recordedAt": "2026-10-11T09:33:12.518Z",
  "candidateRevision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
  "sourceManifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a",
  "engineering": {
    "fullGates": 6,
    "report": {
      "path": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/gates/report.json",
      "sha256": "fba7b80ec4c78abe8a38880ba9b8508a5a73ea5a155e625115e2d95248bcae70"
    },
    "unit": {
      "passed": 3449,
      "failed": 0,
      "skipped": 5
    },
    "design": {
      "passed": 1510,
      "failed": 0,
      "skipped": 6
    },
    "browser": {
      "passed": 59,
      "failed": 0,
      "skipped": 0
    },
    "lint": {
      "runner": "eslint",
      "errors": 0,
      "warnings": 33
    }
  },
  "currentDeployments": {
    "web": {
      "id": "dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68",
      "url": "fitout-6nx1msej4-pengr3s-projects.vercel.app",
      "readyState": "READY",
      "target": "production",
      "revision": "b61cb4a43c8dd4c10e7444014fb66646aba36ec5"
    },
    "ops": {
      "id": "dpl_9QYdHByiE7JzzqnGW4qVMS5grYFQ",
      "url": "fitout-lpmejxoqp-pengr3s-projects.vercel.app",
      "readyState": "READY",
      "target": "production",
      "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802"
    },
    "financialSchedulerBaseline": {
      "id": "dpl_RrmvYS6fTKedEcQKk1cxYLEtKNqB",
      "url": "fitout-b08esines-pengr3s-projects.vercel.app",
      "readyState": "READY",
      "target": "production",
      "revision": "b61cb4a43c8dd4c10e7444014fb66646aba36ec5"
    }
  },
  "candidatePreview": {
    "web": {
      "id": "dpl_C9qrNjxKPHVk5jTsgvH1Cr9JFn9Q",
      "url": "fitout-mfuqlntu7-pengr3s-projects.vercel.app",
      "readyState": "READY",
      "target": null,
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5"
    },
    "ops": {
      "id": "dpl_CHPg7gJKmrFVKNUz6QaFgJL6b4TK",
      "url": "fitout-5wkztts9i-pengr3s-projects.vercel.app",
      "readyState": "READY",
      "target": null,
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5"
    }
  },
  "candidateTestOnlyProduction": [
    {
      "id": "dpl_Dw7CfRqiPVYunAasT5A3SeRWNm6o",
      "url": "fitout-2tdv1x7y7-pengr3s-projects.vercel.app",
      "readyState": "READY",
      "target": "production",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5"
    },
    {
      "id": "dpl_2GQFRsod2L9XsEegZJRKKRW7SMLT",
      "url": "fitout-kbxx0d3im-pengr3s-projects.vercel.app",
      "readyState": "READY",
      "target": "production",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5"
    }
  ],
  "candidatePermanentProductionPair": null,
  "sourceContinuity": {
    "path": "playwright/.cache/phase27-08/release-source-continuity-58897a94-20261011.json",
    "sha256": "baffe8f2b34a65d8c34b5a2284d2b1574378aa47fab145cda4d64f83ca871bdd"
  },
  "accountReadback": {
    "path": "playwright/.cache/phase27-08/release-source-account-final-readback-20261011.json",
    "sha256": "e7211a8b07f6ada09ce73e12cafd1332d9b256cca4b05336a81d859aeb80dc08"
  },
  "healthReadback": {
    "path": "playwright/.cache/phase27-08/release-source-health-final-20261011.json",
    "sha256": "6c491617eb8f0aed8b2d58df49076807f5f7d83302ec340dcdbf03985786801b"
  },
  "databaseReadback": {
    "path": "playwright/.cache/phase27-08/release-source-database-final-readback-20261011.json",
    "sha256": "1723ec59bab1687a610c50514573b67775bd634562028117967a84245d08bb2c"
  },
  "validation": {
    "path": "playwright/.cache/phase27-08/release-source-validation-20261011.json",
    "sha256": "fac845c3b92480e78d951fe3a567fc1fdbe210387e6d1a36f9f2bacaeea907d9"
  },
  "historicalCutoverApprovalPreserved": true,
  "completedBoundedIngressApprovalPreserved": true,
  "publicContactEnabled": false,
  "externalMutations": false,
  "phasePlanCounts": "20/21; curated144/151; all7requirements pending",
  "datedMatrixCount": 30,
  "singleReleaseAccepted": false
}
```

## Source and approval boundaries

| Source | Proven evidence | Scope still pending |
|---|---|---|
| `d67fbecf` | Original owner-approved Stage A/B/C cutover, six full gates/cold/A-B and 29 dated matrix observations; current Ops | These original observations do not certify a later candidate. |
| `b61cb4a4` | Current disabled web, separate automatic Contact jobs, scheduled synthetic alert delivery and owner inbox receipt/duplicate suppression | Synthetic alert is not the actual candidate exhaustion-to-alert chain or inquiry flow. |
| `58897a94` | Fresh six full gates, protected Preview pair, actual bounded Vercel A/B per-IP/forged-header ingress proof | No new disabled permanent Production pair, permanent candidate rollout authority or complete candidate-specific live matrix. |

All 30 payment/scheduler files match both original 36455580 and current web b61cb4a4 byte for byte. Migrations0034–0038 match b61cb4a4. The only runtime delta from b61cb4a4 is 15 lines in `src/lib/contact.ts`: anonymous no-mail evidence and an early return before transport during explicitly enabled verification. The PostgreSQL quota code is unchanged. This source comparison does not substitute for runtime/provider acceptance.

The older D67 verification is archived without relabeling, and its six raw gates are retained in validated review history. Original failed gates, retained attempts, cold/A-B reports and old approvals remain intact. The first direct-worktree attempt passed unit/design/types but lint was explicitly interrupted after traversing ignored old export copies; Turbopack rejected its external dependency junction and the browser correctly refused the failed-build precondition. All attempted logs/source captures and partial outcomes remain retained. No complete browser totals are invented. The accepted new six-gate run uses a fresh physical Git archive export, unchanged package source and the existing physical dependency copy moved between two verified owned export paths. This avoids both stale cache traversal and external junctions. Source captures were clean before and after every gate. The committed runner API executed its same six fixed jobs and all ordering, skip, source and log checks. One earlier duplicated dependency copy was removed only after a contained-path check, preserving its source archive, source files, logs and reports. No acceptance rule or application file changed.

The packet keeps the original D67 rollout approval and the completed58897a94 bounded ingress approval under their own scope. The latest instruction authorizes this preparation and explicitly keeps Contact disabled. A permanent candidate rollout and public inquiry are not claimed as executed or approved by these prior scopes. New disabled candidate Production builds are needed for any later source rollout; the two retained enabled no-mail test builds must not be used as ordinary disabled release targets.

## Verification and remaining execution

Prepared validator **PASS**. Deployed/live validators **FAIL**, with exact failures retained in the linked validation report: one candidate source is not yet serving both Production projects, the matrix retains its actual historical revisions, current exact candidate rollout authority is absent, and the real remaining acceptance gates are unchanged. These are evidence/acceptance failures; fresh public health checks passed.

Five matrix observations remain: staff-only customer capability denial; genuine previously issued valid verify link; genuine previously issued valid reset link; same-candidate quota exhaustion-to-automatic-alert chain; and full topology/session/provider rollback/threshold proof. Partial provider correspondence, actual Contact receipt/Reply-To/reply and release branch/promotion monitoring also remain. Stage C topology is already live; the revised rollout actions prepare a source update while preserving current origins and receivers. Do not rerun migrations, invoke financial jobs, relabel old observations or reverse healthy topology merely to fill a row.

Next concrete release work is a newly scoped exact disabled candidate Production pair, alias/provider readbacks and candidate-specific matrix collection, using the revised packet and exact baseline rollback pins. Any automated financial Inngest registration refresh must be reconciled without invoking its 14 functions. Public Contact remains false; a controlled inquiry/enablement has its separate scope.

Plan 09 remains incomplete; 20/21 phase plans and 144/151 curated plans. All seven requirements remain pending. The 30/35 count describes dated observations across sources, not single-release acceptance. Checkout, payout and legal HOLD remain.


The first physical export full run retained one unit failure: the Contact instance race overlapped a separate quota test that deliberately holds the same database advisory lock. Its isolated schemas did not isolate that lock. The accepted unit command uses an ignored, retained scheduling-only configuration based on the original config: all Contact files run sequentially after all other files run with four workers. Original and scheduled collection both contain exactly273 identical, unique file paths; every original assertion remains, with no new skips or timeout change. All3449 tests pass with the original5 skips. This follows [Vitest’s documented parallel and sequential groups](https://main.vitest.dev/guide/recipes/parallel-sequential.html). The exact config and both file censuses are retained under playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011 with the actual command arguments and source captures. This is a one-off verification harness fix; permanent repository scheduling remediation remains a planning finding, not a hidden production-source change.


Validation is executed from `C:/Users/Admin/.codex/worktrees/phase27-production-continuity/FitOut` with `node scripts/verify-phase27-evidence.mjs --stage prepared` (and the deployed/live stages). The canonical candidate verifier requires migration0037 for a replacement and preserves older unbound0034 captures. Its script digest is recorded in the validation report. The shared checkout remains on older application/verifier source and unrelated drafts; its default0034 verifier failure is retained in `playwright/.cache/phase27-08/release-source-shared-verifier-limitation-20261011.log` and the matching metadata JSON. That older checkout is not used to certify this candidate, and no verifier rule is changed by this reconciliation. Documentation commits are bookkeeping; the tested runtime candidate remains exact58897a94.
