---
phase: 08-group-bookings
plan: 05
subsystem: booking-ui
tags: [group-bookings, pricing, pax, checkout, wizard, price-breakdown, full-day, shadcn, vitest]

# Dependency graph
requires:
  - phase: 08-group-bookings (08-01)
    provides: listing.included / listing.extra_head_fee / listing.occupancy_mode / booking.declared_pax (migration 0017)
  - phase: 08-group-bookings (08-03)
    provides: quoteWindow's D-108 surcharge + extraHeads/extraHeadCents, declaredPax threaded into createPendingHold
  - phase: 07-bookings-management
    provides: booking.full_day pricing-mode snapshot (drizzle 0016 / WR-06), the D-74 frozen triple, PriceBreakdown's zero-arithmetic contract
provides:
  - "Host-facing optional Group pricing fields (extraHeadFee + included) in the wizard's pricing step — never a publish requirement"
  - "paxSurcharge(): the SINGLE definition of the D-108 product, shared by quoteWindow and the reserve page"
  - "PaxStepper: declaredPax control that re-quotes SERVER-side and does zero client price math"
  - "updateDeclaredPax server action: re-freezes the whole D-74 triple on a live unpaid hold, clamped to maxOccupancy"
  - "PriceBreakdown 'Extra guests' conditional line (+ runPriceCents so the surcharge is disclosed once)"
  - "Both shipped booking surfaces read the PERSISTED booking.full_day (Pitfall 3 closed)"
affects: [08-06, 08-07 (top-up nudge reads declared_pax), 08-09 (UAT), host-earnings, payout-sweep]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useOptimistic over useEffect prop-sync for server-authoritative client state (eslint react-hooks/set-state-in-effect)"
    - "A disclosed sub-line splits the run line server-side (runPriceCents) rather than letting the component subtract"
    - "Idempotency-Key amount-scoping applied ONLY where the frozen quote is mutable (per-head bookings)"

key-files:
  created:
    - src/components/booking/pax-stepper.tsx
    - tests/booking/pax-reprice.test.ts
    - .planning/phases/08-group-bookings/deferred-items.md
  modified:
    - src/lib/validation/listing.ts
    - src/app/actions/listing.ts
    - src/app/(host)/host/listings/[id]/edit/wizard.tsx
    - src/app/(host)/host/listings/[id]/edit/page.tsx
    - src/lib/booking/pricing.ts
    - src/app/actions/booking.ts
    - src/components/booking/price-breakdown.tsx
    - src/app/listings/[id]/book/page.tsx
    - src/app/(app)/bookings/[id]/page.tsx
    - tests/validation/listing-schema.test.ts

key-decisions:
  - "Group-pricing fields mirror postalCode (optional in publishSchema), NOT cancellationPolicy — adding them to the publish gate is precisely how a requirement becomes real, so they stay optional on purpose"
  - "The stepper needs a dedicated re-price action (placeHold cannot serve it: createPendingHold's D-42 own-hold match replays the existing row WITHOUT re-pricing)"
  - "A CONFIRMED booking can never be re-priced — the over-subscribed-group top-up is D-114's deferred fast-follow, not this action"
  - "The checkout Idempotency-Key is amount-scoped only for per-head bookings, so the two shipped tests pinning checkout:<bookingId> stay valid and flat bookings are byte-identical"
  - "The pre-0016 fullDay fallback is a POSITIVE day-rate match (re-request.ts idiom), never an inequality — so nothing hourly, surcharged or not, can be mislabeled"

patterns-established:
  - "paxSurcharge is the only place extraHeads x extraHeadCents is multiplied; the UI receives all three figures as props"
  - "Grep gates are kept honest: neither page spells the removed derivation's identifiers, even in prose"

requirements-completed: [GROUP-01, GROUP-05]

# Metrics
duration: 35min
completed: 2026-07-27
---

# Phase 8 Plan 05: Pax-Pricing UI Summary

**The human-facing half of the D-108 seam: an optional host-set extra-guest fee, a booker-facing `PaxStepper` that re-quotes entirely server-side, one conditional "Extra guests" breakdown line — and, mandatory with the surcharge, both shipped booking pages switched from a price-derived `fullDay` to the persisted `booking.full_day` column.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-27T18:10:00Z
- **Completed:** 2026-07-27T18:45:00Z
- **Tasks:** 2
- **Files:** 13 (3 created, 10 modified)

## Accomplishments

- **Host side:** an optional "Group pricing" subsection in the wizard's pricing step — a ₱-prefixed `extraHeadFee` (default ₱0) and an `included` headcount revealed only once a fee is set. Neither is a publish requirement, and **no `occupancy_mode` control is rendered** (D-109).
- **Booker side:** a `PaxStepper` on the reserve page, mounted **only** when the listing charges per head. Changing it calls `updateDeclaredPax`, which re-freezes the entire D-74 triple from the listing's own numbers, then `router.refresh()` re-renders the server breakdown. The component contains no money formatter, no fee, no total, and no price multiplication.
- **Breakdown:** one conditional `Extra guests (K × ₱fee)` line between the run line and the service fee. Because the surcharge is folded *into* `spacePriceCents` (A1), the run line drops back to the base via a new server-computed `runPriceCents` — so the same centavos are never disclosed twice, and the component still neither sums nor subtracts anything.
- **Pitfall 3 closed:** `book/page.tsx` and `(app)/bookings/[id]/page.tsx` now read `booking.full_day` (WR-06 / drizzle 0016). The old comparison of the frozen space price against the current hourly run total would have labelled **every surcharged hourly booking "Full day"** the moment a fee existed.
- **Zero UI change at `extraHeadFee = 0`:** no stepper, no surcharge line, no `declared_pax`, and the checkout idempotency key is byte-identical. Proven in test case (4) and by the whole `tests/payments/` suite staying green.

## Task Commits

1. **Task 1 — wizard Group-pricing fields + listing validation** — `19fe5b5` (feat)
2. **Task 2 — PaxStepper + surcharge line + both fullDay fixes** — `59e3eb0` (feat)

## Files Created/Modified

- `src/lib/validation/listing.ts` — `occupancyMode` / `included` / `extraHeadFee` on **both** schemas, optional in both. `extraHeadFee` is `.min(0)` (₱0 is the meaningful flat-pricing value, unlike a rate).
- `src/app/actions/listing.ts` — `saveListingStep` persists the two fee fields (and accepts the single-value `occupancyMode`); `publishListing` re-validates them off the persisted row, still optional.
- `src/app/(host)/host/listings/[id]/edit/wizard.tsx` — the Group-pricing subsection; `included` only rendered when `extraHeadFee > 0`. Defaults seeded to the pricing engine's own coalesced values (fee 0, includes 1) so an untouched listing round-trips to exactly today's flat price.
- `src/app/(host)/host/listings/[id]/edit/page.tsx` — passes `included` / `extraHeadFee` through (including null).
- `src/lib/booking/pricing.ts` — **`paxSurcharge()` extracted** as the single definition of the D-108 product; `quoteWindow` now delegates to it. Behaviour unchanged (all 16 existing pricing cases green).
- `src/app/actions/booking.ts` — **`updateDeclaredPax`**: session → shape → rate limit → owner gate → flat-listing no-op → server-side clamp → re-quote from the **persisted `full_day`** → re-freeze `(space, fee, quoted)` scoped to `(id, owner, status IN (pending, approved), expires_at > now())`. Plus the amount-scoped checkout key for per-head bookings.
- `src/components/booking/price-breakdown.tsx` — `runPriceCents` + `extraHeads` / `extraHeadCents` / `extraSurchargeCents`, all defaulting to a no-op.
- `src/components/booking/pax-stepper.tsx` — **created**; `input-group` +/−, read-only field with arrow-key support, `useOptimistic` so a refused re-price cannot leave an unpersisted headcount on screen.
- `src/app/listings/[id]/book/page.tsx` / `src/app/(app)/bookings/[id]/page.tsx` — persisted-`fullDay` reads; the detail page no longer selects the hourly rate at all (that absence *is* the fix).
- `tests/validation/listing-schema.test.ts` — 4 new cases, the load-bearing one being the **negative** property: a publish-eligible fixture with no group fields still passes.
- `tests/booking/pax-reprice.test.ts` — **created**; 9 real-Postgres cases.

## Verification

- `npx vitest run tests/booking/ tests/listing/ tests/validation/ tests/payments/` → **40 files / 419 tests, exit 0**.
- `npx tsc --noEmit` clean; `npx eslint src/ tests/` → **0 errors** (7 pre-existing warnings, all untouched).
- `npm run build` → **exit 0**, 27 routes, no env workaround.
- **Non-vacuity check (mutation):** replacing `fullDay: row.fullDay ?? false` with `fullDay: false` in `updateDeclaredPax` turns case (8) red (the full-day hold re-prices off the hourly rate); restored and re-verified green. The persisted-column read is therefore genuinely load-bearing, not decorative.

## Deviations from Plan

### Auto-fixed / adjusted

**1. [Rule 2 — missing critical functionality] The checkout Idempotency-Key is amount-scoped for per-head bookings**
- **Found during:** Task 2, designing `updateDeclaredPax`.
- **Issue:** the stepper makes a hold's frozen quote *mutable* for the first time. With the shipped `checkout:<bookingId>` key, a booker who starts checkout, backs out via `cancelUrl`, steps the headcount and pays again would have PayMongo replay the FIRST session — charging the old amount while the page displays the new one. That is the exact displayed-total ≠ charged-total failure `price-breakdown.tsx` exists to prevent.
- **Fix:** `confirmBooking` now uses `checkout:<bookingId>:<quotedTotalCents>` **only when `declared_pax` is non-NULL** (i.e. only on a per-head-priced booking, the only kind whose quote can move). Flat bookings keep the byte-identical key, so the shipped double-charge guard and the two tests pinning it (`tests/payments/checkout-create.test.ts`, `paymongo-calls.test.ts`) are untouched and green.
- **Residual edge logged** (stale open PayMongo tab paying the older session) in `deferred-items.md` — closing it needs a persisted `checkout_session_id` or a webhook amount-reconcile, both Phase-5 money-rail changes D-107 holds out of scope.
- **Commit:** `59e3eb0`

**2. [Rule 3 — blocking] A dedicated re-price action, not in `files_modified`**
- The plan's `files_modified` lists six files and no server action; its `read_first` says "the stepper submits declaredPax through the same reserve flow". That flow cannot serve it: re-submitting `placeHold` for the same window hits `createPendingHold`'s D-42 own-hold match, which **replays the existing booking without re-pricing it**. `updateDeclaredPax` was added to `src/app/actions/booking.ts` (already in the plan's `read_first`).

**3. [Rule 3 — blocking] `paxSurcharge` extracted into `pricing.ts` (not in `files_modified`)**
- The breakdown line needs `extraHeads` / `extraHeadCents` / the product, server-side, on a page that has no `Quote` in hand. Restating `max(0, pax − included) × fee` in the RSC would put the D-108 money formula in two places. Extracting the helper keeps one definition; `quoteWindow` delegates to it and is behaviourally unchanged.

**4. [Plan defect] Task 1's `grep -ci "occupancy" wizard.tsx == 0` criterion is unsatisfiable**
- The wizard has shipped a `maxOccupancy` field since Phase 2 (7 matches, all pre-existing). The criterion's intent — no occupancy-*mode* toggle — was verified with `grep -ci "occupancyMode\|occupancy_mode\|occupancy mode"` → **0**.

**5. [Rule 1 — bug class] Grep gates rewritten so comments cannot trip them**
- Both `fullDay` fixes were first written with comments that spelled the removed derivation's identifiers verbatim, which would have satisfied the plan's `grep -c "hourlyTotal\|hourlyRate.*hours" == 0` gate with a false positive. Following the repo's own tripwire discipline (`price-breakdown.tsx`, 07-04), neither identifier now appears in either file — prose included. Both greps return **0** honestly.

**6. [Rule 3 — blocking] `useOptimistic` instead of a `useEffect` prop-sync in `PaxStepper`**
- The first draft synced the persisted prop into local state in an effect; eslint's `react-hooks/set-state-in-effect` rejects that (the same rule 07-era work fixed in `address-autocomplete.tsx`). `useOptimistic` is a better fit anyway: it reverts to the persisted value by itself when the transition settles, so a refused re-price cannot leave an unpersisted headcount on screen.

**7. [judgement] The pre-0016 `fullDay` fallback is a positive day-rate match, not `?? false`**
- Dropping the derivation outright would relabel legacy NULL-`full_day` full-day bookings as an hour range. The fallback mirrors `re-request.ts:234`: it can only ever ADD "Full day" on an exact day-rate match, so nothing hourly — surcharged or not — can be mislabeled by it, and it names neither forbidden identifier.

## Issues Encountered

None blocking. One eslint rejection (item 6) and one unsatisfiable grep criterion (item 4), both resolved above.

## User Setup Required

None. Hosts opt in per listing by setting an extra-guest fee in the wizard's pricing step; every existing listing keeps flat pricing with no action.

## Next Phase Readiness

- **08-07 (group management) is unblocked:** `booking.declared_pax` is now populated by a real UI, which is the input the D-114 top-up nudge compares yes-RSVPs against. Note it is **NULL on every flat listing** — the nudge's `extraHeadFee > 0` guard must come first, or it will compare against null.
- **08-09 (UAT) step 6** is now exercisable end-to-end: set an extra-guest fee on a listing, book it, step the headcount, and watch the breakdown re-quote.
- **Two items in `deferred-items.md`** (stale checkout session after a re-price; request-mode bookings entering at `declaredPax = 1`). Neither blocks the phase.

---
*Phase: 08-group-bookings*
*Completed: 2026-07-27*

## Self-Check: PASSED
- Files verified on disk: `src/components/booking/pax-stepper.tsx`, `tests/booking/pax-reprice.test.ts`, `src/app/(host)/host/listings/[id]/edit/wizard.tsx`
- Commits verified in git log: `19fe5b5` (feat), `59e3eb0` (feat)
