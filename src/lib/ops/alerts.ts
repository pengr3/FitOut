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
// THE PII CONTRACT IS ENFORCED STRUCTURALLY, NOT BY A COMMENT (D-J3Z-02). `listUnresolvedAlerts` selects
// FOUR EXPLICIT COLUMNS — id, action, actor_id, created_at — and `UnresolvedAlert` has no field for the
// jsonb column that is deliberately absent. That column carries booking ids, transfer ids and masked
// last-4s under an explicit column-level rule (D-72), restated verbatim at cancel-booking.ts:755-756: "No
// account number, no account name, no BIC — not in this audit meta, not in any log line, NOT IN ANY
// COLUMN." Those rows are rendered into an EMAIL, and email is an external service that forwards, archives
// and indexes — so widening THAT select would silently widen a column-level contract across a trust
// boundary. Because the row type has no such field, re-exporting it is a TYPE ERROR at every consumer
// rather than something a reviewer has to catch. Where that column IS readable: a local psql / Drizzle
// Studio session, documented in .planning/ops/NEEDS-ATTENTION-RUNBOOK.md. That boundary is the point.
//
// SCOPE OF THE PARAGRAPH ABOVE — read it as being about `listUnresolvedAlerts`, not about this file. As of
// 2026-08-11 it is no longer true of the file as a whole: `listResolvedAlerts` (added by quick task
// 260811-dj4 to close D2) selects SEVEN explicit columns plus ONE derived single-key projection,
// `meta->>'error'`. (SIX until later the same day, when 260811-fh6 added `resolved_by` — a plain column,
// which is why the DERIVED-key count is still one. Re-count this line if the select changes again; a
// header that quietly goes stale is how the D-J3Z-02 claim above became inaccurate in the first place.)
// The `meta` COLUMN is still never selected anywhere in this module and `ResolvedAlert`
// still has no `meta` field, so the structural enforcement is intact on both queries — but the blanket
// claim "this file never reads anything out of meta" would now be a lie, and a file that lies about itself
// is worse than one that never made the claim. The full argument for that one widening, and the reason it
// does NOT generalise to any other key, is at `listResolvedAlerts` below (D-DJ4-04).

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
  // `resolvedBy` is NON-NULLABLE on this arm by CONSTRUCTION — this run just wrote it from a required
  // parameter — exactly as `ResolvedAlert.resolvedAt` is narrowed against a `resolved_at IS NOT NULL`
  // predicate below.
  | { outcome: "resolved"; id: string; resolvedAt: Date; resolvedBy: string }
  // NULLABLE here, and that is not defensive typing: the 27 rows discharged on 2026-08-10 predate the
  // column, so an `already_resolved` answer about one of them genuinely has no discharger to report.
  // Widening this to `string` would force a lie at the render.
  | { outcome: "already_resolved"; id: string; resolvedAt: Date; resolvedBy: string | null }
  | { outcome: "not_found"; id: string };

/**
 * Discharge one alert: `resolved_at = now()` and `resolved_by = <the name supplied>`, once, and never
 * again (D-J3Z-07, D-FH6-03).
 *
 * THE `AND resolved_at IS NULL` GUARD IS THE AUTHORITY, AND IT NOW PROTECTS TWO HISTORICAL FACTS. It is
 * what makes a second run a ZERO-ROW update rather than a rewrite of the original discharge time — and
 * that timestamp is a historical fact about when real money stopped being outstanding. Since 2026-08-11 the
 * same one guard also protects WHO discharged it: `resolved_by` is set in the SAME `SET` list, so it
 * inherits the protection rather than needing its own. A re-resolve under a DIFFERENT name updates no row,
 * so the original discharger survives (case 16). This is the same discipline payout-reconcile.ts:15-18
 * states for the payout lifecycle: "The guard, not an app-level 'already paid?' read, is the authority —
 * exactly as the ON CONFLICT is for the sweep and the EXCLUDE for booking." An app-level read-then-write
 * here would be both racy and, worse, capable of moving a settled timestamp forward.
 *
 * DO NOT ADD `AND resolved_by IS NULL`. It is tempting and it is wrong: a redundant second predicate would
 * make the real one untestable, because mutation M1 could delete `AND resolved_at IS NULL` and the suite
 * would stay green on the strength of the spare. One guard, measured (M1 must redden cases 16 AND 17).
 *
 * NO BACKFILL HOLDS UNDER RE-RESOLVE, not merely as a promise never to run an UPDATE (D-FH6-05). The 27
 * rows discharged on 2026-08-10 have `resolved_at` set, so the guard excludes them: running this with a
 * `--by` reports `already_resolved` and leaves `resolved_by` NULL. Retro-attributing a discharge somebody
 * else performed is impossible through this function, by construction (case 17).
 *
 * `resolvedBy` IS A REQUIRED PARAMETER — not optional, not defaulted. That is what makes every call site a
 * compile error until it supplies one, so the requirement cannot be quietly skipped at a new caller. It is
 * also why `undefined` can never reach the bind parameter: postgres.js REJECTS an undefined bind rather
 * than coercing it to NULL, so a missed site would throw on a money-path write (T-FH6-08).
 *
 * WHAT THE VALUE IS WORTH: it is an ASSERTED identity, not an authenticated one. The only caller is a CLI
 * with no session, so this records who CLAIMS to have discharged the row. Do not describe it, here or
 * anywhere, as proof of who did (D-FH6-02).
 *
 * Zero rows updated is AMBIGUOUS (already discharged, or no such row), so it is disambiguated by a follow-up
 * read — which reports the ORIGINAL timestamp and the ORIGINAL discharger, never this run's clock or this
 * run's name.
 *
 * NOT SCOPED TO `outcome = 'needs_attention'`, deliberately: an operator handed an id discharges THAT id.
 * Filtering the writer by outcome would be a second, unstated policy living in the wrong place.
 *
 * `now()` is the POSTGRES clock, per the project's zero-JS-clock rule (src/lib/units.ts) — exactly as
 * `recordAudit` leaves `created_at` to the DB default (src/lib/audit.ts:100-102).
 */
export async function resolveAlert(
  dbConn: DbConn,
  id: string,
  resolvedBy: string,
): Promise<ResolveResult> {
  const updated = (await dbConn.execute(sql`
    UPDATE audit SET resolved_at = now(), resolved_by = ${resolvedBy}
    WHERE id = ${id} AND resolved_at IS NULL
    RETURNING id, resolved_at AS "resolvedAt", resolved_by AS "resolvedBy"
  `)) as unknown as { id: string; resolvedAt: Date | string; resolvedBy: string }[];

  if (updated.length > 0) {
    return {
      outcome: "resolved",
      id: updated[0].id,
      resolvedAt: new Date(updated[0].resolvedAt),
      // Read back out of RETURNING rather than echoed from the argument — the returned value is then a
      // statement about the ROW, which is what case 15's independent SELECT cross-checks.
      resolvedBy: updated[0].resolvedBy,
    };
  }

  const existing = (await dbConn.execute(sql`
    SELECT id, resolved_at AS "resolvedAt", resolved_by AS "resolvedBy" FROM audit WHERE id = ${id}
  `)) as unknown as { id: string; resolvedAt: Date | string; resolvedBy: string | null }[];

  if (existing.length > 0 && existing[0].resolvedAt != null) {
    return {
      outcome: "already_resolved",
      id: existing[0].id,
      // The ORIGINAL discharge time, read back — this run did not set it and must never imply it did.
      resolvedAt: new Date(existing[0].resolvedAt),
      // The ORIGINAL discharger, likewise — NULL for the 27 pre-column rows, which the CLI renders as
      // "an unrecorded discharger" rather than substituting the name this run supplied.
      resolvedBy: existing[0].resolvedBy,
    };
  }

  return { outcome: "not_found", id };
}

/**
 * One DISCHARGED alert, as a reviewer sees it — the read side of `resolveAlert` (D2, quick task
 * 260811-dj4).
 *
 * NO `meta` FIELD, and that omission is still the enforcement mechanism, not a comment (D-DJ4-04). `error`
 * is a DERIVED single-key projection of `meta->>'error'`, not the column: adding `meta` here is a change
 * every consumer has to be edited to accept, which is what keeps it out of the email path by construction
 * rather than by review.
 *
 * `resolvedAt` is non-nullable HERE even though the column is nullable, because the query's predicate is
 * exactly `resolved_at IS NOT NULL` — a row that reached this type has a discharge time by definition.
 *
 * `resolvedBy` is NULLABLE and no predicate narrows it, deliberately: the 27 rows discharged on 2026-08-10
 * predate the column and have no recorded discharger, permanently. The CLI renders that NULL as
 * `unrecorded` — which means NOT CAPTURED, never "nobody" (D-FH6-07).
 */
export type ResolvedAlert = {
  id: string;
  action: string;
  outcome: string;
  actorId: string;
  createdAt: Date;
  resolvedAt: Date;
  resolvedBy: string | null;
  error: string | null;
};

/**
 * How far back a history review looks by default (D-DJ4-03).
 *
 * This bounds the QUESTION ("what was discharged recently?"), which is a different job from the row limit
 * below bounding the OUTPUT — hence two bounds rather than one.
 */
export const DEFAULT_HISTORY_DAYS = 30;

/**
 * Hard bound on how many discharged rows one history read may return (D-DJ4-03).
 *
 * DECLARED SEPARATELY FROM `DEFAULT_ALERT_LIMIT` even though the numbers coincide, deliberately: that one
 * bounds an operator's INBOX (an email nobody can scroll), this one bounds a TERMINAL. Collapsing them into
 * one constant would let a future change to either silently move the other.
 */
export const DEFAULT_HISTORY_LIMIT = 200;

/**
 * Every DISCHARGED audit row inside the window, newest DISCHARGE first.
 *
 * This closes D2 — recorded as an OPEN GAP after an operator, asked at a human-verification checkpoint to
 * confirm that 27 discharged dev rows had genuinely been test noise, reached for the CLI and found that
 * resolutions could be MADE through it but only REVIEWED through hand-written psql. `resolveAlert` is a
 * money-path write asserting a human discharged an obligation; on the QRPh rail that obligation is real
 * money PayMongo cannot refund via API. The review side is the half that matters in a dispute.
 *
 * D-DJ4-01 — UNSCOPED BY OUTCOME, and this mirrors the writer rather than choosing a policy.
 * `resolved_at` has exactly ONE code writer in this repository (`resolveAlert`, above), so
 * `resolved_at IS NOT NULL` is *precisely* the set of human discharge acts — a fact derivable from the
 * code, not a preference. And `resolveAlert` is deliberately not scoped to `outcome = 'needs_attention'`
 * (see its docblock; pinned by alerts.test.ts case 6b). If the READ side were scoped and the WRITE side
 * were not, a discharge performed on an `error`/`ok` row would exist that no surface could review — which
 * is D2 reproduced one level down. `outcome` is therefore RETURNED and rendered, so such a discharge is
 * visible at a glance. Pinned by case 13.
 *
 * D-DJ4-02 — ORDER BY `resolved_at DESC, created_at DESC`, NOT `created_at DESC`.
 * "When did the money event happen?" is the unresolved queue's question and it already answers it. A review
 * is over discharge ACTS: a batch handled in one sitting must appear contiguous. Both timestamps are
 * returned so the money-event question stays answerable per row, and the `created_at DESC` tie-break makes
 * a same-instant batch deterministic (newest money event first) — pinned by case 9's single-statement
 * UPDATE, which is the only way to produce a byte-identical `resolved_at` for two rows.
 * NO `NULLS LAST`, deliberately and not by oversight: the `NULLS LAST` in `listUnresolvedAlerts` exists to
 * match `audit_needs_attention_idx`'s declared ordering. There is no index here (D-DJ4-06) and the
 * predicate makes NULLs impossible, so copying it in would be cargo cult.
 *
 * D-DJ4-03 — the two bounds. See the constants above.
 *
 * D-DJ4-04 — ONE derived key, `meta->>'error'`. NEVER the `meta` column. This is a deliberate widening of
 * the D-J3Z-02 boundary, it is argued rather than assumed, and it is the ONLY one.
 * The D2 question is "what was discharged, AND ON WHAT BASIS?" — and the operator's own psql keyed on
 * `meta->>'error'`, because the 27-row classification turned on the literal string 'resend 503'. A history
 * verb that cannot show it answers half the question.
 *
 * Why exposing THIS key specifically is safe, in the order the reasoning actually runs:
 *   1. IT IS A SINGLE NAMED KEY, CHOSEN ON CONTENT GROUNDS. By convention across this codebase's
 *      `recordAudit` sites, `error` holds an exception/API message — it is written at exactly two call
 *      sites (notify.ts:262 and guest-email.ts:60), both `args.error?.message ?? "unknown error"`.
 *      IDENTIFIERS LIVE UNDER SEPARATELY-NAMED KEYS: `bookingId`, `transferId`, `paymentId`, `last4`. A
 *      projection of one named key cannot reach a differently-named one. Pinned by case 12, which plants
 *      all four and asserts only `error` surfaces.
 *      (2026-08-11, 260811-fh6: `resolvedBy` joins this select as a plain COLUMN on the audit row, NOT a
 *      second reach into `meta`. The count in (1)'s sense is unchanged — there is still exactly ONE derived
 *      key here, and adding a column is not a precedent for adding a key. Case 12's key-set tripwire was
 *      reconciled by NAMING the new field rather than by loosening the assertion.)
 *   2. THE STRUCTURAL ENFORCEMENT SURVIVES INTACT. `ResolvedAlert` is a NEW, SEPARATE type carrying
 *      `error: string | null` and NO `meta` field. `UnresolvedAlert` and `OpsDigestRow` are byte-unchanged.
 *      So re-exporting the column is still a COMPILE ERROR at every consumer, and the email path cannot
 *      acquire `meta` by accident on this surface. Measured, not asserted: mutation H4 adds `meta` to both
 *      the select and the type and reddens case 12, while `alert-digest.test.ts` case 3 stays green —
 *      proving case 12 has its own teeth rather than riding on the existing email guard.
 *   3. RESIDUAL RISK, ON THE RECORD AND ACCEPTED (T-DJ4-01): an error string could in principle embed
 *      something an operator would rather not paste into a ticket, and terminal output escapes into tickets
 *      more readily than a psql session does. Disposition ACCEPT, narrowed by (1), recorded in runbook §6a.
 *
 * CONTEXT, EXPLICITLY NOT THE REASON THIS IS SAFE — only why the residual risk in (3) is tolerable: the
 * CLI is not a privilege boundary. It connects with `DATABASE_URL`; anyone who can run
 * `npm run ops:alerts:history` can already run `SELECT * FROM audit`, and runbook §3 tells them to. DO NOT
 * CITE THIS AS PRECEDENT FOR ADDING ANOTHER KEY. It proves too much: taken alone it would equally justify
 * exposing `bookingId`, or the entire `meta` column, since the runner has psql either way. What limits the
 * scope is (1) and (2), and any future widening must be argued on those grounds, not this one. Email
 * remains a different reader set — it forwards, archives and indexes — which is why the digest is bound
 * tighter and is untouched here.
 *
 * D-DJ4-06 — NO INDEX, NO MIGRATION; the Seq Scan is ACCEPTED, with the threshold recorded.
 * `audit_needs_attention_idx` is PARTIAL (`WHERE outcome = 'needs_attention' AND resolved_at IS NULL`) and
 * so cannot serve resolved rows AT ALL. This query plans as Seq Scan + Sort. Accepted: `audit` holds 27
 * rows today, and the window + limit bound the RESULT rather than the scan. The index that would fix it —
 * `CREATE INDEX ... ON audit (resolved_at DESC) WHERE resolved_at IS NOT NULL` — needs a migration, and it
 * is not a free win either: unlike the partial unresolved index it would grow WITHOUT BOUND, which is the
 * exact property schema.ts:346-354 singles out. It belongs with the deferred RETENTION decision, not
 * bolted on here.
 */
export async function listResolvedAlerts(
  dbConn: DbConn,
  opts?: { days?: number; limit?: number },
): Promise<ResolvedAlert[]> {
  const days = opts?.days ?? DEFAULT_HISTORY_DAYS;
  const limit = opts?.limit ?? DEFAULT_HISTORY_LIMIT;
  const rows = await dbConn
    .select({
      id: audit.id,
      action: audit.action,
      outcome: audit.outcome,
      actorId: audit.actorId,
      createdAt: audit.createdAt,
      resolvedAt: audit.resolvedAt,
      // A plain COLUMN, not a key out of `meta` — NULL for every discharge made before 2026-08-11.
      resolvedBy: audit.resolvedBy,
      // The single-key projection, column-qualified so it renders as `"audit"."meta"->>'error'`. This is
      // the ONLY thing in this module that reads out of the jsonb column, and D-DJ4-04 above is why.
      error: sql<string | null>`${audit.meta}->>'error'`,
    })
    .from(audit)
    // `days` IS A BIND PARAMETER, and that is the deliberate DIFFERENCE from `listUnresolvedAlerts` above
    // (D-DJ4-07). That query emits its predicate as a SQL LITERAL because the planner cannot prove
    // predicate-implication through a bind parameter and a partial index is at stake. NEITHER condition
    // holds here: there is no index for this predicate to defeat (D-DJ4-06), and `days` is a CALLER value
    // that arrives from `process.argv`. Literalising a caller-controlled value would be an injection
    // surface. Do not "make this consistent" with the query above — the inconsistency is the point.
    //
    // `resolved_at IS NOT NULL` is kept even though the `>=` subsumes it (`NULL >= x` is NULL, so the
    // window already excludes unresolved rows). It is the DECLARED definition of the set and the clause
    // that survives if the window is ever made optional. Mutation H2b measures that redundancy honestly
    // rather than asserting it — see the record in tests/ops/alerts.test.ts.
    //
    // `now()` is the POSTGRES clock, per the project's zero-JS-clock rule (src/lib/units.ts). A
    // JS-computed cutoff would make host/Docker clock skew look like a query bug.
    .where(
      sql`resolved_at IS NOT NULL AND resolved_at >= now() - make_interval(days => ${days}::int)`,
    )
    .orderBy(sql`resolved_at DESC, created_at DESC`)
    .limit(limit);

  // The column is nullable; the predicate is not. Narrowed here rather than leaking `Date | null` into
  // every reviewer-facing consumer for a case the WHERE clause has already excluded.
  return rows.map((r) => ({ ...r, resolvedAt: r.resolvedAt as Date }));
}
