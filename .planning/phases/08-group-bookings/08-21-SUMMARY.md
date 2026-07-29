---
phase: 08-group-bookings
plan: 21
subsystem: payments
tags: [paymongo, checkout, expire, idempotency, double-charge, livelock, vitest, sk_test, real-api]

# Dependency graph
requires:
  - phase: 08-group-bookings (08-18)
    provides: "confirmBooking expire-before-create gate (the fail-closed catch this plan makes recoverable) + updateDeclaredPax's expire-then-refreeze gate (the second caller silently repaired)"
  - phase: 08-group-bookings (08-19)
    provides: "the live-probed finding this plan closes — a repeat expire returns HTTP 400 'Checkout session is already expired' (NOT the 200-replay 08-18 assumed) — and tests/paymongo/checkout-idempotency-real.test.ts case 4 (flipped here to prove tolerance)"
provides:
  - "expireCheckoutSession is IDEMPOTENT: a repeat expire of an already-expired session RESOLVES (tolerates PayMongo's 400 'already expired'), because the expire postcondition already holds; every genuine failure (500, network, any other 400) still THROWS"
  - "The recovery-path livelock (T-08-84) is closed for BOTH confirmBooking and updateDeclaredPax at the shared primitive, with NO caller code changed"
  - "Two false 'repeat expire replays a 200 via the Idempotency-Key' comments (paymongo.ts + booking.ts) rewritten to the probed truth"
  - "A mutation-pinned fetch-stub unit proof (4 cases) + 08-19's live case 4 flipped from documenting the throw to proving the wrapper tolerates it"
affects: [08-18, phase-08-verification, payments, money-path]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Provider-idempotence at the wrapper, not the header: when a POST endpoint does not honor the Idempotency-Key, make the client idempotent by tolerating exactly the benign 'already done' error (a matched 400) as success, and rethrow every other failure so a fail-closed caller stays fail-closed"
    - "Mutation-pinned tolerance: a catch branch that widens a failure into a success is pinned by a fetch-stub case whose GREEN depends on the branch (delete the branch → that one case reds; sibling different-400 / 500 cases stay green to prove the tolerance is narrow)"

key-files:
  created: []
  modified:
    - "src/lib/paymongo.ts"
    - "src/app/actions/booking.ts"
    - "tests/payments/paymongo-calls.test.ts"
    - "tests/paymongo/checkout-idempotency-real.test.ts"

key-decisions:
  - "The fix lives entirely inside expireCheckoutSession + two comment corrections — NO caller code touched. confirmBooking's `if (bk.checkoutSessionId != null)` catch and updateDeclaredPax's expire-then-refreeze both inherit the idempotent primitive, so one change closes the livelock for both callers."
  - "The tolerate branch matches BOTH `(400)` AND an `already…expired` message (two regexes AND-ed). A 500, a network error, or any other 400 detail rethrows — so a session that might STILL be payable is never silently treated as retired and the double-charge guard is preserved."
  - "paymongoFetch (:74-101) was NOT changed — it is on every money-movement path; the tolerance is scoped locally to expireCheckoutSession, matching the exact thrown-Error message format defined in the same file."
  - "08-19's real-API case 4 was flipped from asserting the throw to asserting the repeat expire RESOLVES — it is now the live end-to-end proof of the fix (still gated behind RUN_LIVE_PAYMONGO_PROBE=1, still self-cleaning)."

patterns-established:
  - "Pattern: a client wrapper is the right layer to absorb a provider's non-honored idempotency — tolerate the single benign error that means the postcondition already holds, rethrow everything else, and pin the boundary with a mutation-verified different-error-still-throws case."

requirements-completed: [GROUP-01]

# Metrics
duration: ~12min
completed: 2026-07-29
---

# Phase 8 Plan 21: Idempotent expireCheckoutSession Summary

**expireCheckoutSession now tolerates PayMongo's 400 "Checkout session is already expired" as idempotent success — closing the post-expire-then-create-failure retry livelock in both confirmBooking and updateDeclaredPax at the shared primitive — while every genuine failure (500, network, any other 400) still throws so the double-charge fail-closed guard is fully preserved; the two false "repeat expire replays a 200" comments are rewritten to the probed truth and the fix is proven live against the real sk_test_ API.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-29T11:19:00+08:00 (approx)
- **Completed:** 2026-07-29T11:24:00+08:00 (approx)
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Made `expireCheckoutSession` idempotent: a repeat expire of an already-expired session RESOLVES (tolerates the matched 400 "already expired"); a 500 / network error / any other 400 still THROWS.
- Closed the recovery-path livelock (T-08-84) for BOTH `confirmBooking` and `updateDeclaredPax` at the shared primitive — with zero caller code changed (comment-only diff in `booking.ts`).
- Rewrote the two shipped comments that asserted the disproven "repeat expire replays PayMongo's prior 200 via the Idempotency-Key" belief (paymongo.ts doc + booking.ts NOT-TRAPPED RECOVERY block) to the probed truth (400 "already expired", tolerated in the catch).
- Added a mutation-pinned fetch-stub unit proof (4 cases) and flipped 08-19's live case 4 from documenting the throw to proving the wrapper tolerates the repeat against the real API.

## Task Commits

Each task was committed atomically:

1. **Task 1: Make expireCheckoutSession idempotent + correct the two false comments** — `3ddb96d` (fix)
2. **Task 2: fetch-stub unit proof + flip 08-19 case 4 to prove tolerance live** — `73a18f3` (test)

**Plan metadata:** this SUMMARY (docs commit to follow).

## Files Created/Modified
- `src/lib/paymongo.ts` — `expireCheckoutSession` wrapped in try/catch: the catch tolerates a message matching BOTH `/\(400\)/` AND `/already\b.*\bexpired/i` (returns `{ id }`), rethrows everything else. Its doc comment corrected (the "must be a no-op, which the stable key gives us" mechanism replaced by "idempotence is provided in the catch, tolerating the 400"; the trailing "Failures THROW … deliberately not swallowed" paragraph now scopes the tolerance). `paymongoFetch` (:74-101) untouched.
- `src/app/actions/booking.ts` — comment-only change: the NOT-TRAPPED RECOVERY sub-comment in `confirmBooking`'s expire block now states the probed truth (repeat expire → 400 "already expired", tolerated → retry resolves → mints a fresh session; a genuine failure still throws and refuses). No logic changed; `updateDeclaredPax` untouched.
- `tests/payments/paymongo-calls.test.ts` — new `describe("expireCheckoutSession — idempotent on already-expired (08-21 / 08-19 case 4)")` with a MUTATION-VERIFY header and 4 cases: (a) already-expired 400 RESOLVES to `{ id: "cs_x" }` + POST /expire request-shape assertion; (b) a different 400 ("amount is invalid") THROWS; (c) a 500 THROWS; (d) a 200 RESOLVES to the provider id.
- `tests/paymongo/checkout-idempotency-real.test.ts` — case 4 flipped: the second `expireCheckoutSession(s.id)` now asserts `.resolves.toBeDefined()` (the wrapper tolerates the underlying 400), replacing the prior throw-capture; still gated behind `RUN_LIVE_PAYMONGO_PROBE=1`, still self-cleaning.

## Decisions Made
See `key-decisions` in the frontmatter. In brief: fix scoped to the primitive (callers inherit it, no caller code touched); tolerate ONLY the matched already-expired 400 (AND-ed `(400)` + `already…expired` regexes) so genuine failures stay fail-closed; `paymongoFetch` left untouched; 08-19's live case 4 repurposed as the end-to-end proof of the fix.

## Mutation-Verify Evidence (unit case (a))

Per the plan's required mutation check: the tolerate branch (`if (/\(400\)/.test(msg) && /already\b.*\bexpired/i.test(msg)) { return { id }; }`) was deleted from `expireCheckoutSession` so it rethrows every error, then `npx vitest run tests/payments/paymongo-calls.test.ts` was run. **Exactly case (a) went RED; cases (b)/(c)/(d) stayed GREEN** (`Tests 1 failed | 12 passed (13)`). Verbatim RED line:

```
× (a) RESOLVES on a 400 'Checkout session is already expired' — the idempotent repeat expire
FAIL  tests/payments/paymongo-calls.test.ts > expireCheckoutSession — idempotent on already-expired (08-21 / 08-19 case 4) > (a) RESOLVES on a 400 'Checkout session is already expired' — the idempotent repeat expire
AssertionError: promise rejected "Error: PayMongo POST /v1/checkout_session…" instead of resolving
Caused by: Error: PayMongo POST /v1/checkout_sessions/cs_x/expire failed (400): Checkout session is already expired
```

The tolerate branch was then RESTORED via `git checkout -- src/lib/paymongo.ts` (restoring the committed Task 1 version) and the suite re-ran GREEN (`Tests 13 passed (13)`). The mutated code was NEVER committed.

## Real-API Proof (opted-in, live)

The opted-in real-API run WAS performed — not skipped. `RUN_LIVE_PAYMONGO_PROBE=1 npx vitest run tests/paymongo/checkout-idempotency-real.test.ts --reporter=verbose` (with `.env.local`'s real `sk_test_` key) executed all **4 cases against `https://api.paymongo.com` and exited 0 (4/4 passed)**. Case 4 is now GREEN on RESOLUTION — the live proof of the fix. Verbatim console line:

```
[case4] repeat-expire of cs_2281b7ec3364947f095ea728 RESOLVED (wrapper tolerated the underlying 400 'already expired')
 ✓ ... a repeat expire of the same session id RESOLVES — the wrapper tolerates the real 400 'already expired' (08-21 fix) 828ms
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

The underlying provider behaviour is unchanged (the second expire still returns 400 at PayMongo — cases 1–3 re-confirmed the same live invariants as 08-19); it is the wrapper that now absorbs it. This is provider-probed evidence, not a mock.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. tsc clean throughout; the unit suite, the 08-18/CR-02 regression guards, and the full suite all passed on the first run after each change.

## Verification Results
- `npx tsc --noEmit` — exit 0 (after Task 1 and after Task 2).
- **Task 1 grep gates:** `already expired` in paymongo.ts = 2 (≥2); regex `already\b.*\bexpired` = 8 (≥1); `throw err;` = 1 (≥1); `must be a no-op, which the stable key gives us` = 0; `replays PayMongo's prior 200` (booking.ts) = 0; `RESOLVES (does not throw)` (booking.ts) = 0; `returns HTTP 400` (booking.ts) = 1 (≥1).
- **No caller code changed:** `git diff src/app/actions/booking.ts` is comment-only (the `if (bk.checkoutSessionId != null)` logic and updateDeclaredPax code unchanged). `paymongoFetch` (:74-101) untouched.
- **Task 2 grep gates:** `already expired` in paymongo-calls.test.ts = 3 (≥1); `rejects` = 3 (≥2); `resolves.toBeDefined` in the real test = 3 (≥1); `toThrow|THREW` in the real test = 0 (case 4 no longer asserts a throw).
- `npx vitest run tests/payments/paymongo-calls.test.ts` — exit 0, **13 passed** (9 pre-existing + 4 new a–d).
- `npx vitest run tests/booking/confirm-double-submit.test.ts tests/booking/checkout-session-expire.test.ts` — exit 0, **11 passed** (08-18 / CR-02 proofs still hold; the mock already models resolve-on-repeat, so no regression).
- **OPTED-IN real-API run:** `RUN_LIVE_PAYMONGO_PROBE=1 npx vitest run tests/paymongo/checkout-idempotency-real.test.ts` — exit 0, **4/4 passed**, case 4 GREEN on resolution (evidence above).
- **Full suite (default, no opt-in):** `npx vitest run` — **97 passed | 1 skipped (98 files), 855 passed | 4 skipped (859 tests), exit 0**. The 1 skipped file / 4 skipped tests are the gated real-API probe (offline-by-default). +4 passing tests vs 08-19's 851 baseline — the new unit cases (a–d).

## Threat Register Outcome (from plan `<threat_model>`)
- **T-08-84 (Denial — post-expire retry livelock): MITIGATED.** expireCheckoutSession tolerates the already-expired 400, so the retry resolves and proceeds — closing the permanent fail-closed loop in both confirmBooking and updateDeclaredPax. Proven by unit case (a) and live case 4.
- **T-08-85 (over-tolerant catch swallows a genuine failure): MITIGATED.** Only a message matching BOTH `(400)` AND `already…expired` resolves; a different 400 and a 500 rethrow — pinned by unit cases (b) and (c) and by the mutation check.
- **T-08-86 (a shipped comment asserts disproven provider behaviour): MITIGATED.** Both false comments rewritten to the probed truth; grep-gated to 0.
- **T-08-79 (concurrent double-click) and T-08-74 (already-captured qrph double charge): ACCEPTED, unchanged** — this plan closes a livelock, it neither adds a lock nor a refund rail.

## Known Stubs
None. `expireCheckoutSession` is a live call against the provider; the fix is proven both by a fetch-stub unit test and end-to-end against the real API. No placeholder values or unwired data.

## Threat Flags
None new. No new network endpoint, auth path, file-access pattern, or schema change was introduced — the change is a narrower error-tolerance inside an existing money-movement primitive plus comment corrections.

## Phase-Closure State
- `completed_phases` remains **7** — verified at `STATE.md` line 11; this plan did NOT touch `STATE.md` or `ROADMAP.md` (orchestrator-owned). Phase closure is verification's call.

## Next Phase Readiness
- The double-charge blocker's recovery path is now both fixed AND livelock-free: 08-18 closed the sequential double-submit double-charge; 08-19 proved it live and found the repeat-expire 400; 08-21 (this plan) makes the recovery retry resolve instead of stalling. No shipped comment asserts a disproven provider behaviour on the expire path.
- Phase 8 verification can now assess the money path with the recovery-path livelock closed. The accepted residuals (T-08-79 concurrent double-click, T-08-74 unrefundable qrph double charge) remain accepted and unchanged.

## Self-Check: PASSED
- `src/lib/paymongo.ts` — FOUND (expireCheckoutSession try/catch tolerate branch present, tsc clean).
- `src/app/actions/booking.ts` — FOUND (comment-only correction, no logic change).
- `tests/payments/paymongo-calls.test.ts` — FOUND (4 new mutation-pinned cases, 13 tests green).
- `tests/paymongo/checkout-idempotency-real.test.ts` — FOUND (case 4 flipped to resolve, 4/4 green live).
- Commit `3ddb96d` — FOUND (Task 1, fix).
- Commit `73a18f3` — FOUND (Task 2, test).

---
*Phase: 08-group-bookings*
*Completed: 2026-07-29*
