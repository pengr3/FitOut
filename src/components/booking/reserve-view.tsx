"use client";

// ReserveView (BOOK-01/02 · D-39/D-42/D-44) — the thin CLIENT shell for the reserve page's interactive
// bits. The RSC (listings/[id]/book/page.tsx) does the owner-gate + server-frozen data read and renders
// the listing summary + PriceBreakdown as SERVER nodes, then hands them here as `summary`/`breakdown`
// props so this island ships almost no JS (only the countdown + Confirm are client). Its ONE job beyond
// layout is to own the live-expiry swap: when the HoldCountdown reaches 0 (or a Confirm comes back
// `expired`/`denied` because the server — the sole expiry authority — released the slot), it replaces the
// whole reserve content with the calm HoldExpiredState (D-44), never a stale reserve form. An already
// EXPIRED hold on first load is handled in the RSC (it renders HoldExpiredState directly); this shell only
// ever mounts for an ACTIVE pending hold, so the countdown always starts with time remaining.

import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { HoldCountdown } from "@/components/booking/hold-countdown";
import { HoldExpiredState } from "@/components/booking/hold-expired-state";
import { ReserveActions } from "@/components/booking/reserve-actions";
import type { ConfirmResult } from "@/app/actions/booking";

export function ReserveView({
  holdId,
  listingId,
  expiresAt,
  totalLabel,
  summary,
  breakdown,
}: {
  holdId: string;
  listingId: string;
  /** The hold's TTL deadline (ISO) — drives the countdown; the server re-checks it on Confirm. */
  expiresAt: string;
  /** Server-formatted charged amount (formatMoney) — threaded to the `Confirm & pay` reassurance (D-57). */
  totalLabel: string;
  /** Server-rendered listing summary (cover, name, type, venue-tz window). Dropped on expiry. */
  summary: React.ReactNode;
  /** Server-rendered PriceBreakdown (the frozen quote). Dropped on expiry. */
  breakdown: React.ReactNode;
}) {
  const [expired, setExpired] = React.useState(false);

  // A Confirm that resolves to a graceful failure — the server released the slot (`expired`), an ownership
  // edge (`denied`), or checkout couldn't start / going too fast (`checkout`, D-57) — flips to the SAME
  // calm recovery state, never a red error (occupancy/expiry/checkout-retry are all normal states).
  function handleResult(result: ConfirmResult) {
    if (result.reason === "expired" || result.reason === "denied" || result.reason === "checkout") {
      setExpired(true);
    }
  }

  // The countdown hitting 0 flips the whole page into the expiry state (it does NOT silently vanish, D-44).
  if (expired) return <HoldExpiredState listingId={listingId} />;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
      {/* Summary column — what am I booking (server-rendered, coral selection carried from Phase 3). */}
      <div className="space-y-6">{summary}</div>

      {/* Action column — the frozen breakdown + quiet urgency cue + the one coral terminal action.

          THE OFFSET IS 80px AND IT IS DERIVED, NOT CHOSEN (SHELL-01, plan 11-10). The checkout route
          gets the MINIMAL header composition — a wordmark and nothing else — but "minimal" is about
          what the header CONTAINS, not about how tall it is: it is the same 64px sticky box as every
          other route's. So this rail tucks under it at any offset below 64px exactly as the listing
          page's does. 64 + a 16px gap = 80px = the 20th spacing step; the previous value was the 8th,
          32px. The general rule lives in `patterns/panel-card.tsx` and is asserted by
          `tests/design/sticky-offset.test.ts`.

          This is the SECOND of the two shipped `lg:sticky` sites. Plan 11-10 was written expecting
          one; `panel-card.tsx` had already recorded both by path, and both moved together, because a
          rule with one exception is not a rule. */}
      <aside>
        <Card className="lg:sticky lg:top-20">
          <CardContent className="space-y-5 py-6">
            {breakdown}
            <HoldCountdown expiresAt={expiresAt} onExpire={() => setExpired(true)} />
            <ReserveActions holdId={holdId} totalLabel={totalLabel} onResult={handleResult} />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
