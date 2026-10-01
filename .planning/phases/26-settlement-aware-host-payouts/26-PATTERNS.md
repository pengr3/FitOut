# Phase 26: Settlement-Aware Host Payouts - Pattern Map

**Mapped:** 2026-09-29  
**Files analyzed:** 18 probable new/modified files (planner may consolidate helpers)  
**Analogs found:** 18 / 18; new settlement semantics have only partial analogs.

## File Classification

| New/Modified File | Role | Data Flow | Closest Tracked Analog | Match |
|---|---|---|---|---|
| `src/lib/paymongo.ts` | service | request-response | same file, `getTransfer` | exact wrapper |
| `src/lib/db/schema.ts` | model | CRUD | same file, `hostPayoutLedger` | role-match |
| `drizzle/0033_*settlement*.sql` (number after current 0032; planner verifies journal) | migration | CRUD | `drizzle/0031_controlled_checkout_grant.sql` | role-match |
| `src/lib/payments/settlement.ts` (proposed) | service | request-response, batch | `src/lib/paymongo.ts`; `src/inngest/functions/payout-reconcile.ts` | partial |
| `src/inngest/functions/settlement-reconcile.ts` (proposed) | service | batch, event-driven | `src/inngest/functions/payout-reconcile.ts` | role-match |
| `src/app/api/paymongo/webhook/route.ts` | route | event-driven | same file | exact |
| `src/app/api/inngest/route.ts` | config/route | event-driven | same file | exact |
| `src/inngest/functions/payout-sweep.ts` | service | batch | same file | exact |
| `src/inngest/functions/payout-reconcile.ts` | service | batch | same file | exact |
| `src/lib/payments/config.ts` | config | transform | same file | exact |
| `src/app/(host)/host/earnings/page.tsx` | component | request-response | same file | exact |
| `src/components/host/payout-ledger-status.ts`, `payout-state-badge.tsx`, `payout-row.tsx`, `payout-summary.tsx` | utility/components | transform | same files | exact |
| `src/app/(host)/host/bookings/page.tsx`, `src/app/(host)/host/bookings/[id]/page.tsx`, `src/components/host/host-booking-row.tsx` | components | request-response, transform | same files | exact |
| `src/app/(host)/host/earnings/error.tsx` (proposed) | component | request-response | `src/components/patterns/error-state.tsx` | role-match |
| `src/app/(legal)/terms/page.tsx` | component | request-response | same file | exact; publication gated |
| `tests/payments/payout-sweep.test.ts`, `payout-reconcile.test.ts`, `earnings-view.test.ts`, new `settlement.test.ts` | tests | batch/request-response | existing named tests | exact/role-match |
| `tests/paymongo/webhook-signature.test.ts`, new provider-read tests | tests | event-driven/request-response | existing named test | role-match |
| Ops alert/release evidence (possible `src/inngest/functions/ops-alert-digest.ts`, ops tests, phase proof document) | service/test/document | batch | `ops-alert-digest.ts` | role-match |

## Pattern Assignments

### Provider reads and settlement reconciler

**Analog:** `src/lib/paymongo.ts:89-121,745-765`. Use its server-only `paymongoFetch<T>` for typed GET reads. It adds Basic Authorization, JSON Accept, parses errors, and throws on non-2xx. Existing read pattern:

```ts
export async function getTransfer(transferId: string): Promise<Transfer> {
  const json = await paymongoFetch<{ data: { id: string; attributes: { status: string } } }>(
    `/v2/transfers/${transferId}`,
    { method: "GET" },
  );
  return { id: json.data.id, status: json.data.attributes.status };
}
```

**Apply to:** payout detail, paginated payout transactions, Wallet detail/available balance. Validate the live account's transaction field mapping, mode, destination, currency and fee before treating any response as proof. The existing `getTransfer` header comment claiming no payout/transfer webhook is stale per RESEARCH.md; do not copy that assertion. For the new reconciler, mirror `src/inngest/functions/payout-reconcile.ts:85-142`: inject `dbConn` for tests, read provider state, guard terminal updates with current state, and leave unknown statuses waiting. No existing service correlates a payment across all payout transaction pages; implement that from the research contract.

### Settlement model and migration

**Analog:** `src/lib/db/schema.ts:627-687` and tracked `drizzle/0031_controlled_checkout_grant.sql:1-28`. The ledger uses `pgTable`, text IDs, `timestamp(..., { withTimezone: true })`, restrictive booking FK, indexes, and a database unique constraint:

```ts
bookingId: text("booking_id").notNull().references(() => booking.id, { onDelete: "restrict" }),
paymentId: text("payment_id"),
createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
// table-level: unique("host_payout_ledger_booking_id_kind_unique").on(t.bookingId, t.kind)
```

The migration analog separates statements with `--> statement-breakpoint`, adds explicit FK and indexes, and leaves existing rows intact. Add an append-only booking/payment/payout/transaction observation with provider status, deposited instant, verified instant, and reversal history. Do not infer or backfill proof from `booking.payment_id` alone (`schema.ts:1152-1155`). `drizzle/0032_bouldering_space_type.sql` and `drizzle/meta/_journal.json` are currently uncommitted, so the planner must resolve the next migration number against the shared workspace before creation.

### Friday selection, funded dispatch, transfer terminal

**Analog:** `src/inngest/functions/payout-sweep.ts:121-182,204-250,360-379`; `src/inngest/functions/payout-reconcile.ts:85-142`.

```sql
LEFT JOIN host_payout_ledger p ON p.booking_id = b.id AND p.kind = 'payout'
WHERE (b.status = 'confirmed' OR
       (b.status = 'cancelled' AND COALESCE(b.retained_space_cents, 0) > 0))
  AND COALESCE(hv.status::text, 'unverified') <> 'suspended'
  AND hp.payouts_enabled = true
  AND hpd.verification_status IN ('verified', 'host_attested')
```

Preserve those predicates and retained gross. `payOne` freezes commission from server gross and claims through `INSERT ... ON CONFLICT (booking_id, kind) ... RETURNING` (`payout-sweep.ts:220-246`). Rework the current failed-row re-claim: provider keys expire and unknown prior POST outcome requires read-back before another call. Settlement/funds waiting must remain preclaim and must not spend the failed-transfer retry age. The existing Inngest v4 local pattern is `inngest.createFunction({ id, concurrency: 1, triggers: [{ cron: "TZ=Asia/Manila ..." }] }, async ({step}) => ...)` (`payout-sweep.ts:364-379`); express the Friday 12:00–23:00 cohort with durable eligibility, not cron alone. Reconciliation only marks paid after provider terminal success and guards updates by `kind='payout' AND state='processing'` (`payout-reconcile.ts:109-129`). Unknown stays processing and alerts if stuck (`:132-141`). The fresh available Wallet balance must cover net plus fee at dispatch; there is no existing funded preflight analog.

### Signed webhook and job registration

**Analog:** `src/app/api/paymongo/webhook/route.ts:89-122,231-324`, `src/app/api/inngest/route.ts`. Keep raw-body signature verification, event-id dedupe and 200 ACK for processed events. Settlement event should trigger a fresh provider re-read, never write proof solely from event payload. Extend the existing Inngest function registration when adding a job. The webhook file has uncommitted edits; use its current on-disk event routing.

### Host earnings projection and presentation

**Analog:** `src/app/(host)/host/earnings/page.tsx:53-101,119-144,245-294` and `src/components/host/payout-ledger-status.ts:21-80`.

```ts
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) redirect("/login");
if (!(session.user as typeof session.user & { canHost?: boolean }).canHost) redirect("/");
// Ledger read: .where(and(eq(hostPayoutLedger.hostId, session.user.id),
//                       eq(hostPayoutLedger.kind, "payout")))
```

Keep the Server Component auth and owner scope, but start the projected collection from confirmed bookings so preclaim rows exist. Merge a later payout ledger by booking ID once. Current `endsAt + PAYOUT_DELAY_HOURS` display (`page.tsx:119-141`), `Expected` table column (`:272`), and empty copy (`:245-250`) require replacement. Preserve the desktop semantic `Table` and terminal mobile row composition. The pure status module is server-callable and sums integer cents (`payout-ledger-status.ts:21-80`); extend it for upcoming/review/clearing/scheduled/processing/paid/refunded/needs-attention while only terminal provider success yields Paid. Keep Court tokens and the exact copy in `26-UI-SPEC.md`; no Grove variant. The installed Next guide `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:12-35` confirms pages default to Server Components and should keep database/secrets server-side.

### Booking payout parity, errors, and legal copy

**Analogs:** `src/app/(host)/host/bookings/page.tsx:202-267,425`; `[id]/page.tsx:44-96,156`; `src/components/host/host-booking-row.tsx:60-75`. Both booking routes owner-scope and pass a payout state to `HostPayoutCell`; its `No payout yet` label must use the same projected status vocabulary for a confirmed preclaim booking. Earnings route error can compose `src/components/patterns/error-state.tsx:80-96`; consult installed Next error-boundary guide before adding `error.tsx` because the route needs a retry control. `src/app/(legal)/terms/page.tsx` is a nonbinding placeholder; follow the separate legal publication gate in `26-UI-SPEC.md`, not an in-place operative clause without approval.

### Tests and operations

**Analogs:** `tests/payments/payout-sweep.test.ts:243-330,390-475,570-745` tests frozen cents, concurrency, failed retries, debit netting, and zero-transfer behavior; `tests/payments/earnings-view.test.ts:18-35,207-316` uses `setupTestDb`/`teardownTestDb`, owner scope and pure state assertions; `tests/paymongo/webhook-signature.test.ts:12-78` tests signatures and event replay. Add distinct settlement pagination, returned/out-of-order evidence, Wallet shortfall, Friday cohort, unknown provider outcome, and preclaim owner-scoped UI cases. `src/inngest/functions/ops-alert-digest.ts:91-149` shows unresolved alert retrieval and `OPS_ALERT_EMAIL`; define a monitored owner, acknowledgement and recovery for missed Friday. Its daily digest alone does not prove timely acknowledgement.

## Shared Patterns

- **Authentication and ownership:** earnings `page.tsx:53-98`; booking pages owner-scope by `listing.hostId`. Provider credentials remain server-side.
- **At-most-once money state:** schema unique `(booking_id, kind)` at `schema.ts:683-686`; claim SQL at `payout-sweep.ts:235-246`; terminal guarded update at `payout-reconcile.ts:109-129`.
- **Errors and alerts:** `paymongoFetch` throws descriptive provider errors (`paymongo.ts:113-121`); payout failures emit `[payout-alert]` with IDs, not secret destination data (`payout-reconcile.ts:118-139`); unresolved audit digest at `ops-alert-digest.ts:91-149`.
- **Court presentation:** use existing page shell, PanelCard, RowCard, badge and semantic color/type tokens. No invented host transfer control or off-cycle promise.

## No Exact Analog Found

| File/capability | Reason |
|---|---|
| `src/lib/payments/settlement.ts` | No current payout-transaction correlation with append-only deposited/returned observations. |
| Wallet funded preflight in `payout-sweep.ts` | Current sweep dispatches without booking-linked settlement and available-balance proof. |
| Friday cohort projection | Current scheduler and host date display implement a post-session hourly model. |

## Metadata

**Analog search scope:** `src/lib`, `src/inngest`, `src/app`, `src/components/host`, `drizzle`, `tests/payments`, `tests/paymongo`. All named source analogs were checked with `git ls-files`; no `.gsd` runtime mirrors are cited.  
**Pattern extraction date:** 2026-09-29.  
**Live-account limit:** Provider entitlement, destination, settlement weekday, transaction mapping, available-balance field, and transfer fee remain unverified; preserve Phase 25.1 HOLD until controlled authorization and proof.
