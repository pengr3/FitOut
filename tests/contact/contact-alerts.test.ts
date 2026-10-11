import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, makeRacingClients, type TestDb } from "../helpers/db";
import { contactAlert, contactQuota } from "@/lib/db/schema";
import * as schema from "@/lib/db/schema";
import { reserveContactQuota } from "@/lib/contact-quota";
import { inspectContactAlerts, deliverContactAlert } from "@/lib/contact-alerts";
let f: TestDb;let clients: ReturnType<typeof makeRacingClients>;let connections: ReturnType<typeof drizzle<typeof schema>>[];
beforeAll(async()=>{f=await setupTestDb();clients=makeRacingClients(f.schema,8);connections=clients.map(c=>drizzle(c,{schema}));});
beforeEach(async()=>{await f.db.delete(contactQuota);await f.db.delete(contactAlert);});
afterAll(async()=>{await Promise.all(clients.map(c=>c.end()));await teardownTestDb(f);});
async function seedQuota(){await f.db.execute(sql`INSERT INTO contact_quota(key,attempts,expires_at) SELECT 'contact:global:v1', (SELECT jsonb_agg(ms-n) FROM generate_series(1,99) AS g(n)), clock_timestamp()+interval '1 hour' FROM (SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS ms) AS clock`);}
describe("durable Contact control alerts",()=>{
  it("atomically records one incident at the100th reservation under a real backend race",async()=>{
    await seedQuota();const results=await Promise.all(connections.map((c,i)=>reserveContactQuota('203.0.113.'+(i+1),c,'a'.repeat(40))));
    expect(results.filter(r=>r.ok)).toHaveLength(1);expect(await f.db.select().from(contactAlert)).toHaveLength(1);
    const state=await inspectContactAlerts(connections[0]);expect(state.available).toBe(true);expect(state.ids).toHaveLength(1);
    await Promise.all(connections.map(c=>inspectContactAlerts(c)));expect(await f.db.select().from(contactAlert)).toHaveLength(1);
    expect(JSON.stringify(await f.db.select().from(contactAlert))).not.toContain('203.0.113');
  });
  it("keeps failed delivery pending, retries the same incident and skips subsequent successful sends",async()=>{
    const [row]=await f.db.insert(contactAlert).values({synthetic:true}).returning();
    const send=vi.fn().mockRejectedValueOnce(new Error('private provider payload')).mockResolvedValue('provider-accepted-id');
    await expect(deliverContactAlert(row.id,connections[0],send)).rejects.toThrow('incident remains pending');
    expect((await f.db.select().from(contactAlert))[0].sentAt).toBeNull();
    expect(await deliverContactAlert(row.id,connections[0],send)).toEqual({sent:true,providerId:'provider-accepted-id'});
    expect(send.mock.calls[0][0]).toEqual(send.mock.calls[1][0]);
    expect((await inspectContactAlerts(connections[0])).ids).toEqual([]);
    expect((await deliverContactAlert(row.id,connections[0],send)).sent).toBe(false);expect(send).toHaveBeenCalledTimes(2);
  });
  it("refuses stale uncertain delivery beyond the bounded provider-idempotency window",async()=>{
    const [row]=await f.db.insert(contactAlert).values({createdAt:new Date(Date.now()-24*3_600_000)}).returning();const send=vi.fn();
    const state=await inspectContactAlerts(connections[0]);expect(state.ids).toEqual([]);expect(state.staleCount).toBe(1);
    await expect(deliverContactAlert(row.id,connections[0],send)).rejects.toThrow();expect(send).not.toHaveBeenCalled();
  });
  it("detects corrupt quota state and suppresses raw database errors",async()=>{
    await f.db.execute(sql`INSERT INTO contact_quota VALUES ('contact:global:v1','["bad"]'::jsonb,clock_timestamp()+interval '1 hour')`);
    expect(await inspectContactAlerts(connections[0])).toEqual({available:false,ids:[],staleCount:0});
  });
  it("identifies a real unavailable database without exposing its error",async()=>{
    const [client]=makeRacingClients(f.schema,1);const connection=drizzle(client,{schema});await client.end();
    expect(await inspectContactAlerts(connection)).toEqual({available:false,ids:[],staleCount:0});
  });
});
