---
phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
plan: 14
subsystem: ops-mutation-security
tags: [nextjs, server-functions, host-origin, staff-auth, playwright, vitest, tdd]

requires:
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 03
    provides: exact configured public and ops authorities plus current-database staff sessions
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 11
    provides: authenticated ops response gateway for the real rendered action form
provides:
  - Exact configured ops Host and Origin validation inside every shipped privileged ops Server Function
  - Origin-first and current-staff-second AST enforcement across the seven-action census
  - Real marketplace-host action replay proof with a deliberately copied staff cookie
affects: [20-06, 20-07, 20-12, future-ops-mutations]

actuals:
  tokens: 11279
  tasks: 3
  commits: 5
commits: 5
plan_head_before: 160fd8d04d93dcbb4372688a2d0505783b9e5ac8

tech-stack:
  added: []
  patterns:
    - Server Function authority is proven from strict Host and Origin parsing before identity or domain work
    - AST import resolution pins shared guard identity and exact first/second statement order
    - Cross-host replay changes only Host and Origin while preserving the captured action id, payload, and deliberately supplied staff cookie

key-files:
  created:
    - e2e/ops-auth.spec.ts
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-14-TASK-1-RED-EVIDENCE.json
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-14-TASK-2-RED-EVIDENCE.json
  modified:
    - src/lib/ops/staff.ts
    - src/app/actions/ops-review.ts
    - src/app/actions/ops-contact.ts
    - src/app/actions/cancel-booking.ts
    - tests/ops/ops-audit.test.ts
    - tests/ops/host-contact-reveal.test.ts
    - tests/payments/ops-cancel.test.ts
    - tests/design/ops-guard-coverage.test.ts

key-decisions:
  - "Treat configured URL.host and URL.origin as the only allowed mutation authority; malformed authority is indistinguishable from missing or wrong authority."
  - "Validate request authority before requireStaff so a wrong-host request cannot learn whether its cookie or target is valid."
  - "Prove streamed Server Function refusal through unchanged target/audit state followed by success of the identical action bytes under exact ops authority, because Next 16 keeps HTTP 200 for streamed notFound responses."

requirements-completed: [OPS-07, OPS-08, OPS-09, OPS-10, OPS-11]
duration: 39 min
completed: 2026-09-08
status: complete
---

# Phase 20 Plan 14: Exact Ops Mutation Authority Summary

**Every shipped privileged ops Server Function now proves exact configured ops Host and Origin before reading staff identity, and a real copied-cookie marketplace replay demonstrably produces zero domain or audit mutation.**

## Performance

- **Duration:** 39 min
- **Completed:** 2026-09-08
- **Tasks:** 3
- **Files changed:** 11

## Accomplishments

- Added `requireOpsMutationOrigin()` with strict authority-only Host parsing and absolute origin-only Origin parsing against the validated configured ops URL.
- Applied origin-first/current-staff-second ordering to all five review actions, contact reveal, and ops cancellation without changing owner or host cancellation contracts.
- Extended focused behavioral tests so missing, malformed, marketplace, unknown, and mismatched authorities stop before session, parsing, limiting, reads, money, notifications, or audit effects.
- Rebuilt the AST census around resolved imports and exact statement order, including mutations for swapped guards, missing guards, local decoys, and Proxy-only gating.
- Captured a real rendered `next-action` request, replayed its exact bytes with a copied staff cookie on the marketplace host, proved zero target/audit delta, then replayed it under exact ops authority and observed the established approval plus audit outcome.

## Task Commits

1. **Task 1 RED — define the review-action authority contract** - `9bfd50e`
2. **Task 1 GREEN — bind all review actions to exact ops authority** - `fd61975`
3. **Task 2 RED — define contact and cancellation authority contracts** - `9410abd`
4. **Task 2 GREEN — guard contact reveal and ops cancellation** - `732d3d2`
5. **Task 3 — prove real marketplace action replay is refused** - `a48a704`

## Verification

- `node node_modules/vitest/vitest.mjs run tests/ops/ops-audit.test.ts tests/ops/host-contact-reveal.test.ts tests/payments/ops-cancel.test.ts --config vitest.config.ts` — **59/59 passed** with a clean per-file database leak report.
- `node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts tests/design/ops-guard-coverage.test.ts` — **17/17 passed**.
- Focused Playwright replay on an isolated configured port with installed system Chrome — **1/1 passed**; no credential, cookie, email, password, payload, or database URL was logged by the test.
- Scoped ESLint over all implementation and test files — **passed**.
- `tsc --noEmit` — the same nine pre-existing diagnostics remain in `ops-host-routing.test.ts`, `mail-credential-refusal.test.ts`, and `workflow-invariants.test.ts`; **no Plan 14 file reports a diagnostic**.
- Package manifests, lockfiles, and `drizzle/` — **unchanged** from `plan_head_before`.

## TDD Gate Compliance

- **Task 1 RED:** `9bfd50e` records a single focused failure where `approveHost` accepted missing Host before the guard existed. `20-14-TASK-1-RED-EVIDENCE.json` passed `gsd-tools check tdd-red-evidence`.
- **Task 1 GREEN:** `fd61975` made the focused operational and AST suites green while preserving domain behavior.
- **Task 2 RED:** `9410abd` records focused failures proving contact disclosure and money-moving cancellation accepted marketplace authority before coverage. `20-14-TASK-2-RED-EVIDENCE.json` passed the same evidence gate.
- **Task 2 GREEN:** `732d3d2` made both behavioral suites and the expanded seven-action census green.
- **REFACTOR:** No production refactor was needed after either green gate; the shared parser/guard and action ordering remained the smallest cohesive implementation.
- **Task 3:** Integration-only validation exercised the production behavior established by Tasks 1 and 2. Its first valid end-to-end execution identified test-harness assumptions about a later auth UI and streamed status semantics; correcting those assumptions produced the non-vacuous green replay without changing production code.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used checked-in tool entrypoints**

- **Found during:** Tasks 1-3 verification
- **Issue:** The local package-runner shim is not a reliable entrypoint in this checkout.
- **Fix:** Invoked the checked-in Vitest, ESLint, TypeScript, Playwright, and Next binaries through Node; no package was installed or changed.
- **Files modified:** None

**2. [Rule 1 - Test Bug] Removed an accidental dependency on the later ops login UI**

- **Found during:** Task 3 browser replay
- **Issue:** The first probe attempted to fill `/login`, but the dedicated visible ops-auth surface belongs to a later Phase 20 plan and is not a Plan 14 dependency.
- **Fix:** Signed the seeded staff identity in through the real Better Auth email endpoint on the ops authority, then loaded the real `/ops` page and captured its rendered action dispatch.
- **Files modified:** `e2e/ops-auth.spec.ts`
- **Commit:** `a48a704`

**3. [Rule 1 - Test Bug] Accounted for Next 16 streamed not-found transport**

- **Found during:** Task 3 marketplace replay
- **Issue:** The initial assertion expected HTTP 404, while the installed Next 16.2.7 documentation specifies HTTP 200 for streamed not-found responses.
- **Fix:** Kept the 200 envelope assertion and made refusal non-vacuous through unchanged target/audit state plus success of the identical action id and payload after changing only Host and Origin to exact ops authority.
- **Files modified:** `e2e/ops-auth.spec.ts`
- **Commit:** `a48a704`

**4. [Rule 3 - Blocking] Isolated Playwright from an existing local server**

- **Found during:** Task 3 verification
- **Issue:** Port 3000 was already owned by an unrelated local Next process and Playwright's bundled Chromium was absent.
- **Fix:** Ran a temporary exact-origin server on port 3100 with its own generated build directory and installed system Chrome. Temporary config edits and the generated directory were removed before commit.
- **Files modified:** None in the committed result

## Known Stubs

None. Empty-value matches are parser rejection checks, typed test accumulators, or existing nullable domain branches; no Plan 14 value flows as placeholder UI or production data.

## Threat Review

- `T-20-14-01`: strict exact Host plus exact Origin comparison fails closed.
- `T-20-14-02`: deliberately copied staff-cookie replay cannot cross marketplace authority.
- `T-20-14-03`: wrong authority stops before staff or target evidence is read.
- `T-20-14-04`: resolved-import AST census prevents decoys and ordering drift.
- `T-20-14-05`: wrong-host target and audit snapshots remain unchanged.
- No security-relevant surface outside the plan threat model was introduced.

## Next Phase Readiness

- Plans 20-06, 20-07, and 20-12 can compose `requireOpsMutationOrigin()` first and `requireStaff()` second for every new privileged mutation.
- Proxy remains routing-only and imports no database or authoritative auth layer.
- No Plan 14 blocker remains.

## Self-Check: PASSED

- All implementation, test, evidence, and summary files exist.
- Task commits `9bfd50e`, `fd61975`, `9410abd`, `732d3d2`, and `a48a704` exist in history.
- Focused operational, design, browser, and lint verification is green; no Plan 14 TypeScript diagnostic exists.
- No package, lockfile, schema, temporary Playwright configuration, or generated isolated build output remains in the realized diff.

---
*Phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa*
*Completed: 2026-09-08*
