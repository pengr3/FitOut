---
phase: 08-group-bookings
plan: 16
subsystem: testing
tags: [group-bookings, seat-claim, race-test, mutation-testing, regression-net, postgres, for-update]

# Dependency graph
requires:
  - phase: 08-group-bookings (08-02)
    provides: src/lib/group/seat-claim.ts — the shipped claimSeat whose FOR UPDATE this plan finally puts a net under
  - phase: 03-availability
    provides: tests/helpers/db.ts makeRacingClients — n INDEPENDENT postgres.js connections on one isolated schema
  - phase: 08-group-bookings (08-09)
    provides: the measurement that produced deferred item 4 — the production lock could be deleted with the whole suite green
provides:
  - "tests/group/seat-claim-race.test.ts LAYER 2 — two racing cases that drive the REAL claimSeat, one drizzle(client) per racer"
  - "a mutation-covered production lock: deleting FOR UPDATE from src/lib/group/seat-claim.ts:54 now turns the suite RED"
  - "a file header naming TWO mutation targets, each against its own file and its own line, both executable as written"
  - "deferred item 4 marked closed with its original entry preserved"
affects: [phase-09, any-future-edit-to-seat-claim.ts, 08-VALIDATION.md SC#4]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A race test that INLINES the SQL proves the pattern; only a case that IMPORTS the shipped function proves the shipment. Ship both layers, and say which mutation belongs to which."
    - "One drizzle(client) per racer over its own connection — a shared max:1 db serializes the lock window and the race proves nothing"
    - "Choose the racers' identity so the de-dup predicate can never match, or a loser returns ok:true by replay and the cap is never actually contested"
    - "Assert the COMMITTED row count before the returned results, so a mutation's failure message names the DB truth rather than a proxy"

key-files:
  created: []
  modified:
    - tests/group/seat-claim-race.test.ts
    - .planning/phases/08-group-bookings/deferred-items.md

key-decisions:
  - "Layer 2 gets its OWN two fixture groups (REAL1_GID/REAL2_GID on their own bookings and windows) — sharing a group with the inlined cases would let their committed rows pre-fill the cap the real-claimSeat racers are supposed to contest"
  - "The two pre-existing inlined cases are kept byte-identical; the new coverage is purely additive, so the pattern proof and the shipped proof can fail independently and each says something different"
  - "The racers use a NAME-ONLY guest identity (userId: null, guestEmailNorm: null, distinct names) so claimSeat's de-dup resolves to sql`false` and every racer attempts a genuine fresh INSERT"
  - "The committed-row assertion is deliberately FIRST in the new cases so MUTATION 2's failure reads 'expected 3 to be 1' committed rows — the plan's stated acceptance evidence — instead of a returned-value length"
  - "voided_at is left NULL on every fixture group and that is stated in a comment: claimSeat fails CLOSED on a voided group, which would make cases 3-4 pass for entirely the wrong reason"

patterns-established:
  - "Two-layer race testing: inlined SQL (pattern) + imported function (shipment), with a per-layer MUTATION-VERIFY instruction that names its own file and line"

requirements-completed: [GROUP-05]

# Metrics
duration: 25min
completed: 2026-07-28
---

# Phase 8 Plan 16: Mutation-Cover the Shipped Seat-Claim Lock Summary

**The GROUP-05 no-overflow guarantee now survives a one-line edit to production: `tests/group/seat-claim-race.test.ts` races the real `claimSeat` on per-racer connections, so deleting `FOR UPDATE` from `src/lib/group/seat-claim.ts:54` finally goes RED (3 committed `yes` at `capacity_snapshot = 1`) instead of shipping an over-cap bug past a fully green suite.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-28T14:17Z
- **Completed:** 2026-07-28T14:42Z
- **Tasks:** 2 of 2
- **Files modified:** 2 modified, 0 created
- **No production source file was touched:** `git diff --stat fc43ac0..HEAD -- src` is empty

## Accomplishments

### Task 1 — race the real `claimSeat`, one connection per racer (`4d263aa`)

`tests/group/seat-claim-race.test.ts` grew from 2 cases to 4, and the two new ones import the shipped function:

```ts
function realClaim(client: TestDb["client"], groupId: string, name: string) {
  return claimSeat(drizzle(client), {
    groupId, answer: "yes", userId: null, guestEmailNorm: null, name,
  });
}
```

Three things make that call a genuine race rather than a serialized replay, and each is load-bearing:

1. **One `drizzle(client)` per racer, over its own `makeRacingClients` connection.** `claimSeat`'s first
   parameter is `DbConn = PostgresJsDatabase<Record<string, unknown>>` (`read-model.ts:27`), which is
   exactly what `drizzle(client)` produces — so a racing connection becomes a valid argument with no
   test-only seam in production code. Sharing `testDb.db` (`max: 1`) would serialize the lock window
   and prove nothing (RESEARCH Pitfall 1).
2. **A name-only guest identity** (`userId: null`, `guestEmailNorm: null`, distinct `name`), so
   `claimSeat`'s de-dup predicate (`seat-claim.ts:60-65`) resolves to `sql\`false\`` and every racer
   genuinely attempts a fresh INSERT. An identity that de-duped would let a loser return `{ ok: true }`
   by matching an existing row, and the cap would never actually be contested.
3. **Their own fixture groups.** `REAL1_GID` (`capacity_snapshot = 1`) and `REAL2_GID` (`= 2`) sit on
   their own confirmed bookings with non-overlapping windows (`2026-09-03`, `2026-09-04`) — `booking_id`
   is UNIQUE on `booking_group`, and distinct windows keep `booking_no_overlap` irrelevant to the
   fixture. Sharing a group with the inlined cases would let their committed rows pre-fill the cap.

Both new cases assert the **committed** row count first (read back through the independent shared
`testDb.client`), then the returned results: exactly one/two `{ ok: true, status: "yes" }`, the rest
`{ ok: false, reason: "full" }`, and `results.every(r => r.status === "fulfilled")` — a loser resolves
calmly, never rejects. Every racing client is `.end()`ed in a `finally`.

The header was rewritten to describe two layers and **two separate mutations**, each naming its own
file and its own line. The previous single `MUTATION-VERIFY` instruction pointed at the production file
while the file it lived in never imported it — precisely the discrepancy 08-09 discovered.

### Task 2 — mark deferred item 4 closed (`80c0097`)

Item 4's heading is struck through and carries a dated closure note naming `4d263aa` and both mutation
outputs; the original 08-09 entry is preserved verbatim inside a `<details>` block, following item 3's
convention exactly. `git diff -U0` shows hunks only at line 93 (the item-4 heading) and line 120 (the
closing `</details>`) — items 1, 2 and 3 are byte-identical.

## The mutations, verbatim

### MUTATION 2 — the PRODUCTION lock (`src/lib/group/seat-claim.ts:54`)

This is the one deferred item 4 exists for. Deleted `FOR UPDATE` from the `SELECT capacity_snapshot`:

```
 FAIL  tests/group/seat-claim-race.test.ts > seat-claim no-overflow (GROUP-05 / SC#4 — the D-112 acceptance gate) > caps 3 concurrent REAL claimSeat →yes at capacity_snapshot=1 — the SHIPPED lock is the authority
AssertionError: expected 3 to be 1 // Object.is equality

- Expected
+ Received

- 1
+ 3

 ❯ tests/group/seat-claim-race.test.ts:241:17

 FAIL  tests/group/seat-claim-race.test.ts > seat-claim no-overflow (GROUP-05 / SC#4 — the D-112 acceptance gate) > caps 4 concurrent REAL claimSeat →yes at capacity_snapshot=2 — the shipped cap tracks the snapshot
AssertionError: expected 4 to be 2 // Object.is equality

- Expected
+ Received

- 2
+ 4

 ❯ tests/group/seat-claim-race.test.ts:267:17

 Test Files  1 failed (1)
      Tests  2 failed | 2 passed (4)
```

Three racers all read `count = 0` under no lock and all inserted → **3 committed `yes` rows at
`capacity_snapshot = 1`**, and 4 at `= 2`. The two inlined cases stayed green, which is the correct
signal: they never touch production code.

Restored → GREEN:

```
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

And the restored file is byte-identical to its committed state:

```
$ git checkout -- src/lib/group/seat-claim.ts && git diff --exit-code src/lib/group/seat-claim.ts
git diff --exit-code src/lib/group/seat-claim.ts => 0
```

Also confirmed against the pre-plan commit: `git diff --exit-code fc43ac0 HEAD -- src/lib/group/seat-claim.ts`
exits 0, and `git diff --stat fc43ac0..HEAD -- src` is empty.

### MUTATION 1 — the TEST's own inlined lock (`raceClaim`, this file)

The pattern proof is intact and independent. Deleted `FOR UPDATE` from the inlined `SELECT` inside
`raceClaim` (production file already restored):

```
 FAIL  tests/group/seat-claim-race.test.ts > seat-claim no-overflow (GROUP-05 / SC#4 — the D-112 acceptance gate) > caps 3 concurrent →yes at capacity_snapshot=1 — exactly ONE 'yes' ever survives
AssertionError: expected 3 to be 1 // Object.is equality

- Expected
+ Received

- 1
+ 3

 ❯ tests/group/seat-claim-race.test.ts:191:28

 FAIL  tests/group/seat-claim-race.test.ts > seat-claim no-overflow (GROUP-05 / SC#4 — the D-112 acceptance gate) > caps 4 concurrent →yes at capacity_snapshot=2 — exactly TWO 'yes' survive (not merely 'one')
AssertionError: expected 4 to be 2 // Object.is equality

- Expected
+ Received

- 2
+ 4

 ❯ tests/group/seat-claim-race.test.ts:211:28

 Test Files  1 failed (1)
      Tests  2 failed | 2 passed (4)
```

Cases 1-2 RED, cases 3-4 **green** — which independently re-confirms the production lock was already
restored at that point. Restored → GREEN (4/4).

**The mutated state was never committed.** Both mutations were applied, measured and reverted before
either commit; `git status --short` showed only `tests/group/seat-claim-race.test.ts` at Task-1 commit
time.

## Verification

| Check | Result |
|---|---|
| `npx vitest run tests/group/seat-claim-race.test.ts` | **exit 0 — 4 tests** (was 2) |
| `npx vitest run tests/group/` | **exit 0 — 7 files / 69 tests** |
| `npx vitest run` (full suite, no `DATABASE_URL` override) | **exit 0 — 94 files / 817 tests** (+2 over 08-12's 815) |
| `npx tsc --noEmit` | **exit 0** |
| `npx eslint src tests` | **exit 0 — 0 errors, 7 pre-existing warnings** (none in touched files) |
| `git diff --exit-code src/lib/group/seat-claim.ts` | **exit 0** |
| `git diff --stat fc43ac0..HEAD -- src` | **empty — no production file modified** |
| `grep -n "claimSeat" tests/group/seat-claim-race.test.ts` | import from `@/lib/group/seat-claim` + 1 call in `realClaim` |
| `grep -n "drizzle" tests/group/seat-claim-race.test.ts` | import + per-racer `drizzle(client)` |

`npm run build` was not run: this plan changes no file that reaches the bundle (`git diff -- src` is
empty), and the 08-12 baseline of exit 0 / 27 routes is therefore unmoved.

## Deviations from Plan

**None — the plan executed exactly as written.** One judgement call inside the plan's latitude: the
plan asked for assertions on "BOTH the returned results and the committed row count" without
specifying order, and the committed-row assertion was placed **first** so MUTATION 2's failure message
names the database truth (`expected 3 to be 1` committed rows) rather than a returned-value length.
The first mutation run — before the reorder — failed on `expect(winners).toHaveLength(1)` with
`expected [ { ok: true, …(2) }, …(2) ] to have a length of 1 but got 3`; correct, but a proxy for the
over-cap rather than the over-cap itself, and the plan's acceptance criterion asks for "2+ committed
`yes` rows" specifically.

## TDD Gate Compliance

Task 1 carries `tdd="true"`. The RED gate is satisfied by the **mutation**, not by a conventional
failing-test-first cycle, and that is inherent to the plan rather than a shortcut: the behaviour under
test is already shipped and correct, and this plan is explicitly forbidden from modifying production
code (`success_criteria`: "No production source file is modified"). A conventional RED would require
breaking `claimSeat` first. The gate as executed is stronger than the ordinary one — the test was
proven to fail against a broken production lock *and* against a broken inlined pattern, then proven
green against both restored. Commits are therefore `test(...)` + `docs(...)` with no `feat(...)`,
which is correct for a regression-net-only plan.

## Known Stubs

None. No stubbed values, placeholder text or unwired components were introduced.

## Threat Flags

None. This plan adds no network endpoint, auth path, file access or schema change — it is test
authorship plus a planning-doc edit. T-08-56 / T-08-57 / T-08-58 from the plan's threat register are
all dispositioned `mitigate` and all three are now closed:

| Threat | Status |
|---|---|
| T-08-56 — a future edit deletes the production `FOR UPDATE` silently | **closed** — MUTATION 2 red/green above |
| T-08-57 — a mutation instruction that cannot be executed as written | **closed** — the header now names two targets, each against its own file and line; both were executed this plan |
| T-08-58 — a serialized "race" giving a false green | **closed** — per-racer `drizzle(client)` over per-racer connections, name-only identity that cannot de-dup |

## Notes for the next plan

1. **`tests/group/seat-claim-race.test.ts` now has two layers, and a future editor must not collapse
   them.** Deleting the inlined cases "because the real ones cover it" would lose the pattern proof
   (which is what tells you the *lock idiom* is sound independent of the shipping code); deleting the
   real ones would re-open deferred item 4 exactly. Each layer's mutation is written next to it.
2. **Phase 9 reuses this lock.** Any new caller of `claimSeat`, and any new pessimistic
   `SELECT … FOR UPDATE` guard, should copy this two-layer shape rather than only the inlined one.
3. **The identity choice is the subtle part.** If a future racing case uses an account or a
   guest-with-email identity, `claimSeat` will de-dup and losers will return `{ ok: true }` by matching
   the winner's row — a green test that contests nothing. Name-only is the only identity that races.
4. **08-VALIDATION.md's SC#4 row can now honestly claim the shipped lock**, not just the pattern. Worth
   updating when the phase gate is next reviewed (08-17 / phase verification), though that file was
   deliberately not touched here — it is outside this plan's `files_modified`.

## Commits

| Task | Commit | Description |
|---|---|---|
| 1 | `4d263aa` | `test(08-16): race the real claimSeat so the shipped FOR UPDATE is mutation-covered` |
| 2 | `80c0097` | `docs(08-16): mark deferred item 4 closed by 4d263aa` |
