---
phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
plan: 03
subsystem: auth
tags: [better-auth, dynamic-base-url, trusted-origins, host-only-cookies, vitest, tdd]

requires:
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 02
    provides: exact public, preview, and ops origin authority
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 11
    provides: production-proven host partition and authenticated ops response gateway
provides:
  - One Better Auth instance with exact request-host URL resolution and public fallback
  - Exact public, preview, and ops trusted-origin enforcement
  - Host-only session cookies and next-request role revocation proof
affects: [20-12, 20-14, ops-auth, staff-session-security]

actuals:
  tokens: 6210
  tasks: 1
  commits: 3
commits: 3
plan_head_before: 4f346cb35a82422babecffce4432bf0a7b366716

tech-stack:
  added: []
  patterns:
    - Better Auth dynamic base URLs consume exact configured authorities with a bounded public fallback
    - Dynamic auth ignores caller-supplied forwarding headers and retains browser host-only cookie scope

key-files:
  created:
    - tests/auth/ops-host-auth.test.ts
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-03-RED-EVIDENCE.json
  modified:
    - src/lib/auth.ts
    - src/lib/app-origins.ts
    - src/lib/session-check.ts
    - tests/design/ops-host-invariants.test.ts
    - tests/helpers/auth.ts
    - tests/auth/ops-role.test.ts
    - tests/auth/secret-config.test.ts

key-decisions:
  - "Use exact URL authorities, never wildcard patterns, for Better Auth allowedHosts and trustedOrigins."
  - "Set trustedProxyHeaders:false so an untrusted x-forwarded-host cannot override the exact incoming Host authority."
  - "Build stale-session get-session requests from the incoming request authority because a dynamic Better Auth root context has no single string baseURL."

patterns-established:
  - "Auth host authority: public, exact preview, and ops requests select their own base URL; unknown hosts can only fall back to public."
  - "Session isolation: omit both advanced.crossSubDomainCookies and session.cookieCache, with executable and source-structure gates for each."

requirements-completed: [OPS-08]

coverage:
  - id: D1
    description: "One Better Auth instance resolves URLs from exact public, preview, or ops hosts and rejects forged origin trust without leaking configured origins."
    requirement: OPS-08
    verification:
      - kind: integration
        ref: "tests/auth/ops-host-auth.test.ts#OPS-08 Better Auth exact-host authority"
        status: pass
      - kind: integration
        ref: "node node_modules/next/dist/bin/next build with OPS_APP_URL=http://ops.localhost:3000"
        status: pass
    human_judgment: false
  - id: D2
    description: "Public and ops sessions remain browser host-only in both directions and a role revoke is visible on the next request."
    requirement: OPS-08
    verification:
      - kind: integration
        ref: "tests/auth/ops-host-auth.test.ts#OPS-08 host-only sessions"
        status: pass
      - kind: integration
        ref: "node node_modules/vitest/vitest.mjs run tests/auth (268 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Build-blocking design gates reject wildcard host configuration, cross-subdomain cookies, or session cookie caching."
    requirement: OPS-08
    verification:
      - kind: integration
        ref: "tests/design/ops-host-invariants.test.ts#pins one exact dynamic Better Auth origin authority with host-only uncached sessions"
        status: pass
    human_judgment: false

duration: 27 min
completed: 2026-09-08
status: complete
---

# Phase 20 Plan 03: Exact Better Auth Host Isolation Summary

**One Better Auth instance now mints auth URLs only for exact public, preview, or ops authorities while host-only cookies and uncached role reads keep both session jars isolated.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-09-07T23:44:49Z
- **Completed:** 2026-09-08T00:11:19Z
- **Tasks:** 1
- **Files modified:** 9

## Accomplishments

- Replaced the static Better Auth base URL with the installed 1.6.14 dynamic `{ allowedHosts, fallback, protocol }` form over exact configured public, preview, and ops authorities.
- Added exact trusted origins and disabled trusted proxy-header authority so a forged Host or `x-forwarded-host` cannot mint an ops URL.
- Proved session cookies carry no Domain attribute, independent host-only jars do not cross, and grant followed by revoke changes the next session read because cookie cache remains absent.
- Preserved stale-session recovery after the root auth context stopped owning one static base URL.

## Task Commits

The TDD task was committed atomically:

1. **RED — define exact auth host isolation** - `bcab4d9` (test)
2. **GREEN — isolate auth by exact request host** - `4154e57` (feat)
3. **Regression fix — preserve dynamic host in session checks** - `086174b` (fix)

## Files Created/Modified

- `src/lib/app-origins.ts` - Exposes deduplicated exact auth authorities and trusted origins, including the one configured preview host.
- `src/lib/auth.ts` - Configures dynamic base URL resolution, exact trusted origins, and untrusted proxy-header refusal without enabling cross-host cookies or session cache.
- `src/lib/session-check.ts` - Builds the authoritative get-session request from the incoming request authority.
- `tests/auth/ops-host-auth.test.ts` - Exercises allowed/forged/forwarded hosts, trusted-origin rejection, host-only jars, and next-request revocation.
- `tests/design/ops-host-invariants.test.ts` - Pins the one dynamic auth instance and forbidden cookie/cache settings structurally.
- `tests/helpers/auth.ts` - Lets security-boundary tests explicitly enable Better Auth origin checks under `NODE_ENV=test`.
- `tests/auth/ops-role.test.ts` - Reads the dynamic configuration's public fallback rather than coercing the object into a URL.
- `tests/auth/secret-config.test.ts` - Updates the existing WR-03 contract for exact dynamic hosts and origins.

## Decisions Made

- Used the exact `.host` authorities from validated URLs because Better Auth 1.6.14 compares the incoming Host, including a configured port, against `allowedHosts`.
- Chose `protocol: "auto"` with `trustedProxyHeaders: false`; the Request supplies its protocol, while caller-supplied forwarding headers cannot select authority.
- Included the exact `VERCEL_URL` preview origin in both allowed hosts and trusted origins, but never a `*.vercel.app` wildcard.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated string-baseURL test seams for the dynamic configuration**

- **Found during:** Task 1 GREEN regression verification
- **Issue:** `ops-role.test.ts` coerced `auth.options.baseURL` into a URL string, and the existing WR-03 test still required the retired static value.
- **Fix:** Resolve the dynamic configuration's explicit public fallback in the handler fixture and assert the full exact host/origin configuration in WR-03.
- **Files modified:** `tests/auth/ops-role.test.ts`, `tests/auth/secret-config.test.ts`, `tests/helpers/auth.ts`
- **Verification:** 24 focused auth tests passed; the complete auth set passed 268/268.
- **Committed in:** `4154e57`

**2. [Rule 1 - Bug] Preserved stale-session recovery with dynamic auth context**

- **Found during:** Full `tests/auth` regression run after GREEN
- **Issue:** `sessionCheckResponse` read `$context.baseURL` as a string, but dynamic Better Auth stores unresolved configuration there; its get-session URL became invalid and the helper degraded every request to signed-out behavior.
- **Fix:** Construct `/api/auth/get-session` from the incoming request URL and copy its exact Host when the Request headers do not already carry one.
- **Files modified:** `src/lib/session-check.ts`
- **Verification:** Both stale-session suites passed 12/12 and the complete auth set passed 268/268.
- **Committed in:** `086174b`

**3. [Rule 3 - Blocking] Used the checked-in Vitest entrypoint**

- **Found during:** RED and verification
- **Issue:** Prior Phase 20 plans proved the local `npx` shim points to a missing npm installation.
- **Fix:** Ran the exact installed Vitest 4.1.8 binary through Node for every planned command; no dependency changed.
- **Files modified:** None
- **Verification:** Focused auth 9/9, design 6/6, and broader auth 268/268 all passed.
- **Committed in:** No file change required

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking environment issue).  
**Impact on plan:** Both bug fixes were required consequences of the dynamic base URL change; no new dependency, schema, route, or auth instance was introduced.

## Issues Encountered

- The first production build could not fetch Google Fonts inside the network sandbox. The approved network-enabled run compiled, then correctly failed closed because `OPS_APP_URL` was absent. Re-running with the documented local `OPS_APP_URL=http://ops.localhost:3000` completed the full Next.js 16.2.7 production build.
- `tsc --noEmit` still reports seven diagnostics already recorded by Plan 20-10 and two `Response`/`NextResponse` diagnostics in Plan 20-02's `ops-host-routing.test.ts`. Both are outside this plan and are recorded in `deferred-items.md`; Plan 20-03's own diagnostics were fixed.

## TDD Gate Compliance

- **RED:** `bcab4d9` precedes implementation and `20-03-RED-EVIDENCE.json` returns `RED_EVIDENCE_OK` for the static-to-dynamic base URL assertion.
- **GREEN:** `4154e57` follows RED and passes the focused auth and design suites.
- **REFACTOR:** Not needed; one small directly caused regression fix followed as `086174b`, with the full auth suite green.

## Known Stubs

None. Empty strings, arrays, objects, and nulls found by the scan are exercised parser/session test cases or initialized accumulators, not UI or production-data placeholders.

## User Setup Required

- Production and preview deployments must provide the exact server-only `OPS_APP_URL` documented in `.env.example`; builds fail closed when it is absent.
- `VERCEL_URL`, when present, is accepted only as that one exact preview authority.

## Next Phase Readiness

- Plan 20-12 can build the ops-auth UI on request-resolved reset/sign-in URLs without sharing marketplace cookies.
- Plan 20-14 can add the mutation-origin guard on top of exact Better Auth origin trust.
- No blocker remains for dependent Phase 20 plans.

## Self-Check: PASSED

- All seven primary deliverable/evidence/summary files exist in their expected final state.
- RED, GREEN, and regression-fix commits `bcab4d9`, `4154e57`, and `086174b` are present in Git history.
- `src/lib/auth.ts` contains the only `betterAuth(` call under `src/`; package manifests and `drizzle/` are unchanged from `plan_head_before`.
- Focused auth and design suites, the complete auth suite, scoped ESLint, and the production Next.js build all passed.

---
*Phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa*
*Completed: 2026-09-08*
