// Pure unit test for the range-fill gesture core (src/components/availability/slot-selection.ts).
//
// Mirrors tests/availability/slots.test.ts: a pure, no-DB, no-DOM unit test that drives the gesture
// reducer directly. This is the deterministic guard for the riskiest rule — gap truncation — plus the
// re-anchor, same-anchor 1-hour, full-day mutual-clear, and the null-on-pending selection lift.
//
// Fixture mirrors the E2E seed shape: venue-local hours 06:00–21:00 (15 on-the-hour slots, indices are
// the hour minus 6), with 08:00 (index 2) and 10:00 (index 4) unavailable — exactly the booking
// (08:00–09:00) and whole-listing block (10:00–11:00) the availability spec seeds. The startUtc/endUtc
// strings are synthetic-but-consistent instants; the pure core never does tz math, it only reads them.

import { describe, it, expect } from "vitest";
import type { AvailabilitySlot } from "@/lib/availability/read-model";
import {
  EMPTY_SELECTION,
  isAvailable,
  contiguousEnd,
  firstGap,
  resolveClick,
  resolveFullDay,
  selectionValue,
  type SelectionState,
} from "@/components/availability/slot-selection";

const pad = (n: number) => String(n).padStart(2, "0");

/** One on-the-hour slot at venue-local `hour:00`. Synthetic UTC instants — the core does no tz math. */
function slot(hour: number, state: AvailabilitySlot["state"]): AvailabilitySlot {
  return {
    startUtc: `2026-08-03T${pad(hour)}:00:00.000Z`,
    endUtc: `2026-08-03T${pad(hour + 1)}:00:00.000Z`,
    state,
    freeUnits: state === "available" ? 1 : 0,
    unitCount: 1,
  };
}

// 06:00..20:00 starts (15 slots ending 21:00). 08:00 = index 2, 10:00 = index 4 are unavailable.
const slots: AvailabilitySlot[] = Array.from({ length: 15 }, (_, i) => {
  const unavailable = i === 2 || i === 4;
  return slot(6 + i, unavailable ? "unavailable" : "available");
});

/** Convenience: the state after clicking a fresh anchor at `index` from EMPTY. */
const anchorAt = (index: number): SelectionState => resolveClick(EMPTY_SELECTION, index, slots);

describe("isAvailable / contiguousEnd / firstGap — the pure fill primitives", () => {
  it("isAvailable reflects the slot state (available vs not, out-of-bounds is false)", () => {
    expect(isAvailable(slots, 0)).toBe(true);
    expect(isAvailable(slots, 2)).toBe(false); // 08:00 booked
    expect(isAvailable(slots, 4)).toBe(false); // 10:00 blocked
    expect(isAvailable(slots, 999)).toBe(false);
  });

  it("contiguousEnd stops at the last available hour before a gap, capped at hi", () => {
    // 07:00 (1) → 09:00 (3), but 08:00 (2) is a gap → reachable end is 07:00 (1).
    expect(contiguousEnd(slots, 1, 3)).toBe(1);
    // A clean run 17:00 (11) → 20:00 (14) reaches all the way.
    expect(contiguousEnd(slots, 11, 14)).toBe(14);
    // lo === hi is always itself (a 1-hour block).
    expect(contiguousEnd(slots, 5, 5)).toBe(5);
  });

  it("firstGap returns the first unavailable index in [lo,hi], or -1 when the run is clean", () => {
    expect(firstGap(slots, 1, 3)).toBe(2); // 08:00 is the first gap
    expect(firstGap(slots, 11, 14)).toBe(-1); // clean run
  });
});

describe("resolveClick — the range-fill gesture reducer", () => {
  it("EMPTY_SELECTION is a clean, run-less, anchor-less, gap-less, non-full-day state", () => {
    expect(EMPTY_SELECTION).toEqual({ run: null, anchor: null, fullDay: false, gapIndex: null });
  });

  it("first click sets a PENDING START anchor (no run, no gap) — selection still null", () => {
    const s = resolveClick(EMPTY_SELECTION, 0, slots);
    expect(s).toEqual({ run: null, anchor: 0, fullDay: false, gapIndex: null });
    expect(selectionValue(s, slots)).toBeNull();
  });

  it("adjacent fill: anchor 06:00 then end 07:00 → run {0,1}, anchor cleared, no gap", () => {
    const s = resolveClick(anchorAt(0), 1, slots);
    expect(s).toEqual({ run: { lo: 0, hi: 1 }, anchor: null, fullDay: false, gapIndex: null });
  });

  it("non-adjacent CLEAN fill: anchor 17:00 then end 20:00 → run {11,14}, no gap", () => {
    const s = resolveClick(anchorAt(11), 14, slots);
    expect(s).toEqual({ run: { lo: 11, hi: 14 }, anchor: null, fullDay: false, gapIndex: null });
  });

  it("earlier-direction fill: anchor 09:00 then end 07:00 → truncates at 08:00 gap → run {1,1}, gap 2", () => {
    const s = resolveClick(anchorAt(3), 1, slots);
    expect(s).toEqual({ run: { lo: 1, hi: 1 }, anchor: null, fullDay: false, gapIndex: 2 });
  });

  it("gap TRUNCATION: anchor 07:00 then end 09:00 → run {1,1} (end < hi) with gapIndex 2 (08:00)", () => {
    const s = resolveClick(anchorAt(1), 3, slots);
    expect(s).toEqual({ run: { lo: 1, hi: 1 }, anchor: null, fullDay: false, gapIndex: 2 });
  });

  it("same-anchor click = a 1-hour block: anchor 11:00 then 11:00 → run {5,5}, no gap", () => {
    const s = resolveClick(anchorAt(5), 5, slots);
    expect(s).toEqual({ run: { lo: 5, hi: 5 }, anchor: null, fullDay: false, gapIndex: null });
  });

  it("re-anchor after a completed run: clicking an IN-RUN index resets to a fresh anchor", () => {
    const run: SelectionState = { run: { lo: 11, hi: 14 }, anchor: null, fullDay: false, gapIndex: null };
    const s = resolveClick(run, 12, slots); // 12 is inside [11,14]
    expect(s).toEqual({ run: null, anchor: 12, fullDay: false, gapIndex: null });
  });

  it("re-anchor after a completed run: clicking an OUT-OF-RUN available index also re-anchors", () => {
    const run: SelectionState = { run: { lo: 11, hi: 14 }, anchor: null, fullDay: false, gapIndex: null };
    const s = resolveClick(run, 6, slots);
    expect(s).toEqual({ run: null, anchor: 6, fullDay: false, gapIndex: null });
  });

  it("clicking a chip while full-day is on clears full-day AND sets a fresh anchor (mutual clear)", () => {
    const full: SelectionState = { run: null, anchor: null, fullDay: true, gapIndex: null };
    const s = resolveClick(full, 6, slots);
    expect(s).toEqual({ run: null, anchor: 6, fullDay: false, gapIndex: null });
  });

  it("DEFENSIVE: clicking an UNAVAILABLE index returns the state unchanged", () => {
    expect(resolveClick(EMPTY_SELECTION, 2, slots)).toEqual(EMPTY_SELECTION);
    const pending = anchorAt(1);
    expect(resolveClick(pending, 4, slots)).toEqual(pending); // 10:00 is unavailable
  });
});

describe("resolveFullDay — toggle full-day, mutually clearing any run/anchor/gap", () => {
  it("toggles full-day on from EMPTY, zeroing run/anchor/gap", () => {
    expect(resolveFullDay(EMPTY_SELECTION)).toEqual({
      run: null,
      anchor: null,
      fullDay: true,
      gapIndex: null,
    });
  });

  it("toggles full-day back off", () => {
    const on = resolveFullDay(EMPTY_SELECTION);
    expect(resolveFullDay(on)).toEqual({ run: null, anchor: null, fullDay: false, gapIndex: null });
  });

  it("turning full-day on clears a committed run and any pending gap", () => {
    const truncated = resolveClick(anchorAt(1), 3, slots); // run {1,1} + gapIndex 2
    const s = resolveFullDay(truncated);
    expect(s).toEqual({ run: null, anchor: null, fullDay: true, gapIndex: null });
  });
});

describe("selectionValue — the UNCHANGED lifted contract (null on pending)", () => {
  it("is null for EMPTY and for an anchor-only (pending) state", () => {
    expect(selectionValue(EMPTY_SELECTION, slots)).toBeNull();
    expect(selectionValue(anchorAt(5), slots)).toBeNull();
  });

  it("lifts a committed run as slots[lo].startUtc → slots[hi].endUtc, fullDay:false", () => {
    const run = resolveClick(anchorAt(11), 14, slots);
    expect(selectionValue(run, slots)).toEqual({
      startUtc: slots[11].startUtc,
      endUtc: slots[14].endUtc,
      fullDay: false,
    });
  });

  it("lifts full-day as first.startUtc → last.endUtc, fullDay:true", () => {
    const full = resolveFullDay(EMPTY_SELECTION);
    expect(selectionValue(full, slots)).toEqual({
      startUtc: slots[0].startUtc,
      endUtc: slots[slots.length - 1].endUtc,
      fullDay: true,
    });
  });
});
