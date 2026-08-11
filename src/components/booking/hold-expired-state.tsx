// HoldExpiredState (D-44) — the calm interstitial that replaces the reserve content when the hold's TTL
// runs out. Occupancy/expiry is NOT an error, so this is NEVER red (no --destructive): a muted TimerOff
// icon + neutral copy + a single coral recovery CTA (`Back to availability`) and a neutral `Search other
// spaces`. aria-live="assertive" so the expiry is announced; the parent moves focus to the primary CTA so
// keyboard users aren't stranded (UI-SPEC §a11y).
//
// Analog: the dashed empty-state block (availability-calendar.tsx:184-204).

import Link from "next/link";
import { TimerOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function HoldExpiredState({ listingId }: { listingId: string }) {
  return (
    <Card>
      <CardContent
        role="status"
        aria-live="assertive"
        className="flex flex-col items-center gap-4 py-10 text-center"
      >
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
