# Phase 13 — Human UAT Log

> Live operator walkthroughs. **Only what a human actually observed is recorded here.**
> A walk is discharged when the operator states the outcome, never when the automated half is green —
> the automated half is precisely the part that could not answer these questions.

**Operator:** the PM · **Environment:** local dev on `:3000`, seeded DB, ngrok tunnel live
**Sign-in used:** `host@fitout.test`

---

## Discharged

### The four live-UAT corrections (D-98…D-101) — CONFIRMED 2026-08-21

The PM re-checked the confirmed-booking page after plan 13-19 landed and reported satisfaction on all
four items they had raised:

| Item | Decision | Confirmed |
|------|----------|-----------|
| The page never said it was **paid** | D-99 | ✅ |
| The four-row trust panel read as filler | D-98 | ✅ |
| *"This page is your confirmation…"* closing line | D-100 | ✅ |
| Header restated the facts card | D-100 | ✅ |

Booking used: `b00cf9ed-03bc-41c5-9ad4-a2e771a31247` (`confirmed`, ₱525.00).

⚠ **This confirms the UX corrections only.** It is NOT walk A — see Outstanding below.

### Walk C — the QRPh manual-return copy — PASSED 2026-08-21

Tested on **real** cancellations of both a QRPh and an e-wallet payment. Observed, verbatim:

- **QRPh (manual):** *"₱250.00 is coming back to you. We couldn't send it back automatically, so we've
  flagged it to be returned by hand. Your reference is FIT-YC0X9PTE."* — **never uses "refunded"**, which
  is D-83's whole point on a rail where no refund was issued.
- **E-wallet (automatic):** *"₱250.00 refund on its way. Refunds to GCash and Maya are usually back within
  24 hours; a card can take up to 30 days, depending on your bank."* — one of the three verified windows.

Both rendered as **in-page panels, not toasts** — 13-18's fix, confirmed on live transactions.

### Walk D — QRPh refundability re-probe — DISCHARGED 2026-08-21

Coordinator re-ran `POST /v1/refunds` in test mode against the recorded QRPh payment with a **fresh**
`Idempotency-Key`. Identical rail-level rejection to the 2026-07-23 result:
`HTTP 400 "Refunds are not allowed for payments with source type qrph."`
PayMongo's published docs still claim QR Ph is refundable; **observed behaviour remains authoritative**
(13-CONTEXT D-81). `REFUNDABLE_RAILS` must not be widened. Full method in `13-RESEARCH.md` § Addendum.

---

## Outstanding

### Walk A — the live confirmation moment · **NOT DONE**

The PM reviewed the four fixes on an already-confirmed booking, **not** a fresh end-to-end payment.
Three things therefore remain unobserved, and all three need a real hosted-checkout return:

1. `?paid=1` is dropped from the URL after the moment paints (D-60)
2. A reload then renders the ordinary detail page rather than the moment
3. The pending state's spinner **stops** once polling caps at ~20s (D-101.1 — the fix for the defect the
   PM reported as "an infinite looping payment received")

**BFLOW-08 stays PARTIAL** until observed. The automated half is green (`confirmation-decay.spec.ts`) and
is not a substitute — it drives a seeded row, not a provider round-trip.

### Walk B — the printed receipt · **NOT DONE**

The PM **viewed the receipt on screen only**. The print stylesheet is unverified by a human.
Needs: print (or Save as PDF) in **both** themes, checking chrome is suppressed, the reference and total
stay legible, no black flood or washed-out ink, and nothing reads as an official/BIR receipt (D-75).

**TRUST-05 stays PARTIAL** until observed. `receipt-print.spec.ts` proves the stylesheet *applies*; it
cannot prove the paper output is legible.

### The checkout way-back control · **NEEDS EYES, NOT CI**

D-101.2 changed `/listings/[id]/book`'s escape from `variant="ghost"` to `variant="outline"`. All four
`checkout-*` baselines were **compared and passed**, which is expected rather than reassuring: the change
is a `--border` colour against `--background`, and Phase 11 measured that class at YIQ deltaSquared ~341
against pixelmatch's ~1408 cutoff. **The visual gate is structurally blind to it.** Only a human can
confirm the control now reads as a control.

### The pending surface's corrected copy · **NEEDS EYES, NOT CI** — raised 2026-08-22

The PM, on the settling state after a real checkout return: *"it said Payment Received, did we really
receive the payment??"* We did not know — the webhook had not arrived, which is why the row was still
`pending`. Plan 13-20 rewrote it (13-CONTEXT **D-102**): the heading is now *"Confirming your payment"*,
the money statement *"We're waiting on your payment provider to confirm it."*, and the safety and hold
clauses are gone. They also reported *"i think /?paid appears when the time of booking has already
elapsed"* — correct, and closed by **D-103**.

**Needs a human on a real hosted-checkout return**, because both halves are only observable there:

1. The new copy reads as CALM rather than as a warning. The whole risk of this correction is
   over-steering — STATE-05 forbids any error affordance while the webhook is outstanding, and the
   booker very probably did pay.
2. `?paid=1` is gone from the address bar on the landing that follows, including on a booking that
   ends `cancelled` or whose session has already elapsed.

This overlaps Walk A and can be observed in the same pass. CI proves the strings and the mount points;
it cannot tell you whether the page still feels safe to somebody whose money is in the air.

### `SUPPORT_EMAIL` · **operator action, one line**

Still `null` at `src/lib/site.ts:70`. Setting it closes **TRUST-01** and **STATE-05** in full and lights
up the support path everywhere it is already built behind the guard. On the QRPh manual-return path it is
the booker's only route to their money.

---

*Last updated: 2026-08-22*
