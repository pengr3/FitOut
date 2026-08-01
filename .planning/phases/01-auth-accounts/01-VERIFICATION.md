---
phase: 01-auth-accounts
verified: 2026-06-03T18:55:00Z
status: human_needed
score: 4/4
overrides_applied: 0
human_verification_partially_discharged: 2026-08-01T12:42:00Z
discharge_note: |
  v1.0 milestone audit (2026-08-01). Items 1, 2 and 5 below are DISCHARGED by real-browser E2E specs
  that did not exist when this report was written, re-run first-hand in that session:
    - item 1 (session persists across a browser restart)  -> e2e/login-persistence.spec.ts
    - item 2 (forgot -> reset -> log in with new password) -> e2e/password-reset.spec.ts
    - item 5 (mode-switch capability activation in browser) -> e2e/mode-switch.spec.ts
  `npx playwright test` on those three -> 4 passed (33.7s), against the dev app + dev Postgres.
  Discharged by the orchestrator, NOT by a human — but by real browser automation, which is what these
  three items actually asked for.
  Items 3 (live Google OAuth), 4 (real Cloudinary avatar upload) and 6 (product sign-off on the signup
  intent default) REMAIN OPEN. 3 and 4 are external-credential items: GOOGLE_CLIENT_ID/SECRET and the
  server-side CLOUDINARY_* secrets are still absent from .env.local (re-checked 2026-08-01). Item 6 is a
  product decision that has shipped unchanged through nine phases — de-facto accepted, never recorded.
human_verification:
  - test: "Sign up with email/password, close the browser tab, reopen and visit http://localhost:3000 — verify you are still logged in without re-entering credentials"
    expected: "Session persists; the user lands on the authenticated surface without being redirected to /login"
    why_human: "30-day sliding session persistence requires a real browser cookie + server round-trip. Unit test proves config (expiresIn=2592000), but cookie lifetime on an actual browser session cannot be asserted programmatically without running the app."
  - test: "Trigger forgot-password for a real account, check the inbox (or .env.local console log when RESEND_API_KEY is unset), follow the link, set a new password, and log in with the new password"
    expected: "The reset link arrives (or is printed to the dev console); the new password works; any prior browser session for that account is invalidated after reset"
    why_human: "Real email delivery via Resend requires RESEND_API_KEY which has not been configured. Unit test (reset-revokes-sessions.test.ts) proves the token flow + session revocation against the real DB, but actual email delivery and the console-log fallback link path require a running app."
  - test: "Click 'Continue with Google' on the signup or login page; complete the Google OAuth flow"
    expected: "User is created/authenticated via Google; account has emailVerified=true; the user lands on the post-login surface"
    why_human: "Real Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not yet configured. Unit test (oauth-verified.test.ts) proves the provider mapping + emailVerified persistence via Better Auth's internal adapter, but the live browser OAuth round-trip cannot be verified without real creds."
  - test: "Upload an avatar photo on the profile page (/profile)"
    expected: "Photo appears as the user's avatar; avatarUrl and avatarPublicId columns are populated on the user row"
    why_human: "Real Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not yet configured. Unit test (avatar.test.ts) proves the upload+persistence path via a mock, but the actual CDN upload to Cloudinary requires real creds."
  - test: "Create a booker account, then click 'Start hosting' in the mode switch — confirm you can access /host; create a host account, click 'Start booking', confirm you reach the booking surface"
    expected: "The other capability flag is granted and both capabilities coexist; the correct surface loads; canHost+canBook=true is reflected in the session"
    why_human: "The mode-switch UI component and the server-side capability gate in host/layout.tsx require a running browser session to verify end-to-end navigation + redirect behavior. Unit tests (capability-activate.test.ts, soft-gate-noop.test.ts) verify the DB layer; mode-switch UX needs a browser."
  - test: "Confirm the signup intent default: sign up via the API/test harness with no `intent` field (or an invalid value) and verify the account defaults to canBook=true, canHost=false"
    expected: "A user created without an intent is a booker by default — never left with both flags false"
    why_human: "The databaseHooks.user.create.before hook in auth.ts defaults to canBook when intent is absent/invalid. The capability-escalation.test.ts asserts this (canBook=true, both-false is impossible) but the product team should confirm that defaulting to booker is the intended UX for this edge case."
---

# Phase 1: Auth & Accounts — Verification Report

**Phase Goal:** A person can create one FitOut identity that carries both booker and host capabilities, sign in reliably, and recover access — the foundation every other entity is owned by.
**Verified:** 2026-06-03T18:55:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A user can sign up with email and password, then log in and remain logged in across browser sessions | VERIFIED | `signup()` action creates user via `auth.api.signUpEmail`; session is 30-day sliding (`expiresIn=2592000`, `updateAge=86400`) confirmed by `session-config.test.ts`; `signup.test.ts` drives the real auth against a migrated DB and asserts sign-in succeeds + cookie is set |
| 2 | A user who forgets their password can reset it via an emailed link and log in with the new password | VERIFIED | `forgot-password/page.tsx` calls `authClient.requestPasswordReset`; `reset-password/page.tsx` calls `authClient.resetPassword({ newPassword, token })`; `revokeSessionsOnPasswordReset:true` set explicitly in `auth.ts`; `reset-revokes-sessions.test.ts` drives full flow (request → token capture → reset → old session invalid → new password works) against real DB |
| 3 | A single signed-in account can act as both a booker and a host without creating a separate identity | VERIFIED | `canBook`/`canHost` boolean columns on user table; both `input:false` (privilege escalation blocked); `activateHosting()`/`activateBooking()` server actions flip the flag without touching the other; `ModeSwitch` component navigates between contexts; `/host` layout gates server-side on `canHost`; `capability-activate.test.ts` verifies coexistence invariant |
| 4 | A user can create and edit a basic profile (name, contact, optional photo) | VERIFIED | `updateProfile()` server action (re-validates with `profileSchema`, persists firstName/lastName/phone/bio/city); `uploadAvatarAction()` server action (validates file type+size, routes through Cloudinary helper, stores avatarUrl+avatarPublicId); `profile.test.ts` + `avatar.test.ts` drive the real actions against isolated test DB; `publicProfile()` enforces allow-list projection |

**Score: 4/4 success criteria verified**

---

### Deferred Items

None. All success criteria are met in this phase.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `src/lib/auth.ts` | Better Auth server instance | VERIFIED | 178 lines; drizzleAdapter, email/pw, Google OAuth, 30-day sessions, revokeSessionsOnPasswordReset:true, input:false capability fields, databaseHooks.user.create.before atomic grant, explicit secret/baseURL/trustedOrigins, customRules rate limiting |
| `src/lib/db/schema.ts` | Auth tables + additionalFields columns | VERIFIED | user/session/account/verification tables; canBook/canHost/role/firstName/lastName/phone/bio/city/avatarUrl/avatarPublicId columns; all timestamps withTimezone:true |
| `src/app/api/auth/[...all]/route.ts` | Better Auth HTTP handler | VERIFIED | Contains `toNextJsHandler(auth)` |
| `src/lib/email.ts` | Resend client + send helpers + escaping | VERIFIED | `escapeHtml` applied to URL before interpolation (WR-01 fix); production guard on console fallback (WR-02 fix); `sendVerificationEmail` + `sendResetPassword` exported |
| `src/lib/cloudinary.ts` | Cloudinary uploadAvatar server helper | VERIFIED | `upload_stream` present; server-only (api_secret in env); `fitout/avatars/{userId}` public_id; face-crop transformation |
| `src/lib/profile.ts` | Public/private projection helper | VERIFIED | `publicProfile()` explicit allow-list (avatarUrl/firstName/bio/city/createdAt); `PRIVATE_PROFILE_FIELDS` constant; `formatMemberSince` locale-aware |
| `src/lib/validation/auth.ts` | Zod signup/login/reset schemas | VERIFIED | `signupSchema`, `loginSchema`, `requestResetSchema`, `resetSchema` present (confirmed by imports in action + test files) |
| `src/app/actions/auth.ts` | signup server action | VERIFIED | "use server"; server-side Zod re-validation; atomic capability grant via `create.before` hook (no separate UPDATE — CR-02 fix); non-enumerating error messages |
| `src/app/actions/capability.ts` | activateHosting/activateBooking server actions | VERIFIED | Session-gated (`requireUserId()`); privileged `db.update` on caller's own row; coexistence (target flag only, other untouched); correct return routes |
| `src/app/actions/profile.ts` | updateProfile server action | VERIFIED | Session-gated; profileSchema re-validation; `clean()` normalizes empty/whitespace to NULL (WR-05 fix) |
| `src/app/actions/avatar.ts` | uploadAvatarAction server action | VERIFIED | Session-gated; `avatarFileSchema` validates type+size before upload; Cloudinary helper called; avatarUrl+avatarPublicId persisted |
| `src/app/(auth)/signup/page.tsx` | Signup form | VERIFIED | Intent choice (book/host), firstName, email/password; Google button; `signup()` server action called |
| `src/app/(auth)/forgot-password/page.tsx` | Forgot password form | VERIFIED | `authClient.requestPasswordReset`; uniform anti-enumeration message |
| `src/app/(auth)/reset-password/page.tsx` | Reset password form | VERIFIED | Token from URL; `authClient.resetPassword`; Suspense boundary |
| `src/app/(app)/profile/page.tsx` | Profile view/edit page | VERIFIED | Server Component; session gate + redirect; ProfileForm seeded with current values |
| `src/app/(host)/host/layout.tsx` | Host route group gate | VERIFIED | `auth.api.getSession` on every request; redirect to /login if no session; redirect to / if !canHost |
| `src/middleware.ts` | Optimistic redirect middleware | VERIFIED | Cookie-presence check only (clearly documented as not the security boundary); bounces logged-in users from /login and /signup |
| `src/components/mode-switch.tsx` | Airbnb-style mode switch | VERIFIED | capability-aware; calls activateHosting/activateBooking when capability absent; navigates to correct surface |
| `tests/auth/rate-limit.test.ts` | CR-01 regression: rate-limit keys actually fire | VERIFIED | 5 tests proving bare-path keys override Better Auth built-in defaults (4th sign-in passes under our 5/60s rule, would 429 under built-in 3/10s); 6th sign-in 429; request-password-reset 4th = 429; per-IP isolation |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/lib/auth.ts` | `src/lib/db/index.ts` | `drizzleAdapter(db, { provider: 'pg' })` | WIRED | Present at auth.ts line 55 |
| `src/lib/auth.ts` | `src/lib/email.ts` | `sendResetPassword` / `sendVerificationEmail` | WIRED | Imported at auth.ts line 32; called in emailAndPassword.sendResetPassword and emailVerification.sendVerificationEmail |
| `src/app/api/auth/[...all]/route.ts` | `src/lib/auth.ts` | `toNextJsHandler(auth)` | WIRED | toNextJsHandler(auth) mounts the handler |
| `src/app/actions/auth.ts` | `src/lib/auth.ts` | `auth.api.signUpEmail` | WIRED | auth imported and called |
| `src/app/actions/auth.ts` | `src/lib/validation/auth.ts` | `signupSchema.safeParse` | WIRED | server-side re-validation present |
| `src/app/actions/capability.ts` | `src/lib/auth.ts` | `auth.api.getSession` (session gate) | WIRED | requireUserId() calls getSession |
| `src/app/actions/avatar.ts` | `src/lib/cloudinary.ts` | `uploadAvatar(buffer, userId)` | WIRED | Imported and called at avatar.ts line 73 |
| `src/app/(host)/host/layout.tsx` | `src/lib/auth.ts` | `auth.api.getSession` gate on canHost | WIRED | getSession called; canHost checked with redirect |
| `src/app/(app)/profile/page.tsx` | `src/app/actions/profile.ts` + `src/app/actions/avatar.ts` | ProfileForm component | WIRED | ProfileForm imported and rendered with session user data |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `src/app/(app)/profile/page.tsx` | `session.user` | `auth.api.getSession({ headers })` | Yes — server-side DB query via Better Auth | FLOWING |
| `src/app/(host)/host/layout.tsx` | `session.user` | `auth.api.getSession({ headers })` | Yes — server-side DB query; canHost read from it | FLOWING |
| `src/components/mode-switch.tsx` | `canBook`, `canHost` props | Passed from layout (server-fetched session) | Yes — props from real session data | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles with no errors | `npx tsc --noEmit` | Exit 0, no output | PASS |
| Full test suite passes | `npm run test` | 54/54 passed, 16 test files | PASS |
| Rate-limit keys actually fire on auth endpoints | `tests/auth/rate-limit.test.ts` (5 tests) | All pass — 4th sign-in allowed (proves our 5/60s overrides built-in 3/10s), 6th sign-in 429 | PASS |
| Session config is 30-day sliding | `tests/auth/session-config.test.ts` | expiresIn=2592000, updateAge=86400 | PASS |
| Password reset revokes prior sessions | `tests/auth/reset-revokes-sessions.test.ts` | Session cookie invalid after reset; new password works | PASS |
| Atomic capability grant (no user ever both-false) | `tests/auth/capability-signup.test.ts` | All 4 tests pass including invariant scan over all rows | PASS |
| input:false escalation guard | `tests/auth/capability-escalation.test.ts` | smuggled canHost=true, role="admin" stripped | PASS |
| Profile fields clear to NULL (not "") | `tests/profile/profile.test.ts` (WR-05) | lastName/phone/bio/city null-normalized | PASS |
| Public projection excludes private fields | `tests/profile/profile.test.ts` | Only 5 public keys; lastName/email/phone absent | PASS |
| Production boot fails closed on missing secret | `tests/auth/secret-config.test.ts` | Throws BETTER_AUTH_SECRET error in production env | PASS |
| Dev email fallback withholds token in production | `tests/auth/email-dev-fallback.test.ts` | console.log not called in production env; console.error fired | PASS |
| HTML escaping in email bodies | `tests/auth/email-escaping.test.ts` | `"` and markup characters escaped; benign URL round-trips | PASS |
| Avatar upload validates type+size before Cloudinary | `tests/profile/avatar.test.ts` | PDF rejected; oversized rejected; no-session rejected | PASS |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|--------------|-------------|--------|---------|
| AUTH-01 | 01-01, 01-02, 01-03 | User can sign up with email and password | SATISFIED | `signup()` action + `signup.test.ts` drives real auth; user persisted with emailVerified=false (soft gate D-07) |
| AUTH-02 | 01-01, 01-02, 01-03 | User can log in and stay logged in across sessions | SATISFIED | 30-day sliding session (`session-config.test.ts`); `signInEmail` sets httpOnly cookie; `login/page.tsx` wired |
| AUTH-03 | 01-02, 01-03 | User can reset password via email link | SATISFIED | `forgot-password/page.tsx` + `reset-password/page.tsx` wired; `revokeSessionsOnPasswordReset:true`; `reset-revokes-sessions.test.ts` proves full flow |
| AUTH-04 | 01-02, 01-03, 01-04 | User can both book and host from a single account | SATISFIED | canBook/canHost schema columns; `activateHosting()`/`activateBooking()` server actions; mode switch; host layout gate; coexistence proven by `capability-activate.test.ts` |
| AUTH-05 | 01-02, 01-04 | User can create and edit a basic profile (name, contact, optional photo) | SATISFIED | `updateProfile()` + `uploadAvatarAction()` server actions; profile page with public/private split; `publicProfile()` allow-list; `profile.test.ts` + `avatar.test.ts` drive real actions |

All 5 phase requirements satisfied. No orphaned requirements identified (REQUIREMENTS.md traceability confirms AUTH-01..05 all mapped to Phase 1).

---

### Security Invariants

| Invariant | Status | Evidence |
|-----------|--------|---------|
| `canBook`/`canHost`/`role` are `input:false` — clients cannot self-grant | VERIFIED | auth.ts lines 110-112; `capability-escalation.test.ts` proves smuggled values stripped |
| Atomic capability grant at signup (no user ever both-false) | VERIFIED | `databaseHooks.user.create.before` hook sets flag in same insert; `capability-signup.test.ts` scans all rows and asserts `canBook \|\| canHost = true` |
| `/host` route gated server-side on `canHost` | VERIFIED | `host/layout.tsx` calls `auth.api.getSession` + redirects if `!u.canHost`; middleware is explicitly documented as optimistic-only |
| `publicProfile()` exposes ONLY public fields (allow-list) | VERIFIED | 5-key allow-list in profile.ts; `profile.test.ts` asserts `Object.keys(pub).sort()` === exactly `['avatarUrl','bio','city','createdAt','firstName']` and no PRIVATE_PROFILE_FIELDS keys present |
| Password reset revokes other sessions | VERIFIED | `revokeSessionsOnPasswordReset: true` in auth.ts; `reset-revokes-sessions.test.ts` proves old session returns null after reset |
| 30-day sliding sessions | VERIFIED | `expiresIn=2592000`, `updateAge=86400`; `session-config.test.ts` |
| Rate limiting actually fires on auth endpoints (CR-01 fix) | VERIFIED | Bare-path keys in customRules; `rate-limit.test.ts` proves 5/60s override of built-in 3/10s; no stale `/api/auth`-prefixed keys present |
| Production boot throws on missing BETTER_AUTH_SECRET (WR-03 fix) | VERIFIED | `auth.ts` lines 43-48; `secret-config.test.ts` proves throw in production |
| Email HTML injection prevented (WR-01 fix) | VERIFIED | `escapeHtml()` applied to URL before interpolation; `email-escaping.test.ts` |
| Dev email token NOT logged in production (WR-02 fix) | VERIFIED | `NODE_ENV === "production"` guard in email.ts; `email-dev-fallback.test.ts` |
| Profile cleared fields write NULL not "" (WR-05 fix) | VERIFIED | `clean()` normalizer in profile.ts action; `profile.test.ts` asserts null on cleared fields |
| Avatar upload session-gated; type+size validated before Cloudinary | VERIFIED | `uploadAvatarAction` checks session + `avatarFileSchema.safeParse` before upload; `avatar.test.ts` |

**All code-verifiable security invariants: PASS**

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/actions/auth.ts` | 83 | `/exist|already|unique/i.test(message)` — regex over error message string for duplicate-email detection (IN-01) | Info | Brittle to upstream message changes; soft enumeration oracle. Not blocking. |
| `src/app/(app)/layout.tsx`, `src/app/(host)/host/layout.tsx`, etc. | ~26 | `as typeof session.user & { canHost?: boolean; ... }` repeated cast | Info | Duplicated in 4 files; fields are optional which means a typo silently fails-closed (safe). Not blocking. |
| `tests/auth/capability-activate.test.ts` | 51-56 | `activateHostingFor`/`activateBookingFor` reproduce `db.update` directly instead of importing the real `activateHosting()`/`activateBooking()` actions | Warning (WR-06, deferred) | A regression inside the real capability actions (e.g. removing the session gate) would not be caught. Low blast radius in Phase 1 (no financial consequence yet); must be hardened before Phase 2 wires Stripe to `canHost`. |
| `src/lib/auth.ts` | 73-82 | Fire-and-forget email sends (`void send...`) with no rejection handler beyond console.error | Warning (WR-04, deferred) | Silent delivery failure if Resend throws; no retry/alert. Not a correctness bug in Phase 1; tracked for BullMQ/Inngest integration. |
| `src/app/actions/capability.ts` | 43-66 | `activateHosting`/`activateBooking` have no rate limit or audit trail | Warning (WR-06, deferred) | Acceptable in Phase 1 (flag alone has no financial effect); must be addressed before Phase 2 connects Stripe. |

No blockers from anti-pattern scan. All blockers from the code review (CR-01, CR-02) are fixed and confirmed by tests.

---

### Human Verification Required

> **UPDATE 2026-08-01 (v1.0 milestone audit) — items 1, 2 and 5 are DISCHARGED.**
> Three Playwright specs now cover exactly what these items asked for, and were re-run first-hand:
>
> | Item | Spec | Result |
> |---|---|---|
> | 1 — session persists across a browser restart | `e2e/login-persistence.spec.ts` (captures `storageState`, opens a **brand-new browser context** seeded with only those cookies, asserts the session is still valid) | ✅ passed (14.0s) |
> | 2 — forgot → reset → log in with the new password | `e2e/password-reset.spec.ts` (real UI flow; token read from the dev `verification` table) | ✅ passed (16.8s) |
> | 5 — mode-switch capability activation in a browser | `e2e/mode-switch.spec.ts` (host-capable user reaches the distinct `/host` surface; booker-only user is redirected away by the **server** gate) | ✅ passed (12.4s + 14.2s) |
>
> `npx playwright test e2e/login-persistence.spec.ts e2e/password-reset.spec.ts e2e/mode-switch.spec.ts`
> → **4 passed (33.7s)**.
>
> **Items 3, 4 and 6 remain open** — see the per-item notes below. One caveat worth stating on item 2:
> the spec proves the *flow*, not the *delivery*. Resend rejects `example.com` recipients
> (`validation_error 422`, observed in this run), so the spec reads the token from the database. Resend
> delivery itself is separately proven — Phase 6 delivered a real confirmation email (id `faa1481e`).

#### 1. Session persistence across browser sessions — ✅ DISCHARGED (`e2e/login-persistence.spec.ts`, 2026-08-01)

**Test:** Sign up with email/password, close the browser entirely, reopen and visit http://localhost:3000.
**Expected:** User is still logged in (session cookie persists); no redirect to /login.
**Why human:** Browser cookie lifetime requires a real browser session. Unit test asserts 30-day config; actual persistence on disk requires manual verification.

#### 2. Password reset email delivery and flow (Resend) — ✅ FLOW DISCHARGED (`e2e/password-reset.spec.ts`, 2026-08-01); real-inbox *delivery* still unrun

**Test:** Use the forgot-password page for a real account. With RESEND_API_KEY unset, check the console log for the `[email:dev]` link; follow it; set a new password; log in.
**Expected:** Reset link appears in console (dev mode); new password works; all other sessions for that account are revoked.
**Why human:** RESEND_API_KEY not yet configured. Unit test proves the full flow against a real DB (token capture via mocked Resend, reset, session revocation), but the actual console-log link path and the browser flow need a running app.

#### 3. Google OAuth sign-in (live credentials required) — ⚠️ STILL OPEN (`GOOGLE_CLIENT_ID`/`SECRET` absent from `.env.local`, re-checked 2026-08-01; not a v1 requirement)

**Test:** Click "Continue with Google" on signup or login; complete the Google OAuth flow.
**Expected:** User created/authenticated via Google; emailVerified=true; lands on post-login surface.
**Why human:** GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not yet configured. Unit test (oauth-verified.test.ts) proves D-08 mapping through Better Auth's internal adapter, but live browser OAuth requires real creds.

#### 4. Cloudinary avatar upload (live credentials required) — ⚠️ STILL OPEN (server-side `CLOUDINARY_*` secrets absent from `.env.local`, re-checked 2026-08-01)

**Test:** On the profile page, upload a photo.
**Expected:** Photo visible as avatar; avatarUrl and avatarPublicId written to the user row in DB.
**Why human:** CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET not yet configured. Unit test (avatar.test.ts) proves upload+persistence via mock, but the actual Cloudinary CDN upload requires real creds.

#### 5. Mode-switch UX — end-to-end capability activation in browser — ✅ DISCHARGED (`e2e/mode-switch.spec.ts`, 2026-08-01)

**Test:** (a) Sign up as a booker. Click "Start hosting" in the mode switch. (b) Sign up as a host. Click "Start booking".
**Expected:** The opposite capability flag is granted; both coexist; navigation succeeds to the new surface.
**Why human:** Client-side navigation and React state transition in ModeSwitch require a running browser. Unit tests verify the DB layer; the UI flow needs manual confirmation.

#### 6. Signup intent default — product intent confirmation — ⚠️ STILL OPEN (behavior verified; the product sign-off was never recorded. Shipped unchanged through nine phases = de-facto acceptance)

**Test:** Ask the product owner: when a user reaches signup without selecting an intent (e.g., via a direct API call or an edge case), should they default to booker (canBook=true)?
**Expected:** Product decision recorded — the `create.before` hook defaults to `canBook` when intent is absent/invalid.
**Why human:** The code behavior is verified (capability-escalation.test.ts proves canBook=true for an intent-less signup and no user is ever both-false). But whether "default to booker" is the correct product behavior for this edge case requires product sign-off before Phase 2.

---

### Gaps Summary

No automated gaps found. All four success criteria are satisfied by shipped code, verified by the test suite (54/54 passing), clean TypeScript (`tsc --noEmit`), and confirmed against the codebase directly. The two BLOCKER fixes from the code review (CR-01: rate-limit key correctness + regression test; CR-02: atomic capability grant via create.before hook) are present in code and proven by load-bearing tests.

Items requiring human verification are external-credential-dependent features (Google OAuth, Cloudinary, Resend live delivery) and one product-intent clarification, all of which are consistent with the credentials caveat in the verification request.

Deferred items (WR-04 fire-and-forget email reliability, WR-06 capability-activate rate limit + test coverage of the real actions) are pre-Phase-2 obligations tracked in the review document but do not block this phase's goal.

---

_Verified: 2026-06-03T18:55:00Z_
_Verifier: Claude (gsd-verifier)_
