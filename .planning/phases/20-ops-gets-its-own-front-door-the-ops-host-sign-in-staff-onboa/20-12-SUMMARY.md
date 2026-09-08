---
phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
plan: 12
subsystem: ops-authentication
tags: [nextjs, better-auth, server-functions, host-origin, password-reset, vitest, tdd]

requires:
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 03
    provides: exact public and ops origins with host-only Better Auth cookies
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 14
    provides: exact ops Host and Origin mutation guard
provides:
  - Dedicated FitOut Ops email/password sign-in, recovery, reset, and sign-out journey
  - Exact-origin ops-auth Server Functions with immediate nonstaff session cleanup
  - Ops-only relative callback normalization and enumeration-safe recovery results
affects: [20-08, 20-09, ops-host-e2e, future-ops-auth]

actuals:
  tokens: 11159
  tasks: 3
  commits: 7
commits: 7
plan_head_before: 5f13525455813c25a89e3b7c00b9d8c07e1e8cb0

tech-stack:
  added: []
  patterns:
    - Signed-out ops mutations prove exact Host and Origin before parsing or calling Better Auth
    - Better Auth sign-in response role gates staff access and the issued cookie is reconstructed for immediate nonstaff sign-out
    - Recovery and reset expose one bounded result across missing-account and invalid-token outcomes

key-files:
  created:
    - src/lib/ops/ops-callback.ts
    - src/app/actions/ops-auth.ts
    - src/app/(ops-auth)/_ops-auth/layout.tsx
    - src/app/(ops-auth)/_ops-auth/login/page.tsx
    - src/app/(ops-auth)/_ops-auth/forgot-password/page.tsx
    - src/app/(ops-auth)/_ops-auth/reset-password/page.tsx
    - tests/security/ops-callback.test.ts
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-12-TASK-1-RED-EVIDENCE.json
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-12-TASK-2-RED-EVIDENCE.json
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-12-TASK-3-RED-EVIDENCE.json
  modified:
    - tests/auth/ops-host-auth.test.ts
    - tests/design/ops-host-invariants.test.ts
    - tests/design/ops-guard-coverage.test.ts

key-decisions:
  - "Keep callback admission relative-only through safeCallbackPath, then narrow the result to /ops and /ops descendants."
  - "Use the database-backed role included in Better Auth's sign-in response, then reconstruct and revoke the exact newly issued session for nonstaff credentials."
  - "Treat ops-auth actions as signed-out exact-origin mutations in the security census; privileged console actions retain origin-first and staff-second ordering."

requirements-completed: [OPS-08]
duration: 14 min
completed: 2026-09-08
status: complete
---

# Phase 20 Plan 12: Dedicated Ops Authentication Journey Summary

**FitOut Ops now has an origin-bound, email/password-only authentication journey with safe callbacks, immediate nonstaff session cleanup, and enumeration-safe recovery and reset.**

## Performance

- **Duration:** 14 min
- **Completed:** 2026-09-08
- **Tasks:** 3
- **Files changed:** 13

## Accomplishments

- Added an ops-only callback normalizer that inherits the shared relative-only callback contract and admits only `/ops` or `/ops/...`.
- Added exact-authority sign-in, sign-out, recovery, and reset Server Functions; every path rejects a wrong Host or Origin before parsing input or touching Better Auth.
- Cleared the just-issued Better Auth session before returning the neutral no-access result for valid nonstaff credentials.
- Built a sibling, consumer-chrome-free FitOut Ops auth shell with email/password sign-in and no Google, signup, or marketplace controls.
- Added enumeration-safe staff recovery, one bounded invalid-reset result, and visible returns to the ops sign-in route.
- Expanded route and action censuses so the response-gateway cloak and privileged staff-action boundary remain pinned as the signed-out auth surface grows.

## Task Commits

1. **Task 1 RED — define origin-bound credential transition** - `01bde5c`
2. **Task 1 GREEN — implement safe callbacks and ops auth actions** - `8b31b70`
3. **Task 2 RED — define the sibling ops sign-in surface** - `30199c8`
4. **Task 2 GREEN — add dedicated FitOut Ops sign-in** - `7315301`
5. **Task 3 RED — define recovery, reset, and sign-out** - `ebd1c2e`
6. **Task 3 GREEN — complete the ops recovery journey** - `ffe7e89`
7. **Regression gate — extend ops security censuses** - `8c6c718`

## Verification

- `node node_modules/vitest/vitest.mjs run tests/auth/ops-host-auth.test.ts tests/security/ops-callback.test.ts --config vitest.config.ts` — **39/39 passed** with a clean database leak report.
- Expanded runtime envelope across ops auth, routing, role, cloak, response gateway, and callback suites — **95/95 passed**.
- Ops host, guard-order, one-tree, card-pattern, and auth composition design gates — **239/239 passed**.
- Scoped ESLint over every Plan 12 implementation and affected test file — **passed**.
- `tsc --noEmit` — the same nine pre-existing diagnostics remain in `ops-host-routing.test.ts`, `mail-credential-refusal.test.ts`, and `workflow-invariants.test.ts`; **no Plan 12 file reports a diagnostic**.
- Package manifests, lockfiles, database schema, and `drizzle/` — **unchanged** from `plan_head_before`.

## TDD Gate Compliance

- **Task 1 RED:** `01bde5c` captured the focused missing `safeOpsCallback` failure; `20-12-TASK-1-RED-EVIDENCE.json` passed `gsd-tools check tdd-red-evidence`.
- **Task 1 GREEN:** `8b31b70` made callback, exact-authority sign-in, role, and nonstaff-session-cleanup cases green.
- **Task 2 RED:** `30199c8` captured the missing sibling ops-auth shell; `20-12-TASK-2-RED-EVIDENCE.json` passed the evidence gate.
- **Task 2 GREEN:** `7315301` made the locked FitOut Ops identity, sign-in copy, controls, and refusal states green.
- **Task 3 RED:** `ebd1c2e` captured the missing staff recovery surface; `20-12-TASK-3-RED-EVIDENCE.json` passed the evidence gate.
- **Task 3 GREEN:** `ffe7e89` made recovery, reset, sign-out, and wrong-authority mutation cases green.
- **REFACTOR:** No production refactor was needed after GREEN. The broader regression pass required only security-census maintenance in `8c6c718`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test Bug] Preserved the shared relative-only callback contract**

- **Found during:** Task 1 GREEN
- **Issue:** The first test treated a same-origin absolute callback as admissible, while the shipped `safeCallbackPath` deliberately accepts relative paths only.
- **Fix:** Kept callback normalization relative-only and narrowed its output to `/ops` and `/ops/...`; absolute, cross-origin, encoded, malformed, and non-ops values fall back to `/ops`.
- **Files modified:** `tests/security/ops-callback.test.ts`, `tests/auth/ops-host-auth.test.ts`
- **Commit:** `8b31b70`

**2. [Rule 1 - Test Bug] Used the role already returned by Better Auth sign-in**

- **Found during:** Task 1 GREEN
- **Issue:** The initial test required a redundant session read even though installed Better Auth returns the database-backed user, including configured additional fields, from `signInEmail`.
- **Fix:** Gated on `signedIn.response.user.role`, retained `returnHeaders`, and reconstructed the issued cookie only when immediate nonstaff sign-out is required.
- **Files modified:** `src/app/actions/ops-auth.ts`, `tests/auth/ops-host-auth.test.ts`
- **Commit:** `8b31b70`

**3. [Rule 1 - Test Bug] Extended stale ops route and action censuses**

- **Found during:** Overall design verification
- **Issue:** Existing gates omitted the three new internal auth rewrite targets and assumed every `ops-*.ts` export was a privileged action that must require an already-authenticated staff session.
- **Fix:** Pinned the new internal pages, added the four signed-out auth actions to the census, required exact-origin-first ordering for them, and retained origin-first/staff-second ordering for privileged actions.
- **Files modified:** `tests/design/ops-host-invariants.test.ts`, `tests/design/ops-guard-coverage.test.ts`
- **Commit:** `8c6c718`

**4. [Rule 3 - Blocking] Used checked-in tool entrypoints**

- **Found during:** Tasks 1-3 verification
- **Issue:** The local package-runner shim is not a reliable entrypoint in this checkout.
- **Fix:** Invoked checked-in Vitest, ESLint, and TypeScript binaries through Node; no package was installed or changed.
- **Files modified:** None

## Known Stubs

None. Empty form defaults and input placeholder attributes are normal controlled-form state and labels; no Plan 12 value flows as placeholder production data.

## Threat Review

- `T-20-12-01`: every auth Server Function proves exact configured ops Host and Origin before parsing or provider work.
- `T-20-12-02`: valid nonstaff credentials cannot retain the newly issued session.
- `T-20-12-03`: callbacks remain relative-only and are narrowed to the ops route tree.
- `T-20-12-04`: credential, recovery, and reset outcomes expose bounded copy without account enumeration.
- `T-20-12-05`: host-only cookie configuration is unchanged and wrong-authority dispatch cannot reach auth mutation.
- `T-20-12-SC`: no runtime dependency, lockfile, or schema change was introduced.
- No security-relevant surface outside the plan threat model was introduced.

## Next Phase Readiness

- Plans 20-08 and 20-09 can exercise the visible sign-out, cross-host, and browser completion flows against the dedicated ops-auth pages.
- Response-gateway cloak behavior, one-tree composition, and privileged action authorization remain green.
- No Plan 12 blocker remains.

## Self-Check: PASSED

- All implementation, test, RED evidence, and summary files exist.
- Task commits `01bde5c`, `8b31b70`, `30199c8`, `7315301`, `ebd1c2e`, `ffe7e89`, and `8c6c718` exist in history.
- Focused runtime, expanded security-envelope, design, and lint verification is green; no Plan 12 TypeScript diagnostic exists.
- No package, lockfile, schema, migration, or generated runtime output exists in the realized diff.

---
*Phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa*
*Completed: 2026-09-08*
