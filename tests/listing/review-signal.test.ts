// LVER-02 (host half) / OPS-05 (read half) / D-230 — THE HOST-SIDE REVIEW SIGNAL'S COPY, PINNED.
//
// `src/lib/listing/review-signal.ts` is pure copy: no query, no DOM, no clock. So this is a plain unit
// test rather than `hours-signal.test.ts`'s integration shape — there is no predicate here to be wrong
// about a database, only sentences to be wrong about a host.
//
// WHAT THIS FILE IS FOR, IN ONE LINE: it pins the sentences that MUST appear and, harder, the ones that
// MUST NOT. The second half is the one that earns its keep. A copy edit that softens "It won't take
// bookings" into "It isn't taking bookings just yet, get in touch and we'll sort it out" would compile,
// render, and quietly promise a host two things this product does not have — a route back and an inbox.
//
// ⚠ THE ASSERTIONS RUN OVER THE EXPORTED VALUES, NOT OVER THE SOURCE TEXT, AND THAT IS DELIBERATE.
// This repository has gone falsely RED seven times now on gates that scanned raw source while the
// correct file necessarily named the thing it forbade (18-04's `getSession` grep, 18-05's three, the
// `re-review.ts` header that must not spell its own excluded enum value). Reading the runtime strings
// sidesteps the trap entirely: this file may spell every banned phrase in its own patterns, because the
// scan never looks at this file OR at the module's prose — only at what a host would actually read.
//
// ⚠ THE CORPUS NOW REACHES BEYOND LISTING REVIEW SIGNALS, AND THE FILE'S NAME IS THE LESSER EVIL.
// Phase 18.1 (18.1-UI-SPEC § Gate Amendments row 9) adds the HOST VERIFICATION surface's sentences to
// the scan below: `src/lib/host/verification-signal.ts`'s six panels and form copy, the composed
// rejection sentence built by `src/lib/verification/didit-verdict.ts`, and the six refusals
// `src/lib/host/verification-refusals.ts` exports for `requestHostVerification`. So this file's NAME
// is now narrower than its SCOPE, and that is a deliberate trade: the alternative was a second test
// file carrying its own copy of the four family regexes, which is a guarantee that one of the two
// copies drifts — one gets a fifth family, or has its third narrowed to make a sentence pass, and
// nothing anywhere reports that the two guards no longer agree. ONE corpus, ONE owner, strictly more
// strings scanned. The four `BANNED` patterns below are BYTE-IDENTICAL to what they were before that
// amendment: nothing was widened, narrowed or removed to accommodate the new sentences, and if a new
// sentence had failed a family the sentence was the thing to change.
//
// NOT COVERED, so the next reader under-trusts this file:
//   • WHETHER A SURFACE RENDERS ANY OF IT. `tests/listing/listing-card.test.tsx` renders the chips and
//     `npm run build` proves the two pages compile; a sentence exported here and referenced nowhere is
//     invisible to this file.
//   • WHETHER THE OPERATOR'S SENTENCE IS SAFE. It is operator free text, and what makes it safe is that
//     React renders it as a text node — asserted structurally on the surfaces, not here.
//   • THE NOTIFICATION HALF (D-245). `tests/notifications/*` owns `hostSuspendedPayload` and the two
//     rejection payloads. These two owners were written from the same spec table and must move
//     together; neither is the other's test.
//   • THE TWO EMAIL-RESEND TOAST SENTENCES. They live inside the function that speaks them
//     (`src/lib/host/resend-verification.ts`) rather than as exported constants, so there is nothing
//     for this file to import. What pins them is a repo-wide occurrence count of each sentence —
//     exactly one owner — asserted in plan 18.1-10's own verification rather than here.
//   • WHETHER THE MOBILE-ONLY INSTRUCTION IS RENDERED IN THE PANEL'S RESTING STATE (D-273). This file
//     can see that the sentence exists and that it is safe to say; only the surface can be wrong about
//     WHEN it is said, and saying it after a dead-end redirect is the failure that matters.

import { describe, it, expect } from "vitest";

import { hostVerificationStatus, listingReviewState } from "@/lib/db/schema";
import {
  REVIEW_SIGNAL,
  SILENT_REVIEW_STATES,
  SUSPENDED_HOST_SIGNAL,
  composeFrozenSessionSentence,
  composeReviewSentence,
  composeSuspendedSentence,
  reviewSignalFor,
} from "@/lib/listing/review-signal";
import {
  HOST_VERIFICATION_REGION_NAME,
  VERIFICATION_EMAIL_GATE_LABEL,
  VERIFICATION_EMAIL_RESEND_LABEL,
  VERIFICATION_HANDOFF_LINE,
  VERIFICATION_LEDE,
  VERIFICATION_LOADING_LABEL,
  VERIFICATION_MOBILE_ONLY_LINE,
  VERIFICATION_PAGE_TITLE,
  VERIFICATION_PHONE_HELPER,
  VERIFICATION_PHONE_LABEL,
  VERIFICATION_SIGNAL,
  VERIFICATION_SUBMIT_PENDING_LABEL,
  composeEmailGateLine,
  composeRetryAfterSentence,
  composeVerificationRejectionReason,
} from "@/lib/host/verification-signal";
import { COOLDOWN_HOURS } from "@/lib/host/verification-cooldown";
import {
  HOST_VERIFICATION_LISTING_REFUSED,
  HOST_VERIFICATION_REFUSALS,
} from "@/lib/host/verification-refusals";
import { composeDiditRejectReason, type DiditDecision } from "@/lib/verification/didit-verdict";

/** A stored operator sentence, in the shape `ops-review.ts` actually writes: a taxonomy line plus a note. */
const OPERATOR_SENTENCE =
  "The photos don't match the address on this listing. Re-shoot the space and resubmit.";

/**
 * A frozen session's two facts, as `loadFrozenPayoutSummary` resolves them (D-260).
 *
 * The date is already FORMATTED here because that is how the composer receives it in production —
 * `src/lib/host/frozen-payouts.ts` owns the `Intl.DateTimeFormat` call, and this file's job is to scan
 * the sentence a host actually reads, not the template it came from.
 */
const FROZEN_SPACE = "Kalayaan Court B";
const FROZEN_DATE = "Aug 26, 2026";

/**
 * ONE HOST'S OWN ADDRESS, as the verify form's first gate echoes it back to them (D-269).
 *
 * ⚠ IT IS ADDRESS-SHAPED ON PURPOSE, AND THAT IS WHY IT IS ELIDED FROM THE CORPUS BELOW. Family 4
 * bans an address-shaped literal on any host surface, and it is right to: `SUPPORT_EMAIL` is null and
 * FitOut publishes no address for anyone to write TO. The gate-1 line is the INVERSE direction — the
 * host's own address, handed back to the person it belongs to so they know which inbox to open — and
 * it arrives as an ARGUMENT from the session, never as a literal in `src/`. See case (16).
 */
const HOST_OWN_ADDRESS = "maria.santos@example.com";

/**
 * The verification `updated_at` and the cooldown the server enforces, so the retry sentence under test
 * is the one a real rejected host reads (D-264). Both are arguments in production too: the action's
 * guarded UPDATE owns the interval and this module owns only the wording.
 *
 * ⚠ THE INTERVAL IS IMPORTED, NOT RESTATED, SINCE PLAN 18.1-11. It was a local `24` here, which was a
 * third spelling of one policy beside the action's `WHERE` and the page's sentence; the constant now
 * has one unguarded owner and this fixture reads it, so the sentence under test is the sentence the
 * shipped cooldown actually produces. A fixture that pinned its own number would keep passing after
 * the policy moved.
 */
const REJECTED_AT = new Date("2026-09-02T08:15:00Z");

/**
 * A DECLINE FROM THE CHECKING PARTNER, in the shape `composeDiditRejectReason` actually receives
 * (18.1-RESEARCH § R3): plural feature arrays, each report carrying its own `warnings[]` of
 * `{ log_type, risk, short_description }`.
 *
 * Both codes are on `DIDIT_SAFE_RISKS`, and the descriptions are the vendor's own end-user phrasings.
 * WHAT THIS FIXTURE IS NOT FOR: proving the allow-list, the `log_type` filter or the 280-char bound —
 * `tests/verification/didit-verdict.test.ts` owns all three, and double-pinning them here would be two
 * places to edit and one that gets forgotten. This corpus's subject is the TONE of the sentence that
 * SURVIVES those gates, composed rather than quoted.
 */
const PARTNER_DECLINE: DiditDecision = {
  id_verifications: [
    {
      node_id: "id-verification-1",
      status: "Declined",
      warnings: [
        { log_type: "error", risk: "DOCUMENT_EXPIRED", short_description: "Document expired" },
        {
          log_type: "error",
          risk: "IMAGE_TOO_BLURRY",
          short_description: "Document image is too blurry",
        },
      ],
    },
  ],
};

describe("REVIEW_SIGNAL — the four review states a host can be in (18-UI-SPEC § Every state that is NOT the badge)", () => {
  it("(1) `pending`: the chip, the reason, and NO way out — the absence is the decision", () => {
    const signal = reviewSignalFor("pending");

    expect(signal).not.toBeNull();
    expect(signal?.chip).toBe("In review");
    expect(signal?.reason).toBe(
      "Someone at FitOut is checking this listing. It can't take bookings until that's done.",
    );

    // The state and the reason are named; the way out is absent BY DECISION (there is nothing the host
    // can do, and a control that acts on nothing is worse than none). Asserted with the same force as
    // the presence of the one way out that does exist — `requests-signal.ts:56` calls a signal with an
    // undeclared gap a shape this product does not ship, and `null` is what declares it.
    expect(signal?.wayOut).toBeNull();
  });

  it("(2) `rejected`: the chip, the reason, and the ONE way out that is true (D-249 / plan 18-06)", () => {
    const signal = reviewSignalFor("rejected");

    expect(signal).not.toBeNull();
    expect(signal?.chip).toBe("Not approved");
    expect(signal?.reason).toBe(
      "FitOut checked this listing and didn't approve it. It won't take bookings.",
    );

    // TRUE ONLY BECAUSE A MATERIAL EDIT FLIPS `rejected → pending` (D-249, shipped in plan 18-06 as the
    // third member of `RE_REVIEW_SOURCE_STATES`). Under D-232 as originally written, a rejected listing
    // was dead forever and this label pointed nowhere. If that tuple loses its third member, this
    // expectation is the thing that should be deleted — in the same commit, not left promising a route.
    expect(signal?.wayOut).toBe("Edit this listing");
  });

  it("(3) `grandfathered`: the module emits NOTHING — it is a data state, not a message (D-211/D-212)", () => {
    // THE MUTATION ANCHOR for this plan. A host whose listing was already selling when the phase landed
    // experienced no change at all, and a chip reading "grandfathered" invites a question nobody at
    // FitOut can answer. The card must render exactly what it rendered yesterday.
    expect(reviewSignalFor("grandfathered")).toBeNull();

    // And the silence is DECLARED rather than defaulted — a reason exists, in the tree, for why nothing
    // is said. A `null` with no declaration beside it is indistinguishable from an omission.
    expect(SILENT_REVIEW_STATES.grandfathered).toContain("grandfathered");
    expect(SILENT_REVIEW_STATES.grandfathered.length).toBeGreaterThan(40);
  });

  it("(4) `approved` and `withdrawn` are silent too, each for its own declared reason", () => {
    expect(reviewSignalFor("approved")).toBeNull();
    expect(reviewSignalFor("withdrawn")).toBeNull();
    expect(SILENT_REVIEW_STATES.approved.length).toBeGreaterThan(20);
    expect(SILENT_REVIEW_STATES.withdrawn.length).toBeGreaterThan(20);
  });

  it("(5) a missing review state fails SILENT, never with a fabricated verdict", () => {
    // The realistic defeat is a caller that forgot to select the column. Showing the host nothing is
    // today's behaviour and is honest; showing them "Not approved" because a value was null would be a
    // decision FitOut never took, announced to the person it hurts most.
    expect(reviewSignalFor(null)).toBeNull();
    expect(reviewSignalFor(undefined)).toBeNull();
  });

  it("(6) THE CENSUS — every `listing_review_state` value is either spoken or declared silent", () => {
    // Derived from the pgEnum, so a SIXTH value reddens this line rather than becoming silent by
    // accident. `tsc` already enforces the same thing through `SILENT_REVIEW_STATES`' total `Record`;
    // this is the runtime half, and it names the value in its failure message.
    const spoken = Object.keys(REVIEW_SIGNAL);
    const silent = Object.keys(SILENT_REVIEW_STATES);

    expect([...spoken, ...silent].sort()).toEqual([...listingReviewState.enumValues].sort());
    expect(spoken.filter((s) => silent.includes(s))).toEqual([]);
  });
});

describe("SUSPENDED_HOST_SIGNAL — a suspended host is told, with the reason (D-243 / D-252)", () => {
  it("(7) names the state and BOTH consequences, and offers no way out", () => {
    expect(SUSPENDED_HOST_SIGNAL.state).toBe("Hosting paused");
    expect(SUSPENDED_HOST_SIGNAL.reason).toBe(
      "FitOut has paused your hosting. Your spaces can't be booked, and payouts are on hold.",
    );

    // BOTH HALVES, and the payout half is the one D-252 turned on. Plan 18-07's freeze is PRE-CLAIM, so
    // a suspended host's delivered session produces no ledger row at all and `/host/earnings` shows
    // nothing — a host told only "can't be booked" would meet the payout freeze as an unexplained
    // missing payment. The same clause ships in `hostSuspendedPayload`.
    expect(SUSPENDED_HOST_SIGNAL.reason).toContain("payouts are on hold");
    expect(SUSPENDED_HOST_SIGNAL.reason).toContain("can't be booked");

    // No route back. Contesting an ops decision is backlog 999.6 and OUT of this phase.
    expect(SUSPENDED_HOST_SIGNAL.wayOut).toBeNull();
  });
});

describe("the operator's stored sentence — verbatim, once, and never paraphrased", () => {
  it("(8) the rejection line is the product sentence THEN the operator's, joined by one space", () => {
    const line = composeReviewSentence(REVIEW_SIGNAL.rejected, OPERATOR_SENTENCE);

    expect(line).toBe(`${REVIEW_SIGNAL.rejected.reason} ${OPERATOR_SENTENCE}`);
    expect(line).toContain(OPERATOR_SENTENCE);
    // EXACTLY ONCE. Plan 18-09 mutation-proved the notification half by paraphrasing the stored reason
    // and watching its gate go red; a surface that summarised it into the chip AND printed it below
    // would say the operator's words twice, in two voices, one of them invented.
    expect(line.split(OPERATOR_SENTENCE)).toHaveLength(2);
  });

  it("(9) the suspension line does the same, on the shared composer", () => {
    const line = composeSuspendedSentence(OPERATOR_SENTENCE);

    expect(line).toBe(`${SUSPENDED_HOST_SIGNAL.reason} ${OPERATOR_SENTENCE}`);
    expect(line.split(OPERATOR_SENTENCE)).toHaveLength(2);
  });

  it("(10) an absent, empty or whitespace-only reason yields the product sentence ALONE", () => {
    // An approval carries no reason; a rejection written before the column existed may carry none
    // either. A trailing space or a dangling separator is a visible defect on a real surface.
    for (const empty of [null, undefined, "", "   ", "\n"]) {
      expect(composeSuspendedSentence(empty)).toBe(SUSPENDED_HOST_SIGNAL.reason);
      expect(composeReviewSentence(REVIEW_SIGNAL.pending, empty)).toBe(REVIEW_SIGNAL.pending.reason);
    }
  });
});

describe("the banned language — what no host surface may say (D-243 / D-250 / backlog 999.6)", () => {
  /**
   * EVERY STRING A HOST CAN READ from this module, including both composed forms.
   *
   * `SILENT_REVIEW_STATES` is deliberately EXCLUDED: its values are developer prose explaining why a
   * state says nothing, they are exported for this file's census and for a reader, and no surface
   * renders them. Scanning them would be scanning a comment that happens to be a string.
   */
  const HOST_VISIBLE: string[] = [
    ...Object.values(REVIEW_SIGNAL).flatMap((s) => [s.chip, s.reason, s.wayOut ?? ""]),
    SUSPENDED_HOST_SIGNAL.state,
    SUSPENDED_HOST_SIGNAL.reason,
    composeReviewSentence(REVIEW_SIGNAL.rejected, OPERATOR_SENTENCE),
    composeSuspendedSentence(OPERATOR_SENTENCE),
    // D-260's frozen-session sentence, BOTH forms, COMPOSED rather than quoted. The scan reads what
    // the host reads: a template that was safe with a placeholder in it and unsafe once a real count
    // and a real date landed is exactly the drift a corpus of templates would miss.
    composeFrozenSessionSentence(1, FROZEN_SPACE, FROZEN_DATE),
    composeFrozenSessionSentence(3, FROZEN_SPACE, FROZEN_DATE),

    // ── PHASE 18.1 — THE HOST VERIFICATION SURFACE (18.1-UI-SPEC § Gate Amendments row 9) ─────────
    //
    // (a) EVERY host-visible string `src/lib/host/verification-signal.ts` exports. All three of the
    // page's own strings, all six panels' state / reason / way-out, the live region's NAME (a screen
    // reader announces it, so it is read), the in-flight label, and the form's five lines. The
    // `suspended` row re-states `SUSPENDED_HOST_SIGNAL`, so two of these are the same bytes as two
    // entries above — scanning them twice costs nothing and asserts the re-statement rather than
    // trusting it.
    VERIFICATION_PAGE_TITLE,
    VERIFICATION_LEDE,
    VERIFICATION_LOADING_LABEL,
    ...Object.values(VERIFICATION_SIGNAL).flatMap((s) => [s.state, s.reason, s.wayOut ?? ""]),
    HOST_VERIFICATION_REGION_NAME,
    VERIFICATION_SUBMIT_PENDING_LABEL,
    VERIFICATION_MOBILE_ONLY_LINE,
    VERIFICATION_HANDOFF_LINE,
    VERIFICATION_EMAIL_GATE_LABEL,
    VERIFICATION_EMAIL_RESEND_LABEL,
    VERIFICATION_PHONE_LABEL,
    VERIFICATION_PHONE_HELPER,

    // D-264's retry sentence, COMPOSED — the formatted instant included, because a template with a
    // placeholder in it is exactly the string that stays safe while the finished one goes wrong.
    // Case (15) is the named argument for why it is safe.
    composeRetryAfterSentence(REJECTED_AT, COOLDOWN_HOURS),

    // Gate 1's line with THE HOST'S OWN ADDRESS REMOVED — see `HOST_OWN_ADDRESS` and case (16). What
    // is scanned here is every word FitOut wrote; the one thing elided is the one thing FitOut did not.
    composeEmailGateLine(HOST_OWN_ADDRESS).replace(HOST_OWN_ADDRESS, ""),

    // (b) THE COMPOSED REJECTION SENTENCE (D-265) — built through the real composer from a real
    // decline shape, so the RENDERED string is scanned and not a template. Both forms: the one a
    // surviving vendor sentence produces, and the canned one a decline with nothing survivable
    // produces. `composeVerificationRejectionReason` is what the panel calls with the stored column.
    composeDiditRejectReason(PARTNER_DECLINE),
    composeVerificationRejectionReason(composeDiditRejectReason(PARTNER_DECLINE)),
    composeVerificationRejectionReason(null),

    // (c) EVERY SENTENCE `requestHostVerification` CAN RETURN (plan 18.1-07). They are exported from
    // `src/lib/host/verification-refusals.ts` and not from the action itself, because a `"use server"`
    // module may export only async functions — the incident `tests/use-server-exports.test.ts`
    // records. A host reads these in the panel's one live region, so they are host-visible strings
    // exactly like the panels above.
    ...HOST_VERIFICATION_REFUSALS,

    // (d) THE LISTING-CREATION REFUSAL (D-255 / PM-C, plan 18.1-12). Scanned by NAME rather than
    // spread from the array above, because that array's contract is "every sentence
    // `requestHostVerification` can return" and this one belongs to `createDraftListing` — widening
    // it would falsify a claim its other readers depend on.
    //
    // ⚠ IT IS IN THE CORPUS EVEN THOUGH THE PRODUCT PATH CANNOT REACH IT. `/host/listings/new` reads
    // the same row and routes a refusing host to `/host/verify` before the action is called, so a
    // host meets the panel instead. It is scanned anyway for `HOST_VERIFICATION_SIGNED_OUT`'s
    // recorded reason: a `"use server"` export is reachable by POST whatever the UI shows, so the
    // branch is real, the sentence is host-readable, and an unreachable string is exactly the one
    // that drifts without anybody noticing.
    HOST_VERIFICATION_LISTING_REFUSED,
  ].filter((s) => s.length > 0);

  /**
   * The four families, each with the decision that bans it.
   *
   * ⚠ This file may spell them; `src/lib/listing/review-signal.ts` may not. The scan reads the exported
   * VALUES, so no pattern here can ever match itself — the falsely-red trap that has cost this
   * repository seven gates is structurally unreachable from this shape.
   */
  const BANNED: ReadonlyArray<{ pattern: RegExp; why: string }> = [
    {
      pattern: /appeal/i,
      why: "host appeals are backlog 999.6 and OUT (D-243) — offering one promises a process that does not exist",
    },
    {
      pattern: /we'?ll be in touch|get back to you|reply to (this|us)|contact us|email us/i,
      why: "a promise of a reply into an inbox FitOut does not have (D-243 / D-250)",
    },
    {
      pattern: /within \d+|\d+ (business )?(hours?|days?|weeks?)|shortly|soon/i,
      why: "a timeline nothing in the system agrees to keep — the queue is oldest-first with no service promise",
    },
    {
      pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|mailto:|\bSupport\b/,
      why: "SUPPORT_EMAIL is null and stays null (D-250); site-contacts.test.ts asserts zero support affordances under src/ while it is",
    },
  ];

  it("(11) no host-visible string promises a route back, a reply, a timeline or an address", () => {
    const violations = HOST_VISIBLE.flatMap((text) =>
      BANNED.filter(({ pattern }) => pattern.test(text)).map(
        ({ pattern, why }) => `  ${pattern} matched "${text}"\n      banned because: ${why}`,
      ),
    );

    expect(
      violations,
      "a host-facing string on the rejection or suspension path says something FitOut cannot " +
        "deliver:\n" +
        `${violations.join("\n")}\n` +
        "Say what happened, say why, and stop. The sentences were written to be complete without a " +
        "route back and without an address — do not add a clause that renders half the time, and do " +
        "NOT weaken tests/design/site-contacts.test.ts to make one pass.",
    ).toEqual([]);
  });

  it("(12) guard-the-guard: the scan has strings in it and the patterns can fire", () => {
    // A scan of nothing agrees with an empty violation list perfectly — this repository's most-recorded
    // failure mode. Both halves: the corpus is non-empty, and each pattern is proved live against a
    // fixture that SHOULD trip it.
    // The floor MOVES WITH THE CORPUS — 7 → 9 when D-260's two composed forms joined it, and 9 → 49
    // when phase 18.1's host verification surface did (MEASURED, not estimated: the corpus was read
    // at 49 with the floor deliberately failed, then the floor was set to it). A floor left behind is
    // a floor that stops noticing a whole family of strings dropping out of the scan — and the 18.1
    // amendment adds THIRTY-EIGHT strings from four modules, so a floor of 9 would have gone on
    // passing with every one of them deleted.
    // 49 → 50 when plan 18.1-12's listing-creation refusal joined the corpus. MEASURED the same way:
    // the floor was deliberately failed and the reported length read back, never estimated.
    expect(HOST_VISIBLE.length).toBeGreaterThanOrEqual(50);

    const tripwires = [
      "Contact us to appeal this decision.",
      "We'll be in touch about your account.",
      "You'll hear back within 5 business days.",
      "Email us at help@example.com.",
    ];
    for (const [i, fixture] of tripwires.entries()) {
      expect(BANNED[i].pattern.test(fixture), `pattern ${i} did not fire on "${fixture}"`).toBe(true);
    }
  });

  it("(13) nothing in the copy is markup — the operator's sentence crosses a trust boundary (T-18-1301)", () => {
    // The stored reason is operator FREE TEXT rendered on a surface the host controls nothing about.
    // What keeps it safe is that it stays a string all the way to a React text node; a composer that
    // started emitting tags would be the first step toward the thing the surfaces grep for.
    for (const text of HOST_VISIBLE) {
      expect(text).not.toMatch(/<[a-z/]/i);
      expect(text).not.toContain("&#");
    }
  });

  it("(14) the frozen-session sentence dates the session ABSOLUTELY and trips no duration pattern", () => {
    // D-260's sentence is the one host-facing string in this module that carries a DATE, which puts it
    // one word away from family 3 — "3 days ago" is the natural phrasing and it is banned twice over:
    // as a timeline nothing agrees to keep, and as a figure that changes every time the host reloads a
    // page about their own money. Case (11) already scans both forms; this case says WHY they are safe
    // rather than leaving it to a pattern that happens not to fire.
    const one = composeFrozenSessionSentence(1, FROZEN_SPACE, FROZEN_DATE);
    const many = composeFrozenSessionSentence(3, FROZEN_SPACE, FROZEN_DATE);
    const DURATION_FAMILY = BANNED[2];

    for (const sentence of [one, many]) {
      expect(sentence).toContain(FROZEN_SPACE);
      // An absolute calendar date — a month name, a day and a FOUR-DIGIT YEAR. A relative phrase
      // cannot satisfy this, and neither can a bare "Aug 26" that would read differently in January.
      expect(sentence).toMatch(/\b[A-Z][a-z]{2} \d{1,2}, \d{4}\b/);
      expect(
        DURATION_FAMILY.pattern.test(sentence),
        `the frozen-session sentence matched ${DURATION_FAMILY.pattern}: "${sentence}"\n` +
          `banned because: ${DURATION_FAMILY.why}`,
      ).toBe(false);
    }

    // The two forms are genuinely different sentences, not one with a pluralised noun: the singular
    // names the only session there is, the plural names the TOTAL and then singles out the earliest.
    expect(one).not.toContain("earliest");
    expect(many).toContain("3 sessions");
    expect(many).toContain("earliest");

    // And neither of them, nor the sentence above them, names what unfreezes it (D-260 / D-263).
    expect(SUSPENDED_HOST_SIGNAL.wayOut).toBeNull();
  });

  it("(15) D-264 — the retry affordance quotes an INSTANT the database keeps, never a duration", () => {
    // FAMILY 3 IS THE ONE THAT BITES IN PHASE 18.1, and it bites at exactly this sentence. The ban's
    // stated reason is *a timeline nothing in the system agrees to keep* — but the cooldown IS kept:
    // it is literally a clause of the submission UPDATE's own WHERE. So the honest way to express it
    // is the instant rather than the interval, and the natural phrasings ("in 24 hours", "tomorrow",
    // "try again in a day") are all wrong twice over: banned here, and FALSE to a host reading the
    // page twenty hours in.
    const sentence = composeRetryAfterSentence(REJECTED_AT, COOLDOWN_HOURS);
    const DURATION_FAMILY = BANNED[2];

    // An absolute calendar date — month name, day, FOUR-DIGIT YEAR — plus a clock time, because a
    // date alone would leave the host guessing which hour of it. Case (14)'s own date assertion, one
    // surface over.
    expect(sentence).toMatch(/\b[A-Z][a-z]{2} \d{1,2}, \d{4}\b/);
    expect(sentence).toMatch(/\d{1,2}:\d{2}/);

    expect(
      DURATION_FAMILY.pattern.test(sentence),
      `the retry sentence matched ${DURATION_FAMILY.pattern}: "${sentence}"\n` +
        `banned because: ${DURATION_FAMILY.why}\n` +
        "A DURATION IS A PROMISE ABOUT A HUMAN; AN INSTANT IS A FACT THE DATABASE KEEPS. The cooldown " +
        "is enforced by `updated_at < now() - make_interval(hours => …)` in the submission UPDATE's " +
        "own WHERE, so the honest sentence quotes the moment that clause starts letting the host " +
        "through — formatted server-side and passed in finished (PROJECT D-130 / GATE-05). Do not " +
        "replace it with an interval, a countdown or the name of the next calendar day.",
    ).toBe(false);

    // And the instant MOVES WITH THE COOLDOWN rather than being a constant that happens to look
    // right: a longer cooldown must produce a later sentence, or the arithmetic is decorative.
    expect(composeRetryAfterSentence(REJECTED_AT, 48)).not.toBe(sentence);
  });

  it("(16) the gate-1 line echoes the host's OWN address and publishes none of FitOut's", () => {
    const line = composeEmailGateLine(HOST_OWN_ADDRESS);
    const ADDRESS_FAMILY = BANNED[3];

    // The host's address appears EXACTLY ONCE — they are being told which inbox to open, not handed a
    // route to write to anybody.
    expect(line.split(HOST_OWN_ADDRESS)).toHaveLength(2);

    // GUARD-THE-GUARD FOR THE ELISION IN THE CORPUS ABOVE, IN BOTH DIRECTIONS. Family 4 fires on the
    // whole line — proving the address is genuinely there and that the elision is doing real work
    // rather than papering over a sentence that was already clean — and does NOT fire once the
    // caller's own argument is removed, which is what makes every word FitOut wrote scannable. An
    // elision that could never have mattered is an exclusion, and exclusions are how this family
    // stops meaning anything.
    expect(ADDRESS_FAMILY.pattern.test(line)).toBe(true);
    expect(
      ADDRESS_FAMILY.pattern.test(line.replace(HOST_OWN_ADDRESS, "")),
      "FitOut's own words in the email-confirmation line matched " +
        `${ADDRESS_FAMILY.pattern}\n      banned because: ${ADDRESS_FAMILY.why}\n` +
        "The host's own address arrives as an argument from their session and is the one thing this " +
        "family may not judge. Anything else address-shaped in this sentence is FitOut publishing a " +
        "route to a human, which D-263 says does not exist.",
    ).toBe(false);
  });

  it("(17) D-272 — no sentence tells a host they have no tries left, because they have", () => {
    // THE TRAP THIS CASE EXISTS FOR. The checking partner's PER-MODULE caps (two attempts at the ID
    // step, three at each of the other two) bound retries WITHIN ONE session; the host's own
    // allowance is seven sessions per seven days, raised deliberately so the partner can never refuse
    // before FitOut's cooldown does. A host can therefore exhaust one session's tries with almost all
    // of their weekly allowance untouched — so "you have no attempts left" is FALSE at the moment
    // they read it, and it sends somebody who could simply start again looking for the route to a
    // person that D-263 says does not exist.
    //
    // The mechanism that keeps it out is `DIDIT_SAFE_RISKS`: an attempts-exhausted code is off the
    // allow-list, so the partner's own wording never reaches a host and no replacement is written.
    // This is the assertion that would notice somebody writing one anyway.
    const EXHAUSTION =
      /no (more )?(tries|attempts|goes)|attempts? (left|remaining|exhausted|used up)|out of (tries|attempts)|used up your/i;

    const violations = HOST_VISIBLE.filter((text) => EXHAUSTION.test(text));

    expect(
      violations,
      "a host-facing string says or implies the host has no tries left:\n" +
        `${violations.join("\n")}\n` +
        "It is false. The per-module caps bound ONE session; the weekly allowance is seven, and D-264 " +
        "is the single authority on how often a host may try — it says it with a timestamp. Say what " +
        "happened and, if a retry is bounded, say WHEN.",
    ).toEqual([]);

    // Proof the pattern can fire, on the sentence somebody would reasonably have written.
    expect(EXHAUSTION.test("You have no attempts left for this check.")).toBe(true);
  });

  it("(18) THE CENSUS — every `host_verification_status` value has a panel with words in it", () => {
    // The runtime half of the `satisfies Record<HostVerificationStatus, VerificationSignal>` clause,
    // derived from the pgEnum so a SEVENTH value reddens this line and names itself. `/host/verify` is
    // a DESTINATION: unlike the listing card's three declared silences, there is no state here that
    // may render nothing, because a destination that renders nothing is a broken page.
    expect(Object.keys(VERIFICATION_SIGNAL).sort()).toEqual(
      [...hostVerificationStatus.enumValues].sort(),
    );

    for (const [status, signal] of Object.entries(VERIFICATION_SIGNAL)) {
      expect(signal.state.length, `${status} has no state`).toBeGreaterThan(10);
      expect(signal.reason.length, `${status} has no reason`).toBeGreaterThan(20);
    }

    // ONE state has NO WAY OUT, and that absence is a decision rather than a gap. `suspended`: D-266
    // — the machine does not draw a button that would try to reverse a named operator's decision —
    // and D-260/D-263 refuse to name what unfreezes it.
    expect(VERIFICATION_SIGNAL.suspended.wayOut).toBeNull();

    // `pending` HAS one, and the value is asserted rather than the absence (plan 18.1-15, closing
    // `deferred-items.md` § D5). A host whose session is still unfinished can be handed back into it:
    // the partner returns the same session when asked again, so the affordance is a PRESS and the
    // hosted URL is still never stored. The panel labels its control from this string and `/host`'s
    // advisory row links with it, so it has to read correctly as both.
    expect(VERIFICATION_SIGNAL.pending.wayOut).not.toBeNull();
    expect((VERIFICATION_SIGNAL.pending.wayOut ?? "").trim().length).toBeGreaterThan(0);

    // ⚠ `grandfathered` NAMES NO CHECK AND NO CUTOVER (D-211 / D-212). Unlike the listing card it is
    // not silent — this is a destination — but what it says is what is TRUE for that host: they can
    // already list. It must not spell the data state, and it must not claim a verdict nobody reached,
    // which would be `pending-copy.test.ts`'s fabricated-verdict defect.
    const words = [
      VERIFICATION_SIGNAL.grandfathered.state,
      VERIFICATION_SIGNAL.grandfathered.reason,
    ].join(" ");
    expect(words).not.toMatch(/grandfather|legacy|existing host/i);
    expect(words).not.toMatch(/checked|verified|approved/i);
  });
});
