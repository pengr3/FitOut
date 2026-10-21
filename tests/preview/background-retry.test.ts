import { describe, expect, it } from "vitest";
import { RetryAfterError } from "inngest";
import { databaseCapacityExhausted, withBackgroundRetry } from "@/lib/background-retry";

describe("database quota backoff", () => {
  it("recognizes the quota error through wrapped driver causes", () => {
    expect(databaseCapacityExhausted(new Error("Failed query", { cause: new Error("Your account or project has exceeded the quota. Upgrade your plan to increase limits.") }))).toBe(true);
    expect(databaseCapacityExhausted(new AggregateError([new Error("Exceeded the compute time quota")]))).toBe(true);
  });
  it("requests a one-hour retry without serializing private SQL or query values", async () => {
    const original = new Error("private-query-values", { cause: new Error("Your account or project has exceeded the quota") });
    const result = await withBackgroundRetry(async () => { throw original; }).catch(error => error);
    expect(result).toBeInstanceOf(RetryAfterError);
    expect(result.retryAfter).toBe("3600");
    expect(result.cause).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("private-query-values");
  });
  it("leaves transient failures and unrelated HTTP 402 errors on their existing policy", async () => {
    for (const error of [new Error("connection reset"), Object.assign(new Error("payment required"), { status: 402 })]) {
      expect(databaseCapacityExhausted(error)).toBe(false);
      await expect(withBackgroundRetry(async () => { throw error; })).rejects.toBe(error);
    }
  });
  it("handles missing and cyclic causes safely", () => {
    const cyclic: { cause?: unknown } = {}; cyclic.cause = cyclic;
    for (const error of [null, "quota exceeded", {}, cyclic]) expect(databaseCapacityExhausted(error)).toBe(false);
  });
  it("returns successful work unchanged", async () => {
    await expect(withBackgroundRetry(async () => ({ published: 2 }))).resolves.toEqual({ published: 2 });
  });
});
