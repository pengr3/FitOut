// STATE-01 — the loading state for `/bookings/[id]/cancel`.
// Convention: see `(app)/bookings/loading.tsx`.
//
// NO HEADING, AND THIS IS THE ROUTE WHERE THAT RULE EARNS ITS KEEP. The resolved h1 is
// "Cancel this booking?" on the live path and one of two already-resolved sentences on the others
// (the booking is gone, or it was already cancelled). Rendering the question while the server is
// still deciding whether there is anything to cancel would put a decision on screen that the page
// may be about to say is not available — the money is real and the refund tier is server-computed,
// so this surface may not preview its own answer.
//
// The heading also sits INSIDE the resolved page's card, so a bare copy of it here would be at the
// wrong indent and the wrong offset even if the words were safe.

import { BOOKING_SHELL } from "@/lib/design/measurements";
import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function CancelBookingLoading() {
  return (
    // Container is `BOOKING_SHELL` — the same constant `cancel/page.tsx` renders, so "verbatim" is now
    // mechanical rather than an instruction to the next author (plan 13-01).
    <div className={BOOKING_SHELL}>
      <PanelSkeleton label="Loading your cancellation options" />
    </div>
  );
}
