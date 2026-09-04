// PaymentReversedState (D-58 · D-69 · D-72 · D-82 · D-83 · D-84 · D-87) — the landing for a booker whose
// payment FitOut took and could not turn into a booking.
//
// WHEN IT RENDERS. `checkout_session.payment.paid` arrived for a slot that was genuinely gone (the hold
// was swept and the window retaken during payment), so the webhook's `handleGoneSlot` backstop returned
// the money — or flagged it for a person to return — and set the booking terminal. The booker's payment
// is real; the booking is not. See `(app)/bookings/[id]/page.tsx`'s cancelled branch for how this state
// is now REACHED (DB status + the D-84 probe, never a query parameter — D-87).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// TWO OPPOSITE MONEY TRUTHS. ONE LAYOUT. NEVER ONE SENTENCE. (D-83)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The branch is decided upstream by `isApiRefundable(probe.sourceType)` and arrives as a prop, because
// the RSC is what holds the probe result and the frozen money figure. This component picks copy; it
// decides nothing about money.
//
//   • `auto`   — the API call went through on a rail PayMongo can reverse (card / GCash / Maya). Money
//                really is on its way back, so the copy says so and names the VERIFIED window for that
//                rail. Every number in that sentence comes from `@/lib/booking/refund-window`; not one
//                is typed here (D-83's three permitted facts, and a whole-source grep for a hand-typed
//                duration over this file is one of the plan's acceptance criteria).
//   • `manual` — QR Ph, UBP, an unrecognised rail, a rail the probe never learned, or a call that
//                failed. NOTHING HAS BEEN SENT BACK. The amount is on the FitOut platform wallet and a
//                person has to move it, so the copy states the charge, states that it is coming back,
//                and carries the reference the operator alert was recorded against.
//
// ⚠️ GREP TRIPWIRE (the `price-breakdown.tsx:28-33` idiom), and it has TWO halves —
// `tests/design/reversed-copy.test.ts` is the committed enforcement:
//
//   1. THE NOT-COMPLETED SENTENCE MAY NOT APPEAR IN THIS FILE AT ALL, comments included. It is
//      STATE-05's language for a DIFFERENT state — the one where checkout never completed and no money
//      moved — and 13-UI-SPEC assigns it to `payment-incomplete-state.tsx` and nowhere else. It shipped
//      here for two phases, and it is the inverse of the truth in two directions at once: money DID
//      leave the booker's account, and on the manual rails it has not come back yet. The booker checks
//      our screen against their bank app, and when the two disagree our screen is the one that is wrong.
//   2. INSIDE THE MARKED MANUAL-RETURN REGION BELOW, two things are banned: the word that claims the
//      money has already been sent back (it has not — that is the entire difference between the two
//      branches), and the phrase pairing *cannot* with *be reversed*, which states an impossibility that
//      is FALSE. D-82: the money is not stuck. The accurate phrasing is *"not reversed automatically"*.
//
// NEITHER banned phrase is spelled contiguously anywhere in this file, comments included. If you are
// tempted to write one out "just in a comment", don't: it disarms the check for good.
//
// ⚠️ AND THE COPY PROMISES NO EMAIL, ON EITHER BRANCH. Verified in `api/paymongo/webhook/route.ts`:
// `handleGoneSlot` sends NO notification — it writes an operator audit row and returns. Only the
// CONFIRM path emits to the booker (BOOK-06). "We'll email you" is true on the pending state and false
// here, and a promise this path cannot keep is the worst sentence available on this surface.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// LAYOUT — HOW THE ONE CORAL AND THE UNMISSABLE SUPPORT PATH COEXIST (D-72 + D-83)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-72 keeps `Back to availability` as the single coral primary: most reversals are a lost race for a
// slot and the booker's real goal is still to book a space. D-83 requires that on the manual branch the
// support path be unmissable rather than decorative, because it is the only route to their money. The
// one-accent-per-viewport rule forbids solving that with a second accent fill.
//
// THEY WIN ON DIFFERENT AXES, AND READING ORDER BEATS COLOUR. The support control is a full-width
// `outline`/`touch` button INSIDE the money panel — the first control on the page, adjacent to the
// sentence that explains why it exists — and the coral sits BELOW a `Separator` in the recovery block,
// where it is still the loudest single element. One accent fill in the viewport.
//
// While `SUPPORT_EMAIL` is null (D-64) `SupportPath` renders nothing at all and the sentence stands
// alone. That leaves no hole, because the sentence never depended on the address: it names the operator
// alert the webhook really writes and the reference it was recorded against. The only thing missing is
// the channel.
//
// NO CONTAINER OF ITS OWN, AND NO LIVE REGION.
//   • The outer `<Card>` this file shipped with is GONE. `MoneyStatement` composes `PanelCard`, and a
//     panel nested inside a container that already supplies `bg-card ring-1 rounded-xl` pays the block
//     padding twice (the trap measured at 112px against 80px). The page is a stack of panels on the page
//     ground; this is the shape 13-UI-SPEC § The Booking Detail Page specifies for every branch.
//   • The container renders as a `div`: `(app)/layout.tsx:96` already wraps `{children}` in this route's
//     ONE `main` landmark, and a second nested inside it is a landmark this file has no reason to add
//     (D-88.1, plan 13-01).
//   • The `role="status"` + politeness attribute this container shipped with are REMOVED (13-UI-SPEC
//     § Live Regions). A live region announces a CHANGE; a freshly navigated page is not a change, it is
//     a page, and a screen reader already reads it from the top. There is no focus move either — the
//     `<h1>` is already the first thing. The attribute is named descriptively here rather than quoted
//     because the plan's own acceptance criterion is a raw grep for it returning ZERO on this file
//     (`booking-row.tsx:112`'s precedent; plan 13-02 hit the same trap on the same attribute).
//   • ZERO ALARM-COLOUR TOKENS, at any threshold — the CSS variable DS-10 reserves for a genuine
//     failure needing a human renders NOWHERE in this phase, and this file is the surface most likely
//     to attract it. A reversed payment is not an error the booker caused, and the human that colour
//     would be calling for here is the operator, not them.
//
//     THE TOKEN IS NAMED DESCRIPTIVELY ABOVE RATHER THAN QUOTED, and that is a measured choice rather
//     than a stylistic one: this plan's acceptance criterion for this file IS a case-insensitive grep
//     for that token returning ZERO, so the only way to write "this file does not carry it" while
//     keeping the criterion checkable in the form it was written is not to write it. That is
//     `booking-row.tsx:112`'s precedent, and this is the FOURTH time Phase 13 has hit the collision
//     (13-01 on the landmark, 13-02 on the politeness attribute, 13-03 on the raising keyword). The
//     first draft of this very bullet quoted it and made the criterion read 1 against a correct file.
//
// Analog: `hold-expired-state.tsx` (the calm recovery-state idiom this file's shape comes from).

import Link from "next/link";
import { Undo2Icon } from "lucide-react";

import { BOOKING_SHELL } from "@/lib/design/measurements";
import { ALL_RAILS_REFUND_WINDOW, refundWindowFor } from "@/lib/booking/refund-window";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BookingReference } from "@/components/booking/booking-reference";
import { MoneyStatement } from "@/components/booking/money-statement";
import { SupportPath } from "@/components/booking/support-path";

/**
 * Which money truth applies. Decided by the caller from the D-84 probe, never here.
 *
 * ⚠ THE THIRD ARM IS 13-CONTEXT D-96, AND IT REPLACES WHAT USED TO BE A KNOWN RESIDUAL.
 *
 * Plan 13-04 recorded it in the branch itself rather than hiding it: when the probe learns nothing —
 * no key, a network fault, a non-2xx, the 3s deadline — the row signature the caller falls back on
 * (`cancelled` + no `cancelled_by` + no `payment_id` + a real session id) is SHARED with an abandoned
 * hold that a later booker's stale-hold sweep flipped to `cancelled` (`availability/units.ts:487` for
 * the exclusive path, `:922` for open capacity). That booker was never charged one centavo, and the
 * `manual` copy would have told them *"You were charged {₱X}"*.
 *
 * 13-04's threat register reasoned about the wrong axis. It chose which REFUND branch to show —
 * automatic or by hand — and both of those presuppose a charge; the question the fallback cannot
 * answer is whether a charge happened AT ALL. Those are different questions, and the fail-closed
 * direction for the second one is not `manual`.
 *
 * So a probe that learned nothing lands on `indeterminate`, whose copy is true under BOTH readings: the
 * booking is cancelled, and IF anything was charged it is being returned. It names no amount, because
 * naming one is the assertion we cannot make. `auto` and `manual` are reached only when the provider
 * actually told us the session was paid, at which point a charge is a fact rather than an inference.
 *
 * The branch name is `readPaymentState`'s own word for this answer, deliberately: one vocabulary for
 * "the provider did not tell us", shared between the reader and the copy that renders its consequence.
 */
export type PaymentReversedBranch = "auto" | "manual" | "indeterminate";

export type PaymentReversedStateProps = {
  /** Where `Back to availability` goes — the listing whose slot was lost. */
  listingId: string;
  /**
   * The finished `FIT-XXXXXXXX` string, server-derived. Rendered verbatim, never re-derived (TRUST-02:
   * every status carries it, and on the manual branch it is the token a person needs to move the money).
   */
  reference: string;
  /**
   * THE AMOUNT, ALREADY FORMATTED. `formatMoney(booking.quotedTotalCents, currency)`, composed in the
   * RSC (D-130 / GATE-05) — there is deliberately no `number` prop on this component for arithmetic to
   * be performed on.
   *
   * ⚠ IT IS `quotedTotalCents` AND NOT `refundCents`, and that is not an approximation. `refund_cents`
   * is NULL on every row that reaches this state: it is written by the booker-cancellation path, and
   * nobody cancelled this booking. The return is FULL by design (`handleGoneSlot` refunds the whole
   * server-frozen amount), so the figure charged and the figure coming back are the same figure.
   */
  amountLabel: string;
  /** Which money truth applies. See `PaymentReversedBranch`. */
  branch: PaymentReversedBranch;
  /**
   * PayMongo's `source.type` token for the rail the session was paid on (`"card"`, `"gcash"`,
   * `"paymaya"`, …), or null when the D-84 probe never learned it.
   *
   * A TOKEN, NOT A DISPLAY NAME, because it is what selects the sentence: `refundWindowFor` keys on
   * this exact string, and the brand name a booker recognises is already interpolated inside the
   * sentence it returns. A display string could not select anything.
   */
  rail?: string | null;
  /**
   * ⚠ THE `trustBlock` SLOT IS GONE (13-19 / D-98). It carried TRUST-04's four-row panel, handed down
   * from the RSC because this file is a client component. The panel is deleted from every booking
   * surface: two of its four rows read the same month for every host and every listing at launch, and
   * its payment row promised that FitOut holds a payment for a session that is not happening. The ban
   * on INVENTING trust signals is untouched — `tests/design/trust-signals.test.ts` still scans this
   * file among the rest of the phase's three roots.
   */
};

export function PaymentReversedState({
  listingId,
  reference,
  amountLabel,
  branch,
  rail = null,
}: PaymentReversedStateProps) {
  // The AUTOMATIC branch. L1 describes an action FitOut actually took; L2 is the verified window for the
  // rail, and when the probe fell back it is the rail-free sentence that names every rail a FitOut booker
  // could have used, so they recognise their own without the app claiming to know which it was.
  //
  // The `no-automatic-window` marker cannot arrive here by construction — the caller only chooses `auto`
  // for a rail `isApiRefundable` accepts — but it is handled rather than asserted, and it falls to the
  // ALL-RAILS sentence rather than to the other branch's copy: on this branch a return WAS issued, so
  // routing it to the by-hand sentence would be false in the opposite direction.
  const window = refundWindowFor(rail);
  const autoSentence = `We've refunded ${amountLabel} in full.`;
  const autoDetail = window.kind === "window" ? window.sentence : ALL_RAILS_REFUND_WINDOW;

  // ─────────────────────────────────────────────────────────────────────────────────────────────────
  // MANUAL-RETURN-COPY:BEGIN
  //
  // D-83's second money truth, verbatim from 13-UI-SPEC § Copywriting Contract. Everything between the
  // two sentinels is scanned by `tests/design/reversed-copy.test.ts`, which is the enforcement rather
  // than the documentation: this region may not claim the money has already been sent back (it has not
  // — a person still has to move it off the platform wallet), and it may not claim it is impossible to
  // send back (D-82 — it is not; that is why the operator alert exists). The sentinels are load-bearing.
  // If this branch is ever restructured, MOVE them in the same commit: a scan with nothing to read is a
  // dead gate, not a clean one.
  //
  // No window sentence here, and that absence is structural rather than an omission — the module that
  // owns the three verified windows returns a bare marker with NO sentence field for a rail like this
  // one, so there is nothing for a template to interpolate.
  const manualSentence = `You were charged ${amountLabel}, and it's coming back to you.`;
  const manualDetail =
    `This payment can't be sent back automatically, so we've flagged it to be returned by hand. ` +
    `Your reference is ${reference} — we've recorded it against this booking.`;

  // 13-CONTEXT D-96's copy. It sits INSIDE the marked region on purpose: it makes the same by-hand
  // promise the two lines above make, so it must obey the same two prohibitions, and a scan that
  // stopped one line short of it would be a scan with a hole exactly where the newest copy is.
  //
  // WHAT IT MAY NOT DO, and the reason is the whole arm: it may not name an amount, because the only
  // reading of the row we have is compatible with nobody having been charged. Every sentence here is
  // conditional on a charge rather than an assertion of one, and both are still true if there was one.
  // Do not "tighten" this into a direct statement — see the branch union's note for what it costs.
  const indeterminateSentence = "If you were charged for this booking, that money is coming back to you.";
  const indeterminateDetail =
    `We couldn't reach our payment provider to confirm whether this booking was paid. If any money did ` +
    `leave your account, we've flagged it to be sent back by hand — nothing stays with FitOut. ` +
    `Your reference is ${reference} — we've recorded it against this booking.`;
  //
  // MANUAL-RETURN-COPY:END
  // ─────────────────────────────────────────────────────────────────────────────────────────────────

  const isAuto = branch === "auto";
  const isIndeterminate = branch === "indeterminate";
  const sentence = isAuto ? autoSentence : isIndeterminate ? indeterminateSentence : manualSentence;
  const detail = isAuto ? autoDetail : isIndeterminate ? indeterminateDetail : manualDetail;

  return (
    <div className={BOOKING_SHELL} data-testid="payment-state-reversed">
      {/* ⚠ THE TWO RESPONSIVE STEPS BELOW ARE A STATE-06 FIX, MEASURED, NOT A RHYTHM PREFERENCE
          (plan 13-15). AC#22 requires this state's money panel to be FULLY inside a 320x568 viewport,
          and `e2e/overflow-320.spec.ts`'s Phase-13 sweep measured its bottom edge at **570.94px** in
          GROVE — 2.94px below the fold — while court passed. The difference is the theme: grove carries
          a larger type scale and a 20px radius against court's 10px (D-02), so the same markup is
          taller. A criterion that holds in one theme and not the other is not held.
          `space-y-5 sm:space-y-6` and `gap-3 sm:gap-4` each recover 4px BELOW `sm:`, and only below it:
          every viewport from 640px up renders byte-identically to what shipped. 570.94 − 8 = 562.94,
          which is 5px of headroom rather than the 1px a single step would have left — and 1px of
          headroom on a geometric assertion is a flake waiting for a font metric to move. */}
      <div className="space-y-5 sm:space-y-6">
        <div className="flex flex-col items-center gap-3 text-center sm:gap-4">
          <Undo2Icon className="size-8 text-muted-foreground" aria-hidden="true" />
          {/* THE HEADING BLOCK. The `<h1>` is the shipped string, preserved byte-for-byte — it was
              never the defect — followed by the one line that says what the status MEANS rather than
              only what it is (TRUST-01). Nothing renders between this block and the money panel. */}
          <div className="space-y-1">
            <h1 className="text-xl leading-tight font-semibold">
              We couldn&apos;t complete this booking
            </h1>
            {/* TRUST-01's meaning sentence. D-97 pins the two-branch wording: the `auto`/`manual`
                arms keep 13-UI-SPEC § The Reversed State's sketch, which adds the fact the booker
                does not have, rather than the status table's near-restatement of the `<h1>` above it.
                ⚠ THE THIRD ARM MAY NOT USE IT. *"This time was taken before your payment landed"*
                asserts a cause — somebody else got the slot, and a payment of yours was in flight —
                and on an unanswered probe neither half is known. Under the abandoned-hold reading
                nothing was taken from anybody and no payment was ever made. What is true on both
                readings is that the booking ended and the time went back, so that is what it says. */}
            <p className="mx-auto max-w-prose text-body text-muted-foreground">
              {isIndeterminate
                ? "This booking was cancelled, so the time was released."
                : "This time was taken before your payment landed."}
            </p>
          </div>
        </div>

        {/* STATE-06 — the money statement is the FIRST element after the heading block, and it is the
            one element on this page that must be inside the initial viewport at 320x568. Left-aligned
            rather than centred: it is up to three lines of prose plus a full-width control, and centred
            prose at that length is measurably harder to read back to somebody on the phone. */}
        <MoneyStatement
          sentence={sentence}
          detail={
            <div className="space-y-3">
              <p>{detail}</p>
              {/* Guarded (D-64). Renders nothing at all today; when the address is set it is the first
                  control on the page, full-width, immediately under the sentence that explains it. */}
              <SupportPath
                variant="panel"
                reference={reference}
                label="Email us about this payment"
              />
            </div>
          }
        />

        {/* TRUST-02 — the reference on EVERY status. It is deliberately rendered as well as named in
            the manual sentence above: the sentence tells a person which string to quote, and this is
            the element that lets them take it without transcribing it. */}
        <div className="flex justify-center">
          <BookingReference reference={reference} />
        </div>

        {/* THE TRUST PANEL IS GONE (D-98), AND ITS LOSS COSTS THIS STATE NOTHING IT NEEDED. The panel
            ended with the guarded support ROW; the in-panel support control above is this surface's
            own and is the one 13-UI-SPEC's guard-state table gives it, because here the support path
            is the only route to the money and must be unmissable (D-83). The `<Separator/>` below
            STAYS: it is D-72's rule above the recovery block, not the panel's. */}

        <Separator />

        {/* THE RECOVERY BLOCK (D-72). Below the separator, and the single coral on this page. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant="brand">
            <Link href={`/listings/${listingId}`}>Back to availability</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Search other spaces</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
