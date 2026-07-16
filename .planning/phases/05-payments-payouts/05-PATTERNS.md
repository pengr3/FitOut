# Phase 5: Payments & Payouts - Pattern Map

**Mapped:** 2026-07-16
**Files analyzed:** 18 (5 modified, 8 new source, 1 migration, ~9 test/harness)
**Analogs found:** 15 / 18 (2 self-extends, 1 genuinely new — Inngest)

> This codebase is unusually well-prepared for Phase 5. Almost every cross-cutting concern (auth gate,
> PayMongo fetch idiom, webhook signature + idempotency, frozen price, integer-cents money, SQLSTATE
> error mapping, drizzle migration) already exists from Phases 1–4. The planner should treat most of
> Phase 5 as **extend-in-place** against these analogs, not greenfield. The **one** file with no analog
> is the Inngest runner (first async-scheduled job in the repo).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/paymongo.ts` (EXTEND) | utility (REST client) | request-response (external API) | itself — `createLinkedAccount`/`createOnboardingLink` | exact (self-extend) |
| `src/lib/payments/commission.ts` (NEW) | utility (pure calc) | transform | `src/lib/booking/pricing.ts` (`quoteWindow`) | exact |
| `src/lib/payments/config.ts` (NEW) | config | — | `HOLD_TTL_MINUTES` in `units.ts`; `DISPLAY_CURRENCY` in `money.ts` | role-match |
| `src/lib/db/schema.ts` (MODIFY — add `host_payout_ledger`, `booking.payment_id`, reconcile `listing.currency`) | model | CRUD | existing `hostPayout` / `booking` / `paymongoEvent` tables | exact |
| `drizzle/0008_*.sql` (NEW migration) | migration | — | `drizzle/0006_booking_hold.sql` + `0003_paymongo_event.sql` | exact |
| `src/inngest/client.ts` (NEW) | provider | event-driven | **none** (first async runner) | no analog |
| `src/inngest/functions/payout-sweep.ts` (NEW) | service (scheduled job) | batch / event-driven | `units.ts` sweep-query + `createPendingHold` tx idempotency | partial |
| `src/app/api/inngest/route.ts` (NEW) | route (handler mount) | request-response | `src/app/api/paymongo/webhook/route.ts` (route-handler shell) | role-match |
| `src/app/api/paymongo/webhook/route.ts` (EXTEND — `checkout_session.payment.paid` + refund) | route / webhook | event-driven | itself (existing `switch` on event type) | exact (self-extend) |
| `src/app/api/paymongo/payout-callback/route.ts` (NEW, optional) | route / webhook | event-driven | `webhook/route.ts` (verify → act) | role-match |
| `src/app/actions/booking.ts` (MODIFY — retire sync flip, create checkout, extend hold) | controller (server action) | request-response | itself (`confirmBooking`) + `paymongo-connect.ts` | exact |
| `src/app/(host)/host/earnings/page.tsx` (NEW — HOST-03) | component (RSC page) | CRUD (owner-gated read) | `(host)/host/listings/page.tsx` + `bookings/[id]/page.tsx` | exact |
| `src/components/booking/reserve-actions.tsx` (MODIFY — "Confirm & pay") | component (client) | request-response | itself | exact (self) |
| `src/app/bookings/[id]/page.tsx` (MODIFY — "finalizing…" pending-payment state) | component (RSC) | request-response | itself (already redirects `pending` → reserve) | exact (self) |
| `src/components/booking/price-breakdown.tsx` (reference — host commission line on HOST-03) | component | transform / display | itself (RESERVED fee slot) | exact (self) |
| `tests/payments/*.test.ts` (NEW — commission, checkout, ledger, sweep, race, earnings) | test | — | `tests/paymongo/webhook-merchant-activated.test.ts` + `tests/booking/*` | role-match |
| `tests/paymongo/webhook-payment-paid.test.ts` / `webhook-refund.test.ts` (NEW) | test | — | `tests/paymongo/webhook-merchant-activated.test.ts` | exact |
| `tests/helpers/mocks.ts` (EXTEND `mockPayMongo`) | test harness | — | itself | exact (self) |

---

## Pattern Assignments

### `src/lib/paymongo.ts` — EXTEND (utility, request-response)

**Analog:** itself — `paymongoFetch<T>()` + `createLinkedAccount`/`createOnboardingLink`.

**The fetch idiom to reuse verbatim** (lines 44–75) — Basic auth, `Idempotency-Key` on POST, throw-on-non-2xx surfacing the first PayMongo error detail. New calls (`createCheckoutSession`, `createBatchTransfer`, `createRefund`, `listWalletAccounts`) all wrap this same helper (lines 86–130 are the exact template).

**Pitfall 3 — the `/v1` vs `/v2` base.** The wrapper hardcodes the base at line 21:
```typescript
const PAYMONGO_BASE = "https://api.paymongo.com/v1";  // line 21
```
Checkout Sessions + refunds are `/v1`; **batch transfers + wallets are `/v2`**. A naive `/v2` call hits `/v1/v2/...`. Refactor to `PAYMONGO_BASE = "https://api.paymongo.com"` and pass versioned paths (`/v1/checkout_sessions`, `/v2/batch_transfers`), OR add a per-call base override. Keep the Idempotency-Key + fail-closed behavior (lines 24–29, 55–58) unchanged.

**Idempotency-Key convention** (lines 55–58, and keyed examples at 93 / 117): pass a stable key per new call — `checkout:<bookingId>`, `payout:<bookingId>`, `refund:<paymentId>` — so a retry/double-click can't duplicate a charge/transfer/refund.

**Fail-closed prod boot** (lines 24–29): extend the guard to any new *required-in-prod* identifiers the transfer needs (platform wallet number/BIC), same throw-at-module-load shape.

---

### `src/lib/payments/commission.ts` — NEW (utility, transform)

**Analog:** `src/lib/booking/pricing.ts` — `quoteWindow` (lines 55–69).

Copy the **pure, isomorphic, no-I/O, integer-cents** shape exactly: no `"use client"`/`"use server"`, throws rather than silently producing a wrong number, returns a small typed result object.

**`quoteWindow` shape to mirror** (pricing.ts lines 55–69):
```typescript
export function quoteWindow(input: QuoteInput): Quote {
  const { fullDay, hourlyRateCents, dayRateCents } = input;
  const hours = windowHours(input.startUtc, input.endUtc);
  let totalCents: number;
  // ... integer math only; throws if a required rate is null (never a $0 charge) ...
  return { totalCents, currency: DISPLAY_CURRENCY, hours, fullDay };
}
```

**`computeCommission` contract** (Research Pitfall 5, D-51/D-52): `commissionCents = Math.round(gross * rateBps / 10000)`; `netCents = gross - commissionCents`; return `{ rateBps, commissionCents, netCents }`. The platform absorbs the gateway fee → transfer **exactly `netCents`**, never reduce it further (D-52). Read `rateBps` from `payments/config.ts`, never a literal.

---

### `src/lib/payments/config.ts` — NEW (config)

**Analog:** the exported-constant idiom — `HOLD_TTL_MINUTES` (`units.ts` lines 115–117) and `DISPLAY_CURRENCY` (`money.ts` line 12).

**`HOLD_TTL_MINUTES` pattern to mirror** (units.ts 115–117):
```typescript
/** Hold TTL (D-47): 15 minutes, platform-wide and config-tunable. */
export const HOLD_TTL_MINUTES = 15;
const HOLD_TTL_MS = HOLD_TTL_MINUTES * 60 * 1000;
```
New exports: `COMMISSION_RATE_BPS` (1000 = 10%, D-51), `PAYOUT_DELAY_HOURS` (24, D-55), `PAYMENT_WINDOW_MINUTES` (D-58 extend-hold). Values may read `process.env` with a documented default (config-tunable, not hardcoded) — but keep the tunable *name* the single source, exactly as `HOLD_TTL_MINUTES` is imported wherever the TTL is needed.

---

### `src/lib/db/schema.ts` — MODIFY (model, CRUD)

**Analog:** the hand-authored Phase-2/3/4 tables in the same file — `hostPayout` (243–256), `paymongoEvent` (261–265), `booking` (333–362).

**`paymongoEvent` — the ledger idiom** (261–265) closest to `host_payout_ledger`: a small hand-authored table (not Better-Auth), `text` PK, `timestamptz` timestamps, comment explaining the idempotency role.

**`booking` money/lifecycle columns to mirror** (346–353) for the new ledger's `gross_cents` / `commission_cents` / `net_cents`:
```typescript
status: bookingStatus("status").default("confirmed").notNull(),
quotedTotalCents: integer("quoted_total_cents"), // integer minor units (Pitfall 5)
currency: text("currency").default("php").notNull(), // D-46
```

**`host_payout_ledger` (new) — required shape** (Research Pattern 3, D-51/D-59): `id` PK, `booking_id` **`.unique()`** (the at-most-once gate), `host_id`, `payment_id`, `gross_cents`, `commission_rate_bps`, `commission_cents`, `net_cents`, `currency`, `state` (`held|processing|paid|refunded|failed` — mirror the `bookingStatus` `pgEnum` idiom at 277–283), transfer id, `timestamptz` timestamps. The `UNIQUE(booking_id)` is the DB-enforced idempotency (same philosophy as `booking_idem_uq`, line 360).

**`booking.payment_id` (new column)** — capture the PayMongo `pay_...` at confirm so a later refund can reference it (Runtime State Inventory). Nullable ADD COLUMN (no backfill), same as the Phase-4 hold columns.

**Currency-default drift to reconcile** (line 179): `listing.currency` still defaults `'usd'` while `booking.currency` is `'php'` (line 351). Reconcile `listing.currency` default → `'php'` (D-46 deferred item) so charge currency is consistent end-to-end. This is a hand-edited migration `ALTER COLUMN ... SET DEFAULT`.

> **EXCLUDE caveat (still true):** Drizzle cannot express the GiST EXCLUDE (schema comment 325–332). The `host_payout_ledger` needs no EXCLUDE — its `UNIQUE(booking_id)` IS Drizzle-expressible — but the sweep still relies on the existing `booking_no_overlap` EXCLUDE for the payment-race (D-58).

---

### `drizzle/0008_*.sql` — NEW migration

**Analog:** `drizzle/0006_booking_hold.sql` (ADD COLUMN idiom) + `drizzle/0003_paymongo_event.sql` (CREATE TABLE idiom).

**ADD COLUMN idiom** (0006, verbatim shape):
```sql
ALTER TABLE "booking" ADD COLUMN "quoted_total_cents" integer;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "currency" text DEFAULT 'php' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_idem_uq" ON "booking" USING btree ("idempotency_key") WHERE idempotency_key IS NOT NULL;
```

**CREATE TABLE idiom** (0003):
```sql
CREATE TABLE "paymongo_event" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

**Workflow:** `npm run db:generate` (drizzle-kit) then **hand-edit** the SQL where drizzle-kit can't express intent (the `listing.currency` default change may generate cleanly; a `UNIQUE(booking_id)` on the ledger does too via `.unique()`). Add `booking.payment_id`, the `host_payout_ledger` table, and the `listing.currency` default change in this migration. `--> statement-breakpoint` between statements.

---

### `src/inngest/client.ts` + `src/inngest/functions/payout-sweep.ts` — NEW (provider + scheduled service)

**Analog:** ⚠️ **none for the runner** — first async-scheduled job in the repo (see "No Analog Found"). But two *sub-patterns* are directly reusable inside the sweep:

**Sweep query — mirror the lazy-expiry / DB-clock discipline** from `units.ts` `pickLowestFreeUnit` (171–184): use the **DB clock** (`now()`), never an injectable JS clock, and raw `sql`` `.execute()` for the join. The Research Pattern-4 sweep query joins `booking → listing → host_payout LEFT JOIN host_payout_ledger`, `WHERE status='confirmed' AND ends_at + interval ≤ now() AND ledger.id IS NULL`.

**At-most-once claim — mirror `createPendingHold`'s "the INSERT is the lock"** (units.ts 234–252, and the schema `booking_idem_uq` philosophy): `INSERT INTO host_payout_ledger (...) ON CONFLICT (booking_id) DO NOTHING RETURNING id` — empty RETURNING ⇒ another sweep owns it ⇒ skip. **No app-level "already paid?" query-then-insert** (the exact race the EXCLUDE constraint exists to kill — anti-pattern called out in both `units.ts` header and Research).

**Transfer call** → `paymongo.createBatchTransfer` (new, `/v2`) with `Idempotency-Key: payout:<bookingId>` and stable `reference_number`.

**Client shape** (Research Standard Stack): `new Inngest({ id: "fitout" })`; cron `{ cron: "TZ=Asia/Manila 0 * * * *" }`, `concurrency: 1` (singleton). Install `inngest@4.13.0` (verify `npm view inngest version` at plan time).

---

### `src/app/api/inngest/route.ts` — NEW (route handler mount)

**Analog:** `src/app/api/paymongo/webhook/route.ts` — the App-Router route-handler shell (`export const runtime = "nodejs"`, exported HTTP-method handlers).

Mount Inngest's `serve({ client, functions })` and re-export its `GET/POST/PUT`. Keep `runtime = "nodejs"` (line 19 of the webhook route is the precedent — node crypto / non-edge).

---

### `src/app/api/paymongo/webhook/route.ts` — EXTEND (route / webhook, event-driven)

**Analog:** itself. The whole route (72–134) is the single-writer, signature-verified, `paymongo_event`-deduped switch that new event handlers slot straight into. **Preserve single-writer** — D-57 makes this the ONLY writer of `booking → confirmed` on payment.

**Signature verify — do NOT touch** (37–64): constant-time dual test/live digest over the RAW body, RangeError-guarded. Reuse as-is.

**RAW-body + verify + dedupe skeleton to extend** (72–110):
```typescript
const rawBody = await req.text();               // never req.json() first (T-06-SPOOF)
// ... verifySignature(rawBody, sig, secret) → 400 on any failure ...
const seen = await db.select({ id: paymongoEvent.id })
  .from(paymongoEvent).where(eq(paymongoEvent.id, eventId));
if (seen.length > 0) return new Response("ok", { status: 200 });  // replay → 200 no-op
```

**Derive-from-verified-type discipline** (112–129, and its test at `webhook-merchant-activated.test.ts` 186–207): the state flag is derived from `event.data.attributes.type`, **never** a client body field. New `checkout_session.payment.paid` / `payment.refunded` / `payment.refund.updated` handlers follow the same `if (type === ...)` shape.

**The new `checkout_session.payment.paid` handler** (Research Pattern 2, ⚠️ assert nesting A1 against a captured test event): extract `bookingId = event.data.attributes.data.attributes.reference_number` and `paymentId = ...payments[0].id`; flip atomically:
```sql
UPDATE booking SET status='confirmed', expires_at=NULL
WHERE id=${bookingId} AND status='pending' RETURNING id
```
**Pitfall 4 — do NOT re-impose the Phase-4 `expires_at > now()` guard here.** The Phase-4 `confirmBooking` UPDATE (booking.ts 164–168) guards `AND expires_at > now()`; the webhook must confirm on `status='pending'` alone (payment is the authority, D-57). `rows==0` ⇒ slot genuinely gone ⇒ D-58 auto-refund backstop (branch on payment method — QRPh unrefundable → operator alert, Pitfall 1).

**Mark processed** (132): `db.insert(paymongoEvent).values({ id, type }).onConflictDoNothing()` then 200 — unchanged.

---

### `src/app/actions/booking.ts` — MODIFY `confirmBooking` (controller / server action, request-response)

**Analog:** itself (`confirmBooking`, 139–186) + `paymongo-connect.ts` (a server action that calls `paymongo.ts`).

**The exact seam** (booking.ts 134–138, the comment marks it): `confirmBooking` is *"the Phase-5 payment seam; NO charge here"*. D-57 **retires the synchronous `pending→confirmed` UPDATE** (164–168) and replaces it with: (1) owner-gate load (147–153, keep verbatim), (2) EXTEND `booking.expiresAt` → `now() + PAYMENT_WINDOW` (D-58 anti-race), (3) `paymongo.createCheckoutSession({ amount: booking.quotedTotalCents, ... })`, (4) `redirect(checkout_url)`. The flip now happens in the webhook.

**Owner-gate to keep** (147–153):
```typescript
const [bk] = await db.select({ bookerId: booking.bookerId, status: booking.status })
  .from(booking).where(eq(booking.id, holdId));
if (!bk || bk.bookerId !== userId) return { ok: false, reason: "denied", error: "We can't show this booking." };
```

**Server-action-calls-PayMongo pattern** (`paymongo-connect.ts` 89–129): session-gate → **rate-limit + `recordAudit`** (money-adjacent, WR-06) → call `paymongo.ts` in a `try/catch` that returns a calm retryable error (never leaks secret/PII). Reuse this exact structure for the checkout-create path. Charge **`booking.quotedTotalCents`** server-frozen (D-49) — never a client number.

**Idempotency backstop preserved** (D-42): the already-`confirmed` short-circuit (155–158) still applies — a re-entry of a paid booking is a no-op success.

---

### `src/app/(host)/host/earnings/page.tsx` — NEW (component, RSC, owner-gated CRUD read)

**Analog:** `(host)/host/listings/page.tsx` (RSC gate + query + grid) and `bookings/[id]/page.tsx` (owner-gated money display).

**RSC session + canHost gate to copy** (`host/listings/page.tsx` 23–34):
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) redirect("/login");
const u = session.user as typeof session.user & { canHost?: boolean };
if (!u.canHost) redirect("/");
```
⚠️ The route group is **not** the gate — owner-gate the ledger read by `host_id === session.user.id` (Security V4), exactly as `bookings/[id]/page.tsx` owner-gates by `bookerId` (64) and `host/listings/page.tsx` filters `hostId` (39).

**Money display** — reuse `formatMoney(cents, currency)` (`money.ts` 14–25); the confirmation page (`bookings/[id]` 145–150) is the reference for a `gross → net` money row. **Unlike the booker breakdown**, HOST-03 SHOWS the commission line (D-59, Pitfall 6) — the `gross → −10% → net` rows appear here, not on `price-breakdown.tsx`.

**Status vocabulary** — mirror the pure `derivePayoutStatus` derivation idiom (`components/host/payout-status.ts` 11–21) for the per-booking `Held → Processing → Paid / Refunded` state (Peerspace's `scheduled → processing → paid`, D-59). Keep the derivation in a **non-`"use client"`** module so the RSC can call it (that file's header documents why — a client module's export crashes when invoked server-side).

---

### `src/components/booking/reserve-actions.tsx` — MODIFY "Confirm & pay" (component, client)

**Analog:** itself (18–60). The pending-disable double-click guard (26–44) stays. D-57 changes the label to **"Confirm & pay"** and removes the *"You won't be charged yet."* line (57). `confirmBooking` now `redirect()`s to the PayMongo `checkout_url` (external), so the existing redirect-on-success assumption (34–37: "on success confirmBooking redirects, this component unmounts") already holds.

### `src/app/bookings/[id]/page.tsx` — MODIFY pending-payment state (RSC)

**Analog:** itself. Today a `pending` own hold redirects back to reserve (68). D-57 adds a brief **"payment received, finalizing…"** state on return from PayMongo (`?paid=1` UX signal ONLY — the webhook is truth). Reuse the same owner-gate (44–69) and money display; render the finalizing interstitial instead of asserting "Booking confirmed" until `status='confirmed'`.

---

## Shared Patterns

### PayMongo REST call (Basic auth + Idempotency-Key + throw)
**Source:** `src/lib/paymongo.ts` lines 44–75 (`paymongoFetch`), 86–97 (a keyed call).
**Apply to:** every new `paymongo.ts` call (checkout / transfer / refund / wallet).
```typescript
async function paymongoFetch<T>(path: string, init: FetchInit = {}): Promise<T> {
  const headers: Record<string, string> = { Authorization: authHeader(), "Content-Type": "application/json", Accept: "application/json" };
  if (method === "POST") headers["Idempotency-Key"] = init.idempotencyKey ?? randomUUID();
  const res = await fetch(`${PAYMONGO_BASE}${path}`, { method, headers, body: ... });
  if (!res.ok) throw new Error(`PayMongo ${method} ${path} failed (${res.status}): ${detail}`);
  return json as T;
}
```

### Webhook: verify → dedupe → derive-from-type → single writer
**Source:** `src/app/api/paymongo/webhook/route.ts` lines 72–134.
**Apply to:** the extended webhook handlers + (if built) the payout-callback route.
- RAW body (74) — never `req.json()` first.
- Constant-time dual-digest verify (37–64) — reuse, never re-roll (Research "Don't Hand-Roll").
- `paymongo_event` replay skip → 200 (104–110).
- State derived from verified `type`, never a client field (112–129).

### Integer-cents money + shared formatter
**Source:** `src/lib/money.ts` `formatMoney` (14–25); schema `integer("..._cents")` (e.g. booking.ts 350).
**Apply to:** commission math, ledger columns, HOST-03 display. `Math.round(gross * rateBps / 10000)`; never float; format at the edge only.

### SQLSTATE mapping (cause-walking) + calm conflict copy
**Source:** `src/lib/pg.ts` `isPgError` (13–21); `src/lib/availability/units.ts` `mapBookingError` (290–295).
**Apply to:** the checkout/refund/sweep paths — Drizzle wraps driver errors, so walk `.cause`; map known conflicts (23P01/40P01/23505) to calm results, re-throw the rest (never a raw 500).

### Fail-closed prod boot for required secrets
**Source:** `src/lib/paymongo.ts` lines 24–29 (throw-at-module-load when `NODE_ENV==="production"` and a key is missing).
**Apply to:** new required-in-prod values (`INNGEST_SIGNING_KEY`, platform wallet number/BIC). Dev/test/build tolerate placeholders.

### Money-adjacent server action: rate-limit + audit
**Source:** `src/app/actions/paymongo-connect.ts` lines 89–129; `src/lib/audit.ts` (`recordAudit`, 32–41).
**Apply to:** the checkout-create action (and any manual refund/payout trigger). Session-gate → `rateLimit('key:<userId>', { window, max })` → on denial `recordAudit({ actorId, action, outcome: 'denied', meta })` → `try/catch` returning a calm error that leaks no secret/PII.

### Owner-gate (route group is never the gate — Security V4)
**Source:** `bookings/[id]/page.tsx` 44–69; `host/listings/page.tsx` 23–39; `booking.ts` 147–153.
**Apply to:** the checkout-create action (booking.bookerId === session) and HOST-03 (ledger.host_id === session). Missing row and not-mine return the **same** calm/404 result.

### DB-clock time predicates (never an injectable JS clock)
**Source:** `units.ts` lazy-expiry probes use SQL `now()` (154–184).
**Apply to:** the T+24h sweep predicate (`ends_at + interval ≤ now()`) and the webhook flip.

---

## No Analog Found

Files with no close existing match (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/inngest/client.ts` | provider | event-driven | No background-job runner exists in the repo — Inngest is net-new (Research picked it, `inngest@4.13.0`). Use Research Standard Stack + `inngest.com/docs/guides/scheduled-functions`. |
| `src/inngest/functions/payout-sweep.ts` | service (cron) | batch | No scheduled/cron job precedent. **Partial** reuse only: the sweep query mirrors `units.ts` DB-clock discipline and the at-most-once claim mirrors `createPendingHold`'s "INSERT is the lock", but the durable-execution wrapper (steps, retries, singleton) has no analog — follow Research "Inngest cron sweep (skeleton)". |
| `src/app/api/paymongo/payout-callback/route.ts` | route / webhook | event-driven | Optional. Transfer status is **not** a standard webhook subscription event (Research Pitfall 2); if built, borrow the `webhook/route.ts` verify→act shell, but ⚠️ **the callback auth scheme may differ from `Paymongo-Signature`** (assumption A4) — Research recommends **polling `GET`** from an Inngest step for the money-critical `Processing → Paid` transition instead of trusting an unauthenticated callback. |

---

## Metadata

**Analog search scope:** `src/lib/`, `src/lib/db/`, `src/lib/booking/`, `src/lib/availability/`, `src/app/actions/`, `src/app/api/paymongo/`, `src/app/(host)/`, `src/app/bookings/`, `src/app/listings/[id]/book/`, `src/components/booking/`, `src/components/host/`, `drizzle/`, `tests/`.
**Files scanned:** ~24 source/test files read in full; `paymongo.ts`, `webhook/route.ts`, `booking.ts`, `units.ts`, `schema.ts`, `pg.ts`, `money.ts`, `pricing.ts`, `paymongo-connect.ts`, host + booking RSC pages, price-breakdown/reserve components, drizzle 0003/0006, mocks + webhook test harness, audit.
**Pattern extraction date:** 2026-07-16

**Cross-cutting notes for the planner:**
- Extend `tests/helpers/mocks.ts` `mockPayMongo` (174–201) with `createCheckoutSession`/`createBatchTransfer`/`createRefund`/`listWalletAccounts` stubs; the `signWebhook`/`badSignature` helpers already cover the new payment/refund webhook tests.
- New webhook tests copy the isolated-schema harness from `tests/paymongo/webhook-merchant-activated.test.ts` (25–102) verbatim — `setupTestDb`, `vi.doMock("@/lib/db")`, signed-body `post()`.
- `listing.currency` default `'usd'` (schema line 179) must be reconciled to `'php'` in the same migration as the ledger (deferred hygiene, D-46).
- The `booking_status` enum already carries an unused `completed` (schema 277–283); Research recommends **deriving** payout-eligibility from `confirmed + ends_at` rather than adding a `completed` transition — planner's call.
