// Open-capacity (drop-in pass) primitives — the ONE place the phase's shared facts live (D-123, OC-02/OC-03/
// OC-11/OC-13). This module owns exactly five things:
//   (1) THE occupying predicate for open-capacity rows and the drift-free heads SUM built on it,
//   (2) the OC-03 "a date is one pass" day window (venue-local date → the UTC opening/closing instants),
//   (3) the CR-03 counter identity — the venue-local CALENDAR DAY bounds (venueDayBoundsUtc) that (1) counts
//       over and that the admissions claim's advisory lock is keyed on. (2) and (3) are DIFFERENT FACTS about
//       the same date and this module is where they are joined: (2) is what a pass COVERS, (3) is what a pass
//       COUNTS AGAINST. Only (2) moves when a host edits operating hours; (3) is fixed by the calendar.
//   (4) THE HOST-BLOCK predicate for a drop-in date (CR-02) — the unit scope a whole-listing/sentinel block
//       occupies, and the EXISTS fragment the day panel, the month grid and the claim all evaluate. A block
//       is not occupancy: nobody bought those admissions, so it is a SEPARATE fact from (1), which is why it
//       zeroes the date rather than consuming heads.
//   (5) the OC-11 scarcity threshold + the derived display state, and the user-facing refusal literals.
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

/** Server-side refusal for a date the HOST has closed with an availability block (CR-02). Same O3 grammar as
 *  the two literals above (statement + imperative next step, no exclamation, never rendered red), and
 *  deliberately NOT the sold-out line: nothing was sold, so "just sold out" would be a lie that also invites
 *  the booker to retry the same date. Returned as a bare `{ error }` with NO `soldOut` flag — a closed day is
 *  not a race loss, so the CTA must not offer the refresh-and-retry affordance OC-13 gives a real race. */
export const BLOCKED_DATE_MESSAGE = "The host has closed this day — pick another date.";

/**
 * WHICH `availability_block` rows can zero a DROP-IN date.
 *
 * `availability_block.unit` is NULL for a whole-listing block and an integer ≥ 1 for one unit (D-24). An
 * open-capacity listing is publish-enforced `unitCount = 1` and every open booking row uses the SENTINEL
 * `unit = 1` (units.ts), so the only two scopes that can exist on such a listing — and therefore the only two
 * that can withdraw the date — are the whole listing and that sentinel. A block on unit 7 of a one-unit
 * listing is a phantom and is deliberately ignored here, exactly as the exclusive read model's `inRange`
 * clamp ignores it.
 *
 * Requires the availability_block table to be aliased `ab`.
 */
export const OPEN_BLOCK_UNIT_SCOPE_SQL = sql`(ab.unit IS NULL OR ab.unit = 1)`;

/**
 * Is this drop-in date closed by a host block? An `EXISTS` over the scope above, using the SAME half-open
 * `tstzrange(..., '[)')` overlap form the exclusive read model uses (Pitfall 5 / T-03-RANGE-MISMATCH), so a
 * block ending at midnight cannot bleed into the next date.
 *
 * ⚠️ DO NOT COPY THIS PREDICATE. `getOpenDay`, the month grid (via OPEN_BLOCK_UNIT_SCOPE_SQL) and the
 * admissions claim (createOpenCapacityHold) ALL decide "is this date blocked?" from here. Two copies drifting
 * is the same class as two copies of the occupying predicate: the calendar advertises a date the claim then
 * refuses, or hides one it would have granted — and in this direction it is worse, because the host is
 * looking at their own block in the "Blocked dates" list while passes keep selling behind it.
 *
 * ── THE RANGE DECISION, stated once and applied at all three call sites. ────────────────────────────────
 * The bounds handed in are the VENUE-LOCAL CALENDAR DAY `[dayStartUtc, dayEndUtc)` (venueDayBoundsUtc), NOT
 * the pass window `[dayOpenUtc, dayCloseUtc)`. Three reasons, in order of weight:
 *   - OC-02 makes a date ONE pass. There is no sub-day inventory to withhold, so a host blocking any part of
 *     a date is saying "not that date", and any overlap must zero it.
 *   - The month grid cannot cheaply know each date's operating hours, so a pass-window rule would make the
 *     grid and the day panel disagree — the NT-02 class of bug, deliberately not reintroduced here.
 *   - The reviewer's suggested pass-window form is therefore the REJECTED ALTERNATIVE, and it is rejected for
 *     DRIFT, not for difficulty.
 *
 * The accepted consequence, recorded so nobody "fixes" it later: a partial block (say 10:00–12:00) closes the
 * WHOLE date for a drop-in listing. The alternative — ignoring blocks that do not cover the whole window —
 * would let a host block 06:00–21:59 and still sell passes for that day, which is strictly worse.
 */
export function openBlockedSql(listingId: string, dayStartUtcIso: string, dayEndUtcIso: string) {
  return sql`EXISTS (SELECT 1 FROM availability_block ab
    WHERE ab.listing_id = ${listingId}
      AND ${OPEN_BLOCK_UNIT_SCOPE_SQL}
      AND tstzrange(ab.starts_at, ab.ends_at, '[)')
          && tstzrange(${dayStartUtcIso}::timestamptz, ${dayEndUtcIso}::timestamptz, '[)'))`;
}

/**
 * THE COUNTER'S IDENTITY for a date (CR-03): the venue-local calendar day `[dayStartUtc, dayEndUtc)` as UTC
 * instants, plus the `YYYY-MM-DD` key the admissions claim's advisory lock is taken on.
 *
 * WHY THIS AND NOT THE OPENING INSTANT. `booking.starts_at` on an open row is the venue's opening instant ON
 * THE PICKED DATE, so its venue-local calendar date IS that date by construction. Venue-local days therefore
 * partition every open row into DISJOINT sets, and a host editing operating hours moves a pass WITHIN its own
 * day instead of OUT of the counted set. Before this existed, the counter's identity was that re-derived
 * opening instant — the equality form of the predicate below, plus the same value inside the lock key — and
 * that was the CR-03 OVERBOOK PATH: shifting Monday's opening 06:00 → 07:00 emptied the counted set, split
 * the lock into two disjoint domains for one date and made a SECOND FULL CAP sellable, with no constraint
 * violation and no error. What a pass COVERS may move; WHICH passes COUNT may not. Layer 2 — refusing the
 * hours edit itself while live passes exist — is 09-19; this is layer 1 and it stands alone.
 *
 * Both instants are built with `TZDate` at the venue wall clock and normalised through the epoch, exactly as
 * `openDayWindow` and the exclusive read model's day bounds do — NEVER by adding fixed milliseconds (the
 * slots.ts DST rule), because a DST day is not 24h long.
 *
 * `dateKey` is composed from the NUMERIC year/month/day arguments with zero-padding, never by formatting a
 * Date: a formatted instant can be shifted a day by a timezone conversion, and a lock key that disagrees with
 * the range it protects would serialise two claimers into different domains — the very failure being fixed.
 * Callers hand this function an already-canonicalised calendar date (`parsePickedDate` round-trip-guards
 * impossible days such as 2026-02-31 before it reaches here), so the key and the bounds cannot describe
 * different days.
 *
 * `month` is 1-BASED (getAvailability's convention).
 */
export function venueDayBoundsUtc(args: {
  year: number;
  month: number;
  day: number;
  timezone: string;
}): { dayStartUtc: Date; dayEndUtc: Date; dateKey: string } {
  const m0 = args.month - 1; // 0-based month for TZDate (JS Date convention)
  const startInstant = new TZDate(args.year, m0, args.day, 0, 0, 0, args.timezone);
  // day + 1 rolls month/year over via Date math; the half-open upper bound is the NEXT day's midnight.
  const endInstant = new TZDate(args.year, m0, args.day + 1, 0, 0, 0, args.timezone);
  return {
    dayStartUtc: new Date(startInstant.getTime()),
    dayEndUtc: new Date(endInstant.getTime()),
    dateKey: `${args.year}-${String(args.month).padStart(2, "0")}-${String(args.day).padStart(2, "0")}`,
  };
}

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

/** `SUM(declared_pax)` over the occupying set for one (listing, VENUE-LOCAL DAY). Drift-free by construction —
 *  there is NO stored counter (Pitfall 3): a cancelled row and a lapsed hold both leave the set automatically,
 *  which is why OC-15's "cancelling frees the seat" needs no release code at all.
 *
 *  The range is HALF-OPEN `[dayStartUtcIso, dayEndUtcIso)` — the CLAUDE.md `'[)'` rule, so a venue-local day
 *  and the next one can never both claim the midnight instant. It replaced an EQUALITY against the venue's
 *  re-derived opening instant; see venueDayBoundsUtc for why that equality was the CR-03 overbook path.
 *
 *  ⚠️ DO NOT COPY THIS RANGE either. Pass the bounds from `venueDayBoundsUtc` (they ride on OpenDayWindow) —
 *  a second, hand-rolled day range is the same T-03-RANGE-MISMATCH class as a second status predicate. */
export function openTakenSql(listingId: string, dayStartUtcIso: string, dayEndUtcIso: string) {
  return sql`COALESCE((SELECT SUM(b.declared_pax) FROM booking b
    WHERE b.listing_id = ${listingId}
      AND b.open_capacity = true
      AND b.starts_at >= ${dayStartUtcIso}::timestamptz
      AND b.starts_at < ${dayEndUtcIso}::timestamptz
      AND ${OPEN_OCCUPYING_STATUS_SQL}), 0)::int`;
}

/**
 * One picked date, in the TWO senses a drop-in pass needs — and they are not the same fact.
 *
 * WHAT THE PASS COVERS (`dayOpenUtc` / `dayCloseUtc` / `openTime` / `closeTime`): derived from the listing's
 * CURRENT operating hours, persisted as `booking.starts_at` / `ends_at`, and rendered as "Open 6:00 AM –
 * 10:00 PM". A host may change these at any time and a future pass's window legitimately moves with them.
 *
 * WHAT THE PASS COUNTS AGAINST (`dayStartUtc` / `dayEndUtc` / `dateKey`): the venue-local calendar day. Fixed
 * by the calendar, never by host config, never written to a column. This is the counter's identity and the
 * admissions lock's key (CR-03). Keeping the two apart IS the fix — see venueDayBoundsUtc.
 */
export type OpenDayWindow = {
  timezone: string;
  /** the venue's opening instant on the picked date — persisted as booking.starts_at (OC-03) */
  dayOpenUtc: Date;
  /** the venue's closing instant — persisted as booking.ends_at */
  dayCloseUtc: Date;
  openTime: string; // venue-local "HH:mm:ss", for the "Open 6:00 AM – 10:00 PM" line
  closeTime: string;
  /** venue-local midnight — the INCLUSIVE lower bound of the counted set (CR-03). Never persisted. */
  dayStartUtc: Date;
  /** the NEXT venue-local midnight — the EXCLUSIVE upper bound. Never persisted. */
  dayEndUtc: Date;
  /** venue-local `YYYY-MM-DD` — the admissions lock's key. Never persisted. */
  dateKey: string;
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
  // The counter's identity for the SAME date, from the SAME dayLocal + timezone — one source, so the window
  // a pass covers and the day it counts against can never be derived from different inputs (CR-03).
  const { dayStartUtc, dayEndUtc, dateKey } = venueDayBoundsUtc({ ...dayLocal, timezone });
  return { timezone, dayOpenUtc, dayCloseUtc, openTime, closeTime, dayStartUtc, dayEndUtc, dateKey };
}
