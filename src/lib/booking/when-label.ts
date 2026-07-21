// The SINGLE venue-local booking-window formatter — `{date}, {time} ({City} time)` (D-105 / SC#2).
//
// Before Phase 7 this exact body was duplicated VERBATIM in three places: src/app/actions/host-requests.ts
// (:122-133, the canonical copy), src/inngest/functions/request-expiry.ts (:144-155) and
// src/app/(host)/host/requests/page.tsx (:84-97, the short "EEE, MMM d" variant). Phase 7 adds roughly six
// more time surfaces (cancel review, notification payloads, the four reminder emails), so 07-RESEARCH
// § Don't Hand-Roll explicitly FORBIDS a fourth copy: every new time surface imports from here. If the
// format must change, it changes once, here, and every surface moves together.
//
// The correctness rules this module owns:
//   - Times render in the VENUE timezone via tz(input.timezone) — never the viewer's clock (D-105/C5).
//     Both bounds are absolute UTC instants (timestamptz); only the DISPLAY is converted, at the edge.
//   - `fullDay` is NOT persisted, so it is re-derived from the frozen SPACE PRICE — biasing to hourly on
//     an exact coincidence so the real hours show. This is the shipped behaviour; do not "improve" it.
//     ⚠️ It compares against `spacePriceCents`, NOT the all-in charged total. Under D-74 the charged total
//     is `space + service fee`, so it can NEVER equal `hourlyRate × hours` — deriving from it would make
//     EVERY hourly booking render "Full day", on every surface this module feeds, silently and with no
//     test failure. The space price is the listing-priced portion and is the only figure comparable to a
//     listing rate. `quotedTotalCents` remains only as the pre-Phase-7 fallback (see below).
//   - The city suffix is omitted entirely when the listing has no city (never a dangling " ( time)").
//
// Pure/isomorphic: this file carries NO client and NO server directive, so Server Components, server
// actions AND the Inngest functions can all import it — exactly like src/lib/payments/commission.ts. A
// directive here would turn these exports into client references an RSC cannot invoke (T-07-07).

import { format } from "date-fns";
import { tz } from "@date-fns/tz";

import { windowHours } from "@/lib/booking/pricing";

/** The structural input every call site projects its own row shape onto (no ORM row type leaks in here). */
export type WhenLabelInput = {
  /** Absolute UTC instant of the window start (booking.startsAt). */
  startsAt: Date;
  /** Absolute UTC instant of the window end (booking.endsAt). */
  endsAt: Date;
  /** IANA venue timezone, e.g. "Asia/Manila" — the tz the label is rendered IN. */
  timezone: string;
  /** Venue city for the " ({City} time)" suffix; null omits the suffix entirely. */
  city: string | null;
  /**
   * The frozen SPACE price (D-74) — compared against hourlyRate × hours to re-derive fullDay. REQUIRED
   * (not optional) so tsc forces every call site to supply it: a call site that silently omitted it would
   * fall back to the all-in total and mislabel every hourly booking as "Full day".
   */
  spacePriceCents: number | null;
  /**
   * The SERVER-FROZEN all-in charged total (D-49). Used here ONLY as the fallback when `spacePriceCents`
   * is null — a pre-Phase-7 row, where no service fee existed and the two figures were equal by definition.
   */
  quotedTotalCents: number | null;
  /** The listing's hourly rate; null means there is nothing to compare, so the window reads as a full day. */
  hourlyRateCents: number | null;
};

/**
 * The shared body. `dateFormat` is the ONLY difference between the long and short variants — keeping one
 * implementation means the time range, the fullDay re-derivation and the city suffix can never diverge.
 */
function compose(input: WhenLabelInput, dateFormat: string): string {
  const inTz = tz(input.timezone);
  const hours = windowHours(input.startsAt, input.endsAt);
  // The listing-priced portion. Falls back to the all-in total only for a pre-Phase-7 row whose split was
  // never frozen — for those rows the fee was 0, so the two are the same number.
  const spaceCents = input.spacePriceCents ?? input.quotedTotalCents ?? 0;
  const hourlyTotal = input.hourlyRateCents != null ? input.hourlyRateCents * hours : null;
  const fullDay = hourlyTotal == null || spaceCents !== hourlyTotal;
  const dateLabel = format(input.startsAt, dateFormat, { in: inTz });
  const timeLabel = fullDay
    ? "Full day"
    : `${format(input.startsAt, "h:mm a", { in: inTz })} – ${format(input.endsAt, "h:mm a", { in: inTz })}`;
  return `${dateLabel}, ${timeLabel}${input.city ? ` (${input.city} time)` : ""}`;
}

/** "Thursday, Jul 3, 8:00 AM – 10:00 AM (Manila time)" — the full form for emails and detail surfaces. */
export const composeWhenLabel = (input: WhenLabelInput): string => compose(input, "EEEE, MMM d");

/** "Thu, Jul 3, 8:00 AM – 10:00 AM (Manila time)" — the short form for dense table/card rows. */
export const composeWhenLabelShort = (input: WhenLabelInput): string => compose(input, "EEE, MMM d");
