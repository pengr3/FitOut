"use client";

// D-41 (BFLOW-04 · 12-UI-SPEC § Typography rule 3) — THE RAIL'S ALL-IN RATE HEADLINE, AND THE ONE
// STATE IT IS ALLOWED TO EXIST IN.
//
// ── WHY THIS FILE EXISTS AT ALL ──────────────────────────────────────────────────────────────────
// The headline used to be three `<p>` elements written inline at the top of the booking rail in
// `src/app/listings/[id]/(detail)/page.tsx`. It moved here for exactly one reason: whether it may be
// on screen depends on the SELECTION the booker is holding in the browser, and an RSC cannot know
// that. It is the smallest possible client leaf — it reads `useBookingSelection()` and renders or
// returns null.
//
// ── THE REASON IT DISAPPEARS, WHICH IS THE WHOLE POINT (D-41) ────────────────────────────────────
// Plan 12-05 puts the REAL `PriceBreakdown` in this rail, itemised. Its run line reads
//
//     ₱473.33/hr × 2 hours
//
// built from the host's raw SPACE rate, because the D-74 service fee is disclosed on its own line
// directly beneath it. This headline reads
//
//     ₱497.00/hr
//
// because browse surfaces quote the ALL-IN rate (D-75), fee already composed in. BOTH ARE CORRECT.
// They are not the same rate, and with the breakdown in the rail they would sit roughly 60px apart
// wearing the same `/hr` suffix — two different numbers, same unit, same panel, at the moment money
// commits. That is not a nuance; it is the panel contradicting itself.
//
// So the headline persists in the NO-SELECTION state — a booker who deep-links here (or who arrives
// from search with an unhonourable window) must still see a price — and is REMOVED the moment a
// selection exists, because from that moment the breakdown states the same fact more precisely.
//
// ⚠️ REJECTED, AND RECORDED SO IT IS NOT "RESTORED" AS A REGRESSION FIX: labelling the breakdown's
// run line `Space rate` and keeping both on screen. It resolves the ambiguity by introducing a term
// the booker meets NOWHERE else in the product — on the one panel where money commits. A word that
// exists only to explain a layout accident is a worse fix than removing the accident. If you are
// here because the headline "vanished", that is this component working; do not add it back beneath
// the breakdown.
//
// ── WHAT THIS COMPONENT MAY NOT DO ──────────────────────────────────────────────────────────────
// It FORMATS NOTHING and COMPUTES NOTHING. The strings arrive already composed by `allInRateParts`
// (`@/lib/booking/all-in-rate.ts`), which carries `import "server-only"` precisely so the fee rate
// and the formula stay out of the browser bundle (D-34 / GATE-05). This file receives finished
// display strings and decides only whether to render them.

import { useBookingSelection } from "@/components/availability/availability-calendar";

type RailRateHeadlineProps = {
  /**
   * The listing's advertised rate parts, ALREADY FORMATTED and already all-in — `allInRateParts`'s
   * output, e.g. `["₱497.00/hr", "₱3,033.32/day"]` or `["₱262.50/person"]`. May be empty, in which
   * case the rail says `Price on request`, exactly as it did before this component existed.
   */
  parts: string[];
};

/**
 * The rail's rate headline. Renders ONLY while the booker has made no selection of either kind.
 *
 * Both selection channels are consulted because a listing is exactly one mode and the two are
 * mutually exclusive: an exclusive listing writes `selection`, a drop-in listing writes
 * `openSelection`, and reading only the first would have left the headline on screen for the whole
 * drop-in path — the mode this rail's `/person` headline collides with just as squarely.
 */
export function RailRateHeadline({ parts }: RailRateHeadlineProps) {
  const { selection, openSelection } = useBookingSelection();
  if (selection != null || openSelection != null) return null;

  return (
    <div>
      <p className="text-2xl font-semibold tracking-tight">{parts[0] ?? "Price on request"}</p>
      {parts[1] && <p className="text-sm text-muted-foreground">{parts[1]}</p>}
      {parts.length > 0 && <p className="text-sm text-muted-foreground">Service fee included</p>}
    </div>
  );
}
