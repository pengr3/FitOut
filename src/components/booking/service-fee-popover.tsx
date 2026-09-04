"use client";

// D-39 (BFLOW-04 · 12-UI-SPEC § The fee explains itself through a popover) — THE ONE FEE EXPLAINER.
// One component, three call sites (the listing rail, the mobile booking sheet, checkout), because it
// is mounted inside `PriceBreakdown` and `PriceBreakdown` is what renders all three.
//
// ── A POPOVER, NOT A TOOLTIP, AND THAT IS A PRODUCT DECISION RATHER THAN A COMPONENT PREFERENCE ──
// Roughly half of this traffic is touch, where a hover-only affordance is not "a subtle explanation"
// — it is an explanation that does not exist. `search-result-card.tsx` reasoned this through and
// refused a tooltip for the same reason on the same path; `tooltip.tsx` and `popover.tsx` both ship
// in this tree, so availability was never the constraint. The trigger therefore opens on CLICK, and
// `e2e/price-one-fact.spec.ts` asserts the NEGATIVE too — that a hover does not open it — because a
// popover that also opens on hover has quietly become the thing that was rejected.
//
// NOT A SHEET EITHER. A full-height overlay for one sentence about a fee is a bigger interruption
// than the question deserves, and on the mobile path the booking sheet is already the overlay.
//
// ── EVERY DISMISSAL BEHAVIOUR IS RADIX'S, ON PURPOSE ────────────────────────────────────────────
// Click-outside, `Escape`, focus return to the trigger and collision-aware positioning are all owned
// by the vendored `ui/popover.tsx`. NONE of them is re-implemented here. A second focus-trap
// implementation is precisely what `patterns/responsive-dialog.tsx` exists to prevent in this
// codebase, and a hand-rolled one is where overlays fail for keyboard and screen-reader users. If a
// behaviour below looks missing, it is because Radix already does it — do not "add" it.
//
// ── THE BODY NAMES NO PERCENTAGE, ON TWO INDEPENDENT GROUNDS ────────────────────────────────────
// (1) `SERVICE_FEE_BPS` is server-only (D-34 / GATE-05) and a NON-PUBLIC env override is not inlined
//     into the browser bundle. A hardcoded "5%" in a client component is therefore a number that can
//     silently go stale while checkout charges something else — the number going UP between browsing
//     and paying, which is the exact D-75 failure the all-in rate exists to prevent.
// (2) The fee's AMOUNT is on the line immediately beside this trigger, in the currency the booker is
//     actually charged. A rate adds nothing they need in order to decide.
// Same honest-omission rule that refused an SLA hour count (D-47) and a promised total (D-37). The
// e2e asserts the rendered body contains no `%` character at all (12-UI-SPEC AC#12), so this is a
// property of the DOM rather than a note in a file.
//
// ── WHY THE STRINGS LIVE HERE AND ARE NOT WRITTEN AT THE CALL SITE ──────────────────────────────
// `price-breakdown.tsx` carries a GREP TRIPWIRE over its WHOLE SOURCE, comments included, and
// `tests/design/price-surface.test.ts` enforces it. Every new booker-facing sentence written into
// that file is a new sentence inside the scanned region. Keeping this copy in its own module means
// the call site gains a component and not a paragraph.

import { InfoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * The trigger's accessible name — a QUESTION, because that is what the booker is asking and what a
 * screen-reader user needs to hear before deciding to open anything. It is an `aria-label` rather
 * than a `title`: a `title` attribute renders as a browser tooltip, which would smuggle the rejected
 * hover-only affordance back in through the platform. There is deliberately no `title` on this
 * element and the e2e asserts its absence.
 */
const TRIGGER_LABEL = "What is the service fee?";

/** The popover's heading. The SAME words as the line it explains (C1 / D-73's exact label). */
const POPOVER_TITLE = "Service fee";

/**
 * The body. Three sentences, in the order a booker needs them: what it is, what it buys, and the one
 * thing about it that can cost them money later.
 *
 * The third sentence is not a hedge and must not be softened — the D-74 fee funds the ~2.5% gateway
 * cost PayMongo does not return on a refund, so it genuinely is not refunded, and a booker who
 * discovers that only at cancellation time discovers it as a surprise charge.
 *
 * ⚠️ NO `%`, NO RATE, NO FIGURE OF ANY KIND. See the header for both reasons.
 */
const POPOVER_BODY =
  "A platform fee, already included in the rate you saw. It covers payment processing and support. " +
  "It isn't refunded if you cancel.";

/**
 * The fee line's explainer. Takes NO props at all — no money, no rate, no surface flag.
 *
 * Propless is the point rather than an accident: the whole BFLOW-04 claim is that the rail and
 * checkout show one fact, so this explanation cannot be allowed to differ between them. A component
 * with nothing to vary cannot vary.
 */
export function ServiceFeePopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={TRIGGER_LABEL}
          // 44px (`size-11`) is the WCAG 2.5.5 target size, already on the 4px grid (4 × 11), already
          // this app's declared `size="touch"` step and already a declared Phase-12 exception. It
          // overrides `size="icon"`'s 32px through tailwind-merge; the variant is still asked for so
          // the button keeps `icon`'s square shape rather than a text button's horizontal padding.
          //
          // `-my-3` IS THE MEASUREMENT, NOT A NUDGE. A 44px control dropped into a `text-sm` row
          // (20px line box) would make the fee line 24px taller than the run line directly above it
          // — a breakdown whose middle row is twice the height of its neighbours reads as a defect,
          // and it would change a UAT-passed checkout surface's geometry for a reason the booker
          // cannot see. -12px top and bottom returns the MARGIN box to 20px while the BORDER box —
          // which is what a pointer and `boundingBox()` both measure — stays 44 × 44. The 12px that
          // overflows each way sits over plain text, so no other target is covered.
          className="-my-3 size-11 shrink-0 rounded-full text-muted-foreground"
        >
          <InfoIcon className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      {/* `w-66` (264px) narrows the vendored 288px default to the width the spec bounds this content
          to. Everything else — `bg-popover text-popover-foreground`, `shadow-overlay`, the hairline
          ring and the collision-aware placement — comes from `ui/popover.tsx` and is deliberately
          NOT restated: `tests/design/elevation-z.test.ts` pins the elevation step's call sites per
          file, and re-declaring `shadow-overlay` here would add a surface to that inventory for a
          shadow this component does not own.

          `align="start"` so the bubble hangs from the label it explains rather than centring over a
          money column it says nothing about. */}
      <PopoverContent align="start" className="w-66">
        <PopoverHeader>
          <PopoverTitle>{POPOVER_TITLE}</PopoverTitle>
          <PopoverDescription>{POPOVER_BODY}</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
