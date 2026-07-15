---
phase: 04-booking-core-search-no-payment
plan: 02
subsystem: validation
tags: [zod, search, booking, postgis, seed, currency, tsx, drizzle]

# Dependency graph
requires:
  - phase: 04-01
    provides: booking-hold columns (expires_at/quoted_total_cents/currency/idempotency_key) + listing_location_geog geography index on the live DB
  - phase: 02-listings-host-onboarding
    provides: listing-vocab (spaceTypeValues/activityTagValues), deriveBookable gate, host_payout table, listing/operating_hours schema
provides:
  - "searchParamsSchema — bounds every untrusted search URL param before any SQL (V5 control)"
  - "bookingCreateSchema — shape-validates the client booking selection (listingId + window + optional idempotencyKey)"
  - "DISPLAY_CURRENCY = 'php' — the single shared price-currency source (D-46)"
  - "scripts/seed.ts — idempotent D-38 dev seed of 5 bookable Metro Manila listings at known coords"
  - "tests/helpers/seed.ts — SEARCH_ORIGIN + DISTANCES_KM (haversine) + seedSearchListings(db) for isolated-schema radius/filter tests"
affects: [04-03 search query, 04-04 pending-hold + pricing, 04-05 search UI, 04-06/07 reserve + book CTA, 04-08 search-and-book E2E]

# Tech tracking
tech-stack:
  added: []   # no new runtime deps — tsx was already present in node_modules (T-04-SC)
  patterns:
    - "Untrusted URL params validated by a shared Zod schema (z.coerce.number min/max reject NaN) before any query — mirrors actions/availability.ts dayLocalSchema"
    - "Single combined `category` = z.union of the two DISJOINT vocab enums (D-35), not split type/activity"
    - "Geo-seed helper derives expected great-circle distances (haversine) from the same coords it seeds — constants can never drift"

key-files:
  created:
    - tests/validation/booking-schemas.test.ts
    - scripts/seed.ts
    - tests/helpers/seed.ts
  modified:
    - src/lib/validation/booking.ts
    - src/lib/money.ts
    - package.json

key-decisions:
  - "searchParamsSchema collapses type/activity into ONE `category` = z.union([z.enum(spaceTypeValues), z.enum(activityTagValues)]) — an activity-tag-only value (e.g. basketball) validates like a space-type (D-35)"
  - "z.coerce.number().min().max()/.int() rejects NaN naturally (every NaN comparison is false) so tampered params fail safeParse without throwing (T-04-ORIGIN/PRICEIN); lat/lng must be present together"
  - "DISPLAY_CURRENCY = 'php' promoted to src/lib/money.ts; the listing page keeps its local copy until Plan 07 swaps the import (D-46)"
  - "D-38 seed uses namespaced seed_* ids + idempotent delete-first (FK-safe order); tsx already in node_modules so no package install (T-04-SC accept)"
  - "Did NOT mark SEARCH-01..04/BOOK-01 requirements complete — they are cross-cutting across 6+ Phase-4 plans; 04-02 ships only the validation/currency/seed substrate"

patterns-established:
  - "V5 input-validation control: one shared Zod schema, client + server re-validate, shape-only (invariants re-derived server-side)"
  - "Two-parallel-source seed: scripts/seed.ts (raw postgres.js, live DB) mirrors tests/helpers/seed.ts (Drizzle, isolated schema) — same origin, ids, coords"

requirements-completed: []   # substrate only — see 'Requirements' note below (SEARCH-01..04/BOOK-01 stay Pending)

# Metrics
duration: 23min
completed: 2026-07-15
---

# Phase 4 Plan 02: Search + Booking Validation Substrate Summary

**Shared, non-schema substrate for search + booking: Zod `searchParamsSchema` (bounds every untrusted URL param, V5) + `bookingCreateSchema`, the promoted `DISPLAY_CURRENCY = "php"` source (D-46), and the D-38 geo-seed (5 bookable Manila listings at known haversine distances) that the phase's radius/filter tests and E2E depend on.**

## Performance

- **Duration:** 23 min
- **Started:** 2026-07-15T03:20:05Z
- **Completed:** 2026-07-15T03:43Z
- **Tasks:** 2 (Task 1 TDD)
- **Files modified:** 6 (+ deferred-items.md)

## Accomplishments
- `searchParamsSchema` + `bookingCreateSchema` + inferred types in `src/lib/validation/booking.ts` — every attacker-controllable search param is bounds-validated (lat∈[-90,90], lng∈[-180,180], radius∈{2,5,10,25}, priceMax int≥0, category ∈ vocab∪, sort∈{nearest,price}, page int≥0) and a crafted `NaN`/`"abc"` fails safeParse without throwing.
- The D-35 single combined `category` param: an activity-tag-only value (`basketball`) validates exactly like a space-type (`basketball_court`), sourced from the one vocab authority.
- `DISPLAY_CURRENCY = "php"` promoted into `src/lib/money.ts` as the single shared price-currency source (D-46).
- `scripts/seed.ts`: idempotent raw-postgres.js seed of 5 bookable Metro Manila listings (namespaced `seed_*`), one gym tagged `basketball` (disjoint type/tag), one ≈15.3 km beyond the 10 km radius, activated payout → `deriveBookable` true.
- `tests/helpers/seed.ts`: `SEARCH_ORIGIN`, `SEED_LISTINGS`, `haversineKm`, derived `DISTANCES_KM`, and `seedSearchListings(db)` for isolated-schema radius/filter/availability tests.

## Task Commits

1. **Task 1 (TDD): searchParamsSchema + bookingCreateSchema + DISPLAY_CURRENCY**
   - RED  — `dc4ca60` (test: 19 failing cases)
   - GREEN — `74e0161` (feat: schemas + shared currency const)
2. **Task 2: D-38 seed script + geo-seed test helper** - `5b8c67a` (feat)

**Plan metadata:** committed with this SUMMARY (docs).

_Task 1 is a TDD task → RED then GREEN commits (no refactor needed)._

## Files Created/Modified
- `src/lib/validation/booking.ts` - Added `searchParamsSchema`, `bookingCreateSchema` + inferred types, reusing the slot-window shape/refine; kept `slotSelectionSchema` behavior identical.
- `src/lib/money.ts` - Added `export const DISPLAY_CURRENCY = "php"` beside `formatMoney` (D-46).
- `tests/validation/booking-schemas.test.ts` - 19 unit tests (accept/reject/tamper + NaN-no-throw + activity-tag-only category).
- `scripts/seed.ts` - Standalone idempotent D-38 dev seed (raw postgres.js, no `@/` imports so it runs under tsx).
- `tests/helpers/seed.ts` - Canonical geo-seed coords + derived distances + `seedSearchListings(db)`.
- `package.json` - Added `db:seed` npm script (`tsx scripts/seed.ts`).

## Decisions Made
See `key-decisions` frontmatter. Most consequential: the DISJOINT-vocab single `category` union (D-35) and the deliberate choice NOT to mark cross-cutting requirements complete (below).

## Deviations from Plan

### 1. [Rule 3 - Blocking, plan-sanctioned] Added `db:seed` npm script
- **Found during:** Task 2
- **Issue:** The plan invited "a `db:seed` npm script if you add one"; `package.json` was not in `files_modified`.
- **Fix:** Added `"db:seed": "tsx scripts/seed.ts"` (tsx already in node_modules; aids the E2E/UAT re-seed recipe).
- **Files modified:** package.json
- **Committed in:** `5b8c67a`

### 2. [Correctness] Did NOT mark SEARCH-01..04 / BOOK-01 requirements complete
- **Found during:** state-update step
- **Issue:** The plan frontmatter lists `requirements: [SEARCH-01, SEARCH-02, SEARCH-03, SEARCH-04, BOOK-01]`, but those IDs are cross-cutting — they appear in plans 04-02 through 04-08. Plan 04-02 delivers only the validation/currency/seed substrate; the actual search query, radius UI, and price-breakdown ship in later plans.
- **Fix:** Skipped `requirements mark-complete` so REQUIREMENTS.md is not falsely flipped to Complete. These IDs stay Pending until the plans that ship the user-facing search + price breakdown complete them (validated at phase transition).
- **Files modified:** none (intentional no-op on REQUIREMENTS.md)

---

**Total deviations:** 2 (1 plan-sanctioned tooling add, 1 correctness no-op). No scope creep — both keep project state honest.

## Issues Encountered
- **Pre-existing suite failure (out of scope, logged):** `tests/auth/secret-config.test.ts > "throws at boot in production when BETTER_AUTH_SECRET is missing"` fails in the full parallel `vitest run` but passes in isolation (28/28). Proven pre-existing by re-running the full suite with 04-02's new test EXCLUDED — the auth test still fails (222/1, the 223-total baseline). Unrelated to 04-02 (booking validation/seed touch no auth code). Logged to `deferred-items.md`; NOT fixed (SCOPE BOUNDARY).

## Verification
- `npx vitest run tests/validation/booking-schemas.test.ts` → 19/19 green.
- `npx tsc --noEmit` → exit 0 (whole project, incl. both new seed files).
- `npx tsx scripts/seed.ts` run twice → idempotent (exit 0); 5 published `seed_%` listings (≥4); 1 beyond 10 km (PostGIS `ST_Distance(geography)` = 15.29 km); 1 gym with disjoint `basketball` tag.
- Isolated-schema smoke: `seedSearchListings` inserts 5 bookable listings (all pass the email_verified + payouts_enabled + published gate); `DISTANCES_KM.seed_listing_4` = 8.17 km (<10), `seed_listing_5` = 15.29 km (>10). Temp smoke deleted.

## User Setup Required
None - no external service configuration required. (`npm run db:seed` reseeds the local dev DB against the running `fitout-db-1`.)

## Next Phase Readiness
- **04-03 (search query):** `searchParamsSchema` + `DISPLAY_CURRENCY` ready to import; the seed gives Stage-1 radius/filter SQL real supply with known distances (`DISTANCES_KM`), a >10 km listing, and a disjoint type/tag row for the D-35 match.
- **04-04 (pending-hold + pricing):** `bookingCreateSchema` + `DISPLAY_CURRENCY` ready; the frozen-quote/hold work builds on 04-01's columns.
- **04-08 (E2E):** `scripts/seed.ts` / `npm run db:seed` provide the bookable dev-DB set.
- Requirements SEARCH-01..04 / BOOK-01 remain Pending (substrate only — completed by the later plans that ship search + price breakdown).

## Self-Check: PASSED
- Commits verified present: `dc4ca60`, `74e0161`, `5b8c67a`.
- Files verified present: `src/lib/validation/booking.ts`, `src/lib/money.ts`, `scripts/seed.ts`, `tests/helpers/seed.ts`, `tests/validation/booking-schemas.test.ts`.

---
*Phase: 04-booking-core-search-no-payment*
*Completed: 2026-07-15*
