"use client";

// The `/dev/theme` error-panel client boundary — section 12's two `ErrorState` instances.
//
// WHY THIS FILE EXISTS AT ALL — the same structural reason `slot-picker-preview.tsx` gives for
// itself, and it is not a stylistic choice. `patterns/error-state.tsx` requires `onRetry: () => void`,
// a FUNCTION prop, and a Server Component cannot hand a function to a client component. `page.tsx`
// must stay a Server Component (it exports `metadata` and runs the build-time production guard), so
// the callback has to be supplied from inside a client module. This is that module and it does
// nothing else.
//
// THE RETRY IS INERT, AND THE SECTION NOTE ON THE PAGE SAYS SO IN WORDS. `ErrorState`'s `onRetry` is
// Next's `reset` on all five real boundaries; there is nothing to reset here because nothing threw.
// A preview that wired it to `location.reload()` would be inventing a behaviour the pattern does not
// have, and one that dressed the button as disabled would be the affordance-that-lies shape
// `site-footer.tsx`'s D-26 block bans. It stays a live button that does nothing, labelled as a
// preview — which is what every other control on this page already is.
//
// NO PRODUCT COPY IS DECIDED HERE. `title`, `body`, `digest` and `routeOut` all arrive as props from
// `page.tsx`'s fixture constants, for the same reason `patterns/` owns no sentences: a reader must be
// able to tell the preview's strings from the product's, and the fixtures are declared in one place
// with a comment saying they are fixtures.

import type { ReactNode } from "react";

import { ErrorState } from "@/components/patterns/error-state";

/**
 * Module-level so its identity is stable across renders, matching `slot-picker-preview.tsx`'s
 * `IGNORE_SELECTION` precedent — the reason there is memoisation, and the reason here is that a
 * fresh arrow per render is a new prop on every parent render for no benefit.
 */
const IGNORE_RETRY = () => {};

export function ErrorStatePreview({
  title,
  body,
  digest,
  routeOut,
}: {
  title: string;
  body: string;
  /** Present on one instance and absent on the other — that contrast IS section 12. */
  digest?: string;
  routeOut: ReactNode;
}) {
  return (
    <ErrorState
      title={title}
      body={body}
      digest={digest}
      onRetry={IGNORE_RETRY}
      routeOut={routeOut}
    />
  );
}
