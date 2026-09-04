# Phase 12: Booker Path — Search → Listing → Checkout - Research

**Researched:** 2026-08-18
**Domain:** Next.js 16 App Router surface restructure on a shipped, money-handling marketplace path (search → listing → hold → checkout → PayMongo redirect), with a locked design-system + pattern layer and a locked UI contract.
**Confidence:** HIGH for the existing-code inventory and the measured contradictions (read from source in this session); MEDIUM for the two library-behaviour items flagged MEASURE-FIRST; HIGH for the Next.js / Playwright / shadcn facts (fetched from official docs and the live registry this session).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

> Copied from `.planning/phases/12-booker-path-search-listing-checkout/12-CONTEXT.md` § Implementation Decisions. **Decision-ID namespace warning, copied verbatim:** these continue the per-phase CONTEXT sequence, so Phase 12 runs **D-37…D-51** (plus D-52…D-59 added by the sketch verdicts). That sequence **collides with PROJECT.md's own D-numbered records**, which already occupy D-42, D-44, D-45, D-46, D-49 and D-50. **When citing any number in D-42…D-50, say which namespace**: "12-CONTEXT D-45" or "PROJECT D-45". Never a bare number.

- **D-59 (the tie-breaker, governs everything this document does not decide): When two options both satisfy a requirement, choose the one that costs the booker less.** Its six concrete tests: (1) never make them tell us something twice — the searched window survives the whole path; (2) never lose their work — checkout needs one explicit, safe way back; (3) fewest taps on the money path; (4) never surprise them with a number; (5) never leave them with nothing to do; (6) tell them what is happening. **SCOPE GUARD: retention is earned by the flow, not by retention FEATURES.** Saved searches, favourites, comparison, new filters and account nudges are explicitly out of scope. *If a proposal changes a requirement ID, it is not D-59 work.*
- **D-37:** The search-result card keeps the ALL-IN RATE and never a computed window total.
- **D-38:** The listing rail renders the REAL `PriceBreakdown`, itemised — not a lookalike. Mechanism = a **widened `AllInTable`** (`{space, fee, total}` per key). A table-shape change, not a computation move.
- **D-39:** The fee explains itself through a POPOVER on a 44px info trigger, identical on rail and checkout. Not a tooltip. Not a sheet.
- **D-40:** "Est." is DROPPED. Both surfaces label the figure `Total`.
- **D-41:** The rail's rate headline disappears once a window is selected.
- **D-42 (12-CONTEXT):** `PriceBreakdown`'s trailing line becomes surface-conditional. ⚠ the file carries a **GREP TRIPWIRE** — two whole-source greps guard its copy; none of the guarded phrases may be spelled contiguously anywhere in the file, comments included.
- **D-43:** Key facts are a BORDERED 4-CELL STRIP. `Units · 1 of 4 courts`, never `4 courts`.
- **D-44 (12-CONTEXT):** The gallery is an Airbnb 5-up MOSAIC with named fallbacks at 1, 2, 3 and 4 photos.
- **D-45 (12-CONTEXT):** Any photo opens the lightbox, and so does the button. Full-screen dialog on **every** viewport — deliberately NOT the RESP-01 sheet.
- **D-46 (12-CONTEXT):** The cancellation policy renders in BOTH places — the full section and the compact rail line.
- **D-47:** The host block is profile + the request rule stated WITHOUT AN HOUR COUNT. ⚠ No flat SLA figure anywhere.
- **D-48:** The sticky bottom bar opens the booking rail in the RESP-01 SHEET.
- **D-49 (12-CONTEXT):** The hold countdown moves to the checkout header ONLY. One live region, one sr-only threshold announcement. Wordmark stays a non-link.
- **D-50 (12-CONTEXT):** On mobile checkout the ITEMISED LINES collapse; the Total never does.
- **D-51:** The PayMongo redirect is INLINE — no dialog, no interstitial page. BFLOW-07's actual gap is the word "PayMongo".
- **D-52:** Zero results relax ONE constraint at a time, in a fixed ladder, stopping at the first that returns rows — radius → price → time-of-day → date. **The activity is never relaxed.** The ladder needs a cap.
- **D-53:** The relaxation is AUTO-APPLIED and announced in a band above the results, with an Undo; the filter chip visibly moves and highlights.
- **D-54:** Cold start is UNCHANGED.
- **D-55:** A collision offers SAME-DAY ADJACENT WINDOWS, landing in place above the refreshed picker. The rail must drop its selection AND its price. Checkout-side collisions keep the shipped `HoldExpiredState` untouched.
- **D-56:** The `[11-13]` hydration error is IN SCOPE. Read `deferred-items.md` `[11-13]` first; the discriminator is `npm run build && npm start`.
- **D-57 (12-CONTEXT):** The ±4px grid gutter (`[11-17]`) is resolved here.
- **D-58:** The `og-listing` visual baseline (`[11-22]`) is claimed by this phase. ⚠ the route answers 200 without a database and serves the `GenericCard` at 25,844 B — a baseline without a fixture is green forever while covering the wrong card.

**Phase boundary — explicitly NOT in this phase (do not absorb):** confirmation / `/bookings/**` / trust signals / receipts / the three payment states / the group surfaces (Phase 13); host dashboard, requests inbox, wizard, availability editor (Phase 14); auth screens, profile, the email shell (Phase 15); the full axe pass, the 320px sweep across every surface, GATE-06, flipping leak tests advisory→blocking (Phase 17); the search-results **map** (Phase 18, D-136); **any change to booking, payment, capacity or availability logic** (D-130); **zero schema migrations** (GATE-06 — `drizzle/` stays at `0025`).

### Claude's Discretion

- **BFLOW-05's mechanics** (≥44px day cells, the correctly-shaped loading skeleton, month changes inside the motion budget) — a measurement against a shipped token contract, not a preference.
- **The GATE-03 audit scope.** 34 `aria-live` attributes across 18 files; the booker-path subset needs an inventory and a rule. `hold-countdown.tsx` is the model, not to be re-decided.
- **Exact copy everywhere.** Deferred to the UI-SPEC (now written), subject to D-42's tripwire and the 09-UI-SPEC drop-in vocabulary.
- **The `Units · 1 of 4 courts` wording** (D-43) is Claude's call.

### Deferred Ideas (OUT OF SCOPE)

- **Nearest-DAY alternatives on a collision** — needs its own read path and its own decision.
- **Adding `HoldExpiredState` alternatives at checkout** — Phase-13-adjacent, already calm.
- **A "Space rate" label on the run line** — the rejected half of D-41.
- **A third theme (DSFUT-01), dark mode (DSFUT-02).**
- **The results MAP** — Phase 18, D-136. Needs a bbox query parameter the two-stage PostGIS search does not take today.
- **Sketch `--wrap-up`** — packaging the five sketches into a findings skill.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description (REQUIREMENTS.md) | Research Support |
|----|-------------------------------|------------------|
| BFLOW-01 | Search-result card leads with the photo, title and price on one baseline, price legible without interaction and in the same unit checkout will use | § Existing Code Inventory (the card already satisfies this); § Pitfall 8 (the only real change is the grid gutter, `RESULT_GRID_GAP`) |
| BFLOW-02 | Listing detail follows the conventional order; desktop sticky rail preserved | § Existing Code Inventory (measured order today: About → Amenities → **Location** → **Availability**; two moves required); `PanelCard sticky` already owns the 80px offset |
| BFLOW-03 | Photos are a hero grid opening a full-screen keyboard-pageable dialog, not a carousel | § Pattern 2 (the lightbox); `ui/dialog.tsx` vendored via `radix-ui` single package |
| BFLOW-04 | Price breakdown renders through a visually identical component in rail and checkout; the fee line explains itself | § Pattern 4 + **Pitfall 1** (the RSC/client boundary makes this a real refactor, not a re-render) |
| BFLOW-05 | Calendar/slot picker pay off the ≥44px hit-area debt, gain a correctly-shaped skeleton, month changes inside the motion budget | § Pattern 3 + **Pitfall 2** (the 44px cell needs TWO overrides, and one of them is measure-first) |
| BFLOW-06 | Checkout single column on mobile, summary behind a disclosure, sticky confirm bar carrying the amount | § Pattern 6; shadcn `collapsible` verified to add zero npm deps |
| BFLOW-07 | The booker is told the redirect is coming and where they are going | § Existing Code Inventory (`reserve-actions.tsx:84` says "Taking you to checkout…"); one-string change plus the line beneath |
| STATE-03 | Zero results is never a dead end — the page names which constraint was relaxed and offers alternatives | § Pattern 7 + **Pitfall 5** (Undo loops without a suppression flag) + **Pitfall 6** (there are no filter chips today) + § the measured ladder cost |
| STATE-07 | A slot-taken collision resolves in place as a calm result; refreshed availability lands in the same paint; nearest alternatives offered | § Pattern 8 + **Pitfall 3** (`router.refresh()` provably cannot do this today — cited) |
| SHELL-03 | Checkout carries its own minimal header holding the wordmark and the live hold countdown, with no navigation that can silently lose a hold | § Pattern 5 (the layout↔page composition problem and the `HoldProvider` shape) |
| RESP-02 | A mobile booker reaches the booking CTA without scrolling, via a sticky bottom bar with price and a 44px action | § Pattern 6; `shadow-sticky` gets its first two call sites |
| GATE-03 | The countdown and every live status region announce once rather than per tick | § Pattern 9 (the measured 34/18 inventory, the announce-once mechanism, and the two changes `hold-countdown.tsx` itself needs) |
</phase_requirements>

---

## Summary

**This is a restructure of six live surfaces, not a greenfield build.** Every surface named in the success criteria already ships and is UAT-passed. The value this research adds is (a) the concrete file inventory the planner needs for `files_modified` / `read_first`, and (b) **eleven measured places where the 12-UI-SPEC contract and the shipped code disagree** — each of which is either a hidden refactor the spec calls a re-render, or an acceptance criterion that cannot pass as written. Those are catalogued in § Common Pitfalls and cross-referenced from § Architecture Patterns.

The three highest-risk seams, in order:

1. **`PriceBreakdown` is a Server Component and the rail is inside a client subtree.** D-38 says "the rail renders the real `PriceBreakdown`". `price-breakdown.tsx` has no `"use client"` and its header explicitly states it is a Server Component; `RailSelectionSummary` (its would-be new parent) is `"use client"` in `availability-calendar.tsx`. A Server Component cannot be imported by a Client Component. The fix is small and safe — `@/lib/money` is documented isomorphic and the component has no hooks and no guarded imports, so adding `"use client"` is legal and does not touch GATE-05 — but it is a **boundary change on the money surface**, and the file's own header sentence must change with it. The spec does not mention this at all.

2. **`router.refresh()` cannot land refreshed availability "in the same paint".** D-55 and STATE-07 both rest on it. Next's own docs state refresh "will merge the updated React Server Component payload **without losing unaffected client-side React (e.g. `useState`)**". `availability-calendar.tsx:142` holds the day's slots in `useState(initialDay)` — an initial value React only reads on mount — and `initialDay` is seeded for **today**, not the selected day. So today's `router.refresh()` in `book-cta.tsx:160` leaves the stale grid on screen. The collision recovery must call the already-shipped public `getDayAvailability` server action for the selected day and set state, batching the notice and the new grid in one commit.

3. **The relaxation ladder is not four PostGIS round-trips.** `searchListings` Stage-2 (`query.ts:254-289`) calls `getAvailability` **once per candidate, sequentially**, over a `fetchLimit` of 41. Rungs 1–3 keep the date, so each pays a full Stage-2 loop; rung 4 drops the date and is Stage-1 only — i.e. **the cheapest rung is last**. A worst-case zero-result search runs 1 original + 4 rung Stage-1 queries and up to 4 × 41 sequential availability reads.

Beyond those, the phase inherits a shipped, unusually well-instrumented gate layer (three typed inventories, two Vitest configs, a Playwright functional project + a Linux-only visual project, `updateSnapshots: "none"` unconditionally). The correct posture is to **extend the declared inventories**, never to invent values at call sites — a new `data-testid`, a new box class in a skeleton, or a new colour pair fails `npm run build` today.

**Primary recommendation:** Sequence the phase so the three architectural seams above land in an early wave — (i) lift the day/availability fetch out of `AvailabilityCalendar` into the selection provider, (ii) flip `PriceBreakdown` to a client component and widen `AllInTable`, (iii) build the `HoldProvider` — because the search, gallery, key-facts, copy and sticky-bar work all sit on top of them and are cheap once they are settled.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Search filtering, radius, price, category, weekday | API / Database (RSC + Postgres/PostGIS) | — | `searchListings` Stage-1 SQL. All params re-validated server-side (`searchParamsSchema`). Never a client filter. |
| True-availability filter (Stage-2) | API / Database (RSC) | — | Reuses `getAvailability`, the same read model the listing calendar uses (D-34). A second client-side availability predicate would be the documented anti-pattern. |
| **The relaxation ladder (D-52)** | **API / Database (RSC)** | Frontend Server (band render) | Each rung is another server query. The client must never re-query or re-rank; it renders the outcome and the band. |
| All-in rate strings on cards | API (server-formatted) | Browser (display only) | `allInRateParts` is computed in `query.ts` because the card renders from a `"use client"` shell. |
| **Price computation (space, fee, total)** | **API / Database (server)** | Browser (display of finished figures only) | D-130 / GATE-05. `buildAllInTable` imports the guarded `service-fee.ts`; the client receives a **lookup table**, never ingredients. |
| Price breakdown *rendering* | Browser (client component, after this phase) | — | See Pitfall 1. Rendering moves; computation does not. |
| Hold creation, expiry, confirm | API (server actions) + Database | — | `placeHold`/`placeOpenHold`/`confirmBooking`. The GiST `EXCLUDE` and the checkout lease are the sole authorities. |
| Hold countdown display | Browser | — | Display cue only; `confirmBooking` re-checks `expires_at > now()` server-side. |
| Day/slot selection state | Browser | — | `BookingSelectionProvider`. Advisory; the server re-derives and re-validates. |
| Day availability re-fetch (collision, day change) | API (public read-only server action) | Browser (invocation) | `getDayAvailability` — no session gate, re-enforces the published+non-deleted gate, Zod-validates input. |
| Lightbox / sheet / popover / disclosure | Browser | — | Pure presentation over data already fetched. |
| Checkout hold context (`expiresAt`, `expired`) | Browser (client provider in the layout) | — | Carries one ISO string and one boolean. **No hold data is fetched in the layout.** |
| PayMongo redirect | API (server action) → external | Browser (navigation) | `confirmBooking` mints the hosted checkout and redirects; the client only names the destination. |

---

## Project Constraints (from CLAUDE.md)

| Directive | Consequence for this phase |
|---|---|
| **GSD workflow enforcement** — no direct repo edits outside a GSD workflow | Plans execute through `/gsd:execute-phase`; this research writes only `12-RESEARCH.md`. |
| Next.js 16 App Router + React 19, TypeScript, Tailwind v4, shadcn/ui + Radix | No framework change. The one registry block added is `collapsible` (verified below). |
| **Never trust the client for price/time**; server-side price and availability authority | Pitfall 1's client-component flip must move *rendering only*. The widened `AllInTable` must stay a lookup. |
| **Application-level double-booking checks are forbidden**; the GiST `EXCLUDE` constraint is the arbiter | D-55's collision recovery reads refreshed availability; it must not pre-check or pre-filter a booking. |
| `timestamptz` UTC, converted at the edges with `@date-fns/tz` | Every new date/label path (searched-window pre-open, collision copy, band's `{Fri, Aug 21}`) must use `tz()`/`TZDate` against the **venue** timezone, never the browser's. |
| Optimistic UI on anything the server can reject is out of scope | The collision recovery, the hold, the confirm and the relaxation band are all server-arbitrated; none may be optimistic. |
| Rebuilding components shadcn already provides is out of scope | Use the vendored `dialog`, `popover`, `calendar`, `separator`, `skeleton`, `aspect-ratio`; add `collapsible` rather than hand-rolling `aria-expanded`/`aria-controls`. |
| Carousels for listing photos are out of scope | BFLOW-03 is grid-then-lightbox; a carousel is a named anti-pattern. |
| **Schema migrations are out of scope (GATE-06)** | `drizzle/` is at `0025` (verified: last file `drizzle/0025_audit_resolved_by.sql`). A migration in any plan is a scope alarm to raise, never absorb. |

---

## Existing Code Inventory

> **This is the section the planner should copy from.** Every path below was opened and read in this session (2026-08-18). Line numbers are as-measured today; where the CONTEXT or UI-SPEC cites a different number, the drift is called out.

### Routes and layouts

| Path | Lines | What it is | Phase-12 role |
|---|---|---|---|
| `src/app/(public)/page.tsx` | 148 | Search home RSC. Validates `searchParamsSchema`, runs cumulative page loop 0..page, runs the **broadened fallback** at `:82-98`, composes `barDefaults` + `queryString`. | **D-52/D-53/D-54.** The all-at-once broadened query is what the ladder replaces. |
| `src/app/(public)/loading.tsx` | — | Route-level skeleton (renders `CardGridSkeleton`). | D-57 gutter (must consume `RESULT_GRID_GAP`). |
| `src/app/listings/[id]/(detail)/page.tsx` | 554 | Public listing RSC. Reads listing+host+payout, photos, amenities, tags, `deriveBookable`, `publicListing`, `buildAllInTable`, `getAvailability` for **today**. Renders gallery, header, About, Amenities, Location, Availability, and the rail. | The reorder, key-facts strip, host block, cancellation section, `[11-13]` site, searched-window pre-open. |
| `src/app/listings/[id]/(detail)/layout.tsx` | 36 | Public shell for the detail route group. | Untouched unless the sticky-bar clearance needs a wrapper. |
| `src/app/listings/[id]/(detail)/loading.tsx` | 29 | Listing route skeleton. | Must match `MOSAIC_ASPECT` (16/9) so the gallery does not shift. |
| `src/app/listings/[id]/(detail)/not-found.tsx` | — | 404 boundary. | Untouched. |
| `src/app/listings/[id]/book/layout.tsx` | 63 | **The minimal SHELL-03 header.** `SiteChrome brand="FitOut" brandHref={null}` at `:59`, no `nav`, no `actions`, no footer. Header comment names Phase 12 as the `actions` slot's owner. | **SHELL-03 / D-49.** Gains the `HoldProvider` and the countdown in the `actions` slot. |
| `src/app/listings/[id]/book/page.tsx` | 453 | Checkout RSC. Owner-gated hold read, D-42 confirmed-redirect, D-44 expiry state, D-108 surcharge split, OC-07 partial grant, cancellation rungs, `totalLabel`. Builds `summary` and `breakdown` as **server nodes** and hands them to `ReserveView`. `<h1>` at `:435` reads `Review and book`. | **BFLOW-06 / D-50 / D-51.** The disclosure, the sticky bar, the `<h1>` copy, the way-back link, the hold publisher. |
| `src/app/listings/[id]/book/loading.tsx` | — | Checkout skeleton. | Should reflect the new single-column shape. |
| `src/app/listings/[id]/opengraph-image.tsx` | — | Listing OG route. | **D-58** — the baseline trap (200 without a DB → `GenericCard` at 25,844 B). |

### Components — search

| Path | Lines | Key facts measured |
|---|---|---|
| `src/components/search/search-result-card.tsx` | 284 | Rate-only price at `:137-154` (header comment `:141-144` is the D-37 rule). Meta order at `:183-245`, pinned by `tests/search/search-card-open.test.tsx` case (9). **Link params at `:167-179`** — writes `?date=YYYY-MM-DD&start=HH:mm&end=HH:mm` (drop-in: date alone). Tooltip explicitly refused at `:214-217`. |
| `src/components/search/search-results.tsx` | 291 | `"use client"`. `ResultsGrid` at `:56-70` is `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6` (**the D-57 gutter**). `pushWith` at `:91-100` is the URL mutation seam Undo will use. Inline fetch error at `:172-185` (`role="alert"`, **`[11-18]` RESOLVED — do not reopen**). Zero-result `EmptyState` + three hatches at `:236-260`. "You might also like" divider at `:262-271`. Cold start at `:281-287`. |
| `src/components/search/search-bar.tsx` | ~420 | RHF form. `Within` radius **`<Select>`** at `:379-394` (`id="search-radius"`, `SelectValue` renders `{r} km`). Price `<Popover>` at `:337-378`. Date `<Popover>`+`Calendar` at `:248-292`. **No chip component exists anywhere** — see Pitfall 6. |

### Components — listing / gallery

| Path | Lines | Key facts measured |
|---|---|---|
| `src/components/listing/photo-gallery.tsx` | 68 | Presentational, **server-safe (no hooks)**. Today: one 16/9 `AspectRatio` cover + a `grid-cols-2 sm:grid-cols-4` strip of the rest. `alt` is `` `${title} — cover photo` `` / `` `${title} — photo ${i+2}` ``. Zero state at `:22-33`. **The lightbox makes part of this interactive → a client boundary appears here.** |
| `src/components/listing/drop-in-badge.tsx` | — | Shipped; renders on the title line and beside `Availability`. |
| `src/components/listing/listing-map-panel.tsx` | — | The `Location` section's map. Note `[11-18]`/overflow-320's finding: leaflet tiles overflow inside an `overflow:hidden` pane and are correctly *not* counted as offenders. |

### Components — availability

| Path | Lines | Key facts measured |
|---|---|---|
| `src/components/availability/availability-calendar.tsx` | 432 | **The pivot file.** Exports `BookingSelectionProvider` (`:82-92`), `useBookingSelection` (`:95-101`), `AvailabilityCalendar` (`:128-308`), `RailSelectionSummary` (`:333-375`), `RailPassSummary` (`:397-432`). Owns `day`/`dayAvail`/`loading`/`error` in local `useState` at **`:141-144`**. Drop-in fork at `:177-194`. `Calendar` + `CalendarDayButton` override at **`:236-259`**. **Slot skeleton at `:264-269`** — `aria-live="polite" aria-busy="true"` on an **unnamed div**, 8 × `Skeleton h-11 w-20`. Day error `role="alert"` at `:271`. Rail `AllInTable` lookup at `:358` / `:416`. `Est.` at `:369` and `:426`. |
| `src/components/availability/slot-picker.tsx` | 300 | Chip base class at **`:95`** — `flex h-auto min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 text-sm font-medium`. **There is no `min-w-20`** (see Pitfall 9). Bare `aria-live="polite"` on a `<p>` at `:257`. Gap hint `role="status" aria-live="polite"` at `:266-267` — **this is the undeclared soft-accent recipe the UI-SPEC promotes to accent item 9**. |
| `src/components/availability/date-pass-picker.tsx` | 360 | The drop-in surface (a Phase-12 surface per the scope note). Owns its own day state; carries `aria-live` + `role="alert"`. |
| `src/components/availability/spots-left-chip.tsx` | — | `role="status" aria-live="polite"` — kept. |

### Components — booking / checkout

| Path | Lines | Key facts measured |
|---|---|---|
| `src/components/booking/price-breakdown.tsx` | 221 | **A Server Component** (`:45` "Pure display, no hooks → a Server Component (no "use client")"). Three frozen money props; zero arithmetic. Run line `:137-144`, D-108 surcharge `:157-165`, `Service fee` row `:179-184`, Total + `data-testid="price-total"` at `:207-212` (`text-xl font-semibold tabular-nums`), trailing line `:218`. **GREP TRIPWIRE documented at `:26-30`.** |
| `src/components/booking/reserve-view.tsx` | 96 | `"use client"`. Owns the expiry swap (`:40-52`). Grid `lg:grid-cols-[1fr_360px]` at `:55`. `PanelCard sticky` rail at `:88-92` holding `{breakdown}` → `HoldCountdown` → `ReserveActions`. Header says outright: *"Container swap only — Phase 12 owns the checkout redesign."* |
| `src/components/booking/reserve-actions.tsx` | 98 | `"use client"`. Confirm button `:76-85`; **pending label `Taking you to checkout…` at `:84`** (BFLOW-07's actual gap). Reassurance line `:86-88`. Lease-refusal `role="status"` at `:92`. ⚠ header `:23-28`: do **not** import `CHECKOUT_IN_FLIGHT_MESSAGE` — it pulls the ORM into the client bundle. |
| `src/components/booking/hold-countdown.tsx` | 88 | `"use client"`. `role="timer" aria-live="off"` on the digits at `:70`. **Announces at BOTH the 60s threshold and expiry (`:62-66`)** — D-49 removes the expiry one. Renders three visible pieces: `Held for {m:ss}`, the "We're holding this slot while you review." line at `:81`, and the sr-only region at `:83-85`. `onExpire` callback ref pattern at `:38-57`. `suppressHydrationWarning` at `:76`. |
| `src/components/booking/book-cta.tsx` | 249 | `"use client"`. Submit at `:105-163`; **the collision branch at `:153-160`** — sets the server's sentence as a notice and calls `router.refresh()`. Notice rendered `role="status"` at `:236-240`. Resume auto-fire at `:177-183`. |
| `src/components/booking/hold-expired-state.tsx` | — | `role="status"` + **`aria-live="assertive"`** — GATE-03 rule 7 flips it to polite. |
| `src/components/booking/cancellation-policy-disclosure.tsx` | — | Rendered in the listing rail at `(detail)/page.tsx:479` and at checkout. D-46 adds a second, full section. |
| `src/components/booking/pax-stepper.tsx` / `pass-stepper.tsx` / `partial-grant-notice.tsx` | — | Checkout-adjacent; unchanged by this phase except for layout. |

### Server actions and money/availability seams (do not weaken)

| Path | Key facts |
|---|---|
| `src/app/actions/booking.ts` (1022) | `PlaceHoldResult` union at `:58-66` — `taken` (`:232`, `:344`) and `sold-out` (`:496`). `placeHold` at `:122`, `placeOpenHold` at `:390`, `confirmBooking` (`ConfirmResult` at `:81-88`). |
| `src/app/actions/availability.ts` (119) | **`getDayAvailability(listingId, dayLocal)`** at `:73-89` — public, read-only, no session, Zod-validated, re-enforces published+non-deleted. **This is the function D-55's in-place refresh must call.** `getOpenMonthAvailability` at `:103-118`. |
| `src/lib/booking/all-in-table.ts` (79) | `AllInTable = { hourly: Record<number,number>; fullDay: number|null; perPass: Record<number,number> }`. `buildAllInTable` at `:56-79`. Server-only **by transitivity** (imports the guarded `service-fee.ts`). Header records the measured `n × allIn(unit) ≠ allIn(n × unit)` divergence. **D-38 widens each value to `{space, fee, total}`.** Pinned by `tests/booking/all-in-table.test.ts`. |
| `src/lib/search/query.ts` (292) | Two-stage search. Stage-1 SQL `:195-234`. `effectivePriceSql` `:182-183`. **Stage-2 sequential per-candidate loop `:254-289`.** `fetchLimit = SEARCH_PAGE_SIZE*2+1 = 41` when a date is picked (`:192`). |
| `src/lib/validation/booking.ts` | `searchParamsSchema` (radius presets `[2,5,10,25]`, default 10; `date`/`start`/`end` free-form shape-only). `slotSelectionSchema` — **`startUtc`/`endUtc` are `z.string().datetime()`**. `openHoldSchema` — `date` is `YYYY-MM-DD`, no window fields. |
| `src/lib/availability/units.ts` | `"That time was just taken. Pick another slot."` at `:663`. 23P01/40P01 → the calm message (`mapBookingError`). |
| `src/lib/availability/open-capacity.ts` | `SOLD_OUT_MESSAGE = "Just sold out — pick another date."` at `:76`. |
| `src/lib/money.ts` | **Explicitly isomorphic** (`:6-7`: "no `"use client"`/`"use server"` directive, so both Server Components and Client Components can import it"). `DISPLAY_CURRENCY = "php"`. |

### The pattern layer and the typed inventories

| Path | Key facts |
|---|---|
| `src/components/patterns/result-card.tsx` (181) | The search tile's container; `AspectRatio 4/3`, price rendered last. |
| `src/components/patterns/panel-card.tsx` (148) | `sticky` boolean → `lg:sticky lg:top-20` at **`:132`**; the 80px arithmetic lives here alone, pinned by `tests/design/sticky-offset.test.ts`. |
| `src/components/patterns/card-grid-skeleton.tsx` (67) | `role="status" aria-busy aria-label` + `data-testid="skeleton-card-grid"` at `:42`; grid is **`grid gap-5 sm:grid-cols-2 lg:grid-cols-3`** at `:44` (the other half of the D-57 gutter). |
| `src/components/patterns/responsive-dialog.tsx` (209) | RESP-01's one overlay primitive. `data-testid="responsive-dialog"`, `SHEET_PRESENTATION` uses `max-sm:` classes only (`:107-122`), `max-h-[85dvh] overflow-y-auto`. Conditional `aria-describedby` spread at `:184-186`. **No grab handle, no drag.** |
| `src/components/patterns/site-chrome.tsx` (360) | `brand`, `brandHref`, `nav`, `actions` slots. |
| `src/components/patterns/empty-state.tsx` / `error-state.tsx` | STATE-04/STATE-02 shells. |
| `src/lib/design/measurements.ts` (177) | 9 declared constants today (`RESULT_CARD_MEDIA`, `ROW_CARD_HEIGHT`, `ROW_CARD_THUMB`, `HEADER_HEIGHT`, `AUTH_SLOT_BOX`, `AUTH_SLOT_CONTROL`, `AUTH_SLOT_ICON`, `NOTIFICATION_BELL_BOX`, `PANEL_MIN_HEIGHT`, `TEXT_BAR_HEIGHT`). Lives outside the leak-gate tree but **inside Tailwind's `src/` source root — load-bearing** (`:22-26`). UI-SPEC adds 7. |
| `src/lib/design/selector-contract.ts` (320) | **17 declared ids today**: `price-total`, `skeleton-card-grid`, `skeleton-row-list`, `skeleton-panel`, `result-card`, `row-card`, `panel-card`, `page-header`, `empty-state`, `error-state`, `responsive-dialog`, `site-header`, `site-brand`, `site-nav`, `site-auth-slot`, `site-footer`, `legal-placeholder-notice`. A total `Record` → **adding an id without a row is a compile error**. Floors: `getByRole >= 92`, `getByLabel >= 30`. |
| `src/lib/design/contrast-pairs.ts` (472) | 40 declared pairs + declared exclusions; `tests/design/contrast.test.ts` is the authority (D-12). |
| `src/lib/design/visual-baselines.ts` | 27 declared surfaces (`dev-theme`, `root-not-found`, `global-error`, `auth-login`, `og-root`, `og-listing`, `og-invite`, …), two blocked. Type-level count assertions run under `tsc --noEmit`. |
| `src/lib/design/status-tones.ts`, `tokens.generated.ts` | Inherited. |

### The vendored primitives (30 files, `src/components/ui/`)

`alert, aspect-ratio, avatar, badge, button, calendar, card, checkbox, command, dialog, dropdown-menu, form, input-group, input, label, popover, progress, radio-group, scroll-area, select, separator, skeleton, sonner, switch, table, tabs, textarea, toggle-group, toggle, tooltip`

- Import style is the **single-package** form: `import { Dialog as DialogPrimitive } from "radix-ui"` (`dialog.tsx:4`, `popover.tsx:4`). `radix-ui@1.4.3` confirmed installed.
- `ui/calendar.tsx` — `[--cell-size:--spacing(7)]` = **28px** at `:34`; `classNames` spread is **last** at `:134` (so a call-site `classNames.day` **replaces**, does not merge); `CalendarDayButton`'s class string at `:221` carries `aspect-square size-auto w-full min-w-(--cell-size)` and the forked DS-05 focus recipe. `react-day-picker@10.0.1`.
- `src/components/ui/sheet.tsx` **does not exist** and `tests/design/sheet-absent.test.ts` asserts it, including a `package.json` scan for `vaul`/gesture libraries (`:364-372`).

---

## Standard Stack

### Core — nothing new is introduced

| Library | Version (verified in `node_modules`) | Purpose | Why standard |
|---|---|---|---|
| next | 16.2.7 | App Router, RSC, server actions | Shipped. |
| react / react-dom | 19.2.7 | UI | Shipped. |
| radix-ui | 1.4.3 (single-package) | Dialog, Popover, **Collapsible**, Select, Tooltip… | Already the app's only overlay/primitive source. Confirmed `@radix-ui/react-collapsible` is a dependency of the meta-package. |
| react-day-picker | 10.0.1 | The month grid, `timeZone` support, `components.DayButton` override | Shipped and already driven venue-tz. |
| lucide-react | 1.17.0 | Icons (`ClockIcon`, `InfoIcon`, chevrons) | Shipped. |
| tailwindcss | 4.3.0 | `@theme inline`, `source("../")` rooted at `src/` | Shipped. |
| date-fns 4.4.0 + @date-fns/tz 1.5.0 | | venue-tz formatting at the edges | Shipped; the only legal date path. |
| tailwind-merge | 3.6.0 | `cn()` conflict resolution | Relevant to Pitfall 2. |

### Supporting — the one registry addition

| Block | Source | Purpose | Verification |
|---|---|---|---|
| `collapsible` | shadcn official registry, `radix-nova` style | The mobile price disclosure (BFLOW-06 / D-50) | **Fetched this session** from `https://ui.shadcn.com/r/styles/radix-nova/collapsible.json`: the file's sole import is `import { Collapsible as CollapsiblePrimitive } from "radix-ui"` — **no new npm dependency**; and the content contains **zero Tailwind classes, zero `dark:` variants, zero hex colours, zero `text-[NNpx]`**. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| shadcn `collapsible` | Hand-rolled button + `hidden` region | Re-implements `aria-expanded`/`aria-controls`/the animation seam. REQUIREMENTS.md § Out of Scope names "rebuilding components shadcn already provides". **Rejected.** |
| `ui/dialog` full-screen lightbox | `ResponsiveDialog` (the sheet) | RESP-01's sheet is for *panels*; a photo viewer wants the whole screen at every width (D-45). **Rejected by decision.** |
| shadcn `sheet` block | — | Refused in `ARCHITECTURE.md` §6.3 and re-asserted by `tests/design/sheet-absent.test.ts`. Reversing it needs the same treatment as any recorded decision. **Do not propose.** |
| `useMediaQuery` fork for rail-vs-sheet | `hidden` + hoisted state | The fork breaks SSR, doubles the VR surface and duplicates content for screen readers. **Rejected by the UI-SPEC with three attached assertions.** |

**Installation:**

```bash
npx shadcn@4.10.0 add collapsible
# then verify, in the SAME commit:
git diff --stat package.json          # must be EMPTY (condition 1 of the UI-SPEC's three)
npx vitest run --config vitest.design.config.ts tests/design/dark-scope.test.ts
npx vitest run --config vitest.design.config.ts tests/design/leak.test.ts tests/design/focus-recipe.test.ts
```

**Version verification note:** every package above was read from `node_modules/*/package.json` in this session rather than from `package.json` ranges, so the numbers are the **installed** versions, not the declared caret ranges.

---

## Package Legitimacy Audit

**This phase installs ZERO external packages.** The only addition is a shadcn *registry block*, which is source code vendored into `src/components/ui/collapsible.tsx` — not an npm install. `slopcheck` and `npm view` are therefore not applicable; the equivalent verification is a fetch of the registry item itself, which was performed.

| Artefact | Registry | Kind | Source verified | Adds npm dep? | Disposition |
|---|---|---|---|---|---|
| `collapsible` | `ui.shadcn.com` official, `radix-nova` style | vendored source file | ✅ fetched `https://ui.shadcn.com/r/styles/radix-nova/collapsible.json` this session | **No** — imports `"radix-ui"`, already installed at 1.4.3 | Approved, with the three UI-SPEC conditions attached |
| `radix-ui` | npm | already installed 1.4.3 | ✅ `node_modules/radix-ui/package.json` read; `@radix-ui/react-collapsible` present in its `dependencies` | n/a | Already present |

**Packages removed due to a slopcheck [SLOP] verdict:** none — no packages proposed.
**Packages flagged as suspicious [SUS]:** none.

**Third-party registries:** `components.json` declares `"registries": {}` — zero third-party. The plan must not add one.

**The one guard the planner must write into the plan:** if `npx shadcn add collapsible` writes a `@radix-ui/react-*` entry into `package.json`, **stop and hand-roll instead**. `tests/design/sheet-absent.test.ts:364-372` already scans `package.json` for gesture libraries; a new Radix sub-package is the same class of scope alarm.

---

## Architecture Patterns

### System Architecture Diagram

```
                          ┌─────────────────────────────────────────────────┐
  booker types a query    │  BROWSER                                        │
  ───────────────────────>│  SearchBar (RHF)  ──serialises filters to URL──┐ │
                          └────────────────────────────────────────────────┼─┘
                                                                           v
        ┌──────────────────────────────────────────────────────────────────────────┐
        │ RSC  (public)/page.tsx                                                   │
        │   searchParamsSchema.safeParse  ──> searchListings(db, params)           │
        │        │                                 │                               │
        │        │                          Stage-1 SQL (PostGIS radius, category, │
        │        │                          price, weekday, bookable gate)         │
        │        │                                 │                               │
        │        │                          Stage-2 per-candidate getAvailability  │
        │        │                          (SEQUENTIAL, up to 41 reads)           │
        │        v                                 v                               │
        │   results.length === 0 ?  ──yes──> RELAXATION LADDER (NEW, D-52)         │
        │        │                            rung1 radius → rung2 price →         │
        │        │                            rung3 time  → rung4 date             │
        │        │                            stop at first rung with rows         │
        │        no                                │                               │
        │        v                                 v                               │
        │   SearchResults ◄──────── band copy + relaxed barDefaults ───────────────┤
        └──────────────────────────────────────────────────────────────────────────┘
                    │  card link carries ?date=&start=&end=  (venue-local HH:mm)
                    v
        ┌──────────────────────────────────────────────────────────────────────────┐
        │ RSC  listings/[id]/(detail)/page.tsx                                     │
        │   publicListing() ─ photos ─ publicProfile() ─ deriveBookable()          │
        │   buildAllInTable()  <── computeServiceFee (server-only, guarded)        │
        │   getAvailability(today | THE SEARCHED DAY  ← NEW)                       │
        │        │                                                                 │
        │        ├──> <PhotoGallery>  ──(new client island)──> Lightbox (Dialog)   │
        │        ├──> KeyFacts strip / About / Amenities / Availability / Location  │
        │        │        / Cancellation / Host                                    │
        │        └──> BookingSelectionProvider                                      │
        │               ├── day + dayAvailability HOISTED HERE  (NEW, one fetch)   │
        │               ├── <BookingPanel> in rail  (max-lg:hidden)                │
        │               └── <BookingPanel> in ResponsiveDialog (lg:hidden)         │
        │                        └── PriceBreakdown(surface="rail"|"sheet")        │
        └──────────────────────────────────────────────────────────────────────────┘
                    │  BookCta ──> placeHold / placeOpenHold  (POST server action)
                    │
        taken/sold-out │                                    ok │ redirect ?hold=<id>
                    v                                          v
   ┌───────────────────────────────┐        ┌──────────────────────────────────────┐
   │ COLLISION, IN PLACE (D-55)    │        │ RSC book/page.tsx (owner-gated read)  │
   │  getDayAvailability(day) ─────┤        │   frozen quote: space/fee/total       │
   │  setState(notice + newDay)    │        │   summary + breakdown as server nodes │
   │  ONE role="status", focus moves│       └───────────────┬──────────────────────┘
   └───────────────────────────────┘                        │
                                       ┌────────────────────┴───────────────────────┐
                                       │ book/layout.tsx  <HoldProvider>            │
                                       │   SiteChrome brandHref={null}              │
                                       │     actions slot ─> <HoldCountdown>        │
                                       │   {children} ─> ReserveView (expiry swap)  │
                                       │                   └─ ReserveActions        │
                                       └────────────────────┬───────────────────────┘
                                                            │ confirmBooking()
                                                            v
                                            PayMongo hosted checkout (off-site)
```

### Recommended Project Structure

```
src/components/
├── search/          # search-result-card, search-results, search-bar (+ relax band)
├── listing/         # photo-gallery (+ lightbox), key-facts strip, host block
├── availability/    # availability-calendar (day state HOISTED), slot-picker, date-pass-picker
├── booking/         # price-breakdown (→ client), hold-countdown, hold-provider,
│                    # reserve-view, reserve-actions, book-cta, collision-notice, booking-panel
└── patterns/        # UNCHANGED — no fourth card pattern, no second overlay mechanism
src/lib/design/      # measurements.ts (+7), selector-contract.ts (+N), contrast-pairs.ts (+1),
                     # live-regions.ts (NEW), visual-baselines.ts (+ this phase's surfaces)
src/lib/search/      # query.ts (+ the relaxation ladder, server-side)
```

**Membership rule (inherited, unchanged):** if it imports a domain type, a server action or product copy, it is **not** a pattern. `PriceBreakdown` is domain. `ResponsiveDialog` is a pattern. Nothing moves across that line this phase.

---

### Pattern 1 — Hoisting the day/availability read above two placements

**What:** `AvailabilityCalendar` currently owns `day`, `dayAvail`, `loading` and `error` in local state (`availability-calendar.tsx:141-144`). The D-48 sheet mounts a second `<BookingPanel>`, so two copies would hold two independent days and issue two fetches. AC#21 requires **exactly one** availability request per day selection at both 375px and 1280px.

**When to use:** immediately, in the first wave — the collision recovery (Pattern 8), the searched-window pre-open (Pitfall 4), and the sheet (Pattern 6) all depend on it.

**How:** move `{ day, dayAvail, loading, error, selectDay }` into `BookingSelectionProvider` (or a sibling `useDayAvailability` hook mounted once inside it, above both placements). `AvailabilityCalendar` then becomes a pure consumer. The provider already wraps the entire booking grid at `(detail)/page.tsx:338`, so the mount point exists.

**Falsifiable:** selecting a day at 375px and at 1280px issues exactly one `getDayAvailability` call each (assert via `page.route` interception or a request counter).

**Note on the `hidden` copy and Playwright:** Playwright's `getByRole` excludes elements hidden from the accessibility tree by default, so the `max-lg:hidden` copy will not satisfy AC#20's `=== 1` count by accident. `getByTestId` **would** still find it — so AC#20 must be written with role queries, not test ids.

### Pattern 2 — The full-screen, keyboard-pageable photo lightbox (BFLOW-03 / D-45)

**What:** every mosaic photo and the `Show all {N} photos` button open `ui/dialog` full-screen, opening **on the photo that was tapped**, with `{i} / {N}`, prev/next, arrow-key paging, `Escape`, focus trap and focus return.

**What Radix gives you for free** (do not re-implement): focus trap, focus restore to the trigger, `Escape` close, scroll lock, `aria-modal`, and the portal. `ui/dialog.tsx` is the vendored single-package form and already carries the DS-05 focus recipe and an `sr-only` "Close".

**What you must add:**
- **A required accessible name.** `ResponsiveDialog` makes `title` a required string precisely because an untitled dialog is a WCAG 4.1.2 failure and Radix warns at runtime. The lightbox is a raw `Dialog`, so it needs its own `sr-only` `DialogTitle` — `Photos of {title}`.
- **Arrow-key paging.** Radix does not page anything. Attach `onKeyDown` to `DialogContent` handling `ArrowLeft`/`ArrowRight`; do **not** attach a `window` listener (it would fire for the closed dialog too).
- **A distinct close name.** The booker path renders **two** visible close buttons (this and the booking sheet). `DialogClose`'s vendored default is the bare `Close`; declare `Close photos` here and `Close booking` on the sheet.
- **Paging swaps the `src`, with no transition.** A cross-fade between two arbitrary host photos is 200ms of noise and a second thing to keep inside the 320ms budget.
- **`alt` becomes `{title} — photo {i} of {N}`** on both the mosaic and the lightbox, replacing the shipped `— cover photo` / `— photo {i}`.

**The structural consequence the spec does not name:** `photo-gallery.tsx` is currently **server-safe with no hooks** (its header says so). The lightbox needs open state, so either the whole file becomes `"use client"` or the mosaic stays a Server Component and the interactive layer is a small sibling client island that receives the photo array. **Prefer the island** — it keeps the 16/9 plate and the `alt` strings server-rendered for the OG/no-JS path and keeps the client bundle small.

**Anti-pattern:** a carousel. Named in REQUIREMENTS.md § Out of Scope: *"hides supply and is a recurring accessibility regression."*

### Pattern 3 — The 44px calendar cell, the skeleton, and the motion budget (BFLOW-05)

**The measured debt:** `ui/calendar.tsx:34` sets `[--cell-size:--spacing(7)]` = **28px**. Four things read that variable — the day button's `min-w`, both nav buttons (`size-(--cell-size)`), the weekday row, and the caption.

**Override path (no vendored edit):** pass `CALENDAR_CELL = "[--cell-size:--spacing(11)]"` on the `Calendar` root's `className`. That re-sizes nav, weekday and caption in one edit. **It is necessary but not sufficient — see Pitfall 2 for the day-button half.**

**Two `classNames`-override facts the planner needs:**
- `ui/calendar.tsx:134` spreads `...classNames` **last**, so a call-site `classNames={{ day: "…" }}` **replaces** the composed default entirely (losing `group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none` and the range selectors). If you take this path, restate everything.
- The `components={{ DayButton }}` path already in use at `availability-calendar.tsx:251-256` passes `className` through `cn(base, defaultClassNames.day, className)`, i.e. tailwind-merge. This is the lower-risk path — but see Pitfall 2 for the one merge outcome that must be measured rather than assumed.

**The skeletons — and the a11y that makes their 1.09:1 fill legal:**

| Skeleton | Box | Region |
|---|---|---|
| Day panel (slots) | `SLOT_CHIP_BOX` × 8 | `role="status" aria-busy="true"` + `sr-only` "Loading times for {day}"; bars `aria-hidden` |
| Month grid (NEW) | 7 × 6 at `CALENDAR_CELL` | `role="status" aria-busy="true"` + `sr-only` "Loading the calendar"; `data-testid="skeleton-calendar"` |
| Gallery | `MOSAIC_ASPECT` plate | part of `(detail)/loading.tsx` |

`availability-calendar.tsx:265` is today `<div aria-live="polite" aria-busy="true">` — **a live region with no role and no accessible name, which announces to nobody.** `role="status"` is `nameFrom:author`, so an `aria-label`/`sr-only` child is what makes it a named region. This is the same defect Phase 11 measured on `/` and fixed with `CardGridSkeleton`.

**Motion:** the tokens are `--motion-fast: 120ms`, `--motion-base: 200ms`, `--motion-slow: 320ms` (`globals.css:416-419`), and `tests/design/motion-budget.test.ts` caps every named duration at 320ms with `animate-spin`/`animate-pulse` exempt. The correct month-change treatment is **no enter/exit animation on the month grid at all** — a falsifiable absence beats a number under a cap, and an animating month grid is a layout-shift generator.

### Pattern 4 — One `PriceBreakdown`, two (three) surfaces (BFLOW-04 / D-38…D-42)

**The mechanism is a widened `AllInTable`, and it is a table-shape change:**

```ts
// src/lib/booking/all-in-table.ts — the shape D-38 needs
export type AllInParts = { space: number; fee: number; total: number };
export type AllInTable = {
  hourly: Record<number, AllInParts>;
  fullDay: AllInParts | null;
  perPass: Record<number, AllInParts>;
};
```

Everything that makes the current table correct must survive: `computeServiceFee`'s rate argument stays **omitted** (its default IS `SERVICE_FEE_BPS`, so the table is produced by the same call checkout makes); the table stays keyed by the selection the booker actually made, because the fee rounds **once** over the whole space price and a client-side multiply drifts by up to n−1 centavos; a **missing key still means no estimate line**, never a client computation. `tests/booking/all-in-table.test.ts` pins both halves and must be extended, not replaced.

**Three declared ids, one per surface** — `price-total` (checkout), `rail-price-total` (listing rail), `sheet-price-total` (mobile sheet). A single shared id would resolve to two elements on mobile and `e2e/price-parity.spec.ts` would parse whichever came first.

**The surface prop:** `surface?: "rail" | "checkout"` defaulting to `"checkout"` so the shipped call site is byte-identical. Only two things vary: the trailing line and the total's `data-testid`. Rows, order, weights, `tabular-nums` and the word `Total` are **identical** — that identity is what BFLOW-04 is buying.

⚠ **`price-breakdown.tsx`'s GREP TRIPWIRE binds any copy edit.** Two whole-source greps guard the file; none of the guarded phrases may be spelled contiguously anywhere in it, comments included. The rail's line is a strict prefix of the shipped checkout line, which is what keeps it safe. Do not "improve" it.

**The fee popover (D-39):** `ui/popover.tsx` is vendored. Trigger is a 16px glyph inside a **44px hit area** with `aria-label="What is the service fee?"`. Radix gives click-outside + `Escape` + focus return. **The copy states no percentage** — `SERVICE_FEE_BPS` is server-only and a non-public env override does not reach the browser bundle, so a hardcoded "5%" is a number that can silently go stale while checkout charges something else.

### Pattern 5 — The checkout header, the hold, and the composition problem (SHELL-03 / D-49)

**The problem, stated precisely:** the countdown must render in the **header**, which `book/layout.tsx` owns. The `expiresAt` value and the expiry swap live in the **page**, which is the layout's child. **A layout cannot receive props from its page.**

**The mechanism:**

```tsx
// book/layout.tsx  (stays a Server Component; HoldProvider is the client boundary)
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <HoldProvider>
      <div className="flex min-h-dvh flex-col">
        <SiteChrome brand="FitOut" brandHref={null} actions={<HoldCountdownSlot />} />
        {children}
      </div>
    </HoldProvider>
  );
}
```

This is the standard App Router "client provider wrapping `{children}`" composition: `children` is still rendered on the server and passed through as an already-rendered node, so **wrapping it in a client provider does not client-ify the page**. The page then renders a tiny client publisher that writes `expiresAt` into the context; `HoldCountdownSlot` subscribes and renders the digits; `reserve-view.tsx` subscribes to the same context for its expiry swap.

**The context must be bidirectional**, and the UI-SPEC does not say so: today `reserve-view.tsx:90` passes `onExpire` **down** into `HoldCountdown`. With the countdown in the header the wiring inverts — the countdown must publish `expired: true` **up** into the provider, and `ReserveView` reads it. Two values total (`expiresAt: string | null`, `expired: boolean`). **No hold data is fetched in the layout**, and no money or availability computation moves client-side.

**Header box stability:** `HOLD_COUNTDOWN_BOX = "h-8 min-w-24"` — 96px reuses `AUTH_SLOT_CONTROL`'s width rather than inventing a second reservation. `14:52`, `0:09` and `Hold expired` are different character counts; without a floor the header reflows once per session.

**The one way back (the D-59 answer):** exactly one `<a href>` inside the checkout `<main>`, `href` starting `/listings/`, labelled `Back to the listing`, with `We'll keep your hold — the timer keeps running.` beneath. It is **not** in the header, **not** in the rail, **not** in the sticky bar. Phase 11's AC#5/AC#7 survive intact: **zero** `<a href>` inside `[data-testid="site-header"]`, **no** `[data-testid="site-footer"]`. This is safe by construction because `createPendingHold` replays a booker's **own** hold for the same window rather than minting a second one.

**BFLOW-07 is a two-string change:** `reserve-actions.tsx:84`'s pending label becomes `Taking you to PayMongo…`, and the line at `:86-88` names amount + rails + destination. No dialog, no interstitial — a second tap between a decided booker and paying, on a 15-minute clock, is the thing D-51 refuses.

### Pattern 6 — The mobile path: sticky bar → sheet → single-column checkout (RESP-02 / BFLOW-06)

- **Sticky bars** get `shadow-sticky`'s **first two call sites** (Phase 11 recorded it at zero and named this phase as the successor). Its `-1px` y-offset is an **upward** cast — it must never go on a top header.
- **`--z-sheet` (20) still has zero call sites after this phase**, and the zero should be re-asserted with its reason: the booking sheet is `ResponsiveDialog`, i.e. the vendored dialog in another *presentation*, so it renders at `--z-dialog` (30); the lightbox is a dialog at 30; the sticky bars are `z-(--z-sticky)` (10) and are therefore correctly *beneath* the sheet's scrim.
- **Page clearance:** `STICKY_BAR_CLEARANCE` (`pb-20` = 64 bar + 16 gap) on any page rendering a bottom bar. Without it the last row of content sits under the bar permanently.
- **The sheet's pinned action bar** is `sticky bottom-0` **inside** the scroll container (`max-h-[85dvh] overflow-y-auto`), so it is reachable no matter how far the booker has scrolled inside the sheet.
- **The disclosure** is `collapsible` with `aria-expanded` + `aria-controls`, ≥44px trigger, caret at `--motion-fast`. **The Total never collapses.**
- **320px is the constraint**, and it is measured, not assumed: seven 44px cells is 308px; at 320px with `px-4` the content box is 288px. See Pitfall 2 — this is where the day-cell override becomes load-bearing rather than cosmetic.

### Pattern 7 — The relaxation ladder, grounded in what the query actually supports (STATE-03 / D-52, D-53)

**What the shipped search can relax, and what it costs:**

| Rung | Relaxes | Mechanism in `searchListings` | Cost |
|---|---|---|---|
| 1 | radius → next preset (`[2,5,10,25]`), to a declared max | Stage-1 `ST_DWithin` bound only | Stage-1 **+ a full Stage-2 loop** (the date is kept) |
| 2 | price ceiling → removed | Stage-1 `effectivePriceSql <= priceMax` dropped | Stage-1 **+ a full Stage-2 loop** |
| 3 | time-of-day → removed, date kept | Stage-2 `hasWindow` becomes false → the date-only branch (`query.ts:285`) | Stage-1 **+ a full Stage-2 loop** |
| 4 | date → removed, time-of-day kept | `picked === null` ⇒ `needsAvailabilityFilter` false ⇒ **Stage-2 is skipped entirely** (`query.ts:239-244`) | **Stage-1 only — the cheapest rung, and it is last** |

**The activity is NEVER relaxed** — `category` is a single combined space-type-OR-activity-tag param (`query.ts:220-223`); dropping it is what the shipped fallback does today and is exactly the gap STATE-03 names.

**The measured cost the CONTEXT flagged as an open risk:** Stage-2 is a **sequential `for` loop calling `getAvailability` once per candidate** (`query.ts:255-289`), with `fetchLimit = SEARCH_PAGE_SIZE * 2 + 1 = 41` when a date is picked. So a worst case is 1 original + 4 rung Stage-1 queries **and up to 4 × 41 sequential availability reads**. The UI-SPEC's answer — sequential, stop at first hit, cap at four, fall back to two rungs if a measured budget is exceeded — is sound, but the plan should add one cheap mitigation the spec does not mention: **run the rung queries with `page: 0` and, if the ladder is measured over budget, a reduced `fetchLimit`** so a rung pays for the six cards the band will show, not for 41 candidates.

**What ships today and is replaced:** `(public)/page.tsx:82-98` drops radius, category, priceMax, date, start **and** end in one broadened query and renders the result under an unlabelled `"You might also like"` divider (`search-results.tsx:262-271`).

**Cold start (D-54) is unchanged** — `search-results.tsx:281-287`, `actions={null}`, no hatches. **The inline fetch error is unchanged** — `[11-18]` ruled it a permanent one-action block.

See **Pitfall 5** (Undo loops) and **Pitfall 6** (there is no chip) before planning this.

### Pattern 8 — Collision recovery in place, off the exclusion-constraint path (STATE-07 / D-55)

**How the collision actually reaches the client today:**

```
placeHold()  →  createPendingHold()  →  INSERT inside a transaction
       ↓ 23P01 (exclusion violation) | 40P01 (deadlock) | NoUnitAvailableError
   mapBookingError()  →  { error: "That time was just taken. Pick another slot." }
       ↓
  PlaceHoldResult { ok:false, reason:"taken", error }        (booking.ts:232, :344)
  PlaceHoldResult { ok:false, reason:"sold-out", error }     (booking.ts:496; open-capacity.ts:76)
       ↓
  book-cta.tsx:153-160  →  setNotice(result.error); router.refresh()
```

**Three things this phase must change, in order of importance:**

1. **Replace `router.refresh()` with an explicit day re-fetch.** See Pitfall 3 — refresh provably cannot update the client-held day grid. Call the already-public `getDayAvailability(listingId, day)` and set the hoisted state (Pattern 1). Batch the notice and the new day in one commit so the notice and the struck-through hours land in the same paint. `router.refresh()` may be *kept in addition* for the RSC-side facts, but it is not the mechanism.
2. **Name what happened.** The server sentence is generic (`"That time was just taken. Pick another slot."`) and does **not** name the window. The UI-SPEC's copy does (`{9:00–11:00 AM} was just taken`). The client already holds `selection.startUtc/endUtc` and the venue timezone, so it can compose the named line honestly — but this is a **deliberate departure** from `book-cta.tsx:153-157`'s stated rule that the sentence comes from the server. Record it in the plan: the server sentence is the *ruling*; the named line is a *restatement of the booker's own selection*, not a second copy of a server decision. It must never leak `23P01`.
3. **Drop the rail's selection AND its price.** A stale total beside a window nobody can book is a number the system cannot stand behind. Selection line → `No time selected`, breakdown removed, CTA back to disabled + the shipped hint.

**Exactly one live region.** `book-cta`'s existing `role="status"` notice and the new collision notice must **never both be mounted** — the collision notice supersedes it. Focus moves to the notice (`tabIndex={-1}`); **no `assertive`**, no dialog, no toast, no red.

**The drop-in twin (`sold-out`) uses the identical treatment and the identical grammar** — `book-cta.tsx:160` already routes `taken` and `sold-out` down the same branch (OC-13).

**Checkout-side collisions keep the shipped `HoldExpiredState` untouched.**

### Pattern 9 — Live regions: announce once, not per tick (GATE-03)

**The rule, so a plan does not re-derive it per component:**

| # | Situation | Required markup |
|---|---|---|
| 1 | The **result** of something the user did | `role="status"` (implicit polite). **Never `assertive`.** |
| 2 | A **genuine failure needing a human** | `role="alert"`. Occupancy, expiry and sold-out are **not** failures. |
| 3 | A **ticking value** | `role="timer"` + `aria-live="off"` **on the digits**, and a **separate** `sr-only` polite region whose text changes only at declared thresholds |
| 4 | **Loading** | `role="status" aria-busy="true"` with a non-empty accessible name; every placeholder bar `aria-hidden="true"` |
| 5 | Any live region | Has an accessible name, or is inside a region that does. A bare `aria-live` on an unnamed `<div>` announces to nobody. |
| 6 | Any outcome | **Exactly one** live region announces it. |
| 7 | The whole booker path | **`aria-live="assertive"` is banned.** Where an event must be noticed: polite region + moved focus. |

**Why rule 3 works, mechanically:** a screen reader announces a live region when its *text content changes*. `aria-live="off"` on the digits means the per-second mutation is not announced at all, while `role="timer"` still exposes the element's semantics so a user can query it on demand. The threshold sentence lives in a **different** node whose text changes exactly twice in the component's life (once, after D-49 removes the expiry announcement) — so the announcement count is a property of the DOM, not of a debounce.

**`hold-countdown.tsx` is already the model** (`:70` `role="timer" aria-live="off"`, `:83-85` the sr-only polite region) and is **not** to be re-decided. It needs exactly two changes: **lose the expiry announcement** (`:62-63` — `HoldExpiredState`, the thing that actually replaced the page, owns it under rule 6), and shed its two extra visible lines, which do not fit a 96px header box.

**The measured booker-path inventory (this session): 34 `aria-live` attributes across 18 files.**

`(app)/bookings/[id]/cancel/page.tsx`, `(app)/bookings/[id]/group/page.tsx`, `(app)/bookings/[id]/page.tsx`, `availability/availability-calendar.tsx`, `availability/date-pass-picker.tsx`, `availability/slot-picker.tsx`, `availability/spots-left-chip.tsx`, `booking/expired-approval-state.tsx`, `booking/hold-countdown.tsx`, `booking/hold-expired-state.tsx`, `booking/payment-reversed-state.tsx`, `booking/pending-payment-state.tsx`, `booking/request-countdown.tsx`, `group/invite-card.tsx`, `group/rsvp-confirmation.tsx`, `group/rsvp-form.tsx`, `listing/address-autocomplete.tsx`, `search/search-results.tsx`.

**The booker-path subset this phase owns** is the eight non-`/bookings`, non-`group` files plus the two new regions. The `/bookings/**` and `group/**` files belong to Phase 13 — the plan must declare the file set it audits, because GATE-03's falsifiable claims are stated *over a declared set*.

**Recommended mechanism (from the UI-SPEC, and it matches this repo's converged shape):** declare `LIVE_REGIONS` in `src/lib/design/live-regions.ts` — a const tuple plus a **total `Record`** over the derived union, each row `{ file, kind, announces, why }`. Adding a name without a row becomes a **compile** error, exactly as `selector-contract.ts` demonstrated with a watched red. `src/lib/design/` sits outside the DS-13 leak gate's scanned tree, so the module can quote markup honestly.

### Anti-Patterns to Avoid

- **A computed window total on a search card.** A centavo of rounding breaks D-75's "never goes up".
- **Computing the fee, the total or the rate in a client component.** GATE-05 fails the build; a percentage literal in client copy is the same defect wearing prose.
- **A second `price-total` hook on one page.** The parity spec would parse whichever came first.
- **A tooltip anywhere on the booker path.** Half this traffic is touch. `search-result-card.tsx:214`, D-39 and D-ELM-01 all already refused it; D-56 deletes the last one.
- **Red on a taken slot, a sold-out day, an expired hold or a full space.** `--destructive` on this path is the countdown's final minute and nothing else.
- **A dialog for the collision.** It modals a normal outcome and, at 375px, hides the very grid that is the evidence.
- **`aria-live="assertive"` anywhere**, and **two live regions for one outcome**.
- **A bare `aria-live` on an unnamed `<div>`** — measured, not theorised.
- **A skeleton without `role="status"` and a name** — the 1.09:1 fill exclusion is conditional on that wrapper.
- **`{isMobile ? <A/> : <B/>}` or `useMediaQuery`** to choose the rail vs the sheet.
- **Two mounted availability fetches.**
- **Editing `src/components/ui/calendar.tsx`.** The cell size is a `className` variable override.
- **A grab handle on the sheet**; **installing shadcn `sheet`**; **`shadow-sticky` on the site header**.
- **A schema migration.** GATE-06 binds; `drizzle/` is at `0025`.
- **A checkout baseline captured without a frozen clock**, or an OG baseline without a seeded published listing.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Full-screen modal with focus trap, scroll lock, Escape, focus return | A custom overlay | `ui/dialog` (Radix, vendored) | Focus management and inert-background semantics are where hand-rolled overlays fail; the app must have exactly one focus-trap implementation. |
| A collapsible price disclosure | `useState` + `hidden` + hand-written `aria-expanded`/`aria-controls` | shadcn `collapsible` (Radix) | Re-implements the id wiring and the animation seam for no gain; "rebuilding components shadcn already provides" is out of scope. |
| A click-dismissable fee explainer | A custom bubble | `ui/popover` (vendored) | Click-outside, `Escape`, focus return and collision-aware positioning are all solved; a hover tooltip is wrong for touch. |
| A month grid with venue-tz day math | A hand-built grid | `react-day-picker@10` via `ui/calendar` with `timeZone` | Already driven venue-tz; `disabled` matchers, `startMonth`/`endMonth` and keyboard grid navigation are non-trivial. |
| Slot/day availability | A second SQL predicate or a client filter | `getAvailability` / `getDayAvailability` (the one read model) | `query.ts`'s header names a second availability predicate as **the** anti-pattern — it is what makes search and the calendar structurally unable to diverge. |
| Double-booking prevention | A "query for conflicts, then insert" check | The Postgres GiST `EXCLUDE` constraint inside a transaction | CLAUDE.md § What NOT to Use. The collision UI is a **renderer of the constraint's ruling**, never a pre-check. |
| The all-in price | A client multiply of a unit all-in rate | `buildAllInTable` (server, keyed lookup) | Measured: `n × allIn(unit) ≠ allIn(n × unit)`, drifting by up to n−1 centavos. Pinned by `tests/booking/all-in-table.test.ts`. |
| Currency formatting | A local `Intl.NumberFormat` | `formatMoney` / `DISPLAY_CURRENCY` from `@/lib/money` | One definition; explicitly isomorphic. |
| A fake clock for the countdown baseline | `Date` stubbing in app code | Playwright's `page.clock` API | Introduced in v1.45; the repo runs 1.60.0. |
| Accessible-name assertions | Reading `aria-label` attributes | `dom-accessibility-api` (the tool plan 11-07 used) | Computed name ≠ attribute; `role="status"` is `nameFrom:author`. |

**Key insight:** on this path, hand-rolling is not merely slower — every one of the items above has a *silent* failure mode (an announcement nobody hears, a centavo of drift, a stale grid that looks fresh). The gate layer this milestone built can only catch these when the standard mechanism is the one in use.

---

## Runtime State Inventory

> This is a restructure phase, so the category is answered explicitly rather than skipped. **The finding is that this phase's blast radius is unusually small**, because it renames nothing persisted and adds no migration.

| Category | Items found | Action required |
|---|---|---|
| **Stored data** | **None.** GATE-06 binds; `drizzle/` is at `0025` (verified: `drizzle/0025_audit_resolved_by.sql` is the last file). No column, enum, table or index changes. No stored string is renamed. Booking rows, holds, `quoted_total_cents`, `space_price_cents`, `service_fee_cents` are all read-only to this phase. | none — **and a migration proposed in any plan is a scope alarm to raise explicitly** |
| **Live service config** | **None.** PayMongo webhook URLs, Inngest functions, Cloudinary presets and Resend templates are untouched — the phase changes what the confirm *button says*, not what `confirmBooking` does. | none |
| **OS-registered state** | **None.** No scheduled task, pm2 process or systemd unit references any renamed symbol. | none |
| **Secrets / env vars** | **None renamed.** `SERVICE_FEE_BPS` stays server-only and must **not** gain a `NEXT_PUBLIC_` twin — the fee popover's no-percentage rule exists precisely so nobody is tempted. `DATABASE_URL` is the only env input the price-parity CI job takes, and that contract must not grow. | none — but **guard against a new public env var** in review |
| **Build artefacts / committed fixtures** | **Three real items.** (1) **Visual baselines** under `e2e/visual/surfaces.spec.ts-snapshots/` — this phase adds surfaces to `visual-baselines.ts`, and its type-level count assertion (`BaselineCountIsTwentySeven`) will fail `tsc --noEmit` until updated in the same commit. (2) **`tests/design/dark-scope.test.ts`'s pinned counts** — see Pitfall 10; measured, and the answer is that `collapsible` moves neither. (3) **`selector-contract.ts`'s total `Record`** — every new `data-testid` is a compile error until its row exists. | update `visual-baselines.ts` + baselines in the same commit; add `selector-contract.ts` rows in the same commit as each id; re-measure and state the `dark:` delta (expected: 0) |

---

## Common Pitfalls

> Each of these was measured from source in this session. **Pitfalls 1–7 are places the 12-UI-SPEC contract and the shipped code disagree.**

### Pitfall 1 — `PriceBreakdown` is a Server Component; the rail is a client subtree ⚠ HIGH

**What goes wrong:** D-38 says "the rail renders the REAL `PriceBreakdown`". The rail's summary components (`RailSelectionSummary`, `RailPassSummary`) live inside `availability-calendar.tsx`, which is `"use client"`. `price-breakdown.tsx` has **no** `"use client"` and its header states outright: *"Pure display, no hooks → a Server Component"*. **A Server Component cannot be imported by a Client Component** — the build will fail or the module will be silently re-classified.

**Why it happens:** the checkout page dodges this today by rendering `<PriceBreakdown>` as a *server node* and passing it into `ReserveView` as the `breakdown` **prop** (`book/page.tsx:404-430` → `reserve-view.tsx:89`). That trick does not transfer: the rail's breakdown depends on the **client-held selection**, so the RSC cannot pre-render the right one.

**How to avoid:** add `"use client"` to `price-breakdown.tsx`. This is safe and verified: its only imports are `@/lib/money` (explicitly isomorphic — "both Server Components and Client Components can import it") and `@/components/ui/separator` (already a client-safe primitive). It performs zero arithmetic and receives only finished figures, so **GATE-05 and `server-only` are untouched**. The checkout RSC can still render a Client Component.

**Warning signs:** the file's own header sentence at `:45` becomes false and must be rewritten in the same commit — and the `next build` `server-only` boundary check must be re-run over the widened `AllInTable` path (AC#10).

### Pitfall 2 — the 44px day cell needs TWO overrides, and one of them must be measured ⚠ HIGH

**What goes wrong:** `CALENDAR_CELL = "[--cell-size:--spacing(11)]"` on the `Calendar` root fixes the nav buttons, the weekday row and the caption. It does **not** fix the day button, whose vendored class string (`ui/calendar.tsx:221`) is:

```
relative isolate z-(--z-sticky) flex aspect-square size-auto w-full min-w-(--cell-size) …
```

Two independent consequences:

- **`aspect-square` ties height to width.** AC#14 requires "height **44px** at 320/375/768/1280 … width ≥41px at 320px". With `aspect-square`, a 41px-wide cell is 41px **tall**. The spec's own claim ("the cell's height stays 44px at every width; its width is `1fr`") is **not achievable** without removing `aspect-square` at the call site.
- **`min-w-(--cell-size)` = 44px minimum width.** The `week` row is `flex w-full` and the `day` td is `w-full` (shrinkable), so at a 288px content box the tds compute to ~41.1px — but the *buttons* refuse to go below 44px and overflow. Seven of them overflow by ~3px each. That is a direct route to **AC#23 failing** (`document.documentElement.scrollWidth <= clientWidth` at 320px), which `e2e/overflow-320.spec.ts` already measures on `/listings/[id]`.

**How to avoid:** pass an override through the **existing** `components={{ DayButton }}` seam at `availability-calendar.tsx:251-256` — something in the shape of `aspect-auto min-w-0 h-11 w-full`. No vendored edit; the class flows through `cn(base, defaultClassNames.day, className)`.

⚠ **MEASURE-FIRST, do not assume the merge.** `cn()` is `clsx` + `tailwind-merge@3`. tailwind-merge's `size` group is declared as *conflicting with* `h`/`w` — which removes **earlier** `h-*`/`w-*`, not later ones. So a later `h-11` does **not** delete the earlier `size-auto`; both survive into the class string and the winner is decided by Tailwind v4's own utility ordering in the emitted stylesheet. The plan must include a **rendered `boundingBox()` measurement at 320 / 375 / 768 / 1280 in both themes** before AC#14 is treated as satisfied. The escape hatch if the merge does not resolve cleanly is the `classNames={{ day: … }}` prop — but note `ui/calendar.tsx:134` spreads `...classNames` **last**, so that path **replaces** the composed default and every dropped class (`group/day`, `rounded-(--cell-radius)`, `p-0`, the range selectors) must be restated.

### Pitfall 3 — `router.refresh()` cannot land refreshed availability "in the same paint" ⚠ HIGH

**What goes wrong:** `book-cta.tsx:160` calls `router.refresh()` after a `taken`/`sold-out` result. Next's documentation states: *"`router.refresh()`: … The client will merge the updated React Server Component payload **without losing unaffected client-side React (e.g. `useState`) or browser state**."* `availability-calendar.tsx:142` is `React.useState<DayAvailability | null>(initialDay)` — an initial value React reads **only on mount**. So the refreshed `initialDay` prop is computed, sent, and ignored.

**Compounding:** even a full remount would not help, because `(detail)/page.tsx:314-321` seeds `initialDate`/`initialDay` for **today in the venue tz**, not for the day the booker selected.

**How to avoid:** the collision path calls `getDayAvailability(listingId, selectedDay)` — the public, read-only, Zod-validated server action that already exists at `src/app/actions/availability.ts:73` — and sets the hoisted state (Pattern 1). React 19 batches the notice and the new day into one commit, which is literally what "in the same paint" means.

**Warning signs:** an e2e test that asserts the collision notice appears but never asserts the two lost hours carry `line-through` + `aria-disabled` will pass against the broken behaviour. AC#34 must assert both, **in the same assertion pass**.

### Pitfall 4 — the searched window is written to the URL and nothing reads it ⚠ HIGH (D-59 #1)

**What goes wrong:** `search-result-card.tsx:167-179` writes `?date=YYYY-MM-DD&start=HH:mm&end=HH:mm` onto the listing link and its own header says the purpose is *"so the listing calendar can pre-open that day"*. It does not. `(detail)/page.tsx:158-168` parses `start`/`end` **only when `resume === "1"`**, and `sp.date` **only** on the open-capacity resume branch (`:260-266`). `initialDate` is unconditionally today.

**And there is a live param-format collision on the same route:** the card writes `start` as a venue-local **`HH:mm`**; the resume path parses `start` through `slotSelectionSchema`, where it is a **`z.string().datetime()` UTC ISO instant**. Same param name, same route, two formats. Today a searched window never carries `resume=1` so the mismatch is inert — but any plan that starts reading `start` unconditionally walks straight into it.

**How to avoid:** parse the searched window as its own shape (`date` = `YYYY-MM-DD`, `start`/`end` = on-the-hour `HH:mm`, reusing `parsePickedDate`/`parseWindowHour` from `src/lib/search/query.ts`, which are already exported and already strict), seed `initialDate`/`initialDay` from it, and seed the initial slot selection. Keep the resume path's ISO shape distinct — either by keeping `resume=1` as the discriminator (cheapest, no URL change) or by renaming the resume params. **Do not** widen `slotSelectionSchema` to accept both.

**D-59 #1 also requires:** the D-48 sheet opens on that day already selected, and the D-55 collision refresh must not reset the day to today.

### Pitfall 5 — "Undo restores the original query exactly" is a loop ⚠ HIGH

**What goes wrong:** `(public)/page.tsx` derives everything from the URL. If the ladder is applied server-side on a zero-result query, and Undo restores *the original query string exactly* (AC#31), the RSC re-runs the same zero-result search, the ladder relaxes again, and the band re-renders. Undo is a visible no-op.

**How to avoid:** Undo must carry a suppression flag — e.g. `relax=0`, added to `searchParamsSchema` and honoured in the RSC — so "restores the original query exactly" means *the booker's original filters, plus one flag that says do not relax*. That flag also gives the Phase-17 audit and the e2e specs a deterministic way to render the exhausted `EmptyState`. **This must be resolved in the plan; the UI-SPEC does not decide it.**

### Pitfall 6 — there is no filter "chip" on `/` ⚠ MEDIUM

**What goes wrong:** D-53 and AC#30 speak of "the `where` chip reads `Makati · 25 km`" and "the relaxed filter chip's value string equals the band's changed-constraint substring". **No chip component exists.** The search UI is `search-bar.tsx`, a react-hook-form form of `<Select>`s and `<Popover>`s; the radius control is a `<Select id="search-radius">` whose `SelectValue` renders `{r} km` (`:379-394`). There is no combined location+radius display anywhere.

**How to avoid:** interpret "the chip" as **the existing radius control**, and make the requirement mechanical rather than cosmetic: the RSC passes the **effective (post-relaxation)** values into `SearchBarDefaults` — which already exists and already carries `radius`, `priceMaxCents`, `date`, `start`, `end`, `category` (`(public)/page.tsx:107-116`) — while the URL keeps the booker's original query, and the relaxed control carries the soft-accent tone. AC#30 then compares the `SelectTrigger`'s rendered value string against the band's substring, which is falsifiable against real DOM. **Building a new chip row is net-new UI and collides with D-59's own scope guard** ("Filter drawer with new filters … net-new capability wearing a polish costume").

### Pitfall 7 — the `[11-13]` hydration site has moved; do not locate by line number ⚠ MEDIUM

**What goes wrong:** CONTEXT and UI-SPEC both cite `(detail)/page.tsx:464` as the `TooltipProvider` + `<span tabIndex={0}>` site. **Measured today: `:464` is a D-81 comment.** The `TooltipProvider` block is at **`:526-541`**, and the trailing reassurance `<p>` the mismatch offsets against is at `:543-547`.

**How to avoid:** locate by content (`TooltipProvider` / `Not bookable yet`), not by line. And run the discriminator **before** writing the fix: `npm run build && npm start`, then load `/listings/<seeded id>` and grep the server log. If the mismatch disappears in a production build it was a dev-mode streaming artefact — the fix (delete the tooltip, render a static muted line) is still correct on its own merits, but the **finding must be recorded honestly** rather than claimed as a defect repaired. This phase may not leave it unmeasured (D-56).

### Pitfall 8 — the D-57 gutter is in three files, not two ⚠ LOW

`ResultsGrid` is `gap-4 lg:gap-6` (`search-results.tsx:64`); `CardGridSkeleton` is `gap-5` (`card-grid-skeleton.tsx:44`); and `src/app/(public)/loading.tsx` renders the same pattern. One constant `RESULT_GRID_GAP = "gap-4 sm:gap-6"` in `measurements.ts`, imported by both the grid and the pattern, is the fix — and `tests/design/skeleton-measurements.test.ts` already **bans literal box classes in `patterns/*skeleton*.tsx`**, so the pattern side is compelled. `/host/listings` (Phase 14) adopts the same constant later; it does not get a second one.

### Pitfall 9 — `SLOT_CHIP_BOX`'s derivation is half-true ⚠ LOW

The UI-SPEC derives `SLOT_CHIP_BOX = "h-11 w-20"` from *"the real chip's minimum (`slot-picker` chips are `min-h-11 min-w-20`)"*. **Measured:** `slot-picker.tsx:95` is `flex h-auto min-h-11 flex-col … px-3 py-1.5 …` — there is **no `min-w-20`**; the chip's width is content-driven. If the constant becomes the single source of both the shimmer and the chip, the real chip must gain `min-w-20` **in the same commit**, or the skeleton and the chips are not the same box and the constant's whole argument fails.

### Pitfall 10 — the `dark:` pin is 44, not 54 ⚠ LOW

The UI-SPEC's Registry-Safety condition 2 says *"`tests/design/dark-scope.test.ts` pins the vendored `dark:` occurrence count at 54"*. **Measured this session:** `tests/design/dark-scope.test.ts:293` asserts `expect(vendored.occurrences).toBe(44)` and `:228` asserts `expect(vendored.filesWithHits.length).toBe(13)`. (54 appears only in the file's *comments*, describing the app-wide history.) And the fetched `collapsible` registry item contains **zero** Tailwind classes and zero `dark:` — so **both pins are unaffected and the stated delta is 0**. The condition is still worth executing: re-measure, state the delta, and do not pre-emptively bump either number.

### Pitfall 11 — the checkout `<h1>` and the reassurance line are shipped copy that changes ⚠ LOW

`book/page.tsx:435` reads `Review and book`; the UI-SPEC's `<h1>` is `Confirm and pay`. `reserve-actions.tsx:87` reads *"You'll pay {total} now — cards, GCash, Maya, or QR Ph. Payments are processed securely."*; the new line names PayMongo. Both are strings some test may pin — the copywriting contract's rule applies: **where a test pins a string this phase changes, the test moves in the same commit**.

---

## Code Examples

### The widened `AllInTable` (server, unchanged posture)

```ts
// src/lib/booking/all-in-table.ts — imports the GUARDED service-fee module, so it is
// server-only by transitivity. The rate argument stays OMITTED: its default IS
// SERVICE_FEE_BPS, so this table is built by the same call checkout makes.
export function buildAllInTable(input: AllInTableInput): AllInTable {
  const parts = (spaceCents: number): AllInParts => {
    const { allInCents } = computeServiceFee(spaceCents);   // rounds ONCE, over the whole space price
    return { space: spaceCents, fee: allInCents - spaceCents, total: allInCents };
  };
  // hourly[h] = parts(hourlyRateCents * h)   — a LOOKUP per key the booker can select,
  // never a unit rate for the client to multiply (measured drift: up to n-1 centavos).
}
```

### The day-button override (no vendored edit) — MEASURE the result

```tsx
// src/components/availability/availability-calendar.tsx (call site, existing seam)
<Calendar
  mode="single"
  timeZone={timezone}
  className={cn("rounded-xl border", CALENDAR_CELL)}   // "[--cell-size:--spacing(11)]"
  components={{
    DayButton: (p) => (
      <CalendarDayButton
        {...p}
        // Pitfall 2: aspect-square ties height to width; min-w-(--cell-size) overflows at 320px.
        className="aspect-auto min-w-0 h-11 w-full data-[selected-single=true]:bg-brand …"
      />
    ),
  }}
/>
```

### The named loading region (rule 4/5)

```tsx
// replaces availability-calendar.tsx:264-269 — a bare aria-live on an unnamed div announces to nobody
<div role="status" aria-busy="true" className="flex flex-wrap gap-2">
  <span className="sr-only">Loading times for {dayLabel}</span>
  {Array.from({ length: 8 }).map((_, i) => (
    <Skeleton key={i} aria-hidden="true" className={cn(SLOT_CHIP_BOX, "rounded-lg")} />
  ))}
</div>
```

### The hold context (layout ↔ page, both directions)

```tsx
// src/components/booking/hold-provider.tsx  ("use client")
type HoldCtx = {
  expiresAt: string | null;   // published by the PAGE
  expired: boolean;           // published by the COUNTDOWN, read by ReserveView
  publishExpiresAt: (iso: string | null) => void;
  markExpired: () => void;
};
// book/layout.tsx (Server Component) wraps BOTH the header slot and {children}:
//   <HoldProvider><SiteChrome brandHref={null} actions={<HoldCountdownSlot/>} />{children}</HoldProvider>
// {children} is still server-rendered and passed through as a node — wrapping it does not client-ify it.
```

### Freezing the clock for the checkout baseline

```ts
// e2e/visual/… — Playwright's clock API, v1.45+; this repo runs 1.60.0.
// "For best results, install the clock before navigating the page and set it to a time
//  slightly before the intended test time."
await page.clock.install({ time: new Date("2026-08-21T09:00:00Z") });
await page.goto(`/listings/${id}/book?hold=${holdId}`);
await page.clock.pauseAt(new Date("2026-08-21T09:00:08Z"));   // deterministic 14:52
```

### The announce-once assertion (GATE-03 AC#41)

```ts
// Drive 15 minutes through the fake clock; the sr-only region's text must change exactly ONCE.
await page.clock.install({ time: start });
await page.goto(url);
const region = page.locator('[data-testid="hold-countdown"] ~ .sr-only, .sr-only[aria-live="polite"]');
let changes = 0, last = await region.textContent();
page.on("console", () => {});                    // no reliance on logs
for (let i = 0; i < 15; i++) {
  await page.clock.fastForward("01:00");
  const now = await region.textContent();
  if (now !== last) { changes++; last = now; }
}
expect(changes).toBe(1);                          // the 60s threshold, and nothing at expiry
```

---

## State of the Art

| Old approach | Current approach | When changed | Impact here |
|---|---|---|---|
| Per-package Radix imports (`@radix-ui/react-dialog`) | The single `radix-ui` meta-package | shadcn's `radix-nova` style | Verified: `dialog.tsx:4` / `popover.tsx:4` already use it, and the fetched `collapsible` registry item does too — so the add introduces no npm dependency. |
| `vh` for bottom sheets | `dvh` | iOS Safari dynamic viewport | Already applied in `responsive-dialog.tsx`; the sheet's `max-h-[85dvh]` is the reason its footer is never clipped. |
| `aria-live="polite"` on a ticking timer | `role="timer"` + `aria-live="off"` + a **separate** threshold region | current a11y practice | Already shipped in `hold-countdown.tsx` and named the model. The remaining work is applying it to the other 33 attributes. |
| Manual `Date` stubbing for time-dependent screenshots | Playwright `page.clock` | Playwright v1.45 | Phase 11 explicitly recorded that no baselined surface rendered a clock and that **the first one that does must add a freeze** — that is this phase's checkout baseline. |
| `updateSnapshots` varying by environment | `updateSnapshots: "none"` unconditionally (D-28) | Phase 11 | A missing baseline stays red across every retry instead of minting itself green. Do not add a CI ternary. |
| shadcn `sheet` as the mobile overlay | One `ResponsiveDialog` = the dialog in another presentation | Phase 11 (`ARCHITECTURE.md` §6.3 tie-break) | `tests/design/sheet-absent.test.ts` asserts `ui/sheet.tsx` does not exist **and** scans `package.json` for `vaul`. |

**Deprecated / outdated in this repo:**
- The all-at-once broadened fallback (`(public)/page.tsx:82-98`) and its unlabelled `"You might also like"` divider — replaced by the D-52 ladder + D-53 band.
- `Est.` on the rail (`availability-calendar.tsx:369`, `:426`) — dropped by D-40.
- The `TooltipProvider` around the disabled CTA (`(detail)/page.tsx:526-541`) — deleted by D-56.
- `hold-countdown.tsx`'s expiry announcement (`:62-63`) — `HoldExpiredState` owns it under GATE-03 rule 6.
- `hold-expired-state.tsx`'s `aria-live="assertive"` — flipped to polite under rule 7.

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | `cn()`'s tailwind-merge will not cleanly resolve `size-auto` vs a later `h-11`, so the rendered day-cell height must be measured rather than assumed | Pitfall 2 | If the merge *does* resolve cleanly, the plan simply carries an extra measurement task — cheap. If it does not and nobody measures, AC#14 is asserted green against a 41px cell and BFLOW-05 ships unpaid. **Mitigation is the measurement itself, so the downside is bounded.** |
| A2 | Making `price-breakdown.tsx` a Client Component is the intended resolution of Pitfall 1 (as opposed to duplicating the markup or restructuring the rail as an RSC slot) | Pitfall 1 / Pattern 4 | If the user/planner prefers a different resolution, the mechanism changes but the *finding* (a Server Component cannot be imported by a Client Component) stands regardless. **Needs a planner decision, flagged.** |
| A3 | "The filter chip" in D-53/AC#30 means the existing `search-bar.tsx` radius `<Select>`, not a new chip component | Pitfall 6 | Building a real chip row is net-new UI that collides with D-59's own scope guard; reading it as the Select keeps the requirement falsifiable without new capability. **Needs user/planner confirmation.** |
| A4 | Undo needs an explicit suppression flag (`relax=0` or equivalent) | Pitfall 5 | Without it, AC#31 is unsatisfiable as written. The *name* of the flag is a free choice; the *need* is measured. |
| A5 | The collision notice's named line is composed client-side from the booker's own selection, not from the server sentence | Pattern 8 | If the phase instead wants the server to return a window-naming sentence, that is a change to `units.ts`/`open-capacity.ts` copy on a money path — a bigger, more careful change. **Needs a planner decision.** |
| A6 | The GATE-03 audited file set is the booker-path subset (8 of the 18 files), with `/bookings/**` and `group/**` left to Phase 13 | Pattern 9 | If the set is drawn wider, the phase absorbs Phase-13 surfaces; if drawn narrower, GATE-03's falsifiable claims cover less than the requirement implies. The set must be **declared in the plan** either way. |
| A7 | Rung queries can pass a reduced `fetchLimit` to bound the ladder's Stage-2 cost | Pattern 7 | `searchListings` currently derives `fetchLimit` internally from `SEARCH_PAGE_SIZE`; exposing a bound is a small signature change. If refused, the fallback is the UI-SPEC's own "bound at two rungs". |

---

## Open Questions

1. **How is `PriceBreakdown`'s boundary flipped?** (Pitfall 1)
   - *What we know:* a Server Component cannot be imported by a Client Component; `@/lib/money` is isomorphic; the component has no hooks; GATE-05 is about *computation*, not rendering.
   - *What's unclear:* whether the planner wants `"use client"` on the component, or the rail restructured so the breakdown is passed in as a server node.
   - *Recommendation:* `"use client"` on `price-breakdown.tsx`, with the file header's Server-Component sentence rewritten in the same commit and AC#10 (`next build` server-only boundary check) re-run explicitly.

2. **What flag suppresses the ladder for Undo?** (Pitfall 5)
   - *Recommendation:* `relax=0`, added to `searchParamsSchema` (so it is validated like every other param), honoured in `(public)/page.tsx`, and asserted by the STATE-03 e2e.

3. **Does the relaxed state live in the URL or only in `barDefaults`?** (Pitfall 6)
   - *What we know:* the URL is the single source of filter state today (`search-results.tsx`'s whole `pushWith` design), and `barDefaults` is already a separate prop the RSC composes.
   - *Recommendation:* URL keeps the **booker's** query; `barDefaults` carries the **effective** values. That makes Undo a pure removal of `relax=0`… no — a pure *addition* of it, which is why question 2 must be answered first.

4. **Is the `[11-13]` hydration mismatch a real defect or a dev-mode streaming artefact?** (D-56 / Pitfall 7)
   - *What we know:* Phase 11 measured it as pre-existing, with a control; the deferred entry names `npm run build && npm start` as the discriminator; three sibling incidents (`[11-03]`, `[11-11](a)`, `[11-14]`) were all traced to React's `<div hidden id="S:1">` streaming buffer.
   - *Recommendation:* run the discriminator **before** planning the fix. Delete the tooltip either way; record the finding honestly rather than claiming a repair.

5. **Does `ALL_IN_TABLE_MAX_HOURS` still cover the widened table's memory/serialisation cost?**
   - *What we know:* the table is serialised into the RSC payload for every listing page render; widening each value from a number to a 3-field object roughly triples that payload slice.
   - *What's unclear:* the actual constant's value and the resulting byte delta.
   - *Recommendation:* measure the RSC payload size on a seeded listing before and after; if it matters, ship `[space, fee, total]` tuples rather than named objects.

6. **What seeds the Phase-12 visual baselines?** (D-58 and the new product surfaces)
   - *What we know:* Phase 11 baselined DB-free surfaces only, on the stated rule that a baseline needing seeded data is flaky. Phase 12 is the first phase with product surfaces. The `visual` Playwright project is **not constructed off Linux**, so nobody on this Windows box can run or mint them.
   - *Recommendation:* the fixture is a committed seed script the CI dispatch job runs; the OG baseline must assert the captured byte length is **not** 25,844 and that its `alt` contains the seeded title.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node.js | everything | ✓ | v24.13.0 | — |
| npm | everything | ✓ | 11.8.0 | — |
| Docker | local Postgres/PostGIS | ✓ running | container `fitout-db-1` | — |
| PostgreSQL + PostGIS | integration tests, e2e, dev | ✓ port 5432 open | `postgis/postgis:18-3.6` | — |
| `psql` CLI | ad-hoc DB inspection | ✗ | — | Drizzle Studio (`npm run db:studio`); specs connect via `postgres.js` |
| Vitest | unit/integration + design gate | ✓ | 4.1.8 | — |
| Playwright | e2e + viewport + a11y assertions | ✓ | 1.60.0 (`page.clock` available since 1.45) | — |
| **Playwright `visual` project** | GATE-01 baselines | ✗ **on this machine** | n/a — `playwright.config.ts` does **not construct the project off Linux** (D-29) | CI dispatch job in `mcr.microsoft.com/playwright:v1.60.0-noble`. `updateSnapshots: "none"` is unconditional, so nothing can be minted locally. |
| PayMongo test keys | the tail past `Confirm & pay` | not required by this phase | — | `e2e/price-parity.spec.ts`'s contract: the flow **stops at the reserve page**, so `DATABASE_URL` is its only env input. **Do not grow that.** |
| Resend / Cloudinary / OAuth creds | not on this path | — | — | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with a fallback:** the `visual` project (CI-only by design) and `psql` (Drizzle Studio).

---

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Unit / integration / component | **Vitest 4.1.8**, `vitest.config.ts` — env `node`, jsdom per-file via `// @vitest-environment jsdom`. `globalSetup: tests/global-setup.ts` + `setupFiles: tests/setup.ts` force `fitout_test` and give each file its own schema. **Requires Docker + Postgres.** |
| Design gate | **Vitest 4.1.8**, `vitest.design.config.ts` — owns `tests/design/**` only. **No `globalSetup`, no `setupFiles` — deliberately DB-free**, because it runs inside `next build`. Never add either key to it. |
| E2E / rendering / a11y / viewport | **Playwright 1.60.0**, `playwright.config.ts`, project `chromium`, `testMatch: "e2e/*.spec.ts"`, `webServer: npm run dev` on :3000, `reuseExistingServer` locally. |
| Visual regression | Playwright project `visual`, `testMatch: "e2e/visual/**/*.spec.ts"`, **Linux-only** (`RUN_VISUAL_PROJECT = process.platform === "linux"`), `updateSnapshots: "none"` **unconditional**. |
| Quick run command | `npm run test:design` (DB-free, seconds) — **the per-commit sampler** |
| Targeted unit run | `npx vitest run tests/<area>` (needs Docker; `npm run db:test:setup` once) |
| Targeted e2e run | `npx playwright test e2e/<spec>.spec.ts --project=chromium` |
| Full suite command | `npm test` && `npm run test:design` && `npx playwright test --project=chromium` |
| Build gate | `npm run build` = `lint && test:design && next build` — a raw hex, an arbitrary type size, an **undeclared `data-testid`**, a literal box class in a skeleton, or a `server-only` boundary violation fails the build **today**. |

### Phase Requirements → Test Map

| Req | Behaviour | Test type | Automated command | File exists? |
|---|---|---|---|---|
| BFLOW-01 | Card renders rate parts + `Service fee included`; zero computed window totals | unit (jsdom) | `npx vitest run tests/search/search-card-open.test.tsx` | ✅ (extend case 9) |
| BFLOW-01 | `ResultsGrid` and `CardGridSkeleton` import one gutter constant; `gap-5` absent | design | `npx vitest run --config vitest.design.config.ts tests/design/skeleton-measurements.test.ts` | ✅ (extend) |
| BFLOW-01 | Rendered gutters match at 320/768/1280 | rendering (Playwright) | `npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium` | ✅ (extend — see `[11-21]`: the current spec compares on `/dev/theme`, which does **not** render `ResultsGrid`, so a new `/`-based case is required) |
| BFLOW-02 | The six `<h2>`s appear in the required document order | e2e | `npx playwright test e2e/public-listing.spec.ts --project=chromium` | ✅ (extend) |
| BFLOW-02 | Key-facts `<dl>` renders 3–4 `<dt>/<dd>`; `Units` matches `/^1 of \d+ /`; `4 courts` never appears bare | unit (jsdom) | `npx vitest run tests/listing/key-facts.test.tsx` | ❌ **Wave 0** |
| BFLOW-03 | Mosaic shape at N = 0,1,2,3,4,5,8; button iff N>1 below `sm:` / N>5 above | unit (jsdom) | `npx vitest run tests/listing/photo-gallery.test.tsx` | ❌ **Wave 0** |
| BFLOW-03 | Clicking photo *k* opens the lightbox on *k*; `ArrowRight` advances; `Escape` closes; focus returns; dialog has a non-empty accessible name | e2e + a11y | `npx playwright test e2e/photo-lightbox.spec.ts --project=chromium` | ❌ **Wave 0** |
| BFLOW-03 | `ui/sheet.tsx` still absent; the lightbox is `role="dialog"` and **not** `[data-testid="responsive-dialog"]` | design + e2e | `npx vitest run --config vitest.design.config.ts tests/design/sheet-absent.test.ts` | ✅ |
| BFLOW-04 | Rail total and checkout total resolve to identical computed `font-size`/`font-weight`/`font-variant-numeric`, both themes | rendering | `npx playwright test e2e/price-one-fact.spec.ts --project=chromium` | ❌ **Wave 0** |
| BFLOW-04 | `Est.` appears on neither surface; `PriceBreakdown` performs zero arithmetic | design (source scan) | `npx vitest run --config vitest.design.config.ts tests/design/price-surface.test.ts` | ❌ **Wave 0** |
| BFLOW-04 | Widened `AllInTable` still agrees with the frozen quote; the multiply still does not | unit | `npx vitest run tests/booking/all-in-table.test.ts` | ✅ (extend — both halves must survive the shape change) |
| BFLOW-04 | Rendered total === `booking.quoted_total_cents` | **e2e (the one CI-gated spec)** | `npx playwright test e2e/price-parity.spec.ts --project=chromium` | ✅ (must stay green; its only env input is `DATABASE_URL` — do not grow it) |
| BFLOW-04 | Exactly one `price-total` on `/…/book`; one `rail-price-total` and one `sheet-price-total` on `/listings/[id]` | e2e | `npx playwright test e2e/price-one-fact.spec.ts --project=chromium` | ❌ **Wave 0** |
| BFLOW-04 | Fee popover trigger ≥44×44, opens on **click** not hover, `Escape` restores focus, body contains no `%` | e2e + a11y | same spec | ❌ **Wave 0** |
| BFLOW-04 | `price-breakdown.tsx` trips **neither** whole-source grep | design (source scan) | existing grep-tripwire test | ✅ |
| BFLOW-05 | Day-cell rendered **height** 44px at 320/375/768/1280, both themes; width ≥41px at 320 | **rendering (`boundingBox`)** | `npx playwright test e2e/calendar-hit-area.spec.ts --project=chromium` | ❌ **Wave 0 — and this is the measurement Pitfall 2 requires** |
| BFLOW-05 | `[data-testid="skeleton-calendar"]` and the resolved month grid match within ±2px, both themes | rendering | same spec | ❌ **Wave 0** |
| BFLOW-05 | Every listing-page skeleton has exactly one `role="status"` with a **non-empty computed accessible name**; every bar `aria-hidden` | unit (jsdom + `dom-accessibility-api`) | `npx vitest run --config vitest.design.config.ts tests/design/skeleton-a11y.test.tsx` | ✅ (extend — the tool and the idiom already exist from plan 11-07) |
| BFLOW-05 | No transition/animation on the month grid exceeds 0ms | rendering | `npx playwright test e2e/reduced-motion.spec.ts --project=chromium` | ✅ (extend) |
| RESP-02 | At 375px the sticky bar is visible **without scrolling**, 64px tall, contains a ≥44px action | **viewport (Playwright)** | `npx playwright test e2e/mobile-booker-path.spec.ts --project=chromium` | ❌ **Wave 0** |
| RESP-02 | The bar's amount string and the sheet's `Total` string are **byte-equal** | e2e | same spec | ❌ **Wave 0** |
| RESP-02 | `getByRole("button", { name: /^Book/ })` === 1 at 375px **and** at 1280px | e2e | same spec | ❌ **Wave 0** |
| RESP-02 | Selecting a day issues exactly **one** availability request at 375 and 1280 | e2e (request interception) | same spec | ❌ **Wave 0** |
| RESP-02 / BFLOW-06 | `scrollWidth <= clientWidth` at 320px on `/`, `/listings/[id]` (closed **and** sheet open) and `/…/book`, both themes | viewport | `npx playwright test e2e/overflow-320.spec.ts --project=chromium` | ✅ (extend — the harness, the offender diagnostic and the ancestor-clip filter all exist) |
| BFLOW-06 | At 375px checkout renders the sticky bar and the `Total` is visible with the disclosure **collapsed** | viewport + e2e | `e2e/mobile-booker-path.spec.ts` | ❌ **Wave 0** |
| SHELL-03 | **Zero** `<a href>` inside `[data-testid="site-header"]`; **no** `[data-testid="site-footer"]` on `/…/book` | e2e | `npx playwright test e2e/shell.spec.ts --project=chromium` | ✅ (extend) |
| SHELL-03 | **Exactly one** `<a href>` inside the checkout `<main>`, `href` starting `/listings/` | e2e | same spec | ✅ (extend) |
| SHELL-03 | The header's bounding box is byte-identical empty / at `14:52` / at `0:09` / at `Hold expired`, 375/768/1280, both themes | rendering + `page.clock` | `npx playwright test e2e/hold-countdown.spec.ts --project=chromium` | ❌ **Wave 0** |
| SHELL-03 | `[data-testid="hold-countdown"]` resolves to exactly 1 per document (no digits in the rail) | e2e | same spec | ❌ **Wave 0** |
| BFLOW-07 | The pressed confirm label contains `PayMongo`, and so does the at-rest line | unit (jsdom) | `npx vitest run tests/booking/reserve-actions.test.tsx` | ✅ (extend) |
| STATE-03 | Zero-result query renders the band **and** ≥1 result card whenever a rung returns rows; the band names exactly **one** relaxed constraint | integration | `npx vitest run tests/search/relaxation-ladder.test.ts` | ❌ **Wave 0** |
| STATE-03 | The activity/category filter survives all four rungs | integration | same file | ❌ **Wave 0** |
| STATE-03 | The relaxed control's rendered value string equals the band's changed-constraint substring | e2e | `npx playwright test e2e/zero-result-relax.spec.ts --project=chromium` | ❌ **Wave 0** |
| STATE-03 | `Undo` restores the original query and the band unmounts | e2e | same spec | ❌ **Wave 0** |
| STATE-03 | Cold start renders neither the band nor any escape hatch | unit (jsdom) | `npx vitest run tests/search/search-results-states.test.tsx` | ❌ **Wave 0** |
| STATE-07 | A seeded collision renders `[data-testid="collision-notice"]`, moves focus to it, and **in the same paint** the two lost hours carry `aria-disabled`/`disabled` + line-through | e2e (seeded conflict) | `npx playwright test e2e/collision-in-place.spec.ts --project=chromium` | ❌ **Wave 0** |
| STATE-07 | The notice carries no `--destructive` class, no `role="alert"`; `23P01` appears nowhere in the DOM | e2e | same spec (+ `e2e/error-leak.spec.ts` idiom) | ❌ **Wave 0** (leak idiom ✅) |
| STATE-07 | The rail's price block is removed and the selection line reads `No time selected` | unit (jsdom) | `npx vitest run tests/availability/availability-calendar.test.tsx` | ✅ (extend) |
| STATE-07 | Exactly **one** live region is mounted during the collision | e2e | `e2e/collision-in-place.spec.ts` | ❌ **Wave 0** |
| GATE-03 | Zero `aria-live="assertive"` under the **declared** booker-path file set | design (source scan) | `npx vitest run --config vitest.design.config.ts tests/design/live-regions.test.ts` | ❌ **Wave 0** |
| GATE-03 | Every live region on that set has a row in `LIVE_REGIONS`; a deleted row is a **compile** error | type-level + design | `npx tsc --noEmit` + same test | ❌ **Wave 0** |
| GATE-03 | Every `role="status"` on that set resolves to a non-empty **computed** accessible name | unit (jsdom + `dom-accessibility-api`) | same test | ❌ **Wave 0** |
| GATE-03 | A clock-driven 15-minute countdown changes its sr-only text exactly **1** time and produces **no** announcement at expiry | e2e + `page.clock` | `npx playwright test e2e/hold-countdown.spec.ts --project=chromium` | ❌ **Wave 0** |
| Inventories | `contrast-pairs.ts` +1 exclusion row, both themes at `bar + 0.05` | design | `npx vitest run --config vitest.design.config.ts tests/design/contrast.test.ts` | ✅ |
| Inventories | `measurements.ts` +7; no literal `h-`/`w-`/`aspect-` in `patterns/*skeleton*.tsx` | design | `tests/design/skeleton-measurements.test.ts` | ✅ |
| Inventories | Every new `data-testid` declared with `why` + `owner`; `getByRole >= 92`, `getByLabel >= 30` still hold | design + type-level | `tests/design/selector-contract.test.ts` + `npx tsc --noEmit` | ✅ |
| Inventories | `Z_SHEET_INVENTORY` still asserted empty; `shadow-sticky` has exactly 2 call sites, zero on any header | design | `tests/design/sheet-absent.test.ts`, `tests/design/elevation-z.test.ts` | ✅ |
| GATE-06 | `drizzle/` is at `0025`; no migration file added | design (tree scan) | `npx vitest run --config vitest.design.config.ts tests/design/infra.test.ts` | ✅ (add the assertion if absent) |
| GATE-05 | `next build` still passes the `server-only` boundary check with the widened `AllInTable` **and** the client-flipped `PriceBreakdown` | build | `npm run build` | ✅ |

### Sampling Rate

- **Per task commit:** `npm run test:design` (DB-free, seconds — catches undeclared ids, literal box classes, contrast, motion, leak, focus recipe) **plus** the one or two Vitest files the task touched.
- **Per wave merge:** `npm test` (full Vitest, needs Docker) + `npm run test:design` + `npx playwright test --project=chromium` (needs the dev server + DB).
- **Phase gate:** `npm run build` green, full Vitest green, full Playwright `chromium` green, **and the visual baselines regenerated by the Linux CI dispatch job** — never locally, because `updateSnapshots: "none"` is unconditional and an illegal `*-win32.png` can never be committed.

### Wave 0 Gaps

- [ ] `tests/listing/key-facts.test.tsx` — BFLOW-02 (the `1 of N` correctness rule)
- [ ] `tests/listing/photo-gallery.test.tsx` — BFLOW-03 (the six mosaic shapes + the button predicate)
- [ ] `e2e/photo-lightbox.spec.ts` — BFLOW-03 (open-on-tapped-photo, arrow paging, Escape, focus return, accessible name)
- [ ] `e2e/calendar-hit-area.spec.ts` — BFLOW-05 (**the `boundingBox` measurement Pitfall 2 requires**, plus the ±2px skeleton match)
- [ ] `e2e/price-one-fact.spec.ts` — BFLOW-04 (computed-style identity, the three hooks, the popover)
- [ ] `tests/design/price-surface.test.ts` — BFLOW-04 (`Est.` absent; zero arithmetic in `price-breakdown.tsx`)
- [ ] `e2e/mobile-booker-path.spec.ts` — RESP-02 / BFLOW-06 (sticky bar reachable without scrolling, byte-equal amounts, one Book button, one availability request, collapsed disclosure)
- [ ] `e2e/hold-countdown.spec.ts` — SHELL-03 / GATE-03 (`page.clock`-driven; header box stability; announce-once)
- [ ] `tests/search/relaxation-ladder.test.ts` — STATE-03 (rung order, stop-at-first-hit, category never relaxed, the cap)
- [ ] `e2e/zero-result-relax.spec.ts` — STATE-03 (band + cards, control/results agreement, Undo)
- [ ] `e2e/collision-in-place.spec.ts` — STATE-07 (seeded conflict, same-paint flip, one live region, no `23P01`)
- [ ] `tests/design/live-regions.test.ts` + `src/lib/design/live-regions.ts` — GATE-03 (the typed inventory and its three scans)
- [ ] **Seed fixtures** for the new visual surfaces + the D-58 OG listing (Phase 12 is the first phase that must bring its own)
- [ ] Framework install: **none needed** — Vitest, Playwright, jsdom, `dom-accessibility-api` and `culori` are all present.

### What genuinely requires human UAT

These cannot be automated from this repo's harness, and the plan should route them into the phase's `HUMAN-UAT.md` rather than pretend to a green gate:

1. **That the route "reads as one designed product."** The phase goal is a judgement about a sequence of screens. Automation can prove ordering, tokens and geometry; only a person can say the path felt effortless (D-59).
2. **That the reduced-motion reset actually silences a real Radix animation with the OS setting on.** `tests/design/motion-budget.test.ts`'s own header says this explicitly: *"only a real paint settles it."*
3. **That a screen reader announces once, in the order intended.** The automated proof is a *text-change count* on a DOM node. Whether NVDA/VoiceOver actually reads the collision notice before the refreshed grid, and does not double-read the moved focus, is a listening test.
4. **The full-screen lightbox on a real touch device** — that paging by swipe is absent-by-design rather than broken, and that the 44px chrome is reachable one-handed.
5. **The PayMongo redirect tail.** `e2e/search-and-book.spec.ts`'s header already records that `Confirm & pay` opens a **hosted checkout** and is un-automatable from Playwright. The phase's claim stops at "the booker is told where they are going".
6. **Visual baseline *judgement*.** The gate proves pixels did not change; only a person can say the new pixels are right — and the theme-swap smoke only proves the two themes *differ*, not that grove looks correct.
7. **That the collision reads as calm rather than as a failure.** `sketches/006/index.html`'s "What it must never become" section is the calibration artefact; comparing against it is a human act.

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: "high"`.

### Applicable ASVS Categories

| ASVS category | Applies | Standard control already in place / required |
|---|---|---|
| V2 Authentication | partly | Better Auth session read in `book/page.tsx:65`. **Unchanged by this phase** — but the checkout "way back" link must not introduce a route that skips the owner gate. |
| V3 Session Management | no (unchanged) | Sessions in Postgres. This phase adds no session-touching code. |
| V4 Access Control | **yes** | `book/page.tsx:106-110`: owner-gated hold read + a path-id cross-check, both `notFound()` (a bare 404 reveals nothing about another booker's hold). `(detail)/page.tsx:181` gates on `status === "published"` + non-deleted. `getDayAvailability`/`getOpenMonthAvailability` **re-enforce the published gate independently** (WR-01) — the collision re-fetch rides that existing posture and must not add a caller-supplied status. |
| V5 Input Validation | **yes** | Zod at every seam: `searchParamsSchema` (T-04-PARAMTAMPER — a garbage param falls back to the default view, never a crash), `dayLocalSchema`/`monthLocalSchema` (server-action args are **not** runtime-typed), `slotSelectionSchema`, `openHoldSchema`. **The new searched-window parse (Pitfall 4) and the new `relax` flag (Pitfall 5) must both go through `searchParamsSchema`, not ad-hoc parsing.** `parsePickedDate` is strict *because* `date` flows into a `::date` cast. |
| V6 Cryptography | no | No new crypto. PayMongo webhook HMAC verification is untouched. |
| V7 Error handling / logging | **yes** | `e2e/error-leak.spec.ts` exists. **`23P01` must never reach the DOM** (AC#35) — the constraint name is an internal detail and blaming a booker for a race they lost fairly is the calibration failure sketch 006 records. |
| V12 Files / resources | partly | Listing photos are Cloudinary `secure_url`s rendered through plain `<img>`. The lightbox renders the **same** urls — no new upload, signing or transform surface. |
| V13 API / web service | **yes** | Server actions only. `getDayAvailability` is deliberately unauthenticated (a published listing's availability is public; T-03-ENUM accepted) and returns only free/blocked state — never PII, never booker identity. **The collision refresh must not widen that payload.** |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard mitigation (already in place) |
|---|---|---|
| Search-param tampering (`radius`, `priceMax`, `page`, `date`) | Tampering | `searchParamsSchema.safeParse` with bounded presets; `MAX_PAGES = 50` caps the cumulative fetch loop. **The `relax` flag must inherit this.** |
| SQL injection through geo/category/date | Tampering | All input parameter-bound via Drizzle `sql` templates; `date` canonicalised by `parsePickedDate` before the `::date` cast. |
| Price tampering / client-computed money | Tampering, Repudiation | GATE-05: `server-only` on the computation modules + the AST boundary check + `e2e/price-parity.spec.ts`. **The widened `AllInTable` and the client-flipped `PriceBreakdown` must both keep the client on the "finished figure" side of D-130.** |
| Hold IDOR | Information disclosure, Elevation | Owner-gated read + path-id cross-check, both `notFound()`. |
| Double-book via a race | Tampering | The GiST `EXCLUDE` constraint inside a transaction. **The collision UI renders its ruling; it must never pre-check.** |
| Duplicate hold via GET | Tampering | Hold creation is exclusively the POST action (T-04-GETDUP); the reserve RSC never creates one. **The "way back" link is a GET to `/listings/{id}` — it must not carry `resume=1`, or it would auto-fire a hold on arrival** (`book-cta.tsx:177-183`). |
| Double-charge via double-submit | Tampering | The server-side compare-and-swap checkout lease + expire-before-create. ⚠ PayMongo does **not** honour `Idempotency-Key` on `/v1/checkout_sessions` (T-08-79, probed). The button disable is a courtesy, never the guarantee. |
| ORM pulled into the client bundle | Information disclosure | `reserve-actions.tsx:23-28` — render `result.error`, never import `CHECKOUT_IN_FLIGHT_MESSAGE`. **The collision notice must follow the same rule.** |
| Constraint-name / stack leak to a booker | Information disclosure | `mapBookingError` + `e2e/error-leak.spec.ts` + AC#35. |
| Untrusted display-only params (`?requested=`) | Tampering | Clamped into `[granted+1, ceiling]` before render (`book/page.tsx:266-271`) — the pattern any new display-only param must copy. |

**Net security delta for this phase: near zero by design.** No new endpoint, no new mutation, no new secret, no schema change. The two places to review hardest are (a) the new searched-window / `relax` parsing (V5) and (b) that the client-flipped `PriceBreakdown` still receives only finished figures (V4/D-130).

---

## Sources

### Primary (HIGH confidence)

- **The repository itself**, read in this session (2026-08-18): all files and line numbers cited in § Existing Code Inventory, § Common Pitfalls and § Architecture Patterns were opened directly. Version numbers were read from `node_modules/*/package.json`, not from `package.json` ranges.
- `https://nextjs.org/docs/app/api-reference/functions/use-router` — `router.refresh()` "will merge the updated React Server Component payload **without losing unaffected client-side React (e.g. `useState`) or browser state**." Doc version 16.3.1. **This is the citation behind Pitfall 3.**
- `https://playwright.dev/docs/api/class-clock` — `page.clock` introduced **v1.45**; methods `install`, `setFixedTime`, `setSystemTime`, `fastForward`, `pauseAt`, `runFor`, `resume`; caveat: *"install the clock before navigating the page and set it to a time slightly before the intended test time."*
- `https://ui.shadcn.com/r/styles/radix-nova/collapsible.json` — fetched: sole import is `import { Collapsible as CollapsiblePrimitive } from "radix-ui"`; content contains **no** Tailwind classes, **no** `dark:`, **no** hex, **no** `text-[NNpx]`.
- `node_modules/radix-ui/package.json` — v1.4.3, `@radix-ui/react-collapsible` present in `dependencies`.
- `.planning/phases/12-booker-path-search-listing-checkout/12-CONTEXT.md` and `12-UI-SPEC.md` — the locked decisions and the approved design contract.
- `.planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md` — `[11-13]` (with the verbatim hydration error and its control), `[11-17]` (both entries), `[11-21]`, `[11-22]`.
- `.planning/REQUIREMENTS.md` (requirement texts, § Out of Scope) and `.planning/ROADMAP.md` (§ Phase 12, § Cross-Cutting Constraints — the five hard gates, GATE-06, the ordering invariant).

### Secondary (MEDIUM confidence)

- WCAG 2.5.5 (Target Size, AAA, 44×44) and 2.5.8 (Target Size Minimum, AA, 24×24) — the two figures the UI-SPEC's 44px and ~41px arguments rest on. Consistent with the spec's own framing; not re-fetched this session.
- `tailwind-merge@3` conflict-group semantics for `size` vs `h`/`w` — reasoned from the library's documented model, **not** measured in a browser. This is the basis of assumption **A1**, and the plan carries a measurement task because of it.

### Tertiary (LOW confidence — flagged for validation)

- The exact rendered width of a day cell at the 320px floor (~41.1px) is arithmetic from the measured class strings (288px content box ÷ 7), not a browser measurement. **Validate with `boundingBox()` before treating AC#14 as satisfiable.**
- The RSC payload cost of the widened `AllInTable` (Open Question 5) is estimated, not measured.

---

## Metadata

**Confidence breakdown:**

- **Existing-code inventory:** HIGH — every path, line number and class string was read from source this session; where CONTEXT/UI-SPEC line numbers had drifted, the drift is stated with the current value.
- **The eleven spec-vs-code contradictions:** HIGH for 1, 3, 4, 5, 6, 7, 8, 9, 10, 11 (all read directly or cited from official docs); **MEDIUM for Pitfall 2's merge behaviour**, which is why it carries an explicit MEASURE-FIRST instruction rather than a prescription.
- **Standard stack / package legitimacy:** HIGH — installed versions read from `node_modules`; the one registry addition verified by fetching the registry item itself.
- **Architecture patterns:** HIGH for the mechanisms that already exist in-repo (Radix dialog/popover, `ResponsiveDialog`, `PanelCard sticky`, the `role="timer"` idiom); MEDIUM for the `HoldProvider` shape and the `BookingPanel` duplication, which are designs rather than measurements.
- **Relaxation-ladder cost:** HIGH on the mechanism (read from `query.ts`), MEDIUM on the latency figure (no timing run performed).
- **Validation architecture:** HIGH — configs, projects, `updateSnapshots`, the two-Vitest split, the Linux-only visual project and the existing spec inventory were all read.
- **Security:** HIGH — every control cited is a comment or a code path in the shipped tree.

**Research date:** 2026-08-18
**Valid until:** ~2026-09-17 (30 days). The in-repo findings are stable until the code moves; the two external facts (Next `router.refresh()` semantics, Playwright `page.clock`) are stable API surface. **Re-verify Pitfall 2 and Pitfall 10 immediately before planning** — both are counts/measurements that any intervening commit can move.
