---
phase: 27-app-subdomain-marketing-website
plan: "02"
subsystem: auth
tags: [better-auth, origins, proxy, email, paymongo, didit, inngest, vitest]
requires:
  - phase: 27-01
    provides: Checked purpose-specific origins, app compatibility aliases and exact host routing
provides:
  - Narrow issued-token apex bridges with checked callback destinations
  - Fresh app sign-in restart for old Google OAuth callbacks
  - Actual metadata, transactional-email and provider-return continuity regressions
  - Direct both-host receiver contracts retaining signatures and payment authority
affects: [27-03, 27-07, 27-08, 27-09]
tech-stack:
  added: []
  patterns: [Pure legacy-auth decision before apex route policy, explicit app-origin consumers, host-only auth restart]
key-files:
  created:
    - src/lib/legacy-auth-links.ts
    - tests/auth/legacy-auth-links.test.ts
    - tests/auth/app-origin-continuity.test.ts
    - tests/auth/service-origin-continuity.test.ts
    - .planning/phases/27-app-subdomain-marketing-website/27-02-01-RED.json
  modified:
    - src/lib/auth.ts
    - src/proxy.ts
    - src/app/layout.tsx
    - src/lib/email.ts
    - src/lib/verification/providers/didit.ts
    - src/app/actions/booking.ts
    - tests/auth/public-origin-callers.test.ts
key-decisions:
  - Only exact GET/HEAD issued verify/reset endpoints bridge; apex auth mutations remain denied.
  - Old Google code/state/error are discarded because host-only state requires fresh app sign-in.
  - Production and exact-preview metadata/email retain application authority and isolated ops invitations.
  - Browser return query flags have no payment-confirm authority; direct receivers retain their own verification.
requirements-completed: []
requirements-addressed: [DOMAIN-01, DOMAIN-02]
coverage:
  - id: A1
    description: Real issued verification/reset tokens, unchanged token content, expiry and checked legacy callbacks
    requirement: DOMAIN-02
    verification:
      - kind: integration
        ref: tests/auth/legacy-auth-links.test.ts
        status: pass
    human_judgment: false
  - id: A2
    description: Actual app/preview metadata and rendered emails, sender/Reply-To and ops invitation isolation
    requirement: DOMAIN-01
    verification:
      - kind: unit
        ref: tests/auth/app-origin-continuity.test.ts
        status: pass
    human_judgment: false
  - id: A3
    description: Real provider return constructors, pending booking on forged paid return, direct signed receivers
    requirement: DOMAIN-02
    verification:
      - kind: integration
        ref: tests/auth/service-origin-continuity.test.ts
        status: pass
    human_judgment: false
actuals:
  tokens: 9215
  tasks: 3
  commits: 6
plan_head_before: 91740fb41b257f769c9a5d24abc8a926912c3c07
duration: 10m34s RED-artifact-to-task-completion interval; initial reading additional
completed: 2026-10-09
status: complete
---

# Phase 27 Plan 02: Authentication and Service Origin Continuity Summary

**Issued apex auth tokens reach app handlers with checked callbacks; old OAuth restarts safely, and actual emails, metadata, checkout/verification returns and direct signed receivers retain their contracts.**

## Performance

- First persisted RED evidence: 2026-10-08T17:14:04Z.
- All six task commits verified: 2026-10-08T17:24:38Z; measured interval 10m34s. Initial required reading preceded the persisted artifact; total dispatch time was not recorded and is not invented.
- Tasks: 3/3. Twelve artifacts changed before this summary.
- Actual tokens: 36,859 characters / 4, rounded up, over the realized committed diff including regression/evidence artifacts. This uses the estimate's scale, not harness token usage.
- Six task/test commits measured from the persisted `.git/gsd-plan-head-before-27-02` ledger before the separate summary commit.

## Accomplishments

- Added a pure exact legacy auth decision consumed by Proxy before general marketing denial. Only GET/HEAD verification tokens, reset token-path links and reset UI token links bridge. Tokens retain their value. Old same-apex callbacks become checked app-relative destinations; relative callbacks remain checked. Reject external, protocol-relative, credential-bearing, control-character, encoded control/ops and ambiguous callback/token values. Unknown auth APIs and mutations remain denied.
- Old Google callbacks redirect to app `/login?moved=1`, preserving only an independently checked callback destination. Code, state and provider errors never replay on another host. Existing exact app/ops/preview allowlists, `trustedProxyHeaders:false` and host-only cookies remain intact; auth fallback explicitly names APP_ORIGIN.
- Root metadata and transactional email explicitly name APP_ORIGIN. Runtime imports prove configured app and exact-preview metadata bases and real rendered booking/reset/decline email URLs. Compatibility aliases retain app group, notification/reminder, support/legal caller ownership; ops invitation bodies retain ops. Existing sender and SUPPORT_EMAIL Reply-To remain unchanged, and development transport remains a development fallback.
- Didit's actual mocked session request uses app `/host/verify`. The real checkout action, bound to an isolated test schema and mocked PayMongo, produces `/bookings/{holdId}?paid=1` and `/listings/{listingId}/book?hold={holdId}`. A forged paid-return query merely redirects; the persisted booking remains pending with no payment ID.
- Requests pass Proxy directly to the actual PayMongo/Didit handlers on app and apex. Correct signatures over deliberately spaced raw bytes reach payload parsing; absent signatures are denied. Actual Inngest cloud-mode GET/HEAD/POST/in-band PUT are direct and deny unsigned requests. Network spy confirms no external registration occurs. Existing signature/deduplication suites and real ops host-auth checks also pass.
- Retained legacy payout return/refresh routing without reviving retired payout-connect or changing money-release flags, deriveBookable, authorization, legal content, schema or service registration.

## Task Commits

1. Task 27-02-01 RED: `459f0665` — `test(27-02): cover issued apex tokens and OAuth restart`.
2. Task 27-02-01 GREEN: `e7092e74` — `feat(27-02): bridge issued auth links and restart old OAuth`.
3. Task 27-02-02 test-first existing GREEN: `8b37bb7b` — `test(27-02): preserve actual app email and metadata origins`.
4. Task 27-02-02 explicit consumers: `c1d66726` — `refactor(27-02): name app origin in metadata and transactional email`.
5. Task 27-02-03 test-first existing GREEN: `f33fc29d` — `test(27-02): preserve real provider returns and signed receiver continuity`.
6. Task 27-02-03 explicit constructors: `2a9bd864` — `refactor(27-02): use explicit app browser return URLs`.

Summary is committed separately before orchestrator updates shared progress. Executor did not modify STATE.md, ROADMAP.md or REQUIREMENTS.md; all phase requirement completion remains pending wider engineering/live evidence.

## Verification

All commands ran sequentially using the existing local `fitout_test` database and mocked email/providers. No production DB, external mail, payment or registration calls occurred.

| Check | Actual result |
|---|---|
| Task 1 intentional RED | Named bridge assertion returned 404 versus required 307; exit 1; `RED_EVIDENCE_OK` |
| Task 1 legacy token / safe callback / ops routing | 65/65 tests, 3 files, exit 0; 3.25s Vitest duration |
| Task 2 metadata / caller inventory / email fallback | 15/15 tests, 3 files, exit 0 before and after explicit imports; final 887ms Vitest duration |
| Task 3 service / marketing policy | 91/91 tests, 2 files, exit 0 before explicit helper changes |
| Final service / marketing / caller / PayMongo signature / Didit webhook / ops host-auth | 156/156 tests, 6 files, exit 0; 7.07s Vitest duration |
| Scoped ESLint at each task | Exit 0 |
| `node node_modules/typescript/bin/tsc --noEmit` | Exit 0 |
| Owned `git diff --check` | Passed |
| Task commit deletion scan | No deletions |

Plan commands:

`node node_modules/vitest/vitest.mjs run tests/auth/legacy-auth-links.test.ts tests/security/safe-callback-url.test.ts tests/auth/ops-host-routing.test.ts`

`node node_modules/vitest/vitest.mjs run tests/auth/app-origin-continuity.test.ts tests/auth/public-origin-callers.test.ts tests/auth/email-dev-fallback.test.ts`

`node node_modules/vitest/vitest.mjs run tests/auth/service-origin-continuity.test.ts tests/auth/marketing-host-routing.test.ts`

The test process explicitly supplies local TEST_DATABASE_URL and a mock RESEND_API_KEY. Existing older transport tests change BETTER_AUTH_URL independently, so NEXT_PUBLIC_APP_URL is blank at invocation; individual continuity cases set both exact matching values. MARKETING_APP_URL is an explicit distinct test authority.

## TDD Gate Compliance

Task 1 follows an intentional assertion RED, verified evidence and RED commit before production GREEN. `27-02-01-RED.json` retains real flat TAP output. The installed Vitest flat reporter omits Node TAP footer counts; the documented adapter appends only actual non-SKIP target counts for the installed GSD classifier, as in 27-01. No failure was invented.

Investigation showed tasks 2 and 3 already meet their runtime behavior through 27-01's app-directed compatibility aliases. Their new runtime regressions pass before edits; tests were committed before the minimal purpose-name refactors. No artificial RED or behavior change is claimed for these tasks. No optional refactor beyond the requested explicit origin seams was needed.

## Deviations from Plan

### Rule 3 — existing caller contract accepts either canonical app helper

The previously owned caller-inventory test structurally required the spelling `absolutePublicUrl(`. Switching Didit to the planned `absoluteAppUrl` would fail this obsolete structural expectation while preserving the runtime contract. With orchestrator authorization, the three caller loops now accept either app helper and retain assertions against env/literal origin duplication. Files: `tests/auth/public-origin-callers.test.ts`; commit `2a9bd864`.

### Rule 3 — narrow delegated Git mutations

Executor sandbox treats Git metadata as read-only. The orchestrator performed the exact ledger, staging and commit operations. `src/app/actions/booking.ts` had unrelated dirty baseline edits: its cached patch contained only the app-helper import and two return-constructor replacements. Orchestrator inspected the staged patch; all baseline work remains unstaged and preserved.

### Reused existing routing policy

No host-route-policy edit was necessary: the new pure token/OAuth decision executes before that policy, while all other apex denials and direct receiver methods remain the existing exact matrix. No schema/package install was required.

### Test harness findings

- Installed Better Auth signup verification without callback returns 200 `{status:true}`, rather than 302; the assertion checks that actual response and the persisted `email_verified` flag. Expired JWT/stored reset tokens remain rejected.
- Real Inngest cloud-mode handlers require signatures even for GET/HEAD; the installed Next adapter maps HEAD through GET. All unsigned methods return 401. In-band PUT and a network spy ensure these tests cannot register an external application.
- Provider mock was made partial so real Inngest function registration can import existing settlement readers without invoking them. No receiver or payout implementation changed.

No authentication gate occurred. No source-level skipped tests or unrun automated plan verification remain. No newly introduced product stub or unmodeled threat surface was found; bearer-link bridging is the declared T-27-04/T-27-05 surface.

## Next Phase Readiness

Live Google authorized origins/callback registration, provider receiver/dashboard inventory, deployment/DNS cutover, received-email evidence and actual old/new browser accounts remain pending plan 27-08/09. These tests prove engineering continuity only. Apex sessions do not migrate to app; users must restart sign-in, with ops cookies remaining separate.

Phase 25.1/26 financial/legal HOLD remains unchanged. No deployment, external registration or financial event was performed.

## Self-Check: PASSED

Verified all five created artifacts exist on disk and all six task/test commits exist. Each automated plan command ran and passed. Final relevant preservation suites, lint, TypeScript and owned diff checks passed. No task commit deletes a tracked file; unrelated booking baseline edits remain preserved. Canonical summary must be committed before shared state advances.
