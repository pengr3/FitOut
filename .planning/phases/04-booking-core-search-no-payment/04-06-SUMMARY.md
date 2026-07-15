---
phase: 04-booking-core-search-no-payment
plan: 06
subsystem: booking
tags: [next-server-actions, drizzle, postgres, react, booking-state-machine, idempotency, tstzrange, better-auth]

# Dependency graph
requires:
  - phase: 04-04
    provides: createPendingHold (WR-03 hold tx) + mapBookingError + quoteWindow (frozen PHP quote) + HOLD_TTL_MINUTES
  - phase: 04-02
    provides: bookingCreateSchema (shape-only, re-validated) + promoted DISPLAY_CURRENCY ("php")
  - phase: 04-01
    provides: booking.expiresAt/quotedTotalCents/currency/idempotencyKey + booking_idem_uq + lazy-expiry read model
  - phase: 03
    provides: booking_no_overlap GiST EXCLUDE (sole double-booking authority) + read model
  - phase: 02
    provides: deriveBookable sell-gate + hostPayout.payoutsEnabled
  - phase: 01
    provides: Better Auth session + canBook capability (input:false) + blocks.ts server-action skeleton
provides:
  - placeHold + confirmBooking server actions (the BOOK-01/02/03 mutation layer)
  - PriceBreakdown (fee-extensible frozen-quote breakdown), HoldCountdown (role=timer 15-min), HoldExpiredState (calm expiry), ReserveActions (disable-on-click Confirm)
  - state-machine integration test proving pending→confirmed, expiry re-check, owner-gate, idempotent re-confirm
affects: [04-07, 04-08, phase-5-payments, phase-7-bookings-management]

# Tech tracking
tech-stack:
  added: []  # no new runtime deps (all shadcn/lucide primitives already installed)
  patterns:
    - "Booking capability-gate server action: session → canBook (DB re-read) → server deriveBookable re-derivation (NOT host-ownership, NOT the route group) → Zod re-validate → createPendingHold → redirect"
    - "Atomic expiry-guarded confirm: one UPDATE ... WHERE status='pending' AND expires_at > now() RETURNING id (no TOCTOU; the server is the sole expiry authority)"
    - "Idempotent confirmed→confirmed short-circuit BEFORE the expiry check (D-42 — a re-confirm of your own confirmed booking is a no-op success, never a false expiry)"
    - "Server-action test harness: mock next/navigation redirect to throw a typed RedirectError so a test can assert the redirect (success) path"
    - "Client countdown flips the page via onExpire at 0 (display cue only); the interval is the ONLY setState site (avoids react-hooks/set-state-in-effect); ref synced in its own effect (avoids react-hooks/refs)"

key-files:
  created:
    - src/app/actions/booking.ts
    - src/components/booking/price-breakdown.tsx
    - src/components/booking/hold-countdown.tsx
    - src/components/booking/hold-expired-state.tsx
    - src/components/booking/reserve-actions.tsx
    - tests/booking/state-machine.test.ts
  modified: []

key-decisions:
  - "placeHold reads canBook from the DB (not the session) — server-authoritative, unambiguous typing across prod/test"
  - "confirmBooking uses a single atomic expiry-guarded UPDATE (not load→check→update) so there is no TOCTOU window between the re-check and the flip"
  - "Actions return a discriminated union with a `reason` tag (sign-in | activate-booking | not-bookable | invalid | taken; sign-in | denied | expired) so Plan 07 maps each to the exact UI-SPEC copy/state; success redirects (never returns ok:true)"
  - "BOOK-01/03 NOT marked complete here (action layer + reserve atoms only) — they complete at 04-07 which assembles the reserve/confirmation pages the redirects target; BOOK-02 already Complete (04-04)"

patterns-established:
  - "Capability + server bookability re-derivation is the booking-mutation gate (mirrors blocks.ts ownership gate, swaps in canBook + deriveBookable)"
  - "Expiry/occupancy/'just taken' states are calm and never red (--destructive appears only on the optional final-60s countdown numerals)"

requirements-completed: []  # BOOK-01/03 → 04-07 (user-facing assembly); BOOK-02 already Complete (04-04). See Decisions.

# Metrics
duration: 18min
completed: 2026-07-15
---

# Phase 4 Plan 06: Booking mutations + reserve-page atoms Summary

**placeHold/confirmBooking server actions (canBook + server deriveBookable gate, atomic expiry-guarded confirm, D-42 idempotent re-confirm) plus the four neutral, server-frozen reserve-page atoms — proven by a 7-case state-machine test.**

## Performance

- **Duration:** ~18 min
- **Completed:** 2026-07-15
- **Tasks:** 2
- **Files created:** 6

## Accomplishments

- **`placeHold`** — a POST server action (never a GET side-effect, Pitfall 2) that gates on a signed-in `canBook` user (D-41) AND a server re-derivation of `deriveBookable` (Security V4 — the reserve route group is never the gate), then mints the pending hold via `createPendingHold` and redirects to `/listings/[id]/book?hold=<id>`. A conflict maps to the calm "just taken" copy; a double-submit replays the same booking (delegated to `createPendingHold`).
- **`confirmBooking`** — owner-gates `booking.bookerId === session.userId` (IDOR), then flips `pending → confirmed` in ONE atomic `UPDATE ... WHERE status='pending' AND expires_at > now()` (the server is the sole expiry authority — never the client countdown, D-40). A re-confirm of the caller's OWN already-`confirmed` booking short-circuits to a `/bookings/[id]` redirect BEFORE the expiry check — an idempotent no-op success, never a false "expired" (D-42). A lapsed hold yields a graceful expiry result, never a silent confirm or a 500.
- **Four reserve-page atoms** honoring the UI-SPEC: `PriceBreakdown` (renders the server-frozen `quotedTotalCents`+`currency` as a fee-extensible list with a documented Phase-5 reserved fee slot — zero client price arithmetic), `HoldCountdown` (`role=timer` 15-min countdown from `expiresAt`, neutral by default with optional `--destructive` numerals only in the final 60s, flips the page via `onExpire` at 0), `HoldExpiredState` (calm `TimerOff` interstitial, coral recovery CTA — never red), and `ReserveActions` (`Confirm booking → Confirming…` disable-on-click double-submit no-op + "You won't be charged yet.").
- **State-machine test** drives the REAL actions through the `status-gate.test.ts` `vi.doMock` harness (mock `next/headers`/`@/lib/auth`/`@/lib/db`/`next/cache`/`next/navigation`): 7 cases green — happy `pending→confirmed`, expiry re-check refusal (not confirmed), owner-gate refusal, idempotent re-confirm, plus the `placeHold` sign-in / activate-booking / not-bookable gates.

## Task Commits

Each task was committed atomically:

1. **Task 1: placeHold + confirmBooking server actions + state-machine test** — `778249b` (feat)
2. **Task 2: Booking components — PriceBreakdown, HoldCountdown, HoldExpiredState, reserve-actions** — `6691df6` (feat)

**Plan metadata:** _(this commit)_ (docs: complete plan)

## Files Created/Modified

- `src/app/actions/booking.ts` — `placeHold` (canBook + deriveBookable gated POST → createPendingHold → redirect) + `confirmBooking` (owner-gated, atomic expiry-guarded pending→confirmed, D-42 idempotent short-circuit); exports `PlaceHoldResult`/`ConfirmResult` discriminated unions.
- `src/components/booking/price-breakdown.tsx` — server component; fee-extensible frozen-quote breakdown, Heading-600 tabular-nums Total, documented reserved Phase-5 fee slot.
- `src/components/booking/hold-countdown.tsx` — `"use client"`; `role=timer` 15-min countdown from `expiresAt`, neutral by default, optional final-60s destructive numerals, `onExpire` flip at 0.
- `src/components/booking/hold-expired-state.tsx` — calm expiry interstitial (`TimerOff` + coral "Back to availability" / neutral "Search other spaces"), assertive announce, never red.
- `src/components/booking/reserve-actions.tsx` — `"use client"`; disable-on-click `Confirm booking → Confirming…` wrapping `confirmBooking`, "You won't be charged yet.".
- `tests/booking/state-machine.test.ts` — 7-case integration test (real actions via redirect-capture harness).

## Decisions Made

- **canBook read from the DB, not the session** — server-authoritative and typing-unambiguous across the prod/test auth instances.
- **Atomic expiry-guarded confirm UPDATE** (not load→check→update) — eliminates the TOCTOU window; `expires_at > now()` uses the DB clock (the single expiry authority, Pitfall 7).
- **Discriminated-union results with a `reason` tag** — `placeHold` (`sign-in`/`activate-booking`/`not-bookable`/`invalid`/`taken`) and `confirmBooking` (`sign-in`/`denied`/`expired`); success redirects. Lets Plan 07 map each to the precise UI-SPEC copy/state without re-deriving intent.
- **BOOK-01/03 not marked complete here** — 04-06 ships the action layer + reserve atoms; the user-facing reserve/confirmation pages and the Book-CTA wiring (the surfaces the redirects target) land in 04-07, which carries the same `requirements` frontmatter. This mirrors the deliberate cross-cutting deferral 04-04 used ("BOOK-01/03 stay Pending; user-facing at a later plan"). BOOK-02 is already Complete (04-04).

## Deviations from Plan

None — plan executed as written. The action wires `createPendingHold`/`deriveBookable`/`quoteWindow` exactly as specified, and all four components follow the UI-SPEC interaction/color contract.

## Issues Encountered

- **`react-hooks/refs` lint error in `hold-countdown.tsx`** (own new code): the initial draft assigned `onExpireRef.current = onExpire` during render, which the active `react-hooks/refs` rule forbids. Resolved by syncing the ref inside its own `useEffect` (`[onExpire]`) — not a Rule 1–4 deviation, just making the new file pass the required eslint gate. Re-lint clean.

## Verification

- `npx vitest run tests/booking/state-machine.test.ts` → 7 passed (pending→confirmed, expiry re-check, owner-gate, idempotent re-confirm, + placeHold sign-in/activate-booking/not-bookable gates).
- `npx vitest run tests/booking/` → 25 passed (no regression across pending-hold / hold-expiry / pricing / state-machine).
- `npx tsc --noEmit` → exit 0 (project-wide).
- `npx eslint` on all 6 new files → exit 0.
- Grep: `placeHold` uses `createPendingHold` + `deriveBookable` + `redirect`; `confirmBooking` re-checks `expires_at > now()` / `status='pending'` and short-circuits an already-confirmed booking to a redirect; `HoldCountdown` `role="timer"`; `reserve-actions` `disabled={pending}` + `Confirming…`.

**Pre-existing / out-of-scope (NOT this plan — already in deferred-items.md; my 6 files are tsc + eslint clean):** `npm run build` trips the Phase-2 `paymongo.ts` production guard when `PAYMONGO_SECRET_KEY` is unset; `npm run lint` (whole-repo) reports a pre-existing `react-hooks/set-state-in-effect` error in Phase-2 `src/components/listing/address-autocomplete.tsx:110`. Neither was touched.

## Known Stubs

None that block the plan's goal. The `PriceBreakdown` "reserved fee slot" renders nothing in Phase 4 by design (the D-46 Phase-5 seam for `Service fee` / `FitOut commission` rows) and is documented in the component. The four atoms receive real data (the frozen quote, `expiresAt`, `holdId`) once 04-07 assembles the reserve page — no hardcoded empty values flow to the UI.

## Threat Flags

None — no security surface beyond the plan's `<threat_model>`. The two actions re-check session, `canBook`, `deriveBookable`, ownership, and expiry server-side (T-04-BOOKCAP / T-04-COUNTDOWNBYPASS / T-04-HOLDIDOR); the hold is minted by a POST + redirect, never a GET side-effect (T-04-GETHOLD); no new packages (T-04-SC). No new endpoints, file access, or schema changes.

## Next Phase Readiness

- **Ready for 04-07 (wave 4):** assemble the reserve page (`/listings/[id]/book`) from `PriceBreakdown` + `HoldCountdown` + `ReserveActions` (owner-gated hold read), the confirmation page (`/bookings/[id]`, owner-gated, `FIT-XXXXXXXX` reference), and wire the listing "Book this space" CTA to `placeHold` (POST + return-to-checkout `callbackURL`, D-41). BOOK-01/03 complete there.
- **Phase 5 seam:** `confirmBooking`'s `pending→confirmed` flip is where the payment insert lands immediately before the transition (D-40); `PriceBreakdown`'s reserved fee slot holds the fee/commission rows.

## Self-Check: PASSED

All 6 created files exist on disk; both task commits (`778249b`, `6691df6`) exist in git history.

---
*Phase: 04-booking-core-search-no-payment*
*Completed: 2026-07-15*
