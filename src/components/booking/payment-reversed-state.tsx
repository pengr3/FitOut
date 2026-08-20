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

import type { ReactNode } from "react";
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
 * Which of D-83's two money truths applies. Decided by the caller from the D-84 probe, never here.
 *
 * ⚠ A null or failed probe resolves to `"manual"` and never to `"auto"`, and the direction is the whole
 * point: guessing `auto` would tell a booker their money was sent back when nobody sent it back. See
 * the caller for where that choice is made and why it matches `isApiRefundable`'s own fail-closed rule.
 */
export type PaymentReversedBranch = "auto" | "manual";

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
   * TRUST-04's four-signal block (D-67), rendered by the RSC and handed down as a finished element.
   *
   * A SLOT rather than an import so this file stays free of the four sentences and of any decision
   * about them: it is the SAME element the five inline branches of `bookings/[id]/page.tsx` render,
   * built once, so nine renders cannot drift into nine trust blocks. D-67 puts it on the states that
   * look WRONG too — trust matters most when something has — which is why it is required, not optional.
   */
  trustBlock: ReactNode;
};

export function PaymentReversedState({
  listingId,
  reference,
  amountLabel,
  branch,
  rail = null,
  trustBlock,
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
  //
  // MANUAL-RETURN-COPY:END
  // ─────────────────────────────────────────────────────────────────────────────────────────────────

  const isAuto = branch === "auto";

  return (
    <div className={BOOKING_SHELL} data-testid="payment-state-reversed">
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Undo2Icon className="size-8 text-muted-foreground" aria-hidden="true" />
          {/* THE HEADING BLOCK. The `<h1>` is the shipped string, preserved byte-for-byte — it was
              never the defect — followed by the one line that says what the status MEANS rather than
              only what it is (TRUST-01). Nothing renders between this block and the money panel. */}
          <div className="space-y-1">
            <h1 className="text-xl leading-tight font-semibold">
              We couldn&apos;t complete this booking
            </h1>
            <p className="mx-auto max-w-prose text-body text-muted-foreground">
              This time was taken before your payment landed.
            </p>
          </div>
        </div>

        {/* STATE-06 — the money statement is the FIRST element after the heading block, and it is the
            one element on this page that must be inside the initial viewport at 320x568. Left-aligned
            rather than centred: it is up to three lines of prose plus a full-width control, and centred
            prose at that length is measurably harder to read back to somebody on the phone. */}
        <MoneyStatement
          sentence={isAuto ? autoSentence : manualSentence}
          detail={
            <div className="space-y-3">
              <p>{isAuto ? autoDetail : manualDetail}</p>
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

        {/* TRUST-04 (D-67), the same block every other status renders — see the prop's own note. It
            ends with the guarded support ROW; the in-panel control above is the money panel's, and the
            two are not a duplicate: 13-UI-SPEC's guard-state table gives this state both, because here
            the support path is the only route to the money and must be unmissable (D-83). */}
        {trustBlock}

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
