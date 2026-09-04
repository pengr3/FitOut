// CancellationFeeNotice — the D-71 unrecovered host-cancellation debt line on HOST-03 (/host/earnings).
// A debit carries NEGATIVE net_cents and is netted off future payouts; anything still outstanding is
// deducted from the host's NEXT payout. This must be VISIBLE — a returning host seeing a smaller payout
// with no explanation is the surprise 07-RESEARCH calls out. Muted body copy, no coral/red/badge: this is
// information, not an alarm.
//
// WHY THIS IS ITS OWN COMPONENT (260724-jo1, UAT gap G1). Inline in the RSC, this copy rendered as
// "₱300.00in cancellation fees" — no space between the amount and "in". SWC's JSX whitespace transform
// strips the leading space of the JSXText that follows a `{…}` expression container, so the compiled output
// dropped it (raw HTML: `₱300.00<!-- -->in cancellation fees`). A pure-function test on formatMoney cannot
// see this — the defect only exists in the COMPILED render. The fix is the explicit `{" "}` below, which is
// its own expression container and therefore survives the transform. Extracting the fragment lets a jsdom
// render test pin the visible space (tests/host/cancellation-fee-notice.test.tsx).
//
// Not "use client" — a pure presentational component the earnings RSC renders directly.

import { formatMoney } from "@/lib/money";

export function CancellationFeeNotice({
  cents,
  currency,
}: {
  cents: number;
  currency: string;
}) {
  return (
    <p className="mt-3 max-w-prose text-sm text-muted-foreground">
      You have {formatMoney(cents, currency)}{" "}in cancellation fees still to be deducted.
      We&apos;ll take this off your next payout.
    </p>
  );
}
