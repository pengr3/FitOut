// Friday Manila host payout release. A booking enters the fixed noon cohort only after
// its minimum 24-hour post-session hold and its own current deposited settlement proof.
// Each dispatch rechecks the live host, destination and settlement gates. A Wallet-scoped
// database lock serializes available-balance plus verified-fee preflight and commits the
// unique payout claim with debit recovery before the provider POST. An uncertain provider
// result leaves the held claim for read-back; it cannot trigger a blind duplicate retry.

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import type { DbConn } from "@/lib/availability/read-model";
import { computeCommission } from "@/lib/payments/commission";
import { PAYOUT_HOLD_HOURS } from "@/lib/payments/config";
import { decryptPayoutRecipientValue } from "@/lib/payout-recipient-crypto";
import { createExternalHostPayout, findHostPayoutTransfers, readPayoutWalletFunding,
  STANDARD_PAYOUT_TRANSFER_FEE_CENTS } from "@/lib/paymongo";
import { currentSettlementProof } from "@/lib/payments/settlement";
import { recordMoneyException } from "@/lib/payments/payout-exceptions";
import { recordPayoutException } from "@/inngest/functions/payout-reconcile";

/** Maximum bookings inspected during one Friday sweep pass. */
const SWEEP_BATCH_SIZE = 100;

/** The single Manila calendar rule used by dispatch and the host schedule projection. */
export function fridayPayoutWindow(now: Date): { cohortNoon: Date } | null {
  if (!Number.isFinite(now.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", weekday: "short", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (kind: string) => parts.find((part) => part.type === kind)?.value ?? "";
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const second = Number(get("second"));
  if (get("weekday") !== "Fri" || hour < 12 || hour > 23 ||
      (hour === 23 && (minute !== 0 || second !== 0 || now.getUTCMilliseconds() !== 0))) return null;
  // Asia/Manila is UTC+08:00 throughout the payout policy's supported calendar.
  const cohortNoon = new Date(Date.UTC(Number(get("year")), Number(get("month")) - 1,
    Number(get("day")), 4));
  return { cohortNoon };
}

/** A booking eligible for the fixed Friday noon cohort. */
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
  /** The verified, owner-bound external destination. The two sensitive fields are ciphertext. */
  institutionBic: string;
  accountNameCiphertext: string;
  accountNumberCiphertext: string;
  /** @deprecated Legacy fixture field. It is never read by the parent-merchant payout path. */
  paymongoAccountId?: string | null;
};

/** Production dispatch is held until an operator explicitly selects a release scope. */
export function payoutDispatchMode(env: Record<string, string | undefined> = process.env): "hold" | "controlled" | "open" {
  if (env.PAYOUT_DISPATCH_MODE === "controlled" || env.PAYOUT_DISPATCH_MODE === "open") {
    return env.PAYOUT_DISPATCH_MODE;
  }
  return "hold";
}

/** A controlled proof can dispatch only one named booking within its fee-inclusive debit budget. */
export function selectDispatchCandidates(
  due: DuePayout[], env: Record<string, string | undefined> = process.env,
): DuePayout[] {
  const mode = payoutDispatchMode(env);
  if (mode === "open") return due;
  if (mode !== "controlled") return [];

  const bookingId = env.PAYOUT_CONTROLLED_BOOKING_ID;
  const capText = env.PAYOUT_CONTROLLED_MAX_DEBIT_CENTS;
  const feeText = env.PAYMONGO_INSTAPAY_FEE_CENTS;
  const maxDebitCents = Number(capText);
  const feeCents = Number(feeText);
  if (!bookingId?.trim() || bookingId.trim() !== bookingId ||
      !capText?.trim() || !feeText?.trim() ||
      !Number.isSafeInteger(maxDebitCents) || maxDebitCents <= 0 ||
      !Number.isSafeInteger(feeCents) || feeCents < 0) return [];

  const candidate = due.find((row) => row.bookingId === bookingId);
  if (!candidate || !Number.isSafeInteger(candidate.payoutGrossCents) ||
      (candidate.payoutGrossCents as number) < 0 ||
      (candidate.payoutGrossCents as number) +
        Math.max(feeCents, STANDARD_PAYOUT_TRANSFER_FEE_CENTS) > maxDebitCents) return [];
  return [candidate];
}

/** The per-booking outcome of a payout attempt (JSON-serializable for the Inngest step boundary). */
export type PayOneResult =
  | { status: "processing"; transferId: string; netCents: number; deductedCents: number }
  // D-71: the whole payout was consumed by an outstanding cancellation fee — settled, no transfer fired.
  | { status: "settled-by-netting"; deductedCents: number }
  | { status: "skipped-claimed" } // another (concurrent/prior) sweep already owns this booking
  | { status: "skipped-no-wallet" } // unavailable balance or fee → no claim; retry next Friday
  | { status: "skipped-no-basis" } // no frozen space price → fail closed + alert; never guess a gross
  | { status: "held-uncertain" }; // durable claim exists; provider outcome needs read-back before retry

/**
 * Select the fixed Friday noon cohort. A booking is eligible when it has NO
 * payout row yet (`p.id IS NULL`). A failed row is an existing transfer claim, not a new
 * dispatch candidate: the single ledger transfer ID and booking-wide provider reference cannot
 * identify a second attempt after a lost response. Its terminal failure stays in the operator
 * exception queue until a durable per-attempt identity and recovery path are implemented.
 * The encrypted recipient columns are read only for a verified destination bound to the listing host. Takes
 * an explicit `dbConn` so a test can inject an isolated-schema db.
 *
 * ⚠️ `AND p.kind = 'payout'` on the LEFT JOIN is load-bearing (Finding 3): without it a `host_cancel_fee`
 * DEBIT row would make the booking look already-claimed and would silently SUPPRESS a legitimate payout.
 *
 * ⚠️ Invariant 4 (ENF-02) lives HERE and nowhere else: a suspended host's booking is dropped by this
 * SELECT, so `payOne`'s claim INSERT never runs for it. See the comment at the predicate for why the
 * placement — not the predicate — is the design.
 */
export async function queryDuePayouts(dbConn: DbConn, now: Date = new Date()): Promise<DuePayout[]> {
  const window = fridayPayoutWindow(now);
  if (!window) return [];
  const cutoff = window.cohortNoon.toISOString();
  const runAt = now.toISOString();
  const rows = (await dbConn.execute(sql`
    SELECT b.id AS "bookingId", b.listing_id AS "listingId",
           COALESCE(b.retained_space_cents, b.space_price_cents) AS "payoutGrossCents",
           b.currency AS "currency", b.payment_id AS "paymentId",
           l.host_id AS "hostId", hpd.institution_bic AS "institutionBic",
           hpd.account_name_ciphertext AS "accountNameCiphertext",
           hpd.account_number_ciphertext AS "accountNumberCiphertext"
    FROM booking b
    JOIN listing l ON l.id = b.listing_id
    JOIN host_payout hp ON hp.user_id = l.host_id
    JOIN host_payout_destination hpd ON hpd.user_id = l.host_id
    -- LEFT, not INNER, and for the same reason src/lib/search/query.ts states at its own copy of this
    -- join: host_verification is 1:1 to user but is NOT created with the user, so a host with NO ROW is
    -- the common case. An INNER JOIN here would silently stop paying every un-checked host.
    LEFT JOIN host_verification hv ON hv.user_id = l.host_id
    LEFT JOIN host_payout_ledger p ON p.booking_id = b.id AND p.kind = 'payout'
    JOIN booking_settlement_current sc ON sc.booking_id = b.id
    JOIN booking_settlement_observation so ON so.id = sc.observation_id
    -- Finding 1 — D-69's "zero new mechanism" was not true: a cancellation sets status='cancelled', and the
    -- old "status = 'confirmed'" predicate meant a partially-refunded booking was NEVER swept, so the host
    -- never received their share of the RETAINED amount. This is a PAYOUT predicate, NOT an OCCUPANCY
    -- predicate — the two families must stay clearly separated. booking.status itself is UNCHANGED here:
    -- the GiST EXCLUDE (D-21 keystone) and both lazy-expiry sweeps are untouched and 'cancelled' remains
    -- NON-OCCUPYING. Payout eligibility stays anchored to the session's ORIGINAL ends_at plus the
    -- minimum review hold, measured against Friday noon. A HOST cancellation produces retained = 0,
    -- so the "> 0" test correctly excludes it: no
    -- payout AND owes the D-71 fee.
    WHERE (
            b.status = 'confirmed'
         OR (b.status = 'cancelled' AND COALESCE(b.retained_space_cents, 0) > 0)
          )
      AND b.ends_at + (${PAYOUT_HOLD_HOURS}::numeric * interval '1 hour') <= ${cutoff}::timestamptz
      AND so.payment_id = b.payment_id AND so.provider_status = 'deposited'
      AND so.deposited_at IS NOT NULL AND so.deposited_at <= ${cutoff}::timestamptz
      -- The immutable observation stores the first verified read. Re-verifying the SAME
      -- provider version refreshes sc.verified_at without changing its noon cohort.
      AND so.verified_at <= ${cutoff}::timestamptz
      AND sc.verified_at >= ${runAt}::timestamptz - interval '24 hours'
      AND so.wallet_destination_matched = true AND so.mapping_verified = true
      AND so.live_mode = true AND lower(so.currency) = lower(b.currency)
      AND p.id IS NULL
      -- INVARIANT 4 / ENF-02 (D-222/D-234) — THE SUSPENSION FREEZE, AND THE PLACEMENT IS THE DESIGN.
      -- Filtering HERE means payOne's claim INSERT never runs, so no ledger row is ever created, so
      -- payout-reconcile's stuck-held alert has NOTHING to page an operator about. Freezing after the
      -- claim would satisfy "no payout leaves" and BREAK "a frozen row does not page an operator": it
      -- would leave one held row per suspended booking, each firing a FALSE [payout-alert] forever --
      -- the exact failure alertStuckHeld's own comment names for host_cancel_fee debits. Un-suspension
      -- needs NO write and no repair: this is a WHERE over live state, so the next sweep simply selects
      -- the booking again (the D-14 auto-revert property). Added INSIDE the predicate above, never in
      -- place of any of it, and the neighbouring kind scoping is untouched.
      --
      -- POLARITY WARNING, and the two COALESCEs look alike and mean OPPOSITE things. The sell-gate
      -- (src/lib/search/query.ts, src/lib/bookability.ts) asks "is this host APPROVED?" and enumerates
      -- POSITIVE values, so a missing row fails CLOSED. This asks "is this host SUSPENDED?", so a
      -- missing row means NOT suspended and must still be PAID. Inverting this into the sell-gate's
      -- shape would freeze the payouts of every host nobody has checked yet -- most of them.
      AND COALESCE(hv.status::text, 'unverified') <> 'suspended'
      -- Both predicates are release gates, not conveniences. The destination confirmation and the cached
      -- booking gate must agree before a due row can even be claimed.
      AND hp.payouts_enabled = true
      AND hpd.verification_status IN ('verified', 'host_attested')
    ORDER BY b.ends_at ASC
    LIMIT ${SWEEP_BATCH_SIZE}
  `)) as unknown as DuePayout[];
  return rows;
}

/** Commit a Wallet-reserved claim and debit memo before any external transfer POST. */
export async function payOne(dbConn: DbConn, b: DuePayout, now: Date = new Date()): Promise<PayOneResult> {
  const existing = (await dbConn.execute(sql`
    SELECT state, transfer_id AS "transferId", net_cents AS "netCents",
      recovered_cents AS "recoveredCents", currency
    FROM host_payout_ledger WHERE booking_id = ${b.bookingId} AND kind = 'payout'
  `)) as unknown as Array<{ state: string; transferId: string | null;
    netCents: number; recoveredCents: number; currency: string }>;
  const priorClaim = existing[0];
  if (priorClaim && ["held", "processing", "failed"].includes(priorClaim.state)) {
    // A previous POST may have succeeded even if its response was lost. Never treat key expiry,
    // an empty list, or a provider read error as proof of no transfer.
    try {
      const candidates = await findHostPayoutTransfers(b.bookingId);
      const expectedReference = `host-payout-${b.bookingId}`;
      if (candidates.length === 1 && candidates[0].id &&
          candidates[0].referenceNumber === expectedReference &&
          candidates[0].amount === priorClaim.netCents - priorClaim.recoveredCents &&
          candidates[0].currency?.toLowerCase() === priorClaim.currency.toLowerCase() &&
          (!priorClaim.transferId || priorClaim.transferId === candidates[0].id)) {
        await dbConn.execute(sql`
          UPDATE host_payout_ledger SET state = 'processing', transfer_id = ${candidates[0].id},
            updated_at = now()
          WHERE booking_id = ${b.bookingId} AND kind = 'payout'
            AND state = 'held' AND transfer_id IS NULL
        `);
        return { status: "skipped-claimed" };
      }
      console.error("[payout-alert] payout reference unresolved", {
        bookingId: b.bookingId, matchCount: candidates.length,
      });
      await recordPayoutException(dbConn, b.bookingId, "reference_unresolved");
    } catch {
      console.error("[payout-alert] payout reference read unavailable", { bookingId: b.bookingId });
      await recordPayoutException(dbConn, b.bookingId, "reference_read_unavailable");
    }
    return priorClaim.state === "processing" ? { status: "skipped-claimed" } : { status: "held-uncertain" };
  }
  if (priorClaim) return { status: "skipped-claimed" };
  const window = fridayPayoutWindow(now);
  if (!window) return { status: "skipped-claimed" };
  const cohortNoon = window.cohortNoon;
  const holdHours = PAYOUT_HOLD_HOURS;
  const prepared = await dbConn.transaction(async (tx) => {
    // Every FitOut host payout uses the one configured platform Wallet. This transaction lock
    // serializes all local preflights, including independent Inngest workers and manual replays.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(2602, 1)`);
    const rows = (await tx.execute(sql`
      SELECT b.id AS "bookingId", b.payment_id AS "paymentId", b.currency AS "currency",
        b.ends_at AS "endsAt", COALESCE(b.retained_space_cents, b.space_price_cents) AS "grossCents",
        l.host_id AS "hostId", hpd.institution_bic AS "bic",
        hpd.account_name_ciphertext AS "nameCiphertext",
        hpd.account_number_ciphertext AS "numberCiphertext"
      FROM booking b
      JOIN listing l ON l.id = b.listing_id
      JOIN host_payout hp ON hp.user_id = l.host_id
      JOIN host_payout_destination hpd ON hpd.user_id = l.host_id
      LEFT JOIN host_verification hv ON hv.user_id = l.host_id
      WHERE b.id = ${b.bookingId}
        AND (b.status = 'confirmed' OR (b.status = 'cancelled' AND COALESCE(b.retained_space_cents, 0) > 0))
        AND hp.payouts_enabled = true
        AND hpd.verification_status IN ('verified', 'host_attested')
        AND COALESCE(hv.status::text, 'unverified') <> 'suspended'
      FOR UPDATE OF b, hp, hpd
    `)) as unknown as Array<{
      bookingId: string; paymentId: string | null; currency: string; endsAt: Date;
      grossCents: number | null; hostId: string; bic: string;
      nameCiphertext: string; numberCiphertext: string;
    }>;
    const live = rows[0];
    if (!live || live.hostId !== b.hostId || live.paymentId !== b.paymentId ||
        new Date(live.endsAt).getTime() + holdHours * 3_600_000 > cohortNoon.getTime()) {
      return { status: "skipped-claimed" } as PayOneResult;
    }
    // currentSettlementProof denies unresolved settlement-read contradictions. Other
    // operator alerts remain visible but do not suppress a later eligible retry.
    const proof = await currentSettlementProof(b.bookingId, tx as unknown as DbConn, now);
    if (!proof || proof.paymentId !== live.paymentId ||
        proof.depositedAt > cohortNoon) return { status: "skipped-claimed" } as PayOneResult;
    const firstObserved = (await tx.execute(sql`
      SELECT o.verified_at AS "firstVerifiedAt"
      FROM booking_settlement_current sc
      JOIN booking_settlement_observation o ON o.id = sc.observation_id
      WHERE sc.booking_id = ${b.bookingId}
    `)) as unknown as Array<{ firstVerifiedAt: Date }>;
    if (!firstObserved[0] || new Date(firstObserved[0].firstVerifiedAt) > cohortNoon) {
      return { status: "skipped-claimed" } as PayOneResult;
    }
    if (!Number.isSafeInteger(live.grossCents) || (live.grossCents as number) < 0) {
      console.error("[payout-alert] booking has no frozen payout basis", { bookingId: b.bookingId });
      await recordMoneyException(tx as unknown as DbConn, b.bookingId, "payout_basis_missing", now);
      return { status: "skipped-no-basis" } as PayOneResult;
    }
    const destination = {
      name: decryptPayoutRecipientValue(live.nameCiphertext),
      number: decryptPayoutRecipientValue(live.numberCiphertext),
      bic: live.bic,
    };
    const previous = (await tx.execute(sql`
      SELECT id, state, created_at AS "createdAt", net_cents AS "netCents", recovered_cents AS "deductedCents",
        gross_cents AS "grossCents", commission_rate_bps AS "rateBps",
        commission_cents AS "commissionCents"
      FROM host_payout_ledger WHERE booking_id = ${b.bookingId} AND kind = 'payout'
    `)) as unknown as Array<{ id: string; state: string; createdAt: Date; netCents: number; deductedCents: number;
      grossCents: number; rateBps: number; commissionCents: number }>;
    const prior = previous[0];
    if (prior && prior.state !== "failed") return { status: "skipped-claimed" } as PayOneResult;
    // PayMongo's idempotency key expires after 24h. A previously failed claim outside
    // this Friday cohort cannot safely be replayed from this direct/manual entry point.
    if (prior && (new Date(prior.createdAt) < cohortNoon ||
        now.getTime() - new Date(prior.createdAt).getTime() >= 24 * 3_600_000)) {
      return { status: "skipped-claimed" } as PayOneResult;
    }
    const grossCents = prior?.grossCents ?? (live.grossCents as number);
    const frozen = prior ?? computeCommission(grossCents);
    const netCents = frozen.netCents;
    const alreadyDeducted = prior?.deductedCents ?? 0;
    const [{ outstanding }] = (await tx.execute(sql`
      SELECT COALESCE(SUM(-net_cents - recovered_cents), 0)::bigint AS "outstanding"
      FROM host_payout_ledger
      WHERE host_id = ${live.hostId} AND kind = 'host_cancel_fee' AND recovered_cents < -net_cents
    `)) as unknown as Array<{ outstanding: string }>;
    const outstandingCents = Number(outstanding);
    if (!Number.isSafeInteger(outstandingCents) || !Number.isSafeInteger(netCents) || netCents < 0 ||
        !Number.isSafeInteger(alreadyDeducted) || alreadyDeducted < 0 || alreadyDeducted > netCents) {
      await recordMoneyException(tx as unknown as DbConn, b.bookingId, "payout_basis_missing", now);
      return { status: "skipped-no-basis" } as PayOneResult;
    }
    const deduction = alreadyDeducted || Math.min(outstandingCents, netCents);
    const transferAmt = netCents - deduction;
    let feeBudgetCents: number | null = null;

    if (transferAmt > 0) {
      let funding: Awaited<ReturnType<typeof readPayoutWalletFunding>>;
      try { funding = await readPayoutWalletFunding(now); } catch { funding = null; }
      if (!funding || !funding.walletId || !Number.isSafeInteger(funding.availableCents) ||
          !Number.isSafeInteger(funding.feeCents) || funding.feeCents < 0 ||
          funding.availableCents < 0 || !Number.isFinite(funding.observedAt?.getTime()) ||
          Math.abs(now.getTime() - funding.observedAt.getTime()) > 120_000) {
        await recordMoneyException(tx as unknown as DbConn, b.bookingId, "wallet_unavailable", now);
        return { status: "skipped-no-wallet" } as PayOneResult;
      }
      feeBudgetCents = Math.max(funding.feeCents, STANDARD_PAYOUT_TRANSFER_FEE_CENTS);
      const [{ reserved }] = (await tx.execute(sql`
        SELECT COALESCE(SUM(GREATEST(net_cents - recovered_cents, 0)::bigint
          + COALESCE(fee_budget_cents, ${feeBudgetCents})::bigint), 0)::bigint AS "reserved"
        FROM host_payout_ledger
        WHERE kind = 'payout' AND state IN ('held', 'processing')
          AND booking_id <> ${b.bookingId}
      `)) as unknown as Array<{ reserved: string }>;
      const required = BigInt(transferAmt) + BigInt(feeBudgetCents);
      if (BigInt(funding.availableCents) - BigInt(reserved) < required) {
        await recordMoneyException(tx as unknown as DbConn, b.bookingId, "wallet_insufficient", now);
        return { status: "skipped-no-wallet" } as PayOneResult;
      }
    }

    const claimId = randomUUID();
    const claimed = (await tx.execute(sql`
      INSERT INTO host_payout_ledger (id, booking_id, host_id, payment_id, gross_cents,
        commission_rate_bps, commission_cents, net_cents, currency, state, fee_budget_cents)
      VALUES (${claimId}, ${b.bookingId}, ${live.hostId}, ${live.paymentId}, ${grossCents},
        ${frozen.rateBps}, ${frozen.commissionCents}, ${netCents}, ${live.currency}, 'held', ${feeBudgetCents})
      ON CONFLICT (booking_id, kind) DO UPDATE
        SET state = 'held', updated_at = now()
        WHERE host_payout_ledger.state = 'failed'
      RETURNING id
    `)) as unknown as Array<{ id: string }>;
    if (claimed.length === 0) return { status: "skipped-claimed" } as PayOneResult;
    if (deduction > 0 && !prior) {
      await tx.execute(sql`
        WITH ranked AS (
          SELECT id, (-net_cents - recovered_cents) AS remaining,
            SUM(-net_cents - recovered_cents) OVER (ORDER BY created_at, id
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running
          FROM host_payout_ledger
          WHERE host_id = ${live.hostId} AND kind = 'host_cancel_fee' AND recovered_cents < -net_cents
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
        UPDATE host_payout_ledger SET recovered_cents = ${deduction}::int, updated_at = now()
        WHERE booking_id = ${b.bookingId} AND kind = 'payout'
      `);
    }
    if (transferAmt === 0) {
      await tx.execute(sql`
        UPDATE host_payout_ledger
        SET state = 'paid', paid_at = now(), transfer_id = NULL, updated_at = now()
        WHERE booking_id = ${b.bookingId} AND kind = 'payout' AND state = 'held'
      `);
      return { status: "settled-by-netting", deductedCents: deduction } as PayOneResult;
    }
    return { status: "prepared" as const, transferAmt, deduction, destination, currency: live.currency };
  });
  if (prepared.status !== "prepared") return prepared;

  try {
    const transfer = await createExternalHostPayout({
      netCents: prepared.transferAmt, currency: prepared.currency, bookingId: b.bookingId,
      description: `FitOut payout ${b.bookingId}`, destination: prepared.destination,
    });
    if (!transfer.transferId || transfer.status === "failed") throw new Error("Unconfirmed transfer create response");
    await dbConn.execute(sql`
      UPDATE host_payout_ledger SET state = 'processing', transfer_id = ${transfer.transferId}, updated_at = now()
      WHERE booking_id = ${b.bookingId} AND kind = 'payout' AND state = 'held' AND transfer_id IS NULL
    `);
    return { status: "processing", transferId: transfer.transferId,
      netCents: prepared.transferAmt, deductedCents: prepared.deduction };
  } catch {
    // The provider may have accepted a request whose response was lost. The durable held claim
    // prevents a blind retry after PayMongo's short idempotency-key window; ops must read back.
    console.error("[payout-alert] payout outcome uncertain; read-back required", { bookingId: b.bookingId });
    await recordPayoutException(dbConn, b.bookingId, "create_outcome_uncertain");
    return { status: "held-uncertain" };
  }
}

/** Final Friday pass includes bookings that were never selected because proof or host gates failed. */
export async function recordMissedFridayPayouts(dbConn: DbConn, now: Date): Promise<number> {
  const window = fridayPayoutWindow(now);
  if (!window || now.getTime() < window.cohortNoon.getTime() + 11 * 3_600_000) return 0;
  const rows = (await dbConn.execute(sql`
    SELECT b.id AS "bookingId", o.provider_status AS "settlementStatus",
      p.state AS "ledgerState", hpd.verification_status AS "destinationStatus",
      hp.payouts_enabled AS "payoutsEnabled"
    FROM booking b
    JOIN listing l ON l.id = b.listing_id
    LEFT JOIN host_payout hp ON hp.user_id = l.host_id
    LEFT JOIN host_payout_destination hpd ON hpd.user_id = l.host_id
    LEFT JOIN host_verification hv ON hv.user_id = l.host_id
    LEFT JOIN host_payout_ledger p ON p.booking_id = b.id AND p.kind = 'payout'
    LEFT JOIN booking_settlement_current c ON c.booking_id = b.id
    LEFT JOIN booking_settlement_observation o ON o.id = c.observation_id
    WHERE (b.status = 'confirmed' OR (b.status = 'cancelled' AND COALESCE(b.retained_space_cents, 0) > 0))
      AND b.ends_at + (${PAYOUT_HOLD_HOURS}::numeric * interval '1 hour') <= ${window.cohortNoon.toISOString()}::timestamptz
      AND (p.id IS NULL OR p.state NOT IN ('paid', 'refunded'))
      AND COALESCE(hv.status::text, 'unverified') <> 'suspended'
    ORDER BY b.ends_at, b.id
  `)) as unknown as Array<{ bookingId: string; settlementStatus: string | null;
    ledgerState: string | null; destinationStatus: string | null; payoutsEnabled: boolean | null }>;
  for (const row of rows) {
    if (!row.settlementStatus) await recordMoneyException(dbConn, row.bookingId, "settlement_missing", now);
    else if (row.settlementStatus === "returned" || row.settlementStatus === "cancelled") {
      await recordMoneyException(dbConn, row.bookingId, "settlement_returned", now);
    }
    if (row.payoutsEnabled !== true || !["verified", "host_attested"].includes(row.destinationStatus ?? "")) {
      await recordMoneyException(dbConn, row.bookingId, "destination_action_required", now);
    }
    await recordMoneyException(dbConn, row.bookingId, "missed_friday_cutoff", now);
  }
  return rows.length;
}

/**
 * The D-56 payout sweep: a Friday-only, timezone-aware, SINGLETON (`concurrency: 1`) cron. Each due booking is
 * paid inside its OWN Inngest step so a mid-batch failure retries just that booking, never the whole sweep.
 */
// NOTE: inngest 4.13.0 uses the 2-arg createFunction(options, handler) form — the cron trigger lives in
// options.triggers (the older 3-arg `(config, trigger, handler)` skeleton in RESEARCH predates this API).
export const payoutSweep = inngest.createFunction(
  {
    id: "payout-sweep",
    concurrency: 1, // singleton — no overlapping sweeps
    triggers: [{ cron: "TZ=Asia/Manila 0 12-23 * * 5" }],
  },
  async ({ step }) => {
    const now = new Date();
    // Cron invocation has transport latency. Normalize only the 23:00 minute to its
    // scheduled instant; the public release-window rule remains exactly 23:00:00.
    const runAt = new Date(now);
    if (now.getUTCHours() === 15 && now.getUTCMinutes() === 0) runAt.setUTCSeconds(0, 0);
    if (!fridayPayoutWindow(runAt)) return { swept: 0 };
    const mode = payoutDispatchMode();
    if (mode === "hold") return { swept: 0, missed: 0, held: true };
    const due = await step.run("find-due", () => queryDuePayouts(db, runAt));
    const selected = selectDispatchCandidates(due);
    for (const b of selected) {
      await step.run(`payout-${b.bookingId}`, () => payOne(db, b, runAt));
    }
    if (mode === "controlled") return { swept: selected.length, missed: 0 };
    const missed = await step.run("record-friday-cutoff", () => recordMissedFridayPayouts(db, runAt));
    if (missed > 0) {
      await step.run("notify-money-ops-cutoff", () => inngest.send({ name: "fitout/payout-cutoff-alert", data: {} }));
    }
    return { swept: selected.length, missed };
  },
);
