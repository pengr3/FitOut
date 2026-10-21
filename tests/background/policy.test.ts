import { afterEach,describe,expect,it,vi } from "vitest";
import { planBookingWork,recoveryTriggers,type BookingSchedule } from "@/lib/background-policy";

afterEach(()=>vi.unstubAllEnvs());
const now="2026-10-21T00:00:00.000Z";
const offsets={preExpiry:4,preSla:6,booker:24,host:12};
const base:BookingSchedule={status:"requested",expiresAt:"2026-10-22T00:00:00.000Z",startsAt:"2026-10-24T00:00:00.000Z",
  endsAt:"2026-10-24T01:00:00.000Z",createdAt:now,checkoutSessionId:null,paymentId:null};

describe("Record-driven scheduling",()=>{
  it("schedules an approval deadline and the existing host reminder offset",()=>{
    expect(planBookingWork(base,now,offsets)).toEqual([
      {kind:"expiry",dueAt:"2026-10-22T00:00:00.000Z"},
      {kind:"reminder:pre_sla_host",dueAt:"2026-10-21T18:00:00.000Z"},
    ]);
  });
  it("schedules payment recovery only when a payable session actually exists",()=>{
    expect(planBookingWork({...base,status:"pending"},now,offsets).map(t=>t.kind)).toEqual(["expiry"]);
    expect(planBookingWork({...base,status:"pending",checkoutSessionId:"cs_test"},now,offsets)).toContainEqual({kind:"payment",dueAt:"2026-10-21T00:02:00.000Z"});
  });
  it("cancellation has no expiry, payment recovery or reminder work",()=>{
    expect(planBookingWork({...base,status:"cancelled",checkoutSessionId:"cs_old"},now,offsets)).toEqual([]);
  });
  it("preserves the existing unreachable-reminder rule for a short approval window",()=>{
    expect(planBookingWork({...base,expiresAt:"2026-10-21T02:00:00Z"},now,offsets).map(t=>t.kind)).toEqual(["expiry"]);
  });
  it("plans far-future reminders as persisted timestamps rather than starting a 90-day sleep",()=>{
    const work=planBookingWork({...base,status:"confirmed",startsAt:"2027-01-18T00:00:00Z"},now,offsets);
    expect(work).toContainEqual({kind:"reminder:pre_session_booker",dueAt:"2027-01-17T00:00:00.000Z"});
  });
  it("does not schedule reminders for a session that already started",()=>{
    expect(planBookingWork({...base,status:"confirmed",startsAt:"2026-10-20T00:00:00Z"},now,offsets)).toEqual([]);
  });
  it("removes recurring scans in event mode and keeps explicit recovery triggers",()=>{
    vi.stubEnv("BACKGROUND_EXECUTION_MODE","events");
    expect(recoveryTriggers("payment-reconcile","2-59/5 * * * *")).toEqual([{event:"fitout/recovery.payment-reconcile"}]);
  });
  it("keeps the old schedule until the migration is explicitly enabled",()=>{
    vi.stubEnv("BACKGROUND_EXECUTION_MODE","");
    expect(recoveryTriggers("payment-reconcile","2-59/5 * * * *")).toEqual([{cron:"2-59/5 * * * *"}]);
  });
});
