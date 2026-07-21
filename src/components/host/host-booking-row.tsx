// HostBookingRow — the HOST's stacked mobile card on /host/bookings (HOST-02 · D-105). Same shell as
// PayoutRow / BookingRow (Card → title/meta + badge header → <dl>), different content: guest, space,
// venue-local window, the booking lifecycle badge, and the payout state.
//
// PAYOUT PARITY IS THE POINT: the payout cell renders PayoutStateBadge, imported UNCHANGED from the HOST-03
// earnings surface, so a host reads the same word for the same money state on both pages. When a booking has
// no ledger row yet there is simply no payout — that renders as an em dash with an accessible label, NOT as
// an invented badge state. Inventing one would put a vocabulary on this page that /host/earnings does not
// have, which is exactly the drift D-105 exists to prevent.
//
// D-104 — the only inline action is Approve/Decline on a `requested` row, via RequestActions imported
// unchanged from the 06-08 request inbox. Nothing else is actionable from a row; a host ending a confirmed
// booking is deliberately routed through the two-step consequences disclosure instead (D-80).
//
// NO CORAL ANYWHERE (07-UI-SPEC § Color): /host/bookings is a calm host workflow surface, mirroring
// /host/earnings and /host/requests. The brand accent is reserved for booker conversion moments.
//
// Props are PRE-FORMATTED, server-computed strings — this component does zero money or date formatting, and
// `now` arrives from the DB clock so the badge agrees with the SQL tab partition.
//
// Not a client component — a pure presentational component the /host/bookings RSC renders directly.

import { Card, CardContent } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import type { BookingDbStatus } from "@/components/booking/booking-status";
import { PayoutStateBadge } from "./payout-state-badge";
import type { PayoutLedgerState } from "./payout-ledger-status";
import { RequestActions } from "./request-row";

export type HostBookingRowData = {
  bookingId: string;
  spaceTitle: string;
  /** Booker first name, or "A guest" when withheld — matches RequestRow. */
  bookerLabel: string;
  /** Pre-formatted, venue-tz-safe window label "{date}, {time} ({City} time)". */
  whenLabel: string;
  /** Pre-formatted server-frozen total (formatMoney) — the UI does ZERO price arithmetic. */
  amountLabel: string;
  /** D-79 sibling line beneath the badge, or null. Never interpolated into the badge. */
  refundLabel: string | null;
  status: BookingDbStatus;
  startsAt: Date;
  endsAt: Date;
  /** The DB clock, threaded from the page so the badge and the tab partition agree. */
  now: Date;
  /** Scoped to payout-kind ledger rows by the query; null means no payout exists yet. */
  payoutState: PayoutLedgerState | null;
};

/**
 * The payout cell, shared by this card and the desktop table so the em-dash fallback can never diverge
 * between the two breakpoints.
 */
export function HostPayoutCell({ state }: { state: PayoutLedgerState | null }) {
  if (!state) {
    return (
      <span className="text-muted-foreground" aria-label="No payout yet">
        —
      </span>
    );
  }
  return <PayoutStateBadge state={state} />;
}

export function HostBookingRow({ row }: { row: HostBookingRowData }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{row.spaceTitle}</p>
            <p className="text-sm text-muted-foreground">{row.whenLabel}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <BookingStatusBadge
              status={row.status}
              endsAt={row.endsAt}
              now={row.now}
              side="host"
            />
            {row.refundLabel ? (
              <p className="text-right text-sm tabular-nums text-muted-foreground">
                {row.refundLabel}
              </p>
            ) : null}
          </div>
        </div>

        <dl className="space-y-1.5 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Guest</dt>
            <dd>{row.bookerLabel}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Guest pays</dt>
            <dd className="tabular-nums">{row.amountLabel}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Payout</dt>
            <dd>
              <HostPayoutCell state={row.payoutState} />
            </dd>
          </div>
        </dl>

        {row.status === "requested" ? (
          <RequestActions
            requestId={row.bookingId}
            bookerLabel={row.bookerLabel}
            whenLabel={row.whenLabel}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}