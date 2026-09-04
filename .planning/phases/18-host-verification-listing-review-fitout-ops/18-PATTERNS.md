# Phase 18: Host Verification, Listing Review & FitOut Ops - Pattern Map

**Mapped:** 2026-09-01
**Files analyzed:** 18 (7 create · 11 modify)
**Analogs found:** 18 / 18 (16 exact/role-match · 2 partial)

> **How to read this file.** Every excerpt below is real, shipped code with its file path and line
> numbers. Where the excerpt carries a comment, the comment is part of the pattern — this codebase
> documents *why* a thing is shaped the way it is at the site itself, and a new file that copies the
> shape without copying that discipline will read as foreign. Quote paths in plans; do not paraphrase
> the code.

---

## The five idioms every plan in this phase must hold

These are not abstractions — each has a named site you can point at.

| # | Idiom | Canonical site | What it means for Phase 18 |
|---|-------|----------------|----------------------------|
| 1 | **Pure, parameterised predicate → tsc does the census** | `src/lib/bookability.ts:26-33, 56-66` | Adding `reviewState` / `verificationStatus` as **required** fields is the census mechanism (D-224). Never optional, never defaulted. |
| 2 | **Deliberate duplication on the money path, each copy with its own anchor** | `src/app/actions/booking.ts:41-46` header + `:190-200` (`L_nohours`) + `:446-455` (`L_OPEN_NOHOURS`) | Two RE-STATEMENTS, two new refusal anchors. No shared helper (D-227). |
| 3 | **`pgEnum` declared before the table it backs (const TDZ)** | `src/lib/db/schema.ts:137-169`, `:401-417` | `host_verification_status` and `listing_review_state` declared above `host_verification` / `listing`. |
| 4 | **Per-page / per-action auth, never middleware** | `src/middleware.ts:1-7` ("OPTIMISTIC ONLY — NOT the security boundary") + `src/app/(host)/host/layout.tsx:10-24` + `(host)/host/requests/page.tsx:6-11` (layout gates, page **re-gates**) | `requireStaff()` in every `(ops)` page AND every ops action (D-216). |
| 5 | **Money is integer centavos, frozen at write time; a later change never rewrites a past row** | `src/lib/db/schema.ts:419-466` (`commissionRateBps` / `commissionCents` FROZEN) | Ops cancel-and-refund reads `row.quotedTotalCents` off the frozen row (`cancel-booking.ts:1137`), never recomputes. |

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|-------------------|------|-----------|----------------|-------|
| **CREATE** `src/lib/ops/staff.ts` | middleware/guard (server) | request-response | `src/app/actions/capability.ts:42-46` + `src/app/(host)/host/layout.tsx:42-55` | exact (two shapes) |
| **CREATE** `src/app/(ops)/ops/layout.tsx` | layout | request-response | `src/app/(host)/host/layout.tsx` | exact |
| **CREATE** `src/app/(ops)/ops/**/page.tsx` (queue + detail) | page (RSC) | CRUD / request-response | `src/app/(host)/host/requests/page.tsx` (oldest-first triage inbox) | exact |
| **CREATE** `src/app/actions/ops-*.ts` (approve/reject/suspend) | server action | CRUD + event-driven | `src/app/actions/cancel-booking.ts:1097-1389` (`cancelBookingAsHost`) | exact |
| **CREATE** `src/lib/verification/port.ts` + `providers/manual.ts` | service (port/adapter) | request-response | `src/lib/payments/refund-rail.ts` (single branch point, fails closed) + `src/lib/paymongo.ts:1-32` (thin wrapper, fail-closed boot) | role-match |
| **CREATE** `scripts/ops-grant.ts` | CLI | batch | `scripts/ops-alerts.ts:1-60, 285-325` + `src/lib/ops/resolve-args.ts` | exact |
| **CREATE** `drizzle/0026_*.sql` (+ possible `0027`) | migration | batch/backfill | `drizzle/0017_group_bookings.sql` (new enums + tables) · `drizzle/0014_phase7_ledger_kind.sql` (hand-authored backfill) · `drizzle/0020_open_capacity_enum.sql` (55P04 split) | exact |
| **CREATE** `tests/listing/bookability.test.ts` extensions | test | — | itself (the 16-row truth table) | exact |
| **CREATE** `tests/ops/verification-schema.test.ts` (HVER-02 column set) | test | — | `tests/ops/alerts.test.ts:563-592` (`information_schema.columns` + `pg_constraint`) | exact |
| **MODIFY** `src/lib/bookability.ts` | utility (pure predicate) | transform | itself (`:12-46` is the change log for the *last* term added) | exact |
| **MODIFY** `src/lib/search/query.ts` §Stage-1 | service (SQL) | request-response | itself (`:194-233`) | exact |
| **MODIFY** `src/app/actions/booking.ts` `placeHold` / `placeOpenHold` | server action | request-response | itself (`:155-200`, `:425-455`) | exact |
| **MODIFY** `src/lib/db/schema.ts` | model | — | `:401-466` (`payoutLedgerState` + `hostPayoutLedger`) and `:379-399` (`audit`) | exact |
| **MODIFY** `src/app/actions/listing.ts:109` `saveListingStep` | server action | CRUD | itself (`:134-192`, the effective-value guard idiom) | exact |
| **MODIFY** `src/app/actions/cancel-booking.ts:1097` | server action | CRUD + money | itself | exact |
| **MODIFY** `src/inngest/functions/payout-sweep.ts` / `payout-reconcile.ts` | job (cron) | batch | themselves (`sweep:99-135`, `reconcile:138-157`) | exact |
| **MODIFY** `listings/[id]/(detail)/page.tsx` · `(host)/host/listings/page.tsx` | page (RSC) | request-response | themselves (`:286-292`, `:155-158`) | exact |
| **MODIFY/CREATE** verification badge component | component (presentational) | — | `src/components/listing/drop-in-badge.tsx` (whole file) | exact |

---

## Pattern Assignments

### 1. `src/lib/ops/staff.ts` (guard, request-response) — **NEW**

**Analogs:** `src/app/actions/capability.ts` (action-guard shape) + `src/app/(host)/host/layout.tsx` (page-guard shape) + `src/lib/auth.ts:107-113` (the `role` slot).

The phase needs **both** shapes. They are different in this codebase and both are shipped.

**(a) The action-guard shape** — `src/app/actions/capability.ts:42-46`. Cloned verbatim three times
already (`listing.ts:62-66`, `cancel-booking.ts:195-199`, each carrying a comment naming its source):

```typescript
/** Resolve the signed-in user's id, or null if there is no session. */
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}
```

Its caller returns a **calm typed refusal**, never a throw (`capability.ts:58-62`):

```typescript
export async function activateHosting(): Promise<CapabilityResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to start hosting." };
  }
```

**(b) The page-guard shape** — `src/app/(host)/host/layout.tsx:42-55`. Note the session-user cast:
`additionalFields` are not on Better Auth's base `session.user` type, so every reader widens it
locally. `requireStaff()` will need the same cast for `role`:

```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) {
  redirect("/login");
}

const u = session.user as typeof session.user & {
  canBook?: boolean;
  canHost?: boolean;
};

// The real gate (D-04, T-04-02): no canHost => not allowed on the host surface.
if (!u.canHost) {
  redirect("/");
}
```

**(c) The privilege slot being reused** — `src/lib/auth.ts:107-113`. `input: false` is the escalation
guard and is what D-214/D-217 rest on. Note `role` is `required: false, defaultValue: "user"`:

```typescript
user: {
  additionalFields: {
    // --- Capabilities (D-01..D-03) — input:false is the privilege-escalation guard (Pitfall 2).
    canBook: { type: "boolean", required: true, defaultValue: false, input: false },
    canHost: { type: "boolean", required: true, defaultValue: false, input: false },
    role: { type: "string", required: false, defaultValue: "user", input: false }, // admin slot for later.
```

⚠ The column is **nullable** — `src/lib/db/schema.ts:45`: `role: text("role").default("user")`. A
`requireStaff()` written as `u.role !== "staff"` handles NULL correctly; one written as
`u.role === "user"` does not. Fail closed.

**(d) D-219's "same 404 a nonexistent route gets"** — the redirect above is the WRONG shape for
`(ops)`. Use `notFound()` instead, on the `assertPublicListing` precedent
(`src/lib/listing/public-listing.ts:87-105`), whose docblock states the rule the ops layout inherits:

```typescript
/**
 * 404 unless the listing is publicly viewable — and do it from somewhere the status line is still open.
 *
 * ⚠ CALL THIS FROM A LAYOUT, NOT FROM A PAGE. From a page it is correct but useless: the shell has
 * already been flushed with `200` and the only thing left to change is the body …
 *
 * `cache()` is not an optimisation here so much as the thing that makes calling it twice free — it is
 * request-scoped, so the layout's lookup and any later caller's are one query.
 */
export const assertPublicListing = cache(async (id: string): Promise<void> => {
```

**`cache()` is the pattern that makes D-216's belt-and-braces free**: the `(ops)` layout guard and
each page's own `requireStaff()` collapse to one session read per request.

---

### 2. `src/app/(ops)/**` (route group) — **NEW**

**Analog:** `src/app/(host)/host/` — layout + one list page.

**Layout blocking-gate rule** — `src/app/(host)/host/layout.tsx:10-24`. This is enforced by an AST
test (`tests/design/blocking-session-gate.test.ts`), so an ops layout that puts its guard inside a
`<Suspense>` subtree is a *measured* defect, not a style note:

```
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// BOTH GATES ARE BLOCKING AND THEY STAY BLOCKING. NOTHING BELOW THEM MAY MOVE ABOVE THEM.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The session read, the /login redirect and the canHost redirect all run to completion BEFORE this
// function returns any JSX. … moving either redirect behind the `<Suspense>` boundaries further down
// would stream the host dashboard's shell to a booker-only account and only then decide to send them
// away.
```

**Shell composition** — `(host)/host/layout.tsx:79-127`: `SiteChrome` with `brand` / `brandHref` /
`surface="muted"` / `nav` / `actions`, `<main className="flex flex-1 flex-col">{children}</main>`,
then `SiteFooter`. Nav links come from a typed inventory (`src/lib/nav.ts:22-30`) — a `const` tuple, a
derived union, and a TOTAL `Record` over it, so adding an id without its row is a compile error. An
`OPS_NAV_LINKS` should follow that shape if the console gets more than one destination.

**Page re-gate + owner-scope** — `(host)/host/requests/page.tsx:6-11` states the doctrine the ops
queue pages copy verbatim (substituting staff for canHost):

```
// SECURITY (T-06-23 / Security V4): the (host) LAYOUT gates canHost, but the route group is NOT the
// authorization gate for the DATA. This page re-checks the session + canHost (defense in depth) AND
// owner-scopes the read to `listing.host_id = session.user.id AND booking.status = 'requested'` — the EXACT
// predicate 06-07's non-optional owner-scope READ isolation test asserts …
```

**Oldest-first triage list** — the requests inbox is the shape OPS-04 wants (one queue, deadline-led,
desktop table / mobile card split). Its ordering import is `asc` from drizzle
(`requests/page.tsx:73`), its shell is the declared constant + `PageHeader`
(`:30-38`), and its zero state is `EmptyState` (`:66-69`, `listings/page.tsx:107-117`):

```tsx
<EmptyState
  icon={Building2Icon}
  titleAs="h2"
  title="No listings yet"
  body="List your space and start earning. We'll walk you through it step by step."
  actions={<Button asChild variant="brand"><Link href="/host/listings/new">Create your first listing</Link></Button>}
/>
```

**Files present in every shipped route folder:** `page.tsx`, `loading.tsx`, and `error.tsx` at the
group root (`(host)/host/error.tsx`). Match that set.

---

### 3. `src/lib/verification/*` (service — port + manual provider) — **NEW**

There is **no DI container in this codebase and none may be introduced.** The shipped boundary idiom
is: *a module that is the single place a question is answered, pure where it can be, fail-closed, with
its own header stating what it may not do.* Three real examples, in ascending weight:

**(a) The pure single-branch-point port** — `src/lib/payments/refund-rail.ts:35-54` (whole file is 54
lines). This is the closest structural analog to the verification port's *decision* half:

```typescript
// This module remains the ONLY branch point for refund dispatch. Do NOT inline this predicate anywhere.
//
// Pure/isomorphic: no "use client"/"use server" directive — the webhook route, the cancel server action and
// the refund-preview RSC all import it.

/** Payment rails PayMongo can API-refund (Pitfall 1). … */
export const REFUNDABLE_RAILS: ReadonlySet<string> = new Set(["card", "gcash", "grab_pay", "paymaya"]);

/** Can PayMongo refund this rail through the API? Fails CLOSED: an absent/unknown rail is treated as
 *  non-refundable, so an unrecognised payment method routes to the operator-alert path rather than to a
 *  call that would 4xx and leave a booker's money in limbo. */
export function isApiRefundable(rail: string | null | undefined): boolean {
  return rail != null && REFUNDABLE_RAILS.has(rail);
}
```

**(b) The provider wrapper** — `src/lib/paymongo.ts:1-17`. The shape a *future* third-party provider
adapter takes. Note: one module owns all outbound HTTP, boot fails closed in production only, and
every test mocks the module rather than the network:

```
// PayMongo REST client — a thin `fetch` wrapper (there is NO official PayMongo SDK; CLAUDE.md § D-20).
//
// This module is the ONLY place that talks to PayMongo over HTTP. It is deliberately tiny: HTTP Basic
// auth …, a JSON `fetch` helper that sends an `Idempotency-Key` on POSTs and throws on non-2xx …
//
// FAIL-CLOSED (copied from the src/lib/auth.ts WR-03 boot guard): in PRODUCTION we refuse to boot
// without PAYMONGO_SECRET_KEY rather than silently make unauthenticated calls. In dev/test/build the
// placeholder in .env is tolerated …
//
// BETA NOTE: PayMongo Platforms / Linked Accounts is beta / sales-gated. The endpoint paths below wrap
// the documented contract; real hosted onboarding is exercised in MANUAL UAT …
```

**(c) The DB-reading service with an injected connection** — `src/lib/ops/alerts.ts:50-53`. Every ops
read module takes an explicit `DbConn` so an isolated-schema test can drive it. Copy this import set
exactly:

```typescript
import { sql } from "drizzle-orm";
import type { DbConn } from "@/lib/availability/read-model";
import { audit } from "@/lib/db/schema";
```

…and the signature idiom (`payout-reconcile.ts:138`): `export async function alertStuckHeld(dbConn: DbConn = db): Promise<number>`.

**(d) The pure, DB-free policy module** — `src/lib/ops/resolve-args.ts:1-9`. This is the argument for
why the *manual provider's* policy (what a decision is, what it records) belongs in its own pure
module rather than inside `scripts/ops-grant.ts`:

```
// WHY THIS IS A MODULE AND NOT TWENTY LINES INSIDE `scripts/ops-alerts.ts`. That script cannot be imported
// by a test: it opens a postgres.js client and calls `main()` at module load, so importing it would connect
// to a database and run a command as a side effect of test collection. A policy that nothing can execute in
// isolation is a policy nothing can MUTATE in isolation either …
```

**The storage contract (HVER-02) has a structural-enforcement precedent** —
`src/lib/ops/alerts.ts:25-34`. Copy this reasoning into the verification module header; the phase's
"no column can hold a document" rule is the same move one level down (a *column* set rather than a
*select* list):

```
// THE PII CONTRACT IS ENFORCED STRUCTURALLY, NOT BY A COMMENT (D-J3Z-02). `listUnresolvedAlerts` selects
// FOUR EXPLICIT COLUMNS … and `UnresolvedAlert` has no field for the jsonb column that is deliberately
// absent. … Because the row type has no such field, re-exporting it is a TYPE ERROR at every consumer
// rather than something a reviewer has to catch.
```

---

### 4. `scripts/ops-grant.ts` (CLI, batch) — **NEW**

**Analog:** `scripts/ops-alerts.ts` — read its header before writing a line.

**Connection block** — `scripts/ops-alerts.ts:8-16, 45-60`. The `max: 1` + explicit `end()` + "must
NOT import `@/lib/db`" rule is load-bearing (the process hangs otherwise), and the `@/`-alias
clearance was probed first-hand:

```typescript
// STANDALONE CONNECTION, on the scripts/seed.ts pattern (seed.ts:14-20): its OWN postgres.js client with
// `max: 1` and an explicit `end()`. It must NOT import `@/lib/db` — the app singleton opens a connection
// nothing in a short-lived script closes, and the process hangs after printing.
//
// IT MAY, HOWEVER, IMPORT `@/lib/ops/alerts`, AND THAT WAS PROBED FIRST-HAND (2026-08-10): `npx tsx` on a
// file importing `@/lib/db/schema` resolved the alias cleanly … Do not "fix" these imports back to relative paths.

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import type { DbConn } from "@/lib/availability/read-model";

// The tsx process doesn't load .env; fall back to the deterministic dev URL (as scripts/seed.ts).
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
const db = drizzle(sql) as unknown as DbConn;
```

**Command dispatch + exit block** — `scripts/ops-alerts.ts:285-325`. Copy the `main()` /
`.catch()` / `.finally(end)` triple exactly; `process.exitCode` is set, never `process.exit()`:

```typescript
main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Always close, so the process exits with whatever exitCode was set above.
    await sql.end({ timeout: 5 });
  });
```

**`USAGE` string + argv parsing delegated to a pure module** — `ops-alerts.ts:62-79` and
`:294-306`. The `--by`-is-required precedent (`resolve-args.ts:14-19`) is directly relevant to
`ops-grant`: **do not default the granting operator's identity from `process.env`.**

**npm script registration** — `package.json` § scripts, beside the three existing `ops:*` entries:

```json
"ops:alerts": "tsx scripts/ops-alerts.ts list",
"ops:alerts:resolve": "tsx scripts/ops-alerts.ts resolve",
"ops:alerts:history": "tsx scripts/ops-alerts.ts history",
```

---

### 5. `drizzle/00NN_*.sql` (migration + grandfather backfill) — **NEW**

Four distinct precedents apply; the plan must pick per statement, and **the enum question decides
whether this is one file or two.**

**(a) Brand-new enums + new tables + new columns, one file** — `drizzle/0017_group_bookings.sql:1-20`.
This is the primary analog: two brand-new `CREATE TYPE`s used in the SAME migration, legally:

```sql
-- (a) NO 55P04 SPLIT NEEDED. Both types here are BRAND-NEW `CREATE TYPE ... AS ENUM`, and a brand-new type
-- may be created and USED in the same transaction. The two-migration split in 0010/0012 exists ONLY because
-- `ALTER TYPE ... ADD VALUE` on an EXISTING type cannot be used in the transaction that adds it (Postgres
-- 55P04, and drizzle-orm's migrator wraps ALL pending migrations in ONE transaction) …
--
-- (b) BACKFILL-FREE. Every column added is nullable or carries a DEFAULT …
--
-- Unqualified table/type names throughout (the schema-qualified `"public".` prefixes drizzle-kit emits were
-- stripped, mirroring drizzle/0013) so the integration harness (tests/helpers/db.ts) replays this
-- idempotently into every isolated schema — unqualified objects resolve via the schema-first search_path.
CREATE TYPE "occupancy_mode" AS ENUM('exclusive');--> statement-breakpoint
CREATE TYPE "rsvp_status" AS ENUM('yes', 'no');--> statement-breakpoint
CREATE TABLE "booking_group" ( … );
--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "occupancy_mode" "occupancy_mode" DEFAULT 'exclusive' NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_group" ADD CONSTRAINT "booking_group_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rsvp_group_user_uq" ON "rsvp" USING btree ("group_id","user_id") WHERE user_id IS NOT NULL;
```

⚠ **`host_verification_status` and `listing_review_state` are BRAND NEW**, so 0017's exemption applies
and one file suffices — **unless** the plan also touches an existing enum (e.g. adding a
`listing_review_*` value to `notification_type` for OPS-05's rejection notice). That one *does* take
the split; see (c).

**`listing.review_state` grandfathering is achievable without a data backfill**, exactly as 0017 did
it — `DEFAULT 'grandfathered' NOT NULL` on the ADD COLUMN backfills every existing row by
construction, then a second statement flips the default to `'pending'` for new rows. That is
structurally stronger than an `UPDATE`, and it is the property 0017 and `schema.ts:206-210` both call
out by name ("backfill-free … so every existing listing reads 'exclusive'").

**(b) When a real data UPDATE is unavoidable** — `drizzle/0014_phase7_ledger_kind.sql:1-27`. Note the
idempotence scoping and the "hand-authored because drizzle-kit emits neither" opening:

```sql
-- Custom SQL migration (Phase 7) — (a) the Finding-2 price-split BACKFILL and (b) the D-71 at-most-once
-- gate widening. Both are hand-authored because drizzle-kit emits neither a data backfill nor a reviewed
-- constraint swap.
--
-- (a) BACKFILL: … Both UPDATEs are scoped `WHERE ... IS NULL`, so they are idempotent and can never overwrite
-- a value that a Phase-7 write path has already frozen (T-07-03).
--
-- Unqualified table names so the integration harness (tests/helpers/db.ts) replays this into every isolated
-- schema via the schema-first search_path.
UPDATE "booking" SET "space_price_cents" = "quoted_total_cents" WHERE "space_price_cents" IS NULL;--> statement-breakpoint
```

⚠ **Only listings that are `published` at migration time are grandfathered (D-207).** A blanket column
default grandfathers drafts too. If that is unacceptable, the migration takes the 0014 shape:
`ADD COLUMN … DEFAULT 'pending' NOT NULL`, then
`UPDATE listing SET review_state = 'grandfathered' WHERE status = 'published' AND deleted_at IS NULL;`
— scoped, idempotent, and re-runnable. **This is the fork the plan must decide explicitly.** The same
applies to the host side (`host_verification` rows for hosts owning such listings).

**(c) If an EXISTING enum gains a value (55P04)** — `drizzle/0020_open_capacity_enum.sql`. The whole
file:

```sql
-- Custom SQL migration (Phase 9, OC-01, RESEARCH Pitfall 2 / 55P04) — add 'open_capacity' to the EXISTING
-- occupancy_mode enum. This file does NOTHING ELSE: an `ALTER TYPE ... ADD VALUE` and the FIRST USE of the
-- new value CANNOT share a transaction (Postgres 55P04 …), and drizzle-orm's migrator wraps ALL pending
-- migrations in ONE transaction. … IF NOT EXISTS + the unqualified type name keep the
-- integration harness (tests/helpers/db.ts) replaying this idempotently into every isolated schema …
ALTER TYPE "occupancy_mode" ADD VALUE IF NOT EXISTS 'open_capacity';
```

**(d) Purely additive generated migration** — `drizzle/0024_audit_table.sql:1-9` states the rule for
*which* migrations go through the generator:

```
-- GENERATED by `drizzle-kit generate`, not hand-authored: a plain table with a partial btree index is
-- fully Drizzle-expressible, so it goes through the generator (the schema.ts rule — only the GiST EXCLUDE
-- stays hand-written), which also keeps drizzle/meta/_journal.json and 0024_snapshot.json consistent for
-- `npm run db:migrate`.
```

**And the tripwire that catches the classic failure** — `drizzle/0025_audit_resolved_by.sql:30-34`:

```
-- The proof is the replay, not this reading: tests/ops/alerts.test.ts case 14 asserts the column against
-- `information_schema.columns` scoped to the replayed schema. A migration is NEVER verified with `tsc` —
-- the row type comes from schema.ts, so a declared-but-unmigrated column type-checks perfectly while every
-- integration test runs against a table without it (T-08-40; mutation M4 measures exactly that).
```

---

### 6. `src/lib/db/schema.ts` — new enums + `host_verification` + `listing_review` + `listing.review_state`

**Analog:** `:401-466` (`payoutLedgerState` / `ledgerKind` / `hostPayoutLedger`) — the closest
structural match: enums declared immediately above their table, with the const-TDZ reason stated.

**Enum idiom** — `:401-417`:

```typescript
// Host payout state machine (D-59). SEPARATE from booking_status (line ~277): payout-eligibility is
// DERIVED from confirmed + endsAt, NOT from a `completed` booking transition (D-56/Claude's discretion).
// Peerspace vocabulary: held → processing → paid, plus refunded/failed. Declared before the table it
// backs (const TDZ), mirroring the bookingStatus pgEnum idiom.
export const payoutLedgerState = pgEnum("payout_ledger_state", [
  "held",
  "processing",
  "paid",
  "refunded",
  "failed",
]);

// D-71 ledger row kind. … Declared before the table it backs (const TDZ), mirroring the payoutLedgerState idiom above.
export const ledgerKind = pgEnum("ledger_kind", ["payout", "host_cancel_fee"]);
```

**Table idiom (1:1-to-user, PK-is-the-FK)** — `host_payout` at `:280-297` is the exact shape
`host_verification` should take (D-220 says 1:1 to `user`). Note the header states *who may write the
columns*:

```typescript
// Host payout state — a SEPARATE table keyed 1:1 to user (NOT Better Auth additionalFields, to keep
// the auth schema CLI-clean). PayMongo shape (D-20): activation is set ONLY by the Plan-06
// merchant.activated webhook; payoutsEnabled is the provider-agnostic cached gate flag deriveBookable
// reads (KEEP THIS NAME). These flags are webhook/server-set ONLY — never from a client body.
export const hostPayout = pgTable("host_payout", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  paymongoAccountId: text("paymongo_account_id").unique(),
  activationStatus: text("activation_status").default("pending").notNull(),
  payoutsEnabled: boolean("payouts_enabled").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
```

**History-table idiom (indexes + uniques in the second argument)** — `hostPayoutLedger:428-466` and
`audit:379-399`. `listing_review` (D-221 history rows) takes this shape. Two things to copy: the
`(t) => [ … ]` array form, and the **partial index that IS the operator query**:

```typescript
export const audit = pgTable(
  "audit",
  {
    id: text("id").primaryKey(), // randomUUID() — the shipped app-generated-id idiom
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    actorId: text("actor_id").notNull(), // NO .references() — see D4 above
    action: text("action").notNull(),
    outcome: text("outcome").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by"),
  },
  (t) => [
    // The operator queue, in one index: every unresolved money seam, newest first.
    index("audit_needs_attention_idx")
      .on(t.createdAt.desc())
      .where(sql`outcome = 'needs_attention' AND resolved_at IS NULL`),
  ],
);
```

**OPS-04's "one queue, oldest first" wants exactly that device**: a partial index on
`listing.review_state = 'pending'` / `host_verification.status = 'pending'`, `created_at ASC`. See
`src/lib/ops/alerts.ts:12-24` for the rule that a query's ORDER BY must **byte-match** the index's
declared ordering or Postgres adds a Sort node on top of the scan.

**FK policy on financial/audit rows** — `hostPayoutLedger:436, 439`: `onDelete: "restrict"` with the
comment *"a financial record must never cascade-delete"*. `listing_review` history rows are audit
records; use `restrict`, not `cascade`. `audit.actorId` carries **no** FK at all (`:384`) and the
reason is at `drizzle/0024:16-18` — 8 of 57 call sites pass a literal `"system"`.

**New column on `listing`** — `:222` shows the enum-column form and `:231-235` the index list:

```typescript
  status: listingStatus("status").default("draft").notNull(), // D-02/LIST-05
  …
  (t) => [
    index("listing_host_idx").on(t.hostId),
    index("listing_status_idx").on(t.status),
    index("listing_location_gist").using("gist", t.location),
  ],
```

---

### 7. `src/lib/bookability.ts` — the fifth and sixth terms

**Analog:** itself. `:12-46` is a written record of *how the fourth term was added*, and the phase's
change is the same operation performed twice. Reproduce that structure: a `── THE Nth TERM ──` banner,
the why-a-parameter-not-a-lookup argument, and the list of downstream twins.

Current signature — `:56-66` (the whole function):

```typescript
export function deriveBookable(
  listing: { status: "draft" | "published" | "unlisted"; hasOperatingHours: boolean },
  host: { emailVerified: boolean; payoutsEnabled: boolean },
): boolean {
  return (
    listing.status === "published" &&
    listing.hasOperatingHours &&
    host.emailVerified &&
    host.payoutsEnabled
  );
}
```

The design constraint that makes D-224 work, stated at `:26-33`:

```
// WHY IT IS A PARAMETER AND NOT A LOOKUP. Two properties had to survive, and both are load-bearing:
//   - PURITY. No `await`, no `db` import, no I/O — which is what lets the 16-row truth table drive this
//     function directly rather than through a fixture database.
//   - COMPILER-FORCED CALL-SITE ENUMERATION. Every call site builds a FRESH OBJECT LITERAL, so adding a
//     required field to the listing parameter makes each one a compile error. The census of who must
//     answer this question is done by tsc, not by grep. There are four …
```

And the inventory of twins to move in lockstep, `:35-46`:

```
// THIS PREDICATE HAS AN INLINED SQL TWIN — src/lib/search/query.ts Stage-1 (Pitfall 5). …
// tests/search/bookable-gate.test.ts imports this function and asserts the SQL result set EQUALS the
// set this predicate accepts over shared fixtures. Drift in either direction fails there.
//
// AND IT HAS TWO SERVER-SIDE RE-DERIVATION SITES, written by RE-STATEMENT rather than extraction:
// `placeHold` and `placeOpenHold` in src/app/actions/booking.ts … each has its OWN refusal anchor —
// `L_nohours` in tests/booking/state-machine.test.ts and `L_OPEN_NOHOURS` in
// tests/booking/open-capacity-hold.test.ts. Do not fold them into a shared helper.
```

---

### 8. `src/lib/search/query.ts` Stage-1 — the inlined SQL twin

**Analog:** itself, `:194-233`. The exact block to edit, with its two hazard comments (no backticks
inside the template literal; the `oh_any` sell-gate vs the `oh` per-day filter must stay distinct):

```typescript
  const rows = (await db.execute(sql`
    SELECT
      l.id, l.title, l.primary_space_type, …
    FROM listing l
    JOIN "user" u ON u.id = l.host_id
    LEFT JOIN host_payout hp ON hp.user_id = u.id
    -- Inlined deriveBookable (src/lib/bookability.ts) — KEEP IN SYNC (Pitfall 5). All FOUR terms:
    --   status==='published' && listing.hasOperatingHours && host.emailVerified && host.payoutsEnabled
    --   (+ non-deleted, which is a SQL-only term deriveBookable deliberately does not model)
    -- NOTE: no backticks or dollar-braces in comments inside this template literal — they would end the
    -- template / open an interpolation. …
    WHERE l.status = 'published'
      AND l.deleted_at IS NULL
      AND u.email_verified = true
      AND COALESCE(hp.payouts_enabled, false) = true
      -- THE SELL GATE: does this listing have a calendar AT ALL (v1.0 audit finding #4). UNCONDITIONAL,
      -- and that is the entire point — see the per-day EXISTS below, with which it deliberately coexists.
      AND EXISTS (SELECT 1 FROM operating_hours oh_any WHERE oh_any.listing_id = l.id)
```

**Two mechanical notes for the new terms:**
- The listing term reads a column on `l` — a plain `AND l.review_state IN ('approved','grandfathered')`.
- The host term needs a **new LEFT JOIN** to `host_verification` (there is no such column on `"user"`),
  mirroring the `LEFT JOIN host_payout hp` line and its `COALESCE(hp.payouts_enabled, false)` — a host
  with no verification row must read as NOT verified, not as NULL. Fail closed.
- Enum literals in a **runtime** query are safe: `:171-172` records that
  *"this is a RUNTIME query, so naming an enum value here carries no 55P04 migration hazard."*

---

### 9. `src/app/actions/booking.ts` — the two deliberate RE-STATEMENTS

**Analog:** itself. Both sites verbatim so the planner can see what a re-statement is here.

**Site A — `placeHold`, `src/app/actions/booking.ts:155-200`:**

```typescript
  // (4) Re-derive bookability SERVER-SIDE (Security V4 — the reserve route group is NOT the gate). Mirrors
  // the listing page's deriveBookable call: published + THE LISTING HAS AT LEAST ONE operating_hours ROW
  // + host emailVerified + host payoutsEnabled. Keep this join in sync with bookability.ts (Pitfall 5).
  //
  // The fourth condition (v1.0 audit finding #4) is a correlated EXISTS folded into the SELECT this
  // action was already issuing — zero extra round trips … Anchored by `L_nohours` in
  // tests/booking/state-machine.test.ts, which proved that WITHOUT it this action minted a real hold on a
  // listing whose every date renders Closed.
  const [lr] = await db
    .select({
      status: listing.status,
      bookingMode: listing.bookingMode,
      occupancyMode: listing.occupancyMode,
      title: listing.title,
      timezone: listing.timezone,
      city: listing.city,
      dayRateCents: listing.dayRateCents,
      hostId: listing.hostId,
      hostEmail: user.email,
      emailVerified: user.emailVerified,
      payoutsEnabled: hostPayout.payoutsEnabled,
      hasOperatingHours: sql<boolean>`EXISTS (SELECT 1 FROM operating_hours oh WHERE oh.listing_id = ${listing.id})`,
    })
    .from(listing)
    .innerJoin(user, eq(listing.hostId, user.id))
    .leftJoin(hostPayout, eq(hostPayout.userId, user.id))
    .where(and(eq(listing.id, listingId), isNull(listing.deletedAt)));
  const bookable =
    !!lr &&
    deriveBookable(
      // The explicit `=== true` is not tidying: it keeps a driver-shape surprise (a `"t"` string, a `1`)
      // from reading as truthy and silently re-opening the hole this term closes.
      { status: lr.status, hasOperatingHours: lr.hasOperatingHours === true },
      { emailVerified: lr.emailVerified, payoutsEnabled: lr.payoutsEnabled ?? false },
    );
  if (!lr || !bookable) {
    return { ok: false, reason: "not-bookable", error: "This space isn't accepting bookings right now." };
  }
```

**Site B — `placeOpenHold`, `src/app/actions/booking.ts:425-455`.** The ⚠ block above the query is the
thing to copy, not just the code:

```typescript
  // (5) Re-derive bookability SERVER-SIDE (Security V4 — the reserve route group is NOT the gate): the same
  // published + hasOperatingHours + host emailVerified + host payoutsEnabled join placeHold uses, plus the
  // occupancy mode.
  //
  // ⚠️ A DELIBERATE RE-STATEMENT of placeHold's gate, not a call into a shared helper — see this
  // function's docblock above for why. That makes it independently duplicated security code on the money
  // path, so it carries its own RED anchor (`L_OPEN_NOHOURS`): a typo, a wrong alias, a wrong field name
  // or a missing `=== true` here would compile, pass tsc, pass the exclusive anchor and pass the whole
  // suite while leaving a real drop-in booking hole open. If you edit one gate, edit both.
  const [lr] = await db
    .select({
      status: listing.status,
      occupancyMode: listing.occupancyMode,
      emailVerified: user.emailVerified,
      payoutsEnabled: hostPayout.payoutsEnabled,
      hasOperatingHours: sql<boolean>`EXISTS (SELECT 1 FROM operating_hours oh WHERE oh.listing_id = ${listing.id})`,
    })
    .from(listing)
    .innerJoin(user, eq(listing.hostId, user.id))
    .leftJoin(hostPayout, eq(hostPayout.userId, user.id))
    .where(and(eq(listing.id, listingId), isNull(listing.deletedAt)));
  const bookable =
    !!lr &&
    deriveBookable(
      // `=== true` for the same reason as placeHold's: never let a driver shape read as truthy.
      { status: lr.status, hasOperatingHours: lr.hasOperatingHours === true },
      { emailVerified: lr.emailVerified, payoutsEnabled: lr.payoutsEnabled ?? false },
    );
  if (!lr || !bookable) {
    return { ok: false, reason: "not-bookable", error: "This space isn't accepting bookings right now." };
  }
```

**The doctrine that forbids extraction** — `booking.ts:359-362` (placeOpenHold's docblock):

```
 * A POST server action, never a GET side-effect (Pitfall 2). It repeats `placeHold`'s gates IN THE SAME
 * ORDER, and deliberately by RE-STATEMENT rather than extraction: the two payload shapes differ, and the
 * gates ARE the security surface — they belong where they are enforced, not behind a shared helper whose
 * next edit would silently move both mutations at once.
```

**What the new terms need at both sites:** a `.leftJoin(hostVerification, eq(hostVerification.userId, user.id))`
plus `reviewState: listing.reviewState`, and the same `?? <fail-closed default>` treatment
`payoutsEnabled ?? false` gets. Each site gets a NEW named refusal-anchor listing id in its test file
(e.g. `L_pending_review` / `L_OPEN_PENDING_REVIEW`) — D-227.

---

### 10. `src/app/actions/listing.ts:109` `saveListingStep` — material-edit detection

**Analog:** itself, `:134-192` — the **effective-value idiom** (`incoming ?? persisted ?? default`) is
exactly the comparison material-edit detection needs, and its header explains why a sparse autosave is
the hard case:

```typescript
  if (owned.status === "published") {
    const effFee = d.extraHeadFee ?? owned.extraHeadFee ?? 0;
    const effIncluded = d.included ?? owned.included ?? 1;
    const effMax = d.maxOccupancy ?? owned.maxOccupancy ?? 0;
```

```
// Evaluate the EFFECTIVE post-save values (incoming ?? persisted ?? default), mirroring
// paxSurcharge's `included ?? 1` / `extraHeadFee ?? 0`, so a SPARSE save carrying only one field is still
// caught. PUBLISHED rows only — a draft stays permissive because publishSchema catches it at publish.
```

**The "only a genuine CHANGE counts" guard** — `:202-213`, which is precisely the material-edit
semantics (an autosave re-sends unchanged fields on every step):

```typescript
  // Only a genuine CHANGE is refused. Every autosave of an unrelated step re-sends the same stored mode,
  // and freezing those would freeze the whole wizard for any host with a booking on the calendar.
  if (d.occupancyMode !== undefined && d.occupancyMode !== owned.occupancyMode) {
```

`owned` comes from `assertOwnership` (`:72-80`), which returns the **full persisted row** — so the
incoming-vs-persisted comparison D-231 needs is already in hand with no extra query:

```typescript
async function assertOwnership(listingId: string, userId: string) {
  const rows = await db
    .select()
    .from(listing)
    .where(and(eq(listing.id, listingId), isNull(listing.deletedAt)));
  const row = rows[0];
  if (!row || row.hostId !== userId) return null;
  return row;
}
```

**Where the flip is written** — the `patch` object at `:218-253` and the transaction at `:259-264`.
`review_state` is *not* a `draftSchema` field, so it can never be smuggled from the client (the
`:215-217` note); the plan writes it into `patch` server-side when a material field actually changed:

```typescript
  await db.transaction(async (tx) => {
    // Re-scope the write to (id AND hostId) — defense in depth on top of assertOwnership.
    await tx
      .update(listing)
      .set(patch)
      .where(and(eq(listing.id, listingId), eq(listing.hostId, userId)));
```

⚠ **Photos are the odd one out of D-231's five.** `addressLine1/city/…`, `primarySpaceType`,
`maxOccupancy`, `hourlyRateCents/dayRateCents/perHeadPriceCents` are all columns on `owned`. Photos
live in `listing_photo` and are written by a different action; material-edit detection for photos
belongs at that write site, not here.

---

### 11. `src/app/actions/cancel-booking.ts:1097` `cancelBookingAsHost` — ops cancel rides this

**Analog:** itself. This is the single richest analog in the phase — read `:999-1027` (the four
consequences), then the ordering rule at `:1093-1095`:

```
 * The ORDER is load-bearing and mirrors the booker path: gate before rate-limit (so a stranger's id is
 * denied without consuming the owner's budget), rate-limit before any write, flip before any consequence,
 * consequences before money, money before notification. Nothing after the flip may undo it.
```

**Gate → rate-limit → audit-the-denial**, `:1104-1125`:

```typescript
  const parsed = hostCancellationSchema.safeParse({ bookingId, reason });
  if (!parsed.success) return DENIED;

  const userId = await requireUserId();
  if (!userId) return NEEDS_SESSION;

  // T-07-61 — HOST owner-gate BEFORE any write. Missing, cross-host, and de-capability'd → the SAME calm
  // denial the booker path returns, byte for byte.
  const row = await loadHostOwnedBooking(parsed.data.bookingId, userId);
  if (!row) return DENIED;

  // T-07-68: bound host-cancel spam per identity; audit the denial (non-repudiable).
  const limit = rateLimit(`host-cancel:${userId}`, HOST_CANCEL_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: userId,
      action: "host_cancel_booking",
      outcome: "denied",
      meta: { reason: "rate_limit", bookingId, retryAfter: limit.retryAfter },
    });
    return TOO_FAST;
  }
```

**The atomic, guards-in-the-WHERE flip**, `:1140-1180`. Every guard lives in the WHERE so a 0-row
result is the single calm failure path. An ops cancel replaces the `EXISTS (… l.host_id = ${userId})`
predicate with its own scope — but must keep the shape:

```typescript
  const flipped = (await db.execute(sql`
    UPDATE booking
       SET status = 'cancelled',
           refund_cents = ${refundCents},
           retained_space_cents = 0,
           cancelled_by = 'host',
           cancelled_at = now(),
           decline_reason = ${parsed.data.reason},
           expires_at = NULL
     WHERE id = ${parsed.data.bookingId}
       -- DEFENCE IN DEPTH (T-07-61) … Without it the pre-read gate would be the ONLY layer on this path,
       -- and a future refactor that broke it could cancel, refund and fee-charge a STRANGER's booking.
       AND EXISTS (
         SELECT 1 FROM listing l WHERE l.id = booking.listing_id AND l.host_id = ${userId}
       )
       AND status = 'confirmed'
       AND starts_at > now()
    RETURNING id
  `)) as unknown as { id: string }[];

  if (flipped.length === 0) {
    const calm = await explainNoRows(parsed.data.bookingId, "host");
    await recordAudit({ actorId: userId, action: "host_cancel_booking", outcome: "denied",
      meta: { reason: isPastWindow(calm) ? "past_start" : "not_active", bookingId } });
    return calm; // calm, never a throw
  }
```

**The post-flip discipline** (this governs every ops consequence), `:1214-1220`:

```
  // ── Everything below is a side-effect of a flip that has ALREADY committed. ───────────────────────────
  //
  // None of it may unwind the flip, and none of it may THROW past this point either … Each consequence is
  // therefore individually guarded and any failure becomes a `needs_attention` audit row — the established
  // operator-alert channel (D-58/D-90) — so a consequence can fail LOUDLY but never silently …
```

**Consequence 4 — the D-71 fee debit at `:1272-1288` is the block D-235 SUPPRESSES.** Do not delete
it; branch around it, and say why at the branch. The `ON CONFLICT (booking_id, kind) DO NOTHING` shape
and the "no app-level already-charged pre-query" rule are stated at `:1268-1271`.

**Consequence 1 — the money, `:1299-1333`.** This is where `OPS_CANCEL_REFUNDS_SERVICE_FEE` lands.
The D-236 precedent, verbatim at `:1134-1137`:

```typescript
  // The refund is the FULL charge — space price AND the D-74 service fee. This is the ONE case where the
  // non-refundable fee IS returned: the booker did nothing wrong, so the platform, not the booker, absorbs
  // the gateway cost of the reversal. Read off the frozen row, never recomputed.
  const refundCents = row.quotedTotalCents ?? 0;
```

…and the dispatch, which records **intent only** and always alerts rather than silently keeping money:

```typescript
  const refundable =
    refundCents >= MIN_API_REFUND_CENTS && row.paymentId != null && isApiRefundable(row.paymentMethod);

  if (refundable) {
    try { await createRefund({ amountCents: refundCents, paymentId: row.paymentId!, notes: `Host cancellation (${bookingId})` }); }
    catch (err) { … await recordAudit({ actorId: userId, action: "refund_dispatch_failed", outcome: "needs_attention", … }); }
  } else if (refundCents > 0) {
    // Money IS owed but the API cannot move it … Operator-alert; never silently keep the money.
    await recordAudit({ actorId: userId, action: "refund_manual_required", outcome: "needs_attention", … });
  }
```

**The named-constant home for `OPS_CANCEL_REFUNDS_SERVICE_FEE`** — the contract is stated at
`src/lib/payments/config.ts:1-19`; the *fee-bearing* constants live in the guarded sibling
`src/lib/payments/fees.ts` (`SERVICE_FEE_BPS`, `COMMISSION_RATE_BPS`, `HOST_CANCEL_FEE_CENTS`):

```
// … the exported NAME is imported everywhere, never a hardcoded literal.
// WHAT LEFT THIS FILE (D-34 / GATE-05): SERVICE_FEE_BPS, COMMISSION_RATE_BPS and HOST_CANCEL_FEE_CENTS
// now live in src/lib/payments/fees.ts, which IS guarded. What stays below is timing, windows and payout
// cadence — nothing here decides what anybody is charged or paid.
```

⚠ `OPS_CANCEL_REFUNDS_SERVICE_FEE` **decides what someone is refunded** → `fees.ts`, not `config.ts`.
Unlike the constants beside it, D-236 says it must be a **literal `false`, not `process.env`-derived**
— flipping it must be a one-line source change, reviewed, not an env toggle.

---

### 12. `src/inngest/functions/payout-sweep.ts` + `payout-reconcile.ts` — the suspension freeze

**Analog:** themselves. The freeze is one more `AND` on a predicate that already carries three
load-bearing ones.

**The due-payout query** — `payout-sweep.ts:99-135`. The join set already reaches `host_payout hp` by
`l.host_id`, so `host_verification` joins the same way:

```typescript
export async function queryDuePayouts(dbConn: DbConn): Promise<DuePayout[]> {
  const rows = (await dbConn.execute(sql`
    SELECT b.id AS "bookingId", b.listing_id AS "listingId",
           COALESCE(b.retained_space_cents, b.space_price_cents) AS "payoutGrossCents",
           b.currency AS "currency", b.payment_id AS "paymentId",
           l.host_id AS "hostId", hp.paymongo_account_id AS "paymongoAccountId"
      FROM booking b
      JOIN listing l ON l.id = b.listing_id
      JOIN host_payout hp ON hp.user_id = l.host_id
      LEFT JOIN host_payout_ledger p ON p.booking_id = b.id AND p.kind = 'payout'
     WHERE (
       b.status = 'confirmed'
       OR (b.status = 'cancelled' AND COALESCE(b.retained_space_cents, 0) > 0)
     )
       AND b.ends_at + make_interval(hours => ${PAYOUT_DELAY_HOURS}::int) <= now()
       AND ( p.id IS NULL OR ( p.state = 'failed' AND … ) )
     ORDER BY b.ends_at ASC
     LIMIT ${SWEEP_BATCH_SIZE}
  `)) as unknown as DuePayout[];
```

**The mirror in the reconciler** — `payout-reconcile.ts:138-149`. The `kind = 'payout'` scope comment
is the exact template for the freeze's own comment (D-234's "a frozen row must not read as a stuck
row"):

```typescript
export async function alertStuckHeld(dbConn: DbConn = db): Promise<number> {
  const rows = (await dbConn.execute(sql`
    SELECT booking_id AS "bookingId", created_at AS "createdAt"
      FROM host_payout_ledger
     -- Finding 3 / Pitfall 7 — a host_cancel_fee DEBIT row is inserted as 'held' and stays there until
     -- fully netted. Without this kind scope it would fire a FALSE [payout-alert] on every host
     -- cancellation, and operators who learn to ignore the channel will miss a real transfer failure.
     WHERE kind = 'payout' AND state = 'held'
       AND created_at <= now() - make_interval(hours => ${RECONCILE_STUCK_HOURS}::int)
     ORDER BY created_at ASC
     LIMIT 200
  `)) as unknown as { bookingId: string; createdAt: Date | string }[];
```

⚠ `alertStuckHeld` selects only from `host_payout_ledger` — it has **no join to a host**. Adding the
suspension exclusion here requires a new join (`JOIN listing`/`booking` → `host_verification`) or a
`NOT EXISTS`. That is real new SQL, not a one-word edit; budget for it.

⚠ The three-invariant header at `payout-sweep.ts:9-28` is the file's contract. A fourth invariant
(suspension freeze) belongs in that numbered list, not bolted on below it.

---

### 13. The two `deriveBookable` RSC call sites

**(a) `src/app/listings/[id]/(detail)/page.tsx:286-292`** — rides an existing `Promise.all`
(`:269-281`), so a verification read should join the query at `:249-254` (which already
`innerJoin(user)` + `leftJoin(hostPayout)`), not add a fifth await:

```typescript
  const bookable = deriveBookable(
    { status: row.listing.status, hasOperatingHours },
    {
      emailVerified: row.user.emailVerified,
      payoutsEnabled: row.host_payout?.payoutsEnabled ?? false,
    },
  );
```

**LVER-02's 404 is won in the LAYOUT, not the page** — `(detail)/layout.tsx:27-43`:

```typescript
// ── AND THE SECOND REASON THIS FILE EXISTS: IT IS WHERE THE 404 STATUS IS WON ─────────────────────
//
// `page.tsx` 404s draft/unlisted/missing listings (D-13) and always has. But `loading.tsx` wraps the
// page in a Suspense boundary, so the shell — this layout — is flushed with a `200` status line
// BEFORE the page body runs `notFound()`. …
export default async function ListingDetailLayout({ children, params }) {
  const { id } = await params;
  await assertPublicListing(id);
```

…so the new review-state term goes into **`isPubliclyViewable`** (`src/lib/listing/public-listing.ts:80-85`),
which both the layout and the page call. One rule, one expression, two call sites:

```typescript
export function isPubliclyViewable(
  status: string | null | undefined,
  deletedAt: Date | null | undefined,
): boolean {
  return !deletedAt && status === "published";
}
```

**(b) `src/app/(host)/host/listings/page.tsx:155-158`** — the grid reads a pre-collapsed `Set` built by
ONE grouped query, never per card (`:74-81`). The verification/review reads must follow that idiom:

```typescript
  const missingHours = new Set(
    (await loadPublishedListingsMissingHours(db, session.user.id)).map((l) => l.id),
  );
  …
  const bookable = deriveBookable(
    { status: r.status, hasOperatingHours: !missingHours.has(r.id) },
    { emailVerified, payoutsEnabled },
  );
```

`r` here is a full `listing` row (`select()` at `:50-54`), so `r.reviewState` is free. `payoutsEnabled`
is read once at `:67-71` for the whole grid — the host's `verificationStatus` reads the same way.
D-230's "host sees its own review status + rejection reason" renders here and on the card.

---

### 14. The verification badge (HVER-05)

**Analog:** `src/components/listing/drop-in-badge.tsx` — the whole file, 24 lines. Same problem shape:
a booker-facing chip that names a fact:

```tsx
// DropInBadge (OPEN-04 · OC-12 — 09-UI-SPEC § Component Inventory) — names the occupancy mode wherever a
// drop-in listing appears next to whole-space ones …
//
// REAL TEXT, NEVER AN ICON-ONLY MARKER. The label below is a word a booker can read, search for and
// repeat; a bare glyph would be a private code they have to learn. It is also deliberately NOT accent —
// § Color lists the five accent uses this phase allows and this is not one of them. …
//
// Not "use client": pure presentation.

import { Badge } from "@/components/ui/badge";

export function DropInBadge({ className }: { className?: string }) {
  return (
    <Badge variant="secondary" className={className}>
      Drop-in
    </Badge>
  );
}
```

**If the badge carries an icon**, the recipe + a11y rule is `src/components/host/payout-state-badge.tsx:1-8, 74-79`:

```tsx
// … Maps a payout-ledger state to a badge that pairs its colour with a distinct lucide icon + text —
// NEVER colour-only … No happy state is ever rendered red.
  return (
    <Badge variant={variant} className={cn("gap-1", className)}>
      <Icon className={cn("size-3", iconClassName)} aria-hidden="true" />
      {view.label}
    </Badge>
  );
```

And the exhaustiveness lesson at `:53-62` (branch on the discriminant, key the `Record` on
`Exclude<Union, handled>`, so adding an enum member fails to compile rather than throwing at runtime)
applies directly to a badge keyed on `host_verification_status`.

⚠ **D-212 is a rendering rule, not a copy rule.** The badge must render for `approved` only — the
component should therefore take the *status*, not a boolean, and return `null` for every other value,
so a caller cannot accidentally show it for `grandfathered`.

---

### 15. Tests

**(a) Truth table (extend, don't replace)** — `tests/listing/bookability.test.ts:92-137`. The table is
16 rows over 4 booleans; two new enum dimensions make a full cross-product impractical, so the file's
own precedent is the guide: dimension rows plus a **meta-assertion** and named single-reason cases.
Note the honest caveat at `:46-50` — the meta-assertion filters the table's declared `expected`
column, so it is a self-consistency check and **not coverage**:

```typescript
  for (const r of rows) {
    it(`status=${r.status} emailVerified=${r.emailVerified} payoutsEnabled=${r.payoutsEnabled} hasOperatingHours=${r.hasOperatingHours} → ${r.expected}`, () => {
      expect(
        deriveBookable(
          { status: r.status, hasOperatingHours: r.hasOperatingHours },
          { emailVerified: r.emailVerified, payoutsEnabled: r.payoutsEnabled },
        ),
      ).toBe(r.expected);
    });
  }
```

The **auto-revert** case shape (`:148-166`) is what D-222 needs for `suspended`:

```typescript
  it("auto-reverts when payoutsEnabled flips to false with nothing else changed (D-14)", () => {
    const listing = { status: "published" as const, hasOperatingHours: true };
    const host = { emailVerified: true, payoutsEnabled: true };
    expect(deriveBookable(listing, host)).toBe(true);
    expect(deriveBookable(listing, { ...host, payoutsEnabled: false })).toBe(false);
  });
```

**(b) Predicate-vs-SQL parity (D-226)** — `tests/search/bookable-gate.test.ts`. The FIXTURES table at
`:151-163` must gain a row per new enum value or, per D-226, *"the equality proves less than it did
before."* Its own docblock says why the table lives beside the seeds:

```typescript
/**
 * The PARITY TABLE — the four `deriveBookable` inputs per fixture, kept beside the SQL fixtures they
 * describe so the two cannot be edited apart.
 *
 * `gate_deleted` is DELIBERATELY ABSENT. Soft-delete is a SQL-only term …
 */
const FIXTURES: Array<{ id: string; status: …; emailVerified: boolean; payoutsEnabled: boolean; hasOperatingHours: boolean }> = [
  { id: "gate_pub",        status: "published", emailVerified: true,  payoutsEnabled: true,  hasOperatingHours: true },
  { id: "gate_draft",      status: "draft",     emailVerified: true,  payoutsEnabled: true,  hasOperatingHours: true },
  { id: "gate_unverified", status: "published", emailVerified: false, payoutsEnabled: true,  hasOperatingHours: true },
  { id: "gate_nopayout",   status: "published", emailVerified: true,  payoutsEnabled: false, hasOperatingHours: true },
  { id: "gate_nohours",    status: "published", emailVerified: true,  payoutsEnabled: true,  hasOperatingHours: false },
];
```

The assertion, `:221-238`:

```typescript
  it("the SQL twin and the TypeScript predicate accept exactly the same set (Pitfall 5 drift guard)", async () => {
    const { results } = await searchListings(testDb.db, searchParamsSchema.parse({}));
    const ids = results.map((r) => r.id);

    expect(new Set(ids)).toEqual(
      new Set(
        FIXTURES.filter((f) =>
          deriveBookable(
            { status: f.status, hasOperatingHours: f.hasOperatingHours },
            { emailVerified: f.emailVerified, payoutsEnabled: f.payoutsEnabled },
          ),
        ).map((f) => f.id),
      ),
    );
```

And the one-reason-per-fixture discipline, `:105-109`:

```
 * `hours` is a SEPARATE dimension from status on purpose. Every fixture below must fail (or pass) for
 * its OWN single reason — that is what makes an exclusion diagnostic rather than merely true …
```

**(c) Refusal anchors (D-227)** — `tests/booking/state-machine.test.ts`. The `L_nohours` listing is
seeded identical to a bookable one in every respect but the one under test (`:231-245`), and the
assertion counts **rows in the DB**, not just the return value (`:278-287`):

```typescript
  it("a published, fully-payable listing with NO operating hours is refused server-side — the CTA is not the gate", async () => {
    …
    const res = await placeHold({ listingId: "L_nohours", startUtc: START, endUtc: END, fullDay: false });
    const [{ n }] = await testDb.client`SELECT count(*)::int AS n FROM booking WHERE listing_id = 'L_nohours'`;
```

The RED that justified the anchor is quoted in the file header (`:36-45`) — *the action REDIRECTED,
i.e. it MINTED A REAL HOLD*. The two new anchors must be able to produce the same kind of evidence.

**(d) HVER-02's column-set assertion** — `tests/ops/alerts.test.ts:563-592`. This is the exact
mechanism the requirement names ("enforced by a test that asserts the table's column set, not by
convention"), including the "never verify a migration with tsc" reasoning:

```typescript
    // MEASURED AGAINST THE DATABASE, NEVER AGAINST `tsc` (T-08-40). The row type comes from schema.ts, so a
    // column declared there but never migrated leaves the type checker and `next build` perfectly green
    // while every integration test in the suite runs against a table that does not have it. …
    // `table_schema` is scoped to the isolated schema tests/helpers/db.ts replayed from `drizzle/*.sql` …
    const cols = (await testDb.db.execute(sql`
      SELECT data_type AS "dataType", is_nullable AS "isNullable"
        FROM information_schema.columns
       WHERE table_schema = ${testDb.schema}
         AND table_name = 'audit'
         AND column_name = 'resolved_by'
    `)) as unknown as { dataType: string; isNullable: string }[];

    expect(cols).toHaveLength(1);
    …
    const [fks] = (await testDb.db.execute(sql`
      SELECT count(*)::int AS "c"
        FROM pg_constraint
       WHERE contype = 'f' AND conrelid = ${`"${testDb.schema}".audit`}::regclass
    `)) as unknown as { c: number }[];
    expect(fks.c).toBe(0);
```

**For HVER-02 invert the query**: `SELECT column_name … WHERE table_name = 'host_verification'`, sort,
and assert the **whole set** equals an explicit allow-list. That makes adding a document column a test
failure rather than a review catch.

**Test harness imports** (`bookable-gate.test.ts:78-84`) — the standard integration header:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, hostPayout, listing, operatingHours } from "@/lib/db/schema";
```

---

## Shared Patterns

### Authentication / authorization
**Source:** `src/app/actions/capability.ts:42-46` (action) · `src/app/(host)/host/layout.tsx:42-55` (page) · `src/lib/auth.ts:107-113` (`input: false`)
**Apply to:** every `(ops)` page, every ops server action, `scripts/ops-grant.ts`
**Rule:** `src/middleware.ts:1-7` — *"OPTIMISTIC ONLY — NOT the security boundary … the REAL auth checks
are per-page/per-action via `auth.api.getSession()`. Never gate sensitive data or capability on this
middleware alone."*

### Audit
**Source:** `src/lib/audit.ts:32-51` (the entry shape) · `src/app/actions/cancel-booking.ts:1200-1212` (a real ops-grade write)
**Apply to:** every ops action, on both the allow and the deny branch

```typescript
export interface AuditEntry {
  /** The authenticated identity performing the action (server-resolved, never client-supplied). */
  actorId: string;
  /** The privileged action name, e.g. "activateHosting". */
  action: string;
  /** Result of the privileged attempt. */
  outcome: AuditOutcome;   // "ok" | "denied" | "error" | "needs_attention"
  /** Optional structured context … Must not contain secrets/PII … lands in `audit.meta` (D-72). */
  meta?: Record<string, unknown>;
}
```

⚠ **`recordAudit` swallows its own insert failure** (`src/lib/audit.ts:83-90`) and always emits the log
line first. An ops action must not treat a successful `await recordAudit(...)` as proof a row exists:

```
// THE SWALLOW IS DELIBERATE. recordAudit is awaited at 57 call sites and many of them sit inside
// `catch` blocks on money paths … Losing an audit ROW is acceptable; losing the ACK is not.
```

That is exactly why OPS-03 must be verified by **reading the row back**, not by the action returning ok.

### Rate limiting on privileged actions
**Source:** `src/app/actions/capability.ts:48-51, 63-73` · `src/app/actions/cancel-booking.ts:1029-1030`
**Apply to:** every ops mutation

```typescript
const ACTIVATE_RATE_LIMIT = { window: 60, max: 5 } as const;
…
const limit = rateLimit(`activate:${userId}`, ACTIVATE_RATE_LIMIT);
if (!limit.ok) {
  await recordAudit({ actorId: userId, action: "activateHosting", outcome: "denied",
    meta: { reason: "rate_limit", retryAfter: limit.retryAfter } });
  return { ok: false, error: "Too many attempts. Please try again in a moment." };
}
```

Keyed on the **authenticated user id, never IP** — "these are session-gated escalations."

### Error handling / result shape
**Source:** `src/app/actions/listing.ts:58-60`
**Apply to:** every ops server action. Calm typed refusal, never a throw:

```typescript
export type ListingResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

`cancel-booking.ts` uses shared named constants for the refusals (`DENIED`, `NEEDS_SESSION`,
`TOO_FAST`) so two paths cannot return two slightly different sentences.

### Validating a server-action argument
**Source:** `src/app/actions/cancel-booking.ts:1101-1105`
**Apply to:** every ops action taking an id + a reason string (OPS-05):

```typescript
  // Re-validate BOTH fields that cross the boundary. Server-action argument types are NOT enforced at
  // runtime, so a crafted reason string would otherwise land verbatim in an audit row and a durable column.
  // A malformed id or an unknown reason is a calm denial, never a throw.
  const parsed = hostCancellationSchema.safeParse({ bookingId, reason });
  if (!parsed.success) return DENIED;
```

### Telling the host (OPS-05 / D-230)
**Source:** `src/lib/db/schema.ts:476-495` (`notificationType` pgEnum, and the 55P04 note at `:488-491`) ·
`:497-510` (`NotificationPayload`, the store-display-strings rule) · `cancel-booking.ts:1345-1358` (`emitNotify`)

```typescript
  await emitNotify({
    type: "booking_cancelled_by_host",
    recipientId: row.bookerId,
    bookingId,
    email: row.bookerEmail,
    payload: { type: "booking_cancelled_by_host", listingTitle, whenLabel, refundLabel,
               side: "booker", href: `${base}/bookings/${bookingId}` },
  });
```

Two constraints ride along: the payload is the **sole** input to both channels (D-91 sufficiency, `:506-510`),
and adding a value to `notification_type` is an **`ALTER TYPE … ADD VALUE`** on an existing enum →
the 55P04 two-migration split (`drizzle/0018` precedent, named at `schema.ts:490-491`).

### Money
**Source:** `src/lib/db/schema.ts:419-466` · `src/lib/payments/config.ts:1-7`
**Apply to:** ops cancel-and-refund
Integer centavos everywhere; the rate and the amount are **frozen at write time** so a later change
never rewrites a past row; the exported NAME is imported, never a literal.

---

## No Analog Found

| File / concern | Role | Data Flow | Reason & fallback |
|---|---|---|---|
| `18-KYC-VENDOR-COMPARISON.md` (D-238) | doc deliverable | — | No prior vendor-fork doc in `.planning/`. Closest tonal analogs: `src/lib/payments/refund-rail.ts:1-33` (a verdict settled by *observed API behaviour*, with the raw responses quoted) and `.planning/ops/NEEDS-ATTENTION-RUNBOOK.md`. Write it verdict-first with evidence, not as a feature matrix. |
| Suspension exclusion inside `alertStuckHeld` | job (cron) | batch | Partial. `payout-reconcile.ts:138-149` reads `host_payout_ledger` alone with **no host join** — the freeze needs genuinely new SQL there, unlike in `payout-sweep`, which already joins `listing`→`host_payout`. |
| An `(ops)` nav inventory | config | — | `src/lib/nav.ts` is host-only. Its typed-tuple → derived union → total `Record` shape is the pattern to clone if the console grows past one destination; a single-page console does not need it. |

---

## Metadata

**Analog search scope:** `src/lib/**`, `src/app/(host)/**`, `src/app/actions/**`, `src/app/listings/**`,
`src/components/**`, `src/inngest/functions/**`, `scripts/**`, `drizzle/**`, `tests/**`
**Files read in full or in targeted ranges:** 34
**Upstream consumed:** `18-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md § Phase 18`
(`18-RESEARCH.md` was not yet written at map time; nothing here depends on it)
**Pattern extraction date:** 2026-09-01
