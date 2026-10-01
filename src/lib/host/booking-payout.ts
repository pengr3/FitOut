import { and, eq, isNotNull, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  booking, bookingSettlementCurrent, bookingSettlementObservation, hostPayout,
  hostPayoutDestination, hostPayoutLedger, listing,
} from "@/lib/db/schema";
import { formatMoney } from "@/lib/money";
import { PAYOUT_HOLD_HOURS } from "@/lib/payments/config";
import { COMMISSION_RATE_BPS } from "@/lib/payments/fees";
import { SETTLEMENT_PROOF_MAX_AGE_MS } from "@/lib/payments/settlement";
import { unresolvedPayoutAttention } from "@/lib/payments/payout-exceptions";
import { loadHostVerification } from "@/lib/host/verification-status";
import { derivePayoutStatus } from "@/components/host/payout-status";
import {
  projectHostEarnings, type EarningSource, type HostEarning, type HostEarningStatus,
} from "@/components/host/payout-ledger-status";

export type BookingPayoutView = {
  status: HostEarningStatus;
  timing: string;
  amountLabel: string | null;
  /** The amount alone, for narrow desktop table cells; amountLabel remains the accessible explanation. */
  compactAmountLabel?: string | null;
};

/** The booking pages use the earnings projector, with the same owner, proof and account gates. */
export async function loadBookingPayouts(hostId: string, now: Date): Promise<Map<string, BookingPayoutView>> {
  const booked = await db.select({
    bookingId: booking.id, hostId: listing.hostId, createdAt: booking.createdAt,
    startsAt: booking.startsAt, endsAt: booking.endsAt, bookingStatus: booking.status,
    spacePriceCents: booking.spacePriceCents, retainedSpaceCents: booking.retainedSpaceCents,
    paymentId: booking.paymentId, currency: booking.currency, title: listing.title, timezone: listing.timezone,
    ledgerId: hostPayoutLedger.id, ledgerState: hostPayoutLedger.state,
    ledgerGrossCents: hostPayoutLedger.grossCents, ledgerCommissionCents: hostPayoutLedger.commissionCents,
    ledgerNetCents: hostPayoutLedger.netCents, ledgerRecoveredCents: hostPayoutLedger.recoveredCents,
    ledgerTransferId: hostPayoutLedger.transferId, ledgerPaidAt: hostPayoutLedger.paidAt,
    settlementStatus: bookingSettlementObservation.providerStatus,
    settlementPaymentId: bookingSettlementObservation.paymentId,
    settlementCurrency: bookingSettlementObservation.currency,
    settlementDepositedAt: bookingSettlementObservation.depositedAt,
    settlementVerifiedAt: bookingSettlementCurrent.verifiedAt,
    settlementMatched: bookingSettlementObservation.walletDestinationMatched,
    settlementMappingVerified: bookingSettlementObservation.mappingVerified,
    settlementLiveMode: bookingSettlementObservation.liveMode,
  }).from(booking)
    .innerJoin(listing, eq(booking.listingId, listing.id))
    .leftJoin(hostPayoutLedger, and(eq(hostPayoutLedger.bookingId, booking.id), eq(hostPayoutLedger.hostId, hostId), eq(hostPayoutLedger.kind, "payout")))
    .leftJoin(bookingSettlementCurrent, eq(bookingSettlementCurrent.bookingId, booking.id))
    .leftJoin(bookingSettlementObservation, eq(bookingSettlementObservation.id, bookingSettlementCurrent.observationId))
    .where(and(eq(listing.hostId, hostId), or(eq(booking.status, "confirmed"), and(eq(booking.status, "cancelled"), or(isNotNull(hostPayoutLedger.id), sql`COALESCE(${booking.retainedSpaceCents}, 0) > 0`)))));

  const attention = await unresolvedPayoutAttention(db, booked.map((row) => row.bookingId));

  const [{ outstandingDebitCents = 0 } = { outstandingDebitCents: 0 }] = (await db.execute(sql`
    SELECT COALESCE(SUM(-net_cents - recovered_cents), 0)::int AS "outstandingDebitCents"
    FROM host_payout_ledger WHERE host_id = ${hostId} AND kind = 'host_cancel_fee'
      AND recovered_cents < -net_cents
  `)) as unknown as { outstandingDebitCents: number }[];

  const sources: EarningSource[] = booked.map((r) => {
    const proofAge = r.settlementVerifiedAt ? now.getTime() - r.settlementVerifiedAt.getTime() : Infinity;
    const settlement = r.settlementStatus === "deposited" && r.settlementMatched && r.settlementMappingVerified &&
      r.settlementLiveMode && r.paymentId && r.paymentId === r.settlementPaymentId &&
      r.currency.toLowerCase() === r.settlementCurrency?.toLowerCase() && r.settlementDepositedAt &&
      r.settlementVerifiedAt && proofAge >= 0 && proofAge <= SETTLEMENT_PROOF_MAX_AGE_MS
      ? { depositedAt: r.settlementDepositedAt, verifiedAt: r.settlementVerifiedAt } : null;
    return {
      bookingId: r.bookingId, hostId: r.hostId, createdAt: r.createdAt, startsAt: r.startsAt,
      endsAt: r.endsAt, bookingStatus: r.bookingStatus as "confirmed" | "cancelled",
      spacePriceCents: r.spacePriceCents, retainedSpaceCents: r.retainedSpaceCents,
      currency: r.currency, title: r.title, timezone: r.timezone,
      ledger: r.ledgerId && r.ledgerState !== null && r.ledgerGrossCents !== null &&
        r.ledgerCommissionCents !== null && r.ledgerNetCents !== null && r.ledgerRecoveredCents !== null
        ? { grossCents: r.ledgerGrossCents, commissionCents: r.ledgerCommissionCents,
            netCents: r.ledgerNetCents, recoveredCents: r.ledgerRecoveredCents, state: r.ledgerState,
            transferId: r.ledgerTransferId, paidAt: r.ledgerPaidAt } : null,
      settlement,
      attention: attention.has(r.bookingId),
    };
  });
  const [payoutRow] = await db.select().from(hostPayout).where(eq(hostPayout.userId, hostId));
  const [destination] = await db.select({ verificationStatus: hostPayoutDestination.verificationStatus })
    .from(hostPayoutDestination).where(eq(hostPayoutDestination.userId, hostId));
  const payoutStatus = derivePayoutStatus(payoutRow);
  const verification = await loadHostVerification(db, hostId);
  const fridayPolicyValidated = process.env.PAYMONGO_SETTLEMENT_ACCOUNT_EVIDENCE_VERIFIED === "true" &&
    process.env.HOST_FRIDAY_POLICY_VALIDATED === "true" && payoutStatus === "enabled" &&
    !verification.suspended && ["verified", "host_attested"].includes(destination?.verificationStatus ?? "");
  const earnings = projectHostEarnings(sources, hostId, now, PAYOUT_HOLD_HOURS, COMMISSION_RATE_BPS,
    fridayPolicyValidated, outstandingDebitCents);
  return new Map(earnings.map((earning) => [earning.bookingId, bookingPayoutView(earning)]));
}

export function bookingPayoutView(earning: HostEarning): BookingPayoutView {
  const compactAmountLabel = earning.status === "refunded" || earning.netCents === null
    ? null : formatMoney(earning.netCents, earning.currency);
  const amountLabel = earning.status === "refunded" ? null : earning.netCents === null
    ? "Amount being confirmed"
    : `${earning.estimated ? "Estimated payout" : "Your payout"} ${compactAmountLabel}`;
  return { status: earning.status, timing: earning.timing, amountLabel, compactAmountLabel };
}
