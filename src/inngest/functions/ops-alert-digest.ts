// The daily UNRESOLVED-money-alert digest — the FIFTH cron, and the first thing in this project that
// PUSHES a `needs_attention` audit row at a human instead of waiting to be asked.
//
// WHY THIS EXISTS. ~20 call sites across booking.ts, cancel-booking.ts, the PayMongo webhook, notify.ts and
// guest-email.ts write `outcome: 'needs_attention'` audit rows on money seams — failed auto-refunds,
// `refund_after_payout`, stranded checkout sessions, host-cancel autoblock failures, permanently-failed
// notification sends, and the QRPh/UBP unrefundable-rail alert. Until now NOTHING queried them on a
// schedule and NOTHING surfaced them: `src/lib/db/schema.ts:344-346` said so plainly ("there is no ops UI
// anywhere in this project yet"). A durable row nobody reads is a record, not redress.
//
// WHAT THIS DOES **NOT** CLOSE — stated here so no future reader infers otherwise from the existence of an
// alert pipeline. This closes the REACHABILITY half of T-08-74 only. The other half is a PAYMONGO RAIL
// LIMITATION: an already-captured QRPh payment is NOT REFUNDABLE THROUGH THE PAYMONGO API AT ALL (see
// `createRefund`'s docblock in src/lib/paymongo.ts — the refundable rails are card, gcash, grab_pay,
// paymaya). No code in this repository can change that, this cron included. T-08-74 stays OPEN and
// AR-08-01 stands. What changed is that the alert now reaches a human and can be discharged.
//
// D-J3Z-03 — THE SLOT: `TZ=Asia/Manila 50 8 * * *`, daily at 08:50 Manila, singleton (`concurrency: 1`).
// Minute 50 is occupied by none of the four existing crons, which are all HOURLY on :00 (payout sweep),
// :15 (request expiry), :30 (payout reconcile) and :45 (reminders) — so at 08:00/:15/:30/:45 they tick and
// at :50 nothing else is running (Pitfall 4, the offset-minutes discipline this file inherits). 08:50 puts
// the digest at the TOP of the operator's working day rather than overnight, where an alert about real held
// money would sit unread for hours.
//
// D-J3Z-05 — SILENCE ON A ZERO-ROW DAY IS THE DESIGN. No email at all: not an "all clear", not an empty
// table. A daily "nothing to report" is exactly how an alert channel gets filtered to trash, and once it is
// filtered, the one day it carries real held money is the day nobody opens it. The recipient check comes
// SECOND for the same reason — a daily "you forgot to configure me" error on an empty queue is the same
// failure in a different sink. The Inngest run's return value is the record that the pass happened.
//
// D-J3Z-04 — A MISSING `OPS_ALERT_EMAIL` LOGS LOUDLY AND NO-OPS. It must not throw, and there are TWO
// SEPARATE reasons which are worth keeping apart because they defend against different mistakes:
//
//   (a) A MODULE-LOAD throw would take down the entire `/api/inngest` mount — payout sweep, reconcile,
//       request expiry, notify, guest-email and reminders, all six, over a missing notification address.
//       That failure mode is already PREVENTED here by D-J3Z-06 (both env vars are read at CALL time, not
//       at module load), so it is a hazard this file is built not to have, rather than a live risk.
//   (b) A CALL-TIME throw — e.g. inside `step.run` — would fail ONLY this run, not `serve()` for the other
//       five. That is a genuinely available option, and it is still declined: it manufactures a failed run
//       in the Inngest dashboard whose actual content is "a notification address is unset", which is a
//       configuration gap, not an incident. Logging instead keeps the daily run GREEN and degrades the
//       alert to the `console.error` sink these rows already had before this cron existed. A red run that
//       says nothing about the underlying money is worse signal than a green run plus a loud log line
//       carrying the actual audit ids.
//
// This is deliberately the OPPOSITE of the `INNGEST_SIGNING_KEY` boot guard at route.ts:29-37, and the
// asymmetry is stated so it is not "corrected" later: that guard protects a SECURITY property (an
// unverified serve endpoint an unauthenticated caller could hit), where failing closed at boot is right.
// A notification ADDRESS is not that.
//
// D-J3Z-08 — THE AGE USES THE JS CLOCK, AND THAT IS ALLOWED HERE. payout-reconcile.ts:25-27 sets the
// precedent explicitly: "only the stuck-age comparison uses createdAt vs Date.now() (advisory alert timing,
// not a money-moving decision)". The aging flag moves no money and gates nothing — it decorates a line in
// an email. Everything that decides anything (which rows are unresolved, when one was discharged) is on the
// POSTGRES clock, in src/lib/ops/alerts.ts.

import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import type { DbConn } from "@/lib/availability/read-model";
import { listUnresolvedAlerts, DEFAULT_ALERT_LIMIT } from "@/lib/ops/alerts";
import { sendOpsAlertDigest, type OpsDigestRow } from "@/lib/email";

/**
 * Age past which an unresolved alert is flagged AGING in the digest. 24h because the digest is DAILY — a
 * row that shows up in two consecutive digests is, by definition, one nobody has dealt with.
 */
export const AGING_HOURS_DEFAULT = 24;

/**
 * Read the aging threshold at CALL time (D-J3Z-06), deliberately unlike payout-reconcile.ts:40 which reads
 * its threshold at module load. Two reasons: the unset-recipient behaviour must be OBSERVABLE in a test,
 * and tests/setup.ts:15-16 loads `.env.local` into the test process, so a module-load read would freeze
 * whatever that file happened to contain at import time. Falls back to the default when unset or unparseable
 * — a typo in an env var must not turn every row into "0h, aging" or NaN.
 */
export function agingHours(): number {
  const n = Number(process.env.OPS_ALERT_AGING_HOURS);
  return Number.isFinite(n) && n > 0 ? n : AGING_HOURS_DEFAULT;
}

/** The outcome of one digest pass. JSON-serializable so it can be the body of an Inngest `step.run`. */
export type DigestResult =
  | { sent: false; reason: "no_unresolved" }
  | { sent: false; reason: "no_recipient"; count: number }
  | { sent: true; count: number; aging: number; truncated: boolean };

/**
 * The whole testable core of the digest. Kept OUT of the Inngest handler so every branch below is reachable
 * from a plain integration call — a branch only reachable through a scheduler is a branch nothing measures.
 */
export async function buildAndSendDigest(dbConn: DbConn): Promise<DigestResult> {
  // LIMIT + 1: one query answers both "which rows" and "are there more than we will show", with no separate
  // COUNT and no claim the rendered list cannot back (D-J3Z-09).
  const rows = await listUnresolvedAlerts(dbConn, { limit: DEFAULT_ALERT_LIMIT + 1 });

  // ZERO ROWS → NOTHING HAPPENS. Before the recipient check, no email, and NO error log (D-J3Z-05).
  if (rows.length === 0) return { sent: false, reason: "no_unresolved" };

  const to = process.env.OPS_ALERT_EMAIL;
  if (!to) {
    // Loud, and carrying the ids — so the alert DEGRADES to the console sink it already had rather than
    // vanishing. Never a throw (D-J3Z-04).
    console.error("[ops-alert] OPS_ALERT_EMAIL unset — unresolved needs_attention alerts NOT emailed", {
      count: rows.length,
      ids: rows.map((r) => r.id),
    });
    return { sent: false, reason: "no_recipient", count: rows.length };
  }

  const truncated = rows.length > DEFAULT_ALERT_LIMIT;
  const shown = truncated ? rows.slice(0, DEFAULT_ALERT_LIMIT) : rows;
  const threshold = agingHours();
  const now = Date.now();

  const digestRows: OpsDigestRow[] = shown.map((r) => {
    const age = Math.floor((now - r.createdAt.getTime()) / 3_600_000);
    return {
      id: r.id,
      action: r.action,
      actorId: r.actorId,
      createdAt: r.createdAt,
      ageHours: age,
      aging: age >= threshold,
    };
  });

  await sendOpsAlertDigest(to, digestRows, { truncated, limit: DEFAULT_ALERT_LIMIT });

  return {
    sent: true,
    count: digestRows.length,
    aging: digestRows.filter((r) => r.aging).length,
    truncated,
  };
}

/**
 * The daily digest cron. SINGLETON (`concurrency: 1`) on the 08:50 Manila slot — see D-J3Z-03 in the header.
 * The handler is deliberately thin: all behaviour lives in `buildAndSendDigest`.
 */
// NOTE: inngest 4.13.0 uses the 2-arg createFunction(options, handler) form — the cron trigger lives in
// options.triggers (same shape as payout-reconcile.ts:164-172).
export const opsAlertDigest = inngest.createFunction(
  {
    id: "ops-alert-digest",
    concurrency: 1, // singleton — no overlapping digest passes
    triggers: [{ cron: "TZ=Asia/Manila 50 8 * * *" }], // daily 08:50 Manila; collides with no existing cron
  },
  async ({ step }) => step.run("digest", () => buildAndSendDigest(db)),
);
