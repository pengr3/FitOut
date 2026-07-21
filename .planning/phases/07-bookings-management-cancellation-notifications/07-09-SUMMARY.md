---
phase: 07-bookings-management-cancellation-notifications
plan: 09
subsystem: cancellation-refund-flow
tags: [cancellation, refund, paymongo, db-clock, owner-gate, idor, rsc, sc2, D-78, D-79]
requires:
  - quoteRefund
  - tierOrDefault
  - rungBoundaries
  - LADDER
  - isApiRefundable
  - booking.cancellationPolicy
  - booking.spacePriceCents
  - booking.serviceFeeCents
  - emitNotify
  - readDbNow
  - composeWhenLabel
provides:
  - cancelBookingAsBooker
  - cancelUnpaidHold
  - CancelActionResult
  - cancellationSchema
  - RefundBreakdown
  - CancelConfirm
  - /bookings/[id]/cancel
  - booking.paymentMethod
affects:
  - src/app/api/paymongo/webhook/route.ts
  - src/lib/db/schema.ts
tech-stack:
  added: []
  patterns:
    - "Server action recomputes money at confirm time; the preview is a preview, and the boundary that would change it is disclosed to the user"
    - "readDbNow() as the ONE display-side DB-clock reader — never a bare SELECT now() through execute()"
    - "Owner gate verified by MUTATION (remove it, watch the test go red) rather than by assumption"
    - "Denial-string byte-equality asserted BETWEEN two paths rather than each against a literal, so an enumeration oracle cannot open up"
    - "Durable rail persistence at confirm so a fail-closed predicate has real input days later"
key-files:
  created:
    - src/lib/validation/cancellation.ts
    - src/app/actions/cancel-booking.ts
    - src/components/booking/refund-breakdown.tsx
    - src/components/booking/cancel-confirm.tsx
    - src/app/(app)/bookings/[id]/cancel/page.tsx
    - tests/booking/cancellation.test.ts
    - tests/security/cancel-owner-gate.test.ts
    - e2e/cancel.spec.ts
    - drizzle/0015_booking_payment_method.sql
  modified:
    - src/lib/db/schema.ts
    - src/app/api/paymongo/webhook/route.ts
key-decisions:
  - "The action RECOMPUTES at confirm; the review page discloses the concrete instant the rung changes (D-81) so the recompute can never surprise"
  - "readDbNow() replaces the plan's literal `SELECT now() AS \"now\"` snippet, which was verified to return TEXT and would crash at runtime"
  - "booking.payment_method added (Rule 2): without it isApiRefundable fails closed on every cancellation and no refund ever dispatches"
  - "The unpaid-hold path notifies the HOST only — a ₱0 refund notice to the booker would invent an event"
  - "Rate limiter stubbed in tests so twelve cancels by one booker do not silently become rate-limit denials"
patterns-established:
  - "Mutation-verified security tests: the SUMMARY records what happened when the control was removed"
  - "A positive control in every owner-gate suite, so the file cannot pass against a hardcoded denial"
  - "Grep tripwire discipline extended to validation schemas: forbidden field names are never spelled contiguously"
requirements-completed: [BOOK-07, PAY-06]
duration: ~75min
completed: 2026-07-21
---

# Phase 7 Plan 09: Booker Cancellation & the Exact Refund Summary

**The SC#2 cancellation flow: a DB-clock RSC review screen showing the six-element itemised refund, and an owner-gated, status-scoped action that writes, dispatches and reports one single `quoteRefund` result.**

## Performance

- **Duration:** ~75 min
- **Tasks:** 3 (+1 unplanned prerequisite)
- **Files created:** 9 · **Files modified:** 2
- **Full suite:** 69 files / 554 tests, all passing (was 67 / 532)

## The Primary Outcome, Verified

ROADMAP SC#2 turns on one word — **exact**. The amount the booker reads before confirming must be the amount they get. Three separate proofs were required and all three exist:

| Proof | Where | Result |
|---|---|---|
| Previewed == written == dispatched == returned | `cancellation.test.ts` (2) | Passes mid-rung AND one minute inside the sharp 24h boundary |
| The boundary is real and sharp | `cancellation.test.ts` (2b) | 24h+1m ⇒ 100%, 24h−1m ⇒ 50%; both persist their own previewed figure |
| Previewed number, read off the RENDERED page, equals the persisted `refund_cents` | `e2e/cancel.spec.ts` | Passes against the real app on the dev DB |

The e2e assertion is deliberately not "the status became Cancelled" — it scrapes the `Refund to you` value out of the DOM, parses it to centavos, and asserts `refund_cents` equals **that**. A wrong-amount implementation passes a status check and fails this one.

## What Was Built

**Prerequisite — `booking.payment_method`** (`06cbc74`). See Deviation 1. A nullable, backfill-free column written by the confirm webhook from the same verified event resource, plus one shared `resolvePaymentMethod()` resolver so the confirm path and the gone-slot backstop cannot disagree about what rail was used.

**Task 1 — validation + the action** (`fd8463d`). `cancellationSchema` carries exactly one field. `cancelBookingAsBooker` runs gate → rate-limit → DB clock → quote → atomic flip → audit → money → notify → revalidate, in that order, with every guard (`booker_id`, `status='confirmed'`, `starts_at > now()`) inside a single `WHERE` so a 0-row result is the one calm failure path and no guard can be raced apart from another. `cancelUnpaidHold` reuses the canonical `requested→declined` / `approved→cancelled` mapping from `request-expiry.ts` as one `CASE` inside one statement.

**Task 2 — the review screen** (`a9aa026`). `RefundBreakdown` is a `<dl>` of pre-formatted strings performing zero arithmetic, with the `Service fees aren't refunded` helper rendered unconditionally — no `{cond && …}` wrapper exists to remove. The route is an RSC that reads the clock through `readDbNow`, threads that one instant into `quoteRefund` and every time comparison, redirects unpaid holds, and refuses post-start with copy matched word-for-word to the action's own `PAST_START` result.

**Task 3 — the tests** (`9b6f4ad`). 14 integration invariants, 8 security cases, 2 e2e journeys.

## Owner Gate — Verified by Mutation, Not Assumption

The plan required the gate be *genuinely* load-bearing. It was checked by removing it and watching the suite:

| Mutation | `tests/security/cancel-owner-gate.test.ts` |
|---|---|
| **Baseline** (both layers present) | **8 passed** |
| **Remove the pre-read gate** (`row.bookerId !== userId`) | **2 failed** — both oracle tests. The in-`WHERE` scope still blocked the write, but the denial string changed from `DENIED` to the 0-row message, which is exactly the enumeration oracle the test exists to catch |
| **Remove BOTH layers** | **6 failed** — including *"Bob's bookings are BYTE-FOR-BYTE unmodified"*. Alice genuinely cancelled Bob's booking, refunded it, and freed his slot |

The file was restored from a pre-mutation copy and `git diff` confirmed empty before proceeding. The two-stage result is the useful part: it proves the layers are independently meaningful rather than one being decorative.

## The Preview/Confirm Rule — Decided Deliberately

The brief flagged this as a real bug class: the quote is computed at render and the confirm happens seconds-to-minutes later; crossing a rung boundary in between changes the amount.

**Decision: the action RECOMPUTES.** Rationale, recorded in the action's header:

1. There is no signed quote token, so "honour what the page showed" means trusting a figure that reached the server through the client — the exact thing `cancellationSchema` has one field to prevent.
2. It is safe in one direction only, and that direction is the right one: time moves toward the session, so a crossed boundary can only ever **lower** the refund. The booker can never be handed less than nothing or more than they were promised at the moment the server acted.
3. What is guaranteed *absolutely* is the invariant that actually matters: written == dispatched == returned, from one `quoteRefund` call. That is asserted at a boundary, not just in the middle of a rung.

**Mitigation for the honesty gap** (beyond the plan): the review page renders the D-81 concrete boundary — *"This refund drops to 50% after Thu, Jul 3, 8:00 PM (Manila time)."* `rungBoundaries` exists for exactly this and was otherwise unused by this plan. A booker near an edge is told where the edge is, so the recompute is disclosed rather than sprung.

## Decisions Made

| Decision | Choice | Why |
|---|---|---|
| Clock reader | `readDbNow(db)` | See Deviation 2 — the plan's literal snippet was verified to crash |
| Preview/confirm | Recompute + disclose the boundary | Above |
| Unpaid-hold notification | Host only | A "₱0 refunded" notice to the booker invents an event that never happened |
| Sub-₱1 refunds | Operator-alert path | PayMongo's documented 100-centavo floor; a call we know 4xxs is worse than an alert |
| Rate limiter in tests | Stubbed, and asserted on | The real module-level Map (5/60s) would have made every case after the fifth assert against a rate-limit denial — a fixture artefact wearing a result's name. The stub also makes the key and budget observable, which spying on the real one cannot. |
| `payment_method` resolution | One shared resolver | Two copies of "read the rail off the event" is two chances for confirm and refund to disagree about the same payment |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical functionality] `booking.payment_method` did not exist, so no refund could ever have been dispatched**

- **Found during:** Task 1 (reading the plan's step 8 against the schema).
- **Issue:** The plan's refund dispatch is gated on `isApiRefundable(row.paymentMethod)`, and 07-16 reads the same field for the D-72 form — but **no such column exists**. The rail was only ever resolved inline inside `handleGoneSlot`, from a live webhook event. A booker cancellation happens hours or days later with no event in hand. `isApiRefundable` **fails closed**, so it would have received `undefined` on every single cancellation, answered "not refundable", and routed **100% of refunds** to the operator-alert path. The code would have compiled, linted, built, and passed a status-flip test while never moving a peso. Test 4's "createRefund called at most once" would have passed vacuously — with zero calls.
- **Fix:** `drizzle/0015_booking_payment_method.sql` (nullable, backfill-free, no default, absent from the GiST EXCLUDE predicate) + `schema.ts` + the confirm `UPDATE` in the webhook now writes it from a shared `resolvePaymentMethod()` also used by `handleGoneSlot`.
- **Verification:** `tests/paymongo` 38/38 unchanged; test (10) seeds `qrph` and proves the operator-alert branch fires with no API call, while every other case seeds `gcash` and proves `createRefund` genuinely fires with the right amount. Applied to the dev DB via `drizzle-kit migrate`.
- **Committed in:** `06cbc74`

**2. [Rule 1 — Bug] The plan's mandated clock snippet returns a string, not a Date**

- **Found during:** Task 1, before writing the code.
- **Issue:** The plan mandates, in two places and as an acceptance criterion, `const [{ now }] = (await db.execute(sql\`SELECT now() AS "now"\`)) as unknown as { now: Date }[]`. This is precisely the failure the repo contract documents at length on `bookings-query.ts:RawBookingRow`. Rather than assume either way, it was **probed against the live dev DB**:

  ```
  typeof: string | ctor: String | value: 2026-07-21 12:26:33.794807+00
  ```

  The cast satisfies `tsc`, `eslint` and `next build`, and then throws inside `quoteRefund` on `now.getTime()` the first time a real booker opens the page. It would have shipped as a green build and a 500 on the highest-stakes screen in the phase.
- **Fix:** both the action and the page use `readDbNow(db)` — the shared hydrating reader 07-06 built for exactly this, which selects through the `isoUtc` mask and converts once at the boundary.
- **Verification:** 14 integration cases and 2 e2e journeys exercise the real path with real rows; the e2e renders the page in the real app.
- **Committed in:** `fd8463d`, `a9aa026`

### Additions Beyond the Plan

- **`src/components/booking/cancel-confirm.tsx`.** The plan mandates "a small client component" for the confirm button but does not name a file. A server component cannot own pending state, so it had to be its own module.
- **The D-81 boundary disclosure** on the review page — see *The Preview/Confirm Rule* above.
- **Five extra test cases** beyond the plan's nine: (2b) the sharp boundary in isolation, (10) the unrefundable rail, (11) refund-dispatch failure not unwinding the flip, (12) notification targets, (13) the audited rate-limit denial. Each covers a branch the action has and the plan's nine did not reach.
- **A positive control** in the security suite (*"the OWNER can still cancel"*). Without it the entire file would pass against an action hardcoded to `return DENIED`.

---

**Total deviations:** 2 auto-fixed (1 missing-critical, 1 bug). Both were prerequisites for the plan's own stated behaviour to function at all. No scope creep — no new tables, no new dependencies, no policy changes.

## Acceptance-Criteria Discrepancies

| Criterion | Stated | Actual | Assessment |
|---|---|---|---|
| `grep -c 'SELECT now() AS "now"'` in the action | 1 | **0** | **Not met, deliberately.** The criterion encodes a snippet proven to crash (Deviation 2). The property it *guards* — the clock is Postgres, never JS — is fully met and independently checked: `grep -c "Date.now()\|new Date()"` returns **0** in both files, and `readDbNow` appears 3× in each. |
| Same criterion on the cancel page | 1 | **0** | Same resolution. |
| `grep -c "Cancel this booking?"` on the page | 1 | **1** | Met. |
| `grep -c "Keep booking"` on the page | 1 | **0 on the page, 1 in `cancel-confirm.tsx`** | **Location differs.** Both buttons live in the client component the plan itself mandates; a `Keep booking` link in the RSC would be a second, divergent copy of the same control. The string exists, renders, and is asserted visible by the e2e. |
| `grep -c "amountCents\|refundCents"` in the schema | 0 | **0** | Met — but only after rewording. The first draft's comment *forbidding* those field names made the grep return 2, permanently disarming it. The 07-04 tripwire idiom was applied: the forbidden names are described, never spelled. |
| `grep -c "<dl"` in the breakdown | 1 | **2** | Met in substance — exactly one `<dl>` **element**; the second hit is the header comment describing the semantics. |
| `grep -c "bg-brand"` on the page | 0 | **0** | Met — the confirm is neutral outline. |
| `grep -c "booker_id = ${userId}"` in the action | ≥2 | **3** | Met (both UPDATEs + the security-contract note). |
| `grep -c "recordAudit("` | ≥5 | **8** | Met. |
| `grep -c "db.transaction"` | 0 | **0** | Met — emission is never inside a transaction. |

## Verification Performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` (all 9 new/modified source + test files) | clean, 0 errors 0 warnings |
| `npm run build` | exit 0 — 26 routes, `/bookings/[id]/cancel` present |
| `npx vitest run tests/booking/cancellation.test.ts` | **14 passed** |
| `npx vitest run tests/security` | **4 files / 26 passed** |
| `npx vitest run tests/booking tests/payments tests/security tests/availability` | **34 files / 356 passed** |
| `npx playwright test e2e/cancel.spec.ts` | **2 passed** (34.8s, real app + dev DB) |
| **`npm test` (full suite)** | **69 files / 554 tests, exit 0** (was 67 / 532) |
| Owner-gate mutation (2 stages) | Red as designed; file restored, `git diff` empty |
| DB-clock return type | Probed live: `SELECT now()` through `execute` → **string** |

### A note on `npm run build`

`next build` still fails on a clean checkout at page-data collection with `PLATFORM_WALLET_NUMBER / PLATFORM_WALLET_NAME are not set`, then `INNGEST_SIGNING_KEY is required in production` — the **pre-existing** env gap 07-08 logged. To get a genuine build signal for this plan's changes rather than assuming, the build was re-run with placeholder values for those four vars only, and passed. Unchanged and still out of scope; re-logged below.

### A note on the e2e navigation

The spec navigates to `/bookings/[id]/cancel` directly rather than clicking a `Cancel booking` button on the detail page, because **that button is Plan 12's work** (Wave 4 — its `must_haves` name the cancel entry point explicitly, and it owns `bookings/[id]/page.tsx`). This plan is Wave 3, so the link does not exist yet. The gap is in the **entry**, not the flow; everything from the review screen onward runs exactly as a booker would drive it. The file carries a NAVIGATION NOTE saying precisely what to replace when Plan 12 lands.

## Deferred Items

- **`next build` requires four prod-guard env vars absent from `.env.local`** (`PLATFORM_WALLET_NUMBER`, `PLATFORM_WALLET_NAME`, `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`). Pre-existing; blocks a bare `npm run build` locally and would block CI. Carried from 07-08.
- **The e2e cancel ENTRY POINT** — click-through from the detail page, once Plan 12 adds the button.

## Known Stubs

None. Every path is wired end to end: the review screen reads real frozen columns, the action writes real refund columns and dispatches a real PayMongo call on a refundable rail, `retained_space_cents` reaches 07-04's payout basis, and the slot frees by construction.

The one *deliberately* unbuilt branch is the **D-72 QRPh refund form**, which is Plan 16's scope. It is not a stub: the unrefundable-rail path is fully implemented today (operator-alert + `needs_attention` audit, never silent retention) and is tested by case (10). The action carries a single documented seam marking where Plan 16's form hangs, and instructs against adding a second branch elsewhere.

## Threat Register Status

| Threat ID | Disposition | How this plan discharges it |
|---|---|---|
| T-07-47 | mitigate | `cancellationSchema` has exactly one field; the quote is recomputed from the snapshot. Grep-asserted (and the grep kept genuinely fallible). |
| T-07-48 | mitigate | Owner gate before any UPDATE + `AND booker_id = ${userId}` in both UPDATEs. **Verified by two-stage mutation** — see above. Denials asserted byte-equal across missing/cross-user **and** across both actions. |
| T-07-49 | mitigate | Status-scoped UPDATE; case (4) asserts the refund is written once and `createRefund` fires exactly once across a double submit. |
| T-07-50 | mitigate | Both surfaces read Postgres via `readDbNow`; zero `Date.now()`/`new Date()` in either. Cases (2) and (2b) assert equality at the sharp 24h edge. |
| T-07-51 | mitigate | `quoteRefund` is called with `booking.cancellation_policy`. Case (1) retiers the listing mid-flight and asserts the refund is unchanged (50%, not flexible's 100%). |
| T-07-52 | mitigate | `rateLimit("cancel-booking:{userId}", { window: 60, max: 5 })`; case (13) asserts the key, the budget, the audited denial, and that nothing was written or dispatched. |
| T-07-53 | mitigate | 8 `recordAudit` call sites across denied / ok / needs_attention, carrying bookingId, refundCents, retainedCents, tier and refundBps. Cases (10) and (13) parse the audit lines. |
| T-07-54 | mitigate | The POST records intent only; the toast reads "Your refund is on its way", never "Refunded". The webhook remains the single writer of terminal state. |
| T-07-55 | mitigate | Single `cancelled` status preserved. Case (8) proves the window is immediately rebookable — **and first proves it was genuinely occupied**, so an EXCLUDE that never fired could not pass the test. |

## Threat Flags

| Flag | File | Description |
|---|---|---|
| threat_flag: schema-at-trust-boundary | `src/lib/db/schema.ts` | New `booking.payment_method`, written **only** by the signature-verified PayMongo webhook from the verified event resource — never from a client field, never from a server action. It is read by the fail-closed `isApiRefundable`; an absent value denies API refund rather than permitting one, so a hypothetical write-side compromise cannot *unlock* a refund path, only route one to an operator. |

## For Downstream Plans

- **Plan 11 (host cancel)** adds `cancelBookingAsHost` to `src/app/actions/cancel-booking.ts`. Reuse `loadOwnedBooking`'s shape but gate on `listing.hostId`, and reuse `notifyCancellation` / `revalidateCancelSurfaces` rather than writing second copies. The host path refunds **100% regardless of tier** (D-70) — it must **not** call `quoteRefund`.
- **Plan 12 (detail page)** owns the `Cancel booking` entry point. Route paid (`confirmed`) bookings to `/bookings/[id]/cancel`; wire unpaid `requested`/`approved` holds to `cancelUnpaidHold` behind a plain dialog with **no money UI** (07-UI-SPEC § 3). Then update the NAVIGATION NOTE in `e2e/cancel.spec.ts`.
- **Plan 16 (QRPh probe)** — the D-72 form hangs off the **single** `else if (quote.totalRefundCents > 0)` branch in `cancelBookingAsBooker`, marked in-file. `row.paymentMethod` is now populated on every booking confirmed after this plan; it is NULL on older rows, which `isApiRefundable` correctly reads as unrefundable.
- **Anyone reading a `timestamptz` for display:** use `readDbNow` / `isoUtc`. A bare `SELECT now()` through `db.execute` returns a **string** — this was probed, not assumed, and the probe output is in Deviation 2.
- **Anyone adding a booking-status value:** don't. D-79's single `cancelled` status is load-bearing and `tests/booking/cancellation.test.ts` case (8) is the gate that would catch it.

## Task Commits

1. **Prerequisite: persist the payment rail** — `06cbc74` (feat)
2. **Task 1: validation + cancel action** — `fd8463d` (feat)
3. **Task 2: RefundBreakdown + cancel review route** — `a9aa026` (feat)
4. **Task 3: integration, security and e2e tests** — `9b6f4ad` (test)

## Next Phase Readiness

Wave 3's centrepiece is complete and Wave 4 is unblocked: Plan 11 has the action module and its shared helpers, Plan 12 has the route to link to, Plan 16 has its single documented seam. No blockers.

---
*Phase: 07-bookings-management-cancellation-notifications*
*Completed: 2026-07-21*

## Self-Check: PASSED

All 12 claimed files verified present on disk and all 4 commit hashes verified in `git log`.
