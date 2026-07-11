// Pure unit test for the DST-correct slot-math layer (src/lib/availability/slots.ts).
//
// Mirrors tests/listing/bookability.test.ts: a pure, no-DB, table-ish unit test that drives the
// boundary module directly. The load-bearing assertions:
//   1. Slot instants are built from a VENUE-LOCAL wall clock via TZDate — a 6:00 Manila (GMT+8)
//      start maps to 2026-07-31T22:00:00.000Z (the whole double-booking guarantee rests on UTC
//      instants being correct; SC#2 "always venue tz").
//   2. venueDayOfWeek is computed in the VENUE tz (0=Sun..6=Sat), not the server tz.
//   3. Horizon (D-26, 90-day platform default) and start>now gating.
//   4. A DST spot-check (America/New_York) proves the same wall-clock hour maps to DIFFERENT UTC
//      instants across a spring-forward boundary — region-capability, even though Manila is DST-free.

import { describe, it, expect } from "vitest";
import {
  BOOKING_HORIZON_DAYS,
  slotsForWindow,
  venueDayOfWeek,
  slotStartsInFuture,
  isWithinHorizon,
} from "@/lib/availability/slots";

describe("slotsForWindow — DST-correct venue-local slot enumeration", () => {
  it("enumerates on-the-hour 60-min slots for a venue-local wall-clock [open, close) window", () => {
    // Aug 1 2026, 06:00-09:00 Manila. month is 0-based (7 = August).
    const slots = slotsForWindow(2026, 7, 1, 6, 9, "Asia/Manila");
    expect(slots).toHaveLength(3); // 6-7, 7-8, 8-9
  });

  it("maps 6:00 Asia/Manila (GMT+8) to 2026-07-31T22:00:00.000Z (venue-local wall clock → UTC instant)", () => {
    const slots = slotsForWindow(2026, 7, 1, 6, 9, "Asia/Manila");
    expect(slots[0]).toEqual({
      startUtc: "2026-07-31T22:00:00.000Z", // 06:00 Manila = 22:00Z the prior day
      endUtc: "2026-07-31T23:00:00.000Z", // 07:00 Manila
    });
    expect(slots[1].startUtc).toBe("2026-07-31T23:00:00.000Z");
    expect(slots[2].endUtc).toBe("2026-08-01T01:00:00.000Z"); // 09:00 Manila
  });

  it("returns an empty array when close <= open (degenerate window)", () => {
    expect(slotsForWindow(2026, 7, 1, 9, 9, "Asia/Manila")).toEqual([]);
  });

  it("DST spot-check (America/New_York): 09:00 local is UTC-5 in winter but UTC-4 in summer", () => {
    // Winter (EST, UTC-5): 2026-01-15 09:00 local → 14:00Z.
    const winter = slotsForWindow(2026, 0, 15, 9, 10, "America/New_York");
    expect(winter[0].startUtc).toBe("2026-01-15T14:00:00.000Z");
    // Summer (EDT, UTC-4, after the Mar 8 2026 spring-forward): 2026-07-15 09:00 local → 13:00Z.
    const summer = slotsForWindow(2026, 6, 15, 9, 10, "America/New_York");
    expect(summer[0].startUtc).toBe("2026-07-15T13:00:00.000Z");
    // The SAME wall-clock hour maps to DIFFERENT UTC instants → DST handled (never fixed-ms math).
    expect(winter[0].startUtc).not.toBe(summer[0].startUtc);
  });
});

describe("venueDayOfWeek — day-of-week computed in the venue tz", () => {
  it("returns 6 (Saturday) for 2026-08-01 in Asia/Manila", () => {
    expect(venueDayOfWeek(2026, 7, 1, "Asia/Manila")).toBe(6);
  });

  it("returns 1 (Monday) for 2026-08-03 in Asia/Manila", () => {
    expect(venueDayOfWeek(2026, 7, 3, "Asia/Manila")).toBe(1);
  });

  it("returns 0 (Sunday) for 2026-08-02 in Asia/Manila", () => {
    expect(venueDayOfWeek(2026, 7, 2, "Asia/Manila")).toBe(0);
  });
});

describe("slotStartsInFuture — start must be strictly after now (D-26: no min lead beyond start>now)", () => {
  const now = new Date("2026-07-11T00:00:00.000Z");
  it("is true for a start after now", () => {
    expect(slotStartsInFuture("2026-07-11T01:00:00.000Z", now)).toBe(true);
  });
  it("is false for a start before now", () => {
    expect(slotStartsInFuture("2026-07-10T23:00:00.000Z", now)).toBe(false);
  });
  it("is false for a start exactly equal to now (strict >)", () => {
    expect(slotStartsInFuture("2026-07-11T00:00:00.000Z", now)).toBe(false);
  });
});

describe("isWithinHorizon — booking horizon (D-26 default 90 days)", () => {
  const now = new Date("2026-07-11T00:00:00.000Z");
  it("exposes the D-26 platform default of 90 days", () => {
    expect(BOOKING_HORIZON_DAYS).toBe(90);
  });
  it("is true for a start within the horizon", () => {
    const in89 = new Date(now.getTime() + 89 * 24 * 60 * 60 * 1000).toISOString();
    expect(isWithinHorizon(in89, now)).toBe(true);
  });
  it("is false for a start beyond the horizon", () => {
    const in91 = new Date(now.getTime() + 91 * 24 * 60 * 60 * 1000).toISOString();
    expect(isWithinHorizon(in91, now)).toBe(false);
  });
  it("honors a custom horizon argument", () => {
    const in8 = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString();
    expect(isWithinHorizon(in8, now, 7)).toBe(false);
    expect(isWithinHorizon(in8, now, 30)).toBe(true);
  });
});
