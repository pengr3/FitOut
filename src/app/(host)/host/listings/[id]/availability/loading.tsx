// STATE-01 — the loading state for `/host/listings/[id]/availability`.
// Convention: see `(app)/bookings/loading.tsx`.
//
// THE HEADING AND ITS LEDE ARE BOTH FIXED STRINGS, so both are copied verbatim — through the page's
// own markup rather than `PageHeader`, because this h1 is `text-2xl` and the pattern's contract is
// `text-xl`. What is NOT copied is the pair of muted lines that can follow: the drop-in explainer
// (open-capacity listings only) and the CR-03 hours-lock notice (only while passes are outstanding).
// Both are conditional on the row this fallback is waiting for.
//
// A PANEL, and it is the shape `panel-skeleton.tsx`'s own header names for this route: the weekly
// hours editor and the blocked-dates calendar are two boxed panels whose content varies, which is
// what a minimum height pins and a fixed one would truncate.

import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function AvailabilityLoading() {
  return (
    // Container, `space-y-8` and the heading block are the availability page's own, verbatim.
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
        <p className="text-sm text-muted-foreground">
          Set when your space is open and block off any dates you can&apos;t host.
        </p>
      </div>

      <PanelSkeleton label="Loading your availability" />
    </div>
  );
}
