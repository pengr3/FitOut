# Phase 4: Booking Core & Search (no payment) - Pattern Map

**Mapped:** 2026-07-14
**Files analyzed:** 32 (new + modified)
**Analogs found:** 30 strong (exact or role-match) / 32 total; every file has at least a structural analog; 3 carry net-new logic (the WR-03 transaction, the FIT- reference generator, the client countdown timer)

> **This phase is overwhelmingly EXTENSION, not greenfield.** Almost every new file has a near-exact
> analog already in the repo (RESEARCH §Summary: "predominantly extension and composition"). The two
> genuinely net-new mechanisms — the WR-03 transaction (SAVEPOINT + outer-retry + in-tx sweep) and the
> two-stage search — are *documented in RESEARCH* and *sit directly on top of* `units.ts` and
> `read-model.ts` respectively. **Copy the analog's shape; RESEARCH supplies the net-new logic.**
> Three files are MODIFIED in place (their own current code is the analog): `units.ts`, `read-model.ts`,
> `validation/booking.ts`, `money.ts`, `schema.ts`, `listings/[id]/page.tsx`.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/availability/units.ts` (MODIFY → add `createPendingHold`) | service | CRUD / transaction | itself — `createBooking` + AUTO-COMMIT CONTRACT header (units.ts:41-98) | exact (self) |
| `src/lib/availability/read-model.ts` (MODIFY → lazy expiry + batch) | service (read model) | request-response / query | itself — occupancy query (read-model.ts:100-107) | exact (self) |
| `src/lib/validation/booking.ts` (MODIFY → + 2 schemas) | validation | transform | itself (`slotSelectionSchema`) + `validation/listing.ts` (dual schema) | exact (self) |
| `src/lib/money.ts` (MODIFY → promote `DISPLAY_CURRENCY`) | utility | transform | itself + `listings/[id]/page.tsx:88` | exact (self) |
| `src/lib/db/schema.ts` (MODIFY → 4 booking cols + idem index) | model | schema | itself — `booking` table (schema.ts:329-346) + `listingPhoto` uniqueIndex (211) | exact (self) |
| `src/app/listings/[id]/page.tsx` (MODIFY → wire Book CTA) | route (RSC) | request-response | itself — the coral CTA seam (page.tsx:298-305) | exact (self) |
| `drizzle/0006_booking_hold.sql` (+ generated) | migration | schema | `0002_listing_tables.sql` (cols) + `0005`/`0001` (hand-authored index) | exact / structural |
| `src/lib/search/query.ts` (CREATE) | service (search) | request-response / query | `read-model.ts` (raw `sql` + `Promise.all`) + `bookability.ts` predicate | role-match |
| `src/lib/booking/pricing.ts` (CREATE) | utility | transform | `slots.ts` (pure lib) + `RailSelectionSummary` (availability-calendar.tsx:246-251) | role-match |
| `src/lib/booking/reference.ts` (CREATE) | utility | transform | `src/lib/pg.ts` (tiny pure helper shape) | structural |
| `src/app/actions/booking.ts` (CREATE → `placeHold`+`confirmBooking`) | server-action | CRUD / transaction | `src/app/actions/blocks.ts` (session→own→zod→tx→revalidate) | exact |
| `src/app/actions/search.ts` (CREATE, optional) | server-action | request-response / query | `src/app/actions/availability.ts` (public read-only, arg-validate) | exact |
| `src/app/page.tsx` (REPLACE scaffold → search home) | route (RSC) | request-response / query | `src/app/listings/[id]/page.tsx` (public RSC, async params) | role-match |
| `src/app/listings/[id]/book/page.tsx` (CREATE → reserve) | route (RSC) | request-response | `listings/[id]/page.tsx` + `edit/page.tsx` owner-gate | role-match |
| `src/app/bookings/[id]/page.tsx` (CREATE → confirmation) | route (RSC) | request-response | `listings/[id]/page.tsx` + `edit/page.tsx` owner-gate | role-match |
| `src/components/search/search-result-card.tsx` (CREATE) | component | request-response | `src/components/listing/listing-card.tsx` | exact |
| `src/components/search/search-bar.tsx` (CREATE) | component | event-driven (form→URL) | `address-autocomplete.tsx` + `wizard.tsx` RHF | role-match |
| `src/components/search/search-results.tsx` (CREATE) | component | request-response | `(host)/host/listings/page.tsx` card grid + `listing-card` | role-match |
| `src/components/booking/price-breakdown.tsx` (CREATE) | component | transform (display) | `RailSelectionSummary` (availability-calendar.tsx:233-268) | role-match |
| `src/components/booking/reserve-actions.tsx` (CREATE, client) | component | event-driven | `listing-card.tsx` `ConfirmDialog` button-disable (99-107) | role-match |
| `src/components/booking/hold-countdown.tsx` (CREATE, client) | component | event-driven (timer) | availability-calendar.tsx client-state shell (78-139) | partial |
| `src/components/booking/hold-expired-state.tsx` (CREATE) | component | request-response | dashed empty-state block (availability-calendar.tsx:184-204) | role-match |
| `scripts/seed.ts` (CREATE, D-38) | script / tooling | batch / file-I/O | `e2e/availability.spec.ts` seed helpers (66-131) | role-match |
| `tests/booking/pending-hold.test.ts` (CREATE) | test (integration/race) | — | `tests/availability/exclusion-race.test.ts` | exact |
| `tests/booking/hold-expiry.test.ts` (CREATE) | test (integration) | — | `tests/availability/read-model.test.ts` + `exclusion-race.test.ts` | role-match |
| `tests/booking/pricing.test.ts` (CREATE) | test (unit) | — | `tests/listing/bookability.test.ts` (pure) | exact |
| `tests/booking/state-machine.test.ts` (CREATE) | test (integration) | — | `tests/listing/status-gate.test.ts` (real actions + mock) | exact |
| `tests/search/availability-filter.test.ts` (CREATE) | test (integration) | — | `tests/availability/read-model.test.ts` | role-match |
| `tests/search/radius.test.ts` (CREATE) | test (integration) | — | `tests/listing/geo-roundtrip.test.ts` (PostGIS) | role-match |
| `tests/search/filters.test.ts` (CREATE) | test (integration) | — | `tests/availability/read-model.test.ts` | role-match |
| `tests/search/bookable-gate.test.ts` (CREATE) | test (integration) | — | `tests/listing/status-gate.test.ts` (Pitfall 5 says mirror it) | exact |
| `e2e/search-and-book.spec.ts` (CREATE) | test (E2E) | — | `e2e/availability.spec.ts` + `e2e/public-listing.spec.ts` | exact |

---

## Pattern Assignments

### `src/lib/availability/units.ts` (MODIFY) — service, CRUD/transaction — THE keystone change

**Analog: itself.** The file's `AUTO-COMMIT CONTRACT` header (units.ts:41-57) is the *exact spec* for
what `createPendingHold` must build — read it first. Keep `mapBookingError` as-is; keep `createBooking`
(or fold it) but the new hold path is a real `db.transaction`.

**The AUTO-COMMIT CONTRACT header names both remedies** (units.ts:41-57) — this is the WR-03 to-do list:
```
//   - 23P01 (exclusion_violation): … give each attempt its own SAVEPOINT (a Drizzle nested `transaction`)
//     so only the failed attempt rolls back and the outer tx stays usable.
//   - 40P01 (deadlock_detected): … needs an OUTER-transaction retry (redo the whole booking tx) …
```

**The current retry loop** (units.ts:66-98) — reuse the find-free probe + insert shape verbatim; the
change is (a) it now runs *inside* `db.transaction`, (b) each insert gets a nested `tx.transaction`
(SAVEPOINT), (c) an in-tx sweep runs before the loop, (d) `status`/`expiresAt`/price snapshot/idem key
are added to `.values(...)`:
```typescript
// current occupancy probe — Phase 4 swaps the status filter for the lazy-expiry predicate (below)
const occupied = await dbConn.execute(sql`
  SELECT DISTINCT unit FROM booking
  WHERE listing_id = ${listingId}
    AND status IN ('pending','confirmed')
    AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${startIso}, ${endIso}, '[)')`);
// … lowest-free-unit pick …
await dbConn.insert(booking).values({ id: randomUUID(), listingId, bookerId, unit, startsAt, endsAt, status });
// catch: if (isPgError(e, "23P01") || isPgError(e, "40P01")) continue;   ← Phase 4 splits these two
```

**Target shape is fully written in RESEARCH Pattern 2 (04-RESEARCH.md:273-319)** — outer `for` retry on
`40P01`, own-hold pre-check (idempotency), in-tx sweep `UPDATE … SET status='cancelled' WHERE status='pending'
AND expires_at <= now() AND tstzrange && tstzrange`, per-unit `await tx.transaction(async (sp) => sp.insert(...))`
(the SAVEPOINT), `23P01 → continue`, `23505 → return own duplicate`, `40P01 → rethrow → outer retry`.

**Reuse unchanged:** `mapBookingError` (units.ts:106-111 — already maps `NoUnitAvailableError`/`23P01`/`40P01`
→ "That time was just taken."); `isPgError` (from `@/lib/pg`); the `startIso`/`endIso` ISO-string binds vs
`new Date(...)` insert (units.ts:61-64 — the Pitfall-3 convention; **do not** bind a `Date` into a raw `sql`
range). Keep `dbConn: DbConn` typed from `read-model.ts`.

**Bind `db` (the transactional client), NOT the auto-commit connection** — the whole point of the change
(RESEARCH Pattern 2 "Critical"). `db.transaction` compiles to postgres.js `BEGIN`; nested `tx.transaction`
compiles to `SAVEPOINT` (RESEARCH verified from installed source).

---

### `src/lib/availability/read-model.ts` (MODIFY) — service, read model — lazy expiry

**Analog: itself.** The occupancy subquery (read-model.ts:100-107) is the ONE line that changes, and the
`getAvailability` signature (read-model.ts:60-65) is reused verbatim as the Stage-2 search predicate.

**The occupancy query today** (read-model.ts:102-107) — replace the `status IN (...)` filter:
```typescript
dbConn.execute(sql`
  SELECT unit, starts_at, ends_at FROM booking
  WHERE listing_id = ${listingId}
    AND status IN ('pending','confirmed')          -- ← D-48a: swap for the lazy-expiry predicate
    AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${dayStartIso}, ${dayEndIso}, '[)')`);
```
→ becomes `AND (status = 'confirmed' OR (status = 'pending' AND expires_at > now()))`
(RESEARCH Code Example, 04-RESEARCH.md:412-417). Use SQL `now()` (DB clock), **not** the injectable
`now: Date` param — that param stays for slot past/horizon state only (Pitfall 7, read-model.ts:60,151-153).
Keep the `'[)'` half-open bound + listing scoping IDENTICAL to the `EXCLUDE` (read-model.ts:8-10 comment).

**Stage-2 reuse (D-34):** `getAvailability(dbConn, listingId, dayLocal, now)` (signature at read-model.ts:60-65)
is called per search candidate — date-only ⇒ keep iff any `slot.state === "available"`; date+time ⇒ every
on-the-hour slot in `[start,end)` has `freeUnits >= 1`. Do **not** write a second SQL availability predicate
(RESEARCH Anti-Pattern — two sources of truth drift). Optional batched `getAvailabilityForListings(db, ids, day)`
is `[ASSUMED]` (RESEARCH Pattern 1) — same slot-composition, 3 queries for all ids.

---

### `src/lib/validation/booking.ts` (MODIFY) — validation, transform

**Analog: itself + `validation/listing.ts`.** The `slotSelectionSchema` (booking.ts:19-30) is the existing
client-selection contract; the header already states the dual client/server-revalidate intent (booking.ts:1-9).

**Add `searchParamsSchema` + `bookingCreateSchema`** using the same `z.object` + `.refine` + `z.infer` idiom:
```typescript
// existing scaffold to extend (booking.ts:19-30):
export const slotSelectionSchema = z.object({
  startUtc: z.string().datetime(),
  endUtc: z.string().datetime(),
  fullDay: z.boolean().default(false),
}).refine((v) => v.endUtc > v.startUtc, { message: "End must be after start.", path: ["endUtc"] });
```
- `searchParamsSchema`: bound every untrusted URL param — `lat ∈ [-90,90]`, `lng ∈ [-180,180]`, `radius` ∈
  the presets (2/5/10/25), `priceMax` int ≥ 0, `date`/`start`/`end`, a single combined `category` ∈ `spaceTypeValues` ∪ `activityTagValues`
  (from `@/lib/listing-vocab`), `sort` ∈ `{nearest,price}`, `page` int ≥ 0 (RESEARCH Security V5 + Pitfall
  "Tampered search origin"). Mirror the **runtime arg-validation** pattern in `actions/availability.ts:25-29`
  (`dayLocalSchema` — a crafted `NaN`/`"abc"` must not reach date math).
- `bookingCreateSchema`: `listingId`, the `slotSelectionSchema` window, an optional client `idempotencyKey`.
- Export `z.infer` types (booking.ts:30 shows the `type SlotSelection = z.infer<...>` idiom).

The **stronger invariants** (on-the-hour, inside operating hours, free-unit) are RE-DERIVED server-side from
the read model, NOT asserted in Zod (booking.ts:6-9 header already says this) — the schema is shape-only.

---

### `src/lib/money.ts` (MODIFY) — utility, transform

**Analog: itself.** `formatMoney(cents, currency)` (money.ts:8-19) is unchanged and already handles PHP via
`Intl` → ₱. The change is code-org only: **promote** `const DISPLAY_CURRENCY = "php"` (currently local at
`listings/[id]/page.tsx:88`) into this shared module so search cards, the reserve breakdown, and the
confirmation page all import ONE source (D-46, UI-SPEC §Currency). Then update `listings/[id]/page.tsx:88` to
import it instead of re-declaring. Pure/isomorphic — no directive (money.ts:5-7) — so RSC + client both import.

---

### `src/lib/db/schema.ts` (MODIFY) — model, schema

**Analog: itself.** The `booking` table (schema.ts:329-346) and the `bookingStatus` enum (schema.ts:277-283)
are the templates; `listingPhoto`'s `uniqueIndex` (schema.ts:211) is the partial-unique-index template.

**The enum ALREADY has the full state machine** (schema.ts:277-283) — no enum change needed if reusing
`cancelled` for abandoned holds (D-49/A3 lean); adding `expired` would be a hand-authored `ALTER TYPE … ADD
VALUE` (cannot run in a tx):
```typescript
export const bookingStatus = pgEnum("booking_status", ["pending","confirmed","cancelled","declined","completed"]);
```

**Add to the `booking` table** (schema.ts:329-346) using the existing column idioms (all timestamps
`{ withTimezone: true }` per the file header, schema.ts:12-14):
```typescript
// existing booking columns for reference (schema.ts:340-343):
startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
endsAt:   timestamp("ends_at",   { withTimezone: true }).notNull(),
status:   bookingStatus("status").default("confirmed").notNull(),
// ADD (D-49): expiresAt (nullable — only meaningful while pending), price snapshot, idempotency key
expiresAt:        timestamp("expires_at", { withTimezone: true }),   // set while 'pending'
quotedTotalCents: integer("quoted_total_cents"),                     // frozen at hold time (Phase-5 charge integrity)
currency:         text("currency").default("php").notNull(),         // freeze the display/charge currency
idempotencyKey:   text("idempotency_key"),                           // nullable client token (D-42 backstop)
```

**Partial-unique idempotency index** — copy the `uniqueIndex` shape from `listingPhoto` (schema.ts:211) and add
a `.where(...)` (Drizzle CAN express this; RESEARCH Pattern 6):
```typescript
// booking table's third-arg array (schema.ts:345) currently: [index("booking_listing_idx").on(t.listingId)]
uniqueIndex("booking_idem_uq").on(t.idempotencyKey).where(sql`idempotency_key IS NOT NULL`),
```

**Load-bearing comment already present** (schema.ts:322-328): the `EXCLUDE booking_no_overlap` is hand-authored
in `0005` — Drizzle can't express it. Any *new columns* go through `drizzle-kit generate`; a new *index/constraint*
edit is hand-authored. Keep that note accurate.

---

### `drizzle/0006_booking_hold.sql` (+ generated) — migration, schema

**Analogs:** `0002_listing_tables.sql` (a drizzle-*generated* `ALTER TABLE … ADD COLUMN` migration) for the four
new columns + the partial-unique index; `0005_booking_exclusion.sql` / `0001_enable_postgis.sql` for any
**hand-authored** functional index.

- **Columns + partial-unique index:** produced by `npx drizzle-kit generate` after the schema.ts edit (project
  uses `migrate`, never `push`). New nullable columns are backfill-safe — **no existing bookings exist** in dev
  or UAT (RESEARCH Runtime State Inventory / A7).
- **Optional `(location::geography)` GiST index** (perf seam, RESEARCH Pitfall 1 / A4): hand-author it like
  `0005`, with `IF NOT EXISTS` so the test harness replays it idempotently (0005:1-7 header explains why
  `IF NOT EXISTS` + unqualified columns are MANDATORY; `tests/helpers/db.ts:97-108` replays every `drizzle/*.sql`).
  ```sql
  CREATE INDEX IF NOT EXISTS listing_location_geog_gist ON listing USING gist ((location::geography));
  ```
- Separate multiple statements with `--> statement-breakpoint` (the harness splits on it, db.ts:101-104). At
  single-city/bookable-only scale a seq scan is fine — this index is optional (A4).

---

### `src/lib/search/query.ts` (CREATE) — service, search (Stage-1 SQL + Stage-2 filter)

**Analog:** `read-model.ts` (the raw `sql` + `Promise.all` + `db.execute` shape, read-model.ts:88-108) for
Stage-1; the `deriveBookable` predicate (bookability.ts:16-21) inlined into SQL for the bookable gate.

**Stage-1 SQL is fully drafted in RESEARCH Pattern 1 (04-RESEARCH.md:240-263)** — copy it. Load-bearing points:
- **`::geography` on BOTH operands** or the radius silently matches everything (Pitfall 1, HIGHEST RISK):
  `ST_DWithin(l.location::geography, ${originGeog}::geography, ${radiusMeters})` and
  `ST_Distance(l.location::geography, ${originGeog}::geography) AS distance_m`.
- **Origin axis order x=lng / y=lat** (Pitfall 4; matches schema.ts:170-172 + address-autocomplete.tsx:67):
  `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`.
- **Inline `deriveBookable` in SQL and comment the drift risk** (Pitfall 5) — mirror bookability.ts:16-21:
  ```typescript
  // from bookability.ts:16-21 — keep this SQL in sync (Pitfall 5):
  // listing.status === "published" && host.emailVerified && host.payoutsEnabled
  //   → WHERE l.status='published' AND l.deleted_at IS NULL AND u.email_verified = true
  //     AND COALESCE(hp.payouts_enabled, false) = true
  ```
- Activity match (D-35): gate on a single `category` param's PRESENCE (not space-type alone), checked against BOTH
  columns — `primary_space_type::text = $category OR EXISTS(listing_activity_tag WHERE tag = $category)` over
  `spaceTypeValues` ∪ `activityTagValues` (listing-vocab.ts:35,67). The `::text` cast avoids `22P02`: an activity
  `category` (e.g. `basketball`) is not a valid `space_type` enum label, so casting the enum to text makes a
  cross-vocab value compare as no-match instead of raising. Price (D-46): `hourly_rate_cents <= $priceMax`. Weekday
  pre-filter (tz-independent): `EXISTS(operating_hours WHERE day_of_week = EXTRACT(DOW FROM $date::date))`.
- **All user input parameter-bound** via Drizzle `sql` (never string-concat — Security V5). Bind ISO strings,
  not `Date` (Pitfall 3).
- **`LIMIT pageSize + 1`** = the "has more" probe for Load-more (D-32, Pitfall 8); over-fetch Stage-1 because
  Stage-2 filtering can drop candidates below the page size (A5).

**Stage-2:** loop candidates through `getAvailability` (read-model.ts:60) — the SAME read model the listing
page uses (D-34), so search and the calendar cannot diverge.

---

### `src/lib/booking/pricing.ts` (CREATE) — utility, transform (server-authoritative quote)

**Analog:** `slots.ts` (a small pure module owning one correctness concern, slots.ts:1-13 header) for the
*shape*; `RailSelectionSummary`'s price math (availability-calendar.tsx:246-251) for the *formula*.

**The formula already exists client-side** (availability-calendar.tsx:246-251) — re-derive it server-side and
freeze it (D-45/D-46; RESEARCH Pattern 4):
```typescript
const hours = Math.max(1, Math.round((end.getTime() - start.getTime()) / 3_600_000));
const cents = selection.fullDay ? dayRateCents : hourlyRateCents != null ? hourlyRateCents * hours : null;
```
Server version: re-derive `hours`/`fullDay` from the read-model window (never trust the client `RailSelectionSummary`
value — it is display-only, availability-calendar.tsx:15-17 + RESEARCH Pattern 4), compute
`quotedTotalCents = fullDay ? dayRateCents : hourlyRateCents * hours`, return `{ totalCents, currency: "php",
hours, fullDay }`. `createPendingHold` stores this as the frozen snapshot (D-49). Reuse `slots.ts` (`slotsForWindow`,
`BOOKING_HORIZON_DAYS`) for the hours/horizon math — never fixed-ms arithmetic (slots.ts:6-9).

---

### `src/lib/booking/reference.ts` (CREATE) — utility, transform (FIT-XXXXXXXX)

**Analog:** `src/lib/pg.ts` — a tiny, pure, single-purpose exported helper (no direct analog for the logic).
The URL uses the opaque `randomUUID` id (owner-gated); the displayed reference is `FIT-` + 8 Crockford base32
chars from a crypto-random source (UI-SPEC §Discretionary; RESEARCH A6; Security V6 — never sequential).
Generation is planner's call; store it as a column generated at insert or derive-on-read.

---

### `src/app/actions/booking.ts` (CREATE → `placeHold` + `confirmBooking`) — server-action, CRUD/transaction

**Analog:** `src/app/actions/blocks.ts` — the canonical session → ownership/capability → Zod re-validate → tx →
`revalidatePath` mutation. Copy its skeleton exactly; swap the ownership guard for a **capability** guard
(`canBook`, not host-ownership) and add a `redirect`.

**Copy verbatim** (blocks.ts:1-40) — the `"use server"` directive, the SECURITY-CONTRACT header block, the
`AvailabilityResult`-style union, and `requireUserId`:
```typescript
"use server";
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}
```

**Mutation body pattern** (blocks.ts `addBlock`, 81-142): (1) `requireUserId()` → early return (D-41 sign-in
gate); (2) capability check — load the user's `canBook` (and re-derive `deriveBookable` for the listing
server-side, RESEARCH Security V4 — the route group is NOT the gate); (3) `bookingCreateSchema.safeParse` →
`fieldErrors` on failure (blocks.ts:95-102); (4) call `createPendingHold(db, …)` (the real tx); (5)
`revalidatePath` the listing + search (blocks.ts:139-140); (6) `redirect(`/listings/${id}/book?hold=${holdId}`)`.

**`placeHold` is a POST server action, NOT a GET side-effect** (RESEARCH Pattern 5 / Pitfall 2 — a GET creates a
duplicate hold on every prefetch/refresh/Back). The listing "Book this space" control submits to it.

**`confirmBooking`** re-checks `expires_at > now() AND status='pending'` server-side (never trust the client
countdown — RESEARCH Anti-Pattern), `UPDATE pending → confirmed`, then `redirect(`/bookings/${id}`)`. Map
failures via `mapBookingError` (units.ts:106-111) → the calm "just taken/expired" copy (UI-SPEC §Error states —
never red).

**Own-hold idempotency** is inside `createPendingHold` (RESEARCH Pattern 6); the action just threads the optional
client `idempotencyKey` from `bookingCreateSchema`.

---

### `src/app/actions/search.ts` (CREATE, optional) — server-action, read-only query

**Analog:** `src/app/actions/availability.ts` — a public, read-only action with NO session gate (search of
bookable listings is public), that runtime-validates its untrusted arg and delegates to the lib.
```typescript
// availability.ts:44-59 — the exact "validate untrusted arg → delegate to the read model" shape:
export async function getDayAvailability(listingId: string, dayLocal: unknown): Promise<DayAvailability> {
  const parsed = dayLocalSchema.safeParse(dayLocal);
  if (!parsed.success) return EMPTY_AVAILABILITY;
  // …re-enforce the public gate…
  return getAvailability(db, listingId, parsed.data);
}
```
→ `searchListings(params: unknown)`: `searchParamsSchema.safeParse` → delegate to `lib/search/query.ts`.
**Optional** — RSC `page.tsx` reading `searchParams` directly is sufficient (RESEARCH structure notes it
`(optional) for client-side refetch`). Prefer RSC + `revalidatePath` over adding TanStack (RESEARCH: defer).

---

### `src/app/page.tsx` (REPLACE scaffold) — route (RSC), search home (D-29)

**Analog:** `src/app/listings/[id]/page.tsx` — the public RSC pattern (outside `(app)/(host)` gates, anyone can
view). The current `page.tsx` is the Next.js scaffold (page.tsx:1-65) and is **fully replaced** (D-29).

**Reuse from `listings/[id]/page.tsx`:**
- **Async `searchParams`** (mirror `params` await, page.tsx:95): `export default async function Home({ searchParams }:
  { searchParams: Promise<{...}> })` → `const sp = await searchParams` → `searchParamsSchema.safeParse(sp)`.
- **Server-side data fetch + `Promise.all`** (page.tsx:99-129) → call `lib/search/query.ts`.
- **`deriveBookable` inclusion** is enforced in the search SQL (D-16), not per-card.
- **`formatMoney(cents, DISPLAY_CURRENCY)`** for card prices (page.tsx:161-164 shows the exact call; import the
  promoted `DISPLAY_CURRENCY`).
- Compose `SearchBar` + `SearchResults`. This RSC is the Stage-1/Stage-2 executor (RESEARCH Responsibility Map).

---

### `src/app/listings/[id]/book/page.tsx` (CREATE) — route (RSC), reserve page

**Analog:** `listings/[id]/page.tsx` (public RSC, async `params`, join fetch) + `edit/page.tsx` owner-gate
skeleton (session → load own row → `notFound()` if not owner — 03-PATTERNS.md:257-261 documents that skeleton).

- Reads `?hold=<id>` (created by the `placeHold` action) and loads the booking **owner-gated**
  (`booking.bookerId === session.userId` else 404 — RESEARCH Security V4/IDOR, D-43). The page only *reads*; it
  never creates the hold (Pitfall 2).
- Renders the listing summary (reuse the `publicListing` projection + `SPACE_TYPE_LABELS` as page.tsx:132-146),
  the selected window (venue-tz via `format(..., { in: tz(timezone) })`, page.tsx:170-178), `PriceBreakdown`
  (frozen `quotedTotalCents`), `HoldCountdown(expiresAt)`, and the `Confirm booking` action.
- Venue-tz note reuses `gmtLabelFor`/`cityLabelFor` (page.tsx:64-84) — every time names the tz (SC#2).

---

### `src/app/bookings/[id]/page.tsx` (CREATE) — route (RSC), confirmation (D-43)

**Analog:** `listings/[id]/page.tsx` structure + `edit/page.tsx` owner-gate. New top-level route (outside gated
groups; the OWNER-GATE is the boundary, not the route group).

- Load the booking; **owner-gate** `booking.bookerId === session.userId` → else 404 (RESEARCH Security V4, D-43).
- Durable (survives refresh — pure RSC read). Render `Booking confirmed` (Display), the `--success` `Confirmed`
  badge + `CheckCircle2` (reuse the badge idiom from listing-card.tsx:49-64), `Booking reference FIT-XXXXXXXX`
  (`tabular-nums`), details (space name, date, venue-tz time range, total via `formatMoney(_, DISPLAY_CURRENCY)`).
- **No My Bookings list** (Phase 7). Optional single coral "Find another space".

---

### `src/components/search/search-result-card.tsx` (CREATE) — component, request-response

**Analog:** `src/components/listing/listing-card.tsx` — extend it (RESEARCH + UI-SPEC both say "extend").

**The presentational core already exists** (listing-card.tsx:153-183) — `Card` + `AspectRatio ratio={4/3}` +
cover `img` (with `alt`) + title + primary type + price. **Reuse the price-parts builder** (listing-card.tsx:131-137):
```typescript
const priceParts: string[] = [];
if (hourlyRateCents != null) priceParts.push(`${formatMoney(hourlyRateCents, currency)}/hr`);
if (dayRateCents   != null) priceParts.push(`${formatMoney(dayRateCents,   currency)}/day`);
// rendered as priceParts.join(" · ")  → "₱X/hr · ₱Y/day"  (listing-card.tsx:182)
```
**Changes for search (UI-SPEC §card layout):** omit the host-action props (`editHref`/`onUnlist`/`onDelete`) so
NO host controls render (listing-card.tsx:129,185-225 stay dormant — the card already guards `hasActions`); **omit
the status badge** (every search result is bookable by D-16/D-30); add **distance** (`2.3 km away`, muted, only
when an origin exists) and an optional **searched-window** line (`Available {t}`); the **whole card is a
`<Link href={/listings/[id]?date=&start=&end=}>`** (carry the searched window). **Normalize the title weight
500 → 600** — listing-card.tsx:172 uses `font-medium` (500), which is not a declared weight; search cards use
`font-semibold` (UI-SPEC §Typography). Use `DISPLAY_CURRENCY` ("php") not `listing.currency` ('usd').

---

### `src/components/search/search-bar.tsx` (CREATE) — component, event-driven (form → URL)

**Analog:** `address-autocomplete.tsx` (the location field is a direct reuse) + `wizard.tsx` (RHF form wiring).

- **Reuse `AddressAutocomplete` verbatim for the location field** — it already lifts `{lat,lng}` via
  `onResolved` (address-autocomplete.tsx:89-97,152-163) and degrades gracefully with no key. Optional
  `Use my location` (`navigator.geolocation` → same `{lat,lng}`, D-33, may be a fast-follow).
- **Debounced-fetch + abort pattern** (address-autocomplete.tsx:107-141) is the reference if any field needs
  live suggestions.
- RHF + `zodResolver(searchParamsSchema)` (mirror wizard.tsx); on submit, **serialize params to the URL**
  (`?category&date&start&end&priceMax&radius&sort&page` + `lat&lng`) so search is shareable/SEO + Back works (D-32).
  Compose `input-group`/`command`/`popover`/`calendar`/`select`/`toggle-group` (all installed — UI-SPEC Inventory).
- Single coral `Search` button (the one primary per screen). All fields ≥44px hit area.

---

### `src/components/search/search-results.tsx` (CREATE) — component, request-response

**Analog:** the host `(host)/host/listings/page.tsx` card grid (the existing `ListingCard` grid consumer) +
`SearchResultCard`.

- Header `N spaces near {area}` / `Browse spaces in {City}` (default, D-30) + a compact `Select` sort
  (`Nearest first` default / `Price: low to high`; "Nearest" disabled with a hint when no origin — UI-SPEC).
- Grid 1/2/3 cols, gutter 16/24px; `Load more` (neutral `secondary`, `Loading…`, hidden when exhausted, D-32) —
  drive `hasMore` off the `LIMIT pageSize+1` probe (Pitfall 8).
- **Loading = `Skeleton` cards** (the exact idiom is in availability-calendar.tsx:178-183: `Array.from({length:8})
  .map(... <Skeleton .../>)`). **Zero-result / cold-start empty states** = the dashed empty-state block
  (availability-calendar.tsx:184-204) with the escape-hatch buttons + copy locked in UI-SPEC §Empty states
  (`Broaden radius` / `Clear filters` / `Show nearby spaces`).

---

### `src/components/booking/price-breakdown.tsx` (CREATE) — component, transform (display)

**Analog:** `RailSelectionSummary` (availability-calendar.tsx:233-268) — the PriceBreakdown *formalizes* this
display-only estimate into the committed, server-quoted breakdown.

**The summary's render is the template** (availability-calendar.tsx:253-266) — `tabular-nums`, `formatMoney`,
muted labels:
```typescript
{cents != null && (
  <p className="pt-0.5">
    <span className="text-muted-foreground">Est. </span>
    <span className="font-semibold tabular-nums">{formatMoney(cents, currency)}</span>
  </p>
)}
```
**Changes (UI-SPEC §Price breakdown contract):** render line-items in a **fee-extensible list** — `{₱rate}/hr ×
{N} hours = {subtotal}` (or `{₱rate}/day × 1 day`), a **reserved empty slot** for Phase-5 fee/commission rows
(renders nothing now, but leaves room so nothing shifts later — D-46), a `separator`, then `Total` (Heading-600,
`tabular-nums`). Consume the **server-frozen** `quotedTotalCents` + `currency` (never a client recompute).
Sub-line: `Final price. No booking or service fees in this step.` Use `DISPLAY_CURRENCY` from the promoted const.

---

### `src/components/booking/hold-countdown.tsx` + `hold-expired-state.tsx` + `reserve-actions.tsx` (CREATE, client)

**HoldCountdown** — no exact analog (a client `setInterval` timer is net-new); structural analog = the
`"use client"` state shell in availability-calendar.tsx:78-139 (`React.useState` + effect). Counts the 15-min TTL
(D-47) from `expiresAt`; neutral `Clock` + `tabular-nums`; optional `--destructive` numerals in the final 60s;
`role="timer"` `aria-live="off"` (announce only the final-minute threshold — UI-SPEC §a11y). On 0, flips the page
into the expiry state (does not silently vanish).

**HoldExpiredState** — analog = the dashed empty-state block (availability-calendar.tsx:184-204): calm `card` +
`TimerOff` + `Back to availability` (coral) / `Search other spaces`. **Never red** (occupancy/expiry is not an
error — UI-SPEC §Color).

**Reserve confirm control** — analog = `ConfirmDialog`'s button-disable idiom (listing-card.tsx:96-107): a
`pending` state disables the button and swaps the label to `Confirming…` on click (D-42 double-click no-op); the
DB-level idempotency backstop is in `createPendingHold`. Wraps the `confirmBooking` server action.

---

### `src/app/listings/[id]/page.tsx` (MODIFY) — route (RSC), the Book-CTA seam

**Analog: itself.** The coral placeholder CTA is at **page.tsx:298-305** (the exact seam CONTEXT names):
```typescript
{bookable ? (
  // Bookable → coral placeholder (wired Phase 4).
  <Button size="lg" className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
    Book this space
  </Button>
) : (
  // Published but not payable → disabled neutral affordance + tooltip (page.tsx:306-323, KEEP AS-IS)
```
**Change:** wrap the bookable branch's `<Button>` in a `<form action={placeHold}>` (a server-action POST that
creates the hold on entering checkout, then `redirect`s to the reserve page — D-39/RESEARCH Pattern 5), passing
the current selection. The selection is available via `RailSelectionSummary`/`BookingSelectionProvider` context
(page.tsx:185,291-296) — thread the `SlotSelectionValue` (slot-selection.ts:35) into a hidden field or a bound
action arg. The **not-bookable branch stays exactly as-is** (page.tsx:306-323). `DISPLAY_CURRENCY` at page.tsx:88
becomes an import from `money.ts`.

---

## Shared Patterns

### Session + capability gate (NOT ownership) for booking mutations
**Source:** `src/app/actions/blocks.ts:37-40` (`requireUserId`) + `deriveBookable` (bookability.ts:16-21) +
`listings/[id]/page.tsx:113-119` (how `deriveBookable` is called with `{emailVerified, payoutsEnabled}`).
**Apply to:** `actions/booking.ts` (`placeHold`/`confirmBooking`). Differs from Phase-3 host actions: the guard is
**`canBook`** (D-41), not host-ownership — but the confirmation/reserve *reads* use the same **owner-gate**
(`bookerId === session.userId`) that host actions use for `hostId` (RESEARCH Security V4 — the route group is
never the gate).
```typescript
const session = await auth.api.getSession({ headers: await headers() });   // blocks.ts:38
if (!session?.user?.id) return { ok: false, error: "…sign in…" };          // D-41
```

### Server re-derives price + window (never trust the client)
**Source:** `booking.ts` header (validation/booking.ts:6-9) + `RailSelectionSummary` (availability-calendar.tsx:15-17
"display-only"; :246-251 the formula) + CLAUDE.md "never trust the client for price/time".
**Apply to:** `lib/booking/pricing.ts`, `createPendingHold`, `confirmBooking`. Re-derive `hours`/`fullDay` and
`quotedTotalCents` from the read model; freeze the snapshot (D-49); reject windows not on-the-hour / outside
operating hours / not free. The client `RailSelectionSummary` figure is a display cue only.

### `timestamptz` UTC + `'[)'` half-open ranges, identical everywhere
**Source:** schema.ts header (12-14) — every `timestamp(..., { withTimezone: true })`; the `'[)'` bound appears
IDENTICALLY in `0005` (EXCLUDE, 0005:13), the read-model overlap (read-model.ts:98,106), and the units probe
(units.ts:72). **Bind ISO strings, not `Date`, into raw `sql` ranges** (units.ts:63-64; Pitfall 3 — a `Date`
throws `ERR_INVALID_ARG_TYPE`); keep `Date` only for the Drizzle timestamptz insert.
**Apply to:** the sweep `UPDATE`, the own-hold pre-check, the search Stage-1, the new columns.

### Venue-tz at the edge via `@date-fns/tz` (SC#2)
**Source:** `slots.ts` (`slotsForWindow`/`venueDayOfWeek`, 27-56) + the `TZDate.toISOString()` offset-local
pitfall (slots.ts:39-45 — normalize via `new Date(tzDate.getTime()).toISOString()`) + `venueLocalToUtc`
(blocks.ts:73-75) + display `format(..., { in: tz(timezone) })` (listings/[id]/page.tsx:175-178,
availability-calendar.tsx:242-249).
**Apply to:** the search availability filter (interpret the picked date/time in EACH venue's tz), the reserve
window display, the confirmation, `lib/booking/pricing.ts` hours math. Every displayed time names the tz
(reuse `gmtLabelFor`/`cityLabelFor`, page.tsx:64-84).

### The DB is the sole double-booking authority (no app-level query-then-insert)
**Source:** `units.ts` header (1-11) + `0005` EXCLUDE + `exclusion-race.test.ts` (the proof). The find-free probe
is ADVISORY only; the `EXCLUDE` constraint rejects the loser.
**Apply to:** `createPendingHold` (the sweep + SAVEPOINT loop still rely on the constraint, not a guard),
`lib/search/query.ts` (never a conflict check). `23P01`/`40P01` → "just taken"; `23505`/own-hold → return the
SAME booking (Pitfall 6 — never conflate them).

### `revalidatePath` after a mutation
**Source:** blocks.ts:139-140,166-167 (`revalidatePath(`/listings/${listingId}`)` + the host page).
**Apply to:** `placeHold`/`confirmBooking` — revalidate the listing page + `/` (search) so the pending hold
immediately reflects in the calendar + search (the read model + search already treat `pending` as occupying).

### `isPgError` SQLSTATE detection
**Source:** `src/lib/pg.ts:4-6` (`isPgError(e, code)` — postgres.js surfaces SQLSTATE on `err.code`; never
string-match) + `CONFLICT_CODES`/`isConflict` (exclusion-race.test.ts:44-45).
**Apply to:** `createPendingHold` (`23P01`/`40P01`/`23505` branching) and every booking test.

### Shared vocab source for the activity filter
**Source:** `src/lib/listing-vocab.ts` — `spaceTypeValues`/`activityTagValues` (35,67) for `z.enum`,
`SPACE_TYPE_LABELS`/`ACTIVITY_TAG_LABELS` (40,71) for display. Header (1-4) explicitly names "the Phase-4 search
filters" as a consumer.
**Apply to:** `searchParamsSchema`, the `SearchBar` activity control, the Stage-1 SQL `primary_space_type`/tag match.

---

## Test & Seed Patterns

### `scripts/seed.ts` (D-38) — no existing seed script; the E2E inline seed is the analog
**Analog:** `e2e/availability.spec.ts` seed helpers (66-131) — raw postgres.js INSERTs. There is **no**
`scripts/seed.ts` today (only `scripts/patch-kysely-adapter.mjs`), and no SQL seed — seeding lives inline in the
E2E specs. Copy those helpers into a standalone script:
- `baseUrl()` fallback (`postgresql://fitout:fitout@localhost:5432/fitout`, db.ts:39-41 / availability.spec.ts:32-33).
- `seedUser(id, emailVerified)` (availability.spec.ts:66-74), a `host_payout` row with
  `payouts_enabled=true` + `activation_status='activated'` so `deriveBookable` is true (availability.spec.ts:114-117),
  `seedListing(...)` with **`ST_SetSRID(ST_MakePoint(lng, lat), 4326)`** (availability.spec.ts:87 — axis order
  x=lng) + a 7-day `operating_hours` loop (availability.spec.ts:100-105).
- Vary space types, hours, and **known coordinates/distances** across the launch city so search, each filter,
  the radius test, and a **zero-result path** are exercised (D-38; the search/radius tests depend on this).

### `tests/booking/pending-hold.test.ts` — concurrency + idempotency + savepoint
**Analog:** `tests/availability/exclusion-race.test.ts` (the whole file, esp. 82-108).
```typescript
const [a, b] = makeRacingClients(testDb.schema, 2);           // db.ts:59-67 — INDEPENDENT connections
const results = await Promise.allSettled([placeHoldVia(a, window), placeHoldVia(b, window)]);
expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);   // exactly one wins
expect(isConflict(rejected!.reason)).toBe(true);              // loser: 23P01 or 40P01
```
Add the D-42 case: two submits with the SAME idempotency key → **exactly ONE** booking, returns the SAME id (never
"just taken"). Add the savepoint case: a `23P01` in a savepoint retries the next unit within one outer tx (no
`25P02`). A `max:1` client serializes and proves nothing (db.ts:52-57 / exclusion-race.test.ts:5-7) — use
`makeRacingClients`.

### `tests/booking/state-machine.test.ts` + `tests/search/bookable-gate.test.ts` — real actions via module-mock
**Analog:** `tests/listing/status-gate.test.ts` (the exact `vi.doMock` harness, 22-41):
```typescript
vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: sessionHeaders.cookie }) }));
vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
vi.doMock("@/lib/db",  () => ({ db: testDb.db }));
vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
vi.resetModules();
({ placeHold, confirmBooking } = await import("@/app/actions/booking"));
```
`bookable-gate.test.ts` **mirrors `status-gate.test.ts`** (Pitfall 5 mandates it): seed each non-bookable reason
(draft / unverified email / payouts-off) and assert exclusion from search.

### `tests/search/{availability-filter,radius,filters}.test.ts` + `tests/booking/{hold-expiry,pricing}.test.ts`
**Analogs:** `tests/availability/read-model.test.ts` (integration, isolated schema — for the availability filter,
filters, hold-expiry lazy-read/sweep); `tests/listing/geo-roundtrip.test.ts` (PostGIS `ST_MakePoint` roundtrip —
for radius `::geography` within/beyond-N-km + distance value); `tests/listing/bookability.test.ts` (table-driven
pure unit test — for `pricing.ts` `hours×hourly | dayRate` + tampered-price-ignored). All use
`setupTestDb`/`teardownTestDb` (db.ts:87-123) in `beforeAll`/`afterAll`.

### `e2e/search-and-book.spec.ts` — full-flow E2E
**Analog:** `e2e/availability.spec.ts` (+ `e2e/public-listing.spec.ts`) — direct dev-DB seed in `beforeAll` (no
login), unique `randomUUID()` ids, cascade-delete in `afterAll` (availability.spec.ts:134-141 — delete bookings
first: `booker_id` is `ON DELETE RESTRICT`), `page.goto` + `getByRole` assertions, `selectTargetDay` venue-tz
navigation (availability.spec.ts:144-157). Flow: search → filter → card → listing → Book → reserve (countdown) →
Confirm → confirmation; + the expiry UX. Reuse the UAT seed host (`host@fitout.test`, per MEMORY) + the D-38 set.

---

## No Analog Found

Files whose *core logic* is net-new (draw from RESEARCH, not an existing repo file). Each still has a
**structural** analog for its shape — only the highlighted logic is new.

| File | Role | Data Flow | Net-new part (RESEARCH source) | Structural analog |
|------|------|-----------|-------------------------------|-------------------|
| `src/lib/availability/units.ts` (WR-03 tx) | service | transaction | Outer-retry(`40P01`) + per-unit SAVEPOINT(`23P01`) + in-tx sweep + own-hold pre-check (RESEARCH Pattern 2, :273-319) | itself — the current `createBooking` loop + its AUTO-COMMIT CONTRACT header (units.ts:41-98) |
| `src/lib/booking/reference.ts` | utility | transform | `FIT-` + 8 Crockford base32 crypto-random reference (UI-SPEC §Discretionary; A6) | `src/lib/pg.ts` (tiny pure helper) |
| `src/components/booking/hold-countdown.tsx` | component | event-driven (timer) | A client `setInterval` 15-min countdown from `expiresAt`, flips to expiry at 0 (UI-SPEC §HoldCountdown) | availability-calendar.tsx client-state shell (78-139) |

> The **two-stage search** (`lib/search/query.ts`) is *composed* from proven pieces (read-model.ts raw `sql` +
> bookability.ts predicate + PostGIS), so it is classified role-match, not no-analog — but its Stage-1 SQL body
> and the `::geography` cast are the phase's highest-risk executor traps (Pitfall 1). Copy RESEARCH Pattern 1
> (04-RESEARCH.md:240-263) exactly.

---

## Metadata

**Analog search scope:** `src/lib/availability/` (units, read-model, slots), `src/lib/validation/`, `src/lib/`
(bookability, money, pg, listing-vocab), `src/lib/db/` (schema, index), `drizzle/` (0005), `src/app/actions/`
(blocks, availability), `src/app/` (page scaffold, listings/[id]/page), `src/components/` (listing/listing-card,
listing/address-autocomplete, availability/availability-calendar, availability/slot-selection), `tests/`
(availability/exclusion-race, listing/status-gate, helpers/db), `e2e/availability.spec.ts`, `.planning/phases/03…/03-PATTERNS.md`.

**Files read in full (analogs):** units.ts, read-model.ts, slots.ts, schema.ts, 0005_booking_exclusion.sql,
validation/booking.ts, validation/listing.ts, bookability.ts, money.ts, listing-vocab.ts, pg.ts, db/index.ts,
actions/blocks.ts, actions/availability.ts, listings/[id]/page.tsx, components/listing/listing-card.tsx,
components/listing/address-autocomplete.tsx, app/page.tsx, components/availability/availability-calendar.tsx,
components/availability/slot-selection.ts, tests/availability/exclusion-race.test.ts, tests/helpers/db.ts,
tests/listing/status-gate.test.ts (23 analog files read in full).

**Key facts for the planner:**
- No new runtime dependencies this phase (RESEARCH §Standard Stack). All shadcn primitives already installed.
- No existing `booking` rows in dev/UAT → the 4 new nullable columns are backfill-safe (A7).
- No existing `scripts/seed.ts` — the E2E inline seed helpers are the only seed analog.
- The three MODIFY-in-place files (`units.ts`, `read-model.ts`, `schema.ts`) are their own best analogs; the
  net-new logic for each is fully specified in RESEARCH (Patterns 2, 3, and the schema shapes).

**Pattern extraction date:** 2026-07-14
