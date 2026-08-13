---
phase: 11-quality-gates-pattern-layer-app-shell
plan: 01
subsystem: quality-gates
tags: [gate-05, server-only, client-server-boundary, money, turbopack, design-gate]
requires:
  - "next@16.2.7 Turbopack (aliases the `server-only` specifier; declares it at node_modules/next/types/global.d.ts:57)"
  - "vitest.design.config.ts (the DB-free gate home, 10-17)"
  - "tests/use-server-exports.test.ts (the OBSERVED RED + AST-over-grep conventions)"
provides:
  - "GATE-05's build-side half: `npm run build` hard-fails on any client graph reaching a guarded money or availability module"
  - "src/lib/payments/fees.ts — the three guarded money rates, split out of config.ts"
  - "src/lib/availability/horizon.ts — BOOKING_HORIZON_DAYS + ALL_IN_TABLE_MAX_HOURS, client-safe"
  - "src/lib/listing/card-price.ts — the host tile's price line, composed server-side"
  - "src/lib/booking/all-in-table.ts — buildAllInTable(), the booking rail's server-computed price table"
  - "tests/design/server-only-guards.test.ts — the AST guard-presence gate (7 assertions, runs inside `npm run build`)"
  - "tests/helpers/server-only.stub.ts — the Vitest resolve-alias target both configs point at"
affects:
  - "Every future client component touching money or availability: the build now refuses the import rather than shipping the constant"
  - "ListingCard's props contract (five rate columns removed from ListingCardData; `priceParts: string[]` added)"
  - "RailSelectionSummary / RailPassSummary props (`serviceFeeBps` + rate columns → one `allIn` table)"
tech-stack:
  added: []
  patterns:
    - "`import \"server-only\"` as the transitive client/server boundary enforcer (D-34) — no import-graph walker to maintain"
    - "Split-then-guard: a computation module that also houses a client-needed constant is SPLIT, not guarded whole"
    - "Pre-formatted money strings across the boundary (Shared Pattern 9) — extended to a server-computed lookup table for per-selection figures"
    - "AST over grep (Shared Pattern 2) — mandatory here: every `server-only` grep hit at HEAD was a comment"
key-files:
  created:
    - src/lib/payments/fees.ts
    - src/lib/availability/horizon.ts
    - src/lib/listing/card-price.ts
    - src/lib/booking/all-in-table.ts
    - tests/helpers/server-only.stub.ts
    - tests/design/server-only-guards.test.ts
    - tests/booking/all-in-table.test.ts
  modified:
    - src/lib/payments/config.ts
    - src/lib/payments/service-fee.ts
    - src/lib/payments/commission.ts
    - src/lib/booking/all-in-rate.ts
    - src/lib/booking/pricing.ts
    - src/lib/availability/slots.ts
    - src/lib/availability/read-model.ts
    - src/lib/availability/units.ts
    - src/components/listing/listing-card.tsx
    - src/components/availability/availability-calendar.tsx
    - src/components/availability/date-pass-picker.tsx
    - src/app/(host)/host/listings/page.tsx
    - src/app/listings/[id]/page.tsx
    - src/app/actions/cancel-booking.ts
    - vitest.config.ts
    - vitest.design.config.ts
    - tests/listing/listing-card.test.tsx
decisions:
  - "The rail receives a server-computed all-in TABLE, not a unit rate — a client-side multiply rounds n times where checkout rounds once (RESEARCH Open Question 3, now measured and asserted)"
  - "commission.ts extends D-34's named list by one: a money computation with zero client importers, so guarding it is free"
  - "config.ts and horizon.ts stay UNGUARDED, and that is asserted as a negative row — guarding them fails the build naming files that are not violations"
  - "ListingCardData loses its five rate columns entirely rather than keeping them unused — the inputs are structurally absent from the client"
requirements: [GATE-05]
metrics:
  duration: ~55 min
  tasks: 3 (+2 deviation commits)
  files_changed: 24
  completed: 2026-08-13
---

# Phase 11 Plan 01: GATE-05 — the server-only boundary Summary

`import "server-only"` on eight money/availability computation modules makes Turbopack hard-fail
`next build` on any client import graph that reaches them; both live D-130 violations are fixed and
`SERVICE_FEE_BPS` is provably absent from every emitted client chunk (5 → 0).

## What Was Built

**The deny-list, split twice and guarded.** `import "server-only"` is now the first statement of
`payments/fees.ts`, `payments/service-fee.ts`, `payments/commission.ts`, `booking/all-in-rate.ts`,
`booking/pricing.ts`, `availability/slots.ts`, `availability/read-model.ts` and `availability/units.ts`.
Two splits made that possible without false positives: the three money rates moved out of
`payments/config.ts` into a new guarded `payments/fees.ts` (leaving the 14 timing constants
`slot-picker.tsx` and `request-row.tsx` legitimately import), and `BOOKING_HORIZON_DAYS` moved out of
`availability/slots.ts` into a new unguarded `availability/horizon.ts` (leaving
`availability-calendar.tsx` and `date-pass-picker.tsx` compiling). **Zero packages installed** — Next
aliases the specifier itself; `git diff --stat package.json` is empty.

**Both violations fixed, by two different shapes.** `listing-card.tsx` lost its `allInRateParts` call and
now receives `priceParts: string[]`, composed server-side by a new `src/lib/listing/card-price.ts` that
the host grid calls. `availability-calendar.tsx`'s two rail summaries lost `serviceFeeBps` (and the rate
columns, and `perHeadPriceCents`) in favour of one `allIn` table of finished centavos, built by
`buildAllInTable()` in the RSC.

**The gate.** `tests/design/server-only-guards.test.ts` — 7 assertions, DB-free, running inside
`npm run build` — asserts by `ts.createSourceFile` that all eight guards are present, that the two splits
are *absent*, and that the two transitively-guarded modules still reach the deny-list. Grep is banned here
for a measured reason: at HEAD, `grep -rn "server-only" src/` returned 6 hits across 5 files and **every
one was a comment**, so a grep guard would pass on prose and keep passing after every guard was deleted.

## The Headline Finding: the build is a lower bound, not a list

The plan's `must_haves` expected one failing build naming `listing-card.tsx` **and**
`availability-calendar.tsx`. It does not exist. **Turbopack prints one import trace per (module,
environment)** — the first it resolves — so a second client component reaching the *same* guarded module is
invisible until the first is fixed.

RED #1 (6 errors) named `listing-card.tsx` in every one of its client traces and never mentioned
`availability-calendar.tsx`, whose guard was already in place and whose `computeServiceFee` import was
untouched. Only after `listing-card.tsx` was repaired did RED #2 (4 errors) name the second violation.

This matters beyond this plan: **adopting `server-only` on a tree with more than one offender is a
fix-and-rebuild loop, and a plan that reads run #1 as the complete violation list ships the rest.** What
closes it is the emitted-bundle grep — a count over the whole output rather than a first-match trace —
which is why `SERVICE_FEE_BPS??500` appearing in 5 chunks at HEAD and 0 after both fixes is the load-bearing
evidence, not the build's own diagnostic. Both REDs are committed verbatim in the gate's header, along with
the sentence naming what did **not** fail.

**What did not fail, in both runs:** `slot-picker.tsx` and `request-row.tsx` are absent from every
diagnostic, and no diagnostic mentions `slots.ts`, `read-model.ts` or `units.ts` at all. Eight modules were
guarded and only the three on the real violation path complained — that is what makes the two splits
correct rather than lucky.

## The Props-Contract Decision (RESEARCH Open Question 3)

A **table**, not a unit rate. Both shapes keep `SERVICE_FEE_BPS` out of the bundle, so neither the leak
grep nor the build can tell them apart — the tiebreaker is rounding. `computeServiceFee` rounds **once**,
over the whole space price, so `n × allIn(unit) ≠ allIn(n × unit)`. Measured at the seeded ₱307.50 rate the
multiply runs **ahead** of the frozen quote, bounded by n−1 centavos — D-75's forbidden direction ("the
number goes up between browsing and paying"). Both rail call sites state in their own comments that their
figure is *exact*; a multiply would have made those sentences false while every gate stayed green.

That argument is now executable (`tests/booking/all-in-table.test.ts` case 2) rather than a paragraph.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The importer list missed `listings/[id]/page.tsx:29`**
- **Found during:** Task 1
- **Issue:** The plan lists four source importers of the three moved constants; a fifth existed. `tsc` failed
  with `TS2305: Module '"@/lib/payments/config"' has no exported member 'SERVICE_FEE_BPS'`, which would have
  polluted the OBSERVED RED with a dangling-import error instead of a boundary diagnostic.
- **Fix:** Repointed to `@/lib/payments/fees` (Task 2 then deleted it entirely).
- **Commit:** e1f9a4b

**2. [Rule 3 - Blocking] `slots.ts` re-exports `BOOKING_HORIZON_DAYS`**
- **Found during:** Task 1
- **Issue:** The plan says `slots.ts` "re-imports it for its own use", but `tests/helpers/dates.ts:28`,
  `tests/availability/slots.test.ts:15` and `src/lib/availability/units.ts:58` all import the name *from
  slots*. A plain re-import would have broken three shipped files not in the plan's scope.
- **Fix:** `slots.ts` re-exports the name. Client importers must use `horizon.ts` because the re-export sits
  behind the guard — which is the property that matters.
- **Commit:** e1f9a4b

**3. [Rule 2 - Missing critical] The 09-14 mode-fork contract would have shipped untested**
- **Found during:** Task 2
- **Issue:** The plan composes the card's price line inline in `host/listings/page.tsx`. That page has no
  test, and `tests/listing/listing-card.test.tsx` cases (3) and (4) — which pin that a drop-in listing prices
  per person *keyed on the persisted mode, never on a null rate column* (09-07's lesson) — would have had
  nowhere to live.
- **Fix:** Extracted `listingCardPriceParts()` into `src/lib/listing/card-price.ts`. Cases (3)/(4) now assert
  the helper; new cases (3b)/(4b)/(4c) assert the card renders what it is handed, including `tabular-nums`.
- **Commit:** 8f9e962

**4. [Rule 2 - Missing critical] T-11-PRICEDRIFT's mitigation was asserted only in prose**
- **Found during:** post-Task-2 review
- **Issue:** The threat register dispositions T-11-PRICEDRIFT as `mitigate`, and the mitigation *is* the
  table-vs-unit-rate choice. Built inline in the page it was untestable, and the rail summaries have no
  render test (they had none before this plan either).
- **Fix:** Extracted `buildAllInTable()` into `src/lib/booking/all-in-table.ts` + 6 test cases, including the
  drift measurement that justifies the decision and a D-45 distinct-pricing pin.
- **Commit:** b5ee80c

**5. [Rule 2 - Missing critical] Two new modules were server-only only by transitivity, silently**
- **Found during:** post-Task-3 review
- **Issue:** `card-price.ts` and `all-in-table.ts` carry no guard of their own by design (D-34: the guard
  belongs on the computation). But transitivity is a property of the *current* imports — inline the formula
  and the module keeps its money job while becoming client-importable, **and Turbopack goes quiet** because
  nothing guarded is reached any more.
- **Fix:** A seventh assertion asserting the import itself, with an anti-vacuity check that the target is
  really on the deny-list. Watched red by replacing `all-in-table.ts`'s import with a local inline copy.
- **Commit:** 81cd0b9

**6. [Rule 1 - Bug] Three comments made false by the fix**
- **Found during:** Tasks 2-3
- **Issue:** Shared Pattern 10 — a false header comment is a defect. `date-pass-picker.tsx:35` said the rail
  "composes that with the server-threaded fee rate"; `booking/pricing.ts:5` said the client
  "computes the SAME figure"; `pricing.ts:105` said `windowHours` was "byte-identical to the client
  RailSelectionSummary formula". None survived the fix.
- **Fix:** All three rewritten to describe what is now true.
- **Commits:** 8f9e962, fcc41f3

### Deliberate Non-Compliance

**The card's empty-array fallback stays `"No pricing yet"`.** The plan says to keep "the existing
`"Price on request"` fallback" — but that is `search-result-card.tsx`'s booker-facing copy. The shipped host
tile says `"No pricing yet"`, which is management-surface copy, and changing it is an unrequested
behavioural change this plan has no business making.

**The OBSERVED RED does not claim a clean `git status -- src/`.** The convention (from
`use-server-exports.test.ts`) asks for one, because there the guard *was* the test and could be run before
touching `src/`. Here the guard *is* a source change, so a clean tree is impossible. The header records the
HEAD sha and the exact file set instead of asserting a cleanliness that was not true.

## Verification

| Check | Result |
|---|---|
| `npm run build` | exit 0 |
| Leaky client chunks (`SERVICE_FEE_BPS??500`) | **5 at HEAD → 0** |
| `npm run test:design` | 23 files / 465 tests (was 22 / 458 — file count +1 as specified) |
| `npm test` | 134 passed, 1 skipped / 1216 passed, 4 skipped (pre-plan 1207; +3 card, +6 table) |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | 0 errors, 9 warnings — byte-identical to baseline |
| `git diff --stat package.json` | empty (zero packages) |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (GATE-06 intact) |
| Forbidden identifiers in the two components | **0 by AST** (all remaining textual hits are prose) |

The final check is worth naming: `grep` still finds `computeServiceFee` 4× and `allInRateParts` 2× in those
files, and `serviceFeeBps` twice. Parsed, `availability-calendar.tsx` and `listing-card.tsx` contain **zero
identifier nodes** named `computeServiceFee`, `allInRateParts`, `serviceFeeBps`, `hourlyRateCents`,
`dayRateCents` or `perHeadPriceCents`. This repo's twelfth grep-versus-comment collision, avoided by the
same means the gate itself uses.

## Not Done / Deferred

- **`npm run test:e2e` was not run.** The plan's verification block does not ask for it, and the affected
  surfaces (`/listings/[id]`, `/host/listings`) are covered by the 80 DB-suite files that do pass. STATE.md
  records a standing pre-existing e2e failure (D-6 item 1) that a run here would only reproduce a sixth time.
  Flagged rather than silently skipped: the listing page's rail props changed materially, so an e2e pass on
  `public-listing.spec.ts` before the phase closes would be cheap insurance.
- **The rail summaries still have no render test.** They had none before this plan. `all-in-table.test.ts`
  pins the contract they consume; that the components look up the right key is unasserted, and is recorded in
  that file's NOT COVERED footer.
- **`GUARDED_MODULES` is a floor, not a derivation.** A ninth money module added tomorrow is unguarded and
  unnoticed by the gate. Recorded in the NOT COVERED footer.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change; the surface moved strictly
*away* from the client.

## Self-Check: PASSED

All 7 created files present on disk; all 5 commits present in `git log`.
