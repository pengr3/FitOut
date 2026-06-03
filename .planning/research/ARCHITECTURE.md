# Architecture Research

**Domain:** Two-sided fitness/recreational space booking marketplace (Airbnb-style; search → availability → book by hour/day → pay; host payouts + commission; group bookings)
**Researched:** 2026-06-03
**Confidence:** HIGH (availability/double-booking, payments flow, booking lifecycle verified against PostgreSQL docs/community + Stripe Connect docs; group-booking modeling is MEDIUM — synthesized from RSVP + reservation patterns, no single canonical source)

## Standard Architecture

A v1 single-region marketplace like this is best built as a **modular monolith**: one deployable application with clear internal module boundaries, one PostgreSQL database, and a small number of external integrations (payments, object storage for photos, email). This avoids premature microservice complexity while keeping module seams clean enough to extract later. Distributed systems are unnecessary at launch liquidity and actively harm the *correctness* guarantees (single DB = single source of truth for availability) that this domain depends on.

The defining architectural constraint is that **availability is the contended resource**. Two bookers can race for the same slot; the booking and the payment both touch real money. The whole structure is organized so that the database is the single authority that prevents double-booking, and external payment calls happen *outside* any held lock.

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT (Responsive Web)                     │
│   Search UI  ·  Listing/Calendar  ·  Booking flow  ·  Host console  │
└───────────────────────────────┬────────────────────────────────────┘
                                 │ HTTPS / JSON
┌───────────────────────────────▼────────────────────────────────────┐
│                       APPLICATION (Modular Monolith)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────┐           │
│  │  Auth &  │ │ Listings │ │ Availability │ │  Search  │  domain   │
│  │  Roles   │ │ /Spaces  │ │  & Calendar  │ │/Discovery│  modules  │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘ └────┬─────┘           │
│       │            │              │              │                  │
│  ┌────▼────────────▼──────────────▼──────────────▼─────┐           │
│  │              Booking lifecycle (orchestrator)        │           │
│  │   request → confirm/instant → paid → completed/cxl   │           │
│  └────┬───────────────────────────────────┬────────────┘           │
│       │                                    │                        │
│  ┌────▼─────┐   ┌──────────────┐    ┌──────▼───────┐                │
│  │  Group   │   │  Payments &  │    │ Notifications │  (email)       │
│  │ Bookings │   │   Payouts    │    │   (async)     │                │
│  └──────────┘   └──────┬───────┘    └───────────────┘                │
└─────────────────────────┼───────────────────────────────────────────┘
            ┌─────────────┼──────────────┬──────────────┐
┌───────────▼─────┐ ┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼─────────┐
│   PostgreSQL    │ │   Stripe   │ │  Object    │ │  Email/SMS    │
│  (+ PostGIS,    │ │  Connect   │ │  storage   │ │  provider     │
│   btree_gist)   │ │ (webhooks) │ │  (photos)  │ │               │
│  SINGLE SOURCE  │ └────────────┘ └────────────┘ └───────────────┘
│   OF TRUTH for  │
│   availability  │
└─────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Auth & Roles** | Identity, sessions, one account holding both `booker` and `host` capabilities. Owns `users`. Authorization checks ("is this user the host of listing X"). | Session/JWT auth; capability flags or a role join table on the user — NOT separate accounts. Host capability unlocks the host console. |
| **Listings/Spaces** | CRUD for spaces: details, photos, pricing (hourly/daily rate), location, activity type(s), booking mode (`instant` vs `request`). Owns `listings`. | Belongs-to host (user). Photos stored in object storage, URLs in DB. Geo point + activity tags for search. |
| **Availability & Calendar** | The authoritative answer to "is space X free for window [start,end)?" Owns availability *rules* and the `bookings` table that materializes occupancy. Generates bookable slots; applies blocks/exceptions. | Rule-based recurring availability + date-specific overrides + blackout dates. The `bookings` rows themselves are the occupancy ledger enforced by the DB exclusion constraint (see Data Flow). |
| **Search & Discovery** | Read-optimized querying: geo radius + activity type + time-window availability + price filters. Owns no tables; reads listings/availability. | PostGIS `ST_DWithin` for geo; activity filter; availability filter = "no confirmed/pending booking overlaps the requested window AND window falls inside an availability rule." |
| **Booking lifecycle** | Orchestrates the state machine. Creates the pending hold, drives payment, transitions states, handles expiry/cancellation. The *only* writer to booking state transitions. | A booking service + a `status` enum + a background expiry worker. Coordinates Availability (the hold) and Payments. |
| **Payments & Payouts** | Charge booker, take commission, pay out host. Reconciles via webhooks. Refunds on cancellation. Owns `payments`/`payouts` and host Stripe account linkage. | Stripe Connect (destination charges with `application_fee_amount`). Webhook handler is the source of truth for payment success, NOT the synchronous API response. |
| **Group Bookings** | Organizer creates a booking, invites people, collects RSVP/headcount. Organizer pays (v1). | A `group_booking` wrapping a single underlying `booking` (one space, one slot) + `invitations` with RSVP status. No per-attendee payment in v1. |
| **Notifications** | Async email: booking confirmed/declined, request pending host action, invite sent, RSVP reminders, payout notice. | Background job queue; never inline in the request path. |

## Recommended Project Structure

```
src/
├── modules/
│   ├── auth/              # users, sessions, role/capability checks
│   ├── listings/          # spaces, photos, pricing, booking-mode
│   ├── availability/      # rules, exceptions, slot generation
│   │                      #   + the bookings occupancy ledger lives here
│   ├── search/            # read-only geo+activity+time queries (no tables)
│   ├── booking/           # lifecycle orchestrator + state machine + expiry worker
│   ├── payments/          # Stripe Connect, commission, payouts, webhooks, refunds
│   ├── groups/            # group bookings, invitations, RSVP
│   └── notifications/     # async email jobs
├── db/
│   ├── migrations/        # incl. btree_gist + PostGIS extensions, exclusion constraint
│   └── schema.ts          # entity definitions
├── jobs/                  # background workers (expiry sweep, payout, email)
├── lib/                   # shared: db client, stripe client, geo helpers, errors
└── api/                   # HTTP routes / controllers thin over module services
```

### Structure Rationale

- **modules/ by domain, not by layer:** Each module owns its tables and exposes a service interface; other modules call services, not each other's tables. This is what makes future extraction (e.g. pulling payments into its own service) cheap.
- **availability/ owns the `bookings` table:** Occupancy and availability are the same concern. Putting the exclusion constraint and the bookings ledger together keeps the double-booking guarantee in one place. The `booking/` module orchestrates *state*, but the *uniqueness* guarantee is structurally enforced by availability's schema.
- **booking/ as the only state-transition writer:** Centralizing transitions prevents the classic bug where three different code paths each flip a booking to "paid" inconsistently.
- **jobs/ separate from request path:** Expiry sweeps, payouts, and emails must not block user requests and must survive process restarts.

## Architectural Patterns

### Pattern 1: Database-enforced non-overlap (the double-booking guarantee)

**What:** Use a PostgreSQL **GiST exclusion constraint** so the database itself makes overlapping bookings for the same space *structurally impossible*. The application never has to "check then insert" (which is racy); it just inserts, and the DB rejects conflicts atomically.

**When to use:** Always, from day one. This is the single most important decision in the system. Application-level "is it free?" checks are a race condition waiting to happen — two concurrent requests both read "free," both write, both succeed. The constraint closes that window.

**Trade-offs:** Requires `btree_gist` extension and a time-range column type. Conflict surfaces as a specific SQL error (`23P01`) the app must catch and translate to "just got booked, pick another slot." Cancelled bookings must be excluded via a partial `WHERE` so they don't block re-booking.

**Example:**
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 'slot' is a tstzrange [start, end); status enum incl. pending/confirmed/cancelled
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    listing_id WITH =,
    slot       WITH &&        -- && = "ranges overlap"
  )
  WHERE (status IN ('pending', 'confirmed'));  -- holds AND confirmed block; cancelled/expired do not
```
```ts
// App: just insert. Catch the exclusion violation; do NOT pre-check.
try {
  await db.insert(bookings).values({ listingId, slot, status: 'pending', ... });
} catch (e) {
  if (e.code === '23P01') throw new SlotTakenError(); // 409 → "someone just grabbed it"
  throw e;
}
```

### Pattern 2: Two-phase booking with a pending hold (payments outside the lock)

**What:** Booking is **two phases**. Phase 1: atomically insert a `pending` booking row — this *is* the hold, because the exclusion constraint instantly blocks anyone else from that slot. Phase 2: do the slow stuff (Stripe payment, or host approval) *with no DB lock held*. On success → `confirmed`; on failure/timeout → `expired`/`cancelled`, which (via the partial constraint) frees the slot again.

**When to use:** Whenever an external call (payment authorization, host decision) sits between "user wants this slot" and "slot is definitively sold." Never hold a row lock or DB transaction open across a Stripe API call — it pins a connection for hundreds of ms to seconds and can deadlock under load.

**Trade-offs:** Needs a background **expiry worker** to sweep abandoned `pending` holds past their TTL and mark them `expired` (the constraint then frees the slot). TTL must cover realistic checkout time (e.g. 10–15 min) but be short enough to not starve inventory. Pending holds *do* count as occupancy, so an abandoned cart briefly blocks others — acceptable and standard.

**Example (lifecycle in one place):**
```
create pending booking (insert; exclusion constraint = the hold)
        │  success → slot now held
        ▼
  instant-book?  ──yes──► authorize+capture payment ──ok──► CONFIRMED
        │ no                                         └fail► CANCELLED (frees slot)
        ▼
  REQUEST PENDING ──host approves──► capture payment ──ok──► CONFIRMED
        │ host declines / 24h timeout                  └fail► CANCELLED
        ▼
     CANCELLED (frees slot)
```

### Pattern 3: Stripe Connect destination charges + webhook-as-source-of-truth

**What:** Use **Stripe Connect destination charges**: the booker pays the *platform*, Stripe automatically routes the host's share to their connected account and the platform keeps `application_fee_amount` (the commission). The synchronous API response is *not* trusted for final state — a **webhook** (`payment_intent.succeeded`, `charge.refunded`, etc.) is the authority that flips a booking to `confirmed`/refunded.

**When to use:** This is the right charge model for an Airbnb/Peerspace-style single-host-per-booking marketplace. (The alternative — *separate charges and transfers* — is for splitting one payment across *multiple* sellers, e.g. DoorDash; v1 doesn't need it. v2 per-attendee cost-splitting might, so keep the payments module swappable.)

**Trade-offs:** Hosts must complete Stripe Connect onboarding before they can receive payouts — this is a hard dependency and an onboarding-friction source. Webhooks must be **idempotent** (Stripe retries) and signature-verified. Refund logic for cancellations must respect the platform's cancellation policy and reverse the application fee as policy dictates.

**Example:**
```ts
// Destination charge: booker pays platform, host gets paid, platform keeps commission
await stripe.paymentIntents.create({
  amount: totalCents,
  currency: 'usd',
  application_fee_amount: commissionCents,        // platform commission
  transfer_data: { destination: host.stripeAccountId },
});
// Confirmation comes from the webhook, not from this response:
// on 'payment_intent.succeeded' → booking.status = 'confirmed' (idempotent)
```

## Data Flow

### Core entities and relationships

```
users (1)───<(N) listings           users.capabilities: {booker, host}
listings (1)───<(N) availability_rules   (recurring + date-specific + blackout)
listings (1)───<(N) bookings         ← occupancy ledger; exclusion constraint here
bookings (1)───(0..1) group_bookings ← a group booking wraps ONE booking
group_bookings (1)───<(N) invitations    invitations.rsvp: {pending,yes,no}
bookings (1)───(1) payments          payments.stripe_payment_intent_id
listings.host ──(1)── host_stripe_account (Connect onboarding state)
```

Key fields:
- **bookings:** `id, listing_id, booker_user_id, slot tstzrange, status, price_cents, created_at, hold_expires_at`. `status ∈ {pending, request_pending, confirmed, completed, cancelled, expired, declined}`.
- **availability_rules:** recurring weekly windows + per-date overrides + blackout dates. Used to *validate* a requested slot ("does this fall inside open hours?") and to *render* the calendar. Does **not** itself store occupancy — `bookings` does.
- **group_bookings:** `id, booking_id, organizer_user_id, headcount_expected`. **invitations:** `id, group_booking_id, invitee (email/user), rsvp_status`.

### Request flow: making a booking

```
Booker clicks "Book 6–7pm Sat"
        ↓
[Booking service] validate window ∈ availability_rules (open hours, not blacked out)
        ↓
INSERT booking (status=pending, slot=[6pm,7pm), hold_expires_at=now+15m)
        ↓                        ← exclusion constraint runs ATOMICALLY
   ┌────┴─────────────────────────┐
23P01 conflict                 success → slot held
   ↓                               ↓
409 "just booked,            instant-book?
 pick another"                ┌────┴────────────┐
                            yes                 no
                              ↓                  ↓
                  Stripe PaymentIntent    notify host (24h to decide)
                  (NO db lock held)        status = request_pending
                              ↓                  ↓ host approves
                    webhook: succeeded     capture payment
                              ↓                  ↓ webhook: succeeded
                       status=confirmed    status=confirmed
                              ↓
                    email both parties; host payout via Connect
```

### Payment flow (money movement)

```
Booker card ──charge──► Platform (Stripe account)
                            │
        ┌───────────────────┼────────────────────┐
   application_fee     transfer_data          Stripe fees
   (commission)        .destination           (platform pays)
   stays on platform        │
                            ▼
                     Host connected account ──payout──► host bank
Cancellation/refund: stripe.refunds.create(...) per cancellation policy;
  reverse application fee as policy dictates; booking.status=cancelled (frees slot)
```

### Key data flows

1. **Availability read (search & calendar):** A slot is *bookable* iff (a) it falls inside an `availability_rule` open window, (b) it is not in a blackout/override, and (c) **no** `pending`/`confirmed` booking overlaps it. Search composes PostGIS geo filter + activity filter + this availability predicate.
2. **Occupancy write (booking):** Only ever via inserting/transitioning a `bookings` row; the exclusion constraint is the single chokepoint that guarantees no two overlapping holds survive.
3. **Group RSVP:** Independent of occupancy. The organizer's underlying `booking` holds the slot; invitations + RSVP only adjust expected headcount and never touch the availability constraint (v1 = one slot, organizer pays).

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users (launch) | Modular monolith + single Postgres is more than enough. Exclusion constraint handles concurrency. No caching needed. Focus engineering on correctness, not throughput. |
| 1k–100k users | Add read replica for search; add a proper job queue (Redis/pg-based) for expiry + email + payouts if not already. Index review on geo + slot columns. Cache hot listing pages. |
| 100k+ users | Consider extracting search into a dedicated read store (the module boundary makes this clean). Payments and notifications can become independent services. Availability/booking stays on primary Postgres — it must remain the single authority. |

### Scaling priorities

1. **First bottleneck:** Search queries combining geo + availability across many listings. Fix with PostGIS GiST index on the geo column and a partial index on `bookings(listing_id, slot)`; precompute/denormalize "open hours" if rule evaluation gets heavy.
2. **Second bottleneck:** Webhook + background job throughput (payments, expiry sweeps). Fix with a real durable queue and idempotent handlers — do this *before* it becomes the bottleneck because correctness depends on it.

## Anti-Patterns

### Anti-Pattern 1: "Check availability, then insert" in application code

**What people do:** `SELECT` to see if the slot is free, then `INSERT` the booking if it looked free.
**Why it's wrong:** Classic TOCTOU race. Two concurrent bookers both read "free," both insert, both succeed → double-booked space, two charged cards, one furious host. No amount of app-level checking closes this without a lock, and app-level locks are fragile.
**Do this instead:** Let the **DB exclusion constraint** be the check. Just insert and handle the `23P01` conflict. The database serializes conflicting inserts for you.

### Anti-Pattern 2: Holding a DB transaction/lock open across the Stripe call

**What people do:** Begin transaction, lock the slot row, call Stripe, commit on success.
**Why it's wrong:** External payment calls take hundreds of ms to seconds (and can hang). Holding a lock that long pins DB connections, tanks throughput, and risks deadlocks. A Stripe timeout can leave the lock orphaned.
**Do this instead:** Two-phase: insert a short `pending` hold (instant, constraint-enforced), commit, *then* call Stripe with no lock held. Confirm via webhook. Sweep expired holds with a background worker.

### Anti-Pattern 3: Materializing every bookable slot as a row up front

**What people do:** Pre-generate a row for every hour of every day the space could be booked, then mark rows "taken."
**Why it's wrong:** Explodes row counts, makes recurring-rule changes painful, and couples calendar rendering to inventory. Hourly + daily mixed granularity makes fixed-slot rows especially awkward.
**Do this instead:** Store availability as **rules** (recurring windows + date overrides + blackouts) and store **only actual bookings** as time-range rows. Generate displayable slots on the fly; validate a requested window against rules; let the exclusion constraint guard occupancy.

### Anti-Pattern 4: Treating the synchronous Stripe API response as final truth

**What people do:** Mark the booking `confirmed` based on the PaymentIntent create/confirm response.
**Why it's wrong:** Payment state can change asynchronously (async payment methods, disputes, delayed failures); the response can be lost while the charge succeeded. State drifts from Stripe.
**Do this instead:** Treat **webhooks** as the source of truth for payment state. Make handlers idempotent and signature-verified. The synchronous response only drives the client UX, not the durable booking state.

### Anti-Pattern 5: Separate booker and host *accounts*

**What people do:** Model host and booker as different account types/tables, forcing re-signup to switch sides.
**Why it's wrong:** The product explicitly wants both capabilities on one account; separate accounts create friction and data duplication.
**Do this instead:** One `users` table with **capability flags / roles**. Becoming a host adds the host capability (and triggers Stripe Connect onboarding); it does not create a new identity.

## Integration Points

### External services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Stripe Connect** | Destination charges with `application_fee_amount`; host onboarding via Connect; **webhooks** for truth. | Host must finish onboarding before payout. Webhooks idempotent + signature-verified. Refund/cancellation reverses fee per policy. Keep payments module swappable for v2 cost-splitting (may need separate charges & transfers). |
| **Object storage** (e.g. S3-compatible) | Listing photos uploaded direct or via app; store URLs in `listings`. | Don't store binaries in Postgres. |
| **Email provider** | Async, via job queue. | Booking confirm/decline, request pending, invites, RSVP reminders, payout notices. Never inline in request path. |
| **PostGIS** (in Postgres) | `ST_DWithin` for radius search on listing geo point; GiST index. | Single-region launch, but model geo properly now — cheap to do, costly to retrofit. |

### Internal boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Booking ↔ Availability | Direct service call (same DB) | Booking inserts/transitions the `bookings` row; availability owns the table + constraint. Single transaction boundary for the hold. |
| Booking ↔ Payments | Service call out, **webhook** call back | Booking triggers payment; payment webhook drives booking to confirmed/refunded. Decoupled by the webhook, not synchronous. |
| Search ↔ Listings/Availability | Read-only queries | Search owns no tables; pure read composition. Cleanest module to later extract to a read replica/store. |
| Group ↔ Booking | Group wraps one booking | Group booking references a single underlying `booking`; RSVP/headcount never touches the occupancy constraint in v1. |
| Booking ↔ Notifications | Async events/jobs | Fire-and-forget; failures retried, never block the booking transaction. |

## Suggested Build Order (dependency-driven)

The hard dependency chain is: **identity → supply (listings) → availability → the booking+concurrency core → payments → group bookings**. Search can develop in parallel once listings + availability exist. Suggested order:

1. **Auth & Roles** — everything is owned by a user; one account, two capabilities. Foundation, no dependencies.
2. **Listings/Spaces** — supply must exist before anything is bookable. Depends on Auth (host owns listing).
3. **Availability & Calendar** — define the slot/rule model and create the `bookings` table **with the exclusion constraint** here. This is the riskiest correctness surface; do it early and test concurrency explicitly. Depends on Listings.
4. **Booking lifecycle core (no payment yet)** — pending-hold insert, state machine, expiry worker. Prove double-booking is impossible (concurrent-insert tests) before money is involved. Depends on Availability.
5. **Search & Discovery** — geo + activity + availability filtering. Can be built in parallel with step 4 once Listings + Availability exist; not a dependency for booking correctness.
6. **Payments & Payouts** — Stripe Connect onboarding, destination charges, webhooks, refunds. Wire into the lifecycle (instant-book capture; request-to-book approve-then-capture). Depends on Booking lifecycle.
7. **Request-to-book approval flow** — host approve/decline path (the lifecycle should already model the `request_pending` state from step 4; this adds the host UI + decision capture + 24h timeout). Depends on Booking + Payments.
8. **Group Bookings** — organizer wraps a confirmed/pending booking, invites, RSVP/headcount. Last because it's the differentiator, not the core gate, and depends on a working single-booking + payment flow. Organizer-pays reuses the existing payment path unchanged.
9. **Notifications** — threaded throughout (each step emits its emails) but hardened/centralized late.

**Critical-path note for the roadmap:** Steps 3–4 (availability model + DB exclusion constraint + two-phase hold) are the architectural keystone and the highest-risk research/implementation surface. They should be a dedicated early phase with explicit concurrency testing, *before* payments add money to the failure modes. Stripe Connect onboarding (step 6) is the second-deepest area — host payout onboarding friction and webhook idempotency warrant their own focused attention.

## Sources

- [PostgreSQL GiST Exclusion Constraint: The Database-Level Answer to Double Bookings](https://amitavroy.com/articles/postgresql-gist-exclusion-constraintthe-database-evel-answer-to-double-bookings) — exact SQL, `23P01` handling, partial constraint (HIGH)
- [Prevent overlapping date intervals in Postgres (room booking)](https://axellarsson.com/blog/postgres-prevent-overlapping-time-inteval/) (HIGH)
- [How to avoid overlapping intervals with PostgreSQL — PostgreSQL wiki](https://wiki.postgresql.org/wiki/How_to_avoid_overlapping_intervals_with_PostgreSQL) (HIGH, official wiki)
- [Beyond Start and End: PostgreSQL Range Types | boringSQL](https://boringsql.com/posts/beyond-start-end-columns/) — range types + GiST (HIGH)
- [Understand how charges work in a Connect integration | Stripe Docs](https://docs.stripe.com/connect/charges) (HIGH, official)
- [Create destination charges | Stripe Docs](https://docs.stripe.com/connect/destination-charges) (HIGH, official)
- [Create separate charges and transfers | Stripe Docs](https://docs.stripe.com/connect/separate-charges-and-transfers) — v2 cost-splitting reference (HIGH, official)
- [Collect application fees | Stripe Docs](https://docs.stripe.com/connect/marketplace/tasks/app-fees) — commission via `application_fee_amount` (HIGH, official)
- [How I Design a Reservation System for race conditions with Async Processing — Dylan Lee](https://medium.com/@inexpressible2510/how-i-design-a-reservation-system-for-race-conditions-with-async-processing-simple-and-practical-7ffb50798fb2) — two-phase hold pattern (MEDIUM)
- [How to Model Booking and Reservation Systems in Redis | OneUptime](https://oneuptime.com/blog/post/2026-03-31-redis-model-booking-reservation-systems/view) — provisional holds + TTL + sweep worker (MEDIUM)
- [Request to Book (RtB) API — Booking.com](https://developers.booking.com/connectivity/docs/request-to-book/overview) — request-to-book 24h decision window (MEDIUM)
- [PostGIS](https://postgis.net/) and [Geospatial Search in Postgres — Neon](https://neon.com/guides/geospatial-search) — `ST_DWithin`, GiST geo index (HIGH)
- [Hotel Booking: Schema Design Comparison — DEV](https://dev.to/sumedhbala/hotel-booking-schema-design-comparison-g3h) — rules-vs-materialized-slots tradeoff (MEDIUM)

---
*Architecture research for: two-sided fitness/recreational space booking marketplace*
*Researched: 2026-06-03*
