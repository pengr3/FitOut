// STATE-01 — the loading state for `/host/listings/[id]/availability`.
// Convention: see `(app)/bookings/loading.tsx`.
//
// THE HEADING AND ITS LEDE ARE BOTH FIXED STRINGS, so both are copied verbatim — and as of plan 14-13
// they are copied through `PageHeader`, the same component the page itself now composes with the same
// two strings. This plate used to render its own `<h1>` on purpose, because the page's heading was one
// step larger than the pattern's contract; 14-13 moved the page onto the pattern, so the reason is
// spent and keeping the hand-rolled heading would make the fallback the only place on this route that
// draws a title the page does not.
//
// What is NOT copied is the pair of muted advisories that can follow: the drop-in explainer
// (open-capacity listings only) and the CR-03 hours-lock notice (only while passes are outstanding).
// Both are conditional on the row this fallback is waiting for, so claiming either would be claiming a
// box that usually is not there.
//
// A PANEL, and it is the shape `panel-skeleton.tsx`'s own header names for this route: the weekly
// hours editor and the blocked-dates calendar are two boxed panels whose content varies, which is
// what a minimum height pins and a fixed one would truncate.

import { PanelSkeleton } from "@/components/patterns/panel-skeleton";
import { PageHeader } from "@/components/patterns/page-header";
import { HOST_PANEL_SHELL } from "@/lib/design/measurements";

export default function AvailabilityLoading() {
  return (
    // The container is the DECLARED host-panel shell and the section rhythm is the availability page's
    // own, at the same call site the page keeps it — so the plate cannot draw a different box, or a
    // different rhythm, than the page it stands in for.
    <div className={`${HOST_PANEL_SHELL} space-y-8`}>
      <PageHeader
        title="Availability"
        lede="Set when your space is open and block off any dates you can't host."
      />

      <PanelSkeleton label="Loading your availability" />
    </div>
  );
}
