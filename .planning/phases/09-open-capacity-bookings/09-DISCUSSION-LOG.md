# Phase 9: Open-Capacity Bookings - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-30
**Phase:** 9-open-capacity-bookings
**Areas discussed:** Slot model, Heads per booking, Pricing & booking mode, Spots-left UX, Cancellation, Mode switching, Per-booker head cap

---

## Slot model

Founder steered mid-question: *"for a drop-in gym the time slot is not that important — the hours do NOT scale the price."* Reframed drop-in as a day-pass / entry fee, not an hourly rental. Then asked "how would this work as a booker / are there space-type presets?" — clarified that `occupancy_mode` is a free per-listing choice independent of space type (the same gym or court goes both ways), so presets can only be a soft nudge, not a determinant. Asked for **research on best practices**.

Research (gsd-advisor-researcher, 12 sources) findings: drop-in gyms → date/day-pass (Gympass, Hussle); open-play courts + drop-in classes → host-set sessions (Playtomic, CourtReserve, Pickleheads, Mindbody, Eversports); arbitrary flat-priced window → essentially nobody (only desk-booking, via split-into-N-sub-spaces).

| Option | Description | Selected |
|--------|-------------|----------|
| A — Date = one pass | Booker picks a DATE; flat per-head; entry valid during operating hours that day; cap = admissions/(listing,date); exact spots-left; reuses operating-hours model, no new authoring | ✓ |
| B — Host-set sessions now | Named open blocks with per-session cap + spots-left; better for timed open-play; new authoring UI + session entity | |
| C — Arbitrary window, flat-priced | Booker picks start/end, flat fee, per-instant capacity; no market precedent, hardest concurrency | |

**User's choice:** A — Date = one pass (matching the research recommendation).
**Notes:** Model B recorded as the designed-for future enhancement (research showed it's additive over A, not a rewrite). Model C ruled out.

---

## Heads per booking

| Option | Description | Selected |
|--------|-------------|----------|
| Multiple heads, one payment | Booker sets N, pays per-head × N in one checkout, claims N atomically; cap counts sum-of-heads; reuses Phase-8 declaredPax | ✓ |
| One spot per booking | Each person books one spot; friends book separately; simplest counter but poor group UX | |

**User's choice:** Multiple heads, one payment.

**Cap-boundary follow-up (N requested, M<N left):**

| Option | Description | Selected |
|--------|-------------|----------|
| All-or-nothing | Refuse with "Only M left — reduce or pick another day"; claim all N or none | |
| Offer the partial | Re-prompt "Only M left — book M instead?"; proceed with M after confirm | ✓ |

**User's choice:** Offer the partial.
**Notes:** Not a silent partial charge — booker confirms reduced headcount + price before the charge; refuse outright only at 0. Pure all-or-nothing kept as a fallback.

---

## Pricing & booking mode

Pricing shape settled by consequence of Slot model + Heads (flat per-head + daily cap, duration doesn't scale, service fee + payout rail unchanged). One open flow question:

| Option | Description | Selected |
|--------|-------------|----------|
| Instant-book only | Always pay-to-confirm; wizard hides the instant/request toggle for open listings | ✓ |
| Allow request-to-book too | Host approves each drop-in seat; adds held-seat-pending-approval lifecycle on a shared counter | |

**User's choice:** Instant-book only.

---

## Spots-left UX

| Option | Description | Selected |
|--------|-------------|----------|
| Exact count always | Every date shows the real number; greyed "Fully booked" at 0; most transparent | |
| Exact only when low | "Available" until below a threshold (≤5), then "Only N left"; "Fully booked" at 0 | ✓ |

**User's choice:** Exact only when low.

**Full-date follow-up:**

| Option | Description | Selected |
|--------|-------------|----------|
| Greyed "Fully booked" | Unselectable date, pick another; no waitlist (DISC-02 deferred); "Just sold out" race copy | ✓ |
| Add a waitlist / notify-me | DISC-02, out of scope → would be deferred, not built | |

**User's choice:** Greyed "Fully booked".
**Notes:** Threshold default ≤5, config-tunable. Search card shows Drop-in badge + ₱/person, scarcity chip only with a date.

---

## Cancellation

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse tier ladder | Flexible/Standard/Strict at publish; ladder runs off hours-to-start where start = opening time on the booked date; reuses all of Phase 7 | ✓ |
| Simpler drop-in policy | A parallel drop-in-specific rule (refundable-until-opening / non-refundable day pass) | |

**User's choice:** Reuse tier ladder.

**Host-closes-a-date follow-up:**

| Option | Description | Selected |
|--------|-------------|----------|
| Per-booking cancel | Reuse Phase-7 host-cancel per booking (full refund + notify, seat frees); zero new surface | ✓ |
| Bulk close-date in v1 | New "Close this date & refund everyone" action; bulk refund loop + failure handling | |

**User's choice:** Per-booking cancel. Bulk close-date deferred.

---

## Mode switching

| Option | Description | Selected |
|--------|-------------|----------|
| Switch if no live bookings | Mode editable in the editor only while no upcoming/active bookings; locks once a future booking exists | ✓ |
| Lock after publish | Mode immutable once published; changing = new listing | |

**User's choice:** Switch if no live bookings.

---

## Per-booker head cap

| Option | Description | Selected |
|--------|-------------|----------|
| No separate cap | Grab up to what's remaining (bounded by the daily cap); daily cap reuses the space's people-capacity (maxOccupancy) | ✓ |
| Optional per-booking cap | Host optionally caps heads-per-booking, separate from the daily cap | |

**User's choice:** No separate cap.
**Notes:** Flagged for research whether the daily cap repurposes `maxOccupancy` or needs a dedicated column (its exclusive-mode meaning differs).

---

## Claude's Discretion / deferred to research

- The exact DB-atomic no-overbook mechanism (units-as-spots vs serializable/advisory-lock counter) — OPEN-03/SC#3, must ship with a genuine concurrent-race test.
- Reuse `maxOccupancy` vs a dedicated capacity column for the daily cap.
- Per-head price: dedicated column vs reuse Phase-8 `included`/`extraHeadFee`.
- Exact spots-left chip styling + the low threshold value (UI phase).

## Deferred Ideas

- Model B — host-set named open blocks/sessions (the open-play-court pattern) — designed-for next enhancement.
- Bulk "close this date & refund everyone" host action.
- Waitlist / notify-me when full (DISC-02).
- Optional per-booking head cap.
- Pure all-or-nothing headcount claim (partial-fill fallback).
- Space-type presets / onboarding templates (soft-nudge default at most).
- Peak/off-peak or day-of-week per-head pricing.
- GPAY-01 (organizer open play / cost-split) + GPAY-02 (per-attendee ticketing) — future milestones, not combined with open-capacity here.
