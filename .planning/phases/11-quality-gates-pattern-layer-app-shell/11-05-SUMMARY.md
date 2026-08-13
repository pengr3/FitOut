---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 05
subsystem: testing
tags: [postgres, gist, exclusion-constraint, pg_constraint, vitest, double-booking, observed-red]

# Dependency graph
requires:
  - phase: 11-04
    provides: CI workflow with a Postgres-backed job 2 that runs the full vitest suite, so this plan's standing guard executes off the author's laptop
  - phase: 09
    provides: drizzle/0022's narrowed booking_no_overlap and the pg_constraint assertion idiom this plan extends
provides:
  - "GATE-04's second clause discharged: the (N+1)th-booking mutation has been watched turning the constraint spec RED, recorded verbatim"
  - "A read-only, schema-scoped standing guard that booking_no_overlap EXISTS and is an EXCLUDE USING gist with the half-open '[)' bound"
  - "A recorded refutation of the vacuous drop-against-public probe, so no future reader repeats it and mistakes green for proof"
affects: [phase-12, phase-13, any plan that touches drizzle migrations, any plan that changes tests/helpers/db.ts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ephemeral-schema mutation probing: mutate inside setupTestDb() against the per-file schema rather than issuing DDL against a persistent database — no re-ADD step, no unconstrained window"
    - "Existence-before-destructuring in catalog assertions: assert row count with a named message before `const [{ x }] =`"

key-files:
  created: []
  modified:
    - tests/availability/open-capacity-exclude.test.ts
    - tests/availability/exclusion-race.test.ts

key-decisions:
  - "The plan-prescribed probe (DROP CONSTRAINT against fitout_test's public schema) was executed and PROVEN VACUOUS — constraint provably absent, spec still 4/4 green, exit 0. Recorded in the header rather than quietly replaced."
  - "The real mutation was applied inside setupTestDb() against the ephemeral per-file schema, not against a persistent database — strictly safer than the plan's psql BEGIN/ROLLBACK alternative because teardownTestDb's DROP SCHEMA CASCADE removes the mutated schema unconditionally."
  - "All destructive work ran against a throwaway postgis/postgis:18-3.6 container on port 55432; the real fitout_test and dev fitout were never DDL targets."
  - "Task 2's checkpoint was executed rather than returned: Docker/Postgres are available on this box (corrected environment fact), so the proof was performable and was not deferred to a human."

patterns-established:
  - "Prescribed probes are refuted in-file, not silently swapped: the vacuous probe, its measured output, and the structural reason it cannot work are committed alongside the one that works"
  - "Positive control for a catalog guard: the same mutation that reds the behavioural spec must also red the standing assertion, and the standing assertion's failure message must name the constraint and the schema"

requirements-completed: [GATE-04]

# Metrics
duration: 38min
completed: 2026-08-13
---

# Phase 11 Plan 05: The (N+1)th-Booking Mutation Proof Summary

**The double-booking guarantee has now been watched failing with `booking_no_overlap` removed — two racing inserts both fulfilled, captured verbatim — and the plan's own prescribed probe was measured to be vacuous and refuted in the same file.**

## Performance

- **Duration:** 38 min
- **Started:** 2026-08-13T21:43Z
- **Completed:** 2026-08-13T22:21Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments

- **GATE-04's second clause is discharged by observation, not assertion.** With the constraint removed from the schema the spec actually reads, `tests/availability/exclusion-race.test.ts` fails 3 of 4 tests, exit code 1, with `expected [ …(2) ] to have a length of 1 but got 2` — two independent connections both inserting the same `(listing, unit, [02:00,03:00))` window. That is a real double-book: one court, one hour, two paying bookers. The verbatim run is committed as an OBSERVED RED header block.
- **The plan's prescribed probe was proven vacuous and the refutation is committed.** `ALTER TABLE booking DROP CONSTRAINT booking_no_overlap` against `fitout_test` leaves the spec **4/4 green at exit 0** with the constraint provably gone (`SELECT count(*) FROM pg_constraint … → 0`). This is not a flake: `setupTestDb()` creates a brand-new schema per test file and replays every `drizzle/*.sql` into it, so the spec's inserts never touch `public`. A DDL mutation to `public` cannot reach the spec *by construction*. Anyone following the plan literally would have seen green and concluded the gate held.
- **The standing guard is now a guard, and it has been watched failing.** `open-capacity-exclude.test.ts` asserts existence (row count === 1, before destructuring, with a message naming the constraint and the schema), kind (`EXCLUDE USING gist`, so a same-named UNIQUE or index cannot impersonate it), and three narrows including the half-open `'[)'` bound. Under the mutation it reported exactly what a reader needs: *"booking_no_overlap is MISSING from schema "test_7824_10_0" … every overlap assertion in tests/availability/** is meaningless until this is restored."*
- **Blast radius measured, so the mutation is provably targeted rather than catastrophic.** Whole-directory run under mutation: `Test Files 2 failed | 17 passed (19)`, `Tests 5 failed | 165 passed (170)`. 17 of 19 files unaffected, including `open-capacity-race.test.ts` whose arbiter is the advisory-lock counter rather than the EXCLUDE.
- **Nothing destructive survives.** `grep -rn "DROP CONSTRAINT" tests/` returns nothing; `git diff -- tests/helpers/db.ts` is empty; the probe container is removed; `drizzle/` stays at `0025_audit_resolved_by.sql` with `git status --short drizzle/` empty (GATE-06).

## Task Commits

1. **Task 1: Extend the standing catalog assertion** - `0c51a36` (test)
2. **Task 2: The recorded (N+1)th-booking mutation** - `2ec88a5` (docs)

## Files Created/Modified

- `tests/availability/open-capacity-exclude.test.ts` — D-33's **standing** guard. The `pg_get_constraintdef` query is byte-identical and still scoped by `n.nspname = ${testDb.schema}`. Added: existence assertion before destructuring; `EXCLUDE USING gist` kind assertion; regex on the full range expression `tstzrange(starts_at, ends_at, '[)'(::text)?) WITH &&` so a stray `'[)'` elsewhere in the predicate cannot stand in for the bound form. Header note states this is the standing guard and that the destructive proof lives, hand-run and never automated, in the sibling file.
- `tests/availability/exclusion-race.test.ts` — comment-only. A 176-line OBSERVED RED header block: HEAD sha `0c51a36` + clean `git status`, the vacuous probe with its measured output and the structural reason it fails, the mutation that works, the exact command, exit code 1, the verbatim failing output, the blast radius, the accepted-codes constant, and the restoration verification.

## Decisions Made

**1. Task 2's checkpoint was executed, not returned.** The plan marked it `checkpoint:human-action` on the belief (from `11-RESEARCH.md`'s Runtime State Inventory) that Docker was unavailable — its step 0 literally reads *"`npm run db:up` (Docker is not running on this box by default)"*. That is corrected: Docker 29.6.1 is running and `fitout-db-1` is up. The gate was therefore not one a human had to resolve; deferring a provable assertion on a stale environment fact would have been the wrong call.

**2. The destructive work ran on a throwaway container, not on `fitout_test`.** A disposable `postgis/postgis:18-3.6` container on port 55432 — matching CI's `gate-db` service — was provisioned with `npm run db:test:setup`, used for both probes, and removed. The real `fitout_test` and the dev `fitout` were verified after the fact to still carry the byte-identical constraint definition; neither was ever a DDL target.

**3. The mutation vehicle is the ephemeral schema, not a persistent one.** The plan offered psql `BEGIN … ROLLBACK` as the low-risk form. Relocating the *same* `ALTER TABLE booking DROP CONSTRAINT booking_no_overlap` statement into `setupTestDb()` is strictly safer still: the mutated schema is dropped by `teardownTestDb`'s `DROP SCHEMA … CASCADE` when the file ends, so there is no manual re-ADD to get wrong and **no window at all** in which a persistent test database sits unconstrained. That window is precisely the risk D-33 named. It also avoids holding an uncommitted DDL transaction open across a separate vitest process, whose visibility semantics would have needed their own proof.

**4. The vacuous probe is documented rather than silently replaced.** The refutation is the more valuable half of the record: the failure mode it closes is a future engineer running the obvious drop, seeing green, and reporting the gate as verified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's prescribed mutation procedure cannot turn the spec red**

- **Found during:** Task 2
- **Issue:** The plan's `how-to-verify` steps 3–4 prescribe `ALTER TABLE booking DROP CONSTRAINT booking_no_overlap` against `fitout_test` followed by running the spec, and predict *"the two racing inserts to BOTH succeed"*. Measured, that procedure produces **`Tests 4 passed (4)`, exit 0**, with the constraint provably absent from the entire database. `setupTestDb()` (`tests/helpers/db.ts:109-139`) creates a fresh `test_<pid>_<worker>_<counter>` schema per file and replays every migration into it, so `drizzle/0005`/`0012`/`0022` re-create the constraint on every run; the spec's inserts resolve to that schema while an unqualified psql `ALTER TABLE` resolves to `public`. Following the plan literally yields a green run mistaken for a completed proof.
- **Fix:** Ran the prescribed probe first and recorded its GREEN result verbatim, then designed and ran a probe that reaches the spec — the identical DDL statement issued inside `setupTestDb()` against the ephemeral schema. Both results are committed in the header block.
- **Files modified:** `tests/availability/exclusion-race.test.ts` (record only; `tests/helpers/db.ts` was mutated in the working tree and reverted, never committed)
- **Verification:** Probe A green/exit 0 with `pg_constraint` count 0; Probe B red/exit 1 with 3 failures; `git diff -- tests/helpers/db.ts` empty after revert; `grep -rn "DROP CONSTRAINT" tests/` returns nothing.
- **Committed in:** `2ec88a5`

**2. [Rule 1 - Bug] The plan's predicted second failure never occurs**

- **Found during:** Task 2
- **Issue:** The plan predicts *"`expect(results.filter(fulfilled)).toHaveLength(1)` receiving 2, **and** the row count assertion receiving 2 instead of 1."* Vitest aborts a test at its first failing `expect`, so the row-count assertion (`:103` as-run) is never reached and appears nowhere in the output. A header transcribed from the plan's prediction would have described a failure that did not happen — exactly the "asserted from memory" defect the OBSERVED RED convention exists to prevent.
- **Fix:** The header records only what was observed, and explicitly names the predicted-but-unreached assertion as unreached.
- **Files modified:** `tests/availability/exclusion-race.test.ts`
- **Verification:** Verbatim captured output contains no `expect(n).toBe(1)` failure.
- **Committed in:** `2ec88a5`

**3. [Rule 2 - Missing critical functionality] Added a positive control for the standing guard**

- **Found during:** Task 1 / confirmed in Task 2
- **Issue:** A catalog assertion that has only ever been seen green is indistinguishable from one that reads nothing — the recurring failure across this phase's plans.
- **Fix:** The same mutation was run across the whole `tests/availability/` directory, confirming the new existence assertion goes red at `open-capacity-exclude.test.ts:180` with a message naming both the constraint and the schema. That output is quoted in the header block.
- **Files modified:** `tests/availability/exclusion-race.test.ts` (the record), `tests/availability/open-capacity-exclude.test.ts` (the assertion)
- **Verification:** `Tests 5 failed | 165 passed (170)` under mutation; `170 passed (170)` after revert.
- **Committed in:** `0c51a36` and `2ec88a5`

---

**Total deviations:** 3 auto-fixed (2× Rule 1, 1× Rule 2)
**Impact on plan:** No scope creep. All three are corrections to the plan's *verification mechanics*, not to its intent — D-33's intent (proof by observation, read-only standing guard, nothing destructive in the suite) is fully preserved and is now actually supported by evidence rather than by a procedure that could not produce it.

## Issues Encountered

**The plan's stale environment premise.** `11-RESEARCH.md`'s Runtime State Inventory reported Docker and local Postgres unavailable, which is why Task 2 was a blocking human checkpoint and why its step 0 says *"Docker is not running on this box by default"*. Corrected at execution time: Docker 29.6.1 running, `fitout-db-1` up on 5432 with `fitout` and `fitout_test` provisioned. Resolved by performing the proof directly.

**`psql` is not on PATH.** Every SQL step ran via `docker exec <container> psql -U fitout -d fitout_test`, which is equivalent for these purposes. The plan's psql `BEGIN … ROLLBACK` variant was not used — see Decision 3.

## Verification Results

| Check | Result |
|---|---|
| `npx vitest run tests/availability/open-capacity-exclude.test.ts` | `4 passed (4)` |
| `npx vitest run tests/availability/` (after restoration) | `19 files, 170 passed (170)` |
| `npm test` (full suite) | `134 passed \| 1 skipped (135)` files, `1216 passed \| 4 skipped (1220)` tests — exactly the phase baseline |
| `npm run lint` | 0 errors, 9 warnings (all pre-existing, unrelated files) |
| `git status --short drizzle/` | empty; latest migration still `0025_audit_resolved_by.sql` (GATE-06) |
| Restored constraint byte-equal to captured | `BYTE-EQUAL: YES` (251 bytes, `cmp`) |
| Real `fitout_test` + dev `fitout` constraint definitions | unchanged, byte-identical — never DDL targets |
| `grep -rn "DROP CONSTRAINT" tests/` | no matches — nothing destructive in the suite |
| Probe container removed | `docker ps -a --filter name=fitout-gate04-probe` empty |

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GATE-04's constraint-mutation clause is complete. The remaining GATE-04 work (the selector inventory, D-31/D-32) is untouched by this plan and lives in its own plan.
- **A warning for any plan that touches `tests/helpers/db.ts` or `drizzle/`:** the per-file schema replay in `setupTestDb()` is what makes every integration spec's DB assertions meaningful. This plan's headline finding is that mutations outside that replay path are invisible to the suite. Any future attempt to verify a database invariant by mutating a persistent schema will measure nothing.
- No blockers. CI job 2 runs the full suite, so the standing guard now executes off this machine.

---
*Phase: 11-quality-gates-pattern-layer-app-shell*
*Completed: 2026-08-13*
