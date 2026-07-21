# Phase 7: Bookings Management, Cancellation & Notifications — Research

**Researched:** 2026-07-21
**Domain:** Booking lifecycle closure — policy-driven refunds, host-cancellation economics, async notification infrastructure, expiry-cap correctness
**Confidence:** MEDIUM-HIGH (gating verdict MEDIUM-HIGH; repo findings HIGH; PayMongo vendor claims MEDIUM — primary doc pages are dead)

---

## ⚠️ GATING VERDICT: QRPh refunds

**VERDICT: NOT API-REFUNDABLE. D-58's premise is CORROBORATED. D-72 STANDS and must be built.**

**Confidence: MEDIUM-HIGH** — not HIGH, because every primary PayMongo page that states this is now a 404. The verdict rests on search-engine-cached snippets of PayMongo's own help center, corroborated across three independent query formulations and consistent with the independent Phase-5 research pass.

### Evidence FOR "not refundable"

| Source | Evidence | Confidence |
|---|---|---|
| PayMongo help center (via search-engine cache, 3 independent queries) | Verbatim, repeated identically: *"In general, QR Ph payments have no refunds through PayMongo. In special cases, a manual refund may be requested with our support team, subject to confirmation and provider SLAs."* `[CITED: paymongo.help/en/articles/11904095-refunding-payments — page now 404s; content recovered via search cache]` | MEDIUM-HIGH |
| Same | *"QR Ph payments made on Maya checkout cannot be refunded."* | MEDIUM |
| Same | *"PayMongo is unable to refund transactions made over-the-counter (7-Eleven, M Lhuillier, Cebuana)."* — establishes that PayMongo **does** maintain per-rail refund exclusions, so a rail-specific carve-out is a real category, not a misreading | MEDIUM-HIGH |
| Repo, Phase 5 independent research | `.planning/phases/05-payments-payouts/05-RESEARCH.md:342` § Pitfall 1 quotes PayMongo docs: *"QR Ph and UBP Online Banking refunds [are] unavailable; contact support."* This was an **independent** research pass reaching the same conclusion from the pre-migration docs | HIGH (as evidence of independent corroboration) |
| Repo, shipped code | `src/lib/paymongo.ts:220-225` JSDoc and `05-04` webhook already branch on rail and take the operator-alert path for `qrph`/`dob_ubp`. Shipped, tested (`tests/paymongo/webhook-payment-paid.test.ts` asserts `createRefund` NOT called for `qrph`) | HIGH |

### Evidence AGAINST / why this is not HIGH confidence

- `docs.paymongo.com/reference/refund-resource` **fetched successfully** and contains **no payment-method matrix at all** — it states only that refunds return money "to your customer's original payment method," supports full/partial, minimum ₱1.00, statuses `pending|processing|succeeded|failed`. It is **silent** on QRPh. `[VERIFIED: fetched 2026-07-21]` Silence is not permission, but it is also not a documented exclusion.
- `docs.paymongo.com/docs/payment-acceptance-qr-ph` **fetched successfully** and says **nothing about refunds** — only supported institutions and the ₱1.00 minimum / no fixed maximum. `[VERIFIED: fetched 2026-07-21]`

### The 404 wall — reproduced

The discuss pass reported two 404s. **I hit the same wall, wider.** `developers.paymongo.com` now 301-redirects to `docs.paymongo.com`, and the refund-related slugs are dead at the new host:

| URL | Result |
|---|---|
| `docs.paymongo.com/docs/refunding-transactions` | **404** |
| `docs.paymongo.com/docs/qr-ph-1` | **404** |
| `docs.paymongo.com/docs/refund-errors` | **404** |
| `paymongo.help/en/articles/11904095-refunding-payments` | **404** |
| `paymongo.help/en/articles/8478600-does-paymongo-accept-payments-via-qrph` | **404** |
| `www.paymongo.com/academy/refunding-payments` | 308 → `docs.paymongo.com/` (root, content gone) |

**Interpretation:** PayMongo migrated `developers.paymongo.com` → `docs.paymongo.com` and dropped the refund documentation in the move. Search indexes still hold the pre-migration text. This is a documentation gap on PayMongo's side, not a change in behaviour — nothing suggests the capability changed, only that the page describing it was deleted. `[ASSUMED]`

### The settling test — run this before planning D-72's transfer path

One test-mode call settles it. **~10 minutes of developer time; gates a multi-task workstream.**

```bash
# 1. Create a QRPh-only checkout session in TEST mode, pay it via the hosted page,
#    and capture the pay_... id from the checkout_session.payment.paid webhook
#    (the tunnel + webhook plumbing already exists from Phase 5).

# 2. Attempt the refund against that payment id:
curl -X POST https://api.paymongo.com/v1/refunds \
  -u "$PAYMONGO_SECRET_KEY:" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: qrph-refund-probe-1" \
  -d '{"data":{"attributes":{"amount":10000,"payment_id":"pay_XXXX","reason":"others"}}}'
```

| Outcome | Meaning | Action |
|---|---|---|
| HTTP 4xx, error mentioning unsupported method / payment not refundable | **Confirms NOT refundable** | Build D-72 in full |
| HTTP 200 with a `refund` resource → poll it to `succeeded` | **REFUTES D-58** | **Delete the entire D-72 workstream** (see below) |
| HTTP 200 but the refund settles to `failed` | Effectively not refundable — async failure is *worse* than a sync error | Build D-72; treat the sync-200 as a false positive |

> ⚠️ A 200 is **not sufficient** on its own — poll the refund to a terminal status. An async `failed` is the dangerous middle case: the code path would look healthy and silently strand the booker's money.

### If the test REFUTES D-58, this drops out of scope entirely

- The bank-details form (institution picker, account name, account number) — **not built**
- The `instapay` destination path on `createBatchTransfer` — **not built**
- The PH Data Privacy Act (RA 10173) personal-financial-data exposure — **eliminated**
- The payout-redirection threat and its session-binding mitigations — **eliminated**
- The failed-transfer recovery UX — **eliminated**
- QRPh cancellations use the identical `createRefund` path (`src/lib/paymongo.ts:226`) as card/GCash/Maya
- The Phase-5 `qrph`/`dob_ubp` operator-alert branch in the webhook becomes dead code and should be removed (`dob_ubp` is not an enabled rail — checkout offers `["card","gcash","paymaya","qrph"]`, `src/lib/paymongo.ts:200`)

### How to structure the plan to defer this cheaply

Regardless of outcome, funnel **all** refund dispatch through one predicate and one seam:

```ts
// src/lib/payments/refund-rail.ts
/** The single place the QRPh question is answered. If the D-58 probe refutes the
 *  premise, this becomes `() => true` and the entire D-72 workstream is deleted. */
export function isApiRefundable(rail: string): boolean {
  return rail === "card" || rail === "gcash" || rail === "grab_pay" || rail === "paymaya";
}
```

Then order the waves so the QRPh branch is **last**: build the ladder, the preview, the columns, the plain-`createRefund` cancellation, and the whole notification layer first — none of it depends on the verdict. Only the final task branches. If the probe lands early and refutes D-58, that task is deleted with zero rework.

### If D-72 stands: the InstaPay transfer shape

`POST /v2/batch_transfers` — the **same endpoint** `createBatchTransfer` already calls (`src/lib/paymongo.ts:266`), with `provider: "instapay"` instead of `"paymongo"`. `[CITED: docs.paymongo.com/docs/money-movement-moving-money-with-api — fetched 2026-07-21]`

```json
{ "transfers": [ {
  "provider": "instapay",
  "amount": 50000,
  "currency": "PHP",
  "purpose": "Disbursement",
  "description": "FitOut refund <bookingId>",
  "reference_number": "refund-<bookingId>-<attempt>",
  "source_account": { "number": "...", "name": "...", "bic": "PAEYPHM2XXX" },
  "destination_account": { "number": "1234567890", "name": "Juan Dela Cruz", "bic": "BNORPHMM" },
  "callback_url": "https://.../webhooks/paymongo",
  "metadata": { "booking_id": "..." }
} ] }
```

| Property | Finding | Confidence |
|---|---|---|
| Destination fields | `number`, `name`, **and `bic`** are all **required** | HIGH `[CITED]` |
| BIC lookup | `GET /v2/transfers/receiving_institutions?provider=instapay` returns the institution list + BIC codes — this is the source for D-72's institution picker | HIGH `[CITED]` |
| Amount | Smallest unit (centavos), same as everywhere else in the codebase | HIGH |
| Limit | InstaPay **≤ ₱50,000** real-time; PESONet ≤ ₱10M but next-banking-day | MEDIUM `[CITED: 07-CONTEXT canonical refs + money-movement-send-money]` |
| Status | Transfers start `pending`; **no transfer webhook** — poll, exactly as `payout-reconcile` already does (Phase-5 Pitfall 2) | HIGH |
| Retry | Docs: *"Always use a **new, unique `reference_number`** on retry"* | HIGH `[CITED]` |

> 🚩 **Conflict with the existing implementation.** `createBatchTransfer` currently hardcodes a **stable** `reference_number: payout-${bookingId}` and a **stable** `Idempotency-Key: payout:${bookingId}` (`src/lib/paymongo.ts:283,275`). PayMongo's guidance to use a *new, unique* reference on retry is in tension with that. The two are reconcilable — the `Idempotency-Key` is what prevents a double-pay, and the `reference_number` is a reconciliation label — but the refund path **must not** reuse the `payout:` key namespace or a refund and a payout for the same booking would collide. Use `refund:${bookingId}` for the key and keep `reference_number` unique per attempt. **MEDIUM confidence** that mixing a stable idempotency key with a rotating reference is accepted by PayMongo; verify in the same test-mode session as the gating probe.

**Amount cap:** the ₱50k InstaPay ceiling is comfortably above any plausible FitOut booking, but the refund path should still assert it and fall back to an operator alert rather than fire a doomed transfer.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

All 40 decisions D-67..D-106 in `07-CONTEXT.md` are locked and are **not** relitigated here. This research answers *how*, and flags where reality is harder than a decision assumed. Summary of what binds planning:

- **Tiers (D-67/68/77/81):** 3 named tiers (Flexible/Standard/Strict), snapshotted onto the booking at creation, no default, explicit choice required to publish, surfaced with concrete dates on listing detail + checkout.
- **Money (D-69/78/79):** retained portion becomes the booking's gross; full itemised server-computed breakdown before confirming; **single `cancelled` status** with refund/retained amounts as columns.
- **Host cancellation (D-70/71/80):** 100% refund + audit + auto-block of the freed window + flat config-tunable fee capped at booking value, as a signed debit row on `host_payout_ledger`; hosts can cancel via UI behind a heavy confirm dialog.
- **Service fee (D-73/74/75/76):** 5% (`SERVICE_FEE_BPS`), booker-facing, labelled **"Service fee"** (never "Taxes and fees"), non-refundable, all-in display everywhere.
- **QRPh (D-72):** contingent on the gating verdict above — **stands**.
- **Notifications (D-82..D-92):** email + in-app only; Inngest event-driven sends; `notification` table; bell in the **shared** header; one event fans out to both channels; failures → `recordAudit` `needs_attention`, no admin surface.
- **Reminders (D-85/87/88):** exactly four, exactly once each, no preferences.
- **D-89 (central tradeoff):** the payment window is **forgiving, not fast**, deliberately. **Do not shorten it.**
- **Expiry (D-93..D-100):** `LEAST(now() + window, starts_at)` everywhere; DB clock only; mode-scoped lead-time guards; proportional split when capped; unselectable slots with reasons; one-click re-request.
- **Views (D-101..D-106):** separate `/bookings` + `/host/bookings`; `completed` derived at read time; Upcoming/Past tabs; primary action inline only, cancel routes to detail; shared shell, side-specific rows; "Load more".

### Claude's Discretion (research recommendations below)

Cancelling an unpaid hold · refund-preview placement · host-side listing filter · notification payload shape · reminder offsets · email templating.

### Deferred Ideas (OUT OF SCOPE)

SMS · web push · notification preferences · failed-notification admin view · `/notifications` page · acknowledgment-triggered window (Model C) · percentage/proximity host-cancel fee · disputes/chargebacks · group bookings (Phase 8).

---

## Phase Requirements

| ID | Description | Research Support |
|---|---|---|
| **BOOK-07** | Booker can cancel subject to the cancellation/refund policy | § Refund Ladder & Tier Snapshot; § Refund Preview |
| **PAY-06** | Cancellations issue refunds per policy | § PayMongo Refund Mechanics; ⚠️ § Finding 1 (payout sweep excludes cancelled) |
| **HOST-02** | Host can view upcoming/past bookings with status | § Bookings Views |
| **MANAGE-01** | Booker can view upcoming/past bookings with status | § Bookings Views |
| **MANAGE-02** | Lifecycle visible to both sides | § Derived `completed` (D-102); § EXCLUDE audit |
| **MANAGE-03** | Transactional emails via a layer that never blocks the booking transaction | § Inngest Event-Driven Email |

---

## Summary

Phase 7 is a **money-correctness phase wearing a UI phase's clothes**. The views (D-101..D-106) are largely clone-work over shells that already exist. The risk concentrates in four places: the refund ladder's interaction with the payout sweep, the signed debit row's interaction with the at-most-once payout claim, the expiry-cap fix's interaction with the GiST predicate and the webhook confirm authority, and at-most-once reminder semantics.

**Three findings contradict assumptions embedded in the locked decisions.** None invalidate a decision; all change the work required to implement one. They are, in severity order:

1. **D-69's "zero new mechanism" is not true.** The payout sweep selects `WHERE b.status = 'confirmed'` — a cancelled-with-retention booking is **never swept**, so the host would never receive their share of the retained amount. The sweep predicate and its gross expression both need widening.
2. **The service fee will silently inflate host payouts** unless the sweep's gross switches off `quoted_total_cents`. Today `gross = b.quoted_total_cents`; if that becomes the all-in total, the platform pays 90% of its own service fee to the host.
3. **D-71's signed debit row collides with three existing queries** — `UNIQUE(booking_id)`, the reconcile stuck-`held` alert, and the absence of any netting logic in `payOne`. The "netted against the host's next payout" mechanism does not exist and must be built.

On the positive side, **D-79 is more load-bearing than its rationale claims**: the GiST predicate is written as the *complement* (`status NOT IN ('cancelled','declined','completed')`), so a new `cancelled_partial` enum value would default to **OCCUPYING** and permanently block the slot of every partially-refunded cancellation. D-79 didn't avoid an audit — it avoided a live bug.

**Primary recommendation:** run the QRPh probe first, then sequence waves so the payout-sweep changes (Findings 1 & 2) land in Wave 1 alongside the schema, before any UI. Those two changes are small in diff and large in blast radius; everything else is additive.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Refund amount computation | API/Backend (pure module) | — | Money is never client-computed (Security V4); mirrors `computeCommission` |
| Tier evaluation (which rung) | API/Backend (pure module) | — | Same pure-function seam; deterministic over (tier, startsAt, now) |
| Refund preview render | Frontend Server (RSC) | — | Server-computed values passed as props; zero client arithmetic (D-78) |
| Cancel action | API/Backend (server action) | Database (status-scoped UPDATE) | Owner-gated, rate-limited, audited; the UPDATE is the idempotency lock |
| PayMongo refund dispatch | API/Backend | — | Secret key is server-only; `Idempotency-Key` on POST |
| Refund status resolution | Database (webhook writer) | — | `payment.refunded` webhook is the single writer (D-57 precedent) |
| Host-cancel fee accrual | Database (ledger row) | API/Backend | Signed row; netting happens in the payout sweep |
| Expiry authority | Database (`now()`) | — | D-94: DB clock is the **sole** authority |
| Occupancy | Database (GiST EXCLUDE) | — | D-21 keystone; untouched by this phase |
| Email send | Background (Inngest) | — | Must never block the booking transaction (MANAGE-03) |
| Notification row write | Background (Inngest) | Database | Same event, separate step — D-91 parity |
| Unread badge | Frontend Server (RSC) | Browser (bounded poller) | D-84: `router.refresh()`, no TanStack Query |
| Reminder scheduling | Background (Inngest cron) | Database (claim row) | At-most-once must be DB-enforced, not Inngest-enforced |

---

## Standard Stack

**No new dependencies.** Every capability this phase needs is already installed. This is the strongest signal that the CONTEXT decisions were shaped around the existing codebase.

| Library | Installed Version | Purpose in Phase 7 | Verified |
|---|---|---|---|
| `inngest` | `^4.13.0` | Event-driven email + notification fan-out (D-83/91), four reminder crons (D-85) | `package.json` HIGH |
| `resend` | `^6.12.4` | The send itself, behind Inngest | `package.json` HIGH |
| `drizzle-orm` | in use | Schema + `sql` template for `LEAST`/`make_interval`/`GREATEST` | HIGH |
| `vitest` | `^4.1.8` | Unit + integration (node env, isolated schemas) | `vitest.config.ts` HIGH |
| `@playwright/test` | `^1.60.0` | E2E cancel flow | `playwright.config.ts` HIGH |
| `zod` | in use | Notification payload validation at the write boundary | HIGH |
| `date-fns` + `@date-fns/tz` | in use | Venue-local date rendering in the refund preview ("Free cancellation until Thu 3 Jul, 8:00 PM", D-81) | HIGH |

**Alternatives considered and rejected:** TanStack Query (explicitly excluded by D-84); React Email (D-66 leaves templating open — see § Discretion Recommendations); a dedicated job queue (Inngest already mounted).

### Inngest API shape — version caution

The codebase is on **Inngest 4.13.0**, which uses the **2-arg** `createFunction(options, handler)` form with the trigger inside `options.triggers`. The 3-arg `(config, trigger, handler)` form found in most online examples and in older phase research **is stale**. Both existing crons carry an explicit comment about this (`payout-sweep.ts`, `request-expiry.ts`). `[VERIFIED: repo source]` — **clone the existing files, do not copy web examples.**

---

## ⚠️ Finding 1: D-69 requires payout-sweep changes ("zero new mechanism" is not true)

**Severity: HIGH — silently underpays hosts on every partially-refunded cancellation.**

D-69 states: *"the payout sweep reads a smaller gross on the existing ledger row."* The sweep query says otherwise:

```sql
-- src/inngest/functions/payout-sweep.ts:queryDuePayouts
WHERE b.status = 'confirmed'
  AND b.ends_at + make_interval(hours => 24) <= now()
```

A cancellation sets `status = 'cancelled'`. **A cancelled booking is never selected by the sweep.** For a Standard-tier booking cancelled at the 50% rung, the platform retains ₱500 and the host — who is owed ₱450 of it per D-69 — receives nothing, ever. `[VERIFIED: repo source, read directly]` **HIGH confidence.**

**Required change** — widen the predicate and make the gross expression explicit:

```sql
WHERE (
        b.status = 'confirmed'
     OR (b.status = 'cancelled' AND COALESCE(b.retained_space_cents, 0) > 0)
      )
  AND b.ends_at + make_interval(hours => ${PAYOUT_DELAY_HOURS}::int) <= now()
```

and in the SELECT list, replace `b.quoted_total_cents AS "quotedTotalCents"` with an explicit payout basis:

```sql
COALESCE(b.retained_space_cents, b.space_price_cents) AS "payoutGrossCents"
```

**Why this is safe:**
- `status` is unchanged by the widening — the GiST EXCLUDE and both lazy-expiry sweeps are untouched. `cancelled` remains non-occupying.
- Payout timing stays anchored to `ends_at + 24h`, the session's original end. A booking cancelled two days before the session still pays out 24h after the session *would have* ended, which is correct: it preserves the D-55 hold window and gives a dispute window.
- The at-most-once `ON CONFLICT (booking_id)` claim is entirely unaffected — one ledger row per booking still holds.
- Host cancellations produce `retained = 0`, so `> 0` correctly excludes them: the host gets no payout **and** owes the fee.

**Verification requirement:** an integration test asserting a partially-refunded cancelled booking produces exactly one ledger row with `gross = retained_space_cents`, and that a fully-refunded (host-cancelled) booking produces **zero** ledger rows.

---

## ⚠️ Finding 2: the service fee will inflate host payouts unless the sweep's gross changes

**Severity: HIGH — platform pays 90% of its own service fee to the host on every booking.**

The sweep freezes commission off `b.quoted_total_cents`:

```ts
const { rateBps, commissionCents, netCents } = computeCommission(b.quotedTotalCents);
```
`[VERIFIED: src/inngest/functions/payout-sweep.ts:payOne]`

D-49's `quotedTotalCents` is today the space price (D-50: booker breakdown is `subtotal = total`). D-74/D-75 make the charged amount **all-in** (space + 5% service fee). If `quoted_total_cents` becomes the all-in figure and the sweep is not changed, the host is paid `90% × (space + fee)` — i.e. the platform hands the host 90% of the service fee it introduced to fund refund economics. **This inverts the entire purpose of D-74.** HIGH confidence.

### Recommended column split (D-49 → two frozen values)

Keep `quoted_total_cents` as **the amount actually charged** (all-in) — it is what PayMongo charged, what refunds reference, and what every existing checkout/webhook path already reads. Add two frozen siblings:

| Column | Meaning | Backfill for existing rows |
|---|---|---|
| `space_price_cents` (int, nullable) | The listing-priced portion. **The payout basis.** | `= quoted_total_cents` |
| `service_fee_cents` (int, nullable, default 0) | Platform revenue, non-refundable (D-74) | `= 0` |
| `quoted_total_cents` (existing) | `space_price_cents + service_fee_cents`. **The charge basis.** Unchanged semantics for pre-Phase-7 rows | unchanged |

This backfill is exact and lossless: every pre-Phase-7 booking had no service fee, so `space = total, fee = 0` reproduces reality. `[ASSUMED]` — confirm no production bookings predate this with a nonzero implicit fee (there is no such concept, so this is near-certain).

**Downstream reads to audit:** `payout-sweep.payOne` (gross → `space_price_cents`), the D-58 auto-refund backstop (refund amount → stays `quoted_total_cents`, the full charge), `/host/earnings` (already reads the ledger's frozen `gross_cents`, so it inherits the fix), the `PriceBreakdown` component (gains the reserved fee slot).

### Service-fee calculator

Mirror `computeCommission` exactly — same integer-cents discipline, same single rounding rule, same throw-don't-freeze guards:

```ts
// src/lib/payments/service-fee.ts
import { SERVICE_FEE_BPS } from "@/lib/payments/config";

export type ServiceFee = { feeBps: number; serviceFeeCents: number; allInCents: number };

export function computeServiceFee(
  spacePriceCents: number,
  feeBps: number = SERVICE_FEE_BPS,
): ServiceFee {
  if (!Number.isInteger(spacePriceCents) || spacePriceCents < 0)
    throw new Error("space price must be a non-negative integer number of centavos");
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10000)
    throw new Error("feeBps must be an integer in [0, 10000]");
  const serviceFeeCents = Math.round((spacePriceCents * feeBps) / 10000); // single defined rounding
  return { feeBps, serviceFeeCents, allInCents: spacePriceCents + serviceFeeCents };
}
```

**Keep `quoteWindow` returning the space price.** It is a pure function over the listing's rates and should not know about platform fees. Compose at the caller (a new `quoteBooking`, or inline in `createPendingHold`). This preserves the Phase-4 pure-pricing seam and keeps its existing tests valid. **Recommendation, MEDIUM-HIGH confidence.**

**D-75 all-in display on search cards:** search cards do not create holds, so they have no frozen quote — they compute a display price from `hourly_rate_cents`. Apply `computeServiceFee` to that display number so browsing and checkout agree. The frozen-quote contract is unaffected because nothing is frozen at search time. The invariant D-75 actually requires — *"the number never goes up between browsing and paying"* — holds as long as both surfaces use the same `SERVICE_FEE_BPS`.

---

## ⚠️ Finding 3: D-71's signed debit row collides with three existing behaviours

**Severity: MEDIUM-HIGH — touches the at-most-once claim that all payout correctness rests on.**

`host_payout_ledger` today:

```ts
bookingId: text("booking_id").notNull().unique()   // the at-most-once payout gate
state: payoutLedgerState("state").default("held").notNull()  // held|processing|paid|refunded|failed
```
`[VERIFIED: src/lib/db/schema.ts:290-303]`

| Collision | Detail | Mitigation |
|---|---|---|
| **`UNIQUE(booking_id)`** | Only one row per booking. A host-cancel debit keyed to the cancelled booking *happens* to fit (a cancelled booking never has a payout row — Finding 1 shows the sweep skips it, and cancellation is pre-`startsAt` while payout is post-`endsAt+24h`, so they can never coexist). But this is **accidental**, not designed, and one future change breaks it. | Add a `kind` column and migrate the constraint to `UNIQUE(booking_id, kind)`. Hand-authored migration (constraint change, like 0012). |
| **Reconcile stuck-`held` alert** | `payout-reconcile` queries `WHERE state = 'held'` and alerts on rows stuck there. A debit row inserted as `held` would fire a **false operator alert on every host cancellation**. `[VERIFIED: payout-reconcile.ts:135-137]` | Scope every existing ledger query with `AND kind = 'payout'`. This is a **grep-complete** change — `queryDuePayouts`, `queryProcessingLedger`, the stuck-held query, `/host/earnings`, and `summarizePayouts` all need it. |
| **No netting logic exists** | `payOne` fires one transfer of exactly `net_cents` per booking and reads no other rows. D-71's *"netted against the host's next payout"* is **entirely new machinery**. | See below. |

### Recommended shape

```ts
// new enum
export const ledgerKind = pgEnum("ledger_kind", ["payout", "host_cancel_fee"]);

// added to host_payout_ledger
kind: ledgerKind("kind").default("payout").notNull(),
recoveredCents: integer("recovered_cents").default(0).notNull(), // how much of a debit has been netted
```

- A `host_cancel_fee` row carries **negative** `net_cents` (integer columns are signed — no schema change needed for the sign itself). `gross_cents`/`commission_cents` are meaningless for a debit; set `gross = -fee`, `commission = 0`, `net = -fee` so the arithmetic stays coherent if anything ever sums the column.
- Give debits their own terminal state semantics: insert as `held`, move to `paid` when fully recovered. With `kind` scoping, `held` no longer trips the reconcile alert.

### Netting algorithm (inside `payOne`, after the claim, before the transfer)

```
outstanding = SUM(-net_cents - recovered_cents) over this host's
              kind='host_cancel_fee' rows where recovered_cents < -net_cents
deduction   = LEAST(outstanding, netCents)          -- never drive the transfer negative
transferAmt = netCents - deduction
```

**Failure modes and the answers D-71 needs:**

| Mode | Answer |
|---|---|
| Ledger goes negative | **Cannot** — `deduction = LEAST(outstanding, netCents)` clamps it. `transferAmt ≥ 0` by construction. |
| `transferAmt` lands at exactly 0 | **Do not fire a zero transfer.** Mark the payout row `paid` with `transfer_id = NULL` and a note; carry any residual debit forward. PayMongo will reject or mis-handle a ₱0 transfer. |
| Host never hosts again | The debit sits unrecovered forever. **This is the intended write-off** (D-71: *"written off if they never host again"*). No collections. It should be **visible** — surface unrecovered debits in the `/host/earnings` summary so a returning host isn't surprised. |
| Cap at booking value | Enforce **at write time**, in the cancel action: `feeCents = Math.min(HOST_CANCEL_FEE_CENTS, booking.space_price_cents)`. Enforcing at netting time would be too late (the row would already misstate the debt) and would have to be re-derived on every sweep. **Write-time is the correct enforcement point.** |
| Partial recovery across two payouts | `recovered_cents` accumulates; the debit is only `paid` when `recovered_cents == -net_cents`. Must be updated **in the same transaction as the transfer claim** or a crash double-counts. |

> **Noted alternative, if the constraint surgery proves risky:** a separate `host_fee_ledger` table avoids touching `UNIQUE(booking_id)` and the reconcile queries entirely, at the cost of a second table and a join in the netting query. D-71 specifies `host_payout_ledger`, so the above is the recommended path — but the planner should escalate rather than improvise if the `UNIQUE` migration turns out to be entangled with live data.

---

## Refund Ladder & Tier Snapshot (D-67/68/69/79)

### GiST EXCLUDE audit — D-79 is protecting a real bug, not a convenience

The constraint (`drizzle/0012_booking_exclusion_v2.sql`):

```sql
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist (
    "listing_id" WITH =, "unit" WITH =,
    tstzrange("starts_at","ends_at",'[)') WITH &&
  )
  WHERE ("status" NOT IN ('cancelled','declined','completed'));
```
`[VERIFIED: repo source]` **HIGH confidence.**

The predicate is the **complement** of the free set. The migration comment states the design intent explicitly: *"any future status defaults to OCCUPYING (blocks) until explicitly added to the free set."*

**Therefore: a `cancelled_partial` enum value would have permanently blocked the slot of every partially-refunded cancellation.** D-79's stated rationale ("forces an audit… for a display convenience") understates it — the rejected design contained a live occupancy bug that the audit would have had to catch. Record this so D-79 is never revisited as mere preference.

**Are the new columns inert w.r.t. occupancy? YES — verified across all three predicates:**

| Predicate | Columns referenced | New columns affect it? |
|---|---|---|
| GiST EXCLUDE (`0012`) | `listing_id`, `unit`, `starts_at`, `ends_at`, `status` | **No** |
| In-tx stale-hold sweep (`units.ts:255-261`) | `listing_id`, `status`, `expires_at`, `starts_at`, `ends_at` | **No** |
| Cron expiry sweep (`request-expiry.ts:queryExpired`) | `status`, `expires_at` | **No** |

Adding `cancellation_policy`, `refund_cents`, `retained_space_cents`, `cancelled_by`, `cancelled_at`, `space_price_cents`, `service_fee_cents` is **structurally inert** for occupancy. HIGH confidence.

> ⚠️ The one thing that is **not** inert: **Finding 1's sweep-predicate widening reads `status = 'cancelled'`.** That is a *payout* predicate, not an occupancy predicate — it cannot affect double-booking. But it means "cancelled" now has a second meaning downstream, and the planner should keep the two predicate families clearly separated in code and comments.

### `cancellationPolicy` column type

**Recommend a new `pgEnum`**, consistent with `bookingStatus` / `bookingMode` / `payoutLedgerState`.

The 55P04 hazard that forced the `0010`/`0012` two-migration split applies **only to `ALTER TYPE … ADD VALUE`** on an existing type — Postgres cannot add and use an enum value in one transaction. `CREATE TYPE … AS ENUM (...)` followed by use in the same transaction is fine. A brand-new type is not affected. **HIGH confidence** (this distinction is what the `0012` comment itself describes).

```ts
export const cancellationPolicy = pgEnum("cancellation_policy", ["flexible", "standard", "strict"]);
```

- On `listing`: `cancellationPolicy("cancellation_policy")` — **nullable**, no default (D-77: no default tier; the wizard requires an explicit choice). Nullable is required for the backfill of existing draft listings; the publish gate enforces non-null, mirroring how bookability is gated rather than creation.
- On `booking`: `cancellationPolicy("cancellation_policy")` — nullable, snapshotted at creation exactly like `bookingMode` (`schema.ts:412`). Pre-Phase-7 bookings stay NULL; the refund calculator must treat NULL as a documented fallback (recommend: **Flexible**, the most booker-friendly, matching the D-62 precedent for legacy-row handling — and there will be very few).

`text` + `CHECK` is a valid alternative but breaks the established idiom for no gain here.

### The ladder as a pure function

Mirrors `computeCommission` / `derivePayoutLedgerView` — pure, no I/O, throws rather than freezing nonsense. **Recommended placement: `src/lib/payments/cancellation.ts`** (beside `commission.ts`, importable by Server Components, server actions, and the Inngest functions alike — the same isomorphic constraint `commission.ts` documents).

```ts
// src/lib/payments/cancellation.ts
export type Tier = "flexible" | "standard" | "strict";
export type Rung = { minHours: number; refundBps: number };

/** D-68 ladder, compressed for FitOut's real lead time. Rungs are descending by minHours;
 *  the FIRST rung whose minHours is satisfied wins. Config-adjacent but structural — the
 *  SHAPE is policy, so it lives here rather than as loose constants. */
export const LADDER: Record<Tier, Rung[]> = {
  flexible: [{ minHours: 12, refundBps: 10000 }],
  standard: [{ minHours: 24, refundBps: 10000 }, { minHours: 6, refundBps: 5000 }],
  strict:   [{ minHours: 48, refundBps: 10000 }, { minHours: 24, refundBps: 5000 }],
};

export type RefundQuote = {
  tier: Tier;
  hoursToStart: number;
  refundBps: number;
  /** Refunded portion of the SPACE price only. */
  spaceRefundCents: number;
  /** Retained space price — becomes the payout gross (D-69). */
  retainedSpaceCents: number;
  /** Always 0 — the service fee is non-refundable (D-74). Explicit for the D-78 breakdown. */
  serviceFeeRefundCents: number;
  /** What actually goes back to the booker. */
  totalRefundCents: number;
};

export function quoteRefund(input: {
  tier: Tier;
  spacePriceCents: number;
  serviceFeeCents: number;
  startsAt: Date;
  now: Date;              // ALWAYS the DB clock, never Date.now() at a call site
}): RefundQuote {
  const { tier, spacePriceCents, serviceFeeCents, startsAt, now } = input;
  if (!Number.isInteger(spacePriceCents) || spacePriceCents < 0)
    throw new Error("space price must be a non-negative integer number of centavos");

  const hoursToStart = (startsAt.getTime() - now.getTime()) / 3_600_000;
  const rung = LADDER[tier].find((r) => hoursToStart >= r.minHours);
  const refundBps = rung?.refundBps ?? 0;

  // Single defined rounding rule — identical to computeCommission (Pitfall 5 precedent).
  const spaceRefundCents = Math.round((spacePriceCents * refundBps) / 10000);
  return {
    tier, hoursToStart, refundBps,
    spaceRefundCents,
    retainedSpaceCents: spacePriceCents - spaceRefundCents, // subtraction, never a second rounding
    serviceFeeRefundCents: 0,                                // D-74 non-refundable
    totalRefundCents: spaceRefundCents,                      // fee excluded
  };
}
```

**Rounding discipline (load-bearing):** compute the refund by rounding, derive the retained by **subtraction**. Rounding both independently can lose or invent a centavo — the exact class of bug `commission.ts` guards against with its "single defined rounding rule" comment.

**`now` must be the DB clock.** The preview RSC and the cancel action must both source `now()` from Postgres, not JS. Otherwise a booker sees a 100% preview and the action awards 50% because the two clocks straddled the rung boundary. Pass it in — never let the pure function reach for `Date.now()`.

**D-81 concrete dates:** derive the rung boundaries as instants (`startsAt − minHours`) and render them venue-local with `@date-fns/tz`, exactly as `request-expiry.ts:sendDeclinedNotice` composes `whenLabel`. Reuse that composition so every time surface reads identically.

---

## PayMongo Refund Mechanics

| Property | Finding | Source | Confidence |
|---|---|---|---|
| Partial refunds | **Supported.** *"The refund amount can be less than or equal to the amount of the corresponding Payment resource"* | `docs.paymongo.com/reference/refund-resource` | HIGH `[VERIFIED]` |
| Minimum | `100` centavos (₱1.00) | same | HIGH |
| Statuses | `pending` → `processing` → `succeeded` \| `failed` | same | HIGH |
| Settlement | *"reflected in their account within the day for eWallets, and within 30 days"* | same | HIGH |
| Webhook events | `payment.refunded`, `payment.refund.updated` — **already handled** (05-04) | repo | HIGH |
| Gateway fee | *"transaction fees are still charged for refunded payments"* — the ~2.5% is **not** returned | search-cached help center | MEDIUM |
| Idempotency | `Idempotency-Key` on POST; existing key is `refund:${paymentId}` | `src/lib/paymongo.ts:236` | HIGH |

**The gateway fee finding is exactly D-74's justification.** A 100% refund costs the platform the full ~2.5% with zero revenue against it. At 5% service fee (`SERVICE_FEE_BPS = 500`) the fee covers the gateway cost with margin at every price point. This corroborates D-76's reasoning that a percentage tracks the cost a flat fee structurally cannot. MEDIUM-HIGH.

### 🚩 Pitfall: the existing refund idempotency key is payment-scoped

```ts
idempotencyKey: `refund:${input.paymentId}`   // src/lib/paymongo.ts:236
```

This makes a **second** refund against the same payment return the **first** refund's response rather than creating a new one. For Phase 7 this is *currently* safe — one refund per booking, and `booking ↔ payment` is 1:1. But it is a trap for any future partial-then-top-up flow (e.g. a goodwill adjustment after a partial cancellation refund), which would **silently no-op** and appear successful.

**Recommendation:** leave the key as-is (changing it risks the Phase-5 auto-refund backstop's replay safety) but add an explicit comment stating the one-refund-per-payment assumption, and add a test asserting that a second `createRefund` for the same payment does **not** produce a second refund resource. Make the constraint visible rather than latent.

### Refund status is asynchronous — do not treat the POST as terminal

`createRefund` returns `{ id, status }` where status may be `pending`. The booking must not display "Refunded ₱500" off the POST alone. Follow the Phase-5 precedent exactly: the POST records intent; the **webhook is the single writer** of terminal state (D-57). `payment.refunded` / `payment.refund.updated` handlers already exist and already mark the booking + ledger refunded — extend them to write the refund columns rather than building a second writer. HIGH confidence.

---

## Inngest Event-Driven Email + Fan-Out (D-83/90/91)

### The one-event-two-channels pattern

D-91 requires one event to fan out to both channels so they cannot drift. Inngest **steps** give this for free: each `step.run` is independently memoized and retried, so a failing email retry does not rewrite the notification row.

```ts
// src/inngest/functions/notify.ts
export const notify = inngest.createFunction(
  {
    id: "notify",
    retries: 4,                       // default; explicit for auditability
    triggers: [{ event: "fitout/notify" }],
    // D-90: fires ONLY after all retries are exhausted.
    onFailure: async ({ error, event }) => {
      await recordAudit({
        actorId: "system",
        action: "notify",
        outcome: "needs_attention",
        meta: {
          notifyType: event.data.event.data.type,
          recipientId: event.data.event.data.recipientId,
          bookingId: event.data.event.data.bookingId,
          error: error.message,
        },
      });
      console.error("[notify-alert] permanently failed", { error: error.message });
    },
  },
  async ({ event, step }) => {
    // (1) In-app FIRST — a DB write is faster and far more reliable than an SMTP hop.
    //     If email later exhausts its retries, the user still has the notification.
    await step.run("write-notification", () => insertNotification(db, event.data));
    // (2) Email SECOND. Its own step ⇒ its own retries; a retry re-runs ONLY this step,
    //     because step (1) is memoized. This is what makes D-91 parity non-drifting.
    await step.run("send-email", () => sendForType(event.data));
  },
);
```

**Ordering is a deliberate reliability choice.** Notification-then-email means the durable, in-app record is the thing that always lands; the email is the best-effort amplifier. Reversed, a permanently-failing email would leave no record at all.

**`onFailure` semantics verified:** *"This function will be automatically called when your function fails after its maximum number of retries"* — it is implemented as a separate function bound to the `inngest/function.failed` system event, receives `{ error, event, step, runId }`, and `event.data.run_id` holds the **failed** run's id (not `runId`). `[CITED: inngest.com/docs/reference/functions/handling-failures]` HIGH confidence. This is precisely D-90's mechanism — no admin surface, `recordAudit` + Inngest run history.

### Emitting without blocking the booking transaction (MANAGE-03)

**Emit after commit, never inside the transaction.** `inngest.send()` is an outbound HTTP call; inside `db.transaction` it would hold a connection open across a network hop and — worse — a rollback would leave an event already sent for a booking that does not exist.

```ts
// in the server action, AFTER the status-scoped UPDATE has returned rows
await recordAudit(...);
try {
  await inngest.send({ name: "fitout/notify", data: { ... } });
} catch (err) {
  // Mirrors the existing fire-and-forget discipline (T-06-22): a notification-transport
  // failure must NEVER fail a money/state action whose durable write already succeeded.
  console.error("[notify] enqueue_failed", { bookingId, err });
}
```

**Honest limitation:** this leaves a bounded gap — if `inngest.send()` fails, no notification is produced and `onFailure` never fires (the function never ran). This is the **same accepted bounded race** as Assumption A6 in Phase 6 (the in-tx-reclaim dropped email). It is small but real. The fully-robust alternative is a transactional outbox (write an `outbox` row in the same transaction, drain it from a cron). **Recommendation: accept the gap for v1 and document it**, because (a) it matches an already-accepted precedent, (b) the reminder crons independently re-derive state from the DB and will catch most user-visible consequences, and (c) an outbox is meaningful scope. Flag it as a known limitation rather than pretending it is closed. MEDIUM confidence that this is the right tradeoff.

### Migrating the five existing sends (D-83)

`src/lib/email.ts` exports `sendBookingConfirmed`, `sendRequestReceived`, `sendRequestApproved`, `sendRequestDeclined`, `sendNewRequestToHost`, currently invoked `void`-style from actions and from `request-expiry.ts`. Move each call site to an `inngest.send()`; keep the `email.ts` functions themselves as the send implementations that the Inngest function calls. **Do not rewrite the templates in the same task** — that couples a reliability change to a content change and makes regressions hard to attribute.

> Note `request-expiry.ts` is *already* an Inngest function. Its `sendDeclinedNotice` can either emit an event (uniform, one code path) or call `email.ts` directly (fewer hops). **Recommend emitting the event** so D-91's in-app parity applies to expiry notices too — otherwise expiry is the one lifecycle event with no notification row, which is exactly the drift D-91 exists to prevent.

---

## Four Reminder Crons — At-Most-Once (D-85/87)

### 🚩 Inngest idempotency alone is NOT sufficient

Inngest offers event-level `id` dedupe and function-level `idempotency` (CEL expression). Both are documented as **"an idempotency key over a 24 hour period."** They are also *"bypassed by debouncing, event batching, and function pausing."* `[CITED: inngest.com/docs/guides/handling-idempotency]` HIGH confidence.

A 24-hour window is a coincidental fit for reminders and a **structural mismatch** for the guarantee D-87 asks for. Relying on it would make "one reminder each" depend on a vendor's dedupe TTL and on not enabling batching later.

**Use the codebase's own idiom instead.** The pattern is already proven twice: `host_payout_ledger`'s `UNIQUE(booking_id)` where *"the INSERT itself is the at-most-once lock"*, and `request-expiry`'s status-scoped `UPDATE … RETURNING`.

### Recommended: a `booking_reminder` claim table

```ts
export const reminderKind = pgEnum("reminder_kind", [
  "pre_expiry",       // approved but unpaid
  "pre_session_booker",
  "pre_session_host",
  "pre_sla_host",     // host with a pending request
]);

export const bookingReminder = pgTable(
  "booking_reminder",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id").notNull().references(() => booking.id, { onDelete: "cascade" }),
    kind: reminderKind("kind").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("booking_reminder_uq").on(t.bookingId, t.kind)],
);
```

**The claim, exactly mirroring `payOne`:**

```sql
INSERT INTO booking_reminder (id, booking_id, kind)
VALUES (${id}, ${bookingId}, ${kind})
ON CONFLICT (booking_id, kind) DO NOTHING
RETURNING id
```

Empty `RETURNING` ⇒ already sent ⇒ **emit nothing**. This is immune to cron overlap, Inngest step retries, backfills, and multi-instance deploys, because the guarantee is a database constraint rather than an application check or a vendor TTL. **HIGH confidence — this is the strongest available shape and it is the house pattern.**

**Why a table rather than four timestamp columns on `booking`:** four kinds today, more later; a table adds a row instead of a migration per kind, keeps `booking` (a hot, EXCLUDE-constrained table) narrow, and gives free send-history for debugging. The `UNIQUE` does the same job either way.

**Claim before send, not after.** If the send is attempted first and the process dies before the marker is written, the next tick double-sends. Claiming first means a crash between claim and send loses a reminder — the strictly better failure under D-87 ("no double-tap") and consistent with `payOne`'s ordering.

### Cron scheduling

The three existing crons are singletons (`concurrency: 1`) on offset minutes to avoid contention: payout-sweep `:00`, request-expiry `:15`, payout-reconcile `:30`. **Use `:45` for reminders.** `[VERIFIED: repo source]`

```ts
triggers: [{ cron: "TZ=Asia/Manila 45 * * * *" }], concurrency: 1
```

**Hourly cadence vs. offset precision:** an hourly cron cannot hit a "2 hours before session" offset more precisely than ±1 hour. This is fine for pre-session reminders. It is **tighter for pre-expiry**, where D-95's 12h payment window means a reminder at "3h before expiry" could land anywhere in a 1-hour band. Acceptable, but the offsets must be chosen with the granularity in mind — do not pick an offset smaller than ~2h. The due query should be a **range**, not an instant:

```sql
WHERE b.status = 'approved'
  AND b.expires_at > now()
  AND b.expires_at <= now() + make_interval(hours => ${PRE_EXPIRY_REMINDER_HOURS}::int)
```

A range plus the `UNIQUE` claim means a missed tick recovers on the next one and can never double-send. **HIGH confidence.**

### Recommended offsets (discretion item, consistent with D-95)

| Reminder | Offset | Rationale |
|---|---|---|
| `pre_expiry` (approved, unpaid) | 4h before `expires_at` | ⅓ of the 12h window (D-95); leaves real recovery time. **The highest-value reminder** — this is the one D-89 accepted risk on. |
| `pre_sla_host` (pending request) | 6h before `expires_at` | ¼ of the 24h SLA; a capped/shortened SLA (D-96) may skip it entirely, which is correct. |
| `pre_session_booker` | 24h before `startsAt` | Industry standard; long enough to still cancel under Flexible (12h rung). |
| `pre_session_host` | 12h before `startsAt` | Host needs prep lead time, not cancellation lead time. |

All four as named constants in `src/lib/payments/config.ts` (D-CONTEXT: *"every new number in this phase joins it"*).

> 🚩 **A capped window can make a reminder impossible.** Under D-96 a request 4h out gives the host a 2h SLA — the 6h `pre_sla_host` reminder can never fire. The due query's `expires_at > now()` guard handles this gracefully (no row, no send), but the planner should assert it in a test rather than discover it in production.

---

## `notification` Table Design (D-86 — discretion item)

**Recommendation: `type` as a pgEnum + `payload` as `jsonb`, with a Zod-validated TypeScript discriminated union at the write boundary.**

```ts
export const notificationType = pgEnum("notification_type", [
  "booking_confirmed", "request_received", "request_approved", "request_declined",
  "new_request_to_host", "booking_cancelled_by_booker", "booking_cancelled_by_host",
  "refund_issued", "reminder_pre_expiry", "reminder_pre_session", "reminder_pre_sla",
]);

export const notification = pgTable(
  "notification",
  {
    id: text("id").primaryKey(),
    recipientId: text("recipient_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    // Denormalised for the dropdown's deep link + for cheap filtering. Nullable: not every
    // notification is booking-scoped. onDelete restrict — bookings are financial records (A5).
    bookingId: text("booking_id").references(() => booking.id, { onDelete: "cascade" }),
    payload: jsonb("payload").$type<NotificationPayload>().notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // Unread count — the hot query, on every page render. PARTIAL index: only unread rows are
    // indexed, so it stays tiny forever while read history grows without bound.
    index("notification_unread_idx").on(t.recipientId).where(sql`read_at IS NULL`),
    // Dropdown list — newest first, scoped to the recipient.
    index("notification_recipient_created_idx").on(t.recipientId, t.createdAt.desc()),
  ],
);
```

**Why jsonb over per-type columns:** eleven types with different shapes would mean either eleven nullable column sets or eleven tables. jsonb keeps one table and one write path.

**Why a discriminated union over a bare blob:** Drizzle's `.$type<T>()` gives the column a compile-time type at zero runtime cost, and a union keyed on `type` gives exhaustiveness checking in the renderer — so adding a type without handling it in the dropdown is a **compile error**, not a blank row.

```ts
export type NotificationPayload =
  | { type: "booking_confirmed"; listingTitle: string; whenLabel: string; totalLabel: string }
  | { type: "request_approved"; listingTitle: string; whenLabel: string; payByLabel: string }
  | { type: "booking_cancelled_by_host"; listingTitle: string; whenLabel: string; refundLabel: string }
  // …
```

Validate with Zod at the single insert site (Zod is already in the stack) so a malformed payload cannot reach the DB. This is the best-of-both answer: DB flexibility, TS safety, runtime validation at one boundary. **MEDIUM-HIGH confidence.**

**Unread-count query:**

```sql
SELECT count(*) FROM notification WHERE recipient_id = $1 AND read_at IS NULL
```

Hits the partial index directly. If badge counts ever grow large, cap the display (`9+`) via `SELECT count(*) FROM (SELECT 1 FROM notification WHERE … LIMIT 10) t` — but at v1 volume the plain count is correct and simpler. **Do not** add a denormalised counter on `user`; it introduces a second writer and a drift class for a query that is already indexed.

**Render-time snapshot vs. live join:** store display strings (`listingTitle`, `whenLabel`) **in the payload** rather than joining at read time. D-86 explicitly wants *"durable history that survives the underlying booking changing state"* — a notification saying "Your booking at Court A was cancelled" must not silently re-render if the listing is retitled. This also makes the dropdown a single indexed table scan with no joins. **HIGH confidence — it directly implements D-86's stated requirement.**

---

## Expiry-Cap Correctness (D-93/94/95/96)

### The two fix sites, verified

| Site | Current code | Problem |
|---|---|---|
| `src/app/actions/host-requests.ts:175` | `expires_at = now() + make_interval(hours => ${APPROVAL_PAYMENT_WINDOW_HOURS})` | **Uncapped.** A 2pm approval of a 5pm session stays payable until 2pm next day. |
| `src/lib/availability/units.ts:264` | `const expiresAt = new Date(Date.now() + ttlMs);` | **Uncapped AND JS-clock.** Same bug in the higher-traffic instant-book path, plus the clock inconsistency D-94 calls out. |

`[VERIFIED: repo source, exact lines]` HIGH confidence.

### Fix 1 — `host-requests.ts` (approve)

```sql
UPDATE booking
SET status = 'approved',
    expires_at = LEAST(
      now() + make_interval(hours => ${APPROVAL_PAYMENT_WINDOW_HOURS}::int),
      starts_at
    )
WHERE id = ${requestId}
  AND status = 'requested'
  AND expires_at > now()
  AND starts_at > now() + make_interval(hours => ${MIN_APPROVE_WINDOW_HOURS}::int)  -- D-93 guard
RETURNING id
```

- In `UPDATE … SET`, an unqualified `starts_at` on the right-hand side reads the row's **current** value. Correct and safe here.
- The D-93 minimum-approve-window guard belongs in the **same** `WHERE`, so a too-late approve claims 0 rows and falls through to the existing `NOT_PENDING` calm path — **no new error branch**. The 0-row path already exists and is already tested.
- D-93's "auto-declines with an honest 'too close to start' message to both sides" is then driven by the expiry cron, which will find the request lapsed. Distinguishing "declined because too close" from "declined because SLA lapsed" needs a reason — recommend a nullable `decline_reason` text column read by the email/notification composer.

### Fix 2 — `units.ts:264` (placeHold)

Replace the JS-clock value with a SQL expression. Drizzle accepts a `sql` fragment as a column value in `.values()`:

```ts
// BEFORE: const expiresAt = new Date(Date.now() + ttlMs);
// AFTER — DB clock as sole authority (D-94), capped at the session start:
const expiresAtSql = sql`LEAST(
  now() + make_interval(mins => ${ttlMinutes}::int),
  ${startIso}::timestamptz
)`;
// …then in the insert:
await sp.insert(booking).values({ …, expiresAt: expiresAtSql, … });
```

Here `starts_at` is a value being **inserted**, not a column being read, so parameterise `${startIso}::timestamptz` rather than naming the column. **HIGH confidence.** The insert sits inside a SAVEPOINT retry loop — a SQL expression is re-evaluated on each attempt, which is *more* correct than a JS value captured once before the loop.

> ⚠️ `expiresAt` may be read back by the caller for UI (countdown). With a SQL expression the value is no longer known client-side at insert time. Add `.returning({ expiresAt: booking.expiresAt })` to recover it. Check every consumer of `createPendingHold`'s return shape.

### D-96 proportional split, in SQL

At **request creation** (`placeHold` with `holdStatus = 'requested'`): host SLA = `min(24h, half the time to start)`, floored at the 1h minimum approve window.

```sql
LEAST(
  now() + GREATEST(
    make_interval(hours => ${MIN_APPROVE_WINDOW_HOURS}::int),          -- 1h floor
    LEAST(
      make_interval(hours => ${APPROVAL_SLA_HOURS}::int),              -- 24h cap
      (${startIso}::timestamptz - now()) / 2                           -- half the time to start
    )
  ),
  ${startIso}::timestamptz                                             -- never outlive the session
)
```

Postgres supports `interval / integer`. `[ASSUMED — standard Postgres semantics; verify with a direct query in the first task]`

**Worked check (D-96's own example):** a request 4h out → `(4h)/2 = 2h`; `LEAST(24h, 2h) = 2h`; `GREATEST(1h, 2h) = 2h`. Host SLA = now+2h, booker gets the remaining 2h. **Matches D-96 exactly.** The outer `LEAST(…, starts_at)` is belt-and-braces (half the time to start can never exceed the time to start) but should stay as a structural guarantee of D-94's one invariant.

### Lead-time guards (D-96, mode-scoped)

```ts
/** D-93/D-96: request-to-book needs TWO humans in sequence — host approves, then booker pays. */
export const MIN_LEAD_REQUEST_HOURS = Number(process.env.MIN_LEAD_REQUEST_HOURS ?? 2);
/** D-96: instant-book is ONE person, ONE checkout — a checkout-sized guard, not a two-human one.
 *  Deliberately small so same-day instant-book stays available. */
export const MIN_LEAD_INSTANT_MINUTES = Number(process.env.MIN_LEAD_INSTANT_MINUTES ?? 30);
/** D-93/D-96: below this remaining window an approve is refused (and the request auto-declines). */
export const MIN_APPROVE_WINDOW_HOURS = Number(process.env.MIN_APPROVE_WINDOW_HOURS ?? 1);
```

Enforce **server-side in `placeHold`**, in the same transaction, against `now()`. D-98/D-100's unselectable `SlotPicker` slots are *"a courtesy, never the gate"* (Security V4) — the server re-validates at submit unconditionally.

### 🚩 Critical: do NOT add `starts_at > now()` to the payment webhook

D-94 says approve, confirm, and pay are refused once `starts_at` has passed. **Where** that guard goes is load-bearing.

Phase 5 established (`05-PATTERNS.md` Pitfall 4, and a comment in the webhook itself) that the `checkout_session.payment.paid` handler confirms on `status = 'pending'` **alone** — deliberately **not** re-checking expiry — because **payment is the confirm authority** (D-57). Adding `AND starts_at > now()` there would resurrect exactly the failure 05-04 was built to prevent: a booker's money is taken and the booking cannot confirm.

**Correct placement:**

| Guard | Location | Rationale |
|---|---|---|
| Refuse to *initiate* checkout post-start | The checkout server action | Before any money moves — the safe place to refuse |
| Refuse to *approve* post-start | `approveRequest` UPDATE `WHERE` | Before the payment window opens |
| Refuse to *create a hold* under lead time | `placeHold` in-transaction | Before the slot is held |
| Payment lands post-start anyway | **Webhook stays `status='pending'` only** | The existing `handleGoneSlot` auto-refund backstop already covers it |

**HIGH confidence — this is the single most likely way to break Phase 5 while implementing D-94.** Call it out in the plan's task instructions, not just in research.

---

## Bookings Views (D-101..D-106)

Largely clone-work; the correctness notes are short.

**Derived `completed` (D-102).** A `confirmed` booking with `ends_at < now()` renders as Completed. Derive in the RSC's SELECT, never store:

```sql
CASE WHEN b.status = 'confirmed' AND b.ends_at <= now() THEN 'completed' ELSE b.status::text END AS "displayStatus"
```

The `completed` **enum value stays unused** — and note it is in the EXCLUDE's *free* set (`NOT IN ('cancelled','declined','completed')`), so ever writing it would free the slot of a past booking. Harmless (the window is past) but pointless. D-102's "cannot race the occupancy predicate" is correct: a read-time derivation writes nothing.

**Tabs (D-103).** Upcoming = `ends_at > now() AND status NOT IN ('cancelled','declined')`. Past = everything else. Both partition on `now()`, so use the **DB clock** in the query, not a JS boundary computed in the RSC — otherwise a booking can appear in both tabs or neither across the boundary.

**Indexes.** `/bookings` filters by `booker_id`; `/host/bookings` joins `listing` and filters `host_id`. Today only `booking_listing_idx` exists (`schema.ts`). Add `booking_booker_idx` on `(booker_id, starts_at DESC)` for the booker view. The host view goes through `listing.host_id` — verify a `listing_host_idx` exists; if not, the host page will seq-scan `listing` on every render. **MEDIUM confidence** (did not audit `listing`'s index list).

**"Load more" (D-106).** Reuse the Phase-4 search idiom. Prefer **keyset pagination** (`WHERE starts_at < $cursor ORDER BY starts_at DESC LIMIT n`) over `OFFSET` — the Past tab grows without bound and `OFFSET` degrades linearly. Match whatever Phase 4 does unless it used `OFFSET`, in which case note the divergence.

**Owner gating (D-101).** `/host/bookings` clones `/host/earnings`: the `(host)` route group is **not** the gate; the RSC re-checks `listing.host_id = session.user.id` in the query itself (owner-scoped `WHERE`, not a post-filter). Same for both cancel actions — `loadOwnedRequest`-style gate before any UPDATE, with missing and cross-user returning the **same** calm denial (no enumeration oracle). This is the established Security V4 pattern (`host-requests.ts:154`).

---

## Discretion Recommendations

| Item | Recommendation | Confidence |
|---|---|---|
| **Cancelling an unpaid `requested`/`approved` hold** | **Reuse the existing decline/release path**, not the cancel flow. No money moved, so there is no refund to preview and D-78's breakdown is meaningless. Terminal mapping must match the canonical one (`requested → declined`, `approved → cancelled`) documented in `request-expiry.ts` — diverging would desync the in-tx sweep in `units.ts:257`. Surface it as "Cancel request" with a plain confirm, no money UI. | HIGH |
| **Refund-preview placement** | `src/lib/payments/cancellation.ts`, beside `commission.ts`. Pure, isomorphic (no directive), throws on bad input. Same module hosts `LADDER` and `quoteRefund`. | HIGH |
| **Host-side listing filter** | **Ship it** — a `?listing=` search param on `/host/bookings`, server-filtered, defaulting to all. Cheap (one `WHERE` clause + a `<select>`), and multi-listing hosts are the ones who need the page most. Skip only if the wave is over budget. | MEDIUM |
| **Notification payload shape** | jsonb + Zod-validated TS discriminated union (§ above). | MEDIUM-HIGH |
| **Reminder offsets** | 4h / 6h / 24h / 12h (§ above), all as `config.ts` constants. | MEDIUM |
| **Email templating** | **Keep plain HTML strings.** D-66 left it open and it should stay open — this phase already changes the email *transport* (D-83) and adds four new sends. Changing templating in the same phase couples a reliability migration to a rendering migration and makes any regression ambiguous in attribution. React Email is a good future call, on its own. | MEDIUM-HIGH |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| At-most-once reminder send | An app-level `SELECT … then INSERT` check | `UNIQUE(booking_id, kind)` + `ON CONFLICT DO NOTHING RETURNING` | The exact race the constraint kills — the `payOne` comment says so explicitly |
| Retry/backoff for email | A custom retry loop or `setTimeout` | Inngest `step.run` + `retries` | Already mounted; durable across deploys |
| Detecting permanent failure | Counting attempts in a DB column | Inngest `onFailure` | Fires exactly once after retries exhaust `[CITED]` |
| Double-booking on cancel/rebook | Any new occupancy check | The existing GiST EXCLUDE | D-21 keystone; touching it is the top project risk |
| Expiry timing | `Date.now()` anywhere | Postgres `now()` in SQL | D-94's entire point; the `units.ts:264` bug is what happens otherwise |
| Refund idempotency | A "already refunded?" pre-query | `Idempotency-Key` + the webhook single-writer | Phase-5 precedent (D-57) |
| Money rounding | Floats, or rounding both sides | Integer centavos; round once, subtract for the remainder | `commission.ts` "single defined rounding rule" |
| Timezone display | Manual UTC offset math | `@date-fns/tz` + the existing `whenLabel` composition | Already correct in 4 places; diverging creates a 5th format |
| Unread badge count | A denormalised counter on `user` | Partial index + `count(*)` | A counter is a second writer and a drift class |

**Key insight:** this phase adds **no new infrastructure**. Every reliability guarantee it needs already has a proven implementation in the repo. The highest-quality plan is the one that clones the most and invents the least — and the three Findings above are all places where *not* cloning (i.e. assuming an existing mechanism already covers a new case) is the actual risk.

---

## Common Pitfalls

### Pitfall 1: assuming the payout sweep picks up cancelled bookings
**What goes wrong:** hosts are never paid the retained portion of a partially-refunded cancellation. Silent — no error, no alert, just missing money.
**Why:** D-69 says "zero new mechanism"; the sweep says `WHERE b.status = 'confirmed'`.
**Avoid:** widen the predicate (§ Finding 1).
**Warning sign:** a cancelled booking with `retained_space_cents > 0` and no `host_payout_ledger` row 25h after `ends_at`.

### Pitfall 2: the service fee leaking into the payout gross
**What goes wrong:** platform pays the host 90% of its own service fee.
**Why:** the sweep freezes commission off `quoted_total_cents`, which D-74 makes all-in.
**Avoid:** switch the gross to `space_price_cents` (§ Finding 2).
**Warning sign:** `ledger.gross_cents == booking.quoted_total_cents` on any post-Phase-7 booking.

### Pitfall 3: adding a booking-status enum value
**What goes wrong:** the EXCLUDE predicate is the **complement**, so a new value defaults to OCCUPYING — the slot is blocked forever.
**Why:** `WHERE status NOT IN ('cancelled','declined','completed')`.
**Avoid:** D-79 already forbids it. If it ever becomes necessary, the value must be added to the free set in a **separate migration from its first use** (55P04 — the `0010`/`0012` split).
**Warning sign:** a cancelled slot that cannot be rebooked.

### Pitfall 4: adding `starts_at > now()` to the payment webhook
**What goes wrong:** money taken, booking not confirmed — the exact failure 05-04 exists to prevent.
**Why:** D-94 says "pay is refused post-start" and the webhook looks like the pay path. It is not; it is the **confirm** path, and payment is the confirm authority (D-57).
**Avoid:** guard at checkout initiation; leave the webhook at `status='pending'` only.
**Warning sign:** the `handleGoneSlot` refund rate rising after deploy.

### Pitfall 5: relying on Inngest idempotency for "one reminder each"
**What goes wrong:** double-sends outside the 24h window, or when batching is enabled later.
**Why:** documented as a 24-hour key, *"bypassed by debouncing, event batching, and function pausing."* `[CITED]`
**Avoid:** DB claim table (§ Reminders).
**Warning sign:** two `pre_session` emails for one booking in logs.

### Pitfall 6: previewing the refund with the JS clock
**What goes wrong:** preview shows 100%, the action awards 50% — the booker is shown one number and charged another, breaking SC#2's core promise.
**Why:** rung boundaries are sharp; JS and DB clocks drift and the round trip takes real time.
**Avoid:** source `now()` from Postgres in both the preview RSC and the action; pass it into `quoteRefund`.
**Warning sign:** any test that passes `new Date()` into `quoteRefund` from non-test code.

### Pitfall 7: the debit row tripping the reconcile stuck-`held` alert
**What goes wrong:** a false `[payout-alert]` on every host cancellation; operators learn to ignore the channel, and a real payout failure gets missed.
**Why:** `payout-reconcile` queries `WHERE state = 'held'` with no `kind` filter.
**Avoid:** scope every existing ledger query with `AND kind = 'payout'` (grep-complete).
**Warning sign:** alert volume correlating with cancellations rather than transfer failures.

### Pitfall 8: `createPendingHold`'s return shape after the SQL-expression change
**What goes wrong:** `expiresAt` becomes unavailable client-side; the checkout countdown renders `Invalid Date`.
**Why:** the value moves from JS-computed to DB-computed.
**Avoid:** add `.returning({ expiresAt })` and audit every consumer.
**Warning sign:** `tsc` passes (the type is still `Date`) but the UI shows a broken timer — **this one does not fail the compiler.**

### Pitfall 9: a capped SLA making a reminder unreachable
**What goes wrong:** the 6h `pre_sla_host` reminder can never fire for a request 4h out (2h SLA under D-96).
**Avoid:** range-based due query with `expires_at > now()`; assert the no-send case in a test.
**Warning sign:** none at runtime — silent by design, which is why it needs a test.

### Pitfall 10: reusing the `payout:` idempotency namespace for refunds
**What goes wrong:** a refund and a payout for the same booking collide on `Idempotency-Key`; one silently returns the other's response.
**Avoid:** `refund:${bookingId}` for refund transfers; keep `payout:${bookingId}` untouched.
**Warning sign:** a refund whose returned transfer id matches a known payout transfer id.

---

## Runtime State Inventory

Phase 7 is additive schema + code. Assessed for completeness:

| Category | Items Found | Action Required |
|---|---|---|
| Stored data | New nullable columns on `booking` (`cancellation_policy`, `space_price_cents`, `service_fee_cents`, `refund_cents`, `retained_space_cents`, `cancelled_by`, `cancelled_at`) and `listing` (`cancellation_policy`); new tables `notification`, `booking_reminder`; `host_payout_ledger` gains `kind` + `recovered_cents`. | **Data migration required for `space_price_cents`** (backfill `= quoted_total_cents`) and `service_fee_cents` (`= 0`). All others are backfill-free nullable ADD COLUMNs. The `UNIQUE(booking_id)` → `UNIQUE(booking_id, kind)` change needs a **hand-authored** migration (constraint change, like `0012`). |
| Live service config | **Inngest Cloud** — new functions must be registered by Inngest re-syncing `/api/inngest`. The serve() mount is in git (`src/app/api/inngest/route.ts`); function registration is derived from it, not stored separately. | Add all new functions to the `functions: []` array. Confirm the deploy triggers an Inngest sync. |
| OS-registered state | **None** — verified: no Task Scheduler / pm2 / systemd usage; all scheduling is Inngest crons defined in code. | None |
| Secrets / env vars | New **optional** vars with defaults: `SERVICE_FEE_BPS`, `HOST_CANCEL_FEE_CENTS`, `MIN_LEAD_REQUEST_HOURS`, `MIN_LEAD_INSTANT_MINUTES`, `MIN_APPROVE_WINDOW_HOURS`, 4 reminder offsets. `APPROVAL_PAYMENT_WINDOW_HOURS` **default changes 24 → 12** (D-95). No secret rotation. | Update `.env.example`. ⚠️ **If `APPROVAL_PAYMENT_WINDOW_HOURS=24` is set explicitly in any deployed env, D-95 will not take effect** — the code default change is not enough. Check and unset. |
| Build artifacts | **None** — verified: Next.js build output only, regenerated on every deploy. No compiled binaries, no published packages, no egg-info equivalents. | None |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| PostgreSQL 18 + btree_gist | EXCLUDE, `LEAST`/`make_interval` | ✓ | 18 (docker `postgis/postgis:18`) | — |
| Inngest Dev Server | Local cron/function testing | ✓ | `npm run dev:inngest` | — |
| Resend | Email sends | ✓ | `^6.12.4`; `email.ts:36` no-ops without a key | Console log (already implemented) |
| PayMongo test mode | Refund probe + `instapay` verification | ✓ | `/v1` + `/v2` | — |
| Tunnel (ngrok/cloudflared) | Webhook forwarding for the refund probe | ✓ | Used in Phase 5 UAT | — |
| Vitest | Unit + integration | ✓ | `^4.1.8` | — |
| Playwright | E2E | ✓ | `^1.60.0` | — |

**Missing dependencies with no fallback:** None.

**External gates (not missing, but blocking specific verification):**
- The **PayMongo `/v2` beta** already gates real payout-transfer UAT (carried from Phase 5). If D-72 is built, its `instapay` transfer inherits the same gate.
- The **QRPh refund probe** requires test-mode QRPh to be enabled on the account.

---

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | Vitest 4.1.8 (unit + integration) · Playwright 1.60.0 (E2E) |
| Config file | `vitest.config.ts` (node env, `tests/**/*.test.ts`) · `playwright.config.ts` (`e2e/**`) |
| Quick run command | `npx vitest run tests/payments tests/booking` |
| Full suite command | `npm test` (`vitest run`) then `npm run test:e2e` |
| Integration harness | `tests/helpers/db.ts` — isolated per-test schemas with all migrations replayed (this is what makes concurrency tests real) |

### Phase Requirements → Test Map

| Req | Behavior | Type | Command | Exists? |
|---|---|---|---|---|
| PAY-06 | Ladder returns the correct rung per tier × hours-to-start | unit | `npx vitest run tests/payments/cancellation.test.ts` | ❌ Wave 0 |
| PAY-06 | `refund + retained == spacePrice` exactly, at every bps, no lost centavo | unit (property) | same | ❌ Wave 0 |
| PAY-06 | Service fee never refunded (`serviceFeeRefundCents === 0` always) | unit | same | ❌ Wave 0 |
| PAY-06 | `computeServiceFee` integer/rounding guards, throws on bad input | unit | `npx vitest run tests/payments/service-fee.test.ts` | ❌ Wave 0 |
| PAY-06 | **Cancelled-with-retention booking IS swept; gross == retained** | integration | `npx vitest run tests/payments/payout-sweep.test.ts` | ⚠️ extend |
| PAY-06 | **Host-cancelled (retained=0) booking produces ZERO ledger rows** | integration | same | ❌ Wave 0 |
| PAY-06 | **Payout gross == space_price, NOT quoted_total** (fee not paid out) | integration | same | ❌ Wave 0 |
| PAY-06 | Concurrent cancel + payout-sweep: exactly one ledger row, correct gross | integration (racing clients) | same | ❌ Wave 0 |
| PAY-06 | Partial refund POSTs the correct amount with `Idempotency-Key`; 2nd call creates no 2nd refund | unit (mocked fetch) | `npx vitest run tests/paymongo/refund.test.ts` | ⚠️ extend |
| PAY-06 | Host-cancel fee capped at booking value at write time | unit | `npx vitest run tests/payments/host-cancel.test.ts` | ❌ Wave 0 |
| PAY-06 | Netting never drives a transfer below zero; zero-amount transfer never fires | integration | `npx vitest run tests/payments/payout-sweep.test.ts` | ❌ Wave 0 |
| PAY-06 | Debit row does NOT trip the reconcile stuck-`held` alert | integration | `npx vitest run tests/payments/payout-reconcile.test.ts` | ⚠️ extend |
| BOOK-07 | Tier snapshot immutable: retier the listing → in-flight booking's refund unchanged | integration | `npx vitest run tests/booking/cancellation.test.ts` | ❌ Wave 0 |
| BOOK-07 | Preview amount == amount actually refunded (same DB clock) | integration | same | ❌ Wave 0 |
| BOOK-07 | Cancel after `startsAt` is refused | integration | same | ❌ Wave 0 |
| BOOK-07 | Cancel is owner-gated; cross-user and missing return the identical denial | integration | `npx vitest run tests/security/` | ❌ Wave 0 |
| BOOK-07 | E2E: cancel → see exact refund → confirm → status + amount correct | e2e | `npx playwright test e2e/cancel.spec.ts` | ❌ Wave 0 |
| D-94 | `expires_at == LEAST(now()+window, starts_at)` at **0/1/2/4/25** hours to start | integration | `npx vitest run tests/availability/expiry-cap.test.ts` | ❌ Wave 0 |
| D-94 | `placeHold` uses DB `now()` — hold survives a skewed JS clock | integration | same | ❌ Wave 0 |
| D-96 | Proportional split: request 4h out → host 2h, booker 2h | integration | same | ❌ Wave 0 |
| D-93 | Approve refused below `MIN_APPROVE_WINDOW_HOURS`; 0 rows → calm `NOT_PENDING` | integration | `npx vitest run tests/booking/host-requests.test.ts` | ⚠️ extend |
| D-96 | Lead-time guards mode-scoped: 2h request / 30min instant; server rejects at submit | integration | same | ❌ Wave 0 |
| **D-57 regression** | **Webhook still confirms on `status='pending'` ALONE — no `starts_at` guard added** | integration | `npx vitest run tests/paymongo/webhook-payment-paid.test.ts` | ⚠️ extend (**guard test**) |
| D-21 regression | Cancelled slot is immediately rebookable; EXCLUDE unchanged | integration | `npx vitest run tests/availability/` | ⚠️ extend |
| MANAGE-03 | `inngest.send` failure does NOT fail the cancel action | unit | `npx vitest run tests/booking/cancellation.test.ts` | ❌ Wave 0 |
| MANAGE-03 | One event → notification row AND email; email-step retry does not duplicate the row | integration | `npx vitest run tests/notifications/notify.test.ts` | ❌ Wave 0 |
| MANAGE-03 | `onFailure` writes `recordAudit` `needs_attention` (D-90) | unit | same | ❌ Wave 0 |
| D-87 | Double-tap: two concurrent cron passes → exactly ONE reminder per kind | integration (racing clients) | `npx vitest run tests/notifications/reminders.test.ts` | ❌ Wave 0 |
| D-87 | Capped SLA making a reminder unreachable sends nothing (no crash) | integration | same | ❌ Wave 0 |
| MANAGE-01/02, HOST-02 | Booker sees only own bookings; host sees only own listings' bookings | integration | `npx vitest run tests/security/` | ❌ Wave 0 |
| MANAGE-02 | `completed` derived: confirmed + past `ends_at` renders Completed, DB unchanged | integration | `npx vitest run tests/booking/views.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit && npx vitest run tests/payments tests/booking`
- **Per wave merge:** `npm test` (full Vitest suite)
- **Phase gate:** `npm test` green **and** `npm run test:e2e` green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/payments/cancellation.test.ts` — ladder, rounding, fee-never-refunded (PAY-06, BOOK-07)
- [ ] `tests/payments/service-fee.test.ts` — `computeServiceFee` (D-74/76)
- [ ] `tests/payments/host-cancel.test.ts` — fee cap, signed debit (D-70/71)
- [ ] `tests/booking/cancellation.test.ts` — snapshot immutability, preview↔action agreement, post-start refusal (BOOK-07)
- [ ] `tests/booking/views.test.ts` — derived `completed`, tab partitioning (MANAGE-01/02, HOST-02)
- [ ] `tests/availability/expiry-cap.test.ts` — boundary matrix + proportional split (D-94/96)
- [ ] `tests/notifications/notify.test.ts` — fan-out, step memoization, `onFailure` (MANAGE-03, D-90/91)
- [ ] `tests/notifications/reminders.test.ts` — at-most-once under concurrency (D-87)
- [ ] `e2e/cancel.spec.ts` — booker cancel journey (SC#2)
- [ ] **Extend** `tests/payments/payout-sweep.test.ts`, `tests/payments/payout-reconcile.test.ts`, `tests/paymongo/refund.test.ts`, `tests/paymongo/webhook-payment-paid.test.ts`, `tests/booking/host-requests.test.ts`

**Framework install:** none — Vitest, Playwright, and the isolated-schema harness all exist.

> **The concurrency tests are the phase's real gate.** "Concurrent cancel + payout sweep" and "double-tap under cron retry" are the two failures that lose or duplicate real money, and neither is reachable by a unit test. `tests/helpers/db.ts` already supports racing clients against an isolated schema (it is how the double-booking guarantee was proven) — reuse it rather than mocking.

---

## Security Domain

### Applicable ASVS Categories (Level 1)

| Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | yes | Better Auth session; `requireUserId()` on every new action |
| V3 Session Management | yes | Existing Better Auth sessions; **D-72's payout-redirection threat is a session-hijack consequence** — bind the destination to the authenticated booker + that booking |
| V4 Access Control | **yes — highest risk** | Owner-gate in the action/RSC, never the route group. Both cancel actions, `/host/bookings`, notification reads (a notification is per-recipient — an IDOR here leaks the other party's booking details) |
| V5 Input Validation | yes | Zod on the cancel form, the tier selection, the notification payload, and (if built) the bank-details form |
| V6 Cryptography | yes | Unchanged — `Paymongo-Signature` HMAC-SHA256 on webhooks; Inngest signing key fail-closed in prod |

### Threat Patterns for this phase

| Pattern | STRIDE | Mitigation |
|---|---|---|
| Client-supplied refund amount | Tampering | Server-computed from the **snapshotted** tier + frozen amounts; the client sends only a booking id |
| Cancel another user's booking | Elevation | Owner-gate before UPDATE; identical denial for missing vs cross-user |
| Read another user's notifications | Info disclosure | `WHERE recipient_id = session.user.id`, owner-scoped in the query not post-filtered |
| **Payout redirection** (D-72) | Tampering | Destination bound to the authenticated booker + that booking; amount server-frozen; **never** read the destination from a prior request or a stored value |
| **PH DPA (RA 10173)** exposure (D-72) | Info disclosure | Collect-and-never-store: pass straight through to the transfer; persist only the transfer id + masked last-4. **The no-persistence rule is load-bearing, not an optimisation** (07-CONTEXT § Specific Ideas) |
| Refund replay | Tampering | `Idempotency-Key` + webhook single-writer + status-scoped UPDATE |
| Cancel-spam to grief a host | DoS | `rateLimit()` per identity, as `approveRequest` does |
| Notification payload injection (stored XSS) | Tampering | Payloads render display strings — escape at render; never `dangerouslySetInnerHTML`. Applies to the **email HTML** too (`email.ts` builds raw HTML strings) |
| Host cancels to resell higher | Abuse | D-70 auto-block of the freed window via `availability_block` |
| Tier downgrade after booking | Tampering | `booking.cancellation_policy` snapshot; refund calc reads the **booking**, never the listing |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| **A1** | **QRPh is not API-refundable** — primary docs are 404; verdict rests on search-cached PayMongo help text + independent Phase-5 corroboration | Gating Verdict | **HIGH** — an entire workstream (D-72) is built unnecessarily, incl. avoidable PH DPA exposure. **Settled by the documented probe.** |
| A2 | PayMongo's doc 404s reflect a site migration, not a capability change | Gating Verdict | Low — same probe settles it |
| A3 | A stable `Idempotency-Key` with a rotating `reference_number` is accepted on `/v2/batch_transfers` | InstaPay shape | MEDIUM — a rejected transfer surfaces loudly; verify in the same test session |
| A4 | Postgres `interval / integer` division works as expected in the D-96 expression | Expiry cap | Low — one query settles it; verify in the first task |
| A5 | No production booking rows exist where `space_price_cents = quoted_total_cents` is a wrong backfill | Finding 2 | Low — the service-fee concept did not exist before this phase |
| A6 | Drizzle `.values()` accepts a `sql` expression for a `timestamp` column | `units.ts` fix | Low — standard Drizzle; fails loudly at compile/run |
| A7 | `listing` has an index on `host_id` | Bookings Views | Low — performance only; verify with `\d listing` |
| A8 | Emit-after-commit's bounded gap is an acceptable v1 tradeoff vs. a transactional outbox | Inngest | MEDIUM — a rare missed notification; matches accepted precedent A6 (Phase 6) |
| A9 | Inngest 4.13.0's `onFailure` behaves as the (version-agnostic) docs describe | Inngest | Low — assert with a test that forces exhaustion |

---

## Open Questions (RESOLVED — planning, 2026-07-21)

All four were resolved by `/gsd-plan-phase 7`. Resolutions recorded inline below.

1. **Does the QRPh refund probe confirm or refute D-58?**
   - Known: PayMongo's help text says no; the API reference is silent; the pages are 404.
   - Unclear: current live behaviour.
   - **Recommendation: run the probe in the first wave. Sequence the D-72 tasks last so a refutation deletes work rather than rewriting it.**
   - **RESOLVED → Plan 07-16, Task 1** (`checkpoint:human-verify`, gate `blocking`), sequenced last in wave 5 so a refutation *deletes* the D-72 workstream rather than rewriting it. Task 2 then records the verdict and routes all refund dispatch through the single `refund-rail` predicate; Task 3 is Branch-B-only.

2. **Should the `payout_ledger_state` vocabulary be extended for debit rows?**
   - Known: `held|processing|paid|refunded|failed` were designed for transfers; a debit never transfers.
   - Recommendation: reuse `held` → `paid` with `kind` scoping. Adding an enum value is possible (a *new value on an existing type* needs the `0010`/`0012` two-migration split) but not worth it.
   - **RESOLVED → recommendation accepted.** Plan 07-01 Task 2 adds a new `ledger_kind` `CREATE TYPE` (not an `ALTER TYPE … ADD VALUE`, so no two-migration split needed); Plan 07-04 Task 1 scopes every ledger query by `kind`.

3. **Does the host-cancel auto-block (D-70) need to survive an un-block by the host?**
   - Known: `availability_block` rows are deleted to unblock; nothing marks a block as system-created.
   - Unclear: whether a host can simply delete the punitive block, defeating D-70's anti-resell purpose.
   - **Recommendation: add a `reason` value (the column exists, `schema.ts:365`) like `host_cancellation` and refuse deletion of those rows in the unblock action. Flagging because D-70's stated abuse vector is exactly this.** Worth a planner decision.
   - **RESOLVED → recommendation accepted.** Plan 07-11 Task 1 writes the auto-block with `reason = 'host_cancellation'`; `removeBlock` refuses to delete those rows. Plan 07-11 Task 3 tests both directions.

4. **Keyset vs offset pagination for "Load more" (D-106)?**
   - Recommendation: match Phase 4 unless it used `OFFSET`; prefer keyset for the unbounded Past tab.
   - **RESOLVED → keyset**, a recorded, deliberate divergence from Phase 4's `OFFSET` idiom (justified by the unbounded Past tab). Plan 07-06 Task 1 implements it; Task 3 tests cursor and malformed-cursor tolerance.

---

## Sources

### Primary (HIGH confidence)
- **Repository source, read directly** — `src/lib/paymongo.ts` (:200, :226, :266), `src/inngest/functions/payout-sweep.ts`, `payout-reconcile.ts`, `request-expiry.ts`, `src/inngest/client.ts`, `src/app/api/inngest/route.ts`, `src/lib/db/schema.ts` (:271-313, :331-340, :414-448), `src/lib/availability/units.ts` (:119, :255-264), `src/app/actions/host-requests.ts` (:145-200), `src/lib/payments/config.ts`, `src/lib/payments/commission.ts`, `src/lib/email.ts`, `drizzle/0005_booking_exclusion.sql`, `drizzle/0012_booking_exclusion_v2.sql`, `vitest.config.ts`, `package.json`
- `docs.paymongo.com/reference/refund-resource` — partial refunds, ₱1.00 min, refund statuses, settlement timing `[fetched 2026-07-21]`
- `docs.paymongo.com/docs/money-movement-moving-money-with-api` — `/v2/batch_transfers` shape, `provider` values, required destination fields, `receiving_institutions` `[fetched 2026-07-21]`
- `docs.paymongo.com/docs/payment-acceptance-qr-ph` — supported institutions, limits; **silent on refunds** `[fetched 2026-07-21]`
- `inngest.com/docs/reference/functions/handling-failures` — `onFailure`, `inngest/function.failed`, handler signature `[fetched 2026-07-21]`
- `inngest.com/docs/guides/handling-idempotency` — 24h dedupe window and its bypasses `[fetched 2026-07-21]`
- `.planning/phases/05-payments-payouts/05-RESEARCH.md` § Pitfall 1, `05-PATTERNS.md` § Pitfall 4, `05-04-SUMMARY.md` — independent Phase-5 corroboration

### Secondary (MEDIUM confidence)
- PayMongo help-center refund content, recovered via **three independent search-engine queries** returning identical verbatim text; the source pages now 404 (`paymongo.help/en/articles/11904095`, `.../8478600`, `docs.paymongo.com/docs/refunding-transactions`, `.../qr-ph-1`, `.../refund-errors`)

### Tertiary (LOW confidence — flagged, not relied upon)
- Third-party PayMongo integration guides (flexicommerce, gcashresource) — used only as weak corroboration of the refundable-rail set; **no claim in this document rests on them alone**

---

## Metadata

**Confidence breakdown:**
- **QRPh gating verdict:** MEDIUM-HIGH — three independent corroborations of identical help-center text + independent Phase-5 research + shipped/tested code, but every primary page is 404. **A concrete settling probe is specified and should be run.**
- **InstaPay transfer shape:** HIGH for the request shape and required fields (fetched from live docs); MEDIUM for the idempotency/reference-number interaction (A3).
- **Repo findings (1, 2, 3 + EXCLUDE audit + fix sites):** HIGH — every claim read directly from source with file:line.
- **Inngest patterns:** HIGH — `onFailure` and idempotency semantics fetched from live docs; the 2-arg API form verified against installed version + existing code.
- **Schema recommendations:** MEDIUM-HIGH — grounded in established repo idioms; the `UNIQUE(booking_id, kind)` migration is the least-certain piece.
- **Expiry-cap SQL:** MEDIUM-HIGH — the `LEAST`/`GREATEST`/`make_interval` composition is standard, but `interval / integer` (A4) should be verified with one query.
- **Views / pagination / indexes:** MEDIUM — largely clone-work; `listing.host_id` index unverified (A7).

**Research date:** 2026-07-21
**Valid until:** 2026-08-20 (30 days) — **except** the QRPh verdict, which should be re-probed if planning slips past **2026-08-04**, since PayMongo's documentation is actively in flux (a mid-migration doc set is exactly when vendor behaviour claims go stale).
