import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/inngest/client", () => ({
  inngest: {
    createFunction: (_options: unknown, handler: unknown) => ({ handler }),
    send: vi.fn(),
  },
}));

import { payoutSweep } from "@/inngest/functions/payout-sweep";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("Friday payout cron release gate", () => {
  it("does not query or dispatch when the production release mode is held", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T04:00:00.000Z"));
    vi.stubEnv("PAYOUT_DISPATCH_MODE", "hold");
    const run = vi.fn();
    const registered = payoutSweep as unknown as {
      handler: (input: { step: { run: typeof run } }) => Promise<unknown>;
    };

    await expect(registered.handler({ step: { run } })).resolves.toEqual({
      swept: 0, missed: 0, held: true,
    });
    expect(run).not.toHaveBeenCalled();
  });
});
