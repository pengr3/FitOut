---
phase: 09-open-capacity-bookings
plan: 17
subsystem: payments
tags: [open-capacity, drop-in, checkout, confirmBooking, paymongo, d-94, mutation-testing, playwright, vitest]

# Dependency graph
requires:
  - phase: 09-open-capacity-bookings
    provides: "the drop-in stack this fixes the seam of — `booking.open_capacity` + the narrowed EXCLUDE (09-01), `createOpenCapacityHold` and its own `expires_at` divergence (09-02), the forked read model's `bookable = dayCloseUtc > now` (09-04), `placeOpenHold` (09-07), the reserve-page fork (09-13), and the 5-case browser proof this extends (09-15)"
  - phase: 05-payments-checkout
    provides: "`confirmBooking`'s checkout-initiation shape — the D-94 cutoff, the Postgres-clock read, the owner-gated select, and D-57 (payment is the sole confirm authority)"
provides:
  - "CR-01 CLOSED: `confirmBooking`'s checkout-initiation cutoff is forked on the PERSISTED `booking.open_capacity` — `ends_at` for a drop-in pass, `starts_at` for an exclusive booking. A same-day pass is payable for the whole day it is valid for."
  - "NT-01 (booking.ts half) CLOSED: `This session has already started…` is now reachable only by an exclusive booking, which is the only booking it was ever true of; a closed drop-in day is refused in pass words."
  - "tests/booking/open-capacity-confirm.test.ts — a DB-backed gate driving the REAL `confirmBooking` with a same-day open row minted after opening, deterministic at ANY hour, mutation-measured."
  - "e2e/open-capacity.spec.ts case 6 — the browser proof now books a same-day pass, removing the `offset >= 3` blind spot, with the negative mutation recorded as evidence."
  - "deferred-items.md item 3 — the pre-existing `date-pass-picker` multi-suite timeout, baselined at HEAD."
affects: [09-18, 09-25, phase-verification, future-phases-touching-confirmBooking-or-open-capacity]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fork a shared guard on the PERSISTED mode column, never on the shape of the data (a null rate, a null declared_pax, full_day) — a drop-in listing may legally still carry exclusive rate columns (OC-17)"
    - "Assertion ORDER is part of a test's value: put the user-visible sentence first, so the mutation's failure message quotes the string the user would actually have read"
    - "A clock-relative fixture must be deterministic at EVERY hour, not merely at the hour the author ran it — `open = now-2h floored, clamped at midnight` + `close = 23:59` is the shape that holds all day"
    - "Record a NEGATIVE mutation result when a proof layer provably cannot catch a class of defect — it demonstrates the coverage boundary instead of asserting it"

key-files:
  created:
    - tests/booking/open-capacity-confirm.test.ts
  modified:
    - src/app/actions/booking.ts
    - e2e/open-capacity.spec.ts
    - .planning/phases/09-open-capacity-bookings/deferred-items.md

key-decisions:
  - "The cutoff forks on `booking.open_capacity` read through the drizzle schema object, so `tsc` types it and a dropped column is a compile error rather than a silent `undefined → falsy` that would treat a pass as a 16-hour reservation"
  - "`reason: \"expired\"` is kept for BOTH branches so `ReserveView.handleResult`'s shipped branch is untouched — only the sentence forks"
  - "The exclusive sentence and comparison are preserved byte-for-byte, and integration case 2 seeds an exclusive booking whose `ends_at` is in the FUTURE, so the sloppy 'fix' (widen the cutoff to ends_at for every mode) turns that case RED instead of silently weakening D-94"
  - "src/app/api/paymongo/webhook/route.ts is untouched by construction (`git diff -U0` on the route yields zero lines): payment remains the sole confirm authority (D-57), and no start-time or end-time condition may ever be added there"
  - "Integration case 3 uses YESTERDAY's full 00:00–23:59 window rather than the plan's illustrative 'today 00:00–00:01', because the latter is the one window shape that is NOT closed at every hour — a run between venue-local 00:00 and 00:01 would assert the wrong branch"
  - "e2e case 6 does NOT click `Confirm & pay`: the spec's documented money-path boundary stands, and clicking would mint a live sk_test_ checkout session from an automated run"

patterns-established:
  - "Pattern: when a same-day/edge-of-window path is the defect class, state the fixture rule that makes it reachable at ANY hour IN THE TEST ITSELF, and name the hour that hid the bug (01:31 Makati) so the constraint is not silently relaxed later"
  - "Pattern: a mutation whose observed output contradicts the plan's prediction is RECORDED, not reshaped — case 3 went RED where the plan expected GREEN because it asserts wording as well as refusal, which is strictly more coverage"

requirements-completed: [OPEN-02]

# Metrics
duration: 22min
completed: 2026-07-31
---

# Phase 9 Plan 17: Same-Day Drop-In Purchase (CR-01) Summary

**`confirmBooking`'s D-94 checkout-initiation cutoff now forks on the persisted `booking.open_capacity` — `ends_at` for a drop-in pass, `starts_at` for an exclusive booking — so a pass bought for today after the venue opened reaches PayMongo checkout instead of the hold-expired state, proven by a mutation-measured DB-backed gate and a same-day browser case.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-31T08:18Z (16:18 Makati)
- **Completed:** 2026-07-31T08:40Z (16:40 Makati)
- **Tasks:** 2/2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

### Task 1 — the fork, and the gate that proves it (`f09690c`)

`src/app/actions/booking.ts`:

- The owner-gated `confirmBooking` select gained `openCapacity: booking.openCapacity` and
  `endsAt: booking.endsAt` — both from the drizzle schema object, so `tsc` checks them. This is a
  `.select()`, not the raw projection that bit `bookings-query.ts`, so a dropped column is a compile
  error rather than `undefined → falsy`.
- The single comparison `bk.startsAt.getTime() <= nowFromDb.getTime()` became
  `const cutoff = bk.openCapacity ? bk.endsAt : bk.startsAt`. `nowFromDb` — the Postgres clock read — is
  byte-identical; only the instant it is compared against moved.
- The sentence forks with it: open → `This day's passes are no longer available. Check availability again.`;
  exclusive → the existing sentence, byte-for-byte. `reason: "expired"` is unchanged on both branches.
- The comment above the guard now states the three required facts in prose: a pass's `starts_at` is the
  venue's OPENING instant and its session runs until CLOSING (OC-03); this is the same divergence
  `createOpenCapacityHold` applies to `expires_at`, so the D-94 invariant is preserved rather than weakened;
  and the webhook mirror-warning below still stands unchanged (D-57 — no start-time or end-time condition
  may enter `src/app/api/paymongo/webhook/route.ts`). CR-01 is named.

`tests/booking/open-capacity-confirm.test.ts` (new, 465 lines) — the REAL `confirmBooking` against real
Postgres, `@/lib/paymongo` mocked, cloned from `confirm-double-submit.test.ts`:

1. **a same-day pass bought AFTER the venue has opened reaches checkout** — the hold is minted by the REAL
   `createOpenCapacityHold` for today's venue-local date, so the row is genuinely drop-in-shaped
   (`open_capacity = true`, `unit = 1`, `declared_pax = 2`, `starts_at` in the past, `ends_at` in the
   future, a frozen price triple). First assertion is on the user-visible sentence, then the redirect
   target, then the persisted row.
2. **an exclusive booking is still refused once its own session has started** — seeded with `ends_at` in
   the FUTURE, so widening the cutoff to `ends_at` for every mode turns it RED (T-09-51).
3. **a drop-in pass for a day that has already closed is refused, in pass words** — asserts the drop-in
   sentence and explicitly `not.toBe` the session sentence (NT-01).

The fixture is deterministic at ANY hour: `openTime` is the venue-local wall clock two hours ago floored to
the hour and clamped at midnight; `closeTime` is `23:59`. Fixture preconditions are enforced as THROWS in
`beforeAll`, not `expect`s, so a mis-computed window can never let case 1 pass vacuously.

### Task 2 — the browser proof books TODAY (`5096c06`)

`e2e/open-capacity.spec.ts` case 6: a real signed-in `canBook` booker (UI signup + captured storage state,
the `search-and-book.spec.ts` idiom) opens a dedicated same-day drop-in listing, picks **today** in the month
grid, keeps the stepper at its reset value of 1 pass, clicks *Book this space*, and lands on a reserve page
that renders `₱…/person × 1 pass`, a `Total`, a live `Held for` countdown, and `Confirm & pay` **present and
enabled** — with no hold-expired copy anywhere. The listing carries its own space type, title, cap and
operating-hours window, so cases 1-5 are untouched in behaviour as well as in bytes.

## Mutations Executed

### Task 1 — the POSITIVE mutation (the CR-01 gate)

Reverted the fork in `src/app/actions/booking.ts` (single `starts_at` comparison, single sentence) and ran
`npx vitest run tests/booking/open-capacity-confirm.test.ts`. Observed output, VERBATIM:

```
 ❯ tests/booking/open-capacity-confirm.test.ts (3 tests | 2 failed) 2692ms
     × (1) a same-day pass bought AFTER the venue has opened reaches checkout 53ms
     × (3) a drop-in pass for a day that has already CLOSED is refused, in pass words 12ms

 FAIL  tests/booking/open-capacity-confirm.test.ts > CR-01 — a drop-in pass for TODAY is payable for the whole day it is valid for > (1) a same-day pass bought AFTER the venue has opened reaches checkout
AssertionError: expected 'This session has already started, so …' to be null

- Expected:
null

+ Received:
"This session has already started, so it can't be paid for now. Check availability again."

 ❯ tests/booking/open-capacity-confirm.test.ts:407:43
    405|     // with the fork reverted it is the assertion that fails, and its …
    406|     // booker would have read on the reserve page — not a generic "exp…
    407|     expect(outcome.result?.error ?? null).toBeNull();
       |                                           ^

 FAIL  tests/booking/open-capacity-confirm.test.ts > CR-01 — a drop-in pass for TODAY is payable for the whole day it is valid for > (3) a drop-in pass for a day that has already CLOSED is refused, in pass words
AssertionError: expected { ok: false, reason: 'expired', …(1) } to deeply equal { ok: false, reason: 'expired', …(1) }

- Expected
+ Received

  {
-   "error": "This day's passes are no longer available. Check availability again.",
+   "error": "This session has already started, so it can't be paid for now. Check availability again.",
    "ok": false,
    "reason": "expired",
  }

 Test Files  1 failed (1)
      Tests  2 failed | 1 passed (3)
```

The failure message contains the required substring `to be null` and quotes the exact sentence a booker
would have read on the reserve page. Case 2 stayed GREEN as predicted. **Case 3 went RED, where the plan
predicted GREEN** — see Deviations. The fork was restored and `git diff --exit-code src/` printed nothing.

### Task 2 — the NEGATIVE mutation (the recorded evidence)

With the CR-01 fork reverted in `src/app/actions/booking.ts`, e2e case 6 was run again. Observed, VERBATIM:

```
Running 1 test using 1 worker

  ok 1 [chromium] › e2e\open-capacity.spec.ts:643:7 › drop-in (open-capacity) booking surface — OPEN-01..04 › 6 · a pass for TODAY can be bought after the venue has already opened (CR-01) (9.8s)

  1 passed (25.7s)
```

**It PASSES with the bug present.** That is the artifact this task was asked to produce, and it is the
direct answer to "a green browser proof (21/21) did not catch CR-01": the defect lives on the click that
leaves for PayMongo, and `Confirm & pay` opens a hosted checkout Playwright cannot drive. The browser layer
demonstrates — rather than asserts — that it is structurally incapable of catching this class, which is why
the gate is `tests/booking/open-capacity-confirm.test.ts` case 1. The fork was restored; `git diff
--exit-code src/` printed nothing and `git status --short -- src/` was empty.

## Verification

| Gate | Result |
|------|--------|
| `grep -c "openCapacity: booking.openCapacity" src/app/actions/booking.ts` | `2` ✅ (was 1) |
| `grep -c "endsAt: booking.endsAt" src/app/actions/booking.ts` | `2` ✅ (was 1) |
| `grep -c "This session has already started" src/app/actions/booking.ts` | `1` ✅ (preserved) |
| `grep -c "This day's passes are no longer available" src/app/actions/booking.ts` | `1` ✅ |
| `git diff -U0 src/app/api/paymongo/webhook/route.ts \| wc -l` | `0` ✅ (D-57 untouched) |
| `git diff -U0 src/app/actions/booking.ts \| grep '^-' \| grep -c "nowRows\|SELECT now()"` | `0` ✅ (Postgres clock kept) |
| `npx vitest run tests/booking/open-capacity-confirm.test.ts` | **3 passed** ✅ |
| test-file header contains the verbatim mutation output incl. `to be null` | ✅ |
| `npx vitest run tests/booking tests/payments tests/availability` | 570 passed, 1 pre-existing failure ⚠️ (see Deviations) |
| `npx tsc --noEmit` | `0` ✅ |
| `npm run lint` | 0 errors / 7 baseline warnings ✅ |
| `grep -c 'test("6 · ' e2e/open-capacity.spec.ts` | `1` ✅ |
| `grep -c "dayAt(0)" e2e/open-capacity.spec.ts` | `2` (≥ 1) ✅ |
| `grep -cE 'test\("[1-5] · ' e2e/open-capacity.spec.ts` | `5` ✅ (unrenumbered) |
| `git diff -U0 e2e/open-capacity.spec.ts \| grep '^-' \| grep -c "Spots available"` | `0` ✅ (case 2 untouched) |
| `npx playwright test e2e/open-capacity.spec.ts` | **6 passed** ✅ |
| `git status --short -- src/` after both mutations | empty ✅ |

## Deviations from Plan

### 1. [Recorded, not absorbed] The Task-1 mutation moved case 3 as well as case 1

- **Found during:** Task 1(e), the mandatory mutation.
- **Plan's prediction** (`09-17-PLAN.md:213`): "Cases 2 and 3 stay GREEN … case 3 because a closed day
  fails either comparison."
- **Observed:** case 3 went **RED**. The plan's reasoning is correct about the *refusal* — a closed day is
  refused under either comparison — but case 3 asserts the refusal **and its wording**, and the mutation
  deletes the drop-in sentence along with the fork.
- **Disposition:** recorded verbatim in both the test-file header and above. Deleting the wording assertion
  to match the prediction would have thrown away real coverage: as written, the NT-01 pass-vs-session copy
  fork is itself mutation-covered rather than merely asserted. This is a strictly stronger result than the
  plan asked for.
- **Files:** `tests/booking/open-capacity-confirm.test.ts` (header), this SUMMARY.

### 2. [Determinism] Integration case 3 uses yesterday's window, not "today 00:00–00:01"

- **Found during:** Task 1(d), writing case 3.
- **Plan text** (`09-17-PLAN.md:201-203`): "seed hours that both opened AND closed earlier today (e.g.
  `00:00:00`–`00:01:00`) so `ends_at < now`".
- **Issue:** that is the one window shape that is **not** closed at every hour. A run between venue-local
  00:00:00 and 00:01:00 would find it still open and the case would assert the wrong branch — reintroducing
  exactly the hour-dependence this plan exists to eliminate.
- **Fix:** yesterday's venue-local date with a full `00:00–23:59` window, which has closed at every instant
  of today. The property case 3 needs (`ends_at < now` on an `open_capacity` row) is unchanged, and the
  mutation behaviour is unchanged. Reasoning is stated in a comment at the constant.
- **Files:** `tests/booking/open-capacity-confirm.test.ts`.

### 3. [Rule 3 — blocking] `seedListing` in the e2e spec gained two optional arguments

- **Found during:** Task 2(a).
- **Issue:** `seedListing` hard-coded `SPACE_TYPE` and a 7-day 06:00–22:00 hours loop. Case 6 needs its own
  space type (to stay out of cases 3/5's category-scoped search counts) and a same-day already-opened
  window.
- **Fix:** two OPTIONAL parameters, `spaceType` and `hours`, whose defaults reproduce the previous
  behaviour exactly. Cases 1-5 seed byte-identically; the `git diff` tripwire on case 2's `Spots available`
  assertion prints `0`.
- **Files:** `e2e/open-capacity.spec.ts`.

### 4. [Out of scope — logged, not fixed] A pre-existing multi-suite test timeout

- **Found during:** Task 1's regression gate.
- **Issue:** `tests/availability/date-pass-picker.test.tsx > (4)` fails with `Test timed out in 5000ms`
  when `tests/booking tests/payments tests/availability` are run together. It passes 9/9 in ~13s alone.
- **Proven pre-existing, measured not assumed:** with `src/app/actions/booking.ts` reverted to HEAD and the
  new test file moved out of the tree, the identical command fails the identical case
  (`1 failed | 567 passed (568)`). With 09-17's changes the counts are `1 failed | 570 passed (571)` — the
  **same single** failure. So no pre-existing test is *newly* failing, which is the criterion this plan owes.
- **Disposition:** logged as item 3 in the phase's `deferred-items.md` with the baseline evidence and the
  likely fix (a per-case timeout, not a source change). Not fixed here — it is a jsdom component test that
  touches nothing this plan modifies.

## Threat Model Outcomes

| Threat ID | Disposition | Outcome |
|-----------|-------------|---------|
| T-09-50 | mitigate | **Closed.** The cutoff forks on the persisted `open_capacity`; integration case 1 is the gate and is mutation-measured. |
| T-09-51 | mitigate | **Closed.** Case 2 refuses an exclusive booking past its own start, asserts the preserved sentence verbatim and a NULL `checkout_session_id` on read-back, and is seeded with `ends_at` in the future so a mode-blind widening fails it. |
| T-09-52 | mitigate | **Closed.** The branch reads the persisted column through the drizzle schema object (`tsc`-checked); the acceptance grep pins the projection line; the test listing deliberately keeps `hourly_rate_cents`/`day_rate_cents`, so a fork keyed on a null rate could not pass. |
| T-09-53 | accept (guarded) | **Holds.** `git diff -U0 src/app/api/paymongo/webhook/route.ts` yields zero lines; the `handleGoneSlot` auto-refund backstop is unchanged. |
| T-09-SC | mitigate | **No package was installed by this plan.** The Package Legitimacy Gate was never triggered. |

## Known Stubs

None. No hardcoded empty value, placeholder string or unwired data source was introduced.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary was
introduced — the only surface touched is an existing authenticated server action's refusal condition.

## What This Does NOT Close

- **CR-02, CR-04, CR-05, CR-06** and the 5 warnings / 3 info findings — plans 09-18 … 09-25.
- **The `cancel-booking.ts` half of NT-01** — 09-25's, together with WR-05.
- **A live same-day PayMongo charge.** The fix is proven at the integration layer against a mocked
  provider and at the browser layer up to (not through) the hosted checkout. A real `sk_test_` same-day
  drop-in payment is a human-UAT step, not an automatable one.

## For the Next Plan (09-18)

`src/app/actions/booking.ts` is also in 09-18's `files_modified`. 09-17 landed first, as the plan's
execution-order note requires. **Re-read the file** — do not work from its pre-09-17 shape. The changes are
confined to `confirmBooking` (the owner-gated select gained two columns; the D-94 guard gained a `cutoff`
local and a ternary sentence); `placeOpenHold`, which 09-18 edits, is untouched.

## Self-Check: PASSED

- `src/app/actions/booking.ts` — FOUND (modified)
- `tests/booking/open-capacity-confirm.test.ts` — FOUND (created, 465 lines ≥ 120 min_lines)
- `e2e/open-capacity.spec.ts` — FOUND (modified)
- `.planning/phases/09-open-capacity-bookings/deferred-items.md` — FOUND (modified)
- Commit `f09690c` — FOUND
- Commit `5096c06` — FOUND
- `git status --short -- src/` — empty (both mutations restored)
