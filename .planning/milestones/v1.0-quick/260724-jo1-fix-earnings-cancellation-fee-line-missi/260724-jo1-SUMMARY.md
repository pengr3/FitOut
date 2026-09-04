---
quick_id: 260724-jo1
slug: fix-earnings-cancellation-fee-line-missi
type: quick
gap_closure: true
source: .planning/phases/07-bookings-management-cancellation-notifications/07-HUMAN-UAT.md (Gap G1)
subsystem: ui
tags: [react, jsx, swc, next, host-earnings, whitespace-regression, jsdom, testing-library]

key-files:
  created:
    - src/components/host/cancellation-fee-notice.tsx
    - tests/host/cancellation-fee-notice.test.tsx
  modified:
    - src/app/(host)/host/earnings/page.tsx

key-decisions:
  - "Fix the SWC JSX-whitespace strip with an explicit {\" \"} expression container (its own node, unstrippable) rather than {/* prettier-ignore */} or a &nbsp;."
  - "Extract the inline <p> into a pure CancellationFeeNotice component so the seam is renderable in jsdom — the defect only exists in the compiled render, so the regression MUST render, not string-test formatMoney."

duration: 18min
completed: 2026-07-24
---

# Quick 260724-jo1: Fix earnings cancellation-fee line missing space Summary

**The `/host/earnings` unrecovered-cancellation-fee line now renders `₱300.00 in cancellation fees` with the space intact — fixed by an explicit `{" "}` in an extracted `CancellationFeeNotice` component, pinned by a mutation-verified jsdom render regression.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-07-24T14:09Z (approx)
- **Completed:** 2026-07-24T14:18Z (approx)
- **Tasks:** 2 of 2
- **Files created:** 2, **modified:** 1

## Accomplishments

- Closed Phase-7 UAT gap G1: the host-earnings debt line read `You have ₱300.00in cancellation fees…` (no space). SWC's JSX whitespace transform strips the leading space of the JSXText that follows a `{…}` expression container, so the space existed in source and vanished in the compiled render (`₱300.00<!-- -->in cancellation fees`).
- Extracted the notice into a pure, directive-free `CancellationFeeNotice({ cents, currency })` presentational component with an explicit `{" "}` between the money expression and "in" — its own expression container, which the transform cannot strip.
- Wired the earnings RSC to render the component (query, `outstandingDebitCents > 0` guard, and copy all unchanged).
- Added a rendered-output regression (jsdom) that pins the visible space and guards against the collapsed `300.00in` form — mutation-verified non-vacuous.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract cancellation-fee notice + make the space non-strippable** — `edc10e5` (fix)
2. **Task 2: Rendered-output regression test (jsdom)** — `b6533bc` (test)

## Files Created/Modified

- `src/components/host/cancellation-fee-notice.tsx` (created) — pure `CancellationFeeNotice` component; renders the exact existing `<p className="mt-3 max-w-prose text-sm text-muted-foreground">` copy with an explicit `{" "}` between `{formatMoney(cents, currency)}` and "in".
- `src/app/(host)/host/earnings/page.tsx` (modified) — imported the component and replaced the inline `<p>…</p>` inside the `outstandingDebitCents > 0` guard with `<CancellationFeeNotice cents={outstandingDebitCents} currency={summaryCurrency} />`. `formatMoney` import retained (still used by the payout table rows).
- `tests/host/cancellation-fee-notice.test.tsx` (created) — 3-case jsdom render regression.

## Verification

- `grep -n '{" "}in cancellation fees' src/components/host/cancellation-fee-notice.tsx` → line 28 present.
- `npx tsc --noEmit` → clean (exit 0).
- `npx eslint src/components/host/cancellation-fee-notice.tsx "src/app/(host)/host/earnings/page.tsx"` → clean; `npx eslint tests/host/cancellation-fee-notice.test.tsx` → clean.
- `npx vitest run tests/host/cancellation-fee-notice.test.tsx` → 3 passed.
- Full suite `npx vitest run` → **83 files / 693 tests, exit 0** (was 82 files before this test file was added).

## Mutation Check (required for this rendered-output regression)

Temporarily removed the `{" "}` from `cancellation-fee-notice.tsx` (`{formatMoney(cents, currency)}in cancellation fees…`) and re-ran the test:

- **Result: all 3 assertions turned RED.** Received text was `You have ₱300.00in cancellation fees still to be deducted. We'll take this off your next payout.` — reproducing the reported UAT defect exactly (amount correct, seam collapsed). This confirms a pure `formatMoney` test would be blind to the bug (the amount "₱300.00" is always correct); only rendering the compiled seam catches it.
- **Restored** the `{" "}`; `git diff` on the component vs `HEAD` is empty and the full suite is green again.

## Decisions Made

- Used an explicit `{" "}` expression container rather than `{/* prettier-ignore */}` or `&nbsp;`. Prettier-ignore only preserves source formatting; it does not stop SWC's transform from collapsing the JSXText seam. `{" "}` is a separate node the transform cannot touch, and it renders a normal (breakable) space, matching the original intent. The stale `{/* prettier-ignore */}` comment was removed with the inline copy.
- Kept the fix scoped to presentation: no change to the debt query, the `outstandingDebitCents > 0` guard, or any copy wording.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. (Cosmetic-only Git line-ending warnings on write, LF→CRLF, are expected on Windows and do not affect content.)

## Known Stubs

None — the component is wired to the real `outstandingDebitCents` query value; no placeholder/mock data introduced.

## Next Steps (orchestrator / human)

- Optional visual re-verification at `/host/earnings` (dev server is running; the DB has a UAT fixture: an outstanding `host_cancel_fee` debit of ₱300.00 for `host@fitout.test`). The line should now read `You have ₱300.00 in cancellation fees still to be deducted. We'll take this off your next payout.`
- Orchestrator owns the docs commit (SUMMARY.md, STATE.md) and any 07-HUMAN-UAT G1 status update.

## Self-Check: PASSED

- `src/components/host/cancellation-fee-notice.tsx` — FOUND
- `tests/host/cancellation-fee-notice.test.tsx` — FOUND
- Commit `edc10e5` (Task 1, fix) — FOUND
- Commit `b6533bc` (Task 2, test) — FOUND

---
*Quick task: 260724-jo1*
*Completed: 2026-07-24*
