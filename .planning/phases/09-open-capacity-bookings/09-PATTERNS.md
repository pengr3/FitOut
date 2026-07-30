# Phase 9: Open-Capacity Bookings - Pattern Map

**Mapped:** 2026-07-30
**Files analyzed:** 39 (13 backend/schema, 4 migrations, 15 UI, 6 test, 1 config)
**Analogs found:** 36 / 39 (33 exact, 3 role-match, 3 no-analog)

> Every excerpt below is copied verbatim from the live tree at the stated line numbers. Where the
> planner sees "copy from `file:NN-MM`", that range is the pattern to fork — not a paraphrase.

---

## Path corrections (RESEARCH.md names that do not exist on disk)

| RESEARCH.md / UI-SPEC name | Actual path |
|---|---|
| `tests/validation/listing.test.ts` | **`tests/validation/listing-schema.test.ts`** |
| `wizard.tsx` | **`src/app/(host)/host/listings/[id]/edit/wizard.tsx`** (only copy; new + edit both use it) |
| "Playwright spec" | **`e2e/`** at repo root (`playwright.config.ts` at root). Closest analogs: `e2e/availability.spec.ts`, `e2e/search-and-book.spec.ts`, `e2e/mode-switch.spec.ts` |
| `mapBookingError` "units.ts:600" | **`src/lib/availability/units.ts:600-605`** ✔ (confirmed) |
| `pax-stepper.tsx:20-21` | actual courtesy-bound note is **`pax-stepper.tsx:20-22`**; the clamp is **`:59`** |
| `availability-calendar.tsx:236-242` (serviceFeeBps trap) | ✔ confirmed at **`:235-242`** |
| `availability-calendar.tsx:168-172` (coral day cell) | ✔ confirmed at **`:167-172`** |
| `slot-picker.tsx:245-247` (brand-tint recipe) | ✔ confirmed at **`:241-253`** |
| `wizard.tsx:846-848` / `:871-881` | ✔ confirmed (`:844-857` card, `:870-881` D-77 rationale) |
| `wizard.tsx:342-364` hardcoded step indices | ✔ confirmed at **`:342-366`** |

---

## File Classification

### Backend — schema & migrations

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `src/lib/db/schema.ts` | model | DDL | itself — `occupancyMode` `:164`, `listing` `:189-207`, `booking` `:637-756` | exact |
| `drizzle/0020_open_capacity_enum.sql` (NEW) | migration | DDL | `drizzle/0010_booking_request_states.sql`, `drizzle/0018_group_notification_types.sql` | exact |
| `drizzle/0021_open_capacity_columns.sql` (NEW) | migration | DDL | `drizzle/0016_booking_full_day.sql`, `drizzle/0017_group_bookings.sql` | exact |
| `drizzle/0022_booking_exclusion_v3.sql` (NEW) | migration | DDL | `drizzle/0012_booking_exclusion_v2.sql` | exact |

### Backend — the correctness core

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `src/lib/availability/units.ts` → NEW `createOpenCapacityHold` | service | transactional claim (write-under-lock) | `createPendingHold` (`units.ts:304-592`) **+** `claimSeat` (`src/lib/group/seat-claim.ts:36-101`) | exact (two-source) |
| `src/lib/availability/units.ts` → `mapBookingError` branch | utility | transform | `units.ts:600-605` | exact |
| `src/lib/booking/pricing.ts` → NEW `quoteOpenCapacity` | utility (pure) | transform | `quoteWindow` / `paxSurcharge` (`pricing.ts:70-135`) | exact |
| `src/lib/availability/read-model.ts` → open fork | service | read model (query) | `getAvailability` (`read-model.ts:90-212`) | exact |
| `src/lib/search/query.ts` → Stage-2 open branch | service | query | `searchListings` Stage-2 (`query.ts:192-220`), `toRow` (`:105-120`) | exact |
| `src/lib/booking/all-in-rate.ts` → `/person` branch | utility (pure) | transform | `allInRateParts` (`all-in-rate.ts:29-49`) | exact |
| `src/lib/validation/listing.ts` → mode fork | validation | request-response | `publishSchema` + `superRefine` (`listing.ts:76-134`) | exact |
| `src/lib/validation/booking.ts` → open hold input | validation | request-response | `bookingCreateSchema` (`:92-109`), `parsePickedDate` (`query.ts:60-74`) | exact |
| `src/lib/availability/open-capacity-config.ts` (NEW) or extend `src/lib/payments/config.ts` | config | — | `src/lib/payments/config.ts:57` (`SERVICE_FEE_BPS`), `units.ts:142` (`HOLD_TTL_MINUTES`) | exact |
| `src/app/actions/booking.ts` → `placeHold` mode fork | controller (server action) | request-response | `placeHold` bookingMode fork (`booking.ts:168-304`) | exact |
| `src/app/actions/booking.ts` → `updateDeclaredPax` open branch (Q2) | controller | request-response | `updateDeclaredPax` (`booking.ts:306-338+`) | exact |
| `src/app/actions/cancel-booking.ts` → skip auto-block | controller | request-response | Consequence 3 (`cancel-booking.ts:1018-1041`) | exact |
| `src/app/actions/availability.ts` → open payload | controller | request-response | `getDayAvailability` (whole file, 62 lines) | exact |

### Frontend

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `wizard.tsx` — new `occupancy` step | component (client form) | request-response | booking-mode step `wizard.tsx:819-868` | exact |
| `wizard.tsx` — `STEPS` + checklist migration | component | — | `wizard.tsx:118-134` + `:340-367` | exact |
| `wizard.tsx` — mode-forked pricing step | component | — | rate-field pattern `wizard.tsx:658-693` | exact |
| `ModeLockNotice` (NEW) | component | — | `src/components/host/cancellation-fee-notice.tsx`; alert copy shape from `host-cancel-dialog.tsx:173-200` | role-match |
| `DatePassPicker` (NEW, `src/components/availability/`) | component (client) | request-response | `AvailabilityCalendar` (`availability-calendar.tsx:80-224`) | exact |
| `availability-calendar.tsx` — fork + open rail branch | component | — | itself `:80-224`, `:246-292` | exact |
| `SpotsLeftChip` (NEW) | component | — | `slot-picker.tsx:239-253` (brand-tint) + `headcount-meter.tsx` (server-decided `full`) + `page.tsx:219` (`Badge variant="secondary"`) | role-match |
| `DropInBadge` (NEW) | component | — | `src/app/listings/[id]/page.tsx:217-221` | exact |
| `pax-stepper.tsx` — split into control + 2 bindings | component (client) | request-response | `PaxStepper` (`pax-stepper.tsx:43-128`) | exact |
| `PartialGrantNotice` (NEW) | component | — | `src/components/booking/hold-expired-state.tsx` / `cancellation-fee-notice.tsx` (neutral alert shells) | role-match |
| `book-cta.tsx` — open branch + `sold-out` | component (client) | request-response | itself `:48-90` (submit / sign-in resume / `taken`) | exact |
| `src/app/listings/[id]/page.tsx` — open rail | page (RSC) | request-response | itself `:252-289` | exact |
| `src/app/listings/[id]/book/page.tsx` — drop-in summary | page (RSC) | request-response | itself `:280-315` | exact |
| `price-breakdown.tsx` — optional `perHeadPriceCents`/`passes` | component (RSC) | — | itself `:56-67` + `:109-127` (D-108 optional-props precedent) | exact |
| `search-result-card.tsx` — badge / `/person` / no time range | component | — | itself `:47-64`, `:96-135` | exact |
| `listing-card.tsx` (host) — `/person` line | component | — | itself `:133-138`, `:184` | exact |
| `when-label.ts` — REQUIRED `openCapacity` | utility (pure) | transform | itself `:54-59` (`fullDay` required-field precedent), `:81-93` | exact |
| `cancellation-policy-disclosure.tsx` — drop-in copy | component | — | itself `:71-140` | exact |
| `host-cancel-dialog.tsx` — 2 consequences | component | — | itself `:173-200` | exact |
| `src/app/(host)/host/listings/[id]/availability/page.tsx` — one note | page (RSC) | — | itself | exact |

### Tests

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `tests/availability/open-capacity-race.test.ts` (NEW) | test (integration/race) | concurrency | `tests/group/seat-claim-race.test.ts` (two-layer) + `tests/availability/exclusion-race.test.ts` | exact |
| `tests/availability/open-capacity-exclude.test.ts` (NEW) | test (integration) | DDL constraint | `tests/availability/exclusion-race.test.ts:110-138` | exact |
| `tests/availability/open-capacity-readmodel.test.ts` (NEW) | test (integration) | read model | `tests/availability/read-model.test.ts` | exact |
| `tests/validation/listing-schema.test.ts` (EXTEND) | test (unit) | schema | itself `:1-27` | exact |
| `tests/paymongo/webhook-payment-paid.test.ts` (EXTEND) | test (integration) | webhook | itself | exact |
| `e2e/open-capacity.spec.ts` (NEW) | test (e2e) | browser | `e2e/search-and-book.spec.ts`, `e2e/availability.spec.ts` | exact |

---

## Pattern Assignments

### 1. `src/lib/availability/units.ts` → NEW `createOpenCapacityHold` (service, transactional claim)

**Primary analog:** `createPendingHold`, `src/lib/availability/units.ts:304-592`
**Secondary analog (the lock/count/write critical section):** `claimSeat`, `src/lib/group/seat-claim.ts:36-101`

This is the phase's one genuinely new correctness surface. It is a **sibling in the same file**, and it must inherit six idioms verbatim from `createPendingHold`.

**a) Outer 40P01 retry + `mapBookingError` envelope** (`units.ts:365-367` and `:586-591`) — copy this exact shape:
```typescript
  for (let txAttempt = 0; ; txAttempt++) {
    try {
      return await db.transaction(async (tx): Promise<HoldResult> => {
        ...
      });
    } catch (e) {
      // 40P01 aborts the whole tx and postgres.js does not auto-retry — re-run the whole booking tx.
      if (isPgError(e, "40P01") && txAttempt < MAX_TX_RETRIES - 1) continue;
      return mapBookingError(e); // NoUnitAvailableError | 23P01 | 40P01 → "just taken"; else re-throw
    }
  }
```
`MAX_TX_RETRIES = 3` already exists at `units.ts:146`. `seat-claim.ts:27-29,96-99` shows the same idiom re-stated for a lock-based claim, including the comment justifying keeping it even though contention is on one key.

**b) Server-authoritative listing read INSIDE the tx** (`units.ts:381-401`) — the cap (`maxOccupancy`) and `perHeadPriceCents` MUST be read here, in the claim transaction, for the same reason `cancellationPolicy` is:
```typescript
        const listingRows = await tx
          .select({
            unitCount: listing.unitCount,
            hourlyRateCents: listing.hourlyRateCents,
            dayRateCents: listing.dayRateCents,
            cancellationPolicy: listing.cancellationPolicy,
            included: listing.included,
            extraHeadFee: listing.extraHeadFee,
            maxOccupancy: listing.maxOccupancy,
            leadOk: sql<boolean>`(${startIso}::timestamptz >= now() + ${leadIntervalSql})`,
          })
          .from(listing)
          .where(eq(listing.id, input.listingId));
        if (listingRows.length === 0) throw new NoUnitAvailableError(); // unknown listing → nothing to hold
```

**c) Own-hold idempotency pre-check (D-42)** — `findOwnActiveHold`, `units.ts:234-275`. The open-capacity variant must key on `(bookerId, listingId, starts_at = dayOpen)` instead of `(startIso, endIso)`, and MUST return the same frozen-triple shape:
```typescript
  const rows = (await tx.execute(sql`
    SELECT id, unit, expires_at, space_price_cents, service_fee_cents, quoted_total_cents FROM booking
    WHERE listing_id = ${args.listingId}
      AND (status = 'confirmed' OR (status IN ('pending','requested','approved') AND expires_at > now()))
      AND (
        ${args.idempotencyKey != null ? sql`idempotency_key = ${args.idempotencyKey}` : sql`false`}
        OR (booker_id = ${args.bookerId} AND starts_at = ${args.startIso} AND ends_at = ${args.endIso})
      )
    ORDER BY created_at ASC
    LIMIT 1
  `)) as unknown as { ... }[];
```
⚠️ **Open-capacity is instant-only (OC-10)**, so the open occupying set is `{confirmed, pending-unexpired}` — drop `requested`/`approved` from the *open* predicate, but the exclusive path's predicate must stay byte-unchanged.

**d) In-tx lazy-expiry sweep** (`units.ts:424-430`) — the open variant scopes to `open_capacity = true AND starts_at = <dayOpen>` instead of a tstzrange overlap. Note the enum cast on the CASE, which the open sweep can drop (open lapsed holds are always `cancelled`):
```typescript
        await tx.execute(sql`
          UPDATE booking
          SET status = (CASE WHEN status = 'requested' THEN 'declined' ELSE 'cancelled' END)::booking_status,
              expires_at = NULL
          WHERE listing_id = ${input.listingId}
            AND status IN ('pending','requested','approved') AND expires_at <= now()
            AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${startIso}, ${endIso}, '[)')`);
```

**e) The lock → count → conditional-write critical section** — `seat-claim.ts:48-95` is the closest shipped analog. Substitute `pg_advisory_xact_lock(...)` for the `FOR UPDATE`, and `SUM(declared_pax)` for `count(*)`:
```typescript
      return await db.transaction(async (tx): Promise<ClaimResult> => {
        // (1) LOCK the single booking_group row — the atomic no-overflow authority (D-112). A missing or
        //     voided group matches nothing → fail closed with a courtesy "full", never an over-cap.
        const [g] = (await tx.execute(sql`
          SELECT capacity_snapshot FROM booking_group
          WHERE id = ${args.groupId} AND voided_at IS NULL
          FOR UPDATE
        `)) as unknown as { capacity_snapshot: number }[];
        if (!g) return { ok: false, reason: "full" };
        ...
        // (3) Count confirmed 'yes' UNDER the lock — drift-free (D-112 recommended layout, not a counter).
        const [{ yes }] = (await tx.execute(sql`
          SELECT count(*)::int AS yes FROM rsvp WHERE group_id = ${args.groupId} AND status = 'yes'
        `)) as unknown as { yes: number }[];
        if (args.answer === "yes" && !alreadyYes && yes >= g.capacity_snapshot) {
          return { ok: false, reason: "full" };
        }
```
Note the raw-`execute` + `as unknown as {…}[]` row-typing idiom — that is the project convention for hand-written SQL and both files use it.

**f) DB-computed `expires_at` (D-94) and the frozen triple** (`units.ts:335-350` and `:509-562`):
```typescript
  const expiresAtSql =
      sql`LEAST(
          now() + make_interval(mins => ${ttlMinutes}::int),
          ${startIso}::timestamptz
        )`;
```
```typescript
              const inserted = await sp
                .insert(booking)
                .values({
                  id, listingId, bookerId, unit, startsAt, endsAt,
                  status: holdStatus,
                  bookingMode,
                  fullDay,
                  expiresAt: expiresAtSql, // D-94: LEAST(now() + window, starts_at), computed by Postgres
                  spacePriceCents: quote.totalCents,
                  serviceFeeCents: fee.serviceFeeCents,
                  quotedTotalCents: fee.allInCents,
                  currency: quote.currency,
                  cancellationPolicy: listingCancellationPolicy,
                  declaredPax: declaredPaxToPersist,
                  idempotencyKey,
                })
                .returning({
                  expiresAt: booking.expiresAt,
                  spacePriceCents: booking.spacePriceCents,
                  serviceFeeCents: booking.serviceFeeCents,
                  quotedTotalCents: booking.quotedTotalCents,
                });
```
⚠️ **ZERO JS clock reads in this file** — `units.ts:19-23` states it explicitly and 07-05's acceptance criteria grep for it. `createOpenCapacityHold` must hold the same rule: `now()` is SQL only.

⚠️ For open-capacity, `declared_pax` is **ALWAYS** the granted head count (even 1) — that diverges from the D-108 rule at `units.ts:466-469` (`declaredPaxToPersist` is NULL when `extraHeadFee` is 0). Do **not** reuse that conditional on the open path; the read-model `SUM` depends on it being present on every open row.

**g) Error mapping** — `units.ts:600-605`, extend with the open branch:
```typescript
export function mapBookingError(e: unknown): { error: string } {
  if (e instanceof NoUnitAvailableError || isPgError(e, "23P01") || isPgError(e, "40P01")) {
    return { error: "That time was just taken. Pick another slot." };
  }
  throw e;
}
```
The sold-out copy `"Just sold out — pick another date."` (O3, exact string) is a *return value* from the claim, not a thrown error — so it does not have to route through `mapBookingError`; but if a `SoldOutError` class is introduced, mirror `NoUnitAvailableError` (`units.ts:44-49`).

---

### 2. `drizzle/0020` — ADD VALUE, isolated (migration, DDL)

**Analog:** `drizzle/0010_booking_request_states.sql` and `drizzle/0018_group_notification_types.sql` (verbatim, whole files).

```sql
-- Custom SQL migration (Phase 8, D-122, RESEARCH Pitfall 7 / 55P04) — add the three group-RSVP enum values
-- to the EXISTING notification_type. This file does NOTHING ELSE: an `ALTER TYPE ... ADD VALUE` and the
-- FIRST USE of the new value CANNOT share a transaction (Postgres 55P04 "unsafe use of new enum value"),
-- and drizzle-kit's migrator runs all pending migrations in ONE transaction. The values are therefore ONLY
-- added here; nothing in ANY migration ever USES them — the first use is a runtime INSERT from the notify
-- emitter (08-06), never a migration. IF NOT EXISTS + the unqualified type name keep the integration harness
-- (tests/helpers/db.ts) replaying this idempotently into every isolated schema (the type resolves via the
-- schema-first search_path). Postgres appends each value at the enum tail — matching the schema.ts order.
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'group_rsvp_received';--> statement-breakpoint
```
**Copy exactly:** `IF NOT EXISTS`, unqualified type name, `--> statement-breakpoint` separators, and the "this file does NOTHING ELSE" header. The `0018` precedent (nothing in *any* migration ever uses the value) is the closer analog than `0010` — because for Phase 9 the value is only ever written at runtime by the publish action.

---

### 3. `drizzle/0021` — backfill-free ADD COLUMN (migration, DDL)

**Analog:** `drizzle/0016_booking_full_day.sql` (one line, no header) and `drizzle/0017_group_bookings.sql` header (b).

```sql
ALTER TABLE "booking" ADD COLUMN "full_day" boolean;
```
```sql
-- (b) BACKFILL-FREE. Every column added is nullable or carries a DEFAULT: booking.declared_pax /
-- listing.included / listing.extra_head_fee are nullable; listing.occupancy_mode defaults 'exclusive' (the
-- only v1 value, D-109) so every existing listing backfills by construction.
--
-- Unqualified table/type names throughout (the schema-qualified `"public".` prefixes drizzle-kit emits were
-- stripped, mirroring drizzle/0013) so the integration harness (tests/helpers/db.ts) replays this
-- idempotently into every isolated schema — unqualified objects resolve via the schema-first search_path.
ALTER TABLE "listing" ADD COLUMN "occupancy_mode" "occupancy_mode" DEFAULT 'exclusive' NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "included" integer;--> statement-breakpoint
```
Phase-9 columns follow this exactly: `listing.per_head_price_cents integer` (nullable), `booking.open_capacity boolean DEFAULT false NOT NULL`.

⚠️ **`"public".` stripping is mandatory** — `tests/helpers/db.ts:99` rewrites `"public".` → the isolated schema, and `:107` sets `search_path` per statement. Unqualified names are what make the race test's isolated schema work.

---

### 4. `drizzle/0022` — narrow the EXCLUDE (migration, DDL)

**Analog:** `drizzle/0012_booking_exclusion_v2.sql` — copy its DROP+re-ADD shape *and* its complement-predicate rationale header verbatim:

```sql
-- Custom SQL migration (Phase 6, D-63, T-06-01) — WIDEN the double-booking keystone ... Postgres has no
-- `ALTER CONSTRAINT ... WHERE`, so the EXCLUDE is DROPped and re-ADDed. Mirrors 0005's GiST shape
-- EXACTLY (unqualified cols, half-open '[)' tstzrange); btree_gist is ALREADY installed by 0005 — do
-- NOT re-CREATE EXTENSION.
ALTER TABLE "booking" DROP CONSTRAINT "booking_no_overlap";--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist (
    "listing_id" WITH =,
    "unit" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" NOT IN ('cancelled', 'declined', 'completed'));
```
Phase 9 appends `AND "open_capacity" = false` to that WHERE. The 0012 header also states the load-bearing rule the planner must preserve: **"index predicates require IMMUTABLE expressions"** — a boolean literal is IMMUTABLE, an enum literal naming a value added in 0020 would raise 55P04. Do **not** re-run `CREATE EXTENSION btree_gist` (0005 owns it, `drizzle/0005:8`).

---

### 5. `src/lib/db/schema.ts` (model)

**Analog:** itself. Three edit sites, each with a shipped comment convention to extend.

**Enum** (`schema.ts:159-165`) — the existing comment already forecasts this change and must be rewritten, not just appended to:
```typescript
// Phase-8 group bookings (D-109/D-116). BRAND-NEW enums — exactly like cancellationPolicy above, a brand-new
// CREATE TYPE and its FIRST USE may share one migration; the 55P04 two-migration split (0010/0012) applies
// ONLY to ALTER TYPE ... ADD VALUE on an EXISTING type. occupancy_mode has EXACTLY ONE value in v1
// (D-109 — 'exclusive'); Phase 9 adds shared/capacity modes and v1 NEVER writes another value.
export const occupancyMode = pgEnum("occupancy_mode", ["exclusive"]);
```

**Listing columns** (`schema.ts:202-207`) — the backfill-free comment block to extend:
```typescript
    // Phase-8 group bookings (D-108/D-109). Backfill-free: occupancyMode carries a NOT NULL default so every
    // existing listing reads 'exclusive' (the only v1 value, D-109); included/extraHeadFee are nullable so a
    // flat-priced listing is byte-identical to today (the app coalesces extraHeadFee to 0 — a NULL fee = no surcharge).
    occupancyMode: occupancyMode("occupancy_mode").default("exclusive").notNull(), // D-109 v1 = exclusive only
    included: integer("included"), // D-108 base headcount included in the flat price (nullable)
    extraHeadFee: integer("extra_head_fee"), // D-108 per-extra-head surcharge in integer centavos (nullable → app-coalesced to 0)
```

**Booking column + the EXCLUDE note** (`schema.ts:619-636` header, `:742-744` column). The header explicitly documents that the constraint is hand-authored and must be re-stated when narrowed:
```typescript
// EXCLUDE "booking_no_overlap" is HAND-AUTHORED in drizzle/0005_booking_exclusion.sql — Drizzle
// cannot express EXCLUDE (issues #2813/#3388). `drizzle-kit generate` will NOT produce it; never
// assume the constraint exists from THIS file alone. ... The GiST EXCLUDE is the SOLE double-booking
// authority — every read/occupancy predicate must mirror this occupying set (pending/confirmed/requested/approved).
```
```typescript
    // Phase-8 group bookings (D-108). The declared attendee headcount, captured at hold time ONLY when the
    // listing's extra_head_fee > 0 (a flat-priced listing leaves this NULL). Nullable, backfill-free ADD COLUMN.
    declaredPax: integer("declared_pax"),
```

---

### 6. `src/lib/booking/pricing.ts` → `quoteOpenCapacity` (utility, pure transform)

**Analog:** `quoteWindow` + `paxSurcharge`, `pricing.ts:70-135`.

```typescript
export function quoteWindow(input: QuoteInput): Quote {
  const { fullDay, hourlyRateCents, dayRateCents } = input;
  const hours = windowHours(input.startUtc, input.endUtc);

  let baseCents: number;
  if (fullDay) {
    if (dayRateCents == null) throw new Error("Listing has no day rate for a full-day booking");
    baseCents = dayRateCents; // flat day rate — NO cap, NO auto-switch (D-45)
  } else {
    if (hourlyRateCents == null) throw new Error("Listing has no hourly rate for an hourly booking");
    baseCents = hourlyRateCents * hours;
  }
  ...
  return { totalCents: baseCents + surchargeCents, currency: DISPLAY_CURRENCY, hours, fullDay, extraHeads, extraHeadCents };
}
```
**Rules to copy:** (a) **throw** rather than freeze a ₱0 charge when the required rate is absent — `perHeadPriceCents == null` must throw; (b) `currency: DISPLAY_CURRENCY` from `@/lib/money`, never `listing.currency`; (c) integer centavos only, one rounding site; (d) the file header's "Pure/isomorphic: no `use client`/`use server` directive" rule (`pricing.ts:13-14`) — `quoteOpenCapacity` must stay importable by both RSC and the tx.

The service fee is composed **at the caller**, not here — `units.ts:479` (`const fee = computeServiceFee(quote.totalCents);`) and the rationale at `units.ts:474-478`.

---

### 7. `src/lib/availability/read-model.ts` → open fork (service, read model)

**Analog:** `getAvailability`, `read-model.ts:90-212`.

**The occupying predicate that MUST be byte-identical to the claim's** (`read-model.ts:147-152`):
```typescript
    dbConn.execute(sql`
      SELECT unit, starts_at, ends_at FROM booking
      WHERE listing_id = ${listingId}
        AND (status = 'confirmed' OR (status IN ('pending','requested','approved') AND expires_at > now()))
        AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${dayStartIso}, ${dayEndIso}, '[)')
    `),
```
The comment above it (`:138-146`) states the invariant the planner must restate for open mode: *"this predicate MUST mirror … the EXCLUDE occupying set … Uses SQL now() (the DB transaction clock, one source — NOT the injectable `now` param, which stays for slot past/horizon state only; Pitfall 7)."*

**The TZDate → epoch normalization for the OC-03 day window** (`read-model.ts:120-123`):
```typescript
  const dayStartUtc = new Date(new TZDate(year, m0, day, 0, 0, 0, tz).getTime());
  const dayEndUtc = new Date(new TZDate(year, m0, day + 1, 0, 0, 0, tz).getTime());
  const dayStartIso = dayStartUtc.toISOString();
  const dayEndIso = dayEndUtc.toISOString();
```
For OC-03 substitute the operating-hours `openHour`/`closeHour` (parsed by `parseHour`, `read-model.ts:80-82`) for the `0,0,0` / `day+1` bounds. `hoursRows` is already fetched at `:127-131`.

**The listing read + defensive unknown-listing fallback** (`read-model.ts:99-113`) — extend the `select` with `occupancyMode`, `maxOccupancy`, `perHeadPriceCents`, and extend the empty fallback shape at `:111`:
```typescript
    return { timezone: "UTC", unitCount: 0, hasHours: false, bookingMode: "instant", slots: [] };
```
⚠️ The **exhaustive-switch note** at `read-model.ts:36-40` applies to any new `SlotState` member; the open fork should add a *separate* shape (`{ remaining, cap, state }`) rather than a fifth `SlotState`, to keep the exclusive switch untouched.

**Where the server-derived `state` belongs (UI-SPEC Open Q2):** the D-100 precedent is `bookingMode` riding on `DayAvailability` (`read-model.ts:55-57`, consumed at `availability-calendar.tsx:213-215`). Copy that seam exactly.

**Mirroring `EMPTY_AVAILABILITY`:** `src/app/actions/availability.ts:31-38` must gain the same open fields, with the same "the two can never drift apart" reasoning already written there.

---

### 8. `src/lib/search/query.ts` → Stage-2 open branch (service, query)

**Analog:** itself. **Stage-2 loop** (`query.ts:200-218`):
```typescript
  const kept: SearchResultRow[] = [];
  for (const c of candidates) {
    const avail = await getAvailability(db, c.id, picked, now);
    if (hasWindow) {
      ...
      if (inWindow.length > 0 && inWindow.every((s) => s.state === "available")) kept.push(c);
    } else if (avail.slots.some((s) => s.state === "available")) {
      // date-only: kept iff any hour that day is bookable.
      kept.push(c);
    }
  }
```
The open branch keeps the candidate iff `avail.remaining >= 1`, and **ignores `hasWindow` entirely** (OC-12 / UI-SPEC O2). The file header's anti-pattern rule is load-bearing: *"never a second SQL availability predicate"* (`query.ts:8-9`) — the open branch must go through `getAvailability`, not new SQL.

**Row mapping** (`query.ts:105-120`) — add `occupancyMode` + `perHeadPriceCents` to `RawRow`/`SearchResultRow` and pass through `allInRateParts`:
```typescript
function toRow(r: RawRow): SearchResultRow {
  const rates = { hourlyRateCents: r.hourly_rate_cents, dayRateCents: r.day_rate_cents };
  return {
    ...
    // D-75: composed HERE (server-side) rather than in the card, so the browse rate and the checkout
    // breakdown are guaranteed to use the same SERVICE_FEE_BPS. See src/lib/booking/all-in-rate.ts.
    allInRateParts: allInRateParts(rates),
  };
}
```
Stage-1 SQL (`query.ts:155-180`) needs `l.occupancy_mode, l.per_head_price_cents` in the SELECT; the `priceMax` predicate at `:175` (`l.hourly_rate_cents <= ${priceMax}`) will silently drop every open listing — planner must decide (compare `per_head_price_cents` for open rows).

---

### 9. `src/lib/booking/all-in-rate.ts` → `/person` branch (utility, pure)

**Analog:** itself, `:29-41`:
```typescript
export function allInRateParts(
  listing: { hourlyRateCents: number | null; dayRateCents: number | null },
  currency: string = DISPLAY_CURRENCY,
): string[] {
  const parts: string[] = [];
  if (listing.hourlyRateCents != null) {
    parts.push(`${formatMoney(computeServiceFee(listing.hourlyRateCents).allInCents, currency)}/hr`);
  }
  if (listing.dayRateCents != null) {
    parts.push(`${formatMoney(computeServiceFee(listing.dayRateCents).allInCents, currency)}/day`);
  }
  return parts;
}
```
The header rule at `:8-11` ("A RATE, never a promised total … Do NOT add a computed 'estimated total'") applies unchanged to `/person`. `hasAllInRate` (`:44-49`) must gain the open branch too, or the `Service fee included` qualifier disappears on open cards.

---

### 10. `src/lib/validation/listing.ts` → mode fork (validation)

**Analog:** itself. **The values array to extend** (`listing.ts:24-28`) — the comment already names Phase 9:
```typescript
/** D-109 occupancy modes. EXACTLY ONE value in v1 (`exclusive`) — Phase 9 adds open-capacity. Mirrors the
 *  `occupancy_mode` pgEnum. There is deliberately NO host-facing control for this in v1 ... */
const occupancyModeValues = ["exclusive"] as const;
```

**The `superRefine` pattern to fork on** (`listing.ts:117-134`) — including the exported single-source reject-message constant idiom (`:37-38`), which the planner should replicate for each new open-mode message:
```typescript
}).superRefine((data, ctx) => {
  const fee = data.extraHeadFee ?? 0;
  const included = data.included ?? 1;
  if (fee > 0 && included >= data.maxOccupancy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["included"],
      message: SURCHARGE_UNREACHABLE_MESSAGE,
    });
  }
});
```
⚠️ `publishSchema` currently requires `hourlyRateCents` / `dayRateCents` as **top-level `.positive()`** (`:92-93`). The mode fork means those must become `.optional()` at the object level and be *required inside the superRefine* for `exclusive` — otherwise an open listing can never publish. The 07-15 rule quoted at `:104-113` ("a new publish requirement must land in TWO places") is the governing convention: schema **and** the wizard checklist.

Also export a `CANCELLATION_POLICY_VALUES`-style const for the mode union (`listing.ts:136-138`) so the wizard cards and the gate share one source:
```typescript
/** The D-67 tier union, exported so the wizard cards and the publish gate share ONE source of truth. */
export type CancellationPolicyValue = (typeof cancellationPolicyValues)[number];
export const CANCELLATION_POLICY_VALUES = cancellationPolicyValues;
```

---

### 11. `src/lib/validation/booking.ts` → open hold input (validation)

**Analog:** `bookingCreateSchema`, `:92-109` — note the shape-ceiling-vs-real-cap comment, which the `requestedPasses` field must reproduce:
```typescript
    // CR-03: the `.max()` is a SHAPE ceiling, not the cap. It exists so no accepted value can multiply
    // through `(pax − included) × extra_head_fee` into the `integer` money columns
    // (space_price_cents / service_fee_cents / quoted_total_cents) and raise a Postgres 22003 that
    // `mapBookingError` would re-throw as a raw 500 (T-03-500). The REAL cap is the listing's own
    // `maxOccupancy`, read inside `createPendingHold`'s transaction and applied there (D-111 / Security V4)
    // — never a client-supplied bound.
    declaredPax: z.coerce.number().int().min(1).max(10_000).optional(),
```
**Date parsing:** the open payload carries a `YYYY-MM-DD` date, not ISO instants. Reuse `parsePickedDate` (`src/lib/search/query.ts:60-74`), whose round-trip guard already exists for exactly this attacker-controlled shape — or the `dayLocalSchema` idiom at `src/app/actions/availability.ts:26-30`:
```typescript
const dayLocalSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
});
```

---

### 12. `OPEN_LOW_STOCK_MAX` config (config)

**Analog:** `src/lib/payments/config.ts:1-10` header + `:57`:
```typescript
// These are MECHANISM DEFAULTS that Phase 7 can tune (policy) without touching the plumbing — do NOT
// hardcode 10% / 24h / 60m at any call site; import these names instead. A value may read process.env
// with a documented default, but the exported constant is the single source of truth.
//
// Pure/isomorphic: no "use client"/"use server" directive, so Server Components, server actions, the
// commission calculator, and the payout sweep can all import it.
export const SERVICE_FEE_BPS = Number(process.env.SERVICE_FEE_BPS ?? 500);
```
Secondary analog: `HOLD_TTL_MINUTES` (`units.ts:141-143`) — a domain constant living next to its consumer.
⚠️ UI-SPEC "Not decided here" is explicit: `OPEN_LOW_STOCK_MAX` **must not be `NEXT_PUBLIC_`** — the `serviceFeeBps` bundle-inlining trap (`availability-calendar.tsx:235-242`) is the recorded reason.

---

### 13. `src/app/actions/booking.ts` → `placeHold` mode fork (controller)

**Analog:** the existing `bookingMode` fork, `booking.ts:168-188` — this is a **structural twin**, right down to the server-read-never-client-flag rationale:
```typescript
  // (4b) Fork on the SERVER-READ booking mode (D-61 / BOOK-04 / BOOK-05). ...
  // The mode is a creation-time snapshot on the booking row,
  // so a later listing.bookingMode edit never rewrites an in-flight request (D-61 new-bookings-only).
  if (lr.bookingMode === "request") {
    const res = await createPendingHold(db, { ...  holdStatus: "requested", ... });
    if ("error" in res) {
      return { ok: false, reason: "taken", error: res.error }; // same calm "just taken" as instant (SC#4)
    }
```
The listing read to extend is `booking.ts:135-157` — add `occupancyMode`, `maxOccupancy`, `perHeadPriceCents`. The `deriveBookable` gate at `:158-166` is unchanged (Security V4).

**Redirect + revalidate tail** (`booking.ts:299-304`) — copy verbatim for the open branch:
```typescript
  // (6) The pending hold immediately occupies the slot in the calendar + search (both treat pending as
  // occupying), so revalidate BOTH before redirecting to the reserve page.
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/");
  redirect(`/listings/${listingId}/book?hold=${res.id}`);
```
For OC-07, thread the granted count into the redirect (e.g. `&granted=N&requested=M`) so `PartialGrantNotice` renders server-side — or persist and re-derive; planner's call, but **both figures must be server props** (UI-SPEC O9).

**Q2 step-up:** `updateDeclaredPax` (`booking.ts:306-338+`). Its own docblock lists the guard order (session+ownership → live+unpaid only → flat-listings-inert → cap) and the *expire-before-refreeze* gate; the open branch must additionally re-enter the capacity claim. The clamp-fallback divergence warning at `units.ts:448-452` explicitly forbids "harmonising" the two paths — respect it.

---

### 14. `src/app/actions/cancel-booking.ts` → skip the auto-block (controller)

**Analog:** Consequence 3, `cancel-booking.ts:1018-1041`. Wrap this whole block in `if (!row.openCapacity) { … }` and keep Consequences 1, 2 and 4:
```typescript
  // ── Consequence 3. AUTO-BLOCK the freed window (D-70's actual anti-resell mechanism). ────────────
  // Reuses the Phase-3 availability_block machinery verbatim — same listing, same UNIT, same [startsAt,
  // endsAt) window. `reason` carries the sentinel that removeBlock refuses to delete ...
  try {
    await db.insert(availabilityBlock).values({
      id: randomUUID(),
      listingId: row.listingId,
      unit: row.unit,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      reason: HOST_CANCEL_BLOCK_REASON,
    });
  } catch (err) {
    console.error("[HOST_CANCEL_ALERT] auto_block_failed", { bookingId, err });
    await recordAudit({ actorId: userId, action: "host_cancel_autoblock_failed", outcome: "needs_attention", meta: { ... } });
  }
```
`loadBookingRow` (`:173-221`) must project `openCapacity`. The `whenLabelInput` projector at `:246-259` is where the new REQUIRED `openCapacity` field lands (see §17).

**Seat release needs no code** — `remaining` is a live `SUM`, so a `cancelled` row leaves the occupying set automatically. This mirrors `exclusion-race.test.ts:128-138` ("frees the slot when the occupying row leaves the partial WHERE").

---

### 15. `wizard.tsx` — occupancy step + step-index migration (component)

**Analog A — the RadioGroup card step to clone** (`wizard.tsx:819-868`):
```tsx
          {/* --- Step 5: Booking mode --------------------------------------------------------- */}
          {step === 5 && (
            <FormField
              control={form.control}
              name="bookingMode"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3">
                      {[{ value: "instant" as const, title: "Instant book", body: "…" }, …].map((opt) => (
                        <label
                          key={opt.value}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-4",
                            field.value === opt.value && "border-primary",
                          )}
                        >
                          <RadioGroupItem value={opt.value} className="mt-1" />
                          <span className="space-y-0.5">
                            <span className="block text-sm font-medium">{opt.title}</span>
                            <span className="block text-sm text-muted-foreground">{opt.body}</span>
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>…</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
```

**Analog B — the D-77 "no pre-selection, neutral not coral" rationale** (`wizard.tsx:870-881`), which UI-SPEC § 1b cites directly:
```
            NO CARD IS PRE-SELECTED, DELIBERATELY. ... it governs real money ...
            All three cards render at equal weight; the selection marker is neutral `border-primary` and
            NEVER coral. Coral is reserved for booker CTAs (07-UI-SPEC § Color) and using it here would
            advertise a recommendation the product deliberately doesn't make.
```

**Analog C — derived step index, the migration answer** (`wizard.tsx:118-134`):
```typescript
const STEPS = [
  { key: "type", title: "What kind of space is it?" },
  …
  { key: "review", title: "Review and publish" },
] as const;

/** Index of the D-77 tier step, so the publish-checklist row links back to it without a magic number. */
const CANCELLATION_STEP = STEPS.findIndex((s) => s.key === "cancellation");
```

**Analog D — the checklist with hardcoded indices to migrate** (`wizard.tsx:342-367`):
```typescript
  const checklist: { label: string; done: boolean; step: number | null; action?: () => void }[] = [
    { label: "Title", done: Boolean(values.title), step: 1 },
    …
    { label: "Hourly rate", done: Boolean(values.hourlyRateCents && values.hourlyRateCents > 0), step: 4 },
    { label: "Day rate", done: Boolean(values.dayRateCents && values.dayRateCents > 0), step: 4 },
    …
    { label: "Choose a cancellation policy", done: Boolean(values.cancellationPolicy), step: CANCELLATION_STEP },
  ];
  const publishEligible = checklist.every((c) => c.done);
```
Every literal `step: N` here must become `STEPS.findIndex(s => s.key === "…")` before the new step is inserted. `STEPS.length` also drives `Step {step + 1} of {STEPS.length}` (`:378-381`) and `progress` (`:369`) — a `STEPS` fork for open mode makes both truthful for free.

**Analog E — the currency-prefixed rate input to clone for `Price per person`** (`wizard.tsx:661-693`):
```tsx
              <FormField
                control={form.control}
                name="hourlyRateCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly rate</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                          {symbol}
                        </span>
                        <Input
                          type="number" min="0" step="0.01" inputMode="decimal"
                          className="pl-8" placeholder="0.00"
                          value={field.value != null ? (field.value / 100).toString() : ""}
                          onChange={(e) => {
                            const major = parseFloat(e.target.value);
                            field.onChange(Number.isNaN(major) ? undefined : Math.round(major * 100));
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>Charged per hour. Required to publish.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
```
`symbol` comes from `currencySymbol(listing.currency)` (`wizard.tsx:162-170`).

---

### 16. `DatePassPicker` + `availability-calendar.tsx` fork (component, client)

**Analog:** `AvailabilityCalendar`, `availability-calendar.tsx:80-224`.

**The Calendar + coral DayButton override to reuse byte-identically** (`:157-175`):
```tsx
        <Calendar
          mode="single"
          timeZone={timezone}
          selected={selectedDate}
          onSelect={handleDaySelect}
          startMonth={todayStart}
          endMonth={horizonEnd}
          disabled={[{ before: todayStart }, { after: horizonEnd }]}
          components={{
            // Selected day = coral (UI-SPEC accent #1); today stays the neutral --muted ring.
            DayButton: (dayButtonProps) => (
              <CalendarDayButton
                {...dayButtonProps}
                className="data-[selected-single=true]:bg-brand data-[selected-single=true]:text-brand-foreground data-[selected-single=true]:hover:bg-brand/90"
              />
            ),
          }}
          className="rounded-xl border"
        />
```
For `Fully booked` dates, add to the `disabled` array (react-day-picker matcher) — that is what makes them *programmatically* disabled per UI-SPEC § 2a.

**The day-fetch handler with the IN-03 stale-clear rule** (`:118-141`):
```tsx
  async function handleDaySelect(picked: Date | undefined) {
    if (!picked) return;
    const inTz = tz(timezone);
    const next: DayLocal = {
      year: Number(format(picked, "yyyy", { in: inTz })),
      month: Number(format(picked, "M", { in: inTz })),
      day: Number(format(picked, "d", { in: inTz })),
    };
    setDay(next);
    setSelection(null); // a new day clears any prior slot selection in the rail
    setLoading(true);
    setError(false);
    try {
      const res = await getDayAvailability(listingId, next);
      setDayAvail(res);
    } catch {
      // IN-03: a failed day fetch must NOT leave the prior day's slots on screen (stale-but-plausible).
      setDayAvail(null);
      setError(true);
    } finally { setLoading(false); }
  }
```
`setSelection(null)` at `:127` is the exact line UI-SPEC § 2c cites for "changing the date resets the pass count to 1".

**The dashed empty-state shells and shipped copy** (`:186-206`) — reuse verbatim for the `Closed`/`No hours`/`Error` day-panel states:
```tsx
          ) : error ? (
            <div className="rounded-xl border border-dashed p-6 text-center" role="alert">
              <p className="font-medium">Couldn&apos;t load this day</p>
              <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
                Something went wrong fetching availability. Pick the day again to retry.
              </p>
            </div>
          ) : !dayAvail || !dayAvail.hasHours ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="font-medium">No availability yet</p>
              <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
                This host hasn&apos;t set their hours yet. Check back soon.
              </p>
            </div>
```

**The lifted-selection context to extend with `{date, passes}`** (`:38-61`) — `BookingSelectionProvider` / `useBookingSelection` are consumed by `BookCta` (`book-cta.tsx:42`) and `RailSelectionSummary` (`:253`); both must handle the open shape.

**The rail summary + the serviceFeeBps threading rule** (`:230-292`, esp. `:235-242`):
```typescript
  /**
   * D-74/D-75 — the applied service-fee rate, passed in FROM THE SERVER. This component is inside a
   * `"use client"` module, so it must not fall back to the SERVICE_FEE_BPS default: a non-public env
   * override (`SERVICE_FEE_BPS=700`) is not inlined into the browser bundle, so the rail would keep
   * quoting 5% while checkout charged 7% — the number going UP between browsing and paying, which is
   * exactly what D-75 forbids. Threading it from the RSC keeps the two provably on the same rate.
   */
  serviceFeeBps: number;
```
```typescript
  const cents = spaceCents == null ? null : computeServiceFee(spaceCents, serviceFeeBps).allInCents;
```
`RailPassSummary` = the same body with `spaceCents = perHeadPriceCents * passes`.

---

### 17. `SpotsLeftChip` (NEW component — role-match)

No shipped three-state server-driven scarcity badge exists. Compose from three shipped precedents:

**a) The soft brand-tint recipe (UI-SPEC accent #4) — `slot-picker.tsx:239-253`, reuse verbatim:**
```tsx
        {/* Gap hint: the fill truncated at a busy hour. A soft brand-tint info note — NEVER an error/red
            (occupancy is a normal state). Mutually exclusive with the pending helper by construction. */}
        {gapSlot && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-sm text-foreground"
          >
            <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand" />
```

**b) The "muted + struck + disabled + aria-label, NEVER red" three-channel unavailable treatment — `slot-picker.tsx:170-196`:**
```tsx
                // Occupied / blocked / past / beyond-horizon / too-soon: visible, muted, struck-through,
                // NEVER selectable, NEVER red. ...
                        <ToggleGroupItem
                          value={slot.startUtc}
                          disabled
                          aria-disabled="true"
                          aria-label={`${timeLabel} — ${reasonFor(slot.state, mode)}`}
                          className={cn(CHIP_BASE, "cursor-not-allowed bg-muted text-muted-foreground line-through")}
                        >
```

**c) The "state is decided server-side, the component never re-derives it" contract — `src/components/group/headcount-meter.tsx:48-53`:**
```typescript
  /**
   * Decided server-side against the RAW snapshot (`getHeadcount`: `yes` rows >= `capacity_snapshot`) and
   * passed straight through. It is deliberately NOT re-derived from the two organizer-inclusive numbers
   * above: `full` is a fact about the seat-claim, and only the seat-claim's own basis can decide it.
   */
  full: boolean;
```
That docblock is the exact justification UI-SPEC Open Q2 needs — copy the reasoning for `state: "open" | "low" | "full"`.

**`DropInBadge`** is a one-liner off `src/app/listings/[id]/page.tsx:217-221` (`<Badge variant="secondary">{label}</Badge>`).

---

### 18. `pax-stepper.tsx` → split into control + two bindings (component)

**Analog:** itself, `:43-128`. The whole file is the pattern; two parts are load-bearing.

**The zero-arithmetic + grep-gate contract to preserve on the split** (`pax-stepper.tsx:7-27`):
```
// ⚠️ THE ZERO-ARITHMETIC CONTRACT, inherited verbatim from price-breakdown.tsx and PROVEN BY ABSENCE here.
// This file contains NO price of any kind: no money formatter, no fee, no multiplication, no total. ...
// ⚠️ GREP GATE. "No client price math here" is checked by grepping this file for the money formatter and the
// frozen-total field name — BOTH must return zero ...
```
If the presentational control is extracted to a new file, the grep gate must move with it (state so in the plan).

**The `useOptimistic`-reverts contract + courtesy clamp** (`:56-72`):
```typescript
  const [pax, setOptimisticPax] = useOptimistic(declaredPax);

  function commit(next: number) {
    const clamped = Math.min(Math.max(1, next), maxOccupancy);
    if (clamped === declaredPax) return;
    startTransition(async () => {
      setOptimisticPax(clamped);
      const res = await updateDeclaredPax(holdId, clamped);
      if (!res.ok) {
        // No manual rollback needed — leaving the transition restores the persisted prop.
        toast.error(res.error);
        return;
      }
      // Re-render the SERVER tree so the freshly-frozen quote (breakdown + total) replaces the old one.
      router.refresh();
    });
  }
```
The **new local-state binding** (pre-hold, listing rail) keeps `useState` instead of `useOptimistic` and feeds `placeHold` — but keeps the `InputGroup` markup at `:80-122` (including `h-11 w-40`, `readOnly`, arrow-key handlers, `size-9` buttons and `tabular-nums`) byte-identical.

---

### 19. `book-cta.tsx` → open branch (component, client)

**Analog:** itself, `:48-90`. The `sold-out` reason routes through the *existing* `taken` branch:
```typescript
      // taken / not-bookable / invalid — calm neutral notice + refresh the calendar so it reflects reality.
      setNotice(result.error);
      setPending(false);
      if (result.reason === "taken") router.refresh();
```
Sign-in resume params to fork (`:62-69`):
```typescript
      if (result.reason === "sign-in") {
        // Thread the listing + the selected window into the return path so checkout resumes on return (D-41).
        const params = new URLSearchParams({ start: window.startUtc, end: window.endUtc, resume: "1" });
        if (window.fullDay) params.set("fullDay", "1");
        const callback = `/listings/${listingId}?${params.toString()}`;
        router.push(`/login?callbackURL=${encodeURIComponent(callback)}`);
        return;
      }
```
→ open: `new URLSearchParams({ date, passes: String(n), resume: "1" })`.
The ref-guarded auto-resume at `:84-90` and the coral CTA class at `:122` are unchanged.

---

### 20. `price-breakdown.tsx` → optional `perHeadPriceCents` + `passes` (component)

**Analog:** the D-108 optional-props addition, `price-breakdown.tsx:56-67` and `:109-127`. This is the precedent UI-SPEC Open Q10 cites:
```typescript
  /**
   * D-108 extra-guest surcharge, as THREE server-computed figures (`paxSurcharge`, pricing.ts) — never one
   * that this component multiplies out. ... All default to 0, so every existing call site (and every
   * flat listing) renders byte-for-byte what it does today: no line at all.
   */
  extraHeads?: number;
  extraHeadCents?: number;
  extraSurchargeCents?: number;
```
```tsx
        {extraSurchargeCents > 0 && (
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-muted-foreground">
              Extra guests ({extraHeads} × {formatMoney(extraHeadCents, currency)})
            </span>
            <span className="tabular-nums">{formatMoney(extraSurchargeCents, currency)}</span>
          </div>
        )}
```
The run-line label to fork (`:92-95`) — formatting only, no multiplication:
```typescript
  const runLabel = fullDay
    ? `${formatMoney(dayRateCents ?? 0, currency)}/day × 1 day`
    : `${formatMoney(hourlyRateCents ?? 0, currency)}/hr × ${hours} ${hours === 1 ? "hour" : "hours"}`;
```
→ open: `${formatMoney(perHeadPriceCents, currency)}/person × ${passes} passes`.
⚠️ The **grep tripwire** at `:26-30` guards this file's copy; do not spell the forbidden phrases in any new comment.

---

### 21. `search-result-card.tsx` (component)

**Analog:** itself. **The window line to suppress for open listings** (`:47-64`):
```typescript
/** The searched-window line, always naming the venue tz (SC#2). Null when no date was searched. */
function windowLine(win: SearchedWindow | undefined, city: string | null, timezone: string): string | null {
  if (!win?.date) return null;
  ...
  if (startLabel && endLabel) {
    return `Available ${startLabel}–${endLabel} on ${niceDate} · ${cityLabel} time`;
  }
  return `Available ${niceDate} · ${cityLabel} time`;
}
```
UI-SPEC § 4 / O2 forbids the `startLabel && endLabel` branch entirely for an open listing.

**The card link params to fork** (`:97-103`):
```typescript
  const params = new URLSearchParams();
  if (searchedWindow?.date) params.set("date", searchedWindow.date);
  if (searchedWindow?.start) params.set("start", searchedWindow.start);
  if (searchedWindow?.end) params.set("end", searchedWindow.end);
```
→ open: `date` only.

**The price block (zero arithmetic, server-formatted)** (`:122-135`):
```tsx
          <h3 className="font-semibold leading-snug">{title}</h3>
          {typeLabel && <p className="text-sm text-muted-foreground">{typeLabel}</p>}
          <p className="text-sm tabular-nums">
            {priceParts.length ? priceParts.join(" · ") : "Price on request"}
          </p>
          {priceParts.length > 0 && (
            <p className="text-sm text-muted-foreground">Service fee included</p>
          )}
```
The `Drop-in` badge goes on the `typeLabel` line per UI-SPEC § 4.

---

### 22. `when-label.ts` → REQUIRED `openCapacity` (utility, pure)

**Analog:** the `fullDay` required-field precedent, `when-label.ts:54-59` — this is the exact argument UI-SPEC Open Q9 makes:
```typescript
  /**
   * The PERSISTED `booking.full_day` snapshot (drizzle 0016 / WR-06) — the creation-time flag the price
   * was frozen with, and the sole authority for which branch renders. REQUIRED, so tsc enumerates every
   * call site. `null` means a pre-0016 row and ONLY then is the fallback below consulted.
   */
  fullDay: boolean | null;
```
**The shared `compose` body to fork** (`:81-93`):
```typescript
function compose(input: WhenLabelInput, dateFormat: string): string {
  const inTz = tz(input.timezone);
  const spaceCents = input.spacePriceCents ?? input.quotedTotalCents ?? 0;
  const fullDay = input.fullDay ?? (input.dayRateCents != null && spaceCents === input.dayRateCents);
  const dateLabel = format(input.startsAt, dateFormat, { in: inTz });
  const timeLabel = fullDay
    ? "Full day"
    : `${format(input.startsAt, "h:mm a", { in: inTz })} – ${format(input.endsAt, "h:mm a", { in: inTz })}`;
  return `${dateLabel}, ${timeLabel}${input.city ? ` (${input.city} time)` : ""}`;
}
```
The open branch must short-circuit **before** the `fullDay` resolution (CR-01/O2). ⚠️ The header's **GREP TRIPWIRE** (`:30-34`) forbids naming the removed price-derivation identifier anywhere in the file, comments included — do not reintroduce it while editing.

**Call-site census target** — `cancel-booking.ts:246-259` (`whenLabelInput` projector) is one of ~10 sites tsc will flag.

---

### 23. `host-cancel-dialog.tsx` → two consequences (component)

**Analog:** itself, `:173-200`:
```tsx
              <DialogTitle>Cancelling this booking will:</DialogTitle>
              …
              <li>
                Refund <strong>{refundLabel}</strong> to {guestLabel} in full — regardless of your
                …
              <li>
                Charge you a <strong className="text-destructive">{feeLabel}</strong> cancellation fee,
```
The third `<li>` (the auto-block bullet, `:192+`) is the one UI-SPEC § 5c / O8 removes for a drop-in booking. Everything else — required reason, required acknowledgment, two steps, neutral `outline` confirm — is unchanged.

---

### 24. Tests

**`tests/availability/open-capacity-race.test.ts` (the SC#3 gate) — analog: `tests/group/seat-claim-race.test.ts`, whole file.**

Its header is the phase-9 test spec almost verbatim — copy the **two-layer structure and its two named mutations** (`seat-claim-race.test.ts:12-34`):
```
// THIS FILE HAS TWO LAYERS AND THEREFORE TWO SEPARATE MUTATIONS, each against its OWN file and line.
// Run BOTH — neither substitutes for the other.
//
//   LAYER 1 — the PATTERN proof (`raceClaim`, cases 1-2). The seat-claim SQL is INLINED inside each
//     racer's transaction precisely so the `FOR UPDATE` lock ITSELF is the thing under test …
//   LAYER 2 — the SHIPPED proof (`realClaim`, cases 3-4). Layer 1 proves the *pattern* is race-free; it
//     does NOT prove the *shipped* claim still carries the lock … Measured in 08-09: deleting the
//     production lock left this file GREEN (2/2), all of tests/group/ GREEN and the full 792-test suite
//     GREEN while shipping an over-cap bug.
```
The **per-racer independent-connection drizzle wrapper** (`:172-180`) — this exact idiom is what makes Layer 2 real:
```typescript
function realClaim(client: TestDb["client"], groupId: string, name: string) {
  return claimSeat(drizzle(client), { groupId, answer: "yes", userId: null, guestEmailNorm: null, name });
}
```
The **assert-committed-rows-first** ordering (`:235-241`):
```typescript
      // The load-bearing assertion FIRST, read back through an INDEPENDENT connection: exactly one
      // 'yes' is COMMITTED. … That is MUTATION 2, and it is asserted ahead of the returned
      // results so the mutation's failure message names the DB truth (committed rows), not a proxy.
      const [{ n }] = await testDb.client`
        SELECT count(*)::int AS n FROM rsvp WHERE group_id = ${REAL1_GID} AND status = 'yes'`;
      expect(n).toBe(1);
```
The **fixture-isolation rule** (`:49-51`): separate fixtures per layer and per case, so committed rows from one case never pre-fill the cap another races for. Phase 9 equivalent: a distinct `(listing, date)` per case.

**`makeRacingClients` — `tests/helpers/db.ts:52-67`:**
```typescript
/**
 * Open `n` INDEPENDENT postgres.js connections bound to one isolated test schema. Unlike the
 * shared max:1 `makeClient`, these can fire genuinely concurrent inserts so the SC#4 exclusion
 * race is real (RESEARCH Pitfall 1 — a single max:1 client serializes and proves nothing). Each
 * client has its own pool → separate backend connections → true concurrency.
 */
export function makeRacingClients(schema: string, n: number) { … }
```

**`tests/availability/open-capacity-exclude.test.ts` — analog: `tests/availability/exclusion-race.test.ts:110-138`**, especially the "frees the slot when the occupying row leaves the partial WHERE" case, which is the release-path twin:
```typescript
  it("frees the slot when the occupying row leaves the partial WHERE (cancelled)", async () => {
    await ins(testDb.client, "bk_free1", 1, "2026-08-05T08:00:00Z", "2026-08-05T09:00:00Z");
    await testDb.client`UPDATE booking SET status = 'cancelled' WHERE id = 'bk_free1'`;
    await ins(testDb.client, "bk_free2", 1, "2026-08-05T08:00:00Z", "2026-08-05T09:00:00Z");
    …
```
And the raw-`postgres.js`-insert helper (`:27-36`), kept raw so SQLSTATE reaches the test:
```typescript
const ins = (c: postgres.Sql, id: string, unit: number, start: string, end: string, status = "confirmed") => c`
  INSERT INTO booking (id, listing_id, unit, booker_id, starts_at, ends_at, status)
  VALUES (${id}, ${LISTING}, ${unit}, ${BOOKER}, ${start}, ${end}, ${status})`;
```
Phase-9 Pitfall-1 case: two open bookings on the SAME date + `unit=1` must BOTH commit.

**`tests/availability/open-capacity-readmodel.test.ts` — analog: `tests/availability/read-model.test.ts:1-25`** (header lists each proven invariant as a bullet; fixed injected `NOW`; 1-based `DAY`). The Phase-9 bullets: cancelled ⇒ frees a seat; stale pending ⇒ frees a seat via `expires_at > now()`; live pending + confirmed ⇒ occupy; `remaining = cap − SUM(declared_pax)`; predicate byte-identical to the claim.

**`tests/validation/listing-schema.test.ts` (EXTEND) — analog: `:10-27`** (`validPublish` fixture; negatives override one field). Phase 9 adds a second `validOpenPublish` fixture.

---

## Shared Patterns

### A. The DB is the sole arbiter — never app-level count-then-insert
**Source:** `src/lib/availability/units.ts:1-11`, `src/lib/group/seat-claim.ts:1-7`
**Apply to:** `createOpenCapacityHold`, the race test, every read predicate
```typescript
// KEY PRINCIPLE: correctness rests on the booking_no_overlap EXCLUDE
// constraint (Plan 01), NOT on the find-free SELECT. … There is deliberately NO app-level
// "query-then-insert" conflict guard (that is the exact race CLAUDE.md forbids)
```
```typescript
// The row lock is the atomic authority — the app NEVER adjudicates the cap (the CLAUDE.md count-then-insert
// anti-pattern), exactly mirroring how the GiST EXCLUDE constraint — not app code — arbitrates the
// double-book (src/lib/availability/units.ts). Proven race-free by tests/group/seat-claim-race.test.ts, the
// phase acceptance gate (mutation-verified: delete FOR UPDATE → red → restore).
```

### B. SQLSTATE detection — never string-match
**Source:** `src/lib/pg.ts:13-21`
**Apply to:** every catch in `units.ts`, the race tests
```typescript
export function isPgError(e: unknown, code: string): e is { code: string } {
  for (let cur: unknown = e, depth = 0; cur != null && depth < 10; depth++) {
    if (typeof cur === "object" && "code" in cur && (cur as { code?: unknown }).code === code) return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}
```

### C. The DB clock is the sole expiry authority — zero JS clock reads
**Source:** `src/lib/availability/units.ts:19-23`
**Apply to:** `createOpenCapacityHold`, the open sweep, the read-model occupying predicate
```typescript
// THE DATABASE CLOCK `now()` IS THE SOLE EXPIRY AUTHORITY. This file deliberately contains ZERO JS clock
// reads — expiry is a SQL expression evaluated by Postgres, in the same transaction as the rows it is
// compared against. … the absence of a JS clock read here is asserted by grep in 07-05's acceptance criteria.
```
Corollary in the read model (`read-model.ts:143-145`): SQL `now()` for occupancy, the injectable `now` param **only** for past/horizon display state.

### D. Server-frozen money, zero client arithmetic
**Source:** `src/components/booking/price-breakdown.tsx:10-17`, `pax-stepper.tsx:7-12`, `all-in-rate.ts:8-11`, `availability-calendar.tsx:235-242`
**Apply to:** every UI money surface this phase touches
```typescript
// The component still performs ZERO arithmetic: every figure arrives as a server-computed prop.
// … A component that computed `total = space + fee` itself could disagree with what PayMongo charges …
```
The `serviceFeeBps`-must-be-threaded rule is the one exception-shaped trap: a `"use client"` module must never fall back to the `SERVICE_FEE_BPS` default.

### E. Occupancy is a normal state — never red, never a dead end
**Source:** `src/components/availability/slot-picker.tsx:170-175`, `:239-241`, `src/components/group/headcount-meter.tsx:17-20`
**Apply to:** `SpotsLeftChip`, `Fully booked` day cells, `PartialGrantNotice`, the sold-out notice
```typescript
// Occupied / blocked / past / beyond-horizon / too-soon: visible, muted, struck-through,
// NEVER selectable, NEVER red.
```
```typescript
// "FULL" IS A HAPPY STATE, NOT AN ERROR (G4/D-112). At the cap the caption becomes "This group is full." in
// the SAME muted treatment — never red, never an alarm, never `--destructive`.
```

### F. Server-read the mode on every mutation — the route group is never the gate
**Source:** `src/app/actions/booking.ts:132-140`
**Apply to:** `placeHold`, `updateDeclaredPax`, `cancelBookingAsHost`, `getDayAvailability`
```typescript
  // (4) Re-derive bookability SERVER-SIDE (Security V4 — the reserve route group is NOT the gate). Mirrors
  // the listing page's deriveBookable call … Keep this join in sync with bookability.ts (Pitfall 5).
      // D-61: the booking MODE is read SERVER-SIDE from the listing row here (never a client flag —
      // T-06-09 elevation). The request branch below forks on it; the reserve route group is not the gate.
```

### G. Migrations are hand-edited SQL applied via `npm run db:migrate`
**Source:** `drizzle/0005:1-8`, `drizzle/0012:1-6`, `drizzle/0017:14-19`, `tests/helpers/db.ts:95-109`
**Apply to:** all three new migrations
- Unqualified table/type/column names (`"public".` prefixes stripped) so `tests/helpers/db.ts` replays them into isolated schemas.
- `--> statement-breakpoint` between statements (the harness splits on it, `db.ts:101`).
- `IF NOT EXISTS` on `ALTER TYPE … ADD VALUE` and `CREATE EXTENSION`.
- Never `drizzle-kit push`.

### H. Creation-time snapshots, never re-derived from current listing values
**Source:** `schema.ts:656-668` (`bookingMode`, `fullDay`), `:724-726` (`cancellationPolicy`), `units.ts:534-537`
**Apply to:** the open booking row (`open_capacity`, `declared_pax`, the frozen triple)
```typescript
                  // D-67 creation-time cancellation-tier SNAPSHOT, exactly like bookingMode (D-61). Captured
                  // here so a later listing retier NEVER rewrites the refund terms of an in-flight booking.
                  // The refund calculator reads THIS column, never the listing's current value (T-07-43).
```

### I. Grep tripwires already guarding files this phase edits
**Apply to:** any executor editing these files — do not disarm them
| File | Guarded string / rule | Source |
|---|---|---|
| `src/lib/booking/when-label.ts` | the removed price-derivation identifier must appear nowhere, comments included | `:30-34` |
| `src/components/booking/price-breakdown.tsx` | the tax-sounding bundle label + the three C7 reassurance phrases | `:26-30` |
| `src/components/booking/pax-stepper.tsx` | zero money formatter / zero frozen-total field name | `:23-27` |
| `src/lib/availability/units.ts` | zero JS clock reads | `:19-23` |
| `src/lib/validation/listing.ts` | `SURCHARGE_UNREACHABLE_MESSAGE` literal appears exactly once | `:30-38` |
| `wizard.tsx` | the cancellation step title must not duplicate the checklist row label | `:125-128` |

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `SpotsLeftChip` (server-derived 3-state scarcity badge) | component | — | No shipped component takes a server-decided discrete display state and renders three tinted variants. **Compose from** `slot-picker.tsx:239-253` (tint), `slot-picker.tsx:170-196` (muted/struck/disabled), `headcount-meter.tsx:48-53` (server-decided flag contract). |
| `ModeLockNotice` (why + when + escape hatch) | component | — | Closest is `src/components/host/cancellation-fee-notice.tsx` (a neutral host-side alert), but no shipped alert carries a server-computed unlock instant plus a route-forward link. Use RESEARCH/UI-SPEC § 1f copy; borrow the `alert` shell + `formatMoney`-style server-prop discipline. |
| `PartialGrantNotice` (two money figures, not dismissable) | component | — | No shipped notice presents an old-vs-new price pair. Closest shells: `src/components/booking/hold-expired-state.tsx`, `src/components/booking/pending-payment-state.tsx`. Money figures must be server props (`price-breakdown.tsx` contract). |
| Advisory-lock SQL (`pg_advisory_xact_lock`) | — | — | Never used in this codebase. Structural analog is the `FOR UPDATE` at `seat-claim.ts:51-55`; the SQL itself comes from RESEARCH Pattern 1. Treat as new code with a mandatory race test. |
| `e2e/open-capacity.spec.ts` fixtures | test (e2e) | — | `e2e/search-and-book.spec.ts` / `e2e/availability.spec.ts` give the harness shape, but no e2e seeds an open-capacity listing (the mode does not exist yet). |

---

## Metadata

**Analog search scope:** `src/lib/{db,availability,booking,group,payments,search,validation}`, `src/app/{actions,api,listings,(host)}`, `src/components/{availability,booking,listing,search,host,group}`, `drizzle/`, `tests/`, `e2e/`
**Files scanned:** 41 read (28 full, 13 targeted-range); ~90 enumerated via glob/grep
**Project skills:** none found (`.claude/skills/`, `.agents/skills/` absent — confirmed 2026-07-30)
**Pattern extraction date:** 2026-07-30
