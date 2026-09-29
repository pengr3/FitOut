import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import type { DbConn } from "@/lib/availability/read-model";
import type { UnresolvedAlert } from "@/lib/ops/alerts";

/** Only fixed, public-safe codes cross into the durable audit record. */
export type PayoutExceptionCause =
  | "settlement_missing" | "settlement_returned" | "settlement_read_unavailable"
  | "wallet_unavailable" | "wallet_insufficient" | "transfer_failed"
  | "transfer_stuck" | "transfer_read_unavailable" | "transfer_outcome_uncertain"
  | "payout_basis_missing" | "missed_friday_cutoff" | "destination_action_required";

const NEXT_ACTION: Record<PayoutExceptionCause, string> = {
  settlement_missing: "Verify the booking payment in a deposited merchant payout; retain HOLD until correlated proof exists.",
  settlement_returned: "Investigate the returned merchant settlement and recover funding before any host release.",
  settlement_read_unavailable: "Restore provider read access, inspect current settlement status, and re-run reconciliation.",
  wallet_unavailable: "Verify Wallet destination, fee schedule, and a fresh available-balance read; retain HOLD.",
  wallet_insufficient: "Reconcile Wallet available funds and reserved transfers; retry in the next eligible Friday window.",
  transfer_failed: "Inspect the terminal transfer, resolve the funding or destination issue, then use the guarded recovery path.",
  transfer_stuck: "Read the transfer or held claim by booking reference and reconcile its provider outcome.",
  transfer_read_unavailable: "Restore transfer read-back and reconcile the existing claim before any retry.",
  transfer_outcome_uncertain: "Find the existing transfer by reference; do not post another transfer blindly.",
  payout_basis_missing: "Verify the frozen booking payout basis before any transfer can be claimed.",
  missed_friday_cutoff: "Identify the blocking settlement, funds, transfer, or host gate and own recovery for the next Friday cohort.",
  destination_action_required: "Contact the host to complete payout destination setup; keep automated release on HOLD.",
};

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

/** A non-reversible reference operators can match locally without exporting the booking id in mail. */
export function bookingExceptionRef(bookingId: string): string {
  return sha(`fitout:booking:${bookingId}`).slice(0, 16);
}

/** The Friday noon whose release window contains this observation, or the next one. */
export function exceptionFridayCohort(observedAt: Date): string {
  if (!Number.isFinite(observedAt.getTime())) throw new Error("Invalid exception observation time");
  const manila = new Date(observedAt.getTime() + 8 * 3_600_000);
  const days = (5 - manila.getUTCDay() + 7) % 7;
  const noon = new Date(Date.UTC(manila.getUTCFullYear(), manila.getUTCMonth(), manila.getUTCDate() + days, 4));
  if (noon < observedAt) noon.setUTCDate(noon.getUTCDate() + 7);
  // On Friday after noon the current release cohort, not next week, owns an incident.
  if (manila.getUTCDay() === 5 && manila.getUTCHours() >= 12) noon.setUTCDate(noon.getUTCDate() - 7);
  return noon.toISOString();
}

function exceptionId(bookingId: string, cause: PayoutExceptionCause, cohort: string): string {
  const hex = sha(`fitout:money-exception:v1:${bookingId}:${cause}:${cohort}`);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/**
 * One row per booking/cause/Friday cohort. The primary-key conflict is the concurrency lock:
 * a resolved row cannot be reopened and a concurrent observation changes only lastObservedAt.
 * Throw on a failed INSERT so a money worker cannot mistake a log line for durable handoff.
 */
export async function recordMoneyException(
  dbConn: DbConn, bookingId: string, cause: PayoutExceptionCause, observedAt: Date = new Date(),
): Promise<string> {
  if (!bookingId) throw new Error("A payout exception needs a booking reference");
  const cohort = exceptionFridayCohort(observedAt);
  const id = exceptionId(bookingId, cause, cohort);
  const meta = JSON.stringify({ bookingRef: bookingExceptionRef(bookingId), cause, cohort,
    nextAction: NEXT_ACTION[cause] });
  await dbConn.execute(sql`
    INSERT INTO audit (id, actor_id, action, outcome, meta)
    VALUES (${id}, 'system', 'host_payout_recovery', 'needs_attention',
      ${meta}::jsonb || jsonb_build_object('firstObservedAt', now()::text, 'lastObservedAt', now()::text))
    ON CONFLICT (id) DO UPDATE SET
      meta = jsonb_set(audit.meta, '{lastObservedAt}', to_jsonb(now()::text), true)
    WHERE audit.outcome = 'needs_attention' AND audit.resolved_at IS NULL
  `);
  return id;
}

/** Only an owner-scoped caller may pass booking ids. No cause or audit metadata leaves this read. */
export async function unresolvedPayoutAttention(dbConn: DbConn, bookingIds: string[]): Promise<Set<string>> {
  if (bookingIds.length === 0) return new Set();
  const refs = bookingIds.map(bookingExceptionRef);
  const rows = (await dbConn.execute(sql`
    SELECT DISTINCT meta->>'bookingRef' AS ref FROM audit
    WHERE action = 'host_payout_recovery' AND outcome = 'needs_attention' AND resolved_at IS NULL
      AND meta->>'bookingRef' IN (${sql.join(refs.map((ref) => sql`${ref}`), sql`, `)})
  `)) as unknown as Array<{ ref: string }>;
  const active = new Set(rows.map((row) => row.ref));
  return new Set(bookingIds.filter((id) => active.has(bookingExceptionRef(id))));
}

/** The prompt pass reads only unnotified cutoff rows for this Friday, with the same safe mail fields. */
export async function listUnsentFridayCutoffAlerts(
  dbConn: DbConn, now: Date, limit: number,
): Promise<UnresolvedAlert[]> {
  const cohort = exceptionFridayCohort(now);
  const rows = (await dbConn.execute(sql`
    SELECT id, action, actor_id AS "actorId", created_at AS "createdAt"
    FROM audit WHERE action = 'host_payout_recovery' AND outcome = 'needs_attention'
      AND resolved_at IS NULL AND meta->>'cause' = 'missed_friday_cutoff'
      AND meta->>'cohort' = ${cohort}
      AND COALESCE(meta->>'lastDeliveryStatus', '') <> 'sent'
    ORDER BY created_at DESC NULLS LAST LIMIT ${limit}
  `)) as unknown as Array<Omit<UnresolvedAlert, "createdAt"> & { createdAt: Date | string }>;
  return rows.map((row) => ({ ...row, createdAt: new Date(row.createdAt) }));
}

/** Delivery is evidence of an attempt, never resolution or authenticated acknowledgement. */
export async function recordPayoutAlertDelivery(
  dbConn: DbConn, ids: string[], status: "attempting" | "sent" | "failed" | "no_recipient",
): Promise<void> {
  if (ids.length === 0) return;
  await dbConn.execute(sql`
    UPDATE audit SET meta = jsonb_set(
      jsonb_set(meta, '{lastDeliveryAttemptAt}', to_jsonb(now()::text), true),
      '{lastDeliveryStatus}', to_jsonb(${status}::text), true)
    WHERE action = 'host_payout_recovery' AND outcome = 'needs_attention' AND resolved_at IS NULL
      AND id IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
  `);
}

export type PayoutExceptionQueueRow = {
  id: string; bookingRef: string; cause: PayoutExceptionCause | "unknown";
  nextAction: string; createdAt: Date; lastDeliveryStatus: string | null;
};

/** Unbounded local operator view; the external email stays bounded to 200 safe rows. */
export async function listPayoutExceptionQueue(dbConn: DbConn): Promise<PayoutExceptionQueueRow[]> {
  const rows = (await dbConn.execute(sql`
    SELECT id, meta->>'bookingRef' AS "bookingRef", meta->>'cause' AS cause,
      meta->>'lastDeliveryStatus' AS "lastDeliveryStatus", created_at AS "createdAt"
    FROM audit WHERE action = 'host_payout_recovery' AND outcome = 'needs_attention'
      AND resolved_at IS NULL ORDER BY created_at DESC, id DESC
  `)) as unknown as Array<{ id: string; bookingRef: string; cause: string;
    lastDeliveryStatus: string | null; createdAt: Date | string }>;
  return rows.map((row) => {
    const cause = Object.hasOwn(NEXT_ACTION, row.cause) ? row.cause as PayoutExceptionCause : "unknown";
    return {
      id: row.id, bookingRef: /^[a-f0-9]{16}$/.test(row.bookingRef) ? row.bookingRef : "unknown",
      cause, nextAction: cause === "unknown" ? "Inspect the audit row locally and retain HOLD." : NEXT_ACTION[cause],
      lastDeliveryStatus: row.lastDeliveryStatus, createdAt: new Date(row.createdAt),
    };
  });
}

/** Local-only recovery lookup; the durable audit row and email still contain only a hash reference. */
export async function lookupExceptionBooking(dbConn: DbConn, ref: string): Promise<string[]> {
  if (!/^[a-f0-9]{16}$/.test(ref)) return [];
  const matches: string[] = [];
  let cursor = "";
  for (;;) {
    const page = (await dbConn.execute(sql`
      SELECT id FROM booking WHERE id > ${cursor} ORDER BY id LIMIT 500
    `)) as unknown as Array<{ id: string }>;
    for (const row of page) if (bookingExceptionRef(row.id) === ref) matches.push(row.id);
    if (page.length < 500) return matches;
    cursor = page[page.length - 1].id;
  }
}
