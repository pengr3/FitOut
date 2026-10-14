import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { makeRacingClients, setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user } from "@/lib/db/schema";
import { grantStaff } from "@/lib/ops/grant";

const state = vi.hoisted(() => ({ connection: null as unknown, userId: "", audit: vi.fn(), limit: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: async () => state.userId ? { user: { id: state.userId, role: "user" } } : null } } }));
vi.mock("@/lib/db", () => ({ db: { transaction: (...args: Parameters<TestDb["db"]["transaction"]>) => (state.connection as TestDb["db"]).transaction(...args) } }));
vi.mock("@/lib/audit", () => ({ recordAudit: state.audit }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: state.limit }));
import { activateBooking, activateHosting } from "@/app/actions/capability";

let database: TestDb;
beforeAll(async () => { database = await setupTestDb(); });
afterAll(async () => { await teardownTestDb(database); });
beforeEach(() => {
  state.connection = database.db; state.userId = ""; state.audit.mockReset();
  state.limit.mockReset().mockReturnValue({ ok: true });
});
async function seed(role: string | null, canBook = false, canHost = false) {
  const id = randomUUID();
  await database.db.insert(user).values({ id, name: "Policy case", firstName: "Policy", email: `${id}@example.test`, role, canBook, canHost });
  state.userId = id;
  return id;
}
async function read(id: string) { return (await database.db.select().from(user).where(eq(user.id, id)))[0]; }
const actions = [activateHosting, activateBooking];

describe("authoritative customer capability role policy", () => {
  it.each(actions)("denies direct staff activation even with a stale customer session", async (activate) => {
    const id = await seed("staff");
    expect(await activate()).toMatchObject({ ok: false });
    expect(await read(id)).toMatchObject({ role: "staff", canHost: false, canBook: false });
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ outcome: "denied", meta: { reason: "ineligible_role" } }));
  });
  it.each([null, "admin", "unexpected"])("denies unknown role %s by positive eligibility", async (role) => {
    await seed(role); expect(await activateHosting()).toMatchObject({ ok: false });
  });
  it("denies a missing authoritative row", async () => {
    state.userId = randomUUID(); expect(await activateHosting()).toMatchObject({ ok: false });
    expect(state.audit).not.toHaveBeenCalledWith(expect.objectContaining({ outcome: "ok" }));
  });
  it.each(actions)("preserves both capabilities and successful audit for eligible customers", async (activate) => {
    const id = await seed("user", activate === activateHosting, activate === activateBooking);
    expect(await activate()).toMatchObject({ ok: true });
    expect(await read(id)).toMatchObject({ role: "user", canHost: true, canBook: true });
    expect(state.audit).toHaveBeenCalledOnce();
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ outcome: "ok" }));
  });
  it("preserves the shared per-identity attempt budget and denial audit", async () => {
    const id = await seed("user"); state.limit.mockReturnValue({ ok: false, retryAfter: 60 });
    expect(await activateHosting()).toMatchObject({ ok: false });
    expect(state.limit).toHaveBeenCalledWith(`activate:${id}`, { window: 60, max: 5 });
    expect(await read(id)).toMatchObject({ canHost: false });
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ outcome: "denied", meta: { reason: "rate_limit", retryAfter: 60 } }));
  });

  // Real independent PostgreSQL connections, with the first writer held AFTER its advisory lock.
  // Observe the second backend waiting on that lock before releasing; no timing-only race claim.
  for (const activate of actions) for (const first of ["activation", "conversion"] as const) {
    it(`${activate.name} versus staff conversion, ${first} holds the lock first`, async () => {
      const id = await seed("user");
      const clients = makeRacingClients(database.schema, 2);
      const connections = clients.map((client) => drizzle(client));
      let release!: () => void; let held!: () => void;
      const hold = new Promise<void>((resolve) => { release = resolve; });
      const lockHeld = new Promise<void>((resolve) => { held = resolve; });
      const guarded = new Proxy(connections[0], {
        get(target, key) {
          if (key !== "transaction") return Reflect.get(target, key);
          return (callback: Parameters<TestDb["db"]["transaction"]>[0]) => target.transaction(async (tx) => callback(new Proxy(tx, {
            get(transaction, method) {
              if (method !== "execute") return Reflect.get(transaction, method);
              return async (...args: Parameters<typeof tx.execute>) => {
                const result = await transaction.execute(...args);
                held(); await hold; return result;
              };
            },
          })));
        },
      });
      const [{ pid }] = await clients[1]`SELECT pg_backend_pid() AS pid`;
      state.connection = first === "activation" ? guarded : connections[1];
      let firstResult: ReturnType<typeof activateHosting> | ReturnType<typeof grantStaff> | undefined;
      let secondResult: typeof firstResult;
      try {
        firstResult = first === "activation" ? activate() : grantStaff(guarded, id, "policy-test", { convertMarketplaceAccount: true });
        await lockHeld;
        secondResult = first === "activation" ? grantStaff(connections[1], id, "policy-test", { convertMarketplaceAccount: true }) : activate();
        const deadline = Date.now() + 5000;
        let waiting = false;
        while (!waiting && Date.now() < deadline) {
          const [row] = await database.client`SELECT EXISTS(SELECT 1 FROM pg_locks WHERE pid = ${pid} AND locktype = 'advisory' AND NOT granted) AS waiting`;
          waiting = row.waiting;
          if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(waiting, "second writer must actually wait for the shared advisory lock").toBe(true);
        release();
        const results = await Promise.all([firstResult, secondResult]);
        expect(results[first === "conversion" ? 0 : 1]).toMatchObject({ outcome: "written" });
        expect(results[first === "activation" ? 0 : 1]).toMatchObject({ ok: first === "activation" });
        expect(await read(id)).toMatchObject({ role: "staff", canHost: false, canBook: false });
      } finally {
        release(); await Promise.allSettled([firstResult, secondResult]);
        await Promise.all(clients.map((client) => client.end()));
      }
    });
  }
  it("ordinary staff grant refuses an account after real activation", async () => {
    const id = await seed("user"); expect(await activateHosting()).toMatchObject({ ok: true });
    expect(await grantStaff(database.db, id, "policy-test")).toMatchObject({ outcome: "refused", reason: "marketplace_account" });
    expect(await read(id)).toMatchObject({ role: "user", canHost: true });
  });
});
