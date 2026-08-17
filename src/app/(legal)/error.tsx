// The `(legal)` group boundary — STATE-02, and THE ONE THAT SHOULD NEVER FIRE.
//
// `/terms` and `/privacy` are `○ Static` in the build: sync server components rendering literal copy,
// reaching no database, no network and no request-time API. There is no runtime failure path for
// this boundary to catch, which is why `(legal)/layout.tsx` names this file by plan number rather
// than pretending otherwise.
//
// IT STILL EXISTS, AND THE REASON IS NOT COMPLETENESS-FOR-ITS-OWN-SAKE. STATE-02 asks for one
// boundary per group, and the group that has none today is the group that has none the day someone
// adds a cookie-consent read, a locale lookup or a CMS fetch to a legal page. A boundary added at
// that moment is a boundary written under pressure; this one is written calmly, with the same copy
// and the same two actions as the other four, and `tests/design/error-boundaries.test.ts` pins it by
// name so it cannot be quietly deleted as "unused".
//
// IT MUST STAY REACHABLE IN A TEST. Plan `11-22`'s baseline renders it and Task 3's gate asserts its
// structure, so its shape is deliberately IDENTICAL to the other three group boundaries rather than
// minimised into a stub that would not represent them.
//
// It renders inside `(legal)/layout.tsx`, which owns the shell, the `<main>` landmark and the 65ch
// column — so, like the other group boundaries, this file composes no chrome and adds no second
// landmark and no second column.
//
// The T-11-ERRLEAK, `reset`-not-`retry` and two-actions arguments live in `src/app/error.tsx`.
//
// TODO(next@16.3): retry() — `next@16.2.7`'s `ErrorInfo` is `{ error, reset, unstable_retry }`.

"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ErrorState } from "@/components/patterns/error-state";
import { Button } from "@/components/ui/button";

export default function LegalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const digest = (error as Error & { digest?: string }).digest;

  useEffect(() => {
    console.error("[boundary] (legal)", error);
  }, [error]);

  return (
    // The layout's `<main className="mx-auto w-full max-w-prose px-4 py-12 sm:py-16">` already
    // supplies the column and the rhythm.
    <div className="w-full">
      <ErrorState
        title="Something didn't load"
        body="We hit a problem loading this page. Trying again usually fixes it."
        digest={digest}
        onRetry={reset}
        routeOut={
          // Not "Back to search": someone reading the terms was not mid-search, and the legal pages
          // are reached from a footer that sits on every surface in the app. "Back to FitOut" is the
          // honest description of where `/` takes them from here.
          <Button variant="outline" asChild className="min-h-11">
            <Link href="/">Back to FitOut</Link>
          </Button>
        }
      />
    </div>
  );
}
