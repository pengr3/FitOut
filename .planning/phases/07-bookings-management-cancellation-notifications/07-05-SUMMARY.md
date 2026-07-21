---
phase: 07-bookings-management-cancellation-notifications
plan: 05
subsystem: lifecycle-expiry-correctness
tags: [expiry, holds, db-clock, lead-time, availability, slot-state, concurrency]
requires:
  - MIN_LEAD_REQUEST_HOURS
  - MIN_LEAD_INSTANT_MINUTES
  - MIN_APPROVE_WINDOW_HOURS
  - APPROVAL_SLA_HOURS
  - APPROVAL_PAYMENT_WINDOW_HOURS@12
  - booking.declineReason
provides:
  - HoldSuccess.expiresAt
  - SlotState.too_soon
  - DayAvailability.bookingMode
  - leadTimeMsFor
  - decline_reason@too_close_to_start
affects:
  - src/lib/availability/units.ts
  - src/app/actions/host-requests.ts
  - src/app/actions/booking.ts
  - src/lib/availability/read-model.ts
  - src/components/availability/slot-picker.tsx
  - src/components/availability/availability-calendar.tsx
  - src/app/actions/availability.ts
tech-stack:
  added: []
  patterns:
    - "expires_at as a SQL expression in the INSERT, re-evaluated per SAVEPOINT attempt"
    - "LEAST(now() + window, starts_at) as the one expiry invariant at every write site"
    - "GREATEST(floor, LEAST(cap, (starts_at - now()) / 2)) — the D-96 proportional split"
    - "A guard folded into an existing SELECT as a computed column, to avoid adding a round trip inside a raced transaction"
    - "Refusal returned through the existing result error channel rather than a new failure shape"
    - "An UPDATE-WHERE guard whose 0-row outcome falls through to an existing calm path"
    - "Test expectations derived from SELECT now(), never the JS clock"
    - "Mutation-verified guard test (the regression was introduced on purpose to prove the test fails)"
key-files:
  created:
    - tests/availability/expiry-cap.test.ts
    - tests/booking/host-requests.test.ts
  modified:
    - src/lib/availability/units.ts
    - src/app/actions/host-requests.ts
    - src/app/actions/booking.ts
    - src/lib/availability/read-model.ts
    - src/components/availability/slot-picker.tsx
    - src/components/availability/availability-calendar.tsx
    - src/app/actions/availability.ts
    - tests/paymongo/webhook-payment-paid.test.ts
    - tests/auth/secret-config.test.ts
decisions:
  - "D-94: all three hold-write sites compute expires_at in SQL; units.ts holds zero JS clock reads"
  - "D-96: ttlMs now defaults per mode so an omitted value can never mint a 15-min approval SLA"
  - "HoldSuccess.expiresAt is Date|null, not Date — a replayed `confirmed` booking has no hold expiry"
  - "The lead-time guard rides the existing listing SELECT instead of adding a statement to a raced tx"
  - "too_soon is evaluated AFTER the freeUnits check, so it means exactly one thing: free but not yet bookable"
  - "The D-96 floor is proven at its binding boundary (2h out → 1h SLA); a sub-floor input is unreachable through placeHold"
metrics:
  duration: ~75m
  completed: 2026-07-21
  tasks: 3
  commits: 6
---

# Phase 7 Plan 05: Lifecycle Expiry Correctness Summary

Closed the D-94 gap at all three hold-write sites — `expires_at = LEAST(now() + window, starts_at)` computed by Postgres, with the D-96 proportional split on the request path, mode-scoped lead-time guards enforced server-side, and a fourth `too_soon` slot state — while leaving the payment webhook byte-for-byte untouched.

## What Was Built

**Task 1 — `units.ts` (`608c3cc`).** Both hold paths now compute expiry as a SQL expression inside the insert, so the DB clock is genuinely the sole authority and the value is re-evaluated on each SAVEPOINT retry rather than captured once before the loop. The instant path is `LEAST(now() + ttl, starts_at)`; the request path is the D-96 split, `LEAST(now() + GREATEST(floor, LEAST(sla, (starts_at - now())/2)), starts_at)`. `ttlMs` now defaults **per mode** (`APPROVAL_SLA_HOURS` for a request, `HOLD_TTL_MS` for instant) so a caller omitting it cannot accidentally mint a 15-minute approval SLA. `HoldSuccess` carries the DB-computed `expiresAt` on every success path, including both idempotent-replay paths (`findOwnActiveHold` selects `expires_at`). Mode-scoped lead-time guards refuse server-side through the existing error channel.

**Task 2 — approve + checkout (`64f2eff`).** `approveRequest`'s UPDATE caps the payment window at `starts_at` and folds the D-93 minimum-approve-window guard into the same `WHERE`, so a too-late approve claims 0 rows and falls through the pre-existing calm `NOT_PENDING` path — no new error branch, and atomic with the status check so it cannot be raced (T-07-24). The 0-row path records `decline_reason = 'too_close_to_start'` via a separate status- and start-time-scoped non-throwing UPDATE. `confirmBooking` refuses once `starts_at` has passed, sourcing `now` from Postgres. The webhook is untouched, with the do-not-do-this rationale recorded beside the new guard.

**Task 3 — `too_soon` + tests (`e68047d`, `f6543bb`).** `SlotState` gains a fourth member with no `default` added to swallow it; `getAvailability` derives it from the listing's `bookingMode` against the same clock that drives `past`/`beyond_horizon`, and `DayAvailability` carries the mode so the picker's notice copy can never disagree with the enforced thresholds. Chip treatment is unchanged — muted, struck-through, `aria-disabled`, never red.

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| `HoldSuccess.expiresAt` type | `Date \| null`, not `Date` | The plan specified `Date`, but the replay path can return an already-`confirmed` booking, which has no hold expiry. `null` is the truth; `Date` would have let a consumer render `new Date(null)` as a silent Invalid Date — the exact class of failure Pitfall 8 warns about. The plan's grep criterion still passes. |
| Lead-guard placement | A computed column on the existing listing SELECT | The plan's snippet was a standalone `tx.execute`. That adds a statement between the own-hold pre-check and the insert, inside a transaction that races other bookers — see Deviation 1. Same clock, same transaction, ahead of every write, zero added round trips. |
| `too_soon` precedence | After the `freeUnits` check | A slot both occupied and near-term reads as `unavailable`; occupancy is the stronger fact and the pre-existing state. `too_soon` then means exactly one thing — genuinely free, just not yet bookable — and no existing slot classification moves. |
| D-96 floor test | Asserted at its binding boundary | A sub-floor request is unreachable through `createPendingHold` (the 2h lead guard refuses first), so the floor is proven where it actually binds: 2h out → half is 1h → `GREATEST` returns the floor exactly. Also asserted universally across the matrix. Details in Deviation 3. |
| Instant-path cap coverage | A tripwire assertion, not a fake test | With `MIN_LEAD_INSTANT_MINUTES` (30) > `HOLD_TTL_MINUTES` (15), the instant cap can never bite — the TTL always wins. Rather than pretend otherwise, the test asserts that constant relationship and says a matrix row is needed if it ever inverts. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The D-42 trap on the units-exhausted exit**

- **Found during:** Task 1 verification
- **Issue:** `tests/booking/pending-hold.test.ts`'s concurrent-same-key idempotency test began failing intermittently (2 failures in the first 5 loaded runs; the true pre-plan baseline was clean 6/6 under identical load). The loser returned `"That time was just taken."` instead of replaying the winner's booking. Root cause: the own-hold pre-check and the find-free probe are **separate statements**, and under READ COMMITTED each takes a fresh snapshot. A concurrent submit of the caller's *own* key/window can commit in between — the pre-check sees nothing, then the only unit reads as occupied *by the caller's own booking*, and `NoUnitAvailableError` maps to a false conflict. The `23P01`/`23505` handlers already re-checked own-hold for exactly this reason; the exhaustion path reaches its exit **without ever attempting an insert**, so it never hit those handlers.
- **Fix:** Two changes. First, the lead-time guard was moved from a standalone statement onto the existing listing SELECT as a computed column, so this plan adds **zero** round trips to the raced transaction. That alone was not sufficient — the window is inherent, not introduced. Second, both units-exhausted exits now route through an `exhausted()` helper that re-checks own-hold before throwing. A genuine loser (different booker, no matching key/window) still finds nothing and gets the honest "just taken"; the EXCLUDE remains the sole arbiter of the double-book.
- **Verification:** 15 consecutive loaded runs green (5 × three-suite at the end, 10 × immediately after the fix), against 2 failures in the first 5 before it.
- **Files modified:** `src/lib/availability/units.ts`
- **Commit:** `8379c45`

**2. [Rule 3 - Blocking] `tests/auth/secret-config.test.ts` cold-import timeout — OUT OF `files_modified`**

- **Found during:** the full-suite run
- **Issue:** The test failed on 3 consecutive full runs with `Test timed out in 5000ms`, while passing in isolation in 2.18s. Every test in the file does `vi.resetModules()` + a fresh dynamic `import("@/lib/auth")`, re-transforming the whole Better Auth + drizzle + schema graph from cold; the full suite is import-dominated (~157s of import time). 07-01 recorded this test flaking once and named a timeout bump as the fix "if it recurs". The two DB-backed integration files this plan adds pushed a known flake into a deterministic red.
- **Fix:** A named `COLD_IMPORT_TIMEOUT_MS = 30_000` applied to the file's three tests, with a comment recording that this is a cold-import budget and not a slow assertion. No assertion or behaviour changed.
- **Scope note:** Outside this plan's `files_modified` and unrelated in subject matter. Taken only because this plan's added load is what turned it red — leaving a consistently-failing suite would have misrepresented the state of the tree.
- **Commit:** `103366b`

### Plan-Text Deviations (deliberate, no correctness loss)

**3. `tests/booking/host-requests.test.ts` did not exist.** The plan says "EXTEND" it; the file was created. `approveRequest` coverage previously lived in `tests/booking/request-lifecycle.test.ts` § "host approve/decline server actions". The new file is scoped to the D-93/D-94 approve-time guards and clones that harness; the existing coverage is untouched and still green.

**4. The D-96 floor is proven at its binding boundary, not below it.** The plan's test 4 suggests `startsAt` 1.5h out, noting parenthetically that it may fall under the lead guard — it does (`MIN_LEAD_REQUEST_HOURS` is 2). The plan's fallback of a directly-inserted row would not exercise the SQL under test at all, since the expression only runs inside `createPendingHold`. Instead the floor is asserted where it actually binds (2h out → 1h SLA, exactly `MIN_APPROVE_WINDOW_HOURS`) plus universally across every accepted matrix row.

**5. Boundary cases are placed 2 seconds past the nominal offset.** The lead-time guard is a strict boundary and `now()` advances during the round trip, so a window sitting exactly *on* the boundary fails by milliseconds — a property of the boundary, not a defect. A named `GUARD_EPSILON_MS` keeps "at the boundary, permitted" cases deterministic, well inside the 5s assertion tolerance. All expiry expectations are derived from a `SELECT now()` reading rather than the JS clock, so host/Docker clock skew cannot make correct D-96 arithmetic look wrong.

## Pitfall 8 Audit (consumers of `createPendingHold`)

Every consumer was read. **No countdown was broken**, and the reason is worth recording: the two countdown surfaces — `src/app/listings/[id]/book/page.tsx:65` and `src/app/bookings/[id]/page.tsx:67` — read `booking.expiresAt` from the **database** in their own RSC SELECT, not from the action's return value. `src/app/actions/booking.ts` uses only `res.id` and redirects. So the DB-computed value was already the one reaching `HoldCountdown`/`RequestCountdown`. `HoldSuccess.expiresAt` is now populated regardless, and `expiry-cap.test.ts` asserts the returned value is byte-identical to the persisted row — closing the gap before a future caller relies on it.

## Verification Performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` (all modified source + test files) | clean |
| `npx vitest run tests/availability` (incl. the D-21 gate + new matrix) | **103 passed** |
| `npx vitest run tests/booking` | **82 passed** |
| `npx vitest run tests/paymongo` | **38 passed** |
| `grep -c "Date.now()" src/lib/availability/units.ts` | **0** |
| `grep -c "starts_at" src/app/api/paymongo/webhook/route.ts` | **0** (file diff: 0 lines) |
| D-57 guard test **mutation-verified** | adding `AND starts_at > now()` to the confirm UPDATE makes it FAIL; reverted |
| D-42 race stability, loaded three-suite | **5/5 green** (and 10/10 immediately post-fix) |
| **`npm test` (full suite)** | **63 files / 487 tests, all passing** |

The full suite was **red on three consecutive runs** before Deviation 2 (`1 failed | 486 passed`, always the same auth cold-import timeout, never an assertion) and is green on both runs after it.

### Acceptance criteria

All greps from all three tasks pass. Notable: `LEAST(` ×8 and `GREATEST(` ×2 in `units.ts`; `case "too_soon"` ×1 and `destructive|text-red` ×0 in `slot-picker.tsx`; `D-57 GUARD` ×1; `expiry-cap.test.ts` carries 27 `expect(` calls across 18 tests (criterion: ≥12).

## Known Stubs

None.

## Threat Flags

None. All new surface is covered by the plan's register (T-07-22..27). Specifically: `too_soon` is a read-model display state only, appears in no occupancy predicate, and the GiST EXCLUDE and both lazy-expiry sweeps are untouched (T-07-26, gated by 103 green availability tests); the lead-time guard is re-validated in-transaction on every submit with a UI-bypassing test (T-07-22); the JS-skew test is the direct proof for T-07-23.

## Commits

| Hash | Message |
|---|---|
| `608c3cc` | fix(07-05): cap both hold expiries at starts_at with the DB clock as sole authority |
| `64f2eff` | fix(07-05): cap the approval payment window and refuse post-start checkout |
| `8379c45` | fix(07-05): re-check own-hold on every units-exhausted exit (D-42 trap) |
| `e68047d` | feat(07-05): add the too_soon slot state with mode-scoped reason copy |
| `f6543bb` | test(07-05): expiry-cap boundary matrix, D-93 approve guard, D-57 webhook guard |
| `103366b` | test(07-05): give the auth cold-import tests a real timeout budget |

## For Downstream Plans

- **Anyone touching `units.ts`:** the file now holds **zero** JS clock reads and that is asserted by grep in this plan's criteria. Expiry is a SQL expression; do not reintroduce a JS-computed instant.
- **Search behaviour changed subtly.** `src/lib/search/query.ts` keeps a candidate on `state === "available"`. A slot inside its listing's notice window is now `too_soon`, so it no longer counts — correct (you cannot book it), and consistent with how `past` already behaved, but it is a real behaviour change on the search path.
- **Notification/email composers (07-09+):** `decline_reason = 'too_close_to_start'` is now written on the too-late-approve path. D-93 wants an honest "too close to start" message to **both** sides; only the reason column is written here, the composer is downstream.
- **`booking.expiresAt` on a request is no longer a flat 24h.** Under D-96 a request 4h out gets a 2h SLA and one 25h out gets 12.5h. Reminder offsets (`PRE_SLA_REMINDER_HOURS` = 6) can therefore be unreachable — 07-RESEARCH Pitfall 9 calls for a range-based due query and a no-send assertion.
- **D-99 (cap-shortened SLA shows a reason)** is NOT implemented here — this plan produced the varying deadlines that D-99 explains to the host, but `RequestCountdown` still renders them without the explanatory line.
- **`SlotPicker` gained a required `mode` prop.** Any new call site must pass it; `DayAvailability.bookingMode` is the intended source.
- **The inherited 07-04 gap is untouched as instructed.** Nothing here writes `space_price_cents`; freezing the price split at booking creation remains 07-08's work. No conflict was observed — this plan changes `expires_at` only.

## Self-Check: PASSED

Both created files verified present on disk (`tests/availability/expiry-cap.test.ts`, `tests/booking/host-requests.test.ts`) and all six commit hashes verified in `git log`.
