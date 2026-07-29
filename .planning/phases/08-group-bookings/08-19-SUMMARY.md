---
phase: 08-group-bookings
plan: 19
subsystem: payments
tags: [paymongo, checkout, idempotency, double-charge, expire, real-api, vitest, sk_test]

# Dependency graph
requires:
  - phase: 08-group-bookings (08-18)
    provides: "confirmBooking expire-before-create gate + the mock-backed double-submit regression this plan proves against the REAL provider"
  - phase: 08-group-bookings (08-12/08-13)
    provides: "expireCheckoutSession + createCheckoutSession + updateDeclaredPax's expire-before-refreeze (the re-price supersession this plan asserts live)"
provides:
  - "getCheckoutSession(id) — a thin GET /v1/checkout_sessions/{id} read returning the provider's attributes.status"
  - "tests/paymongo/checkout-idempotency-real.test.ts — the ONE non-mock test that drives the live sk_test_ API, closing deferred item 5's REAL-API half and item 6's live re-price assertion"
  - "PROVIDER-PROBED FACT: PayMongo does NOT honor the Idempotency-Key on POST /v1/checkout_sessions (two identical POSTs -> two different payable session ids) — falsified against the real API, not mocked"
  - "NEW PROVIDER-PROBED FINDING: a REPEAT expire of the same session id is NOT a no-op — the real API returns HTTP 400 'Checkout session is already expired' (08-18's fail-closed catch must be hardened to tolerate it)"
affects: [08-18, phase-08-verification, payments, money-path]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "External-API invariants proven against the live test-mode provider at least once, gated behind an explicit opt-in flag (RUN_LIVE_PAYMONGO_PROBE=1) so the default suite/CI stay offline even when .env.local carries a real sk_test_ key"
    - "Self-cleaning live probe: every minted session id is tracked and expired in afterAll (try/catch swallows the now-proven already-expired throw), so no live payable session leaks and zero DB calls are made"

key-files:
  created:
    - "tests/paymongo/checkout-idempotency-real.test.ts"
  modified:
    - "src/lib/paymongo.ts"

key-decisions:
  - "The PRIMARY gate is the opt-in RUN_LIVE_PAYMONGO_PROBE=1 flag, NOT the sk_test_ prefix — because tests/setup.ts loads .env.local's real sk_test_ key first, a prefix-only gate would fire live calls on every default run; the sk_test_ prefix is a secondary safety check so a sk_live_ key can never run"
  - "getCheckoutSession was NOT added to tests/helpers/mocks.ts — no production caller uses it, and the DB tests' vi.doMock blocks list only the functions confirmBooking/updateDeclaredPax call, so an added export cannot break them"
  - "Case 4's repeat-expire result is asserted as the PROBED truth (rejects with 400 'already expired'), not as the assumed no-op — the plan's explicit contingency for a throw"
  - "The new repeat-expire finding is surfaced in this SUMMARY (Provider-Probed Findings) as a recommended follow-up rather than committed into deferred-items.md, whose pre-existing uncommitted edits are owned by the orchestrator/planner"

patterns-established:
  - "Pattern: a mock cannot falsify the assumption it was written from — any test of a third-party behavioural claim must hit the real API in test mode at least once"

requirements-completed: [GROUP-01]

# Metrics
duration: ~10min
completed: 2026-07-29
---

# Phase 8 Plan 19: Real-API PayMongo Proof Summary

**A gated, DB-free, self-cleaning test drives the LIVE sk_test_ PayMongo API and PROVES — not mocks — that two byte-identical checkout POSTs mint two different payable session ids, that expire retires a session, and that a re-priced hold leaves exactly one payable session; the probe ALSO discovered that a repeat expire is NOT a no-op but a HTTP 400 the real API rejects.**

## The live API WAS hit — this is provider-probed evidence, not a skipped test

The opted-in run (`RUN_LIVE_PAYMONGO_PROBE=1`, `.env.local`'s real `sk_test_` key) executed all **4 cases against `https://api.paymongo.com` and exited 0 (4/4 passed)**. The observed session ids and status strings below are recorded verbatim from that run's console output (`--reporter=verbose`, 2026-07-29 ~11:01 +0800). This is the coverage gap deferred item 5 existed to close: a green suite against the mock was never evidence.

## Provider-Probed Findings (verbatim evidence)

### Case 1 — Gap A: the Idempotency-Key does NOT collapse duplicate checkout POSTs
Two `POST /v1/checkout_sessions` with a **byte-identical Idempotency-Key AND body** (same amount `50000`, same key) returned two DIFFERENT, independently payable session ids:

```
[case1] s1=cs_b271790beae829633f1332d7  s2=cs_e8a1898e14c8aaba4c75503f
```

Both start with `cs_`; `s1.id !== s2.id`. This **falsifies** the belief that shipped the 08-17 double-charge ("the Idempotency-Key collapses a duplicate checkout POST onto one session"). Every POST mints a separate payable session — exactly matching the earlier ad-hoc probe (`cs_ed60840548c9ccadc27ba6c3` vs `cs_6c4e54d253178994b94934b8`), now reproduced under an automated, self-cleaning harness.

### Case 2 — Gap A guard: expireCheckoutSession retires a session at the provider
```
[case2] pre-expire status=active
[case2] post-expire status=expired
```

Before expire the provider reports `attributes.status = "active"` (payable); `expireCheckoutSession` resolved (no throw); after expire the provider reports `attributes.status = "expired"`. Post-expire status differs from the active value AND equals the expired marker — the session can no longer be paid. This proves 08-18's expire-before-create guard end to end.

### Case 3 — Gap B / CR-02: the re-price supersession holds at the provider
Modelling `updateDeclaredPax`'s expire-before-refreeze (create at the old amount `50000` → expire it → create the replacement at the new amount `73500`):

```
[case3] superseded=cs_f1b74526263dd8e03807269c:expired  replacement=cs_0134652c95508d113d25e02b:active
```

The superseded session is `expired` (can no longer be paid); the replacement is `active`. **Exactly one payable session survives a re-price.** This is the live CR-02 assertion the 08-17 UAT never exercised — the human submitted the same headcount twice, so `updateDeclaredPax` was never entered (deferred item 6). It is now proven against the real API, not just 08-13's mock-backed mutation proofs.

### Case 4 — W2(a): a REPEAT expire is NOT a no-op — 🔴 NEW PROVIDER-PROBED FINDING
```
[case4] repeat-expire of cs_84bdb4eb16ef8db016a031b9 THREW:
        PayMongo POST /v1/checkout_sessions/cs_84bdb4eb16ef8db016a031b9/expire failed (400): Checkout session is already expired
```

**Exact error shape:** HTTP **400**, PayMongo detail **"Checkout session is already expired"**.

This **falsifies** the "expiring twice is a no-op" belief. 08-12 contract 1 and 08-18's *NOT-TRAPPED recovery* (08-18-SUMMARY case 5) assumed the session-scoped `Idempotency-Key` `checkout-expire:<id>` replays the prior `200`. It does not — the Idempotency-Key is **not honored on the expire endpoint either** (same class of bug as `POST /v1/checkout_sessions`); the second expire is rejected with a 400. The 08-18 mock returned a constant and could never surface this.

**Why this matters — prominent, for 08-18 hardening.** 08-18's `confirmBooking` expire-before-create is **fail-closed on a thrown expire** (it REFUSES the checkout with a `checkout_expire_failed` / `needs_attention` audit). On a legitimate RETRY whose previously-persisted session was **already expired by an earlier attempt**, `expireCheckoutSession` now throws this 400 → the gate would **permanently refuse** the retry — a livelock on the recovery path. This does not re-open the double-charge (refusing is safe-side; at most one session is ever payable), but it converts a recoverable resubmit into a stuck booking that needs an operator.

**Recommended follow-up (out of this plan's scope — a money-path behavioural change to `confirmBooking`, Rule 4 territory):** 08-18's catch should treat a PayMongo 400 matching `already expired` as a **benign no-op** (the session is already retired → proceed to create) rather than a fail-closed refusal, while still fail-closing on any other expire error. This finding is surfaced here for the planner to fold into a hardening plan / deferred-items entry centrally (deferred-items.md carries pre-existing orchestrator-owned edits, so it is not modified here).

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-29T10:56:00+08:00 (approx)
- **Completed:** 2026-07-29T11:02:00+08:00 (approx)
- **Tasks:** 2
- **Files modified:** 2 (1 modified, 1 created)

## Accomplishments
- Added `getCheckoutSession(id)` to `src/lib/paymongo.ts` — a thin `GET /v1/checkout_sessions/{id}` returning `{ id, status }` from the provider's `attributes.status`; throws through `paymongoFetch` on non-2xx.
- Shipped `tests/paymongo/checkout-idempotency-real.test.ts` — the ONE non-mock test that drives the live `sk_test_` API, gated on `RUN_LIVE_PAYMONGO_PROBE=1`, DB-free, self-cleaning (4 cases).
- Ran BOTH required runs: DEFAULT (opt-in unset) SKIPS the describe and exits 0 even with `.env.local`'s real `sk_test_` key; OPTED IN runs all 4 cases green against the real API.
- Recorded the provider-probed evidence verbatim (session ids + status strings + the repeat-expire error).
- Discovered and captured a NEW finding: a repeat expire is a HTTP 400 `already expired`, not a no-op — reported prominently for 08-18 hardening.

## Task Commits

Each task was committed atomically:

1. **Task 1: getCheckoutSession(id) read primitive** — `efb7c19` (feat)
2. **Task 2: real sk_test_ PayMongo proof (4 cases)** — `54ffc6f` (test)

**Plan metadata:** this SUMMARY (docs commit to follow).

## Files Created/Modified
- `src/lib/paymongo.ts` — added `CheckoutSessionState` type + `getCheckoutSession(id)` (GET single-session read), placed directly after `expireCheckoutSession`. `tests/helpers/mocks.ts` deliberately untouched.
- `tests/paymongo/checkout-idempotency-real.test.ts` — gated real-API proof: 4 cases (Gap A falsification, expire-retires, re-price supersession, repeat-expire probe), opt-in gate + secondary `sk_test_` check, `afterAll` sweep that expires every minted session.

## Verification Results
- `npx tsc --noEmit` — exit 0 (after Task 1).
- Task 1 grep gates: `export async function getCheckoutSession` = 1; single-session GET path `/v1/checkout_sessions/${id}` = 1; `git diff --name-only` does NOT list `tests/helpers/mocks.ts`.
- Task 2 grep gates: `RUN_LIVE_PAYMONGO_PROBE` = 1; `startsWith("sk_test_")` = 1; `describe.skipIf(!runLive)` = 1; `not.toBe` = 3 (≥1); `expireCheckoutSession` = 8 (≥4); `helpers/db|setupTestDb` = 0.
- **DEFAULT run (opt-in unset), with `.env.local`'s real sk_test_ key present:** `npx vitest run tests/paymongo/checkout-idempotency-real.test.ts` → exit 0, **1 file / 4 tests SKIPPED** (the load-bearing offline-by-default proof).
- **OPTED-IN run:** `RUN_LIVE_PAYMONGO_PROBE=1 npx vitest run …` → exit 0, **4/4 passed** against the live API (evidence above).
- **Full suite:** `npx vitest run` (default, no opt-in) → **97 passed | 1 skipped (98 files), 851 passed | 4 skipped (855 tests), exit 0**. The 1 skipped file is this real-API test.
- No live payable session remains: every created session is expired in `afterAll`; the repeat-expire throw on already-expired ids is swallowed by the sweep's try/catch.

## Decisions Made
See `key-decisions` in the frontmatter. In brief: opt-in flag as PRIMARY gate (sk_test_ prefix secondary), no mock churn, case-4 asserts the probed throw, and the new finding is surfaced in this SUMMARY rather than committed into orchestrator-owned deferred-items.md.

## Deviations from Plan

None — plan executed as written. Case 4's outcome (a repeat expire that throws) is the plan's own explicitly-anticipated contingency ("If the real endpoint DOES error on a repeat expire, wrap it and record the EXACT error shape … and a `// PROBED:` comment"), so asserting the throw rather than a no-op follows the plan rather than deviating from it. It is documented above as a NEW provider-probed finding, which is its correct classification.

## TDD Gate Compliance
Task 1 is marked `tdd="true"`, but its behavioural test is deliberately Task 2's REAL-API harness (the whole point of this plan: a mock that echoes a constant session id back is exactly what let the double-charge belief survive four plans). A separate fetch-mocked unit test for `getCheckoutSession` was intentionally NOT written — it would recreate the mock-confirms-assumption anti-pattern this plan exists to break, and the plan's own Task-1 acceptance is grep + `tsc` only, with the read primitive proven live in Task 2 (cases 2 + 3). Task 1 is therefore a `feat` commit; the RED/GREEN evidence for the read lives in Task 2's opted-in run.

## Known Stubs
None. `getCheckoutSession` is a live read against the provider; the test drives the real API. No placeholder values or unwired data.

## Threat Flags
None new. The file's trust boundaries (test process → live sk_test_ API; secret key → test env) and mitigations (opt-in gate + sk_test_ check, self-cleaning expire sweep, zero DB calls, ids/status only in logs) match the plan's `<threat_model>` register (T-08-75…T-08-78) exactly.

## Phase-Closure State
- `completed_phases` remains **7** — verified at `STATE.md` line 11; this plan did NOT touch STATE.md or ROADMAP.md. Phase closure is verification's call and the phase's blocker-tracking is orchestrator-owned.

## Next Phase Readiness
- deferred item 5's REAL-API half is now closed (the provider behaviour that shipped the double-charge is falsified, not mocked); item 6's live re-price assertion (CR-02) is proven end to end on the same harness.
- 08-18's fail-closed expire catch has a NEW, provider-probed hardening requirement (repeat expire → 400 `already expired`); recommended for a follow-up plan / deferred-items entry before Phase 8 verification signs off the recovery path.

## Self-Check: PASSED
- `src/lib/paymongo.ts` — FOUND (`getCheckoutSession` present, tsc clean).
- `tests/paymongo/checkout-idempotency-real.test.ts` — FOUND (145 lines, 4 cases, gated).
- Commit `efb7c19` — FOUND (Task 1, feat).
- Commit `54ffc6f` — FOUND (Task 2, test).

---
*Phase: 08-group-bookings*
*Completed: 2026-07-29*
