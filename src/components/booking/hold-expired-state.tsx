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
// RULE 6 pairs with the countdown: `hold-countdown.tsx` deliberately does NOT announce the expiry (its
// sr-only region drops its `aria-live` and keeps its text), because exactly one region announces one
// outcome and this is that region. Both halves are declared in `src/lib/design/live-regions.ts`.
//
// Analog: the dashed empty-state block (availability-calendar.tsx:184-204).

import Link from "next/link";
import { TimerOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function HoldExpiredState({ listingId }: { listingId: string }) {
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
            <Link href={`/listings/${listingId}`}>Back to availability</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Search other spaces</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
