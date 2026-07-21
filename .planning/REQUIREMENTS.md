# Requirements: FitOut

**Defined:** 2026-06-03
**Core Value:** Find & book a space — search → real availability → reserve a time slot → pay, with confidence the booking is real.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication & Accounts

- [x] **AUTH-01**: User can sign up with email and password
- [x] **AUTH-02**: User can log in and stay logged in across sessions
- [x] **AUTH-03**: User can reset password via email link
- [x] **AUTH-04**: User can both book spaces and host spaces from a single account
- [x] **AUTH-05**: User can create and edit a basic profile (name, contact, optional photo)

### Listings (Host Supply)

- [ ] **LIST-01**: Host can create and edit a listing with title, description, space type, address, capacity, and amenities
- [ ] **LIST-02**: Host can upload and order multiple photos on a listing
- [ ] **LIST-03**: Host can set an hourly rate and a day rate for a listing
- [ ] **LIST-04**: Host can choose instant-book or request-to-book per listing
- [ ] **LIST-05**: Host can set listing status (draft / published / unlisted)
- [ ] **LIST-06**: Anyone can view a listing detail page (photos, description, amenities, location, price, availability, book CTA)

### Availability

- [ ] **AVAIL-01**: Host can define recurring weekly operating hours for a listing
- [ ] **AVAIL-02**: Host can block and unblock specific dates/times as overrides
- [ ] **AVAIL-03**: Listing shows a real, up-to-date availability calendar reflecting existing bookings, operating hours, and blocks
- [ ] **AVAIL-04**: Booker can select an hourly time window or a full day from availability
- [ ] **AVAIL-05**: Occupied or unavailable times are visibly blocked and cannot be selected

### Search & Discovery

- [x] **SEARCH-01**: User can search listings by location (area/radius within the launch region)
- [x] **SEARCH-02**: User can filter results by activity / space type (e.g. pickleball, yoga, gym)
- [x] **SEARCH-03**: User can filter results by date and time availability
- [x] **SEARCH-04**: User can filter results by price
- [x] **SEARCH-05**: User can view results as a list of cards (photo, name, price, location/distance)

### Booking

- [x] **BOOK-01**: Booker can select a time window and see the price breakdown before committing
- [x] **BOOK-02**: Slot is held/locked during checkout with an expiry so two bookers cannot race for the same slot
- [x] **BOOK-03**: A booking that overlaps an existing booking is rejected (no double-booking)
- [x] **BOOK-04**: Instant-book listings confirm immediately on successful payment
- [x] **BOOK-05**: Request-to-book listings create a pending request the host approves/declines, auto-expiring if no response
- [x] **BOOK-06**: Booker receives on-screen and email confirmation of a booking
- [ ] **BOOK-07**: Booker can cancel a booking subject to the cancellation/refund policy

### Payments

- [x] **PAY-01**: Booker can pay for a booking by card online
- [x] **PAY-02**: Platform deducts a commission from each booking
- [x] **PAY-03**: Host receives a payout for completed bookings, with funds held until after the session
- [ ] **PAY-04**: Host completes payout onboarding (Stripe Connect KYC) before their listing becomes bookable
- [x] **PAY-05**: For request-to-book, the slot is held with no charge at request; the booker pays on host approval (pay-on-approval) and the slot frees on decline/expiry/non-payment — *mechanism revised from authorize→capture per D-63 (Phase 6): PayMongo cannot hold funds on QRPh/e-wallets and card manual-capture is sales-gated; pay-on-approval works on all rails with no fee bleed*
- [ ] **PAY-06**: Cancellations issue refunds according to the cancellation policy

### Host Tools

- [x] **HOST-01**: Host can approve or decline pending booking requests within a deadline
- [x] **HOST-02**: Host can view upcoming and past bookings with status
- [x] **HOST-03**: Host can see payout status (what is owed / paid)

### Bookings Management (Both Sides)

- [x] **MANAGE-01**: Booker can view upcoming and past bookings with status
- [x] **MANAGE-02**: Booking status lifecycle (pending / confirmed / declined / cancelled / completed) is visible to both sides
- [ ] **MANAGE-03**: Users receive transactional emails for key booking events (confirmation, request received, approved/declined, cancelled, reminder)

### Group Bookings (Differentiator)

- [ ] **GROUP-01**: Organizer can create a group booking on top of a paid booking (organizer pays the full booking)
- [ ] **GROUP-02**: Organizer can invite attendees via a shareable link and/or email
- [ ] **GROUP-03**: Invited attendees can RSVP (yes/no) without needing a full account
- [ ] **GROUP-04**: Organizer can see the confirmed headcount and who is coming
- [ ] **GROUP-05**: Confirmed headcount is validated against the listing's capacity

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Group Payments

- **GPAY-01**: Automated cost-splitting among group attendees
- **GPAY-02**: Per-attendee paid spots / ticketing

### Discovery & Trust

- **DISC-01**: Map view of search results
- **DISC-02**: Group waitlist with drop-out handling
- **DISC-03**: Reviews & ratings of spaces/hosts

### Communication

- **COMM-01**: In-app messaging between host and booker

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Native iOS/Android apps | Responsive web in v1; native doubles surface area before demand is validated |
| Multi-city / region expansion | Single-region launch to build marketplace liquidity first; data model stays region-capable |
| Dynamic / surge / tiered / attendee-tier pricing | Flat hourly + day rate is enough to validate; pricing engine is heavy |
| Add-ons / extras at checkout (catering, equipment, staff) | Not core to fitness-slot booking; inventory + tax complexity |
| Subscriptions / memberships / class packs | Different (recurring) business model than per-booking commission |
| Identity verification / background checks | Vendor + compliance + UX friction; premature at launch scale |
| Smart-lock / access-code integration | Per-host hardware dependency; host provides access instructions instead |

## Open Product Decisions

Resolve during phase discussion/planning (flagged by research):

- **Cancellation/refund policy specifics** — refund windows, who absorbs Stripe fees, whether platform commission is refunded (needed before the Payments/Cancellation phase)
- **Slot granularity** — 30- vs 60-minute slots, and how day-rate and hourly bookings coexist on one listing/day (needed in the Availability phase)
- **Request-to-book expiry SLA** — how long a pending request holds a slot before auto-expiry (needed in the Booking phase)
- **Group capacity source** — confirm capacity is a host-set per-listing field driving RSVP-overflow logic
- **Attendee RSVP identity** — v1 default is tokenized link / no account required; confirm at the Group Bookings phase

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| LIST-01 | Phase 2 | Complete |
| LIST-02 | Phase 2 | Complete |
| LIST-03 | Phase 2 | Complete |
| LIST-04 | Phase 2 | Complete |
| LIST-05 | Phase 2 | Complete |
| LIST-06 | Phase 2 | Complete |
| PAY-04 | Phase 2 | Complete |
| AVAIL-01 | Phase 3 | Complete |
| AVAIL-02 | Phase 3 | Complete |
| AVAIL-03 | Phase 3 | Complete |
| AVAIL-04 | Phase 3 | Complete |
| AVAIL-05 | Phase 3 | Complete |
| SEARCH-01 | Phase 4 | Complete |
| SEARCH-02 | Phase 4 | Complete |
| SEARCH-03 | Phase 4 | Complete |
| SEARCH-04 | Phase 4 | Complete |
| SEARCH-05 | Phase 4 | Complete |
| BOOK-01 | Phase 4 | Complete |
| BOOK-02 | Phase 4 | Complete |
| BOOK-03 | Phase 4 | Complete |
| PAY-01 | Phase 5 | Complete (05-01 payment config + 05-02 createCheckoutSession /v1 full PH rail charge primitive; 05-03 "Confirm & pay" checkout action + reserve UI + pending-payment/reversed states; 05-04 checkout_session.payment.paid webhook = the confirm authority — flips pending→confirmed on reference_number alone, captures pay_..., D-58 gone-slot auto-refund/QRPh-alert, D-60 refund events) |
| PAY-02 | Phase 5 | Complete (05-01 commission calculator + payout ledger; 05-05a commission FROZEN + deducted at payout — the sweep writes commission_rate_bps/commission_cents/net_cents per D-51; 05-06 the host-visible commission line is LIVE on /host/earnings — gross→−10%→net, D-59; the payout mechanism that applies the deduction is now fully closed by the 05-05b reconcile. Real payout transfer UAT-gated on the PayMongo /v2 beta — same external gate as PAY-01's real charge) |
| PAY-03 | Phase 5 | Complete (05-02 createBatchTransfer/listWalletAccounts primitives; 05-05a payout SWEEP — hourly singleton cron, at-most-once ON CONFLICT claim, wallet.id===paymongo_account_id correlation, inhouse net transfer, Held→Processing; 05-05b payout RECONCILE closes the lifecycle — getTransfer polls GET /v2/transfers/{id} (no transfer webhook, Pitfall 2), reconcileOne moves every Processing row Processing→Paid (paid_at) / Processing→Failed idempotently (AND state='processing'), Failed/stuck → [payout-alert], + /api/inngest serve() mounting both crons fail-closed in prod. Real transfer + polling UAT-gated on PayMongo /v2 beta) |
| HOST-03 | Phase 5 | Complete (05-06 owner-gated /host/earnings — per-booking payout rows with Held/Processing/Paid/Refunded state badges, the host-visible gross→−10%→net breakdown, venue-tz-safe expected/paid dates, and Upcoming-vs-Paid summary totals; owner-scoped WHERE host_id=session.user.id so a host only ever sees their own rows; neutral Earnings nav in the dashboard + (host) header) |
| BOOK-04 | Phase 6 | Complete |
| BOOK-05 | Phase 6 | Complete |
| BOOK-06 | Phase 6 | Complete |
| PAY-05 | Phase 6 | Complete |
| HOST-01 | Phase 6 | Complete |
| BOOK-07 | Phase 7 | In progress |
| PAY-06 | Phase 7 | In progress |
| HOST-02 | Phase 7 | Complete (07-06 shipped `/host/bookings` — Upcoming/Past tabs, desktop table + mobile cards, per-booking payout state via `PayoutStateBadge` reused verbatim, keyset paging. Ownership is `listing.host_id` inside the query WHERE, mutation-verified in `tests/security/bookings-owner-scope.test.ts`) |
| MANAGE-01 | Phase 7 | Complete (07-06 shipped `/bookings` — Upcoming/Past tabs partitioned on the DB clock, venue-local labels, keyset `Load more`, and the single D-104 inline `Pay now`. Rows are scoped by `booking.booker_id` in the query WHERE, mutation-verified) |
| MANAGE-02 | Phase 7 | Complete (07-06 made the lifecycle visible on BOTH surfaces from 07-02's single derivation. D-102 `completed` is derived in SQL and proven to write nothing — `tests/booking/views.test.ts` reads the stored row back and asserts it still says `confirmed`. Booking-detail states are extended further in 07-12) |
| MANAGE-03 | Phase 7 | Pending |
| GROUP-01 | Phase 8 | Pending |
| GROUP-02 | Phase 8 | Pending |
| GROUP-03 | Phase 8 | Pending |
| GROUP-04 | Phase 8 | Pending |
| GROUP-05 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 45 total
- Mapped to phases: 45 (100%) ✓
- Unmapped: 0

> Note: the original summary count of "42 total" undercounted the enumerated requirements; the actual v1 requirement IDs number 45 (AUTH 5, LIST 6, AVAIL 5, SEARCH 5, BOOK 7, PAY 6, HOST 3, MANAGE 3, GROUP 5). All 45 are mapped.

---
*Requirements defined: 2026-06-03*
*Last updated: 2026-06-03 after roadmap creation (traceability populated, count corrected to 45)*
