---
phase: 07-bookings-management-cancellation-notifications
plan: 12
subsystem: booking-detail-lifecycle
tags: [D-97, D-99, D-102, D-104, D-79, re-request, lapse-recovery, cancel-entry, detail-page, owner-gate, MANAGE-01, MANAGE-02, BOOK-07]
requires:
  - createPendingHold
  - mapBookingError
  - getAvailability
  - readDbNow
  - deriveDisplayStatus
  - BookingStatusBadge
  - cancelUnpaidHold
  - "/bookings/[id]/cancel"
  - emitNotify
  - composeWhenLabel
  - composeDeadlineLabel
  - APPROVAL_SLA_HOURS
  - MIN_LEAD_REQUEST_HOURS
provides:
  - reRequestSameWindow
  - ExpiredApprovalState
  - ExpiredApprovalSlot
  - CancelRequestDialog
  - RequestCountdownReason
  - "cancel entry point on /bookings/[id]"
  - "cancelled + derived-completed branches on /bookings/[id]"
  - "RequestRow countdownReason slot"
affects:
  - src/app/(app)/bookings/[id]/page.tsx
  - src/app/(host)/host/requests/page.tsx
  - src/components/host/request-row.tsx
  - e2e/cancel.spec.ts
tech-stack:
  added: []
  patterns:
    - "Recovery-by-fresh-INSERT: a terminal booking is never flipped back; a new row is minted so the GiST EXCLUDE re-adjudicates occupancy"
    - "Render-time availability read as a courtesy gate — the CTA is withheld when it would certainly fail, and the server re-validates regardless"
    - "A server component passed as a ReactNode slot into a client row, so one node serves both the desktop table and the mobile card"
    - "A counting rate-limit stub, so 'the sixth call' is exercised literally rather than by flipping a boolean"
    - "Spending the rate-limit budget on a request that fails a LATER guard, so the limiter case mints nothing"
key-files:
  created:
    - src/app/actions/re-request.ts
    - src/components/booking/expired-approval-state.tsx
    - src/components/booking/cancel-request-dialog.tsx
    - src/components/host/request-countdown-reason.tsx
    - tests/booking/re-request.test.ts
  modified:
    - src/app/(app)/bookings/[id]/page.tsx
    - src/app/(host)/host/requests/page.tsx
    - src/components/host/request-row.tsx
    - e2e/cancel.spec.ts
decisions:
  - "The lapse guard reads 'holds no live window' (expires_at IS NULL OR <= now()), because both retirement paths CLEAR expires_at — the plan's literal 'expires_at has passed' would have matched nothing"
  - "A lapsed approval is identified by cancelled_by IS NULL + booking_mode='request' + payment_id IS NULL; cancelled_by is what separates a system lapse from a party's decision"
  - "No stable idempotencyKey is passed to createPendingHold — booking_idem_uq is partial-UNIQUE over all time, so a key derived from the source id would 23505 with no active hold to replay and re-throw as a 500"
  - "A non-zero refund on the cancelled branch always reads 'on its way'; there is no settled-refund signal on a booking row, so the 'refunded' variant would be a D-57 violation"
  - "The expired-approval copy carries a deadline-free variant, because expires_at is not retained past the terminal flip and the exact deadline is usually unknowable"
  - "Variant B splits into 'taken' and 'unavailable' helper copy — a past or too-soon window must not be described as one somebody else booked"
requirements-completed: [MANAGE-01, MANAGE-02, BOOK-07]
metrics:
  duration: ~75m
  completed: 2026-07-21
  tasks: 3
  commits: 3
---

# Phase 7 Plan 12: Booking Detail Completion & Lapse Recovery Summary

D-97 one-click re-request that mints a fresh constraint-validated hold instead of resurrecting a terminal
booking, plus the booking detail page's remaining lifecycle branches (cancel entry, cancelled, derived
completed) and D-99's cap-shortened-SLA explanation.

## What Was Built

**`reRequestSameWindow` (`src/app/actions/re-request.ts`).** Owner-gated, rate-limited, audited
resubmission of a lapsed request's *same window*. The client sends one booking id; the window comes off the
stored row and the price is re-frozen inside `createPendingHold` from the listing's current rates. The
structural rule the whole file is built around: **it inserts a new booking row and never flips a terminal one
back**, so the GiST `EXCLUDE` — the sole occupancy authority — re-adjudicates the slot on every attempt. The
file contains no statement that can modify an existing booking, which is what makes T-07-72 (re-request as a
route back through a cancellation or a host-cancel debit) structurally impossible rather than merely
prevented.

**`ExpiredApprovalState`** — the calm D-97 recovery surface with two variants, cloning the tone and shape of
the shipped `declined` landing. The resubmit CTA renders only when a render-time availability read says the
slot is genuinely free; the read is explicitly a courtesy, never the gate.

**The detail page (`src/app/(app)/bookings/[id]/page.tsx`).** Four additions, no shipped branch altered:
the D-104 cancel entry (a neutral outline **link** to the review route, below the primary content behind a
`Separator`), the no-money `CancelRequestDialog` on `requested`/`approved`, the D-97 lapse branch, and the
`cancelled` / derived-`completed` branches. `cancelled` joined `RENDERABLE`, which also fixed a live defect —
see Deviations.

**`RequestCountdownReason`** — D-99's one muted line, rendered only when the deadline is genuinely
cap-derived. `request-countdown.tsx` is untouched (`git diff --stat` empty), as the plan requires.

## Key Implementation Details

- **The clock.** `readDbNow(db)` is read once per page render and threaded into every status derivation, the
  completed derivation, and the availability read — so the badge, the tabs' SQL partition and the calendar
  cannot disagree about what time it is. No JS clock read exists on the page.
- **Double-submit idempotency** is `createPendingHold`'s own D-42 own-hold pre-check (active hold matching
  this booker + this exact window → replay the same id). A replayed hold deliberately emits no notification,
  so a double-click cannot send the host the same request twice.
- **Notifications** mirror `placeHold`'s request branch exactly — `request_received` to the booker and
  `new_request_to_host` to the host, both post-commit. A re-request *is* a new request; a reduced set would
  be the channel drift D-91 exists to prevent.
- **The host deadline in the re-request notification** is read off the row the insert just wrote, never
  `APPROVAL_SLA_HOURS` — under D-96 those differ on every short-notice re-request, which is the D-99 failure
  reproduced inside an email.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's lapse guard would have matched no row in production**

- **Found during:** Task 1
- **Issue:** The plan specifies the guard as `status IN ('declined','cancelled')` AND *"its `expires_at` has
  passed"*. Both retirement paths — `request-expiry.ts` and the in-transaction stale-hold sweep in
  `availability/units.ts` — **`SET expires_at = NULL`** when they flip a hold terminal. A guard reading
  `expires_at <= now()` alone is therefore false for every row it was written to match, and D-97 would have
  shipped dead: the button would render and every click would return "no longer available to resend".
- **Fix:** The guard is expressed as `expires_at IS NULL OR expires_at <= now()` — "this booking holds no live
  window any more", which is what was meant. Discriminators were added alongside it (`cancelled_by IS NULL`,
  `booking_mode = 'request'`, `payment_id IS NULL`) so a party cancellation, an instant hold and a paid
  booking can never enter the path.
- **Files modified:** `src/app/actions/re-request.ts`
- **Commit:** `940f66f`

**2. [Rule 1 - Bug] Confirming a cancellation landed on a 404**

- **Found during:** Task 2
- **Issue:** `RENDERABLE` excluded `cancelled`, so a booking that was *just cancelled* 404'd on the detail
  page. `CancelConfirm` (07-09) pushes to `/bookings/{id}` on success and `e2e/cancel.spec.ts` waits for that
  URL — so the shipped booker cancel flow ended on a dead page. Pre-existing, and squarely inside this plan's
  file.
- **Fix:** `cancelled` joins `RENDERABLE` and gets a real branch. `completed` deliberately stays out: it is
  derived, never stored (D-102), so a row carrying the enum value is a data fault rather than a state.
- **Files modified:** `src/app/(app)/bookings/[id]/page.tsx`
- **Commit:** `9158a47`

**3. [Rule 2 - Missing critical functionality] The "refunded" copy variant cannot be rendered truthfully**

- **Found during:** Task 2
- **Issue:** The plan asks the `cancelled` branch to render `₱1,000 refunded` when settled and
  `₱500 refund on its way` when not. There is **no settled-refund signal on a booking row**: the
  `payment.refunded` webhook writes settlement to `host_payout_ledger.state`, and a pre-session cancellation
  has no ledger row (the payout sweep runs at `endsAt + PAYOUT_DELAY_HOURS` and skips `cancelled`). Rendering
  "refunded" would therefore be claiming terminal refund state off the POST, which is exactly what D-57
  forbids.
- **Fix:** A non-zero refund always reads `₱X refund on its way` plus the muted timing note. The zero case
  keeps its mandated reason copy. A comment marks the branch as the landing site if a settlement signal is
  ever persisted.
- **Files modified:** `src/app/(app)/bookings/[id]/page.tsx`
- **Commit:** `9158a47`

**4. [Rule 1 - Bug] A stable idempotency key would have produced a 500**

- **Found during:** Task 1
- **Issue:** The obvious way to satisfy "a double-submit must not create two holds" is a stable
  `idempotencyKey` such as `rerequest:{sourceId}`. `booking_idem_uq` is a partial-UNIQUE over *all time*, so
  after a first re-request had itself lapsed, a second attempt would hit `23505`, find no *active* hold to
  replay, and re-throw — a raw 500 on a recovery surface.
- **Fix:** No key is passed. Idempotency rests on `createPendingHold`'s own-hold window match, which is scoped
  to live holds and is the correct guard here. Proven by case (1b).
- **Files modified:** `src/app/actions/re-request.ts`
- **Commit:** `940f66f`

**5. [Rule 2 - Truthfulness] Variant B copy split**

- **Found during:** Task 1
- **Issue:** UI-SPEC § 10 gives variant B one helper: `Someone else booked this slot.` But a window can be
  un-requestable because it is in the past, inside the listing's minimum notice, or no longer inside the
  host's operating hours — none of which anybody booked. C6 is a truthfulness rule before it is a tone rule.
- **Fix:** `ExpiredApprovalSlot` has three values. `taken` keeps the locked copy verbatim; `unavailable` reads
  `This time isn't available any more. There may be other times open.`
- **Files modified:** `src/components/booking/expired-approval-state.tsx`
- **Commit:** `940f66f`

**6. [Rule 2 - Truthfulness] The expired-approval deadline is usually unknowable**

- **Found during:** Task 1
- **Issue:** The locked body copy is `You had until {deadline} ({City} time) to pay…`. Because the terminal
  flip clears `expires_at` (deviation 1), the deadline is not retained. Deriving one from `starts_at` or from
  `APPROVAL_PAYMENT_WINDOW_HOURS` would be telling the booker something we do not know.
- **Fix:** `deadlineLabel` is nullable. When present the locked sentence renders unchanged; when absent the
  component renders `The payment window for this booking closed, so we released the slot. You weren't charged
  anything.` — same facts, same calm, no invented instant.
- **Files modified:** `src/components/booking/expired-approval-state.tsx`
- **Commit:** `940f66f`

### Deliberate divergences from stated acceptance criteria

| Criterion | What was done | Why |
|---|---|---|
| `grep -c 'SELECT now() AS "now"'` on the detail page returns 1 | Uses `readDbNow(db)` instead | The executor's repo contract is explicit: a `timestamptz` read through `db.execute` returns Postgres **TEXT**, a cast over it satisfies `tsc`, eslint *and* `next build`, and it throws on `.getTime()` with the first real row. `readDbNow` is the one hydrating reader (07-06 boundary contract). Correctness over the grep. |
| `grep -c "Cancel this request?"` on the detail page returns 1 | The literal is in a documenting comment on the branch; the copy itself lives in `CancelRequestDialog` | A `Dialog` needs a client boundary, and the copy belongs with the dialog that renders it (the shipped `request-row.tsx` decline dialog owns its own copy). Passing dialog copy down as props from an RSC purely to satisfy a grep would be worse code. |
| `grep -c "createPendingHold"` returns 1 / `grep -c "Find another time"` returns 1 | 7 and 3 respectively | Comment mentions, not extra call sites. There is exactly **one** `createPendingHold` call and exactly **one** `Find another time` button. |
| Test asserts the exact string `That slot was just taken.` | Asserts `That time was just taken. Pick another slot.` | The plan misquotes the shipped string in the same sentence that instructs "do NOT add a new error vocabulary". The instruction is the binding half; the shipped constant from `mapBookingError` is what is asserted, and the misquote is documented at the assertion. |

### Out-of-plan file touched

`src/components/host/request-row.tsx` gained an optional `countdownReason?: React.ReactNode` slot (Rule 3 —
needed to mount D-99 on the mobile card at all). Purely additive: absent the prop the card renders
byte-identically to before.

## Assigned Handoffs — both closed

**07-09's cancel entry point.** `e2e/cancel.spec.ts` no longer deep-links to `/bookings/[id]/cancel`. It lands
on the detail page, asserts the `Cancel booking` **link** is visible, clicks it, and waits for the review URL.
The `NAVIGATION NOTE` is rewritten to record the gap as resolved. Two assertions were added to the second
case: that a cancelled booking offers **no** entry link (not just no confirm button), and that the refund
renders as a sibling line reading "on its way". Locators are role-qualified throughout, because the entry is a
`link` and the confirm is a `button` — which is itself the proof that D-104's "route to the disclosure, do not
act inline" still holds.

**07-05's D-99 disclosure.** Implemented as `RequestCountdownReason`, mounted as a sibling beneath the
countdown on both the desktop table and the mobile card. A host now reads `Expires in 2h 00m` /
`Session starts in 4h — respond soon.` on a short-notice request, and nothing extra on a normal one.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npx eslint` (all new/modified files) | clean |
| `npx vitest run tests/booking/re-request.test.ts` | 7 passed |
| `npx vitest run tests/booking tests/security tests/availability` | 28 files / 270 tests passed |
| **`npm test` (full suite)** | **74 files / 604 tests passed** (was 73 / 597) |
| `npx next build` | passes with placeholder env vars — see below |
| `git diff --stat src/components/booking/request-countdown.tsx` | empty (shipped component untouched) |

**Known pre-existing build guard (not fixed, per instruction).** A bare `npx next build` fails at
"Collecting page data for /api/paymongo/webhook" with `PLATFORM_WALLET_NUMBER / PLATFORM_WALLET_NAME are not
set. Refusing to boot in production without the platform payout wallet identifiers.` This is the intended
fail-closed prod guard firing because the local `.env` has no production wallet identifiers. With
`PLATFORM_WALLET_NUMBER`, `PLATFORM_WALLET_NAME` and `INNGEST_SIGNING_KEY` set to placeholders the build
completes and all 27 routes compile. TypeScript and compilation both pass **before** the guard fires either
way, so it never masked a type error introduced here.

### Critical constraints, individually evidenced

- **Owner scope verified by mutation with a positive control** — case (4). Cross-user and missing ids are
  asserted **byte-equal to each other** (not each to a literal), the stranger's row is unmodified, no row is
  minted on their listing, and then the actual owner successfully resends the same booking. Without that last
  step the case would pass against an action hardcoded to `return DENIED`.
- **Re-request into a since-taken slot fails cleanly** — case (2). A rival's `confirmed` booking occupies the
  window; the action returns the shipped `That time was just taken. Pick another slot.`, mints nothing, and
  leaves both rows untouched. Not a crash and not a silent success.
- **Re-request double-submit is idempotent** — case (1b). Two submits return the same booking id, exactly one
  row exists, and the host was notified exactly once.
- **`booking_no_overlap` untouched** — `tests/availability` (9 files) green; no migration in this plan.
- **Never trusts a client time or price** — the action's entire input is one booking id; the window is read
  off the stored row and the price re-frozen from the listing inside the hold transaction.

## Known Stubs

None. Every surface added renders real data from real columns. The one intentionally-withheld rendering (the
settled `₱X refunded` copy variant) is documented in Deviation 3 with the reason it cannot be truthful today
and the exact place it would land.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information-disclosure | `src/app/(app)/bookings/[id]/page.tsx` | The D-97 branch performs a `getAvailability` read for a window on a **public** listing, keyed on a booking the caller has already been owner-gated for. Accepted as T-07-74 already reasons: it reveals only what that listing's own public calendar publishes. |
| threat_flag: rendering-edge | `src/app/(app)/bookings/[id]/page.tsx` | The D-58 gone-slot backstop also produces `cancelled` + no `cancelled_by` + no persisted payment id. Its landing is the `?paid=1` `PaymentReversedState` branch; a later revisit **without** `?paid=1` on a request-mode booking would read as a lapse and offer recovery. Needs a payment to land for a slot already gone, so vanishingly rare, and the recovery offered is still the right action — but it is an edge, documented in the branch rather than hidden. |

## Deferred Issues

- **The e2e suite was not executed.** `e2e/cancel.spec.ts` is a Playwright spec needing the dev server plus the
  dev Postgres; the changes were verified by lint and by reading against the shipped page markup (the entry is
  `Button asChild` → `role=link`, name `Cancel booking`; the confirm is `role=button`, same name). It should be
  run in the phase's UAT/verification pass before Phase 7 closes.
- **`Find another time` links to `/listings/{id}` without pre-opening that day.** UI-SPEC § 10 parenthesises
  "(opening that day's calendar)". The listing page accepts `?start=`/`?end=` but no `?date=`, and passing the
  taken run as `start`/`end` would pre-select a slot the picker will render unselectable. Adding a date param
  means touching `src/app/listings/[id]/page.tsx`, which is outside this plan's `files_modified`. Logged for
  whoever owns that page next.
- **A host-declined request is technically resendable through the action** (it satisfies terminal + unpaid +
  no `cancelled_by` + request mode, and nothing on the row distinguishes a host decline from an SLA lapse).
  The UI never offers it — the `declined` branch renders `Find another space`, not a recovery CTA — and
  T-07-73's rate limit is the plan's own named mitigation for re-request spam against a host. If this matters
  later, the fix is a marker written by `declineRequest`, not a change here.

## Self-Check: PASSED

All created files exist on disk; all three task commits exist in `git log`; the full suite is green.
