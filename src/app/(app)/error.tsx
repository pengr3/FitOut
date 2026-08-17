// The `(app)` group boundary — the signed-in booker surface (STATE-02).
//
// WHAT WRAPS IT, AND WHY THAT MATTERS. A group `error.tsx` renders INSIDE its group layout, so
// `(app)/layout.tsx` is still mounted when this paints — which means its BLOCKING session gate has
// already run and redirected an anonymous visitor to `/login` before anything here exists. This
// boundary is therefore always authenticated, its shell (header, mode switch, bell, footer, Toaster)
// is still on screen, and it must NOT compose chrome of its own. It also must not render a second
// `<main>`: the layout's `<main className="flex flex-1 flex-col">` is already the landmark, the same
// call `(app)/bookings/[id]/loading.tsx` records for itself.
//
// It does NOT catch an error thrown by that layout — a layout's own failure goes to the boundary
// ABOVE it, which is `src/app/error.tsx`. That file carries the T-11-ERRLEAK argument, the
// `reset`-not-`retry` argument and the two-actions argument in full; they hold identically here and
// are not restated.
//
// TODO(next@16.3): retry() — see `src/app/error.tsx`. `next@16.2.7`'s `ErrorInfo` has `reset` and
// `unstable_retry`; a bare `retry` does not exist at this version.

"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ErrorState } from "@/components/patterns/error-state";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  // Only the opaque hash crosses. `ErrorState` has no `error` prop to hand it to anyway.
  const digest = (error as Error & { digest?: string }).digest;

  useEffect(() => {
    // Console, not DOM.
    console.error("[boundary] (app)", error);
  }, [error]);

  return (
    // The layout's `<main>` is `flex flex-1 flex-col` with no padding of its own, so the column
    // width and the vertical rhythm have to come from here.
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:py-24">
      <ErrorState
        title="Something didn't load"
        body="We hit a problem loading this page. Trying again usually fixes it."
        digest={digest}
        onRetry={reset}
        routeOut={
          // A signed-in booker's persistent recourse is their own bookings, not search: whatever
          // failed, the reservations they already hold are the thing they most need to reach.
          <Button variant="outline" asChild className="min-h-11">
            <Link href="/bookings">Your bookings</Link>
          </Button>
        }
      />
    </div>
  );
}
