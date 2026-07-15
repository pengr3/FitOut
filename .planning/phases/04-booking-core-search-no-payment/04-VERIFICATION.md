---
phase: 04-booking-core-search-no-payment
verified: 2026-07-15T16:50:00Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
---

# Phase 4: Booking Core (Search, No Payment) Verification Report

**Phase Goal:** A booker can find a space by location, activity, date/time, and price, then claim a slot via a short pending hold protected by the exclusion constraint — proving the two-phase booking mechanism, state machine, and abandoned-hold expiry work correctly before payment is added to the failure modes.

**Verified:** 2026-07-15T16:50:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The DB `booking_no_overlap` GiST EXCLUDE constraint is the SOLE double-booking authority — no app-level query-then-insert | ✓ VERIFIED | Live-DB introspection: `pg_constraint` has `booking_no_overlap`. `src/lib/availability/units.ts` `createPendingHold`'s `pickLowestFreeUnit`/`findOwnActiveHold` are explicitly documented and coded as *advisory* probes; the per-unit insert is wrapped in a nested `tx.transaction` (SAVEPOINT) and only a `23P01`/`40P01` DB rejection decides the loser. `tests/booking/pending-hold.test.ts` proves via independent-connection races (`makeRacingClients`) that exactly one of two concurrent overlapping holds wins. |
| 2 | Two-stage search reuses the SAME `getAvailability` read model as the listing calendar; radius casts BOTH operands `::geography` | ✓ VERIFIED | `src/lib/search/query.ts:192` calls `getAvailability(db, c.id, picked, now)` (the exact function from `read-model.ts`) for Stage-2 — no second SQL availability predicate exists. `ST_DWithin`/`ST_Distance` both cast `l.location::geography` and `${originGeog}::geography` (query.ts:132,160). `tests/search/radius.test.ts` asserts a >10km outlier is excluded (the degrees-vs-meters regression proof). |
| 3 | `createPendingHold` honors WR-03 (outer 40P01 retry, per-unit SAVEPOINT for 23P01, in-tx stale-hold sweep, own-hold/23505 idempotency) | ✓ VERIFIED | `units.ts:200-281`: outer `for` loop retries on `40P01` (bounded `MAX_TX_RETRIES=3`); each unit insert wrapped in `tx.transaction` (nested SAVEPOINT); in-tx sweep `UPDATE booking SET status='cancelled' WHERE ... expires_at <= now() ...` runs before the insert loop; `findOwnActiveHold` pre-check + `23505` backstop + `23P01` own-duplicate re-check all return the SAME booking. `tests/booking/pending-hold.test.ts` (4 cases: concurrent/idempotent-solo/idempotent-concurrent/savepoint) and `tests/booking/hold-expiry.test.ts` (2 cases: lazy-read+sweep, live-hold-blocks) all green. |
| 4 | `placeHold` mints via POST server action (never GET), gated on canBook + server `deriveBookable`; `confirmBooking` re-checks `expires_at > now() AND status='pending'` server-side with an idempotent already-confirmed short-circuit | ✓ VERIFIED | `src/app/actions/booking.ts` is `"use server"`; `placeHold` re-reads `canBook` from the DB and re-derives `deriveBookable` via a join (lines 71-111) before calling `createPendingHold`. `confirmBooking` short-circuits `bk.status === 'confirmed'` straight to redirect BEFORE any expiry check (line 158), and the actual flip is one atomic `UPDATE ... WHERE status='pending' AND expires_at > now() RETURNING id` (lines 164-168, TOCTOU-free). `tests/booking/state-machine.test.ts` (7 cases) proves all four gates + the idempotent re-confirm. |
| 5 | Reserve page (`/listings/[id]/book`) and confirmation (`/bookings/[id]`) are owner-gated; reserve page READS the hold, never creates it | ✓ VERIFIED | `book/page.tsx`: `if (!bk \|\| bk.bookerId !== userId) notFound()` (line 71); grep confirms no `placeHold`/`createPendingHold` call in this file. `bookings/[id]/page.tsx`: `if (!bk \|\| bk.bookerId !== userId) notFound()` (line 64). Both verified by direct read + grep. |
| 6 | All prices integer cents, ₱ PHP display; all times timestamptz UTC displayed venue-local | ✓ VERIFIED | `booking.quotedTotalCents integer` column (schema.ts:350); `quoteWindow` (pricing.ts) computes integer cents only, throws rather than freeze a $0 charge on a missing rate; `DISPLAY_CURRENCY = "php"` (money.ts) is the single source consumed by PriceBreakdown/reserve/confirmation/search cards. `startsAt`/`endsAt`/`expiresAt` are all `timestamp(..., {withTimezone:true})`; every display path uses `format(..., {in: tz(timezone)})` (venue-local) via the shared `venue-time.ts`. |
| 7 | A full search → filter → card → listing → Book → reserve (countdown) → Confirm → confirmation flow works end-to-end; abandoned hold shows graceful expiry; confirmation durable across refresh | ✓ VERIFIED (executed live) | Ran `npx playwright test e2e/search-and-book.spec.ts` in this verification session (not merely trusting the SUMMARY): **2 passed** (24.6s) — the happy-path flow (search→filter→card→listing→Book→reserve countdown+₱ breakdown→Confirm→durable FIT- reference across reload) and the abandoned-hold expiry case (`role="status"` "Your hold expired", never a red alert). |
| 8 | All 8 requirement IDs (SEARCH-01..05, BOOK-01..03) are satisfied and traced to concrete code | ✓ VERIFIED | See Requirements Coverage below — every ID maps to a specific plan/commit and to code read directly in this session. |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db/schema.ts` | booking.expiresAt/quotedTotalCents/currency/idempotencyKey + booking_idem_uq | ✓ VERIFIED | All 4 columns present (schema.ts:349-352); `booking_idem_uq` partial-unique index present (line 360). Confirmed on LIVE DB via `information_schema` query in this session (4/4 columns present) and `pg_constraint` (booking_no_overlap present). |
| `drizzle/0006_booking_hold.sql`, `0007_booking_location_geog.sql` | migrations applied | ✓ VERIFIED | Both files exist; live-DB introspection confirms columns + `listing_location_geog_gist` index applied. |
| `src/lib/availability/read-model.ts` | lazy-expiry occupancy predicate | ✓ VERIFIED | Predicate `(status='confirmed' OR (status='pending' AND expires_at > now()))` reused verbatim by `findOwnActiveHold`/`pickLowestFreeUnit` in units.ts and Stage-2 of query.ts. |
| `src/lib/validation/booking.ts` | searchParamsSchema + bookingCreateSchema | ✓ VERIFIED | Both exported; 19 unit tests in `tests/validation/booking-schemas.test.ts` green. |
| `scripts/seed.ts`, `tests/helpers/seed.ts` | D-38 bookable seed set + geo test helper | ✓ VERIFIED | Present; re-run confirmed idempotent in the 04-02 SUMMARY; not re-run in this session (non-destructive to re-verify, low risk). |
| `src/lib/search/query.ts` | searchListings — two-stage search | ✓ VERIFIED | 211 lines; exports `searchListings`; Stage-1 SQL + Stage-2 getAvailability reuse both present and read directly. 16 integration tests green (`tests/search/*`). |
| `src/lib/booking/pricing.ts` | quoteWindow | ✓ VERIFIED | Exports `quoteWindow`/`windowHours`; integer-cents, PHP, no-cap, $0-guard all present and tested (`tests/booking/pricing.test.ts`). |
| `src/lib/booking/reference.ts` | makeBookingReference + bookingReference | ✓ VERIFIED | `makeBookingReference` (crypto-random, mint-time) + `bookingReference(bookingId)` (deterministic SHA-256-derived, DURABLE across refresh — resolves the "open follow-up" flagged in the 04-04 SUMMARY). Used correctly by `bookings/[id]/page.tsx`. |
| `src/lib/availability/units.ts` | createPendingHold WR-03 transaction | ✓ VERIFIED | Full WR-03 contract implemented and tested (see Truth #3). |
| `src/app/actions/booking.ts` | placeHold + confirmBooking | ✓ VERIFIED | Both exported, both server actions, both gated correctly (see Truth #4). |
| `src/components/booking/{price-breakdown,hold-countdown,hold-expired-state,reserve-actions,reserve-view,book-cta}.tsx` | reserve-page atoms | ✓ VERIFIED | All present; PriceBreakdown does zero client arithmetic; HoldCountdown has `role="timer"`; reserve-actions disables on click. |
| `src/app/listings/[id]/book/page.tsx`, `src/app/bookings/[id]/page.tsx` | reserve + confirmation pages | ✓ VERIFIED | Both owner-gated, both read directly in this session (see Truth #5). |
| `src/components/search/{search-result-card,search-results,search-bar}.tsx`, `src/app/page.tsx` | search home UI | ✓ VERIFIED | All present; `app/page.tsx` awaits searchParams, safeParses, calls searchListings; no host controls/status badge on cards; one coral Search button. |
| `e2e/search-and-book.spec.ts` | full-flow E2E | ✓ VERIFIED | Executed live in this session: 2/2 passed. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `read-model.ts` | booking occupancy | lazy-expiry predicate | ✓ WIRED | `status = 'confirmed' OR (status = 'pending' AND expires_at > now())` present, reused by units.ts + query.ts Stage-2. |
| `search/query.ts` | `listing.location` | `ST_DWithin(...::geography, ...::geography)` | ✓ WIRED | Both operands cast; verified by grep + the outlier-exclusion test. |
| `search/query.ts` | `getAvailability` | Stage-2 per-candidate filter | ✓ WIRED | Direct call at query.ts:192; no second occupancy SQL predicate exists in the file. |
| `units.ts` | per-unit SAVEPOINT | `tx.transaction` | ✓ WIRED | Nested `tx.transaction(async (sp) => ...)` at units.ts:236. |
| `units.ts` | in-tx stale-hold sweep | `expires_at <= now()` | ✓ WIRED | UPDATE at units.ts:221-224 runs inside the outer tx before the insert loop. |
| `actions/booking.ts` | `createPendingHold` | placeHold after session+canBook+deriveBookable gate | ✓ WIRED | Sequenced exactly in that order (booking.ts:64-122). |
| `actions/booking.ts` | confirm expiry re-check | atomic `UPDATE ... WHERE expires_at > now()` | ✓ WIRED | booking.ts:164-168; short-circuit for already-confirmed precedes it (line 158). |
| `listings/[id]/page.tsx` | `placeHold` | `BookCta` client seam invoking the server action | ✓ WIRED | Grep confirms `placeHold` imported + passed to `<BookCta>` (page.tsx:64,294). |
| `bookings/[id]/page.tsx` | session owner-gate | `bookerId === userId else notFound` | ✓ WIRED | Line 64. |
| `listings/[id]/book/page.tsx` | the hold | reads `?hold=<id>` owner-gated, never creates | ✓ WIRED | Line 71; no `createPendingHold`/`placeHold` import in the file. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `app/page.tsx` → `SearchResults` | `results` | `searchListings(db, ...)` (live Postgres, PostGIS) | Yes — verified against the seeded DB and the E2E run | ✓ FLOWING |
| `book/page.tsx` → `PriceBreakdown` | `quotedTotalCents` | `booking.quotedTotalCents` (frozen at hold time by `quoteWindow` inside the tx) | Yes | ✓ FLOWING |
| `bookings/[id]/page.tsx` → confirmation | `bk.quotedTotalCents`, `reference` | persisted `booking` row + deterministic `bookingReference(bk.id)` | Yes — durability proven by the E2E reload assertion | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Live DB carries the 4 hold columns + EXCLUDE constraint | `node -e "...information_schema..."` + `pg_constraint` query | 4/4 columns present; `booking_no_overlap` present | ✓ PASS |
| Full unit/integration suite | `npx vitest run` | 46 files / 283 tests passed | ✓ PASS |
| Type check | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Lint (phase-4 files only) | `npx eslint <phase-4 file list>` | exit 0, no output | ✓ PASS |
| Full-flow E2E (search→book→confirm+expiry) | `npx playwright test e2e/search-and-book.spec.ts` | 2 passed (24.6s) | ✓ PASS |
| Anti-pattern scan (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) on all phase-4 files | `grep -n` | No debt markers found (two false-positive substring matches in comments only) | ✓ PASS |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` convention; verification instead ran the phase's own E2E spec live (see Behavioral Spot-Checks) and the DB introspection queries directly.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| SEARCH-01 | 04-05 (completes; spine in 04-03) | Search by location/radius | ✓ SATISFIED | `query.ts` `::geography` radius; `search-bar.tsx` location field; E2E asserts distance line. |
| SEARCH-02 | 04-05 (completes; spine in 04-03) | Filter by activity/space type | ✓ SATISFIED | Single combined `category` param checked against both `primary_space_type` and `listing_activity_tag`; E2E filters to `category=tennis_court`. |
| SEARCH-03 | 04-05 (completes; spine in 04-03) | Filter by date/time availability | ✓ SATISFIED | Stage-2 `getAvailability` reuse in query.ts; `tests/search/availability-filter.test.ts`. |
| SEARCH-04 | 04-05 (completes; spine in 04-03) | Filter by price | ✓ SATISFIED | `priceMax` bound in `searchParamsSchema`; `hourly_rate_cents <= priceMax` in query.ts. |
| SEARCH-05 | 04-05 | Results as cards (photo/name/price/distance) | ✓ SATISFIED | `search-result-card.tsx`; E2E asserts photo/name/₱ price/distance render. |
| BOOK-01 | 04-07 (completes; quote in 04-04, actions in 04-06) | Select window + see price breakdown before committing | ✓ SATISFIED | `PriceBreakdown` on the reserve page consuming the server-frozen quote; E2E asserts the ₱ total renders before Confirm. |
| BOOK-02 | 04-01 | Slot held/locked during checkout with expiry | ✓ SATISFIED | `expiresAt` column + `HOLD_TTL_MINUTES=15` + `HoldCountdown`; E2E asserts `Held for mm:ss`. |
| BOOK-03 | 04-07 (completes; DB proof in 04-04) | Overlapping booking rejected (no double-booking) | ✓ SATISFIED | `booking_no_overlap` EXCLUDE constraint (live DB, verified this session) + `pending-hold.test.ts` concurrent race proof. |

No orphaned requirements: cross-referencing `.planning/REQUIREMENTS.md`'s Phase 4 traceability rows (SEARCH-01..05, BOOK-01..03) against the union of every plan's frontmatter `requirements:` field shows a complete, non-overlapping match — all 8 IDs are claimed by at least one plan and all 8 are marked Complete in REQUIREMENTS.md.

### Anti-Patterns Found

None. Grep for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and case-insensitive `placeholder|coming soon|not yet implemented` across every phase-4-modified file returned zero debt markers (two incidental substring matches in comments — "Mint" and "FIT-XXXXXXXX" — are not markers). `npm run lint`/`npm run build` failures noted in `deferred-items.md` are pre-existing Phase-2 issues (PayMongo secret-key production guard, `address-autocomplete.tsx` react-hooks lint error) explicitly out of scope for Phase 4 per the task brief and confirmed unrelated by `git diff` against files this phase never touched.

### Human Verification Required

None outstanding. The phase's `checkpoint:human-verify` (04-08 Task 2) was already run and approved by the user (git commit `712e7c1` "docs(04-08): complete full-flow E2E + human-verify"), covering the search home, reserve countdown/expiry, and confirmation durability against `04-UI-SPEC.md`. Per the task brief, this is treated as already satisfied and does not reopen a human-verification gate.

### Gaps Summary

No gaps. Every must-have truth, artifact, and key link was verified directly against the codebase (not the SUMMARYs): live-DB schema/constraint introspection, `tsc`/`eslint` clean on all phase-4 files, the full Vitest suite (283/283) green, and the phase's own Playwright E2E spec executed live in this session (2/2 passed, including the abandoned-hold expiry UX). The DB `booking_no_overlap` EXCLUDE constraint is confirmed as the sole double-booking authority — `units.ts` explicitly documents and implements the advisory-probe/DB-authority split, with no query-then-insert conflict guard anywhere in the booking path. Search Stage-2 provably reuses the same `getAvailability` read model as the listing calendar. `createPendingHold` fully honors WR-03. `placeHold`/`confirmBooking` correctly gate and never trust the client for price, time, or expiry. Reserve and confirmation pages are owner-gated and the reserve page never creates a hold. All prices are integer cents displayed in PHP; all times are `timestamptz` displayed venue-local. One prior open item from the 04-04 SUMMARY ("no reference column — confirmation derives it on-read, which would change every render") was checked directly and found already resolved in 04-07: `bookingReference(bookingId)` derives the reference deterministically via SHA-256 of the immutable booking id, so it is stable across refreshes — not the crypto-random `makeBookingReference()` used only at mint time for uniqueness proofs.

---

*Verified: 2026-07-15T16:50:00Z*
*Verifier: Claude (gsd-verifier)*
