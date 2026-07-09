---
phase: 02-listings-host-onboarding
plan: 01
subsystem: database
tags: [drizzle, postgres, postgis, zod, geometry, paymongo, vitest, pgenum, testing]

# Dependency graph
requires:
  - phase: 01-auth-accounts
    provides: "user table (text PK, emailVerified) as the FK ownership root; timestamptz + input:false conventions; tests/helpers db+auth+mocks harness; drizzle-kit migrate workflow"
provides:
  - "listing / listing_photo / listing_amenity / listing_activity_tag / host_payout tables (schema.ts + live DB + migrations)"
  - "listing_status / booking_mode / space_type pgEnums"
  - "PostGIS geometry(point,4326) location column (x=lng,y=lat) + GiST index, extension enabled idempotently"
  - "D-08 locked vocabulary module (SPACE_TYPES/ACTIVITY_TAGS/AMENITIES + value tuples + label maps)"
  - "shared draftSchema + publishSchema (Zod 4) with integer-cents + both-rates + coordinate rules"
  - "deriveBookable pure sell-gate (published && emailVerified && payoutsEnabled)"
  - "mockPayMongo test helper (createLinkedAccount/createOnboardingLink + Paymongo-Signature signWebhook/badSignature)"
  - "10 Wave-0 test anchors (3 green foundation + 7 Nyquist anchors for Plans 03-06)"
affects: [03-listing-wizard, 04-photos-cloudinary, 05-public-listing-page, 06-paymongo-gate, phase-04-search]

# Tech tracking
tech-stack:
  added: [PostGIS (extension enabled), drizzle geometry(point,4326) column, pgEnum]
  patterns:
    - "Hand-authored marketplace tables alongside Better-Auth-owned tables (FK-rooted at user.id)"
    - "PostGIS-first custom migration (CREATE EXTENSION IF NOT EXISTS, ordered before geometry DDL) for idempotent test-harness replay"
    - "Single vocabulary module (as const {value,label}) feeding both Zod z.enum and UI selects"
    - "Pure derived sell-gate (deriveBookable) — bookability never independently settable"
    - "Wave-0 Nyquist anchors: green foundation tests + it.todo/test.fixme downstream anchors"

key-files:
  created:
    - src/lib/listing-vocab.ts
    - src/lib/validation/listing.ts
    - src/lib/bookability.ts
    - drizzle/0001_enable_postgis.sql
    - drizzle/0002_listing_tables.sql
    - tests/listing/bookability.test.ts
    - tests/validation/listing-schema.test.ts
    - tests/listing/geo-roundtrip.test.ts
    - tests/listing/crud.test.ts
    - tests/listing/status-gate.test.ts
    - tests/listing/photos.test.ts
    - tests/listing/cloudinary-sign.test.ts
    - tests/paymongo/webhook-signature.test.ts
    - tests/paymongo/webhook-merchant-activated.test.ts
    - e2e/public-listing.spec.ts
  modified:
    - src/lib/db/schema.ts
    - tests/helpers/mocks.ts

key-decisions:
  - "location DDL hand-corrected to geometry(point,4326) — drizzle-kit 0.31.10 omits srid; 4326 is required for Phase-4 geography radius search (verified srid-0 WKT insert stores 4326)"
  - "Applied via drizzle-kit migrate (not push) — live DB is migrate-tracked from Phase 1; push would re-emit the srid-0 gap and drift from the migration/test harness"
  - "host_payout is a separate 1:1 table (PayMongo-shaped: paymongoAccountId unique, activationStatus, payoutsEnabled, onboardingComplete), keeping the Better-Auth schema CLI-clean"
  - "Downstream Wave-0 tests are it.todo/test.fixme anchors (kept suite green) rather than hard-red, per the plan's todo-or-red option"

patterns-established:
  - "PostGIS-first migration + idempotent CREATE EXTENSION for parallel isolated-schema test replay"
  - "Vocabulary-as-single-source-of-truth (listing-vocab.ts) shared by Zod + UI + DB enum"
  - "deriveBookable pure gate as the un-bypassable read for Plans 03/04/06"

requirements-completed: [LIST-01, LIST-03, LIST-04, LIST-05]

# Metrics
duration: ~30min
completed: 2026-07-09
---

# Phase 2 Plan 01: Data-Model Foundation & Wave-0 Scaffold Summary

**Hand-authored Drizzle listing model (pgEnums, PostGIS geometry(point,4326) + GiST, integer-cents money, PayMongo host_payout), the D-08 vocabulary + shared draft/publish Zod, the pure deriveBookable sell-gate, and all 10 Wave-0 tests — migrations applied to the live DB and the geo round-trip proven.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-07-09T14:31:00Z (approx)
- **Completed:** 2026-07-09T15:00:00Z (approx)
- **Tasks:** 4
- **Files modified:** 20 (2 modified, 18 created)

## Accomplishments
- Extended `schema.ts` with 5 hand-authored tables + 3 pgEnums, FK-rooted at `user.id`, with a PostGIS `geometry(point,4326)` location column (x=lng, y=lat), GiST index, integer-cents money, soft-delete, and a PayMongo-shaped `host_payout` (1:1 to user).
- Created the single-source-of-truth D-08 vocabulary, the shared `draftSchema`/`publishSchema` (integer-cents, both-rates, coordinates), and the pure `deriveBookable` gate.
- Extended `mockPayMongo` with a real `Paymongo-Signature` HMAC-SHA256 `signWebhook` + `badSignature`, plus onboarding stubs — the signing contract Plan 06 verifies against.
- Generated the PostGIS-first migration + listing-tables migration, hand-corrected the geometry SRID, and applied both to the live DB via `drizzle-kit migrate`.
- Wrote all 10 Wave-0 tests: 3 green foundation tests + 7 Nyquist anchors keyed to Plans 03-06.

## Task Commits

Each task was committed atomically:

1. **Task 1: Data model (tables, pgEnums, PostGIS, host_payout)** — `6f9e5af` (feat)
2. **Task 2: Vocabulary, validation, bookability, PayMongo mock** — `5775178` (feat)
3. **Task 3: Wave-0 test scaffold (10 files)** — `dd16954` (test)
4. **Task 4: PostGIS-first + listing-tables migrations, applied to live DB** — `7c47bcb` (feat)

_Task 1 was tdd; its behavioral anchor is the geo-roundtrip test (Task 3), which goes green after the Task 4 migration — so the RED→GREEN spans Tasks 3→4 by design._

## Files Created/Modified
- `src/lib/db/schema.ts` (modified) — 5 new tables (listing, listing_photo, listing_amenity, listing_activity_tag, host_payout) + listing_status/booking_mode/space_type pgEnums + listingRelations; header updated to mark hand-authored tables.
- `src/lib/listing-vocab.ts` — D-08 vocabulary: SPACE_TYPES/ACTIVITY_TAGS/AMENITIES `as const` + value tuples (for z.enum) + label maps.
- `src/lib/validation/listing.ts` — shared draftSchema (all optional) + publishSchema (strict: integer-cents, both rates, lat/lng) + inferred types.
- `src/lib/bookability.ts` — pure `deriveBookable(listing, host)` sell-gate.
- `tests/helpers/mocks.ts` (modified) — `mockPayMongo` (createLinkedAccount, createOnboardingLink, signWebhook → valid Paymongo-Signature, badSignature); registered in resetMocks.
- `drizzle/0001_enable_postgis.sql` — custom migration: `CREATE EXTENSION IF NOT EXISTS postgis` (idempotent, ordered first).
- `drizzle/0002_listing_tables.sql` — listing tables + enums + FKs + GiST index; location hand-corrected to `geometry(point, 4326)`.
- `tests/listing/bookability.test.ts` — 8-row truth table + D-14 auto-revert (GREEN).
- `tests/validation/listing-schema.test.ts` — draft vs publish, integer-cents, both-rates (GREEN).
- `tests/listing/geo-roundtrip.test.ts` — PostGIS x=lng/y=lat round-trip (GREEN after Task 4).
- `tests/paymongo/webhook-signature.test.ts` — signing-contract (GREEN) + route signature/idempotency anchors (todo, Plan 06).
- `tests/listing/{crud,status-gate,photos,cloudinary-sign}.test.ts`, `tests/paymongo/webhook-merchant-activated.test.ts` — it.todo Nyquist anchors (Plans 03/04/06).
- `e2e/public-listing.spec.ts` — test.fixme anchors for the public route (Plan 05).

## Decisions Made
- **geometry(point,4326), not (point):** drizzle-kit 0.31.10 drops the srid from generated DDL and the snapshot. SRID 4326 is required for D-10's Phase-4 geography radius search (`location::geography`). Probed PostGIS 3.6: inserting drizzle's srid-0 WKT `point(x y)` into a `geometry(point,4326)` column stores SRID 4326 and the geography cast works — so the column is correct and drizzle's insert path is compatible.
- **migrate, not push:** The live DB is `drizzle-kit migrate`-tracked from Phase 1 (journal held only 0000). `migrate` applies the hand-corrected migration verbatim (srid 4326) and stays consistent with the test harness; `push` (per the plan's literal wording) would re-emit the srid-0 codegen gap and drift.
- **host_payout separate table:** PayMongo-shaped, 1:1 to user, keeping the Better-Auth-owned schema CLI-clean; flags are webhook/server-set only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1/2 - Bug / Missing Critical] Hand-corrected the geometry SRID drizzle-kit dropped**
- **Found during:** Task 4 (migration generation)
- **Issue:** `drizzle-kit generate` emitted `"location" geometry(point)` (SRID 0), silently discarding the `srid: 4326` declared in schema.ts. An SRID-0 column breaks D-10's Phase-4 geography radius search (`geometry(srid 0)::geography` is invalid) — a correctness requirement, not cosmetic.
- **Fix:** Edited `drizzle/0002_listing_tables.sql` to `"location" geometry(point, 4326)`. Verified via PostGIS probe that drizzle's srid-0 WKT insert stores SRID 4326 in a 4326 column and the geography cast succeeds; the live column reports `POINT|4326|2`.
- **Files modified:** drizzle/0002_listing_tables.sql
- **Verification:** `geometry_columns` shows `POINT|4326|2`; geo-roundtrip test passes.
- **Committed in:** `7c47bcb` (Task 4 commit)

**2. [Rule 3 - Blocking] Applied migrations via `drizzle-kit migrate` instead of `push`**
- **Found during:** Task 4 (BLOCKING apply step)
- **Issue:** The plan's step 4 says `drizzle-kit push`. But (a) the live DB is migrate-tracked (journal had only 0000, applied by Phase 1), and (b) `push` shares the same codegen that dropped the SRID, so it would create an SRID-0 live column that drifts from the hand-corrected migration and the test harness.
- **Fix:** Ran `drizzle-kit migrate`, applying 0001 (postgis) + 0002 (listing tables, srid 4326) to the live DB. The `extension "postgis" already exists, skipping` NOTICE confirmed the `IF NOT EXISTS` idempotency.
- **Files modified:** (live DB only — no extra file changes)
- **Verification:** Live DB has all 5 tables, `location = POINT|4326|2`, GiST index, 3 enums, journal at 3 entries.
- **Committed in:** `7c47bcb` (Task 4 commit)

---

**Total deviations:** 2 auto-fixed (1 bug/missing-critical, 1 blocking).
**Impact on plan:** Both preserve correctness (SRID for Phase-4 geo; live/test consistency). Same outcome the plan intended — "live DB has the listing tables" — achieved without drift. No scope creep.

## Known Stubs

The 7 downstream Wave-0 test files are **intentional Nyquist anchors** (the plan's deliverable), not accidental stubs:
- `tests/listing/{crud,status-gate}.test.ts` → resolved by **Plan 03** (wizard + listing/publish actions).
- `tests/listing/{photos,cloudinary-sign}.test.ts` → resolved by **Plan 04** (photo gallery + sign endpoint).
- `tests/paymongo/{webhook-signature (route part),webhook-merchant-activated}.test.ts` → resolved by **Plan 06** (PayMongo webhook + gate).
- `e2e/public-listing.spec.ts` (`SEEDED_*_LISTING_ID` placeholders, `test.fixme`) → resolved by **Plan 05** (public detail page + seed).

They use `it.todo` / `test.fixme` so the suite stays green (0 failures) while documenting the exact contract each downstream plan implements. No stub blocks this plan's goal (the data foundation + scaffold are complete and green).

## Test Results

- `npx tsc --noEmit` → exit 0 (after every task; test + e2e files are type-checked and clean).
- `npx vitest run tests/listing/bookability.test.ts tests/validation/listing-schema.test.ts tests/listing/geo-roundtrip.test.ts` → **3 files, 24 tests, all pass**.
- **Full suite** `npx vitest run` → **20 passed | 5 skipped (25 files); 82 passed | 31 todo (113 tests); 0 failures** — no Phase-1 regressions.
- **Schema push (Task 4):** `drizzle-kit migrate` applied 0001 + 0002 to the live DB (`postgis already exists, skipping` = idempotency confirmed). Verified: 5 tables, `location=POINT|4326|2`, GiST `listing_location_gist`, enums booking_mode/listing_status/space_type, journal at 3.
- **Wave-0 status:** GREEN — bookability, listing-schema, geo-roundtrip, webhook-signature (signing contract). RED/pending anchors (intentional): crud, status-gate (Plan 03); photos, cloudinary-sign (Plan 04); webhook-signature (route), webhook-merchant-activated (Plan 06); public-listing e2e (Plan 05).

## Issues Encountered
- **Doc mismatch (non-blocking):** `02-VALIDATION.md` § Wave 0 lists 11 files (including `tests/paymongo/onboarding.test.ts`) and still references `tests/stripe/*` — a stale artifact flagged in STATE.md. The authoritative PLAN.md (`files_modified` + Task 3 `<files>`) and the PayMongo re-plan enumerate exactly 10 Wave-0 files with two paymongo anchors (`webhook-signature`, `webhook-merchant-activated`) and no `onboarding.test.ts`. Followed the plan (10 files); did not create `onboarding.test.ts`. If Plan 06 needs an onboarding anchor, it can add it then.

## User Setup Required
None — no external service configuration required for this plan. (PayMongo Platforms/Linked-Accounts beta enablement remains a real-world lead-time action tracked in STATE.md for Plan 06; not needed for 02-01.)

## Next Phase Readiness
- **Ready for Wave 2/3:** the listing tables, D-08 vocabulary, draft/publish validation contract, and the `deriveBookable` gate all exist on disk and in the live DB. PostGIS is live in both dev and the test harness with a proven no-swap round-trip.
- **Plans 03-06 have automated verify targets** (the Wave-0 anchors) and a stable `host_payout.payoutsEnabled` gate flag to wire against.
- **Forward caveat (documented for downstream):** drizzle-kit 0.31.10 does not model geometry SRID — the migration SQL is the source of truth for `geometry(point,4326)`. Prefer `drizzle-kit migrate` over `drizzle-kit push` for the live DB, or a future `push` may try to strip the SRID from the location column.

---
*Phase: 02-listings-host-onboarding*
*Completed: 2026-07-09*

## Self-Check: PASSED
- All 15 key created files verified present on disk.
- All 4 task commits verified in git history (6f9e5af, 5775178, dd16954, 7c47bcb).
- tsc exit 0; targeted foundation tests 24/24 pass; full suite 82 pass / 31 todo / 0 fail; live DB schema verified.
