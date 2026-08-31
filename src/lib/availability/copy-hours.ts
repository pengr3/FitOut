// The copy-to-all transformation (HOURS-01 · HOURS-02 · D-25). ONE pure, directive-free function that
// takes the live weekly windows, a source weekday and a set of target weekdays, and returns the next
// windows array TOGETHER WITH the two sentences that describe it.
//
// Directive-free on purpose — this module carries no rendering-environment pragma of either kind,
// exactly as `week-strip.ts` and `block-reason.ts` next door — so the client hours editor can import it
// AND a node-environment unit test can drive it without a DOM. No database import. No clock read. No
// runtime import of the validation module. It reads nothing about bookings, passes, prices or the hours
// lock, and it answers no question about what may be SAVED.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THIS IS FORM-STATE MANIPULATION AND NOTHING ELSE (D-130 · GATE-05 · T-19-03)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The array this returns is handed straight to the SAME field array the selects write into, and it
// reaches the database through the SAME unchanged submit handler, re-parsed by the SAME
// `weeklyHoursSchema` as a hand-entered row. There is no fast path, no second submit route and no
// "these were generated so they are already valid" shortcut — the produced rows are ordinary rows.
// `src/app/actions/operating-hours.ts` is not edited by this feature and re-checks ownership and
// re-validates every write exactly as it did before.
//
// It also never answers "is this slot bookable". That is the read model's question, on the server,
// and a copy control that started deriving availability on the client would be the drift D-130 names.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE ARRAYS AND THE SENTENCES COME OUT OF ONE CALL
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `week-strip.ts` makes this argument about its own pair and it holds here word for word: a component
// that APPLIED from one derivation and DESCRIBED from another would be one refactor away from doing
// one thing and saying another, and nothing in the product would report it because both halves would
// still look individually correct. So `nextWindows`, `replacedDays`, `changedDays` and both sentences
// are one return value, and `copy-hours.test.ts` case (17) asserts their agreement generically.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IT TOLERATES, AND WHAT IT REFUSES TO JUDGE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The input is live, unsaved form state, so a row may be undefined and a window may be missing a time
// mid-edit. Those rows are SKIPPED, the way `deriveWeekStrip` skips them, and skipping is not a verdict
// on validity — the form owns its own message and the shared schema owns the refusal.
//
// A window that is COMPLETE but wrong — a close that is not after its open, which is a real state the
// host can reach and which the hours editor explains on the row — is carried across UNTOUCHED on any
// day this copy does not target. Deleting it would be data loss dressed as a validation, and this
// module has no standing to refuse a value the one authority has not refused.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE WEEKDAY NAMES ARE NOT DECLARED HERE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `week-strip.ts` has owned the weekday names, the on-the-hour options and the hour parser since plan
// 14-12, and this module joins them BY IMPORT rather than by inspection. Do not declare a second
// weekday list, a second hour parser or a second hour-label map anywhere in this feature. The
// list-joining helper below IS local, and deliberately so: what must not be duplicated is a SENTENCE,
// and a comma-and-conjunction joiner is not one of ours.

import { WEEKDAY_NAMES, type WeekStripInput, type WeeklyHoursWindow } from "@/lib/availability/week-strip";

/**
 * Everything one copy decision produces: the array to apply, the days it touches, and the two
 * sentences that describe it. All from one call — see the header for why that is structural.
 */
export type CopyHoursPlan = {
  /** The whole next schedule, ready for the field array. A full replacement, like the save itself. */
  nextWindows: WeeklyHoursWindow[];
  /** Targets that hold at least one window TODAY — the days HOURS-02 must name before applying. */
  replacedDays: number[];
  /** Targets whose resulting window set differs from what they hold now. */
  changedDays: number[];
  /** The target list after normalisation: in range, deduped, source removed, Sunday-first. */
  targetDays: number[];
  /** The overwrite warning, or null when nothing of the host's is being replaced. */
  warningSentence: string | null;
  /** What just happened, for the undo affordance to carry after the copy is applied. */
  appliedSentence: string;
};

/** The sentence for a copy nobody selected a target for. Named so the test and the module share it. */
const NOTHING_SELECTED_SENTENCE = "No days were selected, so nothing changed.";

/** `0=Sun … 6=Sat` — the `operating_hours.day_of_week` convention, same as every module beside this. */
function isWeekday(day: unknown): day is number {
  return Number.isInteger(day) && (day as number) >= 0 && (day as number) <= 6;
}

/**
 * A live form row → a window this transformation can carry, or null when it cannot be represented.
 *
 * "Cannot be represented" is a narrow test on purpose: an absent row, a day outside the week, or a
 * missing time. It is NOT a validity check — see the header. Always returns a FRESH object, so the
 * array this module returns shares no identity with the array it was given and an undo that restores
 * a snapshot cannot restore an aliased row.
 */
function carriedWindow(row: WeekStripInput[number]): WeeklyHoursWindow | null {
  if (!row) return null;
  const { dayOfWeek, openTime, closeTime } = row;
  if (!isWeekday(dayOfWeek)) return null;
  if (typeof openTime !== "string" || openTime.length === 0) return null;
  if (typeof closeTime !== "string" || closeTime.length === 0) return null;
  return { dayOfWeek, openTime, closeTime };
}

/**
 * A day's windows reduced to a comparable shape: its open/close pairs, sorted.
 *
 * Sorted because two days hold the SAME hours whatever order their rows happen to sit in the flat
 * array — the host typed them, the array did not.
 */
function daySignature(windows: readonly WeeklyHoursWindow[]): string {
  return windows
    .map((window) => `${window.openTime}-${window.closeTime}`)
    .sort()
    .join("|");
}

/**
 * Weekday numbers → the list as a person reads it: `Tuesday`, `Tuesday and Friday`,
 * `Tuesday, Wednesday, and Friday`.
 *
 * The three-or-more spelling is `week-strip.ts`'s own grammar for its ranges. The TWO-item spelling
 * drops the comma, which that helper does not, and the difference is deliberate rather than an
 * oversight: its items are long phrases that each contain a preposition, where the comma is what keeps
 * them apart; these items are single words, and the comma there reads as a typo to the host.
 */
function joinDayNames(days: readonly number[]): string {
  const names = days.map((day) => WEEKDAY_NAMES[day]);
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/**
 * The copy's ONE derivation: live windows + a source weekday + chosen target weekdays → the next
 * schedule and the words for it.
 *
 * The transformation, stated so it is deterministic:
 *   1. Normalise the targets — drop anything outside the week, drop duplicates, drop the source day
 *      (a day is never its own target, even when it is passed), sort Sunday-first.
 *   2. Collect the source day's windows in input order, skipping rows that cannot be represented.
 *   3. `nextWindows` is every carried window whose day is NOT a target, in its original relative
 *      order, followed by a fresh clone of each source window for each target day in turn. A target's
 *      whole window array is REPLACED, never appended to — D-25 means a day is a SET of windows.
 *   4. `replacedDays` is the targets that hold at least one window today.
 *   5. `changedDays` is the targets whose set differs from the source's, compared as sorted pairs, so
 *      a target that already matches is not reported as a change.
 */
export function deriveCopyPlan(input: {
  windows: WeekStripInput;
  sourceDay: number;
  targetDays: readonly number[];
}): CopyHoursPlan {
  const carried: WeeklyHoursWindow[] = [];
  for (const row of input.windows ?? []) {
    const window = carriedWindow(row);
    if (window !== null) carried.push(window);
  }

  const targetDays = [...new Set(input.targetDays)]
    .filter((day) => isWeekday(day) && day !== input.sourceDay)
    .sort((a, b) => a - b);
  const isTarget = (day: number) => targetDays.includes(day);

  const sourceWindows = carried.filter((window) => window.dayOfWeek === input.sourceDay);
  const sourceSignature = daySignature(sourceWindows);
  const windowsOn = (day: number) => carried.filter((window) => window.dayOfWeek === day);

  const nextWindows: WeeklyHoursWindow[] = [
    ...carried.filter((window) => !isTarget(window.dayOfWeek)),
    ...targetDays.flatMap((day) =>
      sourceWindows.map((window) => ({
        dayOfWeek: day,
        openTime: window.openTime,
        closeTime: window.closeTime,
      })),
    ),
  ];

  const replacedDays = targetDays.filter((day) => windowsOn(day).length > 0);
  const changedDays = targetDays.filter((day) => daySignature(windowsOn(day)) !== sourceSignature);

  return {
    nextWindows,
    replacedDays,
    changedDays,
    targetDays,
    warningSentence:
      replacedDays.length === 0
        ? null
        : `${joinDayNames(replacedDays)} already ${
            replacedDays.length === 1 ? "has" : "have"
          } hours. Copying replaces them.`,
    appliedSentence: appliedSentenceFor(input.sourceDay, sourceWindows.length, targetDays),
  };
}

/**
 * What just happened, in one sentence.
 *
 * A CLOSED source is a real operation and gets its own wording rather than the copied-hours one — a
 * host who has just closed three days should not be told hours were copied to them.
 */
function appliedSentenceFor(
  sourceDay: number,
  sourceWindowCount: number,
  targetDays: readonly number[],
): string {
  if (targetDays.length === 0) return NOTHING_SELECTED_SENTENCE;

  const targets = joinDayNames(targetDays);
  if (!isWeekday(sourceDay)) return `Cleared hours on ${targets}.`;

  const sourceName = WEEKDAY_NAMES[sourceDay];
  return sourceWindowCount === 0
    ? `Copied ${sourceName}'s closed day to ${targets}.`
    : `Copied ${sourceName}'s hours to ${targets}.`;
}
