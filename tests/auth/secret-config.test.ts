// WR-03 regression: Better Auth must be configured with an explicit signing secret + base URL, and
// must FAIL CLOSED (throw at module load) in production when BETTER_AUTH_SECRET is missing — rather
// than silently falling back to a weak/known dev default for a money-handling app.
//
// The guard runs at import time of src/lib/auth.ts, so we control env BEFORE a fresh dynamic import
// (vi.resetModules + vi.stubEnv).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Every test here does `vi.resetModules()` + a fresh dynamic `import("@/lib/auth")`, which re-transforms
 * and re-imports the whole Better Auth + drizzle + schema graph from cold. That is genuinely slow (~2s
 * alone, and the full suite is import-dominated), so under parallel load it exceeded the default 5s and
 * failed as a TIMEOUT — never as an assertion. 07-01 saw it flake once and called a timeout bump the fix
 * if it recurred; adding two DB-backed integration files in 07-05 made it deterministic.
 *
 * This is a cold-import budget, NOT a slow assertion: the checks themselves are trivial and pass in
 * milliseconds once the module is loaded.
 */
const COLD_IMPORT_TIMEOUT_MS = 30_000;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Better Auth secret/baseURL config (WR-03)", () => {
  it("throws at boot in production when BETTER_AUTH_SECRET is missing (fail closed)", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("OPS_APP_URL", "https://ops.example.com");
    vi.stubEnv("NODE_ENV", "production");

    await expect(import("@/lib/auth")).rejects.toThrow(/BETTER_AUTH_SECRET/);
  }, COLD_IMPORT_TIMEOUT_MS);

  it("does NOT throw in development when the secret is missing (dev default tolerated)", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");

    await expect(import("@/lib/auth")).resolves.toBeDefined();
  }, COLD_IMPORT_TIMEOUT_MS);

  it("wires the explicit secret, exact dynamic hosts, and trusted origins onto auth", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-value-at-least-32-chars-long-xx");
    vi.stubEnv("BETTER_AUTH_URL", "https://app.example.com");
    vi.stubEnv("OPS_APP_URL", "https://ops.example.com");
    vi.stubEnv("VERCEL_URL", "fitout-preview.vercel.app");
    vi.stubEnv("NODE_ENV", "test");

    const { auth } = await import("@/lib/auth");
    const options = (auth as unknown as { options: Record<string, unknown> }).options;
    expect(options.secret).toBe("test-secret-value-at-least-32-chars-long-xx");
    expect(options.baseURL).toEqual({
      allowedHosts: ["app.example.com", "ops.example.com", "fitout-preview.vercel.app"],
      fallback: "https://app.example.com",
      protocol: "auto",
    });
    expect(options.trustedOrigins).toEqual([
      "https://app.example.com",
      "https://ops.example.com",
      "https://fitout-preview.vercel.app",
    ]);
  }, COLD_IMPORT_TIMEOUT_MS);
});
