// BookingRow — the BOOKER's stacked mobile card on /bookings (MANAGE-01 · D-105). The desktop shadcn table
// row is rendered by the page; this is the same content collapsed into a card: title/meta + badge header →
// <dl> label/value pairs, so the label↔value association survives linearisation on a narrow screen.
//
// DS-11 (plan 11-11): the CONTAINER is `patterns/row-card.tsx` now. The shell this file used to re-declare —
// the `Card`, the `CardContent`, the 48px media box, the overlay-pseudo-element link and its declared DS-05
// ring-offset exception, the action lift — all live there, once, for four surfaces. This file decides what a
// booking row SAYS. It is also the surface the pattern's geometry was measured against: adopting it drops
// the row from 112px to the 80px `ROW_CARD_HEIGHT` the loading skeleton already shimmers, because
// `ui/card.tsx` puts `py-4` on `Card` itself and the pattern composes `py-0` (11-08's finding).
//
// PROPS ARE PRE-FORMATTED, SERVER-COMPUTED STRINGS (PayoutRow's contract, kept verbatim): this component
// performs ZERO money arithmetic and ZERO date formatting. `whenLabel` arrives venue-tz-safe from the shared
// composeWhenLabelShort (07-02), `amountLabel` from formatMoney over the server-frozen quote, and `now`
// comes from the DB clock so the badge agrees with the SQL tab partition (D-102 / T-07-32).
//
// D-104 — AT MOST ONE INLINE ACTION, and it is only ever the coral "Pay now" on an approved booking. There
// is deliberately no inline affordance for ending a booking early: that routes through the detail page,
// where D-78's itemised money breakdown can be shown before anything irreversible is confirmed. Irreversible
// money actions stay behind the disclosure they require.
//
// D-79 — the refund figure renders as a MUTED SIBLING LINE beneath the badge, never interpolated into it
// (see booking-status-badge.tsx for why the badge grammar is fixed-vocabulary). The caller composes the copy.
//
// Not a client component — a pure presentational component the /bookings RSC renders directly.

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { RowCard } from "@/components/patterns/row-card";
import { BookingStatusBadge } from "./booking-status-badge";
import type { BookingDbStatus } from "./booking-status";

export type BookingRowData = {
  bookingId: string;
  /** Needed only to compose the "Pay now" destination, which is the listing's checkout for this hold. */
  listingId: string;
  spaceTitle: string;
  photoUrl: string | null;
  /**
   * Pre-formatted, venue-tz-safe, e.g. "Thu, Jul 3, 8:00 AM – 10:00 AM (Makati time)" — or, for an OC-03
   * drop-in row, the pass form the shared formatter produces from the booking's persisted `open_capacity`
   * snapshot (09-08). This component receives the finished STRING and no time inputs at all, which is why
   * the 09-08 census did not need to thread `openCapacity` down here: there is nothing here that could
   * mis-render a mode. Keep it that way — never format a date in this file.
   */
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
  /** D-104: at most ONE inline action, and only on `approved`. */
  showPayNow: boolean;
};

export function BookingRow({ row }: { row: BookingRowData }) {
  return (
    <RowCard
      href={`/bookings/${row.bookingId}`}
      /* 48×48 cover thumbnail, falling back to the neutral tile SearchResultCard uses. The fallback
         is passed AS `media` rather than through a second prop — `RowCard` has one media slot and no
         branch, because at 48px a fallback is a tile and not a sentence. */
      media={
        row.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.photoUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-xs leading-tight text-muted-foreground">
            No photos yet
          </span>
        )
      }
      title={row.spaceTitle}
      meta={row.whenLabel}
      status={
        <BookingStatusBadge
          status={row.status}
          endsAt={row.endsAt}
          now={row.now}
          side="booker"
          cancelledBy={row.cancelledBy}
        />
      }
      /* D-79 — the refund figure is a MUTED SIBLING LINE beneath the badge, never interpolated into
         it (see booking-status-badge.tsx for why the badge grammar is fixed-vocabulary). The caller
         composes the copy. `tabular-nums` is restated here even though `RowCard` applies it to every
         `trailing`: this is a money figure, and AC#33's property should be visible at the site that
         knows it is money rather than inherited silently. */
      trailing={
        row.refundLabel ? (
          <span className="text-sm tabular-nums text-muted-foreground">{row.refundLabel}</span>
        ) : undefined
      }
      /* The CTA is a SIBLING of the card's stretched-link overlay, and `RowCard` both places it there
         and lifts it above the overlay, so the button is clickable rather than swallowed. The lift
         reads the sticky step of the global four-layer scale instead of a bare 10; it used to be
         written on this button and now lives once, in the pattern. Named descriptively rather than
         quoted, because the DS-03 gate counts that string. */
      actions={
        row.showPayNow ? (
          <Button asChild variant="brand" className="w-full">
            <Link href={`/listings/${row.listingId}/book?hold=${row.bookingId}`}>Pay now</Link>
          </Button>
        ) : undefined
      }
    >
      <dl className="space-y-1.5 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Amount paid</dt>
          <dd className="tabular-nums">{row.amountLabel}</dd>
        </div>
      </dl>
    </RowCard>
  );
}
