import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const OLD = "https://fitout.live";
const NEW = "https://app.fitout.live";
const RESERVED = "https://marketing-stage.fitout.live";

async function configure(overrides: Record<string, string> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries({
    NODE_ENV: "production", BETTER_AUTH_URL: OLD, NEXT_PUBLIC_APP_URL: OLD,
    APP_COMPATIBILITY_ORIGIN: NEW, MARKETING_APP_URL: RESERVED,
    OPS_APP_URL: "https://ops.fitout.live", MARKETING_PREVIEW_URL: "",
    VERCEL: "", VERCEL_ENV: "", VERCEL_URL: "", ...overrides,
  })) vi.stubEnv(key, value);
  return import("@/lib/app-origins");
}
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("staged app origin continuity", () => {
  it.each([
    [OLD, NEW], [NEW, OLD],
  ])("serves both app authorities with primary %s and compatibility %s", async (primary, compatibility) => {
    const origins = await configure({ BETTER_AUTH_URL: primary, NEXT_PUBLIC_APP_URL: primary, APP_COMPATIBILITY_ORIGIN: compatibility });
    const { proxy } = await import("@/proxy");
    const route = (host: string, path: string, method = "GET", extra = {}) =>
      proxy(new NextRequest(new URL(path, `https://${host}`), { method, headers: { host, ...extra } }));
    for (const host of ["fitout.live", "app.fitout.live"]) {
      expect(origins.classifyRequestHost(host)).toBe("app");
      expect(origins.classifyRequestHost(`${host}:443`)).toBe("app");
      expect(origins.AUTH_ALLOWED_HOSTS).toContain(host);
      expect(origins.AUTH_TRUSTED_ORIGINS).toContain(`https://${host}`);
      for (const path of ["/", "/login?callbackURL=%2Fhost%3Fresume%3D1", "/api/auth/get-session"]) {
        const response = route(host, path);
        expect(response.headers.get("x-middleware-next")).toBe("1");
        expect(response.headers.get("location")).toBeNull();
      }
      for (const path of ["/api/paymongo/webhook", "/api/didit/webhook", "/api/inngest"]) {
        const response = route(host, path, "POST");
        expect(response.headers.get("x-middleware-next")).toBe("1");
        expect(response.headers.get("location")).toBeNull();
      }
      expect(route(host, "/api/internal/manual-payout-recipient", "POST").headers.get("x-middleware-next")).toBe("1");
      expect(route(host, "/api/internal/manual-payout-recipient", "GET").headers.get("x-middleware-rewrite")).toContain("/ops-gateway");
      expect(route(host, "/api/ops/settlement-readback").headers.get("x-middleware-rewrite")).toContain("/ops-gateway");
      expect(route(host, "/api/contact", "POST").status).toBe(404);
      expect(route(host, "/marketing/contact").status).toBe(404);
    }
    for (const host of ["marketing-stage.fitout.live", "ops.fitout.live", "unknown.test"]) {
      expect(route(host, "/api/internal/manual-payout-recipient", "POST").headers.get("x-middleware-rewrite")).toContain("/ops-gateway");
    }
    expect(route("ops.fitout.live", "/api/ops/settlement-readback").headers.get("x-middleware-next")).toBe("1");
    expect(route("ops.fitout.live", "/api/ops/settlement-readback", "POST").headers.get("x-middleware-rewrite")).toContain("/ops-gateway");
    expect(origins.absoluteAppUrl("/login?key=a&key=b")).toBe(`${primary}/login?key=a&key=b`);
    for (const host of ["app.fitout.live.evil", "fitout.live:444", "unknown.test"]) {
      expect(origins.classifyRequestHost(host)).toBe("unknown");
      expect(origins.AUTH_ALLOWED_HOSTS).not.toContain(host);
      expect(route(host, "/", "GET", { "x-forwarded-host": "app.fitout.live" }).status).toBe(404);
    }
  });

  it("removes the compatibility trust before the apex becomes marketing", async () => {
    const origins = await configure({ BETTER_AUTH_URL: NEW, NEXT_PUBLIC_APP_URL: NEW,
      APP_COMPATIBILITY_ORIGIN: "", MARKETING_APP_URL: OLD });
    expect(origins.classifyRequestHost("fitout.live")).toBe("marketing");
    expect(origins.AUTH_ALLOWED_HOSTS).not.toContain("fitout.live");
    expect(origins.AUTH_TRUSTED_ORIGINS).not.toContain(OLD);
    const { proxy } = await import("@/proxy");
    const query = "?token=a%2Bb&key=x&key=y";
    const response = proxy(new NextRequest(`${OLD}/reset-password${query}`, { headers: { host: "fitout.live" } }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${NEW}/reset-password${query}`);
  });

  const invalidConfigurations: Array<Record<string, string>> = [
    { APP_COMPATIBILITY_ORIGIN: OLD },
    { APP_COMPATIBILITY_ORIGIN: RESERVED },
    { APP_COMPATIBILITY_ORIGIN: "https://ops.fitout.live" },
    { APP_COMPATIBILITY_ORIGIN: OLD, BETTER_AUTH_URL: NEW, NEXT_PUBLIC_APP_URL: NEW, MARKETING_APP_URL: OLD },
    { MARKETING_PREVIEW_URL: NEW },
    { APP_COMPATIBILITY_ORIGIN: "http://app.fitout.live" },
    { APP_COMPATIBILITY_ORIGIN: "https://*.fitout.live" },
    { APP_COMPATIBILITY_ORIGIN: "https://app.fitout.live/path" },
    { APP_COMPATIBILITY_ORIGIN: "https://user@app.fitout.live" },
  ];
  it.each(invalidConfigurations)("fails closed for conflicting or invalid compatibility configuration %j", async (overrides) => {
    await expect(configure(overrides)).rejects.toThrow();
  });

  it("accepts exact loopback authorities for isolated built-server proof", async () => {
    const origins = await configure({ BETTER_AUTH_URL: "http://localhost:3000", NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      APP_COMPATIBILITY_ORIGIN: "http://app.localhost:3000" });
    expect(origins.classifyRequestHost("app.localhost:3000")).toBe("app");
    expect(origins.classifyRequestHost("app.localhost:3001")).toBe("unknown");
  });
});
