---
phase: 04-booking-core-search-no-payment
plan: 04
subsystem: booking
tags: [drizzle, postgres, savepoint, transaction, idempotency, exclusion-constraint, pricing, crockford-base32]

# Dependency graph
requires:
  - phase: 03-availability-double-booking
    provides: "booking_no_overlap GiST EXCLUDE constraint (0005), getAvailability read model, slots.ts, makeRacingClients + isPgError, the ISO-string bind vs Date-insert convention"
  - phase: 04-01
    provides: "booking hold columns (expiresAt/quotedTotalCents/currency/idempotencyKey) + booking_idem_uq partial-unique index; read-model lazy-expiry predicate"
  - phase: 04-02
    provides: "DISPLAY_CURRENCY='php' (money.ts), bookingCreateSchema/searchParamsSchema shape validation"
provides:
  - "createPendingHold — the WR-03 transactional pending-hold path (outer 40P01 retry + per-unit SAVEPOINT for 23P01 + in-tx stale-hold sweep + own-hold/23505 idempotency)"
  - "quoteWindow — server-authoritative frozen price quote (hours×hourly | flat dayRate, PHP, no cap)"
  - "makeBookingReference — FIT- + 8 Crockford base32 crypto-random reference generator"
  - "HOLD_TTL_MINUTES (15, D-47) + HoldResult/CreatePendingHoldInput types"
  - "isPgError now unwraps drizzle's DrizzleQueryError .cause chain (shared, all callers benefit)"
affects: [04-05 search UI, 04-06 reserve/confirm flow (placeHold/confirmBooking + HoldCountdown + PriceBreakdown), 05 payments (charges quotedTotalCents)]

# Tech tracking
tech-stack:
  added: []  # no new runtime packages (RESEARCH Package Legitimacy Audit — zero new deps)
  patterns:
    - "WR-03 two-phase hold: OUTER for-retry on 40P01 (postgres.js begin() does not auto-retry) wrapping db.transaction; per-unit nested tx.transaction (SAVEPOINT) so a 23P01 rolls back only the losing attempt (no 25P02); in-tx sweep-on-write before the find-free probe"
    - "Idempotency = own-hold pre-check (primary) + 23505 backstop + 23P01 own-duplicate re-check; only genuine someone-else conflict/exhaustion maps to 'just taken' (the D-42 distinction)"
    - "Server-frozen price quote: quoteWindow re-derives hours from the window × the listing rate inside the tx; the client figure is display-only"
    - "isPgError walks the error .cause chain so drizzle-wrapped SQLSTATE is detected like a raw postgres.js throw"

key-files:
  created:
    - src/lib/booking/pricing.ts
    - src/lib/booking/reference.ts
    - tests/booking/pricing.test.ts
    - tests/booking/pending-hold.test.ts
    - tests/booking/hold-expiry.test.ts
  modified:
    - src/lib/availability/units.ts
    - src/lib/pg.ts

key-decisions:
  - "createPendingHold loads the listing (unitCount + rates) INSIDE the tx and derives the price there — fully server-authoritative; the caller cannot supply a price"
  - "On 23P01, re-run the own-hold pre-check before ruling 'just taken' — booking_no_overlap (0005) has a lower OID than booking_idem_uq (0006) so the exclusion fires FIRST for a same-key same-window race; without this a unitCount=1 double-click would false-'just taken' (D-42)"
  - "quoteWindow throws rather than freeze a \$0 quote when the required rate is null (money-correctness guard, Rule 2)"
  - "Preserved createBooking + mapBookingError unchanged (createBooking still has green tests); added createPendingHold alongside"
  - "Reference generated on-read by makeBookingReference (no reference column this plan; the schema was not touched)"

patterns-established:
  - "Per-unit SAVEPOINT via drizzle nested tx.transaction; outer for-loop retry for 40P01 (bounded MAX_TX_RETRIES=3)"
  - "findOwnActiveHold shared by the pre-check, the 23505 backstop, and the 23P01 own-duplicate re-check — one predicate, three call sites"

requirements-completed: []   # BOOK-01/03 are cross-cutting — backend keystone here; user-facing completion at 04-06 (reserve/confirm) + phase-transition validation. BOOK-02 was already Complete. See 'Requirements' note below.

# Metrics
duration: 20min
completed: 2026-07-15
---

# Phase 4 Plan 04: Pending-Hold Keystone (createPendingHold WR-03) Summary

**createPendingHold rewrites the auto-commit find-free-unit path into a real transaction — outer 40P01 retry + per-unit SAVEPOINT for 23P01 + in-tx stale-hold sweep + own-hold/23505 idempotency — plus a server-frozen PHP price quote and a FIT- Crockford-base32 reference; concurrency, idempotency, savepoint, and lazy-read+sweep all proven with independent-connection races.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-15T04:33:39Z
- **Completed:** 2026-07-15T04:53:30Z
- **Tasks:** 3
- **Files created/modified:** 7 (5 created, 2 modified)

## Accomplishments
- **createPendingHold** (`units.ts`): the deferred WR-03 contract finally built as a real `db.transaction` — the OUTER `for` loop retries `40P01` (postgres.js `begin()` never auto-retries), each unit insert runs in a nested `tx.transaction` **SAVEPOINT** so a `23P01` rolls back only that attempt (never `25P02`), an in-tx sweep cancels overlapping expired holds before the find-free probe, and an own-hold pre-check + `23505` backstop + `23P01` own-duplicate re-check return the SAME booking on a double-submit.
- **quoteWindow** (`pricing.ts`): server re-derives `hours` from the window × the listing rate and freezes `{ totalCents, currency:'php', hours, fullDay }` (D-45 distinct, no cap; refuses a $0 quote when the rate is missing).
- **makeBookingReference** (`reference.ts`): `FIT-` + 8 Crockford base32 (no I/L/O/U) from `randomBytes`, uniform (256 % 32 == 0, no modulo bias), non-sequential.
- **Proofs:** independent-connection races via `makeRacingClients` — exactly one hold wins (loser → clean "just taken"); two same-key submits return the SAME id; a 23P01 on unit 1 retries unit 2 in one outer tx; a stale hold reads free AND is swept so a new hold succeeds, while a live hold still blocks. 18 booking tests green; full suite 276/276.

## Task Commits

Each task was committed atomically (TDD red → green):

1. **Task 1: pricing.ts + reference.ts** — `9294f2c` (test, RED) → `0aa8439` (feat, GREEN)
2. **Task 2: createPendingHold WR-03 transaction** — `201ff4d` (test, RED) → `bd9cf2b` (fix, Rule 1) → `36a593c` (feat, GREEN)
3. **Task 3: hold-expiry lazy-read + sweep proof** — `e818454` (test)

**Plan metadata:** _(final docs commit)_

## Files Created/Modified
- `src/lib/booking/pricing.ts` — `quoteWindow` server-authoritative frozen quote (hours×hourly | flat dayRate, PHP, no cap; $0 guard).
- `src/lib/booking/reference.ts` — `makeBookingReference` FIT- Crockford base32 crypto-random reference.
- `src/lib/availability/units.ts` — added `createPendingHold` (WR-03 tx), `findOwnActiveHold`, `pickLowestFreeUnit`, `HOLD_TTL_MINUTES`, `HoldResult`/`CreatePendingHoldInput`/`HoldSuccess`; kept `createBooking` + `mapBookingError` unchanged.
- `src/lib/pg.ts` — `isPgError` now walks the error `.cause` chain (drizzle `DrizzleQueryError` wrapping).
- `tests/booking/pricing.test.ts` — pure table-driven pricing + reference test (12 cases).
- `tests/booking/pending-hold.test.ts` — concurrency + idempotency + savepoint races via `makeRacingClients` (4 cases).
- `tests/booking/hold-expiry.test.ts` — D-48 lazy-read + sweep pair, and the live-hold block (2 cases).

## Decisions Made
- **Server-authoritative price inside the tx:** `createPendingHold` SELECTs the listing's `unitCount`/`hourlyRateCents`/`dayRateCents` inside the transaction and calls `quoteWindow` there — the caller never supplies a price (T-04-PRICETAMPER).
- **23P01 own-duplicate re-check:** because `booking_no_overlap` (0005) has a lower OID than `booking_idem_uq` (0006), a concurrent same-key **same-window** race trips the EXCLUDE (`23P01`) BEFORE the unique index (`23505`). So on `23P01` we re-run the own-hold pre-check; if it matches, we replay (never false-"just taken"). This is what makes the `unitCount=1` double-click case correct — the `23505`-only branch from the RESEARCH draft would have missed it.
- **quoteWindow throws on a missing rate** rather than freezing a $0 charge (money guard).
- **createBooking preserved** (its tests stay green); `createPendingHold` is additive.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `isPgError` did not detect drizzle-wrapped SQLSTATE**
- **Found during:** Task 2 (the pending-hold races initially rejected instead of mapping)
- **Issue:** Drizzle 0.45.2 wraps every driver error in a `DrizzleQueryError` ("Failed query: …") whose `.cause` holds the postgres.js error carrying the SQLSTATE `.code`. `isPgError` only checked the top-level `.code`, so a `23P01`/`40P01`/`23505` raised by a drizzle query (createPendingHold's savepoint insert) slipped past every catch → the outer tx aborted → the raw error surfaced as a reject (a 500). This was latent because `createBooking`'s own `23P01` branch is never actually exercised through drizzle by the existing tests (its probe avoids the conflict).
- **Fix:** `isPgError` now walks the `.cause` chain (bounded depth 10). Raw postgres.js throws (exclusion-race harness, error-map test) are unaffected — the top level is checked first.
- **Files modified:** `src/lib/pg.ts`
- **Verification:** `tests/booking/pending-hold.test.ts` green and stable across repeated runs; full suite 276/276 (no regression to the raw-error tests).
- **Committed in:** `bd9cf2b`

**2. [Rule 2 - Missing Critical] `23P01` own-duplicate re-check + `$0`-quote guard**
- **Found during:** Task 2 (Task 1 for the quote guard)
- **Issue:** (a) The RESEARCH Pattern-2 draft only handled `23505 → return duplicate` for idempotency; for a `unitCount=1` same-key same-window race the EXCLUDE (`23P01`) fires first (lower OID), so the draft would false-"just taken" a booker's own double-click (the exact D-42 failure, a `mitigate` in the threat register T-04-IDEMCONFLATE). (b) `quoteWindow` with a null required rate would freeze a $0 charge.
- **Fix:** On `23P01`, re-run `findOwnActiveHold`; replay if it is the caller's own committed duplicate, else continue to the next unit. `quoteWindow` throws when the selection's required rate is null.
- **Files modified:** `src/lib/availability/units.ts`, `src/lib/booking/pricing.ts`
- **Verification:** the concurrent-same-key case returns one id with `unitCount=1`; pricing test asserts the throw.
- **Committed in:** `36a593c` (23P01 re-check), `0aa8439` (quote guard)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing-critical). Both strengthen the threat-register `mitigate` items (T-04-IDEMCONFLATE, T-04-TXABORT, T-04-DOUBLEBOOK). No scope creep; no schema change; no new packages.

## Issues Encountered
- The race tests initially rejected (raw error escaped mapping) — root-caused to the drizzle error wrapping above via a `resolved()` helper that surfaces the raw reject reason (kept as permanent test hygiene). Fixed at the shared `isPgError` layer so every booking caller benefits.

## Requirements
Consistent with 04-02/04-03, the phase's cross-cutting requirements are NOT marked complete here:
- **BOOK-01** (select window + see price breakdown before committing): the server quote (`quoteWindow`) ships here, but the user-facing price-breakdown UI is 04-06 → stays **Pending**.
- **BOOK-02** (slot held/locked with an expiry): already **Complete**; this plan builds the actual hold mechanism (createPendingHold + 15-min TTL + sweep) behind it.
- **BOOK-03** (overlapping rejected + double-click idempotency, exactly one): fully proven at the logic/DB level here (concurrency + idempotency + savepoint tests), but the graceful user-facing surface (reserve flow + button-disable) is 04-06 → stays **Pending**; validated at phase transition.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `createPendingHold(db, { listingId, bookerId, startsAt, endsAt, fullDay?, idempotencyKey? })` → `HoldResult` is ready to be called by the **04-06 `placeHold` server action** (session + `canBook` gate + `deriveBookable` re-check, then redirect to `/listings/[id]/book?hold=<id>`).
- `quoteWindow` is the frozen snapshot Phase 5 will charge against (`quotedTotalCents`); `makeBookingReference` is ready for the confirmation page.
- `HOLD_TTL_MINUTES` (15) is the config-tunable source for the HoldCountdown timer.
- Open follow-up (not blocking): no `reference` column exists — the confirmation page derives it on-read via `makeBookingReference`, or a later migration may persist it.

## Self-Check: PASSED

All created/modified files exist on disk; all task commits (`9294f2c`, `0aa8439`, `201ff4d`, `bd9cf2b`, `36a593c`, `e818454`) are present in the git log.

---
*Phase: 04-booking-core-search-no-payment*
*Completed: 2026-07-15*
