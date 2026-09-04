// THE ROOT ERROR BOUNDARY — STATE-02, and the first one this repository has ever had.
//
// It covers everything below `src/app/layout.tsx` that no nearer boundary claims: `/` and
// `/invite/**` (both inside the `(public)` group, which deliberately has no boundary of its own),
// `/listings/**`, and `/dev/**`. Measured, not read off the file tree — plan 11-18 drove a real
// `throw` from `/dev/throw` and watched THIS file render.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// T-11-ERRLEAK — WHAT CROSSES OUT OF THE ERROR OBJECT, AND WHY IT IS ONLY `digest`
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Server error text routinely carries table names, file paths and connection strings; in this app it
// can carry a PayMongo endpoint or the name of the `bookings_no_overlap` exclusion constraint. So
// the error's human-readable text and its call stack reach NOTHING that renders — and neither of
// those two property names is spelled anywhere in these five files, comments included, so that the
// zero-count grep over them is a statement about the code and not about the prose (the trap
// `src/app/not-found.tsx` records for its own database-import criterion). `digest` — Next's hash,
// generated for exactly this purpose — is the only thing that crosses, and `ErrorState` has no
// `error` prop at all, so widening this would require editing the pattern's type first (a reviewable
// act rather than an accident).
//
// `console.error(error)` below is DELIBERATE and is not a leak: the browser console is not the DOM.
// It is what turns a `digest` a user reads aloud into something a developer can correlate, and it
// costs nothing at the security boundary this file defends — `page.content()` cannot see it. The
// distinction is stated rather than assumed because "no error text anywhere" and "no error text in
// the DOM" are different rules and only the second one is the contract.
//
// The end-to-end proof lives in `e2e/error-leak.spec.ts`: a real `new Error("SENTINEL_LEAK_PROBE")`
// thrown during a real render, asserted to appear ZERO times in `page.content()` of a real browser.
// `error-state.tsx`'s header is explicit that its prop type could not claim that proof.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// TWO ACTIONS, AND `reset` RATHER THAN `retry`
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A bare "Something went wrong" with one button is a failure of the contract (11-UI-SPEC § Error):
// retry covers a TRANSIENT fault, the route out covers a PERSISTENT one, and without the second the
// user's only recourse is the browser's back button into the same error. `ErrorState.routeOut` is
// non-optional, so a one-button boundary does not compile (T-11-DEADEND).
//
// TODO(next@16.3): retry()
// `next@16.2.7` is installed and its `ErrorInfo` is verifiably
// `{ error: Error; reset: () => void; unstable_retry: () => void }`, read out of
// `node_modules/next/dist/client/components/error-boundary.d.ts`. A bare `retry` does NOT exist at
// this version. `unstable_retry` is not adopted: the copy contract binds "Try again" to re-running
// the boundary, `reset()` is the stable API that does it, and taking an `unstable_`-prefixed export
// to save one upgrade is how a framework bump breaks the one surface that must work when nothing
// else does.
//
// The props are typed as the INSTALLED `ErrorInfo` shape (`error: Error`) rather than as the
// `Error & { digest?: string }` spelling the docs use, so the default export is assignable to
// `ErrorComponent` without relying on parameter bivariance. `digest` is reached through a cast at
// the one line that needs it.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// NO HEADER AND NO FOOTER HERE, AND THAT IS A CONSEQUENCE OF THE TREE (see also global-error.tsx)
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The four GROUP boundaries render inside their own layout and therefore keep its chrome for free.
// This one is above all five groups — `src/app/layout.tsx` owns `<html>`, `<body>`, the theme
// provider and nothing else (11-10) — so chrome here would have to be COMPOSED, the way
// `src/app/not-found.tsx` composes it. It deliberately is not: this is a client boundary, and
// pulling the shell into it forks 11-14's footer inventory onto a surface that is not a route.
//
// MEASURED CONSEQUENCE, recorded rather than hidden: because this boundary is declared at the root,
// an error thrown in `(public)/page.tsx` unmounts `(public)/layout.tsx` too, so the public header and
// footer disappear on a failed `/`. A `(public)/error.tsx` would keep them. It is NOT added here
// because STATE-02's inventory is exactly five boundaries and `tests/design/error-boundaries.test.ts`
// pins that list by name; a sixth is a decision for a later plan, and it is written up in
// `deferred-items.md` rather than left as a surprise.

"use client";

import { useEffect } from "react";
import Link from "next/link";

import { ErrorState } from "@/components/patterns/error-state";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  // The ONLY thing taken off the error object. See the header.
  const digest = (error as Error & { digest?: string }).digest;

  useEffect(() => {
    // Console, not DOM — deliberate, and argued in the header.
    console.error("[boundary] root", error);
  }, [error]);

  return (
    // Nothing above this renders a `<main>` (the root layout is chrome-free), so this boundary is
    // the landmark — the same call `src/app/not-found.tsx` makes, with the same geometry. The four
    // group boundaries do the opposite, because their layouts already own one.
    <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:py-24">
      <ErrorState
        title="Something didn't load"
        body="We hit a problem loading this page. Trying again usually fixes it."
        digest={digest}
        onRetry={reset}
        routeOut={
          // The root group's route out: search IS the product's core value, so someone whose page
          // failed is sent to the thing they came to do rather than to a generic "home".
          <Button variant="outline" asChild className="min-h-11">
            <Link href="/">Back to search</Link>
          </Button>
        }
      />
    </main>
  );
}
