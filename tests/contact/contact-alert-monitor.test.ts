import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ inspect: vi.fn(), deliver: vi.fn(), send: vi.fn(), enabled: vi.fn(), create: vi.fn() }));
vi.mock("inngest", () => ({ Inngest: class {
  createFunction(config: unknown, handler: unknown) { mocks.create(config); return handler; }
} }));
vi.mock("@/lib/contact-alerts", () => ({ inspectContactAlerts: mocks.inspect, deliverContactAlert: mocks.deliver }));
vi.mock("@/lib/contact-alert-mail", () => ({ contactAlertMonitorEnabled: mocks.enabled, sendContactControlAlert: mocks.send }));
type Handler = (args: { step: { run: (id: string, callback: () => unknown) => Promise<unknown> }; event: { ts: number } }) => Promise<unknown>;
let monitor: Handler;
const createRun = () => vi.fn(async (_id: string, callback: () => unknown) => callback());
let run: ReturnType<typeof createRun>;
beforeEach(async () => {
  vi.resetModules(); mocks.create.mockClear(); mocks.inspect.mockReset(); mocks.deliver.mockReset(); mocks.send.mockReset(); mocks.enabled.mockReturnValue(true);
  run = createRun();
  monitor = (await import("@/inngest/contact-alerts")).contactAlertMonitor as unknown as Handler;
});
describe("Contact scheduler orchestration", () => {
  it("does no work outside the configured production monitor", async () => {
    mocks.enabled.mockReturnValue(false);
    expect(await monitor({ step: { run }, event: { ts: 0 } })).toEqual({ active: false });
    expect(run).not.toHaveBeenCalled();
  });
  it("uses a stable hourly outage payload without needing a working database", async () => {
    mocks.inspect.mockResolvedValue({ available: false, ids: [], staleCount: 0 }); mocks.send.mockResolvedValue("provider-id");
    const ts = Date.parse("2026-10-11T08:01:00Z");
    await monitor({ step: { run }, event: { ts } }); await monitor({ step: { run }, event: { ts: ts + 300_000 } });
    expect(mocks.send.mock.calls[0]).toEqual(mocks.send.mock.calls[1]);
    expect(mocks.send.mock.calls[0][0]).toMatchObject({ kind: "quota_unavailable", observedAt: "2026-10-11T08:00:00.000Z" });
    expect(mocks.deliver).not.toHaveBeenCalled();
  });
  it("propagates delivery failure for durable scheduler retry", async () => {
    mocks.inspect.mockResolvedValue({ available: true, ids: ["opaque-id"], staleCount: 0 }); mocks.deliver.mockRejectedValue(new Error("delivery failed"));
    await expect(monitor({ step: { run }, event: { ts: 0 } })).rejects.toThrow("delivery failed");
    expect(mocks.deliver).toHaveBeenCalledWith("opaque-id");
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ retries: 5, concurrency: 1, triggers: [{ cron: "1-59/5 * * * *" }] });
  });
});
