---
phase: 07-bookings-management-cancellation-notifications
plan: 19
subsystem: payments
tags: [cancellation, refund-ladder, notifications, idempotency, inngest, rsc, tdd]

# Dependency graph
requires:
  - phase: 07 (07-15)
    provides: "LADDER + rungBoundaries + policySummaryLine/policyDisclosureLines + CancellationPolicyDisclosure (disclosure==enforcement)"
  - phase: 07 (07-10)
    provides: "placeHold request-branch emitNotify pair + createPendingHold replayed:boolean"
  - phase: 07 (07-12)
    provides: "re-request.ts !res.replayed emission-suppression precedent"
provides:
  - "pure bestFutureRungIndex(tier, startsAt, now): first rung boundary strictly in the future, -1 when all lapsed"
  - "policySummaryLine concrete-mode leads with the best still-future rung (truthful no-window fallback at -1)"
  - "placeHold request branch suppresses the notification pair on an idempotent replay"
affects: [group-bookings, cancellation, notifications, checkout-disclosure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Best-still-future-rung: display summary derives from the SAME rungBoundaries/LADDER quoteRefund reads (no second source of truth), computed server-side in the RSC and forwarded as a number (component does no date math)"
    - "Replay-guarded emission: !res.replayed wraps label composition + emitNotify, revalidate/redirect stay outside (mirrors re-request.ts:299)"

key-files:
  created: []
  modified:
    - src/lib/payments/cancellation.ts
    - src/components/booking/cancellation-policy-disclosure.tsx
    - src/app/listings/[id]/book/page.tsx
    - src/app/actions/booking.ts
    - tests/payments/cancellation.test.ts
    - tests/booking/cancellation-policy.test.ts
    - tests/booking/notify-emission.test.ts

key-decisions:
  - "bestFutureRungIndex uses STRICT `>` (findIndex(boundary > now)): at the exact boundary instant the summary conservatively shows no window while the ENGINE still awards the inclusive rung — this feeds display copy only, never money"
  - "bestRungIndex is a CONCRETE-mode-only input; generic mode (listing page, no boundaryLabels) ignores it and stays byte-unchanged; an omitted index in concrete mode keeps the pre-fix top-rung lead so un-migrated callers cannot regress"

patterns-established:
  - "A checkout disclosure summary must name the best rung STILL OPEN for THIS booking, never a lapsed top rung"
  - "An idempotently-replayed request-mode placeHold notifies nobody; the first submit already told both sides"

requirements-completed: [PAY-06, BOOK-07, MANAGE-03]

# Metrics
duration: 14min
completed: 2026-07-24
---

# Phase 7 Plan 19: Cancellation-summary & placeHold-replay gap closure Summary

**The checkout cancellation summary now leads with the best refund rung whose boundary is still in the future (never a lapsed "Free cancellation until <past instant>"), and a double-submitted request-to-book notifies the host exactly once.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-24T04:02:58Z
- **Completed:** 2026-07-24T04:16:54Z
- **Tasks:** 2 (both TDD: RED → GREEN)
- **Files modified:** 7

## Accomplishments
- **T4-rung** — added pure `bestFutureRungIndex(tier, startsAt, now)` (the first rung boundary strictly in the future, `-1` once all lapse), derived from the SAME `rungBoundaries`/`LADDER` `quoteRefund` reads. `policySummaryLine` gained a concrete-mode `bestRungIndex` that names that rung (`Free cancellation until <date>` / `N% refund until <date>` / a truthful tier-named no-window line at `-1`). `book/page.tsx` computes it server-side from the page's existing `now` and passes it in. The expanded rung list and generic mode are byte-unchanged.
- **T11** — `placeHold`'s request branch now wraps the label composition + both `emitNotify` calls in `if (!res.replayed)`, mirroring `re-request.ts:299`. A replayed double-submit emits nothing; a genuine first request still emits the pair. The hold, `revalidatePath`, and `redirect` stay outside the guard, so a replay still lands the booker on their existing request.

## Task Commits

Each task was committed atomically (TDD: RED test → GREEN implementation):

1. **Task 1: policy summary leads with the best still-future rung (T4-rung)**
   - `b7acdba` (test — failing `bestFutureRungIndex` + concrete-summary cases)
   - `5592420` (feat — implementation)
2. **Task 2: suppress placeHold notification re-emit on idempotent replay (T11)**
   - `3907395` (test — failing replay-suppression case + placeHold harness)
   - `3d532c0` (feat — implementation)

**Plan metadata:** committed separately with this SUMMARY + STATE/ROADMAP/REQUIREMENTS.

## Files Created/Modified
- `src/lib/payments/cancellation.ts` — added pure `bestFutureRungIndex`; derives from `rungBoundaries` so there is no second source of truth for where the rungs sit.
- `src/components/booking/cancellation-policy-disclosure.tsx` — `policySummaryLine` gained an optional concrete-mode `bestRungIndex`; `CancellationPolicyDisclosure` forwards it (still performs no date math).
- `src/app/listings/[id]/book/page.tsx` — computes `bestRungIndex` server-side from the page's `now` and passes it to the disclosure.
- `src/app/actions/booking.ts` — request-branch emissions guarded by `!res.replayed`; the stale re-emit comment replaced with the re-request rationale.
- `tests/payments/cancellation.test.ts` — `bestFutureRungIndex` matrix (0 / 1 / -1, strict-future boundary, agreement with `rungBoundaries`).
- `tests/booking/cancellation-policy.test.ts` — concrete-summary cases (leads with best future rung, truthful `-1` fallback, generic/omitted-index unchanged).
- `tests/booking/notify-emission.test.ts` — new replay-suppression case (7); added a `placeHold` harness (next/navigation redirect capture, a canBook signed-up booker, a bookable host).

## Decisions Made
- **Strict `>` for the display boundary.** `bestFutureRungIndex` returns the first rung whose boundary is strictly ahead of `now`. Standing exactly on a boundary yields `-1` (summary shows no window) while `quoteRefund` still awards the inclusive rung — accepted because this is display-only and errs toward not over-promising; the enforceable refund recomputes against the Postgres clock at cancel time (unchanged).
- **`bestRungIndex` is concrete-mode-only.** Generic mode (listing page) ignores it and stays relative-to-session-start; an omitted index in concrete mode preserves the pre-fix top-rung lead, so no un-migrated caller regresses.

## Deviations from Plan

None - plan executed exactly as written.

The only work beyond the literal task text was standard test scaffolding: to exercise `placeHold` in `notify-emission.test.ts` the plan said to "follow the file's existing placeHold/emission harness", so the placeHold plumbing (a `next/navigation` redirect-capture mock, a signed-up canBook booker, and host bookability via `emailVerified` + an activated `hostPayout`) was cloned from `tests/booking/request-lifecycle.test.ts`. No source-behaviour change beyond the two tasks.

## Issues Encountered
None. Both RED tests failed for the intended reason (`bestFutureRungIndex is not a function`; the replay re-emitted a second pair), and both went GREEN on the prescribed implementation.

## User Setup Required
None - no external service configuration required.

## Verification
- `npx vitest run tests/payments/cancellation.test.ts tests/booking/cancellation-policy.test.ts tests/booking/notify-emission.test.ts` — green.
- Full suite: **79 files / 678 tests, exit 0** (`PLATFORM_WALLET_NUMBER=x PLATFORM_WALLET_NAME=x INNGEST_SIGNING_KEY=x npx vitest run`).
- `npx tsc --noEmit` clean; eslint clean on all seven touched files; env-prefixed `npm run build` exit 0.
- `policyDisclosureLines` output and generic-mode `policySummaryLine` are byte-unchanged (their existing cases 7/8/9/10/11 stay green).

## Next Phase Readiness
- Two of the six Phase-7 UAT gaps are closed (T4-rung + T11). Remaining gap plan: **07-20** (T7/T9 per the UAT handoff).
- No blockers introduced. Outstanding phase-7 debt is unchanged: security gate (`/gsd-secure-phase 7`) not yet run; Playwright e2e specs lint-clean but unexecuted; A3 + live receiving_institutions re-verification once PayMongo enables Money Movement.

---
*Phase: 07-bookings-management-cancellation-notifications*
*Completed: 2026-07-24*
