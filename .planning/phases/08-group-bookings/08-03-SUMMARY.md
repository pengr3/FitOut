---
phase: 08-group-bookings
plan: 03
subsystem: payments
tags: [pricing, quoteWindow, group-bookings, service-fee, payout-basis, drizzle, postgres, vitest]

# Dependency graph
requires:
  - phase: 08-group-bookings (08-01)
    provides: listing.included / listing.extra_head_fee / booking.declared_pax columns (migration 0017)
  - phase: 04-booking-core-search
    provides: quoteWindow pure module + createPendingHold WR-03 transaction
  - phase: 07-bookings-management
    provides: the D-74 frozen triple (space/fee/all-in) + payout-sweep grossing on space_price_cents
provides:
  - "quoteWindow extended with the D-108 pax surcharge (backward-compatible; extraHeadFee=0 byte-identical to today)"
  - "Quote gains extraHeads + extraHeadCents (server-computed breakdown props for the 08-05 UI)"
  - "declaredPax threaded placeHold → createPendingHold, folding the surcharge into spacePriceCents (A1 payout + service-fee basis)"
  - "bookingCreateSchema.declaredPax (shape-only, server-re-derived price)"
  - "booking.declared_pax persisted only when the listing charges per head (else NULL)"
affects: [08-05 (PaxStepper + PriceBreakdown + fullDay fix), group-rsvp, host-earnings, payout-sweep]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pax surcharge is HOST REVENUE folded into spacePriceCents at the caller (A1) — never a separate non-payout line"
    - "quoteWindow stays pure over listing rates; group-pricing facts (included/extraHeadFee) read server-side in-tx, never trusted from the client"
    - "declaredPax persisted only when extra_head_fee > 0 (no surcharge machinery on a flat listing, D-108)"

key-files:
  created:
    - tests/booking/pax-surcharge-hold.test.ts
  modified:
    - src/lib/booking/pricing.ts
    - src/lib/validation/booking.ts
    - src/app/actions/booking.ts
    - src/lib/availability/units.ts
    - tests/booking/pricing.test.ts

key-decisions:
  - "A1 (RESOLVED YES): the surcharge folds into spacePriceCents — host revenue, payout + service-fee basis; Phase-5 hold-until-session rail unchanged (D-107)"
  - "declaredPax threaded into BOTH createPendingHold call sites (instant + request), so group pricing works regardless of booking mode"
  - "declaredPax is SHAPE-ONLY at the schema (optional coerced positive int); the real cap is D-112 seat-claim, the price is server-re-derived"

patterns-established:
  - "Pattern 1: surcharge = extraHeadFee>0 ? max(0, declaredPax − included) × extraHeadFee : 0, gated + floored so flat listings are byte-identical and pax ≤ included is never negative"
  - "Pattern 2: the surcharge folds into quote.totalCents → frozen as spacePriceCents → computeServiceFee applies automatically → quoted == space + fee by construction"

requirements-completed: [GROUP-01, GROUP-05]

# Metrics
duration: 9min
completed: 2026-07-27
---

# Phase 8 Plan 03: Pax Pricing Seam (backend) Summary

**Server-authoritative D-108 pax surcharge — `total = base + max(0, declaredPax − included) × extraHeadFee` — folded into `spacePriceCents` at hold freeze time (host revenue, payout + service-fee basis, A1), backward-compatible so `extraHeadFee = 0` stays byte-identical to today.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-07-27T17:39:00Z
- **Completed:** 2026-07-27T17:45:00Z
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified) + 1 test extended

## Accomplishments
- `quoteWindow` extended with the D-108 surcharge and two new breakdown fields (`extraHeads`, `extraHeadCents`), pure/isomorphic and byte-identical to today when `extraHeadFee` is absent/0.
- `declaredPax` threaded end-to-end: `bookingCreateSchema` → `placeHold` → both `createPendingHold` call sites → the in-tx quote, folding the surcharge into `spacePriceCents` so it becomes the payout gross basis AND the service-fee basis automatically (A1 / T-08-07).
- `booking.declared_pax` persisted only when the listing charges per head (`extra_head_fee > 0`), else NULL — no surcharge machinery on a flat listing (D-108).
- Proven in two suites: a pure unit test (16 cases, TDD RED→GREEN) and a real-Postgres integration test asserting the fold, organizer-only (D-113), the floor, and flat-listing backward-compat/T-08-06.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): failing pax-surcharge tests** - `a8cb418` (test)
2. **Task 1 (GREEN): extend quoteWindow with the D-108 surcharge** - `01f2445` (feat)
3. **Task 2: thread declaredPax + fold surcharge into spacePriceCents (+ integration test)** - `fc0bd18` (feat)

**Plan metadata:** _(final docs commit — see below)_

_Note: Task 1 is TDD (test → feat); no refactor was needed._

## Files Created/Modified
- `src/lib/booking/pricing.ts` - `QuoteInput` gains optional `included`/`extraHeadFee`/`declaredPax`; `Quote` gains `extraHeads`/`extraHeadCents`; surcharge computed with `Math.max(0, …)` floor, integer centavos, missing-rate throw preserved, module stays pure (07-08 fee seam untouched).
- `src/lib/validation/booking.ts` - `bookingCreateSchema.declaredPax` (optional coerced positive int, shape-only).
- `src/app/actions/booking.ts` - `placeHold` captures `declaredPax` and threads it into the request-mode and instant-mode `createPendingHold` calls.
- `src/lib/availability/units.ts` - `CreatePendingHoldInput.declaredPax`; reads `listing.included`/`listing.extra_head_fee` inside the tx; threads them + `declaredPax` into `quoteWindow`; persists `declaredPax` onto the booking row only when `extra_head_fee > 0`.
- `tests/booking/pricing.test.ts` - four D-108 unit cases (backward-compat/zero-leak, surcharge add, floor + organizer-only, integer/throw).
- `tests/booking/pax-surcharge-hold.test.ts` - **created**; real-Postgres proof that the surcharge folds into `spacePriceCents`, that `quoted == space + fee`, that flat listings are byte-identical, and that a client-sent `declaredPax` cannot move a flat listing's price (T-08-06).

## Decisions Made
- **A1 fold confirmed in code:** the surcharge enters `quote.totalCents`, which is already frozen as `spacePriceCents` (units.ts) — so `computeServiceFee(space)` and the payout sweep pick it up with no further wiring. `quoted == space + fee` holds by construction.
- **declaredPax threaded into both `createPendingHold` call sites** (instant + request), not just the instant path — a `request`-mode group booking must price identically. The surcharge only actually applies when `extra_head_fee > 0`, so this is inert for flat request listings.
- **No payment code touched (D-107):** the Phase-5 hold-until-session rail is unchanged; only the frozen `spacePriceCents` basis widened.

## Deviations from Plan

None - plan executed exactly as written.

The plan's acceptance criteria allowed asserting the flat-listing backward-compat in "an existing or new units test"; a new dedicated integration test (`pax-surcharge-hold.test.ts`) was added to prove both the surcharge fold (T-08-07) and the flat-listing/T-08-06 backward-compat explicitly, rather than relying only on the existing `service-fee-hold.test.ts` remaining green. This is within the plan's stated latitude, not a deviation.

## Issues Encountered
None. RED failed as expected on the four new cases (12 pre-existing green), GREEN turned all 16 green; the full `tests/booking/` suite is 18 files / 181 tests green; tsc + eslint clean.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- **08-05 (UI) is unblocked:** `quoteWindow` now returns server-computed `extraHeads`/`extraHeadCents` for the `PriceBreakdown` line, and the surcharge is in `spacePriceCents`. Per RESEARCH Pitfall 3, 08-05 MUST switch `book/page.tsx` and `(app)/bookings/[id]/page.tsx` to read the persisted `booking.fullDay` column instead of re-deriving `fullDay` from price — a surcharged hourly booking would otherwise mislabel as "Full day". The `booking.declared_pax` column is populated for fee-charging listings and available for the 08-04 corroboration nudge (D-114).
- No blockers.

---
*Phase: 08-group-bookings*
*Completed: 2026-07-27*

## Self-Check: PASSED
- Files verified on disk: `08-03-SUMMARY.md`, `tests/booking/pax-surcharge-hold.test.ts`, `src/lib/booking/pricing.ts`
- Commits verified in git log: `a8cb418` (test), `01f2445` (feat), `fc0bd18` (feat)
