# Phase 27 engineering evidence

Current reconciliation (2026-10-11T09:33:12.518Z): active engineering candidate is exact58897a94, manifest 8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a. All six fresh full gates pass. D67 is archived with its original source labels and logs. See27-RELEASE-SOURCE-RECONCILIATION.md. Earlier prose below is dated history.

Engineering preparation and live account facts remain separate. Full unit/design and the first full browser gate failed. A successful build/typecheck/lint is insufficient to claim the engineering contract complete. No checkout, payout, legal, provider, deployment or live mail release occurred.

October9 additional clean-source preparation is in
27-CLEAN-SOURCE-PREPARATION.md. It binds revision
1dcfa30712376a2a7573ea93be867ef4bf44ccfe and contemporaneous captures, preserving
the shared checkout and the historical records below. Full unit/design and
typecheck/build fail; lint and focused metadata/hosting-resume pass. No accepted
releaseCandidateVerification replacement or deployed proof is claimed. New
findings are in deferred-items.md under the user's unchanged-scope decision.

The October9 wrapper reused four old log filenames. Types/lint were recovered
from byte-identical retained copies; the original build/browser raw logs could
not be recovered. Those two historical records now explicitly use their already
committed bounded terminal summaries, retaining their original raw hashes and
actual results. New logs have unique clean-1dcfa307 names. Prepared consistency
validation passes under the existing honest terminal-transcript contract; neither
raw recovery nor deployment acceptance is fabricated.

```json
{
  "schemaVersion": 2,
  "recordedAt": "2026-10-08T21:09:30.1930675Z",
  "phaseExecutionBase": "edec99b89bffa62df9ba47b4cf85c12f96acfa3f",
  "planBase": "1afc5fc3b48d27bd292bbe96ecc11abe2944862a",
  "liveInboxProven": false,
  "engineeringAcceptance": "failed gates retained",
  "executionDisposition": {
    "status": "deferred-to-gap-planning",
    "decidedAt": "2026-10-09T06:39:40Z",
    "decisionSource": "direct-user",
    "scopeExpansion": false,
    "repairTiming": "After authorized execution, through proper gap planning",
    "gapLedger": ".planning/phases/27-app-subdomain-marketing-website/deferred-items.md",
    "effect": "Continue authorized in-scope preparation; retain failed results and all external, security, Contact and release prerequisites"
  },
  "finalSourceVerification": "Full unit/design precede final UI-only HostingIntent readiness repair. Subsequent focused activation unit10/10, real activation2/2, full types/lint/build and all51 owned browser cases pass. No claim that full unit/design passed.",
  "gates": [
    {
      "command": "node node_modules/vitest/vitest.mjs run",
      "startedAt": "2026-10-08T20:39:20.1956208Z",
      "finishedAt": "2026-10-08T20:44:38.9462328Z",
      "durationSeconds": 318.751,
      "exitCode": 1,
      "status": "fail",
      "result": "254 passed / 4 failed / 2 skipped files; 3304 passed / 8 failed / 5 skipped tests. Exit 1.",
      "evidenceKind": "raw-log",
      "rawLogAvailable": true,
      "rawLogPath": "playwright/.cache/phase27-08/final-unit.log",
      "logSha256": "d5488568cca638e393a7715b3ef09347c42771f2822c239d2bb98e07b9feabd8",
      "disposition": "Eight existing validation/date/availability/sweep fixture failures retained with execution-base and dirty-source attribution below; no policy changes. This full run predates last HostingIntent readiness safeguard; final focused activation unit 10/10 passes.",
      "resultData": {
        "runner": "vitest",
        "files": {
          "passed": 254,
          "failed": 4,
          "skipped": 2
        },
        "tests": {
          "passed": 3304,
          "failed": 8,
          "skipped": 5
        }
      },
      "terminalSummary": "Test Files  4 failed | 254 passed | 2 skipped (260)\nTests  8 failed | 3304 passed | 5 skipped (3317)",
      "testedSource": {
        "provenance": "unavailable",
        "revision": null,
        "dirty": true,
        "claim": "working-tree",
        "capturedAt": null,
        "manifest": null,
        "reason": "No source manifest/revision was captured before this historical gate; preserve the dirty-tree run and known source timing boundaries without inventing provenance."
      }
    },
    {
      "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts",
      "startedAt": "2026-10-08T20:48:47.8452428Z",
      "finishedAt": "2026-10-08T20:50:01.1399561Z",
      "durationSeconds": 73.2947133,
      "exitCode": 1,
      "status": "fail",
      "result": "83 passed / 7 failed files; 1497 passed / 9 failed / 6 skipped tests. Exit 1.",
      "evidenceKind": "raw-log",
      "rawLogAvailable": true,
      "rawLogPath": "playwright/.cache/phase27-08/final-design.log",
      "logSha256": "b8d77dc1ac80f107bc188e5d62099359dc22def8937212887f92773acb4cefdc",
      "disposition": "Nine remaining execution-base/source-fixture and preexisting host-map closure failures retained, exact attribution below. Repaired marketing census/origin/loading contracts pass. Full run predates final UI-only HostingIntent safeguard.",
      "resultData": {
        "runner": "vitest",
        "files": {
          "passed": 83,
          "failed": 7,
          "skipped": 0
        },
        "tests": {
          "passed": 1497,
          "failed": 9,
          "skipped": 6
        }
      },
      "terminalSummary": "Test Files  7 failed | 83 passed (90)\nTests  9 failed | 1497 passed | 6 skipped (1512)",
      "testedSource": {
        "provenance": "unavailable",
        "revision": null,
        "dirty": true,
        "claim": "working-tree",
        "capturedAt": null,
        "manifest": null,
        "reason": "No source manifest/revision was captured before this historical gate; preserve the dirty-tree run and known source timing boundaries without inventing provenance."
      }
    },
    {
      "command": "node node_modules/typescript/bin/tsc --noEmit",
      "startedAt": "2026-10-08T21:03:50.8534281Z",
      "finishedAt": "2026-10-08T21:04:00.0177262Z",
      "durationSeconds": 9.1642981,
      "exitCode": 0,
      "status": "pass",
      "result": "No source TypeScript diagnostics on final UI source. Exit 0.",
      "evidenceKind": "raw-log",
      "rawLogAvailable": true,
      "rawLogPath": "playwright/.cache/phase27-08/release-types.log",
      "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "resultData": {
        "runner": "typescript",
        "errors": 0
      },
      "terminalSummary": "No TypeScript diagnostics.",
      "testedSource": {
        "provenance": "unavailable",
        "revision": null,
        "dirty": true,
        "claim": "working-tree",
        "capturedAt": null,
        "manifest": null,
        "reason": "No source manifest/revision was captured before this historical gate; preserve the dirty-tree run and known source timing boundaries without inventing provenance."
      }
    },
    {
      "command": "node node_modules/eslint/bin/eslint.js .",
      "startedAt": "2026-10-08T21:04:30.7941689Z",
      "finishedAt": "2026-10-08T21:05:05.5873085Z",
      "durationSeconds": 34.7931396,
      "exitCode": 0,
      "status": "pass",
      "result": "0 errors / 34 warnings on final UI source. Exit 0.",
      "evidenceKind": "raw-log",
      "rawLogAvailable": true,
      "rawLogPath": "playwright/.cache/phase27-08/release-lint.log",
      "logSha256": "31404de6c292ac5f6d8d27e85ab6c1839ca57ddb1bdd31ca6bc181c821736d8e",
      "resultData": {
        "runner": "eslint",
        "errors": 0,
        "warnings": 34
      },
      "terminalSummary": "34 problems (0 errors, 34 warnings)",
      "testedSource": {
        "provenance": "unavailable",
        "revision": null,
        "dirty": true,
        "claim": "working-tree",
        "capturedAt": null,
        "manifest": null,
        "reason": "No source manifest/revision was captured before this historical gate; preserve the dirty-tree run and known source timing boundaries without inventing provenance."
      }
    },
    {
      "command": "node node_modules/next/dist/bin/next build",
      "startedAt": "2026-10-08T21:05:37.5864662Z",
      "finishedAt": "2026-10-08T21:06:49.9592448Z",
      "durationSeconds": 72.3727786,
      "exitCode": 0,
      "status": "pass",
      "result": "✓ Compiled successfully in 21.9s\n✓ Generating static pages using 7 workers (46/46) in 2.5s\nFinalizing page optimization ...",
      "evidenceKind": "terminal-transcript",
      "rawLogAvailable": false,
      "rawLogPath": null,
      "logSha256": "89b47651551094f9b9e28befb9088c54a0dbe2b021237a46040b62e7cd9d1d93",
      "resultData": {
        "runner": "next-build",
        "compiled": true,
        "generated": true,
        "errors": 0
      },
      "terminalSummary": "✓ Compiled successfully in 21.9s\n✓ Generating static pages using 7 workers (46/46) in 2.5s\nFinalizing page optimization ...",
      "testedSource": {
        "provenance": "unavailable",
        "revision": null,
        "dirty": true,
        "claim": "working-tree",
        "capturedAt": null,
        "manifest": null,
        "reason": "No source manifest/revision was captured before this historical gate; preserve the dirty-tree run and known source timing boundaries without inventing provenance."
      },
      "originalRawLogPath": "playwright/.cache/phase27-08/release-build.log",
      "originalRawLogSha256": "173824f56f60b17c34eb2c00a4a8f8026b25d62ebb6b7fe87e0f4826bcbadd38",
      "originalBoundedResult": "Production route generation completed on final UI source with isolated test DB, mail off and inert noncredential build markers. Exit 0.",
      "rawLogLoss": "October9 clean-preparation wrapper reused the historical filename and overwrote this raw log. No byte-identical retained copy was found. Original raw path/digest, actual command/timing/exit/totals and the already-committed terminalSummary remain; result now hashes that existing bounded terminal transcript, never reconstructed raw output. The new failed log is retained under a unique clean-1dcfa307 filename.",
      "transcriptSource": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe:27-ENGINEERING-EVIDENCE.md existing terminalSummary"
    },
    {
      "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts --project=chromium",
      "additionalArguments": "--workers=1",
      "startedAt": "2026-10-08T21:07:23.1325471Z",
      "finishedAt": "2026-10-08T21:09:30.1930675Z",
      "durationSeconds": 127.0605204,
      "exitCode": 0,
      "status": "pass",
      "result": "51 passed (2.1m)",
      "evidenceKind": "terminal-transcript",
      "rawLogAvailable": false,
      "rawLogPath": null,
      "logSha256": "d50430909832c387c5da169b67c563f7e4ff3046270e49d1b925f713ae40a7c6",
      "resultData": {
        "runner": "playwright",
        "tests": {
          "passed": 51,
          "failed": 0,
          "skipped": 0
        }
      },
      "terminalSummary": "51 passed (2.1m)",
      "testedSource": {
        "provenance": "unavailable",
        "revision": null,
        "dirty": true,
        "claim": "working-tree",
        "capturedAt": null,
        "manifest": null,
        "reason": "No source manifest/revision was captured before this historical gate; preserve the dirty-tree run and known source timing boundaries without inventing provenance."
      },
      "originalRawLogPath": "playwright/.cache/phase27-08/release-browser.log",
      "originalRawLogSha256": "6c317126d534d95a5e444935738edd021dd7dc47d4c1b9c545b2ea420008886b",
      "originalBoundedResult": "51 passed; no skipped/unrun owned case; normal runner/server teardown. All final UI source and actual local integration assertions pass.",
      "rawLogLoss": "October9 clean-preparation wrapper reused the historical filename and overwrote this raw log. No byte-identical retained copy was found. Original raw path/digest, actual command/timing/exit/totals and the already-committed terminalSummary remain; result now hashes that existing bounded terminal transcript, never reconstructed raw output. The new failed log is retained under a unique clean-1dcfa307 filename.",
      "transcriptSource": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe:27-ENGINEERING-EVIDENCE.md existing terminalSummary"
    }
  ],
  "initialFullGates": [
    {
      "evidenceKind": "terminal-transcript",
      "rawLogAvailable": false,
      "rawLogLoss": "Original logs were mistakenly placed inside Playwright outputDir and deleted at browser startup; only actual terminal outputs preserved in the task transcript remain. Digest below authenticates this saved bounded result, not the lost raw log.",
      "command": "node node_modules/vitest/vitest.mjs run",
      "startedAt": "2026-10-08T19:35:38Z",
      "finishedAt": "2026-10-08T19:41:13Z",
      "durationSeconds": 335.1655125,
      "exitCode": 1,
      "status": "fail",
      "result": "7 failed files, 251 passed, 2 skipped; 17 failed tests, 3294 passed, 5 skipped. Exit 1.",
      "logSha256": "6e630b877eed930eff03a10763db946dc017339b03e7d2694acb3646e5b52ab7",
      "disposition": "Auth host/preview fixtures phase drift; checkout date and validation/availability/payout failures unresolved. Focused auth repair subsequently passes 18 tests. Full unit remains failed until a complete rerun."
    },
    {
      "evidenceKind": "terminal-transcript",
      "rawLogAvailable": false,
      "rawLogLoss": "Original logs were mistakenly placed inside Playwright outputDir and deleted at browser startup; only actual terminal outputs preserved in the task transcript remain. Digest below authenticates this saved bounded result, not the lost raw log.",
      "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts",
      "startedAt": "2026-10-08T19:41:38.7350878Z",
      "finishedAt": "2026-10-08T19:42:58.2402744Z",
      "durationSeconds": 79.4992751,
      "exitCode": 1,
      "status": "fail",
      "result": "12 failed files, 78 passed; 18 failed tests, 1487 passed, 6 skipped. Exit 1.",
      "logSha256": "a1ea888b70c7fd3d2789aa7249e9df48e1eb363bbf9ac3d2321ab19d5c574377",
      "disposition": "Source/census drift includes missing async start-hosting loading boundary (repaired); preexisting dirty public fallback still fails exact box contract. Other failures require phase-base vs dirty-source classification. Full design remains failed."
    },
    {
      "evidenceKind": "terminal-transcript",
      "rawLogAvailable": false,
      "rawLogLoss": "Original logs were mistakenly placed inside Playwright outputDir and deleted at browser startup; only actual terminal outputs preserved in the task transcript remain. Digest below authenticates this saved bounded result, not the lost raw log.",
      "command": "node node_modules/typescript/bin/tsc --noEmit",
      "startedAt": "2026-10-08T19:44:33.4891488Z",
      "finishedAt": "2026-10-08T19:44:42.4028535Z",
      "durationSeconds": 8.9068804,
      "exitCode": 0,
      "status": "pass",
      "result": "No TypeScript diagnostics. Exit 0.",
      "logSha256": "f6c99df9b12df76094aef7a560770b0cab3cd03e11eb16c6597842c19021c38f"
    },
    {
      "evidenceKind": "terminal-transcript",
      "rawLogAvailable": false,
      "rawLogLoss": "Original logs were mistakenly placed inside Playwright outputDir and deleted at browser startup; only actual terminal outputs preserved in the task transcript remain. Digest below authenticates this saved bounded result, not the lost raw log.",
      "command": "node node_modules/eslint/bin/eslint.js .",
      "startedAt": "2026-10-08T19:44:54.5645307Z",
      "finishedAt": "2026-10-08T19:45:30.5722669Z",
      "durationSeconds": 36.0011907,
      "exitCode": 0,
      "status": "pass",
      "result": "0 errors, 33 warnings. Exit 0.",
      "logSha256": "d0ba5c9f5762929a2a1863ce09148dd636a128caca702c1424196b8de30b8cc6"
    },
    {
      "evidenceKind": "terminal-transcript",
      "rawLogAvailable": false,
      "rawLogLoss": "Original logs were mistakenly placed inside Playwright outputDir and deleted at browser startup; only actual terminal outputs preserved in the task transcript remain. Digest below authenticates this saved bounded result, not the lost raw log.",
      "command": "node node_modules/next/dist/bin/next build",
      "startedAt": "2026-10-08T19:49:30.5625598Z",
      "finishedAt": "2026-10-08T19:50:41.6140356Z",
      "durationSeconds": 71.095594,
      "exitCode": 0,
      "status": "pass",
      "result": "Next production build completed route generation. Exit 0.",
      "logSha256": "6d48079d1405522ba04c6b02a059c9e2b7d52ef0c188ec4f9d943e722d970ae2"
    },
    {
      "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts --project=chromium",
      "additionalArguments": "--workers=1",
      "startedAt": "2026-10-08T19:58:20.2471558Z",
      "finishedAt": "2026-10-08T20:01:01.1472636Z",
      "durationSeconds": 160.9179361,
      "exitCode": 1,
      "status": "fail",
      "result": "38 passed, 8 failed, 46 total. Root metadata serialization fixture (4), local listener redirect fixture (1), actual unhydrated signup/password native GET (2), intermittent approved /new 404 (1). No teardown intervention.",
      "evidenceKind": "raw-log",
      "rawLogAvailable": true,
      "rawLogPath": "playwright/.cache/phase27-08/browser.log",
      "logSha256": "52e8b5a534523a854105321148a9734ad70ca443c84dd8389e9de70f0f6ca9e6",
      "disposition": "Meaningful parsed URL comparison corrected; real image decode RED added. Narrow screenshot/listener/auth repairs and real draft assertion prepared; latest complete browser verification pending. Native GET failures are not called application success."
    }
  ],
  "sourceProvenanceNotice": "These retained historical six gates ran on the preserved dirty shared working tree. No source manifest/revision capture was made at execution time; source identity is explicitly unavailable, not reconstructed from today's tree. They do not establish a clean candidate or deployed SHA. Review-fix verification captures scoped file hashes before execution separately; historic full-suite failures remain.",
  "reviewFixVerification": {
    "recordedAt": "2026-10-08T22:15:22Z",
    "checkout": "main-shared-checkout",
    "worktrees": false,
    "claim": "preserved-dirty-working-tree-only",
    "sourceContext": "Snapshots were captured before each gate. Unit security/product source is unchanged since CR-01/WR-01. Validator snapshot parsing and synthetic-isolation refinements followed the 147-test run and initial types/lint. Final production build and 52-case browser use HEAD 9859a5c with preserved unrelated dirty changes. Generated next-env.d.ts changes are included in later contexts. No clean candidate/deployed SHA validation or execution attestation.",
    "gates": [
      {
        "startedAt": "2026-10-08T21:49:47.9296780Z",
        "finishedAt": "2026-10-08T21:49:59.7329913Z",
        "durationSeconds": 11.8033133,
        "exitCode": 0,
        "command": "node node_modules/vitest/vitest.mjs run tests/auth/capability-role-policy.test.ts tests/auth/capability-activate.test.ts tests/auth/hosting-intent.test.tsx tests/auth/hosting-resume.test.tsx tests/contact/contact-form.test.tsx tests/contact/contact-route.test.ts tests/ops/grant-cli.test.ts tests/ops/staff-policy.test.ts tests/ops/staff-invitation.test.ts",
        "status": "pass",
        "result": "Test Files  9 passed (9)\nTests  147 passed (147)\nExit 0.",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 9,
            "failed": 0,
            "skipped": 0
          },
          "tests": {
            "passed": 147,
            "failed": 0,
            "skipped": 0
          }
        },
        "terminalSummary": "Test Files  9 passed (9)\nTests  147 passed (147)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/review-final-unit.log",
        "logSha256": "ed382c22db5d6631f07fbf9d7cbfb6d782c3166204e1c6fa80c09361912913bf",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/review-source-01.json",
          "sha256": "5ab763d6e7101405fc83dd332e18799e9a3431484f5104b8932cd0ae3ec889d9",
          "revision": "c22f3d61c9b63ea4838c7cfa88e5c165085841d8",
          "dirty": true,
          "claim": "working-tree",
          "capturedAt": "2026-10-08T21:49:42.927Z",
          "manifestSha256": "3462392416784c71074f47a31f2acee9c3eb3aa94ad9ed8c9e4a709fbd91f9ca"
        }
      },
      {
        "startedAt": "2026-10-08T21:52:51.6143037Z",
        "finishedAt": "2026-10-08T21:52:51.9725719Z",
        "durationSeconds": 0.3582682,
        "exitCode": 0,
        "command": "node --test tests/scripts/phase27-evidence.test.mjs",
        "status": "pass",
        "result": "ℹ pass 86\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nExit 0.",
        "resultData": {
          "runner": "node-test",
          "tests": {
            "passed": 86,
            "failed": 0,
            "skipped": 0
          }
        },
        "terminalSummary": "ℹ pass 86\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/review-final-fixtures.log",
        "logSha256": "759cca06c430a8ff1b96c3da3dd4a099b8ab29f6e4553b6e932fe41f48419cb2",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/review-source-02.json",
          "sha256": "951d882885350dd84a29831a5f88078d46c41d8e83a51dcb157d09ea2bee4884",
          "revision": "821af3f74340f4c785985797299b41bf02eecbdb",
          "dirty": true,
          "claim": "working-tree",
          "capturedAt": "2026-10-08T21:52:46.833Z",
          "manifestSha256": "f4a5b06dcda9a20f36f941bbfede0250a1131503fa7c6be6d7a40cd5b182681e"
        }
      },
      {
        "startedAt": "2026-10-08T21:53:43.7961326Z",
        "finishedAt": "2026-10-08T21:54:18.6860072Z",
        "durationSeconds": 34.8898746,
        "exitCode": 0,
        "command": "node node_modules/eslint/bin/eslint.js .",
        "status": "pass",
        "result": "34 problems (0 errors, 34 warnings)\nExit 0.",
        "resultData": {
          "runner": "eslint",
          "errors": 0,
          "warnings": 34
        },
        "terminalSummary": "34 problems (0 errors, 34 warnings)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/review-final-lint.log",
        "logSha256": "31404de6c292ac5f6d8d27e85ab6c1839ca57ddb1bdd31ca6bc181c821736d8e",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/review-source-04.json",
          "sha256": "29c6aab099316b2a74aef001fd7ccc416cde9c5825aaa574321e6e84fef1db18",
          "revision": "821af3f74340f4c785985797299b41bf02eecbdb",
          "dirty": true,
          "claim": "working-tree",
          "capturedAt": "2026-10-08T21:53:39.023Z",
          "manifestSha256": "a702247e5af107209ee6accbcd39a09c3033ce22ba4fff356ab8ecdefe8651ab"
        }
      },
      {
        "startedAt": "2026-10-08T21:55:00.1727892Z",
        "finishedAt": "2026-10-08T21:55:01.4661530Z",
        "durationSeconds": 1.2933638,
        "exitCode": 1,
        "command": "node --env-file=.env.local node_modules/next/dist/bin/next build",
        "status": "fail",
        "result": "> Build error occurred\nError: Initiated Worker with invalid NODE_OPTIONS env variable: --env-file= is not allowed in NODE_OPTIONS\nExit 1.",
        "resultData": {
          "runner": "next-build",
          "compiled": false,
          "generated": false,
          "errors": 2
        },
        "terminalSummary": "> Build error occurred\nError: Initiated Worker with invalid NODE_OPTIONS env variable: --env-file= is not allowed in NODE_OPTIONS",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/review-final-build.log",
        "logSha256": "3c23c2c6cda679af77ef06bfc98445200535d6232a5d733b8c239bcbe8f68de3",
        "disposition": "The wrapper passed node --env-file=.env.local; Next workers reject that inherited NODE_OPTIONS flag. Corrected to canonical Next CLI, which loads .env.local itself. No product source changed.",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/review-source-05.json",
          "sha256": "06498f37ddb5a28bdedfc83311056ed711b7f5c019ad429b3e9869ff1a68e11c",
          "revision": "821af3f74340f4c785985797299b41bf02eecbdb",
          "dirty": true,
          "claim": "working-tree",
          "capturedAt": "2026-10-08T21:54:55.376Z",
          "manifestSha256": "a702247e5af107209ee6accbcd39a09c3033ce22ba4fff356ab8ecdefe8651ab"
        }
      },
      {
        "startedAt": "2026-10-08T21:55:41.7071526Z",
        "finishedAt": "2026-10-08T21:56:08.8929972Z",
        "durationSeconds": 27.1858446,
        "exitCode": 1,
        "command": "node node_modules/next/dist/bin/next build",
        "status": "fail",
        "result": "> Build error occurred\nError: Turbopack build failed with 2 errors:\nExit 1.",
        "resultData": {
          "runner": "next-build",
          "compiled": false,
          "generated": false,
          "errors": 2
        },
        "terminalSummary": "> Build error occurred\nError: Turbopack build failed with 2 errors:",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/review-final-build-retry.log",
        "logSha256": "1db0232f3d7cebd692cffb8f8cb0e03b70f8ef1e60bc887825b683fe619cba76",
        "disposition": "Canonical build failed only fetching Geist and Geist Mono from official Google Fonts in the sandbox. A separately recorded authorized font-fetch retry follows; no source or font substitution.",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/review-source-05b.json",
          "sha256": "d96bd240c9747b8e2b2b641f71ad0ecaabf7e99b5d16c5ba68ebdf77d2e15499",
          "revision": "821af3f74340f4c785985797299b41bf02eecbdb",
          "dirty": true,
          "claim": "working-tree",
          "capturedAt": "2026-10-08T21:55:36.728Z",
          "manifestSha256": "a702247e5af107209ee6accbcd39a09c3033ce22ba4fff356ab8ecdefe8651ab"
        }
      },
      {
        "startedAt": "2026-10-08T21:57:27.7257416Z",
        "finishedAt": "2026-10-08T21:58:30.9692668Z",
        "durationSeconds": 63.2435252,
        "exitCode": 1,
        "command": "node node_modules/next/dist/bin/next build",
        "status": "fail",
        "result": "✓ Compiled successfully in 21.0s\nFailed to type check.\nType error: Type 'Route' does not satisfy the constraint 'LayoutRoutes'.\nExit 1.",
        "resultData": {
          "runner": "next-build",
          "compiled": true,
          "generated": false,
          "errors": 2
        },
        "terminalSummary": "✓ Compiled successfully in 21.0s\nFailed to type check.\nType error: Type 'Route' does not satisfy the constraint 'LayoutRoutes'.",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/review-final-build-font-retry.log",
        "logSha256": "beca5ff8ec87cbc7852ae5a0852ca38071427e282f205608a62d964b181f15a3",
        "disposition": "Official-font network retry compiled successfully but failed on stale ignored .next/dev/types '/%5Fops-auth' definitions conflicting with canonical production types. Only the two confirmed ignored stale type files were removed, followed by canonical typegen; no product source or type suppression.",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/review-source-05d.json",
          "sha256": "4a6297ee771903dfa8b23cbca921f6a0951f8335908ed920fd102de5311970f7",
          "revision": "821af3f74340f4c785985797299b41bf02eecbdb",
          "dirty": true,
          "claim": "working-tree",
          "capturedAt": "2026-10-08T21:57:27.638Z",
          "manifestSha256": "a702247e5af107209ee6accbcd39a09c3033ce22ba4fff356ab8ecdefe8651ab"
        }
      },
      {
        "startedAt": "2026-10-08T22:01:47.1094888Z",
        "finishedAt": "2026-10-08T22:02:56.6334281Z",
        "durationSeconds": 69.5239393,
        "exitCode": 1,
        "command": "node node_modules/next/dist/bin/next build",
        "status": "fail",
        "result": "✓ Compiled successfully in 24.6s\nError: PAYMONGO_WEBHOOK_SECRET is required in production — the webhook is the sole booking-confirm authority (D-57).\n> Build error occurred\nError: Failed to collect page data for /api/paymongo/webhook\nExit 1.",
        "resultData": {
          "runner": "next-build",
          "compiled": true,
          "generated": false,
          "errors": 3
        },
        "terminalSummary": "✓ Compiled successfully in 24.6s\nError: PAYMONGO_WEBHOOK_SECRET is required in production — the webhook is the sole booking-confirm authority (D-57).\n> Build error occurred\nError: Failed to collect page data for /api/paymongo/webhook",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/review-final-build-generated-retry.log",
        "logSha256": "114f0a8b1aceec137d183a1160a829d814899ac8b32d219d14ef40eb72967bce",
        "disposition": "Build compiled and typechecked but page collection correctly refused missing PAYMONGO_WEBHOOK_SECRET after the harness set it empty. Subsequent retry uses inert noncredential signing markers; no guard/source change or provider call.",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/review-source-05e.json",
          "sha256": "a308969de90a1d280ee23ab94f8f67b144b3af57c5a91f057ec984acd1f9347a",
          "revision": "9859a5ceb35267e8a5236694a9f06ad17354417d",
          "dirty": true,
          "claim": "working-tree",
          "capturedAt": "2026-10-08T22:01:47.021Z",
          "manifestSha256": "4007db526661e3935294b05b3378ba811ca19fa05e961cbe9d6e881f5ec0c3ae"
        }
      },
      {
        "startedAt": "2026-10-08T22:04:19.0626811Z",
        "finishedAt": "2026-10-08T22:05:30.4300397Z",
        "durationSeconds": 71.3673586,
        "exitCode": 0,
        "command": "node node_modules/next/dist/bin/next build",
        "status": "pass",
        "result": "✓ Compiled successfully in 23.0s\n✓ Generating static pages using 7 workers (46/46) in 1935ms\nFinalizing page optimization ...\nExit 0.",
        "resultData": {
          "runner": "next-build",
          "compiled": true,
          "generated": true,
          "errors": 0
        },
        "terminalSummary": "✓ Compiled successfully in 23.0s\n✓ Generating static pages using 7 workers (46/46) in 1935ms\nFinalizing page optimization ...",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/review-final-build-guards-retry.log",
        "logSha256": "2d75976cd0aab705f419e90181bcdea1479821e646df8265dc7b1f8765fb0eb3",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/review-source-05f.json",
          "sha256": "b192350f5be3ef77f3e5d42f6b4a0e55ffcfa5854fbef8e37850619583735f9c",
          "revision": "9859a5ceb35267e8a5236694a9f06ad17354417d",
          "dirty": true,
          "claim": "working-tree",
          "capturedAt": "2026-10-08T22:04:18.977Z",
          "manifestSha256": "4007db526661e3935294b05b3378ba811ca19fa05e961cbe9d6e881f5ec0c3ae"
        }
      },
      {
        "startedAt": "2026-10-08T22:08:56.9779268Z",
        "finishedAt": "2026-10-08T22:13:00.3050046Z",
        "durationSeconds": 243.3270778,
        "exitCode": 0,
        "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts --project=chromium --workers=1",
        "status": "pass",
        "result": "52 passed (4.0m)\nExit 0.",
        "resultData": {
          "runner": "playwright",
          "tests": {
            "passed": 52,
            "failed": 0,
            "skipped": 0
          }
        },
        "terminalSummary": "52 passed (4.0m)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/review-final-browser.log",
        "logSha256": "9aa3f6e47206bea814c752fbe9dfa1624078c60107c33f212821ca33846806f6",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/review-source-06.json",
          "sha256": "f0aaacab940878275eb3c5bb06dda17a0e5a0c55740a1609e606a62edcfc791b",
          "revision": "9859a5ceb35267e8a5236694a9f06ad17354417d",
          "dirty": true,
          "claim": "working-tree",
          "capturedAt": "2026-10-08T22:08:41.857Z",
          "manifestSha256": "4007db526661e3935294b05b3378ba811ca19fa05e961cbe9d6e881f5ec0c3ae"
        }
      },
      {
        "startedAt": "2026-10-08T22:13:32.9008217Z",
        "finishedAt": "2026-10-08T22:13:33.3246680Z",
        "durationSeconds": 0.4238463,
        "exitCode": 0,
        "command": "node --test tests/scripts/phase27-evidence.test.mjs",
        "status": "pass",
        "result": "ℹ pass 87\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nExit 0.",
        "resultData": {
          "runner": "node-test",
          "tests": {
            "passed": 87,
            "failed": 0,
            "skipped": 0
          }
        },
        "terminalSummary": "ℹ pass 87\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/review-final-fixtures-refined.log",
        "logSha256": "7e3525ffbebcb8b8669308c52d2b43b2294ba783145456f1e4e256e454e9812f",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/review-source-07.json",
          "sha256": "0f775db69fccdd43871404e366daef28ed6403afe055158f1fa73d9ea384db67",
          "revision": "9859a5ceb35267e8a5236694a9f06ad17354417d",
          "dirty": true,
          "claim": "working-tree",
          "capturedAt": "2026-10-08T22:13:16.285Z",
          "manifestSha256": "915b5b766a233d11dcf055f12f6c53bf47f12188e9463e55ddab3b93e52f5212"
        }
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run",
        "startedAt": "2026-10-09T15:05:15.675Z",
        "finishedAt": "2026-10-09T15:12:37.878Z",
        "durationSeconds": 442.203,
        "exitCode": 1,
        "status": "fail",
        "result": "Test Files  2 failed | 257 passed | 2 skipped (261)\nTests  17 failed | 3326 passed | 5 skipped (3348)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 257,
            "failed": 2,
            "skipped": 2
          },
          "tests": {
            "passed": 3326,
            "failed": 17,
            "skipped": 5
          }
        },
        "terminalSummary": "Test Files  2 failed | 257 passed | 2 skipped (261)\nTests  17 failed | 3326 passed | 5 skipped (3348)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-77ba1254-c40637c5-421d-4362-8cf2-4d37ed889cf8/gates/unit.log",
        "logSha256": "4e7a420be73eebaa60b5ee880975ad1f4756d8db56caccbc586242a5660a8ad2",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-77ba1254-c40637c5-421d-4362-8cf2-4d37ed889cf8/gates/unit-source.json",
          "sha256": "228b7d1401b2249b6ca0501a780e1e4d2191c102f251ac7c39d0527b0c5b1c17",
          "revision": "77ba1254e52d4269d84141afb8f779519fdd4753",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T15:05:15.648Z",
          "manifestSha256": "482f59a9e28eeb6e3ba7db5c71ceeec4b346c57fb129dd78032c93f6901ea24e"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": false,
        "disposition": "October9 first revised built-server full attempt retained. Unit17/design3/browser3 failures are genuine; types/lint/build pass and source guards pass. Fixture and stale-contract remedies require a new complete same-SHA run; no candidate acceptance inferred."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts",
        "startedAt": "2026-10-09T15:12:41.585Z",
        "finishedAt": "2026-10-09T15:13:57.396Z",
        "durationSeconds": 75.811,
        "exitCode": 1,
        "status": "fail",
        "result": "Test Files  3 failed | 88 passed (91)\nTests  3 failed | 1507 passed | 6 skipped (1516)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 88,
            "failed": 3,
            "skipped": 0
          },
          "tests": {
            "passed": 1507,
            "failed": 3,
            "skipped": 6
          }
        },
        "terminalSummary": "Test Files  3 failed | 88 passed (91)\nTests  3 failed | 1507 passed | 6 skipped (1516)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-77ba1254-c40637c5-421d-4362-8cf2-4d37ed889cf8/gates/design.log",
        "logSha256": "ef93fe1ada8f28dba765df4f07dc209b7a70fb4e461abad5fa4dc14cd3cb58b2",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-77ba1254-c40637c5-421d-4362-8cf2-4d37ed889cf8/gates/design-source.json",
          "sha256": "1bd0703d1084259bd245f2283b4ad070b2b51e14b40180b54afea8115f590d06",
          "revision": "77ba1254e52d4269d84141afb8f779519fdd4753",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T15:12:41.565Z",
          "manifestSha256": "482f59a9e28eeb6e3ba7db5c71ceeec4b346c57fb129dd78032c93f6901ea24e"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": false,
        "disposition": "October9 first revised built-server full attempt retained. Unit17/design3/browser3 failures are genuine; types/lint/build pass and source guards pass. Fixture and stale-contract remedies require a new complete same-SHA run; no candidate acceptance inferred."
      },
      {
        "command": "node node_modules/typescript/bin/tsc --noEmit",
        "startedAt": "2026-10-09T15:14:00.687Z",
        "finishedAt": "2026-10-09T15:15:07.834Z",
        "durationSeconds": 67.147,
        "exitCode": 0,
        "status": "pass",
        "result": "No TypeScript diagnostics.",
        "resultData": {
          "runner": "typescript",
          "errors": 0
        },
        "terminalSummary": "No TypeScript diagnostics.",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-77ba1254-c40637c5-421d-4362-8cf2-4d37ed889cf8/gates/types.log",
        "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-77ba1254-c40637c5-421d-4362-8cf2-4d37ed889cf8/gates/types-source.json",
          "sha256": "55900eb91050dd8f8c75eda4941753272397ce98c448616c804ce25e8cc91252",
          "revision": "77ba1254e52d4269d84141afb8f779519fdd4753",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T15:14:00.667Z",
          "manifestSha256": "482f59a9e28eeb6e3ba7db5c71ceeec4b346c57fb129dd78032c93f6901ea24e"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "October9 first revised built-server full attempt retained. Unit17/design3/browser3 failures are genuine; types/lint/build pass and source guards pass. Fixture and stale-contract remedies require a new complete same-SHA run; no candidate acceptance inferred."
      },
      {
        "command": "node node_modules/eslint/bin/eslint.js .",
        "startedAt": "2026-10-09T15:15:10.915Z",
        "finishedAt": "2026-10-09T15:16:50.680Z",
        "durationSeconds": 99.765,
        "exitCode": 0,
        "status": "pass",
        "result": "33 problems (0 errors, 33 warnings)",
        "resultData": {
          "runner": "eslint",
          "errors": 0,
          "warnings": 33
        },
        "terminalSummary": "33 problems (0 errors, 33 warnings)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-77ba1254-c40637c5-421d-4362-8cf2-4d37ed889cf8/gates/lint.log",
        "logSha256": "651b63c72e5fa670482c028ea304b00c352dcbfa2d4744eb5ffd9a9891a98c52",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-77ba1254-c40637c5-421d-4362-8cf2-4d37ed889cf8/gates/lint-source.json",
          "sha256": "ef06dbf7e0556ac07b3a25183bfd1f51c7c5d2e0e74b5b169c9e0f6cd155d94d",
          "revision": "77ba1254e52d4269d84141afb8f779519fdd4753",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T15:15:10.896Z",
          "manifestSha256": "482f59a9e28eeb6e3ba7db5c71ceeec4b346c57fb129dd78032c93f6901ea24e"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "October9 first revised built-server full attempt retained. Unit17/design3/browser3 failures are genuine; types/lint/build pass and source guards pass. Fixture and stale-contract remedies require a new complete same-SHA run; no candidate acceptance inferred."
      },
      {
        "command": "node node_modules/next/dist/bin/next build",
        "startedAt": "2026-10-09T15:16:54.404Z",
        "finishedAt": "2026-10-09T15:18:20.639Z",
        "durationSeconds": 86.235,
        "exitCode": 0,
        "status": "pass",
        "result": "✓ Compiled successfully in 40s\n✓ Generating static pages using 7 workers (46/46) in 4.1s\nFinalizing page optimization ...",
        "resultData": {
          "runner": "next-build",
          "compiled": true,
          "generated": true,
          "errors": 0
        },
        "terminalSummary": "✓ Compiled successfully in 40s\n✓ Generating static pages using 7 workers (46/46) in 4.1s\nFinalizing page optimization ...",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-77ba1254-c40637c5-421d-4362-8cf2-4d37ed889cf8/gates/build.log",
        "logSha256": "941d444a63cf9839bf7eda8eb0ec5b50117ab1719362c8de48ac2d291b334211",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-77ba1254-c40637c5-421d-4362-8cf2-4d37ed889cf8/gates/build-source.json",
          "sha256": "cf1114cdef58f1a3d0dd7862acd43545deec308dd5b05dd7cd3519a974323e64",
          "revision": "77ba1254e52d4269d84141afb8f779519fdd4753",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T15:16:54.384Z",
          "manifestSha256": "482f59a9e28eeb6e3ba7db5c71ceeec4b346c57fb129dd78032c93f6901ea24e"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "October9 first revised built-server full attempt retained. Unit17/design3/browser3 failures are genuine; types/lint/build pass and source guards pass. Fixture and stale-contract remedies require a new complete same-SHA run; no candidate acceptance inferred."
      },
      {
        "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --project=chromium --workers=1",
        "startedAt": "2026-10-09T15:18:24.274Z",
        "finishedAt": "2026-10-09T15:19:56.872Z",
        "durationSeconds": 92.598,
        "exitCode": 1,
        "status": "fail",
        "result": "3 failed\n56 passed (1.5m)",
        "resultData": {
          "runner": "playwright",
          "tests": {
            "passed": 56,
            "failed": 3,
            "skipped": 0
          }
        },
        "terminalSummary": "3 failed\n56 passed (1.5m)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-77ba1254-c40637c5-421d-4362-8cf2-4d37ed889cf8/gates/browser.log",
        "logSha256": "d7bcf79faf1974891afae932052b6dea8184cbc2d745ef65dc8550f31fd062d3",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-77ba1254-c40637c5-421d-4362-8cf2-4d37ed889cf8/gates/browser-source.json",
          "sha256": "fe343de8e7103617ff4dc4da1ad67daed063d11dcaa479a51a302ac04f903fb9",
          "revision": "77ba1254e52d4269d84141afb8f779519fdd4753",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T15:18:24.252Z",
          "manifestSha256": "482f59a9e28eeb6e3ba7db5c71ceeec4b346c57fb129dd78032c93f6901ea24e"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": false,
        "disposition": "October9 first revised built-server full attempt retained. Unit17/design3/browser3 failures are genuine; types/lint/build pass and source guards pass. Fixture and stale-contract remedies require a new complete same-SHA run; no candidate acceptance inferred."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run",
        "startedAt": "2026-10-09T15:32:58.213Z",
        "finishedAt": "2026-10-09T15:39:55.689Z",
        "durationSeconds": 417.476,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  259 passed | 2 skipped (261)\nTests  3343 passed | 5 skipped (3348)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 259,
            "failed": 0,
            "skipped": 2
          },
          "tests": {
            "passed": 3343,
            "failed": 0,
            "skipped": 5
          }
        },
        "terminalSummary": "Test Files  259 passed | 2 skipped (261)\nTests  3343 passed | 5 skipped (3348)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/unit.log",
        "logSha256": "b8977d3b02b08bfadf937d7b518df913d2ee9213493b3a24fb8aa93e5d39e2b6",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/unit-source.json",
          "sha256": "9e0da75dfa8bbfc1e82de4d783d0630543694f3fbb4bc5a4db81eaebb71ed542",
          "revision": "596b47460282d756a1a5882c4c2d86f18b7ff851",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T15:32:58.194Z",
          "manifestSha256": "df0862eacdc3b9e1a57419bc03b8fee0ac3d3e539600418b81b772a5fa2137f4"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "--maxWorkers=4",
        "executedCommand": "node node_modules/vitest/vitest.mjs run --maxWorkers=4",
        "commandRepresentation": "Canonical command and additionalArguments per retained schema; executedCommand and original raw record/report retain complete actual argv and ordering."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts",
        "startedAt": "2026-10-09T15:39:59.588Z",
        "finishedAt": "2026-10-09T15:41:45.361Z",
        "durationSeconds": 105.773,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 91,
            "failed": 0,
            "skipped": 0
          },
          "tests": {
            "passed": 1510,
            "failed": 0,
            "skipped": 6
          }
        },
        "terminalSummary": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/design.log",
        "logSha256": "ca95fcda8227964e9088912e8f2dd1c4fc7012081690d0573bcb6b4694d1ee84",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/design-source.json",
          "sha256": "e1f4d7cbae2cc24042cd5cdf7d3d59b942d0df9374f635cfb0cb295934018d73",
          "revision": "596b47460282d756a1a5882c4c2d86f18b7ff851",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T15:39:59.567Z",
          "manifestSha256": "df0862eacdc3b9e1a57419bc03b8fee0ac3d3e539600418b81b772a5fa2137f4"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "--maxWorkers=2",
        "executedCommand": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts --maxWorkers=2",
        "commandRepresentation": "Canonical command and additionalArguments per retained schema; executedCommand and original raw record/report retain complete actual argv and ordering."
      },
      {
        "command": "node node_modules/typescript/bin/tsc --noEmit",
        "startedAt": "2026-10-09T15:41:48.632Z",
        "finishedAt": "2026-10-09T15:42:54.730Z",
        "durationSeconds": 66.098,
        "exitCode": 0,
        "status": "pass",
        "result": "No TypeScript diagnostics.",
        "resultData": {
          "runner": "typescript",
          "errors": 0
        },
        "terminalSummary": "No TypeScript diagnostics.",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/types.log",
        "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/types-source.json",
          "sha256": "22321da267a9c7499a0e33053488d00f0b0652df4e981814580b39929bcc432d",
          "revision": "596b47460282d756a1a5882c4c2d86f18b7ff851",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T15:41:48.613Z",
          "manifestSha256": "df0862eacdc3b9e1a57419bc03b8fee0ac3d3e539600418b81b772a5fa2137f4"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "",
        "executedCommand": "node node_modules/typescript/bin/tsc --noEmit",
        "commandRepresentation": "Canonical command and additionalArguments per retained schema; executedCommand and original raw record/report retain complete actual argv and ordering."
      },
      {
        "command": "node node_modules/eslint/bin/eslint.js .",
        "startedAt": "2026-10-09T15:42:57.872Z",
        "finishedAt": "2026-10-09T15:44:24.274Z",
        "durationSeconds": 86.402,
        "exitCode": 0,
        "status": "pass",
        "result": "33 problems (0 errors, 33 warnings)",
        "resultData": {
          "runner": "eslint",
          "errors": 0,
          "warnings": 33
        },
        "terminalSummary": "33 problems (0 errors, 33 warnings)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/lint.log",
        "logSha256": "c85b6c62a50847bebe2e99cb093ae4fc9d9d938ca7eeef2b6454d289de63d76d",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/lint-source.json",
          "sha256": "a70d67f36d7e91cb4e2d1969758b4aa14020e893ede8bc08407e477f9f2202d2",
          "revision": "596b47460282d756a1a5882c4c2d86f18b7ff851",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T15:42:57.854Z",
          "manifestSha256": "df0862eacdc3b9e1a57419bc03b8fee0ac3d3e539600418b81b772a5fa2137f4"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "",
        "executedCommand": "node node_modules/eslint/bin/eslint.js .",
        "commandRepresentation": "Canonical command and additionalArguments per retained schema; executedCommand and original raw record/report retain complete actual argv and ordering."
      },
      {
        "command": "node node_modules/next/dist/bin/next build",
        "startedAt": "2026-10-09T15:44:28.104Z",
        "finishedAt": "2026-10-09T15:45:52.887Z",
        "durationSeconds": 84.783,
        "exitCode": 0,
        "status": "pass",
        "result": "✓ Compiled successfully in 39.7s\n✓ Generating static pages using 7 workers (46/46) in 4.3s\nFinalizing page optimization ...",
        "resultData": {
          "runner": "next-build",
          "compiled": true,
          "generated": true,
          "errors": 0
        },
        "terminalSummary": "✓ Compiled successfully in 39.7s\n✓ Generating static pages using 7 workers (46/46) in 4.3s\nFinalizing page optimization ...",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/build.log",
        "logSha256": "9e6bd428d76a610f8d59eb8fc1abea452c5b5b361abdfe4622b080b65789663e",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/build-source.json",
          "sha256": "5362d329a1910e1d2df4fdaaeee6fc432007557752c0c49f48ee7cbaec6f711f",
          "revision": "596b47460282d756a1a5882c4c2d86f18b7ff851",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T15:44:28.082Z",
          "manifestSha256": "df0862eacdc3b9e1a57419bc03b8fee0ac3d3e539600418b81b772a5fa2137f4"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "",
        "executedCommand": "node node_modules/next/dist/bin/next build",
        "commandRepresentation": "Canonical command and additionalArguments per retained schema; executedCommand and original raw record/report retain complete actual argv and ordering."
      },
      {
        "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts --project=chromium",
        "startedAt": "2026-10-09T15:45:56.113Z",
        "finishedAt": "2026-10-09T15:47:25.729Z",
        "durationSeconds": 89.616,
        "exitCode": 0,
        "status": "pass",
        "result": "59 passed (1.5m)",
        "resultData": {
          "runner": "playwright",
          "tests": {
            "passed": 59,
            "failed": 0,
            "skipped": 0
          }
        },
        "terminalSummary": "59 passed (1.5m)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/browser.log",
        "logSha256": "46b5c7a01956f69b86337c04e414452ca8e63ba443a5d5aad5cde8281d2ddf4d",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/browser-source.json",
          "sha256": "b82d5d60eaaf70bef6bde7cd96b1c9b305d6b0a45d2065997b783c7347c9cfd2",
          "revision": "596b47460282d756a1a5882c4c2d86f18b7ff851",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T15:45:56.090Z",
          "manifestSha256": "df0862eacdc3b9e1a57419bc03b8fee0ac3d3e539600418b81b772a5fa2137f4"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --workers=1",
        "executedCommand": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --project=chromium --workers=1",
        "commandRepresentation": "Canonical command and additionalArguments per retained schema; executedCommand and original raw record/report retain complete actual argv and ordering."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run",
        "startedAt": "2026-10-09T17:53:45.143Z",
        "finishedAt": "2026-10-09T18:01:13.675Z",
        "durationSeconds": 448.532,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  260 passed | 2 skipped (262)\nTests  3359 passed | 5 skipped (3364)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 260,
            "failed": 0,
            "skipped": 2
          },
          "tests": {
            "passed": 3359,
            "failed": 0,
            "skipped": 5
          }
        },
        "terminalSummary": "Test Files  260 passed | 2 skipped (262)\nTests  3359 passed | 5 skipped (3364)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/unit.log",
        "logSha256": "4d26f4ca7ad26f275e269ab37eecf89984b669ac88af18c60ef53020c5debd8f",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/unit-source.json",
          "sha256": "57df5949f9c12d38f91aef60fa8147696669c0600b69b41b375b824aa8cbd330",
          "revision": "b8358b11a63aadef2c84c9eb64b78be0a07ddcd4",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T17:53:45.127Z",
          "manifestSha256": "e51bbc5b9df9c302bf354eb1e48a9c2ac0080e2d3c2cbba321f35ec992ec9467"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "--maxWorkers=4",
        "executedCommand": "node node_modules/vitest/vitest.mjs run --maxWorkers=4",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable raw record/report retains actual complete argv and ordering."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts",
        "startedAt": "2026-10-09T18:01:16.889Z",
        "finishedAt": "2026-10-09T18:03:06.038Z",
        "durationSeconds": 109.149,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 91,
            "failed": 0,
            "skipped": 0
          },
          "tests": {
            "passed": 1510,
            "failed": 0,
            "skipped": 6
          }
        },
        "terminalSummary": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/design.log",
        "logSha256": "28282f36a847dd5d3d0efa448d3c2cb4510ef3e0cde4824602f517c8f8d98001",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/design-source.json",
          "sha256": "e9104eb7ac4c1fd837c01140ff233527f3c37642b42021c08fe302fab517b1f6",
          "revision": "b8358b11a63aadef2c84c9eb64b78be0a07ddcd4",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T18:01:16.869Z",
          "manifestSha256": "e51bbc5b9df9c302bf354eb1e48a9c2ac0080e2d3c2cbba321f35ec992ec9467"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "--maxWorkers=2",
        "executedCommand": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts --maxWorkers=2",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable raw record/report retains actual complete argv and ordering."
      },
      {
        "command": "node node_modules/typescript/bin/tsc --noEmit",
        "startedAt": "2026-10-09T18:03:09.530Z",
        "finishedAt": "2026-10-09T18:04:11.567Z",
        "durationSeconds": 62.037,
        "exitCode": 0,
        "status": "pass",
        "result": "No TypeScript diagnostics.",
        "resultData": {
          "runner": "typescript",
          "errors": 0
        },
        "terminalSummary": "No TypeScript diagnostics.",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/types.log",
        "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/types-source.json",
          "sha256": "0846b79df93caed07b81fdae6e4d2ee77f597cc7b4664e9d4a83ec2bbb89d624",
          "revision": "b8358b11a63aadef2c84c9eb64b78be0a07ddcd4",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T18:03:09.511Z",
          "manifestSha256": "e51bbc5b9df9c302bf354eb1e48a9c2ac0080e2d3c2cbba321f35ec992ec9467"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "",
        "executedCommand": "node node_modules/typescript/bin/tsc --noEmit",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable raw record/report retains actual complete argv and ordering."
      },
      {
        "command": "node node_modules/eslint/bin/eslint.js .",
        "startedAt": "2026-10-09T18:04:15.006Z",
        "finishedAt": "2026-10-09T18:06:10.738Z",
        "durationSeconds": 115.732,
        "exitCode": 0,
        "status": "pass",
        "result": "33 problems (0 errors, 33 warnings)",
        "resultData": {
          "runner": "eslint",
          "errors": 0,
          "warnings": 33
        },
        "terminalSummary": "33 problems (0 errors, 33 warnings)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/lint.log",
        "logSha256": "978e50f65040d1d7a0b1826e8d82186f252a05df31dc92cbbac3ed1f5dff9007",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/lint-source.json",
          "sha256": "80eb23505db8ecf0710e623b58bec2945bec7d9f5903b4085c588179b31b1083",
          "revision": "b8358b11a63aadef2c84c9eb64b78be0a07ddcd4",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T18:04:14.987Z",
          "manifestSha256": "e51bbc5b9df9c302bf354eb1e48a9c2ac0080e2d3c2cbba321f35ec992ec9467"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "",
        "executedCommand": "node node_modules/eslint/bin/eslint.js .",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable raw record/report retains actual complete argv and ordering."
      },
      {
        "command": "node node_modules/next/dist/bin/next build",
        "startedAt": "2026-10-09T18:06:15.688Z",
        "finishedAt": "2026-10-09T18:07:51.897Z",
        "durationSeconds": 96.209,
        "exitCode": 0,
        "status": "pass",
        "result": "✓ Compiled successfully in 45s\n✓ Generating static pages using 7 workers (46/46) in 5.4s\nFinalizing page optimization ...",
        "resultData": {
          "runner": "next-build",
          "compiled": true,
          "generated": true,
          "errors": 0
        },
        "terminalSummary": "✓ Compiled successfully in 45s\n✓ Generating static pages using 7 workers (46/46) in 5.4s\nFinalizing page optimization ...",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/build.log",
        "logSha256": "7c232f311502c3cb5fda5a8b6489793e52414fb91b7a7976dfa3638e9daeff21",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/build-source.json",
          "sha256": "c223ef29f6d6444f73d97312510a9cfe5292c47c3ee66aee40517f2cbb001c33",
          "revision": "b8358b11a63aadef2c84c9eb64b78be0a07ddcd4",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T18:06:15.665Z",
          "manifestSha256": "e51bbc5b9df9c302bf354eb1e48a9c2ac0080e2d3c2cbba321f35ec992ec9467"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "",
        "executedCommand": "node node_modules/next/dist/bin/next build",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable raw record/report retains actual complete argv and ordering."
      },
      {
        "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts --project=chromium",
        "startedAt": "2026-10-09T18:07:55.823Z",
        "finishedAt": "2026-10-09T18:09:30.456Z",
        "durationSeconds": 94.633,
        "exitCode": 0,
        "status": "pass",
        "result": "59 passed (1.5m)",
        "resultData": {
          "runner": "playwright",
          "tests": {
            "passed": 59,
            "failed": 0,
            "skipped": 0
          }
        },
        "terminalSummary": "59 passed (1.5m)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/browser.log",
        "logSha256": "571a81142d4c23a26165044430f97eaaeb407a267512a788f706476301a78861",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/browser-source.json",
          "sha256": "67c05abdc1b9eb85e45f00717427d50900919f78d76e6510c48406c7f44d3090",
          "revision": "b8358b11a63aadef2c84c9eb64b78be0a07ddcd4",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-09T18:07:55.792Z",
          "manifestSha256": "e51bbc5b9df9c302bf354eb1e48a9c2ac0080e2d3c2cbba321f35ec992ec9467"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --workers=1",
        "executedCommand": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --project=chromium --workers=1",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable raw record/report retains actual complete argv and ordering."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --maxWorkers=4",
        "startedAt": "2026-10-10T04:39:34.660Z",
        "finishedAt": "2026-10-10T04:48:52.114Z",
        "durationSeconds": 557.454,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  261 passed | 2 skipped (263)\nTests  3372 passed | 5 skipped (3377)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 261,
            "failed": 0,
            "skipped": 2
          },
          "tests": {
            "passed": 3372,
            "failed": 0,
            "skipped": 5
          }
        },
        "terminalSummary": "Test Files  261 passed | 2 skipped (263)\nTests  3372 passed | 5 skipped (3377)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/unit.log",
        "logSha256": "ad98b6deafc1e396a2ca8b5f4f2eddcc62dafa6a09a6f7b74c80bfc9e34da8f1",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/unit-source.json",
          "sha256": "d384fbd5d63a97e06b31c2cf10b793e4325776716337a26f31de8ac2e35c8a47",
          "revision": "2884b02a5932360c44f76344e0d86862e8f7b961",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T04:39:34.638Z",
          "manifestSha256": "2ec90c93818cb2b083897b2704758b0280de9e0e4d9df07e472cf76de3499f57"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts --maxWorkers=2",
        "startedAt": "2026-10-10T04:48:57.077Z",
        "finishedAt": "2026-10-10T04:51:16.669Z",
        "durationSeconds": 139.592,
        "exitCode": 1,
        "status": "fail",
        "result": "Test Files  1 failed | 90 passed (91)\nTests  1 failed | 1509 passed | 6 skipped (1516)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 90,
            "failed": 1,
            "skipped": 0
          },
          "tests": {
            "passed": 1509,
            "failed": 1,
            "skipped": 6
          }
        },
        "terminalSummary": "Test Files  1 failed | 90 passed (91)\nTests  1 failed | 1509 passed | 6 skipped (1516)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/design.log",
        "logSha256": "3f9c5eb270bb676124dc570bda8437329352131897379685d0fbeb03be0b41ee",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/design-source.json",
          "sha256": "b0f145748b73b4362b1ecb89d6504ed6474938896b411daecdf42e8d21ab91bd",
          "revision": "2884b02a5932360c44f76344e0d86862e8f7b961",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T04:48:57.054Z",
          "manifestSha256": "2ec90c93818cb2b083897b2704758b0280de9e0e4d9df07e472cf76de3499f57"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": false,
        "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
      },
      {
        "command": "node node_modules/typescript/bin/tsc --noEmit",
        "startedAt": "2026-10-10T04:51:21.744Z",
        "finishedAt": "2026-10-10T04:52:46.896Z",
        "durationSeconds": 85.152,
        "exitCode": 2,
        "status": "fail",
        "result": "tests/auth/app-compatibility-origin.test.ts(78,28): error TS2345: Argument of type '{ APP_COMPATIBILITY_ORIGIN: string; BETTER_AUTH_URL?: undefined; NEXT_PUBLIC_APP_URL?: undefined; MARKETING_APP_URL?: undefined; MARKETING_PREVIEW_URL?: undefined; } | { APP_COMPATIBILITY_ORIGIN: string; BETTER_AUTH_URL: string; NEXT_PUBLIC_APP_URL: string; MARKETING_APP_URL: string; MARKETING_PREVIEW_URL?: undefine...' is not assignable to parameter of type 'Record<string, string> | undefined'.",
        "resultData": {
          "runner": "typescript",
          "errors": 1
        },
        "terminalSummary": "tests/auth/app-compatibility-origin.test.ts(78,28): error TS2345: Argument of type '{ APP_COMPATIBILITY_ORIGIN: string; BETTER_AUTH_URL?: undefined; NEXT_PUBLIC_APP_URL?: undefined; MARKETING_APP_URL?: undefined; MARKETING_PREVIEW_URL?: undefined; } | { APP_COMPATIBILITY_ORIGIN: string; BETTER_AUTH_URL: string; NEXT_PUBLIC_APP_URL: string; MARKETING_APP_URL: string; MARKETING_PREVIEW_URL?: undefine...' is not assignable to parameter of type 'Record<string, string> | undefined'.",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/types.log",
        "logSha256": "0941b8d3de42539dd7e1b4375bd2728ff3f58e83d2ddaba91a28146b96960b00",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/types-source.json",
          "sha256": "7968cf601cecfecd452cae0f179860312385fd131f794ad9f9eb2b14152d2de4",
          "revision": "2884b02a5932360c44f76344e0d86862e8f7b961",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T04:51:21.720Z",
          "manifestSha256": "2ec90c93818cb2b083897b2704758b0280de9e0e4d9df07e472cf76de3499f57"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": false,
        "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
      },
      {
        "command": "node node_modules/eslint/bin/eslint.js .",
        "startedAt": "2026-10-10T04:52:50.856Z",
        "finishedAt": "2026-10-10T04:55:17.186Z",
        "durationSeconds": 146.33,
        "exitCode": 0,
        "status": "pass",
        "result": "33 problems (0 errors, 33 warnings)",
        "resultData": {
          "runner": "eslint",
          "errors": 0,
          "warnings": 33
        },
        "terminalSummary": "33 problems (0 errors, 33 warnings)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/lint.log",
        "logSha256": "e34ae80b43014d4e39c7de08ab2bc28cc0762d2f21633f65ae0f3dc103d64d9d",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/lint-source.json",
          "sha256": "9b887ee1baa6aa5d8b8989cf1d9a5dac6b580ab04606a23fda9e4b13f5b2ccf9",
          "revision": "2884b02a5932360c44f76344e0d86862e8f7b961",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T04:52:50.833Z",
          "manifestSha256": "2ec90c93818cb2b083897b2704758b0280de9e0e4d9df07e472cf76de3499f57"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
      },
      {
        "command": "node node_modules/next/dist/bin/next build",
        "startedAt": "2026-10-10T04:55:24.401Z",
        "finishedAt": "2026-10-10T04:59:04.217Z",
        "durationSeconds": 219.816,
        "exitCode": 0,
        "status": "pass",
        "result": "✓ Compiled successfully in 80s\n✓ Generating static pages using 7 workers (46/46) in 8.7s\nFinalizing page optimization ...",
        "resultData": {
          "runner": "next-build",
          "compiled": true,
          "generated": true,
          "errors": 0
        },
        "terminalSummary": "✓ Compiled successfully in 80s\n✓ Generating static pages using 7 workers (46/46) in 8.7s\nFinalizing page optimization ...",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/build.log",
        "logSha256": "b1a7a793a9e5af59f94f0fead6b81db2b9508d68ef4a5558ebfce742d1db2eb0",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/build-source.json",
          "sha256": "a60e21de2cc00b00209a014da1c7ae167f197e28cae62d9d857f900acbbbb8ed",
          "revision": "2884b02a5932360c44f76344e0d86862e8f7b961",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T04:55:24.356Z",
          "manifestSha256": "2ec90c93818cb2b083897b2704758b0280de9e0e4d9df07e472cf76de3499f57"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
      },
      {
        "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --project=chromium --workers=1",
        "startedAt": "2026-10-10T04:59:11.282Z",
        "finishedAt": "2026-10-10T05:01:37.653Z",
        "durationSeconds": 146.371,
        "exitCode": 0,
        "status": "pass",
        "result": "59 passed (2.4m)",
        "resultData": {
          "runner": "playwright",
          "tests": {
            "passed": 59,
            "failed": 0,
            "skipped": 0
          }
        },
        "terminalSummary": "59 passed (2.4m)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/browser.log",
        "logSha256": "9a24e178fd1b14d42b5857a618b60255caa12cf36bcd628529c845351a6e78a5",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/browser-source.json",
          "sha256": "575fdce72e6ddf2aee970c383b278b1014de2d449bace4a2264140772e41cf00",
          "revision": "2884b02a5932360c44f76344e0d86862e8f7b961",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T04:59:11.250Z",
          "manifestSha256": "2ec90c93818cb2b083897b2704758b0280de9e0e4d9df07e472cf76de3499f57"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --maxWorkers=4",
        "startedAt": "2026-10-10T05:07:30.856Z",
        "finishedAt": "2026-10-10T05:15:36.217Z",
        "durationSeconds": 485.361,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  261 passed | 2 skipped (263)\nTests  3372 passed | 5 skipped (3377)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 261,
            "failed": 0,
            "skipped": 2
          },
          "tests": {
            "passed": 3372,
            "failed": 0,
            "skipped": 5
          }
        },
        "terminalSummary": "Test Files  261 passed | 2 skipped (263)\nTests  3372 passed | 5 skipped (3377)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/unit.log",
        "logSha256": "83ffa388ff8fe5326efede295182549ab1baf73470b7b580cd5a556a3bb48a8b",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/unit-source.json",
          "sha256": "635bee84ee9cab8f4ad98856f2299c16ebd1b17f8690214d2c25a07b10205a58",
          "revision": "c0f9a6c5cf4690ed2eebca4b63016077633fa89e",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T05:07:30.826Z",
          "manifestSha256": "da0b88739f1a72daa28bed9a224e261122a8b0dc83d1bb2e45cbdff17e1cd27e"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts --maxWorkers=2",
        "startedAt": "2026-10-10T05:15:40.563Z",
        "finishedAt": "2026-10-10T05:17:35.307Z",
        "durationSeconds": 114.744,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 91,
            "failed": 0,
            "skipped": 0
          },
          "tests": {
            "passed": 1510,
            "failed": 0,
            "skipped": 6
          }
        },
        "terminalSummary": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/design.log",
        "logSha256": "84c858384be090efedbc5c6c3731075feb36f27be913265ba125d2c732bbe0f1",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/design-source.json",
          "sha256": "02c3d3d859c0618535c2e77f20b01760efc162f06ffa109ec630c82f667926d9",
          "revision": "c0f9a6c5cf4690ed2eebca4b63016077633fa89e",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T05:15:40.533Z",
          "manifestSha256": "da0b88739f1a72daa28bed9a224e261122a8b0dc83d1bb2e45cbdff17e1cd27e"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
      },
      {
        "command": "node node_modules/typescript/bin/tsc --noEmit",
        "startedAt": "2026-10-10T05:17:38.754Z",
        "finishedAt": "2026-10-10T05:18:59.296Z",
        "durationSeconds": 80.542,
        "exitCode": 0,
        "status": "pass",
        "result": "No TypeScript diagnostics.",
        "resultData": {
          "runner": "typescript",
          "errors": 0
        },
        "terminalSummary": "No TypeScript diagnostics.",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/types.log",
        "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/types-source.json",
          "sha256": "2f53e9fe4786a047de4feb7275e32e7d90bc39a64a19152cf6a1154c126c066b",
          "revision": "c0f9a6c5cf4690ed2eebca4b63016077633fa89e",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T05:17:38.734Z",
          "manifestSha256": "da0b88739f1a72daa28bed9a224e261122a8b0dc83d1bb2e45cbdff17e1cd27e"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
      },
      {
        "command": "node node_modules/eslint/bin/eslint.js .",
        "startedAt": "2026-10-10T05:19:01.942Z",
        "finishedAt": "2026-10-10T05:20:58.875Z",
        "durationSeconds": 116.933,
        "exitCode": 0,
        "status": "pass",
        "result": "33 problems (0 errors, 33 warnings)",
        "resultData": {
          "runner": "eslint",
          "errors": 0,
          "warnings": 33
        },
        "terminalSummary": "33 problems (0 errors, 33 warnings)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/lint.log",
        "logSha256": "1568789ac14c1e5883591da679e1c45fdea2077ed6a4314aabb8964366d9414f",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/lint-source.json",
          "sha256": "af5a4e251bb172be6a1f9565707df860ce57ba8dbc98055eb407d96a91d193f0",
          "revision": "c0f9a6c5cf4690ed2eebca4b63016077633fa89e",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T05:19:01.925Z",
          "manifestSha256": "da0b88739f1a72daa28bed9a224e261122a8b0dc83d1bb2e45cbdff17e1cd27e"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
      },
      {
        "command": "node node_modules/next/dist/bin/next build",
        "startedAt": "2026-10-10T05:21:02.643Z",
        "finishedAt": "2026-10-10T05:22:53.007Z",
        "durationSeconds": 110.364,
        "exitCode": 0,
        "status": "pass",
        "result": "✓ Compiled successfully in 46s\n✓ Generating static pages using 7 workers (46/46) in 4.9s\nFinalizing page optimization ...",
        "resultData": {
          "runner": "next-build",
          "compiled": true,
          "generated": true,
          "errors": 0
        },
        "terminalSummary": "✓ Compiled successfully in 46s\n✓ Generating static pages using 7 workers (46/46) in 4.9s\nFinalizing page optimization ...",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/build.log",
        "logSha256": "d8ab67c043f078dea7298da8dd3b8980a439cccd058526d716789fa8a9a713b2",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/build-source.json",
          "sha256": "dccd517ec67c38a711e65a87bc4d3b6ffe6ccd758f65286c1d5022f057668931",
          "revision": "c0f9a6c5cf4690ed2eebca4b63016077633fa89e",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T05:21:02.619Z",
          "manifestSha256": "da0b88739f1a72daa28bed9a224e261122a8b0dc83d1bb2e45cbdff17e1cd27e"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
      },
      {
        "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --project=chromium --workers=1",
        "startedAt": "2026-10-10T05:22:56.969Z",
        "finishedAt": "2026-10-10T05:24:37.845Z",
        "durationSeconds": 100.876,
        "exitCode": 0,
        "status": "pass",
        "result": "59 passed (1.6m)",
        "resultData": {
          "runner": "playwright",
          "tests": {
            "passed": 59,
            "failed": 0,
            "skipped": 0
          }
        },
        "terminalSummary": "59 passed (1.6m)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/browser.log",
        "logSha256": "833c913ba000f9a75d9338dbe786ab1f399c1c4020b92acfb11dfd68f758a21d",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/browser-source.json",
          "sha256": "cbd4d9612336b4b99d44ce0df49c8ba747e36fa282493fc9d5672182761bb615",
          "revision": "c0f9a6c5cf4690ed2eebca4b63016077633fa89e",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T05:22:56.943Z",
          "manifestSha256": "da0b88739f1a72daa28bed9a224e261122a8b0dc83d1bb2e45cbdff17e1cd27e"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --maxWorkers=4",
        "startedAt": "2026-10-10T05:59:18.528Z",
        "finishedAt": "2026-10-10T06:07:09.192Z",
        "durationSeconds": 470.664,
        "exitCode": 1,
        "status": "fail",
        "result": "Test Files  3 failed | 264 passed | 2 skipped (269)\nTests  3 failed | 3426 passed | 5 skipped (3434)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 264,
            "failed": 3,
            "skipped": 2
          },
          "tests": {
            "passed": 3426,
            "failed": 3,
            "skipped": 5
          }
        },
        "terminalSummary": "Test Files  3 failed | 264 passed | 2 skipped (269)\nTests  3 failed | 3426 passed | 5 skipped (3434)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/unit.log",
        "logSha256": "3451a3ee02425f56dd4a65b385f35b5fed26b14ea662b09bd3b555a8e457e5e9",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/unit-source.json",
          "sha256": "ecdd18b42183ca9a3b730fe343f84d77b669c2a81e2920146c7a904077c9b8ce",
          "revision": "1581c1e2c28b92dca15b7b25633b41b968fcdffd",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T05:59:18.474Z",
          "manifestSha256": "d18f1fe8ebf3ac65fcde1ce1c5f6d4c35f8ade00ed068ad30a9994618880c0bd"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": false,
        "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts --maxWorkers=2",
        "startedAt": "2026-10-10T06:07:12.718Z",
        "finishedAt": "2026-10-10T06:09:12.997Z",
        "durationSeconds": 120.279,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 91,
            "failed": 0,
            "skipped": 0
          },
          "tests": {
            "passed": 1510,
            "failed": 0,
            "skipped": 6
          }
        },
        "terminalSummary": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/design.log",
        "logSha256": "2c5da8f23e0aa44e19b3a2c4ca9b54ff1972bdf73b24bf9d2e09e815536cfc86",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/design-source.json",
          "sha256": "a050900beb651cef9bba4209d045c705f80578710c5e55d63ed15c96925ea60a",
          "revision": "1581c1e2c28b92dca15b7b25633b41b968fcdffd",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T06:07:12.694Z",
          "manifestSha256": "d18f1fe8ebf3ac65fcde1ce1c5f6d4c35f8ade00ed068ad30a9994618880c0bd"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
      },
      {
        "command": "node node_modules/typescript/bin/tsc --noEmit",
        "startedAt": "2026-10-10T06:09:16.412Z",
        "finishedAt": "2026-10-10T06:10:45.577Z",
        "durationSeconds": 89.165,
        "exitCode": 2,
        "status": "fail",
        "result": "src/app/(host)/host/listings/[id]/edit/wizard.tsx(429,5): error TS2322: Type 'number | null | undefined' is not assignable to type 'number | undefined'.\ntests/listing/crud.test.ts(151,41): error TS2322: Type 'null' is not assignable to type 'number | undefined'.\ntests/listing/material-edit.test.ts(324,52): error TS2322: Type 'null' is not assignable to type 'number | undefined'.\ntests/payments/payout-suspension-freeze.test.ts(412,7): error TS2353: Object literal may only specify known properties, and 'feeCents' does not exist in type '{ id: string; status: string; referenceNumber?: string | undefined; amount?: number | undefined; currency?: string | undefined; }'.",
        "resultData": {
          "runner": "typescript",
          "errors": 4
        },
        "terminalSummary": "src/app/(host)/host/listings/[id]/edit/wizard.tsx(429,5): error TS2322: Type 'number | null | undefined' is not assignable to type 'number | undefined'.\ntests/listing/crud.test.ts(151,41): error TS2322: Type 'null' is not assignable to type 'number | undefined'.\ntests/listing/material-edit.test.ts(324,52): error TS2322: Type 'null' is not assignable to type 'number | undefined'.\ntests/payments/payout-suspension-freeze.test.ts(412,7): error TS2353: Object literal may only specify known properties, and 'feeCents' does not exist in type '{ id: string; status: string; referenceNumber?: string | undefined; amount?: number | undefined; currency?: string | undefined; }'.",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/types.log",
        "logSha256": "881bc433d648c5a18c84d4d188a9dda4c4e2602d318b9adebccb0466df1e4cb4",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/types-source.json",
          "sha256": "200c919d5a94fbe0d55761c3d57aaed6bf6b68e30f6f19127ba0ed5094d4b93c",
          "revision": "1581c1e2c28b92dca15b7b25633b41b968fcdffd",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T06:09:16.392Z",
          "manifestSha256": "d18f1fe8ebf3ac65fcde1ce1c5f6d4c35f8ade00ed068ad30a9994618880c0bd"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": false,
        "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
      },
      {
        "command": "node node_modules/eslint/bin/eslint.js .",
        "startedAt": "2026-10-10T06:10:48.323Z",
        "finishedAt": "2026-10-10T06:12:46.327Z",
        "durationSeconds": 118.004,
        "exitCode": 0,
        "status": "pass",
        "result": "33 problems (0 errors, 33 warnings)",
        "resultData": {
          "runner": "eslint",
          "errors": 0,
          "warnings": 33
        },
        "terminalSummary": "33 problems (0 errors, 33 warnings)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/lint.log",
        "logSha256": "6eb9cb1a5d1a7509a8cbda19a60c6a4d3b2114741de2cc195115ae4b633def44",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/lint-source.json",
          "sha256": "ce819b6cf146a4c3261baa1529b59833d1f9ea57970c96fdf236a91a60bdfa94",
          "revision": "1581c1e2c28b92dca15b7b25633b41b968fcdffd",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T06:10:48.300Z",
          "manifestSha256": "d18f1fe8ebf3ac65fcde1ce1c5f6d4c35f8ade00ed068ad30a9994618880c0bd"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
      },
      {
        "command": "node node_modules/next/dist/bin/next build",
        "startedAt": "2026-10-10T06:12:50.811Z",
        "finishedAt": "2026-10-10T06:12:58.261Z",
        "durationSeconds": 7.45,
        "exitCode": 1,
        "status": "fail",
        "result": "> Build error occurred",
        "resultData": {
          "runner": "next-build",
          "compiled": false,
          "generated": false,
          "errors": 1
        },
        "terminalSummary": "> Build error occurred",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/build.log",
        "logSha256": "d17c93fb7693e7b83853b46588a1fda93b75d353241f639ef2cb8978de4a6b0b",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/build-source.json",
          "sha256": "8e7fc99d01e8a6a191feff7f0af4c37406fa631ef38633e9dd2c154593b9947b",
          "revision": "1581c1e2c28b92dca15b7b25633b41b968fcdffd",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T06:12:50.781Z",
          "manifestSha256": "d18f1fe8ebf3ac65fcde1ce1c5f6d4c35f8ade00ed068ad30a9994618880c0bd"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": false,
        "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --maxWorkers=4",
        "startedAt": "2026-10-10T06:25:38.925Z",
        "finishedAt": "2026-10-10T06:33:18.643Z",
        "durationSeconds": 459.718,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  267 passed | 2 skipped (269)\nTests  3429 passed | 5 skipped (3434)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 267,
            "failed": 0,
            "skipped": 2
          },
          "tests": {
            "passed": 3429,
            "failed": 0,
            "skipped": 5
          }
        },
        "terminalSummary": "Test Files  267 passed | 2 skipped (269)\nTests  3429 passed | 5 skipped (3434)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/unit.log",
        "logSha256": "5628bdfa3e7b391ad2fb1725f0b68ac66058356d093259b85759aa16a0d72fa0",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/unit-source.json",
          "sha256": "9c2550b30b54bbdc15508f4e8478b6db077b6558dc550b982776abd25ff5e1e2",
          "revision": "eb0d39bbe21866082fe0745f79bfeb6161112326",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T06:25:38.905Z",
          "manifestSha256": "462584a388d5b130ea5027f73e0d010218ccc56b602098be9723ed8b5b581b31"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts --maxWorkers=2",
        "startedAt": "2026-10-10T06:33:23.172Z",
        "finishedAt": "2026-10-10T06:35:12.358Z",
        "durationSeconds": 109.186,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 91,
            "failed": 0,
            "skipped": 0
          },
          "tests": {
            "passed": 1510,
            "failed": 0,
            "skipped": 6
          }
        },
        "terminalSummary": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/design.log",
        "logSha256": "d3c4f657ebf96fe059f78bd519a5ab4c7b478e9858a5545dd1e78aff4f23bfb7",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/design-source.json",
          "sha256": "52bb6f8fc1f35e85a9d1aa3a115c77f6130a4c3927c7e8296eb42a58f547a5b9",
          "revision": "eb0d39bbe21866082fe0745f79bfeb6161112326",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T06:33:23.146Z",
          "manifestSha256": "462584a388d5b130ea5027f73e0d010218ccc56b602098be9723ed8b5b581b31"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
      },
      {
        "command": "node node_modules/typescript/bin/tsc --noEmit",
        "startedAt": "2026-10-10T06:35:15.257Z",
        "finishedAt": "2026-10-10T06:36:34.191Z",
        "durationSeconds": 78.934,
        "exitCode": 0,
        "status": "pass",
        "result": "No TypeScript diagnostics.",
        "resultData": {
          "runner": "typescript",
          "errors": 0
        },
        "terminalSummary": "No TypeScript diagnostics.",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/types.log",
        "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/types-source.json",
          "sha256": "5b1330631664d9792d7bd745a1e7eaf305260e271030f92e0f31576863695d58",
          "revision": "eb0d39bbe21866082fe0745f79bfeb6161112326",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T06:35:15.238Z",
          "manifestSha256": "462584a388d5b130ea5027f73e0d010218ccc56b602098be9723ed8b5b581b31"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
      },
      {
        "command": "node node_modules/eslint/bin/eslint.js .",
        "startedAt": "2026-10-10T06:36:37.517Z",
        "finishedAt": "2026-10-10T06:38:27.714Z",
        "durationSeconds": 110.197,
        "exitCode": 0,
        "status": "pass",
        "result": "33 problems (0 errors, 33 warnings)",
        "resultData": {
          "runner": "eslint",
          "errors": 0,
          "warnings": 33
        },
        "terminalSummary": "33 problems (0 errors, 33 warnings)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/lint.log",
        "logSha256": "fcbce648ecbdae0d1fe3c9cedefb5c4c72659e915aa651cc478fc7c6b2ea5ce7",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/lint-source.json",
          "sha256": "63121557e19850e82315182fcb97df45d1b090726c6c79a58d518750b2602fd5",
          "revision": "eb0d39bbe21866082fe0745f79bfeb6161112326",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T06:36:37.496Z",
          "manifestSha256": "462584a388d5b130ea5027f73e0d010218ccc56b602098be9723ed8b5b581b31"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
      },
      {
        "command": "node node_modules/next/dist/bin/next build",
        "startedAt": "2026-10-10T06:38:32.521Z",
        "finishedAt": "2026-10-10T06:39:19.302Z",
        "durationSeconds": 46.781,
        "exitCode": 1,
        "status": "fail",
        "result": "> Build error occurred",
        "resultData": {
          "runner": "next-build",
          "compiled": false,
          "generated": false,
          "errors": 1
        },
        "terminalSummary": "> Build error occurred",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/build.log",
        "logSha256": "672d16af6d8ff39563889617cdacfc8b76c0068c8db28e2cbcfb004526b36bce",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/build-source.json",
          "sha256": "bc3ec123dabcced0f1291880eea6c6aa8ab0aa7e9d7c4835b0badbb25f1d756b",
          "revision": "eb0d39bbe21866082fe0745f79bfeb6161112326",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T06:38:32.495Z",
          "manifestSha256": "462584a388d5b130ea5027f73e0d010218ccc56b602098be9723ed8b5b581b31"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": false,
        "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --maxWorkers=4",
        "startedAt": "2026-10-10T06:47:06.770Z",
        "finishedAt": "2026-10-10T06:54:37.915Z",
        "durationSeconds": 451.145,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  267 passed | 2 skipped (269)\nTests  3429 passed | 5 skipped (3434)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 267,
            "failed": 0,
            "skipped": 2
          },
          "tests": {
            "passed": 3429,
            "failed": 0,
            "skipped": 5
          }
        },
        "terminalSummary": "Test Files  267 passed | 2 skipped (269)\nTests  3429 passed | 5 skipped (3434)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/unit.log",
        "logSha256": "fb0b89ce001160b167499d08fc0106217889a142a375776b9d3d52f6fb68f202",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/unit-source.json",
          "sha256": "bae1972654cfc876ddcc35c494d10f4fd7ee95ccab707f459571109adfdfadab",
          "revision": "d7a4a334617c99d6a52a39767a112393144cc0fc",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T06:47:06.751Z",
          "manifestSha256": "48d760b0fdc50211df9e898b2b2a3257bf68a8aabc383d2fea1a51f2c5219982"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts --maxWorkers=2",
        "startedAt": "2026-10-10T06:54:40.978Z",
        "finishedAt": "2026-10-10T06:56:24.045Z",
        "durationSeconds": 103.067,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 91,
            "failed": 0,
            "skipped": 0
          },
          "tests": {
            "passed": 1510,
            "failed": 0,
            "skipped": 6
          }
        },
        "terminalSummary": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/design.log",
        "logSha256": "5d3f123816d682710ec411b8f1d6062eee8d953d56ee504b55117620f8277908",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/design-source.json",
          "sha256": "53ff87278346d6b24af40c9b55d3efeaf910bba84ea120f9560bdabb4338d94b",
          "revision": "d7a4a334617c99d6a52a39767a112393144cc0fc",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T06:54:40.958Z",
          "manifestSha256": "48d760b0fdc50211df9e898b2b2a3257bf68a8aabc383d2fea1a51f2c5219982"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
      },
      {
        "command": "node node_modules/typescript/bin/tsc --noEmit",
        "startedAt": "2026-10-10T06:56:27.768Z",
        "finishedAt": "2026-10-10T06:57:47.623Z",
        "durationSeconds": 79.855,
        "exitCode": 0,
        "status": "pass",
        "result": "No TypeScript diagnostics.",
        "resultData": {
          "runner": "typescript",
          "errors": 0
        },
        "terminalSummary": "No TypeScript diagnostics.",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/types.log",
        "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/types-source.json",
          "sha256": "c555f80e71aa86aee83604c0c04fee5ae61dcce9583f3a7d81fe6fe59cdd6917",
          "revision": "d7a4a334617c99d6a52a39767a112393144cc0fc",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T06:56:27.748Z",
          "manifestSha256": "48d760b0fdc50211df9e898b2b2a3257bf68a8aabc383d2fea1a51f2c5219982"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
      },
      {
        "command": "node node_modules/eslint/bin/eslint.js .",
        "startedAt": "2026-10-10T06:57:50.122Z",
        "finishedAt": "2026-10-10T06:59:36.841Z",
        "durationSeconds": 106.719,
        "exitCode": 0,
        "status": "pass",
        "result": "33 problems (0 errors, 33 warnings)",
        "resultData": {
          "runner": "eslint",
          "errors": 0,
          "warnings": 33
        },
        "terminalSummary": "33 problems (0 errors, 33 warnings)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/lint.log",
        "logSha256": "3771400486ec55776cc3f96d1e177ee02e5a038996a416e58d34b479f633d9df",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/lint-source.json",
          "sha256": "caf8ade65449d1b10de50693bc2a74e3cff91be211ac763fd34740d765eb66bd",
          "revision": "d7a4a334617c99d6a52a39767a112393144cc0fc",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T06:57:50.106Z",
          "manifestSha256": "48d760b0fdc50211df9e898b2b2a3257bf68a8aabc383d2fea1a51f2c5219982"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
      },
      {
        "command": "node node_modules/next/dist/bin/next build",
        "startedAt": "2026-10-10T06:59:40.372Z",
        "finishedAt": "2026-10-10T07:01:15.400Z",
        "durationSeconds": 95.028,
        "exitCode": 0,
        "status": "pass",
        "result": "✓ Compiled successfully in 41s\n✓ Generating static pages using 7 workers (48/48) in 5.5s\nFinalizing page optimization ...",
        "resultData": {
          "runner": "next-build",
          "compiled": true,
          "generated": true,
          "errors": 0
        },
        "terminalSummary": "✓ Compiled successfully in 41s\n✓ Generating static pages using 7 workers (48/48) in 5.5s\nFinalizing page optimization ...",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/build.log",
        "logSha256": "d4e40c3d7b10604395fd02d6d11a7df09cf8fbddbee1754c0634dc68cbc9082d",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/build-source.json",
          "sha256": "46476a6b6e64e703d0f0395f898217601cc6e30f531607e5a23b6fb37431da87",
          "revision": "d7a4a334617c99d6a52a39767a112393144cc0fc",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T06:59:40.353Z",
          "manifestSha256": "48d760b0fdc50211df9e898b2b2a3257bf68a8aabc383d2fea1a51f2c5219982"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
      },
      {
        "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --project=chromium --workers=1",
        "startedAt": "2026-10-10T07:01:19.221Z",
        "finishedAt": "2026-10-10T07:03:00.621Z",
        "durationSeconds": 101.4,
        "exitCode": 1,
        "status": "fail",
        "result": "1 failed\n58 passed (1.6m)",
        "resultData": {
          "runner": "playwright",
          "tests": {
            "passed": 58,
            "failed": 1,
            "skipped": 0
          }
        },
        "terminalSummary": "1 failed\n58 passed (1.6m)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/browser.log",
        "logSha256": "387a20d57921c173ab8b5bc4bf69dfba0a21e058297255bd3af527a9880f42ae",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/browser-source.json",
          "sha256": "33676240d8e601fe7e77ce17bcd513e29c6f5cf14c8138693df8266ea4aa8a00",
          "revision": "d7a4a334617c99d6a52a39767a112393144cc0fc",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T07:01:19.199Z",
          "manifestSha256": "48d760b0fdc50211df9e898b2b2a3257bf68a8aabc383d2fea1a51f2c5219982"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": false,
        "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run",
        "startedAt": "2026-10-10T07:14:12.566Z",
        "finishedAt": "2026-10-10T07:21:29.279Z",
        "durationSeconds": 436.713,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  267 passed | 2 skipped (269)\nTests  3429 passed | 5 skipped (3434)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 267,
            "failed": 0,
            "skipped": 2
          },
          "tests": {
            "passed": 3429,
            "failed": 0,
            "skipped": 5
          }
        },
        "terminalSummary": "Test Files  267 passed | 2 skipped (269)\nTests  3429 passed | 5 skipped (3434)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/unit.log",
        "logSha256": "d8e50d143a29671dab3749607cd33617256140b274e9331c040c0326ff8bdb62",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/unit-source.json",
          "sha256": "c9e6791edcf9976135a71222ec09858a7d6222287195dd4b87c7646f3fe1e0e3",
          "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T07:14:12.547Z",
          "manifestSha256": "da10f8a0faea204c810cbe544142971181c86bab0d252d5515ea3b671d8a8157"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "--maxWorkers=4",
        "executedCommand": "node node_modules/vitest/vitest.mjs run --maxWorkers=4",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts",
        "startedAt": "2026-10-10T07:21:33.705Z",
        "finishedAt": "2026-10-10T07:23:20.014Z",
        "durationSeconds": 106.309,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 91,
            "failed": 0,
            "skipped": 0
          },
          "tests": {
            "passed": 1510,
            "failed": 0,
            "skipped": 6
          }
        },
        "terminalSummary": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/design.log",
        "logSha256": "9a2e432aca9ee8cb094015d145d9ebda2b53b44ed97af80830ae535db311d91f",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/design-source.json",
          "sha256": "8a19c71adbda9560aec803ec771d4b61a963f969f99bbb5fe144eed88fc20d40",
          "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T07:21:33.686Z",
          "manifestSha256": "da10f8a0faea204c810cbe544142971181c86bab0d252d5515ea3b671d8a8157"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "--maxWorkers=2",
        "executedCommand": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts --maxWorkers=2",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
      },
      {
        "command": "node node_modules/typescript/bin/tsc --noEmit",
        "startedAt": "2026-10-10T07:23:23.123Z",
        "finishedAt": "2026-10-10T07:24:27.997Z",
        "durationSeconds": 64.874,
        "exitCode": 0,
        "status": "pass",
        "result": "No TypeScript diagnostics.",
        "resultData": {
          "runner": "typescript",
          "errors": 0
        },
        "terminalSummary": "No TypeScript diagnostics.",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/types.log",
        "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/types-source.json",
          "sha256": "b035f5c2d23cb6704c1602c4c5e4085748b4bfc60496f54c64a3f2adffeb3ac5",
          "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T07:23:23.101Z",
          "manifestSha256": "da10f8a0faea204c810cbe544142971181c86bab0d252d5515ea3b671d8a8157"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "",
        "executedCommand": "node node_modules/typescript/bin/tsc --noEmit",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
      },
      {
        "command": "node node_modules/eslint/bin/eslint.js .",
        "startedAt": "2026-10-10T07:24:31.403Z",
        "finishedAt": "2026-10-10T07:26:01.358Z",
        "durationSeconds": 89.955,
        "exitCode": 0,
        "status": "pass",
        "result": "33 problems (0 errors, 33 warnings)",
        "resultData": {
          "runner": "eslint",
          "errors": 0,
          "warnings": 33
        },
        "terminalSummary": "33 problems (0 errors, 33 warnings)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/lint.log",
        "logSha256": "0a032441420e5236ac2bb5b8d41945742ded83587a8b3fee2bdefabab8b38d05",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/lint-source.json",
          "sha256": "289412dcfdadb3a74e893763f556ffcf1fd21f65575ef797fd7d53fbbc6ce69c",
          "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T07:24:31.381Z",
          "manifestSha256": "da10f8a0faea204c810cbe544142971181c86bab0d252d5515ea3b671d8a8157"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "",
        "executedCommand": "node node_modules/eslint/bin/eslint.js .",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
      },
      {
        "command": "node node_modules/next/dist/bin/next build",
        "startedAt": "2026-10-10T07:26:05.596Z",
        "finishedAt": "2026-10-10T07:27:33.571Z",
        "durationSeconds": 87.975,
        "exitCode": 0,
        "status": "pass",
        "result": "✓ Compiled successfully in 39.3s\n✓ Generating static pages using 7 workers (48/48) in 5.5s\nFinalizing page optimization ...",
        "resultData": {
          "runner": "next-build",
          "compiled": true,
          "generated": true,
          "errors": 0
        },
        "terminalSummary": "✓ Compiled successfully in 39.3s\n✓ Generating static pages using 7 workers (48/48) in 5.5s\nFinalizing page optimization ...",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/build.log",
        "logSha256": "43e59b017f0573feccbb89e358809687685c2cd83db71eabb5c5f61bb985defe",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/build-source.json",
          "sha256": "31fa7dc682438ac43e8cf47831d9380e49dccc51e495101d4bd2e01d90b0100b",
          "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T07:26:05.574Z",
          "manifestSha256": "da10f8a0faea204c810cbe544142971181c86bab0d252d5515ea3b671d8a8157"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "",
        "executedCommand": "node node_modules/next/dist/bin/next build",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
      },
      {
        "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts --project=chromium",
        "startedAt": "2026-10-10T07:27:37.898Z",
        "finishedAt": "2026-10-10T07:29:13.259Z",
        "durationSeconds": 95.361,
        "exitCode": 0,
        "status": "pass",
        "result": "59 passed (1.5m)",
        "resultData": {
          "runner": "playwright",
          "tests": {
            "passed": 59,
            "failed": 0,
            "skipped": 0
          }
        },
        "terminalSummary": "59 passed (1.5m)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/browser.log",
        "logSha256": "5d4a3a64d732f2f4339ad72a26e88038638828e888384fc0538eaf154d46a9c3",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/browser-source.json",
          "sha256": "3b5fcc7727bb6b2e8767141c94366ee2d10b28487e70af8e8ccd4e22f0eff20a",
          "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-10T07:27:37.874Z",
          "manifestSha256": "da10f8a0faea204c810cbe544142971181c86bab0d252d5515ea3b671d8a8157"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "additionalArguments": "e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --workers=1",
        "executedCommand": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --project=chromium --workers=1",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --maxWorkers=4",
        "startedAt": "2026-10-11T08:33:07.626Z",
        "finishedAt": "2026-10-11T08:41:53.138Z",
        "durationSeconds": 525.512,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  271 passed | 2 skipped (273)\nTests  3449 passed | 5 skipped (3454)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 271,
            "failed": 0,
            "skipped": 2
          },
          "tests": {
            "passed": 3449,
            "failed": 0,
            "skipped": 5
          }
        },
        "terminalSummary": "Test Files  271 passed | 2 skipped (273)\nTests  3449 passed | 5 skipped (3454)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/unit.log",
        "logSha256": "a51fa92a5435f6108c3d3591c3c76334cfee5905fcf5a083de816182220097c2",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/unit-source.json",
          "sha256": "cae38873e349bfb1ddedfe5bfca6e07cbf02db746242ab3377da942a1da1766d",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T08:33:07.601Z",
          "manifestSha256": "4b065c722630c0bc65bb7f7914b6e1e8e58aaa051e51c007ceb6ae90a477cc28"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts --maxWorkers=2",
        "startedAt": "2026-10-11T08:41:54.723Z",
        "finishedAt": "2026-10-11T08:43:54.623Z",
        "durationSeconds": 119.9,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 91,
            "failed": 0,
            "skipped": 0
          },
          "tests": {
            "passed": 1510,
            "failed": 0,
            "skipped": 6
          }
        },
        "terminalSummary": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/design.log",
        "logSha256": "332601b6ac1eeae697ccb254ee2f279e90e7142a1c288934a39dd853555b7973",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/design-source.json",
          "sha256": "e8763f98bb9d5070370cb0b361d450c85052ed12ec6d2bb1f821b995b27581c1",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T08:41:54.701Z",
          "manifestSha256": "4b065c722630c0bc65bb7f7914b6e1e8e58aaa051e51c007ceb6ae90a477cc28"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
      },
      {
        "command": "node node_modules/typescript/bin/tsc --noEmit",
        "startedAt": "2026-10-11T08:43:55.925Z",
        "finishedAt": "2026-10-11T08:45:13.747Z",
        "durationSeconds": 77.822,
        "exitCode": 0,
        "status": "pass",
        "result": "No TypeScript diagnostics.",
        "resultData": {
          "runner": "typescript",
          "errors": 0
        },
        "terminalSummary": "No TypeScript diagnostics.",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/types.log",
        "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/types-source.json",
          "sha256": "97bf572eb039703d46fe4a44c36cb3f9be344cb1d3e2f6eeb7b06c969152a667",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T08:43:55.902Z",
          "manifestSha256": "4b065c722630c0bc65bb7f7914b6e1e8e58aaa051e51c007ceb6ae90a477cc28"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
      },
      {
        "command": "node node_modules/eslint/bin/eslint.js .",
        "startedAt": "2026-10-11T08:45:15.147Z",
        "finishedAt": "2026-10-11T08:52:29.361Z",
        "durationSeconds": 434.214,
        "exitCode": 4294967295,
        "status": "fail",
        "result": "No ESLint diagnostics.",
        "resultData": {
          "runner": "eslint",
          "errors": 0,
          "warnings": 0
        },
        "terminalSummary": "No ESLint diagnostics.",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/lint.log",
        "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/lint-source.json",
          "sha256": "24d4ebcae470bf8b6d233ba5daef90420efba6525b4f5f2abdd6507a5c4865a9",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T08:45:15.125Z",
          "manifestSha256": "4b065c722630c0bc65bb7f7914b6e1e8e58aaa051e51c007ceb6ae90a477cc28"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": false,
        "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
      },
      {
        "command": "node node_modules/next/dist/bin/next build",
        "startedAt": "2026-10-11T08:52:31.417Z",
        "finishedAt": "2026-10-11T08:52:40.426Z",
        "durationSeconds": 9.009,
        "exitCode": 1,
        "status": "fail",
        "result": "> Build error occurred",
        "resultData": {
          "runner": "next-build",
          "compiled": false,
          "generated": false,
          "errors": 1
        },
        "terminalSummary": "> Build error occurred",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/build.log",
        "logSha256": "106fd417a7b68004a45b6718e842d8168a291b6acacac027a47eb42f217f4808",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/build-source.json",
          "sha256": "cd9af8200e9524d5e6d7b3b410f29772dd1b05def618f612aa45043c5eb66c5f",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T08:52:31.393Z",
          "manifestSha256": "4b065c722630c0bc65bb7f7914b6e1e8e58aaa051e51c007ceb6ae90a477cc28"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": false,
        "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --maxWorkers=4",
        "startedAt": "2026-10-11T08:56:19.242Z",
        "finishedAt": "2026-10-11T09:05:06.546Z",
        "durationSeconds": 527.304,
        "exitCode": 1,
        "status": "fail",
        "result": "Test Files  1 failed | 270 passed | 2 skipped (273)\nTests  1 failed | 3448 passed | 5 skipped (3454)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 270,
            "failed": 1,
            "skipped": 2
          },
          "tests": {
            "passed": 3448,
            "failed": 1,
            "skipped": 5
          }
        },
        "terminalSummary": "Test Files  1 failed | 270 passed | 2 skipped (273)\nTests  1 failed | 3448 passed | 5 skipped (3454)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/unit.log",
        "logSha256": "e4437705e9763ed67939f8a1f15d1fd7ca85fa6e895eca2c167b62bee8125455",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/unit-source.json",
          "sha256": "a71871d63ca8637a860c268ba34a848d93e5016f32500b4e1ce69c29f4ed9a21",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T08:56:19.220Z",
          "manifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": false,
        "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts --maxWorkers=2",
        "startedAt": "2026-10-11T09:05:11.266Z",
        "finishedAt": "2026-10-11T09:07:13.470Z",
        "durationSeconds": 122.204,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 91,
            "failed": 0,
            "skipped": 0
          },
          "tests": {
            "passed": 1510,
            "failed": 0,
            "skipped": 6
          }
        },
        "terminalSummary": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/design.log",
        "logSha256": "452c75162b2783942b366a6eb77ec5898cc8cfc581bf5f58e88e3aa91f7c6f04",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/design-source.json",
          "sha256": "a35959883d6113a0df16e7b5c78c80cb0bc0a80e04829251ee55d139e76172d7",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T09:05:11.244Z",
          "manifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
      },
      {
        "command": "node node_modules/typescript/bin/tsc --noEmit",
        "startedAt": "2026-10-11T09:07:16.749Z",
        "finishedAt": "2026-10-11T09:08:30.798Z",
        "durationSeconds": 74.049,
        "exitCode": 0,
        "status": "pass",
        "result": "No TypeScript diagnostics.",
        "resultData": {
          "runner": "typescript",
          "errors": 0
        },
        "terminalSummary": "No TypeScript diagnostics.",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/types.log",
        "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/types-source.json",
          "sha256": "97fb49d9243dde147af7b3799af75f12163ac362a0264c71575f966fe0ee291c",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T09:07:16.722Z",
          "manifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
      },
      {
        "command": "node node_modules/eslint/bin/eslint.js .",
        "startedAt": "2026-10-11T09:08:34.511Z",
        "finishedAt": "2026-10-11T09:10:19.539Z",
        "durationSeconds": 105.028,
        "exitCode": 0,
        "status": "pass",
        "result": "33 problems (0 errors, 33 warnings)",
        "resultData": {
          "runner": "eslint",
          "errors": 0,
          "warnings": 33
        },
        "terminalSummary": "33 problems (0 errors, 33 warnings)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/lint.log",
        "logSha256": "99f93cbfe481bf5d5d4aa95e4f6e5464dd29cae7b633febb6e28c617b8b61fce",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/lint-source.json",
          "sha256": "f6a9190a3205028e49ac9eced95a4f32da797ebed83698a18693f61a9c7424a5",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T09:08:34.487Z",
          "manifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
      },
      {
        "command": "node node_modules/next/dist/bin/next build",
        "startedAt": "2026-10-11T09:10:25.206Z",
        "finishedAt": "2026-10-11T09:12:18.777Z",
        "durationSeconds": 113.571,
        "exitCode": 0,
        "status": "pass",
        "result": "✓ Compiled successfully in 46s\n✓ Generating static pages using 7 workers (49/49) in 6.2s\nFinalizing page optimization ...",
        "resultData": {
          "runner": "next-build",
          "compiled": true,
          "generated": true,
          "errors": 0
        },
        "terminalSummary": "✓ Compiled successfully in 46s\n✓ Generating static pages using 7 workers (49/49) in 6.2s\nFinalizing page optimization ...",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/build.log",
        "logSha256": "754ec484ce7da4f0f1db37315b2daffaea744cfea59f1222ac85cc27f60ac5d6",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/build-source.json",
          "sha256": "80e215bac01a5e6b0c1c7338ea3f930f262b8ff702803745c21022ad1c4f84ad",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T09:10:25.169Z",
          "manifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
      },
      {
        "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --project=chromium --workers=1",
        "startedAt": "2026-10-11T09:12:23.944Z",
        "finishedAt": "2026-10-11T09:14:09.125Z",
        "durationSeconds": 105.181,
        "exitCode": 0,
        "status": "pass",
        "result": "59 passed (1.7m)",
        "resultData": {
          "runner": "playwright",
          "tests": {
            "passed": 59,
            "failed": 0,
            "skipped": 0
          }
        },
        "terminalSummary": "59 passed (1.7m)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/browser.log",
        "logSha256": "e43ff5f96653938f84f62dab0023ade751963eddc6bb0ef0a983e9c284579f0c",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/browser-source.json",
          "sha256": "b055370c51ea49517f3eec783ae8d426c3a6ed4ac6959a7a77f3a42107f739fe",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T09:12:23.917Z",
          "manifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
      }
    ],
    "terminalOnlyChecks": [
      {
        "startedAt": "2026-10-08T21:53:16.8572376Z",
        "finishedAt": "2026-10-08T21:53:25.7517511Z",
        "durationSeconds": 8.8945135,
        "exitCode": 0,
        "command": "node node_modules/typescript/bin/tsc --noEmit",
        "status": "pass",
        "resultData": {
          "runner": "typescript",
          "errors": 0
        },
        "terminalOutput": "",
        "rawLogAvailable": false,
        "reason": "Successful tsc emitted no stdout; Tee-Object did not create review-final-types.log. Actual tool terminal exit/timing and pre-gate source03 are retained; no contemporaneous raw file is invented. Later canonical production build explicitly typechecked successfully.",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/review-source-03.json",
          "sha256": "1b5a2650d103b1400831bc80d2b5fbed9ec9b789c999d8c1fa02940391cca3f9",
          "revision": "821af3f74340f4c785985797299b41bf02eecbdb",
          "dirty": true,
          "claim": "working-tree",
          "capturedAt": "2026-10-08T21:53:12.232Z",
          "manifestSha256": "a702247e5af107209ee6accbcd39a09c3033ce22ba4fff356ab8ecdefe8651ab"
        }
      }
    ],
    "browserDisposition": "All 52 test cases passed, terminal exit0. Windows server teardown stalled; root verified exact runner20004/pwsh12544/cmd1736 and owned Next20988/start-server9188/build children17140/20916, stopped only the owned Next descendants and left runner/unrelated Node untouched. This was assisted teardown, not normal teardown. One unattributed Next dev streaming TypeError controller[kState].transformAlgorithm is not a function (digest2206780199, ignored frames) occurred between successful cases47 and48; log does not identify route/action/source frame. Retained for independent review; no error-free runtime claim."
  },
  "logRetentionIncident": {
    "recordedAt": "2026-10-09T07:58:16.429Z",
    "cause": "Clean preparation reused four historical filenames",
    "recovered": [
      "types from byte-identical final-types.log",
      "lint from byte-identical final-lint.log"
    ],
    "unrecoverable": [
      "historical release-build raw bytes",
      "historical release-browser raw bytes"
    ],
    "preserved": "Original raw digests and existing committed terminal transcripts; current clean log bytes moved to unique names",
    "newEvidence": "27-CLEAN-SOURCE-PREPARATION.md"
  },
  "releaseCandidateVerification": {
    "schemaVersion": 1,
    "disposition": "Fresh exact58897a94 six full engineering gates pass. Reviewed sequential runner, ordering, clean-source, skip and immutable log guards are preserved. Candidate retains30 money/scheduler files and migrations0034–0038 from the disabled current web baseline. Scoped actual Vercel ingress proof is at this same source. Public deployments remain web b61cb4a4 and Ops D67; old cold/A/B and live observations remain dated history. Full single-release acceptance is pending.",
    "supersedesSha256": "7cde626fc07a2a72ee2b89cd4ebc56c6a5c1b34779a495f2a37ded84c5c39370",
    "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
    "sourceManifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a",
    "gates": [
      {
        "command": "node node_modules/vitest/vitest.mjs run",
        "startedAt": "2026-10-11T09:16:12.614Z",
        "finishedAt": "2026-10-11T09:24:10.312Z",
        "durationSeconds": 477.698,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  271 passed | 2 skipped (273)\nTests  3449 passed | 5 skipped (3454)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 271,
            "failed": 0,
            "skipped": 2
          },
          "tests": {
            "passed": 3449,
            "failed": 0,
            "skipped": 5
          }
        },
        "terminalSummary": "Test Files  271 passed | 2 skipped (273)\nTests  3449 passed | 5 skipped (3454)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/gates/unit.log",
        "logSha256": "d4bdd0f883b51a129d412b734f224e401dd87bca56e2f72264f24133bef21f97",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/gates/unit-source.json",
          "sha256": "54a89e26f0bd8515b09e4962624fc28f65a5afa4bf70b43ec126ab8a3448cdf3",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T09:16:12.595Z",
          "manifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "executedCommand": "node node_modules/vitest/vitest.mjs run --maxWorkers=4 --config C:/Users/Admin/.codex/worktrees/phase27-production-continuity/FitOut/playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/unit-scheduling.config.mjs",
        "additionalArguments": "--maxWorkers=4 --config C:/Users/Admin/.codex/worktrees/phase27-production-continuity/FitOut/playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/unit-scheduling.config.mjs",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
      },
      {
        "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts",
        "startedAt": "2026-10-11T09:24:15.064Z",
        "finishedAt": "2026-10-11T09:26:09.615Z",
        "durationSeconds": 114.551,
        "exitCode": 0,
        "status": "pass",
        "result": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "resultData": {
          "runner": "vitest",
          "files": {
            "passed": 91,
            "failed": 0,
            "skipped": 0
          },
          "tests": {
            "passed": 1510,
            "failed": 0,
            "skipped": 6
          }
        },
        "terminalSummary": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/gates/design.log",
        "logSha256": "3c071da78e4ff2b613814f22e9ba573419905949c55d31f61769183288878770",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/gates/design-source.json",
          "sha256": "734c9841265302af12cb579f1f3b3b6f8704afc0491b5fdad54020d177f12f1b",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T09:24:15.042Z",
          "manifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "executedCommand": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts --maxWorkers=2",
        "additionalArguments": "--maxWorkers=2",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
      },
      {
        "command": "node node_modules/typescript/bin/tsc --noEmit",
        "startedAt": "2026-10-11T09:26:14.651Z",
        "finishedAt": "2026-10-11T09:26:25.605Z",
        "durationSeconds": 10.954,
        "exitCode": 0,
        "status": "pass",
        "result": "No TypeScript diagnostics.",
        "resultData": {
          "runner": "typescript",
          "errors": 0
        },
        "terminalSummary": "No TypeScript diagnostics.",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/gates/types.log",
        "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/gates/types-source.json",
          "sha256": "0efea3c9a743480ce17d5ca222eb1bc8b1b6bbff4803c5642966929ad0c1c798",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T09:26:14.622Z",
          "manifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "executedCommand": "node node_modules/typescript/bin/tsc --noEmit",
        "additionalArguments": "",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
      },
      {
        "command": "node node_modules/eslint/bin/eslint.js .",
        "startedAt": "2026-10-11T09:26:29.220Z",
        "finishedAt": "2026-10-11T09:28:17.250Z",
        "durationSeconds": 108.03,
        "exitCode": 0,
        "status": "pass",
        "result": "33 problems (0 errors, 33 warnings)",
        "resultData": {
          "runner": "eslint",
          "errors": 0,
          "warnings": 33
        },
        "terminalSummary": "33 problems (0 errors, 33 warnings)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/gates/lint.log",
        "logSha256": "99f93cbfe481bf5d5d4aa95e4f6e5464dd29cae7b633febb6e28c617b8b61fce",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/gates/lint-source.json",
          "sha256": "59f86afcc92e2e8ec5dae4fa62800ce6d55f163edb3105e7c1212ea6086a21fe",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T09:26:29.194Z",
          "manifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "executedCommand": "node node_modules/eslint/bin/eslint.js .",
        "additionalArguments": "",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
      },
      {
        "command": "node node_modules/next/dist/bin/next build",
        "startedAt": "2026-10-11T09:28:20.795Z",
        "finishedAt": "2026-10-11T09:30:09.132Z",
        "durationSeconds": 108.337,
        "exitCode": 0,
        "status": "pass",
        "result": "✓ Compiled successfully in 48s\n✓ Generating static pages using 7 workers (49/49) in 4.7s\nFinalizing page optimization ...",
        "resultData": {
          "runner": "next-build",
          "compiled": true,
          "generated": true,
          "errors": 0
        },
        "terminalSummary": "✓ Compiled successfully in 48s\n✓ Generating static pages using 7 workers (49/49) in 4.7s\nFinalizing page optimization ...",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/gates/build.log",
        "logSha256": "ab005943633bd48681155f56e938a6757987a83e255538779042bc43a04a34e8",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/gates/build-source.json",
          "sha256": "c172b4fe4d2a44ab279e08010483f93a4a4524feb9c0aa9aef94fbcee71ac372",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T09:28:20.774Z",
          "manifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "executedCommand": "node node_modules/next/dist/bin/next build",
        "additionalArguments": "",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
      },
      {
        "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts --project=chromium",
        "startedAt": "2026-10-11T09:30:15.477Z",
        "finishedAt": "2026-10-11T09:31:55.599Z",
        "durationSeconds": 100.122,
        "exitCode": 0,
        "status": "pass",
        "result": "59 passed (1.6m)",
        "resultData": {
          "runner": "playwright",
          "tests": {
            "passed": 59,
            "failed": 0,
            "skipped": 0
          }
        },
        "terminalSummary": "59 passed (1.6m)",
        "evidenceKind": "raw-log",
        "rawLogAvailable": true,
        "rawLogPath": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/gates/browser.log",
        "logSha256": "004baaed32fa57f18e9f59b72ab2c8c505683d9309fff48a7f7c352c6ab7996b",
        "logFiltering": "credential patterns redacted; runner terminal totals preserved",
        "testedSource": {
          "provenance": "snapshot",
          "path": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/gates/browser-source.json",
          "sha256": "8ffbb64d5f76184f39407f5c5dc29aa399302b36ba7f5afbbb5623aca8a3ad00",
          "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
          "dirty": false,
          "claim": "clean-revision",
          "capturedAt": "2026-10-11T09:30:15.449Z",
          "manifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a"
        },
        "timedOut": false,
        "signal": null,
        "sourceGuardPassed": true,
        "skipGuardPassed": true,
        "acceptancePassed": true,
        "executedCommand": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --project=chromium --workers=1",
        "additionalArguments": "e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --workers=1",
        "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
      }
    ],
    "productionContinuityProof": {
      "path": "playwright/.cache/phase27-08/release-source-continuity-58897a94-20261011.json",
      "sha256": "baffe8f2b34a65d8c34b5a2284d2b1574378aa47fab145cda4d64f83ca871bdd"
    },
    "runnerReport": {
      "path": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/gates/report.json",
      "sha256": "fba7b80ec4c78abe8a38880ba9b8508a5a73ea5a155e625115e2d95248bcae70"
    },
    "sourceExport": {
      "path": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/source-export.json",
      "sha256": "7841bcfeec84d92ce65d86f012064af291c5fcdddb31a9be756610b8d220a7fa"
    },
    "harnessProvenance": "Same six fixed jobs executed via committed runSequential API in a fresh physical exact-source Git archive export. Prior physical node_modules copy reused within verified owned exports, with package source unchanged; no junction. Failed direct-worktree attempt retained. No application, runner or validator acceptance change. Source captured before and after every gate; raw reports retained.",
    "supplementalCompatibility": {
      "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
      "scope": "Historical D67 cold/A/B proofs retained in archivedReleaseCandidateVerifications; not claimed as fresh58897a94 evidence."
    },
    "unitScheduling": {
      "config": {
        "path": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/unit-scheduling.config.mjs",
        "sha256": "17b590c9e357832b74e31ca21e86d6d77405ccbd79f5a4ef1df4f2114127929f"
      },
      "originalCensus": {
        "path": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/original-census.json",
        "sha256": "f8dde3de755781ba96d0bf6f1c18917b78897cefec3f7bc24e4484923bbb4a64"
      },
      "scheduledCensus": {
        "path": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/scheduled-census.json",
        "sha256": "7ed7672d458ed200eba15c61f5d8738027609b305776dac1f662310c472efeeb"
      },
      "originalFiles": 273,
      "scheduledUniqueFiles": 273,
      "contactSerialFiles": 8,
      "otherParallelFiles": 265,
      "assertionsChanged": false,
      "skipPolicyChanged": false,
      "timeoutPolicyChanged": false,
      "officialReference": "https://main.vitest.dev/guide/recipes/parallel-sequential.html",
      "gapLedger": ".planning/phases/27-app-subdomain-marketing-website/deferred-items.md"
    }
  },
  "archivedReleaseCandidateVerifications": [
    {
      "schemaVersion": 1,
      "disposition": "Six full clean committed-source gates passed under the verified local runtime. Historical failed attempts retained. Additional fresh cold-server proof passes on the same build/revision/manifest. External prerequisites and live acceptance remain pending.",
      "supersedesSha256": "16bda288f9e279680a34c961a3dba8a9cc0c3e2e0ebd78c30d6f855214635b37",
      "revision": "596b47460282d756a1a5882c4c2d86f18b7ff851",
      "sourceManifestSha256": "df0862eacdc3b9e1a57419bc03b8fee0ac3d3e539600418b81b772a5fa2137f4",
      "gates": [
        {
          "command": "node node_modules/vitest/vitest.mjs run",
          "startedAt": "2026-10-09T15:32:58.213Z",
          "finishedAt": "2026-10-09T15:39:55.689Z",
          "durationSeconds": 417.476,
          "exitCode": 0,
          "status": "pass",
          "result": "Test Files  259 passed | 2 skipped (261)\nTests  3343 passed | 5 skipped (3348)",
          "resultData": {
            "runner": "vitest",
            "files": {
              "passed": 259,
              "failed": 0,
              "skipped": 2
            },
            "tests": {
              "passed": 3343,
              "failed": 0,
              "skipped": 5
            }
          },
          "terminalSummary": "Test Files  259 passed | 2 skipped (261)\nTests  3343 passed | 5 skipped (3348)",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/unit.log",
          "logSha256": "b8977d3b02b08bfadf937d7b518df913d2ee9213493b3a24fb8aa93e5d39e2b6",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/unit-source.json",
            "sha256": "9e0da75dfa8bbfc1e82de4d783d0630543694f3fbb4bc5a4db81eaebb71ed542",
            "revision": "596b47460282d756a1a5882c4c2d86f18b7ff851",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-09T15:32:58.194Z",
            "manifestSha256": "df0862eacdc3b9e1a57419bc03b8fee0ac3d3e539600418b81b772a5fa2137f4"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "--maxWorkers=4",
          "executedCommand": "node node_modules/vitest/vitest.mjs run --maxWorkers=4",
          "commandRepresentation": "Canonical command and additionalArguments per retained schema; executedCommand and original raw record/report retain complete actual argv and ordering."
        },
        {
          "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts",
          "startedAt": "2026-10-09T15:39:59.588Z",
          "finishedAt": "2026-10-09T15:41:45.361Z",
          "durationSeconds": 105.773,
          "exitCode": 0,
          "status": "pass",
          "result": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
          "resultData": {
            "runner": "vitest",
            "files": {
              "passed": 91,
              "failed": 0,
              "skipped": 0
            },
            "tests": {
              "passed": 1510,
              "failed": 0,
              "skipped": 6
            }
          },
          "terminalSummary": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/design.log",
          "logSha256": "ca95fcda8227964e9088912e8f2dd1c4fc7012081690d0573bcb6b4694d1ee84",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/design-source.json",
            "sha256": "e1f4d7cbae2cc24042cd5cdf7d3d59b942d0df9374f635cfb0cb295934018d73",
            "revision": "596b47460282d756a1a5882c4c2d86f18b7ff851",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-09T15:39:59.567Z",
            "manifestSha256": "df0862eacdc3b9e1a57419bc03b8fee0ac3d3e539600418b81b772a5fa2137f4"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "--maxWorkers=2",
          "executedCommand": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts --maxWorkers=2",
          "commandRepresentation": "Canonical command and additionalArguments per retained schema; executedCommand and original raw record/report retain complete actual argv and ordering."
        },
        {
          "command": "node node_modules/typescript/bin/tsc --noEmit",
          "startedAt": "2026-10-09T15:41:48.632Z",
          "finishedAt": "2026-10-09T15:42:54.730Z",
          "durationSeconds": 66.098,
          "exitCode": 0,
          "status": "pass",
          "result": "No TypeScript diagnostics.",
          "resultData": {
            "runner": "typescript",
            "errors": 0
          },
          "terminalSummary": "No TypeScript diagnostics.",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/types.log",
          "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/types-source.json",
            "sha256": "22321da267a9c7499a0e33053488d00f0b0652df4e981814580b39929bcc432d",
            "revision": "596b47460282d756a1a5882c4c2d86f18b7ff851",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-09T15:41:48.613Z",
            "manifestSha256": "df0862eacdc3b9e1a57419bc03b8fee0ac3d3e539600418b81b772a5fa2137f4"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "",
          "executedCommand": "node node_modules/typescript/bin/tsc --noEmit",
          "commandRepresentation": "Canonical command and additionalArguments per retained schema; executedCommand and original raw record/report retain complete actual argv and ordering."
        },
        {
          "command": "node node_modules/eslint/bin/eslint.js .",
          "startedAt": "2026-10-09T15:42:57.872Z",
          "finishedAt": "2026-10-09T15:44:24.274Z",
          "durationSeconds": 86.402,
          "exitCode": 0,
          "status": "pass",
          "result": "33 problems (0 errors, 33 warnings)",
          "resultData": {
            "runner": "eslint",
            "errors": 0,
            "warnings": 33
          },
          "terminalSummary": "33 problems (0 errors, 33 warnings)",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/lint.log",
          "logSha256": "c85b6c62a50847bebe2e99cb093ae4fc9d9d938ca7eeef2b6454d289de63d76d",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/lint-source.json",
            "sha256": "a70d67f36d7e91cb4e2d1969758b4aa14020e893ede8bc08407e477f9f2202d2",
            "revision": "596b47460282d756a1a5882c4c2d86f18b7ff851",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-09T15:42:57.854Z",
            "manifestSha256": "df0862eacdc3b9e1a57419bc03b8fee0ac3d3e539600418b81b772a5fa2137f4"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "",
          "executedCommand": "node node_modules/eslint/bin/eslint.js .",
          "commandRepresentation": "Canonical command and additionalArguments per retained schema; executedCommand and original raw record/report retain complete actual argv and ordering."
        },
        {
          "command": "node node_modules/next/dist/bin/next build",
          "startedAt": "2026-10-09T15:44:28.104Z",
          "finishedAt": "2026-10-09T15:45:52.887Z",
          "durationSeconds": 84.783,
          "exitCode": 0,
          "status": "pass",
          "result": "✓ Compiled successfully in 39.7s\n✓ Generating static pages using 7 workers (46/46) in 4.3s\nFinalizing page optimization ...",
          "resultData": {
            "runner": "next-build",
            "compiled": true,
            "generated": true,
            "errors": 0
          },
          "terminalSummary": "✓ Compiled successfully in 39.7s\n✓ Generating static pages using 7 workers (46/46) in 4.3s\nFinalizing page optimization ...",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/build.log",
          "logSha256": "9e6bd428d76a610f8d59eb8fc1abea452c5b5b361abdfe4622b080b65789663e",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/build-source.json",
            "sha256": "5362d329a1910e1d2df4fdaaeee6fc432007557752c0c49f48ee7cbaec6f711f",
            "revision": "596b47460282d756a1a5882c4c2d86f18b7ff851",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-09T15:44:28.082Z",
            "manifestSha256": "df0862eacdc3b9e1a57419bc03b8fee0ac3d3e539600418b81b772a5fa2137f4"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "",
          "executedCommand": "node node_modules/next/dist/bin/next build",
          "commandRepresentation": "Canonical command and additionalArguments per retained schema; executedCommand and original raw record/report retain complete actual argv and ordering."
        },
        {
          "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts --project=chromium",
          "startedAt": "2026-10-09T15:45:56.113Z",
          "finishedAt": "2026-10-09T15:47:25.729Z",
          "durationSeconds": 89.616,
          "exitCode": 0,
          "status": "pass",
          "result": "59 passed (1.5m)",
          "resultData": {
            "runner": "playwright",
            "tests": {
              "passed": 59,
              "failed": 0,
              "skipped": 0
            }
          },
          "terminalSummary": "59 passed (1.5m)",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/browser.log",
          "logSha256": "46b5c7a01956f69b86337c04e414452ca8e63ba443a5d5aad5cde8281d2ddf4d",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-596b4746-adf004b6-ad43-48dd-ae1b-9030fbcf8fac/gates/browser-source.json",
            "sha256": "b82d5d60eaaf70bef6bde7cd96b1c9b305d6b0a45d2065997b783c7347c9cfd2",
            "revision": "596b47460282d756a1a5882c4c2d86f18b7ff851",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-09T15:45:56.090Z",
            "manifestSha256": "df0862eacdc3b9e1a57419bc03b8fee0ac3d3e539600418b81b772a5fa2137f4"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --workers=1",
          "executedCommand": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --project=chromium --workers=1",
          "commandRepresentation": "Canonical command and additionalArguments per retained schema; executedCommand and original raw record/report retain complete actual argv and ordering."
        }
      ]
    },
    {
      "schemaVersion": 1,
      "disposition": "All six complete guarded gates and fresh cold/warm pass on the quota/migration-bound committed archive. Bounded paired Preview write/session/Contact proof is complete separately; prior candidates and failed attempts retained. Original production cutover and full live matrix remain pending.",
      "supersedesSha256": "5ad127bb911458a2477099d25292aa0c2928a7a22c1d0ccb4dba72ed5e3d7ff1",
      "revision": "b8358b11a63aadef2c84c9eb64b78be0a07ddcd4",
      "sourceManifestSha256": "e51bbc5b9df9c302bf354eb1e48a9c2ac0080e2d3c2cbba321f35ec992ec9467",
      "gates": [
        {
          "command": "node node_modules/vitest/vitest.mjs run",
          "startedAt": "2026-10-09T17:53:45.143Z",
          "finishedAt": "2026-10-09T18:01:13.675Z",
          "durationSeconds": 448.532,
          "exitCode": 0,
          "status": "pass",
          "result": "Test Files  260 passed | 2 skipped (262)\nTests  3359 passed | 5 skipped (3364)",
          "resultData": {
            "runner": "vitest",
            "files": {
              "passed": 260,
              "failed": 0,
              "skipped": 2
            },
            "tests": {
              "passed": 3359,
              "failed": 0,
              "skipped": 5
            }
          },
          "terminalSummary": "Test Files  260 passed | 2 skipped (262)\nTests  3359 passed | 5 skipped (3364)",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/unit.log",
          "logSha256": "4d26f4ca7ad26f275e269ab37eecf89984b669ac88af18c60ef53020c5debd8f",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/unit-source.json",
            "sha256": "57df5949f9c12d38f91aef60fa8147696669c0600b69b41b375b824aa8cbd330",
            "revision": "b8358b11a63aadef2c84c9eb64b78be0a07ddcd4",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-09T17:53:45.127Z",
            "manifestSha256": "e51bbc5b9df9c302bf354eb1e48a9c2ac0080e2d3c2cbba321f35ec992ec9467"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "--maxWorkers=4",
          "executedCommand": "node node_modules/vitest/vitest.mjs run --maxWorkers=4",
          "commandRepresentation": "Canonical command plus additionalArguments; immutable raw record/report retains actual complete argv and ordering."
        },
        {
          "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts",
          "startedAt": "2026-10-09T18:01:16.889Z",
          "finishedAt": "2026-10-09T18:03:06.038Z",
          "durationSeconds": 109.149,
          "exitCode": 0,
          "status": "pass",
          "result": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
          "resultData": {
            "runner": "vitest",
            "files": {
              "passed": 91,
              "failed": 0,
              "skipped": 0
            },
            "tests": {
              "passed": 1510,
              "failed": 0,
              "skipped": 6
            }
          },
          "terminalSummary": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/design.log",
          "logSha256": "28282f36a847dd5d3d0efa448d3c2cb4510ef3e0cde4824602f517c8f8d98001",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/design-source.json",
            "sha256": "e9104eb7ac4c1fd837c01140ff233527f3c37642b42021c08fe302fab517b1f6",
            "revision": "b8358b11a63aadef2c84c9eb64b78be0a07ddcd4",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-09T18:01:16.869Z",
            "manifestSha256": "e51bbc5b9df9c302bf354eb1e48a9c2ac0080e2d3c2cbba321f35ec992ec9467"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "--maxWorkers=2",
          "executedCommand": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts --maxWorkers=2",
          "commandRepresentation": "Canonical command plus additionalArguments; immutable raw record/report retains actual complete argv and ordering."
        },
        {
          "command": "node node_modules/typescript/bin/tsc --noEmit",
          "startedAt": "2026-10-09T18:03:09.530Z",
          "finishedAt": "2026-10-09T18:04:11.567Z",
          "durationSeconds": 62.037,
          "exitCode": 0,
          "status": "pass",
          "result": "No TypeScript diagnostics.",
          "resultData": {
            "runner": "typescript",
            "errors": 0
          },
          "terminalSummary": "No TypeScript diagnostics.",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/types.log",
          "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/types-source.json",
            "sha256": "0846b79df93caed07b81fdae6e4d2ee77f597cc7b4664e9d4a83ec2bbb89d624",
            "revision": "b8358b11a63aadef2c84c9eb64b78be0a07ddcd4",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-09T18:03:09.511Z",
            "manifestSha256": "e51bbc5b9df9c302bf354eb1e48a9c2ac0080e2d3c2cbba321f35ec992ec9467"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "",
          "executedCommand": "node node_modules/typescript/bin/tsc --noEmit",
          "commandRepresentation": "Canonical command plus additionalArguments; immutable raw record/report retains actual complete argv and ordering."
        },
        {
          "command": "node node_modules/eslint/bin/eslint.js .",
          "startedAt": "2026-10-09T18:04:15.006Z",
          "finishedAt": "2026-10-09T18:06:10.738Z",
          "durationSeconds": 115.732,
          "exitCode": 0,
          "status": "pass",
          "result": "33 problems (0 errors, 33 warnings)",
          "resultData": {
            "runner": "eslint",
            "errors": 0,
            "warnings": 33
          },
          "terminalSummary": "33 problems (0 errors, 33 warnings)",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/lint.log",
          "logSha256": "978e50f65040d1d7a0b1826e8d82186f252a05df31dc92cbbac3ed1f5dff9007",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/lint-source.json",
            "sha256": "80eb23505db8ecf0710e623b58bec2945bec7d9f5903b4085c588179b31b1083",
            "revision": "b8358b11a63aadef2c84c9eb64b78be0a07ddcd4",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-09T18:04:14.987Z",
            "manifestSha256": "e51bbc5b9df9c302bf354eb1e48a9c2ac0080e2d3c2cbba321f35ec992ec9467"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "",
          "executedCommand": "node node_modules/eslint/bin/eslint.js .",
          "commandRepresentation": "Canonical command plus additionalArguments; immutable raw record/report retains actual complete argv and ordering."
        },
        {
          "command": "node node_modules/next/dist/bin/next build",
          "startedAt": "2026-10-09T18:06:15.688Z",
          "finishedAt": "2026-10-09T18:07:51.897Z",
          "durationSeconds": 96.209,
          "exitCode": 0,
          "status": "pass",
          "result": "✓ Compiled successfully in 45s\n✓ Generating static pages using 7 workers (46/46) in 5.4s\nFinalizing page optimization ...",
          "resultData": {
            "runner": "next-build",
            "compiled": true,
            "generated": true,
            "errors": 0
          },
          "terminalSummary": "✓ Compiled successfully in 45s\n✓ Generating static pages using 7 workers (46/46) in 5.4s\nFinalizing page optimization ...",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/build.log",
          "logSha256": "7c232f311502c3cb5fda5a8b6489793e52414fb91b7a7976dfa3638e9daeff21",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/build-source.json",
            "sha256": "c223ef29f6d6444f73d97312510a9cfe5292c47c3ee66aee40517f2cbb001c33",
            "revision": "b8358b11a63aadef2c84c9eb64b78be0a07ddcd4",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-09T18:06:15.665Z",
            "manifestSha256": "e51bbc5b9df9c302bf354eb1e48a9c2ac0080e2d3c2cbba321f35ec992ec9467"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "",
          "executedCommand": "node node_modules/next/dist/bin/next build",
          "commandRepresentation": "Canonical command plus additionalArguments; immutable raw record/report retains actual complete argv and ordering."
        },
        {
          "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts --project=chromium",
          "startedAt": "2026-10-09T18:07:55.823Z",
          "finishedAt": "2026-10-09T18:09:30.456Z",
          "durationSeconds": 94.633,
          "exitCode": 0,
          "status": "pass",
          "result": "59 passed (1.5m)",
          "resultData": {
            "runner": "playwright",
            "tests": {
              "passed": 59,
              "failed": 0,
              "skipped": 0
            }
          },
          "terminalSummary": "59 passed (1.5m)",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/browser.log",
          "logSha256": "571a81142d4c23a26165044430f97eaaeb407a267512a788f706476301a78861",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/browser-source.json",
            "sha256": "67c05abdc1b9eb85e45f00717427d50900919f78d76e6510c48406c7f44d3090",
            "revision": "b8358b11a63aadef2c84c9eb64b78be0a07ddcd4",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-09T18:07:55.792Z",
            "manifestSha256": "e51bbc5b9df9c302bf354eb1e48a9c2ac0080e2d3c2cbba321f35ec992ec9467"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --workers=1",
          "executedCommand": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --project=chromium --workers=1",
          "commandRepresentation": "Canonical command plus additionalArguments; immutable raw record/report retains actual complete argv and ordering."
        }
      ],
      "releaseEligibility": "Ineligible against observed production36455580; retained stable Preview and local proof only."
    },
    {
      "schemaVersion": 1,
      "disposition": "Fresh exact-source six full gates, cold/warm and separately rebuilt compatibility A/B runtime proof pass. Candidate integrates deployed production baseline, preserves payout code, and renumbers reviewed Contact SQL0037. Existing owner Preview remains b835; production cutover/live provider/inbox acceptance remain pending.",
      "supersedesSha256": "15c0ab3c2e11f45bccdae325342cb90c5bff94b3d3f054a8e3ba85f72c642de3",
      "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
      "sourceManifestSha256": "da10f8a0faea204c810cbe544142971181c86bab0d252d5515ea3b671d8a8157",
      "gates": [
        {
          "command": "node node_modules/vitest/vitest.mjs run",
          "startedAt": "2026-10-10T07:14:12.566Z",
          "finishedAt": "2026-10-10T07:21:29.279Z",
          "durationSeconds": 436.713,
          "exitCode": 0,
          "status": "pass",
          "result": "Test Files  267 passed | 2 skipped (269)\nTests  3429 passed | 5 skipped (3434)",
          "resultData": {
            "runner": "vitest",
            "files": {
              "passed": 267,
              "failed": 0,
              "skipped": 2
            },
            "tests": {
              "passed": 3429,
              "failed": 0,
              "skipped": 5
            }
          },
          "terminalSummary": "Test Files  267 passed | 2 skipped (269)\nTests  3429 passed | 5 skipped (3434)",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/unit.log",
          "logSha256": "d8e50d143a29671dab3749607cd33617256140b274e9331c040c0326ff8bdb62",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/unit-source.json",
            "sha256": "c9e6791edcf9976135a71222ec09858a7d6222287195dd4b87c7646f3fe1e0e3",
            "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-10T07:14:12.547Z",
            "manifestSha256": "da10f8a0faea204c810cbe544142971181c86bab0d252d5515ea3b671d8a8157"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "--maxWorkers=4",
          "executedCommand": "node node_modules/vitest/vitest.mjs run --maxWorkers=4",
          "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
        },
        {
          "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts",
          "startedAt": "2026-10-10T07:21:33.705Z",
          "finishedAt": "2026-10-10T07:23:20.014Z",
          "durationSeconds": 106.309,
          "exitCode": 0,
          "status": "pass",
          "result": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
          "resultData": {
            "runner": "vitest",
            "files": {
              "passed": 91,
              "failed": 0,
              "skipped": 0
            },
            "tests": {
              "passed": 1510,
              "failed": 0,
              "skipped": 6
            }
          },
          "terminalSummary": "Test Files  91 passed (91)\nTests  1510 passed | 6 skipped (1516)",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/design.log",
          "logSha256": "9a2e432aca9ee8cb094015d145d9ebda2b53b44ed97af80830ae535db311d91f",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/design-source.json",
            "sha256": "8a19c71adbda9560aec803ec771d4b61a963f969f99bbb5fe144eed88fc20d40",
            "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-10T07:21:33.686Z",
            "manifestSha256": "da10f8a0faea204c810cbe544142971181c86bab0d252d5515ea3b671d8a8157"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "--maxWorkers=2",
          "executedCommand": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts --maxWorkers=2",
          "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
        },
        {
          "command": "node node_modules/typescript/bin/tsc --noEmit",
          "startedAt": "2026-10-10T07:23:23.123Z",
          "finishedAt": "2026-10-10T07:24:27.997Z",
          "durationSeconds": 64.874,
          "exitCode": 0,
          "status": "pass",
          "result": "No TypeScript diagnostics.",
          "resultData": {
            "runner": "typescript",
            "errors": 0
          },
          "terminalSummary": "No TypeScript diagnostics.",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/types.log",
          "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/types-source.json",
            "sha256": "b035f5c2d23cb6704c1602c4c5e4085748b4bfc60496f54c64a3f2adffeb3ac5",
            "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-10T07:23:23.101Z",
            "manifestSha256": "da10f8a0faea204c810cbe544142971181c86bab0d252d5515ea3b671d8a8157"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "",
          "executedCommand": "node node_modules/typescript/bin/tsc --noEmit",
          "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
        },
        {
          "command": "node node_modules/eslint/bin/eslint.js .",
          "startedAt": "2026-10-10T07:24:31.403Z",
          "finishedAt": "2026-10-10T07:26:01.358Z",
          "durationSeconds": 89.955,
          "exitCode": 0,
          "status": "pass",
          "result": "33 problems (0 errors, 33 warnings)",
          "resultData": {
            "runner": "eslint",
            "errors": 0,
            "warnings": 33
          },
          "terminalSummary": "33 problems (0 errors, 33 warnings)",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/lint.log",
          "logSha256": "0a032441420e5236ac2bb5b8d41945742ded83587a8b3fee2bdefabab8b38d05",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/lint-source.json",
            "sha256": "289412dcfdadb3a74e893763f556ffcf1fd21f65575ef797fd7d53fbbc6ce69c",
            "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-10T07:24:31.381Z",
            "manifestSha256": "da10f8a0faea204c810cbe544142971181c86bab0d252d5515ea3b671d8a8157"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "",
          "executedCommand": "node node_modules/eslint/bin/eslint.js .",
          "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
        },
        {
          "command": "node node_modules/next/dist/bin/next build",
          "startedAt": "2026-10-10T07:26:05.596Z",
          "finishedAt": "2026-10-10T07:27:33.571Z",
          "durationSeconds": 87.975,
          "exitCode": 0,
          "status": "pass",
          "result": "✓ Compiled successfully in 39.3s\n✓ Generating static pages using 7 workers (48/48) in 5.5s\nFinalizing page optimization ...",
          "resultData": {
            "runner": "next-build",
            "compiled": true,
            "generated": true,
            "errors": 0
          },
          "terminalSummary": "✓ Compiled successfully in 39.3s\n✓ Generating static pages using 7 workers (48/48) in 5.5s\nFinalizing page optimization ...",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/build.log",
          "logSha256": "43e59b017f0573feccbb89e358809687685c2cd83db71eabb5c5f61bb985defe",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/build-source.json",
            "sha256": "31fa7dc682438ac43e8cf47831d9380e49dccc51e495101d4bd2e01d90b0100b",
            "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-10T07:26:05.574Z",
            "manifestSha256": "da10f8a0faea204c810cbe544142971181c86bab0d252d5515ea3b671d8a8157"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "",
          "executedCommand": "node node_modules/next/dist/bin/next build",
          "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
        },
        {
          "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts --project=chromium",
          "startedAt": "2026-10-10T07:27:37.898Z",
          "finishedAt": "2026-10-10T07:29:13.259Z",
          "durationSeconds": 95.361,
          "exitCode": 0,
          "status": "pass",
          "result": "59 passed (1.5m)",
          "resultData": {
            "runner": "playwright",
            "tests": {
              "passed": 59,
              "failed": 0,
              "skipped": 0
            }
          },
          "terminalSummary": "59 passed (1.5m)",
          "evidenceKind": "raw-log",
          "rawLogAvailable": true,
          "rawLogPath": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/browser.log",
          "logSha256": "5d4a3a64d732f2f4339ad72a26e88038638828e888384fc0538eaf154d46a9c3",
          "logFiltering": "credential patterns redacted; runner terminal totals preserved",
          "testedSource": {
            "provenance": "snapshot",
            "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/gates/browser-source.json",
            "sha256": "3b5fcc7727bb6b2e8767141c94366ee2d10b28487e70af8e8ccd4e22f0eff20a",
            "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
            "dirty": false,
            "claim": "clean-revision",
            "capturedAt": "2026-10-10T07:27:37.874Z",
            "manifestSha256": "da10f8a0faea204c810cbe544142971181c86bab0d252d5515ea3b671d8a8157"
          },
          "timedOut": false,
          "signal": null,
          "sourceGuardPassed": true,
          "skipGuardPassed": true,
          "acceptancePassed": true,
          "additionalArguments": "e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --workers=1",
          "executedCommand": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts e2e/marketing-search-contract.spec.ts e2e/marketing-streaming.spec.ts --config playwright.streaming.config.ts --project=chromium --workers=1",
          "commandRepresentation": "Canonical command plus additionalArguments; immutable runner record retains actual argv."
        }
      ],
      "coldProof": {
        "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/final-cold-9f749f37-33e6-4aa9-a097-4e2aac46f348/report.json",
        "sha256": "90911e1bad9f7fd9934781b91773b8a499162a69c70c59844f9140450564b6f1"
      },
      "compatibilityProof": {
        "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/compatibility-ca0ae860-03fd-4bc0-9257-4af46d4cd7da/report.json",
        "sha256": "bfe6fc5ad2af0cb10fac67a08ac12ee865d5b2f000e5da6ea1f41edf151c239c"
      },
      "productionContinuityProof": {
        "path": "playwright/.cache/phase27-08/production-continuity-source-d67fbecf-20261010.json",
        "sha256": "87c703d821c01611fb931651251f61d6e4e19dbceb52a0249adafc16f4f5d75b"
      },
      "archiveDisposition": "Superseded as proposed candidate by exact58897a94. Original six full gates, cold and compatibility proof remain dated D67 evidence; no source relabeling."
    }
  ],
  "retainedAttemptArtifacts": [
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/browser-post-source.json",
      "sha256": "b569011795e2d013851a4169c7f967421624e75032d5cce6d8147653f0c070c8",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/browser-record.json",
      "sha256": "c5eec432820dded48f8ee97af5cf499229e091a8ea828a828a5afdf279af48b7",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/browser-source.json",
      "sha256": "848b260fa49fe4a5ecdf7d7fb64444c05bde91429909a0b3f7a527f0e88712e6",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/browser.log",
      "sha256": "57657f7786fee5ec5bd468dad0c4ad9f16faa927f37382a35dc50ce62f70ed99",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/build-post-source.json",
      "sha256": "25046b40caddca508ecc2ac52a1094d98fcab653784d42372d5825c4cf0b0bfe",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/build-record.json",
      "sha256": "d705a35b7b342b11ae21c50e1c3f88e7be889a742be741995c46a8c59c23c606",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/build-source.json",
      "sha256": "fbf1eb34592fba2cbbac7d4accb7cfc2ce456c94a89ac55f8b0c384cc889b619",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/build.log",
      "sha256": "d93059e7fc104723c739bfaa5aef9e9086ba4ee81669374be3d80ec9d5bbc98d",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/design-post-source.json",
      "sha256": "35c7fe584ebafb849210ce3072354f3359811bed1d165eaf1b9fe8ac6dbc546f",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/design-record.json",
      "sha256": "969281c37236c8d5e86fc08e8c5a184c766fc8ef1675718a0b897521df48dc4b",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/design-source.json",
      "sha256": "8c7b703c718a366280f13b14cb2274797580a802889fa6669524830ea62407d9",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/design.log",
      "sha256": "c52df37edbf01fa6287d40c917f591bdc4ae5b794ff24e76e99b33c94ba4d6ee",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/lint-post-source.json",
      "sha256": "eb75eb8465bc7af3270114b2edc87a5facb33b97b4d4891192ecefc87ee89583",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/lint-record.json",
      "sha256": "cb0efbae809b4caae486f084e8f199d49eea85bc9df5380013ae5f765938978c",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/lint-source.json",
      "sha256": "c775fc258452be05c44eb8a600f84d0092f1f93780ca3bc8d16fa990f053c36c",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/lint.log",
      "sha256": "e0e620620b35f847500f5b1f96177bad2a810a039d47902fb8d4422d4f22ae83",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/report.json",
      "sha256": "8b0e74fc33e31b992d98f9398f5983b078c9456986cb3f6805070749f6a059db",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/types-post-source.json",
      "sha256": "0962b6b1f76d37ac978dca4501dba16a2b09f2eaf8f95e2b1bd0c949a9ae6617",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/types-record.json",
      "sha256": "ed2f6f6dd6b6fd533f1d7e539facb0282ba8c0382050e351892831f2609b4ab1",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/types-source.json",
      "sha256": "ce28eea04dba27189529750bad0a058cfbb23b35f89fa1e9eda2198e9dd71b13",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/types.log",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/unit-post-source.json",
      "sha256": "af1e529f387186e7a3cb7e1085be10e30220dad8b745698a16f4d0d5c869e4eb",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/unit-record.json",
      "sha256": "2dff800db8ecf9e8ee6013c0a09fe36d3c8f6834fccaff7852ef712b54c7d468",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/unit-source.json",
      "sha256": "287c1929130e86df1630f0c80df6dea009dc6228a6558c9edea01461b653bc75",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/unit.log",
      "sha256": "3d281fbee5ba279b5b636e829847eada32a0f93de18e90d9db278c0af23766ba",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/initial-source.json",
      "sha256": "1afb74ed11dcf5db5e517bebb48bd6c431df7661904da483c117deeed0aca3e6",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/runtime-preflight.json",
      "sha256": "7729315a43bd67a4a3dc9362c64ec51130a2d6a39684d80575c40c32127e568b",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/source.zip",
      "sha256": "9b20a243f245079b619500bc0563313ede57efc360a8b39cbb309f26bb6701e9",
      "disposition": "D-23 first full attempt retained: two hosting fixture failures, restricted Google Fonts build failure, browser precondition not run. No complete browser totals were fabricated."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/source.zip",
      "sha256": "e692f583f8a87ed1c15d14fdcc16c9bf3d51eaeb26ae3ae0551b305a30d01838",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/runtime-preflight.json",
      "sha256": "7729315a43bd67a4a3dc9362c64ec51130a2d6a39684d80575c40c32127e568b",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/initial-source.json",
      "sha256": "594a29f39d2a3b02848ff209640fce456e1888570bb74acd9e87ad27cc548ee8",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/browser-post-source.json",
      "sha256": "e3df410787f712d752212097a5a7ad6306ee97d223baee85fc47d6a3154d59e3",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/browser-record.json",
      "sha256": "6361add34e11e20694e41b262ea273e9e392e497d467e7f6304c0302f0f343c9",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/browser-source.json",
      "sha256": "575fdce72e6ddf2aee970c383b278b1014de2d449bace4a2264140772e41cf00",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/browser.log",
      "sha256": "9a24e178fd1b14d42b5857a618b60255caa12cf36bcd628529c845351a6e78a5",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/build-post-source.json",
      "sha256": "0906628f4f695d18c9aff43ce512e4508dd7344c864303b831cbf812d74afdf0",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/build-record.json",
      "sha256": "8118262d0efccc51103e789540ae4b433d741b31f210fd1a2222f0d3c250e7fe",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/build-source.json",
      "sha256": "a60e21de2cc00b00209a014da1c7ae167f197e28cae62d9d857f900acbbbb8ed",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/build.log",
      "sha256": "b1a7a793a9e5af59f94f0fead6b81db2b9508d68ef4a5558ebfce742d1db2eb0",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/design-post-source.json",
      "sha256": "b8f66df7ef9c4ce85986b5bd3df1b2817bbe90436a6e9cbbb04e26aa9fabe3e2",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/design-record.json",
      "sha256": "c52af91b4abcd5e36939cc1b2797f9a6e75fa042657f4aabfdabf1f6301ac45e",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/design-source.json",
      "sha256": "b0f145748b73b4362b1ecb89d6504ed6474938896b411daecdf42e8d21ab91bd",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/design.log",
      "sha256": "3f9c5eb270bb676124dc570bda8437329352131897379685d0fbeb03be0b41ee",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/lint-post-source.json",
      "sha256": "c886989453079d5a5cfd05aac1abd0341bc46b9d67d7378d9e8bdcc0c5ddbf8d",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/lint-record.json",
      "sha256": "383722b1c1007f66e13330273ef1dee7d6ad516237f9cb1343430ed3ad434b67",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/lint-source.json",
      "sha256": "9b887ee1baa6aa5d8b8989cf1d9a5dac6b580ab04606a23fda9e4b13f5b2ccf9",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/lint.log",
      "sha256": "e34ae80b43014d4e39c7de08ab2bc28cc0762d2f21633f65ae0f3dc103d64d9d",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/report.json",
      "sha256": "c7b22bfd7b290856310256fcbc13872e8c1deb0dcfff73577ded0248da1d6904",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/types-post-source.json",
      "sha256": "404ba2c9c9304028472902ae56b8ad03ef3dedf1890e580b4589d62a055495b4",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/types-record.json",
      "sha256": "954decafe671763705c5b2c8e82ea9681224dc44a48ea4fdce39fe13355dd4b6",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/types-source.json",
      "sha256": "7968cf601cecfecd452cae0f179860312385fd131f794ad9f9eb2b14152d2de4",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/types.log",
      "sha256": "0941b8d3de42539dd7e1b4375bd2728ff3f58e83d2ddaba91a28146b96960b00",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/unit-post-source.json",
      "sha256": "aab14b272eeb9116dd738162cdd3a21589185a8c25e13080a5921c142c680978",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/unit-record.json",
      "sha256": "6463120488a78b49fe76179c4e16ad6da4ca65a3b1e4925a181a6ac1cd91310f",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/unit-source.json",
      "sha256": "d384fbd5d63a97e06b31c2cf10b793e4325776716337a26f31de8ac2e35c8a47",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-2884b02a-b9047081-ad4c-4222-9dd4-783db0d1e0f0/gates/unit.log",
      "sha256": "ad98b6deafc1e396a2ca8b5f4f2eddcc62dafa6a09a6f7b74c80bfc9e34da8f1",
      "disposition": "First compatibility run failed design and fixture typing; corrected by subsequent source."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/source.zip",
      "sha256": "df15c336c10d218947c4802bd53926366831aef15bad16e409575d1a9cbb2854",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/runtime-preflight.json",
      "sha256": "7729315a43bd67a4a3dc9362c64ec51130a2d6a39684d80575c40c32127e568b",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/initial-source.json",
      "sha256": "6da97757f1a8f65a5f405b0c88d7c2f857c7193a9784ab70e83883088db7c0dc",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/browser-post-source.json",
      "sha256": "51731d43bdd73a237113f1ec3addea5c1dc502c9dd7b2551d0b58f58d81a997e",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/browser-record.json",
      "sha256": "571df81354dbdd4e6b92e7e005f354c8523584241af0367ccbf2e47dd1c3539b",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/browser-source.json",
      "sha256": "cbd4d9612336b4b99d44ce0df49c8ba747e36fa282493fc9d5672182761bb615",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/browser.log",
      "sha256": "833c913ba000f9a75d9338dbe786ab1f399c1c4020b92acfb11dfd68f758a21d",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/build-post-source.json",
      "sha256": "18d20f4c399734a18e123b7a54661ec0c87253cbc5000034a31fa0096825244b",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/build-record.json",
      "sha256": "cac5787a4493ae36f80e776081432aa4fdba95ceebefae883e4c29147a228e47",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/build-source.json",
      "sha256": "dccd517ec67c38a711e65a87bc4d3b6ffe6ccd758f65286c1d5022f057668931",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/build.log",
      "sha256": "d8ab67c043f078dea7298da8dd3b8980a439cccd058526d716789fa8a9a713b2",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/design-post-source.json",
      "sha256": "3bc68a1f98f374df63052dbd8684284e78fc6a07e03bed2ebceeae33023755aa",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/design-record.json",
      "sha256": "bc4864d60c2218df722029138e99c54d85d506dbfa32e758c2832c2001066dc0",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/design-source.json",
      "sha256": "02c3d3d859c0618535c2e77f20b01760efc162f06ffa109ec630c82f667926d9",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/design.log",
      "sha256": "84c858384be090efedbc5c6c3731075feb36f27be913265ba125d2c732bbe0f1",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/lint-post-source.json",
      "sha256": "2c45c1ade38d6e8a7ac3c7affede9192ca3e9429e3282abb7293f49757fbdea7",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/lint-record.json",
      "sha256": "bbf019e3e2415574bc98813fb2c9fc7aeed633f194a53f6d7799e1c0c0d047fb",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/lint-source.json",
      "sha256": "af5a4e251bb172be6a1f9565707df860ce57ba8dbc98055eb407d96a91d193f0",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/lint.log",
      "sha256": "1568789ac14c1e5883591da679e1c45fdea2077ed6a4314aabb8964366d9414f",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/report.json",
      "sha256": "b4664b1bc8253d8f85d5d77d66f8f8f9cac9c44db868abaf5ba9c3ea50a653ae",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/types-post-source.json",
      "sha256": "7c8041f0da76bfc76a76d936a5a07a4d2ad59d87a498b02ef2952a49011309d9",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/types-record.json",
      "sha256": "7c04b685b0529fe9099e43d61a7a821fc635c366466c868bb0263820dd0438d0",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/types-source.json",
      "sha256": "2f53e9fe4786a047de4feb7275e32e7d90bc39a64a19152cf6a1154c126c066b",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/types.log",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/unit-post-source.json",
      "sha256": "cf3add91fcbdab2a93342e111980dcb02510d767e7622a2444ba90aa3c51e382",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/unit-record.json",
      "sha256": "6b223091b9aea066501085c3e1c545f4abba9667cf1a12d811225509ada62a27",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/unit-source.json",
      "sha256": "635bee84ee9cab8f4ad98856f2299c16ebd1b17f8690214d2c25a07b10205a58",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c0f9a6c5-4651c22d-9a2c-4745-8e77-d98d18c31bff/gates/unit.log",
      "sha256": "83ffa388ff8fe5326efede295182549ab1baf73470b7b580cd5a556a3bb48a8b",
      "disposition": "Six local compatibility gates passed, but this source omitted newer deployed payout code and was ineligible for production."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/source.zip",
      "sha256": "91ce38fc13b5c1f8fddcf4666f90b42a6a5ba4fd06316e182ccf4692aab06272",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/runtime-preflight.json",
      "sha256": "7729315a43bd67a4a3dc9362c64ec51130a2d6a39684d80575c40c32127e568b",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/initial-source.json",
      "sha256": "71be2455328f9081345648cce2911e6dd6dce2cd64c3f7ce8ae51af57e73e9f6",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/browser-post-source.json",
      "sha256": "7fa70c9f3b21886e8ac1b7f953878e953b49c172579901d48028a745cad1a7fc",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/browser-record.json",
      "sha256": "fd096656f4fe88e077d03afff0b035c84f056a66ac541b300aeecb55d1d236f4",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/browser-source.json",
      "sha256": "73e2b5913dd49f2220f0abe77591461047f7e0b28f638e9e99cbd7849f7d1b1d",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/browser.log",
      "sha256": "7fec50369f30aa9b8b78802ce4362f94a6487d8d97c1a1ed3ad28c12fb34a4e9",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/build-post-source.json",
      "sha256": "d9113d6a7a8791ca364046653945385520a7d778be80f0cb040b6af0a0fc374a",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/build-record.json",
      "sha256": "53bc552b7450abeca4ccbebb8a523968bafcab4e8f891d0ed611ffbd129ff87e",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/build-source.json",
      "sha256": "8e7fc99d01e8a6a191feff7f0af4c37406fa631ef38633e9dd2c154593b9947b",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/build.log",
      "sha256": "d17c93fb7693e7b83853b46588a1fda93b75d353241f639ef2cb8978de4a6b0b",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/design-post-source.json",
      "sha256": "b28123375a7ad5093c04ea87305cd09699611fd733deab7ecf4187ffa5bd2e65",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/design-record.json",
      "sha256": "69f8c087ff2e9ae21c2650b5a65221032e1ca010e0a8ae0d49f15fa91fe5611f",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/design-source.json",
      "sha256": "a050900beb651cef9bba4209d045c705f80578710c5e55d63ed15c96925ea60a",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/design.log",
      "sha256": "2c5da8f23e0aa44e19b3a2c4ca9b54ff1972bdf73b24bf9d2e09e815536cfc86",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/lint-post-source.json",
      "sha256": "1dc8bb12f82e8abddd31a8c919e6e54d6d0c05ee510449a15237455d3419ee87",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/lint-record.json",
      "sha256": "bbd13cc6d6cbbb634650c6c6bff870bb5d9b340b0d82fe1ab7238c4451a8390b",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/lint-source.json",
      "sha256": "ce819b6cf146a4c3261baa1529b59833d1f9ea57970c96fdf236a91a60bdfa94",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/lint.log",
      "sha256": "6eb9cb1a5d1a7509a8cbda19a60c6a4d3b2114741de2cc195115ae4b633def44",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/report.json",
      "sha256": "4374fb5d32e80672ba39a1c778c57e93c9ea7d7d717e0d370af623c625303568",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/types-post-source.json",
      "sha256": "a680c784c7f504e5bf1e2be7dca2c8ca48fe84b48a862723b1b007249abbb834",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/types-record.json",
      "sha256": "421c99654b95d623f83bea65c77453d96867cd2ede0066e5d4388470e9068c70",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/types-source.json",
      "sha256": "200c919d5a94fbe0d55761c3d57aaed6bf6b68e30f6f19127ba0ed5094d4b93c",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/types.log",
      "sha256": "881bc433d648c5a18c84d4d188a9dda4c4e2602d318b9adebccb0466df1e4cb4",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/unit-post-source.json",
      "sha256": "2adcb70b8fa4408d5c6c1915517d95910b89be7b233a1748f1b8646b9f53d6a3",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/unit-record.json",
      "sha256": "b3b0863fe260798d3e6b0e0e6131dba9d63b85f21339291ee4d76db53c8753fa",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/unit-source.json",
      "sha256": "ecdd18b42183ca9a3b730fe343f84d77b669c2a81e2920146c7a904077c9b8ce",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-1581c1e2-b866e5e3-90b2-495f-8a55-fdcad86f4e5e/gates/unit.log",
      "sha256": "3451a3ee02425f56dd4a65b385f35b5fed26b14ea662b09bd3b555a8e457e5e9",
      "disposition": "Integrated source failed optional-day null clearing, fixture typing and build root isolation; subsequent source repairs these defects. Browser precondition refused, with no terminal browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/source.zip",
      "sha256": "f6002e1ce9cb10fd83d542a4c1f2554299b33629b10c3d25849cfef90f87e568",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/runtime-preflight.json",
      "sha256": "7729315a43bd67a4a3dc9362c64ec51130a2d6a39684d80575c40c32127e568b",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/initial-source.json",
      "sha256": "017a5a23dc09a3311cb87da7535a70fde78e7fb78be58aae9392e3eb10d680a1",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/browser-post-source.json",
      "sha256": "a742a286ee494c80f48b0a15b1de48cb85f18ab119a22229a9fbcd280238bfd7",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/browser-record.json",
      "sha256": "e5012c1cadb31bb197fabe838281824e09a2ebe9d12680a53663b9530f0c5555",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/browser-source.json",
      "sha256": "724926edcb840c8935d196295b86692214edcbb13771dce6318607c8bbf66c74",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/browser.log",
      "sha256": "b6fdb99f163921c7e9d019fe95398c860787aebf7a5d7aa049d9fe291ecc0c4d",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/build-post-source.json",
      "sha256": "efc6ee35b766fe48be9467561cca9f2c1628478c5699885b2b1c019c1f098cb3",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/build-record.json",
      "sha256": "9790fcecd41e0f17d03e639ea9bc06803995fe40b4a97663413621a208787dab",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/build-source.json",
      "sha256": "bc3ec123dabcced0f1291880eea6c6aa8ab0aa7e9d7c4835b0badbb25f1d756b",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/build.log",
      "sha256": "672d16af6d8ff39563889617cdacfc8b76c0068c8db28e2cbcfb004526b36bce",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/design-post-source.json",
      "sha256": "451a064e7a1a23cc9ee11a993b694f5a1f69f49cd96f3a645ee09b7a7c68dce3",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/design-record.json",
      "sha256": "731f41c1bd7ccc49d6d5fc71736eba5a4b5153255a507b2447515782a1530394",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/design-source.json",
      "sha256": "52bb6f8fc1f35e85a9d1aa3a115c77f6130a4c3927c7e8296eb42a58f547a5b9",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/design.log",
      "sha256": "d3c4f657ebf96fe059f78bd519a5ab4c7b478e9858a5545dd1e78aff4f23bfb7",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/lint-post-source.json",
      "sha256": "2378b8623bd6795a60dee83eae673dae4b7bf5652dd35f427a18fc8a51380d25",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/lint-record.json",
      "sha256": "f737b4bacf230165946fbb4c68fbe563c74fa007576413f878112f0298870166",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/lint-source.json",
      "sha256": "63121557e19850e82315182fcb97df45d1b090726c6c79a58d518750b2602fd5",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/lint.log",
      "sha256": "fcbce648ecbdae0d1fe3c9cedefb5c4c72659e915aa651cc478fc7c6b2ea5ce7",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/report.json",
      "sha256": "654c58dd434ca9a7b71a959c00d784ba45b15ad3d97cbd5704ba6c7cc1469c1e",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/types-post-source.json",
      "sha256": "f9903a6184cf8fe08fb3a80cdaed803af9c1f9068b296d35a87d2d30e6d7819f",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/types-record.json",
      "sha256": "d634490834ffde1329eb882a306daf35458c995718d90ee575001622b9c30444",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/types-source.json",
      "sha256": "5b1330631664d9792d7bd745a1e7eaf305260e271030f92e0f31576863695d58",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/types.log",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/unit-post-source.json",
      "sha256": "9d1964bc85c5b4a61ff70e937c912650ae2e6cb0cda02427111287f236b38b14",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/unit-record.json",
      "sha256": "a3dd75584f02ac7516333f7778f5c747ffd90106e9beb63f81de99585acbd775",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/unit-source.json",
      "sha256": "9c2550b30b54bbdc15508f4e8478b6db077b6558dc550b982776abd25ff5e1e2",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-eb0d39bb-d6134988-e55d-49a0-932d-3e4ac78525fd/gates/unit.log",
      "sha256": "5628bdfa3e7b391ad2fb1725f0b68ac66058356d093259b85759aa16a0d72fa0",
      "disposition": "Repaired unit/design/types/lint passed; native Turbopack exceeded Windows MAX_PATH under the long evidence path. Subsequent runner exports to a short physical path. Browser precondition refused; no browser totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/source.zip",
      "sha256": "1e30edc260ddb9e7593bb4b6f5e7a1f65675502e7fe151507038c0720d722022",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/runtime-preflight.json",
      "sha256": "7729315a43bd67a4a3dc9362c64ec51130a2d6a39684d80575c40c32127e568b",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/initial-source.json",
      "sha256": "8b7c92d99c2070ba2a3cb116b2a73d00cd7fcd93955d34aaeec4ebbc1d4f017f",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/browser-post-source.json",
      "sha256": "84a9134fa17e08a205c40d043e3f9bfd577d30cfe7fb5fbb15f1334f7319aa5c",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/browser-record.json",
      "sha256": "18d9020e069318b32b494b5471940b378b2ce41749f1a9dd398ec35450c3cbda",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/browser-source.json",
      "sha256": "33676240d8e601fe7e77ce17bcd513e29c6f5cf14c8138693df8266ea4aa8a00",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/browser.log",
      "sha256": "387a20d57921c173ab8b5bc4bf69dfba0a21e058297255bd3af527a9880f42ae",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/build-post-source.json",
      "sha256": "37c45f5386b53eb00f1291770a4746673091414978632a29775a57edfdeda4b0",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/build-record.json",
      "sha256": "1bba71fb8e8a39fd19f58328bb6c65e0a6cc3307044952e737aab5e2f515e116",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/build-source.json",
      "sha256": "46476a6b6e64e703d0f0395f898217601cc6e30f531607e5a23b6fb37431da87",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/build.log",
      "sha256": "d4e40c3d7b10604395fd02d6d11a7df09cf8fbddbee1754c0634dc68cbc9082d",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/design-post-source.json",
      "sha256": "91c47fce3e31e744238a665dbf728c1065c4c012f67423b61d78a720cc3b74ed",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/design-record.json",
      "sha256": "7c1054abd0090edef62373b8a63373cf3788f6eccd70d404db3e02e660a5f7c2",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/design-source.json",
      "sha256": "53ff87278346d6b24af40c9b55d3efeaf910bba84ea120f9560bdabb4338d94b",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/design.log",
      "sha256": "5d3f123816d682710ec411b8f1d6062eee8d953d56ee504b55117620f8277908",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/lint-post-source.json",
      "sha256": "b67dd1d5516572938dafef47db73c80b8fce163305f237d1e25fd12b0ffda0b6",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/lint-record.json",
      "sha256": "6c2c8c11f78c21d5e1b8380a7f131237301ff19e44dd4b9352afcee5484a93c6",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/lint-source.json",
      "sha256": "caf8ade65449d1b10de50693bc2a74e3cff91be211ac763fd34740d765eb66bd",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/lint.log",
      "sha256": "3771400486ec55776cc3f96d1e177ee02e5a038996a416e58d34b479f633d9df",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/report.json",
      "sha256": "058c5748a2a0d6baf1d8c0aeb0b225825b8ca8dea8d9ef0ce9f667fd0ece2d83",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/types-post-source.json",
      "sha256": "36b4dcfa62f4d99adcdf03871868461f401bfc8d24c4556032eb76ec86af36fc",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/types-record.json",
      "sha256": "7bf73fdc8d8dabc461109433d916644babdc5d162f927ffeab9547df5affa156",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/types-source.json",
      "sha256": "c555f80e71aa86aee83604c0c04fee5ae61dcce9583f3a7d81fe6fe59cdd6917",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/types.log",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/unit-post-source.json",
      "sha256": "19a444f8bf9dd21e68d70b93a3b8fa016fe3fbe370f7a71f9dffbe53844e8747",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/unit-record.json",
      "sha256": "98a34af6f7ee31dee4234146b24e074adda227fd0fcf8c454aa49b2ac39db8ab",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/unit-source.json",
      "sha256": "bae1972654cfc876ddcc35c494d10f4fd7ee95ccab707f459571109adfdfadab",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/gates/unit.log",
      "sha256": "fb0b89ce001160b167499d08fc0106217889a142a375776b9d3d52f6fb68f202",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d7a4a334-c1cb3da4-1089-4ab9-a481-b678acf02e73/source-export.json",
      "sha256": "4e8e45a8fad411b6a957b612f00ca92c9c68ebc5fceaf1015e2e9df9eebf70e1",
      "disposition": "Five full gates passed; complete browser run had58 passes and one tablet dialog gutter failure at768px. Corrected desktop width while preserving geometry/focus assertions. No cold/staging proof started on the failed full run."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c8573c7d-1021acc0-92f0-41f5-8ded-286c2ac54af6/dependencies.log",
      "sha256": "7eb70257593da06f682a3ddda54a9d260d4fc514f645237f5ca74b08f8da61a6",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c8573c7d-1021acc0-92f0-41f5-8ded-286c2ac54af6/expand.log",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c8573c7d-1021acc0-92f0-41f5-8ded-286c2ac54af6/export.index",
      "sha256": "683458f9ccdcadc16e8e8fc6ffc39f69714637eba1e6f24b9ced27cc0e419f64",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c8573c7d-1021acc0-92f0-41f5-8ded-286c2ac54af6/precondition-attempt.json",
      "sha256": "a1ce4c3cb6dd444dade412288f25162400fed00595cf5c4cea07fe8e88610d2f",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c8573c7d-1021acc0-92f0-41f5-8ded-286c2ac54af6/refused-source.json",
      "sha256": "aba5eb501b20b5c5356c1dc8f67c61b4c318626538deb496666b4fba5bfcc620",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c8573c7d-1021acc0-92f0-41f5-8ded-286c2ac54af6/runtime-preflight.json",
      "sha256": "7729315a43bd67a4a3dc9362c64ec51130a2d6a39684d80575c40c32127e568b",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c8573c7d-1021acc0-92f0-41f5-8ded-286c2ac54af6/source.zip",
      "sha256": "41067c8049f59f13949d690da7b1b341d2bf943c1e646e113597494007c130c2",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-c8573c7d-1021acc0-92f0-41f5-8ded-286c2ac54af6/typegen.log",
      "sha256": "adba4af9194e10e47dda75ff0fd0f8c2b756474896d0eba5612799c527ff372a",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-add27646-7ac5b460-cc7c-4bfe-9685-a4fccb0bea2b/dependencies.log",
      "sha256": "7eb70257593da06f682a3ddda54a9d260d4fc514f645237f5ca74b08f8da61a6",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-add27646-7ac5b460-cc7c-4bfe-9685-a4fccb0bea2b/expand.log",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-add27646-7ac5b460-cc7c-4bfe-9685-a4fccb0bea2b/export.index",
      "sha256": "7978ef4a2f5fa125c522a37ec50d4f5458c983d249ece2e9f35472ed52c8badb",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-add27646-7ac5b460-cc7c-4bfe-9685-a4fccb0bea2b/initial-source.json",
      "sha256": "101e6a62de78ae7b8865319d9bbacd860fdec6eccec287fc362f7e3881ceda0a",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-add27646-7ac5b460-cc7c-4bfe-9685-a4fccb0bea2b/interrupted-owned-lock.json",
      "sha256": "1f1439ae2e34554cbe57c8f8762c3e7ec2682c2d0f12e0800a792ef07c417389",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-add27646-7ac5b460-cc7c-4bfe-9685-a4fccb0bea2b/interruption.json",
      "sha256": "d99d05626f41bd67c8749998e0691373569b59091b08b0ed33ff73b022a1dd7a",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-add27646-7ac5b460-cc7c-4bfe-9685-a4fccb0bea2b/runtime-preflight.json",
      "sha256": "7729315a43bd67a4a3dc9362c64ec51130a2d6a39684d80575c40c32127e568b",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-add27646-7ac5b460-cc7c-4bfe-9685-a4fccb0bea2b/source.zip",
      "sha256": "be810ce7923a70d5dde0b8f525ceb688f881baf435450c7b413477589f350279",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-add27646-7ac5b460-cc7c-4bfe-9685-a4fccb0bea2b/typegen.log",
      "sha256": "adba4af9194e10e47dda75ff0fd0f8c2b756474896d0eba5612799c527ff372a",
      "disposition": "Refused Windows long-path precondition or explicitly interrupted obsolete source run; no complete gate totals/pass inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/full-add27646-7ac5b460-cc7c-4bfe-9685-a4fccb0bea2b/gates/unit-source.json",
      "sha256": "6c232f1b7b5f4f1b510c5b568270f0c0ca549797b02375db9fb313521f670f72",
      "disposition": "Interrupted attempt source/partial artifacts retained without terminal test-total fabrication."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/compatibility-56a0467e-16d7-4eb6-8590-ed9cf5bba76b/report.json",
      "sha256": "99e087bb2b841de6828ab389395bcf0972ae0e0b649e1e001f8d5ebf8a865af7",
      "disposition": "Failed supplementary staging probe retained: missing-Origin Contact request correctly returned403 before disabled503. Harness now retains that negative and adds the valid browser Origin; no application/source change or false stage acceptance."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/compatibility-56a0467e-16d7-4eb6-8590-ed9cf5bba76b/runtime-harness.mjs",
      "sha256": "d839eede1c207ef7eb6f6e1691b646d6823e9c545e3ef7e9d968a86e127f85a1",
      "disposition": "Failed supplementary staging probe retained: missing-Origin Contact request correctly returned403 before disabled503. Harness now retains that negative and adds the valid browser Origin; no application/source change or false stage acceptance."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/compatibility-56a0467e-16d7-4eb6-8590-ed9cf5bba76b/stage-a/build-post-source.json",
      "sha256": "20332467d7d59f85c12166c48a42de0c616ea80d815e8fb95625eeb1e6e53846",
      "disposition": "Failed supplementary staging probe retained: missing-Origin Contact request correctly returned403 before disabled503. Harness now retains that negative and adds the valid browser Origin; no application/source change or false stage acceptance."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/compatibility-56a0467e-16d7-4eb6-8590-ed9cf5bba76b/stage-a/build-record.json",
      "sha256": "01038d4e9862309c30a791ceb3e1a6d8336fda0df9ba7166e2b58c91d71dec86",
      "disposition": "Failed supplementary staging probe retained: missing-Origin Contact request correctly returned403 before disabled503. Harness now retains that negative and adds the valid browser Origin; no application/source change or false stage acceptance."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/compatibility-56a0467e-16d7-4eb6-8590-ed9cf5bba76b/stage-a/build-source.json",
      "sha256": "55cf517aed38deac83d05ade5771c83492d83d40433f42a9785a69cb6b7866f4",
      "disposition": "Failed supplementary staging probe retained: missing-Origin Contact request correctly returned403 before disabled503. Harness now retains that negative and adds the valid browser Origin; no application/source change or false stage acceptance."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/compatibility-56a0467e-16d7-4eb6-8590-ed9cf5bba76b/stage-a/build.log",
      "sha256": "9ff1b6ca9f21259521e0c80c142fb778bd4843758d66624390fc809ebcdcca24",
      "disposition": "Failed supplementary staging probe retained: missing-Origin Contact request correctly returned403 before disabled503. Harness now retains that negative and adds the valid browser Origin; no application/source change or false stage acceptance."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/compatibility-56a0467e-16d7-4eb6-8590-ed9cf5bba76b/stage-a/report.json",
      "sha256": "f99839d19bf63611c4d73b900fa9964e76fa03b78860674949ea0b00fde2ca3e",
      "disposition": "Failed supplementary staging probe retained: missing-Origin Contact request correctly returned403 before disabled503. Harness now retains that negative and adds the valid browser Origin; no application/source change or false stage acceptance."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/compatibility-56a0467e-16d7-4eb6-8590-ed9cf5bba76b/stage-a/runtime-post-source.json",
      "sha256": "18006b5f92730b1a6bd0350f87b01f51dcd50a75f470b6f62906b71e331b9157",
      "disposition": "Failed supplementary staging probe retained: missing-Origin Contact request correctly returned403 before disabled503. Harness now retains that negative and adds the valid browser Origin; no application/source change or false stage acceptance."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/compatibility-56a0467e-16d7-4eb6-8590-ed9cf5bba76b/stage-a/runtime-record.json",
      "sha256": "6d54e715b77db06f40bcc62aca6b2eb851542e7ead3641e61cbcaa3cc67cf500",
      "disposition": "Failed supplementary staging probe retained: missing-Origin Contact request correctly returned403 before disabled503. Harness now retains that negative and adds the valid browser Origin; no application/source change or false stage acceptance."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/compatibility-56a0467e-16d7-4eb6-8590-ed9cf5bba76b/stage-a/runtime-source.json",
      "sha256": "434e3024beb2b0121849a7a72b55e04b5a57384e0a0ebf7807a48a96fcf228d1",
      "disposition": "Failed supplementary staging probe retained: missing-Origin Contact request correctly returned403 before disabled503. Harness now retains that negative and adds the valid browser Origin; no application/source change or false stage acceptance."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/compatibility-56a0467e-16d7-4eb6-8590-ed9cf5bba76b/stage-a/runtime.log",
      "sha256": "14d4edd83bb3e002a05d27aef1044c4f5e3a84231bc50c30df8f9ed3fe800b80",
      "disposition": "Failed supplementary staging probe retained: missing-Origin Contact request correctly returned403 before disabled503. Harness now retains that negative and adds the valid browser Origin; no application/source change or false stage acceptance."
    },
    {
      "path": "playwright/.cache/phase27-08/full-d67fbecf-3f9395cd-4c75-4e1a-b1f7-d08b2e7f47f7/compatibility-56a0467e-16d7-4eb6-8590-ed9cf5bba76b/stage-a-server.log",
      "sha256": "44150d04cbf3cc70bf5ebc7aaa0a4204d2162f1add225b511942c61759ec3123",
      "disposition": "Failed supplementary staging probe retained: missing-Origin Contact request correctly returned403 before disabled503. Harness now retains that negative and adds the valid browser Origin; no application/source change or false stage acceptance."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/runtime-preflight.json",
      "sha256": "7729315a43bd67a4a3dc9362c64ec51130a2d6a39684d80575c40c32127e568b",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/initial-source.json",
      "sha256": "e2d5dc8cb9a650746cfe1625a1b333154ac52d353cd680a9e03e25234090490a",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/browser-post-source.json",
      "sha256": "b5c49ae72cd37ed6bdca96150e943d8546edae773c5cda25c038a6a9c13989fd",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/browser-record.json",
      "sha256": "b77f8db4fe4761db3b0dbc707670e078fdfc6772ba9dc5c8095b8e222873abbc",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/browser-source.json",
      "sha256": "88756fb0544301c17348efca7b6439c08c03a6c54bd1d2accd286dfe96990e3c",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/browser.log",
      "sha256": "cfa430965143b625ea1e51c65347452823e9e969a46a922f745de9d074646834",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/build-post-source.json",
      "sha256": "fece7ead25a2a9a93424fa5443bfff0dcd843ae250f109f151e5f3fe56072666",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/build-record.json",
      "sha256": "dcf6dc297d91f172ae32aa09dee5a7196d4aa6b2be9740907385ef312dceecc1",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/build-source.json",
      "sha256": "cd9af8200e9524d5e6d7b3b410f29772dd1b05def618f612aa45043c5eb66c5f",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/build.log",
      "sha256": "106fd417a7b68004a45b6718e842d8168a291b6acacac027a47eb42f217f4808",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/design-post-source.json",
      "sha256": "1b1ff18983a468fcf05dfde4a2842555835ce010b691ddbded856863383907c5",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/design-record.json",
      "sha256": "5835f2a4f0429c7d6b5670c707f4ffe8b8d366e633a157838dc5f3fdcbc48623",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/design-source.json",
      "sha256": "e8763f98bb9d5070370cb0b361d450c85052ed12ec6d2bb1f821b995b27581c1",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/design.log",
      "sha256": "332601b6ac1eeae697ccb254ee2f279e90e7142a1c288934a39dd853555b7973",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/lint-post-source.json",
      "sha256": "5d970131414bae56b33b625161d26684fa15ef544b84624dfb26b1cab9b0ee49",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/lint-record.json",
      "sha256": "2c84c279ef9c867a7a1554a877bd942eadf6e2740d5eaa635aeda1b74c333788",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/lint-source.json",
      "sha256": "24d4ebcae470bf8b6d233ba5daef90420efba6525b4f5f2abdd6507a5c4865a9",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/lint.log",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/report.json",
      "sha256": "ee938b2243ebb6c7dd5fa20be365474922042215c9e7519ac7a975a5cb2e0cf6",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/types-post-source.json",
      "sha256": "47ae60b7fa73f55eb890563de84c2637e45a4dd9865b1ce3ec4364864236ac50",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/types-record.json",
      "sha256": "090402632cf172430ab22a0876e49b455de8ac56477def6f3a6ff9ced55bf18c",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/types-source.json",
      "sha256": "97bf572eb039703d46fe4a44c36cb3f9be344cb1d3e2f6eeb7b06c969152a667",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/types.log",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/unit-post-source.json",
      "sha256": "8296d5a96422454d88568480fd65741bf9080202916fa80ad9ffcb3e812a2e00",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/unit-record.json",
      "sha256": "b1ee18815ba404602bf81b703dac2fb4e87577cbd67e661978a191edf5f4c6a2",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/unit-source.json",
      "sha256": "cae38873e349bfb1ddedfe5bfca6e07cbf02db746242ab3377da942a1da1766d",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-full-58897a94-20261011/gates/unit.log",
      "sha256": "a51fa92a5435f6108c3d3591c3c76334cfee5905fcf5a083de816182220097c2",
      "disposition": "First direct-worktree harness attempted exact58897a94: unit/design/types passed; owned lint explicitly interrupted after it traversed old ignored source-export copies. Turbopack then rejected the external dependency junction; browser correctly refused the failed build precondition. No complete browser totals or accepted source replacement inferred. Fresh physical source export corrects the harness without application/validator changes."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/runtime-preflight.json",
      "sha256": "7729315a43bd67a4a3dc9362c64ec51130a2d6a39684d80575c40c32127e568b",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/initial-source.json",
      "sha256": "d43789a7ae7ee5a6e0b87670a25e8879de252838d2cb8cc7dee9984a71f0cc87",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/source-export.json",
      "sha256": "1cf3359ae8aa0840e8300a72c36cf9bc055d9142e37dcd6ab1849e2f718a07d0",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/source.zip",
      "sha256": "c9288a5f19c3aed5afe25266adf65465694925df9d4923f1ff4089bb6e745e61",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/browser-post-source.json",
      "sha256": "01ca7e6d17893298a3c038b48aef78ea7d8a26790580881b6d6ab5c64051e9c4",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/browser-record.json",
      "sha256": "68d08028caca5fe5cf3dd215406e34718595d232950d7cd9027d68cae014691c",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/browser-source.json",
      "sha256": "b055370c51ea49517f3eec783ae8d426c3a6ed4ac6959a7a77f3a42107f739fe",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/browser.log",
      "sha256": "e43ff5f96653938f84f62dab0023ade751963eddc6bb0ef0a983e9c284579f0c",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/build-post-source.json",
      "sha256": "e77af14c1439581f556ea422388faccc09446756c656395656e8d8f23a05c631",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/build-record.json",
      "sha256": "2dc7d64c245d3d5821c06f0f17c3e5cb6cc692c28b3f9e3c2565ab315a396634",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/build-source.json",
      "sha256": "80e215bac01a5e6b0c1c7338ea3f930f262b8ff702803745c21022ad1c4f84ad",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/build.log",
      "sha256": "754ec484ce7da4f0f1db37315b2daffaea744cfea59f1222ac85cc27f60ac5d6",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/design-post-source.json",
      "sha256": "1343ed199381c7be1f87dee6470db353c6457bb2b3139ce23282b54503324ad5",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/design-record.json",
      "sha256": "de59479bc3bb34d9693d3473a5582844583e0c3d44ad36897d547bb47d3202c7",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/design-source.json",
      "sha256": "a35959883d6113a0df16e7b5c78c80cb0bc0a80e04829251ee55d139e76172d7",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/design.log",
      "sha256": "452c75162b2783942b366a6eb77ec5898cc8cfc581bf5f58e88e3aa91f7c6f04",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/lint-post-source.json",
      "sha256": "cd6222b09ddc7b851c755495fa52ccea1b7c1d0b88f6274c726b25a4638fb7a5",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/lint-record.json",
      "sha256": "b9e0a306f007d0670613e296f9b3ceff7fec71583b24ad091a80c33b753aa841",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/lint-source.json",
      "sha256": "f6a9190a3205028e49ac9eced95a4f32da797ebed83698a18693f61a9c7424a5",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/lint.log",
      "sha256": "99f93cbfe481bf5d5d4aa95e4f6e5464dd29cae7b633febb6e28c617b8b61fce",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/report.json",
      "sha256": "da6b8894e2a84c82f92966b4c3ff09d8077bf7d6d6db5f638d78b5f5a5d9b6d1",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/types-post-source.json",
      "sha256": "dc0fc671c21d8aaf8609b5d3208259319f1b4ae57d9627bd8f855d877ddad290",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/types-record.json",
      "sha256": "5c0fcc73003e0f1fe50297b621e0958660d8b2cdcf3a88c130f0e74bc5ffe990",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/types-source.json",
      "sha256": "97fb49d9243dde147af7b3799af75f12163ac362a0264c71575f966fe0ee291c",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/types.log",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/unit-post-source.json",
      "sha256": "20ad108e2df85ddfb5d3a9aa3f6b0a5d11d4c1edc51500c3c7fe6b794d41f21a",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/unit-record.json",
      "sha256": "1e97be8b1efb8f92cb53dbb953edd1745c8563c98d9eda7f6100f2edc9390764",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/unit-source.json",
      "sha256": "a71871d63ca8637a860c268ba34a848d93e5016f32500b4e1ce69c29f4ed9a21",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-export-full-58897a94-20261011/gates/unit.log",
      "sha256": "e4437705e9763ed67939f8a1f15d1fd7ca85fa6e895eca2c167b62bee8125455",
      "disposition": "Physical export attempt retained: one Contact instance race assertion failed with eight503 responses while another test intentionally held the same database advisory lock; other outcomes remain exactly recorded. File schemas do not isolate database advisory locks. Accepted subsequent run uses all273 original files and identical assertions with Contact files serial after the unchanged parallel group, without altered skip/timeout policy or production code."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/inheritance-attempt-unit-scheduling.config.mjs",
      "sha256": "deb35aa04a0537fc7d092abe40b3cfe8be41a5beddc9d19d80eb54dbbafa8d1b",
      "disposition": "Collection-only scheduling config inherited include arrays and duplicated file collection. Exact-census precondition refused before any gate/test execution; corrected config captures all273 original files exactly once. No test totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/inheritance-attempt-original-census.json",
      "sha256": "74f34de7a587dd0e5f0bac4d1ae18bdab32bf11198958ff96362e8f749d17e1c",
      "disposition": "Collection-only scheduling config inherited include arrays and duplicated file collection. Exact-census precondition refused before any gate/test execution; corrected config captures all273 original files exactly once. No test totals inferred."
    },
    {
      "path": "playwright/.cache/phase27-08/reconciled-serial-full-58897a94-20261011/inheritance-attempt-scheduled-census.json",
      "sha256": "d390f8749ffc35d4c8d02c941b692398ccfe4450f704ec21a9b5fa1e1f62b601",
      "disposition": "Collection-only scheduling config inherited include arrays and duplicated file collection. Exact-census precondition refused before any gate/test execution; corrected config captures all273 original files exactly once. No test totals inferred."
    }
  ],
  "observerVerification": {
    "schemaVersion": 1,
    "source": {
      "path": "playwright/.cache/phase27-08/per-ip-api-trace-prepared/observer-source.json",
      "sha256": "a18c42e6479d0ca38600b270c0a65c5ca9f89ee58b48178257e4b99ad14d03b5"
    },
    "gate": {
      "command": "node --test --test-reporter=spec tests/scripts/phase27-evidence.test.mjs tests/scripts/phase27-contact-binding.test.mjs",
      "status": "pass",
      "exitCode": 0,
      "startedAt": "2026-10-13T04:49:16.922Z",
      "finishedAt": "2026-10-13T04:49:18.059Z",
      "log": {
        "path": "playwright/.cache/phase27-08/per-ip-api-trace-prepared/observer-test.log",
        "sha256": "67089d1fa2e02a9201e8c4147dad7c4d9455787237f287f2825e771621ed6578"
      },
      "terminalSummary": "ℹ pass 220\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0",
      "resultData": {
        "runner": "node-test",
        "tests": {
          "passed": 220,
          "failed": 0,
          "skipped": 0
        }
      }
    }
  },
  "observerVerificationHistory": [
    {
      "schemaVersion": 1,
      "source": {
        "path": "playwright/.cache/phase27-08/contact-binding-repair-8691eb33-0f97-423a-a496-f2c37ecd5436/observer-source.json",
        "sha256": "9d358d459228f35dc0d1ed8434d124527b7304e593b19332eef7b9e691d0db23"
      },
      "gate": {
        "command": "node --test --test-reporter=spec tests/scripts/phase27-evidence.test.mjs tests/scripts/phase27-contact-binding.test.mjs",
        "status": "pass",
        "exitCode": 0,
        "startedAt": "2026-10-12T06:46:46.942Z",
        "finishedAt": "2026-10-12T06:46:47.881Z",
        "log": {
          "path": "playwright/.cache/phase27-08/contact-binding-repair-8691eb33-0f97-423a-a496-f2c37ecd5436/observer-test.log",
          "sha256": "65434454cc876d31c05cbf2e2d1ed72e119bd91f2adb3461eb0f03a98a62e0e7"
        },
        "terminalSummary": "ℹ pass 191\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0",
        "resultData": {
          "runner": "node-test",
          "tests": {
            "passed": 191,
            "failed": 0,
            "skipped": 0
          }
        }
      },
      "recordingRepair": {
        "at": "2026-10-12T06:48:01.371Z",
        "reason": "Windows file-URL import was required to parse typed totals; original raw log/source/times retained unchanged."
      }
    },
    {
      "schemaVersion": 1,
      "source": {
        "path": "playwright/.cache/phase27-08/contact-binding-chronology-fa17fef4-29c2-49b5-a773-ec02664c6ff0/observer-source.json",
        "sha256": "ee208e05eb376b2e3de4cd03f3c214f605d284f68263591343bcc99468ff8e74"
      },
      "gate": {
        "command": "node --test --test-reporter=spec tests/scripts/phase27-evidence.test.mjs tests/scripts/phase27-contact-binding.test.mjs",
        "status": "fail",
        "exitCode": 1,
        "startedAt": "2026-10-12T07:29:00.728Z",
        "finishedAt": "2026-10-12T07:29:01.750Z",
        "log": {
          "path": "playwright/.cache/phase27-08/contact-binding-chronology-fa17fef4-29c2-49b5-a773-ec02664c6ff0/observer-test.log",
          "sha256": "552d9ee13991b4e2cccb9dc9e94bdf2080397a90e3ba030314a2f6d446f29135"
        },
        "terminalSummary": "ℹ pass 203\nℹ fail 2\nℹ cancelled 0\nℹ skipped 0",
        "resultData": {
          "runner": "node-test",
          "tests": {
            "passed": 203,
            "failed": 2,
            "skipped": 0
          }
        }
      }
    }
  ]
}
```

## Isolation and provenance

All six full gate categories ran alone in the required order. Final types/lint/build/browser then verified the last UI-only readiness repair; earlier full unit/design remain dated and failed. The unit start/end above are transcript-reconstructed to seconds; its actual measured duration is retained. Other timestamps came from terminal wrappers. Full commands use installed CLIs, never package installation. DATABASE_URL and TEST_DATABASE_URL point explicitly to guarded localhost PostgreSQL fitout_test. No production DB, migration or provider transaction was used. NEXT_PUBLIC_APP_URL was explicitly blank for unit tests which vary BETTER_AUTH_URL, avoiding an inherited conflicting app origin. Browser webServer fixes exact app localhost:3000, marketing marketing.localhost:3000 and ops ops.localhost:3000, does not adopt an existing server, and disables Resend transport. PAYMONGO_SECRET_KEY, webhook keys, Didit keys and Inngest event/signing keys were empty; Contact false. Unit audit found public guest-email/notify writes in the isolated test database, not dev/production.

The original full unit/design/type/lint/build logs were unfortunately saved below test-results, and Playwright deleted that output directory. This is an evidence retention error. Counts and terminal exits above are actual transcript observations; their digests hash the saved result strings, never reconstructed raw logs. Browser logs now live under ignored playwright/.cache/phase27-08 and have actual file digests. They are not copied into tracked artifacts because dev mail fallback contains synthetic verification links. No secret values appear here.

## Initial full failures and dispositions (historical)

| Gate | Exact failure class | Disposition |
|---|---|---|
| Unit | login-reachable-after-reset:5 missing Host; ops-response-gateway:2 fixture wrong port; secret-config:2 explicit deployed preview origin/diagnostic drift | Phase-origin fixture contract repairs, focused 18 tests subsequently passed. No full rerun yet. |
| Unit | slot-picker-end-boundary:2 missing selected classes; checkout-create:3 fixture return expired; listing-schema:2 rate validation disagreement; ops-cancel:1 missing sweep fixture | Do not change money/bookability policy. Compare phase-base committed changes with preexisting dirty files; unresolved full results retained. |
| Design | brand-recipe count; elevation-z2 inventories; email-preview origin spelling; ops-host origin spelling; scaffold preview config | Phase-surface census/source contract drift requires meaningful explicit adopter/authority updates, never blanket count weakening. |
| Design | loading-coverage:3 (start-hosting missing loading, seven new page census, public fallback raw measurements) | Missing loading and explicit page classifications repaired; focused check now16 pass/1fail. Public fallback dirty raw h-3/w-28/w-40 measurements remain red. |
| Design | email-shell, listing-reuse-predicate-census, live-regions, one-tree, selector-contract, suspense-fallback-overlay | Remaining source/fixture disagreements require committed phase-base vs dirty source attribution; not asserted inherited merely because unchanged from Plan08 base. |
| Browser | Four Home canonical expectations incorrectly distinguished empty root and slash | WHATWG URL comparison retains exact origin/path/query; same semantic URLs accepted. No host/canonical authority weakening. |
| Browser | Relative legacy Location resolved to marketing; direct receiver expectations used401 where existing routes return400 | Keep real semantic app authority and browser-follow assertion. Local listener name omission was corrected, with failed127 trial retained. Receiver assertion now exact400/Invalid signature/no Location. |
| Browser | Native signup/password GET included synthetic form fields in query; Next dev transformAlgorithm stream error | Real security defect, not failed auth policy. Both forms now method POST and disabled until hydration; JS-disabled keyboard regression and real hydrated journeys required. Runtime stream error remains separately recorded. |
| Browser | Actual /host/listings/new returned404 once | Retry reached200 and actual wizard; no source listing policy repair. Added exact owner-scoped draft SQL readback. Initial intermittent dev404 retained until full clean result. |
| Browser | Screenshots optimizer returned invalid-image/null; initial page/axe checks did not catch decoded image | Added actual naturalWidth/complete RED. Installed Next optimizer does not forward headers; hostless internal fetch cannot satisfy exact Host policy. Existing committed images use per-call unoptimized to serve directly from marketing authority. No asset allowlist widening. |

## Retries and instrumentation

- Typecheck initial exit2 (8.827s): own missing axe diagnostic arguments; corrected, final exit0 recorded above.
- Build sandbox initial exit1 (29.078s): existing official Google Fonts fetch blocked. Exact escalated retry authorized.
- Build escalated retry exit1 (64.747s): existing PayMongo production import guard requires key even in build. Final build used an inert invented noncredential marker only; no valid provider credential or transport enabled. Existing signing secret was never printed. Test DB, mail off, payout mode HOLD.
- First browser runner16656: no descendants/server or tests; root verified then stopped owned runner after bounded wait. Actual exit-1/212.389s, inconclusive discovery instrumentation.
- Second runner2004: outputDir cleanup lock; root stopped only verified owned runner. Actual exit-1/150.137s, no tests. Discovery --list succeeded46 tests. Lost raw files explicitly disclosed.
- Diagnostic20:07:13–20:08:05Z:4 failed in51.665s. Real image decode false and resolved legacy marketing authority reproduced; password native GET persisted; new listing reached200 but my initial first-step heading was incorrect.
- Authorized127 listener trial20:09:51–20:12:09Z:5failed in138.711s. Installed Next normalizes loopback127 to localhost; adapter/runtime rewrite now mismatched listener, causing marketing404. Failed trial retained, reverted to documented explicit0.0.0.0 listener. Source edits during this trial made it noncanonical; clean next run required.
- Clean focused20:14:32–20:15:15Z:7passed/1failed in43.476s. Home OG/image decode/axe, full-query redirect and actual app browser-follow, receivers, two JS-disabled regressions, real signup resume and actual new owned draft passed. Remaining signed-cookie login ERR_ADDRESS_INVALID traced internal listener request.url. Product/session redirect fix now uses configured app origin; real password/stale-cookie verification pending.
- Auth repair focused unit:18passed/3files, exit0 in4.94s; schema audit clean.
- Loading focused design:16passed/1failed, exit1 in1.672s; only remaining public fallback raw measurement violation. Initial full gate failures stay recorded.

## Coverage boundaries

All six pages at320/375/768/1440, Court/axe/overflow/image decode, mobile menu/skip/FAQ keyboard, Home audience CTA journeys, real Link Flight/history/refresh, explicit RSC and prefetch headers, alternating HTML/RSC responses, namespace/private-marker/authority/method/full-query boundaries, robots text/sitemap, host-only app/ops sessions and stale cookies are actual local browser checks. Manual prefetch in next dev is a protocol probe: production automatic prefetch/cache behavior remains a deployed acceptance requirement.

Contact UI simulated responses and local default no-key503 are not inbox receipt. Production-disabled behavior is enforced by source/unit contracts; actual deployed false flag and disabled recovery still need readback. Current robots text and six sitemap URLs passed. All five non-Home rendered canonical/OG screenshots passed initially; Home metadata passed after semantic serialization correction.

## Pending

All51 final owned browser cases and final types/lint/build passed. Eight unit and nine design baseline assertions remain failed with concrete source/fixture dispositions below. No engineering acceptance, seven requirement completion, external approval or live inbox proof is claimed. The exact compatibility-first packet awaits human/account prerequisites, central review and a final approved SHA.

## Final suite baseline attribution

The comparison is against phase execution base `edec99b89bffa62df9ba47b4cf85c12f96acfa3f`, with phase 01–07 committed differences and existing dirty changes considered separately. These failures remain failures; the attribution does not waive the full gate.

| Final failure | Exact cause and provenance |
|---|---|
| Unit listing-schema (2) | Fixture expects both rates; existing dirty `src/lib/validation/listing.ts` accepts one. Phase 01–07 changed neither rate policy nor these assertions. Preserved unrelated validation work. |
| Unit checkout-create (3) | `reason: expired` prevents provider redirect and checkout-error assertions. The execution-base fixture already uses `2026-10-01` starts/ends, before the October 8 run. Existing unrelated checkout edits are preserved; no date, provider or money-policy assertion was changed. |
| Unit slot-picker-end-boundary (2) | Preexisting untracked fixture expects `bg-brand/15`; actual selected checkout boundary has `bg-muted`, `ring-brand` and `disabled:opacity-100`. Phase 01–07 did not change the slot-picker policy/source. |
| Unit ops-cancel (1) | Existing sweep fixture excludes `oc_b_sweep` before the cancellation, making its expected before/after witness fail. Execution-base-to-plan-base comparison has no changes in the test, cancellation action or payout implementation. No payout predicate was changed. |
| Design email-shell (1) | Pure renderer fixtures assert no `mailto:` without setting SUPPORT_EMAIL null. Execution-base `src/lib/site.ts` already has the same nonnull support value; `src/lib/email-shell.ts` and assertion are unchanged. The new Contact sender is not invoked by these pure fixtures. Current mailbox ownership still requires account proof. |
| Design listing-reuse census (1) | `controlled_checkout_grant` lacks an explicit child-table disposition. The table and listing relationship already exist in execution-base schema; no phase schema or census changes introduced them. |
| Design live-regions (1) | Derived five-host-surface closure is 21 at execution base and 22 in the working tree. The additional file is preexisting untracked `src/components/listing/host-location-map.tsx`, reached through the dirty host edit wizard import. Marketing Contact is outside all four owned trees and cannot contribute to this closure. No phase 01–07 wizard/host-map change exists. |
| Design public loading (1) | Raw `h-3`, `w-28`, `w-40` box measurements in `src/app/(public)/loading.tsx` exist at execution base. This is a committed baseline defect, correcting the earlier dirty-file attribution above. The new start-hosting loading boundary passes. |
| Design one-tree (2), selector-contract (2) | Execution-base `progressive-search-overlay.tsx` already contains the two viewport branches, second matchMedia call, and undeclared mobile-sheet/desktop-overlay IDs. The source and corresponding assertions have no phase 01–07 or current changes. No gate widening applied. |
| Design suspense-fallback-overlay (1) | Mutation expects `ProfileLink, SiteChrome` import, while execution-base host layout already imports only `SiteChrome`. The assertion fails its explicit APPLIED=false guard before measuring the mutated defect. Layout and test unchanged in this phase. |

Final full unit: exit 1, 254 passed / 4 failed / 2 skipped files, 3304 passed / 8 failed / 5 skipped tests, 318.751 seconds. Final full design: exit 1, 83 passed / 7 failed files, 1497 passed / 9 failed / 6 skipped tests, 73.295 seconds. All authorized auth, origin, metadata and marketing census repairs pass their final full suites. Acceptance remains failed.

## Hydration readiness and final source boundary

Actual native GET submissions initially put synthetic login/signup credentials and Contact inquiry values into URLs. Their forms now explicitly use POST and disable input/submit controls until the stable client hydration snapshot, preserving validation and retry semantics. Marketing Menu uses the same readiness guard. Tests wait for observable enabled controls or header readiness before invoking client-only events. Native anchor navigation before hydration is valid fallback and is not classified as broken hydration. Final real Contact pending/deduplication/error/recovery/default-no-key, Menu and Flight tests pass.

The 50-case browser run at 20:55:49.396–20:58:12.181Z exited 1 after 142.785 seconds: 49 passed, one explicit booker activation failed. Its log contained only GETs and no POST for that case; the client-only hosting button could accept a click before attaching its handler. The same narrow readiness safeguard was added to HostingIntent, without changing the capability action. Focused unit tests subsequently pass 10/10 and focused real activation proves POST 200, both capabilities and exactly one audit. Earlier full unit/design results above precede this last UI-only repair; they are not claimed to have run on that final source. Final types/lint/build/browser results will identify the final source checks.

The earlier wrappers set an unused CONTACT_INQUIRY_ENABLED variable. This is not the production disable switch. The actual switch is CONTACT_PRODUCTION_ENABLED, absent in the local env file and therefore default-disabled for production, and explicitly false in the final activation checks. Production-disabled behavior passes the real route unit contract; deployed false read-back remains pending.

## Final verification outcome

Final Chromium: **51 passed**, exit0,127.061s, normal teardown. Final UI source types/lint/build pass; focused activation unit10/10 and real activation2/2 pass. The standalone offline evidence script also passes focused ESLint after its raw-log digest/containment safeguard. Final raw gate logs are retained under the ignored path above and their actual file hashes are verified by the prepared validator. Previous50-case failed raw log remains separately at `final-browser.log`; the earlier49-case interim log was overwritten by that later50-case run, so its40pass/9fail result is transcript-derived only. Original initial lost logs remain explicitly marked in initialFullGates.

JavaScript-disabled hosting remains at the accessible loading boundary. Its regression inspects only the hidden resolved streamed SSR action markup for disabled state and verifies unchanged URL, no capability grant and no activation audit. It does not claim a usable or accessible no-JavaScript hosting journey. Hydrated real activation retains exact POST200, both capabilities and one audit.

All final provider transports/mail remain disabled; final checks use the actual CONTACT_PRODUCTION_ENABLED=false flag. Earlier mistaken unused flag is disclosed above. Contact default no-key503 and production-disabled503 unit cases pass, but actual deployed flag, global budget/control and inbox delivery remain unproved. Payment, payout and legal HOLD remain immutable.

## Review-fix verification (separate from historical gates)

CR-01 and WR-01/02/03 are implemented in commits `4a95c5a`, `ee6fa72`, `d8d77c2`,
`c22f3d6`, with persisted-snapshot refinement `821af3f` and parser/fixture refinement
`9859a5c`. The preceding six gates, 51-case browser result and source-boundary prose
are historical pre-review records. Their full unit eight failures and full design
nine failures remain failed; no broad repeat or waiver occurred.

All review-fix checks ran sequentially in the main shared checkout with worktrees
disabled. The 147 focused security/contact/staff tests in nine files passed in
11.8033133s. Coverage includes actual guarded local PostgreSQL advisory-lock races
in both orders for hosting/booking versus staff conversion, stale-session direct
staff denial, positive role eligibility, zero-row denial, dual-capability preservation,
rate/audit behavior and staff page rejection. No production staff identity was mutated.
Evidence fixtures passed 86/86 before the final Next parser refinement and 87/87
afterward (0.4238463s). The complete matrix fixture is synthetic structural evidence.

TypeScript exited0 with no diagnostics, 21:53:16.8572376–21:53:25.7517511Z,
8.8945135s, source03 captured at 21:53:12.232Z. Its empty stdout meant Tee-Object did
not create a raw file. The actual terminal metadata and bounded source03 reference
are retained separately; no contemporaneous file is invented. Full ESLint exited0
with zero errors and 34 existing warnings in 34.8898746s. Validator source refinements
after these checks passed syntax, focused lint and the final87 fixture run. The later
canonical production build also explicitly compiled and typechecked successfully.

The canonical production build exited0 in 71.3673586s, 22:04:19.0626811–22:05:30.4300397Z,
with 46/46 static routes and Proxy generated. Four earlier build attempts remain
typed failed supplements: unsupported inherited Node env-file flag; sandbox Google
Fonts fetch; stale ignored development route types; missing inert webhook marker in
the harness. Only confirmed ignored workspace-contained `.next/dev/types/routes.d.ts`
and `validator.ts` were removed for the stale-type case, followed by canonical Next
typegen. Official font access used the narrowly authorized retry. Final guard markers
were invented noncredentials; no provider transport or policy guard was changed.

Final owned Chromium exited0: **52 passed**, 22:08:56.9779268–22:13:00.3050046Z,
243.3270778s, with the explicit single worker command recorded above. The added case
simulates server acceptance with an unreadable response and proves uncertainty/value
retention only. Windows teardown stalled after all cases passed; root verified the
exact owned Next process tree and stopped only its four Next descendants. This was
assisted teardown. One Next dev streaming TypeError, digest2206780199, occurred between
successful cases 47 and48. Its ignored frames identify no route/action or source frame;
it remains unattributed in the raw log for independent review. Colour/image warnings
also remain. Passing tests do not assert an error-free runtime.

Each typed supplement references an ignored source snapshot beside its retained raw
log. The persisted validator loads and checks actual snapshot bytes, context, scoped
manifest digest and runner summaries. Source scope includes public assets and relevant
package/lock/Next/TypeScript/test/tool configuration, excluding actual env/credentials.
Snapshots include preexisting dirty source. Unit source01 predates evidence-only
refinements; final build05f and browser06 bind HEAD 9859a5c plus the captured dirty tree.
Browser-generated Next env changes are captured by the final fixture source07. Historical
six gates have explicitly unavailable captures. These are byte/structural consistency
records, not clean candidate/deployed SHA proof, external authenticity or attestation.

Contact/mail stay off with guarded local fitout_test and inert provider markers. No
live inbox, distributed-control, production cache, signed-provider or external account
proof was acquired. Independent re-review closes all four original findings; account prerequisites and final approved
deployment remain pending. Plans08/09, all seven requirements and release HOLDs remain
unchanged. No 08 SUMMARY was created.

## October 9 continuation: candidate replacement validation repair

The validator formerly required historical unavailable/dirty captures and failed
attempts to match a future deployed revision. Fresh acceptance could therefore
never succeed while retaining the honest history. The offline validator now
supports an explicit versioned releaseCandidateVerification with a digest binding
all original/review-fix records, a disposition, exact clean revision/manifest and
all six canonical full gates. Historical bytes/provenance remain validated; the
fresh run must occur later, pass all six gates and match the approved deployed
source. Existing strict behavior is preserved when no replacement exists.
This change does not waive tests, relabel history, authenticate evidence or
authorize deployment/Contact. No actual candidate run has been added to this file.

Actual terminal verification: `node --test tests/scripts/phase27-evidence.test.mjs`
exited0 with **104 passed, zero failed/skipped/cancelled**, runner duration350.5263ms.
Seventeen new tests exercise retained failures, tampered history/logs, supplemental
attempts, malformed/partial replacements, dirty source, canonical full commands,
failed/relabelled outcomes, chronological order and unchanged external/control gates.
These are synthetic offline records only. Prepared validation exits0 while
retaining actual failed engineering gates and pending authority; deployed validation
still exits1 for absent real evidence, failed gates and unresolved prerequisites.
No full application suite/build/browser rerun or clean-SHA proof is claimed here.
Focused ESLint for the validator and its Node-test file exited0 with no diagnostics;
scoped diff whitespace check exited0. The last small CLI status-message refinement
received a second focused lint pass. No product/runtime source was changed.

## User disposition: keep scope and defer baseline repairs

On October 9 the user chose to keep the scope as is, log findings as gaps and
repair after execution through proper planning. The scope-expansion question is
resolved; it must not be re-asked. deferred-items.md records the eight unit and
nine design failures with attribution, concrete later decisions and verification,
plus the separate unattributed runtime observation. Continue authorized preparation
without expanding repairs. Existing results remain failed; no assertions, source
policy, HOLD or deployed/live validation condition is weakened. This disposition
does not provide missing clean-revision, compatibility, control or external proof.


D-23 paired Preview deployment/browser evidence and its remaining protected API access approval checkpoint are recorded in 27-PREVIEW-ISOLATION-EVIDENCE.md and 27-20-PREVIEW-ACCESS-CHECKPOINT.md. These partial Preview results do not replace the production deployed matrix, approve cutover, or complete Plan 20.


Plan20 bounded Preview runtime checks pass; see 27-20-SUMMARY.md and the final 27-PREVIEW-ISOLATION-EVIDENCE.md section. Production acceptance is not inferred.


## Independent controlled-Contact observer repair

Owner requested the verifier-binding repair and continued Contact tests while keeping Contactdisabled. Four offline verifier/test files changed in the isolated release worktree. No deployed application/source, configuration or old release gate was relabeled. The coverage matrix remainsversion1 with35 unchanged scenarios; optional controlled bindings and independent observer provenance each useschemaVersion1. Only the two Contact control rows may use actual same-source no-mail deployment IDs. All other identity/host/source/engineering/inventory/threat/inbox/control checks remain. New observer source captured before191 actual integration/regression tests, allpass/zero failure/skip. Raw capture/log hashes and typed totals retained separately from archived588 application gates. Initial Windows import recording omitted typed totals; corrected from unchanged raw bytes and incomplete recording preserved.


Observer chronology repair 2026-10-12T07:32:41.130Z:206 actual checker tests pass,0fail/skip. A protected variant may precede bounded-window approval only with a separate, exact, owner-approved staging authority (same packet/source/manifest/baseline/Ops/project) recorded before its creation. Window authority still must precede live execution. Missing/late/historical staging authority fails closed. Initial chronology gate203pass/2fail is retained: a shared function-array fixture was contaminated by an earlier negative case; cloning the array fixes fixture isolation, with an explicit regression. Existing191 observer proof and all unchanged588 application gates retain their original bytes and timestamps. No live Contact acceptance or phase completion is claimed.


IP-only API trace observer adopted under direct owner approval. Fresh captured observer source passes all 220 tests; original application source and historical gates retain their bytes. Eight-minute profile requires a fresh matching attempt, six-minute watchdog and six actual route traces. No Contact matrix acceptance is inferred.
