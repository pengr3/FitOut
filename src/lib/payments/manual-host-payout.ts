import "server-only";

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { computeCommission } from "@/lib/payments/commission";
import { PAYOUT_HOLD_HOURS } from "@/lib/payments/config";
import { currentSettlementProof } from "@/lib/payments/settlement";
import { bookingExceptionRef, recordMoneyException, unresolvedPayoutAttention } from "@/lib/payments/payout-exceptions";
import { decryptPayoutRecipientValue } from "@/lib/payout-recipient-crypto";
import { readFrozenManualRecipientFromWeb } from "@/lib/payments/manual-payout-recipient-readback";
import { createExternalHostPayout, findHostPayoutTransfers, getManualTransferDetails,
  inspectManualPayoutWalletFunding, listPossibleHostTransfers, readManualPayoutWalletFunding,
  type ManualTransferDetails } from "@/lib/paymongo";

export const MANUAL_TEST_BOOKING_ID = "911c28f2-328c-42cc-8f79-98181b0c399e";
const TEST_MAX_DEBIT_CENTS = 1710;
const API_EXPECTED_MAX_DEBIT_CENTS = 2710;

type Candidate = {
  bookingId: string; paymentId: string | null; currency: string; status: string;
  endsAt: Date; grossCents: number | null; hostId: string; payoutsEnabled: boolean;
  verificationStatus: string; hostStatus: string | null; bic: string;
  nameCiphertext: string; numberCiphertext: string;
};

/** Final read-only release gate; also used by tests for changes after claim creation. */
export function manualPayoutReleaseReady(input: {
  candidate: Candidate | null; proofPaymentId: string | null;
  wallet: { walletId: string; availableCents: number } | null;
  frozen: { sourceWalletId: string; amountCents: number; transferId: string | null;
    numberCiphertext: string; nameCiphertext: string; bic: string };
  dbNow: Date; otherClaims: number; outstanding: number; hasAttention: boolean;
}): boolean {
  const { candidate, proofPaymentId, wallet, frozen } = input;
  return Boolean(!frozen.transferId && !input.hasAttention && candidate &&
    candidate.status === "confirmed" && candidate.currency.toLowerCase() === "php" &&
    candidate.grossCents === 1900 &&
    new Date(candidate.endsAt).getTime() + PAYOUT_HOLD_HOURS * 3_600_000 <= input.dbNow.getTime() &&
    candidate.payoutsEnabled && ["verified", "host_attested"].includes(candidate.verificationStatus) &&
    candidate.hostStatus !== "suspended" && input.otherClaims === 0 && input.outstanding === 0 &&
    candidate.numberCiphertext === frozen.numberCiphertext &&
    candidate.nameCiphertext === frozen.nameCiphertext && candidate.bic === frozen.bic &&
    proofPaymentId !== null && proofPaymentId === candidate.paymentId &&
    wallet?.walletId === frozen.sourceWalletId && wallet.availableCents >= frozen.amountCents);
}

/** A separate funded gate for the live API experiment; the provider fee remains post-create evidence. */
export function controlledApiPreflightReady(
  input: Parameters<typeof manualPayoutReleaseReady>[0], availableCents: number, attemptState: string,
): boolean {
  return attemptState === "prepared" && Number.isSafeInteger(availableCents) &&
    availableCents >= API_EXPECTED_MAX_DEBIT_CENTS && manualPayoutReleaseReady(input);
}

export type ManualPayoutSnapshot = {
  state: "unprepared" | "prepared" | "submitted" | "failed" | "paid" |
    "api_reserved" | "api_submitted" | "api_failed";
  amountCents: number; maxDebitCents: number; sourceWalletId: string | null;
  sourceAccountLast4: string | null;
  destination: { bic: string; name: string; number: string } | null;
  destinationUnavailable: boolean;
  transferId: string | null; readyToSend: boolean; apiWalletReady: boolean; checkedAt: string | null;
  walletAvailableCents: number | null;
  actualFeeCents: number | null;
};

function testEnabled(): boolean {
  return process.env.PAYOUT_MANUAL_TEST_BOOKING_ID === MANUAL_TEST_BOOKING_ID &&
    process.env.PAYOUT_MANUAL_TEST_MAX_DEBIT_CENTS === String(TEST_MAX_DEBIT_CENTS);
}

function apiTestEnabled(): boolean {
  return testEnabled() && process.env.PAYOUT_API_TEST_BOOKING_ID === MANUAL_TEST_BOOKING_ID &&
    process.env.PAYOUT_API_TEST_EXPECTED_MAX_DEBIT_CENTS === String(API_EXPECTED_MAX_DEBIT_CENTS) &&
    (process.env.PAYOUT_DISPATCH_MODE ?? "hold") === "hold" &&
    process.env.PAYMONGO_SECRET_KEY?.startsWith("sk_live_") === true;
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
      a.actual_fee_cents AS "actualFeeCents",
      a.wallet_id AS "sourceWalletId", a.institution_bic AS bic,
      a.account_name_ciphertext AS "nameCiphertext", a.account_number_ciphertext AS "numberCiphertext",
      a.transfer_id AS "transferId", l.state AS "ledgerState"
    FROM manual_host_payout_attempt a JOIN host_payout_ledger l ON l.id = a.claim_id
    WHERE a.booking_id = ${MANUAL_TEST_BOOKING_ID}
  `)) as unknown as Array<{
    state: ManualPayoutSnapshot["state"]; amountCents: number; maxDebitCents: number;
    actualFeeCents: number | null;
    sourceWalletId: string; bic: string; nameCiphertext: string; numberCiphertext: string;
    transferId: string | null; ledgerState: string;
  }>;
  const row = rows[0];
  if (!row) return { state: "unprepared", amountCents: TEST_MAX_DEBIT_CENTS,
    maxDebitCents: TEST_MAX_DEBIT_CENTS, sourceWalletId: null, destination: null,
    destinationUnavailable: false, sourceAccountLast4: null, transferId: null,
    readyToSend: false, apiWalletReady: false, checkedAt: null, walletAvailableCents: null,
    actualFeeCents: null };
  let readyToSend = false;
  let apiWalletReady = false;
  let walletAvailableCents: number | null = null;
  const checkedAt = new Date().toISOString();
  if (row.state === "prepared" && row.ledgerState === "held" && testEnabled()) {
    try {
      const candidate = await candidateQuery(db, MANUAL_TEST_BOOKING_ID);
      const [proof, wallet, attention] = await Promise.all([
        currentSettlementProof(MANUAL_TEST_BOOKING_ID, db), readManualPayoutWalletFunding(),
        unresolvedPayoutAttention(db, [MANUAL_TEST_BOOKING_ID]),
      ]);
      walletAvailableCents = wallet?.availableCents ?? null;
      const [{ otherClaims, outstanding, dbNow }] = (await db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int FROM host_payout_ledger WHERE kind = 'payout'
            AND state IN ('held', 'processing') AND booking_id <> ${MANUAL_TEST_BOOKING_ID}) AS "otherClaims",
          (SELECT COALESCE(SUM(-net_cents - recovered_cents), 0)::int FROM host_payout_ledger
            WHERE host_id = ${candidate?.hostId ?? ""} AND kind = 'host_cancel_fee'
              AND recovered_cents < -net_cents) AS outstanding,
          now() AS "dbNow"
      `)) as unknown as Array<{ otherClaims: number; outstanding: number; dbNow: Date }>;
      readyToSend = manualPayoutReleaseReady({
        candidate, proofPaymentId: proof?.paymentId ?? null, wallet,
        frozen: { sourceWalletId: row.sourceWalletId, amountCents: row.amountCents,
          transferId: row.transferId, numberCiphertext: row.numberCiphertext,
          nameCiphertext: row.nameCiphertext, bic: row.bic },
        dbNow: new Date(dbNow), otherClaims, outstanding,
        hasAttention: attention.has(MANUAL_TEST_BOOKING_ID),
      });
      apiWalletReady = apiTestEnabled() && readyToSend &&
        (wallet?.availableCents ?? 0) >= API_EXPECTED_MAX_DEBIT_CENTS;
    } catch { readyToSend = false; }
  }
  let destination: ManualPayoutSnapshot["destination"] = null;
  try {
    destination = { bic: row.bic, name: decryptPayoutRecipientValue(row.nameCiphertext),
      number: decryptPayoutRecipientValue(row.numberCiphertext) };
  } catch {
    // Keep the claim held if this deployment cannot read the frozen recipient.
    // Never leak the ciphertext or key material into an error page or log.
  }
  if (!destination) destination = await readFrozenManualRecipientFromWeb(row);
  return {
    state: row.ledgerState === "paid" ? "paid" : row.ledgerState === "failed" ? "failed" : row.state,
    amountCents: row.amountCents, maxDebitCents: row.maxDebitCents,
    sourceWalletId: row.sourceWalletId,
    sourceAccountLast4: process.env.PLATFORM_WALLET_NUMBER?.slice(-4) ?? null,
    destination, destinationUnavailable: destination === null,
    transferId: row.transferId, readyToSend: readyToSend && destination !== null,
    apiWalletReady: apiWalletReady && destination !== null, checkedAt,
    walletAvailableCents, actualFeeCents: row.actualFeeCents,
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
    const walletCheck = await inspectManualPayoutWalletFunding();
    const wallet = walletCheck.funding;
    if (!wallet) return walletCheck.reason;
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
  if (!testEnabled() || !/^(?:tr|wallet_tr)_[A-Za-z0-9]{8,64}$/.test(transferId)) return "invalid_transfer_id";
  // Reserve the reported ID before the network read. If the GET times out, this durable
  // reference keeps the claim on HOLD and prevents a second Dashboard send.
  const reserved = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(2602, 1)`);
    const [row] = (await tx.execute(sql`
      SELECT a.transfer_id AS "transferId", a.state, l.state AS "ledgerState"
      FROM manual_host_payout_attempt a JOIN host_payout_ledger l ON l.id = a.claim_id
      WHERE a.booking_id = ${MANUAL_TEST_BOOKING_ID} FOR UPDATE OF a, l
    `)) as unknown as Array<{ transferId: string | null; state: string; ledgerState: string }>;
    if (!row || row.state !== "prepared" || row.ledgerState !== "held") return "claim_not_prepared";
    if (row.transferId && row.transferId !== transferId) return "different_transfer_under_investigation";
    if (!row.transferId) await tx.execute(sql`
      UPDATE manual_host_payout_attempt SET transfer_id = ${transferId}, updated_at = now()
      WHERE booking_id = ${MANUAL_TEST_BOOKING_ID} AND state = 'prepared' AND transfer_id IS NULL
    `);
    return "reserved";
  });
  if (reserved !== "reserved") return reserved;
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
    if (!row || row.state !== "prepared" || row.ledgerState !== "held" || row.transferId !== transferId)
      return "claim_not_prepared";
    const [used] = (await tx.execute(sql`
      SELECT id FROM host_payout_ledger WHERE transfer_id = ${transferId}
        AND booking_id <> ${MANUAL_TEST_BOOKING_ID} LIMIT 1
    `)) as unknown as Array<{ id: string }>;
    if (used || row.walletId !== process.env.PAYMONGO_WALLET_ID) return "transfer_already_used_or_wallet_changed";
    // The Dashboard may already have sent the money. Later host or settlement changes
    // cannot erase the need to link and track that exact provider transfer.
    let destination: { number: string; name: string; bic: string } | null = null;
    try {
      destination = { number: decryptPayoutRecipientValue(row.numberCiphertext),
        name: decryptPayoutRecipientValue(row.nameCiphertext), bic: row.bic };
    } catch {
      destination = await readFrozenManualRecipientFromWeb(row);
    }
    if (!destination) {
      await recordMoneyException(tx, MANUAL_TEST_BOOKING_ID, "transfer_outcome_uncertain");
      return "recipient_unavailable";
    }
    const expected = {
      amountCents: row.amountCents, maxDebitCents: row.maxDebitCents,
      merchantId: process.env.PAYMONGO_ORGANIZATION_ID ?? "", createdAt: new Date(row.createdAt),
      source: { number: process.env.PLATFORM_WALLET_NUMBER ?? "",
        name: process.env.PLATFORM_WALLET_NAME ?? "", bic: "PAEYPHM2XXX" },
      destination,
    };
    if (!expected.merchantId || !matchesManualTransfer(transfer, expected)) {
      await recordMoneyException(tx, MANUAL_TEST_BOOKING_ID, "transfer_outcome_uncertain");
      return "transfer_identity_or_fee_mismatch";
    }
    if (transfer.status === "failed") {
      await tx.execute(sql`
        UPDATE manual_host_payout_attempt SET state = 'failed', updated_at = now()
        WHERE booking_id = ${MANUAL_TEST_BOOKING_ID} AND state = 'prepared' AND transfer_id = ${transferId}
      `);
      await tx.execute(sql`
        UPDATE host_payout_ledger SET transfer_id = ${transferId}, state = 'failed', updated_at = now()
        WHERE id = ${row.claimId} AND state = 'held' AND transfer_id IS NULL
      `);
      await recordMoneyException(tx, MANUAL_TEST_BOOKING_ID, "transfer_failed");
      return "failed";
    }
    if (transfer.status !== "pending" && transfer.status !== "succeeded") {
      await recordMoneyException(tx, MANUAL_TEST_BOOKING_ID, "transfer_outcome_uncertain");
      return "transfer_not_accepted";
    }
    await tx.execute(sql`
      UPDATE manual_host_payout_attempt SET state = 'submitted', updated_at = now()
      WHERE booking_id = ${MANUAL_TEST_BOOKING_ID} AND state = 'prepared' AND transfer_id = ${transferId}
    `);
    await tx.execute(sql`
      UPDATE host_payout_ledger SET transfer_id = ${transferId}, state = 'processing', updated_at = now()
      WHERE id = ${row.claimId} AND state = 'held' AND transfer_id IS NULL
    `);
    return "submitted";
  });
}

/** Staff records an already-sent Dashboard transfer with no available receipt as an owned HOLD. */
export async function holdManualTestUncertain(reportedTransferId?: string): Promise<string> {
  if (!testEnabled()) return "manual_test_not_enabled";
  if (reportedTransferId && !/^(?:tr|wallet_tr)_[A-Za-z0-9]{8,64}$/.test(reportedTransferId))
    return "invalid_transfer_id";
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(2602, 1)`);
    const [row] = (await tx.execute(sql`
      SELECT a.transfer_id AS "transferId" FROM manual_host_payout_attempt a
      JOIN host_payout_ledger l ON l.id = a.claim_id
      WHERE a.booking_id = ${MANUAL_TEST_BOOKING_ID} AND a.state = 'prepared' AND l.state = 'held'
      FOR UPDATE OF a, l
    `)) as unknown as Array<{ transferId: string | null }>;
    if (!row) return "claim_not_prepared";
    if (reportedTransferId && row.transferId && row.transferId !== reportedTransferId)
      return "different_transfer_under_investigation";
    if (reportedTransferId && !row.transferId) await tx.execute(sql`
      UPDATE manual_host_payout_attempt SET transfer_id = ${reportedTransferId}, updated_at = now()
      WHERE booking_id = ${MANUAL_TEST_BOOKING_ID} AND state = 'prepared' AND transfer_id IS NULL
    `);
    await recordMoneyException(tx, MANUAL_TEST_BOOKING_ID, "transfer_outcome_uncertain");
    return "held_for_investigation";
  });
}

/** Identity is immutable across the Dashboard and API routes; only the API fee policy differs. */
export function matchesApiTestTransfer(transfer: ManualTransferDetails, expected: {
  amountCents: number; merchantId: string; reservedAt: Date;
  source: { number: string; name: string; bic: string };
  destination: { number: string; name: string; bic: string };
}): boolean {
  return Boolean(expected.merchantId && expected.source.number && expected.source.name &&
    expected.destination.number && expected.destination.name && expected.destination.bic) &&
    transfer.liveMode && transfer.merchantId === expected.merchantId &&
    transfer.provider === "instapay" && transfer.currency.toUpperCase() === "PHP" &&
    transfer.referenceNumber === `host-payout-${MANUAL_TEST_BOOKING_ID}` &&
    transfer.amountCents === expected.amountCents && Number.isSafeInteger(transfer.feeCents) &&
    transfer.feeCents >= 0 && transfer.createdAt.getTime() >= expected.reservedAt.getTime() - 1_000 &&
    transfer.source.number === expected.source.number && transfer.source.bic === expected.source.bic &&
    sameName(transfer.source.name, expected.source.name) &&
    transfer.destination.number === expected.destination.number &&
    transfer.destination.bic === expected.destination.bic &&
    sameName(transfer.destination.name, expected.destination.name);
}

export function controlledApiTransferOutcome(status: string, feeCents: number): {
  ledgerState: "paid" | "failed" | "processing" | null; overBudget: boolean;
} {
  const ledgerState = status === "succeeded" ? "paid" : status === "failed" ? "failed" :
    status === "pending" ? "processing" : null;
  return { ledgerState, overBudget: Number.isSafeInteger(feeCents) &&
    feeCents > API_EXPECTED_MAX_DEBIT_CENTS - TEST_MAX_DEBIT_CENTS };
}

export function controlledApiClaimAction(state: string, transferId: string | null):
  "reserve" | "readback" | "hold" {
  if (state === "api_reserved" || state === "api_submitted") return "readback";
  return state === "prepared" && !transferId ? "reserve" : "hold";
}

/** A one-booking, one-POST exception to the Friday clock. Reservation happens before the POST. */
export async function dispatchControlledApiTestPayout(staffId: string): Promise<string> {
  if (!apiTestEnabled()) return "api_test_not_enabled";
  const [initial] = (await db.execute(sql`
    SELECT a.state, a.transfer_id AS "transferId", a.created_at AS "createdAt",
      a.amount_cents AS "amountCents", a.institution_bic AS bic,
      a.account_name_ciphertext AS "nameCiphertext", a.account_number_ciphertext AS "numberCiphertext"
    FROM manual_host_payout_attempt a WHERE a.booking_id = ${MANUAL_TEST_BOOKING_ID}
  `)) as unknown as Array<{ state: string; transferId: string | null; createdAt: Date;
    amountCents: number; bic: string; nameCiphertext: string; numberCiphertext: string }>;
  const action = initial ? controlledApiClaimAction(initial.state, initial.transferId) : "hold";
  if (action === "readback")
    return recoverControlledApiTestPayout();
  if (!initial || action !== "reserve" || initial.amountCents !== 1710)
    return "claim_not_prepared";
  let recipient: { number: string; name: string; bic: string } | null = null;
  try {
    recipient = { bic: initial.bic, number: decryptPayoutRecipientValue(initial.numberCiphertext),
      name: decryptPayoutRecipientValue(initial.nameCiphertext) };
  } catch { recipient = await readFrozenManualRecipientFromWeb(initial); }
  if (!recipient || recipient.bic !== "GXCHPHM2XXX" || !recipient.number.endsWith("9701"))
    return "recipient_unavailable";
  try {
    const [referenceMatches, possible] = await Promise.all([
      findHostPayoutTransfers(MANUAL_TEST_BOOKING_ID),
      listPossibleHostTransfers(initial.amountCents, new Date(initial.createdAt)),
    ]);
    // Even an apparently failed transfer is an existing money attempt, not permission for another.
    if (referenceMatches.length || possible.length) return "prior_transfer_requires_investigation";
  } catch { return "transfer_inventory_unavailable"; }

  const reserved = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(2602, 1)`);
    const [row] = (await tx.execute(sql`
      SELECT a.state, a.transfer_id AS "transferId", a.claim_id AS "claimId",
        a.wallet_id AS "walletId", a.amount_cents AS "amountCents", a.max_debit_cents AS "maxDebitCents",
        a.institution_bic AS bic, a.account_name_ciphertext AS "nameCiphertext",
        a.account_number_ciphertext AS "numberCiphertext", l.state AS "ledgerState",
        l.host_id AS "claimHostId", l.payment_id AS "claimPaymentId", l.net_cents AS "claimNetCents"
      FROM manual_host_payout_attempt a JOIN host_payout_ledger l ON l.id = a.claim_id
      WHERE a.booking_id = ${MANUAL_TEST_BOOKING_ID} AND l.kind = 'payout' FOR UPDATE OF a, l
    `)) as unknown as Array<{ state: string; transferId: string | null; claimId: string;
      walletId: string; amountCents: number; maxDebitCents: number; bic: string;
      nameCiphertext: string; numberCiphertext: string; ledgerState: string;
      claimHostId: string; claimPaymentId: string; claimNetCents: number }>;
    if (!row || row.state !== "prepared" || row.ledgerState !== "held" || row.transferId ||
        row.amountCents !== 1710 || row.maxDebitCents !== 1710 || row.claimNetCents !== 1710)
      return "claim_not_prepared";
    const [{ now }] = (await tx.execute(sql`SELECT now() AS now`)) as unknown as Array<{ now: Date }>;
    const candidate = await candidateQuery(tx as unknown as typeof db, MANUAL_TEST_BOOKING_ID, true);
    const proof = await currentSettlementProof(MANUAL_TEST_BOOKING_ID, tx, new Date(now));
    const [funding, attention, counts] = await Promise.all([
      inspectManualPayoutWalletFunding(), unresolvedPayoutAttention(tx, [MANUAL_TEST_BOOKING_ID]),
      tx.execute(sql`
        SELECT (SELECT COUNT(*)::int FROM host_payout_ledger WHERE kind = 'payout'
          AND state IN ('held', 'processing') AND booking_id <> ${MANUAL_TEST_BOOKING_ID}) AS "otherClaims",
          (SELECT COALESCE(SUM(-net_cents - recovered_cents), 0)::int FROM host_payout_ledger
            WHERE host_id = ${candidate?.hostId ?? ""} AND kind = 'host_cancel_fee'
              AND recovered_cents < -net_cents) AS outstanding
      `),
    ]);
    const [{ otherClaims, outstanding }] = counts as unknown as Array<{ otherClaims: number; outstanding: number }>;
    if (!controlledApiPreflightReady({ candidate, proofPaymentId: proof?.paymentId ?? null,
      wallet: funding.funding, frozen: { sourceWalletId: row.walletId, amountCents: row.amountCents,
        transferId: row.transferId, numberCiphertext: row.numberCiphertext,
        nameCiphertext: row.nameCiphertext, bic: row.bic }, dbNow: new Date(now),
      otherClaims, outstanding, hasAttention: attention.has(MANUAL_TEST_BOOKING_ID) },
      funding.funding?.availableCents ?? -1, row.state) ||
      row.bic !== recipient.bic || row.numberCiphertext !== initial.numberCiphertext ||
      row.nameCiphertext !== initial.nameCiphertext || row.walletId !== process.env.PAYMONGO_WALLET_ID ||
      row.claimHostId !== candidate?.hostId || row.claimPaymentId !== candidate?.paymentId)
      return "api_preflight_on_hold";
    await tx.execute(sql`
      UPDATE manual_host_payout_attempt SET state = 'api_reserved', max_debit_cents = ${API_EXPECTED_MAX_DEBIT_CENTS},
        api_reserved_at = now(), api_authorized_staff_id = ${staffId}, updated_at = now()
      WHERE booking_id = ${MANUAL_TEST_BOOKING_ID} AND state = 'prepared' AND transfer_id IS NULL
    `);
    await tx.execute(sql`
      INSERT INTO audit (id, actor_id, action, outcome, meta)
      VALUES (${randomUUID()}, ${staffId}, 'host_payout_api_attempt', 'reserved',
        ${JSON.stringify({ bookingRef: bookingExceptionRef(MANUAL_TEST_BOOKING_ID),
          principalCents: TEST_MAX_DEBIT_CENTS, expectedMaxDebitCents: API_EXPECTED_MAX_DEBIT_CENTS,
          previousRoute: "dashboard_prepared" })}::jsonb)
    `);
    return "reserved";
  }).catch(() => "api_preflight_on_hold");
  // A competing staff request may reserve the prepared row first. Read its attempt back;
  // the losing request must never reach the provider POST.
  if (reserved !== "reserved")
    return reserved === "claim_not_prepared" ? recoverControlledApiTestPayout() : reserved;

  try {
    const created = await createExternalHostPayout({ netCents: 1710, bookingId: MANUAL_TEST_BOOKING_ID,
      description: `FitOut test host payout ${MANUAL_TEST_BOOKING_ID}`, destination: recipient });
    if (created.transferId && /^(?:tr|wallet_tr)_[A-Za-z0-9]{8,64}$/.test(created.transferId)) {
      await db.execute(sql`
        UPDATE manual_host_payout_attempt SET transfer_id = ${created.transferId}, updated_at = now()
        WHERE booking_id = ${MANUAL_TEST_BOOKING_ID} AND state = 'api_reserved' AND transfer_id IS NULL
      `);
    }
  } catch {
    await recordMoneyException(db, MANUAL_TEST_BOOKING_ID, "transfer_outcome_uncertain");
  }
  return recoverControlledApiTestPayout();
}

/** Read-only provider recovery after reservation; never sends a second transfer. */
export async function recoverControlledApiTestPayout(): Promise<string> {
  if (!apiTestEnabled()) return "api_test_not_enabled";
  const [row] = (await db.execute(sql`
    SELECT a.state, a.transfer_id AS "transferId", a.api_reserved_at AS "reservedAt",
      a.claim_id AS "claimId", a.wallet_id AS "walletId", a.amount_cents AS "amountCents",
      a.institution_bic AS bic, a.account_name_ciphertext AS "nameCiphertext",
      a.account_number_ciphertext AS "numberCiphertext", l.state AS "ledgerState"
    FROM manual_host_payout_attempt a JOIN host_payout_ledger l ON l.id = a.claim_id
    WHERE a.booking_id = ${MANUAL_TEST_BOOKING_ID}
  `)) as unknown as Array<{ state: string; transferId: string | null; reservedAt: Date | null;
    claimId: string; walletId: string; amountCents: number; bic: string;
    nameCiphertext: string; numberCiphertext: string; ledgerState: string }>;
  if (!row || !["api_reserved", "api_submitted"].includes(row.state) || !row.reservedAt)
    return "api_claim_not_reserved";
  let transferId = row.transferId;
  if (!transferId) {
    try {
      const found = await findHostPayoutTransfers(MANUAL_TEST_BOOKING_ID);
      if (found.length !== 1 || found[0].amount !== row.amountCents ||
          found[0].currency?.toUpperCase() !== "PHP") {
        await recordMoneyException(db, MANUAL_TEST_BOOKING_ID, "transfer_outcome_uncertain");
        return "provider_result_unresolved";
      }
      transferId = found[0].id;
    } catch { return "transfer_read_unavailable"; }
  }
  let transfer: ManualTransferDetails;
  try { transfer = await getManualTransferDetails(transferId); }
  catch { return "transfer_read_unavailable"; }
  let recipient: { number: string; name: string; bic: string } | null = null;
  try { recipient = { number: decryptPayoutRecipientValue(row.numberCiphertext),
    name: decryptPayoutRecipientValue(row.nameCiphertext), bic: row.bic }; }
  catch { recipient = await readFrozenManualRecipientFromWeb(row); }
  if (!recipient || !matchesApiTestTransfer(transfer, { amountCents: row.amountCents,
    merchantId: process.env.PAYMONGO_ORGANIZATION_ID ?? "", reservedAt: new Date(row.reservedAt),
    source: { number: process.env.PLATFORM_WALLET_NUMBER ?? "",
      name: process.env.PLATFORM_WALLET_NAME ?? "", bic: "PAEYPHM2XXX" }, destination: recipient })) {
    await recordMoneyException(db, MANUAL_TEST_BOOKING_ID, "transfer_outcome_uncertain");
    return "transfer_identity_mismatch";
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(2602, 1)`);
    const [current] = (await tx.execute(sql`
      SELECT a.state, a.transfer_id AS "transferId", l.state AS "ledgerState"
      FROM manual_host_payout_attempt a JOIN host_payout_ledger l ON l.id = a.claim_id
      WHERE a.booking_id = ${MANUAL_TEST_BOOKING_ID} FOR UPDATE OF a, l
    `)) as unknown as Array<{ state: string; transferId: string | null; ledgerState: string }>;
    if (!current || !["api_reserved", "api_submitted"].includes(current.state) ||
        (current.transferId && current.transferId !== transferId)) return "different_transfer_under_investigation";
    const outcome = controlledApiTransferOutcome(transfer.status, transfer.feeCents);
    if (outcome.overBudget)
      await recordMoneyException(tx, MANUAL_TEST_BOOKING_ID, "api_fee_over_budget");
    const nextState = outcome.ledgerState;
    if (!nextState) return "provider_status_unresolved";
    await tx.execute(sql`
      UPDATE manual_host_payout_attempt SET state = ${nextState === "failed" ? "api_failed" : "api_submitted"},
        transfer_id = ${transferId}, actual_fee_cents = ${transfer.feeCents}, updated_at = now()
      WHERE booking_id = ${MANUAL_TEST_BOOKING_ID} AND state IN ('api_reserved', 'api_submitted')
        AND (transfer_id IS NULL OR transfer_id = ${transferId})
    `);
    await tx.execute(sql`
      UPDATE host_payout_ledger SET state = ${nextState}::payout_ledger_state,
        transfer_id = ${transferId},
        paid_at = CASE WHEN ${nextState === "paid"} THEN now() ELSE NULL END,
        updated_at = now()
      WHERE id = ${row.claimId} AND state IN ('held', 'processing')
        AND (transfer_id IS NULL OR transfer_id = ${transferId})
    `);
    if (nextState === "failed") await recordMoneyException(tx, MANUAL_TEST_BOOKING_ID, "transfer_failed");
    return nextState;
  });
}
