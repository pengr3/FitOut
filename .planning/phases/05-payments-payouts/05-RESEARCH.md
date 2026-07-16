# Phase 5: Payments & Payouts - Research

**Researched:** 2026-07-16
**Domain:** PayMongo marketplace payments (hosted checkout, hold-until-session payout, refund mechanism) on a proven Postgres/Drizzle/Next.js booking core
**Confidence:** HIGH on architecture & code integration; HIGH on the checkout/refund API surface; MEDIUM on the beta money-movement (`/v2` transfers + linked-account wallet payout) surface, which is sales-gated and thinly documented publicly.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Commission (PAY-02)**
- **D-50:** Commission is a **host-side deduction**. The booker pays the listed price with **no booker-facing fee line** — the price breakdown stays `subtotal = total`. The host receives `price − commission`.
- **D-51:** Commission rate = **10%, config-tunable** (a config value, not a hardcoded literal). **Freeze the applied commission (rate + computed amount) on the payout-ledger row at charge/payout time** so a later rate change never retroactively alters past payouts.
- **D-52:** **The platform absorbs PayMongo's gateway fee.** The host always receives exactly `price − 10%`; the platform's effective take is `10% − gateway fee`. Host payout is a fixed, explainable number.

**Payment Methods & Checkout (PAY-01)**
- **D-53:** Checkout offers the **full PH rail set — cards + GCash + Maya + QRPh**. PAY-01 "by card" is a floor, not a ceiling.
- **D-54:** Payment is collected on a **hosted PayMongo page** (redirect → PayMongo-hosted page with all rails → return to a FitOut confirmation URL). PCI-light. **Researcher picks the exact PayMongo primitive** (Checkout Session vs Links vs Payment Intent + hosted redirect). The **return redirect is a UX signal only**; the payment webhook confirms the booking.

**Payout Timing (PAY-03)**
- **D-55:** A host's payout becomes eligible **T+24h after the session ENDS** (anchored to `booking.endsAt`). 24h is a mechanism default Phase 7 can tune.
- **D-56:** Payout fired by a **scheduled batch sweep** — finds `confirmed` bookings where `endsAt + 24h ≤ now()` and not-yet-paid-out, issues them via **`POST /v2/batch_transfers`** (`provider:"paymongo"`, `inhouse`) of `(quotedTotalCents − commission)` to each host's Linked-Account wallet. Idempotent via a **payout-ledger row**. Introduces the **background-job runner (Inngest or BullMQ+Redis)** — researcher/planner picks. "Release" = firing the transfer into the host's PayMongo wallet; "arrival" = PayMongo → host bank (downstream, not ours).

**Payment Wiring / Confirm Authority**
- **D-57:** **The `payment.paid` webhook is the confirm authority.** The Phase-4 synchronous `confirmBooking` `pending→confirmed` UPDATE is **retired**. Confirm button → **"Confirm & pay"** → creates the checkout → redirects to PayMongo; on return the booker sees a brief **"payment received, finalizing…"** state until the webhook confirms. Rejected: trusting the browser return redirect.
- **D-58:** **Never keep money for an undeliverable slot.** Extend the pending-hold TTL to align with the checkout-session window (so a paying booker keeps their slot) **AND** an **auto-refund backstop**: on a `payment.paid` where the slot is genuinely gone, auto-refund the booker.

**Host Payout View (HOST-03)**
- **D-59:** A host **earnings/payouts page** — per-booking rows with payout **state** (`Held` → `Processing` → `Paid`, plus `Refunded`), the `gross → −10% → net` breakdown, the **expected payout date**, **plus a summary total**. The host **sees the commission line** (unlike the booker). Lives under the `(host)` route group.

**Refund / Dispute Scope**
- **D-60:** Phase 5 builds the refund **MECHANISM only** — the PayMongo refund call, `refund`-event webhook handling (idempotent via `paymongo_event`), and the D-58 auto-refund backstop. A pre-payout refund is just a platform-wallet refund (host never paid → no clawback). **NO booker-facing cancel flow and NO refund-% tiers** — Phase 7.

### Claude's Discretion
- Exact PayMongo primitive for the hosted checkout (Checkout Session vs Links vs Payment Intent) — **research resolves → Checkout Sessions** (see Standard Stack / Architecture).
- Background-job runner choice (Inngest vs BullMQ+Redis) and sweep cadence/granularity — **research resolves → Inngest cron** (see Standard Stack / Architecture).
- Schema shape for the payout-ledger + commission storage; whether to add an explicit `completed` status transition vs deriving payout-eligibility from `confirmed` + `endsAt` (`booking_status` enum already includes an unused `completed`) — **planner's call**; research recommends deriving from `confirmed + endsAt` and keeping the ledger state machine separate.

### Deferred Ideas (OUT OF SCOPE)
- **Cancellation/refund policy matrix + booker cancel flow** → Phase 7 (BOOK-07, PAY-06). Phase 5 builds only the refund mechanism (D-60).
- **Instant-book vs request-to-book fork, authorize→capture, host approve/decline** → Phase 6 (BOOK-04/05, PAY-05, HOST-01). Phase 5 is instant-capture only.
- **Dispute/chargeback handling beyond the refund mechanism** → future.
- **`listing.currency` default cleanup** (`listing.currency` still defaults `"usd"` while `booking.currency` is `"php"`). Known deferred inconsistency — the planner should reconcile listing currency to PHP as part of, or before, the payment wiring. (Treated as in-scope hygiene below, not a new feature.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **PAY-01** | Booker can pay for a booking online (full PH rails, D-53) | PayMongo **Checkout Sessions** (`POST /v1/checkout_sessions`) with `payment_method_types: ["card","gcash","paymaya","qrph"]` — one hosted page, all rails. Charge one line_item = `booking.quotedTotalCents`. `reference_number = booking.id`. Confirm via `checkout_session.payment.paid` webhook (D-57). |
| **PAY-02** | Platform deducts a commission from each booking (host-side, D-50/51/52) | Integer-cents commission (`round(gross × rate_bps / 10000)`), rate from config (`COMMISSION_RATE_BPS`), rate + amount frozen on a new `host_payout_ledger` row at charge/payout time. Booker breakdown stays `subtotal = total`. |
| **PAY-03** | Host receives a payout, funds held until after the session (D-55/56) | `POST /v2/batch_transfers` `provider:"paymongo"` inhouse transfer of `net_cents` to the host's Linked-Account wallet, fired by an **Inngest cron sweep** for `confirmed` bookings where `endsAt + PAYOUT_DELAY ≤ now()` with no ledger row. At-most-once via a `UNIQUE(booking_id)` ledger row + stable Idempotency-Key. |
| **HOST-03** | Host can see payout status (owed / paid, D-59) | The `host_payout_ledger` table drives a `(host)` earnings page: per-booking `Held→Processing→Paid/Refunded`, `gross → −10% → net`, expected date, summary totals. States mirror Peerspace's `scheduled → processing → paid`. |
</phase_requirements>

## Summary

Phase 5 wires real money onto the proven Phase-4 booking core along the **single instant-capture path**. The shape is fully constrained by CONTEXT.md (D-50..D-60) and CLAUDE.md's "Marketplace Payments" section; the researcher's job was to (1) pick the concrete PayMongo primitives and job runner the CONTEXT deferred, and (2) verify the exact API/webhook surface against **current** PayMongo docs (which now live at `docs.paymongo.com`, having migrated from `developers.paymongo.com`).

**Two firm recommendations resolve the open decisions:** use **PayMongo Checkout Sessions** for the hosted charge (it is the only primitive that renders all four required rails on one PayMongo-hosted page under explicit API control, round-trips the booking id via `reference_number`, and emits the purpose-built `checkout_session.payment.paid` webhook that becomes the D-57 confirm authority); and use **Inngest** (v4.13.0, verified latest) for the T+24h payout sweep (native timezone-aware cron, zero Redis/worker infra, cross-platform dev server on Windows, free tier that dwarfs a single-city sweep — consistent with the project's deliberate "no Redis" stance in D-48).

**The single most important risk surfaced by this research: PayMongo does NOT support QR Ph refunds via API** (docs: "Not supported… contact support"), and UBP online banking refunds are also unavailable. This directly threatens the D-58 auto-refund backstop and D-60 refund mechanism for exactly the rail D-53 requires. GCash/GrabPay support partial refunds; Maya is full-only on the same day. The plan MUST NOT assume the auto-refund path works for every rail — see Common Pitfalls #1. This makes the D-58 **extend-the-hold** half (which prevents the race in the common case) load-bearing, not merely a nicety, and mandates an operator-alert fallback for the QRPh edge.

The codebase is unusually well-prepared: `src/lib/paymongo.ts` (Basic auth + Idempotency-Key + fail-closed boot), the signature-verified single-writer webhook route, the `paymongo_event` idempotency ledger, the server-frozen `quotedTotalCents`, and the `mapBookingError`/`isPgError` cause-walking are all directly reusable. The two genuinely new pieces are the **payout-ledger table + Inngest sweep** and the **`/v2` base override** in the fetch wrapper.

**Primary recommendation:** Checkout Sessions for the charge (`reference_number = booking.id`; confirm on `checkout_session.payment.paid`); a `host_payout_ledger` table as the single source of truth for both sweep idempotency and HOST-03; Inngest cron for the sweep; treat QRPh's no-refund constraint as a first-class design input, not an edge case.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Create hosted checkout (charge intent) | API / Server Action | — | Amount is `booking.quotedTotalCents` — server-frozen, never a client number (D-49, Security V4). PayMongo secret key is server-only. |
| Render the payment page (rail selection, card entry) | PayMongo (external, hosted) | Browser (redirect target) | PCI-light: FitOut never touches card data. Booker is redirected out and back (D-54). |
| Confirm booking `pending → confirmed` | API / Webhook (`/api/paymongo/webhook`) | — | The webhook is the confirm authority (D-57), the single writer. The browser return is a UX signal only. |
| Commission computation + freeze | API / Server (ledger write) | Database (persist frozen) | Integer-cents math server-side; frozen on the ledger row (D-51). Never client-computed. |
| Payout eligibility detection (T+24h sweep) | Background job (Inngest cron) | Database (sweep query) | Time-driven; the first async-scheduled job in the codebase (D-56). |
| Fire payout transfer | API (Inngest step → `paymongo.ts` → `/v2/batch_transfers`) | PayMongo (external rail) | Server-only secret + Idempotency-Key; at-most-once guarded by the ledger row. |
| Payout state transitions (`Held→Processing→Paid`) | API / Ledger writer | PayMongo transfer callback OR poll | Transfer status is NOT a standard webhook subscription event — arrives via per-transfer `callback_url` or `GET`. |
| Refund (mechanism only) | API / Server (`paymongo.ts`) + Webhook | — | `POST /v1/refunds` server-side; `payment.refunded` / `payment.refund.updated` webhook is idempotent via `paymongo_event`. |
| HOST-03 earnings view | Frontend Server (RSC under `(host)`) | Database (ledger read) | Owner-gated read of `host_payout_ledger` (Security V4 — the route group is not the gate). |
| Hold-vs-payment race mitigation | API / Server (extend TTL) + Webhook (auto-refund backstop) | Database (EXCLUDE constraint) | Extend `booking.expiresAt` when the checkout is created; EXCLUDE still the double-book authority (D-58). |

## Standard Stack

### Core (already in the codebase — reuse, do not re-adopt)

| Library | Version (verified) | Purpose | Why Standard |
|---------|--------------------|---------|--------------|
| PayMongo REST (thin `fetch` wrapper) | `src/lib/paymongo.ts` (no SDK) | Checkout Sessions, batch transfers, refunds, wallet lookup | No official SDK exists `[VERIFIED: docs.paymongo.com — "no SDK"]`. The wrapper already does Basic auth + Idempotency-Key + fail-closed boot. |
| Drizzle ORM | `0.45.2` (package.json) | New `host_payout_ledger` table + migrations | SQL-first; hand-author the currency-default migration + any partial indexes (same idiom as `0006`). |
| PostgreSQL | 18 (`postgis/postgis:18-3.6`) | Ledger persistence, sweep query, at-most-once `UNIQUE(booking_id)` | Transactional integrity for money; the EXCLUDE constraint still guards the slot during the payment race. |
| Zod | `4.4.3` (package.json) | Validate webhook payload shape + server-action inputs | ⚠️ Project is on **Zod 4**, not the Zod 3 CLAUDE.md mentions — follow the existing `src/lib/validation/*` idioms. |
| Next.js (App Router) | `16.2.7` | Server actions (create checkout), webhook route handler, `(host)` RSC page | The existing webhook route (`runtime = "nodejs"`) is the pattern to extend. |

### Supporting (new for this phase)

| Library | Version (verified) | Purpose | When to Use |
|---------|--------------------|---------|-------------|
| **Inngest** | `4.13.0` (latest, published 2026-07-15) `[VERIFIED: npm view inngest version]` | Timezone-aware cron for the T+24h payout sweep; retries + observability + step memoization | The T+24h sweep (D-56). Mount `serve()` as a Next.js route handler; the SDK is the only dependency. |
| **inngest-cli** (dev only) | `1.37.0` `[VERIFIED: npm]` | Local Inngest Dev Server (`npx inngest-cli@latest dev`) | Local development on Windows — no Redis, no separate worker, cross-platform. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| **Checkout Sessions** | PayMongo **Links** | Links are API-creatable but dashboard-oriented and less explicit about `payment_method_types`; refund endpoint is even Link-specific (`/v1/payment-links/:id/refunds`). Checkout Sessions give explicit rail control + `reference_number` + `checkout_session.payment.paid`. |
| **Checkout Sessions** | **Payment Intent + Payment Method + manual hosted redirect** | You build the rail-selection UI and manage `source.chargeable`/`payment.paid` yourself — more code, less PCI-light. Only worth it for the Phase-6 card manual-capture (authorize→capture) fork, which is explicitly out of scope here. |
| **Inngest** | **BullMQ + Redis** (`bullmq 5.80.5`, `ioredis 5.11.1`) | Requires standing up Redis + a separate always-on worker process — contradicts D-48's deliberate "no Redis this project" stance and doesn't fit the Next.js monolith or a serverless deploy. Cheaper at very high volume; overkill for a single-city v1. |
| **Inngest** | **`node-cron` / container cron** hitting an internal sweep route | Zero external SaaS, but you hand-build retries, idempotency, observability, and locking. Inngest gives those for free; the payout-ledger row is still the at-most-once authority either way. Viable fallback if avoiding a managed dependency is a hard requirement. |

**Installation:**
```bash
npm install inngest
npm install --save-dev inngest-cli   # or use `npx inngest-cli@latest dev`
```

**Version verification (run at plan time — training/search versions drift):**
```bash
npm view inngest version        # confirmed 4.13.0 on 2026-07-16
npm view inngest-cli version    # confirmed 1.37.0 on 2026-07-16
```

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────────────────────┐
                         │  BOOKER (browser)                            │
                         └───────────────┬─────────────────────────────┘
                                         │ clicks "Confirm & pay"
                                         ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │  confirmBooking server action  (src/app/actions/booking.ts — RETIRE the   │
   │  synchronous pending→confirmed flip per D-57)                             │
   │   1. owner-gate + load booking (must be own pending hold)                 │
   │   2. EXTEND booking.expiresAt → now()+PAYMENT_WINDOW  (D-58 anti-race)    │
   │   3. paymongo.createCheckoutSession({                                     │
   │        amount = booking.quotedTotalCents (server-frozen, D-49),           │
   │        payment_method_types = [card, gcash, paymaya, qrph] (D-53),        │
   │        reference_number = booking.id, metadata.booking_id = booking.id,   │
   │        success_url = /bookings/[id]?paid=1,  cancel_url = reserve page }) │
   │        Idempotency-Key: `checkout:<bookingId>`                            │
   └───────────────┬──────────────────────────────────────────────────────────┘
                   │ redirect(checkout_url)
                   ▼
   ┌──────────────────────────────┐        booker pays via any rail
   │  PayMongo hosted checkout     │◀───────────────────────────────────────────┐
   │  page (cards/GCash/Maya/QRPh) │                                             │
   └───────────────┬──────────────┘                                             │
                   │ (A) browser return → /bookings/[id]?paid=1                  │
                   │     UX ONLY → shows "payment received, finalizing…"         │
                   │ (B) PayMongo → webhook  checkout_session.payment.paid  ─────┘
                   ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │  POST /api/paymongo/webhook  (existing single-writer route)               │
   │   verify Paymongo-Signature → dedupe by event id (paymongo_event)         │
   │   switch(type):                                                           │
   │     checkout_session.payment.paid:                                        │
   │        bookingId = data.attributes.data.attributes.reference_number       │
   │        paymentId = ...payments[0].id  (store for refunds)                 │
   │        atomic UPDATE booking SET status='confirmed' WHERE id=bookingId    │
   │            AND status='pending'  (EXCLUDE still guards the slot)          │
   │        rows==1 → confirmed  ✔                                             │
   │        rows==0 → slot gone → AUTO-REFUND backstop (D-58) ⚠ QRPh = alert   │
   │     payment.refunded / payment.refund.updated:                           │
   │        mark ledger/booking refunded (idempotent)                         │
   └──────────────────────────────────────────────────────────────────────────┘

   ── LATER: T+24h after booking.endsAt ───────────────────────────────────────
   ┌──────────────────────────────────────────────────────────────────────────┐
   │  Inngest CRON  (e.g. hourly, TZ=Asia/Manila)                              │
   │   sweep: confirmed bookings, endsAt + PAYOUT_DELAY ≤ now(), no ledger row │
   │   for each:                                                               │
   │     INSERT host_payout_ledger (UNIQUE booking_id) — at-most-once gate     │
   │        freeze rate_bps + commission_cents + net_cents  (D-51)            │
   │     resolve host wallet: GET /v2/wallets (linked account, activated)      │
   │     POST /v2/batch_transfers { transfers:[{ provider:'paymongo',          │
   │        amount: net_cents, currency:'PHP',                                 │
   │        destination_account:{ number: hostWallet.account_number,           │
   │                              name, bic:'PAEYPHM2XXX' }, ... }] }          │
   │        Idempotency-Key: `payout:<bookingId>`                              │
   │     ledger.state = 'processing' (release fired)                          │
   └───────────────┬──────────────────────────────────────────────────────────┘
                   │ transfer status change → per-transfer callback_url  OR poll GET
                   ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │  Payout callback endpoint (or Inngest poll step)                         │
   │   succeeded → ledger.state='paid';  failed → 'failed' (retry)            │
   │   feeds HOST-03  (Held→Processing→Paid/Refunded)                         │
   └──────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (additions only)
```
src/
├── lib/
│   ├── paymongo.ts                 # EXTEND: createCheckoutSession, createBatchTransfer(v2),
│   │                               #         createRefund, listWalletAccounts(v2). Fix /v1 vs /v2 base.
│   ├── payments/
│   │   ├── commission.ts           # pure: computeCommission(gross, rateBps) → {rateBps, commissionCents, netCents}
│   │   └── config.ts               # COMMISSION_RATE_BPS, PAYOUT_DELAY_HOURS, PAYMENT_WINDOW_MINUTES (config, not literals)
│   └── db/schema.ts                # ADD host_payout_ledger table; reconcile listing.currency default → 'php'
├── inngest/
│   ├── client.ts                   # new Inngest({ id: "fitout" })
│   └── functions/payout-sweep.ts   # cron function (TZ=Asia/Manila)
├── app/
│   ├── api/
│   │   ├── inngest/route.ts         # serve() handler (GET/POST/PUT)
│   │   └── paymongo/
│   │       ├── webhook/route.ts     # EXTEND: checkout_session.payment.paid + refund events
│   │       └── payout-callback/route.ts  # (optional) transfer status callback_url target
│   ├── actions/booking.ts           # RETIRE synchronous flip; create checkout + extend hold (D-57/D-58)
│   └── (host)/host/earnings/page.tsx # HOST-03 view (D-59)
```

### Pattern 1: Checkout Session as the charge, `reference_number` as the round-trip
**What:** Create a Checkout Session server-side with a single line item equal to the frozen quote, all four rails enabled, and `reference_number = booking.id`. Redirect to `checkout_url`.
**When to use:** The "Confirm & pay" action (D-57). This replaces the Phase-4 synchronous confirm.
**Example:**
```typescript
// Source: docs.paymongo.com/reference/create-a-checkout [CITED]
// POST https://api.paymongo.com/v1/checkout_sessions
{
  data: {
    attributes: {
      line_items: [{
        amount: booking.quotedTotalCents,   // integer centavos, server-frozen (D-49) — NEVER a client value
        currency: "PHP",
        name: `Booking ${bookingReference}`, // reference for the booker's receipt
        quantity: 1,
      }],
      payment_method_types: ["card", "gcash", "paymaya", "qrph"], // D-53 full rail set
      reference_number: booking.id,          // round-trips the booking id back on the webhook
      metadata: { booking_id: booking.id },  // belt-and-suspenders (string values only)
      description: `FitOut booking ${bookingReference}`,
      success_url: `${base}/bookings/${booking.id}?paid=1`, // UX signal ONLY (D-57)
      cancel_url:  `${base}/listings/${booking.listingId}/book?hold=${booking.id}`,
      send_email_receipt: true,
    },
  },
}
// Response: data.id (cs_...), data.attributes.checkout_url, data.attributes.payment_intent,
//           data.attributes.payments[] (populated after payment), data.attributes.status ("active"|"expired")
```
Notes: `payment_method_types` verified allowed values include `card, gcash, grab_pay, paymaya, shopee_pay, qrph, billease, dob, dob_ubp, brankas_*` `[VERIFIED: docs.paymongo.com/reference/create-a-checkout]`. `paymaya` is the API name for Maya. Send a stable `Idempotency-Key: checkout:<bookingId>` so a double-click of "Confirm & pay" returns the same session instead of a second charge.

### Pattern 2: Webhook as confirm authority (extend the existing single-writer route)
**What:** Add `checkout_session.payment.paid` to the existing switch. Derive the booking id from the verified event body (never a client field — same discipline as the merchant.activated handler). Flip `pending → confirmed` atomically.
**When to use:** D-57. The browser return to `success_url` only renders "finalizing…"; the webhook is truth.
**Example:**
```typescript
// Source: existing src/app/api/paymongo/webhook/route.ts pattern + docs.paymongo.com webhooks [CITED]
// event.data.attributes.type === "checkout_session.payment.paid"
// The resource is nested under attributes.data (a CheckoutSession):
const cs = event.data?.attributes?.data;                 // the checkout_session resource
const bookingId  = cs?.attributes?.reference_number;      // === booking.id
const paymentId  = cs?.attributes?.payments?.[0]?.id;     // pay_... — STORE for refunds
// Single-writer, EXCLUDE still guards the slot:
const rows = await db.execute(sql`
  UPDATE booking SET status='confirmed', expires_at=NULL
  WHERE id=${bookingId} AND status='pending' RETURNING id`);
if (rows.length === 0) {
  // D-58 backstop: slot genuinely gone (swept + retaken). Auto-refund the payment.
  // ⚠ QRPh cannot be API-refunded — enqueue an operator alert instead (see Pitfall #1).
}
```
⚠️ **Confirm the exact webhook payload nesting during implementation** — `checkout_session.payment.paid` delivers the CheckoutSession resource (carrying `reference_number`, `metadata`, `payments[]`), but the precise path (`event.data.attributes.data.attributes.*`) should be asserted against a captured live/test event, because the docs do not spell out the event envelope field-by-field. `[ASSUMED — payload nesting]`

### Pattern 3: Payout ledger as the at-most-once gate (sweep idempotency)
**What:** Before firing any transfer, `INSERT` a ledger row with `UNIQUE(booking_id)`. A duplicate sweep hits the unique violation and skips. The row freezes commission (D-51) and drives HOST-03 (D-59).
**When to use:** D-56 sweep.
**Example:**
```sql
-- The at-most-once guard: the INSERT itself is the lock (unique booking_id).
INSERT INTO host_payout_ledger (id, booking_id, host_id, payment_id, gross_cents,
  commission_rate_bps, commission_cents, net_cents, currency, state)
VALUES (:id, :bookingId, :hostId, :paymentId, :gross, :rateBps, :commission, :net, 'PHP', 'held')
ON CONFLICT (booking_id) DO NOTHING RETURNING id;
-- RETURNING empty ⇒ another sweep already owns this booking ⇒ skip (no transfer fired).
```
Then fire the transfer with `Idempotency-Key: payout:<bookingId>` and a stable `reference_number` so even a retried API call cannot double-pay.

### Pattern 4: The T+24h sweep query (D-56)
```sql
-- confirmed bookings whose session ended ≥ PAYOUT_DELAY ago, with no payout row yet.
SELECT b.id AS booking_id, b.listing_id, b.quoted_total_cents, b.currency,
       l.host_id, hp.paymongo_account_id
FROM booking b
JOIN listing l ON l.id = b.listing_id
JOIN host_payout hp ON hp.user_id = l.host_id
LEFT JOIN host_payout_ledger p ON p.booking_id = b.id
WHERE b.status = 'confirmed'
  AND b.ends_at + make_interval(hours => :payoutDelayHours) <= now()  -- DB clock, not app clock
  AND p.id IS NULL
ORDER BY b.ends_at ASC
LIMIT :batchSize;
```
**Cadence:** hourly is sufficient (T+24h is coarse; sub-hour granularity buys nothing). Inngest cron `{ cron: "TZ=Asia/Manila 0 * * * *" }`. Use the **DB clock** (`now()`) in the predicate, not an injectable JS clock (mirrors the Phase-4 lazy-expiry Pitfall 7 discipline).

### Anti-Patterns to Avoid
- **Trusting the browser return redirect as proof of payment** — forgeable/droppable; the webhook is the only truth (D-57, explicitly rejected in CONTEXT).
- **PayMongo "payment splitting"** — settles the host at payment time; violates hold-until-session (CLAUDE.md "What NOT to Use", D-20). Always collect-to-platform → HOLD → transfer-after-session.
- **Paying the host at booking time** — funds are held on the platform wallet until T+24h post-session (D-55).
- **Charging a client-supplied amount** — charge exactly `booking.quotedTotalCents` (D-49, Security V4).
- **Floating-point money** — integer centavos everywhere; `round(gross × rate_bps / 10000)` with a single defined rounding.
- **A second app-level "already paid out?" query-then-insert** — the `UNIQUE(booking_id)` ledger row is the atomic gate, exactly as the EXCLUDE constraint is for double-booking.
- **Re-checking `expires_at > now()` in the webhook confirm** — once payment lands, the payment is the authority; the extend-hold (D-58) keeps the row alive, and the EXCLUDE (not the TTL) is what prevents a genuine double-confirm.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hosted card + wallet + QRPh payment page | A custom multi-rail checkout / card form | PayMongo **Checkout Sessions** | PCI scope, rail integrations, 3DS, receipts — all handled by PayMongo. |
| Webhook signature verification | New HMAC code | The **existing** `verifySignature` in `webhook/route.ts` | Already constant-time, dual test/live digest, RangeError-guarded, raw-body-correct. |
| Webhook replay/idempotency | A new dedupe table | The **existing** `paymongo_event` ledger | Same pattern the refund + payment events slot into. |
| Scheduled retries/observability for the sweep | A bespoke cron + retry loop + lock | **Inngest** function steps | Built-in retries, step memoization, concurrency/singleton controls, dashboard. |
| At-most-once payout | An app-level "is it paid?" check | `UNIQUE(booking_id)` on the ledger + stable Idempotency-Key | DB-enforced; the check-then-act version races (the same class of bug the EXCLUDE constraint exists to kill). |
| SQLSTATE detection through Drizzle wrapping | New error string-matching | The **existing** `isPgError` (cause-walking) | Drizzle wraps driver errors; `isPgError` already walks `.cause`. |
| Currency formatting | New formatter | `src/lib/money.ts` `formatMoney` | Single shared PHP source. |

**Key insight:** Almost every cross-cutting concern this phase needs (auth, signature verify, idempotency ledger, frozen price, error mapping, money formatting) already exists from Phases 1–4. The genuinely new build is small: the ledger table, the Inngest sweep, three new `paymongo.ts` calls, and the HOST-03 page.

## Runtime State Inventory

> Phase 5 is additive (new table + new calls), not a rename/migration. The only "runtime state" concern is external PayMongo state and one schema default.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | New `host_payout_ledger` rows; `booking.payment_id` (PayMongo `pay_...`) must be captured at confirm time so a later refund can reference it. | Schema addition + webhook capture. |
| Live service config | PayMongo **webhook subscription** must include `checkout_session.payment.paid`, `payment.refunded`, `payment.refund.updated` (in addition to the Phase-2 `merchant.*` events). This is configured in the PayMongo dashboard/API, **not in git**. Transfer status is NOT a subscription event (per-transfer `callback_url`). | Register events on the PayMongo webhook; register the payout `callback_url` if used. |
| OS-registered state | None — the sweep runs via Inngest (managed), not OS cron/Task Scheduler. | None. |
| Secrets/env vars | `PAYMONGO_SECRET_KEY`, `PAYMONGO_PUBLIC_KEY`, `PAYMONGO_WEBHOOK_SECRET` already present in `.env`/`.env.example`. New: `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` (prod), `COMMISSION_RATE_BPS`, `PAYOUT_DELAY_HOURS`, `PAYMENT_WINDOW_MINUTES`, and the platform wallet account number/BIC for the transfer `source_account`. Extend the fail-closed boot guard to the new required prod secrets. | Add env vars + extend the prod boot guard. |
| Build artifacts | None. | None. |

**Schema default drift found:** `listing.currency` still `DEFAULT 'usd'` (schema line 179) while `booking.currency` is `'php'`. Reconcile to `'php'` (D-46 deferred item) before/with the charge wiring so charge currency is consistent end-to-end. Verified by reading `src/lib/db/schema.ts`.

## Common Pitfalls

### Pitfall 1: QR Ph (and UBP) refunds are NOT supported by the PayMongo API — the D-58/D-60 blocker
**What goes wrong:** A booker pays via **QRPh** (a D-53-required rail), the slot turns out to be genuinely gone, and the D-58 auto-refund backstop calls `POST /v1/refunds` — which **fails**, because "QR Ph and UBP Online Banking refunds [are] unavailable; contact support." Money is stuck on the platform wallet with no automated path back.
**Why it happens:** PayMongo's refund rails differ per method: GCash (180-day window, partial OK), GrabPay (90-day, partial OK), Maya (12-month, **full-only same day**, partial next day), cards (60-day). **QRPh: not supported.** `[VERIFIED: docs.paymongo.com/docs/payment-acceptance-refunds]`
**How to avoid:**
1. Make the D-58 **extend-hold** the primary defense so the race essentially never fires (a paid booker keeps their slot). Extend `booking.expiresAt` to cover the payment window the moment the checkout session is created.
2. In the auto-refund backstop, branch on the payment method: if refundable (card/GCash/GrabPay/Maya-same-day-full), refund via API; if **QRPh/UBP**, write a `failed`/`needs_manual_refund` ledger state and **emit an operator alert** (this is the honest, correct behavior — surface it, don't silently swallow it).
3. Record the payment method on the booking/ledger at confirm time (available on the checkout session's payments/source) so the backstop can branch.
**Warning signs:** An auto-refund call returning a 4xx with a rail-not-supported error; QRPh payments landing on already-taken slots in logs.

### Pitfall 2: Transfer status is not a webhook subscription event
**What goes wrong:** You subscribe to webhook events expecting a `transfer.succeeded`/`payout.paid` event to move the ledger `Processing → Paid`, but it never arrives — the create-a-webhook event enum has **no transfer/payout/disbursement events** `[VERIFIED: docs.paymongo.com/reference/create-a-webhook]`.
**Why it happens:** The money-movement (`/v2`) transfer API communicates status via a **per-transfer `callback_url`** (set in the transfer body) or by polling `GET /v2/transfers/{id}` / `GET /v2/batch_transfers/{id}` — a different mechanism from the Paymongo-Signature webhook subscription.
**How to avoid:** Decide up front: (a) set `callback_url` per transfer to a new `/api/paymongo/payout-callback` route, or (b) have an Inngest step poll `GET` the transfer until terminal. Since D-56 defines "release" = firing the transfer, it is acceptable to mark the ledger `Processing` on the 201 create and reconcile to `Paid` via poll/callback; the booker experience doesn't depend on it. **Verify the callback signature scheme** — it may differ from the standard `Paymongo-Signature` (docs don't specify). `[ASSUMED — callback auth]`
**Warning signs:** Ledger rows stuck at `Processing`.

### Pitfall 3: The `/v1` vs `/v2` base in the fetch wrapper
**What goes wrong:** `paymongo.ts` hardcodes `PAYMONGO_BASE = "https://api.paymongo.com/v1"`. Checkout Sessions and refunds are `/v1`; **batch transfers and wallets are `/v2`**. A `/v2` call built naively hits `/v1/v2/...`.
**How to avoid:** Refactor to `PAYMONGO_BASE = "https://api.paymongo.com"` and pass a versioned path (`/v1/checkout_sessions`, `/v2/batch_transfers`), or add a per-call base override. Keep the Idempotency-Key + fail-closed behavior unchanged. Verified against `src/lib/paymongo.ts` line 21.

### Pitfall 4: The webhook flip must not re-impose the Phase-4 expiry check
**What goes wrong:** The Phase-4 `confirmBooking` UPDATE guards `expires_at > now()`. If the webhook handler copies that predicate verbatim and the extend-hold window has lapsed, a legitimately-paid booking fails to confirm and the booker is charged with no booking.
**How to avoid:** In the webhook, confirm on `status='pending'` alone (payment is the authority, D-57). The EXCLUDE constraint — not the TTL — prevents a genuine double-confirm. The extend-hold (D-58) keeps the row from being swept in the first place. If `rows==0`, run the auto-refund backstop (Pitfall 1), do not silently drop.

### Pitfall 5: Commission rounding and the "platform absorbs the gateway fee" invariant
**What goes wrong:** Percentage math in floats yields off-by-one centavo payouts; or the transfer amount accidentally nets out the PayMongo gateway fee, so the host receives less than `price − 10%`.
**How to avoid:** `commissionCents = Math.round(gross * rateBps / 10000)`; `netCents = gross − commissionCents`; transfer **exactly `netCents`** (D-52 — the platform eats the gateway fee, so `net` is never reduced by it). Freeze `rateBps` + `commissionCents` on the ledger row (D-51). Unit-test boundary amounts.

### Pitfall 6: Booker breakdown must stay `subtotal = total`
**What goes wrong:** A "commission"/"service fee" line leaks into the booker's `PriceBreakdown`.
**How to avoid:** Commission is host-side only (D-50). The Phase-4 `PriceBreakdown` atom's RESERVED fee slot is for a future **booker-visible** line, NOT the commission — leave the booker view at `subtotal = total`. The commission line appears only on HOST-03 (D-59).

## Code Examples

### Batch transfer (inhouse payout to a host's linked-account wallet)
```typescript
// Source: docs.paymongo.com/reference/create-batch-transfer + /reference/list-all-wallet-accounts [CITED]
// Step 1: resolve the host's wallet (once per payout, or cache the account_number).
// GET https://api.paymongo.com/v2/wallets?status=activated  →
//   data[].id, data[].account.account_number, data[].account.account_name, data[].status, provider:"paymongo"
// Step 2: fire the transfer.
// POST https://api.paymongo.com/v2/batch_transfers   Idempotency-Key: payout:<bookingId>
{
  transfers: [{
    provider: "paymongo",                 // inhouse wallet-to-wallet (no external rail)
    amount: netCents,                     // integer centavos = gross − commission (D-52: NOT reduced by gateway fee)
    currency: "PHP",
    purpose: "Marketplace payout",
    description: `FitOut payout booking ${bookingRef}`,
    reference_number: `payout-${bookingId}`,   // stable per booking → dedup on retry
    source_account:      { number: PLATFORM_WALLET_NUMBER, name: PLATFORM_WALLET_NAME, bic: "PAEYPHM2XXX" },
    destination_account: { number: hostWallet.account_number, name: hostWallet.account_name, bic: "PAEYPHM2XXX" },
    callback_url: `${base}/api/paymongo/payout-callback`,
    metadata: { booking_id: bookingId },
  }],
}
// Response 201: batch id batch_tr_..., transfers[].id, transfers[].status ("pending"→"processing"→"succeeded"/"failed")
```
Notes: `provider:"paymongo"` = inhouse; PayMongo BIC = `PAEYPHM2XXX` `[VERIFIED: docs.paymongo.com/reference/create-batch-transfer]`. Even a single payout is wrapped in a `transfers` array of one. **The exact way a linked-account (child) wallet is exposed to the platform for `destination_account` is beta/sales-gated and thinly documented — verify with PayMongo that `GET /v2/wallets` enumerates linked-account wallets (vs only the platform's own) and returns a usable `account_number`.** `[ASSUMED — linked-account wallet enumeration]`

### Refund (mechanism only, D-60)
```typescript
// Source: docs.paymongo.com/reference/create-a-refund + /docs/payment-acceptance-refunds [CITED]
// POST https://api.paymongo.com/v1/refunds   Idempotency-Key: refund:<paymentId>
{
  data: { attributes: {
    amount: gross,                 // full refund (D-60: no % tiers in Phase 5); ≤ payment amount
    payment_id: booking.paymentId, // captured from checkout_session.payment.paid
    reason: "others",              // allowed: duplicate | fraudulent | others (verify enum at impl)
    notes: `Auto-refund: slot unavailable (booking ${bookingRef})`,
  } },
}
// Refund webhook events: payment.refunded, payment.refund.updated  → idempotent via paymongo_event ledger
// ⚠ Will FAIL for QRPh/UBP payments (unsupported) — branch on payment method first (Pitfall #1).
```

### Inngest cron sweep (skeleton)
```typescript
// Source: inngest.com/docs/guides/scheduled-functions [CITED]
export const payoutSweep = inngest.createFunction(
  { id: "payout-sweep", concurrency: 1 },                 // singleton — no overlapping sweeps
  { cron: "TZ=Asia/Manila 0 * * * *" },                   // hourly; timezone-aware
  async ({ step }) => {
    const due = await step.run("find-due", () => queryDuePayouts(PAYOUT_DELAY_HOURS));
    for (const b of due) {
      await step.run(`payout-${b.bookingId}`, async () => {
        const claimed = await claimLedgerRow(b);           // INSERT ... ON CONFLICT DO NOTHING (at-most-once)
        if (!claimed) return;                              // another run owns it
        const wallet = await resolveHostWallet(b.paymongoAccountId);
        const tr = await createBatchTransfer(b, wallet);   // Idempotency-Key: payout:<bookingId>
        await markProcessing(b, tr);                       // ledger Held → Processing (release fired)
      });
    }
  },
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `developers.paymongo.com` docs (v1-only) | `docs.paymongo.com` (v1 + v2 money-movement; old host 301-redirects) | 2025–2026 migration | Use `docs.paymongo.com`; append `.md` to any reference URL for clean machine-readable docs; `docs.paymongo.com/llms.txt` indexes everything. |
| Stripe Connect (`reverse_transfer`, `account.updated`, `payouts_enabled`) | PayMongo (`/v2/batch_transfers` inhouse, `merchant.activated`, platform-wallet HOLD) | D-20 (2026-07-09) | The ROADMAP Phase-5 prose is STALE; CLAUDE.md + CONTEXT.md are authoritative. There is **no `reverse_transfer`** — a pre-payout refund is just a platform-wallet refund. |
| Redis/BullMQ as the default Node job queue | Managed durable-execution (Inngest) for serverless/monolith apps needing no Redis | 2023→ | Fits the project's "no Redis" stance (D-48); the first async-scheduled job lands with zero new infra. |

**Deprecated/outdated:**
- ROADMAP Phase-5 goal/success text (Stripe Connect / `reverse_transfer` / `account.updated`) — superseded by D-20; use for phase framing only.
- CLAUDE.md "Zod 3.x" row — the project is actually on **Zod 4** (`package.json`); follow existing validation idioms.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `checkout_session.payment.paid` delivers the CheckoutSession under `event.data.attributes.data.attributes.*`, carrying `reference_number` + `payments[].id` | Pattern 2 | Booking id / payment id extraction path wrong → confirm handler can't locate the booking. Mitigation: assert against a captured test-mode event before shipping. |
| A2 | `GET /v2/wallets` enumerates **linked-account (child)** wallets for the platform and returns a usable `account_number` for `destination_account` | Code Examples (payout) | Payout can't address the host wallet → PAY-03 blocked. Mitigation: confirm with PayMongo (beta/sales-gated); may need a stored per-host wallet number captured at onboarding. |
| A3 | The `/v2/batch_transfers` endpoint honors an `Idempotency-Key` header the same way `/v1` POSTs do | Pattern 3 / Code Examples | Duplicate transfer on retry if only the ledger guards it. Mitigation: the `UNIQUE(booking_id)` ledger row + stable `reference_number` are the real at-most-once guarantee; treat the header as best-effort. |
| A4 | Transfer status callbacks to `callback_url` use a verifiable signature (possibly not the standard `Paymongo-Signature`) | Pitfall 2 | An unauthenticated callback could spoof `Paid`. Mitigation: prefer polling `GET` for the money-critical state transition, or verify the callback scheme with PayMongo before trusting it. |
| A5 | Refund `reason` enum is `duplicate \| fraudulent \| others` (the older docs also listed `requested_by_customer`) | Code Examples (refund) | A 4xx if an invalid reason is sent. Mitigation: use `others` for the auto-refund; verify the enum at implementation. |
| A6 | Checkout Session default expiry is long enough (≥1h) to not lapse mid-payment, and can be forced via the "Expire a Checkout Session" endpoint | Open Questions | If PayMongo's session TTL is shorter than the FitOut extend-hold window, alignment is imperfect. Mitigation: the webhook (not the session) is truth; extend-hold covers the FitOut side regardless. |

## Open Questions (RESOLVED)

> Resolved during Phase-5 planning (revision 1). Each question below carries an explicit resolution or accepted-risk annotation; the live-PayMongo-dependent items (A2 wallet enumeration) stay UAT-gated.

1. **How is a host's linked-account wallet referenced as a transfer destination? (A2)**
   - What we know: `GET /v2/wallets` returns `account.account_number` / `account.account_name` / `status`; inhouse transfers use `provider:"paymongo"` + BIC `PAEYPHM2XXX`.
   - What's unclear: whether the platform can enumerate a **child** linked account's wallet, or must capture/store the host's wallet number at onboarding. This is the beta/sales-gated surface.
   - Recommendation: raise with PayMongo support (the Platforms/Linked-Accounts beta contact from Phase 2) and, defensively, plan a `host_payout.wallet_account_number` column populated at/after `merchant.activated`.
   - **Resolution (accepted-risk, UAT-gated):** Within FitOut, the payout sweep (Plan 05, Task 2) correlates a wallet to the booking's host by `wallet.id === host_payout.paymongo_account_id` (defensive fallback: a stored per-host `accountNumber`); no match ⇒ leave Held + operator alert, never a wrong-wallet transfer. Whether `GET /v2/wallets` can actually enumerate a **child** linked-account wallet stays **UAT-gated** on PayMongo beta enablement (Environment Availability) — the exact correlating field is verified against a live/test response before UAT.

2. **Default Checkout Session expiry, and how it interacts with the D-58 extend-hold. (A6)**
   - What we know: session `status` is `active|expired`; there is an "Expire a Checkout Session" endpoint; no default TTL is publicly documented.
   - Recommendation: don't depend on the session TTL for correctness — set the FitOut `PAYMENT_WINDOW_MINUTES` (e.g. 60) and treat the webhook as the sole confirm authority.
   - **Resolution:** Adopted — Plan 03 sets `PAYMENT_WINDOW_MINUTES=60` and extends the hold to it; Plan 04 makes `checkout_session.payment.paid` the sole confirm authority. Correctness never depends on the PayMongo session TTL.

3. **Transfer status delivery: callback vs poll. (A4)**
   - Recommendation: for the money-critical `Processing → Paid` transition, poll `GET /v2/transfers/{id}` from an Inngest step (deterministic, no inbound-auth question) unless a signed callback is confirmed.
   - **Resolution:** Adopted (this is the root fix for the payout lifecycle) — Plan 05, Task 3 adds `getTransfer()` + a `payout-reconcile` Inngest cron that polls `GET /v2/transfers/{id}` for every Processing ledger row and moves it Paid/Failed, alerting on failures or stuck rows. The signed-callback path is NOT used (avoids the A4 inbound-auth question).

4. **Is `payment.paid` or `checkout_session.payment.paid` the better subscription for D-57?**
   - What we know: both exist; `checkout_session.payment.paid` is purpose-built for Checkout Sessions and carries the session `reference_number`.
   - Recommendation: subscribe to `checkout_session.payment.paid` as the confirm trigger; it round-trips the booking id cleanly. (Subscribing to `payment.paid` too is harmless but the checkout event is the one to key on.)
   - **Resolution:** Adopted — Plan 04 keys the confirm handler on `checkout_session.payment.paid` (single writer), deriving the booking id from the verified event's `reference_number`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL 18 + PostGIS | Ledger, sweep query, EXCLUDE | ✓ | `postgis/postgis:18-3.6` (Docker) | — |
| Node.js | Runtime | ✓ | v25.3.0 | — |
| PayMongo secret/webhook keys | Charge, payout, refund, webhook verify | ✓ (env scaffolded) | `PAYMONGO_SECRET_KEY`/`_PUBLIC_KEY`/`_WEBHOOK_SECRET` in `.env` | Tests mock `paymongo.ts` (`mockPayMongo`); fail-closed only in prod |
| PayMongo **Platforms / Linked Accounts** (payout wallets) | PAY-03 real payout, wallet enumeration | ✗ (beta / sales-gated) | — | Tests mock; real payout UAT blocked until PayMongo enables the platform (logged in STATE blockers) |
| PayMongo **money-movement `/v2`** (batch transfers, wallets) | PAY-03 | ✗ (beta) | — | Same as above — mock in tests; verify contract with PayMongo before UAT |
| Inngest SDK + Dev Server | T+24h sweep (D-56) | ✗ (not installed) | target `inngest@4.13.0`, `inngest-cli@1.37.0` | `npm install inngest`; `npx inngest-cli@latest dev` (no Redis) |
| Redis | (only if BullMQ chosen — NOT recommended) | ✗ | — | Inngest needs no Redis; N/A if Inngest is chosen |
| Tunnel (ngrok/cloudflared) | Local PayMongo webhook forwarding | (host-provided) | — | Required to develop `checkout_session.payment.paid` locally (no PayMongo CLI) |

**Missing dependencies with no fallback (blocking real UAT, not code/tests):**
- PayMongo Platforms/Linked-Accounts + money-movement `/v2` beta enablement — required for a real payout. **Request early** (lead time; already flagged in STATE blockers). Code + the full test suite proceed against mocks.

**Missing dependencies with fallback:**
- Inngest — install (`npm install inngest`); dev server replaces any Redis/worker need.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `4.1.8` (unit/integration, `environment: "node"`) + Playwright `1.60.0` (E2E) |
| Config file | `vitest.config.ts` (per-worker isolated Postgres schema; migrates `./drizzle`) |
| Quick run command | `npx vitest run tests/paymongo tests/payments` |
| Full suite command | `npm test` (`vitest run`) |

**Harness assets to reuse:** `mockPayMongo` (signs valid `Paymongo-Signature` via `signWebhook`, provides `badSignature`), the webhook test pattern (POST a signed body to the exported `POST` handler against an isolated schema — see `tests/paymongo/webhook-merchant-activated.test.ts`), `makeRacingClients` (independent connections for concurrency proofs), `isPgError` for SQLSTATE. Extend `mockPayMongo` with `createCheckoutSession`, `createBatchTransfer`, `createRefund`, `listWalletAccounts` stubs.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| PAY-01 | "Confirm & pay" creates a checkout with amount = frozen `quotedTotalCents`, all 4 rails, `reference_number = booking.id` | unit | `npx vitest run tests/payments/checkout-create.test.ts` | ❌ Wave 0 |
| PAY-01/BOOK-04 | `checkout_session.payment.paid` webhook flips `pending → confirmed` (single writer); browser return does NOT | integration | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` | ❌ Wave 0 |
| PAY-01 | Webhook idempotency/replay: a re-delivered `checkout_session.payment.paid` is a 200 no-op (no double-confirm) | integration | same file | ❌ Wave 0 |
| PAY-01 (security) | A forged/invalid `Paymongo-Signature` on the payment event → 400, no state change | integration | `npx vitest run tests/paymongo/webhook-signature.test.ts` (extend) | ⚠️ extend existing |
| PAY-01 | Charge amount ignores any client-supplied number (server uses `quotedTotalCents`) | unit | `tests/payments/checkout-create.test.ts` | ❌ Wave 0 |
| PAY-02 | `computeCommission(gross, rateBps)` — integer rounding, `net = gross − commission`, boundary amounts | unit | `npx vitest run tests/payments/commission.test.ts` | ❌ Wave 0 |
| PAY-02 | Commission rate + amount frozen on the ledger row; a later `COMMISSION_RATE_BPS` change does not alter existing rows | integration | `npx vitest run tests/payments/ledger-freeze.test.ts` | ❌ Wave 0 |
| PAY-03 | Sweep selects only `confirmed` bookings with `endsAt + delay ≤ now()` and no ledger row | integration | `npx vitest run tests/payments/payout-sweep.test.ts` | ❌ Wave 0 |
| PAY-03 | **At-most-once under duplicate/concurrent sweeps** — `UNIQUE(booking_id)` yields exactly one transfer | integration (racing clients) | same file (uses `makeRacingClients`) | ❌ Wave 0 |
| PAY-03 | Transfer body: `provider:"paymongo"`, `amount = netCents`, destination = host wallet, stable Idempotency-Key | unit | `tests/payments/payout-sweep.test.ts` | ❌ Wave 0 |
| PAY-03 | `Processing → Paid` on transfer success; `→ Failed` on failure (poll/callback) | integration | same file | ❌ Wave 0 |
| HOST-03 | Earnings page shows per-booking `Held/Processing/Paid/Refunded`, `gross → −10% → net`, expected date, summary totals; owner-gated | component + integration | `npx vitest run tests/payments/earnings-view.test.ts` | ❌ Wave 0 |
| D-58 | Extend-hold: creating the checkout pushes `expiresAt` past the 15-min TTL so the hold isn't swept mid-payment | integration | `npx vitest run tests/payments/hold-payment-race.test.ts` | ❌ Wave 0 |
| D-58 | Auto-refund backstop: `payment.paid` on a genuinely-gone slot (0-row confirm) triggers a refund (card/GCash) OR an operator-alert (**QRPh unsupported**) | integration | same file | ❌ Wave 0 |
| D-60 | Refund idempotency: `payment.refunded` / `payment.refund.updated` handled once via `paymongo_event` | integration | `npx vitest run tests/paymongo/webhook-refund.test.ts` | ❌ Wave 0 |
| D-58/PAY-01 | **Double-book-during-payment**: two bookers each pay for the same slot; EXCLUDE lets exactly one confirm; the loser is auto-refunded/alerted | integration (racing) | `tests/payments/hold-payment-race.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/payments tests/paymongo` (fast; < 30s target per the tight-feedback config).
- **Per wave merge:** `npm test` (full Vitest suite, isolated schemas).
- **Phase gate:** Full suite green + a manual PayMongo test-mode E2E (real checkout redirect + tunneled webhook) before `/gsd-verify-work`; the real payout path is UAT-gated on PayMongo beta enablement.

### Wave 0 Gaps
- [ ] `tests/payments/commission.test.ts` — PAY-02 pure math (no DB)
- [ ] `tests/payments/checkout-create.test.ts` — PAY-01 charge-integrity (mock `paymongo.ts`)
- [ ] `tests/paymongo/webhook-payment-paid.test.ts` — D-57 confirm authority + replay
- [ ] `tests/paymongo/webhook-refund.test.ts` — D-60 refund event idempotency
- [ ] `tests/payments/ledger-freeze.test.ts` — D-51 commission freeze
- [ ] `tests/payments/payout-sweep.test.ts` — PAY-03 sweep + at-most-once (`makeRacingClients`)
- [ ] `tests/payments/hold-payment-race.test.ts` — D-58 extend-hold + auto-refund + double-book-during-payment
- [ ] `tests/payments/earnings-view.test.ts` — HOST-03 view (component + owner-gate)
- [ ] Extend `tests/helpers/mocks.ts` `mockPayMongo` with checkout/transfer/refund/wallet stubs
- [ ] Framework install: `npm install inngest` (+ `inngest-cli` dev); no test-framework install needed (Vitest/Playwright present)

## Security Domain

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | "Confirm & pay" and the HOST-03 page require a signed-in session (Better Auth); reuse `requireUserId`. |
| V3 Session Management | yes | Existing Better Auth sessions; no new session surface. |
| V4 Access Control | yes | Owner-gate the checkout create (booking.bookerId === session) and HOST-03 (ledger.host_id === session) — the route group is NOT the gate (existing discipline). Payout amounts/commission are server-computed, never client. |
| V5 Input Validation | yes | Zod (v4) on server-action inputs; the webhook **derives state from the verified event type**, never from client body fields (existing `merchant.activated` discipline). Charge = `quotedTotalCents`, never a client number. |
| V6 Cryptography | yes | Reuse the existing constant-time `Paymongo-Signature` HMAC-SHA256 verify over the **raw body**; never hand-roll. Verify the transfer `callback_url` auth scheme before trusting it (open question A4). |
| V7 Error Handling/Logging | yes | Map PayMongo/refund failures via `mapBookingError`/`isPgError` to calm results; never leak secret/PII to the client (existing `paymongo-connect.ts` pattern). Audit money-adjacent actions (reuse `recordAudit`). |

### Known Threat Patterns for {Next.js server actions + PayMongo webhooks + Postgres}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged/replayed payment or refund webhook | Spoofing / Tampering | Constant-time `Paymongo-Signature` verify over raw body + `paymongo_event` dedupe (existing). |
| Client tampers the charge amount | Tampering | Charge `booking.quotedTotalCents` server-side only (D-49). |
| Browser-return spoof "I paid" | Spoofing | Webhook-as-truth (D-57); return redirect is UX only. |
| Double payout under duplicate sweeps | Tampering / (financial) | `UNIQUE(booking_id)` ledger row + stable Idempotency-Key/`reference_number`. |
| Double-confirm / double-book during payment | Tampering | GiST EXCLUDE constraint (the loser gets 0 rows → auto-refund/alert). |
| IDOR on HOST-03 earnings or another host's payout | Elevation / Info-disclosure | Owner-gate ledger reads by `host_id` (Security V4). |
| Unauthenticated payout `callback_url` marking `Paid` | Spoofing | Prefer polling `GET`; verify callback signature before trusting (A4). |
| Secret/PII leakage in error paths | Info-disclosure | Generic client errors; secrets server-only; fail-closed boot (extend to new prod secrets). |

## Project Constraints (from CLAUDE.md)

- **Payments provider = PayMongo** (D-20); **no official SDK** → thin `fetch` wrapper. `Idempotency-Key` on every POST; `Paymongo-Signature` HMAC-SHA256 over the raw body on every inbound webhook. Non-negotiable.
- **Hold-until-session payout**: collect the full amount to the **platform wallet** → HOLD → after the session, on-demand `inhouse` `POST /v2/batch_transfers` of `(booking − commission)`. **Never pay the host at booking time. Never use PayMongo "payment splitting."**
- **Bookability gate** = `merchant.activated` + `activation_status: activated` + wallet `status: activated` (already built Phase 2; payout must target an `activated` wallet).
- **Integer minor units (centavos), never float** for all money.
- **`timestamptz` (UTC) everywhere**; venue-local only at the edges via `@date-fns/tz`. Payout timing anchors to `booking.endsAt` (UTC) + delay via DB `now()`.
- **Server-authoritative, never trust the client** for price/time/state.
- **Fail-closed prod boot** for missing PayMongo secrets — extend to any new required prod secrets (Inngest signing key, platform wallet identifiers).
- **GSD workflow enforcement** — all edits go through a GSD command (this is planning input, no edits).
- **Do NOT use** application-level double-booking checks, NextAuth, MongoDB, naive timestamps, or Vercel-only backend for always-on jobs (use the Inngest-managed path or a container worker).

## Sources

### Primary (HIGH confidence)
- `docs.paymongo.com/reference/create-a-checkout(.md)` — Checkout Session create: endpoint, `line_items`, `payment_method_types` enum (card/gcash/paymaya/qrph/…), `reference_number`, `metadata`, `success_url`/`cancel_url`, `send_email_receipt`.
- `docs.paymongo.com/reference/checkout-session-resource(.md)` — response shape (`checkout_url`, `payments[]`, `payment_intent`, `status: active|expired`, `reference_number`, `metadata`).
- `docs.paymongo.com/reference/create-batch-transfer(.md)` — `POST /v2/batch_transfers`, `transfers[]`, `provider:"paymongo"` inhouse, BIC `PAEYPHM2XXX`, status transitions.
- `docs.paymongo.com/reference/list-all-wallet-accounts(.md)` — `GET /v2/wallets`, `account.account_number`/`account_name`, `status`.
- `docs.paymongo.com/reference/create-a-webhook(.md)` — the complete webhook event enum (incl. `checkout_session.payment.paid`, `payment.paid`, `payment.failed`, `payment.refunded`, `payment.refund.updated`, `link.payment.paid`, `qrph.expired`; **no transfer/payout events**).
- `docs.paymongo.com/docs/payment-acceptance-refunds(.md)` — `POST /v1/refunds`, reason enum, per-rail refund rules; **QRPh/UBP not supported**, Maya same-day-full-only.
- `docs.paymongo.com/reference/transfer-resource(.md)` — transfer status values + `callback_url` mechanism.
- `npm view inngest/inngest-cli/bullmq/ioredis version` — verified current versions (2026-07-16).
- Codebase reads: `src/lib/paymongo.ts`, `src/app/api/paymongo/webhook/route.ts`, `src/app/actions/booking.ts`, `src/lib/db/schema.ts`, `src/lib/availability/units.ts`, `src/lib/pg.ts`, `src/lib/booking/pricing.ts`, `src/lib/money.ts`, `tests/paymongo/*`, `tests/helpers/mocks.ts`, `drizzle/0005–0007`, `vitest.config.ts`, `package.json`, `.planning/config.json`, PROJECT/STATE/REQUIREMENTS + Phase 02/04/05 CONTEXT.

### Secondary (MEDIUM confidence)
- `inngest.com/docs/guides/scheduled-functions` + `www.inngest.com` — timezone-aware cron, no-Redis serverless/monolith model.
- `docs.paymongo.com/docs/money-movement-*` — inhouse transfer concepts (wallet enumeration for **linked-account** destinations is thin/beta).
- Job-runner comparisons (buildmvpfast / hashbuilds / stacknotice, 2026) — Inngest vs BullMQ tradeoffs.

### Tertiary (LOW confidence — flagged for validation)
- Exact `checkout_session.payment.paid` payload nesting (A1), linked-account wallet enumeration (A2), `/v2` Idempotency-Key semantics (A3), transfer `callback_url` auth (A4), refund `reason` enum currency (A5), default checkout-session TTL (A6) — see Assumptions Log; verify against PayMongo test-mode events / support during implementation.

## Metadata

**Confidence breakdown:**
- Standard stack (Checkout Sessions, Inngest, ledger): **HIGH** — verified endpoints/enums + verified npm versions + direct code reads.
- Architecture / integration (webhook-as-truth, extend-hold, ledger at-most-once): **HIGH** — reuses proven Phase-1..4 patterns.
- Payout mechanics on `/v2` (linked-account wallet destination, transfer status delivery): **MEDIUM** — beta/sales-gated surface; assumptions logged.
- Refund constraints (QRPh unsupported, per-rail rules): **HIGH** — explicit in current docs; the planning risk is real and surfaced.
- Pitfalls: **HIGH** — grounded in docs + code.

**Research date:** 2026-07-16
**Valid until:** ~2026-08-15 for the PayMongo API surface (stable v1; v2 money-movement is evolving/beta — re-verify the transfer/wallet contract at implementation). ~2026-07-30 for Inngest version pin (fast-moving; `npm view` at plan time).
