---
phase: 23-the-support-path-becomes-reachable
plan: 02
subsystem: public-origin/notifications/payments/verification/testing
tags: [nextjs, vitest, vercel-preview, paymongo, didit, inngest]
requires:
  - phase: 23-the-support-path-becomes-reachable
    provides: exact canonical and Vercel Preview public-origin resolution through absolutePublicUrl
provides:
  - runtime inventory for every refactored public-origin caller
  - shared canonical/Preview authority for notification, booking, group, payment, and Didit destinations
affects: [23-03, STATE-05, TRUST-01, provider-cutover]
actuals:
  tokens: 8422
  tasks: 3
  commits: 5
plan_head_before: 32483784b996e1def9a217c5fe31514961779ca9
tech-stack:
  added: []
  patterns:
    - use absolutePublicUrl for every server-built customer or provider-facing URL
    - inventory runtime public-origin callers with canonical and exact Preview coverage
key-files:
  created:
    - tests/auth/public-origin-callers.test.ts
  modified:
    - src/lib/notifications.ts
    - src/app/actions/booking.ts
    - src/app/actions/paymongo-connect.ts
    - src/lib/verification/providers/didit.ts
    - tests/verification/didit-session.test.ts
key-decisions:
  - Public notification, provider return, and hosted-verification links now delegate only to absolutePublicUrl; route and query construction remains at each caller.
  - Didit keeps its existing signed receiver and minimum body shape; only its outbound callback origin changed.
  - Tests import server modules that resolve public origin only after setting their isolated environment.
patterns-established:
  - Preserve existing payment, notification, and token-bearing route semantics while centralizing only origin selection.
requirements-completed: [STATE-05, TRUST-01]
coverage:
  - id: D1
    description: Notification, confirmation, request-expiry, and reminder CTAs resolve through canonical or exact Preview public authority.
    requirement: TRUST-01
    verification:
      - kind: unit
        ref: tests/auth/public-origin-callers.test.ts#notification and scheduled-email inventory
        status: pass
    human_judgment: false
  - id: D2
    description: Booking, cancellation, request, group invite, PayMongo onboarding, and Didit callback destinations retain their existing paths while using shared public-origin resolution.
    requirement: STATE-05
    verification:
      - kind: unit
        ref: tests/auth/public-origin-callers.test.ts#booking, provider, and host inventory
        status: pass
      - kind: unit
        ref: tests/verification/didit-session.test.ts
        status: pass
    human_judgment: false
duration: 28 min
completed: 2026-09-11T09:16:42Z
status: complete
---

# Phase 23 Plan 02: Public-Origin Caller Inventory Summary

Every runtime public link now uses the same canonical-production or exact-Vercel-Preview authority without changing booking routes, payment policy, invitation-token handling, or Didit session semantics.

## Performance

- Tasks completed: 3/3
- Production commits: 5
- Files modified: 14
- New dependencies, migrations, routes, webhook receivers, and secrets: none

## Accomplishments

- Added a focused inventory test covering all twelve changed runtime public-origin callers and both canonical-production and exact-Preview helper output.
- Routed notification, scheduled-email, booking, cancellation, group, host-request, PayMongo, and Didit destinations through `absolutePublicUrl`.
- Preserved existing routes, query parameters, payment/onboarding behavior, provider payload shape, Didit callback path, and signed inbound receiver ownership.
- Corrected Didit's focused test isolation so it resolves the configured callback origin rather than an ambient localhost fallback.

## Task Commits

1. Task 1 — `b545def` `test(23-02): inventory notification public-origin callers`; `7dc8bf0` `feat(23-02): centralize notification public URLs`
2. Task 2 — `f8c212e` `feat(23-02): align booking public destinations`
3. Task 3 — `64d23f5` `feat(23-02): align provider return destinations`
4. Verification correction — `f2b0ad7` `fix(23-02): isolate Didit public origin test`

## Files Created/Modified

- `tests/auth/public-origin-callers.test.ts` — source inventory plus canonical and Preview authority assertions.
- `src/lib/notifications.ts`, `src/lib/payments/confirm-booking-payment.ts`, and Inngest jobs — absolute notification and email CTA destinations.
- Booking, cancellation, request, and group sources — preserved booking, checkout, and invitation paths through the shared helper.
- `src/app/actions/paymongo-connect.ts` and `src/lib/verification/providers/didit.ts` — canonical/Preview-safe outbound provider returns and callback.
- `tests/verification/didit-session.test.ts` — imports the Didit adapter after per-test public-origin configuration.

## Decisions Made

- Changed only trusted origin selection at each call site; local route/query construction stays local so existing workflows retain their destination semantics.
- Kept staff-only origin handling untouched because the scoped callers are public destinations.

## Deviations from Plan

### Auto-fixed Issues

1. [Rule 3 - Blocking issue] Ran focused tests with a temporary DB-free Vitest configuration.
- Found during: Tasks 1–3
- Issue: The repository-wide Vitest configuration always preflights Postgres even for these source-only tests; the local `fitout_test` database was unreachable.
- Fix: Used a temporary, deleted configuration with the existing aliases and no database setup to run the public-origin inventory and Didit session behavior suites.
- Verification: Inventory tests passed (5 tests) and Didit session tests passed (12 tests).
- Committed in: no source change; temporary verification artifact was deleted.

### Scope Preservation

Per executor direction, this plan did not update or stage the pre-existing changes in `STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`, older phase artifacts, or other unrelated files. Only plan-owned source/test commits and this summary are included.

### Verification Correction

2. [Rule 1 - Test isolation] Deferred Didit adapter loading until its per-test origin setup is active.
- Found during: independent DB-free verification after Task 3
- Issue: `absolutePublicUrl` is resolved while importing Didit. The test imported Didit before stubbing `BETTER_AUTH_URL`, causing its callback assertion to receive the ambient localhost default.
- Fix: Reset modules and dynamically import the adapter inside `beforeEach` after environment and fetch stubs are established.
- Verification: `tests/auth/public-origin-callers.test.ts` and `tests/verification/didit-session.test.ts` passed together (17 tests).
- Committed in: `f2b0ad7`

## Issues Encountered

- The plan's default Vitest command could not complete because `tests/global-setup.ts` could not reach `postgresql://fitout:fitout@localhost:5432/fitout_test`. This is an environment preflight failure, not an assertion failure; focused DB-free runs passed.
- Independent DB-free verification exposed a Didit module-import ordering issue; it is corrected in `f2b0ad7` and the combined focused suites are green.
- GSD's RED-evidence parser expects Node's summary format and does not recognize Vitest's nested TAP summary. The named inventory assertions nevertheless failed before implementation and passed after it.

## User Setup Required

None. Production Vercel and provider dashboard configuration remains in the later human-operated plan.

## Next Phase Readiness

Plan 23-03 can configure and prove external domains/providers knowing all refactored runtime public links inherit the shared public-origin authority.

## Self-Check: PASSED

- All 14 plan-owned source/test artifacts exist.
- Commits `b545def`, `7dc8bf0`, `f8c212e`, `64d23f5`, and `f2b0ad7` exist in Git history.
- `git diff --check 32483784b996e1def9a217c5fe31514961779ca9..HEAD` passed.

*Plan: 23-the-support-path-becomes-reachable/23-02 | Status: complete*
