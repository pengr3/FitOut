# Phase 27 clean-source preparation

This is additional preparation evidence, not accepted release or deployed proof.
The committed revision `1dcfa30712376a2a7573ea93be867ef4bf44ccfe` was exported
with `git archive` into ignored `playwright/.cache/phase27-08/release-1dcfa307`.
The shared checkout and its unrelated changes were preserved. No worktree,
dependency installation, deployment, provider mutation or real email was involved.
Existing installed dependencies were copied into the export. An export-only Git
index and explicit GIT_DIR/GIT_WORK_TREE recorded clean source without changing
the shared index; its hash was checked before/after index initialization.

Every runner captures source before execution and retains its command, UTC times,
exit, log/source byte digests and manifest in the ignored evidence directory.
The initial manifest contains 996 scoped source/config files and SHA-256
`4962647d39b39e3d3868452863e3fda22b192a9645a6ec0443333830dee53138`.
Generated Next type configuration is included in captures. This binds the actual
local test inputs; it does not authenticate execution or establish external state.

Tests use the existing guarded local fitout_test database. Docker was started by
the user, then the existing fitout-db-1 container was started without replacing
its data. No development/production DB migration was performed. Real mail and
Contact remain disabled. Provider values are empty or inert local fixtures.

## Actual results

Full checks ran sequentially. Successful focused checks are supplementary and
do not replace failed full gates. Machine-readable records below bind every
retained attempt to its actual source snapshot and log bytes.

| Check | Recorded result |
|---|---|
| Full unit, corrected NODE_ENV | 3317 passed / 18 failed / 5 skipped; 252 passed / 6 failed / 2 skipped files; exit1 |
| Full design retry | 1498 passed / 8 failed / 6 skipped; 84 passed / 6 failed files; exit1 |
| TypeScript | Four diagnostics from bouldering_gym enum/vocabulary mismatch; exit2 |
| Full ESLint | Zero errors / 33 warnings; exit0 |
| Production build with font network access | Compiles, then fails on the same type mismatch; exit1 |
| Owned Chromium | 48 passed / 4 failed, exit1; normal server teardown |
| Focused marketing metadata | 6/6 passed with unchanged assertions and timeout |
| Focused installed hosting resume | 24/24 passed with inert Google initialization credentials; no provider exchange |
| Focused receiver/wizard retry | 2/2 passed in ordinary Next development mode with INNGEST_DEV=1; unchanged assertions/timeouts; no full browser pass |

Earlier attempts are retained: unreachable Docker preflight; NODE_ENV empty in
the local wrapper (71 failed / 3108 passed / 161 skipped); first design full run
(1497 passed / 9 failed / 6 skipped, including one metadata timeout); and sandbox
font download failure. NODE_ENV was corrected to test, never by weakening test
or product safeguards. The metadata timeout did not recur in the focused or later
full run. The corrected full unit run still lacked inert Google initialization
credentials; its one related failure is retained, and the subsequent 24-case
focused check passed with those fixtures. It is not a new full-unit pass.

The clean unit run also reports ten ops-probe import SyntaxErrors and one missing
committed Phase20 partition transcript. Direct Node syntax/import checks of the
exported probe succeed, so the import failures have no established product-defect
attribution. Three audit mocks omit the transaction interface now used by the
capability guard. Two checkout date-fixture failures and one cancellation witness
failure remain. See deferred-items.md for dispositions and planning boundaries.

Two full-browser failures cannot locate the existing app's Search spaces group.
Another receives500 from Inngest introspection because cloud mode has no signing
key; explicit local INNGEST_DEV=1 resolves that fixture precondition in the
focused retry. The approved-host wizard misses the existing five-second URL
assertion once, but passes unchanged in the focused retry. Keep its full-run
failure and reproducibility gap; no timeout or assertion was weakened.

The streaming TypeError controller[kState].transformAlgorithm recurs in this
clean run (digest1244386673) and both focused retries (digest3994520977), including
the normally passing wizard case. No source stack or causal route is established;
the repeated observation strengthens P27-G11's reproduction evidence.

The first two-case retry accidentally inherited NODE_ENV=test from the local
wrapper, and Next automatically changed the export's tsconfig. That attempt is
retained separately; its pre-run manifest is
b8f2480f82ebf5fbb2cb90bb439d0c24fd34e5e329ca81cb005de52287a84e55
because the ignored Next env type reference had already changed after dev boot.
The next preflight refused the dirty export. Its snapshot path was reused by the
later successful standard-dev retry; that rejected snapshot's raw bytes are not
claimed retained. The changed tsconfig was preserved at
playwright/.cache/phase27-08/release-tsconfig-test-mode.json, then restored only
inside the export from the exact archive. Canonical typegen restored the initial
generated reference. The normal-development retry binds the original clean
manifest and passes both cases; the shared checkout was untouched.

The bouldering_gym database enum is already present at the Plan08 base; its
listing vocabulary is inconsistent. No vocabulary/schema/policy repair is
performed under this unchanged execution scope. A failed production build makes
this tested revision ineligible for deployment; approval cannot turn it green.

An evidence-retention incident affected four older raw-log references: the new
wrapper reused their filenames. Current types/lint/build/browser logs were moved
to unique clean-1dcfa307 names. Historical types/lint were recovered from retained
copies whose bytes match their original hashes exactly. No identical original
build/browser copies were found. Their original raw path/digest, command, times,
exit/totals and previously committed bounded terminal summaries remain, with
raw availability explicitly false and transcript provenance. No raw log was
invented. The existing validator's terminal-transcript contract accepts that
honest loss; this does not improve historical source or deployment proof. All
14 new completed records pass independent byte/manifest/timing consistency.

Historical unit/design and review-fix bytes and source limitations remain. No valid
engineering.releaseCandidateVerification replacement is claimed. Plans08/09,
all requirements, external prerequisites and money/legal HOLD remain unchanged.

## Retained machine-readable records

All 14 completed records passed log/source byte-hash, manifest, pre-gate capture
and sequential timing checks. This checks consistency, not execution authenticity.
The rejected dirty preflight is disclosed above and has no completed gate record.

```json
{
  "schemaVersion": 1,
  "stage": "additional-preparation",
  "revision": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe",
  "acceptance": "failed full gates retained; not a releaseCandidateVerification replacement",
  "sourceBinding": "All six full gates capture the same clean revision and 996-file manifest; first focused browser retry has a separately disclosed generated-config manifest",
  "canonicalRecordPaths": [
    "playwright/.cache/phase27-08/release-unit-corrected-env-record.json",
    "playwright/.cache/phase27-08/release-design-corrected-env-record.json",
    "playwright/.cache/phase27-08/release-types-record.json",
    "playwright/.cache/phase27-08/release-lint-record.json",
    "playwright/.cache/phase27-08/release-build-font-network-record.json",
    "playwright/.cache/phase27-08/release-browser-record.json"
  ],
  "records": [
    {
      "gate": "unit",
      "revision": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe",
      "dirty": false,
      "sourceManifestSha256": "4962647d39b39e3d3868452863e3fda22b192a9645a6ec0443333830dee53138",
      "sourcePath": "playwright/.cache/phase27-08/release-source-unit.json",
      "sourceSha256": "9d228a590d3e34494bdf608d534235f41f662147ad402594e9d9ff4f91e783cf",
      "command": "node node_modules/vitest/vitest.mjs run",
      "startedAt": "2026-10-09T07:15:44.6484675Z",
      "finishedAt": "2026-10-09T07:15:50.3612952Z",
      "durationSeconds": 5.7128277,
      "exitCode": 1,
      "logPath": "playwright/.cache/phase27-08/release-unit.log",
      "logSha256": "6e092f004e2d55fc2a9789b7b811f1ac777a4072177563ba13537de2f96ab02c",
      "recordPath": "playwright/.cache/phase27-08/release-unit-record.json",
      "sourceFileCount": 996
    },
    {
      "gate": "design",
      "revision": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe",
      "dirty": false,
      "sourceManifestSha256": "4962647d39b39e3d3868452863e3fda22b192a9645a6ec0443333830dee53138",
      "sourcePath": "playwright/.cache/phase27-08/release-source-design.json",
      "sourceSha256": "76010ac5dd40377df1aaadb5a194cc5b75f2c07e4d9099be99465309e67deedf",
      "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts",
      "startedAt": "2026-10-09T07:16:44.3453983Z",
      "finishedAt": "2026-10-09T07:18:35.1682099Z",
      "durationSeconds": 110.8228116,
      "exitCode": 1,
      "logPath": "playwright/.cache/phase27-08/release-design.log",
      "logSha256": "63803cb04defe4fcc435a0754952144a4f560fe8fdda4eec819ea66f2fd598e7",
      "recordPath": "playwright/.cache/phase27-08/release-design-record.json",
      "sourceFileCount": 996
    },
    {
      "gate": "unit",
      "revision": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe",
      "dirty": false,
      "sourceManifestSha256": "4962647d39b39e3d3868452863e3fda22b192a9645a6ec0443333830dee53138",
      "sourcePath": "playwright/.cache/phase27-08/release-source-unit-after-docker.json",
      "sourceSha256": "e3fc99eae1d76cfbffc4d61057b0c6f2f2e13d16e19f099fe3eabd0b868a7630",
      "command": "node node_modules/vitest/vitest.mjs run",
      "startedAt": "2026-10-09T07:19:41.3829910Z",
      "finishedAt": "2026-10-09T07:25:08.5042303Z",
      "durationSeconds": 327.1212393,
      "exitCode": 1,
      "logPath": "playwright/.cache/phase27-08/release-unit-after-docker.log",
      "logSha256": "75f91f2d3572ca8d74b79fd108e5e26c83b343fcd9e316803bb43b0b7da4d3d5",
      "recordPath": "playwright/.cache/phase27-08/release-unit-after-docker-record.json",
      "sourceFileCount": 996
    },
    {
      "gate": "metadata",
      "revision": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe",
      "dirty": false,
      "sourceManifestSha256": "4962647d39b39e3d3868452863e3fda22b192a9645a6ec0443333830dee53138",
      "sourcePath": "playwright/.cache/phase27-08/release-source-metadata.json",
      "sourceSha256": "78191f1e203924482d1d6609ceffdd82de3e756232a0fae75334d9ce37977e26",
      "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts tests/design/marketing-metadata.test.ts",
      "startedAt": "2026-10-09T07:29:58.5693496Z",
      "finishedAt": "2026-10-09T07:30:00.3326775Z",
      "durationSeconds": 1.7633279,
      "exitCode": 0,
      "logPath": "playwright/.cache/phase27-08/release-metadata.log",
      "logSha256": "19c54e34607fa58e5a4b57cb7120facf8e5710efd6880308175992124394022c",
      "recordPath": "playwright/.cache/phase27-08/release-metadata-record.json",
      "sourceFileCount": 996
    },
    {
      "gate": "unit",
      "revision": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe",
      "dirty": false,
      "sourceManifestSha256": "4962647d39b39e3d3868452863e3fda22b192a9645a6ec0443333830dee53138",
      "sourcePath": "playwright/.cache/phase27-08/release-source-unit-corrected-env.json",
      "sourceSha256": "0458fe3764caf926883719a3799bb81035fa0364042ccb9040d905e10d091e97",
      "command": "node node_modules/vitest/vitest.mjs run",
      "startedAt": "2026-10-09T07:30:09.3499670Z",
      "finishedAt": "2026-10-09T07:35:55.0115246Z",
      "durationSeconds": 345.6615576,
      "exitCode": 1,
      "logPath": "playwright/.cache/phase27-08/release-unit-corrected-env.log",
      "logSha256": "42d2be1b4e015df7cc7fa6a7f6d51791fe1db235b2728035219f0ff31f156d62",
      "recordPath": "playwright/.cache/phase27-08/release-unit-corrected-env-record.json",
      "sourceFileCount": 996
    },
    {
      "gate": "auth",
      "revision": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe",
      "dirty": false,
      "sourceManifestSha256": "4962647d39b39e3d3868452863e3fda22b192a9645a6ec0443333830dee53138",
      "sourcePath": "playwright/.cache/phase27-08/release-source-auth.json",
      "sourceSha256": "ae775d568d8f792c3f40a297d1331e6d6d860aa06ef4e7b36566592144b0314a",
      "command": "node node_modules/vitest/vitest.mjs run tests/auth/hosting-resume.test.tsx",
      "startedAt": "2026-10-09T07:36:51.3106723Z",
      "finishedAt": "2026-10-09T07:37:02.8998489Z",
      "durationSeconds": 11.5891766,
      "exitCode": 0,
      "logPath": "playwright/.cache/phase27-08/release-auth.log",
      "logSha256": "93d4b5bf7210fd12476bfac99145e223e8100044320f8acf8f2bc01c65b57165",
      "recordPath": "playwright/.cache/phase27-08/release-auth-record.json",
      "sourceFileCount": 996
    },
    {
      "gate": "design",
      "revision": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe",
      "dirty": false,
      "sourceManifestSha256": "4962647d39b39e3d3868452863e3fda22b192a9645a6ec0443333830dee53138",
      "sourcePath": "playwright/.cache/phase27-08/release-source-design-corrected-env.json",
      "sourceSha256": "f6bce06df90b1a89eca08257be8e644f865f4f10d7e8e5c5cbc7d20802958736",
      "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts",
      "startedAt": "2026-10-09T07:37:17.6760855Z",
      "finishedAt": "2026-10-09T07:38:44.1029997Z",
      "durationSeconds": 86.4269142,
      "exitCode": 1,
      "logPath": "playwright/.cache/phase27-08/release-design-corrected-env.log",
      "logSha256": "8b99a677d68aecbd2ca09afd695f3540bea8cd5e6fd4fe27b68212e52ce28ab2",
      "recordPath": "playwright/.cache/phase27-08/release-design-corrected-env-record.json",
      "sourceFileCount": 996
    },
    {
      "gate": "types",
      "revision": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe",
      "dirty": false,
      "sourceManifestSha256": "4962647d39b39e3d3868452863e3fda22b192a9645a6ec0443333830dee53138",
      "sourcePath": "playwright/.cache/phase27-08/release-source-types.json",
      "sourceSha256": "a4ef53b65f85728ccd5c350ce7963181b9d47b7a13e0b7803f92c67857ec9c53",
      "command": "node node_modules/typescript/bin/tsc --noEmit",
      "startedAt": "2026-10-09T07:39:08.4432190Z",
      "finishedAt": "2026-10-09T07:39:40.4758782Z",
      "durationSeconds": 32.0326592,
      "exitCode": 2,
      "logPath": "playwright/.cache/phase27-08/clean-1dcfa307-types.log",
      "logSha256": "185ec95a00dc3b500cc53e561818a03ea1c077bf3e9a16f6e2a86837c6928955",
      "recordPath": "playwright/.cache/phase27-08/release-types-record.json",
      "sourceFileCount": 996
    },
    {
      "gate": "lint",
      "revision": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe",
      "dirty": false,
      "sourceManifestSha256": "4962647d39b39e3d3868452863e3fda22b192a9645a6ec0443333830dee53138",
      "sourcePath": "playwright/.cache/phase27-08/release-source-lint.json",
      "sourceSha256": "35be4d8e191a6f2822b8c317a9a7598f0d6ae0b8f2dfae18f324268aa7ee3b4f",
      "command": "node node_modules/eslint/bin/eslint.js .",
      "startedAt": "2026-10-09T07:40:03.4444944Z",
      "finishedAt": "2026-10-09T07:41:40.3438779Z",
      "durationSeconds": 96.8993835,
      "exitCode": 0,
      "logPath": "playwright/.cache/phase27-08/clean-1dcfa307-lint.log",
      "logSha256": "6ae7f15e93ca7568d5c761d5cd1479475ac88fba9738505b8aed1333771ef6d7",
      "recordPath": "playwright/.cache/phase27-08/release-lint-record.json",
      "sourceFileCount": 996
    },
    {
      "gate": "build",
      "revision": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe",
      "dirty": false,
      "sourceManifestSha256": "4962647d39b39e3d3868452863e3fda22b192a9645a6ec0443333830dee53138",
      "sourcePath": "playwright/.cache/phase27-08/release-source-build.json",
      "sourceSha256": "175e40ea3ae91695384ff72900f9ca538f2ba6f5d9ed76f7e09e861ac260b95f",
      "command": "node node_modules/next/dist/bin/next build",
      "startedAt": "2026-10-09T07:41:54.3354786Z",
      "finishedAt": "2026-10-09T07:42:36.6646715Z",
      "durationSeconds": 42.3291929,
      "exitCode": 1,
      "logPath": "playwright/.cache/phase27-08/clean-1dcfa307-build.log",
      "logSha256": "8b5ac0f4d5ba0109e6598bf374b7788841b314e1baafc3405165406395148f95",
      "recordPath": "playwright/.cache/phase27-08/release-build-record.json",
      "sourceFileCount": 996
    },
    {
      "gate": "build",
      "revision": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe",
      "dirty": false,
      "sourceManifestSha256": "4962647d39b39e3d3868452863e3fda22b192a9645a6ec0443333830dee53138",
      "sourcePath": "playwright/.cache/phase27-08/release-source-build-font-network.json",
      "sourceSha256": "c56c7586cb8c31288058722ac25d13b4ae2e7854d0b578a6d2cd63b4c2e6d65c",
      "command": "node node_modules/next/dist/bin/next build",
      "startedAt": "2026-10-09T07:43:09.8205438Z",
      "finishedAt": "2026-10-09T07:44:21.5328346Z",
      "durationSeconds": 71.7122908,
      "exitCode": 1,
      "logPath": "playwright/.cache/phase27-08/release-build-font-network.log",
      "logSha256": "23fb5fd3d4cad9b48e418a1d673e9114580937506afd96ecfe42180c9602b224",
      "recordPath": "playwright/.cache/phase27-08/release-build-font-network-record.json",
      "sourceFileCount": 996
    },
    {
      "gate": "browser",
      "revision": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe",
      "dirty": false,
      "sourceManifestSha256": "4962647d39b39e3d3868452863e3fda22b192a9645a6ec0443333830dee53138",
      "sourcePath": "playwright/.cache/phase27-08/release-source-browser.json",
      "sourceSha256": "5c40dc2a531d482152f62cf9f27a6475f91cf3e6aaa943b7c0558d1aff952bac",
      "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-tracer.spec.ts e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts e2e/marketing-contact.spec.ts --project=chromium --workers=1",
      "startedAt": "2026-10-09T07:44:56.5187888Z",
      "finishedAt": "2026-10-09T07:48:42.4974520Z",
      "durationSeconds": 225.9786632,
      "exitCode": 1,
      "logPath": "playwright/.cache/phase27-08/clean-1dcfa307-browser.log",
      "logSha256": "90d0aa9c9d90db13a2aa8b5661c5db3854cd97f7b0188fd2378a467c561a0db2",
      "recordPath": "playwright/.cache/phase27-08/release-browser-record.json",
      "sourceFileCount": 996
    },
    {
      "gate": "browser-followup",
      "revision": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe",
      "dirty": false,
      "sourceManifestSha256": "b8f2480f82ebf5fbb2cb90bb439d0c24fd34e5e329ca81cb005de52287a84e55",
      "sourcePath": "playwright/.cache/phase27-08/release-source-browser-followup.json",
      "sourceSha256": "2097187cb22cffa780e4a910e1d0a55071b0e52af85350f976898245f9ef7e89",
      "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts --project=chromium --workers=1 --grep Contact and machine receivers|marketing host handoff reaches",
      "startedAt": "2026-10-09T07:50:09.0932363Z",
      "finishedAt": "2026-10-09T07:50:41.3885628Z",
      "durationSeconds": 32.2953265,
      "exitCode": 0,
      "logPath": "playwright/.cache/phase27-08/release-browser-followup.log",
      "logSha256": "2217ea097190503a479a09755f57a5da55ef19b6ae97d5c343e695cdd4b874fa",
      "recordPath": "playwright/.cache/phase27-08/release-browser-followup-record.json",
      "sourceFileCount": 996
    },
    {
      "gate": "browser-followup",
      "revision": "1dcfa30712376a2a7573ea93be867ef4bf44ccfe",
      "dirty": false,
      "sourceManifestSha256": "4962647d39b39e3d3868452863e3fda22b192a9645a6ec0443333830dee53138",
      "sourcePath": "playwright/.cache/phase27-08/release-source-browser-followup-standard-dev.json",
      "sourceSha256": "bf731b16a66c0c74f1239dfab9a7db451bc93faf96d8329daa59da9d07b94e04",
      "command": "node node_modules/@playwright/test/cli.js test e2e/marketing-host-matrix.spec.ts e2e/marketing-journeys.spec.ts --project=chromium --workers=1 --grep Contact and machine receivers|marketing host handoff reaches",
      "startedAt": "2026-10-09T07:52:09.5268422Z",
      "finishedAt": "2026-10-09T07:52:36.3209574Z",
      "durationSeconds": 26.7941152,
      "exitCode": 0,
      "logPath": "playwright/.cache/phase27-08/release-browser-followup-standard-dev.log",
      "logSha256": "465a18bae53d4a579c44f770b7b8efaf6d8fe0e18721f92e58082cb6a9e0d241",
      "recordPath": "playwright/.cache/phase27-08/release-browser-followup-standard-dev-record.json",
      "sourceFileCount": 996
    }
  ]
}
```
