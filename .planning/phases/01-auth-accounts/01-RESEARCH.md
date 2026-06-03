# Phase 1: Auth & Accounts - Research

**Researched:** 2026-06-03
**Domain:** Authentication, sessions, account/identity data model, project scaffold (Next.js 16 + Drizzle + Postgres 18 + Better Auth)
**Confidence:** HIGH (stack is locked in CLAUDE.md; all API shapes verified against Better Auth 1.6.14 docs + npm registry)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** A single account carries **explicit capability flags** (e.g. `can_book` / `can_host`) — real data on the account, not derived from whether a listing exists.
- **D-02:** Capability is **chosen at signup** — the user picks starting intent ("here to book" vs "here to host"). This sets the initial flag(s).
- **D-03:** The other capability can be **added later via an explicit activation step** ("Start hosting" / "Start booking"). Both capabilities can coexist on one identity.
- **D-04:** UI uses an **Airbnb-style mode switch** between booker and host contexts, with a **distinct host dashboard** as its own surface.
- **D-05:** Choosing "host" at signup only sets the capability flag and routes toward listing creation — it does **not** trigger Stripe payout onboarding (that is Phase 2).
- **D-06:** v1 supports **three sign-in methods**: email/password, **Google OAuth**, **Apple OAuth**.
- **D-07:** Email verification is a **soft gate**: users sign up + browse immediately; verification required before sensitive money/host actions. Phase 1 builds the verification email + `email_verified` flag; **enforcement happens in downstream phases**.
- **D-08:** OAuth (Google/Apple) accounts arrive with a **provider-verified email** — the soft gate primarily affects email/password signups.
- **D-09:** One profile per identity. **Public:** avatar (optional), first name (display name), short "About" bio, city/area (optional), "member since" (auto). **Private:** full name, email (login), phone (optional), password + connected accounts.
- **D-10:** Last name stays **private** (Airbnb pattern — only first name shown publicly).
- **D-11:** **Cloudinary** is the image provider for the avatar (reused by Phase 2 listing galleries).
- **D-12:** Sessions **persistent by default** — ~30-day sliding session, refreshed on activity, no "remember me" checkbox. Sessions in Postgres.
- **D-13:** A **password reset revokes all other active sessions**.

### Claude's Discretion
- Password strength rules, rate limiting / brute-force protection, reset-token TTL, CSRF/cookie hardening — apply Better Auth defaults + standard best practice.
- Exact schema shape for capability flags (two booleans vs a roles/capabilities set) — planner's call, as long as it satisfies D-01..D-03 and leaves room for an **admin role** later.
- Exact display-name fallback for OAuth signups that don't surface a first name.

### Deferred Ideas (OUT OF SCOPE)
- Richer profile fields (languages, work/school, identity-verification badges, emergency contact).
- Host bio / host-specific profile content (Phase 2).
- Image transforms/thumbnail pipeline beyond avatar (Phase 2).
- Account deletion, ToS acceptance at signup, 2FA (future hardening pass).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign up with email and password | Better Auth `emailAndPassword.enabled` + `signUp.email`; soft verification gate (D-07). See Standard Stack + Pattern 1. |
| AUTH-02 | User can log in and stay logged in across sessions | Better Auth `signIn.email` + `signIn.social`; session `expiresIn: 30d`, sliding via `updateAge` (D-12). Sessions persist in Postgres. See Pattern 3. |
| AUTH-03 | User can reset password via email link | `requestPasswordReset` → emailed link → `resetPassword`; `revokeSessionsOnPasswordReset: true` (D-13). See Pattern 4. |
| AUTH-04 | User can both book and host from one account | `additionalFields` capability flags (`can_book`/`can_host`) on the user table (D-01..D-03); mode-switch UI + host route group (D-04). See Pattern 2. |
| AUTH-05 | User can create/edit a basic profile (name, contact, optional photo) | Extend Better Auth user schema with profile fields via `additionalFields`; Cloudinary server-action avatar upload (D-09..D-11). See Pattern 5. |
</phase_requirements>

## Summary

This phase establishes the entire project scaffold **and** the identity layer every later phase hangs off. The stack is fully prescribed in CLAUDE.md and confirmed current: **Next.js 16.2.7 + React 19.2 + TypeScript**, **Drizzle ORM 0.45.2 / drizzle-kit 0.31.10** against **PostgreSQL 18** (run locally via the `postgis/postgis:18` Docker image — Docker 29.4 is installed and running; no local `psql`), **Better Auth 1.6.14** (Drizzle adapter, sessions in Postgres), **Cloudinary 2.10** for the avatar, **Resend 6.12** for the two transactional emails, **React Hook Form 7.77 + Zod 4.4** for forms/validation, and **shadcn/ui + Tailwind v4.3**.

Better Auth gives us the entire auth surface declaratively: email/password, Google/Apple OAuth, a four-table core schema (`user`/`session`/`account`/`verification`), the soft email-verification gate, password reset, and sliding sessions — all configured in one `auth` object. The two load-bearing decisions for the planner are: (1) the **capability/profile data model** is added via Better Auth's `additionalFields` on the user table (not a separate roles table for v1), keeping migrations single-sourced; and (2) the **migration workflow** is "Better Auth CLI `generate` emits/updates the auth schema → `drizzle-kit generate` → `drizzle-kit migrate`" — get this order wrong and the two tools fight over the same `schema.ts`.

**Primary recommendation:** Scaffold Next.js 16 → stand up Dockerized Postgres 18 + Drizzle → define the user/profile/capability schema as Better Auth `additionalFields` → wire Better Auth (email/password + **Google only** for v1; **defer Apple** — see recommendation) → soft verification + reset via Resend → Cloudinary server-action avatar upload → Airbnb-style mode switch with a host route group. **Defer Apple Sign In** out of Phase 1 (keep the `socialProviders.apple` slot ready) — its $99/yr account + domain verification + 6-month-expiring JWT client secret is real operational overhead that shouldn't block the foundation.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Credential check, session issue/validate | API / Backend (Better Auth route handler + `auth.api`) | Database (Postgres session table) | Never trust the client for auth; sessions are DB rows for instant revocation (D-13). |
| Capability flags (`can_book`/`can_host`) read/write | API / Backend (server action, `input:false` guarded) | Database (user row) | Privilege-bearing fields must be server-set, never client-settable at signup. |
| Soft email-verification flag | API / Backend (Better Auth) | Database (`email_verified` on user) | Flag is set server-side on link-click / OAuth; enforcement is later-phase server checks. |
| Password reset token + email | API / Backend (Better Auth `verification` table) + Resend | — | Token lives server-side; email is a side-effect, must not block/leak timing. |
| Avatar upload | API / Backend (server action → Cloudinary) | CDN (Cloudinary delivery) | Server holds the API secret; only the resulting URL/public_id is stored. |
| Profile read (public vs private projection) | Frontend Server (RSC) reads session, projects fields | Database | Public/private split (D-09/D-10) enforced at the query/projection layer, server-side. |
| Mode switch (booker/host) + host dashboard | Frontend Server (route groups / layouts) | Client (toggle UI) | Routing/layout concern; the capability *gate* is server-checked, the *switch* is UI. |

## Standard Stack

### Core
| Library | Version (verified npm 2026-06-03) | Purpose | Why Standard |
|---------|-----------------------------------|---------|--------------|
| next | 16.2.7 | Full-stack framework (App Router) | Locked stack. Server Components + server actions keep auth/profile logic server-side. `[VERIFIED: npm view next version]` |
| react / react-dom | 19.2.7 | UI library | Ships with Next 16; `useActionState`/`useFormStatus` power form flows. `[VERIFIED: npm]` |
| typescript | 5.7+ | Language | End-to-end types. `[CITED: CLAUDE.md]` |
| better-auth | 1.6.14 | Auth (email/pw, OAuth, sessions, reset, verification) | Locked. Peer deps confirm support for `next ^16`, `react ^19`, `drizzle-orm ^0.45.2`, `drizzle-kit >=0.31.4`. `[VERIFIED: npm view better-auth peerDependencies]` |
| drizzle-orm | 0.45.2 | Type-safe DB access | Locked. `postgres` (postgres.js) driver pairing. `[VERIFIED: npm]` |
| drizzle-kit | 0.31.10 | Migrations + Studio | Locked. `[VERIFIED: npm]` |
| postgres (postgres.js) | 3.4.9 | Postgres driver for Drizzle | Common Drizzle pairing; satisfies drizzle-orm peer `postgres >=3`. `[VERIFIED: npm]` |
| PostgreSQL | 18 (Docker `postgis/postgis:18`) | Primary DB | Locked. Docker 29.4 running locally. `[VERIFIED: docker info]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @better-auth/cli | bundled (`npx @better-auth/cli generate`) | Emit/sync the auth Drizzle schema from `auth` config | Run after any change to auth config / `additionalFields`. `[VERIFIED: npm — @better-auth/cli published]` |
| resend | 6.12.4 | Transactional email (verification + reset) | Both Phase-1 emails. `react`/`html`/`text` body. `[VERIFIED: npm]` |
| cloudinary | 2.10.0 | Avatar upload + delivery | Server-action upload via `uploader.upload_stream`; store `secure_url` + `public_id`. `[VERIFIED: npm]` |
| react-hook-form | 7.77.0 | Forms (signup, login, profile, reset) | `[VERIFIED: npm]` |
| zod | 4.4.3 | Shared client+server validation schemas | **Note: Zod 4 is current** (CLAUDE.md said "Zod 3.x" — outdated). See State of the Art. `[VERIFIED: npm]` |
| @hookform/resolvers | 5.4.0 | Bridge Zod ↔ RHF | Requires `react-hook-form ^7.55.0` (✓ 7.77). `[VERIFIED: npm view @hookform/resolvers peerDependencies]` |
| tailwindcss | 4.3.0 | Styling | shadcn/ui supports v4. `[VERIFIED: npm]` |
| shadcn/ui + Radix | latest (CLI init) | Form/dialog/input primitives | Signup/login/profile forms, mode-switch dropdown. `[CITED: CLAUDE.md]` |
| jose | latest | Apple client-secret JWT signing **(only if Apple is enabled)** | Needed for `generateAppleClientSecret`. Defer with Apple. `[CITED: better-auth.com/docs/authentication/apple]` |

### Dev / Test
| Tool | Version | Purpose |
|------|---------|---------|
| vitest | 4.1.8 | Unit/integration tests (capability transitions, reset→revoke, validation) `[VERIFIED: npm]` |
| @playwright/test | 1.60.0 | E2E (signup→login persistence, reset flow, mode switch) `[VERIFIED: npm]` |
| @testing-library/react | 16.3.2 | Component tests for forms `[VERIFIED: npm]` |
| drizzle-kit studio | (drizzle-kit) | DB browser during dev |
| Biome **or** ESLint+Prettier | latest | Lint/format (CLAUDE.md: either fine) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `additionalFields` flags for capabilities | Better Auth `admin`/roles plugin or a separate `roles` table | The plugin/roles table is heavier than needed for two booleans. **Recommend `additionalFields` for v1, but model it as a `role`-style enum field if you want the admin slot pre-carved** — see Pattern 2. `[ASSUMED]` for the "leaves room for admin" tradeoff. |
| Server-action Cloudinary upload (`upload_stream`) | Signed-client direct upload (`api_sign_request`) | For one small avatar, routing the file through the server action is simpler and keeps the secret server-side. Signed-client upload is the pattern to graduate to for **Phase 2 galleries** (many large images). `[CITED: cloudinary_npm docs]` |

**Installation (scaffold sequence):**
```bash
# 1. Scaffold (run in an empty dir; repo currently has only CLAUDE.md + .planning/)
npx create-next-app@latest fitout --typescript --tailwind --app --eslint
# 2. Data layer
npm install drizzle-orm postgres
npm install -D drizzle-kit
# 3. Auth
npm install better-auth
# 4. Email + image
npm install resend cloudinary
# 5. Forms + validation
npm install react-hook-form zod @hookform/resolvers
# 6. UI primitives
npx shadcn@latest init
# 7. Tests
npm install -D vitest @playwright/test @testing-library/react @vitejs/plugin-react
# 8. (Apple only, DEFERRED) npm install jose
```

> ⚠️ The repo is **not empty** (`CLAUDE.md`, `.planning/`, `.git`). Scaffold into a temp dir then move files in, OR run `create-next-app .` and resolve the prompt about the non-empty directory. Planner should make this an explicit, careful task — do not clobber `CLAUDE.md` or `.planning/`.

## Architecture Patterns

### System Architecture Diagram

```
                          ┌─────────────────────────────────────────────┐
   Browser (RHF + Zod)    │            Next.js 16 App Router             │
   signup/login/reset ───▶│                                             │
   profile/avatar forms   │  Server Components (RSC)                    │
        │                 │   └─ read session: auth.api.getSession()    │
        │ (client schema  │                                             │
        │  validates,     │  Server Actions ("use server")             │
        │  NEVER trusted) │   ├─ re-validate with same Zod schema       │
        ▼                 │   ├─ auth.api.signUpEmail / signInEmail     │
   POST /api/auth/[...all]─┼─▶ Better Auth handler (toNextJsHandler)    │
                          │   ├─ requestPasswordReset / resetPassword   │
                          │   └─ updateUser (profile, capability flags) │
                          │            │            │            │      │
                          └────────────┼────────────┼────────────┼──────┘
                                       │            │            │
                          ┌────────────▼──┐   ┌─────▼─────┐  ┌───▼────────┐
                          │ Postgres 18   │   │  Resend   │  │ Cloudinary │
                          │ user/session/ │   │ verify +  │  │ avatar     │
                          │ account/      │   │ reset     │  │ upload →   │
                          │ verification  │   │ emails    │  │ secure_url │
                          │ (+ profile/   │   └───────────┘  └────────────┘
                          │  capability   │
                          │  cols)        │   OAuth: Google (v1) ─┐
                          └───────────────┘   Apple (DEFERRED)    ▼
                                              redirect ↔ appleid.apple.com /
                                                         accounts.google.com
```

The single primary use case — **sign up with email/password, then stay logged in across browser sessions** — traces: form (client Zod) → server action → `auth.api.signUpEmail` (server re-validates) → row in `user` + `session` in Postgres → `nextCookies()` plugin writes the httpOnly session cookie → subsequent RSC reads via `auth.api.getSession()`. Component-to-file mapping is in the Project Structure + Component Responsibilities below.

### Recommended Project Structure
```
fitout/
├── docker-compose.yml          # postgis/postgis:18 local Postgres
├── drizzle.config.ts           # drizzle-kit config (schema path, DATABASE_URL)
├── .env.local                  # DATABASE_URL, BETTER_AUTH_SECRET, GOOGLE_*, RESEND_API_KEY, CLOUDINARY_*
├── src/
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts        # drizzle(postgres(DATABASE_URL)) instance
│   │   │   └── schema.ts       # Better-Auth-generated tables + profile/capability additionalFields
│   │   ├── auth.ts             # betterAuth({...}) server instance (the brain)
│   │   ├── auth-client.ts      # createAuthClient + inferAdditionalFields<typeof auth>()
│   │   ├── email.ts            # Resend client + sendVerificationEmail/sendResetPassword helpers
│   │   ├── cloudinary.ts       # cloudinary.config(...) + uploadAvatar() helper
│   │   └── validation/
│   │       ├── auth.ts         # Zod: signupSchema, loginSchema, resetSchema
│   │       └── profile.ts      # Zod: profileSchema (public/private fields)
│   ├── app/
│   │   ├── api/auth/[...all]/route.ts   # toNextJsHandler(auth) → GET, POST
│   │   ├── (auth)/                      # route group: signup, login, forgot/reset (logged-out)
│   │   │   ├── signup/page.tsx          # capability choice at signup (D-02)
│   │   │   ├── login/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx  # reads ?token=
│   │   ├── (app)/                       # booker context (logged-in)
│   │   │   ├── layout.tsx               # mode switch lives here
│   │   │   └── profile/page.tsx         # edit profile + avatar
│   │   ├── (host)/                      # DISTINCT host dashboard surface (D-04)
│   │   │   └── host/layout.tsx + page.tsx
│   │   └── actions/                     # "use server" actions: profile, avatar, activate-capability
│   └── middleware.ts                    # optimistic redirect via getSessionCookie (NOT the security boundary)
```

**Component Responsibilities (file → job):**
| File | Owns |
|------|------|
| `src/lib/auth.ts` | All Better Auth config: `emailAndPassword`, `socialProviders.google`, `emailVerification`, `session`, `user.additionalFields`, `account.accountLinking`, `plugins:[nextCookies()]`. Single source of truth. |
| `src/lib/db/schema.ts` | Drizzle tables. Better Auth CLI writes/updates auth tables here; you add `additionalFields` via auth config (CLI reflects them). Non-auth tables (none in Phase 1) go here too. |
| `app/api/auth/[...all]/route.ts` | Mounts Better Auth's HTTP endpoints. |
| `app/actions/*` | Server actions: re-validate with Zod, call `auth.api.*`, do Cloudinary upload, flip capability flags (server-only). |
| `middleware.ts` | Optimistic route protection only; real gate is per-page `auth.api.getSession()`. |

### Pattern 1: Email/password signup with soft verification (D-07)
**What:** Enable email/pw, keep verification **soft** (don't block sign-in), send a verification email anyway so the `email_verified` flag can flip later.
**When:** AUTH-01.
```typescript
// src/lib/auth.ts — Source: better-auth.com/docs/authentication/email-password + concepts/email
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { sendVerificationEmail, sendResetPassword } from "@/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,   // SOFT GATE (D-07): users sign in immediately
    minPasswordLength: 10,             // Claude's discretion; >= 8 recommended
    maxPasswordLength: 128,
    autoSignIn: true,                  // log them in right after signup
    resetPasswordTokenExpiresIn: 3600, // 1h (default); Claude's discretion
    revokeSessionsOnPasswordReset: true, // D-13 — DEFAULT IS false, must set explicitly
    sendResetPassword: async ({ user, url }) => {
      void sendResetPassword(user.email, url); // do NOT await — see Pitfall 4
    },
    onPasswordReset: async ({ user }) => {
      // optional audit hook
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void sendVerificationEmail(user.email, url); // do NOT await
    },
    // sendOnSignUp: true  // send the verify email at signup (soft gate keeps sign-in open)
  },
  // ... session, socialProviders, user.additionalFields below
  plugins: [nextCookies()], // MUST be last (Pitfall 1)
});
```

### Pattern 2: Capability flags + profile via `additionalFields` (D-01..D-03, D-09, AUTH-04/05)
**What:** Add capability + profile columns to the `user` table through Better Auth config. Two viable shapes; **recommend booleans + a separate nullable `role` for the future admin slot.**
**When:** AUTH-04, AUTH-05.
```typescript
// inside betterAuth({ ... user: { additionalFields: {...} } })
// Source: better-auth.com/docs/concepts/database (Extending Core Schema)
user: {
  additionalFields: {
    // --- Capabilities (D-01..D-03) ---
    canBook:  { type: "boolean", required: true,  defaultValue: false, input: false },
    canHost:  { type: "boolean", required: true,  defaultValue: false, input: false },
    // ^ input:false => clients CANNOT set these at signup (Pitfall 2 / privilege escalation).
    //   The signup server action sets the chosen flag server-side after creating the user.
    role:     { type: "string",  required: false, defaultValue: "user", input: false },
    // ^ leaves room for "admin" later (Claude's discretion item satisfied)

    // --- Profile: private (D-09/D-10) ---
    firstName:{ type: "string",  required: true  },   // public display name
    lastName: { type: "string",  required: false },   // PRIVATE (D-10)
    phone:    { type: "string",  required: false },

    // --- Profile: public (D-09) ---
    bio:      { type: "string",  required: false },   // "About"
    city:     { type: "string",  required: false },
    avatarUrl:{ type: "string",  required: false },   // Cloudinary secure_url
    avatarPublicId: { type: "string", required: false }, // for later delete/replace
    // NOTE: Better Auth's built-in `name`, `email`, `emailVerified`, `image`, `createdAt`
    // already exist on the core user table. "member since" = createdAt. Decide whether
    // to reuse `name`/`image` or your own firstName/avatarUrl (see Open Questions).
  },
},
```
The client must mirror these for type-safety:
```typescript
// src/lib/auth-client.ts — Source: better-auth.com/docs/concepts/typescript
import { createAuthClient } from "better-auth/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});
```
**Activate-later flow (D-03):** a server action calls `auth.api.updateUser({ body: { canHost: true }, headers })` — but because `canHost` is `input:false`, you set it via a **server-side privileged update** (or a small internal DB update), never from client input. The "Start hosting" button calls a dedicated server action that the server authorizes.

### Pattern 3: Persistent sliding session (D-12, AUTH-02)
**What:** 30-day session, refreshed on activity.
```typescript
// inside betterAuth({ ... })
// Source: better-auth.com/docs/reference/options (session) + concepts/session-management
session: {
  expiresIn: 60 * 60 * 24 * 30,  // 30 days (default is 7)
  updateAge: 60 * 60 * 24,        // slide/refresh once per day of activity (default 1d)
  // no "remember me" — always persistent (D-12)
},
```
Read it server-side anywhere:
```typescript
// Source: better-auth.com/docs/integrations/next
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
const session = await auth.api.getSession({ headers: await headers() });
```

### Pattern 4: Password reset that revokes other sessions (D-13, AUTH-03)
**What:** Email a reset link → user sets a new password → all sessions invalidated.
```typescript
// Client (forgot-password form) — Source: better-auth.com/docs/authentication/email-password
await authClient.requestPasswordReset({
  email,
  redirectTo: "/reset-password", // link lands here with ?token=...
});
// Client (reset-password page, reads ?token=)
await authClient.resetPassword({ newPassword, token });
```
**Critical:** revocation is driven by `emailAndPassword.revokeSessionsOnPasswordReset: true` in `auth.ts` (Pattern 1). It **defaults to `false`**. `resetPassword()` itself has **no** `revokeOtherSessions` argument (that arg only exists on `changePassword`). This is the #1 way D-13 silently fails. `[VERIFIED: better-auth.com/docs/authentication/email-password — default false]`

### Pattern 5: Cloudinary avatar via server action (D-09, D-11, AUTH-05)
**What:** Upload through the server action; store `secure_url` + `public_id` on the user row.
```typescript
// src/lib/cloudinary.ts — Source: cloudinary_npm docs (uploader.upload_stream)
import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // SERVER ONLY
});
export function uploadAvatar(buffer: Buffer, userId: string) {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "fitout/avatars", public_id: userId, overwrite: true,
        transformation: { width: 400, height: 400, crop: "fill", gravity: "face" } },
      (err, res) => (err || !res ? reject(err) : resolve(res as any))
    );
    stream.end(buffer);
  });
}
```
The avatar server action: parse `FormData`, validate (type/size) with Zod, `await uploadAvatar(buffer, session.user.id)`, then `auth.api.updateUser({ body: { avatarUrl, avatarPublicId }, headers })`.
> Phase-2 galleries (many large images) should graduate to **signed direct-to-Cloudinary client upload** via `cloudinary.utils.api_sign_request(...)` to keep files off your server. Note this seam now.

### Pattern 6: Google OAuth + (deferred) Apple slot (D-06, D-08)
```typescript
// inside betterAuth({ ... }) — Source: better-auth.com/docs/authentication/{apple,...}
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  },
  // apple: { ... }  // DEFERRED — see recommendation. Needs jose JWT + trustedOrigins.
},
account: {
  accountLinking: {
    enabled: true,
    trustedProviders: ["google"],   // auto-link by verified email
    updateUserInfoOnLink: true,
  },
},
```
**D-08 mechanism:** when a user authenticates via Google, Better Auth records `emailVerified` from the provider. Per the docs, **"Email and emailVerified are never changed"** on subsequent account links — so an OAuth-verified email cannot be silently overwritten. `[CITED: better-auth.com/docs/concepts/users-accounts]`

### Anti-Patterns to Avoid
- **Trusting client-set capability/role on signup** — always `input:false`; set server-side (Pitfall 2).
- **Treating `middleware.ts` as the security boundary** — `getSessionCookie` only checks cookie presence; the real check is `auth.api.getSession()` per page/action. The docs explicitly mark the cookie check "NOT SECURE." `[CITED: better-auth.com/docs/integrations/next]`
- **`await`-ing email sends inside `sendResetPassword`/`sendVerificationEmail`** — opens a timing side-channel and slows responses; fire-and-forget (Pitfall 4).
- **Hand-writing the auth tables** then also running the Better Auth CLI — they'll diverge (Pitfall 1).
- **Storing naive timestamps for "member since"** — use the DB `createdAt` (timestamptz) and render in the viewer's locale (Pitfall 5).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom bcrypt/scrypt wiring | Better Auth (scrypt by default) | Edge cases (salting, timing, params) are solved + audited. |
| Session storage & revocation | Custom JWT/cookie scheme | Better Auth sessions in Postgres | Instant revocation (D-13) needs server-side sessions; JWTs can't be revoked cleanly. |
| Reset/verify token lifecycle | Custom token table + expiry | Better Auth `verification` table + `requestPasswordReset` | TTL, single-use, enumeration-safe responses already handled. |
| OAuth dance (PKCE, state, token exchange) | Manual OAuth client | `socialProviders` config | Provider quirks (esp. Apple) are a tarpit. |
| Apple client secret | Manual JWT crafting | `jose` + Better Auth's documented generator | ES256, 180-day cap, `kid`/`iss`/`aud` exactness. |
| Email-enumeration-safe reset | Custom "user exists?" branching | Better Auth's uniform "if this email exists…" response | Better Auth already returns identical responses + dummy work. `[VERIFIED: requestPasswordReset source]` |
| Image upload/transform/CDN | Custom S3 + sharp pipeline | Cloudinary (`upload_stream` now, signed client later) | Resize/crop/face-gravity/CDN built in; reused Phase 2. |
| Transactional email infra | SMTP plumbing | Resend SDK | Deliverability + DX; seed of Phase 7 email layer. |

**Key insight:** Phase 1 is almost entirely *configuration* of audited primitives. The only bespoke code is the thin glue: server actions that re-validate with Zod and flip server-only flags. Every place you'd be tempted to "just write the auth bit yourself" is a known CVE class.

## Common Pitfalls

### Pitfall 1: Better Auth CLI vs hand-written Drizzle schema fighting over `schema.ts`
**What goes wrong:** You hand-edit auth tables, then `@better-auth/cli generate` rewrites them (or vice-versa), or `drizzle-kit generate` produces a migration that drifts from Better Auth's expected shape.
**Why:** Two generators, one schema file. Better Auth owns the auth-table *shape*; `additionalFields` is how you extend it.
**How to avoid:** Single source of truth = `auth.ts`. Workflow: edit auth config → `npx @better-auth/cli generate` (writes/updates `schema.ts` auth tables) → `npx drizzle-kit generate` (emits SQL migration) → `npx drizzle-kit migrate` (applies). Always run `generate` after touching `additionalFields`. `[CITED: better-auth.com/docs/adapters/drizzle + concepts/cli; WebSearch-verified workflow]`
**Warning signs:** `drizzle-kit` wants to drop/recreate `user`; runtime "column does not exist" from Better Auth.

### Pitfall 2: Capability/role privilege escalation at signup
**What goes wrong:** A user POSTs `canHost:true` (or `role:"admin"`) to the signup endpoint and self-grants capability.
**Why:** `additionalFields` are client-settable by default (`input` defaults `true`).
**How to avoid:** Set `input: false` on `canBook`/`canHost`/`role`; have the signup server action set the chosen flag server-side from a validated, constrained value. The framework throws `FIELD_NOT_ALLOWED` if a client tries to set an `input:false` field. `[VERIFIED: parseInputData source — throws on input:false]`
**Warning signs:** A user appears with `canHost:true` who never clicked "Start hosting."

### Pitfall 3: D-13 reset doesn't actually log out other devices
**What goes wrong:** Password reset works but old sessions stay valid.
**Why:** `revokeSessionsOnPasswordReset` **defaults to `false`**, and `resetPassword()` (the link flow) takes no revoke argument.
**How to avoid:** Set `emailAndPassword.revokeSessionsOnPasswordReset: true`. Add a test that asserts a pre-existing session is invalid after reset. `[VERIFIED: better-auth.com docs — default false]`
**Warning signs:** Test "old session token still authenticates after reset" passes when it should fail.

### Pitfall 4: Awaiting email send leaks timing / blocks the response
**What goes wrong:** `await sendEmail(...)` inside `sendResetPassword` makes the response time vary with whether the user exists / how fast the email provider is.
**Why:** Timing side-channel + serverless cold email calls.
**How to avoid:** Fire-and-forget (`void sendEmail(...)`); on serverless, use `waitUntil`. `[CITED: better-auth.com/docs/concepts/email]`

### Pitfall 5: "Member since" / timestamp timezone bugs
**What goes wrong:** "Member since June 2026" shows the wrong month near midnight UTC for some users.
**Why:** Rendering a UTC `createdAt` without converting to the viewer's zone, or storing naive timestamps.
**How to avoid:** Store `timestamptz` (Better Auth + Drizzle default to proper timestamps); render with `@date-fns/tz`. `[CITED: CLAUDE.md "What NOT to Use" — timestamptz]`

### Pitfall 6: Apple client-secret JWT silently expires
**What goes wrong:** Apple sign-in works for months, then breaks when the 180-day JWT expires.
**Why:** Apple caps the client secret at 6 months; it must be regenerated.
**How to avoid:** **Primary mitigation: defer Apple from Phase 1.** If/when added, generate the JWT at runtime with a short expiry and a regeneration/caching strategy, and document the renewal. `[CITED: better-auth.com/docs/authentication/apple — 180-day max]`

### Pitfall 7: `nextCookies()` not last → server-action logins don't set the cookie
**What goes wrong:** `signUpEmail`/`signInEmail` succeed in a server action but the user isn't actually logged in (no cookie).
**Why:** Server actions need Next's `cookies()` helper; `nextCookies()` wires that, and **must be the last plugin**.
**How to avoid:** `plugins: [/* others */, nextCookies()]`. `[CITED: better-auth.com/docs/integrations/next]`

### Pitfall 8: Scaffolding into a non-empty repo
**What goes wrong:** `create-next-app` refuses or risks overwriting `CLAUDE.md`/`.planning/`.
**How to avoid:** Scaffold to a temp dir and copy in, or run carefully in place and verify `CLAUDE.md` + `.planning/` are untouched and committed first.

## Code Examples

### Resend email helper (local-dev friendly)
```typescript
// src/lib/email.ts — Source: resend.com/docs/send-with-nextjs
import { Resend } from "resend";
const key = process.env.RESEND_API_KEY;
const resend = key ? new Resend(key) : null;
const FROM = process.env.EMAIL_FROM ?? "FitOut <onboarding@resend.dev>";

async function send(to: string, subject: string, html: string) {
  if (!resend) { console.log(`[email:dev] to=${to} ${subject}\n${html}`); return; } // local fallback
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) console.error("resend error", error);
}
export const sendVerificationEmail = (to: string, url: string) =>
  send(to, "Verify your FitOut email", `Verify: <a href="${url}">${url}</a>`);
export const sendResetPassword = (to: string, url: string) =>
  send(to, "Reset your FitOut password", `Reset: <a href="${url}">${url}</a>`);
```
> Local dev: with no `RESEND_API_KEY`, the link is **logged to the console** (satisfies the "log the link in dev" requirement). With a key but no verified domain, Resend's test mode only delivers to your own account email — fine for solo dev.

### Drizzle DB instance + config
```typescript
// src/lib/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
export const db = drizzle(postgres(process.env.DATABASE_URL!), { schema });
```
```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

### Local Postgres (docker-compose)
```yaml
# docker-compose.yml — Source: CLAUDE.md (postgis/postgis:18 to match prod extensions)
services:
  db:
    image: postgis/postgis:18
    environment:
      POSTGRES_USER: fitout
      POSTGRES_PASSWORD: fitout
      POSTGRES_DB: fitout
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes: { pgdata: {} }
```
> Use `postgis/postgis:18` even though Phase 1 needs no geo — it pre-installs PostGIS + makes `btree_gist` available for the Phase 3 exclusion constraint, so local matches prod from day one. `[CITED: CLAUDE.md Version Compatibility]`

### Shared Zod schema (client + server)
```typescript
// src/lib/validation/auth.ts
import { z } from "zod";
export const signupSchema = z.object({
  email: z.email(),                         // Zod 4 top-level z.email() (was z.string().email())
  password: z.string().min(10).max(128),
  firstName: z.string().min(1),
  intent: z.enum(["book", "host"]),         // D-02 capability choice; server maps to flag
});
export type SignupInput = z.infer<typeof signupSchema>;
```
> The **same** schema validates in the RHF form (via `@hookform/resolvers/zod`) and again at the top of the server action — never trust the client. `intent` maps server-side to `canBook`/`canHost` (which are `input:false`).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth/Auth.js v5 | **Better Auth** | Auth.js security-patch-only since Sept 2025 | CLAUDE.md mandates Better Auth; do not use NextAuth. `[CITED: CLAUDE.md]` |
| Zod 3 (`z.string().email()`) | **Zod 4** (`z.email()`, top-level formats) | Zod 4 GA; npm `latest` = 4.4.3 | CLAUDE.md says "Zod 3.x" but **Zod 4 is current**. Use Zod 4; minor API shifts (top-level `z.email()`, `.meta()`). `[VERIFIED: npm view zod version]` |
| `@hookform/resolvers` v3 | **v5.4.0** | current | Requires RHF ^7.55. `[VERIFIED: npm peerDeps]` |
| `pages/` API routes | App Router server actions + RSC | Next 13→16 | Forms via `useActionState`; closures encrypted in transit in Next 16. `[CITED: nextjs.org]` |
| Vitest 2 / Playwright 1.4x | Vitest 4.1.8 / Playwright 1.60 | current | Use current majors. `[VERIFIED: npm]` |

**Deprecated/outdated:**
- NextAuth/Auth.js for new projects (per CLAUDE.md + maintainers).
- Zod 3 idioms in new code (use Zod 4).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Two booleans + a nullable `role` field best satisfies "leaves room for admin" (vs. the Better Auth admin plugin or a roles table) | Stack Alternatives / Pattern 2 | Low — planner's explicit discretion (D); if an admin plugin is later preferred, the `role` column is forward-compatible. |
| A2 | Reusing `firstName`/`avatarUrl` custom fields rather than Better Auth's built-in `name`/`image` | Pattern 2 / Open Q1 | Low/Medium — minor rework if you'd rather map `name`→firstName and `image`→avatarUrl. Decide before writing schema. |
| A3 | `minPasswordLength: 10` and `resetPasswordTokenExpiresIn: 3600` as defaults | Pattern 1 | Low — explicitly Claude's discretion; security may refine. |
| A4 | Server-action Cloudinary upload (not signed-client) is right for a single Phase-1 avatar | Pattern 5 | Low — both verified; this is the simpler one and the seam to signed-client for Phase 2 is noted. |

## Open Questions

1. **Reuse Better Auth's built-in `name`/`image` columns, or add custom `firstName`/`avatarUrl`?**
   - Known: core `user` already has `name`, `image`, `email`, `emailVerified`, `createdAt`. D-10 wants only *first* name public; D-09 wants avatar.
   - Unclear: whether to store first name in `name` (and never collect last name into it) or add explicit `firstName`/`lastName`.
   - Recommendation: add explicit `firstName`/`lastName` (last name private per D-10) and a custom `avatarUrl`/`avatarPublicId`; leave `name`/`image` unused or set `name = firstName`. Cleaner public/private split. Planner decides at schema time.

2. **Apple Sign In: in Phase 1 or deferred?** — Covered below (recommend defer). Flagged here so the planner explicitly records the decision.

3. **Capability "activate later" endpoint shape** — a dedicated server action (`activateHosting`) vs. a guarded `updateUser`. Recommendation: dedicated server action that authorizes server-side and flips the `input:false` flag (keeps privilege logic in one place; D-03/D-05).

## Apple Sign In Recommendation: **DEFER from Phase 1** (build Google now, leave the Apple slot wired)

**Recommendation:** Ship email/password + **Google** OAuth in Phase 1. Add Apple in a small follow-up (late Phase 1 polish or alongside Phase 2) once a deployed domain exists. Keep the `socialProviders.apple` config slot present-but-commented and `jose` un-installed until then.

**Rationale / effort:**
- **Prerequisites Apple uniquely needs** (Google needs none of these): a **paid Apple Developer account (~$99/yr)**, a registered **Services ID**, **domain verification** (Apple serves a verification file you must host — needs a real, reachable domain, awkward on `localhost`), a **primary App ID**, a downloaded **`.p8` private key** (one-time download), plus **Team ID** and **Key ID**. `[VERIFIED: WebSearch + developer.apple.com]`
- **Ongoing burden:** the `clientSecret` is a **JWT you generate from the `.p8`** with `jose`, and Apple caps it at **180 days** — it must be regenerated/rotated or sign-in breaks silently (Pitfall 6). `[CITED: better-auth.com/docs/authentication/apple]`
- **Phase-1 cost of including it:** blocked on a paid account + a deployed verifiable domain before the *foundation* phase can complete — directly at odds with "establish the scaffold every later phase builds on."
- **Effort estimate:** Google ≈ **0.5–1 hr** (create OAuth client, paste 2 env vars, add 4 lines). Apple ≈ **half a day to a day** of mostly Apple-portal + domain-verification + JWT-rotation work, much of it not code.
- **Cost of deferring:** near-zero — the `socialProviders` map is additive; adding Apple later changes only `auth.ts` (+`jose`) and the login UI button. No schema or session changes; existing email/Google users are unaffected.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Everything | ✓ | v25.3.0 | — |
| npm | Install | ✓ | 11.7.0 | — |
| Docker (daemon running) | Local Postgres 18 | ✓ | 29.4.0 (desktop-linux) | — |
| `postgis/postgis:18` image | Local DB matching prod | ⬇ pull on first `docker compose up` | — | — |
| local `psql` client | optional DB inspection | ✗ | — | Drizzle Studio (`drizzle-kit studio`) or `docker compose exec db psql` |
| Resend API key | Real email delivery | ✗ (not set) | — | Dev fallback: **log link to console** (see email helper); test mode delivers to own email |
| Google OAuth creds | Google sign-in | ✗ (must create) | — | Email/password works without it |
| Apple creds (.p8, IDs, domain) | Apple sign-in | ✗ | — | **Deferred** — email/Google cover v1 |
| Cloudinary account/keys | Avatar upload | ✗ (must create) | — | Profile works without avatar (avatar is optional per D-09) |

**Missing dependencies with no fallback:** none block the core. Google/Cloudinary/Resend keys are free-tier signups the user must create (account-setup tasks, not code blockers).
**Missing with fallback:** local `psql` (use Drizzle Studio); Resend key (console-log links in dev); Apple (deferred).

## Validation Architecture

> nyquist_validation is enabled (config.json `workflow.nyquist_validation: true`).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 (unit/integration) + Playwright 1.60.0 (E2E) + @testing-library/react 16.3.2 (component) |
| Config file | none yet — **Wave 0** must create `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `npx vitest run` (unit/integration, < 30s) |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Email/pw signup creates a user; soft gate lets them sign in unverified | integration | `npx vitest run tests/auth/signup.test.ts` | ❌ Wave 0 |
| AUTH-02 | Login persists across "browser sessions" (cookie present, session valid after restart) | e2e | `npx playwright test e2e/login-persistence.spec.ts` | ❌ Wave 0 |
| AUTH-02 | Session is ~30d sliding (config asserts `expiresIn`/`updateAge`) | unit | `npx vitest run tests/auth/session-config.test.ts` | ❌ Wave 0 |
| AUTH-03 | requestPasswordReset → emailed token → resetPassword logs in with new pw | e2e/integration | `npx playwright test e2e/password-reset.spec.ts` | ❌ Wave 0 |
| AUTH-03/D-13 | After reset, a pre-existing session is **invalid** (revoke-others) | integration | `npx vitest run tests/auth/reset-revokes-sessions.test.ts` | ❌ Wave 0 |
| AUTH-04/D-02 | Signup with `intent:"host"` sets `canHost`, not `canBook` | integration | `npx vitest run tests/auth/capability-signup.test.ts` | ❌ Wave 0 |
| AUTH-04/D-03 | "Start hosting" activation flips `canHost` server-side; both can coexist | integration | `npx vitest run tests/auth/capability-activate.test.ts` | ❌ Wave 0 |
| AUTH-04 (security) | Client CANNOT set `canHost`/`role` at signup (`input:false` → FIELD_NOT_ALLOWED) | integration | `npx vitest run tests/auth/capability-escalation.test.ts` | ❌ Wave 0 |
| AUTH-04/D-04 | Mode switch routes to host dashboard; host routes gate on `canHost` | e2e | `npx playwright test e2e/mode-switch.spec.ts` | ❌ Wave 0 |
| AUTH-05 | Create/edit profile (firstName/bio/city/phone) persists; public/private projection correct | integration | `npx vitest run tests/profile/profile.test.ts` | ❌ Wave 0 |
| AUTH-05 | Avatar upload returns a Cloudinary URL stored on the user (mock Cloudinary) | integration | `npx vitest run tests/profile/avatar.test.ts` | ❌ Wave 0 |
| D-07 (soft gate) | Phase 1 does **not** block actions on `email_verified` (gate is non-enforced here) | integration | `npx vitest run tests/auth/soft-gate-noop.test.ts` | ❌ Wave 0 |
| D-08 | Google sign-in arrives with `emailVerified:true` (mock provider) | integration | `npx vitest run tests/auth/oauth-verified.test.ts` | ❌ Wave 0 |
| Shared | Zod schema rejects bad input identically client+server | unit | `npx vitest run tests/validation/auth-schema.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run` (relevant subset)
- **Per wave merge:** `npx vitest run && npx playwright test`
- **Phase gate:** full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` + `playwright.config.ts` (no test config exists — greenfield)
- [ ] `tests/setup.ts` + a test Postgres strategy (ephemeral DB via the same `postgis/postgis:18`, or a throwaway schema per run; migrate before tests)
- [ ] Shared fixtures: a `createTestUser()` helper, a Cloudinary mock, a Resend mock (capture the link), a mock OAuth provider for Google
- [ ] Framework install: `npm install -D vitest @playwright/test @testing-library/react @vitejs/plugin-react` + `npx playwright install`

## Security Domain

> security_enforcement enabled (ASVS level 1, block_on: high).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | **yes** | Better Auth email/pw (scrypt hashing), Google OAuth (PKCE/state handled by lib), min password length, rate limiting (below) |
| V3 Session Management | **yes** | Better Auth DB-backed sessions, httpOnly+secure+sameSite cookies (lib defaults), `expiresIn`/`updateAge`, revoke-on-reset (D-13) |
| V4 Access Control | **yes** | Capability flags server-set (`input:false`), per-page `auth.api.getSession()`; host routes gate on `canHost`; **admin slot via `role`** |
| V5 Input Validation | **yes** | **Zod 4** schemas, re-validated in every server action (never trust client) |
| V6 Cryptography | **yes** (don't hand-roll) | Password hashing + tokens via Better Auth; Apple JWT via `jose` (deferred); Cloudinary signing via SDK |
| V7 Error/Logging | partial | Enumeration-safe reset responses (built in); don't log secrets/tokens |

### Known Threat Patterns for {Next.js 16 + Better Auth + Postgres}
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Capability/role self-grant at signup | Elevation of Privilege | `additionalFields` `input:false`; server-set flags (Pitfall 2) |
| Account-enumeration via reset/login | Information Disclosure | Uniform "if this email exists…" responses (built in); fire-and-forget email (Pitfall 4) |
| Session fixation / stale session after reset | Spoofing | `revokeSessionsOnPasswordReset:true` (D-13, Pitfall 3) |
| CSRF on auth POSTs | Tampering | Better Auth origin checks + sameSite cookies; Next 16 encrypts server-action closures `[CITED: nextjs.org]` |
| Brute-force login / reset spam | DoS / Spoofing | Better Auth **rate limiting** — enable + tune `rateLimit` (verify defaults; Claude's discretion). `[ASSUMED: defaults exist — confirm in auth options at build time]` |
| SQL injection | Tampering | Drizzle parameterized queries (no raw string interpolation) |
| Secret leakage (Cloudinary/Resend/OAuth) | Info Disclosure | Server-only env vars; never expose `api_secret`/`clientSecret` to client; `.env.local` gitignored |
| Apple JWT expiry → auth outage | DoS | Defer Apple; when added, rotate the 180-day JWT (Pitfall 6) |

> **Gap to plan:** confirm Better Auth's `rateLimit` defaults and explicitly enable/tune login + reset rate limits (Claude's-discretion item). Confirm cookie flags (httpOnly/secure/sameSite) in the running app — they're lib defaults but should be asserted by a test or manual check.

## Sources

### Primary (HIGH confidence)
- `/better-auth/better-auth` (Context7, v1.6.x) — email/password, social providers (Google/Apple), session config, `additionalFields`/`inferAdditionalFields`, Drizzle adapter + generated schema, `nextCookies`, account linking, password reset endpoints/source
- better-auth.com/docs/authentication/email-password — `revokeSessionsOnPasswordReset` (default **false**), `onPasswordReset`, reset API signatures
- better-auth.com/docs/integrations/next — `toNextJsHandler`, `getSessionCookie` "NOT SECURE", `auth.api.getSession`, `nextCookies` last-plugin rule
- better-auth.com/docs/authentication/apple — `.p8`, Services ID, JWT client secret, **180-day** cap, trustedOrigins
- better-auth.com/docs/concepts/{database,users-accounts,email,session-management} — additionalFields, account linking ("email/emailVerified never changed"), no-await email guidance
- npm registry (`npm view … version`/`peerDependencies`, 2026-06-03) — all pinned versions + compatibility (better-auth peers: next ^16, react ^19, drizzle-orm ^0.45.2, drizzle-kit >=0.31.4)
- cloudinary_npm (Context7) — `uploader.upload_stream`, `utils.api_sign_request`
- resend.com/docs/send-with-nextjs — `emails.send` shape, `onboarding@resend.dev` test note
- `docker info` / `node -v` / `npm -v` — local environment (Docker 29.4 running, Node 25.3, no psql)
- CLAUDE.md — locked stack + "What NOT to Use" + version compatibility

### Secondary (MEDIUM confidence)
- WebSearch (Apple Sign In requirements; $99/yr; .p8 one-time download; 180-day JWT) — cross-checked with developer.apple.com + better-auth docs
- WebSearch (Better Auth CLI `generate` ↔ drizzle-kit workflow) — cross-checked with better-auth.com/docs/adapters/drizzle + concepts/cli
- WebSearch (Next.js 16 server actions / `useActionState` / encrypted closures) — cross-checked with nextjs.org

### Tertiary (LOW confidence / flagged)
- Better Auth `rateLimit` exact defaults — not pulled verbatim this session; confirm at build time (`[ASSUMED]` in Security Domain)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version verified against npm + peer-dep compatibility confirmed for the Better Auth ↔ Next 16 ↔ Drizzle 0.45 triad.
- Architecture / API shapes: HIGH — config keys and flows pulled from Better Auth 1.6.x docs/source (not training memory).
- Pitfalls: HIGH for the load-bearing ones (revoke-default-false, input:false escalation, nextCookies-last, Apple JWT) — each tied to a primary source.
- Apple recommendation: HIGH on the *facts* (cost/cap/domain verification), the defer call is a judgment recorded for the planner.
- `rateLimit` defaults: LOW — flagged for build-time confirmation.

**Research date:** 2026-06-03
**Valid until:** ~2026-07-03 (Better Auth, Drizzle, Next move fast; re-verify versions if planning slips a month)
