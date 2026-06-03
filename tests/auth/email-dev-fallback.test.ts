// WR-02 regression: the no-RESEND_API_KEY console fallback in src/lib/email.ts must be gated on a
// non-production environment. If a production deploy is missing the key, the verify/reset link (with
// its live single-use token) must NEVER be written to the logs — it should fail loudly instead.
//
// The `resend` client is captured at module load from RESEND_API_KEY, so we control env BEFORE a
// fresh dynamic import (vi.resetModules) and spy on console to inspect what the fallback emits.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const TOKEN_URL = "https://fitout.app/reset?token=SECRET-LIVE-TOKEN-123";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs(); // restore RESEND_API_KEY / NODE_ENV that setup.ts / the runner set.
  vi.restoreAllMocks();
});

describe("email dev-fallback production guard (WR-02)", () => {
  it("in production with no RESEND_API_KEY, the token-bearing link is NOT logged", async () => {
    // vi.stubEnv is the type-safe way to set NODE_ENV (typed readonly) and clear the key.
    vi.stubEnv("RESEND_API_KEY", ""); // empty -> email.ts treats as no key (resend = null).
    vi.stubEnv("NODE_ENV", "production");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Fresh import so the module-level `resend` is rebuilt as null (no key) under this env.
    const { sendResetPassword } = await import("@/lib/email");
    await sendResetPassword("victim@example.com", TOKEN_URL);

    // The dev console.log (which prints the full body incl. the token) must NOT have fired,
    // and nothing logged anywhere may contain the live token.
    const allLogged = [
      ...logSpy.mock.calls.flat(),
      ...errorSpy.mock.calls.flat(),
    ]
      .map((a) => String(a))
      .join("\n");
    expect(allLogged).not.toContain("SECRET-LIVE-TOKEN-123");
    expect(logSpy).not.toHaveBeenCalled();
    // It SHOULD fail loudly via console.error (no silent swallow).
    expect(errorSpy).toHaveBeenCalled();
  });

  it("in development with no RESEND_API_KEY, the link IS logged (local flow still works)", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "development");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { sendResetPassword } = await import("@/lib/email");
    await sendResetPassword("dev@example.com", TOKEN_URL);

    const logged = logSpy.mock.calls.flat().map((a) => String(a)).join("\n");
    expect(logged).toContain("[email:dev]");
    expect(logged).toContain("SECRET-LIVE-TOKEN-123");
  });
});
