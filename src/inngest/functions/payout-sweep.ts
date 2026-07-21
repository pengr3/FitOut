// The T+24h host-payout sweep cron (D-55/D-56, PAY-03/PAY-02) — the FIRST async-scheduled job in the
// codebase. Hourly (timezone-aware), it finds bookings whose session ended ≥ PAYOUT_DELAY_HOURS ago with NO
// payout row yet, claims each at-most-once with an `INSERT ... ON CONFLICT (booking_id, kind)` ledger row
// that FREEZES the applied commission (D-51), CORRELATES the payout wallet to THAT booking's host
// (wallet.id === host_payout.paymongo_account_id — NEVER an arbitrary wallet), NETS any outstanding
// host-cancellation debit (D-71), and fires an inhouse `/v2/batch_transfers` of exactly the netted amount
// (D-52), moving the ledger Held → Processing.
//
// CORRECTNESS RESTS ON THREE DB-LEVEL INVARIANTS, exactly as double-booking rests on the GiST EXCLUDE:
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
//   3. `kind` SCOPES EVERY LEDGER READ AND WRITE (Phase 7, D-71 / 07-RESEARCH Finding 3). A
//      `host_cancel_fee` row is a SIGNED DEBIT (negative net_cents) that NEVER transfers — it only NETS
//      against a future payout, accumulating `recovered_cents` toward `-net_cents`. Every query in this
//      file and in payout-reconcile / /host/earnings carries `AND kind = 'payout'`; without it a debit row
//      would look like an existing claim (suppressing a legitimate payout), trip the reconcile stuck-`held`
//      alert, and mis-total the earnings view. The netting arithmetic is clamped —
//      `deduction = LEAST(outstanding, netCents)` — so `transferAmt >= 0` by construction and a NEGATIVE
//      ledger is structurally impossible, never merely unlikely.
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
  /**
   * Finding 1+2 — the PAYOUT basis: `COALESCE(retained_space_cents, space_price_cents)`. The SPACE price,
   * or the RETAINED space price after a partial cancellation (D-69). It is deliberately NOT the booking's
   * CHARGED total, which under D-74 is all-in (space + the booker-facing 5% service fee). May be null on a
   * booking whose price split was never frozen — see payOne's guard.
   *
   * ⚠️ T-07-16 tripwire: the name of booking's charged-total column (the all-in one, quoted_ + total_cents)
   * must NEVER appear anywhere in this file, comments included — grepping it here MUST return zero hits.
   * Any hit means the all-in charge basis has crept back toward the payout path. This comment deliberately
   * spells the name in two pieces so the tripwire does not trip on its own documentation.
   */
  payoutGrossCents: number | null;
  currency: string;
  hostId: string;
  /** PayMongo pay_... captured at confirm (may be null on legacy rows). */
  paymentId: string | null;
  /** The host's PayMongo Linked-Account id — the wallet is CORRELATED against this (never [0]). */
  paymongoAccountId: string | null;
};

/** The per-booking outcome of a payout attempt (JSON-serializable for the Inngest step boundary). */
export type PayOneResult =
  | { status: "paid"; transferId: string; netCents: number; deductedCents: number }
  // D-71: the whole payout was consumed by an outstanding cancellation fee — settled, no transfer fired.
  | { status: "settled-by-netting"; deductedCents: number }
  | { status: "skipped-claimed" } // another (concurrent/prior) sweep already owns this booking
  | { status: "skipped-no-wallet" } // no activated wallet correlates → claim rolled back; retry next sweep
  | { status: "skipped-no-basis" } // no frozen space price → fail closed + alert; never guess a gross
  | { status: "failed"; error: string }; // the transfer create threw → ledger marked failed (retry review)

/**
 * The RESEARCH Pattern-4 sweep query: bookings whose session ended ≥ PAYOUT_DELAY_HOURS ago (DB clock
 * `now()`, not a JS clock) that are eligible for a payout attempt. A booking is eligible when it has NO
 * payout row yet (`p.id IS NULL`) OR — WR-04 bounded retry — its row is `failed`, the retry backoff has
 * elapsed (`updated_at` ≥ PAYOUT_RETRY_BACKOFF_HOURS ago), and its ORIGINAL claim is still within
 * PAYOUT_RETRY_MAX_AGE_HOURS (so a transient PayMongo error recovers automatically without retrying forever).
 * `hp.paymongo_account_id` is aliased → `paymongoAccountId` so the caller can correlate the wallet. Takes an
 * explicit `dbConn` so a test can inject an isolated-schema db.
 *
 * ⚠️ `AND p.kind = 'payout'` on the LEFT JOIN is load-bearing (Finding 3): without it a `host_cancel_fee`
 * DEBIT row would make the booking look already-claimed and would silently SUPPRESS a legitimate payout.
 */
export async function queryDuePayouts(dbConn: DbConn): Promise<DuePayout[]> {
  const rows = (await dbConn.execute(sql`
    SELECT b.id AS "bookingId", b.listing_id AS "listingId",
           COALESCE(b.retained_space_cents, b.space_price_cents) AS "payoutGrossCents",
           b.currency AS "currency", b.payment_id AS "paymentId",
           l.host_id AS "hostId", hp.paymongo_account_id AS "paymongoAccountId"
    FROM booking b
    JOIN listing l ON l.id = b.listing_id
    JOIN host_payout hp ON hp.user_id = l.host_id
    LEFT JOIN host_payout_ledger p ON p.booking_id = b.id AND p.kind = 'payout'
    -- Finding 1 — D-69's "zero new mechanism" was not true: a cancellation sets status='cancelled', and the
    -- old "status = 'confirmed'" predicate meant a partially-refunded booking was NEVER swept, so the host
    -- never received their share of the RETAINED amount. This is a PAYOUT predicate, NOT an OCCUPANCY
    -- predicate — the two families must stay clearly separated. booking.status itself is UNCHANGED here:
    -- the GiST EXCLUDE (D-21 keystone) and both lazy-expiry sweeps are untouched and 'cancelled' remains
    -- NON-OCCUPYING. Payout timing stays anchored to the session's ORIGINAL ends_at + PAYOUT_DELAY_HOURS,
    -- which preserves the D-55 hold window and still gives a dispute window to a booking cancelled days
    -- early. A HOST cancellation produces retained = 0, so the "> 0" test correctly excludes it: no
    -- payout AND owes the D-71 fee.
    WHERE (
            b.status = 'confirmed'
         OR (b.status = 'cancelled' AND COALESCE(b.retained_space_cents, 0) > 0)
          )
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
 *   0. GUARD the payout basis — a booking with no frozen space price fails CLOSED (alert, no claim).
 *   1. FREEZE the commission (rate + amount) from the server-frozen gross (D-51) — a later rate change
 *      must never rewrite this row.
 *   2. CLAIM the ledger row: the INSERT is the lock. The composite (booking_id, kind) conflict target with
 *      an empty RETURNING means another sweep already owns this booking ⇒ fire NOTHING.
 *   3. CORRELATE the wallet to THIS booking's host (`wallet.id === b.paymongoAccountId`). No match ⇒ ROLL
 *      THE CLAIM BACK (so a later sweep retries), alert, fire NOTHING — NEVER wallets[0] or a wrong host.
 *   4. NET any outstanding `host_cancel_fee` debit against this payout (D-71), clamped at zero.
 *   5. FIRE the inhouse transfer of exactly the NETTED amount (D-52) to the correlated wallet — or, when
 *      netting consumed the whole payout, fire NOTHING and settle the row.
 *   6. RELEASE: move the ledger Held → Processing with the transfer id. ANY post-claim failure (wallet
 *      lookup OR transfer throw) is caught and marked `failed` + alerted (CR-01: a `held` row is never a
 *      dead end).
 *
 * Factored to take an explicit `dbConn` so a test can drive it against an isolated schema / racing clients.
 */
export async function payOne(dbConn: DbConn, b: DuePayout): Promise<PayOneResult> {
  // (0) The payout basis MUST be a real integer. `space_price_cents` is NULLABLE: drizzle/0014 backfilled
  //     every pre-Phase-7 row, but a booking created after that migration and before the Phase-7 checkout
  //     write path freezes the split has neither a space price nor a retained amount. FAIL CLOSED and LOUD
  //     — alert, claim nothing, move no money, retry next sweep. We deliberately do NOT fall back to
  //     the booking's CHARGED total: that is the all-in charge basis (Finding 2 / T-07-16), and a silent
  //     fallback is exactly how the service fee would leak into a host payout unnoticed.
  if (!Number.isInteger(b.payoutGrossCents)) {
    console.error("[payout-alert] booking has no frozen payout basis", {
      bookingId: b.bookingId,
      hostId: b.hostId,
    });
    return { status: "skipped-no-basis" };
  }
  const payoutGrossCents = b.payoutGrossCents as number;

  // (1) Freeze the applied commission from the SERVER-FROZEN gross (never a client number).
  //     Finding 2 — the gross is the SPACE price (or the RETAINED space price on a partial cancellation),
  //     NEVER the booking's CHARGED total. That total is the all-in charge basis under D-74; paying out
  //     90% of it would hand the host 90% of the platform's OWN service fee, inverting the entire purpose
  //     of D-74 (the fee exists to fund the ~2.5% gateway cost a refund does not return).
  const { rateBps, commissionCents, netCents } = computeCommission(payoutGrossCents);

  // (2) Claim the row — the INSERT itself is the at-most-once lock (no app-level "already paid?" check). The
  //     ON CONFLICT DO UPDATE re-claims a `failed` row (WR-04 bounded retry: failed → held for a fresh
  //     attempt) while KEEPING the FROZEN commission columns from the original claim (D-51 — only state +
  //     updated_at change). For a held/processing/paid/refunded conflict the `WHERE state='failed'` is false,
  //     so no row is updated and RETURNING is empty ⇒ at-most-once still holds (a concurrent duplicate or an
  //     already-progressed booking fires nothing — same guarantee as the former DO NOTHING).
  //     `recovered_cents` is returned alongside the id: on a FRESH claim it is 0, but on a WR-04 re-claim of
  //     a `failed` row it MEMOISES the deduction the first attempt already applied to the debit rows (2b).
  const claimId = randomUUID();
  const claimed = (await dbConn.execute(sql`
    INSERT INTO host_payout_ledger (id, booking_id, host_id, payment_id, gross_cents,
      commission_rate_bps, commission_cents, net_cents, currency, state)
    VALUES (${claimId}, ${b.bookingId}, ${b.hostId}, ${b.paymentId}, ${payoutGrossCents},
      ${rateBps}, ${commissionCents}, ${netCents}, ${b.currency}, 'held')
    ON CONFLICT (booking_id, kind) DO UPDATE
      SET state = 'held', updated_at = now()
      WHERE host_payout_ledger.state = 'failed'
    RETURNING id, recovered_cents AS "alreadyDeducted"
  `)) as unknown as { id: string; alreadyDeducted: number }[];
  if (claimed.length === 0) return { status: "skipped-claimed" }; // owned by another sweep / already progressed → fire nothing
  const alreadyDeducted = claimed[0].alreadyDeducted ?? 0;

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
        WHERE booking_id = ${b.bookingId} AND kind = 'payout'
          AND state = 'held' AND transfer_id IS NULL
      `);
      console.error("[payout-alert] no activated wallet for host", {
        bookingId: b.bookingId,
        paymongoAccountId: b.paymongoAccountId,
      });
      return { status: "skipped-no-wallet" };
    }

    // (4) D-71 NETTING: recover any outstanding host_cancel_fee debit from this payout before transferring.
    //     A debit row carries NEGATIVE net_cents; recovered_cents accumulates toward -net_cents. The debit is
    //     only marked 'paid' when fully recovered. If the host never hosts again the debit sits unrecovered
    //     forever — that is the INTENDED write-off (D-71: "written off if they never host again"). No
    //     collections process, no card on file. It is surfaced on /host/earnings so a returning host is
    //     never surprised by a smaller payout.
    //
    //     A re-claimed `failed` row already applied its deduction on the FIRST attempt, so `alreadyDeducted`
    //     (this payout row's memoised recovered_cents) is REUSED rather than re-derived: re-deriving would
    //     read the ALREADY-REDUCED outstanding, compute a smaller deduction, and silently forgive the
    //     difference — the host would be overpaid and the fee partly written off by a retry.
    let deduction = alreadyDeducted;
    if (deduction === 0) {
      const [{ outstanding = 0 } = { outstanding: 0 }] = (await dbConn.execute(sql`
        SELECT COALESCE(SUM(-net_cents - recovered_cents), 0)::int AS "outstanding"
        FROM host_payout_ledger
        WHERE host_id = ${b.hostId} AND kind = 'host_cancel_fee' AND recovered_cents < -net_cents
      `)) as unknown as { outstanding: number }[];

      // Math.min clamps the deduction so the transfer can NEVER go negative. transferAmt >= 0 by construction.
      deduction = Math.min(outstanding, netCents);

      if (deduction > 0) {
        // ONE statement, so the debit recovery and this payout row's memo commit ATOMICALLY (T-07-20: a
        // crash can never apply a recovery the retry cannot see, nor memoise one it never applied).
        // `ranked` walks the host's unrecovered debits OLDEST-FIRST; `running - remaining` is the amount
        // consumed by the debits before this one, so each row absorbs
        // LEAST(its remaining, deduction - consumed-so-far) and the applied total equals `deduction` exactly.
        await dbConn.execute(sql`
          WITH ranked AS (
            SELECT id, (-net_cents - recovered_cents) AS remaining,
                   SUM(-net_cents - recovered_cents) OVER (ORDER BY created_at, id
                     ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running
            FROM host_payout_ledger
            WHERE host_id = ${b.hostId} AND kind = 'host_cancel_fee' AND recovered_cents < -net_cents
          ), applied AS (
            UPDATE host_payout_ledger l
            SET recovered_cents = l.recovered_cents
                  + LEAST(r.remaining, GREATEST(0, ${deduction}::int - (r.running - r.remaining))),
                state = CASE WHEN l.recovered_cents
                  + LEAST(r.remaining, GREATEST(0, ${deduction}::int - (r.running - r.remaining))) >= -l.net_cents
                  THEN 'paid'::payout_ledger_state ELSE l.state END,
                updated_at = now()
            FROM ranked r
            WHERE l.id = r.id AND (r.running - r.remaining) < ${deduction}::int
            RETURNING l.id
          )
          UPDATE host_payout_ledger
          SET recovered_cents = ${deduction}::int, updated_at = now()
          WHERE booking_id = ${b.bookingId} AND kind = 'payout'
        `);
      }
    }
    const transferAmt = netCents - deduction;

    if (transferAmt === 0) {
      // The whole payout was consumed by an outstanding cancellation fee. The host is square; no money
      // moves. A residual debit (outstanding > netCents) stays unrecovered and is netted against a future
      // payout. DO NOT fire a zero transfer — PayMongo will reject or mis-handle a ₱0 transfer, and a
      // failed transfer here would mark a settled row `failed` for no reason.
      await dbConn.execute(sql`
        UPDATE host_payout_ledger
        SET state = 'paid', paid_at = now(), transfer_id = NULL, updated_at = now()
        WHERE booking_id = ${b.bookingId} AND kind = 'payout' AND state = 'held'
      `);
      return { status: "settled-by-netting", deductedCents: deduction };
    }

    // (5) Fire the inhouse net transfer to the CORRELATED wallet (Idempotency-Key payout:<bookingId> is set
    //     inside createBatchTransfer). (6) On success, RELEASE Held → Processing.
    const transfer = await createBatchTransfer({
      netCents: transferAmt,
      currency: b.currency,
      bookingId: b.bookingId,
      description: `FitOut payout ${b.bookingId}`,
      destination: { number: wallet.accountNumber, name: wallet.accountName },
    });
    await dbConn.execute(sql`
      UPDATE host_payout_ledger
      SET state = 'processing', transfer_id = ${transfer.transferId}, updated_at = now()
      WHERE booking_id = ${b.bookingId} AND kind = 'payout'
    `);
    return {
      status: "paid",
      transferId: transfer.transferId,
      netCents: transferAmt,
      deductedCents: deduction,
    };
  } catch (err) {
    // ANY post-claim failure (wallet-lookup throw OR transfer throw) → mark the claim `failed`, never leave a
    // silent `held`. `WHERE state='held'` keeps this idempotent (a re-run touches 0 rows). The reconcile
    // stuck-held alert surfaces anything left behind, and a `failed` row is operator-reviewable / retryable.
    await dbConn.execute(sql`
      UPDATE host_payout_ledger SET state = 'failed', updated_at = now()
      WHERE booking_id = ${b.bookingId} AND kind = 'payout' AND state = 'held'
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
