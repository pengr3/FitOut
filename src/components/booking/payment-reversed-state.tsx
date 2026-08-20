// PaymentReversedState (D-58) — the rare, calm auto-refund landing. When the payment.paid webhook lands on
// a booking whose slot was genuinely gone (hold swept + taken), the backstop auto-refunds the booker and
// cancels the booking; the confirmation page renders THIS on `/bookings/[id]?paid=1` for that cancelled row.
// Mirrors HoldExpiredState exactly: a reversed payment is NOT an error the booker caused, so this is NEVER
// red (no --destructive) — a muted Undo2 icon + reassuring copy ("you haven't been charged") + a single
// coral recovery CTA (`Back to availability`) and a neutral `Search other spaces`.
//
// Analog: src/components/booking/hold-expired-state.tsx (the calm recovery-state idiom).

import Link from "next/link";
import { Undo2Icon } from "lucide-react";

import { BOOKING_SHELL } from "@/lib/design/measurements";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function PaymentReversedState({ listingId }: { listingId: string }) {
  return (
    // It renders as a `div`: `(app)/layout.tsx:96` already wraps `{children}` in this route's ONE
    // `main` landmark, and a second one nested inside it is a landmark this file has no reason to add
    // (D-88.1). This is the THIRD place the rule has had to be restated — `bookings/[id]/loading.tsx:14-15`
    // and `[id]/page.tsx`'s own header are the other two — so it is restated here rather than delegated
    // to a sibling the next author has no reason to open.
    <div className={BOOKING_SHELL}>
      <Card>
        <CardContent
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-4 py-10 text-center"
        >
          <Undo2Icon className="size-8 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="text-xl leading-tight font-semibold">We couldn&apos;t complete this booking</h1>
            <p className="mx-auto max-w-prose text-sm text-muted-foreground">
              Your payment was reversed — you haven&apos;t been charged for a slot we couldn&apos;t confirm.
              That time may have just been taken; check availability again.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {/* The single coral recovery primary (UI-SPEC accent #2 — the one coral focal point here). */}
            <Button asChild variant="brand">
              <Link href={`/listings/${listingId}`}>Back to availability</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/">Search other spaces</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
