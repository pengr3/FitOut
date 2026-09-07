---
phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
plan: 10
subsystem: testing
tags: [nextjs, proxy, auth, security-comments, vitest]

requires:
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 01
    provides: Next.js 16 src/proxy.ts convention and named proxy export
provides:
  - Four regression/design suites whose tracked-source commentary names src/proxy.ts and proxy
  - Five load-bearing auth and staff-guard explanations retargeted to the Proxy convention
affects: [20-02, 20-11, ops-host-routing, auth-regressions]

actuals:
  tokens: 3786
  tasks: 2
  commits: 2
commits: 2
plan_head_before: 99c27ffbf838095ed1ba03a29eebb5bec27675be

tech-stack:
  added: []
  patterns:
    - Framework source citations follow the tracked Next.js 16 Proxy convention
    - Proxy remains explicitly documented as optimistic routing, never staff authorization

key-files:
  created: []
  modified:
    - tests/auth/stale-session-selfheal.test.ts
    - tests/design/dark-scope.test.ts
    - tests/design/ops-guard-coverage.test.ts
    - tests/security/paymongo-seam.test.ts
    - src/lib/session-check.ts
    - src/lib/ops/staff.ts
    - src/app/auth/session-check/route.ts
    - src/app/(auth)/layout.tsx
    - src/app/(auth)/dev-throw-auth/page.tsx

key-decisions:
  - "Retargeted only comments and source citations; no runtime expression, JSX node, assertion, count, or authorization predicate changed."
  - "Ran design suites through vitest.design.config.ts because the default Vitest config intentionally discovers only the runtime/security pair."
  - "Deferred seven pre-existing TypeScript diagnostics in two out-of-scope design tests rather than changing unrelated files."

patterns-established:
  - "Proxy citation rule: refer to src/proxy.ts and the proxy export while retaining the explicit routing-not-authorization boundary."

requirements-completed: [OPS-07]

coverage:
  - id: D1
    description: "Four existing regression and design contracts follow the tracked Proxy source without changing their claims or counts."
    requirement: OPS-07
    verification:
      - kind: integration
        ref: "node node_modules/vitest/vitest.mjs run tests/auth/stale-session-selfheal.test.ts tests/security/paymongo-seam.test.ts"
        status: pass
      - kind: integration
        ref: "node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts tests/design/dark-scope.test.ts tests/design/ops-guard-coverage.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Five source files cite src/proxy.ts while preserving runtime and authorization bytes."
    requirement: OPS-07
    verification:
      - kind: other
        ref: "git diff -U0 99c27ff..HEAD scoped to the five source files; every changed line is comment text"
        status: pass
    human_judgment: false

duration: 15 min
completed: 2026-09-08
status: complete
---

# Phase 20 Plan 10: Proxy Source Reference Retarget Summary

**Four regression contracts and five security-sensitive explanations now point at `src/proxy.ts` and its named `proxy` export without changing executable behavior.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-07T21:08:00Z
- **Completed:** 2026-09-07T21:23:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Retargeted the stale-session, dark-scope, ops-guard, and PayMongo seam suites to the supported Next.js 16 Proxy source.
- Updated five load-bearing auth and staff-guard explanations while preserving the 30-day stale-session lockout analysis, forgeable `_sc` tradeoff, database/auth boundary, and positive `role === "staff"` rule.
- Re-ran all four suites in their correct Vitest partitions: 17 runtime/security tests and 23 design tests passed.

## Task Commits

Each task was committed atomically:

1. **Task 1: Retarget test contracts to the tracked Proxy source** - `d291344` (test)
2. **Task 2: Retarget source-of-truth comments without changing runtime bytes** - `858ef51` (docs)

## Files Created/Modified

- `tests/auth/stale-session-selfheal.test.ts` - Names `src/proxy.ts`, Proxy, and the named `proxy` export in the stale-cookie contract.
- `tests/design/dark-scope.test.ts` - Uses `src/proxy.ts` as the outside-tree scanner example.
- `tests/design/ops-guard-coverage.test.ts` - Keeps page/action staff guards as the security boundary while citing the tracked Proxy header.
- `tests/security/paymongo-seam.test.ts` - Retargets the non-Node runtime invocation explanation to `src/proxy.ts`.
- `src/lib/session-check.ts` - Retargets stale-session and edge-safety explanations to Proxy.
- `src/lib/ops/staff.ts` - Retargets both guard-layer citations without touching staff predicates.
- `src/app/auth/session-check/route.ts` - Names Proxy as the shared convention and legal cookie-mutation surface.
- `src/app/(auth)/layout.tsx` - Retargets the optimistic auth redirect and matcher explanation.
- `src/app/(auth)/dev-throw-auth/page.tsx` - Retargets the inherited auth-route explanation.

## Decisions Made

- Kept this slice purely mechanical: all changed source and test lines are comments, and assertion totals remain unchanged.
- Used the checked-in Vitest entrypoint because the local `npx` shim is known to target a missing installation.
- Split focused verification across the default and design configs so every named suite actually ran.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Ran design suites through the design Vitest config**

- **Found during:** Task 1 verification
- **Issue:** The plan's single default-config command discovered only the auth and security files; both design files were excluded by repository configuration.
- **Fix:** Ran the two design files separately with `vitest.design.config.ts` after the default-config pair.
- **Files modified:** None
- **Verification:** 17 runtime/security tests and 23 design tests passed, with non-zero discovery in both partitions.
- **Committed in:** No file change required

---

**Total deviations:** 1 auto-fixed blocking verification issue.  
**Impact on plan:** Verification became non-vacuous across all four requested suites; implementation scope did not change.

## Issues Encountered

- `node node_modules/typescript/bin/tsc --noEmit` reported seven pre-existing diagnostics in `tests/design/mail-credential-refusal.test.ts` and `tests/design/workflow-invariants.test.ts`. Those files last changed before Phase 20 (`082ea38`) and are outside this plan. The failure is recorded in `deferred-items.md`; the scoped `git diff -U0` proves every Plan 20-10 source change is comment-only.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 20-02 and later host-routing work can rely on accurate Proxy source citations in the targeted regression/security surfaces.
- The repository-wide TypeScript baseline remains red for the two unrelated design-test files recorded in `deferred-items.md`.

## Self-Check: PASSED

- All nine modified deliverable files and this summary exist.
- Task commits `d291344` and `858ef51` are present in Git history.
- Assertion counts remain 4, 9, 15, and 13 in the four suites, matching the pre-plan baseline.

---
*Phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa*
*Completed: 2026-09-08*
