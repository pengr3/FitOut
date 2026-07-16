# Phase 5: Payments & Payouts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-16 (Payout timing + Payment wiring + HOST-03 + Refund scope); 2026-07-15 (Commission + Payment methods)
**Phase:** 05-payments-payouts
**Areas discussed:** Commission model, Payment methods, Payout timing, Payment wiring depth, HOST-03 payout view, Refund/dispute scope

> Note: Commission model and Payment methods were resolved in the 2026-07-15 session (then paused via `/gsd-pause-work`); the remaining four areas were resolved on 2026-07-16 after resuming from checkpoint.

---

## Commission model

| Question | Options | Selected |
|----------|---------|----------|
| Who bears the commission / what does the booker see? | Host-side deduction / Booker service fee on top / Split | Host-side deduction ✓ |
| What commission rate? | 15% / 10% / 20% | 10% (config-tunable) ✓ |
| Who absorbs PayMongo's processing fee? | Platform absorbs it / Host absorbs it | Platform absorbs it ✓ |

**User's choice:** Host-side 10% deduction (tunable); platform absorbs the gateway fee → host always receives exactly `price − 10%`.
**Notes:** Demand-side-first — no surprise booker fees; the booker's price breakdown stays `subtotal = total`. Platform's effective take ≈ 6.5–8% after the gateway fee.

---

## Payment methods

| Question | Options | Selected |
|----------|---------|----------|
| Which payment rails at checkout in Phase 5? | Full PH set (cards+GCash+Maya+QRPh) / Cards+GCash only / Card-only | Full PH set ✓ |
| Where does the booker enter payment details? | Hosted PayMongo page / Embedded on-site | Hosted PayMongo page ✓ |

**User's choice:** Full PH rails via a hosted PayMongo Checkout page (redirect).
**Notes:** PCI-light; researcher picks the exact PayMongo primitive. Reinforces webhook-as-source-of-truth — the return redirect is a UX signal; the payment webhook confirms the booking.

---

## Payout timing

| Question | Options | Selected |
|----------|---------|----------|
| When is a payout eligible, relative to the session? | T+24h after session ends / T+72h after session ends / Immediately at session end | T+24h after session ends ✓ |
| How is the payout triggered? | Scheduled batch sweep / On-demand per booking / Let research decide | Scheduled batch sweep ✓ |

**User's choice:** T+24h after `booking.endsAt`, fired by a scheduled batch sweep (`POST /v2/batch_transfers`, idempotent via a payout-ledger row).
**Notes:** The user asked how comparable apps handle this before deciding. Research surfaced: Peerspace (closest analog) = 72h after booking end; Airbnb = 24h after check-in (established hosts); Giggster = within 7 days of shoot start. Key insight: anchor to session **end** (like Peerspace) not start (Airbnb's check-in model is for multi-night stays); FitOut sessions are hourly/daily. 24h chosen as a more host-friendly buffer than Peerspace's 72h; Phase 7 can tune the number. "Release" (fire the inhouse transfer to the host wallet) vs "arrival" (PayMongo → host bank, 1–5 days) distinguished — only release is ours to decide.

---

## Payment wiring depth

| Question | Options | Selected |
|----------|---------|----------|
| What flips a booking to 'confirmed' once payment is involved? | The payment.paid webhook / The synchronous return redirect / Both (optimistic + authoritative) | The payment.paid webhook ✓ |
| If a booker pays but their hold lapsed and the slot is gone, what's the guarantee? | Extend hold + auto-refund backstop / Auto-refund only (keep 15-min hold) / Lock slot for full payment window | Extend hold + auto-refund backstop ✓ |

**User's choice:** The `payment.paid` webhook is the confirm authority (retires the synchronous `confirmBooking` flip); extend the hold to the checkout window + auto-refund backstop.
**Notes:** Matches the locked webhook-as-truth rule and the existing webhook single-writer pattern. Rejected trusting the browser return redirect as proof of payment (forgeable/droppable). The auto-refund backstop guarantees the platform never keeps money for an undeliverable slot; extending the hold prevents the common race so the backstop is rarely needed.

---

## HOST-03 payout view

| Question | Options | Selected |
|----------|---------|----------|
| What should the host payout-status view show? | Per-booking rows + summary total / Aggregate balance only / Per-booking rows only | Per-booking rows + summary total ✓ |

**User's choice:** A host earnings/payouts page — per-booking rows (state Held→Processing→Paid/Refunded, `gross → −10% → net`, expected payout date) plus a summary total (held vs paid).
**Notes:** The host sees the commission line (unlike the booker) so the deduction is explainable. Status vocabulary mirrors Peerspace's `scheduled → processing → paid`.

---

## Refund/dispute scope

| Question | Options | Selected |
|----------|---------|----------|
| How much refund surface should Phase 5 build? | Mechanism only / Mechanism + basic cancel / Let planning decide the line | Mechanism only ✓ |

**User's choice:** Phase 5 builds the refund mechanism only (PayMongo refund call + refund-event webhook + the payment-race auto-refund backstop).
**Notes:** No booker-facing cancel flow, no refund-% tiers — those are Phase 7 (BOOK-07, PAY-06). A pre-payout refund is just a platform-wallet refund (host never paid → no clawback).

## Claude's Discretion

- Exact PayMongo checkout primitive (Checkout Session vs Links vs Payment Intent) — deferred to research.
- Background-job runner (Inngest vs BullMQ+Redis) + sweep cadence — deferred to research/planning.
- Payout-ledger + commission storage schema; whether to add an explicit `completed` status transition vs deriving payout-eligibility from `confirmed` + `endsAt` — planner's call.

## Deferred Ideas

- Cancellation/refund policy matrix + booker cancel flow → Phase 7 (BOOK-07, PAY-06).
- Instant-book vs request-to-book fork, authorize→capture, host approve/decline → Phase 6 (BOOK-04/05, PAY-05, HOST-01).
- Dispute/chargeback workflow beyond the refund mechanism → future.
- `listing.currency` default cleanup (`usd` → `php`) to match `booking.currency` — known deferred inconsistency; reconcile during/before payment wiring.
