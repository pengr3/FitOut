# Phase 23: Production Domain, Email & Reachable Support - Pattern Map

**Mapped:** 2026-09-11  
**Files analyzed:** 10 planned modifications / additions  
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/site.ts` | utility / public constants | transform | `src/lib/site.ts` | exact — edit existing owner |
| `src/lib/email.ts` | service | request-response | `src/lib/email.ts` | exact — edit singleton transport |
| `src/lib/app-origins.ts` | utility / config | request-response | `src/lib/app-origins.ts` | exact — edit origin authority |
| `src/app/layout.tsx` | route / metadata config | transform | `src/app/layout.tsx` | exact — edit metadata authority |
| `tests/design/site-contacts.test.ts` | test | transform | `tests/design/site-contacts.test.ts` | exact |
| `tests/auth/email-dev-fallback.test.ts` | test | request-response | `tests/auth/email-dev-fallback.test.ts` | role-match |
| `tests/auth/secret-config.test.ts` | test | request-response | `tests/auth/secret-config.test.ts` | exact |
| `tests/auth/ops-host-routing.test.ts` | test | request-response | `tests/auth/ops-host-routing.test.ts` | exact |
| `tests/design/scaffold-residue.test.ts` | test | transform | `tests/design/scaffold-residue.test.ts` | exact |
| `23-EVIDENCE.md` | configuration / evidence document | event-driven | `20-EVIDENCE.md` | role-match |

`23-VALIDATION.md` already exists and should be updated only if plan/task identifiers change. Vercel, Resend, Google OAuth, PayMongo, Didit, and Inngest settings are control-plane mutations, not repository configuration files: record their redacted outcome in `23-EVIDENCE.md`; do not create DNS, secret, or provider-token files.

## Pattern Assignments

### `src/lib/site.ts` (utility, transform)

**Analog:** `src/lib/site.ts` (tracked)

**Single-owner constant** (lines 66-70):

```ts
/**
 * A real, monitored support address — or `null` while there is none. Read the D-26 block above
 * before changing this line; it is the only line that needs changing.
 */
export const SUPPORT_EMAIL: string | null = null;
```

Change this one declaration to the monitored launch Gmail address. Preserve the nullable type and revise the nearby rationale so the future dedicated-inbox procedure remains: replace this declaration once, deploy, then repeat the delivery/reply walk. Do not add an environment variable or retype the address elsewhere.

**Existing consumers to preserve:** `src/components/patterns/site-footer.tsx:199-203`, `src/lib/email-shell.ts:159-169`, and `src/components/booking/support-path.tsx:160-166` all derive their public support affordance from this export.

---

### `src/lib/email.ts` (service, request-response)

**Analog:** `src/lib/email.ts` (tracked)

**Imports and singleton transport** (lines 12-43):

```ts
import { Resend } from "resend";
import { renderEmail, escapeHtml } from "@/lib/email-shell";

const key = process.env.RESEND_API_KEY;
const resend = key ? new Resend(key) : null;
const FROM = process.env.EMAIL_FROM ?? "FitOut <onboarding@resend.dev>";
```

Add `SUPPORT_EMAIL` from `@/lib/site` beside the existing local imports. Keep `RESEND_API_KEY` server-only and let Vercel Production set `EMAIL_FROM=FitOut <updates@send.fitout.live>`; the sandbox value remains a local fallback, never a production configuration literal.

**One payload for every sender** (lines 49-85):

```ts
async function send(to: string, subject: string, html: string, text: string, options = {}) {
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      console.error("RESEND_API_KEY missing in production — email NOT sent (link withheld from logs).");
      return { delivered: false };
    }
    // local-only fallback omitted
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html, text });
  if (error) {
    console.error("resend delivery failed");
    return { delivered: false };
  }
  return { delivered: true, transport: "resend" };
}
```

Add the Resend SDK's installed, type-confirmed `replyTo` field only in this call, derived as `SUPPORT_EMAIL ?? undefined`. This covers auth, lifecycle, notification, and staff-invite mail without template-specific choices. Preserve the redacted error path; never log Resend errors/payloads, recipients, URLs, or tokens.

**Ops boundary to retain** (lines 117-142):

```ts
const { OPS_APP_ORIGIN } = await import("@/lib/app-origins");
if (inviteUrl.origin !== OPS_APP_ORIGIN) {
  throw new Error("invalid staff invitation origin");
}
```

Changing the public domain must not turn staff invitations into public-host links; `OPS_APP_URL` is the source for that production host.

---

### `src/lib/app-origins.ts` (utility/config, request-response)

**Analog:** `src/lib/app-origins.ts` (tracked)

**Validated origin parsing** (lines 8-36):

```ts
function parseOrigin(value: string | undefined, key: string, localFallback?: string): URL {
  const candidate = configuredValue(value) ?? localFallback;
  if (candidate === undefined) throw new Error(`${key} must be configured as an absolute http(s) origin`);
  const parsed = new URL(candidate);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username !== '' ||
      parsed.password !== '' || parsed.pathname !== '/' || parsed.search !== '' || parsed.hash !== '') {
    throw new Error(`${key} must contain only an absolute http(s) origin`);
  }
  return new URL(parsed.origin);
}
```

Retain this exact validation and no-wildcard model. Reorder public-origin resolution so an exact `VERCEL_URL` becomes the public origin for a Vercel Preview whenever Production-only public values are absent; keep `http://localhost:3000` only for non-Vercel local development.

**Exact Preview and trust lists** (lines 79-107):

```ts
function configuredPreviewUrl(): URL | null {
  const authority = configuredValue(process.env.VERCEL_URL);
  if (hostnameFromAuthority(authority) === null) return null;
  return new URL(`https://${authority}`);
}

export const AUTH_ALLOWED_HOSTS = Array.from(new Set(
  [publicUrl.host.toLowerCase(), opsUrl.host.toLowerCase(), previewUrl?.host.toLowerCase()]
    .filter((host): host is string => host !== undefined),
));
```

The target behavior is one exact preview authority, not a `*.vercel.app` suffix rule. Preserve `classifyRequestHost()`'s public-default/unknown fail-closed route behavior (lines 109-118).

---

### `src/app/layout.tsx` (route/metadata config, transform)

**Analog:** `src/app/layout.tsx` (tracked)

**Metadata-base resolver** (lines 52-106):

```ts
const DEFAULT_APP_URL = "http://localhost:3000";

function resolveMetadataBase(): URL {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && URL.canParse(configured)) {
    const url = new URL(configured);
    if (url.protocol === "http:" || url.protocol === "https:") return url;
  }
  return new URL(DEFAULT_APP_URL);
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
```

Make this consume the same validated public/preview origin authority as absolute links and Better Auth (rather than separately falling back to localhost in a Vercel Preview). Keep metadata server-side; `NEXT_PUBLIC_APP_URL=https://fitout.live` belongs only to Vercel Production.

---

### Focused tests (test, request-response / transform)

**Support guard:** `tests/design/site-contacts.test.ts` (tracked).

Its import and two-state branch are the contract to preserve:

```ts
import { SUPPORT_EMAIL } from "@/lib/site";
// SUPPORT_EMAIL === null: zero unguarded support affordances.
// SUPPORT_EMAIL is a string: a valid address and exactly one footer mailto that interpolates it.
```

Do not weaken its AST scan or exclusions. Update only stale comments/exclusions that refer to the sandbox sender as the only real address; the real support address must remain sourced from the constant, not introduced as an address-shaped literal in a UI file.

**Email transport safety:** `tests/auth/email-dev-fallback.test.ts` (tracked), lines 5-19 and 21-82.

```ts
beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

vi.stubEnv("RESEND_API_KEY", "");
vi.stubEnv("NODE_ENV", "production");
const { sendResetPassword } = await import("@/lib/email");
```

Use the same reset-env-then-dynamic-import structure for a mocked Resend client/payload assertion. Assert the sole payload has `replyTo === SUPPORT_EMAIL`, while retaining current assertions that production missing-key logs no bearer token and that staff invitations never expose a credential.

**Auth/origin fixtures:** `tests/auth/secret-config.test.ts` (tracked), lines 20-66, and `tests/auth/ops-host-routing.test.ts` (tracked), lines 16-90.

```ts
vi.stubEnv("BETTER_AUTH_URL", PUBLIC_ORIGIN);
vi.stubEnv("NEXT_PUBLIC_APP_URL", PUBLIC_ORIGIN);
vi.stubEnv("OPS_APP_URL", OPS_ORIGIN);
vi.stubEnv("VERCEL_URL", PREVIEW_HOST);
vi.resetModules();
```

Extend this fixture style with `fitout.live`, `ops.fitout.live`, an exact generated preview host, a non-Vercel local mode, and an unknown host. Assert Preview uses `https://${VERCEL_URL}` for `PUBLIC_APP_ORIGIN`, Better Auth fallback/allow/trust values, absolute public links, and metadata—not localhost. Continue to assert an adjacent preview-like hostname is `unknown`.

**Metadata shape:** `tests/design/scaffold-residue.test.ts` (tracked), lines 103-146.

```ts
async function loadMetadata() {
  const mod = await import("@/app/layout");
  return mod.metadata;
}

expect(metadata.metadataBase).toBeInstanceOf(URL);
expect(base.protocol).toMatch(/^https?:$/);
```

Add environment-isolated reload coverage only if needed to prove the resolver accepts canonical production and exact preview origins. Do not turn this structural test into a dashboard check.

---

### `23-EVIDENCE.md` (configuration/evidence, event-driven)

**Analog:** `20-EVIDENCE.md` (tracked)

**Evidence ledger pattern:** start with a short title and append dated, redacted sections keyed to a deployment or a control-plane operation, for example:

```md
## Production service setup — live acceptance blocked at DNS

- Date: 2026-09-08T18:22:12+08:00
- Domain assignment: ...
- Resend: ...
```

Use this shape for Vercel domain health (`fitout.live`, redirect-only `www`, and `ops`), Resend domain verification and exact provider-generated DNS records' *status* (not values), Production-only variable presence (not values), provider callback inventory/test receipt, and real delivery/reply. Store timestamps, host/endpoint class, environment, status, and redaction statement only—no API keys, DNS record values, bearer URLs, email tokens, message IDs, recipient addresses, or mail headers.

## Shared Patterns

### One support-address authority

**Source:** `src/lib/site.ts:66-70`  
**Apply to:** support UI, email shell, Resend `replyTo`, and future inbox replacement.

```ts
export const SUPPORT_EMAIL: string | null = null;
```

The value can appear only at its owner. Consumers import it; they do not duplicate the Gmail literal.

### Exact origin authority

**Source:** `src/lib/app-origins.ts:79-127`  
**Apply to:** Better Auth fallback/trust, absolute public/ops URLs, metadata, and preview behavior.

```ts
export function classifyRequestHost(rawHost: string | null | undefined): RequestHostClass {
  const hostname = hostnameFromAuthority(rawHost);
  if (hostname === null) return "unknown";
  if (hostname === OPS_APP_HOSTNAME) return "ops";
  if (hostname === PUBLIC_APP_HOSTNAME || hostname === PREVIEW_APP_HOSTNAME) return "public";
  return "unknown";
}
```

No suffix/wildcard trust and no `x-forwarded-host` authority. Public and ops remain separate cookie/origin surfaces.

### Singleton email delivery and safe failure

**Source:** `src/lib/email.ts:49-85`  
**Apply to:** every existing mail family.

```ts
if (process.env.NODE_ENV === "production") {
  console.error("RESEND_API_KEY missing in production — email NOT sent (link withheld from logs).");
  return { delivered: false };
}
```

Add `replyTo` at the one Resend payload; retain this error policy and redacted provider error handling.

### Signed callback endpoints

**Sources:** `src/app/api/paymongo/webhook/route.ts`, `src/app/api/didit/webhook/route.ts`, `src/app/api/inngest/route.ts:36-50` (all tracked).  
**Apply to:** dashboard URL replacement only.

```ts
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  !process.env.INNGEST_SIGNING_KEY
) {
  throw new Error("INNGEST_SIGNING_KEY is required in production ...");
}
```

Keep each existing signed receiver, event scope, and secret; only inventory/correct its deployed destination. Do not implement a new callback route or weaken verification.

## No Analog Found

| File / operation | Role | Data Flow | Reason |
|---|---|---|---|
| Vercel domain assignment, DNS records, redirect, and Production-only variables | external control-plane configuration | event-driven | No repository source can model account-specific DNS/secret values; use Vercel UI/CLI and `23-EVIDENCE.md`. |
| Resend `send.fitout.live` verification and DMARC monitoring record | external mail configuration | event-driven | Provider-generated SPF/DKIM/MX values are account-specific and must not enter source. |
| Google OAuth, PayMongo, Didit, and Inngest dashboard callback settings | external provider configuration | event-driven | Routes exist, but dashboard state is external; preserve endpoint signing and record a redacted authenticated receipt. |

## Metadata

**Analog search scope:** `src/lib`, `src/app`, `src/components`, `tests/auth`, `tests/design`, and tracked phase evidence  
**Files scanned:** 16  
**Pattern extraction date:** 2026-09-11
