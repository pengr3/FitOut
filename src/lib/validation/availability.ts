// Shared availability validation schemas (Zod 4). The SAME schema validates in the RHF host editor
// (Plan 04) and re-validates at the top of every availability server action (Plan 03) — the client is
// NEVER trusted for times/units (CLAUDE.md "never trust the client"; mirrors listing.ts/auth.ts).
//
// TWO schemas:
//   - weeklyHoursSchema : recurring weekly operating hours (AVAIL-01, D-25). Multiple open-close
//                         windows per weekday; close must be after open; windows on ONE weekday may not
//                         overlap ('[)' half-open — touching endpoints like 09:00-12:00 & 12:00-15:00
//                         are fine, matching the booking_no_overlap EXCLUDE constraint's boundary).
//                         Open/close are ON-THE-HOUR (:00) — server-enforced (Security V5, defense in
//                         depth: the UI only offers on-the-hour options, so this hardens direct requests).
//   - blockSchema       : close-only availability blocks (AVAIL-02, D-24). A whole day OR a partial
//                         time range, targeting a single unit OR the whole listing (unit null).
//
// TIME REGEX is :ss-TOLERANT: Postgres/Drizzle `time` round-trips as "HH:mm:ss" (e.g. "06:00:00"), so
// a DB-read window MUST re-validate on an edit re-save. The on-the-hour refine is applied to the
// NORMALIZED "HH:mm" prefix so an off-hour minute can't sneak past via a :ss value ("06:15:00" →
// "06:15" → rejected). This closes the 03-04 edit round-trip seam (the plan BLOCKER); 03-04 also
// normalizes DB reads via .slice(0,5) before feeding the form.

import { z } from "zod";

/**
 * CR-03 layer 2 — the server-side refusal when a host tries to change the hours of a weekday that still
 * carries upcoming or active drop-in passes (`src/lib/listing/hours-lock.ts`).
 *
 * The hours-level twin of `MODE_LOCKED_MESSAGE` (src/lib/validation/listing.ts), and it lives in the
 * validation module for the very same reason: ONE copy of the sentence, importable by the action, by the
 * host-facing advisory, by a test and by any future surface — so the gate and the copy can never drift.
 *
 * O3 grammar, like every refusal this phase ships: a statement plus an imperative next step, no exclamation,
 * never rendered red. The caller EXTENDS it with the concrete date the lock lifts and the way out (09-UI-SPEC
 * O7 — a locked control that says only "you can't" is a dead end), which is why the constant itself stops at
 * the WHY: the WHEN is per-listing and cannot be baked into a shared literal.
 */
export const HOURS_LOCKED_MESSAGE =
  "You can't change these hours while drop-in passes are still to come for that day.";

// 24-hour HH:mm, TOLERANT of an optional :ss so Postgres/Drizzle `time` round-trips ("HH:mm:ss")
// re-validate (see RESEARCH line 472 / the 03-04 edit round-trip).
const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Use 24-hour HH:mm.");

// Operating-hours open/close must start ON THE HOUR (Security V5, defense in depth). Apply the check to
// the NORMALIZED "HH:mm" prefix so a :ss value can't sneak an off-hour minute past it
// (e.g. "06:15:00" → "06:15" → reject; "06:00:00" → "06:00" → pass).
const hourOnly = hhmm.refine((t) => t.slice(0, 5).endsWith(":00"), {
  message: "Hours must start on the hour.",
});

/** A single recurring weekly window: on-the-hour open/close, close strictly after open. */
export const hoursWindowSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6), // 0=Sun..6=Sat (JS Date.getDay / operating_hours.dayOfWeek)
    openTime: hourOnly,
    closeTime: hourOnly,
  })
  .refine((w) => w.closeTime > w.openTime, {
    message: "Close time must be after open time.",
    path: ["closeTime"],
  });

/**
 * Full weekly hours (a "replace the set" full-state save — D-25 multiple windows/day). Windows on the
 * same weekday may not overlap; touching endpoints are OK ('[)' half-open, matching the constraint).
 */
export const weeklyHoursSchema = z
  .object({
    windows: z.array(hoursWindowSchema),
  })
  .superRefine((val, ctx) => {
    // Group windows by weekday, then check each day's sorted windows for a '[)' overlap.
    const byDay = new Map<number, { o: string; c: string }[]>();
    for (const w of val.windows) {
      const list = byDay.get(w.dayOfWeek) ?? [];
      list.push({ o: w.openTime, c: w.closeTime });
      byDay.set(w.dayOfWeek, list);
    }
    for (const list of byDay.values()) {
      list.sort((a, b) => a.o.localeCompare(b.o));
      for (let i = 1; i < list.length; i++) {
        // '[)' semantics: a later window starting BEFORE (not at) the prior close overlaps.
        if (list[i].o < list[i - 1].c) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "These hours overlap. Adjust them so each block stands on its own.",
            path: ["windows"],
          });
        }
      }
    }
  });

/**
 * A close-only block (AVAIL-02, D-24). Whole day (no times) OR a partial [start,end) range; targets a
 * single unit (integer >= 1) OR the whole listing (unit null). Block times are NOT required on-the-hour
 * (blocks may be partial ranges), but must be valid 24h strings. Reason is optional free text.
 */
export const blockSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date."),
    wholeDay: z.boolean(),
    startTime: hhmm.optional(), // blocks may be partial ranges — NOT required on-the-hour
    endTime: hhmm.optional(),
    unit: z.number().int().min(1).nullable(), // null = whole listing (D-24)
    reason: z.string().max(200).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.wholeDay) {
      if (!val.startTime || !val.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pick a start and end time to block.",
          path: ["startTime"],
        });
      } else if (val.endTime <= val.startTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pick an end time that's after the start time.",
          path: ["endTime"],
        });
      }
    }
  });

export type HoursWindowInput = z.infer<typeof hoursWindowSchema>;
export type WeeklyHoursInput = z.infer<typeof weeklyHoursSchema>;
export type BlockInput = z.infer<typeof blockSchema>;
