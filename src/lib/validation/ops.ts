// Ops-console input validation (Zod 4) — the schemas every ops server action RE-PARSES.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS AT ALL: SERVER-ACTION ARGUMENT TYPES ARE NOT ENFORCED AT RUNTIME
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `src/app/actions/cancel-booking.ts:1101-1105` states it in the shipped precedent's own words:
// re-validate every field that crosses the boundary, because "a crafted reason string would
// otherwise land verbatim in an audit row and a durable column." A `"use server"` export is
// reachable by POST regardless of what UI exists — Next's own docs say to treat Server Actions with
// the same security considerations as public-facing API endpoints — so the TypeScript signature is
// documentation, not a gate.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE REJECTION REASON IS THIS PHASE'S HIGHEST-RISK INPUT FIELD (18-RESEARCH § Security Domain)
// ════════════════════════════════════════════════════════════════════════════════════════════════
// It is free text an operator types, that lands in a DURABLE COLUMN the host reads and in an
// OUTBOUND EMAIL. Four things bound it, and each closes a different failure:
//
//   1. A CLOSED TAXONOMY, not a bare textarea. The reason is `z.enum` over the sentences below; a
//      value outside the set is a calm denial. This is the same choice `hostCancelReasons`
//      (src/lib/validation/cancellation.ts:40-51) made and for the identical stated reason: "an open
//      string would be an unbounded value landing in an audit row and a durable column".
//   2. WHAT IS STORED IS THE SENTENCE, NEVER AN ID TO JOIN AT READ TIME. `schema.ts`'s notification
//      rule — STORE DISPLAY STRINGS, NEVER IDS TO JOIN AT READ TIME — applies with extra force here:
//      a host has READ this sentence. If a later re-wording silently re-rendered the rejection they
//      were shown, the record of what they were told would be retroactively false.
//   3. `.max(280)` ON THE FREE-TEXT NOTE, re-validated server-side. Long enough for a real
//      explanation inside a paragraph of an email; short enough that the field cannot become a
//      document. The client's `maxLength` is a courtesy, not the bound.
//   4. NO SANITISATION, DELIBERATELY. The value is stored exactly as typed and rendered as REACT
//      TEXT, never through React's one raw-HTML escape hatch — which occurs ZERO times anywhere in
//      `src/`, asserted over comment-stripped source in tests/ops/reject-reason.test.ts case 10.
//      (The hatch's NAME is deliberately not spelled here: an acceptance grep counts its occurrences
//      in `src/`, and the paragraph forbidding it must not be what makes the count non-zero —
//      drizzle/0021's rule, the same one this file's sibling `cancellation.ts:16-19` states.)
//      Stripping or escaping here would corrupt an operator's
//      sentence — an apostrophe, an ampersand, a `<` in "under <10 people" — while buying nothing:
//      the escaping that matters happens at render, in JSX and in the email template, and both are
//      already covered by shipped tests. A half-sanitiser is worse than none, because it reads like
//      the problem was handled.
//
// ⚠ AND THE NOTE NEVER GOES INTO `audit.meta` (D-72). `meta` is a durable jsonb column under an
// explicit no-secrets/no-PII rule; an operator's free text can contain anything they typed about a
// person. The taxonomy SENTENCE is an enum value and may go there; the note stays in the domain
// column, which is where the host reads it from anyway.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE SENTENCES ARE A CONTRACT WITH 18-UI-SPEC § The reject dialog, TRANSCRIBED VERBATIM
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Complete, host-readable sentences — not codes, not fragments. If a sentence changes here it
// changes what a host is told, so it is a copy decision and belongs in the UI spec first.

import { z } from "zod";

/**
 * A hard bound on any id crossing this boundary. FitOut ids are app-generated UUIDs (36 chars) or
 * Better Auth ids; 128 is comfortably above every real one. The bound is not cosmetic: an unbounded
 * id becomes a rate-limiter key and an audit-meta value, and `src/lib/rate-limit.ts:36-40` records
 * why a caller-chosen unbounded key space is memory exhaustion against the whole process.
 *
 * EXPORTED SINCE PLAN 18.1-13, and the export is what keeps the bound single-owned. The ops CONTACT
 * REVEAL (`src/app/actions/ops-contact.ts`, OPS-06) parses a host id across the same boundary for the
 * same two reasons — the value becomes a rate-limiter key and an audit-meta value — but it cannot
 * live in this file's schema list, because its own module declares it beside an action whose result
 * carries PII. A second `128` typed in that file would be the drift this repository spends whole
 * headers preventing: one number, one owner, read by both. `REJECT_NOTE_MAX` above is exported for
 * exactly this reason and states it in `src/lib/rate-limit.ts:63`'s words — a test (or a sibling
 * module) should assert against the REAL number rather than against a copy that could drift from it.
 */
export const ID_MAX = 128;
const id = () => z.string().min(1).max(ID_MAX);

/** The free-text note's ceiling. See point 3 in the header. */
export const REJECT_NOTE_MAX = 280;

/**
 * The one member of BOTH taxonomies that makes the note REQUIRED. Declared once so the two lists
 * and the refinement cannot drift onto three slightly different spellings of the same sentence.
 */
export const OTHER_REASON = "Something else (explain below)." as const;

/** 18-UI-SPEC § The reject dialog — the LISTING column, verbatim. */
export const LISTING_REJECT_REASONS = [
  "The photos don't show the space being listed.",
  "The address or location doesn't match the space.",
  "The space type, capacity or price is wrong or misleading.",
  "We couldn't confirm this space is real.",
  "This listing breaks FitOut's terms.",
  OTHER_REASON,
] as const;

/** 18-UI-SPEC § The reject dialog — the HOST column, verbatim. Also the suspension taxonomy (D-243). */
export const HOST_REJECT_REASONS = [
  "We couldn't confirm who this account belongs to.",
  "The account details don't match the space being listed.",
  "This account breaks FitOut's terms.",
  OTHER_REASON,
] as const;

export type ListingRejectReason = (typeof LISTING_REJECT_REASONS)[number];
export type HostRejectReason = (typeof HOST_REJECT_REASONS)[number];

/**
 * The note field. `.max` is applied to the RAW string, before any trim, because the raw string is
 * what crossed the boundary and what a bound is supposed to bound — trimming first would let 400
 * spaces plus 280 characters through a 280-character limit.
 */
const note = z.string().max(REJECT_NOTE_MAX).optional();

/** True when the chosen sentence obliges the operator to write something. */
const noteSatisfied = (d: { reason: string; note?: string }): boolean =>
  d.reason !== OTHER_REASON || (d.note?.trim().length ?? 0) > 0;

const NOTE_REQUIRED = {
  message: `Choosing "${OTHER_REASON}" means the note is the whole explanation, so it cannot be empty.`,
  // NOT `as const`: Zod 4 types `path` as a MUTABLE `PropertyKey[]`, so a readonly tuple is a
  // compile error at every `.refine` site. Built fresh per call for the same reason a shared mutable
  // array would be a hazard — nothing here may hand three schemas one array they could each mutate.
  get path(): PropertyKey[] {
    return ["note"];
  },
};

export const approveHostSchema = z.object({ userId: id() });

export const rejectHostSchema = z
  .object({ userId: id(), reason: z.enum(HOST_REJECT_REASONS), note })
  .refine(noteSatisfied, NOTE_REQUIRED);

/**
 * Suspension shares the HOST taxonomy, and that is a decision rather than reuse-by-convenience:
 * D-243 says a suspended host IS told, with the reason, on exactly the principle OPS-05 already
 * applies to a rejection. Two taxonomies for the same audience would mean two vocabularies for
 * "why FitOut acted", and the host cannot tell which lever was pulled from the sentence anyway.
 */
export const suspendHostSchema = z
  .object({ userId: id(), reason: z.enum(HOST_REJECT_REASONS), note })
  .refine(noteSatisfied, NOTE_REQUIRED);

export const approveListingSchema = z.object({ listingId: id() });

export const rejectListingSchema = z
  .object({ listingId: id(), reason: z.enum(LISTING_REJECT_REASONS), note })
  .refine(noteSatisfied, NOTE_REQUIRED);

/**
 * D-233 — THE TWO ENFORCEMENT LEVERS, AND THE ORDER IS THE DEFAULT.
 *
 * `block_new_only` is FIRST and is the schema default, because 18-UI-SPEC requires the lighter lever to
 * be the one checked on mount, every time. Declaring the default as `LEVERS[0]` rather than repeating
 * the string means the two cannot drift onto different answers, and re-ordering this array to put the
 * escalation first would be a visible, reviewable change rather than a silent one.
 *
 * The escalation is `block_new_and_cancel`: it cancels the confirmed bookings and refunds the bookers.
 * It is never the default and it is never implied — see `opsCancelSchema` below.
 */
export const OPS_ENFORCEMENT_LEVERS = ["block_new_only", "block_new_and_cancel"] as const;

/** The LIGHTER lever. Checked on mount, and what an omitted field parses to. */
export const OPS_DEFAULT_LEVER = OPS_ENFORCEMENT_LEVERS[0];

export type OpsEnforcementLever = (typeof OPS_ENFORCEMENT_LEVERS)[number];

/**
 * ENF-03 — the ops cancel-and-refund argument shape.
 *
 * BOTH IDS, and that is not redundancy. The BOOKING is what gets cancelled; the LISTING is what is
 * being enforced against, and it is re-asserted inside the action's own `WHERE` so a booking id from a
 * different listing cannot be smuggled into an enforcement decision made about this one. The host-cancel
 * path solves the same problem with an ownership `EXISTS`; an ops actor owns nothing, so the scope has
 * to be the thing the operator was actually looking at.
 *
 * ⚠ `lever` IS RE-PARSED SERVER-SIDE PRECISELY SO THE ESCALATION CANNOT BE REACHED BY DEFAULT.
 * 18-UI-SPEC's answer to "it must not be hit by muscle memory" is that no control on the queue row can
 * cancel-and-refund anything — the operator must open a dialog, choose a reason, and actively move a
 * radio off its default. That is a CLIENT arrangement, and a `"use server"` export is reachable by POST
 * whatever the UI shows. So the action refuses unless the escalation was chosen EXPLICITLY: an omitted
 * `lever` parses to the lighter one and cancels nothing.
 *
 * The reason is the LISTING taxonomy: an ops cancellation is the consequence of a listing rejection, so
 * the sentence the booking carries is the same sentence the listing was rejected with.
 */
export const opsCancelSchema = z
  .object({
    bookingId: id(),
    listingId: id(),
    lever: z.enum(OPS_ENFORCEMENT_LEVERS).default(OPS_DEFAULT_LEVER),
    reason: z.enum(LISTING_REJECT_REASONS),
    note,
  })
  .refine(noteSatisfied, NOTE_REQUIRED);

/** What a CALLER may pass — `lever` optional, because the schema supplies the lighter default. */
export type OpsCancelInput = z.input<typeof opsCancelSchema>;

export type ApproveHostInput = z.infer<typeof approveHostSchema>;
export type RejectHostInput = z.infer<typeof rejectHostSchema>;
export type SuspendHostInput = z.infer<typeof suspendHostSchema>;
export type ApproveListingInput = z.infer<typeof approveListingSchema>;
export type RejectListingInput = z.infer<typeof rejectListingSchema>;

/**
 * THE VALUE THAT GOES IN THE DURABLE COLUMN — the taxonomy sentence, plus the operator's note when
 * there is one, as ONE readable string.
 *
 * One function, so the host-facing surface, the notification and any later reader all read the same
 * bytes. Nothing is escaped or stripped (header point 4); the note is trimmed only because trailing
 * whitespace in a sentence a person reads is noise, never meaning.
 */
export function composeReason(reason: string, noteText?: string | null): string {
  const trimmed = noteText?.trim() ?? "";
  return trimmed.length > 0 ? `${reason} ${trimmed}` : reason;
}
