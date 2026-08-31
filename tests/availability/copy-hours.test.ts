// HOURS-01 / HOURS-02 — the copy transformation's table. Node environment, no DOM, no render.
//
// This is `week-strip.test.ts`'s argument applied a second time: an inline derivation inside a client
// component is reachable only through a rendered DOM, so the table that actually pins this contract
// would have to be a render test. Pulled out into `src/lib/availability/copy-hours.ts`, it is a plain
// function and this is a plain table. The RENDERED half — the warning appearing before the copy
// applies, the apply mutating form state without a server call, the undo restoring exactly — lives in
// `copy-hours-editor.test.tsx` beside this file and is not re-tested here.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED BEFORE IT WAS WATCHED GREEN (31 August 2026)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`). This
// table was written and run against the ABSENT module first. Command for both reds:
// `npx vitest run tests/availability/copy-hours.test.ts`
//
//   (a) THE MODULE ABSENT. **1 failed (1) file / no tests:**
//
//         Error: Cannot find package '@/lib/availability/copy-hours' imported from
//         C:/Users/Admin/Roaming/FitOut/tests/availability/copy-hours.test.ts
//
//       That is a WEAK red and is recorded as one: it proves the table runs against nothing, not that
//       the table can tell a wrong answer from a right one.
//
//   (b) THE MODULE PRESENT AND WRONG — the target's existing windows KEPT and the source's appended
//       beside them instead of REPLACING them. That is the one plausible wrong transformation, and
//       the one that still looks perfectly correct on a target day that was closed. **3 failed / 15
//       passed**, and the three that fired are the three that had to:
//
//         (1) AssertionError: expected [ [ '09:00', '10:00' ], …(3) ] to deeply equal
//             [ [ '06:00', '09:00' ], …(2) ]
//         (2) AssertionError: expected [ { dayOfWeek: 2, …(2) } ] to deeply equal []
//         (13) AssertionError: [{"code":"custom","message":"These hours overlap. Adjust them so each
//              block stands on its own.","path":["windows"]}]: expected false to be true
//
//       Case (13) is the one worth reading twice: the wrong transformation produced a set the REAL
//       shared schema refuses, which is exactly the failure mode T-19-02 is about. Reverted → 18 passed.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE DELIBERATELY DOES NOT ASSERT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// It does not judge validity. `deriveCopyPlan` skips rows it cannot represent and carries everything
// else across untouched — including a window whose close is not after its open, which is a REAL state
// the host can be in (see the editor's F-1 block) and which the form's own message and the shared
// schema already own. A transformation that quietly deleted such a row would be data loss dressed as
// helpfulness, so the table below asserts the row SURVIVES rather than asserting it is refused.

import { describe, it, expect } from "vitest";

import { deriveCopyPlan } from "@/lib/availability/copy-hours";
import { weeklyHoursSchema, type WeeklyHoursInput } from "@/lib/validation/availability";

type Window = WeeklyHoursInput["windows"][number];

const SUN = 0;
const MON = 1;
const TUE = 2;
const WED = 3;
const THU = 4;
const FRI = 5;

/** Terse fixture builder — the tables below are about days and pairs, not about object literals. */
const w = (dayOfWeek: number, openTime: string, closeTime: string): Window => ({
  dayOfWeek,
  openTime,
  closeTime,
});

/** Every window the plan produced for one day, in output order. */
const onDay = (windows: readonly Window[], day: number) =>
  windows.filter((x) => x.dayOfWeek === day);

/** A day's windows as bare pairs, for comparing shape without re-stating the day on every row. */
const pairs = (windows: readonly Window[], day: number) =>
  onDay(windows, day).map((x) => [x.openTime, x.closeTime]);

describe("deriveCopyPlan — the transformation (D-25)", () => {
  it("(1) copies ALL of a multi-window source day onto every target, times carried across unchanged", () => {
    // D-25's whole point: a day is not one open/close pair. A copy that took only the first window
    // would look perfectly correct on the single-window days that make up most schedules.
    const windows = [
      w(MON, "06:00", "09:00"),
      w(MON, "12:00", "14:00"),
      w(MON, "17:00", "22:00"),
      w(WED, "09:00", "10:00"),
    ];

    const plan = deriveCopyPlan({ windows, sourceDay: MON, targetDays: [WED, FRI] });

    expect(pairs(plan.nextWindows, WED)).toEqual([
      ["06:00", "09:00"],
      ["12:00", "14:00"],
      ["17:00", "22:00"],
    ]);
    expect(pairs(plan.nextWindows, FRI)).toEqual([
      ["06:00", "09:00"],
      ["12:00", "14:00"],
      ["17:00", "22:00"],
    ]);
    // …and the source itself is untouched by its own copy.
    expect(pairs(plan.nextWindows, MON)).toEqual([
      ["06:00", "09:00"],
      ["12:00", "14:00"],
      ["17:00", "22:00"],
    ]);
  });

  it("(2) copying a CLOSED source onto a day that has hours closes that day, and reports it", () => {
    // Hard constraint 7. A day with zero windows is a real value, and copying it is a real operation
    // — not an empty one to be short-circuited into a no-op.
    const windows = [w(TUE, "08:00", "12:00"), w(THU, "10:00", "11:00")];

    const plan = deriveCopyPlan({ windows, sourceDay: SUN, targetDays: [TUE] });

    expect(onDay(plan.nextWindows, TUE)).toEqual([]);
    expect(plan.changedDays).toEqual([TUE]);
    expect(plan.replacedDays).toEqual([TUE]);
    // The untouched day is still there — a "close these days" pass must not empty the week.
    expect(pairs(plan.nextWindows, THU)).toEqual([["10:00", "11:00"]]);
  });

  it("(3) preserves every window on a day that is neither source nor target, in its original order", () => {
    const windows = [
      w(THU, "17:00", "20:00"), // deliberately NOT in chronological order …
      w(MON, "09:00", "17:00"),
      w(THU, "06:00", "08:00"), // … so "original relative order" is distinguishable from "sorted"
      w(WED, "10:00", "12:00"),
    ];

    const plan = deriveCopyPlan({ windows, sourceDay: MON, targetDays: [WED] });

    expect(pairs(plan.nextWindows, THU)).toEqual([
      ["17:00", "20:00"],
      ["06:00", "08:00"],
    ]);
  });

  it("(4) never makes the source its own target, even when the source is passed in the target list", () => {
    const windows = [w(MON, "09:00", "17:00"), w(TUE, "07:00", "08:00")];

    const plan = deriveCopyPlan({ windows, sourceDay: MON, targetDays: [MON, TUE, MON] });

    expect(plan.targetDays).toEqual([TUE]);
    expect(pairs(plan.nextWindows, MON)).toEqual([["09:00", "17:00"]]);
    expect(onDay(plan.nextWindows, MON)).toHaveLength(1);
  });

  it("(5) normalises the target list: out-of-range dropped, duplicates dropped, sorted Sunday-first", () => {
    const windows = [w(MON, "09:00", "17:00")];

    const plan = deriveCopyPlan({
      windows,
      sourceDay: MON,
      targetDays: [FRI, TUE, FRI, -1, 7, 3.5, SUN],
    });

    expect(plan.targetDays).toEqual([SUN, TUE, FRI]);
  });

  it("(6) names in `replacedDays` exactly the targets that hold hours today — and no others", () => {
    // This list is HOURS-02's subject: the days the host is about to overwrite. A target that is
    // currently closed is NOT one of them, because nothing of theirs is being replaced.
    const windows = [
      w(MON, "09:00", "17:00"),
      w(TUE, "08:00", "09:00"),
      w(FRI, "18:00", "20:00"),
    ];

    const plan = deriveCopyPlan({ windows, sourceDay: MON, targetDays: [TUE, WED, FRI] });

    expect(plan.replacedDays).toEqual([TUE, FRI]);
    expect(plan.warningSentence).toBe("Tuesday and Friday already have hours. Copying replaces them.");
  });

  it("(7) says nothing about replacement when every target is currently closed", () => {
    const windows = [w(MON, "09:00", "17:00")];

    const plan = deriveCopyPlan({ windows, sourceDay: MON, targetDays: [TUE, WED] });

    expect(plan.replacedDays).toEqual([]);
    expect(plan.warningSentence).toBeNull();
    // …but they ARE changes: they go from closed to open.
    expect(plan.changedDays).toEqual([TUE, WED]);
  });

  it("(8) does not call a target a change when it already matches the source", () => {
    // Same pairs, different input order and a different array — matching is about the SET, not the
    // rows. `replacedDays` still names it (its rows really are being replaced); `changedDays` does not.
    const windows = [
      w(MON, "06:00", "09:00"),
      w(MON, "17:00", "22:00"),
      w(WED, "17:00", "22:00"),
      w(WED, "06:00", "09:00"),
      w(FRI, "06:00", "09:00"),
    ];

    const plan = deriveCopyPlan({ windows, sourceDay: MON, targetDays: [WED, FRI] });

    expect(plan.changedDays).toEqual([FRI]);
    expect(plan.replacedDays).toEqual([WED, FRI]);
  });

  it("(9) is a no-op on an empty target list: the same set out, and both day lists empty", () => {
    const windows = [w(MON, "09:00", "17:00"), w(TUE, "08:00", "09:00")];

    const plan = deriveCopyPlan({ windows, sourceDay: MON, targetDays: [] });

    expect(plan.nextWindows).toEqual(windows);
    expect(plan.targetDays).toEqual([]);
    expect(plan.replacedDays).toEqual([]);
    expect(plan.changedDays).toEqual([]);
    expect(plan.warningSentence).toBeNull();
  });

  it("(10) tolerates the sparse mid-edit array a live form emits, and never throws", () => {
    // The same tolerance `deriveWeekStrip` extends, for the same reason: this input is live, unsaved
    // RHF state. Skipping is not a verdict on validity.
    const windows = [
      undefined,
      w(MON, "09:00", "17:00"),
      null,
      { dayOfWeek: TUE, openTime: "08:00" }, // half-typed: no close yet
      { dayOfWeek: 9, openTime: "08:00", closeTime: "09:00" }, // not a weekday
      w(THU, "10:00", "11:00"),
    ];

    const plan = deriveCopyPlan({ windows, sourceDay: MON, targetDays: [WED] });

    expect(plan.nextWindows).toEqual([
      w(MON, "09:00", "17:00"),
      w(THU, "10:00", "11:00"),
      w(WED, "09:00", "17:00"),
    ]);
  });

  it("(11) carries an INVALID-BUT-COMPLETE window across untouched rather than deleting it", () => {
    // The F-1 state: the host dragged the open time past the close time. The form says so on the row
    // and the shared schema refuses the save. A copy on another day must not silently discard it —
    // that would be data loss wearing the costume of a validation.
    const windows = [w(MON, "09:00", "17:00"), w(THU, "18:00", "06:00")];

    const plan = deriveCopyPlan({ windows, sourceDay: MON, targetDays: [WED] });

    expect(pairs(plan.nextWindows, THU)).toEqual([["18:00", "06:00"]]);
  });

  it("(12) produces window objects of exactly the three fields the shared schema names", () => {
    const windows = [w(MON, "06:00", "09:00"), w(MON, "17:00", "22:00"), w(TUE, "08:00", "09:00")];

    const plan = deriveCopyPlan({ windows, sourceDay: MON, targetDays: [TUE, WED] });

    for (const produced of plan.nextWindows) {
      expect(Object.keys(produced).sort()).toEqual(["closeTime", "dayOfWeek", "openTime"]);
    }
  });

  it("(13) produces a set the REAL schema accepts, for an input set that already parsed", () => {
    // T-19-02, asserted rather than asserted-about. The copied windows are ordinary rows in the same
    // field array, re-parsed on the way to the database by the same authority — no fast path.
    const windows = [
      w(MON, "06:00", "09:00"),
      w(MON, "12:00", "14:00"),
      w(TUE, "08:00", "09:00"),
      w(SUN, "10:00", "11:00"),
    ];
    expect(weeklyHoursSchema.safeParse({ windows }).success).toBe(true);

    const plan = deriveCopyPlan({ windows, sourceDay: MON, targetDays: [TUE, WED, FRI] });

    const parsed = weeklyHoursSchema.safeParse({ windows: plan.nextWindows });
    expect(parsed.success, JSON.stringify(parsed.error?.issues ?? [])).toBe(true);
  });

  it("(14) shares no object identity with its input — a snapshot restore must not restore aliases", () => {
    const windows = [w(MON, "06:00", "09:00"), w(TUE, "08:00", "09:00")];

    const plan = deriveCopyPlan({ windows, sourceDay: MON, targetDays: [TUE, WED] });

    for (const produced of plan.nextWindows) {
      for (const original of windows) {
        expect(produced).not.toBe(original);
      }
    }
    // …and the input array itself was not mutated in place.
    expect(windows).toEqual([w(MON, "06:00", "09:00"), w(TUE, "08:00", "09:00")]);
  });
});

describe("deriveCopyPlan — the two sentences come out of the SAME call", () => {
  it("(15) reports what was copied, naming the source and every target", () => {
    const windows = [w(MON, "09:00", "17:00")];

    const plan = deriveCopyPlan({ windows, sourceDay: MON, targetDays: [TUE, WED, FRI] });

    expect(plan.appliedSentence).toBe("Copied Monday's hours to Tuesday, Wednesday, and Friday.");
  });

  it("(16) does not claim hours were copied when the source day is closed", () => {
    const windows = [w(MON, "09:00", "17:00")];

    const plan = deriveCopyPlan({ windows, sourceDay: SUN, targetDays: [TUE] });

    expect(plan.appliedSentence).toBe("Copied Sunday's closed day to Tuesday.");
  });

  it("(17) describes the arrays it was returned WITH, not a second derivation", () => {
    // The `week-strip.ts` argument about its own pair, applied here: a component that computed from
    // one call and described from another would be one refactor away from applying one thing and
    // saying another. Asserted generically — every named day in either sentence has to be in the
    // matching array, and every day in the array has to be named.
    const windows = [
      w(MON, "06:00", "09:00"),
      w(TUE, "08:00", "09:00"),
      w(THU, "10:00", "11:00"),
    ];
    const NAMES = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const plan = deriveCopyPlan({ windows, sourceDay: MON, targetDays: [TUE, WED, THU] });

    const namedIn = (sentence: string) =>
      NAMES.map((name, day) => ({ name, day }))
        .filter(({ name }) => sentence.includes(name))
        .map(({ day }) => day);

    expect(namedIn(plan.warningSentence ?? "")).toEqual(plan.replacedDays);
    // The applied sentence names the source too, so subtract it before comparing.
    expect(namedIn(plan.appliedSentence).filter((day) => day !== MON)).toEqual(plan.targetDays);
    expect(plan.appliedSentence).toContain("Monday");
  });

  it("(18) says nothing happened when nothing was selected", () => {
    const windows = [w(MON, "09:00", "17:00")];

    const plan = deriveCopyPlan({ windows, sourceDay: MON, targetDays: [] });

    expect(plan.appliedSentence).toBe("No days were selected, so nothing changed.");
  });
});
