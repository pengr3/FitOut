"use client";

// ReserveView (BOOK-01/02 · D-39/D-42/D-44) — the thin CLIENT shell for the reserve page's interactive
// bits. The RSC (listings/[id]/book/page.tsx) does the owner-gate + server-frozen data read and renders
// the listing summary + PriceBreakdown as SERVER nodes, then hands them here as `summary`/`breakdown`
// props so this island ships almost no JS (only Confirm is client here). Its ONE job beyond layout is to
// own the live-expiry swap: when the hold context reports `expired` (the header countdown reached 0), or
// a Confirm comes back `expired`/`denied` because the server — the sole expiry authority — released the
// slot, it replaces the whole reserve content with the calm HoldExpiredState (D-44), never a stale
// reserve form. An already EXPIRED hold on first load is handled in the RSC (it renders HoldExpiredState
// directly); this shell only ever mounts for an ACTIVE pending hold.
//
// PLAN 12-03 — THIS FILE IS NO LONGER "CONTAINER SWAP ONLY". It SUBSCRIBES to a context now, and that
// is a posture change rather than a layout one: D-49 moved the countdown out of this rail and into the
// checkout header, so the expiry no longer arrives through a callback this file hands DOWN. It arrives
// through `useHold()`, from a sibling one component tree UP. A file header that misstated that would be
// the defect one section down — the next reader would look here for the timer and find a prop that no
// longer exists. The countdown itself is `components/booking/hold-countdown.tsx`, mounted by
// `app/listings/[id]/book/layout.tsx`; the composition's argument lives in `hold-provider.tsx`.

import * as React from "react";

import { PanelCard } from "@/components/patterns/panel-card";
import { HoldExpiredState } from "@/components/booking/hold-expired-state";
import { ReserveActions } from "@/components/booking/reserve-actions";
import { useHold } from "@/components/booking/hold-provider";
import type { ConfirmResult } from "@/app/actions/booking";

export function ReserveView({
  holdId,
  listingId,
  totalLabel,
  summary,
  breakdown,
  wayBack,
}: {
  holdId: string;
  listingId: string;
  /** Server-formatted charged amount (formatMoney) — threaded to the `Confirm & pay` reassurance (D-57). */
  totalLabel: string;
  /** Server-rendered listing summary (cover, name, type, venue-tz window). Dropped on expiry. */
  summary: React.ReactNode;
  /** Server-rendered PriceBreakdown (the frozen quote). Dropped on expiry. */
  breakdown: React.ReactNode;
  /**
   * The ONE labelled way back (D-59 #2 / SHELL-03), as its own slot since plan 12-11.
   *
   * It used to be the last child of `summary`, which is last on a DESKTOP and third-from-last on a
   * phone — where the rail stacks below the summary, so an escape hatch sat between the booker and the
   * price. Taking it as a slot lets ONE tree place it after the money column below `lg:` and back in
   * the main column at `lg:`, using a grid row rather than a second rendering. Dropped on expiry with
   * everything else: `HoldExpiredState` carries its own way back.
   */
  wayBack: React.ReactNode;
}) {
  // TWO ROUTES INTO ONE STATE, and they stay separate on purpose. `timedOut` is the header countdown
  // reaching zero (a display cue). `confirmFailed` is the SERVER refusing — the only authority. Both
  // land on the same calm interstitial, but merging them into one setter would mean the client cue and
  // the server verdict shared a write path, which is how a display bug becomes a money bug.
  const { expired: timedOut } = useHold();
  const [confirmFailed, setConfirmFailed] = React.useState(false);

  // A Confirm that resolves to a graceful failure — the server released the slot (`expired`), an ownership
  // edge (`denied`), or checkout couldn't start / going too fast (`checkout`, D-57) — flips to the SAME
  // calm recovery state, never a red error (occupancy/expiry/checkout-retry are all normal states).
  function handleResult(result: ConfirmResult) {
    if (result.reason === "expired" || result.reason === "denied" || result.reason === "checkout") {
      setConfirmFailed(true);
    }
  }

  // The countdown hitting 0 flips the whole page into the expiry state (it does NOT silently vanish, D-44).
  if (timedOut || confirmFailed) return <HoldExpiredState listingId={listingId} />;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
      {/* Summary column — what am I booking (server-rendered, coral selection carried from Phase 3). */}
      <div className="space-y-6">{summary}</div>

      {/* Action column — the frozen breakdown + quiet urgency cue + the one coral terminal action.

          THIS IS `PriceBreakdown`'s CONTAINER, AND THAT SENTENCE IS WHY THIS FILE IS IN PLAN 11-13
          AT ALL. `11-UI-SPEC § PanelCard` lists *"`booking/price-breakdown.tsx`'s container"* among
          the five surfaces `PanelCard` replaces, and the container it means is HERE, not there:
          `price-breakdown.tsx`'s own root is a bare `<div className="space-y-3">` and always has
          been. The box that gives that breakdown its background, radius, ring and padding is this
          one, and `<PriceBreakdown>` has exactly one call site — `listings/[id]/book/page.tsx`,
          which renders it into this rail. Boxing the breakdown inside its own file would therefore
          have put a second `bg-card ring-1 rounded-xl` INSIDE this one and paid the padding twice.
          Do not "finish the job" by adding a Card there.

          THE OFFSET IS NO LONGER WRITTEN HERE (SHELL-01, plan 11-13). It arrives through
          `PanelCard`'s `sticky` boolean, so the 80px (the 64px shell header + a 16px gap = the 20th
          spacing step) lives in `patterns/panel-card.tsx` alone. This was the SECOND of the two
          shipped pinned-rail sites; `tests/design/sticky-offset.test.ts` pinned three and now pins
          one, which is the shape of a correct conversion. (Named descriptively rather than quoted —
          same reason `panel-card.tsx:103-106` gives: the rule is a source scan, and a scan must not
          be tripped by the comment saying the class is gone.)

          The checkout route still gets the MINIMAL header composition — a wordmark and nothing else
          — but "minimal" is about what the header CONTAINS, not how tall it is: it is the same 64px
          sticky box as every other route's, which is why this rail needs the same clearance the
          listing page's does.

          The rhythm moves from this file's `space-y-5` to the pattern's `space-y-4` because a panel
          that re-declares its own spacing is a fork wearing a composition's name.

          THE RAIL NO LONGER HOLDS A TIMER (D-49, plan 12-03). The digits live in the checkout header,
          exactly once per document; what stays down here is the reassurance without the numerals, and
          it is rendered by `book/page.tsx` into `breakdown` so it remains a SERVER node like every
          other word in this column. Do not put a second countdown back: one live region and one
          `role="timer"` per document is the GATE-03 contract. */}
      {/* ⚠ `lg:row-span-2` IS THE WHOLE OF THE 12-11 LAYOUT CHANGE, and it is one class rather than a
          set of explicit placements on purpose. The grid's own class string is BYTE-IDENTICAL to what
          shipped, and auto-placement does the rest: with three children in DOM order
          (summary → rail → way back) and two columns at `lg:`, the summary takes (1,1), a rail that
          spans two rows takes column 2 for both, and the way back falls into the next free cell —
          (2,1), directly under the summary, which is exactly where it has always rendered on a desktop.
          Below `lg:` there is one column and no spanning, so DOM order IS reading order: summary, then
          the price (disclosure → Total → cancellation rungs), then the way out. No conditional
          rendering, no duplicated node, and nothing that can disagree with itself between widths.

          The span also gives the rail a two-row track to be sticky INSIDE, which the single-row item it
          replaced did not have — `PanelCard sticky` owns the offset (SHELL-01) and is untouched. */}
      <aside className="lg:row-span-2">
        <PanelCard sticky>
          {breakdown}
          <ReserveActions holdId={holdId} totalLabel={totalLabel} onResult={handleResult} />
        </PanelCard>
      </aside>

      {wayBack}
    </div>
  );
}
