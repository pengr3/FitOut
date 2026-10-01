import "server-only";

import { sql } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import type { DbConn } from "@/lib/availability/read-model";
import {
  getMerchantPayout, listMerchantPayouts, listMerchantPayoutTransactions,
} from "@/lib/paymongo";
import { currentSettlementProof, recordSettlementObservation, type SettlementObservation } from "@/lib/payments/settlement";
import { recordMoneyException } from "@/lib/payments/payout-exceptions";

export type ProviderReader = {
  listPayouts(after?: string): Promise<unknown>;
  getPayout(id: string): Promise<unknown>;
  listTransactions(payoutId: string, after?: string): Promise<unknown>;
};

/** Values are release evidence, not documentation guesses. Missing values keep the job on HOLD. */
export type SettlementAccountEvidence = {
  paymentField: "id" | "attributes.payment_id";
  transactionType: "payment" | "split_payment";
  walletAccountNumber: string;
  walletBankId: string;
  organizationId: string;
  liveMode: true;
};

export type RefreshResult = { bookingId: string; state: "proved" | "unproved" | "exception"; reason?: string };

const MAX_PAYOUT_PAGES = 5;
const MAX_TRANSACTION_PAGES = 20;

type Dict = Record<string, unknown>;
const object = (value: unknown): Dict | null => value && typeof value === "object" && !Array.isArray(value) ? value as Dict : null;
const string = (value: unknown): string | null => typeof value === "string" && value.length > 0 ? value : null;

function page(value: unknown): { data: Dict[]; next: string | null } | null {
  const root = object(value);
  const pagination = object(root?.pagination);
  if (!Array.isArray(root?.data) || !pagination || !("next_cursor" in pagination)) return null;
  const next = pagination.next_cursor;
  if (next !== null && !string(next)) return null;
  const data = root.data.map(object);
  if (data.some((entry) => !entry)) return null;
  return { data: data as Dict[], next: next as string | null };
}

function accountReady(account: SettlementAccountEvidence): boolean {
  return Boolean(
    (account.paymentField === "id" || account.paymentField === "attributes.payment_id") &&
    (account.transactionType === "payment" || account.transactionType === "split_payment") &&
    account.walletAccountNumber && account.walletBankId && account.organizationId && account.liveMode === true,
  );
}

function providerStatus(raw: unknown, payoutId: string, account: SettlementAccountEvidence) {
  const resource = object(object(raw)?.data);
  const attributes = object(resource?.attributes);
  const organization = object(attributes?.organization);
  const status = string(attributes?.status);
  const time = attributes?.status_updated_at;
  if (resource?.id !== payoutId || resource?.type !== "payout" || !attributes ||
      organization?.id !== account.organizationId || attributes.currency !== "PHP" ||
      !status || typeof time !== "number" || !Number.isSafeInteger(time) || time <= 0) return null;
  if (!["pending", "on_hold", "in_transit", "deposited", "returned", "cancelled"].includes(status)) return null;
  return {
    status,
    statusAt: new Date(time * 1000),
    destinationMatched: attributes.bank_account_number === account.walletAccountNumber &&
      attributes.bank_id === account.walletBankId,
  };
}

function transactionMatch(raw: Dict, payoutId: string, paymentId: string, currency: string, account: SettlementAccountEvidence) {
  const attrs = object(raw.attributes);
  const id = string(raw.id);
  if (!attrs || !id) return { kind: "invalid" as const };
  const chosenPaymentId = account.paymentField === "id" ? id : string(attrs.payment_id);
  const otherPaymentId = account.paymentField === "id" ? string(attrs.payment_id) : id;
  // A recognizable booking payment in the non-authoritative field requires account review.
  if (chosenPaymentId !== paymentId && otherPaymentId === paymentId) return { kind: "ambiguous" as const };
  if (chosenPaymentId !== paymentId || raw.type !== account.transactionType) return { kind: "other" as const };
  if (attrs.payout_id !== payoutId || attrs.currency?.toString().toLowerCase() !== currency.toLowerCase() ||
      attrs.livemode !== account.liveMode || attrs.organization_id !== account.organizationId) {
    return { kind: "contradiction" as const };
  }
  return { kind: "match" as const, id };
}

async function exception(bookingId: string, reason: string, dbConn: DbConn): Promise<RefreshResult> {
  console.error("[settlement-alert] booking settlement read unavailable", { bookingId, reason });
  await recordMoneyException(dbConn, bookingId, "settlement_read_unavailable");
  return { bookingId, state: "exception", reason };
}

/** Read every transaction page for a candidate payout before writing one immutable observation. */
export async function refreshBookingSettlement(
  bookingId: string,
  reader: ProviderReader,
  account: SettlementAccountEvidence,
  dbConn: DbConn = db,
): Promise<RefreshResult> {
  if (!accountReady(account)) return exception(bookingId, "account_mapping_unverified", dbConn);
  const bookings = (await dbConn.execute(sql`
    SELECT payment_id AS "paymentId", currency FROM booking WHERE id = ${bookingId} LIMIT 1
  `)) as unknown as { paymentId: string | null; currency: string }[];
  const booked = bookings[0];
  if (!booked?.paymentId) return { bookingId, state: "unproved", reason: "captured_payment_missing" };

  try {
    let payoutAfter: string | undefined;
    const seenPayoutCursors = new Set<string>();
    const matches: Array<{ payoutId: string; transactionId: string; status: NonNullable<ReturnType<typeof providerStatus>> }> = [];
    let payoutScanComplete = false;
    for (let payoutPage = 0; payoutPage < MAX_PAYOUT_PAGES; payoutPage++) {
      const listings = page(await reader.listPayouts(payoutAfter));
      if (!listings) return exception(bookingId, "payout_page_invalid", dbConn);
      for (const listed of listings.data) {
        const payoutId = string(listed.id);
        if (!payoutId) return exception(bookingId, "payout_id_missing", dbConn);
        const status = providerStatus(await reader.getPayout(payoutId), payoutId, account);
        if (!status) return exception(bookingId, "payout_detail_invalid", dbConn);

        let transactionAfter: string | undefined;
        const seenTransactionCursors = new Set<string>();
        let matchingTransactionId: string | null = null;
        let complete = false;
        for (let transactionPage = 0; transactionPage < MAX_TRANSACTION_PAGES; transactionPage++) {
          const transactions = page(await reader.listTransactions(payoutId, transactionAfter));
          if (!transactions) return exception(bookingId, "transaction_page_invalid", dbConn);
          for (const transaction of transactions.data) {
            const match = transactionMatch(transaction, payoutId, booked.paymentId, booked.currency, account);
            if (match.kind === "ambiguous" || match.kind === "contradiction" || match.kind === "invalid") {
              return exception(bookingId, `transaction_${match.kind}`, dbConn);
            }
            if (match.kind === "match") {
              if (matchingTransactionId && matchingTransactionId !== match.id) return exception(bookingId, "multiple_payment_transactions", dbConn);
              matchingTransactionId = match.id;
            }
          }
          if (transactions.next === null) { complete = true; break; }
          if (seenTransactionCursors.has(transactions.next)) return exception(bookingId, "transaction_cursor_cycle", dbConn);
          seenTransactionCursors.add(transactions.next);
          transactionAfter = transactions.next;
        }
        if (!complete) return exception(bookingId, "transaction_pagination_incomplete", dbConn);
        if (!matchingTransactionId) continue;
        // Re-read after pagination. A return between the first detail and the last page must
        // become the current observation, never a stale deposited proof.
        const finalStatus = providerStatus(await reader.getPayout(payoutId), payoutId, account);
        if (!finalStatus || finalStatus.statusAt < status.statusAt) return exception(bookingId, "payout_detail_changed_invalidly", dbConn);
        matches.push({ payoutId, transactionId: matchingTransactionId, status: finalStatus });
      }
      if (listings.next === null) { payoutScanComplete = true; break; }
      if (seenPayoutCursors.has(listings.next)) return exception(bookingId, "payout_cursor_cycle", dbConn);
      seenPayoutCursors.add(listings.next);
      payoutAfter = listings.next;
    }
    if (!payoutScanComplete) return exception(bookingId, "payout_pagination_incomplete", dbConn);
    if (matches.length > 1) return exception(bookingId, "multiple_payment_payouts", dbConn);
    const match = matches[0];
    if (!match) return { bookingId, state: "unproved", reason: "payment_not_in_payouts" };
    const observation: SettlementObservation = {
      paymentId: booked.paymentId, payoutId: match.payoutId, transactionId: match.transactionId,
      transactionType: account.transactionType, currency: booked.currency,
      liveMode: account.liveMode, providerStatus: match.status.status,
      destinationMatched: match.status.destinationMatched, paginationComplete: true,
      mappingVerified: true, providerStatusAt: match.status.statusAt, verifiedAt: new Date(),
    };
    await recordSettlementObservation(bookingId, observation, dbConn);
    if (match.status.status === "returned" || match.status.status === "cancelled") {
      await recordMoneyException(dbConn, bookingId, "settlement_returned");
    }
    return { bookingId, state: (await currentSettlementProof(bookingId, dbConn)) ? "proved" : "unproved" };
  } catch {
    // No raw provider body, destination, or credentials in logs.
    return exception(bookingId, "provider_read_failed", dbConn);
  }
}

export async function querySettlementRefreshCandidates(dbConn: DbConn = db) {
  return (await dbConn.execute(sql`
    SELECT b.id AS "bookingId" FROM booking b
    WHERE b.payment_id IS NOT NULL AND b.status IN ('confirmed', 'completed', 'cancelled')
    -- Rotate the bounded cohort hourly. A permanent oldest-first LIMIT would starve later bookings,
    -- and paid bookings still need return detection after a host transfer.
    ORDER BY md5(b.id || date_trunc('hour', now())::text) LIMIT 20
  `)) as unknown as { bookingId: string }[];
}

export function configuredSettlementAccount(): SettlementAccountEvidence | null {
  const paymentField = process.env.PAYMONGO_SETTLEMENT_PAYMENT_FIELD;
  const transactionType = process.env.PAYMONGO_SETTLEMENT_TRANSACTION_TYPE;
  if (process.env.PAYMONGO_SETTLEMENT_ACCOUNT_EVIDENCE_VERIFIED !== "true" ||
      (paymentField !== "id" && paymentField !== "attributes.payment_id") ||
      (transactionType !== "payment" && transactionType !== "split_payment") ||
      !process.env.PAYMONGO_SETTLEMENT_WALLET_NUMBER || !process.env.PAYMONGO_SETTLEMENT_WALLET_BANK_ID ||
      !process.env.PAYMONGO_SETTLEMENT_ORGANIZATION_ID) return null;
  return {
    paymentField, transactionType,
    walletAccountNumber: process.env.PAYMONGO_SETTLEMENT_WALLET_NUMBER,
    walletBankId: process.env.PAYMONGO_SETTLEMENT_WALLET_BANK_ID,
    organizationId: process.env.PAYMONGO_SETTLEMENT_ORGANIZATION_ID,
    liveMode: true,
  };
}

const paymongoReader: ProviderReader = {
  listPayouts: listMerchantPayouts,
  getPayout: getMerchantPayout,
  listTransactions: listMerchantPayoutTransactions,
};

// Read-only recovery pass; no transfer creation. Disabled until account-authority mapping is configured.
export const settlementReconcile = inngest.createFunction(
  { id: "settlement-reconcile", concurrency: 1, triggers: [{ cron: "TZ=Asia/Manila 40 * * * *" }] },
  async ({ step }) => {
    const account = configuredSettlementAccount();
    if (!account) return { state: "hold", reason: "account_evidence_unverified" };
    const candidates = await step.run("find-settlement-candidates", () => querySettlementRefreshCandidates(db));
    for (const candidate of candidates) {
      await step.run(`settlement-${candidate.bookingId}`, () => refreshBookingSettlement(candidate.bookingId, paymongoReader, account, db));
    }
    return { refreshed: candidates.length };
  },
);
