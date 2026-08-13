import "server-only";

// The timezone / DST boundary for availability (RESEARCH Pattern 4). Like src/lib/bookability.ts,
// this is a small, PURE, no-I/O module that owns one correctness concern so it can never be bypassed:
// turning a venue-local wall clock into UTC instants. Every slot instant in the system flows through
// slotsForWindow — the read model composes on top of it and the calendar renders from its output.
//
// Core rule (CLAUDE.md "never store naive timestamps"; SC#2 "always venue tz"): build each instant
// with TZDate from the venue-local wall clock — NEVER add fixed milliseconds across an hour/day
// boundary. Fixed-ms arithmetic silently breaks across DST transitions; TZDate is DST-correct for
// every IANA zone (Asia/Manila itself is DST-free, but the model stays region-capable for free).
//
// All times are stored/compared as UTC ISO strings here; conversion to venue-local display happens at
// the edges (the calendar) via `format(..., { in: tz(listing.timezone) })`.
//
// SERVER-ONLY (D-34 / GATE-05). This is an availability COMPUTATION module: it derives which instants
// exist and which are still bookable, and the client must never be able to re-derive that for itself
// (threat T-03-TAMPER-SLOT — the server is the sole authority on what is available). `import "server-only"`
// on line 1 makes Turbopack hard-FAIL `next build` if any client component's import graph reaches here.
// BOOKING_HORIZON_DAYS moved to ./horizon precisely so the two client components that need it are not
// caught by that guard; it is re-exported below so nothing else had to move.

import { TZDate } from "@date-fns/tz";
import { BOOKING_HORIZON_DAYS } from "./horizon";

export { BOOKING_HORIZON_DAYS };

export type Slot = { startUtc: string; endUtc: string };

/**
 * Enumerate on-the-hour, 60-minute slots for a venue-local date and a wall-clock [openHour, closeHour)
 * window. `month` is 0-based (JS Date convention). Each instant is built via TZDate so the mapping from
 * venue-local wall clock to a UTC instant is DST-correct — never fixed-ms arithmetic (D-22 on-the-hour
 * granularity; A2 no midnight crossing in v1). A degenerate window (close <= open) yields no slots.
 */
export function slotsForWindow(
  y: number,
  m: number,
  d: number,
  openHour: number,
  closeHour: number,
  tz: string,
): Slot[] {
  const slots: Slot[] = [];
  for (let h = openHour; h < closeHour; h++) {
    const start = new TZDate(y, m, d, h, 0, 0, tz); // venue-local wall clock → instant
    const end = new TZDate(y, m, d, h + 1, 0, 0, tz);
    // NB: TZDate.toISOString() renders the offset-local form (e.g. "…+08:00"). We want the true UTC
    // instant as a "…Z" string, so normalize through the epoch: new Date(getTime()).toISOString().
    slots.push({
      startUtc: new Date(start.getTime()).toISOString(),
      endUtc: new Date(end.getTime()).toISOString(),
    });
  }
  return slots;
}

/**
 * Venue-local day-of-week (0=Sun..6=Sat, matching operating_hours.dayOfWeek / JS Date.getDay) for a
 * venue-local calendar date. Computed in the VENUE tz — not the server tz — so operating-hours lookups
 * stay correct regardless of where the server runs. Noon avoids any midnight-boundary ambiguity.
 */
export function venueDayOfWeek(y: number, m: number, d: number, tz: string): number {
  return new TZDate(y, m, d, 12, 0, 0, tz).getDay();
}

/** True iff the slot starts strictly after `now` (D-26: no minimum lead time beyond start > now). */
export function slotStartsInFuture(startUtc: string, now: Date): boolean {
  return new Date(startUtc).getTime() > now.getTime();
}

/** True iff the slot start is within `horizonDays` from `now` (D-26 default 90 days). */
export function isWithinHorizon(
  startUtc: string,
  now: Date,
  horizonDays = BOOKING_HORIZON_DAYS,
): boolean {
  const limit = now.getTime() + horizonDays * 24 * 60 * 60 * 1000;
  return new Date(startUtc).getTime() <= limit;
}
