// STATE-01 — the loading state for `/bookings/[id]`. Convention: see `(app)/bookings/loading.tsx`.
//
// WHY THIS EXISTS BESIDE `(app)/bookings/loading.tsx` RATHER THAN INHERITING IT. A `loading.tsx`
// covers its segment and every child, so without this file a booking detail would fall back to the
// LIST's skeleton — a tab strip over four 80px rows, on a route whose resolved content is one
// centred confirmation card. Same argument as `/invite/[token]` under `(public)`: an inherited
// fallback of the wrong shape is worse than no fallback.
//
// NO HEADING. This page has five return branches and their h1s are all state-derived — "Booking
// confirmed", "This session is done", "This booking was cancelled" and two request-lifecycle
// variants — which is the same fact the badge above them carries. A fallback that picked one would
// be announcing an outcome before the row that decides it has been read.
//
// It renders as a `<div>`: `(app)/layout.tsx` already wraps `{children}` in `<main>`, and a second
// `<main>` inside the first is a landmark this file has no reason to add.

import { BOOKING_SHELL } from "@/lib/design/measurements";
import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function BookingDetailLoading() {
  return (
    // Container is `BOOKING_SHELL` — the same constant `page.tsx` renders, so "verbatim" is now
    // mechanical rather than an instruction to the next author (plan 13-01).
    <div className={BOOKING_SHELL}>
      <PanelSkeleton label="Loading this booking" />
    </div>
  );
}
