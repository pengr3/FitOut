# Phase 27 engineering evidence

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
    ]
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
