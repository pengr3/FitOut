---
phase: 19-host-listing-surfaces-gates-that-actually-run
plan: 06
subsystem: testing
tags: [playwright, drizzle, postgres, vitest, routing, idempotency, next-app-router]

requires:
  - phase: 19-host-listing-surfaces-gates-that-actually-run (plan 19-05)
    provides: "19-FINDING-404.md — VERDICT A, the eleven-URL anonymous probe matrices, and § 8's statement of what the guard is for"
  - phase: 19-host-listing-surfaces-gates-that-actually-run (plan 19-04)
    provides: "the four orphan drafts deleted — the residue this plan stops at its source"
  - phase: 18.1 (D-255 / PM-C)
    provides: "the host-verification gate in createDraftListing that the reuse read must sit behind"
provides:
  - "e2e/host-route-reachability.spec.ts — a ~2s anonymous routing guard whose RED names the route, not the fixture (D-11)"
  - "reuse-then-mint in createDraftListing — creation is idempotent against a human retry (D-02)"
  - "three vitest cases pinning D-02, with the load-bearing conjunct proven load-bearing"
affects: [19-07, 19-08, gate-e2e, host listing wizard, any future host-route regression]

actuals:
  tokens: 21604
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A guard's failure SENTENCE is the deliverable; the coverage is incidental"
    - "Status-branched failure messages — a red that can fire two ways needs two first sentences"
    - "Reuse-then-mint: an owner-scoped read between an authorization gate and an insert"

key-files:
  created:
    - e2e/host-route-reachability.spec.ts
  modified:
    - src/app/actions/listing.ts
    - tests/listing/crud.test.ts
    - .planning/phases/19-host-listing-surfaces-gates-that-actually-run/deferred-items.md
    - .planning/WINDOWS.md

key-decisions:
  - "The operating_hours NOT EXISTS conjunct WAS added — assumption A9 was resolved by measurement, not left open"
  - "The guard's failure message branches on the observed status: a 200 says the guard went vacuous, a 404 says the route stopped resolving"
  - "The reuse branch writes nothing — a reuse must not bump updated_at, or it would fix only one repeat"
  - "Case 2's wizard step writes a NON-title field, so updated_at = created_at is the only conjunct under test"

patterns-established:
  - "Watch the guard go red BOTH ways: the disarmed case and the real case"
  - "A test that depends on a premise asserts the premise first (case 3 checks updated_at == created_at before it means anything)"

requirements-completed: [HSURF-02]

coverage:
  - id: D1
    description: "A host-facing route that stops resolving goes red in ~2s with a message naming the discriminator, not in 60s with a message about fixtures (D-11)"
    requirement: HSURF-02
    verification:
      - kind: e2e
        ref: "e2e/host-route-reachability.spec.ts (4 tests, chromium)"
        status: pass
      - kind: other
        ref: "watched-red: maxRedirects removed -> all four report 200; temporary bogus route -> 404 with the routing sentence"
        status: pass
    human_judgment: false
  - id: D2
    description: "The guard asserts ROUTING and never authorization — every request anonymous, and nothing under the edit route's directory touched (D-10)"
    requirement: HSURF-02
    verification:
      - kind: other
        ref: "git status --porcelain 'src/app/(host)/host/listings/[id]/' -> no output"
        status: pass
    human_judgment: false
  - id: D3
    description: "Pressing Create listing twice yields ONE listing row for that host (D-02)"
    requirement: HSURF-02
    verification:
      - kind: integration
        ref: "tests/listing/crud.test.ts#(D-02 · case 1) two consecutive creations return the SAME id and grow the table by exactly one row"
        status: pass
    human_judgment: false
  - id: D4
    description: "A draft the host has genuinely started is NEVER reused — not via a wizard step, not via a photo"
    requirement: HSURF-02
    verification:
      - kind: integration
        ref: "tests/listing/crud.test.ts#(D-02 · case 2) a draft the host has STARTED EDITING is never reused"
        status: pass
      - kind: integration
        ref: "tests/listing/crud.test.ts#(D-02 · case 3) a draft with a listing_photo is never reused"
        status: pass
      - kind: other
        ref: "watched-red: timestamp conjunct removed -> case 2 fails by name, cases 1 and 3 stay green"
        status: pass
    human_judgment: false
  - id: D5
    description: "saveListingStep stays UNGATED and unchanged (D-270); zero migrations, zero dependencies"
    requirement: HSURF-02
    verification:
      - kind: other
        ref: "git diff -U0 hunk map shows no hunk in saveListingStep; ls drizzle/*.sql | tail -1 -> 0029_listing_review_cascade.sql; git status --porcelain package.json package-lock.json -> empty"
        status: pass
      - kind: unit
        ref: "tests/listing/crud.test.ts#(D-270) saveListingStep on an EXISTING draft still succeeds for an UNVERIFIED host"
        status: pass
    human_judgment: false

duration: 34 min
completed: 2026-09-04
status: complete
---

# Phase 19 Plan 06: The Instrument and the Source Fix — Summary

**A ~2s anonymous Playwright guard that says "THIS HOST ROUTE STOPPED RESOLVING" instead of "seed the local database", and a reuse-then-mint branch in `createDraftListing` that makes plan 19-04's orphan delete a genuine one-off.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-09-04T03:15:00Z (approx — first task work)
- **Completed:** 2026-09-04T03:49:00Z
- **Tasks:** 3 of 3
- **Files modified:** 3 source/test files (1 created, 2 modified) + 2 planning records

## Accomplishments

- **D-11's guard exists, and its red was proven diagnostic in both directions.** Four anonymous
  requests to `/host/listings`, `/host/listings/new`, `/host/listings/route-reachability/edit` and
  `/host/listings/route-reachability/availability`, each expecting `307`. No fixture, no seed, no
  database.
- **D-02's source fix landed.** `createDraftListing` now returns the host's own most-recent
  *untouched* empty draft when one exists, and mints otherwise — with a predicate that cannot adopt
  work a host has started, and a docblock that states its own limits rather than overclaiming.
- **The load-bearing terms were proven load-bearing** by deleting them and watching the correct case
  fail, twice, on two different files.

## Task Commits

1. **Task 1: `e2e/host-route-reachability.spec.ts` — D-11's guard** — `0529e4c` (test)
2. **Task 2: reuse-then-mint in `createDraftListing`** — `e3fdc42` (feat)
3. **Task 3: the three D-02 cases** — `f8c412f` (test)

## Files Created/Modified

- `e2e/host-route-reachability.spec.ts` *(new, 109 lines)* — the routing guard. Four routes, `request`
  not `page`, `maxRedirects: 0`, a literal `[id]` segment.
- `src/app/actions/listing.ts` *(+103/−5)* — `desc` added to the drizzle import; the reuse read and
  its docblock inserted between the D-255 verification gate and the insert.
- `tests/listing/crud.test.ts` *(+140)* — a `D-02` describe block with three cases; `listingPhoto`
  added to the schema import.
- `.planning/phases/…/deferred-items.md` — new entry **D3** (see Issues Encountered).
- `.planning/WINDOWS.md` — entry 7, same subject.

---

## What the plan asked this summary to record

### 1. The routing guard's wall-clock for the whole file

| Reading | Value | What it includes |
|---|---|---|
| **Test bodies (the honest cost of the guard)** | **~2.1s** (slowest of four, run in parallel) | just the four anonymous requests |
| **Playwright's reported total, warm `.next`** | **8.7s** — best of six runs; 10.4–12.4s typical | + the mandatory `npm run dev` boot |
| Playwright's reported total, **cold** `.next` | **42.8s** | + a full first compile of four route modules |

**The <10s acceptance criterion is met on the warm reading (8.7s) but it is not a stable number, and
that deserves saying rather than rounding.** The variable is not the spec: `reuseExistingServer:
false` (17-D24/D-28, deliberately unconditional) means EVERY invocation of this file alone boots its
own dev server, so a solo run is dominated by the boot, not by the assertions. **In `gate-e2e`, where
the server is booted once for all 39 specs, this file adds ~2.1s.** That is the number that matters
and it is the one the guard was designed around.

### 2. The watched-red for the guard — produced with the redirect option removed

Verbatim, from the shipped file with `{ maxRedirects: 0 }` deleted (all four routes reported it):

```
Error: /host/listings answered 200. Expected 307.
THIS GUARD HAS GONE VACUOUS — it is not telling you anything about the route. A 200 means the
redirect was FOLLOWED and this is the login page answering, which happens when `maxRedirects: 0` is
missing from the request below. Restore it; the assertion asserts nothing without it. (This is also
exactly what the deliberate non-vacuity check looks like.)
…
Expected: 307
Received: 200
```

**Restored, and confirmed green: 4 passed.**

**A second watched-red, not asked for but worth more than the first.** The 200 branch only proves the
option is load-bearing; it does not prove the *404 sentence* — the actual deliverable — ever fires.
So a temporary fifth route (`/host/listings/route-reachability/TEMP-404-PROBE`, a genuinely
non-existent path) was added for one run:

```
Error: /host/listings/route-reachability/TEMP-404-PROBE answered 404. Expected 307.
THIS HOST ROUTE STOPPED RESOLVING. A 404 here does NOT mean the listing is missing and does NOT mean
the ownership check refused: this request carries no cookie, so the page redirects to the login route
BEFORE it reads the database. A 404 therefore means the ROUTER never reached the module — no
application code ran.
Check the RUNNING server's manifest before reading this as an application bug:
  grep -c 'listings/\[id\]/edit' .next/dev/server/app-paths-manifest.json   # 0 = absent (dev)
  grep -c 'listings/\[id\]/edit' .next/app-path-routes-manifest.json        # prod
```

It fired in **267ms** with the right sentence. The temporary row was removed
(`grep -c TEMP-404-PROBE` → 0) and the file is back to four routes.

### 3. The watched-red for D-02 case 2 — produced with the timestamp conjunct removed

Verbatim, with `sql\`${listing.updatedAt} = ${listing.createdAt}\`` commented out of the predicate:

```
FAIL tests/listing/crud.test.ts > D-02 — createDraftListing reuses the host's own UNTOUCHED empty
draft, and only that > (D-02 · case 2) a draft the host has STARTED EDITING is never reused —
different id, two rows

AssertionError: THE UNACCEPTABLE DIRECTION — the predicate is TOO LOOSE and just adopted a draft this
host has already written into. In production that means: the host presses `Create listing` to start
their SECOND space, lands in the wizard for their FIRST one already half filled in, edits it,
OVERWRITES REAL WORK, and never learns a second listing was not created. […]
: expected 'e1de0509-4ebb-4c5f-903e-e976ba63102b' not to be 'e1de0509-4ebb-4c5f-903e-e976ba63102b'

Tests  1 failed | 21 passed (22)
```

**Cases 1 and 3 stayed GREEN throughout, and that is the second half of the evidence, not an
afterthought:** case 3 is guarded by the *photo* conjunct, not the timestamp one, so its staying green
while case 2 reddens proves the two cases are pinning different terms rather than duplicating each
other. Conjunct restored; `git diff --stat` against the task-2 commit returns empty, so the restore is
byte-exact. 22/22 green.

### 4. The `operating_hours` conjunct — added, and A9 is no longer an assumption

**It was added.** Research assumption **A9** — whether the availability editor also writes to the
`listing` row — was not left unverified: `grep -rn 'update(listing)' src/` returns exactly five sites
(`src/app/actions/listing.ts` ×4 and `src/lib/listing/re-review.ts:195`) and
**`src/app/actions/operating-hours.ts` is not among them**. Its writes at `:165-167` delete and
re-insert `operating_hours` rows only. So this is the *same measured gap* as the photo one, not a
hypothetical: a host with operating hours on an otherwise-fresh draft still reads
`updated_at = created_at`.

Adding it also costs nothing in the direction that matters — it can only make reuse **rarer**, and
too-tight is today's behaviour (one surplus empty draft, visible and deletable) while too-loose is
silent data loss on a host's own content.

### 5. Final spec count

```
$ ls e2e/*.spec.ts | wc -l
39
```

**38 → 39**, as planned. This is the number plan 19-08 records against the wall-clock, and the number
`gate-e2e` runs. The new file joins the `chromium` project automatically via `testMatch:
"e2e/*.spec.ts"` — no config change.

### 6. `saveListingStep` unchanged, and `drizzle/` unmoved

- `git diff -U0` on `src/app/actions/listing.ts` produces exactly three hunks — `@@ -36 +36,4 @@`
  (the import), `@@ -106,4 +109,67 @@` (the docblock), `@@ -153,0 +220,32 @@` (the reuse read).
  **None is inside `saveListingStep`**, which begins after all three. It stays UNGATED (D-270), and
  its own pinning case still passes by name.
- `ls drizzle/*.sql | tail -1` → **`drizzle/0029_listing_review_cascade.sql`**. No migration.
- `git status --porcelain package.json package-lock.json` → **empty**. No dependency.
- `git status --porcelain 'src/app/(host)/host/listings/[id]/'` → **empty**. The shipped ownership
  check at `edit/page.tsx:49-51` was read and never touched (D-10).

---

## Decisions Made

1. **The failure message branches on the observed status.** The research body carried one
   unconditional sentence. But this file can go red exactly two ways — a 404 (D-11's subject) and a
   200 (the guard disarmed) — and a single sentence would confidently name the first while the second
   was true. That is precisely the costs-60-seconds-and-lands-on-the-wrong-diagnosis failure the file
   exists to stop, so shipping it would have been self-refuting. A four-line `leadingSentence(status)`
   fixes it; both branches were then watched firing.
2. **The reuse branch writes nothing.** Returning the row without touching it is deliberate and
   commented: any write would bump `updated_at` via `$onUpdate`, making the row ineligible on the
   *next* press, so the branch would fix one repeat and not the class.
3. **Case 2's wizard step writes `description`, never `title`.** The predicate carries `title IS NULL`
   as belt-and-braces, so a step that set the title would keep case 2 green through that conjunct
   alone — and the watched-red would have proven nothing. Writing a non-title field leaves
   `title IS NULL` true and makes the timestamp term the only thing standing between the host and
   having their work adopted.
4. **Case 3 asserts its own premise before it asserts anything else.** It checks
   `updated_at == created_at` on the photo'd row *first*. The day `listing-photo.ts` starts touching
   the listing row, case 3 stops being a test of the photo loophole — and it now says so instead of
   silently passing for the wrong reason.

## Deviations from Plan

### Auto-fixed / plan-adjacent

**1. [Rule 2 — Missing critical functionality] The guard's failure sentence misdiagnosed its own second trigger**
- **Found during:** Task 1, at the watched-red step
- **Issue:** The message led unconditionally with "THIS HOST ROUTE STOPPED RESOLVING". Correct for a
  404; **wrong for the 200** that the non-vacuity check itself produces. The one deliverable of this
  file is a red that does not mislead.
- **Fix:** `leadingSentence(status)` picks the sentence. The 404 branch is unchanged from the
  research body; the 200 branch says the guard has gone vacuous and how to re-arm it.
- **Verification:** both branches watched firing (§ 2 above), then 4/4 green.
- **Committed in:** `0529e4c`

**2. [Plan-adjacent] The 404 branch was watched red too, which the plan did not require**
- The plan's acceptance criteria ask only for the 200 evidence. The 404 sentence is the actual
  deliverable, so it was proven with a temporary bogus route and then removed. Recorded in § 2.

**3. [Recorded, not fixed] The research's `src/db/schema.ts` path is `src/lib/db/schema.ts`**
- Three `read_first` entries and the guard's docblock reference `src/db/schema.ts:202`. The real path
  is `src/lib/db/schema.ts:202`; the line number and the claim (`listing.id` is `text`) are both
  correct. The shipped docblock uses the **correct** path. No source change.

---

**Total deviations:** 1 auto-fixed (Rule 2), 1 extra verification, 1 documentation correction.
**Impact:** No scope creep. The Rule-2 fix is inside the one file the task creates and improves the
only thing that file ships.

## Issues Encountered

**⚠ The new guard went RED ONCE and the discriminating status was NOT captured.**

During the plan-level `<verification>` step 3, one run reported **3 of 4 routes failing** —
`/host/listings/new`, `…/edit`, `…/availability` — with `/host/listings` passing. **Every other run
was green: six consecutive, three before and three after**, plus two further attempts that
deliberately restaged the one condition that differed (an `npx tsc --noEmit` immediately preceding in
the same shell invocation). **Not reproduced.**

**The status was not captured, and that is the real failure here.** The command's `grep` filter was
`^  ok|^  x|passed|failed`, which prints the per-test result lines but **not** the guard's own
`… answered NNN. Expected 307.` line — the single datum that separates a 404 (this phase's entire
subject) from a 500, a reset, or a boot race. Playwright's `test-results/` artifacts were cleared by
the next run before they were read.

**No cause is named** (D-11; 19-RESEARCH Pitfall 3). This is explicitly **not** recorded as a
reproduction of the phantom 404 — nothing measured says it was one. It is recorded as an observation
whose discriminating value was destroyed by how it was observed, which is the same class of loss D-11
exists to prevent, one level up: *the instrument fired and the reading was not taken.*

Logged to `deferred-items.md` (**D3**) and `.planning/WINDOWS.md` (**entry 7**), both carrying the
capture protocol from `19-FINDING-404.md § 8` for whoever sees it next.

**One toolchain note:** a `tsc --noEmit` run immediately after Playwright killed its dev server
produced six phantom `TS1005`/`TS1128` errors in `.next/dev/types/routes.d.ts` and
`validator.ts` — the known half-written-artifact gotcha, named in `19-FINDING-404.md`'s own opening.
Re-running with no dev server mid-write returned exit 0. Not a code defect; recorded so the next
reader does not chase it.

## Known Stubs

None. No hardcoded empties, placeholders, `TODO`s or `FIXME`s were introduced —
`grep -nE "TODO|FIXME|placeholder|coming soon"` over both new/modified test files returns nothing.

## Threat Flags

None. The plan's register (T-19-25 … T-19-SC) is fully addressed and no new security-relevant surface
was introduced:

| Threat | Disposition | Evidence |
|---|---|---|
| T-19-25 EoP — reuse read | mitigated | `grep -c "export async function createDraftListing()"` → 1; zero parameters, owner-scoped by session argument |
| T-19-26 InfoDisclosure — draft existence to an unverified host | mitigated | the read sits textually after the refusal `return` and before `db.insert(listing)` |
| T-19-27 Tampering — adopting a host's in-progress listing | mitigated | cases 2 and 3; case 2 watched red |
| T-19-28 EoP — the edit route's ownership check | mitigated | `git status --porcelain` on that directory → empty; the guard's own message forbids softening it |
| T-19-29 DoS — concurrent creation racing the check | **accepted, documented** | the docblock states check-then-act, human-retry-not-concurrency, cost = one surplus empty draft |
| T-19-30 Spoofing — ambient session turning 307 into 200 | mitigated | `request` not `page`; `maxRedirects: 0` present and watched |
| T-19-SC — package installs | not engaged | `git status --porcelain package.json package-lock.json` → empty |

## Verification Results

| # | Gate | Result |
|---|---|---|
| 1 | `npx tsc --noEmit` | **exit 0** |
| 2 | `npx vitest run` (whole suite) | **exit 0** — 216 files passed, 2 skipped; **2682 passed** (2679 → 2682, exactly +3) |
| 3 | `npx playwright test e2e/host-route-reachability.spec.ts --project=chromium` | **exit 0**, 4 passed, 8.7s reported / ~2.1s of assertions |
| 4 | `ls e2e/*.spec.ts \| wc -l` | **39** |
| 5 | `ls drizzle/*.sql \| tail -1` | **`drizzle/0029_listing_review_cascade.sql`** |
| 6 | `git status --porcelain package.json package-lock.json` | **empty** |

Plus: `grep -c maxRedirects` → 3, `grep -c app-paths-manifest` → 1, `grep -c '{ page }'` → 0,
`grep -c listing_photo src/app/actions/listing.ts` → 5, `grep -c operating_hours` → 3,
`grep -c updatedAt` → 4.

## Requirements

**HSURF-02** is declared by this plan **and by sibling plan 19-07**, which has no SUMMARY yet. The
shared-ID gate (`requirements.ready-ids`) therefore holds it *blocked* rather than marking it
Complete. **That is the gate working as designed and it was not forced** — it will flip once 19-07
finishes.

## Next Phase Readiness

- **Ready for 19-07.** Nothing this plan changed is a dependency of it; `createDraftListing`'s
  signature is unchanged (zero arguments) and its single caller
  (`(host)/host/listings/new/page.tsx:80`) needed no edit.
- **Ready for 19-08**, which records the wall-clock against the spec count: the number is **39**.
- **One open item carried forward:** the uncaptured red (D3 / WINDOWS 7). It does not block anything,
  and the next person to see this guard go red now has a written protocol instead of a blank page —
  which was the point of the plan.

---
*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Plan: 06*
*Completed: 2026-09-04*

## Self-Check: PASSED

All three key files verified present on disk (`e2e/host-route-reachability.spec.ts`,
`src/app/actions/listing.ts`, `tests/listing/crud.test.ts`). All three task commits verified in
`git log --oneline --all` (`0529e4c`, `e3fdc42`, `f8c412f`). All six plan-level verification gates
re-run and passing. No stubs introduced.
