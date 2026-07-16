---
phase: 05-payments-payouts
plan: 06
subsystem: host-earnings
tags: [HOST-03, payouts, earnings, owner-scope, rsc, shadcn-table, commission-visibility]

# Dependency graph
requires:
  - phase: 05-payments-payouts
    plan: 01
    provides: "host_payout_ledger table (state/gross/commission/net, host_id) + payout_ledger_state enum + PAYOUT_DELAY_HOURS + computeCommission"
  - phase: 02-listings-host-onboarding
    provides: "(host) route-group layout canHost gate + hostPayout + PayoutBanner/derivePayoutStatus onboarding nudge"
  - phase: 04-booking-core-search-no-payment
    provides: "formatMoney/DISPLAY_CURRENCY, venue-tz TZDate/format idiom (confirmation page), owner-gate pattern"
provides:
  - "derivePayoutLedgerView(state) — pure calm-state view (label/tone/helper/datePrefix) for Held/Processing/Paid/Refunded/Failed"
  - "summarizePayouts(rows) — pure Upcoming(Held+Processing net) / Paid out(Paid net) summing helper"
  - "PayoutStateBadge / PayoutRow / PayoutSummary — HOST-03 presentational composites"
  - "/host/earnings — owner-gated RSC reading host_payout_ledger (Security V4), host-visible gross→−10%→net"
  - "shadcn table primitive (src/components/ui/table.tsx)"
affects: [HOST-03, host-dashboard-nav, host-layout-nav]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure (non-client) state-derivation module the RSC can call directly (mirrors payout-status.ts)"
    - "Owner-scoped ledger read WHERE host_id = session.user.id (route group is NOT the gate — Security V4/T-05-29)"
    - "Server-frozen money rendered via formatMoney; components do ZERO price arithmetic (D-49/D-51)"
    - "Shared pure summing helper (summarizePayouts) used by both the page and its test so totals can't drift"
    - "Responsive table/card split: desktop shadcn table (th scope) hidden on mobile; PayoutRow cards md:hidden"

key-files:
  created:
    - src/components/ui/table.tsx
    - src/components/host/payout-ledger-status.ts
    - src/components/host/payout-state-badge.tsx
    - src/components/host/payout-row.tsx
    - src/components/host/payout-summary.tsx
    - src/app/(host)/host/earnings/page.tsx
    - tests/payments/earnings-view.test.ts
  modified:
    - src/app/(host)/host/page.tsx
    - src/app/(host)/host/layout.tsx

key-decisions:
  - "The earnings page reads host_payout_ledger (per the plan); ledger rows are written by the T+24h payout sweep (Plan 05a), so a confirmed-but-not-yet-swept booking has no row yet — surfacing those as pre-sweep 'Held' would require a confirm-time ledger write (a cross-plan concern, not this plan's scope)"
  - "Owner-scoping is WHERE host_id = session.user.id (the route group is defense-in-depth only)"
  - "The commission label is the fixed copy 'FitOut service fee (10%)' (05-UI-SPEC copy contract); the AMOUNT is the frozen commission_cents"

patterns-established:
  - "derivePayoutLedgerView tone→badge recipe: Held=secondary+Clock, Processing=outline+ArrowLeftRight, Paid=bg-success+CheckCircle2, Refunded=secondary-muted+Undo2, Failed=destructive Alert (not a badge)"
  - "Expected date = endsAt + PAYOUT_DELAY_HOURS venue-tz-safe; Paid rows use paidAt; Refunded rows use the flip time"

requirements-completed: [HOST-03]

# Metrics
duration: 7min
completed: 2026-07-16
---

# Phase 5 Plan 06: Host Earnings / Payouts (HOST-03) Summary

**An owner-gated `(host)` RSC at `/host/earnings` reading `host_payout_ledger` — per-booking rows with a calm Held/Processing/Paid/Refunded state badge, the host-visible `gross → −10% commission → net` breakdown, and the venue-tz-safe expected/paid date, plus Upcoming-vs-Paid summary totals — reachable via neutral Earnings nav links; a host can only ever see their own payout rows.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-07-16T13:25:50Z
- **Completed:** 2026-07-16T13:33:23Z
- **Tasks:** 3
- **Files:** 9 (7 created, 2 modified)

## Accomplishments

- **Pure state derivation + summing** (`payout-ledger-status.ts`, NON-client so the RSC calls it directly): `derivePayoutLedgerView` maps each payout state to a calm view (label/tone/helper/datePrefix); `summarizePayouts` sums Upcoming (Held+Processing net) and Paid out (Paid net). Refunded/Failed contribute to neither total.
- **Icon+text badge** (`payout-state-badge.tsx`): Paid = `bg-success` + `CheckCircle2` (the one success signal), Held = secondary + Clock, Processing = outline + ArrowLeftRight, Refunded = muted secondary + Undo2, Failed = the destructive `Alert` (icon + text, not a badge). Never colour-only, never red on a happy state.
- **Host-visible commission** (`payout-row.tsx`): the mobile card renders `Booking {₱gross}` / `FitOut service fee (10%) −{₱commission}` / `Your payout {₱net}` (net weight 600, tabular-nums) — the host DOES see the fee (D-59), unlike the booker (D-50). Refunded → net muted/struck + the "no payout" helper.
- **Summary figures** (`payout-summary.tsx`): two neutral Display-typography totals (`Upcoming payouts` / `Paid out`), tabular-nums, no coral.
- **Owner-gated earnings RSC** (`earnings/page.tsx`): re-checks session + `canHost` (defense in depth) and owner-scopes the ledger read `WHERE host_id = session.user.id` joined to booking/listing (Security V4 / T-05-29). Server-summed totals; venue-tz-safe expected/paid dates (endsAt + `PAYOUT_DELAY_HOURS`, paidAt for Paid); desktop shadcn `table` with real `<th scope="col">` headers + mobile `PayoutRow` cards; `PayoutBanner` nudge when not onboarded; `No earnings yet` empty state; a 10%-fee explainer footnote; NO coral CTA. All money server-frozen — the page does zero arithmetic.
- **Neutral Earnings nav**: an `outline` Earnings link in the host dashboard action row + an Earnings link in the `(host)` header (both neutral, not coral).
- **Proof** (`earnings-view.test.ts`, 10 tests): derivation mappings, summary summing (Upcoming=135000/Paid=180000 on a mixed set), owner-scoping (host A sees only A, host B only B, absent host sees nothing), and commission visibility (frozen gross/commission/net exposed).

## Task Commits

1. **Task 1: payout state derivation + badge + row + summary + shadcn table** — `ce13923` (feat)
2. **Task 2: owner-gated /host/earnings RSC + Earnings nav links** — `8ff110f` (feat)
3. **Task 3: earnings derivation + summary + owner-scope test** — `5d2f1df` (test)

## Key Implementation Notes (for downstream)

- **Earnings query shape** — `db.select({...}).from(hostPayoutLedger).innerJoin(booking, eq(hostPayoutLedger.bookingId, booking.id)).innerJoin(listing, eq(booking.listingId, listing.id)).where(eq(hostPayoutLedger.hostId, session.user.id)).orderBy(desc(hostPayoutLedger.createdAt))`. Selects the frozen gross/commission/net + state/paidAt/updatedAt + booking startsAt/endsAt + listing title/timezone.
- **Summary-summing helper** — `summarizePayouts(rows: {state, netCents}[])` in `payout-ledger-status.ts`; the RSC and the test both call it (single source of truth).
- **State→badge mapping** — keyed by STATE (not tone) because Held and Refunded share the neutral "muted" tone but need distinct icons (Clock vs Undo2).
- **Nav-link placements** — dashboard action row (`src/app/(host)/host/page.tsx`, next to "Your listings") + `(host)` header (`src/app/(host)/host/layout.tsx`, before Profile). Both `/host/earnings`, neutral.
- **Expected-date rule** — `endsAt + PAYOUT_DELAY_HOURS` (D-55) formatted venue-tz-safe via `format(instant, "MMM d", { in: tz(timezone) })`; Paid rows use `paidAt`, Refunded rows use the ledger flip time (`updatedAt`).

## Deviations from Plan

None — plan executed exactly as written. (One micro-fix during Task 3: the test's same-listing booking seeds were given distinct non-overlapping windows so they don't trip the `booking_no_overlap` GiST EXCLUDE — a test-harness detail, not a code change.)

## Known Behavior (not a stub)

The earnings page renders the `host_payout_ledger` rows that exist. Ledger rows are written by the **T+24h payout sweep** (Plan 05a) — so a booking that is confirmed/paid but whose session hasn't yet ended + 24h has **no ledger row yet** and therefore does not appear as "Held" until the sweep creates its row. This matches the plan's explicit "read the ledger" scope; surfacing pre-sweep confirmed bookings as "Held" would require writing the ledger row at confirm-time (a cross-plan Plan-01/05a concern), not a gap in this plan. The page correctly and calmly renders whatever ledger rows are owner-scoped to the host.

## Threat Register Coverage

- **T-05-29** (IDOR — a host viewing another host's rows): mitigated — ledger read owner-scoped `WHERE host_id = session.user.id`; test asserts A never sees B and an absent host sees nothing.
- **T-05-30** (unauth/non-host reaching the page): mitigated — RSC re-gates `!user`→/login, `!canHost`→/ (defense in depth beyond the layout).
- **T-05-31** (client-side money tampering): mitigated — all figures are the server-frozen ledger cents; components/page do ZERO arithmetic (only `formatMoney` display).
- **T-05-32** (leaking PayMongo internals to the host): mitigated — copy shows only gross/−10%/net + a calm state; no wallet/transfer/gateway-fee wording.

No new security surface introduced beyond the threat model — no Threat Flags.

## Verification

- `npx vitest run tests/payments/earnings-view.test.ts` — 10/10 green (derivation + summary + owner-gate + commission visibility).
- `npx vitest run tests/payments tests/paymongo` — 65/65 green (55 prior + 10 new; no regressions).
- `npx tsc --noEmit` — exit 0; `npx eslint` — clean on all 9 new/modified files.
- grep confirms: the ledger read is owner-scoped by `host_id = session.user.id`; `hostPayoutLedger`/`canHost`/`PayoutSummary`/`PayoutRow`/`No earnings yet`/`max-w-4xl` present in the page; no `bg-brand`; the Earnings link exists in both `host/page.tsx` and `host/layout.tsx`.

## Self-Check: PASSED

All created files present; all three task commits (ce13923, 8ff110f, 5d2f1df) exist in the git log.

---
*Phase: 05-payments-payouts*
*Completed: 2026-07-16*
