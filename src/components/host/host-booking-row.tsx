// HostBookingRow — the HOST's stacked mobile card on /host/bookings (HOST-02 · D-105). Same shell as
// PayoutRow / BookingRow (title/meta + badge header → <dl>), different content: guest, space,
// venue-local window, the booking lifecycle badge, and the payout state.
//
// DS-11 (plan 11-11): "same shell as PayoutRow / BookingRow" is now MECHANICAL rather than a convention
// three files kept by hand — all three compose `patterns/row-card.tsx`, which owns the Card, the
// CardContent, the overlay-pseudo-element link with its declared DS-05 ring-offset exception, and the
// action lift. This file decides what a host booking row SAYS.
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

import { RowCard } from "@/components/patterns/row-card";
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
  /** T8: who ended the booking — threaded to the badge so a booker-cancelled request reads Cancelled. */
  cancelledBy: string | null;
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
    <RowCard
      /* T6 — the whole card is the link to /host/bookings/[id] (the host cancel flow, SC#3), via an
         overlay pseudo-element rather than a wrapping anchor, so the inline RequestActions below stays
         a sibling and can sit ABOVE it. The pattern owns both halves now. */
      href={`/host/bookings/${row.bookingId}`}
      /* No `media`: this row has never had a thumbnail, and `RowCard` omits the box entirely rather
         than drawing an empty 48px square (the 11-11 change to the pattern). */
      title={row.spaceTitle}
      meta={row.whenLabel}
      status={
        <BookingStatusBadge
          status={row.status}
          endsAt={row.endsAt}
          now={row.now}
          side="host"
          cancelledBy={row.cancelledBy}
        />
      }
      /* D-79 sibling line beneath the badge, never interpolated into it. `tabular-nums` is restated
         here even though the pattern applies it to every `trailing`, because this is money. */
      trailing={
        row.refundLabel ? (
          <span className="text-sm tabular-nums text-muted-foreground">{row.refundLabel}</span>
        ) : undefined
      }
      /* Approve/Decline sits ABOVE the card-overlay link so it stays clickable (T6). The lift reads
         the sticky step of the global four-layer scale rather than a bare 10; it used to be written
         on this file's own wrapper div and now lives once, in the pattern. Named descriptively rather
         than quoted, because the DS-03 gate counts that string and a comment that repeats it is
         indistinguishable from a real call site. */
      actions={
        row.status === "requested" ? (
          <RequestActions
            requestId={row.bookingId}
            bookerLabel={row.bookerLabel}
            whenLabel={row.whenLabel}
          />
        ) : undefined
      }
    >
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
    </RowCard>
  );
}
