---
phase: 09-open-capacity-bookings
plan: 07
subsystem: api
tags: [server-actions, zod, drizzle, postgres, open-capacity, booking, security, paymongo]

# Dependency graph
requires:
  - phase: 09-01
    provides: "listing.occupancy_mode = open_capacity, booking.open_capacity, booking_no_overlap narrowed to open_capacity = false"
  - phase: 09-02
    provides: "createOpenCapacityHold (the admissions claim), loadOpenDayWindow, SOLD_OUT_MESSAGE, PAST_DATE_MESSAGE"
  - phase: 09-06
    provides: "the publish gate that guarantees an open listing has a per-head price, a positive cap, instant mode and unitCount 1"
  - phase: 09-08
    provides: "the settled src/app/actions/booking.ts after the composeWhenLabel census"
provides:
  - "openHoldSchema — the {listingId, date, requestedPasses, idempotencyKey} drop-in payload, with NO window shape at all"
  - "placeOpenHold — the OPEN-02 entry point: date + passes → a real pending hold with the GRANTED head count"
  - "Both occupancy-mode refusals: placeHold refuses open_capacity, placeOpenHold refuses exclusive — decided from the PERSISTED listing row (T-09-23)"
  - "PlaceHoldResult gains reason 'sold-out' carrying the single SOLD_OUT_MESSAGE literal (OC-13)"
  - "D-126: updateDeclaredPax refuses every open-capacity booking outright (PASSES_FIXED_MESSAGE)"
  - "tests/booking/open-capacity-hold.test.ts — 11 DB-backed cases, three production mutations executed RED"
  - "webhook-payment-paid gains the OC-09 case: an open booking confirms with the rail byte-unchanged"
affects: [09-09, 09-10, 09-11, 09-12, 09-13, 09-14, 09-15, 09-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two sibling mutations, one occupancy mode each, both gated on the persisted arbiter — refusals re-stated at each enforcement point rather than extracted"
    - "Absence-as-security in a Zod payload: the open path has no window fields, so Zod's unknown-key stripping IS the tamper defence"
    - "Adversarial test fixtures (a drop-in listing that still carries hourly/day/surcharge columns) so a deleted guard mints a real row instead of crashing"

key-files:
  created:
    - tests/booking/open-capacity-hold.test.ts
  modified:
    - src/lib/validation/booking.ts
    - src/app/actions/booking.ts
    - tests/validation/booking-schemas.test.ts
    - tests/paymongo/webhook-payment-paid.test.ts

key-decisions:
  - "placeOpenHold re-states placeHold's gates rather than sharing a helper — the gates ARE the security surface and must live where they are enforced"
  - "maxOccupancy / perHeadPriceCents were NOT added to either action's listing select: the cap and the rate are read inside the claim's transaction, and projecting them here would invite the misreading the comments warn against"
  - "The D-126 guard sits BEFORE the D-108 flat-listing short-circuit, or an open listing (no extra_head_fee) would report a silent {ok:true}"
  - "The open path emits NO notification — instant-only, booker is on-screen, receipt is the existing payment-paid webhook; stated in a comment so it never reads as an omission"
  - "Test fixtures deliberately give the drop-in listing leftover hourly/day/surcharge columns (reachable via an OC-17 mode switch) so the mutation proofs measure the real failure"

patterns-established:
  - "Every new open-capacity mutation reads listing.occupancy_mode from the row and refuses the other mode; the proof is a NO-ROW-WRITTEN assertion, never a copy match"
  - "Display-only URL params on the money path are annotated with the threat id and the reason the charge cannot follow them (T-09-24)"

requirements-completed: [OPEN-02, OPEN-03]

# Metrics
duration: 25min
completed: 2026-07-30
---

# Phase 09 Plan 07: The Drop-In Booking Mutation Summary

**`placeOpenHold` turns a DATE plus a pass count into a real pending hold through the admissions claim, and BOTH booking mutations now refuse the other occupancy mode — decided from the persisted listing row, proven by "no row was written", and measured by deleting each guard.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-30T10:47:16Z
- **Completed:** 2026-07-30T11:12:00Z
- **Tasks:** 3
- **Files modified:** 5 (4 modified, 1 created)

## Accomplishments

- **The cross-mode hole is closed at both ends, and the closure is measured.** `drizzle/0022` narrowed `booking_no_overlap` to `open_capacity = false`, so an open-capacity date is arbitrated by the admissions counter and by nothing else. Deleting `placeHold`'s refusal makes an exclusive-shaped payload MINT a hold on a drop-in listing (`RedirectError: NEXT_REDIRECT:/listings/L_oc_open/book?hold=00f896d3-…`) — a row the EXCLUDE cannot see and the counter never counted. Deleting `placeOpenHold`'s mirror mints an `open_capacity = true` row on an EXCLUSIVE listing (`…/listings/L_oc_excl_mode/book?hold=932da718-…`), which the same narrowed EXCLUDE then lets be double-booked. Both restored; `git diff --exit-code` clean.
- **The head count is fixed at hold time (D-126), and the mutation names the overbook.** `updateDeclaredPax` refuses every open-capacity booking before it reaches the re-quote. With the guard deleted the test fails `expected 4 to be 2` — `declared_pax` raised to the listing cap on a hold the claim granted 2 heads, with the price re-frozen to match. That is T-09-25 in one assertion.
- **The client can no longer describe a booking's window on the open path.** `openHoldSchema` has no window fields, so Zod strips a smuggled `startUtc`/`endUtc`/`fullDay` (asserted explicitly). The persisted `starts_at`/`ends_at` come from `loadOpenDayWindow` over the listing's own operating hours — proven equal to the venue's 06:00/22:00 instants by independent `+08` arithmetic.
- **The partial fill reaches the booker without touching the money.** A race that leaves 1 of 3 requested passes persists `declared_pax = 1`, freezes `per_head × 1`, and appends `&requested=3` to the reserve URL — annotated at the call site as display-only, with the reason the charge cannot follow it (T-09-24).
- **The PayMongo rail is provably untouched.** `git diff --exit-code HEAD -- src/app/api/paymongo/webhook/route.ts` exits 0, and a new case drives a `checkout_session.payment.paid` event against a pending drop-in booking: it flips to `confirmed`, and `declared_pax`, `open_capacity`, `unit`, `full_day`, both instants and the frozen triple are all unchanged, with the date's occupying SUM still exactly 3.
- **Suite:** 948 passed / 4 skipped (up from 928), `npx tsc --noEmit` 0, lint 0 errors / 7 baseline warnings.

## Task Commits

1. **Task 1: openHoldSchema — the date + passes payload** — `4dc3cfb` (feat)
2. **Task 2: placeOpenHold + the two mode refusals** — `f9ffc6c` (feat)
3. **Task 3: the D-126 step-up refusal + the hold/webhook integration proofs** — `722ddde` (feat)

## Files Created/Modified

- `src/lib/validation/booking.ts` — adds `openHoldSchema` + `OpenHoldInput`. `bookingCreateSchema` and `slotWindowShape` are byte-unchanged.
- `src/app/actions/booking.ts` — `PlaceHoldResult` gains `sold-out`; `placeHold`'s listing select gains `occupancyMode` and the open-capacity refusal; new `placeOpenHold`; `PASSES_FIXED_MESSAGE` + the D-126 guard in `updateDeclaredPax` (whose owner-gated select gains `openCapacity`).
- `tests/validation/booking-schemas.test.ts` — 8 new `openHoldSchema` cases (27 total in the file).
- `tests/booking/open-capacity-hold.test.ts` — 11 integration cases (created).
- `tests/paymongo/webhook-payment-paid.test.ts` — 1 new OC-09 case; the route file itself untouched.

## Decisions Made

1. **The gates are re-stated in `placeOpenHold`, not extracted.** The two payload shapes differ and the gates are the security surface; a shared helper would make one edit move both mutations at once. The docblock lists all seven in order so the duplication reads as deliberate.
2. **Neither action projects `max_occupancy` or `per_head_price_cents`.** The plan asked for both on `placeHold`'s select. They are read *inside* `createOpenCapacityHold`'s transaction, under the lock, against the live SUM — that is the whole Security-V4 story. An unread projection in a money-path action invites exactly the misreading ("the action bounds the request") the comments exist to prevent. Recorded as a deviation below.
3. **The D-126 guard precedes the D-108 flat-listing short-circuit.** An open listing has no `extra_head_fee`, so that branch would have returned `{ok:true}` having written nothing — a booker told "done" while the count did not move. The guard's own comment says so.
4. **`sold-out` is a distinct reason, everything else reuses `taken`.** Only `res.soldOut` (the OC-13 race loss) maps to the new reason; a closed/past date or an unknown listing keeps the shipped calm `taken` branch, so `PAST_DATE_MESSAGE` surfaces without a second notice pattern.
5. **The open path emits no notification.** Stated in a comment at the point of omission, with the three reasons (instant-only, the booker is on-screen, the receipt is the existing webhook's).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `maxOccupancy` / `perHeadPriceCents` deliberately NOT added to `placeHold`'s select**
- **Found during:** Task 2
- **Issue:** The plan's step (b) asks for all three columns on the existing listing select. `occupancyMode` is load-bearing (the refusal reads it); the other two are read by nobody in either action — the claim reads them itself, inside its transaction, which is the point of D-124 / Security V4. Two unread money/capacity columns sitting in a money-path action's select is a false affordance, and the plan's own Task-2 acceptance criterion (`quoteWindow|spacePriceCents:|quotedTotalCents:` must be 0 inside `placeOpenHold`) is written in the same spirit.
- **Fix:** Added `occupancyMode` only, with a comment naming what it is for.
- **Files modified:** `src/app/actions/booking.ts`
- **Verification:** All four of Task 2's mode/reason greps produce their specified values; `npx tsc --noEmit` 0.
- **Committed in:** `f9ffc6c`

**2. [Rule 2 - Missing Critical] The test fixtures were made ADVERSARIAL so the mutations measure the real failure**
- **Found during:** Task 3
- **Issue:** With the plan's fixture shapes, two of the three mutations passed for the wrong reason. Deleting `placeHold`'s refusal made `createPendingHold` **throw** (`Listing has no hourly rate for an hourly booking`) rather than mint a row — a red test that proves a crash, not an uncounted booking. Deleting `placeOpenHold`'s refusal hit the claim's NULL-cap fail-closed and returned `sold-out` — again red, again not the threat. Deleting the D-126 guard produced a silent `{ok:true}` rather than an overbook.
- **Fix:** The drop-in fixture keeps leftover `hourly_rate_cents` / `day_rate_cents` / `included` / `extra_head_fee`, and the exclusive fixture keeps leftover `max_occupancy` / `per_head_price_cents`. This is not artificial: OC-17 lets a host switch a priced listing between modes while no live booking exists, and the old columns are not wiped. Both fixtures carry a "DELIBERATELY ADVERSARIAL, DO NOT REMOVE" note explaining what each column buys.
- **Files modified:** `tests/booking/open-capacity-hold.test.ts`
- **Verification:** Re-measured — mutation A now mints a hold on the drop-in listing, mutation B mints an open row on the exclusive listing, mutation C reads `expected 4 to be 2`. All three restored, suite green.
- **Committed in:** `722ddde`

**3. [Rule 1 - Bug] Case 8 reordered to assert the DATABASE first**
- **Found during:** Task 3
- **Issue:** As written, the case asserted the returned shape before reading the row back, so the D-126 mutation failed with a copy mismatch (`expected {ok:true} to deeply equal {ok:false,…}`) instead of naming the overbook — the same anti-pattern 09-03/09-04 corrected.
- **Fix:** `declared_pax` and the frozen triple are asserted first, the result shape last.
- **Files modified:** `tests/booking/open-capacity-hold.test.ts`
- **Verification:** The mutation now fails `expected 4 to be 2`.
- **Committed in:** `722ddde`

**4. [Rule 3 - Blocking] Two of the plan's acceptance greps are unsatisfiable as stated**
- **Found during:** Task 2
- **Issue:** The sixth occurrence of this class in Phase 9.
  - `grep -c 'reason: "sold-out"' src/app/actions/booking.ts` is specified as `1` but is **2**: the plan itself prescribes both the type-union member (`reason: "sold-out";`) and the return (`reason: "sold-out",`), and the pattern matches both. Use `grep -c 'reason: "sold-out",'` for the single use.
  - The seven-gate census `sed -n '/export async function placeOpenHold/,/^}/p' … | grep -c "requireUserId\|canBook\|…"` is specified as `7` but is **8**, because `canBook` necessarily appears on two lines (the select projection and the `if (!me?.canBook)` check). All seven gates ARE present — verified individually with `grep -n` (lines 3, 10/11, 17, 31, 51, 70, 79 of the function).
- **Fix:** Code left idiomatic; the corrected expectations are recorded here for later plans.
- **Files modified:** none
- **Verification:** `grep -n` listing of the eight matching lines shows one line per gate plus the duplicated `canBook`.
- **Committed in:** n/a (documentation)

**5. [Rule 1 - Bug] `starts_at` from the raw postgres.js client is not a `Date`**
- **Found during:** Task 3
- **Issue:** The new webhook case read the row through `testDb.client` and called `.toISOString()` on `starts_at` → `TypeError: row.starts_at.toISOString is not a function`.
- **Fix:** Typed as `Date | string` and normalized with `new Date(...)` — the idiom `findOwnOpenHold` already uses in `units.ts`.
- **Files modified:** `tests/paymongo/webhook-payment-paid.test.ts`
- **Verification:** `npx vitest run tests/paymongo` 50 passed / 4 skipped.
- **Committed in:** `722ddde`

---

**Total deviations:** 5 (2 missing-critical, 2 bugs, 1 blocking-doc)
**Impact on plan:** No scope change. Two strengthen the security proofs, two are fixes found by running the mutations, and one is a plan-text correction. Every behavioural acceptance criterion the plan states is satisfied; two grep tripwires have corrected expected values recorded above.

## Issues Encountered

- **A drop-in listing can legitimately still carry hourly/day/surcharge columns.** `publishSchema` (09-06) *requires* a per-head price for an open listing but does not *clear* the exclusive rate columns, and OC-17 permits the mode switch while no live booking exists. That is why mutation A mints a real row rather than crashing — and it is the reason the two mode refusals are the only thing standing between a mode switch and an unarbitrated booking. Later plans should not assume "open listing ⇒ null rates".
- **`updateDeclaredPax` now has two refusals that look similar but are not.** `row.openCapacity` (D-126, an explicit sentence) and `(extraHeadFee ?? 0) <= 0` (D-108, a silent success). Their ORDER is load-bearing and is commented at the guard.

## Threat Flags

None. No new network surface, no new auth path, no schema change. `placeOpenHold` is a new server-action entry point but it is enumerated in this plan's own threat register (T-09-23 … T-09-27) and re-enforces every gate `placeHold` enforces; no PayMongo error text can reach the browser because the open path never calls PayMongo at all.

## Known Stubs

None. `placeOpenHold` is not yet wired to a UI — the drop-in CTA and the OC-07 reduction notice are 09-11/09-13 — but the action is complete, mode-gated and tested end to end against the shipped claim.

## User Setup Required

None - no external service configuration required.

## Self-Check: PASSED

All five listed files exist on disk; all three task commits (`4dc3cfb`, `f9ffc6c`, `722ddde`) resolve in `git log`. Verification re-run at close: full suite 948 passed / 4 skipped, `npx tsc --noEmit` 0, lint 0 errors / 7 baseline warnings, `git diff --exit-code HEAD -- src/app/api/paymongo/webhook/route.ts` exit 0.
