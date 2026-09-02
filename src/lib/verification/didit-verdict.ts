// The SINGLE place a Didit answer becomes a FitOut state change (HVER-07 / HVER-08).
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// ONE MAPPER, TWO CALLERS — AND THAT IS THE WHOLE POINT
// ════════════════════════════════════════════════════════════════════════════════════════════════
// The signed webhook (plan 18.1-08) and the reconciliation sweep (plan 18.1-09) are two DELIVERY
// mechanisms for one vendor verdict. They must never become two OPINIONS about what that verdict
// means. `src/lib/payments/refund-rail.ts:35` states the rule one domain over — "This module remains
// the ONLY branch point for refund dispatch. Do NOT inline this predicate anywhere." — and D-105 is
// the incident it was written after. Two independent statements moving a host row into the approved
// state, reached by two different readings of the same ten vendor strings, is exactly the shape that
// forbids.
//
// THIS MODULE DESCRIBES A TRANSITION AND NEVER PERFORMS ONE. It is pure — no database handle, no
// network call, no clock, no environment read — so the webhook route, the Inngest sweep and a
// DB-free unit test all import the same module, exactly as `refund-rail.ts` is imported by a route,
// a server action and an RSC. The single WRITER is `src/lib/verification/apply-verdict.ts` (plan
// 18.1-08), and the sweep calls that writer rather than repeating it.
//
// Pure/isomorphic: no directive prologue and no client-bundle guard, for `refund-rail.ts`'s reason
// and `src/lib/payments/fees.ts:1-30`'s rule — guard the module a client must never REACH, not the
// module a client legitimately imports. This one holds no credential, opens no connection and reads
// nothing from the environment. The module that DOES hold the API key is the adapter, and it carries
// its own guard on line 1.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY `tsc` CANNOT DO THE CENSUS HERE, AND WHAT DOES IT INSTEAD
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Every other total map in this repo is keyed on a pgEnum-derived union, so the compiler enumerates
// the members for you (`src/components/ops/ops-queue-row.tsx:170-186` is the idiom, and the reason
// it gives — "a seventh status is a compile error here rather than a blank cell in front of somebody
// deciding" — is exactly the reason wanted here). Didit's statuses are VENDOR STRINGS: nothing in
// FitOut's schema knows they exist, and no compiler can notice the vendor added an eleventh.
//
// So the census is built in two halves, and BOTH are load-bearing:
//
//   1. The status tuple below is DECLARED, and the outcome table is a TOTAL `Record` over the union
//      derived from it. Adding a status to the tuple without deciding what it does is a compile
//      error — that half of the census `tsc` can still do, once the union is written down by hand.
//   2. `tests/verification/didit-verdict.test.ts` drives all ten in BOTH casings and asserts that
//      its own table's length equals the tuple's, so a member added to the tuple without a decision
//      recorded in the test is a RED. The tuple alone would be a list; the tuple plus that test is
//      a census.
//
// ⚠ AND THE LIST ITSELF IS A CLAIM WITH AN EXPIRY. It is transcribed from 18.1-RESEARCH § ADDENDUM
// A6 (2026-09-02) — the vendor's own complete enumeration, which is TWO longer than the status table
// in the research body. If Didit adds an eleventh, this module answers with the unknown branch,
// which moves nothing and asks for an audit row, until a person decides otherwise. That is the
// correct failure and it is the only one that cannot approve somebody by accident.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE CASING HAZARD — THE DEFECT THIS FILE WOULD OTHERWISE SHIP SILENTLY
// ════════════════════════════════════════════════════════════════════════════════════════════════
// The webhook envelope and the status reference spell a verdict in title case; the decision
// endpoint's own example spells it in upper case (18.1-RESEARCH § R1, two vendor pages, both cited).
// A mapper that compared exactly would match one surface and miss the other — and because D-262
// auto-rejects with no operator in the loop, and D-263 gives a host no route to a human, the visible
// symptom would be every host sitting in the pending state forever with nobody prompted. An
// invisible failure on the only path a host has is the same class of defect
// `src/lib/ops/review-queue.ts:196-218`'s `toDate` normaliser exists for: normalise ONCE, at the
// top, and keep the shape recognisable.
//
// Normalisation is CASE and WHITESPACE only. An undocumented spelling — an underscored variant, say
// — is deliberately NOT accepted: inventing tolerance for a form the vendor has never sent means
// guessing what it would have meant, and the unknown branch is the honest answer to a spelling
// nobody has ever seen.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// FINDING F-3, SETTLED HERE — `Expired` AND `Abandoned` RETURN THE ROW TO THE UNVERIFIED STATE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// D-261 rules on `Approved` and D-262 rules on `Declined`. Three further statuses had no decision at
// all, and this module is where they get one. It is a RULING, so the argument lives here rather than
// only in a planning file a future reader will not have open.
//
// `Expired` (the link was never opened before the session's TTL elapsed) and `Abandoned` (the host
// started and never finished) both mean the same thing: NOBODY CHECKED. Three reasons the row goes
// back to the unverified state rather than staying pending:
//
//   1. IT IS THE HONEST STATE. `pending` asserts that a check is running. After an expiry there is
//      no session left to answer — the vendor reuses UNFINISHED sessions only, never finished ones
//      (ADDENDUM A3) — so "waiting on the result" would be a claim about something that no longer
//      exists.
//   2. IT CLEARS A ROW NOBODY WILL EVER DECIDE. `host_verification_queue_idx` is partial over the
//      pending rows, so an expired session is permanent ops-queue pollution: a row sitting in front
//      of operators who have no decision to make about it and, under D-263, no path into it either.
//   3. ⚠ IT IS WHAT MAKES THE `/host/verify` PENDING PANEL HONEST. That panel tells the host their
//      check is with the checking partner and that FitOut is waiting on the result, and it offers NO
//      WAY OUT — deliberately, because the hosted-flow URL is a redirect target carrying a session
//      token and is not storable (the four-field contract in `port.ts`). That copy is a true
//      sentence only while an expired session RELEASES the row. If it stayed pending, a host who
//      closed the tab would read, forever, a sentence about a session that will never answer.
//      18.1-UI-SPEC records this as the one place its honesty depends on a decision it does not own.
//      This is that decision, and the test file pins it by name in both directions.
//
// THE COOLDOWN DOES NOT APPLY, AND THAT IS DELIBERATE. D-264's 24-hour wait is derived from
// `host_verification.updated_at` and gates a REJECTED host. A released row is unverified, not
// rejected, so the host may start again at once — nobody judged them, and making them wait would
// punish a dropped connection as though it were a failed check.
//
// `In Review` STAYS PENDING, and the distinction is the whole ruling. Didit flagged that session for
// THEIR OWN compliance reviewer, so a check genuinely is still running and a further status event is
// expected. It is not a FitOut decision, D-263 gives FitOut no operator path into it, and the row is
// therefore exactly what pending means. An audit row is asked for so the state is observable rather
// than merely true.
//
// `Kyc Expired` MOVES NOTHING and asks for an audit row. It is unreachable while no KYC expiration
// policy is configured, and ADDENDUM B7 confirms first-hand that the account carries no such field
// at all. If one ever arrives it means the Console changed underneath FitOut — and un-approving a
// live host on it would flip the sell gate across a live catalogue with no operator signal. The
// audit row IS the signal; the state change is a decision a person makes afterwards.
//
// `Awaiting User` MOVES NOTHING and asks for an audit row, for the same shape of reason: it belongs
// to a KYB parent session waiting on a sub-session, FitOut runs no KYB workflow, and ADDENDUM A6
// says to refuse it exactly as an unknown status rather than to invent a state for it.
//
// ⚠ `Resubmitted` IS NOT A VERDICT, AND READING IT AS ONE THROWS. ADDENDUM A6: that status carries
// resubmission instructions INSTEAD of a decision object. A mapper that reached for the decision
// unconditionally would throw on the one status that means "the host is still working". It moves
// nothing, it asks for no audit row (the check is genuinely in flight), and the outcome below says
// in a field that no decision object is expected — so a caller never has to know the exception.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ D-272 — WHAT THIS MODULE MAY NEVER TELL A HOST
// ════════════════════════════════════════════════════════════════════════════════════════════════
// The vendor account allows 7 attempts per 7 days, raised deliberately so the vendor can never
// refuse before FitOut's own 24-hour cooldown does. But the PER-MODULE caps are LOWER and were
// deliberately NOT raised: two document attempts, three liveness attempts, three face-match
// attempts. Those bound retries WITHIN ONE SESSION, not sessions per week.
//
// So a host can exhaust one session's document attempts while still holding most of their weekly
// allowance. NO SENTENCE THIS MODULE COMPOSES MAY SAY OR IMPLY THAT THEY HAVE NO TRIES LEFT — it
// would be false, and it would send a host who could simply start again looking for a support
// address that D-263 says does not exist. The mechanism is the allow-list further down: an
// attempts-exhausted risk code is not on it, so its sentence never reaches a host, and no
// replacement sentence is written here. D-264 owns what a host is told about retrying, and it says
// it with a timestamp.

import { composeReason, HOST_REJECT_REASONS, REJECT_NOTE_MAX } from "@/lib/validation/ops";

/**
 * The ten session statuses Didit documents, in the vendor's own spelling and their own order of
 * introduction. Transcribed from 18.1-RESEARCH § ADDENDUM A6, which is the vendor's COMPLETE
 * enumeration — two longer than the table in the research body, and both of the extras
 * (`Awaiting User`, `Resubmitted`) turned out to matter to FINDING F-3.
 *
 * ⚠ THIS TUPLE IS HALF OF A CENSUS, NOT A LIST. The outcome table below is a total `Record` over the
 * union derived from it, so adding a member here without deciding what it does is a compile error;
 * `tests/verification/didit-verdict.test.ts` supplies the other half by asserting its own table's
 * length against this one, so adding a member without RECORDING the decision is a red test. See the
 * header for why `tsc` cannot do this on its own.
 */
export const DIDIT_STATUSES = [
  "Not Started",
  "In Progress",
  "Awaiting User",
  "In Review",
  "Approved",
  "Declined",
  "Resubmitted",
  "Abandoned",
  "Expired",
  "Kyc Expired",
] as const;

/** One of the ten vendor spellings above. Deliberately NOT `host_verification.status`. */
export type DiditStatus = (typeof DIDIT_STATUSES)[number];

/**
 * WHAT THE ROW SHOULD DO — described, never done.
 *
 * - `approve`             — D-261. The host is approved, the check passed, and the decision instant
 *                           is stamped. No operator confirms a pass.
 * - `reject`              — D-262. The host is rejected, the check failed, and a host-readable
 *                           reason is composed from the vendor's own allow-listed sentences (D-265).
 *                           No operator confirms a fail either; that was decided against the SWE
 *                           recommendation, with the consequence accepted at decision time, and it
 *                           is implemented as decided rather than softened into "queue the fails".
 * - `reset-to-unverified` — FINDING F-3. Nobody checked, so the row returns to the state that says
 *                           exactly that, and the host gets their control back.
 * - `none`                — nothing moves. Either the check is genuinely still running, or the
 *                           status is one FitOut must not act on without a person.
 */
export type DiditTransition = "approve" | "reject" | "reset-to-unverified" | "none";

/**
 * The discriminated answer this module returns. It is a DESCRIPTION of a transition, so that the one
 * module allowed to write (`apply-verdict.ts`) can be the only place a row actually moves.
 */
export type DiditStatusOutcome = {
  /** What the row should do. */
  readonly transition: DiditTransition;
  /**
   * The canonical vendor spelling this input resolved to, or `null` when it resolved to nothing.
   * `null` is the fail-closed marker: it is the ONLY value that means "Didit said something FitOut
   * has never heard of", and it can never accompany a transition other than `none`.
   */
  readonly status: DiditStatus | null;
  /**
   * Whether an audit row must be written. TRUE for every real transition and for every status that
   * moves nothing for a REASON somebody should be able to see later — an unreachable status, a
   * vendor-side review, an unrecognised string. FALSE only for the three statuses that mean the host
   * is mid-flow: writing a trail row every time a session pings would bury the rows that matter.
   */
  readonly audit: boolean;
  /**
   * Whether a payload carrying this status is expected to carry a decision object at all.
   *
   * ⚠ THIS FIELD EXISTS BECAUSE OF ONE STATUS. `Resubmitted` carries resubmission instructions
   * INSTEAD of a decision (ADDENDUM A6), so a caller that reached for the decision on every status
   * would throw on the one that means "the host is still working". A caller reads this instead of
   * knowing the exception.
   */
  readonly carriesDecision: boolean;
  /**
   * ⚠ FOR AN OPERATOR AND FOR AN AUDIT ROW — NEVER FOR A HOST. It explains what the vendor's status
   * means and what FitOut decided about it. Host-facing copy is 18.1-UI-SPEC's, the rejection
   * sentence is `composeDiditRejectReason`'s, and neither is this.
   */
  readonly operatorNote: string;
};

/**
 * THE RULING TABLE. Total over the ten, so a status added to the tuple without a decision here is a
 * compile error rather than a silent fall-through into the unknown branch.
 *
 * Every row's reasoning is in the header: D-261 for the approval, D-262 for the rejection, FINDING
 * F-3 for the two that release the row and for the three that hold it, ADDENDUM A6 for the two the
 * research body never recorded.
 */
const STATUS_OUTCOMES: Readonly<Record<DiditStatus, DiditStatusOutcome>> = {
  "Not Started": {
    transition: "none",
    status: "Not Started",
    audit: false,
    carriesDecision: false,
    operatorNote:
      "The session exists and the host has not opened the hosted flow yet. Nothing has been decided.",
  },
  "In Progress": {
    transition: "none",
    status: "In Progress",
    audit: false,
    carriesDecision: false,
    operatorNote: "The host is part-way through the hosted flow. Nothing has been decided.",
  },
  "Awaiting User": {
    transition: "none",
    status: "Awaiting User",
    audit: true,
    carriesDecision: false,
    operatorNote:
      "Unreachable: this status belongs to a KYB parent session waiting on a sub-session, and " +
      "FitOut runs no KYB workflow. Refused exactly as an unrecognised status, with a trail row, " +
      "rather than given a state of its own.",
  },
  "In Review": {
    transition: "none",
    status: "In Review",
    audit: true,
    carriesDecision: true,
    operatorNote:
      "The vendor flagged this session for THEIR OWN compliance reviewer, so a check really is " +
      "still running and a further status event is expected. It is not a FitOut decision and there " +
      "is no FitOut operator path into it (D-263), so the row stays where it is.",
  },
  Approved: {
    transition: "approve",
    status: "Approved",
    audit: true,
    carriesDecision: true,
    operatorNote: "The check passed and the host is approved automatically (D-261).",
  },
  Declined: {
    transition: "reject",
    status: "Declined",
    audit: true,
    carriesDecision: true,
    operatorNote:
      "The check failed and the host is rejected automatically (D-262). The host-readable reason " +
      "is composed from the vendor's own allow-listed sentences (D-265).",
  },
  Resubmitted: {
    transition: "none",
    status: "Resubmitted",
    audit: false,
    carriesDecision: false,
    operatorNote:
      "The host is redoing flagged steps. Not a verdict — this status carries resubmission " +
      "instructions instead of a decision object (ADDENDUM A6), so nothing may be read out of it.",
  },
  Abandoned: {
    transition: "reset-to-unverified",
    status: "Abandoned",
    audit: true,
    carriesDecision: true,
    operatorNote:
      "The host started the hosted flow and never finished it. FINDING F-3: nobody checked, so the " +
      "row returns to the unverified state and the host gets their control back. No cooldown — the " +
      "row is not rejected.",
  },
  Expired: {
    transition: "reset-to-unverified",
    status: "Expired",
    audit: true,
    carriesDecision: false,
    operatorNote:
      "The session's TTL elapsed before the link was opened. FINDING F-3: nobody checked, so the " +
      "row returns to the unverified state and the host gets their control back. No cooldown — the " +
      "row is not rejected.",
  },
  "Kyc Expired": {
    transition: "none",
    status: "Kyc Expired",
    audit: true,
    carriesDecision: true,
    operatorNote:
      "Unreachable while no KYC expiration policy is configured, and the account carries no such " +
      "field at all (ADDENDUM B7). Arriving anyway means the vendor Console changed underneath " +
      "FitOut; un-approving a live host on it would flip the sell gate across a live catalogue with " +
      "no operator signal, so this writes a trail row and moves nothing.",
  },
};

/**
 * THE FAIL-CLOSED ANSWER, and the only outcome carrying `status: null`.
 *
 * Never permissive, never approve, never a "probably fine" default — `port.ts`'s property 2 one
 * module along. An eleventh vendor status, a typo, a truncated string and a hostile one all land
 * here, and every one of them leaves the row exactly where it was with a trail row asking a person
 * to look.
 */
const UNKNOWN_STATUS_OUTCOME: DiditStatusOutcome = {
  transition: "none",
  status: null,
  audit: true,
  carriesDecision: false,
  operatorNote:
    "Didit sent a session status FitOut does not recognise. Nothing was moved. Either the vendor " +
    "added a status or something is wrong with the delivery; a person decides, never this module.",
};

/**
 * Normalise ONCE, at the top — `toDate`'s discipline (`review-queue.ts:196-218`) applied to the
 * casing hazard the header describes.
 *
 * Case-folded and whitespace-collapsed, and nothing else. A non-string input (a body with no status
 * at all, or a status that arrived as a number) normalises to the empty string, which resolves to
 * nothing: an absent status is not a verdict.
 */
function normaliseStatus(raw: string | null | undefined): string {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\s+/g, " ").toUpperCase();
}

/**
 * The normalised-spelling index, derived FROM the tuple so the two can never disagree. Building it
 * by hand would be a second list to keep in step with the first, which is the drift this whole file
 * is arranged to prevent.
 */
const STATUS_BY_NORMALISED: Readonly<Record<string, DiditStatus>> = Object.fromEntries(
  DIDIT_STATUSES.map((status) => [normaliseStatus(status), status] as const),
);

/**
 * Turn a vendor status string into the transition FitOut should make. THE one translation: the
 * webhook and the reconciliation sweep both come through here, and neither may re-derive a status of
 * its own.
 *
 * ⚠ `Object.hasOwn` IS LOAD-BEARING, exactly as it is at `port.ts`'s registry. The status arrives
 * from a vendor payload and reaches an object lookup, and a bare index on an object literal answers
 * TRUTHILY for `constructor`, `toString`, `valueOf` and `__proto__` — inherited members that are not
 * statuses at all. The own-property check is the difference between a lookup that fails closed and
 * one that fails closed only for the names somebody thought to try; the test sweeps all four.
 */
export function mapDiditStatus(raw: string | null | undefined): DiditStatusOutcome {
  const key = normaliseStatus(raw);
  if (key === "") return UNKNOWN_STATUS_OUTCOME;
  if (!Object.hasOwn(STATUS_BY_NORMALISED, key)) return UNKNOWN_STATUS_OUTCOME;
  return STATUS_OUTCOMES[STATUS_BY_NORMALISED[key]];
}

/**
 * ONE warning off a feature report, narrowed to the THREE fields FitOut is allowed to look at.
 *
 * ⚠ THE TYPE IS THE EXCLUSION, AND THAT IS DELIBERATE. A vendor warning also carries a
 * `long_description` and an `additional_data` object holding the detector's score and its threshold.
 * Neither is modelled here, because a field that is not on the type cannot be read by accident, and
 * the threshold pair is a tuning oracle handed to whoever is probing (T-18.1-0602). The three fields
 * below are: which log level fired, which code fired, and the vendor's own end-user phrasing.
 *
 * Every field is `unknown` rather than `string`, because all of this arrives from outside FitOut and
 * a declared type is documentation rather than a runtime guarantee. The composer narrows each one
 * before it is used.
 */
export type DiditWarning = {
  /** `"error"` | `"warning"` | `"information"`. ONLY an error caused the decline. */
  readonly log_type?: unknown;
  /** The stable vendor risk code. It SELECTS; it is never rendered and never stored. */
  readonly risk?: unknown;
  /** The vendor's 2–5 word end-user phrasing — the only field that may ever reach a host. */
  readonly short_description?: unknown;
};

/**
 * One feature report inside a decision. V3 returns these in PLURAL ARRAYS, one array per feature,
 * each item carrying its own identity and its own feature-level status, and an array is `null` until
 * that feature has run (ADDENDUM A8).
 *
 * ⚠ `node_id` IS THE REPORT'S IDENTITY AND IS READ BY NOTHING HERE. It is modelled so the shape is
 * honest and so a later reader who needs a SPECIFIC report locates it by that identity — never by
 * one of the V2 singular keys, which ship only for a destination pinned to the older webhook version
 * and are `undefined` on ours. An undefined block reads as "not approved", which would reject every
 * host (Pitfall 2). It is never rendered and never stored: it means nothing to a person and it is
 * vendor-internal (T-18.1-0601).
 */
export type DiditFeatureReport = {
  readonly node_id?: unknown;
  readonly status?: unknown;
  readonly warnings?: readonly DiditWarning[] | null;
};

/**
 * A Didit decision, narrowed to the three feature families FitOut's workflow actually runs — OCR,
 * liveness and face match. The vendor also returns AML and NFC blocks; both are switched off on the
 * account and confirmed off first-hand (ADDENDUM B7), so modelling them would describe a workflow
 * FitOut deliberately does not run.
 *
 * ⚠ PLURAL, ALWAYS. The singular V2 spellings are absent from this type on purpose.
 */
export type DiditDecision = {
  readonly id_verifications?: readonly DiditFeatureReport[] | null;
  readonly liveness_checks?: readonly DiditFeatureReport[] | null;
  readonly face_matches?: readonly DiditFeatureReport[] | null;
};

/**
 * THE ALLOW-LIST — declared, never inferred, never a deny-list.
 *
 * `refund-rail.ts`'s `REFUNDABLE_RAILS` is the shape: a short, explicit set of things that are known
 * to be safe, so anything unlisted fails to the safe side by construction. A deny-list would invert
 * that — the 47 documented ID-verification codes are only one of six taxonomies, the vendor adds to
 * them, and every code nobody thought to ban would reach a host the day it ships.
 *
 * THREE DISTINCT REASONS A CODE IS OFF THIS LIST, each with a named example, so the next person
 * extending it has a test rather than a vibe:
 *
 *   1. ACCUSATORY / ANTI-FRAUD — naming the detector that fired is a tuning oracle handed to the
 *      person most motivated to tune against it. `SCREEN_CAPTURE_DETECTED`, `PRINTED_COPY_DETECTED`,
 *      `PORTRAIT_MANIPULATION_DETECTED`, `ID_DOCUMENT_IN_BLOCKLIST` and `LOW_LIVENESS_SCORE` are all
 *      off the list for this reason. So is the score/threshold pair that would accompany them, which
 *      is excluded structurally by not being on `DiditWarning` at all.
 *   2. IT ASSERTS A FACT ABOUT ANOTHER FITOUT ACCOUNT — `POSSIBLE_DUPLICATED_USER` ("another
 *      document in your application has matching date of birth, issuing country and name") and
 *      `DOCUMENT_NAME_DIFFERENT_FROM_OTHER_APPROVED_DOCUMENTS` both tell one host something about a
 *      different host. Rendering either is a D-72 privacy breach, not a copy problem, and the two
 *      are excluded BY NAME here so a later reader cannot add them without reading this line.
 *   3. MEANINGLESS TO A PERSON — `MRZ_VALIDATION_FAILED`, `BARCODE_SIGNATURE_INVALID`,
 *      `QR_VALIDATION_FAILED` and `UNPARSED_ADDRESS` are true, unactionable and confusing. A host
 *      who reads them learns nothing they can do, which is worse than the canned sentence.
 *
 * ⚠ AND A FOURTH EXCLUSION THIS PHASE ADDS, WHICH IS NOT ABOUT SAFETY BUT ABOUT TRUTH. A code
 * meaning "you have used up this module's attempts" is NOT on the list. Per D-272 the per-module
 * caps (two document attempts, three liveness, three face match) bound retries within ONE session,
 * while the host's weekly allowance is seven — so a sentence about attempts being exhausted would be
 * FALSE at the moment a host reads it. See the D-272 block in the header.
 *
 * The values are `true` rather than a description because the list is a MEMBERSHIP test and nothing
 * else: what a host reads is the vendor's own `short_description`, never anything written here.
 * 18.1-RESEARCH § R3 § Which ones are safe to show a host verbatim is where the thirteen came from.
 */
export const DIDIT_SAFE_RISKS: Readonly<Record<string, true>> = {
  DOCUMENT_EXPIRED: true,
  IMAGE_TOO_BLURRY: true,
  IMAGE_TOO_DARK: true,
  IMAGE_TOO_BRIGHT: true,
  COULD_NOT_RECOGNIZE_DOCUMENT: true,
  COULD_NOT_DETECT_DOCUMENT_TYPE: true,
  DOCUMENT_NOT_SUPPORTED_FOR_APPLICATION: true,
  PORTRAIT_IMAGE_NOT_DETECTED: true,
  NAME_NOT_DETECTED: true,
  DATE_OF_BIRTH_NOT_DETECTED: true,
  DOCUMENT_NUMBER_NOT_DETECTED: true,
  EXPIRATION_DATE_NOT_DETECTED: true,
  DOCUMENT_SIDES_MISMATCH: true,
};

/**
 * Every feature report in a decision, in one flat list. Reads the PLURAL arrays and nothing else;
 * an absent or `null` block contributes nothing rather than throwing, because a block is `null`
 * until its feature has run and a decline can arrive before every feature did.
 */
function featureReports(decision: DiditDecision | null | undefined): readonly DiditFeatureReport[] {
  if (decision == null) return [];
  return [decision.id_verifications, decision.liveness_checks, decision.face_matches].flatMap(
    (block) => (Array.isArray(block) ? block : []),
  );
}

/**
 * THE HOST-READABLE REJECTION SENTENCE (D-265) — bounded, escaped by the renderer, and never empty.
 *
 * There is no operator behind an auto-reject, so the explanation has to come from the vendor. It
 * arrives through four gates, none of which is a translator:
 *
 *   1. ONLY AN ERROR. A `warning` or an `information` log did not cause the decline; keeping one
 *      would tell a host that something they cannot act on is the reason they were refused.
 *   2. ONLY AN ALLOW-LISTED CODE, via `Object.hasOwn` — see `DIDIT_SAFE_RISKS` for the four reasons
 *      a code is excluded, and see the header for the prototype-shaped names a bare index would
 *      answer truthily for.
 *   3. BOUNDED IN THE NOTE SLOT. The kept sentences are joined and sliced to `REJECT_NOTE_MAX`, the
 *      same 280 characters an operator's free text is bounded by. ⚠ That ceiling is on the NOTE, not
 *      on the whole stored string: `composeReason` prepends the product sentence, exactly as a
 *      rejection an operator writes composes today.
 *   4. NEVER EMPTY. `HOST_REJECT_REASONS[0]` IS the canned fallback D-265 asks for — when nothing
 *      survives the allow-list `composeReason` returns that product sentence alone, which is the
 *      identical behaviour `appendOperatorSentence` already gives for a null operator note
 *      (`src/lib/listing/review-signal.ts:227-230`). No new fallback string is invented and none
 *      should be: a second sentence meaning the same thing is a second thing to keep true.
 *
 * ⚠ NOTHING IS SANITISED HERE, DELIBERATELY. `src/lib/validation/ops.ts:30-40` states the rule this
 * follows — the stored string leaves through the same escaped React text-node path an operator's
 * sentence already takes (T-18-1301), React's one raw-HTML escape hatch occurs nowhere in `src/`,
 * and a half-sanitiser is worse than none because it reads like the problem was handled. Bound it
 * and allow-list it; do not "clean" it.
 *
 * The only shaping applied is punctuation BETWEEN vendor fragments: the sentences are 2–5 word
 * phrases with no terminal stop, and running two of them together would produce a sentence FitOut
 * never wrote and cannot read aloud. Joining them with a full stop is typography, not copy.
 */
export function composeDiditRejectReason(decision: DiditDecision | null | undefined): string {
  const kept: string[] = [];

  for (const report of featureReports(decision)) {
    const warnings = Array.isArray(report?.warnings) ? report.warnings : [];
    for (const warning of warnings) {
      if (warning == null) continue;
      if (warning.log_type !== "error") continue;

      const risk = warning.risk;
      if (typeof risk !== "string") continue;
      if (!Object.hasOwn(DIDIT_SAFE_RISKS, risk)) continue;

      const sentence =
        typeof warning.short_description === "string"
          ? warning.short_description.trim().replace(/\.+$/, "")
          : "";
      if (sentence === "") continue;
      // The same feature can warn twice across two reports; a host reading one sentence twice would
      // read it as a bug in FitOut rather than as two findings.
      if (kept.includes(sentence)) continue;

      kept.push(sentence);
    }
  }

  const note = kept.length === 0 ? "" : `${kept.join(". ")}.`;
  return composeReason(HOST_REJECT_REASONS[0], note.slice(0, REJECT_NOTE_MAX).trim());
}
