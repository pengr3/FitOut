// The T+24h host-payout sweep cron (D-55/D-56, PAY-03/PAY-02) — the FIRST async-scheduled job in the
// codebase. Hourly (timezone-aware), it finds `confirmed` bookings whose session ended ≥ PAYOUT_DELAY_HOURS
// ago with NO payout row yet, claims each at-most-once with an `INSERT ... ON CONFLICT (booking_id, kind)
// DO NOTHING` ledger row that FREEZES the applied commission (D-51), CORRELATES the payout wallet to THAT
// booking's host (wallet.id === host_payout.paymongo_account_id — NEVER an arbitrary wallet), and fires an
// inhouse `/v2/batch_transfers` of exactly `net_cents` (D-52), moving the ledger Held → Processing.
//
// CORRECTNESS RESTS ON TWO DB-LEVEL INVARIANTS, exactly as double-booking rests on the GiST EXCLUDE:
//   1. `UNIQUE(booking_id, kind)` on host_payout_ledger — the INSERT itself is the at-most-once lock
//      (mirrors createPendingHold's "the INSERT is the lock", units.ts). There is deliberately NO app-level
//      "already paid out?" query-then-insert — that is the exact race the constraint exists to kill.
//      Phase 7 (D-71/drizzle-0014) WIDENED this gate from UNIQUE(booking_id) so a booking can also carry
//      one signed `host_cancel_fee` debit row. The payout guarantee is UNCHANGED: this INSERT omits `kind`,
//      so the NOT NULL DEFAULT 'payout' applies before conflict resolution and the arbiter matches the
//      composite index — at most one kind='payout' row per booking, exactly as before.
//   2. `wallet.id === b.paymongoAccountId` — the payout can ONLY address the booking's own host's wallet.
//      No match ⇒ ROLL THE CLAIM BACK (retry next sweep) + operator alert + fire NOTHING (never wallets[0],
//      never cross-pay). CR-01: a `held` row is never a dead end — any post-claim failure becomes `failed`.
//
// DB CLOCK, not an injectable JS clock: the due predicate uses Postgres `now()` (mirrors the Phase-4
// lazy-expiry discipline). Never pays before the session — funds are held until T+24h post endsAt.
//
// PITFALL 2 (Research): a transfer's status is NOT a webhook subscription event. This file marks the
// ledger `processing` on a successful create ("release" = firing the transfer, D-56); the terminal
// `processing → paid/failed` reconciliation is owned by the `payout-reconcile` cron in Plan 05b (which
// polls GET /v2/transfers/{id}). The `/api/inngest` serve() mount is also Plan 05b.

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import type { DbConn } from "@/lib/availability/read-model";
import { computeCommission } from "@/lib/payments/commission";
import {
  PAYOUT_DELAY_HOURS,
  PAYOUT_RETRY_BACKOFF_HOURS,
  PAYOUT_RETRY_MAX_AGE_HOURS,
} from "@/lib/payments/config";
import { createBatchTransfer, listWalletAccounts } from "@/lib/paymongo";

/** How many due bookings a single sweep pass claims (coarse T+24h cadence — one pass drains the backlog). */
const SWEEP_BATCH_SIZE = 100;

/** A booking whose session has ended ≥ PAYOUT_DELAY_HOURS ago with no payout ledger row yet. */
export type DuePayout = {
  bookingId: string;
  listingId: string;
  quotedTotalCents: number;
  currency: string;
  hostId: string;
  /** PayMongo pay_... captured at confirm (may be null on legacy rows). */
  paymentId: string | null;
  /** The host's PayMongo Linked-Account id — the wallet is CORRELATED against this (never [0]). */
  paymongoAccountId: string | null;
};

/** The per-booking outcome of a payout attempt (JSON-serializable for the Inngest step boundary). */
export type PayOneResult =
  | { status: "paid"; transferId: string; netCents: number }
  | { status: "skipped-claimed" } // another (concurrent/prior) sweep already owns this booking
  | { status: "skipped-no-wallet" } // no activated wallet correlates → claim rolled back; retry next sweep
  | { status: "failed"; error: string }; // the transfer create threw → ledger marked failed (retry review)

/**
 * The RESEARCH Pattern-4 sweep query: `confirmed` bookings whose session ended ≥ PAYOUT_DELAY_HOURS ago
 * (DB clock `now()`, not a JS clock) that are eligible for a payout attempt. A booking is eligible when it
 * has NO payout row yet (`p.id IS NULL`) OR — WR-04 bounded retry — its row is `failed`, the retry backoff
 * has elapsed (`updated_at` ≥ PAYOUT_RETRY_BACKOFF_HOURS ago), and its ORIGINAL claim is still within
 * PAYOUT_RETRY_MAX_AGE_HOURS (so a transient PayMongo error recovers automatically without retrying forever).
 * `hp.paymongo_account_id` is aliased → `paymongoAccountId` so the caller can correlate the wallet. Takes an
 * explicit `dbConn` so a test can inject an isolated-schema db.
 */
export async function queryDuePayouts(dbConn: DbConn): Promise<DuePayout[]> {
  const rows = (await dbConn.execute(sql`
    SELECT b.id AS "bookingId", b.listing_id AS "listingId", b.quoted_total_cents AS "quotedTotalCents",
           b.currency AS "currency", b.payment_id AS "paymentId",
           l.host_id AS "hostId", hp.paymongo_account_id AS "paymongoAccountId"
    FROM booking b
    JOIN listing l ON l.id = b.listing_id
    JOIN host_payout hp ON hp.user_id = l.host_id
    LEFT JOIN host_payout_ledger p ON p.booking_id = b.id
    WHERE b.status = 'confirmed'
      AND b.ends_at + make_interval(hours => ${PAYOUT_DELAY_HOURS}::int) <= now()
      AND (
        p.id IS NULL
        OR (
          p.state = 'failed'
          AND p.updated_at <= now() - make_interval(hours => ${PAYOUT_RETRY_BACKOFF_HOURS}::int)
          AND p.created_at >= now() - make_interval(hours => ${PAYOUT_RETRY_MAX_AGE_HOURS}::int)
        )
      )
    ORDER BY b.ends_at ASC
    LIMIT ${SWEEP_BATCH_SIZE}
  `)) as unknown as DuePayout[];
  return rows;
}

/**
 * Pay a single due booking, at-most-once. The order is load-bearing:
 *   1. FREEZE the commission (rate + amount) from the server-frozen gross (D-51) — a later rate change
 *      must never rewrite this row.
 *   2. CLAIM the ledger row: the INSERT is the lock. `ON CONFLICT (booking_id, kind) DO NOTHING RETURNING
 *      id` — an empty RETURNING means another sweep already owns this booking ⇒ fire NOTHING.
 *   3. CORRELATE the wallet to THIS booking's host (`wallet.id === b.paymongoAccountId`). No match ⇒ ROLL
 *      THE CLAIM BACK (so a later sweep retries), alert, fire NOTHING — NEVER wallets[0] or a wrong host.
 *   4. FIRE the inhouse transfer of exactly `net_cents` (D-52) to the correlated wallet.
 *   5. RELEASE: move the ledger Held → Processing with the transfer id. ANY post-claim failure (wallet
 *      lookup OR transfer throw) is caught and marked `failed` + alerted (CR-01: a `held` row is never a
 *      dead end).
 *
 * Factored to take an explicit `dbConn` so a test can drive it against an isolated schema / racing clients.
 */
export async function payOne(dbConn: DbConn, b: DuePayout): Promise<PayOneResult> {
  // (1) Freeze the applied commission from the SERVER-FROZEN gross (never a client number).
  const { rateBps, commissionCents, netCents } = computeCommission(b.quotedTotalCents);

  // (2) Claim the row — the INSERT itself is the at-most-once lock (no app-level "already paid?" check). The
  //     ON CONFLICT DO UPDATE re-claims a `failed` row (WR-04 bounded retry: failed → held for a fresh
  //     attempt) while KEEPING the FROZEN commission columns from the original claim (D-51 — only state +
  //     updated_at change). For a held/processing/paid/refunded conflict the `WHERE state='failed'` is false,
  //     so no row is updated and RETURNING is empty ⇒ at-most-once still holds (a concurrent duplicate or an
  //     already-progressed booking fires nothing — same guarantee as the former DO NOTHING).
  const claimId = randomUUID();
  const claimed = (await dbConn.execute(sql`
    INSERT INTO host_payout_ledger (id, booking_id, host_id, payment_id, gross_cents,
      commission_rate_bps, commission_cents, net_cents, currency, state)
    VALUES (${claimId}, ${b.bookingId}, ${b.hostId}, ${b.paymentId}, ${b.quotedTotalCents},
      ${rateBps}, ${commissionCents}, ${netCents}, ${b.currency}, 'held')
    ON CONFLICT (booking_id, kind) DO UPDATE
      SET state = 'held', updated_at = now()
      WHERE host_payout_ledger.state = 'failed'
    RETURNING id
  `)) as unknown as { id: string }[];
  if (claimed.length === 0) return { status: "skipped-claimed" }; // owned by another sweep / already progressed → fire nothing

  // CR-01: everything AFTER the claim is GUARDED — a `held` row must NEVER become a silent dead end. The
  // wallet lookup lives INSIDE the try so a listWalletAccounts() throw can't strand a `held` row, and the
  // catch turns ANY post-claim failure into a `failed` row (alerted + surfaced), never a permanent `held`.
  try {
    // (3) Resolve the payout wallet by CORRELATING it to THIS booking's host — NEVER an arbitrary wallet.
    const wallets = (await listWalletAccounts()).filter((w) => w.status === "activated");
    const wallet = wallets.find((w) => w.id === b.paymongoAccountId); // match the host's Linked-Account id
    if (!wallet) {
      // No wallet belongs to this host YET. The money must NOT be released — but leaving the `held` claim in
      // place makes the booking a permanent dead end (queryDuePayouts never re-selects a booking that already
      // has a ledger row). ROLL THE CLAIM BACK so a later sweep retries once the host finishes/reactivates
      // onboarding. The money never left the platform wallet, so this stays fail-closed. Alert; fire nothing.
      await dbConn.execute(sql`
        DELETE FROM host_payout_ledger
        WHERE booking_id = ${b.bookingId} AND state = 'held' AND transfer_id IS NULL
      `);
      console.error("[payout-alert] no activated wallet for host", {
        bookingId: b.bookingId,
        paymongoAccountId: b.paymongoAccountId,
      });
      return { status: "skipped-no-wallet" };
    }

    // (4) Fire the inhouse net transfer to the CORRELATED wallet (Idempotency-Key payout:<bookingId> is set
    //     inside createBatchTransfer). (5) On success, RELEASE Held → Processing.
    const transfer = await createBatchTransfer({
      netCents,
      currency: b.currency,
      bookingId: b.bookingId,
      description: `FitOut payout ${b.bookingId}`,
      destination: { number: wallet.accountNumber, name: wallet.accountName },
    });
    await dbConn.execute(sql`
      UPDATE host_payout_ledger
      SET state = 'processing', transfer_id = ${transfer.transferId}, updated_at = now()
      WHERE booking_id = ${b.bookingId}
    `);
    return { status: "paid", transferId: transfer.transferId, netCents };
  } catch (err) {
    // ANY post-claim failure (wallet-lookup throw OR transfer throw) → mark the claim `failed`, never leave a
    // silent `held`. `WHERE state='held'` keeps this idempotent (a re-run touches 0 rows). The reconcile
    // stuck-held alert surfaces anything left behind, and a `failed` row is operator-reviewable / retryable.
    await dbConn.execute(sql`
      UPDATE host_payout_ledger SET state = 'failed', updated_at = now()
      WHERE booking_id = ${b.bookingId} AND state = 'held'
    `);
    console.error("[payout-alert] payout attempt failed", {
      bookingId: b.bookingId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * The D-56 payout sweep: an hourly, timezone-aware, SINGLETON (`concurrency: 1`) cron. Each due booking is
 * paid inside its OWN Inngest step so a mid-batch failure retries just that booking, never the whole sweep.
 */
// NOTE: inngest 4.13.0 uses the 2-arg createFunction(options, handler) form — the cron trigger lives in
// options.triggers (the older 3-arg `(config, trigger, handler)` skeleton in RESEARCH predates this API).
export const payoutSweep = inngest.createFunction(
  {
    id: "payout-sweep",
    concurrency: 1, // singleton — no overlapping sweeps
    triggers: [{ cron: "TZ=Asia/Manila 0 * * * *" }], // hourly, timezone-aware (Asia/Manila)
  },
  async ({ step }) => {
    const due = await step.run("find-due", () => queryDuePayouts(db));
    for (const b of due) {
      await step.run(`payout-${b.bookingId}`, () => payOne(db, b));
    }
    return { swept: due.length };
  },
);
