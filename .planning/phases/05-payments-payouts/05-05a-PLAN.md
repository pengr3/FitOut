---
phase: 05-payments-payouts
plan: 05a
type: execute
wave: 2
depends_on: [01, 02]
files_modified:
  - package.json
  - src/inngest/client.ts
  - src/inngest/functions/payout-sweep.ts
  - .env.example
  - tests/payments/payout-sweep.test.ts
  - tests/payments/ledger-freeze.test.ts
autonomous: true
requirements: [PAY-02, PAY-03]
user_setup:
  - service: inngest
    why: "The T+24h payout sweep runs on Inngest (managed cron); prod needs signing keys, local dev uses the Inngest Dev Server. (This plan installs Inngest + creates the client + owns all Inngest env keys; the serve() endpoint is mounted in Plan 05b.)"
    env_vars:
      - name: INNGEST_EVENT_KEY
        source: "Inngest dashboard → Events (prod only; dev server needs none)"
      - name: INNGEST_SIGNING_KEY
        source: "Inngest dashboard → Signing key (prod only; consumed by the serve() endpoint mounted in Plan 05b)"
    dashboard_config:
      - task: "Run the local Inngest Dev Server during development: npx inngest-cli@latest dev (no Redis, no worker)"
        location: "local terminal"
  - service: paymongo
    why: "Real inhouse payouts require the money-movement /v2 beta enabled on the platform + the host's linked-account wallet"
    dashboard_config:
      - task: "Confirm /v2 batch_transfers + wallet enumeration for linked accounts is enabled (sales-gated). Until then payouts run against mocks; real payout is UAT-gated"
        location: "PayMongo Platforms/Linked-Accounts beta contact"
must_haves:
  truths:
    - "An hourly Inngest cron sweeps confirmed bookings where endsAt + PAYOUT_DELAY_HOURS ≤ now() with no ledger row"
    - "Each due booking gets exactly ONE ledger row via INSERT ... ON CONFLICT (booking_id) DO NOTHING (at-most-once), even under concurrent/duplicate sweeps"
    - "The ledger row freezes commission_rate_bps + commission_cents (D-51); the transfer sends exactly net_cents (D-52)"
    - "The sweep resolves the payout wallet by CORRELATING it to THIS booking's host (wallet.id === paymongo_account_id) and never fires to a non-matching host's wallet; no match ⇒ leave Held + operator alert, fire nothing"
    - "The transfer is an inhouse /v2 batch_transfer to the host's activated wallet with a stable Idempotency-Key; the ledger moves Held→Processing on release"
    - "Payout is never fired before the session (funds held until T+24h post endsAt); the host is never paid at booking time"
  artifacts:
    - path: "src/inngest/client.ts"
      provides: "Inngest client (consumed by both crons + the Plan-05b serve() mount)"
      exports: ["inngest"]
    - path: "src/inngest/functions/payout-sweep.ts"
      provides: "The cron sweep: query due, claim ledger, freeze commission, correlate wallet, fire transfer"
      contains: "ON CONFLICT"
  key_links:
    - from: "src/inngest/functions/payout-sweep.ts"
      to: "host_payout_ledger"
      via: "ON CONFLICT (booking_id) DO NOTHING claim"
      pattern: "ON CONFLICT"
    - from: "src/inngest/functions/payout-sweep.ts"
      to: "b.paymongoAccountId (host_payout.paymongo_account_id)"
      via: "wallet.id === paymongoAccountId correlation before transfer"
      pattern: "paymongoAccountId"
    - from: "src/inngest/functions/payout-sweep.ts"
      to: "src/lib/paymongo.ts createBatchTransfer"
      via: "inhouse net payout"
      pattern: "createBatchTransfer"
---

<objective>
Introduce the first async-scheduled job in the codebase — an Inngest hourly cron that fires host payouts (PAY-03, D-55/56). The sweep finds `confirmed` bookings whose session ended ≥ `PAYOUT_DELAY_HOURS` ago with no payout row, claims each with an at-most-once `INSERT ... ON CONFLICT (booking_id) DO NOTHING` ledger row that FREEZES the commission (D-51), CORRELATES the payout wallet to that booking's host (`wallet.id === paymongo_account_id`), and fires an inhouse `/v2/batch_transfers` of exactly `net_cents` (D-52) — moving the ledger `Held → Processing`.

Purpose: PAY-03 hold-until-session payout + PAY-02 commission-freeze-at-payout. This is the FIRST half of the split former Plan 05 (Wave 2). The reconcile cron (`Processing → Paid/Failed`) + the `/api/inngest` serve() mount live in Plan 05b (Wave 3) — split so `route.ts` is mounted only AFTER both cron function files exist (this plan's `payout-sweep.ts` + Plan 05b's `payout-reconcile.ts`), keeping every task `tsc`-clean.

Wave 2 — depends on Plan 01 (ledger + config + commission) and Plan 02 (createBatchTransfer, listWalletAccounts). This plan does NOT create `src/app/api/inngest/route.ts` (Plan 05b owns it): defining `payout-sweep.ts` and `client.ts` without a serve mount leaves the phase `tsc`-clean at the end of this plan (no dangling import of a not-yet-existing `payout-reconcile.ts`). No file overlap with Plans 03/04/06 (the other Wave-2 plans).
Output: `inngest` installed, the client + sweep cron, env additions (all Inngest + payment config keys), and sweep + ledger-freeze tests (incl. concurrent at-most-once + multi-host wallet correlation).
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
<!-- From Plan 01. -->
```typescript
export const PAYOUT_DELAY_HOURS: number;        // 24 (D-55)
export const COMMISSION_RATE_BPS: number;       // 1000 (D-51 default)
export function computeCommission(grossCents: number, rateBps?: number): { rateBps: number; commissionCents: number; netCents: number };
// host_payout_ledger: id, booking_id UNIQUE, host_id, payment_id, gross_cents, commission_rate_bps,
//   commission_cents, net_cents, currency, state payout_ledger_state('held'default,'processing','paid','refunded','failed'), transfer_id, paid_at
```

<!-- From Plan 02 (src/lib/paymongo.ts). getTransfer is added by Plan 05b, NOT here. -->
```typescript
export async function createBatchTransfer(input: { netCents: number; currency?: string; bookingId: string;
  description: string; destination: { number: string; name: string; bic?: string }; callbackUrl?: string
}): Promise<{ batchId: string; transferId: string; status: string }>;
// listWalletAccounts returns a GLOBAL, unfiltered list of ALL activated wallets — the CALLER must correlate one to the host.
export async function listWalletAccounts(): Promise<Array<{ id: string; accountNumber: string; accountName: string; status: string }>>;
```

<!-- host_payout schema (Phase 2, src/lib/db/schema.ts): hostPayout.paymongoAccountId = text("paymongo_account_id").unique() — the host's Linked-Account id. This is the field the sweep query selects and the wallet is correlated against. -->

<!-- Sweep query (05-RESEARCH.md Pattern 4) — DB clock now(), not an injectable JS clock. hp.paymongo_account_id aliased → paymongoAccountId. -->
```sql
SELECT b.id AS booking_id, b.listing_id, b.quoted_total_cents, b.currency, l.host_id, hp.paymongo_account_id
FROM booking b JOIN listing l ON l.id=b.listing_id JOIN host_payout hp ON hp.user_id=l.host_id
LEFT JOIN host_payout_ledger p ON p.booking_id=b.id
WHERE b.status='confirmed' AND b.ends_at + make_interval(hours => :delay) <= now() AND p.id IS NULL
ORDER BY b.ends_at ASC LIMIT :batchSize;
```

<!-- Inngest skeleton (05-RESEARCH.md Code Examples). Verified versions: inngest 4.13.0, inngest-cli 1.37.0. -->
```typescript
export const payoutSweep = inngest.createFunction(
  { id: "payout-sweep", concurrency: 1 },              // singleton — no overlapping sweeps
  { cron: "TZ=Asia/Manila 0 * * * *" },                // hourly, timezone-aware
  async ({ step }) => { /* find-due → per-booking step: claim → correlate wallet → transfer → markProcessing */ });
```

<!-- Raw-SQL idiom (src/lib/availability/units.ts): `const rows = await dbConn.execute(sql\`...\`)` returns the row array directly (postgres.js). Mirror it for the sweep query. -->
<!-- The at-most-once claim mirrors createPendingHold's "the INSERT is the lock" (units.ts). -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install Inngest + client + env (payment + Inngest keys) — no serve() mount</name>
  <files>package.json, src/inngest/client.ts, .env.example</files>
  <read_first>
    - .planning/phases/05-payments-payouts/05-RESEARCH.md § Standard Stack (Inngest 4.13.0) + § Recommended Project Structure
    - package.json (scripts + deps)
    - .env.example (WHOLE file — the existing var blocks + fail-closed-guard comment style to mirror; NONE of the payment/Inngest vars exist yet, so add all of them)
  </read_first>
  <action>
    1. Install Inngest: run `npm view inngest version` (confirm ~4.13.0 as of plan time) then `npm install inngest`. Add a `dev:inngest` script `"dev:inngest": "npx inngest-cli@latest dev"` (convenience local dev server — no Redis, no worker).
    2. Create `src/inngest/client.ts` — the Inngest client ONLY (the serve() endpoint that consumes INNGEST_SIGNING_KEY is mounted in Plan 05b's route.ts, so no signing-key guard belongs here):
       ```typescript
       import { Inngest } from "inngest";
       export const inngest = new Inngest({ id: "fitout" });
       ```
    3. Add the phase's env template to `.env.example` (none of these exist yet — Plans 01/02 do not touch `.env.example`; this plan is the sole owner). Add a new commented block:
       ```
       # --- Payments config + Inngest (Phase 5 — payout sweep + reconcile) ---------
       # Commission/payout mechanism defaults (Phase 7 can tune without touching plumbing).
       COMMISSION_RATE_BPS=1000
       PAYOUT_DELAY_HOURS=24
       PAYMENT_WINDOW_MINUTES=60
       # PAYOUT_RECONCILE_STUCK_HOURS: threshold past which a still-Processing transfer raises a
       #   stuck-row operator alert (consumed by the reconcile cron in Plan 05b).
       PAYOUT_RECONCILE_STUCK_HOURS=48
       # Platform payout wallet (source_account for inhouse /v2/batch_transfers). BIC defaults to PAEYPHM2XXX.
       PLATFORM_WALLET_NUMBER=
       PLATFORM_WALLET_NAME=
       PLATFORM_WALLET_BIC=PAEYPHM2XXX
       # Inngest (managed cron for the payout sweep + reconcile). Dev server needs no keys;
       #   prod: the /api/inngest serve() endpoint (Plan 05b) verifies requests via INNGEST_SIGNING_KEY.
       INNGEST_EVENT_KEY=
       INNGEST_SIGNING_KEY=
       ```
       (Add only vars not already present — the guard is prod-only in Plan 05b's route.ts; this file is documentation.)
  </action>
  <acceptance_criteria>
    - `inngest` appears in package.json dependencies (grep: `"inngest"`)
    - src/inngest/client.ts exports `inngest` (grep: `export const inngest`)
    - This plan does NOT create `src/app/api/inngest/route.ts` — confirm no such file is added here (Plan 05b owns the serve mount)
    - .env.example contains the Inngest + payment vars (grep: `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`, `COMMISSION_RATE_BPS`, `PAYOUT_DELAY_HOURS`, `PAYOUT_RECONCILE_STUCK_HOURS`, `PLATFORM_WALLET_NUMBER`)
    - `npx tsc --noEmit` exits 0 (client.ts imports only `inngest` — no dangling function/route imports)
  </acceptance_criteria>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>Inngest is installed, the client is created, and the env template documents every Inngest + payment key; no serve() route is mounted yet (Plan 05b wires it after both cron files exist), so tsc is clean.</done>
</task>

<task type="auto">
  <name>Task 2: payout-sweep cron — query due, claim ledger (at-most-once, freeze commission), correlate host wallet, fire inhouse transfer</name>
  <files>src/inngest/functions/payout-sweep.ts</files>
  <read_first>
    - src/lib/availability/units.ts lines 137-282 (the `dbConn.execute(sql\`\`)` raw-SQL idiom + the DB-clock find-free probe + "the INSERT is the lock" at-most-once discipline to mirror)
    - src/lib/payments/commission.ts + config.ts (Plan 01 — computeCommission, PAYOUT_DELAY_HOURS)
    - src/lib/paymongo.ts (Plan 02 — createBatchTransfer, listWalletAccounts; listWalletAccounts returns a GLOBAL list)
    - src/lib/db/schema.ts (Plan 01 — hostPayoutLedger; Phase-2 hostPayout.paymongoAccountId = paymongo_account_id)
    - src/inngest/client.ts (Task 1 — import `inngest` from here)
    - .planning/phases/05-payments-payouts/05-RESEARCH.md § Pattern 3 (ledger at-most-once), § Pattern 4 (sweep query), § Pitfall 2 (transfer status is NOT a webhook event — the reconcile poll in Plan 05b owns Paid/Failed), § Open Questions A2 (wallet enumeration), § Code Examples (batch transfer + sweep skeleton)
  </read_first>
  <action>
    Create `src/inngest/functions/payout-sweep.ts` — the D-56 cron (import `inngest` from `@/inngest/client`, `db` from `@/lib/db`, `sql` from drizzle-orm, `computeCommission`, `PAYOUT_DELAY_HOURS`, `createBatchTransfer`/`listWalletAccounts`, `randomUUID`):

    ```typescript
    export const payoutSweep = inngest.createFunction(
      { id: "payout-sweep", concurrency: 1 },        // singleton — no overlapping sweeps
      { cron: "TZ=Asia/Manila 0 * * * *" },          // hourly, timezone-aware
      async ({ step }) => {
        const due = await step.run("find-due", () => queryDuePayouts());
        for (const b of due) {
          await step.run(`payout-${b.bookingId}`, () => payOne(b));
        }
        return { swept: due.length };
      },
    );
    ```

    - `queryDuePayouts()` runs the Pattern-4 sweep query verbatim (DB clock `now()`, `make_interval(hours => PAYOUT_DELAY_HOURS)`, `p.id IS NULL`, `ORDER BY ends_at ASC LIMIT 100`), aliasing `hp.paymongo_account_id` → `paymongoAccountId`. Export it (or `queryDuePayouts(dbConn)` taking a db so the test can inject an isolated schema).
    - `payOne(b)` — the at-most-once claim + freeze + wallet-correlation + transfer, factored so the test can call it directly with an injected db:
      1. Compute commission: `const { rateBps, commissionCents, netCents } = computeCommission(b.quotedTotalCents)`.
      2. Claim the row (the INSERT is the lock — no app-level "already paid?" check):
         ```sql
         INSERT INTO host_payout_ledger (id, booking_id, host_id, payment_id, gross_cents,
           commission_rate_bps, commission_cents, net_cents, currency, state)
         VALUES (:id, :bookingId, :hostId, :paymentId, :gross, :rateBps, :commission, :net, :currency, 'held')
         ON CONFLICT (booking_id) DO NOTHING RETURNING id
         ```
         Empty RETURNING ⇒ another sweep already owns it ⇒ `return { skipped: true }` (fire NO transfer).
      3. **Resolve the host wallet by CORRELATING it to THIS booking's host — NEVER an arbitrary wallet:**
         ```typescript
         const wallets = (await listWalletAccounts()).filter((w) => w.status === "activated");
         const wallet = wallets.find((w) => w.id === b.paymongoAccountId); // match the host's Linked-Account id (host_payout.paymongo_account_id)
         ```
         - `wallet.id === b.paymongoAccountId` is the primary correlation. (If onboarding instead captured a per-host wallet number, correlate on `w.accountNumber === <stored number>` — verify the correlating field against a live/test `GET /v2/wallets` response per Open Question A2 before UAT; centralize the match in ONE spot.)
         - **If NO wallet matches this host (`!wallet`):** do NOT fire a transfer. Leave the ledger row `held` (the money stays held), raise an operator alert `console.error("[payout-alert] no activated wallet for host", { bookingId: b.bookingId, paymongoAccountId: b.paymongoAccountId })`, and `return { skipped: "no-wallet" }`. NEVER fall through to `wallets[0]` or any other host's wallet.
      4. Fire the transfer to the CORRELATED wallet: `await createBatchTransfer({ netCents, currency: b.currency, bookingId: b.bookingId, description: 'FitOut payout ' + b.bookingId, destination: { number: wallet.accountNumber, name: wallet.accountName } })` with the stable `Idempotency-Key: payout:<bookingId>` (set inside createBatchTransfer).
      5. Mark release: `UPDATE host_payout_ledger SET state='processing', transfer_id=:transferId WHERE booking_id=:bookingId` (Held → Processing; "release" = firing the transfer, D-56). On a transfer throw, set `state='failed'` and `console.error("[payout-alert] transfer create failed", { bookingId: b.bookingId })` (operator; retryable review).
    - Note (Pitfall 2): transfer status is NOT a webhook subscription event — the `Processing → Paid` / `Processing → Failed` transition is owned by the `payout-reconcile` cron (Plan 05b), which polls `GET /v2/transfers/{id}`. This task marks `Processing` on the create; reconcile owns the terminal states. (Consistent with D-56: "release" = firing the transfer.)

    Correctness rests on `UNIQUE(booking_id)` (the claim) + the wallet-to-host correlation, exactly as double-booking rests on the EXCLUDE — never an app-level query-then-insert, never an arbitrary wallet.
  </action>
  <acceptance_criteria>
    - payout-sweep.ts contains `inngest.createFunction`, `{ cron: "TZ=Asia/Manila 0 * * * *" }`, and `concurrency: 1` (grep each)
    - the claim uses `ON CONFLICT (booking_id) DO NOTHING RETURNING id` (grep)
    - the sweep predicate uses `status='confirmed'`, `make_interval(hours =>`, `now()`, and `p.id IS NULL` (grep each)
    - the wallet is correlated to the booking's host: grep shows `=== b.paymongoAccountId` AND a `!wallet` no-match branch that does NOT call createBatchTransfer (grep: `paymongoAccountId`, `no activated wallet`)
    - the transfer sends `netCents` and marks the ledger `state='processing'` with `transfer_id` (grep: `createBatchTransfer`, `processing`, `transfer_id`)
    - commission is frozen from `computeCommission` onto commission_rate_bps + commission_cents (grep: `computeCommission`, `commission_rate_bps`)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>The cron selects only due confirmed bookings, claims each at-most-once while freezing commission, resolves the wallet that belongs to that booking's host (alerting and firing nothing on no-match), and fires an inhouse net transfer moving the ledger to Processing.</done>
</task>

<task type="auto">
  <name>Task 3: Sweep + at-most-once + multi-host correlation + commission-freeze tests</name>
  <files>tests/payments/payout-sweep.test.ts, tests/payments/ledger-freeze.test.ts</files>
  <read_first>
    - tests/paymongo/webhook-merchant-activated.test.ts (isolated-schema harness: setupTestDb, makeHost/makePublishedListing helpers)
    - tests/helpers/db.ts (setupTestDb + makeRacingClients — independent connections for the concurrency proof)
    - tests/helpers/mocks.ts (mockPayMongo — createBatchTransfer/listWalletAccounts stubs added by Plan 02; override with mockResolvedValueOnce). This plan does NOT modify mocks.ts (the getTransfer stub is added in Plan 05b).
    - src/inngest/functions/payout-sweep.ts (Task 2 — queryDuePayouts + payOne exported for injection)
    - .planning/phases/05-payments-payouts/05-VALIDATION.md § Requirement→Test Map (PAY-03 sweep + PAY-02 freeze rows)
  </read_first>
  <action>
    Create `tests/payments/payout-sweep.test.ts` (isolated schema; mock `@/lib/paymongo` with mockPayMongo so createBatchTransfer/listWalletAccounts are stubbed):
      - **Due selection:** Seed a host (activated host_payout, paymongoAccountId='acct_A') + published listing + a `confirmed` booking with quotedTotalCents=200000 and ends_at = now() - (PAYOUT_DELAY_HOURS+1)h. `listWalletAccounts` stubbed to return `[{ id:'acct_A', accountNumber:'9990001111', accountName:'Host A Wallet', status:'activated' }]`. Run queryDuePayouts(db) → the booking is returned; a second `confirmed` booking with ends_at = now() (not yet due) is NOT returned; a `pending` booking is NOT returned.
      - **Happy payout:** Run payOne for the due booking → assert exactly one host_payout_ledger row (state='processing'), commission_cents=20000 (10%), net_cents=180000, transfer_id set, and createBatchTransfer called once with `netCents === 180000` and `destination.number === '9990001111'` (host A's wallet).
      - **At-most-once under concurrency:** use makeRacingClients to run payOne (or the claim INSERT) for the SAME booking on two independent connections concurrently → assert exactly ONE ledger row and createBatchTransfer called at most once for that booking (the ON CONFLICT loser fires no transfer).
      - **Multi-host correlation (wrong-host guard):** Seed host A (acct_A) and host B (acct_B), each with a published listing + a due `confirmed` booking. Stub `listWalletAccounts` to return BOTH activated wallets `[{id:'acct_A',accountNumber:'AAA',...},{id:'acct_B',accountNumber:'BBB',...}]`. Run payOne for booking A → assert createBatchTransfer's `destination.number === 'AAA'` (host A) and NOT 'BBB'. Run payOne for booking B → assert `destination.number === 'BBB'`. Assert neither payout ever addresses the other host's wallet.
      - **No-match (no wrong-host fall-through):** Seed a due `confirmed` booking for host C (paymongoAccountId='acct_C') but stub `listWalletAccounts` to return only host A's/B's wallets (no 'acct_C'). Run payOne → assert createBatchTransfer is NOT called, the ledger row stays `state='held'` (or no processing/transfer_id), and a `[payout-alert]` console.error fired (spy `vi.spyOn(console,'error')`).
      - Never-before-session: a booking with ends_at in the future is never swept (asserted above); document the host-is-never-paid-at-booking-time invariant.

    Create `tests/payments/ledger-freeze.test.ts` (D-51):
      - Seed + sweep a booking at rateBps=1000 → ledger row has commission_rate_bps=1000, commission_cents frozen. Then simulate a later config change (call computeCommission with a DIFFERENT rate, or re-run the sweep) and assert the EXISTING ledger row's commission_rate_bps/commission_cents are UNCHANGED — a rate change never retroactively alters a past payout (the frozen columns win; the UNIQUE(booking_id) prevents a re-claim).
  </action>
  <acceptance_criteria>
    - payout-sweep.test.ts asserts: due-only selection, single ledger row per booking, net_cents=180000 for a 200000 gross at 10%, createBatchTransfer called once, AND the multi-host case that booking A resolves to host A's wallet (not B) plus the no-match no-fire+alert case (grep: `destination`, `[payout-alert]` or `console`, and two distinct host account numbers)
    - the at-most-once test uses makeRacingClients and asserts exactly one ledger row + ≤1 transfer for a duplicate/concurrent sweep
    - ledger-freeze.test.ts asserts a later rate change does NOT alter an existing ledger row's commission_rate_bps/commission_cents
    - `npx vitest run tests/payments/payout-sweep.test.ts tests/payments/ledger-freeze.test.ts` exits 0
  </acceptance_criteria>
  <verify>
    <automated>npx vitest run tests/payments/payout-sweep.test.ts tests/payments/ledger-freeze.test.ts</automated>
  </verify>
  <done>The sweep selects only due bookings, pays each at most once even under concurrent runs, resolves each payout to its OWN host's wallet (never another's, alerting on no-match), and freezes the commission so a later rate change never rewrites a past payout.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| sweep → PayMongo /v2 | Server-only secret + platform wallet; fires real money movement |
| ledger UNIQUE(booking_id) | The at-most-once boundary — the DB, not app code, enforces one payout per booking |
| wallet ↔ host correlation | The resolved wallet MUST belong to the booking's host (wallet.id === paymongo_account_id) — misdelivery boundary |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-23 | Tampering (financial) | A booking paid out twice under duplicate/overlapping sweeps | mitigate | `INSERT ... ON CONFLICT (booking_id) DO NOTHING` claim + `concurrency: 1` singleton + stable `payout:<bookingId>` Idempotency-Key; racing-clients test proves exactly one (Tasks 2/3) |
| T-05-24 | Tampering | Paying the host before the session (funds not held) | mitigate | Sweep predicate `status='confirmed' AND ends_at + PAYOUT_DELAY_HOURS ≤ now()` (DB clock); future/pending bookings never selected (D-55, Tasks 2/3) |
| T-05-25 | Tampering | Host receiving less than gross−10% (gateway fee netted out) or a wrong frozen rate | mitigate | Transfer sends exactly `net_cents`; commission_rate_bps + commission_cents frozen on the ledger (D-51/52, Tasks 2/3) |
| T-05-27 | Availability | Paying out to a non-activated / missing host wallet | mitigate | Resolve only `status==='activated'` wallets; no matching wallet → leave `held`, alert, fire nothing (Task 2) — mirrors the bookability gate discipline |
| T-05-33 | Tampering (financial misdelivery) | Payout landing in the WRONG host's wallet when multiple hosts are activated | mitigate | Correlate the resolved wallet to the booking's host `wallet.id === b.paymongoAccountId` before `createBatchTransfer`; no match ⇒ fire nothing + alert (never `wallets[0]`); multi-host test asserts A→A, B→B, no cross-delivery (Tasks 2/3) |
</threat_model>

<verification>
- `npx vitest run tests/payments/payout-sweep.test.ts tests/payments/ledger-freeze.test.ts` green (due-only, at-most-once racing, multi-host correlation, freeze).
- `npx tsc --noEmit` clean; `inngest` in package.json; `src/inngest/client.ts` exports the client; NO `route.ts` created here (Plan 05b mounts it).
- grep confirms `ON CONFLICT (booking_id) DO NOTHING`, the DB-clock predicate, the `wallet.id === b.paymongoAccountId` correlation, and the `net_cents` transfer.
</verification>

<success_criteria>
- An hourly singleton cron pays each due confirmed booking at most once, freezing commission and transferring exactly net_cents to THAT host's activated wallet (never another host's).
- Funds are held until T+24h post-session; the host is never paid at booking time; a later rate change never rewrites a past payout.
- The Inngest client + sweep function exist and compile; the serve() mount is deferred to Plan 05b so the phase stays tsc-clean at this plan's boundary.
</success_criteria>

<output>
After completion, create `.planning/phases/05-payments-payouts/05-05a-SUMMARY.md` (record the sweep cron cadence/timezone, the exact claim SQL, the wallet-to-host correlation field chosen (`wallet.id === paymongo_account_id` vs a stored number), the env keys added, and the operator-alert `[payout-alert]` tag ops should watch — note Plan 05b consumes `PAYOUT_RECONCILE_STUCK_HOURS` and mounts the serve route).
</output>
