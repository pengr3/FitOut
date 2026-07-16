// PayoutSummary — the two earnings summary figures at the top of HOST-03 (05-UI-SPEC § Host earnings copy):
//   - "Upcoming payouts" = sum(net where state ∈ Held | Processing)
//   - "Paid out"         = sum(net where state = Paid)
// These are the entry focal point of the earnings page (what's coming vs what's landed). Both totals are
// pre-summed server-side (summarizePayouts) — this component does ZERO arithmetic. Display typography,
// tabular-nums, NEUTRAL surfaces (no coral — the earnings page is a status view, not an action surface).
//
// Not "use client" — a pure presentational component the earnings RSC renders directly.

import { formatMoney } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";

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
      <Card>
        <CardContent className="space-y-1 p-6">
          <p className="text-sm font-semibold text-muted-foreground">Upcoming payouts</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-[28px]">
            {formatMoney(upcomingCents, currency)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-1 p-6">
          <p className="text-sm font-semibold text-muted-foreground">Paid out</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-[28px]">
            {formatMoney(paidCents, currency)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
