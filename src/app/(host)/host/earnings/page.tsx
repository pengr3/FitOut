// Host earnings / payouts page (HOST-03 · D-59). An RSC under the (host) route group showing per-booking
// payout rows — each with a Held → Processing → Paid (plus Refunded) state badge, the host-visible
// gross → −10% commission → net breakdown, and the expected/paid date — plus the two summary totals
// (Upcoming payouts vs Paid out).
//
// SECURITY (T-05-29/30, Security V4): the (host) LAYOUT gates canHost, but the route group is NOT the
// authorization gate for the DATA. This page re-checks the session + canHost (defense in depth) AND
// owner-scopes every ledger read to `host_id = session.user.id`, exactly like /host/listings — a host can
// never see another host's payout rows. All money is the SERVER-FROZEN ledger cents (D-49/D-51); the page
// does ZERO price arithmetic. Every date is rendered venue-tz-safe (SC#2). No coral CTA — this is a calm
// status view, not an action surface.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, desc, eq, sql } from "drizzle-orm";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, hostPayout, hostPayoutLedger, listing } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { PAYOUT_DELAY_HOURS } from "@/lib/payments/config";
import { PayoutBanner } from "@/components/host/payout-banner";
import { derivePayoutStatus } from "@/components/host/payout-status";
import { PayoutSummary } from "@/components/host/payout-summary";
import { PayoutRow, type PayoutRowData } from "@/components/host/payout-row";
import { PayoutStateBadge } from "@/components/host/payout-state-badge";
import {
  derivePayoutLedgerView,
  summarizePayouts,
} from "@/components/host/payout-ledger-status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const HOUR_MS = 3_600_000;

export default async function HostEarningsPage() {
  // Defense in depth: the (host) layout already gates, but never render earnings without a real session.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & { canHost?: boolean };
  if (!u.canHost) {
    redirect("/");
  }

  // Owner-scoped ledger read (T-05-29, Security V4): the route group is NOT the gate — filter to the
  // signed-in host so a host can never see another host's payout rows. Joined to booking/listing for the
  // space title + window + venue tz; newest-first.
  //
  // `kind = 'payout'` (Phase 7, D-71 / Finding 3) is load-bearing: a `host_cancel_fee` row is a SIGNED
  // DEBIT (negative net_cents) with no booking payout behind it. Unscoped it would render as a nonsense
  // row AND would subtract from summarizePayouts' Upcoming total, mis-stating what the host is owed.
  // Scoping HERE (not inside summarizePayouts) keeps that pure helper a plain sum over the rows it is
  // handed — the query is the single place the row-kind decision is made. Outstanding debits are
  // surfaced separately below.
  const rows = await db
    .select({
      bookingId: hostPayoutLedger.bookingId,
      grossCents: hostPayoutLedger.grossCents,
      commissionCents: hostPayoutLedger.commissionCents,
      netCents: hostPayoutLedger.netCents,
      currency: hostPayoutLedger.currency,
      state: hostPayoutLedger.state,
      paidAt: hostPayoutLedger.paidAt,
      updatedAt: hostPayoutLedger.updatedAt,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      title: listing.title,
      timezone: listing.timezone,
    })
    .from(hostPayoutLedger)
    .innerJoin(booking, eq(hostPayoutLedger.bookingId, booking.id))
    .innerJoin(listing, eq(booking.listingId, listing.id))
    .where(
      and(
        eq(hostPayoutLedger.hostId, session.user.id),
        eq(hostPayoutLedger.kind, "payout"),
      ),
    )
    .orderBy(desc(hostPayoutLedger.createdAt));

  // Summary totals summed server-side by the shared pure helper (Upcoming = Held+Processing, Paid = Paid).
  const { upcomingCents, paidCents } = summarizePayouts(
    rows.map((r) => ({ state: r.state, netCents: r.netCents })),
  );
  const summaryCurrency = rows[0]?.currency ?? DISPLAY_CURRENCY;

  // D-71 unrecovered host-cancellation debt. A debit carries NEGATIVE net_cents and accumulates
  // recovered_cents toward -net_cents as it is netted off future payouts; anything still outstanding will
  // be deducted from the host's NEXT payout (or written off entirely if they never host again). This must
  // be VISIBLE — a returning host seeing a smaller payout with no explanation is the surprise 07-RESEARCH
  // calls out. Owner-scoped like every other read on this page; integer centavos, summed in Postgres.
  const [{ outstandingDebitCents = 0 } = { outstandingDebitCents: 0 }] = (await db.execute(sql`
    SELECT COALESCE(SUM(-net_cents - recovered_cents), 0)::int AS "outstandingDebitCents"
    FROM host_payout_ledger
    WHERE host_id = ${session.user.id}
      AND kind = 'host_cancel_fee'
      AND recovered_cents < -net_cents
  `)) as unknown as { outstandingDebitCents: number }[];

  // Per-row display: compute the venue-tz-safe expected/paid date server-side. Expected = endsAt + the
  // payout delay (D-55); Paid rows read paidAt; Refunded rows read the flip time. Same TZDate/epoch
  // discipline as the confirmation page.
  const displayRows = rows.map((r) => {
    const view = derivePayoutLedgerView(r.state);
    const inTz = tz(r.timezone);
    const expectedInstant = new Date(r.endsAt.getTime() + PAYOUT_DELAY_HOURS * HOUR_MS);
    const dateInstant =
      r.state === "paid" && r.paidAt
        ? r.paidAt
        : r.state === "refunded"
          ? (r.paidAt ?? r.updatedAt)
          : expectedInstant;
    const data: PayoutRowData = {
      bookingId: r.bookingId,
      spaceTitle: r.title ?? "Your space",
      whenLabel: format(r.startsAt, "MMM d", { in: inTz }),
      grossCents: r.grossCents,
      commissionCents: r.commissionCents,
      netCents: r.netCents,
      currency: r.currency,
      state: r.state,
      dateLabel: format(dateInstant, "MMM d", { in: inTz }),
    };
    return { data, view };
  });

  // Live payout-onboarding state (D-12) — nudge the host to finish setup if they aren't enabled yet. Any
  // confirmed booking still shows below as Held; the banner never blocks the earnings view.
  const [payoutRow] = await db
    .select()
    .from(hostPayout)
    .where(eq(hostPayout.userId, session.user.id));
  const payoutStatus = derivePayoutStatus(payoutRow);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Earnings</h1>

      {payoutStatus !== "enabled" ? (
        <div className="mt-6">
          <PayoutBanner status={payoutStatus} />
        </div>
      ) : null}

      <div className="mt-8">
        <PayoutSummary
          upcomingCents={upcomingCents}
          paidCents={paidCents}
          currency={summaryCurrency}
        />
      </div>

      {/* D-71: unrecovered cancellation debt, stated plainly and neutrally. Muted body copy — this is
          information, not an alarm: no coral, no destructive red, no badge. */}
      {outstandingDebitCents > 0 ? (
        <p className="mt-3 max-w-prose text-sm text-muted-foreground">
          {/* prettier-ignore */}
          You have {formatMoney(outstandingDebitCents, summaryCurrency)} in cancellation fees still to be deducted. We&apos;ll take this off your next payout.
        </p>
      ) : null}

      {/* C8 — "service fee" is D-73's BOOKER-facing 5% line. The host-side 10% is a commission. */}
      <p className="mt-3 max-w-prose text-sm text-muted-foreground">
        FitOut keeps a 10% commission. You always receive the listed price minus 10% — we cover the
        payment processing costs. Payout dates are shown in each space&apos;s local time.
      </p>

      <div className="mt-12">
        {displayRows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <h2 className="text-lg font-medium">No earnings yet</h2>
            <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
              When someone books your space, each payout shows up here — held until after the session,
              then paid to you automatically.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: the shadcn table with real <th scope="col"> headers. */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Space</TableHead>
                    <TableHead scope="col">When</TableHead>
                    <TableHead scope="col" className="text-right">
                      Booking
                    </TableHead>
                    {/* C8 — the host-side 10% is a COMMISSION; "Service fee" is the booker's 5% (D-73). */}
                    <TableHead scope="col" className="text-right">
                      Commission
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Payout
                    </TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col">Expected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.map(({ data, view }) => (
                    <TableRow key={data.bookingId}>
                      <TableCell className="font-medium">{data.spaceTitle}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {data.whenLabel}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(data.grossCents, data.currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        −{formatMoney(data.commissionCents, data.currency)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold tabular-nums",
                          data.state === "refunded" && "text-muted-foreground line-through",
                        )}
                      >
                        {formatMoney(data.netCents, data.currency)}
                      </TableCell>
                      <TableCell>
                        <PayoutStateBadge state={data.state} />
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {view.datePrefix} {data.dateLabel}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: stacked cards (the table collapses to a card per booking). */}
            <div className="space-y-3 md:hidden">
              {displayRows.map(({ data }) => (
                <PayoutRow key={data.bookingId} row={data} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
