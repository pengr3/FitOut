"use server";

// OPS-06 / D-257 (PM-E) / D-271 — THE ONE PLACE A HOST'S CONTACT DETAILS LEAVE FITOUT FOR A PERSON.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS MODULE IS FOR, IN ONE SENTENCE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// An operator working the review queue has a question about a row and needs to reach the person —
// and EVERY reach is on the record. That second half is the requirement. `revealHostContact` returns
// the values AND writes the trail row in the SAME CALL, so there is no shape in which a reveal can
// happen and the record not exist: no branch to forget, no second function a later edit can drop.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ FINDING F-6 — WHY THE VALUES ARE FETCHED HERE INSTEAD OF RIDING THE QUEUE ROW
// ════════════════════════════════════════════════════════════════════════════════════════════════
// 18.1-CONTEXT phrases D-271 as *"adds `email` and `phone` to both branches"* of
// `src/lib/ops/review-queue.ts`, and D-271's OWN warning forbids exactly that: the values must not
// be in the initial RSC payload behind a `hidden` attribute, "that is a reveal with no audit, and
// the payload is readable". Both cannot hold, and this module is where the departure is recorded
// rather than discovered in review.
//
// THE RESOLUTION: what the queue projections need is not the contact VALUES but the affordance's
// INPUTS, and both branches already carry them — `hv.user_id AS "userId"` on the host branch and
// `l.host_id AS "hostId"` on the listing branch. So the projections and their exported types DO NOT
// WIDEN, and the reveal returns a SEPARATE type declared below. That is not merely tidier; it is
// what makes the no-PII-in-the-payload claim STRUCTURAL rather than a comment. `review-queue.ts`'s
// header states the mechanism in one line — *"because the row TYPE has no field for a column,
// re-exporting it is a TYPE ERROR at every consumer"* — so with the projections unchanged there is
// no consumer anywhere that CAN read an email off a queue item, and `tsc` is the thing that says so.
//
// Put the other way round: shipping the two columns on the queue item would put every queued host's
// email and phone into the initial payload of a page every operator loads, for every row, whether or
// not anybody had a question — a hundred disclosures to buy one reach, none of them audited. The
// reveal is one host, one press, one row in the trail.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE ORDER IS LOAD-BEARING — `src/app/actions/ops-review.ts:19-38`'s rule, verb by verb
// ════════════════════════════════════════════════════════════════════════════════════════════════
//   1. THE EXACT OPS HOST+ORIGIN GATE, FIRST. Proxy only routes; this public POST must bind itself to
//      the configured ops authority before even looking at a deliberately supplied session cookie.
//   2. THE STAFF GATE, IMMEDIATELY SECOND. Before the parse and rate limit, so a non-staff caller is
//      refused without consuming anybody's budget or learning whether the id exists. Pinned by the
//      two-stage AST census and the refused-before-any-read behavioral matrix.
//   3. RE-PARSE, bounded. A malformed argument is a calm typed denial with an audited record.
//   4. RATE-LIMIT, keyed on the AUTHENTICATED staff id and never on IP, with the refusal itself
//      audited so a flood is non-repudiable.
//   5. THE READ, explicit columns only.
//   6. THE TRAIL ROW — on the success branch AND on every denial branch.
//
// ⚠ A NON-STAFF CALLER GETS `notFound()`, NEVER A SENTENCE. `requireStaff()` already does that
// (`src/lib/ops/staff.ts:110-114`) and `FORBIDDEN_REFUSALS = ["forbidden","redirect"]` bans the other
// two shapes on this route group: a distinguishable refusal is an existence oracle (D-219).
//
// ⚠ AND `session.cookieCache` STAYS UNCONFIGURED. `requireStaff()` reads the database on every call
// ONLY while it does; turning cookie caching on — an ordinary-looking one-line performance change in
// `src/lib/auth.ts` — would keep a REVOKED staff grant opening this action for the cache TTL, and
// NOTHING WOULD GO RED. `src/lib/ops/staff.ts:33-45` is the module that has to be fixed first. It is
// named here as well because this is the action where that failure costs somebody's phone number.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// D-72 — WHAT THE TRAIL ROW MAY CARRY, AND WHAT IT MAY NEVER
// ════════════════════════════════════════════════════════════════════════════════════════════════
// A reveal audit row records THAT staff member X looked at host Y's contact details, NEVER WHAT THEY
// WERE. `meta` is ids and enum-shaped values only — never the email, never the phone, never an
// address. `audit.meta` is a durable jsonb column under an indefinite retention policy, so writing
// the values into it would turn a trail of who-looked into a second, permanent copy of the very data
// the reveal is rationing. Asserted on the SERIALISED whole row with unmistakable fixture values, so
// a nested value cannot slip through a field a test forgot to check.
//
// ⚠ THE TEST READS THE ROW BACK OUT OF THE TABLE, never off this function's return value:
// `recordAudit` SWALLOWS its own insert failure by design (`src/lib/audit.ts:83-90`), so an `ok`
// return is evidence about the READ and evidence of nothing at all about the trail.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE RESULT SHAPE: CALM TYPED REFUSALS, TWO SENTENCES, AND NOTHING RAISED
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `ops-review.ts:96-120`'s shape, extended by exactly one field on the success arm because this
// action RETURNS values. Every refusal goes through one of the NAMED constants below so two paths
// cannot answer one condition with two slightly different sentences. Both sentences are transcribed
// verbatim from 18.1-UI-SPEC § Surface 4 § The refusal region; a third sentence is a copy decision
// and belongs in that document first.

import { eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { requireOpsMutationOrigin, requireStaff } from "@/lib/ops/staff";
import { rateLimit } from "@/lib/rate-limit";
import { ID_MAX } from "@/lib/validation/ops";

/**
 * WHAT A REVEAL HANDS BACK. Exactly two fields, named EXPLICITLY.
 *
 * `src/lib/ops/review-queue.ts:29-34`'s explicit-columns contract, applied to the one type in the
 * product whose job is to carry PII: because this type has no field for an address, for a document,
 * for an ID number or for anything else on `user`, adding one is a visible edit here rather than a
 * widened `select()` a reviewer has to catch. No address is returned — D-267 keeps the space's
 * address on the listing row the operator is already reading, and D-72 keeps it out of the trail.
 *
 * `user.email` is `notNull().unique()` (`src/lib/db/schema.ts:35`), so there is NO empty case for it
 * and the island needs no fallback string. `user.phone` is nullable (`:48`) and self-declared at
 * submission time (D-268), so `null` is a real state the island renders as "Not provided".
 *
 * ⚠ THIS TYPE IS DELIBERATELY NOT EXPORTED FROM `src/lib/ops/review-queue.ts`, and that is FINDING
 * F-6's whole content — see the header.
 */
export type OpsHostContact = { email: string; phone: string | null };

/** `ops-review.ts:94`'s shape plus the values, because this action is a read rather than a flip. */
export type OpsContactResult =
  | { ok: true; contact: OpsHostContact }
  | { ok: false; error: string };

// ── The named refusals. One constant per condition (see the result-shape note in the header). ────

/**
 * THE READ-FAILED SENTENCE, verbatim from 18.1-UI-SPEC § Surface 4.
 *
 * It covers three conditions on purpose — a malformed argument, a host row that is no longer there,
 * and a read that threw — and the collapse is a property rather than an economy. All three mean the
 * same thing to the operator ("this queue is out of date, reload it"), and a per-condition sentence
 * would tell a caller which ids resolve, which is exactly what the staff gate above spends its
 * position refusing to say.
 */
const CONTACT_UNAVAILABLE: OpsContactResult = {
  ok: false,
  error: "Those contact details couldn't be shown. Reload the queue and try again.",
};

/** The burst guard's sentence, verbatim from the same table. */
const TOO_FAST: OpsContactResult = {
  ok: false,
  error: "Too many contact look-ups at once. Give it a moment and try again.",
};

/** The audited-denial vocabulary. Enum-shaped, because it lands in `audit.meta` (D-72). */
type DenialReason = "invalid_input" | "rate_limit" | "no_such_host" | "read_failed";

/** The one action name this module writes, spelled once so no branch can drift onto a second. */
const AUDIT_ACTION = "ops_reveal_host_contact";

/**
 * THE BUDGET, keyed per AUTHENTICATED staff id.
 *
 * The same 30-per-60s judgement `ops-review.ts:139` records for the five decision verbs, and it is
 * re-stated here rather than imported for a reason worth stating: `ops-review.ts` is a `"use server"`
 * module, and EVERY EXPORT OF ONE IS A NETWORK-REACHABLE POST ENDPOINT — that is the measurement
 * plan 18.1-08 made when `guardedNotify` could not be exported, and it is also why a `"use server"`
 * module may only export async functions at all (`tests/use-server-exports.test.ts`). A shared
 * constant therefore cannot come from there; the alternative is a third module holding one object
 * literal, which buys a file to buy nothing.
 *
 * NOT LOWERED FOR BEING A PII READ, and that is the decision rather than an oversight. An operator
 * clearing a morning's backlog legitimately opens several rows in a minute, and `ops-review.ts:121`
 * states the rule this inherits: a rate limit that fires on correct use is one an operator learns to
 * work around. 30/60s is a look-up every two seconds sustained — far above reading a row and far
 * below the volume a scripted harvest needs to be worth running. What actually rations this surface
 * is the trail: every single one of those 30 is attributable.
 */
const OPS_CONTACT_RATE_LIMIT = { window: 60, max: 30 } as const;

/**
 * The re-parse. `ID_MAX` is IMPORTED, never retyped — see its docblock in
 * `src/lib/validation/ops.ts` for why an unbounded id that becomes a rate-limiter key is memory
 * exhaustion against the whole process (`src/lib/rate-limit.ts:36-40`).
 *
 * ⚠ NO SANITISATION, DELIBERATELY, on `validation/ops.ts:30-40`'s no-half-sanitiser rule. The value
 * is either a real id (it matches a row) or it is not (it matches none); trimming or stripping it
 * would only make a near-miss id resolve, which is the opposite of what a bound is for.
 */
const revealHostContactSchema = z.object({ userId: z.string().min(1).max(ID_MAX) });

export type RevealHostContactInput = z.infer<typeof revealHostContactSchema>;

/**
 * REVEAL one host's contact details to the signed-in operator, and record that it happened (OPS-06).
 *
 * ⚠ A FUNCTION DECLARATION, NOT AN ARROW CONST. `export const revealHostContact = async () => {}` is
 * INVISIBLE to the ops census's AST walk (`exportedFunctions` collects `FunctionDeclaration` nodes
 * only), so that spelling would silently reduce guard coverage while the count still read 7.
 *
 * ⚠ The exact request-authority guard is first and `requireStaff()` is second. The census resolves
 * both bindings through this import, so a locally declared decoy or re-export satisfies nothing.
 */
export async function revealHostContact(
  input: RevealHostContactInput,
): Promise<OpsContactResult> {
  await requireOpsMutationOrigin();
  const staff = await requireStaff();

  const parsed = revealHostContactSchema.safeParse(input);
  if (!parsed.success) {
    // No `userId` in the meta: there is no parsed id to record, and putting the RAW argument in a
    // durable jsonb column is the unbounded-value-in-a-durable-column defect the bound exists for.
    await recordAudit({
      actorId: staff.id,
      action: AUDIT_ACTION,
      outcome: "denied",
      meta: { reason: "invalid_input" satisfies DenialReason },
    });
    return CONTACT_UNAVAILABLE;
  }

  const limit = rateLimit(`ops-reveal-host-contact:${staff.id}`, OPS_CONTACT_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: staff.id,
      action: AUDIT_ACTION,
      outcome: "denied",
      meta: {
        reason: "rate_limit" satisfies DenialReason,
        retryAfter: limit.retryAfter,
        userId: parsed.data.userId,
      },
    });
    return TOO_FAST;
  }

  // ── THE READ. Two columns, named explicitly; nothing else on `user` is selected or returned. ──
  //
  // Wrapped because this action's contract is a calm typed refusal and NOTHING RAISED: a thrown read
  // here would become a 500 in front of an operator, and — the half that matters — it would leave no
  // trail row at all, so the one condition under which a reveal is attempted and the record does not
  // exist would be the condition nobody can see. The catch is what makes the UI-SPEC's read-failed
  // sentence a LIVE path rather than a description of the 0-row branch alone.
  let rows: { email: string; phone: string | null }[];
  try {
    rows = await db
      .select({ email: user.email, phone: user.phone })
      .from(user)
      .where(eq(user.id, parsed.data.userId));
  } catch {
    await recordAudit({
      actorId: staff.id,
      action: AUDIT_ACTION,
      outcome: "denied",
      meta: { reason: "read_failed" satisfies DenialReason, userId: parsed.data.userId },
    });
    return CONTACT_UNAVAILABLE;
  }

  const row = rows[0];
  if (row === undefined) {
    // The row left between the queue being painted and the reveal being pressed. Same sentence as a
    // malformed argument, on purpose — see `CONTACT_UNAVAILABLE`.
    await recordAudit({
      actorId: staff.id,
      action: AUDIT_ACTION,
      outcome: "denied",
      meta: { reason: "no_such_host" satisfies DenialReason, userId: parsed.data.userId },
    });
    return CONTACT_UNAVAILABLE;
  }

  // ⚠ D-72 — IDS ONLY. This row records THAT staff member X looked at host Y's contact details,
  // never WHAT THEY WERE. `row.email` and `row.phone` are in scope on this very line and neither may
  // enter `meta`, now or in any later edit: `audit.meta` is a durable jsonb column under an
  // indefinite retention policy, so a value written here outlives every reason for writing it.
  await recordAudit({
    actorId: staff.id,
    action: AUDIT_ACTION,
    outcome: "ok",
    meta: { userId: parsed.data.userId },
  });

  // The values go back to the island's React state and nowhere else — never into a prop the RSC
  // serialises, which is the property the whole shape exists to hold (see FINDING F-6 above).
  return { ok: true, contact: { email: row.email, phone: row.phone } };
}
