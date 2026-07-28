---
phase: 08-group-bookings
plan: 15
subsystem: booking
tags: [typescript, drizzle, postgres, rsc, server-actions, inngest, vitest, group-bookings, notifications]

# Dependency graph
requires:
  - phase: 07-bookings-management-cancellation-notifications
    provides: "07-02 the single venue-local composeWhenLabel/composeWhenLabelShort formatter; 07-08 the spacePriceCents-not-quotedTotalCents correction; 07-17 / WR-06 the persisted booking.full_day column (drizzle 0016)"
  - phase: 08-group-bookings
    provides: "08-05 the D-108 pax surcharge, the two inline fixes in book/page.tsx + bookings/[id]/page.tsx, and the positive-day-rate-match idiom this plan generalises; 08-13/08-14 the current shapes of actions/group.ts and bookings/[id]/group/page.tsx"
provides:
  - "composeWhenLabel/composeWhenLabelShort render the full-day-vs-hour-range choice from the PERSISTED booking.full_day snapshot and from nothing else"
  - "WhenLabelInput.fullDay is a REQUIRED field and hourlyRateCents is REMOVED, so tsc — not a reviewer — enumerates every call site that must supply the snapshot"
  - "a pre-0016 fallback that is a POSITIVE day-rate match, never an inequality against a price"
  - "the surcharged-hourly regression case (tests/booking/when-label.test.ts), which had no equivalent before"
  - "booking.full_day + listing.day_rate_cents on GroupByToken, OwnedGroup, BookingListRow, the reminders DueReminder row type and eight other projections"
affects: [08-17, phase-09, any-surface-rendering-a-booking-window]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A required field on a shared input type is a COMPILER-ENFORCED call-site census: removing the old field rather than deprecating it is what makes tsc point at all eighteen projections"
    - "A displayed scheduling fact is read from its own persisted snapshot, never inferred from a money column that a pricing change can move"
    - "The pre-0016 legacy fallback is a POSITIVE match (=== dayRateCents) so it can only ever ADD 'Full day' on an exact coincidence — an inequality can mislabel, a positive match cannot"

key-files:
  created: []
  modified:
    - src/lib/booking/when-label.ts
    - tests/booking/when-label.test.ts
    - src/lib/group/rsvp.ts
    - src/lib/booking/bookings-query.ts
    - src/app/invite/[token]/page.tsx
    - src/app/actions/group.ts
    - src/app/(app)/bookings/[id]/group/page.tsx
    - src/app/(app)/bookings/page.tsx
    - src/app/(app)/bookings/[id]/cancel/page.tsx
    - src/app/actions/booking.ts
    - src/app/actions/host-requests.ts
    - src/app/actions/cancel-booking.ts
    - src/app/actions/re-request.ts
    - src/app/(host)/host/requests/page.tsx
    - src/app/(host)/host/bookings/page.tsx
    - src/app/(host)/host/bookings/[id]/page.tsx
    - src/inngest/functions/reminders.ts
    - src/inngest/functions/request-expiry.ts
    - src/app/api/paymongo/webhook/route.ts

key-decisions:
  - "CR-01 COMPOSES with 08-05 rather than reverting it: the positive day-rate-match fallback 08-05 shipped inline is what MOVED into when-label.ts. book/page.tsx and bookings/[id]/page.tsx are byte-untouched and still pass their own grep tripwires"
  - "hourlyRateCents is REMOVED from WhenLabelInput, not deprecated in place — leaving it would let a call site keep feeding the old inference silently, and would not make tsc name the call sites"
  - "The pre-0016 fallback stays a POSITIVE day-rate match. Dropping it outright (`?? false`) would relabel legacy NULL-full_day full-day bookings as an hour range; making it an inequality reintroduces CR-01 on legacy rows. Both directions are mutation-pinned"
  - "A projection that carried hourlyRateCents ONLY to feed this formatter had the field DROPPED from its view type (rsvp.ts both views, bookings-query.ts, the cancel page, host-requests, cancel-booking, the three host pages, reminders, request-expiry, the webhook) — a projection still selecting the hourly rate is exactly what a future reader would re-wire an inequality onto"
  - "re-request.ts keeps its hourlyRateCents: it has a SECOND, non-formatter consumer (the WR-06 price-determining local fallback feeding quoteWindow). Its compose call reuses the fullDay it already minted the hold with rather than re-projecting the column"
  - "placeHold passes `fullDay ?? false` — byte-identical to what createPendingHold applies before freezing booking.full_day — rather than widening createPendingHold's RETURNING, which is out of this plan's scope"

metrics:
  duration: ~35 min
  completed: 2026-07-28
  tasks_completed: 3
  files_modified: 19
  tests_before: 835
  tests_after: 838
---

# Phase 08 Plan 15: CR-01 — the persisted full-day snapshot Summary

`composeWhenLabel` now reads the booking's own persisted `full_day` column instead of inferring the mode from a money column, so a surcharged hourly booking states its real time range on all eighteen surfaces.

## What Was Built

**The defect.** `quoteWindow` returns `totalCents = baseCents + surchargeCents` and `createPendingHold` freezes that whole figure into `spacePriceCents`. The shared formatter then re-derived the mode by *inequality*: `fullDay = hourlyTotal == null || spaceCents !== hourlyTotal`. For an hourly booking with `extraHeadFee > 0` and `declaredPax > included`, `spaceCents` is `rate × hours + surcharge`, which **by construction** is not equal to `rate × hours` — so the formatter concluded "Full day" and printed it instead of `8:00 AM – 10:00 AM`.

**Task 1 — the formatter.** `WhenLabelInput` gained a **required** `fullDay: boolean | null` (the persisted drizzle-0016 snapshot) and **lost** `hourlyRateCents`, replaced by `dayRateCents: number | null`. The derivation became:

```ts
const fullDay = input.fullDay ?? (input.dayRateCents != null && spaceCents === input.dayRateCents);
```

The header comment block was **rewritten, not appended to** — its previous text ("`fullDay` is NOT persisted, so it is re-derived from the frozen SPACE PRICE … This is the shipped behaviour; do not 'improve' it") had become the bug's own defence. The replacement states that `full_day` IS persisted and is the authority, that the price comparison survives only as a pre-0016 positive day-rate match, and why an inequality can never come back. Per the repo's grep-tripwire discipline (08-05 deviation 5), the removed identifier is spelled nowhere in the file, comments included: `grep -c "hourlyRate" src/lib/booking/when-label.ts` prints **0**.

The test file went from 11 to 14 cases, keeping every property it already pinned (venue tz, the `EEEE`/`EEE` split, the en-dash, the omitted city suffix, the `quotedTotalCents` fallback) and adding the seven behaviours the plan named. The load-bearing one is the CR-01 case: an hourly 2-hour window whose `spacePriceCents` is `rate × hours + surcharge`, with `fullDay: false`, must render `8:00 AM – 10:00 AM`.

**Tasks 2 and 3 — eighteen call sites.** Each got the same three mechanical changes: project `booking.full_day`, project `listing.day_rate_cents` where absent, and swap the compose call's `hourlyRateCents` for `fullDay` + `dayRateCents`. Where a projection carried the hourly rate **only** to feed this formatter, the field was dropped from the view type as well — a projection that still selects it is exactly what a future reader would re-wire an inequality onto. Stale comments restating the old contract were rewritten in `bookings-query.ts`, `rsvp.ts`, `actions/booking.ts`, `host/requests/page.tsx`, `request-expiry.ts` and the PayMongo webhook.

## Key Implementation Details

1. **`tsc` was deliberately RED between Task 1 and Task 3, and that was the mechanism.** Making `fullDay` required and deleting `hourlyRateCents` produced exactly **10 errors across 10 files** after Task 1 — the compiler's own census of the call sites. Task 2 cleared 8 files (its scoped gate: zero errors matching its own file list, with Task-3 errors still expected); Task 3 cleared the rest and proved the repository green. An optional field would have let a call site silently omit the snapshot and keep the bug alive on that one surface.

2. **`re-request.ts` was the special case in the good direction.** It already read `booking.fullDay` and `listing.dayRateCents` for its own pre-0016 fallback at `:234`. Its `hourlyRateCents` was **kept** — it has a real second consumer (that fallback, which feeds `quoteWindow`, a price-determining read, a different concern from display). Its compose call reuses the local `fullDay` that `createPendingHold` had just frozen into the new row, rather than adding a second projection of the same columns.

3. **`placeHold`'s notification passes `fullDay ?? false`.** `createPendingHold` applies exactly that `?? false` before persisting, so this is the persisted snapshot value itself, not a re-derivation. The alternative — widening `createPendingHold`'s `RETURNING` to include `full_day` — would have touched `units.ts`, outside this plan's file list.

4. **`reminders.ts` moved as one unit.** Its documented `DueReminder` row type, both SQL projections and the `hydrate()` mapper were updated together — the file's own header warns that a reminder composing from a partial row is its failure mode.

5. **`booking.ts`'s `updateDeclaredPax` and the listings/search/pricing surfaces keep `hourlyRateCents`.** The acceptance grep is scoped to formatter consumers: `grep -rn "hourlyRateCents" src/ | grep -c "composeWhenLabel"` prints **0**, while the three remaining files that carry both strings (`actions/booking.ts`, `actions/re-request.ts`, `db/schema.ts`) are the `quoteWindow` re-price, the WR-06 local fallback, and the column definition — none of them display consumers.

## Mutations (recorded red → green)

**Mutation A — replace the derivation with the old inequality.**

```ts
// src/lib/booking/when-label.ts:87
- const fullDay = input.fullDay ?? (input.dayRateCents != null && spaceCents === input.dayRateCents);
+ const fullDay = input.dayRateCents == null || spaceCents !== input.dayRateCents;
```

The old shape verbatim (`rate == null || spaceCents !== rateTotal`), with the only rate the module still carries. **RED — 12 failed / 2 passed.** The CR-01 case's own message names the truth, not a proxy:

```
FAIL  tests/booking/when-label.test.ts > CR-01 REGRESSION: a D-108 per-head surcharge
      does NOT turn an hourly booking into 'Full day'
AssertionError: expected 'Thursday, Jul 2, Full day (Makati tim…' to be 'Thursday, Jul 2, 8:00 AM – 10:00 AM (…'

Expected: "Thursday, Jul 2, 8:00 AM – 10:00 AM (Makati time)"
Received: "Thursday, Jul 2, Full day (Makati time)"
```

Restored → **GREEN, 14/14.**

**Mutation B — flip the pre-0016 fallback from a positive match to an inequality.**

```ts
- ... && spaceCents === input.dayRateCents);
+ ... && spaceCents !== input.dayRateCents);
```

**RED — 4 failed / 10 passed.** The non-matching-price legacy case:

```
FAIL  tests/booking/when-label.test.ts > pre-0016 row (fullDay null): a NON-matching price
      renders the time range, never 'Full day'
AssertionError: expected 'Thursday, Jul 2, Full day (Makati tim…' to be 'Thursday, Jul 2, 8:00 AM – 10:00 AM (…'

Expected: "Thursday, Jul 2, 8:00 AM – 10:00 AM (Makati time)"
Received: "Thursday, Jul 2, Full day (Makati time)"
```

Restored → **GREEN, 14/14**, `git diff --exit-code src/lib/booking/when-label.ts` clean against the pre-mutation copy.

Both messages name the rendered string, which is the actual defect a person would have read on the invite page, rather than a downstream proxy — the assertion-ordering lesson 08-13, 08-14 and 08-16 each had to relearn.

## Verification Results

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0**, zero errors repository-wide |
| `npm run lint` | **0 errors / 7 warnings** — the exact pre-existing baseline, no new warnings |
| `npx vitest run` (full, no `DATABASE_URL` override) | **96 files / 838 tests, exit 0** |
| `npm run build` | **exit 0**, bare, 27 routes, no env workaround |
| `grep -c "hourlyRate" src/lib/booking/when-label.ts` | **0** |
| `grep -n "input.fullDay ??" src/lib/booking/when-label.ts` | matches at `:87` |
| `grep -c "hourlyRateCents" src/lib/group/rsvp.ts src/lib/booking/bookings-query.ts` | **0** for both |
| `grep -n "fullDay" src/app/actions/group.ts` | matches inside `whenLabelFor` (`:185`) |
| `grep -rn "hourlyRateCents" src/ \| grep -c "composeWhenLabel"` | **0** |
| `tests/group/group-owner-scope.test.ts` | 18/18 — every owner-scope predicate unchanged |
| `tests/booking/notify-emission.test.ts` (incl. the `:486` "must NOT read Full day" case) | green inside the full suite |
| `tests/notifications/reminders.test.ts` | green inside the full suite |
| 08-05's two inline fixes untouched | `git diff` empty for `listings/[id]/book/page.tsx` and `(app)/bookings/[id]/page.tsx`; their own tripwire greps still print 0 |

**Test count: 835 before → 838 after** (96 files, unchanged; `when-label.test.ts` went 11 → 14 cases).

## Deviations from Plan

**None affecting scope or behaviour.** Three judgement calls worth recording:

**1. [judgement] Mutation A was expressed with `dayRateCents` rather than by temporarily restoring `hourlyRateCents`.**
The plan asked for "replacing the derivation with the old inequality". Restoring the removed field would have required editing the test fixture too, so the mutation instead reproduced the old derivation's exact **shape** — `rate == null || spaceCents !== rateTotal` — against the only rate the module still carries. It is a single-file, executable mutation that fails the CR-01 case for precisely the CR-01 reason, and it also proves the reverse: any inequality here, against any rate, breaks the surcharged-hourly case.

**2. [judgement] `re-request.ts` kept `hourlyRateCents`, per the plan's own instruction to grep before dropping.**
The plan's rule was "drop the field where it existed ONLY to feed this formatter; if another consumer reads it, keep it". `re-request.ts:233` is such a consumer (its local WR-06 fallback feeding `quoteWindow`). Left untouched, as the plan directed.

**3. [judgement] The `fullDay: null` + `dayRateCents: null` case INVERTS the pre-08-15 expectation, deliberately.**
The old test asserted "renders 'Full day' when there is no rate to compare against" — a bias that belonged to the deleted inequality. Under a positive match, nothing to match against means the window shows what it actually is. The new case asserts the range and says so in a comment, so a future reader does not read the inversion as a regression.

**No CLAUDE.md-driven adjustments were needed** — no packages added or upgraded (T-08-SC `accept` holds), no migrations, no raw-SQL constructs beyond two additional projected columns.

## Threat Model Outcome

| Threat ID | Disposition | Outcome |
|---|---|---|
| T-08-52 | mitigate | **Closed.** The mode is read from `booking.full_day`; the price comparison survives only as a pre-0016 positive day-rate match. Both halves mutation-verified above. |
| T-08-53 | mitigate | **Closed.** `fullDay` is required and `hourlyRateCents` is gone, so a future surface that forgets the snapshot cannot compile. Demonstrated: the change produced 10 compiler errors across 10 files, which is the call-site census. |
| T-08-54 | mitigate | **Held.** The only fields added to the public `GroupByToken` view are `booking.full_day` (a scheduling flag) and `listing.day_rate_cents` (an already-public listing rate). No address, no identity, no new money column. WR-06's separate `organizerEmail` concern was not widened. |
| T-08-55 | mitigate | **Held.** Task 2's gate was a scoped `tsc` error count over its own file list (printed 0 while 10 Task-3 errors remained); Task 3's was repository-wide `tsc` + the full suite + a bare `npm run build`. |
| T-08-SC | accept | **Held.** No packages added or upgraded. |

No new threat surface was introduced: this plan adds no endpoint, no auth path, no file access and no schema change.

## Issues Encountered

None blocking. The `tsc`-vs-vitest trap that hit 08-12, 08-13 and 08-14 did **not** recur here — because this plan's mechanism *is* a type change, `tsc` was run as the primary signal at every step rather than as an afterthought, and the deliberate mid-plan red was tracked file-by-file rather than treated as noise.

## Next Phase Readiness

- **08-17 (the pax-surcharge UAT checkpoint) is unblocked and is now the phase's last plan.** Its walkthrough will read real time ranges on the invite page and in the RSVP emails; before this plan, a listing with `extra_head_fee` configured would have shown the UAT operator "Full day" on every one of those surfaces, which would have made the surcharge walkthrough itself misleading. The standing fixture requirement is unchanged and now doubly important: the UAT listing must set **both** `extra_head_fee` **and** `max_occupancy >= 2` (08-10 + 08-14 warnings), or there is no surcharge to observe.
- **A new required field is a standing contract for phase 9.** Any new time surface must project `booking.full_day` and `listing.day_rate_cents`. It cannot forget: the compiler will refuse it.
- **Legacy pre-0016 rows still take the fallback path.** There is no backfill and none is planned — the positive match is safe by construction (it can only add "Full day" on an exact day-rate coincidence). If a backfill is ever run, the fallback becomes dead code and can be deleted, but not before.
- **`deferred-items.md` is unchanged by this plan.** No new deferred items; none closed.

## Self-Check: PASSED
- Files verified on disk: `src/lib/booking/when-label.ts`, `tests/booking/when-label.test.ts`, `src/lib/group/rsvp.ts`, `src/inngest/functions/reminders.ts`, `.planning/phases/08-group-bookings/08-15-SUMMARY.md`
- Commits verified in git log: `8d2e8a5` (Task 1), `cfb351a` (Task 2), `9cedc2f` (Task 3), `5564c23` (SUMMARY)
