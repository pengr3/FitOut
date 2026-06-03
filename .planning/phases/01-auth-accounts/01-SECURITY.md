---
phase: 01
slug: 01-auth-accounts
status: verified
threats_total: 25
threats_closed: 25
threats_open: 0
asvs_level: 1
created: 2026-06-03
audited: 2026-06-03
auditor: gsd-security-auditor (claude-sonnet-4-6)
---

# Phase 01 — Auth & Accounts: Security Audit

> Per-phase security contract: threat register, accepted risks, and audit trail.
> State B audit — SECURITY.md did not previously exist; built from plan threat models and verified against implemented code.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Developer machine → Docker Postgres | Local DB credentials in .env.local (gitignored); container bound to localhost:5432 only | DATABASE_URL, throwaway creds (dev-only) |
| Repo → version control | Secrets must never be committed; only .env.example with empty values is tracked | All secret env vars |
| Browser form → signup/login/reset server actions | Untrusted email/password/intent/firstName crosses here; re-validated server-side with Zod | Credentials, intent, profile fields |
| Browser → intent field | intent maps to a capability flag — must be set server-side, never trusted as a direct canHost value | Capability grant |
| Browser → /host routes | Host surface must be gated server-side on canHost, not just hidden in UI | Privileged host access |
| Client → /api/auth/[...all] | Untrusted signup/login/reset input; never trust client-set fields | Credentials, session tokens |
| Client → signup additionalFields | Capability/role fields must be server-set only (input:false) | canBook, canHost, role |
| Server → Postgres | Sessions + credentials stored server-side for instant revocation | Session tokens, password hashes |
| Server → Resend/Cloudinary/Google | Secrets server-only; never exposed to client | API keys, OAuth secrets |
| Browser → profile/avatar server actions | Untrusted profile fields + uploaded file; re-validated + type/size-checked server-side | Profile data, file uploads |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-01-01 | Information Disclosure | .env.local secrets committed to git | mitigate | .gitignore covers .env, .env.local, .env*.local (lines 38-43); only .env.example committed | closed |
| T-01-02 | Tampering | Scaffold tooling overwrites CLAUDE.md / .planning/ | mitigate | Temp-dir scaffold strategy; git status verified unmodified (01-01-SUMMARY.md) | closed |
| T-01-03 | Information Disclosure | Local Postgres exposed beyond localhost | accept | Dev-only container bound to localhost:5432; throwaway creds; never used in prod | closed |
| T-01-04 | Tampering | Integration tests corrupt the dev database | mitigate | tests/helpers/db.ts: per-worker isolated schema (test_<pid>_<worker>_<n>), migrations applied directly, teardown drops schema | closed |
| T-02-01 | Elevation of Privilege | Capability/role self-grant at signup | mitigate | auth.ts:110-112 input:false on canBook/canHost/role; capability-escalation.test.ts asserts smuggled values are stripped | closed |
| T-02-02 | Spoofing | Stale session valid after password reset | mitigate | auth.ts:72 revokeSessionsOnPasswordReset:true; reset-revokes-sessions.test.ts proves pre-reset session becomes null | closed |
| T-02-03 | Information Disclosure | Account enumeration via reset/login timing or wording | mitigate | forgot-password/page.tsx:39-41 UNIFORM_MESSAGE constant shown regardless of result; email.ts fire-and-forget (void) removes timing side-channel | closed |
| T-02-04 | Tampering | CSRF on auth POSTs | mitigate | auth.ts:63 trustedOrigins:[BETTER_AUTH_URL]; nextCookies() last plugin (auth.ts:176); cookies observed HttpOnly+SameSite=Lax (01-02-SUMMARY.md:121) | closed |
| T-02-05 | Spoofing / DoS | Credential stuffing / brute-force login + reset spam | mitigate | auth.ts:165-173 bare-key customRules (/sign-in/email 5/60s, /sign-up/email 5/60s, /request-password-reset 3/60s, /reset-password 5/60s, /send-verification-email 3/60s); rate-limit.test.ts drives real auth.handler and proves our 5/60s rule overrides the built-in 3/10s default (4th request passes = our rule is active) | closed |
| T-02-06 | Information Disclosure | Password storage compromise | mitigate | Better Auth scrypt defaults (auth.ts); never hand-rolled | closed |
| T-02-07 | Information Disclosure | Cloudinary/Resend/Google secrets leaked to client | mitigate | cloudinary.ts:16 SERVER ONLY comment; all secrets are server-env only; .env.local gitignored | closed |
| T-02-08 | Spoofing | Session fixation / insecure cookies | mitigate | DB-backed sessions; nextCookies() last plugin (auth.ts:176); HttpOnly+SameSite=Lax confirmed (01-02-SUMMARY.md:121); Secure flag added automatically over HTTPS in production | closed |
| T-02-09 | Elevation of Privilege | Unverified email bypassing money/host actions | accept (residual) | D-07 soft gate intentional in Phase 1; requireEmailVerification:false (auth.ts:67); no money/host actions exist yet; enforcement deferred to Phases 2/4/6 | closed |
| T-03-01 | Elevation of Privilege | Intent tampered to set canHost directly | mitigate | auth.ts:139-148 databaseHooks.user.create.before sets capability from validated intent atomically (single insert — CR-02 fix); actions/auth.ts:48-66 threads validated intent server-side; input:false rejects direct canHost | closed |
| T-03-02 | Information Disclosure | Account enumeration via forgot-password | mitigate | forgot-password/page.tsx constant UNIFORM_MESSAGE; result of requestPasswordReset is ignored by the UI | closed |
| T-03-03 | Spoofing | Reset-token replay/reuse | mitigate | auth.ts:71 resetPasswordTokenExpiresIn:3600 (1h TTL); Better Auth tokens are single-use; revokeSessionsOnPasswordReset:true revokes other sessions on consumption | closed |
| T-03-04 | Tampering | CSRF on signup/login/reset | mitigate | "use server" directives on all server actions; trustedOrigins set (auth.ts:63); sameSite cookies; Next 16 encrypted server-action closures | closed |
| T-03-05 | Spoofing | OAuth state/CSRF on Google flow | mitigate | auth.ts:91-94 socialProviders.google uses Better Auth's built-in PKCE/state management; not hand-rolled | closed |
| T-03-06 | Information Disclosure | Validation errors leak field/account existence | mitigate | actions/auth.ts:79-86 generic error messages; forgot-password uniform message; Zod errors are field-format only | closed |
| T-04-01 | Elevation of Privilege | User self-grants canHost/canBook/role via activation/profile | mitigate | capability.ts:43-51,59-64 requires session then privileged db.update; input:false in auth.ts prevents client self-grant; capability-activate.test.ts asserts coexistence + input:false invariant | closed |
| T-04-02 | Elevation of Privilege | Host dashboard access without canHost (direct URL bypass) | mitigate | (host)/host/layout.tsx:21-33 getSession + redirect !canHost → /; e2e/mode-switch.spec.ts proves direct URL navigation is blocked | closed |
| T-04-03 | Information Disclosure | Private profile fields (lastName/email/phone) leaked publicly | mitigate | profile.ts:54-62 explicit allow-list publicProfile() returning only {avatarUrl, firstName, bio, city, createdAt}; profile.test.ts asserts PRIVATE_PROFILE_FIELDS are absent from public projection | closed |
| T-04-04 | Tampering / DoS | Malicious or oversized avatar upload | mitigate | avatar.ts:31-39 Zod avatarFileSchema validates image/* content-type and size <= 5MB before upload; Cloudinary transformation normalizes to 400x400; avatar.test.ts asserts rejections | closed |
| T-04-05 | Information Disclosure | Cloudinary api_secret exposed to client | mitigate | cloudinary.ts is server-only; avatar.ts is "use server"; only secure_url/public_id returned | closed |
| T-04-06 | Spoofing | Unauthenticated access to profile edit / capability actions | mitigate | (app)/layout.tsx:19-21 gates session; (host)/host/layout.tsx:21-24 gates session; capability.ts:33-36 gates session; profile.ts:33-36 gates session; avatar.ts:53-56 gates session | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-01-03 | Local Postgres container is bound to localhost:5432 with throwaway credentials (user:fitout / pass:fitout). This is a dev-only container; the credentials are public in docker-compose.yml by design. No production data ever touches this container. Risk is negligible for a single-developer local environment. If running in a shared dev environment, the container should be bound to 127.0.0.1 or protected by network policy. | gsd-security-auditor | 2026-06-03 |
| AR-02 | T-02-09 | The email-verification gate is intentionally soft in Phase 1: requireEmailVerification:false (auth.ts:67) allows sign-in without a verified email address. The verification email IS sent on signup and the emailVerified flag IS tracked in the user table, but sign-in is not blocked. Residual risk: an unverified user can access booking/host surfaces once they exist. Accepted because (a) no money or host actions exist in Phase 1 — the capability flags gate those surfaces, not email verification alone; (b) enforcement (block booking/publish on unverified) is explicitly planned for Phases 2/4/6 per CONTEXT.md D-07; (c) blocking sign-in in Phase 1 would break the soft-gate test (soft-gate-noop.test.ts) and the D-07 decision. This risk must be re-evaluated before Phase 2 ships real booking flows. | gsd-security-auditor | 2026-06-03 |

---

## Audit Notes

### T-02-05 — Rate Limiting (CR-01 Fix Verification)

The code review (CR-01) identified that the original customRules keys were mis-prefixed and silently inert. The fix (committed prior to this audit) changes the keys to bare endpoint paths matching Better Auth 1.6.14's `normalizePathname` behavior (stripping the `/api/auth` basePath before comparison). The corrected keys in auth.ts:165-173 are: `/sign-in/email`, `/sign-up/email`, `/request-password-reset`, `/reset-password`, `/send-verification-email`.

Verification methodology: `tests/auth/rate-limit.test.ts` drives the real production `auth.handler` (the same handler `toNextJsHandler` wraps at `/api/auth/[...all]`) with calibrated burst sequences. The distinguishing test sends exactly 4 sign-in requests — the built-in Better Auth 3/10s rule would throttle the 4th (429), but our 5/60s customRule must NOT throttle the 4th. The 4th request passing is positive proof that the bare-key customRule matched and overrode the default. A mis-prefixed or non-matching key collapses back to the built-in 3/10s cap and the 4th request returns 429, failing the test. The over-limit test (6 requests, 6th must be 429) confirms the upper bound also fires.

### T-02-04 / T-02-08 — Cookie Flags

Cookie flags are Better Auth library defaults. The specific flags (HttpOnly, SameSite=Lax) were confirmed by observing the `Set-Cookie` header in integration tests during plan execution (01-02-SUMMARY.md:121: `better-auth.session_token=...; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax`). The `Secure` flag is added by Better Auth automatically when the request is over HTTPS; it is correctly absent in local dev (http). The `trustedOrigins` setting (auth.ts:63) strengthens the CSRF origin check beyond cookie `sameSite` alone.

### T-03-01 — Atomic Capability Grant (CR-02 Fix Verification)

The code review (CR-02) identified a non-atomic two-step signup (signUpEmail then a separate db.update for the capability flag) that could strand a user created-but-flagless if the second write failed. The fix moves the capability grant into a `databaseHooks.user.create.before` hook (auth.ts:139-148) that sets the flag on the same inserted row — a single write. The `intent` field is threaded through the signUpEmail body as transport-only (not persisted as a column; canBook/canHost remain `input:false`). The `capability-escalation.test.ts` validates the absence-of-intent defaulting to the safe booker capability (canBook=true), ensuring no user is ever persisted with both flags false.

### Deferred / Informational Items (from 01-REVIEW.md, not blockers)

The following items from the code review were deferred and are NOT blockers for this audit:
- **WR-04**: Fire-and-forget email reliability (no retry/observability). Phase 1 risk: reset/verify emails may be silently lost in serverless cold-start scenarios. Deferred to a job-queue implementation (BullMQ/Inngest) in a later phase.
- **WR-06**: Capability-activate actions lack rate limiting and audit trail. Low blast radius in Phase 1 (no financial consequence yet); must be hardened before Phase 2 wires Stripe to `canHost`.
- **IN-01 through IN-05**: Informational items (duplicate-email error branching on message text, avatarPublicId/id in profile type, shadcn form guard ordering, kysely-adapter patch fragility, additionalFields type-cast duplication). None are security blockers at ASVS Level 1.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-03 | 21 | 21 | 0 | gsd-security-auditor (claude-sonnet-4-6) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log (AR-01: T-01-03 local Postgres; AR-02: T-02-09 soft email gate)
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-03
