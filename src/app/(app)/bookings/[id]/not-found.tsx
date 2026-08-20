// The booking detail route's not-found boundary — what every `notFound()` under `bookings/[id]` renders.
//
// 11-UI-SPEC deferred this file to Phase 13 by name, and 13-CONTEXT D-93 accepted it as a correction
// inside this phase's domain rather than as new scope.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// THE PARITY RULE, AND IT IS A SECURITY PROPERTY RATHER THAN A COPY PREFERENCE
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `page.tsx`'s owner gate calls `notFound()` in THREE situations and this page is what all three land
// on: there is no session, there is no such booking, and the booking belongs to somebody else
// (T-04-CONFIRMIDOR, ASVS V4). The copy below MUST NOT distinguish them, and the reason is that any
// difference at all — a different sentence, a different action, a different glyph, a different heading
// level — turns this page into an ownership oracle: request a booking id, read which of two pages came
// back, and you have learned whether that id names a real booking without ever being allowed to see it.
// This page renders a name, a full street address and payment amounts one gate away, so the cost of
// that leak is not abstract.
//
// It is the same class of defect plan 08-06 closed on the invite route, from the other direction: there
// the fix was to make a not-found page identical to a page that renders with HTTP 200. Here both
// answers are already 404s from the same boundary, so parity is free — and the ONE way to lose it is to
// "improve" the copy for one of the cases. Do not add "this booking isn't yours", do not add a sign-in
// prompt, do not branch on the session.
//
// ⚠ THE COPY IS THE THREE STRINGS 13-UI-SPEC § Copywriting Contract gives, verbatim. The body says *"or
//   the booking may belong to a different account"* — an OR over both cases, which is the honest way to
//   describe a page that genuinely cannot tell you which one you hit.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY A `div` AND NOT A `main`, AND WHY `EmptyState` AND NOT `ErrorState`
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `(app)/layout.tsx:96` already wraps `{children}` in this route's ONE `main` landmark (D-88.1), and a
// second one nested inside it is announced as a duplicate by some assistive tech and dropped by others.
// `listings/[id]/(detail)/not-found.tsx` opens its own because it renders under a layout that supplies
// none — the rule is per-document, not per-file, so the two files differ correctly.
//
// `EmptyState` rather than `ErrorState` on two independent grounds. The first is that this is a STATE
// and not a fault: a stale link is a normal thing to have, and the person reading this did nothing
// wrong. The second is mechanical and decides it on its own — `ErrorState` paints its glyph with the
// alarm token and requires an `onRetry` handler, and 13-UI-SPEC § Color states that the destructive
// variant renders NOWHERE in this phase. There is also nothing to retry: the booking is not yours or is
// not there, and pressing a button will not change either.
//
// The single action is the booker's own list rather than a browser-flavoured "go back": somebody who
// opened a stale booking link still has bookings, and that is where the one they meant will be.

import Link from "next/link";
import { CalendarOffIcon } from "lucide-react";

import { BOOKING_SHELL } from "@/lib/design/measurements";
import { EmptyState } from "@/components/patterns/empty-state";
import { Button } from "@/components/ui/button";

export default function BookingNotFound() {
  // `BOOKING_SHELL`, not a hand-written twin of it. Plan 13-01 collapsed eleven copies of this class
  // string into one constant precisely so a twelfth surface could not drift a step off the ladder, and
  // this page is a `bookings/**` surface like the eleven. The container is a `div` — see the header.
  return (
    <div className={BOOKING_SHELL}>
      <EmptyState
        icon={CalendarOffIcon}
        title="We couldn't find that booking"
        body="The link may be old, or the booking may belong to a different account."
        actions={
          <Button asChild>
            <Link href="/bookings">Your bookings</Link>
          </Button>
        }
      />
    </div>
  );
}
