# Phase 3: Availability & the Double-Booking Guarantee - Pattern Map

**Mapped:** 2026-07-11
**Files analyzed:** 26 (new + modified)
**Analogs found:** 23 with strong analog / 26 total (3 net-new with only partial/structural analog)

> Every new file in this phase has a near-exact analog already in the repo. The correctness
> keystone (the `EXCLUDE` constraint, TZDate slot math, the two-connection race test) is the only
> genuinely net-new territory — and even those have a *structural* analog (the hand-authored
> `0001_enable_postgis.sql`, the pure-function `bookability.ts`, the harness in `tests/helpers/db.ts`).
> **Copy the analog's shape; the RESEARCH doc supplies the net-new logic.**

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/db/schema.ts` (MODIFY) | model | schema/CRUD | itself — `listing` table + `listingStatus`/`bookingMode` enums (lines 135-192) | exact (self) |
| `drizzle/0004_availability_tables.sql` (CREATE, generated) | migration | schema | `drizzle/0002_listing_tables.sql` | exact |
| `drizzle/0005_booking_exclusion.sql` (CREATE, hand-authored) | migration | schema | `drizzle/0001_enable_postgis.sql` | structural (EXCLUDE body is net-new) |
| `src/lib/validation/availability.ts` (CREATE) | validation | transform | `src/lib/validation/listing.ts` | exact |
| `src/lib/validation/booking.ts` (CREATE) | validation | transform | `src/lib/validation/listing.ts` | exact |
| `src/app/actions/operating-hours.ts` (CREATE) | server-action | CRUD/request-response | `src/app/actions/listing.ts` | exact |
| `src/app/actions/blocks.ts` (CREATE) | server-action | CRUD/request-response | `src/app/actions/listing.ts` | exact |
| `src/lib/availability/read-model.ts` (CREATE) | service (read model) | request-response/query | `src/app/listings/[id]/page.tsx` query block + `src/lib/listing-public.ts` projection | role-match |
| `src/lib/availability/slots.ts` (CREATE) | utility | transform | `src/lib/bookability.ts` (pure-lib boundary) | partial (TZDate math net-new) |
| `src/lib/availability/units.ts` (CREATE) | service | CRUD/transaction | `src/app/actions/listing.ts` `saveListingStep` `db.transaction` (lines 142-167) | role-match (23P01 retry net-new) |
| `src/lib/pg.ts` (CREATE) | utility | transform | none (tiny SQLSTATE helper) | no analog |
| `src/app/listings/[id]/page.tsx` (MODIFY) | route (RSC) | request-response | itself — replace placeholder at lines 217-231 | exact (self) |
| `src/app/(host)/host/listings/[id]/availability/page.tsx` (CREATE) | route (RSC) | request-response | `src/app/(host)/host/listings/[id]/edit/page.tsx` | exact |
| `src/components/availability/weekly-hours-editor.tsx` (CREATE) | component (host form) | request-response | `src/app/(host)/host/listings/[id]/edit/wizard.tsx` | role-match |
| `src/components/availability/blocks-editor.tsx` (+AddBlockDialog) (CREATE) | component (host form) | request-response | `wizard.tsx` + `src/components/ui/dialog.tsx` usage | role-match |
| `src/components/availability/availability-calendar.tsx` (CREATE) | component (booker) | request-response | `src/components/listing/photo-uploader.tsx` (client composite) | partial (calendar/tz net-new) |
| `src/components/availability/slot-picker.tsx` (CREATE) | component (booker) | event-driven (selection) | `wizard.tsx` toggle/selection patterns (lines 374-435, 666-712) | partial |
| BookingRailSelection (extend rail in `page.tsx`) | component | request-response | `page.tsx` booking-rail `<aside>` (lines 234-288) | exact (self) |
| `tests/helpers/db.ts` (MODIFY) | test | — | itself — `makeClient` (lines 44-50) | exact (self) |
| `tests/availability/exclusion-race.test.ts` (CREATE) | test (integration) | — | `tests/listing/geo-roundtrip.test.ts` | role-match (2-conn race net-new) |
| `tests/availability/read-model.test.ts` (CREATE) | test (integration) | — | `tests/listing/geo-roundtrip.test.ts` | exact |
| `tests/availability/blocks.test.ts` (CREATE) | test (integration) | — | `tests/listing/geo-roundtrip.test.ts` | exact |
| `tests/availability/slots.test.ts` (CREATE) | test (unit) | — | `tests/listing/bookability.test.ts` | exact |
| `tests/availability/hours-validation.test.ts` (CREATE) | test (unit) | — | `tests/validation/listing-schema.test.ts` | exact |
| `tests/availability/error-map.test.ts` (CREATE) | test (unit) | — | `tests/listing/bookability.test.ts` | exact |
| `e2e/availability.spec.ts` (CREATE) | test (E2E) | — | `e2e/public-listing.spec.ts` | exact |

---

## Pattern Assignments

### `src/lib/db/schema.ts` (MODIFY) — model, schema

**Analog:** itself. The `listing` table (lines 151-192) and the two `pgEnum`s (lines 135-136) are the exact templates. Add `unitCount`/`timezone` columns to `listing`, a new `bookingStatus` enum, and three tables.

**pgEnum pattern** (schema.ts:135-136) — declare enums *before* the tables that reference them (const TDZ), and note the comment convention:
```typescript
// Fixed curated enums (D-05/D-08). Declared before the tables that reference them (const TDZ).
export const listingStatus = pgEnum("listing_status", ["draft", "published", "unlisted"]);
export const bookingMode = pgEnum("booking_mode", ["instant", "request"]);
```
→ add: `export const bookingStatus = pgEnum("booking_status", ["pending","confirmed","cancelled","declined","completed"]);` (RESEARCH schema shapes; only `pending`+`confirmed` are referenced by the partial WHERE this phase).

**pgTable + timestamptz + FK + index pattern** (schema.ts, `listingPhoto` 194-210 is the cleanest child-table template):
```typescript
export const listingPhoto = pgTable(
  "listing_photo",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    // ...
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("listing_photo_listing_idx").on(t.listingId),
    uniqueIndex("listing_photo_position_uq").on(t.listingId, t.position),
  ],
);
```
→ Apply verbatim to `operatingHours`, `availabilityBlock`, `booking` (RESEARCH "Recommended schema shapes", lines 277-319). **Every timestamp column MUST be `{ withTimezone: true }`** (file-header convention, schema.ts:12-14; CLAUDE.md "never store naive timestamps"). `booking.bookerId` references `user.id` with `{ onDelete: "restrict" }` (RESEARCH A5). `availabilityBlock.unit` is nullable `integer("unit")` (NULL = whole listing).

**Load-bearing comment to add** on the `booking` table (RESEARCH Pitfall 4): a `// EXCLUDE "booking_no_overlap" is hand-authored in 0005 — Drizzle cannot express it` note so nobody assumes `drizzle-kit generate` produces the constraint. Mirrors the existing header comments about hand-authored tables (schema.ts:6-14).

**Add to `listing`** (schema.ts, near line 173):
```typescript
unitCount: integer("unit_count").default(1).notNull(),        // D-21
timezone: text("timezone").default("Asia/Manila").notNull(),  // D-27 (IANA)
```

**`relations()` pattern** (schema.ts:264-272) — add `listingRelations` entries for the three new tables and a `bookingRelations`/`operatingHoursRelations` if joins need them.

---

### `drizzle/0004_availability_tables.sql` (CREATE, generated) — migration, schema

**Analog:** `drizzle/0002_listing_tables.sql` — the exact template for a drizzle-*generated* migration.

**This file is produced by `npx drizzle-kit generate`, not hand-written** (project uses `migrate`, never `push` — RESEARCH Pitfall 4 / Anti-Patterns). After generating, verify it follows the 0002 shape:
- `CREATE TYPE "public"."booking_status" AS ENUM(...)` first (0002:1-3)
- `CREATE TABLE ...` blocks with `--> statement-breakpoint` between each (0002:4-59)
- `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... REFERENCES "public"."..."` (0002:61-65)
- `CREATE INDEX ... USING btree (...)` (0002:66-72)

The harness rewrites `"public".` → the isolated schema, so the generated `"public".` qualifiers are correct as-is (tests/helpers/db.ts:82).

---

### `drizzle/0005_booking_exclusion.sql` (CREATE, HAND-AUTHORED) — migration, schema keystone

**Analog:** `drizzle/0001_enable_postgis.sql` — the structural template for a hand-authored `CREATE EXTENSION` migration. The `EXCLUDE` body itself is net-new (RESEARCH Pattern 1).

**Copy from 0001 (the whole file, lines 1-7):** the `IF NOT EXISTS` idempotency requirement + the header comment explaining *why* it is hand-authored and *why* `IF NOT EXISTS` is mandatory for the test harness replay:
```sql
-- Custom SQL migration file, put your code below! --
-- ... IF NOT EXISTS is MANDATORY so the integration test harness (tests/helpers/db.ts) can replay
-- it idempotently into every isolated schema across parallel Vitest workers without failing.
CREATE EXTENSION IF NOT EXISTS postgis;
```

**Net-new body (from RESEARCH Pattern 1, lines 177-191)** — the two statements MUST be separated by `--> statement-breakpoint` (the harness splits on it, tests/helpers/db.ts:84) and columns kept **unqualified** (no `public.` prefix) so they resolve via the schema-first search_path (RESEARCH Pitfall 3):
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist (
    "listing_id" WITH =,
    "unit" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" IN ('pending', 'confirmed'));
```
- `WITH SCHEMA public` has no `"public".` token, so the harness's `.replaceAll('"public".', ...)` leaves it intact → opclasses land in `public` and resolve for every test schema (RESEARCH Pitfall 2).
- `'[)'` half-open bound is **non-negotiable** and must match the read model exactly (RESEARCH Pitfall 5).
- Filename sorts after `0004` lexically so the table exists before the constraint (tests/helpers/db.ts:63 sorts `.sql` files; migrationFiles()).

---

### `src/lib/validation/availability.ts` + `src/lib/validation/booking.ts` (CREATE) — validation

**Analog:** `src/lib/validation/listing.ts` — the exact shared-Zod pattern (client form + server re-validation).

**Header + dual-schema convention** (validation/listing.ts:1-14): a top comment stating the SAME schema validates in the RHF form and again in the server action; the client is never trusted for times/units (RESEARCH Security V5).

**Schema + inferred-type export pattern** (validation/listing.ts:20-71):
```typescript
import { z } from "zod";

export const draftSchema = z.object({
  title: z.string().max(120).optional(),
  maxOccupancy: z.number().int().optional(),
  // ...
});
export const publishSchema = z.object({
  hourlyRateCents: z.number().int().positive(),
  // ...
});
export type DraftListingInput = z.infer<typeof draftSchema>;
```
→ For `availability.ts`: a weekly-hours-window schema (dayOfWeek 0-6, openTime/closeTime as `HH:mm` strings, `close > open` via `.refine`, no-overlap check) and a block schema (date, whole-day vs partial range, `end > start`, unit ∈ 1..unitCount or null). For `booking.ts`: slot-selection schema (on-the-hour `:00` times, `end > start`, unit range). Copy the `z.number().int().positive()` / `.optional()` idiom and the `z.infer` type exports verbatim.

**Test analog:** `tests/validation/listing-schema.test.ts` (a `validX` object + per-case overrides to `undefined`/bad value; `.safeParse(...).success` assertions) → `tests/availability/hours-validation.test.ts`.

---

### `src/app/actions/operating-hours.ts` + `src/app/actions/blocks.ts` (CREATE) — server-action, CRUD

**Analog:** `src/app/actions/listing.ts` — the canonical session + ownership + server-revalidation pattern.

**Security-contract header** (listing.ts:1-19) — copy the SESSION / OWNERSHIP (T-03-IDOR) / server-revalidation comment block; adapt IDs.

**Result type + `requireUserId` + `assertOwnership`** (listing.ts:42-64) — copy directly:
```typescript
export type ListingResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

async function assertOwnership(listingId: string, userId: string) {
  const rows = await db.select().from(listing)
    .where(and(eq(listing.id, listingId), isNull(listing.deletedAt)));
  const row = rows[0];
  if (!row || row.hostId !== userId) return null;
  return row;
}
```
This is the exact `listing.hostId === session.userId` IDOR guard RESEARCH Security V4 mandates for hours/blocks writes — the `(host)` route group is **not** sufficient alone.

**Mutation body pattern** (listing.ts:91-171 `saveListingStep`): (1) `requireUserId()` → early return; (2) `assertOwnership()` → early return; (3) `parsed = schema.safeParse(input)` → return `fieldErrors` on failure; (4) `db.transaction(async (tx) => { ... })` with the write **re-scoped to `(id AND hostId)`** as defense-in-depth (listing.ts:144-147); (5) `revalidatePath(...)`; (6) `return { ok: true }`.

**Delete-then-insert "replace the set" idiom** (listing.ts:151-166) is the exact template for `operating-hours.ts` upsert (delete all windows for `(listingId, dayOfWeek)` then insert the new set inside one transaction). For `blocks.ts`, "add block" = single insert, "unblock" = delete scoped to `(id AND listing owned by user)` — mirrors `unlistListing`/`softDeleteListing` (listing.ts:261-299).

**`randomUUID()` PK generation** (listing.ts:21, 75) — `import { randomUUID } from "node:crypto"` and generate row ids app-side (matches `text("id").primaryKey()` convention).

---

### `src/lib/availability/read-model.ts` (CREATE) — service, read model

**Analog (query shape):** `src/app/listings/[id]/page.tsx` lines 78-108 (the join + `Promise.all` multi-table fetch). **Analog (pure projection boundary):** `src/lib/listing-public.ts` / `src/lib/bookability.ts` (a named module that is the single source of a derived value).

**Server-side fetch pattern** (page.tsx:100-108):
```typescript
const [photoRows, amenityRows, tagRows] = await Promise.all([
  db.select().from(listingPhoto).where(eq(listingPhoto.listingId, id)).orderBy(asc(listingPhoto.position)),
  db.select().from(listingAmenity).where(eq(listingAmenity.listingId, id)),
  db.select().from(listingActivityTag).where(eq(listingActivityTag.listingId, id)),
]);
```
→ `getAvailability(listingId, dayLocal)` fetches, in parallel: operating_hours for the venue-local dow; blocks overlapping the day; occupying bookings overlapping the day (with units). Filter overlaps in SQL with `tstzrange(..., '[)') && tstzrange(dayStartUtc, dayEndUtc, '[)')` (RESEARCH Pattern 3, lines 233-243) — use Drizzle's `sql` template (already imported in listing.ts:22) for the range expression.

**Composition split (RESEARCH Pattern 3):** SQL fetches raw rows; TS composes the slot grid via `@date-fns/tz` calling into `slots.ts`. Free-unit rule at lines 238-241: whole-listing block (`unit IS NULL`) ⇒ 0 free; else `freeUnits = unitCount − |occupied units ∪ unit-blocked units|`.

---

### `src/lib/availability/slots.ts` (CREATE) — utility, TZDate math

**Analog (structure only):** `src/lib/bookability.ts` — a small, pure, no-I/O module with a header comment explaining its boundary role and a directly-unit-testable exported function. **The TZDate logic itself is net-new** (no tz code exists in the repo — Phase 2 deferred date components).

Copy `bookability.ts`'s shape (pure function + explanatory header + drives a direct unit test, bookability.ts:1-21). Fill the body from RESEARCH Pattern 4 (lines 249-275): `new TZDate(y, m, d, h, 0, 0, tz)` per slot — **never** add fixed ms in a loop (DST-incorrect); compute the venue-tz day-of-week via `TZDate`; horizon/now gating. **Test analog:** `tests/listing/bookability.test.ts` (table-driven pure unit test) → `tests/availability/slots.test.ts`.

---

### `src/lib/availability/units.ts` (CREATE) — service, transaction + 23P01 retry

**Analog:** `src/app/actions/listing.ts` `saveListingStep` `db.transaction(async (tx) => {...})` block (lines 142-167). **The find-free-unit + retry-on-`23P01` loop is net-new** (RESEARCH Pattern 2, lines 205-228).

Reuse: Drizzle `sql` template (listing.ts:22) for the "SELECT DISTINCT unit ... WHERE ... && tstzrange(...)" occupancy probe; `randomUUID()` for the booking id; `db.insert(booking).values({...})`. The catch/retry on `isPgError(e, "23P01")` uses the helper below. Correctness rests on the constraint, **not** the SELECT (RESEARCH Pattern 2 "Key principle") — do not "query then insert" as a guard (CLAUDE.md "What NOT to Use").

---

### `src/lib/pg.ts` (CREATE) — utility, SQLSTATE detection

**Analog:** none (net-new tiny helper). Body is fixed by RESEARCH Code Examples (lines 383-386):
```typescript
export function isPgError(e: unknown, code: string): e is { code: string } {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: unknown }).code === code;
}
```
Used by `units.ts` and any server action mapping `23P01` → "That time was just taken." (RESEARCH lines 388-397). postgres.js surfaces SQLSTATE on `err.code` (RESEARCH Standard Stack).

---

### `src/app/listings/[id]/page.tsx` (MODIFY) — route (public RSC)

**Analog:** itself. Replace the placeholder `<section>` at **lines 217-231** (the dashed `Availability coming soon` box) with `<AvailabilityCalendar listing={...} bookable={bookable} timezone={pub.timezone} />`.

- `bookable` is already computed via `deriveBookable(...)` at **lines 92-98** — pass it down; **selection is enabled only when `bookable`** (CONTEXT Bookability; UI-SPEC Interaction rules). Do **not** bypass `deriveBookable`.
- Extend the booking rail `<aside>` (**lines 234-288**) with the selection summary (date · time range · est. price, `tabular-nums`) above the existing state-reflecting CTA. The `bookable ? <coral Button> : <disabled "Not bookable yet" tooltip>` fork (lines 254-279) stays exactly as-is — the "Book this space" CTA remains a Phase-4 placeholder.
- `formatMoney(cents, currency)` (page.tsx:56-67) is reusable for the est.-price line; default/display **PHP** on this surface (RESEARCH Pitfall 7 — `currency` still defaults to `usd`).
- This RSC stays **outside** the `(app)/(host)` gated groups (page.tsx:1-6) — anyone can view.

---

### `src/app/(host)/host/listings/[id]/availability/page.tsx` (CREATE) — route (host RSC)

**Analog:** `src/app/(host)/host/listings/[id]/edit/page.tsx` — the exact "load-gate-seed-a-client-editor" RSC template.

**Copy verbatim (edit/page.tsx:19-53):** the `getSession` → `redirect("/login")` if no session → `redirect("/")` if `!canHost` (defense-in-depth on top of the `(host)` layout gate) → load the caller's OWN non-deleted listing → `notFound()` if `!row || row.hostId !== session.user.id` (IDOR, don't leak existence) → `Promise.all` fetch of children (here: operating_hours + blocks) → seed the client editor. lat/lng axis read-back (`row.location?.y`/`.x`, edit/page.tsx:67-68) is not needed here, but the ownership/gate skeleton is copied exactly.

---

### `src/components/availability/weekly-hours-editor.tsx` + `blocks-editor.tsx` (CREATE) — host client forms

**Analog:** `src/app/(host)/host/listings/[id]/edit/wizard.tsx` — the canonical `"use client"` RHF + Zod + shadcn `Form` + server-action + `sonner` toast composite.

**Copy the wiring (wizard.tsx:1-45, 173-257):**
```typescript
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
// ...
const form = useForm<Input>({ resolver: zodResolver(schema), defaultValues: {...} });

async function persist(): Promise<boolean> {
  const res = await saveHours(listingId, form.getValues());   // server action
  if (!res.ok) { toast.error(res.error); return false; }
  return true;
}
```
- `FormField` + `render={({ field }) => (<FormItem>...<FormMessage/></FormItem>)}` per control (wizard.tsx:346-372) — use `Select` for open/close times.
- Dynamic add/remove rows: mirror the tag toggle helpers (wizard.tsx:270-282) for "add a window" / "remove a window" per weekday (D-25 multiple windows/day). `<Toaster />` mounted once (wizard.tsx:309).
- **Server always re-validates** with the same Zod schema — the client form is UX only (wizard.tsx header:4-7).

**BlocksEditor + AddBlockDialog:** compose the above with `src/components/ui/dialog.tsx` (existing) + the new shadcn `calendar` + `radio-group` (existing, used in wizard.tsx:667-712 for booking mode) for whole-day vs partial-range and whole-listing vs one-unit. "Remove block" is a reversible neutral action (UI-SPEC — never `--destructive`).

---

### `src/components/availability/availability-calendar.tsx` + `slot-picker.tsx` (CREATE) — booker client composites

**Analog (client composite shell):** `src/components/listing/photo-uploader.tsx` (a `"use client"` interactive grid with `onCountChange`-style lifted state) and the wizard's toggle/selection idioms (wizard.tsx:374-435 tag chips, 666-712 radio cards). **The react-day-picker `calendar` + `timeZone` prop and `@date-fns/tz` display are net-new** (no date components exist — Phase 2 deferred them; UI-SPEC Component Inventory).

- **Calendar:** shadcn `calendar` with `timeZone={listing.timezone}` (RESEARCH Pattern 4, line 270; UI-SPEC). Map `selected` day → `--brand`; disable past / beyond-horizon / fully-unavailable days.
- **SlotPicker:** shadcn `toggle-group` (`type="multiple"`) enforcing the consecutive-run rule (D-22); blocked/occupied/closed slots `aria-disabled` + strike/hatch + tooltip, **never red, never color-only** (UI-SPEC Availability-state recipes; AVAIL-05). Selection state lifts to the rail.
- **Display formatting** (RESEARCH Pattern 4, lines 265-270): `format(new Date(slot.startUtc), "h:mm a", { in: tz(listing.timezone) })` — always venue tz (SC#2), independent of browser tz.
- Loading = `skeleton` (existing); empty = "No availability yet" (UI-SPEC copy).

---

## Shared Patterns

### Session + ownership (IDOR guard) — applies to both server actions and the host RSC
**Source:** `src/app/actions/listing.ts:46-64` (`requireUserId` + `assertOwnership`) and `src/app/(host)/host/listings/[id]/edit/page.tsx:26-47`.
**Apply to:** `operating-hours.ts`, `blocks.ts`, `(host)/.../availability/page.tsx`, `units.ts` (booker id from session).
```typescript
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}
async function assertOwnership(listingId: string, userId: string) {
  const rows = await db.select().from(listing)
    .where(and(eq(listing.id, listingId), isNull(listing.deletedAt)));
  const row = rows[0];
  if (!row || row.hostId !== userId) return null;
  return row;
}
```
Every mutating write is additionally re-scoped `WHERE (id AND hostId)` (listing.ts:144-147). RESEARCH Security V4 requires this even though the `(host)` layout already gates.

### Shared Zod validation (client form + server re-parse)
**Source:** `src/lib/validation/listing.ts` (schemas) + `src/app/actions/listing.ts:106-113` (server `safeParse` → `fieldErrors`) + `wizard.tsx:173-196` (`zodResolver` on the client).
**Apply to:** all host hours/blocks writes and booker slot selection — never trust client-supplied times/units (CLAUDE.md "What NOT to Use"; RESEARCH Security V5).

### `timestamptz`-everywhere + `'[)'` half-open ranges
**Source:** schema.ts header (lines 12-14) — every `timestamp(..., { withTimezone: true })`; RESEARCH Pattern 1/Pitfall 5 — `tstzrange(..., '[)')` in the constraint, the unit-assignment SELECT, and the read-model overlap filter, **identically**.
**Apply to:** `booking`/`availability_block`/`operating_hours.createdAt` columns, `0005` constraint, `read-model.ts`, `units.ts`, `slots.ts`.

### Hand-authored migration conventions (idempotent replay + statement breakpoints)
**Source:** `drizzle/0001_enable_postgis.sql` (`CREATE EXTENSION IF NOT EXISTS` + the "MANDATORY for the test harness" header) and `drizzle/0002_listing_tables.sql` (`--> statement-breakpoint` between statements).
**Apply to:** `0005_booking_exclusion.sql`. The harness (tests/helpers/db.ts:80-92) splits on `--> statement-breakpoint`, rewrites `"public".`, and runs each stmt with the isolated schema first on `search_path` — keep `WITH SCHEMA public` and the constraint columns unqualified (RESEARCH Pitfalls 2 & 3).

### Per-worker-schema integration harness + seeding
**Source:** `tests/helpers/db.ts` (`setupTestDb`/`teardownTestDb`, replays `./drizzle` incl. hand-authored SQL) + `tests/listing/geo-roundtrip.test.ts:21-37` (`beforeAll`/`afterAll` + `makeHost` seeding helper).
**Apply to:** every `tests/availability/*.test.ts`. **Wave-0 add:** a `makeRacingClients(schema, n)` (or exported `makeClient`) so the SC#4 test can open ≥2 independent connections on one isolated schema — the existing `makeClient` uses `max: 1` which serializes and would prove nothing (RESEARCH Pitfall 1; tests/helpers/db.ts:44-50).

### The `deriveBookable` sell-gate (do not bypass)
**Source:** `src/lib/bookability.ts` — read in `src/app/listings/[id]/page.tsx:92-98`.
**Apply to:** the calendar/slot-picker — availability may be *shown*, but a slot is *selectable* only when `deriveBookable(...)` is true; otherwise render read-only + the existing "Not bookable yet" rail (CONTEXT Bookability; UI-SPEC Interaction rules).

### E2E seed-and-assert (no login, direct dev-DB seed)
**Source:** `e2e/public-listing.spec.ts` — `postgres(DATABASE_URL, {max:1})` direct seed in `beforeAll`, unique `randomUUID()` ids, cascade-delete host in `afterAll`, `page.goto` + `getByRole` assertions.
**Apply to:** `e2e/availability.spec.ts` (seed a listing + operating hours + a block + a booking; assert venue-tz note visible, blocked/occupied slots `aria-disabled` & unselectable, `!bookable` → read-only, consecutive-run selection).

---

## No Analog Found

Files with net-new logic the planner should draw from RESEARCH (not from an existing repo file). Each still has a *structural* analog for its shape — only the highlighted logic is new.

| File | Role | Data Flow | Net-new part (RESEARCH source) |
|------|------|-----------|-------------------------------|
| `src/lib/pg.ts` | utility | transform | The whole `isPgError` helper — trivial (RESEARCH Code Examples 383-386). Shape: none needed. |
| `drizzle/0005_booking_exclusion.sql` (EXCLUDE body) | migration | schema | The `EXCLUDE USING gist (... WITH =, tstzrange '[)' WITH &&) WHERE status IN (...)` constraint (RESEARCH Pattern 1). Structural analog = `0001_enable_postgis.sql`. |
| `src/lib/availability/slots.ts` (TZDate math) | utility | transform | `TZDate`-based DST-correct slot enumeration + venue-tz day-of-week (RESEARCH Pattern 4). No tz code exists in the repo yet. Structural analog = `bookability.ts`. |
| `src/lib/availability/units.ts` (retry loop) | service | transaction | The find-free-unit + retry-on-`23P01` loop under `unitCount` (RESEARCH Pattern 2). Structural analog = `saveListingStep` transaction. |
| `src/components/availability/availability-calendar.tsx` + `slot-picker.tsx` (react-day-picker) | component | request-response | The `calendar` `timeZone` prop + `toggle-group` consecutive-run selection (UI-SPEC; RESEARCH Pattern 4). No date components exist (Phase 2 deferred them). Structural analog = `photo-uploader.tsx` + `wizard.tsx`. |

---

## Metadata

**Analog search scope:** `src/lib/db/`, `drizzle/`, `src/app/actions/`, `src/lib/validation/`, `src/lib/` (bookability), `src/app/listings/[id]/`, `src/app/(host)/host/`, `src/components/` (listing, host, ui), `tests/` (helpers, listing, validation), `e2e/`.
**Files scanned:** schema.ts, 0001/0002 migrations, listing.ts (action), validation/listing.ts, tests/helpers/db.ts, listings/[id]/page.tsx, bookability.ts, geo-roundtrip.test.ts, listing-schema.test.ts, host/layout.tsx, edit/page.tsx, edit/wizard.tsx, bookability.test.ts, public-listing.spec.ts, db/index.ts (~15 analog files read in full).
**Key libraries new this phase (RESEARCH):** `react-day-picker@10`, `date-fns@4`, `@date-fns/tz@1`, optional `@tanstack/react-query@5`; shadcn `calendar`/`toggle`/`toggle-group`/`scroll-area`; DB `btree_gist@1.8` (installed by `0005`).
**Pattern extraction date:** 2026-07-11
