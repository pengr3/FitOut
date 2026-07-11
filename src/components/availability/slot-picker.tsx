"use client";

// Booker hour-slot picker (AVAIL-04 / AVAIL-05 · D-22/D-23). A toggle-group of 60-min, on-the-hour
// chips for one venue-local day, rendered in the venue's local 12-hour time (SC#2 — never the browser
// tz). The booker selects a CONTIGUOUS run of available hours OR the whole operating day ("Book full
// day", D-23). Occupied / blocked / past / beyond-horizon hours are visibly distinct (muted +
// line-through + tooltip), `aria-disabled`, and CANNOT be selected — never red (occupancy is a normal
// state, not an error; UI-SPEC Availability-state recipes).
//
// The picker is advisory (Pitfall 6): the DB EXCLUDE constraint is the sole authority and Phase 4
// re-derives + re-validates the selection server-side. Selection lifts up via `onSelectionChange`.
//
// When `disabled` (the listing is published-but-not-payable → !deriveBookable) every chip renders
// read-only so there is no dead-end selection (threat T-03-TAMPER-SELECT; UI-SPEC Interaction rules).

import * as React from "react";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";

import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AvailabilitySlot } from "@/lib/availability/read-model";

export type SlotSelectionValue = { startUtc: string; endUtc: string; fullDay: boolean };

type SlotPickerProps = {
  slots: AvailabilitySlot[];
  timezone: string;
  unitCount: number;
  disabled: boolean;
  onSelectionChange: (sel: SlotSelectionValue | null) => void;
};

/** A contiguous, in-bounds selected run as [lo, hi] indices into `slots` (all guaranteed available). */
type Run = { lo: number; hi: number };

/** Human-readable reason a chip can't be picked (never leaks "unit"/"tstzrange" jargon — UI-SPEC copy). */
function reasonFor(state: AvailabilitySlot["state"]): string {
  switch (state) {
    case "past":
      return "Past";
    case "beyond_horizon":
      return "Too far ahead";
    default:
      return "Unavailable";
  }
}

/** Shared chip shape so available / selected / unavailable chips line up in the grid (≥44px hit area). */
const CHIP_BASE =
  "flex h-auto min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 text-sm font-medium";

export function SlotPicker({
  slots,
  timezone,
  unitCount,
  disabled,
  onSelectionChange,
}: SlotPickerProps) {
  const inTz = tz(timezone);
  const [run, setRun] = React.useState<Run | null>(null);
  const [fullDay, setFullDay] = React.useState(false);

  const startToIndex = React.useMemo(() => {
    const m = new Map<string, number>();
    slots.forEach((s, i) => m.set(s.startUtc, i));
    return m;
  }, [slots]);

  // The selected startUtc list drives the controlled ToggleGroup value (empty in full-day mode).
  const selectedValues = React.useMemo(() => {
    if (fullDay || !run) return [];
    return slots.slice(run.lo, run.hi + 1).map((s) => s.startUtc);
  }, [run, fullDay, slots]);

  const firstSlot = slots[0];
  const lastSlot = slots[slots.length - 1];

  /** Two slots are run-adjacent iff both available AND time-contiguous (endUtc === next startUtc). */
  function adjacent(aIdx: number, bIdx: number): boolean {
    const a = slots[aIdx];
    const b = slots[bIdx];
    return (
      !!a &&
      !!b &&
      a.state === "available" &&
      b.state === "available" &&
      a.endUtc === b.startUtc
    );
  }

  /** Set state AND lift the resulting selection (start/end/fullDay) up to the rail. */
  const commit = React.useCallback(
    (nextRun: Run | null, nextFullDay: boolean) => {
      setRun(nextRun);
      setFullDay(nextFullDay);
      if (nextFullDay && firstSlot && lastSlot) {
        onSelectionChange({
          startUtc: firstSlot.startUtc,
          endUtc: lastSlot.endUtc,
          fullDay: true,
        });
      } else if (nextRun) {
        onSelectionChange({
          startUtc: slots[nextRun.lo].startUtc,
          endUtc: slots[nextRun.hi].endUtc,
          fullDay: false,
        });
      } else {
        onSelectionChange(null);
      }
    },
    [slots, firstSlot, lastSlot, onSelectionChange],
  );

  // Radix hands us the whole toggled array; derive the single changed hour and apply the
  // consecutive-run rule (extend at either end, else re-anchor; clicking a selected hour trims back).
  function handleValueChange(next: string[]) {
    const prev = selectedValues;
    const added = next.find((v) => !prev.includes(v));
    const removed = prev.find((v) => !next.includes(v));

    if (added !== undefined) {
      const i = startToIndex.get(added);
      if (i === undefined) return;
      if (fullDay || !run) return commit({ lo: i, hi: i }, false);
      if (i === run.hi + 1 && adjacent(run.hi, i)) return commit({ lo: run.lo, hi: i }, false);
      if (i === run.lo - 1 && adjacent(i, run.lo)) return commit({ lo: i, hi: run.hi }, false);
      return commit({ lo: i, hi: i }, false); // non-adjacent click → fresh run
    }

    if (removed !== undefined && run) {
      const i = startToIndex.get(removed);
      if (i === undefined) return;
      if (i <= run.lo) return commit(null, false); // trimmed the whole run away
      return commit({ lo: run.lo, hi: i - 1 }, false); // trim back to just before the clicked hour
    }
  }

  function toggleFullDay() {
    commit(null, !fullDay);
  }

  const hasSlots = slots.length > 0;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <ScrollArea className="max-h-72 w-full">
          <ToggleGroup
            type="multiple"
            value={selectedValues}
            onValueChange={handleValueChange}
            disabled={disabled}
            aria-label="Available hours"
            className="flex w-full flex-wrap justify-start gap-2 pr-3"
          >
            {slots.map((slot) => {
              const timeLabel = format(new Date(slot.startUtc), "h:mm a", { in: inTz });
              const isAvailable = slot.state === "available";
              const isSelected = selectedValues.includes(slot.startUtc);

              if (!isAvailable) {
                // Occupied / blocked / past / beyond-horizon: visible, muted, struck-through, NEVER
                // selectable, NEVER red. The wrapping span carries the tooltip (a disabled control
                // wouldn't receive hover) — mirrors the "Not bookable yet" affordance on this page.
                return (
                  <Tooltip key={slot.startUtc}>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <ToggleGroupItem
                          value={slot.startUtc}
                          disabled
                          aria-disabled="true"
                          aria-label={`${timeLabel} — ${reasonFor(slot.state)}`}
                          className={cn(
                            CHIP_BASE,
                            "cursor-not-allowed bg-muted text-muted-foreground line-through",
                          )}
                        >
                          <span className="tabular-nums">{timeLabel}</span>
                        </ToggleGroupItem>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{reasonFor(slot.state)}</TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <ToggleGroupItem
                  key={slot.startUtc}
                  value={slot.startUtc}
                  aria-pressed={isSelected}
                  aria-label={timeLabel}
                  className={cn(
                    CHIP_BASE,
                    "border border-border bg-card text-foreground hover:bg-muted",
                    // Selected = coral (the ONLY accent on this surface besides the book CTA).
                    "data-[state=on]:border-transparent data-[state=on]:bg-brand data-[state=on]:text-brand-foreground data-[state=on]:hover:bg-brand/90",
                  )}
                >
                  <span className="tabular-nums">{timeLabel}</span>
                  {unitCount > 1 && (
                    <span
                      className={cn(
                        "text-xs font-normal",
                        isSelected ? "text-brand-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {slot.freeUnits} of {unitCount} free
                    </span>
                  )}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </ScrollArea>

        {hasSlots && (
          <button
            type="button"
            aria-pressed={fullDay}
            disabled={disabled}
            onClick={toggleFullDay}
            className={cn(
              "min-h-11 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors",
              "hover:bg-muted disabled:pointer-events-none disabled:opacity-50",
              fullDay && "border-transparent bg-brand text-brand-foreground hover:bg-brand/90",
            )}
          >
            Book full day
          </button>
        )}
      </div>
    </TooltipProvider>
  );
}
