import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { makeRacingClients, setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { reserveContactQuota } from "@/lib/contact-quota";
import { contactQuota } from "@/lib/db/schema";
import * as schema from "@/lib/db/schema";
const secret = "contact-quota-test-secret-with-at-least-32-characters";
const globalKey = "contact:global:v1";
const ip = "203.0.113.17";
const key = (value: string) => "contact:ip:v1:" + createHmac("sha256", secret).update("fitout/contact-quota/ip/v1\0").update(value).digest("hex");
let fixture: TestDb;
let clients: ReturnType<typeof makeRacingClients>;
const connectionFor = (client: ReturnType<typeof makeRacingClients>[number]) => drizzle(client, { schema });
let connections: ReturnType<typeof connectionFor>[];
beforeAll(async () => {
  fixture = await setupTestDb();
  clients = makeRacingClients(fixture.schema, 8);
  connections = clients.map(connectionFor);
});
beforeEach(async () => { await fixture.db.delete(contactQuota); });
afterAll(async () => {
  await Promise.all(clients?.map((client) => client.end()) ?? []);
  if (fixture) await teardownTestDb(fixture);
});
async function now() {
  const result = await fixture.db.execute<{ now: string }>(sql`SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::text AS now`);
  return Number(result[0].now);
}
describe("database-wide rolling Contact quotas", () => {
  it("admits exactly five same-IP contenders across independent backends", async () => {
    const pids = await Promise.all(clients.map((client) => client`SELECT pg_backend_pid() AS pid`));
    expect(new Set(pids.map((rows) => rows[0].pid)).size).toBe(8);
    const results = await Promise.all(connections.map((connection) => reserveContactQuota(ip, connection, secret)));
    expect(results.filter((result) => result.ok)).toHaveLength(5);
    expect(results.filter((result) => !result.ok && result.reason === "limited")).toHaveLength(3);
    const rows = await fixture.db.select().from(contactQuota);
    expect(rows.find((row) => row.key === globalKey)?.attempts).toHaveLength(5);
    expect(rows.find((row) => row.key === key(ip))?.attempts).toHaveLength(5);
    expect(JSON.stringify(rows)).not.toContain(ip);
    expect(rows).toHaveLength(2);
  });
  it("admits only the remaining global slot and cannot create keys after exhaustion", async () => {
    const time = await now();
    await fixture.db.insert(contactQuota).values({ key: globalKey, attempts: Array(99).fill(time - 1), expiresAt: new Date(time + 3_600_000) });
    const results = await Promise.all(connections.map((connection, index) => reserveContactQuota(`203.0.113.${index + 1}`, connection, secret)));
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok && result.reason === "limited")).toHaveLength(7);
    const rows = await fixture.db.select().from(contactQuota);
    expect(rows.find((row) => row.key === globalKey)?.attempts).toHaveLength(100);
    expect(rows).toHaveLength(2);
  });
  it("drops stamps at the rolling boundary while retaining recent stamps", async () => {
    const time = await now();
    await fixture.db.insert(contactQuota).values([
      { key: globalKey, attempts: Array(100).fill(time - 3_600_000), expiresAt: new Date(time + 3_600_000) },
      { key: key(ip), attempts: [time - 900_000, ...Array(4).fill(time - 1)], expiresAt: new Date(time + 900_000) },
    ]);
    expect(await reserveContactQuota(ip, connections[0], secret)).toEqual({ ok: true });
    const rows = await fixture.db.select().from(contactQuota);
    expect(rows.find((row) => row.key === globalKey)?.attempts).toHaveLength(1);
    expect(rows.find((row) => row.key === key(ip))?.attempts).toHaveLength(5);
  });
  it("deletes expired identifiers on the next reservation", async () => {
    await fixture.db.insert(contactQuota).values({ key: key("203.0.113.88"), attempts: [], expiresAt: new Date(1) });
    expect(await reserveContactQuota(ip, connections[0], secret)).toEqual({ ok: true });
    const rows = await fixture.db.select().from(contactQuota);
    expect(rows.some((row) => row.key === key("203.0.113.88"))).toBe(false);
  });
  it.each([null, {}, ["not-a-timestamp"], [-1], [Number.MAX_SAFE_INTEGER], Array(101).fill(1)])("fails closed on corrupt global state %#", async (attempts) => {
    await fixture.db.execute(sql`INSERT INTO contact_quota (key, attempts, expires_at) VALUES (${globalKey}, ${JSON.stringify(attempts)}::jsonb, clock_timestamp() + interval '1 hour')`);
    expect(await reserveContactQuota(ip, connections[0], secret)).toEqual({ ok: false, reason: "unavailable" });
    expect(await fixture.db.select().from(contactQuota)).toHaveLength(1);
  });
  it("returns unavailable after a real database statement error without writes", async () => {
    await clients[0]`SET search_path TO pg_catalog`;
    try {
      expect(await reserveContactQuota(ip, connections[0], secret)).toEqual({ ok: false, reason: "unavailable" });
      expect(await fixture.db.select().from(contactQuota)).toHaveLength(0);
    } finally { await clients[0].unsafe(`SET search_path TO ${fixture.schema},public`); }
  });
  it("fails closed on an ended database connection", async () => {
    const [offline] = makeRacingClients(fixture.schema, 1);
    const connection = connectionFor(offline);
    await offline.end();
    expect(await reserveContactQuota(ip, connection, secret)).toEqual({ ok: false, reason: "unavailable" });
    expect(await fixture.db.select().from(contactQuota)).toHaveLength(0);
  });
  it("bounds waiting for a competing transaction and makes no reservation on timeout", async () => {
    let acquired!: () => void;
    const ready = new Promise<void>((resolve) => { acquired = resolve; });
    const holder = clients[0].begin(async (transaction) => {
      await transaction`SELECT pg_advisory_xact_lock(27018, 1)`;
      acquired();
      await transaction`SELECT pg_sleep(2.5)`;
    });
    await ready;
    try {
      expect(await reserveContactQuota(ip, connections[1], secret)).toEqual({ ok: false, reason: "unavailable" });
      expect(await fixture.db.select().from(contactQuota)).toHaveLength(0);
    } finally { await holder; }
  });
  it("requires a valid identity and adequately sized server secret", async () => {
    expect(await reserveContactQuota("attacker", connections[0], secret)).toEqual({ ok: false, reason: "unavailable" });
    expect(await reserveContactQuota(ip, connections[0], "short")).toEqual({ ok: false, reason: "unavailable" });
    expect(await fixture.db.select().from(contactQuota)).toHaveLength(0);
  });
});
