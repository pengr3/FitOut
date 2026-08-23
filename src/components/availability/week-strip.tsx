"use client";

// The week-at-a-glance strip — the RENDERED half of HFLOW-04 (D-152, D-153). Seven columns of bars
// drawn against a 24-hour scale, live from the form state the editor above already holds, so a
// mistyped window is visible BEFORE a save round-trip.
//
// `"use client"` because this renders inside `weekly-hours-editor.tsx`'s client form and re-renders
// from its watched value on every keystroke. It holds no state and reaches no hook of its own — the
// live array arrives as a prop. `PanelCard` is authored as a Server Component; importing it here
// compiles it into the client bundle, which is correct and not a boundary leak for exactly the
// reason `host/request-row.tsx:14-16` records for `RowCard`: the pattern renders markup, imports no
// domain module, and reaches only `ui/card` and `cn`.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// ONE DERIVATION, TWO CONSUMERS — AND THAT IS THE WHOLE OF D-153
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The derivation is called ONCE. Its `segments` draw the bars and its `sentence` is announced;
// nothing in this file computes either. The bars are decoration — the entire seven-column grid
// computes as hidden from assistive technology — and the meaning is a screen-reader-only list of
// exactly seven sentences, one per weekday, in the same order. A component that drew from one
// derivation and announced from another would be one refactor away from showing a sighted host one
// week and reading a screen-reader host a different one, and nothing in the product would report it.
//
// ⚠ THE STRIP RENDERS ZERO LIVE REGIONS, and that is a rule rather than an omission (GATE-03 rule 6,
// 14-UI-SPEC § Accessibility). The sentences are static text that re-renders with the form. The
// select the host just changed already announces its own new value; a second announcement for one
// action is the defect, not the courtesy. `availability/spots-left-chip.tsx:89` is what a live region
// looks like in this tree — this file must not copy it.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE STRIP DRAWS; IT DOES NOT JUDGE, AND IT DOES NOT OVERLAY A CALENDAR
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// No overlap detection and no schema here. `weekly-hours-editor.tsx`'s own block owns the
// client-side overlap math and `weeklyHoursSchema` owns validation on the way to the database
// (D-130); a third opinion in this file would be the first place the three could disagree. A
// half-typed window simply has no bar for the two seconds it takes to finish typing it.
//
// DATE-SPECIFIC BLOCKS AND CLOSURES ARE NOT OVERLAID (D-152). `BlocksEditor` below the editor owns
// them, and the preview must describe exactly what the editor above it sets — folding them in would
// silently turn "my weekly pattern" into "this specific week" the moment a one-off block exists.
//
// There is also NO AXIS: no gridline, no hour tick, no axis label and no left gutter. Each would add
// an undeclared hairline pairing to a surface whose entire justification is that it carries no
// information. Precision is not this strip's job — the exact times are in the selects directly below
// it and in the sentences beside it. What the strip is for is SHAPE: a host who types nine in the
// morning where they meant nine at night sees the bar jump from the bottom third of the column to
// the top third, which is legible with no scale to read.
//
// AND THE COLUMNS ARE VERTICAL ON PURPOSE. A weekly pattern is read across days at the same hour
// ("open at six on weekdays, later on Saturday"), and vertical tracks put the same hour on the same
// horizontal line across all seven columns. A horizontal re-orientation would put that reading on a
// diagonal.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE BAR GEOMETRY IS AN INLINE COMPUTED PERCENTAGE AND NOT A UTILITY CLASS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A bar's offset and height are one of twenty-four positions each, so expressing them as classes
// means forty-eight bracketed one-off values in a repository whose build fails on the first one.
// The `style` object below carries two computed percentages and NOTHING ELSE: no colour, no type
// size. `config/design-leak-patterns.mjs` polices five shapes — a raw hex literal, a raw colour
// function, a bracketed pixel type size, a numbered palette class and the two absolute colour words
// — and two numeric percentages match none of them. The geometry is therefore safe BY CONSTRUCTION
// rather than by exemption, which is stated here descriptively (S8: a comment that quotes a banned
// spelling trips the grep that forbids it) so nobody "fixes" it into bracketed utilities.
//
// Everything that is NOT geometry stays declared: the track height arrives from the declared
// measurements module and is never a number typed here, the fill is the muted surface token, the bar
// is the foreground surface token, and the container is the declared panel pattern.

import { PanelCard } from "@/components/patterns/panel-card";
import { deriveWeekStrip, type WeekStripInput } from "@/lib/availability/week-strip";
import { HOURS_STRIP_TRACK } from "@/lib/design/measurements";
import { cn } from "@/lib/utils";

/**
 * The scale every column is drawn against: a whole day, midnight to midnight.
 *
 * Not a box measurement and therefore not `measurements.ts`'s business — it is the denominator of
 * the clock itself, and it is what makes two weekdays' bars comparable at a glance.
 */
const HOURS_IN_A_DAY = 24;

/** A percentage of the track, from an hour on the 0..24 scale. */
const asTrackPercent = (hours: number) => `${(hours / HOURS_IN_A_DAY) * 100}%`;

export function WeekStrip({
  windows,
  cityLabel,
}: {
  /**
   * The LIVE window array — `useWatch({ name: "windows" })`, never `initialWindows` and never a
   * re-read after save. D-152's whole point is that the preview updates before the round-trip, and
   * `WeekStripInput` already accepts the sparse mid-edit shape the form emits, so it passes straight
   * in with no cast and no pre-filter.
   */
  windows: WeekStripInput;
  /** The space's city, named in the caption so the scale's timezone is never ambiguous. */
  cityLabel: string;
}) {
  // ONE CALL. `segments` below draws, `sentence` below announces, and there is no second derivation
  // in this file for the two to drift apart from.
  const days = deriveWeekStrip(windows);
  const hasNoHoursAtAll = days.every((day) => day.segments.length === 0);

  return (
    <PanelCard title="Your week at a glance">
      {/*
        THE BARS ARE DECORATION. The whole grid is hidden from assistive technology, which is what
        leaves the muted track carrying no information at all — the compensating condition the two
        non-informational-fill exclusions in `contrast-pairs.ts` state for this surface. The day
        captions inside it are hidden by inheritance, which is correct: each one is repeated as the
        subject of its own sentence in the text equivalent below.
      */}
      <div aria-hidden="true" data-testid="week-strip" className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div key={day.dayOfWeek} className="space-y-1">
            <div className={cn("relative overflow-hidden rounded-md bg-muted", HOURS_STRIP_TRACK)}>
              {day.segments.map((segment, index) => (
                <div
                  // Windows that touch at an endpoint stay TWO segments and are drawn with no forced
                  // gap, so they merge into one bar. That is correct rather than a rounding artefact:
                  // the space IS open continuously across the boundary, which is exactly what the
                  // half-open convention the schema and the exclusion constraint share means.
                  key={`${index}-${segment.openHour}-${segment.closeHour}`}
                  className="absolute inset-x-0 rounded-sm bg-foreground"
                  style={{
                    top: asTrackPercent(segment.openHour),
                    height: asTrackPercent(segment.closeHour - segment.openHour),
                  }}
                />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground">{day.dayLabel}</p>
          </div>
        ))}
      </div>

      {/*
        THE MEANING. Exactly seven items, one per weekday, in the same order as the columns, each
        carrying that day's sentence from the same call that produced its bars. Static text — it
        re-renders with the form and announces nothing on its own.
      */}
      <ul className="sr-only" data-testid="week-strip-text">
        {days.map((day) => (
          <li key={day.dayOfWeek}>{day.sentence}</li>
        ))}
      </ul>

      <div className="space-y-1">
        <p className="text-label text-muted-foreground">
          {`Midnight to midnight · ${cityLabel} time`}
        </p>
        {hasNoHoursAtAll && (
          // NOT AN ERROR STATE, AND IT CARRIES NO ALARM TONE. An unset week is the truthful picture
          // of a listing that has not been set up yet, and the place that fact becomes actionable is
          // the shipped hours-missing signal on the dashboard and the listings grid — not here.
          <p className="text-label text-muted-foreground">Closed every day — no hours set yet.</p>
        )}
      </div>
    </PanelCard>
  );
}
