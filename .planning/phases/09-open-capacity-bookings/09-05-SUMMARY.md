---
phase: 09-open-capacity-bookings
plan: 05
subsystem: api
tags: [search, postgres, drizzle, pricing, service-fee, availability, scarcity]

# Dependency graph
requires:
  - phase: 09-open-capacity-bookings (09-01)
    provides: "listing.occupancy_mode = open_capacity, listing.per_head_price_cents, booking.open_capacity"
  - phase: 09-open-capacity-bookings (09-02)
    provides: "openTakenSql / spotsState / lowStockThreshold — the shared admissions predicate + threshold"
  - phase: 09-open-capacity-bookings (09-04)
    provides: "getAvailability's open fork returning OpenCapacityDay {remaining, cap, state, bookable, …}"
  - phase: 04-search-discovery
    provides: "searchListings two-stage search, SearchResultRow, allInRateParts (D-75)"
provides:
  - "allInRateParts / hasAllInRate open-capacity branch: exactly one all-in `₱/person` part, server-composed"
  - "SearchResultRow.occupancyMode + .perHeadPriceCents + .spots {remaining, cap, state} | null"
  - "effectivePriceSql — ONE expression driving BOTH the Stage-1 price ceiling and the sort=price ORDER BY"
  - "Stage-2 open-capacity branch: a drop-in listing matches on DATE ONLY, kept iff bookable && remaining >= 1"
  - "tests/search/open-capacity-search.test.ts (12 cases: 4 pure + 8 DB-backed)"
affects: [09-14 (search card mount), 09-12, 09-13, search, pricing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional-props widening (D-108 precedent) over a discriminated union, so shipped call sites compile untouched"
    - "One shared SQL expression for a filter AND its matching sort, so the two can never diverge"
    - "Stage-2 mode fork reads getAvailability only — never a second SQL availability predicate (D-34)"

key-files:
  created:
    - tests/search/open-capacity-search.test.ts
  modified:
    - src/lib/booking/all-in-rate.ts
    - src/lib/search/query.ts

key-decisions:
  - "effectivePriceSql compares an hourly rate against a per-person day pass — deliberately imperfect: ranking a drop-in listing approximately is strictly better than deleting it from a filtered search"
  - "The Stage-2 open branch ignores hasWindow entirely (OC-02 / 09-UI-SPEC O2) — a pass is not an hour window"
  - "spots stays null in the no-date browse view (OC-12), so a drop-in card shows badge + rate and no number"
  - "hasAllInRate gained the same open branch as allInRateParts so the `Service fee included` qualifier cannot go missing under an all-in price"

patterns-established:
  - "Latent-trap closure is proven by MUTATION: the old expression is restored, the test goes RED with a captured message, and the file is restored (git diff --exit-code)"
  - "A drop-in fixture deliberately KEEPS its hourly/day rates, so an assertion can only pass by keying on the persisted occupancy_mode"

requirements-completed: [OPEN-04, OPEN-01]

# Metrics
duration: 26min
completed: 2026-07-30
---

# Phase 9 Plan 05: Search Knows About Drop-In Listings Summary

**A drop-in listing is now findable: it advertises one all-in `₱367.50/person` rate, survives a price filter and sorts by its per-head price through one shared `effectivePriceSql`, and Stage-2 keeps it on a picked DATE only while that date still has a spot — carrying the server-derived scarcity state onto the row.**

## Performance

- **Duration:** 26 min
- **Started:** 2026-07-30T20:36:00Z
- **Completed:** 2026-07-30T21:02:00Z
- **Tasks:** 3
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments

- **The latent trap is CLOSED and the closure is MEASURED, not asserted.** Stage-1's price ceiling used to read `l.hourly_rate_cents <= ${priceMax}`. On a listing that prices only per head that column is NULL, and `NULL <= n` is NULL — not false — so Postgres silently **deleted every drop-in listing from a filtered search**, while the identical expression on the `ORDER BY` buried them last under `sort=price`. One `effectivePriceSql` (`CASE WHEN l.occupancy_mode::text = 'open_capacity' THEN l.per_head_price_cents ELSE l.hourly_rate_cents END`) now drives **both**.
- **Both halves of the trap were executed RED against the OLD expression and restored** (see Verification below).
- `allInRateParts` / `hasAllInRate` gained an open branch behind **optional props**, so all three shipped exclusive call sites (`src/app/listings/[id]/page.tsx`, `src/components/search/search-result-card.tsx`, `src/lib/search/query.ts`) compile untouched and render byte-identically.
- Stage-2 forks on the persisted mode: an open listing matches on **date only** (`hasWindow` is never consulted), and is kept only when `bookable && remaining >= 1` — so a `full` date can never reach a search card.
- The row carries `spots: {remaining, cap, state} | null`. The `state` comes straight from the 09-04 read model (whose threshold ceiling is a non-public server constant); search re-derives nothing.

## Task Commits

1. **Task 1: the /person all-in rate branch** — `bc44d54` (feat)
2. **Task 2: Stage-1 columns + effective-price filter/sort; Stage-2 spots-left branch** — `0b8fd33` (fix)
3. **Task 3: search integration cases** — `5a13289` (test)

## Files Created/Modified

- `src/lib/booking/all-in-rate.ts` — new `RateSource` type with optional `perHeadPriceCents` / `occupancyMode`; both exported functions branch on the mode. The open branch returns exactly one `₱…/person` part, fee-composed with the same `computeServiceFee` the checkout breakdown uses (D-75). The module's "a RATE, never a promised total" header rule is respected — nothing is multiplied out.
- `src/lib/search/query.ts` — `SearchResultRow` gains `occupancyMode`, `perHeadPriceCents`, `spots`; `RawRow` + the Stage-1 `SELECT` gain `l.occupancy_mode, l.per_head_price_cents`; `effectivePriceSql` is defined once and used by the `priceMax` predicate and the `sort=price` `ORDER BY`; Stage-2 gains the open-capacity fork.
- `tests/search/open-capacity-search.test.ts` — 12 cases: 4 pure (`allInRateParts` / `hasAllInRate`) + 8 DB-backed (`searchListings`).

## Decisions Made

- **`effectivePriceSql` compares unlike units on purpose.** An hourly rate and a per-person day pass are not the same thing, so a mixed price sort is approximate. That is the correct trade: ranking a drop-in listing approximately is strictly better than making it invisible to a price-filtered search. The rationale is written into the code comment so a later reader does not "fix" it back.
- **`::text` cast on the enum**, matching the shipped `l.primary_space_type::text = ${category}` idiom directly below it. This is a runtime query, so naming an enum value here carries no 55P04 migration hazard.
- **The open branch never consults `hasWindow`.** Filtering (or captioning) a day pass by an hour range would advertise a reservation the booker is not buying (09-UI-SPEC O2). A comment states this explicitly, and an acceptance grep over the branch body pins it at 0.
- **`hasAllInRate` gained the branch too.** It is currently unused in `src/` (both surfaces gate the muted qualifier on `priceParts.length > 0`), but leaving it exclusive-only would arm a trap for whoever wires it: an all-in `/person` price shown with no statement that it is all-in — exactly the mismatch D-75 exists to prevent. A test pins that the two functions agree in both directions.
- **The drop-in fixture deliberately keeps `hourly_rate_cents: 90000` and `day_rate_cents`** (09-07's lesson: 09-06 requires a per-head price but never clears the exclusive columns, and OC-17 permits the mode switch). This makes every assertion pass *only* by keying on the persisted `occupancy_mode` — and it is what lets the priceMax mutation fail loudly instead of silently.

## Verification

### The trap, proven closed by mutation

`src/lib/search/query.ts` was reverted to the old expression in **both** places (`AND l.hourly_rate_cents <= ${priceMax}` and `l.hourly_rate_cents ASC, l.created_at DESC`) and the new test file re-run:

```
× keeps an open listing under a priceMax ABOVE its per-head price, and drops it below
    AssertionError: expected [ 'OC_exclusive' ] to include 'OC_open'
× ranks an open listing by its per-head price under sort=price, not by its ignored hourly rate
    AssertionError: expected 1 to be less than 0
Tests  2 failed | 10 passed (12)
```

The first message **is the shipped bug**: a drop-in listing deleted from a filtered search. The second is the burial half — index 1 (last) instead of 0 (first). The file was then restored and `git diff --exit-code src/lib/search/query.ts` returned 0.

The fixture proves the trap via the *rate-mismatch* direction (hourly 90000 > the 50000 ceiling). The **NULL** direction — the shape a pure drop-in listing has — was proven separately against the live DB, since a NULL comparison drops the row at *every* ceiling:

```
docker compose exec -T db psql -U fitout -d fitout -c "SELECT (NULL::int <= 50000) IS NULL AS null_compare_is_null,
  (SELECT count(*) FROM (VALUES (NULL::int)) v(hourly) WHERE v.hourly <= 50000) AS rows_kept_by_old_predicate;"
 null_compare_is_null | rows_kept_by_old_predicate
----------------------+----------------------------
 t                    |                          0
```

### Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npx vitest run tests/search` | 5 files / 28 tests passed (4 pre-existing files unchanged and green) |
| `npm test` (full suite) | **1000 passed / 4 skipped** (was 988/4 — exactly +12, this plan's new cases) |
| `npm run lint` | 0 errors / 7 baseline warnings |
| `npm run build` | exit 0 |
| `git status --short -- src/` | empty |

### Acceptance greps

| Grep | Required | Actual |
|---|---|---|
| `grep -c '/person' src/lib/booking/all-in-rate.ts` | ≥ 1 | 3 |
| `grep -c "occupancyMode" src/lib/booking/all-in-rate.ts` | ≥ 2 | 3 |
| `grep -c "effectivePriceSql" src/lib/search/query.ts` | 3 | **3** |
| `grep -c "AND l.hourly_rate_cents <= " src/lib/search/query.ts` | 0 | **0** |
| `grep -c 'occupancyMode === "open_capacity"' src/lib/search/query.ts` | 1 | **1** |
| `grep -c "spots" src/lib/search/query.ts` | ≥ 3 | 3 |
| `grep -c "FROM booking" src/lib/search/query.ts` | 0 | **0** |
| `sed -n '/occupancyMode === "open_capacity"/,/continue;/p' … \| grep -c "hasWindow"` | 0 | **0** |
| `grep -c "priceMax" tests/search/open-capacity-search.test.ts` | ≥ 1 | 6 |
| `grep -c 'start' tests/search/open-capacity-search.test.ts` | ≥ 1 | 5 |

## Deviations from Plan

### 1. [Documentation] One acceptance grep is unsatisfiable against SHIPPED text — not reshaped

`grep -c "estimated total\|× hours\|totalCents" src/lib/booking/all-in-rate.ts` was specified to print `0`. It prints **1**, and the single match is line 10 of the module's **pre-existing** header, which has said since Phase 4:

> `Do NOT add a computed "estimated total" to a search card`

That is the rule the grep exists to enforce, stated in prose. Rewording shipped copy to satisfy a tripwire would remove the rule to keep the check for the rule. **The load-bearing form was verified instead:** the same pattern over non-comment lines only prints **0** — no total is computed anywhere in the file, and the open branch returns a rate (`₱X/person`) exactly as the hourly/day branches do.

This is the **9th** occurrence of this class in Phase 9 (an acceptance grep defeated by prescribed or shipped comment text). Later plans should prefer greps over code-only lines.

### 2. [Test structure] Case 2 of Task 3 was split into two `it` blocks

The plan's case 2 asked for one case asserting `state === "low"` and then *self-corrected mid-sentence* to `"open"` at 4-of-4 before adding a second occupancy step. The two states are two different facts (threshold not crossed / crossed), so they are two cases: `open` at 4/4 and `low` at 2/4 (cap 4 ⇒ `clamp(floor(4/2),1,5) = 2`). Case count is therefore 8 integration + 4 unit = **12**, above the plan's ≥ 11.

### 3. [Test hygiene] The window case frees the date in a `beforeAll`

Case 3 (fully booked) leaves the date at 0 remaining, which would silently make case 4 (ignored time window) pass for the wrong reason — the listing dropped by capacity rather than kept despite the window. The window `describe` clears `booking` in its own `beforeAll`, so the window is the only variable.

---

**Total deviations:** 3 (1 documentation/grep, 2 test-structure). **No production code was reshaped to satisfy a check.**
**Impact on plan:** None on behaviour. All plan `must_haves` truths hold and all acceptance criteria except the one unsatisfiable grep pass literally.

## Issues Encountered

None. Both `tsc` and the four pre-existing `tests/search` files were green on the first run after each task — the optional-props widening did exactly what the D-108 precedent promised (zero call-site churn).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **09-14 (mount the primitives on the search card) is unblocked.** The row now carries everything the card needs: `occupancyMode` for the `Drop-in` badge fork, `allInRateParts` already reading `₱…/person`, and `spots.state` for `SpotsLeftChip` (09-11) — which must be passed **straight through**, since it is server-derived from a non-public threshold.
- **A card-side contract 09-14 must honour:** for an open listing the card link should carry `?date=` **only** — dropping `start`/`end` (09-UI-SPEC § 4), since the listing page has no hour window to resume. `search-result-card.tsx` currently forwards all three unconditionally; this plan changed no component.
- **Known non-goal, flagged not fixed:** `src/app/listings/[id]/page.tsx:164` calls `allInRateParts(pub, …)` and `pub` (`listing-public.ts`) carries no `occupancyMode`, so the listing page still shows an hourly rate for a drop-in listing. That is 09-12/09-13's fork — the helper branch it needs already exists here.
- **The `spots` field is currently only populated on a date-filtered search.** If a later surface wants ambient scarcity in the browse view, it would need Stage-2 to run without a date — deliberately not done (OC-12 says no number without a date, and it would cost one `getAvailability` per candidate on every browse).

## Self-Check: PASSED

All three code artifacts exist on disk (`src/lib/booking/all-in-rate.ts`, `src/lib/search/query.ts`, `tests/search/open-capacity-search.test.ts`) and all three task commits resolve (`bc44d54`, `0b8fd33`, `5a13289`).

---
*Phase: 09-open-capacity-bookings*
*Completed: 2026-07-30*
