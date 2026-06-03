// WR-03 regression: Better Auth must be configured with an explicit signing secret + base URL, and
// must FAIL CLOSED (throw at module load) in production when BETTER_AUTH_SECRET is missing — rather
// than silently falling back to a weak/known dev default for a money-handling app.
//
// The guard runs at import time of src/lib/auth.ts, so we control env BEFORE a fresh dynamic import
// (vi.resetModules + vi.stubEnv).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Better Auth secret/baseURL config (WR-03)", () => {
  it("throws at boot in production when BETTER_AUTH_SECRET is missing (fail closed)", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");

    await expect(import("@/lib/auth")).rejects.toThrow(/BETTER_AUTH_SECRET/);
  });

  it("does NOT throw in development when the secret is missing (dev default tolerated)", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");

    await expect(import("@/lib/auth")).resolves.toBeDefined();
  });

  it("wires the explicit secret, baseURL, and trustedOrigins onto the auth options", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-value-at-least-32-chars-long-xx");
    vi.stubEnv("BETTER_AUTH_URL", "https://app.example.com");
    vi.stubEnv("NODE_ENV", "test");

    const { auth } = await import("@/lib/auth");
    const options = (auth as unknown as { options: Record<string, unknown> }).options;
    expect(options.secret).toBe("test-secret-value-at-least-32-chars-long-xx");
    expect(options.baseURL).toBe("https://app.example.com");
    expect(options.trustedOrigins).toEqual(["https://app.example.com"]);
  });
});
