---
phase: 01-auth-accounts
plan: 02
subsystem: auth
tags: [better-auth, drizzle, postgres, zod, resend, cloudinary, google-oauth, sessions, password-reset, rate-limiting]

# Dependency graph
requires:
  - phase: 01-01
    provides: Next.js 16 scaffold, Dockerized Postgres 18, Drizzle db instance + drizzle.config, placeholder schema.ts, Vitest harness + isolated-schema test DB strategy + Resend/Cloudinary/Google mocks
provides:
  - Better Auth server instance (src/lib/auth.ts) — email/pw soft gate + Google OAuth + 30d sliding Postgres sessions + reset-revokes-other-sessions + input:false capability/role flags + profile additionalFields + tuned rate limiting
  - Better Auth browser client (src/lib/auth-client.ts) typed via inferAdditionalFields
  - Mounted Better Auth HTTP handler (src/app/api/auth/[...all]/route.ts)
  - Generated + APPLIED Drizzle schema/migration (user/session/account/verification + capability + profile columns) — live Postgres has the real columns
  - Resend email helper (dev console-log fallback) + Cloudinary server-only avatar upload helper
  - Shared Zod 4 validation schemas (auth + profile)
  - Hardened integration-test DB isolation (per-worker schema, public-ref rewriting) + mocked-email capture wiring
affects: [01-03-auth-ui, 01-04-profile-capabilities, all-phases-2-8]

# Tech tracking
tech-stack:
  added:
    - "better-auth@1.6.14 configured (was installed-but-unconfigured in 01-01)"
    - "@better-auth/cli (npx, schema generation)"
  patterns:
    - "auth.ts is the single source of truth; @better-auth/cli generate reflects additionalFields into schema.ts; do NOT hand-write auth table shape"
    - "Migration workflow: cli generate -> drizzle-kit generate -> drizzle-kit migrate (order matters, RESEARCH Pitfall 1)"
    - "Privilege-bearing fields (canBook/canHost/role) are input:false — set server-side only, never from client input (escalation guard)"
    - "Email sends are fire-and-forget (void) from auth callbacks to avoid a timing side-channel"
    - "Integration tests build a test-scoped Better Auth from prodAuth.options against an isolated per-worker schema, so config invariants under test are the SAME object the app ships"
    - "All timestamp columns are timestamptz (withTimezone) — UTC everywhere"

key-files:
  created:
    - src/lib/auth.ts
    - src/lib/auth-client.ts
    - src/app/api/auth/[...all]/route.ts
    - src/lib/email.ts
    - src/lib/cloudinary.ts
    - src/lib/validation/auth.ts
    - src/lib/validation/profile.ts
    - drizzle/0000_sturdy_nighthawk.sql
    - drizzle/meta/0000_snapshot.json
    - drizzle/meta/_journal.json
    - tests/helpers/auth.ts
    - tests/auth/session-config.test.ts
    - tests/auth/reset-revokes-sessions.test.ts
    - tests/auth/capability-escalation.test.ts
    - tests/auth/soft-gate-noop.test.ts
    - tests/validation/auth-schema.test.ts
  modified:
    - src/lib/db/schema.ts (placeholder -> real Better-Auth-generated tables + additionalFields, timestamptz)
    - tests/helpers/db.ts (per-worker schema isolation + public-ref rewriting fix)
    - tests/setup.ts (force mock RESEND_API_KEY so the Resend mock captures links)
    - .env.example (documented where to obtain each external credential)

key-decisions:
  - "Reuse Better Auth's built-in name/email/emailVerified/image/createdAt; ADD explicit firstName/lastName/avatarUrl/avatarPublicId rather than overloading name/image — cleaner public/private split (D-09/D-10). createdAt = 'member since'."
  - "rateLimit.enabled:true explicitly (Better Auth defaults it to production-only) so dev/test are also protected; global 100/10s + customRules tightening sign-in/sign-up to 5/60s and reset/verification to 3/60s."
  - "All timestamp columns made timestamptz (withTimezone) — a post-generation tweak kept on regen — to honor the UTC-everywhere constraint."
  - "@better-auth/cli latest (1.4.21) lags better-auth 1.6.14, but the generated core-table + additionalFields shape is correct and the runtime drizzleAdapter (1.6.14) works against it — verified by green integration tests + live-DB column check."

patterns-established:
  - "Pattern: test-scoped Better Auth via tests/helpers/auth.ts makeTestAuth(testDb) — reuses prodAuth.options, swaps the db adapter to the isolated schema"
  - "Pattern: per-Vitest-worker isolated Postgres schema (test_<pid>_<worker>_<n>) with direct migration-SQL application + public-ref rewriting (tests/helpers/db.ts)"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: 17min
completed: 2026-06-03
---

# Phase 1 Plan 02: Better Auth Identity Layer Summary

**Better Auth configured as the identity source of truth — email/password (soft verification gate) + Google OAuth, 30-day sliding Postgres sessions, password-reset-revokes-other-sessions, input:false capability/role flags + profile additionalFields — with the schema generated and the migration APPLIED to the live Postgres, plus Resend/Cloudinary helpers, shared Zod 4 schemas, and config-invariant tests proven to go red if their guards are removed.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-06-03T09:03:52Z
- **Completed:** 2026-06-03T09:21:25Z
- **Tasks:** 3 auto tasks complete (Task 4 is a human-action credentials checkpoint — pending the account owner)
- **Files modified:** 20 (across five commits)

## Accomplishments
- Configured Better Auth (`src/lib/auth.ts`) implementing every locked decision D-01..D-13: email/pw soft gate (D-07), Google OAuth (D-06, Apple deferred — slot commented, no jose), 30-day sliding sessions stored in Postgres (D-12), `revokeSessionsOnPasswordReset:true` (D-13 — the default-false landmine), capability flags `canBook`/`canHost` + nullable `role` all `input:false` (D-01..D-03 privilege-escalation guard), profile fields `firstName`/`lastName`/`phone`/`bio`/`city`/`avatarUrl`/`avatarPublicId` (D-09/D-10), account linking with trusted Google provider (D-08), and enabled+tuned rate limiting.
- Ran the migration workflow in the correct order (CLI generate -> drizzle-kit generate -> drizzle-kit migrate) and **applied** it to the live Postgres. Verified the `user` table physically has all 17 columns including the 5 required (`can_book`, `can_host`, `first_name`, `avatar_url`, `role`); all timestamps are `timestamp with time zone`.
- Wired the Resend email helper (dev console-log fallback when `RESEND_API_KEY` is unset), the server-only Cloudinary `uploadAvatar` helper, and shared Zod 4 schemas (`signupSchema` with `intent`, `loginSchema`, `requestResetSchema`, `resetSchema`, `profileSchema`).
- Wrote five config-invariant test files (18 tests, all green against the migrated test DB) and **proved** the two highest-risk ones go RED when their guards are removed: reset-revoke fails without `revokeSessionsOnPasswordReset`, escalation fails without `input:false`.
- Fixed a latent test-isolation bug in the Plan-01 DB helper (integration writes were leaking into the dev `public` schema); now every Vitest worker gets its own isolated schema and zero rows leak to dev.

## Task Commits

1. **Task 1: Configure Better Auth + email/Cloudinary helpers + Zod schemas** — `983ec5e` (feat)
2. **Task 2: [BLOCKING] Generate auth schema, emit + APPLY migration to live Postgres** — `21d9c11` (feat)
3. **Task 3 (TDD): config-invariant tests** — `0b6ebe4` (fix: test-DB isolation) + `c9f5add` (test: the five suites)
4. **.env.example credential documentation** — `b026bdc` (docs)

**Plan metadata:** committed separately (docs: complete plan).

_TDD note: the implementation (auth.ts) already existed from Task 1, so Task 3's RED-then-GREEN was exercised by removing each guard line and confirming the corresponding test fails, then restoring it — recorded below under TDD Gate Compliance._

## Files Created/Modified
- `src/lib/auth.ts` — Better Auth server instance (the brain). All D-01..D-13 config.
- `src/lib/auth-client.ts` — browser client typed via `inferAdditionalFields<typeof auth>()`.
- `src/app/api/auth/[...all]/route.ts` — `toNextJsHandler(auth)` mounts every auth endpoint.
- `src/lib/email.ts` — Resend client + `sendVerificationEmail`/`sendResetPassword` with `[email:dev]` console fallback.
- `src/lib/cloudinary.ts` — server-only `uploadAvatar(buffer, userId)` via `upload_stream`.
- `src/lib/validation/auth.ts` / `profile.ts` — shared Zod 4 schemas (top-level `z.email()`).
- `src/lib/db/schema.ts` — Better-Auth-generated `user`/`session`/`account`/`verification` + additionalFields; all timestamps timestamptz.
- `drizzle/0000_sturdy_nighthawk.sql` (+ meta) — the applied migration.
- `tests/helpers/auth.ts` — test-scoped Better Auth + typed `signUp` helper.
- `tests/auth/*.test.ts` + `tests/validation/auth-schema.test.ts` — the five suites.
- `tests/helpers/db.ts` / `tests/setup.ts` — isolation + mocked-email-capture fixes.
- `.env.example` — documented credential sources.

## Final auth.ts config (for Plans 03/04)

**Session (D-12):** `expiresIn: 2592000` (30d), `updateAge: 86400` (slide daily). The session cookie observed in tests: `better-auth.session_token=...; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax` — confirming **httpOnly + SameSite=Lax** (T-02-04/T-02-08). `Secure` is added by Better Auth automatically over HTTPS (production); local dev is http so it is correctly absent locally.

**Rate limiting (T-02-05, chosen values):**
- Global: `window: 10`s, `max: 100` (library defaults), `enabled: true` (explicit — overrides Better Auth's production-only default so dev/test are protected).
- `customRules`: `/sign-in/email` 5/60s, `/sign-up/email` 5/60s, `/request-password-reset` 3/60s, `/forget-password` 3/60s, `/reset-password` 5/60s, `/send-verification-email` 3/60s. (Better Auth also ships built-in special rules of 3/10s for sign-in and 3/60s for reset; these explicit rules make the audited choices visible.)

**firstName/avatarUrl vs built-in name/image (decision):** kept Better Auth's built-in `name`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt` AND added explicit `firstName`/`lastName`/`avatarUrl`/`avatarPublicId`. Rationale: D-10 wants only the first name public, so an explicit `firstName` (public) + `lastName` (private) is cleaner than parsing `name`; `avatarUrl`/`avatarPublicId` (Cloudinary) are separate from the OAuth-provided `image`. `createdAt` = "member since". Plans 03/04: set `name` to the first name (or `firstName + lastName`) at signup, and populate `firstName`.

**Generated columns (snake_case, live DB):** `id, name, email, email_verified, image, created_at, updated_at, can_book, can_host, role, first_name, last_name, phone, bio, city, avatar_url, avatar_public_id`. Migration file: `drizzle/0000_sturdy_nighthawk.sql`.

**auth.api.* signatures Plans 03/04 will call** (verified at runtime, v1.6.14):
- `auth.api.signUpEmail({ body: { email, password, name, firstName, ... } })` — privileged fields (`canBook`/`canHost`/`role`) are silently stripped (input:false); returns `{ token, user }`.
- `auth.api.signInEmail({ body: { email, password }, asResponse?: true })` — returns a `Response` with the `Set-Cookie` session token when `asResponse:true`.
- `auth.api.getSession({ headers })` — pass `new Headers({ cookie })`; returns `{ session, user } | null`.
- `auth.api.requestPasswordReset({ body: { email, redirectTo } })` — fires `sendResetPassword`; the reset token is the **last path segment** of the emailed link (not a `?token=` query param).
- `auth.api.resetPassword({ body: { token, newPassword } })` — revokes other sessions (D-13).
- `auth.api.updateUser({ body, headers })` — for profile edits; do NOT route capability flips through client input (use a privileged server action for `canHost`/`canBook`).
- Also available: `listSessions`, `revokeSession(s)`, `revokeOtherSessions`, `signOut`, `verifyEmail`, `sendVerificationEmail`, `signInSocial`, `linkSocialAccount`.

## Decisions Made
- **Built-in name/image + explicit firstName/avatarUrl** (rationale above).
- **rateLimit.enabled:true explicitly** with tuned customRules (rationale above).
- **timestamptz on all timestamp columns** — post-generation tweak kept on regen, to honor UTC-everywhere.
- **`@better-auth/cli` latest (1.4.21) used despite lagging better-auth 1.6.14** — the generated core-table + additionalFields shape is correct and the 1.6.14 runtime adapter works against it (proven by green integration tests + the live-DB column check). If a 1.6.x CLI ships later, re-running `generate` should be a no-op.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Made all timestamp columns timestamptz**
- **Found during:** Task 2 (schema generation)
- **Issue:** `@better-auth/cli generate` emits plain `timestamp` (without time zone) columns; the project's hard constraint is UTC/timestamptz everywhere (CLAUDE.md "What NOT to Use").
- **Fix:** Added `{ withTimezone: true }` to every `timestamp(...)` in `schema.ts` before generating the migration; the emitted SQL uses `timestamp with time zone`. Documented in the schema header so it is re-applied on regen.
- **Files modified:** src/lib/db/schema.ts, drizzle/0000_sturdy_nighthawk.sql
- **Verification:** `information_schema.columns` shows `timestamp with time zone` for `created_at`/`updated_at`/`expires_at`/token-expiry columns on the live DB.
- **Committed in:** 21d9c11 (Task 2)

**2. [Rule 1 - Bug] Integration tests were corrupting the dev (public) schema**
- **Found during:** Task 3 (first integration test run)
- **Issue:** The Plan-01 test helper applied migrations via Drizzle's migrator, whose journal lives in a shared `drizzle` schema. Because Task 2 had already applied migration 0000 to the dev DB, the migrator treated it as already-applied and SKIPPED creating tables in the isolated `test` schema. The auth instance then fell through `search_path` and wrote into `public.user` — leaking `softgate@/escalate@/probe2@` rows into dev data (threat T-01-04). A secondary parallel `CREATE SCHEMA test` race also surfaced, plus the migration's hardcoded `REFERENCES "public"."user"` would cross-link FKs.
- **Fix:** Rewrote `setupTestDb`/`teardownTestDb` to create a UNIQUE schema per Vitest worker (`test_<pid>_<worker>_<n>`), apply migration SQL **directly** (bypassing the shared journal), and rewrite the dialect-default `"public".` qualifier to the isolated schema so every CREATE TABLE + FK stays self-contained. Deleted the 3 leaked dev rows.
- **Files modified:** tests/helpers/db.ts
- **Verification:** Full suite green; `public.user` count = 0 after the run; zero stray `test_%` schemas remain (clean teardown).
- **Committed in:** 0b6ebe4 (Task 3 fix)

**3. [Rule 3 - Blocking] Mocked Resend never captured the reset/verification link**
- **Found during:** Task 3 (reset-revoke test design)
- **Issue:** `tests/setup.ts` mocks the `Resend` class, but with `RESEND_API_KEY` unset `src/lib/email.ts` takes its console-log fallback and never constructs Resend — so `mockResend.lastLink()` returned null and the reset test could not read the emailed token.
- **Fix:** Set a fake `RESEND_API_KEY` in `tests/setup.ts` so `email.ts` instantiates the (mocked) Resend client, which captures the link. The key value is irrelevant (the class is mocked).
- **Files modified:** tests/setup.ts
- **Verification:** `reset-revokes-sessions.test.ts` reads the token from `mockResend.lastLink()` and passes.
- **Committed in:** 0b6ebe4 (Task 3 fix)

**4. [Rule 2 - Missing Critical] Documented credential sources in .env.example**
- **Found during:** Wrap-up (user_setup gate)
- **Issue:** `.env.example` listed the vars but not where to obtain them; the plan's user_setup gate requires the account owner to create Google/Cloudinary/Resend creds.
- **Fix:** Added per-service comments (dashboard path, redirect URI, dev-fallback notes, server-only marking).
- **Files modified:** .env.example
- **Verification:** File documents every required var with its source.
- **Committed in:** b026bdc (docs)

---

**Total deviations:** 4 auto-fixed (1 bug, 2 missing-critical, 1 blocking).
**Impact on plan:** All four were necessary for correctness/security/test-integrity; none changed plan scope. Deviation #2 fixed a real data-corruption bug seeded in Plan 01 that this plan's integration tests were the first to exercise.

## TDD Gate Compliance

Task 3 is `tdd="true"`, but the implementation under test (`src/lib/auth.ts`) was authored in Task 1, so a classic test-first RED commit was not applicable. Instead the RED gate was demonstrated by **removing each guard and confirming the test fails**, then restoring:
- Remove `revokeSessionsOnPasswordReset: true` -> `reset-revokes-sessions.test.ts` fails (`expected {…} to be null`). Restored -> green.
- Remove `input: false` from canBook/canHost/role -> `capability-escalation.test.ts` fails (signup throws / smuggled values leak). Restored -> green.
Commits: `c9f5add` (the test suites). These suites are genuine regression guards for the two highest-risk landmines.

## Issues Encountered
- The standalone `@better-auth/cli` package's `latest` tag (1.4.21) lags `better-auth` 1.6.14 (no 1.6.x CLI published). Resolved by verifying the generated schema is structurally correct for the 1.6.14 runtime adapter via green integration tests and a direct live-DB column check.
- Windows CRLF normalization warnings on `git add` (expected, harmless under `.gitattributes * text=auto`).

## Known Stubs
None. Email/Cloudinary/Google are wired via `process.env.*`; the only intentional fallbacks are the Resend dev console-log (documented) and the empty external-service env vars the account owner populates next (Task 4 checkpoint). No UI stubs or hardcoded empty data — this plan ships only the auth/data layer.

## Threat Flags
None — no security surface beyond the plan's `<threat_model>` was introduced. All HIGH-severity threats (T-02-01 escalation, T-02-02 reset-revoke) are mitigated and tested; T-02-09 (unverified-email soft gate) is the explicitly-accepted residual enforced in later phases.

## User Setup Required
**External services require the account owner to add credentials to `.env.local`** (see the Task 4 human-action checkpoint and the documented `.env.example`):
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google sign-in (D-06). Email/password works without these.
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — avatar upload (D-11). Profiles work without an avatar.
- `RESEND_API_KEY` — real verification/reset emails. Optional in dev (console-log fallback).

## Next Phase Readiness
- **Ready for Plan 03 (auth UI flows):** `auth`, `authClient`, the mounted route handler, the Zod schemas, and the live migrated DB are in place. The exact `auth.api.*` signatures and the cookie behavior are documented above.
- **Ready for Plan 04 (profile + capabilities):** profile columns + `profileSchema` exist; `uploadAvatar` is ready; capability flips must go through a privileged server action (not client input).
- **Blocker (non-code):** Google + Cloudinary credentials are required to exercise Google sign-in and avatar upload end-to-end — surfaced as the Task 4 checkpoint.

## Self-Check: PASSED

All 15 listed key files verified present on disk; all 5 task/fix/docs commits (`983ec5e`, `21d9c11`, `0b6ebe4`, `c9f5add`, `b026bdc`) verified in git log. Plan verification re-run: `npx vitest run tests/auth/ tests/validation/` exits 0 (18 tests); `npx tsc --noEmit` exits 0; live DB `user` table confirmed to have all 5 required columns.

---
*Phase: 01-auth-accounts*
*Completed: 2026-06-03*
