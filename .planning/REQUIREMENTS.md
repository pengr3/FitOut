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
- [x] **BOOK-07**: Booker can cancel a booking subject to the cancellation/refund policy

### Payments

- [x] **PAY-01**: Booker can pay for a booking by card online
- [x] **PAY-02**: Platform deducts a commission from each booking
- [x] **PAY-03**: Host receives a payout for completed bookings, with funds held until after the session
- [ ] **PAY-04**: Host completes payout onboarding (Stripe Connect KYC) before their listing becomes bookable
- [x] **PAY-05**: For request-to-book, the slot is held with no charge at request; the booker pays on host approval (pay-on-approval) and the slot frees on decline/expiry/non-payment — *mechanism revised from authorize→capture per D-63 (Phase 6): PayMongo cannot hold funds on QRPh/e-wallets and card manual-capture is sales-gated; pay-on-approval works on all rails with no fee bleed*
- [x] **PAY-06**: Cancellations issue refunds according to the cancellation policy

### Host Tools

- [x] **HOST-01**: Host can approve or decline pending booking requests within a deadline
- [x] **HOST-02**: Host can view upcoming and past bookings with status
- [x] **HOST-03**: Host can see payout status (what is owed / paid)

### Bookings Management (Both Sides)

- [x] **MANAGE-01**: Booker can view upcoming and past bookings with status
- [x] **MANAGE-02**: Booking status lifecycle (pending / confirmed / declined / cancelled / completed) is visible to both sides
- [x] **MANAGE-03**: Users receive transactional emails for key booking events (confirmation, request received, approved/declined, cancelled, reminder)

### Group Bookings (Differentiator)

- [x] **GROUP-01**: Organizer can create a group booking on top of a paid booking (organizer pays the full booking)
- [x] **GROUP-02**: Organizer can invite attendees via a shareable link and/or email
- [x] **GROUP-03**: Invited attendees can RSVP (yes/no) without needing a full account
- [x] **GROUP-04**: Organizer can see the confirmed headcount and who is coming
- [x] **GROUP-05**: Confirmed headcount is validated against the listing's capacity

### Open-Capacity Bookings (Second Occupancy Mode)

Host-set open / common-use mode — many independent bookers share one slot up to a capacity cap (drop-in gym, host-run open court), each paying per head on the existing rail. A separate occupancy mode from exclusive group bookings (Phase 8); the new engineering is a capacity-counter availability model, not per-attendee payment. Added 2026-07-27 (Phase 9).

- [x] **OPEN-01**: Host can set a listing to open-capacity mode with a per-head price and a capacity cap
- [x] **OPEN-02**: Multiple independent bookers can each reserve their own spot on the same shared time slot, each paying for their own head(s) via the existing rail
- [x] **OPEN-03**: Concurrent bookings on a shared slot are hard-capped at capacity with no overbooking — enforced atomically at the database level and proven under a race
- [x] **OPEN-04**: Availability and search show remaining capacity (spots left) for open-capacity listings

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
| BOOK-07 | Phase 7 | Complete (07-09 shipped the cancel action and the exact-refund review screen; **07-15 closed the two human ends the requirement's "subject to the cancellation/refund policy" clause depends on** — a host must now make an EXPLICIT tier choice before publishing, enforced server-side from the persisted row rather than by the wizard checklist (D-77, T-07-88), and a booker sees that tier's actual rungs before paying: generic on the listing page, and as CONCRETE venue-local dates for their own booking at checkout (D-81). Checkout discloses from the booking's tier SNAPSHOT — the same column `quoteRefund` reads — and all disclosure copy is DERIVED from `LADDER`, mutation-verified in both directions so it cannot drift from the money math. A NULL-tier listing renders no disclosure rather than a policy no host chose.) |
| PAY-06 | Phase 7 | Complete (07-09 shipped the BOOKER path — tier-driven refund computed from the booking's own snapshot against the DB clock, exact amount shown before confirming; 07-11 shipped the HOST path — 100% refund including the D-74 service fee with the tier deliberately not consulted, plus the D-70/D-71 consequences: audit against the host, undeletable auto-block of the freed window, and a write-time-capped signed `host_cancel_fee` debit netted by the 07-04 sweep; 07-16 closed the QRPh half — the rail is NOT API-refundable (settled by the 2026-07-23 probe, evidence in refund-rail.ts), so the D-72 collect-and-never-store InstaPay transfer path ships: `refund:` idempotency namespace, ₱50k ceiling guard, server-frozen amount, destination never persisted (transferId + masked last-4 only), with runtime degradation to the operator seam until PayMongo enables Money Movement; **07-17 closed the refund-COMMUNICATION half** — a 0%-rung cancellation no longer claims a ₱0 refund in any channel (suppression keyed on the amount inside notifyCancellation, toast branches on res.refundCents), and re-request pricing matches the mode actually booked via the persisted booking.full_day snapshot, so an hourly hold can never be silently repriced at the day rate after a host rate edit) |
| HOST-02 | Phase 7 | Complete (07-06 shipped `/host/bookings` — Upcoming/Past tabs, desktop table + mobile cards, per-booking payout state via `PayoutStateBadge` reused verbatim, keyset paging. Ownership is `listing.host_id` inside the query WHERE, mutation-verified in `tests/security/bookings-owner-scope.test.ts`) |
| MANAGE-01 | Phase 7 | Complete (07-06 shipped `/bookings` — Upcoming/Past tabs partitioned on the DB clock, venue-local labels, keyset `Load more`, and the single D-104 inline `Pay now`. Rows are scoped by `booking.booker_id` in the query WHERE, mutation-verified) |
| MANAGE-02 | Phase 7 | Complete (07-06 made the lifecycle visible on BOTH surfaces from 07-02's single derivation. D-102 `completed` is derived in SQL and proven to write nothing — `tests/booking/views.test.ts` reads the stored row back and asserts it still says `confirmed`. Booking-detail states are extended further in 07-12) |
| MANAGE-03 | Phase 7 | In progress — 4 of the 5 named events ship (07-10). 07-07 built the layer (`fitout/notify` fans out to a durable notification row in step 1 and the email in step 2, so an email retry cannot duplicate the row; `emitNotify` is proven not to throw when the transport rejects — the "never blocks the booking transaction" clause — and `onFailure` writes a `needs_attention` audit entry, closing WR-04). **07-10 wired it**: confirmation, request received, approved, declined and cancelled all emit post-commit through the one event, and a real lifecycle action now writes a real notification row (proven against a real DB, plus an independent-connection assertion that the emission happens AFTER the durable write commits). **07-14 landed the in-app RENDER half**: a `NotificationBell` popover mounted in both headers (D-92), owner-scoped `markNotificationRead`/`markAllNotificationsRead`, a bounded hidden-aware poller (D-84), and an exhaustive item renderer whose three reminder cases already have copy and icons. Cross-user reads and mark-read writes are mutation-proven impossible, and a `javascript:` href is proven never to reach a rendered anchor. **COMPLETE as of 07-13**, which shipped the fifth and last named event: the four D-85 reminders on an hourly singleton cron at `:45`, at-most-once by `booking_reminder`'s `UNIQUE(booking_id, kind)` claim (the INSERT is the lock; Inngest's 24h dedupe TTL is explicitly not relied on) with the claim written BEFORE the send, so a crash loses a reminder rather than double-sending one — proven under a genuine two-connection race. 07-13 also closed two correctness gaps the plan carried: a reminder whose offset instant predates the booking now sends NOTHING (a range-only predicate fires it immediately — mutation-verified), and the send path re-reads the booking so a booking cancelled after being scheduled is never reminded about. **07-17 closed the CONTENT-ACCURACY gaps 07-VERIFICATION flagged (CR-01/CR-02/WR-04)**: lifecycle emails now render the row's D-96-capped payByLabel/respondByLabel instead of the flat config constants (in-app and email copy agree per D-91, request-received states no number), a zero-refund cancellation sends no refund-issued claim, and the host's copy of a host cancellation states the host's own situation (side discriminant + sendHostCancellationRecord, fee consequence in writing) while the booker's copy and durable pre-fix rows stay byte-unchanged — "keeps everyone informed" no longer means misinformed. |
| GROUP-01 | Phase 8 | Complete |
| GROUP-02 | Phase 8 | Complete |
| GROUP-03 | Phase 8 | Complete |
| GROUP-04 | Phase 8 | Complete |
| GROUP-05 | Phase 8 | Complete |
| OPEN-01 | Phase 9 | Complete (09-06 server gate + 09-10 host wizard control). ⚠️ **A gap is closed by 09-21 (2026-08-01): CR-04.** The publish gate governed the draft→published transition only — `saveListingStep` wrote `occupancy_mode` straight to a LIVE row and never re-ran it, and the wizard makes that the NORMAL route (`occupancy` precedes `pricing`; every step autosaves the whole form), so a published listing could sit bookable in drop-in mode with no price per person. `saveListingStep`'s published-row scope now re-imposes all four publish rules on the effective post-save values, importing the publish path's own four sentences so the two gates cannot drift; drafts stay permissive because `publishListing` is still their gate. Confirmed branch-A before the fix and mutation-measured by `tests/listing/open-capacity-edit-gate.test.ts`. |
| OPEN-02 | Phase 9 | **Complete** (09-07 `placeOpenHold` + 09-11 the pre-hold `PassStepper` + **09-12 the booker surface: `DatePassPicker`, the calendar fork, the open rail and the `BookCta` branch that sends `{listingId, date, requestedPasses}`**; the paying half — the per-person reserve page + OC-07 partial-grant alert — is 09-13 + **09-15 the browser proof: two independent bookers on ONE shared date, the spots-left figure decrementing between their views, and no surface rendering the day pass as an hour range**. ✅ **The one manual-only verification is DISCHARGED by 09-16 (2026-07-31)**: three REAL PayMongo `sk_test_` hosted checkouts were paid by hand and `checkout_session.payment.paid` confirmed all three drop-in bookings (`evt_oGtPa9Vd7ZqWFiPRntuSjacm` → `215d2739`, `evt_zBVdHpjZL1N6hmVtasiZ5K6X` → `340b5323`, `evt_BRQR1Xx9FQcJhy2Dgvmti6m4` → `5b992c46`), each followed by a `booking_confirmed` notification row within ONE SECOND — proving PayMongo → tunnel → webhook route → status flip → `inngest.send` → notify → row end to end, with the frozen price triple and `open_capacity`/`unit`/`declared_pax`/`full_day` unchanged on read-back. The rail itself is byte-unchanged from Phase 6/8 and proven so (`git diff --exit-code` on the webhook route = 0), and the open-booking confirm path also has automated coverage in `tests/paymongo/webhook-payment-paid.test.ts`. ⚠️ **A gap remained until 09-17 (2026-07-31) and is now closed: CR-01.** Everything above proved the paying half for dates in the FUTURE — the walkthrough bought 2026-08-03 and the browser proof books `offset >= 3` days out — but `confirmBooking`'s D-94 cutoff compared `now()` against `starts_at`, and a drop-in pass's `starts_at` is the venue's OPENING instant, so a pass for TODAY could be held and never paid for from the moment the venue opened. The cutoff is now forked on the persisted `booking.open_capacity` (`ends_at` for a pass, `starts_at` for an exclusive booking), gated by the mutation-measured `tests/booking/open-capacity-confirm.test.ts` and walked end to end by `e2e/open-capacity.spec.ts` case 6. The ordinary same-day walk-in purchase — the headline use of a day pass — is what this requirement now actually covers. ⚠️ **A second gap 09-17 EXPOSED is closed by 09-25 (2026-08-01): WR-05.** With a same-day pass finally payable, `cancelBookingAsBooker`'s `AND starts_at > now()` made that pass uncancellable and unrefundable for the entire day it was valid for, with nothing on the reserve page saying so. The booker window is now forked on the same persisted column (`ends_at` for an open row), the spot returns to the pool on cancel, the host is paid the full retained price, and a REQUIRED `windowAlreadyOpen` prop states the non-refundable outcome BEFORE payment. Mutation-measured by `tests/booking/open-capacity-cancel.test.ts` cases 6-9. ⚠️ **A third gap is closed by 09-21 (2026-08-01): CR-04's money-path half, plus WR-04.** A mis-configured drop-in listing sent `quoteOpenCapacity` a NULL rate, which raised out of `createOpenCapacityHold` and `placeOpenHold` uncaught — a Next.js error digest on a booker's *Book this space* click. The claim now fails CLOSED on every money input it reads from the listing row (a NULL/non-positive rate, and a `perHead × granted` product that would exceed int4), returning a structured refusal with no booking written, while `quoteOpenCapacity`'s invariant guard is preserved for every other caller. Real host-input ceilings (`MAX_OPEN_CAPACITY` × `MAX_PER_HEAD_PRICE_CENTS`, arithmetically proven below int4) make the `.max(10_000)` docblocks true. Both mutation-measured — removing the product guard raises a live Postgres `22003` out of the action. ⚠️ **A fourth gap is closed by 09-24 (2026-08-01): WR-02.** A venue with a split shift that rolls past midnight (`06:00–12:00` **and** `18:00–02:00`) had its pass window collapsed to `06:00–12:00`, because the envelope was a SQL `MIN(open_time)`/`MAX(close_time)` and no wall clock can order `02:00` after `12:00`. `ends_at` was therefore noon, so `expires_at = LEAST(now() + TTL, ends_at)` minted an afternoon hold **born already expired** and `day_open_ok` refused claims after noon on a day the venue is open until 2 AM — the CR-01 shape by another route, on the same "each booker reserves their own spot and pays for it" path. The envelope is now reduced over real **instants**, per row, through the existing pure `openDayWindow`. Mutation-measured by `tests/availability/open-capacity-readmodel.test.ts` cases 12-13, where case 13 drives the real claim and reads the persisted `ends_at` and `expires_at` back out of Postgres.) |
| OPEN-03 | Phase 9 | **Complete** (09-01 the DDL — `booking_no_overlap` narrowed to `… AND open_capacity = false`, read back from the live catalog; 09-02 `createOpenCapacityHold` taking `pg_advisory_xact_lock(hashtextextended(listing‖':'‖dayOpenIso))` as its FIRST in-tx statement across sweep→SUM→INSERT; **09-03 the SC#3 gate — 6 cases over two layers firing N+1 genuinely concurrent claims through independent `makeRacingClients` backends, asserting the COMMITTED head SUM, with the shipped lock line DELETED and the suite watched go RED (`expected 4 to be 3`) then restored**. This is the phase's one non-negotiable gate and it is mutation-measured, not merely green.) |
| OPEN-04 | Phase 9 | Complete (09-04 server-derived `state`/`remaining` + 09-11 `SpotsLeftChip`/`DropInBadge` + 09-05 search: `spots` on the result row, date-only Stage-2 filter, effective-price filter/sort + 09-12 the availability mount (day-panel chip, month grid's disabled full dates from `getOpenMonthAvailability`, `/person` rail rate) + 09-13 the reserve summary + **09-14 the search card: the `Drop-in` badge, the all-in `/person` price, the chip only when a date is in play, no clock time ever, and a `?date=`-only forward link**. All three chip mount points the UI-SPEC enumerates are live. **Human-confirmed 2026-07-31 (09-16 steps 2/4/5/7)**, with the OC-11 disclosure rule now made explicit: `lowStockThreshold(cap) = clamp(floor(cap/2), 1, OPEN_LOW_STOCK_MAX)`, so an exact figure appears only from the threshold down — at cap 3 the threshold is 1 and the FIRST pass sold is deliberately invisible (`Spots available` at both 3 and 2 remaining). That is anti-invented-urgency by design (O4 / T-09-39), is now an asserted, mutation-measured contract in `e2e/open-capacity.spec.ts` case 2, and is logged as an accepted-design item in the phase's `deferred-items.md`. ⚠️ **Two gaps are closed by 09-24 (2026-08-01): WR-03 and NT-02.** (a) `OPEN_LOW_STOCK_MAX` was a bare `Number(env)`, so one typo (`five`, a trailing space, an empty string) made `lowStockThreshold` return NaN — and `remaining <= NaN` is **always false**, so `spotsState` could never return `"low"` and the exact spots-left figure was never disclosed on ANY listing on ANY date. **This requirement was one config typo away from being silently unmet platform-wide.** The ceiling is now validated (finite integer `>= 1`) with a documented fallback to `5`; the accepted-design threshold formula is byte-unchanged. (b) The month grid marked a date full only when `taken >= cap`, which is evaluated per booking row — so a listing with a NULL `max_occupancy` produced no rows, no date ever reached the test, and **every** date stayed selectable while the day panel refused each one on arrival. A `cap <= 0` listing now withdraws the whole month through the shipped `fullDates` disabled matcher. Mutation-measured by cases 14-15, the latter asserting the two projections **agree** on one sampled date rather than checking each alone.) |

**Coverage:**
- v1 requirements: 49 total
- Mapped to phases: 49 (100%) ✓
- Unmapped: 0

> Note: the original summary count of "42 total" undercounted the enumerated requirements; the v1 requirement IDs now number 49 (AUTH 5, LIST 6, AVAIL 5, SEARCH 5, BOOK 7, PAY 6, HOST 3, MANAGE 3, GROUP 5, OPEN 4). All 49 are mapped. (OPEN-01..04 added 2026-07-27 with Phase 9: Open-Capacity Bookings.)

---
*Requirements defined: 2026-06-03*
*Last updated: 2026-07-27 — added Phase 9 (Open-Capacity Bookings) + OPEN-01..04; v1 count 45 → 49*
