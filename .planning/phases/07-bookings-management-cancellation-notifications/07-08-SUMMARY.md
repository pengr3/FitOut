---
phase: 07-bookings-management-cancellation-notifications
plan: 08
subsystem: booker-facing-service-fee
tags: [service-fee, frozen-quote, cancellation-tier, price-breakdown, all-in-display, D-74, D-75]
requires:
  - computeServiceFee
  - SERVICE_FEE_BPS
  - booking.spacePriceCents
  - booking.serviceFeeCents
  - booking.cancellationPolicy
  - listing.cancellationPolicy
provides:
  - HoldSuccess.spacePriceCents
  - HoldSuccess.serviceFeeCents
  - HoldSuccess.quotedTotalCents
  - frozen price split at hold creation
  - creation-time cancellation-tier snapshot
  - PriceBreakdown.spacePriceCents
  - PriceBreakdown.serviceFeeCents
  - allInRateParts
  - SearchResultRow.allInRateParts
  - RailSelectionSummary.serviceFeeBps
  - WhenLabelInput.spacePriceCents
  - BookingListRow.spacePriceCents
affects:
  - src/lib/availability/units.ts
  - src/lib/booking/when-label.ts
  - src/lib/booking/bookings-query.ts
  - src/lib/search/query.ts
  - src/components/booking/price-breakdown.tsx
  - src/components/search/search-result-card.tsx
  - src/components/availability/availability-calendar.tsx
tech-stack:
  added: []
  patterns:
    - "Compose a platform fee at the CALLER so the pure pricing function never learns about fees"
    - "Read frozen values back out of the INSERT's RETURNING so fresh and replayed paths return identically"
    - "Snapshot a mutable parent-row attribute inside the same transaction that inserts the child"
    - "Grep tripwire: never spell a forbidden copy string contiguously, not even in the comment forbidding it"
    - "Server-format a money label for a component rendered inside a \"use client\" shell, so a non-public env override cannot silently diverge"
key-files:
  created:
    - src/lib/booking/all-in-rate.ts
    - tests/booking/service-fee-hold.test.ts
  modified:
    - src/lib/availability/units.ts
    - src/lib/booking/when-label.ts
    - src/lib/booking/bookings-query.ts
    - src/lib/search/query.ts
    - src/components/booking/price-breakdown.tsx
    - src/components/search/search-result-card.tsx
    - src/components/availability/availability-calendar.tsx
    - src/app/listings/[id]/page.tsx
    - src/app/listings/[id]/book/page.tsx
    - src/app/(app)/bookings/page.tsx
    - src/app/(app)/bookings/[id]/page.tsx
    - src/app/(host)/host/bookings/page.tsx
    - src/app/(host)/host/requests/page.tsx
    - src/app/actions/host-requests.ts
    - src/inngest/functions/request-expiry.ts
    - tests/booking/when-label.test.ts
decisions:
  - "The tier snapshot is read from the in-transaction listing SELECT, not threaded from the caller — an out-of-tx read leaves a retier race"
  - "fullDay re-derivation switched from the all-in total to the frozen space price across six surfaces (silent breakage otherwise)"
  - "The rail's 'Est.' figure was made all-in too: it is the last number before checkout and was understating by the full 5%"
  - "All-in browse rates are formatted server-side because the search card renders inside a \"use client\" shell"
metrics:
  duration: ~55m
  completed: 2026-07-21
  tasks: 3
  commits: 4
---

# Phase 7 Plan 08: Booker-Facing Service Fee, End to End Summary

Freezes the D-74 price split (space / fee / all-in) and the D-67 cancellation tier onto every new booking, discloses the fee as an itemised `Service fee` line at checkout, and moves all three browse surfaces to all-in rates — closing the payout gap 07-04 deliberately left fail-closed.

## The Primary Outcome, Verified

07-04 made `payOne` refuse to pay out any booking without a frozen `space_price_cents`, and nothing wrote that column. **That gap is now closed.** A booking created through the real `createPendingHold` path on the **live dev database** (`public` schema, not an isolated test schema) reads back:

```
{ spacePriceCents: 100000, serviceFeeCents: 5000, quotedTotalCents: 105000, cancellationPolicy: 'strict' }
```

The one-shot verification script seeded a namespaced host/booker/listing, placed one hold, read the row, and removed everything it created; a follow-up count confirmed **0 leftover users, listings and bookings**. The script was then deleted — it was a probe, not something to ship.

The payout half is proven by test rather than by assertion: a booking created through `createPendingHold` is confirmed, moved past `ends_at + PAYOUT_DELAY_HOURS`, and swept. `queryDuePayouts` returns `payoutGrossCents === spacePriceCents` and explicitly **not** `quotedTotalCents`; `payOne` returns `paid` (it returned `skipped-no-basis` before this plan — that exact transition is the gap closing) and the ledger's `gross_cents` is the space price with the service fee excluded.

## What Was Built

**Task 1 — the frozen triple + tier snapshot** (`424bf45` RED, `b273ecf` GREEN).

`createPendingHold` composes `computeServiceFee` **at the caller**, immediately after `quoteWindow`. `quoteWindow` is untouched and still returns the space price only — its existing tests pass unchanged, and an explicit assertion in the new test file pins that (`100000`, not `105000`). The insert now persists `spacePriceCents` / `serviceFeeCents` / `quotedTotalCents`, with `quoted == space + fee` holding exactly by construction (`allInCents` is an addition, never a second rounding).

`HoldSuccess` gained the three values, read back out of the insert's `RETURNING` rather than echoed from locals, and `findOwnActiveHold` selects them too — so an idempotent replay returns the split frozen at the **original** creation rather than a fresh recompute against a rate that may have moved.

The D-67 tier is captured from `listing.cancellation_policy`.

**Task 2 — checkout disclosure + the superseded copy** (`865d566`). The `Service fee` line renders in the slot the component reserved, from server-computed props, with the run line now showing the space price so the two lines sum to the Total. The row is omitted entirely at 0 (legacy rows). Both stale comment blocks now record that D-74 supersedes D-50's booker-facing half, and the C7-violating reassurance is replaced with `Includes our service fee. You'll pay this now.`

**Task 3 — all-in browse rates** (`49ef6c8`). A shared `allInRateParts` helper feeds both browse surfaces, so they cannot drift. Search-card rates are composed in the search **query mapping** and carried on `SearchResultRow`; the listing page calls the same helper. Both gained the muted `Service fee included` qualifier. No estimated total on a card.

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Tier snapshot source | The **in-transaction** listing SELECT | See Deviation 1 — threading it from the caller leaves a retier race |
| `fullDay` re-derivation | Compare the frozen **space price**, not the all-in total | See Deviation 2 — otherwise every hourly booking reads "Full day" |
| Rail `Est.` figure | Made all-in, exact, with the rate threaded from the server | See Deviation 3 — it was understating by the full fee, right before checkout |
| Search-card rate formatting | Server-side, in `search/query.ts` | The card renders inside a `"use client"` shell; a client-side `SERVICE_FEE_BPS` cannot see a non-public env override |
| Forbidden copy in comments | Never spelled contiguously | A grep guard that its own documentation trips is not a guard (07-04 idiom) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The tier snapshot is read in-transaction, not threaded through the input**

- **Found during:** Task 1.
- **Issue:** The plan specifies threading `listingCancellationPolicy` into `createPendingHold`'s input "sourced from the SAME listing read the caller already performs". But the caller's listing read (`booking.ts` step 4) happens **outside** the booking transaction, and `createPendingHold` performs its own listing SELECT **inside** it. Threading the outer value opens a window in which a host retiers between the caller's read and the insert — freezing a tier that was never simultaneously true of the listing. That is the same class of race D-67 exists to prevent, just moved earlier.
- **Fix:** `cancellationPolicy` was added to the existing in-transaction listing SELECT (which already reads `unitCount` / `hourlyRateCents` / `dayRateCents`). This still adds **no second listing query** — the plan's actual load-bearing constraint — and the snapshot is now transactionally consistent with the row it is written onto.
- **Files modified:** `src/lib/availability/units.ts`
- **Commit:** `b273ecf`

**2. [Rule 1 - Bug] `fullDay` re-derivation broken by the all-in total, on six surfaces**

- **Found during:** Task 1, tracing every reader of `quotedTotalCents`.
- **Issue:** Three shipped sites re-derive the unpersisted `fullDay` as `quotedTotalCents !== hourlyRate × hours`. Once the charged total became `space + fee`, that comparison can **never** match, so **every hourly booking renders "Full day"** — on `/bookings`, `/host/bookings`, `/host/requests`, both detail pages, and every lifecycle email. It is silent, has no error, and **the full suite stayed green**: `when-label.test.ts` builds literals directly and the integration tests seed `quotedTotalCents` by hand, so nothing exercised the real creation path against a label. I demonstrated the flip explicitly before fixing it.
- **Fix:** All three now compare the frozen **space price**, with the all-in total kept as the fallback for a pre-Phase-7 row (where the fee was 0, so the two are the same number). `WhenLabelInput.spacePriceCents` was made **required, not optional**, so `tsc` forced all five call sites to be updated rather than letting one silently regress — it found every one. `spacePriceCents` was added to `BookingListRow` and both `bookings-query` projections, and to the `host/requests`, `host-requests` and `request-expiry` selects.
- **Tests:** two cases added to `when-label.test.ts` — the exact post-07-08 shape (space = rate × hours, total 5% larger) must render hourly, and a null split must fall back rather than read "Full day".
- **Files modified:** `when-label.ts`, `bookings-query.ts`, `bookings/page.tsx`, `bookings/[id]/page.tsx`, `host/bookings/page.tsx`, `host/requests/page.tsx`, `host-requests.ts`, `request-expiry.ts`, `listings/[id]/book/page.tsx`, `when-label.test.ts`
- **Commit:** `b273ecf`

**3. [Rule 2 - Missing critical functionality] The booking rail's `Est.` figure violated D-75 by the full fee**

- **Found during:** Task 3, auditing every surface that shows a price to a booker.
- **Issue:** `RailSelectionSummary` (listing page, directly above the "Book this space" CTA) renders `Est. ₱1,000` for the selected window — the **last number a booker sees before checkout**, which then charges ₱1,050. That is the "number goes up between browsing and paying" failure D-75 exists to prevent and threat **T-07-46** disposes as `mitigate`. It is not the one-centavo rounding edge the UI-SPEC boxes off: it is the entire 5%. The plan's file list does not name this component.
- **Fix:** the rail now shows the all-in figure via the shared `computeServiceFee` (the fee formula is never re-implemented). Unlike a search card this is **exact, not approximate** — it applies the same rate to the same space price checkout freezes, so the two agree to the centavo. The rate is threaded from the RSC as `serviceFeeBps` rather than defaulted client-side: `SERVICE_FEE_BPS` reads a **non-public** env var, which Next does not inline into the browser bundle, so a configured override (`SERVICE_FEE_BPS=700`) would leave the rail quoting 5% while checkout charged 7% — silently recreating the exact violation.
- **Files modified:** `src/components/availability/availability-calendar.tsx`, `src/app/listings/[id]/page.tsx`
- **Commit:** `49ef6c8`

### Additions Beyond the Plan

**`src/lib/booking/all-in-rate.ts`.** The plan has both browse surfaces apply `computeServiceFee` to their display rate independently. Two copies of "apply the fee, then format" is two places for a future rate or rounding change to land in only one — and the failure mode is a browse price disagreeing with checkout, precisely what D-75 forbids. One shared helper, called by the search query mapping and the listing RSC. The components still do zero arithmetic; they receive finished strings.

**End-to-end payout case.** The plan's Task 1 tests cover the frozen triple and the tier. The success criterion "the payout sweep pays on space price only, verified by test" needed a case that runs the **real** creation path into the **real** sweep, so one was added — it is the only test that would have caught `skipped-no-basis` surviving this plan.

## Acceptance-Criteria Discrepancies

| Criterion | Stated | Actual | Assessment |
|---|---|---|---|
| `grep -rci "Taxes and fees" src/` | 0 | **0** | Met — but only after rewording. The plan's step (e) *mandates* a comment recording that the label is never that bundle, which would have made the grep return 2 and permanently disarm it. The bundle is now written in two pieces with an explicit tripwire note, preserving the full C1 rationale while keeping the grep able to fail. Same device as 07-04's `payout-sweep.ts` header. |
| `grep -rci "no added fees\|no hidden fees\|Final price" src/components src/app` | 0 | **0** | Same resolution: the C7 comment describes the forbidden phrases and points at 07-UI-SPEC rule C7 instead of quoting them. |
| `grep -ci "estimated total" search-result-card.tsx` | 0 | **1** | **Not met, deliberately.** The single hit is the plan's own verbatim mandated comment (*Do NOT add a computed "estimated total" to a search card*). Judged differently from the two above: those greps guard **rendered copy**, which a grep genuinely catches, so disarming them has a real cost. This one guards a **component pattern** — someone adding an estimated total would render `Est. ₱1,050`, not the literal words — so the grep is weak either way, and the mandated comment's documentation value exceeds it. No estimated total is rendered on any card. |
| `grep -c "cancellationPolicy" units.ts` | >= 2 | **3** | Met (select field, persisted value, plus the comment). |
| `grep -c "Service fee" price-breakdown.tsx` | >= 1 | **3** | Met (the rendered label plus two comment references). |

## Verification Performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0 — 25 routes compiled |
| `npx eslint` (all 18 changed/created files) | clean, 0 errors 0 warnings |
| `npx vitest run tests/booking tests/availability tests/payments` | **29 files / 316 tests, exit 0** |
| `npx vitest run tests/search …` (incl. search) | **33 files / 332 tests, exit 0** |
| **`npm test` (full suite)** | **67 files / 532 tests, exit 0** (was 66 / 519) |
| `npx vitest run tests/booking/service-fee-hold.test.ts` | **11 passed** |
| `npx vitest run tests/booking/pricing.test.ts` (quoteWindow untouched) | passes unchanged |
| **Live dev DB (public schema)** | space 100000 / fee 5000 / all-in 105000 / tier `strict`; **0 leftover rows** after cleanup |
| Split exactness at boundaries | Swept `[1, 99, 100, 999, 12345, 999999]`; `quoted == space + fee` asserted off the persisted integers at each |

### A note on `npm run build`

`next build` fails on a **clean checkout of this repo** at page-data collection with `PLATFORM_WALLET_NUMBER / PLATFORM_WALLET_NAME are not set`, and then with `INNGEST_SIGNING_KEY is required in production`. Both are pre-existing fail-closed prod guards in files this plan does not touch (`src/lib/paymongo.ts`, the Inngest route); neither var is present in `.env.local`. 07-04 recorded that it did not run `next build` at all. To get a genuine build signal for **this plan's** changes rather than assuming, the build was re-run with placeholder values supplied for those four vars only — and passed. **This is an environment gap, not a code defect, and it is not fixed here** (out of scope per the plan's file list); it is logged below for whoever owns local/CI env setup.

## Deferred Items

- **`next build` requires four prod-guard env vars that are absent from `.env.local`** (`PLATFORM_WALLET_NUMBER`, `PLATFORM_WALLET_NAME`, `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`). Pre-existing; blocks a bare `npm run build` locally and would block CI. Needs a documented `.env.example` or CI secret set.

## Known Stubs

None. Every path this plan touches is fully wired: holds freeze the split, checkout renders it from persisted columns, the sweep consumes it, and all three browse surfaces display it.

## Threat Register Status

| Threat ID | Disposition | How this plan discharges it |
|---|---|---|
| T-07-42 | mitigate | `computeServiceFee` runs inside `createPendingHold`, server-side, over `quoteWindow`'s output — no request field participates. `PriceBreakdown` receives all three money figures as server-computed props and performs zero arithmetic. |
| T-07-43 | mitigate | `booking.cancellation_policy` is written at creation from the **in-transaction** listing read (stronger than the plan's design — see Deviation 1). Proven by a test that retiers the listing after the hold and re-selects the booking. |
| T-07-44 | mitigate | `space_price_cents` is frozen separately as the payout basis, and the end-to-end sweep test asserts `payoutGrossCents === spacePriceCents` and `!== quotedTotalCents` on a booking created through the real path. |
| T-07-45 | mitigate | The `Service fee` line renders whenever non-zero, labelled exactly per D-73, with the "Includes our service fee" qualifier. C7-violating strings are grep-asserted absent and the greps are kept genuinely fallible. |
| T-07-46 | mitigate | Both browse surfaces apply the same `SERVICE_FEE_BPS` via one shared helper and promise a RATE, not a total. Additionally closed on the booking rail, which the plan did not name and which was understating by the full fee (Deviation 3). |

## Threat Flags

None. No new network endpoint, auth path, file access pattern, or trust-boundary schema change. `all-in-rate.ts` is a pure formatter over values already public on the listing page.

## For Downstream Plans

- **07-09 / 07-11 (cancel action + refund preview):** `booking.cancellation_policy` is now populated on new bookings — read it via `tierOrDefault`, **never** `listing.cancellation_policy`. It is still NULL for bookings created before this plan and for listings that predate D-77's required wizard step, which is exactly the case `tierOrDefault`'s Flexible fallback covers.
- **The service fee is NON-REFUNDABLE (D-74).** Refund math must operate on `space_price_cents`, and `retained_space_cents` must be a portion of the **space price**, never of `quoted_total_cents`. Using the all-in total would refund platform revenue the fee exists to protect.
- **Anyone re-deriving `fullDay`:** compare against `space_price_cents`, never the charged total. The three shipped sites are fixed and `WhenLabelInput.spacePriceCents` is required so `tsc` catches a new one, but a fourth hand-rolled derivation would not be caught.
- **Anyone adding a booker-facing price surface:** call `allInRateParts` (browse) or read the frozen columns (committed booking). Do not re-implement the fee formula, and do not compose it inside a `"use client"` module without threading the rate in from the server.
- **Anyone editing `price-breakdown.tsx` copy:** the forbidden phrases are deliberately not spelled out in that file. Keep it that way or the grep guards stop working.

## Commits

| Hash | Message |
|---|---|
| `424bf45` | test(07-08): add failing tests for the frozen fee triple + tier snapshot |
| `b273ecf` | feat(07-08): freeze the D-74 price split and the D-67 tier at hold creation |
| `865d566` | feat(07-08): disclose the Service fee at checkout and correct the D-50 copy |
| `49ef6c8` | feat(07-08): show all-in rates on both browse surfaces (D-75) |

Task 1's RED/GREEN gates are the first two commits. The Deviation-2 `fullDay` fix is folded into the GREEN commit because it is the direct, unavoidable consequence of that commit's change — splitting them would have left an intermediate commit that builds and passes tests while mislabelling every hourly booking.

## TDD Gate Compliance

Task 1 was marked `tdd="true"` and followed a full RED → GREEN cycle with the gates as separate commits, in order:

| Gate | Commit | Evidence |
|---|---|---|
| RED | `424bf45` | Run before committing: **9 failed / 2 passed**. The payout case failed with `skipped-no-basis` — the exact production symptom this plan exists to remove. |
| GREEN | `b273ecf` | **11 passed.** |
| REFACTOR | not needed | The GREEN implementation was already in target shape. |

Two of the eleven passed during RED and neither is a false gate: `quoteWindow stays fee-free` is a **guard** asserting an existing property stays true (it must pass at RED — a failure there would mean the seam was already broken), and the NULL-tier case passes trivially when nothing is written. Both were checked rather than assumed.

## Self-Check: PASSED

All 18 claimed files verified present on disk and all 4 commit hashes verified in `git log`.
