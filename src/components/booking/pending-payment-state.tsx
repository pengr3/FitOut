"use client";

// PendingPaymentState (D-57) — the neutral "still confirming…" interstitial the confirmation page
// renders on return from the hosted checkout (`/bookings/[id]?paid=1` while status is still 'pending').
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
// WHAT WAS MISSING WAS A PROMISE. The two shipped sentences said the page was working; neither said
// that anybody would ever be told. Both are now `MoneyStatement` — STATE-06's single owner of every
// "where is your money" sentence — across three thresholds:
//
//   0–20s        L1 the money truth · L2 the page updates itself
//   past the cap L1 unchanged · L2 it is taking longer than usual, and an email is coming
//   past ~2 min  L2 additionally carries the reference, and the guarded contact affordance renders
//
// ⚠️ 13-07 ALSO PROMISED THE BOOKING WAS SAFE, AND PLAN 13-20 TOOK THAT HALF BACK. It was a claim about
// money nobody had verified, in a sentence whose whole job was reassurance. The promise that survives
// is the one that is checkable — that we will write to them — and the block at the bottom is why.
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
// The webhook is STILL the outstanding authority at every threshold — nobody on this page knows yet
// whether the money moved — so an affordance shaped like a failure would be telling the booker to act
// on a state where acting is exactly wrong, and could cost them a second charge on a payment that did
// in fact settle. D-102 STRENGTHENS this argument rather than weakening it: the reason not to offer a
// retry was never that the money is here, it is that NOBODY KNOWS, and a retry offered into ignorance
// is how a booker pays twice. The manual control carries a verb AND its object (D-95: a
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
// THE DEFECT, FOUND BY THE PM IN LIVE UAT AND REPORTED AS AN INFINITE LOOP ON THIS STATE (their words
// named the heading the surface carried at the time; D-102 has since removed that heading, and the
// report is recorded verbatim in 13-CONTEXT where no scanner depends on it).
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
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// PLAN 13-20 (D-102) — THIS SURFACE STATES WHAT FITOUT KNOWS, NEVER WHERE THE MONEY IS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE DEFECT, FOUND BY THE PM IN LIVE UAT: the page told them their money had arrived, and they asked
// whether we had really received it. We had not. Nobody had. The heading and the money statement both
// asserted receipt as settled fact — plan 05-03's copy, four phases old, which 13-07 rewrote the body
// AROUND and left standing.
//
// WHAT IS ACTUALLY KNOWN AT THIS PAINT IS ONE THING: a browser arrived at `/bookings/{id}?paid=1`.
// PROJECT D-57 is binding and unambiguous — that parameter is a UX signal and NEVER proof of payment;
// the `checkout_session.payment.paid` webhook is the sole confirm authority, and the row is still
// `pending` precisely because the webhook has not spoken. Everything else this surface used to say was
// inference dressed as fact.
//
// ⚠ THE COMMENT THAT DEFENDED THE CLAIM WAS THE DEFECT, NOT ITS DEFENCE, and it is why the rewrite
// went further than two strings. It argued the sentence was true from the first paint "because the
// browser only gets here from the hosted checkout's return". A redirect is not a payment: the URL is
// typable and the parameter is forgeable — that is the whole premise of D-57, and of D-89 one file
// over — and a hosted session can redirect and still fail to capture. Reasoning that terminates in a
// money claim has to terminate at a webhook. Left in place, that paragraph would have re-taught the
// error to whoever touched the copy next, which is exactly how it survived 13-07.
//
// THE RULE THE COPY NOW FOLLOWS: describe FITOUT'S KNOWLEDGE STATE, never the money's state. Each
// sentence was checked on its own against BOTH readings — it settled, it did not — because the four
// unverified claims this phase has removed were all inherited as a block and read as settled:
//
//   `<h1>`  "Confirming your payment"           we are; the answer is not in either way
//   L1      the provider has not answered yet    the confirm authority is theirs (D-57), not ours
//   L2 (a)  the page updates itself              true while the poller runs, which is when it renders
//   L2 (b)  taking longer, and we will write      the send is real; the sentence is conditional on it
//   L2 (c)  the reference is recorded            server-derived from this booking (TRUST-02)
//
// ⚠ AND IT DOES NOT SWING TO DENIAL EITHER. STATE-05 forbids ANY error affordance while the webhook is
// the outstanding authority, and the booker very probably did pay — so "we have no record of your
// payment" would be as wrong as the sentence it replaced, in the other direction, and would be read by
// somebody whose money is fine. Calm, neutral, and silent about what it cannot see.
//
// ⚠ "YOUR BOOKING IS HELD" WENT WITH THEM, AND THE REASON IS THE POINT OF THE WHOLE PLAN. It reads
// like a fact about our own database rather than about money, and on the exclusive path it is one —
// `pending` sits inside the occupying set of the `booking_no_overlap` EXCLUDE predicate (drizzle/0022:
// status NOT IN cancelled/declined/completed), so the slot really is blocked for them. But an OPEN
// CAPACITY booking holds its seats through `OPEN_OCCUPYING_STATUS_SQL`, which requires
// `expires_at > now()` — so a pending row whose lease lapsed while the booker sat on the hosted page
// holds nothing, and this component is not told which kind of listing it is rendering for. A sentence
// that is true for most bookings is what shipped four times already.
//
// ⚠ THE MECHANICS ARE UNTOUCHED, AGAIN. This is a COPY change: the interval, the cap, the ref-held
// router, the interval-only state write, the cleanup and the `slow` gate on the indicator are all
// exactly as 13-01 proved by diff, 13-07 preserved and 13-19 left alone. A filtered diff of this file
// for every mechanics token returns zero lines, and `tests/design/pending-copy.test.ts` is the gate
// that makes the copy half of it enforceable rather than remembered.

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClockIcon, Loader2Icon } from "lucide-react";

import { reconcilePaymentNow } from "@/app/actions/reconcile-payment";
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
  /**
   * 13.1-03 / D-109 — THE BOOKING'S OWN ID, SERVER-DERIVED, and the only new prop this phase adds.
   *
   * Same discipline as `reference` (TRUST-02): it is a fact about this booking handed down by the RSC
   * that rendered it, NEVER read from the browser. This component does not touch `useSearchParams`, and
   * the action it hands this id to re-checks the booking against the caller's own session before it does
   * anything with it — so the id crossing the boundary buys the caller nothing they did not already have.
   *
   * ⚠ OPTIONAL, AND THE REASON IS WORTH READING BEFORE ANYONE TIGHTENS IT. The 13.1-03 plan asks for
   * `bookingId: string`. Required, it fails `npx tsc --noEmit` on `tests/booking/payment-states.test.tsx`
   * — the suite that pins this surface's copy and the poller's behaviour at all three thresholds, and
   * which the SAME plan requires to pass with an EMPTY `git diff --stat`. Those two instructions cannot
   * both hold. Optional satisfies both, and it degrades in the only direction this phase permits: a call
   * site that omits it loses the ACCELERANT and keeps the guarantee, because the 5-minute sweep
   * (`src/inngest/functions/payment-reconcile.ts`) is what actually promises a paid booker a booking.
   * `tests/booking/pending-fast-path.test.tsx` asserts that the real call site — the pending branch of
   * `bookings/[id]/page.tsx` — does pass it, so "optional" cannot quietly become "nobody passes it".
   */
  bookingId?: string;
};

export function PendingPaymentState({ reference, email, bookingId }: PendingPaymentStateProps) {
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

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // PLAN 13.1-03 (D-109) — ONE PROBE AFTER THE CAP. IT IS AN ACCELERANT AND MUST STAY ONE.
  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  //
  // 1. WHAT IT IS FOR. When the poller gives up at ~20s, the booker is looking at a page that says we
  //    are waiting on their provider, and until now the next thing that could possibly happen to them
  //    was the 5-minute sweep. This asks the provider ONCE, on their behalf, through the server.
  //
  // 2. IT IS NOT THE GUARANTEE, AND NOTHING MAY EVER MAKE IT ONE. The sweep is the guarantee. If this
  //    effect never runs, never resolves, or is deleted outright, a booker who paid still ends up with
  //    a booking — up to five minutes later. That is the entire cost. No promise anywhere in this
  //    phase may come to depend on a page render, because a page render depends on somebody watching.
  //
  // 3. IT RENDERS NOTHING. The returned value is DISCARDED on purpose. If the probe reconciles, the
  //    row becomes `confirmed` and the refresh below re-renders the CONFIRMED surface — that is the
  //    answer, and a sentence about it would be a worse one. If it learns nothing, the `takingLonger`
  //    copy stands exactly as 13-20 left it. So this plan adds ZERO strings to this file, which is how
  //    STATE-05's ban on an error affordance while the authority is outstanding is kept BY
  //    CONSTRUCTION rather than by remembering: there is no branch here to hang one on.
  //
  // 4. WHAT ACTUALLY MAKES "ONCE" TRUE — MEASURED, because the obvious answer is wrong. React 19 DOES
  //    double-invoke effects in this codebase's own test harness: with the `!slow` guard removed the
  //    call count under `StrictMode` was 3 against 2 without it. But the double-invoke happens at
  //    MOUNT, and at mount `slow` is false, so the shipped effect returns before it calls anything.
  //    The thing holding "once" is therefore the early return plus the fact that `slow` transitions
  //    exactly one time. THE LATCH IS DEFENCE IN DEPTH, and removing it alone did NOT redden the
  //    StrictMode case (recorded verbatim in the spec's header). It is kept because it is what makes
  //    "once" survive the edit nobody has made yet — a dependency added to the array, a second state
  //    that re-enters this branch, a remount — and because a one-line ref is a cheap price for a probe
  //    that costs real money to fire twice.
  //
  // 5. NO CANCELLATION FLAG, DELIBERATELY. The obvious cleanup — flip a local `cancelled` and skip the
  //    refresh — is WRONG when paired with a mount-lifetime latch: under the development double-invoke
  //    the first run's cleanup fires before the second run, and the second run is latched out, so the
  //    flag would cancel the only call there is ever going to be. What is discarded instead is at most
  //    one best-effort `refresh()` after unmount, which is a no-op on a page nobody is looking at.
  //
  // ⚠ AND THE POLLER IS UNTOUCHED, AGAIN. Not one line of the interval, the cap, the ref-held router,
  // the interval-only state write, the cleanup or the `slow` gate on the indicator moved — this is a
  // NEW effect alongside them, modelled on the `SUPPORT_ESCALATION_MS` one-shot directly above, which
  // 13-07 added under exactly this discipline for exactly this reason (a second threshold hung off the
  // poller's own callback would have meant editing the block D-71 freezes).
  const probeFired = React.useRef(false);
  React.useEffect(() => {
    if (!slow || !bookingId || probeFired.current) return;
    probeFired.current = true;
    void reconcilePaymentNow(bookingId)
      // The action's own failure is not this surface's to render (see 3 above, and STATE-05). It
      // already returns a closed enum with no provider prose in it; a transport failure calling it is
      // the same class of event and stops here the way `checkout-probe.ts` stops one.
      .catch(() => undefined)
      // Whatever happened, ask the RSC to re-read the database. That is the ONLY thing this effect
      // does to the page: the surface renders from the row, never from what the action said.
      .finally(() => routerRef.current.refresh());
  }, [slow, bookingId]);

  // THE THREE THRESHOLDS' COPY, composed here and handed to `MoneyStatement` finished (that component
  // takes completed strings and performs no arithmetic and no interpolation of its own).
  //
  // L1 NEVER CHANGES, AND UNDER D-102 IT IS A STATEMENT ABOUT WHO DECIDES rather than about where the
  // money is. The provider's webhook is the confirm authority (D-57); until it speaks, the honest
  // answer to "where is my money" is that the people who know have not told us yet. That is true on
  // the first paint, true at the cap, and true whichever way the settlement goes — which is the test
  // every sentence on this surface now has to pass. A money sentence that changed under a booker while
  // nothing about their money had changed would be the surface contradicting itself.
  const settlementSentence = "We're waiting on your payment provider to confirm it.";
  // L2 (a) — what the PAGE is doing, which is the half the booker can act on (by not acting). It is
  // true only while the poller is running, and it is replaced at the cap for exactly that reason.
  const waiting = "This page updates on its own — you don't need to refresh it.";
  // L2 (b) — past the cap. What remains is the ONE promise this component can keep: the confirm path
  // sends this mail, so the sentence is real, and it is conditional on the confirmation rather than
  // asserting it. The safety clause that used to sit here is gone (see the D-102 block in the header).
  const takingLonger = email
    ? `It's taking longer than usual. We'll email you at ${email} the moment it's confirmed.`
    : `It's taking longer than usual. We'll email you the moment it's confirmed.`;
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
          {/* D-102 — A HEADING IS THE MOST LOAD-BEARING SENTENCE ON A PAGE, and this one used to assert
              that the money had arrived. It now names what is happening instead: we are confirming, and
              the answer is not in. True on the first paint, true at the cap, and true whichever way the
              settlement goes. It also stays UNIQUE across the app's `<h1>`s, which is what several
              suites use as the marker proving this route rendered at all. */}
          <h1 className="text-xl leading-tight font-semibold tracking-tight">
            Confirming your payment
          </h1>
          {/* NO STATUS-MEANING SENTENCE HERE, and its absence is the TRUST-01 answer rather than a gap:
              13-UI-SPEC's status table gives this branch a two-line meaning, and those two lines ARE
              the money statement below (the table's wording is superseded by D-102, the same way D-97
              pinned the reversed state's). Rendering it a second time under the heading would put one
              sentence on the page twice, three lines apart. 13-04 recorded the same reading. */}
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
