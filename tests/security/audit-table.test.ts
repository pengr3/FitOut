// WR-06-DURABLE — the row actually LANDS, against a REAL migrated schema.
//
// tests/security/audit-durable.test.ts proves recordAudit cannot throw when the sink is broken, with the
// database mocked away. That is the safety half. This file is the other half: that the sink is real —
// drizzle/0024_audit_table.sql replays into an isolated schema, the row lands with the right values, and
// the query the whole task exists for ("what money is outstanding?") returns the right rows in the right
// order. A never-throwing sink that quietly writes nothing would pass the other file completely.
//
// Harness: setupTestDb() replays every drizzle/*.sql into a private schema, then the shipped
// vi.doMock("@/lib/db", () => ({ db: testDb.db })) + vi.resetModules() + dynamic-import idiom points the
// REAL recordAudit at it (cloned from tests/booking/cancellation.test.ts).

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";

let testDb: TestDb;
let recordAudit: typeof import("@/lib/audit").recordAudit;
let auditTable: typeof import("@/lib/db/schema").audit;

/**
 * Raw rows straight off the table — `db.execute` returns them directly with the postgres.js driver.
 * NOTE the timestamp types: raw `db.execute` does NOT run Drizzle's column type parsers, so a timestamptz
 * arrives as the Postgres text form ("2026-08-06 11:43:39.647571+00"), not a Date. The typed
 * `db.select().from(auditTable)` path below DOES return a Date — which is where that is asserted.
 */
type AuditRow = {
  id: string;
  created_at: string;
  actor_id: string;
  action: string;
  outcome: string;
  meta: Record<string, unknown> | null;
  resolved_at: string | null;
};

async function allRows(): Promise<AuditRow[]> {
  return (await testDb.db.execute(
    sql`SELECT id, created_at, actor_id, action, outcome, meta, resolved_at FROM audit ORDER BY created_at`,
  )) as unknown as AuditRow[];
}

beforeAll(async () => {
  testDb = await setupTestDb();
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.resetModules();
  // Import BOTH post-reset so the table object recordAudit writes through is the one this file queries.
  ({ recordAudit } = await import("@/lib/audit"));
  ({ audit: auditTable } = await import("@/lib/db/schema"));
});

afterAll(async () => {
  vi.doUnmock("@/lib/db");
  await teardownTestDb(testDb);
});

beforeEach(async () => {
  await testDb.db.execute(sql`DELETE FROM audit`);
});

describe("the durable audit row lands", () => {
  it("writes the needs_attention money seam with a DB-set createdAt and a NULL resolvedAt", async () => {
    // The exact shape of the QRPh unrefundable-rail alert this table exists for
    // (api/paymongo/webhook/route.ts auto_refund_manual).
    await recordAudit({
      actorId: "audit-int-booker",
      action: "auto_refund_manual",
      outcome: "needs_attention",
      meta: { bookingId: "b1", method: "qrph", amountCents: 73500 },
    });

    const rows = await allRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actor_id: "audit-int-booker",
      action: "auto_refund_manual",
      outcome: "needs_attention",
    });
    expect(typeof rows[0].id).toBe("string");

    // createdAt is never passed by recordAudit — Postgres sets it (zero-JS-clock rule). Read through the
    // TYPED path so this asserts a real timestamptz round-trip and not just "some non-null text".
    const [typed] = await testDb.db.select().from(auditTable);
    expect(typed.createdAt).toBeInstanceOf(Date);
    expect(Number.isNaN(typed.createdAt.getTime())).toBe(false);
    // Unresolved by construction: nothing writes resolved_at except an operator, by hand (D5).
    expect(typed.resolvedAt).toBeNull();
    expect(rows[0].resolved_at).toBeNull();
  });

  it("accepts the literal actorIds 'system' and 'guest' — actor_id carries NO FK (D4)", async () => {
    // 8 of the 57 call sites pass one of these, including the webhook's auto_refund_manual. An FK on
    // actor_id would 23503 on every one of them, and recordAudit's swallow would then eat the alert —
    // so this is the case that would have made the table silently useless for its own reason to exist.
    await recordAudit({ actorId: "system", action: "auto_refund_manual", outcome: "needs_attention" });
    await recordAudit({ actorId: "guest", action: "guest_email_sent", outcome: "ok" });

    // Neither id exists as a user, which is exactly why an FK could not have worked.
    const users = (await testDb.db.execute(
      sql`SELECT id FROM "user" WHERE id IN ('system', 'guest')`,
    )) as unknown as { id: string }[];
    expect(users).toHaveLength(0);

    const rows = await allRows();
    expect(rows.map((r) => r.actor_id).sort()).toEqual(["guest", "system"]);
  });

  it("round-trips meta as jsonb (an object, not a string), and stores SQL NULL when omitted", async () => {
    await recordAudit({
      actorId: "system",
      action: "refund_after_payout",
      outcome: "needs_attention",
      meta: { bookingId: "b2", netCents: -12500, nested: { rail: "qrph" }, flagged: true },
    });
    await recordAudit({ actorId: "u-nometa", action: "activateHosting", outcome: "ok" });

    // Read through Drizzle so the jsonb column comes back typed, not as text.
    const rows = await testDb.db.select().from(auditTable).orderBy(auditTable.action);
    const withMeta = rows.find((r) => r.action === "refund_after_payout");
    const withoutMeta = rows.find((r) => r.action === "activateHosting");

    expect(typeof withMeta?.meta).toBe("object");
    expect(withMeta?.meta).toEqual({
      bookingId: "b2",
      netCents: -12500,
      nested: { rail: "qrph" },
      flagged: true,
    });

    // Omitted meta must be SQL NULL, not the JSON string "null" and not {}.
    expect(withoutMeta?.meta).toBeNull();
    const nulls = (await testDb.db.execute(
      sql`SELECT count(*)::int AS n FROM audit WHERE meta IS NULL`,
    )) as unknown as { n: number }[];
    expect(nulls[0].n).toBe(1);
  });
});

describe("the operator query — every unresolved needs_attention, newest first", () => {
  it("returns only the open money seams, newest first", async () => {
    // Two open seams, one already handled, one unrelated success.
    await recordAudit({ actorId: "system", action: "older_seam", outcome: "needs_attention" });
    await recordAudit({ actorId: "system", action: "newer_seam", outcome: "needs_attention" });
    await recordAudit({ actorId: "system", action: "handled_seam", outcome: "needs_attention" });
    await recordAudit({ actorId: "u1", action: "activateHosting", outcome: "ok" });

    // Back-date the older seam to a KNOWN past instant. Without this, two inserts can land in the same
    // microsecond and the ordering assertion would be a coin flip dressed up as a test.
    await testDb.db.execute(
      sql`UPDATE audit SET created_at = '2020-01-01T00:00:00Z'::timestamptz WHERE action = 'older_seam'`,
    );
    // An operator resolved this one by hand — the only v1 writer of resolved_at (D5).
    await testDb.db.execute(sql`UPDATE audit SET resolved_at = now() WHERE action = 'handled_seam'`);

    const queue = (await testDb.db.execute(sql`
      SELECT action, created_at
      FROM audit
      WHERE outcome = 'needs_attention' AND resolved_at IS NULL
      ORDER BY created_at DESC
    `)) as unknown as { action: string; created_at: Date }[];

    expect(queue.map((r) => r.action)).toEqual(["newer_seam", "older_seam"]);
    // The resolved seam does not come back forever, and a successful action is not an operator's problem.
    expect(queue.map((r) => r.action)).not.toContain("handled_seam");
    expect(queue.map((r) => r.action)).not.toContain("activateHosting");
  });

  it("the partial index backing that query exists with the right predicate and direction", async () => {
    const idx = (await testDb.db.execute(sql`
      SELECT indexdef FROM pg_indexes
      WHERE indexname = 'audit_needs_attention_idx' AND schemaname = ${testDb.schema}
    `)) as unknown as { indexdef: string }[];

    expect(idx).toHaveLength(1);
    // The predicate is what keeps the index tiny forever (it indexes only the OPEN rows), and DESC is
    // what makes "newest first" an index scan rather than a sort.
    expect(idx[0].indexdef).toContain("outcome = 'needs_attention'");
    expect(idx[0].indexdef).toContain("resolved_at IS NULL");
    expect(idx[0].indexdef).toContain("DESC");
    // Deliberately NOT asserted: an EXPLAIN plan. Postgres will seq-scan a four-row table, so a
    // "uses the index" assertion here would be a lie either way.
  });
});
