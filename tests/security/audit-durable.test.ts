// WR-06-DURABLE — the NEVER-THROW proof for recordAudit's durable sink.
//
// recordAudit is awaited at 57 call sites across 11 files, and MOST of them sit inside `catch` blocks on
// money paths: the PayMongo webhook's unrefundable-rail branch (which must return 200 or PayMongo retries
// against the confirm authority), and most of cancel-booking.ts's 21 sites. Giving that function a database
// write introduces a brand-new way for it to fail. This file is the proof that the new failure mode is
// contained: with the durable write broken in every way it can break, every caller observes EXACTLY what it
// observes today, and the console line — the currently-shipped, alert-matched behaviour — still appears.
//
// NO DATABASE HERE ON PURPOSE. `@/lib/db` is doMocked in every case so the sink can be made to fail on
// demand, which is not something a real Postgres will do for us. The row-actually-lands proof lives in
// tests/security/audit-table.test.ts, against a real migrated schema.
//
// Harness: the repo's shipped idiom — vi.doMock("@/lib/db", …) → vi.resetModules() → dynamic import. The
// audit entries are read back through the console sink with the same `auditEntries` helper shape as
// tests/security/audit.test.ts (filter c[0] === "[audit]", JSON.parse(c[1])).

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

/** Pull the parsed payloads of every console.info("[audit]", json) call from a spy. */
function auditEntries(spy: Mock) {
  return spy.mock.calls
    .filter((c) => c[0] === "[audit]")
    .map((c) => JSON.parse(c[1] as string) as Record<string, unknown>);
}

/** The console payload minus its timestamp — what "byte-identical content" means across two runs. */
function withoutTs(entry: Record<string, unknown>) {
  const { ts: _ts, ...rest } = entry;
  return rest;
}

/**
 * A stub `db` whose insert can be made to fail on demand.
 *   - `valuesImpl` controls what `.values()` does: resolve (default), throw, or reject.
 *   - `onInsert` fires the moment `db.insert()` is CALLED — the ordering probe for D2.
 */
function makeDbStub(
  opts: {
    onInsert?: () => void;
    valuesImpl?: (v: Record<string, unknown>) => unknown;
  } = {},
) {
  const captured: Record<string, unknown>[] = [];
  const values = vi.fn((v: Record<string, unknown>) => {
    captured.push(v);
    return opts.valuesImpl ? opts.valuesImpl(v) : Promise.resolve(undefined);
  });
  const insert = vi.fn((_table: unknown) => {
    opts.onInsert?.();
    return { values };
  });
  return { db: { insert }, insert, values, captured };
}

let infoSpy: Mock;

beforeEach(() => {
  vi.resetModules();
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => {}) as unknown as Mock;
});

afterEach(() => {
  (infoSpy as unknown as { mockRestore: () => void }).mockRestore();
  vi.doUnmock("@/lib/db");
});

describe("recordAudit durable sink — the console line is unchanged", () => {
  it("writes the row AND emits exactly today's console line (exact key set)", async () => {
    const stub = makeDbStub();
    vi.doMock("@/lib/db", () => ({ db: stub.db }));
    const [{ recordAudit }, { audit }] = await Promise.all([
      import("@/lib/audit"),
      import("@/lib/db/schema"),
    ]);

    await expect(
      recordAudit({ actorId: "u1", action: "a", outcome: "ok", meta: { k: 1 } }),
    ).resolves.toBeUndefined();

    // BOTH sinks fired — never one instead of the other.
    const entries = auditEntries(infoSpy);
    expect(entries).toHaveLength(1);
    // The EXACT key set, not a subset match: a future field added to the log line has to be a
    // deliberate change to this assertion, never a silent one.
    expect(Object.keys(entries[0]).sort()).toEqual(["action", "actorId", "meta", "outcome", "ts"]);
    expect(withoutTs(entries[0])).toEqual({
      actorId: "u1",
      action: "a",
      outcome: "ok",
      meta: { k: 1 },
    });
    expect(typeof entries[0].ts).toBe("string");
    expect(new Date(entries[0].ts as string).toISOString()).toBe(entries[0].ts);

    // The durable write targeted the audit table with the same shape.
    expect(stub.insert).toHaveBeenCalledTimes(1);
    expect(stub.insert).toHaveBeenCalledWith(audit);
    expect(stub.captured).toHaveLength(1);
    expect(stub.captured[0]).toMatchObject({
      actorId: "u1",
      action: "a",
      outcome: "ok",
      meta: { k: 1 },
    });
    expect(typeof stub.captured[0].id).toBe("string");
    // createdAt is NOT passed — the Postgres default is the authority (zero-JS-clock rule).
    expect(stub.captured[0].createdAt).toBeUndefined();
  });

  it("omits meta from the line when the caller omits it, and inserts meta undefined", async () => {
    const stub = makeDbStub();
    vi.doMock("@/lib/db", () => ({ db: stub.db }));
    const { recordAudit } = await import("@/lib/audit");

    await recordAudit({ actorId: "u2", action: "b", outcome: "denied" });

    const entries = auditEntries(infoSpy);
    expect(entries).toHaveLength(1);
    expect(Object.keys(entries[0]).sort()).toEqual(["action", "actorId", "outcome", "ts"]);
    expect(entries[0].meta).toBeUndefined();
    expect(stub.captured[0].meta).toBeUndefined();
  });
});

describe("recordAudit CANNOT THROW — a broken durable sink changes nothing observable", () => {
  const ENTRY = { actorId: "u1", action: "a", outcome: "ok", meta: { k: 1 } } as const;
  const EXPECTED_LINE = { actorId: "u1", action: "a", outcome: "ok", meta: { k: 1 } };

  it("resolves when db.insert THROWS SYNCHRONOUSLY, and still logs", async () => {
    vi.doMock("@/lib/db", () => ({
      db: {
        insert: () => {
          throw new Error("audit sink down");
        },
      },
    }));
    const { recordAudit } = await import("@/lib/audit");

    await expect(recordAudit({ ...ENTRY })).resolves.toBeUndefined();

    const entries = auditEntries(infoSpy);
    expect(entries).toHaveLength(1);
    expect(withoutTs(entries[0])).toEqual(EXPECTED_LINE);
  });

  it("resolves when db.insert is UNDEFINED (the insert-less mock case), and still logs", async () => {
    // This is exactly the shape tests/security/audit.test.ts uses — `{ update: … }` with no insert.
    // Calling `db.insert(...)` raises a TypeError, which must be swallowed like any other failure.
    vi.doMock("@/lib/db", () => ({ db: { update: vi.fn() } }));
    const { recordAudit } = await import("@/lib/audit");

    await expect(recordAudit({ ...ENTRY })).resolves.toBeUndefined();

    const entries = auditEntries(infoSpy);
    expect(entries).toHaveLength(1);
    expect(withoutTs(entries[0])).toEqual(EXPECTED_LINE);
  });

  it("resolves when .values() returns a REJECTED PROMISE (DB down / constraint), and still logs", async () => {
    // A distinct failure mode from the sync throw: the call succeeds, the query fails later. Both
    // must be inside the try, so both are asserted separately.
    const stub = makeDbStub({ valuesImpl: () => Promise.reject(new Error("ECONNREFUSED")) });
    vi.doMock("@/lib/db", () => ({ db: stub.db }));
    const { recordAudit } = await import("@/lib/audit");

    await expect(recordAudit({ ...ENTRY })).resolves.toBeUndefined();

    expect(stub.values).toHaveBeenCalledTimes(1);
    const entries = auditEntries(infoSpy);
    expect(entries).toHaveLength(1);
    expect(withoutTs(entries[0])).toEqual(EXPECTED_LINE);
  });

  it("resolves when `meta` is NON-SERIALIZABLE, degrading to a minimal line instead of throwing", async () => {
    // The console line's own JSON.stringify sits on the caller's path too. A circular meta would throw
    // synchronously out of a function 57 money-path callers await inside catch blocks. No call site
    // passes a non-primitive meta today, so there is no live trigger — but "recordAudit CANNOT THROW"
    // is stated unconditionally, so it has to actually hold.
    const stub = makeDbStub();
    vi.doMock("@/lib/db", () => ({ db: stub.db }));
    const { recordAudit } = await import("@/lib/audit");

    const circular: Record<string, unknown> = { bookingId: "b1" };
    circular.self = circular;

    await expect(
      recordAudit({ actorId: "u9", action: "auto_refund_manual", outcome: "needs_attention", meta: circular }),
    ).resolves.toBeUndefined();

    // A line still lands, and it still carries the four fields an operator needs to find the seam.
    const entries = auditEntries(infoSpy);
    expect(entries).toHaveLength(1);
    expect(withoutTs(entries[0])).toEqual({
      actorId: "u9",
      action: "auto_refund_manual",
      outcome: "needs_attention",
      meta: "[unserializable]",
    });
  });

  it("resolves when `meta` holds a BigInt (the other JSON.stringify throw)", async () => {
    const stub = makeDbStub();
    vi.doMock("@/lib/db", () => ({ db: stub.db }));
    const { recordAudit } = await import("@/lib/audit");

    await expect(
      // BigInt(1), not the `1n` literal — tsconfig targets below ES2020, where the literal is a TS2737.
      recordAudit({ actorId: "u10", action: "a", outcome: "error", meta: { amount: BigInt(1) } }),
    ).resolves.toBeUndefined();

    const entries = auditEntries(infoSpy);
    expect(entries).toHaveLength(1);
    expect(entries[0].meta).toBe("[unserializable]");
  });
});

describe("D2 — the console line is emitted BEFORE the INSERT is attempted", () => {
  it("console.info has already been called at the moment db.insert() runs", async () => {
    let infoCallsAtInsert = -1;
    const stub = makeDbStub({
      onInsert: () => {
        infoCallsAtInsert = infoSpy.mock.calls.length;
      },
    });
    vi.doMock("@/lib/db", () => ({ db: stub.db }));
    const { recordAudit } = await import("@/lib/audit");

    await recordAudit({ actorId: "u3", action: "c", outcome: "ok" });

    // Proves ordering structurally, with no dependence on timing.
    expect(stub.insert).toHaveBeenCalledTimes(1);
    expect(infoCallsAtInsert).toBeGreaterThanOrEqual(1);
  });

  it("a HUNG database cannot withhold or delay the log line", async () => {
    // The insert never settles. If the log line came after the try/catch it would never be emitted at
    // all — which is the failure this ordering exists to make impossible.
    const stub = makeDbStub({ valuesImpl: () => new Promise<never>(() => {}) });
    vi.doMock("@/lib/db", () => ({ db: stub.db }));
    const { recordAudit } = await import("@/lib/audit");

    const pending = recordAudit({ actorId: "u4", action: "d", outcome: "needs_attention" });
    await Promise.resolve(); // one microtask turn — deliberately NOT awaiting `pending`

    const entries = auditEntries(infoSpy);
    expect(entries).toHaveLength(1);
    expect(withoutTs(entries[0])).toEqual({
      actorId: "u4",
      action: "d",
      outcome: "needs_attention",
    });

    // And the call really is still hung — otherwise the assertion above proves nothing.
    const SENTINEL = Symbol("still-pending");
    await expect(Promise.race([pending, Promise.resolve(SENTINEL)])).resolves.toBe(SENTINEL);
  });
});

describe("CALLER-LEVEL: a broken sink does not change what a real call site returns", () => {
  it("activateHosting returns exactly { ok: true, redirectTo: '/host' } with the audit INSERT throwing", async () => {
    // Clones the harness from tests/security/audit.test.ts, with one change: `insert` throws. This is
    // the assertion the whole task is for — a dead audit table must not convert a handled money-path
    // failure into an unhandled 500.
    const whereMock = vi.fn(async () => undefined);
    const setMock = vi.fn(() => ({ where: whereMock }));
    const updateMock = vi.fn(() => ({ set: setMock }));
    const getSessionMock = vi.fn(async () => ({ user: { id: "audit-durable-host" } }));

    vi.doMock("next/headers", () => ({ headers: async () => new Headers() }));
    vi.doMock("@/lib/auth", () => ({ auth: { api: { getSession: getSessionMock } } }));
    vi.doMock("@/lib/db", () => ({
      db: {
        update: updateMock,
        insert: () => {
          throw new Error("audit sink down");
        },
      },
    }));

    const { activateHosting } = await import("@/app/actions/capability");
    const res = await activateHosting();

    // Byte-identical to what tests/security/audit.test.ts asserts today.
    expect(res).toEqual({ ok: true, redirectTo: "/host" });
    // The privileged flip still happened — the broken sink did not abort the action mid-way.
    expect(updateMock).toHaveBeenCalledTimes(1);
    // And the observable audit record is still there.
    const entries = auditEntries(infoSpy);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      actorId: "audit-durable-host",
      action: "activateHosting",
      outcome: "ok",
    });

    vi.doUnmock("next/headers");
    vi.doUnmock("@/lib/auth");
  });
});
