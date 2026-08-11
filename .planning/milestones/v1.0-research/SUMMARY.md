# Project Research Summary

**Project:** FitOut
**Domain:** Two-sided fitness/recreational-space booking marketplace (Airbnb for gyms, courts, studios, home gyms)
**Researched:** 2026-06-03
**Confidence:** HIGH (core stack, availability model, payments topology); MEDIUM (group-booking mechanics, auth library choice, hosting)

## Executive Summary

FitOut is a two-sided marketplace where the core transaction -- search for a fitness space, see real availability, reserve a time slot, pay, and have the host receive a payout minus commission -- is both the primary value proposition and the hardest engineering problem. All four researchers converged on the same foundational insight: booking correctness belongs in the database, not in application code. A Postgres GiST exclusion constraint on a tstzrange column, scoped by listing, makes overlapping bookings structurally impossible under any concurrency. No application-level check-then-insert pattern can replicate this guarantee. Everything else -- the UI, the search, the group booking layer -- is built on top of this correctness keystone.

The recommended architecture is a modular monolith (Next.js 16 App Router, TypeScript, PostgreSQL 18, Drizzle ORM) with Stripe Connect Express accounts using separate charges and transfers. The two-phase booking pattern -- short pending hold via DB insert (the constraint is the hold), then payment or host approval outside any DB lock, then a background expiry worker sweeping abandoned holds -- is the industry-standard approach. Funds must be held on the platform until after session delivery; paying out hosts at booking time is a critical liability pitfall.

The highest risks are: (1) the double-booking race, which must be closed at the DB level before payments are wired in; (2) Stripe Connect liability traps (post-payout chargebacks, missing reverse_transfer, underdefined cancellation policy); (3) cold-start liquidity -- the marketplace dies if supply is not seeded before demand is unlocked. Group bookings are the product differentiator but must be built after the single-booker paid transaction is end-to-end and solid, because the group layer reuses the entire payment and cancellation infrastructure underneath.

---
## Key Findings

### Recommended Stack

Build a single TypeScript codebase on Next.js 16 (App Router) with PostgreSQL 18 accessed via Drizzle ORM, deployed on a container host (Railway or Render) that supports always-on background jobs. Drizzle is a deliberate, load-bearing choice over Prisma: its SQL-first approach and plain-SQL migration files make it clean to hand-write the exclusion constraint and PostGIS DDL that no ORM can express in its schema DSL today. Vercel-only deployment is disqualified because Stripe webhook processing, delayed transfer jobs, and hold-expiry sweeps require a persistent worker process, not edge functions.

**Core technologies:**
- **Next.js 16 (App Router) + React 19**: Full-stack web framework; Server Components keep pricing/availability logic server-side. One codebase for responsive web + API.
- **TypeScript 5.7+**: Type safety end-to-end from DB schema to UI; essential for a money-handling marketplace.
- **PostgreSQL 18 + btree_gist + PostGIS**: The only mainstream DB with native GiST exclusion constraints. tstzrange + EXCLUDE USING gist is the correctness foundation. PostGIS for geo radius search.
- **Drizzle ORM 0.44+**: SQL-first ORM; plain-SQL migration files allow clean addition of exclusion constraints and PostGIS DDL without fighting the ORM.
- **Stripe Connect Express + separate charges and transfers**: Platform holds funds until after session delivery, enabling clean refund/chargeback recovery. Express accounts = Stripe-hosted KYC/onboarding.
- **Better Auth 1.x**: Session-based auth stored in Postgres; supports single-account with booker+host capabilities via roles. NextAuth/Auth.js is in security-patch-only mode as of Sept 2025.
- **BullMQ + Redis or Inngest**: Background jobs for delayed transfers, hold expiry, RSVP deadlines, email reminders.
- **Resend**: Transactional email for confirmations, request decisions, group invites, reminders.
- **shadcn/ui + Radix + Tailwind v4**: Accessible component primitives (date pickers, calendars, modals).
- **PostGIS geography(Point,4326) + GiST index**: Radius search for spaces near me; model geo correctly from day one.

**Key version constraints:** PostgreSQL 18 requires the btree_gist extension for the exclusion constraint. Drizzle cannot express EXCLUDE constraints in its schema DSL -- hand-write in migration SQL. Tailwind v4 + shadcn/ui requires verifying component template versions on init.

See `.planning/research/STACK.md` for full installation commands, version compatibility table, and hosting alternatives.

---
### Expected Features

**Must have (table stakes) -- launch blockers:**
- Email/password auth, single account with booker+host capabilities (not separate account types)
- Host listing creation: type taxonomy, capacity, address, amenities, photos (multiple, ordered)
- Host availability model: recurring operating hours + one-off blocks/overrides
- Host pricing: hourly rate + day rate (flat in v1)
- Instant-book vs request-to-book toggle per listing
- Stripe Connect payout onboarding (KYC) -- gates bookability, not listing creation
- Search: location radius + activity type + date/time availability filter + price
- Real-time availability calendar on listing detail page
- Slot hold during checkout (pending booking row = the hold; DB constraint enforces it)
- Online card payment + platform commission deduction + host payout
- Authorize-then-capture for request-to-book; capture on host approval
- Host approve/decline with expiry (~24h window)
- Booking confirmation + transactional emails
- Cancellation + refund with a named policy tier
- My Bookings (both sides): upcoming/past + status lifecycle
- Group booking: organizer books -> invite by link/email -> attendees RSVP -> headcount vs capacity

**Should have (differentiators, v1.x after launch validation):**
- Map view of search results (list-first satisfies core value; map enhances)
- Group waitlist + drop-out handling
- Reviews and ratings (requires booking volume to be meaningful)
- Saved/favorite listings

**Defer (v2+):**
- Automated cost-splitting among group attendees -- explicitly deferred; adds per-attendee payment infrastructure before core transaction is proven
- Per-attendee paid spots / ticketing
- In-app messaging between host and booker
- Native iOS/Android apps
- Multi-city expansion
- Dynamic/tiered/seasonal pricing and add-ons
- Memberships / class packs

**Anti-feature watch:** The single biggest scope-creep risk is group cost-splitting drifting into v1. The organizer-pays model keeps group bookings as a thin coordination layer on a normal payment. Do not combine.

See `.planning/research/FEATURES.md` for full prioritization matrix, competitor analysis, and feature dependency graph.

---
### Architecture Approach

Build a modular monolith: one deployable Next.js application, one PostgreSQL database, clear internal module boundaries (src/modules/auth, listings, availability, search, booking, payments, groups, notifications). Modules own their tables and expose service interfaces; other modules call services, not each other tables. The single-DB model is not a weakness -- it is the correctness requirement. Distributed systems would break the transactional guarantee that makes double-booking prevention clean.

The defining constraint is that availability is the contended resource. The booking service inserts a pending row (which activates the GiST exclusion constraint as the hold), commits the transaction immediately, and only then makes the external Stripe call -- never holding a DB lock across a network call. Webhooks from Stripe are the source of truth for payment state, not the synchronous API response.

**Major components:**
1. **Auth and Roles** -- one users table, capability flags for booker/host; becoming a host adds the capability and triggers Stripe onboarding, does not create a new identity
2. **Listings/Spaces** -- CRUD for spaces: details, photos, pricing, booking mode, geo point, activity type(s)
3. **Availability and Calendar** -- authoritative slot engine; owns availability_rules (recurring + date overrides + blackouts) AND the bookings occupancy ledger; GiST exclusion constraint lives here
4. **Search and Discovery** -- read-only composition of PostGIS geo filter + activity filter + availability predicate; owns no tables; cleanest module to later extract to a read replica
5. **Booking lifecycle** -- the only writer to booking state transitions; orchestrates two-phase hold -> payment -> confirm/expire state machine; owns the background expiry worker
6. **Payments and Payouts** -- Stripe Connect: charge, commission, delayed transfer post-session, refunds, webhooks; webhook handler is source of truth
7. **Group Bookings** -- group_booking wrapping one underlying booking + invitations with RSVP state; organizer-pays reuses the existing payment path unchanged; RSVP never touches the occupancy constraint
8. **Notifications** -- async email jobs, never inline in the request path; failures retried in job queue

**Key patterns the whole system depends on:**
- GiST exclusion constraint + partial WHERE (status IN (pending, confirmed)) -- cancelled/expired rows do not block re-booking
- Two-phase booking: insert pending (constraint is the hold) -> Stripe call outside any DB lock -> confirm via webhook -> background expiry for abandoned holds
- Webhooks as source of truth; idempotent, Stripe-signature-verified handlers
- timestamptz (UTC) in DB + IANA timezone stored on listing -- display converts UTC to venue-local time always

See `.planning/research/ARCHITECTURE.md` for full system diagram, data model, request flows, and scaling considerations.

---
### Critical Pitfalls

1. **Double-booking via check-then-act race** -- Enforce non-overlap at the database level only. Use EXCLUDE USING gist (listing_id WITH =, slot WITH &&) WHERE (status IN (pending, confirmed)). Never SELECT to check then INSERT. Catch error code 23P01 and return a clean slot-just-taken 409. Add idempotency keys on booking creation and payment endpoints. Prove this works under concurrent inserts before wiring in money.

2. **Stripe liability traps (refunds, chargebacks, payout timing)** -- Use separate charges and transfers so the platform holds funds until after service delivery. On any refund, pass reverse_transfer=true; decide refund_application_fee per named cancellation policy. Handle charge.dispute.created webhook immediately with transfer reversal. Never let a booking confirm against a host whose payouts_enabled is false. Delay host payouts.

3. **Timezone and DST bugs** -- Store all booking ranges as timestamptz (UTC). Store the listing IANA timezone (e.g. America/New_York, never a fixed offset) from day one. Always display venue-local time as primary, booker-local as secondary. A single-launch-region does not remove this risk.

4. **Stripe Connect onboarding friction killing supply** -- Decouple list a space from complete payout setup. Let hosts create and edit listings immediately. Gate bookability (not listing creation) on payouts_enabled via the account.updated webhook.

5. **Cold-start liquidity trap** -- Seed supply manually in one tight geography before opening demand. Track the zero-result-search rate as the primary liquidity health metric. Measure completed end-to-end bookings, not signups.

See `.planning/research/PITFALLS.md` for full pitfall descriptions, warning signs, the Looks Done But Isn't checklist, and recovery strategies.

---
## Implications for Roadmap

The hard dependency chain all four researchers independently identified: identity -> supply (listings) -> availability model + exclusion constraint -> booking core (no payment) + search -> payments -> booking/payment integration (instant + request-to-book) -> bookings management + cancellation + notifications -> group bookings layer.

The ordering is non-negotiable for correctness: you cannot wire payments into a booking system that has not proven double-booking is impossible. You cannot build group bookings on a cancellation/refund model that is not solid.

---

### Phase 1: Auth and Accounts
**Rationale:** Every entity (listing, booking, payment) is owned by a user. No other phase can begin without identity. Lowest risk, no external integrations.
**Delivers:** Email/password signup + login, single account with booker + host capability flags, session persistence, password reset, basic profile.
**Features addressed:** Auth and Accounts (all LOW complexity, P1 priority).
**Avoids:** Separate host/booker account tables -- one users table with capability flags from the start.
**Research flag:** Standard pattern. Skip phase-level research.

---

### Phase 2: Listings and Host Supply
**Rationale:** Supply must exist before availability can be modeled or search can return results.
**Delivers:** Host creates/edits listings (title, description, space type taxonomy, address, capacity, amenities, photos); listing status (draft/published/unlisted); listing detail page (read-only); Stripe Connect Express account creation and hosted onboarding flow; instant-book vs request-to-book toggle; payouts_enabled bookability gate wired to account.updated webhook.
**Features addressed:** Listings host supply; photo upload; Stripe Connect payout onboarding (KYC); instant/request toggle.
**Avoids:** Pitfall 4 (onboarding friction) -- listing creation does NOT require completed KYC; bookability gated on payouts_enabled. This gate is built here so it can never be bypassed in later phases.
**Research flag:** Stripe Connect Express onboarding flow warrants phase-level research -- the Account Link redirect handling, account.updated state machine, and listing-draft-vs-bookable gate have important nuances.

---

### Phase 3: Availability Model and the Double-Booking Guarantee
**Rationale:** The architectural keystone and highest-risk correctness surface. Build it in its own phase so concurrent-insert tests can be run and passed before money is added to the failure modes. Availability also drives search-by-date, so it must precede rich search.
**Delivers:** Availability rules model (recurring weekly windows + per-date overrides + blackouts); real-time availability calendar on listing detail page; bookings table with GiST exclusion constraint and tstzrange slot column; slot generation for display; listing-level IANA timezone storage; host calendar management UI (block/unblock dates/times).
**Features addressed:** Host availability/operating-hours management; real up-to-date availability calendar; hourly + full-day slot selection; visual slot-taken feedback.
**Avoids:** Pitfall 1 (double-booking race) -- exclusion constraint in place before any booking inserts. Pitfall 2 (timezone bugs) -- timestamptz + IANA timezone at the data-model decision point, not retrofitted. Anti-pattern (materialized slots) -- store rules + actual bookings only; generate display slots on the fly.
**Testing requirement:** Concurrent overlapping-booking inserts must fail the second insert and surface error 23P01 cleanly before this phase is done.
**Research flag:** Standard pattern. GiST exclusion constraint + tstzrange is documented in PostgreSQL official docs. No additional research needed.

---

### Phase 4: Booking Core and Search (no payment)
**Rationale:** Prove the slot-hold mechanism and state machine work correctly before adding money. Search needs the availability model from Phase 3.
**Delivers:** Slot hold during checkout (pending booking row = the hold, protected by exclusion constraint); booking state machine (pending -> confirmed/expired/cancelled/declined); background expiry worker for abandoned holds; search by location (PostGIS radius), activity type, date/time availability filter, and price; results list with listing cards; idempotency keys on booking creation.
**Features addressed:** Search and Discovery (location, activity, date/time, price); results list; slot hold/lock; booking lifecycle core; expiry/cleanup.
**Avoids:** Pitfall 1 (hold mechanism proves constraint works under concurrency). Pitfall 9 (stale availability display -- holds reflect immediately in calendar and search). Anti-pattern (no DB lock held across future Stripe call -- two-phase pattern proven here).
**Testing requirement:** Concurrent overlapping bookings where one is pending must be rejected. Abandoned checkout must release the slot after TTL.
**Research flag:** Standard pattern for booking state machines and background expiry workers.

---
### Phase 5: Payments and Payouts
**Rationale:** Payments wired into the working booking core from Phase 4. The second-deepest complexity area after availability.
**Delivers:** Online card payment (charge booker, deduct commission, funds land on platform); host payout via Stripe Transfer post-session (delayed, not at booking time); webhook handler as source of truth (payment_intent.succeeded, charge.refunded, charge.dispute.created, account.updated); idempotent, signature-verified webhook processing; refund handling with reverse_transfer + configurable refund_application_fee; platform commission via application_fee_amount.
**Features addressed:** Online card payment; platform commission; host payout; refund handling; authorize-vs-capture for instant-book.
**Avoids:** Pitfall 3 (marketplace refund/chargeback liability) -- delayed payout, reverse_transfer on refunds, dispute webhook with immediate transfer reversal. Paying out at booking time is explicitly disallowed.
**Research flag:** Stripe Connect separate charges and transfers + delayed payout + dispute webhook warrants phase-level research. The interaction between application_fee_amount, reverse_transfer, and refund_application_fee under different cancellation scenarios has non-obvious edge cases.

---

### Phase 6: Full Booking + Payment Integration (Instant-Book and Request-to-Book Forks)
**Rationale:** Phases 4 and 5 establish the building blocks separately. This phase wires them into the complete lifecycle, including the request-to-book approval path which requires authorize-then-capture timing.
**Delivers:** Instant-book path: payment captured at booking, confirmed on webhook; request-to-book path: payment authorized (not captured) at request, host approve/decline, auto-expire after SLA, capture on approval or release on decline/expiry; host approve/decline UI; booking confirmation screen + email (both sides); full payment state reconciled against booking status.
**Features addressed:** Instant-book confirmation; request-to-book flow; host approve/decline; authorize-vs-capture handling; booking confirmation.
**Avoids:** Pitfall 3 + Pitfall 4 combined (confirmed booking against unpayable host; auth-expiry if request-to-book sits pending too long).
**Open product decision -- must resolve before building:** What is the request-to-book expiry SLA? (Airbnb ~24h; Peerspace allows withdraw-while-pending.) Must be shorter than Stripe authorization hold limit (~7 days).
**Research flag:** Authorize-then-capture + auth-expiry timing with request-to-book approval is nuanced. Phase-level research recommended.

---

### Phase 7: Bookings Management, Cancellation, and Notifications
**Rationale:** Cancellation depends on the full payment topology being correct (Phases 5 + 6). Notifications are hardened into a reliable async layer here.
**Delivers:** My Bookings for bookers and hosts (upcoming/past, status lifecycle); cancellation by booker (refund per named policy tier); cancellation by host (full refund + defined consequences); no-show handling (host keeps payout -- default); named cancellation policy tiers per listing; refund amount displayed before confirming cancellation; transactional email layer (confirmation, request pending, approved/declined, cancelled, reminder); booking status visibility for both sides.
**Features addressed:** My Bookings (both sides); booking status lifecycle; transactional emails; cancellation + refund.
**Avoids:** Pitfall 7 (under-specified cancellation policy) -- define the who x when x refund-percent matrix before building the cancel button; tie each matrix cell to exact Stripe calls.
**Open product decision -- must resolve before building:** The cancellation policy matrix: who cancels x time-to-start bucket x percent refunded to booker x commission kept/refunded x host payout adjustment. This must be decided before the phase begins.
**Research flag:** Named policy tier design is standard (Airbnb/Peerspace patterns well-documented). Blocker is the product decision above, not a research gap.

---

### Phase 8: Group Bookings
**Rationale:** The differentiator is built last because it sits entirely on top of a working single-booker paid transaction + cancellation model. Building it earlier is the defining over-building pitfall.
**Delivers:** Organizer creates a group booking (wraps a confirmed booking); invite via shareable link and email (unguessable scoped invite tokens); attendee RSVP (yes/no/maybe); headcount tracking against listing capacity (atomic increment, no race on remaining seats); who is in view for organizer; organizer cancellation cancels underlying booking -> triggers cancellation policy -> notifies all invitees.
**Features addressed:** Group booking (organizer books + invites); invite via link/email; RSVP/attendance confirmation; headcount vs capacity; the group booking differentiator.
**Avoids:** Pitfall 8 (group edge cases) -- RSVP count hard-capped at listing capacity (atomic seat decrement); partial RSVP leaves booking valid (RSVP is informational, not a payment gate); organizer cancellation has full defined consequence chain. Cost-splitting must not drift in.
**Open product decisions -- must resolve before building:**
- Do invited attendees need a FitOut account to RSVP, or can they respond via link without an account? (Frictionless link-based RSVP maximizes group adoption but requires guest-token handling.)
- What is the group capacity source -- listing maximum capacity (host-defined) or a per-booking organizer-specified headcount limit?
- What is the RSVP deadline / how long does an invite remain open?
**Research flag:** If invite-without-account RSVP is chosen, the guest RSVP token flow warrants phase-level research.

---
### Phase Ordering Rationale

- Phases 1-3 are non-negotiable prerequisites. Nothing can be booked without identity, supply, or a correct availability model. The exclusion constraint must exist before any booking insert ever occurs.
- Phase 4 proves correctness before money is involved. Testing the hold + expiry cycle against the constraint in isolation removes the highest-risk surface from the payments phase.
- Phases 5-6 are split to allow focused Stripe infrastructure work (Phase 5) before wiring it into the full instant/request-to-book lifecycle fork (Phase 6), which has its own complexity around authorize-then-capture timing.
- Phase 7 before Phase 8. Cancellation and refund policy must be solid before group bookings, because organizer cancellation needs the full cancellation infrastructure.
- Phase 8 is last by design. The group booking differentiator is a coordination layer on top of a working paid transaction. Building it earlier violates the discipline of proving the single-booker transaction first.

---

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (Stripe Connect Onboarding):** Account Link flow, account.updated state machine, listing-draft-vs-bookable gate
- **Phase 5 (Payments + Payouts):** Separate charges and transfers + delayed payout + reverse_transfer + refund_application_fee interaction under cancellation and dispute scenarios
- **Phase 6 (Request-to-Book + Payment Integration):** Authorize-then-capture timing, Stripe auth expiry window constraints, host decision flow
- **Phase 8 (Group Bookings, if invite-without-account):** Guest RSVP token flow

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Auth):** Better Auth 1.x + Drizzle adapter well-documented
- **Phase 3 (Availability + Exclusion Constraint):** PostgreSQL official docs + wiki; Drizzle migration hand-editing path clear
- **Phase 4 (Booking Core + Search):** Two-phase booking hold and PostGIS radius search are well-established patterns
- **Phase 7 (Bookings Management + Cancellation):** Airbnb/Peerspace policy tier model well-understood; blocker is a product decision, not a research gap

---
## Open Product Decisions

Unresolved product questions that must be answered before the relevant phase begins. These are product choices, not technical unknowns.

| Decision | Relevant Phase | Options | Notes |
|----------|---------------|---------|-------|
| Cancellation/refund policy matrix | Phase 7 | Flexible/Moderate/Strict tiers; define who x when x percent cells | Must be decided before building the cancel flow; every cell maps to specific Stripe calls |
| Slot granularity (minimum booking unit) | Phase 3 | 30-min vs 60-min minimum | Affects exclusion constraint range math, pricing calculation, and calendar UI density |
| Request-to-book expiry SLA | Phase 6 | ~24h (Airbnb) vs longer; auto-expire vs host-dismissed | Must be shorter than Stripe authorization hold limit (~7 days); sets booker expectations |
| Do invited group attendees need an account to RSVP? | Phase 8 | Frictionless link-based RSVP (no account, PlayMore model) vs lightweight account required | Frictionless maximizes group adoption; adds guest-token handling complexity |
| Group capacity source | Phase 8 | Listing maximum capacity (host-defined) vs organizer-specified headcount limit per booking | Listing capacity is simpler; per-booking limit is more flexible |

---
## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack (Next.js 16, PG 18, Drizzle, Stripe Connect) verified against official docs and current release notes. Auth library choice (Better Auth over NextAuth) is MEDIUM -- based on community consensus and maintainer statements. Hosting (Railway/Render) MEDIUM. |
| Features | HIGH | Table stakes and payments features verified against Peerspace, Airbnb, and Stripe official docs. Group-booking mechanics MEDIUM -- synthesized from pickleball-org apps and RSVP tools; no single canonical marketplace source. |
| Architecture | HIGH | GiST exclusion constraint, two-phase booking, and Stripe webhook patterns verified against PostgreSQL official docs and Stripe Connect official docs. Group booking data model MEDIUM -- synthesized from RSVP + reservation patterns. |
| Pitfalls | HIGH (critical), MEDIUM (liquidity/MVP) | Stripe Connect liability rules, Postgres concurrency, and timezone handling verified against official docs. Marketplace cold-start and over-building findings MEDIUM, drawn from multiple credible secondary sources. |

**Overall confidence: HIGH**

The core correctness surfaces (double-booking prevention, Stripe payment topology, timezone storage) are verified against authoritative sources. Group booking mechanics and marketplace liquidity strategy are MEDIUM -- synthesized from analogous products. This is sufficient for planning; validate group-booking assumptions during Phase 8 planning.

### Gaps to Address

- **Cancellation policy specifics:** The exact policy tier definitions are a product decision. Research found Airbnb/Peerspace examples but no universal standard for hourly fitness slots. Must be decided before Phase 7.
- **Request-to-book expiry SLA:** The exact window is a product decision constrained by Stripe auth hold limits. Must be decided before Phase 6.
- **Guest RSVP (no account):** If invite-without-account RSVP is wanted, the guest token flow is not fully modeled. Warrants a Phase 8 research pass.
- **Slot granularity:** Whether the minimum booking unit is 30 min or 60 min must be decided before Phase 3.
- **Admin seeding tooling:** Manual host seeding before launch requires admin tools to create listings + availability on a host behalf. Not in the current feature set; should be explicitly scoped in the roadmap (likely as a lightweight internal tool within Phase 7 or as a launch prerequisite).

---
## Sources

### Primary (HIGH confidence)
- PostgreSQL docs -- range types, EXCLUDE USING gist, WITHOUT OVERLAPS (PG18), btree_gist: postgresql.org/docs/current/rangetypes.html
- PostgreSQL wiki -- how to avoid overlapping intervals: wiki.postgresql.org/wiki/How_to_avoid_overlapping_intervals_with_PostgreSQL
- Stripe Connect docs -- charges, destination charges, separate charges and transfers, application fees, hosted onboarding, account.updated, refunds/disputes, risk management best practices: docs.stripe.com/connect
- Next.js 16.2 release notes: nextjs.org/blog/next-16-2
- Drizzle ORM docs (Context7): current drizzle-kit 0.31.x; exclusion constraint limitations (issues #2813/#3388)
- Prisma exclusion constraint limitations: prisma.io/docs unsupported-database-features, prisma/prisma issue #17514
- Peerspace: pricing model, cancellation tiers, operating hours, instant vs request, attendee handling
- Airbnb Help Center: instant book vs request-to-book, ~24h request expiry, cancellation policies

### Secondary (MEDIUM confidence)
- Better Auth vs NextAuth vs Clerk comparison: supastarter.dev, blog.logrocket.com, makerkit.dev -- Auth.js security-patch-only since Sept 2025
- PostGIS vs earthdistance tradeoffs: elephanttamer.net, hashrocket.com
- PlayMore, Picklebeast, Pickleheads -- invite link/RSVP/waitlist mechanics for group sessions
- Booking.com RtB API -- request-to-book 24h decision window
- Wix Bookings -- DST handling (skip/ambiguous local times)
- Marketplace chicken-and-egg / liquidity: journeyh.io, applicoinc.com, cobbleweb.co.uk
- Two-phase hold / reservation race condition patterns: Medium/@inexpressible2510, OneUptime/booking-reservation-systems
- Hotel booking schema design (rules vs materialized slots): dev.to/sumedhbala
- Railway/Render/Fly vs Vercel hosting comparison: birjob.com, designrevision.com
- Splacer, GymSpots, SOLO60, HopperFit, Facilitron -- fitness/court hourly booking + host approval patterns

---
*Research completed: 2026-06-03*
*Ready for roadmap: yes*
