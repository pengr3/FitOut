---
phase: 22-ops-decides-with-the-whole-picture-queue-removal-enforcement
reviewed: 2026-09-10T10:28:37Z
depth: deep
files_reviewed: 8
files_reviewed_list:
  - e2e/ops-queue.spec.ts
  - src/app/(ops)/ops/page.tsx
  - src/components/ops/ops-queue-row.tsx
  - src/lib/ops/cancel-impact.ts
  - src/lib/ops/review-queue.ts
  - tests/design/ops-host-invariants.test.ts
  - tests/ops/ops-queue-row.test.tsx
  - tests/ops/queue-query.test.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
resolved_findings: [CR-01, WR-01]
status: clean
---

# Phase 22: Code Review Report

**Reviewed:** 2026-09-10T10:28:37Z
**Depth:** deep
**Files Reviewed:** 8
**Status:** clean

## Summary

Reviewed Phase 22 commits `662b7be..de6c295`, including the queue DTO, grouped cancellation-impact reader, server-to-client mapping, terminal disclosure, and authenticated browser matrix. The batched query preserves the single-listing aggregate contract and the disclosure remains a local client-state composition beside the existing staff-authorized actions. The initial local-database guard finding was corrected and independently rerun; no open findings remain.

## Resolved Findings

- **CR-01:** Removed the unverified `db` hostname from the seed allow-list in `de6c295`; literal loopback hosts are the only accepted targets.
- **WR-01:** Normalized bracketed IPv6 hostnames before matching, so `[::1]` is accepted as the valid loopback address `::1`.
- **Verification:** The focused authenticated Court/Grove × 320px/1280px Chromium matrix passed after the correction.

## Historical Critical Issue — Resolved

### CR-01: The local-only E2E guard accepts an unverified `db` host

**File:** `e2e/ops-queue.spec.ts:21-26`
**Issue:** The spec treats the hostname `db` as local without verifying where it resolves. `db` is only a Docker naming convention, not a loopback address; a CI, staging, or production deployment may legitimately expose its database under that name. This test then directly inserts staff accounts, a published pending listing, photos, amenities, and review records. A mistakenly configured `DATABASE_URL` can therefore contaminate a non-local database even though the test claims it must never do so.

**Fix:** Require an explicit test-only opt-in and permit only literal loopback hosts after normalizing IPv6 brackets. For example:

```ts
function assertLocalDatabase(): void {
  if (process.env.FITOUT_ALLOW_LOCAL_E2E_SEED !== "1") {
    throw new Error("Refusing to seed without FITOUT_ALLOW_LOCAL_E2E_SEED=1");
  }

  const hostname = new URL(DATABASE_URL).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  expect(["localhost", "127.0.0.1", "::1"]).toContain(hostname);
}
```

If Docker service discovery is required, resolve `db` with `node:dns/promises` and accept it only when every address is loopback; do not whitelist the label itself.

## Historical Warning — Resolved

### WR-01: IPv6 loopback is rejected despite being an allowed local target

**File:** `e2e/ops-queue.spec.ts:22-26`
**Issue:** Node serializes an IPv6 URL hostname as `[::1]`, while the allow-list contains `::1`. Thus a local URL such as `postgresql://fitout:fitout@[::1]:5432/fitout` fails before the browser test runs. This prevents the required tracer from running on a valid local IPv6-only setup.

**Fix:** Normalize brackets before the comparison (as shown in CR-01) and add a narrow unit test or helper-level assertion covering `new URL("postgresql://x:x@[::1]:5432/x").hostname`.

---

_Reviewed: 2026-09-10T10:28:37Z_
_Reviewer: Codex (gsd-code-reviewer)_
_Depth: deep_
