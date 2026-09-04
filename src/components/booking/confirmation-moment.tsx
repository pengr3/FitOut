// ConfirmationMoment (BFLOW-08 · D-61, D-62-as-corrected-by-D-90, D-63, D-98, D-100) — the full-page first
// screen a booker lands on when their payment confirms, inside the SAME route as the ordinary detail.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE BOX IS THE REQUIREMENT. `CONFIRMATION_MOMENT_MIN_H` IS WHAT MAKES "DISTINCT" A MEASUREMENT.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// BFLOW-08 asks for a *"distinct confirmation moment"*. Distinct is an adjective, and an adjective is
// not falsifiable — so the constant does the work instead: `min-h-[calc(100svh-{header})]` fills the
// viewport below the app chrome, which means the ordinary `booking-detail` section BELOW this one
// necessarily begins past the fold. That is measurable, and `e2e/confirmation-decay.spec.ts` measures
// it at 320×568, 375×667 and 1280×800 in both themes. The unit is `svh` and the derivation from
// `HEADER_HEIGHT` lives on the constant itself — read it there before changing anything about this
// container; the `vh`/`dvh` alternatives each break the promise in their own direction.
//
// ⚠️ THIS COMPONENT DOES NOT CARRY `BOOKING_SHELL`, AND MUST NOT BE MADE TO. 13-UI-SPEC § Geometry
// puts the moment *inside* the shell's measure, so it is a SIBLING of `booking-detail` within the one
// `<div className={BOOKING_SHELL}>` the page already opens. Restating the container here would nest a
// second `max-w-2xl px-4 py-8` inside the first: the padding is paid twice and the measure is halved
// — the same double-box trap `card-pattern-coverage.test.ts` records for a panel nested in a card,
// and the reason 13-01 promoted the container into one constant with one owner.
//
// IT IS A `<section>`, AND IT NEVER OPENS A LANDMARK OF ITS OWN (D-88.1). `(app)/layout.tsx:96`
// already wraps every child in this route's ONE `main` landmark. This is the fourth place that rule
// has had to be restated on this segment, and it is restated rather than delegated because the next
// author reads THIS file.
//
// ⚠️ GREP TRIPWIRE — the element name is written without its angle bracket above, and that is not a
// typo. This plan's acceptance criterion is a raw scan of THIS FILE for the opening tag, expected to
// return ZERO; spelling it in the very sentence forbidding it makes a correct file read 1. Fourteenth
// instance of this collision in Phase 13 (13-PATTERNS § H). Do not "helpfully" fix the punctuation.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠️ D-62 IS CORRECTED BY D-90, AND THE CORRECTION IS A MONEY FACT RATHER THAN A TONE CHOICE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-62 originally specified that the request-mode lede reassure the booker their money comes back if
// the host declines. **That describes a charge that never happens.** Request-to-book on FitOut is
// PAY-ON-APPROVAL, verified in `bookings/[id]/page.tsx`: the `approved` branch renders a *Pay now* CTA
// into the Phase-5 checkout, and BOTH the `requested` and `approved` branches carry a no-money cancel
// dialog whose own comment reads *"an approved-but-unpaid hold is still an unpaid hold"*.
//
// So a request-mode booking only reaches THIS surface after the host approved AND the booker paid — at
// which point the booking is confirmed and nothing is at risk. The honest request lede therefore leads
// with the approval fact in the heading and the money answer that is REAL in the body. There is no
// "charged while awaiting approval" state to reassure anybody about, and shipping copy that says
// otherwise would be false in a booker's favour, which is the worst direction for a money statement.
//
// The mode distinction does not disappear; it MOVED. It lives on the detail page's `requested` and
// `approved` status-meaning sentences (TRUST-01), shipped in plan 13-10, where the honest and more
// reassuring fact is that the booker has not been charged at all yet.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// ONE BOOKING-MODE COLUMN ARRIVES HERE, AND IT IS THE BOOKING'S OWN SNAPSHOT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   `bookingMode` — `booking.booking_mode`, the BOOKING's creation-time snapshot (D-61). It is a fact
//                   about how THIS booking came to exist, so it is what selects the `<h1>`: "your host
//                   approved this" is only true of a booking that actually went through an approval.
//
// ⚠ THE SECOND COLUMN IS GONE WITH THE PANEL (D-98). `listingBookingMode` — the SPACE's mode TODAY —
// arrived here for exactly one consumer: the condensed trust block's fourth signal. That panel is
// deleted, so the prop has no reader, and a prop with no reader on a surface whose whole job is that
// no fact is lost is a fact nobody is stating. The distinction the two columns existed to express
// still holds and still lives on the detail page's `requested`/`approved` status meanings.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NO CTA. NOT A SMALL ONE, NOT A GHOST ONE, NOT "JUST" A LINK.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// 13-UI-SPEC § Primary CTAs gives this surface the value **none**: *a terminal success screen that
// immediately asks for another action is selling, not confirming.* Every action — the receipt, the
// group, the cancel entry, find another space — lives in the detail below, which is one scroll away
// and permanently there. Since D-100 there is no interactive element in here AT ALL: the reference and
// its copy control moved into the detail's reference panel, so this surface is purely a statement.
//
// Asserted as a CLOSED SET rather than as a ban list (`tests/booking/confirmation-moment.test.tsx`
// cases 14 and 15) — 13-09's finding, that a word list cannot catch the item nobody thought of. The
// set is EMPTY, which is the strongest form the assertion has ever had.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NO MONEY STATEMENT (D-94), AND THE ABSENCE IS THE DECISION
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// 13-UI-SPEC § Copywriting Contract specifies a `MoneyStatement` sentence for FOUR statuses — pending,
// not completed, reversed and cancelled — and for no others. This surface is none of them: it renders
// only on `confirmed`. D-99's `PaidStatement` is NOT a fifth member of that set and must not be
// promoted into one — it is a different sentence with a different job (a payment that is COMPLETE, not
// one that is unfinished, undone or returned), and it arrives here as the SAME ELEMENT the detail
// below renders. The same reasoning is written at the confirmed branch of `bookings/[id]/page.tsx`.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// MOTION — ONE BEAT, ONE ITERATION, AND REDUCED MOTION THROUGH THE ONE GLOBAL MECHANISM
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The success mark gets ONE non-looping fade+scale at `duration-(--motion-slow)` (320ms, the slowest
// named step and therefore inside the budget by construction) with `ease-standard`. Banned outright by
// 13-UI-SPEC § Motion, and none of them is here: confetti, sound, auto-scroll, a number that counts up,
// a mark that draws itself over more than one beat, any animation with an infinite iteration count.
//
// ⚠️ THERE IS NO PER-COMPONENT `@media` MOTION QUERY IN THIS FILE, AND ADDING ONE WOULD BE THE DEFECT.
// DS-04 requires ONE global reset (`globals.css`, `@layer base`), whose `!important` universal rule is
// specifically written to reach `tw-animate-css` keyframes — which is exactly what `animate-in` is. A
// second mechanism beside it is how the two drift: the day somebody retunes the global reset, the
// local copy keeps the old behaviour on the one surface nobody re-tests. `e2e/confirmation-decay.spec.ts`
// drives the browser's reduced-motion preference to `reduce` and asserts the OUTCOME — every animated
// element in here reporting a suppressed duration — rather than trusting either mechanism's source.
//
// ⚠️ GREP TRIPWIRE — the media feature is named descriptively in the paragraph above, never spelled.
// This plan's acceptance criterion is a case-insensitive scan of THIS FILE for it, expected to return
// ZERO, precisely so a local second mechanism cannot appear here; a comment forbidding it would trip
// the check that enforces it. Fifteenth instance of this collision in Phase 13 (13-PATTERNS § H).
//
// ⚠️ THE MARK IS AN ICON, NOT A FILLED BADGE. DS-10 retired the filled green badge at 3.24:1; green
// retreats to the icon, where `--success` on `--background` is a 3.0 non-text bar (declared 4.00/3.86).
// It is `aria-hidden`: the `<h1>` under it is what says the booking is confirmed, and an icon that
// announced "success" beside a heading that says "You're booked" is the same fact twice.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// A SERVER COMPONENT TAKING FINISHED VALUES ONLY (GATE-05 / D-130)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// No client directive, no state, no effect, no date math, no arithmetic, and NO MONEY VALUE OF ANY
// KIND: since D-100 this component holds no money prop at all — the figure lives inside the
// `paidStatement` element the RSC composes and hands down. The discipline is
// `cancellation-policy-disclosure.tsx`'s, applied whole: every prop is REQUIRED rather than optional,
// because an optional prop is how a call site silently loses a fact.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOTHING IMPORTANT LIVES ONLY IN HERE — THAT IS WHAT MAKES THE DECAY SAFE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-60 consumes the query parameter, so this screen is seen ONCE. Every fact it states is repeated
// inside `booking-detail` below, and that is an acceptance criterion rather than a hope:
// `tests/booking/detail-completeness.test.tsx` renders the confirmed detail with NO query parameter
// and asserts all of them. The moment adds PROMINENCE, never INFORMATION. Do not add a fact here that
// exists nowhere else — if one is needed, it belongs on the detail first.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// D-100 — AND THE INVERSE RULE, WHICH IS THE ONE THIS SURFACE KEPT BREAKING
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// "Everything here is repeated below" was read as licence to put everything below in here too. The PM
// found the result in live UAT: the celebratory header and the Space / Where / When / Host / Total
// facts card *"says the same thing twice"*. It did — this component carried the venue, the venue-local
// window, the named timezone, the full address, the reference, the amount AND the cancellation policy,
// and every one of them renders again in the detail directly beneath. A confirmation that restates the
// page below it is not a moment; it is a preview of a page the booker is about to scroll to anyway.
//
// **THE HEADER CARRIES THE MOMENT AND THE OUTCOME; THE FACTS CARD CARRIES THE DETAIL.** Four things
// survive, and the arithmetic is worth stating because the next author will want to add a fifth:
//
//   1. the success mark          — the moment
//   2. the `<h1>`                — the outcome, and on `request` the fact that a host said yes
//   3. the paid statement        — the outcome in money (D-99), the same element the detail renders
//   4. D-63's email line         — THE ONE FACT THAT EXISTS NOWHERE ELSE ON THE PAGE
//
// ⚠ ITEM 4 IS WHY THE COMPACTION IS SAFE, AND IT IS THE THING TO CHECK BEFORE REMOVING ANYTHING ELSE.
// D-60's decay argument is that nothing important lives ONLY here; the email destination does, so it
// stays. If a future compaction would drop a fact that lives only in here, that fact moves to the
// facts card FIRST — it does not simply go.
//
// REMOVED, AND WHERE EACH ONE LIVES NOW: the arrival line (facts panel, `Space` + `When` + the
// timezone note), the address lines (facts panel, `Where`), the reference and its label (the reference
// panel, with the copy control that surface needs), the amount block labelled `Paid` (the paid
// statement above it, and the facts panel's `Total` row), and the cancellation policy — which was the
// starkest case of all, because the moment was handed the IDENTICAL `CancellationPolicyDisclosure`
// element the detail renders, so one screen carried two of the same disclosure.

import type { ReactNode } from "react";
import { CheckCircle2Icon } from "lucide-react";

import { CONFIRMATION_MOMENT_MIN_H } from "@/lib/design/measurements";

/**
 * The two `<h1>` variants, as TS constants rather than JSX text — `trust-block.tsx:96`'s three
 * reasons, and the first of them bites hard here: `react/no-unescaped-entities` makes a literal
 * apostrophe in JSX an error, so written inline these would have to be `You&apos;re booked`, and the
 * source would stop being the same bytes as the rendered sentence the copy contract pins.
 *
 * DELIBERATELY NOT EXPORTED, for `trust-block.tsx`'s reason: these are a COPY CONTRACT, so
 * `tests/booking/confirmation-moment.test.tsx` retypes them from 13-UI-SPEC instead. A test importing
 * them would compare the component to itself and pass through any rewording.
 */
const H1_INSTANT = "You're booked";
/** The separator is an em dash, exactly as the Copywriting Contract carries it. */
const H1_REQUEST = "Your host approved this — you're booked";

/** D-63's line, composed here so the address is interpolated verbatim and never reshaped. */
const emailLine = (address: string) => `Confirmation sent to ${address}`;

export type ConfirmationMomentProps = {
  /**
   * `booking.booking_mode` — the BOOKING's creation-time snapshot (D-61). It selects the `<h1>`, and
   * that is now its only job: *"your host approved this"* is true only of a booking that actually went
   * through an approval, and it is a fact about how THIS booking came to exist.
   */
  bookingMode: "instant" | "request";
  /**
   * D-99's `PaidStatement`, handed down as a SLOT — the IDENTICAL element the ordinary detail below
   * renders, never a second one composed here.
   *
   * A SLOT AND NOT A MONEY PROP, for two reasons that both matter. The first is 13-10's slot idiom:
   * passing the element itself makes *"the moment and the detail state the same paid sentence"* true
   * by construction rather than by two call sites agreeing, which is exactly what it bought for the
   * policy disclosure before D-100 removed that one. The second is GATE-05 / D-130: with the amount
   * inside the slot this component holds NO money value of any kind, not even a formatted one.
   *
   * REQUIRED, never optional or nullable. The moment renders only on a booking that has been paid, so
   * a render without this statement is a confirmation screen that does not say the thing D-99 exists
   * to say — and an optional prop is how a call site silently loses a fact.
   */
  paidStatement: ReactNode;
  /**
   * The booker's OWN session address, FULL and unmasked (D-63), or `null`.
   *
   * `null` removes the whole line rather than rendering a fallback: the line is a promise about where
   * a confirmation went, and a promise with no destination reads as a fact being withheld.
   *
   * ⚠ THIS IS THE ONE FACT THAT LIVES ONLY IN HERE, and it is what makes D-100's compaction safe under
   * D-60's decay argument. Do not remove it without moving it into the facts card first.
   */
  email: string | null;
};

export function ConfirmationMoment({
  bookingMode,
  paidStatement,
  email,
}: ConfirmationMomentProps) {
  const isRequest = bookingMode === "request";

  return (
    <section
      data-testid="confirmation-moment"
      className={`${CONFIRMATION_MOMENT_MIN_H} flex flex-col items-center justify-center gap-6 text-center`}
    >
      <div className="flex flex-col items-center gap-3">
        {/* 1 — THE SUCCESS MARK. One beat, one iteration, and the ONLY use of the success token in
            the product (13-UI-SPEC § Color): an icon, never a filled badge. */}
        <CheckCircle2Icon
          aria-hidden="true"
          className="size-10 animate-in fade-in zoom-in-95 text-success duration-(--motion-slow) ease-standard"
        />

        {/* 2 — THE `<h1>`. The mobile step is the shipped idiom from every other branch on this
            route, so the moment's heading and the ordinary detail's are the same size at the same
            widths; `sm:text-display` is the named Display role and is inventoried by
            `tests/design/type-scale.test.ts`. */}
        <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-display">
          {isRequest ? H1_REQUEST : H1_INSTANT}
        </h1>

        {/* 3 — THE OUTCOME IN MONEY (D-99), AND IT IS THE SAME ELEMENT THE DETAIL RENDERS. It reads
            *"Paid in full — the amount. FitOut holds your payment until after your session."* and it
            is the whole lede now, on BOTH modes: by the time a booking reaches this screen the two
            situations are the same situation, because a request booking only gets here after the host
            approved AND the booker paid (D-90).

            THE ARRIVAL LINE AND THE ADDRESS USED TO SIT HERE AND ARE GONE (D-100). They were the
            header's restatement of the facts card's `Space`, `When` and `Where` rows, which render in
            a panel a few hundred pixels below with the named timezone note beside them. */}
        {paidStatement}
      </div>

      {/* 4 — D-63's LINE, WITH THE FULL ADDRESS. Never masked, and the reasoning is recorded here so
          nobody "hardens" it later: the page is behind auth and it is the booker's own booking, so
          exposure is nil — and catching a typo is the ONLY reason the line exists, which a mask
          defeats by hiding exactly the characters a typo lives in. */}
      {/* ⚠ `w-full break-words` IS A GATE-RESP FIX, NOT A STYLE PREFERENCE (plan 13-15), AND BOTH
          HALVES WERE MEASURED — the first attempt shipped `break-words` alone and the sweep stayed RED.
          An email address is ONE unbreakable token, and at the 320px floor this shell's content box is
          288px: a 40-odd character address is wider than that. `e2e/overflow-320.spec.ts`'s Phase-13
          sweep reported this exact `<p>` at `right=322` (`scrollWidth 322` against `clientWidth 320`)
          on its first run, and at `right=323` on the run AFTER `break-words` was added.
          WHY THE OBVIOUS CLASS WAS NOT ENOUGH, since the next person will reach for it too:
          `overflow-wrap: break-word` breaks a token inside its line box but does NOT reduce the
          element's intrinsic MIN-CONTENT width (that is `overflow-wrap: anywhere`, a different value).
          This `<p>` is a cross-axis `items-center` item in a column flex container, so its width is
          `fit-content` — i.e. at least min-content — and min-content was still the whole address. The
          paragraph was therefore 290px wide inside a 288px box no matter how willing it was to break.
          `w-full` pins the width to the container first; `break-words` then has somewhere to break.
          The sibling interpolation in `pending-payment-state.tsx` sits in a normal block context, so it
          needs the second half only. */}
      {email !== null && (
        <p className="w-full text-label break-words text-muted-foreground">{emailLine(email)}</p>
      )}

      {/* THE CONDENSED TRUST PANEL USED TO SIT HERE AND IS GONE (D-98). It carried two of the four
          signals — the platform guarantee and the listing's booking rule — and the PM judged the whole
          panel filler in live UAT. The guarantee itself was the one sentence worth keeping and it is
          not lost: it is inside the paid statement above, on the branch where it is true.

          AND TRUST-03's DISCLOSURE USED TO CLOSE THIS SCREEN (D-100). That was the starkest case of
          all: the moment was handed the IDENTICAL `CancellationPolicyDisclosure` element the detail
          renders, so one screen carried two of the same disclosure — same summary, same concrete
          dates, same refund figure, twice. It renders in the detail below on exactly the renders where
          cancelling is still possible, which is where it was always the more useful of the two. */}
    </section>
  );
}
