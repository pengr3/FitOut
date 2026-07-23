---
phase: 07-bookings-management-cancellation-notifications
verified: 2026-07-23T07:47:55Z
status: passed
score: 4/4 roadmap success criteria verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: "3/4 roadmap success criteria fully verified; 1/4 partial (infra verified, content-accuracy failed)"
  gaps_closed:
    - "CR-01 — 0%-rung booker cancellation falsely claimed a refund was issued (notification + email)"
    - "CR-02 — request-approved/new-request/request-received emails stated flat, sometimes-wrong deadlines instead of the row's real D-96-capped deadline"
    - "WR-04 — host's own copy of a host-initiated cancellation used the booker's copy verbatim ('You're getting a full refund')"
    - "WR-06 — re-request silently repriced an hourly hold at the day rate after any host hourly-rate edit"
  gaps_remaining: []
  regressions: []
gaps: []
deferred: []
human_verification: []
---

# Phase 7: Bookings Management, Cancellation & Notifications Verification Report

**Phase Goal:** Both sides can see and manage their bookings through their full lifecycle, cancellations resolve to correct, policy-driven refunds with the refund amount shown before confirming, and a reliable async transactional-email layer keeps everyone informed.
**Verified:** 2026-07-23T07:47:55Z
**Status:** passed
**Re-verification:** Yes — after gap-closure plan 07-17 (commits 6f887c3..bbada20, 9 commits, red-first TDD)

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A booker and a host can each view upcoming and past bookings with a status lifecycle (pending/confirmed/declined/cancelled/completed) visible to both sides | ✓ VERIFIED | Unchanged since initial verification. `src/app/(app)/bookings/page.tsx` + `src/app/(host)/host/bookings/page.tsx` both render from the owner-scoped, DB-clock-partitioned `bookings-query.ts`; single shared `deriveBookingStatusView` derivation. No regression: `tests/security/bookings-owner-scope.test.ts` and `tests/booking/views.test.ts` still pass in the re-run full suite. |
| 2 | A booker can cancel a booking and see the exact refund amount before confirming, with the refund issued per the listing's named cancellation policy tier | ✓ VERIFIED | Unchanged mechanics since initial verification (preview and action share `quoteRefund` + the same DB clock). **Now also closes CR-01**: the post-cancellation communication about that refund is truthful at every rung, including the 0% rung (see gap-closure evidence below). |
| 3 | A host-initiated cancellation produces a full refund to the booker with defined consequences | ✓ VERIFIED | Unchanged mechanics (100% refund incl. service fee, audit row, auto-block, capped signed fee debit — all previously verified). **Now also closes WR-04**: the host's own notification/email states the host's actual situation (they cancelled; the guest is refunded; the fee they owe) instead of the booker's copy. |
| 4 | Users receive transactional emails for key booking events via a reliable async layer that never blocks the booking transaction | ✓ VERIFIED | Delivery mechanism was already verified working. **CR-02 now closed**: `sendRequestApproved`/`sendNewRequestToHost` render the row's real D-96-capped `payByLabel`/`respondByLabel` (confirmed threaded through in `notify.ts:90-120`); `sendRequestReceived` makes no numeric claim; the `APPROVAL_SLA_HOURS`/`APPROVAL_PAYMENT_WINDOW_HOURS` import and every renderer of those constants are gone from `email.ts` (grep gate independently re-run: `0`). Email and in-app copy now provably agree for the same event (test (C) in `tests/notifications/notify.test.ts` asserts `describeNotification(...)` contains the identical label the email contains). |

**Score:** 4/4 roadmap success criteria fully verified. No remaining gaps against the four stated success criteria.

### Gap-Closure Verification (07-17)

Each of the four gaps from the initial verification was independently re-checked by reading the actual diffed source (not the SUMMARY's prose) and by re-running the tests myself.

| Gap | Claimed Fix | Verified In Source | Verified By Test |
|-----|-------------|---------------------|-------------------|
| CR-01 | `notifyCancellation` takes `refundCents: number \| null`; suppresses `refund_issued` unless `refundCents > 0`; toast branches on `res.refundCents > 0` | `src/app/actions/cancel-booking.ts:280-325` (guard now `if (refundCents !== null && refundCents > 0)`, label composed only past the guard), call sites at `:633` (`quote.totalRefundCents`) and `:707` (`null`) confirmed. `src/components/booking/cancel-confirm.tsx:44-48` confirmed branching on `res.refundCents > 0`. | `tests/booking/cancellation.test.ts` case `(14 · CR-01)`: 0%-rung paid cancellation asserted to emit **zero** `refund_issued` envelopes and exactly one host notice, `createRefund` not called. Case `(14b · CR-01 positive control)`: 50%-rung cancellation still emits the exact `formatMoney` amount. Both independently re-run, both pass. |
| CR-02 | `sendForType` threads `payload.payByLabel`/`respondByLabel` into the two senders; `sendRequestReceived` states no number; `APPROVAL_*` constants removed from `email.ts` | `src/inngest/functions/notify.ts:90-120` confirmed threading both labels. `src/lib/email.ts` confirmed: no `APPROVAL_` import at top of file, `sendRequestApproved`/`sendNewRequestToHost` now take and render `payByLabel`/`respondByLabel` (escaped), `sendRequestReceived` states "We'll let you know as soon as they respond." with no number. Grep gate independently re-run: `grep -v '^\s*//' src/lib/email.ts \| grep -cE 'APPROVAL_(SLA\|PAYMENT_WINDOW)_HOURS'` → `0`. | `tests/notifications/notify.test.ts` cases (A)/(B)/(C)/(D): email contains the row's real label, does not match `/within\s+\d+\s+hours/i`, in-app `describeNotification` body contains the same label (two-channel parity), `request_received` makes no numeric claim. All independently re-run, all pass. |
| WR-04 | `side: "booker" \| "host"` + optional `feeLabel` on `booking_cancelled_by_host` in both the TS union and Zod union; new `sendHostCancellationRecord`; host branch in `describeNotification`; both emission sites in `cancelBookingAsHost` declare `side` | `src/lib/db/schema.ts:430-443` and `src/lib/validation/notification.ts:117-127` both confirmed to carry `side`/`feeLabel` (parity assertion `_PayloadUnionParity` still compiles — confirmed by clean `tsc --noEmit`). `notify.ts:132-154` branches on `payload.side === "host"`. `notification-item.tsx:168-180` renders host-perspective copy on `side === "host"`, booker copy otherwise (including `undefined`, i.e. durable pre-fix rows). `cancel-booking.ts:1025-1052` confirmed both emission sites declare `side: "booker"` / `side: "host"` with `feeLabel` gated on `feeCents > 0`. | `tests/notifications/notification-render.test.tsx`: host-side copy asserted, booker-side byte-unchanged positive control, and an explicit **durable pre-07-17 row (no `side` field)** positive control confirmed present and passing. `tests/notifications/notify.test.ts`: host email contains "You cancelled" + both money figures, does not contain "You're getting"; booker email positive control unchanged. `tests/payments/host-cancel.test.ts` asserts on the real emitted envelope's `payload.side`/`feeLabel`. All independently re-run, all pass. |
| WR-06 | New nullable `booking.full_day` column (drizzle/0016), written by `createPendingHold`, read by `reRequestSameWindow` in place of the current-rate-inequality derivation | `drizzle/0016_booking_full_day.sql` confirmed to contain only `ALTER TABLE "booking" ADD COLUMN "full_day" boolean;`; journal confirmed at 17 entries, idx 16 = `0016_booking_full_day`, applied. `src/lib/db/schema.ts:632` confirmed `fullDay: boolean("full_day")`. `src/lib/availability/units.ts:476` confirmed `fullDay` is now in the `createPendingHold` insert `.values()`. `src/app/actions/re-request.ts:234-236` confirmed the derivation is now `row.fullDay ?? (day-rate-positive-match fallback)` — the current-hourly-rate inequality is no longer consulted anywhere on this path. | `tests/booking/re-request.test.ts`: hourly re-request after a host hourly-rate edit asserted to persist `spacePriceCents === NEW_HOURLY × hours` and explicitly `!== DAY_RATE`; genuine full-day re-request positive control asserted to stay `spacePriceCents === DAY_RATE`. Independently re-run, passes. |

**Migration/constraint safety independently re-confirmed:** `booking_no_overlap` GiST exclusion constraint chain (0005 → 0012_v2) is untouched by migration 0016, which contains only the single `ADD COLUMN` statement — confirmed by direct file read.

### Required Artifacts (delta since initial verification)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/actions/cancel-booking.ts` | Amount-keyed refund-notice suppression + side-discriminated host payloads | ✓ VERIFIED | Both fixes confirmed at the exact cited line ranges. |
| `src/lib/email.ts` | Row-derived deadline labels; no flat `APPROVAL_*` renderer; new `sendHostCancellationRecord` | ✓ VERIFIED | `sendHostCancellationRecord` confirmed present and exported; grep gate = 0. |
| `src/inngest/functions/notify.ts` | Threads `payByLabel`/`respondByLabel`; branches `booking_cancelled_by_host` on `side`; no `default:` clause | ✓ VERIFIED | Confirmed; switch remains exhaustive with the trailing `never` weld intact (compiles clean). |
| `src/lib/db/schema.ts` / `src/lib/validation/notification.ts` | `side`/`feeLabel` added to both unions, provably equal | ✓ VERIFIED | `_PayloadUnionParity` still compiles (tsc clean) — the two unions cannot have silently drifted. |
| `drizzle/0016_booking_full_day.sql` | Nullable `full_day` boolean, backfill-free | ✓ VERIFIED | Single-statement migration, applied, journal confirms idx 16. |
| `src/app/actions/re-request.ts` | `fullDay` read from the persisted flag, not re-derived against the current rate | ✓ VERIFIED | Current-hourly-rate inequality confirmed removed from the price-determining path. |
| `tests/booking/cancellation.test.ts`, `tests/notifications/notify.test.ts`, `tests/notifications/notification-render.test.tsx`, `tests/payments/host-cancel.test.ts`, `tests/booking/re-request.test.ts` | Content-pinning regressions in both directions | ✓ VERIFIED | All read directly; assertions are on captured envelope/email/render content, not call counts, exactly as claimed. 76/76 pass in a targeted re-run; 655/655 pass in a full independent re-run. |

All artifacts from the initial verification (SC#1-3's supporting files, the notification infra, the payout sweep/reconcile, the reminders cron, the notification bell, the cancellation-policy disclosure, the QRPh refund path) remain unchanged and unregressed — confirmed by `git diff --stat` scope guard (no touches to `webhook/route.ts`, `when-label.ts`, `payout-sweep.ts`, `payout-reconcile.ts`, `paymongo.ts` between the pre-gap-closure commit and `bbada20`) and by the full suite passing at a higher count (655 vs. the prior 639) with zero failures.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Targeted gap-closure suites | `npx vitest run tests/booking/cancellation.test.ts tests/notifications/notify.test.ts tests/notifications/notification-render.test.tsx tests/payments/host-cancel.test.ts tests/booking/re-request.test.ts` | 5 files, 76 tests passed | ✓ PASS (independently re-run by this verifier, not merely cited) |
| Full project suite | `npx vitest run` | 78 files / 655 tests, exit 0 | ✓ PASS (independently re-run by this verifier; matches both the executor's report and the orchestrator's parallel run) |
| TypeScript compile | `npx tsc --noEmit` | exit 0, no output | ✓ PASS (independently re-run) |
| Scope guard — no drive-by changes to other 07-REVIEW findings | `git diff --stat` against `webhook/route.ts`, `when-label.ts`, `payout-sweep.ts`, `payout-reconcile.ts`, `paymongo.ts` | empty diff | ✓ PASS (independently re-run) |
| Migration journal / constraint safety | Direct read of `drizzle/0016_booking_full_day.sql` + `meta/_journal.json` | single ADD COLUMN; idx 16 applied; `booking_no_overlap` chain untouched | ✓ PASS (independently re-confirmed) |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|--------------|--------|----------|
| BOOK-07 | Booker can cancel subject to cancellation/refund policy | ✓ SATISFIED | Unchanged; CR-01 closure improves the truthfulness of the surrounding communication without touching the money mechanics. |
| PAY-06 | Cancellations issue refunds per policy | ✓ SATISFIED | Unchanged mechanics; WR-04 closure additionally makes the host's own record of the fee/refund consequence truthful. |
| HOST-02 | Host can view upcoming/past bookings with status | ✓ SATISFIED | Unchanged, unregressed. |
| MANAGE-01 | Booker can view upcoming/past bookings with status | ✓ SATISFIED | Unchanged, unregressed. |
| MANAGE-02 | Status lifecycle visible to both sides | ✓ SATISFIED | Unchanged, unregressed. |
| MANAGE-03 | Transactional emails for key booking events | ✓ SATISFIED (upgraded from partial) | CR-02 closure removes the only remaining content-accuracy defect in the notification layer; delivery mechanism was already satisfied. |

No orphaned requirements. All six requirement IDs assigned to Phase 7 remain accounted for.

### Anti-Patterns — Resolution Status

| Finding | Original Severity | Status After 07-17 |
|---------|-------------------|---------------------|
| CR-01 (false ₱0 refund notice) | 🛑 Blocker | ✓ CLOSED — verified in source and by test |
| CR-02 (flat/false email deadlines) | 🛑 Blocker | ✓ CLOSED — verified in source and by test |
| WR-04 (host reads booker's refund copy) | ⚠ Warning | ✓ CLOSED — verified in source and by test |
| WR-06 (re-request day-rate repricing bug) | ⚠ Warning | ✓ CLOSED — verified in source and by test |
| WR-01 (payout retry recomputes commission) | ⚠ Warning | Open — not in scope for this gap-closure plan (user-approved exclusion; confirmed no file touched) |
| WR-02 (idempotency-key replay on retry) | ⚠ Warning | Open — same as above |
| WR-03 (webhook amount-blind refund handling) | ⚠ Warning | Open — same as above |
| WR-05 (`cancelled_by` NULL on gone-slot) | ⚠ Warning | Open — same as above |
| WR-07 through WR-09, IN-01 through IN-11 | ℹ Info/Warning | Open — none were approved for this gap-closure plan; none block any of the four roadmap success criteria |

The remaining open items (WR-01/02/03/05/07/08/09 and the Info-level findings) were explicitly out of scope for this user-approved gap-closure pass and do not gate any of the four roadmap success criteria — none concerns the view/manage lifecycle (SC#1), the booker cancel-and-preview flow (SC#2), the host-cancellation consequences (SC#3), or the notification-content accuracy that was the specific subject of this re-verification (SC#4). They remain documented in `07-REVIEW.md` for a future pass if the team chooses to schedule one.

### Human Verification Required

None. Every truth and every claimed fix was independently verified by direct source reading and by independently re-running (not merely citing) the relevant test suites — targeted (76 tests) and full (655 tests) — plus `tsc --noEmit`. The A3 batch-transfer-idempotency item (PayMongo Money Movement feature gating) remains explicitly BLOCKED pending the vendor enabling the feature, as documented in `refund-rail.ts`; it does not gate any of this phase's four roadmap success criteria and was already correctly flagged rather than silently assumed passing in the initial verification.

### Gaps Summary

All four gaps identified in the initial verification (CR-01, CR-02, WR-04, WR-06) are closed. Each was independently re-verified against the actual diffed source — not the SUMMARY's prose — and against a fresh, independent run of both the targeted test files and the full suite (78 files / 655 tests, exit 0, matching the executor's and the orchestrator's counts). The fixes are structurally sound: CR-01 keys suppression on the refund amount rather than label nullity (eliminating the whole class of "truthy formatted-zero" bugs); CR-02 threads already-computed, already-correct deadline strings through one more function call rather than re-deriving anything; WR-04 adds a `side` discriminant that degrades safely for durable pre-fix rows (verified by an explicit positive-control test); WR-06 introduces a minimal, backfill-free, non-default column that makes a previously re-derived (and therefore drift-prone) fact into a persisted, price-determining snapshot. No regressions were found in unrelated Phase 7 surfaces (SC#1-3's mechanics, the payout pipeline, the QRPh refund path, the notification bell) — all continue to pass in the full suite, and a scope-guard diff confirms no unrelated files were touched.

All four roadmap success criteria for Phase 7 are now verified. The phase goal — both sides can see and manage bookings through their full lifecycle, cancellations resolve to correct policy-driven refunds shown before confirming, host cancellations produce a full refund with defined consequences, and a reliable async email layer keeps everyone informed — is achieved.

---

_Verified: 2026-07-23T07:47:55Z_
_Verifier: Claude (gsd-verifier)_
