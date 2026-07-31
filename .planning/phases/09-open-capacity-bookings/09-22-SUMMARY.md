---
phase: 09-open-capacity-bookings
plan: 22
subsystem: group-bookings
tags: [postgres, drizzle, server-action, occupancy-mode, group-bookings, defence-in-depth, audit, idor]

requires:
  - phase: 09-open-capacity-bookings
    provides: "the persisted listing.occupancy_mode column (OC-01) this guard keys on"
  - phase: 09-open-capacity-bookings
    provides: "createOpenCapacityHold — the REAL claim that mints the drop-in-shaped row the gate is proven against"
  - phase: 08-group-bookings
    provides: "createGroup, the D-111 capacity snapshot, the D-113 organizer-seat arithmetic and the shared DENIED sentence"
provides:
  - "the occupancy-mode guard in BOTH createGroup's pre-read gate and its defence-in-depth INSERT predicate"
  - "the `open_capacity` audit reason — the operator-side distinction behind the caller-side shared DENIED sentence"
  - "a truthful booking-detail-page comment naming all three server-re-checked conditions"
affects: [09-21, 09-23, 09-24, 09-25, phase-verification]

tech-stack:
  added: []
  patterns:
    - "A refusal predicate is PROJECTED as a boolean column rather than filtered in the WHERE when the denial needs a distinct AUDIT reason — the caller still gets the shared sentence, the operator still gets the distinction, and it stays one round trip (the 09-20 `not_blocked` idiom)"
    - "The mode is checked BEFORE the capacity floor, because on an open-capacity listing max_occupancy means something else entirely (a daily admissions cap, not a room rating)"
    - "Where a harness cannot cleanly defeat an internal gate, the defence-in-depth property is asserted STRUCTURALLY over sliced statements of the shipped source rather than by faking a bypass"

key-files:
  created: []
  modified:
    - src/app/actions/group.ts
    - src/app/(app)/bookings/[id]/page.tsx
    - tests/group/open-capacity-group-guard.test.ts

key-decisions:
  - "The pre-read gate PROJECTS `(l.occupancy_mode = 'exclusive') AS \"modeOk\"` instead of filtering `AND l.occupancy_mode = 'exclusive'` in its WHERE — a deviation from the plan's literal instruction (a), taken because the plan's own instruction (c) requires a distinct `open_capacity` audit reason, and a row the WHERE discarded cannot tell an operator whether the caller was walking stranger ids or holding a genuine paid pass. T-09-77's posture is that the distinction lives IN THE AUDIT TRAIL while the caller sees the shared sentence; the WHERE form would have destroyed the trail half. The INSERT's predicate is the plan's literal form, so the acceptance grep still prints 2."
  - "The mode refusal is placed BEFORE the max_occupancy floor, not after: on an open-capacity listing max_occupancy is the venue's DAILY ADMISSIONS CAP (OC-01), so the floor would be judging a number that means something else. Refusing on mode first means the cap is never read in a context where it does not mean what the floor thinks."
  - "Case (3) asserts the defence-in-depth property STRUCTURALLY — it reads the shipped group.ts, slices the gate statement and the INSERT statement apart, and requires the predicate in each. The plan sanctions this when the harness cannot cleanly bypass the gate, and it cannot: the gate is internal to createGroup, and monkey-patching db.execute would prove a property of the mock. Slicing the statements is strictly stronger than a file-level `grep -c == 2`, which would pass if BOTH copies landed in the gate."
  - "The four `openCapacity: false` literals are untouched, per the plan's <do_not_relitigate>. They are now ENFORCED facts rather than an unenforced premise."

patterns-established:
  - "Confirm-then-fix across an interrupt: the branch-A confirmation was committed as its own `test(...)` commit before any src/ change, so the defect's reality survives independently of the fix that closes it"
  - "The mutation is chosen to leave the SCOPE CONTROL green — case (2) stayed passing under the mutation, which is what makes case (1)'s red attributable to the mode predicate rather than to group creation breaking outright"

requirements-completed: [OPEN-03]

duration: ~25min (resumed after interrupt)
completed: 2026-08-01
---

# Phase 09 Plan 22: A Drop-in Pass Cannot Mint a Group (CR-05) Summary

**`createGroup` now refuses a drop-in booking in BOTH its pre-read gate and its INSERT's own `WHERE`, closing the seam where one paid admission on a 30-cap gym minted twenty-nine RSVP-able seats — the listing's DAILY admissions cap — and told up to twenty-nine strangers they were coming.**

## Performance

- **Duration:** ~25 min (plan resumed after a mid-execution interrupt)
- **Tasks:** 2 of 2 (Task 1 pre-committed as `c15e35c`; Task 2 completed here)

## This Plan Was RESUMED After an Interrupt

A previous executor was interrupted partway through. State inherited at start:

- **Branch A was already committed** as `c15e35c test(09-22): confirm CR-05 — a drop-in pass mints the daily cap as RSVP seats` — the 321-line test file, written FIRST against unchanged `src/`.
- **An incomplete fix fragment had been reverted.** The working tree was clean at `c15e35c`, with `src/` byte-identical to HEAD. The interrupted attempt had selected `modeOk` but never used it and had not touched the INSERT.

The interrupted executor's reasoning about the column form was offered as *input, not decision*. It was evaluated against the plan on its merits and **adopted** — see the deviation below, which records why the plan's literal instruction (a) and the plan's own instruction (c) are in tension and which one governs.

## Task 1 — CR-05 Was Independently Confirmed (BRANCH A)

CR-05 arrived from `09-REVIEW.md` **reported but NOT independently verified**. It is now verified real. The confirming run, against unchanged `src/` (HEAD `910cdbd`, `git status --short -- src/` empty), verbatim:

```
 ❯ tests/group/open-capacity-group-guard.test.ts (1 test | 1 failed) 2696ms
     × (1) a confirmed drop-in pass cannot mint a group offering the whole day's cap as RSVP seats 69ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/group/open-capacity-group-guard.test.ts > CR-05 — a drop-in pass cannot mint a group > (1)
 a confirmed drop-in pass cannot mint a group offering the whole day's cap as RSVP seats
AssertionError: expected 29 to be +0 // Object.is equality

- Expected
+ Received

- 0
+ 29

 ❯ tests/group/open-capacity-group-guard.test.ts:288:41
```

**Twenty-nine RSVP-able seats against ONE paid admission.** The refusal assertions below it were never reached — the action returned `ok: true` with a group id and a live invite token.

The assertion is a **seat count read back out of Postgres**, not a returned sentence, so a fix that refused politely and still wrote the row could not make it green.

## Task 2 — The Fix

### (a)+(c) The pre-read gate

`src/app/actions/group.ts` now projects the mode as a boolean and refuses on it:

- The gate `SELECT` gains `(l.occupancy_mode = 'exclusive') AS "modeOk"` — no new query, the `JOIN listing l` was already there.
- A refusal branch returns the **shared `DENIED` sentence** (byte-identical to the `max_occupancy < 2` case) and records an audit entry in the same shape with `reason: "open_capacity"`.
- Placed **before** the capacity floor, with the reason stated in the comment.

### (b) The defence-in-depth INSERT predicate

`AND l.occupancy_mode = 'exclusive'` added to the INSERT's `WHERE`, alongside the owner scope, the status scope and the capacity floor. The existing comment now names the third scope and says what a group on a drop-in pass would actually mint. **A bypassed gate writes nothing.**

### (d) The comment that CR-05 proved false (T-09-76)

`src/app/(app)/bookings/[id]/page.tsx` claimed `createGroup` "re-checks ownership and confirmation server-side" — true of two of the three conditions, and false for exactly the one Phase 9 added. It now names all three and records that the mode was the one no server check enforced. `groupEligible` and its three-condition expression are untouched (`git diff -U0 | grep -c "groupEligible\|getOwnedGroupByBooking"` on removed lines prints `0`).

### (e) The test grew from confirmation into regression guard

| # | Case | Proves |
|---|------|--------|
| 1 | a confirmed drop-in pass cannot mint a group offering the whole day's cap as RSVP seats | the harm — seat count read from `booking_group`, then the refusal sentence |
| 2 | an exclusive booking on the SAME cap still mints a group with the organizer's seat reserved | the **scope guard** — 29 seats is the CORRECT answer on an exclusive booking |
| 3 | BOTH statements carry the mode predicate, so a bypassed pre-read gate still writes nothing | defence in depth, asserted over sliced statements of the shipped source |

Case 2's listing (`L_EXCL`) is identical to the drop-in listing in every field that matters — same cap, same rates, same venue, same trading hours — so its green is attributable to the mode and nothing else.

## The Mutation — Measured, Not Asserted

Mutation applied to `src/app/actions/group.ts`: the gate's projected boolean replaced with a constant `true AS "modeOk"` (so the refusal branch is reached but can never fire) **and** `AND l.occupancy_mode = 'exclusive'` deleted from the INSERT's `WHERE` — i.e. both guards removed at once. Observed output, verbatim:

```
 ❯ tests/group/open-capacity-group-guard.test.ts (3 tests | 2 failed) 2363ms
     × (1) a confirmed drop-in pass cannot mint a group offering the whole day's cap as RSVP seats 65ms
     × (3) BOTH statements carry the mode predicate, so a bypassed pre-read gate still writes nothing 23ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/group/open-capacity-group-guard.test.ts > CR-05 — a drop-in pass cannot mint a group > (1)
 a confirmed drop-in pass cannot mint a group offering the whole day's cap as RSVP seats
AssertionError: expected 29 to be +0 // Object.is equality

- Expected
+ Received

- 0
+ 29

 ❯ tests/group/open-capacity-group-guard.test.ts:369:41
```

**The same seat count, from the same assertion, as the Task-1 confirmation** — the mutation reproduces the defect exactly, which is what makes case 1 a measurement of the guard rather than a restatement of it.

**Case 2 stayed GREEN throughout the mutation.** Removing the guard does not disturb exclusive group creation, so case 1's red is attributable to the mode predicate specifically.

Restored → 3 passed. `git diff --exit-code src/` **exit 0** after the fix commit — no mutation residue.

## Deviations from Plan

### 1. [Deliberate design deviation] The pre-read gate PROJECTS the predicate instead of filtering on it

- **Found during:** Task 2(a)
- **Issue:** The plan's instruction (a) says "Add `AND l.occupancy_mode = 'exclusive'` to the pre-read gate". The plan's instruction (c) says "record an audit entry in the same shape with a distinct reason (e.g. `open_capacity`) so an operator can tell the two denials apart in the trail". **These two cannot both hold.** With the predicate in the `WHERE`, the gate returns no row and control reaches `if (!gate) return { ok: false, error: NOT_CONFIRMED }` — a path that records **no audit entry at all** and cannot distinguish a drop-in booking from a nonexistent one. Instruction (c) would have been silently unsatisfiable.
- **Fix:** The gate projects `(l.occupancy_mode = 'exclusive') AS "modeOk"` and branches in TypeScript, exactly as `createOpenCapacityHold` does with `not_blocked` (09-20, `src/lib/availability/units.ts:845`). One round trip, no new query. The caller-facing behaviour is unchanged from the plan's intent: the shared `DENIED` sentence (T-09-77). The operator-facing behaviour is what instruction (c) asked for.
- **The plan's hard requirement is fully met:** the guard is in **BOTH** the pre-read gate and the INSERT's `WHERE`. `grep -c "occupancy_mode = 'exclusive'" src/app/actions/group.ts` prints **2**, as the acceptance criterion demands, because the projected form contains the same literal.
- **Files modified:** `src/app/actions/group.ts`
- **Commit:** `443e74b`

### 2. [Rule 1 - Bug] Backticks inside a `sql` template literal broke the parse

- **Found during:** Task 2(b)
- **Issue:** The extended INSERT comment used markdown-style backticks around `` `GREATEST(l.max_occupancy - 1, 0)` `` **inside** the `sql\`…\`` tagged template. A backtick terminates the template literal. `[PARSE_ERROR] Expected `,` or `)` but found `Identifier`` at `group.ts:326:62`; the whole suite failed to transform.
- **Fix:** Rewrote the comment to reference `the GREATEST(...) above` without backticks. Caught by the very next test run.
- **Files modified:** `src/app/actions/group.ts`
- **Commit:** `443e74b`

### 3. [Acceptance-criterion compliance] Comment reflow initially tripped the "snapshot untouched" grep

- **Found during:** Task 2 verification
- **Issue:** `git diff -U0 src/app/actions/group.ts | grep '^-' | … | grep -c "capacity_snapshot\|GREATEST\|ON CONFLICT"` printed **1** instead of the required `0`. The single hit was a **comment** line containing `capacity_snapshot` that my re-wrap of the defence-in-depth block had removed and re-added in a different position.
- **Assessment:** This grep is a *genuine* guard (the plan's stated intent: "the D-111 snapshot and the at-most-one-group lock are untouched"), not one of the known unsatisfiable ones. It was cheap to honour exactly.
- **Fix:** Re-flowed the comment so the three original lines carrying `capacity_snapshot` stay **byte-identical**, and only the first two lines (which name the repeated scopes, and which the plan explicitly requires be extended) change. Now prints `0`.
- **Files modified:** `src/app/actions/group.ts`
- **Commit:** `443e74b`

## Acceptance Criteria — Measured

| Criterion | Required | Actual |
|-----------|----------|--------|
| `grep -c "occupancy_mode = 'exclusive'" src/app/actions/group.ts` | `2` | **2** |
| `grep -c "DENIED" src/app/actions/group.ts` | ≥ 12 | **15** |
| removed lines matching `capacity_snapshot\|GREATEST\|ON CONFLICT` | `0` | **0** |
| `grep -c "openCapacity: false" src/app/actions/group.ts` | unchanged (1) | **1** |
| `grep -c "ownership and confirmation server-side" page.tsx` | `0` | **0** |
| `grep -c "occupancy" page.tsx` | ≥ 6 | **7** |
| removed lines matching `groupEligible\|getOwnedGroupByBooking` | `0` | **0** |
| `grep -c "capacity_snapshot"` in the test | ≥ 1 | **2** |
| `grep -c "2026-"` in the test | `0` | **0** |
| `grep -c "createOpenCapacityHold"` in the test | ≥ 1 | **3** |
| test file length | ≥ 90 lines | **458** |

## Verification

| Gate | Result |
|------|--------|
| `npx vitest run tests/group/open-capacity-group-guard.test.ts` | **3 passed** |
| `npx vitest run tests/group` | **9 files / 83 tests passed** — the Phase-8 lifecycle, seat-claim, RSVP and owner-scope suites unaffected |
| `npx vitest run` (full suite) | **1058 passed / 4 skipped**, 1 failure — the KNOWN pre-existing `date-pass-picker` case-4 multi-suite timeout (`deferred-items.md` item 3). Baseline was 1055; +3 is exactly this plan's three cases. **No new failures.** |
| `npx tsc --noEmit` | **exit 0** |
| `npm run lint` | **0 errors** / 7 baseline warnings (none in touched files) |
| `git diff --exit-code src/` after mutation restore | **exit 0** |

## No Migration

No schema change. The guard keys on `listing.occupancy_mode`, which already exists (`NOT NULL DEFAULT 'exclusive'`, so the predicate is never NULL and there is no three-valued-logic hole). **Next migration number remains 0023.**

## Threat Model Dispositions

| Threat | Disposition | Status |
|--------|-------------|--------|
| T-09-73 EoP — `createGroup` on a drop-in booking granting the daily cap | mitigate | **Closed** — guard in both statements, case 1 asserts the seat count |
| T-09-74 Spoofing — `cap − 1` strangers told they are coming | mitigate | **Closed** — the group can no longer exist, so the seat claim is unreachable on an open booking |
| T-09-75 Info disclosure — invite emails describing a pass as a 16-hour reservation | mitigate | **Closed** — the four `openCapacity: false` literals are now enforced-true |
| T-09-76 Repudiation — a comment asserting a server re-check that did not exist | mitigate | **Closed** — comment corrected, grep asserts the false sentence is gone |
| T-09-77 Info disclosure (oracle) — "not yours" vs "can't host a group" | accept | **Held** — both return the shared `DENIED`; distinction lives only in the audit trail (`open_capacity` vs `no_capacity`) |
| T-09-SC Tampering — package installs | mitigate | **N/A** — no package installed by this plan |

## Known Stubs

None.

## Threat Flags

None — this plan removes surface rather than adding it. No new endpoint, auth path, file access pattern or schema change at a trust boundary.

## Self-Check: PASSED

- `src/app/actions/group.ts` — FOUND (modified, guard present in both statements)
- `src/app/(app)/bookings/[id]/page.tsx` — FOUND (modified, comment corrected)
- `tests/group/open-capacity-group-guard.test.ts` — FOUND (458 lines, 3 cases, both runs recorded verbatim in header)
- Commit `c15e35c` (Task 1, branch-A confirmation) — FOUND
- Commit `443e74b` (Task 2, the fix) — FOUND
