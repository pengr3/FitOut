// PayoutSummary — the two earnings summary figures at the top of HOST-03 (05-UI-SPEC § Host earnings copy):
//   - "Upcoming payouts" = sum(net where state ∈ Held | Processing)
//   - "Paid out"         = sum(net where state = Paid)
// These are the entry focal point of the earnings page (what's coming vs what's landed). Both totals are
// pre-summed server-side (summarizePayouts) — this component does ZERO arithmetic. Display typography,
// tabular-nums, NEUTRAL surfaces (no coral — the earnings page is a status view, not an action surface).
//
// Not "use client" — a pure presentational component the earnings RSC renders directly.

// CONTAINER SWAPPED TO `PanelCard` (DS-11, plan 11-13) AND NOTHING ELSE MOVED. HFLOW-05 is a token
// pass on this surface precisely because these two numbers have never been real — PayMongo's `/v2`
// payout rails are sales-gated — so restructuring the earnings page here would be redesigning a
// surface nobody has yet seen carry a live figure.
//
// In particular the two labels stay `<p className="text-sm font-semibold text-muted-foreground">`
// rather than moving onto `PanelCard`'s `title` prop. `title` renders an `<h2 className="text-heading">`,
// which would make each figure a document heading and change its type ramp — a semantic and visual
// change, not a container swap. The pair keeps its own `space-y-1` for the same reason: the pattern's
// content rhythm is `space-y-4`, and a 16px gap between a label and the number it labels reads as two
// facts instead of one.

import { formatMoney } from "@/lib/money";
import { PanelCard } from "@/components/patterns/panel-card";

export function PayoutSummary({
  upcomingCents,
  paidCents,
  currency,
}: {
  upcomingCents: number;
  paidCents: number;
  currency: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PanelCard>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-muted-foreground">Upcoming payouts</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-display">
            {formatMoney(upcomingCents, currency)}
          </p>
        </div>
      </PanelCard>
      <PanelCard>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-muted-foreground">Paid out</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-display">
            {formatMoney(paidCents, currency)}
          </p>
        </div>
      </PanelCard>
    </div>
  );
}
