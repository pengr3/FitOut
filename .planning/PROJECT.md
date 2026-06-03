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

### Active

<!-- Current scope. Building toward these. Hypotheses until shipped and validated. -->

- [ ] Visitors can search/browse fitness spaces by location, activity type, and availability
- [ ] A booker can view a space's listing details and its real, up-to-date availability calendar
- [ ] A booker can reserve a space for a chosen time window (by the hour or by the day)
- [ ] A booker can pay for a booking online, and the host receives a payout minus a platform commission
- [ ] A host can list a space with details, photos, pricing, and bookable availability
- [ ] A host can choose whether their listing is instant-book or request-to-book (approval required)
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
*Last updated: 2026-06-03 after Phase 1 (Auth & Accounts) completion*
