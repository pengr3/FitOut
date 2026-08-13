// PayoutRow — one per-booking payout as a stacked card (HOST-03 mobile view; the earnings page renders the
// desktop shadcn `table` itself). Shows the space + when, the host-facing money breakdown, the state badge,
// and the expected/paid date meta.
//
// DS-11 (plan 11-11): the CONTAINER is `patterns/row-card.tsx`. This row is one of the two that made the
// pattern's `href` optional — a payout row is terminal, it links nowhere, and inventing a destination to
// satisfy a required prop would have been a product change disguised as a refactor. It is also one of the
// three with no thumbnail, which is why the pattern omits the media box rather than drawing an empty one.
//
// The host SEES the commission line (D-59) — UNLIKE the booker (D-50, whose breakdown stays subtotal=total).
// The breakdown is `Booking {₱gross}` / `FitOut commission (10%) −{₱commission}` / `Your payout {₱net}`
// (net weight 600). All figures are the SERVER-FROZEN ledger cents (D-49/D-51) rendered via formatMoney —
// this component does ZERO price arithmetic. Refunded → the net renders muted + struck through, with the
// "no payout" helper. `dateLabel` is a pre-formatted, venue-tz-safe "MMM d" computed by the page.
//
// Not "use client" — a pure presentational component the earnings RSC renders directly.

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { RowCard } from "@/components/patterns/row-card";
import { PayoutStateBadge } from "./payout-state-badge";
import {
  derivePayoutLedgerView,
  type PayoutLedgerState,
} from "./payout-ledger-status";

export type PayoutRowData = {
  bookingId: string;
  spaceTitle: string;
  /** Pre-formatted, venue-tz-safe booking window label (e.g. "Jul 18"). */
  whenLabel: string;
  grossCents: number;
  commissionCents: number;
  netCents: number;
  currency: string;
  state: PayoutLedgerState;
  /** Pre-formatted, venue-tz-safe expected/paid/refunded date (e.g. "Jul 20"). */
  dateLabel: string;
};

export function PayoutRow({ row }: { row: PayoutRowData }) {
  const view = derivePayoutLedgerView(row.state);
  const refunded = row.state === "refunded";

  return (
    <RowCard
      /* NO `href`. A payout row is TERMINAL — it navigates nowhere today, and giving it a destination
         would be a product change smuggled in by a container swap (Phase 14 owns this surface). With
         no href the pattern renders the title as the plain truncating paragraph this file shipped and
         creates no overlay, so nothing invisible sits over the row. */
      title={row.spaceTitle}
      /* `tabular-nums` on the when-label is this row's own: it is a date ("Jul 18"), and the pattern
         guarantees the utility on `trailing`, not on `meta`. */
      meta={<span className="tabular-nums">{row.whenLabel}</span>}
      status={<PayoutStateBadge state={row.state} />}
    >
      <dl className="space-y-1.5 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Booking</dt>
          <dd className="tabular-nums">{formatMoney(row.grossCents, row.currency)}</dd>
        </div>
        {/* The host-visible commission line (D-59) — a negative value, muted (04/05-UI-SPEC typography). */}
        {/* C8 — D-73 assigns "Service fee" to the BOOKER-facing 5% fee. One FitOut account is both booker
            and host (AUTH-04), so the same person sees both lines; "commission" is the term CLAUDE.md and
            every planning doc already uses for the host-side 10%. D-50's host half is unchanged in
            substance — only the wording. Do NOT change any amount, calculation, or badge. */}
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">FitOut commission (10%)</dt>
          <dd className="tabular-nums text-muted-foreground">
            −{formatMoney(row.commissionCents, row.currency)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="font-semibold">Your payout</dt>
          <dd
            className={cn(
              "font-semibold tabular-nums",
              refunded && "text-muted-foreground line-through",
            )}
          >
            {formatMoney(row.netCents, row.currency)}
          </dd>
        </div>
      </dl>

      <p className="text-sm tabular-nums text-muted-foreground">
        {view.datePrefix} {row.dateLabel}
      </p>
      {view.helper ? <p className="text-sm text-muted-foreground">{view.helper}</p> : null}
    </RowCard>
  );
}
