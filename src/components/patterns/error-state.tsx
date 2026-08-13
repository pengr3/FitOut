"use client";

// THE ONE PATTERN IN THIS LAYER THAT IS A CLIENT COMPONENT, AND THE REASON IS NOT PREFERENCE.
// `error.tsx` boundaries MUST be client components — Next renders them from a React error boundary,
// which is a class component with `getDerivedStateFromError`, and the `reset` it hands down is a
// closure over client state. This file exists to be rendered by those five boundaries (plan 11-18),
// so it inherits the requirement. Every other file under `src/components/patterns/` is a Server
// Component and must stay one; this is the declared exception, stated here so it is legible rather
// than assumed to be a habit.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// T-11-ERRLEAK — THE LEAK IS PREVENTED IN THE TYPE, NOT BY A RENDERING CONVENTION
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// This component accepts a `digest` STRING and nothing else derived from the error. There is no
// `error` prop, no `message` prop and no `stack` prop, and that absence is the mitigation: server
// error text routinely carries table names, file paths and connection strings, and in this app it can
// carry a PayMongo endpoint or a Postgres constraint name. A boundary that wanted to render
// `error.message` here would have to add a prop first, which is a reviewable act rather than an
// accident.
//
// `digest` is the opaque hash Next generates for exactly this purpose — it correlates a user's report
// with a server log line and says nothing about the failure on its own.
//
// The end-to-end proof is NOT here and is not claimable here: a prop type says what this component
// can be handed, not what the five boundaries actually hand it. Plan `11-18` owns the
// SENTINEL_LEAK_PROBE assertion — a boundary rendered with `new Error("SENTINEL_LEAK_PROBE")` must
// produce a DOM containing that string ZERO times — which is the assertion that closes the gap
// between "the type forbids it" and "no rendered boundary does it".
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// TWO ACTIONS, ALWAYS — AND `routeOut` IS REQUIRED SO A CALLER PHYSICALLY CANNOT SHIP ONE
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// `11-UI-SPEC § Error`: *"A bare 'Something went wrong' with one button is a failure of this
// contract."* Retry covers a TRANSIENT fault; the route out covers a PERSISTENT one, and without the
// second action a user whose error reproduces has only the browser's back button — back into the same
// error. The shipped inline error at `search/search-results.tsx:169-181` is exactly that shape: one
// heading, one body, one "Try again". This pattern is that shape EXTENDED, not copied.
//
// `routeOut: ReactNode` is therefore required and has no default. An optional slot would need one,
// and a default route out is a product decision (`/` for root, `/bookings` for `(app)`, `/host` for
// `(host)`, `/login` for `(auth)`) that this layer does not own — the same argument 11-07 made for
// `label` and 11-08 for `mediaFallback`.
//
// COPY. `title` and `body` are props: the UI-SPEC binds "Something didn't load" / "We hit a problem
// loading this page. Trying again usually fixes it." and the five boundaries in plan `11-18` supply
// them, so neither sentence appears in this file. The retry LABEL is different in kind and is
// rendered here — `onRetry` is a callback, not a slot, so the component owns the button and therefore
// its label; the label is the same two words on all five boundaries; and it is a control label rather
// than a product sentence. A `retryLabel` prop whose only legal value is "Try again" would be a
// widening of the contract dressed as a narrowing of this file.

import type { ReactNode } from "react";
import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export type ErrorStateProps = {
  /** The heading. Supplied by the boundary; the UI-SPEC's binding sentence is not hardcoded here. */
  title: string;
  /** One sentence naming what failed in ordinary words. Also the boundary's. */
  body: string;
  /**
   * Next's opaque error hash, when the boundary has one.
   *
   * THE ONLY THING FROM THE ERROR OBJECT THAT MAY REACH THIS COMPONENT — see the header. Typed as a
   * plain optional string rather than as `Pick<Error, …>` deliberately: a structural type that
   * mentions `Error` invites a later widening to `error: Error & { digest?: string }`, which is the
   * whole defect in one edit.
   */
  digest?: string;
  /**
   * Fires the boundary's `reset()`.
   *
   * TODO(next@16.3): retry()
   *
   * `next@16.2.7` is what is installed, and its `ErrorInfo` is verifiably
   * `{ error: Error; reset: () => void; unstable_retry: () => void }` — read out of
   * `next/dist/client/components/error-boundary.d.ts`, not out of the docs. A bare `retry` does NOT
   * exist at this version; it is stable from 16.3.0. `unstable_retry` is deliberately NOT used: the
   * copywriting contract binds the label "Try again" to re-running the boundary, `reset()` is the
   * stable API that does it, and adopting an `unstable_`-prefixed export to save one upgrade is how a
   * framework bump turns into a broken error page — the one surface that must work when nothing else
   * does.
   */
  onRetry: () => void;
  /**
   * The second action: a route out of the failure, group-specific.
   *
   * REQUIRED. Expected shape is `<Button variant="outline" asChild><Link href="…">…</Link></Button>`,
   * which is why this is a `ReactNode` slot rather than an `href` + `label` pair — the boundary knows
   * its own group and its own link component; this layer knows only that there must be two.
   */
  routeOut: ReactNode;
};

export function ErrorState({ title, body, digest, onRetry, routeOut }: ErrorStateProps) {
  return (
    <div
      data-testid="error-state"
      // The shipped inline error's shell (`search-results.tsx:170`), including `role="alert"`.
      //
      // NO `aria-label` HERE, and that is the opposite call from the three skeleton shells on
      // purpose. `role="status"` is `nameFrom: author`, so those shells need an `aria-label` to have
      // any accessible name at all (11-07 measured it). `alert` announces its CONTENTS when the
      // region appears, and its accessible name is not what a screen reader reads out — so a label
      // here would add a name nobody hears and no assertion needs, since the panel is addressed by
      // its declared `data-testid` rather than by role-plus-name (that is the reason
      // `selector-contract.ts` gives for this id existing).
      //
      // `border-dashed` reads `--border`, a declared decorative exclusion — the argument is written
      // out in `empty-state.tsx`'s header and holds identically here: this panel is not a control and
      // the border carries no state meaning.
      role="alert"
      className="rounded-xl border border-dashed p-8 text-center"
    >
      {/* 5.76 court / 5.56 grove on background, against a 3.0 non-text bar — declared. Decorative:
          the heading beside it says "this failed" in words. */}
      <AlertTriangleIcon className="mx-auto size-6 text-destructive" aria-hidden="true" />
      <h2 className="mt-3 text-heading text-foreground">{title}</h2>
      <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">{body}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button variant="secondary" className="min-h-11" onClick={onRetry}>
          Try again
        </Button>
        {routeOut}
      </div>
      {digest ? (
        // `tabular-nums` because a digest is a fixed-width hash a user reads aloud or copies into a
        // support message — proportional digits make transcription errors, which is the same reason
        // GATE-05 requires it on every money figure.
        <p className="mt-4 text-label text-muted-foreground tabular-nums">Reference {digest}</p>
      ) : null}
    </div>
  );
}
