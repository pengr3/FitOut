# Roadmap: FitOut

## Overview

FitOut delivers a two-sided fitness-space marketplace where the core transaction — search for a space, see real availability, reserve a slot, pay, and have the host paid out minus commission — is both the value proposition and the hardest engineering problem. The roadmap follows a strict dependency-driven order that all research independently converged on: identity must exist before supply, supply before availability, and the database-enforced double-booking guarantee must be proven correct **before** any money touches the system. The single-booker paid transaction is built end-to-end and made solid first; the group-booking differentiator is layered on last because it reuses the entire booking, payment, and cancellation infrastructure underneath. Payments are split into two phases — focused Stripe Connect infrastructure first, then wiring it into the full instant-book / request-to-book lifecycle fork — to keep the deepest complexity areas isolated and verifiable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Auth & Accounts** - Single account with booker + host capabilities, sessions, password reset, basic profile
- [ ] **Phase 2: Listings & Host Onboarding** - Hosts create/edit listings with photos, pricing, booking mode; Stripe Connect onboarding gates bookability
- [ ] **Phase 3: Availability & the Double-Booking Guarantee** - Availability rules, real-time calendar, and the DB exclusion constraint that makes overlaps structurally impossible
- [ ] **Phase 4: Booking Core & Search (no payment)** - Two-phase slot hold + state machine + expiry worker, plus geo/activity/date/price search
- [ ] **Phase 5: Payments & Payouts** - Stripe Connect charge, commission, delayed host payout, webhook-as-source-of-truth, refunds
- [ ] **Phase 6: Full Booking + Payment Integration** - Instant-book capture vs request-to-book authorize→capture-on-approve, host approve/decline, confirmation
- [ ] **Phase 7: Bookings Management, Cancellation & Notifications** - My Bookings both sides, cancellation/refund policy tiers, transactional email layer
- [ ] **Phase 8: Group Bookings** - Organizer wraps a paid booking, invites via link/email, attendees RSVP, headcount validated against capacity

## Phase Details

### Phase 1: Auth & Accounts
**Goal**: A person can create one FitOut identity that carries both booker and host capabilities, sign in reliably, and recover access — the foundation every other entity is owned by.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. A user can sign up with email and password, then log in and remain logged in across browser sessions
  2. A user who forgets their password can reset it via an emailed link and log in with the new password
  3. A single signed-in account can act as both a booker and a host without creating a separate identity
  4. A user can create and edit a basic profile (name, contact, optional photo)
**Plans**: 4 plans in 3 waves
  - [x] 01-01-PLAN.md — Wave 0: project scaffold (Next 16 + Docker Postgres 18 + Drizzle + shadcn/ui + Vitest/Playwright test infra)
  - [x] 01-02-PLAN.md — Wave 1: Better Auth config (email/pw + Google, soft gate, 30d sliding sessions, reset-revokes-others, capability+profile additionalFields) + [BLOCKING] schema migrate
  - [x] 01-03-PLAN.md — Wave 2: auth UI flows (signup w/ book-vs-host intent, login + Google, forgot/reset password)
  - [x] 01-04-PLAN.md — Wave 2: profile (public/private split + Cloudinary avatar) + capability activation + Airbnb-style mode switch + gated host dashboard

### Phase 2: Listings & Host Onboarding
**Goal**: A host can publish a real, sellable listing — details, photos, pricing, and booking mode — and complete Stripe Connect payout onboarding, with bookability (not listing creation) gated on payout readiness so a slot can never be sold to an unpayable host.
**Depends on**: Phase 1
**Requirements**: LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, LIST-06, PAY-04
**Success Criteria** (what must be TRUE):
  1. A host can create and edit a listing with title, description, space type, address, capacity, and amenities, and upload multiple ordered photos — without first completing payout onboarding
  2. A host can set an hourly rate and a day rate, choose instant-book or request-to-book, and set listing status (draft / published / unlisted)
  3. Anyone can view a published listing's detail page with photos, description, amenities, location, price, and a book CTA
  4. A host completes Stripe Connect (KYC) onboarding, and a listing only becomes bookable once the host's payouts are enabled (tracked via the account.updated webhook)
**Plans**: TBD
**UI hint**: yes

### Phase 3: Availability & the Double-Booking Guarantee
**Goal**: A listing exposes a real, up-to-date availability calendar driven by host operating hours and blocks, and the database itself makes two overlapping bookings for the same listing structurally impossible — the architectural keystone, proven before any money is involved.
**Depends on**: Phase 2
**Requirements**: AVAIL-01, AVAIL-02, AVAIL-03, AVAIL-04, AVAIL-05
**Success Criteria** (what must be TRUE):
  1. A host can define recurring weekly operating hours and block/unblock specific dates and times as overrides
  2. A listing detail page shows a real, up-to-date availability calendar reflecting operating hours, blocks, and existing bookings, with times displayed in the venue's local timezone
  3. A booker can select an hourly window or a full day from availability, and occupied or unavailable times are visibly blocked and cannot be selected
  4. Two concurrent overlapping booking inserts for the same listing cannot both succeed — the second is rejected at the database level (exclusion constraint, error 23P01 surfaced cleanly)
**Plans**: TBD
**UI hint**: yes

### Phase 4: Booking Core & Search (no payment)
**Goal**: A booker can find a space by location, activity, date/time, and price, then claim a slot via a short pending hold protected by the exclusion constraint — proving the two-phase booking mechanism, state machine, and abandoned-hold expiry work correctly before payment is added to the failure modes.
**Depends on**: Phase 3
**Requirements**: SEARCH-01, SEARCH-02, SEARCH-03, SEARCH-04, SEARCH-05, BOOK-01, BOOK-02, BOOK-03
**Success Criteria** (what must be TRUE):
  1. A user can search listings by location/radius and filter results by activity type, date/time availability, and price, viewing results as a list of cards (photo, name, price, location/distance)
  2. A booker can select a time window and see a price breakdown before committing
  3. Entering checkout places a short-lived hold on the slot (a pending booking row) that immediately reflects in the calendar and search, and expires automatically if checkout is abandoned, releasing the slot
  4. A booking that overlaps an existing pending or confirmed booking is rejected with a graceful "just got taken" response; a double-clicked booking creates exactly one booking (idempotency)
**Plans**: TBD
**UI hint**: yes

### Phase 5: Payments & Payouts
**Goal**: Money flows correctly through the proven booking core — the booker is charged, the platform keeps its commission, the host is paid out only after the session via a delayed transfer, and webhooks are the source of truth — with refund and dispute paths that protect the platform from liability.
**Depends on**: Phase 4
**Requirements**: PAY-01, PAY-02, PAY-03, HOST-03
**Success Criteria** (what must be TRUE):
  1. A booker can pay for a booking by card online, with the platform commission deducted and funds landing on the platform account
  2. A host receives a payout for a completed booking, with funds held until after the session (never paid out at booking time)
  3. Payment state is driven by signature-verified, idempotent Stripe webhooks (succeeded / refunded / dispute / account.updated), not the synchronous API response
  4. A refund claws funds back from the host (reverse_transfer) and handles commission per policy; a dispute reverses the transfer; a host can see payout status (owed / paid)
**Plans**: TBD
**UI hint**: yes

### Phase 6: Full Booking + Payment Integration
**Goal**: The booking and payment building blocks are wired into one complete lifecycle that forks on the host's booking mode — instant-book captures payment immediately and confirms, while request-to-book authorizes payment, lets the host approve or decline within an SLA, and captures on approval or releases on decline/expiry.
**Depends on**: Phase 5
**Requirements**: BOOK-04, BOOK-05, BOOK-06, PAY-05, HOST-01
**Success Criteria** (what must be TRUE):
  1. An instant-book listing confirms immediately on successful payment and the slot is locked
  2. A request-to-book listing creates a pending request (payment authorized, not captured) that a host can approve or decline, auto-expiring if no response within the SLA
  3. On approval the authorized payment is captured and the booking confirms; on decline or expiry the authorization is released and the slot frees
  4. A booker receives on-screen and email confirmation of a confirmed booking
**Plans**: TBD
**UI hint**: yes

### Phase 7: Bookings Management, Cancellation & Notifications
**Goal**: Both sides can see and manage their bookings through their full lifecycle, cancellations resolve to correct, policy-driven refunds with the refund amount shown before confirming, and a reliable async transactional-email layer keeps everyone informed.
**Depends on**: Phase 6
**Requirements**: BOOK-07, PAY-06, HOST-02, MANAGE-01, MANAGE-02, MANAGE-03
**Success Criteria** (what must be TRUE):
  1. A booker and a host can each view upcoming and past bookings with a status lifecycle (pending / confirmed / declined / cancelled / completed) visible to both sides
  2. A booker can cancel a booking and see the exact refund amount before confirming, with the refund issued per the listing's named cancellation policy tier (correct money movement for who-cancels × time-to-start)
  3. A host-initiated cancellation produces a full refund to the booker with defined consequences
  4. Users receive transactional emails for key booking events (confirmation, request received, approved/declined, cancelled, reminder) via a reliable async layer that never blocks the booking transaction
**Plans**: TBD
**UI hint**: yes

### Phase 8: Group Bookings
**Goal**: The differentiator — an organizer who has paid for a booking can invite people via a shareable link or email, attendees confirm attendance without needing a full account, and the organizer sees a live headcount validated against the listing's capacity. RSVP is informational coordination layered on a normal paid booking; it never touches the occupancy constraint and never becomes per-attendee payment.
**Depends on**: Phase 7
**Requirements**: GROUP-01, GROUP-02, GROUP-03, GROUP-04, GROUP-05
**Success Criteria** (what must be TRUE):
  1. An organizer can create a group booking on top of a paid booking (organizer pays the full booking) and invite attendees via a shareable link and/or email
  2. Invited attendees can RSVP yes/no via a scoped invite token without needing a full account
  3. The organizer can see the confirmed headcount and who is coming
  4. Confirmed RSVPs are hard-capped at the listing's capacity (atomic, no overflow), and a partial RSVP leaves the booking valid
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth & Accounts | 3/4 | In Progress | - |
| 2. Listings & Host Onboarding | 0/TBD | Not started | - |
| 3. Availability & Double-Booking Guarantee | 0/TBD | Not started | - |
| 4. Booking Core & Search | 0/TBD | Not started | - |
| 5. Payments & Payouts | 0/TBD | Not started | - |
| 6. Full Booking + Payment Integration | 0/TBD | Not started | - |
| 7. Bookings Management, Cancellation & Notifications | 0/TBD | Not started | - |
| 8. Group Bookings | 0/TBD | Not started | - |
