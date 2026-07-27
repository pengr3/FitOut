# Phase 08 — Deferred Items

Out-of-scope discoveries logged during execution. Nothing here blocks the phase.

---

## 1. A stale hosted-checkout session can still be paid after a re-price (D-108, 08-05)

**Found during:** 08-05 Task 2 (`updateDeclaredPax`).

**What is closed:** `confirmBooking` now scopes the PayMongo `Idempotency-Key` to the frozen amount
**for per-head bookings only** (`checkout:<bookingId>:<quotedTotalCents>`; flat bookings keep the
byte-identical `checkout:<bookingId>`). So the common path is safe: a booker who leaves the hosted
checkout, returns via `cancelUrl`, steps the headcount and pays again now gets a session for the amount
they were actually shown — instead of a replay of the first session at the old amount.

**Residual edge (accepted, v1):** the FIRST checkout session is not cancelled when the quote moves. A
booker holding that older PayMongo tab open could still pay the previous amount, and the
`checkout_session.payment.paid` webhook confirms on `status='pending'` alone (D-57), so the booking would
confirm at a total that no longer matches `quoted_total_cents`.

**Why not fixed here:** cancelling/expiring a PayMongo checkout session requires a new API call plus a
place to persist the session id (a schema column) — a Phase-5 money-rail change that D-107 explicitly
holds out of Phase 8's scope, and an architectural call (Rule 4) rather than an in-plan fix.

**When to close:** alongside the D-114 in-app top-up fast-follow, which needs the same
"reconcile charged-vs-quoted" seam. Options: persist `checkout_session_id` on the booking and expire the
old session on re-price, or have the webhook compare the paid amount against `quoted_total_cents` and
route a mismatch to the existing operator-alert path.

---

## 2. `request`-mode group listings cannot declare a headcount before the host approves (D-108, 08-05)

**Found during:** 08-05 Task 2.

**What:** the `PaxStepper` lives on the reserve/checkout page, which a request-to-book booker only reaches
*after* the host approves. Nothing on the listing page sends `declaredPax` at `placeHold` time (08-03
threaded the parameter end-to-end, but no UI populates it), so a request-mode group booking is created at
`declaredPax = 1` and can only be stepped up on the pay-on-approval screen. `updateDeclaredPax` does allow
that (`approved` is in its live-hold set), so the flow works — but the host approves a request whose price
can subsequently move.

**Why not fixed here:** adding a headcount control to the listing-page CTA is a different surface than the
one 08-05 scopes, and the "what exactly did the host approve" question is a product call.

**When to close:** whenever the group entry point on the listing page is revisited — either surface the
stepper pre-`placeHold`, or freeze `declaredPax` at approval for request mode.
