import "server-only";

// THE ONE GUARDED NOTIFICATION FAN-OUT (OPS-05 / D-245), lifted out of `ops-review.ts` so a SECOND
// writer of host standing can reuse it instead of replicating it.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS AT ALL — AND WHY IT IS NOT AN EXPORT OF `ops-review.ts`
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `guardedNotify` shipped in plan 18-05 as a MODULE-PRIVATE function of
// `src/app/actions/ops-review.ts`. Plan 18.1-08 needs the same guarantee on a second path — a Didit
// verdict arriving by signed webhook writes the same `host_verification` columns the ops console
// writes, and must tell the host with the same one-payload/one-row/one-email fan-out (D-245).
//
// EXPORTING IT FROM `ops-review.ts` WAS CONSIDERED AND IS REFUSED, ON MEASURED GROUNDS RATHER THAN
// TASTE:
//
//   1. IT WOULD BE A NETWORK-REACHABLE RPC ENDPOINT. That module opens with the server-actions
//      directive, and Next requires every export of such a module "be treated with the same security
//      considerations as public-facing API endpoints". `tests/design/ops-guard-coverage.test.ts`
//      encodes that as layer 3: the staff gate must be the FIRST statement of every exported function
//      in `src/app/actions/ops-*.ts`. This function cannot gate on staff standing — it is handed an
//      already-resolved actor, and its second caller is a webhook where there is no staff session at
//      all — so exporting it would either fail that clause or bolt a gate onto a helper that would
//      then refuse the webhook.
//   2. THE ACTION CENSUS IS PINNED AT SIX (`EXPECTED_OPS_ACTIONS`), and the walk counts exported
//      function declarations in that file. Measured before this file was written: five today, so the
//      export would make it seven and redden a gate whose whole job is to notice a new ops action.
//   3. `tests/use-server-exports.test.ts` would have stayed GREEN, because this IS an async function
//      — which is exactly why that test is the wrong instrument to lean on here. It proves the export
//      SHAPE is legal to Next; it says nothing about whether the export should exist.
//
// So the function moves into a plain module both callers import. That is this repository's shipped
// answer to "a guarded module holds something its neighbours legitimately need": `payments/config.ts`
// beside guarded `payments/fees.ts`, `availability/horizon.ts` beside guarded `availability/slots.ts`,
// and — one plan ago — `src/lib/host/verification-refusals.ts` beside the submission action, for the
// same reason in the same phase.
//
// ⚠ THE MOVE IS BEHAVIOUR-PRESERVING AND MUST STAY SO. The body below is `ops-review.ts:207-228`
// verbatim except that the alert TAG became a parameter (see `alertTag`) and the `action` widened from
// that module's private five-verb union to `string`, because a Didit verdict is not an ops decision.
// The `console.error` shape, the swallow, the `needs_attention` outcome and the
// `meta: { reason: "notify_failed" }` row are unchanged, so the operator-alert channel and the audit
// trail read exactly as they did.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE PROPERTY THIS MODULE EXISTS TO PROVIDE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// A NOTIFICATION FAILURE MAY NEVER ROLL BACK OR BLOCK THE STATE CHANGE THAT PRECEDED IT, AND EACH
// NOTIFY IS GUARDED INDIVIDUALLY. `ops-review.ts`'s own block states the reasoning and it carries
// over unchanged to the webhook: by the time this runs the decision has COMMITTED — the host is
// already approved or already rejected — so nothing here may unwind that and nothing here may throw
// past it. On the ops path a throw would hand an operator a 500 for a decision that in fact
// succeeded, and they would press the button again. On the WEBHOOK path it is worse: a throw becomes
// a non-2xx, and Didit retries an already-applied verdict at most twice before dropping the delivery
// permanently.
//
// The WHOLE body is inside the guard — the recipient LOOKUP as well as the emit — because the lookup
// is a live database read that can fail on its own. `emitNotify` swallows its own transport errors
// (MANAGE-03); this catches everything upstream of that.
//
// `guarded` is not "best effort and never mind": a failure becomes a `needs_attention` row on the
// established operator-alert channel (D-58 / D-90) plus a console line, which is how a host who was
// never told still shows up somewhere a person looks.

import { sql } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import type { NotificationPayload } from "@/lib/db/schema";
import { emitNotify } from "@/lib/notifications";

/**
 * What a caller's closure has to resolve: WHO is told, at WHAT address, and WITH WHICH payload.
 *
 * It is a closure rather than three arguments so the recipient lookup happens INSIDE the guard. A
 * caller that resolved the address first would be running an unguarded database read on a path whose
 * entire contract is that it cannot fail loudly.
 */
export type GuardedNotifyRecipient = {
  readonly recipientId: string;
  readonly email: string | null;
  readonly payload: NotificationPayload;
};

/**
 * Hand ONE notification to the fan-out, and never let it disturb the decision that preceded it.
 *
 * `type` is read OFF the payload rather than passed alongside it, so the indexed column and the jsonb
 * discriminant cannot disagree — the condition `notifyEventSchema`'s refine exists to catch, removed
 * at the call site rather than merely detected at the write boundary.
 *
 * `bookingId` is NULL on every caller so far: a host's standing is not booking-scoped.
 *
 * @param actorId  The already-resolved actor the failure row is attributed to. On the ops path that
 *                 is the authenticated staff id; on the webhook path it is the system actor, because
 *                 the vendor decided and no FitOut identity did.
 * @param action   The audit verb, matched to the caller's own decision verb so a failed notice is
 *                 findable beside the decision it belongs to. Widened from `ops-review.ts`'s private
 *                 union because a vendor verdict is not one of the five ops decisions.
 * @param alertTag The operator-alert prefix, e.g. `OPS_REVIEW_ALERT`. A PARAMETER because these
 *                 prefixes are per-DOMAIN in this repository (`[PAYMENT_ALERT]` is shared by the
 *                 PayMongo webhook, the reconciliation sweep and the confirm module they both call),
 *                 and collapsing two domains onto one prefix would make an ops-console failure and a
 *                 vendor-webhook failure indistinguishable in the logs an operator greps.
 */
export async function guardedNotify(
  actorId: string,
  action: string,
  alertTag: string,
  build: () => Promise<GuardedNotifyRecipient>,
): Promise<void> {
  try {
    const { recipientId, email, payload } = await build();
    await emitNotify({ type: payload.type, recipientId, bookingId: null, email, payload });
  } catch (err) {
    console.error(`[${alertTag}] notify_failed`, { action, err });
    await recordAudit({
      actorId,
      action,
      outcome: "needs_attention",
      // ⚠ D-72 — the verb and the failure reason only. The payload carries FREE TEXT (an operator's
      // sentence, or a vendor's) and `meta` is a durable jsonb column under an explicit
      // no-secrets/no-PII rule; the recipient's email address never goes here either (T-07-38: an
      // alert must not become the leak). The row's own `action` column already says which decision
      // this was.
      meta: { reason: "notify_failed" },
    });
  }
}

/**
 * Tell a USER about a decision on their own ACCOUNT. The id IS the recipient; only the address needs
 * looking up.
 *
 * Lifted from `ops-review.ts`'s `notifyHost` unchanged — same statement, same "recipient not found"
 * throw, which the guard above turns into the `needs_attention` row rather than an exception. Both
 * host-standing writers (the ops console and the Didit verdict) need exactly this, and a second copy
 * of a one-column lookup is a second place the notice can silently stop being sent.
 */
export async function notifyAccountOwner(
  actorId: string,
  action: string,
  alertTag: string,
  userId: string,
  payload: NotificationPayload,
): Promise<void> {
  await guardedNotify(actorId, action, alertTag, async () => {
    const [row] = (await db.execute(sql`
      SELECT u.email AS "email" FROM "user" u WHERE u.id = ${userId}
    `)) as unknown as { email: string | null }[];
    if (!row) throw new Error("notify recipient not found");
    return { recipientId: userId, email: row.email, payload };
  });
}
