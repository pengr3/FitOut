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
//
// PHASE 9 (OC-12 · 09-UI-SPEC § 4) forks FOUR things for an open-capacity ("drop-in") listing and nothing
// else — the badge on the type line, the availability line, the scarcity chip, and the link params. The
// cover photo, the distance line, the title, the container and the spacing are shared, byte-for-byte.
//
// The fork keys on the PERSISTED occupancy mode, NEVER on the accident of a null rate column: 09-06
// requires a per-head price but never CLEARS hourly/day, and OC-17 lets a host switch modes, so a drop-in
// listing can genuinely still carry every exclusive rate column (09-07's lesson).

import Link from "next/link";
import { format } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { DropInBadge } from "@/components/listing/drop-in-badge";
import { SpotsLeftChip } from "@/components/availability/spots-left-chip";
import { SPACE_TYPE_LABELS, type SpaceTypeValue } from "@/lib/listing-vocab";
import type { SearchResultRow } from "@/lib/search/query";

/**
 * The booker's searched window, threaded onto the card link + the "Available …" line.
 *
 * An open-capacity listing uses `date` ALONE — see the link params and `datePassLine` below.
 */
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

/**
 * "2026-08-08" → "Fri, Aug 8" (the searched venue-local calendar day), or null when absent/malformed.
 *
 * ONE definition, shared by both modes' lines below, so an exclusive card and a drop-in card can never
 * name the same searched day two different ways. Composed from the parsed components (never
 * `new Date("YYYY-MM-DD")`, which is UTC midnight and renders the previous day west of Greenwich).
 */
function niceDateOf(date: string | undefined): string | null {
  const m = date ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(date) : null;
  if (!m) return null;
  return format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])), "EEE, MMM d");
}

/** The searched-window line, always naming the venue tz (SC#2). Null when no date was searched. */
function windowLine(
  win: SearchedWindow | undefined,
  city: string | null,
  timezone: string,
): string | null {
  const niceDate = niceDateOf(win?.date);
  if (niceDate === null) return null;
  const startLabel = win?.start ? to12h(win.start) : null;
  const endLabel = win?.end ? to12h(win.end) : null;
  const cityLabel = cityLabelFor(city, timezone);
  if (startLabel && endLabel) {
    return `Available ${startLabel}–${endLabel} on ${niceDate} · ${cityLabel} time`;
  }
  return `Available ${niceDate} · ${cityLabel} time`;
}

/**
 * The drop-in availability line: the searched DATE and the venue tz, and never an hour (09-UI-SPEC § 4).
 *
 * It takes the date STRING, not the searched window — the searched hours are not in scope inside this
 * function, so no later edit to it can render one by accident. O2 expressed as a signature, not a comment.
 */
function datePassLine(
  date: string | undefined,
  city: string | null,
  timezone: string,
): string | null {
  const niceDate = niceDateOf(date);
  if (niceDate === null) return null;
  return `${niceDate} · ${cityLabelFor(city, timezone)} time`;
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

  // The one fork (OC-01). Read from the persisted mode the search query projects, never inferred.
  const isDropIn = listing.occupancyMode === "open_capacity";

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
  //
  // Phase 9: a drop-in listing arrives here as exactly ONE part — `₱367.50/person` — from the SAME
  // server-side `allInRateParts` (its open branch, 09-05). So this file needs no drop-in price code at
  // all, and the muted qualifier below keeps rendering because `hasAllInRate` gained the matching branch.
  const priceParts = listing.allInRateParts;

  // Distance renders ONLY when the search had an origin (distanceM is NULL in the default city view, D-30).
  const distanceKm = listing.distanceM != null ? (listing.distanceM / 1000).toFixed(1) : null;
  // Exactly one of these is ever non-null: an exclusive card keeps the shipped "Available …" line, a
  // drop-in card gets the date-only line and never reaches `windowLine` at all (see the render, O2).
  const availabilityLine = isDropIn
    ? null
    : windowLine(searchedWindow, listing.city, listing.timezone);
  const dropInDateLine = isDropIn
    ? datePassLine(searchedWindow?.date, listing.city, listing.timezone)
    : null;

  // Whole card = a Link to the listing, carrying the searched window (?date=&start=&end=).
  const params = new URLSearchParams();
  if (searchedWindow?.date) params.set("date", searchedWindow.date);
  // A drop-in listing links forward with the DATE ALONE (09-UI-SPEC § 4 · OC-02). The listing page has no
  // hour picker in this mode, so a `start`/`end` window it cannot resume would be a dead link — and worse,
  // a promise of hours the pass does not reserve. The two params are not merely unused here; they are
  // never put on the URL.
  if (!isDropIn) {
    if (searchedWindow?.start) params.set("start", searchedWindow.start);
    if (searchedWindow?.end) params.set("end", searchedWindow.end);
  }
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
          {isDropIn ? (
            /* `Gym · [Drop-in]` — the badge sits INLINE on the space-type line, deliberately NOT as an
               overlay on the cover photo: contrast over arbitrary host photography is unreliable in both
               themes, and this card is a text-forward layout (09-UI-SPEC § 4). It renders even when the
               listing has no space type, because the mode must never be the silent thing on the card. */
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {typeLabel}
              <DropInBadge />
            </p>
          ) : (
            typeLabel && <p className="text-sm text-muted-foreground">{typeLabel}</p>
          )}

          {/* THE EXPLAINER (D-ELM-01 — v1.0 audit item #6, copy clause). The badge NAMES the mode; it does
              not define it. A booker meeting the word here learns nothing about what they are buying, and
              `/person` hints without stating. This one muted line carries both facts the audit named — the
              unit is a DAY, and the space is SHARED — sitting directly beneath the word that raised the
              question and above the price, which also keeps the price and its `Service fee included`
              qualifier contiguous as the single unit they are.

              NOT NEW COPY (D-ELM-02). It is a COMPRESSION of the listing page's own framing line
              (`date-pass-picker.tsx:230`), whose tail it reuses verbatim, and the sibling of
              `composeWhenLabel`'s drop-in line (`when-label.ts:112`). A results tile must be the short form
              of the surface it links to, never a second vocabulary for the same product. Checked against
              § Copywriting (09-UI-SPEC:444, restated in `drop-in-badge.tsx:11-12`): no "occupancy mode", no
              "capacity", no "slot". Written as a braced string literal — like line 230 — because of the
              apostrophe and `react/no-unescaped-entities`.

              "SHARED SPACE", NEVER "SHARED PASS" — load-bearing, not a stylistic preference. FitOut ships
              GROUP BOOKINGS, where an organizer reserves and invites friends, so "a shared pass" reads as a
              pass shared WITH someone. It is the SPACE that is shared; attaching the adjective to the pass
              would advertise the adjacent feature instead of this one. (This is also the first time the
              sharing fact appears in booker-facing copy at all — until now it existed only in the host
              wizard.)

              MUTED, NEVER ACCENT (D-ELM-04). § Color lists the five accent uses this phase permits and this
              is not among them — the same reason the badge itself is `secondary`. The token is the one four
              other lines on this card already use, so both themes are covered by construction. No truncate
              and no line-clamp: at 320px (the grid is single-column until `sm:`) this wraps to two lines,
              which is correct, and is why the copy was held to 46 characters.

              NOT A TOOLTIP (D-ELM-01). Roughly half this traffic is touch, where a hover tooltip is a
              hidden explanation rather than an explanation — and the WHOLE card is one Link (above), so a
              Radix trigger would nest a button inside an anchor and the tap would either navigate or be
              swallowed. `tooltip.tsx` and `popover.tsx` both exist; availability was never the constraint.

              The guard below is a SEPARATE expression rather than a third branch of the type-line ternary,
              deliberately: it leaves that shipped ternary byte-unchanged and makes the drop-in condition a
              single removable token, which is what lets a mutation measure that the exclusive card is
              genuinely protected — its whole `textContent` is pinned by exact equality in
              tests/search/search-card-open.test.tsx case (9) (D-ELM-05). */}
          {isDropIn && (
            <p className="text-sm text-muted-foreground">
              {"Day pass · shared space, any time they're open"}
            </p>
          )}

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

          {/* UI-SPEC O2: an open listing matches on DATE ONLY, so the searched start/end are ignored here and a
              time range is NEVER rendered — "Available 9:00 AM–11:00 AM" would describe a reservation the booker
              is not buying. The window line's two-hour branch is unreachable for this mode by construction. */}
          {dropInDateLine && <p className="text-sm text-muted-foreground">{dropInDateLine}</p>}

          {/* Scarcity appears ONLY with a date in play (OC-12): with no date the row carries no spots and
              this renders nothing at all — no chip, no number, no hint. The state is passed STRAIGHT
              THROUGH from the read model, which derived it from a non-public server threshold (T-09-13);
              this card compares nothing and imports no ceiling.
              There is deliberately no sold-out treatment here: Stage-2 keeps an open candidate only when
              the picked date still has a spot (OC-12 · 09-05), so `full` can never reach a search card and
              a branch for it would be dead UI that nothing can reach and no test can pin. */}
          {isDropIn && listing.spots && (
            <SpotsLeftChip state={listing.spots.state} remaining={listing.spots.remaining} />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
