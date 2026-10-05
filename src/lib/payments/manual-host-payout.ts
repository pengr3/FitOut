import "server-only";

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { computeCommission } from "@/lib/payments/commission";
import { PAYOUT_HOLD_HOURS } from "@/lib/payments/config";
import { currentSettlementProof } from "@/lib/payments/settlement";
import { recordMoneyException } from "@/lib/payments/payout-exceptions";
import { decryptPayoutRecipientValue } from "@/lib/payout-recipient-crypto";
import { getManualTransferDetails, readManualPayoutWalletFunding, type ManualTransferDetails } from "@/lib/paymongo";

export const MANUAL_TEST_BOOKING_ID = "911c28f2-328c-42cc-8f79-98181b0c399e";
const TEST_MAX_DEBIT_CENTS = 1710;

type Candidate = {
  bookingId: string; paymentId: string | null; currency: string; status: string;
  endsAt: Date; grossCents: number | null; hostId: string; payoutsEnabled: boolean;
  verificationStatus: string; hostStatus: string | null; bic: string;
  nameCiphertext: string; numberCiphertext: string;
};

export type ManualPayoutSnapshot = {
  state: "unprepared" | "prepared" | "submitted" | "failed" | "paid";
  amountCents: number; maxDebitCents: number; sourceWalletId: string | null;
  sourceAccountLast4: string | null;
  destination: { bic: string; name: string; number: string } | null;
  transferId: string | null; readyToSend: boolean; checkedAt: string | null;
};

function testEnabled(): boolean {
  return process.env.PAYOUT_MANUAL_TEST_BOOKING_ID === MANUAL_TEST_BOOKING_ID &&
    process.env.PAYOUT_MANUAL_TEST_MAX_DEBIT_CENTS === String(TEST_MAX_DEBIT_CENTS);
}

async function candidateQuery(conn: typeof db, bookingId: string, lock = false): Promise<Candidate | null> {
  const lockClause = lock ? sql`FOR UPDATE OF b, hp, hpd` : sql``;
  const rows = (await conn.execute(sql`
    SELECT b.id AS "bookingId", b.payment_id AS "paymentId", b.currency,
      b.status::text AS status, b.ends_at AS "endsAt",
      COALESCE(b.retained_space_cents, b.space_price_cents) AS "grossCents",
      l.host_id AS "hostId", hp.payouts_enabled AS "payoutsEnabled",
      hpd.verification_status AS "verificationStatus", hv.status::text AS "hostStatus",
      hpd.institution_bic AS bic, hpd.account_name_ciphertext AS "nameCiphertext",
      hpd.account_number_ciphertext AS "numberCiphertext"
    FROM booking b JOIN listing l ON l.id = b.listing_id
    JOIN host_payout hp ON hp.user_id = l.host_id
    JOIN host_payout_destination hpd ON hpd.user_id = l.host_id
    LEFT JOIN host_verification hv ON hv.user_id = l.host_id
    WHERE b.id = ${bookingId} LIMIT 1 ${lockClause}
  `)) as unknown as Candidate[];
  return rows[0] ?? null;
}

export async function readManualPayoutSnapshot(): Promise<ManualPayoutSnapshot> {
  const rows = (await db.execute(sql`
    SELECT a.state, a.amount_cents AS "amountCents", a.max_debit_cents AS "maxDebitCents",
      a.wallet_id AS "sourceWalletId", a.institution_bic AS bic,
      a.account_name_ciphertext AS "nameCiphertext", a.account_number_ciphertext AS "numberCiphertext",
      a.transfer_id AS "transferId", l.state AS "ledgerState"
    FROM manual_host_payout_attempt a JOIN host_payout_ledger l ON l.id = a.claim_id
    WHERE a.booking_id = ${MANUAL_TEST_BOOKING_ID}
  `)) as unknown as Array<{
    state: "prepared" | "submitted" | "failed"; amountCents: number; maxDebitCents: number;
    sourceWalletId: string; bic: string; nameCiphertext: string; numberCiphertext: string;
    transferId: string | null; ledgerState: string;
  }>;
  const row = rows[0];
  if (!row) return { state: "unprepared", amountCents: TEST_MAX_DEBIT_CENTS,
    maxDebitCents: TEST_MAX_DEBIT_CENTS, sourceWalletId: null, destination: null,
    sourceAccountLast4: null, transferId: null, readyToSend: false, checkedAt: null };
  let readyToSend = false;
  const checkedAt = new Date().toISOString();
  if (row.state === "prepared" && row.ledgerState === "held" && testEnabled()) {
    try {
      const candidate = await candidateQuery(db, MANUAL_TEST_BOOKING_ID);
      const [proof, wallet] = await Promise.all([
        currentSettlementProof(MANUAL_TEST_BOOKING_ID, db), readManualPayoutWalletFunding(),
      ]);
      const [{ otherClaims }] = (await db.execute(sql`
        SELECT COUNT(*)::int AS "otherClaims" FROM host_payout_ledger
        WHERE kind = 'payout' AND state IN ('held', 'processing')
          AND booking_id <> ${MANUAL_TEST_BOOKING_ID}
      `)) as unknown as Array<{ otherClaims: number }>;
      readyToSend = Boolean(candidate && candidate.status === "confirmed" &&
        candidate.currency.toLowerCase() === "php" && candidate.grossCents === 1900 &&
        new Date(candidate.endsAt).getTime() + PAYOUT_HOLD_HOURS * 3_600_000 <= Date.now() &&
        candidate.payoutsEnabled && candidate.hostStatus !== "suspended" && otherClaims === 0 &&
        candidate.numberCiphertext === row.numberCiphertext &&
        candidate.nameCiphertext === row.nameCiphertext && candidate.bic === row.bic &&
        proof?.paymentId === candidate.paymentId &&
        wallet?.walletId === row.sourceWalletId && wallet.availableCents >= row.amountCents);
    } catch { readyToSend = false; }
  }
  return {
    state: row.ledgerState === "paid" ? "paid" : row.ledgerState === "failed" ? "failed" : row.state,
    amountCents: row.amountCents, maxDebitCents: row.maxDebitCents,
    sourceWalletId: row.sourceWalletId,
    sourceAccountLast4: process.env.PLATFORM_WALLET_NUMBER?.slice(-4) ?? null,
    destination: { bic: row.bic, name: decryptPayoutRecipientValue(row.nameCiphertext),
      number: decryptPayoutRecipientValue(row.numberCiphertext) },
    transferId: row.transferId, readyToSend, checkedAt,
  };
}

/** Creates a booking-wide, durable HOLD. Never calls a money-moving PayMongo endpoint. */
export async function prepareManualTestPayout(staffId: string): Promise<string> {
  if (!testEnabled()) return "manual_test_not_enabled";
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(2602, 1)`);
    const [{ now }] = (await tx.execute(sql`SELECT now() AS now`)) as unknown as Array<{ now: Date }>;
    const candidate = await candidateQuery(tx as unknown as typeof db, MANUAL_TEST_BOOKING_ID, true);
    if (!candidate || !candidate.paymentId || candidate.status !== "confirmed" ||
        candidate.currency.toLowerCase() !== "php" || !candidate.payoutsEnabled ||
        !["verified", "host_attested"].includes(candidate.verificationStatus) ||
        candidate.hostStatus === "suspended") return "booking_or_host_ineligible";
    if (new Date(candidate.endsAt).getTime() + PAYOUT_HOLD_HOURS * 3_600_000 > new Date(now).getTime())
      return "session_hold_not_elapsed";
    if (candidate.grossCents !== 1900) return "payout_basis_changed";
    const commission = computeCommission(candidate.grossCents);
    if (commission.netCents !== TEST_MAX_DEBIT_CENTS) return "payout_amount_changed";
    const proof = await currentSettlementProof(MANUAL_TEST_BOOKING_ID, tx, new Date(now));
    if (!proof || proof.paymentId !== candidate.paymentId || proof.depositedAt > new Date(now))
      return "settlement_unproved";
    const [prior] = (await tx.execute(sql`
      SELECT id FROM host_payout_ledger WHERE booking_id = ${MANUAL_TEST_BOOKING_ID} AND kind = 'payout'
    `)) as unknown as Array<{ id: string }>;
    if (prior) return "already_claimed";
    const [{ otherClaims, outstanding }] = (await tx.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM host_payout_ledger WHERE kind = 'payout'
          AND state IN ('held', 'processing')) AS "otherClaims",
        (SELECT COALESCE(SUM(-net_cents - recovered_cents), 0)::int FROM host_payout_ledger
          WHERE host_id = ${candidate.hostId} AND kind = 'host_cancel_fee'
            AND recovered_cents < -net_cents) AS outstanding
    `)) as unknown as Array<{ otherClaims: number; outstanding: number }>;
    if (otherClaims > 0 || outstanding > 0) return "other_claim_or_host_debit";
    let wallet;
    try { wallet = await readManualPayoutWalletFunding(); } catch { wallet = null; }
    if (!wallet) return "wallet_mapping_unverified";
    if (wallet.availableCents < TEST_MAX_DEBIT_CENTS) return "wallet_insufficient";
    const claimId = randomUUID();
    const inserted = (await tx.execute(sql`
      INSERT INTO host_payout_ledger
        (id, booking_id, host_id, payment_id, gross_cents, commission_rate_bps,
         commission_cents, net_cents, currency, kind, state)
      VALUES (${claimId}, ${MANUAL_TEST_BOOKING_ID}, ${candidate.hostId}, ${candidate.paymentId},
        ${candidate.grossCents}, ${commission.rateBps}, ${commission.commissionCents},
        ${commission.netCents}, ${candidate.currency}, 'payout', 'held')
      ON CONFLICT (booking_id, kind) DO NOTHING RETURNING id
    `)) as unknown as Array<{ id: string }>;
    if (!inserted.length) return "already_claimed";
    await tx.execute(sql`
      INSERT INTO manual_host_payout_attempt
        (booking_id, claim_id, staff_id, wallet_id, institution_bic,
         account_name_ciphertext, account_number_ciphertext, amount_cents, max_debit_cents)
      VALUES (${MANUAL_TEST_BOOKING_ID}, ${claimId}, ${staffId}, ${wallet.walletId},
        ${candidate.bic}, ${candidate.nameCiphertext}, ${candidate.numberCiphertext},
        ${commission.netCents}, ${TEST_MAX_DEBIT_CENTS})
    `);
    return "prepared";
  });
}

function sameName(left: string, right: string): boolean {
  return left.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-PH") ===
    right.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-PH");
}

export function matchesManualTransfer(transfer: ManualTransferDetails, expected: {
  amountCents: number; maxDebitCents: number; merchantId: string; createdAt: Date;
  source: { number: string; name: string; bic: string };
  destination: { number: string; name: string; bic: string };
}): boolean {
  return Boolean(expected.merchantId && expected.source.number && expected.source.name &&
    expected.destination.number && expected.destination.name && expected.destination.bic) &&
    transfer.liveMode === true && transfer.merchantId === expected.merchantId &&
    transfer.currency.toUpperCase() === "PHP" && transfer.provider === "instapay" &&
    transfer.amountCents === expected.amountCents && transfer.feeCents === 0 &&
    transfer.amountCents + transfer.feeCents <= expected.maxDebitCents &&
    transfer.createdAt.getTime() >= expected.createdAt.getTime() - 1_000 &&
    transfer.source.number === expected.source.number &&
    sameName(transfer.source.name, expected.source.name) && transfer.source.bic === expected.source.bic &&
    transfer.destination.number === expected.destination.number &&
    sameName(transfer.destination.name, expected.destination.name) &&
    transfer.destination.bic === expected.destination.bic;
}

/** Attach only an exact, provider-verified Dashboard transfer; ambiguity leaves the claim held. */
export async function attachManualTestTransfer(transferId: string): Promise<string> {
  if (!testEnabled() || !/^tr_[A-Za-z0-9]{8,64}$/.test(transferId)) return "invalid_transfer_id";
  const [openClaim] = (await db.execute(sql`
    SELECT 1 FROM manual_host_payout_attempt a JOIN host_payout_ledger l ON l.id = a.claim_id
    WHERE a.booking_id = ${MANUAL_TEST_BOOKING_ID} AND a.state = 'prepared'
      AND a.transfer_id IS NULL AND l.state = 'held'
  `)) as unknown as Array<{ "?column?": number }>;
  if (!openClaim) return "claim_not_prepared";
  const transfer = await getManualTransferDetails(transferId).catch(() => null);
  if (!transfer) {
    await recordMoneyException(db, MANUAL_TEST_BOOKING_ID, "transfer_read_unavailable");
    return "transfer_read_unavailable";
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(2602, 1)`);
    const rows = (await tx.execute(sql`
      SELECT a.amount_cents AS "amountCents", a.max_debit_cents AS "maxDebitCents",
        a.created_at AS "createdAt", a.wallet_id AS "walletId", a.institution_bic AS bic,
        a.account_name_ciphertext AS "nameCiphertext", a.account_number_ciphertext AS "numberCiphertext",
        a.transfer_id AS "transferId", a.state, l.state AS "ledgerState",
        l.id AS "claimId"
      FROM manual_host_payout_attempt a JOIN host_payout_ledger l ON l.id = a.claim_id
      WHERE a.booking_id = ${MANUAL_TEST_BOOKING_ID} FOR UPDATE OF a, l
    `)) as unknown as Array<{
      amountCents: number; maxDebitCents: number; createdAt: Date; walletId: string; bic: string;
      nameCiphertext: string; numberCiphertext: string; transferId: string | null;
      state: string; ledgerState: string; claimId: string;
    }>;
    const row = rows[0];
    if (!row || row.state !== "prepared" || row.ledgerState !== "held" || row.transferId)
      return "claim_not_prepared";
    const [used] = (await tx.execute(sql`
      SELECT id FROM host_payout_ledger WHERE transfer_id = ${transferId}
        AND booking_id <> ${MANUAL_TEST_BOOKING_ID} LIMIT 1
    `)) as unknown as Array<{ id: string }>;
    if (used || row.walletId !== process.env.PAYMONGO_WALLET_ID) return "transfer_already_used_or_wallet_changed";
    // The Dashboard may already have sent the money. Later host or settlement changes
    // cannot erase the need to link and track that exact provider transfer.
    const expected = {
      amountCents: row.amountCents, maxDebitCents: row.maxDebitCents,
      merchantId: process.env.PAYMONGO_ORGANIZATION_ID ?? "", createdAt: new Date(row.createdAt),
      source: { number: process.env.PLATFORM_WALLET_NUMBER ?? "",
        name: process.env.PLATFORM_WALLET_NAME ?? "", bic: "PAEYPHM2XXX" },
      destination: { number: decryptPayoutRecipientValue(row.numberCiphertext),
        name: decryptPayoutRecipientValue(row.nameCiphertext), bic: row.bic },
    };
    if (!expected.merchantId || !matchesManualTransfer(transfer, expected)) {
      await recordMoneyException(tx, MANUAL_TEST_BOOKING_ID, "transfer_outcome_uncertain");
      return "transfer_identity_or_fee_mismatch";
    }
    if (transfer.status !== "pending" && transfer.status !== "succeeded")
      return "transfer_not_accepted";
    await tx.execute(sql`
      UPDATE manual_host_payout_attempt SET transfer_id = ${transferId}, state = 'submitted', updated_at = now()
      WHERE booking_id = ${MANUAL_TEST_BOOKING_ID} AND state = 'prepared' AND transfer_id IS NULL
    `);
    await tx.execute(sql`
      UPDATE host_payout_ledger SET transfer_id = ${transferId}, state = 'processing', updated_at = now()
      WHERE id = ${row.claimId} AND state = 'held' AND transfer_id IS NULL
    `);
    return "submitted";
  });
}
