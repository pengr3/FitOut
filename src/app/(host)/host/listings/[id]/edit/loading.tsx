// STATE-01 — the loading state for `/host/listings/[id]/edit`, the listing wizard.
// Convention: see `(app)/bookings/loading.tsx`.
//
// NO HEADING, and there is nothing being withheld: the page renders `ListingWizard` and nothing else
// inside its container. The wizard owns its own title, its step rail and its autosave state, all of
// which are seeded from the draft this fallback is waiting for.
//
// A PANEL. The wizard is one boxed form whose height changes per step, which is what
// `PANEL_MIN_HEIGHT` is a floor rather than a height for.

import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function ListingEditLoading() {
  return (
    // Container is `(host)/host/listings/[id]/edit/page.tsx`'s own, verbatim.
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <PanelSkeleton label="Loading your listing" />
    </div>
  );
}
