---
phase: 05-payments-payouts
reviewed: 2026-07-16T14:03:38Z
depth: standard
files_reviewed: 39
files_reviewed_list:
  - drizzle/0008_payout_ledger.sql
  - src/app/(host)/host/earnings/page.tsx
  - src/app/(host)/host/layout.tsx
  - src/app/(host)/host/page.tsx
  - src/app/actions/booking.ts
  - src/app/api/inngest/route.ts
  - src/app/api/paymongo/webhook/route.ts
  - src/app/bookings/[id]/page.tsx
  - src/app/listings/[id]/book/page.tsx
  - src/components/booking/payment-reversed-state.tsx
  - src/components/booking/pending-payment-state.tsx
  - src/components/booking/price-breakdown.tsx
  - src/components/booking/reserve-actions.tsx
  - src/components/booking/reserve-view.tsx
  - src/components/host/payout-ledger-status.ts
  - src/components/host/payout-row.tsx
  - src/components/host/payout-state-badge.tsx
  - src/components/host/payout-summary.tsx
  - src/components/ui/table.tsx
  - src/inngest/client.ts
  - src/inngest/functions/payout-reconcile.ts
  - src/inngest/functions/payout-sweep.ts
  - src/lib/audit.ts
  - src/lib/db/schema.ts
  - src/lib/payments/commission.ts
  - src/lib/payments/config.ts
  - src/lib/paymongo.ts
  - tests/booking/state-machine.test.ts
  - tests/helpers/mocks.ts
  - tests/payments/checkout-create.test.ts
  - tests/payments/commission.test.ts
  - tests/payments/earnings-view.test.ts
  - tests/payments/ledger-freeze.test.ts
  - tests/payments/paymongo-calls.test.ts
  - tests/payments/payout-reconcile.test.ts
  - tests/payments/payout-sweep.test.ts
  - tests/paymongo/webhook-payment-paid.test.ts
  - tests/paymongo/webhook-refund.test.ts
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-07-16T14:03:38Z
**Depth:** standard
**Files Reviewed:** 39
**Status:** issues_found

## Summary

Phase 5 (Payments & Payouts) is, on the whole, carefully built: money is integer cents end-to-end, the commission math is pure and well-tested, charge integrity is server-frozen (`quotedTotalCents`, never a client value), the webhook is the single confirm authority with correct HMAC-SHA256 raw-body verification and event-id idempotency, and owner-scoping on the earnings page is enforced independently of the route group. The double-booking / at-most-once invariants rest on DB constraints (GiST EXCLUDE, `UNIQUE(booking_id)`), which is the right instinct.

The review found **one BLOCKER** and it is a money-correctness defect: the payout sweep **claims the ledger row before it has verified the wallet or fired the transfer**, and no code path ever re-examines a row left in `held`. Any error (or absent/deactivated wallet) after the claim strands the payout permanently — the host is silently never paid, and in the worst variant the transfer fires while the ledger stays `held`. The happy-path and single-shot tests pass, so this is invisible to the suite; it only manifests across sweep cycles / Inngest retries.

The WARNINGs cluster on refund robustness (the refund handler overwrites already-paid ledger rows and trusts an event *type* rather than the refund's actual status), a missing fail-closed boot guard for the webhook secret, an unretried "failed" payout, and a dangerous schema default. Details below.

## Critical Issues

### CR-01: Payout permanently stranded in `held` — claim-before-verify with no recovery path for `held` rows

**File:** `src/inngest/functions/payout-sweep.ts:93-143` (with `queryDuePayouts` at `:61-77` and reconcile at `src/inngest/functions/payout-reconcile.ts:65-73`)

**Issue:** `payOne` performs steps in this order:

1. `computeCommission(...)`
2. **Claim** the ledger row (`INSERT ... ON CONFLICT (booking_id) DO NOTHING RETURNING id`) — creates a row in state `held`.
3. `await listWalletAccounts()` — a network call to PayMongo that **can throw**.
4. Correlate the wallet; if none → return `skipped-no-wallet` (row stays `held`).
5. `try { createBatchTransfer(...); UPDATE ... state='processing' } catch { UPDATE ... state='failed' }`.

The claim in step 2 is committed immediately. But **nothing ever re-processes a `held` row**:

- `queryDuePayouts` excludes any booking that already has a ledger row (`LEFT JOIN host_payout_ledger p ... WHERE p.id IS NULL`), so once the `held` row exists the booking is never swept again.
- `queryProcessingLedger` (reconcile) selects only `state='processing' AND transfer_id IS NOT NULL`, so it never touches `held` rows.

Consequences, all silent and permanent:

- **`listWalletAccounts()` throws (step 3):** the throw propagates out of `payOne` (it is *not* wrapped in the try/catch, which only covers `createBatchTransfer`). Inngest retries the step; the retry hits `ON CONFLICT DO NOTHING` → empty RETURNING → `skipped-claimed` → fires nothing. Row is stuck `held` **with no operator alert at all**. Host is never paid.
- **No activated wallet (step 4):** the code comments call this "correct fail-closed," but because the `held` claim already exists, the host is *never* re-attempted even after they finish/reactivate onboarding. The single `console.error` at claim time is the only signal; there is no stuck-`held` reconcile alert.
- **Transfer fires but the `state='processing'` UPDATE throws (step 5):** money has actually moved, but the ledger stays `held` (money moved, ledger wrong), never reconciled — it shows as an "Upcoming payout" on the host earnings page forever.

Tests miss this because `payout-sweep.test.ts` runs each `payOne` once; the "no-wallet leaves the money Held" test actually *enshrines* the strand as expected behavior.

**Fix:** Do not let a `held` row become a dead end. Either resolve+verify the wallet *before* claiming, or make any post-claim failure recoverable. Minimal shape:

```ts
export async function payOne(dbConn: DbConn, b: DuePayout): Promise<PayOneResult> {
  const { rateBps, commissionCents, netCents } = computeCommission(b.quotedTotalCents);

  // (2) claim first (still the at-most-once lock)
  const claimId = randomUUID();
  const claimed = /* INSERT ... ON CONFLICT DO NOTHING RETURNING id */;
  if (claimed.length === 0) return { status: "skipped-claimed" };

  try {
    // (3) wallet lookup INSIDE the guarded block so a throw can't leave a silent `held` row
    const wallets = (await listWalletAccounts()).filter((w) => w.status === "activated");
    const wallet = wallets.find((w) => w.id === b.paymongoAccountId);
    if (!wallet) {
      // roll the claim back so the NEXT sweep retries once the wallet activates
      await dbConn.execute(sql`DELETE FROM host_payout_ledger
        WHERE booking_id = ${b.bookingId} AND state = 'held' AND transfer_id IS NULL`);
      console.error("[payout-alert] no activated wallet for host", { bookingId: b.bookingId, paymongoAccountId: b.paymongoAccountId });
      return { status: "skipped-no-wallet" };
    }
    const transfer = await createBatchTransfer({ /* ... */ });
    await dbConn.execute(sql`UPDATE host_payout_ledger
      SET state='processing', transfer_id=${transfer.transferId}, updated_at=now()
      WHERE booking_id=${b.bookingId}`);
    return { status: "paid", transferId: transfer.transferId, netCents };
  } catch (err) {
    // ANY post-claim failure (wallet lookup OR transfer) → mark `failed` (alerted + surfaced), never silent `held`
    await dbConn.execute(sql`UPDATE host_payout_ledger SET state='failed', updated_at=now()
      WHERE booking_id=${b.bookingId} AND state='held'`);
    console.error("[payout-alert] payout attempt failed", { bookingId: b.bookingId, error: err instanceof Error ? err.message : String(err) });
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}
```

Also add a stuck-`held` operator alert to the reconcile pass (mirroring the stuck-`processing` alert) so no ledger row can silently sit un-paid.

## Warnings

### WR-01: Refund webhook overwrites already-`processing`/`paid` ledger rows with `refunded`

**File:** `src/app/api/paymongo/webhook/route.ts:188-191`

**Issue:** `handleRefund` flips **any** ledger row whose state is not already `refunded`:

```ts
.set({ state: "refunded" })
.where(and(eq(hostPayoutLedger.paymentId, paymentId), ne(hostPayoutLedger.state, "refunded")));
```

The design assumes refunds only ever occur pre-payout (hold-until-session), but nothing enforces that. A refund that arrives after the payout already fired — a late/manual dashboard refund, a dispute, or a chargeback — will silently rewrite a `processing` or `paid` row to `refunded`. That erases the record that the host *was already paid* and triggers no clawback: the platform now believes "no payout" while real money is sitting in the host's wallet. It also makes the host's earnings page understate what they received.

**Fix:** Restrict the pre-payout refund to states where no money has left the platform, and alert on the rest:

```ts
const res = await db.update(hostPayoutLedger)
  .set({ state: "refunded" })
  .where(and(eq(hostPayoutLedger.paymentId, paymentId), eq(hostPayoutLedger.state, "held")))
  .returning({ id: hostPayoutLedger.id });
// If a row existed in processing/paid, this refund is a post-payout event → operator alert + clawback, never a silent flip.
if (res.length === 0) {
  await recordAudit({ actorId: "system", action: "refund_after_payout", outcome: "needs_attention", meta: { paymentId } });
}
```

### WR-02: Refund handler trusts the event *type*, not the refund's actual `status`

**File:** `src/app/api/paymongo/webhook/route.ts:183-198` (subscribes to both `payment.refunded` and `payment.refund.updated` at `:263`)

**Issue:** `handleRefund` reads only `payment_id` and never inspects the refund resource's `status`. `payment.refund.updated` fires on refund status transitions — including to `failed` or `pending`. A refund that was attempted and then **failed** still drives the booking to `cancelled` and the ledger to `refunded`, telling the system the booker was made whole when the money is in fact still held (booker not refunded, host now blocked from payout because the sweep skips `cancelled`). The result is stranded money with a ledger that lies about it. The same blind spot means a *partial* refund would fully cancel the booking.

**Fix:** Gate the transition on a terminal-success status of the refund resource:

```ts
const attrs = event.data?.attributes?.data?.attributes;
const refundStatus = attrs?.status;
if (!["succeeded", "refunded"].includes(refundStatus ?? "")) return; // ignore pending/failed refund updates
```

### WR-03: No fail-closed boot guard for `PAYMONGO_WEBHOOK_SECRET` — a missing secret silently stops all confirmations

**File:** `src/app/api/paymongo/webhook/route.ts:203, 210, 214-216`

**Issue:** `const secret = process.env.PAYMONGO_WEBHOOK_SECRET ?? ""`. When the secret is unset, `if (sig && secret)` is false, `verified` stays false, and **every** webhook returns 400. This is safe on the security axis (fail-closed), but operationally it means that in production a missing/rotated-out webhook secret silently rejects `checkout_session.payment.paid` for every booking — bookers are charged and **no booking ever confirms** — with no startup signal. `src/lib/paymongo.ts:27-32` and `src/app/api/inngest/route.ts:23-27` both fail *at boot* on their missing secrets precisely to avoid this class of silent outage; the webhook secret is the odd one out.

**Fix:** Add the same production boot guard:

```ts
if (process.env.NODE_ENV === "production" && !process.env.PAYMONGO_WEBHOOK_SECRET) {
  throw new Error("PAYMONGO_WEBHOOK_SECRET is required in production — the webhook is the sole booking-confirm authority.");
}
```

### WR-04: A `failed` payout is never retried and never re-swept

**File:** `src/inngest/functions/payout-sweep.ts:136-142`

**Issue:** On a `createBatchTransfer` throw, the row is marked `failed` and a `console.error` fires, but there is no automated recovery: the sweep excludes bookings that already have a ledger row, and reconcile only advances `processing` rows. A purely transient PayMongo error (network blip, 5xx) therefore permanently parks the host's payout in `failed` awaiting manual intervention — even though `createBatchTransfer` already carries a stable `payout:<bookingId>` Idempotency-Key that makes a retry safe from double-pay.

**Fix:** Give `failed` rows a bounded retry path — e.g. a reconcile/sweep pass that re-attempts `failed` rows below a retry cap (relying on the Idempotency-Key to prevent duplication), or requeue via an Inngest retry with backoff rather than swallowing the throw into a terminal `failed`.

### WR-05: `booking.status` defaults to `'confirmed'` — a payout-eligible booking can exist without payment

**File:** `src/lib/db/schema.ts:394`

**Issue:** `status: bookingStatus("status").default("confirmed").notNull()`. The payout sweep pays out on `status='confirmed'` bookings past `ends_at + delay`. Any insert path that omits `status` therefore creates a booking that is simultaneously slot-occupying *and* payout-eligible while never having been paid for. No current caller triggers this (holds are inserted as `pending` explicitly), so this is latent — but the default is a live money-safety footgun now that "confirmed" means "the host gets paid." A Phase-3 forward-compat default is the wrong safe-state for a money system.

**Fix:** Flip the default to the safe state (`'pending'`) so an accidental omission can never mint a paid-out booking:

```ts
status: bookingStatus("status").default("pending").notNull(),
```

Verify no seed/migration relies on the old default before changing.

## Info

### IN-01: `createBatchTransfer` can persist `transferId = ""`, making the row un-reconcilable

**File:** `src/lib/paymongo.ts:304-309`, consumed at `src/inngest/functions/payout-sweep.ts:132`

**Issue:** `transferId: transfer?.id ?? ""` (a documented beta-shape defense). If the beta `/v2/batch_transfers` response nesting shifts, the transfer may fire while `transferId` comes back `""`. The sweep then writes `state='processing', transfer_id=''`; reconcile's `transfer_id IS NOT NULL` treats `''` as present and calls `getTransfer('')`, which will 404/throw — the row can never reach `paid` and only surfaces after the 48h stuck alert. Consider treating an empty transfer id as a failure at write time (mark `failed` + alert) rather than storing `''`.

### IN-02: Webhook idempotency is not atomic (seen-check up front, insert at the end)

**File:** `src/app/api/paymongo/webhook/route.ts:232-238, 287`

**Issue:** The `paymongo_event` "seen?" SELECT runs before processing and the `INSERT ... onConflictDoNothing` runs after. Two concurrent deliveries of the same event id both pass the seen-check and both process. This is harmless *today* because every handler is individually idempotent (confirm keys on `status='pending'`; refund/merchant guards make re-runs no-ops), but it is fragile — a future non-idempotent handler would double-apply. Prefer claiming the event id up front (`INSERT ... ON CONFLICT DO NOTHING RETURNING` before dispatch) so the insert itself is the lock, mirroring the sweep's own philosophy.

### IN-03: Checkout return URLs fall back to `http://localhost:3000` with no production guard

**File:** `src/app/actions/booking.ts:234`

**Issue:** `const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"` builds `successUrl`/`cancelUrl`. If `BETTER_AUTH_URL` is unset in production, a paying booker is redirected to `localhost` after checkout. Payment still processes and the webhook still confirms, but the booker lands nowhere. Consider a production assertion on `BETTER_AUTH_URL` alongside the other fail-closed boot guards, or derive the base from request headers.

---

_Reviewed: 2026-07-16T14:03:38Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
