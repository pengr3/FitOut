---
phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
plan: 13
subsystem: ops-design-inventories
tags: [nextjs, vitest, accessibility, responsive-dialog, design-system, ops-auth]

requires:
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 08
    provides: Completed ops-auth, shell, invitation, and staff-management surfaces under the routable `%5Fops-auth` source segment
provides:
  - Exact card, live-region, and loading inventories for every completed Phase 20 ops-auth surface
  - Executable safe-focus contracts for Revoke and Cancel staff dialogs
  - One-tree, touch-target, responsive-reflow, and unchanged-accent contracts for staff management
affects: [20-09, ops-auth, staff-management, design-system, accessibility]

actuals:
  tokens: 8214
  tasks: 2
  commits: 2
commits: 2
plan_head_before: e96dd6357691bdad036842bfc2ccc1dd0867e480

tech-stack:
  added: []
  patterns:
    - Exact source inventories use Next.js 16's `%5Fops-auth` filesystem escape for the routable `/_ops-auth` URL segment
    - Dialog success suppresses Radix trigger restoration only after a completed mutation and transfers focus to the persistent result line
    - Responsive behavior is enforced through one canonical DOM tree plus CSS reflow assertions

key-files:
  created: []
  modified:
    - tests/design/card-pattern-coverage.test.ts
    - tests/design/live-regions.test.tsx
    - tests/design/loading-coverage.test.ts
    - tests/design/responsive-dialog-autofocus.test.tsx
    - tests/design/one-tree.test.ts
    - src/components/ops/staff-action-dialog.tsx
    - src/components/ops/staff-management-panel.tsx

key-decisions:
  - "All ops-auth inventory paths use `%5Fops-auth`; `_ops-auth` would be a private, non-routable Next.js 16 source folder."
  - "Successful destructive dialogs prevent default trigger restoration and queue focus to the panel's persistent result line; cancellation and ordinary Escape retain normal trigger return."
  - "Staff-management enrollment preserves the existing ten accent uses and adds no token, primitive, selector, or test-id contract."

requirements-completed: [OPS-08, OPS-09, OPS-10]

coverage:
  - id: D1
    description: "Every completed ops login, recovery, reset, invitation, loading, error, and staff-management result surface is enrolled in its exact applicable design inventory."
    requirement: OPS-08
    verification:
      - kind: design
        ref: "tests/design/card-pattern-coverage.test.ts, tests/design/live-regions.test.tsx, tests/design/loading-coverage.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Revoke and Cancel confirmations start on a safe action, reject pending dismissal, restore ordinary trigger focus, and move successful focus to the persistent result."
    requirement: OPS-09
    verification:
      - kind: design
        ref: "tests/design/responsive-dialog-autofocus.test.tsx"
        status: pass
      - kind: integration
        ref: "tests/ops/staff-management-panel.test.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "Staff management uses one responsive tree with 44px controls, resilient content reflow, and no new accent family."
    requirement: OPS-10
    verification:
      - kind: design
        ref: "tests/design/one-tree.test.ts"
        status: pass
    human_judgment: false

duration: 22 min
completed: 2026-09-08
status: complete
---

# Phase 20 Plan 13: Ops Design Inventory Enrollment Summary

**Every completed ops-auth and staff-management surface is now governed by exact design inventories, with deterministic destructive-dialog focus and one responsive component tree.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-08T06:18:00Z
- **Completed:** 2026-09-08T06:40:00Z
- **Tasks:** 2
- **Files changed:** 7 implementation/test files plus phase documentation

## Accomplishments

- Enrolled login, forgot-password, reset-password, invitation, invitation loading, ops error, and staff-management surfaces in exact card, live-region, and loading inventories using the routable `%5Fops-auth` source path.
- Distinguished persistent mutation results from arrival and inactive-page states, including exact alert/status semantics and the absence of duplicate toast announcements.
- Added complete Revoke and Cancel dialog behavior coverage for safe initial focus, ordinary Escape return, pending dismissal refusal, and successful focus transfer.
- Proved staff management retains one responsive DOM tree, touch-sized controls, wrapping/overflow safeguards, the existing ten accent uses, and no new token or test-id contract.
- Corrected the successful-dialog focus handoff uncovered by the new inventory so keyboard focus lands on the persistent result instead of a removed row trigger.

## Task Commits

1. **Task 1 — enroll ops-auth cards, loading states, and result regions** — `37ac078`
2. **Task 2 — enroll dialog focus and one-tree behavior** — `0465f43`

## Verification

- All five focused design inventories together — **PASS, 5 files / 98 tests**.
- Staff-management integration suite — **PASS, 1 file / 11 tests**, including the database leak check.
- Scoped ESLint over all seven changed implementation/test files — **PASS**.
- `git diff --check` — **PASS**.
- Package manifests, lockfiles, database schema, migrations, shared primitives, tokens, selector contracts, and accent-use entries — **unchanged**.
- `node node_modules/typescript/bin/tsc --noEmit` — **BLOCKED BY OUT-OF-SCOPE BASELINE**: the same nine diagnostics remain in `tests/auth/ops-host-routing.test.ts`, `tests/design/mail-credential-refusal.test.ts`, and `tests/design/workflow-invariants.test.ts`; none is in a Plan 20-13 file. This is recorded in `deferred-items.md`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Accessibility Bug] Restored post-success focus to the persistent result**

- **Found during:** Task 2 focused verification
- **Issue:** The new Revoke success assertion showed Radix restoring focus to the row trigger after the row had been removed, instead of the persistent result line required by the UI-SPEC.
- **Fix:** Passed the panel's existing result ref into both dialog flows, marked successful completion, and used `onCloseAutoFocus` to prevent stale trigger restoration only after success before queueing result focus. Ordinary Escape and cancel behavior remain unchanged.
- **Files modified:** `src/components/ops/staff-action-dialog.tsx`, `src/components/ops/staff-management-panel.tsx`
- **Commit:** `0465f43`

**2. [Rule 3 - Tooling] Used checked-in tool entrypoints**

- **Found during:** Focused and overall verification
- **Issue:** The workstation's `npx` shim targets a missing npm installation.
- **Fix:** Invoked the already-installed Vitest, TypeScript, and ESLint entrypoints through Node. No dependency or manifest changed.
- **Files modified:** None

## Known Stubs

None. No placeholder UI, skipped test, mock-only production data source, TODO, or FIXME was introduced by this plan.

## Threat Review

- `T-20-13-01`: exact `%5Fops-auth` and staff-management inventories fail when an applicable surface is removed or stops using the approved structure.
- `T-20-13-02`: both destructive flows prove safe initial focus, disabled pending controls, refused pending Escape, ordinary trigger return, and deterministic success focus.
- `T-20-13-03`: only persistent mutation results announce; arrival and inactive states are explicitly non-live and no toast duplicates them.
- `T-20-13-04`: one-tree and CSS reflow assertions cover structural responsive regressions; final rendered-width verification remains owned by Plan 20-09.
- No new endpoint, auth authority, file-access boundary, schema, migration, dependency, primitive, token, or selector surface was introduced.

## Self-Check: PASSED

- All seven changed implementation/test files exist at their final paths.
- Commits `37ac078` and `0465f43` exist in history.
- The measured ledger base is `e96dd6357691bdad036842bfc2ccc1dd0867e480`; two task commits precede this summary.
