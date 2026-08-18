"use client";

// BFLOW-06 — THE CHECKOUT'S BOTTOM BAR: the amount and the one terminal action, at thumb reach.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE SAME BOX AS THE LISTING PAGE'S BAR, AND THAT IS A CONSTRAINT RATHER THAN A COINCIDENCE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `booking/booking-sticky-bar.tsx` (RESP-02, plan 12-10) is the app's other bottom bar, one route
// earlier in the same journey. A booker who picks a window on `/listings/[id]` and lands here meets this
// box immediately afterwards, so the two are built from the SAME constant (`STICKY_BAR_HEIGHT`), the
// same layer (`z-(--z-sticky)`), the same elevation step and the same edge treatment. What differs is
// the CONTENT — a price and `Book` there, the frozen Total and `Confirm & pay` here — and nothing else.
// Two bars that drifted in geometry would read as two different apps at the two most decisive taps on
// the money path.
//
// ⚠ `shadow-sticky`'s SECOND AND FINAL PRODUCT CALL SITE. The step's y-offset is NEGATIVE (`0 -1px …`
// court / `0 -2px …` grove), so the shadow is cast UPWARD onto the content the bar is covering. That is
// authored for a bottom-anchored bar and is wrong on anything else — on a top header it throws the
// shadow off the screen and leaves the boundary a booker actually sees completely flat. THIS STEP MUST
// NEVER REACH A TOP HEADER, and `tests/design/elevation-z.test.ts` now pins the whole set as an equality
// (exactly two files, both bottom bars) rather than as a floor.
//
// `z-(--z-sticky)` (10) and NOT `--z-sheet` (20), for the reason `globals.css` records at the token and
// 12-10 restated: a bar floating above an overlay's own scrim claims the page behind it is interactive
// while the overlay says it is not. This route opens no overlay at all, so the step is simply inherited
// from the bar it must match.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// ONE ACTION, ONE LEASE, ONE GUARD — WHY THIS FILE OWNS NO STATE (T-12-11-DOUBLECHARGE)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `pending` and `onConfirm` are PROPS. `ReserveActions` is the single owner of the confirm state, the
// single caller of `confirmBooking`, and the single renderer of a lease refusal — this bar is its second
// BOX, not a second path. `grep -n "confirmBooking" src/components/booking/` finds one call site, which
// is the property that matters: PayMongo does not honour `Idempotency-Key` on `/v1/checkout_sessions`
// (T-08-79, probed — two byte-identical POSTs mint two different payable sessions), so a second client
// path into that action would be a second way to mint a second payable session for one booking.
//
// The disable is still only a courtesy; the guarantees are the server-side compare-and-swap checkout
// lease and expire-before-create. See `reserve-actions.tsx`'s header, which states this once for both
// boxes precisely so the two cannot come to believe different things about it.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE AMOUNT IS BYTE-EQUAL TO THE TOTAL BY CONSTRUCTION, NOT BY AGREEMENT (T-12-11-HIDDENTOTAL)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `totalLabel` is the string `book/page.tsx` produced with ONE `formatMoney(quoted, currency)` call, and
// it is the same value threaded into `PriceBreakdown`'s `quotedTotalCents` / `currency`. The bar
// performs no arithmetic, imports no money identifier and formats nothing — it renders a finished string
// (GATE-05). That is what makes `e2e/mobile-booker-path.spec.ts`'s byte-equality assertion a property of
// the call rather than of two surfaces being kept in step; the same argument `selectedTotalLabel` makes
// for the listing bar.

import * as React from "react";

import { Button } from "@/components/ui/button";
import { STICKY_BAR_HEIGHT } from "@/lib/design/measurements";
import { cn } from "@/lib/utils";

export function CheckoutStickyBar({
  totalLabel,
  pending,
  onConfirm,
  children,
}: {
  /** Server-formatted frozen quote — the SAME string `PriceBreakdown` renders as its `Total`. */
  totalLabel: string;
  /** Owned by `ReserveActions`. Mirrored here so both boxes disable together on one press. */
  pending: boolean;
  /** `ReserveActions`' own handler. Not a second call path — see the header. */
  onConfirm: () => void;
  /** The confirm label. Owned by `reserve-actions.tsx` so the pressed/at-rest pair lives in one file. */
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid="checkout-sticky-bar"
      className={cn(
        "fixed inset-x-0 bottom-0 z-(--z-sticky) flex items-center gap-3 border-t bg-card px-4 shadow-sticky lg:hidden",
        STICKY_BAR_HEIGHT,
      )}
    >
      {/* `Total` over the amount, in the bar's own left column. `min-w-0` lets it shrink so the 44px
          action keeps its width at 320px; `whitespace-nowrap` on both lines because a wrapped amount in
          a 64px box is a clipped amount, on the one surface that carries the price at that width.
          `tabular-nums` for the same reason the breakdown's Total carries it — the digits must not
          jitter against the figure directly above them. */}
      <div className="min-w-0 flex-1">
        <p className="text-xs whitespace-nowrap text-muted-foreground">Total</p>
        <p className="text-body font-semibold tabular-nums whitespace-nowrap">{totalLabel}</p>
      </div>

      {/* `size="touch"` is the declared 44px height (D-22) and `variant="brand"` is the page's one
          accent (D-21): this is the terminal money action, which is exactly the budget's intended use.
          `aria-disabled` beside `disabled` is the shipped courtesy pair, restated here because the two
          boxes must behave identically to a keyboard and to a screen reader. */}
      <Button
        variant="brand"
        size="touch"
        onClick={onConfirm}
        disabled={pending}
        aria-disabled={pending}
        className="shrink-0"
      >
        {children}
      </Button>
    </div>
  );
}
