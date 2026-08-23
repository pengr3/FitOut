// The week-at-a-glance strip's derivation (HFLOW-04 · D-152, D-153). ONE pure, directive-free function
// that returns, for each of seven weekdays, the segments to DRAW and the sentence to ANNOUNCE.
//
// Directive-free on purpose — this module carries no rendering-environment pragma of either kind, exactly
// as `block-reason.ts` next door — so the client weekly-hours editor can import it AND a node-environment
// unit test can drive it without a DOM. No database import. No clock read.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY ONE FUNCTION RETURNS BOTH HALVES, AND WHY THAT IS THE WHOLE POINT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-153 makes the bars decoration (the seven-column grid computes `aria-hidden`) and the per-day sentence
// the meaning. A component that DREW from one derivation and ANNOUNCED from another would be one refactor
// away from showing a sighted host one week and reading a screen-reader host a different one — and nothing
// in the product would report it, because both halves would still look individually correct. So `segments`
// and `sentence` come out of the SAME call, on the same entry, and the test asserts their agreement
// generically over its whole case table (`tests/availability/week-strip.test.ts`).
//
// The same argument `policy-disclosure.ts:50-53` makes for being a named pure module rather than an inline
// composition applies here: an inline derivation inside a client component is reachable only through a
// rendered DOM, so the seven-day table that actually pins this contract would have to be a render test.
// Pulled out, it is a plain function and the table is a plain table.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE STRIP DRAWS; IT DOES NOT JUDGE (D-152, GATE-NOREG 6)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// There is NO overlap detection here and NO schema. `weekly-hours-editor.tsx:100-120` owns the client-side
// overlap math (it makes an overlap impossible to express in the UI) and `weeklyHoursSchema`
// (`src/lib/validation/availability.ts:68`) owns validation on the way to the database. A second check in
// this file would be a third authority on the same question and the first place the three could disagree.
// This function's only job is to keep drawing a truthful picture of whatever the form currently holds.
//
// For the same reason it TOLERATES a half-typed window instead of throwing: the input is live, unsaved RHF
// state, and a form mid-edit legitimately emits an undefined row or a window with one time missing. A
// preview that crashed the editor it previews would be a worse failure than a preview that omits a bar for
// the two seconds it takes to pick a close time. Skipping is not a verdict on validity — the form still
// shows its own error, and the shared schema still refuses the save.
//
// It also reads no clock, because a weekly PATTERN has no "now". Date-specific blocks and closures are NOT
// overlaid (D-152): those belong to `BlocksEditor`, and folding them in here would quietly conflate "my
// weekly pattern" with "this specific week".
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THIS MODULE OWNS THE LABEL MAP AND THE WEEKDAY NAMES
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `HOUR_OPTIONS` and the weekday names are exported from here so the editor's selects and the strip's
// sentences read from ONE source: D-153 requires the announced string to match what the host picked glyph
// for glyph, which is only true by construction if the select's label and the sentence's label are the same
// string. `weekly-hours-editor.tsx:45-62` still declares its own copies today; re-pointing it at these is a
// later plan's edit, and until then the values are byte-identical by inspection, not by import.
//
// Days are `0=Sun … 6=Sat` — the `operating_hours.day_of_week` convention that `hours-lock.ts:32-42`
// records as agreed by three independent authorities (the column, `venueDayOfWeek`, and Postgres's own
// day-of-week field). Do NOT "correct" it to the ISO 1=Mon..7=Sun variant: that would shift every column
// of the strip by one day against the editor rows directly above it.

import type { WeeklyHoursInput } from "@/lib/validation/availability";

/**
 * A single recurring weekly window, as the editor holds it and as `hoursWindowSchema` validates it.
 * Sourced from the shared schema's own inferred type (type-only import — no runtime coupling, so this
 * module still pulls in nothing at all) so the preview and the save can never disagree about the shape.
 */
export type WeeklyHoursWindow = WeeklyHoursInput["windows"][number];

/** One drawable run of open hours: `[openHour, closeHour)`, integers on the 0..23 clock. */
export type WeekStripSegment = {
  openHour: number;
  closeHour: number;
};

/** One weekday's row of the strip: what to draw, and the one sentence that means the same thing. */
export type WeekStripDay = {
  /** `0=Sun … 6=Sat`. */
  dayOfWeek: number;
  /** The short column caption (`Sun` … `Sat`) — rendered `aria-hidden` beneath the track. */
  dayLabel: string;
  /** Sorted by `openHour`, so the drawn order and the announced order agree. Empty ⇒ a closed day. */
  segments: WeekStripSegment[];
  /** The accessible equivalent — `Monday: 6:00 AM to 10:00 PM` / `Sunday: closed`. */
  sentence: string;
};

/**
 * What the live form actually emits mid-edit: a sparse array whose rows may be undefined and whose windows
 * may be missing a time. Accepting this shape here is what lets the editor pass `liveWindows` straight in.
 */
export type WeekStripInput = ReadonlyArray<Partial<WeeklyHoursWindow> | undefined | null>;

/** Full weekday names, Sunday-first — the subject of each announced sentence. */
export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Short weekday captions, Sunday-first — the strip's column labels. */
export const WEEKDAY_SHORT_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

/**
 * On-the-hour "HH:mm" options (00:00..23:00) with their display labels — the SAME map the editor's selects
 * render, and therefore the same strings the sentences name. The values line up with the shared schema's
 * on-the-hour rule.
 *
 * ⚠ It runs to the LAST hour of the day only, so no window can close at midnight and the tallest possible
 * bar is one hour short of a full column. That is the editor's shipped behaviour, not a rounding here.
 */
export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const value = `${String(h).padStart(2, "0")}:00`;
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { value, label: `${hour12}:00 ${period}` };
});

/** The word a day with no windows ends on. One literal, so the copy and its test cannot drift. */
export const CLOSED_WORD = "closed";

/**
 * An hour on the 0..23 clock → its display label, from `HOUR_OPTIONS` and from nowhere else.
 * Returns null for anything outside the map's domain, which is also the strip's drawable domain.
 */
export function hourLabel(hour: number): string | null {
  return HOUR_OPTIONS[hour]?.label ?? null;
}

/**
 * "HH:mm" (or "HH:mm:ss") → integer hour 0..23. NaN for anything else — the caller skips those.
 *
 * The two-digit prefix is REQUIRED, which the editor's own bare `parseInt(t.slice(0, 2))` does not check:
 * a one-character `"9"` mid-keystroke parses as nine o'clock there, and the strip would draw a bar for a
 * string the shared schema's regex (`^([01]\d|2[0-3]):[0-5]\d…`) would refuse. That is not a second
 * validation — nothing here judges the value or emits a message — it is refusing to PARSE a fragment into
 * an hour the host has not finished typing.
 */
function toHour(time: string): number {
  return /^\d{2}/.test(time) ? parseInt(time.slice(0, 2), 10) : NaN;
}

/**
 * An hour is usable only if it is an integer inside the label map's domain. A window carrying anything
 * else has no label to announce and no position to draw, so it is skipped exactly like a half-typed one.
 */
function isDrawableHour(hour: number): boolean {
  return Number.isInteger(hour) && hour >= 0 && hour < HOUR_OPTIONS.length;
}

/**
 * Join the day's ranges into the copy contract's list: one range stands alone, and the last of several is
 * preceded by "and" (`6:00 AM to 9:00 AM, and 5:00 PM to 10:00 PM`).
 */
function joinRanges(ranges: string[]): string {
  if (ranges.length === 1) return ranges[0];
  return `${ranges.slice(0, -1).join(", ")}, and ${ranges[ranges.length - 1]}`;
}

/**
 * The week strip's ONE derivation: live weekly windows → seven days of bars-and-sentence.
 *
 * Returns EXACTLY seven entries for every input, including the empty one — a closed day is a row with zero
 * segments and a sentence ending in the closed word, never a missing row. Order is Sunday-first.
 *
 * Windows that touch at an endpoint (09:00–12:00 and 12:00–15:00) stay TWO segments. They will visually
 * merge into one bar, and that is correct: the space IS open continuously across the boundary, which is
 * exactly what the `'[)'` half-open convention the schema and the exclusion constraint share means. Do not
 * insert a forced gap and do not coalesce them — the sentence must name what the host actually typed.
 */
export function deriveWeekStrip(windows: WeekStripInput): WeekStripDay[] {
  const byDay: WeekStripSegment[][] = WEEKDAY_NAMES.map(() => []);

  for (const window of windows ?? []) {
    // A live form emits undefined rows and half-typed windows. Skip, never throw.
    if (!window) continue;
    const { dayOfWeek, openTime, closeTime } = window;
    if (!Number.isInteger(dayOfWeek) || (dayOfWeek as number) < 0 || (dayOfWeek as number) > 6) continue;
    if (typeof openTime !== "string" || typeof closeTime !== "string") continue;

    const openHour = toHour(openTime);
    const closeHour = toHour(closeTime);
    if (!isDrawableHour(openHour) || !isDrawableHour(closeHour)) continue;
    // A run with no height cannot be drawn and cannot be named as a range. This is a drawability guard,
    // not a validity verdict — the form owns that message and the shared schema owns the refusal.
    if (closeHour <= openHour) continue;

    byDay[dayOfWeek as number].push({ openHour, closeHour });
  }

  return WEEKDAY_NAMES.map((name, dayOfWeek) => {
    const segments = byDay[dayOfWeek].sort((a, b) => a.openHour - b.openHour);
    const ranges = segments.map((s) => `${hourLabel(s.openHour)} to ${hourLabel(s.closeHour)}`);
    return {
      dayOfWeek,
      dayLabel: WEEKDAY_SHORT_NAMES[dayOfWeek],
      segments,
      sentence: ranges.length === 0 ? `${name}: ${CLOSED_WORD}` : `${name}: ${joinRanges(ranges)}`,
    };
  });
}
