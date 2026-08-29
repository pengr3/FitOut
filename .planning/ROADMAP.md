# Roadmap: FitOut

## Overview

FitOut delivers a two-sided fitness-space marketplace where the core transaction — search for a space, see real availability, reserve a slot, pay, and have the host paid out minus commission — is both the value proposition and the hardest engineering problem. **v1.0** followed a strict dependency-driven order that all research independently converged on: identity before supply, supply before availability, and the database-enforced double-booking guarantee proven correct **before** any money touched the system.

**v1.1 is a value-layer insertion, not a rebuild.** Every v1.0 capability works and is proven; none of them look finished. v1.1 puts a single token contract between "what a component asks for" and "what colour and size it gets," across all nine shipped phases — so locking real branding later is a token edit rather than a component sweep. Its ordering is dictated by two facts research measured rather than assumed: several of the quality gates this milestone declares **already fail today, before any new work**, and every one of those defects invalidates any visual baseline captured before it is fixed. So the foundation phase fixes the shipped defects and ships the second theme *with* the first, the gate machinery is made capable of failing *before* the first surface is touched, and the cross-cutting audit is a closing proof rather than a rewrite. Two net-new capability items (search map, availability copy-to-all) ride the milestone in their own phases so the polish scope stays honest (D-136).

## Milestones

- ✅ **v1.0 MVP** — Phases 1–9 (shipped 2026-08-11)
- 🚧 **v1.1 Front-End Polish & Placeholder Design System** — Phases 10–19 (75 requirements)

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)
- 999.x: Backlog — unsequenced, outside the active phase sequence

**Numbering continues across milestones.** v1.0 ended at Phase 9, so v1.1 starts at Phase 10.

<details>
<summary>✅ v1.0 MVP (Phases 1–9, 107 plans) — SHIPPED 2026-08-11</summary>

- [x] **Phase 1: Auth & Accounts** (4/4 plans) — verified 2026-06-03 — single account with booker + host capabilities, sessions, password reset, basic profile
- [x] **Phase 2: Listings & Host Onboarding** (6/6 plans) — completed 2026-07-10, verified 2026-08-01 (retroactively — the milestone audit's one blocking finding) — hosts create/edit listings with photos, pricing, booking mode; PayMongo onboarding gates bookability
- [x] **Phase 3: Availability & the Double-Booking Guarantee** (5/5 plans) — completed 2026-07-14 — availability rules, real-time calendar, and the DB exclusion constraint that makes overlaps structurally impossible
- [x] **Phase 4: Booking Core & Search (no payment)** (8/8 plans) — completed 2026-07-15 — two-phase slot hold + state machine + expiry worker, plus geo/activity/date/price search
- [x] **Phase 5: Payments & Payouts** (7/7 plans) — verified 2026-07-16 — PayMongo hosted-checkout charge, host-side commission, hold-until-session delayed payout, webhook-as-source-of-truth, refund mechanism
- [x] **Phase 6: Full Booking + Payment Integration** (10/10 plans) — completed 2026-07-20 — instant-book capture vs request-to-book pay-on-approval, host approve/decline, confirmation
- [x] **Phase 7: Bookings Management, Cancellation & Notifications** (20/20 plans) — completed 2026-07-24 — My Bookings both sides, cancellation/refund policy tiers, transactional email layer
- [x] **Phase 8: Group Bookings** (22/22 plans) — completed 2026-07-29 — organizer wraps a paid booking, invites via link/email, attendees RSVP, headcount validated against capacity
- [x] **Phase 9: Open-Capacity Bookings** (25/25 plans) — completed 2026-08-01 — host-set open/common-use mode: many independent bookers share one slot up to a capacity cap, each paying per head on the existing rail

**Full phase details** (goals, success criteria, plan lists, waves, cross-cutting constraints):
`.planning/milestones/v1.0-ROADMAP.md`
**Requirements** (49/49): `.planning/milestones/v1.0-REQUIREMENTS.md`
**Audit:** `.planning/milestones/v1.0-MILESTONE-AUDIT.md`

</details>

### 🚧 v1.1 — Front-End Polish & Placeholder Design System (Phases 10–19)

- [x] **Phase 10: Design-System Foundation & Theme Runtime** - One token contract, two themes, and the shipped defects fixed before a single baseline is shot (completed 2026-08-12)
- [x] **Phase 11: Quality Gates, Pattern Layer & App Shell** - Make the gates capable of failing, seed the shared patterns, and give the app a real header, footer and state families (completed 2026-08-17)
- [x] **Phase 12: Booker Path — Search → Listing → Checkout** - The route from an empty search box to the payment redirect reads as one designed product
 (completed 2026-08-19)

- [ ] **Phase 13: Confirmation, Bookings & Trust** - After paying, a booker sees exactly what they bought, where their money is, and what happens next
- [x] **Phase 14: Host Tooling** - A host opens FitOut and sees what they owe today, in the same product the booker sees (completed 2026-08-23)
- [x] **Phase 15: Auth, Profile & Transactional Email** - The first screens a new user sees, and every email FitOut sends, carry the app's identity (completed 2026-08-25)
- [x] **Phase 16: Image Crop & Framing** - A user controls how their image is framed before it is committed
- [x] **Phase 16.1: Upload Hardening & Storage Economy (INSERTED)** - What a host uploads is bounded, is what it claims to be, and costs what it should to serve (all 7 plans executed 2026-08-28) (completed 2026-08-28)
- [ ] **Phase 17: Cross-Cutting Audit — Themes, Responsive, A11y & Baselines** - The gates stop being per-phase promises and become the milestone's closing proof
- [ ] **Phase 18: Search-Results Map** - A booker can see where the results are, not just what they are (net-new capability, D-136)
- [ ] **Phase 19: Availability Copy-to-All** - A host copies one day's hours across days instead of re-entering them (net-new capability, D-136)

## Phase Details

### Phase 10: Design-System Foundation & Theme Runtime

**Goal**: Branding lives in exactly one place, the app finally renders in its own typeface, and every token pair a surface uses clears the bar this milestone declares — all before a single visual baseline exists.
**Depends on**: Nothing (first phase of v1.1; v1.0 is shipped)
**Requirements**: DS-01, DS-02, DS-03, DS-04, DS-05, DS-06, DS-07, DS-08, DS-09, DS-10, DS-12, DS-13, DS-14, THEME-01, THEME-02, THEME-03, THEME-04, THEME-05
**Success Criteria** (what must be TRUE):

  1. The app renders as FitOut rather than as a scaffold — every surface is in Geist because the `--font-sans` self-referential cycle at `globals.css:10` is fixed, and the browser tab, metadata and favicon are FitOut's rather than `Create Next App`'s.
  2. A user can switch between **two** visually distinct named themes and every screen re-skins — colour, type scale, spacing, radius, elevation, motion, button hierarchy and status vocabulary — with **zero component edits**.
  3. Two themes render side by side in nested `[data-theme]` subtrees on one page, so a brand direction can be compared on real screens rather than on swatches.
  4. Every colour pair actually used on a surface clears WCAG AA under **both** themes — including the coral CTA label (3.60:1 today), the success badge (3.24:1) and the focus ring (2.58:1 as a pair, ~1.54:1 as rendered) — proven by a test that fails the build; the focus indicator is visible on every control; and a user who has asked for reduced motion gets none.
  5. No raw hex, `rgb(`, `oklch(` or arbitrary `text-[NNpx]` survives anywhere under `src/components/**` or `src/app/**` — the build fails on one — and the only sanctioned duplicate of a token value is a generated module checked for drift, closing the shipped `BRAND_CORAL = "#E8484E"` vs `#ef4445` mismatch at `listing-map.tsx:22`.

**Plans**: 17 plans (14 waves)

Plans:
**Wave 1**

- [x] 10-01-PLAN.md — Design-gate infrastructure — culori, the DB-free vitest.design config, and the test:design script

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 10-02-PLAN.md — Shared gate primitives — the one leak-pattern list, the globals.css token parser, and the compile-CSS helper

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 10-03-PLAN.md — The colour contract — DS-01 font cycle, the court and grove theme blocks, and the 29-pair AA proof

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 10-04-PLAN.md — Type scale, 3-step elevation, 4-step z, the motion budget and the global reduced-motion reset
- [x] 10-05-PLAN.md — Theme runtime — the mounted provider, FitOut identity metadata, the Sonner mapping and both override paths

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 10-06-PLAN.md — The Button CVA contract — the brand variant, the touch size, and the one solid focus recipe

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 10-07-PLAN.md — Every remaining 50%-alpha focus ring removed (14 sites / 15 files, not the 12 estimated), pinned by the DS-05 source-scan gate — **DS-05 complete**
- [x] 10-08-PLAN.md — 15 booker, group and search Button call sites converted onto variant="brand"

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 10-09-PLAN.md — The 5 host conversions, the availability color-mix hovers, and the closed 20 / 9 DS-08 gate

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 10-10-PLAN.md — Status vocabulary — one closed four-tone union, and green retreats to the icon

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 10-11-PLAN.md — The 14 arbitrary text-[NNpx] sizes onto the named type steps
- [x] 10-12-PLAN.md — The 14 shadow call sites collapsed onto three named elevation steps

**Wave 10** *(blocked on Wave 9 completion)*

- [x] 10-13-PLAN.md — The 23 raw z-index values mapped onto the four-step scale

**Wave 11** *(blocked on Wave 10 completion)*

- [x] 10-14-PLAN.md — Palette-class rewrite and the dark: strip, with the vendored 56 pinned as a test

**Wave 12** *(blocked on Wave 11 completion)*

- [x] 10-15-PLAN.md — Generated token module, themed favicons, and the scaffold residue deleted

**Wave 13** *(blocked on Wave 12 completion)*

- [x] 10-16-PLAN.md — /dev/theme — two themes side by side in nested subtrees, on real components

**Wave 14** *(blocked on Wave 13 completion)*

- [x] 10-17-PLAN.md — Turn the gates on — the leak rule, the pair-drift check, and a build that actually goes red

**UI hint**: yes

**Ordering invariants this phase carries (non-negotiable, each a researcher finding):**

- **DS-01 lands before ANY visual-regression baseline is captured.** Fixing the font cycle changes the rendered typeface of every screen; every baseline shot before it is invalid. Three of four researchers stated this independently.
- **THEME-02/03 ship HERE, not in the audit.** The second theme is D-128's enforcement test, not a feature (D-133; 4-of-4 researcher convergence). Every surface built before a second theme exists is unverified, and deferring it turns Phase 17 into a rewrite phase. *The invariant **held**: grove shipped in Phase 10, and that is what made the token contract checkable at all. D-138 (2026-08-23) changes grove's STATUS — from candidate brand direction to token-contract probe — **after** that, and changes nothing about what this completed phase did or was right to do.*
- **DS-05/DS-06 land HERE**, before fifty surfaces are built on values that fail the gate.
- Three research decision items are **already settled** and must not be reopened at planning: the focus ring is a darkened neutral (D-132, *not* `--ring = --brand`); the `dark:` strip is the 10 app-code occurrences rewritten into tokens with the 56 vendored ones left inert (D-129 as amended, = THEME-05); the theme count is two (D-133). *D-133's count still stands at two — **D-138 changes what the second one IS (a token-contract probe, never a shippable brand direction), not how many there are.***
- Still genuinely open and flagged by research: the **exact** corrected `--brand` value (STACK's `#da2d34` vs PITFALLS' `#d33a3c`) needs a live-tool re-verification during this phase rather than an average of the two. The `culori`-based contrast test, once it exists, is the authority — not either document's hand-picked table.

### Phase 11: Quality Gates, Pattern Layer & App Shell

**Goal**: Every later phase inherits gates that can actually fail, patterns it uses rather than grows, and an app shell that already has a header, a footer and all four state families — instead of inventing its own.
**Depends on**: Phase 10 (baselines shot before the tokens are final are all invalid)
**Requirements**: DS-11, STATE-01, STATE-02, STATE-04, SHELL-01, SHELL-02, SHELL-04, RESP-01, GATE-01, GATE-04, GATE-05
**Success Criteria** (what must be TRUE):

  1. A CI run that finds no matching visual baseline **fails loudly** instead of writing one and reporting green; baselines exist only for the pinned Linux image, a Windows-generated one can never be committed, and a deliberate few-pixel shift goes red. (Today this gate is fail-open by construction — D-135.)
  2. A restyle cannot silently break the e2e specs that prove the double-booking guarantee: the structural-selector inventory exists and is checked, and a mutation that lets the (N+1)th booking succeed still turns the constraint spec **red**.
  3. The build fails if a money or availability computation crosses into a client component, and an end-to-end check asserts the price rendered in the DOM equals the price the database holds.
  4. Every data-backed route shows a designed loading state whose skeleton does not shift on arrival, every route group has an error boundary offering both a retry and a route out, a global error page and not-found pages exist, and every list surface has a designed empty state (2 of ~27 routes have a loading state today; zero have an error boundary).
  5. Every page carries a real FitOut header and footer — including `/`, `/listings/[id]`, `/listings/[id]/book` and `/invite/[token]`, which render no navigation at all today — a pasted listing or invite link renders a correct title, description and token-driven share image, and three named card patterns plus one mobile-overlay (sheet) primitive exist prop-complete so no later phase re-decides padding, radius, hover or how a mobile overlay behaves.

**Plans**: 22 plans (12 waves)

Plans:
**Wave 1**

- [x] 11-01-PLAN.md — GATE-05: `server-only` guards, the OBSERVED RED, and the two live D-130 violations fixed
- [x] 11-02-PLAN.md — GATE-04: the typed selector contract and the accessible-query floor
- [x] 11-03-PLAN.md — GATE-01: Playwright can never write a baseline; the platform rules are guarded

**Wave 2** *(blocked on Wave 1)*

- [x] 11-04-PLAN.md — CI from zero: jobs 1 and 2, and the first green run on 145 commits

**Wave 3** *(blocked on Wave 2)*

- [x] 11-05-PLAN.md — GATE-04: the constraint catalog assertion and the recorded (N+1)th-booking mutation
- [x] 11-06-PLAN.md — GATE-05: the DB-vs-DOM price-parity spec and CI job 3
- [x] 11-07-PLAN.md — The measurement inventory, the five contrast rows, and the three skeleton patterns

**Wave 4** *(blocked on Wave 3)*

- [x] 11-08-PLAN.md — The three card patterns and the page header
- [x] 11-09-PLAN.md — EmptyState, ErrorState, the mobile-overlay primitive and the asserted `--z-sheet` zero

**Wave 5** *(blocked on Wave 4)*

- [x] 11-10-PLAN.md — The app shell: route groups, site-chrome, the public compositions, the sticky offset
- [x] 11-11-PLAN.md — ResultCard and RowCard adoption across seven shipped card surfaces

**Wave 6** *(blocked on Wave 5)*

- [x] 11-12-PLAN.md — The `(app)`/`(host)` Suspense restructure, with both security gates still blocking
- [x] 11-13-PLAN.md — PanelCard adoption across five surfaces, and the card-coverage gate

**Wave 7** *(blocked on Wave 6)*

- [x] 11-14-PLAN.md — The footer, `src/lib/site.ts`, and the inverted support gate

**Wave 8** *(blocked on Wave 7)*

- [x] 11-15-PLAN.md — `/terms`, `/privacy` and the legalese source gate
- [x] 11-16-PLAN.md — EmptyState adoption: eight surfaces, positive inbox-zero, the border-dashed scope

**Wave 9** *(blocked on Wave 8)*

- [x] 11-17-PLAN.md — Twenty loading routes and the async-default coverage gate
- [x] 11-18-PLAN.md — Five error boundaries, global-error, and the SENTINEL leak probe
- [x] 11-19-PLAN.md — Three not-found routes and the invite-oracle parity gate

**Wave 10** *(blocked on Wave 9)*

- [x] 11-20-PLAN.md — Share and meta: three OG routes and two `generateMetadata` conversions

**Wave 11** *(blocked on Wave 10)*

- [x] 11-21-PLAN.md — `/dev/theme` sections 10–14, the shell measurement spec, and the 320px sweep

**Wave 12** *(blocked on Wave 11)*

- [x] 11-22-PLAN.md — GATE-01: the visual project, the dispatch job, the baselines, and the two OBSERVED REDs

**UI hint**: yes

**Ordering invariant:** **GATE-01, GATE-04 and GATE-05 must exist before the first surface-polish phase (Phase 12) starts.** Every later phase inherits whatever config exists when it begins, and a gate that has silently never failed is worse than no gate — it trains reviewers to trust a rubber stamp.

### Phase 12: Booker Path — Search → Listing → Checkout

**Goal**: The route from an empty search box to the payment redirect reads as one designed product, and never leaves a booker at a dead end.
**Depends on**: Phase 11
**Requirements**: BFLOW-01, BFLOW-02, BFLOW-03, BFLOW-04, BFLOW-05, BFLOW-06, BFLOW-07, STATE-03, STATE-07, SHELL-03, RESP-02, GATE-03
**Success Criteria** (what must be TRUE):

  1. A booker scanning search results reads each space's photo, title and price on one baseline without interacting, in the same unit checkout will charge.
  2. The listing page presents in the conventional marketplace order (gallery → title → key facts → description → availability → map → cancellation policy → host) with the desktop sticky rail preserved; photos are a hero grid opening a full-screen keyboard-pageable dialog rather than a carousel; the availability calendar's day cells are a real ≥44px target with a correctly-shaped loading skeleton and month changes inside the motion budget; and on a phone the price and a 44px booking CTA are reachable without scrolling.
  3. The price breakdown a booker sees in the listing rail is visually the same component at checkout, so they recognise it as the same fact, and the fee line explains itself on demand.
  4. Checkout is a single column on mobile with the summary behind a disclosure and a sticky confirm bar carrying the amount; its own minimal header holds the wordmark and the live hold countdown with no navigation that can silently lose an active hold; the countdown and every live status region announce to a screen reader **once** rather than per tick; and the booker is told the redirect is coming, and where they are going, before leaving for PayMongo.
  5. A booker who gets no search results, or whose slot is taken while they were choosing it, is offered real alternatives **in place** — the page names which constraint was relaxed, and a collision lands refreshed availability in the same paint as a calm result rather than an error.

**Plans**: 14 plans (12 waves)

Plans:
**Wave 1**

- [x] 12-01-PLAN.md — Inventories: measurements +7, the brand-30 exclusion, the D-57 gutter, the GATE-06 tripwire
- [x] 12-02-PLAN.md — Seam A: hoist the day-availability read; honour the searched window (D-59 #1)

**Wave 2** *(blocked on Wave 1)*

- [x] 12-03-PLAN.md — Seam C: `HoldProvider`, the checkout header countdown, the one way back

**Wave 3** *(blocked on Wave 2)*

- [x] 12-04-PLAN.md — Seam B: the widened `AllInTable` and the client `PriceBreakdown`

**Wave 4** *(blocked on Wave 3)*

- [x] 12-05-PLAN.md — The rail renders the real breakdown; the fee explains itself

**Wave 5** *(blocked on Wave 4)*

- [x] 12-06-PLAN.md — GATE-03: the `LIVE_REGIONS` inventory and the declared booker-path audit
- [x] 12-07-PLAN.md — BFLOW-03: the 5-up mosaic and the full-screen lightbox

**Wave 6** *(blocked on Wave 5)*

- [x] 12-08-PLAN.md — BFLOW-02: the conventional order, the key-facts strip, the host block, the `[11-13]` site

**Wave 7** *(blocked on Wave 6)*

- [x] 12-09-PLAN.md — BFLOW-05: the 44px calendar cell, the month-grid skeleton, the motion absence

**Wave 8** *(blocked on Wave 7)*

- [x] 12-10-PLAN.md — RESP-02 / D-48: `BookingPanel`, the sheet, the listing sticky bar

**Wave 9** *(blocked on Wave 8)*

- [x] 12-11-PLAN.md — BFLOW-06 / BFLOW-07: single-column checkout, the price disclosure, the PayMongo handoff

**Wave 10** *(blocked on Wave 9)*

- [x] 12-12-PLAN.md — STATE-03: the relaxation ladder, the band, the `relax=0` flag

**Wave 11** *(blocked on Wave 10)*

- [x] 12-13-PLAN.md — STATE-07: the collision, in place

**Wave 12** *(blocked on Wave 11)*

- [x] 12-14-PLAN.md — GATE-01: the Phase-12 visual baselines and the D-58 OG fixture *(checkpoint: human dispatch + the seven manual walks)* — **complete 2026-08-19: 52 baselines minted, comparison run 32271124959 watched green, all seven walks verified**

**Wave 13** *(gap closure, blocked on Wave 12; lands BEFORE 12-14 Task 3's dispatch)*

- [x] 12-15-PLAN.md — the CI comparison job's missing database: `gate-visual`, and one parse-based guard over both workflow files *(gap closure for `12-FINDING-ci-comparison-db.md`)*

**UI hint**: yes

**Scope note:** this phase holds all three D-130 restructure permissions (search results, listing detail, checkout) and the open-capacity date/pass picker, which is a pre-hold surface on the listing page. It is sequenced **first** among the order-independent set (12–15): it is the highest-risk surface (every money and availability seam runs through it) and it is where the Phase-11 pattern inventory gets its real stress test — a wrong pattern is cheaper to learn here than after three phases adopt it.

### Phase 13: Confirmation, Bookings & Trust

**Goal**: After paying, a booker can see — on screen and in the email — exactly what they bought, where their money is, and what happens next.
**Depends on**: Phase 11
**Requirements**: BFLOW-08, TRUST-01, TRUST-02, TRUST-03, TRUST-04, TRUST-05, STATE-05, STATE-06, STATE-08
**Success Criteria** (what must be TRUE):

  1. The first paint after payment is a distinct confirmation moment — success mark, status, reference, exact amount, venue-local time with named timezone, address, where the copy was emailed, and what happens next — which decays into the ordinary booking-detail page on later visits.
  2. Every booking detail page states its status **and what that status means**, the venue name and full address, venue-local time with a named timezone, who the host is, exactly what was paid itemised, the cancellation deadline as a concrete date with today's refund amount, and a support path — and shows only trust signals a real program stands behind (host since, listing published, payout onboarding complete, request-to-book behaviour), with no invented verification or superhost chrome.
  3. A booker can copy the booking reference — tabular figures, present on every status, carried in the email subject line — and can view and print an itemised receipt for a paid booking.
  4. A payment that did not complete, one still settling, and one reversed are three visibly different things: *not completed* states "you haven't been charged" and offers retry plus the alternative rails inline; *pending settlement* offers no error affordance at all while the webhook is still the outstanding authority; *reversed* makes an explicit money statement with a support path carrying the reference. Each states where the money is, in words, above the fold.
  5. Terminal success is a full-page moment and non-terminal success is a toast — and anything the user must actually read (a refund amount, a reduced headcount, a voided invite) is an in-page alert, never a toast.

**Plans**: 16 plans in 10 waves

Plans:
**Wave 1**

- [x] 13-01-PLAN.md — the booking shell constant, the nested-`<main>` fix, and the payment-state seed helper (Wave 1)
- [x] 13-02-PLAN.md — the shared domain pieces: MoneyStatement, the guarded SupportPath, BookingReference (Wave 1)
- [x] 13-03-PLAN.md — the D-84 PayMongo probe with an opt-in timeout, the verified refund windows, and the zero-migration / qrph pins (Wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 13-04-PLAN.md — the reversed state: two money truths, and it survives `?paid=1`'s removal (Wave 2)
- [x] 13-05-PLAN.md — STATE-08: a refund amount, a headcount and a voided invite leave the toasts (Wave 2)
- [x] 13-06-PLAN.md — the cancel review page's three items, and the email refund-window copy constant (Wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 13-07-PLAN.md — the net-new not-completed state and the pending state's promise (Wave 3)
- [x] 13-08-PLAN.md — the group surfaces' design-system pass, and nothing else (Wave 3)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 13-09-PLAN.md — the closed four-signal trust block and the post-payment address boundary (Wave 4)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 13-10-PLAN.md — the detail page across every status, plus the owner-safe not-found (Wave 5)

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 13-11-PLAN.md — the confirmation moment, and its decay (Wave 6)

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 13-12-PLAN.md — the receipt route, screen and print (Wave 7)

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 13-13-PLAN.md — the receipt parity, print-media and glyph-width proofs (Wave 8)
- [x] 13-14-PLAN.md — the live-region discharge and the countdown's rule-3 shape (Wave 8)

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 13-15-PLAN.md — the phase-wide surface gates and the eleven visual-baseline fixtures (Wave 9)

**Wave 10** *(blocked on Wave 9 completion)*

- [x] 13-16-PLAN.md — the baseline dispatch, the four manual-only walks, and the PARTIAL closes (Wave 10, checkpoints)

**UI hint**: yes

**Scope note:** this phase owns `/bookings/**` on the booker side plus the group surfaces (`/invite/[token]`, `/bookings/[id]/group`). Research treated group/open-capacity as a fourth parallel track; REQUIREMENTS.md defines **no separate REQ-IDs** for it, so a standalone phase would carry zero requirements. Folded here instead — `/invite/[token]` is a post-booking artifact and the open-capacity picker is a pre-hold listing surface (Phase 12). Stated as a deliberate departure from the research's phase shape, with the reason.

### Phase 13.1: Payment Reconciliation — a lost webhook must never mean a paid booker with no booking (INSERTED) ✅ COMPLETE 2026-08-22

**Goal**: A booker who paid always ends up with a booking. A lost webhook becomes a delay, never a silent loss.
**Depends on**: Phase 13
**Requirements**: TBD (no existing REQ-ID covers this — the milestone's requirements are front-end polish)
**Inserted**: 2026-08-21, after live UAT surfaced real paid-but-unconfirmed rows.

**WHY THIS IS URGENT — measured, not theorised.** Probing every `pending` booking that holds a
`checkout_session_id` against PayMongo on 2026-08-21 found **two where the customer's money was taken and
the booking never confirmed**:

| Booking | Paid at | Rail | Amount | DB status |
|---|---|---|---|---|
| `09f32400` | 2026-08-21 18:17 | GCash | ₱1,050.00 | `pending` |
| `408e054a` | **2026-08-18 02:32** | GCash | ₱2,100.00 | `pending` |

The second sat unnoticed for **three days**. Both are dev-experiment rows and are deliberately being
**left in place** as fixtures (PM decision, 2026-08-21) — FitOut is not live, so no real customer is
affected. On a live launch each would be a person who paid and received nothing, discoverable only by
their complaint.

**The structural cause.** `checkout_session.payment.paid` is treated as the sole *authority* on payment —
correctly, since a `?paid=1` URL is spoofable (PROJECT D-57) — but it was also made the sole *transport*.
Webhooks are lost routinely: an endpoint down during deploy, a network blip, a closed tunnel. When one is
lost the booking waits forever and nothing ever asks the provider.

⚠ **The asymmetry that names the gap:** `src/inngest/functions/payout-reconcile.ts` reconciles money going
**out** to hosts. **Nothing reconciles money coming IN from bookers.** We check what we owe, not what we
have been given.

**Success Criteria** (what must be TRUE):

  1. A booking that PayMongo records as paid **always** reaches `confirmed`, even if its webhook never
     arrives — reconciled on a schedule, not only when a human happens to be looking at the page.

  2. Reconciliation routes through the **same idempotent confirm path the webhook uses** — never a second
     one. A replayed webhook and a reconciliation of the same payment converge on one booking, one slot,
     one payout ledger row, one email.

  3. A missed webhook is **loud**: an operator alert records that a payment was taken without its webhook,
     so the transport failing is visible rather than absorbed.

  4. PROJECT D-57 is **unweakened** — the browser is still never trusted. A server-side probe of PayMongo's
     own API is as authoritative as the webhook (same source of truth, different transport); a URL
     parameter is not, and still confirms nothing.

  5. Reconciliation cannot double-charge, double-confirm, or resurrect a booking whose slot has since been
     taken — the D-58 gone-slot backstop still governs that case.

**Already built and reusable:** `probeCheckoutSession` (`src/lib/payments/checkout-probe.ts`, 13-03) —
server-only, bounded, resolves `null` on any failure, and returns the rail and `paid_at`. It is exactly
the call that found the two rows above. Nothing queries it on a schedule.

**Plans:** 5/5 plans complete

Plans:

- [x] 13.1-01-PLAN.md — extract D-105's single idempotent confirm path out of the webhook route, carry the `pay_...` off the provider read, and prove the guard by running confirm twice concurrently
- [x] 13.1-02-PLAN.md — the 5-minute reconciliation sweep (the guarantee): probe recent paid-but-unconfirmed bookings, confirm through the one path, alert on a missed webhook, no backfill
- [x] 13.1-03-PLAN.md — the fast path: one authenticated, rate-limited reconcile after the settling screen's poll cap, reusing the sweep's own body and adding no copy
- [x] 13.1-04-PLAN.md — close it at the source (D-113), the guarantee: the retire policy (probe-first, never expires a paid session, cannot throw) plus the 5-minute sweep that reaches every lapsed hold — proven against a real sk_test_ session
- [x] 13.1-05-PLAN.md — D-113 accelerant: wire the same policy into the three in-transaction lapse paths (both units.ts reclaims + request-expiry), post-commit, so a lapsed session dies in seconds rather than at the next tick

### Phase 14: Host Tooling

**Goal**: A host opening FitOut sees what they owe today and can act on it, in the same product the booker side became.
**Depends on**: Phase 11
**Requirements**: HFLOW-01, HFLOW-02, HFLOW-03, HFLOW-04, HFLOW-05
**Success Criteria** (what must be TRUE):

  1. A host lands on a "today" view — today's bookings, requests owed, payout state, and any published-without-hours signal — rather than a greeting and a CTA.
  2. A host can triage the requests inbox at a glance with the SLA countdown as the loudest element and approve/decline as the only actions; an empty inbox reads as *done*, not as broken.
  3. A host in the listing wizard sees a truthful step count across the occupancy fork, can navigate back from a clickable step rail, can see whether their work is saved, and sees the publish checklist as a persistent panel rather than as an end-of-flow surprise.
  4. The host bookings table and the availability editor read as the same product as the booker side, and the editor shows a week-at-a-glance preview of the hours just set.
  5. Earnings and payouts carry the new tokens with their structure untouched — HFLOW-05 is deliberately a token pass only, because those numbers have never been real (PayMongo `/v2` is sales-gated).

**Plans**: 16 plans in 9 waves

Plans:
**Wave 1**

- [x] 14-01-PLAN.md — the shared host shell constants, a skeleton that can carry a second declared height, and HFLOW-05's token pass behind an AST string-literal freeze
- [x] 14-02-PLAN.md — `queryHostAgenda`: the venue-local "today" predicate and D-142's next session from one owner-scoped statement, proved against a two-timezone straddling-midnight fixture
- [x] 14-03-PLAN.md — the countdown gains an opt-in lead emphasis and the request row goes terminal: money into the description list, decline onto the one overlay primitive, refusal into a named in-row region
- [x] 14-04-PLAN.md — `deriveWeekStrip`: the pure derivation the bars and the sentences both read from, seven entries for every input

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 14-05-PLAN.md — the agenda and signals components with their five declared hooks, and signal 1's copy given an owner beside the count's authority
- [x] 14-06-PLAN.md — the inbox becomes a triage queue: deadline-first columns, the shared shell and header, and "loudest" as a computed font-size comparison at three widths
- [x] 14-07-PLAN.md — `/host/bookings` gets the design system and not a new information architecture; the one raised element and every GATE-NOREG behaviour proved unmoved

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 14-08-PLAN.md — `/host` becomes a today view: one clock read and threaded, both accent call sites kept, a plate shaped like the page, and the three-consumer count as an e2e spec
- [x] 14-09-PLAN.md — the wizard's step rail becomes controls, visited by KEY across a mid-flow mode switch, with the accent narrowed to the current step and no pinned count moved

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 14-10-PLAN.md — the publish checklist becomes persistent, and the four inventories that pinned its done marker by file path move in the same commit

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 14-11-PLAN.md — the wizard's save state reads the actual server result, carries its sentence, and has no timer anywhere on the save path
- [x] 14-12-PLAN.md — the seven-column week strip, live from form state, and the hours editor that mounts it leaving the raw-card allow-list

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 14-13-PLAN.md — the blocks editor and the availability page finish the route, and the pattern layer's replaces-list is corrected rather than obeyed

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 14-14-PLAN.md — the live-region inventory renamed, widened to the host, taken to zero exclusions, and its non-empty guard rewritten so it still guards

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 14-15-PLAN.md — the three host row shapes measured against the rendered routes, declared, and committed to the skeleton geometry gate

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 14-16-PLAN.md — one heading per document, the 320px floor on all five surfaces, the alarm-token census as a pinned per-file map, and nine court-only baselines declared and honestly blocked

**UI hint**: yes

### Phase 15: Auth, Profile & Transactional Email

**Goal**: The first screens a new user ever sees, and every email FitOut sends, carry the same identity as the app — with no send trigger moved.
**Depends on**: Phase 11 (auth surfaces); EMAIL-02 depends on Phase 10's generated token module only
**Requirements**: AUTHUI-01, AUTHUI-02, AUTHUI-03, EMAIL-01, EMAIL-02, EMAIL-03
**Success Criteria** (what must be TRUE):

  1. Login, signup, forgot-password and reset read as the same product as the app and hold all five gates — 320px, keyboard, AA, designed loading/empty/error states, and a baseline.
  2. The profile page carries the design system, and a user can manage their avatar from it (the removal affordance itself is delivered by CROP-03 in Phase 16).
  3. Every existing send renders through **one** shared branded shell — 600px, single column, table-based, inline hex from the generated token module, a preheader, a text wordmark, a plain-text part — and not a single send trigger has moved.
  4. Swapping the app's theme changes the emails' colours too, because both read the same generated token contract; an email cannot be left behind by a theme swap.
  5. At least one of each send has been opened in **real** Gmail (web and Android), real Outlook desktop and Apple Mail — at least one in dark mode — and renders correctly.

**Plans**: 14 plans in 7 waves (three added 2026-08-25 by gap closure after verification returned `gaps_found` — see Waves 6-7)

Plans:
**Wave 1**

- [x] 15-01-PLAN.md — the product-theme name gets a pure owner, and `renderEmail` becomes the one choke point: one derivation, two projections, five escape sites, zero typed hex
- [x] 15-06-PLAN.md — `BRAND_CLASS` exported, `PanelCard.titleAs` widened by one member, and the `(auth)` layout rewritten into D-162's composition with the landmark in every state

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 15-02-PLAN.md — the two build-blocking shell gates: structure, html/text parity, no-URL-before-the-CTA, and the seven-hex set that a theme flip moves with the rendering
- [x] 15-07-PLAN.md — the four auth cards adopt the pattern and the document's h1, one coral each, two live regions demoted, and both pinned counts moved with their rows

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 15-03-PLAN.md — the transport gains a plain-text part and eighteen senders compose the shell, with the WR-02 guard and the trigger graph provably unmoved
- [x] 15-08-PLAN.md — `/profile` adopts `BOOKING_SHELL` and `PageHeader`, two panels around a save-state machine that does not move, and a plate that keeps ONE skeleton — `loading-coverage` AC#18 permits exactly one skeleton pattern per fallback, so the two-skeleton half of this line was refused by a gate the plan required unedited (15-08-SUMMARY § Deviations)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 15-04-PLAN.md — the ops digest wears the shell without losing either of its two contracts, one payload through every string parameter of all nineteen senders, and the footer's guarded site declared
- [x] 15-09-PLAN.md — seven live regions declared and the file count moved 21 → 26, plus the gate that makes "one composition, four screens" a command
- [x] 15-10-PLAN.md — the AUTHUI-02 design-pass gate, and the four auth routes and their two extra branches under the 320px floor

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 15-05-PLAN.md — the preview harness, the walk checklist, and EMAIL-03 handed to the operator with Outlook recorded as blocked rather than covered
- [x] 15-11-PLAN.md — two baseline rows edited, eight added, the alias moved 66 → 74, and the capture routed to the only workflow allowed to write a PNG

**Wave 6** *(gap closure — AUTHUI-03's two unsampled clauses)*

- [x] 15-12-PLAN.md — a recorded tab-order walk over all four auth screens and both form-replacing branches: the focus sequence written out, an indicator measured on every stop, and T-15-25 re-asserted with a mutation proving it can fail
- [x] 15-13-PLAN.md — the auth composition's ink-on-ground pairs measured in both themes as a build-blocking gate, closing pair-drift's documented cross-element blind spot for the D-162 wordmark-on-`bg-muted` surface

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 15-14-PLAN.md — the unfailable ops-digest assertion made failable in both projections (WR-04), AUTHUI-01 claimed by citing re-checked evidence, and the two validation rows AUTHUI-03's conjunctive text was never given (COMPLETE — **the phase's THIRD unfailable assertion is failable, and the validation map finally covers every clause AUTHUI-03 asserts.** WR-04 measured, reproduced and fixed: `renderOpsAlertDigest` hands its runbook sentence to `renderEmail` as a `paragraphs` entry and paragraphs are escaped STRUCTURALLY, so a re-added `<code>` wrapper arrives as `&lt;code&gt;` — never as the literal string case 11's only absence check named. **The red was watched in BOTH halves**: with the exact 15-04 wrapper re-added, the OLD line stayed green at `Tests 12 passed (12)` (that is the finding), while the two new assertions failed — html on the ENTITY form, and the `text/plain` twin on the LITERAL one, isolated in its own run because the html line short-circuits it. One `paragraphs` array, two projections, two independent failures. The audit-id positive control is kept and NAMED in the comment as the control for the line beneath it; the old literal-form assertion is kept with its claim corrected to what it can actually catch (raw markup through a future `tableHtml`-style pre-escaped slot). **The whole raw-tag set was classified BY MEASUREMENT, not by inspection** (M6 in the file's header): the grep re-run returns the same 8 assertions in 5 files, and two more mutations decided them — `escapeHtml` made the identity function reddened the injected-data set (`94 failed | 91 passed (185)`) with every raw payload present LITERALLY in the documents the failures quote back, while the two `text`-projection assertions stayed GREEN under it (the control); `tableText` pointed at `tableHtml` reddened `<td>` and put `<table border="1"` in the twin. A narrower variant reddened 402 and left 403 green — both failable, for DIFFERENT regressions, which is worth knowing before either is deleted. Verdict 8/8 failable; 7 already were. `tests/auth/email-escaping.test.ts` classified and left byte-identical (backlog 999.1's carried constraint). **AUTHUI-01 is claimed by exactly one plan, on evidence RE-MEASURED today rather than quoted** — no new implementation: the gate `auth-composition.test.tsx` 13 passed and build-blocking (`npm run build` exit 0, `test:design` 55 files / 1078 passed / 3 skipped); all four `(auth)/*/page.tsx` import `PanelCard` with ZERO raw Card elements; `BRAND_CLASS` greps 2 in `(auth)/layout.tsx` and 4 in `site-chrome.tsx` (both sides); `git ls-files` returns exactly **8** committed `auth-*` baselines; and `gh run view 32752143309` was re-fetched — 4/4 jobs green including `gate-visual`. **15-VALIDATION.md gained six rows** (`15-12-01/02` keyboard + T-15-25, `15-13-01/02` AA + T-15-29, `15-14-01` EMAIL-01, `15-14-02` AUTHUI-01), every Status watched exit 0 in-session rather than copied from the producing plan; the post-execution note is BYTE-IDENTICAL with a dated closure block appended beneath it. `deferred-items.md`'s keyboard/AA entry marked CLOSED with both plans, both artifacts and the measured facts, body intact; one new item logged (the audit's grep-shaped instrument cannot see `not.toMatch` forms). **`src/` is byte-identical**: every mutation reverted, `git diff --exit-code src/lib/email.ts` exit 0. tsc 0; `npm test` 181 files / 2037 passed / 5 skipped; build exit 0. AUTHUI-03 ADVANCED, deliberately NOT ticked — all five clauses are now sampled, but the tick is the re-verification pass's call. Commits 667f925/2c42c87)

**UI hint**: yes

**Departure from the research shape, with reason:** research listed the email shell as its own phase (G), parallel with everything from the moment the foundation lands. It is merged into the auth phase here because PITFALLS' own phase taxonomy already places the email shell inside **P-AUTH** (its risk table maps rows 14 and 15 — `escapeHtml` breakage and real-client rendering — to P-AUTH), and because three requirements do not justify a standalone phase at `standard` granularity. EMAIL-02's only dependency (DS-12) still lands in Phase 10, so nothing about the merge delays it. Execution is sequential on `dev` anyway (`use_worktrees: false`), so the "parallel set" is really an order-independent set.
**Constraint carried from backlog 999.1:** the verification and reset emails are **still out of scope** (AUTHFB-01/02 stay in the backlog). Do not introduce React Email or any new email stack (D-66); keep `escapeHtml()` on every interpolated URL; do not weaken `tests/auth/email-escaping.test.ts`.

### Phase 16: Image Crop & Framing

**Goal**: A user controls how their image is framed before it is committed, and the server stops re-framing what they just chose.
**Depends on**: Phase 14 and Phase 15 (touches `photo-uploader.tsx` on the host side and `profile-form.tsx` on the profile side — it collides with both rather than running parallel to them); Phase 11's responsive-dialog pattern
**Requirements**: CROP-01, CROP-02, CROP-03, CROP-04
**Success Criteria** (what must be TRUE):

  1. A user can pan and zoom their avatar to the framing they want **before** anything uploads, and what they framed is what is stored — the server's blind `gravity: "face"` re-crop no longer re-frames their choice.
  2. A user can remove their avatar (there is no way to unset one today).
  3. A host uploading listing photos sees, per photo, a non-destructive preview of what the 16:9 hero and the 4:3 cards each cut off — with nothing baked into the stored asset and no delivery-code change.
  4. Cropping works on a real touch device — drag, pinch and the slider, verified on hardware rather than in desktop touch emulation — and cancelling then re-picking **the same file** re-opens the cropper rather than dying silently.

**Plans**: 16 plans in 10 waves (planned 2026-08-25; worktrees are OFF, so they execute sequentially on `dev`)

Plans:
**Wave 1**

- [x] 16-01-PLAN.md — vendor the `slider` block, token-mapped on arrival; leak census 31 → 32
- [x] 16-02-PLAN.md — `src/lib/avatar.ts`: the copy literals, the four constants and `avatarMaxZoom` (+ the IC-05 arithmetic gate)
- [x] 16-03-PLAN.md — `responsive-dialog.tsx` gains ONE additive prop `onOpenAutoFocus`, proven default-inert
- [x] 16-04-PLAN.md — a committed zero-dependency generator and the eleven `e2e/fixtures/` images, drift-gated
- [x] 16-05-PLAN.md — D-165: the pure Cloudinary provenance validator, `persistPhoto` fails closed, 12 fixtures rewritten
- [x] 16-06-PLAN.md — CROP-02: `CoverFramePreview` (server-safe, imported ratio classes) mounted below the wizard grid

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 16-07-PLAN.md — the avatar server contract: `gravity: "center"`, both false comments corrected, `avatarFileSchema` narrowed
- [x] 16-08-PLAN.md — `react-easy-crop@^6.2.3` (the phase's one dependency) + `src/lib/avatar-canvas.ts`

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 16-09-PLAN.md — `ImageCropDialog`: the shell, the stage, the zoom row; live regions 26 → 27

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 16-10-PLAN.md — `AvatarField`: the picker, the four-step guard chain, the D-174 input reset; live regions 27 → 28

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 16-11-PLAN.md — `/profile` extraction, the live-region re-key, three `profile-pass` assertions, the copy gate

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 16-12-PLAN.md — CROP-03: `destroyAvatar`, `removeAvatarAction` (null-first), the confirm with focus on `Keep photo`

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 16-13-PLAN.md — `e2e/avatar-crop.spec.ts`: the stage's real geometry, computed `touch-action`, the refusals, the keyboard

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 16-14-PLAN.md — the scrim/ring cascade route decided by measurement, the EXIF byte-honesty proofs, GATE-STATES

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 16-15-PLAN.md — GATE-RESP's dialog-open 320px row and GATE-VRT's two new surfaces + the CI dispatch checkpoint

**Wave 10** *(blocked on Wave 9 completion)*

- [x] 16-16-PLAN.md — CROP-04: `16-UAT-CROP.md` and the PM hardware walk (the only discharge, per D-175)

**UI hint**: yes

**Inputs already on disk:** `.planning/phases/999.2-profile-picture-and-listing-photo-crop-ui/999.2-UI-SPEC.md` (written 2026-08-10; the contract — frame size, mask shape, zoom bounds, non-square/small-source behaviour, cancel semantics — is already settled). Promoted from backlog 999.2 into v1.1 as CROP-01..04.

### Phase 16.1: Upload Hardening & Storage Economy (INSERTED)

**Goal**: What a host uploads is bounded, is what it claims to be, and costs what it should to serve.
**Depends on**: Phase 16 (both touch `photo-uploader.tsx` and the Cloudinary helpers; 16 ships the framing, 16.1 hardens what gets framed)
**Requirements**: TBD (no existing REQ-ID covers this — the milestone's requirements are front-end polish, and minting UPLOAD-NN into v1.1 would fail the roadmap's own net-new test. Same disposition as Phase 13.1.)
**Inserted**: 2026-08-25, at the PM's direction during the Phase 16 discussion.

**WHY THIS EXISTS — measured against the live code on 2026-08-25, not theorised.** The PM asked for
upload size regulation, malicious-upload defence and smaller stored files. Scouting the host path found
the signed-upload pipeline genuinely well defended — session gate, per-user-id rate limit (30/60s),
ownership check before minting, and a fixed `ALLOWED_SIGN_KEYS` allow-list — and everything *around* it
undefended:

| # | Gap | Evidence |
|---|---|---|
| **U1** | **No size limit exists on the host path at all.** | `photo-uploader.tsx:177-180` passes `{folder, multiple, maxFiles: 20, sources}` — no `maxFileSize`. The error toast at `:185` promises the host *"an image under 10MB"*; nothing in our code enforces it. That is Cloudinary's own plan limit doing the work, so **our copy describes a vendor default we neither control nor declare.** The avatar path does it correctly (`AVATAR_MAX_BYTES` = 5MB, server-checked). |
| **U2** | **No format allow-list.** | No `clientAllowedFormats` — SVG, TIFF, HEIC and animated GIF all pass. SVG is a scriptable document, not an image. |
| **U3** | **`sources` includes `"url"`.** | Lets a client hand Cloudinary an arbitrary remote address to fetch, and defeats any client-side size check by construction. |
| **U4** | **No pixel-dimension guard.** | `avatarFileSchema` (`validation/profile.ts:39-47`) checks MIME type and byte size only. A 40MP image inside 5MB is a decompression bomb against whatever decodes it. This is also why Phase 16's D-171 keeps the server-side transform rather than deleting it. |
| **U5** | **Raw originals are served on every page view.** | FitOut delivers the untransformed `secure_url` through a plain `<img>` at every render site, so a host's 8MB phone photo is 8MB *per booker per page view*, not 8MB once on disk. **Bandwidth is the larger half of this, not storage.** |

⚠ **The one gap NOT in this phase:** `persistPhoto` accepting an arbitrary client-supplied `url`
(`listing-photo.ts:93-108`) is folded into **Phase 16** as D-165 — it sits on a public surface and
Phase 16 already edits that neighbourhood.

**Success Criteria** (what must be TRUE):

  1. A host cannot upload a file larger than a limit **FitOut declares and enforces**, and the error copy
     states that limit truthfully rather than describing a vendor default.

  2. Only real raster image formats are accepted. An SVG upload is refused.
  3. A stored listing photo is bounded in pixels and bytes by a transformation the **client cannot
     influence** — and no delivery URL changes, so finding N2's pipeline rewrite stays out of scope.
     ⚠ `ALLOWED_SIGN_KEYS` (`sign/route.ts:35`) is load-bearing security: the transformation must NOT
     arrive as a client-passed signed param.

  4. Whether existing oversized assets are backfilled is decided explicitly and recorded — not left implicit.
  5. Uploaded photos carry no GPS coordinates a host did not intend to publish.
  6. Assets orphaned by draft abandonment, upload failure, and Phase 16's D-169 best-effort avatar destroy
     are accounted for.

**Plans**: 7 plans in 4 waves

Plans:

**Wave 1**

- [x] 16.1-01-PLAN.md — The one declaration: `upload-policy.ts`, the three refusal sentences, and the two pure gates that pin them

**Wave 2** *(blocked on Wave 1 completion — every plan below imports the Wave-1 declaration and the shared `tests/helpers/source-text.ts`)*

- [x] 16.1-02-PLAN.md — The sign route's required-key equality gate, path 5b closed (F-1), and the exclusion source-assertion
- [x] 16.1-03-PLAN.md — `scripts/cloudinary-preset.ts` — the `--apply` / `--verify` reconciler over the committed declaration
- [x] 16.1-04-PLAN.md — The widget: `maxFileSize`, `clientAllowedFormats`, `sources: ["local"]`, a derived `maxFiles`, the preset prop and three sentences
- [x] 16.1-05-PLAN.md — The orphan sources: `persistPhoto`'s destroy strictly below provenance, and `softDeleteListing`'s

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 16.1-06-PLAN.md — Seven comments that stop promising declined work, and teardown on the two leaking e2e cases

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 16.1-07-PLAN.md — The UAT checklist, the preset applied and verified, and criterion 4's backfill decision recorded *(checkpoint: credential-bearing human walk, `autonomous: false`)*

Cross-cutting constraints:

- **GATE-06 — zero schema migrations.** `git diff --exit-code drizzle/` is an acceptance criterion in six of the seven plans; `drizzle/` stays at `0025`.
- **No delivery URL changes (criterion 3).** The eight render sites appear only in confirm-unchanged assertions; only `photo-uploader.tsx` is edited, and its own render site is asserted in-file.
- **`ALLOWED_SIGN_KEYS` gains exactly one key (`upload_preset`).** `transformation`, `allowed_formats` and `eager` never join it — a client-supplied `transformation` chains *after* the preset's and was measured upscaling a 2048-capped asset to 4000×6000.
- **D-187's destroy runs only after `isOwnCloudinaryAsset` has passed.** On the rejection path it would be an arbitrary-delete IDOR against our own Cloudinary account.
- **Wave 2 is atomic in effect:** plan 02 (route requires `upload_preset`) and plan 04 (widget sends it) are mutually required — either alone 400s every real upload. Do not ship a partial Wave 2.

⚠ **Wave 2's 02↔04 pairing is invisible to CI** — both plans' tests are isolated source/unit assertions, so nothing automated catches a half-applied wave. The wave gate is what protects it.

**UI hint**: no — this is a pipeline and validation phase; the only user-visible surface is error copy.

**Inputs already on disk:** `.planning/phases/16-image-crop-framing/16-CONTEXT.md` § Deferred Ideas
carries the measured evidence for every item above, and `16-DISCUSSION-LOG.md` records the scope split.

### Phase 17: Cross-Cutting Audit — Themes, Responsive, A11y & Baselines

**Goal**: The five gates stop being per-phase promises and become the milestone's closing, machine-checked proof across every surface at once.
**Depends on**: Phases 12, 13, 14, 15, 16 (definitionally an audit of everything before it)
**Requirements**: RESP-03, RESP-04, GATE-02, GATE-06
**Success Criteria** (what must be TRUE):

  1. Every surface holds from 320px up, with the sticky bar present, and no price, countdown or label wraps or overflows.
  2. Search, listing detail, calendar, wizard, checkout and every list surface hold their defined structure at mobile, tablet and desktop from **one** component tree — no forked mobile/desktop variants.
  3. Every surface is operable end to end by keyboard alone with a visible focus indicator throughout — including the calendar, the slot picker, the wizard, dialogs and sheets — with an automated axe pass green in **the product theme (`court`)**, the **court** baseline set regenerated in the pinned image, and the leak tests flipped from advisory to blocking. *(D-138 — single-theme axe pass, single-theme baselines; the token contract is proved by the fixed four-surface probe in `e2e/visual/theme-swap.spec.ts`, not by a second full sweep.)*
  4. v1.1 closes having shipped **zero schema migrations** — `drizzle/` is unchanged from its v1.0 state at `0025`.

**Plans**: 14 plans in 5 waves (planned 2026-08-29; worktrees are OFF, so they execute sequentially on `dev`)

Plans:

**Wave 1** *(no dependencies; zero `files_modified` overlap between them)*

- [x] 17-01-PLAN.md — the declared e2e baseline red set, `@axe-core/playwright@4.13.0` pinned, and `e2e/helpers/axe.ts` (one `.options()`, one vacuity guard)
- [x] 17-02-PLAN.md — three DB-free design gates: the GATE-06 content digest, AC#26's grove half, and `focus-definition.test.ts` (AC#20)
- [x] 17-03-PLAN.md — RESP-04's source scan (`one-tree.test.ts`, AC#10/11) plus the two structural container test ids
- [x] 17-04-PLAN.md — `e2e/helpers/nowrap.ts` and the sticky-bar clause AC#4-7, in `mobile-booker-path.spec.ts` (the Decision-Point call)
- [x] 17-05-PLAN.md — mechanical conformance: DS-09 ×5 + the ceiling to `toBe(0)` (AC#34), and D-197's slider `aria-disabled` (AC#23)
- [x] 17-06-PLAN.md — harness defects [16-D9] + [15-12], and D-196's ProfileLink padding with the 226px cluster re-measured (AC#3/9/22)

**Wave 2** *(blocked on Wave 1)*

- [x] 17-07-PLAN.md — `e2e/axe-sweep.spec.ts`: the court-only sweep at 320/1280, its first-run triage, and AC#24's six amended sentences
- [x] 17-08-PLAN.md — `e2e/keyboard-composites.spec.ts`: five properties on calendar, slot picker, wizard, dialogs and sheets (AC#19)
- [x] 17-09-PLAN.md — `e2e/one-tree.spec.ts`: one instance in the document at 320/768/1280, plus the navigation landmark (AC#12/13)
- [x] 17-10-PLAN.md — the heading-outline walk joining `host-headings.spec.ts`'s 28-state loop, red-watched against a SKIP (AC#21)
- [x] 17-11-PLAN.md — RESP-03 coverage delta: the seven unmeasured routes and the D-201 inventory assertion (AC#1/2/8)

**Wave 3** *(blocked on 17-11 — same file)*

- [x] 17-12-PLAN.md — [11-21]: four group-local throw routes, the moved `loading-coverage` pins (29→33 / 8→12), and the four unskipped rows

**Wave 4** *(blocked on every measurement plan)*

- [ ] 17-13-PLAN.md — the batched findings ledger (D-199/D-200), D-198's recorded observation, blocked-row currency (AC#29) and the closed-inventory re-proof

**Wave 5** *(last — a post-regeneration commit invalidates the evidence)*

- [ ] 17-14-PLAN.md — baseline regeneration via `baselines.yml`, the forced comparison run, and the recorded run id (AC#25/26/27, D-202) — **has a checkpoint**

**UI hint**: yes

**Size note:** this phase's size is a direct function of how well Phases 10 and 11 were done, and **both halves are now settled: this is an AUDIT, not a rewrite.** The second theme did ship with the first (grove, Phase 10), and the gates really could fail from Phase 11 onward — the ordering invariants above are the reason, and they are why the question is closed rather than open. The audit-vs-rewrite argument is kept, not deleted, because it is what those invariants exist for and what a future milestone should re-read before deferring an enforcement mechanism.

*D-138 (2026-08-23) halves it again:* a **court-only** axe pass, a **court-only** baseline sweep, and a **fixed four-surface contract spec** (`e2e/visual/theme-swap.spec.ts`) in place of a second full sweep. What was 24 grove baselines and a two-theme axe pass is now one spec that renders four surfaces twice and requires the frames to differ.

### Phase 18: Search-Results Map

**Goal**: A booker can see *where* the results are, not only what they are.
**Depends on**: Phase 17 (net-new capability, sequenced after the polish work — D-136)
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-04
**Success Criteria** (what must be TRUE):

  1. A booker sees search results on a map alongside the result list, and the two stay in sync — hovering or selecting a result highlights its marker, and selecting a marker highlights its card.
  2. A booker can move or zoom the map and re-search the visible area, with the result list following.
  3. Every map-only interaction has a keyboard-operable equivalent, and the map view holds all five gates including its own designed loading, empty and error states.

**Plans**: TBD
**UI hint**: yes

**Scope discipline (D-136):** this is net-new capability, not polish — there is **no search map today** (`react-leaflet` is used only on the single-listing panel). It needs a bounding-box parameter the two-stage PostGIS search does not take, clustering, marker↔card sync and its own a11y story, which is exactly why it may never be folded into a surface-polish phase. Known latent trap to plan for: Leaflet's `z-index: 1000` against shadcn's `z-50` overlay — the DS-03 z-index scale from Phase 10 is the arbiter. D-130 still binds: the bbox goes into the **server** query; no availability or price is computed on the client.

### Phase 19: Availability Copy-to-All

**Goal**: A host stops re-entering the same operating hours seven times.
**Depends on**: Phase 17 (net-new capability, sequenced after the polish work — D-136); Phase 14's availability-editor pass
**Requirements**: HOURS-01, HOURS-02
**Success Criteria** (what must be TRUE):

  1. A host can copy one day's operating hours onto other days instead of re-entering them.
  2. Before it applies, the host sees exactly which days will change and what they will change to, and can undo it before saving.
  3. A day that already has hours is shown as a change rather than overwritten invisibly.

**Plans**: TBD
**UI hint**: yes

**Scope discipline (D-136):** genuine new host functionality, not a visual change. The copy is an edit to an unsaved client form; the existing **server-side** ownership re-check and hours validation remain the only authority on save.

## Cross-Cutting Constraints (v1.1)

These apply to every phase and are stated once here rather than repeated in each phase.

### The five hard gates — exit criteria on every surface-touching phase (10–19)

D-131 declares four; D-134 adds the fifth. A phase is not done until all five hold for the surfaces it touched.

| Gate | What it demands | Source |
|------|-----------------|--------|
| **GATE-RESP** | 320px-up responsive, sticky bar present, nothing wraps or overflows | D-131 |
| **GATE-A11Y** | Keyboard operability + visible focus + WCAG AA contrast **in the single product theme (`court`)**. Grove's declared pairs REMAIN in `tests/design/contrast.test.ts` as part of the token contract — the axe *pass* is court-only, the contrast *table* is not, and dropping grove's rows from it would remove the check that stops a token being declared legible in one block only | D-131 + D-138 |
| **GATE-STATES** | Designed loading, empty **and** error states on every async surface — as a *rendering* assertion (in the a11y tree with a non-zero bounding box in a real browser), not a design deliverable. jsdom cannot catch this class of bug at all. | D-131 |
| **GATE-VRT** | Playwright visual-regression baselines — **court only**, still generated only in the pinned Linux image — plus **the fixed contract spec**: `e2e/visual/theme-swap.spec.ts` renders a **fixed set of four** representative surfaces in both themes and requires the frames to differ; frames that are **identical** mean that surface ignored the tokens. **The set is fixed by D-138 and does not grow per phase** — a fifth surface is a claim that the four cannot reach a token family, argued in prose as an amendment, never a row appended | D-131 + D-135 + D-138 |
| **GATE-NOREG** | Proof the *previously working* thing still works: the selector inventory checked, the AST client/server-boundary test green, and the DB-vs-DOM price-equality e2e green | D-134 |

### Roadmap-level invariants

- **GATE-06 — v1.1 ships ZERO schema migrations.** `drizzle/` stays at `0025`. A migration proposed inside any phase plan is a **scope alarm to be raised explicitly**, never absorbed. (Verified as an exit condition in Phase 17; binding from Phase 10.)
- **D-130 — polish may reshape layout and information hierarchy, but MUST NOT move logic client-side or weaken a v1.0 correctness invariant.** The GiST `EXCLUDE` constraint, the advisory-locked admissions counter, webhook-as-sole-confirm-authority, and server-side price/availability authority are untouchable. A client component may receive money or time as a pre-formatted string; never the inputs to compute one. (`pricing.ts` carries no `server-only` guard — the AST gate from Phase 11 is what makes this mechanical.)
- **D-127 — the visual layer is an explicit PLACEHOLDER.** No brand asset (logo, wordmark, custom typeface, photography treatment) is commissioned or committed in v1.1.
- **D-129 as amended — light-only.** The 10 app-code `dark:` occurrences across 5 files are rewritten into tokens; the 56 across 14 vendored `src/components/ui/*` files are left in place as provably-inert dead code, and the `.dark` block stays dormant as a cheap future theme. Stripping the vendored 56 would permanently fork 14 shadcn components from upstream and every future `npx shadcn add` would re-violate the rule.
- **Do not rebuild what shadcn already provides.** The 30 vendored primitives are the baseline; they are re-skinned through tokens, never hand-edited into a fork.
- **`/dev/theme` is frozen at its 14 sections (D-138).** It is a comparison harness, not a documentation surface, and **no phase adds a new section to it.** Its three court baselines pin the pattern layer; the four-surface contract set in `e2e/visual/theme-swap.spec.ts` is likewise fixed. A phase that believes it needs a fifth contract surface is making a claim that the four cannot reach a token family — that is an amendment to D-138 argued in prose, never a row appended.
- **The net-new test, applied to every proposal:** *if I build this, does a REQUIREMENTS ID change?* If yes, it is not polish. Filter drawers with new filters, saved searches, favourites, listing comparison and earnings charts all fail it and stay out.

### Ordering invariants (each a researcher finding, not a preference)

1. **DS-01 (the `--font-sans` cycle) lands before ANY visual-regression baseline is captured.** — 3 of 4 researchers, independently.
2. **THEME-02/03 (the second theme) ship in the SAME phase as the first.** — 4 of 4 researchers; the strongest convergence in the set. It is D-128's enforcement test, not a feature. **It HELD, and it is now SPENT.** Grove shipped in Phase 10, which is what made the contract checkable at all; under **D-138** no later phase owes grove a baseline, an axe pass or a surface. The invariant and its provenance stay on the record because they are why the enforcement test exists — a future milestone adding a theme inherits the finding, not the exemption.
3. **GATE-01 (the VR fail-open fix) and GATE-04/05 (GATE-NOREG prerequisites) exist before the first surface-polish phase.** Every later phase inherits whatever config exists when it starts.
4. **DS-06/DS-05 (the AA-failing token corrections) land in the foundation phase**, before fifty surfaces are built on values that fail the gate.
5. **MAP and HOURS never fold into a surface-polish phase** (D-136) — a polish phase that absorbs net-new capability stops being verifiable as polish.

## Progress

**Execution Order:**
v1.0 phases executed in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
v1.1: 10 → 11 → **{12, 13, 14, 15}** → 16 → 16.1 → 17 → 18 → 19
16.1 is sequenced immediately after 16 rather than in parallel: both touch `photo-uploader.tsx` and the Cloudinary helpers, so they collide rather than run alongside each other.
Phases 12–15 are order-independent (disjoint file trees, sharing only `ui/`, `patterns/` and the tokens), but 12 is sequenced first among them. Worktrees are OFF (`use_worktrees: false`), so plans execute sequentially on `dev` regardless.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Auth & Accounts | v1.0 | 4/4 | Complete (verified · all 6 human items cleared) | 2026-06-03 |
| 2. Listings & Host Onboarding | v1.0 | 6/6 | Complete (verified · human_needed: PAY-04 hosted KYC is sales-gated) | 2026-07-10 |
| 3. Availability & Double-Booking Guarantee | v1.0 | 5/5 | Complete (verified 12/12) | 2026-07-14 |
| 4. Booking Core & Search | v1.0 | 8/8 | Complete (verified 8/8) | 2026-07-15 |
| 5. Payments & Payouts | v1.0 | 7/7 | Complete (verified 5/5 · human_needed: `/v2` payouts sales-gated; GCash + Maya rails unwalked) | 2026-07-16 |
| 6. Full Booking + Payment Integration | v1.0 | 10/10 | Complete (verified 4/4 · live re-UAT passed 2026-07-20) | 2026-07-20 |
| 7. Bookings Management, Cancellation & Notifications | v1.0 | 20/20 | Complete (verified 4/4 · human UAT passed) | 2026-07-24 |
| 8. Group Bookings | v1.0 | 22/22 | Complete (verified 5/5) | 2026-07-29 |
| 9. Open-Capacity Bookings | v1.0 | 25/25 | Complete (verified 12/12 · all 14 code-review findings closed) | 2026-08-01 |
| 10. Design-System Foundation & Theme Runtime | v1.1 | 17/17 | Complete    | 2026-08-12 |
| 11. Quality Gates, Pattern Layer & App Shell | v1.1 | 22/22 | Complete   | 2026-08-17 |
| 12. Booker Path — Search → Listing → Checkout | v1.1 | 15/15 | Complete    | 2026-08-19 |
| 13. Confirmation, Bookings & Trust | v1.1 | 16/16 | Awaiting verification |  |
| 13.1 Payment Reconciliation (INSERTED) | v1.1 | 5/5 | All plans EXECUTED — awaiting phase verification (the D-113 guarantee ships in 13.1-04's sweep; 13.1-05 wires the same policy inline as an accelerant) | - |
| 14. Host Tooling | v1.1 | 16/16 | Complete   | 2026-08-23 |
| 15. Auth, Profile & Transactional Email | v1.1 | 14/14 | Complete (re-verified · EMAIL-03 walked 2026-08-25, Outlook gap accepted by the PM) | 2026-08-25 |
| 16. Image Crop & Framing | v1.1 | 16/16 | Complete (verified 2026-08-26 — 4/4 CROP requirements, no gaps; M1 settled by measurement). `dev` pushed at `025c1ad`; ci run 32939455683 GREEN on all four jobs incl. gate-visual — W-2 discharged | 2026-08-26 |
| 16.1 Upload Hardening & Storage Economy (INSERTED) | v1.1 | 7/7 | Complete    | 2026-08-28 |
| 17. Cross-Cutting Audit — Themes, Responsive, A11y & Baselines | v1.1 | 4/14 | In Progress | - |
| 18. Search-Results Map | v1.1 | 0/? | Not started | - |
| 19. Availability Copy-to-All | v1.1 | 0/? | Not started | - |

## Carried Forward from v1.0 (not v1.1 work)

Two deferred v1.0 threads are candidates rather than commitments — both are blocked on PayMongo
enabling sales-gated betas on this account, not on engineering:

- Real host payouts have never moved real money (`/v2` money movement).
- PayMongo hosted Linked-Accounts KYC (PAY-04) has never been walked.

One v1.0 item is closable today by a human with no new code: hand-pay one test-mode checkout on
**GCash** and one on **Maya** to finish Phase 5 human-UAT item 1 (card and QR Ph are already proven).

## Backlog

Unsequenced ideas parked outside the active phase sequence (999.x). Promote with `/gsd:review-backlog`.

> **999.2 (image crop/framing UI) was PROMOTED into v1.1 on 2026-08-11** and is no longer in this
> backlog. It is now **Phase 16: Image Crop & Framing**, carrying requirements **CROP-01..04** in
> `.planning/REQUIREMENTS.md`. Its already-written spec stays where it is:
> `.planning/phases/999.2-profile-picture-and-listing-photo-crop-ui/999.2-UI-SPEC.md`.

### Phase 999.1: Auth flow tells the user nothing — thin emails + silent post-reset landing (BACKLOG)

**Goal:** [Captured for future planning]
**Requirements:** TBD (touches AUTH-03, AUTH-05 surfaces; neither requirement is unmet — both are SATISFIED. This is the experience around them.)
**Plans:** 0 plans

**Captured:** 2026-08-05, during the v1.0 milestone audit, while closing Phase-1 human item 2
(password-reset delivery to a real inbox). **That item PASSED** — the mechanism is correct and
verified end to end: the email reached a real inbox, the password rotated, and every prior session
was revoked. What follows is what *surrounds* the working mechanism. Two halves of one complaint:
*the auth flow does not tell you what is happening.*

**Part A — the emails are one-liners.** `src/lib/email.ts:54-62`:

```
sendVerificationEmail -> "Verify your FitOut email"    | Verify: <a href="URL">URL</a>
sendResetPassword     -> "Reset your FitOut password"  | Reset:  <a href="URL">URL</a>
```

The raw URL is its own anchor text. Compare the Phase-7 D-66 lifecycle emails
(`sendBookingConfirmed`, `src/lib/email.ts:101+`), which get a bolded heading, named detail lines
and a labelled CTA. The auth emails are Phase-1 artifacts that never got that treatment.

Not merely cosmetic: the reset email states **neither the token expiry nor the standard "if you
didn't request this, ignore it" line** — both baseline security-hygiene expectations on a
password-reset email specifically.

**Part B — the post-reset landing is silent.** Observed live on 2026-08-05:

```
POST /api/auth/reset-password -> 200
GET  /                        -> 200      ... and ZERO session rows for that user
```

`revokeSessionsOnPasswordReset: true` correctly kills every prior session, and Better Auth's
`resetPassword` mints no new one — so the user is definitively signed **out**. But they land on `/`,
the PUBLIC search home, which renders identically for an anonymous visitor, with no "password
changed — please sign in" anywhere. A real user in that session believed they were logged in and
reported "got in" when no login had occurred. That is the sharper half of the two.

**Constraints any fix MUST preserve** (each is a deliberate prior decision, not an oversight):

- Keep `escapeHtml()` on the URL before interpolation — that is the WR-01 fix; never interpolate a
  raw url into HTML.

- Do NOT introduce React Email or any new email stack. D-66 deliberately keeps thin plain-HTML sends
  over the same `send()`/`escapeHtml()` helpers.

- Keep `revokeSessionsOnPasswordReset: true`.
- Do NOT auto-create a session on reset. Silently signing someone in from an emailed link is worse
  than the current confusion — **the fix is a confirmation plus a route to `/login`, not an auto-login.**

- `tests/auth/email-escaping.test.ts` and `tests/auth/email-dev-fallback.test.ts` assert on these
  paths. Extend them; do not weaken them.

**Do both parts together** — fixing one alone leaves the complaint half-answered.

> Deliberately left in the backlog for v1.1 (2026-08-11) despite adjacency: v1.1 already touches both
> the auth screens (AUTHUI) and the email layer (EMAIL). Tracked in `REQUIREMENTS.md` § Future
> Requirements as **AUTHFB-01/02**. If Phase 15's EMAIL-01 shell work makes AUTHFB-01 near-free in
> passing, promoting it is a small roadmap amendment rather than a new milestone.

Plans:

- [ ] TBD (promote with /gsd:review-backlog when ready)
