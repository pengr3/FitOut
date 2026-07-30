// Open-capacity (drop-in pass) primitives — the ONE place the phase's shared facts live (D-123, OC-02/OC-03/
// OC-11/OC-13). This module owns exactly three things:
//   (1) THE occupying predicate for open-capacity rows and the drift-free heads SUM built on it,
//   (2) the OC-03 "a date is one pass" day window (venue-local date → the UTC opening/closing instants),
//   (3) the OC-11 scarcity threshold + the derived display state, and the two user-facing refusal literals.
//
// Why one module: the ADMISSIONS CLAIM (units.ts createOpenCapacityHold), the day read model, the month map
// and search all need the SAME notion of "which rows occupy a seat on this date". Two copies of that
// predicate is the T-03-RANGE-MISMATCH class of bug in open-capacity clothing — the calendar shows a spot
// the counter then refuses, or hides one it would have granted (09-RESEARCH Pitfall 4). Importing from here
// makes the drift structurally impossible rather than merely discouraged.
//
// Pure/isomorphic header rule (mirrors slots.ts, pricing.ts, payments/config.ts): NO "use client" /
// "use server" directive, so an RSC, a server action and a booking transaction can all import it.

import { and, eq, sql } from "drizzle-orm";
import { TZDate } from "@date-fns/tz";
import { listing, operatingHours } from "@/lib/db/schema";
import { venueDayOfWeek } from "./slots";
import type { DbConn } from "./read-model";

/** OC-11 scarcity ceiling. SERVER-SIDE ONLY — it must NEVER be given a browser-public env prefix: a
 *  non-public override is not inlined into the browser bundle, so a client that re-derived the state would
 *  silently disagree with the server (the D-75 serviceFeeBps trap, availability-calendar.tsx:235-242). The
 *  `state` field is computed HERE and rides on the read-model payload; the client renders it, never derives
 *  it (the D-100 bookingMode-on-DayAvailability precedent). */
export const OPEN_LOW_STOCK_MAX = Number(process.env.OPEN_LOW_STOCK_MAX ?? 5);

/** 09-UI-SPEC § Spots-left: clamp(floor(cap / 2), 1, OPEN_LOW_STOCK_MAX). A flat ≤5 would mark a 6-person
 *  studio urgent from the FIRST booking; the half-capacity clamp guarantees urgency can never fire while
 *  more than half the day's admissions are still open, and the ceiling stops a 40-cap gym crying "18 left". */
export function lowStockThreshold(cap: number): number {
  return Math.min(Math.max(Math.floor(cap / 2), 1), OPEN_LOW_STOCK_MAX);
}

export type SpotsState = "open" | "low" | "full";

/** Server-derived display state (OC-11). `full` is a fact about the CLAIM, not about the display —
 *  mirroring headcount-meter.tsx:48-53: only the claim's own basis (remaining) may decide it. */
export function spotsState(remaining: number, cap: number): SpotsState {
  if (remaining <= 0) return "full";
  if (remaining <= lowStockThreshold(cap)) return "low";
  return "open";
}

/** OC-13 race-loss copy — the deliberate twin of the exclusive path's "just taken" line (units.ts
 *  mapBookingError). Statement + imperative next step, no exclamation, never rendered red. Exported so the
 *  claim, the action and any test assert ONE literal (09-UI-SPEC O3). */
export const SOLD_OUT_MESSAGE = "Just sold out — pick another date.";

/** Server-side refusal for a date whose pass window has ALREADY CLOSED, or that lies beyond the 90-day
 *  BOOKING_HORIZON_DAYS window. Same O3 grammar (statement + imperative next step, no exclamation, never
 *  rendered red). The calendar disables such dates, but a picker is a COURTESY and never the gate
 *  (Security V4) — a crafted date must be refused server-side. */
export const PAST_DATE_MESSAGE = "That day has already passed — pick another date.";

/**
 * THE occupying set for OPEN-CAPACITY rows, in ONE place. Open capacity is INSTANT-ONLY (OC-10), so the set
 * is {confirmed} ∪ {pending not yet expired} — deliberately NARROWER than the exclusive predicate, which
 * also carries requested/approved (D-63). Uses SQL now(), the DB transaction clock, exactly as the exclusive
 * read model and the EXCLUDE do (lazy expiry, D-48a — a lapsed hold reads FREE with no worker).
 *
 * Requires the booking table to be aliased `b`.
 *
 * ⚠️ DO NOT COPY THIS PREDICATE. The claim (createOpenCapacityHold), the day read model, the month map and
 * search ALL call openTakenSql. Two copies drifting is the T-03-RANGE-MISMATCH class: the calendar shows a
 * spot the counter then refuses, or hides one it would have granted.
 */
export const OPEN_OCCUPYING_STATUS_SQL = sql`(b.status = 'confirmed' OR (b.status = 'pending' AND b.expires_at > now()))`;

/** `SUM(declared_pax)` over the occupying set for one (listing, date). Drift-free by construction — there is
 *  NO stored counter (Pitfall 3): a cancelled row and a lapsed hold both leave the set automatically, which
 *  is why OC-15's "cancelling frees the seat" needs no release code at all. */
export function openTakenSql(listingId: string, dayOpenIso: string) {
  return sql`COALESCE((SELECT SUM(b.declared_pax) FROM booking b
    WHERE b.listing_id = ${listingId}
      AND b.open_capacity = true
      AND b.starts_at = ${dayOpenIso}::timestamptz
      AND ${OPEN_OCCUPYING_STATUS_SQL}), 0)::int`;
}

export type OpenDayWindow = {
  timezone: string;
  /** the venue's opening instant on the picked date — persisted as booking.starts_at (OC-03) */
  dayOpenUtc: Date;
  /** the venue's closing instant — persisted as booking.ends_at */
  dayCloseUtc: Date;
  openTime: string; // venue-local "HH:mm:ss", for the "Open 6:00 AM – 10:00 PM" line
  closeTime: string;
};

/** venue-local `HH:mm:ss` (Postgres time) → {hour, minute}. Windows are on-the-hour in practice (D-22 / A2);
 *  minutes are parsed anyway so a half-hour opening time can never silently truncate to the top of the hour. */
function parseWallClock(t: string): { hour: number; minute: number } {
  return { hour: parseInt(t.slice(0, 2), 10), minute: parseInt(t.slice(3, 5), 10) || 0 };
}

/**
 * Pure: venue-local calendar date + operating hours → the UTC opening/closing instants (OC-03).
 * `month` is 1-BASED (getAvailability's convention). Normalizes through the epoch exactly as
 * read-model.ts:120-121 does — TZDate.toISOString() renders the offset-local form, so the true UTC instant
 * comes from new Date(getTime()). Every instant is built with TZDate from the venue wall clock, never by
 * adding fixed milliseconds (the slots.ts DST rule).
 *
 * A close time <= the open time means the venue closes after midnight, so the closing instant rolls to the
 * NEXT calendar day (day + 1); Date math rolls month/year over for free.
 */
export function openDayWindow(args: {
  year: number;
  month: number;
  day: number;
  timezone: string;
  openTime: string;
  closeTime: string;
}): { dayOpenUtc: Date; dayCloseUtc: Date } {
  const m0 = args.month - 1; // 0-based month for TZDate (JS Date convention)
  const open = parseWallClock(args.openTime);
  const close = parseWallClock(args.closeTime);
  const rollsPastMidnight = close.hour * 60 + close.minute <= open.hour * 60 + open.minute;
  const openInstant = new TZDate(args.year, m0, args.day, open.hour, open.minute, 0, args.timezone);
  const closeInstant = new TZDate(
    args.year,
    m0,
    args.day + (rollsPastMidnight ? 1 : 0),
    close.hour,
    close.minute,
    0,
    args.timezone,
  );
  return {
    dayOpenUtc: new Date(openInstant.getTime()),
    dayCloseUtc: new Date(closeInstant.getTime()),
  };
}

/**
 * Read a listing's timezone + that weekday's operating hours and build the window. Returns null when the
 * listing is unknown or has NO hours for that weekday (the venue is closed → nothing is bookable, which the
 * callers render as the "Closed on {day}" empty state, never a crash).
 *
 * Hours: MIN(open_time) / MAX(close_time) across the weekday's rows — a split-shift day is ONE pass covering
 * the outer envelope (OC-02: a date is one pass, and its price does not scale with duration).
 */
export async function loadOpenDayWindow(
  dbConn: DbConn,
  listingId: string,
  dayLocal: { year: number; month: number; day: number },
): Promise<OpenDayWindow | null> {
  const listingRows = await dbConn
    .select({ timezone: listing.timezone })
    .from(listing)
    .where(eq(listing.id, listingId));
  if (listingRows.length === 0) return null;
  const timezone = listingRows[0].timezone;

  // The weekday is computed in the VENUE tz (never the server tz), exactly as the exclusive read model does.
  const dow = venueDayOfWeek(dayLocal.year, dayLocal.month - 1, dayLocal.day, timezone);
  const hoursRows = await dbConn
    .select({
      openTime: sql<string | null>`min(${operatingHours.openTime})`,
      closeTime: sql<string | null>`max(${operatingHours.closeTime})`,
    })
    .from(operatingHours)
    .where(and(eq(operatingHours.listingId, listingId), eq(operatingHours.dayOfWeek, dow)));

  const openTime = hoursRows[0]?.openTime ?? null;
  const closeTime = hoursRows[0]?.closeTime ?? null;
  if (openTime == null || closeTime == null) return null; // venue closed that weekday → no pass to sell

  const { dayOpenUtc, dayCloseUtc } = openDayWindow({ ...dayLocal, timezone, openTime, closeTime });
  return { timezone, dayOpenUtc, dayCloseUtc, openTime, closeTime };
}
