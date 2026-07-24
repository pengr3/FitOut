// BookingRow — the BOOKER's stacked mobile card on /bookings (MANAGE-01 · D-105). The desktop shadcn table
// row is rendered by the page; this is the same content collapsed into a card, cloning PayoutRow's shell:
// Card → title/meta + badge header → <dl> label/value pairs, so the label↔value association survives
// linearisation on a narrow screen.
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

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookingStatusBadge } from "./booking-status-badge";
import type { BookingDbStatus } from "./booking-status";

export type BookingRowData = {
  bookingId: string;
  /** Needed only to compose the "Pay now" destination, which is the listing's checkout for this hold. */
  listingId: string;
  spaceTitle: string;
  photoUrl: string | null;
  /** Pre-formatted, venue-tz-safe, e.g. "Thu, Jul 3, 8:00 AM – 10:00 AM (Makati time)". */
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
    <Card className="relative">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          {/* 48×48 cover thumbnail, falling back to the neutral tile SearchResultCard uses. */}
          <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
            {row.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.photoUrl} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-[10px] leading-tight text-muted-foreground">
                No photos yet
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {/* The whole card is the link to the detail page — an overlay pseudo-element rather than a
                wrapping anchor, so the inline CTA below stays a sibling and never nests inside it. */}
            <Link
              href={`/bookings/${row.bookingId}`}
              className="truncate text-sm font-semibold outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {row.spaceTitle}
            </Link>
            <p className="text-sm text-muted-foreground">{row.whenLabel}</p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <BookingStatusBadge
              status={row.status}
              endsAt={row.endsAt}
              now={row.now}
              side="booker"
              cancelledBy={row.cancelledBy}
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
            <dt className="text-muted-foreground">Amount paid</dt>
            <dd className="tabular-nums">{row.amountLabel}</dd>
          </div>
        </dl>

        {row.showPayNow ? (
          <Button
            asChild
            className={cn("relative z-10 w-full", "bg-brand text-brand-foreground hover:bg-brand/90")}
          >
            <Link href={`/listings/${row.listingId}/book?hold=${row.bookingId}`}>Pay now</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}