"use client";

// BFLOW-06 / D-50 — THE CHECKOUT PRICE DISCLOSURE. The itemised lines go behind it; the Total never does.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THE REQUIREMENT ACTUALLY ASKS FOR, AND THE SENTENCE THAT DECIDES WHAT MAY GO INSIDE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// 12-UI-SPEC § Checkout: *"The booker never opens anything to see what they are PAYING — only to see how
// it was BUILT."* Collapsed, they still see the venue, the window and the amount: everything needed to
// know they are buying the right thing. What collapses is the derivation — the run line, the D-108
// surcharge line, the service-fee line — and nothing else.
//
// So this component takes ONLY the itemised lines as `children`. The `Total`, its `Separator` and the
// trailing disclosure sentence stay OUTSIDE it in `price-breakdown.tsx`, above the fold at every width
// and in every state. `e2e/mobile-booker-path.spec.ts` asserts that at 375px with this region collapsed,
// which is the measurement rather than the claim.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE ONE NEW VENDORED BLOCK IN THIS MILESTONE, AND WHY IT IS COMPOSED RATHER THAN HAND-ROLLED
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `ui/collapsible.tsx` is the thirty-first vendored primitive and the only registry block Phase 12 adds.
// The alternative — a `<button aria-expanded>` plus a `hidden` region — re-implements `aria-expanded`,
// `aria-controls`, the id wiring between them and the animation seam, for no gain;
// `REQUIREMENTS.md § Out of Scope` names *"rebuilding components shadcn already provides"* explicitly.
//
// ⚠ NEITHER `aria-expanded` NOR `aria-controls` IS WRITTEN IN THIS FILE, AND THAT IS THE POINT. Radix
// generates the content's id and wires both attributes onto the trigger. Hand-writing either would be
// the re-implementation the block was fetched to avoid, and — the sharper half — a hand-written
// `aria-controls` pointing at an id this file also has to invent is a pair that can drift, silently, in
// exactly the direction a screen-reader user cannot detect.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE TRIGGER IS A `Button`, WHICH IS HOW IT GETS 44px AND THE DS-05 FOCUS RING WITHOUT RESTATING EITHER
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `size="touch"` is the declared 44px control height (D-22), and the one app-wide focus recipe arrives
// through `buttonVariants`' base string — solid ring, explicit offset colour, no alpha. Writing a ring
// here instead would be a second recipe on a money surface, which is precisely what
// `tests/design/focus-recipe.test.ts` exists to prevent; 12-05's `ServiceFeePopover` reached the same
// conclusion for the same reason and is the analog to follow.
//
// `variant="ghost"` and NOT `brand`: the accent belongs to the ONE terminal action on this page
// (`Confirm & pay`, D-21's 10% accent budget). A coral disclosure trigger would put the page's strongest
// visual signal on the control that reveals arithmetic rather than on the control that spends money.

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

export function PriceDisclosure({
  itemCount,
  children,
}: {
  /**
   * How many itemised lines are inside. Counted by the caller from the SAME conditions that decide
   * whether each line renders (`price-breakdown.tsx`), never estimated here — a trigger promising two
   * items over a region holding three is a disclosure that misstates the thing it discloses.
   *
   * It is a COUNT and not a money value: nothing here reads, formats or derives a figure, which is what
   * keeps this component outside GATE-05's surface entirely.
   */
  itemCount: number;
  /** The run line, the D-108 surcharge line and the service-fee line. NEVER the Total — see the header. */
  children: React.ReactNode;
}) {
  return (
    <Collapsible data-testid="price-disclosure">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="touch"
          // `w-full justify-between` overrides `buttonVariants`' centred layout: the trigger spans the
          // breakdown's width so the whole row is the target, not just the words. `-mx-4` cancels the
          // touch size's own horizontal padding so the LABEL still lines up with the money rows beneath
          // it while the BORDER BOX a pointer hit-tests keeps its full width — the same border-box vs
          // margin-box separation `ServiceFeePopover`'s `-my-3` makes on the fee row.
          className="-mx-4 w-full justify-between font-normal"
        >
          <span className="text-sm font-semibold">Price details</span>
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <span className="tabular-nums">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
            {/* The caret is the only motion on this surface. `--motion-fast` is named EXPLICITLY rather
                than inherited from `--default-transition-duration` (globals.css:137, which happens to be
                the same token today): a bare `transition-transform` follows whatever the app-wide
                default becomes, and the claim 12-UI-SPEC makes is about THIS token. `aria-hidden`
                because the state it depicts is already announced through `aria-expanded`. */}
            <ChevronDownIcon
              className="transition-transform duration-(--motion-fast) group-data-[state=open]/button:rotate-180"
              aria-hidden
            />
          </span>
        </Button>
      </CollapsibleTrigger>
      {/* `pt-2` so the revealed lines are not welded to the trigger's own 44px box. No animation class:
          the region's height depends on how many lines a listing renders, and an unmeasured height
          transition on a money surface is motion nobody asked for on the one screen where the booker is
          reading numbers. */}
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
