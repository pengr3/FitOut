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
//   - `fullDay` IS PERSISTED (booking.full_day, drizzle 0016 / WR-06) and is the sole authority for which
//     branch renders. It is the same flag the price was frozen with, so the label and the money agree by
//     construction. It is a REQUIRED input, not an optional one: an optional field would let a call site
//     silently omit it and keep the old defect alive on that one surface, whereas a required field makes
//     the COMPILER enumerate every projection that must supply it.
//   - ⚠️ THE OLD PRICE-INEQUALITY DERIVATION IS GONE, AND MUST NOT COME BACK (CR-01, 08-RESEARCH
//     Pitfall 3). It concluded "Full day" whenever the frozen space price did not equal the plain
//     hour-rate run total. The D-108 extra-guest surcharge is folded INTO `spacePriceCents`
//     (pricing.ts quoteWindow → units.ts createPendingHold), so that inequality is TRUE of a perfectly
//     ordinary hourly booking with one extra guest — which made every surcharged hourly booking render
//     "Full day" on all eighteen surfaces this module feeds, silently and with no test failure. An
//     inequality against a price can never come back here.
//   - The price comparison survives ONLY as the pre-0016 fallback (full_day IS NULL on legacy rows), and
//     ONLY as a POSITIVE day-rate match — the same idiom already shipped in listings/[id]/book/page.tsx,
//     (app)/bookings/[id]/page.tsx and actions/re-request.ts. A positive match can only ever ADD
//     "Full day" on an exact day-rate coincidence, so nothing hourly — surcharged or not — can be
//     mislabeled by it. With no day rate to match, the window reads as real hours.
//   - GREP TRIPWIRE (the 07-04 payout-sweep idiom, restated by 08-05 deviation 5). The absence of the old
//     derivation is checked by grepping this file for the identifier it was written with. A grep is only a
//     real guard if it cannot be tripped by the very comment forbidding it — so that identifier is not
//     spelled anywhere in this file, comments included. If you are tempted to name it "just in prose",
//     don't: it disarms the check for good.
//   - The city suffix is omitted entirely when the listing has no city (never a dangling " ( time)").
//
// Pure/isomorphic: this file carries NO client and NO server directive, so Server Components, server
// actions AND the Inngest functions can all import it — exactly like src/lib/payments/commission.ts. A
// directive here would turn these exports into client references an RSC cannot invoke (T-07-07).

import { format } from "date-fns";
import { tz } from "@date-fns/tz";

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
   * The PERSISTED `booking.full_day` snapshot (drizzle 0016 / WR-06) — the creation-time flag the price
   * was frozen with, and the sole authority for which branch renders. REQUIRED, so tsc enumerates every
   * call site. `null` means a pre-0016 row and ONLY then is the fallback below consulted.
   */
  fullDay: boolean | null;
  /**
   * The frozen SPACE price (D-74) — the listing-priced portion, i.e. the only figure comparable to a
   * listing rate. Read ONLY by the pre-0016 fallback, and only as a positive `=== dayRateCents` match.
   */
  spacePriceCents: number | null;
  /**
   * The SERVER-FROZEN all-in charged total (D-49). Used here ONLY as the fallback when `spacePriceCents`
   * is null — a pre-Phase-7 row, where no service fee existed and the two figures were equal by definition.
   */
  quotedTotalCents: number | null;
  /**
   * The listing's day rate — the ONLY rate this module consults, and only for the pre-0016 positive match.
   * `null` means there is no day rate to match, so a legacy row renders its real hours.
   */
  dayRateCents: number | null;
};

/**
 * The shared body. `dateFormat` is the ONLY difference between the long and short variants — keeping one
 * implementation means the time range, the fullDay resolution and the city suffix can never diverge.
 */
function compose(input: WhenLabelInput, dateFormat: string): string {
  const inTz = tz(input.timezone);
  // The listing-priced portion. Falls back to the all-in total only for a pre-Phase-7 row whose split was
  // never frozen — for those rows the fee was 0, so the two are the same number.
  const spaceCents = input.spacePriceCents ?? input.quotedTotalCents ?? 0;
  // The persisted snapshot wins outright. The positive day-rate match is the pre-0016 legacy path ONLY.
  const fullDay = input.fullDay ?? (input.dayRateCents != null && spaceCents === input.dayRateCents);
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

/**
 * A single DEADLINE instant, venue-local — "Thu, Jul 3, 8:00 PM (Manila time)".
 *
 * `composeWhenLabel` renders a booking WINDOW (two bounds, a mode, a range). A deadline is one instant and
 * has none of that, so it gets its own export rather than a fake zero-length window — but it lives HERE, in
 * the module that owns venue-local rendering, for the reason stated in this file's header: every new time
 * surface imports from here, and the tz + city-suffix rules must never be re-implemented at a call site.
 *
 * Feeds the `payByLabel` / `respondByLabel` display strings on the D-86 notification payloads (07-10), and
 * is what Plan 13's reminders must use — under D-96 a cap-shortened SLA means the real deadline is
 * frequently NOT `APPROVAL_SLA_HOURS` from now, so a label rendered from a config constant would be wrong
 * on exactly the short-notice bookings where the deadline matters most. Always compose from the row's own
 * `expires_at`.
 */
export function composeDeadlineLabel(
  instant: Date,
  timezone: string,
  city: string | null,
): string {
  const label = format(instant, "EEE, MMM d, h:mm a", { in: tz(timezone) });
  return `${label}${city ? ` (${city} time)` : ""}`;
}
