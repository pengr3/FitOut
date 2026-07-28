---
phase: 08-group-bookings
plan: 14
subsystem: ui
tags: [postgres, drizzle, react, rsc, vitest, jsdom, testing-library, group-bookings]

# Dependency graph
requires:
  - phase: 08-group-bookings
    provides: "08-01/08-02 booking_group + capacity_snapshot + the D-112 seat-claim; 08-05 declaredPax/extraHeadFee pricing; 08-07 the organizer management surface (meter, roster, nudge); 08-11 the resolved-token RSVP budget"
provides:
  - "capacity_snapshot now reserves the organizer's own place: GREATEST(l.max_occupancy - 1, 0), frozen inside the same INSERT that creates the group"
  - "a >= 2 capacity floor in BOTH the createGroup pre-read gate and the INSERT's own WHERE (no unjoinable, immutable capacity_snapshot of 0)"
  - "the audited meta.capacity is the SNAPSHOTTED cap read back off RETURNING, not the listing's raw rating"
  - "one organizer-inclusive convention across the headcount meter, the roster's documentation and the renamed TopUpNudge attendingTotal prop"
  - "tests/group/top-up-nudge.test.tsx — a two-layer jsdom component test (rendered behaviour + a shipment check on the page's wiring)"
affects: [08-15, 08-17, phase-09, any-surface-rendering-a-group-headcount]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The organizer-inclusive/exclusive convention is now stated at every site that depends on it, and the `+ 1` lives at exactly one call site"
    - "A component test carries TWO separable layers: rendered behaviour, plus a source-level shipment check that the real call site wires it correctly"

key-files:
  created:
    - tests/group/top-up-nudge.test.tsx
  modified:
    - src/app/actions/group.ts
    - src/app/(app)/bookings/[id]/group/page.tsx
    - src/components/group/top-up-nudge.tsx
    - src/components/group/headcount-meter.tsx
    - src/components/group/attendee-roster.tsx
    - tests/group/group-lifecycle.test.ts

key-decisions:
  - "D-113 applied as the phase-wide convention: maxOccupancy / declaredPax / the whole organizer surface are organizer-INCLUSIVE; capacity_snapshot alone is organizer-EXCLUSIVE, because it caps rsvp ROWS and the organizer structurally never occupies one"
  - "FORWARD-ONLY, NO DATA MIGRATION: pre-change booking_group rows keep their original capacity_snapshot. D-111 makes the column immutable precisely so a later change cannot retroactively move a cap people already answered against; rewriting shipped snapshots would violate the decision the column exists to encode"
  - "The createGroup capacity floor is 2, not 1 — a space rated for one person cannot host a group, because the one seat is the organizer's"
  - "full={counts.full} is passed THROUGH unmodified: it is a fact about the seat-claim, decided server-side against the RAW snapshot, and is never re-derived from the two organizer-inclusive numbers on screen"
  - "The nudge prop is RENAMED confirmedYes → attendingTotal so the basis is stated rather than inferred — the silent basis mismatch is exactly how WR-04 shipped"
  - "The rendered copy changed from '{N} people have RSVP'd' to '{N} people are coming' — the total now includes an organizer who never RSVP'd to anything, so the old wording would have been false"

patterns-established:
  - "Two-layer component test: LAYER 1 renders the component with the call site's own expression mirrored locally; LAYER 2 asserts the real call site's source wires it that way. Deleting either layer re-opens half the finding"
  - "A capacity mutation must fail on bodies in the room (committed rsvp rows) before it fails on the refusal copy — order the assertions so the message names the database truth"

requirements-completed: [GROUP-04, GROUP-05]

# Metrics
duration: 46min
completed: 2026-07-28
---

# Phase 08 Plan 14: Reserve the Organizer's Seat, and Count Them Exactly Once Summary

**`capacity_snapshot` becomes `GREATEST(max_occupancy - 1, 0)` so a group on a listing rated for N seats N people including the organizer — and every organizer-facing number (meter, roster docs, renamed `attendingTotal` nudge) now reads on that one convention, so the over-RSVP signal fires at the FIRST over-subscription instead of one person late.**

## Performance

- **Duration:** 46 min
- **Started:** 2026-07-28T15:57:00Z (local clock; first verification at 15:57, first task commit 15:59:29)
- **Completed:** 2026-07-28T16:43:00Z
- **Tasks:** 3
- **Files modified:** 7 (6 modified, 1 created) — `+396 / −47`

## Accomplishments

- **SC4's wording is now literally true.** `createGroup` freezes `GREATEST(l.max_occupancy - 1, 0)` inside the same atomic INSERT that creates the group. On a `maxOccupancy = 12` listing the cap is 11 RSVP-yes attendees, so 11 + the organizer = 12 — the number the host rated the room for. Before this, 12 could say yes and the organizer made **13 bodies in a space rated for 12**.
- **The seat-claim mechanism is untouched (D-112).** `claimSeat`, `getHeadcount`, `getRoster`, `removeAttendee`, `src/lib/group/rsvp.ts` and the public invite page are all byte-identical. Only the *meaning* of the number the claim is handed changed; the `FOR UPDATE` lock that adjudicates it did not.
- **A capacity floor of 2 in two places.** The pre-read gate and the INSERT's own `WHERE` both require `max_occupancy >= 2`. The second is not redundant: it closes the read-then-write window in which a host capacity edit landing between the gate and the INSERT could freeze a `capacity_snapshot` of **0** — a group nobody can ever join, immutable by D-111 (T-08-47). This incidentally closes the write-side half of WR-09 for the group path; WR-09 itself stays open.
- **The audit records the cap that was actually enforced** (T-08-48). `meta.capacity` is read back off the INSERT's own `RETURNING capacity_snapshot`, not recomputed from the listing's rating, so the trail and the enforcement cannot disagree even under a racing edit.
- **The D-114 nudge fires at the first over-subscription and states the true gap.** With `declaredPax = 3` and three friends saying yes, four people are coming: the block now renders and says the overage is **1 person**. Previously `3 <= 3` kept it silent on exactly the case it exists to catch, and once it did fire it understated the gap by one.
- **The whole organizer surface reads one convention, and says so.** The meter renders `confirmed + 1` of `capacity + 1`; the roster's inverted warning block is rewritten (the risk is now counting the organizer TWICE, not once); the meter's prop docs state the basis they receive; and the `+ 1` lives at exactly two adjacent render sites in one file, named as such in the page header.

## Task Commits

Each task was committed atomically:

1. **Task 1: capacity_snapshot reserves the organizer's seat** — `3cbdff5` (fix)
2. **Task 2: the organizer surface counts the organizer exactly once** — `61645a7` (fix)
3. **Task 3: pin the seat reservation and the first over-subscription** — `cdc9ae1` (test)

## Files Created/Modified

- `src/app/actions/group.ts` — `createGroup` snapshots `GREATEST(l.max_occupancy - 1, 0)`; the pre-read guard floor rises 1 → 2; the INSERT's `WHERE` mirrors the floor; `RETURNING` gains `capacity_snapshot` and the audit's `meta.capacity` reads it back; the doc comment states that the snapshot counts RSVP-able seats and that existing rows are forward-only.
- `src/app/(app)/bookings/[id]/group/page.tsx` — the one call site that adds the organizer back: `confirmed={counts.confirmed + 1}`, `capacity={counts.capacity + 1}`, `attendingTotal={counts.confirmed + 1}`, `full={counts.full}` unchanged. Header contract updated to say the `+ 1` lives here and nowhere else.
- `src/components/group/top-up-nudge.tsx` — `confirmedYes` → `attendingTotal` (prop, doc, both guards, the arithmetic and the rendered sentence). Copy changed to "{N} people are coming". Neutral `Alert`, default variant, `UsersRoundIcon`, no control, no amount — unchanged.
- `src/components/group/headcount-meter.tsx` — prop docs only; still does no arithmetic and still receives `full` already decided.
- `src/components/group/attendee-roster.tsx` — the `:33-35` warning block rewritten (not appended to); the premise was inverted by this change.
- `tests/group/group-lifecycle.test.ts` — four new WR-03 cases, four fixtures raised by one so every pre-existing cap assertion keeps its meaning, and the `console.info("[audit]")` spy idiom.
- `tests/group/top-up-nudge.test.tsx` — **new**, jsdom, 7 cases in two layers.

## Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run lint` | **exit 0 — 0 errors, 7 warnings** (the exact pre-existing baseline; the new files added none) |
| `npx vitest run` (full, no `DATABASE_URL` override — confirmed empty in the shell) | **exit 0 — 96 files / 835 tests** (baseline 95 / 824 → **+1 file / +11 tests**) |
| `npm run build` (bare, no env workaround) | **exit 0**, 27 routes |
| Acceptance greps (Tasks 1 & 2, all 10) | all pass, including the `top-up-nudge.tsx` tripwire at **0** |

## Mutations — recorded red → green, verbatim

### MUTATION A — the reserved seat

**Mutation:** in `src/app/actions/group.ts`, revert the INSERT's `SELECT` from `GREATEST(l.max_occupancy - 1, 0)` back to a bare `l.max_occupancy`.

**RED — `npx vitest run tests/group/` → `Test Files 1 failed | 7 passed (8)`, `Tests 6 failed | 74 passed (80)`:**

```
FAIL  tests/group/group-lifecycle.test.ts > createGroup — the cap reserves the organizer's own place (WR-03 · D-113) > a listing rated for 12 freezes capacity_snapshot = 11 — 11 invitees plus the organizer is 12
AssertionError: expected 12 to be 11 // Object.is equality

FAIL  tests/group/group-lifecycle.test.ts > createGroup — the cap reserves the organizer's own place (WR-03 · D-113) > the smallest group-capable listing (rated 2) freezes capacity_snapshot = 1 — one invitee
AssertionError: expected 2 to be 1 // Object.is equality

FAIL  tests/group/group-lifecycle.test.ts > createGroup — the cap reserves the organizer's own place (WR-03 · D-113) > a listing rated for 3 seats TWO invitees plus the organizer — the rating exactly, never one over
AssertionError: expected [ { …(7) }, { …(7) }, { …(7) } ] to have a length of 2 but got 3

FAIL  tests/group/group-lifecycle.test.ts > createGroup — D-119 owner + confirmed gate > creates a group on a confirmed booking the caller owns, snapshotting the listing cap (D-111)
AssertionError: expected 6 to be 5 // Object.is equality

FAIL  tests/group/group-lifecycle.test.ts > createGroup — D-119 owner + confirmed gate > keeps the snapshot frozen when the host later changes the listing's capacity (D-111)
AssertionError: expected 6 to be 5 // Object.is equality

FAIL  tests/group/group-lifecycle.test.ts > removeAttendee — D-121 frees a seat through the group-row lock > a full group refuses a new yes, and accepts it once a seat is freed
AssertionError: expected true to be false // Object.is equality
```

**GREEN — after `git checkout -- src/app/actions/group.ts` (`git diff --exit-code` clean): `Test Files 8 passed (8)`, `Tests 80 passed (80)`, exit 0.**

**Note on the fill case, and it is the load-bearing detail.** The first mutation run failed that case on `expected 3 to be 2` — the frozen `capacity_snapshot`. Correct, but the same fact three other cases already assert. The assertions were **reordered** so the committed roster is read first: the mutation now fails with `expected […3 rows…] to have a length of 2 but got 3` — three attendees admitted plus the organizer, i.e. **four bodies in a room rated for three**. That is the actual defect WR-03 describes, and the failure message now names it. (Same lesson 08-16 recorded: a mutation's failure message should name the database truth, not a proxy.)

### MUTATION B — the organizer-inclusive nudge

**Mutation:** in `src/app/(app)/bookings/[id]/group/page.tsx`, change `attendingTotal={counts.confirmed + 1}` to `attendingTotal={counts.confirmed}`, mirrored in the test's `CONFIRMED_YES_PLUS_ORGANIZER` helper, which exists to BE that expression.

**RED — `npx vitest run tests/group/top-up-nudge.test.tsx` → `Test Files 1 failed (1)`, `Tests 3 failed | 4 passed (7)`:**

```
FAIL  tests/group/top-up-nudge.test.tsx > LAYER 1 — the nudge fires at the FIRST over-subscription and states the true gap (WR-04) > declaredPax 3 + three yes-RSVPs: four people are coming, and the overage is exactly 1 person
AssertionError: expected '' to match /extra 1 person at check-in/

FAIL  tests/group/top-up-nudge.test.tsx > LAYER 1 — the nudge fires at the FIRST over-subscription and states the true gap (WR-04) > G5 / 08-UI-SPEC §2 — the block carries NO money-moving control and NO amount
AssertionError: expected 'More people are coming than you booke…' to match /extra 4 people at check-in/

FAIL  tests/group/top-up-nudge.test.tsx > LAYER 2 — the management page HANDS the nudge the organizer-inclusive figure (the shipment) > passes `counts.confirmed + 1` as attendingTotal — the organizer, added exactly once (D-113)
AssertionError: expected '// The organizer\'s group management …' to match /attendingTotal=\{counts\.confirmed \+…/
```

**GREEN — after restoring both: `Test Files 1 passed (1)`, `Tests 7 passed (7)`, exit 0.**

The three failures are the finding stated three ways: `expected '' to match /extra 1 person at check-in/` is **WR-04 exactly** — at the first over-subscription the organizer is told *nothing*. The G5 case shows the second half: once it does fire it renders "extra 3 people" where four are owed, understating the gap by one. And LAYER 2 fails on the page's own source, so the mutation is caught at the shipment, not only at the pattern.

As with mutation A, the LAYER 1 assertions were **reordered** after a first run: the original order failed on `expected '' not to be ''`, which is true but says nothing. The overage assertion now comes first, so the message names the sentence the organizer should have read.

## Decisions Made

- **Forward-only, no data migration (restated because the plan requires it stated).** Existing `booking_group` rows keep their original `capacity_snapshot`. D-111 makes the column a frozen creation-time snapshot precisely so a later change cannot retroactively move a cap people have already answered against; rewriting shipped snapshots would violate the decision the column exists to encode. **Groups created before this change keep their old cap; every group created after it reserves the organizer's seat.** This is an explicit choice, not an omission (T-08-51, dispositioned `accept` — only dev/UAT rows exist).
- **The audit reads the cap back off `RETURNING` rather than recomputing `gate.maxOccupancy - 1`.** The plan asked for "the SNAPSHOTTED cap"; reading the row the statement just wrote is literally that, and stays correct even if a host edit lands between the gate read and the INSERT.
- **All four `group-lifecycle` listing fixtures were raised by one, including the two with no cap-dependent assertion.** The uniform rule "every fixture keeps the same number of RSVP-able seats it had" is easier to reason about than a per-case judgement, and it is what "keeps testing what it was written to test" means here. No assertion was weakened.
- **The nudge's rendered copy diverges from 08-UI-SPEC §2's locked string,** which says `{N} people have RSVP'd`. That wording is now false — `N` includes an organizer who never RSVP'd — so the plan directed the change. Everything else the spec locks (neutral `Alert`, default variant, no CTA, no amount) is unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The `top-up-nudge.tsx` grep tripwire did not hold at baseline**

- **Found during:** Task 2
- **Issue:** Task 2's acceptance criterion requires `grep -ci "pay now\|charge\|card" src/components/group/top-up-nudge.tsx` to print **0**. On the untouched file it printed **1**: the shipped tripwire comment at `:16` itself contained the word it forbids — *"the verb of moving money against a **card**"*. The file's own header states the rule this violates: *"a grep that the comment forbidding the thing can trip is not a guard."*
- **Fix:** reworded the comment to describe the three forbidden strings without spelling any of them ("the verb of billing a saved payment instrument, and for the instrument itself"), and added the reason so a future editor does not helpfully name them again.
- **Files modified:** `src/components/group/top-up-nudge.tsx`
- **Verification:** `grep -ci "pay now\|charge\|card"` prints **0**; the rendered-output assertion in the new test independently asserts the absence.
- **Committed in:** `61645a7` (Task 2 commit)

**2. [Rule 3 - Blocking] `.planning/STATE.md` was dirty at dispatch and was restored**

- **Found during:** pre-flight clean-slate check
- **Issue:** the dispatch notice said the working tree was clean; `git status --porcelain` showed ` M .planning/STATE.md`. The diff was a *regressed* position left by the discarded attempt — `Plan: 14 of 17` rewritten to `Plan: 1 of 17`, `percent: 97` to `78`. Executing on top of it would have carried a false position into the final state update.
- **Fix:** `git checkout -- .planning/STATE.md` (a single-file restore; no blanket reset, no `git clean`).
- **Files modified:** none in the end — the file was returned to `a7b45b5`.
- **Verification:** `git status --porcelain` empty; `git log --oneline -1` = `a7b45b5`; `grep -c "GREATEST" src/app/actions/group.ts` = 0. Clean slate confirmed before Task 1.
- **Committed in:** n/a (restore, not a change)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both were prerequisites for executing the plan as written — one an acceptance criterion that could not pass without it, one a false starting state. No scope creep; no file was touched that the plan did not name.

## Issues Encountered

- **The plan's Task-1 acceptance criteria anticipated fixture churn, and it was real.** Six pre-existing assertions across `tests/group/group-lifecycle.test.ts` depended on `capacity_snapshot == listing.maxOccupancy`. Every one was preserved by raising the FIXTURE, never by weakening the assertion — which mutation A then confirms, since those same pre-existing cases go red under it (`expected 6 to be 5`) rather than passing vacuously.
- **The `tsc`-vs-vitest trap did not recur, because the carried warning was applied up front.** `ReturnType<typeof vi.spyOn>` erases the call-signature generics, so the `auditLines()` helper was lifted verbatim from `tests/booking/checkout-session-expire.test.ts` — including the `as unknown as unknown[][]` re-type that exists solely to stop `TS7006`. `npx tsc --noEmit` was run alongside `npx vitest run` before every commit; both were green every time.
- **The plan's MUTATION B ("passing `counts.confirmed` to `TopUpNudge`") is not executable against a component test alone** — the mutation lives in an async RSC with a database and `next/headers` behind it, which jsdom cannot render for the price of the one fact under test. Rather than downgrade the mutation to a test-local one (which would prove the pattern and not the shipment — the exact 08-09 failure 08-16 closed), the test was built in **two layers**: LAYER 1 renders the component with the page's expression mirrored, LAYER 2 asserts the page's source wires it that way. The mutation as the plan words it — applied to the page — turns LAYER 2 red; mirrored into LAYER 1 it turns the rendered overage red. Both are recorded above.

## Known Stubs

None. No hardcoded empty values, placeholder copy or unwired components were introduced. The one absence in the touched code — the nudge's missing top-up control — is a documented v1 product decision (D-114 / 08-UI-SPEC Open Q10), not a stub, and is now asserted as absent by a rendered-output test.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change was introduced; every file touched is within the plan's `<threat_model>` scope. `T-08-46`, `T-08-47`, `T-08-48`, `T-08-49` and `T-08-50` are all `mitigate` and all mitigated as written; `T-08-51` is `accept` and is restated above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **WR-03 and WR-04 are closed. Wave 7 is complete** (08-13 + 08-14). Next: wave 8 (`08-15`, CR-01) then wave 9 (`08-17`, the pax-surcharge UAT checkpoint).
- **Load-bearing for anyone touching a group headcount from here on:** `capacity_snapshot` is the ONE organizer-exclusive number in the feature. Anything reading it for an organizer-facing surface owes a `+ 1`; anything reading it for the public invite page or the seat-claim does not. The `+ 1` currently exists at exactly two adjacent lines in `src/app/(app)/bookings/[id]/group/page.tsx` and must not be duplicated — an organizer who RSVPs to their own link already has a real `rsvp` row, so a second `+ 1` would claim a body that does not exist.
- **Relevant to 08-17's UAT:** any listing seeded for the group walkthrough now needs `max_occupancy >= 2`, and a group on `max_occupancy = N` will show `x of N` where the last seat is the organizer's. Combined with the 08-10 warning (a host who sets `extra_head_fee` but leaves `max_occupancy` empty collects no surcharge), the UAT fixture must set **both** fields and set the cap to at least 2.
- **The mirror-image half of WR-03 noted in the review is NOT closed and was out of scope by the plan:** an organizer who RSVPs to their own link still appears twice on the roster (once as the "You" fixture, once as a real row). The review's suggested `getRoster` predicate was not applied — `getRoster` is explicitly named as untouched. The new roster comment flags the double-count risk in prose; closing it is a separate change.

---
*Phase: 08-group-bookings*
*Completed: 2026-07-28*
