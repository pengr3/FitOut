# FitOut

## What This Is

FitOut is an Airbnb-style two-sided marketplace for **fitness and recreational spaces** — gyms, courts (pickleball, tennis, basketball), studios (yoga, dance), and private/home gym setups — that people can book flexibly by the hour or by the day. Hosts list their space and availability; people search, see real availability, and book a time slot. A signature feature is **group bookings**: an organizer reserves a space and invites friends, confirming how many attendees are coming.

The product is optimized first for the **person booking** (the demand side is the center of gravity), with hosts as the supply that makes booking possible.

## Core Value

**Find & book a space.** If everything else fails, a person must be able to search for a fitness space, see real availability, and reserve a time slot — smoothly and with confidence the booking is real.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- [x] Users can create accounts and sign in (separate booker and host capabilities on one account) — **Validated in Phase 1: Auth & Accounts** (email/password + Google OAuth, 30-day sliding sessions, password reset that revokes other sessions, profile + optional avatar, server-side capability flags with privilege-escalation guard; AUTH-01..05)
- [x] A host can list a space with details, photos, pricing, and booking mode, and a listing only becomes bookable once payout onboarding is complete — **Validated in Phase 2: Listings & Host Onboarding** (Airbnb-style create/edit wizard, ordered signed direct-to-Cloudinary photos, hourly + day rates in integer cents, draft/published/unlisted status with a server-side D-02 publish gate, un-gated public detail page with privacy-aware address projection, PayMongo Linked-Accounts onboarding + signature-verified `merchant.activated` bookability gate; LIST-01..06, PAY-04). The live availability calendar lands in Phase 3.
- [x] A booker can view a space's real, up-to-date availability calendar, a host can define recurring weekly operating hours and block specific dates/times, and overlapping bookings are made structurally impossible at the database — **Validated in Phase 3: Availability & the Double-Booking Guarantee** (host weekly-hours editor + date/time blocks with server-side ownership re-checks; venue-timezone month→day→slot calendar on the public listing page with range-fill hourly / full-day selection; occupied, blocked, and past hours unselectable; a Postgres GiST `EXCLUDE` constraint `booking_no_overlap` that rejects the (N+1)th overlapping booking at the DB level — AVAIL-01..05, the correctness keystone proven before any money flows).
- [x] A booker can search/browse fitness spaces by location, activity type, date/time availability, and price, and reserve a chosen time window (by the hour or by the day) via a short pending hold that confirms without payment — **Validated in Phase 4: Booking Core & Search (no payment)** (two-stage PostGIS `::geography` radius + category/price/true-availability search that reuses the listing calendar's `getAvailability` read model so results can't diverge; a `createPendingHold` two-phase hold protected by the DB exclusion constraint — outer-retry on 40P01, per-unit SAVEPOINT on 23P01, in-tx stale-hold sweep, double-click idempotency; server-frozen ₱ price quote + deterministic `FIT-` reference; owner-gated reserve → live 15-min countdown → atomic server-side confirm → durable confirmation, with graceful abandoned-hold expiry; SEARCH-01..05, BOOK-01..03 — full-flow E2E + human-verified. Online payment + host payouts arrive in Phase 5.)

### Active

<!-- Current scope. Building toward these. Hypotheses until shipped and validated. -->

- [ ] A booker can pay for a booking online, and the host receives a payout minus a platform commission
- [ ] A host can choose whether their listing is instant-book or request-to-book (approval required) — *booking-mode preference stored in Phase 2 (LIST-04); the instant-vs-request behavior fork is built in Phase 6*
- [ ] A host can review and approve/decline booking requests on request-to-book listings
- [ ] An organizer can create a group booking, invite people, and have them confirm attendance (RSVP/headcount)
- [ ] Both sides can see their bookings (upcoming/past) and booking status

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Automated cost-splitting among group attendees — deferred to v2; v1 group bookings use organizer-pays + RSVP/headcount confirmation (keeps v1 focused on the core transaction)
- Native iOS/Android apps — v1 is a responsive web app; native apps considered after validation
- Multi-city / nationwide rollout at launch — launching in one city/region first to build marketplace liquidity (density beats breadth early)
- Open paid sessions / per-attendee ticketing (each attendee pays to grab a spot) — a possible group-booking variant, not in v1
- In-app messaging/chat between hosts and bookers — revisit after core booking flow proves out
- Reviews & ratings — valuable for trust but not required for the core transaction in v1

## Context

- **Greenfield project.** New build, no existing codebase. Working directory: `FitOut`.
- **Marketplace dynamics matter.** Two-sided marketplaces live or die on liquidity. Concentrating supply and demand in a single launch market is a deliberate strategy to ensure that when a booker searches, there are real, bookable spaces to find.
- **Demand-side first.** The booking experience (search → availability → reserve → pay) is the priority. Host tooling exists to make that experience possible, not the other way around.
- **Group bookings are the differentiator** versus generic booking tools, but not the core-value gate. v1 keeps them simple (invite + confirm headcount, organizer pays); richer mechanics (cost-splitting, per-spot payment) come later.
- **Real payments from day one.** v1 processes actual money — charging bookers, paying out hosts, and taking a platform commission — so the trust and correctness of the payment/payout flow is a first-class concern.

## Constraints

- **Platform**: Responsive web app (browser, desktop + mobile) — fastest path to a usable, testable product; native mobile deferred.
- **Payments**: Real money handling in v1 — charge booker, pay out host, platform takes a commission. Implies a payments provider that supports marketplace payouts (e.g. Stripe Connect) and the associated compliance/onboarding for hosts.
- **Launch market**: Single city/region at launch — features should not assume multi-region complexity, but data model should not preclude it later.
- **Availability correctness**: Bookings touch real time slots and real money — double-booking and stale-availability are unacceptable failure modes for the core value.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Broad fitness-space marketplace (courts, gyms, studios, home gyms) rather than a single vertical | Maximizes available supply and addressable demand in the launch market; the booking flow generalizes across space types | — Pending |
| Optimize for the booking (demand) side first | The core transaction — find & book — is where value is proven; supply tooling serves it | — Pending |
| Host's choice: instant-book or request-to-book per listing | Different space types/hosts have different comfort levels; flexibility increases supply without forcing one model | — Pending |
| Group bookings v1 = organizer pays + RSVP/headcount; cost-splitting deferred to v2 | Captures the differentiating "invite/confirm attendees" magic without building payment-splitting infrastructure before the core transaction is solid | — Pending |
| Real payments + marketplace payouts in v1 (commission model) | Booking a paid space is the actual product; reservations-only would not validate the real value or business model | — Pending |
| Responsive web app for v1 (no native apps) | Fastest route to a usable, iterable product across desktop and mobile | — Pending |
| Launch in a single city/region first | Two-sided marketplaces need local liquidity; density makes search results meaningful | — Pending |
| **D-20 — Adopt PayMongo (PH-native, BSP-regulated EMI) as the payments provider for the Philippine launch, replacing Stripe Connect.** Rails: QRPh + GCash + Maya + cards. Host onboarding via PayMongo **Platforms / Linked Accounts** (hosted-redirect KYC; beta/sales-gated). Marketplace payout is **hold-until-session**: collect the full amount to the **platform wallet** → **HOLD** → after the session push an on-demand **`inhouse` wallet-to-wallet transfer** (`POST /v2/batch_transfers`, `provider:"paymongo"`) of (booking − commission) to the host's Linked-Account wallet — **NOT** PayMongo "payment splitting" (which pays the host at settlement, violating hold-until-session). Bookability gate (the Stripe `payouts_enabled` equivalent) = host **`merchant.activated`** webhook + **`activation_status: activated`** + wallet **`status: activated`**. No official SDK (thin REST wrapper / community TS lib); **`Paymongo-Signature`** HMAC-SHA256 webhook verification; **`Idempotency-Key`** on POSTs. | Stripe has **no local PH acquiring and no QRPh** (invite-only preview; a workaround needs a US entity), so it cannot process real PH payments at launch. PayMongo is PH-native with marketplace payouts and preserves the correctness intent: hold funds until the session; webhook as source of truth; **never pay the host at booking time**. Validated by a live sandbox spike (2026-07-09). | **Adopted — supersedes D-17 & D-19** (2026-07-09) · **Implemented in Phase 2** (2026-07-10): onboarding action + `merchant.activated`/`merchant.declined` webhook bookability gate live; tests mock PayMongo — real hosted onboarding still needs Platforms beta enablement for UAT |
| **D-21 — Units occupancy model (the double-booking keystone).** A listing has a **`unitCount`** (integer, default 1 = exclusive whole-space rental); each booking reserves **exactly one unit** exclusively for its time window. The guarantee is a **Postgres GiST `EXCLUDE` constraint scoped by `(listing_id, unit, tstzrange '[)')`** (needs `btree_gist`; partial `WHERE` on occupying statuses so cancelled/declined free the slot) — the (N+1)th overlapping booking finds no free unit and is DB-rejected (`23P01`). E.g. an 8-court facility = one listing, `unitCount = 8`. **`maxOccupancy` (D-07) = per-booking group headcount, NOT parallel bookings** — two independent caps. Rejected "shared up to capacity / sum-of-headcounts" (race-prone app-level count; collides with out-of-scope per-attendee ticketing). | Makes overlaps **structurally impossible at the DB** (the core-value correctness intent), generalizes the CLAUDE.md by-listing constraint to real multi-unit venues without an app-level count check, and cleanly separates in-scope court-reservation from deferred per-spot open/free play. | **Adopted — locked in Phase 3 discuss (2026-07-10); recorded at Phase-3 planning transition (2026-07-11).** Reshapes downstream: **Phase 4** builds the pending-hold/checkout on this table + constraint; **Phase 8** caps RSVP by `maxOccupancy`. Per-spot open/free play (per-attendee ticketing) deferred; it will reuse units-as-spots. |

> **Superseded decisions** (payments-provider revision — **D-20**, 2026-07-09; kept for traceability, not deleted; the canonical D-numbered decision records live in `.planning/phases/02-listings-host-onboarding/02-CONTEXT.md`):
> - **D-17** — Stripe SDK pinned `stripe@^22` + `apiVersion 2026-05-27.dahlia`. **Superseded by D-20** — PayMongo has no official SDK; use a thin REST wrapper / community TS lib.
> - **D-19** — Stripe Connect Express launch `country=US` via `STRIPE_CONNECT_COUNTRY`. **Superseded by D-20** — PayMongo is PH-native; there is no country/env toggle.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-15 — after Phase 4 (Booking Core & Search, no payment) completion: SEARCH-01..05 + BOOK-01..03 validated; two-stage geo/availability search + the two-phase `createPendingHold` mechanism (state machine + abandoned-hold expiry) proven end-to-end and human-verified before any money flows (8/8 must-haves). Prior update: 2026-07-14 — after Phase 3: AVAIL-01..05 validated; the DB-level GiST `EXCLUDE` double-booking guarantee (D-21 units model) shipped and verified.*
