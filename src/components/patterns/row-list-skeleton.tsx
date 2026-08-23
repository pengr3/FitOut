// STATE-01 — the row-list loading shape. THE skeleton for every stacked list of row cards:
// `(app)/bookings`, `(host)/host/bookings`, `(host)/host/requests`.
//
// THE 80px ROW IS NOT RESTATED HERE. `ROW_CARD_HEIGHT` owns the derivation (a Card is `p-4` around a
// 48px thumbnail) and its comment in `src/lib/design/measurements.ts` is the one place it is written
// down. `(app)/bookings/loading.tsx` used to carry that reasoning beside a hardcoded `h-20`, which is
// precisely the shape STATE-01 exists to remove: two files agreeing on a number is not the same as
// one file owning it, and the agreement ends the first time the real row changes.
//
// A SERVER COMPONENT with no `"use client"`, and no product copy — see `card-grid-skeleton.tsx`'s
// header for both rules and why they are not stylistic.
//
// THE BAR HEIGHT IS NOW A PARAMETER, AND THE PARAMETER IS STILL NOT A NUMBER. One pattern stands in
// for three different row shapes across the app, and those shapes are not all the same height — so
// hard-wiring one of them makes the pattern wrong for the other two, while opening the door to a
// caller-supplied number makes the pattern wrong for everyone. The middle position: an OPTIONAL prop
// whose TYPE is the declared set of row heights (`RowSkeletonHeight`, owned by the measurements
// module). A call site can choose between derived values and cannot invent one. The default is the
// shipped constant, so every existing caller renders byte-identically and this file's own box classes
// are exactly as literal-free as they were before.

import { Skeleton } from "@/components/ui/skeleton";
import { ROW_CARD_HEIGHT, type RowSkeletonHeight } from "@/lib/design/measurements";
import { cn } from "@/lib/utils";

export function RowListSkeleton({
  label,
  rows = 4,
  height = ROW_CARD_HEIGHT,
}: {
  /** What is loading, as a full sentence. Announced; never rendered visibly. */
  label: string;
  /** Placeholder rows. 4 is what `(app)/bookings/loading.tsx` ships. */
  rows?: number;
  /**
   * The bar height, and it MUST be a constant imported from `@/lib/design/measurements` — never a
   * value typed at the call site, even one that happens to match. The type rejects an undeclared
   * value at compile time; a declared value spelled out by hand is caught instead by
   * `tests/design/loading-coverage.test.ts`, which lets no `loading.tsx` write a box measurement of
   * its own. Omit it unless the real rows this stands in for have been measured and their height
   * written down.
   */
  height?: RowSkeletonHeight;
}) {
  return (
    // One `role="status"` per skeleton, `aria-busy` on it, an `sr-only` child as the live region's
    // content and `aria-label` as its NAME (`role="status"` is nameFrom:author — the span alone
    // computes to `""`; see the measured note in `card-grid-skeleton.tsx`). The bars are
    // `aria-hidden`, which is what leaves the 1.09:1 fill carrying no information at all.
    <div role="status" aria-busy="true" aria-label={label} data-testid="skeleton-row-list">
      <span className="sr-only">{label}</span>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          // `w-full` is "fill the parent", not a measurement; the only box class here is the
          // declared height, which arrives through the prop and defaults to the shipped constant.
          <Skeleton key={i} aria-hidden="true" className={cn(height, "w-full rounded-xl")} />
        ))}
      </div>
    </div>
  );
}
