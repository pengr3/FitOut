"use client";

// The client freshness island for /bookings/[id]/group (D-84, 08-UI-SPEC §2).
//
// WHY THIS FILE EXISTS AT ALL. The management surface is the one place in the product an organizer sits and
// WATCHES: they paste the link into a group chat and answers arrive over the next few minutes. An RSC that
// only re-rendered on navigation would make GROUP-04 ("see the headcount and who's coming") feel broken by
// forcing a manual reload after every answer.
//
// IT FETCHES NOTHING AND RENDERS NOTHING. `GroupPoller` returns null; the entire mechanism is a bounded
// `router.refresh()` so the SERVER re-reads the owner-scoped roster and headcount. There is no client
// notification endpoint to authorise, no client-held roster to leak, and no TanStack Query — which is still
// not installed and is still not being added (D-84).
//
// Cloned from notification-bell.tsx:62-78, which is itself the pending-payment-state.tsx idiom:
//   - the interval callback is the ONLY state-mutation site (never a synchronous setState in the effect
//     body — react-hooks/set-state-in-effect);
//   - the interval is cleared on unmount;
//   - the router is read through a ref so a new router identity each render never re-subscribes it;
//   - a HIDDEN tab neither refreshes NOR burns an attempt. Pausing rather than skipping is what makes the
//     bound behave: a tab backgrounded for ten minutes must come back fresh, not permanently stale.
//
// NO SPINNER, EVER (08-UI-SPEC §2 "poller-refreshing (silent)"). A roster that flickered a loading state
// every few seconds would be worse than a slightly stale one — and unlike the payment interstitial, nothing
// here is being waited FOR.

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

// Faster than the bell's ambient 30s (people answer in bursts right after the link is shared), slower than
// the payment poller's 2.5s (nothing here is a money transition being waited on).
const POLL_INTERVAL_MS = 15_000;
// Bounded (the T-07-85 discipline): ~10 minutes of refresh, then it stops. A management tab left open
// overnight must not refresh the RSC thousands of times. Any real interaction re-mounts and re-budgets.
const MAX_ATTEMPTS = 40;

export function GroupPoller() {
  const router = useRouter();

  const routerRef = React.useRef(router);
  React.useEffect(() => {
    routerRef.current = router;
  }, [router]);

  React.useEffect(() => {
    let count = 0;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      count += 1;
      routerRef.current.refresh();
      if (count >= MAX_ATTEMPTS) window.clearInterval(id);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}

/**
 * The retry on the calm load-failure state (08-UI-SPEC §Error states). A refresh, nothing more — the read
 * that failed is server-side and owner-scoped, so "try again" can only ever mean "run the RSC again".
 *
 * Neutral `outline`, like every other control on this surface: a transient read failure is not an alarm.
 */
export function RefreshGroupButton({ label = "Try again" }: { label?: string }) {
  const router = useRouter();
  return (
    <Button type="button" variant="outline" className="h-11" onClick={() => router.refresh()}>
      {label}
    </Button>
  );
}
