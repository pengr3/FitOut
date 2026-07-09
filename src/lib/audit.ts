// Append-only audit-trail helper for privileged, money-adjacent actions (WR-06 closure).
//
// WHY THIS EXISTS: Phase-1 review deferred WR-06 (01-REVIEW.md) — privileged capability escalations
// (activateHosting/activateBooking; canHost later unlocks PayMongo payouts in Plan 06) had NO audit
// trail, so an escalation was non-repudiable by absence: nothing recorded WHO escalated, WHEN, with
// WHAT outcome. recordAudit makes every privileged flip OBSERVABLE (threat T-02-AUDIT / repudiation).
//
// v1 SCOPE (documented tradeoff): this writes a single structured `console.info("[audit]", <json>)`
// line (with an ISO timestamp) to the server log — deliberately NOT a durable DB table (STATE.md
// "do not over-build"). A durable, queryable audit table is the future hardening; what WR-06
// requires NOW is that privileged escalations are observable. The entry shape (actorId + action +
// outcome [+ meta]) is intentionally stable so a durable sink can adopt it later unchanged, and the
// function is async so that swap needs no call-site changes.

export type AuditOutcome = "ok" | "denied" | "error";

export interface AuditEntry {
  /** The authenticated identity performing the action (server-resolved, never client-supplied). */
  actorId: string;
  /** The privileged action name, e.g. "activateHosting". */
  action: string;
  /** Result of the privileged attempt. */
  outcome: AuditOutcome;
  /** Optional structured context (e.g. `{ reason: "rate_limit" }`). Must not contain secrets/PII. */
  meta?: Record<string, unknown>;
}

/**
 * Record a privileged-action audit entry. Async so a durable sink (DB/queue) can drop in later
 * without touching call sites; v1 emits one structured, timestamped server-log line.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  const line: Record<string, unknown> = {
    ts: new Date().toISOString(),
    actorId: entry.actorId,
    action: entry.action,
    outcome: entry.outcome,
  };
  if (entry.meta) line.meta = entry.meta;
  console.info("[audit]", JSON.stringify(line));
}
