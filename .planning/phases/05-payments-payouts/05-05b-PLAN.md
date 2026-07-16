---
phase: 05-payments-payouts
plan: 05b
type: execute
wave: 3
depends_on: [01, 02, 05a]
files_modified:
  - src/lib/paymongo.ts
  - tests/helpers/mocks.ts
  - src/inngest/functions/payout-reconcile.ts
  - src/app/api/inngest/route.ts
  - tests/payments/payout-reconcile.test.ts
autonomous: true
requirements: [PAY-03]
user_setup:
  - service: paymongo
    why: "Transfer-status polling requires the money-movement /v2 beta enabled on the platform + the host's linked-account wallet (GET /v2/transfers/{id})"
    dashboard_config:
      - task: "Confirm GET /v2/transfers/{id} for linked-account transfers is enabled (sales-gated). Until then reconcile runs against mocks; real polling is UAT-gated"
        location: "PayMongo Platforms/Linked-Accounts beta contact"
  - service: inngest
    why: "The /api/inngest serve() endpoint mounted here verifies Inngest requests via INNGEST_SIGNING_KEY in production (the keys + env template are owned by Plan 05a)"
    env_vars:
      - name: INNGEST_SIGNING_KEY
        source: "Inngest dashboard → Signing key (prod only; the serve() endpoint throws at boot if missing in production)"
    dashboard_config:
      - task: "Register the /api/inngest endpoint with Inngest (prod) so the sweep + reconcile crons are invoked; local dev uses npx inngest-cli@latest dev"
        location: "Inngest dashboard → Apps (prod) / local Dev Server"
must_haves:
  truths:
    - "getTransfer(transferId) polls GET /v2/transfers/{id} (no Idempotency-Key on the GET) and returns the transfer's terminal status"
    - "A second hourly Inngest cron reconciles Processing ledger rows: it moves each row Processing→Paid (paid_at set) or Processing→Failed"
    - "A Failed transfer, or a row stuck Processing beyond PAYOUT_RECONCILE_STUCK_HOURS, raises a [payout-alert] operator alert"
    - "Reconcile is idempotent: an UPDATE guarded by AND state='processing' touches 0 rows on an already-terminal row; an unknown/in-flight status stays 'processing' (never spuriously Paid)"
    - "/api/inngest serve() registers BOTH payoutSweep (Plan 05a) and payoutReconcile, and in production verifies via INNGEST_SIGNING_KEY (fail-closed boot guard)"
  artifacts:
    - path: "src/inngest/functions/payout-reconcile.ts"
      provides: "The reconcile cron: poll GET /v2/transfers/{id} for Processing rows → Paid/Failed + operator alerts"
      contains: "getTransfer"
    - path: "src/app/api/inngest/route.ts"
      provides: "serve() handler mount (GET/POST/PUT) registering BOTH cron functions + fail-closed prod signing-key guard"
      contains: "serve("
  key_links:
    - from: "src/inngest/functions/payout-reconcile.ts"
      to: "src/lib/paymongo.ts getTransfer"
      via: "poll GET /v2/transfers/{id} for terminal status"
      pattern: "getTransfer"
    - from: "src/app/api/inngest/route.ts"
      to: "src/inngest/functions/payout-sweep.ts (Plan 05a) + payout-reconcile.ts"
      via: "serve({ functions: [payoutSweep, payoutReconcile] })"
      pattern: "payoutReconcile"
---

<objective>
Close the D-59 `Held → Processing → Paid` payout lifecycle and mount the Inngest serve endpoint. Because PayMongo has **no transfer/payout webhook event** (RESEARCH Pitfall 2), a `payout-reconcile` cron polls `GET /v2/transfers/{id}` for every `Processing` ledger row and moves it `Processing → Paid` / `Processing → Failed`, alerting the operator on failures or stuck rows. It then mounts `/api/inngest` via `serve()`, registering BOTH the Plan-05a `payoutSweep` and this plan's `payoutReconcile`.

Purpose: PAY-03 payout-status reconciliation + the D-59 terminal states HOST-03 (Plan 06) renders. This is the SECOND half of the split former Plan 05. It is **Wave 3** (not Wave 2) on purpose: `route.ts` statically imports `payoutSweep` from Plan 05a's `payout-sweep.ts` (a prior-wave artifact) and `payoutReconcile` from this plan — mounting it only after BOTH function files exist keeps every `tsc` gate clean. Same-wave plans run in parallel in isolated worktrees, so co-scheduling with Plan 05a (Wave 2) would leave `payout-sweep.ts` absent when `route.ts` compiles → TS2307. Wave 3 guarantees Plan 05a has fully landed first.
Output: `getTransfer` added to `paymongo.ts` (+ a mock stub in `mocks.ts`), the reconcile cron, the `/api/inngest` serve() mount registering both crons (+ fail-closed prod guard), and reconcile tests (Processing→Paid/Failed, idempotency, stuck-alert).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/05-payments-payouts/05-RESEARCH.md
@.planning/phases/05-payments-payouts/05-PATTERNS.md
@CLAUDE.md

<interfaces>
<!-- From Plan 02 (src/lib/paymongo.ts). getTransfer is ADDED by THIS plan (Task 1), reusing paymongoFetch + the versioned /v2 base. -->
```typescript
async function paymongoFetch<T>(path: string, init: { method?: "GET"|"POST"; body?: unknown; idempotencyKey?: string }): Promise<T>;
export async function createBatchTransfer(input: { netCents: number; currency?: string; bookingId: string;
  description: string; destination: { number: string; name: string; bic?: string }; callbackUrl?: string
}): Promise<{ batchId: string; transferId: string; status: string }>;
// ADDED HERE (Task 1):
export async function getTransfer(transferId: string): Promise<{ id: string; status: string }>; // GET /v2/transfers/{id}
```

<!-- From Plan 05a. route.ts (Task 2) imports BOTH — payoutSweep already exists (Wave 2), payoutReconcile is created in Task 1 of THIS plan. -->
```typescript
// src/inngest/client.ts (Plan 05a):
export const inngest: Inngest;
// src/inngest/functions/payout-sweep.ts (Plan 05a):
export const payoutSweep;
```

<!-- host_payout_ledger columns the reconcile touches (Plan 01 schema; Plan 05a's sweep sets state='processing' + transfer_id): state payout_ledger_state, transfer_id, paid_at, created_at. -->

<!-- Reconcile skeleton (05-RESEARCH.md Code Examples). Verified versions: inngest 4.13.0. -->
```typescript
export const payoutReconcile = inngest.createFunction(
  { id: "payout-reconcile", concurrency: 1 },          // singleton
  { cron: "TZ=Asia/Manila 30 * * * *" },               // hourly, offset 30m from the sweep
  async ({ step }) => { /* find Processing rows → getTransfer(transferId) → Paid/Failed + alert */ });
```

<!-- App-Router route-handler shell (mirror src/app/api/paymongo/webhook/route.ts): `export const runtime = "nodejs"` + exported HTTP methods. serve() from "inngest/next" returns { GET, POST, PUT }. -->
<!-- Raw-SQL idiom (src/lib/availability/units.ts): `const rows = await dbConn.execute(sql\`...\`)` returns the row array directly (postgres.js). Mirror it for the reconcile queries. -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: getTransfer PayMongo call + mock stub + payout-reconcile cron (Processing→Paid/Failed + alerts)</name>
  <files>src/lib/paymongo.ts, tests/helpers/mocks.ts, src/inngest/functions/payout-reconcile.ts</files>
  <read_first>
    - src/lib/paymongo.ts (Plan 02 — add getTransfer next to createBatchTransfer, reusing paymongoFetch verbatim; GET carries no Idempotency-Key)
    - tests/helpers/mocks.ts (Plan 02 — the mockPayMongo block with createBatchTransfer/listWalletAccounts stubs; add a getTransfer stub + reset it. This file is shared with Plan 05a's read path but ONLY this plan modifies it — Plan 05a merely uses the existing Plan-02 stubs.)
    - src/inngest/functions/payout-sweep.ts (Plan 05a — the `dbConn.execute(sql\`\`)` idiom + the `state='processing'`/`transfer_id` columns to reconcile)
    - src/inngest/client.ts (Plan 05a — import `inngest` from here)
    - .planning/phases/05-payments-payouts/05-RESEARCH.md § Pitfall 2 (no transfer webhook — poll `GET /v2/transfers/{id}`), § Open Questions #3 (poll from an Inngest step), § Assumptions A4 (terminal status enum uncertain — verify against a captured response), § Sources (docs.paymongo.com/reference/transfer-resource)
  </read_first>
  <action>
    1. **Add `getTransfer` to `src/lib/paymongo.ts`** (extends Plan 02's client; reuse `paymongoFetch` + the versioned `/v2` base from Plan 02's Pitfall-3 fix):
       ```typescript
       export async function getTransfer(transferId: string): Promise<{ id: string; status: string }> {
         const json = await paymongoFetch<{ data: { id: string; attributes: { status: string } } }>(
           `/v2/transfers/${transferId}`, { method: "GET" }, // GET — no Idempotency-Key
         );
         return { id: json.data.id, status: json.data.attributes.status };
       }
       ```
       Comment: money-critical status transition (A4) — poll this (not a webhook; PayMongo has no transfer/payout webhook event, Pitfall 2).

    2. **Extend `mockPayMongo` in `tests/helpers/mocks.ts`** with a deterministic stub and add it to `reset()`:
       - `getTransfer: vi.fn(async (transferId: string) => ({ id: transferId, status: "succeeded" }))` (tests override per-case with `mockResolvedValueOnce`). Add `getTransfer` to `mockPayMongo.reset()` (mockClear). Keep the Plan-02 createCheckoutSession/createRefund/createBatchTransfer/listWalletAccounts stubs + signWebhook/badSignature unchanged.

    3. **Create `src/inngest/functions/payout-reconcile.ts`** (import `inngest` from `@/inngest/client`, `db` from `@/lib/db`, `sql` from drizzle-orm, `getTransfer` from `@/lib/paymongo`):
       ```typescript
       const RECONCILE_STUCK_HOURS = Number(process.env.PAYOUT_RECONCILE_STUCK_HOURS ?? 48);

       // PayMongo /v2 transfer terminal-status mapping (A4 — VERIFY the enum against a captured test-mode
       // GET /v2/transfers/{id} response before UAT). Unknown/in-flight ⇒ stay 'processing' (never spuriously Paid).
       export function mapTransferStatus(status: string): "paid" | "failed" | "processing" {
         if (["succeeded", "completed", "paid"].includes(status)) return "paid";
         if (["failed", "returned", "cancelled"].includes(status)) return "failed";
         return "processing";
       }

       export async function queryProcessingLedger(dbConn = db) {
         return dbConn.execute(sql`
           SELECT booking_id AS "bookingId", transfer_id AS "transferId", created_at AS "createdAt"
           FROM host_payout_ledger
           WHERE state = 'processing' AND transfer_id IS NOT NULL
           ORDER BY created_at ASC LIMIT 200`);
       }

       export async function reconcileOne(
         row: { bookingId: string; transferId: string; createdAt: Date | string },
         dbConn = db,
       ) {
         const tr = await getTransfer(row.transferId);
         const next = mapTransferStatus(tr.status);
         if (next === "paid") {
           await dbConn.execute(sql`
             UPDATE host_payout_ledger SET state='paid', paid_at=now()
             WHERE booking_id=${row.bookingId} AND state='processing'`); // idempotent: 0 rows if already terminal
           return { bookingId: row.bookingId, state: "paid" as const };
         }
         if (next === "failed") {
           await dbConn.execute(sql`
             UPDATE host_payout_ledger SET state='failed'
             WHERE booking_id=${row.bookingId} AND state='processing'`);
           console.error("[payout-alert] transfer failed", { bookingId: row.bookingId, transferId: row.transferId, status: tr.status });
           return { bookingId: row.bookingId, state: "failed" as const };
         }
         const ageHours = (Date.now() - new Date(row.createdAt).getTime()) / 3_600_000;
         if (ageHours > RECONCILE_STUCK_HOURS) {
           console.error("[payout-alert] transfer stuck processing", { bookingId: row.bookingId, transferId: row.transferId, ageHours });
         }
         return { bookingId: row.bookingId, state: "processing" as const };
       }

       export const payoutReconcile = inngest.createFunction(
         { id: "payout-reconcile", concurrency: 1 },        // singleton
         { cron: "TZ=Asia/Manila 30 * * * *" },             // hourly, offset 30m from the sweep
         async ({ step }) => {
           const inflight = await step.run("find-processing", () => queryProcessingLedger());
           for (const row of inflight) {
             await step.run(`reconcile-${row.bookingId}`, () => reconcileOne(row));
           }
           return { reconciled: inflight.length };
         },
       );
       ```
       The `UPDATE ... WHERE ... AND state='processing'` guard makes reconcile idempotent (a re-run on an already-Paid row touches 0 rows). Terminal `failed` and stuck-`processing` both emit a `[payout-alert]` line so a silently-stranded payout can never occur (mitigates T-05-28).
  </action>
  <acceptance_criteria>
    - paymongo.ts exports `getTransfer` calling `GET`/`/v2/transfers/` (grep: `export async function getTransfer`, `/v2/transfers/`)
    - mocks.ts mockPayMongo has a `getTransfer` stub added to reset() (grep: `getTransfer`)
    - payout-reconcile.ts exports `payoutReconcile` with `{ cron: "TZ=Asia/Manila 30 * * * *" }` and `concurrency: 1` (grep each)
    - it moves rows `Processing → Paid` (with `paid_at=now()`) and `Processing → Failed`, both guarded by `AND state='processing'` (grep: `state='paid'`, `paid_at=now()`, `state='failed'`, `AND state='processing'`)
    - a failed transfer AND a stuck-processing row each emit `[payout-alert]` (grep: `[payout-alert] transfer failed`, `[payout-alert] transfer stuck processing`)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>getTransfer polls the transfer resource; the reconcile cron flips every Processing ledger row to Paid or Failed (idempotently) and alerts on failures or stuck rows — no ledger row is ever stranded at Processing without an operator signal.</done>
</task>

<task type="auto">
  <name>Task 2: [WIRE — ordering-critical] Mount /api/inngest serve() registering BOTH crons + fail-closed prod signing-key guard</name>
  <files>src/app/api/inngest/route.ts</files>
  <read_first>
    - src/app/api/paymongo/webhook/route.ts (the App-Router route-handler shell: `export const runtime = "nodejs"` + exported HTTP methods — the mount analog; and the fail-closed prod boot-guard idiom to mirror)
    - src/inngest/client.ts (Plan 05a — the `inngest` client to pass to serve)
    - src/inngest/functions/payout-sweep.ts (Plan 05a, PRIOR WAVE — `payoutSweep` must already exist for this import to resolve)
    - src/inngest/functions/payout-reconcile.ts (Task 1 of THIS plan — `payoutReconcile`, created before this task runs)
  </read_first>
  <action>
    This task creates `route.ts` LAST — AFTER both `payout-sweep.ts` (Plan 05a, a completed prior-wave artifact) and `payout-reconcile.ts` (Task 1 above) exist — so `npx tsc --noEmit` resolves both static imports (no TS2307). This ordering is the entire reason the former Plan 05 was split: `route.ts` may never precede the function files it imports.

    1. Create `src/app/api/inngest/route.ts` — mount `serve()` and re-export its handlers, registering BOTH cron functions (mirror the webhook route shell; keep `runtime = "nodejs"`):
       ```typescript
       import { serve } from "inngest/next";
       import { inngest } from "@/inngest/client";
       import { payoutSweep } from "@/inngest/functions/payout-sweep";
       import { payoutReconcile } from "@/inngest/functions/payout-reconcile";

       export const runtime = "nodejs";

       // Fail-closed: in production the serve endpoint MUST verify Inngest requests via INNGEST_SIGNING_KEY.
       // Throw at module load if it is missing in prod; dev/test/build tolerate its absence (the Inngest Dev Server needs no keys).
       if (process.env.NODE_ENV === "production" && !process.env.INNGEST_SIGNING_KEY) {
         throw new Error("INNGEST_SIGNING_KEY is required in production (fail-closed: Inngest verifies the /api/inngest serve endpoint)");
       }

       export const { GET, POST, PUT } = serve({ client: inngest, functions: [payoutSweep, payoutReconcile] });
       ```
       (Inngest's serve() reads INNGEST_SIGNING_KEY / INNGEST_EVENT_KEY from env automatically; the explicit guard makes a missing prod key a boot failure rather than a silently-unverified endpoint.)
  </action>
  <acceptance_criteria>
    - src/app/api/inngest/route.ts exports GET/POST/PUT from `serve(` and registers BOTH `payoutSweep` and `payoutReconcile` (grep: `serve(`, `payoutSweep`, `payoutReconcile`)
    - route.ts sets `runtime = "nodejs"` (grep)
    - route.ts throws when `NODE_ENV === "production"` and `INNGEST_SIGNING_KEY` is missing (grep: `INNGEST_SIGNING_KEY`, `production`)
    - both imported function files already exist (payout-sweep.ts from Plan 05a, payout-reconcile.ts from Task 1) — `npx tsc --noEmit` exits 0 with no TS2307
  </acceptance_criteria>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>/api/inngest mounts serve() with BOTH crons registered and a fail-closed prod signing-key guard; both static imports resolve because their function files already exist, so tsc is clean.</done>
</task>

<task type="auto">
  <name>Task 3: Reconcile tests — Processing→Paid/Failed, idempotency, unknown-status, stuck-alert</name>
  <files>tests/payments/payout-reconcile.test.ts</files>
  <read_first>
    - tests/paymongo/webhook-merchant-activated.test.ts (isolated-schema harness: setupTestDb, makeHost helpers)
    - tests/helpers/db.ts (setupTestDb — isolated schema)
    - tests/helpers/mocks.ts (mockPayMongo — the getTransfer stub added in Task 1; override with mockResolvedValueOnce)
    - src/inngest/functions/payout-reconcile.ts (Task 1 — queryProcessingLedger + reconcileOne + mapTransferStatus exported)
    - .planning/phases/05-payments-payouts/05-VALIDATION.md § Requirement→Test Map (PAY-03 Processing→Paid/Failed row)
  </read_first>
  <action>
    Create `tests/payments/payout-reconcile.test.ts` (isolated schema; mock `@/lib/paymongo` so getTransfer is stubbed via mockPayMongo):
      - **queryProcessingLedger** returns only rows with `state='processing'` AND `transfer_id` set (seed one processing+transfer_id row, one held row, one paid row → only the processing one is returned).
      - **Processing → Paid:** seed a ledger row state='processing', transfer_id='tr_paid'. Stub `getTransfer` → `{ id:'tr_paid', status:'succeeded' }`. Run reconcileOne(row) → assert the row is now `state='paid'` with `paid_at` set (non-null).
      - **Processing → Failed + alert:** seed state='processing', transfer_id='tr_fail'. Stub `getTransfer` → `{ status:'failed' }`. Spy `vi.spyOn(console,'error')`. Run reconcileOne → assert row `state='failed'` and a `[payout-alert] transfer failed` line fired.
      - **Idempotency:** a row already `state='paid'`, stub getTransfer → 'succeeded'. Run reconcileOne → assert the UPDATE touches 0 rows and the row stays 'paid' (no exception, `paid_at` unchanged).
      - **Unknown/in-flight stays processing:** stub getTransfer → `{ status:'pending' }` → mapTransferStatus returns 'processing'; assert the row stays 'processing' (never spuriously Paid).
      - **Stuck alert:** a processing row with created_at older than PAYOUT_RECONCILE_STUCK_HOURS + getTransfer still 'pending' → assert a `[payout-alert] transfer stuck processing` line fired (spy console.error), row stays 'processing'.
  </action>
  <acceptance_criteria>
    - payout-reconcile.test.ts asserts a real `processing → paid` (paid_at set) AND a `processing → failed` (alert) transition, plus reconcile idempotency on an already-paid row (grep: `paid`, `failed`, `[payout-alert]`)
    - queryProcessingLedger selectivity is asserted (only processing+transfer_id rows returned)
    - the unknown-status case asserts the row stays 'processing' (no spurious Paid)
    - `npx vitest run tests/payments/payout-reconcile.test.ts` exits 0
  </acceptance_criteria>
  <verify>
    <automated>npx vitest run tests/payments/payout-reconcile.test.ts</automated>
  </verify>
  <done>The reconcile cron drives Processing→Paid/Failed with idempotency, keeps unknown/in-flight rows at Processing, and emits operator alerts on failures or stuck rows.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Inngest → /api/inngest | Inngest invokes the serve endpoint; prod verifies via INNGEST_SIGNING_KEY (fail-closed boot guard) |
| reconcile → PayMongo /v2 | Polls GET /v2/transfers/{id} for the money-critical terminal status (no webhook exists) |
| ledger state machine | Reconcile only advances Held→Processing rows; the `AND state='processing'` guard makes every UPDATE idempotent |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-28 | Repudiation | Transfer status silently lost (a payout stranded at Processing, host silently never paid) | mitigate | The `payout-reconcile` cron polls `GET /v2/transfers/{id}` for every Processing row and moves it Paid/Failed; a Failed transfer or a row stuck beyond `PAYOUT_RECONCILE_STUCK_HOURS` raises a `[payout-alert]` operator signal (Pitfall 2 / Open Question 3, Tasks 1/3) |
| T-05-26 | Spoofing | An unauthenticated caller triggering the sweep/reconcile serve endpoint | mitigate | Fail-closed `INNGEST_SIGNING_KEY` in prod (serve() verifies the request; boot throws if the key is missing in production, Task 2); the crons only act on DB-derived rows |
</threat_model>

<verification>
- `npx vitest run tests/payments/payout-reconcile.test.ts` green (queryProcessingLedger selectivity, Processing→Paid/Failed, idempotency, unknown-stays-processing, stuck-alert).
- `npx tsc --noEmit` clean; `getTransfer` exported from paymongo.ts; /api/inngest mounts serve() with BOTH crons; both static imports resolve (payout-sweep.ts is a landed Plan-05a artifact).
- grep confirms the reconcile `state='paid'`/`state='failed'` guarded updates, the `[payout-alert]` lines, and the fail-closed `INNGEST_SIGNING_KEY` prod guard.
</verification>

<success_criteria>
- A second hourly cron reconciles every Processing row to Paid/Failed by polling the transfer, alerting on failures or stuck rows — the full `Held → Processing → Paid` lifecycle HOST-03 renders is reachable and tested.
- /api/inngest serves BOTH crons and is fail-closed in production; the route mounts only after both function files exist, so no tsc gate is ever violated.
- No ledger row is ever stranded at Processing without an operator signal; unknown/in-flight statuses never spuriously flip to Paid.
</success_criteria>

<output>
After completion, create `.planning/phases/05-payments-payouts/05-05b-SUMMARY.md` (record the reconcile cron cadence/timezone, the `mapTransferStatus` terminal-enum mapping to verify against a live PayMongo response, the getTransfer path, the serve() mount + fail-closed prod guard, and the operator-alert `[payout-alert]` tags ops should watch).
</output>
