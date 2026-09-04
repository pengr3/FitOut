// Append-only audit-trail helper for privileged, money-adjacent actions (WR-06 closure).
//
// WHY THIS EXISTS: Phase-1 review deferred WR-06 (01-REVIEW.md) — privileged capability escalations
// (activateHosting/activateBooking; canHost later unlocks PayMongo payouts in Plan 06) had NO audit
// trail, so an escalation was non-repudiable by absence: nothing recorded WHO escalated, WHEN, with
// WHAT outcome. recordAudit makes every privileged flip OBSERVABLE (threat T-02-AUDIT / repudiation).
//
// v1 SCOPE, NOW CLOSED (WR-06-DURABLE). This shipped deliberately WITHOUT a durable DB table: one
// structured `console.info("[audit]", <json>)` line to the server log, because what WR-06 required THEN
// was that privileged escalations are observable, and STATE.md says "do not over-build". The entry shape
// (actorId + action + outcome [+ meta]) was kept intentionally stable so a durable sink could adopt it
// later unchanged, and the function was made `async` so that swap would need no call-site changes. It
// DID: `audit` (src/lib/db/schema.ts) now backs this function, and the swap cost zero changes at all 57
// awaited call sites across 11 files — the shape and the `async` signature carried it exactly as designed.
//
// BOTH SINKS FIRE, ALWAYS — never one instead of the other. The console line is the currently-shipped,
// alert-matched behaviour and is emitted FIRST and unconditionally (D2), so a slow, hung or failing
// database can neither delay it nor lose it, and if the process is killed mid-INSERT the line has already
// flushed. The durable row is strictly ADDITIVE evidence, never a replacement for the log trail.

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { audit } from "@/lib/db/schema";

// "needs_attention" (Phase 5, D-58) flags a money-adjacent condition that could not be auto-resolved and
// requires an operator — e.g. a slot-gone payment on an unrefundable rail (QRPh/UBP) or a failed auto-
// refund. Surfacing it (never swallowing it) is the honest, correct behavior for held-but-undeliverable money.
// These are the rows the durable table exists for: an operator answers "what money is outstanding?" with
// `WHERE outcome = 'needs_attention' AND resolved_at IS NULL ORDER BY created_at DESC` (audit_needs_attention_idx).
export type AuditOutcome = "ok" | "denied" | "error" | "needs_attention";

export interface AuditEntry {
  /** The authenticated identity performing the action (server-resolved, never client-supplied). */
  actorId: string;
  /** The privileged action name, e.g. "activateHosting". */
  action: string;
  /** Result of the privileged attempt. */
  outcome: AuditOutcome;
  /**
   * Optional structured context (e.g. `{ reason: "rate_limit" }`). Must not contain secrets/PII — and
   * that rule now binds a STORED COLUMN, not only a log line: this value lands in `audit.meta`, a durable
   * jsonb column (D-72: "not in this audit meta, not in any log line, not in any column").
   */
  meta?: Record<string, unknown>;
}

/**
 * Record a privileged-action audit entry. Emits the structured server-log line AND writes a durable,
 * queryable `audit` row. The order is the design (D2) — log first, then insert.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  const line: Record<string, unknown> = {
    ts: new Date().toISOString(),
    actorId: entry.actorId,
    action: entry.action,
    outcome: entry.outcome,
  };
  if (entry.meta) line.meta = entry.meta;

  // The log line is emitted FIRST and unconditionally, before the database is touched at all.
  //
  // The serialisation is GUARDED because `meta` is the one loosely-typed field here
  // (Record<string, unknown>), so a circular reference or a BigInt would make JSON.stringify throw
  // SYNCHRONOUSLY out of a function that 57 callers await, most of them inside `catch` blocks on money
  // paths. Every call site passes primitive-valued meta today, so there is no live trigger — but this
  // function's contract is "cannot throw" without qualification, and a guarantee that only holds for the
  // durable half is not the guarantee. The failure branch degrades to a MINIMAL still-useful line (the
  // four fields an operator needs to find the seam) rather than propagating. No "did we log?" bookkeeping:
  // exactly one of the two branches emits, always.
  try {
    console.info("[audit]", JSON.stringify(line));
  } catch {
    const fallback: Record<string, unknown> = {
      ts: line.ts,
      actorId: String(entry.actorId),
      action: String(entry.action),
      outcome: String(entry.outcome),
    };
    if (entry.meta) fallback.meta = "[unserializable]";
    console.info("[audit]", JSON.stringify(fallback));
  }

  // THE SWALLOW IS DELIBERATE. recordAudit is awaited at 57 call sites and many of them sit inside
  // `catch` blocks on money paths — the PayMongo webhook's unrefundable-rail branch, most of
  // cancel-booking.ts's 21. A thrown INSERT there would convert an ALREADY-HANDLED failure into an
  // unhandled 500 and stop the webhook returning 200, making PayMongo retry against the confirm
  // authority. Losing an audit ROW is acceptable; losing the ACK is not. And the log line above has
  // already been emitted, so a swallowed insert leaves the trail no worse than it was before this table
  // existed. Same idiom, same reasoning as `releaseCheckoutLease` (src/lib/payments/checkout-lease.ts):
  // "BEST-EFFORT by design … it must never convert a calm refusal into a thrown 500 on the money path."
  //
  // AWAITED, not `void`ed (D1). The project already reversed a `void` on this exact path —
  // src/app/api/paymongo/webhook/route.ts:208-214: "voiding an enqueue is actively worse than awaiting
  // it here — the handler can return and the runtime can freeze the process before an un-awaited
  // outbound request has flushed." A detached audit INSERT fails in precisely the case this table exists
  // for: the webhook returns 200 and the runtime freezes before the row flushes, losing the QRPh alert
  // exactly when it matters. A bounded Promise.race was considered and rejected — it does not CANCEL the
  // query, so it buys a late-landing-row failure mode for nothing.
  //
  // `createdAt` is deliberately NOT passed: the Postgres `now()` default is the authority (the project's
  // zero-JS-clock rule, src/lib/units.ts). It and the line's `ts` differ by the insert latency, which is
  // correct — the console `ts` stays the JS attempt time it has always been.
  try {
    await db.insert(audit).values({
      id: randomUUID(),
      actorId: entry.actorId,
      action: entry.action,
      outcome: entry.outcome,
      meta: entry.meta,
    });
  } catch {
    // Swallowed on purpose — see the note above.
  }
}
