"use client";

// Client boundary for the single-listing map (D-11). react-leaflet + leaflet reference `window` and
// cannot be server-rendered, so the actual map (./listing-map) is loaded ONLY via next/dynamic with
// { ssr: false }. `ssr: false` is not allowed inside a Server Component, which is exactly why this
// thin "use client" wrapper exists — the public detail RSC imports THIS, not the map directly.
//
// The wrapper also renders the accessible text fallback for the map (UI-SPEC line 224): a caption that
// is present in the server HTML (so screen readers and no-JS clients get the location context) and
// that respects the approximate/exact toggle. The exact coordinates only ever reach the map when the
// host has opted into showExactAddress — publicListing() has already fuzzed them otherwise.

import dynamic from "next/dynamic";
import { MapPinIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ListingMap = dynamic(() => import("./listing-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export function ListingMapPanel({
  lat,
  lng,
  showExactAddress,
  caption,
}: {
  lat: number;
  lng: number;
  showExactAddress: boolean;
  /** Human-readable location text shown under the map and used as the screen-reader fallback. */
  caption: string;
}) {
  return (
    <div className="space-y-2">
      <div className="h-72 w-full overflow-hidden rounded-xl ring-1 ring-foreground/10 sm:h-80">
        <ListingMap
          lat={lat}
          lng={lng}
          showExactAddress={showExactAddress}
          title={`Map showing the ${showExactAddress ? "exact" : "approximate"} location: ${caption}`}
        />
      </div>
      <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
        <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{caption}</span>
      </p>
    </div>
  );
}
