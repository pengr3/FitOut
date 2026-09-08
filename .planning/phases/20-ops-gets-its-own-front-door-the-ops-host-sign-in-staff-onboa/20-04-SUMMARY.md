---
phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
plan: 04
subsystem: ops-authorization
tags: [postgres, drizzle, advisory-lock, better-auth, cli, vitest, tdd]

requires:
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 03
    provides: Exact-host Better Auth sessions with database-backed uncached role reads
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 11
    provides: Production-proven ops partition and protected response gateway
provides:
  - One transactional writeRole authority for staff grants, conversion, and revocation
  - Race-safe self and final-staff revoke protection with shared refusal copy
  - Explicit CLI-only marketplace-account conversion and next-request revocation proof
affects: [20-05, 20-07, ops-staff-management, staff-invitations, ops-auth]

actuals:
  tokens: 7486
  tasks: 3
  commits: 7
commits: 7
plan_head_before: 86cf7f6ec35a8fcd4a52f75ce3d7a7e4dfdf743c

tech-stack:
  added: []
  patterns:
    - Transaction-scoped advisory lock plus conditional UPDATE RETURNING owns staff-boundary decisions
    - Privileged account conversion is explicit, atomic, capability-clearing, and PII-free in audit metadata

key-files:
  created:
    - tests/ops/staff-policy.test.ts
    - tests/ops/staff-session-revocation.test.ts
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-04-TASK-1-RED-EVIDENCE.json
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-04-TASK-2-RED-EVIDENCE.json
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-04-TASK-3-RED-EVIDENCE.json
  modified:
    - src/lib/ops/grant.ts
    - scripts/ops-grant.ts
    - tests/ops/grant-cli.test.ts
    - .planning/todos/pending/2026-09-01-ops-staff-management-surface-and-invite-flow.md

key-decisions:
  - "The database predicate is the only revoke-success signal; UI eligibility and pre-lock counts are explanatory only."
  - "D-19 policy refusals are side-effect free, while the established unknown/ambiguous target audit behavior remains intact."
  - "Marketplace conversion remains on the one existing local CLI and requires the exact --convert-marketplace-account flag."

patterns-established:
  - "Staff boundary: acquire pg_advisory_xact_lock(hashtextextended('fitout:staff-role-policy', 0)), then re-read and conditionally mutate within one transaction."
  - "Shared refusal semantics: exported self/last copy constants pair with typed result reason codes for later server-action and UI callers."

requirements-completed: [OPS-10, OPS-11]

coverage:
  - id: D1
    description: "Self, sole-member, empty-set, and concurrent crossing revokes cannot reduce the active staff set below one."
    requirement: OPS-10
    verification:
      - kind: integration
        ref: "tests/ops/staff-policy.test.ts#writeRole staff-revocation boundary"
        status: pass
    human_judgment: false
  - id: D2
    description: "Ordinary staff grants refuse marketplace-capable accounts; explicit conversion clears both capabilities and grants staff atomically."
    requirement: OPS-11
    verification:
      - kind: integration
        ref: "tests/ops/grant-cli.test.ts#cases 13-15"
        status: pass
    human_judgment: false
  - id: D3
    description: "A pre-revocation session cookie is refused by requireStaff on the immediately following protected request."
    requirement: OPS-10
    verification:
      - kind: integration
        ref: "tests/ops/staff-session-revocation.test.ts#reuses the pre-revocation cookie"
        status: pass
      - kind: integration
        ref: "tests/ops/staff-guard.test.ts"
        status: pass
    human_judgment: false

duration: 19 min
completed: 2026-09-08
status: complete
---

# Phase 20 Plan 04: Concurrency-Safe Staff Role Policy Summary

**A single audited Drizzle transaction now protects FitOut’s last staff account, refuses implicit marketplace conversion, and makes revocation effective on the next protected request.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-09-08T00:20:16Z
- **Completed:** 2026-09-08T00:39:16Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Centralized every grant/revoke transition behind exported `writeRole`, with the named transaction advisory lock, an in-database `UPDATE ... EXISTS ... RETURNING` revoke predicate, and same-transaction audit insertion.
- Added typed self, final-staff, empty-invariant, stale-role, and marketplace-account refusals; stable roster reads now order by `createdAt ASC, id ASC`.
- Kept one established ops CLI while adding the exact `--convert-marketplace-account` escape hatch; ordinary grants leave booker/host accounts untouched, while explicit conversion clears both capabilities and records prior booleans without PII.
- Proved a cookie issued to staff is refused by `requireStaff()` immediately after `writeRole` revokes the database role, with the session identity itself remaining valid.

## Task Commits

1. **Task 1 RED — transactional revoke boundary** — `5f0a4e2` (test)
2. **Task 1 GREEN — serialized role revocation** — `1bffef2` (feat)
3. **Task 2 RED — explicit marketplace conversion** — `36c3e15` (test)
4. **Task 2 GREEN — conversion policy and CLI flag** — `0307f9f` (feat)
5. **Task 3 RED — next-request revocation and decision record** — `329717b` (test)
6. **Task 3 GREEN — retained supersession record** — `3c6e00a` (docs)
7. **REFACTOR — lint-clean policy fixture** — `c1eb662` (refactor)

## Files Created/Modified

- `src/lib/ops/grant.ts` — Shared typed role writer, advisory lock, conditional revoke, explicit conversion, audit atomicity, and stable roster order.
- `scripts/ops-grant.ts` — One retained grant/revoke/list CLI with explicit conversion parsing and typed refusal output.
- `tests/ops/staff-policy.test.ts` — Real-database self/last/empty/order and two-connection race coverage.
- `tests/ops/grant-cli.test.ts` — Side-effect-free ordinary refusal, atomic explicit conversion, PII-free audit, and parser/help contract.
- `tests/ops/staff-session-revocation.test.ts` — Pre-revocation cookie reuse through the real Better Auth test instance and protected guard.
- `.planning/todos/pending/2026-09-01-ops-staff-management-surface-and-invite-flow.md` — Preserved the historical coexistence ruling and named D-14/D-275 as its superseding rule.

## Decisions Made

- The conditional database update is authoritative. A returned row is success; a zero-row result is diagnosed under the same advisory lock into reusable typed refusal reasons.
- D-19 self/final/stale policy refusals write neither role nor audit state. Existing unknown and ambiguous target attempts retain their established denial audit trail because they are target-resolution events, not D-19 eligibility refusals.
- The CLI’s `--by` remains an asserted audit handle for bootstrap compatibility. Authenticated server-action callers pass their real staff user id into the same `actorId` field.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed an unused schema import discovered by scoped lint**

- **Found during:** Close-out verification after Task 3
- **Issue:** The new staff-policy test imported `audit` but queried the table through raw SQL, leaving one lint warning.
- **Fix:** Removed the unused import without changing test behavior.
- **Files modified:** `tests/ops/staff-policy.test.ts`
- **Verification:** Scoped ESLint passed with zero errors and zero warnings; all 29 focused tests remained green.
- **Committed in:** `c1eb662`

**2. [Rule 3 - Blocking] Invoked the checked-in test/compiler binaries directly**

- **Found during:** Every task verification
- **Issue:** Earlier Phase 20 execution established that the local `npx` shim does not resolve the installed tools reliably.
- **Fix:** Ran Vitest, ESLint, and TypeScript from their checked-in `node_modules` entrypoints; no dependency or lockfile changed.
- **Files modified:** None
- **Verification:** Four focused files passed 29/29; scoped ESLint passed.
- **Committed in:** No file change required

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking environment issue).  
**Impact on plan:** Both were execution hygiene only; the policy, CLI, schema, and dependency scope stayed exactly within the plan.

## Issues Encountered

- `node node_modules/typescript/bin/tsc --noEmit --pretty false` still exits non-zero on the same nine pre-existing diagnostics already recorded by Plans 20-10 and 20-03: two `Response`/`NextResponse` mismatches in `tests/auth/ops-host-routing.test.ts` and seven Node typing diagnostics in `tests/design/mail-credential-refusal.test.ts` / `tests/design/workflow-invariants.test.ts`. No diagnostic names a Plan 20-04 file; the existing entries remain in `deferred-items.md`.
- The Task 3 runtime assertion was already green before its documentation change because Plan 20-03 had established uncached role reads. RED correctly isolated the remaining planned gap: the retained todo had not yet recorded D-14/D-275’s supersession.

## TDD Gate Compliance

- **Task 1 RED:** `5f0a4e2`; `20-04-TASK-1-RED-EVIDENCE.json` returned `RED_EVIDENCE_OK` with 0/5 policy cases passing against the pre-policy writer.
- **Task 1 GREEN:** `1bffef2`; all five real-database boundary cases passed, including two independent racing connections.
- **Task 2 RED:** `36c3e15`; `20-04-TASK-2-RED-EVIDENCE.json` returned `RED_EVIDENCE_OK` with the three new conversion cases failing for their intended assertions.
- **Task 2 GREEN:** `0307f9f`; all 15 CLI policy cases and all five staff-boundary cases passed.
- **Task 3 RED:** `329717b`; the runtime revocation proof passed immediately, while `20-04-TASK-3-RED-EVIDENCE.json` captured the intentionally missing D-14/D-275 supersession record.
- **Task 3 GREEN:** `3c6e00a`; the retained history and supersession assertion passed together with the next-request revocation proof.
- **REFACTOR:** `c1eb662`; scoped lint and the full 29-test plan suite passed afterward.

## Verification

| Gate | Result |
|---|---|
| Four planned ops test files | **29 passed / 0 failed** |
| Scoped ESLint over all plan-owned source/tests | **PASS — 0 errors, 0 warnings** |
| Named advisory lock / conditional update / audit / flag source inspection | **PASS** |
| Package and schema diff from `plan_head_before` | **empty — zero dependencies, zero migrations** |
| Repository-wide TypeScript | **Known baseline failure only; 9 pre-existing diagnostics, 0 in Plan 20-04 files** |

## Known Stubs

None. The default empty option objects and parser accumulator found by the mechanical scan are real initialized values with exercised behavior, not UI/data placeholders.

## User Setup Required

None. No external service, environment variable, package, or schema change is required.

## Next Phase Readiness

- Plan 20-05 can call transaction-aware `writeRole` while accepting an invitation, preserving user/account/role/audit atomicity.
- Plan 20-07 can reuse the exported self/last reason constants and typed refusal codes for both disabled-row explanation and authoritative server-action responses.
- No Plan 20-04 blocker remains.

## Self-Check: PASSED

- All five claimed created artifacts and four modified artifacts exist.
- All seven task/TDD commits are present after `plan_head_before` in the required RED-before-GREEN order.
- All acceptance criteria were re-run: 29 focused tests pass, the advisory-lock/update/audit/flag source anchors exist, and package/schema diffs are empty.
- No unexpected deletion, dependency change, migration, PII-bearing audit field, TODO, FIXME, skipped test, or goal-blocking stub was introduced.

---
*Phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa*
*Completed: 2026-09-08*
