import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { DbConn } from "@/lib/availability/read-model";

/** A normalized provider read. The adapter must finish pagination and verify account mapping first. */
export type SettlementObservation = {
  paymentId: string;
  payoutId: string;
  transactionId: string;
  transactionType: "payment" | "split_payment";
  currency: string;
  liveMode: boolean;
  providerStatus: string;
  destinationMatched: boolean;
  paginationComplete: boolean;
  mappingVerified: boolean;
  providerStatusAt: Date;
  verifiedAt: Date;
};

export type SettlementProof = {
  bookingId: string;
  paymentId: string;
  payoutId: string;
  transactionId: string;
  depositedAt: Date;
  verifiedAt: Date;
};

const STATUSES = new Set(["pending", "on_hold", "in_transit", "deposited", "returned", "cancelled"]);
export const SETTLEMENT_PROOF_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function statusPriority(status: string): number {
  if (status === "returned" || status === "cancelled") return 2;
  return status === "deposited" ? 0 : 1;
}

function validDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function correlated(observation: SettlementObservation, paymentId: string, currency: string, liveMode: boolean): boolean {
  return Boolean(
    paymentId && observation.paymentId === paymentId && observation.payoutId && observation.transactionId &&
    (observation.transactionType === "payment" || observation.transactionType === "split_payment") &&
    observation.currency.toLowerCase() === currency.toLowerCase() && observation.liveMode === liveMode &&
    observation.paginationComplete && observation.mappingVerified &&
    validDate(observation.providerStatusAt) && validDate(observation.verifiedAt) &&
    observation.providerStatusAt <= observation.verifiedAt && STATUSES.has(observation.providerStatus),
  );
}

/** Pure eligibility predicate, also used by the database writer. */
export function isCorrelatedSettlement(observation: SettlementObservation, paymentId: string, currency: string, liveMode: boolean): boolean {
  return correlated(observation, paymentId, currency, liveMode) &&
    observation.providerStatus === "deposited" && observation.destinationMatched;
}

/** Append an exact booking-linked provider version. Invalid/incomplete reads write nothing. */
export async function recordSettlementObservation(
  bookingId: string,
  observation: SettlementObservation,
  dbConn: DbConn = db,
): Promise<boolean> {
  const bookingRows = (await dbConn.execute(sql`
    SELECT payment_id AS "paymentId", currency FROM booking WHERE id = ${bookingId} LIMIT 1
  `)) as unknown as { paymentId: string | null; currency: string }[];
  const booked = bookingRows[0];
  if (!booked || !correlated(observation, booked.paymentId ?? "", booked.currency, true)) return false;

  const depositedAt = observation.providerStatus === "deposited" ? observation.providerStatusAt : null;
  const inserted = (await dbConn.execute(sql`
    INSERT INTO booking_settlement_observation
      (booking_id, payment_id, payout_id, transaction_id, transaction_type,
       provider_status, provider_status_at, deposited_at, verified_at,
       wallet_destination_matched, mapping_verified, live_mode, currency)
    VALUES
      (${bookingId}, ${observation.paymentId}, ${observation.payoutId}, ${observation.transactionId},
       ${observation.transactionType}, ${observation.providerStatus}, ${observation.providerStatusAt.toISOString()}::timestamptz,
       ${depositedAt?.toISOString() ?? null}::timestamptz, ${observation.verifiedAt.toISOString()}::timestamptz, ${observation.destinationMatched},
       ${observation.mappingVerified}, ${observation.liveMode}, ${observation.currency.toUpperCase()})
    ON CONFLICT ON CONSTRAINT booking_settlement_observation_version_uq DO NOTHING
    RETURNING id
  `)) as unknown as { id: number }[];
  const observationRows = inserted.length ? inserted : (await dbConn.execute(sql`
    SELECT id FROM booking_settlement_observation
    WHERE booking_id = ${bookingId} AND payout_id = ${observation.payoutId}
      AND transaction_id = ${observation.transactionId}
      AND provider_status = ${observation.providerStatus}
      AND provider_status_at = ${observation.providerStatusAt.toISOString()}::timestamptz
    LIMIT 1
  `)) as unknown as { id: number }[];
  const observationId = observationRows[0]?.id;
  if (observationId === undefined) throw new Error("settlement observation version unavailable");
  await dbConn.execute(sql`
    INSERT INTO booking_settlement_current
      (booking_id, observation_id, provider_status_at, status_priority, verified_at)
    VALUES (${bookingId}, ${observationId}, ${observation.providerStatusAt.toISOString()}::timestamptz,
      ${statusPriority(observation.providerStatus)}, ${observation.verifiedAt.toISOString()}::timestamptz)
    ON CONFLICT (booking_id) DO UPDATE SET
      observation_id = EXCLUDED.observation_id,
      provider_status_at = EXCLUDED.provider_status_at,
      status_priority = EXCLUDED.status_priority,
      verified_at = CASE WHEN booking_settlement_current.observation_id = EXCLUDED.observation_id
        THEN GREATEST(booking_settlement_current.verified_at, EXCLUDED.verified_at)
        ELSE EXCLUDED.verified_at END
    WHERE EXCLUDED.provider_status_at > booking_settlement_current.provider_status_at
      OR (EXCLUDED.provider_status_at = booking_settlement_current.provider_status_at
        AND EXCLUDED.status_priority > booking_settlement_current.status_priority)
      OR booking_settlement_current.observation_id = EXCLUDED.observation_id
  `);
  return inserted.length === 1;
}

/** Latest provider status wins, not network arrival order. Returned/cancelled wins a timestamp tie. */
export async function currentSettlementProof(
  bookingId: string,
  dbConn: DbConn = db,
  now: Date = new Date(),
): Promise<SettlementProof | null> {
  const rows = (await dbConn.execute(sql`
    SELECT o.booking_id AS "bookingId", o.payment_id AS "paymentId", o.payout_id AS "payoutId",
      o.transaction_id AS "transactionId", o.provider_status AS "providerStatus",
      o.deposited_at AS "depositedAt", c.verified_at AS "verifiedAt",
      o.wallet_destination_matched AS "walletMatched", o.mapping_verified AS "mappingVerified",
      o.live_mode AS "liveMode", o.currency AS "currency",
      b.payment_id AS "bookingPaymentId", b.currency AS "bookingCurrency"
    FROM booking_settlement_current c
    JOIN booking_settlement_observation o ON o.id = c.observation_id
    JOIN booking b ON b.id = o.booking_id
    WHERE c.booking_id = ${bookingId}
    LIMIT 1
  `)) as unknown as Array<SettlementProof & {
    providerStatus: string; walletMatched: boolean; mappingVerified: boolean; liveMode: boolean;
    currency: string; bookingPaymentId: string | null; bookingCurrency: string;
  }>;
  const row = rows[0];
  if (!row || row.providerStatus !== "deposited" || !row.walletMatched || !row.mappingVerified ||
      !row.liveMode || row.paymentId !== row.bookingPaymentId ||
      row.currency.toLowerCase() !== row.bookingCurrency.toLowerCase() || !row.depositedAt) return null;
  const age = now.getTime() - new Date(row.verifiedAt).getTime();
  if (age < 0 || age > SETTLEMENT_PROOF_MAX_AGE_MS) return null;
  return {
    bookingId: row.bookingId, paymentId: row.paymentId, payoutId: row.payoutId,
    transactionId: row.transactionId, depositedAt: new Date(row.depositedAt),
    verifiedAt: new Date(row.verifiedAt),
  };
}
