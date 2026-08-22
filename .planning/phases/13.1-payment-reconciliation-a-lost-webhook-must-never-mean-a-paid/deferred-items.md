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

