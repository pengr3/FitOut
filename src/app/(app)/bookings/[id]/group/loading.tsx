// STATE-01 — the loading state for `/bookings/[id]/group`, the organizer's roster.
// Convention: see `(app)/bookings/loading.tsx`.
//
// A ROW LIST, NOT A PANEL: the page's tallest region by far is `AttendeeRoster`, a stacked list of
// attendee rows, and the shape a fallback claims should be the shape of what dominates the screen.
//
// THE HEADING IS RENDERED because "Your group" is a fixed string. It is copied through the page's
// own classes rather than `PageHeader` for one measured reason: this h1 carries `leading-tight`,
// which the pattern does not, and at `text-xl` that is a 3px line-box difference — small, and
// exactly the kind of small that a loading state is supposed to not have. The two muted lines
// beneath it (the space + when label, and the timezone note) are data-derived and therefore absent.

import { BOOKING_SHELL } from "@/lib/design/measurements";
import { RowListSkeleton } from "@/components/patterns/row-list-skeleton";

export default function GroupLoading() {
  return (
    // Container is `BOOKING_SHELL`, shared with `group/page.tsx` rather than copied from it (plan
    // 13-01); `space-y-8` and the heading block are still that page's own, copied.
    <div className={BOOKING_SHELL}>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-xl leading-tight font-semibold tracking-tight">Your group</h1>
        </div>

        <RowListSkeleton label="Loading your group" />
      </div>
    </div>
  );
}
