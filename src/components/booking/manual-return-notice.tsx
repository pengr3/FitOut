// ManualReturnNotice (STATE-08 · D-57 · D-72 · D-82 · D-83) — the cancelled branch's SECOND money
// truth, as durable page content.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IT REPLACED, AND WHY THAT WAS THE DEFECT AND NOT A STYLE CHOICE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A booker cancels; the money is owed; the dispatch does not happen (the rail refused it, the call
// raised, the destination could not be verified, or the amount is above the InstaPay ceiling). Until
// this file existed the ONLY place they were told was `toast.warning(res.notice)` on the cancel form —
// which then navigated AWAY from itself — and the page it navigated to said "{₱X} refund on its way",
// which on this path is not true.
//
// STATE-08's rule decides it in one line: a toast is for NON-TERMINAL SUCCESS, and anything a booker
// must actually READ — a money amount, a reduced headcount, a dead invite link — is in-page content.
// A statement that somebody's money did not come back is as must-read as anything in this product, and
// it is the sentence they are most likely to want to re-read tomorrow. It belongs on the destination,
// addressable, and surviving a refresh.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// ONE SENTENCE FOR FOUR CAUSES — A DECIDED TRADE, RECORDED RATHER THAN DRIFTED INTO
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The three server-composed notices this replaces distinguished their causes (a ceiling, a failed
// transfer, an unverifiable institution list). This surface states ONE sentence for all four, because
// the four causes have ONE consequence for the booker: nothing was sent automatically, and a person
// will move it. Splitting them here would be four un-reviewed sentences on a surface 13-UI-SPEC
// specifies exactly two for (D-94: an invented money sentence is an un-reviewed claim about somebody's
// money). The CAUSE is not lost — it is on the audit row, which is where an operator reads it.
//
// It also reaches STRICTLY MORE bookers than the toast did: `refund_dispatch_failed` (an API-refundable
// rail whose call raised) and a cancellation with no destination supplied at all both wrote an operator
// alert and told the booker NOTHING. Both now land here.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE COPY RULES, ALL FOUR OF THEM, AND THE GATE THAT HOLDS EACH ONE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   1. NEVER THE R-WORD (D-83). Not the past participle, not the noun, not the stem — the marked
//      region below is scanned for it by `tests/design/reversed-copy.test.ts`, the SAME gate and the
//      SAME encoded rows that hold `payment-reversed-state.tsx`'s manual branch. Nothing has been sent
//      back; claiming it is the same class of false money statement as the sentence D-69 removed from
//      the reversed state, pointing the other way.
//   2. NEVER AN IMPOSSIBILITY (D-82). The money is NOT stuck — it is on the FitOut platform wallet and
//      a human can transfer it. The phrase pairing *cannot* with *be reversed* is banned in the same
//      region, in both spellings.
//   3. NEVER A COMPLETED ACTION (PROJECT D-57). Even on the automatic path the POST records INTENT
//      only, which is why the ordinary cancelled sentence says *on its way*. Here not even the intent
//      was accepted, so the sentence promises the OUTCOME (*coming back to you*) and states as done
//      only the thing that IS done: the alert was written.
//   4. NO REFUND WINDOW, AT ALL (D-83). Exactly three windows exist in this product — card *up to 30
//      days*, GCash and Maya *within 24 hours* — and every one of them describes an AUTOMATIC return
//      on a rail that accepted one. Nobody knows when a hand-moved transfer lands, so this branch
//      states none. That absence is structural rather than an omission: the module that owns the three
//      windows returns a bare marker with NO sentence field for a rail like this, so there is nothing
//      here for a template to interpolate even by accident. This file imports it not at all.
//
// ⚠ NEITHER BANNED PHRASE IS SPELLED CONTIGUOUSLY ANYWHERE IN THIS FILE, comments included — see rule
//   1 and 2's gate. If you are tempted to write one out "just in a comment to explain it", don't: a
//   grep that matches its own prohibition is a dead guard, and this phase has paid for that lesson
//   more than twenty times.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// COMPOSITION — EVERY PIECE IS SOMETHING THAT ALREADY SHIPPED
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • `MoneyStatement` — STATE-06/D-73's single owner of every "where is your money" sentence on
//     `/bookings/**`. Never a raw `<Card>`, never an `Alert`, never a fourth boxed shape (DS-11 says
//     three). This mounts on the CANCELLED status, which is one of the four D-94 specifies a money
//     sentence for, so it is a second sentence for a specified status rather than a fifth status.
//   • `BookingReference` — NOT re-rolled. The cancelled branch already renders it in its own panel
//     (`referencePanel`), so this file NAMES the string inside the sentence instead: the sentence tells
//     a person which token to quote, and the panel is what lets them take it without transcribing.
//   • `SupportPath` — NOT re-rolled, and NOT guarded here. `SUPPORT_EMAIL` is null (D-64), so it
//     renders nothing at all today and the sentence stands alone without a hole in it: the sentence
//     never depended on the address, only the channel does. A caller that did its own guarding would
//     be the parent holding an unguarded literal, which is the one way to turn
//     `tests/design/site-contacts.test.ts` red. The label is a prop, sentence-case, and deliberately
//     not the capitalised single word that file's `SUPPORT_LABEL` scan bans.
//
// ZERO ALARM COLOUR, at any threshold, and it is worth saying why on this file specifically: a
// dispatch that did not happen is not the booker's fault and not their emergency. The token DS-10
// reserves for a genuine failure needing a human renders nowhere in this phase, and the human this one
// needs is the operator. The token is named descriptively rather than quoted — `booking-row.tsx:112`'s
// precedent, and `tests/design/phase13-surface-gates.test.ts` scans this tree for exactly it.
//
// A SERVER COMPONENT: no client-boundary directive, no state, no effect, no event handler. It performs
// NO money arithmetic — `amountLabel` arrives as a finished string the RSC formatted (D-130/GATE-05),
// exactly as `payment-reversed-state.tsx` takes it.

import { MoneyStatement } from "@/components/booking/money-statement";
import { SupportPath } from "@/components/booking/support-path";

export type ManualReturnNoticeProps = {
  /**
   * The finished money string — e.g. `"₱1,000.00"` — formatted by the RSC that read the row. There is
   * deliberately no `cents` prop: this component never adds, rounds, compares or formats a figure.
   */
  amountLabel: string;
  /** The `FIT-XXXXXXXX` reference, server-computed. Named in the sentence AND carried to `SupportPath`. */
  reference: string;
};

export function ManualReturnNotice({ amountLabel, reference }: ManualReturnNoticeProps) {
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // MANUAL-RETURN-COPY:BEGIN
  //
  // Everything between the two sentinels is scanned by `tests/design/reversed-copy.test.ts`. The
  // sentinels are LOAD-BEARING: a scan with nothing to read is a dead gate, not a clean one, so if
  // this branch is ever restructured, move them in the same commit. See rules 1-4 in the header.
  const sentence = `${amountLabel} is coming back to you.`;
  const detail =
    `We couldn't send it back automatically, so we've flagged it to be returned by hand. ` +
    `Your reference is ${reference} — we've recorded it against this booking.`;
  //
  // MANUAL-RETURN-COPY:END
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  //
  // THE SENTINELS CLOSE ABOVE THE RETURN, and that placement is deliberate: the region then holds the
  // COPY and nothing else. A region that also spanned the JSX would put class names and attribute
  // values through a prose scan, which is how a ban starts reporting `space-y-3` as a sentence.

  return (
    <MoneyStatement
      sentence={sentence}
      detail={
        <div className="space-y-3">
          <p>{detail}</p>
          {/* Guarded inside `SupportPath` itself (D-64) — renders nothing at all today. When the
              address is set it becomes the full-width control immediately under the sentence that
              explains why it is there, which is the placement 13-UI-SPEC gives the money panel on
              every state where the support path is the route to the money. */}
          <SupportPath
            variant="panel"
            reference={reference}
            label="Email us about this payment"
          />
        </div>
      }
    />
  );
}
