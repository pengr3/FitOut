// Shared venue-timezone display helpers (SC#2 — "always name the venue timezone" on any time).
//
// Extracted from listings/[id]/page.tsx so the listing detail, the reserve page, and the confirmation
// page render the venue tz label IDENTICALLY. Every booker-facing time in Phase 4 (availability, the
// reserve window, the confirmation) must name the venue tz; keeping one source means the SC#2 copy can
// never drift between those three surfaces. Pure/isomorphic (no directive) — RSC + client both import.

/** Current short GMT offset for an IANA zone, e.g. "GMT+8" for Asia/Manila. */
export function gmtLabelFor(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    const name = parts.find((p) => p.type === "timeZoneName")?.value;
    if (name) return name.replace("UTC", "GMT");
  } catch {
    // fall through to the launch-region default
  }
  return "GMT+8";
}

/** A friendly city label: the listing's city, else the IANA tz's city segment (e.g. "Manila"). */
export function cityLabelFor(city: string | null, timezone: string): string {
  if (city && city.trim()) return city.trim();
  const seg = timezone.split("/").pop();
  return seg ? seg.replace(/_/g, " ") : "your city";
}

/** The canonical SC#2 note, e.g. "Times shown in Manila time (GMT+8)". One source for all price/time surfaces. */
export function venueTzNote(city: string | null, timezone: string): string {
  return `Times shown in ${cityLabelFor(city, timezone)} time (${gmtLabelFor(timezone)})`;
}
