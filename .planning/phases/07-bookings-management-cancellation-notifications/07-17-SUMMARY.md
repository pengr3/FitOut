---
phase: 07-bookings-management-cancellation-notifications
plan: 17
subsystem: notifications
tags: [gap-closure, notifications, email, refunds, pricing, drizzle, migration]

# Dependency graph
requires:
  - phase: 07-bookings-management-cancellation-notifications
    provides: "cancel-booking actions (07-09/07-11), notify fan-out + sendForType (07-07/07-10), notification centre + describeNotification (07-14), re-request (07-12), payment_method column (07-09)"
provides:
  - "CR-01 closed: refund_issued suppression keyed on the AMOUNT inside notifyCancellation — a 0%-rung cancellation emits no refund claim in any channel; toast branches on res.refundCents"
  - "CR-02 closed: sendRequestApproved/sendNewRequestToHost render the row's D-96-capped payByLabel/respondByLabel; sendRequestReceived states no numeric deadline; APPROVAL_* constants have no renderer in email.ts"
  - "WR-04 closed: booking_cancelled_by_host payload gains required side ('booker'|'host') + optional feeLabel; new sendHostCancellationRecord email; host-perspective in-app copy; durable pre-fix rows keep booker copy"
  - "WR-06 closed: booking.full_day column (drizzle/0016) persisted by createPendingHold; re-request reads the snapshot — the current-hourly-rate inequality is no longer a full-day trigger on any pricing path"
affects: [phase-7-verification, notifications, payments, re-request, booking-schema]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Money-event notices key suppression on the AMOUNT and compose the label past the guard — no call site can hand a formatter-produced truthy '₱0' string"
    - "Deadline claims in emails render the ROW's pre-composed capped label; config hour-constants never appear in email copy (a template with no deadline field states NO number)"
    - "Audience discriminant (`side`) on shared notification types; renderers treat anything !== 'host' (incl. missing) as booker so durable rows keep their meaning"
    - "Creation-time pricing-mode snapshot (booking.full_day): price-determining consumers read the column, never re-derive against current listing rates"

key-files:
  created:
    - drizzle/0016_booking_full_day.sql
    - drizzle/meta/0016_snapshot.json
  modified:
    - src/app/actions/cancel-booking.ts
    - src/components/booking/cancel-confirm.tsx
    - src/inngest/functions/notify.ts
    - src/lib/email.ts
    - src/lib/db/schema.ts
    - src/lib/validation/notification.ts
    - src/components/notifications/notification-item.tsx
    - src/app/actions/re-request.ts
    - src/lib/availability/units.ts
    - drizzle/meta/_journal.json
    - tests/booking/cancellation.test.ts
    - tests/notifications/notify.test.ts
    - tests/notifications/notification-render.test.tsx
    - tests/payments/host-cancel.test.ts
    - tests/booking/re-request.test.ts

key-decisions:
  - "notifyCancellation takes cents (number|null), not a label — suppression-by-construction: the ₱-label is composed at the single point past the amount guard"
  - "WR-04 is a `side` discriminant on the EXISTING notification type, not a new pgEnum value — no migration, and the compile-enforced contract stays exactly four files (TS union, Zod union, sendForType, describeNotification), no default clauses"
  - "feeLabel emitted only when the charged fee > 0 — a '₱0 fee' claim would be CR-01's disease in a new place"
  - "request_received email states NO number instead of gaining a deadline field (07-VERIFICATION explicitly allows softening; a numberless claim cannot be false)"
  - "re-request pre-0016 fallback treats a row as full-day ONLY on a positive day-rate match that is not also an exact hourly match — biased to hourly on coincidence; an hourly-rate edit can no longer flip anything to full-day"
  - "when-label.ts deliberately untouched — its identical derivation is display-only (IN-09), not approved for this plan"

patterns-established:
  - "Content-pinning regression tests: assert on captured envelope payloads / email bodies / persisted money fields — never call counts (all four of these bugs passed 639 green tests because nothing asserted content)"

requirements-completed: [MANAGE-03, PAY-06]

# Metrics
duration: 25min
completed: 2026-07-23
---

# Phase 7 Plan 17: Gap Closure (CR-01, CR-02, WR-04, WR-06) Summary

**Four red-first content-truth fixes: amount-keyed refund-notice suppression, row-derived email deadlines, a `side`-discriminated host-cancellation record, and a persisted `booking.full_day` pricing-mode snapshot (drizzle/0016).**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-23T07:13:59Z
- **Completed:** 2026-07-23T07:39:17Z
- **Tasks:** 4 (all tdd=true, red-first)
- **Files modified:** 17 (2 created, 15 modified)

## Accomplishments

- **CR-01** — `notifyCancellation` now takes `refundCents: number | null` and emits `refund_issued` only when `> 0`, composing the `formatMoney` label at the single point past the guard. A 0%-rung cancellation emits exactly one envelope (the host notice) and zero refund claims; the toast reads "Booking cancelled." with no refund sentence. Positive control pins that a 50%-rung cancellation still announces the exact server-computed amount.
- **CR-02** — `sendForType` threads `payload.payByLabel` / `payload.respondByLabel` into `sendRequestApproved` / `sendNewRequestToHost`; the templates render "Pay {total} by {payBy}" / "Respond by {respondBy}" (escapeHtml'd — the labels carry venue city strings). `sendRequestReceived` states no number at all ("We'll let you know as soon as they respond.") while keeping the D-63 not-charged reassurance. The `APPROVAL_*` import is deleted; the comment-safe grep gate outputs 0. In-app and email copy now state the same deadline for the same event (D-91 parity, test-pinned).
- **WR-04** — the `booking_cancelled_by_host` payload gains a required `side: "booker" | "host"` and optional `feeLabel` in BOTH the TS union and the Zod union (`_PayloadUnionParity` holds). New `sendHostCancellationRecord` email and a host branch in `describeNotification` give the canceller their own truthful record — the guest's full refund and the D-71 fee, finally in writing. The booker's copy is byte-unchanged and durable pre-07-17 rows (no `side`) still render it — both pinned as positive controls. No `default:` clauses anywhere; `tsc` caught the one other payload constructor.
- **WR-06** — `booking.full_day` (nullable boolean, drizzle/0016, journal idx 16, applied to the live DB and idempotent, `booking_no_overlap` untouched) is written by `createPendingHold` on every new hold and read authoritatively by `reRequestSameWindow`. An hourly re-request after a host hourly-rate edit persists `spacePriceCents = newRate × hours` (was: the flat day rate); a genuine full-day re-request stays day-rate priced.

## Red-Test Evidence (verbatim failing assertions, pre-fix)

- **CR-01 (case 14):** `AssertionError: expected [ { name: 'fitout/notify', …(1) } ] to have a length of +0 but got 1` — the captured envelopes for a 0%-rung cancellation contained a `refund_issued` payload. Positive control 14b was green pre-fix by design (it pins the non-zero behaviour the fix must not break).
- **CR-02 (4 cases red):** `(B)` `expected '<p><strong>New booking request…' to contain 'Fri, Jul 4, 6:30 AM (Manila time)'` — received html read "…Respond within 24 hours to approve or decline."; `(C)` in-app body `'Cassie · Court A · Fri, Jul 4, 9:00 AM – 10:00 AM (Manila time)'` contained no deadline; `(D)` `expected '…You'll hear back within 24 hours…' not to match /\d+\s+hours/i`; `(A)` failed identically on "within 12 hours".
- **WR-04 (5 runtime failures + compile block):** render `side:'host'` returned title "Your host cancelled" (booker copy to the canceller); email `side:'host'` html contained "You're getting a full refund"; emission `payload.side` was `undefined`. And `npx tsc --noEmit`: `error TS2353: 'side' does not exist in type '{ type: "booking_cancelled_by_host"; … }'` — the compile-enforced half of the red state. Booker-side positive controls were green pre-fix (byte-unchanged pins).
- **WR-06 (case 7):** `AssertionError: expected 300000 to be 120000` — the re-request after a rate edit persisted the flat `DAY_RATE` instead of `newHourlyRate × hours`.

## New Payload Contract

`booking_cancelled_by_host` now carries:
- `side: "booker" | "host"` (**required** on every new write; the Zod write boundary enforces it). Renderers treat anything `!== "host"` — including `undefined` on durable pre-07-17 jsonb rows — as booker, so old rows keep the meaning they were written with.
- `feeLabel?: string` — present only on the host side and only when the charged (capped) D-71 fee > 0; composed from the same `cappedHostCancelFee` figure the debit row records.

Adding/altering a notification payload remains a four-file compile-enforced change: `schema.ts` TS union, `validation/notification.ts` Zod union, `sendForType`, `describeNotification` — no `default:` clauses, `never` welds intact.

## New Column and Its Consumers

`booking.full_day` (nullable boolean, no default, backfill-free — pre-0016 rows stay NULL):
- **Writer:** `createPendingHold` (`units.ts`) — persists the same flag `quoteWindow` froze the price with, on every hold (instant, request, re-request).
- **Reader:** `reRequestSameWindow` — `row.fullDay ?? (dayRateCents != null && spaceCents === dayRateCents && spaceCents !== hourlyTotal)`. The persisted flag is authoritative; the fallback (pre-0016 rows only) requires a positive day-rate match and biases to hourly on coincidence. Inequality-with-the-current-hourly-rate is no longer a full-day trigger anywhere on the pricing path.
- **Non-consumer by decision:** `when-label.ts` keeps its display-only derivation (IN-09, not approved for this plan).

## Task Commits

1. **Task 1 CR-01** — RED `6f887c3` (test), GREEN `12be33f` (fix)
2. **Task 2 CR-02** — RED `acc4c0e` (test), GREEN `1545730` (fix)
3. **Task 3 WR-04** — RED `c192b3f` (test), GREEN `9c51ce7` (fix)
4. **Task 4 WR-06** — RED `58d2539` (test), GREEN `c46f2cf` (fix)

_TDD note: GREEN commits use the `fix()` type (not `feat()`) because all four close reviewed defects — the RED→GREEN sequence per task is intact._

## Verification Results

- **Targeted suites:** `cancellation` + `notify` + `notification-render` + `host-cancel` + `re-request` → 5 files, 76 tests, exit 0.
- **Full suite:** 78 files / **655 tests**, exit 0 (was 78/639 — 16 new content-pinning cases).
- **`npx tsc --noEmit`:** exit 0.
- **Content gates:** `grep -v '^\s*//' src/lib/email.ts | grep -cE 'APPROVAL_(SLA|PAYMENT_WINDOW)_HOURS'` → **0**; no `default:` in the payload switches of `notify.ts` / `notification-item.tsx`.
- **Migration state:** journal idx 16 = `0016_booking_full_day`; the file contains only `ALTER TABLE "booking" ADD COLUMN "full_day" boolean;`; applied to the live DB, second run idempotent; `booking_no_overlap` present and untouched.
- **Build:** `PLATFORM_WALLET_NUMBER=x PLATFORM_WALLET_NAME=x INNGEST_SIGNING_KEY=x npm run build` → success (only the known Better Auth Google-provider WARNs).
- **Lint:** every file this plan touched lints clean (`npx eslint <files>` exit 0). Two pre-existing findings logged to `deferred-items.md` (stale `.claude/worktrees/*/.next` junk breaking bare `npm run lint`; one `react-hooks` error in `address-autocomplete.tsx`, a Phase-4 file).
- **Scope guard:** `git diff --name-status` since baseline = exactly the plan's `files_modified` list. No changes to WR-03 (webhook amount), WR-05 (cancelled_by), WR-01/02 (payout retry), IN-06 (notice toast preference), IN-09 (when-label), or any other 07-REVIEW finding.

## Decisions Made

See frontmatter `key-decisions`. The load-bearing one: WR-04 as a `side` discriminant on the existing type (no new enum value, no fifth file, no migration) — exactly as the plan prescribed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/omission in task file list] `describeNotification`'s `new_request_to_host` body gained the respond-by deadline**
- **Found during:** Task 2 (CR-02)
- **Issue:** The plan's Test C demands two-channel parity — `describeNotification(payload).body` must contain `respondByLabel` for the same event the email states it for — but the in-app body was `bookerLabel · listingTitle · whenLabel` with no deadline, and `notification-item.tsx` was not in Task 2's `<files>` list (it IS in the plan's frontmatter `files_modified`).
- **Fix:** Appended ` · respond by ${payload.respondByLabel}` to that body (information added, nothing removed — mirrors the existing `reminder_pre_sla` phrasing).
- **Files modified:** src/components/notifications/notification-item.tsx
- **Verification:** Test C green; no existing test asserted the old body copy.
- **Committed in:** 1545730 (Task 2 fix commit)

**2. [Rule 1 - Pre-existing comment tripping the plan's grep gate] `sendReminderPreSla` JSDoc named `APPROVAL_SLA_HOURS`**
- **Found during:** Task 2 acceptance gate
- **Issue:** The comment-safe gate strips `//` lines but not JSDoc ` * ` lines; a pre-existing doc comment named the constant and left the gate at 1.
- **Fix:** Reworded the comment ("NOT the configured hour count from now") — same meaning, no constant name. The gate itself was not touched.
- **Files modified:** src/lib/email.ts
- **Verification:** Gate outputs 0; the constant genuinely has no renderer or reference in email.ts.
- **Committed in:** 1545730 (Task 2 fix commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1, both within Task 2's intent).
**Impact on plan:** None adverse — both were required to satisfy the plan's own test spec and acceptance gate. No scope creep.

## Known Stubs

None — no placeholder values, TODO markers, or unwired data paths were introduced. The `notice` field preference on the cancel toast (IN-06) remains deliberately unwired per the plan's explicit scope exclusion.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary schema beyond the plan's threat model. All five register mitigations applied: new email interpolations escapeHtml'd (T-07-17-01), new payload fields are display-only strings (T-07-17-02), refund/fee claims amount-gated (T-07-17-03), `full_day` written only by `createPendingHold` from server-validated input (T-07-17-04), four-file compile parity preserved (T-07-17-05).

## Issues Encountered

- Bare `npm run lint` is unusable as a gate on this machine due to a stale `.claude/worktrees/naughty-fermat-9d894d/.next/build` directory being scanned by eslint's flat config (1,057 pre-existing errors, all in generated output). Verified out of scope and logged to `deferred-items.md`; plan-touched files linted individually, clean.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four user-approved verification/review findings (CR-01, CR-02, WR-04, WR-06) are closed with content-pinning regressions in both directions — ready for `/gsd-verify-work 7` re-verification.
- Migration chain now ends at idx 16 (`0016_booking_full_day`); the per-test schema replay picks it up automatically.
- Remaining 07-REVIEW warnings (WR-01/02/03/05/07/08/09) and info items were NOT approved for this plan and remain open as documented.

## Self-Check: PASSED

- Created files exist on disk: 07-17-SUMMARY.md, drizzle/0016_booking_full_day.sql, drizzle/meta/0016_snapshot.json — all FOUND
- All 8 task commits present in git log: 6f887c3, 12be33f, acc4c0e, 1545730, c192b3f, 9c51ce7, 58d2539, c46f2cf — all FOUND
- Content gates re-run at summary time: APPROVAL_* grep gate = 0; `default:` count in notify.ts and notification-item.tsx = 0/0; journal tail = idx 16 `0016_booking_full_day`
- Full suite 78 files / 655 tests exit 0; `npx tsc --noEmit` exit 0; env-prefixed `npm run build` success

---
*Phase: 07-bookings-management-cancellation-notifications*
*Completed: 2026-07-23*
