import { describe, it, expect } from "vitest";

// Trivial smoke test so `vitest run` is green before any feature tests exist.
// Also asserts the test env loaded .env.local (DATABASE_URL present), which the
// integration-DB helper depends on.
describe("smoke", () => {
  it("runs the test harness", () => {
    expect(1 + 1).toBe(2);
  });

  it("loads DATABASE_URL from the environment", () => {
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.DATABASE_URL).toContain("postgres");
  });
});
