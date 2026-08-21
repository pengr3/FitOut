"use client";

// NotCompletedState (D-70 · STATE-05 · STATE-06) — the landing for a booker whose checkout did not
// finish. NET-NEW: nothing rendered for this state before this file, which is why STATE-05 counted
// three payment states and the app shipped two.
//
// WHEN IT RENDERS. `booking.status === 'pending'`, the D-84 probe says the hosted checkout session is
// still `active`, AND the hold is still alive against the DB clock. All three, decided in
// `(app)/bookings/[id]/page.tsx`'s pending branch — see that branch for the ordering argument and for
// what an unanswered probe does.
//
// ⚠️ THE BOUNDARY THAT DEFINES THIS FILE, AND IT IS A BOUNDARY RATHER THAN A DETAIL (D-70).
// THIS IS NOT THE EXPIRED-HOLD LANDING. `hold-expired-state.tsx` already owns that one, one navigation
// away on the reserve page, and it owns it completely: the reserve page renders it directly for a hold
// that is already dead on arrival. A second component saying the same thing in a second place is two
// surfaces to keep true about one fact. So the page-level discriminator sends a lapsed hold THERE and
// only a LIVE hold here, and the plan's own success criterion is that this state never renders for an
// expired hold.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE ONE PLACE IN THE APP WHERE "YOU HAVE NOT BEEN CHARGED" IS TRUE OF A PAYMENT STATE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// That sentence is STATE-05's language for THIS state and only this state. It shipped for two phases
// on `payment-reversed-state.tsx`, where it is the inverse of the truth in two directions at once —
// money DID leave the booker's account there, and on the manual rails it has not come back — and
// plan 13-04 removed it and left behind `tests/design/reversed-copy.test.ts`, a committed gate that
// keeps it out of that file forever. This is the file it belongs in: checkout never completed, so no
// charge was ever captured, and the booker's bank app agrees with the screen.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE RETRY IS A LINK, AND THAT IS A MONEY DECISION RATHER THAN A ROUTING ONE (T-13-07-DOUBLECHARGE)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The primary below goes to the SHIPPED reserve page for the SAME hold. It does not call a server
// action, and it must never be "improved" into one. The reserve page's `Confirm & pay` runs the
// server action that claims a compare-and-swap checkout lease and EXPIRES the persisted session
// before minting a new one, and that expire-before-create step is the ONLY thing standing between a
// second attempt and a second charge: PayMongo does NOT honour an idempotency key on checkout-session
// creation. That was probed live on this project and it cost a real double charge on a rail that
// could not be refunded automatically. Every retry path in the app therefore re-enters the one guarded
// door rather than opening its own.
//
// ⚠️ THE SERVER ACTION AND THE SESSION-MINTING FUNCTION ARE NAMED DESCRIPTIVELY ABOVE RATHER THAN
// QUOTED. This plan's acceptance criterion for this file is a raw grep for both identifiers returning
// ZERO — the falsifiable form of "there is no second minting path here" — so spelling either one in
// prose would make the criterion read 1 against a correct file. That is `booking-row.tsx:112`'s
// precedent and the sixth time Phase 13 has hit the collision (13-01 the landmark, 13-02 the
// politeness attribute, 13-03 the raising keyword, 13-04 the alarm token and the removed gate).
//
// THE RAILS LINE COSTS NOTHING ON THE MONEY PATH, and that is why it is copy rather than code. The
// checkout-session creator already hardcodes GCash, Maya, card and QR Ph on EVERY attempt, so naming
// them beneath the CTA is a UX gain with zero change to the charge call. ⚠️ Do not thread a
// payment-method parameter through the money path to "support" this sentence — the sentence is already
// true, and the money path is the last place to add a parameter for a copy reason.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// CONTAINERS, COLOUR AND REGIONS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • NO BOX OF ITS OWN. This file is deliberately NOT on `card-pattern-coverage.test.ts`'s
//     `ALLOWED_RAW_CARD` list and does not open a raw card primitive. The one panel on the surface is
//     the money statement's — `MoneyStatement` composes `PanelCard tone="muted"` — and a container
//     wrapped around it would pay the block padding twice (measured at 112px against 80px for the row
//     card's twin of this problem). This is the shape `payment-reversed-state.tsx` already carries.
//   • THE CONTAINER IS A `div`: `(app)/layout.tsx:96` already wraps `{children}` in this route's ONE
//     `main` landmark, and a second one nested inside it is a landmark this file has no reason to add
//     (D-88.1, plan 13-01).
//   • ZERO ALARM-COLOUR TOKENS. 13-UI-SPEC § Color: the token DS-10 reserves for a genuine failure
//     needing a human renders NOWHERE in this phase, and a checkout that did not finish is the least
//     deserving surface in it — nothing has gone wrong that the booker caused, no money moved, and the
//     slot is still theirs. The glyph is muted and neutral for the same reason, and it is deliberately
//     not the expiry state's clock glyph: two states that share an icon are two states a booker reads
//     as one. (The token is named descriptively here rather than quoted, for the grep reason above.)
//   • NO LIVE REGION. A live region announces a CHANGE; a freshly navigated page is not a change, it
//     is a page, and a screen reader already reads it from the top (13-UI-SPEC § Live Regions). The
//     one thing on this surface that DOES change under the booker — the hold running out — is already
//     announced by the countdown's own region, and GATE-03 rule 6 gives one outcome exactly one
//     region. A second region here would be the double-announcement shape.
//
// A CLIENT COMPONENT, and the reason is the in-place expiry swap: the countdown tells this component
// when the hold lapses and the retry control is replaced without a navigation. Everything it renders
// underneath — the money statement, the reference, the guarded support row — is composed, never
// re-rolled.
//
// Analog: `hold-expired-state.tsx` (the calm recovery-state idiom this file's structure comes from)
// and `payment-reversed-state.tsx` (the sibling payment state's composition).

import * as React from "react";
import Link from "next/link";
import { RotateCcwIcon } from "lucide-react";

import { BOOKING_SHELL } from "@/lib/design/measurements";
import { Button } from "@/components/ui/button";
import { BookingReference } from "@/components/booking/booking-reference";
import { MoneyStatement } from "@/components/booking/money-statement";
import { RequestCountdown } from "@/components/booking/request-countdown";

export type NotCompletedStateProps = {
  /** The hold being retried. It is the id the reserve page re-enters, never a new hold. */
  bookingId: string;
  /** Where the recovery link goes once the hold has lapsed. */
  listingId: string;
  /**
   * The finished `FIT-XXXXXXXX` string, server-derived and rendered verbatim (TRUST-02: every status
   * carries it). Never re-derived on the client — `node:crypto` does not enter the bundle.
   */
  reference: string;
  /**
   * The hold's own `expires_at`, as an ISO instant. Server-supplied, and the page has ALREADY compared
   * it against the Postgres clock before rendering this state — the countdown below is a display cue,
   * exactly as it is everywhere else in the app, and the DB clock remains the sole authority.
   */
  holdExpiresAt: string;
  /**
   * ⚠ THE `trustBlock` SLOT IS GONE (13-19 / D-98). It carried TRUST-04's four-row panel, handed down
   * from the RSC because this file is a client component. The panel is deleted from every booking
   * surface: two of its four rows read the same month for every host and every listing at launch, and
   * its payment row promised that FitOut holds a payment for a session that is not happening. The ban
   * on INVENTING trust signals is untouched — `tests/design/trust-signals.test.ts` still scans this
   * file among the rest of the phase's three roots.
   */
};

export function NotCompletedState({
  bookingId,
  listingId,
  reference,
  holdExpiresAt,
}: NotCompletedStateProps) {
  // The in-place swap 13-UI-SPEC specifies. It is one-way and it starts false BY CONSTRUCTION: the
  // page only renders this component for a hold that was alive on the server, so a `true` initial
  // value would mean the discriminator upstream had already failed.
  const [holdOver, setHoldOver] = React.useState(false);
  // A stable identity so the countdown's own ref-sync effect never re-subscribes its interval.
  const handleExpired = React.useCallback(() => setHoldOver(true), []);

  return (
    <div className={BOOKING_SHELL} data-testid="payment-state-incomplete">
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Muted, neutral, and NOT the expiry state's glyph — see the header. */}
          <RotateCcwIcon className="size-8 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="text-xl leading-tight font-semibold">
              Your payment didn&apos;t go through
            </h1>
            {/* TRUST-01 — the status says what it MEANS, not only what it is. 13-UI-SPEC's status
                table gives this branch *"This checkout didn't finish. Your slot is still held."*; the
                second half is dropped here and only here, because the money statement below states it
                in full one line later and three renderings of one promise in three lines is not
                emphasis, it is noise. The half that survives is the half nothing else says. */}
            <p className="mx-auto max-w-prose text-body text-muted-foreground">
              This checkout didn&apos;t finish.
            </p>
          </div>
          {/* ONE OWNER FOR A COUNTDOWN DISPLAY — the shipped component, not a third clock.
              `finalHourEmphasis={false}` is load-bearing rather than cosmetic: that emphasis exists
              for an HOURS-scale window, where entering the last hour is a threshold worth marking,
              and it paints the digits with the alarm token the whole time on a fifteen-minute
              horizon. On this surface it would be permanent, and permanent emphasis is not emphasis.
              ⚠ The tick is per-minute (the component's horizon is 24h), so the digits step 15m → 14m
              rather than counting seconds. Recorded rather than fixed: retuning the tick belongs to
              the file's owner, and a per-minute hold display is honest — the DB clock decides, and
              this is a cue. */}
          <RequestCountdown
            expiresAt={holdExpiresAt}
            label="Slot held for"
            expiredLabel="Hold expired"
            finalHourEmphasis={false}
            onExpire={handleExpired}
          />
        </div>

        {/* STATE-06 — the money statement is the FIRST element after the heading block, and nothing
            renders between the two. Line 2 is dropped once the hold lapses: it promises a held slot,
            and at that moment the promise is false. Line 1 stays true either way, which is the whole
            reason this state exists. */}
        <MoneyStatement
          sentence="You haven't been charged."
          detail={holdOver ? undefined : "Your slot is still held — finish paying and it's yours."}
        />

        {holdOver ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-body text-muted-foreground">This hold has expired.</p>
            {/* The single coral, now pointing at recovery instead of at payment. The page-level truth
                arrives on the next navigation — this is the in-place half. */}
            <Button asChild variant="brand" size="touch">
              <Link href={`/listings/${listingId}`}>Back to availability</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            {/* THE ONE CORAL ON THIS SURFACE (accent item 1, nothing new). A LINK — see the header. */}
            <Button asChild variant="brand" size="touch">
              <Link href={`/listings/${listingId}/book?hold=${bookingId}`}>Try paying again</Link>
            </Button>
            <p className="mx-auto max-w-prose text-label text-muted-foreground">
              You can pay with GCash, Maya, card or QR Ph — a failed GCash payment doesn&apos;t cost
              you your slot.
            </p>
          </div>
        )}

        {/* TRUST-02 — the reference on every status, including this one. */}
        <div className="flex justify-center">
          <BookingReference reference={reference} />
        </div>

        {/* THE TRUST-BLOCK SLOT AND ITS `<Separator/>` BOTH LEFT WITH THE PANEL (D-98). A rule with
            nothing after it is a rule dividing the content from the bottom of the page. */}
      </div>
    </div>
  );
}
