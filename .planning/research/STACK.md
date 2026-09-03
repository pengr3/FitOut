# Stack Research

**Domain:** Ops-subdomain isolation, staff auth/invite, and CI for an already-shipped Next 16 marketplace
**Researched:** 2026-09-03
**Confidence:** HIGH

---

## TL;DR — THE HEADLINE FINDING

**v1.2's four new capabilities require ZERO new runtime dependencies.** Not "few". Zero.

Every mechanism the milestone needs is already installed and already paid for:

| Capability | What it needs | Where it already is |
|------------|---------------|---------------------|
| `ops.` subdomain rewrite | Host-header branch + `NextResponse.rewrite` | `next@16.2.7`, `src/middleware.ts` |
| Ops session cookie scoped to that host | **Nothing.** The default is already host-only | `better-auth@1.6.14`, `dist/cookies/index.mjs:22` |
| One instance serving two hosts | `baseURL` dynamic config object | `better-auth@1.6.14`, `dist/utils/url.mjs:110` |
| Staff invite tokens | ~100-bit Crockford bearer token minting | `src/lib/group/token.ts` |
| Staff invite email | Resend + branded shell | `src/lib/email.ts`, `src/lib/email-shell.ts` |
| Playwright in CI | Pinned container + Actions | `@playwright/test@1.60.0`, `.github/workflows/ci.yml` |

`package.json` should gain **no dependency** for this milestone. The entire cost is
**configuration, one migration, one file rename, and one CI job.** Any plan that proposes
`npm install` for this milestone is proposing something the tree already does — treat it as a
scope alarm the way D-136 treats a migration inside a polish phase.

---

## Recommended Stack

### Core Technologies

Everything in this table is **already installed**. The "Version" column is what is in
`package.json` at HEAD, and the recommendation for every row is **do not move it during v1.2**.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Next.js** | **16.2.7** (installed) · 16.3.4 latest | Host-header rewrite for `ops.`; the route already renders | The rewrite is a five-line branch on `request.headers.get("host")` in a file that already exists. **Do not upgrade to 16.3.4 during this milestone** — the `mcr.microsoft.com/playwright:v1.60.0-noble` container, the pinned `eslint-config-next@16.2.7`, and every committed visual baseline are all calibrated against 16.2.7. A minor bump is a separate, gated decision. |
| **`proxy.ts` file convention** | Next **16.0.0+** | Replaces `middleware.ts` | ⚠ **`middleware` is DEPRECATED in Next 16.0.0 and renamed to `proxy`.** Straight from the API reference: *"The `middleware` file convention is deprecated and has been renamed to `proxy`."* The repo is running a deprecated convention **right now**, and v1.2 is about to make that file substantially more load-bearing. Rename it as part of this milestone (codemod below), not after. |
| **Better Auth** | **1.6.14** (installed) · 1.7.2 latest | Ops sign-in on a second host, one `user` table | 1.6.14 **already ships everything needed** — verified by reading `node_modules`, not release notes. `baseURL` accepts a dynamic `{ allowedHosts, protocol, fallback }` object (`dist/utils/url.mjs:110`), `trustedOrigins` accepts a `(request) => string[]` function (`dist/context/helpers.mjs:78`), and cookies are host-only unless you opt out. **Do not upgrade to 1.7.2 for this milestone**: there is nothing to gain, and `auth.ts` is the single most heavily-commented invariant surface in the repo (`revokeSessionsOnPasswordReset`, `input:false` on six fields, the `customRules` keys verified against 1.6.14's `resolveRateLimitConfig`, and `scripts/patch-kysely-adapter.mjs` running on `postinstall`). |
| **PostgreSQL** | 18 | `staff_invite` table (migration `0027`) | The invite is a row with a token hash, an inviter, an expiry and a single-use claim. Same shape the group-invite work already proved. One migration; v1.2 has no "zero migrations" invariant (that was GATE-06, a v1.1 rule). |
| **Drizzle ORM** | 0.45.2 / drizzle-kit 0.31.10 | The `staff_invite` schema + migration | Unchanged. The invite table needs no exotic constraint — a unique index on the token hash and a partial index on unclaimed rows. |
| **`@playwright/test`** | **1.60.0, pinned EXACT** | The CI gate D-24 owes | ⚠ **Do not upgrade to 1.62.1.** The exact pin is D-135/D-27 shipped work: the version string is a *segment of the container image tag* (`mcr.microsoft.com/playwright:v1.60.0-noble`), which `scripts/verify-workflows.mjs` asserts against `EXPECTED_IMAGE` across every containerized job. Bumping the package without bumping the image (and regenerating every baseline) breaks the gate; bumping both is a milestone of its own. |
| **Resend** | 6.12.4 | The staff-invite email | Already sends 20+ transactional templates through `src/lib/email.ts`. One more export. |

### Supporting Libraries

**No new supporting library is recommended.** The table below records what the milestone
*would* have reached for, and the in-repo module that already does the job.

| What a greenfield build would install | Version | Purpose | Use this instead |
|---------------------------------------|---------|---------|------------------|
| `nanoid` / `uuid` / a token lib | — | Mint the invite bearer credential | **`src/lib/group/token.ts`** — 20 crypto-random bytes → 20 Crockford symbols → ~100 bits, with a documented bias-free `byte % 32` mapping (256 is an exact multiple of 32). Already reviewed, already shipped, already carries the "never log a token" rule. Extract `mintToken()` up a level or add `makeStaffInviteToken()` beside the two existing minters. |
| `better-auth/plugins` → `organization` | 1.6.14 | Invitation records + accept flow | **A first-party `staff_invite` table.** See "What NOT to Use" — the organization plugin models a concept FitOut does not have. |
| `better-auth/plugins` → `admin` | 1.6.14 | Staff role management | **`src/lib/ops/grant.ts` + `src/lib/ops/staff.ts`.** Re-verified below; the 2026-09 reasoning is unchanged and stronger. |
| `better-auth/plugins` → `two-factor` | 1.6.14 | Staff 2FA | **Nothing.** Explicitly declined by the PM. Do not smuggle it in as "hardening". |
| `@vercel/functions` | — | `waitUntil` for background tasks | Not needed. `advanced.backgroundTasks` is unconfigured and should stay that way; the repo's async story is Inngest. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **`@next/codemod` `middleware-to-proxy`** | Rename `src/middleware.ts` → `src/proxy.ts` and `middleware()` → `proxy()` | `npx @next/codemod@canary middleware-to-proxy .` — official, one-shot, and it *only* renames. ⚠ It will not update the **five test files** that reference the path by string (see Integration Points). Run it, then fix those by hand. |
| **`ops.localhost:3000`** | Local dev for the subdomain | **Requires ZERO config.** Verified from the installed `next@16.2.7` source: `dist/server/lib/router-utils/block-cross-site-dev.js:78-82` hardcodes `['*.localhost', 'localhost', ...allowedDevOrigins]`. So `NEXT_DEV_ALLOWED_ORIGINS` is **not** needed for `ops.localhost` — the HMR-socket trap documented at length in `next.config.ts` does not fire here. Chrome/Edge/Firefox resolve `*.localhost` → 127.0.0.1 with no hosts edit (RFC 6761). |
| **`hosts` file entry** | Safari-only fallback | Safari has historically not auto-resolved `*.localhost`. If the PM walks the ops surface on Safari/iOS, add `127.0.0.1 ops.localhost` to `hosts`. Confidence MEDIUM — probe it before writing it into a UAT script. |
| **`scripts/verify-workflows.mjs`** | Must be EXTENDED, not bypassed | The new e2e CI job inherits every cross-job invariant this script asserts (pinned image, `--ipc=host`, `contents: read`, zero `secrets.`, zero `--update-snapshots`, first-party `actions/*` only). Add its job-specific assertions in the same pass — a new job that no invariant names is the vacuity this script exists to prevent. |
| **`npm run ops:grant` / `ops:revoke` / `ops:staff`** | STAYS | D-275 keeps the CLI as the first-staff bootstrap and the break-glass path. It is not superseded, it is demoted from "only path" to "bootstrap path". |

---

## Installation

```bash
# Core — NOTHING. This is the finding, not an omission.
#   No `npm install` is required for the ops subdomain, the cookie scoping,
#   the invite flow, or Playwright-in-CI.

# One-shot codemod (does not add a dependency; @next/codemod is npx-invoked)
npx @next/codemod@canary middleware-to-proxy .

# One migration
npm run db:generate      # then HAND-EDIT for the partial unique index (repo convention)
npm run db:migrate
```

**New environment variables** (`.env.example` + deploy env — no code dependency):

| Variable | Example | Purpose |
|----------|---------|---------|
| `OPS_HOST` | `ops.fitout.ph` / `ops.localhost:3000` | The one host the proxy rewrites into `/ops`. Read once, compared exactly. |
| `NEXT_PUBLIC_OPS_ORIGIN` *(or a server-only `OPS_ORIGIN`)* | `https://ops.fitout.ph` | The absolute base the **staff-invite email link** is built from. ⚠ It cannot reuse `BETTER_AUTH_URL` — see Integration Points. Prefer server-only unless a client component genuinely needs it. |
| `BETTER_AUTH_ALLOWED_HOSTS` *(optional)* | `fitout.ph,ops.fitout.ph` | Only if you want the allowlist deployable rather than compiled in. A literal array in `auth.ts` is the safer default and matches how `trustedOrigins` is written today. |

---

## The Four Changes, Precisely

### 1. Host-header rewrite (`src/middleware.ts` → `src/proxy.ts`)

The mechanism is small. The **matcher** is where the risk is.

Today `config.matcher` is `["/login", "/signup"]` — two paths, and the file's own header says it
"makes no authoritative decision" and "only DEFERS". A host-based rewrite needs the proxy to run
on **every path on the ops host**, which means the matcher widens to something close to
everything, and the existing `_sc` session-check delegation must be re-scoped so it still only
fires on `/login` and `/signup`. That is a real rewrite of the file's control flow, not an
addition to it.

**The Server-Action trap, quoted from the Next 16 Proxy reference:**

> *"Server Functions are not separate routes in this chain. They are handled as POST requests to
> the route where they are used, so a Proxy matcher that excludes a path will also skip Proxy
> coverage. A matcher change or a refactor that moves a Server Function to a different route can
> silently remove Proxy coverage."*

Every ops server action POSTs to the **ops page's own URL** on `ops.fitout.ph`. If the matcher
excludes that path, the POST is never rewritten to `/ops/...` and the action **404s**. The
symptom will look like a broken form, not a routing bug. The negative-lookahead matcher must
therefore exclude `_next/static`, `_next/image` and metadata files — and **nothing else** on the
ops host.

The same doc paragraph is also the strongest available third-party endorsement of D-216:

> *"Always verify authentication and authorization inside each Server Function rather than
> relying on Proxy alone."*

The three-layer guard stays exactly as shipped. The proxy routes; it never authorizes.

### 2. Cookie scoping — **change nothing, and write down why**

This is the single most important finding in this document, and it is a *negative* one.

Read out of `node_modules/better-auth/dist/cookies/index.mjs:22-23`:

```js
const crossSubdomainEnabled = !!options.advanced?.crossSubDomainCookies?.enabled;
const domain = crossSubdomainEnabled ? (…) : void 0;
```

and at line 36:

```js
...crossSubdomainEnabled ? { domain } : {},
```

`crossSubDomainCookies` is **not configured** in `src/lib/auth.ts` (a repo-wide grep confirms).
Therefore `domain` is `undefined`, therefore the `Set-Cookie` carries **no `Domain` attribute**,
therefore the cookie is **host-only** under RFC 6265 — returned to the exact host that set it and
to nothing else.

**So the ops session and the marketplace session are already separate the moment a second host
exists.** No new option, no second cookie name, no second Better Auth instance, no
`cookiePrefix` change. Both hosts mint a cookie *named* `better-auth.session_token`
(`__Secure-better-auth.session_token` in production), and the browser keeps them as two distinct
jar entries because host-only cookies do not cross a host boundary.

**This makes `crossSubDomainCookies` the second load-bearing default in this codebase, and it
needs the same treatment `session.cookieCache` already got.** `src/lib/ops/staff.ts:33-47`
already carries a paragraph titled *"THE INVARIANT THIS MODULE'S CORRECTNESS HANGS ON: NO COOKIE
CACHE"*, written precisely because *"an ordinary-looking performance change, one line in the auth
config"* would silently defeat revocation and nothing would go red. `crossSubDomainCookies` is
the identical shape: one line, looks like a convenience, and enabling it **merges the two session
jars back into one** — which is D-275's entire deliverable, undone, silently. Write the paragraph
next to the one that is already there, and back it with a design test that asserts the key is
absent from the resolved options.

### 3. One Better Auth instance, two hosts — the dynamic `baseURL`

`baseURL` is currently the static string `process.env.BETTER_AUTH_URL ?? "http://localhost:3000"`,
and `trustedOrigins` is `[BETTER_AUTH_URL]`. **An ops-host request would fail CSRF origin
validation today.** The fix is a first-class, documented Better Auth feature that 1.6.14 already
has:

```ts
baseURL: {
  allowedHosts: [
    "fitout.ph",
    "ops.fitout.ph",
    "localhost:3000",
    "ops.localhost:3000",
  ],
  protocol: process.env.NODE_ENV === "development" ? "http" : "https",
  fallback: process.env.BETTER_AUTH_URL,   // the marketplace canonical origin
},
```

Verified from source (`dist/utils/url.mjs`) and from the official *Dynamic Base URL* guide:

- `isDynamicBaseURLConfig` triggers on the presence of an `allowedHosts` **array** (line 110).
- `resolveDynamicBaseURL` derives the host, matches it against the allowlist, and builds a
  **request-specific** base URL (line 206).
- `matchesHostPattern` supports exact, `*.` wildcard, and infix wildcard patterns; the docs add
  port wildcards (`localhost:*`).
- `getTrustedOrigins` (`dist/context/helpers.mjs:61-70`) **auto-derives** trusted origins from
  `allowedHosts` — so the explicit `trustedOrigins` array becomes redundant. Keeping it is
  harmless; a `(request) => string[]` function is also supported if a plan wants one.
- **Unknown hosts throw** unless `fallback` is set. The allowlist is fail-closed by default,
  which is the right posture and the reason to prefer it over `trustedProxyHeaders: true`.

**A real, welcome side effect:** password-reset and email-verification links are built from the
*resolved* base URL, so a reset requested at `ops.fitout.ph` produces an ops-host link and lands
the new session on the ops host. That is exactly what the invite flow wants, and it falls out of
the config rather than needing per-email URL plumbing.

**Do NOT set `trustedProxyHeaders: true`.** Better Auth reads the plain `host` header without it
(`getHostFromSource`, `dist/utils/url.mjs:139`), which is what Vercel and every sane proxy
already set correctly. The option's own docblock says: *"⚠︎ This may expose your application to
security vulnerabilities if not used correctly."* Enabling it makes a spoofable
`x-forwarded-host` authoritative. There is no reason to accept that here.

### 4. Staff invite + sign-in — assembled from shipped parts

| Piece | Reuse |
|-------|-------|
| Token | `src/lib/group/token.ts` — the ~100-bit Crockford minter, already reviewed |
| Storage | New `staff_invite` table (migration `0027`): token hash, `invited_by`, `email`, `expires_at`, `claimed_at` |
| Email | New export in `src/lib/email.ts` over `src/lib/email-shell.ts` (the shipped branded layout) |
| Account creation | Better Auth `signUpEmail` — already shipped, `autoSignIn: true`, `sendOnSignUp: true` |
| Role grant | **`src/lib/ops/grant.ts`'s Drizzle write**, called from an invite-claim server action. `role` stays `input: false`, so no request body can ever write it |
| Rate limiting | Add invite-claim / ops-sign-in keys to `auth.ts`'s `customRules` — bare endpoint paths, **no `/api/auth` prefix** (verified against 1.6.14's `resolveRateLimitConfig` and pinned by `tests/auth/rate-limit.test.ts`) |
| Refusal shape | `notFound()`, byte-identical — D-219. An unknown/expired/claimed invite token must render the **same** calm state, exactly as `src/lib/group/token.ts`'s header already mandates for group tokens |

**The D-217 fear does not return.** D-217 refused a role-grant HTTP path because an
*arbitrary-target* endpoint is a privilege-escalation primitive. An invite-claim action is not
that: the target is **the claimant's own new account**, the authority is a ~100-bit bearer token
minted by an already-authenticated staff member, and it is single-use. There is no request body
field naming a victim. That distinction is the whole reason D-275 could supersede D-217 without
reopening the hole.

### 5. Playwright in CI (D-24) — **it is half-closed already**

The milestone brief reads as though no Playwright runs in CI. That is not what the tree says.
`.github/workflows/ci.yml` already has **four jobs**, two of which run Playwright:

- `gate-price-parity` — `npx playwright test e2e/price-parity.spec.ts --project=chromium`
- `gate-visual` — `npx playwright test --project=visual`

So D-24's real remaining scope is **the ~39 functional specs in `e2e/*.spec.ts`**, not "Playwright
in CI" from zero. State that in the roadmap; it changes the size of the phase.

**Add a FIFTH job. Do not widen job 3.** `ci.yml`'s own header records the mutation table:

```
job 3's one spec -> `npm run test:e2e` (all twelve)   GREEN      RED
```

— i.e. widening `gate-price-parity` is a mutation the invariant checker is *designed* to catch,
and `scripts/verify-workflows.mjs:600` names the reason. A new `gate-e2e` job is the shape the
taxonomy already has room for.

The new job copies `gate-price-parity`'s skeleton exactly:

- `container: mcr.microsoft.com/playwright:v1.60.0-noble` with `--ipc=host` (asserted for every
  containerized job)
- **No `npx playwright install --with-deps`.** Playwright's own `ci-intro` guide recommends that
  step — and it is **wrong for this repo**. The image ships the browsers; an install step is
  documented in `ci.yml` as *"the most common way a container job ends up comparing against a
  browser nobody pinned."* Follow the repo, not the upstream quickstart.
- `services: postgis/postgis:18-3.6`, reached by **service label** (container job → no port
  mapping)
- `npm run db:migrate`
- `npx playwright test --project=chromium`
- `permissions: contents: read`, zero `secrets.`, zero `--update-snapshots`, first-party
  `actions/*` only

**Two things to settle in planning, not in research:**

1. **Runtime.** `playwright.config.ts`'s `webServer` is `npm run dev` with
   `reuseExistingServer: false` (unconditional, and `tests/design/e2e-email-silence.test.ts` turns
   a restored ternary red). 39 specs against a Turbopack dev server with `retries: 2` is a long
   job. Consider a `workers` cap and a job `timeout-minutes`. Do **not** "fix" it by switching to
   a production build — the dev-only guards that make the suite safe depend on it (below).
2. **The two network seams must hold under CI.** `RESEND_API_KEY: ""` in `webServer.env` is what
   makes 14 real `api.resend.com` POSTs per run become zero ([17-D28]), and `instrumentation.ts`'s
   dev-only undici `MockAgent` is what takes PayMongo off the wire ([17-D18]/[17-D27]). Both are
   `NODE_ENV`-gated to development and both ride the `npm run dev` webServer. A CI job that boots
   the app any other way silently re-opens both. **`[17-D28]` remains filed OPEN and is the largest
   known un-fixed exposure in the suite** — running the full suite in CI is exactly the change that
   would multiply it if the seam were bypassed.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Host branch in `proxy.ts`** | `next.config.ts` `rewrites()` with `has: [{ type: "host", value: "ops.fitout.ph" }]` | Genuinely viable and *lighter* — it runs as a `beforeFiles` rewrite with no per-request function, and it cannot drift from a matcher. Choose it **only if** the ops host needs no request-time logic at all. It is rejected here because the host value must be env-configurable across dev/prod (matcher and rewrite `has` values must be statically analyzable constants), and because the proxy is also where "the `/ops` **path** on the marketplace host stops being reachable" is expressed. Worth re-testing if the proxy branch turns out to be the only thing keeping a broad matcher alive. |
| **Dynamic `baseURL` object** | Keep the static string, add ops origin to `trustedOrigins` | Cheaper diff, and CSRF would pass. Rejected: the *resolved* base URL still points at the marketplace, so every Better-Auth-generated link (reset, verify) emitted from an ops request would send the staff member to the wrong host and set the cookie in the wrong jar. That is a silent, user-visible wrong-host bug rather than an error. |
| **One named subdomain (`ops.fitout.ph`) as a Vercel domain** | Vercel **wildcard** domain `*.fitout.ph` | Only if FitOut ever serves arbitrary per-tenant subdomains. A wildcard requires moving the zone to **Vercel's nameservers** (`ns1/ns2.vercel-dns.com`) so Vercel can complete the DNS-01 challenge for a wildcard certificate. **FitOut needs exactly one extra subdomain**, which is an ordinary CNAME on any DNS provider with a per-domain certificate. Do not take the nameserver migration to buy a feature the product does not have. |
| **Better Auth 1.6.14** | Better Auth 1.7.2 | Only as its own gated task, with `auth.ts`'s six `input:false` fields, the `customRules` path-matching contract, `revokeSessionsOnPasswordReset`, and `scripts/patch-kysely-adapter.mjs` all re-verified against the new source. Nothing in v1.2 needs it. |
| **New `gate-e2e` CI job** | Widening `gate-price-parity` | Never. It is an explicitly-enumerated mutation in `ci.yml`'s own table and the invariant checker is built to catch it. |
| **First-party `staff_invite` table** | Better Auth `organization` plugin invitations | If FitOut ever grows real multi-org tenancy (agencies managing venues, say). Today it models organizations, members and roles-within-organizations — three tables and a mental model for a system with **one** organization and **one** role (D-215: *"no tier, no second capability, no permission table"*). |
| **Safari via `hosts` entry** | Chrome/Firefox only for ops UAT | If ops is desktop-Chrome-only in practice, skip the hosts entry. Decide deliberately; do not discover it mid-walk. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Better Auth `admin` plugin** | ⚠ **Re-verified 2026-09-03 against BOTH the installed 1.6.14 source AND the current published docs. The 18-RESEARCH reasoning holds without a single amendment.** `node_modules/better-auth/dist/plugins/admin/routes.mjs` mounts **exactly 15** `createAuthEndpoint("/admin/…")` calls, and the live docs list the same 15 by name: `create-user`, `list-users`, `get-user`, **`set-role`**, **`set-user-password`**, `update-user`, `ban-user`, `unban-user`, `list-user-sessions`, `revoke-user-session`, `revoke-user-sessions`, **`impersonate-user`**, `stop-impersonating`, **`remove-user`**, `has-permission`. `src/app/api/auth/[...all]/route.ts` is `toNextJsHandler(auth)` — a **catch-all** — so adding the plugin publishes all fifteen instantly, including a role-grant HTTP endpoint and **session impersonation on a marketplace that moves real money**. Its `schema.mjs` also adds `banned`/`banReason`/`banExpires` to `user` and `impersonatedBy` to `session` — Better-Auth-owned tables `src/lib/db/schema.ts:1-4` forbids hand-editing. And its own `role` declaration is `{type:"string", required:false, input:false}` — **attribute-identical** to `src/lib/auth.ts:112`. For the one field `readStaff()` reads, the plugin adds literally nothing. | `src/lib/ops/staff.ts` (`readStaff`/`requireStaff`/`assertStaff`) + `src/lib/ops/grant.ts`'s Drizzle write + a single-use invite token. |
| **`advanced.crossSubDomainCookies`** | **This is the one config change that would silently delete D-275's deliverable.** Enabling it sets a `Domain=` attribute, which makes the session cookie cross the `fitout.ph` ↔ `ops.fitout.ph` boundary — merging the two session jars the milestone exists to separate. Worse, it fails *open*: everything keeps working, staff just silently carry a marketplace session into ops and vice versa. It looks like a feature ("share login across subdomains") and reads like an improvement in a PR. | **Leave it unset.** Host-only cookies are the default and are exactly right. Document it beside the `cookieCache` paragraph in `src/lib/ops/staff.ts` and pin it with a design test. |
| **`session.cookieCache`** | Unchanged from 18-RESEARCH: it would let a **revoked** staff grant keep opening ops surfaces for the cache TTL, and nothing would go red. Now doubly load-bearing — revocation is the compensating control for an invite path that did not exist under D-217. | Leave unset. `auth.api.getSession()` reads the DB every call; revocation lands on the next request. |
| **A second Better Auth instance / second `user` table** | Already weighed and rejected by D-275 — doubles the auth surface to buy a property `role: input:false` already enforces. Source adds a mechanical reason: `createCookieGetter` resolves `cookiePrefix` **once, from static options**, so one instance physically cannot mint two differently-named cookies. There is no half-measure between "one instance" and "two instances", and two instances is the rejected option. | One instance, dynamic `baseURL`, host-only cookies. |
| **`advanced.cookies.session_token.attributes.domain`** hardcoded | Achieves nothing the default does not already achieve, and hardcodes a production hostname into a config that must also work at `ops.localhost:3000`. | Nothing. The default is correct. |
| **`trustedProxyHeaders: true`** | Makes a spoofable `x-forwarded-host` authoritative for host resolution. Better Auth's own docblock: *"⚠︎ This may expose your application to security vulnerabilities."* Unnecessary — the plain `host` header is read without it. | The `allowedHosts` allowlist, which is fail-closed by design. |
| **Better Auth `two-factor` plugin** | Explicitly declined by the PM. Adding it as unrequested "hardening" is a scope breach and a second credential surface. | Nothing. |
| **A wildcard `*.fitout.ph` Vercel domain** | Forces a nameserver migration to `ns1/ns2.vercel-dns.com` (Vercel needs zone write access for the DNS-01 wildcard-cert challenge) to serve **one** subdomain. | A single `ops` CNAME added as an ordinary project domain. |
| **`npx playwright install --with-deps` in the new CI job** | Playwright's `ci-intro` guide recommends it, and it is wrong here. `ci.yml` names it: *"the most common way a container job ends up comparing against a browser nobody pinned."* | The pinned `mcr.microsoft.com/playwright:v1.60.0-noble` container, which ships browsers and OS deps. |
| **Widening `gate-price-parity` to `npm run test:e2e`** | An enumerated mutation in `ci.yml`'s own GREEN/RED table; `scripts/verify-workflows.mjs` exists to catch it. | A fifth `gate-e2e` job with its own invariants registered in the checker. |
| **An `(ops)`-scoped `not-found.tsx`** | Named as non-negotiable in D-275 and D-219: a distinct 404 body under `/ops` is *"the same existence oracle wearing a different hat."* New ops routes make this tempting again. | The root `not-found.tsx`, unchanged. Re-measure the 200/404/404/404 cloak with **every new ops route in the probe set** — D-275's stated condition. |
| **Bumping `next` to 16.3.4 or `@playwright/test` to 1.62.1 during v1.2** | The Playwright version is a *segment of the container image tag* asserted by `verify-workflows.mjs`, and every committed baseline was minted under 16.2.7 + 1.60.0 in that image. A bump invalidates the baselines and the image pin together. | Stay pinned. Bump as its own gated task with baseline regeneration via `baselines.yml`. |
| **Reusing `BETTER_AUTH_URL` for the invite-email link** | It is the **marketplace** origin, hardcoded as *"the app's base URL"* at **12+ call sites** (`src/app/actions/booking.ts:310,994`, `group.ts:200`, `cancel-booking.ts:365`, `host-requests.ts:266,332`, `re-request.ts:330`, `paymongo-connect.ts:38`, `inngest/functions/reminders.ts:339`, `request-expiry.ts:275`, …). An invite link built from it lands staff on the marketplace host, where the cookie goes into the **wrong jar** and the ops surface then 404s. The failure is confusing rather than loud. | A separate `OPS_ORIGIN`, used by the invite email only. Leave all 12 existing sites untouched. |

---

## Stack Patterns by Variant

**If the deploy target is Vercel:**
- Add `ops.fitout.ph` as a second **project domain** (CNAME). No wildcard, no nameserver move.
- `host` is already correct; leave `trustedProxyHeaders` off.
- If preview deployments must reach ops, add `"*.vercel.app"` to `allowedHosts` — the wildcard
  form is explicitly supported by `matchesHostPattern`.

**If the deploy target is a container host (Railway/Render/Fly — the CLAUDE.md recommendation):**
- Point both hostnames at the same service. The proxy runs in-process, so nothing else changes.
- Confirm the reverse proxy forwards a truthful `Host`. If it rewrites `Host` to an internal name,
  `resolveDynamicBaseURL` will throw on an unlisted host — **loud, and correct.** Add the internal
  name to `allowedHosts` or fix the proxy; do not reach for `trustedProxyHeaders`.

**If Google OAuth must work on the ops host:**
- It will not by default — `https://ops.fitout.ph/api/auth/callback/google` is not a registered
  redirect URI, so Google refuses. That is a *safe* failure, not a hole.
- The recommendation is to **leave it unregistered** and offer email/password only on the ops
  sign-in surface. Staff accounts should not depend on a third-party IdP the product does not
  control, and it keeps `/api/auth/sign-in/social` on the ops host inert by construction.

**If the full-suite CI job proves too slow:**
- Shard by spec group across matrix jobs *within* `gate-e2e` before dropping specs. Every dropped
  spec is a gate that returns to "whenever a human remembers", which is the exact state D-24 is
  meant to end.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `next@16.2.7` | `middleware.ts` | Works, but **deprecated since 16.0.0**. Migrate to `proxy.ts` this milestone. |
| `next@16.2.7` proxy | Node.js runtime (default in v16) | ⚠ `instrumentation.ts`'s **guard 2** reasons about `NEXT_RUNTIME` being non-`nodejs` *"because `src/middleware.ts` exists."* Proxy defaults to Node in v16, so the rename may change which runtimes invoke `register()`. `tests/security/paymongo-seam.test.ts` asserts the env-read admits two names — re-run it after the codemod and update the docblock if the reading changed. Dev-only and benign, but the comment must not go stale. |
| `next@16.2.7` dev server | `ops.localhost:3000` | **Zero config.** `'*.localhost'` and `'localhost'` are hardcoded into `blockCrossSiteDEV`'s allow-list (source-verified). `NEXT_DEV_ALLOWED_ORIGINS` remains empty and must stay empty. |
| `better-auth@1.6.14` | dynamic `baseURL` object | Supported. `isDynamicBaseURLConfig` keys on an `allowedHosts` **array** — an object without it is treated as a *legacy* protocol-only config, so the key name is load-bearing. |
| `better-auth@1.6.14` | `getSessionCookie(request)` in the proxy | Unchanged and host-agnostic. It probes `__Secure-`-prefixed **and** bare names (`dist/cookies/index.mjs:197-205`), so it works on both hosts in both environments without config. |
| `better-auth@1.6.14` | `trustedOrigins` | Accepts an array **or** `(request) => string[] | Promise<string[]>`. With a dynamic `baseURL`, `allowedHosts` origins are auto-pushed, so the current explicit array becomes redundant rather than wrong. |
| `@playwright/test@1.60.0` | `mcr.microsoft.com/playwright:v1.60.0-noble` | The version string **is** the image tag. `verify-workflows.mjs` asserts equality across every containerized job. Bump both or neither. |
| `drizzle-kit@0.31.10` | migration `0027` | Generate, then hand-edit for the partial unique index — the repo convention for anything Drizzle's schema DSL cannot express. |

---

## Integration Points With Already-Shipped Code

These are the places where a "greenfield" plan would be wrong. Each was read at HEAD.

| Shipped artifact | What v1.2 does to it |
|------------------|----------------------|
| `src/middleware.ts` | **Renamed to `src/proxy.ts` + control flow restructured.** The `_sc` loop guard, the `LOGGED_OUT_ONLY` deferral and the *"OPTIMISTIC ONLY — NOT the security boundary"* contract all survive; they are now one branch beside the host branch. |
| **5 test files referencing `src/middleware` by path** | `tests/auth/login-reachable-after-reset.test.ts`, `tests/auth/stale-session-selfheal.test.ts`, `tests/design/dark-scope.test.ts`, `tests/design/ops-guard-coverage.test.ts`, `tests/security/paymongo-seam.test.ts`. The codemod does **not** touch these. |
| `src/lib/auth.ts` | `baseURL` string → dynamic object; `trustedOrigins` reconsidered; 2–3 new `customRules` keys (**bare paths, no `/api/auth` prefix**). Everything else — `input:false` ×6, `revokeSessionsOnPasswordReset`, `databaseHooks.user.create.before`, `nextCookies()` **LAST** — untouched. |
| `src/lib/ops/staff.ts` | Unchanged code. **New invariant paragraph** for `crossSubDomainCookies`, beside the existing `cookieCache` one. |
| `src/lib/ops/grant.ts` | Gains a **second caller** (the invite-claim action) alongside the CLI. Its *"the actor is asserted, not authenticated"* caveat now has a counterexample worth recording: the invite path's actor **is** authenticated. |
| `tests/design/ops-guard-coverage.test.ts` | Must enumerate the **new** ops routes. It proves the three layers exist; D-275 additionally requires the **`curl` cloak audit re-run** with the new routes — the structural half never settles OPS-02. |
| `src/lib/group/token.ts` | Source of the minting idiom. Either extract `mintToken()` or add `makeStaffInviteToken()` beside the two existing exports. |
| `src/lib/email.ts` / `email-shell.ts` | One new export. ⚠ Its link must use `OPS_ORIGIN`, not `BETTER_AUTH_URL`. |
| `playwright.config.ts` | Ideally **unchanged**. `updateSnapshots: "none"`, `reuseExistingServer: false` and `env: { RESEND_API_KEY: "" }` are all *unconditional on purpose* and each has a design test guarding it. A `workers` cap is the only defensible addition. |
| `.github/workflows/ci.yml` | New **fifth** job. `gate-price-parity` and `gate-visual` untouched. |
| `scripts/verify-workflows.mjs` | Extended in the same commit as the new job. A job no invariant names is precisely the vacuous green this script exists to prevent. |
| `src/lib/site.ts:70` | Independent of everything above. `SUPPORT_EMAIL` is one line, blocked on a business fact (D-64), not on this research. |

---

## Open Questions For Planning

1. ~~**Deploy target is unstated.**~~ **CORRECTED 2026-09-04 by the orchestrator — this question was
   answered before the research ran, and the finding was wrong.** `vercel.json` IS at HEAD and IS
   tracked: committed **2026-09-01** as `c6e43b0` by quick task `260901-0zf`
   ("wire the repo for a Vercel + Neon deploy"), two days before this research. It pins
   `"buildCommand": "next build"` so a deploy stops re-running the gates CI already owns. The same
   task pointed `drizzle.config.ts` at `DIRECT_DATABASE_URL` for Neon's direct endpoint and
   documented it in `.env.example`. **The deploy target is Vercel + Neon, confirmed by the PM
   2026-09-04.**

   Three consequences that replace the original open question:
   - A **named** `ops.` subdomain is what is needed, NOT a wildcard — so Vercel nameservers are not
     required (this file's own Sources table already establishes that distinction).
   - **Vercel PREVIEW deployment hostnames become a live hazard, not a hypothetical one.** Every
     preview gets a generated `*.vercel.app` host, so any Host-match or `allowedHosts` rule that
     names only the two production hosts will break previews outright — or, worse, serve the ops
     surface from a preview host. PITFALLS.md raises this; with the target now settled it is a
     requirement rather than a caveat.
   - CLAUDE.md's "What NOT to Use" argues against **Vercel-only for the backend** (webhooks,
     long-lived jobs). That tension is real and pre-existing — Inngest already carries the
     background work — but it is NOT this milestone's to resolve and must not be re-litigated
     inside a v1.2 plan.
2. **Does the `/ops` path stay reachable on the marketplace host?** D-275 says the subdomain is
   *"what makes the separation real"*. If the path stays live on the apex, there are two doors to
   one surface and two cookie jars that can open it. Recommendation: on the marketplace host,
   `/ops` returns the same byte-identical `notFound()` a non-staff caller gets — no redirect,
   because a redirect is an existence oracle.
3. **Full e2e suite wall-clock in CI.** Unknown until measured. Measure before choosing sharding.
4. **Safari and `ops.localhost`.** MEDIUM confidence that a `hosts` entry is required. One probe
   settles it; put it in the phase's first task rather than in a UAT script.

---

## Sources

| Source | What was verified | Confidence |
|--------|-------------------|------------|
| `node_modules/better-auth@1.6.14/dist/cookies/index.mjs:17-42, 197-205` | `crossSubDomainCookies` disabled ⇒ no `Domain` ⇒ host-only cookies; `cookiePrefix` resolved once from static options; `getSessionCookie` probes both prefixed and bare names | **HIGH** — installed source, read directly |
| `node_modules/better-auth@1.6.14/dist/utils/url.mjs:108-232` | `isDynamicBaseURLConfig`, `resolveDynamicBaseURL`, `matchesHostPattern` wildcards, `getHostFromSource` proxy-header gating | **HIGH** — installed source |
| `node_modules/better-auth@1.6.14/dist/context/helpers.mjs:60-86` | `getTrustedOrigins` auto-derives origins from `allowedHosts`; `trustedOrigins` accepts a function | **HIGH** — installed source |
| `node_modules/better-auth@1.6.14/dist/plugins/admin/routes.mjs` + `schema.mjs` | **Exactly 15** `/admin/*` endpoints incl. `set-role`, `impersonate-user`, `set-user-password`, `remove-user`; 3 `user` columns + 1 `session` column | **HIGH** — installed source, **cross-verified against published docs** |
| better-auth.com/docs/plugins/admin | Same 15 endpoints, same schema additions, current docs | **HIGH** — matches source exactly |
| `node_modules/next@16.2.7/dist/server/lib/router-utils/block-cross-site-dev.js:77-82` | `'*.localhost'` and `'localhost'` hardcoded into dev allow-list ⇒ `ops.localhost` needs no config | **HIGH** — installed source |
| nextjs.org/docs/app/api-reference/file-conventions/proxy (v16.3.4, updated 2026-08-25) | `middleware` deprecated → `proxy` in v16.0.0; Node runtime default; codemod; **Server Functions + matcher coverage warning**; execution order | **HIGH** — official docs, quoted verbatim |
| better-auth.com/docs/guides/dynamic-base-url | `allowedHosts` patterns incl. port wildcards; `protocol`; `fallback`; fail-closed on unknown host; cookie-domain derivation | **MEDIUM→HIGH** — official docs, **corroborated by installed source** |
| better-auth.com/docs/concepts/cookies | `cookiePrefix`, `useSecureCookies`, per-cookie overrides, `crossSubDomainCookies` + *"only enable if necessary"* | **MEDIUM→HIGH** — official docs, corroborated by source |
| vercel.com/docs — domains / multi-tenant | Wildcard domains require Vercel nameservers (DNS-01 for wildcard certs); named subdomains do not | **MEDIUM** — official docs via search |
| playwright.dev/docs/ci-intro | Upstream GH Actions workflow; `install --with-deps` recommended (**deliberately not followed here**) | **MEDIUM** — official docs |
| `*.localhost` browser resolution (RFC 6761) | Chrome/Edge/Firefox auto-resolve to 127.0.0.1; Safari caveat | **MEDIUM** — corroborated by Next source for the dev-server half |
| Repo at HEAD: `src/lib/auth.ts`, `src/lib/ops/{staff,grant}.ts`, `src/middleware.ts`, `playwright.config.ts`, `.github/workflows/{ci,baselines}.yml`, `scripts/verify-workflows.mjs`, `next.config.ts`, `instrumentation.ts`, `src/lib/group/token.ts`, `src/lib/email.ts`, `package.json` | Every integration claim above | **HIGH** — read at HEAD |

---
*Stack research for: ops-subdomain isolation, staff auth/invite, and CI on a shipped Next 16 marketplace*
*Researched: 2026-09-03*
