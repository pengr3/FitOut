# Phase 4: Booking Core & Search (no payment) - Research

**Researched:** 2026-07-14
**Domain:** True-availability geospatial search (PostGIS) + a two-phase booking state machine (pending hold → confirm) protected by a Postgres GiST `EXCLUDE` constraint, on Next.js 16 App Router + Drizzle + postgres.js
**Confidence:** HIGH (the load-bearing unknowns — Drizzle/postgres.js SAVEPOINT mechanics and PostGIS distance-unit semantics — were verified against installed source and official docs, not training data)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Search entry & results (SEARCH-01, SEARCH-05)**
- **D-29:** Search IS the homepage. `/` becomes the browse/search home, replacing the Next.js scaffold (`src/app/page.tsx`).
- **D-30:** Default (no-query) view = all bookable listings in the launch city, sensibly sorted. Honors D-16 (published-but-not-bookable excluded).
- **D-31:** Zero-result state = friendly empty state with escape hatches (broaden-radius / clear-filters + nearby alternatives).
- **D-32:** Results paginate via "Load more" / pagination (NOT infinite scroll). List of cards only (map is v2 / DISC-01).

**Location, filters & availability (SEARCH-01..04)**
- **D-33:** Location model = address autocomplete → radius. Booker types area/address (Photon/LocationIQ) → PostGIS radius search; distance shown on cards; radius control provided. "Near me" geolocation optional/fast-follow. Reuses existing `listing_location_gist`.
- **D-34:** Availability filter = TRUE free-window. Booker picks a date (+ optional time range); results include ONLY listings with an actual free unit for that window. Server-side via the Phase-3 read model / free-unit predicate, bounded by bookable-only (D-16) + ~90-day horizon (D-26). Date-only ⇒ "available" = open that day with ≥1 free unit somewhere in the day.
- **D-35:** Activity filter matches primary space type OR activity tags (D-08).
- **D-36:** First-class filters = location + date/time + activity/type + price. Amenities filtering DEFERRED.
- **D-37:** Result sort = nearest-first (default, using search origin), switchable to price.

**Reserve / checkout flow (BOOK-01, BOOK-02)**
- **D-39:** Checkout = dedicated reserve page (`/listings/[id]/book`). The pending hold is placed on ENTERING checkout (SC#3), not on final confirm.
- **D-40:** No-payment confirm boundary = placeholder confirm. Confirm flips hold `pending → confirmed`. Phase 5 inserts payment immediately before this transition. Phase 4 does NOT stop at the hold.
- **D-41:** Sign-in required at "Book." Clicking Book requires a signed-in `canBook` user (return-to-checkout redirect). Guest checkout DEFERRED.
- **D-42:** Double-click idempotency via an idempotency key + button-disable. A retried/double submit is a no-op that returns the SAME booking; never a false "just got taken." The DB constraint alone is insufficient.
- **D-43:** Booking confirmation = durable, owner-gated confirmation page at a stable URL (`/bookings/[id]`), booking reference + details, survives refresh. NO My Bookings LIST.
- **D-44:** Reserve page shows a visible hold countdown + graceful expiry.

**Pricing & the hold lifecycle (BOOK-01, BOOK-02)**
- **D-45:** Pricing rule = distinct, no cap. Hourly run = `hourlyRateCents × hours`; "Book full day" = `dayRateCents`. NO auto-switch / day-rate cap.
- **D-46:** Price breakdown = subtotal only. Line items `rate × qty = subtotal + total`; NO platform/service-fee or commission line in Phase 4 (layout leaves room). Booker-facing prices display in PHP.
- **D-47:** Hold TTL = 15 minutes, platform-wide and config-tunable.
- **D-48:** Expiry mechanism = sweep-on-write + lazy reads, NO new infra. (a) Lazy reads: read model + find-free-unit treat a `pending` past `expiresAt` as free. (b) Sweep-on-write: the booking tx clears/expires overlapping stale holds before inserting. WR-03 transactional contract: per-unit-attempt SAVEPOINT for `23P01`; outer retry for `40P01`; both map to the "just taken" copy. NO Redis / BullMQ / Inngest.
- **D-49:** Extend the `booking` table with at least: `expiresAt`, a captured price snapshot (`quotedTotalCents` + `currency`), and an idempotency key (column or side table). Abandoned hold maps to `cancelled` (or new `expired` if cheap). Phase 4 owns the state machine over the existing `bookingStatus` enum.

**Seed data**
- **D-38:** Lightweight search seed set — a handful of bookable demo listings across the launch city for dev / E2E / UAT.

### Claude's Discretion
- **Amenities search filter** — deferred (D-36); reintroduce as polish if it earns its place.
- **`expired` vs `cancelled`** for an abandoned hold (D-49) — lean toward reusing `cancelled`; add `expired` only if low-cost.
- **Exact `booking`-table column shape**, the **idempotency-key source** (client token vs derived from `(bookerId, listingId, window)`), and the **booking-reference format**.
- **URL schemes** for reserve/confirmation (resolved in UI-SPEC: `/listings/[id]/book`, `/bookings/[id]`), **radius presets** (UI-SPEC: 2/5/10/25 km, default 10), **sort-control affordance**, **card field layout**.
- Whether **"near me" geolocation** ships first-cut or fast-follow.
- **Search query implementation** — single SQL statement vs. two-stage candidate-then-filter — researcher/planner's call; correctness first, bounded by bookable-only + horizon.

### Deferred Ideas (OUT OF SCOPE)
- Amenities search filter; day-rate cap / auto-switch pricing; map view of results (v2 / DISC-01); My Bookings list + management + cancellation (Phase 7); background-job infra (BullMQ/Redis/Inngest); instant-book vs request-to-book fork (Phase 6); per-listing hold TTL / per-host horizon / lead time; "near me" geolocation (optional); guest checkout (deferred); payments/commission/payouts/refunds (Phase 5); group RSVP (Phase 8).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEARCH-01 | Search by location (area/radius within launch region) | Pattern 1 (search query) + Pitfall 1 (PostGIS `::geography` cast — the load-bearing correctness fact). Reuses `listing_location_gist`; origin lat/lng from `address-autocomplete`. |
| SEARCH-02 | Filter by activity / space type | Pattern 1: a single combined `category` param checked against BOTH columns — `primary_space_type::text = $category OR EXISTS(listing_activity_tag.tag = $category)` (D-35; the two vocabs are disjoint, so gate on `category` presence, not a space-type value). Vocab from `src/lib/listing-vocab.ts`. |
| SEARCH-03 | Filter by date and time availability | Pattern 1 + Pattern 3 (reuse `getAvailability` read model as the availability predicate — the "true free-window" filter, D-34). Two-stage candidate-then-filter recommended. |
| SEARCH-04 | Filter by price | Pattern 1: filter on `hourly_rate_cents` min/max (UI-SPEC price axis). |
| SEARCH-05 | Results as list of cards (photo, name, price, distance) | Extend `listing-card.tsx` → `SearchResultCard`; distance from `ST_Distance(::geography)` (meters → km). |
| BOOK-01 | Select time window + see price breakdown before committing | Pattern 4 (server-quoted, frozen price snapshot) + reuse `slots.ts`/read model to re-derive `hours`/`fullDay`. Never trust client price. |
| BOOK-02 | Slot held/locked during checkout with an expiry so two bookers cannot race | Pattern 2 (pending hold + `expiresAt`) + Pattern 5 (sweep-on-write + lazy reads, D-48) + the `EXCLUDE` constraint. |
| BOOK-03 | Overlapping booking rejected (no double-booking) + double-click idempotency (exactly one) | Pattern 2 (WR-03 SAVEPOINT/outer-retry) + Pattern 6 (idempotency — the own-hold pre-check that prevents a false "just taken"). |
</phase_requirements>

## Summary

Phase 4 is two subsystems sharing one correctness spine ("a result/booking is a *genuine* offer"): **(1) true-availability geospatial search** and **(2) a two-phase booking state machine** (hold → confirm) whose atomicity rests entirely on the Phase-3 `booking_no_overlap` GiST `EXCLUDE` constraint. Almost every building block already exists in the codebase and is battle-tested — the phase is predominantly *extension and composition*, not greenfield. **No new runtime dependencies are required.**

Two unknowns were genuinely load-bearing and both were verified against ground truth (not training data):

1. **The WR-03 transaction design** maps cleanly onto the installed stack. Verified from source: Drizzle 0.45.2's nested `tx.transaction()` compiles to a postgres.js **`SAVEPOINT`**, and on error postgres.js issues `ROLLBACK TO SAVEPOINT` and **re-throws** — so a per-unit-attempt savepoint lets a `23P01` roll back only that attempt while the outer tx stays usable. postgres.js's outer `begin()` does **NOT** auto-retry, so the `40P01` deadlock retry must be a caller-implemented loop wrapping the whole `db.transaction(...)`. This is exactly what the `units.ts` AUTO-COMMIT CONTRACT header predicted.

2. **PostGIS distance units.** The `listing.location` column is `geometry(Point,4326)`. `ST_DWithin` on a *geometry* measures in the SRID's units — **degrees**, not meters. The radius presets (D-33: 2/5/10/25 km) only work if both operands are cast `::geography`: `ST_DWithin(location::geography, origin::geography, meters)`. Writing `ST_DWithin(location, origin, 10000)` silently matches everything (10 000 degrees). This is the single highest-risk executor trap in the phase.

The recommended search architecture is **two-stage candidate-then-filter**: Stage 1 SQL applies the cheap/indexable predicates (bookable + radius + type/tag + price + "has operating hours this weekday" + horizon) to produce a small bounded candidate set; Stage 2 reuses the existing `getAvailability` read model per candidate to enforce the true free-window filter. This is chosen over a single monster SQL statement because it makes the search availability filter and the listing-page calendar **the same code path** — they structurally cannot diverge, which is the entire point of D-34.

**Primary recommendation:** Extend, don't rebuild. Add `expiresAt` + `quotedTotalCents` + `currency` + an idempotency mechanism to `booking` via a generated migration; rewrite `createBooking` into a transactional `createPendingHold` (outer-retry + per-unit SAVEPOINT + in-tx stale-hold sweep); add a lazy-expiry predicate (`status='confirmed' OR expires_at > now()`) to the read model's occupancy query and reuse that same predicate everywhere; build search as Stage-1 SQL + Stage-2 `getAvailability` reuse; and mint the hold via a server action (POST), never a GET side-effect.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Radius + filter + true-availability search | API/Backend (RSC + SQL + read model) | Database (PostGIS, EXCLUDE index) | Availability and bookability are money-adjacent truth — never client-derived (threat T-03-TAMPER-SLOT). Server computes, client displays. |
| Search origin geocoding (address → lat/lng) | Browser/Client (`address-autocomplete` → Photon) | API/Backend (receives lat/lng, validates bounds) | Autocomplete UX is client-side; the resolved coords flow to the server query. |
| Search params ⇄ URL state | Browser/Client (SearchBar serializes) | Frontend Server (RSC reads `searchParams`, executes) | Shareable/SEO URLs (D-32); Back-button works; RSC is the executor. |
| Price breakdown / quote | API/Backend (re-derive from read model, freeze `quotedTotalCents`) | Browser/Client (display only, `tabular-nums`) | BOOK-01/SC#2: never trust client price/time. `RailSelectionSummary`'s client estimate is display-only. |
| Pending hold create / sweep / idempotency | Database (EXCLUDE constraint = sole authority) | API/Backend (tx orchestration: SAVEPOINT, retry, sweep) | The DB makes double-booking structurally impossible; app code only orchestrates + maps errors. |
| Hold countdown timer | Browser/Client (from `expiresAt`) | API/Backend (server re-checks expiry on confirm — authority) | Client timer is a display cue; the server is the sole expiry authority (never trust the client clock). |
| Confirmation page owner-gate | API/Backend (session + `bookerId === userId`) | — | IDOR boundary (D-43) — the route group is not the gate (Security V4). |

## Standard Stack

**No new runtime packages are introduced this phase.** Everything below is already installed and version-pinned; the "stack" here is the confirmed toolchain plus the internal modules Phase 4 extends. This is the strongest possible supply-chain posture (see Package Legitimacy Audit).

### Core (verified installed versions)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js (App Router) | 16.2.7 | RSC search page, reserve page, confirmation page, server actions | Prescribed (CLAUDE.md). `params`/`searchParams` are async Promises in RSC — already the codebase convention. `[VERIFIED: package.json + src/app/listings/[id]/page.tsx]` |
| React | 19.2.7 | UI | Ships with Next 16. `[VERIFIED: package.json]` |
| Drizzle ORM | 0.45.2 | Type-safe queries + `sql` template for raw PostGIS/range; **nested tx = SAVEPOINT** | Nested `tx.transaction()` → postgres.js `savepoint()` confirmed from source (Pattern 2). `[VERIFIED: node_modules/drizzle-orm/postgres-js/session.cjs:155-164]` |
| postgres.js | 3.4.9 | Driver; `begin()` (BEGIN) + `savepoint()` (SAVEPOINT) | `begin()` re-throws without auto-retry (outer 40P01 retry is the caller's job); `savepoint()` does `ROLLBACK TO` + re-throw on error. `[VERIFIED: node_modules/postgres/cjs/src/index.js:234-289]` |
| PostgreSQL + PostGIS | 18 / 3.6 + `btree_gist` | `EXCLUDE` constraint, `ST_DWithin`/`ST_Distance`, `tstzrange` | PostGIS + btree_gist already enabled (migrations 0001/0005). `[VERIFIED: drizzle/0001_enable_postgis.sql, 0005_booking_exclusion.sql]` |
| Zod | 4.4.3 | Search-params + booking-create schemas (client + server re-validate) | Existing `slotSelectionSchema` scaffold in `src/lib/validation/booking.ts`. `[VERIFIED: package.json]` |
| date-fns + @date-fns/tz | 4.4.0 / 1.5.0 | Venue-tz interpretation of picked date/time; slot/hours math | `TZDate.toISOString()` offset-local pitfall applies (Pitfall 3). `[VERIFIED: package.json + STATE.md finding]` |
| Tailwind v4 + shadcn/radix + lucide | v4 / radix-ui 1.4.3 / lucide-react | Search bar, cards, breakdown, countdown | UI-SPEC contract; all needed primitives already installed. `[VERIFIED: 04-UI-SPEC.md Component Inventory]` |
| React Hook Form + @hookform/resolvers | 7.77.0 / 5.4.0 | Search filter form + reserve form | Mirror the `listing.ts`/`availability.ts` shared-Zod pattern. `[VERIFIED: package.json]` |

### Supporting (internal modules to EXTEND — read before writing)
| Module | Purpose | Phase-4 change |
|--------|---------|----------------|
| `src/lib/availability/units.ts` — `createBooking` + `mapBookingError` | Find-free-unit + retry; clean "just taken" copy | Rewrite into transactional `createPendingHold` (SAVEPOINT + outer retry + in-tx sweep + `status='pending'` + `expiresAt` + price snapshot + idempotency). The AUTO-COMMIT CONTRACT header is the exact spec. `[VERIFIED: units.ts:41-57]` |
| `src/lib/availability/read-model.ts` — `getAvailability` | Single server-authoritative availability | (a) Add lazy-expiry to the occupancy query (`status='confirmed' OR expires_at > now()`); (b) reuse as the per-listing free-unit predicate for search (D-34). `[VERIFIED: read-model.ts:102-107]` |
| `src/lib/availability/slots.ts` | On-the-hour slot math, horizon | Reuse to re-derive `hours`/`fullDay` server-side for the quote. `[VERIFIED]` |
| `src/lib/bookability.ts` — `deriveBookable` | Sole sell-gate (published + emailVerified + payoutsEnabled) | Search MUST replicate this predicate in SQL (see Pitfall 5 — keep in sync). `[VERIFIED: bookability.ts:16-21]` |
| `src/lib/money.ts` — `formatMoney` | Currency formatting | Reuse; promote `DISPLAY_CURRENCY="php"` to a shared module (D-46, UI-SPEC). `[VERIFIED: money.ts + listings/[id]/page.tsx:88]` |
| `src/lib/validation/booking.ts` — `slotSelectionSchema` | Client selection contract (currently unused scaffold) | Add `bookingCreateSchema` + `searchParamsSchema`; re-validate server-side. `[VERIFIED: booking.ts:19]` |
| `src/components/listing/listing-card.tsx` | Presentational card | Extend → `SearchResultCard` (omit host-action props; normalize title weight 500→600 per UI-SPEC). `[VERIFIED: listing-card.tsx]` |
| `src/components/listing/address-autocomplete.tsx` | Photon geocoder → lat/lng | Reuse for the search location field (already lifts `{lat,lng}`). `[VERIFIED: address-autocomplete.tsx]` |
| `src/components/availability/*` | `SlotPicker`, `BookingSelectionProvider`, `RailSelectionSummary` | The reserve flow consumes the SAME `SlotSelectionValue` contract. `[VERIFIED: slot-selection.ts:35]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Two-stage candidate-then-filter search | Single monster SQL (venue-tz slot enumeration in SQL) | Single-statement is theoretically fewer round-trips, but forks a SECOND availability source of truth that can drift from `getAvailability` — violates D-34's "same promise as the listing page." Rejected for correctness. See Pattern 1. |
| Reuse `cancelled` for abandoned holds | Add `expired` enum value | `cancelled` needs no migration and already sits outside the EXCLUDE partial WHERE. `expired` requires `ALTER TYPE ... ADD VALUE` (cannot run in a tx, non-removable) — only worth it for analytics. CONTEXT leans `cancelled`. |
| Server-Component `revalidatePath` for live availability | `@tanstack/react-query` | TanStack Query is optional (not installed). RSC + `revalidatePath` (the existing pattern) is sufficient for Phase-4 interactivity; adding TanStack is the planner's call and is a *new dependency* (would need the legitimacy gate). Recommend deferring it. |
| `input` min/max price popover | shadcn `slider` | Both official-registry. min/max is the baseline (UI-SPEC); slider is a nicety. |

**Installation:** none required. Optional (planner's discretion, both already vetted): shadcn `slider` / `sheet` via the official registry (`npx shadcn@latest add slider sheet`); `@tanstack/react-query` (a *new* dep — would trigger the legitimacy gate; recommend deferring).

**Version verification:** all versions above were read from `package.json` and installed `node_modules` package.json files on 2026-07-14 — not training data.

## Package Legitimacy Audit

> This phase installs **no new external packages**. The audit therefore covers only the optional adds a planner *might* pull in.

| Package | Registry | Status | Source Repo | slopcheck | Disposition |
|---------|----------|--------|-------------|-----------|-------------|
| (all runtime deps) | npm | already installed & in use since Phases 1–3 | — | n/a (pre-vetted) | Approved — no change |
| `slider`, `sheet` (shadcn blocks) | shadcn **official** registry | copy-in components, not npm deps | shadcn/ui | n/a | Optional — official registry, safety gate not triggered (`components.json` declares `registries: {}`) |
| `@tanstack/react-query` | npm | **NOT installed** | github.com/TanStack/query | not run (unavailable) | **DEFER** — a new dep; if the planner adds it, gate behind `checkpoint:human-verify` + run the legitimacy gate first |

**Packages removed due to slopcheck [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

*`slopcheck` and `ctx7` were unavailable in this environment (`command -v` returned not-found). Per protocol, any NEW package the planner introduces must be tagged `[ASSUMED]` and gated behind a `checkpoint:human-verify` task before install. Because this phase introduces zero new runtime deps, the exposure is nil.*

## Architecture Patterns

### System Architecture Diagram

```
SEARCH FLOW (SEARCH-01..05)
  Browser: SearchBar (RHF)  ──serialize params──▶  URL (?q&type&date&start&end&priceMax&radius&sort&page)
     │ location field = address-autocomplete → Photon → {lat,lng}                    │
     ▼                                                                                ▼
  RSC /  (app/page.tsx)  ──await searchParams──▶  Zod searchParamsSchema.safeParse
     │
     ▼
  STAGE 1 — SQL candidate query (Drizzle `sql`):
     bookable predicate (published ∧ emailVerified ∧ payoutsEnabled)     ← mirror deriveBookable (Pitfall 5)
     ∧ ST_DWithin(location::geography, origin::geography, radius_m)       ← ::geography cast (Pitfall 1)
     ∧ (primary_space_type::text = $category OR EXISTS listing_activity_tag.tag = $category)          ← D-35
     ∧ hourly_rate_cents BETWEEN $min AND $max                           ← D-46
     ∧ EXISTS operating_hours WHERE day_of_week = EXTRACT(DOW FROM $date) ← cheap "open that weekday"
     ORDER BY ST_Distance(::geography) | hourly_rate_cents  LIMIT+OFFSET  ← D-37/D-32
     │  returns a SMALL bounded candidate set (single city, bookable-only, D-30/D-16)
     ▼
  STAGE 2 — true free-window filter (TS, per candidate):
     getAvailability(db, listingId, pickedDay)   ← SAME read model the listing page uses (D-34)
     keep iff: date-only → any slot.state==='available'
               date+time → every on-the-hour slot in [start,end) has freeUnits ≥ 1
     │
     ▼
  SearchResults → SearchResultCard[]  (photo, title, ₱/hr·₱/day, distance km, optional "Available {t}")

BOOKING FLOW (BOOK-01..03)
  Listing "Book this space" (server action, POST — NOT a GET Link)   ← Pitfall 2
     │ session + canBook gate (D-41); re-derive bookable server-side
     ▼
  placeHold(listingId, selection, idemKey)  ─────────────────────────────┐
     │  db.transaction  ⟲ outer retry on 40P01 (postgres.js won't)        │ Pattern 2
     │   1. own-hold pre-check (idempotency) → return existing if present  │ Pattern 6
     │   2. SWEEP overlapping stale pending holds → 'cancelled' (in-tx)    │ Pattern 5 / D-48b
     │   3. re-derive window+price from read model → quotedTotalCents      │ Pattern 4
     │   4. loop units: tx.transaction (SAVEPOINT) { INSERT status=pending}│
     │        23P01 → ROLLBACK TO SAVEPOINT, try next unit (outer tx OK)   │
     │        40P01 → abort tx → outer retry                               │
     └──▶ redirect /listings/[id]/book?hold=<id>                          ─┘
     ▼
  Reserve page (RSC, owner-gated read of the hold) + HoldCountdown(expiresAt) + PriceBreakdown(frozen quote)
     │ Confirm (server action): re-check expiresAt>now ∧ status=pending → UPDATE pending→confirmed
     ▼
  redirect /bookings/[id]  (RSC, owner-gated, durable, FIT-XXXXXXXX reference)

READ-MODEL LAZY EXPIRY (D-48a) — applies to BOTH the calendar and search Stage-2:
  occupancy query WHERE status='pending'|'confirmed'  →  WHERE status='confirmed' OR expires_at > now()
```

### Recommended Project Structure
```
src/
├── app/
│   ├── page.tsx                        # REPLACE scaffold → search home RSC (D-29)
│   ├── listings/[id]/book/page.tsx     # reserve page RSC (owner-gated hold read)
│   ├── bookings/[id]/page.tsx          # confirmation RSC (owner-gated, durable)
│   └── actions/
│       ├── search.ts                   # (optional) server action for client-side refetch
│       └── booking.ts                  # placeHold + confirmBooking server actions
├── lib/
│   ├── search/
│   │   └── query.ts                    # Stage-1 SQL + Stage-2 read-model filter
│   ├── availability/
│   │   ├── units.ts                    # createBooking → createPendingHold (WR-03)
│   │   └── read-model.ts               # + lazy-expiry predicate; + batched multi-listing variant
│   ├── booking/
│   │   ├── pricing.ts                  # server-side quote (hours×hourly | dayRate)
│   │   └── reference.ts                # FIT-XXXXXXXX generator (Crockford base32)
│   ├── money.ts                        # + promote DISPLAY_CURRENCY to shared const
│   └── validation/booking.ts           # + searchParamsSchema + bookingCreateSchema
├── components/
│   ├── search/                         # SearchBar, SearchResults, SearchResultCard, empty states
│   └── booking/                        # ReservePage bits, PriceBreakdown, HoldCountdown, HoldExpiredState
scripts/
└── seed.ts                             # D-38 lightweight bookable seed set (extend UAT seed)
drizzle/
└── 0006_booking_hold.sql (+ generated) # new columns + partial unique idempotency index (+ optional geog index)
```

### Pattern 1: True-availability search = candidate-then-filter (D-34, SEARCH-03)
**What:** Stage-1 SQL narrows to a bounded candidate set using indexable predicates; Stage-2 reuses `getAvailability` to enforce the free-window filter.
**When to use:** The recommended default. Correctness-first, and structurally identical to the listing page.
**Key insight:** *Day-of-week is timezone-independent for a calendar date* — `2026-08-03` is a Monday everywhere. So Stage-1 can filter "open this weekday" with `EXTRACT(DOW FROM $date::date)` (Postgres DOW 0=Sun..6=Sat matches `operating_hours.day_of_week`) **without** any tz math. The venue tz only matters when converting slot wall-clock to UTC instants — which Stage-2's read model already handles. `[VERIFIED: read-model.ts venueDayOfWeek + operating_hours schema; CITED: Postgres EXTRACT(DOW) semantics]`
**Example (Stage-1 shape — Drizzle `sql`, all user input parameter-bound):**
```typescript
// Source: composes patterns proven in read-model.ts + bookability.ts. Origin present only when a
// location is chosen (D-30 default city view omits radius). ALWAYS ::geography for a metric radius.
const rows = await db.execute(sql`
  SELECT l.id, l.title, l.primary_space_type, l.hourly_rate_cents, l.day_rate_cents,
         l.timezone, l.city,
         ${origin ? sql`ST_Distance(l.location::geography, ${originGeog}::geography) AS distance_m` : sql`NULL AS distance_m`}
  FROM listing l
  JOIN "user" u ON u.id = l.host_id
  LEFT JOIN host_payout hp ON hp.user_id = u.id
  WHERE l.status = 'published' AND l.deleted_at IS NULL
    AND u.email_verified = true
    AND COALESCE(hp.payouts_enabled, false) = true          -- mirrors deriveBookable (Pitfall 5)
    ${origin ? sql`AND ST_DWithin(l.location::geography, ${originGeog}::geography, ${radiusMeters})` : sql``}
    ${category ? sql`AND (l.primary_space_type::text = ${category}
        OR EXISTS (SELECT 1 FROM listing_activity_tag t WHERE t.listing_id = l.id AND t.tag = ${category}))` : sql``}  -- single combined param (D-35); ::text avoids an enum-cast error on an activity-tag value; gate on category presence, not a space-type value
    ${priceMax != null ? sql`AND l.hourly_rate_cents <= ${priceMax}` : sql``}
    ${pickedDate ? sql`AND EXISTS (SELECT 1 FROM operating_hours oh
        WHERE oh.listing_id = l.id AND oh.day_of_week = EXTRACT(DOW FROM ${pickedDate}::date))` : sql``}
  ORDER BY ${sortByPrice ? sql`l.hourly_rate_cents ASC, l.created_at DESC` : sql`distance_m ASC NULLS LAST, l.created_at DESC`}  -- created_at DESC = stable curated/newest tiebreaker (no-origin default: all distance_m NULL, D-30)
  LIMIT ${pageSize + 1} OFFSET ${page * pageSize}          -- +1 = "has more" probe (D-32 Load more)
`);
// originGeog: build as ST_SetSRID(ST_MakePoint(lng, lat), 4326) — x=lng, y=lat (Pitfall 4).
// Then Stage 2: filter `rows` by getAvailability(...) free-window (batched to avoid N+1 — see below).
```
**Batched Stage-2 (avoid N+1):** for a handful of candidates a per-listing `getAvailability` loop is fine; as the catalog grows, add `getAvailabilityForListings(db, ids, day)` that fetches hours/blocks/occupancy for all candidate ids in 3 queries and composes per-listing in TS — reusing the *same* slot-composition logic so there is still one source of truth. `[ASSUMED — recommended shape; not yet built]`

### Pattern 2: WR-03 two-phase booking transaction (D-48, BOOK-02/03)
**What:** One outer `db.transaction` (with a caller-implemented outer retry for `40P01`) containing an in-tx stale-hold sweep, then a per-unit-attempt **SAVEPOINT** loop so a `23P01` rolls back only that attempt.
**Verified mechanics (from installed source, not docs):**
- Drizzle nested `tx.transaction(fn)` → `this.session.client.savepoint(fn)` → postgres.js emits `SAVEPOINT sN`. `[VERIFIED: drizzle-orm/postgres-js/session.cjs:155-164]`
- On throw inside a savepoint scope, postgres.js runs `ROLLBACK TO sN` and **re-throws** — the outer tx remains valid, so the loop can continue. `[VERIFIED: postgres/cjs/src/index.js:267-273]`
- The outer `begin()` **re-throws without retrying** — `40P01` (which aborts the *entire* tx; a savepoint cannot rescue it) requires a loop around the whole `db.transaction(...)`. `[VERIFIED: postgres/cjs/src/index.js:247-249]`
**Example (the exact target shape):**
```typescript
// Source: derived from the units.ts AUTO-COMMIT CONTRACT + verified postgres.js/Drizzle savepoint behavior.
export async function createPendingHold(db: DbConn, input: CreatePendingHoldInput): Promise<HoldResult> {
  const MAX_TX_RETRIES = 3; // 40P01 deadlock retries
  for (let txAttempt = 0; ; txAttempt++) {
    try {
      return await db.transaction(async (tx) => {
        // (6) idempotency: a booker's own active hold for this exact window is a REPLAY, not a conflict.
        const existing = await findOwnActiveHold(tx, input); // (listingId, bookerId, [start,end)) pending-unexpired|confirmed
        if (existing) return { ok: true, id: existing.id, unit: existing.unit, replayed: true };

        // (5) sweep-on-write: expire overlapping STALE pending holds so the constraint sees the freed slot.
        await tx.execute(sql`
          UPDATE booking SET status = 'cancelled'
          WHERE listing_id = ${input.listingId} AND status = 'pending' AND expires_at <= now()
            AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${startIso}, ${endIso}, '[)')`);

        // (4) server-authoritative quote (never trust client price/time) — Pattern 4.
        const quote = await quoteWindow(tx, input); // re-derives hours/fullDay + price from the read model

        for (let u = 0; u < input.unitCount; u++) {
          const unit = pickLowestFreeUnit(tx, input);           // advisory probe (uses lazy-expiry predicate)
          if (unit == null) throw new NoUnitAvailableError();
          try {
            await tx.transaction(async (sp) => {                // ← SAVEPOINT
              await sp.insert(booking).values({ id: randomUUID(), status: "pending",
                expiresAt: quote.expiresAt, quotedTotalCents: quote.totalCents, currency: "php",
                idempotencyKey: input.idemKey, unit, /* …window, ids… */ });
            });
            return { ok: true, id, unit, replayed: false };     // won the slot
          } catch (e) {
            if (isPgError(e, "23P01")) continue;                // rolled back to savepoint → try next unit
            if (isPgError(e, "23505")) return await returnOwnDuplicate(tx, input.idemKey); // concurrent same-key
            throw e;                                            // 40P01/other → abort tx
          }
        }
        throw new NoUnitAvailableError();
      });
    } catch (e) {
      if (isPgError(e, "40P01") && txAttempt < MAX_TX_RETRIES - 1) continue; // outer retry (postgres.js won't)
      return mapBookingError(e); // NoUnitAvailableError|23P01|40P01 → "just taken"; else rethrow
    }
  }
}
```
**Critical:** keep `db` (not the raw auto-commit connection) — the whole point is a real transaction now. The find-free probe must run *inside* the outer tx (after the sweep) so it sees swept state.

### Pattern 3: Read-model lazy expiry (D-48a)
**What:** A `pending` row past `expires_at` counts as **free** in reads. One-line predicate change, reused everywhere occupancy is read.
**Change:** in `read-model.ts`, `units.ts` probe, and the search Stage-2, replace `status IN ('pending','confirmed')` with `(status = 'confirmed' OR (status = 'pending' AND expires_at > now()))`. Use SQL `now()` (DB clock, single source) not a client timestamp.
**Why both lazy reads AND sweep-on-write are required (the crux of D-48):** the `EXCLUDE` constraint physically still counts an unexpired-in-DB but past-`expiresAt` `pending` row as occupying (it has no time awareness). So there is a window where a stale hold is shown *free* by lazy reads yet would still `23P01` an insert. Sweep-on-write closes that gap by flipping the stale hold out of the occupying set **in the same tx** before inserting. Lazy reads keep the UI honest; sweep keeps the write path from failing against a slot the UI showed free. Neither alone is sufficient. `[VERIFIED: EXCLUDE partial WHERE in 0005 + read-model occupancy query]`

### Pattern 4: Server-quoted, frozen price (BOOK-01, D-45/D-46)
**What:** At hold time, re-derive `hours`/`fullDay` from the read model and compute `hourlyRateCents × hours` or `dayRateCents`; store as `quotedTotalCents` (+ `currency='php'`). The reserve breakdown and confirmation display *this frozen value*, never a client recompute.
**Why frozen:** Phase 5 charges against `quotedTotalCents` — the snapshot must not move if rates change between hold and charge. `RailSelectionSummary` computes the same figure client-side, but that is **display-only**; the server value is authoritative. `[VERIFIED: RailSelectionSummary in availability-calendar.tsx:251 + CLAUDE.md "never trust the client for price/time"]`

### Pattern 5: Hold-on-entry via a server action, not a GET (BOOK-02, D-39)
**What:** The "Book this space" control is a **server action (POST)** that creates the hold then `redirect()`s to `/listings/[id]/book?hold=<id>`. The reserve page RSC then only *reads* the hold (owner-gated).
**Why:** Creating the hold in the reserve-page RSC body (a GET) means every prefetch, refresh, or Back-navigation spawns a duplicate hold and burns inventory. A server action is the correct mutation boundary. UI-SPEC already specifies "created on GET/entry (server action)" — implement it as an action, not a side-effecting render. (Anti-Pattern below.)

### Pattern 6: Idempotency = own-hold pre-check + unique backstop (D-42, BOOK-03)
**What:** Two complementary guards so a double-submit returns the SAME booking:
1. **In-tx own-hold pre-check (primary):** before inserting, `SELECT` this booker's active (pending-unexpired | confirmed) hold for `(listingId, startsAt, endsAt)`. If present, return it. This handles re-entering checkout for a window you already hold.
2. **Partial-unique backstop (race):** an `idempotencyKey` column + `CREATE UNIQUE INDEX ... WHERE idempotency_key IS NOT NULL`. A concurrent same-key insert loses with **`23505` (unique_violation)** → catch → `SELECT` and return the winner's row.
**The load-bearing distinction:** `23P01` = *someone else* took the slot → "just taken." `23505` on the idempotency key (or an own-hold hit) = *your own duplicate* → return the existing booking. **Never conflate them** — conflating is exactly the D-42 failure ("the DB constraint alone would wrongly tell the booker their own slot was taken").
**Key source (recommendation):** the **derived** identity `(listingId, bookerId, startsAt, endsAt)` among active holds is the most robust for D-42's "my own slot" case; a **client-minted token** (`crypto.randomUUID()` at Book-action time, threaded to confirm) is a complementary tightener for the exact double-click. Recommend the derived pre-check as primary + the token column as the unique backstop. Drizzle can express the partial unique index: `uniqueIndex("booking_idem_uq").on(t.idempotencyKey).where(sql\`idempotency_key IS NOT NULL\`)`. `[ASSUMED — design recommendation; A2/A3 in Assumptions Log]`

### Anti-Patterns to Avoid
- **Creating the hold in the reserve-page RSC render (GET side-effect):** duplicates holds on prefetch/refresh. Use a server action + redirect (Pattern 5).
- **`ST_DWithin(location, origin, meters)` on the geometry column:** silently matches everything (degrees, not meters). Always `::geography` both sides (Pitfall 1).
- **App-level "query conflicts then insert":** the exact race CLAUDE.md forbids. The `EXCLUDE` constraint is the sole authority; the find-free probe is advisory only.
- **Wrapping the current `createBooking` loop in `db.transaction` without per-attempt savepoints:** the first `23P01` aborts the whole tx; the next probe throws `25P02` → raw 500 (the precise trap `units.ts` documents). Add the SAVEPOINT (Pattern 2).
- **A second SQL availability predicate for search** separate from `getAvailability`: two sources of truth that drift. Reuse the read model (Pattern 1).
- **Trusting the client countdown / client price:** the server re-checks `expires_at > now()` on confirm and re-derives the quote. Client timer is a display cue only.
- **Binding a JS `Date` into a raw `sql` range template:** postgres.js throws `ERR_INVALID_ARG_TYPE`. Bind ISO strings; keep `Date` only for the Drizzle timestamptz insert (Pitfall 3).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Double-booking prevention | App-level conflict check | Postgres GiST `EXCLUDE` (`booking_no_overlap`, already live) | The only race-free option; app checks have a TOCTOU window that takes real money twice. `[VERIFIED: 0005]` |
| Per-attempt rollback under concurrency | Manual `SAVEPOINT` SQL strings | Drizzle nested `tx.transaction()` | Compiles to correct `SAVEPOINT`/`ROLLBACK TO`; hand-written savepoint names collide. `[VERIFIED: session.cjs]` |
| Metric radius / distance | Haversine in JS, `cube`/`earthdistance`, bounding-box math | `ST_DWithin`/`ST_Distance` with `::geography` | Spheroid-accurate, index-assisted, one expression. PostGIS already enabled. `[CITED: postgis.net]` |
| Timezone/DST slot math | Fixed-ms arithmetic, manual offsets | `@date-fns/tz` `TZDate` (existing `slots.ts`) | DST-correct for every IANA zone; region-capable for free. `[VERIFIED: slots.ts]` |
| Availability derivation for search | Re-deriving free units in SQL | Reuse `getAvailability` | One source of truth = search and listing page can't diverge (D-34). `[VERIFIED]` |
| Geocoding / autocomplete | Custom address parser | `address-autocomplete` (Photon) | Already built, debounced, graceful-degrade, lifts `{lat,lng}`. `[VERIFIED]` |
| Currency formatting | Ad-hoc string building | `formatMoney` | One definition; PHP handled by `Intl` → ₱. `[VERIFIED: money.ts]` |

**Key insight:** In this domain the database *is* the business logic (the EXCLUDE constraint, `tstzrange`, PostGIS). Hand-rolled equivalents in app code reintroduce exactly the race conditions and correctness gaps the DB primitives were chosen to eliminate.

## Common Pitfalls

### Pitfall 1: `ST_DWithin` on `geometry(Point,4326)` measures in degrees, not meters (SEARCH-01) — HIGHEST RISK
**What goes wrong:** `ST_DWithin(location, origin, 10000)` matches every listing on Earth (10 000 *degrees*); the radius filter silently no-ops, so search "works" in dev with a tiny seed and fails to filter in reality.
**Why:** SRID 4326 is lat/lng in degrees; `ST_DWithin` on *geometry* uses the SRID's units. `[CITED: postgis.net/docs/ST_DWithin.html, ST_Distance.html]`
**How to avoid:** cast both operands `::geography` so the unit is meters: `ST_DWithin(location::geography, origin::geography, radius_meters)`. Distance for cards: `ST_Distance(location::geography, origin::geography)` (meters → km).
**Warning signs:** every listing appears regardless of radius; distances look like tiny fractions.
**Performance note:** the existing `listing_location_gist` (a *geometry* GiST index) does not serve the geography cast. At single-city/bookable-only scale a seq scan is fine (D-38). For a performance seam, add a functional index `CREATE INDEX listing_location_geog_gist ON listing USING gist ((location::geography));` (hand-authored migration, like 0001/0005). `[ASSUMED — perf seam; A4]`

### Pitfall 2: Duplicate holds from GET side-effects (BOOK-02)
**What goes wrong:** placing the hold in the reserve-page render creates a new pending row on every prefetch/refresh/Back, exhausting inventory and littering the calendar.
**How to avoid:** Pattern 5 — hold creation is a server action (POST) + redirect; the reserve page only reads. The own-hold idempotency pre-check (Pattern 6) is the second line of defense.

### Pitfall 3: `TZDate.toISOString()` is offset-local; `Date` won't bind into raw ranges
**What goes wrong:** (a) `TZDate.toISOString()` renders `…+08:00`, not UTC `Z`; using it as a UTC instant shifts times by the offset. (b) Binding a JS `Date` into a raw `sql` range template throws `ERR_INVALID_ARG_TYPE`.
**How to avoid:** normalize via the epoch — `new Date(tzDate.getTime()).toISOString()`; bind **ISO strings** into `sql` range templates (postgres.js casts string→timestamptz), keep `Date` only for Drizzle timestamptz inserts. Both conventions are already established. `[VERIFIED: STATE.md 03-02 findings + slots.ts:41-45 + units.ts:63-64]`

### Pitfall 4: PostGIS axis order x=lng / y=lat
**What goes wrong:** building the origin as `ST_MakePoint(lat, lng)` puts the point in the ocean; radius returns nothing/garbage.
**How to avoid:** `ST_SetSRID(ST_MakePoint(lng, lat), 4326)` — longitude first. The schema stores `{ x: lng, y: lat }`; Photon returns `[lng, lat]`. `[VERIFIED: schema.ts:171 + address-autocomplete.tsx:67]`

### Pitfall 5: Search bookability predicate drifting from `deriveBookable`
**What goes wrong:** `deriveBookable` (TS) is the sole sell-gate, but the search SQL must inline the same predicate (`published ∧ emailVerified ∧ payoutsEnabled`). If the two drift (e.g. `deriveBookable` later adds a condition), search shows non-bookable listings (violates D-16) or hides bookable ones.
**How to avoid:** put a comment in the search query pointing at `bookability.ts`, and add a test that seeds each non-bookable reason (draft / unverified email / payouts disabled) and asserts exclusion from search (mirrors `tests/listing/status-gate.test.ts`). `[VERIFIED: bookability.ts:16-21]`

### Pitfall 6: Conflating `23P01` (someone else) with `23505`/own-hold (yourself)
**What goes wrong:** a booker double-clicks their own slot and sees "that time was just taken" — the exact D-42 failure.
**How to avoid:** Pattern 6 — own-hold pre-check returns the existing booking; `23505` on the idempotency key returns the winner; only `23P01`/`40P01`/exhaustion map to "just taken."

### Pitfall 7: `now()` vs `now: Date` parameter for expiry
**What goes wrong:** using the read model's injectable `now: Date` (server wall-clock) for the *occupancy* lazy-expiry predicate while the sweep uses SQL `now()` can produce off-by-a-tick disagreements under load.
**How to avoid:** use SQL `now()` (transaction-start timestamp, one DB clock) for the lazy-expiry predicate and the sweep. Keep the injectable `now` only for slot past/horizon *state* (its existing, test-friendly purpose). `[VERIFIED: read-model.ts:60,151-153]`

### Pitfall 8: `hasMore` / Load-more pagination correctness (D-32)
**What goes wrong:** counting total rows for pagination is expensive and races with new listings; naive `OFFSET` with a changing set skips/repeats.
**How to avoid:** fetch `LIMIT pageSize + 1`; if `pageSize+1` rows come back, there's a next page (drop the extra). For a single-city catalog `OFFSET` is acceptable; a keyset cursor is a later optimization. Note: Stage-2 availability filtering can drop candidates *after* the SQL limit — either over-fetch Stage-1 (e.g. `pageSize * 2 + 1`) or filter-then-page in TS for correctness at small scale. `[ASSUMED — A5]`

## Code Examples

### Building the search origin + radius (verified axis order + geography)
```typescript
// Source: schema.ts axis-order comment + postgis.net. lng FIRST; ::geography for meters.
const originGeog = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
const radiusMeters = radiusKm * 1000; // presets 2/5/10/25 km (UI-SPEC)
// WHERE ... ST_DWithin(l.location::geography, ${originGeog}, ${radiusMeters})
// SELECT ST_Distance(l.location::geography, ${originGeog}) AS distance_m  → /1000 for "X.X km away"
```

### Lazy-expiry occupancy predicate (reused in read model, probe, and search Stage-2)
```typescript
// Source: read-model.ts occupancy query + D-48a. Replace the status IN (...) filter with:
sql`AND (status = 'confirmed' OR (status = 'pending' AND expires_at > now()))`
// Half-open '[)' overlap and listing scoping stay IDENTICAL to the EXCLUDE constraint.
```

### Concurrency proof harness (already exists — extend for holds)
```typescript
// Source: tests/availability/exclusion-race.test.ts. Independent connections = a REAL race
// (a max:1 client serializes and proves nothing — Pitfall in that file).
const [a, b] = makeRacingClients(testDb.schema, 2);
const results = await Promise.allSettled([placeHoldVia(a, window), placeHoldVia(b, window)]);
// exactly one fulfilled; loser rejected with 23P01 or 40P01 (both map to "just taken").
```

## Runtime State Inventory

> Phase 4 is a **feature phase with a schema extension**, not a rename/refactor/migration of existing runtime keys. A formal rename inventory does not apply, but the schema-change surface is enumerated here for the planner.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | The `booking` table gains `expiresAt`, `quotedTotalCents`, `currency`, `idempotencyKey`. **No existing `pending`/`confirmed` rows exist in dev or UAT** (Phase 3 shipped `bookingMode` stored but no booking-write flow; UAT seed has listings only, no bookings). New nullable columns are backfill-safe. | Generated migration; `expiresAt` nullable (only meaningful while `pending`). None to backfill. |
| Live service config | None. No external service stores Phase-4 state (payments are Phase 5). | None — verified: no queue/worker (D-48), no PayMongo call this phase. |
| OS-registered state | None. No cron/scheduler — expiry is sweep-on-write + lazy reads (D-48), not a timed job. | None — verified by D-48 (no background infra). |
| Secrets/env vars | None new. `DATABASE_URL`, Better Auth secrets, Cloudinary already set (MEMORY seed doc). Photon needs no key. | None. |
| Build artifacts | Drizzle migration journal (`drizzle/meta`) updates on `db:generate`. Test harness replays all `drizzle/*.sql` into isolated schemas — new migration must be idempotent-safe there (follow the `IF NOT EXISTS` convention for any hand-authored index). | Run `npm run db:generate` + `db:migrate`; hand-author the partial-unique / optional geography index with `IF NOT EXISTS`. |

**Migration ordering note:** new columns via `drizzle-kit generate` (schema.ts edit); the partial-unique idempotency index is Drizzle-expressible; a functional `(location::geography)` GiST index (if added) is hand-authored like 0001/0005. Enum change (`expired`) — only if chosen — is a hand-authored `ALTER TYPE ... ADD VALUE` (cannot run in a tx). `[VERIFIED: tests/helpers/db.ts replay + schema.ts EXCLUDE note]`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `createBooking` auto-commit + per-INSERT retry (Phase 3) | `createPendingHold` real transaction: outer 40P01 retry + per-unit SAVEPOINT + in-tx sweep (WR-03) | Phase 4 (this) | The deferred WR-03 contract in `units.ts` is now built. `[VERIFIED: units.ts header]` |
| Occupancy = `status IN ('pending','confirmed')` | + lazy expiry: `confirmed OR (pending AND expires_at > now())` | Phase 4 (D-48a) | Stale holds never over-occupy the calendar/search. |
| Listing page shows availability; search shows all published | Search shows only true-free-window results via the read model (D-34) | Phase 4 | Search results become genuine offers. |
| `DISPLAY_CURRENCY="php"` local const on the listing page | Promoted to a shared module (D-46) | Phase 4 | All price surfaces share one currency source. |

**Deprecated/outdated:**
- `createBooking`'s auto-commit-only contract is superseded by `createPendingHold` — but keep `mapBookingError` (it already handles 23P01/40P01/NoUnitAvailable).
- Don't introduce `@tanstack/react-query` unless a concrete live-refetch need appears — RSC + `revalidatePath` (the existing pattern) covers Phase-4 interactivity and avoids a new dependency.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Two-stage candidate-then-filter is the right search architecture (vs single SQL) | Pattern 1 | If the catalog grows huge, N read-model calls could be slow — mitigated by the batched variant + bounded bookable/city set. Low risk at v1. |
| A2 | Idempotency key source = derived `(listingId,bookerId,window)` own-hold pre-check + client-token unique backstop | Pattern 6 | Explicitly Claude's-discretion (D-42). If the planner prefers pure client-token, the own-hold pre-check is still needed or D-42's false-"just taken" returns. |
| A3 | Reuse `cancelled` for abandoned holds (not a new `expired` value) | Alternatives / D-49 | Low — both sit outside the EXCLUDE partial WHERE. `expired` only affects analytics granularity. |
| A4 | A functional `(location::geography)` GiST index is the perf seam if radius search is slow | Pitfall 1 | Low — optional; seq scan is fine at single-city/bookable-only scale (D-38). |
| A5 | Over-fetch/keyset for Load-more; Stage-2 filtering may drop below page size | Pitfall 8 | Medium — needs a concrete pagination decision; over-fetch Stage-1 is the simple correct default. |
| A6 | Booking reference `FIT-XXXXXXXX` is a stored column generated at insert (Crockford base32), URL uses the opaque id | Project Structure / UI-SPEC | Low — UI-SPEC locks the format; generation is planner's call. |
| A7 | No existing prod/UAT bookings, so new columns are backfill-safe | Runtime State Inventory | Low — verified via STATE.md (no booking-write flow shipped) + MEMORY seed doc (listings only). |

**These `[ASSUMED]` items were resolved at plan time (see § Open Questions (RESOLVED))** — A2 (idempotency source → ship both, 04-01 T1 + 04-04 T2) and A5 (pagination → over-fetch, 04-03 T2). A3 (`cancelled` vs `expired`) is delegated to Claude's discretion (lean `cancelled`).

## Open Questions (RESOLVED)

> All three questions were resolved at plan time; each carries an inline resolution note pointing at the deciding plan/task.

1. **Idempotency-key source (A2).** Derived-from-window vs client-token vs both.
   - What we know: D-42 requires a booker's own double-click to return the same booking; the EXCLUDE constraint alone produces a false "just taken."
   - What's unclear: whether to also mint a client token (tighter exact-double-click dedup) or rely solely on the own-hold pre-check.
   - Recommendation: implement the own-hold pre-check as primary (covers re-entry + double-click of a window) and add a nullable `idempotencyKey` + partial-unique as the concurrent-race backstop. Ship both.
   - **RESOLVED — ship BOTH (Plan 04-01 Task 1 + Plan 04-04 Task 2):** the nullable `idempotencyKey` column + partial-unique index land in 04-01 Task 1; the derived own-hold pre-check (primary) + the `23505` partial-unique backstop land in 04-04 Task 2 (`createPendingHold`).

2. **Pagination under Stage-2 filtering (A5).** Availability filtering happens after the SQL page limit.
   - Recommendation: over-fetch Stage-1 (e.g. `pageSize*2+1`) and page in TS, or accept a keyset cursor. Decide at plan time; correctness (no skipped/duplicated cards) over cleverness.
   - **RESOLVED — over-fetch (Plan 04-03 Task 2):** Stage-2 over-fetches Stage-1 (`LIMIT pageSize*2+1`) and computes the final `hasMore` after availability filtering; OFFSET paging at single-city scale (keyset cursor deferred).

3. **"Near me" geolocation in the first cut?** (D-33, Claude's discretion.)
   - Recommendation: ship typed autocomplete first (the primary path already exists); add `Use my location` (`navigator.geolocation` → lat/lng into the same query) as a fast-follow if time allows. Not on the critical path.
   - **RESOLVED — fast-follow (Plan 04-05 Task 2):** typed autocomplete is the primary path this phase; `Use my location` (`navigator.geolocation`) is an OPTIONAL fast-follow in the SearchBar, not on the critical path.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL + PostGIS | radius search, EXCLUDE, ranges | ✓ | 18 / 3.6 (`postgis/postgis:18-3.6`) | — |
| `btree_gist` extension | the EXCLUDE constraint | ✓ (migration 0005) | — | — |
| PostGIS `geography` functions | metric radius/distance | ✓ (comes with PostGIS) | — | — |
| Photon geocoder (photon.komoot.io) | search origin autocomplete | ✓ (external, no key) | — | Degrades gracefully (no suggestions); LocationIQ is the D-18 drop-in |
| Docker local DB | dev/test/E2E | ✓ | per MEMORY seed doc | — |
| Redis / BullMQ / Inngest | (not used — D-48) | ✗ (intentional) | — | Sweep-on-write + lazy reads (D-48) |

**Missing dependencies with no fallback:** none — every hard dependency is present.
**Missing dependencies with fallback:** background-job infra is intentionally absent (D-48); Photon degrades gracefully.

## Validation Architecture

> `workflow.nyquist_validation: true` — this section is included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 (integration, per-worker isolated Postgres schema) + Playwright 1.60 (E2E) |
| Config file | `vitest.config.ts`, `playwright.config.ts` (both present) |
| Quick run command | `npx vitest run tests/booking tests/search` (targeted) |
| Full suite command | `npm test` (Vitest) + `npm run test:e2e` (Playwright) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOOK-03 | Concurrent overlapping holds → exactly one wins; loser 23P01/40P01 → "just taken" | integration (race) | `npx vitest run tests/booking/pending-hold.test.ts -t "concurrent"` | ❌ Wave 0 (extend `exclusion-race.test.ts` pattern) |
| BOOK-03 | Double-click / same idempotency key → exactly ONE booking, returns SAME id (never "just taken") | integration (race) | `npx vitest run tests/booking/pending-hold.test.ts -t "idempoten"` | ❌ Wave 0 |
| BOOK-02 | WR-03: 23P01 in savepoint retries next unit within one outer tx (no 25P02); 40P01 → outer retry | integration | `npx vitest run tests/booking/pending-hold.test.ts -t "savepoint"` | ❌ Wave 0 |
| BOOK-02 | Stale hold (`expires_at` past) → read model shows free (lazy) AND a new hold succeeds (sweep) | integration | `npx vitest run tests/booking/hold-expiry.test.ts` | ❌ Wave 0 |
| SEARCH-03 | True free-window filter: no-free listing excluded; free listing included; date-only vs date+time; block honored; venue-tz | integration | `npx vitest run tests/search/availability-filter.test.ts` | ❌ Wave 0 |
| SEARCH-01 | Radius: `::geography` returns within-N-km, excludes beyond; distance value correct | integration | `npx vitest run tests/search/radius.test.ts` | ❌ Wave 0 (seed known coords) |
| SEARCH-02/04 | Activity type OR tag match; price filter | integration | `npx vitest run tests/search/filters.test.ts` | ❌ Wave 0 |
| D-16 | Non-bookable (draft / unverified email / payouts-off) never appears in search | integration | `npx vitest run tests/search/bookable-gate.test.ts` | ❌ Wave 0 (mirror `status-gate.test.ts`) |
| BOOK-01/SC#2 | Server re-derives price (hours×hourly \| dayRate); tampered client price ignored; PHP | unit + integration | `npx vitest run tests/booking/pricing.test.ts` | ❌ Wave 0 |
| BOOK-01 | State machine: pending→confirmed; pending→cancelled on expiry; confirm re-checks expiry | integration | `npx vitest run tests/booking/state-machine.test.ts` | ❌ Wave 0 |
| BOOK-02/03 | Confirmation page owner-gated (non-owner → 404/gated) | integration/E2E | included in E2E + a unit gate test | ❌ Wave 0 |
| SEARCH-05 + full flow | search → filter → card → listing → Book → reserve (countdown) → Confirm → confirmation; + expiry UX | E2E | `npm run test:e2e -- search-and-book` | ❌ Wave 0 (mirror `e2e/availability.spec.ts`) |

### Sampling Rate
- **Per task commit:** targeted `npx vitest run tests/booking` or `tests/search` for the touched area (< 30 s).
- **Per wave merge:** `npm test` (full Vitest integration suite).
- **Phase gate:** full Vitest + Playwright green before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `src/lib/validation/booking.ts` — add `searchParamsSchema` + `bookingCreateSchema` (scaffold `slotSelectionSchema` exists)
- [ ] `tests/booking/pending-hold.test.ts` — concurrency + idempotency + savepoint (extend `makeRacingClients`)
- [ ] `tests/booking/hold-expiry.test.ts` — lazy read + sweep (BOOK-02)
- [ ] `tests/booking/pricing.test.ts` + `tests/booking/state-machine.test.ts`
- [ ] `tests/search/{availability-filter,radius,filters,bookable-gate}.test.ts` (+ a geo-seed helper with known coords/distances)
- [ ] `e2e/search-and-book.spec.ts` (reuse the UAT seed host `host@fitout.test` + a bookable seed set, D-38)
- [ ] Seed script `scripts/seed.ts` (D-38) — the search tests and E2E depend on it
- [ ] No framework install needed (Vitest + Playwright present)

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: high`.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | reuse | Better Auth (Phase 1) — Book requires a session (D-41); no new auth surface |
| V3 Session Management | reuse | Better Auth Postgres sessions; `auth.api.getSession()` in actions (existing pattern) |
| V4 Access Control | **yes** | Reserve/confirm gated on session + `canBook` (D-41); `/bookings/[id]` owner-gated `bookerId === userId` (IDOR — mirror `assertOwnership`/T-05 patterns); re-derive `deriveBookable` server-side before creating a hold (route group is NOT the gate) |
| V5 Input Validation | **yes** | Zod `searchParamsSchema` (radius, price bounds, lat/lng bounds, date/time) + `bookingCreateSchema`, re-validated server-side; all SQL via Drizzle `sql` parameter binds (never string-concat user input into `ST_DWithin`/ranges) |
| V6 Cryptography | **yes (light)** | Booking id = `randomUUID()` (opaque, unguessable) for the URL; reference `FIT-XXXXXXXX` from a crypto-random source — never sequential. No hand-rolled crypto |

### Known Threat Patterns for Next.js 16 + Drizzle + PostGIS
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via search filters / range binds | Tampering | Drizzle `sql` parameter binding (proven in read-model/units); ISO-string binds for ranges (Pitfall 3) |
| Price/time/units tampering (client-supplied) | Tampering | Server re-derives `hours`/`fullDay`/price from the read model; freezes `quotedTotalCents` (Pattern 4). Reject windows not inside operating hours / not free |
| IDOR on `/bookings/[id]` and the reserve hold | Information disclosure / Elevation | Owner-gate `booking.bookerId === session.userId` → 404 (D-43); reserve page reads only the booker's own hold |
| Booking / hold enumeration | Information disclosure | Opaque `randomUUID` ids; owner-gate; the public read model returns free/blocked state only, never booker PII (accept, per T-03-ENUM) |
| Booking without capability (`!canBook`) | Elevation | Server re-checks `canBook` in the Book action (not just the route group); `!canBook` → activate-booking prompt |
| Hold-spam inventory exhaustion (a signed-in user floods holds) | DoS | 15-min TTL + sweep-on-write + own-hold idempotency (a booker can't stack holds on one window) + auth-required. Note for the planner: consider a simple per-booker active-hold cap if abuse surfaces (not required for SC) |
| Client countdown bypass (submit after expiry) | Tampering | Confirm action re-checks `expires_at > now() AND status='pending'` server-side; expired mid-confirm → graceful "just taken/expired", never a silent confirm |
| Tampered search origin (arbitrary lat/lng) | Tampering | Validate lat∈[-90,90], lng∈[-180,180]; bounded radius presets; no PII exposure (search reads public listing data only) |

**Security block-on-high check:** no HIGH findings anticipated — every mutation reuses the established session→ownership→Zod→tx→revalidate pattern (`blocks.ts`/`listing.ts`), and the double-booking authority is the DB constraint. The two must-not-skip controls are the `/bookings/[id]` owner-gate (V4/IDOR) and server-side price/window re-derivation (V5).

## Sources

### Primary (HIGH confidence)
- Installed source `node_modules/drizzle-orm/postgres-js/session.cjs:150-164` — nested `tx.transaction()` → `client.savepoint()` (SAVEPOINT). `[VERIFIED]`
- Installed source `node_modules/postgres/cjs/src/index.js:234-289` — `begin()` re-throws without retry; `savepoint()` scope does `ROLLBACK TO` + re-throw on error. `[VERIFIED]`
- `node_modules/drizzle-orm/pg-core/session.d.ts:49-62` — `PgTransaction` `nestedIndex` + `rollback()`. `[VERIFIED]`
- postgis.net/docs/ST_DWithin.html + ST_Distance.html — geometry uses SRID units (degrees for 4326); geography uses meters. `[CITED]`
- Codebase (read in full): `units.ts`, `read-model.ts`, `slots.ts`, `bookability.ts`, `money.ts`, `validation/{booking,listing}.ts`, `db/schema.ts`, `drizzle/0001,0005`, `listings/[id]/page.tsx`, `components/availability/*`, `components/listing/{listing-card,address-autocomplete}.tsx`, `actions/{availability,blocks}.ts`, `tests/helpers/db.ts`, `tests/availability/{exclusion-race,units,read-model}.test.ts`, `package.json`, `.planning/config.json`. `[VERIFIED]`
- `.planning/STATE.md` — 40P01/23P01 finding; TZDate/`Date`-bind findings; WR-03 deferral; cold-start seed note. `[VERIFIED]`
- CLAUDE.md — prescriptive stack, Double-Booking Prevention detail, What-NOT-to-Use. `[VERIFIED]`
- 04-CONTEXT.md (D-29..D-49), 04-UI-SPEC.md, REQUIREMENTS.md, MEMORY `local-env-and-uat-seed.md`. `[VERIFIED]`

### Secondary (MEDIUM confidence)
- blog.frank-mich.com "Postgis Geometry with SRID 4326 is not a Geography" + osgeo postgis-users list — cross-confirm the degrees-vs-meters trap. `[CITED]`
- Postgres `EXTRACT(DOW)` semantics (0=Sun..6=Sat) matching `operating_hours.day_of_week` — used for the tz-independent weekday filter. `[CITED — cross-checked against read-model.ts venueDayOfWeek]`

### Tertiary (LOW confidence)
- None relied upon. `ctx7`/Context7 and `slopcheck` were unavailable; no claim rests on unverified web search.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions read from installed `package.json`/`node_modules`, not training data.
- Architecture (WR-03 transaction + PostGIS): HIGH — verified against installed driver source and official PostGIS docs; both were the phase's load-bearing unknowns.
- Search availability design: HIGH (recommendation) — reuses proven read model; the two-stage vs single-SQL fork is explicitly delegated and A1-flagged.
- Idempotency + pagination: MEDIUM — design recommendations (A2, A5) with real forks the planner should confirm.
- Pitfalls: HIGH — each maps to a verified codebase finding or an official source.

**Research date:** 2026-07-14
**Valid until:** ~2026-08-13 (30 days; stable stack, no fast-moving deps). Re-verify only if Drizzle/postgres.js or PostGIS major versions change.
