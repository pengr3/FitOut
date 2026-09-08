---
phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
plan: 05
subsystem: ops-authentication
tags: [postgres, drizzle, better-auth, resend, sha256, advisory-lock, vitest, tdd]

requires:
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 04
    provides: Transaction-aware writeRole authority and staff-only account policy
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 03
    provides: Better Auth credential sessions and exact-host ops authentication
provides:
  - Hash-only verification-row staff invitations with database-clock 24-hour expiry
  - Conflict-safe issue, resend, cancel, inspect, and exactly-once acceptance domain operations
  - Atomic Better Auth credential creation, staff grant, and nonsecret invitation audit history
  - Ops-origin staff invitation delivery with credential-safe failure handling
affects: [20-06, 20-07, ops-staff-management, staff-onboarding, ops-auth]

actuals:
  tokens: 10584
  tasks: 2
  commits: 5
commits: 5
plan_head_before: a19bd210ac4b79d951e71fbcef1b0d8345ed8dd9

tech-stack:
  added: []
  patterns:
    - Deterministic email-scoped verification row with random bearer token stored only as SHA-256
    - Advisory lock plus conditional mutation RETURNING as the authority for every invitation race
    - Better Auth public hashPassword plus credential account shape verified by real sign-in

key-files:
  created:
    - src/lib/validation/ops-staff.ts
    - src/lib/ops/invitations.ts
    - tests/ops/staff-invitation.test.ts
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-05-TASK-1-RED-EVIDENCE.json
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-05-TASK-2-RED-EVIDENCE.json
  modified:
    - src/lib/email.ts
    - tests/helpers/email-fixtures.ts
    - tests/auth/email-dev-fallback.test.ts

key-decisions:
  - "The verification row id is a deterministic SHA-256 of normalized email, while the identifier is a separate SHA-256 of the random raw bearer token; neither durable key contains PII or the credential."
  - "A returned conditional INSERT/UPDATE/DELETE row is the only mutation-success signal, with one transaction-scoped advisory lock shared by lifecycle and acceptance operations."
  - "Staff invitation delivery never uses the legacy token-bearing development console fallback; missing transport leaves the durable row pending and emits only a generic diagnostic."

patterns-established:
  - "Invitation history: active state lives only in verification; issue/resend/cancel/expiry/acceptance history lives in immutable PII-free audit rows."
  - "Invitation acceptance: read candidate, hash outside the lock window, lock by server-derived row id, DELETE RETURNING once, then create user/account/grant/audits in one transaction."

requirements-completed: [OPS-09, OPS-11]

coverage:
  - id: D1
    description: "A normalized email has at most one hash-only active invitation, expiring at exactly 24 database hours, with conflict-safe resend and cancel."
    requirement: OPS-09
    verification:
      - kind: integration
        ref: "tests/ops/staff-invitation.test.ts#staff invitation issue, resend, cancel, conflict, and delivery"
        status: pass
    human_judgment: false
  - id: D2
    description: "Inspection is read-only and every missing, malformed, expired, cancelled, used, or unknown credential maps to one inactive state."
    requirement: OPS-09
    verification:
      - kind: integration
        ref: "tests/ops/staff-invitation.test.ts#inspection is read-only"
        status: pass
    human_judgment: false
  - id: D3
    description: "One live invitation creates exactly one verified staff-only Better Auth credential, with concurrent losers inactive and forced failures fully rolled back."
    requirement: OPS-09
    verification:
      - kind: integration
        ref: "tests/ops/staff-invitation.test.ts#inspect, accept, concurrent, and inactive staff invitations"
        status: pass
    human_judgment: false
  - id: D4
    description: "Existing staff and marketplace identities are never converted by invitation issue or acceptance."
    requirement: OPS-11
    verification:
      - kind: integration
        ref: "tests/ops/staff-invitation.test.ts#conflict cases"
        status: pass
      - kind: integration
        ref: "tests/ops/staff-policy.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Raw invitation credentials and recipient PII remain absent from persistence, audit metadata, provider-error logs, and development fallback logs."
    requirement: OPS-09
    verification:
      - kind: unit
        ref: "tests/auth/email-dev-fallback.test.ts#never logs a staff invitation bearer credential"
        status: pass
      - kind: unit
        ref: "tests/auth/email-injection.test.ts#sendStaffInviteEmail"
        status: pass
    human_judgment: false

duration: 13 min
completed: 2026-09-08
status: complete
---

# Phase 20 Plan 05: Staff Invitation Lifecycle Summary

**Hash-only 24-hour staff invitations now rotate and consume exactly once into verified Better Auth credentials, with transactional role/audit integrity and credential-safe email delivery.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-08T01:00:30Z
- **Completed:** 2026-09-08T01:13:13Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Implemented normalized, deterministic email-scoped invitation storage using the existing `verification` table, SHA-256 token digests, versioned metadata, database-clock expiry, and no schema work.
- Made Invite, Resend, Cancel, and Accept race-safe through transaction advisory locks and conditional returned-row mutations; stale operations cannot reactivate or consume a newer credential.
- Created complete Better Auth credential identities atomically with verified email, `canBook=false`, `canHost=false`, transaction-aware `writeRole`, and both role/invitation audit events.
- Added a Resend-backed ops-host invitation sender whose provider and development failure paths retain pending state without logging recipient PII or the bearer credential.

## Task Commits

1. **Task 1 RED — invitation lifecycle contract** — `a7231fc` (test)
2. **Task 1 GREEN — issue, resend, cancel, delivery, and inspection** — `5857be9` (feat)
3. **Task 2 RED — exactly-once acceptance contract** — `1b3a1f2` (test)
4. **Task 2 GREEN — atomic Better Auth identity creation** — `0172f3a` (feat)
5. **Security correction — suppress development credential logs** — `3fe65c8` (fix)

## Files Created/Modified

- `src/lib/validation/ops-staff.ts` — Normalized issue input and bounded acceptance credential schema.
- `src/lib/ops/invitations.ts` — Complete invitation state machine, conflict policy, audit writes, and atomic acceptance.
- `src/lib/email.ts` — Typed delivery result and ops-origin staff invitation sender with credential-safe diagnostics.
- `tests/ops/staff-invitation.test.ts` — Real-database lifecycle, race, disclosure, sign-in, conflict, and rollback coverage.
- `tests/helpers/email-fixtures.ts` — Exhaustive sender fixture for staff invitation rendering/injection coverage.
- `tests/auth/email-dev-fallback.test.ts` — Staff bearer-token and recipient-log regression coverage.
- `20-05-TASK-1-RED-EVIDENCE.json` / `20-05-TASK-2-RED-EVIDENCE.json` — Machine-validated intentional RED outcomes.

## Decisions Made

- Used separate deterministic hashes for the email-scoped row id and random-token identifier. The raw email remains only in versioned verification value metadata while active; neither key nor any audit metadata contains PII.
- Used each operation's conditional returned row as authority. Pre-lock reads provide candidates and diagnostics only; they never authorize a mutation.
- Reused Better Auth's installed public `hashPassword` export and its `credential` account shape, then proved compatibility by signing in through the real existing email/password path.
- Kept provider delivery after database commit. A failure returns `pending-delivery-failed`, preserving the invitation for explicit operator retry instead of rolling back a valid credential or silently losing it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added explicit SQL text typing for JSON metadata parameters**

- **Found during:** Task 1 GREEN
- **Issue:** PostgreSQL could not infer two parameter types inside `json_build_object`, so the initial insert failed before persistence.
- **Fix:** Cast email and inviter parameters to `text` at the JSON construction boundary.
- **Files modified:** `src/lib/ops/invitations.ts`
- **Verification:** All 13 invitation tests pass against the real isolated Postgres schema.
- **Committed in:** `5857be9`

**2. [Rule 2 - Missing Critical] Extended exhaustive email coverage for the new sender**

- **Found during:** Task 1 GREEN
- **Issue:** The repository intentionally makes an exported sender without an injection fixture a type/test failure.
- **Fix:** Added the ops-origin call fixture and incremented the asserted sender census to 21.
- **Files modified:** `tests/helpers/email-fixtures.ts`
- **Verification:** The complete 166-case email injection matrix passes, including `sendStaffInviteEmail`.
- **Committed in:** `5857be9`

**3. [Rule 2 - Security] Disabled token-bearing development fallback for staff invitations**

- **Found during:** Final threat-surface scan
- **Issue:** The established development transport fallback logs full public-auth email bodies; reusing it unchanged would put an elevation-bearing staff credential in terminal logs.
- **Fix:** Added a per-send opt-out used only by staff invitations. Missing transport now returns delivery failure and logs one generic message without recipient or token.
- **Files modified:** `src/lib/email.ts`, `tests/auth/email-dev-fallback.test.ts`
- **Verification:** Five related suites pass 190/190; the new regression directly asserts no recipient or bearer token appears in either console channel.
- **Committed in:** `3fe65c8`

**4. [Rule 1 - Test Bug] Decoupled rollback proof from Drizzle's wrapper error text**

- **Found during:** Task 2 GREEN
- **Issue:** Drizzle correctly propagated the forced trigger failure but wrapped the PostgreSQL cause in its query message, so an exact provider-message assertion failed before the rollback assertions ran.
- **Fix:** Asserted rejection without coupling to adapter-specific wrapper text, retaining all post-failure database-state checks.
- **Files modified:** `tests/ops/staff-invitation.test.ts`
- **Verification:** The forced final-audit failure leaves the invitation and removes user, account, role grant, and intermediate audits.
- **Committed in:** `0172f3a`

---

**Total deviations:** 4 auto-fixed (2 bugs, 2 missing-critical/security).  
**Impact on plan:** All corrections were necessary for correctness, repository coverage, or credential secrecy; there was no schema, dependency, route, or feature-scope expansion.

## Issues Encountered

- Repository-wide TypeScript still exits non-zero on the nine pre-existing diagnostics already recorded by Plans 20-10, 20-03, and 20-04: two `Response`/`NextResponse` mismatches in `tests/auth/ops-host-routing.test.ts` and seven Node typing diagnostics in `tests/design/mail-credential-refusal.test.ts` / `tests/design/workflow-invariants.test.ts`. No diagnostic names a Plan 20-05 file; scoped ESLint passes cleanly.
- The plan's `npx` commands were executed through their checked-in `node_modules` entrypoints, matching prior Phase 20 execution and avoiding package resolution or installation. No manifest or lockfile changed.

## TDD Gate Compliance

- **Task 1 RED:** `a7231fc`; `20-05-TASK-1-RED-EVIDENCE.json` returned `RED_EVIDENCE_OK` with 0/7 lifecycle assertions passing against the initial stub.
- **Task 1 GREEN:** `5857be9`; lifecycle plus email regression suites passed 175 assertions with acceptance cases still explicitly skipped.
- **Task 2 RED:** `1b3a1f2`; `20-05-TASK-2-RED-EVIDENCE.json` returned `RED_EVIDENCE_OK`, with the target acceptance, concurrent acceptance, conflict consumption, and rollback cases failing for the intended missing behavior.
- **Task 2 GREEN:** `0172f3a`; all 13 invitation cases passed, including real Better Auth sign-in and two-client races.
- **Security correction:** `3fe65c8`; final related verification passed 190/190 with no skipped tests.

## Gate Results

| Gate | Result |
|---|---|
| Full staff invitation suite | **PASS — 13/13** |
| Task 1 focused command | **PASS — 8 selected / 0 failed** |
| Task 2 focused command | **PASS — 8 selected / 0 failed** |
| Invitation + staff policy + email regression suites | **PASS — 190/190** |
| Scoped ESLint over all plan-owned source/tests | **PASS — 0 errors, 0 warnings** |
| Package, lockfile, schema, and `drizzle/` diff from `plan_head_before` | **empty — zero dependencies, zero migrations** |
| Repository-wide TypeScript | **Known baseline failure only — 9 pre-existing diagnostics, 0 in Plan 20-05 files** |

## Known Stubs

None. No placeholder return, TODO, FIXME, skipped test, empty UI data source, or inactive-list surrogate remains in any Plan 20-05 artifact.

## User Setup Required

None. The implementation uses the project's existing `RESEND_API_KEY`, `EMAIL_FROM`, and `OPS_APP_URL` configuration; delivery failure remains an explicit retryable pending state.

## Next Phase Readiness

- Plan 20-06 can bind public GET inspection and POST acceptance directly to the typed domain operations without accepting an email or row id from the client.
- Plan 20-07 can bind authenticated roster actions to stable `{ id, version }` references for resend/cancel and receive deterministic stale outcomes.
- No Plan 20-05 blocker remains.

## Self-Check: PASSED

- All six claimed created artifacts and three modified artifacts exist.
- All five task/TDD/security commits exist after `plan_head_before` in the required RED-before-GREEN order.
- Coverage classification accepts all five deliverables as fully automated and passing.
- The full invitation suite, both focused commands, the 190-assertion regression set, scoped ESLint, and the zero schema/dependency diff were re-run successfully.
- No unexpected deletion, new dependency, migration, raw-token persistence/log path, skipped test, or goal-blocking stub was introduced.

---
*Phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa*
*Completed: 2026-09-08*
