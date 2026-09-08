---
phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
plan: 08
subsystem: ops-shell-navigation
tags: [nextjs, better-auth, cross-host-navigation, error-boundary, playwright, vitest, tdd]

requires:
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 12
    provides: Exact-host cloak and proxy rewrite boundaries
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 07
    provides: Protected ops shell and staff-management surface
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    plan: 14
    provides: Host-scoped Better Auth action-dispatch enforcement
provides:
  - Explicit ops sign-out that destroys the host session and confirms completion on `/login?signedOut=1`
  - Absolute configured marketplace-to-ops and ops-to-marketplace exits with separate cookie jars
  - Neutral branded ops error recovery with retry and a safe public-host exit
  - A routable `%5Fops-auth` rewrite target under Next.js 16 private-folder semantics
affects: [20-09, 20-13, ops-auth, ops-shell, marketplace-footer, cross-host-uat]

actuals:
  tokens: 7759
  tasks: 2
  commits: 6
commits: 6
plan_head_before: 810776b9c88b2d45a7196b1674c90a8e17e93a01

tech-stack:
  added: []
  patterns:
    - Server-side sign-out returns a fixed configured destination and a client control performs a full-document host transition
    - Cross-host links are constructed only from validated exact origins, never request headers or callback input
    - Underscore-prefixed rewrite URLs use Next's `%5F` filesystem escape so their routes remain public

key-files:
  created:
    - src/components/ops/ops-sign-out-control.tsx
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-08-TASK-1-RED-EVIDENCE.json
    - .planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-08-TASK-2-RED-EVIDENCE.json
  modified:
    - src/app/(ops)/ops/layout.tsx
    - src/app/(ops)/ops/error.tsx
    - src/app/actions/ops-auth.ts
    - src/lib/app-origins.ts
    - src/components/patterns/site-footer.tsx
    - src/app/(ops-auth)/%5Fops-auth/layout.tsx
    - e2e/ops-auth.spec.ts
    - tests/auth/ops-host-auth.test.ts
    - tests/auth/ops-host-routing.test.ts
    - tests/design/error-boundaries.test.ts
    - tests/design/ops-host-invariants.test.ts
    - tests/design/site-contacts.test.ts

key-decisions:
  - "Ops sign-out returns the exact configured ops login URL, then uses `window.location.assign` so the Proxy reclassifies the destination Host through a full-document request."
  - "The internal `/_ops-auth/**` rewrite target is authored under `%5Fops-auth`, Next.js 16's documented escape for a routable underscore-prefixed URL segment."
  - "The shared footer resolves every product and legal destination from the configured public origin, while `FitOut Ops` alone resolves from the configured ops origin."

requirements-completed: [OPS-07, OPS-08]

coverage:
  - id: D1
    description: "Signed-in staff can sign out explicitly, see the exact session-ended confirmation, and cannot replay the previous session into `/ops`."
    requirement: OPS-07
    verification:
      - kind: e2e
        ref: "e2e/ops-auth.spec.ts#terminates the staff session"
        status: pass
      - kind: integration
        ref: "tests/auth/ops-host-auth.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Marketplace and ops exits use exact configured origins, carry no sensitive query data, and do not authenticate the source identity on the destination host."
    requirement: OPS-08
    verification:
      - kind: e2e
        ref: "e2e/ops-auth.spec.ts#cross-host exits use exact configured origins"
        status: pass
      - kind: integration
        ref: "tests/auth/ops-host-routing.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "The protected error boundary exposes only neutral ops-console recovery copy, retry, digest, and an absolute public-host exit."
    requirement: OPS-07
    verification:
      - kind: design
        ref: "tests/design/error-boundaries.test.ts"
        status: pass
      - kind: e2e
        ref: "e2e/ops-auth.spec.ts#keeps the protected error recovery neutral"
        status: pass
    human_judgment: false

duration: 66 min
completed: 2026-09-08
status: complete
---

# Phase 20 Plan 08: Ops Shell Sign-Out and Cross-Host Navigation Summary

**FitOut Ops now signs staff out conclusively, recovers without leaking authorization context, and offers exact configured exits between the marketplace and ops hosts without sharing sessions.**

## Performance

- **Duration:** 66 min
- **Started:** 2026-09-08T04:58:38Z
- **Completed:** 2026-09-08T06:04:51Z
- **Tasks:** 2
- **Files changed:** 21

## Accomplishments

- Added one touch-sized `Sign out` control to the authenticated ops shell. It destroys the Better Auth session through the existing origin-first Server Function, navigates to the exact configured ops `/login?signedOut=1`, and renders `Staff session ended.`
- Proved in a real browser that replaying the previous cookie cannot reopen `/ops`, while the marketplace-host action-dispatch refusal remains intact.
- Added the shared-footer `FitOut Ops` link and ops-auth `Back to FitOut` link from validated exact origins, with no callback, token, account, cookie, or request-host-derived data.
- Made all marketplace product, wordmark, and legal footer links absolute so rendering the shared footer on the ops host cannot strand an operator inside the ops cookie jar.
- Replaced queue-specific failure wording with the approved neutral `FitOut Ops didn't load` recovery surface, retaining retry, safe public exit, and digest-only support context.
- Corrected the ops-auth rewrite target from Next.js's private `_ops-auth` folder to the documented `%5Fops-auth` escape, making `/login`, password recovery, reset, and invitation routes genuinely reachable on the ops host.

## Task Commits

1. **Task 1 RED — define ops sign-out and recovery shell** — `131489a`
2. **Task 1 GREEN — terminate ops sessions from the shell** — `cc02911`
3. **Task 2 RED — define exact cross-host exits** — `a03f2b4`
4. **Task 2 GREEN — complete exact ops cross-host navigation** — `67fb30a`

## Verification

- System-Chrome Playwright run of `e2e/ops-auth.spec.ts` — **PASS, 4/4**: staff sign-out and stale-cookie refusal, exact bidirectional cross-host exits with anonymous destination sessions, neutral error recovery, and marketplace-host action refusal.
- `OPS_APP_URL=http://ops.localhost:3000 node node_modules/next/dist/bin/next build` after removing stale generated development route types — **PASS**: compile, production route typecheck, 35/35 static pages, and final route manifest all completed; `/_ops-auth/*` is present with no `%5F`/decoded layout mismatch.
- `tests/auth/ops-host-routing.test.ts` plus `tests/auth/ops-host-auth.test.ts` — **PASS, 58/58**, with a clean database leak report.
- `tests/design/error-boundaries.test.ts`, `site-contacts.test.ts`, `auth-contrast.test.ts`, `auth-composition.test.tsx`, and `ops-host-invariants.test.ts` — **PASS, 236 passed / 3 intentionally skipped**.
- `tests/use-server-exports.test.ts` — **PASS, 4/4**.
- Scoped ESLint over every Plan 20-08 implementation and affected test file — **PASS**.
- Both RED evidence artifacts passed `check tdd-red-evidence` with `RED_EVIDENCE_OK`.
- `node node_modules/typescript/bin/tsc --noEmit` — the same nine pre-existing diagnostics remain in `ops-host-routing.test.ts`, `mail-credential-refusal.test.ts`, and `workflow-invariants.test.ts`; **no Plan 20-08 implementation file reports a diagnostic**.
- Package manifests, lockfiles, database schema, and `drizzle/` — **unchanged** from `plan_head_before`.

## TDD Gate Compliance

- **Task 1 RED:** `131489a` records the missing `signOutOpsAction` and the still-present profile affordance as the targeted failures; `20-08-TASK-1-RED-EVIDENCE.json` passed the canonical evidence gate.
- **Task 1 GREEN:** `cc02911` added fixed-origin session termination, the one-control shell, exact signed-out confirmation, and neutral error recovery.
- **Task 2 RED:** `a03f2b4` records the absent `absoluteOpsUrl` helper as the targeted failure; `20-08-TASK-2-RED-EVIDENCE.json` passed the canonical evidence gate.
- **Task 2 GREEN:** `67fb30a` made both cross-host directions absolute, forced sign-out through a fresh Host classification, repaired the ops-auth route target, and made the browser and design gates green.
- **REFACTOR:** No separate refactor commit was needed; the isolated `OpsSignOutControl` and paired origin helpers are the smallest separation that preserves the server-only authority boundary and client-only full-document navigation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Routing Bug] Escaped the private ops-auth source folder**

- **Found during:** Task 1 browser verification
- **Issue:** Next.js 16 treats a leading underscore folder as private and excludes it from routing, so Proxy's `/_ops-auth/login` rewrite resolved to a marketplace 404 instead of the ops sign-in surface.
- **Fix:** Renamed the source segment to `%5Fops-auth`, the installed Next.js documentation's public-route escape for a literal underscore segment, and updated source-inventory tests/imports.
- **Files modified:** `src/app/(ops-auth)/%5Fops-auth/**`, `tests/auth/ops-host-auth.test.ts`, `tests/design/ops-host-invariants.test.ts`, `tests/design/site-contacts.test.ts`
- **Commit:** `67fb30a`

**2. [Rule 1 - Navigation Bug] Forced sign-out through a full-document Host transition**

- **Found during:** Task 1 browser verification
- **Issue:** A Server Action redirect updated the address bar but let the App Router reuse the marketplace route tree behind the host-rewritten `/login` URL.
- **Fix:** Kept session destruction and the fixed destination server-side, returned that destination, and used one client control's `window.location.assign` so Proxy classifies a fresh request by its exact Host.
- **Files modified:** `src/app/actions/ops-auth.ts`, `src/components/ops/ops-sign-out-control.tsx`, `src/app/(ops)/ops/layout.tsx`
- **Commit:** `67fb30a`

**3. [Rule 2 - Regression Coverage] Extended existing design inventories for the Phase 20 contract**

- **Found during:** Task 2 GREEN verification
- **Issue:** The existing error inventory still demanded queue-specific copy and could inspect only literal `href` values; the whole-tree contact scan also had no exclusions for newly routable staff email-input examples.
- **Fix:** Made the error inventory recognize the fixed configured-origin identifier and exact neutral copy, and declared the two staff email examples as input placeholders rather than FitOut contact addresses.
- **Files modified:** `tests/design/error-boundaries.test.ts`, `tests/design/site-contacts.test.ts`
- **Commit:** `67fb30a`

**4. [Rule 3 - Blocking] Used checked-in tool entrypoints and installed system Chrome**

- **Found during:** Plan verification
- **Issue:** The workstation's `npx` shim points at a missing npm installation and Playwright's bundled Chromium executable is absent.
- **Fix:** Invoked checked-in Vitest, ESLint, TypeScript, and Playwright entrypoints through Node and ran the browser suite with the already-installed system Chrome; no package was installed and the temporary config/logs were removed.
- **Files modified:** None

**5. [Rule 3 - Generated Cache] Removed conflicting development route types before the production build**

- **Found during:** Wave 10 production build follow-up
- **Issue:** `.next/dev/types` retained a development `LayoutRoutes` key of `/%5Fops-auth`, while the production generator correctly decoded the filesystem escape to `/_ops-auth`; TypeScript loaded both ignored generated trees and rejected the mixed route union.
- **Fix:** Confirmed the installed Next.js 16.2.7 documentation requires `%5F` for a public underscore-prefixed source segment, removed only the verified generated `.next/dev/types` directory, and reran the production build without changing source routing.
- **Files modified:** None; `.next/dev/types` is ignored generated output.

## Known Stubs

None. The existing `TODO(next@16.3)` in the error boundary documents a future framework API rename; the current `reset` implementation is complete for installed Next.js 16.2.7. Existing guarded support/legal placeholder commentary is unchanged and does not add an ops-shell stub.

## Threat Review

- `T-20-08-01` and `T-20-08-04`: both cross-host destinations and the sign-out destination come from validated configured origins plus fixed paths; no request Host, callback, or caller-supplied redirect is accepted.
- `T-20-08-02`: Better Auth session destruction precedes navigation, and the browser test proves the captured prior cookie receives the cloaked 404 on `/ops`.
- `T-20-08-03`: the error DOM carries neutral console copy, retry, fixed public exit, and digest only; source and browser assertions ban stack, path, role, account, and authorization classification.
- `T-20-08-05`: browser assertions prove both exit URLs have empty query strings and destination session lookups remain anonymous.
- No new endpoint, schema change, dependency, migration, or unplanned trust boundary was introduced.

## Self-Check: PASSED

- All created and moved source/evidence files exist at their final paths.
- Commits `131489a`, `cc02911`, `a03f2b4`, and `67fb30a` exist in history.
- The measured ledger base is `810776b9c88b2d45a7196b1674c90a8e17e93a01`; four plan commits precede this summary.
