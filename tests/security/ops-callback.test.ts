import { describe, expect, it, vi } from "vitest";

const OPS_ORIGIN = "https://ops.example.test";

type OpsCallbackModule = {
  safeOpsCallback: (raw: string | null | undefined, opsOrigin: string) => string;
};

async function loadOpsCallback(): Promise<OpsCallbackModule | null> {
  try {
    return (await vi.importActual("@/lib/ops/ops-callback")) as OpsCallbackModule;
  } catch {
    return null;
  }
}

describe("safeOpsCallback", () => {
  it("exports the ops-only callback normalizer", async () => {
    const callbackApi = await loadOpsCallback();
    expect(callbackApi?.safeOpsCallback, "safeOpsCallback must exist before callbacks can be trusted").toBeTypeOf(
      "function",
    );
  });

  it.each([
    ["/ops", "/ops"],
    ["/ops/reviews?state=open#next", "/ops/reviews?state=open#next"],
    ["https://ops.example.test/ops/reviews", "/ops"],
  ])("admits only same-origin ops paths: %s", async (raw, expected) => {
    const callbackApi = await loadOpsCallback();
    expect(callbackApi?.safeOpsCallback).toBeTypeOf("function");
    expect(callbackApi!.safeOpsCallback(raw, OPS_ORIGIN)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    "",
    "/",
    "/login",
    "/operator",
    "/ops-adjacent",
    "//attacker.invalid/ops",
    "/\\attacker.invalid/ops",
    "/..//attacker.invalid/ops",
    "/%2e%2e//attacker.invalid/ops",
    "https://attacker.invalid/ops",
    "https://ops.example.test.attacker.invalid/ops",
    "javascript:alert(1)",
  ])("falls unsafe or non-ops callback %j back to /ops", async (raw) => {
    const callbackApi = await loadOpsCallback();
    expect(callbackApi?.safeOpsCallback).toBeTypeOf("function");
    expect(callbackApi!.safeOpsCallback(raw, OPS_ORIGIN)).toBe("/ops");
  });
});
