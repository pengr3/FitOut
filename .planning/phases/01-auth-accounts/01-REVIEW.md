---
phase: 01-auth-accounts
reviewed: 2026-06-03T00:00:00Z
depth: standard
files_reviewed: 44
files_reviewed_list:
  - src/lib/auth.ts
  - src/lib/auth-client.ts
  - src/lib/db/index.ts
  - src/lib/db/schema.ts
  - src/lib/email.ts
  - src/lib/cloudinary.ts
  - src/lib/profile.ts
  - src/lib/validation/auth.ts
  - src/lib/validation/profile.ts
  - src/middleware.ts
  - src/app/api/auth/[...all]/route.ts
  - src/app/actions/auth.ts
  - src/app/actions/avatar.ts
  - src/app/actions/capability.ts
  - src/app/actions/profile.ts
  - src/app/(auth)/layout.tsx
  - src/app/(auth)/signup/page.tsx
  - src/app/(auth)/login/page.tsx
  - src/app/(auth)/forgot-password/page.tsx
  - src/app/(auth)/reset-password/page.tsx
  - src/app/(app)/layout.tsx
  - src/app/(app)/profile/page.tsx
  - src/app/(app)/profile/profile-form.tsx
  - src/app/(host)/host/layout.tsx
  - src/app/(host)/host/page.tsx
  - src/components/mode-switch.tsx
  - src/components/ui/form.tsx
  - scripts/patch-kysely-adapter.mjs
  - tests/auth/session-config.test.ts
  - tests/auth/reset-revokes-sessions.test.ts
  - tests/auth/capability-escalation.test.ts
  - tests/auth/capability-signup.test.ts
  - tests/auth/capability-activate.test.ts
  - tests/auth/soft-gate-noop.test.ts
  - tests/auth/signup.test.ts
  - tests/auth/oauth-verified.test.ts
  - tests/profile/profile.test.ts
  - tests/profile/avatar.test.ts
  - tests/validation/auth-schema.test.ts
  - tests/helpers/auth.ts
  - tests/helpers/db.ts
  - tests/helpers/mocks.ts
  - tests/setup.ts
  - e2e/login-persistence.spec.ts
  - e2e/password-reset.spec.ts
  - e2e/mode-switch.spec.ts
findings:
  critical: 2
  warning: 7
  info: 5
  total: 14
status: issues_found
resolution:
  resolved: [CR-01, CR-02, WR-01, WR-02, WR-03, WR-05, WR-07]
  deferred: [WR-04, WR-06, IN-01, IN-02, IN-03, IN-04, IN-05]
  resolved_at: 2026-06-03
  note: "2 Blockers + 5 Warnings fixed atomically (commits aea0f5c, 80796a1, 5113188, d36b481, abd6157, 3c85922, fc8b4f5, 08f8a99); full suite 54/54 + build green. Remaining 2 Warnings (email-send reliability, activate-action rate-limit/audit) + 5 Info deferred to a tracked follow-up."
---

# Phase 1: Code Review Report

> **Resolution (2026-06-03):** Both Blockers (CR-01 rate-limit path keys + regression test; CR-02 atomic capability grant via create.before hook) and 5 Warnings (WR-01/02/03/05/07) were fixed and committed atomically. Full suite **54/54** green, `tsc` clean, `next build` clean. Deferred: WR-04 (fire-and-forget email reliability — needs job/observability), WR-06 (rate limit/audit on capability-activate server actions), and all 5 Info items. Run `/gsd-code-review-fix 01` to address the remainder.

**Reviewed:** 2026-06-03T00:00:00Z
**Depth:** standard
**Files Reviewed:** 44
**Status:** issues_found

## Summary

This is the auth & accounts foundation for a real-money marketplace. The core security architecture is sound and several high-risk invariants are implemented correctly: capability flags (`canBook`/`canHost`/`role`) are `input:false` so clients cannot self-grant at signup or via `updateUser`; the `/host` route group gates server-side on `canHost` via `getSession` in the layout (with defense-in-depth re-check in the page); every mutating server action re-validates with the shared Zod schema and resolves the target user from the session cookie (no client-supplied user id); `publicProfile()` is an explicit allow-list that drops every private field; `revokeSessionsOnPasswordReset:true` is set explicitly; and `.env.local` is gitignored (only `.env.example` is committed — no leaked secrets).

However, two BLOCKER-level defects undermine the threat model the phase claims to satisfy:

1. **Rate limiting is mounted on the wrong path namespace and is silently inert** — the `customRules` keys omit the `/api/auth` mount prefix used by Better Auth's matcher, so the credential-stuffing / reset-spam protection (threat T-02-05) does not actually apply to the live endpoints. The global 100-req/10s default is the only limit in effect.
2. **The signup capability grant is non-atomic AND swallows a partial-failure path** — `signUpEmail` creates+logs-in the user, then a *separate* DB UPDATE sets the chosen flag; if that UPDATE throws, the user is left created, authenticated, and with NO capability, and the catch block reports a generic "could not create your account" even though the account WAS created (also a duplicate-signup hazard).

A cluster of WARNING-level issues follow: HTML injection into outbound email bodies, reset/verification links logged to console in the dev fallback, missing Better Auth `secret`/`baseURL` config, fire-and-forget email error-swallowing, the profile action coercing optional fields to `""` rather than clearing them, and several tests that assert reproduced behavior rather than the actual production code path.

## Critical Issues

### CR-01: Rate-limit `customRules` keys miss the `/api/auth` mount prefix — credential-stuffing/reset-spam protection is inert

**File:** `src/lib/auth.ts:105-114`
**Issue:** The auth handler is mounted at `/api/auth/[...all]` (`src/app/api/auth/[...all]/route.ts`), so every Better Auth endpoint is reached at `/api/auth/sign-in/email`, `/api/auth/request-password-reset`, etc. Better Auth's rate-limiter matches the incoming request path against the `customRules` keys. The keys here are written as bare endpoint paths (`"/sign-in/email"`, `"/request-password-reset"`, `"/forget-password"`, `"/reset-password"`, `"/send-verification-email"`) with no `/api/auth` prefix and no leading-segment wildcard. Depending on whether the limiter sees the full request path or the path relative to `basePath`, these literal keys will not match the live routes, so the tightened windows (5/60s sign-in, 3/60s reset) never engage and only the global 100-req/10s default applies. The phase explicitly claims these rules mitigate threat T-02-05 (credential stuffing + reset spam) — that mitigation is not actually in force. No test exercises an over-limit request, so this passed review silently.

Additionally, the endpoint name for request-reset is inconsistent: Better Auth's email/password plugin exposes `/request-password-reset` (newer) and historically `/forget-password`; shipping both keys suggests uncertainty about the real path, which is exactly the symptom of an unverified matcher.

**Fix:** Verify the exact matched path against the running server (e.g. hit `/api/auth/sign-in/email` repeatedly and confirm a 429), then key the rules to whatever the limiter actually matches. With the standard mount that is the path *including* the base, e.g.:
```ts
customRules: {
  "/api/auth/sign-in/email": { window: 60, max: 5 },
  "/api/auth/sign-up/email": { window: 60, max: 5 },
  "/api/auth/request-password-reset": { window: 60, max: 3 },
  "/api/auth/reset-password": { window: 60, max: 5 },
  "/api/auth/send-verification-email": { window: 60, max: 3 },
},
```
Add an integration test that fires N+1 sign-in attempts and asserts the (N+1)th returns 429 — a config-only assertion (like `session-config.test.ts`) is insufficient because it cannot detect a non-matching key.

### CR-02: Signup capability grant is non-atomic and the catch block misreports a partial success

**File:** `src/app/actions/auth.ts:49-82`
**Issue:** `signup()` performs two independent writes that are NOT in a transaction:
1. `auth.api.signUpEmail(...)` — creates the user, and because `autoSignIn:true` + `nextCookies()`, also issues a session and sets the httpOnly cookie.
2. `db.update(user).set({ canHost|canBook: true })` — the privileged capability flip.

If step 2 throws (DB blip, connection drop, constraint), control falls into the `catch` at line 71. The user is now **created, authenticated (cookie set), and has neither `canBook` nor `canHost`** — a structurally invalid account for a marketplace whose every surface is capability-gated. Worse, the catch returns the generic `"Could not create your account. Please try again."` (line 81) — but the account *was* created, so the client believes signup failed while it actually half-succeeded. A retry then hits the duplicate-email path and the user is told the email "may already exist," leaving them stranded with an account they cannot use and cannot recreate. The `intent` ("host"/"book") the user chose is silently lost. This directly threatens the phase's D-02 capability-assignment guarantee.

There is also a narrower correctness concern: because step 1 establishes the session before step 2 runs, anything that reads `session.user.canHost` between the two writes sees `false`. (Better Auth's default `getSession` re-reads the user row per call with no cookie cache here, so the subsequent `/host` layout read will see the committed `true` — but this only holds as long as session cookie-caching is never enabled. If `session.cookieCache` is added later, the stale-capability redirect-loop becomes live.)

**Fix:** Make the create-then-grant atomic, or move the capability set into the user-creation hook so a single row write carries the flag. Minimal hardening without a transaction: on capability-update failure, surface a distinct, recoverable error AND treat the account as existing (do not claim it failed). Preferred:
```ts
// Set the capability inside a DB transaction; on failure, the whole signup is reported failed
// (and ideally the just-created user is rolled back / cleaned up so a retry can succeed).
await db.transaction(async (tx) => {
  await tx.update(user)
    .set(intent === "host" ? { canHost: true } : { canBook: true })
    .where(eq(user.id, userId));
});
```
Better still, set the flag via a Better Auth `databaseHooks.user.create.before` hook (server-trusted, single insert) so there is no second write to fail. Add a test that asserts a user is never persisted with both capabilities false after `signup()`.

## Warnings

### WR-01: Unsanitized `url` interpolated into outbound email HTML (HTML/attribute injection)

**File:** `src/lib/email.ts:28-32`
**Issue:** `sendVerificationEmail`/`sendResetPassword` build the email body with `` `Verify: <a href="${url}">${url}</a>` `` — `url` is dropped raw into both an HTML attribute and HTML text. The `url` originates from Better Auth's configured callback/redirect handling, and `requestPasswordReset({ redirectTo })` is client-influenced. If a `redirectTo`/callback value containing `"`, `<`, or `>` ever reaches this string, it breaks out of the `href` attribute or injects markup into the email — a stored/reflected injection into a channel users are trained to trust. Even if Better Auth currently encodes the token, relying on an upstream library to pre-escape content you concatenate into HTML is fragile.

**Fix:** HTML-escape the URL before interpolation (escape `&`, `<`, `>`, `"`, `'`), or build the message with a templating layer (React Email, already in the recommended stack) that escapes by default:
```ts
function esc(s: string) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
          .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
const safe = esc(url);
return send(to, "Reset your FitOut password", `Reset: <a href="${safe}">${safe}</a>`);
```

### WR-02: Dev fallback logs full verification/reset links (and recipient) to the console

**File:** `src/lib/email.ts:18-26`
**Issue:** When `RESEND_API_KEY` is unset, `send()` logs the entire email — including the single-use reset/verification link with its live token and the recipient address — via `console.log("[email:dev] ...")`. This is intended for local dev, but there is no guard tying it to `NODE_ENV !== "production"`. If a production deploy is ever missing `RESEND_API_KEY` (a common misconfiguration), every password-reset token is written to production logs in cleartext, where anyone with log access can complete an account takeover. Token-bearing URLs in logs are a recognized credential-leak class.

**Fix:** Gate the console fallback on a non-production environment and fail loudly (or no-op) in production:
```ts
if (!resend) {
  if (process.env.NODE_ENV === "production") {
    console.error("RESEND_API_KEY missing in production; email NOT sent.");
    return;
  }
  console.log(`[email:dev] to=${to} ${subject}\n${html}`);
  return;
}
```

### WR-03: Better Auth `secret` and `baseURL` are not configured

**File:** `src/lib/auth.ts:34-118`
**Issue:** The `betterAuth({...})` config sets no `secret` and no `baseURL`/`trustedOrigins`. Better Auth derives its signing/encryption secret from `BETTER_AUTH_SECRET` (or falls back to a development default if absent) and its base URL from env. If `BETTER_AUTH_SECRET` is not present in the deploy environment, sessions/tokens are signed with a weak/known default, undermining session integrity for a money-handling app — and this is invisible at the code level because it is purely env-driven with no fail-closed check. Likewise, omitting `baseURL`/`trustedOrigins` can break OAuth redirect/CSRF origin validation in production. Nothing in the reviewed config or tests asserts the secret is set.

**Fix:** Reference the secret explicitly and fail closed if missing in production, and set the base URL:
```ts
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,            // throw at boot if undefined in prod
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
  ...
});
```
Add a startup assertion (or zod env-parsing module) that throws when `BETTER_AUTH_SECRET`/`DATABASE_URL`/OAuth creds are absent, rather than relying on `!` non-null assertions (`db/index.ts:5`, `auth.ts:64-65`) that defer the failure to first use.

### WR-04: Fire-and-forget email send swallows errors and detaches from the request

**File:** `src/lib/auth.ts:45-47, 52-54` and `src/lib/email.ts:24-25`
**Issue:** Both `sendResetPassword` and `sendVerificationEmail` are invoked as `void send...` (no `await`). The comment justifies this as a timing side-channel / latency mitigation, which is reasonable for enumeration resistance — but the consequence is that a thrown rejection from the async `send()` becomes an unhandled promise rejection detached from the request lifecycle, and `email.ts` only `console.error`s Resend API errors without any retry, alerting, or dead-letter. In a serverless/edge context the function may return and freeze before the microtask runs, so the email is silently never sent and the user never gets their reset/verify link — a real reliability gap for the AUTH-03 recovery flow, with zero observability. The recommended stack lists BullMQ/Inngest for exactly this (durable async email); none is used.

**Fix:** At minimum, attach a rejection handler so a failure is logged with context: `void send(...).catch((e) => console.error("verify email failed", e));`. Better: enqueue the send on the durable job system (Inngest/BullMQ) so delivery is retried and observable, keeping the auth response fast without losing the email.

### WR-05: Profile update coerces cleared optional fields to empty string instead of NULL

**File:** `src/app/actions/profile.ts:54-64`
**Issue:** The action writes `lastName: lastName ?? ""`, `phone: phone ?? ""`, `bio: ...`, `city: ...`. When a user clears a field, the column is set to `""` rather than `NULL`. The schema columns are nullable text (`schema.ts:28-31`) and `publicProfile()`/UI treat `null` as "absent." Storing `""` muddies the absent-vs-empty distinction: `formatMemberSince` and avatar fallbacks key off truthiness elsewhere, and downstream "has the host completed their profile?" checks (Phase 2 payouts will care about `lastName`/`phone`) will see a non-null empty string as "present." The inline comment claims `""` "clears rather than leaving stale values," but it does not clear to NULL. This is a data-quality defect that will surface as subtle bugs once other features read these fields.

**Fix:** Normalize empty/whitespace optionals to `null` before persisting:
```ts
const clean = (v?: string) => { const t = v?.trim(); return t ? t : null; };
await auth.api.updateUser({
  body: { firstName, lastName: clean(lastName), phone: clean(phone),
          bio: clean(bio), city: clean(city) },
  headers: requestHeaders,
});
```

### WR-06: `requireUserId()` authorizes but does not re-confirm the capability being granted, and `activate*` actions have no rate limit / confirmation

**File:** `src/app/actions/capability.ts:33-66`
**Issue:** `activateHosting()`/`activateBooking()` correctly require a session before flipping a flag, and the `input:false` guard prevents client-set flags — that part is sound. The gap is that these privileged escalation endpoints (a user gaining the host capability that later unlocks payouts/Stripe onboarding in Phase 2) are server actions with no rate limiting, no CSRF-beyond-cookie consideration, and no audit trail. A logged-in session can call `activateHosting()` unboundedly. For Phase 1 the blast radius is small (the flag alone does nothing financial yet), so this is a WARNING, but it should be hardened before Phase 2 wires Stripe to `canHost`. There is also no test that drives the *actual* `activateHosting`/`activateBooking` server actions — the capability-activate test (`tests/auth/capability-activate.test.ts:54-59`) reproduces a bare `db.update(...)` instead of calling the exported action, so a regression inside the real action (e.g. someone adding `canBook:false` reset, or removing the session check) would not be caught.

**Fix:** Add an integration test that imports and invokes the real `activateHosting`/`activateBooking` actions (mocking `headers()`/`getSession`) and asserts (a) no-session is rejected, (b) the target flag flips, (c) the other flag is untouched. Before Phase 2, add an audit-log write and consider requiring an explicit confirmation step for host activation.

### WR-07: Several security-invariant tests assert reproduced logic, not the production code path

**File:** `tests/auth/capability-signup.test.ts:33-54`, `tests/auth/capability-activate.test.ts:54-59`, `tests/profile/profile.test.ts:62-79`, `tests/profile/avatar.test.ts:70-78`
**Issue:** Multiple tests explicitly re-implement the action's behavior against the test DB instead of exercising the shipped server action, with comments like "we reproduce the action's two steps here rather than importing the server action." The escalation guard test (`capability-escalation.test.ts`), the `input:false` config assertion, the `publicProfile` projection test, and the avatar Zod-guard test ARE genuine and load-bearing — those correctly defend the core invariants. But the *mapping* tests (intent→flag, activate→flag, profile persistence, avatar persistence) prove that "a `db.update` writes the column," which is a test of Drizzle, not of `signup()`/`activateHosting()`/`updateProfile()`/`uploadAvatarAction()`. If someone inverts the intent mapping in `auth.ts` (`host` → `canBook`), edits the profile action to drop a field, or breaks the avatar action's session gate, these tests stay green. The phase's claim that the tests "go red if the corresponding line is removed" is true for the config/projection tests but NOT for these reproduction tests.

**Fix:** Add at least one test per action that imports the real exported function and drives it with a mocked session (`vi.mock("next/headers")` + a stubbed `auth.api.getSession`), asserting the action's own logic (correct flag chosen, session gate enforced, validation rejection path). Keep the reproduction tests as data-layer coverage if desired, but they cannot substitute for testing the action.

## Info

### IN-01: `signup` duplicate-email branch relies on regex over an error message (brittle + mild enumeration)

**File:** `src/app/actions/auth.ts:74-80`
**Issue:** Duplicate-email detection is `/exist|already|unique/i.test(message)` against the thrown error's stringified message. This couples behavior to Better Auth's human-readable wording (a library upgrade changing the message silently breaks the branch), and the resulting "An account with that email may already exist" message is itself a (soft) account-existence oracle that partially undercuts the anti-enumeration posture maintained elsewhere (login uses a fully generic message).
**Fix:** Branch on the Better Auth `APIError` code/status rather than message text, and consider whether the "already exists" hint is worth the enumeration trade-off given the rate-limit gap in CR-01.

### IN-02: `publicProfile` accepts `id`/`avatarPublicId` in its input type — keep the deny-list test as the guard

**File:** `src/lib/profile.ts:15-62`
**Issue:** The allow-list projection is correct and is the right pattern. Minor: `ProfileUser` includes `avatarPublicId` and `id`, and `PRIVATE_PROFILE_FIELDS` lists `avatarPublicId` but not `id`. `id` is arguably acceptable to expose, but it is neither in the allow-list output nor flagged private, so the intent is ambiguous. The `profile.test.ts` key-equality assertion (`Object.keys(pub)` is exactly the five public keys) is the real guard and it is solid.
**Fix:** Decide explicitly whether a public user `id` may be exposed (often needed for "view profile" links) and document it; no code change strictly required.

### IN-03: `useFormField` references context before its own null-guard (dead guard)

**File:** `src/components/ui/form.tsx:44-55`
**Issue:** `useFormState`/`getFieldState` use `fieldContext.name` (lines 48-49) before the `if (!fieldContext) throw ...` guard (line 51). `React.createContext({} as ...)` never yields a nullish value, so the guard is dead code and the early access is harmless — but the ordering is misleading. This is generated shadcn/ui boilerplate (out of primary scope) noted only for completeness.
**Fix:** Move the guard above the context-dependent calls, or remove it since the default context is always an object.

### IN-04: `patch-kysely-adapter.mjs` is reasonable but its regex rewrite is fragile to upstream formatting

**File:** `scripts/patch-kysely-adapter.mjs:40-57`
**Issue:** The postinstall patch is behavior-preserving in intent: it removes two names that `kysely@0.29` no longer exports from dead SQLite-dialect modules and re-declares them as local consts with the documented default values (`"kysely_migration"` / `"kysely_migration_lock"`). It is idempotent (MARKER guard) and scoped to `sqlite-dialect*.mjs` files the Postgres/Drizzle path never executes, so the runtime risk is low. The fragility: the regex only handles `import { ... } from "kysely"` with double quotes and a single brace group; a minified or single-quoted/multiline import in a future adapter release would silently not match, the patch would report success while leaving the broken import, and dev/build would break again. Patching `node_modules` on postinstall is also inherently brittle across lockfile/version bumps.
**Fix:** Pin the `@better-auth/kysely-adapter`/`kysely` versions this patch targets and add a guard that errors (non-zero exit) if a target file still contains a bare `DEFAULT_MIGRATION_TABLE` import from kysely after patching, so a silent mismatch fails CI rather than reaching dev. Prefer an upstream fix or a `patch-package` patch (version-locked) over a hand-rolled regex when feasible.

### IN-05: `(app)` and `/host` layouts cast `session.user` with `as` instead of typing additionalFields

**File:** `src/app/(app)/layout.tsx:24-27`, `src/app/(host)/host/layout.tsx:26-29`, `src/app/(app)/profile/page.tsx:22-29`, `src/app/(host)/host/page.tsx:18-21`
**Issue:** Every server component widens `session.user` with an inline `as typeof session.user & { canHost?: boolean; ... }` cast and then reads `u.canHost ?? false`. The capability gate's correctness depends on these fields actually being present on the session — but the `?? false` / `?:` optionality means a typo'd or absent field silently degrades to "no capability" (fails closed, which is safe here) OR, if a field were renamed, the gate would silently always-deny without a compile error. The repeated cast is duplicated in four files.
**Fix:** Have the client/server infer additionalFields properly (the `auth-client.ts` already uses `inferAdditionalFields`; the server `getSession` return type can be typed once) and export a small `getSessionUser()` helper returning a typed user, so the capability fields are compile-checked in one place rather than re-cast per file.

---

_Reviewed: 2026-06-03T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
