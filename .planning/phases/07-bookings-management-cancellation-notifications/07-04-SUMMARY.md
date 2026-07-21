---
phase: 07-bookings-management-cancellation-notifications
plan: 04
subsystem: payout-correctness
tags: [payout, sweep, reconcile, netting, commission, service-fee, ledger-kind]
requires:
  - hostPayoutLedger.kind
  - hostPayoutLedger.recoveredCents
  - host_payout_ledger_booking_id_kind_unique
  - booking.spacePriceCents
  - booking.serviceFeeCents
  - booking.retainedSpaceCents
  - HOST_CANCEL_FEE_CENTS
provides:
  - DuePayout.payoutGrossCents
  - PayOneResult.settled-by-netting
  - PayOneResult.skipped-no-basis
  - payOne debit netting (D-71)
  - kind-scoped ledger queries (grep-complete)
  - /host/earnings outstanding-debt line
affects:
  - src/inngest/functions/payout-sweep.ts
  - src/inngest/functions/payout-reconcile.ts
  - src/app/api/paymongo/webhook/route.ts
  - src/app/(host)/host/earnings/page.tsx
tech-stack:
  added: []
  patterns:
    - "Data-modifying CTE chain so a multi-row recovery + its memo commit in ONE statement"
    - "Memoised deduction on the claim row so a WR-04 retry re-derives nothing"
    - "Grep tripwire in a header comment naming a column that must never appear in the file"
    - "Fail-closed guard on a nullable money basis (alert + skip, never a fallback)"
key-files:
  created: []
  modified:
    - src/inngest/functions/payout-sweep.ts
    - src/inngest/functions/payout-reconcile.ts
    - src/app/(host)/host/earnings/page.tsx
    - src/app/api/paymongo/webhook/route.ts
    - src/components/host/payout-row.tsx
    - tests/payments/payout-sweep.test.ts
    - tests/payments/payout-reconcile.test.ts
    - tests/payments/earnings-view.test.ts
    - tests/payments/ledger-freeze.test.ts
decisions:
  - "Netting moved AFTER the wallet lookup, not before: the no-wallet path DELETEs the claim, which would have permanently forgiven any recovery already applied"
  - "The applied deduction is memoised on the payout row's recovered_cents so a WR-04 retry reuses it instead of re-deriving a smaller outstanding"
  - "A null payout basis fails CLOSED (alert + skip); no fallback to the all-in charged total, ever"
  - "kind scoping extended to the PayMongo refund webhook, which the plan's site list omitted"
metrics:
  duration: ~35m
  completed: 2026-07-21
  tasks: 3
  commits: 4
---

# Phase 7 Plan 04: Payout Sweep Correctness Summary

Closes the three-way collision between Phase 7's money model and the shipped payout machinery: the sweep now pays retained cancellations, grosses on the space price rather than the all-in charged total, nets D-71 cancellation debits with an arithmetically-clamped floor, and every ledger query in `src/` is scoped by `kind`.

## What Was Built

**Task 1 — widened predicate, space-price basis, grep-complete kind scoping** (`30a665a`, `2832bbd`).

`queryDuePayouts` now selects `b.status = 'confirmed' OR (b.status = 'cancelled' AND COALESCE(b.retained_space_cents, 0) > 0)`, and returns `COALESCE(b.retained_space_cents, b.space_price_cents) AS "payoutGrossCents"`. The `DuePayout.quotedTotalCents` field is gone entirely — the type now carries `payoutGrossCents: number | null`. `payOne` freezes commission off that value and writes it as `gross_cents`.

`AND kind = 'payout'` was added to every pre-existing ledger read and write: the sweep's LEFT JOIN, its post-claim release, its catch-block failure marker, its no-wallet rollback DELETE; the reconcile's `queryProcessingLedger`, both `reconcileOne` UPDATEs, and the stuck-`held` alert; the `/host/earnings` ledger SELECT; and the PayMongo refund webhook's two `hostPayoutLedger` queries.

`/host/earnings` gained a muted summary line reading `You have ₱X in cancellation fees still to be deducted.`, driven by a `SUM(-net_cents - recovered_cents)` over unrecovered `host_cancel_fee` rows.

**Task 2 — D-71 debit netting** (`2832bbd`). After the claim and the wallet correlation, `payOne` computes `outstanding` over the host's unrecovered debits, clamps `deduction = Math.min(outstanding, netCents)`, and applies it oldest-first via a window-function waterfall. `transferAmt === 0` short-circuits before any PayMongo call and settles the payout row `paid` with `transfer_id = NULL`, returning `{ status: "settled-by-netting", deductedCents }`.

**Task 3 — integration tests + the C8 rename** (`6f85e92`, `0f72d5c`). Eight new sweep cases, one reconcile regression case, two earnings cases. `FitOut service fee (10%)` → `FitOut commission (10%)` in `payout-row.tsx`, with the matching desktop header `Fee` → `Commission` and the page's prose.

## Both Inherited Hazards Are Closed

**Hazard 1 — ledger `kind` scoping.** Closed. Every site named in the hazard note (`queryDuePayouts`, `queryProcessingLedger`, the reconcile stuck-`held` query, `/host/earnings`, `summarizePayouts`) plus three the note did not name (the sweep's release/failure/rollback statements) and two the plan did not name (the refund webhook). Proven by a reconcile regression test that was **verified to fail** when the scope is removed.

`summarizePayouts` itself was deliberately **not** changed. It is a pure sum over rows it is handed; the row-kind decision belongs in the query that feeds it, and that query is now scoped. A test asserts `upcomingCents === 234000` with a `-30000` debit present — unscoped it would have been `204000`.

**Hazard 2 — `quoted_total_cents` as the payout basis.** Closed. The plan, D-69/D-74 in 07-CONTEXT, and the hazard note all agree, so there was no discrepancy to flag. `grep -c "quoted_total_cents\|quotedTotalCents" src/inngest/functions/payout-sweep.ts` returns **0** — the column name does not appear in the file at all, comments included, and a header comment documents that as a deliberate T-07-16 tripwire (spelling the name in two pieces so it does not trip on its own documentation).

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Netting position | AFTER the wallet lookup, not before it | See Deviation 1 — the plan's ordering had a money bug |
| Retry exactness | Memoise the applied deduction on the payout row | See Deviation 2 — the plan's stated mitigation is wrong in the retry direction |
| Null payout basis | Fail closed: alert + skip, no claim | `space_price_cents` is nullable and nothing writes it yet; a fallback to the charged total is exactly the leak Finding 2 exists to prevent |
| Recovery atomicity | One data-modifying CTE chain | The waterfall UPDATE and the memo UPDATE cannot be split without a partial-application window |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Netting moved after the wallet lookup — the plan's ordering permanently forgives debt**

- **Found during:** Task 2, while tracing `payOne`'s failure paths.
- **Issue:** The plan specifies netting "AFTER the ledger claim succeeds and BEFORE the wallet lookup / transfer". The no-wallet branch **DELETEs the claim** and returns `skipped-no-wallet` so a later sweep retries. With netting before it, `recovered_cents` on the debit rows would already have been incremented — and then the payout that was supposed to fund that recovery never happens and its claim disappears. The next sweep re-derives a *smaller* outstanding, so the host is paid more than they should be and the cancellation fee is partially written off. Silent, in the host's favour, with no error.
- **Fix:** Netting runs after the wallet is resolved and immediately before the transfer decision. The plan's actual load-bearing requirement — that netting happen *after the claim*, so two racing sweeps cannot both net — is preserved and is proven by the `makeRacingClients` test.
- **Files modified:** `src/inngest/functions/payout-sweep.ts`
- **Commit:** `2832bbd`

**2. [Rule 2 - Missing critical functionality] Memoised the applied deduction (T-07-20's stated mitigation does not hold)**

- **Found during:** Task 2, checking the WR-04 retry path against the threat register.
- **Issue:** T-07-20 claims "a crash between them cannot double-count because the debit's `recovered_cents < -net_cents` predicate re-derives the true outstanding on the next sweep". That is true for double-*counting* but wrong in the other direction. Trace: debit 30000, payout net 90000. Attempt 1 applies deduction 30000 → the debit is fully recovered and drops out of the predicate → the transfer then throws → the row is marked `failed`. Attempt 2 re-claims (WR-04) and re-derives `outstanding = 0` → `deduction = 0` → the host is transferred 90000 instead of 60000. **The fee is fully forgiven by a retry.**
- **Fix:** The claim's `RETURNING` now yields `recovered_cents` (0 on a fresh INSERT, the prior deduction on a `failed` re-claim). When non-zero it is reused verbatim rather than re-derived. The waterfall UPDATE and the memo UPDATE are a single data-modifying CTE chain, so they commit atomically.
- **Files modified:** `src/inngest/functions/payout-sweep.ts`
- **Commit:** `2832bbd`

**3. [Rule 2 - Missing critical functionality] Fail-closed guard on a null payout basis**

- **Found during:** Task 1, after `grep -rn "spacePriceCents" src/` returned only `schema.ts` and the pure modules.
- **Issue:** `booking.space_price_cents` is nullable. `drizzle/0014` backfilled every row that existed at migration time, but **no code path writes it yet** — that is a later Phase-7 plan's work. A booking created between now and then has a NULL basis, so `COALESCE(retained, space_price)` is NULL, `computeCommission(null)` throws, and the Inngest step fails on every retry.
- **Fix:** `payOne` guards `Number.isInteger(b.payoutGrossCents)` before claiming anything: `[payout-alert] booking has no frozen payout basis`, return `skipped-no-basis`, move no money, claim nothing, retry next sweep. A `COALESCE(..., quoted_total_cents)` fallback was **deliberately rejected** — it would work today (no service fee exists yet) but would silently mask exactly the Finding-2 leak if a future plan charges the all-in total without freezing the split.
- **New result variant:** `PayOneResult` gains `{ status: "skipped-no-basis" }`. This is additive to the plan's stated `<interfaces>` union; no listed variant changed shape.
- **Files modified:** `src/inngest/functions/payout-sweep.ts`, `tests/payments/payout-sweep.test.ts`
- **Commit:** `2832bbd`

**4. [Rule 2 - Missing critical functionality] Kind-scoped the PayMongo refund webhook — OUT OF `files_modified`**

- **Found during:** Task 1c, enumerating ledger queries.
- **Issue:** `src/app/api/paymongo/webhook/route.ts:handleRefund` flips `hostPayoutLedger` rows to `refunded` by `(payment_id, state='held')`, and separately checks for post-payout rows by `(payment_id, state IN (processing, paid))`. A `host_cancel_fee` debit is also inserted `held`; if the plan that writes it carries the booking's `payment_id`, a booker refund would flip the **host's outstanding cancellation debt** to `refunded`, silently forgiving it. The plan's site list omits this file, and its verification grep uses the snake-case `host_payout_ledger` which cannot match this file's camel-case Drizzle usage.
- **Fix:** `eq(hostPayoutLedger.kind, "payout")` added to both predicates.
- **Files modified:** `src/app/api/paymongo/webhook/route.ts`
- **Commit:** `30a665a`

**5. [Rule 3 - Blocking] Updated two tests broken by the `DuePayout` rename**

- **Issue:** `tests/payments/ledger-freeze.test.ts` and `tests/payments/payout-sweep.test.ts` construct `DuePayout` literals with `quotedTotalCents`, which no longer exists. `payout-sweep.test.ts`'s `makeBooking` also had to start writing `space_price_cents` or every seeded booking would have hit the new null-basis guard.
- **Fix:** Field renamed at all call sites; `makeBooking` now writes `spacePriceCents`/`serviceFeeCents` and accepts `cancelled` + `retainedSpaceCents`. `readLedger` in both test files is now kind-scoped so a coexisting debit cannot be returned in its place.
- **Commits:** `2832bbd`, `6f85e92`

### Additions Beyond the Plan

**Earnings-view tests.** The plan specifies no test for the `/host/earnings` half of Hazard 1, leaving the most user-visible mis-total unproven. Two cases were added to `tests/payments/earnings-view.test.ts` (`0f72d5c`): the kind-scoped row list excludes the debit and `summarizePayouts` totals `234000` rather than `204000`, and the partially-recovered debt surfaces as `20000`.

**C8 prose.** The plan names `payout-row.tsx:58` and the desktop table header/cell. `/host/earnings` also carried body copy reading "FitOut keeps a 10% service fee" — the same collision in prose form, in the same file. Changed to "commission" for consistency with C8's rationale. No amount or calculation touched.

### Acceptance-Criteria Discrepancies (no code impact)

| Criterion | Stated | Actual | Assessment |
|---|---|---|---|
| `grep -c "FitOut commission (10%)" src/components/host/payout-row.tsx` | 1 | **2** | The second hit is the file's header comment, which documents the breakdown lines verbatim and previously read "FitOut service fee (10%)". Leaving it stale would have been a documentation bug. The criterion's intent — the rendered label reads `FitOut commission (10%)` — is met. |
| `grep -rn "host_payout_ledger" src/ ... \| grep -v "kind"` returns no unscoped query lines | 0 lines | **16 lines** | All 16 are the *first* line of a multi-line SQL statement whose `kind` scope sits on a later line; the grep is line-oriented and cannot span statements. Each was inspected individually — every one is scoped. The criterion cannot be satisfied literally by any correct implementation that formats SQL across lines. |

## Verification Performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` (all 9 modified files) | clean |
| `npx vitest run tests/payments` | **9 files / 105 tests, exit 0** (was 96) |
| `npx vitest run tests/availability` (D-21 gate, T-07-21) | **8 files / 85 tests, exit 0** — no occupancy predicate changed |
| **`npm test` (full suite)** | **61 files / 463 tests, exit 0** (was 61 / 452) |
| `grep -c "quoted_total_cents\|quotedTotalCents" src/inngest/functions/payout-sweep.ts` | **0** |
| `grep -rc "FitOut service fee" src/` | **0** |
| Reconcile regression is a real gate | Verified: removing `kind = 'payout'` from `alertStuckHeld` makes the new test **fail**, restoring it makes it pass |

`next build` was not run — not required by the plan's verification block, and `tsc` plus the full suite cover the changed surface.

## Known Stubs

None. Every code path this plan touches is fully wired. The `host_cancel_fee` debit row it nets against is *written* by plan 07-11 (Wave 4) — until that lands, the netting branch is correct but unexercised in production, which is why the seven integration tests seed debits directly.

## Threat Flags

None. No new network endpoint, auth path, file access pattern, or trust-boundary schema change. All changes sit inside the existing Inngest-cron → database and platform-wallet → host-wallet boundaries already in the plan's register.

## For Downstream Plans

- **07-08 (service fee end-to-end — "the frozen triple"): you MUST freeze `booking.space_price_cents` at creation.** The sweep's payout basis reads it. If you start charging the all-in total without writing the split, `payOne` will alert `[payout-alert] booking has no frozen payout basis` and skip — fail-closed, but the host is not paid until you fix it. This is deliberate: a silent fallback would have leaked the service fee into host payouts. **Until 07-08 lands, every newly created booking has a NULL basis and will not pay out** — that is the correct, visible behaviour, not a regression.
- **07-11 (host-cancel action):** write the debit as `kind: 'host_cancel_fee'`, `state: 'held'`, with **negative** `gross_cents`/`net_cents`, `commission_*` at 0, and `recovered_cents` at 0. Cap the fee at the booking value **at write time** (`Math.min(HOST_CANCEL_FEE_CENTS, booking.spacePriceCents)`) — netting time is too late, the row would already misstate the debt. The sweep handles everything after that.
- **Anyone adding a `host_payout_ledger` query anywhere:** it must carry `AND kind = 'payout'` unless it is deliberately reading debits. There are now 16 scoped call sites and a reconcile regression test guarding the alert path.
- **Do not reintroduce the all-in charged-total column into `payout-sweep.ts`,** not even in a comment. The header documents this as a grep tripwire.

## Commits

| Hash | Message |
|---|---|
| `30a665a` | fix(07-04): scope every pre-existing ledger query by kind='payout' |
| `2832bbd` | feat(07-04): sweep retained cancellations, gross on space price, net D-71 debits |
| `6f85e92` | test(07-04): prove the payout invariants + rename the host-side line to commission |
| `0f72d5c` | test(07-04): prove the earnings view excludes host_cancel_fee debits |

Tasks 1 and 2 both restructure the same `payOne` body and could not be split into separate commits along task lines. They are split instead along the natural seam: `30a665a` is the grep-complete kind scoping across reconcile / earnings / webhook, and `2832bbd` is the sweep rework (predicate, basis, guard, netting) with the test-compile fixes it forced.

## Self-Check: PASSED

All 10 claimed files verified present on disk and all 4 commit hashes verified in `git log`.
