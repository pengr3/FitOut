// The unresolved-money-alert operator queue — the D5 query given a real implementation, and the FIRST
// code writer `audit.resolved_at` has ever had.
//
// WHAT THIS IS. `src/lib/db/schema.ts:344-346` states the gap this module closes, in its own words:
// "Its ONLY v1 writer is the operator's own `UPDATE audit SET resolved_at = now() WHERE id = …`; there is
// no ops UI anywhere in this project yet, so a hand-run queue is the complete workflow, not a stub."
// That was honest but incomplete: a durable row that nothing queries on a schedule and nothing can
// discharge is a record, not redress. `listUnresolvedAlerts` turns the D5 query from a thing an operator
// has to KNOW into a thing they RUN (`npm run ops:alerts`, and the daily digest cron), and `resolveAlert`
// gives `resolved_at` a real writer so a handled alert stops re-appearing forever.
//
// NO SCHEMA CHANGE, NO MIGRATION, NO NEW INDEX (D-J3Z-01). `audit_needs_attention_idx` already exists —
// drizzle/0024_audit_table.sql:31:
//     CREATE INDEX "audit_needs_attention_idx" ON "audit" USING btree ("created_at" DESC NULLS LAST)
//       WHERE outcome = 'needs_attention' AND resolved_at IS NULL;
// `listUnresolvedAlerts` therefore carries a predicate byte-identical to that index predicate
// (`outcome = 'needs_attention' AND resolved_at IS NULL`, emitted as a LITERAL — see the measurement at
// the `.where()` below) and orders by
// `created_at DESC NULLS LAST` rather than a plain `.desc()`. The NULLS LAST is not decoration: `DESC`
// alone means NULLS FIRST in Postgres, which does NOT match the index's declared ordering and forces a Sort
// node on top of the scan. Matching it exactly is what keeps the shipped partial index usable — and a
// partial index over only the OPEN rows is what keeps this query O(unresolved) as resolved history grows
// without bound (the retention note at schema.ts:350-354).
//
// THE PII CONTRACT IS ENFORCED STRUCTURALLY, NOT BY A COMMENT (D-J3Z-02). This query selects FOUR EXPLICIT
// COLUMNS — id, action, actor_id, created_at — and `UnresolvedAlert` has no field for the jsonb column that
// is deliberately absent. That column carries booking ids, transfer ids and masked last-4s under an explicit
// column-level rule (D-72), restated verbatim at cancel-booking.ts:755-756: "No account number, no account
// name, no BIC — not in this audit meta, not in any log line, NOT IN ANY COLUMN." These rows are rendered
// into an EMAIL, and email is an external service that forwards, archives and indexes — so widening this
// select would silently widen a column-level contract across a trust boundary. Because the row type has no
// such field, re-exporting it is a TYPE ERROR at every consumer rather than something a reviewer has to
// catch. Where that column IS readable: a local psql / Drizzle Studio session, documented in
// .planning/ops/NEEDS-ATTENTION-RUNBOOK.md. That boundary is the point.

import { sql } from "drizzle-orm";
import type { DbConn } from "@/lib/availability/read-model";
import { audit } from "@/lib/db/schema";

/**
 * One unresolved money alert, as an operator sees it.
 *
 * The four fields here are enough to LOOK THE ROW UP and nothing more. The omission of the jsonb context
 * column is the enforcement mechanism for D-J3Z-02 / D-72 — see the header. Do not add it.
 */
export type UnresolvedAlert = {
  id: string;
  action: string;
  actorId: string;
  createdAt: Date;
};

/**
 * Hard bound on how many alerts one list/digest may carry (D-J3Z-09). An unbounded list rendered into an
 * email is a denial-of-service on the operator's inbox as much as on the mail transport; the digest asks
 * for LIMIT + 1 and states an honest "200+ — showing the 200 newest" line when it gets more.
 */
export const DEFAULT_ALERT_LIMIT = 200;

/**
 * Every UNRESOLVED `needs_attention` audit row, newest first.
 *
 * This is the exact query `src/lib/audit.ts:29` already spelled out in prose — "an operator answers 'what
 * money is outstanding?' with `WHERE outcome = 'needs_attention' AND resolved_at IS NULL ORDER BY
 * created_at DESC`" — now executable. Both halves of the predicate are load-bearing: dropping the resolved
 * half makes the operator re-see every alert they have ever handled, and dropping the outcome half fills a
 * money queue with `ok`/`denied` noise.
 */
export async function listUnresolvedAlerts(
  dbConn: DbConn,
  opts?: { limit?: number },
): Promise<UnresolvedAlert[]> {
  const limit = opts?.limit ?? DEFAULT_ALERT_LIMIT;
  const rows = await dbConn
    .select({
      id: audit.id,
      action: audit.action,
      actorId: audit.actorId,
      createdAt: audit.createdAt,
    })
    .from(audit)
    // BYTE-IDENTICAL to the index predicate, and written as a LITERAL rather than as
    // `and(eq(audit.outcome, "needs_attention"), isNull(audit.resolvedAt))` — which was the first
    // implementation and was MEASURED to defeat the index. Drizzle's `eq()` emits `outcome = $1`, and a
    // partial index is only usable when the planner can PROVE the query predicate implies the index
    // predicate. With the value hidden behind a bind parameter it cannot, so under a GENERIC plan
    // (PostgreSQL switches to one after ~5 executions of a prepared statement) the planner falls back to a
    // Seq Scan + Sort. Observed on this exact query, with `enable_seqscan=off` AND
    // `plan_cache_mode=force_generic_plan` set — i.e. the fallback happens even when a seq scan is
    // disabled and penalised:
    //     ->  Sort  (cost=15.01..15.02 rows=1 width=104)
    //           Sort Key: created_at DESC NULLS LAST
    //           ->  Seq Scan on audit  (Disabled: true)
    //                 Filter: ((resolved_at IS NULL) AND (outcome = $1))
    // The literal form below plans as `Index Scan using audit_needs_attention_idx` with NO Sort node under
    // both plan modes. This is a hardcoded constant chosen by this module — no caller value reaches it, so
    // it is not an injection surface; there is nothing here to parameterise.
    //
    // The `DESC NULLS LAST` is the other half and is equally deliberate: Drizzle's `.desc()` emits
    // NULLS FIRST, which does not match the index's declared ordering and forces a Sort on top of the scan.
    .where(sql`outcome = 'needs_attention' AND resolved_at IS NULL`)
    .orderBy(sql`created_at DESC NULLS LAST`)
    .limit(limit);
  return rows;
}

/**
 * The outcome of a discharge attempt. Three distinct answers, deliberately — collapsing `already_resolved`
 * into `resolved` would let a re-run report a discharge it did not perform, and collapsing `not_found` into
 * either would let an operator's typo look like success.
 */
export type ResolveResult =
  | { outcome: "resolved"; id: string; resolvedAt: Date }
  | { outcome: "already_resolved"; id: string; resolvedAt: Date }
  | { outcome: "not_found"; id: string };

/**
 * Discharge one alert: `resolved_at = now()`, once, and never again (D-J3Z-07).
 *
 * THE `AND resolved_at IS NULL` GUARD IS THE AUTHORITY. It is what makes a second run a ZERO-ROW update
 * rather than a rewrite of the original discharge time — and that timestamp is a historical fact about
 * when real money stopped being outstanding. This is the same discipline payout-reconcile.ts:15-18 states
 * for the payout lifecycle: "The guard, not an app-level 'already paid?' read, is the authority — exactly
 * as the ON CONFLICT is for the sweep and the EXCLUDE for booking." An app-level read-then-write here
 * would be both racy and, worse, capable of moving a settled timestamp forward.
 *
 * Zero rows updated is AMBIGUOUS (already discharged, or no such row), so it is disambiguated by a follow-up
 * read — which reports the ORIGINAL timestamp, never this run's clock.
 *
 * NOT SCOPED TO `outcome = 'needs_attention'`, deliberately: an operator handed an id discharges THAT id.
 * Filtering the writer by outcome would be a second, unstated policy living in the wrong place.
 *
 * `now()` is the POSTGRES clock, per the project's zero-JS-clock rule (src/lib/units.ts) — exactly as
 * `recordAudit` leaves `created_at` to the DB default (src/lib/audit.ts:100-102).
 */
export async function resolveAlert(dbConn: DbConn, id: string): Promise<ResolveResult> {
  const updated = (await dbConn.execute(sql`
    UPDATE audit SET resolved_at = now()
    WHERE id = ${id} AND resolved_at IS NULL
    RETURNING id, resolved_at AS "resolvedAt"
  `)) as unknown as { id: string; resolvedAt: Date | string }[];

  if (updated.length > 0) {
    return { outcome: "resolved", id: updated[0].id, resolvedAt: new Date(updated[0].resolvedAt) };
  }

  const existing = (await dbConn.execute(sql`
    SELECT id, resolved_at AS "resolvedAt" FROM audit WHERE id = ${id}
  `)) as unknown as { id: string; resolvedAt: Date | string }[];

  if (existing.length > 0 && existing[0].resolvedAt != null) {
    return {
      outcome: "already_resolved",
      id: existing[0].id,
      // The ORIGINAL discharge time, read back — this run did not set it and must never imply it did.
      resolvedAt: new Date(existing[0].resolvedAt),
    };
  }

  return { outcome: "not_found", id };
}
