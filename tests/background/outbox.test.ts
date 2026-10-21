import { afterAll,afterEach,beforeAll,beforeEach,describe,expect,it,vi } from "vitest";
import { setupTestDb,teardownTestDb,type TestDb } from "../helpers/db";
import { seedSearchListings } from "../helpers/seed";
import { addBackgroundWork,dispatchBackgroundTasks,readBackgroundTask,requireBookingBackgroundDelivery } from "@/lib/background-outbox";
import { processBackgroundTask,repairBackgroundWork } from "@/lib/background-work";
import { expireOne,queryExpired } from "@/inngest/functions/request-expiry";

const { send }=vi.hoisted(()=>({send:vi.fn().mockResolvedValue({ids:[]})}));
vi.mock("@/inngest/client",()=>({inngest:{send,createFunction:(_options:unknown,handler:unknown)=>handler}}));

let fixture:TestDb;
let listingId:string;
let sequence=0;
beforeAll(async()=>{
  vi.stubEnv("PAYOUT_RECIPIENT_ENCRYPTION_KEY",Buffer.alloc(32,1).toString("base64"));
  fixture=await setupTestDb();
  const seeded=await seedSearchListings(fixture.db); listingId=seeded.listingIds[0];
  await fixture.client`INSERT INTO "user"(id,name,email,first_name,can_book) VALUES ('background_booker','Test','background@example.invalid','Test',true)`;
});
beforeEach(async()=>{
  vi.stubEnv("BACKGROUND_EXECUTION_MODE","events");
  send.mockReset().mockResolvedValue({ids:[]});
  vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("External network forbidden in this test")));
  await fixture.client`DELETE FROM booking`;
  await fixture.client`DELETE FROM background_task`;
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
afterAll(async()=>{await teardownTestDb(fixture);});

async function insertBooking(id:string,expired=false) {
  sequence++;
  await fixture.client`INSERT INTO booking(id,listing_id,unit,booker_id,starts_at,ends_at,status,expires_at,created_at)
    VALUES (${id},${listingId},1,'background_booker',now()+make_interval(days=>${sequence+1}),now()+make_interval(days=>${sequence+1})+interval '1 hour',
    'requested',now()+(${expired ? "-1 hour":"24 hours"})::interval,now()-interval '1 day')`;
  const [task]=await fixture.client`SELECT id FROM background_task WHERE entity_id=${id} AND kind='plan' AND cancelled_at IS NULL`;
  return task.id as string;
}

describe("Durable domain outbox on real Postgres",()=>{
  it("writes a planner with the booking and publishes nothing inside its transaction",async()=>{
    await insertBooking("atomic");
    expect((await fixture.client`SELECT count(*)::int AS count FROM background_task`)[0].count).toBe(1);
    expect(send).not.toHaveBeenCalled();
  });
  it("a rollback rolls back its scheduling event too",async()=>{
    await expect(fixture.client.begin(async tx=>{
      await tx`INSERT INTO contact_alert(id) VALUES ('rollback_alert')`;
      throw new Error("rollback");
    })).rejects.toThrow("rollback");
    expect((await fixture.client`SELECT count(*)::int AS count FROM background_task`)[0].count).toBe(0);
  });
  it("plans once across concurrent deliveries and retries",async()=>{
    const id=await insertBooking("concurrent");
    await Promise.all([processBackgroundTask(id,fixture.db),processBackgroundTask(id,fixture.db)]);
    const rows=await fixture.client`SELECT kind FROM background_task WHERE entity_id='concurrent' AND kind<>'plan'`;
    expect(rows.map(row=>row.kind).sort()).toEqual(["expiry","reminder:pre_sla_host"]);
    expect(await processBackgroundTask(id,fixture.db)).toEqual({state:"obsolete"});
  });
  it("a changed deadline cancels the old timer and atomically queues its replacement",async()=>{
    const id=await insertBooking("extended"); await processBackgroundTask(id,fixture.db);
    const [old]=await fixture.client`SELECT id FROM background_task WHERE entity_id='extended' AND kind='expiry'`;
    await fixture.client`UPDATE booking SET expires_at=now()+interval '2 days' WHERE id='extended'`;
    expect(await processBackgroundTask(old.id,fixture.db)).toEqual({state:"obsolete"});
    expect((await fixture.client`SELECT count(*)::int AS count FROM background_task WHERE entity_id='extended' AND kind='plan' AND cancelled_at IS NULL AND completed_at IS NULL`)[0].count).toBe(1);
  });
  it("refuses an early expiry and uses the persisted deadline",async()=>{
    const id=await insertBooking("early"); await processBackgroundTask(id,fixture.db);
    const [task]=await fixture.client`SELECT id FROM background_task WHERE entity_id='early' AND kind='expiry'`;
    await expect(processBackgroundTask(task.id,fixture.db)).rejects.toThrow("not due");
    expect((await fixture.client`SELECT status FROM booking WHERE id='early'`)[0].status).toBe("requested");
  });
  it("cannot expire a booking extended between selection and update",async()=>{
    await insertBooking("expiry_race",true);
    const [candidate]=await queryExpired(fixture.db,"expiry_race");
    await fixture.client`UPDATE booking SET expires_at=now()+interval '1 hour' WHERE id='expiry_race'`;
    expect(await expireOne(fixture.db,candidate)).toEqual({status:"noop"});
    expect((await fixture.client`SELECT status FROM booking WHERE id='expiry_race'`)[0].status).toBe("requested");
  });
  it("expires and notifies once, despite delivery replay",async()=>{
    const id=await insertBooking("expiry",true); await processBackgroundTask(id,fixture.db);
    const [timer]=await fixture.client`SELECT id FROM background_task WHERE entity_id='expiry' AND kind='expiry' AND cancelled_at IS NULL`;
    await processBackgroundTask(timer.id,fixture.db);
    expect((await fixture.client`SELECT status FROM booking WHERE id='expiry'`)[0].status).toBe("declined");
    expect(await processBackgroundTask(timer.id,fixture.db)).toEqual({state:"obsolete"});
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("retains the event when publication fails and retries it without losing the record",async()=>{
    const id=await insertBooking("publish_failure");
    await expect(dispatchBackgroundTasks(fixture.db,async()=>{throw new Error("offline");})).rejects.toThrow("durable work remains pending");
    const [pending]=await fixture.client`SELECT published_at,lease_until FROM background_task WHERE id=${id}`;
    expect(pending).toMatchObject({published_at:null,lease_until:null});
    const publish=vi.fn().mockResolvedValue({});
    expect(await dispatchBackgroundTasks(fixture.db,publish)).toMatchObject({published:1});
    expect(publish.mock.calls[0][0][0].data).toEqual({taskId:id});
  });
  it("concurrent publishers claim disjoint work",async()=>{
    await insertBooking("publish_race");
    const publish=vi.fn(async()=>{await new Promise(resolve=>setTimeout(resolve,20));});
    const result=await Promise.all([dispatchBackgroundTasks(fixture.db,publish),dispatchBackgroundTasks(fixture.db,publish)]);
    expect(result.reduce((total,item)=>total+item.published,0)).toBe(1);
    expect(publish).toHaveBeenCalledTimes(1);
  });
  it("holds a 90-day reminder outside Inngest until it is within the scheduling horizon",async()=>{
    const id=await insertBooking("far_future"); const parent=await readBackgroundTask(id,fixture.db);
    const [{due}]=await fixture.client`SELECT (now()+interval '90 days')::text AS due`;
    await addBackgroundWork(parent!,[{kind:"reminder:pre_session_booker",dueAt:new Date(due).toISOString()}],fixture.db);
    const [row]=await fixture.client`SELECT available_at>now()+interval '62 days' AS deferred FROM background_task WHERE kind='reminder:pre_session_booker'`;
    expect(row.deferred).toBe(true);
    const publish=vi.fn().mockResolvedValue({});
    await dispatchBackgroundTasks(fixture.db,publish);
    expect(publish.mock.calls[0][0]).toHaveLength(1); // only the immediate planner
  });
  it("daily audit repairs an accepted event whose worker never finished",async()=>{
    const id=await insertBooking("lost_worker");
    await fixture.client`UPDATE background_task SET due_at=now()-interval '2 hours',published_at=now()-interval '2 hours' WHERE id=${id}`;
    await repairBackgroundWork(fixture.db);
    expect((await fixture.client`SELECT published_at FROM background_task WHERE id=${id}`)[0].published_at).toBeNull();
  });
  it("does not add background work when the database has no active domain records",async()=>{
    expect(await repairBackgroundWork(fixture.db)).toEqual({repaired:0});
    const publish=vi.fn(); expect(await dispatchBackgroundTasks(fixture.db,publish)).toMatchObject({published:0});
    expect(publish).not.toHaveBeenCalled();
  });
  it("withholds checkout delivery if the scheduler is unavailable",async()=>{
    await insertBooking("checkout_dispatch");send.mockRejectedValue(new Error("scheduler offline"));
    await expect(requireBookingBackgroundDelivery("checkout_dispatch",fixture.db)).rejects.toThrow("durable work remains pending");
  });
});
