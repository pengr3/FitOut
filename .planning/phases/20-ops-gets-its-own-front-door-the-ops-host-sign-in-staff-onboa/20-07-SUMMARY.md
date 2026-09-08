---
phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
plan: 07
subsystem: ops-staff-management
tags: [nextjs, server-actions, staff-roster, invitations, accessibility, vitest, tdd]

requires:
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 04
    provides: Transactional role policy with self-revoke and final-staff protection
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 05
    provides: Hash-only invitation lifecycle with stable version-bound concurrency references
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 06
    provides: Origin-first staff invitation lifecycle Server Functions
provides:
  - Protected deterministic Active staff and Pending invitations read model
  - One staff-management panel below the existing ops queue with exact D-15 through D-20 behavior
  - Confirmation-gated revoke/cancel, immediate resend, invite, and persistent in-page outcomes
affects: [20-08, 20-09, ops-console, staff-lifecycle, invitation-uat]

actuals:
  tokens: 14499
  tasks: 3
  commits: 8
commits: 8
plan_head_before: 1fa65da807c6bcf9b547a899e8cf07e9ad8037f4

tech-stack:
  added: []
  patterns:
    - Privileged snapshots establish current staff authority before reading roster data
    - Server-rendered action references carry concurrency identity without exposing ids or versions in visible output
    - Invite/resend successes use a polite live region while cancel/revoke move focus to one persistent result target

key-files:
  created:
    - src/lib/ops/staff-management.ts
    - src/components/ops/staff-management-panel.tsx
    - src/components/ops/staff-action-dialog.tsx
    - src/lib/ops/staff-action-state.ts
    - tests/ops/staff-management-actions.test.ts
    - tests/ops/staff-management-panel.test.tsx
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-07-TASK-1-RED-EVIDENCE.json
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-07-TASK-2-RED-EVIDENCE.json
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-07-TASK-3-RED-EVIDENCE.json
  modified:
    - src/app/actions/ops-staff.ts
    - src/app/(ops)/ops/page.tsx
    - tests/design/ops-guard-coverage.test.ts
    - tests/ops/staff-invitation-actions.test.ts

key-decisions:
  - "The snapshot returns display facts and opaque actionRef fields separately; ids and invitation versions never enter visible row text."
  - "Revoke continues through writeRole as the sole policy boundary; disabled UI is explanatory and direct/stale requests remain server-refused."
  - "Invite and Resend announce through role=status, while Cancel and Revoke use a focusable plain result because their successful triggers can disappear after revalidation."

requirements-completed: [OPS-09, OPS-10, OPS-11]

coverage:
  - id: D1
    description: "The protected snapshot returns active staff oldest-first and live invitations newest-first with stable id tie-breakers and server-owned action eligibility."
    requirement: OPS-10
    verification:
      - kind: integration
        ref: "tests/ops/staff-management-actions.test.ts#OPS-09/10 protected staff-management snapshot"
        status: pass
    human_judgment: false
  - id: D2
    description: "Revoke, invite, resend, and cancel preserve exact origin-first authority, current staff lookup, transactional policy, bound refs, and roster revalidation."
    requirement: OPS-09
    verification:
      - kind: integration
        ref: "tests/ops/staff-management-actions.test.ts"
        status: pass
      - kind: integration
        ref: "tests/ops/staff-policy.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "The one-page panel renders Invite, Active, and Pending in locked order with exact accessible actions, confirmations, empty state, and durable feedback."
    requirement: OPS-11
    verification:
      - kind: component
        ref: "tests/ops/staff-management-panel.test.tsx"
        status: pass
      - kind: design
        ref: "tests/design/responsive-dialog-autofocus.test.tsx"
        status: pass
    human_judgment: false

duration: 56 min
completed: 2026-09-08
status: complete
---

# Phase 20 Plan 07: Ops Staff Management Summary

**FitOut Ops now has one protected staff-management panel below the queue with deterministic active/pending rosters, safe lifecycle actions, and persistent accessible outcomes.**

## Performance

- **Duration:** 56 min
- **Started:** 2026-09-08T03:26:30Z
- **Completed:** 2026-09-08T04:22:51Z
- **Tasks:** 3
- **Files changed:** 13

## Accomplishments

- Added a protected roster snapshot that fails closed on an impossible zero-staff state, orders active staff by `createdAt,id` ascending, orders pending invitations by `sentAt,id` descending, formats people-facing dates server-side, and keeps internal action refs out of visible facts.
- Integrated one `Staff management` PanelCard 48px below the complete operational queue, with the locked Invite staff, Active staff, and Pending invitations hierarchy and neutral 44px controls.
- Kept self-revoke and final-staff protection authoritative in `writeRole`, while the roster exposes the exact shared disabled reasons for explanation only.
- Added safe-first responsive confirmations for Revoke and Cancel, immediate version-bound Resend, email-only Invite, exact success/refusal copy, and roster revalidation only after authoritative row-changing outcomes.
- Added email-specific accessible action names, long-text wrapping, neutral pending-empty treatment, polite Invite/Resend announcements, and focus restoration to durable Cancel/Revoke results.

## Task Commits

1. **Task 1 RED — define protected roster and mutation boundaries** — `19a70c1`
2. **Task 1 GREEN — add deterministic roster and policy-backed revocation** — `e6e433d`
3. **Task 2 RED — define active staff panel interactions** — `51c0402`
4. **Task 2 GREEN — render the active roster and revoke confirmation** — `9aee9bb`
5. **Task 3 RED — define pending invitation lifecycle** — `20056fb`
6. **Task 3 GREEN — complete invite, resend, and cancel management** — `6777439`
7. **Full-suite correction — restore the Server Action export contract** — `45b34b6`

## Verification

- `node node_modules/vitest/vitest.mjs run tests/ops/staff-management-actions.test.ts tests/ops/staff-policy.test.ts --config vitest.config.ts` — **PASS, 15/15** with a clean database leak report.
- `node node_modules/vitest/vitest.mjs run tests/ops/staff-management-panel.test.tsx tests/ops/enforcement-dialog.test.tsx --config vitest.config.ts` — **PASS, 27/27**.
- `node node_modules/vitest/vitest.mjs run tests/ops/staff-management-panel.test.tsx tests/ops/staff-management-actions.test.ts --config vitest.config.ts` — **PASS, 21/21**.
- Invitation Server Function regression coverage — **PASS as part of a 26/26 four-file ops suite**.
- `tests/design/ops-guard-coverage.test.ts` plus `responsive-dialog-autofocus.test.tsx` — **PASS, 32/32**.
- `tests/design/card-pattern-coverage.test.ts` — **PASS, 11/11**.
- `tests/use-server-exports.test.ts` — **PASS, 4/4**; `ops-staff.ts` now exports async functions and erased types only.
- Both originally reported full-suite files run together — **PASS, 16/16** without changing the verification panel.
- Plan 20-07 runtime, invitation, dialog, policy, and Server Action export envelope — **PASS, 51/51**.
- Scoped ESLint over every Plan 20-07 implementation and affected test file — **PASS**.
- `node node_modules/typescript/bin/tsc --noEmit --pretty false` — the same nine pre-existing diagnostics remain in `ops-host-routing.test.ts`, `mail-credential-refusal.test.ts`, and `workflow-invariants.test.ts`; **no Plan 20-07 file reports a diagnostic**.
- Package manifests, lockfiles, database schema, and `drizzle/` — **unchanged** from `plan_head_before`.

## TDD Gate Compliance

- **Task 1 RED:** `19a70c1` records the missing protected snapshot export as the targeted failure; `20-07-TASK-1-RED-EVIDENCE.json` passed `check tdd-red-evidence` with `RED_EVIDENCE_OK`.
- **Task 1 GREEN:** `e6e433d` made stable ordering, DTO separation, invariant refusal, origin/staff guard order, forged-form rejection, and shared revoke refusal assertions green.
- **Task 2 RED:** `51c0402` records the absent staff panel/dialog boundary as the targeted failure; `20-07-TASK-2-RED-EVIDENCE.json` passed the same evidence gate.
- **Task 2 GREEN:** `9aee9bb` made the one-page placement, active facts, You marker, disabled reasons, safe-first confirmation, and refusal persistence assertions green.
- **Task 3 RED:** `20056fb` records the missing Invite staff and populated Pending invitations surfaces as the targeted failure; `20-07-TASK-3-RED-EVIDENCE.json` passed the same evidence gate.
- **Task 3 GREEN:** `6777439` made invite delivery, pending facts, bound resend/cancel, exact lifecycle copy, and empty pending behavior green.
- **REFACTOR:** No separate refactor commit was needed; the shared discriminated `StaffActionDialog` and one shared result state are the smallest reuse of established panel/dialog patterns.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test Bug] Completed the grant mock's shared policy surface**

- **Found during:** Task 1 GREEN
- **Issue:** The isolated grant mock omitted `STAFF_ROLE`, which the protected snapshot imports to select active staff.
- **Fix:** Added the shared role constant to the mock so the test exercises the real module contract.
- **Files modified:** `tests/ops/staff-management-actions.test.ts`
- **Commit:** `e6e433d`

**2. [Rule 3 - Blocking] Matched the repository component-test environment**

- **Found during:** Task 2 GREEN
- **Issue:** The new component test initially ran in Node and used jest-dom matchers that this Vitest setup does not install.
- **Fix:** Selected the repository's jsdom environment explicitly and used built-in Vitest assertions.
- **Files modified:** `tests/ops/staff-management-panel.test.tsx`
- **Commit:** `9aee9bb`

**3. [Rule 2 - Accessibility] Kept destructive refusals inside the open modal**

- **Found during:** Task 2 GREEN
- **Issue:** Radix correctly aria-hides the parent page while a confirmation is open, so a refusal rendered only in the shared page result could not be announced without closing the dialog.
- **Fix:** Rendered the same refusal in the open dialog alert while preserving the shared page result for persistence after dismissal.
- **Files modified:** `src/components/ops/staff-action-dialog.tsx`
- **Commit:** `9aee9bb`

**4. [Rule 3 - Blocking] Mocked Next revalidation in the prior invitation boundary test**

- **Found during:** Task 3 GREEN regression verification
- **Issue:** The existing isolated Server Function test invoked a successful invitation outside a Next request store after Plan 07 added the required `/ops` revalidation.
- **Fix:** Added the established `next/cache` mock; production behavior and authority order remain unchanged.
- **Files modified:** `tests/ops/staff-invitation-actions.test.ts`
- **Commit:** `6777439`

**5. [Rule 3 - Blocking] Used checked-in tool entrypoints**

- **Found during:** Tasks 1-3 verification
- **Issue:** The workstation's `npx` shim targets a missing npm installation, as already recorded by earlier Phase 20 plans.
- **Fix:** Invoked the checked-in Vitest, ESLint, and TypeScript binaries through Node without installing or changing dependencies.
- **Files modified:** None

**6. [Rule 1 - Runtime Contract] Removed a non-async value from the Server Action module**

- **Found during:** Wave 9 full-suite verification
- **Issue:** `INITIAL_OPS_STAFF_ACTION_STATE` was a runtime value exported from module-level `"use server"` code, which Next.js rejects even though focused Vitest imports succeeded.
- **Fix:** Moved the state type and idle constant to `src/lib/ops/staff-action-state.ts`; the action module now exports async functions and erased types only.
- **Files modified:** `src/lib/ops/staff-action-state.ts`, `src/app/actions/ops-staff.ts`, `src/components/ops/staff-action-dialog.tsx`, `src/components/ops/staff-management-panel.tsx`, `tests/ops/staff-management-panel.test.tsx`
- **Commit:** `45b34b6`

## Known Stubs

None. Empty controlled-form state, nullable action feedback, and the explicit zero-pending sentence are complete runtime states rather than unwired placeholders.

## Threat Review

- `T-20-07-01`: every mutation still runs the exact Host+Origin guard first and uncached current-staff verification second.
- `T-20-07-02`: roster action eligibility is explanatory only; `writeRole` retains transactional self-revoke and final-staff enforcement.
- `T-20-07-03`: invitation resend/cancel receive only server-rendered id/version refs, and those refs never enter visible text.
- `T-20-07-04`: roster refresh happens only after authoritative write outcomes; duplicate/stale/refused actions do not imply success.
- `T-20-07-05`: no new endpoint, schema, migration, dependency, client-selected actor, or alternate role path was introduced.
- No security-relevant surface outside the plan threat model was introduced.

## Issues Encountered

- Repository-wide TypeScript remains red on the same nine pre-existing diagnostics recorded by earlier Phase 20 summaries. No diagnostic names a Plan 20-07 file, and all focused runtime, design, and lint gates pass.
- `tests/host/verification-panel.test.tsx` reproduced its reported second-interaction timing failure once in isolation: the test queried the idle button while React still correctly exposed the disabled `Starting…` transition state. Neither that component nor its test changed in Plan 20-07, and rerunning both originally reported files together passed 16/16 without a source or test change, so the unrelated synchronization case was investigated but not papered over.

## User Setup Required

None. This plan adds no service, package, schema, migration, or environment variable.

## Next Phase Readiness

- Plan 20-08 can exercise the complete staff-management journey against the protected one-page surface.
- Plan 20-09 can perform the final phase route, responsive, long-text, and browser-level verification envelope.
- No Plan 20-07 blocker remains.

## Self-Check: PASSED

- All eight created implementation/test/evidence artifacts and all four modified artifacts exist in their expected final state.
- RED/GREEN commits `19a70c1`, `e6e433d`, `51c0402`, `9aee9bb`, `20056fb`, and `6777439`, plus corrective commit `45b34b6`, are present in Git history in the required order.
- All three RED evidence records return `RED_EVIDENCE_OK`; focused runtime, design, dialog, card, and lint gates pass with non-zero assertions.
- The realized diff contains no package, lockfile, schema, migration, unexpected deletion, skipped test, goal-blocking stub, or unmodeled threat surface.

---
*Phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa*
*Completed: 2026-09-08*
