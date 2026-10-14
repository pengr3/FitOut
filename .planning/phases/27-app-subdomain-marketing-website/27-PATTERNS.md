# Phase 27: App Subdomain & Marketing Website — Pattern Map

**Mapped:** 2026-10-08
**Scope:** Proposed paths below are planner recommendations, not existing implementation commitments.
**Files analyzed:** 18 work units (grouped related pages/consumers/tests); 16 have reusable analogs, 2 require new policy.
**Tracked-source gate:** All existing analogs named below were verified with `git ls-files`; no runtime mirrors are assigned.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/app-origins.ts` (modify) | config/utility | transform | same file | exact |
| `src/proxy.ts` (modify) | middleware | request-response | same file | exact |
| `src/lib/auth.ts` (modify) | config | request-response | same file | exact |
| App origin consumers: root metadata, email URLs, booking returns, Didit returns (modify only required callers) | utility/service | transform | `src/lib/app-origins.ts` | role-match |
| `src/app/marketing/layout.tsx` (proposed new internal namespace) | component | request-response | `src/app/(public)/layout.tsx` | role-match |
| `src/app/marketing/{page,hosts/page,players/page,about/page,faq/page,contact/page}.tsx` (proposed) | component | request-response | `src/app/(public)/layout.tsx` | role-match |
| `src/components/marketing/{header,footer,audience-steps,faq}.tsx` (proposed) | component | request-response | `src/components/site/public-header.tsx` | role-match |
| `src/components/marketing/contact-form.tsx` (proposed) | component | request-response | `src/app/(auth)/login/page.tsx` | role-match |
| `src/lib/validation/contact.ts` (proposed) | utility | transform | login's shared schema/resolver use | partial |
| `src/app/api/contact/route.ts` (proposed) | route | request-response | `src/app/api/cloudinary/sign/route.ts` | role-match |
| `src/lib/email.ts` (modify) | service | event-driven | same file + `src/lib/email-shell.ts` | exact |
| Contact trusted-ingress policy (proposed helper, path to settle) | utility | request-response | none | none |
| `src/app/start-hosting/page.tsx` + client activation component (proposed) | component/controller | request-response | `src/components/nav-icon-menu.tsx` | role-match |
| `src/app/(auth)/{login,signup}/page.tsx` (modify) | component | request-response | same files + `src/lib/safe-callback-url.ts` | exact |
| Marketing screenshot capture helper + `public/marketing/*.png` (proposed) | utility/assets | file-I/O | `e2e/helpers/visual-drive.ts` | partial |
| Origin/proxy, Contact, hosting-resume tests (new/extend) | test | request-response | `tests/auth/ops-host-routing.test.ts` | role-match |
| `e2e/marketing-host-matrix.spec.ts` + Contact/journey specs (proposed) | test | request-response | `e2e/ops-auth.spec.ts` | role-match |
| `27-DEPLOYMENT-INVENTORY.md` / `27-EVIDENCE.md` (proposed phase docs) | config/documentation | batch | `23-EVIDENCE.md` in Phase 23 | partial |

Six marketing files above mean six distinct destinations; route groups alone cannot provide a second `/`.
Internal namespace spelling is provisional. Proxy must cloak direct namespace access and prove rewrite/RSC navigation.
No database migration, new mail stack, mailbox, ticketing, or generative imagery is assigned.

## Pattern Assignments

### Origins, proxy, auth and origin consumers

Copy the explicit classifier shape from `src/lib/app-origins.ts:128-133`, replacing the current public class with distinct app/marketing classes and a checked preview policy:
```ts
const hostname = hostnameFromAuthority(rawHost);
if (hostname === null) return "unknown";
if (hostname === OPS_APP_HOSTNAME) return "ops";
if (hostname === PUBLIC_APP_HOSTNAME || hostname === PREVIEW_APP_HOSTNAME) return "public";
return "unknown";
```
Its absolute helper at lines 136-137 is `return new URL(pathname, `${PUBLIC_APP_ORIGIN}/`).toString();`.
Keep app callers app-directed; introduce a separate marketing authority rather than reinterpreting public URLs.
`src/proxy.ts:34,42-43` imports `NextResponse`, `NextRequest`, `classifyRequestHost`, and `verifyOpsGatewayHandoff`.
Preserve the gateway rewrite and spoofed-header stripping from `src/proxy.ts:73-86`:
```ts
const target = request.nextUrl.clone();
target.pathname = OPS_GATEWAY_PATH;
const headers = new Headers(request.headers);
headers.set(OPS_GATEWAY_SOURCE_HEADER, request.nextUrl.pathname);
headers.delete(OPS_GATEWAY_HANDOFF_HEADER);
return NextResponse.rewrite(target, { request: { headers } });
```
Host comes from `request.headers.get("host")` at line 115. Ops handoff verification is at 123-127; all-path matcher is 163-166.
Current unknown-host ordinary-app pass-through is a gap to close, not a pattern to preserve.
`src/lib/auth.ts:66,70,76` uses exact `AUTH_ALLOWED_HOSTS`, `AUTH_TRUSTED_ORIGINS`, and `trustedProxyHeaders: false`.
Preserve host-only sessions and independent server guards; proxy routing does not authorize data access.
Retain direct signed PayMongo/Didit/Inngest receivers on old/new approved hosts; never redirect their mutation requests.
Legacy UI GET/HEAD redirects use configured app authority and full queries; include legal links and root search collisions.

### Hosting entry, login and signup

Copy client action feedback from `src/components/nav-icon-menu.tsx:75-90`:
```ts
startTransition(async () => {
  setError(null);
  const res = await activateHosting();
  if (!res.ok) { setError(res.error); return; }
  router.push(res.redirectTo);
  router.refresh();
});
```
Imports at lines 3-10 show React transitions, Next navigation, existing capability action and UI button.
`src/app/actions/capability.ts:58-79` authenticates, limits `activate:${userId}`, audits, changes only `canHost`, and returns `/host`.
Use this explicit authenticated action; a GET entry only renders/resumes intent and must not grant capability.
Copy callback validation from `src/app/(auth)/login/page.tsx:104-107`:
```ts
const raw = new URLSearchParams(window.location.search).get("callbackURL");
return safeCallbackPath(raw, window.location.origin);
```
Login Google calls the checked callback at line 137. Signup currently seeds `intent: "book"` at 74 and Google `/` at 94: modify these resume seams deliberately.
Preserve signup's server assignment of capabilities; pass a checked internal resume destination through login/signup/Google.
Test existing host, authenticated booker, anonymous visitor, signup and OAuth return separately.

### Contact validation, handler, transport and rendering

Form imports in `src/app/(auth)/login/page.tsx:40-59` establish `useForm`, `zodResolver`, shared schema/types, `FormField`, `FormMessage`, `Input`, `Button`.
Use that field/error pattern with exact ordered fields and retained values; Contact server independently validates bounds and email equality.
`src/app/api/cloudinary/sign/route.ts:101-127` supplies `POST(req: Request)`, guarded body parsing, and explicit 400 responses.
Reuse route structure, not its authenticated-only policy or permissive parse fallback: Contact must reject invalid bodies.
`src/lib/email.ts:80-94` is the sole transport seam:
```ts
const { error } = await resend.emails.send({
  from: FROM, to, subject, html, text,
  replyTo: SUPPORT_EMAIL ?? undefined,
});
if (error) { console.error("resend delivery failed"); return { delivered: false }; }
return { delivered: true, transport: "resend" };
```
Add a narrow validated sender reply-to override preserving transactional defaults; keep From/To/subject server-owned.
Delivery type at 47-49 distinguishes `resend` from `development`; Contact success requires accepted Resend, not development logging.
Catch transport throws without logging sender/message contents; expose recoverable failure and retain input.
Use `renderEmail` from `src/lib/email-shell.ts:142-145`; its paragraph implementation at 181-188 includes:
```ts
escapeHtml(paragraph) + `</p>`
```
Pass raw strings in `paragraphs`; lines 117-135 reserve `tableHtml` for pre-escaped markup and forbid user input there.
Use `SUPPORT_EMAIL` and `SITE_TAGLINE` from tracked `src/lib/site.ts`; do not duplicate address/product facts.

### Court marketing shell, pages and metadata

Copy persistent shell composition from `src/app/(public)/layout.tsx:30-44`:
```tsx
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/patterns/site-footer";
// Layout renders flex min-h-dvh flex-col, header, children, footer.
```
Build marketing-specific session-free header/footer; do not import session-aware transactional navigation blindly.
`src/app/layout.tsx:99-107` owns `metadataBase`, title template and `description: SITE_TAGLINE`; marketing needs its own correct canonical metadata authority.
Court token binding in `src/app/globals.css:56-57` maps `--color-brand: var(--brand)` and `--color-brand-foreground: var(--brand-foreground)`.
Court definitions at 196-224 include `--brand: oklch(0.58 0.208 25)` and matching label ink; use semantic classes rather than new palette literals.
Home uses balanced audience entries into Hosts/Players; header Open App and audience app CTAs are same-tab absolute app links.
Hosts retains four real gated steps; Players three, anonymous search first; FAQ stacks Players then Hosts with keyboard-expandable answers.

### Safe screenshots and behavior tests

`e2e/helpers/visual-drive.ts:238-243` separates `navigate(ctx)`, optional `interact?(ctx)`, and `cleanup?(ctx)`.
Use real navigation/state assertions before capture. Its header at 28-58 explains wrong-state captures, clocks and tile stability.
`scripts/seed-baseline-fixtures.ts` is tracked fixture provenance, not permission to expose fixture identities or production data.
Use safe demo states for search/listing/availability/host verification; redact personal, bank and identity information before publishing captures.
Existing fixed fixture dates have expired by this phase (visual-drive 94-99); refresh safe fixture strategy before capture, not thresholds/skips.
Unit matrix pattern from `tests/auth/ops-host-routing.test.ts:125-126`:
```ts
it.each(cases)("routes %s", (_label, pathname, host, kind, path) => {
  expect(outcome(proxy(request(pathname, host)))).toEqual({ kind, path });
});
```
Extend authority/method/query/internal-route cases; use `tests/auth/public-origin-callers.test.ts` for consumer migration.
Email regressions: `tests/auth/email-injection.test.ts:369-374` probes raw heading/paragraph escaping; `tests/auth/email-dev-fallback.test.ts:23-27` stubs missing key/production env.
Callback/action analogs: `tests/security/safe-callback-url.test.ts`, `tests/auth/capability-activate.test.ts`.
Browser authority contexts from `e2e/ops-auth.spec.ts:44-45`:
```ts
const operatorContext = await browser.newContext({ baseURL: OPS_ORIGIN });
const replacementContext = await browser.newContext({ baseURL: OPS_ORIGIN });
```
Use independent contexts for app/marketing/ops and exact local aliases; assert session isolation, Next navigation/RSC/cache behavior, same-tab CTAs and Contact feedback.

## Shared Patterns

- Auth/guards: exact authorities, checked relative callbacks, authenticated capability action with audit; never capability writes on GET.
- Errors: structured `{ ok, error }` feedback and explicit HTTP status; generic transport logs with no submitted PII.
- Abuse: `src/lib/rate-limit.ts:108-132` returns `{ ok: false, retryAfter }`; bounded Map ceiling is 50,000 (61), process-local (54). Pair public budgets with bounded keys/honeypot/body limits and verified deployment controls.
- Ingress: no existing trusted public IP extraction analog found; exact Origin check and trusted ingress validation need new policy. Do not copy arbitrary forwarded headers.
- Deployment docs: Phase 23 `23-EVIDENCE.md:3-8,30-42` provides redacted environment/endpoint/status ledgers. Record fresh inventory and rollback disposition; historical settings do not prove current provider values.

## No Analog Found

| File/Policy | Role | Data Flow | Reason |
|---|---|---|---|
| Trusted Contact ingress / deployment-wide abuse policy | utility/config | request-response | Existing limiter has no trusted IP authority or deployment-wide store guarantee |
| Complete app/marketing split and legacy compatibility policy | middleware/config | request-response | Exact-host ops partition is reusable, but second public host/search collisions/cache separation need new behavior |

## Metadata

**Search scope:** tracked `src`, `tests`, `e2e`, scripts, Phase 23 evidence; phase context/research; project AGENTS and local skill indexes.
**Extraction:** Five primary families: host routing, auth activation, forms/mail, Court shell, test/capture fixtures; supporting references only where needed.
**Date:** 2026-10-08. No application edits, external research, deployment mutations, tests or commits performed.
