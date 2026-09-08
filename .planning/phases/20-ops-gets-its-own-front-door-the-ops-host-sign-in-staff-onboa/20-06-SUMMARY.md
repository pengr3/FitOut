---
phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
plan: 06
subsystem: ops-authentication
tags: [nextjs, server-functions, staff-invitations, scanner-safety, vitest, tdd]

requires:
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 05
    provides: Hash-only invitation lifecycle with version-bound resend/cancel and exactly-once acceptance
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 12
    provides: Dedicated exact-origin ops authentication journey and sibling auth shell
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 14
    provides: Exact Host/Origin mutation guard and origin-first authorization contract
provides:
  - Origin-first staff invitation lifecycle Server Functions with session-derived audit actors
  - Token-only recipient acceptance Server Function with bounded inactive and validation outcomes
  - Read-only ops-host invitation page with indistinguishable inactive states and focused credential setup
affects: [20-07, 20-08, 20-09, staff-management, ops-auth]

actuals:
  tokens: 6336
  tasks: 2
  commits: 4
commits: 4
plan_head_before: aacc6b6db1cd441af6254ad24282e6a60feb7aed

tech-stack:
  added: []
  patterns:
    - Every privileged invitation Server Function proves exact ops authority before current staff identity and domain work
    - Public bearer GET performs inspection only; account creation is confined to the explicit POST action
    - Server-rendered invitation references and schema-bounded acceptance inputs exclude client-selected actors and identities

key-files:
  created:
    - src/app/actions/ops-staff.ts
    - src/app/(ops-auth)/_ops-auth/invite/[token]/page.tsx
    - src/app/(ops-auth)/_ops-auth/invite/[token]/loading.tsx
    - src/app/(ops-auth)/_ops-auth/_components/staff-invite-setup-form.tsx
    - tests/ops/staff-invitation-actions.test.ts
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-06-TASK-1-RED-EVIDENCE.json
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-06-TASK-2-RED-EVIDENCE.json
  modified:
    - src/app/actions/ops-auth.ts
    - src/app/(ops-auth)/_ops-auth/login/page.tsx
    - tests/design/ops-guard-coverage.test.ts
    - tests/design/ops-host-invariants.test.ts
    - tests/design/loading-coverage.test.ts

key-decisions:
  - "Lifecycle actions accept only email or the server-rendered invitation reference; actor identity always comes from requireStaff after the exact origin guard."
  - "Recipient acceptance schema-strips all fields except token, name, and password, then redirects accepted setup to /login?accepted=1."
  - "All inactive invitation classes share one title, body, recovery link, and page structure; the bearer route is also noindex and no-referrer."

requirements-completed: [OPS-09]

coverage:
  - id: D1
    description: "Invite, resend, and cancel reject wrong authority before staff or domain work and use only the authenticated actor plus bound invitation reference."
    requirement: OPS-09
    verification:
      - kind: integration
        ref: "tests/ops/staff-invitation-actions.test.ts#OPS-09 staff invitation Server Function boundaries"
        status: pass
    human_judgment: false
  - id: D2
    description: "Acceptance forwards only token, name, and password, returns bounded inactive/validation outcomes, and redirects accepted credentials to ops sign-in."
    requirement: OPS-09
    verification:
      - kind: integration
        ref: "tests/ops/staff-invitation-actions.test.ts#accepts only token, name, and password"
        status: pass
      - kind: integration
        ref: "tests/ops/staff-invitation.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "The internal invite route reads only inspection on GET, renders one inactive state, contains no email input, and ships one announced loading fallback."
    requirement: OPS-09
    verification:
      - kind: integration
        ref: "tests/design/ops-host-invariants.test.ts#keeps staff invitation GET read-only"
        status: pass
      - kind: integration
        ref: "tests/design/loading-coverage.test.ts"
        status: pass
    human_judgment: false

duration: 22 min
completed: 2026-09-08
status: complete
---

# Phase 20 Plan 06: Guarded Staff Invitation Journey Summary

**FitOut Ops now exposes origin-bound invitation lifecycle actions and a read-only bearer-link setup page whose inactive states disclose nothing about why a credential cannot be used.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-08T02:44:31Z
- **Completed:** 2026-09-08T03:06:31Z
- **Tasks:** 2
- **Files changed:** 12

## Accomplishments

- Added Invite, Resend, and Cancel Server Functions that run `requireOpsMutationOrigin()` first, `requireStaff()` second, and derive the audit actor only from the authenticated session.
- Bound lifecycle writes to server-rendered `{ id, version }` references so stale submissions return the existing stable stale outcome without touching a replacement invitation.
- Added recipient acceptance that schema-bounds the request to token, name, and password; email and target identity remain derived from the consumed invitation row.
- Added the internal async invitation route, its accessible loading card, and one focused name/password form with fixed invited-email text and no editable email control.
- Collapsed malformed, unknown, expired, cancelled, and used credentials onto one inactive heading/body/recovery structure, with `noindex` and `no-referrer` metadata on the bearer route.
- Extended the action, internal-route, and loading inventories so future guard or route removal fails the build-blocking design gates.

## Task Commits

1. **Task 1 RED — define invitation action boundaries** — `f17456f`
2. **Task 1 GREEN — guard staff invitation Server Functions** — `0183a5b`
3. **Task 2 RED — define scanner-safe invite route** — `79f9a9c`
4. **Task 2 GREEN — add focused staff invite setup** — `9d0f5ce`

## Verification

- `node node_modules/vitest/vitest.mjs run tests/ops/staff-invitation-actions.test.ts tests/ops/staff-invitation.test.ts --config vitest.config.ts` — **PASS, 18/18** with a clean database leak report.
- `node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts tests/design/ops-guard-coverage.test.ts tests/design/ops-host-invariants.test.ts` — **PASS, 25/25**.
- `node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts tests/design/loading-coverage.test.ts` — **PASS, 15/15**.
- Existing ops-auth plus invitation regression envelope — **PASS, 39/39**.
- Scoped ESLint over every Plan 20-06 implementation and affected test file — **PASS**.
- `node node_modules/typescript/bin/tsc --noEmit --pretty false` — the same nine previously recorded diagnostics remain in `ops-host-routing.test.ts`, `mail-credential-refusal.test.ts`, and `workflow-invariants.test.ts`; **no Plan 20-06 file reports a diagnostic**.
- Package manifests, lockfiles, database schema, and `drizzle/` — **unchanged** from `plan_head_before`.

## TDD Gate Compliance

- **Task 1 RED:** `f17456f` records the missing lifecycle export as the sole targeted failure; `20-06-TASK-1-RED-EVIDENCE.json` passed `check tdd-red-evidence` with `RED_EVIDENCE_OK`.
- **Task 1 GREEN:** `0183a5b` made all authority-order, bound-reference, input-bounding, redirect, and typed-outcome assertions green.
- **Task 2 RED:** `79f9a9c` records the absent internal invite route as the sole targeted failure; `20-06-TASK-2-RED-EVIDENCE.json` passed the same evidence gate.
- **Task 2 GREEN:** `9d0f5ce` made the route/action censuses, read-only inspection, inactive-state, form, loading, and existing auth assertions green.
- **REFACTOR:** No separate production refactor was needed; both GREEN implementations are the smallest direct composition of the existing invitation domain and ops-auth patterns.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test Bug] Reset the mocked domain result after action-level validation**

- **Found during:** Task 1 GREEN
- **Issue:** The invalid-input case correctly returned before calling the mocked domain function, leaving a one-shot mocked `invalid` result queued for the following valid inactive case.
- **Fix:** Reset the domain mock before the inactive assertion so the test observes the intended action branch.
- **Files modified:** `tests/ops/staff-invitation-actions.test.ts`
- **Commit:** `0183a5b`

**2. [Rule 2 - Security] Added crawler and referrer protections to the bearer route**

- **Found during:** Task 2 threat review
- **Issue:** A staff invitation URL is an elevation-bearing credential; read-only GET prevents consumption but indexing or outbound referrer propagation would still disclose it.
- **Fix:** Added static `robots: { index: false, follow: false }` and `referrer: "no-referrer"` metadata using the repository's established public-invite pattern.
- **Files modified:** `src/app/(ops-auth)/_ops-auth/invite/[token]/page.tsx`
- **Commit:** `9d0f5ce`

**3. [Rule 2 - Missing Critical] Reconciled the build-blocking loading inventory**

- **Found during:** Task 2 design verification
- **Issue:** The route classifier correctly recognized the new async page and loading file, but its pinned totals still predated Phase 20's cloak and three ops-auth pages as well as this route.
- **Fix:** Re-measured the complete tree as 40 pages: 24 async pages with 24 loading files and 16 synchronous pages.
- **Files modified:** `tests/design/loading-coverage.test.ts`
- **Commit:** `9d0f5ce`

**4. [Rule 2 - Missing Critical] Consumed the exact accepted-arrival query state**

- **Found during:** Task 2 end-to-end composition
- **Issue:** The new action redirects to the plan-required `/login?accepted=1`, while the earlier login surface recognized only its provisional `created=1` key.
- **Fix:** Added the exact accepted key while retaining the provisional key for compatibility; both render the one bounded confirmation sentence.
- **Files modified:** `src/app/(ops-auth)/_ops-auth/login/page.tsx`
- **Commit:** `9d0f5ce`

**5. [Rule 3 - Blocking] Used checked-in tool entrypoints**

- **Found during:** Tasks 1-2 verification
- **Issue:** Earlier Phase 20 execution established that the workstation's `npx` shim targets a missing npm installation.
- **Fix:** Invoked the checked-in Vitest, ESLint, and TypeScript binaries through Node without installing or changing dependencies.
- **Files modified:** None

## Known Stubs

None. The form placeholder attributes are input hints backed by visible labels; empty default field values and nullable action state are normal controlled-form state, not unwired production data.

## Threat Review

- `T-20-06-01`: lifecycle actions establish exact Host+Origin authority first and current staff identity second.
- `T-20-06-02`: resend/cancel receive only the server-bound invitation id/version pair and forward no client actor or alternate target.
- `T-20-06-03`: GET imports and invokes only `inspectStaffInvitation`; account creation is exclusive to POST acceptance.
- `T-20-06-04`: every inactive token class renders one copy and DOM structure without recipient data or classification.
- `T-20-06-05`: action results contain bounded enums/copy only; no token, email, or password is logged or added to audit payloads.
- No security-relevant surface outside the plan threat model was introduced; crawler/referrer hardening narrows the planned bearer boundary.

## Issues Encountered

- Repository-wide TypeScript remains red on the same nine pre-existing diagnostics recorded by Plans 20-03, 20-04, 20-05, 20-10, 20-12, and 20-14. No diagnostic names a Plan 20-06 file, and all focused runtime, design, and lint gates pass.

## User Setup Required

None. This plan adds no service, package, schema, migration, or environment variable.

## Next Phase Readiness

- Plan 20-07 can bind the authenticated staff-management panel directly to `inviteStaffAction`, `resendStaffInviteAction`, and `cancelStaffInviteAction` using server-rendered invitation references.
- Plans 20-08 and 20-09 can exercise the complete visible invite acceptance journey and final ops route census.
- No Plan 20-06 blocker remains.

## Self-Check: PASSED

- All seven created implementation/test/evidence artifacts and all five modified artifacts exist in their expected final state.
- RED/GREEN commits `f17456f`, `0183a5b`, `79f9a9c`, and `9d0f5ce` are present in Git history in the required order.
- Both RED evidence records return `RED_EVIDENCE_OK`; focused runtime, design, loading, auth-regression, and lint gates pass with non-zero assertions.
- The realized diff contains no package, lockfile, schema, migration, raw-token logging, unexpected deletion, skipped test, or goal-blocking stub.

---
*Phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa*
*Completed: 2026-09-08*
