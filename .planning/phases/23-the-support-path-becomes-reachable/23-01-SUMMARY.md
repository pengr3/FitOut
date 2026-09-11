---
phase: 23-the-support-path-becomes-reachable
plan: 01
subsystem: auth/email/infra/testing
tags: [resend, reply-to, preview, vercel, better-auth, metadata]
requires:
  - phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa
    provides: exact public/ops host isolation and auth routing
provides:
  - sole monitored support owner and singleton Reply-To
  - exact Preview/canonical origin resolution and metadata authority
  - focused source and regression coverage for support guards, transport, and origins
affects: [23-02, 23-03, STATE-05, TRUST-01]
actuals:
  tokens: 18000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns:
    - singleton email transport Reply-To sourced from the site support owner
    - exact VERCEL_URL Preview fallback with fail-closed Vercel public-origin configuration
key-files:
  created: []
  modified:
    - src/lib/site.ts
    - src/lib/email.ts
    - src/lib/app-origins.ts
    - src/app/layout.tsx
    - src/app/(ops)/ops/error.tsx
    - .env.example
    - tests/auth/email-dev-fallback.test.ts
    - tests/auth/secret-config.test.ts
    - tests/design/site-contacts.test.ts
    - tests/design/scaffold-residue.test.ts
key-decisions:
  - The monitored launch address is declared once in site.ts; a future dedicated inbox replaces that declaration without changing transport call sites.
  - Preview derives its public authority from the exact HTTPS VERCEL_URL when explicit public URL variables are absent; Vercel deployments without a usable public authority fail closed.
  - The ops error client uses a valid configured public URL when available and the browser's current origin otherwise, avoiding a production localhost fallback.
patterns-established:
  - Keep support ownership centralized and feed it into the sole Resend send payload.
  - Resolve public, ops, and Preview authorities through app-origins.ts so auth, metadata, and absolute URLs share the same policy.
requirements-completed: [STATE-05, TRUST-01]
coverage:
  - id: D1
    description: Support ownership and Reply-To are centralized and the support path remains in the guarded-site inventory.
    requirement: STATE-05
    verification:
      - kind: unit
        ref: tests/auth/email-dev-fallback.test.ts
        status: pass
      - kind: unit
        ref: tests/design/site-contacts.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Preview origin resolution is exact, HTTPS-only, and fail-closed on unusable Vercel configuration.
    requirement: TRUST-01
    verification:
      - kind: unit
        ref: tests/auth/secret-config.test.ts
        status: pass
      - kind: unit
        ref: tests/design/scaffold-residue.test.ts
        status: pass
    human_judgment: false
  - id: D3
    description: Metadata and ops error fallback consume public origin policy without a production localhost fallback.
    requirement: TRUST-01
    verification:
      - kind: lint
        ref: targeted ESLint over all changed source and test files
        status: pass
      - kind: check
        ref: git diff --check
        status: pass
    human_judgment: false
duration: 20 min
completed: 2026-09-11T08:57:05Z
status: complete
---

# Plan 23-01 Summary

Connected the support path to one monitored launch inbox and made Preview/public-origin authority explicit across email, auth, metadata, absolute URLs, and ops error handling.

## Performance

- Tasks completed: 2/2
- Production commits: 2
- New dependencies: none
- Database migrations: none

## Accomplishments

- Set `pengr.clmc.3@gmail.com` as the centralized support owner and added it as `replyTo` on the sole Resend payload.
- Added the support-path component to the guarded-site inventory and updated environment guidance for server-only email credentials and production sender configuration.
- Resolved Preview public authority from the exact HTTPS `VERCEL_URL` when explicit public URL configuration is absent.
- Failed closed for Vercel deployments that have no usable public authority, while preserving local development fallback behavior.
- Routed metadata and ops error fallback through the shared public-origin policy.
- Added focused regression coverage for Reply-To behavior, Preview auth/origin resolution, metadata, invalid Preview configuration, and scaffold residue.

## Task Commits

1. `0fd6440` — `feat(23-01): connect support inbox to email transport`
2. `6634074` — `feat(23-01): make preview origin resolution explicit`

## Files

- `src/lib/site.ts` — centralized support owner.
- `src/lib/email.ts` — singleton Resend Reply-To and shared public URL.
- `src/lib/app-origins.ts` — canonical, ops, and Preview origin policy.
- `src/app/layout.tsx` — metadata base from shared public origin.
- `src/app/(ops)/ops/error.tsx` — configured/browser-origin fallback.
- `.env.example` — server-only credential and production sender guidance.
- `tests/auth/email-dev-fallback.test.ts` — Reply-To regression coverage.
- `tests/auth/secret-config.test.ts` — Preview origin and fail-closed coverage.
- `tests/design/site-contacts.test.ts` — support-path guard coverage.
- `tests/design/scaffold-residue.test.ts` — Preview metadata coverage.

## Deviations

None from the requested implementation scope. The production implementation introduced no new dependency or migration.

## Issues Encountered

- The main Vitest configuration could not start because its mandatory Postgres preflight could not reach `localhost:5432`; Docker was unavailable. The auth/origin tests were rerun successfully with a temporary DB-free config, which was deleted afterward.
- Full TypeScript checking remains red on pre-existing errors in generated `.next` route types and unrelated test files; no changed source file introduced a reported error.

## User Setup Required

None for this plan. Live Vercel/Resend/provider configuration and delivery/reply proof remain part of the later 23-03 checkpoints.

## Next Phase Readiness

Plan 23-01 is complete. Plan 23-02 can build on the shared public-origin resolver. Plan 23-03 still requires the human deployment and live email verification checkpoints.

*Plan: 23-the-support-path-becomes-reachable/23-01 | Status: complete*
