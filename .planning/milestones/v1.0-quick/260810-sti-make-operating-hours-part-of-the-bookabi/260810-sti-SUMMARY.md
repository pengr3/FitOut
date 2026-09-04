---
phase: quick-260810-sti
plan: 01
subsystem: bookability
tags: [bookability, search, booking, security, audit-debt]
requires:
  - operating_hours (schema, pre-existing)
  - loadPublishedListingsMissingHours (260801-iu7)
provides:
  - four-term deriveBookable (published + hasOperatingHours + emailVerified + payoutsEnabled)
  - listingHasOperatingHours (single-listing hours probe)
  - SQL twin parity guard replacing the retired byte-unchanged git-diff gate
affects:
  - search Stage-1 result set (no-date browse now excludes hours-less listings)
  - placeHold / placeOpenHold server-side refusals
  - /host/listings badge derivation
  - listings/[id] booker page bookable derivation
tech-stack:
  added: []
  patterns:
    - "gate term as a PURE PARAMETER, so the compiler enumerates call sites"
    - "duplicated security code (re-statement) gets one independent RED anchor per copy"
    - "set-equality parity assertion between a TS predicate and its inlined SQL twin"
key-files:
  created:
    - tests/availability/availability-calendar.test.tsx
  modified:
    - src/lib/bookability.ts
    - src/lib/search/query.ts
    - src/lib/listing/hours-signal.ts
    - src/app/listings/[id]/page.tsx
    - src/app/actions/booking.ts
    - src/app/(host)/host/listings/page.tsx
    - src/components/listing/listing-card.tsx
    - tests/listing/bookability.test.ts
    - tests/search/bookable-gate.test.ts
    - tests/booking/state-machine.test.ts
    - tests/booking/open-capacity-hold.test.ts
    - tests/booking/notify-emission.test.ts
    - tests/booking/request-lifecycle.test.ts
    - tests/paymongo/webhook-merchant-activated.test.ts
    - tests/listing/listing-card.test.tsx
    - tests/listing/hours-signal.test.ts
decisions:
  - "Hours are a DERIVATION term, not a publish gate (operator-locked) — a gate would only stop new cases and would block a legitimate host mid-setup"
  - "The term is a PARAMETER, not a query — deriveBookable stays pure and the compiler enumerates the four call sites"
  - "placeHold and placeOpenHold stay separate by RE-STATEMENT; no shared helper. Each gets its own RED anchor"
  - "The retired byte-unchanged git-diff gate is replaced by a set-equality parity assertion, proven in BOTH directions by M1 and M2"
metrics:
  duration: ~35 min
  tasks: 3
  commits: 3
  tests_added: 15
  completed: 2026-08-10
---

# Quick Task 260810-sti: Make operating hours part of the bookability gate — Summary

Closed v1.0 milestone-audit tech-debt item #4 by making "the listing has at least one `operating_hours` row" the **fourth term** of `deriveBookable`, together with its inlined SQL twin, both server-side re-derivations and all four call sites — so a published listing with an empty weekly calendar is no longer sellable, no longer appears in search, and is refused by both hold mutations.

## What shipped

**The predicate** (`src/lib/bookability.ts`). `published && hasOperatingHours && emailVerified && payoutsEnabled`. Still pure — no `await`, no `db` import — because purity is what lets the truth table drive it directly. The term arrives as a **parameter on the listing object**, which means every call site builds a fresh object literal and the compiler, not grep, enumerates who must answer the question.

**The SQL twin** (`src/lib/search/query.ts`). An **unconditional** `AND EXISTS (SELECT 1 FROM operating_hours oh_any WHERE oh_any.listing_id = l.id)` inside the inlined-deriveBookable block. It coexists with the pre-existing per-day EXISTS: the new one is the **sell gate** (is there a calendar at all), the old one is a **per-request filter** (open on the day you picked). The old term's conditionality is precisely why an hours-less listing survived the default no-date browse view until now.

**The four call sites**, none of which adds a round trip:

| # | Site | Source of the value | Cost |
|---|---|---|---|
| 1 | `listings/[id]/page.tsx` | `listingHasOperatingHours(db, id)` added to the existing `Promise.all`; the derive moved just below it | zero added latency (rides an existing concurrent batch) |
| 2 | `booking.ts` `placeHold` | correlated `EXISTS` folded into the SELECT it already ran | zero extra round trips |
| 3 | `booking.ts` `placeOpenHold` | the same, **by re-statement** | zero extra round trips |
| 4 | `/host/listings` | `!missingHours.has(r.id)` — reuses iu7's one grouped query | free |

**A new export** — `listingHasOperatingHours(dbConn, listingId)` in `hours-signal.ts`, a short-circuiting `LIMIT 1` probe on `operating_hours_listing_idx`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Backticks in a comment terminated the SQL template literal**
- **Found during:** Task 2, at the first `tsc` run
- **Issue:** Comments I added inside `search/query.ts`'s `sql\`...\`` template contained backticks (and a `${`), which ended the template and opened an interpolation — 4× `TS1005: ',' expected`.
- **Fix:** Removed them, and left a note in place so the next editor does not repeat it.
- **Files modified:** `src/lib/search/query.ts`
- **Commit:** `8fec4df`

**2. [Rule 3 - Blocking] The `hasOperatingHours: true` grep gate tripped on a comment**
- **Found during:** Task 2 verification
- **Issue:** Verification gate 8 (`grep -rn 'hasOperatingHours: true' src/` → 0) returned 1. The hit was inside the site-4 soundness **comment**, not a stubbed call site — the gate was right in spirit and noisy in the letter.
- **Fix:** Reworded the comment to "reports the hours term as TRUE". The gate now reads 0, so a real future stub genuinely trips it instead of being lost in noise.
- **Files modified:** `src/app/(host)/host/listings/page.tsx`
- **Commit:** `8fec4df`

### Findings reported as observed rather than as predicted

Three places where reality diverged from the plan. All are recorded verbatim in the owning test headers.

**1. The open-capacity RED was not the predicted one — and the difference matters.**
The plan predicted `L_OPEN_NOHOURS` would **mint a hold**, as the exclusive twin did. It did not: `placeOpenHold` was saved by a *later* gate. Step (7) derives the day's entry window from the listing's own hours and returns null when there are none, so the drop-in path already refused — three gates too late, with the wrong reason and with copy that lies:

```
-   "error": "This space isn't accepting bookings right now.",
+   "error": "This space isn't open that day. Pick another date.",
-   "reason": "not-bookable",
+   "reason": "invalid",
```

"Pick another date" is a dead end on a listing that has **no dates at all**, and it is what every drop-in booker used to be told.

The plan's done-criterion said an `invalid` here means the fixture has the wrong occupancy mode. **It does not, and the received copy is what proves it**: a mode mismatch is refused at gate (6) with `OPEN_ON_EXCLUSIVE`, not gate (7)'s `CLOSED_THAT_DAY`. Gates 1–6 all passed, so bookability (gate 5) genuinely let the listing through. The case asserts the exact error string rather than just the reason code for precisely this reason. Net effect: the anchor measures the intended thing (the refusal must move from gate 7 to gate 5), but the pre-fix hole on that path was a *wrong-and-misleading refusal*, not an unbounded mint.

**2. The truth table's meta-assertion cannot detect a predicate defect.**
"Is bookable in EXACTLY one of the 16 rows" stayed **GREEN through the RED**. It filters the table's own declared `expected` column, never the value `deriveBookable` returns — a self-consistency check on the table. Kept (it stops a future editor hand-adding a second true row) but labelled in the header so it is never misread as coverage.

**3. M1 reddened a fifth case the plan did not predict.**
Deleting `listing.hasOperatingHours &&` also broke the parity/drift guard: `expected Set{ 'gate_pub' } to deeply equal Set{ 'gate_pub', 'gate_nohours' }` — SQL stayed strict while the mutated predicate went permissive. Combined with M2 (the mirror image), the guard is now measured in **both** directions. That is a stronger result than planned, and it is what justifies retiring the byte-unchanged `git diff` gate.

## Mutation results — all three run, all observed, all reverted

| # | Mutation | Predicted | Observed |
|---|---|---|---|
| M1 | `bookability.ts` — delete `listing.hasOperatingHours &&` | 4 RED | **5 RED.** Both refusal anchors reddened from one deletion (finding condition **satisfied**), plus the 2 truth-table rows, plus the unpredicted parity guard |
| M2 | `search/query.ts` — re-wrap the new EXISTS as `${picked ? … : sql``}` | 2 RED | **2 RED, exact match.** The `gate_nohours` exclusion and the parity set-equality |
| M3 | `availability-calendar.tsx` — `disabled={!bookable}` → `disabled={false}` | 1 RED | **1 RED, exact match.** Case (1) red, case (2) GREEN throughout |

**The M1 finding condition is the important one.** Both `L_nohours` (exclusive) and `L_OPEN_NOHOURS` (open capacity) went red from a *single* deletion in `bookability.ts`, which proves `placeOpenHold`'s re-stated clause is wired to the shared predicate rather than refusing for some unrelated reason of its own. Had only one reddened, that would have been a defect to fix and re-measure. It was not.

M3's received value is worth reading: `2026-08-15T02:00:00.000Z|2026-08-15T03:00:00.000Z|false` — a booker on a listing that cannot be sold had a complete 10:00–11:00 AM selection lifted into the shared booking context.

## The duplication stayed duplicated

`placeHold` and `placeOpenHold` were **not** DRY'd into a shared helper. `booking.ts:351-354` records why the re-statement is deliberate, and `grep -c 'EXISTS (SELECT 1 FROM operating_hours' src/app/actions/booking.ts` == **2**. An untested duplicate of a security check is worse than no duplicate because it reads as covered — so each copy carries its own independently-written RED anchor, and M1 is what proves they share one predicate.

## Documents corrected in the same change

Every claim this change made false was fixed alongside it, rather than left to rot:
- `hours-signal.ts`'s header — "SIGNAL, DELIBERATELY NOT A GATE" and "`deriveBookable` stays BYTE-UNCHANGED" both became false. Replaced with the signal/gate division of labour: **the gate stops the sale, the signal tells the host why and how to fix it.**
- `listing-card.tsx`'s `hoursMissing` JSDoc — the "still reads Live" claim. The card's own behaviour is unchanged, and the new text says so explicitly so the next reader does not hunt for a diff that is not there.
- `tests/listing/hours-signal.test.ts:5` — the one-line version of the same claim.
- `tests/listing/listing-card.test.tsx` case (7) — rendered `bookable hoursMissing` and asserted "Live", a combination now **unreachable in production**. Re-pointed at `bookable={false}` → `Published · not bookable`, so it tests a state the app can actually produce.

The three `HOURS_MISSING_*` copy constants are **byte-unchanged** — the signal's sentence ("every date on this listing shows as closed and no one can book it") became *literally* true rather than merely descriptive.

## Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | exit **0** |
| `npx vitest run` | **1178 passed / 4 skipped / 0 failed** (baseline 1163 + exactly the 15 added; no pre-existing test moved) |
| `npx eslint` on 7 touched source files + the new test | **0 errors, 0 warnings** |
| `grep -v '^\s*--' src/lib/search/query.ts \| grep -c 'operating_hours oh_any'` | **1** |
| `grep -c 'EXISTS (SELECT 1 FROM operating_hours' src/app/actions/booking.ts` | **2** |
| `grep -rn 'hasOperatingHours: true' src/ \| grep -c ''` | **0** |
| last migration | `drizzle/0024_audit_table.sql` — no migration added |
| `git diff --exit-code src/lib/validation/listing.ts src/app/actions/listing.ts` | clean — publishing byte-unchanged |
| `git diff --exit-code src/` after every revert | clean |

Test count delta: bookability +9 (8→16 rows, +1 revert case), bookable-gate +2, state-machine +1, open-capacity-hold +1, availability-calendar +2 = **15**.

Known pre-existing condition, unrelated and out of scope: the suite's leaked-writes reporter still names 2 `public.audit` rows (`guest-email`, `notify`). That is the contained behaviour quick task `260810-km4` shipped deliberately, not a regression from this work.

## Success criteria

- [x] `deriveBookable` takes four terms, is still pure, and the 16-row truth table has exactly one true row
- [x] The SQL twin carries the same four terms, hours EXISTS **unconditional**, the per-day `picked` EXISTS untouched beside it
- [x] A published, verified, payout-activated listing with zero hours is absent from a **no-date** browse search, proven against a real database
- [x] `placeHold` refuses it with `not-bookable`, minting no booking row
- [x] `placeOpenHold` refuses the `open_capacity` equivalent with `not-bookable` (never `invalid`), minting no row — proven by its OWN case, reddened by the same M1 deletion
- [x] The two gate blocks remain separate by re-statement; no shared helper introduced
- [x] The booker still gets a read-only availability preview — proven in vitest, not only in Playwright
- [x] Deleting the last hours row un-sells the listing, and the iu7 host signal names it
- [x] Draft and unlisted are unaffected; the host grid's reuse of the iu7 `Set` is pinned by truth-table rows
- [x] The TS predicate and its SQL twin cannot drift without a test failing — proven in both directions by M1 and M2
- [x] No schema change, no migration, no new dependency, `publishListing` byte-unchanged
- [x] Every document this change made false is corrected in the same change

## Commits

| Hash | Message |
|---|---|
| `d22a8fd` | `test(quick-260810-sti)`: five RED anchors, recorded verbatim |
| `8fec4df` | `feat(quick-260810-sti)`: operating hours become the fourth bookability term |
| `ca36235` | `test(quick-260810-sti)`: read-only-preview proof + three mutations, all observed |

## Known Stubs

None.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or trust-boundary schema change was introduced. `listingHasOperatingHours` is a non-owner-scoped read and is dispositioned `accept` in the plan's register (T-STI-04): it answers only "does this listing have a calendar", already public to any booker, and is called only with an id the page has already resolved and 404-gated.

## Self-Check: PASSED

All 12 named files exist on disk; all 3 commit hashes resolve in `git log`; `hours-signal.ts` carries all 5 required exports.
