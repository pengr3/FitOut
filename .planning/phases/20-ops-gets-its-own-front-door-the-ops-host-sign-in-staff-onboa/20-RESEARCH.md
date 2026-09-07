# Phase 20: Ops Gets Its Own Front Door — the `ops.` Host, Sign-In & Staff Onboarding - Research

**Researched:** 2026-09-08
**Domain:** Next.js 16 host partitioning, Better Auth multi-host authentication, transactional staff invitations, and ops access-control invariants
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Ops sign-in and recovery

- **D-01:** The ops sign-in page offers **email and password only**. It has no Google control and no
  public staff-signup link; staff onboarding begins only from an invitation.
- **D-02:** The screen is **clearly FitOut Ops but structurally familiar**: reuse the established auth
  card, field, validation and button patterns, while giving it a distinct `FitOut Ops` identity.
  The copy is plain and explicit: `FitOut Ops` and `Sign in with your staff account.` It makes no
  security boast and carries no marketplace-oriented signup language.
- **D-03:** Password recovery is the sign-in card's **only secondary route**. The request page,
  email link, password-reset page and return to sign-in all remain on the ops host; the journey must
  not create a marketplace session.
- **D-04:** A successful sign-in returns to the originally requested route only when it is a safe
  ops-host path; otherwise it lands at `/ops`. A cross-origin or non-ops callback never survives.
- **D-05:** Correct credentials for an account without staff access leave the caller on the sign-in
  surface with a **neutral access refusal**. Do not name the account's booker/host classification,
  and clear the just-created ops-host session immediately.
- **D-06:** Explicit sign-out returns to the ops sign-in page and shows a brief confirmation that the
  staff session ended. No separate signed-out route is added.

### Invitation lifecycle and recipient journey

- **D-07:** A staff invitation is valid for **24 hours** and exactly one successful acceptance.
- **D-08:** Pending invitations expose **Resend** and **Cancel**. Resend rotates the credential and
  invalidates the previous link immediately; Cancel invalidates without replacement. At most one
  live invitation exists for an email.
- **D-09:** An active link opens **one focused setup form**. The invited email is fixed and cannot be
  changed; the recipient supplies their name and password. The form's POST performs acceptance, and
  success routes to ops sign-in. A GET never consumes the invitation.
- **D-10:** Expired, cancelled, already-used, malformed and unknown invitation links render the
  **same neutral inactive state** and the same recovery direction: ask the FitOut staff member who
  invited you for a new invitation. The public surface does not reveal which token ever existed.

### Existing-account conflicts

- **D-11:** If the invited email already belongs to a booker or host, refuse the invitation and ask
  for a **separate staff email**. Do not modify the marketplace account, its capabilities or its
  history from the invitation flow.
- **D-12:** If the email already belongs to active staff, refuse with `Already a staff member` and
  send no email.
- **D-13:** If the email already has an active pending invitation, refuse the duplicate and direct
  the operator to that row's Resend control. Do not rotate a credential as a side effect of pressing
  Invite and never create two live credentials for the same future account.
- **D-14:** `ops:grant` also refuses a capability-bearing account by default. Break-glass conversion
  is available only behind an **explicit conversion flag** that atomically removes both marketplace
  capabilities and grants the staff role. An ordinary grant command never strips access implicitly.

### Staff roster and revocation

- **D-15:** The staff management panel contains two visibly separate sections: **Active staff** and
  **Pending invitations**. It sits below the operational queue on the existing `/ops` page and is
  not a second route or a hidden disclosure.
- **D-16:** Active rows show email, staff-since date and a `You` marker for the current operator.
  Pending rows show email, sent date, **absolute expiry**, and inviter. Internal ids stay off screen.
- **D-17:** Active staff remain oldest-first, matching the shipped `listStaff()` order. Pending
  invitations are newest-first.
- **D-18:** Revoke and Cancel require confirmation. Resend runs immediately and states that the
  prior link was invalidated. Successful invite, resend, cancel and revoke outcomes appear as
  persistent in-page confirmation rather than a transient toast.
- **D-19:** Self-revoke and last-staff revoke render a visible disabled control with the applicable
  reason beside it. The server independently refuses direct or stale requests with the **same
  reason**; the disabled UI is explanation, never the enforcement boundary.
- **D-20:** The Pending invitations section remains visible when empty and renders a neutral sentence
  rather than disappearing or becoming a large promotional empty state.

### Codex's Discretion

- Exact component composition, responsive spacing and typography within the established auth and ops
  patterns.
- Exact neutral error and confirmation wording, provided it preserves the disclosure and recovery
  rules above and uses one declaration where body equality or shared refusal semantics depend on it.
- The internal representation of invitation state using the existing schema, including how the
  installed Better Auth verification machinery is adapted without a migration.
- Exact names for the explicit CLI conversion flag and staff-invitation audit actions.

### Deferred Ideas (OUT OF SCOPE)

- **Tiered ops authorization** — design a more complete role model with a `super_admin` role as the
  only role allowed to invite staff, then promote staff management to its own page. This is a future
  capability phase because it contradicts Phase 20's locked one-role and one-`/ops`-page boundaries.

### Reviewed Todos (not folded)

- **Reveal host contact details in ops queue** — already delivered and closed in Phase 18.1; no Phase
  20 work remains.
- **Host verification submission path and listing-creation gate** — Phase 18.1 scope, already
  implemented and verified.
- **Phase 18 PM decision follow-through** — completed Phase 18/18.1 work; retained only as historical
  context, not folded into this phase.

</user_constraints>

## Summary

Phase 20 should be planned as four dependent seams: first migrate `middleware.ts` to the Next.js 16 `proxy.ts` convention without behavioral change; then add an exact, configuration-driven Host partition; then make the single Better Auth instance resolve its base URL per allowed host while keeping host-only cookies; finally add the ops-only auth/invitation/roster flows and remeasure the cloak after the complete route set exists. Next.js 16 explicitly says Proxy runs before filesystem routing, supports rewrites, and is not a full authorization solution, matching the locked three-layer guard design. [CITED: https://nextjs.org/docs/app/getting-started/proxy] [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md:15-37]

The invitation must use the existing Better Auth `verification` table but cannot literally use the roadmap's illustrative `accepted_at` SQL. The source-of-truth table has exactly `"id"`, `"identifier"`, `"value"`, `"expires_at"`, `"created_at"`, and `"updated_at"`, with only a non-unique identifier index; there is no acceptance column. [VERIFIED: src/lib/db/schema.ts:98-112] Use a deterministic per-email primary key for the single pending row, put only a SHA-256 token digest in `identifier`, put the normalized email/inviter/sent-at payload in `value`, and consume by guarded `DELETE ... RETURNING` inside the same transaction that creates the Better Auth user/account, grants `staff`, and records audit. This is the schema-native way to make one concurrent POST win while a failed transaction restores the invitation. [CITED: https://www.postgresql.org/docs/current/dml-returning.html] [ASSUMED]

Two negative findings must become explicit plan gates. First, prior production evidence measured matched `notFound()` responses as dynamic and unmatched 404s as static with different byte counts/headers, so body parity is not automatic merely because the root 404 is prerendered. [VERIFIED: .planning/phases/18-host-verification-listing-review-fitout-ops/18-14-SUMMARY.md:104-133] Second, the current email transport logs locally, suppresses token-bearing logs in production, but returns success even when production delivery fails or Resend returns an error; staff invitation confirmation therefore needs a delivery-aware wrapper or an explicitly persisted “pending but delivery failed” result. [VERIFIED: src/lib/email.ts:41-63]

**Primary recommendation:** plan proxy migration → measured Host partition → auth-origin/session-isolation work → transactional invite/grant policy → one-page staff panel → final production cloak/UAT, with database races and byte equality verified as first-class acceptance conditions. [VERIFIED: .planning/ROADMAP.md:781-861]

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OPS-07 | Staff reach FitOut Ops at its own `ops.` host; marketplace `/ops` uses the indistinguishable cloak. | Exact-host proxy routing table, internal ops-auth rewrites, fail-public handling for unknown/preview hosts, and production status/body probes. [VERIFIED: .planning/REQUIREMENTS.md:188-190] |
| OPS-08 | Staff sign in on the ops host and cookies remain host-scoped in both directions. | Dynamic Better Auth `baseURL`, explicit trusted origins, default host-only cookie proof, two independent browser cookie jars, and sign-in/sign-out tests. [VERIFIED: .planning/REQUIREMENTS.md:191-192] |
| OPS-09 | Staff invite/onboard without production database credentials; shipped CLI remains. | Verification-row design, token hashing, transactional user/account/grant/audit creation, delivery path, and preserved CLI commands. [VERIFIED: .planning/REQUIREMENTS.md:193-196] |
| OPS-10 | Self and last-staff revocation are refused by a database predicate. | Serialized staff-role writes plus one conditional `UPDATE ... WHERE ... RETURNING`, common refusal reasons, and concurrent revoke tests. [VERIFIED: .planning/REQUIREMENTS.md:197-199] |
| OPS-11 | Staff cannot also be booker/host; reversal is recorded. | Shared grant policy checks both capability columns; explicit CLI conversion clears both in one update; seed/runtime-state remediation. [VERIFIED: .planning/REQUIREMENTS.md:200-202] |
| OPS-12 | Remeasure every route: staff 200, other three 404, identical three bodies, no ops-scoped not-found. | Two production measurements, route census, same-denial-path experiment, status plus SHA-256 body comparison, and structural source gates. [VERIFIED: .planning/REQUIREMENTS.md:203-206] |

</phase_requirements>

## Project Constraints (from AGENTS.md)

- This repository's Next.js behavior must be derived from the installed documentation under `node_modules/next/dist/docs/`, not training memory; relevant Proxy and route-group documents were read during this research. [VERIFIED: AGENTS.md:1-7]
- Heed installed deprecations: in Next.js 16, the convention and exported function are `proxy`, not `middleware`. [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md:15-17]
- The milestone adds zero runtime dependencies, performs zero package upgrades, creates zero schema migrations, keeps one `/ops` page, targets Vercel + Neon, treats Proxy as routing only, and executes plans sequentially because worktrees are off. [VERIFIED: .planning/ROADMAP.md:111-140]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Exact `ops.` host partition | Frontend Server (Proxy) | CDN / Vercel DNS | Proxy sees Host before filesystem routing; Vercel must first assign and terminate TLS for the named subdomain. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/proxy] [CITED: https://vercel.com/docs/domains/set-up-custom-domain] |
| Staff sign-in/recovery and session cookies | API / Backend (Better Auth) | Browser | Better Auth validates origins and issues cookies; the browser enforces host-only cookie delivery. [CITED: https://better-auth.com/docs/guides/dynamic-base-url] [CITED: https://better-auth.com/docs/concepts/cookies] |
| Ops auth/setup screens | Browser / Client + Frontend Server | API / Backend | Forms reuse client patterns, while server actions/endpoints must perform validation, role checks, and session cleanup. [VERIFIED: src/app/(auth)/login/page.tsx:1-151] |
| Invitation persistence and single-use acceptance | Database / Storage | API / Backend | The database must arbitrate duplicate creation, rotation, expiry, and one winning acceptance; server code hashes/validates inputs and sends mail. [CITED: https://www.postgresql.org/docs/current/dml-returning.html] |
| Staff role/capability exclusivity and revoke safety | Database / Storage | API / Backend | Atomic predicates, not UI state, decide whether a privileged transition occurs; the server maps the no-op to the shared reason. [VERIFIED: .planning/REQUIREMENTS.md:197-202] |
| Roster and persistent outcomes | Frontend Server / Browser | Database / Storage | The page composes protected reads and forms; the database supplies authoritative ordered rows. [VERIFIED: src/lib/ops/grant.ts:221-238] |
| Byte-identical 404 cloak | Frontend Server | Test/production runtime | Layout timing, Proxy rewrites, App Router not-found rendering, and production streaming jointly determine the wire response. [VERIFIED: src/lib/ops/staff.ts:116-144] |

## Standard Stack

No package installation or upgrade belongs in this phase. Versions below are the resolved local versions from the existing dependency tree; the ordinary `npm` shim is broken on this workstation, so verification used the installed npm CLI directly. [VERIFIED: local `npm ls` on 2026-09-08] Read-only registry metadata supplied the publication dates cited per row; “current” here means the milestone-pinned installed version, not the registry's latest release, because upgrades are explicitly forbidden. [VERIFIED: .planning/ROADMAP.md:113-118]

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.7 · published 2026-06-01 | App Router, Server Functions, Proxy host rewrites, 404 rendering | Already installed and milestone-pinned; installed docs define the changed Proxy convention. The source-of-truth manifest says `"version": "16.2.7"`. [VERIFIED: node_modules/next/package.json:3] [CITED: https://registry.npmjs.org/next] [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md:15-37] |
| Better Auth | 1.6.14 · published 2026-06-02 | One auth handler, email/password, password recovery, sessions, origin validation | The installed version supports dynamic `allowedHosts`, explicit trusted origins, host-only cookies, and existing reset mechanics. The source-of-truth manifest says `"version": "1.6.14"`. [VERIFIED: node_modules/better-auth/package.json:3] [CITED: https://registry.npmjs.org/better-auth] [VERIFIED: node_modules/@better-auth/core/dist/types/init-options.d.mts:34-66,332-360,1068] |
| Drizzle ORM + postgres.js | 0.45.2 · 2026-03-27; 3.4.9 · 2026-04-05 | Existing-schema reads, transactions, conditional writes, `RETURNING` | They are the repository's existing PostgreSQL access stack and already expose injected transaction connections. Their manifests say `"version": "0.45.2"` and `"version": "3.4.9"`. [VERIFIED: node_modules/drizzle-orm/package.json:3] [VERIFIED: node_modules/postgres/package.json:3] [CITED: https://registry.npmjs.org/drizzle-orm] [CITED: https://registry.npmjs.org/postgres] |
| PostgreSQL (Neon in deploy) | existing service | Verification-row uniqueness, transactionality, audit, role/capability policy | `UPDATE`/`DELETE` predicates and `RETURNING` are the authoritative race boundary. [CITED: https://www.postgresql.org/docs/current/sql-update.html] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 4.4.3 · published 2026-05-04 | Shared client/server form validation | Extend the existing auth schemas for invite email, setup name/password, and ops-only callback parsing. Existing password bounds are quoted as `.min(10).max(128)`; the manifest says `"version": "4.4.3"`. [VERIFIED: src/lib/validation/auth.ts:11-32] [VERIFIED: node_modules/zod/package.json:3] [CITED: https://registry.npmjs.org/zod] |
| Resend | 6.12.4 · published 2026-05-25 | Staff invitation and existing reset delivery | Reuse the one email transport/shell; do not create another email stack. The manifest says `"version": "6.12.4"`. [VERIFIED: node_modules/resend/package.json:3] [VERIFIED: src/lib/email.ts:41-63] [CITED: https://registry.npmjs.org/resend] |
| Vitest | 4.1.8 · published 2026-06-01 | Unit, integration, source/design, and database race tests | Existing test runner and design-gate split; the manifest says `"version": "4.1.8"`. [VERIFIED: package.json:32-33] [VERIFIED: node_modules/vitest/package.json:4] [CITED: https://registry.npmjs.org/vitest] |
| Playwright | 1.60.0 · published 2026-05-11 | Browser cookie-jar isolation and production/E2E flows | Existing pinned browser runner; the visual container also pins this version. The manifest says `"version": "1.60.0"`. [VERIFIED: node_modules/@playwright/test/package.json:3] [VERIFIED: playwright.config.ts:28-39] [CITED: https://registry.npmjs.org/@playwright%2ftest] |
| Node crypto | Node 24.13.0 runtime | Crockford token minting, SHA-256 token digest, UUIDs | Built in; the repository already maps 20 random bytes into 20 Crockford symbols using alphabet `"0123456789ABCDEFGHJKMNPQRSTVWXYZ"`. [VERIFIED: src/lib/group/token.ts:12-34] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing `verification` table | New invitation table | Rejected: violates the locked zero-migration rule. [VERIFIED: .planning/ROADMAP.md:119-123] |
| One Better Auth instance | Second ops auth instance | Rejected: contradicts the phase boundary and would create identity/session drift. [VERIFIED: 20-CONTEXT.md Phase Boundary] |
| Shared `writeRole` policy | Separate UI-only staff grant | Rejected: duplicates the privileged transition and audit policy. [VERIFIED: src/lib/ops/grant.ts:147-217] |
| Exact configured host list | `*.vercel.app` or `*.fitout.*` wildcard as ops | Rejected for ops classification: generated previews must not accidentally become ops, and unknown hosts must remain public. [VERIFIED: .planning/ROADMAP.md:129-134] |

**Installation:** none. An `npm install` or version bump is a scope alarm. [VERIFIED: .planning/ROADMAP.md:113-118]

## Package Legitimacy Audit

Not applicable. Phase 20 installs no external package, so the package-legitimacy gate has no candidates. [VERIFIED: .planning/ROADMAP.md:113-118]

**Packages removed due to SLOP verdict:** none.
**Packages flagged as suspicious:** none.

## Architecture Patterns

### System Architecture Diagram

```text
DNS/Vercel custom domain
        │
        ▼
Incoming request ──► Next.js 16 Proxy (exact normalized Host + pathname; no DB/auth)
                          │
              ┌───────────┴────────────────────────────┐
              │ configured ops host                   │ public/configured preview/unknown host
              ▼                                       ▼
     /login,/recovery,/invite                  /ops and internal ops paths
       rewrite to hidden sibling                    route to cloak
              │                                       │
              ├── /api/auth/* ─► one Better Auth ◄─────┤ public auth remains marketplace
              │                    │
              │          dynamic allowed host/origin
              │          host-only session cookie
              ▼
       Ops auth/setup pages                 Marketplace app
              │
        ┌─────┴──────────────┐
        │ credentials        │ invitation token
        ▼                    ▼
 Better Auth sign-in   SHA-256 lookup / GET display
        │                    │ POST only
   role == staff?            ▼
    │ yes  │ no       PostgreSQL transaction
    │      └── sign out      ├─ DELETE live invite RETURNING
    ▼                        ├─ insert user + credential account
 /ops console                ├─ shared grant policy + audit
    │                        └─ commit exactly once
    ▼
layout assertStaff → page requireStaff → action requireStaff FIRST
    │
queue + Active staff + Pending invitations
```

This diagram preserves Proxy as a host/path router and leaves every data-bearing decision in Better Auth, the ops guard, or a database predicate. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:204-219]

### Recommended Project Structure

The exact new filenames are planner discretion; this layout is a prescriptive implementation map, not an in-repo fact. [ASSUMED]

```text
src/
├── proxy.ts                              # mandatory rename, then exact Host/path routing
├── lib/
│   ├── app-origins.ts                    # one validated origin/host configuration authority
│   ├── ops/
│   │   ├── invitations.ts                # token hash, pending reads, create/rotate/cancel/consume
│   │   ├── grant.ts                      # shared grant/revoke/convert transaction policy
│   │   ├── staff-management.ts           # roster read model + refusal reason derivation
│   │   └── ops-callback.ts               # safe `/ops`-only callback normalization
│   └── validation/ops-staff.ts           # shared invite/setup schemas
├── app/
│   ├── (ops)/ops/page.tsx                # existing page; compose panel below queue
│   ├── (ops-auth)/_ops-auth/login/        # internal rewrite target
│   ├── (ops-auth)/_ops-auth/recovery/     # internal rewrite target
│   ├── (ops-auth)/_ops-auth/reset/        # internal rewrite target
│   └── (ops-auth)/_ops-auth/invite/[token]/ # internal rewrite target
└── components/ops/staff-management/       # two sections and confirmation dialogs
tests/
├── auth/ops-host-auth.test.ts
├── ops/staff-invitation.test.ts
├── ops/staff-policy.test.ts
├── design/ops-host-invariants.test.ts
└── e2e/ops-auth.spec.ts
```

Route groups do not contribute URL segments, and two groups cannot both resolve a page to the same `/login` URL; therefore the ops-auth filesystem routes need an internal pathname and Proxy must rewrite the visible ops-host path to it. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md:12-31]

### Pattern 1: Proxy Migration Before Host Logic

Rename the source file and named export first, preserving the current `_sc` loop guard and the matcher behavior in an isolated commit; only a subsequent commit widens the matcher and adds Host logic. The existing source exports `middleware` and its complete matcher value is `["/login", "/signup"]`. [VERIFIED: src/middleware.ts:43-71]

Proxy should normalize the request Host to lowercase, compare it to hosts derived from validated origin configuration, strip only an optional port for hostname classification where the configured value is also port-normalized, and use an explicit route matrix. Do not trust a suffix match such as `.endsWith("fitout.ph")`; the configured ops host must be exact. [ASSUMED]

Recommended matrix: the exact ops host rewrites visible `/login`, recovery, reset, and invitation URLs to internal `(ops-auth)` targets; passes `/ops`, `/api/auth/*`, Next static assets, and required public assets; and cloaks other marketplace paths. Public and unknown hosts cloak `/ops*` and all internal ops-auth targets while preserving marketplace `/login` and `/signup`. A preview host listed via exact `VERCEL_URL` is a public host, never ops. Vercel documents `VERCEL_URL` as the generated deployment hostname without a scheme. [CITED: https://vercel.com/docs/environment-variables/system-environment-variables] [ASSUMED]

Use `NextResponse.rewrite`, not a custom `fetch`, so Next propagates RSC rewrite headers. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:440-446]

### Pattern 2: One Origin Authority, Dynamic Better Auth

Keep the existing single auth instance. Replace static `baseURL`/`trustedOrigins`—currently exactly `baseURL: BETTER_AUTH_URL` and `trustedOrigins: [BETTER_AUTH_URL]`—with a validated configuration that includes the marketplace host, exact deployment preview host when present, and exact ops host; keep the marketplace origin as the explicit fallback required by the roadmap. [VERIFIED: src/lib/auth.ts:52-63] [VERIFIED: .planning/ROADMAP.md:790-796]

The installed type defines `allowedHosts: string[]`, optional `fallback`, and protocol `"http" | "https" | "auto"`; the resolver rejects a host outside the list unless a fallback is configured. [VERIFIED: node_modules/@better-auth/core/dist/types/init-options.d.mts:34-66] [VERIFIED: node_modules/better-auth/dist/utils/url.mjs:189-214] Explicitly keep `advanced.crossSubDomainCookies` absent/disabled: installed cookie code adds `{ domain }` only when `crossSubDomainCookies.enabled` is truthy. [VERIFIED: node_modules/better-auth/dist/cookies/index.mjs:17-38]

Direct server-side calls such as an ops sign-in action must pass the incoming `headers()` (or a Request), because the installed dynamic resolver ignores a Headers object with neither `host` nor `x-forwarded-host`. [VERIFIED: node_modules/better-auth/dist/context/helpers.mjs:87-98]

### Pattern 3: Ops Sign-In as a Controlled Session Transition

Place ops sign-in outside `(ops)`, because the existing layout calls `assertStaff()` before rendering and `assertStaff()` calls `notFound()` for a missing/nonstaff session. [VERIFIED: src/app/(ops)/ops/layout.tsx:63-69] [VERIFIED: src/lib/ops/staff.ts:80-88,142-144]

Submit email/password through a server-controlled flow: validate with the shared Zod login schema; call Better Auth with the incoming Host headers; inspect the returned/read-back user role; if it is not exactly the existing constant `STAFF_ROLE = "staff"`, immediately call sign-out against the same headers and return one neutral refusal; otherwise return only a callback normalized to `/ops` or an `/ops/...` descendant. [VERIFIED: src/lib/ops/grant.ts:73-79] [ASSUMED]

Reuse Better Auth's reset lifecycle on the ops host. The installed route creates a 24-character reset token, stores `identifier: "reset-password:${token}"`, builds the email link from request-resolved `ctx.context.baseURL`, validates GET without consuming, hashes the new password on POST, deletes the verification value, and conditionally revokes sessions. [VERIFIED: node_modules/better-auth/dist/api/routes/password.mjs:50-82,83-119,120-165] FitOut already configures reset expiry to 3600 seconds and session revocation on reset. [VERIFIED: src/lib/auth.ts:65-75]

### Pattern 4: Verification-Row Invitation State Machine

Use one row per normalized email with a deterministic primary key such as a SHA-256 digest of a namespaced normalized email. Match Better Auth's existing normalization exactly: its sign-up route declares `const normalizedEmail = email.toLowerCase()`. [VERIFIED: node_modules/better-auth/dist/api/routes/sign-up.mjs:161-165] This makes the existing primary key—not a check-then-insert branch—the “at most one row” authority. Put a namespaced SHA-256 digest of the raw Crockford token in `identifier`; never persist, audit, or log the raw token outside the controlled dev email fallback. Put versioned JSON in `value`, containing normalized email, inviter staff id, and sent timestamp; expiry remains the typed `expiresAt` column and should be assigned by PostgreSQL as `now() + interval '24 hours'`, not from a JavaScript clock. The 24-hour value is locked by D-07. [VERIFIED: src/lib/db/schema.ts:98-112] [ASSUMED]

Use these atomic transitions: [ASSUMED]

- Invite: `INSERT ... ON CONFLICT (id) DO UPDATE ... WHERE verification.expires_at <= now() RETURNING ...`; an active row makes the statement return zero rows, so Invite never rotates a live credential. [ASSUMED]
- Resend: conditional `UPDATE ... WHERE id = ? AND updated_at = ? RETURNING ...`; bind id/version server-side from the rendered row so two stale resends cannot both claim success and email a token that has already been superseded. [ASSUMED]
- Cancel: conditional `DELETE ... WHERE id = ? AND updated_at = ? RETURNING ...`; confirmation is UI, while the predicate makes a stale confirmation harmless. [ASSUMED]
- GET acceptance: hash the route token, select an unexpired row, and render either the setup form or one shared inactive component; never mutate. [ASSUMED]
- POST acceptance: inside one transaction, `DELETE ... WHERE identifier = ? AND expires_at > now() RETURNING value`; zero rows means the shared inactive result. The winner rechecks email conflict, creates the user and credential account, calls the shared grant policy using the inviter id captured at issuance, writes audit, and commits. A loser sees zero rows. [CITED: https://www.postgresql.org/docs/current/dml-returning.html] [ASSUMED]

The roadmap phrase “accept schema has exactly one field” must be interpreted as exactly one **target selector**: the token. The setup form necessarily also supplies the locked name and password fields, but it must never supply email or user id; the grantee address is derived solely from the deleted verification row. [VERIFIED: .planning/ROADMAP.md:808-823]

Create the credential account in the same Drizzle transaction as the user/grant. The existing source-of-truth account columns are quoted verbatim: `"id"`, `"account_id"`, `"provider_id"`, `"user_id"`, nullable token/scope/password fields, `"created_at"`, and `"updated_at"`; the credential password belongs in the account row, not user. [VERIFIED: src/lib/db/schema.ts:74-96] Centralize the password hasher used by Better Auth and invitation acceptance using the installed public `better-auth/crypto` export so a future custom hashing policy cannot drift between the two creation paths. Better Auth's official documentation states its email/password implementation uses scrypt. [CITED: https://better-auth.com/docs/authentication/email-password] [ASSUMED]

### Pattern 5: One Serialized Staff-Role Policy

Refactor the existing `writeRole()` seam rather than adding a UI writer. Its present discrete values are quoted verbatim: `GRANT_ACTION = "ops_grant_staff"`, `REVOKE_ACTION = "ops_revoke_staff"`, `STAFF_ROLE = "staff"`, and `DEFAULT_ROLE = "user"`. [VERIFIED: src/lib/ops/grant.ts:68-79] Its current update only sets `{ role }` after a preceding read, then writes audit separately, so it does not yet enforce capability exclusivity, last-staff safety, or update+audit atomicity. [VERIFIED: src/lib/ops/grant.ts:184-217]

All grant/revoke/convert callers should run through transactions and acquire one `pg_advisory_xact_lock(hashtextextended(<one staff-policy namespace>, 0))` before the conditional write. This is already a repository pattern: the existing capacity claim takes the transaction-scoped advisory lock as the first statement on the same transaction connection and prohibits external I/O before commit. [VERIFIED: src/lib/availability/units.ts:920-989] The staff lock is needed because two concurrent revocations of two different staff rows can each see the other before either commits; a `WHERE EXISTS` predicate alone does not serialize different target rows. After serialization, enforce self/last-staff in one `UPDATE ... WHERE` and use `RETURNING` as the only success signal. The new namespace literal is a plan-time value. [ASSUMED]

Ordinary grant requires both capability columns to be false and never changes them. Explicit CLI conversion performs one update that sets both capability columns false and the role to staff. Invitation-created users are inserted with both capabilities false, then pass the ordinary shared grant. Revocation always retains the no-capability state and changes only the role back to the existing `"user"` default. [VERIFIED: src/lib/db/schema.ts:32-47] [ASSUMED]

### Pattern 6: One-Page Staff Management and Cross-Host Navigation

Extend `listStaff()` or a sibling read model with current-operator marker and revoke eligibility while preserving its existing positive equality and oldest-first `asc(user.createdAt)` order. [VERIFIED: src/lib/ops/grant.ts:221-238] Read pending rows newest-first from verification `value`/timestamps. Render Active staff and Pending invitations below the existing queue; do not add a second `(ops)` page. [VERIFIED: 20-CONTEXT.md D-15..D-20]

Pass persistent operation results through a safe page result mechanism such as a bounded query enum or server-rendered action state, not toast-only state. Confirm Revoke/Cancel with the established dialog pattern; bind internal row identifiers in server closures rather than visible text. [ASSUMED]

Repair the ops shell's cross-host exits. Today `ProfileLink` defaults to `href="/profile"`, the footer literals are `"/"`, `"/host"`, `"/terms"`, and `"/privacy"`, and the ops shell composes both components, so these links resolve on the ops host. [VERIFIED: src/components/patterns/site-chrome.tsx:412-421] [VERIFIED: src/components/patterns/site-footer.tsx:119-129] [VERIFIED: src/app/(ops)/ops/layout.tsx:63-65] Supply the configured public origin only in the ops composition, and make ops sign-out return to the visible ops-host sign-in URL with a bounded confirmation state. [ASSUMED]

### Pattern 7: Measured Cloak, Not Structural Optimism

Take two production readings: immediately after the Host partition, and again after every sign-in/recovery/invitation route exists. Each reading must record status, SHA-256 body hash, and relevant response headers for staff `/ops`, nonstaff `/ops`, signed-out `/ops`, an actually nonexistent ops path, marketplace `/ops`, visible sign-in on both hosts, every invitation/setup URL class on both hosts, and ops-host `/api/auth/*`. [VERIFIED: .planning/ROADMAP.md:840-847]

Do not assume rewriting a denied path to an unmatched URL satisfies parity. Prior evidence measured unmatched static and matched `notFound()` responses differently. [VERIFIED: .planning/phases/18-host-verification-listing-review-fitout-ops/18-14-SUMMARY.md:128-133] The partition plan should implement one candidate denial route, run the production probe, and keep it only if the three locked 404 bodies are byte-identical; otherwise route the nonexistent control through the same pre-stream `notFound()` call as signed-out/nonstaff and remeasure. [ASSUMED]

### Anti-Patterns to Avoid

- **Authorizing in Proxy:** Server Functions are POSTs to their used route and matcher changes can silently skip them; keep `requireStaff()` first in every ops action. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:204-219]
- **Two `/login` pages in route groups:** route groups do not change URLs and duplicate paths fail. Use an internal ops-auth path plus Host rewrite. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md:12-31]
- **`crossSubDomainCookies`:** it adds a Domain attribute and merges cookie scope, deleting OPS-08. [VERIFIED: node_modules/better-auth/dist/cookies/index.mjs:21-38]
- **`session.cookieCache`:** the current guard depends on a database read each request so revocation applies on the next request. [VERIFIED: src/lib/ops/staff.ts:33-45]
- **Check-then-write invitation logic:** it races under duplicate invite, resend, accept, and revoke. The returned database row is the success authority. [CITED: https://www.postgresql.org/docs/current/dml-returning.html]
- **Raw invite token persistence:** a database read would become the bearer credential. Persist only a digest. [ASSUMED]
- **Accepting email/user id from the setup POST:** it creates an arbitrary-target grant path; derive identity from the consumed row. [VERIFIED: .planning/ROADMAP.md:813-819]
- **Adding `(ops)/not-found.tsx`:** the existing build-blocking source gate requires the list to stay `[]`. [VERIFIED: tests/design/ops-guard-coverage.test.ts:581-603]
- **Sending a success confirmation after swallowed delivery failure:** the present transport logs Resend errors and returns; extend its result contract for staff invitation only. [VERIFIED: src/lib/email.ts:45-63]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom KDF/salt format | Better Auth's configured/public password hash function | Credentials must remain compatible with Better Auth sign-in and reset. [CITED: https://better-auth.com/docs/authentication/email-password] |
| Password reset | Staff-only token table/endpoints | Existing Better Auth reset endpoints with ops-host redirect | Installed mechanics already provide enumeration-safe request, expiry, password update, token deletion, and session revocation. [VERIFIED: node_modules/better-auth/dist/api/routes/password.mjs:50-165] |
| Invite randomness | Timestamps, UUID substring, `Math.random` | Existing 20-symbol Crockford token shape over `randomBytes` | The repository already has a uniform ~100-bit bearer shape. [VERIFIED: src/lib/group/token.ts:14-34] |
| Invite uniqueness | `SELECT` then `INSERT` | Deterministic primary key + conditional upsert | Only a unique database key arbitrates concurrent creators without a migration. [VERIFIED: src/lib/db/schema.ts:98-112] [ASSUMED] |
| One-time consume | Boolean checked in application memory | Transactional conditional `DELETE ... RETURNING` | The existing table lacks `accepted_at`; delete is both consumption and a one-winner signal. [VERIFIED: src/lib/db/schema.ts:98-112] [CITED: https://www.postgresql.org/docs/current/dml-returning.html] |
| Staff authorization | Host check or UI-disabled buttons | Existing three-layer role guard + database predicates | Host selects a surface; role and mutation predicates authorize. [VERIFIED: src/lib/ops/staff.ts:91-144] |
| Email rendering/transport | Second mail client/template stack | Existing Resend transport and `renderEmail` shell | Avoids dependency and security/template drift. [VERIFIED: src/lib/email.ts:41-91] |
| Safe callback | Prefix-only string test | Existing parse-and-compare helper plus `/ops` path allowlist | The existing helper documents and blocks backslash/dot-segment reparsing escapes. [VERIFIED: src/lib/safe-callback-url.ts:1-120] |

**Key insight:** every deceptively simple edge in this phase—host inference, bearer lifecycle, role mutation, callback routing, and 404 equality—already has either framework semantics or database concurrency behavior that a local boolean cannot replace. [ASSUMED]

## Runtime State Inventory

This phase is both a convention rename and a policy migration, so repository edits alone are insufficient. [VERIFIED: .planning/ROADMAP.md:781-838]

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | The planning record says the local seeded `host@fitout.test` currently combines `role='staff'` with `can_host=t`; this runtime row was not directly queried in this session. [ASSUMED] Existing staff users, pending sessions, and audits may also violate the new exclusivity invariant. [ASSUMED] | Before implementation/UAT, query every `role='staff'` row with both capabilities and choose an explicit local/dev remediation; do not silently mutate production history. Record D-275 as the reversal. Existing session rows need no migration because the next request re-reads user standing while cookie cache remains off. [VERIFIED: src/lib/ops/staff.ts:33-45] |
| Live service config | Vercel project-domain assignment, DNS, TLS, environment variables, Neon production connection, and Resend verified sender/recipient behavior live outside git and were not inspectable from this workspace. [ASSUMED] | Add operator checkpoints: assign the named subdomain, inspect required DNS, verify certificate, set production/preview origin variables, verify Resend domain, and perform a real-recipient UAT. Vercel requires project assignment plus DNS verification for a custom subdomain. [CITED: https://vercel.com/docs/domains/set-up-custom-domain] |
| OS-registered state | Windows hosts file contains no `ops.localhost` entry; localhost resolution is delegated to DNS. [VERIFIED: `C:\Windows\System32\drivers\etc\hosts` read 2026-09-08] | Prefer browser-native `ops.localhost`; if the chosen local hostname fails, add a documented local mapping or use Playwright context routing. Do not make a hosts-file edit part of production logic. [ASSUMED] |
| Secrets/env vars | Existing env documentation defines `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL`; no ops-origin key exists yet. Exact existing fallback values are quoted as `BETTER_AUTH_URL=http://localhost:3000` and `NEXT_PUBLIC_APP_URL=http://localhost:3000`. [VERIFIED: .env.example:60-76] | Add one server-only configured ops origin, derive its exact host, update Vercel environments, and keep secrets out of public variables. Add an exact generated public preview host when needed; never classify wildcard previews as ops. [CITED: https://vercel.com/docs/environment-variables/system-environment-variables] [ASSUMED] |
| Build artifacts / installed packages | `.next/server/middleware-manifest.json` and dev manifests still name `middleware`; they will remain stale after source rename. [VERIFIED: local `.next` manifest grep 2026-09-08] | Clean/rebuild `.next` after rename before trusting the route/proxy census. No installed package rename or migration is required. [ASSUMED] |

## Common Pitfalls

### Pitfall 1: Cosmetic Subdomain Partition
**What goes wrong:** ops-host paths work, but marketplace `/ops` still resolves to the filesystem route or internal ops-auth paths remain directly reachable. [ASSUMED]
**Why it happens:** route groups do not change URLs and Proxy rules are written only in the ops-host direction. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md:12-31]
**How to avoid:** write and test a complete two-host route matrix, including unknown hosts and direct internal paths. [ASSUMED]
**Warning signs:** marketplace `/ops` redirects or returns any body/header distinct from the chosen cloak control. [VERIFIED: .planning/REQUIREMENTS.md:188-190]

### Pitfall 2: Dynamic Base URL Without Direct-Call Headers
**What goes wrong:** ops sign-in/recovery works through the HTTP client but server-action calls mint marketplace URLs or fall back unexpectedly. [ASSUMED]
**Why it happens:** installed Better Auth resolves dynamic context from a Request or Headers carrying a host. [VERIFIED: node_modules/better-auth/dist/context/helpers.mjs:87-98]
**How to avoid:** pass `headers: await headers()` to every direct `auth.api` call and test both hosts. [ASSUMED]
**Warning signs:** reset mail points at the marketplace origin or ops POST returns an origin-validation error. [VERIFIED: .planning/ROADMAP.md:790-796]

### Pitfall 3: False Single-Use From a Read-Then-Delete
**What goes wrong:** two POSTs both read a valid invitation and both begin account/grant work. [ASSUMED]
**Why it happens:** the validity read is not the consuming write. [ASSUMED]
**How to avoid:** make guarded `DELETE ... RETURNING` the first write inside the creation transaction and continue only from its returned payload. [CITED: https://www.postgresql.org/docs/current/dml-returning.html]
**Warning signs:** acceptance code performs a standalone `SELECT` followed later by delete/update. [ASSUMED]

### Pitfall 4: Two Last-Staff Revokes Race
**What goes wrong:** two operators revoke different staff rows concurrently; each sees the other and both updates succeed, leaving zero staff. [ASSUMED]
**Why it happens:** `EXISTS(other staff)` does not lock a different target row or serialize the policy. [ASSUMED]
**How to avoid:** serialize all staff-role writes in a transaction, then retain the required `WHERE` predicate and `RETURNING` success signal. [ASSUMED]
**Warning signs:** the test suite covers sequential last revoke but not two concurrent revokes. [ASSUMED]

### Pitfall 5: Invite/Signup Race Mutates a Marketplace Account
**What goes wrong:** the email becomes a booker/host after invitation issuance but before acceptance, and acceptance upgrades it. [ASSUMED]
**Why it happens:** conflict is checked only when Invite is pressed. [ASSUMED]
**How to avoid:** recheck email uniqueness/capabilities after consuming in the same transaction; on conflict, commit a neutral denial/invalidation without updating that user. [ASSUMED]
**Warning signs:** acceptance calls `UPDATE user SET role='staff' WHERE email=...`. [ASSUMED]

### Pitfall 6: Byte Equality Inferred From JSX
**What goes wrong:** all denied pages look alike but differ in status, body hash, RSC payload, cache headers, or transfer encoding. [VERIFIED: .planning/phases/18-host-verification-listing-review-fitout-ops/18-14-SUMMARY.md:104-133]
**Why it happens:** streaming and matched-vs-unmatched App Router paths take different production rendering paths. [VERIFIED: src/lib/ops/staff.ts:121-137]
**How to avoid:** probe `next start`, not dev, and hash raw response bytes after all routes land. [VERIFIED: .planning/phases/18-host-verification-listing-review-fitout-ops/18-14-SUMMARY.md:104-108]
**Warning signs:** tests assert text/DOM only or compare a 404 page component rather than HTTP output. [ASSUMED]

### Pitfall 7: Email “Success” That Delivered Nothing
**What goes wrong:** a persistent success message appears although production has no key or Resend rejected the recipient. [VERIFIED: src/lib/email.ts:45-63]
**Why it happens:** the current private `send()` returns after logging the error and its callers do not receive delivery state. [VERIFIED: src/lib/email.ts:45-63]
**How to avoid:** return a typed delivery result for the staff-invite sender, keep the pending row resendable, and only render “sent” after accepted transport response. [ASSUMED]
**Warning signs:** staff invite uses `void send...` or unconditionally returns success. [ASSUMED]

### Pitfall 8: Marketplace Staff Session and Server-Action Reachability
**What goes wrong:** a staff credential signs in through the marketplace login, then a crafted Server Function POST on that host carries a valid staff-role session even though the console UI is partitioned. [ASSUMED]
**Why it happens:** cookie scope distinguishes hosts, not “marketplace” versus “ops” purpose, and Next says Server Functions are public-facing POST surfaces. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:217-219]
**How to avoid:** add an empirical cross-host action probe in Wave 0; if it reaches the action, either neutrally reject staff credentials on marketplace sign-in or introduce a separately approved host-binding check without weakening the role guard. This is an open decision because the locked guard is Host-agnostic. [ASSUMED]
**Warning signs:** tests cover cookie transfer only, not direct action POST behavior or staff credentials at marketplace login. [ASSUMED]

## Code Examples

These are planner skeletons, not copy-paste-complete implementations; names introduced here are recommendations under Codex discretion. [ASSUMED]

### Dynamic Better Auth Configuration

```ts
// Sources:
// https://better-auth.com/docs/guides/dynamic-base-url
// installed @better-auth/core init-options.d.mts:34-66
const authHosts = [marketplace.host, ops.host, exactVercelPreviewHost].filter(Boolean)

export const auth = betterAuth({
  baseURL: {
    allowedHosts: authHosts,
    fallback: marketplace.origin,
    protocol: process.env.NODE_ENV === "development" ? "http" : "https",
  },
  trustedOrigins: [marketplace.origin, ops.origin],
  // Keep advanced.crossSubDomainCookies absent.
})
```

The literal protocol union is quoted verbatim from installed types: `"http" | "https" | "auto"`. [VERIFIED: node_modules/@better-auth/core/dist/types/init-options.d.mts:59-66]

### Schema-Native Invitation Consume

```ts
// Source: https://www.postgresql.org/docs/current/dml-returning.html
const consumed = await tx.execute(sql`
  DELETE FROM verification
   WHERE identifier = ${tokenIdentifier}
     AND expires_at > now()
  RETURNING id, value, expires_at, created_at, updated_at
`)

if (consumed.length !== 1) return INACTIVE_INVITATION
```

Every returned column above is quoted from the opened schema (`"id"`, `"value"`, `"expires_at"`, `"created_at"`, `"updated_at"`); `tokenIdentifier` and `INACTIVE_INVITATION` are proposed names. [VERIFIED: src/lib/db/schema.ts:98-112] [ASSUMED]

### Serialized, Predicate-Enforced Revoke

```sql
-- Source: PostgreSQL UPDATE + RETURNING documentation.
-- Run after acquiring pg_advisory_xact_lock for the shared staff-policy namespace.
UPDATE "user" AS target
   SET role = 'user'
 WHERE target.id = $target_id
   AND target.role = 'staff'
   AND target.id <> $actor_id
   AND EXISTS (
     SELECT 1 FROM "user" AS other
      WHERE other.role = 'staff'
        AND other.id <> target.id
   )
RETURNING target.id;
```

The values `"staff"` and `"user"` are quoted existing constants. [VERIFIED: src/lib/ops/grant.ts:73-79] The repository's existing lock pattern uses `pg_advisory_xact_lock(hashtextextended(..., 0))` on the transaction connection. [VERIFIED: src/lib/availability/units.ts:965-989] The staff serialization namespace remains a plan-time value and must be a single declaration shared by grant, convert, invitation acceptance, and revoke. [ASSUMED]

### Ops-Only Callback Guard

```ts
// Source pattern: src/lib/safe-callback-url.ts
export function safeOpsCallback(raw: string | null, origin: string): string {
  const safe = safeCallbackPath(raw, origin)
  const parsed = new URL(safe, origin)
  return parsed.pathname === "/ops" || parsed.pathname.startsWith("/ops/")
    ? `${parsed.pathname}${parsed.search}${parsed.hash}`
    : "/ops"
}
```

The existing helper already normalizes and rechecks the returned URL; the additional `/ops` allowlist prevents a same-origin marketplace or auth callback from surviving. [VERIFIED: src/lib/safe-callback-url.ts:70-120] [ASSUMED]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` / exported `middleware` | `proxy.ts` / exported `proxy` | Next.js 16.0.0 | Mandatory convention migration before host routing. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/proxy] |
| One static Better Auth base URL | Dynamic `allowedHosts` object with request-specific base URL | Supported by installed Better Auth 1.6.14 | One auth instance can safely mint ops-host reset URLs and validate both configured origins. [VERIFIED: node_modules/@better-auth/core/dist/types/init-options.d.mts:34-66,332-352] |
| Routine CLI-only staff grant | Authenticated in-app invite plus retained CLI break-glass | Phase 20 decision | Removes routine production `DATABASE_URL` handling while preserving recovery. [VERIFIED: .planning/REQUIREMENTS.md:193-196] |
| Staff may also host/book | Exclusive staff role and explicit break-glass conversion | D-275 reversal, 2026-09-04 | Shared grant policy and seed/runtime data must change together. [VERIFIED: .planning/REQUIREMENTS.md:200-202] |
| Status/selected-body cloak evidence | Complete route census + status + hash + header measurement | Phase 20 OPS-12 | Prevents static-vs-dynamic 404 differences from passing a visual check. [VERIFIED: .planning/REQUIREMENTS.md:203-206] |

**Deprecated/outdated:**
- `middleware.ts` naming is deprecated in Next.js 16; preserve behavior while renaming. [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md:15-17]
- The roadmap's literal `accepted_at` example is not executable against the locked schema; use consume-by-delete rather than inventing the absent column. [VERIFIED: src/lib/db/schema.ts:98-112]
- Earlier milestone research that modeled an invite as an immediately-created account is superseded by D-07..D-13's true pending invitation and accept-on-POST lifecycle. [VERIFIED: 20-CONTEXT.md D-07..D-13]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The complete proposed verification-row state machine is acceptable: deterministic email-derived id, token digest identifier, JSON payload, SQL-clock expiry, conditional invite/resend/cancel, GET read-only, and transactional consume/account/grant. | Summary / Pattern 4 / security | If Better Auth or another flow assumes opaque/random verification ids globally, or product needs another inactive-state representation, the uniqueness and lifecycle technique must change. |
| A2 | `DELETE ... RETURNING` in the account-creation transaction is the accepted equivalent of `accepted_at`; the audit row is sufficient durable history. | Summary / Pattern 4 / open questions | If product requires retained invitation history beyond audit, zero migration and durable acceptance history conflict and need a user decision. |
| A3 | A shared transaction-scoped serialization lock is acceptable for the rare staff-role mutation path. | Pattern 5 | Without serialization, concurrent different-target revokes can empty the staff set; with a poorly chosen lock, unrelated operations could contend. |
| A4 | The proposed origin authority, exact-host normalization, public-preview classification, full route matrix, visible ops auth URLs, internal `_ops-auth` paths, and suggested filenames are acceptable. | Structure / Pattern 1 / runtime | Different URL/config naming changes proxy, environment, callback, and probe tasks but not the tier boundaries. |
| A5 | The existing email sender may be extended with a delivery result while other fire-and-forget auth mail behavior remains unchanged. | Pitfall 7 | A broader transport refactor could violate established timing/retry decisions. |
| A6 | A staff user can currently authenticate through the marketplace email/password endpoint, and a crafted marketplace-host Server Function POST may carry that role. | Pitfall 8 | If Proxy rewrites prevent dispatch or marketplace staff login is intentionally allowed, mitigation scope differs; this must be measured before planning the fix. |
| A7 | `ops.localhost` resolves in the execution browser without a hosts-file entry. | Runtime inventory | If it does not, local browser tests need a mapping or host-routing fixture. |
| A8 | Ops sign-in should be server-controlled, perform a read-back role check, clear nonstaff sessions immediately, and use the proposed `/ops` callback allowlist. | Pattern 3 / code examples | If Better Auth cookie propagation does not permit sign-in then sign-out in one Server Action, the flow needs a dedicated route handler or after-hook. |
| A9 | Shared staff grant policy should require both capabilities false; explicit conversion clears both; revoke retains no capabilities; invitation-created users are inserted with no capabilities. | Pattern 5 / validation | A different reversal policy would change CLI/UI outcomes and seed remediation. |
| A10 | Persistent result state, server-bound internal ids/versions, absolute public links, and an ops-specific sign-out return are the correct UI composition. | Pattern 6 | Different existing component constraints may require a nearby composition without changing semantics. |
| A11 | A measured common denial route can make all OPS-12 404 bodies byte-identical without an ops-scoped not-found page. | Pattern 7 | If no App Router rewrite shape produces parity, the plan needs a focused framework-level workaround before feature routes land. |
| A12 | The uninspected production database, Vercel, DNS/TLS, Neon, and Resend state should be handled by the listed operator checkpoints, while stale `.next` output should be rebuilt. | Runtime State / Environment | Missing or different external state can block final UAT or require a deployment-specific step. |
| A13 | The proposed Wave 0 filenames, focused commands, sampling cadence, and threat mitigations fit the existing test architecture. | Validation / Security | Existing source gates may require expanding current files instead of creating the named files; behavior coverage remains mandatory. |

## Open Questions

1. **Does a marketplace-host staff session reach an ops Server Function?**
   - What we know: Server Functions are public-facing POSTs to their used route, Proxy is not authorization, and the role guard is intentionally Host-agnostic. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:217-219]
   - What's unclear: whether the final rewrite matrix prevents action dispatch before the action id is resolved, and whether staff credentials must be neutrally rejected by marketplace sign-in. [ASSUMED]
   - Recommendation: make this a Wave 0 production/integration probe. If reachable, prefer rejecting/clearing staff sessions on marketplace sign-in rather than weakening or replacing `requireStaff()`; if that product change is not authorized, return to discuss-phase. [ASSUMED]

2. **Is deletion plus audit sufficient invitation history?**
   - What we know: zero migrations is locked, verification has no `accepted_at`, and audit stores actor/action/outcome/meta with ids and enum-shaped values. Exact audit columns are quoted as `"id"`, `"created_at"`, `"actor_id"`, `"action"`, `"outcome"`, `"meta"`, `"resolved_at"`, and `"resolved_by"`. [VERIFIED: src/lib/db/schema.ts:574-587]
   - What's unclear: whether operators need to list expired/cancelled/used invitation history after the row is removed; CONTEXT only requires active pending rows. [VERIFIED: 20-CONTEXT.md D-15..D-20]
   - Recommendation: treat audit as durable history and verification as live state; do not retain inactive rows unless the user expands scope. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/tests/scripts | ✓ | 24.13.0 | Meets package requirement `">=24.2"`. [VERIFIED: package.json:6; local probe 2026-09-08] |
| npm CLI | Build/tests | ✓ with explicit CLI path; normal shim broken | 11.6.2 | Run `node C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js ...` until the user-level npm shim is repaired. [VERIFIED: local probe 2026-09-08] |
| Docker CLI/daemon | Local PostgreSQL | CLI ✓ / daemon inaccessible in sandbox | 29.6.1 client | Existing external Neon/database environment or approved Docker access. [VERIFIED: local probe 2026-09-08] |
| PostgreSQL CLI | Direct runtime inspection | ✗ | — | Use repository Drizzle scripts/tests once database access is available. [VERIFIED: local probe 2026-09-08] |
| Vercel CLI | Domain/deploy inspection | ✗ | — | Vercel dashboard or install only as an operator prerequisite outside this zero-dependency application phase. [VERIFIED: local probe 2026-09-08] |
| Vercel custom domain/DNS/TLS | Production ops host | Not inspectable | — | Human/operator checkpoint; no code fallback satisfies the production host requirement. [CITED: https://vercel.com/docs/domains/set-up-custom-domain] |
| Resend verified domain/recipient | Real staff invite UAT | Not inspectable | existing SDK 6.12.4 | Dev logs permit local flow, but real-recipient UAT remains mandatory. [VERIFIED: src/lib/email.ts:41-63] |

**Missing dependencies with no fallback:** production domain assignment/DNS/TLS and real Resend delivery require operator access before final UAT. [ASSUMED]

**Missing dependencies with fallback:** local PostgreSQL can use the existing Docker flow when daemon access is restored; Vercel configuration can be performed in the dashboard. [VERIFIED: package.json:15] [CITED: https://vercel.com/docs/domains/set-up-custom-domain]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 + Playwright 1.60.0 [VERIFIED: package.json:76,94] |
| Config file | `vitest.config.ts`, `vitest.design.config.ts`, `playwright.config.ts` [VERIFIED: package.json:32-34] |
| Quick run command | `npm test -- tests/auth/ops-host-auth.test.ts tests/ops/staff-invitation.test.ts tests/ops/staff-policy.test.ts` [ASSUMED] |
| Full suite command | `npm test && npm run test:design && npm run build && npm run test:e2e -- --project=chromium` [VERIFIED: package.json:11,32-34] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OPS-07 | exact two-host route matrix, marketplace `/ops` cloak, unknown host public | unit + production integration | `npm test -- tests/auth/ops-host-routing.test.ts` then production probe script | ❌ Wave 0 [ASSUMED] |
| OPS-08 | independent host cookie jars, ops sign-in/recovery/sign-out, nonstaff cleanup | integration + browser | `npm test -- tests/auth/ops-host-auth.test.ts && npm run test:e2e -- e2e/ops-auth.spec.ts` | ❌ Wave 0 [ASSUMED] |
| OPS-09 | create/refuse/resend/cancel/GET/POST/single-use/account+credential+audit/CLI | DB integration | `npm test -- tests/ops/staff-invitation.test.ts tests/ops/grant-cli.test.ts` | partial: CLI exists; invite ❌ Wave 0 [VERIFIED: tests/ops/grant-cli.test.ts:1-220] |
| OPS-10 | self, last, stale, and two-concurrent-revoke no-op outcomes | DB integration | `npm test -- tests/ops/staff-policy.test.ts` | ❌ Wave 0 [ASSUMED] |
| OPS-11 | ordinary grant refusal, explicit atomic conversion, invitation conflict, seed split | DB integration + source decision gate | `npm test -- tests/ops/staff-policy.test.ts tests/ops/grant-cli.test.ts` | partial; new cases ❌ Wave 0 [ASSUMED] |
| OPS-12 | final route census; 200/404/404/404; three raw body hashes identical; no scoped not-found | source/design + production HTTP | `npm run test:design` plus phase probe script under `next start` | partial source gate exists; host/hash expansion ❌ Wave 0 [VERIFIED: tests/design/ops-guard-coverage.test.ts:543-603] |

### Sampling Rate

- **Per task commit:** run the focused Vitest/design file for the seam and `npm run lint -- <changed files>` where supported. [ASSUMED]
- **Per wave merge:** `npm test && npm run test:design`. [VERIFIED: package.json:32-33]
- **Phase gate:** full suite, production build/start host probe, browser cookie-isolation flow, and real-recipient invite UAT must be green before `/gsd-verify-work`. [VERIFIED: .planning/ROADMAP.md:840-861]

### Wave 0 Gaps

- [ ] `tests/auth/ops-host-routing.test.ts` — pure route matrix, exact configured hosts, ports/case, unknown preview behavior, internal-path denial, preserved `_sc` behavior. [ASSUMED]
- [ ] `tests/auth/ops-host-auth.test.ts` — dynamic origins, explicit direct-call headers, no cross-subdomain cookie/cache config, role refusal/session cleanup, recovery links. [ASSUMED]
- [ ] `tests/ops/staff-invitation.test.ts` — duplicate, expiry, resend/cancel version races, GET no-consume, concurrent POST, signup conflict, account/password compatibility, audit metadata. [ASSUMED]
- [ ] `tests/ops/staff-policy.test.ts` — grant/convert/revoke predicates and concurrent last-staff race. [ASSUMED]
- [ ] `tests/design/ops-host-invariants.test.ts` or expansion of existing ops guard gate — Proxy naming/import boundary, route census, no scoped not-found, action guard first, forbidden cookie settings, one `/ops` page. [ASSUMED]
- [ ] `e2e/ops-auth.spec.ts` — two real hostnames/two cookie jars, sign-in/sign-out/recovery/invite setup and cross-host links. [ASSUMED]
- [ ] production cloak probe artifact/script — status, headers, raw body SHA-256, all new paths, run after partition and after final route set. [ASSUMED]
- [ ] repair the local npm shim or document the explicit npm CLI invocation in executor handoff. [VERIFIED: local probe 2026-09-08]

## Security Domain

Security enforcement is enabled and configured for ASVS level 1. [VERIFIED: .planning/config.json read 2026-09-08]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Better Auth email/password only on ops surface; neutral nonstaff refusal; compatible password hash; existing rate limiting. [CITED: https://owasp.org/www-project-application-security-verification-standard/] |
| V3 Session Management | yes | host-only cookies, no cross-subdomain cookies, immediate sign-out/cleanup, no cookie cache, session re-read on revoke. [CITED: https://better-auth.com/docs/concepts/cookies] |
| V4 Access Control | yes | exact positive staff role, three-layer guard, authenticated actor, conditional database writes, no UI-only enforcement. [VERIFIED: src/lib/ops/staff.ts:80-144] |
| V5 Input Validation | yes | shared Zod validation, normalized email, token shape bound, parsed callback origin plus `/ops` path allowlist, opaque neutral inactive state. [VERIFIED: src/lib/validation/auth.ts:11-32] |
| V6 Stored Cryptography | yes | Node `randomBytes`, SHA-256 token digest, Better Auth password KDF; never custom crypto. [CITED: https://better-auth.com/docs/authentication/email-password] |
| V7 Error Handling and Logging | yes | neutral public refusal/inactive copy; audit ids/enums only; never token/email in audit; token-bearing dev logs forbidden in production. [VERIFIED: src/lib/email.ts:45-63] [VERIFIED: src/lib/db/schema.ts:574-587] |
| V14 Configuration | yes | exact configured origins/hosts, production secret/origin checks, named Vercel subdomain, unknown-host public fallback. [CITED: https://vercel.com/docs/domains/set-up-custom-domain] |

### Known Threat Patterns for Next.js + Better Auth + PostgreSQL

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged Host / forwarded host mints attacker URL | Spoofing | Exact Better Auth `allowedHosts`, exact Proxy ops host, bounded fallback, no wildcard ops classification. Installed resolver validates before constructing the URL. [VERIFIED: node_modules/better-auth/dist/utils/url.mjs:189-214] |
| Cross-host session bleed | Spoofing / Elevation | Leave `crossSubDomainCookies` disabled; browser E2E asserts two cookie jars. [VERIFIED: node_modules/better-auth/dist/cookies/index.mjs:21-38] |
| Arbitrary-target invite acceptance | Elevation | Token is sole target selector; email/user id comes only from consumed row. [VERIFIED: .planning/ROADMAP.md:813-819] |
| Token database disclosure | Information disclosure | Persist SHA-256 digest only; raw token appears only in email/URL and nonproduction controlled log. [ASSUMED] |
| Link scanner consumes invite | Denial of service | GET reads only; POST consumes. [VERIFIED: 20-CONTEXT.md D-09] |
| Duplicate/stale invite operations | Tampering | Deterministic primary key, optimistic row version on resend/cancel, conditional `RETURNING`. [ASSUMED] |
| Concurrent removal of all staff | Denial of service / Elevation | Serialize staff mutations and keep self/last checks in UPDATE predicate. [ASSUMED] |
| Callback open redirect | Spoofing | Existing URL parse/origin comparison plus normalized `/ops` descendant allowlist. [VERIFIED: src/lib/safe-callback-url.ts:70-120] |
| Route existence oracle | Information disclosure | root cloak only, no ops-scoped not-found, status and raw-byte production hashes across all routes. [VERIFIED: tests/design/ops-guard-coverage.test.ts:581-603] |
| Revoked role survives cache | Elevation | Keep Better Auth session cookie cache disabled and test grant→revoke→next request. [VERIFIED: src/lib/ops/staff.ts:33-45] |
| PII/token enters durable audit | Information disclosure | Audit stores actor/target/invite ids and enum/boolean state only; email and token excluded. [VERIFIED: src/lib/db/schema.ts:574-587] |

## Sources

### Primary (HIGH confidence)

- Installed Next.js 16.2.7 docs: `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`, `03-api-reference/03-file-conventions/proxy.md`, and `route-groups.md` — convention, matcher, rewrite, execution order, Server Function, and route-group behavior. [VERIFIED]
- Installed Better Auth 1.6.14 source/types: dynamic base URL config/resolver, trusted origins, host-only cookie construction, reset lifecycle, and direct-call request context. [VERIFIED]
- Repository source: auth config, schema, ops guard/grant policy, token generator, callback guard, email transport, ops layout, footer/profile links, and build-blocking ops design gate. [VERIFIED]
- Phase 20 CONTEXT, REQUIREMENTS, ROADMAP, STATE, and prior Phase 18 production evidence. [VERIFIED]

### Secondary (MEDIUM confidence)

- https://nextjs.org/docs/app/api-reference/file-conventions/proxy — current official Proxy reference. [CITED]
- https://better-auth.com/docs/guides/dynamic-base-url — current official multi-host configuration guide. [CITED]
- https://better-auth.com/docs/concepts/cookies — current official cookie behavior/security guide. [CITED]
- https://better-auth.com/docs/authentication/email-password — current official password/reset/hashing guide. [CITED]
- https://www.postgresql.org/docs/current/dml-returning.html and `/sql-update.html` — current official database write/returning semantics. [CITED]
- https://vercel.com/docs/domains/set-up-custom-domain and `/environment-variables/system-environment-variables` — current official domain and generated-host configuration. [CITED]
- https://owasp.org/www-project-application-security-verification-standard/ — ASVS category/control framework. [CITED]

### Tertiary (LOW confidence)

- None used as authority. Design recommendations tagged `[ASSUMED]` are enumerated in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — exact installed versions and relevant installed framework source/docs were read; no new package is proposed.
- Architecture: HIGH — constrained by locked decisions and existing source boundaries, with two explicitly surfaced implementation assumptions.
- Pitfalls: HIGH — most are demonstrated by current source/prior production evidence; concurrency mitigations are identified as assumptions until mutation/race tests run.
- Environment: MEDIUM — local CLI/filesystem probes ran, but Vercel, Neon production, DNS, TLS, and Resend account state were unavailable.

**Research date:** 2026-09-08
**Valid until:** 2026-10-08 for locked repository/framework versions; revalidate Vercel/Better Auth online guidance at implementation if package versions or deployment configuration change.
