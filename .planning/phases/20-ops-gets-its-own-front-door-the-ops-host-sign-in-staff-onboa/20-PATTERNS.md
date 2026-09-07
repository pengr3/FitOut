# Phase 20: Ops Gets Its Own Front Door — Pattern Map

**Mapped:** 2026-09-08
**Files analyzed:** 29 planned new/modified files (recommended filenames remain planner discretion)
**Analogs found:** 29 / 29

## Framework Constraints Read First

- Next.js 16.2.7 requires the root convention and named export to be `proxy`, not `middleware`; only one proxy file is supported (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md:15-49`).
- Proxy executes before filesystem routes; Server Functions are POSTs to their using route and still require authorization inside every function (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:204-219`).
- Route groups do not affect URL paths and two groups cannot resolve the same path, so visible ops `/login` must rewrite to a unique internal `_ops-auth` pathname (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md:12-31`).
- Dynamic route `params` are promises in Next 16 (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`, Dynamic Route Segments).

## File Classification

| New/Modified File | Role | Data Flow | Closest tracked analog | Match |
|---|---|---|---|---|
| `src/proxy.ts` (rename `src/middleware.ts`) | middleware/proxy | request-response rewrite | `src/middleware.ts` | exact |
| `src/lib/app-origins.ts` | config utility | transform | `src/lib/safe-callback-url.ts` | role-match |
| `src/lib/auth.ts` | config/service | request-response | current file | exact |
| `src/app/api/auth/[...all]/route.ts` | route | request-response | current file | exact |
| `src/lib/ops/ops-callback.ts` | utility | transform | `src/lib/safe-callback-url.ts` | exact-flow |
| `src/lib/validation/ops-staff.ts` | utility | transform/validation | `src/lib/validation/auth.ts` | exact |
| `src/app/(ops-auth)/_ops-auth/layout.tsx` | component/layout | request-response | `src/app/(auth)/layout.tsx` | exact |
| `.../_ops-auth/login/page.tsx` | component | request-response | `src/app/(auth)/login/page.tsx` | exact |
| `.../_ops-auth/forgot-password/page.tsx` | component | request-response | `src/app/(auth)/forgot-password/page.tsx` | exact |
| `.../_ops-auth/reset-password/page.tsx` | component | request-response | `src/app/(auth)/reset-password/page.tsx` | exact |
| `.../_ops-auth/invite/[token]/page.tsx` | component | request-response/read | `src/app/(public)/invite/[token]/page.tsx` | exact-flow |
| `.../_ops-auth/invite/[token]/loading.tsx` | component | request-response | `src/app/(public)/invite/[token]/loading.tsx` | exact |
| `src/app/actions/ops-auth.ts` | service/Server Function | request-response | `src/app/actions/auth.ts` | exact |
| `src/app/actions/ops-staff.ts` | service/Server Function | CRUD | `src/app/actions/ops-review.ts` | exact |
| `src/lib/ops/invitations.ts` | service | CRUD/event-driven email | `src/lib/group/rsvp.ts` + `src/lib/group/token.ts` | role/flow |
| `src/lib/ops/grant.ts` | service | transactional CRUD | current file + `src/lib/availability/units.ts` | exact |
| `src/lib/ops/staff-management.ts` | service/read model | CRUD/read | `src/lib/ops/grant.ts` | exact |
| `src/lib/email.ts` | service | event-driven I/O | current file | exact |
| `src/components/ops/staff-management-panel.tsx` | component | CRUD/request-response | `src/app/(ops)/ops/page.tsx` | role-match |
| `src/components/ops/staff-action-dialog.tsx` | component | request-response | `src/components/ops/ops-reject-dialog.tsx` | exact |
| `src/app/(ops)/ops/page.tsx` | component/page | request-response | current file | exact |
| `src/app/(ops)/ops/layout.tsx` | component/layout | request-response | current file | exact |
| `src/app/(ops)/ops/error.tsx` | component/boundary | request-response | current file | exact |
| `scripts/ops-grant.ts` | utility/CLI | transactional CRUD | current file + `src/lib/ops/grant.ts` | exact |
| `tests/auth/ops-host-routing.test.ts`, `tests/auth/ops-host-auth.test.ts` | test | request-response | `tests/security/safe-callback-url.test.ts`, `tests/auth/session-config.test.ts` | role-match |
| `tests/ops/staff-invitation.test.ts`, `tests/ops/staff-policy.test.ts` | test | transactional CRUD | `tests/ops/grant-cli.test.ts`, `tests/group/seat-claim-race.test.ts` | exact-flow |
| `tests/design/ops-host-invariants.test.ts` and existing design inventories | test/config | static analysis | `tests/design/ops-guard-coverage.test.ts` | exact |
| `e2e/ops-auth.spec.ts` | test | browser request-response | `e2e/auth-keyboard.spec.ts` | exact |
| `.env.example` | config | transform | current file | exact |

No schema or migration file belongs to this phase.

## Pattern Assignments

### `src/proxy.ts` and `src/lib/app-origins.ts`

**Analog:** `src/middleware.ts` (tracked). Preserve the first rename commit byte-for-byte except convention/export.

**Imports and loop-guard pattern** (`src/middleware.ts:34-64`):

```ts
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { SESSION_CHECK_PATH, RETURN_PARAM, CHECKED_PARAM, LOGGED_OUT_ONLY } from "@/lib/session-check";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!LOGGED_OUT_ONLY.some((p) => pathname.startsWith(p))) return NextResponse.next();
  // `_sc` is checked before the cookie; retain this order.
  const check = new URL(SESSION_CHECK_PATH, request.url);
  check.searchParams.set(RETURN_PARAM, `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(check);
}
```

**Matcher pattern** (`src/middleware.ts:67-72`): current constant matcher is `matcher: ["/login", "/signup"]`. Widen only in the host-routing commit. Keep proxy database/auth-free; use `NextResponse.rewrite(new URL(internalPath, request.url))`, exact normalized configured hosts, and an explicit path matrix.

For origin parsing, copy the fail-closed `new URL`/`try` shape from `src/lib/safe-callback-url.ts:83-101`, not suffix matching.

### Auth origin config and ops callback

**Analogs:** `src/lib/auth.ts`, `src/lib/safe-callback-url.ts` (tracked).

**Current auth seam to modify** (`src/lib/auth.ts:51-72`):

```ts
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  trustedOrigins: [BETTER_AUTH_URL],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 3600,
    revokeSessionsOnPasswordReset: true,
  },
});
```

Replace the static origin values with one validated authority shared by Proxy/auth/navigation. Preserve one Better Auth instance, plugin order, soft verification, reset settings, and the absence of both `advanced.crossSubDomainCookies` and `session.cookieCache`.

**Callback parser** (`src/lib/safe-callback-url.ts:83-107,125-131`):

```ts
export function safeCallbackPath(raw: string | null | undefined, origin: string): string {
  if (!raw || !raw.startsWith("/")) return "/";
  let target: URL;
  let self: URL;
  try { target = new URL(raw, origin); self = new URL(origin); }
  catch { return "/"; }
  if (target.origin !== self.origin) return "/";
  const candidate = `${target.pathname}${target.search}${target.hash}`;
  if (candidate.startsWith("//")) return "/";
  try { if (new URL(candidate, origin).origin !== self.origin) return "/"; }
  catch { return "/"; }
  return candidate;
}
```

`ops-callback.ts` should delegate to this parser, then allow only `/ops` or `/ops/...`; fallback `/ops`.

### Ops-auth pages, layout, and actions

**Primary page analog:** `src/app/(auth)/login/page.tsx` (tracked).

**Imports/form pattern** (`src/app/(auth)/login/page.tsx:40-59,110-132`):

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { PanelCard } from "@/components/patterns/panel-card";

const form = useForm<LoginInput>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: "", password: "" },
});
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
```

Copy `FormField`/`FormLabel`/`FormMessage`, `type="email"`, and autocomplete conventions from lines 149-190. Copy `PanelCard` with `titleAs="h1"` from lines 140-150. Omit the Google path and signup footer at lines 135-138 and 220-244. Ops credential transition should move server-side so role can be checked and a nonstaff session immediately cleared.

**Server Function validation/error pattern** (`src/app/actions/auth.ts:23-40,76-88`): validate with the same shared Zod schema on the server, return a discriminated union, keep errors inline/generic, and do not use thrown `redirect()` for expected form outcomes. Pass `headers: await headers()` to every direct `auth.api` call so Better Auth resolves the correct host.

**Dynamic invitation page pattern** (`src/app/(public)/invite/[token]/page.tsx:88-107,205-234`):

```tsx
export default async function InvitePage({ params }: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const group = await resolveInvite(token);
  // malformed and unknown values fold into one inactive branch
  if (!group.active) return <InviteInactive ... />;
}
```

Use request `cache()` if metadata/page share a lookup. Staff-invite GET is read-only; all inactive token classes use one shared declaration/component and identical DOM. The active view renders email as `<dl><dt/><dd/></dl>`, never an input, and POST accepts token/name/password only.

### `src/lib/ops/invitations.ts` and email delivery

**Token analog:** `src/lib/group/token.ts:12-34` (tracked).

```ts
import { randomBytes } from "node:crypto";
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TOKEN_LENGTH = 20;
function mintToken(): string {
  const bytes = randomBytes(TOKEN_LENGTH);
  let out = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) out += CROCKFORD[bytes[i] % CROCKFORD.length];
  return out;
}
```

Reuse this ~100-bit shape, hash with SHA-256 before persistence, and never audit/log the raw token in production. Use the existing `verification` columns; no migration. Invite/upsert, resend/update, cancel/delete, and accept/delete must use predicates plus `RETURNING`; acceptance continues inside the same transaction that creates user/account, grants staff, and audits.

**Email shell/transport analog** (`src/lib/email.ts:41-63,76-92`):

```ts
const resend = key ? new Resend(key) : null;
async function send(to: string, subject: string, html: string, text: string) {
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      console.error("RESEND_API_KEY missing in production — email NOT sent (link withheld from logs).");
      return;
    }
    console.log(`[email:dev] to=${to} ${subject}\n${html}`);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html, text });
  if (error) console.error("resend error", error);
}
```

Compose invite mail through `renderEmail`; extend the staff-invite path with a typed delivery result because the current helper swallows production delivery failure. Keep the row pending when delivery fails.

### `src/lib/ops/grant.ts` and `src/lib/ops/staff-management.ts`

**Shared policy analog:** current `src/lib/ops/grant.ts` (tracked).

**Constants/injected connection/audit** (`src/lib/ops/grant.ts:63-79,126-144`):

```ts
import type { DbConn } from "@/lib/availability/read-model";
import { audit, user } from "@/lib/db/schema";
export const GRANT_ACTION = "ops_grant_staff";
export const REVOKE_ACTION = "ops_revoke_staff";
export const STAFF_ROLE = "staff";
export const DEFAULT_ROLE = "user";
await dbConn.insert(audit).values({
  id: randomUUID(), actorId, action, outcome, meta,
});
```

Keep DB connection injection and audit metadata ids/enums only. Refactor the one `writeRole()` seam (`src/lib/ops/grant.ts:159-217`) rather than adding a UI-only role writer. Ordinary grant must refuse capability-bearing accounts; only explicit CLI conversion clears both capabilities and sets staff atomically.

**Serialized transaction analog** (`src/lib/availability/units.ts:965-989`):

```ts
const claimed = await db.transaction(async (tx) => {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(
    hashtextextended(${input.listingId}::text || ':' || ${dateKey}::text, 0))`);
  // local SQL only until commit
});
```

For staff policy, acquire one shared staff-policy advisory lock as the first transaction statement. Then enforce self/last-staff and current version in the conditional write; `RETURNING` is the success authority. No email or other external I/O occurs before commit.

**Roster ordering analog** (`src/lib/ops/grant.ts:233-240`):

```ts
return dbConn.select({ id: user.id, email: user.email, createdAt: user.createdAt })
  .from(user)
  .where(eq(user.role, STAFF_ROLE))
  .orderBy(asc(user.createdAt));
```

Preserve positive equality and oldest-first order. Pending invitations are newest-first. Read model supplies completed absolute labels, `You`, eligibility, and shared refusal reason; client components receive no raw dates or internal ids in visible content.

### Staff management UI and protected page

**Page guard/composition analog:** `src/app/(ops)/ops/page.tsx:27-40,128-140,166-212` (tracked).

```tsx
export default async function OpsQueuePage() {
  await requireStaff(); // first statement
  const [items, now] = await Promise.all([loadReviewQueue(db), readDbNow(db)]);
  return <div className={OPS_QUEUE_SHELL}>...</div>;
}
```

Keep the existing `PageHeader`, queue list/empty branch, and row JSX first. Append one `PanelCard` 48px after the complete queue. Staff panel uses h2 → h3, semantic `<ul>/<li>`, one persistent result slot, and no nested cards.

**Dialog analog:** `src/components/ops/ops-reject-dialog.tsx:63-75,240-260,401-412` (tracked). Compose `ResponsiveDialog`; controlled `open`, `onOpenChange`, title/description, trigger, and footer. Put the safe action first in DOM order, disable both actions while pending, keep refusal alert inside the dialog, and use `onCloseAutoFocus` only for trigger-unmount success focus restoration required by this phase.

The ops layout retains `assertStaff()` for the pre-stream status line and the page/action layers retain `requireStaff()`. Replace the ops composition’s root-relative profile action with one ops-host sign-out; pass absolute configured public URLs to footer/error exits.

### CLI and tests

**CLI/database test analog:** `tests/ops/grant-cli.test.ts:54-65,233-295` (tracked). Use isolated `setupTestDb`/`teardownTestDb`, import real policy functions, inspect written rows and audit, and assert distinct argument refusals. Extend parser tests for the explicit conversion flag and prove ordinary grant never strips capabilities.

**Static security census analog:** `tests/design/ops-guard-coverage.test.ts:96-134,318-328,528-577` (tracked). Resolve imported bindings with TypeScript AST rather than grep; enumerate every ops page/action; assert page guards exist and `requireStaff()` is the first action statement; pin counts and forbid ops/ops-auth scoped `not-found.tsx`.

Add race tests patterned after existing database concurrency tests: concurrent accept has one winner, concurrent/stale resend/cancel cannot claim superseded state, and two concurrent different-target revokes cannot remove all staff. Add production `next start` probes that compare status, headers, and SHA-256 raw response bodies across signed-out/nonstaff/nonexistent denials.

## Shared Patterns

### Three-layer authorization

- Layout: `assertStaff()` before children to secure the HTTP status line.
- Protected page: `await requireStaff()` at the top of every render.
- Server Function: `const staff = await requireStaff()` must be the first statement, before parse, rate limit, or target lookup.
- Proxy only chooses a surface; it never authorizes.

### Validation and public refusal

Client and server share Zod schemas. Expected failures return discriminated unions and preserve inputs/authoritative rows. Nonstaff sign-in is neutral. All malformed/unknown/expired/cancelled/used invitation tokens share one inactive constant and component.

### Transaction and audit boundary

Rare staff mutations serialize on one transaction-scoped advisory lock. Conditional `INSERT`/`UPDATE`/`DELETE ... RETURNING` decides success. Audit is written in the same transaction, with ids and enum-shaped metadata only. External email happens after commit.

### UI inventories

Register new card-bearing files as `panel-card` adopters; do not add raw-card exceptions. Add only genuinely rendered staff result live regions, update loading coverage for async ops-auth pages, and include dialog adopters in autofocus tests. Keep `ACCENT_USES.length === 10`, selector contract unchanged unless proven necessary, and do not edit vendored UI primitives.

## No Analog Found

None. Invitation persistence has no single exact module, but its credential, transactional, audit, inactive-state, and email pieces all have tracked analogs above. The planner should combine them with the schema-native state machine in `20-RESEARCH.md` rather than invent a new dependency or schema.

## Metadata

**Analog search scope:** `src/`, `scripts/`, `tests/`, `e2e/`, installed Next.js 16.2.7 docs
**Tracked-source gate:** every named repository analog returned non-empty from `git ls-files -- <path>`
**Strong analogs read:** 15
**Pattern extraction date:** 2026-09-08
