// HVER-05 / D-237 — the booker-facing chip that states WHAT FITOUT CHECKED, and nothing more.
//
// `drop-in-badge.tsx` is the exact analog — a booker-facing chip that names a fact — and both of that
// file's binding rules apply here unchanged:
//
//   REAL TEXT, NEVER AN ICON-ONLY MARKER. The label below is a sentence fragment a booker can read,
//   search for and repeat. A seal, a tick or a shield glyph would be a private code they have to learn,
//   and a code is exactly where an unearned meaning ("FitOut inspected this") gets read into it.
//
//   DELIBERATELY NOT ACCENT, NOT GREEN, NO ICON. `variant="secondary"`, the neutral token every other
//   descriptive chip on these surfaces already uses. A trust chip styled like a seal IS a quality
//   claim; a neutral chip that states what happened is not. The styling is part of the honesty of the
//   sentence, not decoration around it.
//
// ══ WHAT THE CHIP MAY SAY, AND THE FACT IT STANDS ON ══════════════════════════════════════════════
//
// A real row, written by a named authenticated staff member (D-218): the ops status on the host's
// account, AND `listing.review_state`, both `approved`. `isFitoutChecked` is that expression and this
// file never restates it. What FitOut knows is therefore exactly this much — a person here looked at
// the account and at the listing before it could take bookings.
//
// ⚠ THE COPY MAY NOT SAY, AND MAY NOT IMPLY:
//   · that an ID or a document was checked — NO DOCUMENT EXISTS. There is no upload surface and
//     HVER-02 forbids the column, so a document claim would be a sentence with no row behind it.
//   · that a third party checked anything — D-206 defers the vendor; the manual provider is what
//     ships, and the copy is written against what ships (D-237).
//   · that the space was inspected, visited, or is safe or insured — Success Criterion 6, verbatim.
//     The explainer's second sentence answers this by stating what did NOT happen, which is the
//     strongest form of compliance available on the one surface with room to read it.
//
// ⚠ COPY AUDIT AGAINST ALL TWELVE `FORBIDDEN_SIGNALS` ROWS (`tests/design/trust-signals.test.ts`), and
// this file is scanned by that gate through its `FIFTH_SIGNAL_FILES` set — the fifth signal is SUBJECT
// TO the ban, not exempt from it. No tier word, no assurance-verb form, no responsiveness measure, no
// score, no score glyph. THE NEAR MISS is the plural feedback noun: this surface says **checked**, and
// that token is kept out of this file entirely. A later edit reading "FitOut ___s every listing" trips
// the gate — which is the point of both strings living in this one scannable file.
//
// ⚠ WHY THE OBVIOUS ONE-WORD CHIP IS NOT USED: the obvious word is one of the twelve, and unbanning it
// would weaken the gate for every surface at once. "Checked by FitOut" states the same fact in words
// the gate has no quarrel with — and states WHO did it, which the one-word form does not.
//
// ══ TAKES A BOOLEAN, NEVER THE TWO STATUSES ═══════════════════════════════════════════════════════
//
// Reduced ONCE by `isFitoutChecked` in the RSC, then passed in. `listing-card.tsx:11` is the precedent
// for `bookable` — "derived upstream … and passed in — the card never re-derives it." Here it is more
// than a convention: it is what makes D-212 structural. A client component that never receives the
// distinction between `approved` and `grandfathered` cannot render the badge for the wrong one, so the
// majority of the day-one catalogue is unbadgeable by construction rather than by care.
//
// ══ RETURNS null, NEVER A PLACEHOLDER ═════════════════════════════════════════════════════════════
//
// There is no "unchecked" chip and there will not be one. A booker who sees nothing is being told
// nothing, which is correct; the alternative teaches bookers to read absence as a WARNING about the
// ungated grandfathered catalogue, and that is a claim FitOut cannot support about listings it simply
// has not got to yet.
//
// Not "use client": pure presentation.

import { Badge } from "@/components/ui/badge";

/**
 * The two strings, as TS constants rather than JSX text — `host-block.tsx`'s `HOST_REQUEST_RULE` idiom
 * and its three reasons: `react/no-unescaped-entities` makes a literal apostrophe in JSX an error (so
 * source and rendered sentence would stop being the same bytes), one copy per sentence, and SWC's JSX
 * whitespace transform cannot eat a leading space inside a literal.
 *
 * Exported so specs IMPORT the copy instead of retyping it — and so the whole of the fifth signal's
 * copy sits in one file the trust-signal gate can scan.
 */
export const FITOUT_CHECK_LABEL = "Checked by FitOut";

/**
 * Listing detail only — the surface where a booker has room to read a sentence.
 *
 * The second sentence is a DELIBERATE NEGATIVE, not a hedge. Success Criterion 6 says the badge must
 * never imply inspection; saying plainly what did not happen is the only wording that cannot be read
 * as implying it did.
 */
export const FITOUT_CHECK_EXPLAINER =
  "Someone at FitOut checked this host's account and this listing before it could take bookings. " +
  "We haven't visited the space.";

export function FitoutCheckBadge({
  checked,
  className,
}: {
  checked: boolean;
  className?: string;
}) {
  if (!checked) return null;
  return (
    <Badge variant="secondary" className={className}>
      {FITOUT_CHECK_LABEL}
    </Badge>
  );
}
