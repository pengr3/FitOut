---
phase: 04-booking-core-search-no-payment
plan: 08
subsystem: booking
tags: [playwright, e2e, full-flow, human-verify, search, booking, expiry]

# Dependency graph
requires:
  - phase: 04-05
    provides: search home at / (SearchBar + searchListings result cards)
  - phase: 04-07
    provides: reserve page (/listings/[id]/book) + confirmation (/bookings/[id]) + Book-CTA wiring
  - phase: 04-06
    provides: placeHold/confirmBooking actions + reserve atoms (countdown/breakdown/expiry/confirm)
  - phase: 04-04
    provides: createPendingHold (hold + expiry) + frozen quote + FIT- reference
  - phase: 04-02
    provides: D-38 seed set (npm run db:seed) — 5 bookable Manila listings
provides:
  - e2e/search-and-book.spec.ts — the single Playwright spec proving the whole Phase-4 promise end-to-end against the real app + the abandoned-hold expiry UX
  - human-verified visual/interaction sign-off against 04-UI-SPEC.md (search home, reserve countdown/expiry, confirmation durability)
affects: [phase-5-payments, phase-6-full-integration, phase-8-group-bookings]

# Tech tracking
tech-stack:
  added: []  # reuses the existing Playwright harness (playwright.config.ts webServer + e2e/ conventions from 03-05)
  patterns:
    - "Full-flow E2E drives the REAL app against the dev DB (NODE_ENV=development so the Phase-2 paymongo.ts production boot-guard never fires; the search->book->confirm path touches no PayMongo route): search -> category filter -> result card -> listing -> venue-tz window -> Book -> reserve (frozen breakdown + live countdown) -> Confirm -> durable FIT- confirmation"
    - "Abandoned-hold expiry proven deterministically: force the hold row past expires_at (rather than a real 15-min sleep) -> reload -> calm 'Your hold expired' (role=status, never a red alert) + slot frees"
    - "Self-cleaning E2E: teardown leaves zero orphaned booking/hold rows"

key-files:
  created:
    - e2e/search-and-book.spec.ts
  modified: []

key-decisions:
  - "E2E runs against the dev server (not next build) — sidesteps the pre-existing Phase-2 PAYMONGO_SECRET_KEY production build-guard while still driving the real app"
  - "Expiry is forced via the hold row's expires_at rather than a 15-minute wall-clock wait — deterministic + fast, still exercises the real server-authoritative expiry path"

patterns-established:
  - "One end-to-end spec is the phase's living proof of the core value (search -> real availability -> reserve -> confirm) before any money is added in Phase 5"

requirements-completed: []  # SEARCH-01..05 (04-05) + BOOK-01/03 (04-07) + BOOK-02 (04-04) already Complete; this plan E2E-VALIDATES the full set end-to-end + gates on the human visual check

# Metrics
duration: ~18min
completed: 2026-07-15
---

# Phase 4 Plan 08: Full-flow E2E + expiry UX + human-verify Summary

**A single Playwright spec proves the whole Phase-4 promise end-to-end against the real app — search → filter → card → listing → Book → reserve (frozen ₱ breakdown + live countdown) → Confirm → durable FIT- confirmation, plus the abandoned-hold expiry UX — and a human signed off the visual/interaction contract against the UI-SPEC.**

## Performance

- **Duration:** ~18 min (Task 1); Task 2 = human-verify checkpoint (approved by the user)
- **Completed:** 2026-07-15
- **Tasks:** 2 (1 autonomous E2E + 1 human-verify checkpoint)
- **Files created:** 1

## Accomplishments

- **`e2e/search-and-book.spec.ts`** (`203b2e3`) — the full-flow E2E, 2 tests, passing stably across repeated runs:
  1. **Happy path:** search → apply a category filter → click a result card → open the listing → select a venue-tz hourly window → **Book this space** → reserve page asserting the venue-tz window with `(GMT+8)`, the ₱ **frozen `PriceBreakdown`** total, a live `Held for mm:ss` countdown, and "You won't be charged yet." → **Confirm booking** → durable `Booking confirmed` + `FIT-XXXXXXXX` reference that **persists across a reload**.
  2. **Abandoned-hold expiry:** the pending hold is forced past `expires_at`, then a reload renders the calm `Your hold expired` (role=status, not a red alert) + `Back to availability`, and the slot frees.
  - Drives the real app against the dev DB; teardown leaves **zero orphaned rows**.
- **Human-verify checkpoint (Task 2) — APPROVED.** The user visually confirmed against `04-UI-SPEC.md`: the search home (bar + bookable ₱ cards, filter narrowing, zero-result escape hatches, Load-more/sort gating), the reserve page (venue-tz `(GMT+8)` window + frozen breakdown + ticking countdown + "You won't be charged yet."), the calm (never-red) expiry state, and confirmation durability across refresh + owner-gating (a non-owner/signed-out visit to `/bookings/[id]` → 404). Prices ₱ (PHP), every time names the venue tz, one coral CTA per screen.

## Task Commits

1. **Task 1: Full-flow search→book→confirm E2E + abandoned-hold expiry UX** — `203b2e3` (test)
2. **Task 2: Human-verify visual/interaction checkpoint** — approved by the user (no code); this metadata commit records the sign-off.

**Plan metadata:** _(this commit)_ (docs: complete plan)

## Files Created/Modified

- `e2e/search-and-book.spec.ts` — the single full-flow Playwright spec (happy path + expiry), reusing the existing `playwright.config.ts` webServer + `e2e/` auth/seed conventions.

## Decisions Made

- **Dev-server E2E (not `next build`)** — the Phase-2 `paymongo.ts` production boot-guard only throws under `NODE_ENV=production`, and the search→book→confirm flow touches no PayMongo route, so a dev-server run needs no `PAYMONGO_SECRET_KEY` and still drives the real app.
- **Deterministic expiry** — force the hold's `expires_at` into the past rather than a 15-minute wall-clock wait; fast + reliable while still exercising the real server-authoritative expiry path.

## Deviations from Plan

None — Task 1 delivered the full-flow + expiry spec as specified; Task 2 (human-verify) executed as the plan's `checkpoint:human-verify` gate and was approved.

## Issues Encountered

None. (The pre-existing, out-of-scope `npm run build`/`npm run lint` failures were avoided by running the E2E against the dev server; both remain tracked in deferred-items.md + a spawned task chip.)

## Verification

- `npx playwright test e2e/search-and-book.spec.ts` → 2 passed, stable across repeated runs (verified by the executor).
- Human visual sign-off against `04-UI-SPEC.md` — **approved**.
- Full unit/integration suite remained green through the phase (`npx vitest run` → 283/283 at Wave 4).

## Known Stubs

None. The spec drives real seeded data end-to-end; no mocked/placeholder surfaces in the flow.

## Threat Flags

None — the E2E is a test artifact. It exercises (and thereby regression-guards) the phase's security controls: the owner-gated reserve read, the owner-gated confirmation (404 for a non-owner), and the server-authoritative expiry.

## Next Phase Readiness

- **Phase 4 is functionally complete and end-to-end proven** — the core value (search → real availability → reserve a slot → confirm, with the DB exclusion constraint as the sole double-booking authority) works before any money is introduced.
- **Phase 5 (Payments & Payouts)** slots the charge into `confirmBooking`'s `pending→confirmed` seam (D-40) and fills `PriceBreakdown`'s reserved fee/commission rows; the E2E gives Phase 5 a regression harness for the booking flow it will wrap.

## Self-Check: PASSED

`e2e/search-and-book.spec.ts` exists on disk; commit `203b2e3` exists in git history; the human-verify checkpoint was approved by the user.

---
*Phase: 04-booking-core-search-no-payment*
*Completed: 2026-07-15*
