// Search result card (SEARCH-05 · D-16/D-30) — extends the `listing-card.tsx` presentational core
// (Card + AspectRatio 4:3 cover + title + primary type + "hourly · day" price) for the public search
// grid. Differences from the host card (UI-SPEC § Discretionary card layout):
//   - NO host-action props (edit / unlist / delete) and NO status badge — every search result is
//     bookable (deriveBookable is enforced in the Stage-1 search SQL, never re-derived here).
//   - Adds a distance line ("2.3 km away", muted) rendered ONLY when the search had an origin, and an
//     optional searched-window line ("Available … on …") that always names the venue tz (SC#2).
//   - Title weight is normalized 500 → 600 (`font-semibold`) per the strict 2-weight contract.
//   - Prices render in the shared PHP `DISPLAY_CURRENCY` (D-46), never `listing.currency` ('usd'), and
//     since D-75 they arrive ALL-IN and pre-formatted from the server (see the price block below).
// The WHOLE card is a single Link to the listing, carrying the searched window so the listing calendar
// can pre-open that day. Neutral throughout — coral is reserved for the Search button (no per-card accent).

import Link from "next/link";
import { format } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { SPACE_TYPE_LABELS, type SpaceTypeValue } from "@/lib/listing-vocab";
import type { SearchResultRow } from "@/lib/search/query";

/** The booker's searched window, threaded onto the card link + the "Available …" line. */
export type SearchedWindow = {
  date?: string; // YYYY-MM-DD (venue-local calendar day)
  start?: string; // HH:mm (venue-local, on-the-hour)
  end?: string; // HH:mm
};

/** "09:00" | "9" → "9:00 AM" (on-the-hour venue-local wall clock, D-22), or null when malformed. */
function to12h(hhmm: string): string | null {
  const m = /^(\d{1,2})(?::(\d{2}))?$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  if (h < 0 || h > 23) return null;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${period}`;
}

/** Friendly city label: the listing city, else the IANA tz's city segment (mirrors the listing page). */
function cityLabelFor(city: string | null, timezone: string): string {
  if (city && city.trim()) return city.trim();
  const seg = timezone.split("/").pop();
  return seg ? seg.replace(/_/g, " ") : "local";
}

/** The searched-window line, always naming the venue tz (SC#2). Null when no date was searched. */
function windowLine(
  win: SearchedWindow | undefined,
  city: string | null,
  timezone: string,
): string | null {
  if (!win?.date) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(win.date);
  if (!m) return null;
  const niceDate = format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])), "EEE, MMM d");
  const startLabel = win.start ? to12h(win.start) : null;
  const endLabel = win.end ? to12h(win.end) : null;
  const cityLabel = cityLabelFor(city, timezone);
  if (startLabel && endLabel) {
    return `Available ${startLabel}–${endLabel} on ${niceDate} · ${cityLabel} time`;
  }
  return `Available ${niceDate} · ${cityLabel} time`;
}

export function SearchResultCard({
  listing,
  searchedWindow,
}: {
  listing: SearchResultRow;
  searchedWindow?: SearchedWindow;
}) {
  const title = listing.title || "Untitled space";
  const typeLabel = listing.primarySpaceType
    ? (SPACE_TYPE_LABELS[listing.primarySpaceType as SpaceTypeValue] ?? listing.primarySpaceType)
    : null;

  // D-75: search and listing pages display the ALL-IN rate so the number never goes up between browsing
  // and paying. These surfaces create no hold, so nothing is frozen here and the frozen-quote contract is
  // unaffected — the invariant holds because both surfaces and checkout use the SAME SERVICE_FEE_BPS.
  //
  // A RATE, never a promised total. 5% of an hourly rate × N hours can differ by one centavo from 5% of
  // (rate × N hours). Labelling these `/hr` and `/day` means no total is promised until checkout, so the
  // rounding edge cannot break D-75's "never goes up". Do NOT add a computed "estimated total" to a search
  // card — that would create a promise the checkout could break by a centavo.
  //
  // Already formatted SERVER-SIDE in the search query mapping (src/lib/search/query.ts → allInRateParts):
  // this card is rendered from a "use client" shell, so composing the fee here would put SERVICE_FEE_BPS
  // in the browser bundle, where a non-public env override does not reach it — the browse rate would
  // silently keep showing 5% while checkout charged the configured rate. Zero arithmetic in this file.
  const priceParts = listing.allInRateParts;

  // Distance renders ONLY when the search had an origin (distanceM is NULL in the default city view, D-30).
  const distanceKm = listing.distanceM != null ? (listing.distanceM / 1000).toFixed(1) : null;
  const availabilityLine = windowLine(searchedWindow, listing.city, listing.timezone);

  // Whole card = a Link to the listing, carrying the searched window (?date=&start=&end=).
  const params = new URLSearchParams();
  if (searchedWindow?.date) params.set("date", searchedWindow.date);
  if (searchedWindow?.start) params.set("start", searchedWindow.start);
  if (searchedWindow?.end) params.set("end", searchedWindow.end);
  const qs = params.toString();
  const href = qs ? `/listings/${listing.id}?${qs}` : `/listings/${listing.id}`;

  return (
    <Link
      href={href}
      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full gap-0 overflow-hidden pt-0 transition-shadow group-hover:bg-muted/40 group-hover:shadow-md">
        <AspectRatio ratio={4 / 3} className="bg-muted">
          {listing.coverPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.coverPhotoUrl} alt={title} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
              No photos yet
            </div>
          )}
        </AspectRatio>

        <CardContent className="space-y-1 py-4">
          <h3 className="font-semibold leading-snug">{title}</h3>
          {typeLabel && <p className="text-sm text-muted-foreground">{typeLabel}</p>}
          <p className="text-sm tabular-nums">
            {priceParts.length ? priceParts.join(" · ") : "Price on request"}
          </p>
          {priceParts.length > 0 && (
            <p className="text-sm text-muted-foreground">Service fee included</p>
          )}
          {distanceKm && (
            <p className="text-sm text-muted-foreground tabular-nums">{distanceKm} km away</p>
          )}
          {availabilityLine && <p className="text-sm text-muted-foreground">{availabilityLine}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}
