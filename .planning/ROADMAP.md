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
- [ ] **Phase 6: Full Booking + Payment Integration** - Instant-book capture vs request-to-book pay-on-approval (no charge until host approves), host approve/decline, confirmation
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
  - [ ] 06-10-PLAN.md — Wave 7 (gap-closure, G-06-01): parseSignature widened to accept real te-XOR-li PayMongo signatures (te in TEST/empty li, li in LIVE/empty te) — was requiring all 3 of t/te/li → 400 on every real webhook, blocking the D-57 confirm authority (PAY-05/BOOK-06/BOOK-04 confirm). One-predicate fix `if (!parts.t || (!parts.te && !parts.li)) return null;` + tolerant return; verifySignature already skips empty candidates. Regression tests add the real single-mode signature shape (te-only + li-only confirm a booking; both-empty still 400s) — closes the both-populated fixture gap that let it through. verifySignature/handleGoneSlot (D-58)/handleRefund/dedupe untouched. G-06-02 (register webhook at full /api/paymongo/webhook path) recorded as a re-UAT precondition.
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
| 1. Auth & Accounts | 4/4 | Complete | - |
| 2. Listings & Host Onboarding | 6/6 | Complete (validated · secured · UAT passed) | 2026-07-10 |
| 3. Availability & Double-Booking Guarantee | 5/5 | Complete   | 2026-07-14 |
| 4. Booking Core & Search | 8/8 | Complete | 2026-07-15 |
| 5. Payments & Payouts | 7/7 | Complete (all 3 waves done — PAY-01/PAY-02/PAY-03/HOST-03; Wave 3 05-05b closed the Held→Processing→Paid/Failed payout lifecycle via the reconcile cron + mounted /api/inngest serving both crons; real PayMongo /v2 transfer + polling UAT-gated on beta enablement) | - |
| 6. Full Booking + Payment Integration | 8/9 | In Progress|  |
| 7. Bookings Management, Cancellation & Notifications | 0/TBD | Not started | - |
| 8. Group Bookings | 0/TBD | Not started | - |
