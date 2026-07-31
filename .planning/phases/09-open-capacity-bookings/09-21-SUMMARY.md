---
phase: 09-open-capacity-bookings
plan: 21
subsystem: api
tags: [zod, validation, postgres, drizzle, money, server-actions, open-capacity]

requires:
  - phase: 09-open-capacity-bookings
    provides: "09-06's publish gate (publishSchema's open branch + the four exported drop-in sentences), 09-07's placeOpenHold, 09-20's not_blocked column on the claim's cap/rate statement"
  - phase: 08-group-bookings
    provides: "HG-01 — the published-row edit-path re-gate pattern in saveListingStep (08-22) and SURCHARGE_UNREACHABLE_MESSAGE's single-literal discipline"
provides:
  - "the published-row re-gate for the Phase-9 mode fields on the EDIT path, reusing the publish gate's own four sentences"
  - "a fail-closed admissions claim: every money input read from the listing row is a returned refusal, never a raised error"
  - "MAX_PER_HEAD_PRICE_CENTS / MAX_OPEN_CAPACITY host-input ceilings whose product is arithmetically proven below int4"
  - "MAX_MONEY_CENTS + the runtime product guard for listings priced before those ceilings existed"
  - "tests/listing/open-capacity-edit-gate.test.ts — the confirmation-then-regression gate, three mutations recorded"
affects: [listing-wizard, open-capacity-claim, booking-validation, phase-09-verification]

tech-stack:
  added: []
  patterns:
    - "edit-path re-gate: a publish rule that governs a LIVE row must be re-imposed in saveListingStep's published-row scope on the EFFECTIVE post-save values, importing the publish path's own sentence"
    - "fail-closed money reads: every money column the claim reads from the listing is a calm returned refusal, because mapBookingError re-raises anything that is not NoUnitAvailableError/23P01/40P01"
    - "layered numeric bounds: shape ceiling (request) → host-input ceiling (schema) → runtime product guard (legacy rows), with the arithmetic written where the ceilings are declared"

key-files:
  created:
    - tests/listing/open-capacity-edit-gate.test.ts
  modified:
    - src/app/actions/listing.ts
    - src/lib/availability/units.ts
    - src/lib/validation/listing.ts
    - src/lib/validation/booking.ts
    - src/lib/booking/pricing.ts
    - .planning/phases/09-open-capacity-bookings/deferred-items.md

key-decisions:
  - "CR-04 confirmed as REAL before any src/ change (branch A): the sparse autosave was accepted and the claim raised out of placeOpenHold uncaught"
  - "The edit gate imposes the FOUR correctness rules the plan enumerates, not publishSchema's fifth (D-110 extraHeadFee) — enforcing it would dead-end a host whose wizard hides the field; recorded as deferred item 5"
  - "The fail-closed rate refusal reuses SOLD_OUT_MESSAGE with NO soldOut flag rather than inventing a fifth sentence — the plan's own cited precedent is the NULL-cap path, which already answers SOLD_OUT_MESSAGE"
  - "quoteOpenCapacity's invariant guard is preserved byte-for-byte; grep -c 'throw' on pricing.ts is unchanged at 4"
  - "MAX_OPEN_CAPACITY bounds the SHARED maxOccupancy column, so its sentence is deliberately mode-neutral"
  - "Three mutations executed and recorded, including one the plan did not mandate (the product guard), because WR-04 arrived as a warning about a comment and needed its mechanism proven"

patterns-established:
  - "Confirm-then-fix, branch A: the confirming test is written against unchanged src/, the failure recorded verbatim in the file header, and only then the fix"
  - "A gate can only govern rows created after it: case 5's fixture is written DIRECTLY to the table, because the listing that matters was already in the bad state when the gate shipped"

requirements-completed: [OPEN-01, OPEN-02]

duration: 42min
completed: 2026-08-01
---

# Phase 09 Plan 21: Drop-in edit-path re-gate and real money ceilings Summary

**A published listing can no longer be edited into drop-in mode without the four things publish requires, every money input the admissions claim reads is a calm returned refusal instead of a raw 500, and the two `.max(10_000)` docblocks now describe a protection that genuinely exists.**

## Performance

- **Duration:** ~42 min
- **Started:** 2026-08-01T02:19Z (venue-local; 2026-07-31T18:19Z UTC)
- **Completed:** 2026-08-01T03:01Z (venue-local)
- **Tasks:** 3 of 3
- **Files modified:** 6 (1 created, 5 modified + 1 planning doc)

## Accomplishments

### Task 1 — CR-04 independently confirmed (BRANCH A)

CR-04 arrived in `09-REVIEW.md` marked **"reported, NOT independently verified."** It is now verified real.

`tests/listing/open-capacity-edit-gate.test.ts` was written FIRST, against unchanged `src/`
(`git status --short -- src/` empty, `git diff --exit-code src/` clean, HEAD `b735914`), and both cases
failed. Verbatim:

```
 ❯ tests/listing/open-capacity-edit-gate.test.ts (2 tests | 2 failed) 3044ms
     × 1 · the wizard's own sparse autosave is refused, and the persisted row is untouched 132ms
     × 5 · a published drop-in row with no price per person RETURNS a refusal and mints NO booking 140ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/listing/open-capacity-edit-gate.test.ts > CR-04 — a published listing may not enter drop-in
 mode without what publish requires > 1 · the wizard's own sparse autosave is refused, and the persisted
 row is untouched
AssertionError: expected true to be false // Object.is equality

- Expected
+ Received

- false
+ true

 ❯ tests/listing/open-capacity-edit-gate.test.ts:308:20
    306|     const res = await saveListingStep(L_PUB_EXCL, { occupancyMode: "op…
    307|
    308|     expect(res.ok).toBe(false);
       |                    ^
    309|     if (res.ok) return;
    310|     expect(res.fieldErrors?.perHeadPriceCents).toContain(PER_HEAD_PRIC…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  … > 5 · a published drop-in row with no price per person RETURNS a refusal and mints NO booking
Error: Listing has no per-head price for an open-capacity booking
 ❯ quoteOpenCapacity src/lib/booking/pricing.ts:165:11
    163| export function quoteOpenCapacity(input: OpenCapacityQuoteInput): Open…
    164|   if (input.perHeadPriceCents == null) {
    165|     throw new Error("Listing has no per-head price for an open-capacit…
       |           ^
    166|   }
    167|   if (!Number.isInteger(input.heads) || input.heads < 1) {
 ❯ src/lib/availability/units.ts:894:23
 ❯ scope node_modules/postgres/src/index.js:260:18
 ❯ sql.begin node_modules/postgres/src/index.js:243:14
 ❯ createOpenCapacityHold src/lib/availability/units.ts:779:14
 ❯ placeOpenHold src/app/actions/booking.ts:441:15
 ❯ tests/listing/open-capacity-edit-gate.test.ts:336:17

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯

 Test Files  1 failed (1)
      Tests  2 failed (2)
 Duration  5.07s
```

(Two `[Better Auth]: Social provider google is missing clientId or clientSecret` stderr lines precede this
block on every DB-backed file — the harness's standing warning, not part of the finding.)

**Read the two failures as one sentence.** `expected true to be false` — `saveListingStep` **accepted** the
switch: a published, bookable listing went to `open_capacity` with `per_head_price_cents = NULL`, by the
wizard's own normal route (`STEPS` puts `occupancy` before `pricing`; `saveAndContinue` persists the whole
form on every step). Then `Error: Listing has no per-head price for an open-capacity booking`, raised at
`pricing.ts:165` and **unwound all the way out through `createOpenCapacityHold` → `placeOpenHold` → the
caller without being caught anywhere**. In production that caller is a booker's *Book this space* click and
the exception surfaces as a Next.js error digest on the money path (T-09-69 / T-09-70) — the exact
`T-03-500` outcome `mapBookingError`'s own docblock promises never happens.

The two failures are the same defect at its two ends: the gate that let the row into the state, and the
claim that had no answer once it was there. Committed alone as `34f9c3e`.

### Task 2 — the edit-path re-gate, and a claim that fails closed

**(a) `saveListingStep`.** The new guard joins the **existing** `if (owned.status === "published")` scope
beside HG-01 (the acceptance grep for that scope still prints `1` — one published-row scope, not two). It
computes the effective post-save values with the same `incoming ?? persisted ?? default` idiom HG-01 uses,
reusing HG-01's own `effMax` local so there is exactly one definition of "the capacity this save would leave
behind", and refuses when the effective mode is `open_capacity` and any of the four publish rules is unmet:

| effective value | rule | field error |
|---|---|---|
| `effPerHead` | `> 0` | `perHeadPriceCents` |
| `effMax` | `> 0` | `maxOccupancy` |
| `effBookingMode` | `=== "instant"` | `bookingMode` |
| `effUnitCount` | `=== 1` | `unitCount` |

All four sentences are **imported** from `src/lib/validation/listing.ts`, never retyped, so the publish gate
and the edit gate cannot drift into two slightly different refusals — the grep for each prints exactly `2`
(the import line and the one use), and the re-declaration grep prints `0`. The outer sentence is the same
`"Please check the form and try again."` HG-01 returns, so the wizard's existing failure surface handles it
with **no component change**. Field errors are accumulated rather than short-circuited, so a host is told
every number that is wrong at once.

**Drafts stay permissive** — the guard is inside the `published` branch only, and the comment says why: the
wizard's occupancy step comes *before* its pricing step, so a draft sitting in drop-in mode with no price is
precisely the state a host mid-build is standing in. Tightening this to all rows would freeze the wizard at
its own step 5. `assertOwnership` is untouched (T-09-72 unchanged); `unitCount` has no form field, so the
persisted value is the only honest source.

**(b) The claim.** `createOpenCapacityHold` now refuses a NULL or non-positive `per_head` **before**
`quoteOpenCapacity` is reached, joining 09-20's step-5 refusal sequence without reordering or rewriting the
block-date refusal. `<= 0` and not merely `== null`, because `draftSchema` admits `0` on purpose (a host
mid-keystroke on the way to "350") and freezing a ₱0 charge sells a pass for nothing. It is a bare
`{ error }` with **no** `soldOut` flag — the `PAST_DATE_MESSAGE` shape — routing to `placeOpenHold`'s calm
`taken` branch.

The rule is named once and covers both money columns the statement reads: **every money input the claim
takes from the listing row is a fail-closed refusal, never a raised error**, because `mapBookingError` maps
only `NoUnitAvailableError` / 23P01 / 40P01 and re-raises everything else. The step-6 NULL-cap paragraph was
extended to point at it. **`quoteOpenCapacity`'s own guard is deliberately untouched** — `grep -c "throw"`
on `pricing.ts` is unchanged at `4` — because it holds a real invariant for every other caller; the fix is
that the claim must never hand it a null, not that the invariant should soften.

Committed as `e6382bc`.

### Task 3 — the ceilings that are real (WR-04)

**(a) Host-input ceilings.** `MAX_PER_HEAD_PRICE_CENTS = 1_000_000` (₱10,000/person) and
`MAX_OPEN_CAPACITY = 1_000` admissions/day are exported from `src/lib/validation/listing.ts` and applied to
`perHeadPriceCents` and `maxOccupancy` in **both** `draftSchema` and `publishSchema`, each with its own
exported O3 sentence (`PER_HEAD_PRICE_TOO_HIGH_MESSAGE`, `DROP_IN_CAP_TOO_HIGH_MESSAGE`). Draft-time is not
optional: the wizard autosaves straight onto a LIVE row, so a bound applied only at publish would leave a
published listing free to grow a stadium cap on its next *Save and continue* — CR-04's lesson, one file over.

The arithmetic is written where the ceilings are declared, so it is checkable rather than asserted:

```
1_000 people × 1_000_000 centavos      = 1_000_000_000 centavos of space price
+ the D-74 service fee (500 bps ⇒ +5%) = 1_050_000_000 all-in
                                       < 2_147_483_647 (int4)
```

No existing fixture or seed exceeded either ceiling (checked across `src`, `tests`, `e2e`, `scripts` before
choosing the numbers), so no ceiling had to move and no fixture was reconsidered.

**(b) Both docblocks corrected.** `validation/booking.ts`'s `declaredPax` and `requestedPasses` paragraphs
now say what is true — the `.max(10_000)` is a **shape** ceiling that bounds an untrusted request, and a
request can only ever ask for *less* than the host's numbers already allow, so it never was the overflow
protection. Each names the chain that is real: host-input ceilings → runtime product guard
(`MAX_MONEY_CENTS`) → shape bound.

**(c) The runtime product guard.** `MAX_MONEY_CENTS = 2_147_483_647` is declared once, in
`src/lib/booking/pricing.ts` beside the functions that compute the products it bounds, and exported. The
claim checks **both** figures immediately before the quote — the space price and the D-74 all-in, because
the fee rides on top and `quoted_total_cents` is int4 too — plus `Number.isSafeInteger`. Its comment states
plainly that this layer exists **for legacy rows**: no schema change reprices an existing row, so without it
the new ceilings would protect only listings that never needed protecting.

**Scope note honoured.** The exclusive path (`quoteWindow`) was deliberately not widened. Nothing in it was
found to be equally exposed on this reading — the D-108 surcharge product is bounded by `maxOccupancy`,
which this plan now caps, so the same ceiling covers it without a change to that path.

Committed as `e1d51b2`.

## Mutations — all three EXECUTED, output recorded

### Mutation A (mandated) — delete the fail-closed rate refusal, keep the `saveListingStep` gate

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  … > 5 · a published drop-in row with no price per person RETURNS a refusal and mints NO booking
Error: Listing has no per-head price for an open-capacity booking
 ❯ quoteOpenCapacity src/lib/booking/pricing.ts:165:11
 ❯ src/lib/availability/units.ts:920:23
 ❯ createOpenCapacityHold src/lib/availability/units.ts:779:14
 ❯ placeOpenHold src/app/actions/booking.ts:441:15
 ❯ tests/listing/open-capacity-edit-gate.test.ts:544:17

 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
```

It reproduces the Task-1 confirming failure **exactly** — same sentence, same raising site, same unwinding
out through `placeOpenHold`. **Note which cases stayed GREEN under it: 1, 2, 3 and 4**, because the
action-level gate was untouched. An action-level fix alone therefore looks like four-fifths of a success,
and the only case that can say otherwise is the one whose fixture was written **directly to the table**.
That is precisely why case 5 does not go through `saveListingStep`: a gate can only govern rows created
after it, and the listing that mattered was already in the bad state when the gate shipped.

Restored → 5/5 green → `git diff --exit-code src/lib/availability/units.ts` printed nothing.

### Mutation B (not mandated — run because WR-04 arrived as a warning about a *comment*)

WR-04 could have been merely a documentation defect. Deleting the runtime product guard while leaving the
new host-input ceilings in place — the exact position a listing priced *before* them is in — turned case 7
RED with the reviewer's predicted failure, observed:

```
 FAIL  … > 7 · a legacy stadium row is refused calmly instead of raising a 22003, and mints NO booking
Error: Failed query: insert into "booking" (…) values (…) returning "expires_at", "space_price_cents",
"service_fee_cents", "quoted_total_cents"
params: bf5c57c1-50bc-48a7-85cb-eec5f13e36bf,l_ocedit_stadium,1,dMHsUdDVzQtiWcgovwRwKubGQTKVrdzs,
2026-08-30T22:00:00.000Z,2026-08-31T14:00:00.000Z,pending,instant,false,15,2026-08-31T14:00:00.000Z,
3150000000,php,,standard,3000000000,150000000,10000,true
 ❯ src/lib/availability/units.ts:940:26
 ❯ createOpenCapacityHold src/lib/availability/units.ts:779:14
 ❯ placeOpenHold src/app/actions/booking.ts:441:15
 ❯ tests/listing/open-capacity-edit-gate.test.ts:711:17

Caused by: PostgresError: value "3150000000" is out of range for type integer
{ severity: 'ERROR', code: '22003', routine: 'pg_strtoint32_safe' }

 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
```

`space_price_cents = 3_000_000_000`, `quoted_total_cents = 3_150_000_000` — **the all-in figure, fee
included, is the parameter that actually blew up** — and the 22003 unwinds out through
`createOpenCapacityHold` and `placeOpenHold` uncaught, because 22003 is neither 23P01 nor 40P01. So WR-04 is
not only a comment that overstated a protection: the protection it described was genuinely absent, and its
absence is reachable. (The `params:` line above is the postgres.js dump verbatim; it echoes the test's own
clock-relative fixture instants, which is why it is elided from the test file's header and kept here.)

Restored → 7/7 green.

### Mutation C — the fixture check that came out of Task 2's first run

Not a source mutation: the first run of the extended file failed in `beforeAll` with
`PostgresError: invalid input value for enum space_type: "studio"`. Two fixture space types were not members
of the `space_type` pgEnum. Fixed in the fixtures (`yoga_studio`, `multi_sport_court`); no `src/` change.
Recorded because a `beforeAll` failure reports as *five skipped tests*, which reads like a pass at a glance.

## Deviations from Plan

### 1. `[Rule 3 — Blocking]` Two fixture `primarySpaceType` values were not enum members

- **Found during:** Task 2, first run of the extended file
- **Issue:** `"studio"` and `"court"` are not in the `space_type` pgEnum; the seed insert aborted in
  `beforeAll` and all five cases reported as *skipped*
- **Fix:** `"yoga_studio"` and `"multi_sport_court"` (from `src/lib/listing-vocab.ts`, the single vocab
  authority)
- **Files modified:** `tests/listing/open-capacity-edit-gate.test.ts` only — no `src/` change
- **Commit:** `e6382bc`

### 2. `[Design decision]` The edit gate imposes FOUR rules, not `publishSchema`'s five

The plan's instruction (a) enumerates exactly four rules with exactly four field errors, while its
`read_first` note says the edit gate "must impose the SAME rules, not a subset and not a superset."
`publishSchema`'s open branch carries **five** checks — the fifth being D-110 (`extraHeadFee > 0` is refused
in drop-in mode). The four enumerated rules were implemented; D-110 was not. Reasoning, recorded rather than
absorbed:

- The four are **correctness** rules whose absence reaches money or a 500. D-110 has no such reach:
  `quoteOpenCapacity` is purely `per_head_price_cents × heads` and never reads `extra_head_fee`, so a stale
  surcharge on a drop-in listing changes no charge, no payout and no refund.
- Enforcing it would create a **dead end**. An exclusive listing legitimately carrying an extra-guest fee is
  exactly the listing a host converts to drop-in, but the wizard removes the group-pricing fields in drop-in
  mode — so the host would be refused with "extra guest pricing doesn't apply" and shown no control with
  which to clear it. Refusing a save a host cannot un-refuse is worse than a dormant column.

Logged as **deferred item 5** with two concrete ways to close it, so the finding survives.

### 3. `[Known plan defect — documented, not absorbed]` `grep -c "2026-" == 0` and the verbatim-record rule

The plan requires the confirming run recorded **verbatim** in the file header, and separately requires
`grep -c "2026-"` to print `0`. Both hold in the shipped file, but only because two machine-printed
fragments are elided, each named at the point of elision:

- the harness's two `[Better Auth]` stderr lines, which carry ISO timestamps and precede the failure block
  on **every** DB-backed file in the suite;
- postgres.js's `params:` / `parameters:` dumps under mutation B, which echo the test's own clock-relative
  fixture instants back as ISO strings.

**Nothing describing a failure is elided**, and the full untouched postgres.js dump is reproduced above in
this SUMMARY, which carries no such constraint. This is the same class 09-20 documented; unlike 09-22's and
09-25's tripwires, this one is not satisfiable by re-wording, because the forbidden text is emitted by
tooling rather than written by hand. No fixture carries a calendar literal — every date is clock-relative.

### 4. `[Design decision]` The fail-closed refusal reuses `SOLD_OUT_MESSAGE`

The plan forbids a fifth sentence and points at the NULL-cap precedent, which already answers
`SOLD_OUT_MESSAGE`. Both new refusals (missing rate, overflowing product) therefore return that literal as a
bare `{ error }` with **no** `soldOut` flag, so `placeOpenHold` routes them to its calm `taken` branch rather
than OC-13's race-loss branch with its refresh-and-retry affordance. Recorded because the sentence is
imperfect for a mis-configured listing: a booker cannot act on "this listing has no price", and should not
be shown a host's configuration mistake as though it were theirs to fix. The alternative — a fifth literal —
was rejected per the plan's own instruction and because two sentences for "you cannot buy this today" is the
drift the module's single-literal discipline exists to prevent.

## Threat Model Coverage

| Threat ID | Disposition | How it landed |
|---|---|---|
| T-09-68 | mitigate | `saveListingStep`'s published-row scope re-imposes all four publish rules on the effective post-save values, reusing the publish path's own exported sentences. Cases 1 and 3 assert the persisted row, not the return value. |
| T-09-69 | mitigate | The claim fails closed on a NULL/non-positive rate **and** on a product that would exceed int4; both return a structured refusal. `quoteOpenCapacity`'s invariant guard is preserved for every other caller (`grep -c "throw"` unchanged at 4). |
| T-09-70 | mitigate | Cases 5 and 7 assert the action **returns** — plain `await`, never a rejection matcher (`grep -c "rejects"` prints `0`) — and that the `booking` table holds zero rows for that (listing, venue-local day). |
| T-09-71 | mitigate | Host-input ceilings whose product plus the service fee is arithmetically proven below int4, plus the runtime product guard for legacy rows. Mutation B proves the 22003 was genuinely reachable. |
| T-09-72 | accept | `assertOwnership` is byte-untouched and still runs before anything in `saveListingStep`; no new entry point. |
| T-09-SC | mitigate | **No package was installed by this plan.** |

## Verification

| Gate | Result |
|---|---|
| Task-1 confirming run, branch stated | BRANCH A, verbatim in the file header and above |
| `npx vitest run tests/listing/open-capacity-edit-gate.test.ts` | **7/7 passed** |
| `npx vitest run tests/validation tests/listing tests/booking` | **458 passed / 43 files**, zero failures |
| `npx vitest run` (full suite) | **1073 passed / 4 skipped** (1066 baseline + exactly these 7), ONE failure — the known `date-pass-picker` multi-suite timeout (deferred item 3), reconfirmed **9/9 in isolation** |
| `npx tsc --noEmit` | **0** |
| `npm run lint` | **0 errors / 7 baseline warnings** |
| `git diff --exit-code src/` after each mutation restored | clean |

### Acceptance greps

| Grep | Required | Actual |
|---|---|---|
| `rejects` in the test file | `0` | `0` |
| `2026-` in the test file | `0` | `0` |
| `PER_HEAD_PRICE_REQUIRED_MESSAGE` in `actions/listing.ts` | `2` | `2` |
| `DROP_IN_INSTANT_ONLY_MESSAGE` / `DROP_IN_SINGLE_SPACE_MESSAGE` | `2` each | `2`, `2` |
| `PER_HEAD_PRICE_REQUIRED_MESSAGE = ` | `0` | `0` |
| `owned.status === "published"` | `1` | `1` |
| `SURCHARGE_UNREACHABLE_MESSAGE` | unchanged (2) | `2` |
| `throw` in `pricing.ts` | unchanged (4) | `4` |
| `export const MAX_PER_HEAD_PRICE_CENTS` / `export const MAX_OPEN_CAPACITY` | `1` each | `1`, `1` |
| `MAX_PER_HEAD_PRICE_CENTS` in `validation/listing.ts` | ≥ 3 | `3` |
| `2_147_483_647` in `pricing.ts` | `1` | `1` |
| `MAX_MONEY_CENTS` in `units.ts` | ≥ 1 | `4` |
| `MAX_PER_HEAD_PRICE_CENTS` / `MAX_OPEN_CAPACITY` / `MAX_MONEY_CENTS` in `validation/booking.ts` | ≥ 1 each (was 0) | `2`, `2`, `3` |
| test file length | ≥ 130 lines | 762 |

## Schema / migrations

**No schema change and no migration.** Every column this plan reads already exists; the next migration
number is still **0023**.

## Known Stubs

None.

## Threat Flags

None — this plan adds no network endpoint, no auth path, no file access and no schema change. Both surfaces
it touches (`saveListingStep`, `createOpenCapacityHold`) are existing trust boundaries already in the
register above.

## Commits

| Commit | What |
|---|---|
| `34f9c3e` | `test(09-21)` — the confirming failure against unchanged `src/` (branch A) |
| `e6382bc` | `fix(09-21)` — the edit-path re-gate + the fail-closed claim (CR-04) |
| `e1d51b2` | `fix(09-21)` — the money ceilings and the runtime product guard (WR-04) |

## Self-Check: PASSED

- `tests/listing/open-capacity-edit-gate.test.ts` — FOUND
- `src/app/actions/listing.ts` / `src/lib/availability/units.ts` / `src/lib/validation/listing.ts` /
  `src/lib/validation/booking.ts` / `src/lib/booking/pricing.ts` — FOUND, all modified
- `.planning/phases/09-open-capacity-bookings/deferred-items.md` — FOUND, item 5 added
- Commits `34f9c3e`, `e6382bc`, `e1d51b2` — all FOUND in `git log`
