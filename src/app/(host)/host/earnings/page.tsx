import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, eq, isNotNull, or, sql } from "drizzle-orm";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";
import { BanknoteIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, bookingSettlementCurrent, bookingSettlementObservation, hostPayout, hostPayoutDestination, hostPayoutLedger, listing } from "@/lib/db/schema";
import { HOST_LIST_SHELL } from "@/lib/design/measurements";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { PAYOUT_HOLD_HOURS } from "@/lib/payments/config";
import { COMMISSION_RATE_BPS } from "@/lib/payments/fees";
import { SETTLEMENT_PROOF_MAX_AGE_MS } from "@/lib/payments/settlement";
import { loadHostVerification } from "@/lib/host/verification-status";
import { frozenSessionSentence, loadFrozenPayoutSummary } from "@/lib/host/frozen-payouts";
import { CancellationFeeNotice } from "@/components/host/cancellation-fee-notice";
import { HostingPausedNotice } from "@/components/host/hosting-paused-notice";
import { PayoutBanner } from "@/components/host/payout-banner";
import { derivePayoutStatus } from "@/components/host/payout-status";
import { PayoutSummary } from "@/components/host/payout-summary";
import { PayoutRow, type PayoutRowData } from "@/components/host/payout-row";
import { PayoutStateBadge } from "@/components/host/payout-state-badge";
import { projectHostEarnings, summarizeHostEarnings, type EarningSource } from "@/components/host/payout-ledger-status";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function HostEarningsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const user = session.user as typeof session.user & { canHost?: boolean };
  if (!user.canHost) redirect("/");
  const hostId = session.user.id;
  const now = new Date();

  // The listing ownership predicate is the read gate. The payout join repeats host and kind scoping,
  // so a forged or unrelated ledger row cannot substitute a booking's projected amount.
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
    };
  });
  const [payoutRow] = await db.select().from(hostPayout).where(eq(hostPayout.userId, hostId));
  const [destination] = await db.select({ verificationStatus: hostPayoutDestination.verificationStatus })
    .from(hostPayoutDestination).where(eq(hostPayoutDestination.userId, hostId));
  const payoutStatus = derivePayoutStatus(payoutRow);
  const verification = await loadHostVerification(db, hostId);
  const frozen = frozenSessionSentence(await loadFrozenPayoutSummary(db, hostId));

  // A dated Friday requires current per-booking proof, validated account policy and a usable host gate.
  const fridayPolicyValidated = process.env.PAYMONGO_SETTLEMENT_ACCOUNT_EVIDENCE_VERIFIED === "true" &&
    process.env.HOST_FRIDAY_POLICY_VALIDATED === "true" && payoutStatus === "enabled" &&
    !verification.suspended && ["verified", "host_attested"].includes(destination?.verificationStatus ?? "");
  const earnings = projectHostEarnings(sources, hostId, now, PAYOUT_HOLD_HOURS, COMMISSION_RATE_BPS,
    fridayPolicyValidated, outstandingDebitCents);
  const { upcomingCents, paidCents, hasEstimate } = summarizeHostEarnings(earnings);
  const currency = earnings[0]?.currency ?? DISPLAY_CURRENCY;
  const displayRows: PayoutRowData[] = earnings.map((row) => ({
    bookingId: row.bookingId, spaceTitle: row.title ?? "Your space",
    whenLabel: format(row.startsAt, "MMM d, yyyy", { in: tz(row.timezone) }),
    grossCents: row.grossCents, commissionCents: row.commissionCents, netCents: row.netCents,
    debitCents: row.debitCents, currency: row.currency, status: row.status,
    estimated: row.estimated, timing: row.timing,
  }));
  return <div className={HOST_LIST_SHELL}>
    <PageHeader title="Earnings" />
    {verification.suspended ? <div className="mt-6"><HostingPausedNotice reason={verification.reason} frozen={frozen} /></div> : null}
    {payoutStatus !== "enabled" ? <div className="mt-6"><PayoutBanner status={payoutStatus} /></div> : null}
    <div className="mt-8"><PayoutSummary upcomingCents={upcomingCents} paidCents={paidCents} currency={currency} hasEstimate={hasEstimate} /></div>
    {outstandingDebitCents > 0 ? <CancellationFeeNotice cents={outstandingDebitCents} currency={currency} /> : null}
    <p className="mt-3 max-w-prose text-label text-muted-foreground">FitOut keeps a 10% commission. We send eligible payouts on Fridays after the booking payment reaches FitOut and at least 24 hours after the session ends.</p>
    <div className="mt-12">
      {displayRows.length === 0 ? <EmptyState icon={BanknoteIcon} titleAs="h2" title="No earnings yet"
        body="Confirmed bookings will appear here. Eligible payouts are sent on Fridays after the session review window and after the payment reaches FitOut." actions={null} /> : <>
        <div className="hidden md:block"><Table><TableHeader><TableRow>
          <TableHead scope="col">Space</TableHead><TableHead scope="col">When</TableHead>
          <TableHead scope="col" className="text-right">Booking</TableHead>
          <TableHead scope="col" className="text-right">Commission</TableHead>
          <TableHead scope="col" className="text-right">Payout</TableHead>
          <TableHead scope="col">Status</TableHead><TableHead scope="col">Payout timing</TableHead>
        </TableRow></TableHeader><TableBody>{displayRows.map((row) => <TableRow key={row.bookingId}>
          <TableCell className="max-w-48 break-words font-medium">{row.spaceTitle}</TableCell>
          <TableCell className="tabular-nums text-muted-foreground">{row.whenLabel}</TableCell>
          <TableCell className="text-right tabular-nums">{row.grossCents === null ? "—" : formatMoney(row.grossCents, row.currency)}</TableCell>
          <TableCell className="text-right tabular-nums text-muted-foreground">{row.commissionCents === null ? "—" : `−${formatMoney(row.commissionCents, row.currency)}`}</TableCell>
          <TableCell className="text-right tabular-nums">{row.netCents === null ? "Amount being confirmed" : <><span className="block text-label text-muted-foreground">{row.estimated ? "Estimated payout" : "Your payout"}</span>{row.debitCents > 0 ? <span className="block text-label text-muted-foreground">Cancellation fee offset −{formatMoney(row.debitCents, row.currency)}</span> : null}{formatMoney(row.netCents, row.currency)}</>}</TableCell>
          <TableCell><PayoutStateBadge status={row.status} /></TableCell>
          <TableCell className="max-w-56 break-words text-label text-muted-foreground tabular-nums">{row.timing}</TableCell>
        </TableRow>)}</TableBody></Table></div>
        <div className="space-y-3 md:hidden">{displayRows.map((row) => <PayoutRow key={row.bookingId} row={row} />)}</div>
      </>}
    </div>
  </div>;
}
