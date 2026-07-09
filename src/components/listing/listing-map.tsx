"use client";

// The single-listing map (D-11 / D-18) — react-leaflet 5 over free OpenStreetMap tiles (no API key).
//
// PRIVACY-AWARE render (D-09), driven by showExactAddress:
//   - approximate (default): a fuzzed <Circle> over the neighbourhood centroid — NO exact pin. The
//     lat/lng handed in are ALREADY coarsened by publicListing(), so the precise point never reached
//     the client; the circle just communicates "somewhere in this area".
//   - exact (host opted in): an exact <Marker> pin at the precise coordinates.
//
// Axis note (Pitfall 1): PostGIS stores { x: lng, y: lat }, but Leaflet takes [lat, lng]. publicListing
// already converts to lat/lng, so this component consumes lat/lng directly and never touches x/y.
//
// This module imports `leaflet` at the top level (for the marker's divIcon), which references `window`,
// so it MUST NOT be server-rendered. It is loaded ONLY via next/dynamic({ ssr: false }) from
// listing-map-panel.tsx — never imported directly by a Server Component.

import { MapContainer, TileLayer, Circle, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BRAND_CORAL = "#E8484E"; // --brand (FitOut Coral), matches the UI-SPEC accent.

// Approximate-mode circle radius (metres). ~600m communicates a neighbourhood without pinpointing.
const FUZZ_RADIUS_M = 600;

/** A coral teardrop pin as an inline-SVG divIcon — avoids Leaflet's bundler-broken default marker
 *  images (no network fetch, no missing-icon squares) and matches the brand accent. */
function coralPin(): L.DivIcon {
  return L.divIcon({
    className: "listing-map-pin", // unstyled wrapper; the SVG carries all visuals
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40" aria-hidden="true">
      <path d="M14 0C6.3 0 0 6.1 0 13.6 0 23.8 14 40 14 40s14-16.2 14-26.4C28 6.1 21.7 0 14 0z" fill="${BRAND_CORAL}"/>
      <circle cx="14" cy="13.5" r="5" fill="#fff"/>
    </svg>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40], // tip of the teardrop sits on the coordinate
  });
}

export type ListingMapProps = {
  lat: number;
  lng: number;
  showExactAddress: boolean;
  /** Accessible name for the map region (e.g. "Map showing the approximate area in Makati"). */
  title?: string;
};

export default function ListingMap({ lat, lng, showExactAddress, title }: ListingMapProps) {
  const center: [number, number] = [lat, lng];

  return (
    <MapContainer
      center={center}
      zoom={showExactAddress ? 16 : 14}
      scrollWheelZoom={false} // don't trap page scroll (accessibility)
      style={{ height: "100%", width: "100%" }}
      aria-label={title ?? "Map of the listing location"}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {showExactAddress ? (
        // Exact: a precise pin at the coordinate the host chose to reveal.
        <Marker position={center} icon={coralPin()} />
      ) : (
        // Approximate: a fuzzed area — no exact pin (D-09/D-11).
        <Circle
          center={center}
          radius={FUZZ_RADIUS_M}
          pathOptions={{
            color: BRAND_CORAL,
            weight: 1.5,
            fillColor: BRAND_CORAL,
            fillOpacity: 0.15,
          }}
        />
      )}
    </MapContainer>
  );
}
