---
phase: 27-app-subdomain-marketing-website
plan: "03"
subsystem: auth
tags: [nextjs, better-auth, capabilities, callbacks, vitest, playwright]
requires:
  - phase: 27-02
    provides: App host routing and issued-link/provider origin continuity
provides:
  - Real-session hosting entry with explicit protected capability activation
  - Checked password/signup/verification/Google hosting return paths
  - Same-tab browser proof for anonymous, booker, host, signup and stale-cookie journeys
affects: [27-04, 27-07, 27-08, 27-09]
tech-stack:
  added: []
  patterns: [read-only intent GET, explicit authenticated activation, checked app callback wrapper]
key-files:
  created:
    - src/app/start-hosting/page.tsx
    - src/components/marketing/hosting-intent.tsx
    - tests/auth/hosting-intent.test.tsx
    - tests/auth/hosting-resume.test.tsx
    - e2e/marketing-journeys.spec.ts
    - .planning/phases/27-app-subdomain-marketing-website/27-03-01-RED.json
    - .planning/phases/27-app-subdomain-marketing-website/27-03-02-RED.json
  modified:
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/signup/page.tsx
    - src/app/actions/auth.ts
    - src/lib/safe-callback-url.ts
    - src/lib/session-check.ts
key-decisions:
  - Hosting resume creates the normal booker account and requires explicit authenticated activation, including server enforcement for modified signup intent.
  - Customer auth returns share safeAppCallbackPath while the existing safeCallbackPath contract remains unchanged.
  - Hosting activation pushes the checked host destination without an immediate refresh; the fresh route fetch reads the new capability.
requirements-completed: []
requirements-addressed: [MKT-03, DOMAIN-02]
coverage:
  - id: D1
    description: Anonymous and existing accounts enter hosting without any GET capability mutation
    requirement: MKT-03
    verification:
      - kind: unit
        ref: tests/auth/hosting-intent.test.tsx
        status: pass
      - kind: e2e
        ref: e2e/marketing-journeys.spec.ts#booker GETs never activate
        status: pass
    human_judgment: false
  - id: D2
    description: Password, signup, issued verification and controlled Google auth returns retain checked hosting intent
    requirement: DOMAIN-02
    verification:
      - kind: integration
        ref: tests/auth/hosting-resume.test.tsx#installed auth hosting returns
        status: pass
      - kind: e2e
        ref: e2e/marketing-journeys.spec.ts#password login and existing cookie resume hosting
        status: pass
    human_judgment: false
actuals:
  tokens: 12281
  tasks: 2
  commits: 4
plan_head_before: a6ab21eb017d2850362af9ed4f0f854b60c6cc63
duration: 24min measured from first RED commit to final GREEN commit; initial reading not timed
completed: 2026-10-09
status: complete
---

# Phase 27 Plan 03: Hosting Intent and Authentication Resume Summary

**A real-session `/start-hosting` entry retains intent through authentication and adds hosting only through the existing protected action after an explicit click.**

## Performance

- First RED commit: 2026-10-08T17:32:07Z; final GREEN: 2026-10-08T17:56:07Z. Measured interval: 24 minutes. Initial required reading preceded the first commit and was not independently timed.
- Two tasks complete; twelve artifacts changed before this summary.
- Actual tokens: 49,122 characters / 4, rounded up, over the realized committed diff of the ten owned source/test files and two RED evidence files. This uses the estimate's scale, not harness usage.
- Four task/test commits measured from persisted `.git/gsd-plan-head-before-27-03`, before the separate summary commit.

## Accomplishments

- `/start-hosting` lives outside the host capability layout. It resolves the actual server session, sends anonymous visitors to `/login?callbackURL=%2Fstart-hosting`, sends existing hosts to `/host`, and renders an explicit action for authenticated nonhosts. Repeated page requests do not call activation or change capabilities.
- The client calls existing `activateHosting` only from its button. Pending disables duplicate activation; action denials and thrown network failures retain the intent and a retry control. The returned destination is checked and restricted to `/host`. The unchanged action still owns authentication, the shared five-attempt/60-second identity budget, audit logging and capability coexistence.
- Login/signup switches, password sign-in, signup completion and Google initiation carry the checked return. Google initiation failures show recoverable feedback and provider error callbacks point back to the same checked auth intent. Existing plain signup keeps its intent choices and server-owned destination.
- Hosting resume signup displays account creation, keeps the existing booker default and sends no client capability flags. The server also maps a hosting return plus modified signup intent to `book`, so this new journey requires the explicit post-auth action. The server forwards a checked optional callback to installed Better Auth for the verification email.
- A real issued verification link returned to `/start-hosting` and persisted email verification while leaving `canHost=false`. A real installed Google initiation created state, and a controlled `access_denied` callback returned to login with hosting intent. These tests perform no Google network exchange or live consent.
- The existing session-check retains the checked callback for valid cookies while preserving the original stale-cookie expiry, one-shot marker, no-store response and unauthenticated login target. Browser proof covers valid and stale cookies.
- Five actual browser journeys prove anonymous app search, anonymous hosting login, repeated booker GETs, explicit activation with persisted `canBook=true` and one successful audit, existing host continuation, signup/account switches and password/stale-cookie resume. Each uses one browser tab, explicit local test data and silent email transport.

## Task Commits

1. Task 27-03-01 RED: `230b6c63` — `test(27-03): cover checked hosting entry and explicit activation`.
2. Task 27-03-01 GREEN: `6f23c9ed` — `feat(27-03): add explicit authenticated hosting entry`.
3. Task 27-03-02 RED: `6188cded` — `test(27-03): cover hosting resume across authentication`.
4. Task 27-03-02 GREEN: `1effd90f` — `feat(27-03): preserve checked hosting intent through auth`.

Summary is committed separately before orchestrator updates shared progress. Executor did not modify STATE.md, ROADMAP.md or REQUIREMENTS.md. All seven phase requirements remain pending their broader engineering/live evidence.

## Verification

Final checks ran sequentially against explicit local `fitout_test`; email/provider transports were mocked or disabled. No production database, payment, payout, deployment or provider registration action occurred.

| Check | Actual result |
|---|---|
| Task 1 intentional RED | Anonymous entry resolved null instead of redirecting; named assertion failed, exit 1; RED_EVIDENCE_OK |
| Task 1 plan verification | Hosting intent + capability activation: 10/10, exit 0 |
| Task 2 intentional RED | Login switch href was `/signup` instead of retaining callback; exit 1; RED_EVIDENCE_OK |
| Task 2 plan verification plus stale-cookie preservation | 38/38, exit 0 |
| Final focused unit/integration check | 48/48 across five files, exit 0; 8.27s Vitest duration |
| Owned Chromium journeys | 5/5, exit 0; 54.3s including server lifecycle |
| Scoped ESLint | Exit 0; one warning on retained signup `form.watch`, zero errors |
| TypeScript `--noEmit` | Exit 0 |
| Owned diff whitespace / commit deletion checks | Passed; no tracked file deletion |

Final focused command:

`node node_modules/vitest/vitest.mjs run tests/auth/hosting-intent.test.tsx tests/auth/capability-activate.test.ts tests/auth/hosting-resume.test.tsx tests/security/safe-callback-url.test.ts tests/auth/stale-session-selfheal.test.ts`

Browser command:

`node node_modules/@playwright/test/cli.js test e2e/marketing-journeys.spec.ts --project=chromium --workers=1`

The final unit process explicitly set TEST_DATABASE_URL, localhost BETTER_AUTH_URL/NEXT_PUBLIC_APP_URL and mock email transport. The browser config supplies the local test database and exact local authorities, with FITOUT_E2E_REAL_EMAIL disabled. The optional Linux-only visual-project policy was preserved; no Windows baseline was generated.

## TDD Gate Compliance

Both tasks have genuine behavior assertion RED evidence, verified by the installed GSD classifier and committed before production GREEN. Task 1's new modules began as minimal importable return-null contracts so test loading could succeed and the missing anonymous redirect failed as an assertion. The GREEN commit completed both modules, and no scaffold remains.

The installed Vitest flat TAP reporter omits footer counts. Evidence retains the actual target output and transparently appends only the actual non-SKIP counts for the GSD Node TAP classifier, following plans 27-01/02. Filter-excluded tests in RED output are not skipped source tests.

## Deviations from Plan

### Rule 1 — hosting navigation refresh race

The initial real browser run and a 15-second diagnostic rerun stayed pending on `/start-hosting` after activation returned HTTP 200. Database activity showed no blocked query and the protected action emitted its allow audit. Removing the immediate `router.refresh()` after `router.push()` made the actual action-to-host journey complete in 3.5–3.9 seconds. The newly fetched host route reads the persisted capability, satisfying the fresh-state purpose of the plan without dispatching a competing refresh. Unit assertions and the browser fixture verify the resulting behavior. Files: `src/components/marketing/hosting-intent.tsx`, `tests/auth/hosting-intent.test.tsx`, `e2e/marketing-journeys.spec.ts`; commit `1effd90f`.

### Rule 1/2 — close required auth resume seams outside the declared file list

Orchestrator authorized three narrow extensions because the original files alone could not satisfy auth resume: `src/lib/session-check.ts` previously redirected every valid cookie to `/`; `src/app/actions/auth.ts` omitted the callback from verification issuance; and `src/lib/safe-callback-url.ts` needed a shared customer-return wrapper rejecting ops/internal-auth paths. Existing callback behavior, signup capability hooks, session-cookie writes/expiry and no-store semantics remain intact. Direct helper regressions, actual issued verification and the controlled installed OAuth callback prove the seams. Commit: `1effd90f`.

### Rule 3 — delegated Git mutations

Executor sandbox treats Git metadata as read-only. The orchestrator performed exactly scoped ledger, staging and commit operations. Existing unrelated dirty work, including `nav-icon-menu.tsx`, remains preserved and unstaged.

### Test harness findings

- The actual jose verification signing path needs Node's typed-array realm in the jsdom component file. Integration setup temporarily installs the Node Uint8Array constructor and restores globals after its isolated schema teardown. No auth implementation or cryptography changed.
- The shared email helper can find the email shell's first URL; verification regression selects the actual verification URL from the captured text body.
- Browser fixture sign-out needed an exact app Origin for installed auth CSRF validation. Its first unchecked request left the account signed in. The corrected fixture asserts HTTP 200 and a null session before testing password login.
- Windows Playwright server teardown remained alive after results. Orchestrator identified each owned Next child process and stopped only those exact PIDs to release the final result. The successful final run prints 5 passed and exits 0.

No authentication gate occurred. No source-level skipped tests or unrun automated plan verification remain. No introduced product stub or undeclared trust boundary was found; callbacks and explicit activation are the declared T-27-08/T-27-09/T-27-10 surfaces.

## Deferred Issues

Scoped lint retains one `react-hooks/incompatible-library` warning on the existing React Hook Form `watch` API in signup. It reports that React Compiler skips memoization, with zero lint errors. No unrelated form refactor was made.

## Next Phase Readiness

Direct app hosting/auth flows are ready for the later marketing CTAs. The browser spec will expand through the actual Hosts/Players pages in plan 27-08 after they exist. Live Google consent/state and authorized callback registration remain plan 27-09 evidence; the controlled installed callback here does not claim live Google approval. Full phase gates remain assigned to plan 27-08.

Verification/bookability, deriveBookable, normal booking coexistence, schema, package inventory and Phase 25.1/26 payment/payout/legal HOLD remain unchanged.

## Self-Check: PASSED

All seven created task/evidence artifacts exist, all four task/test commits exist and no task commit deletes a tracked file. Both planned focused verifications, the final 48-test preservation run, all five real browser journeys, scoped lint, TypeScript and owned diff checks passed. The initial RED scaffold is fully replaced. Canonical summary must be committed before shared state advances.
