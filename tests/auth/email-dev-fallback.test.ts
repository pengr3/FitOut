// WR-02 regression: the no-RESEND_API_KEY console fallback in src/lib/email.ts must be gated on a
// non-production environment. If a production deploy is missing the key, the verify/reset link (with
// its live single-use token) must NEVER be written to the logs — it should fail loudly instead.
//
// The `resend` client is captured at module load from RESEND_API_KEY, so we control env BEFORE a
// fresh dynamic import (vi.resetModules) and spy on console to inspect what the fallback emits.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const TOKEN_URL = "https://fitout.app/reset?token=SECRET-LIVE-TOKEN-123";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("email dev-fallback production guard (WR-02)", () => {
  it("in production with no RESEND_API_KEY, the token-bearing link is NOT logged", async () => {
    delete process.env.RESEND_API_KEY; // simulate the missing-key misconfiguration.
    process.env.NODE_ENV = "production";

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
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = "development";

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { sendResetPassword } = await import("@/lib/email");
    await sendResetPassword("dev@example.com", TOKEN_URL);

    const logged = logSpy.mock.calls.flat().map((a) => String(a)).join("\n");
    expect(logged).toContain("[email:dev]");
    expect(logged).toContain("SECRET-LIVE-TOKEN-123");
  });
});
