import { describe, expect, it } from "vitest";
import { streamingTestContext } from "../../e2e/helpers/streaming-test-context";

describe("streaming browser context", () => {
  it("ordinary CI uses its actual dev server and owned test output directory", () => {
    expect(streamingTestContext({}, "http://localhost:3000", "/owned/test-output")).toEqual({ standalone: false, production: false, port: 3000, origin: "http://localhost:3000", runDir: "/owned/test-output" });
  });
  it("retains an explicit production runner context", () => {
    expect(streamingTestContext({ FITOUT_STREAMING_SERVER: "production", FITOUT_STREAMING_PORT: "3127", FITOUT_STREAMING_RUN_DIR: "/owned/production-run" }, "http://localhost:3000", "/ordinary/output")).toEqual({ standalone: true, production: true, port: 3127, origin: "http://localhost:3127", runDir: "/owned/production-run" });
  });
  it.each([
    { FITOUT_STREAMING_SERVER: "production" },
    { FITOUT_STREAMING_SERVER: "production", FITOUT_STREAMING_PORT: "3127" },
    { FITOUT_STREAMING_SERVER: "dev", FITOUT_STREAMING_RUN_DIR: "/owned/run" },
    { FITOUT_STREAMING_SERVER: "unknown" },
    { FITOUT_STREAMING_PORT: "NaN" },
  ])("never silently downgrades an incomplete or invalid standalone packet", (env) => {
    expect(() => streamingTestContext(env, "http://localhost:3000", "/ordinary/output")).toThrow();
  });
  it("refuses an external browser origin", () => {
    expect(() => streamingTestContext({}, "https://app.fitout.live", "/owned/output")).toThrow(/local HTTP/);
  });
});
