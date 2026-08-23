// `deriveWeekStrip` (14-04 · D-152, D-153) — the drawn week and the announced week must be the same week.
//
// THE SILENT FAILURE THIS CATCHES. The strip's seven-column grid computes `aria-hidden`, so a screen-reader
// host never meets the bars at all: the per-day sentence IS the surface for them. If the segments and the
// sentence were ever derived separately — one loop for the bars, another for the text, an "optimisation"
// that coalesces touching bars but not the ranges that name them — a sighted host and a screen-reader host
// would be shown two different weeks, both internally consistent, and NOTHING in the product would report
// it. No render breaks, no type fails, no schema refuses. The only thing that can catch it is an assertion
// that the two halves agree, made over every case rather than over one.
//
// So case (6) below is the load-bearing one and it is asserted GENERICALLY across the whole table: for every
// input, the number of segments equals the number of time ranges the sentence names, and the sentence ends
// in the closed word if and only if there are no segments. Adding a case to the table adds it to the
// invariant automatically — which is the point, since the next case is the one nobody thought of.
//
// BOTH HALVES WERE OBSERVED FAILING against deliberate breaks, and the pair is recorded because they catch
// DIFFERENT things:
//
//   (1) The derivation coalescing touching windows into one segment — the plausible "tidy-up" a future edit
//       makes. The pinned touching-windows case caught it:
//         AssertionError: expected [ { openHour: 9, closeHour: 15 } ] to deeply equal [ Array(2) ]
//       The generic invariant did NOT fire, and could not: one segment named by one range is self-
//       consistent. That is why the exact strings below are pinned and are not decoration.
//
//   (2) The SENTENCE built from a coalesced copy while the bars stayed uncoalesced — the actual two-
//       derivation drift, which no per-case pin would find in general. The invariant caught it on the same
//       run, by count:
//         AssertionError: expected 1 to be 2 // Object.is equality
//         (segments and sentence carry the same count for 'two windows touching at an endpoint')
//       plus the pinned sentence:
//         expected 'Wednesday: 9:00 AM to 3:00 PM' to be 'Wednesday: 9:00 AM to 12:00 PM, and 1…'
//
// Both breaks were reverted. Neither the invariant alone nor the pins alone are sufficient; the file keeps
// both.
//
// Pure table-driven node test — no DB, no DOM — mirroring `block-reason.test.ts` next door (the only other
// pure-mapper test in this directory) and `tests/booking/when-label.test.ts` for pinning EXACT rendered
// strings. The rendered half (the grid's `aria-hidden`, the seven sr-only list items, a select change with
// zero network calls) is a jsdom test in a later plan; this file owns the derivation's contract.

import { describe, it, expect } from "vitest";
import {
  deriveWeekStrip,
  hourLabel,
  CLOSED_WORD,
  HOUR_OPTIONS,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT_NAMES,
  type WeekStripInput,
} from "@/lib/availability/week-strip";

/** A well-formed window, the shape the editor's field array holds. */
const win = (dayOfWeek: number, openTime: string, closeTime: string) => ({
  dayOfWeek,
  openTime,
  closeTime,
});

/**
 * THE TABLE. Every case here is fed to the generic invariant in case (6), so a new case costs one row and
 * buys the agreement assertion for free.
 */
const CASES: { name: string; windows: WeekStripInput }[] = [
  { name: "no hours at all", windows: [] },
  { name: "one window on one day", windows: [win(1, "06:00", "22:00")] },
  {
    name: "two disjoint windows on one day, entered out of order",
    windows: [win(2, "17:00", "22:00"), win(2, "06:00", "09:00")],
  },
  {
    name: "two windows touching at an endpoint",
    windows: [win(3, "09:00", "12:00"), win(3, "12:00", "15:00")],
  },
  {
    name: "three windows on one day",
    windows: [win(5, "06:00", "08:00"), win(5, "12:00", "13:00"), win(5, "18:00", "21:00")],
  },
  {
    name: "a full week",
    windows: [
      win(0, "08:00", "18:00"),
      win(1, "06:00", "22:00"),
      win(2, "06:00", "22:00"),
      win(3, "06:00", "22:00"),
      win(4, "06:00", "22:00"),
      win(5, "06:00", "22:00"),
      win(6, "00:00", "23:00"),
    ],
  },
  { name: "a single-day week (Sunday only)", windows: [win(0, "07:00", "11:00")] },
  { name: "only the last day set (Saturday)", windows: [win(6, "08:00", "20:00")] },
  {
    name: "a form mid-edit: undefined rows and half-typed windows",
    windows: [
      undefined,
      null,
      { dayOfWeek: 4 },
      { dayOfWeek: 4, openTime: "09:00" },
      { dayOfWeek: 4, closeTime: "17:00" },
      { dayOfWeek: 4, openTime: "", closeTime: "" },
      { dayOfWeek: 4, openTime: "9", closeTime: "17:00" },
      { dayOfWeek: 4, openTime: "10:00", closeTime: "10:00" },
      { dayOfWeek: 4, openTime: "18:00", closeTime: "09:00" },
      { dayOfWeek: 9, openTime: "09:00", closeTime: "17:00" },
      { openTime: "09:00", closeTime: "17:00" },
      { dayOfWeek: 4, openTime: 9, closeTime: 17 } as unknown as { dayOfWeek: number },
    ],
  },
];

/** The sentence names one range per " to " — no weekday name and no hour label contains that substring. */
const rangeCount = (sentence: string) => sentence.split(" to ").length - 1;

describe("deriveWeekStrip — seven entries, always (D-152)", () => {
  it.each(CASES)("returns exactly 7 entries for $name", ({ windows }) => {
    // LENGTH FIRST: a derivation that returned only the five days a host had set would sail through every
    // contents-only assertion below.
    expect(deriveWeekStrip(windows)).toHaveLength(7);
  });

  it("gives the empty input seven closed days, each pinned exactly", () => {
    const week = deriveWeekStrip([]);
    expect(week).toHaveLength(7);
    expect(week.map((d) => d.sentence)).toEqual([
      "Sunday: closed",
      "Monday: closed",
      "Tuesday: closed",
      "Wednesday: closed",
      "Thursday: closed",
      "Friday: closed",
      "Saturday: closed",
    ]);
    expect(week.every((d) => d.segments.length === 0)).toBe(true);
  });

  it("keeps a closed day as a row with zero segments, never a missing row", () => {
    const week = deriveWeekStrip([win(6, "08:00", "20:00")]);
    expect(week).toHaveLength(7);
    expect(week.slice(0, 6).map((d) => d.segments.length)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(week[0].sentence).toBe("Sunday: closed");
    expect(week[6].segments).toEqual([{ openHour: 8, closeHour: 20 }]);
  });

  it("returns seven entries for a full week and for a single-day week", () => {
    const full = deriveWeekStrip(CASES.find((c) => c.name === "a full week")!.windows);
    expect(full).toHaveLength(7);
    expect(full.every((d) => d.segments.length === 1)).toBe(true);

    const oneDay = deriveWeekStrip([win(0, "07:00", "11:00")]);
    expect(oneDay).toHaveLength(7);
    expect(oneDay.filter((d) => d.segments.length > 0)).toHaveLength(1);
    expect(oneDay[0].sentence).toBe("Sunday: 7:00 AM to 11:00 AM");
  });
});

describe("deriveWeekStrip — the four renderings, pinned glyph for glyph", () => {
  it("one window: one segment, one range, the shared label map's own strings", () => {
    const monday = deriveWeekStrip([win(1, "06:00", "22:00")])[1];
    expect(monday.segments).toEqual([{ openHour: 6, closeHour: 22 }]);
    expect(monday.sentence).toBe("Monday: 6:00 AM to 10:00 PM");
    // The labels are the SELECT's labels, not a second formatter that happens to agree today.
    expect(monday.sentence).toContain(HOUR_OPTIONS[6].label);
    expect(monday.sentence).toContain(HOUR_OPTIONS[22].label);
    expect(hourLabel(6)).toBe("6:00 AM");
    expect(hourLabel(22)).toBe("10:00 PM");
  });

  it("multiple windows: one segment each, sorted, joined with the connective", () => {
    // Entered evening-first — the drawn order and the announced order must both come out ascending.
    const tuesday = deriveWeekStrip([win(2, "17:00", "22:00"), win(2, "06:00", "09:00")])[2];
    expect(tuesday.segments).toEqual([
      { openHour: 6, closeHour: 9 },
      { openHour: 17, closeHour: 22 },
    ]);
    expect(tuesday.sentence).toBe("Tuesday: 6:00 AM to 9:00 AM, and 5:00 PM to 10:00 PM");
  });

  it("three windows: the last is the one preceded by the connective", () => {
    const friday = deriveWeekStrip([
      win(5, "18:00", "21:00"),
      win(5, "06:00", "08:00"),
      win(5, "12:00", "13:00"),
    ])[5];
    expect(friday.segments).toHaveLength(3);
    expect(friday.sentence).toBe(
      "Friday: 6:00 AM to 8:00 AM, 12:00 PM to 1:00 PM, and 6:00 PM to 9:00 PM",
    );
  });

  it("windows touching at an endpoint stay TWO segments and name TWO ranges", () => {
    // The bars will visually merge, and that is correct — the space IS open continuously across the
    // boundary, which is what '[)' means. This is the case a future "tidy-up" would coalesce into one
    // segment; if it ever does, the counts below and the pinned sentence both go red.
    const wednesday = deriveWeekStrip([win(3, "09:00", "12:00"), win(3, "12:00", "15:00")])[3];
    expect(wednesday.segments).toEqual([
      { openHour: 9, closeHour: 12 },
      { openHour: 12, closeHour: 15 },
    ]);
    expect(wednesday.segments[0].closeHour).toBe(wednesday.segments[1].openHour); // adjacent, 0px gap
    expect(wednesday.sentence).toBe("Wednesday: 9:00 AM to 12:00 PM, and 12:00 PM to 3:00 PM");
  });

  it("a closed day announces the closed word and draws nothing", () => {
    const sunday = deriveWeekStrip([win(1, "06:00", "22:00")])[0];
    expect(sunday.segments).toEqual([]);
    expect(sunday.sentence).toBe("Sunday: closed");
  });
});

describe("deriveWeekStrip — the drawn and the announced agree (D-153)", () => {
  it.each(CASES)(
    "segments and sentence carry the same count for $name",
    ({ windows }) => {
      for (const day of deriveWeekStrip(windows)) {
        // (a) every segment is named, and nothing is named that is not drawn
        expect(rangeCount(day.sentence)).toBe(day.segments.length);
        // (b) closed iff empty — in both directions, so neither half can go quiet alone
        expect(day.sentence.endsWith(`: ${CLOSED_WORD}`)).toBe(day.segments.length === 0);
        // (c) every sentence is about the day it is filed under
        expect(day.sentence.startsWith(`${WEEKDAY_NAMES[day.dayOfWeek]}: `)).toBe(true);
      }
    },
  );

  it.each(CASES)("segments come out sorted by open hour for $name", ({ windows }) => {
    for (const day of deriveWeekStrip(windows)) {
      const opens = day.segments.map((s) => s.openHour);
      expect(opens).toEqual([...opens].sort((a, b) => a - b));
      // A segment with no height could be drawn as an invisible bar and named as a nonsense range.
      expect(day.segments.every((s) => s.closeHour > s.openHour)).toBe(true);
    }
  });
});

describe("deriveWeekStrip — Sunday-first, the convention three authorities already share", () => {
  it.each(CASES)("orders the week 0=Sun .. 6=Sat for $name", ({ windows }) => {
    const week = deriveWeekStrip(windows);
    expect(week.map((d) => d.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    // Asserted against the LABELS too: an ISO re-basing would keep the indices and shift the names.
    expect(week.map((d) => d.dayLabel)).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    expect(week.map((d) => d.dayLabel)).toEqual([...WEEKDAY_SHORT_NAMES]);
  });

  it("files a Sunday window under index 0, not index 6", () => {
    const week = deriveWeekStrip([win(0, "07:00", "11:00")]);
    expect(week[0].segments).toHaveLength(1);
    expect(week[6].segments).toHaveLength(0);
    expect(week[6].sentence).toBe("Saturday: closed");
  });
});

describe("deriveWeekStrip — a form mid-edit keeps drawing (T-14-04-CRASH)", () => {
  const midEdit = CASES.find((c) => c.name.startsWith("a form mid-edit"))!.windows;

  it("does not throw on undefined rows, missing times or malformed hours", () => {
    expect(() => deriveWeekStrip(midEdit)).not.toThrow();
  });

  it("produces no segment from any of them — the whole week stays closed", () => {
    const week = deriveWeekStrip(midEdit);
    expect(week).toHaveLength(7);
    expect(week.every((d) => d.segments.length === 0)).toBe(true);
    expect(week[4].sentence).toBe("Thursday: closed");
  });

  it("still draws the good windows sitting beside a broken one", () => {
    // The half-typed row is what the host is filling in right now; the row above it must not disappear.
    const week = deriveWeekStrip([win(1, "06:00", "22:00"), { dayOfWeek: 1, openTime: "09:00" }]);
    expect(week[1].segments).toEqual([{ openHour: 6, closeHour: 22 }]);
    expect(week[1].sentence).toBe("Monday: 6:00 AM to 10:00 PM");
  });
});
