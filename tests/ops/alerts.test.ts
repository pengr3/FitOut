// The operator query + the first `resolved_at` writer, exercised against a real isolated schema.
//
// WHAT IS ACTUALLY UNDER TEST HERE, and why each case exists rather than being assumed:
//
//   - THE PREDICATE IS THE PRODUCT. `listUnresolvedAlerts` is the D5 operator queue given a real
//     implementation. If it returns a RESOLVED row the operator re-sees a discharged alert forever
//     (case 1); if it returns a non-`needs_attention` row the queue fills with `ok`/`denied` noise and
//     stops being a money queue (case 2). Both halves of the WHERE are load-bearing and both are pinned.
//   - ORDER IS AN ASSERTION, NOT A COINCIDENCE (case 3). `ORDER BY created_at DESC NULLS LAST` matches
//     `audit_needs_attention_idx` byte for byte (D-J3Z-01). A set-membership assertion would stay green
//     if the ORDER BY were dropped entirely, so the order itself is asserted.
//   - THE CLOBBER IS THE FAILURE MODE (case 5). `resolveAlert` is guarded by `AND resolved_at IS NULL`,
//     which is the ONLY thing preventing a second run from rewriting the original discharge time — the
//     historical fact of WHEN a money alert was settled. Asserting "the second call did not error" would
//     measure nothing; case 5 asserts the returned timestamp is strictly equal to the first call's.
//   - A TYPO MUST NEVER LOOK LIKE A DISCHARGE (case 6). An unknown id reports not_found and creates no row.
//   - `meta` NEVER LEAVES THE QUERY (case 7). D-J3Z-02 / D-72: the query selects four explicit columns and
//     `UnresolvedAlert` has no `meta` field, so the omission is STRUCTURAL. Case 7 pins it at the query
//     layer; the email-body half is pinned by the sentinel case in tests/ops/alert-digest.test.ts.
//
// EVERY fixture timestamp is computed by POSTGRES (`now() - make_interval(...)`), never by the JS clock —
// the 07-05 discipline. Host/Docker clock skew can otherwise make correct arithmetic look wrong.

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";

import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import {
  listUnresolvedAlerts,
  resolveAlert,
  DEFAULT_ALERT_LIMIT,
} from "@/lib/ops/alerts";

let testDb: TestDb;

let seq = 0;
const uid = (p: string) => `${p}_${seq++}`;

type AuditOpts = {
  outcome: "ok" | "denied" | "error" | "needs_attention";
  action?: string;
  actorId?: string;
  /** Hours BEFORE the DB clock now() the row was created. */
  agoHours?: number;
  /** Hours BEFORE now() the row was resolved; omitted/null writes NULL (unresolved). */
  resolvedAgoHours?: number | null;
  meta?: Record<string, unknown> | null;
};

/**
 * Insert one audit row. `created_at` and `resolved_at` are BOTH computed by Postgres — the audit table's
 * own `created_at` default is `now()` and `recordAudit` deliberately never passes a JS timestamp
 * (src/lib/audit.ts:100-102, the project's zero-JS-clock rule), so a fixture must not either.
 */
async function makeAudit(opts: AuditOpts): Promise<string> {
  const id = uid("audit");
  const ago = opts.agoHours ?? 1;
  await testDb.db.execute(sql`
    INSERT INTO audit (id, created_at, actor_id, action, outcome, meta, resolved_at)
    VALUES (
      ${id},
      now() - make_interval(hours => ${ago}::int),
      ${opts.actorId ?? "system"},
      ${opts.action ?? "test_action"},
      ${opts.outcome},
      ${opts.meta == null ? sql`NULL` : sql`${JSON.stringify(opts.meta)}::jsonb`},
      ${
        opts.resolvedAgoHours == null
          ? sql`NULL`
          : sql`now() - make_interval(hours => ${opts.resolvedAgoHours}::int)`
      }
    )
  `);
  return id;
}

async function countAudit(): Promise<number> {
  const [row] = (await testDb.db.execute(
    sql`SELECT count(*)::int AS "c" FROM audit`,
  )) as unknown as { c: number }[];
  return row?.c ?? 0;
}

beforeAll(async () => {
  testDb = await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb(testDb);
});

// Each case owns the whole queue: the list query is deliberately UNFILTERED beyond its predicate, so
// leftover rows from a prior case would make an exact-order assertion impossible to write honestly.
beforeEach(async () => {
  await testDb.db.execute(sql`DELETE FROM audit`);
});

describe("listUnresolvedAlerts", () => {
  it("case 1 — returns ONLY unresolved rows; a discharged row disappears from the queue", async () => {
    const openA = await makeAudit({ outcome: "needs_attention", agoHours: 2 });
    const openB = await makeAudit({ outcome: "needs_attention", agoHours: 3 });
    const discharged = await makeAudit({
      outcome: "needs_attention",
      agoHours: 4,
      resolvedAgoHours: 1,
    });

    const rows = await listUnresolvedAlerts(testDb.db);
    const ids = rows.map((r) => r.id);

    expect(ids).toContain(openA);
    expect(ids).toContain(openB);
    expect(ids).not.toContain(discharged);
    expect(ids).toHaveLength(2);
  });

  it("case 2 — returns ONLY needs_attention rows; ok / denied / error never enter the money queue", async () => {
    const alert = await makeAudit({ outcome: "needs_attention", action: "auto_refund_manual" });
    const ok = await makeAudit({ outcome: "ok", action: "activateHosting" });
    const denied = await makeAudit({ outcome: "denied", action: "activateHosting" });
    const errored = await makeAudit({ outcome: "error", action: "activateHosting" });

    const ids = (await listUnresolvedAlerts(testDb.db)).map((r) => r.id);

    expect(ids).toEqual([alert]);
    expect(ids).not.toContain(ok);
    expect(ids).not.toContain(denied);
    expect(ids).not.toContain(errored);
  });

  it("case 3 — newest first, in strict created_at DESC order", async () => {
    const oldest = await makeAudit({ outcome: "needs_attention", agoHours: 30 });
    const middle = await makeAudit({ outcome: "needs_attention", agoHours: 5 });
    const newest = await makeAudit({ outcome: "needs_attention", agoHours: 1 });

    const rows = await listUnresolvedAlerts(testDb.db);

    // The ORDER is the assertion — a set-membership check would survive dropping the ORDER BY.
    expect(rows.map((r) => r.id)).toEqual([newest, middle, oldest]);
    expect(rows[0].createdAt.getTime()).toBeGreaterThan(rows[1].createdAt.getTime());
    expect(rows[1].createdAt.getTime()).toBeGreaterThan(rows[2].createdAt.getTime());
  });

  it("case 3b — honours an explicit limit and defaults to DEFAULT_ALERT_LIMIT", async () => {
    await makeAudit({ outcome: "needs_attention", agoHours: 1 });
    await makeAudit({ outcome: "needs_attention", agoHours: 2 });
    await makeAudit({ outcome: "needs_attention", agoHours: 3 });

    expect(DEFAULT_ALERT_LIMIT).toBe(200);
    expect(await listUnresolvedAlerts(testDb.db, { limit: 2 })).toHaveLength(2);
    expect(await listUnresolvedAlerts(testDb.db)).toHaveLength(3);
  });

  it("case 7 — never selects `meta`: the returned row has no meta key at all", async () => {
    await makeAudit({
      outcome: "needs_attention",
      meta: { bookingId: "bk_META_LEAK_CANARY", last4: "4242" },
    });

    const [row] = await listUnresolvedAlerts(testDb.db);

    // D-J3Z-02 — structural, not a review catch: the query selects four explicit columns.
    expect("meta" in row).toBe(false);
    expect(Object.keys(row).sort()).toEqual(["action", "actorId", "createdAt", "id"]);
    expect(JSON.stringify(row)).not.toContain("bk_META_LEAK_CANARY");
  });
});

describe("resolveAlert", () => {
  it("case 4 — discharges the row: outcome resolved, a real timestamp, and gone from the queue", async () => {
    const id = await makeAudit({ outcome: "needs_attention", agoHours: 6 });

    const result = await resolveAlert(testDb.db, id);

    expect(result.outcome).toBe("resolved");
    if (result.outcome !== "resolved") throw new Error("unreachable");
    expect(result.id).toBe(id);
    expect(result.resolvedAt).toBeInstanceOf(Date);
    expect(Number.isNaN(result.resolvedAt.getTime())).toBe(false);

    const ids = (await listUnresolvedAlerts(testDb.db)).map((r) => r.id);
    expect(ids).not.toContain(id);
    expect(ids).toHaveLength(0);
  });

  it("case 5 — idempotent: a second resolve reports already_resolved and CANNOT rewrite the original time", async () => {
    const id = await makeAudit({ outcome: "needs_attention", agoHours: 6 });

    const first = await resolveAlert(testDb.db, id);
    expect(first.outcome).toBe("resolved");
    if (first.outcome !== "resolved") throw new Error("unreachable");

    // A visible gap between the two calls: an UNGUARDED UPDATE would move the timestamp forward here,
    // and the equality assertion below is what catches it. This is the clobber, and it is the failure mode.
    await testDb.db.execute(sql`SELECT pg_sleep(0.05)`);

    const second = await resolveAlert(testDb.db, id);
    expect(second.outcome).toBe("already_resolved");
    if (second.outcome !== "already_resolved") throw new Error("unreachable");
    expect(second.resolvedAt.getTime()).toBe(first.resolvedAt.getTime());

    // And the stored column is byte-unchanged too — not merely the value the second call reported back.
    const [stored] = (await testDb.db.execute(
      sql`SELECT resolved_at AS "resolvedAt" FROM audit WHERE id = ${id}`,
    )) as unknown as { resolvedAt: Date | string }[];
    expect(new Date(stored.resolvedAt).getTime()).toBe(first.resolvedAt.getTime());
  });

  it("case 6 — an unknown id reports not_found, creates no row, and never looks like a discharge", async () => {
    await makeAudit({ outcome: "needs_attention" });
    const before = await countAudit();

    const result = await resolveAlert(testDb.db, "audit_does_not_exist");

    expect(result.outcome).toBe("not_found");
    expect(result.id).toBe("audit_does_not_exist");
    expect(await countAudit()).toBe(before);
    // The real row is untouched — a typo must not discharge somebody else's alert.
    expect(await listUnresolvedAlerts(testDb.db)).toHaveLength(1);
  });

  it("case 6b — does NOT filter on outcome: an operator handed an id discharges THAT id", async () => {
    // Scoping the writer to outcome='needs_attention' would be a second, unstated policy (D-J3Z-07).
    const id = await makeAudit({ outcome: "error", action: "some_non_money_action" });

    const result = await resolveAlert(testDb.db, id);

    expect(result.outcome).toBe("resolved");
  });
});
