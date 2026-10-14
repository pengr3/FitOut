---
phase: 27-app-subdomain-marketing-website
plan: "11"
status: complete
subsystem: testing
requires: ["27-10"]
provides: ["audit transaction fixtures", "database-relative checkout timing", "positive cancellation sweep witness"]
requirements-completed: []
requirements-affected: ["DOMAIN-01", "DOMAIN-02"]
actuals: {tokens: 2611, tasks: 3, commits: 3}
key-files:
  modified: ["tests/security/audit.test.ts", "tests/security/audit-durable.test.ts", "tests/payments/checkout-create.test.ts", "tests/payments/ops-cancel.test.ts"]
completed: 2026-10-09
---

# Plan 27-11 complete

Audit mocks now exercise the real capability transaction, advisory-lock call,
authoritative role read and conditional RETURNING update, plus durable insert.
Caller regressions prove staff and zero-row updates are denied; the broken audit
sink still returns the genuine successful caller outcome. The real role-policy
suite includes PostgreSQL concurrency and stale-session cases. All 29 cases pass.
Commit 7579ed1d55eef67e79814882b2e949b1ab68be76.

Checkout windows now derive from a fresh isolated PostgreSQL now() anchor per case.
The original October 1 dates could fail before provider assertions. Add a genuine
past-session negative case without changing money, expiry or provider code.
Nine shared-tree cases pass with open-capacity-confirm: six checkout (including
the preserved, unstaged provider-failure test) and three occupancy/cutoff cases.
The committed checkout file has five cases; clean full acceptance remains in 27-17.
Commit b3d7ad37e8173e86a77e6f413b5b492140d50ef2.

The cancellation control used current DB-relative dates but queried an October 2
Friday cohort. Anchor only its booking window to that explicit cohort while keeping
the full review hold, deposited proof, verified host and positive before/negative
after assertions. All 20 cancellation cases pass.
Commit 8637eea97dbe5da6fa4b4927bbb51d36e0025f9b.

## Deviations and retained failures

Installed implementation shows PostgreSQL is the cutoff clock; freezing JavaScript
Date alone would not repair the fixture. Plan 11 was corrected before this task.
The first new negative test assumed an elapsed TTL alone refused an unswept pending
hold; actual code refreshes it. Its failure remains retained. The corrected negative
isolates the existing past-session guard with a future hold deadline. Production
behavior was not changed. No price, cancellation, payout or bookability edits.

All targeted checks use the guarded fitout_test database with isolated schemas;
teardown reports no escaped writes. Real providers/mail remain disabled. Shared
source captures are honestly dirty=true and do not certify a deployable candidate.
The preexisting provider-failure test and every unrelated dirty file remain preserved.
Scoped ESLint for all four edited test files passes.

## Retained proof

```json
[
  {
    "command": "node node_modules/vitest/vitest.mjs run tests/security/audit.test.ts tests/security/audit-durable.test.ts tests/auth/capability-role-policy.test.ts",
    "revision": "3d043cfb9cb9687a5d40cc8688325f6d61d1bfe9",
    "dirty": true,
    "sourceManifestSha256": "161fa09e5155048ec8db94fecfff67945fedda975b9f909bbd4c7df5f1462689",
    "startedAt": "2026-10-09T08:45:36.664Z",
    "finishedAt": "2026-10-09T08:45:41.567Z",
    "exitCode": 0,
    "logPath": "playwright/.cache/phase27-08/gap11-audit.log",
    "logSha256": "a5f3f890a8a4e83b618a094bc8f431844cdbd0737e6e2977faac4fce0250296f"
  },
  {
    "command": "node node_modules/vitest/vitest.mjs run tests/payments/checkout-create.test.ts",
    "revision": "3d043cfb9cb9687a5d40cc8688325f6d61d1bfe9",
    "dirty": true,
    "sourceManifestSha256": "161fa09e5155048ec8db94fecfff67945fedda975b9f909bbd4c7df5f1462689",
    "startedAt": "2026-10-09T08:45:57.695Z",
    "finishedAt": "2026-10-09T08:46:09.075Z",
    "exitCode": 1,
    "logPath": "playwright/.cache/phase27-08/gap11-checkout.log",
    "logSha256": "46fcc5233b4d013b15c4527813ee9638823d748220a781ffafb63913e7d586fa"
  },
  {
    "command": "node node_modules/vitest/vitest.mjs run tests/payments/checkout-create.test.ts tests/booking/open-capacity-confirm.test.ts",
    "revision": "7579ed1d55eef67e79814882b2e949b1ab68be76",
    "dirty": true,
    "sourceManifestSha256": "9ff90245bb35a86741ffb0e9a2a7a22b2233dac7a4c7fa7cb6688e334abff5b5",
    "startedAt": "2026-10-09T08:47:23.278Z",
    "finishedAt": "2026-10-09T08:47:28.774Z",
    "exitCode": 0,
    "logPath": "playwright/.cache/phase27-08/gap11-checkout-cutoff.log",
    "logSha256": "81b77ddc408e9ba246e9c87c55578aefc2efc8e4a72b226c8df6db0bd1e99b30"
  },
  {
    "command": "node node_modules/vitest/vitest.mjs run tests/payments/ops-cancel.test.ts",
    "revision": "7579ed1d55eef67e79814882b2e949b1ab68be76",
    "dirty": true,
    "sourceManifestSha256": "9ff90245bb35a86741ffb0e9a2a7a22b2233dac7a4c7fa7cb6688e334abff5b5",
    "startedAt": "2026-10-09T08:47:46.914Z",
    "finishedAt": "2026-10-09T08:48:04.564Z",
    "exitCode": 0,
    "logPath": "playwright/.cache/phase27-08/gap11-ops-cancel.log",
    "logSha256": "9afb9e1a5af6b3d7fc6a54e4ec05ab2b959b420e57ecd75c5653e96619702c71"
  }
]
```

G02/G04/G12 have targeted repair proof. All full clean-source gates remain required
in 27-17; original 08/09, all seven requirements, Contact and release HOLDs stay pending.
Self-check: all three code commits and four files exist; positive/negative checks
pass; failed attempt retained. Inline execution/review; no independent review claimed.
