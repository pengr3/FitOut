// STATE-01 — the loading state for `/profile`. Convention: see `(app)/bookings/loading.tsx`.
//
// THE HEADING IS THE PATTERN'S NOW — "Your profile" is fixed, and as of plan 15-08 the PAGE composes
// `PageHeader` with the same title, so this is no longer a fallback imitating a hand-rolled heading:
// it is the same component, rendered twice. Until now this plate agreed with its page about the
// container only because the same string was typed in both files; the two read one constant now, so
// the fallback cannot draw a different box than the page it stands in for. The muted
// "Member since {date}" line under it is data-derived AND conditional (it is absent for a user with
// no `createdAt`), so it is not faked: a bar standing in for a line that may not exist is a shift
// in whichever direction the data goes.
//
// TWO PANELS, not a row list: `ProfileForm` is two boxed panels — the public one (avatar, first name,
// About, city) and the private one (last name, phone) — and the first one's height varies with the
// About field's content, which is exactly what `PANEL_MIN_HEIGHT` is a FLOOR rather than a height for.
// The count matches the loaded page BECAUSE the page draws two panels as of plan 15-08; before that it
// drew none at all while this plate drew one, which is a fallback claiming a box its page never had.

import { BOOKING_SHELL } from "@/lib/design/measurements";
import { PageHeader } from "@/components/patterns/page-header";
import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function ProfileLoading() {
  return (
    // The container is the DECLARED booker shell, shared with `(app)/profile/page.tsx` rather than
    // copied from it; `space-y-8` and the panel gap are that page's own.
    <div className={BOOKING_SHELL}>
      <div className="space-y-8">
        <PageHeader title="Your profile" />

        {/* Two regions, two names — a plate that announced "Loading your profile" twice would say the
            same thing about two different halves of the form. */}
        <div className="space-y-6">
          <PanelSkeleton label="Loading your public profile" />
          <PanelSkeleton label="Loading your account info" />
        </div>
      </div>
    </div>
  );
}
