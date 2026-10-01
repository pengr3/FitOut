// Pure range-fill gesture core for the booker SlotPicker (AVAIL-04/05 · D-22/D-23 · sketch 001 variant A).
//
// This module is intentionally DOM/React/Radix-free — it imports ONLY the AvailabilitySlot *type*, so it
// runs in node and is unit-testable in isolation (tests/availability/slot-selection.test.ts). The picker
// (slot-picker.tsx) is the thin DOM shell that renders state and feeds clicks through this reducer.
//
// The first click chooses a start; the second chooses the exclusive checkout boundary.
// A 12:00–1:00 choice therefore reserves one hour. A gap truncates the run before the
// first unavailable hour. Clicking the same or an earlier time re-anchors the start.
//
// The picker stays ADVISORY (Pitfall 6): the DB booking_no_overlap EXCLUDE constraint is the sole booking
// authority. Nothing here touches the DB, schema, or a server action — it is client interaction only.

import type { AvailabilitySlot } from "@/lib/availability/read-model";

/** A committed, contiguous, all-available selected run as [lo, hi] indices into `slots`. */
export type Run = { lo: number; hi: number };

/**
 * The whole gesture state. Invariants (upheld by the reducers below):
 *   - `fullDay` is mutually exclusive with `run`/`anchor` (setting one clears the others).
 *   - `anchor` (pending start) is set only while `run` is null; the lifted value is null until an end.
 *   - `gapIndex` is the truncating slot's index when a fill was cut short, else null.
 */
export type SelectionState = {
  run: Run | null;
  anchor: number | null;
  fullDay: boolean;
  gapIndex: number | null;
};

/** The UNCHANGED lifted contract consumed by availability-calendar.tsx (re-exported by slot-picker.tsx). */
export type SlotSelectionValue = { startUtc: string; endUtc: string; fullDay: boolean };

/** The clean, nothing-selected starting state. */
export const EMPTY_SELECTION: SelectionState = {
  run: null,
  anchor: null,
  fullDay: false,
  gapIndex: null,
};

/** A slot is fillable iff its read-model state is exactly "available" (occupied/past/beyond are not). */
export function isAvailable(slots: AvailabilitySlot[], i: number): boolean {
  return slots[i]?.state === "available";
}

/**
 * The last index reachable from `lo` (inclusive) without crossing an unavailable hour, capped at `hi`.
 * `lo` is assumed available (the caller only reaches here from two available clicks).
 */
export function contiguousEnd(slots: AvailabilitySlot[], lo: number, hi: number): number {
  let j = lo;
  while (j < hi && isAvailable(slots, j + 1)) j++;
  return j;
}

/** The first unavailable index in [lo, hi], or -1 if the whole span is available. */
export function firstGap(slots: AvailabilitySlot[], lo: number, hi: number): number {
  for (let k = lo; k <= hi; k++) if (!isAvailable(slots, k)) return k;
  return -1;
}

/**
 * Apply a start or exclusive end-boundary click. `index === slots.length` is the
 * operating day's closing boundary. A second click at an earlier time re-anchors.
 * Always returns a NEW state (or the same reference on the no-op) — never mutates the input.
 */
export function resolveClick(
  state: SelectionState,
  index: number,
  slots: AvailabilitySlot[],
): SelectionState {
  // The second click names the checkout boundary. The hour beginning there is excluded,
  // even when that next hour has already been booked by someone else.
  if (state.anchor !== null && !state.run && index > state.anchor && index <= slots.length) {
    const endIndex = index - 1;
    const gapIndex = firstGap(slots, state.anchor, endIndex);
    return {
      run: { lo: state.anchor, hi: gapIndex === -1 ? endIndex : gapIndex - 1 },
      anchor: null,
      fullDay: false,
      gapIndex: gapIndex === -1 ? null : gapIndex,
    };
  }
  if (!isAvailable(slots, index)) return state;

  // A completed run starts over on the next click; the first click only sets a start.
  if (state.run || state.anchor === null) {
    return { run: null, anchor: index, fullDay: false, gapIndex: null };
  }

  // An earlier (or the same) time starts a new choice.
  return { run: null, anchor: index, fullDay: false, gapIndex: null };
}

/**
 * Rebuild the gesture state from an already-lifted selection — the inverse of `selectionValue` below.
 *
 * Phase-12 (D-59 #1): the listing RSC can now seed the booker's SEARCHED window into the shared booking
 * context, and a picker that mounted with an empty reducer would render that window as un-pressed chips
 * — the rail claiming a selection the grid denies. This is what keeps the two honest.
 *
 * IT RE-VALIDATES RATHER THAN TRUSTS. The value is matched against the slots THIS picker was handed: an
 * unknown boundary, an inverted run, or any unavailable hour inside the span degrades to
 * EMPTY_SELECTION. So a stale or crafted selection can never paint a run over hours the read model
 * says are taken — the picker stays advisory (the DB EXCLUDE constraint is the sole authority) without
 * having to trust whatever handed it a value.
 */
export function seedSelection(
  value: SlotSelectionValue | null,
  slots: AvailabilitySlot[],
): SelectionState {
  if (!value) return EMPTY_SELECTION;
  if (value.fullDay) return { run: null, anchor: null, fullDay: true, gapIndex: null };

  const lo = slots.findIndex((s) => s.startUtc === value.startUtc);
  const hi = slots.findIndex((s) => s.endUtc === value.endUtc);
  if (lo < 0 || hi < 0 || hi < lo) return EMPTY_SELECTION;
  for (let i = lo; i <= hi; i++) if (!isAvailable(slots, i)) return EMPTY_SELECTION;

  return { run: { lo, hi }, anchor: null, fullDay: false, gapIndex: null };
}

/** Toggle "Book full day" (D-23), mutually clearing any run / pending anchor / gap hint. */
export function resolveFullDay(state: SelectionState): SelectionState {
  return { run: null, anchor: null, fullDay: !state.fullDay, gapIndex: null };
}

/**
 * Lift the gesture to the UNCHANGED {startUtc,endUtc,fullDay} contract (or null while pending/empty):
 *   - full-day → the whole day's first.startUtc … last.endUtc
 *   - committed run → slots[lo].startUtc … slots[hi].endUtc
 *   - anchor-only (pending) or empty → null, so the rail shows no stale summary.
 */
export function selectionValue(
  state: SelectionState,
  slots: AvailabilitySlot[],
): SlotSelectionValue | null {
  if (state.fullDay) {
    const first = slots[0];
    const last = slots[slots.length - 1];
    if (!first || !last) return null;
    return { startUtc: first.startUtc, endUtc: last.endUtc, fullDay: true };
  }
  if (state.run) {
    const lo = slots[state.run.lo];
    const hi = slots[state.run.hi];
    if (!lo || !hi) return null;
    return { startUtc: lo.startUtc, endUtc: hi.endUtc, fullDay: false };
  }
  return null;
}
