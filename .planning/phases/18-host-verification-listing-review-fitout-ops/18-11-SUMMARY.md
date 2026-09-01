---
phase: 18-host-verification-listing-review-fitout-ops
plan: 11
subsystem: booker-trust-surface
tags: [hver-05, d-212, d-237, trust-signals, badge, pure-predicate, rsc-reduction, mutation-testing]

# Dependency graph
requires:
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 02
    provides: "`host_verification.status` and `listing.review_state` as pgEnums — the two columns the badge stands on, and the enum values this plan's tests iterate"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 03
    provides: "the sell gate on both columns — the LEFT JOIN to `host_verification` in search Stage-1 and in the listing-detail query, and the `bookable-gate.test.ts` fixture set including `gate_lr_grandfathered` / `gate_hv_grandfathered`"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 04
    provides: "`isPubliclyViewable` as the ONE-expression idiom, and the `og-facts.ts` finding that a restatement is invisible to the compiler"
  - phase: 09-open-capacity
    provides: "`drop-in-badge.tsx` — the 24-line analog, and both of its binding rules (real text never an icon; deliberately not accent)"
  - phase: 13-confirmation-bookings-trust
    provides: "`tests/design/trust-signals.test.ts` — the twelve-row ban, the two-piece encoding, and the guard-the-guard clauses this plan extends"
provides:
  - "`src/lib/listing/fitout-check.ts` — `isFitoutChecked(hostStatus, listingReviewState)`, the ONE pure predicate, both terms `approved`, positive literals only (D-212)"
  - "`src/components/listing/fitout-check-badge.tsx` — `FitoutCheckBadge` taking a BOOLEAN, plus `FITOUT_CHECK_LABEL` / `FITOUT_CHECK_EXPLAINER` as the only home of the fifth signal's copy"
  - "`SearchResultRow.fitoutChecked: boolean` — composed server-side in `toRow`, so the card and the listing page can never disagree"
  - "`HostBlockProps.fitoutChecked: boolean` — a separate REQUIRED prop; `PublicProfile` was not widened"
  - "trust-signals `FIFTH_SIGNAL_FILES` (1 entry) scanned through the SAME twelve rows — `FORBIDDEN_SIGNALS` still 12, `SCAN_ROOTS` still 3"
affects: [18-12 (the /ops route may reuse `isFitoutChecked` rather than restating it), 18-14 (phase evidence — Success Criterion 6)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reduce a two-column rule to a BOOLEAN in the RSC so the client component cannot render it wrongly — it is never told the distinction (D-212 made structural, not conditional)"
    - "Extend a copy ban by adding a SCANNED FILE SET beside the scanned roots, not by widening the roots — the gate gets strictly stronger and no shipped copy outside the phase's ownership goes red"
    - "A permitted new signal is added UNDER the existing ban rather than as an exclusion row"
    - "Select a column PURELY to distinguish two already-admitted values, and write that reason in the SELECT's own comment — otherwise the next reader deletes it as redundant"

key-files:
  created:
    - src/lib/listing/fitout-check.ts
    - src/components/listing/fitout-check-badge.tsx
    - tests/listing/fitout-check-badge.test.tsx
  modified:
    - tests/design/trust-signals.test.ts
    - src/components/listing/host-block.tsx
    - src/app/listings/[id]/(detail)/page.tsx
    - src/lib/search/query.ts
    - src/components/search/search-result-card.tsx
    - tests/search/bookable-gate.test.ts
    - tests/search/search-card-open.test.tsx
    - tests/search/search-results-states.test.tsx
    - src/app/dev/theme/fixtures.ts

key-decisions:
  - "The trust-signal gate's header could NOT name `host_verification.status` — the file's own encoding assertion forbids spelling any of the twelve, and that table's name contains one of them. Proved RED, then written around; `fitout-check.ts` and `host-block.tsx` name the column in full where it is safe to"
  - "`host-block.tsx`'s rewritten paragraph names the module path `src/lib/listing/fitout-check.ts` and NOT the identifier `isFitoutChecked`, because the plan's own acceptance criterion greps that identifier to zero in that file — the seventh acceptance-grep-versus-prose collision this repo has recorded"
  - "`l.review_state` was added to the Stage-1 SELECT alongside `hv.status`: the plan named only the host column, but a two-term predicate cannot be evaluated from one term"
  - "The search card passes `undefined` (not an empty fragment) when neither chip is present, because `ResultCard` renders the type line on `meta.length > 0 || badges` and a truthy-empty node would paint a blank row"
  - "The dev theme fixture is `fitoutChecked: true` on a drop-in listing, so the design surface exercises the TWO-chip wrapping type line rather than repeating the one-chip case"
  - "The two search test fixtures default to `fitoutChecked: false`, so files that pin the drop-in card's copy do not silently acquire a second chip"

patterns-established:
  - "Pattern 1: when a permitted exception is added to a ban, add a second SCANNED SET and run it through the same rows — the gate is strictly stronger afterwards and the exception is auditable"
  - "Pattern 2: prove a rule's negative over the CARTESIAN PRODUCT of both enums, not over the headline case — a plausible mutation leaves the headline green"
  - "Pattern 3: a comment at a SELECT explaining why a column that cannot filter is nevertheless read — the antidote to a later 'redundant column' cleanup"

requirements-completed: [HVER-05]

# Metrics
duration: 30min
completed: 2026-09-01
---

# Phase 18 Plan 11: The FitOut-Check Badge Summary

**A booker now sees one true sentence about what FitOut actually did — "Checked by FitOut", with an explainer that says plainly we haven't visited the space — and it is structurally impossible to say it about a listing nobody checked, because the client component receives a boolean and is never told which rows are grandfathered.**

## The two copy strings, as shipped

Both live in `src/components/listing/fitout-check-badge.tsx` and nowhere else — which is what makes the
new gate below able to see all of the fifth signal's copy by scanning one file.

```
FITOUT_CHECK_LABEL     = "Checked by FitOut"
FITOUT_CHECK_EXPLAINER = "Someone at FitOut checked this host's account and this listing before it
                          could take bookings. We haven't visited the space."
```

The explainer's second sentence is a deliberate negative: Success Criterion 6 says the badge must never
imply inspection, and the only wording that cannot be read as implying it is one that says what did not
happen. It renders on the listing detail page only — the one surface with room to read a sentence. The
search card carries the chip alone.

The near miss the UI-SPEC flagged is real and was avoided by construction: the natural word for "a person
looked this over" is row 11's plural feedback noun. This surface says **checked**, and that token appears
nowhere in the file — a raw grep for all twelve tokens over the whole file, comments included, returns
zero for each.

## D-212, made structural rather than conditional

`src/lib/listing/fitout-check.ts` is the whole rule:

```ts
return hostStatus === "approved" && listingReviewState === "approved";
```

- **Both terms, positive literals.** A grandfathered LISTING owned by an approved HOST would wear the
  badge under a host-only rule, and nobody checked that listing. A not-equals against the grandfathered
  value would additionally let `pending`, `rejected`, `unverified` and `suspended` through.
  `grep -v '^\s*[/*]' | grep -c "!== "` returns **0**.
- **One predicate, three callers, zero restatements.** `(detail)/page.tsx` and `query.ts`'s `toRow` both
  CALL it; the two client components (`host-block.tsx`, `search-result-card.tsx`) call nothing —
  `grep -c "isFitoutChecked"` returns **0** in each. This is 18-04's `og-facts.ts` finding applied
  forward: a rule written out longhand is invisible to the compiler.
- **The reduction is the boundary.** Neither client component ever receives a status, so neither can
  render the badge for a grandfathered row. It is not careful; it is uninformed.

## The four trust-signal edits, and the proof that none of them weakened the gate

| # | Edit | Proof it did not weaken anything |
|---|---|---|
| 1 | `SCAN_ROOTS` **stays at 3** — the listing tree was NOT added | Asserted by the shipped per-root guard clauses; the UI-SPEC's measured reason is now written at the declaration and in the header (`HOST_REQUEST_RULE` uses row 11's noun in its legitimate sense) |
| 2 | `FIFTH_SIGNAL_FILES` added — exactly **1** entry, run through the SAME `findForbidden` with the SAME twelve rows | New `it` asserts length 1, that every declared file was actually READ (not skipped by the `try`), that copy came out of it, and that the copy is multi-word prose. Mutation-proved RED below |
| 3 | The header sentence *"If a surface wants a fifth signal, the answer is no"* **rewritten**, not amended around | Replaced by the rule it always stood for — *the answer is no to a signal with no column behind it* — plus what the fifth signal's columns are, and D-212 |
| 4 | The failure messages enumerate **five** | `grep -c "the four"` returns **0**. Three sites moved: row 1's `why`, the clean-fixture message, and the ban's own message (which now shares a single `PERMITTED_SIGNALS` string with the new ban) |

`FORBIDDEN_SIGNALS` is still 12 and `expect(…).toHaveLength(12)` did not move. The gate went from
scanning 3 roots to scanning 3 roots **plus** one named file, and unbanned nothing. The clean-copy
fixture gained the chip's two sentences, so the permitted set is exercised at five rather than four.

## The rewritten `host-block.tsx` paragraph

The old paragraph said TRUST-04 banned all four neighbours here because *"None of them is backed by data
this product collects"*, and closed *"If you are here to add one, the requirement is the thing to change
first."* HVER-05 **is** that requirement change, so the paragraph is gone —
`grep -c "the requirement is the thing to change first"` returns **0**.

The replacement says, in the file:

- **Three of the four are still banned for the unchanged reason** — no superhost marker, no response
  rate, no "usually replies in", because the schema carries no tier, reply-count or latency column.
- **The fourth now has a row behind it** — `host_verification.status` joined with `listing.review_state`,
  both written by a named authenticated staff member (D-218), reduced by the single predicate in
  `src/lib/listing/fitout-check.ts`, rendering for `approved` + `approved` only, never for a
  grandfathered row.
- **The distinction never arrives in the file**, so it cannot badge the wrong row even by accident.

## The sentence written into `query.ts`, and why it had to be written

Stage-1 now selects `l.review_state, hv.status AS host_verification_status`, directly under this comment:

> **SELECTED PURELY TO TELL 'approved' FROM 'grandfathered'. THESE TWO COLUMNS ARE NOT A FILTER AND CAN
> NEVER BECOME ONE HERE.** The WHERE clause below already admits exactly the two values on each of them,
> so every row this query returns is 'approved' or 'grandfathered' on both — reading them changes nothing
> about WHICH rows come back. […] **⚠ DELETING EITHER AS "REDUNDANT WITH THE WHERE CLAUSE" SILENTLY
> BADGES THE ENTIRE GRANDFATHERED CATALOGUE** — rows marked by a migration (D-207) that nobody has ever
> checked, and the majority of the catalogue on day one.

The boolean is composed in `toRow`, not in the card — the `allInRateParts` precedent, so the browse chip
and the listing page it links to are guaranteed to use the same expression.

## The mutation REDs (watched, message recorded, reverted)

**1. `isFitoutChecked` → a host-only rule** (`return hostStatus === "approved";`)

```
× is FALSE for every one of the other pairs the two enums can make
× is FALSE for a GRANDFATHERED LISTING owned by an APPROVED HOST — the host-only-rule case
× is FALSE for every non-approved value on EITHER side, named one by one
× is FALSE when a status is missing entirely — the LEFT JOIN's nullable side
AssertionError: exactly one pair may be badged. Any other member here is a row FitOut would be
claiming to have checked when it did not — D-212, and the majority of the day-one catalogue.:
expected [ …(5) ] to deeply equal [ { hostStatus: 'approved', …(1) } ]
```
Tests 4 failed | 7 passed. Reverted; 11 passed.

**2. Row 11's plural noun placed in `FITOUT_CHECK_EXPLAINER`** ("Someone at FitOut ___s this host's
account…")

```
× renders none of the twelve in the FIFTH signal's own file either — it is subject to the ban
AssertionError: the fifth signal's own copy tripped the ban: [
  "src/components/listing/fitout-check-badge.tsx:80 — a feedback count. No such record exists, and the
   count is the signal a marketplace booker reads most literally. …"
```
Tests 1 failed | 7 passed. Reverted; 8 passed. The new set is doing work, and it names the file, the
line and the row's reason.

**3. (Unplanned, and the reason edit 3 is written the way it is.)** Naming the ops table in
`trust-signals.test.ts`'s header:

```
× declares twelve rows, each with a reason, and never spells one of them
AssertionError: this test file spells ["verific","ation"] contiguously somewhere. Encode it in two
pieces (or, for a single glyph, as a code-point escape) — see the header.
```
Reverted, and `git diff --exit-code` confirms the file matches its commit byte-for-byte.

## Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm test` (alone) | **206 files / 2465 passed / 5 skipped** — baseline 205 / 2453; +1 file (the 11-case badge spec) and +1 case (the search assertion). Exact |
| `npm run test:design` (alone) | **72 files / 1313 passed / 3 skipped** — baseline 1311; +2 (the guard-the-guard clause and the fifth-signal ban) |
| `npx vitest run --config vitest.design.config.ts tests/design/{trust-signals,pending-copy,leak}.test.ts` | 3 files / 41 passed |
| `npx vitest run tests/search/bookable-gate.test.ts tests/search/availability-filter.test.ts` | 13 passed |
| `npx vitest run tests/profile/ tests/listing/listing-public.test.ts` | 5 files / 63 passed |
| `git diff src/lib/profile.ts` | **empty** — `PublicProfile` not widened, `PRIVATE_PROFILE_FIELDS` still names `role` |
| `git diff --exit-code src/components/patterns/result-card.tsx` | **clean** — the pattern was composed, not forked; the chip is never overlaid on the photo |

Acceptance greps: `the four` → 0 · `!== ` in `fitout-check.ts` code → 0 · accent/success classes in the
badge → 0 · `isFitoutChecked` in either client component → 0 · `the requirement is the thing to change
first` → 0 · `host_verification_status` in `query.ts` → 3 · `grandfathered` in `query.ts` 4 → 8.

The `[test-db] LEAKED WRITES` block naming `notify` and `guest-email` appeared as expected and is
pre-existing. The three known-red e2e specs in `deferred-items.md` were not touched.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The trust-signal header cannot name `host_verification.status`**
- **Found during:** Task 1
- **Issue:** 18-UI-SPEC edit (3) and the plan both require the replacement header to name
  `host_verification.status`. That file asserts against its own source that none of the twelve tokens is
  spelled contiguously anywhere in it, and the table's name contains row 5 verbatim.
- **Fix:** The header describes the column ("the ops-check `status` column on the host's phase-18 ops
  row") and says explicitly why the name is not written there, pointing at `fitout-check.ts`, which
  spells it in full. Proved by mutation RED #3 rather than assumed.
- **Files modified:** `tests/design/trust-signals.test.ts`
- **Commit:** `d254f05`

**2. [Rule 3 - Blocking] The plan's action text and its own acceptance criterion disagree about `isFitoutChecked` in `host-block.tsx`**
- **Found during:** Task 2
- **Issue:** The action says the rewritten paragraph must say "reduced by `isFitoutChecked`"; the
  acceptance criterion requires `grep -c "isFitoutChecked" src/components/listing/host-block.tsx` to
  return 0. Both cannot hold.
- **Fix:** The paragraph names the module path instead of the identifier, which preserves the intent (a
  reader is pointed at the one place the rule lives) and satisfies the criterion. **Seventh recorded
  instance of an acceptance grep colliding with the prose explaining it.**
- **Files modified:** `src/components/listing/host-block.tsx`
- **Commit:** `e245dfe`

**3. [Rule 2 - Missing critical functionality] `l.review_state` also had to be selected**
- **Found during:** Task 3
- **Issue:** The plan names only `hv.status AS host_verification_status` for the Stage-1 SELECT, but the
  predicate it feeds takes TWO terms and the listing's review state was not projected at all. With one
  term the search surface could only have implemented the host-only rule D-212 forbids.
- **Fix:** Both columns selected under one comment; both added to `RawRow`.
- **Files modified:** `src/lib/search/query.ts`
- **Commit:** `c033903`

**4. [Rule 3 - Blocking] Three fixtures updated where the compiler enumerated the callers**
- **Found during:** Task 3
- **Issue:** `fitoutChecked` is REQUIRED on `SearchResultRow`, so `tsc` produced four errors in three
  files that construct one — exactly the census mechanism the phase relies on.
- **Fix:** `src/app/dev/theme/fixtures.ts` → `true` (so the design surface exercises the two-chip
  wrapping type line); `tests/search/search-card-open.test.tsx` (both factories) and
  `tests/search/search-results-states.test.tsx` → `false`, so files pinning the drop-in card's copy do
  not silently acquire a second chip.
- **Commit:** `c033903`

### Not deviations, recorded because a reader will wonder

- **The badge test does not render `grandfathered`.** It cannot: the component takes a boolean. The
  grandfathered cases are driven against the predicate directly, over the full 6 × 5 cartesian product
  of both pgEnums plus the null/undefined LEFT-JOIN cases. That split is the design, not a gap.
- **No `data-testid` was added**, so `selector-contract.ts` is untouched; the chip is found by its text.

## Known Stubs

None. Both surfaces read live columns; nothing is hardcoded, and there is no placeholder chip by
deliberate decision (a badge that renders `null` teaches nothing, which is correct — an "unchecked" chip
would be a claim about the ungated grandfathered catalogue that FitOut cannot support).

## Threat Flags

None. The plan's register was mitigated as written: T-18-1101 (both terms, mutation-proved),
T-18-1102 (one scanned file, mutation-proved), T-18-1103 (`profile.ts` byte-unchanged), T-18-1104 (the
SELECT comment plus two fixture assertions), T-18-1105 (the old paragraph grep-asserted gone),
T-18-SC (nothing installed, `badge` already vendored).

## Carried forward

- **18-12 (`/ops` route):** if it ever shows an operator whether a row is checked, it calls
  `isFitoutChecked` — a fourth restatement is the defect 18-04 already paid for.
- **The permanent hazard now written into the tree:** `hv.status` and `l.review_state` in the Stage-1
  SELECT look redundant against the WHERE clause and are not. The comment is the only thing standing
  between a tidy-up and the whole grandfathered catalogue wearing a badge.
- **The grandfathered burn-down (D-207/D-211)** will silently light up badges as rows flip to
  `approved` — that is the intended behaviour and needs no code change, but it means the visible chip
  count is a live measure of how much of the catalogue an operator has actually checked.

## Commits

| Task | Commit | What |
|---|---|---|
| 1 | `d254f05` | the predicate, the badge, the component spec, and the four trust-signal edits |
| 2 | `e245dfe` | the listing detail surface and the rewritten TRUST-04 paragraph |
| 3 | `c033903` | the search SELECT, `toRow`'s boolean, the card's second chip, and the D-212 fixture assertion |
