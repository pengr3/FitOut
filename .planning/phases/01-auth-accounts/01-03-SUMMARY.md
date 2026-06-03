---
phase: 01-auth-accounts
plan: 03
subsystem: auth
tags: [nextjs, react-hook-form, zod, better-auth, server-actions, middleware, playwright, e2e, google-oauth, password-reset, sessions]

# Dependency graph
requires:
  - phase: 01-02
    provides: Better Auth server instance (auth.api.signUpEmail/signInEmail/requestPasswordReset/resetPassword/getSession), authClient (signIn.email/signIn.social/requestPasswordReset/resetPassword), shared Zod schemas (signup/login/requestReset/reset), input:false capability flags, 30d sliding sessions, revokeSessionsOnPasswordReset, applied migration
  - phase: 01-01
    provides: Next 16 scaffold, shadcn/ui form primitives, Vitest+Playwright harness, isolated-schema test DB, Resend/Cloudinary/Google mocks
provides:
  - Logged-out auth surface — (auth) route group with signup, login, forgot-password, reset-password pages (RHF + shared Zod, client-validated then server-revalidated)
  - signup server action (src/app/actions/auth.ts) — re-validates signupSchema, creates user via auth.api.signUpEmail, sets canBook/canHost SERVER-SIDE from intent (input:false guard, D-02/T-03-01), returns book->"/" vs host->"/host" redirect target (D-05)
  - Optimistic middleware (src/middleware.ts) — getSessionCookie-based redirect off /login,/signup (NOT the security boundary)
  - E2E proof of session persistence across browser restart + full password-reset flow; integration proof of capability-at-signup + OAuth-verified
  - A durable fix for the broken @better-auth/kysely-adapter transitive dep so the app builds AND runs (next dev + next build)
affects: [01-04-profile-capabilities, all-phases-2-8]

# Tech tracking
tech-stack:
  added:
    - "No new runtime deps — consumes Plan 01/02 stack (RHF, @hookform/resolvers/zod, better-auth, shadcn/ui)"
    - "scripts/patch-kysely-adapter.mjs (postinstall) — patches an unused, broken transitive dependency"
  patterns:
    - "Logged-out pages are client components: RHF + zodResolver(sharedSchema) for UX validation; the SAME schema re-validates in the server action / Better Auth re-checks server-side (client never trusted)"
    - "Capability flags are set ONLY server-side after signUpEmail via a privileged db.update (canBook/canHost are input:false; intent maps to exactly one flag) — the D-02 entry point and T-03-01 mitigation"
    - "Server action returns a {ok, redirectTo|error} result rather than throwing redirect(), so the client can show inline errors and navigate after the cookie is set"
    - "useSearchParams() (reset token, ?reset=1 notice) is wrapped in <Suspense> per App Router requirement"
    - "E2E reset-token capture: read the newest 'reset-password:<token>' row from the verification table (dev console-log/email is the manual-only path); real email delivery stays out of CI"
    - "Anti-enumeration: forgot-password always shows a uniform 'if an account exists' message; login shows a generic 'invalid email or password'"

key-files:
  created:
    - src/app/(auth)/layout.tsx
    - src/app/(auth)/signup/page.tsx
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/forgot-password/page.tsx
    - src/app/(auth)/reset-password/page.tsx
    - src/app/actions/auth.ts
    - src/middleware.ts
    - tests/auth/signup.test.ts
    - tests/auth/capability-signup.test.ts
    - tests/auth/oauth-verified.test.ts
    - e2e/login-persistence.spec.ts
    - e2e/password-reset.spec.ts
    - scripts/patch-kysely-adapter.mjs
  modified:
    - package.json (postinstall -> patch-kysely-adapter)
    - next.config.ts (explanatory comment only)

key-decisions:
  - "Capability set via a privileged Drizzle db.update on the user row AFTER auth.api.signUpEmail (not a special auth.api path) — the mechanism 01-02-SUMMARY documents as 'capability flips go through a privileged server action, not client input'."
  - "Redirect targets (D-05 routing): intent 'book' -> '/', intent 'host' -> '/host'. The /host route group does not exist yet (Plan 04/Phase 2); the action returns the target string and the client navigates — a 404 on /host until that surface lands is expected and intentional."
  - "Reset form binds to the shared resetSchema (field name `password`) and passes it to authClient.resetPassword as `newPassword` (the API's param name). resetSchema also carries the `token` (seeded from the URL) so client-side validation matches the server contract."
  - "Kept src/middleware.ts despite Next 16's 'rename to proxy' deprecation warning — the plan's interfaces/acceptance criteria mandate src/middleware.ts + getSessionCookie, and it functions correctly (shown as 'Proxy (Middleware)' in the build output). Migration to proxy.ts is a trivial future rename."

patterns-established:
  - "Pattern: client form -> server action re-validate (shared Zod) -> auth.api.* -> privileged flag set. The thin trusted glue every auth-bearing form follows."
  - "Pattern: E2E auth assertions read /api/auth/get-session (authoritative) rather than scraping UI, since the home page is not yet auth-aware."

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

# Metrics
duration: 18min
completed: 2026-06-03
---

# Phase 1 Plan 03: Logged-Out Auth UX Summary

**The complete logged-out auth surface — a (auth) route group (signup with book/host intent, login, forgot/reset-password) wired to Better Auth via RHF + shared-Zod forms that re-validate server-side, a signup server action that sets canBook/canHost server-side from intent (input:false guard), and optimistic middleware — proven by E2E session-persistence + password-reset flows and integration tests for capability-at-signup and OAuth-verified.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-06-03T09:40:13Z
- **Completed:** 2026-06-03T09:58:40Z
- **Tasks:** 3 auto tasks complete (plan is autonomous:true — ran end to end, no human checkpoint)
- **Files modified:** 15 (13 created + package.json/next.config.ts) across four commits

## Accomplishments
- Built the entire logged-out auth UX as a `(auth)` route group with a shared centered card layout: **signup** (email/password/firstName + a book-vs-host **intent** choice + Google button), **login** (email/password + Google + "Forgot password?"), **forgot-password** (enumeration-safe request), and **reset-password** (reads `?token=`, sets a new password).
- Wired the **signup server action**: re-validates with `signupSchema`, creates the user via `auth.api.signUpEmail` (`name`/`firstName` = first name), then sets **exactly one** capability flag SERVER-SIDE (`intent "host"` -> `canHost`, `"book"` -> `canBook`) via a privileged `db.update` — honoring D-02 and the `input:false` privilege-escalation guard (T-03-01). Booker signups route to `/`, host signups to `/host` (D-05 — flag only, no Stripe onboarding here).
- Added **optimistic middleware** (`getSessionCookie` redirect off `/login`,`/signup`) with an explicit comment that it is NOT the security boundary (real checks are per-page `auth.api.getSession()`).
- Proved the high-value behaviors: **E2E** session-persistence across a simulated browser restart (AUTH-02/D-12) and the full **forgot -> reset -> login-with-new-password** flow (AUTH-03); **integration** tests for signup + soft-gate sign-in (AUTH-01), intent->capability mapping (AUTH-04/D-02), and Google-arrives-verified (D-08). Full suite: **25/25 vitest + 2/2 Playwright** green; `tsc --noEmit` clean; `next build` clean.
- Fixed a **blocking** broken transitive dependency (`@better-auth/kysely-adapter` vs `kysely@0.29`) that 500'd every route and broke `next build` — the first time the app was actually served. Durable, behavior-preserving patch wired to `postinstall`.

## Task Commits

Each task was committed atomically:

1. **Task 1: signup/login pages + (auth) layout + signup server action + optimistic middleware** — `615ac76` (feat)
2. **Task 2: forgot-password + reset-password flow** — `822cc85` (feat)
3. **Blocking fix: patch @better-auth/kysely-adapter** — `0d7bd32` (fix) _(deviation, see below)_
4. **Task 3: E2E + integration tests** — `61da6db` (test)

**Plan metadata:** committed separately (docs: complete plan).

_TDD note (Task 3, tdd="true"): the implementation under test (signup action, auth config) was authored in Tasks 1–2 and Plan 02, so a classic test-first RED commit was not applicable. The five suites are genuine regression guards — `capability-signup` asserts both the host and book mappings (a no-op capability set fails it); `oauth-verified` asserts `emailVerified=true` via Better Auth's own provider mapping; the E2E specs go red if persistence/reset break. The companion `capability-escalation.test.ts` (Plan 02) proves the client cannot smuggle the flag. See TDD Gate Compliance below._

## Files Created/Modified
- `src/app/(auth)/layout.tsx` — centered card layout for the logged-out surface (presentational only).
- `src/app/(auth)/signup/page.tsx` — RHF + signupSchema; book/host intent radiogroup; Google sign-in; calls the signup server action.
- `src/app/(auth)/login/page.tsx` — RHF + loginSchema; email/pw + Google; generic non-enumerating error; "Forgot password?" link; "password updated" notice on `?reset=1`.
- `src/app/(auth)/forgot-password/page.tsx` — RHF + requestResetSchema; `requestPasswordReset({ redirectTo: "/reset-password" })`; uniform enumeration-safe message.
- `src/app/(auth)/reset-password/page.tsx` — reads `?token=` (useSearchParams + Suspense); RHF + resetSchema; `resetPassword({ newPassword, token })`; redirects to `/login?reset=1`.
- `src/app/actions/auth.ts` — `"use server"` signup action: re-validates signupSchema, creates user, sets capability server-side from intent.
- `src/middleware.ts` — optimistic getSessionCookie redirect (NOT the security boundary).
- `tests/auth/signup.test.ts`, `tests/auth/capability-signup.test.ts`, `tests/auth/oauth-verified.test.ts` — integration suites.
- `e2e/login-persistence.spec.ts`, `e2e/password-reset.spec.ts` — E2E suites.
- `scripts/patch-kysely-adapter.mjs` — postinstall patch for the broken transitive dep.
- `package.json` — added `postinstall` script. `next.config.ts` — explanatory comment only.

## Decisions Made
- **Capability-set mechanism:** privileged `db.update(user).set({ canHost|canBook: true })` after `signUpEmail`, exactly as 01-02-SUMMARY prescribes. The flags are `input:false`, so they are never passed in the signup body (a smuggled `canHost` is silently stripped — proven by Plan 02's escalation test).
- **D-05 redirect targets:** `book -> "/"`, `host -> "/host"`. `/host` is built in a later plan; until then a host signup lands on a 404 — acceptable and intended (the capability flag is the load-bearing outcome here, not the destination page).
- **resetSchema field naming:** the shared schema's field is `password`; it is passed to `authClient.resetPassword` as `newPassword`. The `token` is part of the schema (seeded from the URL) so client validation mirrors the server contract.
- **Middleware vs proxy:** kept `src/middleware.ts` (+ `getSessionCookie`) as the plan mandates, despite a Next 16 deprecation nudge toward `proxy.ts`. It works; renaming is a trivial future follow-up.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Patched broken @better-auth/kysely-adapter so the app builds and runs**
- **Found during:** Task 3 (first time the app was actually served — Plans 01/02 only ran tests, never `next dev`/`next build`).
- **Issue:** `@better-auth/kysely-adapter@1.6.14` (a transitive dep of `better-auth`, reached via `better-auth/context/init`) ships sqlite dialect modules that import `DEFAULT_MIGRATION_TABLE` / `DEFAULT_MIGRATION_LOCK_TABLE` as named exports from `kysely`. `kysely@0.29.2` (latest, within the adapter's peer range) no longer exports those symbols. The bundler's static export analysis failed, **500-ing every route** (including `/`) in `next dev` and **breaking `next build`**. That kysely code is dead for us — we use the Drizzle + Postgres adapter, never Kysely.
- **Fix progression:** First tried Turbopack `resolveAlias` + `serverExternalPackages` + a kysely shim (fixed `next dev` but `next build`'s externals tracer ignores bundler aliases, so it still failed). Settled on the root-cause fix: `scripts/patch-kysely-adapter.mjs` rewrites the three unused dialect files to drop the missing names from the `kysely` import and declare them as local consts (canonical default values). Idempotent, wired to `postinstall` so it survives `npm install`. No bundler config needed; `next.config.ts` reverted to a one-line comment.
- **Files modified:** scripts/patch-kysely-adapter.mjs (new), package.json (postinstall), node_modules/@better-auth/kysely-adapter/dist/*sqlite-dialect*.mjs (patched on disk + regenerable via postinstall).
- **Verification:** `next build` exits 0 (all 7 routes + middleware compile); both E2E specs pass against `next dev`; full vitest suite 25/25 green.
- **Committed in:** `0d7bd32`.

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** Essential — without it the app would not run at all, so the E2E acceptance criteria could not pass. No scope creep; the patch only touches dead code in a transitive dependency. The defect is upstream (adapter/kysely version mismatch) and pre-existed this plan; this plan was simply the first to serve the app and expose it.

## Issues Encountered
- **`getByLabel`/`getByRole` E2E timeouts** initially — symptom of the HTTP 500 above (the form never rendered). Resolved entirely by the kysely-adapter patch.
- Benign warnings during runs: `Social provider google is missing clientId or clientSecret` (expected — no real Google creds yet) and a Next 16 "`middleware` -> `proxy`" deprecation nudge (kept middleware per plan).

## TDD Gate Compliance
Task 3 is `tdd="true"`. The implementation under test was authored in Tasks 1–2 (and Plan 02), so a test-first RED commit was not applicable; instead the suites are demonstrable regression guards:
- `capability-signup.test.ts` asserts BOTH `intent:"host" -> canHost=true/canBook=false` AND `intent:"book" -> canBook=true/canHost=false` — a missing/incorrect capability `db.update` fails it.
- `oauth-verified.test.ts` drives Better Auth's genuine `google` provider mapping (`emailVerified = email_verified`) + `internalAdapter.createOAuthUser` against the migrated test schema and asserts `emailVerified === true` — removing the trusted-provider config or the mapping fails it.
- `signup.test.ts` asserts an unverified user can still sign in (soft gate) — flipping `requireEmailVerification` to true would fail it.
- The two E2E specs fail if session persistence (D-12) or the reset flow (AUTH-03) break.
A formal `test(...)`-before-`feat(...)` gate sequence is therefore not present for this plan; documented here per the executor TDD-gate rule.

## Known Stubs
- **`/host` redirect target has no page yet.** Host signups set `canHost=true` and redirect to `/host`, which 404s until the host surface is built (Plan 04 / Phase 2). This is the intended D-05 routing seam, not a data stub — the capability flag (the load-bearing outcome) is correctly persisted. No hardcoded/empty UI data, no placeholder copy.

## Threat Flags
None — no security surface beyond the plan's `<threat_model>` was introduced. T-03-01 (intent->capability escalation) is mitigated server-side and tested; T-03-02 (reset enumeration) is mitigated by the uniform forgot-password message + Better Auth's uniform response; T-03-03/04/05 are handled by Plan-02 config (single-use tokens, sameSite cookies, Better Auth OAuth state) and the server-action boundary.

## Manual / Deferred Verification
- **Real Google OAuth round-trip:** not exercised end-to-end (no real `GOOGLE_CLIENT_ID`/`SECRET` yet — approved). The D-08 *behavior* (Google profile -> `emailVerified=true`) is proven via Better Auth's own provider mapping + persistence in `oauth-verified.test.ts`; a live sign-in through the Google button is a manual check once creds are added (the button calls `authClient.signIn.social({ provider: "google" })` and is wired correctly).
- **Real reset email delivery:** the ONE manual-only item per VALIDATION.md. The E2E reset flow captures the token from the `verification` table (the same token the email/console-log link carries); actual email send is verified manually once `RESEND_API_KEY` is set.

## User Setup Required
None new beyond Plan 02's documented `.env.local` credentials (Google OAuth, Cloudinary, Resend — all optional in dev; email/password works without any of them).

## Next Phase Readiness
- **Ready for Plan 04 (profile + capabilities):** the logged-out surface, the signup capability seam, and the optimistic middleware are in place. Plan 04 builds the logged-in surface (mode switch, profile, "activate later" capability), the `/host` destination, and per-page `auth.api.getSession()` gating (the real security boundary the middleware only optimistically hints at).
- **Concern (non-blocking):** consider migrating `src/middleware.ts` -> `proxy.ts` when convenient (Next 16 deprecation), and tracking the upstream `@better-auth/kysely-adapter` fix to eventually drop the postinstall patch.

## Self-Check: PASSED

All 14 listed key files verified present on disk; all 4 task/fix commits (`615ac76`, `822cc85`, `0d7bd32`, `61da6db`) verified in git log. Plan verification re-run: `npx vitest run` exits 0 (25 tests, 9 files); `npx playwright test e2e/login-persistence.spec.ts e2e/password-reset.spec.ts` exits 0 (2 tests); `npx tsc --noEmit` exits 0; `npx next build` exits 0 (7 routes + middleware compile).

---
*Phase: 01-auth-accounts*
*Completed: 2026-06-03*
