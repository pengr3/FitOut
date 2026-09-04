"use server";

// The FIVE ops decision actions (OPS-03 / OPS-05 / ENF-01 / HVER-01 / D-215/D-216/D-218/D-233).
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS MODULE ENDS
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `src/lib/db/schema.ts` has carried the words "asserted, not authenticated" on `audit.resolved_by`
// since Phase 8, and `scripts/ops-alerts.ts` says in its own header that it has no login. Every
// privileged act FitOut could take against a host or a listing was therefore attributable only to
// whoever typed a `--by` flag. THIS is where that ends: every write below records the id the STAFF
// GATE returned for the signed-in session, and `tests/ops/ops-audit.test.ts` proves it by SELECTing
// the row back out of the table.
//
// ⚠ THE CLI'S ACTOR IS STILL ASSERTED. Retiring `scripts/ops-alerts.ts`'s handle is explicitly out
// of scope (18-CONTEXT § Deferred). What changed is the CONSOLE, which is the surface that will
// carry the volume.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE ORDER IS LOAD-BEARING — cancel-booking.ts:1092-1096's rule, applied verb by verb
// ════════════════════════════════════════════════════════════════════════════════════════════════
//   1. THE STAFF GATE, FIRST. Before any read, before any parse, before the rate limit — so a
//      non-staff caller is refused without consuming anybody's budget and without learning whether
//      the id they guessed exists. Every action gates ITSELF (D-216): the `(ops)` route group is not
//      the gate for a MUTATION, because a Server Action is reachable by POST whatever the UI shows.
//      The layout-level assert (18-01's third layer) wins the HTTP status line and explicitly
//      disclaims being the boundary; this is the boundary.
//   2. RE-PARSE. A malformed argument is a calm typed denial with an audited record, never a raised
//      error — see the note on the result shape below.
//   3. RATE-LIMIT, keyed on the AUTHENTICATED identity and never on IP, and the refusal is itself
//      audited so a flood is non-repudiable.
//   4. THE FLIP, WITH EVERY GUARD IN THE WHERE, so a 0-row result is the SINGLE calm failure path
//      and no two guards can be raced apart. A stale decision (a second reviewer clicking Approve on
//      a row the first already decided) lands here as "no longer applies", never as a silent
//      overwrite of somebody else's decision.
//   5. THE DOMAIN HISTORY ROW.
//   6. THE TRAIL ROW, with `actorId: staff.id`, on BOTH branches.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE RESULT SHAPE: CALM TYPED REFUSALS, AND NOTHING RAISED
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `{ ok: true } | { ok: false, error }` — `src/app/actions/listing.ts:58-60`'s shape. Every refusal
// goes through one of the NAMED constants below so two paths cannot return two slightly different
// sentences for the same condition. Nothing on this path raises: these actions decide whether a
// space can be SOLD and whether a host's payouts freeze, and a raised error becomes a 500 for an
// action that may in fact have committed — the failure mode cancel-booking.ts's post-flip discipline
// block exists to prevent. The one exception is the staff gate itself, which calls `notFound` (a
// framework control-flow signal, not an error path) precisely so a refused caller cannot tell an
// ops route from a route that never existed (D-219).
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// D-233 — TWO LEVERS, AND ONLY ONE OF THEM IS HERE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `suspendHost` is the DEFAULT lever: block-new plus freeze-payouts. It is one column write, because
// D-222 put suspension on the same enum the sell-gate already reads — so it blocks new bookings
// through the SAME gate read as verification, with no second check any code path can forget, and it
// freezes payouts in the sweep (plan 18-07). The cancel-and-refund ESCALATION is a separate action
// in plan 18-08. It is not here, and there is deliberately no stub for it: a stub on a money-moving
// escalation is a thing a later reader can mistake for a wiring bug and "fix".

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import type { NotificationPayload } from "@/lib/db/schema";
import { guardedNotify, notifyAccountOwner } from "@/lib/notification-guard";
import {
  hostApprovedPayload,
  hostRejectedPayload,
  hostSuspendedPayload,
  listingApprovedPayload,
  listingRejectedPayload,
} from "@/lib/notifications";
import { requireStaff } from "@/lib/ops/staff";
import { rateLimit } from "@/lib/rate-limit";
import {
  approveHostSchema,
  approveListingSchema,
  composeReason,
  rejectHostSchema,
  rejectListingSchema,
  suspendHostSchema,
  type ApproveHostInput,
  type ApproveListingInput,
  type RejectHostInput,
  type RejectListingInput,
  type SuspendHostInput,
} from "@/lib/validation/ops";
import { runVerification } from "@/lib/verification/port";
import { MANUAL_PROVIDER_NAME } from "@/lib/verification/providers/manual";

export type OpsActionResult = { ok: true } | { ok: false; error: string };

// ── The named refusals. One constant per condition (see the result-shape note in the header). ────

const OK: OpsActionResult = { ok: true };

const DENIED: OpsActionResult = {
  ok: false,
  error: "That decision couldn't be recorded. Reload the queue and try again.",
};

/** The 0-row branch: somebody else already decided this, or it left the queue while you were reading. */
const STALE: OpsActionResult = {
  ok: false,
  error: "That decision no longer applies — this item has already been decided.",
};

const TOO_FAST: OpsActionResult = {
  ok: false,
  error: "Too many decisions at once. Give it a moment and try again.",
};

/** The fail-closed branch of the verification port. See `opsVerificationProvider` below. */
const PROVIDER_UNAVAILABLE: OpsActionResult = {
  ok: false,
  error: "Verification is unavailable right now, so this decision wasn't recorded.",
};

/**
 * THE OPS BUDGET, keyed per verb per AUTHENTICATED staff id.
 *
 * 30 per 60s, and the number is a judgement about the WORK rather than a copy of another surface's
 * constant. The capability budget is 5/60s (`src/app/actions/capability.ts:52`) because activating
 * hosting is something one account does once; clearing a review queue is the opposite — an approval
 * is ONE PRESS by design (18-UI-SPEC § The decision controls), and an operator working through a
 * morning's backlog can legitimately fire a dozen in a minute. A 5/60s budget would refuse a
 * reviewer doing their job, and a rate limit that fires on correct use is one an operator learns to
 * work around.
 *
 * 30/60s is a decision every two seconds sustained — far above what reading a listing's photos,
 * address and price takes a human, and far below the volume a scripted flood needs to be worth
 * running. PER VERB, so a morning of approvals never eats the budget for the suspension that
 * matters. NEVER keyed on IP: these are session-gated privileged acts, and `src/lib/rate-limit.ts`
 * states the rule at the module.
 */
const OPS_ACTION_RATE_LIMIT = { window: 60, max: 30 } as const;

/**
 * WHICH provider answers the identity question — read at CALL time, from config.
 *
 * This is the "plus a config change" half of D-206's promise: registering a real KYC vendor later is
 * a row in the port's registry and this env var, with no call site touched. Reading it here rather
 * than hardcoding `MANUAL_PROVIDER_NAME` is also what keeps the port's fail-closed branch a LIVE
 * path instead of dead code — a typo in the deploy environment refuses to verify anybody and writes
 * a denied trail row, rather than silently verifying everybody through the wrong adapter.
 *
 * Not a `NEXT_PUBLIC_` read, and it does not need to be: a `"use server"` module never enters a
 * browser bundle, so the `src/lib/payments/fees.ts` hazard (an env read silently resolving to its
 * literal fallback on the client) cannot occur here.
 */
function opsVerificationProvider(): string {
  return process.env.FITOUT_VERIFICATION_PROVIDER || MANUAL_PROVIDER_NAME;
}

/** The audited-denial helper. Every caller passes `actorId: staff.id` explicitly — see below. */
type DenialReason =
  | "invalid_input"
  | "rate_limit"
  | "provider_unregistered"
  | "not_applicable"
  | "history_write_failed"
  | "notify_failed";

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// TELLING THE HOST (OPS-05 / D-245) — A CONSEQUENCE OF A FLIP THAT HAS ALREADY COMMITTED
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-245 settles what OPS-05's "a reason the host is actually told" means: a status a host has to go
// and LOOK FOR is not being told, and the thing being communicated blocks their income. So every
// decision below emits exactly ONE notification, which the shipped Phase-7 fan-out turns into a
// durable in-app row AND an email from the SAME payload (D-86/D-91/D-92) — one function, so the two
// channels cannot drift. The host-surface status (D-230, plan 18-13) is IN ADDITION to this.
//
// ⚠ EVERY EMISSION SITS AFTER THE FLIP AND AFTER THE AUDIT ROW, INSIDE THE POST-FLIP DISCIPLINE.
// The decision has committed: the listing is already (un)sellable, the host's payouts are already
// frozen. Nothing here may unwind that and nothing here may THROW past it, or an operator would get a
// 500 for a decision that in fact succeeded and would press the button again. So the whole thing —
// the recipient lookup AND the emit — is individually guarded, and a failure becomes a
// `needs_attention` row on the established operator-alert channel (D-58/D-90) rather than an error.
//
// `emitNotify` already swallows its own transport errors (MANAGE-03); the guard here is for the
// RECIPIENT LOOKUP, which is a live database read and can fail on its own.
//
// ⚠ THE GUARD AND THE ACCOUNT-OWNER LOOKUP NOW LIVE IN `src/lib/notification-guard.ts` (plan
// 18.1-08). They MOVED — they were not reimplemented — so that the second writer of host standing
// (a Didit verdict arriving by signed webhook, `src/lib/verification/apply-verdict.ts`) reuses the
// identical guarantee instead of replicating it. Behaviour here is unchanged: same statement, same
// swallow, same `needs_attention` row, same `[OPS_REVIEW_ALERT] notify_failed` line. That module's
// header records why exporting them FROM this file was refused — every export of a server-actions
// module is a network-reachable endpoint, and both `tests/design/ops-guard-coverage.test.ts` clauses
// (the staff-gate-first rule and the pinned six-action census) say so structurally.

/** The one ops decision verb per action, reused as the audit `action` on both branches. */
type OpsDecisionAction =
  | "ops_approve_host"
  | "ops_reject_host"
  | "ops_suspend_host"
  | "ops_approve_listing"
  | "ops_reject_listing";

/** This module's operator-alert prefix. Per-DOMAIN, the `[PAYMENT_ALERT]` convention. */
const OPS_ALERT_TAG = "OPS_REVIEW_ALERT";

/**
 * Tell the HOST about a decision on their ACCOUNT — the shared account-owner lookup, bound to this
 * module's verb union and alert tag so a call site reads exactly as it did before the move.
 */
async function notifyHost(
  staffId: string,
  action: OpsDecisionAction,
  userId: string,
  payload: NotificationPayload,
): Promise<void> {
  await notifyAccountOwner(staffId, action, OPS_ALERT_TAG, userId, payload);
}

/**
 * Tell the host about a decision on a LISTING. The recipient and the title the copy names both come
 * from the listing row, so the payload is built from the read rather than before it.
 *
 * Read AFTER the flip rather than folded into the UPDATE's RETURNING, deliberately: the flip's job is
 * to be the single atomic decision with every guard in its WHERE, and widening it to carry a JOIN for
 * a downstream consequence would put a notification concern inside the one statement that must never
 * fail for a notification reason.
 */
async function notifyListingHost(
  staffId: string,
  action: OpsDecisionAction,
  listingId: string,
  build: (listingTitle: string) => NotificationPayload,
): Promise<void> {
  await guardedNotify(staffId, action, OPS_ALERT_TAG, async () => {
    const [row] = (await db.execute(sql`
      SELECT l.host_id AS "hostId",
             COALESCE(NULLIF(l.title, ''), 'Your listing') AS "title",
             u.email AS "email"
      FROM listing l
      JOIN "user" u ON u.id = l.host_id
      WHERE l.id = ${listingId}
    `)) as unknown as { hostId: string; title: string; email: string | null }[];
    if (!row) throw new Error("notify recipient not found");
    // `listing.title` is NULLABLE (required only at publish), and a heading reading "undefined is
    // live" is a worse message than a generic one — so the COALESCE above is copy, not defensive noise.
    return { recipientId: row.hostId, email: row.email, payload: build(row.title) };
  });
}

/**
 * Close the OPEN review cycle for a listing, or open-and-close one if there is none.
 *
 * WHY UPDATE-THE-OPEN-ROW RATHER THAN ALWAYS APPEND. `listing_review.decided_at` is documented at
 * the column as "NULL = still awaiting a decision", so one row IS one submission-and-its-decision.
 * Appending a second row for the decision would double-count every cycle and — because the queue's
 * D-249 clock reads the LATEST `submitted_at` — would silently reset the wait clock of anything
 * that came back to pending later.
 *
 * THE FALLBACK INSERT carries `submitted_at = listing.created_at`, which is byte-identical to the
 * queue's own COALESCE fallback: a listing that reached `pending` without a submission row (a
 * grandfathered row pulled into review before any history existed) is recorded as having waited
 * from the same instant the queue said it was waiting from.
 *
 * ⚠ EVERY LITERAL IS EXPLICITLY CAST. drizzle/0026 measured this the hard way (42804): a bound
 * parameter in a SELECT list resolves as `text`, and `text` does not assignment-cast to an enum.
 * The same statement written with `VALUES` would have worked, which is exactly what makes it a trap.
 */
async function closeReviewCycle(
  listingId: string,
  state: "approved" | "rejected",
  reason: string | null,
  staffId: string,
): Promise<void> {
  const updated = (await db.execute(sql`
    UPDATE listing_review
    SET state = ${state}::listing_review_state,
        reason = ${reason}::text,
        decided_by_staff_id = ${staffId}::text,
        decided_at = now()
    WHERE id = (
      SELECT id FROM listing_review
      WHERE listing_id = ${listingId} AND decided_at IS NULL
      ORDER BY submitted_at DESC
      LIMIT 1
    )
    RETURNING id
  `)) as unknown as { id: string }[];

  if (updated.length > 0) return;

  await db.execute(sql`
    INSERT INTO listing_review
      (id, listing_id, state, reason, decided_by_staff_id, submitted_at, decided_at)
    SELECT ${randomUUID()}::text,
           l.id,
           ${state}::listing_review_state,
           ${reason}::text,
           ${staffId}::text,
           l.created_at,
           now()
    FROM listing l
    WHERE l.id = ${listingId}
  `);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// HOST DECISIONS
// ═════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Approve a host's identity check (HVER-01 / OPS-03).
 *
 * The four verification columns are written from the value the PORT produced, never composed here —
 * that is what makes the ops-manual provider the real write path rather than decoration, and it is
 * the property that makes a later vendor swap a registration instead of a rewrite (D-206).
 *
 * The WHERE admits `unverified` alongside `pending` because both mean "nobody has decided": a row
 * can exist at `unverified` (the fail-closed default) without ever having been submitted, and an
 * operator approving it is making the same decision. It does NOT admit `approved` (already decided),
 * `rejected` or `suspended` (reversing either is a different act with different consequences), or
 * `grandfathered` — D-211 keeps that state first-class and distinct, and quietly promoting it to
 * `approved` would light the badge (D-212) on a host nobody checked.
 */
export async function approveHost(input: ApproveHostInput): Promise<OpsActionResult> {
  const staff = await requireStaff();

  const parsed = approveHostSchema.safeParse(input);
  if (!parsed.success) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_approve_host",
      outcome: "denied",
      meta: { reason: "invalid_input" satisfies DenialReason },
    });
    return DENIED;
  }

  const limit = rateLimit(`ops-approve-host:${staff.id}`, OPS_ACTION_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_approve_host",
      outcome: "denied",
      meta: { reason: "rate_limit" satisfies DenialReason, retryAfter: limit.retryAfter },
    });
    return TOO_FAST;
  }

  const check = await runVerification(opsVerificationProvider(), { result: "pass" });
  if (!check) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_approve_host",
      outcome: "denied",
      meta: { reason: "provider_unregistered" satisfies DenialReason },
    });
    return PROVIDER_UNAVAILABLE;
  }

  // ⚠ MEASURED (2026-09-01): a JS `Date` CANNOT be bound as a parameter through
  // a raw `db.execute` statement on postgres.js — the raw-parameter path answers
  // `ERR_INVALID_ARG_TYPE: ... Received an instance of Date` at Bind time, even though the driver
  // resolved the placeholder's type as 1184 (timestamptz). Drizzle's query BUILDER maps Dates
  // because the column type tells it to; a raw statement has no column type to consult. So the
  // instant is bound as an ISO-8601 string with an explicit cast, which Postgres parses exactly.
  const flipped = (await db.execute(sql`
    UPDATE host_verification
    SET status = 'approved',
        provider = ${check.provider},
        result = ${check.result},
        checked_at = ${check.checkedAt?.toISOString() ?? null}::timestamptz,
        reason = NULL,
        decided_by_staff_id = ${staff.id},
        updated_at = now()
    WHERE user_id = ${parsed.data.userId}
      AND status IN ('pending', 'unverified')
    RETURNING user_id
  `)) as unknown as { user_id: string }[];

  if (flipped.length === 0) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_approve_host",
      outcome: "denied",
      meta: {
        reason: "not_applicable" satisfies DenialReason,
        userId: parsed.data.userId,
      },
    });
    return STALE;
  }

  await recordAudit({
    actorId: staff.id,
    action: "ops_approve_host",
    outcome: "ok",
    meta: { userId: parsed.data.userId, provider: check.provider, result: check.result },
  });

  // OPS-05 / D-245 — post-flip, post-audit, individually guarded. See the block above `guardedNotify`.
  await notifyHost(staff.id, "ops_approve_host", parsed.data.userId, hostApprovedPayload());
  // THE QUEUE THIS DECISION JUST LEFT (plan 18-12). `/ops` renders `loadReviewQueue`, and this write
  // is what removes a row from it — so without this line the operator approves or rejects, the row
  // stays exactly where it was, and the only feedback is a toast. Pressing it again is refused calmly
  // by the guards in the WHERE above, which is correct and is also indistinguishable from a control
  // that did nothing. 18-05 and 18-10 both DATED this line to the plan that built the route rather
  // than adding a client-side `router.refresh()` to paper over it: a refresh in the island would be a
  // component taking a decision that belongs to the route.
  revalidatePath("/ops");
  return OK;
}

/**
 * Reject a host's identity check, with a reason the host can read (OPS-05 / D-243).
 *
 * Symmetric to `approveHost` in every respect except the verdict handed to the port and the reason
 * written to the durable column — deliberately, so the two cannot drift into different guard sets.
 */
export async function rejectHost(input: RejectHostInput): Promise<OpsActionResult> {
  const staff = await requireStaff();

  const parsed = rejectHostSchema.safeParse(input);
  if (!parsed.success) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_reject_host",
      outcome: "denied",
      meta: { reason: "invalid_input" satisfies DenialReason },
    });
    return DENIED;
  }

  const limit = rateLimit(`ops-reject-host:${staff.id}`, OPS_ACTION_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_reject_host",
      outcome: "denied",
      meta: { reason: "rate_limit" satisfies DenialReason, retryAfter: limit.retryAfter },
    });
    return TOO_FAST;
  }

  const check = await runVerification(opsVerificationProvider(), { result: "fail" });
  if (!check) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_reject_host",
      outcome: "denied",
      meta: { reason: "provider_unregistered" satisfies DenialReason },
    });
    return PROVIDER_UNAVAILABLE;
  }

  const storedReason = composeReason(parsed.data.reason, parsed.data.note);

  const flipped = (await db.execute(sql`
    UPDATE host_verification
    SET status = 'rejected',
        provider = ${check.provider},
        result = ${check.result},
        checked_at = ${check.checkedAt?.toISOString() ?? null}::timestamptz,
        reason = ${storedReason},
        decided_by_staff_id = ${staff.id},
        updated_at = now()
    WHERE user_id = ${parsed.data.userId}
      AND status IN ('pending', 'unverified')
    RETURNING user_id
  `)) as unknown as { user_id: string }[];

  if (flipped.length === 0) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_reject_host",
      outcome: "denied",
      meta: {
        reason: "not_applicable" satisfies DenialReason,
        userId: parsed.data.userId,
      },
    });
    return STALE;
  }

  await recordAudit({
    actorId: staff.id,
    action: "ops_reject_host",
    outcome: "ok",
    // ⚠ D-72 — the taxonomy SENTENCE is an enum value and may be recorded; the operator's free-text
    // note may NOT. It can contain anything they typed about a person, and `meta` is a durable jsonb
    // column under an explicit no-PII rule. The note lives in `host_verification.reason`, which is
    // where the host reads it from anyway, so nothing is lost by keeping it out of here.
    meta: {
      userId: parsed.data.userId,
      reasonSentence: parsed.data.reason,
      hasNote: (parsed.data.note?.trim().length ?? 0) > 0,
    },
  });

  // OPS-05 / D-245 — the host is TOLD, with the reason, and the reason is the SAME string the durable
  // `host_verification.reason` column now holds: `storedReason`, not a re-composition. Two calls to
  // `composeReason` would be two sources for one sentence, and the host would eventually read a
  // notification that no longer matched their own account page.
  await notifyHost(
    staff.id,
    "ops_reject_host",
    parsed.data.userId,
    hostRejectedPayload(storedReason),
  );
  // THE QUEUE THIS DECISION JUST LEFT (plan 18-12). `/ops` renders `loadReviewQueue`, and this write
  // is what removes a row from it — so without this line the operator approves or rejects, the row
  // stays exactly where it was, and the only feedback is a toast. Pressing it again is refused calmly
  // by the guards in the WHERE above, which is correct and is also indistinguishable from a control
  // that did nothing. 18-05 and 18-10 both DATED this line to the plan that built the route rather
  // than adding a client-side `router.refresh()` to paper over it: a refresh in the island would be a
  // component taking a decision that belongs to the route.
  revalidatePath("/ops");
  return OK;
}

/**
 * ENF-01 / D-233's DEFAULT LEVER — suspend a host: block new bookings and freeze payouts.
 *
 * ONE column write, and that is the whole design. D-222 put suspension on the SAME enum the
 * sell-gate reads, so `suspended` fails the host term of `deriveBookable` at all seven sites with no
 * second check to forget, and the payout sweep reads the same value (plan 18-07).
 *
 * ⚠ THIS ACTION DOES NOT GO THROUGH THE VERIFICATION PORT, and that is deliberate rather than an
 * omission. The port answers "did an identity check pass?"; a suspension is an ENFORCEMENT decision
 * about conduct, and writing `result: 'fail'` plus a fresh `checked_at` for it would fabricate a
 * check that never ran — the T-18-0202 principle, and the same blur D-244 refused when it declined
 * to reuse `'system'` for an ops cancellation. `provider`, `result` and `checked_at` are left
 * exactly as the last real check left them.
 *
 * The guard is `status <> 'suspended'`: suspending an already-suspended host is a no-op that must
 * read as "no longer applies" rather than silently rewriting the reason of the first suspension.
 *
 * D-215: there is no tier. Any staff member can pull this lever, and the trail row IS the control —
 * which is exactly why the row has to be real, and why the test reads it back rather than trusting
 * a return value.
 */
export async function suspendHost(input: SuspendHostInput): Promise<OpsActionResult> {
  const staff = await requireStaff();

  const parsed = suspendHostSchema.safeParse(input);
  if (!parsed.success) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_suspend_host",
      outcome: "denied",
      meta: { reason: "invalid_input" satisfies DenialReason },
    });
    return DENIED;
  }

  const limit = rateLimit(`ops-suspend-host:${staff.id}`, OPS_ACTION_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_suspend_host",
      outcome: "denied",
      meta: { reason: "rate_limit" satisfies DenialReason, retryAfter: limit.retryAfter },
    });
    return TOO_FAST;
  }

  const storedReason = composeReason(parsed.data.reason, parsed.data.note);

  const flipped = (await db.execute(sql`
    UPDATE host_verification
    SET status = 'suspended',
        reason = ${storedReason},
        decided_by_staff_id = ${staff.id},
        updated_at = now()
    WHERE user_id = ${parsed.data.userId}
      AND status <> 'suspended'
    RETURNING user_id
  `)) as unknown as { user_id: string }[];

  if (flipped.length === 0) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_suspend_host",
      outcome: "denied",
      meta: {
        reason: "not_applicable" satisfies DenialReason,
        userId: parsed.data.userId,
      },
    });
    return STALE;
  }

  await recordAudit({
    actorId: staff.id,
    action: "ops_suspend_host",
    outcome: "ok",
    meta: {
      userId: parsed.data.userId,
      reasonSentence: parsed.data.reason,
      hasNote: (parsed.data.note?.trim().length ?? 0) > 0,
    },
  });

  // D-243 — A SUSPENDED HOST IS TOLD, WITH THE REASON, AND NOTHING IS PROMISED. This is the message
  // that most needs the notification rather than a status: it stops their income at both ends (no new
  // bookings, payouts frozen), and a host who has to go looking for that has not been told. Host
  // appeals are backlog 999.6 and OUT, so the copy says what happened, says why, and stops.
  await notifyHost(
    staff.id,
    "ops_suspend_host",
    parsed.data.userId,
    hostSuspendedPayload(storedReason),
  );
  // THE QUEUE THIS DECISION JUST LEFT (plan 18-12). `/ops` renders `loadReviewQueue`, and this write
  // is what removes a row from it — so without this line the operator approves or rejects, the row
  // stays exactly where it was, and the only feedback is a toast. Pressing it again is refused calmly
  // by the guards in the WHERE above, which is correct and is also indistinguishable from a control
  // that did nothing. 18-05 and 18-10 both DATED this line to the plan that built the route rather
  // than adding a client-side `router.refresh()` to paper over it: a refresh in the island would be a
  // component taking a decision that belongs to the route.
  revalidatePath("/ops");
  return OK;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// LISTING DECISIONS
// ═════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Approve a listing for sale (LVER-01 / OPS-03).
 *
 * `review_state = 'approved'` is one of the two values the sell-gate's listing term accepts, so this
 * single write is what makes the listing sellable — provided its host also passes (D-224). The queue
 * puts the host's CURRENT verification status on the row precisely so a reviewer knows which of
 * those two facts they are changing.
 *
 * The guard admits `pending` only. `grandfathered` is not promoted (D-211/D-212), an `approved` row
 * is already decided, and a `rejected` or `withdrawn` listing comes back through a material edit
 * (D-249) rather than through a second click here.
 */
export async function approveListing(input: ApproveListingInput): Promise<OpsActionResult> {
  const staff = await requireStaff();

  const parsed = approveListingSchema.safeParse(input);
  if (!parsed.success) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_approve_listing",
      outcome: "denied",
      meta: { reason: "invalid_input" satisfies DenialReason },
    });
    return DENIED;
  }

  const limit = rateLimit(`ops-approve-listing:${staff.id}`, OPS_ACTION_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_approve_listing",
      outcome: "denied",
      meta: { reason: "rate_limit" satisfies DenialReason, retryAfter: limit.retryAfter },
    });
    return TOO_FAST;
  }

  const flipped = (await db.execute(sql`
    UPDATE listing
    SET review_state = 'approved',
        updated_at = now()
    WHERE id = ${parsed.data.listingId}
      AND review_state = 'pending'
      AND deleted_at IS NULL
    RETURNING id
  `)) as unknown as { id: string }[];

  if (flipped.length === 0) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_approve_listing",
      outcome: "denied",
      meta: {
        reason: "not_applicable" satisfies DenialReason,
        listingId: parsed.data.listingId,
      },
    });
    return STALE;
  }

  await writeListingHistory(staff.id, "ops_approve_listing", parsed.data.listingId, "approved", null);

  await recordAudit({
    actorId: staff.id,
    action: "ops_approve_listing",
    outcome: "ok",
    meta: { listingId: parsed.data.listingId },
  });

  // OPS-05 / D-245. Emitted AFTER the history write as well as after the flip, so the notification is
  // never the thing that lands before the compliance record it describes.
  await notifyListingHost(
    staff.id,
    "ops_approve_listing",
    parsed.data.listingId,
    listingApprovedPayload,
  );
  // THE QUEUE THIS DECISION JUST LEFT (plan 18-12). `/ops` renders `loadReviewQueue`, and this write
  // is what removes a row from it — so without this line the operator approves or rejects, the row
  // stays exactly where it was, and the only feedback is a toast. Pressing it again is refused calmly
  // by the guards in the WHERE above, which is correct and is also indistinguishable from a control
  // that did nothing. 18-05 and 18-10 both DATED this line to the plan that built the route rather
  // than adding a client-side `router.refresh()` to paper over it: a refresh in the island would be a
  // component taking a decision that belongs to the route.
  revalidatePath("/ops");
  return OK;
}

/**
 * Reject a listing, with a reason the host can read (OPS-05 / D-230 / D-249).
 *
 * The reason stays readable on the listing's review history until the host resubmits, because that
 * is the only thing that makes the edit purposeful — D-249's second guard, in its own words.
 */
export async function rejectListing(input: RejectListingInput): Promise<OpsActionResult> {
  const staff = await requireStaff();

  const parsed = rejectListingSchema.safeParse(input);
  if (!parsed.success) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_reject_listing",
      outcome: "denied",
      meta: { reason: "invalid_input" satisfies DenialReason },
    });
    return DENIED;
  }

  const limit = rateLimit(`ops-reject-listing:${staff.id}`, OPS_ACTION_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_reject_listing",
      outcome: "denied",
      meta: { reason: "rate_limit" satisfies DenialReason, retryAfter: limit.retryAfter },
    });
    return TOO_FAST;
  }

  const storedReason = composeReason(parsed.data.reason, parsed.data.note);

  const flipped = (await db.execute(sql`
    UPDATE listing
    SET review_state = 'rejected',
        updated_at = now()
    WHERE id = ${parsed.data.listingId}
      AND review_state = 'pending'
      AND deleted_at IS NULL
    RETURNING id
  `)) as unknown as { id: string }[];

  if (flipped.length === 0) {
    await recordAudit({
      actorId: staff.id,
      action: "ops_reject_listing",
      outcome: "denied",
      meta: {
        reason: "not_applicable" satisfies DenialReason,
        listingId: parsed.data.listingId,
      },
    });
    return STALE;
  }

  await writeListingHistory(
    staff.id,
    "ops_reject_listing",
    parsed.data.listingId,
    "rejected",
    storedReason,
  );

  await recordAudit({
    actorId: staff.id,
    action: "ops_reject_listing",
    outcome: "ok",
    // ⚠ D-72 — the taxonomy SENTENCE only. The operator's free-text note stays in
    // `listing_review.reason`, which is where the host reads it from. See `rejectHost`.
    meta: {
      listingId: parsed.data.listingId,
      reasonSentence: parsed.data.reason,
      hasNote: (parsed.data.note?.trim().length ?? 0) > 0,
    },
  });

  // OPS-05 / D-245 — the reason the host READS, carried on the same `storedReason` string that
  // `writeListingHistory` just put in `listing_review.reason`. One value, two surfaces.
  await notifyListingHost(staff.id, "ops_reject_listing", parsed.data.listingId, (title) =>
    listingRejectedPayload(title, storedReason),
  );
  // THE QUEUE THIS DECISION JUST LEFT (plan 18-12). `/ops` renders `loadReviewQueue`, and this write
  // is what removes a row from it — so without this line the operator approves or rejects, the row
  // stays exactly where it was, and the only feedback is a toast. Pressing it again is refused calmly
  // by the guards in the WHERE above, which is correct and is also indistinguishable from a control
  // that did nothing. 18-05 and 18-10 both DATED this line to the plan that built the route rather
  // than adding a client-side `router.refresh()` to paper over it: a refresh in the island would be a
  // component taking a decision that belongs to the route.
  revalidatePath("/ops");
  return OK;
}

/**
 * EVERYTHING BELOW HERE IS A CONSEQUENCE OF A FLIP THAT HAS ALREADY COMMITTED.
 *
 * The listing is already out of the queue and already (un)sellable, so nothing here may unwind it
 * and nothing here may raise past this point — a raised error would hand an operator a 500 for a
 * decision that in fact succeeded, and they would press the button again. `cancel-booking.ts`'s
 * post-flip discipline block states the rule; this is the same rule with one consequence instead of
 * four.
 *
 * A failed history write therefore becomes a `needs_attention` row on the established operator-alert
 * channel (D-58/D-90) plus a `denied` trail row naming the cause, and the action still reports the
 * truth: the decision was recorded. The history row is a compliance record, not the decision itself.
 */
async function writeListingHistory(
  staffId: string,
  action: "ops_approve_listing" | "ops_reject_listing",
  listingId: string,
  state: "approved" | "rejected",
  storedReason: string | null,
): Promise<void> {
  try {
    await closeReviewCycle(listingId, state, storedReason, staffId);
  } catch {
    await recordAudit({
      actorId: staffId,
      action,
      outcome: "needs_attention",
      meta: { reason: "history_write_failed" satisfies DenialReason, listingId, state },
    });
  }
}
