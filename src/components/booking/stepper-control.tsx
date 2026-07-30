"use client";

// StepperControl (GROUP-01/GROUP-05 · OPEN-04/OC-06 — 08-UI-SPEC § 5, 09-UI-SPEC § 2c) — the ±1 headcount
// control itself, presentational only. It holds no state, calls no server action, touches no router and
// raises no toast: it emits the RAW next value and the binding above it decides what that means.
//
// This markup is a UAT-passed money-adjacent surface (08-17 step 2). It was extracted, not rewritten — the
// hit areas, the read-only input, the arrow-key handlers and the muted helper are the shipped ones, and
// only the strings became props. The reserve page's rendered output did not change by a single character.
//
// Two bindings compose it today:
//   · pax-stepper.tsx  — the shipped reserve-page binding. Server-authoritative `declaredPax`, re-priced
//     through a server action on every change.
//   · pass-stepper.tsx — the pre-hold binding for a drop-in listing. Local state, lifted into the listing
//     rail, because the capacity claim happens at HOLD time (09-RESEARCH Pattern 1) and the number must
//     therefore exist before the hold is placed.
//
// ⚠️ THE ZERO-ARITHMETIC CONTRACT, inherited verbatim from price-breakdown.tsx and PROVEN BY ABSENCE. This
// file contains NO price of any kind: no money formatter, no fee, no multiplication, no total. A headcount
// control that computed a price would be showing a number PayMongo has not agreed to charge — the
// core-value trust failure (08-UI-SPEC Open Q5 / T-08-12 / T-09-38). Every peso figure arrives as a
// server-computed prop, exactly as PriceBreakdown's do.
//
// ⚠️ GREP GATE — AND IT NOW SPANS THREE FILES. "No client price math here" is checked by grepping for the
// money formatter, the frozen-total field name and the currency glyph: all three must return zero on THIS
// file AND on both bindings, because the markup moved here while the state stayed there. A gate left behind
// on a file that no longer holds the markup is not a gate. A named React import is used below, never a
// namespace one, so no line of code carries a stray multiplication glyph either. The only arithmetic
// anywhere in this trio is on HEADCOUNTS (±1 and a clamp); if you ever need a money figure here, you have
// taken a wrong turn — pass it down as a server-computed prop.
//
// CLAMPING IS THE BINDING'S JOB, NOT THIS FILE'S. `min`/`max` disable the buttons, but the emitted value is
// raw: only the binding knows whether its ceiling is a listing's own cap or a date's live remaining count,
// and in both cases only the SERVER's own re-clamp is authoritative (each binding says so in its header).

import { MinusIcon, PlusIcon } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";

export function StepperControl({
  id,
  label,
  helper,
  value,
  min,
  max,
  disabled,
  decrementLabel,
  incrementLabel,
  onCommit,
}: {
  /** Ties the label to the input. Two steppers on one page must never share one. */
  id: string;
  label: string;
  /** Muted microcopy under the control. Composed by the binding — never a price. */
  helper: string;
  value: number;
  min: number;
  /** Courtesy bound only; the server re-clamps. See each binding's header. */
  max: number;
  /** In-flight lock, for a binding whose commit round-trips to the server. */
  disabled?: boolean;
  decrementLabel: string;
  incrementLabel: string;
  /** Receives the RAW next value (may sit outside min/max); the binding clamps and decides. */
  onCommit: (next: number) => void;
}) {
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <InputGroup className="h-11 w-40">
        <InputGroupAddon align="inline-start">
          <InputGroupButton
            className="size-9"
            aria-label={decrementLabel}
            disabled={atMin || disabled}
            onClick={() => onCommit(value - 1)}
          >
            <MinusIcon />
          </InputGroupButton>
        </InputGroupAddon>
        {/* Read-only by design: the value changes only through a committed decision by the binding above —
            on the reserve page that is a server re-quote. Arrow keys keep it fully keyboard-operable. */}
        <InputGroupInput
          id={id}
          type="number"
          inputMode="numeric"
          readOnly
          min={min}
          max={max}
          className="text-center tabular-nums"
          value={value}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              onCommit(value + 1);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              onCommit(value - 1);
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            className="size-9"
            aria-label={incrementLabel}
            disabled={atMax || disabled}
            onClick={() => onCommit(value + 1)}
          >
            <PlusIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <p className="text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}
