# Phase 5: Payments & Payouts - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 wires **real money** onto the Phase-4 booking flow on the **single, non-forked instant-capture path**: a booker pays the full listed price online (PayMongo), the booking confirms, funds are **held on the platform wallet**, and after the session the host is paid out `price − commission` via an on-demand `inhouse` transfer. It also gives the host a **payout-status view**. Covers **PAY-01, PAY-02, PAY-03, HOST-03**.

**In scope:**
- Online payment at checkout via PayMongo (full PH rails), replacing the Phase-4 placeholder confirm.
- Platform commission deducted from each booking (host-side).
- Hold-until-session payout to the host (PayMongo `inhouse` `POST /v2/batch_transfers`).
- Host payout-status view (HOST-03).
- Refund **mechanism** (PayMongo refund + refund-event handling + the payment-race auto-refund backstop).

**Out of scope (belongs to other phases):**
- Instant-book vs request-to-book fork, authorize→capture, host approve/decline — **Phase 6** (BOOK-04/05, PAY-05, HOST-01). Every Phase-5 booking is **instant-capture**.
- Cancellation/refund **policy matrix** + booker-facing cancel flow — **Phase 7** (BOOK-07, PAY-06).
- Bookings-management list views + transactional emails — **Phase 7** (MANAGE-01..03, BOOK-06).

> ⚠️ **The ROADMAP Phase 5 goal/success-criteria text is STALE** — it references Stripe Connect / `reverse_transfer` / `account.updated`. **D-20 replaced Stripe with PayMongo.** There is **no `reverse_transfer`** (a pre-payout refund is just a platform-wallet refund — the host hasn't been paid yet); `account.updated` = the **`merchant.activated`** webhook already built in Phase 2. Read the decisions below and CLAUDE.md § Marketplace Payments as authoritative, NOT the ROADMAP prose.

</domain>

<decisions>
## Implementation Decisions

### Commission (PAY-02)
- **D-50:** Commission is a **host-side deduction**. The booker pays the listed price with **no booker-facing fee line** — the price breakdown stays `subtotal = total`. The host receives `price − commission`. (Demand-side-first: no surprise booker fees.)
- **D-51:** Commission rate = **10%, config-tunable** (a config value, not a hardcoded literal). Downstream: **freeze the applied commission (rate + computed amount) on the payout-ledger row at charge/payout time** so a later rate change never retroactively alters past payouts.
- **D-52:** **The platform absorbs PayMongo's gateway fee.** The host always receives exactly `price − 10%`; the platform's effective take is `10% − gateway fee` (~6.5–8% net). Host payout is a fixed, explainable number.

### Payment Methods & Checkout (PAY-01)
- **D-53:** Checkout offers the **full PH rail set — cards + GCash + Maya + QRPh** (D-20's rails). PAY-01 "by card" is a **floor, not a ceiling**.
- **D-54:** Payment is collected on a **hosted PayMongo page** (redirect to a PayMongo-hosted Checkout Session with all rails in one page, then return to a FitOut confirmation URL). PCI-light. The **researcher picks the exact PayMongo primitive** (Checkout Session vs Links vs Payment Intent + hosted redirect). The **return redirect is a UX signal only**; the payment webhook confirms the booking (see D-57).

### Payout Timing (PAY-03)
- **D-55:** A host's payout becomes eligible **T+24h after the session ENDS** (anchored to `booking.endsAt`). Rationale grounded in analogs: Peerspace (the closest analog — hourly/event space rental) anchors to booking **end** (72h); Airbnb anchors to check-**in** (24h) only because stays span nights. FitOut sessions are hourly/daily, so `endsAt` is the "service delivered" signal. 24h is a more host-friendly buffer than Peerspace's 72h while still absorbing no-shows/disputes before money leaves the platform wallet. The **24h is a mechanism default Phase 7 can tune** without changing the plumbing.
- **D-56:** Payout is fired by a **scheduled batch sweep** — a periodic job finds `confirmed` bookings where `endsAt + 24h ≤ now()` and not-yet-paid-out, and issues them via **`POST /v2/batch_transfers`** (`provider:"paymongo"`, `inhouse`) of `(quotedTotalCents − commission)` to each host's Linked-Account wallet. Idempotent via a **payout-ledger row** (at-most-once transfer per booking). Implies introducing the **background-job runner the stack anticipates (Inngest or BullMQ+Redis)** — researcher/planner picks. *"Release" = firing the transfer into the host's PayMongo wallet (ours to control); "arrival" = PayMongo → host bank (1–5 days downstream, not ours).*

### Payment Wiring / Confirm Authority (BOOK-04 substrate)
- **D-57:** **The `payment.paid` webhook is the confirm authority.** The Phase-4 synchronous `confirmBooking` `pending→confirmed` UPDATE is **retired** — the booking flips to `confirmed` when PayMongo's `payment.paid` webhook lands (the single source of truth). The Confirm button becomes **"Confirm & pay"** → creates the Checkout Session → redirects to PayMongo; on return the booker sees a brief **"payment received, finalizing…"** pending-payment state until the webhook confirms. Consistent with the locked webhook-as-truth rule and the existing webhook single-writer pattern. Rejected: trusting the browser return redirect as proof of payment (forgeable/droppable).
- **D-58:** **Never keep money for an undeliverable slot.** Mitigate the hold-vs-payment race by **extending the pending-hold TTL to align with the checkout-session window** (so a paying booker keeps their slot; the 15-min hold no longer expires mid-payment), **AND** an **auto-refund backstop**: on a `payment.paid` where the slot is genuinely gone (hold swept + taken), auto-refund the booker. Prevents the common case, self-heals the rare edge.

### Host Payout View (HOST-03)
- **D-59:** A host **earnings/payouts page** showing **per-booking rows** — each with payout **state** (`Held` → `Processing` → `Paid`, plus `Refunded`), the `gross booking → −10% commission → net payout` breakdown, and the **expected payout date** — **plus a summary total** (total held/upcoming vs total paid). The **host sees the commission line** (unlike the booker) so the deduction is explainable. States mirror Peerspace's `scheduled → processing → paid`.

### Refund / Dispute Scope (boundary with Phase 7)
- **D-60:** Phase 5 builds the refund **MECHANISM only** — the PayMongo refund call (in `paymongo.ts`), `refund`-event webhook handling (idempotent via the `paymongo_event` ledger), and the D-58 auto-refund backstop. Because payout is held until T+24h post-session, a **pre-payout refund is just a platform-wallet refund** (host never paid → no clawback). **NO booker-facing cancel flow and NO refund-% tiers** — those are **Phase 7** (BOOK-07 cancel flow, PAY-06 refund policy matrix).

### Claude's Discretion
- Exact PayMongo primitive for the hosted checkout (Checkout Session vs Links vs Payment Intent) — deferred to research (D-54).
- Background-job runner choice (Inngest vs BullMQ+Redis) and sweep cadence/granularity — deferred to research/planning (D-56).
- Schema shape for the payout-ledger + commission storage, and whether to add an explicit `completed` status transition vs deriving payout-eligibility from `confirmed` + `endsAt` — planner's call (the `booking_status` enum already includes an unused `completed`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Payments architecture (authoritative — overrides stale ROADMAP prose)
- `CLAUDE.md` § "Marketplace Payments — Prescriptive Detail" + the **D-20** rows — hold-until-session, collect-to-platform-wallet → HOLD → after-session `inhouse` `POST /v2/batch_transfers`, `Idempotency-Key` on POSTs, `Paymongo-Signature` HMAC-SHA256 webhook verification, "never pay the host at booking time", **do NOT use payment-splitting**.
- `CLAUDE.md` § "Double-Booking Prevention" — the `tstzrange '[)'` + partial-WHERE occupancy model the hold/payment race (D-58) sits on.
- `.planning/PROJECT.md` § Key Decisions **D-20** (PayMongo, supersedes D-17/D-19 Stripe) and **D-21** (units occupancy model).

### Requirements
- `.planning/REQUIREMENTS.md` — **PAY-01, PAY-02, PAY-03, HOST-03** (Phase-5 scope); PAY-05/BOOK-04/HOST-01 (Phase 6, out of scope here); BOOK-07/PAY-06 (Phase 7, out of scope here). Note "Open Product Decisions → Cancellation/refund policy specifics" is a **Phase-7** concern (D-60).
- `.planning/ROADMAP.md` § Phase 5 — ⚠️ **goal/success-criteria text is STALE (Stripe/`reverse_transfer`/`account.updated`)**; superseded by D-20 PayMongo. Use for phase framing only, not payment mechanics.

### Prior-phase foundations Phase 5 builds on
- `.planning/phases/02-listings-host-onboarding/02-CONTEXT.md` — PayMongo Linked-Accounts onboarding + the `merchant.activated` bookability gate (the host wallet Phase 5 pays out to).
- `.planning/phases/04-booking-core-search-no-payment/04-CONTEXT.md` — D-46 (`DISPLAY_CURRENCY = php`), D-47 (`HOLD_TTL_MINUTES = 15`), D-48 (lazy-expiry occupancy), D-49 (frozen `quotedTotalCents`), and the `confirmBooking` seam.

### Code Phase 5 extends
- `src/lib/paymongo.ts` — thin REST wrapper (Basic auth, `Idempotency-Key` on POSTs, fail-closed prod boot guard). **Extend** with: create Checkout Session (charge), `POST /v2/batch_transfers` (payout), refund call.
- `src/app/api/paymongo/webhook/route.ts` — signature-verified, `paymongo_event`-deduped, single-writer webhook. **Extend** with `payment.paid` (flip `pending→confirmed`, D-57) + refund events.
- `src/app/actions/booking.ts` — `confirmBooking` (line ~139), commented *"the Phase-5 payment seam; NO charge here"* — the exact insertion point; the synchronous flip is retired per D-57.
- `src/lib/db/schema.ts` — `booking` (frozen `quotedTotalCents`/`currency`; `booking_status` enum has unused `completed`), `host_payout`, `paymongo_event`. **No commission/payout-ledger columns exist yet** — Phase 5 adds them.
- `src/lib/availability/units.ts` — `createPendingHold` + `mapBookingError` (the hold transaction the D-58 TTL-extension touches).

### External research (payout-timing benchmarks — informed D-55)
- Peerspace — payout scheduled **72h after booking end** (closest analog): https://support.peerspace.com/en/articles/10119439-when-will-i-receive-my-payout
- Airbnb — payout **24h after check-in** (established hosts): https://www.airbnb.com/help/article/425
- Giggster — payout within 7 days of shoot start: https://help.giggster.com/en/articles/757837-how-does-giggster-s-payment-payout-system-work

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`paymongo.ts` fetch wrapper** — already does Basic auth + `Idempotency-Key` on POSTs + throws on non-2xx + fail-closed prod guard. New charge/transfer/refund calls follow the same `paymongoFetch<T>()` idiom (note: transfers are `/v2` — the wrapper's `PAYMONGO_BASE` is `/v1`, so the `/v2/batch_transfers` path needs a base override or a second base).
- **Webhook route pattern** — `parseSignature` + constant-time `verifySignature` (test+live digests) + `paymongo_event` idempotency ledger + "flag DERIVED from verified event TYPE, never a client body field". `payment.paid`/refund handlers slot straight into this switch.
- **`PriceBreakdown` atom** (Phase 4) — already a fee-extensible list with a **documented RESERVED Phase-5 fee slot** and ZERO client arithmetic. The commission is host-side (D-50) so the *booker's* breakdown stays `subtotal = total`; the reserved slot is for any future booker-visible line, not the commission.
- **`booking.quotedTotalCents` + `currency`** — the server-frozen amount to charge (D-49). Charge integrity: charge exactly this, never a client-supplied number.
- **`mapBookingError` / `isPgError` cause-walking** (`src/lib/pg.ts`) — reuse for calm conflict mapping in the payment/refund paths.

### Established Patterns
- **Webhook = source of truth + single writer** — the webhook route is the ONLY writer of payout state today; D-57 makes it the ONLY writer of `booking→confirmed` on payment too. Preserve single-writer.
- **`Idempotency-Key` on every POST; `Paymongo-Signature` HMAC on every inbound webhook.** Non-negotiable (CLAUDE.md D-20).
- **Integer minor units (cents), never float** (schema Pitfall 5) — commission math and payout amounts stay in integer cents.
- **Server-authoritative, never trust the client for price/time/state** (Security V4, the whole booking.ts contract).
- **Fail-closed prod boot** for missing PayMongo secrets (auth.ts / paymongo.ts pattern) — extend to the webhook secret + any new keys.

### Integration Points
- **Confirm step** — `confirmBooking` redirect target changes from `/bookings/[id]` to a PayMongo Checkout Session; the `pending→confirmed` flip moves to the webhook (D-57). The reserve page (Phase 4) gains a pending-payment state.
- **New payout-ledger table** — records each booking's payout (state, frozen commission rate+amount, net, transfer id, timestamps) driving both the sweep idempotency (D-56) and the HOST-03 view (D-59).
- **New background-job runner** — the T+24h sweep (D-56); nothing async-scheduled exists yet in the codebase.
- **HOST-03 page** — lives under the `(host)` route group (Phase 2 already has a `/host/payouts/refresh` onboarding route to sit alongside).

</code_context>

<specifics>
## Specific Ideas

- **Payout timing anchored to real analogs** — the user explicitly wanted to know how comparable apps do it before deciding. Peerspace (hourly space rental) anchors payout to booking **end**; that shaped D-55 (`endsAt` anchor, 24h buffer). Keep the Peerspace `scheduled → processing → paid` status vocabulary for the HOST-03 view (D-59).
- **Host payout must be a fixed, explainable `price − 10%`** — the platform eating the gateway fee (D-52) is a deliberate host-experience choice, not an accident. Keep it explicit in the payout math.

</specifics>

<deferred>
## Deferred Ideas

- **Cancellation/refund policy matrix + booker cancel flow** → **Phase 7** (BOOK-07, PAY-06). Phase 5 builds only the refund mechanism (D-60).
- **Instant-book vs request-to-book fork, authorize→capture, host approve/decline** → **Phase 6** (BOOK-04/05, PAY-05, HOST-01). Phase 5 is instant-capture only.
- **Dispute/chargeback handling beyond the refund mechanism** → future (Phase 7+); Phase 5 handles the `refund` webhook event but not a full dispute workflow.
- **`listing.currency` default cleanup** — the `listing` table still defaults `currency` to `"usd"` (schema line ~179) while `booking.currency` is `"php"` (D-46). Known deferred inconsistency (logged in STATE blockers). The planner should reconcile listing currency to PHP as part of, or before, the payment wiring so charge currency is consistent end-to-end.

</deferred>

---

*Phase: 05-payments-payouts*
*Context gathered: 2026-07-16*
