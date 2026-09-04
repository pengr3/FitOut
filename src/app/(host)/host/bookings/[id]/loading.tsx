// STATE-01 — the loading state for `/host/bookings/[id]`.
// Convention: see `(app)/bookings/loading.tsx`.
//
// THE BACK LINK IS THE REAL CONTROL, not a placeholder for one. It is a static ghost button to
// `/host/bookings` with no data behind it, it is the first thing in the resolved page's container,
// and it is the one affordance a host actually wants while a detail page is resolving — a way back
// out of it. Drawing a grey bar in its place would be both less useful and less accurate.
//
// NO HEADING: the resolved h1 is the space's title, and the muted line under it is the when-label.
//
// It renders as a `<div>` for the same reason the booker's detail fallback does: `(host)/host/
// layout.tsx` already wraps `{children}` in `<main>`.

import Link from "next/link";

import { PanelSkeleton } from "@/components/patterns/panel-skeleton";
import { Button } from "@/components/ui/button";

export default function HostBookingDetailLoading() {
  return (
    // Container, the back button and the `mt-4` offset are `(host)/host/bookings/[id]/page.tsx`'s
    // own, verbatim — the `mt-4` is the page's h1 offset, and the skeleton takes that slot.
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/host/bookings">← Back to bookings</Link>
      </Button>

      <div className="mt-4">
        <PanelSkeleton label="Loading this booking" />
      </div>
    </div>
  );
}
