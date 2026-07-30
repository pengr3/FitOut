---
phase: 09-open-capacity-bookings
plan: 04
subsystem: api
tags: [postgres, drizzle, read-model, availability, open-capacity, server-actions, date-fns, zod]

# Dependency graph
requires:
  - phase: 09-01
    provides: "listing.occupancy_mode = open_capacity, listing.per_head_price_cents, booking.open_capacity"
  - phase: 09-02
    provides: "openTakenSql / OPEN_OCCUPYING_STATUS_SQL / loadOpenDayWindow / spotsState — the shared occupying predicate, day window and scarcity threshold"
provides:
  - "getAvailability forks on the PERSISTED listing.occupancy_mode: an open listing returns spots-left for a DATE, an exclusive listing returns the byte-unchanged hour grid"
  - "DayAvailability.occupancyMode + DayAvailability.openCapacity (OpenCapacityDay) — remaining, cap, server-derived state, entry window, openTime/closeTime, bookable"
  - "getOpenMonthAvailability (read model + public server action) — the fully-booked venue-local date set for the calendar's disabled matcher"
  - "EMPTY_AVAILABILITY and the read model's unknown-listing fallback carry the same two new fields"
  - "tests/availability/open-capacity-readmodel.test.ts — 10 DB-backed cases, both predicate mutations executed RED"
affects: [09-05, 09-09, 09-10, 09-11, 09-12, 09-13, 09-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-model fork on a persisted arbiter, not a client flag: one entry point, two payload shapes, additive fields only"
    - "Server-derived display state riding on the read-model payload (the D-100 bookingMode precedent, applied to scarcity)"
    - "Shared SQL fragment import as the structural guarantee against projection/arbiter drift (Pitfall 4)"

key-files:
  created:
    - tests/availability/open-capacity-readmodel.test.ts
  modified:
    - src/lib/availability/read-model.ts
    - src/app/actions/availability.ts

key-decisions:
  - "D-UI-Q2 realized: the read model carries a SERVER-DERIVED `state` (open|low|full); the client never re-derives the threshold"
  - "getOpenDay reuses loadOpenDayWindow instead of re-reading operating_hours inline, so the OC-02 split-shift envelope rule stays in exactly one place"
  - "The month map shares only the STATUS half of the occupying set (the per-date aggregate shape necessarily differs) — imported, never retyped"
  - "A NULL max_occupancy fails closed to zero admissions in the projection, matching createOpenCapacityHold exactly"
  - "Month bounds are widened one day on each side then filtered by the venue-local month prefix, because a venue's opening instant can fall in the previous UTC month"

patterns-established:
  - "Pitfall-4 enforcement by import: any new open-capacity consumer calls openTakenSql / OPEN_OCCUPYING_STATUS_SQL rather than writing a predicate"
  - "Test fixtures for open capacity derive expected UTC instants by plain +08 arithmetic — an independent second opinion, never a re-run of the TZDate math under test"

requirements-completed: [OPEN-04]

# Metrics
duration: 22min
completed: 2026-07-30
---

# Phase 09 Plan 04: Open-Capacity Read Model Summary

**`getAvailability` now forks on the persisted `occupancy_mode` — a drop-in listing answers with `{remaining, cap, state, entry window, bookable}` for a DATE instead of an hour grid, counted with the SAME imported `openTakenSql` fragment the admissions claim counts with, plus `getOpenMonthAvailability` for the calendar's fully-booked date set.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-30T10:22:00Z
- **Completed:** 2026-07-30T10:44:19Z
- **Tasks:** 3
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments

- **The projection and the arbiter cannot drift.** `getOpenDay` calls the shared `openTakenSql`; the month query embeds the shared `OPEN_OCCUPYING_STATUS_SQL`. Both mutations were EXECUTED: inlining a confirmed-only day predicate turned cases 2 and 10 red (`expected 10 to be 6` — the calendar advertising the full cap on a date the counter had already sold 4 of); retyping the month status predicate turned case 9 red (a lapsed hold wrongly disabling a date that is genuinely selectable). Both restored, `git diff --exit-code src/lib/availability/read-model.ts` exits 0.
- **Scarcity is decided server-side.** `state` is computed via the imported `spotsState`, so the threshold's non-public ceiling never has to reach the browser. `grep -c 'lowStockThreshold\|OPEN_LOW_STOCK_MAX' src/lib/availability/read-model.ts` is `0` — the read model applies the threshold, it never re-implements it (T-09-13).
- **OC-01 is a fork, not a replacement.** Every exclusive payload gains exactly `occupancyMode: "exclusive"` and `openCapacity: null`; the `SlotState` union and its exhaustive switch are untouched; `grep -c "status = 'confirmed'"` on the read model is still `1` (the pre-existing exclusive predicate). All 133 pre-existing `tests/availability` + `tests/search` tests pass unchanged.
- **Cancellation and expiry need no release code.** Cases 3 and 4 prove a lapsed hold and a cancelled booking both return their heads with no worker and no write — the drift-free-by-construction property that rules out a stored counter (OC-15 / Pitfall 3).
- **The month map handles the timezone trap.** Case 9 pins a fully-booked 1st of the month (whose opening instant lands in the *previous* UTC month, the reason the bounds are widened) as present, and a fully-booked last day of the previous month as absent.

## Task Commits

1. **Task 1: getAvailability's open-capacity fork** — `bf30fa3` (feat)
2. **Task 2: the public read actions carry the open payload** — `8c8e8c7` (feat)
3. **Task 3: tests/availability/open-capacity-readmodel.test.ts** — `f4587ee` (test)

## Files Created/Modified

- `src/lib/availability/read-model.ts` — adds `OpenCapacityDay`, `OpenMonthAvailability`, the `occupancyMode`/`openCapacity` fields on `DayAvailability`, the module-private `getOpenDay` branch, and the exported `getOpenMonthAvailability`. The listing select now also reads `occupancy_mode`, `max_occupancy` and `per_head_price_cents`.
- `src/app/actions/availability.ts` — `EMPTY_AVAILABILITY` gains the two new fields; new public `getOpenMonthAvailability` action with its own Zod `monthLocalSchema` and its own copy of the published + non-deleted re-gate.
- `tests/availability/open-capacity-readmodel.test.ts` — 10 integration cases (created, 442 lines).

## Decisions Made

1. **`getOpenDay` delegates to `loadOpenDayWindow`** rather than re-reading `operating_hours` with `min(open_time)/max(close_time)` inline as the plan sketched. Cost: one extra tiny listing select. Benefit: the OC-02 "a split-shift day is ONE pass covering the outer envelope" rule exists in exactly one place — the same argument that makes the occupying predicate shared. `null` from it now unambiguously means *the venue is closed that weekday* (the listing row is already known to exist).
2. **The month map necessarily duplicates the aggregate shape.** `SUM(b.declared_pax)` now appears in two places in `src/` (`open-capacity.ts`'s single-date scalar and the read model's per-date `GROUP BY`). The plan called this out and it is unavoidable — but the *status* half, which is the part that actually drifts, is imported. The comment at the query says so.
3. **`bookable` uses the injectable `now`; occupancy uses SQL `now()`.** Restated in a comment at the call site, mirroring the exclusive predicate's Pitfall-7 rule. `bookable` is a display courtesy; `createOpenCapacityHold` refuses the same two cases server-side.
4. **The published gate is written out twice, not extracted.** Both public actions carry their own copy so a refactor of one cannot silently remove it from the other (WR-01 / T-09-12).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `EMPTY_AVAILABILITY` extended inside Task 1's commit**
- **Found during:** Task 1
- **Issue:** Making `occupancyMode`/`openCapacity` required on `DayAvailability` immediately broke `npx tsc --noEmit` at `src/app/actions/availability.ts:31` — Task 1's own acceptance criterion is a green `tsc`, which is unreachable while a downstream literal is missing the fields.
- **Fix:** The compiler-forced two-line extension of `EMPTY_AVAILABILITY` was included in Task 1's commit; Task 2 then added the month action and the header note on top of it.
- **Files modified:** `src/app/actions/availability.ts`
- **Verification:** `npx tsc --noEmit` exits 0; Task 2's `grep -c "openCapacity: null"` still prints `1`.
- **Committed in:** `bf30fa3`

**2. [Rule 1 - Bug] The plan's case-2 and case-3 expectations were arithmetically wrong**
- **Found during:** Task 3
- **Issue:** Two of the plan's predicted numbers contradict its own 09-UI-SPEC threshold table and the shipped `spotsState`:
  - Case 2 (`confirmed 3` + `pending 2` on cap 10 ⇒ remaining 5) predicts `state === "open"`, but `lowStockThreshold(10) = clamp(floor(10/2), 1, 5) = 5` and `spotsState` returns `"low"` at `remaining <= 5`. The plan's own case 5 asserts exactly that (`occupy 5 ⇒ remaining === 5, state === "low"`), so the plan contradicts itself.
  - Case 3 (the pending lapses, leaving only the confirmed 3) predicts `remaining` "goes back to `8`"; `10 − 3 = 7`.
- **Fix:** Asserted the correct values (`"low"` and `7`). The row shapes the plan specified are unchanged — only the expected outputs were corrected, so the boundary the plan wanted pinned is still pinned. Both are annotated in the test file so the discrepancy is not re-litigated.
- **Files modified:** `tests/availability/open-capacity-readmodel.test.ts`
- **Verification:** 10/10 green; case 5 independently re-pins the same boundary from the other side (remaining 6 ⇒ `"open"`).
- **Committed in:** `f4587ee`

**3. [Rule 3 - Blocking] Two prescribed doc comments defeated their own acceptance greps**
- **Found during:** Task 1
- **Issue:** The plan's verbatim comment text for `OpenCapacityDay` names `lowStockThreshold(cap)` and `OPEN_LOW_STOCK_MAX`, while its own acceptance criterion requires `grep -c 'lowStockThreshold\|OPEN_LOW_STOCK_MAX' src/lib/availability/read-model.ts` to print `0`. This is the fourth occurrence of the same class in Phase 9 (09-01, 09-02, 09-06, 09-08 all hit it).
- **Fix:** Reworded to "the shared scarcity threshold that open-capacity.ts owns" and "that threshold's ceiling is a NON-PUBLIC server constant". Meaning and the D-75/D-100 citations are preserved; the grep tripwire stays usable for later plans.
- **Files modified:** `src/lib/availability/read-model.ts`
- **Verification:** all seven Task-1 greps produce their specified values.
- **Committed in:** `bf30fa3`

**4. [Rule 2 - Missing Critical] Case 9 strengthened so the month map's shared predicate is load-bearing**
- **Found during:** Task 3
- **Issue:** As specified, case 9 used only `confirmed` rows — so retyping the month query's status predicate (exactly the T-09-14 drift the plan is defending against) would NOT have turned it red. A mutation-proof gate that a mutation cannot kill is a comment.
- **Fix:** One of the two rows filling the mid-month date is now a LIVE `pending`, and the partially-booked date carries an additional STALE `pending` for 7 heads that would tip it to exactly the cap if lazy expiry were ignored. Both halves of the status predicate are now pinned.
- **Files modified:** `tests/availability/open-capacity-readmodel.test.ts`
- **Verification:** mutation B (`AND (b.status = 'confirmed' OR b.status = 'pending')`) turns case 9 RED — the lapsed hold's 7 heads wrongly disable a selectable date. Restored, green.
- **Committed in:** `f4587ee`

**5. [Rule 2 - Missing Critical] `import { tz }` aliased to `venueTz`**
- **Found during:** Task 1
- **Issue:** `getAvailability` already binds a local `tz` to the venue timezone **string**; importing `@date-fns/tz`'s `tz` **function** under the same name would shadow it inside that function — two different things called `tz` in the one module whose job is timezone correctness.
- **Fix:** Imported as `venueTz` with a comment stating why.
- **Files modified:** `src/lib/availability/read-model.ts`
- **Verification:** `npx tsc --noEmit` 0, `npx eslint` clean.
- **Committed in:** `bf30fa3`

---

**Total deviations:** 5 auto-fixed (2 blocking, 2 missing-critical, 1 bug)
**Impact on plan:** No scope change. Two are plan-text corrections (the arithmetic slips and the self-defeating grep), one is a compiler-forced ordering adjustment, and two strengthen correctness/clarity. Every acceptance criterion the plan states is satisfied as stated.

## Issues Encountered

- **The plan's `SUM(b.declared_pax)` single-place property is now relaxed to two places.** 09-02's summary recorded that the aggregate appeared in exactly one file in `src/`; the month map's `GROUP BY` shape cannot reuse the single-date scalar. This was anticipated by the plan text. The invariant that actually matters — *which rows occupy a spot* — remains single-sourced and is mutation-proven in both directions.

## Threat Flags

None — no new network surface, auth path, file access or trust-boundary schema change. Both new/changed entry points are public reads that re-enforce the server-derived published + non-deleted gate; T-09-15 (occupancy enumeration) remains an accepted, pre-existing class.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **09-05 (search Stage-2 open branch)** can now keep an open candidate iff `avail.openCapacity.remaining >= 1` through `getAvailability` — no second SQL availability predicate, as `query.ts`'s header demands. `perHeadPriceCents` rides on the payload for the price line.
- **09-09 / 09-10 / 09-11 (calendar, day panel, spots chip)** have everything the 09-UI-SPEC contract needs: `state` for the three-chip states, `remaining` for the `Only {n} left` numeral, `fullDates` for react-day-picker's `disabled` matcher, `openTime`/`closeTime` for the "Open 6:00 AM – 10:00 PM · {City} time" line, and `bookable` for the CTA.
- **Two things consumers must NOT do:** re-derive the scarcity threshold client-side (it is server-only by design), and render `dayOpenUtc`/`dayCloseUtc` as a reservation — they are an ENTRY WINDOW (09-UI-SPEC O2), which is the CR-01 repeat 09-08 forked the label to prevent.
- Repo state: `npm test` **928 passed / 4 skipped** (102 files + 1 skipped, up from 918), `npx tsc --noEmit` 0 errors, `npm run lint` 0 errors / 7 baseline warnings.

## Self-Check: PASSED

- `src/lib/availability/read-model.ts` — FOUND
- `src/app/actions/availability.ts` — FOUND
- `tests/availability/open-capacity-readmodel.test.ts` — FOUND
- commit `bf30fa3` — FOUND
- commit `8c8e8c7` — FOUND
- commit `f4587ee` — FOUND

---
*Phase: 09-open-capacity-bookings*
*Completed: 2026-07-30*
