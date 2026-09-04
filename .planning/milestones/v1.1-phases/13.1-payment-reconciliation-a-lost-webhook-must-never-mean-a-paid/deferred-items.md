# Phase 13.1 — deferred items

Out-of-scope discoveries made while executing this phase's plans. Nothing here was fixed by the plan
that found it; each row names the plan that found it and why it was left.

| Found by | Item | Why deferred |
|---|---|---|
| 13.1-01 | **The gone-slot operator alert is NOT de-duplicated, and a 5-minute sweep can turn one dead row into a recurring `needs_attention` forever.** MEASURED (not inferred) by `tests/payments/confirm-idempotency.test.ts` case (5): two passes of `confirmPaidBooking` over one already-`cancelled` booking on an unrefundable rail produce **TWO** `auto_refund_manual` / `needs_attention` records. `handleGoneSlot`'s re-read short-circuits only on `status === 'confirmed'`, so a `cancelled` row falls through to the alert branch on every pass. ⚠ The money-critical half is SAFE and pinned: `createRefund` stays at **zero** across the re-run (T-13.1-06), so money never moves twice — only the alert repeats. Unreachable in production today, because the webhook's `paymongo_event` id ledger sits in front of the only caller, so one event alerts once. | **The fix belongs in plan 02's sweep query, not in the backstop.** A sweep has no event ledger; its candidate set must be `pending` / `approved` bookings only, so a terminal row is never handed to `confirmPaidBooking` at all — which is also what 13.1-CONTEXT **D-111** (no backfill) and **D-113** (a lapsed hold's ability to pay expires with it) already point at. De-duplicating inside `handleGoneSlot` is the wrong shape twice over: it needs durable per-booking "already alerted" state, and **D-112** keeps this phase at zero migrations. Fixing it here would also have changed `handleGoneSlot`'s money branching, which 13.1-01's own must_haves require to move byte-identically (**D-108**). The observed count is pinned in case (5) behind an unmissable `RECORDED DEFECT` block that tells the next reader to update the expectation to 1 when it is fixed, never to "restore" the 2 — so the day plan 02 closes it, the assertion goes red and leads straight to this row. |
| 13.1-01 | **`getCheckoutSession`'s Checkout Session response shape is still NOT live-observed** — including the newly-read `payments[0].id`. 13-03's summary already recorded this for the rail and `paid_at`; the `pay_...` inherits it. The 13.1-01 plan's prose located the id at `payments[0].attributes.id`, while this repo's fixtures and the webhook route both put it on the resource envelope at `payments[0].id`. Both are now read (envelope first) and both are pinned by a case, so neither placement can regress — but the collision was resolved defensively rather than by evidence. | Confirming it needs a **real paid session** probed with a live `sk_test_` key, which is a manual UAT item and outside a code plan's reach (`tests/booking/checkout-probe.test.ts` and the whole payments suite run inside D-35's CI secret boundary, where the absence of a key is the point). The cost of being wrong is bounded to `paymentId: null`, which is the pre-13.1-01 status quo, not a regression. Whoever runs this phase's live UAT should capture one `GET /v1/checkout_sessions/<id>` body for a paid session and delete whichever of the two reads the body does not justify. |

## Status updates

**Row 1 — EXPOSURE CLOSED by 13.1-02, the underlying non-idempotence UNCHANGED.** The sweep's candidate set
is `status IN ('pending','approved')`, so a terminal row is never handed to `confirmPaidBooking` at all and
the recurring-alert scenario this row warns about cannot occur from the sweep. Proven by a deliberate break:
widening the scope to admit `cancelled`/`confirmed`/`requested` reddens
`tests/payments/payment-reconcile.test.ts` case (1) and nothing else (verbatim output in that spec's header).

⚠ **Do NOT change `tests/payments/confirm-idempotency.test.ts` case (5)'s expectation of 2.** `handleGoneSlot`
still re-alerts a `cancelled` row on every pass; 13.1-02 removed the CALLER that would have exercised it 288
times a day, not the defect. The expectation moves to 1 only when the backstop itself is fixed, exactly as
13.1-01 instructed. A second caller reaching `confirmPaidBooking` with a terminal booking id would re-open
this — which is a live consideration for 13.1-03's fast path.

**Row 1 — STILL CLOSED after 13.1-03, and the "second caller" named above is the one now shipped.**
`reconcilePaymentNow` is that second caller, and it cannot re-open this: its payable-status gate
(`pending` / `approved`) sits BEFORE the delegate, so a terminal booking id is never handed to
`confirmPaidBooking` at all. Proven by `tests/booking/reconcile-fast-path.test.ts` case (5) — a
`confirmed` row returns `unchanged` with a provider call count of **zero** — and by that spec's break B,
which removed the gate and reddened exactly that count while the returned value stayed correct.
`tests/payments/confirm-idempotency.test.ts` case (5) is untouched and still expects 2.

**Row 2 — UNCHANGED by 13.1-03.** The fast path reads `payments[0].id` through the same
`probeCheckoutSession` → `getCheckoutSession` path the sweep does, so it inherits the same unobserved
response shape and the same bounded cost (`paymentId: null`). Capturing one real paid-session body is
still a live-UAT item, and it is now worth doing on the settling screen specifically: that surface is
where a booker can trigger the probe on demand.

## New residual, recorded by 13.1-03

**A booker sitting on the settling screen can now cause an outbound PayMongo read, and the budget for it
is module-private.** `RECONCILE_RATE_LIMIT` (`{ window: 60, max: 5 }`) cannot be exported from the
`"use server"` module without killing it (watched red — see the action's header), so
`tests/booking/reconcile-fast-path.test.ts` case (7) discovers the limit behaviourally instead. That is
strictly better as an assertion, but it does mean **no other module can read the budget**: if a future
plan needs the number at a second call site, move the constant to a non-`"use server"` module rather
than duplicating the literal.


## Status updates from 13.1-04

**Row 1 — STILL CLOSED, and 13.1-04 adds no third caller of `confirmPaidBooking`.** The retire sweep never
calls the confirm at all: it writes no `booking` row and reaches only `queryRetirableSessions`'s own
candidate set. A `paid` session on a still-`pending` row is left for `payment-reconcile` **deliberately
silent** (asserted as ZERO audit calls) precisely so one payment produces one row in the operator's queue
rather than two. `tests/payments/confirm-idempotency.test.ts` case (5) is untouched and still expects 2.

**Row 2 — PARTIALLY DISCHARGED. The Checkout Session response shape has now been LIVE-OBSERVED for the
`status` field, though not for `payments[0].id`.** `tests/paymongo/lapsed-hold-not-payable-real.test.ts`
runs a real `GET /v1/checkout_sessions/<id>` against `sk_test_` twice per run and asserts the raw status
string on both (`active`, then `expired`). So `getCheckoutSession`'s status read is no longer inferred from
fixtures. The `pay_...` placement remains unobserved because that needs a **paid** session, which this file
deliberately never produces — its whole point is a session that was never paid. Capturing one real
paid-session body is still a live-UAT item, and the settling screen remains the best place to do it.

## New residual, recorded by 13.1-04 — the retire sweep's lookback window

**A hold that lapses while `checkout-retire-sweep` is DOWN for more than ~25 minutes leaves the 30-minute
lookback window unswept, and its PayMongo session stays payable indefinitely.**

- **Why it exists:** `RETIRE_LOOKBACK_MINUTES = 30` is the no-migration answer to "have we already retired
  this one" (**D-112**). The alternative — a marker column on `booking` — would remove the window entirely
  but costs a migration, and would have to be updated in GATE-06's assertion and Phase 17's closing proof in
  the same change.
- **Why it is acceptable today:** it is bounded (six ticks of coverage), and **D-108**'s retained gone-slot
  backstop still governs a payment that lands after the hold is gone — so the failure mode is "a booker can
  still pay a dead hold during an outage", which is exactly the pre-13.1-04 status quo, not a regression.
- **What closes it properly:** **13.1-05**'s inline reclaim wirings retire at the moment of reclaim, with no
  window at all. Between them, the residual shrinks to "a lapse that neither a reclaim nor six cron ticks
  ever visited".
- ⚠ **Do NOT close it by widening the lookback.** That is the D-111 no-backfill mechanism as well as the
  de-duplication bound — `tests/payments/checkout-retire.test.ts` case (7) reddens on it and names both
  evidence fixtures in its failure message.

## New residual, found and recorded by 13.1-05 — a FOURTH session-orphaning path, reachable by neither the inline wirings nor the sweep

**`cancelUnpaidHold` (`src/app/actions/cancel-booking.ts:876-885`) releases an `approved` hold without
retiring its checkout session — and because it sets `expires_at = NULL`, 13.1-04's sweep can never reach it
either.** Found while verifying 13.1-05's enumeration against the code rather than against the plan.

- **What it is.** A booker withdrawing their own unpaid request:
  `UPDATE booking SET status = (CASE WHEN status = 'requested' THEN 'declined' ELSE 'cancelled' END),
  expires_at = NULL … WHERE … AND status IN ('requested','approved')`. There is no `expireCheckoutSession`
  call anywhere in the function.
- **Why it can orphan a live session.** An `approved` row is exactly the scope `src/app/actions/booking.ts:840`
  claims a checkout lease under (`status IN ('pending','approved')`), so a booker who reached checkout, then
  went back and withdrew, leaves a payable PayMongo session behind. The two `cancel-booking.ts` flips
  13.1-04's enumeration DID classify (`:654`, `:1074`) are both `AND status = 'confirmed'` — a different
  family. This third UPDATE in the same file was not classified either way.
- **Why the sweep cannot cover it.** `queryRetirableSessions` selects `expires_at <= now()`. This statement
  writes `expires_at = NULL`, and SQL three-valued logic excludes NULL from that comparison. So the row
  leaves the sweep's candidate set in the same statement that orphans its session.
- **Why 13.1-05 did not wire it.** It is **not lapse-driven**, so it is outside D-113's scope as written
  ("WHEN A HOLD EXPIRES, the ability to pay must expire with it") and outside this plan's `files_modified`.
  More concretely, wiring it would require a FIFTH member on `RetireTrigger`, i.e. editing
  `src/lib/payments/retire-checkout.ts` — which 13.1-05's own verification requires to have an EMPTY diff.
  Scope creep with a measurable cost, so: reported, not absorbed.
- **How bad is it today.** Bounded and low: the person who withdrew is the only one holding that session,
  and they withdrew on purpose. But it is real money on a released slot, it is the exact shape of the defect
  this phase exists for, and it is the only known orphaning path with NO backstop at all.
- **What closes it.** One call, in the same shape as `expireOne`'s: `RETURNING id, checkout_session_id` on
  the existing flip, then `retireCheckoutsForBookings([...], "<new trigger>")` after it, outside any
  transaction. Add the trigger to the union in the same change. The user-initiated cancel paths already
  audit `cancel_unpaid_hold`, so the operator surface needs nothing new.

**CLOSED by 13.1-06 (2026-08-22), and the prescription above was right except in one detail.** The wiring
shipped as described — `RETURNING id, status, checkout_session_id`, a fifth `RetireTrigger` member
(`booker-cancel-hold`), the call outside any transaction, behind its own catch — plus `status`, which the
prescription did not name and which the retire needs: the policy's alert rule keys on the booking's status,
and the pre-read `row.status` is the PRE-flip one. Proven by 12 cases in
`tests/booking/cancel-unpaid-hold-retires-session.test.ts`, including probe-first over the REAL policy at
this call site (a `paid` session is a provider call count of ZERO, guarded by an `active` case that moves
it) and four deliberate breaks recorded verbatim in that file's header.

⚠ **THE ROW ABOVE NAMES ONLY ONE OF THE TWO EXCLUSIONS, AND THAT MATTERS.** It says the `expires_at = NULL`
is what puts the row beyond the sweep. It is *an* exclusion, not *the* exclusion: `queryRetirableSessions`'
FIRST clause is `status IN ('pending','approved')`, and the same statement writes `cancelled`/`declined`.
So the simpler-looking fix — stop nulling `expires_at` and let the sweep reach the row — closes **nothing**.
That was measured, not reasoned: `tests/booking/cancel-unpaid-hold-retires-session.test.ts` case (12) hands
the row its `expires_at` back after the withdrawal and the sweep still does not select it, and case (11) is
its guard-the-guard. Widening the sweep's status clause to make option (b) true reddens case (12) **and**
case (2) of `tests/payments/checkout-retire.test.ts` — "a CONFIRMED booking is never selected — its session
was paid, and retiring it destroys evidence". Do not re-propose it from this row's partial description.

## Status update from 13.1-06

**Row 2 — STILL OPEN, and now explicitly a PM/live-UAT item.** The 13.1 verification routed it to a human
(item 3) and 13.1-06 did not close it: capturing `payments[0].id` needs a REAL paid session, which no code
plan can produce. Both placements are still read defensively, neither is deleted, and the cost of being
wrong is still bounded to `paymentId: null`. The settling screen remains the best place to capture it.
⚠ It now has one more consumer: `checkout_paid_after_lapse`'s `meta.paymentId` (§4b of
`.planning/ops/NEEDS-ATTENTION-RUNBOOK.md`) is the id an operator refunds against. A `null` there is not a
regression — the runbook's §4b tells them to fall back to the `cs_...` — but it is one more reason to
capture the real body.
