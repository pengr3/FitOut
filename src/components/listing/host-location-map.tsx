"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const PinMap = dynamic(() => import("./host-location-map-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full rounded-xl" />,
});

export function HostLocationMap({
  lat,
  lng,
  onMove,
}: {
  lat: number;
  lng: number;
  onMove: (lat: number, lng: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="h-72 overflow-hidden rounded-xl border" aria-label="Map for positioning your space entrance">
        <PinMap lat={lat} lng={lng} onMove={onMove} />
      </div>
      <p className="text-sm text-muted-foreground">
        Click the map or drag the pin to your entrance. The exact pin is shared with guests only after booking unless you turn on Show exact address.
      </p>
    </div>
  );
}
