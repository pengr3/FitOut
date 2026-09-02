import "server-only";

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE DIDIT RECONCILIATION SWEEP (FINDING F-4) — the answer to a verdict that never arrives.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE HOLE THIS FILE CLOSES. Didit retries a failed webhook delivery EXACTLY TWICE — roughly one minute
// and four minutes — and then DROPS IT PERMANENTLY; `2xx` is success and `3xx`/`4xx` other than `404` are
// never retried at all. So a deploy, a cold start or a five-second timeout inside that window loses an
// identity verdict FOREVER. That is materially weaker than PayMongo's policy, and it lands on a product
// where D-262 means no operator confirms anything and D-263 means the host has no route to a human: a lost
// verdict is a host sitting at `pending` indefinitely, on a page telling them FitOut is waiting on the
// result, with nobody prompted and nothing anywhere failing to say so.
//
// `src/inngest/functions/payment-reconcile.ts` is the EXACT precedent, one domain over: it exists because a
// PayMongo webhook may never arrive (D-105/D-110), and its shape is copied here deliberately — the same
// 2-arg `inngest.createFunction` form with `triggers`, the same `concurrency: 1` singleton, the same
// `dbConn: DbConn = db` parameterisation so an isolated-schema test can inject a connection, the same one
// `step.run` per row so a mid-batch failure retries ONLY that row, and the same discipline that the guard
// is not ours: it lives in the write module's status-scoped statement, which is why nothing here writes.
//
// ⚠ AND THE PRECEDENT IS COPIED WITH SCEPTICISM RATHER THAN WHOLESALE. Plan 18.1-08 measured what happens
// when a control is ported across vendors without asking what it actually protects: ADDENDUM A7's "reject
// when the timestamp header is stale" is a real replay control for PayMongo, which signs `${t}.${rawBody}`,
// and NOT A CONTROL AT ALL for Didit, which signs the raw body alone. Two things were re-derived here rather
// than inherited: the alert policy (below) and the fact that this sweep is a PULL and therefore has no
// transport to authenticate.
//
// ── D-105: ONE ROAD TO THE APPROVED STATE, AND THIS FILE IS NOT IT ──────────────────────────────────────
// The sweep calls `applyDiditVerdict` and issues NO statement of its own against `host_verification`; it
// performs no second translation of the vendor's ten status strings either. Two roads to a verified host,
// reached by two readings of the same ten strings, is precisely what D-105 forbids — restated verbatim at
// `src/app/api/paymongo/webhook/route.ts:20-22` after the incident it was written for. If a future plan
// needs a behaviour the write module does not have, WIDEN THAT MODULE. Do not add a statement here.
//
// The division of labour, unchanged from the webhook's:
//   · `src/lib/verification/didit-verdict.ts`  the single TRANSLATION (pure: no db, no fetch, no clock).
//   · `src/lib/verification/port.ts`           the single BRANCH POINT to a persistable result.
//   · `src/lib/verification/apply-verdict.ts`  the single WRITE, and the single notification.
//
// ⚠ NO NOTIFICATION IS SENT FROM HERE, AND THE ABSENCE IS THE DESIGN. D-245 gives ONE payload per decision;
// the write module already emits it through `src/lib/notification-guard.ts`, where a failed notice becomes a
// `needs_attention` row and can never unwind or block the flip that preceded it. A recovered verdict must
// reach the host as the SAME sentence a delivered one does — a second emitter here would be a second thing
// to keep true, and on a re-run it would be a second email about one decision.
//
// ── IT RECONCILES BY READING. IT CAN NEVER RECONCILE BY RE-ASKING ───────────────────────────────────────
// `POST /v3/session/` is IDEMPOTENT over unfinished sessions on the same `vendor_data` (ADDENDUM A3): a
// session in `Not Started` / `In Progress` / `Resubmitted` / `Awaiting User` is returned AS-IS. So a sweep
// that "retried" by creating a session would be handed the same session back and would have learned exactly
// nothing — a no-op wearing the shape of a fix. The recovery is `fetchDiditDecision`, a GET, and the vendor's
// own documented fallback ("webhook-then-fetch is cheaper and faster" — the webhook is the FAST path, not
// the only one).
//
// ── FAIL CLOSED IN EVERY DIRECTION ──────────────────────────────────────────────────────────────────────
// `fetchDiditDecision` THROWS on a transport failure, a refused credential, any other non-2xx, a body that
// is not JSON and a 2xx carrying no usable status. None of those is evidence about a host, so none of them
// reaches the write module: the row is left exactly where it was. A status FitOut does not recognise is
// fail-closed one layer further in — the shared mapper's unknown branch moves nothing and asks for a trail
// row. The ONLY thing that can move a row here is the vendor's own record of its own decision.
//
// ── BOUNDED, BECAUSE A SWEEP THAT POLLS EVERYTHING IS A PROVIDER-LOAD BUG ───────────────────────────────
// Four bounds, all in `queryStalePendingVerifications`: the `pending` scope, a handle to actually ask about,
// the grace window, and `DIDIT_RECONCILE_BATCH_LIMIT`. `concurrency: 1` means passes can never pile up, and
// a 429 stops the pass rather than tightening the loop against a vendor already saying stop.

import { sql } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import type { DbConn } from "@/lib/availability/read-model";
import { db } from "@/lib/db";
import { applyDiditVerdict } from "@/lib/verification/apply-verdict";
import {
  DiditRateLimitError,
  DiditSessionError,
  fetchDiditDecision,
} from "@/lib/verification/providers/didit";
import { inngest } from "@/inngest/client";

/**
 * ⚠ THE GRACE WINDOW LIVES HERE AND NOWHERE ELSE — the `payout-sweep.ts:112-114` idiom.
 *
 * A row must have been IDLE for this long before the sweep will ask about it, and the floor exists so the
 * sweep can never race a HEALTHY webhook. Didit's two retries land at roughly one minute and four minutes;
 * thirty is past the second by a factor of seven, so a delivery that is merely in flight — or on its second
 * attempt — is finished long before this sweep is entitled to an opinion about it.
 *
 * ⚠ LOWER IT AND THE RACE COMES BACK SILENTLY. The sweep would still run, still recover, still look
 * healthy, and would simply start applying verdicts whose webhook was about to land normally — filing a
 * "the webhook never arrived" alert on the exact event that proves it did. An operator channel that fires
 * on non-events gets filtered to trash (`ops-alert-digest.ts`, D-J3Z-05), and once filtered, the one day it
 * carries a real permanently-dropped verdict is the day nobody opens it.
 *
 * There is deliberately NO CEILING. `session_expiration_time` is 604800 seconds — seven days (ADDENDUM B1,
 * read first-hand off the account), so a row idle longer than that cannot still be waiting on a live
 * session: the vendor's own record will read `Expired`, and applying THAT is exactly the FINDING F-3
 * release the host needs. An upper bound would abandon precisely the hosts who have been stuck longest.
 * The candidate set therefore drains by construction rather than by a cutoff — every terminal answer moves
 * the row out of `pending`, and a row that stops being `pending` stops being asked about.
 *
 * The comparison runs on the POSTGRES clock (`now()`), never `Date.now()`: this predicate decides whether a
 * real host's standing gets re-read from a vendor, and `payout-reconcile.ts` reserves the JS clock for
 * advisory alert timing only.
 */
export const DIDIT_RECONCILE_GRACE_MINUTES = 30;

/**
 * The hard bound on ONE pass, and it is sized against the VENDOR'S RATE LIMIT rather than against taste.
 *
 * Didit allows **600 GET/min per API key on the paid tier and 10 GET/min on the free tier**, answering
 * `429` on exceed (18.1-RESEARCH § R1 § The status / decision retrieval endpoint). The number below is
 * sized against the LOWER of the two — the free tier's 10/min — because a constant that is only correct on
 * a plan FitOut has not bought is a constant that fails the first time the account changes underneath it.
 *
 * Eight rows is therefore under the free ceiling even in the worst case where a whole batch issues inside a
 * single minute, and `DIDIT_RECONCILE_INTERVAL_MINUTES` keeps consecutive passes fifteen minutes apart, so
 * two passes can never contribute to the same minute at all. `concurrency: 1` closes the remaining way that
 * could happen — a slow pass cannot have the next one start on top of it.
 *
 * A NAMED LITERAL, NOT AN ENVIRONMENT READ, and deliberately: an unset variable would either fall back to
 * something enormous (rate-limiting the account out of its own recovery path) or to zero (disabling the
 * sweep silently, which is the failure this whole file exists to prevent). Both are worse than a number
 * somebody has to change on purpose in a reviewed commit. Rows are taken oldest-first, so a backlog drains
 * in order and nothing starves.
 */
export const DIDIT_RECONCILE_BATCH_LIMIT = 8;

/**
 * How often the sweep runs. Fifteen minutes, and the number is DERIVED from the two constants above rather
 * than preferred: it is long enough that consecutive passes cannot share a minute against the free-tier
 * ceiling, and short enough that the worst-case recovery latency — grace plus interval, i.e. 45 minutes —
 * stays a rounding error beside the alternative, which is never.
 */
export const DIDIT_RECONCILE_INTERVAL_MINUTES = 15;

/**
 * The minute the schedule starts on. NOT 0, 15, 30, 45 or 50 — the five slots the hourly crons and the
 * daily digest already occupy — and NOT congruent to 2 or 4 modulo 5, the residues the payment reconcile
 * (`2-59/5`) and the checkout-retire sweep (`4-59/5`) occupy. 8 is congruent to 3, which nothing holds, and
 * because the interval is a multiple of five every tick this schedule produces (:08, :23, :38, :53) keeps
 * that residue. Pitfall 4's offset discipline: crons that tick together contend for the same database.
 */
const DIDIT_RECONCILE_START_MINUTE = 8;

/**
 * The cron trigger string, BUILT from the constants above rather than typed out, on
 * `payment-reconcile.ts:160`'s rule — a hand-written schedule and a hand-written interval constant can
 * drift apart, and then the reasoning above would be protecting a number the deployed cron no longer
 * honours.
 *
 * The minute field is spelled `START-59/STEP` rather than `START/STEP`: the bare form is a Quartz
 * extension, while `8-59/15` is valid POSIX/vixie cron and is accepted by every parser in the chain.
 */
export function diditReconcileCron(): string {
  return `TZ=Asia/Manila ${DIDIT_RECONCILE_START_MINUTE}-59/${DIDIT_RECONCILE_INTERVAL_MINUTES} * * * *`;
}

/** The audit verb for a verdict this sweep RECOVERED — distinct from the write module's own verb. */
const AUDIT_ACTION = "didit_reconciled";

/** This module's operator-alert prefix. Per-DOMAIN, the `[PAYMENT_ALERT]` convention. */
const ALERT_TAG = "DIDIT_RECONCILE_ALERT";

/** No person decided this and no person ran it. The shipped actor for exactly that. */
const SYSTEM_ACTOR = "system";

/** One candidate: the lookup key the vendor echoes back, and the handle to ask about. */
export type StalePendingVerification = {
  userId: string;
  vendorRef: string;
};

/**
 * What one pass over one candidate did.
 *
 * - `recovered`   — the vendor had already decided, no webhook ever landed it, and this pass did. The one
 *                   outcome that is an EVENT rather than a heartbeat.
 * - `unchanged`   — the vendor answered and nothing moved: the check is genuinely still running, or the
 *                   webhook beat us to it and the write module's guarded statement said so with 0 rows.
 * - `unreachable` — we did not LEARN. Never evidence about the host; never a reason to touch the row.
 * - `rate-limited`— the vendor said stop. The pass ends; the next tick resumes where it left off.
 */
export type DiditReconcileOutcome = "recovered" | "unchanged" | "unreachable" | "rate-limited";

/** JSON-serializable so it can be the body of a `step.run`. */
export type DiditReconcileResult = { userId: string; outcome: DiditReconcileOutcome };

/**
 * The candidate set: host rows that are waiting on a vendor answer, hold a handle worth asking about, and
 * have been idle past the grace window.
 *
 * ⚠ THE `pending` SCOPE IS LOAD-BEARING TWICE OVER, exactly as `queryUnconfirmedPaid`'s status scope is:
 *
 *   1. It matches the write module's own claim, whose WHERE admits `pending` and nothing else — so the
 *      sweep can never hand it a row it would refuse, and an already-decided row costs no round trip.
 *   2. It keeps TERMINAL rows out, which is what stops the alert below dying of its own noise. An
 *      `approved`, `rejected`, `unverified` or `suspended` row is not waiting on anything; asking about it
 *      every fifteen minutes forever would spend the account's rate limit on questions with no answer.
 *
 * `vendor_ref IS NOT NULL` is the second half of that: never spend a round trip on a row with nothing to
 * ask about. The blank test beside it is defence in depth — today the only writer of that column is the
 * submission path, which stores a session handle the vendor validated, but "the value is ours" is a
 * property of today's writer rather than of this query, and a blank handle would address a different URL.
 *
 * Takes an explicit `dbConn` so an isolated-schema test can inject a connection; defaults to the prod `db`.
 */
export async function queryStalePendingVerifications(
  dbConn: DbConn = db,
): Promise<StalePendingVerification[]> {
  return (await dbConn.execute(sql`
    SELECT user_id    AS "userId",
           vendor_ref AS "vendorRef"
    FROM host_verification
    WHERE status = 'pending'
      AND vendor_ref IS NOT NULL
      AND btrim(vendor_ref) <> ''
      AND updated_at <= now() - make_interval(mins => ${DIDIT_RECONCILE_GRACE_MINUTES}::int)
    ORDER BY updated_at ASC
    LIMIT ${DIDIT_RECONCILE_BATCH_LIMIT}
  `)) as unknown as StalePendingVerification[];
}

/**
 * Reconcile ONE candidate: ask the vendor what it already knows, and route the answer through the one write
 * path. Every branch fails closed toward doing NOTHING.
 *
 * ⚠ THE CATCH IS NARROW ON PURPOSE. A blanket `catch` here would swallow a database failure escaping the
 * write module and report it as "we did not learn" — a pass that quietly stops recovering anything while
 * still returning a healthy tally. Only the vendor call's own two named refusals are handled; anything else
 * propagates out of the `step.run` that wraps this, where Inngest retries exactly that row.
 *
 * ⚠ AND AN UNREACHABLE VENDOR WRITES NO TRAIL ROW, WHICH IS AN ARGUED CHOICE RATHER THAN AN OMISSION. A
 * refused credential does not fail one row, it fails every row on every pass — at eight rows and four
 * passes an hour that is 32 `needs_attention` records an hour off ONE fault, which is the D-110 noise
 * defect `payment-reconcile.ts` records paying for: an operator queue nobody can read is worse than no
 * queue. The console line below is the alert channel for it, and it names the credential explicitly
 * because A5 says the vendor's 403 carries no machine-readable discriminator to name it with.
 */
export async function reconcileOne(row: StalePendingVerification): Promise<DiditReconcileResult> {
  let read;
  try {
    read = await fetchDiditDecision(row.vendorRef);
  } catch (err) {
    // Subclass first — a rate limit IS a session error, and testing the general case first would fold the
    // one refusal that means "stop asking" into the one that means "carry on".
    if (err instanceof DiditRateLimitError) {
      console.error(`[${ALERT_TAG}] rate_limited`, { userId: row.userId });
      return { userId: row.userId, outcome: "rate-limited" };
    }
    if (err instanceof DiditSessionError) {
      // ⚠ D-72 — the console line may carry the vendor's own sentence (which names the endpoint path, and
      // therefore the session handle) because `apply-verdict.ts` already establishes that a handle belongs
      // in the CONSOLE line and never in the durable `meta` column. No host email, no name, no address.
      console.error(`[${ALERT_TAG}] vendor_unreachable`, {
        userId: row.userId,
        httpStatus: err.status,
        detail: err.message,
      });
      return { userId: row.userId, outcome: "unreachable" };
    }
    throw err;
  }

  // ── THE ONE WRITE PATH. The status is handed over in the vendor's own spelling; the shared mapper in
  //    `didit-verdict.ts` is the only thing entitled to translate it, and this module never does.
  //    `sessionId` is the row's OWN handle rather than anything the response carried: the write module
  //    compares the two to observe a divergence, and comparing a value against itself is not that
  //    observation — on this path they agree by construction, which is exactly why the sweep is quiet.
  const applied = await applyDiditVerdict({
    vendorData: row.userId,
    sessionId: row.vendorRef,
    status: read.status,
    decision: read.decision,
  });

  if (!applied.moved) {
    // The vendor answered and nothing moved. Either the check is genuinely still running, or the webhook
    // landed this verdict first — which is the system WORKING, and alerting on it would file one alert per
    // healthy verification. The write module has already recorded whatever trail row the transition earned.
    return { userId: row.userId, outcome: "unchanged" };
  }

  // ── A GENUINE RECOVERY, AND IT IS THE ONE THING HERE AN OPERATOR SHOULD SEE ──────────────────────────
  //
  // This host's verdict was decided at the vendor, its webhook never arrived, and the sweep is the only
  // reason their standing is correct. The transport failing silently must be OBSERVABLE — D-110's shape,
  // one domain over — so it goes to the machinery that already exists (`recordAudit` + `needs_attention` +
  // the daily ops digest), never a parallel alerting system. Server-side ONLY: this raises no host-facing
  // affordance, and under D-263 there is none to raise.
  //
  // ⚠ D-72 — enum-shaped values and one id. NOT the vendor's sentence (host-facing free text, and it lives
  // in the durable column the host reads it from), NOT the decision object, NOT the session handle, NOT a
  // media URL — a decision's media values are short-lived presigned URLs and nothing may persist one
  // (ADDENDUM A8 / D-263: store a reason, not evidence).
  const meta = {
    userId: row.userId,
    transition: applied.transition,
    status: applied.status,
    recovered: true,
  };
  console.error(`[${ALERT_TAG}] webhook_missed`, meta);
  await recordAudit({
    actorId: SYSTEM_ACTOR,
    action: AUDIT_ACTION,
    outcome: "needs_attention",
    meta,
  });

  return { userId: row.userId, outcome: "recovered" };
}

/**
 * The F-4 sweep: a 15-minute, timezone-aware, SINGLETON (`concurrency: 1`) cron on an offset minute so it
 * never contends with the seven crons already registered. Each candidate is reconciled inside its OWN
 * Inngest step, so one row whose GET times out retries just that row rather than re-reading the whole batch.
 *
 * The 2-arg `createFunction(options, handler)` form with the trigger in `options.triggers` is inngest
 * 4.13.0's API — the same correction `payout-sweep.ts`, `payout-reconcile.ts` and `payment-reconcile.ts`
 * already carry.
 *
 * ⚠ THE PASS STOPS ON A 429 AND DOES NOT RETRY INSIDE ITSELF. The remaining rows are still `pending`, still
 * stale and therefore still selected fifteen minutes later; continuing to ask is the one response that
 * makes a rate limit worse.
 */
export const diditReconcile = inngest.createFunction(
  {
    id: "didit-reconcile",
    concurrency: 1, // singleton — passes never overlap, so vendor load stays bounded per pass
    triggers: [{ cron: diditReconcileCron() }],
  },
  async ({ step }) => {
    const candidates = await step.run("find-stale-pending", () =>
      queryStalePendingVerifications(db),
    );

    const tally: Record<string, number> = {};
    for (const row of candidates) {
      const result = (await step.run(`reconcile-${row.userId}`, () =>
        reconcileOne(row),
      )) as DiditReconcileResult;
      tally[result.outcome] = (tally[result.outcome] ?? 0) + 1;
      if (result.outcome === "rate-limited") break;
    }

    return { scanned: candidates.length, outcomes: tally };
  },
);
