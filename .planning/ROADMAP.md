# Roadmap: FitOut

## Overview

FitOut delivers a two-sided fitness-space marketplace where the core transaction — search for a space, see real availability, reserve a slot, pay, and have the host paid out minus commission — is both the value proposition and the hardest engineering problem. The roadmap follows a strict dependency-driven order that all research independently converged on: identity must exist before supply, supply before availability, and the database-enforced double-booking guarantee must be proven correct **before** any money touches the system. The single-booker paid transaction is built end-to-end and made solid first; the group-booking differentiator is layered on last because it reuses the entire booking, payment, and cancellation infrastructure underneath. Payments are split into two phases — focused Stripe Connect infrastructure first, then wiring it into the full instant-book / request-to-book lifecycle fork — to keep the deepest complexity areas isolated and verifiable.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Auth & Accounts** - Single account with booker + host capabilities, sessions, password reset, basic profile
- [x] **Phase 2: Listings & Host Onboarding** - Hosts create/edit listings with photos, pricing, booking mode; PayMongo onboarding gates bookability
- [x] **Phase 3: Availability & the Double-Booking Guarantee** - Availability rules, real-time calendar, and the DB exclusion constraint that makes overlaps structurally impossible
 (completed 2026-07-14)

- [x] **Phase 4: Booking Core & Search (no payment)** - Two-phase slot hold + state machine + expiry worker, plus geo/activity/date/price search (completed 2026-07-15)
- [x] **Phase 5: Payments & Payouts** - PayMongo hosted-checkout charge, host-side commission, hold-until-session delayed payout, webhook-as-source-of-truth, refund mechanism
- [x] **Phase 6: Full Booking + Payment Integration** - Instant-book capture vs request-to-book pay-on-approval (no charge until host approves), host approve/decline, confirmation
 (completed 2026-07-20)

- [x] **Phase 7: Bookings Management, Cancellation & Notifications** - My Bookings both sides, cancellation/refund policy tiers, transactional email layer
- [x] **Phase 8: Group Bookings** - Organizer wraps a paid booking, invites via link/email, attendees RSVP, headcount validated against capacity — 22/22 plans executed & verified; the 08-17 double-charge BLOCKER and deferred items 5/6/7 closed by gap plans 08-18→08-22, money-path fixes proven against the real PayMongo sk_test_ API (completed 2026-07-29)
- [ ] **Phase 9: Open-Capacity Bookings** - Host-set open/common-use mode — many independent bookers share one slot up to a capacity cap (drop-in gym, host-run open court), each paying per head on the existing rail

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

**Plans**: 6 plans in 3 waves

  - [x] 02-01-PLAN.md — Wave 1: data model (listing/photo/amenity/tag/host_payout + PostGIS) + D-08 vocab + draft/publish Zod + deriveBookable + Wave-0 test scaffold + [BLOCKING] schema push
  - [x] 02-02-PLAN.md — Wave 1: deps + FitOut Coral/success tokens + 15 shadcn components + WR-06 closure (rate-limit + audit on capability-activate actions)
  - [x] 02-03-PLAN.md — Wave 2: listing server actions (create/save-step/publish-gate/unlist/soft-delete) + Airbnb-style wizard + address autocomplete + Your-listings grid
  - [x] 02-04-PLAN.md — Wave 3: Cloudinary signed direct upload (sign endpoint + helpers) + photo metadata actions + @dnd-kit reorder gallery wired into the wizard
  - [x] 02-05-PLAN.md — Wave 2: public listing detail page (un-gated, draft/unlisted 404, react-leaflet fuzzed/exact map, state-reflecting book CTA) + privacy-aware projection
  - [x] 02-06-PLAN.md — Wave 3: PayMongo Linked Accounts onboarding + merchant.activated webhook (signature-verified, idempotent) bookability gate + payout banner/return/refresh

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

**Plans**: 5 plans in 3 waves

  - [x] 03-01-PLAN.md — Wave 1: foundation — schema (unitCount/timezone + operating_hours/availability_block/booking + booking_status enum), generated 0004 + hand-authored 0005 GiST EXCLUDE constraint, [BLOCKING] db:migrate, deps + shadcn calendar/toggle/scroll-area, makeRacingClients + isPgError, SC#4 two-connection exclusion-race test (COMPLETE — booking_no_overlap live; race test green; finding: genuine race yields 40P01 deadlock OR 23P01, both prevent double-book → Phase-4 must map 40P01)
  - [x] 03-02-PLAN.md — Wave 2: server correctness layer — TZDate slot math (slots.ts), on-the-fly availability read model (read-model.ts), createBooking find-free-unit + retry-on-23P01 + clean error mapping (units.ts) + unit/integration tests (COMPLETE — 5 files/33 tests green; findings: TZDate.toISOString() is offset-local not UTC → normalize via epoch; bind ISO strings not Date into raw sql; 40P01 mapped like 23P01)
  - [x] 03-03-PLAN.md — Wave 2: host hours/blocks backend — shared Zod (weeklyHoursSchema/blockSchema) + saveOperatingHours/addBlock/removeBlock actions (session + ownership + server re-validation) + hours-validation/blocks tests (COMPLETE — 2 files/29 tests green; on-the-hour :ss-tolerant round-trip seam closed for 03-04; venue-tz→UTC timestamptz via TZDate; IDOR/replace-the-set/non-owner-unblock guarded)
  - [x] 03-04-PLAN.md — Wave 3: host availability editor UI — WeeklyHoursEditor (multiple windows/day) + BlocksEditor/AddBlockDialog (close-only, unit or whole-listing) + gated host RSC page (IDOR 404) + human-verify checkpoint
  - [x] 03-05-PLAN.md — Wave 3: booker availability calendar — AvailabilityCalendar (react-day-picker venue tz) + SlotPicker (consecutive-run, unselectable occupied/blocked) wired into the public listing page (replaces placeholder + rail summary) + availability E2E + human-verify checkpoint

  **Waves:** W1 (03-01) → W2 (03-02, 03-03 — parallel, blocked on W1) → W3 (03-04, 03-05 — parallel, blocked on W1; 03-05 also on W2's read model). W3 plans carry human-verify checkpoints.

  **Cross-cutting constraints** (invariants spanning ≥2 plans — every executor must hold these):

    - The **DB GiST `EXCLUDE` constraint is the only double-booking authority** — never an app-level "query-then-insert" (03-01, 03-02, 03-05).
    - **All times `timestamptz` UTC; displayed venue-local** via date-fns + `@date-fns/tz` at the edges only — no naive timestamps (03-01, 03-02, 03-04, 03-05).
    - **Half-open `'[)'` range semantics + the occupying-status list (`pending`,`confirmed`) are identical** across the constraint, unit-assignment SELECT, and read model (03-01, 03-02).
    - **Host writes re-check listing ownership server-side** (`listing.hostId === session.userId`) — the `(host)` route group alone is not the gate (03-03, 03-04).
    - **Selectability is gated on `deriveBookable()`**; non-bookable listings show a read-only availability preview, never a dead-end (03-05).

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

**Plans**: 8 plans in 5 waves

  - [x] 04-01-PLAN.md — Wave 1: booking hold columns (expiresAt/quotedTotalCents/currency/idempotencyKey) + [BLOCKING] migration + read-model lazy-expiry
  - [x] 04-02-PLAN.md — Wave 1: shared searchParamsSchema + bookingCreateSchema, PHP DISPLAY_CURRENCY, D-38 seed script + geo test helper
  - [x] 04-03-PLAN.md — Wave 2: two-stage search (::geography radius + type/tag/price + true-availability filter) + search integration tests
  - [x] 04-04-PLAN.md — Wave 2: createPendingHold WR-03 transaction (SAVEPOINT/outer-retry/sweep + idempotency) + pricing + FIT- reference
  - [x] 04-05-PLAN.md — Wave 3: search home at / (search bar + result cards + sort + Load more + empty states)
  - [x] 04-06-PLAN.md — Wave 3: placeHold/confirmBooking actions + reserve components (breakdown, countdown, expiry, Confirm)
  - [x] 04-07-PLAN.md — Wave 4: reserve page + owner-gated confirmation page + listing Book CTA wiring
  - [x] 04-08-PLAN.md — Wave 5: full-flow search→book→confirm E2E + expiry UX + human-verify

  **Waves:** W1 (04-01, 04-02) → W2 (04-03, 04-04) → W3 (04-05, 04-06) → W4 (04-07) → W5 (04-08). W5 carries the human-verify checkpoint.
**UI hint**: yes

### Phase 5: Payments & Payouts

**Goal**: Money flows correctly through the proven booking core — the booker pays the full listed price on a hosted PayMongo checkout (cards/GCash/Maya/QR Ph), the booking confirms only when the `checkout_session.payment.paid` webhook lands, the platform keeps a host-side commission, and the host is paid `price − commission` only after the session via a delayed inhouse transfer held on the platform wallet — with a refund mechanism that never keeps money for an undeliverable slot.
**Depends on**: Phase 4
**Requirements**: PAY-01, PAY-02, PAY-03, HOST-03
**Success Criteria** (what must be TRUE):

  1. A booker can pay for a booking online via PayMongo hosted checkout (cards/GCash/Maya/QR Ph), with the full amount collected to the platform wallet
  2. The platform deducts a host-side commission (10%, config-tunable) — the booker breakdown stays subtotal = total; the host receives price − commission
  3. Payment state is driven by the signature-verified, idempotent `checkout_session.payment.paid` webhook (the confirm authority) and refund events — not the browser return redirect
  4. The host is paid out `price − commission` via an inhouse `/v2/batch_transfers` fired T+24h after the session ends (funds held until then; never paid at booking time), at most once per booking
  5. A genuinely-gone-slot payment is auto-refunded (or operator-alerted for QR Ph, which cannot be API-refunded); a host can see per-booking payout status (Held / Processing / Paid / Refunded) with the commission breakdown

**Plans**: 7 plans in 3 waves

  - [x] 05-01-PLAN.md — Wave 1: foundation — commission calc + payment config + host_payout_ledger / booking.payment_id / listing.currency reconcile + [BLOCKING] migration 0008 (COMPLETE — pure integer-cents computeCommission 13/13 green; COMMISSION_RATE_BPS/PAYOUT_DELAY_HOURS/PAYMENT_WINDOW_MINUTES config; host_payout_ledger UNIQUE(booking_id) + frozen commission + payment_id + usd→php backfill applied to live DB via 0008)
  - [x] 05-02-PLAN.md — Wave 1: PayMongo client extension (checkout / batch-transfer / refund / wallets + /v1↔/v2 base) + mockPayMongo stubs (COMPLETE — version-less PAYMONGO_BASE + versioned per-call paths kill the /v1/v2/... bug; createCheckoutSession full PH rail set, createBatchTransfer inhouse amount=netCents, createRefund refund:<paymentId>, listWalletAccounts global-list-with-caller-correlation; PLATFORM_WALLET fail-closed prod guard; mockPayMongo + 4-test fetch-routing suite; 33/33 payments+paymongo green, tsc clean)
  - [x] 05-03-PLAN.md — Wave 2: "Confirm & pay" checkout action (extend-hold, charge frozen quote, retire sync flip) + reserve UI + confirmation pending-payment/reversed states (COMPLETE — confirmBooking retires the sync flip: owner-gate→idempotent short-circuit→rateLimit+audit→extend hold now()+PAYMENT_WINDOW→createCheckoutSession for exactly quotedTotalCents (Idempotency-Key checkout:<id>)→redirect off-site; ConfirmResult += 'checkout'; reserve UI Confirm & pay + charged-amount reassurance, booker breakdown stays subtotal=total (D-50); /bookings/[id]?paid=1 branches → PendingPaymentState (bounded router.refresh poller, never fabricates confirmed) / PaymentReversedState (calm D-58 landing); TDD 4/4, 62/62 booking+payments+paymongo green, tsc+eslint clean; PAY-01 stays In-progress until 05-04's payment.paid webhook confirm authority)
  - [x] 05-04-PLAN.md — Wave 2: webhook confirm authority (checkout_session.payment.paid) + D-58 auto-refund backstop (QR Ph operator-alert) + refund events (COMPLETE — extended the single-writer webhook: checkout_session.payment.paid flips booking pending→confirmed on reference_number ALONE (no expires_at>now() re-check, Pitfall 4) + captures pay_...; handleGoneSlot on a 0-row confirm re-reads to skip a benign confirmed replay then refunds refundable rails / operator-alerts QR Ph·UBP via recordAudit needs_attention (never silent retention), setting the booking cancelled→PaymentReversedState; payment.refunded/refund.updated idempotently flip host_payout_ledger held→refunded + booking cancelled; AuditOutcome += needs_attention; 12 new webhook tests, 49/49 payments+paymongo green, tsc+eslint clean; **PAY-01 COMPLETE** — checkout + confirm-on-webhook)
  - [x] 05-05a-PLAN.md — Wave 2: Inngest T+24h payout sweep — at-most-once ledger claim + commission freeze + inhouse net transfer (client + env keys, no serve mount) (COMPLETE — inngest@4.13.0 client (id fitout, no serve mount here); queryDuePayouts Pattern-4 DB-clock sweep (confirmed + ends_at+PAYOUT_DELAY<=now() + p.id IS NULL); payOne = computeCommission freeze (D-51) → INSERT … ON CONFLICT (booking_id) DO NOTHING RETURNING id claim (at-most-once) → wallet.id===paymongo_account_id correlation (no-match ⇒ Held + [payout-alert], fire nothing) → createBatchTransfer(netCents, D-52) → ledger Held→Processing; hourly singleton cron TZ=Asia/Manila concurrency:1; env keys owned here (COMMISSION_RATE_BPS/PAYOUT_DELAY_HOURS/PAYMENT_WINDOW_MINUTES/PAYOUT_RECONCILE_STUCK_HOURS/PLATFORM_WALLET_*/INNGEST_*); 6 new tests (due-only, happy net-180000, racing at-most-once, multi-host A→A/B→B, no-match), 55/55 payments+paymongo green, tsc+eslint clean; deviation: inngest 4.13.0 2-arg createFunction(options, handler). Commits 68bb06d/21674d5/7bdbed8)
  - [x] 05-05b-PLAN.md — Wave 3: payout reconcile (getTransfer poll → Processing→Paid/Failed + operator alerts) + /api/inngest serve() mounting BOTH crons (COMPLETE — getTransfer(GET /v2/transfers/{id}, no Idempotency-Key) polls terminal status (Pitfall 2 — no transfer webhook); mapTransferStatus (paid∈{succeeded,completed,paid}/failed∈{failed,returned,cancelled}/else→processing, safe default never spuriously Paid, VERIFY vs live A4); queryProcessingLedger (state='processing' AND transfer_id NOT NULL) → reconcileOne moves Processing→Paid (paid_at=now()) / Processing→Failed, each guarded AND state='processing' (idempotent 0-row no-op on terminal rows); Failed OR stuck-beyond-PAYOUT_RECONCILE_STUCK_HOURS → [payout-alert]; payoutReconcile hourly singleton (TZ=Asia/Manila 30 * * * *, offset 30m from sweep); /api/inngest serve() mounts BOTH payoutSweep+payoutReconcile (runtime=nodejs, fail-closed prod INNGEST_SIGNING_KEY boot guard) — created LAST so both static imports resolve tsc-clean; 6 new tests (selectivity, Processing→Paid, Processing→Failed+alert, idempotency, unknown-stays-processing, stuck-alert), 71/71 payments+paymongo green, tsc+eslint clean; deviation: inngest 4.13.0 2-arg createFunction(options, handler). T-05-28/T-05-26 mitigated. Commits a6260bd/b83c5e5/ddbaba0)
  - [x] 05-06-PLAN.md — Wave 2: HOST-03 earnings page (owner-scoped ledger rows, gross→−10%→net, state badges, summary totals) + Earnings nav (COMPLETE — owner-gated /host/earnings RSC reads host_payout_ledger WHERE host_id=session.user.id (Security V4/T-05-29), joined booking/listing; pure derivePayoutLedgerView (Held=secondary+Clock/Processing=outline+ArrowLeftRight/Paid=bg-success+CheckCircle2/Refunded=muted+Undo2/Failed=destructive Alert — never red on a happy state) + summarizePayouts (Upcoming=Held+Processing net, Paid out=Paid net); host-visible gross→−10%→net breakdown (D-59, booker never sees it per D-50); venue-tz-safe Expected(endsAt+PAYOUT_DELAY_HOURS)/Paid(paidAt) dates; desktop shadcn table (th scope) + mobile PayoutRow cards; PayoutBanner nudge when not onboarded; No earnings yet empty state; NO coral; neutral Earnings nav in dashboard action row + (host) header; server-frozen money, zero arithmetic; 10 new tests (derivation+summary+owner-scope A≠B+commission visibility), 65/65 payments+paymongo green, tsc+eslint clean. **HOST-03 COMPLETE.** Commits ce13923/8ff110f/5d2f1df)

  **Waves:** W1 (05-01, 05-02 — parallel, no shared files) → W2 (05-03, 05-04, 05-05a, 05-06 — parallel, blocked on W1; 05-06 depends on 05-01 only) → W3 (05-05b — payout reconcile + Inngest serve route; blocked on 05-05a so route.ts mounts only after BOTH cron function files exist).

  > ⚠️ Prior Stripe Connect prose (reverse_transfer / account.updated / payouts_enabled) is SUPERSEDED by D-20 (PayMongo). CLAUDE.md § Marketplace Payments + .planning/phases/05-payments-payouts/05-CONTEXT.md are authoritative for payment mechanics.
**UI hint**: yes

### Phase 6: Full Booking + Payment Integration

**Goal**: The booking and payment building blocks are wired into one complete lifecycle that forks on the host's booking mode — instant-book captures payment immediately and confirms, while request-to-book holds the slot with no charge, lets the host approve or decline within an SLA, and on approval has the booker pay (pay-on-approval) to confirm, freeing the slot on decline/expiry/non-payment.
**Depends on**: Phase 5
**Requirements**: BOOK-04, BOOK-05, BOOK-06, PAY-05, HOST-01
**Success Criteria** (what must be TRUE):

  1. An instant-book listing confirms immediately on successful payment and the slot is locked
  2. A request-to-book listing creates a pending request that **holds the slot with no charge** and a host can approve or decline, auto-declining if no response within the SLA
  3. On approval the booker pays via the Phase-5 checkout and the booking confirms; on decline, SLA expiry, or non-payment within the payment window the slot frees — nothing is ever refunded or voided
  4. A booker receives on-screen and email confirmation of a confirmed booking

**Plans**: 10 plans in 6 waves (+1 gap-closure, wave 7)

  - [x] 06-01-PLAN.md — Wave 1: schema (requested/approved enum + booking.bookingMode snapshot + listing default flip D-62) + config (APPROVAL_SLA/PAYMENT_WINDOW hours D-64) + hand-authored 0010/0011/0012 + [BLOCKING] db:migrate (enum-add → columns → widened GiST EXCLUDE)
  - [x] 06-02-PLAN.md — Wave 2: occupancy-predicate fan-out (read-model + units lazy reads/sweep) + createPendingHold parameterization + Wave-0 concurrent-double-book-on-requested/approved race gate
  - [x] 06-03-PLAN.md — Wave 2: five lifecycle emails over email.ts (D-66) + D-62 createDraftListing default→instant + D-61 wizard copy
  - [x] 06-04-PLAN.md — Wave 3: placeHold fork on bookingMode (request = no-charge held request + emails) + confirmBooking accepts approved (GREATEST extend) + /book page accepts approved
  - [x] 06-05-PLAN.md — Wave 3: webhook confirm WHERE widened to IN('pending','approved') (single writer, D-57) + BOOK-06 confirmed email; D-58 gone-slot backstop unchanged (COMPLETE — one predicate widening, one writer; confirmed email fires fire-and-forget on the ≥1-row branch for BOTH instant + pay-on-approval; handleGoneSlot/verifySignature/dedupe/handleRefund untouched; pay-after-release proven; 12 webhook + 121 paymongo/booking/payments green)
  - [x] 06-06-PLAN.md — Wave 3: request-expiry Inngest cron (SLA auto-decline / payment-window auto-release, DB-clock) + /api/inngest serve() mount (COMPLETE — request-expiry.ts near-clones payout-sweep: queryExpired DB-clock now() sweep of requested/approved past expires_at (LIMIT 100, explicit dbConn) + expireOne (requested→declined+booker email / approved→cancelled SILENT, status-scoped RETURNING ⇒ idempotent); DB clock is the SOLE expiry authority (T-06-16); terminal mapping matches the 06-02 in-tx sweep (Warning-1), cron is the SOLE booker-email authority (A6); 2-arg createFunction singleton at cron minute 15 offset from the payout crons (0/30), mounted in serve() alongside payoutSweep+payoutReconcile (fail-closed guard unchanged); nothing refunded/voided on expiry (D-63); 5 request-expiry green + 125 booking/paymongo/payments green; NO deviations. Commits 17aab91/cdec048)
  - [x] 06-07-PLAN.md — Wave 4: host-requests approve/decline server actions (owner-gated, atomic, SLA-guarded; D-64/HOST-01) + emails + revalidate (COMPLETE — src/app/actions/host-requests.ts: approveRequest + declineRequest clone the blocks.ts skeleton but swap the listing-ownership guard for a BOOKING⨝LISTING host-ownership guard (loadOwnedRequest joins booking→listing→host-user(canHost)+booker-user(email), returns the row ONLY if listing.hostId===session.user.id AND canHost — a missing id and a cross-host id return the SAME calm denial, IDOR/Security V4/T-06-19, the (host) route group is NOT the gate); approve = atomic DB-clock SLA-guarded UPDATE status='approved', expires_at=now()+make_interval(hours=>APPROVAL_PAYMENT_WINDOW_HOURS) WHERE status='requested' AND expires_at>now() RETURNING id (0 rows → calm 'no longer pending', a lapsed approve refused server-side, race with the 06-06 cron is fine — whoever flips first wins; T-06-20) + fire-and-forget sendRequestApproved pay-now link to /listings/[id]/book?hold=<id> (T-06-22) + rate-limit + recordAudit (WR-06); decline = atomic status-scoped UPDATE status='declined', expires_at=NULL WHERE status='requested' (slot frees automatically — declined non-occupying, 06-01 EXCLUDE + 06-02 lazy reads) + fire-and-forget sendRequestDeclined; both revalidatePath /host/requests + /host (D-65); nothing refunded/voided (D-63). request-lifecycle.test.ts +6 host-action cases (approve-happy+pay-link, SLA-guard refusal, decline+slot-freed+email, cross-host owner-gate, idempotent 0-row no-op, NON-OPTIONAL /host/requests owner-scope READ isolation — host-A sees only A's requested rows, the predicate 06-08 consumes). tsc exit 0; eslint 0 errors; request-lifecycle 22 green (16 prior + 6 new); booking+payments+paymongo 131 green (up 6, no regressions). Commits 779cc43/e3408cc)
  - [x] 06-08-PLAN.md — Wave 5: /host/requests inbox RSC + pending-count nudge + RequestCountdown (hours scale) + booker requested/approved confirmation states (D-65/D-66) (COMPLETE — RequestCountdown (src/components/booking/request-countdown.tsx): an HOURS-scale display-only clone of hold-countdown.tsx, per-MINUTE setInterval 60_000, {N}h {M}m format, --destructive final hour, role=timer aria-live=off, DB now() vs expires_at is the sole authority. /host/requests (src/app/(host)/host/requests/page.tsx): RSC cloning /host/earnings — defense-in-depth session+canHost re-gate + the OWNER-SCOPED read booking⨝listing⨝user WHERE listing.hostId=session.user.id AND status='requested' ORDER BY expires_at ASC (the EXACT predicate 06-07's non-optional owner-scope isolation test asserts; the route group is NOT the gate, T-06-23/Security V4; booker JOIN is display-only) + desktop table/mobile RequestRow cards + empty state + no coral. RequestRow/RequestActions (src/components/host/request-row.tsx): Approve neutral solid inline / Decline neutral outline → confirm dialog, wiring the 06-07 approveRequest/declineRequest with sonner toasts + revalidatePath freshness (0-row → calm 'no longer pending'). Pending-count nudge (D-65): owner-scoped count() status='requested' in host/page.tsx (outline Requests button) + layout.tsx (header nav link), neutral secondary badge hidden at 0 + aria-label. bookings/[id]/page.tsx branched: requested (Awaiting host secondary/Hourglass, 'You'll pay if approved', no pay CTA) + approved (Approved outline/CalendarCheck — NOT --success; payment-window countdown; coral Pay now → /book?hold=<id>) + a calm declined landing; confirmed/pending-interstitial/reversed unchanged. tsc exit 0; eslint 0 on all six files; booking+paymongo+payments 131 green (no regressions). T-06-23/24/25 mitigated. Commits bcecf13/407cdaf)
  - [!] 06-09-PLAN.md — Wave 6: human-verify checkpoint RAN → **ISSUES FOUND** (2026-07-20). Live UAT against real PayMongo test mode verified the request lifecycle (request/approve/decline/inbox/countdown/booker states, BOOK-05/HOST-01) but step 6 (payment→webhook confirm) FAILED: **G-06-01 (CRITICAL)** — parseSignature (webhook/route.ts:91) requires all 3 of t/te/li, but real PayMongo signs te XOR li (empty li in test, empty te in live) → 400 on every real webhook → no booking confirms (blocks PAY-05/BOOK-06 + BOOK-04 confirm). Proven via a real paid checkout that never confirmed + HMAC match + 400 replay. **G-06-02 (setup)**: webhook URL registered at ngrok root not /api/paymongo/webhook. Phase NOT complete → gaps_found (see 06-VERIFICATION.md). Next: /gsd-plan-phase 6 --gaps
  - [x] 06-10-PLAN.md — Wave 7 (gap-closure, G-06-01): parseSignature widened to accept real te-XOR-li PayMongo signatures (te in TEST/empty li, li in LIVE/empty te) — was requiring all 3 of t/te/li → 400 on every real webhook, blocking the D-57 confirm authority (PAY-05/BOOK-06/BOOK-04 confirm). One-predicate fix `if (!parts.t || (!parts.te && !parts.li)) return null;` + tolerant return; verifySignature already skips empty candidates. Regression tests add the real single-mode signature shape (te-only + li-only confirm a booking; both-empty still 400s) — closes the both-populated fixture gap that let it through. verifySignature/handleGoneSlot (D-58)/handleRefund/dedupe untouched. G-06-02 (register webhook at full /api/paymongo/webhook path) recorded as a re-UAT precondition.

**UI hint**: yes

> ⚠️ **Mechanism corrected by Phase-6 discuss (D-63, 2026-07-19):** the original "authorize payment → capture on approval" model is **infeasible on our rails** (QRPh/e-wallets are capture-only; card manual-capture is sales-gated and not enabled for FitOut). Request-to-book uses **pay-on-approval** — no money moves until the host approves, so all rails (QRPh included) work with no refund/fee-bleed on a decline. Scope is unchanged (BOOK-05/PAY-05/HOST-01 stay in Phase 6). See `.planning/phases/06-full-booking-payment-integration/06-CONTEXT.md`.

### Phase 7: Bookings Management, Cancellation & Notifications

**Goal**: Both sides can see and manage their bookings through their full lifecycle, cancellations resolve to correct, policy-driven refunds with the refund amount shown before confirming, and a reliable async transactional-email layer keeps everyone informed.
**Depends on**: Phase 6
**Requirements**: BOOK-07, PAY-06, HOST-02, MANAGE-01, MANAGE-02, MANAGE-03
**Success Criteria** (what must be TRUE):

  1. A booker and a host can each view upcoming and past bookings with a status lifecycle (pending / confirmed / declined / cancelled / completed) visible to both sides
  2. A booker can cancel a booking and see the exact refund amount before confirming, with the refund issued per the listing's named cancellation policy tier (correct money movement for who-cancels × time-to-start)
  3. A host-initiated cancellation produces a full refund to the booker with defined consequences
  4. Users receive transactional emails for key booking events (confirmation, request received, approved/declined, cancelled, reminder) via a reliable async layer that never blocks the booking transaction

**Plans**: 20 plans in 7 waves (17th = gap-closure wave after verification; 18-20 = UAT gap-closure wave)
Plans:

- [x] 07-01-PLAN.md — Foundation: config constants, schema columns/enums/tables, migrations [BLOCKING]
- [x] 07-02-PLAN.md — Shared display primitives: whenLabel extraction + booking status derivation/badge
- [x] 07-03-PLAN.md — Pure money modules: refund ladder, service fee, rail predicate
- [x] 07-04-PLAN.md — Payout ledger correctness: retention sweep, fee-exclusion, kind scoping, debit netting
- [x] 07-05-PLAN.md — Expiry-cap correctness: session cap, DB clock, lead-time guards, proportional split
- [x] 07-06-PLAN.md — Bookings views: /bookings + /host/bookings, tabs, rows, keyset paging
- [x] 07-07-PLAN.md — Notification infrastructure: Inngest fan-out, notification table, onFailure audit
- [x] 07-08-PLAN.md — Service fee end-to-end: frozen triple, tier snapshot, checkout disclosure, all-in browse
- [x] 07-09-PLAN.md — Booker cancellation: refund preview route + owner-gated cancel action (SC#2)
- [x] 07-10-PLAN.md — Notification emission migration: five sends off fire-and-forget (COMPLETE — all five shipped `void sendXxx(...)` lifecycle sends now `await emitNotify(...)` post-commit on the D-83 `fitout/notify` event, so each gains retry/backoff/per-run observability and a durable in-app row at D-91 parity: approveRequest→request_approved, declineRequest→request_declined (expired:false), placeHold's request branch→request_received (booker) + new_request_to_host (host), the payment webhook→booking_confirmed on the ≥1-row confirm branch only (so a PayMongo redelivery emits nothing), and request-expiry's cron→request_declined (emitting rather than calling email.ts directly, so expiry is not the one lifecycle event without an in-app row). MANAGE-03 is observably satisfied end-to-end for the first time. Zero email templates/subjects/bodies changed — a pure transport migration. New: composeDeadlineLabel in when-label.ts (payByLabel/respondByLabel composed from the row's own expires_at, never a config constant — D-94's cap and D-96's split make the constants wrong on short-notice bookings); ExpireOneResult's declined variant renamed emailed→notified; approveRequest returns expires_at through the shared isoUtc mask. Auto-fixed a latent D-74 bug: the webhook re-derived fullDay from the ALL-IN total, which can never equal hourlyRate×hours, so every hourly booking would have rendered 'Full day' in its confirmation — replaced by composeWhenLabel. tests/booking/notify-emission.test.ts (6 cases) proves emission-after-commit via an INDEPENDENT Postgres connection reading committed state at emit time, that a rejecting transport cannot fail the action, that a 0-row repeat emits nothing (dedupe lives in the status-scoped UPDATE WHERE), the expiry + too-close-to-start variants, and end-to-end that a real approve writes a real notification row read back out of the real DB; verified non-vacuous by a pre-commit-emission mutation that fails 4 of 6. The 7 pre-existing mockResend assertions for migrated sends were MIGRATED to assert the emission, not deleted. tsc exit 0; eslint clean; full suite 70 files / 560 tests green (was 69/554). Commits 7206a46/e0ef253/8fe275d)
- [x] 07-11-PLAN.md — Host cancellation: full refund + audit + auto-block + capped fee debit (SC#3) (COMPLETE — **SC#3 now has a product path.** `cancelBookingAsHost(bookingId, reason)` fires all four D-70/D-71 consequences: a 100% refund of the all-in charged total INCLUDING the D-74 service fee (the one case where the non-refundable fee IS returned — the booker did nothing wrong, so the platform absorbs the gateway cost), an audit row against the host, an auto-block of the freed window on the same listing AND unit carrying `reason='host_cancellation'` which `removeBlock` refuses to delete, and a signed `kind='host_cancel_fee'` debit capped at the booking value AT WRITE TIME with `ON CONFLICT (booking_id, kind) DO NOTHING` as the at-most-once lock. **`quoteRefund` is deliberately never called** — the ladder answers what a BOOKER forfeits for changing their mind, which has no meaning when the booker did nothing; a strict-tier booking cancelled 1h out still refunds 100%, asserted at the exact rung that would award a booker 0%. `retained_space_cents = 0` is what makes 07-04's sweep predicate exclude the booking. This plan writes the FIRST REAL `host_cancel_fee` row in the system's history, so it is the first that could verify 07-04's kind scoping against a product-produced debit rather than a fixture: the payout sweep still nets correctly (₱1,800−₱300=₱1,500), `alertStuckHeld` returns 0 with a real debit aged 200h past the 48h threshold, and `/host/earnings` totals are unaffected while the debt surfaces through its own outstanding query. UI per D-80/07-UI-SPEC §4: a two-pane `HostCancelDialog` with a required reason gating pane 2 and a required acknowledgment gating confirm, both buttons neutral, no coral, no destructive variant, the fee rendered from a server-capped prop; `/host/bookings/[id]` re-gates session + canHost and owner-scopes with `listing.host_id` in the WHERE. ⚠️ The owner-gate mutation check found a REAL gap: the host path had only ONE ownership layer where the booker path has two (host ownership lives on the listing, so it cannot be a bare column predicate and the plan's SQL omitted it) — removing the gate let a host cancel, refund and fee-charge a stranger's booking. Closed with an `EXISTS` host scope inside the UPDATE's WHERE, after which the same mutation blocks the write and only leaks the denial string. Also fixed 07-10's assigned defect: root-relative notification hrefs were dead links in both this action's emails, now absolute via the existing `BETTER_AUTH_URL` convention with regression assertions on both cancel paths. Two further auto-fixes: the plan's mandated `readDbNow` call was dead code on a path that evaluates no rung (omitted, with Postgres `now()` in the UPDATE's own WHERE documented as the stronger authority), and the post-commit consequences are now individually guarded so a throw cannot 500 a committed cancellation and skip the refund. 16 integration cases; tsc + eslint + `npm run build` clean; full suite 73 files / 597 tests green (was 72/581). Commits df30010/59c08ff/8df752f)
- [x] 07-12-PLAN.md — Booking detail states: cancel entry, one-click re-request, cap-shortened SLA reason (COMPLETE — **the booking detail page is finished and D-97 exists.** `reRequestSameWindow` resubmits a lapsed request's SAME window in one click: owner-gated, rate-limited, audited, and — the structural claim the whole feature rests on — it **INSERTS a new booking row and never flips a terminal one back**, so the GiST EXCLUDE re-adjudicates occupancy on every attempt. The file contains no statement that can modify an existing booking, which makes "re-request as a route back through a cancellation or a host-cancel debit" impossible rather than merely prevented. `/bookings/[id]` gains four branches with every shipped branch untouched: the D-104 cancel entry (a neutral outline **link** to the review route, below the primary content behind a Separator — role-qualified in the e2e precisely because "route to the disclosure, don't act inline" is the property), the no-money `CancelRequestDialog` on requested/approved, the D-97 recovery branch, and the `cancelled` / derived-`completed` branches. **Two live defects found and fixed:** (1) the plan's lapse guard — `status IN ('declined','cancelled')` AND *"expires_at has passed"* — would have matched **no row in production**, because both retirement paths (`request-expiry.ts` and the in-tx stale-hold sweep) `SET expires_at = NULL`; D-97 would have shipped dead, rendering a button whose every click returned "no longer available to resend". Rewritten as "holds no live window" (`expires_at IS NULL OR <= now()`) plus three discriminators (`cancelled_by IS NULL` + request mode + no payment id) so a party cancellation, an instant hold and a paid booking can never enter the path. (2) `cancelled` was absent from `RENDERABLE`, so the **shipped** booker cancel flow — `CancelConfirm` pushes to `/bookings/{id}` on success — ended on a 404. Two further truthfulness fixes: a non-zero refund always reads `₱X refund on its way`, never "refunded", because there is no settled-refund signal on a booking row and claiming one off the POST is exactly what D-57 forbids; and the D-97 body copy carries a deadline-free variant because `expires_at` is not retained past the terminal flip, so the locked `You had until {deadline}` sentence would otherwise state an instant we do not know. A stable `idempotencyKey` was deliberately NOT passed to `createPendingHold` — `booking_idem_uq` is partial-UNIQUE over all time, so a key derived from the source id would 23505 with no active hold to replay and re-throw as a raw 500 once the first re-request had itself lapsed; idempotency rests on the D-42 own-hold window match instead, proven by a double-submit case. **Both assigned handoffs closed:** `e2e/cancel.spec.ts` now lands on the detail page and CLICKS the entry instead of deep-linking (07-09's documented coverage gap), with added assertions that a cancelled booking offers no entry at all; and D-99 ships as `RequestCountdownReason` — one muted line beneath the countdown, rendered only when the deadline is genuinely cap-derived, with `request-countdown.tsx` untouched (`git diff --stat` empty). 7 integration cases including owner-scope-by-mutation **with a positive control**, a since-taken slot reusing the shipped conflict string, and the lead-time guard proven not bypassed. tsc + eslint clean; `npx next build` passes with the three documented env placeholders; full suite **74 files / 604 tests, exit 0** (was 73/597). Commits 940f66f/9158a47/39b89e4)
- [x] 07-13-PLAN.md — Four reminders on an at-most-once DB claim (COMPLETE — **MANAGE-03's fifth and last named event ships, and the requirement is now tickable.** `src/inngest/functions/reminders.ts` runs the four D-85 reminders (`pre_expiry`, `pre_sla_host`, `pre_session_booker`, `pre_session_host`) on an hourly singleton cron at `:45` — the last free quarter-hour, `:00`/`:15`/`:30` being the payout sweep, request expiry and payout reconcile. At-most-once is `booking_reminder`'s `UNIQUE(booking_id, kind)` where the **INSERT is the lock**, deliberately with no app-level "already sent?" pre-query — Inngest's own `idempotency` is a documented 24-hour TTL that batching, debouncing and function pausing all bypass, which is a structural mismatch for "one reminder each, ever". The claim is written BEFORE the send, so a crash loses a reminder rather than double-sending one. **Two plan bugs found and fixed.** (1) The plan's range-only predicate does not produce the no-send it claims: a D-96 cap-shortened SLA (a request 4h out gets ~2h) satisfies both `expires_at > now()` and `expires_at <= now() + 6h`, so a range-only query selects it on the FIRST tick and fires a "6 hours left" reminder at roughly the moment the request was created — the plan's own test case 6 asserts zero rows and would have failed against the plan's own SQL. Closed with a fourth clause on all four predicates, `deadline - OFFSET >= b.created_at`: the reminder instant must have fallen inside the booking's own life. **Mutation-verified** — removing it makes the unreachable case fail. Accepted consequence, stated plainly: a session booked less than an offset ahead gets no pre-session reminder (the confirmation sent 23h out already IS that reminder), while the same booking's reachable 12h host reminder still fires, asserted by its own test. (2) `DueReminder` must not cross an Inngest step boundary — a step result is JSON-serialised and memoized, so `Date`s returned from `find-due` reappear as strings on a replay and every `format()` call breaks, in production, only on a retry. Only `ReminderRef` (two strings) crosses; the row is re-read inside each send step, which buys **send-time status re-verification** for free: a booking cancelled AFTER it was scheduled is never reminded about, which schedule-time scoping alone cannot catch (a third result member `skipped-not-due`). 12 integration cases against a real isolated schema with every fixture instant computed by Postgres, including at-most-once under a GENUINE two-connection race via `makeRacingClients` (both the bare claim and the full send path), cross-kind claim independence, range boundaries, terminal-booking exclusion, and a rejecting transport that consumes the claim without failing the sweep. tsc + eslint clean; `npm run build` exit 0 with the documented env placeholders; full suite **75 files / 616 tests, exit 0** (was 74/604). Commits 16e4bbb/cee8cdb)
- [x] 07-14-PLAN.md — Notification bell + centre in both headers (COMPLETE — executed ahead of 07-11/12/13; its deps 07-06 and 07-07 were already done. One `NotificationBell` mounted in BOTH inline headers (`(app)/layout.tsx`, `(host)/host/layout.tsx`) fed server-computed owner-scoped props, so a notification is never invisible because the user was in the wrong mode (D-92). The two headers stay deliberately duplicated per D-04 — the BELL is the shared thing, and the researcher's-call comment saying so is recorded in both files. The D-65 pending-request badge sits alongside it untouched: two badges, two meanings. Panel is `popover`, NOT `dropdown-menu` (links + a button are not `menuitem`s; menu semantics misreport the content to AT), `w-80 sm:w-96` / `max-h-96` with an internal ScrollArea, capped at the 20 most recent with the footer line and NO dead `View all` link. Badge is neutral `secondary`, hidden at 0, display-capped at `9+`, never coral — the TRUE count reaches AT through `aria-label="Notifications, {n} unread"`. Unread rows carry three signals: `bg-muted` tint, a 6px brand dot, and an `sr-only "Unread"`. `src/app/actions/notifications.ts` adds `markNotificationRead` + `markAllNotificationsRead`, both scoping `recipient_id` INSIDE the UPDATE's WHERE and returning an identical calm shape for owned, foreign and missing ids so there is no enumeration oracle; both are idempotent by construction and the bulk write is rate-limited 60/60s with an audit on denial only. Freshness is D-84's bounded `router.refresh()` poller at ~30s that PAUSES on `document.hidden` (burning no attempt, so a backgrounded tab does not come back permanently stale) — TanStack Query is still not installed. Relative "2h ago" labels are composed SERVER-side against the DB clock via `readDbNow`; no Date crosses to the client. The item renderer switches exhaustively over `NotificationPayload` closed by a `never` weld with no `default:`, so adding a notification kind is now a FOUR-file compile-error change. Two Rule-2 deviations: both layouts wrap the notification read in try/catch (a layout throw would take down the session/capability gate and every page in the group — the plan's specified error state was otherwise unreachable), and `tests/notifications/notification-render.test.tsx` was added because the plan's only XSS control was a grep for an ABSENT API, which cannot prove a present one is safe — React escapes text but does NOT sanitise a URL scheme, so `safeHref` re-validates at render independently of 07-07's write guard (a durable row outlives the guard that wrote it), refusing `javascript:`/`data:`/`vbscript:` and protocol-relative `//evil.example`, and degrading a refused row to inert readable content. Both test files MUTATION-VERIFIED: 5 owner-scope mutations (3/8, 3/8, 2/8, 1/8 failures) and 1 render mutation (6/13), all caught, all restored — with positive controls asserting exact counts and exact id sets so a deny-everything implementation cannot pass. Residual gap, stated not hidden: `/` and `/listings/[id]` are at the root with no header, so a booker there still sees no bell (UI-SPEC Open Question 1); Plan 06 closed the consequential part by moving `/bookings/[id]` into `(app)`. tsc exit 0; eslint clean; `npm run build` exit 0 with the three documented env placeholders; full suite 72 files / 581 tests green (was 70/560). Commits 845fc24/6474ce9/bbc8fb2)
- [x] 07-15-PLAN.md — Cancellation policy surfaces: wizard tier step + booker disclosure (COMPLETE — **the two HUMAN ends of the refund ladder, which were the only parts of SC#2's "named cancellation policy tier" still missing.** Everything downstream of the tier name already shipped (the D-68 ladder in 07-03, the creation-time snapshot in 07-08, the quote and cancel screen in 07-09); before this plan the tier was an invisible column that silently decided how much money a booker got back, because no host ever chose it and no booker ever saw it. **Host side (D-77):** the editor wizard gains a seventh step — three tier cards cloned from the Step-5 booking-mode RadioGroup with **no card pre-selected**, all three at equal weight, selection marked by neutral `border-primary` and no coral, deliberately breaking the D-62 precedent of defaulting to the most booker-friendly option because the tier governs real money. The requirement joins the **shipped** publish checklist rather than inventing a blocked affordance (`publishEligible = checklist.every(c => c.done)` picks it up with no other change, and the existing "Almost there" panel renders it with its Fix link like every other unmet row). The gate is **not** the checklist: `publishSchema` now requires the enum and `publishListing` re-reads it from the **persisted row**, so a stale client, a client that skipped the step, or a crafted call all hit the same named calm refusal (T-07-88). `draftSchema` stays permissive, which is what keeps pre-Phase-7 NULL-tier drafts saveable instead of stranded (proven). **Booker side (D-81):** one `CancellationPolicyDisclosure` Server Component using native `<details>` — no accordion/collapsible is installed, and `<details>` needs zero new blocks and zero client boundary — mounted generic on the listing page (rungs relative to session start) and concrete at checkout (venue-local dates for THIS booking, derived server-side from `rungBoundaries` and formatted by the existing `composeDeadlineLabel`, so no fifth time format exists). Checkout discloses from the **booking's tier snapshot**, not the listing's current tier — the same column `quoteRefund` reads — so a host retiering mid-flight cannot move terms the booker already saw (T-07-90). The non-refundable service-fee line is unconditional in both modes at every tier, including Flexible where a booker is most likely to assume everything comes back (C2). **The load-bearing property — disclosure equals enforcement — is proven, not asserted:** every percentage, hour figure and rung ordering in the copy is DERIVED from `LADDER`, and the claim was mutation-verified in BOTH directions — moving a rung (24h→36h) left cases (7)–(11) green because the copy followed automatically and reddened only the deliberately-hardcoded boundary case, while hand-typing one interpolated figure reddened case (7) immediately. Case (10) closes the loop against `quoteRefund` itself: at every boundary the disclosure renders, standing exactly ON it awards the promised rung and one millisecond later awards the next one down. **NULL-tier behaviour decided and documented:** the disclosure renders NOTHING rather than falling back to `tierOrDefault`'s Flexible — that fallback is an internal safety net so the refund ENGINE never faces an unpriceable legacy row, not a policy any host chose, and presenting it would put a promise in the host's mouth they never made; showing nothing is the conservative failure since the booker is never told terms that differ from the ones applied and the fallback they would actually receive is the most generous rung. `policyDisclosureLines` THROWS on a boundary-label/rung length mismatch rather than rendering dates from the wrong tier. Two shipped fixtures (`status-gate`'s VALID_FIELDS, `listing-schema`'s validPublish) described themselves as publish-eligible and no longer were — both updated with a comment recording why, plus a new negative case asserting an absent AND an unrecognised tier are rejected while draftSchema stays permissive. 11 new integration/derivation cases + 1 schema case. tsc + eslint clean; `next build` exit 0 with the documented env placeholders; full suite **76 files / 628 tests, exit 0** (was 75/616). Commits 53ce7ac/14dd0f5/05d719d/926517c)
- [x] 07-16-PLAN.md — QRPh refund path (gated on the settling probe) (COMPLETE — **the gating question is SETTLED BY OBSERVED API BEHAVIOUR, and Branch B is built.** The 2026-07-23 test-mode probe (human-paid QRPh checkout `cs_809b1190ba4c3d44b7a77cdc` → payment `pay_ru6sXqhRJto1NW3T83cqak4q`) returned **HTTP 400 "Refunds are not allowed for payments with source type qrph."** on `POST /v1/refunds` — outcome-matrix row 1, VERDICT `confirmed`, D-58 stands; the raw bodies, ids and date are recorded verbatim in `refund-rail.ts`, replacing the "MEDIUM-HIGH, docs are 404" hedge. **A3 is BLOCKED, not settled:** `GET /v2/wallets` returns zero wallets and the Money Movement endpoints 404 on this account until PayMongo enables the feature — recorded with evidence, flagged for manual UAT, and the documented stable-`Idempotency-Key` + per-attempt rotating `reference_number` design kept exactly. The D-72 workstream ships: `createRefundTransfer` (a SEPARATE export, never an overload of the payout signature) POSTs InstaPay transfers under the **`refund:` idempotency namespace** — `payout:` untouched, both grep-asserted at exactly one occurrence (Pitfall 10) — with an `INSTAPAY_CEILING_CENTS` (₱50,000) guard that routes an over-ceiling refund to `needs_attention` instead of firing a doomed transfer; `listReceivingInstitutions()` feeds both the form's institution Select and the server-side BIC allow-list (T-07-99, never a free string). `cancelBookingAsBooker(bookingId, destination?)`: shape-validated at entry and BIC-verified BEFORE the flip (so a booking is never cancelled with an undeliverable destination), transfer fired only inside the owner-gated flow on the row just flipped for the SERVER-frozen `quote.totalRefundCents`, no silent same-reference retry, and ONLY `transferId` + a masked last-4 survive (audit meta) — **no account number, name or BIC in any table, audit line, notification payload or log line**, proven by row-scan + log-scan tests against a failure fixture whose provider error deliberately echoes the destination back (the transfer-failure catch logs no error content for exactly this reason). The one-refund-per-payment assumption at `createRefund`'s payment-scoped key is now explicit (comment + a test where a second refund for the same payment replays the first response — safe today, a visible trap for any future top-up flow). At runtime the destination form degrades calmly to the operator seam while Money Movement is disabled (the live 404); the cancel page falls back to plain CancelConfirm with honest copy. Owner gate mutation-verified (predicate removed → case 7 red on the byte-exact denial → restored). 9 instapay cases + 2 refund-contract cases; tsc/eslint/`npm run build` clean; full suite **78 files / 639 tests, exit 0** (was 76/628). Commits 3fa3156/81dd608)
- [x] 07-17-PLAN.md — Gap closure (wave 6): CR-01/CR-02/WR-04/WR-06 (COMPLETE — all four user-approved verification/review findings closed red-first with content-pinning regressions: amount-keyed refund-notice suppression + toast branch (CR-01); row-derived D-96-capped payByLabel/respondByLabel rendered by the request-approved/new-request emails, request-received states NO number, APPROVAL_* constants renderer-free in email.ts (CR-02); `side`-discriminated booking_cancelled_by_host with feeLabel + new sendHostCancellationRecord, booker copy and durable pre-fix rows byte-unchanged (WR-04); persisted `booking.full_day` snapshot via drizzle/0016 read by re-request — an hourly-rate edit can no longer reprice an hourly re-request at the day rate (WR-06). Full suite 78 files / 655 tests exit 0; tsc clean; env-prefixed build green. 8 commits 6f887c3..c46f2cf)
- [x] 07-18-PLAN.md — UAT gap closure (wave 7): host /host/bookings row link to detail (T6, SC#3 reachable) + cancelled_by-aware status/derivation so a booker-cancelled request reads "Cancelled" and a truthful landing, not host-decline copy (T8)
- [x] 07-19-PLAN.md — UAT gap closure (wave 7): checkout policy summary leads with the best still-future refund rung, never a lapsed one (T4-rung) + placeHold suppresses duplicate host notifications on idempotent replay (T11)
- [x] 07-20-PLAN.md — UAT gap closure (wave 7): discoverable Availability link on the Your-listings card (T4-hours) + formatMoney pinned to 2 decimals (T7) + human copy for the host-cancellation block label (T9)

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

**Plans**: 20 plans (9 original + 8 gap-closure after `gaps_found` verification + 3 gap-closure after the 08-17 UAT double-charge)
Plans:
**Wave 1**

- [x] 08-01-PLAN.md — Schema foundation: booking_group + rsvp tables, occupancy_mode/rsvp_status enums, pax columns + migration 0017 [BLOCKING]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 08-02-PLAN.md — Seat-claim + invite token + the GROUP-05 acceptance-gate race test (red-first, mutation-verified)
- [x] 08-03-PLAN.md — Pax pricing backend: quoteWindow surcharge (D-108) + placeHold declaredPax, folded into spacePriceCents (A1)
- [x] 08-04-PLAN.md — Notifications: four-file group types + email-only guest Inngest fn + migration 0018 [BLOCKING]

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 08-05-PLAN.md — Pax pricing UI: PaxStepper + surcharge breakdown line + wizard fields + the persisted-fullDay fix
- [x] 08-06-PLAN.md — Group actions + lifecycle: createGroup/submitRsvp/removeAttendee/regenerateLink + D-117 opt-in guard + cancel auto-void

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 08-07-PLAN.md — Organizer management RSC + entry point + roster/headcount/share + top-up nudge
- [x] 08-08-PLAN.md — Public /invite/[token] RSVP route + guest-or-login form + confirmation

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 08-09-PLAN.md — Human-verify checkpoint: cross-session guest RSVP + real email + GROUP-05 mutation-verify

**Wave 6** *(gap closure — 08-VERIFICATION.md `gaps_found` + 08-REVIEW.md)*

- [x] 08-10-PLAN.md — CR-03: clamp declaredPax to the listing's maxOccupancy inside createPendingHold + a .max() schema bound
- [x] 08-11-PLAN.md — CR-04: bound the rate-limit store and resolve the invite token before charging a token-keyed budget
- [x] 08-12-PLAN.md — CR-02 (1/2): booking.checkout_session_id + migration 0019 [BLOCKING] + expireCheckoutSession
- [x] 08-16-PLAN.md — Deferred item 4: race the REAL claimSeat so the shipped FOR UPDATE has mutation coverage

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 08-13-PLAN.md — CR-02 (2/2): persist the session id in confirmBooking; expire-before-refreeze in updateDeclaredPax
- [x] 08-14-PLAN.md — WR-03/WR-04: reserve the organizer's seat in capacity_snapshot; one organizer-inclusive convention on the organizer surface

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 08-15-PLAN.md — CR-01: composeWhenLabel reads the persisted booking.full_day; thread it through all 18 call sites

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 08-17-PLAN.md — Human-verify checkpoint: the pax-pricing surcharge walkthrough 08-09 skipped (extra_head_fee now configured)

**Wave 10** *(gap closure — 08-17 UAT double-charge: deferred items 5/6/7)*

- [ ] 08-18-PLAN.md — Item 5 (fix): confirmBooking expire-before-create (mirror updateDeclaredPax) + correct the 3 false idempotency comments + mutation-proven DB regression
- [ ] 08-20-PLAN.md — Item 7: publishSchema rejects included >= maxOccupancy when extraHeadFee > 0 (unreachable surcharge) + wizard relationship copy

**Wave 11** *(blocked on Wave 10 — 08-18)*

- [ ] 08-19-PLAN.md — Items 5+6 (real-API proof): getCheckoutSession + a gated sk_test_ PayMongo test — duplicate POSTs mint different sessions, expire retires, re-price supersession

**UI hint**: yes

### Phase 9: Open-Capacity Bookings

**Goal**: A host can list a space in **open / common-use** mode where many independent bookers share one time slot up to a capacity cap — the drop-in gym, the host-run open court — instead of one exclusive lock. Each visitor books and pays for their own head(s) on the **existing single-payer rail** (no cost-splitting, no multi-payer); the genuinely new work is a **capacity-counter availability model** that safely admits N concurrent bookings on the same slot up to the cap, replacing the GiST exclusion constraint for these listings. Because that is a count-then-insert seat-claim on the money path — the exact anti-pattern the exclusion constraint was built to avoid — it needs its own concurrency-correct design (materialized seat-claim via `UNIQUE`, an advisory lock, or a serializable transaction), proven under a genuine concurrent-overbook race before it ships. This is the **second host-set occupancy mode** (the first, exclusive, is Phase 8's basis). Deferred as separate future work: organizer-driven open play / cost-split (GPAY-01), which keeps the exclusion constraint and builds on Phase 8's RSVP shell.
**Depends on**: Phase 8 (reuses the host-set `occupancy_mode` column Phase 8 introduces — default `exclusive` — and adds the `open_capacity` mode + its booking path). Also reaches back into Phase 2 (host picks occupancy mode + sets per-head capacity pricing) and Phase 4 (search/availability shows remaining capacity, not just free/taken).
**Requirements**: OPEN-01, OPEN-02, OPEN-03, OPEN-04
**Success Criteria** (what must be TRUE):

  1. A host can publish an open-capacity listing with a per-head price and a capacity cap (occupancy mode set on the listing)
  2. Multiple different bookers can each reserve their own spot on the same time slot until the cap is reached, each paying only for their own head(s) via the existing rail
  3. The (cap+1)-th concurrent booking is rejected atomically at the database level with no overbooking — proven under a genuine concurrent race (analogous to Phase 3 SC#4 for exclusive listings)
  4. Availability and search reflect remaining capacity (spots left), not merely free/taken

**Plans**: 16 plans in 7 waves
Plans:
**Wave 1**

- [x] 09-01-PLAN.md — Schema (occupancy_mode += open_capacity, listing.per_head_price_cents, booking.open_capacity) + 3 hand-authored migrations (55P04 split + EXCLUDE narrowed to open_capacity=false) + [BLOCKING] db:migrate + D-123..D-126

**Wave 2** *(blocked on Wave 1 completion — the live enum value + narrowed EXCLUDE)*

- [ ] 09-02-PLAN.md — The capacity claim: shared open-capacity module (one occupying SUM, OC-03 day window, OC-11 threshold) + quoteOpenCapacity + createOpenCapacityHold under pg_advisory_xact_lock
- [ ] 09-06-PLAN.md — Mode-forked publish gate (per-person price + daily cap, instant-only, single-unit, no group pricing) + the OC-17 mode lock enforced server-side
- [ ] 09-08-PLAN.md — composeWhenLabel gains a REQUIRED openCapacity field — compiler-driven census across 13 call sites (a drop-in pass is never a 16-hour reservation)

**Wave 3** *(blocked on Wave 2 completion; 09-07 additionally ordered after 09-08's compiler census)*

- [ ] 09-03-PLAN.md — **The SC#3 acceptance gate** — two-layer concurrent-overbook race against the SHIPPED claim + the Pitfall-1 EXCLUDE test + both lock-deletion mutations
- [ ] 09-04-PLAN.md — Read-model spots-left fork (remaining/cap/server-derived state) + month fully-booked map + public read actions
- [ ] 09-07-PLAN.md — placeOpenHold + both cross-mode refusals + D-126 step-up refusal + the unchanged payment-paid webhook proof
- [ ] 09-09-PLAN.md — Cancellation: host-cancel skips the anti-resell auto-block for drop-in bookings (Pitfall 5) + three copy forks
- [ ] 09-10-PLAN.md — Host wizard: the occupancy step, mode-forked pricing + checklist, removed-and-explained booking-mode step, the OC-17 lock notice
- [ ] 09-11-PLAN.md — SpotsLeftChip + DropInBadge + PaxStepper split into a presentational control and two bindings (pre-hold pass stepper)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 09-05-PLAN.md — Search: /person all-in rate, Stage-1 effective-price filter+sort fix, Stage-2 spots-left branch (ignores the time window)
- [ ] 09-12-PLAN.md — DatePassPicker (month grid + day panel, no hour chips) + calendar fork + open rail + BookCta open branch
- [ ] 09-13-PLAN.md — Reserve page: per-person breakdown + the OC-07 partial-grant alert with both server-computed figures

**Wave 5** *(blocked on Wave 4 — needs 09-05's search row + 09-11's chip)*

- [ ] 09-14-PLAN.md — Search card (Drop-in badge, /person, never a time range, date-only link) + host listing card

**Wave 6** *(blocked on Wave 5 — full-stack gate over every prior wave)*

- [ ] 09-15-PLAN.md — E2E two-booker shared-date decrement + sold-out, then the full repository gate and the validation map

**Wave 7** *(blocked on Wave 6 — checkpoint, `autonomous: false`)*

- [ ] 09-16-PLAN.md — Human walkthrough against the live PayMongo sk_test_ rail (9 separately-confirmed steps)

  **Waves:** W1 (09-01) → W2 (09-02, 09-06, 09-08 — parallel) → W3 (09-03, 09-04, 09-07, 09-09, 09-10, 09-11 — parallel) → W4 (09-05, 09-12, 09-13 — parallel) → W5 (09-14) → W6 (09-15) → W7 (09-16, human-verify checkpoint). Zero `files_modified` overlap within any wave.

  **Cross-cutting constraints** (invariants spanning ≥2 plans — every executor must hold these):

    - **The DB is the sole overbook arbiter** — `pg_advisory_xact_lock` is the first in-transaction statement and is held across SUM → INSERT in ONE transaction; never an app-level count-then-insert (09-01, 09-02, 09-03, 09-07).
    - **One occupying-SUM predicate, imported not copied** — the claim and the read model share the same SQL fragment so `remaining` can never drift from what the claim counts (Pitfall 4 — 09-02, 09-03, 09-04, 09-05).
    - **Freed seats need no worker** — `remaining` is a live SUM, never a stored counter, so a cancelled booking or a lapsed pending hold leaves the occupying set automatically (Pitfall 3 — 09-02, 09-03, 09-04, 09-09).
    - **Scarcity state is server-derived** (open / low / full) and rides on the payload; the client never re-derives the threshold and the chip is never red — "Fully booked" is a calm, normal state (OC-11 — 09-04, 09-05, 09-11, 09-12, 09-14).
    - **A drop-in booking is a DAY PASS with an entry window, never a sixteen-hour reservation**, on every surface that names a time — enforced by `openCapacity` being a REQUIRED field on `WhenLabelInput` so a new surface cannot forget it (OC-03 — 09-08, 09-12, 09-13, 09-14, 09-15, 09-16).
    - **Head count is FIXED at hold time** — the capacity claim lives at hold, `updateDeclaredPax` refuses open bookings (D-126), and no pass stepper renders on the reserve page (09-07, 09-11, 09-13).
    - **Money is server-frozen with zero client arithmetic** — per-head × granted heads, no duration term; the same server-composed all-in rate drives both the browse card and the checkout breakdown (OC-02/OC-08, D-49/D-75 — 09-02, 09-05, 09-13).
    - **Race-loss copy is exactly `Just sold out — pick another date.`**, defined in exactly one place (OC-13 — 09-02, 09-07, 09-12).
    - **Exclusive and group surfaces stay byte-unchanged** — every fork adds a branch, it never replaces a shipped, UAT-passed surface (09-01, 09-04, 09-08, 09-11, 09-12).

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth & Accounts | 4/4 | Complete | - |
| 2. Listings & Host Onboarding | 6/6 | Complete (validated · secured · UAT passed) | 2026-07-10 |
| 3. Availability & Double-Booking Guarantee | 5/5 | Complete   | 2026-07-14 |
| 4. Booking Core & Search | 8/8 | Complete | 2026-07-15 |
| 5. Payments & Payouts | 7/7 | Complete (all 3 waves done — PAY-01/PAY-02/PAY-03/HOST-03; Wave 3 05-05b closed the Held→Processing→Paid/Failed payout lifecycle via the reconcile cron + mounted /api/inngest serving both crons; real PayMongo /v2 transfer + polling UAT-gated on beta enablement) | - |
| 6. Full Booking + Payment Integration | 10/10 | Gap G-06-01 closed in code (06-10) — re-UAT pending (re-run 06-09 with G-06-02's full /api/paymongo/webhook URL) | - |
| 7. Bookings Management, Cancellation & Notifications | 20/20 | Complete   | 2026-07-24 |
| 8. Group Bookings | 22/22 | Complete (double-charge BLOCKER + deferred items 5/6/7 closed by gap plans 08-18→08-22; money-path fixes proven against the real PayMongo sk_test_ API; verifier passed 5/5) | 2026-07-29 |
| 9. Open-Capacity Bookings | 1/16 | Executing (Wave 1 done — DDL live: enum value, both columns, EXCLUDE narrowed to open_capacity=false; Wave 2 unblocked) | - |
