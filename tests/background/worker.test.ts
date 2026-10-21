import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({read:vi.fn(),process:vi.fn(),dispatch:vi.fn(),repair:vi.fn(),configs:[] as Array<{id:string;triggers:unknown;concurrency?:unknown}>}));
vi.mock("@/inngest/client",()=>({inngest:{createFunction:(options:{id:string;triggers:unknown},handler:unknown)=>{
  mocks.configs.push(options);return handler;
}}}));
vi.mock("@/lib/background-outbox",()=>({readBackgroundTask:mocks.read,dispatchBackgroundTasks:mocks.dispatch}));
vi.mock("@/lib/background-work",()=>({processBackgroundTask:mocks.process,repairBackgroundWork:mocks.repair}));
vi.mock("@/inngest/functions/settlement-reconcile",()=>({configuredSettlementAccount:()=>null,paymongoReader:{},querySettlementRefreshCandidates:vi.fn(),refreshBookingSettlement:vi.fn()}));
vi.mock("@/inngest/functions/payout-reconcile",()=>({alertStuckHeld:vi.fn()}));
vi.mock("@/lib/db",()=>({db:{}}));

type Handler=(context:{event:{data:{taskId:unknown}};step:{run:ReturnType<typeof vi.fn>;sleepUntil:ReturnType<typeof vi.fn>}})=>Promise<unknown>;
beforeEach(()=>{
  vi.resetModules();vi.stubEnv("BACKGROUND_EXECUTION_MODE","events");
  mocks.configs.length=0;mocks.read.mockReset();mocks.process.mockReset().mockResolvedValue({state:"completed"});
  mocks.dispatch.mockReset().mockResolvedValue({published:0});
});
afterEach(()=>vi.unstubAllEnvs());
const step=()=>({run:vi.fn(async (_id:string,fn:()=>unknown)=>fn()),sleepUntil:vi.fn().mockResolvedValue(undefined)});

describe("Durable Inngest worker",()=>{
  it("registers within the current five-step cloud plan while serializing each task",async()=>{
    await import("@/inngest/functions/background-work");
    expect(mocks.configs.find(item=>item.id==="background-work")?.concurrency).toEqual([{limit:1,key:"event.data.taskId"},{limit:5}]);
  });
  it("waits for the persisted deadline before running the database work",async()=>{
    const dueAt=new Date(Date.now()+60_000).toISOString();mocks.read.mockResolvedValue({id:"task",dueAt});
    const {backgroundWork}=await import("@/inngest/functions/background-work");
    let wake:()=>void=()=>{};
    const steps=step();steps.sleepUntil.mockImplementation(()=>new Promise<void>(resolve=>{wake=resolve;}));
    const run=(backgroundWork as unknown as Handler)({event:{data:{taskId:"task"}},step:steps});
    await vi.waitFor(()=>expect(steps.sleepUntil).toHaveBeenCalledWith("wait-for-deadline",dueAt));
    expect(mocks.process).not.toHaveBeenCalled();wake();
    expect(await run).toEqual({state:"completed"});
    expect(mocks.process).toHaveBeenCalledWith("task");expect(mocks.dispatch).toHaveBeenCalledOnce();
  });
  it("does nothing for completed or cancelled deliveries",async()=>{
    mocks.read.mockResolvedValue(null);const steps=step();
    const {backgroundWork}=await import("@/inngest/functions/background-work");
    expect(await (backgroundWork as unknown as Handler)({event:{data:{taskId:"gone"}},step:steps})).toEqual({state:"obsolete"});
    expect(steps.sleepUntil).not.toHaveBeenCalled();expect(mocks.process).not.toHaveBeenCalled();
  });
  it("refuses a far-future event instead of exceeding the Free workflow duration",async()=>{
    mocks.read.mockResolvedValue({id:"task",dueAt:new Date(Date.now()+90*86_400_000).toISOString()});
    const {backgroundWork}=await import("@/inngest/functions/background-work");const steps=step();
    await expect((backgroundWork as unknown as Handler)({event:{data:{taskId:"task"}},step:steps})).rejects.toThrow("scheduling horizon");
    expect(steps.sleepUntil).not.toHaveBeenCalled();
  });
  it("does not dispatch additional work when a timer was cancelled during its wait",async()=>{
    mocks.read.mockResolvedValue({id:"task",dueAt:new Date(Date.now()+60_000).toISOString()});
    mocks.process.mockResolvedValue({state:"obsolete"});
    const {backgroundWork}=await import("@/inngest/functions/background-work");
    expect(await (backgroundWork as unknown as Handler)({event:{data:{taskId:"task"}},step:step()})).toEqual({state:"obsolete"});
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it("backs off a database quota failure before planning or sleeping",async()=>{
    mocks.read.mockRejectedValue(new Error("Failed query",{cause:new Error("Your account or project has exceeded the quota")}));
    const {backgroundWork}=await import("@/inngest/functions/background-work");const steps=step();
    await expect((backgroundWork as unknown as Handler)({event:{data:{taskId:"task"}},step:steps})).rejects.toMatchObject({name:"RetryAfterError",retryAfter:"3600"});
    expect(steps.sleepUntil).not.toHaveBeenCalled();expect(mocks.process).not.toHaveBeenCalled();
  });
  it("keeps exactly one daily automatic recovery audit in event mode",async()=>{
    await import("@/inngest/functions/background-work");
    expect(mocks.configs.find(item=>item.id==="background-recovery-audit")?.triggers).toEqual([{cron:"TZ=Asia/Manila 0 8 * * *"}]);
  });
  it("does not publish or touch persisted work when event mode is disabled",async()=>{
    vi.stubEnv("BACKGROUND_EXECUTION_MODE","polling");
    const {backgroundWork}=await import("@/inngest/functions/background-work");
    expect(await (backgroundWork as unknown as Handler)({event:{data:{taskId:"task"}},step:step()})).toEqual({enabled:false});
    expect(mocks.read).not.toHaveBeenCalled();
  });
});
