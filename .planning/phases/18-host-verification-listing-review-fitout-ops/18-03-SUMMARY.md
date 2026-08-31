---
phase: 18-host-verification-listing-review-fitout-ops
plan: 03
subsystem: sell-gate
tags: [bookability, sell-gate, search-stage1, re-statement, fixtures, seeds, parity, mutation-testing, e2e-audit]

# Dependency graph
requires:
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 02
    provides: "the `host_verification` table, `listing.review_state`, both pgEnums and their derived TS union types — the columns this gate reads"
  - phase: 04-search-listing-surface
    provides: "`deriveBookable`'s three-term shape, its inlined SQL twin in search Stage-1, and the parity set-equality that holds the two together"
  - phase: 06-instant-request-booking
    provides: "`placeHold` / `placeOpenHold` as two deliberate RE-STATEMENTS of the gate, each with its own refusal anchor"
provides:
  - "a SIX-term `deriveBookable` — ops approval is a term of the sell-gate itself, at all seven sites (LVER-01)"
  - "host verification as a sell-gate term INDEPENDENT of `payoutsEnabled`, which is neither removed nor referenced (HVER-03)"
  - "ENF-01's block-new lever: `suspended` fails the host term, so suspension is the SAME read as verification and needs no second check"
  - "`makeVerifiedHost()` (tests/helpers/seed.ts) — the one expression every bookability fixture in the suite converges on"
  - "a parity instrument with 14 fixtures over 8 hosts and THREE passing set members, covering every value of both new enums"
  - "two NEW refusal anchors, one per re-statement: `L_pending_review` (+ a suspended-host sibling) and `L_OPEN_PENDING_REVIEW`"
affects: [18-04 hidden-until-approved, 18-05 ops decision actions, 18-06 material-edit re-review, 18-07 payout freeze, 18-08 ops cancel, 18-11 badge, 18-12 ops console]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "a required field as a COMPILER-ENFORCED CENSUS: adding one to a pure predicate's parameter object turns every call site into a compile error, so `tsc` enumerates who must answer instead of grep"
    - "positive-literal enum gating (`=== 'approved' || === 'grandfathered'`) over the negative spelling, with a watched mutation proving the negative form passes the headline fixture and fails only against full enum coverage"
    - "a DIMENSION TABLE instead of a cross product: hold every other term at a passing value and vary ONE across all of its enum values, with the coverage assertion derived from the pgEnum so a new value reddens it"
    - "fail-closed at a nullable join on BOTH halves of a twinned predicate — `COALESCE(hv.status::text,'unverified')` in SQL, `?? \"unverified\"` in TS — with a fixture that seeds NO ROW AT ALL as the only proof the two agree"
    - "prove-then-defer: revert the change under test to the pre-plan commit and re-run a red e2e spec before calling it pre-existing"

key-files:
  created:
    - .planning/phases/18-host-verification-listing-review-fitout-ops/deferred-items.md
  modified:
    - src/lib/bookability.ts
    - src/lib/search/query.ts
    - src/app/actions/booking.ts
    - src/app/listings/[id]/(detail)/page.tsx
    - src/app/(host)/host/listings/page.tsx
    - tests/helpers/seed.ts
    - tests/search/bookable-gate.test.ts
    - tests/listing/bookability.test.ts
    - tests/booking/state-machine.test.ts
    - tests/booking/open-capacity-hold.test.ts
    - tests/availability/open-capacity-blocks.test.ts
    - tests/availability/open-capacity-hours-rekey.test.ts
    - tests/booking/notify-emission.test.ts
    - tests/booking/open-capacity-cancel.test.ts
    - tests/booking/open-capacity-replay.test.ts
    - tests/booking/request-lifecycle.test.ts
    - tests/booking/service-fee-hold.test.ts
    - tests/listing/open-capacity-edit-gate.test.ts
    - tests/payments/host-cancel.test.ts
    - tests/payments/ledger-freeze.test.ts
    - tests/payments/payout-sweep.test.ts
    - tests/paymongo/webhook-merchant-activated.test.ts
    - tests/search/availability-filter.test.ts
    - tests/search/open-capacity-search.test.ts
    - scripts/seed.ts
    - scripts/seed-baseline-fixtures.ts
    - e2e/helpers/booker-seed.ts
    - e2e/availability.spec.ts
    - e2e/cancel.spec.ts
    - e2e/host-dashboard.spec.ts
    - e2e/host-headings.spec.ts
    - e2e/host-inbox-hierarchy.spec.ts
    - e2e/keyboard-composites.spec.ts
    - e2e/one-tree.spec.ts
    - e2e/open-capacity.spec.ts
    - e2e/overflow-320.spec.ts
    - e2e/price-parity.spec.ts
    - e2e/public-listing.spec.ts
    - e2e/search-and-book.spec.ts
    - e2e/skeleton-geometry.spec.ts

key-decisions:
  - "The two new terms are compared against POSITIVE literals and never `!== 'suspended'` — mutation M4 proved the negative spelling keeps the suspension fixture GREEN and is caught only by the unverified/pending/rejected fixtures."
  - "`makeVerifiedHost()` is a TEST fixture helper and is explicitly NOT a precedent for extracting the two `src/` gate re-statements (D-227). The rule is written at the helper so a later 'consistency' pass cannot cite it."
  - "The 19-file Vitest floor the plan predicted was EXACT — `npm test` forced no additional file. The real work was the 14 non-Vitest seed sites no suite can see."
  - "ENF-01 is NOT marked complete: 18-03 ships only its block-new half. LVER-01 and HVER-03 are complete."
  - "Three RED e2e cases were each proved pre-existing (one by reverting `src/` to the pre-plan commit and reproducing) and deferred rather than fixed."

patterns-established:
  - "Compiler-forced call-site census: make the new field REQUIRED on an existing parameter object, never optional and never defaulted — an optional field with a default lets every call site compile unchanged and silently sells unreviewed space."
  - "Enum-derived coverage assertions: compare the fixture table's values against `pgEnum.enumValues` rather than a hand-kept count, so adding an enum value reddens the test and forces a written decision about whether that state may sell."
  - "Never trust the first red on a wide change — re-run the suite ALONE before investigating, and revert to the pre-plan commit before calling an e2e failure yours."

requirements-completed: [LVER-01, HVER-03]

# Metrics
duration: 78min
completed: 2026-09-01
---

# Phase 18 Plan 03: The Sell-Gate — Seven Sites in One Commit Summary

**Ops approval is now a term of `deriveBookable` itself at all seven sites — the pure predicate, its inlined SQL twin, both deliberate money-path re-statements and both RSC call sites — and the entire 40-file fixture and seed blast radius moved in the same atomic commit; then the three instruments that hold the four sites `tsc` cannot see were rebuilt, taking the parity set-equality from ONE passing member to THREE and proving with a watched mutation that the obvious wrong spelling would have passed the fixture set as it stood.**

## Performance

- **Duration:** ~78 min
- **Tasks:** 2 (both auto, no checkpoints)
- **Files created/modified:** 41 (1 created, 40 modified) + 3 planning files

## Task Commits

1. **Task 1 [ATOMIC — D-248]: All seven gate sites plus the whole fixture and seed sweep** — `5e233a9` (feat), 40 files, +661/−246
2. **Task 2: Make the instruments strong again** — `f4c4eda` (test), 4 files, +477/−5

## The final six-term predicate, verbatim

```typescript
export function deriveBookable(
  listing: {
    status: "draft" | "published" | "unlisted";
    hasOperatingHours: boolean;
    reviewState: ListingReviewState;
  },
  host: {
    emailVerified: boolean;
    payoutsEnabled: boolean;
    verificationStatus: HostVerificationStatus;
  },
): boolean {
  return (
    listing.status === "published" &&
    listing.hasOperatingHours &&
    // LVER-01. Positive literals, never `!== 'pending'` — see the module header.
    (listing.reviewState === "approved" || listing.reviewState === "grandfathered") &&
    host.emailVerified &&
    host.payoutsEnabled &&
    // HVER-03 + ENF-01: `suspended`, `pending`, `rejected` and `unverified` all fail here, which is why
    // suspension needs no second check anywhere.
    (host.verificationStatus === "approved" || host.verificationStatus === "grandfathered")
  );
}
```

Both fields are **REQUIRED** on the existing parameter objects (D-224) — no `?`, no default. That is
the whole census mechanism: `tsc --noEmit` went red at every one of the four TypeScript call sites the
moment the fields landed, and green again only when all four had answered.

## Accomplishments

### The seven sites

| # | Site | How it pays |
|---|---|---|
| 1 | `src/lib/bookability.ts` | The predicate + a `── THE FIFTH AND SIXTH TERMS ──` banner on the shipped `:12-46` model: why parameters not lookups, D-225 independence from `payoutsEnabled`, D-222 suspension, D-210 grandfathering, and the twins inventory extended to name both new anchors |
| 2 | `src/lib/search/query.ts` Stage-1 | `LEFT JOIN host_verification hv` beside the existing `LEFT JOIN host_payout hp`, plus `AND l.review_state IN ('approved','grandfathered')` and `AND COALESCE(hv.status::text,'unverified') IN ('approved','grandfathered')`. The "All FOUR terms" comment now says SIX and enumerates them. No backticks or dollar-braces inside the template literal |
| 3 | `placeHold` | Both fields folded into the SELECT it was already issuing + ONE `leftJoin(hostVerification, …)` — zero extra round trips. Refusal string and shape unchanged |
| 4 | `placeOpenHold` | The same again **BY RE-STATEMENT**. No helper, no import from `placeHold`. Its ⚠ block now names the two new terms and says a wrong alias or a missing `?? "unverified"` here would compile, pass `tsc`, pass BOTH of `placeHold`'s anchors and pass the whole suite while leaving a real drop-in booking hole open |
| 5 | `listings/[id]/(detail)/page.tsx` | The verification read JOINS the existing query at `:249-254`. **No fifth `Promise.all` element** |
| 6 | `(host)/host/listings/page.tsx` | `r.reviewState` comes free from the existing `select()`; the host's own status is read **ONCE for the whole grid** beside `payoutsEnabled`, never per card |
| 7 | `tests/helpers/seed.ts` | `makeVerifiedHost()` — user + `host_payout` + `host_verification`, every dimension overridable, `verificationStatus: null` seeding NO row at all |

`payoutsEnabled` is untouched at every site. Neither new term is expressed in terms of it (D-225).

### The blast radius, in the same commit (D-248)

- **19 Vitest files** — the plan's floor was **exact**. After the sweep, `npm test` run ALONE forced
  **zero additional files**; the 195/2256/5 baseline was reproduced with no residual red to chase.
- **14 non-Vitest seed sites** — `scripts/seed.ts`, `scripts/seed-baseline-fixtures.ts`,
  `e2e/helpers/booker-seed.ts` and 11 e2e specs with inline seeds (plus 2 more e2e specs that carry a
  `host_payout` insert), all of which hit DEV and are invisible to every suite.
- **27 listing fixtures** gained `review_state = 'approved'`; every bookable host gained an
  ops-approved `host_verification` row.

### The instruments (Task 2)

- **`tests/listing/bookability.test.ts` → 29 truth-table assertions (16 + 5 + 6 + 2)**, 35 tests total.
  The 16 original rows are **unchanged in meaning** — both new terms are pinned at `PASSING_REVIEW` /
  `PASSING_VERIFICATION`, so each row is still exactly the four-boolean experiment it was written as.
  The two new terms get **dimension tables**, not a 480-row cross product, and each table's coverage
  assertion is derived from the pgEnum (`listingReviewState.enumValues` /
  `hostVerificationStatus.enumValues`), so adding an enum value reddens it. Two new auto-revert cases
  on the shipped `:148-166` model: `approved → suspended` (ENF-01) and `approved → pending` (LVER-03).
- **`tests/search/bookable-gate.test.ts` → 14 fixtures / 8 hosts / 3 passing members** (was 5 / 3 / 1).
  Four listing-review fixtures share the fully-passing host and differ only in `review_state`; five
  host fixtures each own their host, because a host carries exactly one status.
  **`gate_hv_unverified` seeds no `host_verification` row at all** — the only fixture that can prove
  the SQL `COALESCE` and the TS `??` answer the same way. A new case asserts the passing set is
  exactly three named ids, so a future edit that collapses it back toward a singleton fails by name.
- **Two new refusal anchors, never shared.** `L_pending_review` and an ops-suspended-host sibling in
  `state-machine.test.ts`; `L_OPEN_PENDING_REVIEW` in `open-capacity-hold.test.ts`. Both files' headers
  now enumerate their anchors. `grep -c "count(\*)"` in `state-machine.test.ts` went 3 → 5: every
  anchor asserts **rows in the database**, never the action's return value.

### New anchor ids

| Anchor | File | Term |
|---|---|---|
| `L_pending_review` | `tests/booking/state-machine.test.ts` | FIFTH (LVER-01), `placeHold` |
| `L_suspended_host` | `tests/booking/state-machine.test.ts` | SIXTH (ENF-01/D-222), `placeHold` |
| `L_OPEN_PENDING_REVIEW` | `tests/booking/open-capacity-hold.test.ts` | FIFTH + SIXTH, `placeOpenHold` |

`grep` confirms neither `L_pending_review` nor `L_OPEN_PENDING_REVIEW` appears in the other's file — 0
and 0. The cross-references that explain the separation name the **file**, not the identifier, so the
guard stays greppable without losing navigability.

## Decisions Made

### The two parity mutations, with their observed REDs

Both executed against the finished code, then restored with `git checkout --`;
`git diff --exit-code src/` clean afterwards.

**M3 — SQL-side permissive.** `src/lib/search/query.ts`: delete the whole line
`AND l.review_state IN ('approved', 'grandfathered')`.

```
× the SQL twin and the TypeScript predicate accept exactly the same set (Pitfall 5 drift guard)
AssertionError: expected Set{ 'gate_hv_grandfathered', …(5) } to deeply equal Set{ 'gate_pub', …(2) }
- Expected
+ Received
  Set {
    "gate_hv_grandfathered",
    "gate_lr_grandfathered",
+   "gate_lr_pending",
+   "gate_lr_rejected",
+   "gate_lr_withdrawn",
    "gate_pub",
  }
 ❯ tests/search/bookable-gate.test.ts:331:26
```

`gate_lr_pending` appearing in that list **is D-228 measured**: search has no separate hiding rule, so
a listing awaiting review leaks the instant this one WHERE term is lost.

**M4 — TS-side permissive, using the most plausible wrong spelling rather than a deletion.**
`src/lib/bookability.ts`: replace the host term with `host.verificationStatus !== "suspended"`.

```
× the SQL twin and the TypeScript predicate accept exactly the same set (Pitfall 5 drift guard)
AssertionError: expected Set{ 'gate_hv_grandfathered', …(2) } to deeply equal Set{ 'gate_pub', …(5) }
- Expected
+ Received
  Set {
    "gate_hv_grandfathered",
-   "gate_hv_pending",
-   "gate_hv_rejected",
-   "gate_hv_unverified",
    "gate_lr_grandfathered",
    "gate_pub",
  }
 ❯ tests/search/bookable-gate.test.ts:331:26

× the parity set has THREE passing members, not one — the instrument is not a singleton
AssertionError: expected [ 'gate_hv_grandfathered', …(5) ] to deeply equal [ 'gate_hv_grandfathered', …(2) ]
 ❯ tests/search/bookable-gate.test.ts:369:45
```

**⚠ THE FINDING FROM M4, and it is the reason the fixture table is shaped the way it is.**
`gate_hv_suspended` **stayed GREEN** under M4 — of course it did; `!== "suspended"` still excludes a
suspended host. The three fixtures that caught the mutation were `gate_hv_unverified`,
`gate_hv_pending` and `gate_hv_rejected`. A fixture set covering only the headline case — suspension,
the thing ENF-01 is *about* — would have watched the single most likely real-world spelling error sail
through while reporting green. Covering every enum value is not completeness theatre here; it is the
entire difference between an instrument and a decoration. Both mutations are recorded in the test
file's own mutation log.

### `makeVerifiedHost()` is a fixture helper and is NOT a precedent for D-227

Stated at the helper itself, because the next reader will be tempted: *seeding is not enforcement.* A
fixture bug makes a test fail loudly; a gate bug sells an unreviewed space quietly. Opposite failure
modes, opposite rules — so the tests converge on one expression while `placeHold` and `placeOpenHold`
stay two independently measured copies.

### ENF-01 is deliberately NOT marked complete

18-03 ships only ENF-01's **block-new** half: `suspended` fails the host term at all seven sites, so
the lever exists and is anchored. The requirement also demands the ops *action* that pulls it (18-05)
and the cancel-and-refund escalation (18-08). `LVER-01` and `HVER-03` **are** complete and are checked
off in `REQUIREMENTS.md`; ENF-01's checkbox stays open, and 18-05 / 18-08 / 18-10 also claim it.

## Deviations from Plan

### 1. [Rule 3 — Blocking] `import type` added to `src/lib/bookability.ts`, which previously had zero imports

- **Found during:** Task 1(a).
- **Issue:** The new terms are typed by `ListingReviewState` / `HostVerificationStatus`, which 18-02
  exports from `schema.ts`. The module's purity argument is load-bearing and forbids importing `db`.
- **Fix:** `import type { … } from "@/lib/db/schema"` — type-only, erased at compile time, so no
  runtime import of the schema module enters the graph. There is shipped precedent
  (`src/components/notifications/notification-item.tsx`, `src/lib/validation/notification.ts`,
  `src/inngest/functions/notify.ts` all `import type` from `schema.ts`). Purity is intact: still no
  `await`, no `db`, no I/O, and the truth table still drives the function directly.
- **Files modified:** `src/lib/bookability.ts`
- **Commit:** `5e233a9`

### 2. [Plan-criterion correction] `grep -c "verificationStatus" src/app/actions/booking.ts` returns 5, not 2

- **Found during:** Task 1 acceptance checks.
- **Issue:** The criterion asks for `2` — "one per re-statement" — but the plan's own instructions (c)
  and (d) require **two** appearances per site: a `select({ verificationStatus: hostVerification.status })`
  alias and a `verificationStatus: lr.verificationStatus ?? "unverified"` argument. Four code lines is
  the shape the plan asked for; the fifth match is a prose line in `placeOpenHold`'s docblock.
- **Resolution:** No code changed. The invariants the criterion is actually protecting hold exactly:
  `grep -c "leftJoin(hostVerification" src/app/actions/booking.ts` = **2** (one per re-statement) and
  `grep -c "function deriveBookableInternal\|sharedGate\|assertBookable"` = **0** (no helper extracted).
  Recorded here rather than satisfied by deleting a comment.

### 3. [Plan-criterion refinement] the anchor-separation grep, satisfied by naming files instead of identifiers

- **Found during:** Task 2(c).
- **Issue:** The criterion requires that `L_pending_review` and `L_OPEN_PENDING_REVIEW` "do not appear
  in each other's file". The first draft of `open-capacity-hold.test.ts`'s new comments named
  `L_pending_review` three times in prose explaining *why* the anchors must stay separate — which
  failed the grep while making the file more informative.
- **Fix:** The cross-references now name the **file** (`tests/booking/state-machine.test.ts`) rather
  than the identifier. Both greps return 0/0, and the pointer a future reader needs survives — a
  strictly better outcome than either deleting the explanation or accepting the grep failure.

### 4. [Scope boundary] Three RED e2e cases proved pre-existing and deferred, not fixed

Logged in full to
`.planning/phases/18-host-verification-listing-review-fitout-ops/deferred-items.md`. Summarised under
"Issues Encountered" below. None was fixed — per the SCOPE BOUNDARY rule, out-of-scope discoveries are
logged, not repaired.

**Total deviations:** 1 auto-fixed (Rule 3), 2 plan-criterion corrections recorded rather than absorbed,
3 pre-existing failures deferred. No architectural changes; no packages installed.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** — and this IS the four-site census: it went red at all four TypeScript call sites when the required fields landed |
| `npx eslint` on all 40 changed files | **exit 0** |
| `npm test` (run ALONE) after Task 1 | **195 files / 2256 passed / 5 skipped** — the wave-2 baseline exactly, zero regressions |
| `npm test` (run ALONE) after Task 2 | **195 files / 2277 passed / 5 skipped** — **+21**, exactly this plan's own (bookability +15, bookable-gate +3, state-machine +2, open-capacity-hold +1) |
| `npm run test:design` (ALONE) | **72 files / 1296 passed / 3 skipped** — baseline unchanged |
| `npm run db:seed` | `Seeded 5 published bookable listings` |
| Stage-1 predicate probed against the DEV database | **13 listings pass** (5 seed + 8 grandfathered/e2e leftovers); `seed_host_1` carries `status='approved', provider='manual', checked_at=NULL` |
| `/` in `npm run dev` | **HTTP 200**, catalogue non-empty — four seeded titles and 10+ `/listings/…` links rendered. **Pitfall 7 closed** |
| `grep -c "leftJoin(hostVerification" src/app/actions/booking.ts` | **2** |
| `grep -c "function deriveBookableInternal\|sharedGate\|assertBookable" src/app/actions/booking.ts` | **0** |
| `grep -c "host_verification" src/lib/search/query.ts` | **3** (≥ 2 required) |
| `grep -c "review_state IN" / "COALESCE(hv.status"` in `query.ts` | **1** / **1** |
| negative-literal check in `bookability.ts` (comments stripped) | **0** |
| `L_OPEN_PENDING_REVIEW` in `state-machine.test.ts` / `L_pending_review` in `open-capacity-hold.test.ts` | **0 / 0** |
| `git log --oneline -1 --stat` on `5e233a9` | gate files **and** fixture/seed files in **ONE** commit — 40 files (D-248) |
| post-commit deletion check | **no deletions** in either commit |

Both suites were run **alone**, never concurrently and never trusting a first red — the shared test DB
is TRUNCATEd at every run start. The `[test-db] LEAKED WRITES` block naming `notify` and `guest-email`
appeared as expected and is pre-existing.

### The e2e audit — run BY HAND, because CI does not run these specs (D-24)

The plan modifies 13 specs plus `e2e/helpers/booker-seed.ts`. **That helper is consumed by 13 further
specs outside the plan's `files_modified`**, so those were run too — a green `npm test` and a green CI
prove nothing about any of them.

| Batch | Specs | Result |
|---|---|---|
| 1 | `availability`, `cancel`, `price-parity`, `public-listing`, `search-and-book` | 16 passed, 2 failed → both investigated below |
| 2 | `host-dashboard`, `host-headings`, `host-inbox-hierarchy`, `open-capacity` | **30 passed** |
| 3 | `one-tree`, `keyboard-composites` | **27 passed, 2 skipped** |
| 4 | `overflow-320`, `skeleton-geometry` | **116 passed, 7 skipped** |
| 5 (helper consumers) | `calendar-hit-area`, `collision-in-place`, `confirmation-decay`, `hold-countdown`, `mobile-booker-path`, `photo-lightbox`, `price-one-fact` | 39 passed, 3 skipped, 4 failed → `calendar-hit-area` only, investigated below |
| 6 (helper consumers) | `receipt-access`, `receipt-parity`, `receipt-print`, `shell`, `tabular-figures`, `zero-result-relax` | **43 passed, 1 skipped** |

**271 e2e assertions passed by hand.** Every failure was traced to a pre-existing cause:

- `price-parity.spec.ts:287` — **flake**, green when re-run alone. Cause diagnosed:
  `src/app/(public)/loading.tsx:51` renders a full `<SearchBar />` as the Suspense fallback while
  `page.tsx:194` renders the real one, so `#search-category` is briefly ambiguous during streaming.
- `cancel.spec.ts:232` — **proved pre-existing.** The five gate source files were reverted to the
  pre-plan commit `2db2a42` and the spec re-run: the same single case failed identically. Restored to
  `HEAD`; `git diff HEAD --stat` clean.
- `calendar-hit-area.spec.ts` × 4 — **a `now()`-relative time bomb**, exactly the class this phase's
  landmine list names. The spec hard-codes `6 × (44 + 8)` heights and asserts the month grid has 6
  week-rows; September 2026 has 5. Its own error message says so. Not caused by the gate: had the gate
  wrongly refused the seeded listing there would be no calendar at all (count 0), not a correct 5.

## Known Stubs

None. Every term added is read at all seven sites and exercised by at least one fixture. Nothing in
this plan renders a placeholder, returns a hardcoded empty value, or defers a wire to a later plan.

## Threat Flags

None. This plan adds no network endpoint, no auth path, no file access and no schema change. Every
disposition in the plan's own `<threat_model>` landed:

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-18-0301 | mitigated | `placeHold`'s re-statement + `L_pending_review`, asserting **0 booking rows** |
| T-18-0302 | mitigated | `placeOpenHold`'s SEPARATE re-statement + `L_OPEN_PENDING_REVIEW`, its own fixture in its own file, 0 rows |
| T-18-0303 | mitigated | `COALESCE(hv.status::text,'unverified')` + `?? "unverified"` + positive literals; `gate_hv_unverified` seeds **no row at all** and the set-equality proves the two spellings agree |
| T-18-0304 | mitigated | The term is inlined in Stage-1 so the row never leaves Postgres; `gate_lr_pending` is the assertion, and M3 is the proof it bites |
| T-18-0305 | mitigated | 14 shared fixtures, 3 passing members, two watched mutation REDs in both directions |
| T-18-0306 | mitigated | `gate_hv_suspended` (search), `L_suspended_host` (money path), and the pure-predicate auto-revert case |
| T-18-SC | mitigated | **Zero packages installed.** `package.json` byte-unchanged |

## Issues Encountered

- **`grep` is not a census and this plan is the proof.** Four of the seven sites were found by `tsc`
  because the fields are required; the other three are held only by tests. The parity test's expected
  set had **one** member before this plan — a set equality with one member on each side looks like a
  drift guard and is barely one.
- **A "correct-looking" negative comparison is the real hazard, not a missing term.** M4's
  `!== "suspended"` is the spelling a reviewer would approve, and it passes the suspension fixture.
- **Three e2e specs are red on `dev` and none of them is new.** They are invisible to CI (D-24), and
  one is a calendar time bomb that will redden again every 5-week month. Details and suggested fixes
  in `deferred-items.md`.
- **`gsd-sdk query state.record-metric` / `state.add-decision` rejected their positional arguments**
  (`{"error":"phase, plan, and duration required"}`), the known v1.42.3 string-arg quirk. STATE.md's
  Performance Metrics row and the new decisions block were hand-written instead, which the plan's own
  `<state_update_rule>` prefers anyway.

## Next Phase Readiness

**Ready.** The gate is the seam everything downstream in Phase 18 hangs off, and it is now real:

- **18-04 (hidden until approved)** — leak surface 1 is **closed by construction**; `gate_lr_pending`
  asserts it (D-228). Surfaces 2 (`/listings/[id]` soft-404 via `isPubliclyViewable`) and 3
  (`src/lib/listing/og-facts.ts:86`, which runs its own `status !== "published"` check and is invisible
  in a browser) are still open and are 18-04's whole job.
- **18-05 (ops decision actions)** — writing `host_verification.status` or `listing.review_state` now
  changes sellability at all seven sites with **zero per-listing writes**; the two auto-revert cases in
  the truth table are the property it can rely on.
- **18-06 (material edit)** — the `approved → pending` flip already has its pure-predicate anchor.
- **18-11 (badge)** — D-212 stands: `grandfathered` PASSES the gate but must NOT show the badge. The
  gate and the badge deliberately disagree, and the truth table's `grandfathered` rows say why.

**Two hazards to carry forward:**

1. **A hand-built fixture is now unsellable by default.** `listing.review_state` defaults to
   `'pending'` and a host with no `host_verification` row reads `'unverified'`, so any new fixture that
   skips `makeVerifiedHost()` fails with `not-bookable` — a refusal that names the gate but never the
   missing row. Route new fixtures through the helper.
2. **`e2e/` is still CI-invisible and now carries three known reds.** Any later plan touching
   `booker-seed.ts` inherits a 26-spec hand-run obligation, and must not read those three failures as
   its own.

## Self-Check: PASSED

Files verified present on disk:

- `src/lib/bookability.ts` — FOUND
- `src/lib/search/query.ts` — FOUND
- `src/app/actions/booking.ts` — FOUND
- `tests/helpers/seed.ts` — FOUND
- `tests/search/bookable-gate.test.ts` — FOUND
- `.planning/phases/18-host-verification-listing-review-fitout-ops/deferred-items.md` — FOUND

Commits verified in `git log`:

- `5e233a9` — FOUND (Task 1, 40 files, one atomic commit)
- `f4c4eda` — FOUND (Task 2)

---
*Phase: 18-host-verification-listing-review-fitout-ops*
*Completed: 2026-09-01*
