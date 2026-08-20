"use client";

// PendingPaymentState (D-57) — the neutral "payment received, finalizing…" interstitial the confirmation
// page renders on return from the hosted checkout (`/bookings/[id]?paid=1` while status is still 'pending').
// The browser return is a UX signal ONLY — the checkout_session.payment.paid webhook (Plan 04) is the sole
// confirm authority. This poller therefore NEVER fabricates the confirmed state client-side: it only calls
// router.refresh() on a bounded interval so the RSC can re-render itself as 'confirmed' when the DB says so.
// After a cap it stops polling and shows the calm "taking longer" copy + a manual Refresh (still just a
// refresh). Neutral spinner — NOT success-green, NOT red — until the real status lands.
//
// Hook discipline mirrors HoldCountdown: the setInterval callback is the ONLY state-mutation site (never a
// synchronous setState in the effect body — react-hooks/set-state-in-effect); the interval is cleared on
// unmount; the router is read through a ref so a new router identity never re-subscribes (restarts) it.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { BOOKING_SHELL } from "@/lib/design/measurements";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const POLL_INTERVAL_MS = 2500;
const MAX_ATTEMPTS = 8; // ~20s of auto-refresh before we fall back to the manual "taking longer" copy

export function PendingPaymentState() {
  const router = useRouter();
  const [slow, setSlow] = React.useState(false);

  // router is read through a ref so a new router identity each render never re-subscribes the interval.
  const routerRef = React.useRef(router);
  React.useEffect(() => {
    routerRef.current = router;
  }, [router]);

  React.useEffect(() => {
    // The interval callback is the ONLY place state is set (never synchronously in the effect body). It
    // refreshes the RSC so it can re-render as 'confirmed'; after MAX_ATTEMPTS it stops and flips to the
    // calm "taking longer" copy. `count` is a local closure mutable (like HoldCountdown's `fired`).
    let count = 0;
    const id = window.setInterval(() => {
      count += 1;
      routerRef.current.refresh();
      if (count >= MAX_ATTEMPTS) {
        window.clearInterval(id);
        setSlow(true);
      }
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    // It renders as a `div`: `(app)/layout.tsx:96` already wraps `{children}` in this route's ONE
    // `main` landmark, and a second one nested inside it is a landmark this file has no reason to add
    // (D-88.1). This is the THIRD place the rule has had to be restated — `bookings/[id]/loading.tsx:14-15`
    // and `[id]/page.tsx`'s own header are the other two — so it is restated here rather than delegated
    // to a sibling the next author has no reason to open.
    <div className={BOOKING_SHELL}>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          {/* Neutral, decorative spinner — the text status below (aria-live) is what SR users hear. */}
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="text-xl leading-tight font-semibold tracking-tight">Payment received</h1>
            {/* aria-live="polite": the resolution is announced without relying on the visual spinner. */}
            <p className="mx-auto max-w-prose text-sm text-muted-foreground" aria-live="polite">
              {slow
                ? "Still finalizing… you can safely wait here. We've got your payment — your booking will appear in a moment."
                : "We're finalizing your booking — this usually takes a few seconds and updates on its own."}
            </p>
          </div>
          {/* The manual fallback appears ONLY once auto-refresh has backed off; it also just refreshes. */}
          {slow && (
            <Button variant="secondary" onClick={() => router.refresh()}>
              Refresh
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
