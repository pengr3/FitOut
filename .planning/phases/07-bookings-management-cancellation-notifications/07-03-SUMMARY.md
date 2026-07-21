---
phase: 07-bookings-management-cancellation-notifications
plan: 03
subsystem: payments-pure-money-modules
tags: [cancellation, refund-ladder, service-fee, paymongo, pure-function, tdd]
requires:
  - SERVICE_FEE_BPS
  - cancellationPolicy
provides:
  - computeServiceFee
  - ServiceFee
  - LADDER
  - quoteRefund
  - rungBoundaries
  - tierOrDefault
  - CancellationTier
  - Rung
  - RefundQuote
  - isApiRefundable
  - REFUNDABLE_RAILS
affects:
  - src/app/api/paymongo/webhook/route.ts
tech-stack:
  added: []
  patterns:
    - "Pure isomorphic money module: header states the decision + the isomorphic constraint, one rounding, throw-don't-freeze guards (commission.ts shape)"
    - "Single defined rounding + remainder by subtraction, proven by a swept property test"
    - "Clock passed in as a required parameter; the module never reads one"
    - "Single-branch-point predicate module for a contingent premise (delete-if-refuted seam)"
key-files:
  created:
    - src/lib/payments/service-fee.ts
    - src/lib/payments/refund-rail.ts
    - src/lib/payments/cancellation.ts
    - tests/payments/service-fee.test.ts
    - tests/payments/cancellation.test.ts
  modified:
    - src/app/api/paymongo/webhook/route.ts
decisions:
  - "Rail-predicate tests live in service-fee.test.ts, not a third test file, to respect the plan's files_modified list"
  - "Guards extended to serviceFeeCents (plan specified guards on both, interfaces showed only spacePriceCents)"
  - "The DB-clock comment avoids the literal Date.now() string so the zero-clock-read grep is a real guard"
metrics:
  duration: ~12m
  completed: 2026-07-21
  tasks: 2
  commits: 4
---

# Phase 7 Plan 03: Pure Money Modules Summary

The three pure, deterministic, zero-I/O modules Phase 7's refund correctness rests on: the D-68 refund ladder (`quoteRefund`), the D-74/D-76 booker-facing service fee (`computeServiceFee`), and the single rail-refundability predicate (`isApiRefundable`) that isolates the contingent QRPh premise to one file.

## What Was Built

**Task 1 — `service-fee.ts` + `refund-rail.ts`** (`87ea79e` RED, `098866d` GREEN).

`computeServiceFee(spacePriceCents, feeBps = SERVICE_FEE_BPS)` returns `{ feeBps, serviceFeeCents, allInCents }`. It is a structural clone of `computeCommission`: the same header shape (decision citation + the mandatory isomorphic note), the same two guard clauses, the same single defined rounding rule, and `allInCents` derived by **addition** rather than a second rounding — so the D-75 all-in browse number is byte-identical to the sum of the two D-78 breakdown lines. The header records the load-bearing composition rule: `quoteWindow` keeps returning the SPACE price and must not learn about platform fees; the fee is composed at the caller, which preserves the Phase-4 pure-pricing seam and leaves its tests valid.

`refund-rail.ts` exports `REFUNDABLE_RAILS` and `isApiRefundable`, carrying the "delete the entire D-72 workstream if the Plan-16 probe refutes this" note. The predicate **fails closed**: an absent or unrecognised rail is treated as non-refundable, so an unknown payment method routes to the operator-alert path rather than to a `createRefund` call that would 4xx and leave a booker's money in limbo. The inline `REFUNDABLE_RAILS` set at `webhook/route.ts:42` was deleted and the call site switched to `isApiRefundable(method)` — behaviour unchanged, and only one Set literal now exists in `src/`.

**Task 2 — `cancellation.ts`** (`a900a09` RED, `1617ec1` GREEN).

`LADDER` encodes D-68 as descending rungs per tier; `quoteRefund` takes the first rung whose `minHours` is satisfied (boundary inclusive), rounds the space refund **once**, and derives `retainedSpaceCents` by **subtraction**. `serviceFeeRefundCents` is explicitly `0` rather than omitted, so the D-78 breakdown can render the ₱0 line and its helper unconditionally — including on a 100% refund, which the header notes is the one place a booker could be surprised. `rungBoundaries` returns raw instants for D-81's concrete-date disclosure and performs no formatting. `tierOrDefault` handles pre-Phase-7 NULL tiers with a documented Flexible fallback.

The module reads no clock at all. `now` is a required parameter, documented as always the Postgres `now()` value, with the reason stated inline: rung boundaries are sharp, and a preview RSC and a cancel action straddling one on two different clocks would show a booker one number and give them another.

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Rail-predicate test placement | Inside `tests/payments/service-fee.test.ts` | Task 1's `<behavior>` specifies `isApiRefundable` cases but the plan frontmatter's `files_modified` lists no `refund-rail.test.ts`. Adding a third test file would have exceeded the declared surface; the assertions all exist, in their own `describe` block. |
| `serviceFeeCents` guard | Added (throws on negative/non-integer) | The plan's `<action>` says "throw on non-integer / negative `spacePriceCents` **and** `serviceFeeCents`"; the `<interfaces>` block and the 07-RESEARCH reference implementation guard only the price. The action text is the stricter and more recent instruction, and an unguarded money parameter in a module whose output is POSTed to PayMongo is exactly what the money-guard idiom exists to prevent. |
| DST safety | Absolute-instant epoch arithmetic, asserted by a test spanning a DST transition | `getTime()` differencing is DST-safe by construction; the test pins that so a future "improvement" to wall-clock date math can't silently award the wrong rung. |
| Property-test breadth | Every tier × every rung boundary (−0.1 / exact / +1) × the 11-value price sweep | The plan asked for tier × price; adding the rung dimension means the sum identity is proven at 0%, 50% and 100% rather than only where the sweep happened to land. |

## Deviations from Plan

No functional deviations. Two plan-text inconsistencies were resolved and are recorded below; neither changed behaviour, and no deviation rule (1–4) was triggered.

### Plan-Text Inconsistencies (resolved, no code impact)

**1. The `"use client"/"use server"` acceptance grep is unsatisfiable as written.**
Task 1 criterion: `grep -c "use client\|use server" src/lib/payments/service-fee.ts src/lib/payments/refund-rail.ts` returns 0 for both. Task 2 has the same criterion for `cancellation.ts`. But the same task's `<action>` **mandates** the isomorphic note — `Pure/isomorphic: no "use client"/"use server" directive, so …` — which contains those exact strings in a comment. The mandated exemplar, `commission.ts`, returns **1** for this identical grep.

Resolution: the `<action>` text wins (it is explicit and it matches the template file the plan says to copy). The substantive property was verified directly instead:

```
grep -cE '^\s*"use (client|server)"' src/lib/payments/{service-fee,refund-rail,cancellation}.ts  →  0, 0, 0
```

No module carries a directive, so all three are genuinely isomorphic and RSC-callable.

**2. The zero-clock-read grep conflicts with the comment the plan dictates.**
Task 2 criterion: `grep -c "Date.now()" src/lib/payments/cancellation.ts` returns 0. The same task's `<action>` dictates a comment on the `now` parameter reading `"…never Date.now() at a call site"` — which would make that grep return 1.

Resolution: the criterion wins here, because it is the one that is actually load-bearing. The comment is phrased *"never a JS-side clock read at a call site"*, preserving the meaning exactly while keeping the grep a **real** guard — it now fails the moment anyone adds an actual clock read, which is the property T-07-13 depends on. Verified: `grep -c "Date.now()" → 0`.

The same substitution was **not** applied to criterion 1, because there the conflicting text is required content rather than an incidental phrasing.

## Acceptance Criteria

| Criterion | Expected | Actual |
|---|---|---|
| `grep -c "Math.round" service-fee.ts` | 1 | **1** |
| `grep -c "Math.round((spacePriceCents \* feeBps) / 10000)"` | 1 | **1** |
| `grep -c "SERVICE_FEE_BPS" service-fee.ts` | >= 1 | **3** |
| `grep -c "500" service-fee.ts` (no hardcoded fee value) | 0 | **0** |
| One rail Set literal in `src/` | 1 file | **1** (`refund-rail.ts`) |
| `grep -c "D-72" refund-rail.ts` | >= 1 | **1** |
| `grep -c "Math.round" cancellation.ts` | 1 | **1** |
| `grep -c "spacePriceCents - spaceRefundCents"` | 1 | **1** |
| `grep -c "serviceFeeRefundCents: 0"` | 1 | **1** |
| `grep -c "Date.now()" cancellation.ts` | 0 | **0** |
| `grep -cE "minHours: 12\|24\|6\|48"` | 5 | **5** (both by line and by occurrence) |
| Actual `"use client"/"use server"` directive lines | 0 | **0** (all three modules) |
| `service-fee.test.ts` assertion count | >= 10 | **17 tests** |
| `cancellation.test.ts` assertion count | >= 30 | **34 tests** |
| `cancellation.ts` line count | >= 80 | **141** |
| Property assertion present in test file | yes | **yes** (2 occurrences) |

## Verification Performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` (all five new/modified files) | exit 0, clean |
| `npx vitest run tests/payments/service-fee.test.ts` | **17 passed** |
| `npx vitest run tests/payments/cancellation.test.ts` | **34 passed** |
| `npx vitest run tests/payments` (incl. untouched `commission.test.ts`) | **9 files / 96 tests, exit 0** |
| `npx vitest run tests/paymongo` (webhook regression gate) | **5 files / 37 tests, exit 0** |
| **`npm test` (full suite)** | **61 files / 452 tests, all passing, exit 0** |

The full suite was run to completion and every test passed. Wave 1 left the tree at 59 files / 401 tests; this plan adds 2 files / 51 tests and changes no existing assertion. The `tests/auth/secret-config.test.ts` flakiness noted in 07-01 did **not** recur.

## TDD Gate Compliance

Plan type is `tdd`. Both features followed a full RED → GREEN cycle with the gates as separate commits, in order:

| Gate | Task 1 | Task 2 |
|---|---|---|
| RED (`test(...)`, verified failing) | `87ea79e` | `a900a09` |
| GREEN (`feat(...)`, verified passing) | `098866d` | `1617ec1` |
| REFACTOR | not needed | not needed |

Each RED commit was made only after running the test and confirming it failed (both failed on the unresolvable module import — the correct RED for a module that does not yet exist). No test passed unexpectedly during a RED phase. REFACTOR was skipped in both cases because the GREEN implementations were already in the target shape (cloned from `commission.ts`); an empty refactor commit would have been noise.

## Threat Register Status

| Threat ID | Disposition | How this plan discharges it |
|---|---|---|
| T-07-11 | mitigate | `quoteRefund` takes amounts and tier as parameters, documented in the function doc comment as MUST-come-from-the-frozen-`booking`-row, with "the client sends a booking id and nothing else" stated explicitly. Enforcement is at the Plan 09/11 call sites. |
| T-07-12 | mitigate | The `tier` parameter and the `RefundQuote.tier` field are both commented as "the booking-row SNAPSHOT, never the listing's current tier". `tierOrDefault` handles NULL only. Plan 09 owns the retiering integration test. |
| T-07-13 | mitigate | `now` is required; `grep -c "Date.now()"` returns 0 and the grep is a genuine guard (see Plan-Text Inconsistency 2). A test asserts purity — same inputs, same output. |
| T-07-14 | mitigate | Exactly one `Math.round` per module (asserted by grep); remainder by subtraction. The property test sweeps 11 prices × 3 tiers × every rung boundary and asserts the exact identity. |
| T-07-15 | accept | `refund-rail.ts` contains only public payment-method identifiers. No secrets. |

## Known Stubs

None. All three modules are complete pure functions with no placeholder values, no TODOs, and no unwired data paths. They have no consumers yet by design — Plans 08, 09, 11 and 15 are the callers.

## Threat Flags

None. These modules introduce no network endpoint, no auth path, no file access and no schema change. The one file touched outside the new set (`webhook/route.ts`) had a local constant replaced by an import of an identical set; its trust boundary and behaviour are unchanged.

## For Downstream Plans

- **Plan 08 (hold creation):** compose the fee at the caller. `quoteWindow` still returns the SPACE price only — do not push the fee into it. Write `spacePriceCents` and `serviceFeeCents` to the booking row from `computeServiceFee`'s output; `allInCents` is what PayMongo charges.
- **Plans 09 / 11 (cancel action + preview RSC):** both MUST source `now` from Postgres `now()` in the same statement family, and both MUST read `tier` from `booking.cancellation_policy` (via `tierOrDefault`), never from the listing. Passing a JS clock compiles fine and is the failure mode T-07-13 describes.
- **Plan 04 (payout sweep):** `retainedSpaceCents` is the post-cancellation payout gross (D-69). The sweep still freezes commission off `quoted_total_cents` — that is 07-04's outstanding work, and note that under D-74 `quoted_total_cents` now includes the service fee, so using it as the payout basis would pay the host commission on platform revenue.
- **Plan 16 (QRPh probe):** if the probe refutes D-58, `src/lib/payments/refund-rail.ts` is the **only** file that changes. Nothing else in the codebase answers the rail question.
- **Anyone adding a rail:** add it to `REFUNDABLE_RAILS`, not to a new set. The one-Set-literal property is an acceptance criterion of this plan and is worth keeping enforceable.

## Commits

| Hash | Message |
|---|---|
| `87ea79e` | test(07-03): add failing tests for computeServiceFee + isApiRefundable |
| `098866d` | feat(07-03): add computeServiceFee and the sole rail-refundability predicate |
| `a900a09` | test(07-03): add failing tests for the D-68 refund ladder |
| `1617ec1` | feat(07-03): implement the D-68 refund ladder |

## Self-Check: PASSED

All five claimed files verified present on disk (`src/lib/payments/service-fee.ts`, `src/lib/payments/refund-rail.ts`, `src/lib/payments/cancellation.ts`, `tests/payments/service-fee.test.ts`, `tests/payments/cancellation.test.ts`) and all four commit hashes verified in `git log`.
