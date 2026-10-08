import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest, type NextResponse } from "next/server";
import type { TestAuth } from "../helpers/auth";
import type { TestDb } from "../helpers/db";
import { mockResend } from "../helpers/mocks";

const APP = "https://app.example.test";
const APEX = "https://example.test";
let proxy: (request: NextRequest) => NextResponse;
let auth: TestAuth;
let testDb: TestDb;

beforeAll(async () => {
  vi.stubEnv("BETTER_AUTH_URL", APP);
  vi.stubEnv("NEXT_PUBLIC_APP_URL", APP);
  vi.stubEnv("MARKETING_APP_URL", APEX);
  vi.stubEnv("OPS_APP_URL", "https://ops.example.test");
  vi.resetModules();
  ({ proxy } = await import("@/proxy"));
  const { setupTestDb } = await import("../helpers/db");
  testDb = await setupTestDb();
  const { makeTestAuth } = await import("../helpers/auth");
  auth = makeTestAuth(testDb, { enforceOriginCheck: true });
});
afterAll(async () => {
  if (testDb) await (await import("../helpers/db")).teardownTestDb(testDb);
  vi.unstubAllEnvs();
});

function bridge(path: string, method = "GET") {
  return proxy(new NextRequest(new URL(path, APEX), { method, headers: { host: "example.test" } }));
}

describe("issued apex authentication links", () => {
  it("bridges the exact verification token without replaying apex authentication", () => {
    const response = bridge("/api/auth/verify-email?token=a%2Bb%2Fc&callbackURL=" + encodeURIComponent(APEX + "/profile?verified=1"));
    expect(response.status).toBe(307);
    const target = new URL(response.headers.get("location")!);
    expect(target.origin).toBe(APP);
    expect(target.searchParams.get("token")).toBe("a+b/c");
    expect(target.searchParams.get("callbackURL")).toBe("/profile?verified=1");
  });
  it.each(["GET", "HEAD"])("bridges supported reset links using %s", (method) => {
    for (const path of ["/api/auth/reset-password/issued-token", "/reset-password?token=issued-token"]) {
      const response = bridge(path + (path.includes("?") ? "&" : "?") + "callbackURL=" + encodeURIComponent(APEX + "/reset-password"), method);
      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).searchParams.get("callbackURL")).toBe("/reset-password");
    }
  });
  it.each(["https://evil.test/profile", "//evil.test", "https://u:p@example.test/profile", "/\\evil.test", "/profile\n", "/ops", "/_ops-auth/login", "https://ops.example.test/ops", "/%6f%70%73", "/profile%0a"])("rejects unsafe callback %s", (callback) => {
    expect(bridge("/api/auth/verify-email?token=opaque&callbackURL=" + encodeURIComponent(callback)).status).toBe(404);
  });
  it("restarts old OAuth without forwarding provider code state or errors", () => {
    const response = bridge("/api/auth/callback/google?code=old-code&state=old-state&error=old-error&callbackURL=%2Fhost");
    expect(response.headers.get("location")).toBe(APP + "/login?moved=1&callbackURL=%2Fhost");
    expect(bridge("/api/auth/callback/google?code=x&callbackURL=https%3A%2F%2Fevil.test").headers.get("location")).toBe(APP + "/login?moved=1");
  });
  it("denies apex auth mutations unknown endpoints and ambiguous tokens", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) expect(bridge("/api/auth/verify-email?token=x", method).status).toBe(405);
    for (const path of ["/api/auth/get-session", "/api/auth/verify-email", "/api/auth/verify-email/extra?token=x", "/api/auth/reset-password/x/extra?callbackURL=%2Freset-password", "/api/auth/verify-email?token=x&token=y"]) expect(bridge(path).status).toBe(404);
  });
  it("uses an actually issued verification token at app auth and preserves expiry", async () => {
    const { signUp } = await import("../helpers/auth");
    await signUp(auth, { email: "legacy-verify@example.test", password: "longpassword123", name: "Legacy Verify", firstName: "Legacy" });
    await vi.waitFor(() => expect(mockResend.lastLink()).not.toBeNull());
    const issued = new URL(mockResend.lastLink()!);
    const response = bridge(issued.pathname + issued.search);
    expect(response.status).toBe(307);
    const appResponse = await auth.handler(new Request(response.headers.get("location")!, { headers: { host: "app.example.test" } }));
    expect(appResponse.status).toBe(302);
    expect(appResponse.headers.get("location")).not.toContain("error=");
    const { createEmailVerificationToken } = await import("better-auth/api");
    const context = await auth.$context;
    const expired = await createEmailVerificationToken(context.secret, "legacy-verify@example.test", undefined, -1);
    const expiredBridge = bridge("/api/auth/verify-email?token=" + encodeURIComponent(expired) + "&callbackURL=%2Fprofile");
    const expiredResponse = await auth.handler(new Request(expiredBridge.headers.get("location")!, { headers: { host: "app.example.test" } }));
    expect(expiredResponse.headers.get("location")).toContain("error=TOKEN_EXPIRED");
  });
  it("lets an issued reset token reach app then keeps an expired stored token invalid", async () => {
    await auth.api.requestPasswordReset({ body: { email: "legacy-verify@example.test", redirectTo: APP + "/reset-password" } });
    const issued = new URL(mockResend.lastLink()!);
    // Model the exact old callback authority at issuance; token bytes are untouched.
    issued.searchParams.set("callbackURL", APEX + "/reset-password");
    const bridged = bridge(issued.pathname + issued.search);
    const target = bridged.headers.get("location")!;
    const result = await auth.handler(new Request(target, { headers: { host: "app.example.test" } }));
    expect(new URL(result.headers.get("location")!).searchParams.get("token")).toBe(issued.pathname.split("/").pop());
    await testDb.client.unsafe('UPDATE verification SET expires_at = now() - interval \'1 hour\' WHERE identifier LIKE \'reset-password:%\'');
    const expired = await auth.handler(new Request(target, { headers: { host: "app.example.test" } }));
    expect(expired.headers.get("location")).toContain("error=INVALID_TOKEN");
  });
});
