"use client";

// PendingPaymentState (D-57) — the neutral "payment received, finalizing…" interstitial the confirmation
// page renders on return from the hosted checkout (`/bookings/[id]?paid=1` while status is still 'pending').
// The browser return is a UX signal ONLY — the checkout_session.payment.paid webhook (Plan 04) is the sole
// confirm authority. This poller therefore NEVER fabricates the confirmed state client-side: it only calls
// router.refresh() on a bounded interval so the RSC can re-render itself as 'confirmed' when the DB says so.
// After a cap it stops polling and shows the calm "taking longer" copy + a manual control (still just a
// refresh). Neutral spinner — NOT success-green, NOT red — until the real status lands.
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

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { BOOKING_SHELL } from "@/lib/design/measurements";
import { Button } from "@/components/ui/button";
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
          {/* Neutral, decorative spinner — NOT success-green and NOT an alarm. The announced text is
              the money statement below, which is the one thing on this page that changes. */}
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" aria-hidden="true" />
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
                <p>{slow ? takingLonger : waiting}</p>
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
      </div>
    </div>
  );
}
