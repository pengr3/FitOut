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

- [ ] **Phase 10: Design-System Foundation & Theme Runtime** - One token contract, two themes, and the shipped defects fixed before a single baseline is shot
- [ ] **Phase 11: Quality Gates, Pattern Layer & App Shell** - Make the gates capable of failing, seed the shared patterns, and give the app a real header, footer and state families
- [ ] **Phase 12: Booker Path — Search → Listing → Checkout** - The route from an empty search box to the payment redirect reads as one designed product
- [ ] **Phase 13: Confirmation, Bookings & Trust** - After paying, a booker sees exactly what they bought, where their money is, and what happens next
- [ ] **Phase 14: Host Tooling** - A host opens FitOut and sees what they owe today, in the same product the booker sees
- [ ] **Phase 15: Auth, Profile & Transactional Email** - The first screens a new user sees, and every email FitOut sends, carry the app's identity
- [ ] **Phase 16: Image Crop & Framing** - A user controls how their image is framed before it is committed
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

- [ ] 10-02-PLAN.md — Shared gate primitives — the one leak-pattern list, the globals.css token parser, and the compile-CSS helper

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 10-03-PLAN.md — The colour contract — DS-01 font cycle, the court and grove theme blocks, and the 29-pair AA proof

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 10-04-PLAN.md — Type scale, 3-step elevation, 4-step z, the motion budget and the global reduced-motion reset
- [ ] 10-05-PLAN.md — Theme runtime — the mounted provider, FitOut identity metadata, the Sonner mapping and both override paths

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 10-06-PLAN.md — The Button CVA contract — the brand variant, the touch size, and the one solid focus recipe

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 10-07-PLAN.md — The 12 remaining 50%-alpha focus rings removed, pinned by the DS-05 source-scan gate
- [ ] 10-08-PLAN.md — 15 booker, group and search Button call sites converted onto variant="brand"

**Wave 7** *(blocked on Wave 6 completion)*

- [ ] 10-09-PLAN.md — The 5 host conversions, the availability color-mix hovers, and the closed 20 / 9 DS-08 gate

**Wave 8** *(blocked on Wave 7 completion)*

- [ ] 10-10-PLAN.md — Status vocabulary — one closed four-tone union, and green retreats to the icon

**Wave 9** *(blocked on Wave 8 completion)*

- [ ] 10-11-PLAN.md — The 14 arbitrary text-[NNpx] sizes onto the named type steps
- [ ] 10-12-PLAN.md — The 14 shadow call sites collapsed onto three named elevation steps

**Wave 10** *(blocked on Wave 9 completion)*

- [ ] 10-13-PLAN.md — The 23 raw z-index values mapped onto the four-step scale

**Wave 11** *(blocked on Wave 10 completion)*

- [ ] 10-14-PLAN.md — Palette-class rewrite and the dark: strip, with the vendored 56 pinned as a test

**Wave 12** *(blocked on Wave 11 completion)*

- [ ] 10-15-PLAN.md — Generated token module, themed favicons, and the scaffold residue deleted

**Wave 13** *(blocked on Wave 12 completion)*

- [ ] 10-16-PLAN.md — /dev/theme — two themes side by side in nested subtrees, on real components

**Wave 14** *(blocked on Wave 13 completion)*

- [ ] 10-17-PLAN.md — Turn the gates on — the leak rule, the pair-drift check, and a build that actually goes red

**UI hint**: yes

**Ordering invariants this phase carries (non-negotiable, each a researcher finding):**

- **DS-01 lands before ANY visual-regression baseline is captured.** Fixing the font cycle changes the rendered typeface of every screen; every baseline shot before it is invalid. Three of four researchers stated this independently.
- **THEME-02/03 ship HERE, not in the audit.** The second theme is D-128's enforcement test, not a feature (D-133; 4-of-4 researcher convergence). Every surface built before a second theme exists is unverified, and deferring it turns Phase 17 into a rewrite phase.
- **DS-05/DS-06 land HERE**, before fifty surfaces are built on values that fail the gate.
- Three research decision items are **already settled** and must not be reopened at planning: the focus ring is a darkened neutral (D-132, *not* `--ring = --brand`); the `dark:` strip is the 10 app-code occurrences rewritten into tokens with the 56 vendored ones left inert (D-129 as amended, = THEME-05); the theme count is two (D-133).
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

**Plans**: TBD
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

**Plans**: TBD
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

**Plans**: TBD
**UI hint**: yes

**Scope note:** this phase owns `/bookings/**` on the booker side plus the group surfaces (`/invite/[token]`, `/bookings/[id]/group`). Research treated group/open-capacity as a fourth parallel track; REQUIREMENTS.md defines **no separate REQ-IDs** for it, so a standalone phase would carry zero requirements. Folded here instead — `/invite/[token]` is a post-booking artifact and the open-capacity picker is a pre-hold listing surface (Phase 12). Stated as a deliberate departure from the research's phase shape, with the reason.

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

**Plans**: TBD
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

**Plans**: TBD
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

**Plans**: TBD
**UI hint**: yes

**Inputs already on disk:** `.planning/phases/999.2-profile-picture-and-listing-photo-crop-ui/999.2-UI-SPEC.md` (written 2026-08-10; the contract — frame size, mask shape, zoom bounds, non-square/small-source behaviour, cancel semantics — is already settled). Promoted from backlog 999.2 into v1.1 as CROP-01..04.

### Phase 17: Cross-Cutting Audit — Themes, Responsive, A11y & Baselines

**Goal**: The five gates stop being per-phase promises and become the milestone's closing, machine-checked proof across every surface at once.
**Depends on**: Phases 12, 13, 14, 15, 16 (definitionally an audit of everything before it)
**Requirements**: RESP-03, RESP-04, GATE-02, GATE-06
**Success Criteria** (what must be TRUE):

  1. Every surface holds from 320px up, with the sticky bar present, and no price, countdown or label wraps or overflows.
  2. Search, listing detail, calendar, wizard, checkout and every list surface hold their defined structure at mobile, tablet and desktop from **one** component tree — no forked mobile/desktop variants.
  3. Every surface is operable end to end by keyboard alone with a visible focus indicator throughout — including the calendar, the slot picker, the wizard, dialogs and sheets — with an automated axe pass green in **both** themes, the full baseline set regenerated in the pinned image, and the leak tests flipped from advisory to blocking.
  4. v1.1 closes having shipped **zero schema migrations** — `drizzle/` is unchanged from its v1.0 state at `0025`.

**Plans**: TBD
**UI hint**: yes

**Size note:** this phase's size is a direct function of how well Phases 10 and 11 were done. If the second theme really did ship with the first and the gates really could fail from Phase 11 onward, this is an audit. If either slipped, this becomes a rewrite phase — which is the entire argument for the ordering invariants above.

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
| **GATE-A11Y** | Keyboard operability + visible focus + WCAG AA contrast, in **both** themes | D-131 |
| **GATE-STATES** | Designed loading, empty **and** error states on every async surface — as a *rendering* assertion (in the a11y tree with a non-zero bounding box in a real browser), not a design deliverable. jsdom cannot catch this class of bug at all. | D-131 |
| **GATE-VRT** | Playwright visual-regression baselines, generated only in the pinned Linux image, plus a theme-swap smoke: two-theme screenshots of a surface that are **identical** mean that surface ignored the tokens | D-131 + D-135 |
| **GATE-NOREG** | Proof the *previously working* thing still works: the selector inventory checked, the AST client/server-boundary test green, and the DB-vs-DOM price-equality e2e green | D-134 |

### Roadmap-level invariants

- **GATE-06 — v1.1 ships ZERO schema migrations.** `drizzle/` stays at `0025`. A migration proposed inside any phase plan is a **scope alarm to be raised explicitly**, never absorbed. (Verified as an exit condition in Phase 17; binding from Phase 10.)
- **D-130 — polish may reshape layout and information hierarchy, but MUST NOT move logic client-side or weaken a v1.0 correctness invariant.** The GiST `EXCLUDE` constraint, the advisory-locked admissions counter, webhook-as-sole-confirm-authority, and server-side price/availability authority are untouchable. A client component may receive money or time as a pre-formatted string; never the inputs to compute one. (`pricing.ts` carries no `server-only` guard — the AST gate from Phase 11 is what makes this mechanical.)
- **D-127 — the visual layer is an explicit PLACEHOLDER.** No brand asset (logo, wordmark, custom typeface, photography treatment) is commissioned or committed in v1.1.
- **D-129 as amended — light-only.** The 10 app-code `dark:` occurrences across 5 files are rewritten into tokens; the 56 across 14 vendored `src/components/ui/*` files are left in place as provably-inert dead code, and the `.dark` block stays dormant as a cheap future theme. Stripping the vendored 56 would permanently fork 14 shadcn components from upstream and every future `npx shadcn add` would re-violate the rule.
- **Do not rebuild what shadcn already provides.** The 30 vendored primitives are the baseline; they are re-skinned through tokens, never hand-edited into a fork.
- **The net-new test, applied to every proposal:** *if I build this, does a REQUIREMENTS ID change?* If yes, it is not polish. Filter drawers with new filters, saved searches, favourites, listing comparison and earnings charts all fail it and stay out.

### Ordering invariants (each a researcher finding, not a preference)

1. **DS-01 (the `--font-sans` cycle) lands before ANY visual-regression baseline is captured.** — 3 of 4 researchers, independently.
2. **THEME-02/03 (the second theme) ship in the SAME phase as the first.** — 4 of 4 researchers; the strongest convergence in the set. It is D-128's enforcement test, not a feature.
3. **GATE-01 (the VR fail-open fix) and GATE-04/05 (GATE-NOREG prerequisites) exist before the first surface-polish phase.** Every later phase inherits whatever config exists when it starts.
4. **DS-06/DS-05 (the AA-failing token corrections) land in the foundation phase**, before fifty surfaces are built on values that fail the gate.
5. **MAP and HOURS never fold into a surface-polish phase** (D-136) — a polish phase that absorbs net-new capability stops being verifiable as polish.

## Progress

**Execution Order:**
v1.0 phases executed in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
v1.1: 10 → 11 → **{12, 13, 14, 15}** → 16 → 17 → 18 → 19
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
| 10. Design-System Foundation & Theme Runtime | v1.1 | 1/17 | In Progress | - |
| 11. Quality Gates, Pattern Layer & App Shell | v1.1 | 0/? | Not started | - |
| 12. Booker Path — Search → Listing → Checkout | v1.1 | 0/? | Not started | - |
| 13. Confirmation, Bookings & Trust | v1.1 | 0/? | Not started | - |
| 14. Host Tooling | v1.1 | 0/? | Not started | - |
| 15. Auth, Profile & Transactional Email | v1.1 | 0/? | Not started | - |
| 16. Image Crop & Framing | v1.1 | 0/? | Not started | - |
| 17. Cross-Cutting Audit — Themes, Responsive, A11y & Baselines | v1.1 | 0/? | Not started | - |
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
