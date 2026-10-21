import {afterEach,describe,expect,it,vi} from "vitest";
const {dispatch}=vi.hoisted(()=>({dispatch:vi.fn()}));
vi.mock("@/lib/background-after",()=>({dispatchBackgroundAfterResponse:dispatch}));
afterEach(()=>{vi.unstubAllEnvs();dispatch.mockClear();});

describe("Unauthenticated webhook requests cannot wake the outbox",()=>{
  it("rejects PayMongo before registering any database dispatch",async()=>{
    vi.stubEnv("BACKGROUND_EXECUTION_MODE","events");
    const {POST}=await import("@/app/api/paymongo/webhook/route");
    const response=await POST(new Request("http://localhost/api/paymongo/webhook",{method:"POST",body:"{}"}));
    expect(response.status).toBe(400);expect(dispatch).not.toHaveBeenCalled();
  });
  it("rejects Didit before registering any database dispatch",async()=>{
    vi.stubEnv("BACKGROUND_EXECUTION_MODE","events");
    const {POST}=await import("@/app/api/didit/webhook/route");
    const response=await POST(new Request("http://localhost/api/didit/webhook",{method:"POST",body:"{}"}));
    expect(response.status).toBe(400);expect(dispatch).not.toHaveBeenCalled();
  });
});
