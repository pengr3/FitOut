// Streaming skeleton for the "Your listings" grid (UI-SPEC screen-state contract: loading state).
// Next renders this while the RSC page.tsx awaits its DB reads.

import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingListings() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <Skeleton className="mb-8 h-7 w-40" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
