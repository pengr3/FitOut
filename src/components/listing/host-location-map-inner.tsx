"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { THEME_TOKENS } from "@/lib/design/tokens.generated";

function MoveOnClick({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (event) => onMove(event.latlng.lat, event.latlng.lng) });
  return null;
}

function FollowPin({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 17));
  }, [map, lat, lng]);
  return null;
}

export default function HostLocationMapInner({
  lat,
  lng,
  onMove,
}: {
  lat: number;
  lng: number;
  onMove: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);
  const pin = useMemo(
    () =>
      L.divIcon({
        className: "host-location-pin",
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40" aria-hidden="true"><path d="M14 0C6.3 0 0 6.1 0 13.6 0 23.8 14 40 14 40s14-16.2 14-26.4C28 6.1 21.7 0 14 0z" fill="${THEME_TOKENS.court["--brand"].hex}"/><circle cx="14" cy="13.5" r="5" fill="${THEME_TOKENS.court["--brand-foreground"].hex}"/></svg>`,
        iconSize: [28, 40],
        iconAnchor: [14, 40],
      }),
    [],
  );

  return (
    <MapContainer center={[lat, lng]} zoom={17} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FollowPin lat={lat} lng={lng} />
      <MoveOnClick onMove={onMove} />
      <Marker
        position={[lat, lng]}
        icon={pin}
        draggable
        ref={markerRef}
        eventHandlers={{ dragend: () => {
          const point = markerRef.current?.getLatLng();
          if (point) onMove(point.lat, point.lng);
        } }}
      />
    </MapContainer>
  );
}
