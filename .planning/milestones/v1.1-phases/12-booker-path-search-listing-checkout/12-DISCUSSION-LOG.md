# Phase 12: Booker Path — Search → Listing → Checkout - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `12-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-08-17 (discussion) · 2026-08-18 (sketch verdicts)
**Phase:** 12-booker-path-search-listing-checkout
**Areas discussed:** Price continuity · Listing page shape · Mobile path & the PayMongo handoff ·
The two dead ends
**Sketches built between discussion and context:** 002–006 (see `.planning/sketches/`)

---

## Price continuity: card → rail → checkout

### Q1 — What should the result card's price say when a window was searched?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the rate only | `₱714/hr · ₱5,145/day` + *Service fee included*. No total promised before checkout, so the 5%-of-an-hourly-rate rounding edge can never make the number go up (D-75). | ✓ |
| Add the window total | Server-computed from the same exact lookup the rail uses. Strongest reading of SC#1; makes the card a promise checkout must match to the centavo. | |
| Rate headline + muted total line | Both facts, at the cost of a fourth muted line on a tile that already carries type, distance and availability. | |

**User's choice:** Keep the rate only → **D-37**

### Q2 — How literally "the same component" should the rail breakdown be?

| Option | Description | Selected |
|--------|-------------|----------|
| Same component, itemised | Widen `AllInTable` so each key carries `{space, fee, total}`; the rail renders the real `PriceBreakdown`. Identical by construction, still zero client arithmetic. | ✓ |
| Same component, compact form | A `compact` prop — rail gets fee + Total only. Keeps the sticky panel short. | |
| Two components pinned by a test | "Visually the same" maintained by a gate rather than by construction — the shape Phase 11 kept rejecting. | |

**User's choice:** Same component, itemised → **D-38**
**Notes:** Grounded on a measurement made during scouting — the rail is *already* fed a server-computed
`AllInTable` keyed by hour count, exact to the centavo. That turned this from a GATE-05 boundary problem
into a table-shape change.

### Q3 — How does the fee explain itself on demand?

| Option | Description | Selected |
|--------|-------------|----------|
| Popover on an info button | `popover.tsx` is vendored; works on tap, hover and keyboard. Avoids the touch trap `search-result-card.tsx:214` already rejected a tooltip over. | ✓ |
| Inline disclosure under the line | No overlay, works with JS off; but shifts layout inside a sticky rail and inside the mobile summary disclosure. | |
| `ResponsiveDialog` | Sheet on mobile, dialog on desktop. Unmissable, but a full sheet for one sentence about a 5% fee. | |

**User's choice:** Popover → **D-39**

### Q4 — Does the rail keep the word "Est."?

| Option | Description | Selected |
|--------|-------------|----------|
| Drop it — `Total` on both | The rail figure is exact by construction, so "Est." understates the guarantee and breaks the recognisability BFLOW-04 is buying. | ✓ |
| Keep "Est." in the rail | Honest about pre-hold status; a lost open-capacity race can grant fewer heads. Costs recognisability. | |
| `Total` + a qualifier line | Recognisable and honest, at one more line in the rail. | |

**User's choice:** Drop it → **D-40**

### Q5 (post-sketch) — The two-rates collision found by building sketch 004

| Option | Description | Selected |
|--------|-------------|----------|
| Drop the rail's rate headline | Once the breakdown is in the rail, the Total is the number that matters. Headline persists in the no-selection state. | ✓ |
| Label the run line "Space rate" | Keeps both, makes them visibly different quantities; introduces a term the booker meets nowhere else on the panel where money commits. | |
| Keep both, unlabelled | What most marketplaces do; the one booker who notices is looking at a money surface that appears to contradict itself. | |

**User's choice:** Drop the rail headline → **D-41**
**Notes:** This question did not exist before the sketch. `₱714/hr` (all-in headline, D-75) and
`₱680/hr × 2 hours` (run line, raw `hourlyRateCents`) are both correct and never met until D-38 moved
the breakdown into the rail.

---

## Listing page shape

### Q1 — What goes in the key-facts block?

| Option | Description | Selected |
|--------|-------------|----------|
| Five persisted facts | Capacity, space type, booking mode, drop-in line, units. Every one a column the page already reads. | ✓ |
| Three facts | Capacity, booking mode, mode/units; space type and location stay in the subtitle. | |
| Icon row with everything | Plus amenity count and minimum booking duration — neither is a column. | |

**User's choice:** Five persisted facts → **D-43**

### Q2 — What shape is the hero photo grid?

| Option | Description | Selected |
|--------|-------------|----------|
| Airbnb 5-up mosaic | Hero + 2×2, "Show all photos" overlaid; needs explicit fallbacks at 1–4 photos. | ✓ |
| Keep today's cover + strip | Cheapest; handles any count; reads more like a gallery than a hero. | |
| Two-column mosaic | No special cases, but gives the cover no more weight than photo six. | |

**User's choice:** 5-up mosaic → **D-44**

### Q3 — How does the lightbox open, and what's in it?

| Option | Description | Selected |
|--------|-------------|----------|
| Any photo + the button; counter and arrows | Every tile a trigger; `3 / 12` counter, prev/next, arrow keys, Esc. | ✓ |
| Only the "Show all photos" button | One named trigger; a tap on a photo doing nothing reads as broken. | |
| Any photo + a thumbnail rail inside | Better for a 20-photo gym; more surface to keep keyboard-operable and baseline. | |

**User's choice:** Any photo + button, counter and arrows → **D-45**

### Q4 — Where does the cancellation policy live?

| Option | Description | Selected |
|--------|-------------|----------|
| Both — section in the column, compact line in the rail | There is no rail on mobile, so the section is the only place it appears there. | ✓ |
| Main column only | Cleanest rail; the refund terms stop being visible at the moment of commitment. | |
| Rail only, with an anchor | Satisfies the order with no duplication; an anchor to a sticky panel is awkward on desktop and meaningless on mobile. | |

**User's choice:** Both → **D-46**

### Q5 — How deep is the host block?

| Option | Description | Selected |
|--------|-------------|----------|
| Profile + the request rule in words | Avatar, first name, host since, bio + the rule stated without an hour count. | ✓ |
| Profile only | Safest against TRUST-04; the booker learns nothing about what happens after they request. | |
| Profile + spaces count | Real data, but reads as a scale signal on a marketplace whose supply is thin. | |

**User's choice:** Profile + the request rule → **D-47**
**Notes:** Surfaced mid-question — `when-label.ts:173` and `email.ts:404` both warn that a flat
`APPROVAL_SLA_HOURS` label is frequently wrong under D-96, and on the listing page no request row exists
yet. The option was rewritten to state the rule with no hour count before being asked.

---

## The mobile path and the PayMongo handoff

### Q1 — What does the sticky bar's action do?

| Option | Description | Selected |
|--------|-------------|----------|
| Opens the booking rail in a sheet | RESP-01's own text names the booking rail as a sheet adopter. Cost: a calendar inside a sheet at 320px. | ✓ |
| Scrolls to availability, then becomes the CTA | No overlay; the bar is a scroll button most of the time. | |
| Sheet with only the breakdown + CTA | Splits the flow across two surfaces — the seam the bar exists to close. | |

**User's choice:** Sheet → **D-48**

### Q2 — Where do the countdown digits live?

| Option | Description | Selected |
|--------|-------------|----------|
| Header only | One live region, one announcement, always visible while scrolling. | ✓ |
| Header + rail, one announces | Redundancy on a money surface; two timers can visibly disagree by a tick. | |
| Rail only + static header indicator | Smallest change, but a recorded departure from SHELL-03. | |

**User's choice:** Header only → **D-49**

### Q3 — What sits behind the mobile summary disclosure?

| Option | Description | Selected |
|--------|-------------|----------|
| Itemised lines collapse; Total stays out | Never open anything to see what you're paying — only to see how it was built. | ✓ |
| The whole summary collapses | Shortest page; asks the booker to expand a panel to check they're buying the right day. | |
| Listing summary collapses, breakdown stays | Inverts the priority — date and time matter more than the arithmetic. | |

**User's choice:** Itemised lines collapse → **D-50**

### Q4 — How is the PayMongo redirect announced?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline copy + a named pending state | Extends the shipped D-57 reassurance; no extra tap on a 15-minute clock. | ✓ |
| A confirm dialog before redirecting | Unmissable; inserts a second tap between a decided booker and paying. | |
| A full interstitial page | Most explicit; an extra navigation and one more place for the hold to run out. | |

**User's choice:** Inline → **D-51**

---

## The two dead ends

### Q1 — How does the zero-result page name the relaxed constraint?

| Option | Description | Selected |
|--------|-------------|----------|
| One-at-a-time ladder, stop at first hit | Names exactly the one constraint that gave; costs up to N sequential queries, so it needs a cap. | ✓ |
| All-at-once query, label everything dropped | Cheapest; names four relaxations at once, closer to "here is everything". | |
| Auto-apply with an undo chip | Most "in place"; results then disagree with the filters still shown. | |

**User's choice:** One-at-a-time ladder → **D-52**
**Notes:** ⚠ **Refined by sketch 002.** The ladder stands as the *mechanism*, but the user chose
variant **A** (auto-applied, announced in a band, with Undo and a filter chip that visibly moves) as the
*presentation* — which is closer to option 3's behaviour. Recorded as **D-52 (what is relaxed) +
D-53 (how it is told)** rather than as a contradiction.

### Q2 — In what order does the ladder relax?

| Option | Description | Selected |
|--------|-------------|----------|
| Radius → price → time-of-day → date; activity never | Matches how elastic each constraint actually is for this product. | ✓ |
| Time-of-day → date → radius → price | Assumes more flexibility about when than where. | |
| Radius only, capped at 25 km | One rung, one query; a hard-date search with no supply still dead-ends. | |

**User's choice:** Radius → price → time-of-day → date → **D-52**

### Q3 — What counts as "nearest alternatives" on a collision?

| Option | Description | Selected |
|--------|-------------|----------|
| Same day, adjacent free windows | The refreshed grid *is* the alternative; no new read model. | ✓ |
| Same window, nearest free days | Better for a regular training slot; needs a multi-day availability read. | |
| Both | Most complete; two read paths and a decision about which to show when. | |

**User's choice:** Same-day adjacent windows → **D-55**

### Q4 — Where does the collision result land?

| Option | Description | Selected |
|--------|-------------|----------|
| In place, above the refreshed picker | Extends what `book-cta.tsx` already does; checkout keeps `HoldExpiredState`. | ✓ |
| In place, and checkout gets alternatives too | Consistent everywhere a slot can be lost; two call sites for the read model. | |
| A dialog | Impossible to miss on mobile; a modal for a normal outcome is the alarm the calm-result rule avoids. | |

**User's choice:** In place → **D-55**

---

## Sketch verdicts (2026-08-18)

| Sketch | Winner | What it locked |
|--------|--------|----------------|
| 002 search-and-dead-end | **A** · Banner + Undo | D-53 — auto-applied relaxation, named band, filter chip moves |
| 003 listing-page-shape | **B** · Bordered strip | D-43 — key facts as a 4-cell strip, not an icon row |
| 004 price-as-one-fact | **A** · Same component | D-38/D-40 confirmed; **surfaced D-41** |
| 005 mobile-path | **A** · One sheet | D-48 confirmed against a live 375px flow |
| 006 collision-in-place | **A** · In-place notice | D-55 confirmed |

All rejected variants are preserved in the sketch files, marked but not deleted.

---

## Stated principle (2026-08-18, before the UI spec)

Not a question — the user stated it unprompted, ahead of `/gsd-ui-phase 12`:

> *"i want it be known that i want a seemless ux for bookers, as much as we like we want their
> experience hassle-free, we went them to to comeback, keep using fitout."*

Recorded as **D-59**, with six checkable implications and a scope guard (retention is earned by the
flow, not by retention features — saved searches, favourites and comparison remain out of scope).
It surfaced one thing that may adjust an existing decision: **SHELL-03's "no navigation" needs an
explicit safe way back from checkout**, or it reads as a trap. Handed to the UI-SPEC as an open question.

## Claude's Discretion

- **BFLOW-05's mechanics** (44px day cells, skeleton shape, month-change motion) — not put to the user;
  a measurement against a shipped token contract, not a preference.
- **GATE-03's audit scope** — 34 `aria-live` sites across 18 files; `hold-countdown.tsx` is already
  correct and is the model, not a question.
- **Exact copy** — deferred to `/gsd-ui-phase 12`, subject to D-42's grep tripwire and the 09-UI-SPEC
  drop-in vocabulary.
- **`Units · 1 of 4 courts`** — resolved rather than asked. Variant B removed the qualifier slot variant
  A used, and "4 courts" reading as "you get all four" is a correctness matter, not taste.
- **Three items folded in unopposed** after being raised on 2026-08-17: the `[11-13]` hydration error
  (D-56), the ±4px grid gutter (D-57), the `og-listing` baseline (D-58).

## Deferred Ideas

- Nearest-**day** alternatives on a collision — needs its own read path (sketch 006 B/C's other half).
- `HoldExpiredState` alternatives at checkout — Phase-13-adjacent, already calm.
- A "Space rate" label on the run line — the rejected half of D-41, documented in case the headline
  must return.
- `/gsd-sketch --wrap-up` — package 002–006 into a findings skill before Phases 13–15.
- The results map — Phase 18, D-136. Not to be absorbed here.
