# Phase 9: Open-Capacity Bookings - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning

<domain>
## Phase Boundary

A new host-set occupancy mode — **`open_capacity`** — where many independent bookers share one bookable unit up to a capacity cap (drop-in gym, host-run open court). Each booker books and pays for their **own head(s)** on the **existing single-payer rail** (charge → hold on platform wallet → transfer host minus commission after the session). The genuinely new work is a **capacity-counter availability model** that safely admits N concurrent bookings on the same slot up to the cap, replacing the GiST exclusion constraint **for these listings only**.

**In scope (OPEN-01..04):** host publishes an open-capacity listing with a per-head price + capacity cap; multiple different bookers each reserve their own spot(s) on the same date, each paying per head via the existing rail; the (cap+1)-th concurrent booking is rejected atomically at the DB with no overbooking, **proven under a genuine concurrent race**; availability + search reflect **remaining capacity (spots left)**, not merely free/taken.

**Out of scope (locked, do NOT build here):** cost-splitting / multi-payer (**GPAY-01**, organizer-driven open play — keeps the exclusion constraint, builds on Phase-8 RSVP shell); per-attendee ticketing (**GPAY-02**); waitlist / notify-me (**DISC-02**). Open-capacity does **not** combine with Phase-8 group bookings in v1 (D-110). This is a **different occupancy mode**, not an extension of the group-RSVP feature.
</domain>

<decisions>
## Implementation Decisions

> Phase-local IDs `OC-NN`. Likely promoted to global `D-NNN` at the planning transition. They clarify HOW to implement OPEN-01..04 — none add a new capability.

### Occupancy mode & slot model
- **OC-01:** Add a second value `open_capacity` to the existing `occupancy_mode` pgEnum (currently `["exclusive"]` only — the Phase-8 seam, `schema.ts:164`). Adding a value to an **existing** enum requires the **55P04 two-migration split** (the `ALTER TYPE … ADD VALUE` lands in its own migration; its first use in a later one) — see the schema.ts:154-163 note and the `0010`/`0012` precedent. This is different from Phase-8's brand-new enum, which could share one migration.
- **OC-02:** **Slot model = "Date = one pass."** Booker picks a **DATE only**; one flat per-head charge; entry valid anytime during the host's operating hours that day. **No time-window picker** for open listings. **Duration NEVER scales price.** (Benchmark-grounded: the Gympass/Wellhub + Hussle drop-in-gym pattern; see research in DISCUSSION-LOG.md. Model B — host-set named blocks — is the market pattern for open-play *courts*, recorded as the designed-for next enhancement, NOT built here.)
- **OC-03:** A drop-in booking still persists concrete `starts_at`/`ends_at` (both `NOT NULL`) set to the **start/end of the host's operating hours on the booked date** (venue-local → UTC `timestamptz`). This is load-bearing: it makes the entire Phase-7 refund ladder, the payout sweep (`ends_at + delay`), reminders, and expiry apply **unchanged** to drop-in bookings.

### Capacity & concurrency (the hard core — OPEN-03/SC#3)
- **OC-04:** Cap = **total admissions per (listing, date)**, counted in **sum-of-heads** (not count-of-bookings). Leading approach: reuse `listing.maxOccupancy` (already "how many people the space holds"). ⚠️ **RESEARCH must confirm** whether to repurpose `maxOccupancy` (its exclusive-mode meaning is per-booking group headcount, D-07/D-111 — a different concept) or add a **dedicated open-capacity column**. Do not silently overload it without deciding.
- **OC-05:** No-overbook must be **DB-atomic and proven under a genuine two-connection concurrent race** (analogous to Phase-3 SC#4). **The exact mechanism is a RESEARCH call.** Candidates: a per-(listing, date) admissions counter guarded by `SERIALIZABLE` / an advisory lock, **or** "units-as-spots" (N discrete `unit` rows reusing the proven GiST `EXCLUDE` with capacity = unit count; exclusive mode is just capacity = 1 of the same primitive). **D-112 explicitly flagged Phase-8's `SELECT … FOR UPDATE` seat-claim as "too coarse" for this phase's higher contention** (a shared slot across many independent bookings) → the denormalized-counter alternative was deferred to Phase 9. **NEVER an app-level count-then-insert** (the CLAUDE.md anti-pattern) — the DB, not app code, is the sole arbiter.

### Heads per booking
- **OC-06:** **Multiple heads, one payment.** Booker sets headcount N, pays per-head × N in one checkout, and claims N of the date's admissions **atomically**. Reuses the Phase-8 PaxStepper + `declaredPax` concept.
- **OC-07:** **Offer-the-partial at the cap boundary.** If requested N > remaining M > 0, re-prompt "Only M left — book M instead?"; the booker **confirms the reduced headcount + price BEFORE the charge**. The atomic claim grants `min(requested, remaining)` and **reports the granted count** — never a silent partial charge. Refuse outright only at **0 remaining** ("Just sold out"). The final atomic claim at pay time is still the authority and may itself reduce/sell-out — handle gracefully. (Pure all-or-nothing is the recorded fallback if partial-fill proves too complex on the money path.)

### Pricing
- **OC-08:** Host sets **one flat per-head price + a daily capacity cap** (OPEN-01 verbatim). Hourly/day-rate fields are irrelevant for open listings (**hidden in the wizard**). Price = per-head × confirmed heads.
- **OC-09:** The **D-74 service fee still rides on top** (platform revenue, non-refundable); the **D-107 hold-until-session payout rail is untouched**. Whether the per-head price is a **dedicated column** vs a reuse of the Phase-8 `included`/`extraHeadFee` surcharge columns is a schema/planner call — note open-capacity pricing is **purely linear** (no "included base"), so a dedicated per-head field is likely cleaner than bending the base+surcharge model.

### Booking mode
- **OC-10:** **Instant-book only.** Request-to-book is disallowed for open-capacity (frictionless drop-in has no host-approval step; approval on a shared counter would add a held-seat-pending-approval lifecycle for no real use case). The wizard hides the instant/request toggle for open listings.

### Spots-left / availability UX (OPEN-04)
- **OC-11:** **Exact only when low.** A date reads "Available" until spots-left drops **below a threshold (default ≤5, config-tunable)**, then switches to urgency ("Only 3 left"). Greyed, unselectable **"Fully booked"** at 0 — never a dead-end.
- **OC-12:** Search card shows **"Drop-in · ₱/person" + a Drop-in badge, no number** when no date is chosen; the scarcity chip appears **only with a date in play** (search date filter or listing page). The date-availability filter matches an open listing when that date has **≥1 spot left**. (UI phase finalizes the exact chip.)
- **OC-13:** Checkout race-loss copy: **"Just sold out — pick another date"** (the open-capacity twin of the exclusive "just taken"). Extends `read-model.ts` + `search/query.ts` to compute `remaining = cap − occupying-heads`.
- **OC-14:** **No waitlist** in v1 (DISC-02 stays deferred).

### Cancellation
- **OC-15:** Booker cancels their own seat → **reuse the Phase-7 tier ladder** (Flexible/Standard/Strict), refund keyed off hours-to-start where "start" = OC-03's opening-time-on-date. Open listings pick a cancellation tier **at publish**, same as exclusive. Cancelling **frees the seat → spots-left increments** (the counter's release path — a cancelled booking must leave the occupying set).
- **OC-16:** **Host cancel = per-booking** (reuse Phase-7 `cancelBookingAsHost`: full refund incl. service fee + notify, seat frees). A dedicated **bulk "close this date & refund everyone"** action is **DEFERRED**.

### Mode switching & host setup
- **OC-17:** Occupancy mode is chosen in the wizard and **editable in the listing editor ONLY while the listing has no upcoming/active bookings**; once a future booking exists it **locks** until those clear. Prevents stranding a cross-mode unit-claim or counter.
- **OC-18:** **No separate per-booker head cap** in v1 — a booker may grab up to what's remaining (bounded by the daily cap); offer-the-partial (OC-07) handles "not enough left."

### Claude's Discretion / Research owns
- The exact no-overbook mechanism (**OC-05**) — the load-bearing correctness surface; must ship with a genuine concurrent-race test (Phase-3 SC#4 analog).
- Reuse `maxOccupancy` vs a dedicated capacity column (**OC-04**).
- Per-head price: dedicated column vs reuse `included`/`extraHeadFee` (**OC-09**).
- Exact "spots left" chip styling + the low-threshold value (**OC-11/OC-12**) — UI phase.
- How the counter's occupying-status set + release integrates with the existing read model and the exclusive-mode predicates (**OC-13/OC-15**).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap, requirements & project decisions
- `.planning/ROADMAP.md` §"Phase 9: Open-Capacity Bookings" — goal, dependencies, SC#1-4.
- `.planning/REQUIREMENTS.md` — **OPEN-01..04** (the four requirements this phase closes); DISC-02 (waitlist, deferred).
- `.planning/PROJECT.md` §Key Decisions — **D-21** (units occupancy model + GiST `EXCLUDE` keystone; note "per-spot open/free play deferred, will reuse units-as-spots"), plus the Phase-8 group decisions promoted there.
- `.planning/phases/08-group-bookings/08-CONTEXT.md` — **D-107** (single-payer + one-lock invariant), **D-109** (occupancy mode is a first-class host-set property; the three-mode table), **D-110** (drop-in ≠ open play; why they're separate phases), **D-111** (cap authority), **D-112** (the `SELECT … FOR UPDATE` seat-claim + the explicit note that the denormalized-counter alternative is **deferred to Phase 9** for higher contention). *This file is the fullest record of the founder-debate behind the occupancy model.*

### Payments & double-booking mechanics (authoritative)
- `CLAUDE.md` §"Double-Booking Prevention" — `tstzrange '[)'` half-open semantics, partial `WHERE` on occupying statuses, "no app-level query-then-insert" rule.
- `CLAUDE.md` §"Marketplace Payments" — the hold-until-session rail OC-09 reuses unchanged.

### Code Phase 9 extends
- `src/lib/db/schema.ts` — `occupancyMode` enum (`:164`, add `open_capacity`), `listing` table (`maxOccupancy :189`, `unitCount :190`, `occupancyMode :205`, `included`/`extraHeadFee :206-207`), `booking` table + the `booking_no_overlap` EXCLUDE note (`:619-636`).
- `drizzle/0005_booking_exclusion.sql` + `drizzle/0012_booking_exclusion_v2.sql` — the hand-authored GiST `EXCLUDE` (its complement-predicate form + the 55P04 split rationale).
- `src/lib/availability/units.ts` — `createPendingHold` (the per-unit SAVEPOINT loop, 40P01 outer retry, D-42 idempotency) + `pickLowestFreeUnit` (the "units-as-spots" primitive OC-05 may reuse).
- `src/lib/group/seat-claim.ts` — the Phase-8 `SELECT … FOR UPDATE` capacity-counter pattern (the closest existing analog; D-112 says it's too coarse here).
- `src/lib/availability/read-model.ts` + `src/lib/search/query.ts` — the availability/search read models OC-11/OC-12/OC-13 extend to "spots left".
- `src/lib/payments/cancellation.ts` (`quoteRefund`, `hoursToStart`, `LADDER`, `rungBoundaries`) + `src/app/actions/cancel-booking.ts` — the refund ladder OC-15 reuses via OC-03's `starts_at`.
- `src/lib/validation/listing.ts` — `publishSchema` (where `occupancy_mode` + per-head price + cap validation land; already gates `maxOccupancy` positive at publish).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **GiST `EXCLUDE` "units-as-spots" primitive** (`units.ts` `pickLowestFreeUnit` + `createPendingHold`): exclusive = capacity-1 of this same primitive; capacity-N is a candidate open-capacity mechanism with a proven concurrent-race pedigree (Phase-3 SC#4).
- **`SELECT … FOR UPDATE` seat-claim** (`seat-claim.ts`): the count-under-lock capacity pattern, mutation-verified race-free — but D-112 flags it as too coarse for this phase's contention.
- **Phase-7 refund/payout/reminder stack** (`cancellation.ts`, payout sweep, reminders): applies unchanged once OC-03 gives a drop-in booking real `starts_at`/`ends_at`.
- **Phase-8 pax machinery** (`declaredPax`, PaxStepper, `quoteWindow` surcharge path): the per-head × N pattern OC-06 reuses.
- **Existing single-payer PayMongo rail** (`confirmBooking` / checkout / webhook confirm authority / hold-until-session transfer): unchanged (OC-09).

### Established Patterns
- **The DB — not app code — is the sole double-booking/overbook arbiter.** Every read/occupancy predicate mirrors the constraint's occupying-status set. Any new open-capacity counter must hold this invariant and ship with a genuine two-connection race test.
- All times `timestamptz` UTC, displayed venue-local via `@date-fns/tz` at the edges only.
- Money is server-frozen at hold time (quoted triple); the client never supplies a price.

### Integration Points
- `occupancy_mode` enum + listing wizard/editor (host picks mode + per-head price + cap; OC-08/OC-10/OC-17).
- The booking mutation path forks on `occupancy_mode` (exclusive → existing unit-claim; open → new capacity claim).
- Search + availability read models gain a "spots left" projection for open listings (OC-11/12/13).
- Cancellation (booker + host) frees a seat → the counter's release path (OC-15/16).
</code_context>

<specifics>
## Specific Ideas

- **Founder steer that anchored the whole design:** "for a drop-in gym the time slot is not that important — the hours do NOT scale the price." → date-pass model, flat per-head (OC-02/OC-08).
- **Benchmark research** (DISCUSSION-LOG.md): drop-in gyms → date/day-pass (Gympass, Hussle); open-play courts/classes → host-set sessions (Playtomic, CourtReserve, Pickleheads, Mindbody, Eversports); arbitrary flat-priced window → essentially nobody. FitOut v1 = the drop-in-gym pattern; the court pattern is the deferred Model B.
- **"Just sold out"** as the deliberate open-capacity twin of the exclusive "That time was just taken" copy (`mapBookingError`).
</specifics>

<deferred>
## Deferred Ideas

- **Model B — host-set named open blocks/sessions** (per-block cap, per-block spots-left, waitlist — the Playtomic/Mindbody open-play-court pattern). Research showed it's **additive over Model A** (a block = a named sub-window of operating hours with its own cap), so the data model should be shaped to extend into it **without a rewrite**. The designed-for next enhancement.
- **Bulk "close this date & refund everyone" host action** (OC-16 alternative) — good operator UX for a busy drop-in day; deferred to keep Phase-9 scope on the concurrency core.
- **Waitlist / notify-me when full** — DISC-02, explicitly out of scope.
- **Optional per-booking head cap** (OC-18 alternative) — a fast-follow if a host needs to stop one booker sweeping many spots.
- **Pure all-or-nothing headcount claim** (OC-07 alternative) — simpler seat-claim if offer-the-partial proves too costly on the money path.
- **Space-type presets / onboarding templates** that pre-configure occupancy mode + pricing per space type — at most a *soft-nudge default* in the wizard (the same space type goes both ways, so it can never be a hard preset). Its own scope.
- **Peak/off-peak or day-of-week per-head pricing variation** — v1 is a single flat per-head price.
- **GPAY-01** (organizer-driven open play / cost-split — multi-payer, exclusion-preserving, builds on Phase-8 RSVP) and **GPAY-02** (per-attendee ticketing) — different modes, future milestones. Explicitly NOT combined with open-capacity here (D-110).

### Reviewed Todos (not folded)
None — no pending todos matched this phase.
</deferred>

---

*Phase: 9-open-capacity-bookings*
*Context gathered: 2026-07-30*
