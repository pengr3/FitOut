// AVAIL-01/02 — the shared availability Zod contract (weeklyHoursSchema + blockSchema). The SAME
// schema validates in the RHF host editor (Plan 04) and re-validates in the server actions (Plan 03,
// this wave); the client is NEVER trusted for times/units (CLAUDE.md). Structure mirrors
// tests/validation/listing-schema.test.ts (pure safeParse-per-case).
//
// This is a PURE validation test (no DB) — it exercises: close > open, no same-day overlap (with the
// '[)' touching-endpoints-OK boundary), on-the-hour enforcement (Security V5 defense-in-depth), the
// :ss-tolerant regex + normalized-prefix on-the-hour refine (the 03-04 DB "HH:mm:ss" round-trip seam,
// the BLOCKER this plan closes), and the block partial-range rules.

import { describe, it, expect } from "vitest";
import {
  weeklyHoursSchema,
  hoursWindowSchema,
  blockSchema,
} from "@/lib/validation/availability";

/** True iff any Zod issue carries the given message (works through nested array/superRefine issues). */
function hasMessage(result: { success: boolean; error?: { issues: { message: string }[] } }, msg: string): boolean {
  return !result.success && !!result.error?.issues.some((i) => i.message === msg);
}

describe("weeklyHoursSchema — windows (AVAIL-01, D-25)", () => {
  it("accepts valid on-the-hour windows", () => {
    const res = weeklyHoursSchema.safeParse({
      windows: [
        { dayOfWeek: 1, openTime: "06:00", closeTime: "10:00" },
        { dayOfWeek: 2, openTime: "09:00", closeTime: "17:00" },
      ],
    });
    expect(res.success).toBe(true);
  });

  it("accepts an empty week (no windows = closed every day)", () => {
    expect(weeklyHoursSchema.safeParse({ windows: [] }).success).toBe(true);
  });

  it("rejects closeTime <= openTime with the exact UI-SPEC copy", () => {
    const equal = weeklyHoursSchema.safeParse({
      windows: [{ dayOfWeek: 1, openTime: "10:00", closeTime: "10:00" }],
    });
    expect(equal.success).toBe(false);
    expect(hasMessage(equal, "Close time must be after open time.")).toBe(true);

    const before = weeklyHoursSchema.safeParse({
      windows: [{ dayOfWeek: 1, openTime: "12:00", closeTime: "09:00" }],
    });
    expect(before.success).toBe(false);
    expect(hasMessage(before, "Close time must be after open time.")).toBe(true);
  });

  it("rejects two overlapping windows on the SAME weekday with the exact overlap copy", () => {
    const res = weeklyHoursSchema.safeParse({
      windows: [
        { dayOfWeek: 1, openTime: "09:00", closeTime: "13:00" },
        { dayOfWeek: 1, openTime: "12:00", closeTime: "15:00" },
      ],
    });
    expect(res.success).toBe(false);
    expect(hasMessage(res, "These hours overlap. Adjust them so each block stands on its own.")).toBe(true);
  });

  it("ACCEPTS back-to-back windows on one day (09:00-12:00 & 12:00-15:00 — touching endpoints OK, '[)')", () => {
    const res = weeklyHoursSchema.safeParse({
      windows: [
        { dayOfWeek: 1, openTime: "09:00", closeTime: "12:00" },
        { dayOfWeek: 1, openTime: "12:00", closeTime: "15:00" },
      ],
    });
    expect(res.success).toBe(true);
  });

  it("allows same open/close times on DIFFERENT weekdays (overlap is per-day)", () => {
    const res = weeklyHoursSchema.safeParse({
      windows: [
        { dayOfWeek: 1, openTime: "09:00", closeTime: "12:00" },
        { dayOfWeek: 2, openTime: "09:00", closeTime: "12:00" },
      ],
    });
    expect(res.success).toBe(true);
  });

  it("ON-THE-HOUR: rejects an off-the-hour openTime '06:15' with the exact copy (Security V5)", () => {
    const res = weeklyHoursSchema.safeParse({
      windows: [{ dayOfWeek: 1, openTime: "06:15", closeTime: "10:00" }],
    });
    expect(res.success).toBe(false);
    expect(hasMessage(res, "Hours must start on the hour.")).toBe(true);
  });

  it("rejects a dayOfWeek outside 0..6", () => {
    expect(
      weeklyHoursSchema.safeParse({
        windows: [{ dayOfWeek: 7, openTime: "06:00", closeTime: "10:00" }],
      }).success,
    ).toBe(false);
  });
});

describe(":ss ROUND-TRIP regression (the 03-04 edit round-trip seam / BLOCKER)", () => {
  const dbShaped = { dayOfWeek: 1, openTime: "06:00:00", closeTime: "10:00:00" } as const;

  it("validates a DB-shaped 'HH:mm:ss' window AS-IS (the :ss-tolerant regex + normalized on-the-hour refine accept it)", () => {
    expect(hoursWindowSchema.safeParse(dbShaped).success).toBe(true);
    expect(weeklyHoursSchema.safeParse({ windows: [dbShaped] }).success).toBe(true);
  });

  it("validates the SAME window normalized via .slice(0,5) — the untouched-window edit re-save never false-rejects", () => {
    const normalized = {
      dayOfWeek: 1,
      openTime: "06:00:00".slice(0, 5),
      closeTime: "10:00:00".slice(0, 5),
    };
    expect(weeklyHoursSchema.safeParse({ windows: [normalized] }).success).toBe(true);
  });

  it("STILL rejects an off-hour 'HH:mm:ss' value ('06:15:00' → normalized prefix '06:15' is not on-the-hour)", () => {
    const res = weeklyHoursSchema.safeParse({
      windows: [{ dayOfWeek: 1, openTime: "06:15:00", closeTime: "10:00:00" }],
    });
    expect(res.success).toBe(false);
    expect(hasMessage(res, "Hours must start on the hour.")).toBe(true);
  });

  it("rejects a malformed time string that is neither HH:mm nor HH:mm:ss", () => {
    expect(
      hoursWindowSchema.safeParse({ dayOfWeek: 1, openTime: "6am", closeTime: "10:00" }).success,
    ).toBe(false);
  });
});

describe("blockSchema — close-only blocks (AVAIL-02, D-24)", () => {
  it("accepts a whole-day block with no times (unit null = whole listing)", () => {
    const res = blockSchema.safeParse({
      date: "2026-08-03",
      wholeDay: true,
      unit: null,
    });
    expect(res.success).toBe(true);
  });

  it("accepts a partial-range block with start < end", () => {
    const res = blockSchema.safeParse({
      date: "2026-08-03",
      wholeDay: false,
      startTime: "10:00",
      endTime: "12:00",
      unit: 3,
    });
    expect(res.success).toBe(true);
  });

  it("rejects a partial-range block with endTime <= startTime", () => {
    const res = blockSchema.safeParse({
      date: "2026-08-03",
      wholeDay: false,
      startTime: "12:00",
      endTime: "12:00",
      unit: null,
    });
    expect(res.success).toBe(false);
    expect(hasMessage(res, "Pick an end time that's after the start time.")).toBe(true);
  });

  it("rejects a partial-range block missing start/end times", () => {
    const res = blockSchema.safeParse({
      date: "2026-08-03",
      wholeDay: false,
      unit: null,
    });
    expect(res.success).toBe(false);
    expect(hasMessage(res, "Pick a start and end time to block.")).toBe(true);
  });

  it("accepts unit=null (whole listing) and unit=3 (unit-scoped); rejects unit=0", () => {
    expect(
      blockSchema.safeParse({ date: "2026-08-03", wholeDay: true, unit: null }).success,
    ).toBe(true);
    expect(
      blockSchema.safeParse({ date: "2026-08-03", wholeDay: true, unit: 3 }).success,
    ).toBe(true);
    expect(
      blockSchema.safeParse({ date: "2026-08-03", wholeDay: true, unit: 0 }).success,
    ).toBe(false);
  });

  it("rejects a malformed date (not YYYY-MM-DD)", () => {
    expect(
      blockSchema.safeParse({ date: "08/03/2026", wholeDay: true, unit: null }).success,
    ).toBe(false);
  });
});
