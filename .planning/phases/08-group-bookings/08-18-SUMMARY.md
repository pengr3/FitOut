---
phase: 08-group-bookings
plan: 18
subsystem: payments
tags: [paymongo, checkout, idempotency, double-charge, confirmBooking, expire-before-create, vitest]

# Dependency graph
requires:
  - phase: 08-group-bookings (08-12/08-13)
    provides: "expireCheckoutSession + booking.checkout_session_id persistence + updateDeclaredPax's expire-before-refreeze gate (the mirror pattern)"
provides:
  - "confirmBooking expire-before-create gate: any session the booking row already named is expired BEFORE a new checkout is minted, fail-closed on throw, for per-head AND flat bookings"
  - "The three false idempotency comments (booking.ts x2, paymongo.ts x1) corrected to the probed truth"
  - "tests/booking/confirm-double-submit.test.ts — a mutation-proven DB regression (5 cases)"
affects: [08-19, phase-08-verification, payments, money-path]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Expire-before-create on the money path: retire any previously-persisted checkout session before minting a new one, mirroring updateDeclaredPax — fail-closed on a genuine expire failure (needs_attention audit + calm retry)"
    - "Mutation-verified regression: the test file header names the exact mutation and the RED/GREEN split; performed and recorded, not asserted"

key-files:
  created:
    - "tests/booking/confirm-double-submit.test.ts"
  modified:
    - "src/app/actions/booking.ts"
    - "src/lib/paymongo.ts"

key-decisions:
  - "Expire happens BEFORE create; a thrown expire REFUSES the new checkout (fail-closed) rather than leaking a second payable session — refusing costs one retry, proceeding costs an unrefundable qrph double-capture"
  - "The gate is NOT conditional on declared_pax — flat bookings were equally exposed (their checkout:<bookingId> key was believed a guard and is not one)"
  - "The concurrent double-click stays an ACCEPTED residual (T-08-79), matching updateDeclaredPax — no SELECT … FOR UPDATE spanning two external HTTP round-trips"
  - "The real-API proof is delegated to 08-19: a mock returns a constant session id and cannot falsify the provider assumption that shipped the original double-charge"

patterns-established:
  - "Pattern: a comment that asserts external-service behaviour must state the probed truth; PayMongo does NOT honor the Idempotency-Key on POST /v1/checkout_sessions"

requirements-completed: [GROUP-01]

# Metrics
duration: 7min
completed: 2026-07-29
---

# Phase 8 Plan 18: confirmBooking Expire-Before-Create Summary

**confirmBooking now expires any previously-persisted checkout session before minting a new one (fail-closed on throw, per-head + flat alike), closing the deferred-item-5 double-charge on the SEQUENTIAL double-submit path; the three false idempotency comments now state the probed truth.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-07-29T02:38:15Z
- **Completed:** 2026-07-29T02:45:02Z
- **Tasks:** 2
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments
- Added the expire-before-create gate to `confirmBooking`, mirroring `updateDeclaredPax` verbatim in shape: read `booking.checkoutSessionId`, expire it via `expireCheckoutSession` BEFORE `createCheckoutSession`, and on a thrown expire REFUSE the new checkout with a `checkout_expire_failed` / `needs_attention` audit and a calm retryable result (`{ ok:false, reason:"checkout", error:"We couldn't start checkout. Please try again." }`).
- Protected BOTH per-head and flat bookings — the gate is not conditional on `declared_pax`.
- Corrected the three shipped comments that falsely asserted PayMongo's Idempotency-Key collapses duplicate checkout POSTs (`booking.ts:582/592`, `paymongo.ts:172`) to state the probed truth.
- Shipped a mutation-proven DB regression, `tests/booking/confirm-double-submit.test.ts` (5 cases), and performed the mandatory mutation-verify.

## Task Commits

Each task was committed atomically:

1. **Task 1: confirmBooking expire-before-create + correct the three false comments** — `d33c7a3` (fix)
2. **Task 2: mutation-proven DB regression (confirm-double-submit.test.ts)** — `0e28968` (test)

## Files Created/Modified
- `src/app/actions/booking.ts` — confirmBooking SELECT projection now reads `checkoutSessionId`; the expire-before-create gate is inserted after the hold-extension and before the checkout create; comments #1 and #2 corrected.
- `src/lib/paymongo.ts` — `createCheckoutSession` doc comment #3 corrected (Idempotency-Key NOT honored on POST /v1/checkout_sessions; expire-before-create is the guard).
- `tests/booking/confirm-double-submit.test.ts` — 5-case DB regression (real Postgres isolated schema, @/lib/paymongo mocked), header documents the mutation-verify and that a mock run is not real-API evidence.

## Mutation-Verify (Task 2 — mandatory)

Procedure: temporarily removed the `if (bk.checkoutSessionId != null) { … expireCheckoutSession … }` block from `confirmBooking`, ran `npx vitest run tests/booking/confirm-double-submit.test.ts`, recorded the RED cases below, then restored via `git checkout -- src/app/actions/booking.ts` (verified byte-identical to the committed `d33c7a3`, `git status` clean) and re-ran GREEN (5/5, then 15/15 with the two sibling files).

Observed with the gate removed — **cases (1), (2), (3), (5) RED; case (4) GREEN** (exactly as the plan predicted):

- **(1) per-head, double submit** — RED:
  `AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times`
  at `tests/booking/confirm-double-submit.test.ts:233:48` (the `expireCheckoutSession` `toHaveBeenCalledTimes(1)` on the second submit — with the gate gone, expire is never called).
- **(2) flat booking** — RED:
  `AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times`
  at `tests/booking/confirm-double-submit.test.ts:250:48` (same `expireCheckoutSession` call-count assertion for the flat path).
- **(3) failed expire REFUSES** — RED:
  The action redirected instead of returning the refuse result — trace `❯ redirect …:189:13` → `❯ confirmBooking src/app/actions/booking.ts:701:3` → `tests/booking/confirm-double-submit.test.ts:269:17`. With the gate removed the queued `expireCheckoutSession.mockRejectedValueOnce` is never consumed, so `confirmBooking` minted the second session and threw `RedirectError` where the test expected `const res = await confirmBooking(id)` to return `{ ok:false, reason:"checkout", … }`.
- **(4) fresh-hold zero-expire-calls** — GREEN (stayed passing: a fresh hold names no session, so there is nothing to expire whether or not the gate exists — 1 passed).
- **(5) NOT-TRAPPED recovery** — RED:
  `AssertionError: expected "vi.fn()" to be called with arguments: [ 'cs_1' ]`
  at `tests/booking/confirm-double-submit.test.ts:317:48` (the retry's repeat `expireCheckoutSession("cs_1")` never happens without the gate).

Summary line from the mutated run: `Test Files 1 failed (1) / Tests 4 failed | 1 passed (5)`. After restore: `Tests 5 passed (5)`.

The mutated code was NOT committed.

## Verification Results
- `npx tsc --noEmit` — exit 0 (run after Task 1, and again after the restore state which is byte-identical to the committed file).
- `npx vitest run tests/booking/confirm-double-submit.test.ts` — 5 passed.
- `npx vitest run tests/booking/checkout-session-expire.test.ts tests/payments/checkout-create.test.ts` — 10 passed (the CR-02 + checkout-create proofs still hold after the confirmBooking edit).
- Full suite `npx vitest run` — **97 files / 843 tests, exit 0** (baseline was 96/838; +1 file, +5 cases from this plan).
- All Task 1 grep gates pass: false comments `collapses a double-click` / `still resolves to the same key and the same session` / `can't create a second charge` all grep to 0; truth strings `does NOT honor` (paymongo.ts) and `not honored on checkout-session creation` (booking.ts) grep to ≥1; `checkout_expire_failed` = 2; expire call (line 615) precedes create call (line 661).
- All Task 2 grep gates pass: `toHaveBeenCalledWith("cs_1")` = 4 (≥1), `not.toContain` = 2 (≥2), `cs_3` = 4 (≥1), file = 329 lines (≥120).

## Decisions Made
None beyond the plan — followed the plan as specified. The load-bearing ordering (expire BEFORE create, fail-closed on throw) was implemented exactly; the expire-failure branch uses `reason:"checkout"` (confirmBooking's return contract) rather than updateDeclaredPax's bare `{ ok:false, error }`, per the plan's action text.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. The mutation-verify RED split matched the plan's prediction on the first run; no debugging required.

## Scope Boundary — What This Plan Does NOT Prove

- **The real PayMongo API behaviour is NOT proven here.** This regression is mock-backed BY DESIGN — the mock returns a constant session id, so a green run is not evidence that PayMongo does or does not collapse duplicate checkout POSTs. That proof is delegated to **08-19** (Wave 11), which depends on this plan. Gap A is not fully closed until 08-19's non-mock test runs. A mock that echoes the idempotency key back is precisely what let the false belief survive four plans of coverage.
- **The concurrent double-click remains an accepted residual (T-08-79)** — the read-then-act gate is unlocked, matching the accepted `updateDeclaredPax` precedent. This plan covers the SEQUENTIAL double-submit (the observed UAT failure), not two truly simultaneous calls.
- **An already-captured double charge on qrph is still unrefundable via the API (T-08-74)** — this plan prevents the SECOND capture; it does not add a refund rail.

## Phase-Closure State
- `completed_phases` remains **7** — this plan did NOT touch STATE.md or ROADMAP.md phase-closure state (orchestrator owns those tracking files; the phase carries a live blocker and closure is verification's call).

## Next Phase Readiness
- 08-19 (Wave 11) can now run its real-PayMongo-API proof against the shipped expire-before-create gate — including its 4th case probing the repeat-expire-no-op (200-replay) belief.
- deferred-items.md item 5 is half-closed (production-fix + mock regression); it is not fully closed until 08-19's real-API test runs. Items 6 (CR-02 live re-price human exercise) and 7 (`included >= max_occupancy` revenue-loss) remain open and out of this plan's scope.

## Self-Check: PASSED

---
*Phase: 08-group-bookings*
*Completed: 2026-07-29*
