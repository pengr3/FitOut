# Phase 25: Finalize PayMongo Production Payments - Pattern Map

**Mapped:** 2026-09-18  
**Files analyzed:** 7 operational/code-change candidates  
**Analogs found:** 6 / 7

## Scope Boundary

This is primarily a gated production-enablement phase. Research identifies no required replacement payment implementation, dependency, or schema change. Do not record credentials, wallet identifiers, provider approvals, rollout cohorts, or customer/host policy as a code artifact. Those remain authorized human/provider checkpoints.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/paymongo.ts` (only if provider evidence exposes a concrete defect) | service | request-response | `src/lib/paymongo.ts` | exact-existing |
| `src/app/api/paymongo/webhook/route.ts` (only if actual subscribed payload differs) | route | request-response | `src/app/api/paymongo/webhook/route.ts` | exact-existing |
| `src/lib/payments/confirm-booking-payment.ts` (only if a proven payable state needs widening) | service | CRUD | `src/lib/payments/confirm-booking-payment.ts` | exact-existing |
| `src/inngest/functions/payment-reconcile.ts` (only if observed recovery defect) | service | batch | `src/inngest/functions/payment-reconcile.ts` | exact-existing |
| `src/inngest/functions/payout-reconcile.ts` (only if observed transfer-status drift) | service | batch | `src/inngest/functions/payout-reconcile.ts` | exact-existing |
| `src/app/api/inngest/route.ts` (only if registered-function evidence exposes a defect) | route | request-response | `src/app/api/inngest/route.ts` | exact-existing |
| Production payment runbook/evidence record (path deliberately undecided) | documentation | event-driven | No tracked runbook analog | none |

All named source analogs are tracked (`git ls-files` verified). The planner should keep source edits conditional on evidence; the default plan is configuration, controlled-provider proof, and captured evidence rather than code churn.

## Pattern Assignments

### `src/lib/paymongo.ts` (service, request-response)

**Analog:** `src/lib/paymongo.ts` (tracked)

**Imports and production guard** (lines 20-35):

```ts
import { randomUUID } from "node:crypto";

const isVercelPreview = process.env.VERCEL_ENV === "preview";
if (!process.env.PAYMONGO_SECRET_KEY && process.env.NODE_ENV === "production" && !isVercelPreview) {
  throw new Error("PAYMONGO_SECRET_KEY is not set. Refusing to boot in production without the PayMongo secret key. ...");
}
```

**HTTP/auth/idempotency/error pattern** (lines 93-121):

```ts
const headers: Record<string, string> = {
  Authorization: authHeader(),
  "Content-Type": "application/json",
  Accept: "application/json",
};
if (method === "POST") headers["Idempotency-Key"] = init.idempotencyKey ?? randomUUID();
const res = await fetch(`${PAYMONGO_BASE}${path}`, { method, headers, body: init.body !== undefined ? JSON.stringify(init.body) : undefined, signal: init.signal });
const text = await res.text();
const json = text ? (JSON.parse(text) as unknown) : {};
if (!res.ok) throw new Error(`PayMongo ${method} ${path} failed (${res.status}): ${detail}`);
```

**Safety rule:** use fully versioned provider paths and retain fail-closed production/credential-free Preview behavior. Checkout creation is not made safe by its POST key alone; the lease plus retire-before-create controls it (lines 194-202).

### `src/app/api/paymongo/webhook/route.ts` (route, request-response)

**Analog:** `src/app/api/paymongo/webhook/route.ts` (tracked)

**Imports/runtime/secret guard** (lines 24-47):

```ts
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, ne } from "drizzle-orm";
...
export const runtime = "nodejs";
if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview" && !process.env.PAYMONGO_WEBHOOK_SECRET) {
  throw new Error("PAYMONGO_WEBHOOK_SECRET is required in production ...");
}
```

**Raw-body verification and clean failure** (lines 230-258):

```ts
const rawBody = await req.text();
let verified = false;
try {
  const sig = parseSignature(req.headers.get("paymongo-signature"));
  if (sig && secret) verified = verifySignature(rawBody, sig, secret);
} catch { verified = false; }
if (!verified) return new Response("Invalid signature", { status: 400 });
try { event = JSON.parse(rawBody) as PayMongoEvent; } catch { return new Response("Invalid payload", { status: 400 }); }
```

**Deduplicate → one confirmation writer → acknowledge** (lines 261-323):

```ts
const seen = await db.select({ id: paymongoEvent.id }).from(paymongoEvent).where(eq(paymongoEvent.id, eventId));
if (seen.length > 0) return new Response("ok", { status: 200 });
...
await confirmPaidBooking({ bookingId, paymentId, paymentMethod });
await db.insert(paymongoEvent).values({ id: eventId, type }).onConflictDoNothing();
return new Response("ok", { status: 200 });
```

**Do not copy differently:** no browser-return confirmation, JSON parsing before HMAC, or second `confirmed` writer. Preserve the pre-parse raw bytes and 200 ACK for a verified handled delivery.

### `src/lib/payments/confirm-booking-payment.ts` (service, CRUD)

**Analog:** `src/lib/payments/confirm-booking-payment.ts` (tracked)

**Core pattern:** this remains the only `pending|approved → confirmed` database transition. Research verified its status-scoped single writer at lines 307-347. Both webhook and reconciliation provide provider-derived booking/payment/rail facts to this function; neither writes booking confirmation itself.

**Test analog:** `tests/payments/confirm-idempotency.test.ts` (tracked), lines 227-320. It seeds a pending booking, asserts sequential re-entry gives `confirmed` then `already-confirmed`, and uses two independent DB connections to assert exactly one winner and one notification.

### `src/inngest/functions/payment-reconcile.ts` (service, batch)

**Analog:** `src/inngest/functions/payment-reconcile.ts` (tracked)

**Core pattern:** retain the registered bounded reconciliation job as the missed-webhook recovery path; research verifies it calls the existing confirmation writer and is registered at `src/app/api/inngest/route.ts:103-105`. Any production validation must prove registration/execution, not introduce a parallel timer or browser confirmation path.

### `src/inngest/functions/payout-reconcile.ts` (service, batch)

**Analog:** `src/inngest/functions/payout-reconcile.ts` (tracked)

**Core state pattern:** preserve the durable processing-only poll. The status allow-lists at lines 60-70 map `succeeded|completed|paid` to `paid`, `failed|returned|cancelled` to `failed`, and leave unrecognised provider statuses processing. Do not infer terminal state from a successful transfer request.

### `src/app/api/inngest/route.ts` (route, request-response)

**Analog:** `src/app/api/inngest/route.ts` (tracked)

**Registration pattern** (lines 100-105):

```ts
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    payoutSweep,
    payoutReconcile,
    paymentReconcile,
  ],
});
```

Treat production Inngest discovery/synchronization and signed-key configuration as operational evidence. Do not add an unregistered worker or duplicate schedule.

### Webhook integration tests (test, request-response)

**Analog:** `tests/paymongo/webhook-signature.test.ts` (tracked)

**Isolated-handler test pattern** (lines 50-75):

```ts
testDb = await setupTestDb();
process.env.PAYMONGO_WEBHOOK_SECRET = SECRET;
vi.doMock("@/lib/db", () => ({ db: testDb.db }));
vi.resetModules();
({ POST } = await import("@/app/api/paymongo/webhook/route"));
```

It creates a real `Request` with the raw signed body (lines 69-75), then asserts invalid signatures return 400 and duplicate event IDs receive 200 with exactly one ledger row (lines 78-129). Extend only if provider evidence shows a different payload shape; do not use a forged production payload as UAT.

## Shared Patterns

### Production/Preview secret boundary

**Sources:** `src/lib/paymongo.ts:26-35`, `src/app/api/paymongo/webhook/route.ts:34-47`  
**Apply to:** any proven payment boundary change.

Production fails at startup without its required secret; Vercel Preview remains credential-free and payment calls fail before a provider request. Verify secret presence/scope in the authorized deployment console without reading or writing its values into tracked files.

### Provider evidence and at-most-once transitions

**Sources:** `src/app/api/paymongo/webhook/route.ts:261-323`; `src/lib/payments/confirm-booking-payment.ts:307-347`; `tests/payments/confirm-idempotency.test.ts:257-320`  
**Apply to:** paid checkout and missed-delivery validation.

Use signed webhook data or server-side provider probes; persist dedupe IDs and make the booking update status-scoped. A browser redirect is presentation only.

### Fail-closed money routing

**Source:** `src/lib/payments/refund-rail.ts:42-53`

```ts
export const REFUNDABLE_RAILS: ReadonlySet<string> = new Set(["card", "gcash", "grab_pay", "paymaya"]);
export function isApiRefundable(rail: string | null | undefined): boolean {
  return rail != null && REFUNDABLE_RAILS.has(rail);
}
```

Unknown rails, including QRPh, must route to owned manual handling rather than an assumed API refund.

### Existing validation, no new framework

**Sources:** `25-VALIDATION.md`; `tests/paymongo/webhook-signature.test.ts`; `tests/payments/confirm-idempotency.test.ts`  
**Apply to:** any evidence-triggered code fix.

Run scoped ESLint and the exact existing payment tests. DB-backed suites require restored Docker/Postgres and `fitout_test`; a live controlled transaction, signed delivery, Inngest registration, and runbook walkthrough remain manual/provider gates.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Production payment runbook/evidence record | documentation | event-driven | No tracked operational runbook exists. Create its location/content only after the account owner establishes the decisions it must record; never include secrets. |

## Metadata

**Analog search scope:** `src/lib`, `src/app/api`, `src/inngest/functions`, `tests/paymongo`, `tests/payments`, tracked docs/planning artifacts  
**Files scanned:** 11 tracked source/test analogs plus required phase artifacts  
**Pattern extraction date:** 2026-09-18
