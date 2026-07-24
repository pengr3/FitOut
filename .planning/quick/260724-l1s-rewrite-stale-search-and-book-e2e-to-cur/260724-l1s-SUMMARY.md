---
quick_id: 260724-l1s
slug: rewrite-stale-search-and-book-e2e-to-cur
type: quick
gap_closure: true
source: Phase-7 debt — e2e specs executed for the first time; e2e/search-and-book.spec.ts is a stale Phase-4 (203b2e3) test that never ran and no longer matches the current booking flow.
subsystem: testing
tags: [playwright, e2e, booking, instant-hold, reserve-page, durable-confirmation, expiry-ux, paymongo-hosted-checkout]

key-files:
  created: []
  modified:
    - e2e/search-and-book.spec.ts

key-decisions:
  - "Seed the listing as `instant` (not `request`): both tests drive the INSTANT flow (Book → /book?hold=), and the current app only routes there for instant mode (request → /bookings/<id>). The host is already payouts-enabled, which is the instant-bookability gate."
  - "Stop the full-flow test at the LIVE reserve page. An instant `Confirm & pay` now opens a PayMongo HOSTED CHECKOUT that Playwright cannot drive, so clicking through to the confirmation is not automatable."
  - "Move the durable-confirmation coverage (D-43) onto a directly-seeded `confirmed` booking, mirroring e2e/cancel.spec.ts's seedConfirmedBooking — the same pattern the repo already uses to cover confirmed-state UX without PayMongo."
  - "Replace the stale `You won't be charged yet` assertion (never validated — the test never ran) with the current reserve-page copy: the `Confirm & pay` CTA + `You'll pay {total} now — cards, GCash, Maya, or QR Ph.` reassurance (D-57)."

duration: 20min
completed: 2026-07-24
---

# Quick 260724-l1s: Rewrite stale search-and-book e2e to the current booking flow Summary

**`e2e/search-and-book.spec.ts` (an unexecuted Phase-4 draft) now matches the current app and runs fully green — the live search → filter → card → listing → Book → instant hold on the reserve page is covered, durable confirmation (D-43) comes from a directly-seeded `confirmed` booking (mirroring `e2e/cancel.spec.ts`), and the abandoned-hold expiry UX (D-44) passes on the instant seed. Test-only; no `src/` changes.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-24
- **Tasks:** 4 of 4
- **Files created:** 0, **modified:** 1

## Accomplishments

- **Task 1 — instant seed.** Changed `seedListing()`'s `booking_mode` from `request` to `instant`, so the "Book this space" → `placeHold` POST mints a 15-min hold and redirects to `/book?hold=<id>` (per `booking.ts` `placeHold` docstring: instant → reserve/pay page, request → `/bookings/<id>`). The seed already provisions an activated `host_payout` wallet, which is the instant-bookability gate.
- **Task 2 — full-flow test trimmed to the live reserve page.** Kept the whole search → filter tennis → result card (img + name + ₱/hr) → distance line → listing → `pickWindow(5 PM, 6 PM)` → Book → `/book?hold=` journey and every reserve-page assertion (`Review and book`, `(GMT+8)`, `5:00 PM – 7:00 PM`, `Total`, a `₱` amount, `Held for`, the `role="timer"` countdown). Dropped the un-automatable tail (Confirm → PayMongo hosted checkout → `/bookings/` confirmation). Renamed the test to reflect the new scope.
- **Task 3 — durable-confirmation test (D-43) on a seeded confirmed booking.** Added `seedConfirmedBooking()` mirroring `e2e/cancel.spec.ts` (`status='confirmed'`, `booking_mode='instant'`, `cancellation_policy='standard'`, a `payment_id`, a `gcash` rail, a FUTURE window `now() + make_interval(hours => 10)` / `11` so it derives as `confirmed`, not `completed`, per D-102) on this spec's `listingId` + the signed-up booker. Resolved the booker's real DB id from their email after the UI signup (as cancel.spec does). The new test logs in, loads `/bookings/<seededId>`, asserts `Booking confirmed` heading + `Booking reference` + the `Confirmed` badge + a `FIT-[0-9A-Z]{8}` reference, then reloads and asserts the same reference persists.
- **Task 4 — abandoned-hold expiry (D-44).** Passes unchanged on the instant seed: place a hold on a disjoint 8–10 AM window, force `expires_at` into the past, reload, assert `Your hold expired` + `Back to availability` inside `role="status"` (matches `hold-expired-state.tsx`).

## Task Commit

Committed atomically as a single test commit (per the sequential-executor guidance — a single `test(...)` commit is allowed):

1. **All four tasks: rewrite the spec to the current flow** — `35243e1` (test)

## Files Modified

- `e2e/search-and-book.spec.ts` (modified) — instant seed; `seedConfirmedBooking()` helper + `bookerId` resolution + confirmed-seed call in `beforeAll`; listing-scoped notification cleanup added to `afterAll` (defensive); full-flow test trimmed + renamed; new durable-confirmation test; header comment rewritten to describe the current flow and why the PayMongo tail is un-automatable. **No files under `src/` were changed.**

## Verification

- `npx playwright test e2e/search-and-book.spec.ts --workers=1` → **3 passed (18.4s)** — all pass, none skipped.
- `npx eslint e2e/search-and-book.spec.ts` → clean (exit 0).
- `npx tsc --noEmit` → clean (exit 0).
- `git diff --name-only` → only `e2e/search-and-book.spec.ts`; no `src/` changes; no file deletions in the commit.
- `test-results/` artifacts (gitignored) removed; working tree contains only the intended spec change (plus the untracked docs folder the orchestrator owns).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected the stale `You won't be charged yet` reserve-page assertion**
- **Found during:** Task 2 (first run failed on this assertion at the reserve page — the assertion was never validated because the original spec never ran).
- **Issue:** The Phase-4 draft asserted `getByText(/You won.t be charged yet/i)` on the reserve page, but the current reserve page (`reserve-actions.tsx`) shows the opposite, honest pre-charge copy: a `Confirm & pay` CTA + `You'll pay {total} now — cards, GCash, Maya, or QR Ph.` (D-57). The stale copy does not exist anywhere on the page.
- **Fix:** Replaced it with two assertions on the real copy — the `Confirm & pay` button and the rails-qualified reassurance line `You.ll pay .* now.*cards, GCash, Maya, or QR ?Ph` (rails-qualified to avoid a strict-mode collision with the PriceBreakdown's `Includes our service fee. You'll pay this now.` line).
- **Files modified:** `e2e/search-and-book.spec.ts`
- **Commit:** `35243e1`

No architectural changes; no `src/` changes. The plan's Task 2 listed `You won't be charged yet` among the assertions to keep, but that copy is factually absent from the current app — keeping it would have left the test red.

## Authentication Gates

None.

## Known Stubs

None — the tests drive the real app against the dev Postgres; the only seeded data is a listing/host/booker and one `confirmed` booking (the same directly-seeded pattern `e2e/cancel.spec.ts` already relies on).

## Threat Flags

None — test-only change; no new endpoints, auth paths, file access, or schema at trust boundaries.

## Next Steps (orchestrator / human)

- Orchestrator owns the docs commit (SUMMARY.md, STATE.md).
- Phase-7 debt note in STATE.md ("Playwright e2e specs lint-clean but unexecuted") can be narrowed: `search-and-book` now executes green against a running dev server + Docker Postgres.

## Self-Check: PASSED

- `e2e/search-and-book.spec.ts` — FOUND (modified)
- Commit `35243e1` (test) — FOUND

---
*Quick task: 260724-l1s*
*Completed: 2026-07-24*
