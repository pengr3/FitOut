# Phase 4: Booking Core & Search (no payment) - Context

**Gathered:** 2026-07-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Give the **booker** the front half of the core transaction: **find** a space (location + activity + date/time + price → a list of cards) and **claim a slot** via a short-lived **pending hold** protected by the Phase-3 exclusion constraint — proving the **two-phase booking mechanism** (hold → commit), the **state machine**, and **abandoned-hold expiry** work correctly **before payment is added to the failure modes**.

**In scope:**
- **Search & discovery** (SEARCH-01..05): a search/browse home at `/`, PostGIS radius search from an autocompleted location, filters for activity/type + price + **true date/time availability**, results as a **list of cards** (photo, name, price, distance), sensible default + zero-result states.
- **Booking core (no money)** (BOOK-01..03): a **dedicated reserve page** showing the selected window + a **price breakdown**; entering checkout places a **pending hold** (`booking` row, `status=pending`, `expiresAt`) that immediately reflects in the calendar + search and **auto-expires** if abandoned; a **placeholder confirm** flips `pending → confirmed` (the seam where Phase-5 payment will slot in); overlap rejection + **double-click idempotency** (exactly one booking).
- Extending the Phase-3 `booking` table + `createBooking` path with the pending/expiry/state-machine + the deferred **WR-03 transactional design** (SAVEPOINT for `23P01`, outer-retry for `40P01`, in-transaction stale-hold sweep).
- A **lightweight seed set** of demo listings for the launch city (dev/E2E/UAT).

**Out of scope (later phases):**
- **Payments, commission, payouts, refunds** → **Phase 5** (Phase 4's confirm is a no-payment stand-in; the breakdown shows a subtotal with **no fee/commission line**).
- **Instant-book vs request-to-book fork** → **Phase 6** (`bookingMode` is stored but NOT forked here; every Phase-4 booking is a direct hold → confirm).
- **My Bookings list, booking management, cancellation** → **Phase 7** (Phase 4 ships only a single, link-viewable **confirmation page** — no list).
- **Map view of search results (DISC-01)** → **v2** (results are a list only).
- **Group bookings / RSVP** → **Phase 8**.
- **Background job infrastructure** (BullMQ/Redis or Inngest) → introduced when Phase 5/7 needs delayed jobs; Phase 4 uses **sweep-on-write**, no queue.

</domain>

<decisions>
## Implementation Decisions

> Decision numbers continue the project-wide ledger (latest was **D-28** in Phase 3). These are Phase-4 implementation decisions; the model-reshaping ones need no PROJECT.md entry (none change the data model at the D-21 level), but **D-45 resolves the D-23 pricing punt** and **D-46 resolves the Phase-2 `usd → PHP` follow-up** for booker-facing prices.

### Search entry & results (SEARCH-01, SEARCH-05)
- **D-29:** **Search IS the homepage.** `/` becomes the browse/search home (search bar + results), **replacing the Next.js scaffold** (`src/app/page.tsx`). One demand-side-first front door, Airbnb-style.
- **D-30:** **Default (no-query) view = all bookable listings in the launch city**, sensibly sorted — cold-start liquidity so there is always supply to see. Honors **D-16** (published-but-not-bookable listings are excluded from search).
- **D-31:** **Zero-result state = a friendly empty state with escape hatches** — one-tap broaden-radius / clear-filters, plus nearby alternatives if any. (Addresses the STATE.md cold-start / zero-result-search concern.)
- **D-32:** Results **paginate via "Load more" / pagination** (not infinite scroll); simple, SEO-friendly, fits a single-city catalog. Results are a **list of cards** only (map is v2 / DISC-01).

### Location, filters & availability (SEARCH-01..04)
- **D-33:** **Location model = address autocomplete → radius.** Booker types an area/address (Photon/LocationIQ, per **D-18**) → PostGIS radius search; **distance is shown on cards**; a radius control is provided. "Near me" (browser geolocation) is an optional convenience (may be a fast-follow — see Discretion). Reuses the existing `listing_location_gist` index.
- **D-34:** **Availability filter = TRUE free-window (the honest option).** The booker picks a **date (+ optional time range)**; results include **only listings with an actual free unit for that window** — the same "see real availability" promise the listing page makes, applied to search. Computed server-side via the Phase-3 read model / a free-unit predicate, **bounded** by the bookable-only set (D-16) + the ~90-day horizon (D-26). When only a date is picked (no time), "available" = the listing is open that day with at least one free unit somewhere in the day.
- **D-35:** **Activity filter matches primary space type OR activity tags** (D-08) — a gym tagged `basketball` matches a "basketball" search, surfacing multi-use venues (the reason activity tags exist).
- **D-36 (resolves the user's "you decide"):** **First-class filters = location + date/time + activity/type + price** (exactly the SEARCH reqs). **Amenities filtering is deferred** to a later polish (not in the SEARCH req set) — kept out to avoid filter-UI bloat.
- **D-37:** **Result sort = nearest-first (default, using the search origin), switchable to price.** Matches the location-first model.

### Reserve / checkout flow (BOOK-01, BOOK-02)
- **D-39:** **Checkout = a dedicated reserve page** (e.g. `/listings/[id]/book`), Airbnb-style: listing summary + selected window + price breakdown + confirm. A clean seam to inject Phase-5 payment. **The pending hold is placed on ENTERING checkout** (SC#3), not on final confirm — the slot is protected during review and immediately reflects in the calendar + search.
- **D-40:** **No-payment confirm boundary = placeholder confirm.** The confirm step flips the hold **`pending → confirmed`** — a no-payment stand-in for what Phase-5 payment will trigger. Proves the full **two-phase state machine end-to-end now**; Phase 5 inserts payment **immediately before** this transition. (Phase 4 does NOT stop at the hold.)
- **D-41:** **Sign-in required at "Book."** Clicking Book requires a signed-in `canBook` user (return-to-checkout redirect if needed). Matches `booking.bookerId` (NOT NULL, `onDelete: restrict`). **Guest checkout is deferred.**
- **D-42:** **Double-click idempotency via an idempotency key + button-disable.** A per-checkout idempotency key makes a retried/double submit a **no-op that returns the SAME booking**; the submit button also disables on click. A booker double-clicking **their own** slot sees success — never a false "just got taken." (The DB constraint alone is insufficient: it would wrongly tell the booker their own slot was taken.)
- **D-43:** **Booking confirmation = a durable, owner-gated confirmation page** at a stable URL (e.g. `/bookings/[id]`), showing a booking reference + details, surviving refresh. **No My Bookings LIST** (that is Phase 7 / MANAGE-01) — just the single reachable confirmation.
- **D-44:** **The reserve page shows a visible hold countdown** ("held for 14:59…") + **graceful expiry** ("your hold expired — the slot was released," with a path back). Honest, and reduces double-book surprise.

### Pricing & the hold lifecycle (BOOK-01, BOOK-02)
- **D-45 (resolves D-23):** **Pricing rule = distinct, no cap.** An hourly run = `hourlyRateCents × hours`; the **"Book full day"** gesture = `dayRateCents`. **No auto-switch / day-rate cap.** Predictable and matches the current rail estimate + D-23 ("the day rate is the path for a whole day"). A day-rate cap is a deferred enhancement.
- **D-46 (resolves the Phase-2 `usd → PHP` follow-up for prices):** **Price breakdown = subtotal only.** Line items `rate × qty = subtotal + total`; **NO platform/service-fee or commission line** in Phase 4 (fees + commission arrive in Phase 5) — but the layout leaves room for a fee row so nothing shifts later. **Booker-facing prices display in PHP** (switch the `DISPLAY_CURRENCY` used by `formatMoney`).
- **D-47:** **Hold TTL = 15 minutes**, **platform-wide** and **config-tunable**. Comfortable checkout window that survives into Phase-5 payment without re-tuning. Per-listing / per-host TTL is deferred (mirrors the platform-wide defaults of D-22/D-26).
- **D-48:** **Expiry mechanism = sweep-on-write + lazy reads, NO new infra** (resolves the WR-03 transactional design):
  - **(a) Lazy reads:** the availability read model + the find-free-unit logic treat a `pending` row **past its `expiresAt`** as **free** (a stale hold never over-occupies), so the calendar/search never wait on a worker.
  - **(b) Sweep-on-write:** the booking transaction **clears/expires overlapping stale holds before inserting**, so the `EXCLUDE` constraint sees the freed slot immediately.
  - **WR-03 transactional contract (build here):** give each unit-attempt its own **SAVEPOINT** so a `23P01` rolls back only that attempt (outer tx stays usable), and wrap the whole booking tx in an **outer retry** for `40P01` (deadlock aborts the entire tx — a savepoint cannot rescue it). Both still map to the clean "just taken" copy (`mapBookingError`).
  - **No Redis / BullMQ / Inngest** is stood up this phase; the DB remains the sole source of truth. A background sweep/worker arrives only when Phase 5/7 genuinely needs delayed jobs (payouts, reminders).
- **D-49 (schema intent — exact shape is planner/researcher's call):** Phase 4 **extends the `booking` table** with at least: **`expiresAt`** (timestamptz, set while `pending`), a **captured price snapshot** (`quotedTotalCents` + `currency`, frozen at hold time for Phase-5 charge integrity), and an **idempotency key** (column or side table). An **abandoned hold maps to `cancelled`** (or a new `expired` enum value if cheap). The `bookingStatus` enum (`pending/confirmed/cancelled/declined/completed`) already exists; **Phase 4 owns the state machine** over it.

### Seed data
- **D-38:** **Lightweight search seed set.** A handful of **bookable** demo listings spread across the launch city (varied space types, operating hours, geo coordinates) for dev / E2E / UAT — enough to exercise search, the filters, and a zero-result path. Honors the STATE.md "do not over-build" note; not a user-facing feature.

### Claude's Discretion
- **Amenities search filter** — deferred (D-36); reintroduce as a polish if it earns its place.
- **`expired` vs `cancelled`** for an abandoned hold (D-49) — lean toward reusing `cancelled`; add `expired` only if low-cost (useful for analytics).
- **Exact `booking`-table column shape**, the **idempotency-key source** (client-generated token vs. derived from `(bookerId, listingId, window)`), and the **booking-reference format** (D-42/D-43/D-49).
- **URL schemes** for the reserve page and confirmation page (D-39/D-43); **radius presets**, **sort-control affordance**, and **card field layout** — defer to the UI-SPEC (this phase has a UI hint).
- Whether **"near me" geolocation** ships in the first cut or as a fast-follow (D-33).
- **Search query implementation** — a single SQL statement (PostGIS `ST_DWithin` radius + type/tag/price predicates + an availability `EXISTS`/free-unit subquery) vs. a two-stage candidate-then-filter approach — researcher/planner's call; **correctness first**, bounded by the bookable-only set + horizon so the true-availability filter (D-34) stays performant.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prescriptive Stack (LOCKED — read first)
- `CLAUDE.md` — full prescriptive stack. For this phase specifically:
  - **§ "Double-Booking Prevention — Prescriptive Detail"** — the pending **hold** reuses the same `tstzrange('[)')` + partial `WHERE (status IN ('pending','confirmed'))` semantics; wrap the insert in a transaction and return "slot just taken" on conflict. The **sweep-on-write** (D-48) expires overlapping stale holds **in the same transaction** so the constraint sees freed slots immediately.
  - **§ "What NOT to Use"** — **no application-level "query-for-conflicts-then-insert"** (the constraint is the sole authority); **no naive/local timestamps** (`timestamptz` UTC + `@date-fns/tz` at the edges).
  - **PostGIS rows / Version Compatibility** — `geography`/`geometry(Point,4326)` + GiST for **radius search** (SEARCH-01); axis order **x=lng / y=lat** (Pitfall 1). `listing_location_gist` already exists.
  - **date-fns + @date-fns/tz** — the availability filter (D-34) interprets the picked date/time in **each venue's tz**; slot/hours math for pricing.
  - **TanStack Query** — optional for live search / availability refetch (client interactivity).
  - **shadcn/ui + React Hook Form + Zod** — search filter form + reserve form; **re-validate on the server** (never trust client times/price).
  - **BullMQ + Redis / Inngest rows** — noted as **DEFERRED** (D-48): no background-job infra this phase.

### Product Intent
- `.planning/ROADMAP.md` § "Phase 4: Booking Core & Search (no payment)" — goal + the **4 success criteria** this phase is judged against (esp. SC#3 hold-on-entering-checkout + auto-expiry, SC#4 overlap rejection + double-click idempotency).
- `.planning/REQUIREMENTS.md` — **SEARCH-01..05, BOOK-01..03**; the **Out of Scope** table (**map view of results = v2 / DISC-01**; no dynamic/surge pricing); **Open Product Decisions** (slot granularity already resolved D-22; request-to-book expiry SLA is a **Phase-6** concern — NOT the Phase-4 checkout-hold TTL).
- `.planning/PROJECT.md` — core value ("Find & book a space"), constraints (availability correctness; single-region but region-capable; **PH launch → PHP**), Key Decisions **D-16** (search excludes non-bookable), **D-20** (PayMongo — Phase 5, not here), **D-21** (units model the hold sits on).

### Prior-Phase Context (carry forward)
- `.planning/phases/03-availability-the-double-booking-guarantee/03-CONTEXT.md` — **D-21/D-28** (units + the `booking_no_overlap` EXCLUDE the hold is protected by), **D-22/D-23** (60-min on-the-hour slots; full-day = operating window → the pricing basis, D-45), **D-24** (blocks are subtractive in the read model — the search availability filter must honor them), **D-26** (~90-day horizon, no min lead time), **D-27** (venue-local tz display).
- `.planning/phases/02-listings-host-onboarding/02-CONTEXT.md` — **D-05/D-06/D-08** (curated space types / activity tags / amenities — the search filter vocabulary), **D-09/D-10/D-11** (structured address + lat/lng + fuzzed map — search origin + card location), **D-14/D-15** (bookability via `deriveBookable`), **D-16** (search excludes published-but-not-bookable), **D-18** (Photon/LocationIQ + react-leaflet + PostGIS enabled — the geo stack for D-33).
- `.planning/STATE.md` § Blockers/Concerns — the **`40P01`/`23P01` finding** (`createBooking` retry/mapping must treat both as "just taken" — foundational to the WR-03 design, D-48); **WR-03 deferred to Phase 4** (auto-commit contract documented in `units.ts`); the **`usd → PHP`** display follow-up (D-46); the cold-start **seed-tooling** note (D-38).

_No external ADRs or design specs beyond the above — decisions are fully captured here + these project docs._

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/lib/availability/units.ts`** — `createBooking(dbConn, input)` (find-free-unit + retry on `23P01`/`40P01`) and `mapBookingError` (clean "just taken"). **Phase 4 EXTENDS this**: accept/insert `status='pending'` + `expiresAt` + price snapshot + idempotency, and implement the **WR-03 SAVEPOINT(`23P01`) / outer-retry(`40P01`) + in-tx stale-hold sweep** (D-48). The file's **AUTO-COMMIT CONTRACT** header block is the exact spec for what to build — read it first.
- **`src/lib/availability/read-model.ts`** — `getAvailability(db, listingId, dayLocal, now)` is the single server-authoritative read model. **Phase 4 (a)** adds **lazy expiry** (a `pending` past `expiresAt` counts as free) and **(b)** is the per-listing free-unit check the **search availability filter** (D-34) calls. `DbConn` type already widened for prod + test.
- **`src/lib/availability/slots.ts`** — TZDate slot math (60-min on-the-hour; full-day = operating window). Reused to **re-derive + re-validate the booker's selected window server-side** and compute `hours` for pricing (D-45). ⚠️ `TZDate.toISOString()` is offset-local — take the UTC instant via the epoch (see STATE finding); bind ISO strings (not `Date`) into raw `sql` range templates.
- **`src/lib/validation/booking.ts`** — `slotSelectionSchema` (currently unused **Phase-4 scaffolding**) is the client selection contract. Add the **booking-create** schema + a **search-params** schema here; re-validate server-side (mirror `listing.ts`).
- **`src/lib/money.ts`** — shared `formatMoney(cents, currency)`. Reuse for the breakdown; **switch the display currency to PHP** (D-46).
- **`src/lib/bookability.ts`** — `deriveBookable(listing, host)` is the **sole sell-gate**: search inclusion (D-16) **and** the book CTA both read it, never `status` alone.
- **`src/app/listings/[id]/page.tsx`** — the coral **"Book this space" CTA** (state-reflecting placeholder, ~lines 298–304) is the **exact seam** to wire → the reserve page. `RailSelectionSummary` (in `availability-calendar.tsx`) already computes the est. price as `fullDay ? dayRateCents : hourlyRateCents × hours` — the breakdown **formalizes this** (D-45).
- **`src/components/availability/*`** — `SlotPicker` lifts `SlotSelectionValue | null` via `onSelectionChange`; `BookingSelectionProvider` context carries the selection into the rail. The reserve flow consumes the **same** selection contract.
- **`src/lib/db/schema.ts`** — `listing` has PostGIS `location` + `listing_location_gist` (radius-ready), `primarySpaceType` + `listing_activity_tag` (activity match, D-35), `hourly/dayRateCents`, `unitCount`, `timezone`; `booking` table + `bookingStatus` enum (Phase 4 owns the state machine); the **`booking_no_overlap` EXCLUDE** lives in `drizzle/0005_booking_exclusion.sql` (hand-authored — Drizzle can't express EXCLUDE; any new hold columns go through a generated migration, but constraint edits are hand-authored).
- **`src/app/actions/*`** — the server-action pattern (session → capability/ownership → Zod re-validate → tx → `revalidatePath`). Booking-create + search actions follow it.
- **Test infra** — Vitest per-worker schema isolation + migrate `./drizzle` first; **`makeRacingClients`** (independent connections) for the concurrency proofs (SC#4 overlap + double-click idempotency); `isPgError` for SQLSTATE; Playwright for the search + checkout E2E.

### Established Patterns
- **The DB is the sole double-booking authority** — never an app-level query-then-insert. The hold insert + the stale-hold sweep run in **one transaction**; the `EXCLUDE` constraint is final (D-48).
- **`timestamptz` UTC everywhere; venue-local at the edge** via `@date-fns/tz` (SC#2). The search availability filter (D-34) interprets the picked date/time in **each venue's** tz.
- **Server-side trust** — re-derive price + re-validate the selected window from the read model; never trust client-supplied times/price (`slotSelectionSchema` + server re-derivation).
- **Route groups** — the public **search home** (`/`), reserve page, and confirmation page are reachable **without** the `(host)` gate; booking mutations require a signed-in `canBook` user (D-41).
- **PostGIS axis order x=lng / y=lat** (Pitfall 1) in radius queries.

### Integration Points
- **Search results query** = PostGIS radius (`ST_DWithin` on `location`) + type/tag + price predicates + `deriveBookable` inclusion (D-16) + the **true-availability free-window predicate** (D-34, via the read model / an `EXISTS` free-unit subquery), bounded by the ~90-day horizon.
- **Reserve flow** — listing "Book" CTA → reserve page (place hold: `createBooking` with `status='pending'` + `expiresAt` + idempotency) → confirm (`pending → confirmed`) → confirmation page.
- **The pending hold immediately affects the Phase-3 calendar read model AND search** (both already treat `pending` as occupying via the partial `WHERE`); Phase 4 adds **lazy expiry** so a stale `pending` doesn't over-occupy.
- **Downstream:** Phase 5 injects payment right **before** `pending → confirmed`; Phase 6 forks instant vs request on `bookingMode`; Phase 7 adds My Bookings (reads these rows) + cancellation; Phase 8 caps group RSVP by `maxOccupancy`.

</code_context>

<specifics>
## Specific Ideas

- **The founder's Airbnb-style flow continues:** search home → results → listing → **reserve page with a live countdown** → durable confirmation. The calm, coral-accent design language from the Phase-3 slot-picker sketch (`.planning/sketches/`) carries forward — occupancy is a normal state, never an error.
- **"See real availability" is applied to SEARCH itself** (the true free-window filter, D-34): a search result is a genuine offer, matching the promise the listing page already makes — consistent with the project's correctness-first spine.
- **The hold + expiry never rely on a background worker** (D-48): the DB `EXCLUDE` constraint + an in-transaction sweep are the authority, mirroring the Phase-3 keystone ethos ("the database makes it structurally impossible").
- **The 8-court founder scenario still holds:** a hold on Court A's 1–5pm window frees the moment it expires; Courts B–H are independently searchable/bookable the whole time (units model, D-21).

</specifics>

<deferred>
## Deferred Ideas

- **Amenities search filter** — a later polish; kept out of the v1 first-class filter set (D-36).
- **Day-rate cap / auto-switch pricing** ("never pay more than a day") — deferred; v1 keeps hourly and full-day distinct (D-45).
- **Map view of search results (DISC-01)** — v2; v1 results are a list of cards (the single-listing map from D-11 is separate).
- **My Bookings list + booking management + cancellation** — Phase 7 (MANAGE-01/02, BOOK-07); Phase 4 ships only the single link-viewable confirmation page (D-43).
- **Background job infrastructure** (BullMQ/Redis or Inngest) for timed expiry / reminders / delayed payouts — introduced when Phase 5/7 needs durable delayed jobs; Phase 4 uses sweep-on-write (D-48).
- **Instant-book vs request-to-book fork** — Phase 6; Phase 4 treats every booking as a direct hold → confirm (`bookingMode` stored, not forked) (D-40).
- **Per-listing hold TTL / per-host booking horizon / per-host lead time** — platform-wide defaults for v1 (D-47).
- **"Near me" geolocation** — optional; may ship as a fast-follow rather than in the first cut (D-33).
- **Guest checkout** (booking without an account) — deferred; v1 requires sign-in (D-41).

_No todos were folded or reviewed — none pending for this phase._

</deferred>

---

*Phase: 4-Booking Core & Search (no payment)*
*Context gathered: 2026-07-14*
