// Pure range-fill gesture core for the booker SlotPicker (AVAIL-04/05 · D-22/D-23 · sketch 001 variant A).
//
// This module is intentionally DOM/React/Radix-free — it imports ONLY the AvailabilitySlot *type*, so it
// runs in node and is unit-testable in isolation (tests/availability/slot-selection.test.ts). The picker
// (slot-picker.tsx) is the thin DOM shell that renders state and feeds clicks through this reducer.
//
// The gesture (ported verbatim in behavior from the approved sketch's `rangefill` branch): click a START
// hour to set a pending anchor (selection stays null); click an END hour to fill the CONTIGUOUS available
// run between them, in either direction. If the run would cross an unavailable hour it TRUNCATES at the
// last available hour before the first gap and records that gap so the picker can show a soft hint. A
// same-anchor second click is a 1-hour block; a click after a completed run re-anchors a fresh start.
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
 * Apply a chip click at `index`. Ports the sketch's `rangefill` onClick exactly:
 *   1. unavailable index → no-op (defensive; the picker also disables these chips).
 *   2. full-day is cleared on any chip click (mutual clear).
 *   3. a committed run → RESET to a fresh anchor at `index` (fresh start after a completed run).
 *   4. no anchor yet → SET START anchor at `index` (selection still lifts null).
 *   5. second click = END → fill [min,max], truncating at the first gap; record gapIndex if cut short.
 * Always returns a NEW state (or the same reference on the no-op) — never mutates the input.
 */
export function resolveClick(
  state: SelectionState,
  index: number,
  slots: AvailabilitySlot[],
): SelectionState {
  if (!isAvailable(slots, index)) return state; // (1) unavailable chips can never be selected

  // (3) fresh start after a completed run, or (4) set the pending start anchor. Both clear full-day (2).
  if (state.run || state.anchor === null) {
    return { run: null, anchor: index, fullDay: false, gapIndex: null };
  }

  // (5) second click = end: fill the contiguous available run between the anchor and here.
  const lo = Math.min(state.anchor, index);
  const hi = Math.max(state.anchor, index);
  const end = contiguousEnd(slots, lo, hi);
  const gapIndex = end < hi ? firstGap(slots, lo, hi) : null; // truncated → name the blocking hour
  return { run: { lo, hi: end }, anchor: null, fullDay: false, gapIndex };
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
