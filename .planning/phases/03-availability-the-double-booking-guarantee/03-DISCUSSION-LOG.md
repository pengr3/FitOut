# Phase 3: Availability & the Double-Booking Guarantee - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-10
**Phase:** 3-Availability & the Double-Booking Guarantee
**Areas discussed:** Slot granularity, Day vs hourly / occupancy model, Blocks & overrides, Hours shape & horizon

---

## Slot granularity

| Option | Description | Selected |
|--------|-------------|----------|
| 30-minute units | Book in 30-min increments; starts snap :00/:30; more flexible | |
| 60-minute units | Whole hours only, on-the-hour starts; simplest | ✓ |
| You decide | Claude picks | |

**User's choice:** 60-minute units (on-the-hour starts).

| Option | Description | Selected |
|--------|-------------|----------|
| Any consecutive free hours | Select any run of consecutive available hours in the day's window; day rate for a whole day | ✓ |
| Cap at a max (e.g. 4h) | Cap hourly length to nudge toward day rate | |
| You decide | Claude picks | |

**User's choice:** Any consecutive free hours (no cap).
**Notes:** Granularity treated as platform-wide fixed 60-min for v1 (Claude's discretion); per-listing granularity deferred.

---

## Day vs hourly / occupancy model

| Option | Description | Selected |
|--------|-------------|----------|
| Exclusive whole-space rental | One booking reserves the whole space; exclusion constraint by listing; maxOccupancy = group size | |
| Shared up to capacity | Multiple overlapping bookings until headcount full; breaks the by-listing constraint | |
| You decide | Claude picks | |
| (freeform) "could be, depends on host capacity" | User's initial freeform steer | ✓ |

**User's choice:** Freeform — "depends on host capacity"; primarily public places, leaning shared (B), asked why B is a problem.
**Notes:** Explored at length. Clarified that "shared" (B) either means (B1) multiple concurrent bookings/units or (B2) sum-of-people on a shared floor; only B2 is genuinely hard (no clean DB constraint) and overlaps the out-of-scope per-attendee ticketing.

| Option | Description | Selected |
|--------|-------------|----------|
| One listing per unit | Each court its own exclusive listing (capacity 1) | |
| One listing, N units | Listing declares unit count; up to N overlapping bookings, per-unit exclusion constraint | |
| Need true shared drop-in (B2) | Per-spot shared floor; out-of-scope variant | |
| Talk it through more | Keep reasoning | ✓ |

**User's choice:** Talk it through more → then gave the 8-court scenario (group books 1 of 8 courts exclusively; others free; plus "individuals who want free play among others").
**Notes:** Scenario resolved into two products — (1) reserve a court = units model (in scope); (2) free/open play = per-attendee ticketing (out of scope, deferred, reuses units-as-spots later).

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — units now, open play later | Build units model (unitCount, default 1); defer per-spot open play; record D-21 | ✓ |
| Open play is core — build it in v1 | Scope change; pause for roadmap decision | |
| Simplest — one listing per court | No units model; each court a listing | |
| Talk it through more | Keep reasoning | |

**User's choice:** Yes — units now, open play later (D-21).

| Option | Description | Selected |
|--------|-------------|----------|
| The operating window that day | Day booking spans unit's open→close; day rate; blocks all hourly on that unit | ✓ |
| The full calendar day (24h) | Locks midnight–midnight regardless of hours | |
| You decide | Claude picks | |

**User's choice:** The operating window that day.

---

## Blocks & overrides

| Option | Description | Selected |
|--------|-------------|----------|
| Partial time ranges | Block any sub-range of a date or a whole day | ✓ |
| Whole days only | Can only close an entire date | |
| You decide | Claude picks | |

**User's choice:** Partial time ranges.

| Option | Description | Selected |
|--------|-------------|----------|
| Block-only (close/subtract) | Overrides only close time; unblock removes a block | ✓ |
| Both close and open extra | Also open normally-closed time as a one-off | |
| You decide | Claude picks | |

**User's choice:** Block-only (positive overrides deferred).

| Option | Description | Selected |
|--------|-------------|----------|
| Per-unit or whole-listing | Block can target one unit or the whole listing; hours stay listing-wide | ✓ |
| Whole-listing only | Blocks always close all units | |
| You decide | Claude picks | |

**User's choice:** Per-unit or whole-listing.

---

## Hours shape & horizon

| Option | Description | Selected |
|--------|-------------|----------|
| Multiple windows per weekday | Each weekday one or more open–close windows (split schedules) | ✓ |
| One window per weekday | Single open–close pair or closed | |
| You decide | Claude picks | |

**User's choice:** Multiple windows per weekday.

| Option | Description | Selected |
|--------|-------------|----------|
| Rolling 90-day window | Bookable up to ~90 days out (platform default) | ✓ |
| Rolling 30-day window | Only next month bookable | |
| You decide | Claude picks | |

**User's choice:** Rolling 90-day window (planner may tune; per-host config deferred).

| Option | Description | Selected |
|--------|-------------|----------|
| No minimum (start must be future) | Any still-future slot bookable, incl. soon; spontaneous play | ✓ |
| Small minimum notice (e.g. 1h) | Slot must start ~1h out | |
| You decide | Claude picks | |

**User's choice:** No minimum lead time (per-host config deferred).

## Claude's Discretion

- Slot granularity platform-wide fixed at 60-min for v1 (per-listing deferred).
- Venue timezone handling (per-listing IANA tz, default launch region; `timestamptz` UTC + `@date-fns/tz`) — D-27.
- Phase 3 owns the `booking` occupancy table + GiST exclusion constraint (partial WHERE excludes cancelled/declined; `btree_gist`; hand-authored migration) — D-28.
- Schema shapes (`operating_hours`, `availability_block`, `booking`, unit identity), availability read model, exact horizon length, calendar UI (→ UI-SPEC), and where hours/blocks editing lives in the `(host)` dashboard.
- Empty calendar when no operating hours set; hours not added to the Phase-2 publish gate.

## Deferred Ideas

- Per-spot open/free play (per-attendee ticketing) — reuses units-as-spots later; sum-of-headcounts variant out of scope indefinitely.
- Per-listing/per-host slot granularity; positive availability overrides; per-host horizon + lead-time controls.
- Day-rate pricing application/cap vs hourly×hours (Phase 4/5).
- Named units / per-unit amenities.
