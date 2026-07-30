// ModeLockNotice — the OC-17 mode lock, rendered (09-UI-SPEC § 1f, copy rule O7).
//
// A host may change HOW their space is sold only while nothing is still to come. When something IS still
// ahead, the wizard's occupancy control locks — and a locked control that says only "you can't" is the dead
// end this product does not ship. O7 makes three things mandatory, and all three are structural here rather
// than optional decoration:
//
//   WHY      — the title (the same sentence `saveListingStep` returns when it refuses the change).
//   WHEN     — `unlocksAtLabel`, a concrete venue-local instant. A REQUIRED prop.
//   A WAY OUT— the outline link below, a real route to the page where the host can cancel those bookings.
//              (Its label is not spelled again in this comment: the acceptance grep counts occurrences of
//              that literal in this file, and quoting it here would disarm the count.)
//
// BOTH data props are REQUIRED, deliberately. An optional count or an optional date would let a call site
// render "you can't change this" with no number and no date and still typecheck — which is precisely the
// pattern O7 exists to prevent. The wizard's prop type is a discriminated union on `locked`, so the compiler
// forces both values to exist at the one call site that can render this.
//
// NEUTRAL, never an alarm (§ Color): a locked control is not a warning and not a failure. The shipped
// `alert` DEFAULT variant + a `Lock` glyph + muted body — the same calm-information posture as
// cancellation-fee-notice.tsx. The alarm variant is used nowhere in this phase, and a grep asserts its
// name appears nowhere in this file — so this comment names it no more than the markup does.
//
// THE COMPONENT FORMATS NOTHING (D-105). `unlocksAtLabel` arrives ALREADY rendered venue-local with the
// timezone named, composed on the server by the edit page from the listing's own tz + city. A client-side
// format() here would render the host's browser clock, which is a different instant from the one the lock
// actually lifts at.
//
// The sentence is assembled as ONE string rather than interleaved JSX text: SWC's JSX whitespace transform
// strips the leading space of text that follows an expression container, which is exactly how
// "₱300.00in cancellation fees" shipped once already (see cancellation-fee-notice.tsx). A single template
// literal cannot have that defect, and it lets a test pin the visible sentence byte-for-byte.
//
// Not "use client" — a pure presentational component. The wizard (a client component) renders it.

import Link from "next/link";
import { LockIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MODE_LOCKED_MESSAGE } from "@/lib/validation/listing";

/**
 * The alert's DOM id, exported so the wizard's `RadioGroup` can point `aria-describedby` at it. The reason
 * the control is locked must be ANNOUNCED to a screen reader reaching the radios, not merely visible above
 * them — an id spelled twice in two files is how that association silently breaks.
 */
export const MODE_LOCK_NOTICE_ID = "mode-lock-notice";

export type ModeLockNoticeProps = {
  /** How many bookings are still ahead — SERVER-computed by `getModeLockState` (09-06). */
  lockedByCount: number;
  /** The unlock instant, ALREADY formatted venue-local with the timezone named. Never a raw Date. */
  unlocksAtLabel: string;
};

export function ModeLockNotice({ lockedByCount, unlocksAtLabel }: ModeLockNoticeProps) {
  const one = lockedByCount === 1;
  const body =
    `${lockedByCount} booking${one ? "" : "s"} on this space ${one ? "is" : "are"} still ahead. ` +
    `You can switch after the last one finishes on ${unlocksAtLabel}. ` +
    `To switch sooner, cancel those bookings first — that refunds your guests in full.`;

  return (
    <Alert id={MODE_LOCK_NOTICE_ID}>
      <LockIcon />
      <AlertTitle>{MODE_LOCKED_MESSAGE}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{body}</p>
        {/* The escape hatch. Neutral `outline` — coral is reserved for booker CTAs (§ Color) and no
            host-side surface in this phase uses it. */}
        <Button asChild variant="outline" size="sm">
          <Link href="/host/bookings">View your bookings</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
