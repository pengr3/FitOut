---
phase: 19-host-listing-surfaces-gates-that-actually-run
plan: 09
subsystem: api
tags: [drizzle, postgres, vitest, design-gate, server-actions, d-02]

requires:
  - phase: 19-06
    provides: the D-02 reuse-then-mint predicate and its first three D-02 cases, which this plan extends
  - phase: 19-08
    provides: sequence position only — worktrees are OFF, so wave 9 is this plan's slot on `dev`
provides:
  - "A third `NOT EXISTS` conjunct on `availability_block` in `createDraftListing`'s reuse read — a draft the host has blocked dates on is never reused"
  - "`(D-02 · case 4)` in tests/listing/crud.test.ts — watched RED against the shipped predicate, then GREEN"
  - "tests/design/listing-reuse-predicate-census.test.ts — a DB-free, build-blocking gate asserting the predicate's completeness as a CHECKED property rather than a comment"
  - "A standing raw-SQL writer assertion: every `UPDATE listing` under src/ sets `updated_at` before its `WHERE`, over comment-stripped source"
  - "A corrected `createDraftListing` docblock whose stated census method is two patterns (Drizzle + raw SQL) and can therefore see every writer"
affects: [listing-creation, host-listing-wizard, ops-review, reuse-predicate, design-gate]

actuals:
  tokens: 8704   # chars/4 over the realized diff (4912430..HEAD, 34,815 chars)
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Completeness-as-a-checked-property: a set whose members are derived from source at runtime and required to be either covered or exempted-with-a-reason, so the N+1th member reddens a build-blocking test by name"
    - "Anti-vacuity assertions on a source-scanning gate: a derived set of length zero must FAIL, never pass"
    - "Load-bearing comment-stripping proven by a both-directions assertion — the unstripped scan is asserted to be RED, so the strip cannot become decorative"

key-files:
  created:
    - tests/design/listing-reuse-predicate-census.test.ts
  modified:
    - src/app/actions/listing.ts
    - tests/listing/crud.test.ts

key-decisions:
  - "`listing_review`'s exemption reason was CORRECTED against source rather than inherited from the plan: it is the D-221 ops review-HISTORY table, not a booking-derived guest review, so 'a review requires a completed booking' was false"
  - "`src/lib/db/schema.ts` is read UNSTRIPPED when deriving the child-table set, because `stripComments` can only REMOVE and under-counting that set is the falsely-green direction"
  - "The raw-SQL scan walks `.ts` AND `.tsx` under `src/`, a deliberate widening of the plan's `.ts`, because including `.tsx` can only ADD hits and the asserted truth is about every raw-SQL writer under `src/`"

patterns-established:
  - "Census gate: derive the input set from schema source, derive the output set from a narrowed function-body slice, assert equality against an EXEMPT map of written reasons"
  - "A design test that scans source must prove its own scan is non-vacuous (derived set non-empty, known hits present) before asserting the property"

requirements-completed: [HSURF-02]

coverage:
  - id: D1
    description: "A draft carrying an `availability_block` row is never reused by `createDraftListing` — the host gets a new empty listing, not their blocked one"
    requirement: "HSURF-02"
    verification:
      - kind: integration
        ref: "tests/listing/crud.test.ts#(D-02 · case 4) a draft with an availability_block is never reused, even though updated_at = created_at"
        status: pass
      - kind: integration
        ref: "npx vitest run tests/listing/crud.test.ts (23 passed, cases 1-4 green)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every child table of `listing` is either covered by a `NOT EXISTS` conjunct or carries a written exemption reason, and an eighth child table reddens a build-blocking test by name"
    requirement: "HSURF-02"
    verification:
      - kind: unit
        ref: "tests/design/listing-reuse-predicate-census.test.ts#every child of `listing` is either covered by a NOT EXISTS conjunct or carries a written exemption"
        status: pass
      - kind: unit
        ref: "tests/design/listing-reuse-predicate-census.test.ts#no table is BOTH covered by a conjunct and listed as exempt"
        status: pass
      - kind: unit
        ref: "npx vitest run --config vitest.design.config.ts (75 files, 1344 passed)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every raw-SQL statement under `src/` that updates the `listing` row sets `updated_at` before its `WHERE`, asserted over comment-stripped source"
    requirement: "HSURF-02"
    verification:
      - kind: unit
        ref: "tests/design/listing-reuse-predicate-census.test.ts#each raw `UPDATE listing` statement sets updated_at before its WHERE"
        status: pass
      - kind: unit
        ref: "tests/design/listing-reuse-predicate-census.test.ts#comment-stripping is LOAD-BEARING here, not decorative — the raw read would be RED"
        status: pass
    human_judgment: false
  - id: D4
    description: "`createDraftListing`'s docblock states a verification method that finds the writers the previous method could not see (raw SQL), names the four exemptions, and pins four D-02 cases"
    requirement: "HSURF-02"
    verification:
      - kind: unit
        ref: "npx vitest run --config vitest.design.config.ts tests/design/listing-reuse-predicate-census.test.ts — still green with the new docblock prose in place, which is what proves the stripping is real"
        status: pass
      - kind: other
        ref: "git diff src/app/actions/listing.ts — comment-only (0 non-comment changed lines); the four protected passages appear as context only"
        status: pass
    human_judgment: true
    rationale: "Whether the corrected prose actually reads as true and complete to the next engineer is a judgment no machine makes. The machine-checkable halves (the raw-SQL census, the comment-only diff, the four protected passages) are all asserted and green; the prose quality is not."

duration: 18 min
completed: 2026-09-04
status: complete
---

# Phase 19 Plan 09: The D-02 availability_block Loophole, and the Census That Catches the Fourth Summary

**Closed GAP 1 by adding the third `NOT EXISTS` conjunct — and then closed the CLASS with a DB-free, build-blocking census that derives every child of `listing` from schema source and requires each one to be covered or exempted with a written reason.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-04T11:36:00Z (approx — first `read_first` read)
- **Completed:** 2026-09-04T11:54:00Z
- **Tasks:** 3
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- **The reachable hole is closed.** `src/app/actions/blocks.ts`'s `addBlock` inserts an
  `availability_block` row and performs no `db.update(listing)`, so a draft the host blocked dates on
  still read `updated_at = created_at` and was silently adopted by the next *Create listing*. The
  third conjunct makes that writer visible to the predicate.
- **The class is closed, not the instance.** `tests/design/listing-reuse-predicate-census.test.ts`
  derives the child-table set from `src/lib/db/schema.ts` at runtime (7 tables today) and asserts it
  equals the covered set plus the `EXEMPT` keys. An eighth child table reddens it by name. This was
  the deliverable — the census method, not the census output.
- **The docblock's stated method can now see raw SQL.** The old sentence
  (`grep -n 'update(listing)' src/` … "and nothing else") is a true grep and a false census; it
  missed `src/app/actions/ops-review.ts:667` and `:751`. Both set `updated_at = now()` explicitly, so
  this was a method fix rather than a bug fix — and the raw-SQL half is now machine-checked.
- **Two reds were watched, not assumed** — recorded verbatim below.

## Task Commits

1. **Task 1: The fourth D-02 case (RED) then the third conjunct (GREEN)** — `33a9ddb` (fix)
2. **Task 2: The build-blocking census** — `9f736c8` (test)
3. **Task 3: The docblock tells the truth about its own verification method** — `d4695fa` (docs)

**Plan metadata:** see the `docs(19-09)` commit that carries this file.

## The Two Watched Reds (verbatim)

### RED 1 — case 4 against the shipped predicate (before Task 1 Step 3)

Run: `npx vitest run tests/listing/crud.test.ts` → `Tests 1 failed | 22 passed (23)`.

The failure landed on the `.not.toBe(...)` behaviour assertion at `tests/listing/crud.test.ts:641`
— **not** on setup and **not** on the premise assertion, which is what makes the case meaningful:

```
FAIL  tests/listing/crud.test.ts > D-02 — createDraftListing reuses the host's own UNTOUCHED empty
draft, and only that > (D-02 · case 4) a draft with an availability_block is never reused, even
though updated_at = created_at
AssertionError: THE UNACCEPTABLE DIRECTION, VIA THE AVAILABILITY-BLOCK LOOPHOLE — ...
: expected '2aec3d41-0ef5-476d-b94f-b922d79bf076' not to be '2aec3d41-0ef5-476d-b94f-b922d79bf076'
// Object.is equality
 ❯ tests/listing/crud.test.ts:641:11
    641|     ).not.toBe(first.id);
       |           ^
```

The premise assertion (`updatedAt.getTime() === createdAt.getTime()`) **passed** in the same run,
which is the proof that the block insert genuinely leaves the listing row untouched and that the
timestamp term could never have closed this gap.

After the conjunct: `Tests 23 passed (23)`.

### RED 2 — the census against a temporary undecided child table

A throwaway `pgTable("throwaway_census_probe", …)` carrying `.references(() => listing.id …)` was
appended to `src/lib/db/schema.ts`, the census run, the red observed, and the file reverted with
`git checkout -- src/lib/db/schema.ts` (confirmed clean afterwards):

```
FAIL  tests/design/listing-reuse-predicate-census.test.ts > D-02 — every child table of `listing`
is DECIDED: covered by a conjunct, or exempted with a reason > every child of `listing` is either
covered by a NOT EXISTS conjunct or carries a written exemption
AssertionError: UNDECIDED CHILD TABLE(S) OF `listing`: throwaway_census_probe.
A table references `listing.id` and `createDraftListing`'s reuse predicate neither checks for it nor
records why it does not need to. YOUR JOB IS TO DECIDE WHICH, NOT TO DELETE THIS ASSERTION.
...
: expected [ 'throwaway_census_probe' ] to deeply equal []
 ❯ tests/design/listing-reuse-predicate-census.test.ts:252:7
```

**The other direction was demonstrated too** (the acceptance criterion asks only for the second, but
both are cheap): adding `listing_photo` — a table that IS covered by a conjunct — to `EXEMPT`
reddened the disjointness property by name:

```
AssertionError: These tables are covered by a `NOT EXISTS` conjunct AND listed in `EXEMPT`:
listing_photo. The exemption is stale — its reason claims the predicate does not need to check this
table, while the predicate checks it. ...
: expected [ 'listing_photo' ] to deeply equal []
 ❯ tests/design/listing-reuse-predicate-census.test.ts:266:7
```

Both probes were reverted; `git status --porcelain src/lib/db/schema.ts` is empty and the committed
`EXEMPT` map holds exactly the four real exemptions.

## The Census Numbers

**Child tables derived from `src/lib/db/schema.ts` at runtime: 7.** Not hardcoded — the derivation
walks each `.references(() => listing.id` occurrence back to its nearest preceding `pgTable("<name>"`:

| Child table | Decided as | Line of the FK in schema.ts |
|---|---|---|
| `listing_photo` | COVERED (conjunct 1) | 295 |
| `listing_amenity` | EXEMPT | 314 |
| `listing_activity_tag` | EXEMPT | 325 |
| `listing_review` | EXEMPT | 478 |
| `operating_hours` | COVERED (conjunct 2) | 1035 |
| `availability_block` | COVERED (conjunct 3 — **new**) | 1053 |
| `booking` | EXEMPT | 1092 |

**Raw-SQL scan:** 5 `UPDATE listing` hits before stripping, **2 after** — both in
`src/app/actions/ops-review.ts` (`:667`, `:751`), both setting `updated_at = now()`. The three
stripped hits are comment-only and live in exactly the three files the plan predicted:
`src/app/actions/listing.ts:136` (the D-02 docblock), `src/lib/db/schema.ts:180`, and
`src/lib/design/visual-baselines.ts:867`. **None of those three prose statements sets `updated_at`,
so an unstripped scan is RED against a correct tree** — which is why the file carries an explicit
assertion that the unstripped read produces violations while the stripped one does not. The strip is
proven load-bearing rather than assumed to be.

`UPDATE listing_review` (`ops-review.ts:276`) is correctly NOT counted — the scan matches
`UPDATE\s+listing\b`, and `_` is a word character, so `listing_review` has no boundary after
`listing`.

## The Four Exemption Reasons, As Confirmed Against Source

Each was re-derived this session from the source named in it, per the plan's instruction to confirm
rather than inherit. **One disagreed with the plan and was corrected** — see Deviations.

1. **`listing_amenity`** — written ONLY by `saveListingStep` (the sole `insert(listingAmenity)` under
   `src/`, at `src/app/actions/listing.ts:555`), inside the SAME `db.transaction` (`:532`) as its
   `.update(listing).set(patch)` (`:535`) whose `patch` sets `updatedAt: new Date()` explicitly
   (`:525`). The child row and the parent's timestamp commit together, so the timestamp term already
   catches it.
2. **`listing_activity_tag`** — identical writer, identical transaction (`tx.insert` at `:563`),
   identical reason.
3. **`listing_review`** — **CORRECTED.** This is the D-221 ops review-HISTORY table, not a guest
   review. Its only writer is `markForReReview` (`src/lib/listing/re-review.ts:212`), which appends a
   row solely when its preceding `conn.update(listing).set({ reviewState: "pending" })` actually
   moved a row — a Drizzle update through the `listing` table object, so `$onUpdate` has already
   pushed `updated_at` off `created_at`. And it cannot fire on a draft at all: that UPDATE is guarded
   by `inArray(listing.reviewState, ["approved","grandfathered","rejected"])` (`re-review.ts:142-146`)
   while a fresh row defaults to `review_state = 'pending'` (`schema.ts:260`), making the statement a
   0-row no-op with no history row appended.
4. **`booking`** — a draft is never bookable. `deriveBookable` (`src/lib/bookability.ts:109-131`)
   requires `listing.status === "published"` AND `hasOperatingHours`; a fresh draft is
   `status = 'draft'` with no `operating_hours` row, and the second of those the predicate already
   covers with its own conjunct.

## Files Created/Modified

- `tests/design/listing-reuse-predicate-census.test.ts` (**new**, 369 lines) — the standing gate. Three
  properties across 8 tests: every child decided; no table both covered and exempt; every exemption
  has a reason; every conjunct names a real child; every raw-SQL writer sets `updated_at`; the
  word-boundary proof; and the load-bearing-strip proof. Imports no database module, nothing from
  `@/lib/db`, nothing from `tests/helpers/db.ts` — it runs under `vitest.design.config.ts`, which has
  no `globalSetup` and no `setupFiles`.
- `src/app/actions/listing.ts` — one `sql` conjunct appended to the reuse read's `and(...)` (Task 1),
  plus a comment-only docblock correction (Task 3).
- `tests/listing/crud.test.ts` — `availabilityBlock` added to the schema import list, and
  `(D-02 · case 4)` added after case 3 in the D-02 describe block.

## Decisions Made

1. **`listing_review`'s exemption reason was rewritten, not inherited.** The plan sketched "a review
   requires a completed booking, and a booking requires a bookable listing". Source says otherwise:
   `listing_review` is the ops review-history table (D-221) written by `markForReReview`. The plan
   explicitly required each reason be confirmed and "correct if the source disagrees", so it was. The
   corrected reason is also *stronger* — it gives two independent grounds (the Drizzle update that
   necessarily precedes the insert, and the state guard that makes it unreachable on a draft).
2. **`src/lib/db/schema.ts` is read UNSTRIPPED when deriving the child-table set.** `stripComments`
   can only REMOVE text, so stripping here could only ever *under*-count the set of tables that must
   be decided — the falsely-green direction. Over-counting (a comment that happens to spell the
   reference fragment) merely produces a red that forces a decision. The asymmetry is the same one
   `createDraftListing`'s own docblock argues, applied to the census. Measured today: zero comments in
   `schema.ts` spell the fragment, so both readings agree. The reasoning is written into the file
   header rather than left implicit.
3. **The raw-SQL scan walks `.tsx` as well as `.ts`.** The plan said `.ts`; the must-have truth says
   "every raw-SQL statement under `src/`". Including `.tsx` can only ADD hits, never hide one, so the
   widening is strictly in the tight direction and is closer to the stated truth.
4. **The census carries explicit anti-vacuity assertions.** A derived child set of length zero FAILS
   rather than passes, and the raw-SQL scan asserts it found more than zero statements. A census that
   collects nothing passing silently is the exact defect this file exists to remove.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `listing_review`'s planned exemption reason was factually wrong**

- **Found during:** Task 2 (confirming the four exemption reasons against source)
- **Issue:** The plan's reason — "a review requires a completed booking, and a booking requires a
  bookable listing" — describes a guest review. `listing_review` is the D-221 ops review-HISTORY
  table; `src/lib/listing/re-review.ts:212` is its only writer and no booking is involved. Writing
  the plan's text would have shipped a *false* justification inside the very file whose purpose is
  that justifications be checkable.
- **Fix:** Re-derived the reason from `re-review.ts` and `schema.ts` and wrote the true one (two
  independent grounds — see exemption 3 above). The plan mandated exactly this behaviour ("confirm
  each before writing it, not inherit it… correct if the source disagrees").
- **Files modified:** `tests/design/listing-reuse-predicate-census.test.ts`, and the matching
  paragraph in `src/app/actions/listing.ts`'s docblock
- **Verification:** `npx vitest run --config vitest.design.config.ts` exits 0; the `listing_review`
  exemption is exercised by the "every child … decided" property
- **Committed in:** `9f736c8` (Task 2) and `d4695fa` (Task 3)

**2. [Rule 2 - Missing Critical] The `UNTOUCHED` definition paragraph would have gone stale**

- **Found during:** Task 3 (docblock corrections)
- **Issue:** Task 3 named four things to correct. A fifth passage — "WHAT 'UNTOUCHED' IS DEFINED AS",
  which enumerates the predicate's terms and ended "…and no child row in `listing_photo` or
  `operating_hours`" — would have been left asserting a two-table set beside a three-table predicate.
  A docblock whose *definition* contradicts its own code is precisely the failure mode this plan
  exists to remove, so leaving it was not an option.
- **Fix:** Added `availability_block` to that enumeration. Comment text only; no behaviour change.
- **Files modified:** `src/app/actions/listing.ts`
- **Verification:** `git diff` for Task 3 contains zero non-comment changed lines; the four passages
  the plan protects by name (check-then-act, too-loose/too-tight, placement, D-270) appear as context
  only and never as changed lines — confirmed by grepping the diff's `+`/`-` lines for each
- **Committed in:** `d4695fa` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both were mandated by the plan's own instructions (confirm-don't-inherit, and the
docblock's rule that a passage is not left saying something false). No scope creep; no behaviour
change beyond the single conjunct Task 1 specifies.

## Issues Encountered

None. The precondition held on the first run — `tests/global-setup.ts` reached `fitout_test` without
the fix-command preflight failure, and the per-file schema isolation reported clean on every run
(`[test-db] clean: no writes escaped the per-file schema isolation this run.`).

## Verification Results

| # | Check | Result |
|---|---|---|
| 1 | `npx vitest run tests/listing/crud.test.ts` | **PASS** — 23 passed; four D-02 cases, none skipped/todo |
| 2 | `npx vitest run --config vitest.design.config.ts` | **PASS** — 75 files, 1344 passed / 3 skipped (all 3 pre-existing), 0 failed |
| 3 | `npx vitest run --config vitest.design.config.ts tests/design/listing-reuse-predicate-census.test.ts` | **PASS** — 8 tests (≥3 required; none vacuous) |
| 4 | `npx tsc --noEmit` | **PASS** — exit 0, no diagnostics |
| 5 | `git status --porcelain "src/app/(host)/host/listings/[id]/"` | **PASS** — empty (D-09 freeze intact) |
| 6 | Reuse read still AFTER the D-255 gate and BEFORE the insert; `createDraftListing()` takes zero parameters | **PASS** — `loadHostVerification` → three `NOT EXISTS` conjuncts → `db.insert(listing)`, in that order |
| 7 | Exactly three `NOT EXISTS` fragments, naming `listing_photo`, `operating_hours`, `availability_block`, in that order | **PASS** |

## Self-Check: PASSED

- `src/app/actions/listing.ts` — FOUND
- `tests/listing/crud.test.ts` — FOUND
- `tests/design/listing-reuse-predicate-census.test.ts` — FOUND
- Commit `33a9ddb` — FOUND
- Commit `9f736c8` — FOUND
- Commit `d4695fa` — FOUND

No stubs, no skipped tests introduced, no unrun `<verify>` commands. Nothing to append to
`.planning/WINDOWS.md`.

## Threat Flags

None. This plan introduced no new network endpoint, auth path, file-access pattern or schema change.
`T-19-09-01` (owner scoping) and `T-19-09-02` (read placement after the verification gate) were both
re-asserted as Task 1 acceptance criteria and hold; `T-19-09-SC` holds trivially — zero packages were
installed and `package.json` is untouched.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **GAP 1 of `19-VERIFICATION.md` is closed.** Truth 6 ("A draft the host has genuinely started
  editing is never reused") now has the conjunct, the watched-red case, and a standing gate behind it.
- **GAP 2 remains open** — truth 7 (D-03, `createDraftListing` has no `try`/`catch`) is plan `19-10`'s
  subject, and `19-11` carries WR-01/WR-05. Both declare `HSURF-02` alongside this plan, so the
  requirement is deliberately NOT marked complete here: the shared-ID gate holds it until every
  declaring plan has a SUMMARY.
- **No blockers.** `dev` is green on the full design suite and on `tests/listing/crud.test.ts`, and
  `tsc --noEmit` is clean.
- **A note for whoever adds the eighth child table to `listing`:** you will meet
  `tests/design/listing-reuse-predicate-census.test.ts` by name. That is the intended experience. The
  question it asks is whether a writer of your table can insert a row without updating the parent —
  if yes, it needs a conjunct; if no, it needs an `EXEMPT` entry with the source that proves it.

---
*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Completed: 2026-09-04*
