"use client";

import type { RefObject } from "react";

import { AddressAutocomplete, type ResolvedAddress } from "@/components/listing/address-autocomplete";
import { Button } from "@/components/ui/button";

export type LocationStepProps = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  initialLabel?: string;
  hasCoordinates: boolean;
  locationPending: boolean;
  onResolved: (address: ResolvedAddress) => void;
  onUseMyLocation: () => void;
};

export function LocationStep({ headingRef, initialLabel, hasCoordinates, locationPending, onResolved, onUseMyLocation }: LocationStepProps) {
  return (
    <div className="space-y-3 rounded-card border border-border bg-card p-4 shadow-card">
      <p className="text-label text-muted-foreground">Step 2 of 3</p>
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">Where do you want to play?</h2>
      <AddressAutocomplete audience="search" initialLabel={initialLabel} hasCoordinates={hasCoordinates} onResolved={onResolved} />
      <Button type="button" variant="outline" size="touch" disabled={locationPending} onClick={onUseMyLocation}>
        {locationPending ? "Getting your location…" : "Use my location"}
      </Button>
    </div>
  );
}
