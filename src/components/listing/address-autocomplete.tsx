"use client";

// Address autocomplete (D-10 / D-18) — a command+popover combobox backed by Photon (Komoot), an
// OpenStreetMap-based geocoder that needs NO API key and bills nothing per keystroke (cost-disciplined
// for the single-city launch). Provider-agnostic (D-18): swap PROVIDER_URL for LocationIQ without
// touching the wizard, which only consumes the resolved structured address + lat/lng. On select it
// lifts { addressLine1, city, region, postalCode, country, neighborhood, lat, lng } up so Phase-4
// radius search is never blocked. The single-listing MAP render lives on the public page (Plan 05).
//
// NOTE: in dev the geocoder env may be a placeholder; this component degrades gracefully (it simply
// shows no suggestions) and never blocks the wizard. Automated tests do not depend on a live call.

import { useEffect, useRef, useState } from "react";
import { MapPinIcon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Photon (Komoot) — free OSM geocoder, no key. LocationIQ is the drop-in D-18 alternative:
//   const PROVIDER_URL = `https://api.locationiq.com/v1/autocomplete?key=${KEY}&q=`;
const PHOTON_URL = "https://photon.komoot.io/api";

/** The structured location the wizard stores (D-10). lat/lng are REQUIRED for a usable listing. */
export type ResolvedAddress = {
  addressLine1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  neighborhood: string;
  lat: number;
  lng: number;
};

type PhotonFeature = {
  geometry: { coordinates: [number, number] } | null;
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    town?: string;
    village?: string;
    district?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

type Suggestion = ResolvedAddress & { id: string; label: string };

/** Map a Photon GeoJSON feature to a structured suggestion, or null if it has no coordinates. */
function toSuggestion(f: PhotonFeature, i: number): Suggestion | null {
  const coords = f.geometry?.coordinates;
  if (!coords || coords.length !== 2) return null; // no coordinates — unusable (D-10)
  // Photon/GeoJSON order is [lng, lat] — keep the axes straight (Pitfall 1).
  const [lng, lat] = coords;
  const p = f.properties;
  const line1 = [p.housenumber, p.street].filter(Boolean).join(" ") || p.name || "";
  const city = p.city || p.town || p.village || "";
  const neighborhood = p.district || p.suburb || p.name || "";
  const label = [line1 || p.name, city, p.state, p.country].filter(Boolean).join(", ");
  return {
    id: `${label}-${i}`,
    label,
    addressLine1: line1,
    city,
    region: p.state || "",
    postalCode: p.postcode || "",
    country: p.country || "",
    neighborhood,
    lat,
    lng,
  };
}

export function AddressAutocomplete({
  initialLabel,
  hasCoordinates,
  onResolved,
}: {
  initialLabel?: string;
  hasCoordinates?: boolean;
  onResolved: (addr: ResolvedAddress) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState(initialLabel ?? "");
  const abortRef = useRef<AbortController | null>(null);

  // Debounced Photon lookup (250ms) — never one request per keystroke (D-18 cost discipline).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=6`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("geocoder");
        const data = (await res.json()) as { features?: PhotonFeature[] };
        setResults(
          (data.features ?? [])
            .map(toSuggestion)
            .filter((s): s is Suggestion => s !== null),
        );
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setResults([]);
          setError("We couldn't reach address search. Type your address and try again.");
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  function handleSelect(s: Suggestion) {
    // Enforce the D-10 invariant at the UI edge: a pick with no coordinates is not acceptable.
    if (typeof s.lat !== "number" || typeof s.lng !== "number") {
      setError(
        "We couldn't find that address. Pick a suggestion from the list so guests can find you.",
      );
      return;
    }
    setSelectedLabel(s.label);
    setError(null);
    onResolved({
      addressLine1: s.addressLine1,
      city: s.city,
      region: s.region,
      postalCode: s.postalCode,
      country: s.country,
      neighborhood: s.neighborhood,
      lat: s.lat,
      lng: s.lng,
    });
    setOpen(false);
  }

  const located = Boolean(hasCoordinates) || selectedLabel.length > 0;

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Search for your address"
            className={cn(
              "w-full justify-start gap-2 font-normal",
              !selectedLabel && "text-muted-foreground",
            )}
          >
            <MapPinIcon className="size-4 shrink-0" />
            <span className="truncate">{selectedLabel || "Search for your address"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-0"
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Start typing a street, city…"
            />
            <CommandList>
              {loading && (
                <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
              )}
              {!loading && query.trim().length >= 3 && results.length === 0 && (
                <CommandEmpty>No matches yet. Keep typing.</CommandEmpty>
              )}
              <CommandGroup>
                {results.map((s) => (
                  <CommandItem key={s.id} value={s.id} onSelect={() => handleSelect(s)}>
                    <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{s.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Accessibility (UI-SPEC): announce resolution + errors via aria-live. */}
      <p aria-live="polite" className="text-xs">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : located ? (
          <span className="text-muted-foreground">
            Location set. Guests see an approximate area until you choose to show the exact address.
          </span>
        ) : (
          <span className="text-muted-foreground">
            Pick a suggestion so we can place you on the map.
          </span>
        )}
      </p>
    </div>
  );
}
