// The SINGLE source of clock-relative fixture windows for the test suite.
//
// WHY THIS MODULE EXISTS (DEF-IR9-01 — do NOT "simplify" any of this back to a calendar literal).
// `tests/booking/hold-expiry.test.ts` used to carry THREE independent calendar literals: an injected
// `NOW` (2026-07-15), a target `DAY` (Aug 3 2026), and the slot's UTC instants ("2026-08-02T22:00Z").
// They rotted on 2026-08-03 and left the suite red, because the two clocks in play are NOT the same clock:
//   - An injected `NOW` is a JS value and reaches getAvailability ONLY — it drives the past/horizon/
//     too_soon DISPLAY states and nothing else.
//   - createPendingHold / placeHold take NO clock. Their D-96 lead-time guard is a SQL expression
//     evaluated against POSTGRES's now() (units.ts documents this as deliberate: "never the JS clock"),
//     so it moves with real time whatever the test injects.
// So the moment real time passed Aug 3 2026 the guard began refusing the fixture window and the "just
// taken" case started asserting against "That start time is too soon to book." instead. A pinned literal
// is a time bomb here BY CONSTRUCTION — the JS clock can be frozen, the DB clock cannot.
//
// The fix, generalised here: pick the target day RELATIVE TO REAL NOW, then DERIVE the day parts and
// both UTC instants from that one value, so they can never disagree again. Instants are built with
// TZDate from the venue-local wall clock — the src/lib/availability/slots.ts idiom. NEVER hand-roll a
// "+8" offset: Manila is UTC+8 with no DST today, but a hardcoded offset is the same class of rot as a
// hardcoded date.
//
// This module was lifted out of hold-expiry.test.ts by quick task 260806-gwt, which swept the six
// Tier-1 sites that shared its failure mode. Helpers are not collected as test files
// (vitest `include: ["tests/**/*.test.ts"]`), so importing `expect` here is import-safe.

import { expect } from "vitest";
import { TZDate } from "@date-fns/tz";
import { BOOKING_HORIZON_DAYS } from "@/lib/availability/slots";
import { MIN_LEAD_INSTANT_MINUTES, MIN_LEAD_REQUEST_HOURS } from "@/lib/payments/config";

/** The launch-market venue timezone every fixture listing is seeded in. */
export const VENUE_TZ = "Asia/Manila";

export type LocalDate = { year: number; month: number; day: number }; // month is 1-BASED

/** An instant's VENUE-LOCAL calendar date (read-model.ts venueLocalDateParts idiom). */
export function venueDateOf(instant: Date, tz: string = VENUE_TZ): LocalDate {
  const z = new TZDate(instant.getTime(), tz);
  return { year: z.getFullYear(), month: z.getMonth() + 1, day: z.getDate() };
}

/** Venue-local `hour`:00 on a venue-local date → the TRUE UTC instant (slotsForWindow's exact idiom:
 *  TZDate for the DST-correct mapping, then normalize through the epoch so it renders as "…Z"). */
export function instantAt(d: LocalDate, hour: number, tz: string = VENUE_TZ): Date {
  return new Date(new TZDate(d.year, d.month - 1, d.day, hour, 0, 0, tz).getTime());
}

/** Venue-local day-of-week (slots.ts venueDayOfWeek idiom; noon avoids midnight-boundary ambiguity). */
export function venueDow(d: LocalDate, tz: string = VENUE_TZ): number {
  return new TZDate(d.year, d.month - 1, d.day, 12, 0, 0, tz).getDay();
}

/** `n` venue-local days later; the TZDate constructor rolls month/year over via Date math. */
export function plusDays(d: LocalDate, n: number, tz: string = VENUE_TZ): LocalDate {
  const z = new TZDate(d.year, d.month - 1, d.day + n, 12, 0, 0, tz);
  return { year: z.getFullYear(), month: z.getMonth() + 1, day: z.getDate() };
}

/** The margin a derived window must clear to satisfy BOTH D-96 lead-time guards. Derived from the
 *  exported CONSTANTS, never from copied numbers, so a policy tune moves this automatically. */
export const LEAD_CLEARANCE_MS = Math.max(
  MIN_LEAD_INSTANT_MINUTES * 60_000,
  MIN_LEAD_REQUEST_HOURS * 3_600_000,
);

export type VenueWindow = {
  day: LocalDate;
  hour: number;
  hours: number;
  tz: string;
  weekday: number;
  start: Date;
  end: Date;
  startUtc: string;
  endUtc: string;
};

/**
 * Derive a bookable venue-local window from REAL now.
 *
 * @param opts.hour       venue-local start hour (0-23)
 * @param opts.weekday    pin to a venue-local day-of-week (0=Sun..6=Sat) — ONLY when the caller seeds
 *                        operating_hours on that dayOfWeek. Omit otherwise: neither placeHold nor
 *                        createPendingHold consults operating_hours on the write path, so pinning a
 *                        weekday for a pure hold fixture is noise.
 * @param opts.minDaysOut floor on how far out the window lands (default 1). Clamped to >= 1.
 * @param opts.hours      window length in whole hours (default 1).
 */
export function venueWindow(opts: {
  hour: number;
  weekday?: number;
  minDaysOut?: number;
  hours?: number;
  tz?: string;
}): VenueWindow {
  const tz = opts.tz ?? VENUE_TZ;
  const hours = opts.hours ?? 1;
  const { hour, weekday } = opts;

  // (1) Start at today + max(1, minDaysOut) days. Starting at >= today+1 is what makes "today"
  // impossible — this is the original `|| 7` guarantee (D-GWT-03), stated instead of encoded: a run ON
  // the target weekday must never target today, whose early slot may already have passed.
  let d = plusDays(venueDateOf(new Date(), tz), Math.max(1, opts.minDaysOut ?? 1), tz);

  // (2) If a weekday is pinned, walk forward to it (at most 6 days).
  if (weekday != null) {
    for (let i = 0; i < 7 && venueDow(d, tz) !== weekday; i++) d = plusDays(d, 1, tz);
    if (venueDow(d, tz) !== weekday) {
      throw new Error(`venueWindow: could not reach weekday ${weekday} in ${tz}`);
    }
  }

  // (3) Roll forward until the start instant clears BOTH lead guards. Keeps the weekday pinned when one
  // was asked for. Bounded and LOUD: a runaway here must throw, never return a wrong window silently.
  const step = weekday != null ? 7 : 1;
  for (let i = 0; instantAt(d, hour, tz).getTime() <= Date.now() + LEAD_CLEARANCE_MS; i++) {
    if (i >= 8) {
      throw new Error(
        `venueWindow: roll-forward exceeded 8 iterations (hour=${hour}, weekday=${String(weekday)}, ` +
          `tz=${tz}, landed on ${JSON.stringify(d)}) — refusing to return a too-soon window`,
      );
    }
    d = plusDays(d, step, tz);
  }

  // (4) Build the instants from that ONE day value — one source, consistent values.
  const start = instantAt(d, hour, tz);
  const end = instantAt(d, hour + hours, tz);
  return {
    day: d,
    hour,
    hours,
    tz,
    weekday: venueDow(d, tz),
    start,
    end,
    startUtc: start.toISOString(),
    endUtc: end.toISOString(),
  };
}

/**
 * FIXTURE SELF-CHECK — assert the derivation, don't assume it (the other half of the DEF-IR9-01 fix).
 * A derived fixture that silently derives the WRONG day is no better than a rotted literal, so the
 * properties every hold fixture depends on are checked in ONE place. Call it from a `beforeAll` so a
 * break is a loud setup failure attributed to the offending file, not a confusing assertion about
 * "just taken" three cases later (D-GWT-01).
 *
 * It asserts against the imported CONSTANTS, never a literal, so a policy tune moves the check with it.
 */
export function assertBookableWindow(
  w: VenueWindow,
  opts?: { weekday?: number; withinHorizon?: boolean },
): void {
  // Only when the caller seeds operating hours on that dayOfWeek ONLY.
  if (opts?.weekday != null) expect(w.weekday).toBe(opts.weekday);
  // Clears BOTH D-96 lead-time guards — which are SQL now(), not any injected JS clock.
  expect(w.start.getTime()).toBeGreaterThan(Date.now() + LEAD_CLEARANCE_MS);
  // The D-26 display horizon (read model only; the write path has NO horizon check — verified in units.ts).
  if (opts?.withinHorizon !== false) {
    expect(w.start.getTime()).toBeLessThan(Date.now() + BOOKING_HORIZON_DAYS * 86_400_000);
  }
  // On-the-hour slots (D-22).
  expect(w.end.getTime() - w.start.getTime()).toBe(w.hours * 3_600_000);
}
