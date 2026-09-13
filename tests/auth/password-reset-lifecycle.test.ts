// Regression for the production reset-delivery lifecycle. The Better Auth callback returns a
// generic response before delivery to avoid account enumeration, but the Resend promise must still
// be registered with Next/Vercel so a completed response cannot terminate the function first.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const AUTH_SOURCE = readFileSync(join(process.cwd(), "src/lib/auth.ts"), "utf8");
const RESET_CALLBACK = AUTH_SOURCE.slice(
  AUTH_SOURCE.indexOf("sendResetPassword: async"),
  AUTH_SOURCE.indexOf("emailVerification:"),
);

describe("password reset email request lifecycle", () => {
  it("registers Resend work with Next after() instead of detaching it with void", () => {
    expect(AUTH_SOURCE).toContain('import { after } from "next/server"');
    expect(RESET_CALLBACK).toContain("after(async () => {");
    expect(RESET_CALLBACK).toContain("await sendResetPassword(user.email, url);");
    expect(RESET_CALLBACK).not.toContain("void sendResetPassword");
  });
});
