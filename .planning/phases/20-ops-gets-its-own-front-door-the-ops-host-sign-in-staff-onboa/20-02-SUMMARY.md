---
phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
plan: 02
subsystem: routing
tags: [nextjs, proxy, host-partition, not-found, vitest, tdd]

requires:
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 01
    provides: Next.js 16 src/proxy.ts convention and named proxy export
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 10
    provides: Proxy-aware security commentary and regression contracts
provides:
  - Validated public and ops origin authority with exact hostname classification
  - Explicit public, preview, unknown, and ops Host/path routing matrix
  - One top-level pre-stream cloak target for every denied route cell
affects: [20-03, 20-06, 20-08, 20-09, 20-11, 20-12, ops-host-auth]

actuals:
  tokens: 5312
  tasks: 2
  commits: 4
commits: 4
plan_head_before: 40f9d5c27ae45ab1f68b0d8914045b92e4629287

tech-stack:
  added: []
  patterns:
    - Exact configured Host classification selects a surface but never authorizes a caller
    - Denied host/path cells rewrite to one top-level page that calls root notFound before JSX

key-files:
  created:
    - src/lib/app-origins.ts
    - src/app/_ops-cloak/page.tsx
    - tests/auth/ops-host-routing.test.ts
    - tests/design/ops-host-invariants.test.ts
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-02-TASK-1-RED-EVIDENCE.json
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-02-TASK-2-RED-EVIDENCE.json
  modified:
    - src/proxy.ts
    - .env.example

key-decisions:
  - "Unknown and non-allowlisted preview hosts retain the marketplace surface but can never reach /ops or internal ops-auth routes."
  - "OPS_APP_URL is server-only, exact, and mandatory in production; local development receives only the explicit ops.localhost fallback."
  - "The widened all-route Proxy matcher uses explicit pass cells and keeps authorization in the existing layout, page, and action guards."

patterns-established:
  - "Host authority: parse configured URL origins once, compare normalized hostnames exactly, and admit only the exact VERCEL_URL preview hostname as public."
  - "Cloak convergence: public /ops, direct internal auth paths, and ops-host out-of-surface paths all rewrite to /_ops-cloak."

requirements-completed: [OPS-07, OPS-12]

coverage:
  - id: D1
    description: "Only the exact configured ops host receives visible ops auth rewrites and the protected ops segment; public, preview, unknown, forged, and missing hosts cannot become ops."
    requirement: OPS-07
    verification:
      - kind: integration
        ref: "tests/auth/ops-host-routing.test.ts#OPS-07 exact host authority and explicit host/path route matrix"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every denied route cell converges on one pre-stream root-notFound target without changing root 404 bytes or weakening the three-layer staff guard."
    requirement: OPS-12
    verification:
      - kind: integration
        ref: "tests/design/ops-host-invariants.test.ts#OPS-12 exact host partition invariants"
        status: pass
      - kind: integration
        ref: "tests/design/ops-guard-coverage.test.ts"
        status: pass
    human_judgment: false

duration: 18 min
completed: 2026-09-08
status: complete
---

# Phase 20 Plan 02: Exact Ops Host Partition and Cloak Summary

**Exact configured Host routing now exposes the ops console/auth surface only on the dedicated origin and converges every denial on one pre-stream root-404 target.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-07T21:33:00Z
- **Completed:** 2026-09-07T21:51:24Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added one validated origin authority that parses the public and server-only ops origins, normalizes optional request ports, and classifies only exact public, exact preview, exact ops, or unknown hostnames.
- Expanded `src/proxy.ts` into an explicit all-route matrix: visible ops auth paths rewrite internally, required ops/assets/auth API traffic passes, and protected/internal denials cloak without any auth or database import.
- Added a top-level `/_ops-cloak` page whose first and only operation is root `notFound()`, while pinning the unchanged root 404 bytes, empty scoped-404 census, and existing layout/page/action authorization layers.

## Task Commits

Each task followed an intentional RED → GREEN cycle:

1. **Task 1 RED: Define the exact ops Host route matrix** - `cac705c` (test)
2. **Task 1 GREEN: Partition public and ops hosts exactly** - `03a5965` (feat)
3. **Task 2 RED: Require one pre-stream ops cloak** - `c315b63` (test)
4. **Task 2 GREEN: Add the shared pre-stream ops cloak** - `5153752` (feat)

## Files Created/Modified

- `src/lib/app-origins.ts` - Validates configured origins and exposes exact Host classification plus absolute public URL construction.
- `.env.example` - Documents the server-only exact `OPS_APP_URL` and local `ops.localhost` setup.
- `src/proxy.ts` - Applies the exact Host/path matrix, internal auth rewrites, shared cloak rewrite, and preserved marketplace `_sc` flow.
- `src/app/_ops-cloak/page.tsx` - Calls root `notFound()` before any renderable output.
- `tests/auth/ops-host-routing.test.ts` - Exercises 36 exact-host, port, case, preview, forged, missing, adjacency, asset, auth API, rewrite, and `_sc` cases.
- `tests/design/ops-host-invariants.test.ts` - Pins the non-empty internal route census, root 404 hash, no scoped 404 files, Proxy import boundary, and three authorization layers.
- `20-02-TASK-1-RED-EVIDENCE.json` / `20-02-TASK-2-RED-EVIDENCE.json` - Record both machine-verified intentional RED outcomes.

## Decisions Made

- Treated unknown hosts as marketplace/public for ordinary routes while cloaking `/ops` and `/_ops-auth`; this fails closed for privileged surface selection without breaking ordinary requests behind an unrecognized local or deployment hostname.
- Required `OPS_APP_URL` under `NODE_ENV=production`, while allowing only `http://ops.localhost:3000` as the non-production fallback. A deployment cannot silently promote a guessed or wildcard hostname into ops.
- Allowed the internal cloak path itself to continue after rewrite so Next can execute its single root `notFound()` call; direct visits reveal only that same 404 target.
- Enumerated required public assets and framework/auth API segments rather than using a permissive file-extension wildcard.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used the checked-in Vitest entrypoint after the machine's npx shim was known broken**

- **Found during:** Task 1 RED verification
- **Issue:** The local `npx` shim targets a missing npm installation, as already measured in Plan 20-01; invoking it would fail before test discovery.
- **Fix:** Ran the exact checked-in Vitest 4.1.8 entrypoint with Node for every focused command, without installing or changing dependencies.
- **Files modified:** None
- **Verification:** Task 1 passed 36/36, Task 2 design invariants passed 5/5, and the existing ops guard suite passed 15/15.
- **Committed in:** No file change required

---

**Total deviations:** 1 auto-fixed blocking environment issue.  
**Impact on plan:** Only the executable path changed; test configuration, versions, behavior, and implementation scope were unchanged.

## Issues Encountered

- The first draft of the Task 2 design gate searched raw source text for authorization symbols and matched explanatory comments. It was corrected before RED evidence was accepted to inspect TypeScript identifiers instead; the valid RED then failed only on the absent cloak page.

## TDD Gate Compliance

- **Task 1 RED:** `cac705c` precedes implementation, touches the focused test, and `check tdd-red-evidence` returned `RED_EVIDENCE_OK` for `routes ops login`.
- **Task 1 GREEN:** `03a5965` follows RED and passes the 36-case route/authority suite.
- **Task 2 RED:** `c315b63` precedes implementation, touches the design test, and `check tdd-red-evidence` returned `RED_EVIDENCE_OK` for the pre-stream cloak assertion.
- **Task 2 GREEN:** `5153752` follows RED and passes both the new cloak invariants and the existing authorization-layer gate.
- **REFACTOR:** Not needed; the implemented partition and one-operation cloak are already the smallest clear forms satisfying the contracts.

## Known Stubs

None. Empty arrays, strings, and nulls found by the scan are exercised test fixtures or parser branches, not UI data placeholders.

## Threat Flags

None. The new Host boundary, Proxy rewrite boundary, asset-pass surface, and 404 response surface are the planned T-20-04 through T-20-07 mitigations and introduce no unmodeled trust boundary.

## User Setup Required

- Production deployments must set `OPS_APP_URL` to the exact dedicated ops origin before building or starting the application.
- Local development may use the documented `http://ops.localhost:3000` value.

## Next Phase Readiness

- Plans 20-03, 20-06, and 20-12 can add auth and invitation targets under `/_ops-auth`; their visible paths are already isolated to the exact ops host.
- Plan 20-11 can now perform the first production status/header/body-hash reading against the shared cloak candidate.

## Self-Check: PASSED

- All eight created/modified deliverable and evidence files exist in their expected locations.
- RED/GREEN commits `cac705c`, `03a5965`, `c315b63`, and `5153752` are present in Git history.
- Both focused suites and the inherited three-layer guard suite report non-zero passing tests.

---
*Phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa*
*Completed: 2026-09-08*
