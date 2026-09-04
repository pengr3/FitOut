"use client";

// The `/dev/theme` availability pane's client boundary.
//
// WHY THIS FILE EXISTS AT ALL — one reason, and it is structural rather than stylistic. `SlotPicker`
// takes an `onSelectionChange` callback, and a Server Component cannot hand a function to a client
// component. `page.tsx` must stay a Server Component (it exports `metadata` and calls the
// build-time production guard), so the callback has to be supplied from inside a `"use client"`
// module. This is that module and it does nothing else.
//
// WHY THE SELECTED RUN IS DRIVEN THROUGH THE REAL GESTURE INSTEAD OF PASSED AS A PROP. The picker
// owns its selection state deliberately — the whole gesture (anchor, contiguous fill, truncate at a
// busy hour, full-day) lives in its own reducer, and the server read model is the authority for what
// is bookable. It exposes NO controlled-selection prop, and adding one to a shipped booking
// component so that a preview page could pre-tint three chips would be changing product code to suit
// a preview. So the preview does what a reviewer would do: it clicks two hours. Two real clicks
// through the real handler produce the real committed run, which means this pane shows the accent in
// exactly the state a booker puts it in, not an approximation of it.
//
// The two clicks are one frame apart ON PURPOSE. The picker's click handler closes over the current
// selection state, so two clicks inside one tick would both be read against the EMPTY state and the
// second would re-anchor instead of completing the run — a preview showing one tinted chip rather
// than three, with nothing to indicate anything went wrong.
//
// IT DEGRADES TO NOTHING, NEVER TO A BROKEN PAGE. Every step is optional-chained: if the markup ever
// stops matching, the pane renders an unselected picker and the rest of the page is untouched. This
// is a preview affordance, not a behaviour anything depends on — and it is recorded in
// `10-16-SUMMARY.md` under Known Stubs rather than left to be discovered.

import * as React from "react";

import { SlotPicker } from "@/components/availability/slot-picker";

import { SLOT_DAY } from "./fixtures";

/**
 * Module-level so its identity is stable across renders — the picker memoises on this prop, and a
 * fresh arrow per render would rebuild that callback on every keystroke of a reviewer's interaction.
 */
const IGNORE_SELECTION = () => {};

/** Which two chips to click: the first available hour, and the third, giving a three-hour run. */
const RUN_START = 0;
const RUN_END = 2;

export function SlotPickerPreview() {
  const host = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Only the enabled chips: the occupied hours render `disabled`, so this index space is the
    // AVAILABLE hours and the run below can never straddle the busy pair.
    const chips = host.current
      ?.querySelector('[data-slot="toggle-group"]')
      ?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
    if (!chips) return;

    chips[RUN_START]?.click();
    const frame = window.requestAnimationFrame(() => chips[RUN_END]?.click());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div ref={host}>
      <SlotPicker {...SLOT_DAY} onSelectionChange={IGNORE_SELECTION} />
    </div>
  );
}
