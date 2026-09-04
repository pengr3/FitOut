// The `(auth)` group boundary — STATE-02.
//
// THE ONE BOUNDARY WITH NO SIGNED-IN USER BEHIND IT. `(auth)/layout.tsx` renders `PublicHeader` and
// no session gate, so this surface is reached by someone who is, by definition, not logged in yet.
// That is exactly why the route out is `/login` and not `/bookings`: sending an anonymous visitor to
// a gated route would bounce them straight back through the redirect they were already stuck at.
//
// NO WRAPPER GEOMETRY OF ITS OWN, and no `<main>`. `(auth)/layout.tsx` centres its children inside a
// `w-full max-w-sm` card column — the narrowest surface in the app — so a `max-w-2xl` container here
// would be silently clamped and read as dead code by the next person. It is the one group whose
// layout renders NO `<main>` landmark at all (none of the four auth pages does either); this
// boundary deliberately does not become the exception, because a landmark that appears only when a
// page fails is a landmark whose presence encodes an error state.
//
// The T-11-ERRLEAK, `reset`-not-`retry` and two-actions arguments live in `src/app/error.tsx`.
//
// TODO(next@16.3): retry() — `next@16.2.7`'s `ErrorInfo` is `{ error, reset, unstable_retry }`.

"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ErrorState } from "@/components/patterns/error-state";
import { Button } from "@/components/ui/button";

export default function AuthError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const digest = (error as Error & { digest?: string }).digest;

  useEffect(() => {
    console.error("[boundary] (auth)", error);
  }, [error]);

  return (
    <div className="w-full">
      <ErrorState
        title="Something didn't load"
        body="We hit a problem loading this page. Trying again usually fixes it."
        digest={digest}
        onRetry={reset}
        routeOut={
          <Button variant="outline" asChild className="min-h-11">
            <Link href="/login">Back to log in</Link>
          </Button>
        }
      />
    </div>
  );
}
