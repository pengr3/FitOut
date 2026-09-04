// STATE-01 — the panel loading shape. THE skeleton for a boxed panel: the price breakdown, the
// availability calendar's day panel, and the body of every new `loading.tsx` that is not a grid or a
// list.
//
// WHY A MINIMUM AND NOT A HEIGHT. `PANEL_MIN_HEIGHT` is a floor because panel CONTENT varies — a
// breakdown has three lines or five — so a fixed height would either truncate the real panel or
// oversize its placeholder. What must not vary is how much of the page the panel claims while it is
// loading, and that is exactly what a minimum pins.
//
// A SERVER COMPONENT with no `"use client"`, and no product copy — see `card-grid-skeleton.tsx`'s
// header for both rules and why they are not stylistic.

import { Skeleton } from "@/components/ui/skeleton";
import { PANEL_MIN_HEIGHT, TEXT_BAR_HEIGHT } from "@/lib/design/measurements";
import { cn } from "@/lib/utils";

export function PanelSkeleton({
  label,
}: {
  /** What is loading, as a full sentence. Announced; never rendered visibly. */
  label: string;
}) {
  return (
    // One `role="status"`, and exactly one — this is the shape most likely to render beside another
    // skeleton on a split route (`selector-contract.ts`'s own reason for giving it a declared id), and
    // two status regions in one placeholder announce the same thing twice. `aria-label` carries the
    // name because `role="status"` is nameFrom:author; the `sr-only` span carries the live region's
    // content. See the measured note in `card-grid-skeleton.tsx`.
    <div role="status" aria-busy="true" aria-label={label} data-testid="skeleton-panel">
      <span className="sr-only">{label}</span>
      {/* The block's only box class is the imported minimum. The three fraction widths are
          PROPORTIONS of the panel rather than measurements of any real line — nothing in the product
          is two-thirds of a panel wide — which is why they stay literal and are the source gate's one
          declared exemption. */}
      <div className={cn(PANEL_MIN_HEIGHT, "space-y-3")}>
        {/* `aria-hidden` sits on each BAR rather than on the block around them. Hiding the container
            would work today and would silently stop working the moment a later plan puts anything
            meaningful inside it; marking the decoration itself is the rule that survives that edit,
            and it is what the render gate asserts, per bar. */}
        <Skeleton aria-hidden="true" className={cn(TEXT_BAR_HEIGHT, "w-1/2")} />
        <Skeleton aria-hidden="true" className={cn(TEXT_BAR_HEIGHT, "w-3/4")} />
        <Skeleton aria-hidden="true" className={cn(TEXT_BAR_HEIGHT, "w-2/3")} />
      </div>
    </div>
  );
}
