---
phase: 27-app-subdomain-marketing-website
plan: "13"
status: complete
subsystem: design-verification
requires: ["27-12"]
provides: ["explicit email support fixtures", "grant-safe draft reuse", "live suspense mutation anchor", "semantic public loading boxes"]
requirements-completed: []
requirements-affected: ["DOMAIN-01", "MKT-02"]
actuals: {tokens: 1751, tasks: 3, commits: 3}
key-files:
  modified: ["tests/design/email-shell.test.ts", "src/app/actions/listing.ts", "tests/listing/crud.test.ts", "tests/design/suspense-fallback-overlay.test.ts", "src/app/(public)/loading.tsx"]
completed: 2026-10-09
---

# Plan 27-13 complete

Pure email fixtures explicitly model SUPPORT_EMAIL=null, with a configured-address
positive case for both HTML and text. The real support constant and transport are
untouched. The suspense mutation now anchors to the actual SiteChrome import;
APPLIED=false remains fatal, and the injected double-live-nav still fails the scanner.
Public loading uses existing semantic box/bar measurements and contextual flex
widths; its single named status region, hidden decorations and navigation remain.
All four targeted design files pass: 64 tests. Scoped lint passes for edited files.

## Observed predicate repair

The strict child census exposed an actual omission. scripts/ops-controlled-checkout.ts
can insert a grant for an empty draft without changing listing.updatedAt; its usage
text about published eligibility is enforced later at checkout, not by that insert.
An exemption claiming grants cannot exist on drafts would be false. Add only the
NOT EXISTS controlled_checkout_grant reuse conjunct and a real isolated-DB regression.
The regression fails on the previous action, then all 25 shared-tree CRUD cases pass
with the guard; it proves timestamps still equal, a new id is minted and the original
grant association is preserved. The existing child census stays strict and unchanged.

Plan13 task1 ownership was amended from a fixture-only disposition to the actual
existing action and CRUD test. This is the bounded repair of recorded G06, with no
new dependency, schema or checkout/payout behavior. No grant CLI was invoked.
Selective index patches preserve both unrelated day-pricing edits and the preexisting
bouldering/day-rate CRUD test. That test accounts for one of the 25 shared cases;
the committed CRUD suite has 24 cases. Clean full acceptance is still in 27-17.

Code commits: 615b2ca9deae78b7f29e143498d567594e7c3988,
fe534d7e8b67ce6736c56f43c47e6b7600d5aab5,
ca5baf6f4daa9efd809388f62663222b19bdcf45.

## Retained proof

```json
[
  {
    "command": "node node_modules/vitest/vitest.mjs run tests/listing/crud.test.ts",
    "revision": "880662556952fe0f679a6ed70097f213116bb773",
    "dirty": true,
    "startedAt": "2026-10-09T09:15:50.891Z",
    "finishedAt": "2026-10-09T09:16:01.689Z",
    "exitCode": 1,
    "logPath": "playwright/.cache/phase27-08/gap13-grant-red.log",
    "logSha256": "b8532da6aeb96cfd01492111ddb0f315b63735fb1e8e2770b47e9fff169aad03"
  },
  {
    "command": "node node_modules/vitest/vitest.mjs run tests/listing/crud.test.ts",
    "revision": "880662556952fe0f679a6ed70097f213116bb773",
    "dirty": true,
    "startedAt": "2026-10-09T09:16:38.052Z",
    "finishedAt": "2026-10-09T09:16:48.577Z",
    "exitCode": 0,
    "logPath": "playwright/.cache/phase27-08/gap13-grant-green.log",
    "logSha256": "ff78c61fe87bbaa4e9a34a6c28222b339f7a44eadbe2044c4773dd9408cee1ff"
  },
  {
    "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts tests/design/email-shell.test.ts tests/design/listing-reuse-predicate-census.test.ts tests/design/suspense-fallback-overlay.test.ts tests/design/loading-coverage.test.ts",
    "revision": "880662556952fe0f679a6ed70097f213116bb773",
    "dirty": true,
    "startedAt": "2026-10-09T09:16:04.357Z",
    "finishedAt": "2026-10-09T09:16:10.802Z",
    "exitCode": 1,
    "logPath": "playwright/.cache/phase27-08/gap13-design.log",
    "logSha256": "fb8ffcbb3ae321e144e19e87f36bbb60f16ee53d6a8d67cd425d6b9b61c5305f"
  },
  {
    "command": "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts tests/design/email-shell.test.ts tests/design/listing-reuse-predicate-census.test.ts tests/design/suspense-fallback-overlay.test.ts tests/design/loading-coverage.test.ts",
    "revision": "880662556952fe0f679a6ed70097f213116bb773",
    "dirty": true,
    "startedAt": "2026-10-09T09:17:32.679Z",
    "finishedAt": "2026-10-09T09:17:38.412Z",
    "exitCode": 0,
    "logPath": "playwright/.cache/phase27-08/gap13-design-green.log",
    "logSha256": "d9d08dc424ca2f535ee7095133a573a343178cb2981d8160891ee06d4a08abb0"
  }
]
```

G05/G06/G08/G10 have targeted repair proof. Shared source is honestly dirty; failed
red/control attempts remain retained. All six full clean-source gates, remaining
search/runtime gaps, original 08/09, requirements and Contact/release HOLDs remain
pending. Self-check: all three code commits and five files exist, real positive and
negative tests pass, unrelated user work remains unstaged. Inline review/execution.
