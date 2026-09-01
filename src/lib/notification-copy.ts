// The ONE expression that turns an OPS-05 decision payload into the sentence a host reads (D-245).
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS IS A MODULE OF ITS OWN AND NOT THREE LINES IN EACH CHANNEL
// ════════════════════════════════════════════════════════════════════════════════════════════════
// The Phase-18 OPS-05 payloads store the body in THREE PARTS — `lead`, the operator's own
// `reasonText`, and `tail` — precisely so the operator's sentence can be stored on its own, asserted
// verbatim, and rendered exactly once. Something has to join them, and that something is read by
// BOTH channels: the in-app panel row (`describeNotification`) and the outbound email
// (`sendOpsDecision`). D-91's whole point is that those two cannot drift.
//
// A join written out twice would compile, lint, pass the suite, and then drift the first time one
// side gained a separator, a line break or an omission rule — the failure mode 18-04 measured on
// `og-facts.ts`: a green compile and a green suite over a live divergence, because THE COMPILER
// COUNTS CALLERS, NOT RESTATEMENTS. So there is one function and both channels CALL it.
//
// ⚠ AND IT LIVES HERE RATHER THAN IN `src/lib/notifications.ts`, WHICH IS THE REASON FOR THE EXTRA
// FILE. `notifications.ts` imports the Inngest client and the Drizzle table objects; the panel
// renderer is in the CLIENT graph (notification-bell.tsx is a client component and imports
// notification-item.tsx). A value-import of `notifications.ts` from there would drag the Inngest SDK
// and the DB layer into the browser bundle. This module imports NOTHING but a type, so both graphs
// can hold it.

/**
 * The three body parts, structurally. Every Phase-18 OPS-05 payload variant is assignable to this:
 * the approvals carry only `lead`, the two rejections carry all three, and `host_suspended` opens
 * with the operator's sentence and therefore has no `lead` at all.
 */
export type OpsDecisionBodyParts = {
  lead?: string;
  /** The operator's stored sentence, verbatim — see `composeReason` in src/lib/validation/ops.ts. */
  reasonText?: string;
  tail?: string;
};

/**
 * Join the parts into the body, in reading order, separated by a single space.
 *
 * An ABSENT or blank part is DROPPED rather than rendered as an empty clause — the CR-01 rule this
 * codebase already applies to a "₱0 fee": a clause with nothing in it must not appear as a clause.
 * That is what lets `host_suspended` open directly with the operator's sentence without a leading
 * space, and it is why the parts are optional rather than empty strings.
 *
 * The operator's sentence is inserted EXACTLY ONCE and is not touched on the way through — no
 * trimming of its interior, no escaping, no re-casing. Escaping happens at RENDER, in JSX (which
 * escapes text children by construction) and at the email shell's one choke point; escaping here
 * would corrupt an ordinary sentence ("classes for under <10 people", "Smith & Sons") while buying
 * nothing. `src/lib/validation/ops.ts` header point 4 states this argument in full.
 */
export function composeOpsDecisionBody(parts: OpsDecisionBodyParts): string {
  return [parts.lead, parts.reasonText, parts.tail]
    .map((part) => part?.trim() ?? "")
    .filter((part) => part.length > 0)
    .join(" ");
}
