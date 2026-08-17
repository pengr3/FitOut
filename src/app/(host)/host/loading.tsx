// STATE-01 — the loading state for `/host`, the hosting dashboard.
// Convention: see `(app)/bookings/loading.tsx`.
//
// NO HEADING: the resolved h1 is "Your hosting{, FirstName}", which is read off the session — so it
// is data-derived AND its width varies by name. Rendering "Your hosting" alone would be a title that
// visibly grows a comma and a name when the page lands.
//
// A PANEL. The dashboard's first block below the title is `PayoutBanner`, a boxed notice whose height
// depends on which of four payout states the host is in, followed by an hours nudge that renders only
// when a published listing has no calendar. Every one of those is a conditional box, which is the
// "metrics are unpredictable" case — so the fallback claims one panel's minimum and no more, rather
// than drawing a specific arrangement it has no way to know is the right one.
//
// THIS FILE ALSO COVERS EVERY `/host/**` ROUTE THAT HAS NO `loading.tsx` OF ITS OWN, which today is
// none of them: all nine host routes ship their own. It is the segment default, not a shared shape,
// and the coverage gate in `tests/design/loading-coverage.test.ts` is what keeps that true.

import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function HostDashboardLoading() {
  return (
    // Container is `(host)/host/page.tsx`'s own, verbatim.
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <PanelSkeleton label="Loading your hosting dashboard" />
    </div>
  );
}
