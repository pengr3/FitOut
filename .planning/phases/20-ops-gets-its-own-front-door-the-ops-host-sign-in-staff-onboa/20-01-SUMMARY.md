---
phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
plan: 01
subsystem: routing
tags: [nextjs, proxy, middleware, auth, vitest, tdd]

requires:
  - phase: 18.1-close-phase-18-verification-submission-didit-listing-gate
    provides: stale-session recovery through the authoritative session-check route
provides:
  - Next.js 16.2.7 src/proxy.ts convention with a named proxy export
  - Regression proof that login, signup, query preservation, and the _sc loop guard are unchanged
affects: [20-02, 20-10, ops-host-routing, auth-regressions]

actuals:
  tokens: 2998
  tasks: 1
  commits: 2
commits: 2
plan_head_before: 280d519560e61768b2fb1c16f46cd6e5a2642ad2

tech-stack:
  added: []
  patterns:
    - Next.js request interception uses src/proxy.ts and a named proxy export
    - Convention migrations retain direct behavior tests across the rename

key-files:
  created:
    - src/proxy.ts
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-01-RED-EVIDENCE.json
  modified:
    - tests/auth/login-reachable-after-reset.test.ts
    - src/middleware.ts (removed by tracked rename)

key-decisions:
  - "Changed only the Next.js convention filename, named export, and direct test references; host routing remains deferred to Plan 20-02."
  - "Used the checked-in Vitest entrypoint because the machine's npx shim targets a missing npm installation."

patterns-established:
  - "Proxy migration isolation: preserve matcher, branch order, imports, and security commentary while changing the convention seam only."

requirements-completed: [OPS-07]

coverage:
  - id: D1
    description: "Next.js loads the supported src/proxy.ts convention with a named proxy export and the original login/signup matcher."
    requirement: OPS-07
    verification:
      - kind: integration
        ref: "node node_modules/next/dist/bin/next build"
        status: pass
      - kind: unit
        ref: "tests/auth/login-reachable-after-reset.test.ts#uses src/proxy.ts as the sole request interception entry point"
        status: pass
    human_judgment: false
  - id: D2
    description: "Login, signup, query preservation, and _sc loop-guard behavior remain unchanged after the convention migration."
    requirement: OPS-07
    verification:
      - kind: integration
        ref: "node node_modules/vitest/vitest.mjs run tests/auth/login-reachable-after-reset.test.ts"
        status: pass
    human_judgment: false

duration: 14 min
completed: 2026-09-08
status: complete
---

# Phase 20 Plan 01: Next.js Proxy Convention Migration Summary

**Next.js 16 request interception now uses the tracked `src/proxy.ts` convention while all eight stale-session recovery regressions remain green.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-07T20:42:00Z
- **Completed:** 2026-09-07T20:55:47Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments

- Renamed the tracked `src/middleware.ts` entry point to `src/proxy.ts` and changed only its named handler export to `proxy`.
- Retargeted the direct regression suite and added an explicit assertion that the deprecated convention no longer exists.
- Proved all 8 focused tests pass and Next.js 16.2.7 completes a production build without the deprecated middleware-convention warning.

## Task Commits

The TDD tracer was committed atomically:

1. **RED — require the supported Proxy convention** - `9a18b38` (test)
2. **GREEN — migrate the entry point without behavior drift** - `b5ef41c` (feat)

## Files Created/Modified

- `src/proxy.ts` - The supported Next.js 16 request-interception entry with the preserved session-check flow and matcher.
- `src/middleware.ts` - Removed through a tracked Git rename.
- `tests/auth/login-reachable-after-reset.test.ts` - Imports and exercises `proxy`, including the sole-entry-point convention assertion.
- `.planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-01-RED-EVIDENCE.json` - Machine-verified intentional RED record.

## Decisions Made

- Kept the migration deliberately mechanical: no host parsing, rewrites, matcher widening, auth configuration, or database work landed early.
- Used `node node_modules/vitest/vitest.mjs` as the explicit test runner because the local `npx` shim points to a missing `npx-cli.js`; this preserves the exact checked-in Vitest version without installing or changing dependencies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used the project-local Vitest entrypoint after the machine's npx shim failed**

- **Found during:** Task 1 RED verification
- **Issue:** `npx vitest ...` failed before test discovery because the global shim points to a missing npm module.
- **Fix:** Invoked the same checked-in Vitest 4.1.8 binary with Node; no dependency or machine configuration was changed.
- **Files modified:** None
- **Verification:** The intentional RED executed 8 tests with the target assertion failing; GREEN and tracer reruns passed 8/8.
- **Committed in:** `9a18b38` and `b5ef41c`

---

**Total deviations:** 1 auto-fixed (1 blocking environment issue).  
**Impact on plan:** Verification used an equivalent local runner; shipped code and scope were unchanged.

## Issues Encountered

- The first sandboxed production build could not fetch Google Fonts. Re-running the same build with network permission compiled successfully, completed TypeScript and static generation, and reported `ƒ Proxy (Middleware)` with no convention deprecation warning.

## TDD Gate Compliance

- **RED:** `9a18b38` exists, touches the focused test, and its evidence record returns `RED_EVIDENCE_OK` for the named assertion.
- **GREEN:** `b5ef41c` follows RED and passes the focused suite.
- **REFACTOR:** Not needed; the implementation is the minimal mechanical rename required by the framework.

## Known Stubs

None. The empty-string and null checks in the focused test model cookie expiry and absent redirects; they are exercised behavior, not UI data stubs.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 20-02 can now add the configured Host routing matrix on the supported Proxy convention.
- Plan 20-10 can safely retarget the remaining repository-wide tests and comments after host behavior lands.

## Self-Check: PASSED

- All created and modified deliverable files exist in their expected final state.
- RED commit `9a18b38` and GREEN commit `b5ef41c` are present in Git history.
- Coverage metadata classifies both deliverables as fully automated and passing.

---
*Phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa*
*Completed: 2026-09-08*
