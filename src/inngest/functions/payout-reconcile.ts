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
// so a silently-stranded payout (a host never paid) can never occur (mitigates T-05-28). Likewise a row
// stuck `held` beyond the same threshold — a sweep claim that never released (CR-01) — raises a [payout-alert].
//
// IDEMPOTENCY (mirrors the sweep's "the INSERT is the lock"): every UPDATE is guarded by
// `AND state='processing'`. A re-run on an already-terminal (paid/failed/refunded) row touches 0 rows —
// paid_at is never rewritten, a terminal row is never reopened. The guard, not an app-level "already
// paid?" read, is the authority — exactly as the ON CONFLICT is for the sweep and the EXCLUDE for booking.
//
// KIND SCOPING (Phase 7, D-71 / 07-RESEARCH Finding 3): EVERY query in this file carries
// `AND kind = 'payout'`. A `host_cancel_fee` row is a signed DEBIT that never transfers — it is inserted
// `held` and stays there until netted against a future payout by the sweep. Unscoped, it would be polled
// as if it had a transfer AND would trip the stuck-`held` alert on every single host cancellation.
//
// SUSPENSION SCOPING (Phase 18, ENF-02 / D-222 / D-234): the suspension freeze itself lives in
// `payout-sweep.ts` as a PRE-CLAIM predicate (its invariant 4), so a suspended host normally owns no
// ledger row for this file to see. What lives HERE is a NARROW mirror on the stuck-`held` alert only —
// for the row that was already claimed when the suspension landed (the CR-01 crash window). The
// Processing poll is deliberately NOT mirrored: that money has already left the platform wallet, and a
// stranded transfer must page an operator whether or not its host is suspended.
//
// DB CLOCK for the terminal timestamp (`paid_at = now()`), an injectable-free discipline matching the
// sweep + Phase-4 lazy-expiry; only the stuck-age comparison uses createdAt vs Date.now() (advisory alert
// timing, not a money-moving decision).

import { sql } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import type { DbConn } from "@/lib/availability/read-model";
import { findHostPayoutTransfers, getTransfer, getManualTransferDetails } from "@/lib/paymongo";
import { matchesManualTransfer } from "@/lib/payments/manual-host-payout";
import { decryptPayoutRecipientValue } from "@/lib/payout-recipient-crypto";
import { recordMoneyException, type PayoutExceptionCause } from "@/lib/payments/payout-exceptions";

/**
 * How long a payout may sit `processing` before the reconcile raises a stuck-row operator alert (config,
 * not a literal — sole-owned in .env.example by Plan 05a). 48h default: comfortably past the T+24h sweep
 * cadence + normal PayMongo settlement, so a genuinely stuck transfer stands out.
 */
const RECONCILE_STUCK_HOURS = Number(process.env.PAYOUT_RECONCILE_STUCK_HOURS ?? 48);

/** A single Processing ledger row the reconcile polls (booking_id is the ledger's unique key). */
export type ProcessingLedgerRow = {
  bookingId: string;
  transferId: string | null;
  createdAt: Date | string;
};

/** The per-row reconcile outcome (JSON-serializable for the Inngest step boundary). */
export type ReconcileResult = { bookingId: string; state: "paid" | "failed" | "processing" | "held" };

/** Durable, deduplicated handoff to the existing unresolved money-alert digest. */
export async function recordPayoutException(
  dbConn: DbConn, bookingId: string, reason: string,
): Promise<void> {
  const causes: Record<string, PayoutExceptionCause> = {
    reference_unresolved: "transfer_outcome_uncertain",
    reference_read_unavailable: "transfer_read_unavailable",
    transfer_read_unavailable: "transfer_read_unavailable",
    transfer_read_mismatch: "transfer_outcome_uncertain",
    settlement_reversed_after_claim: "settlement_returned",
    create_outcome_uncertain: "transfer_outcome_uncertain",
  };
  await recordMoneyException(dbConn, bookingId, causes[reason] ?? "transfer_outcome_uncertain");
}

/**
 * Map a PayMongo /v2 transfer status onto a ledger terminal state.
 *
 * ⚠️ A4 (beta/thinly-documented enum): VERIFY these values against a captured test-mode
 * `GET /v2/transfers/{id}` response before UAT. The DEFAULT is deliberately safe — any status NOT in the
 * two known-terminal sets stays `processing`, so an unrecognized or in-flight value can NEVER spuriously
 * flip a payout to Paid (the money-critical direction). Widen the sets only against a verified response.
 */
export function mapTransferStatus(status: string): "paid" | "failed" | "processing" {
  if (status === "succeeded") return "paid";
  if (status === "failed") return "failed";
  return "processing"; // unknown / in-flight (pending, processing, …) — never spuriously Paid
}

/**
 * The Processing rows to reconcile: `state='processing'` with a `transfer_id` set (the sweep sets both on
 * release). ORDER BY created_at ASC + LIMIT bounds a single pass. Takes an explicit `dbConn` so a test can
 * inject an isolated-schema db; defaults to the prod `db`.
 *
 * ⚠️ THIS PREDICATE CARRIES NO SUSPENSION EXCLUSION, AND MUST NOT — do not "complete" the ENF-02 mirror
 * that `alertStuckHeld` carries. A Processing row means the transfer ALREADY FIRED and the money has
 * ALREADY LEFT the platform wallet; a stranded one is a real operator case whether or not the host was
 * suspended afterwards, and suspending a host must never silence it. The freeze is on the HELD predicate
 * only (payout-sweep.ts invariant 4 + alertStuckHeld below). `tests/payments/payout-suspension-freeze.test.ts`
 * pins this with a case that FAILS if the exclusion is ever extended here.
 */
export async function queryProcessingLedger(dbConn: DbConn = db): Promise<ProcessingLedgerRow[]> {
  return (await dbConn.execute(sql`
    SELECT booking_id AS "bookingId", transfer_id AS "transferId", created_at AS "createdAt"
    FROM host_payout_ledger l
    WHERE kind = 'payout' AND (
      (state = 'processing' AND transfer_id IS NOT NULL)
      OR (state = 'held' AND transfer_id IS NULL AND NOT EXISTS (
        SELECT 1 FROM manual_host_payout_attempt m WHERE m.claim_id = l.id
      ))
    )
      AND NOT EXISTS (SELECT 1 FROM manual_host_payout_attempt m
        WHERE m.claim_id = l.id AND m.state LIKE 'api_%')
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
  const current = (await dbConn.execute(sql`
    SELECT state, transfer_id AS "transferId", net_cents AS "netCents",
      recovered_cents AS "recoveredCents", currency, created_at AS "createdAt"
    FROM host_payout_ledger
    WHERE booking_id = ${row.bookingId} AND kind = 'payout'
  `)) as unknown as Array<{ state: string; transferId: string | null;
    netCents: number; recoveredCents: number; currency: string; createdAt: Date }>;
  const claim = current[0];
  if (!claim || (claim.state !== "held" && claim.state !== "processing")) {
    return { bookingId: row.bookingId,
      state: claim?.state === "paid" ? "paid" : claim?.state === "failed" ? "failed" : "held" };
  }
  let transferId = claim.transferId;
  if (!transferId) {
    try {
      const candidates = await findHostPayoutTransfers(row.bookingId);
      const expected = `host-payout-${row.bookingId}`;
      if (candidates.length !== 1 || !candidates[0].id ||
          candidates[0].referenceNumber !== expected ||
          candidates[0].amount !== claim.netCents - claim.recoveredCents ||
          candidates[0].currency?.toLowerCase() !== claim.currency.toLowerCase()) {
        console.error("[payout-alert] payout reference unresolved", {
          bookingId: row.bookingId, matchCount: candidates.length,
        });
        await recordPayoutException(dbConn, row.bookingId, "reference_unresolved");
        return { bookingId: row.bookingId, state: "held" };
      }
      transferId = candidates[0].id;
      const claimed = (await dbConn.execute(sql`
        UPDATE host_payout_ledger SET state = 'processing', transfer_id = ${transferId}, updated_at = now()
        WHERE booking_id = ${row.bookingId} AND kind = 'payout'
          AND state = 'held' AND transfer_id IS NULL
        RETURNING id
      `)) as unknown as Array<{ id: string }>;
      if (claimed.length === 0) return { bookingId: row.bookingId, state: "processing" };
    } catch {
      console.error("[payout-alert] payout reference read unavailable", { bookingId: row.bookingId });
      await recordPayoutException(dbConn, row.bookingId, "reference_read_unavailable");
      return { bookingId: row.bookingId, state: "held" };
    }
  }
  if (!transferId) return { bookingId: row.bookingId, state: "processing" };
  const manualRows = (await dbConn.execute(sql`
    SELECT a.amount_cents AS "amountCents", a.max_debit_cents AS "maxDebitCents",
      a.created_at AS "createdAt", a.institution_bic AS bic,
      a.account_name_ciphertext AS "nameCiphertext", a.account_number_ciphertext AS "numberCiphertext",
      a.transfer_id AS "transferId"
    FROM manual_host_payout_attempt a WHERE a.booking_id = ${row.bookingId} LIMIT 1
  `)) as unknown as Array<{ amountCents: number; maxDebitCents: number; createdAt: Date;
    bic: string; nameCiphertext: string; numberCiphertext: string; transferId: string | null }>;
  const manual = manualRows[0];
  let tr: Awaited<ReturnType<typeof getTransfer>>;
  try {
    if (manual) {
      const detail = await getManualTransferDetails(transferId);
      if (manual.transferId !== transferId || !matchesManualTransfer(detail, {
        amountCents: manual.amountCents, maxDebitCents: manual.maxDebitCents,
        merchantId: process.env.PAYMONGO_ORGANIZATION_ID ?? "", createdAt: new Date(manual.createdAt),
        source: { number: process.env.PLATFORM_WALLET_NUMBER ?? "",
          name: process.env.PLATFORM_WALLET_NAME ?? "", bic: "PAEYPHM2XXX" },
        destination: { number: decryptPayoutRecipientValue(manual.numberCiphertext),
          name: decryptPayoutRecipientValue(manual.nameCiphertext), bic: manual.bic },
      })) {
        await recordPayoutException(dbConn, row.bookingId, "transfer_read_mismatch");
        return { bookingId: row.bookingId, state: "processing" };
      }
      tr = { id: detail.id, status: detail.status, amount: detail.amountCents,
        currency: detail.currency };
    } else {
      tr = await getTransfer(transferId);
    }
  } catch {
    console.error("[payout-alert] transfer read unavailable", { bookingId: row.bookingId, transferId });
    await recordPayoutException(dbConn, row.bookingId, "transfer_read_unavailable");
    return { bookingId: row.bookingId, state: "processing" };
  }
  if (tr.id !== transferId || (!manual && tr.referenceNumber !== `host-payout-${row.bookingId}`) ||
      tr.amount !== claim.netCents - claim.recoveredCents ||
      tr.currency?.toLowerCase() !== claim.currency.toLowerCase()) {
    console.error("[payout-alert] transfer read mismatch", { bookingId: row.bookingId, transferId });
    await recordPayoutException(dbConn, row.bookingId, "transfer_read_mismatch");
    return { bookingId: row.bookingId, state: "processing" };
  }
  const reversal = (await dbConn.execute(sql`
    SELECT o.provider_status AS status
    FROM booking_settlement_current c
    JOIN booking_settlement_observation o ON o.id = c.observation_id
    WHERE c.booking_id = ${row.bookingId} AND o.provider_status IN ('returned', 'cancelled')
    LIMIT 1
  `)) as unknown as Array<{ status: string }>;
  if (reversal.length) {
    console.error("[payout-alert] settlement reversed after transfer claim", {
      bookingId: row.bookingId, transferId,
    });
    await recordPayoutException(dbConn, row.bookingId, "settlement_reversed_after_claim");
  }
  const next = mapTransferStatus(tr.status);

  if (next === "paid") {
    // Terminal success → release the ledger to Paid. `AND state='processing'` ⇒ 0 rows if already terminal.
    await dbConn.execute(sql`
      UPDATE host_payout_ledger SET state='paid', paid_at=now()
      WHERE booking_id=${row.bookingId} AND kind='payout' AND state='processing'
        AND transfer_id=${transferId}
    `);
    return { bookingId: row.bookingId, state: "paid" };
  }

  if (next === "failed") {
    // Terminal failure → mark Failed (idempotent) + operator alert (a payout needs human review).
    await dbConn.execute(sql`
      UPDATE host_payout_ledger SET state='failed'
      WHERE booking_id=${row.bookingId} AND kind='payout' AND state='processing'
        AND transfer_id=${transferId}
    `);
    console.error("[payout-alert] transfer failed", {
      bookingId: row.bookingId,
      transferId,
      status: tr.status,
    });
    await recordMoneyException(dbConn, row.bookingId, "transfer_failed");
    return { bookingId: row.bookingId, state: "failed" };
  }

  // Unknown / in-flight: stay processing (never spuriously Paid). If it has been stuck too long, alert.
  const ageHours = (Date.now() - new Date(row.createdAt).getTime()) / 3_600_000;
  if (ageHours > RECONCILE_STUCK_HOURS) {
    console.error("[payout-alert] transfer stuck processing", {
      bookingId: row.bookingId,
      transferId,
      ageHours,
    });
    await recordMoneyException(dbConn, row.bookingId, "transfer_stuck");
  }
  return { bookingId: row.bookingId, state: "processing" };
}

/**
 * CR-01 stuck-`held` operator alert (mirrors the stuck-`processing` alert). After the sweep's CR-01 rework a
 * `held` row is transient — a claim is released to `processing`/`failed` (or rolled back on no-wallet) within
 * one pass — so a `held` row lingering past PAYOUT_RECONCILE_STUCK_HOURS means a hard crash between claim and
 * release. The money is still on the platform wallet (never mis-sent), so we do NOT auto-move it; we surface
 * it for an operator so no ledger row can silently sit un-paid (T-05-28). Explicit `dbConn` for isolated-
 * schema tests. Returns the count of stuck-held rows found (for the cron's summary).
 *
 * ENF-02 / D-234 (phase 18): this is the ONE query in the payout pair that mirrors the sweep's suspension
 * freeze, and only for the crash-window row — see the predicate. The sweep's freeze is pre-claim, so a
 * suspended host normally has no ledger row here at all; the mirror exists for the row that was already
 * `held` when the suspension landed.
 */
export async function alertStuckHeld(dbConn: DbConn = db): Promise<number> {
  const rows = (await dbConn.execute(sql`
    SELECT p.booking_id AS "bookingId", p.created_at AS "createdAt"
    FROM host_payout_ledger p
    -- ENF-02 / D-234 (phase 18) — the SUSPENSION mirror, and it is genuinely new SQL: this query read
    -- the ledger with no host join at all. host_payout_ledger carries host_id DIRECTLY, so the join
    -- needs no listing hop. LEFT, not INNER: a host with NO host_verification row is the common case
    -- and must still be alerted on. Aliased because host_verification also has a created_at.
    LEFT JOIN host_verification hv ON hv.user_id = p.host_id
    -- Finding 3 / Pitfall 7 — a host_cancel_fee DEBIT row is inserted as 'held' and stays there until
    -- fully netted. Without this kind scope it would fire a FALSE [payout-alert] on every host
    -- cancellation, and operators who learn to ignore the channel will miss a real transfer failure.
    WHERE p.kind = 'payout' AND p.state = 'held'
      -- The SAME reasoning, one enum along. payout-sweep's freeze is PRE-CLAIM, so a suspended host
      -- can own a held row in exactly ONE case: it was ALREADY held when the suspension landed — the
      -- CR-01 crash window between claim and release, described above. Left alone it would age past
      -- the stuck threshold and page an operator about a payout that is deliberately frozen. This is
      -- a NARROW mirror of a filter that mostly does its work elsewhere, not a second freeze. Polarity
      -- note: the sell-gate enumerates POSITIVE values so a missing row fails closed; this is the
      -- opposite question, so a host nobody has checked is NOT suspended and their stuck row still pages.
      AND COALESCE(hv.status::text, 'unverified') <> 'suspended'
      AND p.created_at <= now() - make_interval(hours => ${RECONCILE_STUCK_HOURS}::int)
    ORDER BY p.created_at ASC
    LIMIT 200
  `)) as unknown as { bookingId: string; createdAt: Date | string }[];
  for (const r of rows) {
    console.error("[payout-alert] payout stuck held", {
      bookingId: r.bookingId,
      createdAt: r.createdAt,
    });
    await recordMoneyException(dbConn, r.bookingId, "transfer_stuck");
  }
  return rows.length;
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
    // CR-01: surface any ledger row stuck `held` (a sweep claim that never released) so no payout can
    // silently sit un-paid — even a hard crash between claim and release is caught by the next pass.
    const stuckHeld = await step.run("alert-stuck-held", () => alertStuckHeld(db));
    return { reconciled: inflight.length, stuckHeld };
  },
);
