"use client";

// PassStepper (OPEN-04 · OC-06 / OC-18 — 09-UI-SPEC § 2c) — how many passes the booker is asking for,
// chosen BEFORE the hold. Same shipped control as the reserve-page stepper, different binding.
//
// WHY PRE-HOLD, AND WHY THERE IS NO SECOND CHANCE. The capacity claim grants min(requested, remaining)
// inside the hold's own transaction (09-RESEARCH Pattern 1), and D-126 makes the head count FINAL at that
// instant: a drop-in booking refuses any later re-price outright, because a re-price that does not re-enter
// the claim is simultaneously an overbook vector and a price-tamper vector. So the number has to exist
// before the hold is placed. More passes afterwards means another booking, not an edit.
//
// CONTROLLED, NOT SELF-OWNED. The listing rail holds {date, passes} in the lifted selection context,
// because changing the picked date must reset the count to 1 and re-bound the max — the same rule the
// shipped calendar applies when a new day clears the prior slot selection (availability-calendar.tsx:127).
// A component owning its own state could not honour that from the outside. Hence no optimistic state, no
// server action and no router refresh either: nothing is persisted yet, so there is nothing to re-price.
//
// The `max` bound is a COURTESY, exactly as the reserve-page binding's is: the server re-clamps inside the
// claim transaction against the live admissions SUM, so a crafted request can only ever be granted DOWN,
// never up — this bound is not and cannot be the gate (T-09-05). Bounding by the picked date's remaining
// count is nonetheless deliberate: a booker cannot ASK for more passes than exist, so the OC-07 partial
// path stays reserved for a genuine race instead of firing on the happy path. OC-18 — `remaining` is the
// ONLY bound. v1 has no separate per-booker head cap, so one booker may legitimately take a whole day's
// remaining capacity.
//
// ⚠️ THE ZERO-ARITHMETIC CONTRACT applies here too — see stepper-control.tsx for the full rule and the grep
// gate. This binding computes no price of any kind; the rail's estimate is composed server-side and passed
// down. The only arithmetic below is the headcount clamp.

import { StepperControl } from "@/components/booking/stepper-control";

export function PassStepper({
  value,
  max,
  onChange,
}: {
  /** Owned by the rail's selection state, reset to 1 whenever the picked date changes. */
  value: number;
  /** The picked date's `remaining`, straight from the read model. Courtesy bound only (see header). */
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <StepperControl
      id="requested-passes"
      label="How many passes?"
      helper="One pass per person, including you."
      value={value}
      min={1}
      max={max}
      decrementLabel="Remove a pass"
      incrementLabel="Add a pass"
      onCommit={(next) => {
        // Clamp here, not in the control: only this binding knows what the ceiling means. The no-op guard
        // mirrors the reserve-page binding, so an arrow key at either end is silent rather than chatty.
        const clamped = Math.min(Math.max(1, next), max);
        if (clamped === value) return;
        onChange(clamped);
      }}
    />
  );
}
