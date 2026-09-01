// The ops boundary — STATE-02.
//
// ⚠ IT SITS ON `ops/`, NOT ON `(ops)/`, AND ON THIS ROUTE GROUP THAT IS A SECURITY FACT RATHER THAN A
// COSMETIC ONE. `(ops)` is a route group containing exactly one segment, `ops/`, and the layout that
// composes the shell — and awaits `assertStaff()` — lives at `(ops)/ops/layout.tsx`. A boundary at
// `(ops)/error.tsx` would sit ABOVE that layout, so it would render (a) with no ops chrome at all and
// (b) OUTSIDE the guard. On `(host)` the equivalent mistake costs a shell; here it would put a
// rendered surface under `/ops` on the far side of the layer that wins the 404 status line, which is
// the D-219 existence oracle wearing an error message. Beside the layout is where it belongs.
//
// Consequences of rendering INSIDE `(ops)/ops/layout.tsx`: this boundary is always staff-gated, it
// must not compose chrome, and it must not render a second `<main>` (the layout's
// `<main className="flex flex-1 flex-col">` is the landmark).
//
// The T-11-ERRLEAK argument (only `digest` crosses; `console.error` is the console, not the DOM), the
// `reset`-not-`retry` argument and the two-actions argument all live in `src/app/error.tsx` and are
// not restated here.
//
// TODO(next@16.3): retry() — `next@16.2.7`'s `ErrorInfo` is `{ error, reset, unstable_retry }`.

"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ErrorState } from "@/components/patterns/error-state";
import { Button } from "@/components/ui/button";

export default function OpsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const digest = (error as Error & { digest?: string }).digest;

  useEffect(() => {
    console.error("[boundary] (ops)/ops", error);
  }, [error]);

  return (
    // Same reason as `(host)`: the layout's `<main>` carries no padding, so the column is set here.
    // Deliberately NOT `OPS_QUEUE_SHELL` — this panel is a paragraph of prose and two buttons, not a
    // queue, and the wide measure that exists to give a photo mosaic room would leave it stranded.
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:py-24">
      <ErrorState
        title="The queue didn't load"
        body="We hit a problem loading the review queue. Trying again usually fixes it."
        digest={digest}
        onRetry={reset}
        routeOut={
          // ⚠ `/` AND NOT `/ops`. `routeOut` is required because a boundary REPLACES THE WHOLE SCREEN
          // and needs a persistent way out; pointing it at the page the operator is already on is the
          // dead end `empty-state-adoption.test.ts` records refusing on its own surface. D-246 means
          // the console has exactly one page, so the only honest way out is out of the console — and
          // an ops staffer is also a user, so `/` is a real destination for them rather than a
          // consolation prize.
          <Button variant="outline" asChild className="min-h-11">
            <Link href="/">Back to FitOut</Link>
          </Button>
        }
      />
    </div>
  );
}
