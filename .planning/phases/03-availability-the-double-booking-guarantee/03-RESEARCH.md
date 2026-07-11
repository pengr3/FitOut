# Phase 3: Availability & the Double-Booking Guarantee - Research

**Researched:** 2026-07-11
**Domain:** Postgres GiST exclusion constraints (double-booking prevention), availability read-model, timezone-correct slot math, concurrent-insert testing
**Confidence:** HIGH (the keystone — constraint mechanics, concurrency, tz stack all verified against live DB + official docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-21 (keystone) — Units occupancy model.** A listing has `unitCount` (int, **default 1 = exclusive whole-space rental**). Each booking reserves **exactly one unit** for its time window. The guarantee is a **Postgres GiST exclusion constraint scoped by `(listing_id, unit, tstzrange '[)')`** — the (N+1)th overlapping booking finds no free unit and is DB-rejected. `maxOccupancy` (existing) = per-booking group headcount, **NOT** parallel bookings. Unit identity may be a **bare integer index `1..unitCount`** assigned at booking (named units deferred). **Rejected:** shared/sum-of-headcounts (would be a race-prone app-level count — forbidden by CLAUDE.md).
- **D-22 — 60-minute, on-the-hour (:00) slots, platform-wide fixed for v1.** A booker may select **any run of consecutive available hours** within a unit's operating window that day (no fixed max). Granularity enforced in UI + server validation; the constraint accepts any `tstzrange`.
- **D-23 — "Full day" = one booking spanning the unit's operating window that day** (open→close) at the day rate. Ordinary time-range booking, no separate inventory; naturally blocks that unit's hourly bookings that day while other units stay independent. "Day" = operating window, not 24h. Day-rate **pricing** math is Phase 4.
- **D-24 — Blocks are close-only for v1** (subtractive). Granularity: a **partial time range on a date OR a whole day**. A block targets **a single unit** OR **the whole listing**. "Unblock" = remove a block. Positive/one-off openings deferred.
- **D-25 — Recurring weekly operating hours with multiple open–close windows per weekday.** Modeled as rows keyed by day-of-week. Hours are **listing-wide** (all units share); per-unit hours not needed for v1.
- **D-26 — Rolling ~90-day booking horizon** (platform default; planner may tune 60/90/120) and **no minimum lead time** beyond `start > now` (supports same-hour walk-up booking).
- **D-27 — Venue-local timezone drives calendar display** (SC#2). Store a **per-listing IANA timezone** (e.g. `Asia/Manila`), defaulted to launch region, derivable from address/coords. All timestamps `timestamptz` (UTC); convert **at the edges** with `date-fns` + `@date-fns/tz`. Never store naive timestamps.
- **D-28 — This phase owns the `booking` occupancy table + the GiST exclusion constraint.** Needs at least: `id`, `listingId` FK, `unit` int, `bookerId` FK, the reserved range (`tstzrange` or `startsAt`/`endsAt`), a `status`. The `EXCLUDE` requires `btree_gist` (for the `=` parts) + a **partial `WHERE`** enforcing only against **occupying** statuses (so cancelled/declined free the slot). Drizzle **cannot express `EXCLUDE`** — hand-author in migration SQL. Phase 3 builds enough to **prove the constraint via concurrent-insert `23P01` tests**; Phase 4 extends with the pending-hold/expiry/state-machine and defines the full state machine.
- **Bookability unchanged** — still read only via `deriveBookable()`. Availability may be *shown*; a slot is only *selectable/sellable* when the listing is bookable. The calendar replaces the "Availability coming soon" placeholder; the book action stays a state-reflecting placeholder (real booking = Phase 4).
- **No operating hours set → empty calendar.** Operating hours are NOT added to the Phase-2 publish gate.

### Claude's Discretion

- Exact **schema shape** of `operating_hours`, `availability_block`, `booking`; bare-integer unit vs a named `listing_unit` table (planner's call within the decisions).
- **Calendar/date-picker UI** — defer to the UI-SPEC; shadcn/ui date components + `date-fns`.
- Availability **read model / query** approach (on-the-fly vs materialized) and any client refetch (TanStack Query available) — planner's call; **correctness first**.
- Exact **horizon length** (60/90/120) and where hours/blocks editing lives in the `(host)` dashboard.

### Deferred Ideas (OUT OF SCOPE)

- Per-spot "open / free play" per-attendee ticketing (reuses units abstraction later).
- Per-listing / per-host slot granularity (v1 = platform-wide 60-min).
- Positive availability overrides (v1 = close-only).
- Per-host booking horizon + per-host minimum lead time.
- Day-rate pricing application/cap (Phase 4/5).
- Named units / per-unit amenities (v1 = bare integer index).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AVAIL-01 | Host can define recurring weekly operating hours for a listing | `operating_hours` schema (rows per day-of-week, multiple windows/day — D-25); `time` wall-clock columns; server-side overlap/close>open validation; WeeklyHoursEditor server action (§ Architecture Patterns, § Code Examples) |
| AVAIL-02 | Host can block and unblock specific dates/times as overrides | `availability_block` schema (nullable `unit` = whole-listing vs one court; `starts_at`/`ends_at` range; close-only — D-24); BlocksEditor + AddBlockDialog; delete = unblock (§ Architecture Patterns) |
| AVAIL-03 | Listing shows a real, up-to-date availability calendar reflecting bookings, hours, blocks | **On-the-fly** read model (operating_hours − blocks − occupying bookings), free-unit count per slot; venue-tz rendering via react-day-picker `timeZone` + `@date-fns/tz` (§ Pattern 3, § Pattern 4) |
| AVAIL-04 | Booker can select an hourly window or a full day from availability | SlotPicker (toggle-group, consecutive-run rule, D-22); "Book full day" = operating window at day rate (D-23); server re-validates times/units (§ Architecture Patterns) |
| AVAIL-05 | Occupied/unavailable times are visibly blocked and cannot be selected | Read model marks each slot Available / Unavailable / Past / Beyond-horizon; `aria-disabled` + strike/hatch + tooltip, never color-only (UI-SPEC recipes); Playwright asserts unselectable (§ Validation Architecture) |

**The load-bearing success criterion (SC#4, roadmap):** *Two concurrent overlapping booking inserts for the same listing cannot both succeed — the second is rejected at the database level (exclusion constraint, error `23P01` surfaced cleanly).* This is the architectural keystone and is covered in depth in § Pattern 1, § Pattern 2, § Validation Architecture.
</phase_requirements>

## Summary

This phase adds a real availability calendar and — the reason the roadmap orders it *before money* — makes double-booking **structurally impossible at the database level** via a Postgres GiST exclusion constraint. The correctness core is small and well-understood: a `booking` table with `(listing_id, unit, tstzrange(starts_at, ends_at, '[)'))` under an `EXCLUDE USING gist (... WITH =, ... WITH =, ... WITH &&)` constraint, restricted by a partial `WHERE` to occupying statuses. Everything else (operating hours, blocks, the read model, the calendar UI) is ordinary CRUD + a timezone-correct slot computation layered on top.

Three facts were verified against the **live database** (`postgis/postgis:18-3.6`, PostgreSQL **18.4**): `btree_gist` **1.8** is available (not yet installed — the phase migration installs it), `postgis` **3.6.3** is installed, and the project's migration + per-worker-schema test harness already replays hand-authored extension migrations idempotently. Drizzle still **cannot express `EXCLUDE`** (issues #2813/#3388 open) — the constraint is hand-authored in a trailing migration, exactly like `0001_enable_postgis.sql`. The `'[)'` (half-open) range bound is non-negotiable: it makes back-to-back hours (10–11, 11–12) *not* overlap while still rejecting genuine overlaps.

The single most common way to get the concurrency test wrong: firing "two" inserts on **one** connection. The project's test harness `makeClient` uses `max: 1`, which serializes queries — no real race. The SC#4 test **must** open two independent connections on the same isolated schema and fire via `Promise.allSettled`; the DB row-locks during constraint evaluation so exactly one wins and the loser rejects with `err.code === '23P01'`.

**Primary recommendation:** Add `unitCount` + `timezone` to `listing`; add `operating_hours`, `availability_block`, and `booking` tables to `schema.ts` (Drizzle-native — plain `timestamptz` columns, no range type needed); then a **hand-authored trailing migration** creates `btree_gist WITH SCHEMA public` and adds the `EXCLUDE` constraint using the `tstzrange(starts_at, ends_at, '[)')` **expression** (no generated column). Compute availability **on the fly** (correctness > staleness). Prove SC#4 with a two-connection Vitest race test.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Double-booking prevention | **Database (Postgres GiST exclusion constraint)** | Server action (maps `23P01` → clean error) | Correctness must be DB-enforced/atomic — an app-level conflict check is a race (CLAUDE.md "What NOT to Use"). This is the whole point of the phase. |
| Unit auto-assignment | **Server (Drizzle transaction)** | Database (constraint is the backstop) | Picking a free unit is business logic; the DB constraint is the authority that makes the pick safe under concurrency. |
| Availability read model (slots from hours − blocks − bookings) | **API / Server (Server Component + query)** | Client (optional TanStack Query refetch) | Availability logic and the venue-tz conversion stay server-side; never trust the client for what's bookable. |
| Timezone / DST slot math | **Server (edges) + Client (display)** | — | Store UTC; convert to venue-local at both edges via `@date-fns/tz`. Browser tz is irrelevant (SC#2 = venue tz always). |
| Host hours/blocks editing | **Server action + `(host)` route-group gate** | Client (RHF + Zod for UX) | Ownership + capability gating is server-authoritative; the `(host)` layout is the real `canHost` gate; re-validate every write. |
| Calendar / slot-picker UI | **Client (React, shadcn calendar + toggle-group)** | Server (initial data) | Interactive selection is a client concern; data + bookability come from the server. |

## Standard Stack

### Core (already in the project — reuse)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 18.4 (`postgis/postgis:18-3.6`) | Exclusion constraint + `tstzrange` + `btree_gist` | `[VERIFIED: docker exec select version()]` — the only mainstream DB that prevents overlap cleanly at the schema level. |
| `btree_gist` | 1.8 (available, not yet installed) | GiST operator classes for the `=` parts of the `EXCLUDE` | `[VERIFIED: pg_available_extensions on live DB]` — required to mix scalar `=` with range `&&` in one GiST index. |
| Drizzle ORM | 0.45.2 | Type-safe tables + `sql` template for the range expression | `[VERIFIED: package.json]` — expresses the tables natively; range/EXCLUDE hand-authored. |
| drizzle-kit | 0.31.10 | Generate table migration; `migrate` applies (project does **not** use `push`) | `[VERIFIED: package.json + STATE.md]` |
| postgres (postgres.js) | 3.4.9 | Driver; surfaces SQLSTATE on `err.code` | `[VERIFIED: package.json]` — `err.code === '23P01'` is how the app catches the violation. |

### Supporting (NEW — install this phase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-day-picker` | 10.0.1 | Month calendar; **has a `timeZone` prop** (IANA) — renders/selects days in the venue tz | Peer of the shadcn `calendar` block. `[VERIFIED: npm view + Context7 /gpbl/react-day-picker]` |
| `date-fns` | 4.4.0 | Slot/day/hour math; first-class tz via the `{ in: tz(...) }` context (v4) | Day boundaries, hour enumeration, formatting. `[VERIFIED: npm view + date-fns v4 docs]` |
| `@date-fns/tz` | 1.5.0 | `TZDate` + `tz()` — construct/compare instants in a specific IANA tz (DST-correct) | The edge conversion layer (D-27). `[VERIFIED: npm view + github.com/date-fns/tz]` |
| `@tanstack/react-query` | 5.101.2 | **Optional** live availability refetch on the booker calendar | Planner's call — Server Component + revalidation is an acceptable correctness-first alternative. `[CITED: CLAUDE.md]` |

### shadcn components to add (official registry — no vetting gate)
`calendar`, `toggle`, `toggle-group`, `scroll-area`. Already present: `button`, `card`, `badge`, `select`, `input`, `label`, `switch`, `radio-group`, `dialog`, `popover`, `separator`, `skeleton`, `sonner`, `tabs`, `tooltip`, `alert`, `form`. `[VERIFIED: ls src/components/ui]`

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tstzrange(starts_at, ends_at, '[)')` **expression** in the constraint | A stored **generated** `tstzrange` column (`customType` + `.generatedAlwaysAs`) | Generated column lets you index/query the range directly, but adds a Drizzle `customType` and a STORED column for no Phase-3 benefit. Expression form keeps `schema.ts` to two plain `timestamptz` columns Drizzle understands natively. **Recommend expression form.** |
| On-the-fly read model | Materialized slot view / precomputed slot table | Materialized = stale unless refreshed on every booking (a refresh race) — directly conflicts with AVAIL-03 "real, up-to-date" + the correctness ethos. Premature at single-city v1. **Recommend on-the-fly.** |
| App-side find-free-unit + retry | Per-listing `pg_advisory_xact_lock(hashtext(listing_id))` to serialize | Advisory lock removes the retry loop by serializing a listing's inserts; fine at v1 scale but trades a little per-listing concurrency. Either way the **constraint stays the correctness authority.** |

**Installation:**
```bash
npm install react-day-picker@10 date-fns@4 @date-fns/tz@1
npm install @tanstack/react-query@5   # optional — only if you add client-side refetch
npx shadcn@latest add calendar toggle toggle-group scroll-area
```

**Version verification (all confirmed 2026-07-11):**
```
react-day-picker 10.0.1 · date-fns 4.4.0 · @date-fns/tz 1.5.0 · @tanstack/react-query 5.101.2
drizzle-orm 0.45.2 · drizzle-kit 0.31.10 · postgres 3.4.9 · PostgreSQL 18.4 · btree_gist 1.8
```

## Architecture Patterns

### System Architecture Diagram

```
HOST (write path)                          BOOKER (read path)
─────────────────                          ──────────────────
WeeklyHoursEditor / BlocksEditor           AvailabilityCalendar (listings/[id])
   │ RHF + Zod (client UX)                    │ month grid — react-day-picker timeZone={venue tz}
   ▼                                          ▼ pick a day
server action  ──(session + canHost         Server Component / route: getAvailability(listingId, day)
   │            + listing ownership)──┐          │
   ▼                                  │          ▼  compute ON THE FLY (correctness-first)
 validate (Zod, server) ─────────────┘   ┌─ operating_hours (dow, wall-clock windows, venue tz)
   │                                      ├─ availability_block (unit-scoped OR whole-listing, overlapping day)
   ▼                                      └─ booking (status IN occupying, overlapping day) → free-unit count
 db.insert/update ─────────────────────────────────►  Postgres (timestamptz UTC)
 operating_hours / availability_block                    │
                                                         ▼  slots: Available (N of M free) / Unavailable / Past / Beyond-horizon
                                            @date-fns/tz TZDate → UTC instants; display in venue tz
                                                         ▼
                                            SlotPicker (toggle-group, consecutive run) → BookingRail summary
                                                         │  (Phase 3: Book = placeholder; respects deriveBookable)
                                                         ▼
BOOKING INSERT (proven in Phase 3 tests; wired in Phase 4)
   createBooking(): pick lowest free unit → INSERT → on 23P01 retry next unit (bounded by unitCount)
        └────────────── EXCLUDE USING gist (listing_id =, unit =, tstzrange '[)' &&) WHERE status occupies
                        = the DB-enforced double-booking guarantee (the second racer gets 23P01)
```

### Recommended Project Structure
```
src/
├── lib/
│   ├── db/schema.ts                  # + unitCount, timezone on listing; + operating_hours,
│   │                                 #   availability_block, booking tables; + bookingStatus enum
│   │                                 #   (EXCLUDE lives in the migration — comment points to it)
│   ├── availability/
│   │   ├── read-model.ts             # getAvailability(listingId, dayLocal): fetch + compose slots
│   │   ├── slots.ts                  # TZDate slot enumeration (DST-correct), horizon/now gating
│   │   └── units.ts                  # createBooking() find-free-unit + retry-on-23P01 (used by tests; Phase-4 wires UI)
│   └── validation/
│       ├── availability.ts           # Zod: operating-hours window, block (shared client+server)
│       └── booking.ts                # Zod: slot selection (times/units re-validated server-side)
├── app/
│   ├── actions/
│   │   ├── operating-hours.ts        # host: upsert weekly windows (session + ownership checked)
│   │   └── blocks.ts                 # host: add/remove block
│   └── listings/[id]/page.tsx        # replace :219 placeholder with <AvailabilityCalendar/>
├── components/availability/          # AvailabilityCalendar, SlotPicker, WeeklyHoursEditor, BlocksEditor
drizzle/
├── 0004_availability_tables.sql      # drizzle-generated: enum + 3 tables + FKs + indexes
└── 0005_booking_exclusion.sql        # HAND-AUTHORED: CREATE EXTENSION btree_gist + EXCLUDE constraint
```

### Pattern 1: The GiST exclusion constraint (the keystone) — hand-authored migration

**What:** A partial GiST exclusion constraint scoped by `(listing_id, unit, tstzrange '[)')`. Two occupying bookings may not hold the same unit at overlapping times.
**When to use:** Always — it is the double-booking guarantee. It is DB-enforced, never app-enforced.

```sql
-- drizzle/0005_booking_exclusion.sql  (HAND-AUTHORED — Drizzle cannot express EXCLUDE, issues #2813/#3388)
-- Runs AFTER 0004 creates the booking table. Mirrors the 0001_enable_postgis pattern.
-- WITH SCHEMA public pins the opclasses to public so every isolated test schema (search_path
-- "<schema>,public") resolves them; IF NOT EXISTS makes the harness replay idempotent.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist (
    "listing_id" WITH =,                              -- btree_gist: scalar equality
    "unit" WITH =,                                    -- btree_gist: scalar equality
    tstzrange("starts_at", "ends_at", '[)') WITH &&   -- gist: range overlap
  )
  WHERE ("status" IN ('pending', 'confirmed'));       -- partial: only OCCUPYING rows enforce
```

Why each piece (all `[VERIFIED]` against Postgres docs / live DB behavior):
- **`'[)'` half-open bound** — 10:00–11:00 and 11:00–12:00 share only the 11:00 instant, which `[)` excludes → they do **not** overlap. With the default `[]` they would falsely conflict at the shared boundary. Use `'[)'` here **and** in every read-model overlap check.
- **`WITH =` on `listing_id` (text) and `unit` (int)** — needs `btree_gist`; without it Postgres errors "data type ... has no default operator class for access method gist".
- **Partial `WHERE ("status" IN ('pending','confirmed'))`** — a **positive list of occupying statuses**. This is forward-compatible: Phase 4 adding a *non-occupying* status (e.g. `expired`) does **not** require touching the constraint. Adding a *new occupying* status does (drop + re-add — a cheap migration on a small table). Prefer the positive list over `status <> 'cancelled'` for exactly this reason. The predicate must be IMMUTABLE (enum `IN (...)` is).
- `unitCount = 1` is just the general case: every booking gets `unit = 1`, so the constraint enforces whole-space exclusivity automatically.

### Pattern 2: Unit auto-assignment under concurrency

**What:** With `unitCount = N`, assign the lowest free unit for the requested window, atomically safe under concurrency.
**When to use:** The booking insert (proven by Phase-3 tests; wired to UI in Phase 4).
**Key principle:** correctness rests on the **constraint**, not the SELECT. The read-then-insert race (two inserts both pick unit 1) is *defeated by the constraint* — the loser gets `23P01` and retries the next free unit. Bounded by `unitCount`.

```ts
// src/lib/availability/units.ts  — recommended Strategy A (find-free + retry-on-23P01)
export async function createBooking(db, { listingId, bookerId, startsAt, endsAt, unitCount }) {
  for (let attempt = 0; attempt < unitCount; attempt++) {
    const occupied = await db.execute(sql`
      SELECT DISTINCT unit FROM booking
      WHERE listing_id = ${listingId}
        AND status IN ('pending','confirmed')
        AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${startsAt}, ${endsAt}, '[)')
    `);
    // NB: also subtract unit-scoped blocks; a whole-listing block ⇒ no unit is free (throw).
    const taken = new Set(occupied.rows.map((r) => r.unit));
    const unit = firstFreeUnit(unitCount, taken);      // lowest 1..N not in `taken`
    if (unit == null) throw new NoUnitAvailableError();
    try {
      await db.insert(booking).values({ id: uuid(), listingId, bookerId, unit, startsAt, endsAt, status: "confirmed" });
      return unit;                                      // won the slot
    } catch (e) {
      if (isPgError(e, "23P01")) continue;              // lost the race for THIS unit → recompute & retry
      throw e;
    }
  }
  throw new NoUnitAvailableError();
}
```

**Why not a single set-based `INSERT ... SELECT generate_series EXCEPT ...`?** It reduces the window but two concurrent statements still can't see each other's uncommitted row, so both may pick the same free unit → one still gets `23P01`. You cannot `SELECT ... FOR UPDATE` a *non-existent* free unit. So **retry-on-23P01 is unavoidable regardless of strategy** — Strategy A makes it explicit and readable. Optional optimization: wrap the whole thing in `pg_advisory_xact_lock(hashtext(listingId))` to serialize a listing's inserts and skip retries (Strategy C) — the constraint still stays as defense-in-depth.

### Pattern 3: On-the-fly availability read model

**What:** Compute a day's slots from `operating_hours − availability_block − occupying bookings`, honoring units.
**When to use:** AVAIL-03. Recommended over materialization (correctness > staleness).

Rule (multi-unit aware): for a given hourly slot,
- if **any whole-listing block** (`unit IS NULL`) overlaps → **0 free** (Unavailable).
- else `freeUnits = unitCount − | {units with an occupying booking overlapping} ∪ {units with a unit-scoped block overlapping} |`.
- slot is **Available** iff `freeUnits ≥ 1`; the UI-SPEC "N of M free" annotation = `freeUnits` of `unitCount`.

Recommended split: **SQL fetches raw rows** (operating-hours windows for the venue-local dow; blocks overlapping the day; occupying bookings overlapping the day, with their units), **TS composes the grid** with `@date-fns/tz` (keeps all tz logic in one layer; avoids gnarly tz-aware `generate_series`). Filter overlaps in SQL with `tstzrange(..., '[)') && tstzrange(dayStartUtc, dayEndUtc, '[)')` (indexed).

### Pattern 4: Timezone & DST-correct slot math (edges only)

**What:** Store `timestamptz` (UTC); enumerate/compare in UTC; render in the venue's IANA tz.

```ts
// src/lib/availability/slots.ts
import { TZDate } from "@date-fns/tz";
// Enumerate on-the-hour 60-min slots for a venue-local date + wall-clock window.
// Build each instant via TZDate so DST gaps/overlaps are correct — NEVER add 3600_000 ms in a loop.
export function slotsForWindow(y, m, d, openHour, closeHour, tz) {
  const slots = [];
  for (let h = openHour; h < closeHour; h++) {
    const start = new TZDate(y, m, d, h, 0, 0, tz);       // venue-local wall clock → instant
    const end   = new TZDate(y, m, d, h + 1, 0, 0, tz);
    slots.push({ startUtc: start.toISOString(), endUtc: end.toISOString() });
  }
  return slots;
}
```

```tsx
// Display (client) — always venue tz (SC#2), independent of the browser tz.
import { format } from "date-fns";
import { tz } from "@date-fns/tz";
format(new Date(slot.startUtc), "h:mm a", { in: tz(listing.timezone) }); // "6:00 AM" venue-local
// Month grid: <Calendar timeZone={listing.timezone} ... />  (react-day-picker renders days in that tz)
```

- **Day-of-week** for `operating_hours` lookup must be computed in the **venue** tz (via `TZDate`), not the server tz.
- **`operating_hours` times are wall-clock in the venue tz** (Postgres `time`, no tz); combine with a concrete venue-local date to get the UTC instant.
- **Asia/Manila has no DST** (PH launch is DST-free), but the model must stay DST-correct for region-capability — `TZDate` gives that for free. Never string-concatenate local times or add fixed ms across a day boundary.

### Recommended schema shapes (Drizzle — all natively expressible)

```ts
// additions to `listing`
unitCount: integer("unit_count").default(1).notNull(),      // D-21
timezone: text("timezone").default("Asia/Manila").notNull(), // D-27 (IANA; default launch region)

export const bookingStatus = pgEnum("booking_status", ["pending","confirmed","cancelled","declined","completed"]);
// Phase 3 needs only occupies vs not; enum declared forward-compatibly (Phase 4 owns the state machine).

export const operatingHours = pgTable("operating_hours", {
  id: text("id").primaryKey(),
  listingId: text("listing_id").notNull().references(() => listing.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),   // 0=Sun..6=Sat (JS Date.getDay convention)
  openTime: time("open_time").notNull(),         // venue-local wall clock
  closeTime: time("close_time").notNull(),       // must be > openTime (server-validated; no midnight-crossing v1)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("operating_hours_listing_idx").on(t.listingId)]);
// Multiple windows/day (D-25) = multiple rows with the same (listingId, dayOfWeek).

export const availabilityBlock = pgTable("availability_block", {
  id: text("id").primaryKey(),
  listingId: text("listing_id").notNull().references(() => listing.id, { onDelete: "cascade" }),
  unit: integer("unit"),                          // NULL = whole listing; else one court (D-24)
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("availability_block_listing_idx").on(t.listingId)]);

export const booking = pgTable("booking", {
  id: text("id").primaryKey(),
  listingId: text("listing_id").notNull().references(() => listing.id, { onDelete: "cascade" }),
  unit: integer("unit").notNull(),                // bare index 1..unitCount (D-21)
  bookerId: text("booker_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: bookingStatus("status").default("confirmed").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("booking_listing_idx").on(t.listingId)]);
// EXCLUDE "booking_no_overlap" is hand-authored in 0005 — Drizzle cannot express it. Add a code
// comment here pointing to that migration so nobody assumes `drizzle-kit generate` produces it.
```

### Anti-Patterns to Avoid
- **App-level "query for conflicts, then insert."** The classic race — both requests pass the check, both insert. Forbidden by CLAUDE.md. Use the constraint.
- **Default `[]` range bound.** Makes back-to-back hours falsely conflict. Always `'[)'`.
- **Two "concurrent" inserts on one `max:1` connection.** Serializes — proves nothing. Use two connections (§ Validation Architecture).
- **Using the browser timezone anywhere.** SC#2 requires venue tz always. Browser tz is a bug.
- **Adding fixed ms to cross hours/days.** DST-incorrect. Use `TZDate`.
- **`drizzle-kit push`.** Project uses `migrate` with hand-authored SQL; `push` could try to reconcile/drop the unknown EXCLUDE constraint.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Double-booking / overlap prevention | App-side conflict query + insert | Postgres GiST `EXCLUDE` constraint | The only race-free option; DB-atomic. The entire phase exists for this. |
| Range overlap semantics | Manual `start < other_end AND end > other_start` comparisons | `tstzrange(...,'[)') && tstzrange(...,'[)')` | Correct half-open boundary handling; indexable by GiST. |
| Timezone / DST conversion | Manual UTC offset arithmetic | `@date-fns/tz` `TZDate` + `tz()` | DST gaps/overlaps, region-capability; offsets change. |
| Month calendar + a11y | Custom date grid | shadcn `calendar` (react-day-picker) with `timeZone` | Keyboard/aria/tz handled; venue-tz rendering built in. |
| SQLSTATE detection | String-matching error messages | `err.code === '23P01'` (postgres.js) | Stable, locale-independent. |

**Key insight:** In this domain a "custom solution" for overlap or timezone is not just more code — it is a *correctness regression*. The DB constraint and `TZDate` are the correctness guarantees; hand-rolling reintroduces exactly the race/DST bugs the phase is meant to eliminate.

## Common Pitfalls

### Pitfall 1: The concurrency test uses one connection and proves nothing
**What goes wrong:** `Promise.all([db.insert(...), db.insert(...)])` on the shared `testDb.db` (postgres.js `max:1`) serializes — the second sees the first already committed, so you never observe the real race; or worse, both appear to "work" in a way that hides a missing constraint.
**Why:** `makeClient` in `tests/helpers/db.ts` sets `max: 1`.
**How to avoid:** Open **two independent** postgres.js clients on the *same* isolated schema (`search_path "<schema>,public"`) and fire via `Promise.allSettled`. Add a `makeRacingClients(schema, n)` helper (Wave 0). Assert exactly one fulfilled, one rejected with `code === '23P01'`, and one surviving row.
**Warning signs:** The test passes even when you comment out the `EXCLUDE` constraint.

### Pitfall 2: `btree_gist` not installed / not resolvable in test schemas
**What goes wrong:** `ADD CONSTRAINT ... EXCLUDE` fails with "no default operator class for access method gist", or the opclasses aren't visible inside an isolated test schema.
**Why:** `btree_gist` is available (v1.8) but **not yet installed** (`[VERIFIED: installed_version empty]`); and a relocatable extension created with a schema-first `search_path` can land in the wrong schema.
**How to avoid:** `CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;` in the migration. `WITH SCHEMA public` has no `"public".` token so the harness's `.replaceAll('"public".', ...)` leaves it intact → opclasses always live in `public` and resolve for every test schema. `IF NOT EXISTS` keeps the harness replay idempotent (same pattern proven by `0001_enable_postgis.sql`).
**Warning signs:** Green in dev (extension already in public), red in a fresh CI DB.

### Pitfall 3: Migration statement separation for the test harness
**What goes wrong:** The hand-authored migration replays as one blob or in the wrong order in isolated schemas.
**Why:** `tests/helpers/db.ts` splits migration SQL on the literal `--> statement-breakpoint` marker and runs each piece with `SET search_path TO "<schema>", public; <stmt>`.
**How to avoid:** Put `--> statement-breakpoint` between the `CREATE EXTENSION` and the `ALTER TABLE ... ADD CONSTRAINT`. Keep the constraint's columns/`tstzrange`/`&&` **unqualified** (no `public.` prefix) so they resolve via the schema-first search_path. Ensure `0004` (table) sorts before `0005` (constraint) — filenames sort lexically.

### Pitfall 4: `drizzle-kit generate` silently ignores the EXCLUDE constraint
**What goes wrong:** Someone regenerates migrations and assumes the constraint is covered, or a `push` tries to drop the "unknown" object.
**Why:** Drizzle can't introspect/emit `EXCLUDE` (issues #2813/#3388).
**How to avoid:** Keep the extension + constraint **only** in the hand-authored `0005`. Never run `drizzle-kit push` (project uses `migrate`). Add a comment in `schema.ts` on the `booking` table pointing to `0005`. `generate` for the table itself is fine — hand-author the constraint as a *separate* trailing migration.

### Pitfall 5: `'[)'` inconsistency between the constraint and the read model
**What goes wrong:** The constraint uses `'[)'` but the read-model overlap query uses `'[]'` (or manual comparisons), so the calendar shows a slot as free that the DB will reject, or hides a bookable back-to-back hour.
**How to avoid:** Use `tstzrange(..., '[)')` **everywhere** — constraint, unit-assignment SELECT, and read-model overlap filter. Add a test that 10–11 and 11–12 both insert successfully (boundary sharing is allowed) while 10–11 and 10:30–11:30 conflict.

### Pitfall 6: TanStack Query staleness implies a slot is bookable
**What goes wrong:** A cached calendar shows a slot the DB has since filled; a booker selects it.
**Why:** Client cache lags the DB.
**How to avoid:** The calendar is **advisory**; the DB constraint is authoritative (the real insert re-checks in Phase 4). For Phase 3 display, keep `staleTime` low / `refetchOnWindowFocus`, or use a Server Component + revalidation. The UI-SPEC "Some times just filled up — we've refreshed the calendar" toast is the reconciliation path. Never treat calendar state as a booking guarantee.

### Pitfall 7: `currency` still defaults to `usd`
**What goes wrong:** The calendar's est.-price line shows `$` for a PH launch.
**Why:** `listing.currency` defaults to `'usd'` `[VERIFIED: schema.ts:176]` — a known Phase-2 follow-up.
**How to avoid:** When the calendar surfaces price, default/display **PHP**. Low-priority, not a correctness issue, but visible on this phase's surface.

## Code Examples

### Catch `23P01` and surface it cleanly (server action)
```ts
// src/lib/pg.ts
export function isPgError(e: unknown, code: string): e is { code: string } {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: unknown }).code === code;
}

// in a booking/availability server action (Phase 4 wires the real flow; Phase 3 proves the mapping)
try {
  await createBooking(db, input);
} catch (e) {
  if (isPgError(e, "23P01")) {
    return { error: "That time was just taken. Pick another slot." };  // clean, user-facing (SC#4)
  }
  throw e;
}
```

### The SC#4 concurrency test (two connections, genuine race)
```ts
// tests/availability/exclusion-race.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";

let testDb: TestDb;
const racing = (schema: string) =>
  postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {}, connection: { search_path: `${schema},public` } });

beforeAll(async () => { testDb = await setupTestDb(); /* seed host, listing(unitCount=1), booker */ });
afterAll(async () => { await teardownTestDb(testDb); });

it("rejects the 2nd of two concurrent overlapping inserts with 23P01 (SC#4)", async () => {
  const a = racing(testDb.schema), b = racing(testDb.schema);   // two independent connections
  const ins = (c: typeof a, id: string) => c`
    INSERT INTO booking (id, listing_id, unit, booker_id, starts_at, ends_at, status)
    VALUES (${id}, ${LISTING}, 1, ${BOOKER},
            '2026-08-01T02:00:00Z', '2026-08-01T03:00:00Z', 'confirmed')`;
  const results = await Promise.allSettled([ins(a, "bk_a"), ins(b, "bk_b")]);

  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
  expect((rejected.reason as { code: string }).code).toBe("23P01");

  const [{ n }] = await testDb.client`SELECT count(*)::int AS n FROM booking WHERE listing_id = ${LISTING}`;
  expect(n).toBe(1);                                             // exactly one survived
  await a.end(); await b.end();
});
```

### Multi-unit + boundary + partial-WHERE behavior (same file, additional cases)
```ts
// unitCount=8: book unit 1 for a window, book unit 2 same window → BOTH succeed;
//   a 3rd insert on unit 1 for an overlapping window → 23P01.
// back-to-back: 10–11 and 11–12 on unit 1 → BOTH succeed ('[)' boundary).
// partial WHERE: insert 'confirmed', UPDATE it to 'cancelled', insert overlapping → succeeds (freed).
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| App-level conflict check before insert | DB GiST `EXCLUDE` on `tstzrange` | Stable since PG 9.x; standard | Eliminates the double-booking race entirely |
| `date-fns-tz` (separate companion lib) | `@date-fns/tz` + `{ in: tz() }` context (date-fns v4) | date-fns v4 (Sep 2024) | First-class tz; `TZDate` works directly with date-fns fns |
| react-day-picker without tz awareness | `timeZone` prop + exported `TZDate` | react-day-picker v9+ (current v10) | Calendar renders/selects days in an explicit IANA tz |
| PG range types only | Native **temporal** `PRIMARY KEY/UNIQUE ... WITHOUT OVERLAPS` (PG 18) | PG 18 (2025) | Not needed here — `EXCLUDE` remains the right tool for the partial-WHERE + multi-column-`=` scope |

**Deprecated/outdated:** `date-fns-tz` companion package (superseded by `@date-fns/tz` for v4). Storing naive/local timestamps (CLAUDE.md forbids).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `day_of_week` stored as 0=Sun..6=Sat (JS `getDay`) | Schema shapes | Low — internal convention; pick one and test it. ISO 1=Mon is equally valid. |
| A2 | Operating-hours windows do not cross midnight in v1 (close > open enforced) | Schema shapes / Pitfall 5 | Low — matches UI-SPEC "Close time must be after open time"; a 24h/overnight venue would need two rows or a follow-up. |
| A3 | `availability_block` is a separate table applied in the read model (not a row in the booking exclusion space); the block-vs-booking guard is app-level in Phase 4 | Open Questions Q1 | Medium — see Q1. Booking-vs-booking (money-critical) is DB-enforced; block-vs-booking is lower-stakes. Planner should confirm. |
| A4 | Horizon = 90 days (D-26 default) | User Constraints | Low — planner may tune 60/120; a config constant. |
| A5 | `booking.bookerId` uses `onDelete: "restrict"` (don't cascade-delete real bookings) | Schema shapes | Low — planner's call; `set null` also defensible. Bookings are financial records later. |
| A6 | Booking-status enum declared as `pending/confirmed/cancelled/declined/completed` now, though Phase 4 owns the state machine | Schema shapes | Low — only `pending`+`confirmed` are referenced by the partial WHERE in Phase 3; extra values are inert until Phase 4. |

## Open Questions (RESOLVED)

1. **Should a host block DB-prevent a booking on that unit, or only hide it in the read model?**
   - What we know: D-24 defines `availability_block` as its own concept (whole-listing via `unit IS NULL`, whole-day, reasons, easy unblock) — it does **not** fit a single booking row. The read model subtracts blocks. Phase 3 has no real booking insert, so nothing breaks now.
   - What's unclear: in Phase 4, whether the booking insert must also reject overlapping blocks at the DB level (a block-vs-booking race) or app-level is acceptable.
   - Recommendation: **Keep `availability_block` a separate table; enforce booking-vs-booking at the DB (the money-critical invariant, SC#4); guard booking-vs-block in the Phase-4 server action inside the same transaction.** A host blocking a slot a booker is simultaneously grabbing is rare and either outcome is acceptable (the host re-blocks). Do **not** over-engineer blocks into the exclusion space for v1.
   - **RESOLVED:** Adopted the recommendation. Phase 3 keeps `availability_block` a separate table and does NOT enforce block-vs-booking at the DB (03-03 Task 2 explicitly: "Do NOT enforce block-vs-booking at the DB here"). Block-vs-booking guarding is deferred to the Phase-4 server action.

2. **`operating_hours` open/close type: `time` vs integer minutes-from-midnight?**
   - What we know: hours are recurring wall-clock in the venue tz; both are Drizzle-native.
   - Recommendation: **`time` (Postgres `time without time zone`)** — readable, natural, combines cleanly with a venue-local date via `TZDate`. Minutes-from-midnight is a fine alternative if you prefer pure arithmetic for overlap validation.
   - **RESOLVED:** Adopted `time` — used for `operating_hours.open_time`/`close_time` in 03-01 schema. NB: `time` columns round-trip from Drizzle as `"HH:mm:ss"` strings — the read-model `parseTime` and any UI seeding of the shared `"HH:mm"` Zod schema MUST normalize the trailing `:ss` (see plan-checker blocker; enforced in 03-04).

3. **Named units now or later?**
   - What we know: D-21 + UI-SPEC lock **no unit picker** and **auto-assign**; named units are deferred. The "N of M free" annotation is the allowed low-cost surfacing.
   - Recommendation: **Bare integer `unit` (1..unitCount)** this phase. A `listing_unit` table can be added later without changing the constraint (still `unit WITH =`).
   - **RESOLVED:** Adopted bare integer `unit` (1..unitCount) — 03-01 schema. Named units deferred; the constraint is forward-compatible (`unit WITH =` unchanged).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Exclusion constraint, all tables | ✓ | 18.4 (`postgis/postgis:18-3.6`, container up) | — |
| `btree_gist` extension | `EXCLUDE ... WITH =` parts | ✓ (available, install in migration) | 1.8 | — (no fallback; required) |
| `postgis` extension | Existing geo (unaffected) | ✓ installed | 3.6.3 | — |
| Node/npm | new deps + shadcn add | ✓ (project running) | — | — |
| `react-day-picker` / `date-fns` / `@date-fns/tz` | Calendar + tz slot math | ✗ (install) | 10.0.1 / 4.4.0 / 1.5.0 | — |
| shadcn `calendar`/`toggle`/`toggle-group`/`scroll-area` | Calendar + SlotPicker | ✗ (add) | official registry | — |
| Vitest per-worker schema harness | SC#4 + read-model tests | ✓ | `tests/helpers/db.ts` | — |
| Playwright | Calendar E2E | ✓ configured | 1.60.0 | — |

**Missing dependencies with no fallback:** none blocking — `btree_gist` is available on the live DB and is created by the phase migration; all npm/shadcn additions are routine installs.

**Missing dependencies with fallback:** `@tanstack/react-query` (optional) — Server Component + revalidation is the correctness-first alternative.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 (unit + integration, node env) + Playwright 1.60.0 (E2E) |
| Config file | `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `npx vitest run tests/availability` |
| Full suite command | `npm test` (Vitest) + `npm run test:e2e` (Playwright) |
| DB isolation | `tests/helpers/db.ts` — per-worker schema, replays `./drizzle` (incl. hand-authored `0005`) |

### Phase Requirements → Test Map
| Req / SC | Behavior | Test Type | Automated Command | File Exists? |
|----------|----------|-----------|-------------------|-------------|
| **SC#4** | Two concurrent overlapping inserts (same listing+unit) → exactly one wins, other `23P01` | integration (2 conns) | `npx vitest run tests/availability/exclusion-race.test.ts` | ❌ Wave 0 |
| SC#4 | Multi-unit: unit 1 & unit 2 same window both succeed; 3rd on unit 1 → `23P01` | integration | same file | ❌ Wave 0 |
| SC#4 | Back-to-back 10–11 & 11–12 both succeed (`'[)'`); 10–11 & 10:30–11:30 → `23P01` | integration | same file | ❌ Wave 0 |
| D-28 | Partial WHERE: cancelled/declined row frees the slot (overlapping insert succeeds) | integration | same file | ❌ Wave 0 |
| SC#4 | Server action maps `23P01` → "That time was just taken" | unit | `npx vitest run tests/availability/error-map.test.ts` | ❌ Wave 0 |
| AVAIL-03 | Read model: hours − blocks − bookings → correct free-unit count; whole-listing block ⇒ 0 free | integration | `npx vitest run tests/availability/read-model.test.ts` | ❌ Wave 0 |
| AVAIL-03 / SC#2 | tz/DST: a venue-local slot maps to the right UTC instant + right calendar day | unit | `npx vitest run tests/availability/slots.test.ts` | ❌ Wave 0 |
| AVAIL-01 | Operating-hours validation: close>open, no window overlap | unit | `npx vitest run tests/availability/hours-validation.test.ts` | ❌ Wave 0 |
| AVAIL-02 | Block add/remove; unit-scoped vs whole-listing subtract correctly | integration | `tests/availability/blocks.test.ts` | ❌ Wave 0 |
| AVAIL-04/05 | Calendar in venue tz (tz note visible); blocked/occupied slots `aria-disabled` & unselectable; read-only when `!bookable`; consecutive-run selection | E2E | `npx playwright test e2e/availability.spec.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/availability` (fast; < 30s target for the integration subset).
- **Per wave merge:** `npm test` (full Vitest suite — must stay green with the new `0005` migration replayed).
- **Phase gate:** full Vitest + `npm run test:e2e` green before `/gsd-verify-work`; SC#4 test is the non-negotiable gate.

### Wave 0 Gaps
- [ ] `tests/helpers/db.ts` — add a `makeRacingClients(schema, n)` (or export `makeClient`) so the race test can open ≥2 connections on one isolated schema. **Load-bearing for SC#4.**
- [ ] `tests/availability/exclusion-race.test.ts` — SC#4 (two-connection race), multi-unit, back-to-back boundary, partial-WHERE freeing.
- [ ] `tests/availability/read-model.test.ts` — hours − blocks − bookings free-unit math.
- [ ] `tests/availability/slots.test.ts` — TZDate slot enumeration / DST / horizon-now gating.
- [ ] `tests/availability/hours-validation.test.ts`, `tests/availability/blocks.test.ts`, `tests/availability/error-map.test.ts`.
- [ ] `e2e/availability.spec.ts` — venue-tz note, unselectable blocked slots, `!bookable` read-only, consecutive-run selection.
- [ ] `drizzle/0004_availability_tables.sql` (generated) + `drizzle/0005_booking_exclusion.sql` (hand-authored) must both exist before these tests can replay in the harness.

## Security Domain

### Applicable ASVS Categories (level 1)
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | reuse | Better Auth session (existing); no changes |
| V3 Session Management | reuse | Existing 30-day sliding sessions |
| V4 Access Control | **yes** | Host hours/blocks writes gated by `(host)` layout **and** re-checked server-side: session present + `canHost` + **listing ownership** (`listing.hostId === session.userId`). Never trust the route group alone. |
| V5 Input Validation | **yes** | Shared Zod schemas (`src/lib/validation/availability.ts`, `booking.ts`), **re-validated server-side**: times are on-the-hour, `end > start`, within an operating window, unit ∈ 1..unitCount, block ranges sane. Never trust client-supplied times/units (CLAUDE.md). |
| V6 Cryptography | no | None net-new |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Booker forges a slot/time/unit the calendar didn't offer | Tampering | Server re-derives availability + re-validates the requested window against operating hours/blocks/horizon before insert; the constraint is the final backstop |
| Host edits another host's hours/blocks (IDOR) | Elevation of Privilege | Ownership check `listing.hostId === session.userId` inside every hours/blocks action, not just the `(host)` gate |
| Concurrent double-book (money-critical) | Tampering / DoS | `EXCLUDE` constraint (SC#4) — DB-atomic |
| Availability enumeration / scraping | Information Disclosure | Public read model already returns only published/blocked/free state; no PII in slots. Low risk. |
| Selecting a slot on a non-bookable listing | Tampering | Selection gated on `deriveBookable()`; read-only preview otherwise (UI-SPEC) |

`security_enforcement: true`, ASVS level 1, block_on `high` `[VERIFIED: .planning/config.json]`. No high-severity threats introduced; the phase strengthens the marketplace's core integrity invariant.

## Sources

### Primary (HIGH confidence)
- **Live database probe** (`docker compose exec db psql`) — PostgreSQL **18.4**; `pg_available_extensions`: `btree_gist` 1.8 (available, not installed), `postgis` 3.6.3 (installed). `[VERIFIED]`
- **Project codebase** — `src/lib/db/schema.ts`, `src/lib/bookability.ts`, `drizzle/0001_enable_postgis.sql`, `drizzle/0002_listing_tables.sql`, `tests/helpers/db.ts`, `tests/listing/geo-roundtrip.test.ts`, `vitest.config.ts`, `src/app/listings/[id]/page.tsx`, `package.json`, `.planning/config.json`. `[VERIFIED]`
- **Context7 `/gpbl/react-day-picker`** — `timeZone` prop (IANA identifiers), exported `TZDate`, `disabled` matcher, `selected`/`modifiersStyles`. `[CITED]`
- **Context7 `/drizzle-team/drizzle-orm-docs`** — `generatedAlwaysAs(sql\`...\`)` + `customType` (v0.32+); confirms table/column patterns. `[CITED]`
- `postgresql.org/docs/current/errcodes-appendix.html` — `23P01 exclusion_violation`. `[CITED]`
- `wiki.postgresql.org` "How to avoid overlapping intervals" + `tstzrange` `'[)'` semantics; `btree_gist` requirement for scalar `=` in a GiST exclude. `[CITED — matches CLAUDE.md § Double-Booking Prevention]`
- `CLAUDE.md` — prescriptive stack; § Double-Booking Prevention, § What NOT to Use, Version Compatibility (`btree_gist` required, PG18). `[CITED]`
- `.planning/phases/03-.../03-CONTEXT.md`, `03-UI-SPEC.md`, `.planning/ROADMAP.md` (Phase 3 SC), `.planning/REQUIREMENTS.md`. `[VERIFIED]`

### Secondary (MEDIUM confidence)
- `github.com/drizzle-team/drizzle-orm` issues **#2813 / #3388 / #4939** — `EXCLUDE` constraints not natively expressible; workaround = custom SQL migration (open as of Nov 2024). `[VERIFIED via WebSearch]`
- `github.com/date-fns/tz` + `blog.date-fns.org/v40-with-time-zone-support` — `TZDate`, `tz()` `{ in: ... }` context for date-fns v4. `[VERIFIED via WebSearch]`
- npm registry — `react-day-picker@10.0.1`, `date-fns@4.4.0`, `@date-fns/tz@1.5.0`, `@tanstack/react-query@5.101.2`. `[VERIFIED: npm view]`
- Multiple guides (server.hk, pganalyze V104, philipmcclarence) — `23P01` handling / `err.code`. `[VERIFIED via WebSearch, cross-referenced]`

### Tertiary (LOW confidence)
- None — all load-bearing claims verified against the live DB, the codebase, or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — versions verified via npm + live DB; extension availability confirmed by direct probe.
- Architecture (constraint, concurrency, read model, tz): **HIGH** — constraint mechanics are stable Postgres behavior; the harness/concurrency caveat verified by reading `tests/helpers/db.ts`; tz stack verified via Context7 + date-fns v4 docs.
- Pitfalls: **HIGH** — each is grounded in a verified codebase or DB fact (harness `max:1`, `btree_gist` not installed, breakpoint splitting, Drizzle EXCLUDE gap, `'[)'`).
- Open Question Q1 (block-vs-booking enforcement) is a genuine design choice flagged for the planner.

**Research date:** 2026-07-11
**Valid until:** 2026-08-10 (30 days — constraint/tz facts are stable; re-check npm versions if the phase slips)
