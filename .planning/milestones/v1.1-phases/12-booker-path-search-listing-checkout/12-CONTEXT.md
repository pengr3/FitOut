# Phase 12: Booker Path — Search → Listing → Checkout - Context

**Gathered:** 2026-08-17 (discussion) · 2026-08-18 (sketch verdicts folded in)
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes **the route from an empty search box to the payment redirect read as one designed
product, and never leave a booker at a dead end**. It holds all three D-130 restructure permissions —
search results, listing detail, checkout — plus the open-capacity date/pass picker, which is a pre-hold
surface on the listing page.

**Twelve requirements:** BFLOW-01..07, STATE-03, STATE-07, SHELL-03, RESP-02, GATE-03.

It is sequenced **first** among the order-independent set (12–15) because every money and availability
seam runs through it, and because it is where Phase 11's pattern inventory gets its real stress test — a
wrong pattern is cheaper to learn here than after three phases adopt it.

**Explicitly NOT in this phase** (do not absorb):
- Confirmation, `/bookings/**`, trust signals, receipts, the three payment states — **Phase 13**
  (BFLOW-08, TRUST-01..05, STATE-05/06/08). The group surfaces (`/invite/[token]`,
  `/bookings/[id]/group`) go there too.
- Host dashboard, requests inbox, wizard, availability editor — **Phase 14**
- Auth screens, profile, the email shell — **Phase 15**
- The full axe pass, the 320px sweep across every surface, GATE-06, flipping leak tests
  advisory→blocking — **Phase 17**
- The search-results **map** — **Phase 18** (D-136: net-new capability, its own REQ-IDs)
- Any change to booking, payment, capacity or availability **logic** (D-130). Layout may be reshaped;
  the GiST `EXCLUDE`, the advisory-locked admissions counter, webhook-as-sole-confirm-authority and
  server-side price/availability authority are untouchable.
- **Zero schema migrations** (GATE-06). `drizzle/` stays at `0025`. A migration proposed in any plan is
  a scope alarm to be raised explicitly, never absorbed.

</domain>

<decisions>
## Implementation Decisions

> **Decision-ID namespace — read this before citing a number.** These continue the per-phase CONTEXT
> sequence (Phase 10 used D-01…D-22, Phase 11 used D-23…D-36), so Phase 12 runs **D-37…D-51**. That
> sequence **collides with PROJECT.md's own D-numbered records**, which already occupy D-42, D-44,
> D-45, D-46, D-49 and D-50 (the pricing and reserve-flow decisions cited in
> `src/components/booking/price-breakdown.tsx`'s header). The collision is pre-existing — Phase 11's
> D-30/D-31 collide the same way — and is recorded rather than silently inherited. **When citing any
> number in D-42…D-50, say which namespace**: "12-CONTEXT D-45" or "PROJECT D-45". Never a bare number.

### The booker's experience is the tie-breaker — read this before the rest

- **D-59: When two options both satisfy a requirement, choose the one that costs the booker less.**
  Stated by the user on 2026-08-18, before the UI spec was written, and it governs every call in this
  phase that this document does not decide explicitly. The goal is a booker who finishes without
  friction and **comes back** — FitOut earns the second booking on the first one feeling effortless.

  **What that means concretely here** — each of these is checkable, not a mood:

  1. **Never make them tell us something twice.** The searched window is already carried onto the
     listing URL (`?date=&start=&end=`, `search-result-card.tsx:168-179`). It must survive the whole
     path: the calendar pre-opens that day, **the D-48 sheet opens on that day already selected**, and
     a collision refresh (D-55) must not reset it to today. A booker who searched Friday 9–11 AM should
     never re-pick Friday.
  2. **Never lose their work.** The 15-minute hold is server-side, so leaving checkout does not destroy
     it. SHELL-03 removes *navigation that can silently lose a hold* — it does **not** mean the booker
     is trapped. ⚠ **The checkout needs one explicit, safe way back** (a labelled "Back to the listing"
     that states the hold is kept), or "no nav" reads as a dead end and the abandonment it causes is
     self-inflicted. **This is an open question the UI-SPEC must answer**, and it is the one place D-59
     may adjust a decision already made.
  3. **Fewest taps on the money path.** Already why D-51 refused a confirm dialog and D-48 put selection
     and action in one sheet. Any new interstitial in Phases 12–15 has to argue against this line.
  4. **Never surprise them with a number.** D-37, D-40 and D-41 all serve this. The all-in rate exists
     so the price never rises between browsing and paying; that is a retention decision as much as a
     trust one.
  5. **Never leave them with nothing to do.** STATE-03 and STATE-07 are the requirement-level version;
     D-53 and D-55 are the implementations. A screen with no next action is the failure mode.
  6. **Tell them what is happening.** Skeletons shaped like the real content (STATE-01, shipped), the
     countdown, the named PayMongo destination. Silence during a wait is friction.

  ⚠ **SCOPE GUARD — retention here is earned by the flow, not by retention FEATURES.** Saved searches,
  favourites, listing comparison, a filter drawer with new filters, and any account-creation nudge are
  **explicitly out of scope** (`REQUIREMENTS.md` § Out of Scope: *"net-new capability wearing a polish
  costume"*), and D-136 keeps net-new capability in its own phases. D-59 raises the bar on **how well
  the existing flow works**; it does not authorise anything new. If a proposal under D-59 changes a
  requirement ID, it is not D-59 work.

### Price continuity: card → rail → checkout (BFLOW-01, BFLOW-04)

- **D-37: The search-result card keeps the ALL-IN RATE and never a computed window total.**
  `₱714/hr · ₱5,145/day` plus `Service fee included`, even when the booker searched a date and time.
  SC#1's *"same unit checkout will charge"* is read as the **all-in** unit — which the card already
  satisfies, and which is the part v1.0 got wrong. Rationale for refusing the total: 5% of an hourly
  rate × N hours can differ by one centavo from 5% of (rate × N hours), so a promised total is a
  promise D-75's "never goes up" cannot keep at the rounding edge. The existing header comment in
  `src/components/search/search-result-card.tsx:141-144` states this rule; it stands unchanged.

- **D-38: The listing rail renders the REAL `PriceBreakdown`, itemised — not a lookalike.**
  Identical by construction rather than by assertion. **The mechanism is a widened `AllInTable`:** the
  rail is already fed a server-computed table keyed by hour count / pass count
  (`availability-calendar.tsx:314-330`), exact to the centavo, performing zero client arithmetic. Each
  key gains `{space, fee, total}` instead of a single all-in figure. **This is a table-shape change, not
  a computation move** — GATE-05 and `server-only` are untouched, and nothing about the fee rate or the
  formula reaches the browser.

- **D-39: The fee explains itself through a POPOVER on a 44px info trigger**, identical on rail and
  checkout. `src/components/ui/popover.tsx` is vendored. **Not a tooltip** — roughly half this traffic
  is touch, and `search-result-card.tsx:214` already reasoned that through and rejected it. Not a
  sheet either: a full overlay for one sentence about a 5% fee.

- **D-40: "Est." is DROPPED. Both surfaces label the figure `Total`.** The rail figure is exact by
  construction — the RSC applies the same fee to the same space price checkout freezes — so "Est."
  understates a guarantee the system actually makes and breaks the recognisability BFLOW-04 is buying.
  The one case the number legitimately moves is a lost open-capacity race granting fewer heads, where
  it moves **down** and the reserve page states both figures before anything is charged (09-13, shipped).

- **D-41: The rail's rate headline disappears once a window is selected.** *Found by building sketch
  004, and caused by D-38 rather than pre-existing.* With the breakdown in the rail, `₱714/hr` (all-in
  headline, D-75) and `₱680/hr × 2 hours` (the run line, built from `hourlyRateCents` — the host's raw
  **space** rate) sit ~60px apart. Both are correct and they are not the same rate; the run line must
  stay the space rate because the fee is disclosed on its own line directly beneath it. Today they never
  meet, because the headline lives on the listing page and the run line at checkout. Resolution: the
  headline persists in the **no-selection** state (a deep-linked booker must still see a price) and is
  removed once a window is chosen and the breakdown appears. Rejected: labelling the run line
  *"Space rate"* (introduces a term the booker meets nowhere else, on the panel where money commits).

- **D-42 (12-CONTEXT): `PriceBreakdown`'s trailing line becomes surface-conditional.** It currently ends
  *"Includes our service fee. You'll pay this now."* On the rail **"you'll pay this now" is false** — no
  hold exists, and the next click creates one rather than charging. ⚠ **`price-breakdown.tsx` carries a
  GREP TRIPWIRE**: two whole-source greps guard its copy (one for the tax-sounding bundle, one for the
  C7-forbidden reassurances), and none of those phrases may be spelled contiguously anywhere in the
  file, comments included. Rail wording must not reintroduce a conclusiveness claim. Final copy belongs
  to the UI-SPEC; the constraint is recorded here so it cannot be discovered late.

### Listing page shape (BFLOW-02, BFLOW-03)

- **D-43: Key facts are a BORDERED 4-CELL STRIP** (sketch 003 variant B — label above value, one border
  box, collapsing to 2×2 below 700px). Five persisted facts, every one a column this page already
  reads: capacity, space type, booking mode (`Instant book` / `Host approves requests`), the drop-in
  line when `occupancyMode = open_capacity`, and units when `unitCount > 1`.
  **`Units · 1 of 4 courts`, not `4 courts`** — the strip has no qualifier line (variant A's
  "book one exclusively" has nowhere to live), so the disambiguation moves into the value. A booker must
  never read `4 courts` as "you get all four".

- **D-44 (12-CONTEXT): The gallery is an Airbnb 5-up MOSAIC** — one hero plus a 2×2, `Show all N photos`
  overlaid bottom-right, collapsing to the hero alone below `sm`. **Named fallbacks are required at 1, 2,
  3 and 4 photos** (built and shown in sketch 003); 3 and 4 are where a 2×2 gets a hole in it. Seed
  listings carry between one and eight photos, so the fallbacks are the normal case, not the edge.

- **D-45 (12-CONTEXT): Any photo opens the lightbox, and so does the button.** Full-screen dialog on
  **every** viewport — deliberately NOT the RESP-01 sheet, which is for panels, not for a photo viewer.
  Carries a `3 / 12` counter, prev/next controls, arrow-key paging and Esc. Opening on the photo the
  booker tapped is the behaviour every other marketplace has taught them.

- **D-46 (12-CONTEXT): The cancellation policy renders in BOTH places** — the full section in its ordered
  main-column slot (between map and host, per BFLOW-02), and the existing compact line in the rail. Not
  duplication for its own sake: **there is no rail on mobile**, so the section is the only place it
  appears there, and the rail line is what keeps the refund terms at the moment of commitment on desktop.

- **D-47: The host block is profile + the request rule stated WITHOUT AN HOUR COUNT.** Avatar, first
  name, `Host since June 2026` (`formatMemberSince` is shipped), bio — all from the Phase-1
  `publicProfile()` allow-list. On a request-to-book listing it adds, in words: nothing is charged when
  you request; only if approved; an unanswered request expires with nothing charged.
  ⚠ **No flat SLA figure anywhere.** `src/lib/booking/when-label.ts:173` and `src/lib/email.ts:404` both
  warn that D-96 shortens the approval SLA proportionally when the session is soon, so a label rendered
  from `APPROVAL_SLA_HOURS` is frequently wrong — and on the listing page no request row exists yet, so
  there is no real deadline to render at all. TRUST-04's ban on invented verification/superhost chrome
  applies here in full.

### The mobile path and the handoff (RESP-02, BFLOW-06, SHELL-03, BFLOW-07)

- **D-48: The sticky bottom bar opens the booking rail in the RESP-01 SHEET** — calendar, slot picker,
  breakdown and CTA in one overlay, with the action bar pinned inside the sheet carrying the amount.
  RESP-01's own requirement text names *"the booking rail"* as a sheet adopter, so this is the shipped
  primitive doing its declared job. Bar shows the all-in rate + a 44px `Check availability`.
  **Stress point for planning:** the sheet is tall — it fits at 375×720 and needs internal scroll with
  the pinned action bar always reachable. Seven 44px calendar cells is 308px before padding, which is
  the 320px constraint to design against.

- **D-49 (12-CONTEXT): The hold countdown moves to the checkout header ONLY.** Always visible while
  scrolling, **one** live region, one sr-only threshold announcement. The rail keeps
  *"We're holding this slot while you review"* without digits. The header's wordmark stays a
  **non-link** (`brandHref={null}`, as `listings/[id]/book/layout.tsx:59` already ships) — SHELL-03's
  "no navigation that can silently lose an active hold". Rejected: digits in both places, which is two
  timers that can visibly disagree by a tick and two things to keep inside the motion budget.

- **D-50 (12-CONTEXT): On mobile checkout the ITEMISED LINES collapse; the Total never does.** Listing
  name, window and `Total` stay visible; the run line, fee line and any surcharge line sit behind a
  `Price details` disclosure. The booker never opens anything to see what they are paying — only to see
  how it was built. Sticky confirm bar carries the amount plus the 44px `Confirm & pay`.

- **D-51: The PayMongo redirect is INLINE — no dialog, no interstitial page.** The line under the CTA
  names amount, rails and destination (*"You'll finish payment on PayMongo — card, GCash, Maya or QR
  Ph"*), and the pressed button reads `Taking you to PayMongo…`. This extends the shipped D-57
  reassurance rather than replacing it. Rationale for refusing a confirm dialog: it inserts a second tap
  between a decided booker and paying, on a surface where a 15-minute hold is expiring.
  **BFLOW-07's actual gap is the word "PayMongo"** — `reserve-actions.tsx` today says
  *"Taking you to checkout…"*, which names no destination.

### The two dead ends (STATE-03, STATE-07)

- **D-52: Zero results relax ONE constraint at a time, in a fixed ladder, stopping at the first that
  returns rows** — radius → price → time-of-day → date. **The activity is never relaxed**: someone
  searching for a badminton court will not take a yoga studio. The ladder needs a **cap**, since each
  rung is another query on an already-empty search.
  *Supersedes what ships:* `src/app/(public)/page.tsx:82-98` currently drops radius, category, priceMax,
  date, start AND end in a single broadened query and renders the result under an unlabelled
  "You might also like" — which is precisely the gap STATE-03 names.

- **D-53: The relaxation is AUTO-APPLIED and announced in a band above the results, with an Undo**
  (sketch 002 variant A). The band names the single constraint that gave —
  *"Nothing at 9–11 AM within 10 km. Showing 6 badminton courts within 25 km instead, same day and
  time"* — and **the filter chip visibly moves to 25 km and highlights**, so the control and the results
  never disagree.
  ⚠ **This REFINES the discussion's own answer and the refinement is deliberate.** The discussion chose
  the ladder over "auto-apply with an undo chip"; seeing it built moved the presentation to auto-apply.
  The two halves are separable and both stand: **the ladder decides WHAT is relaxed (D-52); the band
  decides HOW it is told (D-53).** The user picked variant A after viewing, on 2026-08-18.

- **D-54: Cold start is UNCHANGED.** No escape hatches, no relaxation, no ladder. Every hatch is a
  filter control, and offering "Broaden radius" to someone in a city with no supply is a button that
  cannot work. It names what happens next in words. (`search-results.tsx:281-287`, shipped, correct.)

- **D-55: A collision offers SAME-DAY ADJACENT WINDOWS, landing in place above the refreshed picker.**
  The refreshed day grid **is** the alternative — the notice names the lost window, the taken hours flip
  to struck-through **in the same paint**, and the nearest free windows are outlined in the picker the
  booker is already looking at. Calm neutral, never red, never a dialog, focus moved to the notice, one
  polite live region. Occupancy is a normal state.
  **The rail must drop its selection AND its price** rather than leave a stale total beside a window
  nobody can book. Checkout-side collisions keep the shipped `HoldExpiredState` untouched.
  *This is an evolution, not a rewrite:* `book-cta.tsx:153-160` already does calm-notice +
  `router.refresh()`. What is added is **naming what happened** and **offering what is next**.

### Folded in without being asked (raised 2026-08-17, unopposed)

- **D-56: The `[11-13]` hydration error is IN SCOPE, because it is on this phase's own surface.**
  `/listings/[id]` throws a named server/client mismatch at `(detail)/page.tsx:464` — the tooltip trigger
  in the booking rail, which this phase rebuilds. It is the cheapest reproduction of the duplicate-node
  class that cost Phase 11 four separate investigations (`[11-03]`, `[11-11](a)`, `[11-13]`, `[11-14]`).
  This phase either fixes it or proves it survived; it may not leave it unmeasured.
  **Read `deferred-items.md` `[11-13]` first** — the discriminator is `npm run build && npm start`, and
  if the mismatch disappears in a production build the fix is in the specs' locators, not in the pages.

- **D-57 (12-CONTEXT): The ±4px grid gutter (`[11-17]`) is resolved here.** `CardGridSkeleton` is
  `gap-5`; `ResultsGrid` is `gap-4 lg:gap-6` — 4px in opposite directions either side of `lg`. This
  phase owns the search grid, so it is the phase that can unify them. The alternative owner
  (`/host/listings`, the pattern's other adopter) is Phase 14.

- **D-58: The `og-listing` visual baseline (`[11-22]`) is claimed by this phase.** Phase 11 left it
  blocked for want of a published listing and handed it to "whichever of Phases 12–15 seeds one".
  ⚠ **The trap, quoted from that entry:** the route answers **200 without a database** — `og-facts.ts`
  returns null and it serves the `GenericCard`, byte-identical to the root card at 25,844 B — so a
  baseline shot without a fixture is green forever while covering the wrong card.

### Claude's Discretion

Delegated by silence or by explicit deferral to the UI-SPEC — the planner may adjust mechanics, not
intent:

- **BFLOW-05's mechanics** (≥44px day cells, the correctly-shaped loading skeleton, month changes inside
  the motion budget) were not put to the user: they are a measurement against a shipped token contract,
  not a preference. The slot skeleton already exists at `h-11 w-20` × 8
  (`availability-calendar.tsx:265-268`); the day cells are react-day-picker's `CalendarDayButton` and are
  the actual debt.
- **The GATE-03 audit scope.** 34 `aria-live` attributes across 18 files; the booker-path subset needs an
  inventory and a rule. `hold-countdown.tsx` is already correct (`role="timer"` + `aria-live="off"` on
  the digits, sr-only announcements only at the 60s threshold and expiry) and is the model the rest
  should be measured against — not re-decided.
- **Exact copy everywhere.** Deferred to `/gsd-ui-phase 12`, subject to D-42's tripwire and to the
  09-UI-SPEC drop-in vocabulary (no "occupancy mode", no "capacity", no "slot"; "shared space", never
  "shared pass").
- **The `Units · 1 of 4 courts` wording** (D-43) is Claude's call, made rather than asked because
  variant B removed the slot variant A used for it and the ambiguity is a correctness matter, not taste.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The design contracts this phase inherits — read these FIRST
- `.planning/phases/11-quality-gates-pattern-layer-app-shell/11-UI-SPEC.md` — the approved Phase-11
  contract: the three card patterns (`ResultCard` / `RowCard` / `PanelCard`), all four state families,
  the mobile-overlay primitive, share/meta, the **copywriting contract**, the 14 `data-testid` names,
  the contrast rows and its anti-pattern list. Phase 12 **adopts** this; it does not re-decide it.
- `.planning/phases/10-design-system-foundation-theme-runtime/10-UI-SPEC.md` — the foundation
  `11-UI-SPEC.md` extends.
- `.planning/milestones/v1.0-ui-specs/09-UI-SPEC.md` — the open-capacity surfaces (§2 the picker,
  §2c the pre-hold PaxStepper, §4 the drop-in card fork, §444 Copywriting). The date/pass picker is a
  Phase-12 surface.
- `.planning/milestones/v1.0-ui-specs/07-UI-SPEC.md` — **rule C7**, the forbidden booker-facing
  reassurances that D-42's grep tripwire enforces.

### Prior locked decisions — do not reopen
- `.planning/phases/11-quality-gates-pattern-layer-app-shell/11-CONTEXT.md` — **D-23…D-36.** Especially
  **D-31/D-32** (the typed `selector-contract.ts` inventory and its existence + floor rule — every new
  `data-testid` must be declared), **D-34** (`server-only` guards make `next build` the enforcer),
  **D-35** (the DB-vs-DOM price-parity e2e), **D-28** (`updateSnapshots: "none"` unconditionally).
- `.planning/phases/10-design-system-foundation-theme-runtime/10-CONTEXT.md` — **D-01…D-22.** Especially
  **D-22** (`size="touch"` is opt-in), **D-18** (the generated token module), **D-08** (the Playwright
  theme seam).
- `.planning/PROJECT.md` § Key Decisions — **D-127…D-136**, and the v1.0 pricing decisions the money
  surfaces cite: **D-45/D-46** (run-line shape, display currency), **D-49** (frozen quote), **D-50**
  (host-side commission — never on a booker surface), **D-57** (the reserve CTA reassurance),
  **D-74/D-75** (the booker-facing service fee; the all-in rate that must never go up),
  **D-96** (the proportionally-shortened approval SLA — see D-47), **D-108** (extra-guest surcharge),
  **D-123/D-125** (open-capacity counter and per-head pricing).
- `.planning/ROADMAP.md` § *Phase 12* and § *Cross-Cutting Constraints (v1.1)* — the five hard gates,
  the ordering invariant, and **GATE-06**.
- `.planning/REQUIREMENTS.md` — the twelve requirement texts.

### The sketches — the visual decisions, with their rejected alternatives preserved
- `.planning/sketches/MANIFEST.md` — design direction, and the winners table.
- `.planning/sketches/002-search-and-dead-end/` — **winner A.** The rate-only card and the relaxation
  band. Its README states what A trades away.
- `.planning/sketches/003-listing-page-shape/` — **winner B.** Key-facts strip, the 5-up mosaic **and
  its 1/2/3/4-photo fallbacks**, the lightbox, the host block.
- `.planning/sketches/004-price-as-one-fact/` — **winner A.** Rail vs checkout side by side; carries the
  **two-rates finding** D-41 resolves, and the three pricing shapes one component must survive.
- `.planning/sketches/005-mobile-path/` — **winner A.** The live 375px flow: sticky bar → sheet →
  checkout → handoff.
- `.planning/sketches/006-collision-in-place/` — **winner A.** The collision, plus the red version it
  must never become.
- `.planning/sketches/themes/court.css` · `grove.css` — the shipped tokens transcribed. Flipping a
  sketch to grove is a **leak test on the layout**, not a palette preview.

### Open items this phase inherits or claims
- `.planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md` — **read `[11-13]`
  (D-56), `[11-17]` (D-57), `[11-22]` (D-58) before planning.** Also `[11-11]` (why
  `listing-card.tsx` cannot render through `ResultCard` — that is Phase 14's host tile, NOT this
  phase's search card) and `[11-18]`'s **RESOLVED** ruling that `search-results.tsx`'s inline fetch
  error stays one-action and permanent — do not reopen it.

### In-repo sources the plans must read rather than reinvent
- `src/components/booking/price-breakdown.tsx` — **the header is the contract.** Zero arithmetic; the
  three frozen money props; the C1 label rule; the **grep tripwire**; and the `price-total` hook
  GATE-05's e2e reads.
- `src/components/availability/availability-calendar.tsx:310-432` — `RailSelectionSummary` /
  `RailPassSummary` and the `AllInTable` prop D-38 widens. Its comments explain why the fee rate itself
  may not cross into the client.
- `src/components/booking/reserve-view.tsx` — the checkout shell, the `PanelCard sticky` rail, and the
  expiry swap. Its header says outright: *"Container swap only — Phase 12 owns the checkout redesign."*
- `src/components/booking/reserve-actions.tsx` — the confirm action, the checkout lease, and the D-57
  reassurance D-51 extends. **Note the T-08-79 correction**: PayMongo does **not** honour
  `Idempotency-Key` on `/v1/checkout_sessions`; the guards are server-side.
- `src/components/booking/hold-countdown.tsx` — the GATE-03 model (`role="timer"`, `aria-live="off"`,
  announcements only at the threshold and expiry).
- `src/components/search/search-result-card.tsx` — the card's meta order, pinned by
  `tests/search/search-card-open.test.tsx` case (9), and the D-ELM-01..05 drop-in copy rules.
- `src/components/search/search-results.tsx` + `src/app/(public)/page.tsx:79-98` — the shipped
  zero-result branch and the all-at-once broadened query D-52 replaces.
- `src/app/actions/booking.ts` — the calm `taken` / `sold-out` results D-55 renders; and
  `src/components/booking/book-cta.tsx:153-160`, the existing notice + `router.refresh()`.
- `src/lib/design/selector-contract.ts` · `measurements.ts` · `contrast-pairs.ts` — the three typed
  inventories. A new `data-testid`, a new measurement constant or a new colour pair **must** be declared
  in the matching file or the build fails.
- `e2e/price-parity.spec.ts` — asserts the rendered total equals `booking.quoted_total_cents`. D-38 and
  D-41 both touch what it reads.
- `src/components/patterns/responsive-dialog.tsx` — RESP-01's sheet primitive D-48 adopts.
- `src/app/listings/[id]/book/layout.tsx` — already composes the minimal `SiteChrome` with
  `brandHref={null}`. SHELL-03's delta is the countdown, not the header.

</canonical_refs>

<code_context>
## Existing Code Insights

### Measured this session (2026-08-17) — supersedes any earlier figure

| Fact | Evidence |
|---|---|
| The rail already receives **server-computed, exact** money | `availability-calendar.tsx:317-329` — `AllInTable`, a lookup keyed by hour/pass count. Zero arithmetic. |
| Checkout **already has** its minimal header | `listings/[id]/book/layout.tsx:59` — `SiteChrome brand="FitOut" brandHref={null}` |
| GATE-03 is **half-shipped** | `hold-countdown.tsx:70-85` already announces once, not per tick |
| The GATE-03 surface to audit | **34** `aria-live` attributes across **18** files |
| The listing page order today | gallery → title → About → Amenities → **Location(map)** → **Availability** → rail. Availability and map are inverted vs BFLOW-02. |
| Cancellation lives in the rail today | `CancellationPolicyDisclosure` inside the `PanelCard`, `(detail)/page.tsx:479` |
| The zero-result fallback drops **six** filters at once | `(public)/page.tsx:84-93` — radius→25, category, priceMax, date, start, end |
| Host fields available | `publicProfile()` → `avatarUrl`, `firstName`, `bio`, `city`, `createdAt`; `formatMemberSince` shipped |
| `PublicListing` does **not** carry `bookingMode` / `occupancyMode` / `unitCount` | but the detail page reads them off `row.listing` directly (`:253`, `:420`, `:424`) — so the key-facts strip needs no projection change |

### Reusable assets
- **Phase 11's pattern layer** — `ResultCard` (the search grid's container, price last), `PanelCard sticky`
  (both rails, 80px offset owned by the pattern), `EmptyState`, `ErrorState`, `CardGridSkeleton`,
  `ResponsiveDialog`, `SiteChrome`.
- **`PriceBreakdown` already handles all three pricing shapes** via optional props — hourly, full-day +
  D-108 surcharge, and open-capacity passes. D-38 needs no fork, which is exactly what sketch 004's
  bottom section was built to check.
- **The 44px slot skeleton exists** — `availability-calendar.tsx:265-268`, `h-11 w-20` × 8.
- **`e2e/helpers/served-document.ts`** — the truncator that can produce a pending and a resolved state
  from one response; named in `[11-21]` as the way to measure the D-57 gutter on `/` itself.

### Integration points
- `src/components/search/search-result-card.tsx` + `search-results.tsx` + `(public)/page.tsx` — D-37,
  D-52, D-53, D-54, D-57.
- `src/app/listings/[id]/(detail)/page.tsx` — the reorder, the key-facts strip, the host block, the
  cancellation section, and **the `[11-13]` hydration site at `:464`** (D-56).
- `src/components/listing/photo-gallery.tsx` — mosaic + lightbox (D-44, D-45). Currently a 16:9 cover
  over a 4-across strip, presentational and server-safe; the lightbox makes part of it interactive.
- `src/components/availability/availability-calendar.tsx` — the widened `AllInTable` (D-38), the 44px
  day cells, the skeleton and the month-change motion (BFLOW-05), and the collision landing (D-55).
- `src/components/booking/reserve-view.tsx` + `reserve-actions.tsx` + `book/layout.tsx` — D-49, D-50,
  D-51.
- `src/lib/design/selector-contract.ts` — every new `data-testid` (lightbox, disclosure, sticky bars,
  the relaxation band) must be declared here or the build fails.

### ⚠ Open risks for the researcher
1. **The ladder's query cost (D-52).** Four rungs on an already-empty search is up to four extra
   PostGIS round-trips. Needs a measured cap and a decision on whether rungs run sequentially
   (stop-at-first-hit, cheapest in the common case) or concurrently (bounded latency, always pays for
   all four).
2. **Sheet height at 320px (D-48).** Seven 44px calendar cells is 308px before padding, and the sheet
   must also hold slots, a breakdown and a pinned action bar.
3. **`[11-13]`'s hydration mismatch (D-56)** may be a dev-mode streaming artefact rather than a product
   defect. Rule it in or out with a production build **before** planning a fix.

</code_context>

<specifics>
## Specific Ideas

- **"Seamless, hassle-free — we want them to come back."** The user's own framing, given on 2026-08-18
  as the lens for the UI spec (D-59). Worth keeping in the words it was said in: the measure of this
  phase is not that the booker *can* finish, but that finishing was **effortless enough to do again**.
  Phase 12 is the phase where that is decided, because it owns the entire path.
- **"The same fact, not two related facts."** BFLOW-04's recognisability claim drove D-38, D-40 and D-41
  together. It is also why D-41 exists at all: the moment two surfaces become one component, a
  discrepancy that was previously invisible becomes a contradiction 60px tall.
- **Never fabricate a number the system cannot stand behind.** D-47 refuses an SLA hour count because
  D-96 makes it frequently false; D-37 refuses a promised total because a centavo of rounding would
  break it. This is the same reasoning Phase 11 applied to `SUPPORT_EMAIL` (D-26) and the OG origin —
  the honest omission beats the plausible invention.
- **Occupancy is the marketplace working.** Sketch 006 ships the red version deliberately, so "calm" is
  measurable rather than a word. The rejected version leaks `23P01` and blames the user for a race they
  lost fairly.
- **Sketch the decision AND its runner-up AND the status quo.** Sketch 004 carries all three, and the
  improvement is only legible against the "before". That structure is what surfaced D-41.
- **The sketch themes are a leak test.** `court.css` and `grove.css` are transcribed from `globals.css`,
  so grove moves geometry, type and elevation — not just hue. A layout that only reads right in court
  is carrying a hardcoded value.

</specifics>

<deferred>
## Deferred Ideas

- **Nearest-DAY alternatives on a collision** (sketch 006 variant B/C's other half). D-55 offers same-day
  adjacent windows only, because the refreshed grid already contains them and no new read model is
  needed. A multi-day availability read is a genuine capability addition — if a later phase wants
  *"9–11 AM is gone Friday, free Saturday"*, it needs its own read path and its own decision.
- **Adding `HoldExpiredState` alternatives at checkout.** Considered and left alone: that surface is
  Phase-13-adjacent, already calm, and adding it would give the alternatives read model a second call
  site for no measured benefit.
- **A "Space rate" label on the run line** — the rejected half of D-41. If the rail headline ever has to
  return, this is the documented alternative.
- **A third theme (DSFUT-01), dark mode (DSFUT-02).** Out of v1.1 entirely.
- **The results MAP.** Phase 18, D-136. Do not let a "just show where they are" impulse into this phase —
  it needs a bbox query parameter the two-stage PostGIS search does not take today.
- **Sketch `--wrap-up`.** The five sketches are not yet packaged into a `sketch-findings-*` skill. Worth
  running before Phase 13–15 so their winners are discoverable without reading five HTML files.

</deferred>

---

*Phase: 12-Booker Path — Search → Listing → Checkout*
*Context gathered: 2026-08-17; sketch verdicts folded in 2026-08-18*
