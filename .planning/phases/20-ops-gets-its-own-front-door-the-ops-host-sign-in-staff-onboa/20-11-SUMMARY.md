---
phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
plan: 11
subsystem: ops-routing-security
tags: [nextjs, route-handler, proxy, hmac, auth, cloak, production-probe, tdd]

requires:
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 02
    provides: Exact public/ops host partition and pre-stream cloak routing
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 14
    provides: Staff/nonstaff/signed-out production cloak measurement pattern
provides:
  - Non-vacuous partition/final production cloak probe with deterministic evidence validation
  - Authenticated Node response gateway that owns one constant 404 before staff routing
  - Dated next-start partition reading with staff 200 and four byte-identical denial controls
affects: [20-03, 20-06, 20-08, 20-09, ops-auth, ops-routing, production-verification]

actuals:
  tokens: 12575
  tasks: 2
  commits: 8
commits: 8
plan_head_before: c289f7308cbe4e88352d7182a56ec27b8fec5c7e

tech-stack:
  added: []
  patterns:
    - Route Handler returns one literal 404 body before any denied request reaches a React render tree
    - HMAC-signed server-to-server handoff lets Proxy route inward without importing auth or database code
    - Production probe records only host/path/actor/status/selected headers/length/SHA-256 facts

key-files:
  created:
    - scripts/verify-ops-cloak.mjs
    - tests/auth/ops-cloak-probe.test.ts
    - tests/auth/ops-response-gateway.test.ts
    - src/app/(ops-gateway)/ops-gateway/route.ts
    - src/lib/ops/gateway-handoff.ts
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-EVIDENCE.md
  modified:
    - src/proxy.ts
    - tests/auth/ops-host-routing.test.ts
    - src/app/api/paymongo/webhook/route.ts
    - src/app/api/didit/webhook/route.ts

key-decisions:
  - "Next 16.2.7 emits route-state-dependent Flight bytes for matched notFound() versus an unrouted 404, so OPS-12 is enforced by one authenticated Node response gateway rather than by weakening the raw-byte assertion."
  - "Proxy remains session/database-free: it verifies only a server-issued HMAC handoff and the existing layout, page, and actions still make every authoritative staff decision."
  - "The gateway re-authenticates the exact ops-host /ops request, terminates every other source in one constant body, and forwards staff GET/HEAD/POST requests through the original guards."

requirements-completed: [OPS-07, OPS-12]
status: complete
completed: 2026-09-08
duration: 73m
---

# Phase 20 Plan 11: Production Ops Cloak Reading Summary

**A production-tested Node response gateway now gives marketplace, nonstaff, signed-out, and nonexistent ops probes one identical 308-byte 404 while authenticated staff still reaches the existing guarded `/ops` page with 200.**

## Performance

- **Duration:** 73 minutes
- **Started:** 2026-09-08 06:10 PHT
- **Completed:** 2026-09-08 07:23 PHT
- **Tasks:** 2
- **Files changed:** 13

## Accomplishments

- Built a non-empty, stage-aware production probe whose validator rejects missing controls, wrong status lines, invalid origins, unsafe evidence, and unequal raw denial bodies.
- Preserved the auth/database-free Proxy boundary while adding a Node response gateway that authenticates on the server and retains the existing layout/page/action authorization layers as defense in depth.
- Measured the exact production partition under Next.js 16.2.7 and `next start`: staff `/ops` returned 200; marketplace `/ops`, ops missing, ops nonstaff, and ops signed-out returned 404 with 308 bytes and SHA-256 `0710ff5f877d3ed512b393f7f9f4da7b131310249e68a391d224c77210f2915b`.
- Updated the PayMongo and Didit webhook matcher comments only; executable webhook behavior is unchanged.
- Added zero runtime dependencies and zero schema migrations.

## Task Commits

1. **Task 1 RED: production cloak probe contract** — `9f4eced`
2. **Task 1 GREEN: production cloak probe and webhook comment corrections** — `d1dff14`
3. **Task 2 RED: immediate evidence requirement** — `6372b0a`
4. **Task 2 probe correction: actual URL authorities** — `42641e6`
5. **Task 2 gateway RED: constant response and staff pass-through contract** — `4ff5ba2`
6. **Task 2 gateway GREEN: authenticated response gateway** — `591a631`
7. **Task 2 production fix: preserved ops authority and stripped router control headers** — `3018021`
8. **Task 2 production evidence** — `ea60d98`

## TDD Gate Compliance

- **RED 1:** `20-11-RED-EVIDENCE.json` records 0/9 passing before the probe existed; `tdd-red-evidence` returned `RED_EVIDENCE_OK`.
- **GREEN 1:** the probe contract passed 9/9 with deterministic sorting, mutation failures, redaction, and stage validation.
- **RED 2:** `20-11-TASK-2-RED-EVIDENCE.json` records the evidence-presence case as the sole intentional failure before the production reading.
- **RED 3:** `20-11-GATEWAY-RED-EVIDENCE.json` records 0/4 passing before the approved Node gateway existed; `tdd-red-evidence` returned `RED_EVIDENCE_OK`.
- **GREEN 2:** gateway unit/routing suites passed 40/40; the complete focused auth set passed 58/58 and the two design suites passed 20/20.
- **REFACTOR:** private middleware response headers are stripped, the inward URL authority is reconstructed from the already-classified Host header, and both production findings are pinned in the gateway test.

## Production Evidence

- `node scripts/verify-ops-cloak.mjs --check-evidence .../20-EVIDENCE.md --stage partition` — PASS, 8 deterministic rows.
- Direct `next build` — PASS on Next.js 16.2.7, 32/32 static pages and a compiled dynamic `/ops-gateway` Route Handler.
- `next start -p 3100` probe — PASS with independent staff/nonstaff/signed-out sessions created only for the measurement and deleted in the runner's `finally` block.
- Scoped ESLint over all Plan 20-11 source/test files — PASS.
- The repository's `npm run build` wrapper was not a meaningful plan-scope signal because the user's untracked `.codex/` and `.gsd/` tooling trees are traversed by the unscoped `eslint` command and contain unrelated CommonJS diagnostics; the production Next build and scoped lint both passed.

## Deviations from Plan

### Approved Architectural Change

**1. [Rule 4 - Architecture] Added an authenticated Node response gateway for the raw-byte cloak**

- **Found during:** Task 2 production probe
- **Issue:** Next.js 16.2.7 produced a 25,970-byte matched-layout `notFound()` body and a 29,644-byte unrouted/static 404 body. A follow-up rewrite spike equalized the length but not the final Flight-record ordering; installed Next source also explicitly rejects `NextResponse.rewrite()` from an App Route Handler.
- **Decision:** The user/orchestrator approved a bounded Node gateway spike with no dependencies or migrations, while keeping Proxy free of session/database access and preserving OPS-12.
- **Implementation:** All visible `/ops` requests first reach one Node Route Handler. It authenticates only exact ops-host `/ops`; all other sources receive one literal response. Staff is forwarded inward with an HMAC integrity header and is rechecked by the existing layout/page/action guards.
- **Files modified:** `src/proxy.ts`, `src/app/(ops-gateway)/ops-gateway/route.ts`, `src/lib/ops/gateway-handoff.ts`, gateway/routing tests
- **Commits:** `4ff5ba2`, `591a631`, `3018021`

### Auto-fixed Issues

**2. [Rule 1 - Bug] Removed Next middleware control headers from the Route Handler response**

- **Found during:** Production gateway spike
- **Issue:** Forwarding `x-middleware-rewrite`/`x-middleware-next` through the gateway makes Next 16.2.7 reject the App Route Handler response.
- **Fix:** Strip router-only control headers before constructing the outward response; retain ordinary response and cookie headers.
- **Files modified:** `src/app/(ops-gateway)/ops-gateway/route.ts`, `tests/auth/ops-response-gateway.test.ts`
- **Commit:** `3018021`

**3. [Rule 1 - Bug] Reconstructed the inward ops authority after Proxy rewrite**

- **Found during:** Production gateway spike
- **Issue:** The rewritten Route Handler URL carried the listening/public authority even though the original Host header remained `ops.localhost`; a relative self-fetch re-entered the public partition and returned the constant 404 to staff.
- **Fix:** Build the inward URL from the already-classified Host header (and validated forwarded protocol), then prove the mismatch in the unit test.
- **Files modified:** `src/app/(ops-gateway)/ops-gateway/route.ts`, `tests/auth/ops-response-gateway.test.ts`
- **Commit:** `3018021`

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: authenticated-route-gateway | `src/app/(ops-gateway)/ops-gateway/route.ts` | New Node trust boundary authenticates the exact ops-host source before returning either constant denial bytes or a guarded inward response. |
| threat_flag: internal-self-fetch | `src/lib/ops/gateway-handoff.ts` | Server-to-server `/ops` pass-through is HMAC-bound to method/path with the existing production auth secret; Proxy verifies integrity but never reads a session or database row. |

## Known Stubs

None. The constant 404 is the production denial response required by OPS-12, not placeholder UI.

## Decisions Made

- Keep response-byte convergence in one Node gateway because React/Flight not-found payloads are route-state-dependent in the installed framework.
- Keep Proxy auth/database-free and preserve all existing authoritative staff guards; the HMAC is only an integrity check for the inward server hop.
- Preserve the partition reading for Plan 20-09 to append its final-stage census rather than overwriting it.

## Next Phase Readiness

- Plan 20-03 and later ops-auth routes can build on an already-proven host partition and constant-response cloak.
- Plan 20-09 can extend `requiredControls("final")` and append `Final cloak reading` to the same evidence file.
- The gateway intentionally supports POST so existing Server Actions continue through their own `requireStaff()` gates.

## Self-Check: PASSED

- All seven primary created/modified artifacts exist.
- All eight measured task commits are present in history.
- No dependency or `drizzle/` schema diff exists from `plan_head_before` through the final task commit.
- No TODO, FIXME, placeholder, or skipped-test stub was introduced in the plan-owned source/test files.
