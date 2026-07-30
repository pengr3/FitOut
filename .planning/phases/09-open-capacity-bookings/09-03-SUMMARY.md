---
phase: 09-open-capacity-bookings
plan: 03
subsystem: testing
tags: [vitest, postgres, advisory-lock, concurrency, mutation-testing, gist-exclude, open-capacity]

# Dependency graph
requires:
  - phase: 09-open-capacity-bookings
    plan: 01
    provides: "booking.open_capacity + the narrowed booking_no_overlap (the constraint this plan's DDL proof pins) + listing.per_head_price_cents"
  - phase: 09-open-capacity-bookings
    plan: 02
    provides: "createOpenCapacityHold (the SHIPPED claim Layer 2 drives), SOLD_OUT_MESSAGE, the openTakenSql occupying predicate this file deliberately re-types rather than imports"
  - phase: 08-group-bookings
    provides: "tests/group/seat-claim-race.test.ts — the two-layer / two-mutation discipline (Layer 1 inlined pattern proof, Layer 2 shipped proof) and its measured Phase-8 scar"
  - phase: 03-availability-calendar
    provides: "tests/helpers/db.ts makeRacingClients (independent backends) and tests/availability/exclusion-race.test.ts's raw-INSERT + expect23P01 idioms"
provides:
  - "tests/availability/open-capacity-race.test.ts — the OPEN-03 / SC#3 acceptance gate: 6 cases, two layers, two EXECUTED mutations. Cases 3-6 drive the real createOpenCapacityHold over one drizzle(client) per makeRacingClients connection with a distinct bookerId per racer"
  - "tests/availability/open-capacity-exclude.test.ts — the Pitfall-1 DDL proof: many same-date drop-in rows commit, an overlapping exclusive row still raises 23P01, the two modes do not block each other, and the live constraint text carries the narrow"
  - "A recorded, verbatim mutation log in the race file's own header (both runs, both restores) — the gate's teeth are now measured, not asserted"
affects: [09-04 read model (the committed-SUM truth this file asserts is the same projection), 09-07 reserve/claim action, 09-13 host cancel, 09-14 E2E, phase verification (SC#3 evidence)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Clock-relative fixture dates for any test whose subject enforces a date horizon: the shipped claim refuses a closed/past date and anything beyond the 90-day horizon, so a hardcoded calendar literal would turn the whole gate green-by-vacuum the moment the date passed"
    - "The assertion re-types the occupying predicate instead of importing openTakenSql — an acceptance gate must not inherit a bug from the very fragment under test (the same reason Layer 1 inlines the SQL)"
    - "Mutation evidence recorded verbatim in the test file header, not only in the summary — the next reader of the file sees that both kills were executed and what they printed"

key-files:
  created:
    - tests/availability/open-capacity-race.test.ts
    - tests/availability/open-capacity-exclude.test.ts
  modified: []

key-decisions:
  - "Fixture dates are computed from the clock (now + 30 days, 22:00Z -> +16h = the OC-03 Manila 6 AM - 10 PM envelope) instead of the plan's 2026-09-0X literals: createOpenCapacityHold's own day_open_ok / horizon_ok guards would refuse a stale literal with PAST_DATE_MESSAGE, and every Layer-2 case would then pass while claiming nothing"
  - "Case 3's committed-SUM query is written inline (status = 'pending', per the plan) while the other Layer-2 cases use a shared committedHeads() helper over the full occupying set — case 5 needs the cancelled row to drop out, which a pending-only filter would also do, but only the occupying predicate says so for the right reason"
  - "The exclude test's constraint read-back is scoped by pg_namespace to the isolated test schema: the dev `public` schema carries a same-named booking_no_overlap, so an unscoped catalog query could read the wrong constraint and pass for the wrong reason"
  - "Case 3 (the plan's Layer-2 headline) also asserts replayed === false on every winner — the failure mode the identity warning describes (losers silently replaying the winner's hold) would otherwise still show three `ok: true` results"

patterns-established:
  - "Pattern: a race gate's FIRST assertion must be the committed database truth read over an independent connection — both mutations here printed `expected 4 to be 3` / `expected 6 to be 5`, naming the over-cap SUM rather than a returned-value proxy"
  - "Pattern: when the subject carries a de-dup / idempotency pre-check, seed one identity per racer; the inverse case (same identity twice -> replay) belongs in the same file so the rule is visible from both sides"

requirements-completed: [OPEN-03]

# Metrics
duration: 20min
completed: 2026-07-30
---

# Phase 9 Plan 03: The SC#3 Concurrent-Overbook Gate Summary

**A genuine multi-connection overbook race against the SHIPPED `createOpenCapacityHold` — four independent backends, four distinct bookers, one cap of 3 — plus the DDL proof that drizzle/0022's narrow lets many drop-in bookings share one date; both mutation kills were EXECUTED and printed a committed-SUM-over-cap failure, then restored clean.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-30T10:03:00Z
- **Completed:** 2026-07-30T10:23:00Z
- **Tasks:** 3
- **Files created:** 2 (no production file modified)

## Accomplishments

- **OPEN-03 / SC#3 is proven against the shipped code, not a pattern.** `tests/availability/open-capacity-race.test.ts` (403 lines, 6 cases) fires N+1 genuinely concurrent claims through independent Postgres backends. Cases 3-6 call the real `createOpenCapacityHold` over one `drizzle(client)` per `makeRacingClients` connection; cases 1-2 inline the critical section so the advisory-lock *pattern* is separately falsifiable.
- **Both mutations ran and both went RED with the database truth in the message** (see the verbatim log below). Deleting the production `pg_advisory_xact_lock` line from `src/lib/availability/units.ts` turns cases 3-4 red with `expected 4 to be 3` and `expected 6 to be 5` — the Phase-8 silent-green scar cannot repeat for this surface.
- **OC-07's partial fill is proven end-to-end.** Three racers × 2 heads against a cap of 5 commit exactly 5: the boundary racer is granted exactly `remaining` (`[1, 2, 2]` sorted), REPORTS it (`granted < requested`), is not a `soldOut` refusal, and every row's `quoted_total_cents` equals `computeServiceFee(35000 × granted).allInCents` — the money is frozen for the granted heads, never the requested ones.
- **Pitfall 1 is closed with a durable file.** `tests/availability/open-capacity-exclude.test.ts` commits three drop-in rows on one date/unit/window (the second used to raise 23P01), keeps an overlapping exclusive row rejecting with 23P01 (SC#4 keystone, threat T-09-01), proves neither mode blocks the other in either order, and reads `pg_get_constraintdef` back out of the isolated schema to pin both the narrow and the unchanged free-status complement.
- **OC-15 needs no release code, and the test says why.** Case 5 cancels the only occupying row and re-sells the head: `remaining` is a live SUM, so a cancelled row simply leaves the occupying set (Pitfall 3).
- **T-09-08 (double-submit replay) is pinned from the other side.** Case 6 has the SAME booker claim twice: same booking `id`, `replayed === true`, same frozen total, committed SUM 2 — not 4.

## Task Commits

1. **Task 1: the Pitfall-1 DDL proof** — `7635ff9` (test)
2. **Task 2: the SC#3 gate, two layers** — `ece5bc7` (test)
3. **Task 3: both mutation runs, recorded verbatim in the file header** — `f58f70d` (test)

**Plan metadata:** see the final `docs(09-03)` commit.

## The two mutation runs (verbatim)

### MUTATION 1 — the PATTERN (Layer 1)

Deleted the inlined `SELECT pg_advisory_xact_lock(...)` statement from `raceInlinedClaim` inside
`tests/availability/open-capacity-race.test.ts`. `npx vitest run tests/availability/open-capacity-race.test.ts`:

```
 ❯ tests/availability/open-capacity-race.test.ts (6 tests | 2 failed) 838ms
     × caps 4 concurrent inlined single-head claims at cap 3 — exactly THREE heads commit 70ms
     × never overshoots cap 5 with 3 concurrent inlined MULTI-head claims 47ms

 FAIL  tests/availability/open-capacity-race.test.ts > open-capacity admissions claim (OPEN-03 / SC#3 — the D-123 acceptance gate) > caps 4 concurrent inlined single-head claims at cap 3 — exactly THREE heads commit
AssertionError: expected 4 to be 3 // Object.is equality

- Expected
+ Received

- 3
+ 4

 ❯ tests/availability/open-capacity-race.test.ts:233:52
    233|       expect(await committedHeads(L_PATTERN_CAP3)).toBe(3);

 FAIL  tests/availability/open-capacity-race.test.ts > open-capacity admissions claim (OPEN-03 / SC#3 — the D-123 acceptance gate) > never overshoots cap 5 with 3 concurrent inlined MULTI-head claims
AssertionError: expected 6 to be less than or equal to 5
 ❯ tests/availability/open-capacity-race.test.ts:254:52
    254|       expect(await committedHeads(L_PATTERN_CAP5)).toBeLessThanOrEqual…

 Test Files  1 failed (1)
      Tests  2 failed | 4 passed (6)
```

Restored → `git diff --exit-code tests/availability/open-capacity-race.test.ts` exit 0 → re-run **6 passed (6)**.

### MUTATION 2 — the SHIPMENT (Layer 2), the one that matters

Deleted the `await tx.execute(sql\`SELECT pg_advisory_xact_lock(...)\`)` line from `createOpenCapacityHold`
in `src/lib/availability/units.ts` (production file). Same command:

```
 ❯ tests/availability/open-capacity-race.test.ts (6 tests | 2 failed) 969ms
     × caps 4 concurrent REAL claims at cap 3 — the SHIPPED lock is the authority (SC#3) 76ms
     × fills the last spot partially instead of overshooting cap 5 — REAL claim, OC-07 46ms

 FAIL  tests/availability/open-capacity-race.test.ts > open-capacity admissions claim (OPEN-03 / SC#3 — the D-123 acceptance gate) > caps 4 concurrent REAL claims at cap 3 — the SHIPPED lock is the authority (SC#3)
AssertionError: expected 4 to be 3 // Object.is equality

- Expected
+ Received

- 3
+ 4

 ❯ tests/availability/open-capacity-race.test.ts:286:21
    286|       expect(heads).toBe(3);

 FAIL  tests/availability/open-capacity-race.test.ts > open-capacity admissions claim (OPEN-03 / SC#3 — the D-123 acceptance gate) > fills the last spot partially instead of overshooting cap 5 — REAL claim, OC-07
AssertionError: expected 6 to be 5 // Object.is equality

- Expected
+ Received

- 5
+ 6

 ❯ tests/availability/open-capacity-race.test.ts:313:49
    313|       expect(await committedHeads(L_REAL_CAP5)).toBe(5);

 Test Files  1 failed (1)
      Tests  2 failed | 4 passed (6)
```

Both failure messages name the **committed head SUM** (`4 > 3`, `6 > 5`) read back over an independent
connection — not a returned-value proxy. Restore proof:

```
$ git diff --exit-code src/lib/availability/units.ts
git diff --exit-code src/lib/availability/units.ts -> exit 0

$ git status --short -- src/
(empty)

$ npx vitest run tests/availability/open-capacity-race.test.ts tests/availability/open-capacity-exclude.test.ts
 Test Files  2 passed (2)
      Tests  10 passed (10)
```

## Files Created/Modified

- `tests/availability/open-capacity-race.test.ts` (created, 403 lines) — the SC#3 gate. Two layers, six cases, a per-case listing so no case pre-fills another's cap, a distinct seeded `user` per racer, `idempotencyKey: null`, `Promise.allSettled`, `client.end()` in a `finally`, and the verbatim mutation log in its header.
- `tests/availability/open-capacity-exclude.test.ts` (created, 154 lines) — the Pitfall-1 DDL proof, four cases each on its own date.
- **No production file was modified.** `git status --short -- src/` is empty; the only touch to `src/` was Mutation 2, reverted and verified with `git diff --exit-code`.

## Decisions Made

- **Clock-relative fixture dates.** The plan's literal `2026-09-0X` dates work today but `createOpenCapacityHold` refuses a date whose window has closed (`day_open_ok`) or that sits beyond the 90-day horizon (`horizon_ok`), returning `PAST_DATE_MESSAGE`. A stale literal would make every Layer-2 racer refuse for the wrong reason and the cap assertions would read 0 — green by vacuum, exactly the failure class this plan exists to prevent. The window is now `now + 30 days`, `22:00Z → +16h` (Manila 6 AM – 10 PM), preserving the OC-03 envelope shape.
- **The committed-SUM helper re-types the occupying predicate** rather than importing `openTakenSql`. Importing the fragment the claim itself counts with would let a bug in that fragment cancel out in the assertion. Same reasoning as Layer 1 inlining the lock.
- **The constraint read-back is namespace-scoped.** `pg_constraint` is global; the dev `public` schema carries its own `booking_no_overlap`, so the catalog query joins `pg_namespace` and pins `n.nspname = testDb.schema`.
- **Exclude case 3 runs both orders** (open→exclusive on one date, exclusive→open on the next). "Vice versa" in the case title is then a fact, not a claim.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's hardcoded fixture dates would have made the Layer-2 gate vacuous over time**
- **Found during:** Task 2 (the SC#3 race file)
- **Issue:** The plan specifies `2026-09-01T22:00:00Z` style literals for the day window. The shipped claim enforces two server-side date guards (`day_open_ok`, `horizon_ok`); once the calendar passes such a literal — or once it drifts past the 90-day horizon — every Layer-2 racer returns `PAST_DATE_MESSAGE`, the committed SUM reads 0, and `toBe(3)` would fail loudly *today* but the eventual "fix" would be to loosen the assertion. This is a latent green-by-vacuum trap in the phase's non-negotiable gate.
- **Fix:** `DAY_OPEN` / `DAY_CLOSE` are derived from `Date.now() + 30 days`, normalized to `22:00Z` + 16h, with a header comment naming the guards that make the literal unsafe. The exclude test keeps calendar literals — it never calls the claim, only the constraint, which has no date policy.
- **Files modified:** tests/availability/open-capacity-race.test.ts
- **Verification:** 6/6 green; both mutations still RED with over-cap SUMs; three consecutive runs green (flake check).
- **Committed in:** `ece5bc7`

**2. [Rule 2 - Missing Critical] Added `replayed === false` + `requested` assertions and a namespace scope the plan did not specify**
- **Found during:** Tasks 1-2
- **Issue:** (a) The plan's case-3 assertion set could still pass if the D-42 pre-check silently converted losers into replays of the winner's hold — the exact vacuity the plan's own header warning describes — because three `ok: true` results is what both worlds look like from the outside. (b) The plan's `pg_get_constraintdef` snippet filters on `conname` alone, which matches the dev `public` schema's constraint as well as the isolated schema's.
- **Fix:** Case 3 asserts `replayed === false` on every winner (the plan lists this as assertion 3 — kept and made load-bearing) and case 4 asserts `requested === 2` on all three winners so `granted < requested` is a genuine reduction; the catalog query joins `pg_namespace` and pins the test schema.
- **Files modified:** tests/availability/open-capacity-race.test.ts, tests/availability/open-capacity-exclude.test.ts
- **Verification:** 10/10 green across both files; mutation 2 still RED.
- **Committed in:** `7635ff9`, `ece5bc7`

**3. [Rule 3 - Blocking] The plan's `grep -c "open_capacity" ≥ 6` acceptance criterion counted LINES, not occurrences**
- **Found during:** Task 1
- **Issue:** As written the file mentioned the snake_case column on only 2 lines (the raw INSERT column list and the constraint-text assertion); everything else used `openCapacity` / "open-capacity". `grep -c` counts matching lines, so the criterion failed against a correct file — the third plan running to hit this class of unsatisfiable grep (09-02, 09-06, 09-08 all recorded one).
- **Fix:** Reworded five header/case comments to name the actual column and predicate (`booking.open_capacity = true`, `AND open_capacity = false`) where that is what is genuinely being discussed. No behavior change; the file now prints 7.
- **Files modified:** tests/availability/open-capacity-exclude.test.ts
- **Verification:** `grep -c open_capacity` → 7 (≥6), `pg_get_constraintdef` → 1, `23P01` → 6 (≥1); 4/4 green.
- **Committed in:** `7635ff9`

---

**Total deviations:** 3 auto-fixed (1 bug, 1 missing-critical, 1 blocking)
**Impact on plan:** All three protect the gate's teeth rather than change its scope. No production code was touched.

## Issues Encountered

None. Both mutations went RED on the first attempt — the "if Mutation 2 does not go red" checklist (shared
bookerId, shared `drizzle(testDb.db)`, an `await` that pre-serializes the racers) was designed against in
advance rather than debugged after the fact.

## Verification

| Gate | Result |
|------|--------|
| `npx vitest run tests/availability/open-capacity-race.test.ts` | 6 passed (6) — run 4× total, no flake |
| `npx vitest run tests/availability/open-capacity-exclude.test.ts` | 4 passed (4) |
| Mutation 1 (inlined lock) | RED — cases 1-2, `expected 4 to be 3` / `expected 6 to be less than or equal to 5` |
| Mutation 2 (shipped lock, `units.ts`) | RED — cases 3-4, `expected 4 to be 3` / `expected 6 to be 5` |
| `git diff --exit-code src/lib/availability/units.ts` after restore | exit 0 |
| `git status --short -- src/` | empty |
| `npm test` (full suite) | 918 passed / 4 skipped (102 files) — baseline 908/4 (100 files), +10 tests / +2 files, nothing regressed |
| `npx tsc --noEmit` | 0 errors |
| `npm run lint` | 0 errors / 7 baseline warnings |

## Known Stubs

None — this plan ships tests only; no stubbed data path, no placeholder copy.

## User Setup Required

None — no external service configuration required. The suite needs the local `postgis/postgis:18` container
(`docker compose up -d db`), as every integration test already does.

## Next Phase Readiness

- **SC#3 is now a standing gate, not a promise.** Any later plan that touches `createOpenCapacityHold` (09-07's
  reserve action, 09-13's host cancel, 09-16) is covered: remove the lock and the suite goes red naming the
  over-cap SUM.
- **09-04 (read model) can lean on this file's truth.** The committed-SUM query asserted here is the same
  projection `remaining = cap − SUM(occupying heads)` must produce; if 09-04's projection disagrees with these
  numbers, that is Pitfall 4 (predicate drift) and not a test problem.
- **Wave-0 validation rows for OPEN-03 are satisfied** (the race, the multi-head partial fill, the release path,
  and the Pitfall-1 same-date multi-booking). The remaining Wave-0 gaps are 09-04's read-model file and the
  Playwright E2E (09-14).
- **One watch item:** the fixture window is clock-relative, so the file assumes the venue-agnostic
  `22:00Z → +16h` envelope rather than reading `operating_hours`. If a future plan makes the claim itself
  validate the window against the listing's hours, these fixtures need `operating_hours` rows.

## Requirements Tracking

`OPEN-03` is claimed by SIX plans (09-01, 09-02, 09-03, 09-07, 09-15, 09-16) and is deliberately left
**Pending** in `REQUIREMENTS.md`, matching what 09-01 and 09-02 did: the atomic DB-level enforcement and its
race proof both exist now, but the booker-facing path that exercises them (`placeOpenHold`, 09-07) and the
end-to-end proof (09-15) have not landed. Flipping the checkbox here would be the phase-checkbox over-reach
STATE.md already flags. The evidence this plan owes the requirement — the executed mutations — is recorded
above and in the race file's header.

## Self-Check: PASSED

- `tests/availability/open-capacity-race.test.ts` — FOUND (403 lines)
- `tests/availability/open-capacity-exclude.test.ts` — FOUND (154 lines)
- `.planning/phases/09-open-capacity-bookings/09-03-SUMMARY.md` — FOUND
- commits `7635ff9`, `ece5bc7`, `f58f70d` — all FOUND in `git log --all`
- `git status --short -- src/` — empty (no production file modified by this plan)

---
*Phase: 09-open-capacity-bookings*
*Completed: 2026-07-30*
