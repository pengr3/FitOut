---
phase: 18-host-verification-listing-review-fitout-ops
plan: 06
subsystem: listing-lifecycle
tags: [re-review, material-edit, guards-in-the-where, two-detection-sites, transaction-atomicity, d-249, resubmission, mutation-testing, lver-03]

# Dependency graph
requires:
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 02
    provides: "`listing.review_state` (pgEnum, default pending, notNull) and the `listing_review` history table whose `submitted_at` column is documented as load-bearing for D-249"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 03
    provides: "the sell-gate term that makes `review_state` decide bookability — which is what makes a flip to pending an actual consequence rather than a badge change"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 05
    provides: "`loadReviewQueue` (the oldest-first read this plan's fresh `submitted_at` is ordered by) and `closeReviewCycle`'s update-the-open-cycle rule, which this plan's appended row is the other half of"
  - phase: 16-listing-photo-hardening
    provides: "the D-165 Cloudinary provenance gate and the D-187 destroy-below-provenance ordering in `listing-photo.ts`, both untouched here and both the reason the photo hook sits where it does"
provides:
  - "`markForReReview(conn, listingId, trigger)` — one guarded flip covering `approved` | `grandfathered` | `rejected` → `pending`, plus the fresh-timestamped `listing_review` row (LVER-03)"
  - "`MATERIAL_FIELDS` — D-231's five, as a `const` tuple with the title/description exclusion recorded beside it and asserted by a test"
  - "material-edit detection in `saveListingStep` for address / space type / capacity / price, INSIDE the existing transaction"
  - "material-edit detection in `persistPhoto` / `removePhoto` for photos — the only site that can see them (D-242) — each inside a transaction with its own photo write"
  - "the route OUT of `grandfathered` (D-213) and the route OUT of `rejected` (D-249), both without a backfill and without an appeals surface"
  - "`tests/listing/material-edit.test.ts` — 28 cases, four of them negatives, both mutation-proved"
affects: [18-07 payout freeze, 18-09 notifications, 18-13 host-facing review signals, 18-14 the phase audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "a shared WRITE helper standing beside two deliberately-duplicated READ re-statements, with the header stating why D-227's no-shared-helper rule governs one and not the other"
    - "a guarded UPDATE whose 0-row result covers BOTH deliberate exclusions (already-pending and taken-off-the-market) so neither is a branch a future edit can forget"
    - "a history-row insert guarded on the flip having moved a row, so a listing already waiting is not re-stamped to the back of the queue on every autosave"
    - "a probe CHECK constraint added and dropped inside one test, on a statement that runs AFTER the thing under test, so the rollback case is diagnostic instead of vacuous"
    - "detection deliberately duplicated across two sites with the reason stated at BOTH and a distinct trigger anchor in every test name"

key-files:
  created:
    - src/lib/listing/re-review.ts
    - tests/listing/material-edit.test.ts
  modified:
    - src/app/actions/listing.ts
    - src/app/actions/listing-photo.ts

key-decisions:
  - "`persistPhoto`'s bare insert was PAIRED INTO A TRANSACTION with the flip. The plan asked for atomicity only at the fields site, but its own sentence — a listing whose address committed while its review state did not is a sellable fake — is exactly as true of a photo, and photos are the field a fake listing lies with most. Both photo sites now pass a `tx`."
  - "The photo hook sits BELOW the provenance gate and BELOW the write, so a provenance-REJECTED add trips nothing. Above the gate it would have been a way for any signed-in caller to knock a listing off the market with a request that writes no row at all — a denial-of-listing primitive inside the phase that exists to stop a destructive one."
  - "`reorderPhotos` is excluded from both sites. Reordering changes which photo is the cover, not what the space is. Stated at the call sites and pinned by a case, so it is a choice with a test rather than an omission."
  - "The fifth review state's quoted literal appears NOWHERE in `re-review.ts`, including in the comment explaining that it is excluded — this plan's own acceptance gate counts that string in that file, and 18-05 hit the same collision three times in one plan. The absence is explained at the site so nobody 'restores clarity' and re-breaks the gate."
  - "The history-row insert is guarded on the flip having moved a row. That is what makes D-249 true in BOTH directions: a resubmission goes to the back of the queue, and a listing that is already waiting keeps its original `submitted_at` however many times its host saves the wizard."
  - "`unitCount` is named at the detection site as unreachable rather than silently omitted from capacity: it has no form field (D-21), is absent from `draftSchema`, and cannot be written by this action at all."
  - "Title and description stay OUT (D-231), and the exclusion is now asserted twice — once against `MATERIAL_FIELDS` and once behaviourally, as a words-only edit that must NOT flip an approved listing."

patterns-established:
  - "Revert a mutation with a targeted patch, never `git checkout -- <file>`, while the file still carries uncommitted work — see deviation 4."
  - "Count CALL SITES, not identifier occurrences: an acceptance grep for a helper name in a file that must also IMPORT it is off by one by construction."

requirements-completed: [LVER-03]
requirements-advanced: []

# Metrics
duration: 22min
completed: 2026-09-01
---

# Phase 18 Plan 06: Material Edit → Re-review Summary

**Approval stops being a permanent grant and rejection stops being a death sentence: one guarded flip
covering `approved` | `grandfathered` | `rejected`, fired from the two sites that can each see half of
D-231's five material fields — because `draftSchema` structurally cannot see the fifth — with the flip
inside the same transaction as the edit it answers at BOTH of them, and a fresh `submitted_at` that puts
a resubmitter at the back of the oldest-first queue rather than the front.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-08-31T23:24Z
- **Completed:** 2026-08-31T23:46Z
- **Tasks:** 3
- **Files created/modified:** 4 (2 created, 2 modified)

## Accomplishments

- **`src/lib/listing/re-review.ts`** — one guarded UPDATE. Every source state is in the WHERE, so a
  listing already at `pending` and a listing its host has taken off the market are both 0-row no-ops
  *by construction* rather than two branches somebody has to remember. The history row is inserted only
  when the UPDATE moved something, which is what makes D-249 true in both directions.
- **`rejected` is in the flip (D-249)**, and the module says at the site why that is resubmission and
  not an appeal: an appeal contests a decision *without changing anything*, and the only way into this
  branch is an actual edit to a material field. Appeals stay backlog 999.6.
- **The rejection reason survives.** No statement in the module assigns to that column at all — the
  strongest available form of "it is preserved" — and `material-edit.test.ts` reads the prior
  `listing_review` row back out after the flip and asserts the sentence is still there.
- **Detection site one** (`saveListingStep`) watches address (7 columns **plus the PostGIS point**),
  space type, capacity and price (**including the pax terms** — `extraHeadFee` / `included` change what
  a booker pays for the same group as surely as the hourly rate does), compared with the effective-value
  idiom the file already used twice, so a sparse autosave is caught and an unchanged re-send is not.
- **Detection site two** (`persistPhoto` / `removePhoto`) is the answer to 18-RESEARCH § F7. Both calls
  sit below the D-165 provenance gate; the suite that measures that gate is green and its file
  untouched.
- **Both mutation REDs watched and reverted**, each recorded below with its observed message *and* with
  which cases stayed green — the happy-path cases are, as usual, blind to the defect.
- **`npm test`: 200 files / 2368 passed** against a 199 / 2340 baseline — **+1 file and +28 tests,
  exactly this plan's own, zero regressions.**

## Task Commits

1. **Task 1: The guarded flip — one helper, three source states** — `5dc0247` (feat)
2. **Task 2: Detection site one — four fields in `saveListingStep`** — `5e91ffc` (feat)
3. **Task 3: Detection site two — photos, below the provenance gate, + the LVER-03 suite** — `c8d132c` (feat)
4. *(deviation 3)* **The `ReReviewConn` note corrected** — `2df485d` (docs)

## Files

### Created

- **`src/lib/listing/re-review.ts`** — `markForReReview`, `MATERIAL_FIELDS`, `ReReviewConn`,
  `ReReviewTrigger`, `ReReviewResult`. Non-client module, per `hours-signal.ts`'s rule.
- **`tests/listing/material-edit.test.ts`** — 28 cases, integration, isolated schema. Harness is
  `crud.test.ts` + `photos.test.ts` merged, so both action modules and `loadReviewQueue` read one
  database.

### Modified

- **`src/app/actions/listing.ts`** — `+89` lines, all additive. The detection block, the import, and the
  in-transaction call.
- **`src/app/actions/listing-photo.ts`** — `+47 / −1`. The one deleted line is the bare
  `await db.insert(listingPhoto)…`, replaced by the same insert inside a transaction. `git diff -U0`
  hunk headers: `@@ -42,0 +43,3 @@` (the import), `@@ -283,0 +287,4 @@` and `@@ -286 +293,27 @@`
  (inside `persistPhoto`, below the gate), `@@ -467,0 +501,13 @@` (inside `removePhoto`). **Nothing at
  or above the provenance gate (`:175`) or the cap branch (`:185`) is touched.**

## What each detection site actually watches

| D-231 field | Site | Columns compared |
|---|---|---|
| address | `saveListingStep` | `addressLine1`, `addressLine2`, `city`, `region`, `postalCode`, `country`, `neighborhood`, and the `location` point under the same both-or-neither condition the patch writes it (x = lng, y = lat) |
| space type | `saveListingStep` | `primarySpaceType` |
| capacity | `saveListingStep` | `maxOccupancy`. **`unitCount` is named at the site as unreachable** — no form field (D-21), not in `draftSchema`, unwritable by this action |
| price | `saveListingStep` | `hourlyRateCents`, `dayRateCents`, `perHeadPriceCents`, `extraHeadFee`, `included` |
| **photos** | **`listing-photo.ts`** | `persistPhoto` (add) and `removePhoto`. **NOT `reorderPhotos`** |
| ~~title~~ / ~~description~~ | *(neither)* | Deliberately excluded — see the deferred item below |

**The `reorderPhotos` exclusion, and its reasoning.** Reordering changes which photo is the cover; it
does not change what the space is, and every photo in the set has already been reviewed. Including it
would fire re-review — and therefore un-sell a listing — on a host tidying their gallery. The reading is
stated at both photo call sites and pinned by a case that asserts an `approved` listing stays `approved`
across a full reversal. If it is ever promoted to material, that case should be **updated, not deleted**,
so the change is visible in a diff.

## The two mutation REDs

### 1. The `markForReReview` call removed from `persistPhoto`

The F7 gap, restored. Everything else in the plan left in place:

```
× persistPhoto on an APPROVED listing flips it to pending and opens a review row
  AssertionError: expected 'approved' to be 'pending'
× [listing_photos] a photo resubmission lands at the back of the queue too
  AssertionError: expected [ Array(1) ] to deeply equal [ …(2) ]
      Tests  2 failed | 26 passed (28)
```

**Twenty-six cases stayed green** — every field case against all three source states, every negative,
the transaction-rollback case, the `[listing_fields]` queue-position case, *and `removePhoto`'s own
case*. A host could swap in a new photo on an approved listing and every other assertion in the file
would still pass. Reverted; 28/28.

### 2. `"rejected"` dropped from the helper's WHERE

The plan-as-D-232-wrote-it, i.e. what shipping without D-249 looks like:

```
× a change to address flips rejected → pending
× a change to space type flips rejected → pending
× a change to capacity flips rejected → pending
× a change to price flips rejected → pending
  AssertionError: expected 'rejected' to be 'pending'
× the rejection reason is STILL readable after the flip — it is what the host is fixing
  AssertionError: expected [ { …(8) } ] to have a length of 2 but got 1
× [listing_fields] the new submitted_at is strictly later, and the queue puts the resubmitter LAST
× [listing_photos] a photo resubmission lands at the back of the queue too
      Tests  7 failed | 21 passed (28)
```

**Twenty-one stayed green, including every `approved` case, every `grandfathered` case and all four
negatives.** The whole of D-232 as literally written is invisible to the hole D-249 closes. Reverted;
28/28.

## Deviations from Plan

### 1. [Rule 2 — Missing critical functionality] `persistPhoto`'s insert paired into a transaction with the flip

- **Found during:** Task 3.
- **Issue:** the plan says "add `markForReReview(db, listingId, "listing_photos")` to `persistPhoto`".
  Passing `db` after a committed bare insert would have left the photo write and the flip separable —
  and both actions carry an explicit *IT ALWAYS ANSWERS* contract (WR-03/WR-04), so an unguarded await
  that rejects would ALSO have broken that contract and escaped the server action. The plan's own
  sentence for the fields site ("a listing whose address changed but whose `review_state` did not is a
  sellable fake") is exactly as true of a photo, and photos are the field a fake listing lies with most.
- **Fix:** `persistPhoto`'s `db.insert` became `db.transaction(tx => { insert; markForReReview(tx, …) })`
  — **below** the provenance gate, inside the existing `try`, so the existing `catch`'s WR-02/WR-03
  orphan-cleanup reasoning is unchanged and still correct (a rolled-back insert means no row names the
  asset, which is precisely the condition the cleanup already checks). `removePhoto`'s flip rides the
  transaction it already had, so its post-commit Cloudinary destroy is still reached only after a
  committed delete.
- **Files modified:** `src/app/actions/listing-photo.ts`
- **Verification:** `photos.test.ts` (36 cases incl. all six D-187 destroy-placement cases) and
  `cloudinary-provenance.test.ts` both green and both files unchanged.
- **Committed in:** `c8d132c`

### 2. [Rule 3 — Blocking] The `markForReReview` acceptance grep is off by one by construction

- **Found during:** Task 3.
- **Issue:** the criterion is `grep -c "markForReReview" src/app/actions/listing-photo.ts` **returns
  exactly 2**. It returns **3** against a correct file, because the file must also `import` the helper —
  the identifier necessarily appears once more than it is called. Same class as 18-05's deviation 4 and
  18-04's: a grep whose subject collides with its own prerequisite.
- **Fix:** the structural claim the criterion is reaching for is *two CALL SITES*, so it is measured as
  `grep -c "await markForReReview(" src/app/actions/listing-photo.ts` → **2**, plus the diff inspection
  the same criterion already required. Nothing in the source was reworded to satisfy a count.
- **Files modified:** none.

### 3. [Rule 1 — Bug] The `ReReviewConn` doc comment was left stale by deviation 1

- **Found during:** Task 3, after the mutation proofs.
- **Issue:** the header written in task 1 said "the photo actions pass `db` because their own writes
  have already committed by the time the photo set has actually changed". Deviation 1 made that false in
  the same plan. A comment claiming a weaker guarantee than the code provides is the shape that gets
  "simplified" back to the weaker code later.
- **Fix:** corrected to state that BOTH sites pass a transaction and why, while keeping the note that the
  parameter still admits a plain connection for a future caller with nothing to be atomic with.
- **Files modified:** `src/lib/listing/re-review.ts`
- **Committed in:** `2df485d`

### 4. [Process — recorded so it is not repeated] A mutation reverted with `git checkout --` destroyed uncommitted work

- **Found during:** Task 3, reverting mutation 1.
- **Issue:** mutation 1 was applied to `listing-photo.ts` *before* task 3 was committed, and reverted
  with `git checkout -- src/app/actions/listing-photo.ts`. That restores the file to **HEAD**, not to
  the pre-mutation working state — so it silently discarded the entire task-3 edit alongside the
  mutation. `grep -c "await markForReReview("` answered **0**, which is how it was caught.
- **Fix:** the edits were re-applied and verified byte-equivalent by comparing `git diff -U0` hunk
  headers against the pre-mutation run (`@@ -42,0 +43,3 @@`, `@@ -283,0 +287,4 @@`, `@@ -286 +293,27 @@`,
  `@@ -467,0 +501,13 @@` — identical), then the suites re-run before committing. Mutation 2 was applied
  and reverted with a targeted patch instead, against an already-committed file.
- **Rule for the next plan:** mutation-prove **after** the task commit, and revert with a targeted patch,
  never a blanket file restore.

---

**Total deviations:** 3 auto-fixed (1 × Rule 2, 1 × Rule 3, 1 × Rule 1) + 1 process note.
**Impact on plan:** no scope creep; nothing added beyond the plan's file list. Deviation 1 strengthens a
guarantee the plan asked for at one site and not the other; 2 corrects an acceptance criterion against
its own arithmetic; 3 is 1's own bookkeeping.

## Tests added beyond the plan's list

Three, all cheap and all pinning something a future edit could break silently:

- **`MATERIAL_FIELDS` is exactly the five** — so widening the material set requires a line in a diff.
- **A listing already at `pending` keeps its ORIGINAL `submitted_at`** — D-249's guarantee in the other
  direction. Without it, a host editing a listing that is already waiting would be re-stamped to the
  back of the queue on every autosave, and nothing else in the file would notice.
- **A listing taken off the market is not dragged back in** — the deliberate exclusion, as behaviour.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm test` (run **ALONE**) | **200 files / 2368 passed / 5 skipped** — baseline 199 / 2340 / 5, i.e. **+1 file, +28 tests, zero regressions** |
| `npm run test:design` (run ALONE) | **72 files / 1304 passed / 3 skipped** — byte-identical to baseline; this plan ships no UI |
| `npm run build` | **exit 0** |
| `npx eslint src/ --quiet` | **exit 0, zero errors** (25 pre-existing warnings, unchanged) |
| `tests/listing/material-edit.test.ts` | **28 passed** |
| `tests/listing/cloudinary-provenance.test.ts` + `photos.test.ts` | **51 passed**, both files unchanged (D-165 / D-187 intact) |
| `crud` · `wizard-save-state` · `wizard-save-race` · `mode-lock` | **44 passed** — the autosave path is not frozen |
| `tests/ops/queue-query.test.ts` | **9 passed** — 18-05's queue is unmoved |
| `grep -c "'withdrawn'" src/lib/listing/re-review.ts` | **0** |
| `grep -c '"rejected"' src/lib/listing/re-review.ts` | **1** — in the WHERE tuple |
| a statement SETting or clearing the rejection explanation, anywhere in `re-review.ts` | **none** — the single occurrence of that word is the English phrase "structural reason" |
| `grep -c "reviewState" src/app/actions/listing.ts` | **0** — never in `patch`, never smuggleable (T-18-0603) |
| `grep -c "listing-photo" src/app/actions/listing.ts` | **3** — the second site is named at the first |
| `grep -c "await markForReReview(" src/app/actions/listing-photo.ts` | **2** — `persistPhoto`, `removePhoto`; see deviation 2 |
| `markForReReview(tx, …)` inside `saveListingStep`'s transaction | **yes** — `db.transaction(async (tx) =>` at **:338**, the call at **:352**, the closing brace at **:373** |
| `[test-db] LEAKED WRITES` | `notify` ×1, `guest-email` ×1 — **pre-existing**, unchanged |

The three pre-existing red e2e specs (`cancel.spec.ts:232`, `calendar-hit-area.spec.ts` ×4,
`price-parity.spec.ts:287`) were **not** run and are **not** this plan's; they are diagnosed in
`deferred-items.md`. This plan ships no route and no component, so no e2e surface changed.

## Requirements

| ID | Status | Why |
|---|---|---|
| **LVER-03** | **Complete** | A material edit to an `approved`, `grandfathered` or `rejected` listing returns it to review through the sell gate 18-03 already built; a non-material edit does not; a resubmission enters the queue at its resubmission time; the rejection reason survives until resubmission. All five of D-231's fields are covered, photos from the only site that can see them, and both properties are mutation-proved. |

## The deferred item this plan deliberately did not close

**Title and description are still NOT material fields.** D-231 holds the ROADMAP's stated five and
excludes them on purpose, and that exclusion now ships as behaviour: a host can rewrite an approved
listing's entire title and description — *"Sunrise Pickleball Court"* → anything at all — and it stays
approved, stays sellable, and keeps its badge.

That is a real hole and it is worth its own PM decision, because **a fake listing lies in its words as
much as its fields.** The description is where a space claims to have equipment it does not have, a
shower block that is a garden hose, or a court that is a driveway — none of which the five material
fields can contradict.

It is carried in `.planning/REQUIREMENTS.md` § Deferred and 18-CONTEXT § Deferred Ideas, and it is now
restated in **three** places in the code, so it cannot be lost by anyone reading only one of them:
`MATERIAL_FIELDS`'s comment, the detection site in `saveListingStep`, and the negative case in
`material-edit.test.ts` — which is written so that promoting the fields means **updating** that case
rather than deleting it.

**The cost of closing it later is small:** two `changed(…)` lines at the existing site and one flipped
assertion. The reason to decide rather than drift is that a words-only edit is the cheapest edit a host
can make, so it is the one a bad actor reaches for first once the other five are watched.

## What the next plan should know

- **18-06 now creates the `pending` rows 18-05's queue reads.** A material edit is the only path in this
  phase that OPENS a `listing_review` cycle, and it opens exactly one (`decided_at IS NULL`), which is
  the row `closeReviewCycle` later updates in place. The two halves fit: neither ever produces two open
  rows for one listing.
- **A host still cannot open a `host_verification` submission.** 18-05's carry-forward said the host
  decisions guard on `status IN ('pending','unverified')` and that a host with no row cannot be decided
  at all. This plan closed the LISTING half of that gap only — the host half is still open, and belongs
  to whichever plan owns host onboarding's submit action.
- **`revalidatePath` is unchanged and still per-action.** `saveListingStep` and the photo actions
  revalidate the host's own edit page. Nothing revalidates `/ops`; 18-12 still owns that, and a
  re-review flip will not clear or add a row to a cached queue until it lands.
- **The host-facing surface (18-13) can rely on the rejection reason being readable after an edit.**
  The prior `listing_review` row keeps its sentence; read the LATEST row with a non-null `reason` rather
  than the latest row, because the resubmission row's is NULL by design.
- **If you add a sixth material field, add it at the site that can SEE it.** The two sites are not
  interchangeable and neither can be made to cover the other's fields; that is the entire content of
  D-242 and it is written at both.

## Self-Check: PASSED

Both created files exist on disk (`src/lib/listing/re-review.ts`,
`tests/listing/material-edit.test.ts`); both modified files carry their changes. All four commits
(`5dc0247`, `5e91ffc`, `c8d132c`, `2df485d`) exist in `git log`.
