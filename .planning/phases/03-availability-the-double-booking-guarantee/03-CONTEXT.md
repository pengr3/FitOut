# Phase 3: Availability & the Double-Booking Guarantee - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn a published listing into something with **real, bookable availability** and lay the **correctness keystone**: the database itself makes two overlapping bookings for the same unit of the same listing **structurally impossible**, proven before any money is involved.

**In scope:**
- Host-defined **recurring weekly operating hours** per listing (AVAIL-01) and **date/time blocks** as exceptions (AVAIL-02).
- A **units** occupancy model: a listing has `unitCount` (default 1 = exclusive); each booking reserves **one** unit exclusively for its time window (**D-21** — the load-bearing decision of this phase).
- A **real, up-to-date availability calendar** on the listing detail page (AVAIL-03), computed from operating hours − blocks − existing bookings, displayed in the **venue's local timezone** (SC#2).
- Booker **selection** of an hourly window or a full day from availability (AVAIL-04); occupied/unavailable times are visibly blocked and unselectable (AVAIL-05).
- The **`booking` occupancy table + the Postgres GiST exclusion constraint** scoped by `(listing, unit, time_range)`, proven with **concurrent-insert tests** (the second overlapping insert is rejected with `23P01`, surfaced cleanly) — SC#4.

**Out of scope (later phases):**
- The actual **booking flow** — price breakdown, checkout, the short-lived pending **hold**, expiry worker, "just got taken" UX, double-click idempotency → **Phase 4** (built on top of this phase's table + constraint).
- **Search/discovery** and filtering by date/time availability → **Phase 4**.
- **Payments, commission, payouts, refunds** → **Phase 5+**.
- **Instant-book vs request-to-book** lifecycle fork → **Phase 6** (`bookingMode` is already stored on the listing from Phase 2).
- **Per-spot "open/free play"** (individuals each pay for a spot in a shared session) — **deferred** (out-of-scope per-attendee ticketing; see Deferred Ideas).
- **Group bookings / RSVP** → **Phase 8** (`maxOccupancy` is the headcount source it will cap).

</domain>

<decisions>
## Implementation Decisions

> Decision numbers continue the project-wide ledger (latest was **D-20** in PROJECT.md). **D-21 is a project-level model change** and MUST be recorded in `.planning/PROJECT.md` Key Decisions at phase transition — it reshapes Phases 4 and 8, not just this one.

### Occupancy model — the keystone (D-21) ⭐
- **D-21:** **Units occupancy model.** A listing has a **`unitCount`** (integer, **default 1 = exclusive whole-space rental**). Each booking reserves **exactly one unit** of the listing exclusively for its time window. The double-booking guarantee is a **Postgres GiST exclusion constraint scoped by `(listing_id, unit, tstzrange '[)')`** — two bookings may not hold the same unit at overlapping times; the (N+1)th overlapping booking finds **no free unit** and is rejected at the DB level.
  - **Worked example (the founder's scenario):** an 8-court pickleball facility = one listing with `unitCount = 8`. A group books Court A for 1–5pm → that unit is locked for that window; **Courts B–H remain bookable**; a 9th overlapping reservation is DB-rejected.
  - **`maxOccupancy` (D-07, existing) = per-booking group headcount** — how many people the **one** booking party may bring to their unit (the Phase-8 RSVP cap). It is **NOT** the number of parallel bookings. These are two independent caps.
  - **Rejected alternative:** "shared up to capacity / sum-of-headcounts" — it cannot be a simple exclusion constraint (becomes a race-prone application-level count check, explicitly in CLAUDE.md "What NOT to Use") and collides with the out-of-scope per-attendee ticketing boundary.
  - **Unit identity is the planner's call:** a bare integer index `1..unitCount` assigned at booking is sufficient for v1; optionally name units ("Court A") if low-cost. Auto-assign a free unit unless a named-unit picker is trivial.

### Slot granularity (D-22)
- **D-22:** **60-minute booking unit, on-the-hour (:00) starts, platform-wide fixed for v1.** A booker may select **any run of consecutive available hours** within a unit's operating window that day (no fixed max — the day rate is the path for a whole day). Granularity lives in UI + server validation (the exclusion constraint accepts any `tstzrange` regardless). Per-listing/per-host granularity (e.g. 30- or 90-min court blocks) is **deferred**.

### Day-rate vs hourly (D-23)
- **D-23:** A **"full day" booking = one booking spanning the unit's operating window that day** (open→close), charged the day rate. It is an ordinary time-range booking — no separate inventory — so on that unit it naturally blocks all hourly bookings that day (exclusion constraint), while **other units stay independent**. "Day" means the **operating window**, not a 24h calendar day. How the day **rate** is applied/capped vs `hourlyRate × hours` is a **Phase-4 pricing** detail, not this phase.

### Blocks & overrides (D-24)
- **D-24:** Host availability overrides are **close-only** for v1: a block **subtracts** a time range from availability. Granularity is a **partial time range** on a date (e.g. "Court 3, next Tue 2–6pm") **or a whole day**. A block may target **a single unit** (maintenance on one court, others stay open) **or the whole listing** (holiday). "Unblock" = remove a block you set. **Positive overrides** (opening normally-closed time as a one-off) are **deferred** (fast-follow).

### Operating hours & booking horizon (D-25, D-26)
- **D-25:** Recurring weekly operating hours support **multiple open–close windows per weekday** (e.g. Mon 6–10am **and** 4–9pm; Tue closed; Sun 8am–6pm). Modeled as rows keyed by day-of-week. Operating hours are **listing-wide** (all units share the same open→close); per-unit hours are not needed for v1.
- **D-26:** **Rolling ~90-day booking horizon** (platform-wide default — planner may tune 60/90/120) and **no minimum lead time** beyond `start > now` (supports spontaneous same-hour "walk up and book" play). Per-host horizon and per-host lead-time controls are **deferred**.

### Timezone (D-27)
- **D-27:** **Venue-local timezone** drives calendar display (SC#2). Store a **per-listing IANA timezone** (e.g. `Asia/Manila`), **defaulted to the launch region** and derivable from the listing's address/coords; the calendar renders in venue-local time. Underneath, **all timestamps are `timestamptz` (UTC)** and converted **at the edges** with **`date-fns` + `@date-fns/tz`** (CLAUDE.md — never store naive timestamps). Keeps the model region-capable per the PROJECT constraint. (Note: launch currency should be **PHP**, not the current `usd` default — a known Phase-2 follow-up, relevant when pricing shows on the calendar.)

### Booking table & the exclusion constraint (D-28)
- **D-28:** **This phase owns the `booking` occupancy table and the GiST exclusion constraint.** The table needs at least: `id`, `listingId` (FK), `unit` (int), `bookerId` (FK user), the reserved range (`tstzrange` or `startsAt`/`endsAt` → range), and a `status`. The **`EXCLUDE`** constraint (`listing_id WITH =`, `unit WITH =`, `range WITH &&`) requires **`btree_gist`** (for the `=` parts) and a **partial `WHERE`** that only enforces against **occupying** statuses (excludes `cancelled`/`declined`) so freed slots are re-bookable. Drizzle **cannot express `EXCLUDE`** — hand-author it in the migration SQL (CLAUDE.md / Drizzle issues #2813/#3388). Phase 3 builds enough of this table to **prove** the constraint via concurrent-insert tests (`23P01`); **Phase 4 extends** it with the pending-hold/expiry/state-machine. Which booking states exist and the full state machine are **Phase 4's** to define — Phase 3 just needs an "occupies the slot" vs "doesn't" distinction for the partial index.

### Bookability & empty-state
- **Bookability is unchanged and still read only via `deriveBookable()`** (D-14/D-15) — availability may be *shown*, but a slot is only *sellable* when the listing is bookable. The Phase-3 calendar replaces the "Availability coming soon" placeholder; the book action stays a state-reflecting placeholder here (real booking is Phase 4).
- **No operating hours set → empty calendar** (nothing bookable). Operating hours are **not** added to the Phase-2 publish gate (D-02) — a listing can be published without hours; it simply has no availability until the host sets them.

### Claude's Discretion
- Exact **schema shape** of `operating_hours`, `availability_block`, `booking`, and whether units are a bare integer vs a named `listing_unit` table (D-21) — planner/researcher's call within the decisions above.
- **Calendar/date-picker UI** (month grid → day → hour selection, how blocked/occupied times render, mobile layout) — defer to the **UI-SPEC** (this phase has a UI hint). Use shadcn/ui date components + `date-fns` (CLAUDE.md); no date components exist yet (Phase 2 explicitly deferred them).
- Availability **read model / query** approach (compute slots on the fly from hours − blocks − bookings, vs a materialized slot view) and any client refetch (TanStack Query is available) — planner's call; correctness first.
- Exact **horizon length** (60/90/120) and where hours/blocks editing lives in the `(host)` dashboard.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prescriptive Stack (LOCKED — read first)
- `CLAUDE.md` — full prescriptive stack. For this phase specifically:
  - **§ "Double-Booking Prevention — Prescriptive Detail"** — `tstzrange(..., '[)')` (back-to-back slots don't overlap), the partial `WHERE` so cancelled/declined rows don't block, wrap the insert in a transaction, return "slot just taken" on `23P01`. **This phase generalizes the constraint scope to `(listing, unit, range)`** per D-21.
  - **Version Compatibility** — **`btree_gist` is required** for the `listing_id`/`unit` `WITH =` parts of the `EXCLUDE`; **PostgreSQL 18**; use the `postgis/postgis:18` image (already local).
  - **§ "What NOT to Use"** — **no application-level "query for conflicts then insert"** checks (race condition); **no naive/local timestamps** — `timestamptz` UTC + `@date-fns/tz` at the edges.
  - **date-fns + @date-fns/tz** rows — slot math, day/hour boundaries, venue-tz conversion.
  - **Drizzle Kit** — `EXCLUDE` constraints are **not expressible in Drizzle schema** → hand-edit the migration SQL (Drizzle issues #2813/#3388).
  - **shadcn/ui + date-fns** for calendar/date components; **TanStack Query** optional for live availability refetch.

### Product Intent
- `.planning/ROADMAP.md` § "Phase 3: Availability & the Double-Booking Guarantee" — goal + the **4 success criteria** this phase is judged against (esp. SC#4: concurrent overlapping inserts, `23P01`).
- `.planning/REQUIREMENTS.md` — **AVAIL-01..AVAIL-05**; the **Out of Scope** table (**per-attendee ticketing / open paid sessions is NOT in v1** — this is what "open/free play" maps to); **Open Product Decisions** (this phase resolves "Slot granularity" → D-22).
- `.planning/PROJECT.md` — vision, core value ("Find & book a space"), constraints (availability correctness; single-region but region-capable; real payments). **D-21 must be added to Key Decisions here** at transition.

### Prior-Phase Context (carry forward)
- `.planning/phases/02-listings-host-onboarding/02-CONTEXT.md` — **D-07** (`maxOccupancy` = single capacity int → now clarified as the per-booking group cap, D-21), **D-03** (both hourly + day rate required; coexistence resolved here → D-23), **D-14/D-15** (bookability derived via `deriveBookable`, webhook-driven), **D-10** (structured address + lat/lng stored — source for venue tz derivation, D-27), **D-16** (published-but-not-bookable excluded from Phase-4 search).
- `.planning/STATE.md` § Blockers/Concerns — "Phase 3: Slot granularity (30- vs 60-min)" → resolved by **D-22**.

_No external ADRs or design specs beyond the above — decisions are fully captured here + these project docs._

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/lib/db/schema.ts`** — the FK-root for new tables. `listing` already has `hostId`, `maxOccupancy`, `hourlyRateCents`, `dayRateCents`, `bookingMode`, `status`, PostGIS `location`, and the `timestamptz` convention. **Add** `unitCount` (int, default 1) to `listing` (D-21); **add** `operating_hours`, `availability_block`, and `booking` tables (FK to `listing`, `booking` also FK to `user`). Enums (`listingStatus`, `bookingMode`) show the `pgEnum` pattern; add a booking-status enum.
- **`src/lib/bookability.ts`** — `deriveBookable(listing, host)` is the **single sell-gate**; the calendar and any future book action read it, never `status` alone. Do **not** bypass it.
- **`src/app/listings/[id]/page.tsx:219`** — the **`Availability coming soon` placeholder section** (dashed box) is the exact seam to replace with the real calendar. The booking rail's CTA already branches on `bookable` (line ~254).
- **Migrations** `drizzle/000x_*.sql` — the project already **hand-authors migration SQL** (see `0001_enable_postgis.sql`, `0002_listing_tables.sql`); the `EXCLUDE` + `CREATE EXTENSION btree_gist` go in a new hand-edited migration, same pattern.
- **`src/lib/validation/`** — shared Zod schema pattern (client + server); add availability/booking schemas here; **re-validate on the server** (never trust client-supplied times).
- **`src/app/actions/`** — server-actions dir; host hours/blocks mutations follow the session-checked `db.update` pattern.
- **Test infra** — Vitest integration tests already isolate to a per-worker Postgres schema and migrate `./drizzle` first (see Phase-1 notes); the **concurrent-double-insert test (SC#4)** goes here. Playwright is set up for the calendar E2E.

### Established Patterns
- **Route groups:** host-only editing (operating hours, blocks) lives under the **`(host)`** dashboard (its layout is the real `canHost` gate). The **public** listing detail page (`src/app/listings/[id]/`) stays outside gated groups and renders the calendar for anyone.
- **Server-side trust:** times/units/status are validated server-side; the exclusion constraint is the final authority (DB-enforced, not app-enforced).
- **`timestamptz` everywhere** (existing convention) — keep it; convert to venue tz only at the display edge.

### Integration Points
- New `operating_hours` / `availability_block` / `booking` tables FK to `listing` (and `booking` → `user`). `unitCount` added to `listing`.
- The **calendar read model** joins operating hours − blocks − existing `booking` rows (occupying statuses only) per unit, in the listing's tz.
- **Phase 4** builds search + the pending-hold/checkout flow **on top of** this phase's `booking` table + constraint; **Phase 6** reads `bookingMode`; **Phase 8** caps RSVP by `maxOccupancy`.

</code_context>

<specifics>
## Specific Ideas

- **The founder's driving scenario:** an 8-court pickleball facility where a group reserves **one** court exclusively (others stay open) — this is exactly the D-21 units model, and it is the concrete test the calendar + constraint must satisfy.
- **"Walk up and book now"** spontaneity matters — hence **no minimum lead time** (D-26); a booker standing at the court can grab the next hour.
- The **exclusion constraint is the architectural keystone** of the whole project (roadmap orders it *before* money): it must be **DB-enforced and proven by concurrent-insert tests**, never an application-level check.

</specifics>

<deferred>
## Deferred Ideas

- **Per-spot "open / free play"** — individuals each pay for a spot in a **shared** session (rotate in with strangers). This is the **out-of-scope per-attendee ticketing** (PROJECT.md / REQUIREMENTS.md). When built (later phase), it **reuses the units abstraction** — capacity = number of spots, each walk-in consumes one, DB rejects the (spots+1)th. The genuinely hard variant (variable per-booking headcount drawn from one shared people-pool → sum-of-headcounts) stays **out of scope indefinitely**.
- **Per-listing / per-host slot granularity** (30-min or 90-min court blocks) — v1 is platform-wide 60-min (D-22).
- **Positive availability overrides** (open normally-closed time as a one-off) — v1 is close-only (D-24); fast-follow.
- **Per-host booking horizon + per-host minimum lead time** controls — v1 uses platform defaults (D-26).
- **Day-rate pricing application/cap** vs `hourlyRate × hours` — a **Phase-4/5** pricing detail (D-23).
- **Named units / per-unit amenities** (e.g. "Court A is indoor") — v1 units may be a bare integer index; naming is optional planner discretion (D-21).

</deferred>

---

*Phase: 3-Availability & the Double-Booking Guarantee*
*Context gathered: 2026-07-10*
