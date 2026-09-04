// The host boundary — STATE-02.
//
// IT SITS ON `host/`, NOT ON `(host)/`, and that is not a stylistic choice. `(host)` is a route
// group containing exactly one segment, `host/`, and the layout that composes the host shell lives
// at `(host)/host/layout.tsx`. A boundary at `(host)/error.tsx` would sit ABOVE that layout and
// would therefore render with no host chrome at all; placing it beside the layout is what keeps the
// shell — and its blocking session gate, which has already run and redirected an anonymous visitor —
// mounted underneath the failure.
//
// Consequences of rendering inside `(host)/host/layout.tsx`: this boundary is always authenticated,
// it must not compose chrome, and it must not render a second `<main>` (the layout's
// `<main className="flex flex-1 flex-col">` is the landmark).
//
// The T-11-ERRLEAK argument (only `digest` crosses; `console.error` is the console, not the DOM),
// the `reset`-not-`retry` argument and the two-actions argument all live in `src/app/error.tsx` and
// are not restated here.
//
// TODO(next@16.3): retry() — `next@16.2.7`'s `ErrorInfo` is `{ error, reset, unstable_retry }`.

"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ErrorState } from "@/components/patterns/error-state";
import { Button } from "@/components/ui/button";

export default function HostError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const digest = (error as Error & { digest?: string }).digest;

  useEffect(() => {
    console.error("[boundary] (host)/host", error);
  }, [error]);

  return (
    // Same reason as `(app)`: the layout's `<main>` carries no padding, so the column is set here.
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:py-24">
      <ErrorState
        title="Something didn't load"
        body="We hit a problem loading this page. Trying again usually fixes it."
        digest={digest}
        onRetry={reset}
        routeOut={
          // The host's dashboard is the one screen that summarises everything a host owes and is
          // owed — the correct persistent recourse when one host page will not load.
          <Button variant="outline" asChild className="min-h-11">
            <Link href="/host">Host dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
