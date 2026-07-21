---
phase: 07-bookings-management-cancellation-notifications
plan: 11
subsystem: host-cancellation
tags: [cancellation, host, refund, ledger-debit, auto-block, anti-resell, owner-gate, D-70, D-71, D-80, SC3]
requires:
  - HOST_CANCEL_FEE_CENTS
  - hostPayoutLedger.kind
  - hostPayoutLedger.recoveredCents
  - host_payout_ledger_booking_id_kind_unique
  - availabilityBlock.reason
  - booking.paymentMethod
  - booking.spacePriceCents
  - booking.serviceFeeCents
  - booking.retainedSpaceCents
  - emitNotify
  - readDbNow
  - composeWhenLabel
  - isApiRefundable
provides:
  - cancelBookingAsHost
  - previewHostCancelFee
  - HostCancelReason
  - hostCancellationSchema
  - HostCancelDialog
  - /host/bookings/[id]
  - removeBlock system-block refusal
  - "first real kind='host_cancel_fee' ledger row"
affects:
  - src/app/actions/cancel-booking.ts
  - src/app/actions/blocks.ts
  - src/lib/validation/cancellation.ts
tech-stack:
  added: []
  patterns:
    - "INSERT-as-lock for an at-most-once money row, with no app-level pre-check"
    - "A sentinel column value that makes a row undeletable through its own shipped delete action"
    - "Post-commit consequences individually guarded so none can throw past a committed flip"
    - "Owner scope repeated inside the UPDATE's WHERE via EXISTS when ownership lives on a joined table"
    - "A dedicated fixture identity when accumulated state from earlier cases would blur an exact assertion"
key-files:
  created:
    - src/components/host/host-cancel-dialog.tsx
    - src/app/(host)/host/bookings/[id]/page.tsx
    - tests/payments/host-cancel.test.ts
  modified:
    - src/app/actions/cancel-booking.ts
    - src/app/actions/blocks.ts
    - src/lib/validation/cancellation.ts
decisions:
  - "The host path calls NO clock reader: it evaluates no rung, so Postgres now() inside the UPDATE's own WHERE is the whole time authority"
  - "Every post-commit consequence is try/caught into a needs_attention audit — a committed cancellation must never surface as a 500"
  - "Host ownership added to the UPDATE's WHERE via EXISTS (defence in depth); the mutation check proved the pre-read gate was otherwise the only layer"
  - "removeBlock's refusal lives in the DELETE's WHERE with IS DISTINCT FROM, not <> (reason is nullable)"
requirements-completed: [PAY-06, HOST-02]
metrics:
  duration: ~70m
  completed: 2026-07-21
  tasks: 3
  commits: 3
---

# Phase 7 Plan 11: Host-Initiated Cancellation Summary

**ROADMAP SC#3 gets its product path: a host can cancel a confirmed booking behind two panes, a required reason and a required acknowledgment, and all four D-70/D-71 consequences fire — 100% booker refund, an audit row against the host, an undeletable auto-block of the freed window, and a write-time-capped signed ledger debit.**

## Performance

- **Duration:** ~70 min
- **Tasks:** 3
- **Files created:** 3 · **Files modified:** 3
- **Full suite:** 73 files / 597 tests, all passing (was 72 / 581)

## The Primary Outcome, Verified

This plan writes the **first real `kind='host_cancel_fee'` row in the system's history.** 07-04 scoped every ledger query to `kind='payout'` specifically so that row could exist without breaking payout accounting — but every test of that scoping until now used a **hand-seeded** debit. This plan is the first that could check the scoping against a debit the *product* produced, and all four failure modes 07-04 defends against were exercised:

| Failure mode 07-04 defends | Case | Result |
|---|---|---|
| A debit looks like an existing claim and suppresses a legitimate payout | (7) | The host-cancelled booking is never selected; no payout row exists |
| A debit trips the reconcile stuck-`held` alert | (11) | `alertStuckHeld` returns **0** with a real debit aged 200h past the 48h threshold, and `console.error` is asserted never called |
| A debit mis-totals `/host/earnings` | (12) | The page's own kind-scoped read returns no negative row; `summarizePayouts` is unaffected; the debt surfaces only through the separate outstanding query |
| Netting mis-applies | (8) | ₱1,800 net − ₱300 debit = **₱1,500 transferred**, debit `recovered_cents` → 30000 and `state` → `paid`, payout row memoises the deduction |

## What Was Built

**Task 1 — the action, the fee, the block, the debit** (`df30010`).

`cancelBookingAsHost(bookingId, reason)` runs gate → rate-limit → atomic status-scoped flip → audit → auto-block → debit → refund → notify → revalidate. `loadOwnedBooking` was split into a shared `loadBookingRow` plus two gates (`loadOwnedBooking` for the booker, `loadHostOwnedBooking` for the host), so both paths read one identical row shape and neither can drift.

`previewHostCancelFee` returns the **already-capped** fee plus the host's outstanding debt, both computed by the same pure `cappedHostCancelFee` the write path uses — the preview and the charge cannot disagree.

`removeBlock` in `blocks.ts` now refuses to delete a block whose `reason = 'host_cancellation'`.

**Task 2 — the two-pane dialog and the host detail page** (`59c08ff`). Pane 1 is a required reason select over the five D-70 options; pane 2 renders all three consequences plus the required acknowledgment. Both buttons neutral; no coral, no `variant="destructive"`. `/host/bookings/[id]` re-gates session + `canHost`, owner-scopes the query with `listing.host_id` in the WHERE, and returns a bare `notFound()` for missing and not-mine alike.

**Task 3 — 16 integration cases** (`8df752f`). The plan asked for 10; six more were added (see *Additions*).

## Owner Gate — Verified by Mutation, and It Found a Real Gap

The gate was checked by removing it and watching the suite, exactly as 07-09 did.

| Mutation | `tests/payments/host-cancel.test.ts` |
|---|---|
| **Baseline** | 16 passed |
| **Remove the host gate, BEFORE the fix below** | **1 failed** — `crossHost.ok` was `true`. Our host genuinely cancelled another host's booking, refunded ₱1,050 of the platform's money, auto-blocked the other host's slot and charged them a ₱300 fee |
| **Remove the host gate, AFTER the fix** | **1 failed** — but now only on the *denial string*. The write was blocked; the other host's booking was byte-for-byte unmodified |

That middle row is the finding. **The host path had only ONE ownership layer**, where the booker path has two. `cancelBookingAsBooker` repeats its scope inside the UPDATE (`AND booker_id = ${userId}`) and its header documents that as deliberate defence in depth — but host ownership lives on the **listing**, not the booking, so it cannot be a bare column predicate and the plan's SQL simply omitted it. Fixed with an `EXISTS (SELECT 1 FROM listing l WHERE l.id = booking.listing_id AND l.host_id = ...)` in the same WHERE. The two-stage result above is the proof that the layers are now independently meaningful rather than one being decorative.

The file was restored from a pre-mutation copy and the gate line re-verified present before proceeding.

## Decisions Made

| Decision | Choice | Why |
|---|---|---|
| Clock reader on the host path | **None** | See Deviation 1 — the path evaluates no rung, so a JS Date would have nothing to compare against |
| Post-commit consequence failures | Individually try/caught into `needs_attention` audits | See Deviation 2 — an unguarded throw would 500 a cancellation that already succeeded and skip the refund |
| Host ownership in the UPDATE | `EXISTS` over the listing | See above — the mutation check proved this was load-bearing, not decorative |
| `removeBlock` refusal placement | Inside the DELETE's WHERE, `IS DISTINCT FROM` | A pre-read branch can be raced apart from the delete. `<>` would have been a live bug: `reason` is nullable and `NULL <> 'x'` is NULL, so every ordinary (reason-less) block would have become undeletable |
| Reason union home | `src/lib/validation/cancellation.ts` | One schema owns the union; the action re-exports the type from it, so the five values exist in exactly one place |
| Fee basis | `spacePriceCents`, not the all-in total | The fee must never exceed what the host would have **earned**, and the host never earns the platform's service fee |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] The plan's mandated `readDbNow` call on the host path is dead code**

- **Found during:** Task 1, writing the flip.
- **Issue:** The plan's step 5 says "Read the DB clock once (`SELECT now()`)". On the booker path that value feeds `quoteRefund`. The host path **deliberately does not call `quoteRefund`** (the plan says so itself, twice), and nothing else on the path consumes a JS `Date` — `composeWhenLabel` takes only `startsAt`/`endsAt`. The call would have been an unused binding, and satisfying the linter would have meant a `void now;` or a fake consumer: dead code wearing the name of a correctness control.
- **Fix:** No clock reader on this path, with a comment stating why the absence is the *stronger* position — Postgres `now()` inside the UPDATE's own `WHERE`/`SET` is the whole time authority, and it cannot be raced apart from the status check the way a read-then-compare in JS could be.
- **Files modified:** `src/app/actions/cancel-booking.ts`

**2. [Rule 2 — Missing critical functionality] Post-commit consequences could throw past a committed flip**

- **Found during:** Task 1, tracing the failure paths after the UPDATE.
- **Issue:** The plan sequences the auto-block insert and the debit INSERT as bare statements after the status flip. The flip has **already committed** at that point (this action opens no transaction). An exception from either — an FK violation, a transient connection error — would propagate out of the server action as a 500, **skip the refund dispatch entirely**, and hand the host an error for a cancellation that in fact succeeded and freed the slot. The booker's money would sit uncollected with no alert.
- **Fix:** Each consequence is individually try/caught into a `needs_attention` audit row plus a `[HOST_CANCEL_ALERT]` console line — the established operator-alert channel (D-58/D-90). A consequence can now fail **loudly** but never silently, and never by taking the others down with it. The refund is reached regardless.
- **Files modified:** `src/app/actions/cancel-booking.ts`

**3. [Rule 3 — Blocking] `removeBlock` is in `blocks.ts`, not `availability.ts`**

- **Issue:** The plan names `src/app/actions/availability.ts` in `files_modified`, its `<action>` and its acceptance criteria. That file exists but is a public **read-only** availability fetcher with no mutation of any kind; `removeBlock` lives in `src/app/actions/blocks.ts`.
- **Fix:** Hardened `blocks.ts`. The acceptance criterion `grep -c "host_cancellation" src/app/actions/availability.ts` is therefore **0 by design** — the equivalent grep on `blocks.ts` returns 2. Recorded below.

**4. [Rule 3 — Blocking] The test's Inngest client stub needed `createFunction`**

- **Issue:** This file imports `payout-sweep` and `payout-reconcile` for their pure `dbConn`-taking exports. Both modules build their cron function at **module load**, so the `{ send }`-only stub the sibling test files use threw `inngest.createFunction is not a function` on import, before any case ran.
- **Fix:** Added a `createFunction` stub alongside `send`, with a comment explaining why this file needs one and the sibling files do not.

**5. [Rule 1 — Bug, in my own test] The netting case was polluted by accumulated debt**

- **Issue:** Case (8) asserted `status === "paid"` and got `settled-by-netting`. Correct behaviour — by that point the shared host had accumulated ₱2,000 of debits from six earlier cases, which exceeded the ₱1,800 payout, so netting consumed the whole transfer. A true result, but not the one the case exists to pin.
- **Fix:** A dedicated third host (`NET_HOST_EMAIL`) with its own wallet, so the outstanding debt is exactly one debit and the transfer amount is exactly assertable. `host_payout.paymongo_account_id` is UNIQUE, so the wallet is mocked per-case with `mockResolvedValueOnce`.

### Assigned Out-of-Plan Fix

**[07-10 defect] `cancel-booking.ts` emitted root-relative hrefs — dead links in both its emails**

- **Issue:** `notifyCancellation` passed `href: "/host/bookings"` and `href: \`/bookings/${bookingId}\``. One payload string feeds **both** channels (D-91): the in-app dropdown resolves a same-origin absolute URL fine, but an email client has **no origin** to resolve a root-relative path against. Both of this action's emails carried a dead CTA — silently, in the message a booker most needs to act on.
- **Fix:** A local `appBaseUrl()` helper using the **existing** `BETTER_AUTH_URL ?? "http://localhost:3000"` convention — the same source `auth.ts`, `email.ts`, `paymongo-connect.ts`, `booking.ts:218`, `host-requests.ts:258`, `request-expiry.ts:188` and the PayMongo webhook already use. **No new env var was introduced.** The helper carries a ⚠️ comment naming the failure mode so the next author does not re-introduce it.
- **Regression assertions:** case (15) asserts every emitted href on the **host** path matches `/^https?:\/\//`; case (16) does the same for the **booker** path, which is where the defect originally lived.

### Additions Beyond the Plan

- **Six extra test cases** beyond the plan's ten: (11) the reconcile false-alarm, (12) the earnings view, (13) an unknown reason as a calm denial, (14) the audited rate-limit denial, (15)/(16) the href regression guards. (11) and (12) were requested by the execution brief; the rest cover branches the action has that the plan's ten did not reach.
- **A positive control inside case (6)** — an ordinary `reason IS NULL` block must still delete. Without it, the case would also pass against a `removeBlock` that refused *everything*, silently breaking the shipped Phase-3 unblock button for every host.
- **A fixture pre-assertion in case (1)** — before asserting the host refund is 100%, the case calls `quoteRefund` and asserts the fixture genuinely sits at the strict **0%** rung. Otherwise a booking that happened to be in a 100% rung anyway would pass while asserting nothing.
- **`revalidatePath` on the public listing page** for the host path. The auto-block changes public availability; without it the freed-then-blocked window would keep rendering as bookable to browsers — the exact resale window D-70 exists to close.

## Acceptance-Criteria Discrepancies

| Criterion | Stated | Actual | Assessment |
|---|---|---|---|
| `grep -c "ON CONFLICT (booking_id, kind) DO NOTHING"` | 1 | **2** | Exactly one **statement**; the second hit is the T-07-64 comment that explains why the INSERT is the lock. The 07-04 precedent. |
| `grep -c "retained_space_cents = 0"` | 1 | **2** | Same shape — one `SET` clause, one comment explaining why `0` and not `NULL`. |
| `grep -c "host_cancellation" src/app/actions/availability.ts` | ≥1 | **0** | **Not met, by design** — see Deviation 3. `blocks.ts` (the file that actually owns `removeBlock`) returns 2. |
| `grep -c "Keep booking" host-cancel-dialog.tsx` | 1 | **2** | Two panes, each with its own back button. A single shared one is not possible across the conditional render, and a pane without a way back would be a trap. |
| `grep -c "Checkbox"` | ≥1 | 2 | Met (import + element). |
| `grep -c "disabled"` | ≥2 | 7 | Met. |
| All other Task-1/2/3 greps | — | — | Met as stated. |

## Verification Performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` (all 6 new/modified files) | clean, 0 errors 0 warnings |
| `npm run build` | exit 0 — 27 routes, `/host/bookings/[id]` present |
| `npx vitest run tests/payments/host-cancel.test.ts` | **16 passed** |
| `npx vitest run tests/payments tests/booking tests/security tests/availability` | **37 files / 386 passed** |
| `npx vitest run tests/availability` (D-21 gate) | passed — the unblock hardening did not break the shipped path |
| **`npm test` (full suite)** | **73 files / 597 tests, exit 0** (was 72 / 581) |
| Owner-gate mutation (2 stages) | Red as designed both times; file restored and the gate line re-verified present |

### A note on `npm run build`

`next build` still fails on a clean checkout at page-data collection with `PLATFORM_WALLET_NUMBER / PLATFORM_WALLET_NAME are not set`, then `INNGEST_SIGNING_KEY is required in production` — the **pre-existing** env gap logged by 07-08 and re-logged by 07-09. To get a genuine build signal rather than assuming, the build was re-run with placeholder values for those four vars only, and passed. Unchanged and still out of scope; re-logged below.

## Deferred Items

- **`next build` requires four prod-guard env vars absent from `.env.local`** (`PLATFORM_WALLET_NUMBER`, `PLATFORM_WALLET_NAME`, `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`). Pre-existing; carried from 07-08 and 07-09.
- **No e2e for the host cancel journey.** The 16 integration cases drive the real action against a real schema, and `npm run build` proves the page and dialog compile and route, but nobody has clicked the two panes in a browser. A Playwright spec mirroring `e2e/cancel.spec.ts` would close this.

## Known Stubs

None. Every path is wired end to end: the dialog calls the real action, the action writes real refund columns and dispatches a real PayMongo refund on a refundable rail, the debit reaches 07-04's netting (proven, not assumed), and the auto-block reaches the read model by construction.

## Threat Register Status

| Threat ID | Disposition | How this plan discharges it |
|---|---|---|
| T-07-61 | mitigate | Two independent layers: `loadHostOwnedBooking` (hostId + canHost) before any write, **and** the `EXISTS` host scope inside the UPDATE. Verified by two-stage mutation. Case (10) asserts the denials byte-equal across cross-host and missing, plus a positive control. |
| T-07-62 | mitigate | `reason = 'host_cancellation'` + `IS DISTINCT FROM` in `removeBlock`'s DELETE. Case (6) proves the punitive block survives an unblock by its owning host, and that ordinary blocks still delete. |
| T-07-63 | mitigate | The action accepts only `(bookingId, reason)`; the fee is `Math.min(HOST_CANCEL_FEE_CENTS, spacePriceCents)` server-side, and the dialog renders a server prop. Case (2) asserts preview === charged. |
| T-07-64 | mitigate | `ON CONFLICT (booking_id, kind) DO NOTHING RETURNING id` with no app-level pre-check. Case (4) asserts exactly one debit, one refund and one block after two calls. |
| T-07-65 | mitigate | Auto-block on the same listing AND unit for the exact `[startsAt, endsAt)` window (case 5), undeletable (case 6), with the public listing page revalidated. |
| T-07-66 | mitigate | `recordAudit({ action: "host_cancel_booking", … })` carrying bookingId, reason, feeCents, refundCents, listingId; plus the required acknowledgment checkbox as a UI-level attestation. |
| T-07-67 | mitigate | `refund_cents = quoted_total_cents` written literally, tier deliberately not consulted. Case (1) uses a strict-tier 0% rung and **first proves the rung is genuinely 0%**. |
| T-07-68 | mitigate | `rateLimit("host-cancel:{userId}", { window: 60, max: 5 })`; case (14) asserts the key, the budget, the audited denial, and that nothing was written or dispatched. |

## Threat Flags

None. No new network endpoint, no new auth path, no file access pattern, no schema change. `/host/bookings/[id]` is a new route but sits entirely inside the existing `(host)` owner-gated boundary already in the register.

## For Downstream Plans

- **Anyone adding a `host_payout_ledger` query:** 07-04's rule now has real rows behind it. There is a live `kind='host_cancel_fee'` row in production data from the first host cancellation onward — an unscoped query will read a **negative** `net_cents` as a payout.
- **Anyone adding an `availability_block` delete path:** it must carry the `IS DISTINCT FROM 'host_cancellation'` refusal, or D-70's anti-resell consequence is defeated through the new path. There is exactly one such path today (`removeBlock`).
- **Plan 12 (booker detail page):** `/host/bookings/[id]` is the host-side mirror; clone its owner-scoped query shape and its bare `notFound()`. Its `Cancel booking` entry point sits below a `Separator` per D-104 — do the same on the booker side.
- **Plan 13 (reminders):** a host-cancelled booking has `status='cancelled'` and `retained_space_cents = 0`. Reminder queries must exclude cancelled bookings or a booker will be reminded about a session their host called off.
- **Anyone emitting a notification:** the `href` must be **absolute**. This regressed once already (fixed here); cases (15)/(16) are the guard, but they only cover the two cancel actions.

## Task Commits

1. **Task 1: the host cancel action + the unblock refusal + the href fix** — `df30010` (feat)
2. **Task 2: the two-pane dialog + the host booking detail page** — `59c08ff` (feat)
3. **Task 3: 16 integration cases + the in-WHERE host scope** — `8df752f` (test)

The in-WHERE host scope landed with Task 3 rather than Task 1 because the mutation check that justified it could only be run once the tests existed.

## Next Phase Readiness

ROADMAP SC#3 now has a complete product path and all four consequences are proven. Wave 4's remaining work is unblocked. No blockers.

---
*Phase: 07-bookings-management-cancellation-notifications*
*Completed: 2026-07-21*

## Self-Check: PASSED

All 7 claimed files verified present on disk and all 3 commit hashes verified in `git log`.
