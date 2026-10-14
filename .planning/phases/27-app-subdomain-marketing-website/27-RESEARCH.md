# Phase 27: App Subdomain & Marketing Website — Research

**Researched:** 2026-10-08
**Status:** Complete for planning
**Confidence:** MEDIUM overall; repository code and primary documentation inspected by an independent gsd-phase-researcher. Live provider/deployment values remain unverified.

## User constraints

27-CONTEXT.md is authoritative, including all D-01–D-20 decisions, agent discretion and deferred work. Its audience labels supersede stale roadmap wording. Six separate destinations are ordered Home, Hosts, Players, About, FAQ, Contact. Use Variant B's equal player/host emphasis and Court identity. Use real, safe app screenshots only; the earlier generated photograph and invented phone schedules are unapproved. Home audience buttons enter marketing audience pages; separate Open App enters app.fitout.live. All handoffs use the same tab. Hosts explain four steps; Players three. FAQ stacks Players before Hosts. Contact fields in order are Name, Email, Confirm Email, Mobile Number (optional), Message. Preserve verification/bookability gates, ops isolation and payment/payout HOLD. No new dependency or database schema change is justified.

## Proposed phase requirements

Roadmap requirements were TBD when research began. Use these stable IDs during planning and add them to phase traceability without completing them:

| ID | Required outcome |
|---|---|
| MKT-01 | Six accessible, responsive marketing destinations and accurate product copy |
| MKT-02 | Court/Variant B presentation using actual safe app screenshots |
| MKT-03 | Working same-tab player/host handoffs, including authentication resume |
| CONTACT-01 | Exact fields, matching emails, real Resend delivery and recoverable feedback |
| DOMAIN-01 | Explicit marketing/app/ops origins and fail-closed exact-host partition |
| DOMAIN-02 | Legacy deep links, authentication/email/payment returns and signed endpoint continuity |
| DOMAIN-03 | Host-matrix verification, external inventory and reversible cutover evidence |

## Recommended architecture

Use the existing repository and customer-facing Next deployment for marketing/app routing. Preserve existing ops domain/deployment attachment; do not assume or consolidate its live topology. src/proxy.ts selects host behavior. Marketing uses a distinct internal URL namespace with its own session-free layout; existing application routes remain intact.

| Capability | Owner |
|---|---|
| Exact host classification and compatibility routing | Proxy and origin helpers |
| Marketing rendering and canonical metadata | Marketing server components/layout |
| Contact validation and sending | Dedicated server route handler |
| Contact pending/error interaction | Client form |
| Authentication, capabilities, data authorization | Existing server auth/actions |
| DNS, aliases and provider destinations | External deployment/provider configuration |

src/lib/app-origins.ts currently classifies ops/public/unknown and uses PUBLIC_APP_ORIGIN and absolutePublicUrl() for the app. Separate marketing origin from app origin explicitly. Existing localhost app is http://localhost:3000; ops is http://ops.localhost:3000. Unknown hosts currently pass ordinary app routes in src/proxy.ts after ops denial: add denied unknown hosts rather than merely changing an env value.

Installed Next guides inspected: Proxy, redirects, rewrites, route groups, route handlers, metadata. Route groups do not namespace URLs and conflicting resolved paths fail. Keep existing app / and rewrite apex marketing into a distinct implementation namespace; do not add a second grouped /.

## Host and compatibility policy

- Production apex serves /, /hosts, /players, /about, /faq, /contact. app.fitout.live serves existing application paths. Ops preserves exact-host classification and its existing gateway cloak.
- Exact configured authorities only. Reject unknown, malformed, lookalike and unconfigured preview hosts. Trust neither suffix matching nor forwarded Host.
- Keep generated VERCEL_URL as the exact app-preview authority. Marketing preview requires an explicitly configured exact alias/local host; never default preview to production origins/credentials.
- Known legacy GET/HEAD app paths redirect to configured app origin preserving pathname and complete query. Use 307 during cutover for rollback; defer permanent caching until acceptance. Destination authority never comes from request input.
- Cover /login, /signup, /forgot-password, /reset-password, /auth/session-check, /profile, /bookings/**, /listings/**, /host/**, /invite/**.
- Apex / without recognized search keys is marketing. Legacy root search containing existing keys redirects to app / with complete query preserved. src/lib/validation/booking.ts keys include lat, lng, radius, priceMax, date, start, end, category, partySize, locationLabel, sort, page, relax; application validation remains authoritative. The planner must reconcile shared tracker-only query names such as page with marketing query handling explicitly.
- /terms and /privacy remain on app. Apex compatibility redirects and marketing footer links point there. Their current content includes placeholder notices: do not invent published legal approval.
- Reject unsafe legacy UI/API methods rather than replaying mutations. Explicit direct signed machine endpoints are exceptions below.
- Block direct internal marketing namespace access, including app/unknown hosts; prove normal Next Link/RSC navigation and cache separation work. Do not treat routing as server authorization.

## Actual CTA entry and auth resume

Find a space targets app / and supports anonymous browsing. Start hosting needs a small host-intent entry/resume seam: src/app/(host)/host/layout.tsx sends anonymous visitors to bare /login and signed-in bookers to /, so /host alone cannot fulfill D-10.

Preserve intent across login/signup/Google return. src/app/(auth)/signup/page.tsx defaults intent to book and Google callbackURL to /. Reuse safeCallbackPath() and explicit activateHosting() in src/app/actions/capability.ts and src/components/nav-icon-menu.tsx. Activation is authenticated, rate-limited, audited and returns /host; never grant capability on GET. Planning must identify a concrete entry route and checked internal return path, while keeping existing role/verification gates unchanged.

## Contact delivery and abuse controls

Use marketing-only POST, existing Zod/form primitives, SUPPORT_EMAIL, renderEmail() and the sole Resend transport. No persistence, attachments, ticketing, automatic reply or new mailbox.

src/lib/email.ts delivery result can be true for resend or development; development logging is not real Contact delivery. Contact requires accepted Resend transport, handling missing config, returned errors and throws. Shared replyTo currently uses SUPPORT_EMAIL: add a narrow validated-sender override preserving transactional defaults. Keep From and To server-controlled and use fixed subject. Reject header control characters. Pass raw text through renderEmail() paragraph encoding, not its pre-escaped table slot (src/lib/email-shell.ts).

Provide inline validation, pending, accepted-send success and recoverable errors retaining values. Provider acceptance does not prove inbox arrival: completion needs controlled received-message/reply evidence.

Bound body/fields; server-validate email equality; add honeypot and bounded per-IP/per-sender limits. Exact marketing Origin, no broad CORS. Validate trusted Vercel ingress before using its IP headers; reject arbitrary forwarded chains. src/lib/rate-limit.ts is a bounded process-local Map, not a deployment-wide guarantee. Pair with verified WAF rate limiting when available; record account availability as external evidence. A concrete safe fallback or release gate is needed if deployment-wide controls are unavailable. Do not claim production protection from a unit test.

## Auth and service continuity

src/lib/auth.ts uses exact allowed hosts, trustedProxyHeaders:false and host-only cookies. Preserve this: apex sessions do not migrate automatically to app, users re-login, ops sessions stay isolated.

Update origin helper consumers, auth fallback, metadata and application email URLs. Stored absolute notification URLs can use retained apex redirects without data migration (src/lib/db/schema.ts).

Inventory Google authorized origin and exact /api/auth/callback/google URI. Redirecting old OAuth callback cannot transplant host-only state. Define safe restart instead of transparent continuity. Bridge only explicitly tested legacy reset/verification GET token links, preserve tokens and validate/remap old same-apex callback destinations; do not introduce open redirects.

Checkout returns in src/app/actions/booking.ts are /bookings/${holdId}?paid=1 and /listings/${bk.listingId}/book?hold=${holdId}. Legacy redirects preserve them; redirect/payment-return queries never confirm payment.

Didit browser returns use /host/verify (src/lib/verification/providers/didit.ts). Keep direct signed receiver paths available on both apex and app during migration:

- /api/paymongo/webhook
- /api/didit/webhook
- /api/inngest with existing serve methods

Never redirect webhook POSTs. Preserve raw body, signatures, secrets, deduplication and Inngest registration. Didit docs explicitly say redirects are not followed. Keep compatible legacy payout return/refresh paths, but src/app/actions/paymongo-connect.ts is retired and must not be revived for marketing onboarding.

## Validation Architecture

Node 24.13.0, Vitest 4.1.8, Playwright 1.60.0 were inspected. Default npm wrapper failed; use installed Node CLIs. Main Vitest config requires an isolated test database even for focused runs. Execute full gates sequentially; do not generate Windows visual baselines.

| Layer | Verification |
|---|---|
| Focused routing/origins | node node_modules/vitest/vitest.mjs run tests/auth/ops-host-routing.test.ts tests/auth/public-origin-callers.test.ts |
| Focused new behavior | Add host policy, query/method compatibility, Contact delivery/escaping/abuse, hosting resume and callback-origin tests |
| Design contract | node node_modules/vitest/vitest.mjs run --config vitest.design.config.ts |
| Browser | node node_modules/@playwright/test/cli.js test --project=chromium (narrow to owned specs in plans) |
| Typecheck | node node_modules/typescript/bin/tsc --noEmit |
| Lint | node node_modules/eslint/bin/eslint.js |
| Build | node node_modules/next/dist/bin/next build |
| External proof | Six pages, keyboard/mobile, host/RSC/cache matrix, auth-session isolation, received Contact mail and provider endpoint read-back |

New tests should assert behavior and invariants, not mirror implementation. Test app/apex/ops/local/exact previews/unknown/lookalike authorities, marketing path collisions, search query preservation, GET vs POST, internal namespace cloaking, failed real-transport sends, untrusted origins/header injection and valid auth resume. Full gates protect previously working app/ops journeys; inherited failures require explicit evidence/disposition, never a false phase pass.

## Cutover, rollback and open external evidence

Inventory current Vercel aliases/env scopes, OAuth entries, receiver destinations/signing settings, sender verification, monitored inbox and WAF availability. These are not proven by code or historic reports. Deploy compatibility first, prove app origin, then switch apex marketing; record old values/deployment revision for rollback. Preserve direct apex receivers until provider destinations and outstanding returns are proved migrated. Keep checkout/payout HOLD throughout.

Phase 23 reported missing production provider destinations historically; that does not establish current settings. External missing access is a later evidence gate, not a reason to omit implementation planning.

## Primary sources consulted

- [Better Auth options](https://better-auth.com/docs/reference/options) and [cookies](https://better-auth.com/docs/concepts/cookies)
- [Google OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Vercel request headers](https://vercel.com/docs/headers/request-headers), [domains](https://vercel.com/docs/domains/working-with-domains), [environment variables](https://vercel.com/docs/environment-variables)
- [Resend send email](https://resend.com/docs/api-reference/emails/send-email) and [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [PayMongo webhook resource](https://docs.paymongo.com/reference/webhook-resource)
- [Didit webhooks](https://docs.didit.me/integration/webhooks)
- [Inngest Vercel deployment](https://www.inngest.com/docs/durable-execution/deploying-functions/platforms/vercel)
- [OWASP ASVS](https://owasp.org/projects/asvs) — use current category meanings, not obsolete numbering

## Pitfalls and planning boundaries

Do not reuse a legacy public-origin name for marketing while callers still need app URLs. Do not trust unknown hosts, set cross-subdomain session cookies, redirect signed machine requests, or mutate host capabilities on GET. No signup-first player journey, fake delivery success, unsafe sender headers, generated imagery, invented claims or release of funds. Screenshots must use authentic safe demo states with personal data omitted. Build reusable marketing components grounded in Court tokens; isolate marketing shell from transactional app navigation.
