---
phase: 27-app-subdomain-marketing-website
plan: "10"
status: complete
subsystem: listing
requires: ["27-07"]
provides: ["existing enum/vocabulary parity", "clean typecheck and build repair proof"]
requirements-completed: []
requirements-affected: ["DOMAIN-01", "MKT-02"]
key-files:
  created: ["tests/design/listing-vocabulary-parity.test.ts"]
  modified: ["src/lib/listing-vocab.ts"]
actuals: {tokens: 420, tasks: 2, commits: 1}
completed: 2026-10-09
---

# Plan 27-10 complete

Existing database enum bouldering_gym lacked a listing vocabulary member. Promote
only the matching Bouldering gym entry; no schema, migration, cast or typecheck
exception. The separate dirty bouldering activity-tag edit is preserved unstaged.
Production/test commit: b91eeb31d3d5cac1b2ebd3bcf67af1477874c466.

Task 1 adds a pure three-case regression: exact enum-key coverage with no duplicates
or extras, nonempty persisted labels, and the existing bouldering member. All three
fail on the earlier 1dcfa307 export augmented only with this new test (retained
gap10-baseline-red.log); all three pass on the exact clean repair export.
Task 2 verifies canonical tsc and Next build. Typecheck exits 0; production build
exits 0 and generates all 46 static pages after the existing font network is allowed.
The first sandbox build exits 1 on Google font fetching and remains retained.

Fresh export uses Git archive, physically copied installed dependencies and a private
export index. Canonical typegen runs before the initial capture. Every gate below
captures dirty=false at the repair SHA and the same source manifest
2f01bd885ecc0df301762d9c164b972b8b7b62a44507801317aa30702151ae9f.
The nested-export lockfile root warning and inert Google-provider warnings are
retained in the build log; no configuration or auth guard was relaxed.

## Retained proof

```json
[
  {
    "gate": "parity",
    "revision": "b91eeb31d3d5cac1b2ebd3bcf67af1477874c466",
    "dirty": false,
    "sourceManifestSha256": "2f01bd885ecc0df301762d9c164b972b8b7b62a44507801317aa30702151ae9f",
    "sourcePath": "C:\\Users\\Admin\\Roaming\\FitOut\\playwright\\.cache\\phase27-08\\release-source-parity-gap10-parity.json",
    "sourceSha256": "2c810e2d0d9f0b21ea7fee5b8f72f646cb124fb3303364594c900b5dedbfed7e",
    "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts tests/design/listing-vocabulary-parity.test.ts",
    "startedAt": "2026-10-09T08:36:58.8031151Z",
    "finishedAt": "2026-10-09T08:37:08.5673905Z",
    "durationSeconds": 9.764275399999999,
    "exitCode": 0,
    "logPath": "C:\\Users\\Admin\\Roaming\\FitOut\\playwright\\.cache\\phase27-08\\release-parity-gap10-parity.log",
    "logSha256": "5dc542c3f66e0bdbf941418d2db2b3283b84e61f89e2ae6f9f40821b0a6cd844"
  },
  {
    "gate": "types",
    "revision": "b91eeb31d3d5cac1b2ebd3bcf67af1477874c466",
    "dirty": false,
    "sourceManifestSha256": "2f01bd885ecc0df301762d9c164b972b8b7b62a44507801317aa30702151ae9f",
    "sourcePath": "C:\\Users\\Admin\\Roaming\\FitOut\\playwright\\.cache\\phase27-08\\release-source-types-gap10-types.json",
    "sourceSha256": "871fd8abb49e9b036538b7c6c2be9540ee80f01fed602e573eba46dd0d0d254e",
    "command": "node node_modules/typescript/bin/tsc --noEmit",
    "startedAt": "2026-10-09T08:37:42.7507604Z",
    "finishedAt": "2026-10-09T08:38:24.4451454Z",
    "durationSeconds": 41.694385,
    "exitCode": 0,
    "logPath": "C:\\Users\\Admin\\Roaming\\FitOut\\playwright\\.cache\\phase27-08\\release-types-gap10-types.log",
    "logSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  {
    "gate": "build",
    "revision": "b91eeb31d3d5cac1b2ebd3bcf67af1477874c466",
    "dirty": false,
    "sourceManifestSha256": "2f01bd885ecc0df301762d9c164b972b8b7b62a44507801317aa30702151ae9f",
    "sourcePath": "C:\\Users\\Admin\\Roaming\\FitOut\\playwright\\.cache\\phase27-08\\release-source-build-gap10-build.json",
    "sourceSha256": "7ffd246941651e003336a6d2ba3e651ae98d1399c22db0e8efe58b3ab8dd82c2",
    "command": "node node_modules/next/dist/bin/next build",
    "startedAt": "2026-10-09T08:38:42.0028569Z",
    "finishedAt": "2026-10-09T08:39:42.0630605Z",
    "durationSeconds": 60.060203599999994,
    "exitCode": 1,
    "logPath": "C:\\Users\\Admin\\Roaming\\FitOut\\playwright\\.cache\\phase27-08\\release-build-gap10-build.log",
    "logSha256": "f4f975d7cdc5bb7f8e19e5c6a9bf56f374968abac8035f5db1ee345ac96f821d"
  },
  {
    "gate": "build",
    "revision": "b91eeb31d3d5cac1b2ebd3bcf67af1477874c466",
    "dirty": false,
    "sourceManifestSha256": "2f01bd885ecc0df301762d9c164b972b8b7b62a44507801317aa30702151ae9f",
    "sourcePath": "C:\\Users\\Admin\\Roaming\\FitOut\\playwright\\.cache\\phase27-08\\release-source-build-gap10-build-network.json",
    "sourceSha256": "33484c4694f50dce1c68e3df83b31decb76716a4e5ac25ccadc9d25ee41c8b9c",
    "command": "node node_modules/next/dist/bin/next build",
    "startedAt": "2026-10-09T08:39:57.2546980Z",
    "finishedAt": "2026-10-09T08:41:23.2228278Z",
    "durationSeconds": 85.9681298,
    "exitCode": 0,
    "logPath": "C:\\Users\\Admin\\Roaming\\FitOut\\playwright\\.cache\\phase27-08\\release-build-gap10-build-network.log",
    "logSha256": "28efda318b265ce57fb370b8a336f5b82066bc34e60e610d422d753764e17962"
  }
]
```

G14 is repaired with clean-source types/build proof. These checks do not replace
the six full gates required by 27-17, close any other gap, complete a requirement,
approve external actions or release Contact/checkout/payout/legal HOLD.

Self-check: code commit and both changed files exist; three clean checks pass;
failed attempt retained; original 08-SUMMARY absent. Inline execution/review follows
the Codex adapter; no independent agent review is claimed.
