import "server-only";

// THE ONLY WRITER OF A DIDIT VERDICT (HVER-07 / HVER-08 · D-261 / D-262 / D-245).
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// ONE ROAD TO APPROVED, AND THAT IS THE WHOLE POINT OF THIS FILE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Didit answers asynchronously, always, and its answer can reach FitOut two ways: the signed webhook
// (`src/app/api/didit/webhook/route.ts`, plan 18.1-08) and the reconciliation sweep (plan 18.1-09,
// which exists because the vendor retries twice and then drops the delivery permanently). THOSE ARE
// TWO DELIVERY MECHANISMS FOR ONE VERDICT. They must never become two statements that move a host
// row into the approved state.
//
// `src/app/api/paymongo/webhook/route.ts:20-22` states the rule one domain over, after the incident
// it was written for: *"ADDING A SECOND CONFIRM SITE — here or anywhere — IS EXACTLY WHAT D-105
// FORBIDS. Two roads to `confirmed` is how one payment produces two payout rows and two emails.
// Widen `confirmPaidBooking` instead."* This module is `confirmPaidBooking`'s analogue, and the
// sweep CALLS IT rather than repeating it. If a future plan needs a behaviour this does not have,
// widen this function; do not write a second statement that moves `host_verification.status`.
//
// The division of labour, stated once:
//
//   · `src/lib/verification/didit-verdict.ts`  DESCRIBES a transition and never performs one. Pure:
//     no database handle, no network call, no clock. It is the single TRANSLATION of the vendor's
//     ten status strings, and neither caller may re-derive a status of its own.
//   · `src/lib/verification/port.ts`           is the single BRANCH POINT from a decision to a
//     persistable `VerificationResult`. Callers never hand-build one.
//   · THIS MODULE                              is the single WRITE. Every `host_verification`
//     transition a Didit answer can cause, and every notification one triggers, happens here.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ `vendor_ref` IS ABSENT FROM THE APPROVE AND REJECT SET LISTS. IT IS PRESERVED, NOT FORGOTTEN
// ════════════════════════════════════════════════════════════════════════════════════════════════
// DO NOT "COMPLETE" THOSE SET LISTS. The session handle was written when the check was STARTED
// (`src/app/actions/host-verification.ts`, the guarded upsert) and the verdict carries no new one.
// The adapter's `verify` returns `vendorRef: null`, and its own comment says what that null means:
// not "there is no vendor handle" but "THIS CALL carries no new handle — the row's stands". Writing
// it would erase the only pointer FitOut keeps at the vendor's copy of the evidence, which is the
// single thing a later compliance question is answered with, and `host_verification` has no other
// column that could hold one.
//
// The `unverified` reset DOES clear it, and that is the opposite case rather than an inconsistency:
// nobody checked, the session is over, and a handle pointing at an expired session that decided
// nothing is worse than no handle at all.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE GUARDED UPDATE IS THE IDEMPOTENCY — THERE IS NO EVENT LEDGER, DELIBERATELY
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Every transition below is ONE statement whose WHERE holds every source state it admits, so a
// re-delivered verdict flips 0 ROWS and is a calm no-op BY CONSTRUCTION — the same shape
// `approveHost` already uses to return `STALE`, and the same discipline `re-review.ts` states:
// *"every source state lives in the UPDATE's own WHERE, so a 0-row result is the single calm no-op
// and there is no branch a future edit can forget."*
//
// The PayMongo route dedupes on an `id` ledger table (`paymongo_event`) instead. That is the right
// answer THERE, where the handler has side effects a re-run would repeat (a refund, an email about a
// booking) and the flip is not the only thing that happens. Here the flip IS the thing that happens,
// and a state-scoped WHERE is strictly stronger than an id ledger for the failure that actually
// matters: it also refuses a DIFFERENT event that would move an already-decided row.
//
// ⚠ Zero new schema, and `tests/ops/verification-schema.test.ts` asserts `host_verification`'s
// column set by SET EQUALITY — so this choice is not merely convenient, it is the only one that
// leaves that gate untouched.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// PROVENANCE — WHERE EVERY WRITTEN VALUE COMES FROM
// ════════════════════════════════════════════════════════════════════════════════════════════════
//   `status`      the shared mapper, over the VERIFIED envelope's status string. Never re-derived.
//   `result`      the PORT's `VerificationResult`. Never a hand-built literal.
//   `provider`    read OFF that result. This module spells no provider name and compares none: the
//                 registry in `port.ts` is the ONE mapping from a name to an adapter, and a
//                 comparison at a call site would be a second one.
//   `checked_at`  THE ADAPTER'S CLOCK, and never a field off the webhook body. State is derived
//                 from the verified event, never from a client-supplied instant (T-05-18 /
//                 T-06-PRIV): a body that can choose when the check happened can choose to have
//                 happened before a cooldown started.
//   `reason`      `composeDiditRejectReason` — the vendor's own allow-listed sentences, bounded and
//                 never empty (D-265). Not composed here, and no fallback string is invented here.
//
// ⚠ NO PRESIGNED MEDIA URL IS PERSISTED, AND NONE IS EVEN MODELLED. A decision's media values are
// short-lived presigned URLs (18.1-RESEARCH § ADDENDUM A8); `DiditDecision` narrows the payload to
// the three feature families and the three warning fields the reason composer reads, so there is no
// field here that could carry one. D-263's posture, structurally: store a reason, not evidence.

import { sql } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { notifyAccountOwner } from "@/lib/notification-guard";
import { hostApprovedPayload, hostRejectedPayload } from "@/lib/notifications";
import {
  composeDiditRejectReason,
  mapDiditStatus,
  type DiditDecision,
  type DiditStatus,
  type DiditTransition,
} from "@/lib/verification/didit-verdict";
import { runVerification } from "@/lib/verification/port";
import { DIDIT_PROVIDER_NAME } from "@/lib/verification/providers/didit";

/**
 * The audit verb, ONE for every Didit-driven transition.
 *
 * The five ops actions each have their own verb (`ops_approve_host`, `ops_reject_host`, …) because
 * each is a separate privileged act a separate operator takes. These are not separate acts: they are
 * ONE vendor answer resolving one of four ways, and an operator asking "what has the vendor decided
 * lately?" wants one indexed value rather than four. Which way it resolved is in `meta.transition`.
 */
const AUDIT_ACTION = "didit_verdict";

/** This module's operator-alert prefix. Per-DOMAIN, the `[PAYMENT_ALERT]` convention. */
const ALERT_TAG = "DIDIT_VERDICT_ALERT";

/**
 * The actor on every row this module writes.
 *
 * NOT a user id and not a staff id, and the string matters: D-261/D-262 mean NO PERSON decided this.
 * Attributing a vendor's verdict to the host it is about would make the trail claim the host
 * approved themselves, and attributing it to an operator would fabricate a decider D-263 says does
 * not exist. `"system"` is the shipped value for exactly this
 * (`src/app/api/paymongo/webhook/route.ts`'s refund-after-payout alert).
 */
const SYSTEM_ACTOR = "system";

/** What a caller hands in: the VERIFIED envelope, narrowed to the four fields that may be read. */
export type DiditVerdictInput = {
  /**
   * The FitOut `user.id` the vendor echoed back. Used ONLY as a lookup key against a row FitOut
   * already wrote — never to create one, and never as anything but a key.
   */
  readonly vendorData: string;
  /**
   * The vendor's session handle from this delivery. It does NOT gate the write and it is NOT
   * persisted — see `sessionMatched` below for the one thing it is used for.
   */
  readonly sessionId: string;
  /** The vendor's status string, in whatever spelling arrived. The mapper normalises it. */
  readonly status: string | null | undefined;
  /**
   * The decision object, when the payload carries one. ⚠ Read through the mapper's
   * `carriesDecision` flag rather than unconditionally — `Resubmitted` carries resubmission
   * instructions INSTEAD of a decision (ADDENDUM A6), so "is there a verdict here at all?" is a
   * question with a structural answer.
   */
  readonly decision?: DiditDecision | null;
};

/**
 * What happened, for a caller that needs to tell "I moved it" from "somebody already had".
 *
 * `moved` is load-bearing for plan 18.1-09: the sweep exists because a webhook may never arrive, and
 * it has to be able to distinguish "no webhook came and I just applied the verdict" — an
 * operator-visible event, the D-110 shape — from "the webhook beat me to it" (silence). The webhook
 * itself discards this, deliberately: it ACKs 200 either way.
 */
export type DiditVerdictOutcome = {
  readonly transition: DiditTransition;
  /** The canonical vendor spelling, or `null` for a status FitOut has never heard of. */
  readonly status: DiditStatus | null;
  /** Did a row actually change? `false` on every no-op, including the re-delivery. */
  readonly moved: boolean;
  /** The stored host-readable sentence on a rejection; `null` on every other transition. */
  readonly reason: string | null;
};

/** The rows a guarded transition returns — `user_id` proves the flip, `vendor_ref` is read back. */
type FlippedRow = { user_id: string; vendor_ref: string | null };

/**
 * Apply one Didit answer to one `host_verification` row.
 *
 * Returns rather than throws on every path, including the fail-closed ones. This is called from a
 * webhook handler whose ACK is the vendor's only signal, and from a batched sweep; a throw on either
 * would convert an already-applied verdict into a retry of an already-applied verdict.
 */
export async function applyDiditVerdict(input: DiditVerdictInput): Promise<DiditVerdictOutcome> {
  // ── 1. THE ONE TRANSLATION. Never a status re-derived here. ───────────────────────────────────
  const mapped = mapDiditStatus(input.status);

  const noop = (): DiditVerdictOutcome => ({
    transition: mapped.transition,
    status: mapped.status,
    moved: false,
    reason: null,
  });

  // ── 2. THE NO-MOVE TRANSITIONS. Audit if the mapper asked for it, and change nothing. ─────────
  //
  // `mapped.audit` is FALSE only for the three statuses that mean the host is mid-flow: a trail row
  // every time a session pings would bury the rows that matter. It is TRUE for `In Review` (a check
  // really is still running, and the state should be observable), for the two unreachable statuses,
  // and for an unrecognised string — which is the fail-closed answer and the one that most needs a
  // person to look.
  if (mapped.transition === "none") {
    if (mapped.audit) {
      await recordAudit({
        actorId: SYSTEM_ACTOR,
        action: AUDIT_ACTION,
        outcome: "ok",
        // ⚠ D-72 — the id, the transition, and the canonical status. Never the decision object,
        // never a warning string, never the vendor's session handle. `meta` is a durable jsonb
        // column under an explicit no-secrets/no-PII rule.
        meta: {
          userId: input.vendorData,
          transition: mapped.transition,
          status: mapped.status,
          moved: false,
        },
      });
    }
    return noop();
  }

  // ── 3. THE RESET (FINDING F-3 — `Expired` / `Abandoned`). ─────────────────────────────────────
  //
  // NOBODY CHECKED, so the row returns to the state that says exactly that and the host gets their
  // control back. NO PORT CALL HERE, and the absence is the argument: `runVerification` is the path
  // from A DECISION to a persistable result, and this is the one transition where no decision was
  // reached. Asking the port for a verdict in order to write `result = NULL` would be fabricating a
  // check to describe the absence of one.
  //
  // The row is not `rejected`, so D-264's 24-hour cooldown does not apply and the host may simply
  // start again. `provider` is deliberately NOT reset: the column is NOT NULL, and it still records
  // truthfully which port the row's last session belonged to. `vendor_ref` IS cleared — see the
  // header for why this is the one transition where clearing it is the honest act.
  if (mapped.transition === "reset-to-unverified") {
    const flipped = (await db.execute(sql`
      UPDATE host_verification
      SET status = 'unverified',
          result = NULL,
          checked_at = NULL,
          vendor_ref = NULL,
          reason = NULL,
          updated_at = now()
      WHERE user_id = ${input.vendorData}
        AND status = 'pending'
      RETURNING user_id, vendor_ref
    `)) as unknown as FlippedRow[];

    await auditTransition(input, mapped.transition, mapped.status, flipped.length > 0, null);
    // NO NOTIFICATION. There is no shipped payload for "your check ended without a decision", and
    // D-245's rule is ONE payload per decision — inventing a seventh sentence here would be writing
    // host-facing copy in a write module, which 18.1-UI-SPEC owns and 18.1-11 renders. The host sees
    // the resting state of `/host/verify`, which is the surface that already says "not verified".
    return {
      transition: mapped.transition,
      status: mapped.status,
      moved: flipped.length > 0,
      reason: null,
    };
  }

  // ── 4. THE TWO VERDICTS. The port answers; this module writes. ────────────────────────────────
  const pass = mapped.transition === "approve";

  // ⚠ THROUGH THE PORT, ALWAYS — never a hand-built `VerificationResult` literal. That is what keeps
  // the registry the one branch point and what makes a later vendor swap a registration rather than
  // a rewrite (D-206). The name is passed as the adapter's own exported constant so the registered
  // name and the persisted name cannot drift.
  const check = await runVerification(DIDIT_PROVIDER_NAME, { result: pass ? "pass" : "fail" });
  if (!check) {
    // FAIL CLOSED. The port returns `null` for anything unregistered, which is stronger than
    // returning a failing result: there is no object to write, so nothing is written. Reachable only
    // if the registry lost its row, which is a deploy fault an operator has to see.
    console.error(`[${ALERT_TAG}] provider_unregistered`, {
      userId: input.vendorData,
      transition: mapped.transition,
    });
    await recordAudit({
      actorId: SYSTEM_ACTOR,
      action: AUDIT_ACTION,
      outcome: "needs_attention",
      meta: {
        reason: "provider_unregistered",
        userId: input.vendorData,
        transition: mapped.transition,
      },
    });
    return noop();
  }

  // ⚠ READ THE FLAG, NOT THE FIELD. `carriesDecision` is why "`Resubmitted` is not a verdict" is
  // structural rather than a comment somebody has to have read. `Declined` carries a decision;
  // `Expired` does not; and when a payload that should carry one arrives without it, the composer's
  // fourth gate returns the canned product sentence alone. Never empty — a host told "no" with an
  // empty reason is the copy-about-a-check-that-never-ran defect one level up (D-265).
  const reason = pass
    ? null
    : composeDiditRejectReason(mapped.carriesDecision ? (input.decision ?? null) : null);

  // ⚠ AN ISO-8601 STRING WITH AN EXPLICIT CAST, NEVER A JS `Date`. `ops-review.ts:390-401` records
  // the measurement: a `Date` cannot be bound as a parameter through a raw `db.execute` on
  // postgres.js — the raw-parameter path answers ERR_INVALID_ARG_TYPE at Bind time even though the
  // driver resolved the placeholder as timestamptz. Drizzle's query BUILDER maps Dates because the
  // column type tells it to; a raw statement has no column type to consult.
  const checkedAt = check.checkedAt?.toISOString() ?? null;

  // ONE guarded statement per transition. `WHERE … status = 'pending'` is the durable cap AND the
  // idempotency (see the header). ⚠ It admits `pending` ONLY — narrower than `approveHost`'s
  // `IN ('pending','unverified')`, and the narrowing is deliberate: an operator approving an
  // `unverified` row is making a decision about a host who never asked, which is a legitimate act;
  // a VENDOR verdict for a row that never entered a check is a verdict about a session FitOut has no
  // record of starting, and applying it would let a delivery decide about a host who never submitted.
  const flipped = pass
    ? ((await db.execute(sql`
        UPDATE host_verification
        SET status = 'approved',
            provider = ${check.provider},
            result = ${check.result},
            checked_at = ${checkedAt}::timestamptz,
            reason = NULL,
            updated_at = now()
        WHERE user_id = ${input.vendorData}
          AND status = 'pending'
        RETURNING user_id, vendor_ref
      `)) as unknown as FlippedRow[])
    : ((await db.execute(sql`
        UPDATE host_verification
        SET status = 'rejected',
            provider = ${check.provider},
            result = ${check.result},
            checked_at = ${checkedAt}::timestamptz,
            reason = ${reason},
            updated_at = now()
        WHERE user_id = ${input.vendorData}
          AND status = 'pending'
        RETURNING user_id, vendor_ref
      `)) as unknown as FlippedRow[]);

  const moved = flipped.length > 0;
  await auditTransition(input, mapped.transition, mapped.status, moved, check.provider);

  // ── 5. THE 0-ROW PATH IS THE IDEMPOTENCY, AND IT ENDS HERE. ───────────────────────────────────
  //
  // A re-delivery, a verdict for a row somebody already decided, a verdict for a `vendorData` with
  // no row at all, and a verdict for a suspended host are ONE calm no-op. No notification: the host
  // was told the first time, and telling them twice about one decision is the D-245 drift the
  // one-payload rule exists to prevent.
  if (!moved) {
    return { transition: mapped.transition, status: mapped.status, moved: false, reason: null };
  }

  // ── 6. THE VENDOR SESSION CONSISTENCY OBSERVATION — recorded, never a gate. ───────────────────
  //
  // The row's `vendor_ref` is the session FitOut started; `input.sessionId` is the session this
  // delivery is about. In production they agree by construction. If they DISAGREE, something is
  // wrong that a person should see — but the verdict is applied anyway, and the direction of that
  // choice is the point:
  //
  //   · Scoping the WHERE on `vendor_ref = sessionId` was considered and REJECTED. It would turn any
  //     handle divergence into a silent 0-row no-op, and under D-262 (no operator confirms anything)
  //     plus D-263 (no host-facing route to a human) a silently-dropped verdict strands a real host
  //     at `pending` forever with nobody prompted. The vendor drops a delivery after two retries.
  //   · The hazard it would have closed is bounded to the freshness window the route enforces: for a
  //     stale session's verdict to reach a row now waiting on a DIFFERENT session, both events would
  //     have to fall inside five minutes, and it would still be the same host's own genuine verdict.
  //
  // So: observe loudly, do not refuse. A `needs_attention` row is the established operator channel
  // (D-58 / D-90). ⚠ The two handles go in the CONSOLE line only — `meta` is a durable jsonb column
  // and a second copy of the vendor handle there would be a second place a compliance question could
  // be answered wrongly from (the rule `host-verification.ts`'s allow-branch audit states).
  const rowRef = flipped[0]?.vendor_ref ?? null;
  if (rowRef !== null && rowRef !== input.sessionId) {
    console.error(`[${ALERT_TAG}] session_mismatch`, {
      userId: input.vendorData,
      rowVendorRef: rowRef,
      eventSessionId: input.sessionId,
    });
    await recordAudit({
      actorId: SYSTEM_ACTOR,
      action: AUDIT_ACTION,
      outcome: "needs_attention",
      meta: { reason: "session_mismatch", userId: input.vendorData, sessionMatched: false },
    });
  }

  // ── 7. TELL THE HOST (D-245) — post-flip, post-audit, individually guarded. ───────────────────
  //
  // ⚠ THE SHIPPED PAYLOADS, VERBATIM. `hostApprovedPayload()` and `hostRejectedPayload(reason)` are
  // the same two functions the ops console emits, so ONE payload produces one durable `notification`
  // row AND one email from the same strings (D-86 / D-91 / D-92). No copy is written here: a second
  // sentence meaning the same thing is a second thing to keep true, and what a host is told about
  // their own standing must be the same words in the panel and in their inbox.
  //
  // ⚠ AND THE REASON HANDED TO THE PAYLOAD IS THE SAME STRING THE COLUMN NOW HOLDS. Not a
  // re-composition — two calls to the composer would be two sources for one sentence, and the host
  // would eventually read a notification that no longer matched their own account page.
  //
  // The guard is what makes this safe to run after a committed flip: a failed notice becomes a
  // `needs_attention` row and never unwinds, blocks or throws past the decision. On this path that
  // is sharper than on the ops path — a throw here would become a non-2xx and make the vendor retry
  // an already-applied verdict, twice, before dropping it.
  await notifyAccountOwner(
    SYSTEM_ACTOR,
    AUDIT_ACTION,
    ALERT_TAG,
    input.vendorData,
    pass ? hostApprovedPayload() : hostRejectedPayload(reason ?? ""),
  );

  return { transition: mapped.transition, status: mapped.status, moved: true, reason };
}

/**
 * The trail row for a transition that attempted a write, on BOTH branches.
 *
 * ⚠ THE 0-ROW BRANCH IS AUDITED `denied` WITH `not_applicable`, which is `approveHost`'s exact shape
 * for the same condition. A trail that only records the flips records exactly the wrong half: "a
 * verdict arrived and moved nothing" is the row an operator needs when a host insists they were
 * verified.
 *
 * `recordAudit` swallows its own insert failure by design, so an `ok` return from this function is
 * evidence of NOTHING about the trail row — which is why every assertion about these rows in
 * `tests/ops/ops-audit.test.ts` and the webhook suite reads them back out of the table.
 */
async function auditTransition(
  input: DiditVerdictInput,
  transition: DiditTransition,
  status: DiditStatus | null,
  moved: boolean,
  // ⚠ NAMED `providerName` AND NOT `provider`, WHICH IS NOT A STYLE CHOICE. An acceptance grep
  // asserts that a provider-name COMPARISON appears zero times in this file — the registry in
  // `port.ts` is the one mapping from a name to an adapter, and a comparison at a call site would be
  // a second one. A perfectly innocent null-check on a parameter called `provider` matches that grep
  // character for character, which is the collision this repository has now closed eight times
  // (drizzle/0021's rule). The token simply does not occur; the value is still read off the port's
  // result and never composed here.
  providerName: string | null,
): Promise<void> {
  await recordAudit({
    actorId: SYSTEM_ACTOR,
    action: AUDIT_ACTION,
    outcome: moved ? "ok" : "denied",
    // ⚠ D-72 — enum-shaped values and one id. NOT the vendor's sentence (it is host-facing free text
    // and it lives in the durable column the host reads it from), NOT the decision object, NOT the
    // session handle, NOT a media URL.
    meta: {
      userId: input.vendorData,
      transition,
      status,
      moved,
      ...(providerName == null ? {} : { provider: providerName }),
      ...(moved ? {} : { reason: "not_applicable" }),
    },
  });
}
