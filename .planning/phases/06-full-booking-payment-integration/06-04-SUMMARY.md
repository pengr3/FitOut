---
phase: 06-full-booking-payment-integration
plan: 04
subsystem: booking
tags: [request-to-book, placeHold-fork, pay-on-approval, bookingMode, confirmBooking, GREATEST, lifecycle-email]

# Dependency graph
requires:
  - phase: 06-full-booking-payment-integration
    plan: 01
    provides: "listing.bookingMode (D-62 instant default) + booking.bookingMode snapshot column + booking_status +requested/+approved + APPROVAL_SLA_HOURS config"
  - phase: 06-full-booking-payment-integration
    plan: 02
    provides: "createPendingHold parameterized by { holdStatus, ttlMs, bookingMode } — the request branch mints a `requested` hold WITHOUT forking the SAVEPOINT/40P01-retry/idempotency transaction"
  - phase: 06-full-booking-payment-integration
    plan: 03
    provides: "sendRequestReceived / sendNewRequestToHost lifecycle-email leaf providers (fire-and-forget contract, T-06-07)"
  - phase: 05
    provides: "confirmBooking Confirm & pay (D-57/D-58 extend-hold + hosted PayMongo checkout) + the /book reserve/pay page"
provides:
  - "placeHold forks on the SERVER-READ listing.bookingMode (D-61): instant → the unchanged pending 15-min hold → /book pay page; request → a no-charge `requested` hold (APPROVAL_SLA_HOURS TTL, D-63) → booker/host emails → /bookings/<id> (BOOK-04/BOOK-05)"
  - "confirmBooking accepts an `approved` hold (non-pending guard + extend-hold UPDATE both widened to `status IN ('pending','approved')`) with a GREATEST extend so a 24h approved window is never shrunk to the 60-min instant window (PAY-05 pay-on-approval reuse; Pitfall 6, T-06-10)"
  - "the /book reserve/pay page treats an unexpired `approved` hold as active so the pay-on-approval booker lands on the exact Phase-5 Confirm & pay surface"
  - "request-lifecycle.test.ts extended with the vi.doMock action harness: request-mode fork + email fire, instant-mode unchanged, mode-flip independence (D-61), approved-pay GREATEST"
affects: [06-06, 06-07, 06-08, request-to-book, approval-sweep, pay-on-approval]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "placeHold reads the booking MODE server-side from the deriveBookable join (never a client flag, T-06-09) and forks additively — the instant path stays byte-for-byte unchanged (BOOK-04); only a `request` listing takes the new branch"
    - "pay-on-approval reuses the Phase-5 checkout verbatim: confirmBooking's guard + extend-hold widen to accept `approved`, and GREATEST never shrinks a longer approval window (never issue `now()+window` unconditionally on a hold that may already have a longer TTL)"
    - "request-branch notifications are fire-and-forget (`void sendXxx(...)`, T-06-07) — invoked BEFORE the redirect throws so both emails dispatch; a Resend failure can never reject the server action"

key-files:
  created: []
  modified:
    - src/app/actions/booking.ts
    - src/app/listings/[id]/book/page.tsx
    - tests/booking/request-lifecycle.test.ts

key-decisions:
  - "The request branch reads the guest-pays amount back from the just-minted hold (booking.quotedTotalCents/currency) rather than recomputing — createPendingHold already froze it server-side (D-49), so the host's new-request email shows the exact server-authoritative total."
  - "whenLabel for the two emails is composed in-action from the venue tz (date-fns + @date-fns/tz, mirroring the reserve page) as `{date}, {time} ({City} time)`; the email leaf providers never format a time (06-03 contract)."
  - "confirmBooking's extend-hold UPDATE uses GREATEST(expires_at, now()+PAYMENT_WINDOW) scoped to `status IN ('pending','approved')` — a 24h approved window survives, a lapsed instant hold is still pushed forward (D-58 preserved). The status is NOT flipped here; the webhook remains the sole confirm authority (D-57)."
  - "Instant path left byte-for-byte unchanged (BOOK-04): the request fork is an additive guard clause inserted after the bookability gate; the existing createPendingHold call + /book redirect are untouched."

requirements-completed: []  # BOOK-04/BOOK-05/PAY-05 stay In-progress — this plan ships the entry-point fork + pay-on-approval reuse, but the request-to-book loop only closes with host approve/decline (06-07), the SLA/payment-window cron (06-06), and the request views (06-08). Completion validated at the phase transition, per the 06-01/02/03 cross-cutting precedent.

# Metrics
duration: ~15min
completed: 2026-07-20
---

# Phase 6 Plan 04: placeHold Fork + Pay-on-Approval Reuse Summary

**Forked `placeHold` on the listing's server-read `bookingMode` (D-61) — instant stays the byte-for-byte unchanged pending-hold → pay page (BOOK-04), while a `request` listing mints a no-charge `requested` hold (APPROVAL_SLA_HOURS TTL, D-63) via 06-02's parameterized `createPendingHold`, fires the booker/host lifecycle emails fire-and-forget (T-06-07), and redirects to the request-received surface — then extended `confirmBooking` + the `/book` pay page to accept an `approved` hold with a GREATEST (non-shrinking) extend so pay-on-approval reuses the exact Phase-5 hosted checkout (PAY-05, Pitfall 6).**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-20
- **Completed:** 2026-07-20
- **Tasks:** 2
- **Files modified:** 3 (0 created, 3 modified)

## Accomplishments
- **The entry-point fork is live.** `placeHold` adds `bookingMode` (+ host email / listing title / tz / city) to the existing `deriveBookable` join so the mode is read SERVER-SIDE (T-06-09 — never a client flag), then branches: `request` → `createPendingHold({ holdStatus:'requested', ttlMs: APPROVAL_SLA_HOURS*3.6e6, bookingMode:'request' })` with NO checkout and NO charge (D-63), fires `sendRequestReceived` (booker) + `sendNewRequestToHost` (host) fire-and-forget, revalidates the listing + `/`, and redirects to `/bookings/<id>`. The instant branch is untouched.
- **Pay-on-approval reuses the Phase-5 checkout verbatim.** `confirmBooking`'s non-pending guard and extend-hold UPDATE both widened to `status IN ('pending','approved')`; the extend is now `GREATEST(expires_at, now() + PAYMENT_WINDOW)` so a fresh 24h approval payment window is never shrunk to the 60-min instant window (Pitfall 6, T-06-10). Owner-gate, idempotent short-circuit, rate-limit, null-quote guard, and checkout-create are all unchanged — pay-on-approval IS the Phase-5 checkout.
- **The `/book` reserve/pay page treats `approved` as active.** The active-hold check widened to `(pending OR approved) AND future expires_at`, so the pay-on-approval booker lands on the exact Confirm & pay surface an instant booker sees.
- **The request-to-book fork is proven end-to-end.** `request-lifecycle.test.ts` gained the vi.doMock action harness (mirroring `state-machine.test.ts`) + four cases: (a) request-mode mints a `requested` hold, creates NO checkout, and fires both emails; (b) instant-mode is unchanged (`pending` → `/book`); (c) mode-flip independence (D-61 — flipping `listing.bookingMode` never mutates an in-flight `requested` row); (d) `confirmBooking` from an `approved` hold creates the checkout and GREATEST keeps the 24h window.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fork placeHold on bookingMode + extend confirmBooking to accept approved** — `c9d56b4` (feat)
2. **Task 2: /book page accepts an approved hold + fork/mode-flip tests** — `b955145` (feat)

**Plan metadata:** _(final docs commit — this summary + STATE.md + ROADMAP.md)_

## Files Created/Modified
- `src/app/actions/booking.ts` (modified) — `placeHold`: `bookingMode` + host/title/tz/city added to the `deriveBookable` select; the `me` capability select widened to load the booker email + display name; an additive `if (lr.bookingMode === "request")` branch mints the `requested` hold, reads the frozen quote back, composes the venue-local `whenLabel`, fires the two lifecycle emails fire-and-forget, and redirects to `/bookings/<id>`. `confirmBooking`: non-pending guard now allows `approved`; extend-hold UPDATE scoped `status IN ('pending','approved')` with `GREATEST(...)`. New imports: `format`/`tz`, `formatMoney`/`DISPLAY_CURRENCY`, `sendRequestReceived`/`sendNewRequestToHost`, `APPROVAL_SLA_HOURS`.
- `src/app/listings/[id]/book/page.tsx` (modified) — the D-44 active-hold check widened from `status === "pending"` to `(status === "pending" || status === "approved")` (unexpired), with the reasoning documented inline. The confirmed short-circuit + `HoldExpiredState` fallback are unchanged.
- `tests/booking/request-lifecycle.test.ts` (modified) — added the RedirectError/`expectRedirect` idiom + `vi.mock("next/headers")` + a `describe` with its own `beforeAll` (activated `hostPayout` for the host, a real signed-up `book` booker, `vi.doMock` of auth/db/paymongo/cache/navigation, `vi.resetModules`, import the real actions, seed four mode-specific listings) and the four fork/mode-flip/approved-pay cases.

## Decisions Made
- **Read the frozen quote back for the host email, don't recompute.** `createPendingHold`'s `HoldSuccess` returns only `{ id, unit, replayed }`, so the request branch does one extra `SELECT quotedTotalCents, currency` on `res.id` and formats it with the shared `formatMoney` (D-46) — the host's new-request alert shows the exact server-frozen guest-pays amount (D-49), never a client or duplicated computation.
- **Compose `whenLabel` in the action.** The 06-03 email contract has the caller pass a pre-composed `whenLabel` (the leaf providers never format a time). The request branch builds `{EEEE, MMM d}, {h:mm a – h:mm a} ({City} time)` from the venue tz via date-fns + `@date-fns/tz` (the reserve page's idiom), degrading to no city suffix when `listing.city` is null.
- **GREATEST, not a conditional window.** Rather than branch the extend interval on the hold's status, `GREATEST(expires_at, now()+PAYMENT_WINDOW)` uniformly pushes `expires_at` forward and never backward — a pending hold past its TTL is still rescued (D-58), and a 24h approved window is preserved (Pitfall 6). One statement covers both modes.
- **Additive fork; instant is byte-for-byte unchanged (BOOK-04).** The request branch is a guard clause inserted immediately after the bookability gate; the existing `(5) Mint the pending hold` + `(6) revalidate + redirect` instant path is not edited at all, so the instant flow's DB result and redirect are provably identical.

## Deviations from Plan

None — plan executed exactly as written. The `<interfaces>` block's edit points (the deriveBookable select, the request branch, the confirmBooking guard + extend, the `/book` active check) were applied verbatim; the extra host-email data (host email + listing title/tz/city) was loaded in the same server pass as the interfaces block anticipated ("load them in the same server pass … extend the select").

## Issues Encountered
- None. Docker (`fitout-db-1`) was already up; vitest ran with no `DATABASE_URL` shell override per the project gotcha (`.env.local` is the source). The action harness reuses the `state-machine.test.ts` vi.doMock idiom; `mockResend.sent()` captures the fire-and-forget emails because the global `vi.mock("resend")` (tests/setup.ts) is preserved across `vi.resetModules()`.

## Verification
- `npx vitest run tests/booking/request-lifecycle.test.ts` — 16 passed (12 existing + 4 new: request-mode fork + emails, instant-mode unchanged, mode-flip independence, approved-pay GREATEST).
- `npx vitest run tests/booking tests/payments tests/paymongo` — 18 files, 117 passed / 4 todo (up 4 from the 113 baseline; the instant state-machine + checkout-create suites stay green — no regression).
- `npx tsc --noEmit` — exit 0.
- `npx eslint` on all three touched files — exit 0.
- Acceptance greps: `bookingMode` selected + branched on in placeHold (126/154/164); `holdStatus: "requested"` in the request branch (162); `GREATEST` in the confirmBooking extend (305); `approved` accepted in the `/book` active-hold check.

## Known Stubs
None. The request branch redirects to `/bookings/<id>`, whose `requested` render is added by 06-08 (the redirect target exists today); the `/host/requests` link in the host email is populated by 06-08. Neither blocks this plan's goal — the fork mints the hold, holds the slot, notifies both sides, and pay-on-approval reuse is wired and green.

## Threat Flags
None. The plan's threat register (T-06-09..12) is fully mitigated: the mode is read server-side (T-06-09), the extend is scoped to the owner + `status IN ('pending','approved')` with GREATEST (T-06-10), the request branch charges nothing (T-06-11), and the mode-flip-independence test proves a flip cannot mutate an in-flight row (T-06-12). No new network endpoint, auth path, or trust-boundary surface was introduced beyond the plan.

## Next Phase Readiness
- **06-06 (SLA / payment-window cron)** can auto-decline a lapsed `requested` hold and auto-release a lapsed `approved` hold; the terminal statuses already match the 06-02 in-tx sweep (requested→declined, approved→cancelled).
- **06-07 (host approve/decline + pay-on-approval)** flips `requested → approved` (and fires `sendRequestApproved`) → the booker pays via `confirmBooking` (now `approved`-aware, GREATEST-safe) on the `/book` page (now `approved`-active). Decline flips `requested → declined` and fires `sendRequestDeclined`.
- **06-08 (request views)** renders the `requested`/`approved` states at `/bookings/<id>` (the request branch's redirect target) and the host queue at `/host/requests` (the host email's CTA).
- Downstream reminder still in force: any NEW read/occupancy predicate must mirror the occupying set `{pending,confirmed,requested,approved}` or a request-held slot reads as free.

## Self-Check: PASSED
- All 3 modified files exist on disk (`src/app/actions/booking.ts`, `src/app/listings/[id]/book/page.tsx`, `tests/booking/request-lifecycle.test.ts`).
- Both task commits present in git history: `c9d56b4` (Task 1), `b955145` (Task 2).
- Acceptance markers verified: `bookingMode` selected + branched on; `holdStatus: "requested"` in the request branch; `GREATEST` in the extend-hold UPDATE scoped `status IN ('pending','approved')`; `approved` accepted on the `/book` page.
- Suites green: request-lifecycle 16 passed; booking+payments+paymongo 117 passed / 4 todo; tsc exit 0; eslint exit 0 on all three files.

---
*Phase: 06-full-booking-payment-integration*
*Completed: 2026-07-20*
