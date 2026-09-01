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
// NOT COVERED, so the next reader under-trusts this file:
//   • WHETHER A SURFACE RENDERS ANY OF IT. `tests/listing/listing-card.test.tsx` renders the chips and
//     `npm run build` proves the two pages compile; a sentence exported here and referenced nowhere is
//     invisible to this file.
//   • WHETHER THE OPERATOR'S SENTENCE IS SAFE. It is operator free text, and what makes it safe is that
//     React renders it as a text node — asserted structurally on the surfaces, not here.
//   • THE NOTIFICATION HALF (D-245). `tests/notifications/*` owns `hostSuspendedPayload` and the two
//     rejection payloads. These two owners were written from the same spec table and must move
//     together; neither is the other's test.

import { describe, it, expect } from "vitest";

import { listingReviewState } from "@/lib/db/schema";
import {
  REVIEW_SIGNAL,
  SILENT_REVIEW_STATES,
  SUSPENDED_HOST_SIGNAL,
  composeReviewSentence,
  composeSuspendedSentence,
  reviewSignalFor,
} from "@/lib/listing/review-signal";

/** A stored operator sentence, in the shape `ops-review.ts` actually writes: a taxonomy line plus a note. */
const OPERATOR_SENTENCE =
  "The photos don't match the address on this listing. Re-shoot the space and resubmit.";

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
    expect(HOST_VISIBLE.length).toBeGreaterThanOrEqual(7);

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
});
