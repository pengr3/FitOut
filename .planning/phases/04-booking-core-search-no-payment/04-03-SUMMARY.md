---
phase: 04-booking-core-search-no-payment
plan: 03
subsystem: search
tags: [search, postgis, geography, drizzle-sql, availability, two-stage, tdd]

# Dependency graph
requires:
  - phase: 04-01
    provides: listing_location_geog_gist geography index (serves the ::geography radius cast) + read-model lazy-expiry occupancy
  - phase: 04-02
    provides: searchParamsSchema (validated params) + seedSearchListings/SEARCH_ORIGIN/DISTANCES_KM (D-38 geo-seed)
  - phase: 03-availability-double-booking
    provides: getAvailability read model + slots.ts (venue-tz TZDate slot math) — reused verbatim as the Stage-2 predicate
  - phase: 02-listings-host-onboarding
    provides: deriveBookable gate, listing-vocab (space types / activity tags), listing/host_payout/operating_hours schema
provides:
  - "searchListings(db, params, now?) — two-stage search: Stage-1 SQL candidate query + Stage-2 getAvailability free-window filter"
  - "SearchResultRow type (id/title/type/rates/tz/city/coverPhotoUrl/distanceM) + SEARCH_PAGE_SIZE"
  - "parsePickedDate / parseWindowHour — strict search date/time param parsers (canonical, never bound raw into SQL)"
affects: [04-05 search UI (consumes searchListings + SearchResultRow), 04-08 search-and-book E2E]

# Tech tracking
tech-stack:
  added: []   # no new runtime deps (RESEARCH Package Legitimacy Audit — T-04-SC)
  patterns:
    - "Two-stage candidate-then-filter search: Stage-1 SQL (cheap/indexable) → Stage-2 getAvailability reuse — search & listing calendar share ONE availability source (D-34, cannot diverge)"
    - "PostGIS metric radius: ST_DWithin/ST_Distance with ::geography on BOTH operands (meters, not degrees); ST_MakePoint(lng, lat) axis order"
    - "Single combined `category` checked against primary_space_type::text OR the activity tag EXISTS (D-35); the ::text cast avoids a 22P02 enum-cast error on an activity-tag-only value"

key-files:
  created:
    - src/lib/search/query.ts
    - tests/search/radius.test.ts
    - tests/search/filters.test.ts
    - tests/search/bookable-gate.test.ts
    - tests/search/availability-filter.test.ts
  modified: []

key-decisions:
  - "Stage-1 SELECT inlines deriveBookable (published ∧ non-deleted ∧ email_verified ∧ COALESCE(payouts_enabled,false)) with a Pitfall-5 sync comment; the bookable-gate test seeds all non-bookable reasons + soft-delete"
  - "::geography cast on BOTH ST_DWithin and ST_Distance operands (Pitfall 1, the phase's highest-risk trap) — proven by the outlier-exclusion assertion (a ~15.3 km listing excluded at 10 km) not just a distance check"
  - "D-35 category gated on `category` PRESENCE (not a space-type value) and checked against BOTH columns; primary_space_type::text so an activity-tag-only value (basketball) compares as no-match instead of raising, and never no-ops"
  - "start/end = venue-local wall-clock HH:mm resolved PER-CANDIDATE via TZDate (same convention as slots.ts) so the same picked local window lands per-venue (venue-tz honored, D-34), NOT an absolute UTC instant"
  - "date+time keep-rule: every on-the-hour slot in [start,end) is state==='available' (⟹ freeUnits≥1 ∧ future ∧ within-horizon) — the genuine-offer rule, consistent with the date-only any-available rule"
  - "Injectable now?: Date 3rd param (mirrors getAvailability) for deterministic Stage-2 slot state; signature extended backward-compatibly beyond the plan's (db, params)"
  - "Strict parsePickedDate (canonical YYYY-MM-DD + round-trip guard) binds the CANONICAL iso into ::date (never the raw user string); parseWindowHour never reaches SQL — a malformed value degrades to date-only, never a mid-query 22007"
  - "Over-fetch Stage-1 (pageSize*2+1) when a date is picked since Stage-2 can drop candidates; hasMore computed after filtering (Pitfall 8/A5). Cover photo via a correlated scalar subquery (position ASC LIMIT 1) — no row multiplication"

patterns-established:
  - "Search availability = the listing-page read model (getAvailability), never a second SQL occupancy predicate (RESEARCH Anti-Pattern) — the only availability-ish SQL is the cheap Stage-1 weekday EXISTS"
  - "Geo integration test asserts the beyond-radius OUTLIER is excluded (the degrees-vs-meters regression guard), not merely that near listings return"

requirements-completed: []   # SEARCH-01..05 are cross-cutting — see Deviation 3 (query spine here; user-facing completion at 04-05)

# Metrics
duration: 14min
completed: 2026-07-15
---

# Phase 4 Plan 03: Two-Stage True-Availability Search Query Summary

**The correctness spine of search: `searchListings` — a two-stage candidate-then-filter query. Stage-1 SQL narrows to a bounded, bookable-only candidate set (inlined bookable gate + `::geography` metric radius + single-combined category type/tag + price + tz-independent weekday), and Stage-2 reuses the SAME `getAvailability` read model the listing calendar uses to enforce the true free-window filter (D-34) — so a search result is a genuine offer and search can never diverge from the listing page.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-07-15T04:05Z
- **Completed:** 2026-07-15T04:19Z
- **Tasks:** 2 (both TDD — RED→GREEN verified)
- **Files created:** 5 (1 service + 4 integration tests)

## Accomplishments
- `src/lib/search/query.ts` exporting `searchListings(db, params, now?)` → `{ results: SearchResultRow[]; hasMore: boolean }`.
- **Stage-1** — a single Drizzle `sql` candidate query, all user input parameter-bound (Security V5):
  - inlined `deriveBookable` predicate with a Pitfall-5 sync comment (published ∧ non-deleted ∧ `email_verified` ∧ `COALESCE(payouts_enabled,false)`);
  - `ST_DWithin` / `ST_Distance` with `::geography` on **both** operands (meters, Pitfall 1) and `ST_MakePoint(lng, lat)` (Pitfall 4), applied only when an origin is present;
  - D-35 single combined `category` against `primary_space_type::text` **OR** the `listing_activity_tag` EXISTS;
  - `hourly_rate_cents <= priceMax`; tz-independent weekday `EXISTS(operating_hours … EXTRACT(DOW FROM iso::date))`;
  - `ORDER BY distance_m ASC NULLS LAST, created_at DESC` (or `hourly_rate_cents ASC, created_at DESC` for `sort=price`) — a stable tiebreaker for the no-origin city view (D-30); Load-more `LIMIT+1` probe (D-32).
- **Stage-2** — per-candidate `getAvailability` reuse (the SAME read model as the listing calendar, D-34): date-only keeps any-available; date+time keeps only when every on-the-hour slot in `[start,end)` is available; the picked local window is resolved in **each candidate's own venue tz** (TZDate). Skipped entirely with no date (default browse, D-30). Over-fetch + post-filter `hasMore` (Pitfall 8/A5).
- **16 integration tests green** across 4 files, incl. the `::geography` outlier-exclusion proof and the activity-tag-only category (no no-op, no enum-cast error).

## Task Commits

1. **Task 1 (TDD): Stage-1 candidate SQL + radius/filters/bookable-gate tests** — RED (stub → 9 failing) → GREEN `8ca1fc2` (feat).
2. **Task 2 (TDD): Stage-2 free-window filter + availability-filter test** — RED (4 failing drop-assertions) → GREEN `16f19a4` (feat).

_Both are TDD tasks; each verified RED then GREEN in the working tree and landed as one atomic per-task `feat` commit (no refactor needed). This plan is `type: execute`, so the plan-level TDD gate does not apply._

## Files Created
- `src/lib/search/query.ts` — `searchListings` (Stage-1 SQL + Stage-2 getAvailability filter), `SearchResultRow`/`SearchResult`/`SEARCH_PAGE_SIZE`, and the strict `parsePickedDate`/`parseWindowHour` param parsers.
- `tests/search/radius.test.ts` — SEARCH-01: within-radius return + **beyond-10 km outlier exclusion** (degrees-vs-meters guard) + distance-tolerance + nearest-first order.
- `tests/search/filters.test.ts` — SEARCH-02/04: space-type category, **activity-tag-only category** (disjoint-type gym, no no-op, no enum error), type-column-only match, price ceiling, deterministic default order.
- `tests/search/bookable-gate.test.ts` — D-16/Pitfall-5: draft, unverified-email host, payouts-off host, and soft-deleted all excluded; the fully-bookable control returned.
- `tests/search/availability-filter.test.ts` — SEARCH-03/D-34: date-only keep/drop, date+time keep/drop, whole-listing block honored, venue-tz per-candidate (Asia/Manila + America/New_York).

## Decisions Made
See `key-decisions` frontmatter. Most consequential: (1) the two-stage split so search availability IS the listing-page read model (D-34, cannot diverge); (2) `::geography` on both operands proven by the outlier-exclusion assertion; (3) the D-35 `primary_space_type::text` cast that makes an activity-tag-only category filter instead of erroring.

## Deviations from Plan

### 1. [Rule 2 - defensive hardening] Strict, canonical date/time param parsing
- **Found during:** Task 1 (date), extended in Task 2 (time).
- **Issue:** `date`/`start`/`end` are shape-only (attacker-controllable); the plan says "bind ISO strings, not Date." Binding a raw user `date` string straight into `::date` could raise `22007` mid-query on a crafted value.
- **Fix:** `parsePickedDate` validates `YYYY-MM-DD` with a round-trip validity guard and binds the **canonical** iso (never the raw string); `parseWindowHour` strictly parses on-the-hour venue-local times and is **never** bound into SQL. A non-conforming value degrades to the date-only filter (or skips Stage-2), never a crash. Strengthens T-04-SQLI.
- **Files:** src/lib/search/query.ts · **Commits:** 8ca1fc2, 16f19a4

### 2. [Design — Claude's discretion] Window interpretation, availability rule, and a testability seam
- **Found during:** Task 2.
- **Detail:** The plan left the window format "re-derived server-side." Choices made: (a) `start`/`end` are venue-local wall-clock `HH:mm` resolved **per-candidate** via TZDate — the only interpretation that makes "venue-tz honored" meaningful; (b) the date+time keep-rule uses `state==='available'` (subsumes the plan's `freeUnits≥1`, adding future+in-horizon), consistent with the date-only rule; (c) an optional `now?: Date` 3rd param (mirrors `getAvailability`) makes Stage-2 slot state deterministic in tests. All backward-compatible with the plan's `(db, params)` signature.
- **Files:** src/lib/search/query.ts · **Commit:** 16f19a4

### 3. [Correctness — precedent from 04-02] Did NOT mark SEARCH-01..05 requirements complete
- **Found during:** state-update step.
- **Issue:** The plan frontmatter lists `requirements: [SEARCH-01..05]`, but these are cross-cutting (04-03 ships the query spine; **SEARCH-05** = the results-cards UI and the user-facing search wiring land in **04-05**). Marking them now — SEARCH-05 especially — would falsely flip REQUIREMENTS.md before the user can search.
- **Fix:** Skipped `requirements mark-complete` (intentional no-op), mirroring 04-02's decision. SEARCH-01..05 flip when 04-05 ships the UI (validated at phase transition).
- **Files:** none (intentional no-op on REQUIREMENTS.md)

---
**Total deviations:** 3 (1 defensive hardening, 1 discretionary design, 1 correctness no-op). No scope creep — all keep project state honest.

## Threat Flags
None. All user input is parameter-bound via Drizzle `sql` (T-04-SQLI); `::geography` on both radius operands (T-04-RADIUS); the inlined `deriveBookable` predicate carries a drift comment and is proven by the bookable-gate test (T-04-BOOKDRIFT); availability comes only from `getAvailability` (T-04-AVAILTRUTH); no new packages (T-04-SC). The date-canonicalization hardening (Deviation 1) strengthens — never weakens — the T-04-SQLI surface.

## Known Stubs
None. `query.ts` is fully implemented and returns real DB results; there are no placeholder/empty-value returns feeding the (later) UI.

## Verification
- `npx vitest run tests/search` → **16/16 green** (radius, filters, bookable-gate, availability-filter).
- `npx tsc --noEmit` → exit 0 (whole project).
- `npx eslint src/lib/search/query.ts tests/search/` → clean.
- Grep confirms on `query.ts`: `::geography` on BOTH `ST_DWithin` and `ST_Distance`; `ST_MakePoint(lng` (lng-first); `primary_space_type::text` + the `listing_activity_tag` EXISTS; `getAvailability(db, …)` for Stage-2; the only availability SQL is the Stage-1 weekday `EXTRACT(DOW …)` EXISTS (no second occupancy predicate).

## Next Phase Readiness
- **04-05 (search UI):** import `searchListings` + `SearchResultRow` (photo/title/rates/`distanceM`/city) directly; the RSC home reads `searchParams` → `searchParamsSchema.safeParse` → `searchListings`. `distanceM` is meters (÷1000 for "X.X km"). Completes SEARCH-01..05 at the UI layer.
- **04-08 (E2E):** `searchListings` + `scripts/seed.ts` supply a real bookable set with known distances for the search→book flow.
- **Perf seam:** the `listing_location_geog_gist` index (04-01) already serves the `::geography` radius; the batched `getAvailabilityForListings` variant remains an optional future optimization (not needed at single-city scale).

## Self-Check: PASSED
- Files verified present: `src/lib/search/query.ts`, `tests/search/{radius,filters,bookable-gate,availability-filter}.test.ts`.
- Commits verified present: `8ca1fc2`, `16f19a4`.

---
*Phase: 04-booking-core-search-no-payment*
*Completed: 2026-07-15*
