// SpotsLeftChip (OPEN-04 · OC-11 / OC-12 / OC-13 — 09-UI-SPEC § Spots-left contract) — the three-state
// scarcity chip. It renders what the server already decided, and nothing else.
//
// ⚠️ `state` IS DECIDED SERVER-SIDE AND PASSED STRAIGHT THROUGH, exactly as HeadcountMeter's `full` is
// (headcount-meter.tsx:50-54). This component must never re-derive it, must never import the server's
// low-stock ceiling or the threshold helper that reads it, and must never compare `remaining` to a literal
// of any kind. Two shipped precedents make that non-negotiable:
//   · D-100 — `bookingMode` rides along on DayAvailability "so the picker's minimum-notice copy can never
//     disagree with the thresholds the server actually enforces" (availability-calendar.tsx:213-215).
//   · D-75 — a non-public server tunable is NOT inlined into the browser bundle, so a browser-side copy of
//     its default silently disagrees with the server (availability-calendar.tsx:236-242). The low-stock
//     ceiling has exactly that exposure profile.
// Scarcity is a fact about the CLAIM, and only the claim's own basis can decide it (T-09-13).
//
// THE COPY IS THE CONTRACT (O4 / O5). Each of the three strings below appears exactly ONCE in this file,
// in the markup — they are deliberately not restated up here, so that grepping this file for a state's
// wording stays a usable drift tripwire for the surfaces that mount the chip.
//   open → the generic wording, carrying NO number. The read model supplies only {remaining, cap} and so
//          cannot substantiate "Almost gone!", "Selling fast" or "{N} people are viewing"; a scarcity
//          signal that is always on is noise, and invented urgency is a dark pattern (T-09-39). The
//          absence of a digit in this state is an executable rule — see the test file.
//   low  → the exact count, in one sentence whose singular form is the SAME string. Never a second copy
//          for one spot, never "Last one!".
//   full → the sold-out wording, muted and calm. Selling out is a normal marketplace outcome, never a
//          failure: no failure token, no red, no warning hue, no new token. OC-14 — v1 ships no
//          back-in-stock alert of any kind (DISC-02 stays deferred), so this state must not offer one.
//          Its next step is another day, and the day panel supplies that sentence. Never advertise a
//          mechanism that does not exist.
//
// NEVER INTERACTIVE. The chip is a span inside a status container: no click handler, no button element, no
// tab index. A date change is announced because that container carries a status role — the shipped
// SlotPicker gap-hint affordance (slot-picker.tsx:242-244).
//
// Not "use client": pure presentation, rendered directly by server components and client pickers alike.

import { CalendarX2Icon, UsersRoundIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SpotsState } from "@/lib/availability/open-capacity";

// 14/600 — the Label role 09-UI-SPEC § Typography gives every chip state, applied to all three so the chip
// does not change size as a date's scarcity changes. Never Heading or Display scale: urgency is carried by
// the wording and the soft tint, not by size (§ Typography, "no new Display-scale figure").
const CHIP_BASE = "h-7 gap-1.5 px-2.5 text-sm font-semibold";

export function SpotsLeftChip({
  state,
  remaining,
  className,
}: {
  /** Server-decided (see header). Never re-derived, never second-guessed. */
  state: SpotsState;
  /** Shown ONLY in the `low` state (O4). */
  remaining: number;
  className?: string;
}) {
  const chip =
    state === "low" ? (
      // The soft accent tint, reused verbatim from the SlotPicker gap hint (slot-picker.tsx:245-247) —
      // which is why this needs no new token. Coral here is one of the five uses § Color enumerates.
      <Badge
        variant="outline"
        className={cn(CHIP_BASE, "border-brand/30 bg-brand/10 text-foreground")}
      >
        <UsersRoundIcon aria-hidden="true" className="text-brand" />
        <span className="tabular-nums">Only {remaining} left</span>
      </Badge>
    ) : state === "full" ? (
      // A different glyph, not just a different colour — the non-colour signal § Color demands.
      <Badge variant="secondary" className={cn(CHIP_BASE, "text-muted-foreground")}>
        <CalendarX2Icon aria-hidden="true" />
        Fully booked
      </Badge>
    ) : (
      <Badge variant="secondary" className={cn(CHIP_BASE, "text-muted-foreground")}>
        <UsersRoundIcon aria-hidden="true" />
        Spots available
      </Badge>
    );

  // A `span`, NOT a `div`, and that is a correctness requirement rather than a preference (11-11).
  // The search tile now renders through `patterns/result-card.tsx`, which wraps every `meta` line in a
  // `<p>`. `<p>` accepts PHRASING content only: an HTML parser closes the paragraph the moment it meets
  // a `<div>`, so React's tree and the browser's tree disagree and the row hydrates mismatched. A span
  // with `inline-flex` paints identically to the div it replaces — same box, same layout — and
  // `role="status"` + `aria-live` are element-agnostic, so nothing changes for assistive tech either.
  return (
    <span role="status" aria-live="polite" className={cn("inline-flex", className)}>
      {chip}
    </span>
  );
}
