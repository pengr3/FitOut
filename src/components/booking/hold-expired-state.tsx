"use client";

// HoldExpiredState (D-44) — the calm interstitial that replaces the reserve content when the hold's TTL
// runs out. Occupancy/expiry is NOT an error, so this is NEVER red (no --destructive): a muted TimerOff
// icon + neutral copy + a single coral recovery CTA (`Back to availability`) and a neutral `Search other
// spaces`.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// GATE-03 RULE 7 (plan 12-06) — THE INTERRUPTING POLITENESS LEVEL IS GONE, AND THE FOCUS MOVE IS WHY
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// This region shipped with the politeness level that INTERRUPTS whatever a screen reader is currently
// speaking. It is now banned across the whole booker path and this file was the reason the ban has a
// name: interrupting is not a way of being important, it is a way of talking over the sentence the
// booker was part-way through — on this route, plausibly the price.
//
// `role="status"` is ALREADY implicitly polite, so the correct markup is the role and no `aria-live`
// attribute at all. The mechanism that replaces the interruption is POLITE REGION PLUS MOVED FOCUS:
// `ReserveView` moves focus to the primary recovery CTA when this state mounts, which is what makes
// the expiry impossible to miss AND simultaneously puts a keyboard user on the way out. That focus
// move is not a nicety here — it is the half of the pair that earns dropping the interrupting level,
// and removing it would make this comment false.
//
// ⚠ WHERE THE MOVE ACTUALLY LIVES, AND WHY IT IS NOT IN `ReserveView` (12-REVIEW CR-01). The paragraph
// above shipped for two plans with NO focus move anywhere in the tree — no `useEffect`, no `.focus()`,
// in this file or in `ReserveView` — so the ban on the interrupting level was paid for with a mechanism
// that did not exist, and a booker whose hold ran out was left with their focus on a `Confirm & pay`
// button that had just been unmounted from under them. The move is now this component's own mount
// effect, one line below, and it belongs here rather than in the parent because this state has TWO
// mounts: `reserve-view.tsx`'s live-expiry swap, and `listings/[id]/book/page.tsx` rendering it
// DIRECTLY for a hold that was already dead on arrival. A move owned by one parent would fire on one
// of them and the sentence above would stay half-false. Owning it here makes "focus moves to the
// primary recovery CTA when this state mounts" true of every mount there is.
//
// It is a mount effect and NOT a render-time call, and it is the reason this file carries `use client`
// (the RSC path above renders it across the boundary). The target is the `Back to availability` link —
// the primary recovery CTA the contract names, and a natively focusable element, so it needs no
// `tabIndex`. `collision-notice.tsx` is the same pattern one component over, aimed at its own region
// because ITS row (rule 7, `live-regions.ts`) declares a different target. Neither is decoration:
// `tests/booking/hold-expired-state.test.tsx` asserts `document.activeElement` on both mount paths,
// because a static source scan — which is all `tests/design/live-regions.test.tsx` can be — cannot see
// a focus move at all, and its absence is exactly what stayed green here for two plans.
//
// RULE 6 pairs with the countdown: `hold-countdown.tsx` deliberately does NOT announce the expiry (its
// sr-only region drops its `aria-live` and keeps its text), because exactly one region announces one
// outcome and this is that region. Both halves are declared in `src/lib/design/live-regions.ts`.
//
// Analog: the dashed empty-state block (availability-calendar.tsx:184-204).

import * as React from "react";
import Link from "next/link";
import { TimerOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function HoldExpiredState({ listingId }: { listingId: string }) {
  // RULE 7's other half — see the header. The ref rides the `Link` rather than the `Button` wrapping
  // it: `Button asChild` renders a Radix `Slot`, which composes the child's own ref onto the element it
  // clones, so this lands on the real `<a>` and is typed as one. Putting it on `Button` instead would
  // type it as an `HTMLButtonElement` that never exists on this path.
  const recoveryRef = React.useRef<HTMLAnchorElement | null>(null);
  React.useEffect(() => {
    recoveryRef.current?.focus();
  }, []);

  return (
    <Card>
      <CardContent role="status" className="flex flex-col items-center gap-4 py-10 text-center">
        <TimerOffIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Your hold expired</h2>
          <p className="mx-auto max-w-prose text-sm text-muted-foreground">
            We released the slot so someone else could book it. It might still be free — check availability
            again.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {/* The single coral recovery primary (UI-SPEC accent #3 — the one coral focal point here). */}
          <Button asChild variant="brand">
            <Link ref={recoveryRef} href={`/listings/${listingId}`}>
              Back to availability
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Search other spaces</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
