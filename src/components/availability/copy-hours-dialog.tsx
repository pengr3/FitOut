"use client";

// HOURS-01 / HOURS-02 — the day picker for copy-to-all, and the honest overwrite warning.
//
// A CLIENT COMPONENT because it owns a selection and hands function props to the overlay pattern —
// the same reason `responsive-dialog.tsx` itself is one.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS COMPOSES, AND WHAT IT DELIBERATELY DOES NOT BUILD (D-155)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The overlay is `ResponsiveDialog` from the pattern layer — THE overlay primitive, one focus trap and
// one escape behaviour in the whole app. The rows are the vendored checkbox and label, the footer is
// two vendored buttons at the touch size from the shipped size vocabulary. There is no card here, no
// bordered container and no hand-rolled box: `weekly-hours-editor.tsx` next door left the raw-box
// allow-list in plan 14-12 and a box invented here would quietly ask for that row back.
//
// It is a CONTROLLED overlay with no trigger of its own. The trigger lives in the day row, in the
// editor, because that is where a host is standing when they decide a day's hours are the right ones.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// EACH DAY'S LABEL IS THAT DAY'S OWN SENTENCE FROM THE WEEK STRIP (D-153)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The picker does not compose its own description of what a day currently holds. It reads
// `deriveWeekStrip`, which is the same derivation the strip above the editor announces from — so the
// picker and the strip say the same words about the same day by construction rather than by two lists
// happening to agree. A second phrasing here is the drift that file's header is written about.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// TONE: THIS IS CALM INFORMATION, NOT AN ALARM
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Nothing has gone wrong when the warning appears — the host is being told what their own next action
// will do, which is the whole of HOURS-02. So the warning is the NEUTRAL status tone, read out of
// `STATUS_TONE_RECIPES` by name rather than restated as classes: full-contrast ink for the sentence
// and the muted hue for the glyph beside it. The alarm role is not spent here at all, and the accent
// button variant is not used either — both are censused per file by the design suite, and neither has
// anything to say about a host confirming their own edit.
//
// ⚠ THIS COMPONENT RENDERS NO LIVE REGION OF ANY KIND, and that is a decision rather than an
// oversight. The Phase-14 surfaces pin their interrupting-role census at two occurrences, both native
// field-validation messages; a region added here would move that pin and would announce an outcome
// that already has an announcement. The outcome is carried by MOVED FOCUS instead — the editor places
// focus on the undo control when the copy applies, and that control's accessible description is the
// sentence saying what happened. `copy-hours-editor.test.tsx` case (12) fails on a region added here.

import { useId, useState } from "react";
import { InfoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/patterns/responsive-dialog";
import { deriveCopyPlan, type CopyHoursPlan } from "@/lib/availability/copy-hours";
import { deriveWeekStrip, WEEKDAY_NAMES, type WeekStripInput } from "@/lib/availability/week-strip";
import { STATUS_TONE_RECIPES } from "@/lib/design/status-tones";
import { cn } from "@/lib/utils";

/** The one tone this surface spends, by name. See the header for why it is this one and not another. */
const CALM = STATUS_TONE_RECIPES.neutral;

export type CopyHoursDialogProps = {
  /** The weekday whose hours are being copied — `null` closes the overlay. `0=Sun … 6=Sat`. */
  sourceDay: number | null;
  /** The live, unsaved windows array. Read only; this component writes nothing back to the form. */
  windows: WeekStripInput;
  /** Dismissal, from the overlay's own affordances (its close control, the scrim, the escape key). */
  onOpenChange: (open: boolean) => void;
  /** Confirmation. Receives the whole plan so the caller applies exactly what the picker described. */
  onApply: (plan: CopyHoursPlan) => void;
  /** Forwarded to the pattern's close-time focus hook — see the editor for why it is needed here. */
  onCloseAutoFocus: (event: Event) => void;
};

export function CopyHoursDialog({
  sourceDay,
  windows,
  onOpenChange,
  onApply,
  onCloseAutoFocus,
}: CopyHoursDialogProps) {
  const rowIdPrefix = useId();
  const open = sourceDay !== null;

  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [visit, setVisit] = useState<{ day: number; open: boolean }>({ day: 0, open: false });

  // React's documented "adjust state when a prop changes" shape, and it earns its keep twice here.
  //
  //   • THE SELECTION IS RESET AT THE START OF EACH VISIT rather than in an effect, so re-opening the
  //     picker never paints one frame still carrying the previous visit's ticks. Resetting on the
  //     source day alone would miss the case of opening the SAME day twice.
  //   • THE DAY BEING SHOWN IS LATCHED, so the title, the six rows and the warning stay stable while
  //     the overlay plays its exit. Reading the incoming value directly would swap all three for the
  //     length of the animation every time a host dismisses the picker.
  if (open && (!visit.open || visit.day !== sourceDay)) {
    setVisit({ day: sourceDay, open: true });
    setSelectedDays([]);
  }
  if (!open && visit.open) {
    setVisit((previous) => ({ ...previous, open: false }));
  }

  const shownDay = open ? (sourceDay as number) : visit.day;
  const shownDayName = WEEKDAY_NAMES[shownDay] ?? WEEKDAY_NAMES[0];

  // ONE call for the plan, ONE call for the labels. The plan's own warning sentence is what renders
  // below the list — this file composes no second description of the same decision.
  const week = deriveWeekStrip(windows);
  const plan = deriveCopyPlan({ windows, sourceDay: shownDay, targetDays: selectedDays });

  const toggle = (day: number, checked: boolean) =>
    setSelectedDays((previous) =>
      checked ? [...previous, day] : previous.filter((value) => value !== day),
    );

  const count = plan.targetDays.length;
  const confirmLabel =
    count === 0 ? "Copy hours" : count === 1 ? "Copy to 1 day" : `Copy to ${count} days`;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
      title={`Copy ${shownDayName}'s hours`}
      description={`Pick the days that should match ${shownDayName}. Any hours already set on them are replaced.`}
      footer={
        <>
          <Button type="button" variant="outline" size="touch" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="touch" disabled={count === 0} onClick={() => onApply(plan)}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col">
        {week
          .filter((day) => day.dayOfWeek !== shownDay)
          .map((day) => {
            const rowId = `${rowIdPrefix}-${day.dayOfWeek}`;
            return (
              <div key={day.dayOfWeek} className="flex min-h-11 items-center gap-3">
                <Checkbox
                  id={rowId}
                  checked={selectedDays.includes(day.dayOfWeek)}
                  onCheckedChange={(value) => toggle(day.dayOfWeek, value === true)}
                />
                {/* The day's CURRENT hours, in the strip's own words — see the header. A day with
                    several windows makes a long sentence, so the label is allowed to wrap and gets
                    the looser line spacing the acknowledgement label on the host cancel overlay
                    already uses for the same reason. */}
                <Label htmlFor={rowId} className="leading-snug font-normal">
                  {day.sentence}
                </Label>
              </div>
            );
          })}
      </div>

      {plan.warningSentence !== null && (
        // HOURS-02's added half: the days about to be overwritten, named BEFORE the copy applies and
        // recomputed as the selection changes. Calm, not alarmed — see the header.
        <p className={cn("flex items-start gap-2 text-sm", CALM.text)}>
          <InfoIcon className={cn("mt-0.5 size-4 shrink-0", CALM.icon)} />
          {plan.warningSentence}
        </p>
      )}
    </ResponsiveDialog>
  );
}
