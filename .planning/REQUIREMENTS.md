# Requirements: FitOut v1.1 — Front-End Polish & Placeholder Design System

**Defined:** 2026-08-11
**Core Value:** Find & book a space — search → real availability → reserve a time slot → pay, with confidence the booking is real.

**Milestone premise:** every v1.0 capability works and is proven (49/49 requirements, 1087 tests). None of them look finished. v1.1 changes how the product *looks and feels*, puts branding behind a swappable token contract, and pays off a measured set of defects that already violate the quality bars this milestone declares. It adds **no new transaction capability** — with two deliberate, separately-phased exceptions (MAP, HOURS) recorded as D-136.

**Governing decisions:** D-127 (placeholder, not branding) · D-128 (one token contract; multi-theme is the proof) · D-129 as amended (light-only; app-code `dark:` only) · D-130 (may reshape layout; no logic moves client-side) · D-131 (four hard gates) · D-132 (neutral focus ring) · D-133 (two themes, second ships with the first) · D-134 (GATE-NOREG) · D-135 (VR gate is fail-open by default) · D-136 (MAP/HOURS get their own phases).

---

## v1.1 Requirements

### Design System — the token contract (DS)

- [x] **DS-01**: The app renders in its intended typeface — the `--font-sans` self-referential cycle at `globals.css:10` is fixed so `font-sans` and `font-heading` resolve, and Geist is actually applied rather than downloaded and discarded
- [ ] **DS-02**: A type scale exists as tokens (display / heading / body / label with paired line-heights and named weights), and no surface uses an arbitrary `text-[NNpx]` value
- [ ] **DS-03**: An elevation scale of exactly three steps (raised / overlay / sticky) plus a four-step z-index scale (sticky bar < sheet < dialog < toast) exists, and every shadow in the app maps to one of the three
- [x] **DS-04**: Motion tokens (fast / base / slow, one standard easing, nothing above 320ms) exist and a global `prefers-reduced-motion` reset is in force
- [ ] **DS-05**: One focus-visible recipe applies app-wide, using a **darkened neutral** ring (D-132) that clears ≥3:1 against both `--background` and `--card`, and no control relies on a 50%-alpha ring as its only focus indicator
- [ ] **DS-06**: Every colour token pair actually used on a surface meets WCAG AA (4.5:1 text, 3:1 non-text), verified by an automated contrast test rather than by inspection — this corrects the shipped coral CTA (3.60:1), success badge (3.24:1) and focus ring (2.58:1, and ~1.54:1 as rendered)
- [x] **DS-07**: `--destructive` is brought inside the sRGB gamut so it renders identically across P3 and sRGB displays and does not produce false visual-regression diffs
- [ ] **DS-08**: The coral accent is a button variant, not a repeated string — the 19 literal `bg-brand …` recipes are replaced by a CVA `brand` variant, and the button hierarchy (brand → default → outline → ghost → link, destructive edge-only) is expressed as variants
- [ ] **DS-09**: A `touch` control size (44px) exists as a named size and is the standard for booker-facing primary actions and all mobile controls
- [ ] **DS-10**: Status is a closed semantic vocabulary (neutral / positive / attention / soft-accent), every status is icon + text and never colour-only, and no lifecycle state is rendered in red or green as decoration
- [ ] **DS-11**: Three named card patterns exist (ResultCard, RowCard, PanelCard) and every card surface in the app uses one of them rather than re-deciding padding, radius and hover locally
- [ ] **DS-12**: Theme values are exported as a TypeScript module with hex fallbacks alongside the oklch, generated from the token contract, so non-CSS consumers (email, the Leaflet marker, `global-error`) cannot drift — this closes the shipped `BRAND_CORAL = "#E8484E"` vs `#ef4445` drift at `listing-map.tsx:22`
- [ ] **DS-13**: An automated leak test fails the build when any file under `src/components/**` or `src/app/**` contains a raw hex, `rgb(`, `oklch(`, or an arbitrary `text-[NNpx]` value
- [ ] **DS-14**: The scaffold residue is gone — real `title`/`description`/`metadataBase`, the starter SVGs and default favicon removed, and `suppressHydrationWarning` present on `<html>`

### Theming (THEME)

- [ ] **THEME-01**: A theme provider is mounted using a `data-theme` attribute (never `class`, which would collide with the dormant `.dark` block), and the toast component maps named themes correctly instead of passing them straight through to a prop that accepts only `light|dark|system`
- [ ] **THEME-02**: **Two** placeholder themes exist — the coral direction plus one deliberately distant — and switching between them re-skins the entire app with zero component edits
- [x] **THEME-03**: The second theme ships in the same phase as the first and is used as the enforcement proof that nothing hardcoded leaked, not as a later feature
- [ ] **THEME-04**: A nested `[data-theme]` subtree renders in its own theme, so two themes can be previewed side by side on one page — which requires `@theme inline` to be preserved
- [ ] **THEME-05**: The 10 app-code `dark:` occurrences are rewritten into tokens; the 56 vendored occurrences are left untouched and the `.dark` block stays dormant (D-129 as amended)

### The four state families (STATE)

- [ ] **STATE-01**: Every data-backed route has a designed loading state whose skeleton is built from the same measurement constants as the real content, so nothing shifts on arrival (2 of ~27 routes have one today)
- [ ] **STATE-02**: Every route group has an error boundary offering both a retry and a route out, plus a global error page and not-found pages for a missing listing and for the root (zero exist today)
- [ ] **STATE-03**: A booker who gets no search results is never at a dead end — the page names which constraint was relaxed and always offers alternatives rather than an empty page
- [ ] **STATE-04**: Every list surface has a designed empty state, and host request inbox-zero reads as a positive state rather than an absence
- [ ] **STATE-05**: Payment states are three distinct things and never conflated — *not completed* (neutral, states "you haven't been charged", offers retry and the alternative rails inline), *pending settlement* (no error affordance at all while the webhook is still the outstanding authority), and *reversed* (explicit money statement plus a support path carrying the reference)
- [ ] **STATE-06**: Every payment state states where the money is, in words, above the fold
- [ ] **STATE-07**: A "slot just taken" collision resolves in place as a calm result rather than an error — refreshed availability lands in the same paint so the user sees why, and the nearest alternatives are offered rather than only a way back
- [ ] **STATE-08**: Terminal success is a full-page moment; non-terminal success is a toast — and anything the user must actually read (a refund amount, a reduced headcount) is an in-page alert, never a toast

### App shell & chrome (SHELL)

- [ ] **SHELL-01**: The public routes have a real site header — `/`, `/listings/[id]`, `/listings/[id]/book` and `/invite/[token]` currently render no navigation at all
- [ ] **SHELL-02**: A footer with policy, support and contact links exists across the app
- [ ] **SHELL-03**: Checkout carries its own minimal header holding the wordmark and the live hold countdown, with no navigation that can silently lose an active hold
- [ ] **SHELL-04**: A listing or invite link pasted into a chat renders a correct title, description and a token-driven share image — today it renders as "Create Next App"

### Booker flow (BFLOW)

- [ ] **BFLOW-01**: The search-result card leads with the photo and puts title and price on one baseline, so price is legible without interaction and in the same unit checkout will use
- [ ] **BFLOW-02**: The listing detail page follows the conventional order (gallery → title → key facts → description → availability → map → cancellation policy → host) and the desktop sticky rail is preserved
- [ ] **BFLOW-03**: Listing photos are a hero grid opening a full-screen keyboard-pageable dialog, not a carousel
- [ ] **BFLOW-04**: The price breakdown renders through a visually identical component in the rail estimate and at checkout, so a booker recognises it as the same fact; the fee line explains itself on demand
- [ ] **BFLOW-05**: The availability calendar and slot picker pay off their deferred hit-area debt (≥44px day cells), gain a correctly-shaped loading skeleton, and keep month changes inside the motion budget
- [ ] **BFLOW-06**: Checkout is a single column on mobile with the summary collapsed behind a disclosure and a sticky confirm bar carrying the amount
- [ ] **BFLOW-07**: A booker is told the payment redirect is coming, and where they are going, before they leave for the payment provider
- [ ] **BFLOW-08**: The post-payment view is a distinct confirmation moment — success mark, status, reference, exact amount, venue-local time with named timezone, address, where the copy was emailed, and what happens next — which decays into the normal booking-detail page on later visits

### Trust & confidence (TRUST)

- [ ] **TRUST-01**: Every booking detail page states status plus what it means, venue name and full address, venue-local time with named timezone, who the host is, exactly what was paid itemised, the cancellation deadline as a concrete date with today's refund amount, the reference, and a support path
- [ ] **TRUST-02**: The booking reference is copyable, rendered in tabular figures, present on every status, and carried in the email subject line
- [ ] **TRUST-03**: The cancellation policy is disclosed on the confirmation and in the confirmation email with concrete dates, not only at listing, checkout and cancel-review
- [ ] **TRUST-04**: Only real trust signals are shown — host since, listing published, payout onboarding complete, request-to-book behaviour — with no invented verification or superhost chrome behind which no program exists
- [ ] **TRUST-05**: A booker can view and print an itemised receipt for a paid booking

### Host tooling (HFLOW)

- [ ] **HFLOW-01**: The host requests inbox is scannable with the SLA countdown as the loudest element, approve/decline as the only actions, and a designed inbox-zero
- [ ] **HFLOW-02**: The listing wizard shows a truthful step count across the occupancy fork, allows back-navigation from a clickable step rail, shows its save state, and surfaces the publish checklist as a persistent panel rather than an end-of-flow surprise
- [ ] **HFLOW-03**: The host dashboard is a "today" view — today's bookings, requests owed, payout state, and any published-without-hours signal — rather than a greeting and a CTA
- [ ] **HFLOW-04**: The host bookings table and availability editor carry the design system, and the editor shows a week-at-a-glance preview of what was set
- [ ] **HFLOW-05**: Earnings and payouts receive a token pass only, with no restructure, because that data has never been real

### Auth & profile (AUTHUI)

- [ ] **AUTHUI-01**: The auth screens (login, signup, forgot, reset) carry the design system and read as the same product as the app
- [ ] **AUTHUI-02**: The profile page carries the design system, and avatar removal is possible
- [ ] **AUTHUI-03**: The auth screens hold the same five gates as every other surface — 320px, keyboard, AA, designed states, and a baseline

### Transactional email (EMAIL)

- [ ] **EMAIL-01**: All existing sends render through one shared branded shell (600px, single column, table-based, inline hex styles from the generated token module, a preheader, a text wordmark, a plain-text part) **without any send trigger moving**
- [ ] **EMAIL-02**: Email colour values are generated from the same token contract as the app, so a theme swap cannot leave the emails behind
- [ ] **EMAIL-03**: The shell is verified by opening at least one of each send in real Gmail (web and Android), real Outlook desktop, and Apple Mail — at least one in dark mode

### Image framing (CROP) — promoted from backlog 999.2

- [ ] **CROP-01**: A user can frame and zoom their avatar before it uploads, and the server's blind face-gravity re-crop no longer re-frames what the user just chose
- [ ] **CROP-02**: A host uploading listing photos sees a non-destructive preview of what the 16:9 hero and the 4:3 cards each cut off, with nothing baked into the stored asset
- [ ] **CROP-03**: A user can remove their avatar
- [ ] **CROP-04**: Cropping works on a real touch device — verified on hardware, not in desktop touch emulation

### Responsive (RESP)

- [ ] **RESP-01**: A single mobile-overlay primitive (sheet) is adopted for filters, breakdowns, the booking rail and navigation, rather than every mobile pattern degrading into a full-screen dialog
- [ ] **RESP-02**: A mobile booker reaches the booking CTA without scrolling the listing page, via a sticky bottom bar carrying the price and a 44px action
- [ ] **RESP-03**: Every surface is verified from 320px up, with the sticky bar present, and no price, countdown or label wraps or overflows
- [ ] **RESP-04**: Search, listing detail, calendar, wizard, checkout and list surfaces each hold their defined structure at mobile, tablet and desktop from one component tree rather than forked mobile/desktop variants

### Quality gates (GATE)

- [ ] **GATE-01**: Visual-regression baselines exist, are generated **only** inside the pinned Playwright Docker image, and CI fails on a missing baseline rather than writing one and reporting green (D-135)
- [ ] **GATE-02**: Every surface is operable by keyboard alone, with a visible focus indicator throughout — including the calendar, the slot picker, the wizard, dialogs and sheets
- [ ] **GATE-03**: The countdown timer and every live status region announce correctly to a screen reader, once rather than per tick
- [ ] **GATE-04**: **GATE-NOREG** — a structural-selector inventory exists and is checked, so a restyle cannot silently break the e2e specs that prove the double-booking guarantee (`src/` contains zero test ids today)
- [ ] **GATE-05**: **GATE-NOREG** — an automated check fails the build if a money or availability computation crosses into a client component, and an end-to-end check asserts the price rendered in the DOM equals the price the database holds
- [ ] **GATE-06**: The milestone ships zero schema migrations; a migration proposed in any phase plan is raised explicitly rather than absorbed

### Search map (MAP) — net-new capability, own phase (D-136)

- [ ] **MAP-01**: A booker can see search results on a map alongside the result list
- [ ] **MAP-02**: A booker can move or zoom the map and re-search the visible area
- [ ] **MAP-03**: Hovering or selecting a result highlights its marker and vice versa
- [ ] **MAP-04**: The map view holds the same five gates as every other surface, including a keyboard-operable equivalent for every map-only interaction

### Availability copy (HOURS) — net-new capability, own phase (D-136)

- [ ] **HOURS-01**: A host can copy one day's operating hours to other days instead of re-entering them
- [ ] **HOURS-02**: The host sees what will change before it applies, and can undo it before saving

---

## Future Requirements

Deferred — acknowledged, not in this roadmap.

### Auth flow feedback (backlog 999.1)

- **AUTHFB-01**: The verification and reset emails carry the same treatment as the lifecycle emails, including token expiry and an "if you didn't request this" line
- **AUTHFB-02**: A user who completes a password reset lands somewhere that tells them their password changed and that they are signed out — today they land on the public search home, indistinguishable from an anonymous visitor

> Left in the backlog by explicit choice (2026-08-11) despite adjacency: v1.1 already touches both the auth screens (AUTHUI) and the email layer (EMAIL). If EMAIL-01's shell work makes AUTHFB-01 near-free in passing, promoting it is a small roadmap amendment rather than a new milestone.

### Deferred design-system depth

- **DSFUT-01**: A third placeholder theme, if two prove insufficient to catch leaks
- **DSFUT-02**: Dark mode as a real theme, once branding is locked (the dormant `.dark` block and the 56 vendored `dark:` classes are deliberately preserved for this)
- **DSFUT-03**: A design-token pipeline (Figma / Style Dictionary), once there is a design source of truth to pipe from

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real branding — logo, wordmark asset, custom typeface, photography treatment | D-127: branding is not locked. The entire milestone exists to make the swap cheap when it is. Committing brand assets now is the one thing that would waste this work. |
| Dark mode | D-129: it was half-built and unreachable, so it was debt not a feature. Shipping it properly roughly doubles every phase's visual-QA surface while branding is unlocked. Preserved as a cheap future theme. |
| Any change to booking, payment, capacity or availability logic | D-130. The correctness invariants (GiST `EXCLUDE`, advisory-locked admissions counter, webhook-as-sole-confirm-authority, server-side price and availability authority) are v1.0's proven core. Layout may be reshaped; logic may not move. |
| Schema migrations | GATE-06. A visual milestone that needs a migration has stopped being a visual milestone. |
| Reviews & ratings, identity verification, superhost/verified badges | No program exists behind them. Inventing trust chrome is a worse lie on a money path than showing nothing — and reviews/verification are already out of scope project-wide. |
| Filter drawer with new filters, saved searches, favourites, listing comparison, earnings charts | Net-new capability wearing a polish costume. The test: if building it changes a requirement ID, it is not polish. |
| Optimistic UI on anything the server can reject | Hold, confirm, approve/decline, cancel, RSVP, headcount. An optimistic booking is a lie about a database-arbitrated fact. |
| Carousels for listing photos | Hides supply and is a recurring accessibility regression; the grid-then-lightbox pattern is the marketplace default. |
| Restructuring earnings/payouts | HFLOW-05. That data has never been real — PayMongo's `/v2` money movement is sales-gated. Restructuring a surface whose numbers are unproven is work that gets redone. |
| Rebuilding components shadcn already provides | The 30 vendored primitives are the baseline; a polish milestone that rewrites them has misidentified the problem. |
| Real host payouts, hosted Linked-Accounts KYC | Carried from v1.0 and still blocked on PayMongo enabling sales-gated betas — a commercial conversation, not engineering. Not v1.1 work. |

---

## Traceability

Mapped by the v1.1 roadmap on 2026-08-11. Phase numbering continues from v1.0 (which ended at Phase 9).

| Requirement | Phase | Status |
|-------------|-------|--------|
| DS-01 | Phase 10 | Complete |
| DS-02 | Phase 10 | Pending |
| DS-03 | Phase 10 | Pending |
| DS-04 | Phase 10 | Complete |
| DS-05 | Phase 10 | Pending |
| DS-06 | Phase 10 | Pending |
| DS-07 | Phase 10 | Complete |
| DS-08 | Phase 10 | Pending |
| DS-09 | Phase 10 | Pending |
| DS-10 | Phase 10 | Pending |
| DS-11 | Phase 11 | Pending |
| DS-12 | Phase 10 | Pending |
| DS-13 | Phase 10 | Pending |
| DS-14 | Phase 10 | Pending |
| THEME-01 | Phase 10 | Pending |
| THEME-02 | Phase 10 | Pending |
| THEME-03 | Phase 10 | Complete |
| THEME-04 | Phase 10 | Pending |
| THEME-05 | Phase 10 | Pending |
| STATE-01 | Phase 11 | Pending |
| STATE-02 | Phase 11 | Pending |
| STATE-03 | Phase 12 | Pending |
| STATE-04 | Phase 11 | Pending |
| STATE-05 | Phase 13 | Pending |
| STATE-06 | Phase 13 | Pending |
| STATE-07 | Phase 12 | Pending |
| STATE-08 | Phase 13 | Pending |
| SHELL-01 | Phase 11 | Pending |
| SHELL-02 | Phase 11 | Pending |
| SHELL-03 | Phase 12 | Pending |
| SHELL-04 | Phase 11 | Pending |
| BFLOW-01 | Phase 12 | Pending |
| BFLOW-02 | Phase 12 | Pending |
| BFLOW-03 | Phase 12 | Pending |
| BFLOW-04 | Phase 12 | Pending |
| BFLOW-05 | Phase 12 | Pending |
| BFLOW-06 | Phase 12 | Pending |
| BFLOW-07 | Phase 12 | Pending |
| BFLOW-08 | Phase 13 | Pending |
| TRUST-01 | Phase 13 | Pending |
| TRUST-02 | Phase 13 | Pending |
| TRUST-03 | Phase 13 | Pending |
| TRUST-04 | Phase 13 | Pending |
| TRUST-05 | Phase 13 | Pending |
| HFLOW-01 | Phase 14 | Pending |
| HFLOW-02 | Phase 14 | Pending |
| HFLOW-03 | Phase 14 | Pending |
| HFLOW-04 | Phase 14 | Pending |
| HFLOW-05 | Phase 14 | Pending |
| AUTHUI-01 | Phase 15 | Pending |
| AUTHUI-02 | Phase 15 | Pending |
| AUTHUI-03 | Phase 15 | Pending |
| EMAIL-01 | Phase 15 | Pending |
| EMAIL-02 | Phase 15 | Pending |
| EMAIL-03 | Phase 15 | Pending |
| CROP-01 | Phase 16 | Pending |
| CROP-02 | Phase 16 | Pending |
| CROP-03 | Phase 16 | Pending |
| CROP-04 | Phase 16 | Pending |
| RESP-01 | Phase 11 | Pending |
| RESP-02 | Phase 12 | Pending |
| RESP-03 | Phase 17 | Pending |
| RESP-04 | Phase 17 | Pending |
| GATE-01 | Phase 11 | Pending |
| GATE-02 | Phase 17 | Pending |
| GATE-03 | Phase 12 | Pending |
| GATE-04 | Phase 11 | Pending |
| GATE-05 | Phase 11 | Pending |
| GATE-06 | Phase 17 | Pending |
| MAP-01 | Phase 18 | Pending |
| MAP-02 | Phase 18 | Pending |
| MAP-03 | Phase 18 | Pending |
| MAP-04 | Phase 18 | Pending |
| HOURS-01 | Phase 19 | Pending |
| HOURS-02 | Phase 19 | Pending |

**Per-phase counts:**

| Phase | Name | Requirements | Count |
|-------|------|--------------|-------|
| 10 | Design-System Foundation & Theme Runtime | DS-01..10, DS-12..14, THEME-01..05 | 18 |
| 11 | Quality Gates, Pattern Layer & App Shell | DS-11, STATE-01/02/04, SHELL-01/02/04, RESP-01, GATE-01/04/05 | 11 |
| 12 | Booker Path — Search → Listing → Checkout | BFLOW-01..07, STATE-03/07, SHELL-03, RESP-02, GATE-03 | 12 |
| 13 | Confirmation, Bookings & Trust | BFLOW-08, TRUST-01..05, STATE-05/06/08 | 9 |
| 14 | Host Tooling | HFLOW-01..05 | 5 |
| 15 | Auth, Profile & Transactional Email | AUTHUI-01..03, EMAIL-01..03 | 6 |
| 16 | Image Crop & Framing | CROP-01..04 | 4 |
| 17 | Cross-Cutting Audit | RESP-03/04, GATE-02, GATE-06 | 4 |
| 18 | Search-Results Map | MAP-01..04 | 4 |
| 19 | Availability Copy-to-All | HOURS-01..02 | 2 |

**Coverage:**
- v1.1 requirements: 75 total (DS 14 · THEME 5 · STATE 8 · SHELL 4 · BFLOW 8 · TRUST 5 · HFLOW 5 · AUTHUI 3 · EMAIL 3 · CROP 4 · RESP 4 · GATE 6 · MAP 4 · HOURS 2)
- Mapped to phases: **75 / 75 ✓**
- Unmapped: **0**
- Duplicated across phases: **0** (every requirement maps to exactly one phase)

**Notes on two intentional near-overlaps** (both requirements stand; neither is double-mapped):
- **AUTHUI-02** (Phase 15) carries "avatar removal is possible" and **CROP-03** (Phase 16) is "A user can remove their avatar." Phase 15 owns the profile page's design-system pass; the removal affordance itself is delivered by CROP-03 in Phase 16.
- **STATE-04** (Phase 11) covers every list surface's empty state including host inbox-zero; **HFLOW-01** (Phase 14) covers the requests inbox's scannability, SLA countdown and actions. The empty state is authored once in Phase 11 with the shared `EmptyState` pattern and adopted, not re-decided, in Phase 14.

---
*Requirements defined: 2026-08-11*
*Last updated: 2026-08-11 — traceability populated by the v1.1 roadmap (Phases 10–19); 75/75 mapped, 0 orphans.*
