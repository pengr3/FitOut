// HVER-06 / HVER-08 / D-262 / D-264 / D-265 / D-273 — THE WORDS A HOST READS ABOUT THEIR OWN ACCOUNT
// CHECK, on all six states of `/host/verify`.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE COPY IS A MODULE AND NOT TYPED INTO THE PAGE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `src/components/host/hosting-paused-notice.tsx:7-11` states it for the surface one domain over: *a
// sentence typed into three page files is the shape `requests-signal.ts`'s header describes by name*.
// This phase has FOUR readers of these sentences before it ends — the panel, the page's own header,
// its `loading.tsx`, and the banned-language corpus that scans them — so a literal written at a call
// site would be a literal that only one of the four agrees with.
//
// The binding rule every string below answers to is `src/lib/host/requests-signal.ts:56`: A SIGNAL
// NAMES THE STATE, THE REASON AND THE WAY OUT. Where there genuinely is no way out it says so and
// stops, which is `hosting-paused-notice.tsx`'s recorded reading of the same rule, and `wayOut: null`
// is how that decision is written down rather than left as a gap.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE MAP IS TOTAL, AND THIS IS THE ONE PLACE IT DEPARTS FROM `review-signal.ts`
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `src/lib/listing/review-signal.ts` splits into a PARTIAL `REVIEW_SIGNAL` plus a declared
// `SILENT_REVIEW_STATES` set, because three of its five states render nothing ON A CARD — a card that
// says nothing is a card, and the silence is the correct product answer there.
//
// That argument does not transfer. `/host/verify` is a DESTINATION: a host typed it, followed a link
// from their dashboard, or came back from the checking partner's site. A destination that renders
// nothing is a broken page, and "nothing" is never the honest answer to someone who arrived on
// purpose. So every one of the six `host_verification_status` values has a panel here, the
// `satisfies Record<…>` clause makes `tsc` enumerate them, and a SEVENTH enum member fails to compile
// until somebody decides, in writing, what the host reads. There is deliberately NO lookup helper
// that returns null for an unrecognised value: that helper is exactly how a new state becomes a blank
// screen, which is the failure this shape exists to make impossible.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// FOUR THINGS NO STRING IN THIS FILE MAY DO — each one a recorded decision, not a style preference
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
//   1. D-263 — NAME NO ROUTE TO A PERSON. No way to contest a decision, no "ask someone to look at
//      this", no promise of a reply, no address. There is no host-facing route to a human anywhere in
//      this phase; the manual provider is ops-initiated only, and 18-13's refusal to promise a review
//      with no service commitment behind it stands. `src/lib/site.ts` exports its one address
//      constant as null and `tests/design/site-contacts.test.ts` holds every file under `src/` to it.
//      ⚠ THE BANNED PHRASES ARE DESCRIBED HERE AND NOT QUOTED, which is
//      `src/components/host/hosting-paused-notice.tsx:31-34`'s rule for this family of files: the
//      corpus and several acceptance greps scan for them, and a file that spells what it forbids goes
//      falsely red at the moment it is most obviously correct. 18.1-UI-SPEC § Copywriting Contract
//      § The four banned families is where they are enumerated.
//   2. D-256 / HVER-02 — CLAIM NOTHING ABOUT WHAT WAS INSPECTED. No string here says FitOut checked,
//      saw, held or stored an ID, or anything else a host shows the partner (again: enumerated in the
//      UI-SPEC's anti-pattern table, not quoted here). The check happens at the partner and what the
//      host shows them never touches FitOut — which is true by construction (no column can hold it)
//      and is said out loud, once, as an assurance in the `unverified` reason. `approved` therefore
//      claims only *your account*.
//   3. D-211 / D-212 — THE DATA-STATE WORD IS NOT A MESSAGE. The enum key below is spelled because it
//      is a key; no sentence spells it. Naming it to a host invites a question nobody at FitOut can
//      answer, and it appears in NO host-visible value in this file.
//   4. D-264 — A RETRY IS AN INSTANT, NEVER A DURATION. See the composer at the bottom of this file.
//
// ⚠ AND A FIFTH, WHICH IS ABOUT TRUTH RATHER THAN TONE (D-272). The checking partner's per-module
// caps — two attempts at the ID step, three at each of the other two — bound retries WITHIN ONE
// session, while the host's allowance is seven sessions per seven days, deliberately raised so the
// partner can never refuse before FitOut's own cooldown does. A host can therefore run out of one
// session's tries while most of their weekly allowance is untouched. NO SENTENCE HERE SAYS OR IMPLIES
// THAT A HOST HAS NO TRIES LEFT: it would be false at the moment they read it, and it would send
// somebody who could simply start again looking for the route decision 1 above says does not exist.
// `src/lib/verification/didit-verdict.ts` keeps the same rule from the other side — an
// attempts-exhausted code is off its allow-list, so the partner's own wording never arrives either.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TONE — NEUTRAL, AND DS-10 MAKES THAT BINDING RATHER THAN PREFERRED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A host waiting on a partner's answer and a host the partner did not pass are both NORMAL LIFECYCLE
// STATES of a working marketplace. The elevated tone role is reserved for a genuine failure needing a
// person, and a host shown it for ordinary states stops believing it when it matters — the argument
// `tests/design/host-tone-census.test.ts` is built on, which is why that gate declares this file at
// exactly zero. This module names no tone, no variant and no role token at all: the panel chooses the
// presentation and may not reach for the elevated one.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// CLIENT-SAFE, UNGUARDED, AND THE TWO RUNTIME IMPORTS ARE BOTH DELIBERATE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `src/lib/payments/fees.ts:1-30`'s rule: guard the module a client must never REACH, not the module a
// client legitimately IMPORTS. This one holds sentences — no credential, no connection, no query, no
// environment read — and `src/components/host/verification-panel.tsx` is a client component that must
// import every word it renders.
//
//   • `SUSPENDED_HOST_SIGNAL` — RE-STATED, NEVER RE-AUTHORED. The suspended row below points at the
//     shipped constant so the panel, `/host/earnings` and the notification keep saying the same thing.
//     `review-signal.ts` is pure copy with a single erased type import, so importing it costs the
//     browser bundle nothing.
//   • `HOST_REJECT_REASONS[0]` — the canned rejection sentence D-265 already owns, imported rather
//     than retyped. `src/lib/validation/ops.ts` is already in two client components' import graphs
//     (`ops-decision-actions.tsx`, `ops-reject-dialog.tsx`), so this is a shipped shape and not a new
//     precedent.

import { SUSPENDED_HOST_SIGNAL } from "@/lib/listing/review-signal";
import { HOST_REJECT_REASONS } from "@/lib/validation/ops";
import type { HostVerificationStatus } from "@/lib/db/schema";

/**
 * One verification state's signal: the STATE (the panel's title), the REASON, and the WAY OUT — or
 * the recorded absence of one.
 *
 * `wayOut` is a LABEL, never an href, for the reason `ReviewSignal` gives at its own copy of this
 * type: the routes that exist are already built by the surfaces that own them, and a second spelling
 * here would be a second place for a route to be wrong. The panel supplies the destination; this
 * module owns the words.
 */
export type VerificationSignal = {
  readonly state: string;
  readonly reason: string;
  readonly wayOut: string | null;
};

/** The page's own title, exported so the page and its `loading.tsx` cannot drift apart. */
export const VERIFICATION_PAGE_TITLE = "Account check";

/** The page lede — the whole feature in one sentence, before any state is known. */
export const VERIFICATION_LEDE =
  "FitOut checks who a host is before their first listing goes up.";

/**
 * The skeleton's announcement while the row is being read. A NAME for the busy region, which
 * `PanelSkeleton` renders as both an `aria-label` and its `sr-only` content — two mechanisms, both
 * required, and the same expression the page's own header carries.
 */
export const VERIFICATION_LOADING_LABEL = "Loading your account check";

/**
 * ALL SIX STATES, TOTAL OVER THE ENUM. Transcribed from 18.1-UI-SPEC § Surface 1 § The six states;
 * a change here changes what a host is told, so it is a copy decision and belongs in the spec first.
 */
export const VERIFICATION_SIGNAL = {
  /**
   * Nobody has checked this host yet — the ordinary state of a new host, and the state a row's
   * ABSENCE means (`verification-status.ts` returns `unverified` when there is no row at all).
   *
   * The reason carries the privacy fact in its second clause, and this is the one place in the
   * product where it is stated: what the host shows the partner never reaches FitOut. It is true by
   * construction rather than by policy (D-256 / HVER-02 — no column can hold it), which is what makes
   * it safe to say to somebody who is about to decide whether to trust this.
   */
  unverified: {
    state: "Get your account checked",
    reason:
      "FitOut checks who a host is before their first listing can go up. The check happens on our " +
      "checking partner's site — FitOut never sees or keeps what you show them.",
    wayOut: "Start the check",
  },

  /**
   * A session was started and no answer has landed yet.
   *
   * ⚠ THE WAY OUT IS A PRESS, NOT A STORED LINK, AND THAT DISTINCTION IS THE WHOLE DESIGN. FitOut
   * stores `vendorRef` — the session id — and NEVER the hosted-flow URL, because the URL carries a
   * bearer token for this host's flow and D-263's "store a reason, not evidence" posture governs it
   * (`src/lib/verification/port.ts` carries four fields and says do not add a fifth; that contract is
   * untouched). What makes the affordance possible without storing anything is the partner's own
   * idempotency: a second ask on the same host returns the SAME unfinished session with a fresh,
   * usable link, so the link is RE-FETCHED ON DEMAND rather than kept.
   *
   * The press is bounded by the submission action's existing burst guard, and it does NOT move the
   * host's place in the ops queue — `host-verification.ts` preserves `created_at` on this branch
   * precisely so that pressing a button cannot advance somebody who is already waiting.
   *
   * ⚠ AND THIS COPY IS HONEST ON TWO LEGS, BOTH OF WHICH MUST BE THERE. The first: plan 18.1-06 maps
   * an expired or abandoned session back to `unverified`, so a session that is genuinely over
   * releases the row. The second: the press above, which is what a host with an UNFINISHED session
   * uses. Neither covers the other's case — the partner never reuses a finished session, and no
   * mapping can release one that is still live — so if either is ever removed this panel becomes a
   * permanent dead end dressed as patience, and all three must move in the same commit.
   */
  pending: {
    state: "Your check is in progress",
    reason:
      "Your check is with our checking partner and FitOut is waiting on the result. You can't " +
      "create a listing until it lands. If you haven't finished it yet, you can open it again.",
    // ⚠ CHOSEN TO BE TRUE IN TWO PLACES. On this panel it labels a control that hands the host into
    // the partner's flow; on the `/host` advisory row it labels a LINK to the page that carries that
    // control (`host-signals.tsx` reads this same value). It sits in the shipped grammar beside
    // "Start the check" and "Ask for another check", and it is a third spelling of neither.
    //
    // ⚠ IT PROMISES NO STEP POSITION, and the reason clause above says "open it again" rather than
    // anything about picking up where they left off: the partner's idempotency guarantees the same
    // SESSION comes back and says nothing about where inside the hosted flow the host lands. An
    // unmeasured promise about somebody else's UI is not FitOut's to make.
    wayOut: "Finish the check",
  },

  /**
   * Checked and cleared — by the partner's answer under D-261, or by an operator's decision. ONE
   * sentence covers both, and that is deliberate: the host's standing is the same either way, and a
   * sentence that named which writer decided would be false half the time.
   *
   * ⚠ CLAIMS ONLY *your account*. Never "your ID", never the things a host shows the partner, never
   * "your identity was verified by our partner". HVER-05's discipline reaches here: FitOut may state
   * that a check happened and who may act on it, never what was looked at.
   */
  approved: {
    state: "Your account is checked",
    reason: "FitOut has checked your account. You can create listings and publish them.",
    wayOut: "Go to your listings",
  },

  /**
   * Checked and not cleared. The REASON here is the FALLBACK ONLY — see
   * `composeVerificationRejectionReason` below, and read `composeDiditRejectReason` in
   * `src/lib/verification/didit-verdict.ts` for where the sentence a host actually reads is built.
   *
   * ⚠ NO NEW SENTENCE IS AUTHORED HERE. `HOST_REJECT_REASONS[0]` IS the canned fallback D-265 asks
   * for, and it is imported rather than retyped so this file cannot become a second owner of it. A
   * second sentence meaning the same thing is a second thing to keep true.
   *
   * The way out is a LABEL whose control the panel draws only once the cooldown has elapsed; before
   * that the panel renders no control and one sentence — `composeRetryAfterSentence`.
   */
  rejected: {
    state: "Your account wasn't approved",
    reason: HOST_REJECT_REASONS[0],
    wayOut: "Ask for another check",
  },

  /**
   * ⚠ RE-STATED FROM THE SHIPPED CONSTANT, NOT RE-AUTHORED. `SUSPENDED_HOST_SIGNAL` is what
   * `HostingPausedNotice` renders on `/host`, on `/host/listings` and on `/host/earnings`, and the
   * panel renders that same component here rather than these three fields — they exist so the map is
   * total and so a reader of this map is not left thinking a state was forgotten.
   *
   * `wayOut` stays null, from the same constant, for the same reason it is null there: what resolves
   * a suspension is an ops review this product will not offer as a control and will not promise as an
   * outcome (D-243 / D-260 / D-263). There is no submit control on this branch either — D-266 made
   * visual: the machine does not draw the button that would try to reverse a named operator's
   * decision.
   */
  suspended: {
    state: SUSPENDED_HOST_SIGNAL.state,
    reason: SUSPENDED_HOST_SIGNAL.reason,
    wayOut: SUSPENDED_HOST_SIGNAL.wayOut,
  },

  /**
   * A host whose listings were already selling when the check landed (D-207).
   *
   * ⚠ NAMES NO CHECK AND NO CUTOVER. It says what is TRUE for this host — they can already list — and
   * stops. Saying their account predates the check would be accurate and would still be the
   * question-inviting disclosure D-211 refuses; saying their account is checked would be a FABRICATED
   * VERDICT, which is `pending-copy.test.ts`'s defect exactly. A host reaches this panel only by
   * typing the URL, and what they get is true, terminal and unremarkable.
   */
  grandfathered: {
    state: "There's nothing to do here",
    reason: "Your account can already create and publish listings.",
    wayOut: "Go to your listings",
  },
} as const satisfies Record<HostVerificationStatus, VerificationSignal>;

/**
 * The rejection line as the host reads it: the stored sentence VERBATIM, or the canned one.
 *
 * ⚠ THIS COMPOSES NOTHING AND AUTHORS NOTHING. `host_verification.reason` already holds a finished
 * host-readable sentence — `composeDiditRejectReason` built it for a partner answer, `ops-review.ts`
 * built it for an operator decision, and both went through `composeReason` on the way. This function
 * exists for the one case neither covers: a `rejected` row whose reason is null or blank (a decision
 * taken before the column existed, or a write that lost it). The panel must not render an empty
 * paragraph under "Your account wasn't approved", and it must not invent a cause — so it falls back
 * to the same canned product sentence the composer's own empty case falls back to.
 *
 * The stored string is returned as TEXT and stays text all the way to a React text node (T-18-1301):
 * it originates outside FitOut, nothing here sanitises it, and nothing here may interpolate it into
 * markup.
 */
export function composeVerificationRejectionReason(
  storedReason: string | null | undefined,
): string {
  const trimmed = storedReason?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : VERIFICATION_SIGNAL.rejected.reason;
}

/**
 * The submission form's single live region, BY NAME — `role="status"` + this `aria-label`.
 *
 * A NAME, not a second copy of the sentence, for the measured reason `src/lib/design/live-regions.ts`
 * records: *a named live region can be announced BY ITS NAME INSTEAD OF ITS CONTENT*. Three words
 * that say WHICH region this is, following `ops-decision-actions.tsx:330` — the shipped resolution of
 * the same hazard. ONE region serves every refusal branch, because a press can only refuse one thing.
 *
 * The ops console's sibling name is NOT here: it belongs to the ops action's own file, and a host
 * module holding an ops string would be one import away from an ops sentence on a host surface.
 */
export const HOST_VERIFICATION_REGION_NAME = "Check not started";

/**
 * The control's in-flight label. The idle label is `VERIFICATION_SIGNAL.unverified.wayOut` on the
 * first panel and `…rejected.wayOut` on the second — there is no third spelling of either, and this
 * is the only string the button owns that a state's `wayOut` does not.
 */
export const VERIFICATION_SUBMIT_PENDING_LABEL = "Starting…";

/**
 * ⚠ D-273 — THE CHECK RUNS ON A PHONE, AND THE HOST LEARNS THAT BEFORE THEY PRESS ANYTHING.
 *
 * The partner's hosted flow is configured `is_desktop_allowed: false`, and that value is DECLARED
 * rather than observed: phone cameras give markedly better results at the two steps that use one, and
 * the most expensive outcome in this flow is a decline that spends one of the host's tries. The cost
 * of that choice is this sentence.
 *
 * ⚠ IT BELONGS IN THE PANEL'S RESTING STATE — rendered beside the control, before the press, on the
 * `unverified` panel and on the `rejected` panel once the cooldown has elapsed. NEVER as an error
 * afterwards: a host who has already been handed off to a flow that will not run where they are
 * standing has been told too late, and the redirect they came back from cannot say why.
 *
 * It names a phone and a camera. It does NOT name what the camera is pointed at, which keeps rule 2
 * above intact, and it does not name the partner.
 */
export const VERIFICATION_MOBILE_ONLY_LINE =
  "Start the check on your phone — it needs a phone camera and won't run on a computer.";

/**
 * What the host is told about the hand-off, read BEFORE the press rather than discovered after it.
 *
 * ⚠ THE ONLY PLACE THE PRODUCT NAMES THE PARTNER'S EXISTENCE, AND IT NAMES NO PARTNER. "Our checking
 * partner" — no brand, no logo, no link. Naming the vendor would put a third party's mark on FitOut's
 * trust surface and would turn a vendor swap into a copy change, which is the outcome the port in
 * `src/lib/verification/port.ts` exists to prevent (D-258 / HVER-01).
 */
export const VERIFICATION_HANDOFF_LINE =
  "Starting the check takes you to our checking partner's site. You'll come back here when you're done.";

/** Gate 1 of the form (D-269) — the checklist row's label, in the shipped `PublishChecklistRow` grammar. */
export const VERIFICATION_EMAIL_GATE_LABEL = "Confirmed email";

/** Gate 1's control, present only when the gate is unmet. */
export const VERIFICATION_EMAIL_RESEND_LABEL = "Resend the email";

/**
 * Gate 1's line, naming the address the link is going to.
 *
 * ⚠ COMPOSED IN JAVASCRIPT, NOT INTERLEAVED AS JSX TEXT. SWC's whitespace transform drops the leading
 * space of text that follows an expression container — the defect that once shipped
 * "₱300.00in cancellation fees" (`cancellation-fee-notice.tsx`). Composing it here also means two
 * surfaces cannot render the clauses in different orders.
 *
 * ⚠ THE ADDRESS IS AN ARGUMENT AND IS NEVER A LITERAL. It is the host's OWN address, echoed back to
 * the person it belongs to so they know which inbox to open — the exact inverse of FitOut publishing
 * an address for somebody to write TO, which is what D-250 and `site-contacts.test.ts` forbid. No
 * address-shaped literal appears anywhere in this file, and the corpus that scans these strings
 * asserts that the only one in this sentence is the caller's own.
 */
export function composeEmailGateLine(email: string): string {
  return `We'll send a link to ${email}. Open it, then come back here.`;
}

/** Gate 2 of the form (D-268) — the label on the required `tel` input. */
export const VERIFICATION_PHONE_LABEL = "Phone number";

/**
 * Gate 2's helper. Says what the number is FOR and, in the second clause, what it is not for — the
 * question a host actually has when a marketplace asks for their phone number.
 */
export const VERIFICATION_PHONE_HELPER =
  "FitOut keeps this so we can reach you about your listings. Bookers never see it.";

/** The launch region's clock and locale — `src/app/(ops)/ops/page.tsx:52-58`'s idiom, and its reason. */
const HOST_CLOCK_TZ = "Asia/Manila";
const HOST_LOCALE = "en-PH";

/**
 * The instant a rejected host may ask again — `updated_at` plus the cooldown, and nothing else.
 *
 * ⚠ BOTH ARGUMENTS COME FROM THE AUTHORITY THAT ENFORCES THE RULE, and neither is defaulted here.
 * The submission action's guarded UPDATE carries `updated_at < now() - make_interval(hours => …)` in
 * its OWN `WHERE`, so the server refuses on exactly this arithmetic; a default in this module would
 * be a second policy that agrees with the first until somebody changes one of them. `updated_at` is
 * also deliberately not `created_at` — a resubmission re-stamps `created_at` so a returning host
 * re-enters the queue at resubmission time, and a cooldown read off a column that moves for a
 * different reason would silently reset itself.
 */
export function retryAllowedAt(updatedAt: Date, cooldownHours: number): Date {
  return new Date(updatedAt.getTime() + cooldownHours * 60 * 60 * 1000);
}

/**
 * ⚠ D-264 — THE RETRY AFFORDANCE QUOTES AN INSTANT, NEVER A DURATION.
 *
 * Banned family 3 of `tests/listing/review-signal.test.ts` forbids a timeline nothing in the system
 * agrees to keep. The cooldown IS kept by the system — it is literally a clause of the UPDATE's own
 * `WHERE` — so the honest and gate-safe way to express it is the instant rather than the interval. A
 * duration is a promise about a person; an instant is a fact the database keeps.
 *
 * It is also the only wording that stays true while the page is open. Naming the next calendar day is
 * FALSE to a host reading the page twenty hours in, and a client-side countdown is the two-authorities
 * defect PROJECT D-130 / GATE-05 is named for: a figure on screen that can disagree with the clause
 * that decides.
 *
 * ⚠ THE FORMATTING HAPPENS HERE, ON THE SERVER, AND THE PANEL PERFORMS NONE. Every figure and every
 * date arrives at a component finished (D-130). The panel receives this string and renders it.
 */
export function composeRetryAfterSentence(updatedAt: Date, cooldownHours: number): string {
  const at = new Intl.DateTimeFormat(HOST_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: HOST_CLOCK_TZ,
  }).format(retryAllowedAt(updatedAt, cooldownHours));

  return `You can ask for another check after ${at}.`;
}
