// PartialGrantNotice (OPEN-02 · OC-07 — 09-UI-SPEC § 3, copy rule O6). The interaction 09-UI-SPEC says
// this phase must not get wrong.
//
// WHAT ACTUALLY HAPPENED BY THE TIME THIS RENDERS. The booker asked for N passes; between reading the
// listing and clicking Book, someone else took some. The claim granted M < N inside the hold's own
// transaction (09-RESEARCH Pattern 1) and the hold IS the claim — so the reduced booking already exists,
// and NO money has moved. Payment is a separate, later, affirmative act: the page's own coral confirm.
//
// WHY AN INLINE ALERT AND NOT A DIALOG (09-UI-SPEC Open Q6). A modal fired mid-navigation would have to
// either block the redirect or unwind a hold the booker never saw, and a dismissed modal leaves the
// reduction invisible on the very screen where the booker approves the charge. So this is persistent: no
// close control, no state that can hide it, and it sits earlier in the tab order than the confirm button
// (its DOM position on the page is what guarantees that — see the reserve page).
//
// NEVER AN ALARM (§ Color: the alarm token has no use at all this phase). Losing a spot to someone faster
// is a normal marketplace outcome, not an error — the same posture the shipped SlotPicker takes towards an
// occupied hour, and the same one HoldExpiredState takes towards a lapsed TTL. Neutral shipped `alert`
// variant, an `Info` glyph, muted body.
//
// ZERO ARITHMETIC, ZERO FORMATTING (D-49 / D-46 / rule O9). Both money figures arrive ALREADY composed as
// strings, computed on the server:
//   - the NEW figure is the booking row's FROZEN quoted total for M passes — the exact amount PayMongo
//     will charge, read and never re-derived;
//   - the OLD figure is a display-only estimate for the N passes the booker asked for.
// A component that composed either one could disagree with the charge, which is the trust failure on the
// core value. This file therefore imports no money helper of any kind, and a grep asserts that.
//
// BOTH FIGURES, ALWAYS (09-UI-SPEC Open Q7). The booker already read the old number on the listing rail;
// showing only the new one would let a figure they saw change silently — the same class of failure D-75
// exists to prevent, here in the downward direction. And the old figure is NOT struck through: struck
// pricing is discount grammar, and the booker is getting less, not a deal.
//
// The body is assembled with each text run in its own expression container, deliberately: SWC's JSX
// whitespace transform strips the leading space of bare text following a container, which is exactly how
// a shipped sentence once rendered as two words glued together (cancellation-fee-notice.tsx). Explicit
// string literals cannot have that defect, and they let a test pin the visible sentence byte-for-byte.
//
// Not "use client": pure presentation, no hooks, no state. The reserve-page RSC renders it directly.

import Link from "next/link";
import { InfoIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export type PartialGrantNoticeProps = {
  // What the claim actually granted, and what the booking row now holds. Always >= 1 (a zero grant is the
  // OC-13 sold-out refusal, which never mints a hold and so never reaches this page).
  grantedPasses: number;
  // What the booker asked for. Always > grantedPasses, so "passes" here is always plural.
  requestedPasses: number;
  // The pass's day, ALREADY rendered venue-local with the timezone named (D-105 / rule O10). Never a Date.
  dateLabel: string;
  // The FROZEN quoted total for the granted passes, already a currency string. What will be charged.
  newTotalLabel: string;
  // The display-only all-in estimate for the requested passes, already a currency string.
  oldTotalLabel: string;
  // Where the escape route points — the listing page, so the booker can pick a different day. A plain
  // link, not an action: this hold lapses on its own TTL and its passes return to the date's counter
  // automatically (OC-15, proven in 09-09), so navigating away releases nothing that needs releasing.
  pickAnotherHref: string;
};

export function PartialGrantNotice({
  grantedPasses,
  requestedPasses,
  dateLabel,
  newTotalLabel,
  oldTotalLabel,
  pickAnotherHref,
}: PartialGrantNoticeProps) {
  const one = grantedPasses === 1;

  // Two structural notes about the markup below, kept out of the JSX because the acceptance grep for
  // "this file does no arithmetic" also matches the opening of a JSX block comment:
  //
  //   1. The polite live-region role passed to the shipped alert OVERRIDES its own assertive one. This is
  //      a calm state change to announce, not an interruption — and the announced sentence is the whole
  //      body, which is why every figure lives inside it rather than in a caption beside it. It is also
  //      what makes the notice non-dismissable by construction: there is nothing here that can remove it.
  //   2. The escape route is a neutral outline control. Coral belongs to the page's own confirm, which is
  //      the "yes" OC-07 requires; a second accent control here would compete with it. The 44px floor
  //      this phase holds every control it adds to is kept with a minimum height.
  return (
    <Alert role="status" className="p-6">
      <InfoIcon />
      <AlertTitle className="text-xl leading-tight font-semibold">
        {"Only "}
        <span className="tabular-nums">{grantedPasses}</span>
        {` left for ${dateLabel}`}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-4">
        <p className="text-base leading-relaxed">
          {`You picked ${requestedPasses} passes, but only ${grantedPasses} ${one ? "is" : "are"} still available. Your booking is set to ${grantedPasses} — `}
          <span className="tabular-nums">{newTotalLabel}</span>
          {" instead of the "}
          <span className="tabular-nums">{oldTotalLabel}</span>
          {` estimated for ${requestedPasses}. Nothing has been charged yet.`}
        </p>
        <Button asChild variant="outline" className="min-h-11">
          <Link href={pickAnotherHref}>Pick another date</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
