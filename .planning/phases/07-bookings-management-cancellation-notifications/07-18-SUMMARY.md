---
phase: 07-bookings-management-cancellation-notifications
plan: 18
subsystem: ui
tags: [gap-closure, bookings-management, next-link, status-derivation, cancellation, jsdom]

# Dependency graph
requires:
  - phase: 07-bookings-management-cancellation-notifications
    provides: "shared booking-status derivation + BookingStatusBadge (07-02), bookings read model + list pages (07-06), host booking detail page (07-11), cancelUnpaidHold cancelled_by discriminant (07-09/07-11), jsdom component-test pattern (07-14)"
provides:
  - "T6 closed: BOTH /host/bookings render surfaces link to /host/bookings/[id] — the DEFAULT desktop table Space-cell link AND the mobile card overlay anchor — so the host cancel flow (ROADMAP SC#3) is reachable without hand-typing a booking UUID; Approve/Decline stay clickable above the overlay"
  - "T8 closed: cancelled_by-aware status derivation — a booker who cancelled their own unpaid `requested` hold (stored `declined` + cancelled_by='booker') reads Cancelled on both lists and lands on truthful 'You cancelled this request' copy at /bookings/[id]; a genuine host decline (cancelled_by NULL/'host'/'system') keeps Declined + 'the host couldn't take your booking'"
  - "declinedCopy(cancelledBy): pure, parameter-free heading+body selector — the single booker-vs-host selection point for the declined landing"
affects: [phase-7-uat, phase-7-verification, bookings-management, cancellation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional trailing cancelledBy?: string|null on deriveDisplayStatus/deriveBookingStatusView keeps every existing 3-arg call site compiling and green; only a booker-cancelled `declined` row is ever remapped"
    - "Copy-selection lives in one pure exported function (declinedCopy) that IS the booker-vs-host branch — callers never re-implement the conditional inline; strings are parameter-free so venue/time renders as a sibling line (the two-line `cancelled`-branch layout)"
    - "Whole-card navigation via an overlay pseudo-element (after:absolute after:inset-0) on a next/link, with inline actions lifted relative z-10 above it — mirrored from the booker row onto the host row"

key-files:
  created:
    - tests/booking/host-booking-row.test.tsx
  modified:
    - src/components/booking/booking-status.ts
    - src/components/booking/booking-status-badge.tsx
    - src/lib/booking/bookings-query.ts
    - src/components/booking/booking-row.tsx
    - src/components/host/host-booking-row.tsx
    - src/app/(app)/bookings/page.tsx
    - src/app/(host)/host/bookings/page.tsx
    - src/app/(app)/bookings/[id]/page.tsx
    - tests/booking/booking-status.test.ts

key-decisions:
  - "cancelledBy param is OPTIONAL (defaults undefined) — the existing 'no other past status is rewritten' test and every current call site stay green; the remap fires ONLY on declined+booker, before the confirmed→completed rule"
  - "deriveBookingStatusView keeps its exhaustive switch with NO default clause — cancelledBy is forwarded into deriveDisplayStatus so display lands on `cancelled`; the add-a-status compile-gate (T-07-18-03) is intact"
  - "declinedCopy is parameter-free by design: the host-decline layout changes from an inline-interpolated sentence to a structurally-equivalent two-line layout (badge/heading/body + a sibling {title}·{whenLabel}) — intended, not held to byte-identical"
  - "T6 fixes BOTH surfaces: the desktop <Table> is the DEFAULT viewport where the tester hit it (load-bearing half) AND the mobile card; the booker page's Space-cell link is mirrored verbatim on the host page"

patterns-established:
  - "cancelled_by is selected as b.cancelled_by::text in both booker+host projections and threaded page → row → BookingStatusBadge (desktop table badges included); the owner-scope WHERE, tab partition, keyset paging and payout kind-scope are byte-unchanged (grep-diffed) — the projection only widened"

requirements-completed: [HOST-02, MANAGE-01, MANAGE-02]

# Metrics
duration: 12min
completed: 2026-07-24
---

# Phase 7 Plan 18: Bookings-Management UAT Gap Closure (T6 + T8) Summary

**The host bookings list now links to the detail page on both desktop and mobile (SC#3 reachable), and a booker-cancelled request tells the truth — Cancelled on the lists, "You cancelled this request" on the landing — instead of wearing the host-decline copy.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-24T03:42Z
- **Completed:** 2026-07-24T03:54Z
- **Tasks:** 3
- **Files modified:** 8 source + 2 test (1 created)

## Accomplishments

- **T8 root fix** — `deriveDisplayStatus`/`deriveBookingStatusView` gained an optional `cancelledBy`; `declined + cancelled_by='booker'` remaps to `cancelled` (a booker cancellation is not a host decline), while NULL/`host`/`system` keep `declined`. Added pure, parameter-free `declinedCopy(cancelledBy)` with truthful booker-vs-host variants.
- **T8 threading** — `cancelled_by` is now selected in both booker and host projections and threaded page → row → badge (desktop tables included), so a booker-cancelled request reads **Cancelled** everywhere.
- **T6** — BOTH `/host/bookings` surfaces link to `/host/bookings/[id]`: the default desktop `<Table>` Space cell (mirroring the booker page) and the mobile card (overlay anchor). `RequestActions` is lifted `relative z-10` so Approve/Decline stay clickable on a `requested` row.
- **T8 landing** — the `/bookings/[id]` declined branch drives its heading/body from a single `declinedCopy(bk.cancelledBy)` call and renders the badge with `cancelledBy` threaded, so a booker-cancel never shows "the host couldn't take your booking".

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): cancelled_by-aware derivation + declinedCopy tests** - `0b75cba` (test)
2. **Task 1 (GREEN): cancelled_by-aware derivation + declinedCopy** - `ef222e4` (feat)
3. **Task 2: thread cancelled_by through read model + rows + pages, link the host row (T6/T8)** - `119c976` (feat)
4. **Task 3: truthful booker-cancel landing on /bookings/[id] (T8)** - `d8d6f16` (feat)

_Task 1 is a TDD task (test → feat, two commits)._

## Files Created/Modified

- `src/components/booking/booking-status.ts` - optional `cancelledBy` on both derivations (booker-cancel remap); new `declinedCopy()`
- `src/components/booking/booking-status-badge.tsx` - optional `cancelledBy` prop forwarded to both derivations so recipe + label agree
- `src/lib/booking/bookings-query.ts` - `cancelledBy: string | null` on `BookingListRow`; `b.cancelled_by::text` selected in both queries (scopes byte-unchanged)
- `src/components/booking/booking-row.tsx` - `cancelledBy` on row data, threaded to the badge
- `src/components/host/host-booking-row.tsx` - `cancelledBy` threaded; mobile card overlay `next/link` to the detail page; `RequestActions` wrapped `relative z-10`
- `src/app/(app)/bookings/page.tsx` - map `cancelledBy`; desktop-table badge threaded
- `src/app/(host)/host/bookings/page.tsx` - map `cancelledBy`; desktop-table badge threaded; desktop Space-cell `next/link` (the load-bearing half of T6)
- `src/app/(app)/bookings/[id]/page.tsx` - declined branch driven by `declinedCopy(bk.cancelledBy)` + `BookingStatusBadge` with `cancelledBy`; dropped now-unused `XCircleIcon`
- `tests/booking/booking-status.test.ts` - 10 new cases pinning the remap, the badge view, and both `declinedCopy` variants
- `tests/booking/host-booking-row.test.tsx` - **created**, jsdom render proof (card link, Approve/Decline survive, Cancelled vs Declined)

## Decisions Made

- Kept `cancelledBy` optional so no existing call site or test changed behavior; the remap is confined to `declined + 'booker'` and runs before the `confirmed→completed` rule.
- No `default:` clause added to the status switch — the "adding a booking_status is a compile error" gate is load-bearing (T-07-18-03) and stays intact.
- `declinedCopy` is the sole booker-vs-host selection point; the host-decline layout moves to the structurally-equivalent two-line layout (copy no longer interpolates venue/time) — intended per the plan, not held to byte-identical.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The `host-booking-row.test.tsx` jsdom render pulls in `RequestActions`, whose only server coupling is the `"use server"` `host-requests` actions module (which imports the DB + `next/headers`). Handled exactly as the plan's test note anticipated — stubbed `@/app/actions/host-requests` and `sonner` (alongside the `next/link` stub), keeping the render pure without touching the controls under test.

## Verification

- `npx vitest run tests/booking/booking-status.test.ts tests/booking/host-booking-row.test.tsx` — green (26 + 4).
- Full suite: `PLATFORM_WALLET_NUMBER=x PLATFORM_WALLET_NAME=x INNGEST_SIGNING_KEY=x npx vitest run` — **79 files / 669 tests, exit 0** (was 78/655; this plan adds 1 file / 14 tests).
- `npx tsc --noEmit` clean; `npx eslint` clean on all touched files.
- `PLATFORM_WALLET_NUMBER=x PLATFORM_WALLET_NAME=x INNGEST_SIGNING_KEY=x npm run build` — exit 0.
- Owner-scope predicates / tab partition / keyset paging / payout kind-scope in `bookings-query.ts` — grep-diffed byte-unchanged (only the projection widened + a type field/comment added).

## Known Stubs

None — all data is wired end-to-end (`cancelled_by` flows from the DB projection through to the badge and the detail-page copy).

## Next Phase Readiness

- The two MAJOR bookings-management UAT gaps (T6, T8) are closed and ready for UAT re-verification (retest tests 6 & 8).
- Still outstanding for Phase 7 (unchanged by this plan): sibling gap plans 07-19 (T4-rung / T11) and 07-20 (T4-hours / T7 / T9); then `/gsd-secure-phase 7` (security_enforcement ON, not yet run).

## Self-Check: PASSED

- All 10 files verified present on disk (8 modified + 1 test modified + 1 test created).
- All 4 task commits verified in git history: `0b75cba`, `ef222e4`, `119c976`, `d8d6f16`.

---
*Phase: 07-bookings-management-cancellation-notifications*
*Completed: 2026-07-24*
