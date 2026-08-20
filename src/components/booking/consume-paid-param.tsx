"use client";

// ConsumePaidParam (BFLOW-08 · D-60, D-89) — the confirmation moment's DECAY, in one mount effect.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠️ THIS COMPONENT MAY BE MOUNTED ON THE **CONFIRMED** BRANCH ONLY. IT IS THE PHASE'S MOST
//    EXPENSIVE MISTAKE TO MAKE, AND IT ONLY APPEARS UNDER A SLOW WEBHOOK.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `(app)/bookings/[id]/page.tsx` has, and has had since Phase 4, this exact shape:
//
//     if (bk.status === "pending") {
//       if (paid === "1") return <PendingPaymentState … />;   ← the poller lives in here
//       …probe…
//       redirect(`/listings/${bk.listingId}/book?hold=${bk.id}`);   ← the trap
//     }
//
// `PendingPaymentState` calls `router.refresh()` on an interval — 8 attempts, 2500ms apart. Next's own
// docs define that as *"Refresh the current route. Making a new request to the server, re-fetching data
// requests, and re-rendering Server Components"*. THE CURRENT ROUTE. So the moment this component
// rewrites the address bar, the "current route" no longer carries the checkout-return parameter, and
// the very next poll re-renders this RSC without it — falling into whatever the no-parameter path
// leads to. Today that is a third-party probe and then a redirect back to checkout, so a booker who
// has ALREADY PAID is silently navigated to a payment page in the middle of their own webhook.
//
// The failure does not change shape if that landing changes; it only gets worse. 13-RESEARCH Pitfall 2
// records the other direction: were the redirect replaced by the not-completed state, the poller would
// instead land the booker on *"You haven't been charged"* while their payment settles — a FALSE MONEY
// STATEMENT, which is the failure this entire phase exists to remove. Whichever landing the
// no-parameter path gets, the poller must not be able to reach this component.
//
// The rule is therefore not "be careful near the pending branch". It is: consume the parameter only
// after the DATABASE says `confirmed`, which is a terminal state the poller cannot re-enter.
// `e2e/confirmation-decay.spec.ts` drives a seeded `pending` row through all 8 attempts and counts
// `framenavigated` events; that count is asserted to be zero, and the assertion was watched FAILING
// with this component hoisted above the status branching. It is the only proof the mount point is
// load-bearing rather than incidental.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// PROJECT D-57 IS UNCHANGED AND BINDING: THE PARAMETER IS A UX SIGNAL, NEVER PROOF OF PAYMENT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `?paid=1` arrives from a third-party redirect and is trivially forgeable. The
// `checkout_session.payment.paid` webhook remains the SOLE confirm authority. Consuming the parameter
// must therefore not move any branch off DB status — the moment's trigger is the parameter **AND**
// `booking.status === "confirmed"`, both, always, and a forged parameter on a non-confirmed booking
// renders nothing new. This file removes a query string; it decides nothing.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE NATIVE HISTORY API, WHY THE ENTRY-REPLACING CALL, AND WHY AN EFFECT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Next.js documents the two native history-stack methods as SUPPORTED and ROUTER-INTEGRATED: they
// update the browser's history stack without reloading the page, and — this is the half that matters —
// they integrate into the Next.js Router, so `usePathname` and `useSearchParams` stay in sync with what
// the address bar now says. Source: nextjs.org/docs/app/getting-started/linking-and-navigating §
// "Native History API", quoted verbatim in `13-RESEARCH.md § Architecture Patterns → Pattern 1`. No
// server request, no RSC re-fetch — the moment stays on screen.
//
// ⚠️ GREP TRIPWIRE, AND IT IS WHY THAT PARAGRAPH PARAPHRASES A QUOTE INSTEAD OF CARRYING IT. This
// plan's acceptance criteria are raw counts over THIS FILE: the history call appears on exactly ONE
// line, and its entry-PUSHING twin and the ROUTER's own replace method appear on ZERO. The upstream
// sentence names both methods twice, so reproducing it verbatim here makes a correct file read 3 and 2
// — the plan's own two halves in direct collision, and the thirteenth instance of this shape in Phase
// 13. A grep is only a real guard if the comment forbidding a thing cannot trip it (13-PATTERNS § H).
// So the quote is cited to where it lives in full, the two rejected calls are described rather than
// spelled, and the accepted one is written once — at the call. Do not "helpfully" name them here; that
// disarms all three checks for good.
//
//   • THE ROUTER'S OWN REPLACE METHOD IS REJECTED. It performs a real client-side navigation and
//     re-fetches the RSC payload, so the server would re-render without the parameter and the
//     confirmation moment would vanish on the very frame it appeared.
//   • THE ENTRY-PUSHING TWIN IS REJECTED. It would add a history entry, letting the booker press Back
//     INTO a moment whose premise has since changed. D-60 rules that out. Replacing the entry keeps
//     Back pointing at the cross-origin hosted checkout page, exactly as it does today.
//   • A COOKIE AND A COLUMN WERE BOTH REJECTED AT DECISION TIME (D-60): the column because v1.1 ships
//     ZERO schema migrations (D-80), the cookie because it is a third piece of state for a marginally
//     different result.
//
// IT IS A MOUNT EFFECT AND NOT A RENDER-TIME CALL, and that is the reason this file carries the client
// directive. Writing browser history is a side effect on a global: called during render it runs twice
// under React's double-invoked development render, and has no defined behaviour during SSR at all.
// `hold-expired-state.tsx:35-42` carries the same argument for its own focus move, one component over.
//
// IT RENDERS `null`. There is nothing to show — the moment above it is the output; this is its expiry.

import * as React from "react";
import { usePathname } from "next/navigation";

export function ConsumePaidParam() {
  // `usePathname()` rather than a prop: it is already the value we want to land on (the same route,
  // minus the query string), and keying the effect on it means a client-side navigation to a DIFFERENT
  // booking re-runs the strip instead of leaving a stale path behind.
  const pathname = usePathname();

  React.useEffect(() => {
    window.history.replaceState(null, "", pathname);
  }, [pathname]);

  return null;
}
