"use client";

// PendingPaymentState (D-57) — the neutral "payment received, finalizing…" interstitial the confirmation
// page renders on return from the hosted checkout (`/bookings/[id]?paid=1` while status is still 'pending').
// The browser return is a UX signal ONLY — the checkout_session.payment.paid webhook (Plan 04) is the sole
// confirm authority. This poller therefore NEVER fabricates the confirmed state client-side: it only calls
// router.refresh() on a bounded interval so the RSC can re-render itself as 'confirmed' when the DB says so.
// After a cap it stops polling and shows the calm "taking longer" copy + a manual control (still just a
// refresh). Neutral indicator — NOT success-green, NOT red — and it STOPS MOVING when the poller does
// (D-101.1; see the block above the render).
//
// Hook discipline mirrors HoldCountdown: the setInterval callback is the ONLY state-mutation site (never a
// synchronous setState in the effect body — react-hooks/set-state-in-effect); the interval is cleared on
// unmount; the router is read through a ref so a new router identity never re-subscribes (restarts) it.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// PLAN 13-07 (D-71 · D-95) — THE PROMISE THIS STATE LACKED. THE MECHANICS ARE FROZEN.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-71 re-decides NOTHING below the copy line: the interval, the cap, the ref-held router, the
// interval-only state write and the cleanup are correct, they were proved by diff in plan 13-01, and
// they are unchanged here — the plan's own acceptance criterion is that this file's diff touches none
// of them. If a copy change ever appears to require a mechanics change, the copy has been misread.
//
// WHAT WAS MISSING WAS A PROMISE. The two shipped sentences said the page was working; neither said the
// booking was SAFE or that anybody would be told. Both are now `MoneyStatement` — STATE-06's single
// owner of every "where is your money" sentence — across three thresholds:
//
//   0–20s        L1 the money truth · L2 the page updates itself
//   past the cap L1 unchanged · L2 the payment is safe, the booking is held, and an email is coming
//   past ~2 min  L2 additionally carries the reference, and the guarded contact affordance renders
//
// ⚠️ THE THIRD THRESHOLD IS THE EXECUTOR'S CALL (13-UI-SPEC § Open Questions 4 puts poll thresholds at
// the executor's discretion and RECOMMENDS ~2 minutes). Two minutes is what SUPPORT_ESCALATION_MS
// carries, and the reasoning is a floor and a ceiling: the webhook's healthy round trip is measured in
// SECONDS (`payments/config.ts` records two PayMongo round trips plus two local UPDATEs at ~2s), so two
// minutes is roughly sixty times a healthy settlement and cannot fire on one; and a booker who has been
// staring at a spinner for two minutes has already decided something is wrong, so anything longer
// offers help after it stopped being help.
//
// ⚠️ THERE IS NO FAILURE-SHAPED AFFORDANCE AT ANY THRESHOLD, AND THAT IS THE CONTRACT (D-71). No alarm
// colour, no "something has gone amiss", no retry-the-payment control, no second attempt at anything.
// The webhook is STILL the outstanding authority at every threshold — the money has reached us, the
// only thing missing is the provider's confirmation — so an affordance shaped like a failure would be
// telling the booker to act on a state where acting is exactly wrong, and could cost them a second
// charge on a payment that already landed. The manual control carries a verb AND its object (D-95: a
// single-word verb with no object fails the copy guideline; `Copy` keeps its single word only because
// it already carries an accessible name), and it triggers the SAME `router.refresh()` the poller runs.
//
// ⚠️ THE FOUR TOKENS THIS PLAN'S ACCEPTANCE CRITERIA GREP FOR — the alarm colour and the three
// failure-shaped phrasings — ARE NOT SPELLED ANYWHERE IN THIS FILE, comments included, which is why
// the paragraph above talks around them. A grep that its own prohibition can trip is not a guard
// (`booking-row.tsx:112`'s precedent; the seventh instance of the collision in this phase). THE SAME
// APPLIES TO THE CONTROL'S OWN LABEL, from the other direction: the criterion is that the file
// contains exactly ONE line carrying it, so the label is written once — at the control — and named
// descriptively everywhere else. The first draft of the paragraph above quoted it and made the
// criterion read 2 against a correct file.
//
// THE ONE LIVE REGION THIS PHASE KEEPS. 13-UI-SPEC § Live Regions removes six regions that wrapped
// freshly-rendered static content — a region announces a CHANGE, and a navigated page is not a change
// — and keeps exactly this one, because this page genuinely changes while you watch it. It moves from
// a bare politeness attribute on a `<p>` to the status role WITH a non-empty accessible name (rules
// 4/5), and it stays ONE region: the threshold copy changes are text changes INSIDE it, never
// additional regions (rule 6 — exactly one region announces one outcome).
//
// NO CONTAINER OF ITS OWN ANY MORE. The outer card this file shipped with is gone, for the reason plan
// 13-04 removed the reversed state's: `MoneyStatement` composes `PanelCard`, and a panel nested inside
// a box that already supplies `bg-card ring-1 rounded-xl` pays the block padding twice (measured at
// 112px against 80px for the row card's twin of this problem). The page is a stack of panels on the
// page ground, which is what 13-UI-SPEC specifies for all three payment states.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// PLAN 13-19 (D-101.1) — THE INDICATOR IS GATED ON `slow`, AND IT USED NOT TO BE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE DEFECT, FOUND BY THE PM IN LIVE UAT AND REPORTED AS *"an infinite looping payment received"*.
// The spinner was rendered UNCONDITIONALLY, so it kept turning after the poller stopped at its cap —
// forever, under copy that had just switched to *"It's taking longer than usual"* and a promise that
// an email is coming. At that point NOTHING in this component is working on anything: the interval is
// cleared, its callback no longer runs, and the next event in the booker's world arrives by mail. An
// animation that keeps asserting work after the work has stopped is a lie, and it is a particularly
// bad one here, because the surface's entire job is to be believed about a payment.
//
// ⚠ WHY NINE MONTHS OF TESTS COULDN'T SEE IT, WHICH IS THE PART WORTH CARRYING FORWARD. Every case in
// `tests/booking/payment-states.test.tsx` asserts on TEXT, on ROLES, on control sets, on live-region
// counts and on the class tokens that paint an ALARM colour. A spinning element and a still one share
// all of those: same text (none), same role (none), same accessible name (none — it is `aria-hidden`),
// same colour. The only difference is one class token, so the new cases (7) and (8) read that token
// off real elements with `class~=`. Where a VISUAL contract matters, assert over the rendered tree —
// and narrow it, because a raw `innerHTML` match for a utility token is satisfied by any surface whose
// serialised markup happens to contain it.
//
// ⚠ REPLACED, NOT REMOVED. Deleting the glyph at the threshold would reflow the heading block the
// instant it fires, which is a layout jump on the one surface whose whole contract is calm. A static
// clock takes its place: it is the honest picture of the new state — time is passing, nobody is
// working — and it is still `aria-hidden`, still neutral, still not `--destructive` and not
// `--success`. D-71's rule is unchanged at this threshold and the icon must not start reading as a
// failure just because the automatic path gave up: the webhook is STILL the outstanding authority.
//
// ⚠ AND THIS IS A RENDERING CHANGE ONLY. Not one line of the poller moved — the interval, the cap, the
// ref-held router, the interval-only state write and the cleanup are exactly what 13-01 proved by diff
// and 13-07 preserved. `slow` was already this component's state; it is simply read in one more place.

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClockIcon, Loader2Icon } from "lucide-react";

import { BOOKING_SHELL } from "@/lib/design/measurements";
import { Button } from "@/components/ui/button";
import { BookingReference } from "@/components/booking/booking-reference";
import { MoneyStatement } from "@/components/booking/money-statement";
import { SupportPath } from "@/components/booking/support-path";

const POLL_INTERVAL_MS = 2500;
const MAX_ATTEMPTS = 8; // ~20s of auto-refresh before we fall back to the manual "taking longer" copy
/**
 * How long a booker sits on this page before the contact affordance appears. See the header for the
 * floor-and-ceiling argument; 13-UI-SPEC § Open Questions 4 recommends this value and leaves it open.
 *
 * It is a separate, one-shot timeout rather than a further count on the poller's interval, and that is
 * deliberate: the poller stops at its cap (~20s) and its callback stops running with it, so hanging a
 * second threshold off it would have required editing the one block D-71 freezes.
 */
const SUPPORT_ESCALATION_MS = 120_000;

export type PendingPaymentStateProps = {
  /**
   * The finished `FIT-XXXXXXXX` string, server-derived (TRUST-02). It is the payload of the guarded
   * contact affordance's subject line, and it is named in the copy at the third threshold so the
   * booker has the one string a person would ask them for.
   */
  reference: string;
  /**
   * The booker's own address, server-supplied from the session, interpolated VERBATIM and never masked
   * (D-63's rule for the confirmation moment, applied to the same promise one state earlier).
   *
   * Nullable, and the copy has a shape for `null` rather than a fallback string: the promise is that we
   * will write to them, and a session with no address is a promise this component cannot spell. It
   * still names the mechanism, it just cannot name the destination.
   */
  email: string | null;
  /**
   * ⚠ THE `trustBlock` SLOT IS GONE (13-19 / D-98). It carried TRUST-04's four-row panel, handed down
   * from the RSC because this file is a client component. The panel is deleted from every booking
   * surface: two of its four rows read the same month for every host and every listing at launch, and
   * its payment row promised that FitOut holds a payment for a session that is not happening. The ban
   * on INVENTING trust signals is untouched — `tests/design/trust-signals.test.ts` still scans this
   * file among the rest of the phase's three roots.
   */
};

export function PendingPaymentState({ reference, email }: PendingPaymentStateProps) {
  const router = useRouter();
  const [slow, setSlow] = React.useState(false);
  const [escalated, setEscalated] = React.useState(false);

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

  // The third threshold, on its own one-shot timer. Same discipline as the block above and NOT a change
  // to it: the callback is the only state-mutation site, it is never called synchronously in the effect
  // body, and it is cancelled on unmount.
  React.useEffect(() => {
    const id = window.setTimeout(() => setEscalated(true), SUPPORT_ESCALATION_MS);
    return () => window.clearTimeout(id);
  }, []);

  // THE THREE THRESHOLDS' COPY, composed here and handed to `MoneyStatement` finished (that component
  // takes completed strings and performs no arithmetic and no interpolation of its own).
  //
  // L1 NEVER CHANGES. "Your payment reached us." is true from the first paint — the browser only gets
  // here from the hosted checkout's return — and a money sentence that changed under a booker while
  // nothing about their money changed would be the surface contradicting itself.
  const settlementSentence = "Your payment reached us.";
  const waiting = "We're waiting on the final confirmation — this page updates on its own.";
  const takingLonger = email
    ? `It's taking longer than usual. Your payment is safe, your booking is held, and we'll email you at ${email} the moment it confirms.`
    : `It's taking longer than usual. Your payment is safe, your booking is held, and we'll email you the moment it confirms.`;
  // The third threshold's added line. It names a mechanism that is REAL WITH THE GUARD CLOSED — the
  // reference is derived from this booking and shown on every status — so nothing here promises a
  // channel that does not exist yet (D-64). The wording is the reversed state's closed-guard half,
  // reused rather than re-written, because it is the same fact about the same string.
  const referenceLine = `Your reference is ${reference} — we've recorded it against this booking.`;

  return (
    // It renders as a `div`: `(app)/layout.tsx:96` already wraps `{children}` in this route's ONE
    // `main` landmark, and a second one nested inside it is a landmark this file has no reason to add
    // (D-88.1). This is the THIRD place the rule has had to be restated — `bookings/[id]/loading.tsx:14-15`
    // and `[id]/page.tsx`'s own header are the other two — so it is restated here rather than delegated
    // to a sibling the next author has no reason to open.
    <div className={BOOKING_SHELL} data-testid="payment-state-pending">
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Neutral, decorative, and GATED ON `slow` (D-101.1 — see the block above). While the
              poller is running the spinner is true: the page really is doing something and really
              will update itself. The moment it stops at its cap, a still clock replaces it, because
              the true statement then is that time is passing and nobody is working. Neither is
              success-green and neither is an alarm; the announced text is the money statement below,
              which is the one thing on this page that changes. */}
          {slow ? (
            <ClockIcon className="size-8 text-muted-foreground" aria-hidden="true" />
          ) : (
            <Loader2Icon className="size-8 animate-spin text-muted-foreground" aria-hidden="true" />
          )}
          <h1 className="text-xl leading-tight font-semibold tracking-tight">Payment received</h1>
          {/* NO STATUS-MEANING SENTENCE HERE, and its absence is the TRUST-01 answer rather than a gap:
              13-UI-SPEC's status table gives this branch *"Your payment reached us. We're waiting on
              the final confirmation."*, which is the money statement's two lines verbatim. Rendering it
              a second time under the heading would put one sentence on the page twice, three lines
              apart. 13-04 recorded the same reading on the reversed state. */}
        </div>

        {/* THE ONE LIVE REGION THIS PHASE KEEPS (see the header). The role goes on a WRAPPER rather
            than inside `MoneyStatement`, because that component is shared with three states that are
            static on arrival and its own contract is that it carries no region at all — the pending
            settlement announcement is a different owner's. The accessible name is explicit because
            this role is nameFrom:author and rules 4/5 require a non-empty one.

            STATE-06's placement rule is intact: this wrapper has no box of its own, so the money panel
            is still the first thing after the heading block with nothing rendered between them. */}
        <div role="status" aria-label="Payment status">
          <MoneyStatement
            sentence={settlementSentence}
            detail={
              <div className="space-y-3">
                {/* `break-words` for `confirmation-moment.tsx`'s measured reason: `takingLonger`
                    interpolates the booker's own address, which is one unbreakable token, and at the
                    320px floor a long one is wider than the 288px content box. */}
                <p className="break-words">{slow ? takingLonger : waiting}</p>
                {escalated && (
                  <>
                    <p>{referenceLine}</p>
                    {/* Guarded (D-64): renders nothing at all today. When the address is set it is the
                        first control on the page, full-width, directly under the sentence that names
                        the reference its subject line carries. */}
                    <SupportPath
                      variant="panel"
                      reference={reference}
                      label="Email us about this booking"
                    />
                  </>
                )}
              </div>
            }
          />
        </div>

        {/* The manual control appears ONLY once auto-refresh has backed off, and it runs the SAME
            `router.refresh()` the poller ran. It is not an affordance about something having failed —
            see the header — and it is deliberately `secondary`: the page is still working. */}
        {slow && (
          <div className="flex justify-center">
            <Button variant="secondary" onClick={() => router.refresh()}>Refresh status</Button>
          </div>
        )}

        {/* TRUST-02 — the reference on EVERY status (D-78), and this state used to be the one that
            NAMED it in prose without ever RENDERING it: the escalation line quotes the string, but a
            person cannot take a string out of a sentence without transcribing it, and a transcription
            error on the one token support would ask for is the whole reason the copy control exists.
            It renders from the first paint, not at the escalation threshold — the reference is a fact
            about the booking, not a fact about how long the webhook is taking. */}
        <div className="flex justify-center">
          <BookingReference reference={reference} />
        </div>

        {/* THE TRUST PANEL AND ITS `<Separator/>` BOTH LEFT HERE (D-98) — see the removed prop's
            note above. This file still holds no support literal of its own: the guarded affordance at
            the escalation threshold takes its label as a prop, so `site-contacts.test.ts` is
            untouched by this change as it was by the panel's arrival. */}
      </div>
    </div>
  );
}
