---
phase: 19-host-listing-surfaces-gates-that-actually-run
plan: 10
subsystem: api
tags: [server-actions, error-handling, routing, next, drizzle, vitest, tdd]

# Dependency graph
requires:
  - phase: 19-07
    provides: the D-03 copy module, the query token and the grid notice that renders the sentence
  - phase: 19-09
    provides: the D-02 reuse read (availability_block conjunct) that this plan moved inside the guard
provides:
  - "`createDraftListing` resolves `{ ok: false, error: LISTING_CREATE_FAILED_STATE }` on infrastructure failure instead of throwing — the reuse read AND the insert are both guarded"
  - "`CreateDraftListingResult` — a narrowed exported result type whose success arm carries a required `id: string`, making the page's dead `!res.id` check unrepresentable rather than merely deleted"
  - "a three-way failure router in `new/page.tsx`: the suspension race → `/host/verify`, the session race → `/login`, genuine infrastructure failure → the grid with the D-03 token"
  - "`tests/design/listing-create-refusal-routing.test.ts` — a DB-free, build-blocking census that reddens by name when the action's refusal set and the router stop agreeing"
affects: [host listing surfaces, D-03 creation-failure signal, any future refusal added to createDraftListing]

actuals:
  tokens: 14527
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A `catch` returns an IMPORTED constant and logs the error object — never returns it (T-19-32)"
    - "A dead branch is removed by narrowing the producer's TYPE so `tsc` proves it unreachable, not by deleting the check"
    - "A DB-free design-suite census keeps a producer's enumerated outcomes and its consumer's router in agreement, build-blocking"

key-files:
  created:
    - tests/listing/create-failure.test.ts
    - tests/listing/create-routing.test.ts
    - tests/design/listing-create-refusal-routing.test.ts
  modified:
    - src/app/actions/listing.ts
    - src/app/(host)/host/listings/new/page.tsx
    - src/lib/listing/create-signal.ts

key-decisions:
  - "The `try` opens AFTER both the session check and the verification gate return, so a deliberate refusal can never be caught and re-served as a generic infrastructure apology"
  - "The reuse read is inside the guard alongside the insert — CR-01 names both statements and guarding one would close half the gap while reading as if it closed all of it"
  - "The two live race windows are routed to their own destinations rather than being dressed as infrastructure failure, which is what makes `create-signal.ts`'s ban on verification wording true by CONSTRUCTION instead of by the branch being unreachable"
  - "No third message was invented — all five exported constants in `create-signal.ts` are byte-unchanged; only which refusal reaches them changed"
  - "The `!res.id` check was made IMPOSSIBLE by `CreateDraftListingResult`, not deleted — deleting a branch because it looks unreachable is a judgement a later edit can silently falsify"

patterns-established:
  - "Failing-db PROXY over the real test db: delegate everything, diverge only where a module-scoped holder asks, so the verification read, the reuse read and the owner scoping all stay REAL"
  - "Census assertions assert a COUNT as well as membership — a membership-only check stays green exactly when a new case is added"

requirements-completed: [HSURF-02]

coverage:
  - id: D1
    description: "`createDraftListing` resolves `{ ok: false }` instead of rejecting for a rejecting insert, a synchronously throwing insert, and a throwing reuse read"
    requirement: HSURF-02
    verification:
      - kind: integration
        ref: "tests/listing/create-failure.test.ts#resolves { ok: false } when the INSERT returns a rejected promise (the database went away)"
        status: pass
      - kind: integration
        ref: "tests/listing/create-failure.test.ts#resolves { ok: false } when db.insert THROWS SYNCHRONOUSLY"
        status: pass
      - kind: integration
        ref: "tests/listing/create-failure.test.ts#resolves { ok: false } when the D-02 REUSE READ throws — the read is inside the guard too"
        status: pass
    human_judgment: false
  - id: D2
    description: "No infrastructure detail reaches the host — the returned value carries no text from the underlying failure, and the error goes to `console.error` under `[listing:create]` (T-19-32)"
    requirement: HSURF-02
    verification:
      - kind: integration
        ref: "tests/listing/create-failure.test.ts — expectCalmFailure / expectOneTaggedLogLine, asserted in all three failure cases"
        status: pass
      - kind: unit
        ref: "tests/design/listing-create-refusal-routing.test.ts#the copy module still imports NOTHING, so no runtime value can reach a host-facing sentence"
        status: pass
    human_judgment: false
  - id: D3
    description: "A deliberate refusal is not swallowed: a host in a refusing verification state still receives the verification refusal even with a database failure injected"
    requirement: HSURF-02
    verification:
      - kind: integration
        ref: "tests/listing/create-failure.test.ts#REFUSAL NOT SWALLOWED — a suspended host still gets the verification refusal, not the apology"
        status: pass
    human_judgment: false
  - id: D4
    description: "Each refusal reaches the destination that describes it — the suspension race to `/host/verify`, the session race to `/login`, infrastructure failure to the grid with the D-03 token, success into the wizard"
    requirement: HSURF-02
    verification:
      - kind: integration
        ref: "tests/listing/create-routing.test.ts — all four cases"
        status: pass
    human_judgment: false
  - id: D5
    description: "The dead `!res.id` branch is impossible by type rather than merely absent, and nothing else in the tree that expected `ListingResult` is affected"
    verification:
      - kind: other
        ref: "npx tsc --noEmit (exit 0, no diagnostic anywhere in the tree)"
        status: pass
      - kind: unit
        ref: "tests/design/listing-create-refusal-routing.test.ts#the page routes both named refusals, and its failure block tests `res.ok` alone"
        status: pass
    human_judgment: false
  - id: D6
    description: "A fourth refusal added without a routing decision reddens a build-blocking test by name"
    verification:
      - kind: unit
        ref: "tests/design/listing-create-refusal-routing.test.ts#the action returns exactly THREE refusals, and they are the three the page routes"
        status: pass
      - kind: manual_procedural
        ref: "temporary fourth `{ ok: false }` return added to createDraftListing, red observed, reverted (see Watched Reds §3)"
        status: pass
    human_judgment: false
  - id: D7
    description: "The three source gates already standing over `new/page.tsx` stay green, and the D-03 copy is byte-unchanged"
    verification:
      - kind: integration
        ref: "tests/host/verification-surface.test.ts (CLAIM 4) + tests/listing/create-signal.test.ts"
        status: pass
      - kind: other
        ref: "git diff src/lib/listing/create-signal.ts — every changed line is a comment line"
        status: pass
    human_judgment: false
  - id: D8
    description: "The D-03 sentence as the host actually experiences it: calm muted copy inline above the grid, naming the state, the reason and the way out, after a real creation failure"
    requirement: HSURF-02
    verification: []
    human_judgment: true
    rationale: "Reachability, routing and copy content are all machine-proven above, but whether the rendered notice reads as calm and adequate to a host who just lost a creation attempt is a UX judgement no assertion makes. It needs a human looking at the surface."

# Metrics
duration: 20 min
completed: 2026-09-04
status: complete
---

# Phase 19 Plan 10: The D-03 Failure Signal Becomes Reachable Summary

**`createDraftListing` now fails by RETURNING — a guarded reuse read and insert, a narrowed result type that makes the page's dead `!res.id` check unrepresentable, and a three-way router that sends the two race windows to their own destinations so the D-03 grid sentence is left for genuine infrastructure failure alone.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-04T11:57:00Z
- **Completed:** 2026-09-04T12:17:00Z
- **Tasks:** 3
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- **The gap is closed at the origin.** `createDraftListing` had no `try`/`catch` anywhere, so a dead connection threw straight past the page into Next's error boundary and the sentence plan 19-07 shipped was unreachable for the one case it existed to catch. It now resolves `{ ok: false, error: LISTING_CREATE_FAILED_STATE }` — for a rejecting insert, a synchronously throwing insert, and a throwing reuse read alike.
- **The guard's boundary is the security property, and it is asserted rather than assumed.** The `try` opens after both the session check and the verification gate return, so a deliberate refusal can never be caught and re-served as a generic apology. A suspended host driven through an injected database failure still receives `HOST_VERIFICATION_LISTING_REFUSED` and produces no log line at all.
- **The two live race windows stopped wearing infrastructure copy.** A suspension landing between the page's verification read and the action's now goes to the account check; a session lapsing between the two session reads goes to sign-in. That is what leaves the grid bounce for genuine infrastructure failure — and it converts `create-signal.ts`'s ban on verification wording from a hope into a property that holds by construction.
- **The dead branch is gone because it became impossible.** `CreateDraftListingResult`'s success arm carries a required `id: string`, so `tsc` proves the `!res.id` half of the old condition unrepresentable at the origin. Nothing else in the tree that expected `ListingResult` was affected.
- **A fourth refusal can no longer arrive unrouted.** A DB-free, build-blocking census derives the action's refusal set from source, asserts a count of three, and names the offending expression when it changes.

## Task Commits

1. **Task 1: the action can fail without throwing (tracer, TDD)** — `95f963b` (fix)
2. **Task 2: the page routes each refusal to its true destination (TDD)** — `48e0b9b` (fix)
3. **Task 3: the census, and the comments that stopped being false** — `318ecf4` (test)

**Plan metadata:** see the `docs(19-10)` commit following this summary.

## Watched Reds

The plan required three. All three were observed against the shipped tree before the fix, and none was a harness error.

### 1. Task 1 — the rejecting insert (and its two siblings)

`npx vitest run tests/listing/create-failure.test.ts` → **3 failed | 2 passed (5)**. The three failure cases failed because the promise REJECTED, with the frame inside the action itself:

```
Error: ECONNREFUSED 127.0.0.1:5432 (injected by create-failure.test.ts)
 ❯ Object.values tests/listing/create-failure.test.ts:108:56
 ❯ createDraftListing src/app/actions/listing.ts:298:28

Error: ECONNREFUSED 127.0.0.1:5432 (injected by create-failure.test.ts)
 ❯ Proxy.<anonymous> tests/listing/create-failure.test.ts:103:19
 ❯ createDraftListing src/app/actions/listing.ts:298:12

Error: ECONNREFUSED 127.0.0.1:5432 (injected by create-failure.test.ts)
 ❯ Proxy.<anonymous> tests/listing/create-failure.test.ts:117:19
 ❯ createDraftListing src/app/actions/listing.ts:269:6
```

The failing assertion in each case was the `expect(res.ok).toBe(false)` line — never reached, because the error escaped `createDraftListing` first. `:298` is the insert and `:269` is the reuse read, which is the measured proof that BOTH statements were unguarded. The CONTROL and REFUSAL-NOT-SWALLOWED cases were already green, which is what establishes the harness and the seed were sound rather than the red being a setup failure.

### 2. Task 2 — the two routing cases

`npx vitest run tests/listing/create-routing.test.ts` → **2 failed | 2 passed (4)**. The two race windows were both landing on the grid:

```
× the VERIFICATION refusal goes to the account check, not to the grid sentence
    expected '/host/listings?create=failed' to be '/host/verify'

× the NO-SESSION refusal goes to sign-in, not to the grid sentence
    expected '/host/listings?create=failed' to be '/login'
```

The infrastructure and success cases were green from the start, so exactly the two cases the plan predicted were red, and they redirected to exactly the destination the plan predicted.

### 3. Task 3 — the fourth refusal

A temporary fourth `{ ok: false }` return was added to `createDraftListing`, the census run, the red observed, and the edit reverted (`git diff --stat src/app/actions/listing.ts` empty afterwards, census green again):

```
AssertionError: `createDraftListing` now has 4 `{ ok: false }` return(s), not 3.
Collected: "You must be signed in to create a listing." | HOST_VERIFICATION_LISTING_REFUSED |
"A fourth refusal that nobody routed." | LISTING_CREATE_FAILED_STATE.
A REFUSAL WAS ADDED OR REMOVED AND THE PAGE THAT ROUTES THEM HAS NOT BEEN TOLD.
  expected 4 to be 3
```

The message names the offending expression, which is the property that makes the red actionable rather than merely present.

## Names A Later Reader Will Search For

- **The narrowed result type:** `CreateDraftListingResult` (`src/app/actions/listing.ts`) — `{ ok: true; id: string } | { ok: false; error: string }`.
- **The log tag:** `[listing:create]`, emitted as `console.error("[listing:create] draft mint failed", { userId, err })`. It is asserted by name in `tests/listing/create-failure.test.ts` (`LOG_TAG`).

## Files Created/Modified

- `tests/listing/create-failure.test.ts` — 5 cases driving the real action against a PROXY over the real test db (rejecting insert, sync insert throw, throwing reuse read, control, refusal-not-swallowed). The proxy delegates everything and diverges only where a module-scoped holder asks, so `loadHostVerification`, the reuse read and the owner scoping all execute for real.
- `tests/listing/create-routing.test.ts` — 4 cases driving the page's failure block, one per destination.
- `tests/design/listing-create-refusal-routing.test.ts` — the DB-free build-blocking census: the refusal count and shape, the router's coverage, and the copy module's zero-import property.
- `src/app/actions/listing.ts` — the guarded region, the `LISTING_CREATE_FAILED_STATE` import, `CreateDraftListingResult`, and a SECURITY CONTRACT line recording the resolve-not-throw contract and the log-never-return rule.
- `src/app/(host)/host/listings/new/page.tsx` — the three-way failure router, two new imports, the `res.id` check gone, and header prose corrected from a claim that was aspirational to one that is now true.
- `src/lib/listing/create-signal.ts` — **comments only.** All five exported constants are byte-identical; verified by diffing and confirming every changed line is a comment line.

## Decisions Made

- **The reuse read went inside the guard, not just the insert.** CR-01 names both statements and both throw. Guarding only the insert would have closed half the gap while reading as if it closed all of it — and the third failure case exists specifically to keep that honest.
- **The throwing-read case fails the SECOND `select`, not the first.** `loadHostVerification` performs a `select` on the same handle before the reuse read does; failing the first would have measured the verification read — a statement outside the guarded region — and the case would have passed while proving nothing.
- **`/login` is written last as the enumerated remainder, not as a catch-all.** Its comment says so plainly and names the census as what keeps the enumeration exhaustive, so a reader adding a fourth refusal learns where the decision has to be made.
- **The census asserts a COUNT, not just membership.** A membership-only check would stay green exactly when a fourth refusal is added, which is the one change that needs a human decision.
- **Assertion 3 duplicates a case in `tests/listing/create-signal.test.ts` on purpose.** That file needs the Postgres preflight and cannot run inside `next build`; this one blocks the build. The property that makes a runtime value structurally unable to reach host copy is now checked on the cheap always-run path too.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] My own replacement prose re-introduced the stale line citation it was removing**

- **Found during:** Task 3, Part B
- **Issue:** The rewritten `create-signal.ts` paragraph explained the change by writing "this paragraph's predecessor cited `new/page.tsx:66-78`" — which put the exact stale citation string back into the file. That fails the task's acceptance criterion literally, and substantively it re-created the WR-08 hazard the edit existed to remove: a line reference sitting in a source file, pointing at code that has since moved, believed because it is specific.
- **Fix:** Rewrote the sentence to describe the change by ROLE ("name the page's blocks by ROLE rather than by line number") without spelling the old citation, and stated why a wrong citation is worse than none.
- **Files modified:** `src/lib/listing/create-signal.ts`
- **Verification:** `grep -c "page.tsx:66-78"` → 0; `grep -nE "new/page\.tsx:[0-9]"` → no match; import count still 0; diff still comment-only.
- **Committed in:** `318ecf4` (part of the Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug, self-inflicted and caught by the task's own acceptance criterion before commit)
**Impact on plan:** None on scope or behaviour. The fix was to comment text in the same file the task was already editing, and it made the task's stated criterion actually hold rather than appear to.

## Issues Encountered

None. The precondition (local Postgres reachable, `fitout_test` provisioned) was verified before Task 1 by running `tests/listing/crud.test.ts` (23 passed), so no case in this plan was ever measuring a harness failure.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change was introduced. The plan installs nothing (T-19-10-SC), and `T-19-10-05` (GET-with-a-write on `/host/listings/new`, WR-07) is carried forward as `accept` exactly as the plan's register records — converting the route to a POST is a D-01 design change outside this gap-closure run's scope.

## Verification Results

| # | Command | Result |
|---|---------|--------|
| 1 | `npx vitest run tests/listing/create-failure.test.ts` | 5 passed |
| 2 | `npx vitest run tests/listing/create-routing.test.ts` | 4 passed |
| 3 | `npx vitest run --config vitest.design.config.ts` | 76 files, 1347 passed, 3 skipped (pre-existing) |
| 4 | `npx vitest run tests/listing/crud.test.ts tests/listing/create-signal.test.ts tests/host/verification-surface.test.ts` | 62 passed (crud's four D-02 cases intact) |
| 5 | `npx tsc --noEmit` | exit 0, clean |
| 6 | `git status --porcelain "src/app/(host)/host/listings/[id]/"` | empty (D-09 held) |
| 7 | Three watched reds recorded | see § Watched Reds |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **19-VERIFICATION gap 2 is closed**, and closed at the origin rather than at the symptom: the D-03 apparatus 19-07 built is now reachable for the one case it was written for and unreachable for the two it would have misdescribed.
- **HSURF-02's remaining unclassified probe row** is carried in `19-09-PLAN.md`'s assumptions block, not restated here, so the no-silent-drop accounting stays at one entry per probe row.
- **Carried forward, unchanged:** WR-07 (the GET-with-a-write on `/host/listings/new`) remains `accept` with its blast radius bounded to one surplus empty draft by D-02.
- No blockers. Both gap-closure plans for this phase (19-09, 19-10) are now executed; the phase is ready for re-verification.

---
*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Completed: 2026-09-04*

## Self-Check: PASSED

All three created test files exist on disk; all three task commits (`95f963b`, `48e0b9b`, `318ecf4`) are present in `git log`.
