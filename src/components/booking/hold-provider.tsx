"use client";

// HoldProvider / useHold (SHELL-03 · D-49 · plan 12-03) — the checkout route's hold context.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS AT ALL: A LAYOUT CANNOT RECEIVE PROPS FROM ITS PAGE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-49 puts the live hold countdown in the checkout HEADER — the one piece of chrome this route
// genuinely wants, because it tells the booker how long they have rather than offering them somewhere
// else to go. The header is composed in `app/listings/[id]/book/layout.tsx`; the hold's `expiresAt` is
// read, owner-gated, in `app/listings/[id]/book/page.tsx`. In the App Router a layout receives
// `children` and its own `params` and NOTHING from the page it wraps, so the value the header must
// display lives one component tree BELOW the component that must display it. A context is the only
// composition that closes that gap without either (a) reading the hold a second time in the layout —
// a second, un-gated path to another booker's row (T-12-03-HOLDIDOR) — or (b) collapsing the layout
// into a client component and dragging the whole checkout across the boundary.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// IT IS BIDIRECTIONAL, AND THAT IS THE WHOLE SHAPE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
//   expiresAt  ↓  published by the PAGE (through <PublishExpiresAt>), read by the header countdown
//   expired    ↑  published by the COUNTDOWN, read by ReserveView for the D-44 expiry swap
//
// Before this file, `reserve-view.tsx` passed an `onExpire` callback DOWN into `HoldCountdown`, which
// was correct while both lived in the rail. With the countdown in the header the wiring inverts: the
// countdown is now a sibling of the page rather than its descendant, so the expiry has to travel UP
// through the same context the deadline travelled DOWN through.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TWO VALUES, AND THE SHORT LIST IS THE SECURITY PROPERTY
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// One ISO string and one boolean. No hold id, no money, no availability, no listing row. That is not
// minimalism for its own sake — it is what keeps GATE-05 and T-12-03-HOLDIDOR true by construction:
// there is nowhere in this context to put a figure that must stay server-computed, and nothing here
// that a second reader could widen into a data path. The layout fetches NOTHING; it wraps.
//
// The countdown is a DISPLAY CUE (T-12-03-CLIENTAUTH, unchanged by this plan). `confirmBooking`
// re-checks `expires_at > now()` server-side and the checkout lease is the real guard; `expired` here
// decides what the booker LOOKS at, never what they are allowed to do.
//
// Shape copied from the repo's one existing client context that a server-rendered subtree is wrapped
// in — `BookingSelectionProvider` in `components/availability/availability-calendar.tsx`: a
// `createContext(null)`, a `use*` hook that THROWS outside the provider (a silent `null` here would
// render a countdown that never counts and an expiry swap that never swaps), and a `useMemo`'d value.

import * as React from "react";

/**
 * The two values, and the two writers.
 *
 * Deliberately not widened. See the header — the short list is the property, not an accident of what
 * has been needed so far.
 */
type HoldCtx = {
  /** The hold's TTL deadline as an ISO instant, or `null` until the page publishes one. */
  expiresAt: string | null;
  /** Whether the countdown has reached zero. Written by the countdown, read by `ReserveView`. */
  expired: boolean;
  /** Called by the page's publisher. Idempotent for an unchanged value — see below. */
  publishExpiresAt: (iso: string | null) => void;
  /** Called once by the countdown when it reaches zero. */
  markExpired: () => void;
};

const HoldContext = React.createContext<HoldCtx | null>(null);

export function HoldProvider({ children }: { children: React.ReactNode }) {
  const [expiresAt, setExpiresAt] = React.useState<string | null>(null);
  const [expired, setExpired] = React.useState(false);

  /**
   * IDEMPOTENT FOR THE SAME VALUE, and that is load-bearing rather than tidy.
   *
   * The publisher writes from an effect. An effect that sets state on every run, in a provider that
   * re-renders the subtree containing that effect, is a render loop — and the loop would be invisible
   * in development because the value never changes, so nothing on screen would move while the tree
   * re-rendered forever. Comparing before setting makes the second write a no-op React bails out of.
   */
  const publishExpiresAt = React.useCallback((iso: string | null) => {
    setExpiresAt((prev) => (prev === iso ? prev : iso));
  }, []);

  /** One-way latch: a hold that has expired does not un-expire, and the server is the authority anyway. */
  const markExpired = React.useCallback(() => {
    setExpired((prev) => (prev ? prev : true));
  }, []);

  const value = React.useMemo(
    () => ({ expiresAt, expired, publishExpiresAt, markExpired }),
    [expiresAt, expired, publishExpiresAt, markExpired],
  );

  return <HoldContext.Provider value={value}>{children}</HoldContext.Provider>;
}

/**
 * Read the checkout hold context.
 *
 * Throws outside a `HoldProvider`, exactly as `useBookingSelection` does. The alternative — returning
 * a null-ish default — would render a countdown that silently never counts and an expiry swap that
 * silently never swaps, on a money surface, with no failure anywhere.
 */
export function useHold(): HoldCtx {
  const ctx = React.useContext(HoldContext);
  if (!ctx) {
    throw new Error("useHold must be used within a HoldProvider");
  }
  return ctx;
}
