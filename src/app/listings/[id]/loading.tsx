// Loading skeleton for the public listing detail page (UI-SPEC Screen/State Contract: "loading
// (skeleton)"). Shown while the RSC fetches the listing + host + photos. Mirrors the page layout so
// there is no jarring reflow when the real content streams in.

import { Skeleton } from "@/components/ui/skeleton";

export default function PublicListingLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3] w-full rounded-lg" />
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
        <div className="space-y-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </main>
  );
}
