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
import { HOST_PANEL_SHELL } from "@/lib/design/measurements";
import { cn } from "@/lib/utils";

export default function ListingEditLoading() {
  return (
    // Container is `(host)/host/listings/[id]/edit/page.tsx`'s own — and that sentence is now
    // MECHANICAL rather than a promise, because both sides read the same constant. It stopped being
    // free the moment D-149 widened the wizard at the large breakpoint (14-10): a plate pinned at the
    // narrow width would have handed the arriving wizard a 256px width jump on every desktop load,
    // which is precisely the shift a skeleton exists to prevent.
    <div className={cn(HOST_PANEL_SHELL, "lg:max-w-5xl")}>
      <PanelSkeleton label="Loading your listing" />
    </div>
  );
}
