// The payout RECONCILE cron (D-59, PAY-03) — the SECOND async-scheduled job, the terminal half of the
// `Held → Processing → Paid/Failed` payout lifecycle the Plan-05a sweep opens.
//
// WHY THIS EXISTS (Research Pitfall 2): PayMongo has NO transfer/payout webhook subscription event — the
// create-a-webhook enum carries no transfer/payout/disbursement events. So a transfer's terminal status
// can only be learned by POLLING `GET /v2/transfers/{id}`. This cron polls every `processing` ledger row
// (each already carries the `transfer_id` the sweep set on release) and moves it:
//   processing → paid    (paid_at = now())  when the transfer reports a terminal success
//   processing → failed                     when the transfer reports a terminal failure  + [payout-alert]
//   processing → processing (unchanged)     for any unknown/in-flight status — NEVER a spurious Paid
// A row that has been stuck `processing` beyond PAYOUT_RECONCILE_STUCK_HOURS also raises a [payout-alert]
// so a silently-stranded payout (a host never paid) can never occur (mitigates T-05-28).
//
// IDEMPOTENCY (mirrors the sweep's "the INSERT is the lock"): every UPDATE is guarded by
// `AND state='processing'`. A re-run on an already-terminal (paid/failed/refunded) row touches 0 rows —
// paid_at is never rewritten, a terminal row is never reopened. The guard, not an app-level "already
// paid?" read, is the authority — exactly as the ON CONFLICT is for the sweep and the EXCLUDE for booking.
//
// DB CLOCK for the terminal timestamp (`paid_at = now()`), an injectable-free discipline matching the
// sweep + Phase-4 lazy-expiry; only the stuck-age comparison uses createdAt vs Date.now() (advisory alert
// timing, not a money-moving decision).

import { sql } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import type { DbConn } from "@/lib/availability/read-model";
import { getTransfer } from "@/lib/paymongo";

/**
 * How long a payout may sit `processing` before the reconcile raises a stuck-row operator alert (config,
 * not a literal — sole-owned in .env.example by Plan 05a). 48h default: comfortably past the T+24h sweep
 * cadence + normal PayMongo settlement, so a genuinely stuck transfer stands out.
 */
const RECONCILE_STUCK_HOURS = Number(process.env.PAYOUT_RECONCILE_STUCK_HOURS ?? 48);

/** A single Processing ledger row the reconcile polls (booking_id is the ledger's unique key). */
export type ProcessingLedgerRow = {
  bookingId: string;
  transferId: string;
  createdAt: Date | string;
};

/** The per-row reconcile outcome (JSON-serializable for the Inngest step boundary). */
export type ReconcileResult = { bookingId: string; state: "paid" | "failed" | "processing" };

/**
 * Map a PayMongo /v2 transfer status onto a ledger terminal state.
 *
 * ⚠️ A4 (beta/thinly-documented enum): VERIFY these values against a captured test-mode
 * `GET /v2/transfers/{id}` response before UAT. The DEFAULT is deliberately safe — any status NOT in the
 * two known-terminal sets stays `processing`, so an unrecognized or in-flight value can NEVER spuriously
 * flip a payout to Paid (the money-critical direction). Widen the sets only against a verified response.
 */
export function mapTransferStatus(status: string): "paid" | "failed" | "processing" {
  if (["succeeded", "completed", "paid"].includes(status)) return "paid";
  if (["failed", "returned", "cancelled"].includes(status)) return "failed";
  return "processing"; // unknown / in-flight (pending, processing, …) — never spuriously Paid
}

/**
 * The Processing rows to reconcile: `state='processing'` with a `transfer_id` set (the sweep sets both on
 * release). ORDER BY created_at ASC + LIMIT bounds a single pass. Takes an explicit `dbConn` so a test can
 * inject an isolated-schema db; defaults to the prod `db`.
 */
export async function queryProcessingLedger(dbConn: DbConn = db): Promise<ProcessingLedgerRow[]> {
  return (await dbConn.execute(sql`
    SELECT booking_id AS "bookingId", transfer_id AS "transferId", created_at AS "createdAt"
    FROM host_payout_ledger
    WHERE state = 'processing' AND transfer_id IS NOT NULL
    ORDER BY created_at ASC
    LIMIT 200
  `)) as unknown as ProcessingLedgerRow[];
}

/**
 * Reconcile ONE Processing row: poll its transfer, then advance the ledger. Every UPDATE is guarded by
 * `AND state='processing'` so a re-run on an already-terminal row is a 0-row no-op (idempotent). A terminal
 * `failed` AND a row stuck-processing beyond PAYOUT_RECONCILE_STUCK_HOURS each emit a `[payout-alert]` line
 * so a stranded payout always surfaces an operator signal (T-05-28). Factored to take an explicit `dbConn`
 * for isolated-schema tests.
 */
export async function reconcileOne(
  row: ProcessingLedgerRow,
  dbConn: DbConn = db,
): Promise<ReconcileResult> {
  const tr = await getTransfer(row.transferId);
  const next = mapTransferStatus(tr.status);

  if (next === "paid") {
    // Terminal success → release the ledger to Paid. `AND state='processing'` ⇒ 0 rows if already terminal.
    await dbConn.execute(sql`
      UPDATE host_payout_ledger SET state='paid', paid_at=now()
      WHERE booking_id=${row.bookingId} AND state='processing'
    `);
    return { bookingId: row.bookingId, state: "paid" };
  }

  if (next === "failed") {
    // Terminal failure → mark Failed (idempotent) + operator alert (a payout needs human review).
    await dbConn.execute(sql`
      UPDATE host_payout_ledger SET state='failed'
      WHERE booking_id=${row.bookingId} AND state='processing'
    `);
    console.error("[payout-alert] transfer failed", {
      bookingId: row.bookingId,
      transferId: row.transferId,
      status: tr.status,
    });
    return { bookingId: row.bookingId, state: "failed" };
  }

  // Unknown / in-flight: stay processing (never spuriously Paid). If it has been stuck too long, alert.
  const ageHours = (Date.now() - new Date(row.createdAt).getTime()) / 3_600_000;
  if (ageHours > RECONCILE_STUCK_HOURS) {
    console.error("[payout-alert] transfer stuck processing", {
      bookingId: row.bookingId,
      transferId: row.transferId,
      ageHours,
    });
  }
  return { bookingId: row.bookingId, state: "processing" };
}

/**
 * The D-59 payout reconcile: an hourly, timezone-aware, SINGLETON (`concurrency: 1`) cron, offset 30m from
 * the Plan-05a sweep so the two never contend. Each Processing row is reconciled inside its OWN Inngest
 * step so a mid-batch failure retries just that row, never the whole pass.
 */
// NOTE: inngest 4.13.0 uses the 2-arg createFunction(options, handler) form — the cron trigger lives in
// options.triggers (the older 3-arg `(config, trigger, handler)` skeleton in the plan/RESEARCH predates
// this API; same Rule-3 fix Plan 05a applied to payout-sweep.ts).
export const payoutReconcile = inngest.createFunction(
  {
    id: "payout-reconcile",
    concurrency: 1, // singleton — no overlapping reconcile passes
    triggers: [{ cron: "TZ=Asia/Manila 30 * * * *" }], // hourly, offset 30m from the sweep
  },
  async ({ step }) => {
    const inflight = await step.run("find-processing", () => queryProcessingLedger(db));
    for (const row of inflight) {
      await step.run(`reconcile-${row.bookingId}`, () => reconcileOne(row, db));
    }
    return { reconciled: inflight.length };
  },
);
