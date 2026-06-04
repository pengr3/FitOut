# Phase 2: Listings & Host Onboarding - Pattern Map

**Mapped:** 2026-06-04
**Files analyzed:** 26 new/modified (5 task clusters + Wave 0 tests + shadcn components)
**Analogs found:** 19 with a strong analog / 26 total (7 genuinely new — see § No Analog Found)

> Source of file list: 02-RESEARCH.md § "Recommended Project Structure" (lines 177-202) + § "Wave 0 Gaps" (lines 603-614), cross-checked against 02-CONTEXT.md decisions and 02-UI-SPEC.md component inventory. The five clusters are (A) data model → (B) wizard → (C) photo gallery → (D) public detail page → (E) Stripe/webhook gate, plus Wave 0 test scaffolding.

> **Codebase reality check (verified, do not re-discover):** the existing app is a small Phase-1 surface. There is exactly ONE API route (`src/app/api/auth/[...all]/route.ts`, a Better Auth catch-all), ZERO existing webhook handlers, ZERO pgEnum usage, ZERO join tables, and money/geo columns do not yet exist. `src/middleware.ts` matches ONLY `/login` and `/signup` — it does NOT touch `/api/stripe/*`, so RESEARCH Pitfall 2 (middleware buffering the webhook body) is already a non-issue; the planner should still add a one-line note rather than a code change. The single migration is `drizzle/0000_sturdy_nighthawk.sql`; the test harness replays raw SQL with `--> statement-breakpoint` splitting and `"public".` → test-schema rewriting (`tests/helpers/db.ts`).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/db/schema.ts` (EXTEND) | model/schema | CRUD | same file (Phase-1 `user`/`session` tables) | exact (same file) |
| `src/lib/validation/listing.ts` | validation | transform | `src/lib/validation/profile.ts` + `auth.ts` | exact |
| `src/lib/listing-vocab.ts` | config/util | transform | (none — new constants module) | no-analog (structural ref below) |
| `src/lib/bookability.ts` | service/util (pure) | transform | `src/lib/profile.ts` (`publicProfile` pure projection) | role-match |
| `src/lib/cloudinary.ts` (EXTEND) | service | file-I/O | same file (`uploadAvatar`) | exact (same file) |
| `src/lib/stripe.ts` | service/config | request-response | `src/lib/db/index.ts` (configured-client singleton) | partial (config-singleton shape only) |
| `src/app/actions/listing.ts` | server-action | CRUD | `src/app/actions/profile.ts` + `capability.ts` | exact |
| `src/app/actions/listing-photo.ts` | server-action | CRUD / batch (reorder) | `src/app/actions/profile.ts` (session+ownership+revalidate) | role-match |
| `src/app/actions/stripe-connect.ts` | server-action | request-response | `src/app/actions/capability.ts` (privileged flip + redirect) | role-match |
| `src/app/api/cloudinary/sign/route.ts` | route handler | request-response | `src/app/api/auth/[...all]/route.ts` (only route precedent) | partial (route-handler shell only) |
| `src/app/api/stripe/webhook/route.ts` | route handler / webhook | event-driven | (none — first webhook in repo) | no-analog (structural ref below) |
| `src/app/(host)/host/page.tsx` (MODIFY) | page (RSC) | request-response | same file (disabled CTA seam) | exact (same file) |
| `src/app/(host)/host/listings/page.tsx` | page (RSC) | CRUD (read) | `src/app/(app)/profile/page.tsx` (RSC session + fetch) | role-match |
| `src/app/(host)/host/listings/new/page.tsx` | page (RSC) | request-response | `src/app/(host)/host/page.tsx` (gated RSC) | role-match |
| `src/app/(host)/host/listings/[id]/edit/page.tsx` | page (RSC) + wizard host | request-response | `src/app/(app)/profile/page.tsx` (RSC seeds a client form) | role-match |
| `src/app/(host)/host/payouts/return/page.tsx` + `/refresh/page.tsx` | page (RSC) | request-response | `src/app/(host)/host/page.tsx` (gated RSC) | role-match |
| `src/app/listings/[id]/page.tsx` | page (RSC, PUBLIC) | request-response | `src/app/(app)/profile/page.tsx` (RSC fetch) — but NO auth gate | role-match (gate inverted) |
| wizard client form(s) (`*-form.tsx` / step components) | component (client) | request-response | `src/app/(app)/profile/profile-form.tsx` (RHF + zodResolver) | exact |
| photo uploader + dnd reorder grid (client) | component (client) | file-I/O / batch | `profile-form.tsx` avatar control (file → action) | partial (graduates to direct upload) |
| address autocomplete + map (client) | component (client) | request-response | (none — new provider widget) | no-analog (structural ref below) |
| `src/components/ui/{select,command,popover,checkbox,switch,radio-group,badge,tabs,sonner,skeleton,alert,progress,separator,tooltip,aspect-ratio}.tsx` | component (shadcn) | — | existing `src/components/ui/*` (avatar/button/form…) | exact (same install pattern) |
| Wave 0 unit tests (`bookability`, `listing-schema`, `cloudinary-sign`, `webhook-signature`) | test (unit) | — | `tests/validation/auth-schema.test.ts`, `tests/auth/capability-activate.test.ts` (input:false invariant) | exact / role-match |
| Wave 0 integration tests (`crud`, `photos`, `status-gate`, `geo-roundtrip`, `webhook-account-updated`) | test (integration) | — | `tests/profile/profile.test.ts` (real action + isolated schema + mocked session) | exact |
| `e2e/public-listing.spec.ts` | test (e2e) | — | (none — no Playwright spec exists yet) | no-analog (Playwright configured, no spec) |
| `tests/helpers/mocks.ts` (EXTEND — Stripe mock) | test helper | — | same file (`mockCloudinary`, `mockResend`, `resetMocks`) | exact (same file) |

---

## Pattern Assignments

### Cluster A — Data model

#### `src/lib/db/schema.ts` (EXTEND — model, CRUD)

**Analog:** the file itself. New `listing`, `listing_photo`, `listing_amenity`, `listing_activity_tag`, and `host_payout` tables are hand-authored ALONGSIDE the Better-Auth-owned tables. RESEARCH § Pattern 1 (lines 204-270) gives the full target schema; copy these conventions from the existing rows.

**File header convention** — the existing header (lines 1-8) documents the regenerate-vs-hand-edit rule. The NEW tables are hand-authored (Better Auth only owns `user/session/account/verification`), so add a note that these are NOT regenerated by the Better Auth CLI. Keep the load-bearing convention (lines 5-8):
```typescript
// Manual post-generation tweak (kept on regen): all timestamp columns are timezone-aware
// (`timestamptz`, withTimezone:true) to honor the project's UTC-everywhere constraint
```

**`text` PK + FK-to-user pattern** (copy exactly — `user.id` is `text`, so all listing PKs/FKs must be `text`, lines 13, 48-50):
```typescript
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  ...
});
// FK precedent (session table, lines 48-50):
userId: text("user_id")
  .notNull()
  .references(() => user.id, { onDelete: "cascade" }),
```

**timestamptz columns** (copy the exact triple — created/updated, lines 19-23):
```typescript
createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
updatedAt: timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .$onUpdate(() => /* @__PURE__ */ new Date())
  .notNull(),
```

**Index declaration pattern** (copy — the `(table) => [index(...)...]` array form, lines 52, 76, 92):
```typescript
(table) => [index("session_userId_idx").on(table.userId)],
```
New listing indexes (`listing_host_idx`, `listing_status_idx`, the GiST `listing_location_gist`, and the `uniqueIndex` on `(listingId, position)`) follow this same array-return shape — see RESEARCH lines 241-245, 254-257.

**NEW to this file (no in-repo precedent — see § No Analog Found):** `pgEnum` (status/booking_mode/space_type), `geometry(point, srid:4326)` column + GiST index, integer-cents money columns, and join tables. Structural reference = RESEARCH § Pattern 1 (lines 207-269) and the PostGIS migration note (lines 270, 471-475).

#### `src/lib/listing-vocab.ts` (config — D-08 locked vocabulary)

See § No Analog Found. Structural reference: `PRIVATE_PROFILE_FIELDS` const-array + `as const` export in `src/lib/profile.ts` lines 40-46 is the nearest "module of exported constants the rest of the app reads" pattern.

#### `src/lib/bookability.ts` (pure derivation — D-15)

**Analog:** `src/lib/profile.ts` — same "single module that defines a boundary so it can't be bypassed" intent (`publicProfile` is the allow-list projection; `deriveBookable` is the sell-gate). Copy the doc-comment discipline (lines 1-13: "the single place that defines the boundary") and the pure-function-with-typed-input shape:
```typescript
// src/lib/profile.ts lines 54-62 — pure projection over a typed row:
export function publicProfile(user: ProfileUser): PublicProfile {
  return { avatarUrl: user.avatarUrl ?? null, ... };
}
```
Target (RESEARCH lines 318-323): `deriveBookable(listing, host): boolean` = `status==="published" && host.emailVerified && host.payoutsEnabled`. Pure, no DB, no I/O — exactly like `profile.ts`. This is the file the truth-table unit test drives (`tests/listing/bookability.test.ts`).

---

### Cluster B — Wizard

#### `src/lib/validation/listing.ts` (validation — D-02/D-03)

**Analog:** `src/lib/validation/profile.ts` (whole file) + `src/lib/validation/auth.ts`.

**Shared-schema doc header** (copy the contract statement, `auth.ts` lines 1-4):
```typescript
// Shared auth validation schemas (Zod 4). The SAME schema validates in the RHF form
// (via @hookform/resolvers/zod) and again at the top of every server action — the client
// is never trusted (RESEARCH §Shared Zod schema).
```

**Schema + inferred-type export pattern** (copy — `profile.ts` lines 12-20):
```typescript
export const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().max(100).optional(),
  ...
});
export type ProfileInput = z.infer<typeof profileSchema>;
```

**Zod 4 idioms in use (match these):** `z.email()` not `z.string().email()` (`auth.ts` line 16, documented line 5); `z.enum([...])` for fixed vocabularies (`auth.ts` line 17 — the `intent` enum is the precedent for `status`/`bookingMode`/`primarySpaceType` enums); `.optional()` for draft fields, `.min(1)`/`.int().positive()` for publish fields.

Target shape (RESEARCH § Pattern 6, lines 330-341): TWO schemas — `draftSchema` (all `.optional()`, autosave between steps) and `publishSchema` (required core fields + both `*RateCents` as `z.number().int().positive()` + `lat`/`lng` numbers). Integer-cents validation is the LIST-03 contract; the both-rates-required rule is D-03.

#### Wizard client form / step components (`*-form.tsx`)

**Analog:** `src/app/(app)/profile/profile-form.tsx` (whole file) — the canonical RHF + zodResolver + server-action client pattern.

**RHF setup** (copy — lines 9-16, 48-51):
```typescript
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileInput } from "@/lib/validation/profile";
...
const form = useForm<ProfileInput>({
  resolver: zodResolver(profileSchema),
  defaultValues: initial,
});
```

**Submit → server action → structured result handling** (copy — lines 53-63):
```typescript
async function onSubmit(values: ProfileInput) {
  setFormError(null);
  const result = await updateProfile(values);
  if (!result.ok) { setFormError(result.error); return; }
  setSaved(true);
  router.refresh();
}
```

**shadcn `Form` field composition** (copy the `FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage` block — lines 138-153). Reuse `value={field.value ?? ""}` for nullable optionals (line 167). The wizard differs only in: multi-step state, autosave-on-`Save and continue` (D-01 — call the save-step action on each advance), and `sonner` toast for the "saved" affordance (UI-SPEC replaces the inline `saved` `<p role="status">` on lines 253-257 with a toast).

#### Listing wizard pages (RSC hosts)

**Analog:** `src/app/(app)/profile/page.tsx` — RSC reads session, then seeds a client form with `initial` values (lines 16-57). `[id]/edit/page.tsx` mirrors this: read session, fetch the draft listing by id, assert ownership, pass values into the wizard client component. `new/page.tsx` mirrors `(host)/host/page.tsx` (gated RSC that creates a draft then redirects to `[id]/edit`).

**The `(host)` route group already gates these** (verified) — `src/app/(host)/host/layout.tsx` lines 21-34 do the real `auth.api.getSession` + `canHost` check. New pages under `(host)/host/listings/**` inherit it. Still copy the defense-in-depth re-check at page level (`host/page.tsx` lines 14-25) — the project's established belt-and-suspenders.

---

### Cluster C — Photo gallery

#### `src/lib/cloudinary.ts` (EXTEND — service, file-I/O)

**Analog:** the file itself. The header comment (lines 1-9) EXPLICITLY prescribes this phase's graduation:
```typescript
// For a single Phase-1 avatar we route the file
// through the server via upload_stream; Phase 2 galleries should graduate to signed
// direct-to-Cloudinary client uploads (cloudinary.utils.api_sign_request).
```
Reuse the existing configured client (lines 11-17 — `cloudinary.config({...api_secret...})`; the secret-stays-server invariant on line 16). ADD: a `signListingUpload(params)` helper wrapping `cloudinary.utils.api_sign_request` and a `destroyListingPhoto(publicId)` wrapping `cloudinary.uploader.destroy(publicId, { invalidate:true })` for orphan cleanup (RESEARCH lines 289, 295). Keep returning a narrow typed object like `uploadAvatar` does (lines 19-22).

#### `src/app/api/cloudinary/sign/route.ts` (route handler — request-response)

**Analog (shell only):** `src/app/api/auth/[...all]/route.ts` is the only existing route handler, but it just delegates to Better Auth — it is NOT a structural match for a hand-written POST. The real pattern to copy is the **session-gate + ownership check** from the server actions:

**Session gate** (copy from `profile.ts` lines 32-37 / `avatar.ts` lines 52-57 — the exact `auth.api.getSession({ headers })` + 401 guard, which RESEARCH § Pattern 2 lines 282-291 reproduces for the route):
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) return new Response("Unauthorized", { status: 401 });
```

**Ownership check before signing** (mirror the IDOR guard — verify the listing belongs to `session.user.id` before minting a signature; this is the V4 access-control + V12 file control in RESEARCH § Security lines 625-629). The signed param set MUST exactly equal the client param set (RESEARCH Pitfall 3, lines 447-451). Carry forward WR-06 rate-limit on this endpoint (RESEARCH § Security line 638, 642).

#### Photo uploader + dnd reorder grid (client component)

**Analog (partial):** `profile-form.tsx` avatar control (lines 65-132) is the nearest "pick a file → call an action → update preview" precedent, but it routes bytes through the server (the deliberately-simpler avatar path). The gallery DEPARTS from this: bytes go direct to Cloudinary via `next-cloudinary` `<CldUploadWidget signatureEndpoint="/api/cloudinary/sign">` (RESEARCH line 293); only `{public_id, secure_url, position}` metadata comes back to a server action. Reuse the avatar control's busy/error state shape (lines 42-44, 73-79) and the `aria-label` + `role="alert"` a11y (lines 111, 127). `@dnd-kit/sortable` provides reorder — do NOT hand-roll (RESEARCH § Don't Hand-Roll line 423). Per-tile remove uses `--destructive` icon with `aria-label="Remove photo"` (UI-SPEC line 98).

#### `src/app/actions/listing-photo.ts` (server-action — CRUD + batch reorder)

**Analog:** `src/app/actions/profile.ts` (session + revalidate + own-row write). The reorder action is a transaction that rewrites `position` atomically — RESEARCH § Code Examples lines 494-505 gives the exact shape:
```typescript
"use server";
export async function reorderPhotos(listingId: string, orderedIds: string[]) {
  // session + ownership check first (like capability.ts)
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(listingPhoto).set({ position: i })
        .where(and(eq(listingPhoto.id, orderedIds[i]), eq(listingPhoto.listingId, listingId)));
    }
  }); // position 0 = cover (D-04)
}
```
Copy the `requireUserId()` helper shape from `capability.ts` (lines 32-36) for the session resolve, and add the `hostId === session.user.id` ownership assertion (the IDOR guard the existing actions imply but the public listing demands explicitly).

---

### Cluster D — Public detail page

#### `src/app/listings/[id]/page.tsx` (PUBLIC RSC — request-response)

**Analog:** `src/app/(app)/profile/page.tsx` (RSC fetch + render), with the **auth gate INVERTED**. The profile page redirects to `/login` when there's no session (lines 17-19); this page must render WITHOUT a session (LIST-06). Place it OUTSIDE `(app)`/`(host)` so it inherits no gating layout (verified: those layouts call `getSession` + redirect — `(host)/host/layout.tsx` lines 21-34).

**Fetch + derive + state-reflecting CTA** (RESEARCH § Code Examples lines 480-491):
```typescript
const [row] = await db.select().from(listing)
  .innerJoin(user, eq(listing.hostId, user.id))
  .where(eq(listing.id, params.id));
if (!row || row.listing.status !== "published") notFound(); // unlisted/draft 404 (D-13)
const bookable = deriveBookable(row.listing, {
  emailVerified: row.user.emailVerified,
  payoutsEnabled: row.host_payout?.payoutsEnabled ?? false,
});
// CTA: bookable ? coral "Book this space" : disabled neutral "Not bookable yet" (UI-SPEC)
```

**Public-projection discipline:** reuse `publicProfile()` from `src/lib/profile.ts` (lines 54-62) for any host info shown, and apply the SAME allow-list thinking to the listing address — exact street address is withheld when `showExactAddress=false` (D-09). The `publicProfile` allow-list (not deny-list) is the model to copy for projecting the listing to anonymous viewers.

---

### Cluster E — Stripe / webhook gate

#### `src/lib/stripe.ts` (configured client singleton)

**Analog (partial):** `src/lib/db/index.ts` (lines 1-5) is the nearest "configured client exported as a module singleton" precedent:
```typescript
export const db = drizzle(postgres(process.env.DATABASE_URL!), { schema });
```
Target (RESEARCH lines 349-350): `export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "<pinned>" });`. Also copy the **fail-closed-on-missing-prod-secret** pattern from `src/lib/auth.ts` lines 42-48 (the `BETTER_AUTH_SECRET` boot guard) for `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` — RESEARCH § Security line 627 calls for this precedent explicitly. Pin `apiVersion` per RESEARCH Tertiary note (line 691): confirm against the installed SDK at build time.

#### `src/app/actions/stripe-connect.ts` (server-action — request-response)

**Analog:** `src/app/actions/capability.ts` — the privileged-flip-then-redirect shape and the `requireUserId()` helper (lines 32-36) are the direct model. `activateHosting` (lines 43-52) even names this seam: "PHASE 2: this is where Stripe Connect onboarding will be initiated — it is intentionally NOT triggered here."

**Structured result + redirect target** (copy — `capability.ts` lines 28-30, 51):
```typescript
export type CapabilityResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };
...
return { ok: true, redirectTo: "/host" };
```
Target (RESEARCH § Pattern 7, lines 352-371): lazily create the Express account on first click, persist `stripeAccountId` server-side (NEVER client-settable — mirror the `input:false` discipline), mint a single-use Account Link, return its URL to redirect to. The `account.create` / `accountLinks.create` calls are NEW (see § No Analog Found).

#### `src/app/api/stripe/webhook/route.ts` (route handler / webhook — event-driven)

See § No Analog Found — this is the first webhook in the repo and the architectural keystone. Structural reference: RESEARCH § Pattern 8 (lines 378-408). Critical: `export const runtime = "nodejs"`, `await req.text()` BEFORE `constructEvent`, signature verify → 400 on bad sig, idempotency by `event.id`, always 200 on handled events. The host-flag write reuses the **privileged-server-set** discipline from `capability.ts` (the flag is webhook-set only, never from a client body).

---

## Shared Patterns

### Session gate (every host action + the sign route)
**Source:** `src/app/actions/profile.ts` lines 32-37; helper form in `src/app/actions/capability.ts` lines 32-36.
**Apply to:** `listing.ts`, `listing-photo.ts`, `stripe-connect.ts`, `api/cloudinary/sign/route.ts`.
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) return { ok: false, error: "You must be signed in…" };
```

### Server re-validation with the shared Zod schema (never trust the client)
**Source:** `src/app/actions/profile.ts` lines 39-47.
**Apply to:** every listing create/edit/publish action.
```typescript
const parsed = profileSchema.safeParse(input);
if (!parsed.success) {
  return { ok: false, error: "Please check the form and try again.",
    fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
}
```
For listings: parse `draftSchema` on save-step and `publishSchema` on publish (RESEARCH lines 330-341). Use `safeParse` + `fieldErrors` so the wizard can surface the D-02 live checklist.

### Structured action result type
**Source:** `src/app/actions/profile.ts` lines 21-23; `capability.ts` lines 28-30; `avatar.ts` lines 41-43.
**Apply to:** all new server actions.
```typescript
export type XResult = { ok: true; /* payload */ } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

### Privileged / server-only field discipline (the escalation guard)
**Source:** `src/lib/auth.ts` lines 109-112 (`input:false` on `canBook`/`canHost`/`role`); `src/app/actions/capability.ts` lines 8-20 (the WHY); `profile.ts` lines 61-62 (privileged fields absent from the editable schema).
**Apply to:** `status` (publish is a gated server action, never a client `status` field), `*RateCents`, `maxOccupancy`, `payoutsEnabled`/`chargesEnabled`/`stripeAccountId` (webhook/server-set ONLY). RESEARCH § Anti-Patterns line 412 and § Security lines 633-637 make this the non-negotiable money-state guard.

### Cloudinary secret-stays-server
**Source:** `src/lib/cloudinary.ts` line 16; `avatar.ts` header lines 5-9.
**Apply to:** `api/cloudinary/sign/route.ts` (sign server-side, never ship `api_secret`).

### Fail-closed on missing production secret
**Source:** `src/lib/auth.ts` lines 42-48 (`BETTER_AUTH_SECRET` boot throw).
**Apply to:** `src/lib/stripe.ts` for `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (RESEARCH § Security line 627).

### Defense-in-depth `canHost` re-check at page level
**Source:** `src/app/(host)/host/page.tsx` lines 14-25 (re-reads session + `canHost` even though the layout gates).
**Apply to:** all new `(host)/host/listings/**` and `(host)/host/payouts/**` pages.

### Migration / test-harness invariants (must hold for Wave 0 to pass)
**Source:** `tests/helpers/db.ts` lines 80-92 (raw-SQL replay, `--> statement-breakpoint` split, `"public".` → schema rewrite).
**Apply to:** the new listing migration. The PostGIS `CREATE EXTENSION IF NOT EXISTS postgis;` must be **idempotent** and ordered first (RESEARCH lines 270, 471-475) so parallel test workers replaying migrations into isolated schemas don't fail (Pitfall 7). `drizzle.config.ts` already points `schema → ./src/lib/db/schema.ts`, `out → ./drizzle`; generate with drizzle-kit, then a `generate --custom` migration for the extension.

---

## Wave 0 Test Patterns

### Unit tests (pure / schema)
**Analog:** `tests/validation/auth-schema.test.ts` (whole file) — the `describe`/`it`/`safeParse().success` pattern.
- `tests/listing/bookability.test.ts` — drive `deriveBookable` over the published×verified×payouts truth table; pure, no DB. Same shape as the auth-schema asserts (lines 13-72).
- `tests/validation/listing-schema.test.ts` — `draftSchema` vs `publishSchema`, integer-cents, both-rates-required. Direct copy of `auth-schema.test.ts` structure.
- `tests/listing/cloudinary-sign.test.ts` — session gate + signed-param set. Mock `next/headers` + `@/lib/auth` as in `tests/profile/profile.test.ts` lines 33-44.
- `tests/stripe/webhook-signature.test.ts` — invalid-sig 400 + idempotency. The `input:false`-invariant assertion style in `tests/auth/capability-activate.test.ts` lines 88-102 is the model for "assert a server-only guard is intact."

### Integration tests (isolated schema + real action)
**Analog:** `tests/profile/profile.test.ts` (whole file) — the gold-standard pattern: `setupTestDb()` in `beforeAll`, `makeTestAuth(testDb)`, mock `next/headers` with a mutable `sessionHeaders` holder, `vi.doMock("@/lib/auth", ...)` + `vi.resetModules()`, then import and drive the REAL exported server action. Copy lines 25-49 (setup/teardown) and 51-68 (`signInUser` helper) verbatim.
- `tests/listing/crud.test.ts`, `photos.test.ts`, `status-gate.test.ts`, `geo-roundtrip.test.ts` — all follow this. `geo-roundtrip` asserts the `{x:lng, y:lat}` axis order round-trips (RESEARCH Pitfall 1, lines 435-439).
- `tests/stripe/webhook-account-updated.test.ts` — flag flip + auto-revert; uses the isolated-schema harness plus the new Stripe mock.

### Test helper extension
**`tests/helpers/mocks.ts` (EXTEND):** add a `mockStripe` alongside `mockCloudinary`/`mockResend`. Copy the `mockCloudinary` module-shaped factory (lines 65-109) and the `resetMocks()` registration (lines 142-145). The Stripe mock needs `accounts.create`/`retrieve` + `webhooks.constructEvent`/`generateTestHeaderString` (RESEARCH lines 565, 611). Note: `mockCloudinary` already stubs `utils.api_sign_request` (lines 96-98) — reuse it for the sign-route test.

---

## No Analog Found

Files/constructs with no close in-repo match. Planner should use the cited RESEARCH section as the primary reference.

| File / construct | Role | Data Flow | Reason / Nearest structural ref + RESEARCH section |
|------------------|------|-----------|----------------------------------------------------|
| `src/app/api/stripe/webhook/route.ts` | webhook handler | event-driven | First webhook in the repo. No event-driven/raw-body route exists (the only route is the Better Auth catch-all). Ref: RESEARCH § Pattern 8 (lines 378-408); privileged-write discipline from `capability.ts`. |
| `src/app/actions/stripe-connect.ts` Stripe SDK calls | server-action | request-response | `accounts.create({type:'express'})` + `accountLinks.create` have no precedent. Nearest STRUCTURAL ref = `capability.ts` (privileged flip + `{ok, redirectTo}`). Ref: RESEARCH § Pattern 7 (lines 343-373). |
| PostGIS `geometry(point,4326)` column + GiST index + `CREATE EXTENSION` migration | schema | — | No geometry/spatial column or pgEnum exists in `schema.ts`. Ref: RESEARCH § Pattern 1 (lines 229, 244, 270) + Pitfall 1/7 (lines 435-439, 471-475). Mind the x=lng/y=lat swap. |
| `@dnd-kit` photo reorder (client) | component | batch | No drag-reorder UI exists. Avatar control (`profile-form.tsx` lines 65-132) is a single-file picker only. Ref: RESEARCH § Don't Hand-Roll (line 423) + reorder action lines 494-505. |
| `next-cloudinary` `<CldUploadWidget>` direct upload (client) | component | file-I/O | Phase-1 routes bytes through the server; this is the deliberate graduation. Ref: RESEARCH § Pattern 2 (line 293) + `cloudinary.ts` header lines 1-9. |
| Address autocomplete + `react-leaflet`/provider map (client) | component | request-response | No maps/geocoding dependency exists in the repo. Provider locked to Photon/LocationIQ + react-leaflet (CONTEXT D-18). Ref: RESEARCH § Pattern 4 (lines 306-311) + Open Question 1 (lines 537-540). |
| `src/lib/listing-vocab.ts` (D-08 enums/labels) | config | transform | No vocabulary/constants module exists. Nearest shape: the `PRIVATE_PROFILE_FIELDS` `as const` array in `src/lib/profile.ts` lines 40-46. Ref: CONTEXT D-08; RESEARCH § Pattern 1 enum values (lines 214-217). |
| `e2e/public-listing.spec.ts` | e2e test | — | Playwright is configured but ZERO specs exist (`tests/` has only Vitest files). Ref: RESEARCH Test Map (line 591). First Playwright spec in the repo — no in-repo template. |

---

## Metadata

**Analog search scope:** `src/app/**`, `src/lib/**`, `src/components/ui/**`, `tests/**`, `drizzle/`, `drizzle.config.ts`, `src/middleware.ts`.
**Files scanned:** 22 source/test/config files read in full (all small; one targeted read on RESEARCH.md's second page).
**Key patterns identified:**
- Every host write goes through a `"use server"` action that re-validates with a shared Zod schema and gates on `auth.api.getSession` — the gallery, listing CRUD, publish, and Stripe onboarding all map to `profile.ts`/`capability.ts`.
- Money/payout/status state is server-only by the same `input:false` discipline that protects `canBook/canHost/role`; the webhook is the only writer of `payouts_enabled`.
- Integration tests use one canonical harness (`setupTestDb` + `makeTestAuth` + mocked `next/headers`, driving the real action) — `tests/profile/profile.test.ts` is the template for all 5 Wave 0 integration files.
- The three genuinely-new subsystems (Stripe webhook, PostGIS geometry, direct-to-Cloudinary upload + dnd reorder) have NO in-repo analog and must follow RESEARCH §§ Pattern 1/2/8 directly.

**Pattern extraction date:** 2026-06-04
