// LVER-02 (host half) / OPS-05 (read half) / D-230 — THE WORDS A HOST READS ABOUT ITS OWN LISTING.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE DIVISION OF LABOUR — THE GATE AND THE SIGNAL, on `src/lib/listing/hours-signal.ts`'s idiom
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
//   - THE GATE STOPS THE SALE. Plan 18-03 made the review state the FIFTH term of `deriveBookable`
//     and of its SQL twin in search Stage-1, and plan 18-04 made `isPubliclyViewable` refuse an
//     unreviewed listing on all three booker-facing surfaces. None of that says one word to the host.
//   - THE SIGNAL — this module — TELLS THE HOST WHAT HAPPENED.
//
// Neither is sufficient alone. A gate with no signal is a listing that mysteriously stops earning, and
// a rejection the host cannot read is not a decision, it is a disappearance. That is the same sentence
// `hours-signal.ts` opens with, and it is the same shape of defect one phase later.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// D-245 — THIS IS IN ADDITION TO THE NOTIFICATION, NEVER INSTEAD OF IT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Plan 18-09 sends the host a notification and an email from ONE payload, so the two channels cannot
// drift. A status a host has to go and look for is not being TOLD — and what is being communicated
// blocks their income. The copy below therefore says the same thing the payload says, on the surfaces
// the host already visits. `src/lib/notifications.ts` is the other owner of these sentences; the two
// were written from the same spec table (18-UI-SPEC § Telling the host) and must move together.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE RULE THIS MODULE IS WRITTEN AGAINST, AND THE TWO STATES THAT CANNOT SATISFY IT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `src/lib/host/requests-signal.ts:56` states it: A SIGNAL NAMES THE STATE, THE REASON AND THE WAY OUT.
// Two of the states here HAVE no way out, and inventing one would be worse than admitting it:
//
//   - `pending` — there is nothing the host can do. A control here would be a control that acts on
//     nothing, and a host who presses it and sees no change learns that FitOut's affordances lie.
//   - a SUSPENDED HOST — contesting an ops decision is backlog 999.6 and OUT of this phase (D-243).
//
// So `wayOut: null` is a DECISION recorded in the data, not a field somebody forgot to fill in. The
// tests assert its absence with the same force they assert the presence of the one way out that exists.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TWO REVIEW STATES ARE DELIBERATELY SILENT, AND ONE OF THEM IS THE INTERESTING ONE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `grandfathered` shows the host NOTHING (D-211 / D-212). It is FIRST-CLASS IN THE DATA — the gate, the
// queue and the trust badge all read it, and none of them treats it as an approval — but the host
// experienced no change at all, and telling them "you were grandfathered" invites a question nobody at
// FitOut can answer. It is a data state, not a message. `approved` is silent for the ordinary reason:
// the listing is live and the card already says so.
//
// The silence is DECLARED rather than defaulted (`SILENT_REVIEW_STATES` below), so it is a decision the
// compiler enumerates rather than a gap the reader has to notice.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TONE — NEUTRAL, AND THIS IS DS-10's BINDING RULE RATHER THAN A PREFERENCE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A listing awaiting a decision, and one that did not get it, are both NORMAL LIFECYCLE STATES of a
// working marketplace. The alarm role is reserved for a genuine failure needing a human, and a host who
// is shown it three times for normal states stops believing the fourth — the argument
// `tests/design/host-tone-census.test.ts` is built on. Both chips are the neutral secondary badge with
// no icon and no colour, and both reason lines render as calm muted information: the same treatment the
// shipped hours-lock notice gets. This file therefore contains no tone class, no variant name and no
// role token at all — the two call sites choose the presentation, and neither may reach for the alarm.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NO SUPPORT ADDRESS, AND EVERY SENTENCE IS COMPLETE WITHOUT ONE (D-250)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `src/lib/site.ts` exports `SUPPORT_EMAIL` as null, and `tests/design/site-contacts.test.ts` asserts
// that ZERO support affordances render anywhere under `src/` while it is. The sentences below were
// written to stand on their own; do NOT add a trailing "get in touch at…" clause that renders half the
// time, do not fabricate an address, and do not weaken that gate. If a real monitored inbox ever
// exists, the affordance goes through `src/components/booking/support-path.tsx`'s guard shape, with the
// literals authored INSIDE the `SUPPORT_EMAIL !== null` conditional.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// PURE COPY. NO RUNTIME IMPORT, AND THAT IS LOAD-BEARING
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `src/components/listing/listing-card.tsx` is a `"use client"` module and imports the chip labels from
// here, so anything this file imports at RUNTIME joins the browser bundle. The one import below is
// `import type`, fully erased at compile time. The owner-scoped READ that decides whether a host is
// suspended therefore lives in `src/lib/host/suspension.ts` — a server module — rather than beside its
// words here, which is the one place this file departs from `hours-signal.ts`'s shape and it says so
// there too. (`hours-signal.ts` holds both because its only consumers are Server Components.)

import type { ListingReviewState } from "@/lib/db/schema";

/**
 * One review state's signal: the STATE (as the chip a host reads on the card), the REASON, and the WAY
 * OUT — or the recorded absence of one.
 *
 * `wayOut` is a LABEL, never an href. The one route that exists is the wizard, and
 * `(host)/host/listings/page.tsx` already builds that path for its per-card Edit control — so putting a
 * second spelling of it here would be two places for the route to be wrong. The page passes the href it
 * already has; this module owns the words.
 */
export type ReviewSignal = {
  readonly chip: string;
  readonly reason: string;
  readonly wayOut: string | null;
};

/**
 * The two review states that say something to the host. 18-UI-SPEC § Every state that is NOT the badge.
 *
 * A PARTIAL map on purpose: a state absent from it is a state that renders nothing, and the three that
 * are absent are enumerated by name in `SILENT_REVIEW_STATES` immediately below rather than left to a
 * reader to infer from a gap.
 */
export const REVIEW_SIGNAL = {
  /**
   * Awaiting a decision. The reason names BOTH halves — that a person is looking, and that the listing
   * cannot sell meanwhile — because the second half is the part the host is actually experiencing and
   * the first is the only thing that makes it bearable.
   *
   * ⚠ NO WAY OUT, BY DECISION (see the header). There is nothing the host can do to make a review
   * happen sooner, and no deadline is quoted here: the queue is oldest-first with no service promise
   * behind it, so a figure in this sentence would be a promise the system has not agreed to keep.
   */
  pending: {
    chip: "In review",
    reason: "Someone at FitOut is checking this listing. It can't take bookings until that's done.",
    wayOut: null,
  },

  /**
   * Checked and not approved. The operator's own stored sentence follows this one, verbatim — see
   * `composeReviewSentence`.
   *
   * ⚠ THE WAY OUT IS TRUE ONLY BECAUSE OF D-249, WHICH LANDED IN PLAN 18-06, AND THAT DEPENDENCY IS
   * RECORDED HERE SO A LATER CHANGE CANNOT SILENTLY ORPHAN THIS COPY. D-232 originally flipped
   * `approved | grandfathered` back to `pending` on a material edit and said NOTHING about a rejected
   * listing — under which reading a rejected listing is dead forever and this label points nowhere.
   * D-249 extended the flip to `approved | grandfathered | rejected` (`src/lib/listing/re-review.ts`,
   * `RE_REVIEW_SOURCE_STATES`), which is the ONLY reading under which "Edit this listing" is an honest
   * offer. If that tuple ever loses its third member, DELETE THIS LABEL in the same commit.
   *
   * This is resubmission after fixing what was wrong — the ordinary marketplace loop — and it is not
   * the out-of-scope thing (contesting a decision without changing anything), which stays out.
   */
  rejected: {
    chip: "Not approved",
    reason: "FitOut checked this listing and didn't approve it. It won't take bookings.",
    wayOut: "Edit this listing",
  },
} as const satisfies Partial<Record<ListingReviewState, ReviewSignal>>;

/**
 * THE STATES THAT SAY NOTHING — declared, with the reason, so the silence is a decision.
 *
 * ⚠ THIS IS A COMPILER CENSUS AND IT IS THE POINT OF THE `satisfies` CLAUSE. The type is a TOTAL
 * `Record` over every review state that is not in `REVIEW_SIGNAL`, so a SIXTH member of the
 * `listing_review_state` enum fails `tsc` here until somebody decides, in writing, whether the host is
 * told about it. The alternative — a lookup that returns nothing for anything it does not recognise —
 * would make a new decision state silent by accident, which is the exact failure this whole plan exists
 * to close one instance of.
 *
 * The values are read by `tests/listing/review-signal.test.ts`, which walks the enum, so the reasons
 * below are checked for existence rather than merely written down.
 */
export const SILENT_REVIEW_STATES = {
  approved: "The listing is live and the card already says so; there is no outcome left to report.",
  grandfathered:
    "D-211/D-212. First-class in the DATA and never treated as an approval, but the host " +
    "experienced no change, and telling them they were grandfathered invites a question nobody at " +
    "FitOut can answer. It is a data state, not a message.",
  withdrawn:
    "The listing was taken out of review by the host's own side, so FitOut has decided nothing and " +
    "has nothing to report back. The card's existing status is the whole truth here.",
} as const satisfies Record<Exclude<ListingReviewState, keyof typeof REVIEW_SIGNAL>, string>;

/**
 * The signal for one review state, or `null` where the state is deliberately silent.
 *
 * POSITIVE LITERALS ONLY, the `isPubliclyViewable` discipline (plan 18-04) applied to the copy layer: a
 * negative spelling would start speaking for every state added after it. It also fails SILENT on a null
 * or undefined state — a caller that forgot to select the column shows the host nothing, which is
 * exactly today's behaviour and never a fabricated verdict.
 */
export function reviewSignalFor(state: ListingReviewState | null | undefined): ReviewSignal | null {
  if (state === "pending") return REVIEW_SIGNAL.pending;
  if (state === "rejected") return REVIEW_SIGNAL.rejected;
  return null;
}

/**
 * A SUSPENDED HOST'S OWN SIGNAL — D-243, extended to `/host/earnings` by D-252.
 *
 * WHY THE REASON NAMES THE PAYOUT HOLD AND NOT ONLY THE BOOKING HOLD. Plan 18-07's freeze is
 * PRE-CLAIM: a suspended host's due payouts are excluded before the `host_payout_ledger` row is ever
 * written, so `/host/earnings` renders no line at all for a delivered session. Without this second
 * clause the host discovers the freeze as an unexplained missing payment — the worst possible way to
 * learn it, and the finding 18-07 raised on its way out. `src/lib/notifications.ts`'s
 * `hostSuspendedPayload` carries the identical clause for the same reason.
 *
 * ⚠ AND IT ENDS THERE. No route back, no promise of a reply, no timeline, no address (D-243 / D-250).
 * What resolves a suspension is a FitOut ops review, which this product cannot offer as a control and
 * will not offer as a promise — so the honest surface names the state and the reason and stops. That is
 * a decision taken in 18-CONTEXT and not an omission; `wayOut` is null on purpose.
 */
export const SUSPENDED_HOST_SIGNAL = {
  state: "Hosting paused",
  reason: "FitOut has paused your hosting. Your spaces can't be booked, and payouts are on hold.",
  wayOut: null,
} as const;

/**
 * The product's sentence and the OPERATOR'S OWN SENTENCE, joined — in JavaScript, once, here.
 *
 * THREE PROPERTIES, EACH LOAD-BEARING:
 *
 *   1. THE OPERATOR'S SENTENCE IS VERBATIM AND APPEARS EXACTLY ONCE. Never paraphrased, never
 *      summarised into the chip, never split. Plan 18-09 mutation-proved the notification half of this
 *      by paraphrasing the stored reason and watching its gate go red; the same rule governs here.
 *   2. IT IS COMPOSED IN JS RATHER THAN INTERLEAVED AS JSX TEXT. SWC's whitespace transform drops the
 *      leading space of text following an expression container — the defect that once shipped
 *      "₱300.00in cancellation fees" (`cancellation-fee-notice.tsx`). Doing it here also means two
 *      surfaces cannot render the two clauses in different orders.
 *   3. THE RESULT IS TEXT, AND ONLY TEXT. The stored reason is operator free text crossing into a
 *      surface the host controls nothing about (T-18-1301). It is returned as a string for React to
 *      render as a text node; no caller may interpolate it into markup.
 *
 * An absent or whitespace-only reason yields the product sentence alone — an approval carries no reason
 * at all, and a rejection written before the column existed may carry none either.
 */
function appendOperatorSentence(sentence: string, operatorReason: string | null | undefined): string {
  const trimmed = operatorReason?.trim() ?? "";
  return trimmed.length > 0 ? `${sentence} ${trimmed}` : sentence;
}

/** The review reason line as the host reads it, with the operator's sentence appended when there is one. */
export function composeReviewSentence(
  signal: ReviewSignal,
  operatorReason: string | null | undefined,
): string {
  return appendOperatorSentence(signal.reason, operatorReason);
}

/** The suspension reason line as the host reads it, on all three of their own surfaces. */
export function composeSuspendedSentence(operatorReason: string | null | undefined): string {
  return appendOperatorSentence(SUSPENDED_HOST_SIGNAL.reason, operatorReason);
}
