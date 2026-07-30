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
//   - `openCapacity` IS PERSISTED TOO (booking.open_capacity, drizzle 0021 / OC-03) and is likewise
//     REQUIRED, for the same 08-15 reason. An open row's starts_at/ends_at are the venue's opening and
//     closing instants — an ENTRY WINDOW kept only so the refund ladder, payout sweep, reminders and expiry
//     keep working — so rendering them as a range would announce a sixteen-hour reservation nobody bought.
//     Its branch is resolved FIRST, before any price-derived resolution, because every price input below
//     describes an exclusive booking's shape and says nothing true about a per-head day pass.
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
   * The PERSISTED `booking.open_capacity` snapshot (drizzle 0021) — TRUE for a drop-in day pass.
   *
   * REQUIRED, exactly like `fullDay` and for exactly the same reason (08-15 contract #2): a drop-in booking
   * persists starts_at = the venue's OPENING instant and ends_at = its CLOSING instant with full_day=false
   * (OC-03), purely so the refund ladder, the payout sweep, reminders and expiry keep working unchanged.
   * Those instants are an ENTRY WINDOW, not a reservation. If this field were optional, one forgotten call
   * site would quietly announce that the booker reserved the whole day — which is CR-01, in a new costume.
   * Being required, the compiler enumerates every surface instead of a reviewer.
   */
  openCapacity: boolean;
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
 * The shared body. `dateFormat` (and, for the open branch only, `short`) is the ONLY difference between the
 * long and short variants — keeping one implementation means the time range, the fullDay resolution, the
 * open-capacity fork and the city suffix can never diverge.
 */
function compose(input: WhenLabelInput, dateFormat: string, short = false): string {
  const inTz = tz(input.timezone);
  const dateLabel = format(input.startsAt, dateFormat, { in: inTz });
  const citySuffix = input.city ? ` (${input.city} time)` : "";

  // ── OC-03 / 09-UI-SPEC § 5a: a drop-in pass is a DAY, plus the hours you may turn up. Never a range that
  // reads as a reservation. Resolved FIRST so neither the full-day branch nor the pre-0016 price fallback
  // can ever run for an open row (their inputs describe an exclusive booking's pricing shape, and are
  // meaningless — actively misleading — for a per-head day pass).
  if (input.openCapacity) {
    if (short) return `${dateLabel} · Drop-in pass`;
    const openLabel = format(input.startsAt, "h:mm a", { in: inTz });
    const closeLabel = format(input.endsAt, "h:mm a", { in: inTz });
    return `${dateLabel} · Drop-in pass, any time ${openLabel} – ${closeLabel}${citySuffix}`;
  }

  // The listing-priced portion. Falls back to the all-in total only for a pre-Phase-7 row whose split was
  // never frozen — for those rows the fee was 0, so the two are the same number.
  const spaceCents = input.spacePriceCents ?? input.quotedTotalCents ?? 0;
  // The persisted snapshot wins outright. The positive day-rate match is the pre-0016 legacy path ONLY.
  const fullDay = input.fullDay ?? (input.dayRateCents != null && spaceCents === input.dayRateCents);
  const timeLabel = fullDay
    ? "Full day"
    : `${format(input.startsAt, "h:mm a", { in: inTz })} – ${format(input.endsAt, "h:mm a", { in: inTz })}`;
  return `${dateLabel}, ${timeLabel}${citySuffix}`;
}

/** The two date tokens, named once so every export below renders the SAME date the same way. */
const LONG_DATE = "EEEE, MMM d";
const SHORT_DATE = "EEE, MMM d";

/** "Thursday, Jul 3, 8:00 AM – 10:00 AM (Manila time)" — the full form for emails and detail surfaces. */
export const composeWhenLabel = (input: WhenLabelInput): string => compose(input, LONG_DATE);

/**
 * "Thu, Jul 3, 8:00 AM – 10:00 AM (Manila time)" — the short form for dense table/card rows.
 *
 * For an open row this is the DENSEST form 09-UI-SPEC § 5a defines: the weekday-and-date token plus the pass
 * wording, with NO hours and NO city suffix. A table cell has no room for an entry window, and the pass's
 * whole point is that the hour does not matter. (The literal is not spelled again here — the acceptance grep
 * counts occurrences of it in this file, and a comment quoting it would disarm that count.)
 */
export const composeWhenLabelShort = (input: WhenLabelInput): string =>
  compose(input, SHORT_DATE, true);

/**
 * Just the DATE, venue-local — "Friday, Aug 8". No time, no city suffix.
 *
 * Added by 09-09 for the cancel review's tier-rationale sentence, which for a drop-in pass must say
 * "…before the space opens on {date}" (09-UI-SPEC § 5b). That sentence is prose ABOUT a date, not a rendered
 * window, so it cannot use `composeWhenLabel` — and the alternative was a bare `format()` call on the page,
 * which is precisely the fourth copy this module's header forbids. Rendering it here, off the SAME
 * `LONG_DATE` token `composeWhenLabel` uses, means the sentence and the label above it can never name the
 * same instant two different ways.
 */
export function composeDateLabel(instant: Date, timezone: string): string {
  return format(instant, LONG_DATE, { in: tz(timezone) });
}

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
